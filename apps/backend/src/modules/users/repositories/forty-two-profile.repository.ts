import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '@/common/prisma/prisma.service';

// Repository FortyTwoProfile : encapsule TOUTES les queries Prisma sur la
// table FortyTwoProfile (profil 42 lie a un User local).
//
// Pattern Repository -- cf. docs/01-ARCHITECTURE.md
@Injectable()
export class FortyTwoProfileRepository {
	constructor(private readonly prisma: PrismaService) { }

	// === READ

	// Lookup par fortyTwoId (clef stable cote intra). Inclut le User pour
	// eviter une query supplementaire dans le flow OAuth.
	findByFortyTwoId(fortyTwoId: number) {
		return this.prisma.fortyTwoProfile.findUnique({
			where: { fortyTwoId },
			include: { user: true },
		});
	}

	// === WRITE

	// Cree un profil lie a un User existant. Utilise dans le flow OAuth 42 :
	//   - cas 2 : User existe via email applicatif, on attache la 42
	//   - cas 3 : creation User + profile en transaction
	create(data: Prisma.FortyTwoProfileUncheckedCreateInput, tx?: Prisma.TransactionClient) {
		return (tx ?? this.prisma).fortyTwoProfile.create({ data });
	}

	// Update : champs susceptibles d'avoir change cote intra (email, image,
	// campus, level). On NE TOUCHE PAS a fortyTwoId/login qui servent d'ancre.
	update(id: number, data: Prisma.FortyTwoProfileUpdateInput) {
		return this.prisma.fortyTwoProfile.update({ where: { id }, data });
	}
}
