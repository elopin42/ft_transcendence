import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';

// Stratégie OAuth2 pour l'authentification via 42 intra
// passport-oauth2 gère le flow : redirection → code → token → validate()
@Injectable()
export class FortyTwoStrategy extends PassportStrategy(Strategy, '42') {
	constructor(configService: ConfigService) {
		// configuration des 2 endpoints OAuth2 de 42
		super({
			// URL ou l'utilisateur est redigirer pour autoriser l'application
			// URL appelée serveur-à-serveur pour échanger le code contre un token
			authorizationURL: 'https://api.intra.42.fr/oauth/authorize',
			tokenURL: 'https://api.intra.42.fr/oauth/token',

			// UID & Secret 42 app intra
			clientID: configService.get<string>('FORTYTWO_CLIENT_ID', ''),
			clientSecret: configService.get<string>('FORTYTWO_CLIENT_SECRET', ''),

			// URL de redirection après autorisation corespond a celui mis dans l'intra
			callbackURL: configService.get<string>('FORTYTWO_CALLBACK_URL', ''),

			// Scope public assez pour login email image
			scope: ['public'],
		});
	}

	// Appelée après l'échange code→token, accessToken permet d'appeler l'API 42
	async validate(accessToken: string, refreshToken: string): Promise<any> {
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