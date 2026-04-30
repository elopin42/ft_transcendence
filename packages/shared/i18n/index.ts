// Auto-detection des locales : on importe chaque .json statiquement, le set des
// cles est notre liste. Pour ajouter "de", il suffit de creer locales/de.json
// (et d'ajouter une ligne d'import ci-dessous, faute de glob TS portable).
//
// Pour aller plus loin (ajout de langue zero config), un script make
// `i18n-list` peut regenerer ce bloc d'imports automatiquement.
import fr from './locales/fr.json' with { type: 'json' };
import en from './locales/en.json' with { type: 'json' };

export const messages = { fr, en } as const;
export const LOCALES = Object.keys(messages) as ReadonlyArray<keyof typeof messages>;
export type Locale = (typeof LOCALES)[number];

// Default locale : valeur par defaut si pas d'env (ou env invalide). Le
// front la fixe via NEXT_PUBLIC_DEFAULT_LOCALE (cf. apps/frontend/src/lib/env.ts).
export const FALLBACK_LOCALE: Locale = 'fr';

// Pure helper : valide une string contre les locales connues, fallback si
// invalide. Utilise par le front (env validee zod) — sans depasser le scope
// du package shared (pas d'acces a process.env ici).
export function resolveLocale(input: string | undefined | null): Locale {
	if (input && (LOCALES as readonly string[]).includes(input)) {
		return input as Locale;
	}
	return FALLBACK_LOCALE;
}