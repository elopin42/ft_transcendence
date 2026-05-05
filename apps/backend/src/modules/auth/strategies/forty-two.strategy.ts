import { HttpStatus, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';

import { AppException } from '@/common/exceptions/app.exception';
import { ERR } from '@ftt/shared/errors';
import type { EnvConfig } from '@/common/config/env.config';
import type { FortyTwoProfile } from '@/modules/auth/types/forty-two-profile.type';

// Strategie OAuth 2.0 (RFC 6749) pour le login via 42 intra. passport-oauth2
// gere le flow : redirect -> code -> token -> validate().
//
// Si l'app 42 n'est pas configuree (env vides ou "disabled"), la strategy
// est inerte pour ne pas crasher le boot. Le check is-configured se fait au
// runtime, dans validate().
//
// Note : on n'utilise pas PKCE (RFC 7636) ici car le serveur tient le
// client_secret cote backend (flow Authorization Code classique, pas SPA).
@Injectable()
export class FortyTwoStrategy extends PassportStrategy(Strategy, '42') {
	private readonly logger = new Logger(FortyTwoStrategy.name);
	private readonly isConfigured: boolean;

	constructor(config: ConfigService<EnvConfig, true>) {
		const clientId = config.get('FORTYTWO_CLIENT_ID', { infer: true }) ?? 'disabled';
		const clientSecret = config.get('FORTYTWO_CLIENT_SECRET', { infer: true }) ?? 'disabled';
		const callbackURL = config.get('FORTYTWO_CALLBACK_URL', { infer: true })
			?? 'https://localhost/api/auth/42/callback';

		super({
			authorizationURL: 'https://api.intra.42.fr/oauth/authorize',
			tokenURL: 'https://api.intra.42.fr/oauth/token',
			clientID: clientId,
			clientSecret,
			callbackURL,
			scope: ['public'],
		});

		this.isConfigured = clientId !== 'disabled' && clientSecret !== 'disabled';
		if (!this.isConfigured) {
			this.logger.warn('42 OAuth2 disabled (FORTYTWO_CLIENT_ID/SECRET non configures)');
		}
	}

	// Appelee apres l'echange code -> access_token. On utilise l'access_token
	// pour fetch /v2/me et recuperer le profil. Le _refreshToken d'OAuth 42
	// est ignore : notre propre rotation se fait via les Sessions internes.
	async validate(accessToken: string, _refreshToken: string): Promise<FortyTwoProfile> {
		if (!this.isConfigured) {
			throw new ServiceUnavailableException('42 OAuth2 is not configured');
		}

		const response = await fetch('https://api.intra.42.fr/v2/me', {
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		if (!response.ok) {
			this.logger.warn(`42 API error: ${response.status} ${response.statusText}`);
			throw new AppException(ERR.AUTH.OAUTH_42.FAILED, HttpStatus.UNAUTHORIZED);
		}

		const profile = await response.json();
		return {
			fortyTwoId: profile.id,
			login: profile.login,
			email: profile.email,
			displayName: profile.displayname ?? profile.usual_full_name ?? null,
			imageUrl: profile.image?.link ?? null,
			campus: profile.campus?.[0]?.name ?? null,
			poolMonth: profile.pool_month ?? null,
			poolYear: profile.pool_year ?? null,
			raw: profile, // payload brut stocke en JSONB pour usage futur
		};
	}
}
