import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// Chiffrement authentifie AES-256-GCM pour le secret TOTP en DB.
//
// Conformite :
//   - NIST SP 800-38D (recommandations GCM)
//   - OWASP Cryptographic Storage Cheat Sheet 2024
//   - RFC 5116 (AEAD interface)
//
// Pourquoi GCM plutot que CBC :
//   - GCM fait chiffrement + authentification en une operation (AEAD)
//   - Une alteration du ciphertext ou de l'auth tag fait throw au decrypt
//   - CBC seul est vulnerable a des attaques de padding oracle
//
// Vol DB sans la cle = secrets inexploitables (impossible de generer les
// codes TOTP). La cle est lue depuis TWO_FA_ENCRYPTION_KEY (64 chars hex
// = 32 bytes, soit 256 bits comme requis par AES-256).

const ALGO = 'aes-256-gcm';

// IV de 12 bytes (96 bits) : taille recommandee par NIST SP 800-38D
// section 8.2 pour GCM. Un IV plus grand deteriore les performances sans
// gain de securite (GCM compresse vers 96 bits en interne).
const IV_LENGTH = 12;

function getKey(hexKey: string): Buffer {
	return Buffer.from(hexKey, 'hex');
}

// Chiffre un secret. Format de sortie : "iv:authTag:ciphertext" en hex.
//   - iv (12 bytes)      : Initialization Vector. Random a chaque chiffrement.
//                          Pas secret mais ne DOIT JAMAIS etre reutilise avec
//                          la meme cle (sinon GCM perd toute securite).
//   - authTag (16 bytes) : Tag d'authentification genere par GCM. Verifie au
//                          decrypt — toute alteration fait throw.
//   - ciphertext         : Donnees chiffrees, taille = donnees originales
//                          (GCM est un mode stream).
export function encrypt(plaintext: string, hexKey: string): string {
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGO, getKey(hexKey), iv);

	// update() peut etre appele plusieurs fois (streaming). final() ferme et
	// libere les buffers internes (pas de padding pour GCM).
	const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

	// Le authTag n'est disponible qu'APRES final() en mode GCM.
	const authTag = cipher.getAuthTag();
	return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

// Dechiffre. Throw si le authTag ne matche pas, autrement dit si le payload
// a ete altere : "Unsupported state or unable to authenticate data".
export function decrypt(payload: string, hexKey: string): string {
	const [ivHex, authTagHex, encryptedHex] = payload.split(':');
	const decipher = createDecipheriv(ALGO, getKey(hexKey), Buffer.from(ivHex, 'hex'));

	// On donne le authTag AVANT de dechiffrer. Si la verification echoue,
	// final() throw — il ne faut donc PAS faire confiance aux bytes deja
	// renvoyes par update() avant de connaitre le verdict de final().
	decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
	const decrypted = Buffer.concat([
		decipher.update(Buffer.from(encryptedHex, 'hex')),
		decipher.final(),
	]);
	return decrypted.toString('utf8');
}
