import { ROUTES } from '@/config/routes';
import { useTranslations } from 'next-intl';

export default function TermsOfService() {
  const t = useTranslations('terms_of_service');
  const email = "legal@msp42.example";

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="max-w-3xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-12 border-b border-gray-200 pb-8">
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">
            {t('legal')}
          </p>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('title')}
          </h1>
          <p className="text-sm text-gray-400">{t('last_update')}</p>
        </div>

        {/* Content */}
        <div className="space-y-10 text-sm leading-relaxed text-gray-600">

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              {t('acceptance_of_terms.title')}
            </h2>
            <p>{t('acceptance_of_terms.content')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              {t('eligibility.title')}
            </h2>
            <p>{t('eligibility.content')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              {t('account_responsibilities.title')}
            </h2>
            <p className="mb-3">{t('account_responsibilities.intro')}</p>
            <ul className="space-y-2 pl-4">
              {(t.raw('account_responsibilities.items') as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-gray-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              {t('user_conduct.title')}
            </h2>
            <p className="mb-3">{t('user_conduct.intro')}</p>
            <ul className="space-y-2 pl-4">
              {(t.raw('user_conduct.items') as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-gray-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3">{t('user_conduct.outro')}</p>
          </section>

          {[
            "virtual_items",
            "intellectual_property",
            "termination",
            "disclaimer_of_warranties",
            "limitation_of_liability",
            "changes_to_terms"
            ].map((item, _) => (
              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-3">
                  {t(`${item}.title`)}
                </h2>
                <p>{t(`${item}.content`)}</p>
              </section>
          ))}

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              {t('contact.title')}
            </h2>
            <p>
              {t('contact.content')} {" "}
              <a href={`mailto:${email}`}
                className="text-gray-900 underline underline-offset-2 hover:text-gray-600 transition-colors">
                {email}
              </a>
              .
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs text-gray-400">
          <span>{t('footer.copyright')}</span>
          <a href={ROUTES.PRIVACY_POLICY}
            className="hover:text-gray-600 transition-colors underline underline-offset-2">
            {t('footer.privacy_policy')}
          </a>
        </div>

      </div>
    </main>
  );
}
