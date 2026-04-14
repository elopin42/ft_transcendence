'use client';
import '@/styles/login.css';
import { useState } from 'react';
import { useTranslations } from 'next-intl'; // pour les traductions
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { useRouter, Link } from '@/config/navigation';
import { ROUTES } from '@/config/routes';


export default function LoginPage() {
  // ajout de la translation
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const { login } = useAuth(); // on recupere la fonction login du provider
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await login(email, password); // utilise le provider, plus de fetch ici
      router.push(ROUTES.DASHBOARD);
    } catch (err) {
      // login() throw si erreur, le message vient du back via api.post
      setError(err instanceof Error ? err.message : t('error_login'));
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div style={{ flex: 1 }}>
        <form className="container" onSubmit={handleSubmit}>
          <div className="input-container">
            <div className="input-content">
              <div className="input-dist">
                <div className="input-type">
                  <input
                    className="input-is"
                    type="email"
                    placeholder={t('email')}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                  <input
                    className="input-is"
                    type="password"
                    placeholder={t('password')}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          </div>
          {error && <p>{error}</p>}
          <button className="submit-button" type="submit" >{tCommon('login')}</button>
          <Link href={ROUTES.REGISTER}>{tCommon('register')}</Link>
          <button
            className="submit-button"
            type="button"
            onClick={async () => {
              try {
                const data = await api.get<{ available: boolean }>('/auth/42/status');
                if (data.available) {
                  window.location.href = '/api/auth/42';
                } else {
                  setError(t('error_42'));
                }
              } catch {
                setError(t('error_42'));
              }
            }}>
            {t('login_42')}
          </button>
        </form>
      </div>

      <div style={{ flex: 1 }}>
        <div className="bg">
          {/* trackers */}
          {Array.from({ length: 25 }, (_, i) => (
            <div key={i} className={`tracker tr-${i + 1}`}></div>
          ))}
          <div className="glow-background"></div>
          <div className="particles">
            <div className="dust d1"></div>
            <div className="dust d2"></div>
            <div className="dust d3"></div>
          </div>
          <div className="stage">
            <div className="scene">
              <div className="bob-wrapper">
                <div className="diamond">
                  <div className="facet table"></div>
                  <div className="facet crown c1"></div>
                  <div className="facet crown c2"></div>
                  <div className="facet crown c3"></div>
                  <div className="facet crown c4"></div>
                  <div className="facet crown c5"></div>
                  <div className="facet crown c6"></div>
                  <div className="facet crown c7"></div>
                  <div className="facet crown c8"></div>
                  <div className="facet pavilion p1"></div>
                  <div className="facet pavilion p2"></div>
                  <div className="facet pavilion p3"></div>
                  <div className="facet pavilion p4"></div>
                  <div className="facet pavilion p5"></div>
                  <div className="facet pavilion p6"></div>
                  <div className="facet pavilion p7"></div>
                  <div className="facet pavilion p8"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
