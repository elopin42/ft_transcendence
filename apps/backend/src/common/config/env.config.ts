// Validation des variables d'environnement au boot.
//
// Source de verite partagee : packages/shared/env/schema.ts. Backend et
// frontend importent le meme schema zod, ce qui garantit que les types sont
// alignes et qu'aucune var n'est valide d'un cote sans l'etre de l'autre.
//
// Hook : ConfigModule.forRoot({ validate: validateEnv }) appelle ce code au
// boot. Si une var manque, est mal typee ou trop courte, Nest refuse de
// demarrer avec un rapport ligne-par-ligne plutot que de crasher trois
// heures plus tard sur un appel API.

import { backendEnvSchema, parseEnv, type BackendEnv } from '@ftt/shared/env';

// Type expose au reste du backend (ConfigService<EnvConfig, true>).
// Reste alias-compatible avec l'ancien nom EnvConfig.
export type EnvConfig = BackendEnv;

export function validateEnv(raw: Record<string, unknown>): EnvConfig {
	return parseEnv(backendEnvSchema, raw, 'backend env');
}
