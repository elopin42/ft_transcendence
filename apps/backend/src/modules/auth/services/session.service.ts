import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppException } from '@/common/exceptions/app.exception';
import { ERR } from '@ftt/shared/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { TokenService } from '@/modules/auth/services/token.service';
import { generateRefreshToken, hashRefreshToken } from '@/modules/auth/utils/hash-token.helper';
import { parseExpiration } from '@/common/utils/parse-expiration';
import type { CreateSessionContext, CreatedSession } from '@/modules/auth/types/session.type';
import type { EnvConfig } from '@/common/config/env.config';

// Sessions = refresh tokens stockes en DB. Chaque login cree une ligne, chaque
// /auth/refresh fait tourner l'ancienne en nouvelle (rotation), avec chainage
// via parentId pour detecter un vol par replay.
//
// Pattern "Refresh Token Rotation with Reuse Detection" decrit dans OAuth 2.0
// Best Current Practice (draft-ietf-oauth-security-topics) et l'OWASP JWT
// Cheat Sheet.
@Injectable()
export class SessionService {
	private readonly logger = new Logger(SessionService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly token: TokenService,
		private readonly config: ConfigService<EnvConfig, true>,
	) { }

	// === PUBLIC

	// Emet une nouvelle session : access_token (JWT court ~15min) + refresh_token
	// (random 32 bytes, 7j) stocke hashe en DB. Appele au login/register/rotation.
	// Le refresh brut n'est jamais persiste (seulement son SHA-256), donc un
	// dump DB ne donne pas de credentials utilisables.
	async sign(context: CreateSessionContext): Promise<CreatedSession> {
		const accessToken = await this.token.sign(context.userId, context.email);
		const refreshToken = generateRefreshToken();
		const session = await this.createSession(context, hashRefreshToken(refreshToken));
		return {
			accessToken,
			refreshToken,
			sessionId: session.id,
			userId: context.userId,
		};
	}

	// Rotation : revoque l'ancien refresh_token et emet un nouveau, chaine au
	// precedent via parentId. Le chainage permet la detection de replay :
	// si quelqu'un reutilise un refresh deja tourne, on en deduit qu'il a ete
	// vole (cf. detectReplay).
	async rotate(refreshToken: string, ipAddress: string, userAgent: string): Promise<CreatedSession> {
		const session = await this.validateRefreshToken(refreshToken);
		await this.markRevoked(session.id);
		return this.sign({
			userId: session.user.id,
			email: session.user.email,
			ipAddress,
			userAgent,
			parentSessionId: session.id,
			twoFactorPending: session.twoFactorPending,
		});
	}

	// Vol detecte (un refresh deja revoque a ete reutilise). On revoque toute
	// la chaine depuis la racine -> deconnecte l'attaquant ET l'utilisateur
	// legitime, qui devra se re-logger. Filet de securite : quand on ne sait
	// plus a qui faire confiance, on coupe tout.
	async detectReplay(compromisedSessionId: number): Promise<void> {
		const rootId = await this.findChainRoot(compromisedSessionId);
		const ids = await this.fetchChainDescendants(rootId);
		await this.revokeMany(ids);
		this.logger.warn(`Chaine de ${ids.length} sessions revoquees (racine: ${rootId})`);
	}

	// Revoque une session via son refresh_token brut. Utilise par /auth/logout.
	async revoke(refreshToken: string): Promise<void> {
		const session = await this.findByHash(hashRefreshToken(refreshToken));
		if (session && !session.revokedAt) {
			await this.markRevoked(session.id);
		}
	}

	// Revoque une session par id. Utilise par le flow 2FA verify (la session
	// pending est revoquee une fois la 2FA validee).
	async revokeById(id: number): Promise<void> {
		await this.markRevoked(id);
	}

	// === READ

	findByHash(refreshTokenHash: string) {
		return this.prisma.session.findUnique({
			where: { refreshTokenHash },
			include: { user: { select: { id: true, email: true } } },
		});
	}

	findById(id: number) {
		return this.prisma.session.findUnique({ where: { id } });
	}

	// Sessions actives d'un user (utilise par la page "Mes appareils").
	findActiveByUserId(userId: number) {
		return this.prisma.session.findMany({
			where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
			orderBy: { lastUsedAt: 'desc' },
		});
	}

	// === WRITE

	private createSession(context: CreateSessionContext, refreshTokenHash: string) {
		return this.prisma.session.create({
			data: {
				userId: context.userId,
				refreshTokenHash,
				parentId: context.parentSessionId,
				ipAddress: context.ipAddress,
				userAgent: context.userAgent,
				twoFactorPending: context.twoFactorPending ?? false,
				expiresAt: new Date(Date.now() + this.refreshExpirationMs()),
			},
		});
	}

	private markRevoked(id: number) {
		return this.prisma.session.update({
			where: { id },
			data: { revokedAt: new Date(), lastUsedAt: new Date() },
		});
	}

	private revokeMany(ids: number[]) {
		return this.prisma.session.updateMany({
			where: { id: { in: ids }, revokedAt: null },
			data: { revokedAt: new Date() },
		});
	}

	// === PRIVATE

	// Pipeline de validation d'un refresh : existence -> non-revocation ->
	// non-expiration. Si revoque + reutilise -> replay attack -> on revoque
	// toute la chaine.
	private async validateRefreshToken(refreshToken: string) {
		const session = await this.findByHash(hashRefreshToken(refreshToken));
		if (!session) throw new AppException(ERR.AUTH.TOKEN.INVALID, HttpStatus.UNAUTHORIZED);

		if (session.revokedAt) {
			this.logger.error(`Replay sur session ${session.id}, user ${session.userId}`);
			await this.detectReplay(session.id);
			throw new AppException(ERR.AUTH.TOKEN.REFRESH_REUSED, HttpStatus.UNAUTHORIZED);
		}

		if (session.expiresAt < new Date()) {
			await this.markRevoked(session.id);
			throw new AppException(ERR.AUTH.TOKEN.EXPIRED, HttpStatus.UNAUTHORIZED);
		}

		return session;
	}

	// Remonte parentId jusqu'a la session originale du login (sans parent).
	// Utilise par detectReplay pour ensuite revoquer toute la descendance.
	private async findChainRoot(sessionId: number): Promise<number> {
		let currentId: number | null = sessionId;
		while (currentId !== null) {
			const session = await this.prisma.session.findUnique({
				where: { id: currentId },
				select: { id: true, parentId: true },
			});
			if (!session?.parentId) return session?.id ?? sessionId;
			currentId = session.parentId;
		}
		return sessionId;
	}

	// CTE recursif Postgres : une seule query pour tout l'arbre des sessions
	// chainees. Bien plus rapide qu'une boucle JS qui ferait N queries.
	private async fetchChainDescendants(rootId: number): Promise<number[]> {
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

	private refreshExpirationMs(): number {
		return parseExpiration(
			this.config.get('JWT_REFRESH_EXPIRATION', { infer: true }) ?? '7d',
		);
	}
}
