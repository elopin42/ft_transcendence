import { getTranslations } from 'next-intl/server';
import { Link } from '@/config/navigation';
import { ROUTES } from '@/config/routes';

export default async function Footer() {
    const t = await getTranslations('footer');
    const tPrivacy = await getTranslations('privacy_policy');
    const tTerms = await getTranslations('terms_of_service');

    return (
        <footer className="landing-footer" role="contentinfo">
            <div className="landing-footer__inner">
                <span className="landing-footer__copy">
                    © 2026 MovieStarParis 42
                </span>
                <nav className="landing-footer__links" aria-label={t('aria_label')}>
                    <Link className="landing-footer__link" href={ROUTES.PRIVACY_POLICY}>
                        {tPrivacy('title')}
                    </Link>
                    <span className="landing-footer__sep" aria-hidden="true">•</span>
                    <Link className="landing-footer__link" href={ROUTES.TERMS_OF_SERVICE}>
                        {tTerms('title')}
                    </Link>
                </nav>
            </div>
        </footer>
    );
}
