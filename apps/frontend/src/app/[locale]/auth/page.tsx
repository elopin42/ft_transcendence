'use client';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/config/navigation';
import { ROUTES } from '@/config/routes';
import { API_ROUTES } from '@/config/api';
import { api } from '@/lib/api';
import '@/styles/setup.css';

const characters = [
    { id: 'nass', name: 'Nass', image: '/character/nass/nass-front.png' },
];

export default function RegisterPage() {
    const t = useTranslations('auth');
    const { register, login } = useAuth();
    const [index, setIndex] = useState(0);
    const [step, setStep] = useState(0); // 0: avatar, 1: pseudo, 2: compte
    const [pseudo, setPseudo] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    // Sous-flow login en popup integre dans la page register (Nass).
    const [showLogin, setShowLogin] = useState(false);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const router = useRouter();
    const prev = () => setIndex((i) => (i - 1 + characters.length) % characters.length);
    const next = () => setIndex((i) => (i + 1) % characters.length);
    const current = characters[index];

    const headlines = [
        t('choose_character'),
        t('choose_name'),
        t('create_account'),
    ];

    const handleNext = () => {
        if (step < 2) setStep(step + 1);
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        try {
            await register(email, password, pseudo);
            router.push(ROUTES.DASHBOARD);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('error_login'));
        }
    }

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setLoginError('');
        try {
            await login(loginEmail, loginPassword);
            router.push(ROUTES.DASHBOARD);
        } catch (err) {
            setLoginError(err instanceof Error ? err.message : t('error_login'));
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <div style={{
                backgroundImage: 'url(/background_login.png)',
                width: '100vw',
                height: '100vh',
                backgroundSize: 'cover',
                overflow: 'hidden',
                position: 'relative',
            }}>
                <div className="headline">
                    <h1 className="stroke-white">{headlines[step]}</h1>
                    <h1 className="normal">{headlines[step]}</h1>
                </div>
                <div className="carousel">
                    {step === 0 && (
                        <button onClick={prev} className="carousel-btn-left">
                            <img src="/fleche.png" alt="prev" />
                        </button>
                    )}
                    <div className="carousel-card">
                        <img src={current.image} alt={current.name} />
                        <p>{current.name}</p>
                    </div>
                    {step === 0 && (
                        <button onClick={next} className="carousel-btn-right">
                            <img src="/fleche.png" alt="next" />
                        </button>
                    )}
                </div>

                <div className="popup-anchor">
                    {step === 1 && (
                        <div className="pseudo-popup-content">
                            <button
                                type="button"
                                onClick={() => setStep(step - 1)}
                                style={{ position: 'absolute', top: '12px', left: '-16px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            >
                                <img src="/btn_retour.png" alt="Retour" style={{ height: '55px', width: 'auto' }} />
                            </button>
                            <h2>{t('what_name')}</h2>
                            <div className="champ-bloc">
                                <div className="label-champ">{t('username')}</div>
                                <input
                                    type="text"
                                    placeholder={t('username_placeholder')}
                                    maxLength={20}
                                    value={pseudo}
                                    onChange={(e) => setPseudo(e.target.value)}
                                />
                            </div>
                            <img src="/logomsp.png" alt="logo" className="popup-logo" />
                        </div>
                    )}
                    {step === 2 && (
                        <div className="pseudo-popup-content">
                            <button
                                type="button"
                                onClick={() => setStep(step - 1)}
                                style={{ position: 'absolute', top: '12px', left: '-16px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            >
                                <img src="/btn_retour.png" alt="Retour" style={{ height: '55px', width: 'auto' }} />
                            </button>
                            <h2>{t('create_account')}</h2>
                            <div className="champ-bloc">
                                <div className="label-champ">{t('email')}</div>
                                <input
                                    type="email"
                                    placeholder={t('email_placeholder')}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div className="champ-bloc" style={{ marginTop: '16px' }}>
                                <div className="label-champ">{t('password')}</div>
                                <input
                                    type="password"
                                    placeholder={t('password_placeholder')}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                            {error && <p style={{ color: 'red', fontSize: '13px', marginTop: '8px' }}>{error}</p>}
                            <img src="/logomsp.png" alt="logo" className="popup-logo" />
                        </div>
                    )}

                    <div className="carousel-select-btn-wrapper">
                        {!showLogin && (
                            <>
                                <button className="carousel-select-btn" type={step === 2 ? 'submit' : 'button'} onClick={handleNext}>
                                    <img src={step === 2 ? '/btn_termine.png' : '/btn.png'} alt="Suivant" />
                                    <span className="carousel-select-label">{step === 2 ? t('finish') : t('next')}</span>
                                </button>
                                <img className="bling-btn" src="/blingstar.png" style={{ width: '20px', top: '-8px', right: '-4px' }} alt="" />
                                <img className="bling-btn" src="/blingstar.png" style={{ width: '13px', top: '-18px', right: '14px' }} alt="" />
                            </>
                        )}
                        {step === 0 && !showLogin && (
                            <div className="login-hint-box">
                                <span>{t('login_hint')}</span>
                                <button type="button" className="login-hint-link" onClick={() => setShowLogin(true)}>
                                    {t('login_title')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {showLogin && (
                    <div className="login-popup-overlay">
                        <div className="pseudo-popup-content">
                            <button
                                type="button"
                                onClick={() => setShowLogin(false)}
                                style={{ position: 'absolute', top: '12px', left: '-16px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            >
                                <img src="/btn_retour.png" alt="Retour" style={{ height: '55px', width: 'auto' }} />
                            </button>
                            <h2>{t('login_title')}</h2>
                            <div className="champ-bloc">
                                <div className="label-champ">{t('email')}</div>
                                <input
                                    type="email"
                                    placeholder={t('email_placeholder')}
                                    value={loginEmail}
                                    onChange={(e) => setLoginEmail(e.target.value)}
                                />
                            </div>
                            <div className="champ-bloc" style={{ marginTop: '16px' }}>
                                <div className="label-champ">{t('password')}</div>
                                <input
                                    type="password"
                                    placeholder={t('password_placeholder')}
                                    value={loginPassword}
                                    onChange={(e) => setLoginPassword(e.target.value)}
                                />
                            </div>
                            {loginError && <p style={{ color: 'red', fontSize: '13px', marginTop: '8px' }}>{loginError}</p>}
                            <img src="/logomsp.png" alt="logo" className="popup-logo" />
                            <button className="carousel-select-btn" type="button" onClick={handleLogin} style={{ marginTop: '16px' }}>
                                <img src="/btn_termine.png" alt={t('login_title')} />
                            </button>
                            <button
                                type="button"
                                className="submit-button"
                                style={{ marginTop: '12px' }}
                                onClick={async () => {
                                    try {
                                        const data = await api.get<{ available: boolean }>(API_ROUTES.OAUTH_42.STATUS);
                                        if (data.available) window.location.href = API_ROUTES.OAUTH_42.LOGIN;
                                        else setLoginError(t('error_42'));
                                    } catch {
                                        setLoginError(t('error_42'));
                                    }
                                }}
                            >
                                {t('login_42')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </form>
    );
}
