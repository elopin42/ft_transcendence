import { useTranslations } from 'next-intl';

// Hook centralisé : gère traductions normales + erreurs API en un seul endroit.
// Usage :
//   const { t, error } = useLang('register');
//   t('title') -> "S'inscrire"
//   catch (e) { setMessage(error(e)) } -> erreur traduite
//
// Sans namespace :
//   const { t, error } = useLang();
//   t('common.welcome') -> fallback global

export function useLang(namespace?: string) {
    const t = useTranslations(namespace);
    const tErrors = useTranslations('errors');

    const error = (err: unknown): string => {
        // Réponse API : { code, params }
        const apiError = (err as any)?.response?.data;
        if (apiError?.code) {
            return tErrors(apiError.code, apiError.params ?? {});
        }
        return tErrors('UNKNOWN');
    };

    return { t, error };
}