// Pattern de "registry" : convention pour declarer une source de verite
// partagee back+front. Pas une class (over-engineering pour TypeScript), juste
// un format uniforme + helpers de type.
//
// Chaque concept (errors, permissions, locales, routes API) suit le pattern :
//
//   1. Un objet `as const` declare les valeurs (= source de verite)
//   2. Le type est derive automatiquement (Leaves<>, ValueOf<>)
//   3. Un check Make valide la coherence avec le reste du systeme
//
// Concepts actuels :
//   @ftt/shared/errors        ← ERR (objet) + ErrorCode (type) + STATUS_TO_CODE
//   @ftt/shared/i18n          ← LOCALES + defaultLocale + resolveLocale + locales/*.json
//   @ftt/shared/env           ← schemas zod (sharedEnv, backendEnv, frontendEnv)
//   @ftt/shared/permissions   ← PERM + PERM_GROUP + ROLE_SEEDS + helpers (hasPerm, ...)
//   @ftt/shared/types         ← UserPublic, RolePublic, SessionPublic, FortyTwoProfilePublic
//   @ftt/shared/lib           ← helpers de types (Leaves<>, ValueOf<>, KeysOf<>)

// Helper : flatten recursif d'un arbre d'objets en union de strings.
// Permet d'avoir un type strict pour les valeurs feuilles d'une registry imbriquee.

// Ex : Leaves<{ a: { b: 'x', c: 'y' } }> = 'x' | 'y'
export type Leaves<T> = T extends string
	? T
	: T extends Record<string, unknown>
		? { [K in keyof T]: Leaves<T[K]> }[keyof T]
		: never;

// Helper : union des valeurs d'un objet plat.
// Ex : ValueOf<{ a: 1, b: 2 }> = 1 | 2
export type ValueOf<T> = T[keyof T];

// Helper : union des cles d'un objet, typee strictement (vs `string`).
// Ex : KeysOf<{ a: 1, b: 2 }> = 'a' | 'b'
export type KeysOf<T> = keyof T & string;