import { Controller, Get, HttpStatus, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import { AppException } from '@/common/exceptions/app.exception';
import { ERR } from '@ftt/shared/errors';
import { AuthService } from '@/modules/auth/services/auth.service';
import { FortyTwoAuthGuard } from '@/modules/auth/guards/forty-two-auth.guard';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { setAccessTokenCookie, setRefreshTokenCookie } from '@/modules/auth/utils/cookie.helper';
import type { FortyTwoProfile } from '@/modules/auth/types/forty-two-profile.type';
import type { EnvConfig } from '@/common/config/env.config';

// OAuth 2.0 via 42 intra (RFC 6749, Authorization Code Grant). 3 routes :
//   GET /auth/42           -> redirige vers api.intra.42.fr (le guard fait tout)
//   GET /auth/42/status    -> indique si l'OAuth est configure cote serveur
//                              (le front affiche/cache le bouton "Se connecter
//                              avec 42" en consequence)
//   GET /auth/42/callback  -> retour 42 apres login utilisateur
@Controller('auth/42')
export class FortyTwoController {
	constructor(
		private readonly auth: AuthService,
		private readonly config: ConfigService<EnvConfig, true>,
	) { }

	// Le guard 42 (Passport) gere la redirection vers l'intra. La fonction
	// est vide volontairement, c'est juste un point d'entree HTTP que Passport
	// intercepte avant d'arriver ici.
	@Public()
	@Get()
	@UseGuards(FortyTwoAuthGuard)
	login() { /* le guard gere la redirection */ }

	// Permet au front de savoir s'il doit afficher le bouton "Se connecter
	// avec 42". Si FORTYTWO_CLIENT_ID est vide ou "disabled", l'OAuth est off.
	@Public()
	@Get('status')
	status() {
		const clientId = this.config.get('FORTYTWO_CLIENT_ID', { infer: true }) ?? '';
		return { available: !!(clientId && clientId !== 'disabled') };
	}

	// 42 nous renvoie ici avec le user dans req.user (injecte par la strategy).
	// Cas particulier : ici req.user est un FortyTwoProfile, pas le JwtPayload
	// habituel des routes protegees, d'ou le double cast `as unknown as`.
	@Public()
	@Get('callback')
	@UseGuards(FortyTwoAuthGuard)
	async callback(@Req() req: Request, @Res() res: Response) {
		if (!req.user) throw new AppException(ERR.AUTH.OAUTH_42.FAILED, HttpStatus.UNAUTHORIZED);
		const profile = req.user as unknown as FortyTwoProfile;

		const ipAddress = req.ip ?? '';
		const userAgent = req.headers['user-agent'] ?? '';
		const { accessToken, refreshToken } = await this.auth.loginWith42(profile, ipAddress, userAgent);

		const accessExp = this.config.get('JWT_EXPIRATION', { infer: true }) ?? '3h';
		const refreshExp = this.config.get('JWT_REFRESH_EXPIRATION', { infer: true }) ?? '7d';
		setAccessTokenCookie(res, accessToken, accessExp);
		setRefreshTokenCookie(res, refreshToken, refreshExp);

		// Le middleware Next va de toute facon rediriger vers /{locale}/dashboard
		// si on tape /dashboard. Mais autant pointer direct sur la locale du
		// cookie NEXT_LOCALE (pose par next-intl) pour eviter le hop reseau.
		const frontendUrl = this.config.get('CORS_ORIGIN', { infer: true }) ?? 'https://localhost';
		const locale = req.cookies?.['NEXT_LOCALE'] || 'fr';
		res.redirect(`${frontendUrl}/${locale}/dashboard`);
	}
}
