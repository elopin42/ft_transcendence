import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AppException } from '@/common/exceptions/app.exception';
import { ERR } from '@ftt/shared/errors';
import type { JwtPayload } from '@/modules/auth/types/jwt-payload.type';

// Sign + verify des access_token (JWT court, ~15min selon JWT_EXPIRATION).
// Conforme JWT RFC 7519.
//
// Pas de logique metier ici : juste l'interface avec @nestjs/jwt. Les refresh
// tokens (longs, en DB) sont geres par SessionService — c'est un pattern
// "split tokens" recommande par OWASP JWT Cheat Sheet 2024 :
//   - access_token : JWT court, stateless, verifiable sans DB
//   - refresh_token : opaque, stocke hashe en DB, revocable
@Injectable()
export class TokenService {
	constructor(private readonly jwt: JwtService) { }

	// Standard JWT RFC 7519 : "sub" (subject) = id du user. On ajoute l'email
	// pour les logs / debug, mais l'id reste la source de verite pour l'auth.
	async sign(userId: number, email: string): Promise<string> {
		return this.jwt.signAsync({ sub: userId, email });
	}

	// Verifie signature + expiration. Distingue token expire vs invalide pour
	// que le front puisse refresh automatiquement sur EXPIRED (et seulement
	// re-logger sur INVALID).
	async verify(token: string): Promise<JwtPayload> {
		try {
			return await this.jwt.verifyAsync<JwtPayload>(token);
		} catch (err) {
			const name = (err as Error)?.name ?? '';
			const code = name === 'TokenExpiredError'
				? ERR.AUTH.TOKEN.EXPIRED
				: ERR.AUTH.TOKEN.INVALID;
			throw new AppException(code, HttpStatus.UNAUTHORIZED);
		}
	}
}
