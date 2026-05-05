import { Controller, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import { AppException } from '@/common/exceptions/app.exception';
import { ERR } from '@ftt/shared/errors';
import { SessionService } from '@/modules/auth/services/session.service';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { setAccessTokenCookie, setRefreshTokenCookie, REFRESH_TOKEN_COOKIE } from '@/modules/auth/utils/cookie.helper';
import type { EnvConfig } from '@/common/config/env.config';

// POST /auth/refresh : rotation du refresh_token (cf. SessionService.rotate).
// Public car le client envoie son refresh sans avoir besoin d'un access valide
// — c'est justement le but de la route que de renouveler l'access expire.
@Controller('auth/refresh')
export class RefreshController {
	constructor(
		private readonly session: SessionService,
		private readonly config: ConfigService<EnvConfig, true>,
	) { }

	@Public()
	@Post()
	async refresh(@Req() req: Request, @Res() res: Response) {
		const oldRefresh = req.cookies?.[REFRESH_TOKEN_COOKIE];
		if (!oldRefresh) throw new AppException(ERR.AUTH.TOKEN.INVALID, HttpStatus.UNAUTHORIZED);

		const ipAddress = req.ip ?? '';
		const userAgent = req.headers['user-agent'] ?? '';
		const { accessToken, refreshToken } = await this.session.rotate(oldRefresh, ipAddress, userAgent);

		const accessExp = this.config.get('JWT_EXPIRATION', { infer: true }) ?? '3h';
		const refreshExp = this.config.get('JWT_REFRESH_EXPIRATION', { infer: true }) ?? '7d';
		setAccessTokenCookie(res, accessToken, accessExp);
		setRefreshTokenCookie(res, refreshToken, refreshExp);
		res.json({ success: true });
	}
}
