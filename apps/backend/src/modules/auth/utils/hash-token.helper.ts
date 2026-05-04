import { createHash, randomBytes } from 'node:crypto';

// Refresh tokens : on genere 32 bytes random (256 bits d'entropie). On stocke
// uniquement leur SHA-256 en DB (pas le brut). Si un attaquant dump la DB,
// il ne peut pas l'utiliser comme cookie cote client (c'est juste un hash).
//
// SHA-256 sans salt est OK ici car le token brut a deja 256 bits d'entropie
// — pas vulnerable aux rainbow tables (ce serait pertinent pour des passwords
// qui ont peu d'entropie). Cf. NIST SP 800-107 sec. 5.2.

// Token brut (renvoye en cookie au client). 32 bytes hex = 64 chars.
export function generateRefreshToken(): string {
	return randomBytes(32).toString('hex');
}

// Hash stocke en DB. Comparaison constante : non necessaire ici car la lookup
// se fait par hash exact (where: { refreshTokenHash }), pas par comparaison
// chaine par chaine.
export function hashRefreshToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}
