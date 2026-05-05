// Validation des variables d'environnement frontend.
//
// Source de verite partagee : packages/shared/env/schema.ts. On reutilise
// le sous-schema frontendEnvSchema pour s'assurer que les NEXT_PUBLIC_* ont
// le bon format avant de demarrer.
//
// Pourquoi : si NEXT_PUBLIC_API_URL est typoe ou manquant, le client va
// taper des routes 404 silencieuses au lieu de la backend. Mieux vaut crash
// au boot avec un message clair.

import { frontendEnvSchema, parseEnv, type FrontendEnv } from '@ftt/shared/env';

// IMPORTANT cote Next.js : les NEXT_PUBLIC_* sont inlines a la compilation.
// On ne peut PAS utiliser process.env[name] dynamique, sinon Next ne les
// detecte pas. On reference chaque var explicitement pour que Next les
// trouve au build et les remplace par leur valeur statique.
//
// Cf. https://nextjs.org/docs/app/api-reference/components/font#environment-variables
const raw: Record<string, string | undefined> = {
	NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
	NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
	NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
	NODE_ENV: process.env.NODE_ENV,
	PORT: process.env.PORT,
};

export const env: FrontendEnv = parseEnv(frontendEnvSchema, raw, 'frontend env');
