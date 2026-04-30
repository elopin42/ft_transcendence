// Vue publique d'une session active : ce qu'on retourne au client.
// On ne retourne JAMAIS le refreshTokenHash (interne, securite).

export type SessionPublic = {
	id: number;
	ipAddress: string;
	userAgent: string;
	createdAt: Date;
	lastUsedAt: Date;
	expiresAt: Date;
};