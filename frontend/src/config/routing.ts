import { defineRouting } from 'next-intl/routing';
import { locales, defaultLocale } from './i18n';

export const routing = defineRouting({
  locales,
  defaultLocale,
  // forcer /fr/auth au lieu de /auth
  localePrefix: 'always' 
});