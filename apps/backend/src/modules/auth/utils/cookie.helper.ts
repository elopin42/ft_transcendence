import type { Response, CookieOptions } from 'express';
import { parseExpiration } from '@/common/utils/parse-expiration';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
// Cookie dedie au flow 2FA. Pose au login "requires_2fa", lu par /2fa/verify,
// efface apres verif. Path restreint au seul endpoint qui le consomme. Un
// cookie separe est necessaire car le refresh standard a path=/api/auth/refresh
// et ne serait donc pas envoye par le browser sur /api/2fa/verify.
export const TWO_FA_PENDING_COOKIE = 'two_fa_pending';

// Options communes a tous les cookies d'authentification (cf. RFC 6265bis) :
//   - httpOnly        : pas accessible depuis JavaScript (anti-XSS)
//   - secure          : uniquement HTTPS (nginx termine le TLS)
//   - sameSite 'lax'  : permet les redirections cross-site OAuth 42 tout en
//                       bloquant la majorite des CSRF (cf. OWASP CSRF Cheat
//                       Sheet 2024)
//   - path '/'        : envoye sur toutes les routes par defaut
const cookieOptions: CookieOptions = {
	httpOnly: true,
	secure: true,
	sameSite: 'lax',
	path: '/',
};

// Access token : court (~3h), envoye sur toutes les routes API protegees.
export function setAccessTokenCookie(res: Response, token: string, expiration: string): void {
	res.cookie(ACCESS_TOKEN_COOKIE, token, { ...cookieOptions, maxAge: parseExpiration(expiration) });
}

// Refresh token : long (~7j), restreint a /api/auth/refresh. Limite la surface
// d'attaque (jamais expose sur les routes metier, donc inaccessible meme si
// une route fuit le contenu d'un cookie quelconque).
export function setRefreshTokenCookie(res: Response, token: string, expiration: string): void {
	res.cookie(REFRESH_TOKEN_COOKIE, token, {
		...cookieOptions,
		path: '/api/auth/refresh',
		maxAge: parseExpiration(expiration),
	});
}

// Cookie 2FA pending : meme valeur que le refresh, mais path restreint a
// /api/2fa/verify pour ne pas que le browser l'envoie ailleurs.
export function setTwoFaPendingCookie(res: Response, token: string, expiration: string): void {
	res.cookie(TWO_FA_PENDING_COOKIE, token, {
		...cookieOptions,
		path: '/api/2fa/verify',
		maxAge: parseExpiration(expiration),
	});
}

export function clearAccessTokenCookie(res: Response): void {
	res.clearCookie(ACCESS_TOKEN_COOKIE, cookieOptions);
}

export function clearRefreshTokenCookie(res: Response): void {
	res.clearCookie(REFRESH_TOKEN_COOKIE, { ...cookieOptions, path: '/api/auth/refresh' });
}

export function clearTwoFaPendingCookie(res: Response): void {
	res.clearCookie(TWO_FA_PENDING_COOKIE, { ...cookieOptions, path: '/api/2fa/verify' });
}
