// Convertit une duree en notation humaine vers des millisecondes.
//
// Format accepte : "<nombre><unite>" sans espace.
//   s = secondes    "30s" -> 30 000 ms
//   m = minutes     "15m" -> 900 000 ms
//   h = heures      "3h"  -> 10 800 000 ms
//   d = jours       "7d"  -> 604 800 000 ms
//
// Utilise pour les TTL JWT/refresh/cookies, ou la valeur est ecrite dans .env
// en format lisible (ex: JWT_EXPIRATION="3h"). Throw si format inconnu pour
// detecter les typos au boot plutot qu'au runtime.
export function parseExpiration(value: string): number {
	const match = value.match(/^(\d+)([smhd])$/);
	if (!match) throw new Error(`Format de duree invalide: "${value}" (attendu : 30s, 15m, 3h, 7d)`);
	const [, n, unit] = match;
	const num = parseInt(n, 10);
	switch (unit) {
		case 's': return num * 1000;
		case 'm': return num * 60 * 1000;
		case 'h': return num * 60 * 60 * 1000;
		case 'd': return num * 24 * 60 * 60 * 1000;
		default: throw new Error(`Unite inconnue: ${unit}`);
	}
}
