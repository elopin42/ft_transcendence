import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { AuthService } from '@/modules/auth/services/auth.service';
import { SessionService } from '@/modules/auth/services/session.service';
import { RegisterDto } from '@/modules/auth/dto/register.dto';
import { LoginDto } from '@/modules/auth/dto/login.dto';
import { Public } from '@/modules/auth/decorators/public.decorator';
import {
	setAccessTokenCookie, setRefreshTokenCookie, setTwoFaPendingCookie,
	clearAccessTokenCookie, clearRefreshTokenCookie,
	REFRESH_TOKEN_COOKIE,
} from '@/modules/auth/utils/cookie.helper';
import type { EnvConfig } from '@/common/config/env.config';

// Endpoints d'authentification : ouvrir, fermer, rafraichir une session.
// Ne contient pas /me (UsersController) ni les routes 42 (FortyTwoController).
@Controller('auth')
export class AuthController {
	constructor(
		private readonly auth: AuthService,
		private readonly session: SessionService,
		private readonly config: ConfigService<EnvConfig, true>,
	) { }

	// Cree un compte et pose immediatement les cookies access + refresh.
	// 5 inscriptions max par heure et par IP (anti-spam de comptes).
	@Public()
	@Throttle({ short: { limit: 5, ttl: 60 * 60 * 1000 } })
	@Post('register')
	async register(@Body() dto: RegisterDto, @Req() req: Request, @Res() res: Response) {
		const { accessToken, refreshToken } = await this.auth.register(
			dto.email, dto.password, dto.login, req.ip ?? '', req.headers['user-agent'] ?? '',
		);
		this.setSessionCookies(res, accessToken, refreshToken);
		res.json({ success: true });
	}

	// Login email/password. 401 generique en cas d'echec (anti-enumeration de
	// comptes, cf. AuthService.login). 5 tentatives / 15 min / IP (anti
	// brute-force password — limite OWASP recommandee).
	//
	// Si la 2FA est active sur le compte : on pose UNIQUEMENT un cookie 2FA
	// pending (path /api/2fa/verify) et on renvoie { requires2fa: true }.
	// Le user valide son code TOTP via /2fa/verify pour obtenir une session
	// authenticated complete (access + refresh standards).
	@Public()
	@Throttle({ short: { limit: 5, ttl: 15 * 60 * 1000 } })
	@Post('login')
	async login(@Body() dto: LoginDto, @Req() req: Request, @Res() res: Response) {
		const { status, session } = await this.auth.login(
			dto.email, dto.password, req.ip ?? '', req.headers['user-agent'] ?? '',
		);

		if (status === 'requires_2fa') {
			// 5 minutes pour scanner + taper le code. Si depasse -> nouveau
			// login requis. Beaucoup plus court que le refresh standard (7j)
			// car c'est juste un cookie de transition entre password OK et
			// code TOTP OK.
			setTwoFaPendingCookie(res, session.refreshToken, '5m');
			return res.json({ requires2fa: true });
		}

		this.setSessionCookies(res, session.accessToken, session.refreshToken);
		res.json({ success: true });
	}

	// Revoque la session en DB + clear les cookies cote client.
	// Le revoke DB est important : meme si le client perd son cookie, le
	// refresh associe ne pourra plus servir a generer un nouveau access.
	@Post('logout')
	async logout(@Req() req: Request, @Res() res: Response) {
		const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
		if (refreshToken) await this.session.revoke(refreshToken);
		clearAccessTokenCookie(res);
		clearRefreshTokenCookie(res);
		res.json({ success: true });
	}

	// === PRIVATE

	private setSessionCookies(res: Response, accessToken: string, refreshToken: string) {
		const accessExp = this.config.get('JWT_EXPIRATION', { infer: true }) ?? '3h';
		const refreshExp = this.config.get('JWT_REFRESH_EXPIRATION', { infer: true }) ?? '7d';
		setAccessTokenCookie(res, accessToken, accessExp);
		setRefreshTokenCookie(res, refreshToken, refreshExp);
	}
}
