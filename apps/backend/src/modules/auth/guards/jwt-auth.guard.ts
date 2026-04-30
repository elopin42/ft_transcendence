import { ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { AppException } from '@/common/exceptions/app.exception';
import { ERR } from '@ftt/shared/errors';
import { IS_PUBLIC_KEY } from '@/modules/auth/decorators/public.decorator';

// Guard global d'authentification JWT (enregistre via APP_GUARD dans
// AuthModule). Toutes les routes HTTP passent par ici, sauf celles decorees
// avec @Public().
//
// Approche "secure by default" : si un dev oublie de proteger une route, elle
// est protegee. Pour la rendre publique il faut explicitement @Public().
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
	constructor(private readonly reflector: Reflector) {
		super();
	}

	canActivate(context: ExecutionContext) {
		// getAllAndOverride cherche la metadata sur le handler en priorite,
		// puis sur le controller. Permet @Public() au niveau classe ou methode.
		const isPublic = this.reflector.getAllAndOverride<boolean>(
			IS_PUBLIC_KEY,
			[context.getHandler(), context.getClass()],
		);
		if (isPublic) return true;
		return super.canActivate(context);
	}

	// Override de Passport. Sans ca, un echec d'auth retombe sur un
	// UnauthorizedException nu et le filter fallback en generic.unauthorized.
	// Ici on distingue token expire (refresh possible) vs invalide/absent.
	// Le param err n'est pas utilise (Passport l'expose mais on ne l'utilise
	// pas pour decider du code) -> prefixe '_' pour respecter noUnusedParameters.
	handleRequest<TUser>(_err: unknown, user: TUser, info: unknown): TUser {
		if (user) return user;
		const name = (info as Error | undefined)?.name ?? '';
		const code = name === 'TokenExpiredError'
			? ERR.AUTH.TOKEN.EXPIRED
			: ERR.AUTH.TOKEN.INVALID;
		throw new AppException(code, HttpStatus.UNAUTHORIZED);
	}
}
