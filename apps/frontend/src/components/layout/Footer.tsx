// Footer simple, utilise uniquement sur la home (/).
// Pour eviter d'apparaitre dans le dashboard/game, on ne le met PAS dans le layout
// mais on l'importe directement dans app/[locale]/page.tsx.

import { getTranslations } from 'next-intl/server';
import { Link } from '@/config/navigation';
import { ROUTES } from '@/config/routes';

export default async function Footer() {
    const t = await getTranslations('footer');
    const year = new Date().getFullYear();

    return (
        <footer className="landing-footer" role="contentinfo">
            <div className="landing-footer__inner">
                <span className="landing-footer__copy">
                    © {year} MovieStarParis 42
                </span>
                <nav className="landing-footer__links" aria-label={t('aria_label')}>
                    <Link className="landing-footer__link" href={ROUTES.POLICY}>
                        {t('policy')}
                    </Link>
                    <span className="landing-footer__sep" aria-hidden="true">•</span>
                    <Link className="landing-footer__link" href={ROUTES.PRIVACY}>
                        {t('privacy')}
                    </Link>
                </nav>
            </div>
        </footer>
    );
}
