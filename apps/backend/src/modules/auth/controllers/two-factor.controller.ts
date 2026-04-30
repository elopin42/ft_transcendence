import { Body, Controller, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { AppException } from '@/common/exceptions/app.exception';
import { ERR } from '@ftt/shared/errors';
import { TwoFactorService } from '@/modules/auth/services/two-factor.service';
import { UsersService } from '@/modules/users/services/users.service';
import { PasswordService } from '@/modules/auth/services/password.service';
import { SessionService } from '@/modules/auth/services/session.service';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Public } from '@/modules/auth/decorators/public.decorator';
import {
	setAccessTokenCookie, setRefreshTokenCookie,
	clearTwoFaPendingCookie, TWO_FA_PENDING_COOKIE,
} from '@/modules/auth/utils/cookie.helper';
import { hashRefreshToken } from '@/modules/auth/utils/hash-token.helper';
import { Enable2faDto } from '@/modules/auth/dto/two-factor-enable.dto';
import { Verify2faDto } from '@/modules/auth/dto/two-factor-verify.dto';
import { Disable2faDto } from '@/modules/auth/dto/two-factor-disable.dto';
import type { JwtPayload } from '@/modules/auth/types/jwt-payload.type';
import type { EnvConfig } from '@/common/config/env.config';

// Endpoints 2FA TOTP (RFC 6238). 5 routes :
//   POST /2fa/setup           -> genere QR + secret (user authentifie)
//   POST /2fa/enable          -> active la 2FA apres verif du 1er code TOTP
//   POST /2fa/verify          -> verifie un code au login (etape 2 du flow)
//   POST /2fa/disable         -> desactive (require password)
//   POST /2fa/backup-codes    -> regenere les 10 backup codes
@Controller('2fa')
export class TwoFactorController {
	constructor(
		private readonly twoFactor: TwoFactorService,
		private readonly users: UsersService,
		private readonly password: PasswordService,
		private readonly session: SessionService,
		private readonly config: ConfigService<EnvConfig, true>,
	) { }

	// Etape 1 : user authentifie demande l'activation. Retourne un QR a scanner.
	// Secret stocke chiffre AES-256-GCM, enabled=false jusqu'a verif du 1er code.
	@Post('setup')
	async setup(@CurrentUser() payload: JwtPayload) {
		const user = await this.users.findById(payload.sub);
		if (!user) throw new AppException(ERR.AUTH.TOKEN.INVALID, HttpStatus.UNAUTHORIZED);
		return this.twoFactor.setup(user.id, user.email);
	}

	// Etape 2 : verif du 1er code TOTP scanne. Si OK -> 2FA active + 10 backup
	// codes a sauvegarder par le user. Throttle anti-bruteforce du 1er code
	// (5 essais en 5 min).
	@Throttle({ short: { limit: 5, ttl: 5 * 60 * 1000 } })
	@Post('enable')
	async enable(@CurrentUser() payload: JwtPayload, @Body() dto: Enable2faDto) {
		return this.twoFactor.enable(payload.sub, dto.code);
	}

	// Verif au login (etape 2 si 2FA active). Le user a deja une session
	// "requires_2fa" avec un cookie TWO_FA_PENDING_COOKIE pose au login
	// (path /api/2fa/verify). On revoque la session pending et on emet une
	// session authenticated complete.
	@Public()
	@Throttle({ short: { limit: 5, ttl: 5 * 60 * 1000 } })
	@Post('verify')
	async verify(@Req() req: Request, @Res() res: Response, @Body() dto: Verify2faDto) {
		const pendingToken = req.cookies?.[TWO_FA_PENDING_COOKIE];
		if (!pendingToken) throw new AppException(ERR.AUTH.TOKEN.INVALID, HttpStatus.UNAUTHORIZED);

		const session = await this.session.findByHash(hashRefreshToken(pendingToken));
		if (!session || session.revokedAt) throw new AppException(ERR.AUTH.TOKEN.INVALID, HttpStatus.UNAUTHORIZED);
		if (session.expiresAt < new Date()) throw new AppException(ERR.AUTH.TOKEN.EXPIRED, HttpStatus.UNAUTHORIZED);
		if (!session.twoFactorPending) throw new AppException(ERR.AUTH.TOKEN.INVALID, HttpStatus.UNAUTHORIZED);

		const ok = await this.twoFactor.verify(session.userId, dto.code);
		if (!ok) throw new AppException(ERR.TWO_FA.INVALID_CODE, HttpStatus.UNAUTHORIZED);

		await this.session.revokeById(session.id);
		const full = await this.session.sign({
			userId: session.userId,
			email: session.user.email,
			ipAddress: req.ip ?? '',
			userAgent: req.headers['user-agent'] ?? '',
			twoFactorPending: false,
		});

		clearTwoFaPendingCookie(res);
		this.setSessionCookies(res, full.accessToken, full.refreshToken);
		res.json({ success: true });
	}

	// Password requis -> empeche un attaquant ayant vole une session active
	// (XSS, machine non verrouillee) de desactiver la 2FA et garder l'acces.
	@Post('disable')
	async disable(@CurrentUser() payload: JwtPayload, @Body() dto: Disable2faDto) {
		const user = await this.users.findById(payload.sub);
		// Pas de password en DB = compte 42-only, on ne peut pas verifier.
		if (!user || !user.password) throw new AppException(ERR.AUTH.TOKEN.INVALID, HttpStatus.UNAUTHORIZED);
		// Mauvais password = code dedie pour que le front puisse afficher le
		// bon message ("mot de passe incorrect").
		if (!(await this.password.verify(user.password, dto.password))) {
			throw new AppException(ERR.AUTH.LOGIN.INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED);
		}
		await this.twoFactor.disable(user.id);
		return { success: true };
	}

	// Regenere 10 nouveaux backup codes (les anciens sont invalides). Throttle
	// fort (3/heure) car action sensible.
	@Throttle({ short: { limit: 3, ttl: 60 * 60 * 1000 } })
	@Post('backup-codes')
	async regenerateBackupCodes(@CurrentUser() payload: JwtPayload) {
		const codes = await this.twoFactor.regenerateBackupCodes(payload.sub);
		return { backupCodes: codes };
	}

	// === PRIVATE

	private setSessionCookies(res: Response, accessToken: string, refreshToken: string) {
		const accessExp = this.config.get('JWT_EXPIRATION', { infer: true }) ?? '3h';
		const refreshExp = this.config.get('JWT_REFRESH_EXPIRATION', { infer: true }) ?? '7d';
		setAccessTokenCookie(res, accessToken, accessExp);
		setRefreshTokenCookie(res, refreshToken, refreshExp);
	}
}
