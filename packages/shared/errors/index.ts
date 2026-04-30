// Source de verite des codes d'erreur, partagee back + front via npm workspace
// `@ftt/shared`. La valeur string voyage dans la response API (champ `code`)
// et sert de cle i18n cote front (next-intl, namespace 'errors').
//
// Convention : domain.action.reason en snake_case, en arbre pour la lisibilite.
//
// Ajouter un code :
//   1. Ajoute la cle dans l'arbre ci-dessous
//   2. Ajoute la traduction dans frontend/src/lang/{fr,en}.json (clef imbriquee)
//   3. Si c'est une route HTTP, ajoute un check dans make/tests.mk
//
// Renommer un code : OK aussi, mais en une seule passe coordonnee back +
// front i18n + tests Make. Le `make check-i18n` (chantier 3) detecte les
// desyncs entre cet arbre et les fichiers de langue.

export const ERR = {
	AUTH: {
		LOGIN: {
			INVALID_CREDENTIALS: 'auth.login.invalid_credentials',
		},
		TOKEN: {
			INVALID: 'auth.token.invalid',
			EXPIRED: 'auth.token.expired',
			REFRESH_REUSED: 'auth.token.refresh_reused',
		},
		REGISTER: {
			EMAIL_TAKEN: 'auth.register.email_taken',
			LOGIN_TAKEN: 'auth.register.login_taken',
		},
		OAUTH_42: {
			FAILED: 'auth.oauth_42.failed',
		},
	},
	VALIDATION: {
		EMAIL: {
			INVALID: 'validation.email.invalid',
			REQUIRED: 'validation.email.required',
			TOO_LONG: 'validation.email.too_long',
		},
		PASSWORD: {
			REQUIRED: 'validation.password.required',
			TOO_SHORT: 'validation.password.too_short',
			TOO_LONG: 'validation.password.too_long',
			MISSING_COMPLEXITY: 'validation.password.missing_complexity',
		},
		LOGIN: {
			REQUIRED: 'validation.login.required',
			TOO_SHORT: 'validation.login.too_short',
			TOO_LONG: 'validation.login.too_long',
			INVALID_CHARS: 'validation.login.invalid_chars',
		},
		FAILED: 'validation.failed',
	},
	TWO_FA: {
		NOT_ENABLED: 'two_fa.not_enabled',
		ALREADY_ENABLED: 'two_fa.already_enabled',
		INVALID_CODE: 'two_fa.invalid_code',
		INVALID_BACKUP_CODE: 'two_fa.invalid_backup_code',
		REQUIRED: 'two_fa.required',
	},
	USER: {
		NOT_FOUND: 'user.not_found',
		PROFILE_INCOMPLETE: 'user.profile_incomplete',
		PERMISSION_DENIED: 'user.permission_denied',
	},
	GAME: {
		NOT_FOUND: 'game.not_found',
		FULL: 'game.full',
		ALREADY_STARTED: 'game.already_started',
	},
	RATE_LIMIT: {
		EXCEEDED: 'rate_limit.exceeded',
		BRUTE_FORCE: 'rate_limit.brute_force',
	},
	// Codes generiques utilises par le filter en fallback. Si tu vois ces codes
	// arriver cote front, c'est qu'un service throw HttpException sans passer
	// par AppException -> grep le warn dans les logs pour trouver l'oubli.
	GENERIC: {
		BAD_REQUEST: 'generic.bad_request',
		UNAUTHORIZED: 'generic.unauthorized',
		FORBIDDEN: 'generic.forbidden',
		NOT_FOUND: 'generic.not_found',
		CONFLICT: 'generic.conflict',
		UNKNOWN: 'generic.unknown',
	},
} as const;

// Le type ErrorCode est derive automatiquement de l'arbre ERR via Leaves<>.
// Helper partage cf. packages/shared/lib (meme pattern pour permissions/i18n).
import type { Leaves } from '@ftt/shared/lib';
export type ErrorCode = Leaves<typeof ERR>;

// Mapping HTTP status -> code generique. Utilise UNIQUEMENT par le filter
// quand une exception remonte sans AppException explicite. Tout code metier
// doit passer par AppException(ERR.X.Y, 4xx) directement.
export const STATUS_TO_CODE: Record<number, ErrorCode> = {
	400: ERR.GENERIC.BAD_REQUEST,
	401: ERR.GENERIC.UNAUTHORIZED,
	403: ERR.GENERIC.FORBIDDEN,
	404: ERR.GENERIC.NOT_FOUND,
	409: ERR.GENERIC.CONFLICT,
	429: ERR.RATE_LIMIT.EXCEEDED,
};