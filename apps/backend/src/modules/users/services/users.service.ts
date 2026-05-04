import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AppException } from '@/common/exceptions/app.exception';
import { ERR } from '@ftt/shared/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { FortyTwoProfile } from '@/modules/auth/types/forty-two-profile.type';

// CRUD utilisateurs. Toute manipulation de la table User passe par ici.
// AuthService et les Gateways game/gamefoot l'appellent au lieu de toucher
// Prisma directement -> centralisation des regles metier (anti-leak password,
// resolution de login disponible, gestion des collisions OAuth 42).
@Injectable()
export class UsersService {
	constructor(private readonly prisma: PrismaService) { }

	// === READ

	findById(id: number) { return this.prisma.user.findUnique({ where: { id } }); }
	findByEmail(email: string) { return this.prisma.user.findUnique({ where: { email } }); }
	findByLogin(login: string) { return this.prisma.user.findUnique({ where: { login } }); }

	// Variante "public" : select Prisma explicite, JAMAIS le password.
	// A utiliser pour toutes les routes qui retournent un user au client.
	//
	// Pattern Prisma recommande (whitelist > blacklist) : reduit le payload
	// reseau et empeche de leak un futur champ sensible si on l'ajoute au
	// schema sans penser a updater chaque endpoint.
	findByIdPublic(id: number) {
		return this.prisma.user.findUnique({
			where: { id },
			omit: { password: true },
		});
	}

	// === WRITE

	// Register classique (email + password). Le login demande peut etre
	// indispo (collision) -> resolveAvailableLogin tente plusieurs fallbacks.
	//
	// Code Prisma P2002 = violation d'unique constraint. On le catch pour
	// gerer la race condition entre findByEmail (check) et create (insert) :
	// deux requetes concurrentes peuvent passer le check puis tomber sur le
	// meme email a l'insert.
	async createWithPassword(email: string, hashedPassword: string, login: string) {
		if (await this.findByEmail(email)) {
			throw new AppException(ERR.AUTH.REGISTER.EMAIL_TAKEN, HttpStatus.CONFLICT);
		}
		const finalLogin = await this.resolveAvailableLogin(login, email);
		try {
			return await this.prisma.user.create({
				data: { email, password: hashedPassword, login: finalLogin },
			});
		} catch (error: any) {
			if (error.code === 'P2002') {
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
		const existing = await this.prisma.fortyTwoProfile.findUnique({
			where: { fortyTwoId: profile.fortyTwoId },
			include: { user: true },
		});
		if (existing) {
			await this.prisma.fortyTwoProfile.update({
				where: { id: existing.id },
				data: this.toFortyTwoUpdateData(profile),
			});
			return existing.user;
		}

		// 2. User existant via email applicatif -> on attache la 42
		const existingByEmail = await this.findByEmail(profile.email);
		if (existingByEmail) {
			await this.prisma.fortyTwoProfile.create({
				data: this.toFortyTwoCreateData(profile, existingByEmail.id),
			});
			return existingByEmail;
		}

		// 3. Creation complete : User + FortyTwoProfile en transaction.
		const finalLogin = await this.resolveAvailableLogin(profile.login, profile.email, '_42');
		return this.prisma.$transaction(async (tx) => {
			const user = await tx.user.create({
				data: {
					email: profile.email,
					login: finalLogin,
					password: null,
					avatarUrl: profile.imageUrl, // valeur par defaut, l'utilisateur peut la changer
				},
			});
			await tx.fortyTwoProfile.create({
				data: this.toFortyTwoCreateData(profile, user.id),
			});
			return user;
		});
	}

	// === PRIVATE — mappers FortyTwoProfile

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
	// — sinon une eventuelle re-attribution de login 42 cote intra ferait
	// duplique. Type Prisma.FortyTwoProfileUpdateInput pour validation stricte.
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
		if (!(await this.findByLogin(wanted))) return wanted;

		const fromEmail = email.split('@')[0];
		if (!(await this.findByLogin(fromEmail))) return fromEmail;

		const withSuffix = `${fromEmail}${suffix ?? '_' + Date.now().toString(36)}`;
		if (!(await this.findByLogin(withSuffix))) return withSuffix;

		return `${fromEmail}_${Date.now().toString(36)}`;
	}
}
