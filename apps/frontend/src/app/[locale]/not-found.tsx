import { useTranslations } from 'next-intl';
import { Link } from '@/config/navigation';

export default function NotFound() {
  const t = useTranslations('common'); // Assure-toi d'avoir une clé "not_found" dans common.json
  
  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>404</h1>
      <p>Oups ! Cette page n'existe pas.</p>
      <Link href="/">{t('play')}</Link>
    </div>
  );
}