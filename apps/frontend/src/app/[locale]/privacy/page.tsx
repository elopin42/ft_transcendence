import { getTranslations } from 'next-intl/server';
import { Link } from '@/config/navigation';
import { ROUTES } from '@/config/routes';
import '@/styles/legal.css';

export default async function PrivacyPage() {
    const t = await getTranslations('footer.pages.privacy');
    return (
        <main className="legal-wrapper">
            <div className="legal-card">
                <h1 className="legal-title">{t('title')}</h1>
                <p className="legal-lead">{t('lead')}</p>
                <p className="legal-body">{t('body')}</p>
                <Link className="legal-back" href={ROUTES.HOME}>
                    ← {t('back')}
                </Link>
            </div>
        </main>
    );
}
