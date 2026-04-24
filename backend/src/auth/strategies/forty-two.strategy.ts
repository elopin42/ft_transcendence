import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';

// Stratégie OAuth2 pour l'authentification via 42 intra
// passport-oauth2 gère le flow : redirection → code → token → validate()
@Injectable()
export class FortyTwoStrategy extends PassportStrategy(Strategy, '42') {
	//Flag si l'api est configuré dans l'env
	private isConfigured: boolean;
	constructor(configService: ConfigService) {
		// configuration des 2 endpoints OAuth2 de 42
		const UID42 = configService.get<string>('FORTYTWO_CLIENT_ID') || 'disabled';
		const Secret42 = configService.get<string>('FORTYTWO_CLIENT_SECRET') || 'disabled';
		const callback42 = configService.get<string>('FORTYTWO_CALLBACK_URL') || 'https://localhost/api/auth/42/callback'; // fallback HTTPS via nginx
		super({
			// URL ou l'utilisateur est redigirer pour autoriser l'application
			// URL appelée serveur-à-serveur pour échanger le code contre un token
			authorizationURL: 'https://api.intra.42.fr/oauth/authorize',
			tokenURL: 'https://api.intra.42.fr/oauth/token',

			// UID & Secret 42 app intra
			clientID: UID42,
			clientSecret: Secret42,

			// URL de redirection après autorisation corespond a celui mis dans l'intra
			callbackURL: callback42,

			// Scope public assez pour login email image
			scope: ['public'],
		});
		this.isConfigured = !!(UID42 && Secret42);
		if (!this.isConfigured) { console.warn('42 OAuth2 strategy is not configured. Please set FORTYTWO_CLIENT_ID and FORTYTWO_CLIENT_SECRET in the environment variables.'); }
	}

	// Appelée après l'échange code→token, accessToken permet d'appeler l'API 42
	async validate(accessToken: string, _refreshToken: string): Promise<any> {
		// 42 pas configuré et que quelqu'un arrive quand même ici
		if (!this.isConfigured) { throw new Error('42 OAuth2 strategy is not configured. Please set FORTYTWO_CLIENT_ID and FORTYTWO_CLIENT_SECRET in the environment variables.'); }
		// /v2/me endpoint de 42 pour récupérer les infos de l'utilisateur
		const response = await fetch('https://api.intra.42.fr/v2/me', {
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		if (!response.ok) {
			throw new Error(`42 API error: ${response.status} ${response.statusText}`)
		}
		const profile = await response.json();
		/* Les champs viennent de la réponse /v2/me :
			- id : identifiant unique 42 (nombre)
			- login : le login 42 (ex: "asmith")
			- email : l'email 42
			- image.link : URL de la photo de profil */
		return {
			fortyTwoId: profile.id,
			login: profile.login,
			email: profile.email,
			imageUrl: profile.image?.link || null,
		};
	}
}