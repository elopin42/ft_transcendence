'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import './setup.css';

const characters = [
  { id: 'nass', name: 'Nass', image: '/character/nass/nass-front.png' },
];

const headlines = [
  'Qui souhaites-tu être ?',
  'Choisis ton nom de star !',
  'Crée ton compte !',
];

export default function RegisterPage() {
    const [index, setIndex] = useState(0);
    const [step, setStep] = useState(0); // 0: avatar, 1: pseudo, 2: compte
    const [pseudo, setPseudo] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showLogin, setShowLogin] = useState(false);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const router = useRouter();
    const prev = () => setIndex((i) => (i - 1 + characters.length) % characters.length);
    const next = () => setIndex((i) => (i + 1) % characters.length);
    const current = characters[index];

    const handleNext = () => {
        if (step < 2) setStep(step + 1);
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password, login: pseudo }),
        });
        const data = await response.json();
        if (response.ok) {
            window.location.href = '/dashboard';
        } else {
            setError(data.message || 'Erreur de connexion');
        }
    }

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setLoginError('');
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email: loginEmail, password: loginPassword }),
        });
        const data = await response.json();
        if (response.ok) {
            router.push('/dashboard');
        } else {
            setLoginError(data.message || 'Erreur de connexion');
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
                        <button
                            type="button"
                            onClick={() => setStep(step - 1)}
                            style={{ position: 'absolute', top: '12px', left: '-16px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                            <img src="/btn_retour.png" alt="Retour" style={{ height: '55px', width: 'auto' }} />
                        </button>
                        <h2>Quel sera ton nom ?</h2>
                        <div className="champ-bloc">
                            <div className="label-champ">Nom d'utilisateur</div>
                            <input
                                type="text"
                                placeholder="Saisis ton nom d'utilisateur"
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
                        <h2>Crée ton compte !</h2>
                        <div className="champ-bloc">
                            <div className="label-champ">Email</div>
                            <input
                                type="email"
                                placeholder="Saisis ton email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="champ-bloc" style={{ marginTop: '16px' }}>
                            <div className="label-champ">Mot de passe</div>
                            <input
                                type="password"
                                placeholder="Saisis ton mot de passe"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <img src="/logomsp.png" alt="logo" className="popup-logo" />
                    </div>
                )}

                <div className="carousel-select-btn-wrapper">
                    {!showLogin && (
                        <>
                            <button className="carousel-select-btn" type={step === 2 ? 'submit' : 'button'} onClick={handleNext}>
                                <img src={step === 2 ? '/btn_termine.png' : '/btn.png'} alt="Suivant" />
                                <span className="carousel-select-label">{step === 2 ? 'Terminer' : 'Suivant'}</span>
                            </button>
                            <img className="bling-btn" src="/blingstar.png" style={{ width: '20px', top: '-8px', right: '-4px' }} alt="" />
                            <img className="bling-btn" src="/blingstar.png" style={{ width: '13px', top: '-18px', right: '14px' }} alt="" />
                        </>
                    )}
                    {step === 0 && !showLogin && (
                        <div className="login-hint-box">
                            <span>Reste proche de tes amis ! Connecte-toi avec le même utilisateur.</span>
                            <button type="button" className="login-hint-link" onClick={() => setShowLogin(true)}>Connexion</button>
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
                        <h2>Connexion</h2>
                        <div className="champ-bloc">
                            <div className="label-champ">Email</div>
                            <input
                                type="email"
                                placeholder="Saisis ton email"
                                value={loginEmail}
                                onChange={(e) => setLoginEmail(e.target.value)}
                            />
                        </div>
                        <div className="champ-bloc" style={{ marginTop: '16px' }}>
                            <div className="label-champ">Mot de passe</div>
                            <input
                                type="password"
                                placeholder="Saisis ton mot de passe"
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                            />
                        </div>
                        {loginError && <p style={{ color: 'red', fontSize: '13px', marginTop: '8px' }}>{loginError}</p>}
                        <img src="/logomsp.png" alt="logo" className="popup-logo" />
                        <button className="carousel-select-btn" type="button" onClick={handleLogin} style={{ marginTop: '16px' }}>
                            <img src="/btn_termine.png" alt="Se connecter" />
                        </button>
                    </div>
                </div>
            )}
        </div>
        </form>
    );
}
