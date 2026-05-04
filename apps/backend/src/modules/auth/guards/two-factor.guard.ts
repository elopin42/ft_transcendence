import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { AppException } from '@/common/exceptions/app.exception';
import { ERR } from '@ftt/shared/errors';
import { TwoFactorService } from '@/modules/auth/services/two-factor.service';
import { REQUIRE_2FA_KEY } from '@/modules/auth/decorators/two-factor.decorator';
import type { JwtPayload } from '@/modules/auth/types/jwt-payload.type';

// Guard pour les routes marquees @Require2FA. Refuse l'acces si le user n'a
// pas une 2FA active sur son compte. Le JwtAuthGuard doit s'executer AVANT
// ce guard (req.user pose).
//
// Usage : sur une action sensible qui exige une 2FA active (ex: changer le
// password, supprimer le compte, gerer les permissions admin).
@Injectable()
export class TwoFactorGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly twoFactor: TwoFactorService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const required = this.reflector.getAllAndOverride<boolean>(REQUIRE_2FA_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (!required) return true;

		const req = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
		const userId = req.user?.sub;
		if (!userId) throw new AppException(ERR.AUTH.TOKEN.INVALID, HttpStatus.UNAUTHORIZED);

		const enabled = await this.twoFactor.isEnabled(userId);
		if (!enabled) throw new AppException(ERR.TWO_FA.REQUIRED, HttpStatus.FORBIDDEN);

		return true;
	}
}
