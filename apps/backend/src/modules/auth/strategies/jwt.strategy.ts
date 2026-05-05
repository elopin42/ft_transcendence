import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

import { AppException } from '@/common/exceptions/app.exception';
import { ERR } from '@ftt/shared/errors';
import type { EnvConfig } from '@/common/config/env.config';
import type { JwtPayload } from '@/modules/auth/types/jwt-payload.type';

// Strategie Passport JWT (RFC 7519). Sur chaque requete protegee :
//   1. extrait le token (cookie access_token en priorite, header Bearer en fallback)
//   2. verifie signature + expiration via JWT_SECRET
//   3. validate(payload) -> req.user = payload si retourne, 401 si throw
//
// Cookie d'abord = anti-XSS (httpOnly inaccessible au JS). Bearer en fallback
// pour les outils CLI / Postman / dev qui ne gerent pas les cookies.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
	constructor(config: ConfigService<EnvConfig, true>) {
		super({
			jwtFromRequest: ExtractJwt.fromExtractors([
				(req: Request) => req?.cookies?.access_token ?? null,
				ExtractJwt.fromAuthHeaderAsBearerToken(),
			]),
			ignoreExpiration: false,
			secretOrKey: config.get('JWT_SECRET', { infer: true }),
		});
	}

	// Appelee apres verif signature + expiration ok. On rejette si le payload
	// est mal forme (sub manquant = JWT bidon ou ancienne version).
	async validate(payload: JwtPayload): Promise<JwtPayload> {
		if (!payload?.sub) throw new AppException(ERR.AUTH.TOKEN.INVALID, HttpStatus.UNAUTHORIZED);
		return payload;
	}
}
