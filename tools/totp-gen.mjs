// Generateur de code TOTP a partir d'un secret Base32.
//
// Volontairement HORS de l'image backend (cf. .dockerignore qui exclut tools/).
// Lance via stdin pour utiliser otplib qui vit dans le container :
//
//   cat tools/totp-gen.mjs | docker compose exec -T \
//     -e TOTP_SECRET=JBSW... backend node --input-type=module
//
// Comme ca le fichier ne traine pas dans une image qui finira en prod.

import { generate } from '@otplib/totp';
import { crypto } from '@otplib/plugin-crypto-noble';
import { base32 } from '@otplib/plugin-base32-scure';

const secret = process.env.TOTP_SECRET;
if (!secret) {
	console.error('TOTP_SECRET (var env) requise');
	process.exit(1);
}

const token = await generate({ secret, crypto, base32 });
console.log(token);
