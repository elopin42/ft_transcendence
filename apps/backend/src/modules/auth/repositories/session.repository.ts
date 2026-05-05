import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/common/prisma/prisma.service';
import type { CreateSessionContext } from '@/modules/auth/types/session.type';

// Repository Session : encapsule TOUTES les queries Prisma sur la table
// Session. Aucun `this.prisma.session.X` ne doit exister ailleurs dans le
// code. SessionService injecte ce repo et orchestre la logique metier
// (rotation, detection replay, etc.) sans toucher Prisma.
//
// Pattern Repository -- cf. docs/01-ARCHITECTURE.md
//   - Couches : Controller -> Service -> Repository -> Prisma
//   - Methodes orientees metier (`findActiveByUserId`), pas DB (`findManyByWhereOptions`)
//   - Tests faciles : mock du repo plutot que mock du PrismaService
@Injectable()
export class SessionRepository {
	constructor(private readonly prisma: PrismaService) { }

	// === READ

	// Lookup par hash du refresh token. Utilise pour la validation refresh
	// et pour le revoke logout. Inclut user.{id, email} pour eviter une
	// query supplementaire dans le service.
	findByHash(refreshTokenHash: string) {
		return this.prisma.session.findUnique({
			where: { refreshTokenHash },
			include: { user: { select: { id: true, email: true } } },
		});
	}

	findById(id: number) {
		return this.prisma.session.findUnique({ where: { id } });
	}

	// Sessions actives d'un user. Triees par lastUsedAt desc pour la page
	// "Mes appareils" qui montre les plus recentes en premier.
	findActiveByUserId(userId: number) {
		return this.prisma.session.findMany({
			where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
			orderBy: { lastUsedAt: 'desc' },
		});
	}

	// === WRITE

	// Cree une nouvelle session. Le refresh token brut n'est jamais persiste,
	// uniquement son SHA-256 -> dump DB ne donne pas de credentials utilisables.
	create(context: CreateSessionContext, refreshTokenHash: string, expiresAt: Date) {
		return this.prisma.session.create({
			data: {
				userId: context.userId,
				refreshTokenHash,
				parentId: context.parentSessionId,
				ipAddress: context.ipAddress,
				userAgent: context.userAgent,
				twoFactorPending: context.twoFactorPending ?? false,
				expiresAt,
			},
		});
	}

	markRevoked(id: number) {
		return this.prisma.session.update({
			where: { id },
			data: { revokedAt: new Date(), lastUsedAt: new Date() },
		});
	}

	revokeMany(ids: number[]) {
		return this.prisma.session.updateMany({
			where: { id: { in: ids }, revokedAt: null },
			data: { revokedAt: new Date() },
		});
	}

	// === CTE recursifs pour la chain refresh tokens

	// CTE recursif Postgres : remonte parentId jusqu'a la session sans parent.
	// Une seule query au lieu d'une boucle JS qui ferait N findUnique.
	// Utilise par detectReplay() dans SessionService.
	async findChainRoot(sessionId: number): Promise<number> {
		const rows = await this.prisma.$queryRaw<{ id: number }[]>`
			WITH RECURSIVE up_chain AS (
				SELECT id, "parentId" FROM "Session" WHERE id = ${sessionId}
				UNION ALL
				SELECT s.id, s."parentId" FROM "Session" s
				INNER JOIN up_chain c ON s.id = c."parentId"
			)
			SELECT id FROM up_chain WHERE "parentId" IS NULL LIMIT 1
		`;
		return rows[0]?.id ?? sessionId;
	}

	// CTE recursif descendant : recupere tous les enfants d'une racine.
	// Utilise pour revoquer toute la chaine en cas de replay detecte.
	async fetchChainDescendants(rootId: number): Promise<number[]> {
		const rows = await this.prisma.$queryRaw<{ id: number }[]>`
			WITH RECURSIVE chain AS (
				SELECT id FROM "Session" WHERE id = ${rootId}
				UNION ALL
				SELECT s.id FROM "Session" s
				INNER JOIN chain c ON s."parentId" = c.id
			)
			SELECT id FROM chain
		`;
		return rows.map((r) => r.id);
	}
}
