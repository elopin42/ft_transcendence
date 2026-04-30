import { defineRouting } from 'next-intl/routing';

import { LOCALES, resolveLocale } from '@ftt/shared/i18n';
import { env } from '@/lib/env';

export const routing = defineRouting({
	locales: [...LOCALES],
	defaultLocale: resolveLocale(env.NEXT_PUBLIC_DEFAULT_LOCALE),
	// Force /fr/auth au lieu de /auth — sinon Next-intl essaie de detecter
	// la locale via le navigateur et le SEO devient incoherent.
	localePrefix: 'always',
});