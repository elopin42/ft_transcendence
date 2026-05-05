import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppException } from '@/common/exceptions/app.exception';
import { ERR } from '@ftt/shared/errors';
import { TokenService } from '@/modules/auth/services/token.service';
import { SessionRepository } from '@/modules/auth/repositories/session.repository';
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
//
// Pattern Repository : ce service N'INJECTE PLUS Prisma directement. Il
// passe par SessionRepository (cf. apps/backend/src/modules/auth/repositories/).
// Toutes les queries SQL/CTE vivent dans le repo, le service orchestre.
@Injectable()
export class SessionService {
	private readonly logger = new Logger(SessionService.name);

	constructor(
		private readonly sessions: SessionRepository,
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
		const expiresAt = new Date(Date.now() + this.refreshExpirationMs());
		const session = await this.sessions.create(context, hashRefreshToken(refreshToken), expiresAt);
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
		await this.sessions.markRevoked(session.id);
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
		const rootId = await this.sessions.findChainRoot(compromisedSessionId);
		const ids = await this.sessions.fetchChainDescendants(rootId);
		await this.sessions.revokeMany(ids);
		this.logger.warn(`Chaine de ${ids.length} sessions revoquees (racine: ${rootId})`);
	}

	// Revoque une session via son refresh_token brut. Utilise par /auth/logout.
	async revoke(refreshToken: string): Promise<void> {
		const session = await this.sessions.findByHash(hashRefreshToken(refreshToken));
		if (session && !session.revokedAt) {
			await this.sessions.markRevoked(session.id);
		}
	}

	// Revoque une session par id. Utilise par le flow 2FA verify (la session
	// pending est revoquee une fois la 2FA validee).
	async revokeById(id: number): Promise<void> {
		await this.sessions.markRevoked(id);
	}

	// === READ -- proxy 1-liner vers le repo. Le service est la porte d'entree
	// publique pour les autres modules ; les autres ne doivent pas injecter
	// SessionRepository directement. Cf. docs/01-ARCHITECTURE.md regle 4.

	findByHash(refreshTokenHash: string) {
		return this.sessions.findByHash(refreshTokenHash);
	}

	findById(id: number) {
		return this.sessions.findById(id);
	}

	findActiveByUserId(userId: number) {
		return this.sessions.findActiveByUserId(userId);
	}

	// === PRIVATE

	// Pipeline de validation d'un refresh : existence -> non-revocation ->
	// non-expiration. Si revoque + reutilise -> replay attack -> on revoque
	// toute la chaine.
	private async validateRefreshToken(refreshToken: string) {
		const session = await this.sessions.findByHash(hashRefreshToken(refreshToken));
		if (!session) throw new AppException(ERR.AUTH.TOKEN.INVALID, HttpStatus.UNAUTHORIZED);

		if (session.revokedAt) {
			this.logger.error(`Replay sur session ${session.id}, user ${session.userId}`);
			await this.detectReplay(session.id);
			throw new AppException(ERR.AUTH.TOKEN.REFRESH_REUSED, HttpStatus.UNAUTHORIZED);
		}

		if (session.expiresAt < new Date()) {
			await this.sessions.markRevoked(session.id);
			throw new AppException(ERR.AUTH.TOKEN.EXPIRED, HttpStatus.UNAUTHORIZED);
		}

		return session;
	}

	private refreshExpirationMs(): number {
		return parseExpiration(
			this.config.get('JWT_REFRESH_EXPIRATION', { infer: true }) ?? '7d',
		);
	}
}
