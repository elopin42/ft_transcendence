import { Link } from '@/config/navigation';
import { ROUTES } from '@/config/routes';
import { useTranslations } from 'next-intl';

export default function PrivacyPolicy() {
    const t = useTranslations('privacy_policy');
    const email = 'privacy@msp42.example';

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

            {/* Intro */}
            <p className="text-sm leading-relaxed text-gray-600 mb-10">
                {t('intro')}
            </p>

            {/* Content */}
            <div className="space-y-10 text-sm leading-relaxed text-gray-600">

            <section>
                <h2 className="text-base font-semibold text-gray-900 mb-3">
                    {t('information_we_collect.title')}
                </h2>
                <p className="mb-3">{t('information_we_collect.intro')}</p>

                <div className="space-y-4">
                {[
                    "account_information",
                    "usage_data",
                    "technical_data",
                    "communications"
                ].map((item, _) => (
                    <div className="pl-4 border-l-2 border-gray-100">
                        <p className="font-medium text-gray-800 mb-1">
                            {t(`information_we_collect.${item}.title`)}
                        </p>
                        <p>{t(`information_we_collect.${item}.content`)}</p>
                    </div>    
                ))}
                </div>
            </section>

            <section>
                <h2 className="text-base font-semibold text-gray-900 mb-3">
                    {t('how_we_use.title')}
                </h2>
                <p className="mb-3">{t('how_we_use.intro')}</p>
                <ul className="space-y-2 pl-4">
                {(t.raw('how_we_use.items') as string[]).map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-gray-400 shrink-0" />
                    {item}
                    </li>
                ))}
                </ul>
                <p className="mt-3">{t('how_we_use.outro')}</p>
            </section>

            <section>
                <h2 className="text-base font-semibold text-gray-900 mb-3">
                    {t('cookies.title')}
                </h2>
                <p>{t('cookies.content')}</p>
            </section>

            <section>
                <h2 className="text-base font-semibold text-gray-900 mb-3">
                    {t('data_sharing.title')}
                </h2>
                <p className="mb-3">{t('data_sharing.intro')}</p>
                <ul className="space-y-2 pl-4">
                {(t.raw('data_sharing.items') as string[]).map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-gray-400 shrink-0" />
                    {item}
                    </li>
                ))}
                </ul>
            </section>

            {[
                "data_retention",
                "data_security",
                "childrens_privacy"
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
                    {t('your_rights.title')}
                </h2>
                <p className="mb-3">{t('your_rights.intro')}</p>
                <ul className="space-y-2 pl-4">
                {(t.raw('your_rights.items') as string[]).map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-gray-400 shrink-0" />
                    {item}
                    </li>
                ))}
                </ul>
                <p className="mt-3">{t('your_rights.outro')}</p>
            </section>

            <section>
                <h2 className="text-base font-semibold text-gray-900 mb-3">
                    {t('international_transfers.title')}
                </h2>
                <p>{t('international_transfers.content')}</p>
            </section>

            <section>
                <h2 className="text-base font-semibold text-gray-900 mb-3">
                    {t('changes_to_policy.title')}
                </h2>
                <p>{t('changes_to_policy.content')}</p>
            </section>

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
            <Link href={ROUTES.TERMS_OF_SERVICE}
                className="hover:text-gray-600 transition-colors underline underline-offset-2">
                {t('footer.terms_of_service')}
            </Link>
            </div>

        </div>
        </main>
    );
}
