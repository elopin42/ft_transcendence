'use client';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/config/navigation';
import { ROUTES } from '@/config/routes';
import '@/styles/setup.css';


const characters = [
    { id: 'nass', name: 'Nass', image: '/character/nass/nass-front.png' },
];


export default function RegisterPage() {
    const t = useTranslations('auth');
    const { register } = useAuth(); // on recupere register du provider
    const [index, setIndex] = useState(0);
    const [step, setStep] = useState(0); // 0: avatar, 1: pseudo, 2: compte
    const [pseudo, setPseudo] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();
    const prev = () => setIndex((i) => (i - 1 + characters.length) % characters.length);
    const next = () => setIndex((i) => (i + 1) % characters.length);
    const current = characters[index];

    const headlines = [
        t('choose_character'),
        t('choose_name'),
        t('create_account')
    ];

    const handleNext = () => {
        if (step < 2) setStep(step + 1);
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        try {
            await register(email, password, pseudo); // plus de fetch ici
            router.push(ROUTES.DASHBOARD);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('error_login'));
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
                position: 'relative'
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
                            <img src="/logomsp.png" alt="logo" className="popup-logo" />
                        </div>
                    )}
                    <div className="carousel-select-btn-wrapper">
                        <button className="carousel-select-btn" type={step === 2 ? 'submit' : 'button'} onClick={handleNext}>
                            <img src={step === 2 ? '/btn_termine.png' : '/btn.png'} alt="Suivant" />
                            <span className="carousel-select-label">{step === 2 ? t('finish') : t('next')}</span>
                        </button>
                        <img className="bling-btn" src="/blingstar.png" style={{ width: '20px', top: '-8px', right: '-4px' }} alt="" />
                        <img className="bling-btn" src="/blingstar.png" style={{ width: '13px', top: '-18px', right: '14px' }} alt="" />
                    </div>
                    <Link href={ROUTES.AUTH}>{t('login_title')}</Link>
                </div>
            </div>
        </form>
    );
}
