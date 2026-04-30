import '@/styles/landing.css';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/config/navigation';
import { ROUTES } from '@/config/routes';

export default async function Home() {
  const t = await getTranslations('landing'); // charge les traductions de la section landing
  return (
    <div className="landing-wrapper">
      <img className="logo-topleft" src="/logomsp.png" alt="" />
      <div className="title-container">
        <h1 className="subtitle-backer">{t('subtitle')}</h1> {/* Friends, Fun, code & Connect */}
        <h1 className="subtitle-front">{t('subtitle')}</h1>
      </div>
      <div className="button">
        <Link className="main-btn-msp pink-button" href={ROUTES.REGISTER}>
          {t('play_button')} {/* JOUER MAINTENANT / PLAY NOW */}
        </Link>
        <div className="button-art">
          <img className="bling" src="/blingstar.png" style={{ top: '10%', left: '10%' }} alt="" />
          <img className="bling" src="/blingstar.png" style={{ top: '-15%', left: '15%' }} alt="" />
          <img className="bling" src="/blingstar.png" style={{ top: '-30%', left: '28%' }} alt="" />
          <img className="bling" src="/blingstar.png" style={{ bottom: '5%', right: '31%' }} alt="" />
          <img className="logo" src="/logomsp.png" style={{ top: '-35%', right: '0%' }} alt="" />
        </div>
      </div>
    </div>
  );
}
