import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AppException } from '@/common/exceptions/app.exception';
import { ERR } from '@ftt/shared/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { UserRepository } from '@/modules/users/repositories/user.repository';
import { FortyTwoProfileRepository } from '@/modules/users/repositories/forty-two-profile.repository';
import type { FortyTwoProfile } from '@/modules/auth/types/forty-two-profile.type';

// CRUD utilisateurs. Pattern Repository : toutes les queries Prisma vivent
// dans UserRepository / FortyTwoProfileRepository. Ce service orchestre la
// logique metier (anti-leak password, resolution login, gestion collisions
// OAuth 42, transactions multi-tables).
//
// PrismaService est injecte UNIQUEMENT pour `$transaction` (operations
// multi-tables atomiques). Toute query simple sur User ou FortyTwoProfile
// passe par les repos.
@Injectable()
export class UsersService {
	constructor(
		private readonly users: UserRepository,
		private readonly fortyTwo: FortyTwoProfileRepository,
		private readonly prisma: PrismaService,
	) { }

	// === READ -- proxy 1-liner vers le repo. Garde l'API publique stable
	// pour AuthService et les Gateways game/gamefoot (cf. docs/01-ARCHITECTURE.md
	// regle 4 : le service est la porte d'entree publique).

	findById(id: number) { return this.users.findById(id); }
	findByEmail(email: string) { return this.users.findByEmail(email); }
	findByLogin(login: string) { return this.users.findByLogin(login); }
	findByIdPublic(id: number) { return this.users.findByIdPublic(id); }
	findByLoginPublic(login: string) { return this.users.findByLoginPublic(login); }

	// === WRITE

	// Register classique (email + password). Le login demande peut etre
	// indispo (collision) -> resolveAvailableLogin tente plusieurs fallbacks.
	//
	// Code Prisma P2002 = violation d'unique constraint. On le catch pour
	// gerer la race condition entre findByEmail (check) et create (insert) :
	// deux requetes concurrentes peuvent passer le check puis tomber sur le
	// meme email a l'insert.
	async createWithPassword(email: string, hashedPassword: string, login: string) {
		if (await this.users.findByEmail(email)) {
			throw new AppException(ERR.AUTH.REGISTER.EMAIL_TAKEN, HttpStatus.CONFLICT);
		}
		const finalLogin = await this.resolveAvailableLogin(login, email);
		try {
			return await this.users.create({
				email,
				password: hashedPassword,
				login: finalLogin,
			});
		} catch (error: unknown) {
			if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
				throw new AppException(ERR.AUTH.REGISTER.EMAIL_TAKEN, HttpStatus.CONFLICT);
			}
			throw error;
		}
	}

	// Login OAuth 42, 3 cas a gerer en transaction (User + FortyTwoProfile
	// sont 2 tables liees, on doit garantir la coherence) :
	//   1. profile 42 deja lie -> on retourne le User associe et on rafraichit
	//      les champs susceptibles d'avoir change (email, image, ...)
	//   2. User connu par email applicatif -> on cree FortyTwoProfile lie
	//      (permet de "connecter" un compte 42 a un compte cree par register
	//      classique)
	//   3. inconnu -> on cree User (password=null) + FortyTwoProfile dans la
	//      meme transaction
	async findOrCreateFrom42(profile: FortyTwoProfile) {
		// 1. Profil 42 deja lie ?
		const existing = await this.fortyTwo.findByFortyTwoId(profile.fortyTwoId);
		if (existing) {
			await this.fortyTwo.update(existing.id, this.toFortyTwoUpdateData(profile));
			return existing.user;
		}

		// 2. User existant via email applicatif -> on attache la 42
		const existingByEmail = await this.users.findByEmail(profile.email);
		if (existingByEmail) {
			await this.fortyTwo.create(this.toFortyTwoCreateData(profile, existingByEmail.id));
			return existingByEmail;
		}

		// 3. Creation complete : User + FortyTwoProfile en transaction
		// (atomicite : si une seule des deux operations echoue, rollback total).
		const finalLogin = await this.resolveAvailableLogin(profile.login, profile.email, '_42');
		return this.prisma.$transaction(async (tx) => {
			const user = await this.users.create({
				email: profile.email,
				login: finalLogin,
				password: null,
				avatarUrl: profile.imageUrl, // valeur par defaut, l'utilisateur peut la changer
			}, tx);
			await this.fortyTwo.create(this.toFortyTwoCreateData(profile, user.id), tx);
			return user;
		});
	}

	// === PRIVATE -- mappers FortyTwoProfile

	// Mapper "create" : tous les champs requis par Prisma + userId. Type de
	// retour explicite pour que TypeScript verifie que rien ne manque cote
	// appelant.
	private toFortyTwoCreateData(profile: FortyTwoProfile, userId: number): Prisma.FortyTwoProfileUncheckedCreateInput {
		return {
			userId,
			fortyTwoId: profile.fortyTwoId,
			login: profile.login,
			email: profile.email,
			displayName: profile.displayName,
			imageUrl: profile.imageUrl,
			campus: profile.campus,
			poolMonth: profile.poolMonth,
			poolYear: profile.poolYear,
			raw: profile.raw as Prisma.InputJsonValue,
			refreshedAt: new Date(),
		};
	}

	// Mapper "update" : champs susceptibles d'avoir change cote intra (email,
	// image, campus). On NE TOUCHE PAS a fortyTwoId/login qui servent d'ancre
	// -- sinon une eventuelle re-attribution de login 42 cote intra ferait
	// duplique.
	private toFortyTwoUpdateData(profile: FortyTwoProfile): Prisma.FortyTwoProfileUpdateInput {
		return {
			email: profile.email,
			displayName: profile.displayName,
			imageUrl: profile.imageUrl,
			campus: profile.campus,
			poolMonth: profile.poolMonth,
			poolYear: profile.poolYear,
			raw: profile.raw as Prisma.InputJsonValue,
			refreshedAt: new Date(),
		};
	}

	// === PRIVATE

	// Resout un login libre. Cascade :
	//   1. essaye le login demande
	//   2. essaye la partie locale de l'email (avant le '@')
	//   3. essaye partie locale + suffixe ('_42' pour OAuth, sinon timestamp)
	//   4. en dernier recours, partie locale + timestamp base36
	//
	// Pas parfait (concurrence : 2 register simultanes peuvent prendre le meme
	// fallback, mais l'unique constraint DB rattrape via P2002).
	private async resolveAvailableLogin(
		wanted: string,
		email: string,
		suffix?: string,
	): Promise<string> {
		if (!(await this.users.findByLogin(wanted))) return wanted;

		const fromEmail = email.split('@')[0];
		if (!(await this.users.findByLogin(fromEmail))) return fromEmail;

		const withSuffix = `${fromEmail}${suffix ?? '_' + Date.now().toString(36)}`;
		if (!(await this.users.findByLogin(withSuffix))) return withSuffix;

		return `${fromEmail}_${Date.now().toString(36)}`;
	}
}
