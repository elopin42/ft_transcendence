// fait avec claude code

// Convertit une durée style JWT ("3h", "30m", "3600s") en millisecondes
// Synchronise automatiquement le maxAge du cookie avec JWT_EXPIRATION
export function parseExpiration(exp: string): number {
	const match = exp.match(/^(\d+)(h|m|s)$/);
	if (!match) return 3 * 60 * 60 * 1000;
	const value = parseInt(match[1]);
	switch (match[2]) {
		case 'h': return value * 60 * 60 * 1000;
		case 'm': return value * 60 * 1000;
		case 's': return value * 1000;
		default: return 3 * 60 * 60 * 1000;
	}
}