// Standard RFC 7519 : sub = subject (sujet, ici user.id).
// iat / expiration ajoutés automatiquement par jsonwebtoken.

export type JwtPayload = {
	sub: number; // user id (subject, standard JWT RFC 7519)
	email: string; // utile pour logs/debug, pas pour auth (l'id fait foi)
	iat?: number; // issued at ajoutés automatiquement par jsonwebtoken
	expiration?: number; // expiration time ajoutés automatiquement par jsonwebtoken
};
