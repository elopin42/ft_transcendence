import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

// Hash + verify des passwords avec Argon2id (RFC 9106, mai 2021).
//
// Pourquoi Argon2id et pas bcrypt :
//   - Gagnant de la Password Hashing Competition 2015
//   - Resistant aux attaques GPU/ASIC grace a memoryCost
//   - Variante "id" combine resistance side-channel (Argon2i) et resistance
//     time-memory trade-off (Argon2d) — recommande par OWASP Password Storage
//     Cheat Sheet 2024
//
// Parametres par defaut d'argon2 npm (v0.41+) :
//   - timeCost: 3 (iterations)
//   - memoryCost: 65536 (64 MiB)
//   - parallelism: 4
//   Conformes aux minimums OWASP 2024 pour Argon2id.
@Injectable()
export class PasswordService {
	hash(plain: string): Promise<string> {
		return argon2.hash(plain);
	}

	// argon2.verify est constant-time : pas vulnerable au timing attack.
	verify(hash: string, plain: string): Promise<boolean> {
		return argon2.verify(hash, plain);
	}
}
