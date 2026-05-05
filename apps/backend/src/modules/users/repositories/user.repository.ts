import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '@/common/prisma/prisma.service';

// Repository User : encapsule TOUTES les queries Prisma sur la table User.
//
// Pattern Repository -- cf. docs/01-ARCHITECTURE.md
//   - Aucun `this.prisma.user.X` ailleurs dans le code.
//   - findByIdPublic() retourne sans le champ `password` (whitelist via
//     `omit`) pour eviter de leak un hash dans une reponse API.
@Injectable()
export class UserRepository {
	constructor(private readonly prisma: PrismaService) { }

	// === READ -- usage interne (peut contenir password hash)

	findById(id: number) {
		return this.prisma.user.findUnique({ where: { id } });
	}

	findByEmail(email: string) {
		return this.prisma.user.findUnique({ where: { email } });
	}

	findByLogin(login: string) {
		return this.prisma.user.findUnique({ where: { login } });
	}

	// === READ -- usage externe (reponses API, jamais le password hash)

	// Variante "public" : `omit` Prisma exclut explicitement le champ password.
	// Pattern whitelist > blacklist : si un futur champ sensible est ajoute au
	// schema sans penser a l'exclure, `omit` aide pas, mais pour le password
	// c'est explicite et garanti.
	findByIdPublic(id: number) {
		return this.prisma.user.findUnique({
			where: { id },
			omit: { password: true },
		});
	}

	findByLoginPublic(login: string) {
		return this.prisma.user.findUnique({
			where: { login },
			omit: { password: true },
		});
	}

	// === WRITE

	// Cree un user. Note : la collision login/email peut survenir en
	// concurrence, le service appelant doit catch P2002 (unique violation).
	create(data: Prisma.UserCreateInput, tx?: Prisma.TransactionClient) {
		return (tx ?? this.prisma).user.create({ data });
	}

	// Update partiel. Service est responsable de la validation des champs
	// modifiables (ex : ne pas autoriser un PATCH email sans re-verification).
	update(id: number, data: Prisma.UserUpdateInput) {
		return this.prisma.user.update({ where: { id }, data });
	}

	// Increment d'un compteur. Pratique pour `User.points` (gamification).
	// Atomique cote DB, pas de race condition.
	incrementPoints(login: string, by: number) {
		return this.prisma.user.update({
			where: { login },
			data: { points: { increment: by } },
		});
	}
}
