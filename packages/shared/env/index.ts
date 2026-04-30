// Source unique de verite pour les variables d'environnement.
//
// Le .env racine est la seule source de configuration partagee. Backend et
// frontend importent ce schema pour valider leurs vars au boot. Toute var
// manquante ou mal typee fait echouer le demarrage avec un message clair
// (vs erreur runtime obscure trois heures plus tard).
//
// Trois schemas exposes :
//   - sharedEnvSchema  : vars utilisees back ET front (DOMAIN, NEXT_PUBLIC_*)
//   - backendEnvSchema : etend shared + secrets backend (JWT, 2FA, DB, OAuth)
//   - frontendEnvSchema : extrait des NEXT_PUBLIC_* (le seul subset que le
//                         navigateur a le droit de voir)
//
// Pourquoi zod plutot que class-validator :
//   - 0 dependance NestJS, marche cote front aussi
//   - Inference TypeScript native (z.infer<typeof schema>)
//   - Messages d'erreur lisibles avec format() / flatten()

import { z } from 'zod';

// === Helpers ========================================================

const hexString = (bits: number) => z.string().regex(
	new RegExp(`^[0-9a-fA-F]{${bits / 4}}$`),
	`doit etre ${bits / 4} caracteres hex (= ${bits} bits)`,
);

const httpsUrl = z.string().url().refine(
	(v) => v.startsWith('https://'),
	'doit commencer par https://',
);

const duration = z.string().regex(
	/^\d+[smhd]$/,
	'format attendu : nombre + unite (s/m/h/d), ex: "3h", "7d"',
);

const stringBool = z.enum(['true', 'false']).transform((v) => v === 'true');

// === Schemas ========================================================

// Vars utilisees aussi bien cote backend que frontend.
export const sharedEnvSchema = z.object({
	DOMAIN_NAME: z.string().min(1).default('localhost'),
	CORS_ORIGIN: httpsUrl.default('https://localhost'),

	// Inlines par Next.js a la compilation (cf. apps/frontend/Dockerfile).
	NEXT_PUBLIC_API_URL: httpsUrl.default('https://localhost/api'),
	NEXT_PUBLIC_SOCKET_URL: httpsUrl.default('https://localhost'),
	NEXT_PUBLIC_DEFAULT_LOCALE: z.enum(['fr', 'en']).default('fr'),
});

// Vars exclusivement backend. Inclut secrets cryptographiques.
export const backendEnvSchema = sharedEnvSchema.extend({
	ENV_MODE: z.enum(['development', 'production']).default('development'),
	PORT: z.coerce.number().int().positive().default(4000),
	THROTTLER_DISABLED: stringBool.default('true'),

	// PostgreSQL : URL complete, pas les composants. ConfigService valide,
	// PrismaClient lit.
	DATABASE_URL: z.string().url(),

	// JWT : secret HS256 minimum 256 bits (RFC 7518 recommande 256+ pour HS256).
	// 64 hex = 32 bytes = 256 bits.
	JWT_SECRET: hexString(256),
	JWT_EXPIRATION: duration.default('3h'),
	JWT_REFRESH_EXPIRATION: duration.default('7d'),

	// 2FA : cle AES-256-GCM (NIST SP 800-38D). 64 hex = 32 bytes = 256 bits.
	TWO_FA_ENCRYPTION_KEY: hexString(256),

	// 42 OAuth optionnel. Si vide ou "disabled" -> bouton 42 cache cote front
	// via la route /auth/42/status.
	FORTYTWO_CLIENT_ID: z.string().default(''),
	FORTYTWO_CLIENT_SECRET: z.string().default(''),
	FORTYTWO_CALLBACK_URL: httpsUrl.default('https://localhost/api/auth/42/callback'),
});

// Subset NEXT_PUBLIC_* expose au browser. JAMAIS d'autre var ici sinon elle
// part dans le bundle JS public et est lisible par n'importe qui.
export const frontendEnvSchema = sharedEnvSchema.pick({
	NEXT_PUBLIC_API_URL: true,
	NEXT_PUBLIC_SOCKET_URL: true,
	NEXT_PUBLIC_DEFAULT_LOCALE: true,
}).extend({
	NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
	PORT: z.coerce.number().int().positive().default(3000),
});

// === Types inferes ==================================================

export type SharedEnv = z.infer<typeof sharedEnvSchema>;
export type BackendEnv = z.infer<typeof backendEnvSchema>;
export type FrontendEnv = z.infer<typeof frontendEnvSchema>;

// === Helper de parsing avec message d'erreur lisible ================

// Parse process.env contre un schema. En cas d'erreur, log un rapport
// par variable et throw -> Nest/Next refusent de demarrer plutot que de
// crasher trois heures plus tard sur une route random.
export function parseEnv<T extends z.ZodTypeAny>(
	schema: T,
	source: Record<string, unknown> = process.env,
	context = 'env',
): z.infer<T> {
	const parsed = schema.safeParse(source);
	if (parsed.success) return parsed.data;

	const lines = parsed.error.errors.map((e) => {
		const path = e.path.join('.');
		// Indique la valeur actuelle pour les erreurs de longueur (debug)
		const actual = source[path];
		const hint = typeof actual === 'string'
			? ` (actuel : ${actual.length} chars)`
			: '';
		return `  - ${path}: ${e.message}${hint}`;
	});
	throw new Error(
		`[${context}] validation echouee :\n${lines.join('\n')}\n` +
		`Verifie ton .env (cf. .env.example) ou lance 'make fix-env' (regenere uniquement les secrets cassés).`,
	);
}
