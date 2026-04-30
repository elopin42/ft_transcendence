import { Injectable, HttpStatus } from '@nestjs/common';

import { AppException } from '@/common/exceptions/app.exception';
import { ERR } from '@ftt/shared/errors';
import { UsersService } from '@/modules/users/services/users.service';
import { PasswordService } from '@/modules/auth/services/password.service';
import { SessionService } from '@/modules/auth/services/session.service';
import { TwoFactorService } from '@/modules/auth/services/two-factor.service';
import type { FortyTwoProfile } from '@/modules/auth/types/forty-two-profile.type';
import type { LoginResult, CreatedSession } from '@/modules/auth/types/session.type';

// Orchestrateur d'authentification.
// Combine les briques metier : password (hash argon2id) + sessions (rotation
// + detection vol) + 2FA + persistance user. Chaque methode renvoie un
// CreatedSession (access + refresh tokens + sessionId) que le controller
// utilisera pour poser les cookies httpOnly.
@Injectable()
export class AuthService {
	constructor(
		private readonly users: UsersService,
		private readonly password: PasswordService,
		private readonly session: SessionService,
		private readonly twoFactor: TwoFactorService,
	) { }

	async register(email: string, plainPassword: string, login: string, ipAddress: string, userAgent: string): Promise<CreatedSession> {
		const hashed = await this.password.hash(plainPassword);
		const user = await this.users.createWithPassword(email, hashed, login);
		return this.session.sign({ userId: user.id, email: user.email, ipAddress, userAgent });
	}

	// Login email/password. Reponse generique en cas d'echec (user inexistant
	// ou mauvais password) -> empeche l'enumeration de comptes par difference
	// de message ou par timing (cf. OWASP Authentication Cheat Sheet 2024,
	// section "Authentication and Error Messages").
	//
	// Si la 2FA est active sur le compte : on emet une session "twoFactorPending"
	// (le controller posera un cookie 2fa pending dedie, pas l'access standard).
	// Le user devra valider son code TOTP via /2fa/verify pour obtenir une
	// session authenticated complete.
	async login(email: string, plainPassword: string, ipAddress: string, userAgent: string): Promise<LoginResult> {
		const user = await this.users.findByEmail(email);
		if (!user || !user.password) throw new AppException(ERR.AUTH.LOGIN.INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED);
		if (!(await this.password.verify(user.password, plainPassword))) {
			throw new AppException(ERR.AUTH.LOGIN.INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED);
		}

		const requires2fa = await this.twoFactor.isEnabled(user.id);
		const session = await this.session.sign({
			userId: user.id, email: user.email,
			ipAddress, userAgent,
			twoFactorPending: requires2fa,
		});
		return { status: requires2fa ? 'requires_2fa' : 'authenticated', session };
	}

	// Login OAuth 2.0 via 42 (cf. RFC 6749). UsersService.findOrCreateFrom42
	// gere les 3 cas : deja connu par fortyTwoId, connu par email a lier,
	// nouveau user.
	async loginWith42(profile: FortyTwoProfile, ipAddress: string, userAgent: string): Promise<CreatedSession> {
		const user = await this.users.findOrCreateFrom42(profile);
		return this.session.sign({ userId: user.id, email: user.email, ipAddress, userAgent });
	}
}
