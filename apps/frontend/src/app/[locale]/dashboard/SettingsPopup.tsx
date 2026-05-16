'use client';
import { useState } from 'react';

const teal = '#4dd9e8';
const hotpink = '#e0358b';
const babyblue = '#b8eef5';

type Page = 'home' | 'compte' | 'securite' | 'langue';

const avatars = [
    '/avatars/av1.png',
    '/avatars/av2.png',
    '/avatars/av3.png',
    '/avatars/av4.png',
    '/avatars/av5.png',
    '/avatars/av6.png',
];

function InputField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                style={{
                    borderRadius: 10, border: '2px solid ' + babyblue,
                    padding: '8px 12px', fontSize: 13, fontWeight: 600,
                    color: '#333', outline: 'none', background: '#fff',
                }}
            />
        </div>
    );
}

function SaveBtn({ onClick }: { onClick: () => void }) {
    return (
        <button onClick={onClick} style={{
            marginTop: 'auto', borderRadius: 999, border: 'none',
            background: hotpink, color: '#fff', fontWeight: 800,
            fontSize: 14, padding: '10px 0', cursor: 'pointer', width: '100%',
        }}>
            Sauvegarder
        </button>
    );
}

function ComptePage() {
    const [login, setLogin] = useState('nass42');
    const [email, setEmail] = useState('nass@42.fr');
    const [selected, setSelected] = useState(0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>Avatar</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
                    {avatars.map((_av, i) => (
                        <div
                            key={i}
                            onClick={() => setSelected(i)}
                            style={{
                                width: '100%', aspectRatio: '1', borderRadius: 10,
                                background: babyblue, cursor: 'pointer',
                                border: selected === i ? '3px solid ' + hotpink : '3px solid transparent',
                                overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 22,
                            }}
                        >
                            {['🐱', '🐸', '🦊', '🐼', '🐧', '🦁'][i]}
                        </div>
                    ))}
                </div>
            </div>
            <InputField label="Nom d'utilisateur" value={login} onChange={setLogin} />
            <InputField label="Email" value={email} onChange={setEmail} />
            <SaveBtn onClick={() => {}} />
        </div>
    );
}

function SecuritePage() {
    const [oldPwd, setOldPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [twofa, setTwofa] = useState(false);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
            <InputField label="Mot de passe actuel" value={oldPwd} onChange={setOldPwd} type="password" />
            <InputField label="Nouveau mot de passe" value={newPwd} onChange={setNewPwd} type="password" />
            <InputField label="Confirmer" value={confirmPwd} onChange={setConfirmPwd} type="password" />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: babyblue }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#333' }}>Double authentification</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>2FA par application TOTP</div>
                </div>
                <div
                    onClick={() => setTwofa(v => !v)}
                    style={{
                        width: 44, height: 24, borderRadius: 999,
                        background: twofa ? hotpink : '#ccc',
                        cursor: 'pointer', position: 'relative',
                        transition: 'background 0.2s', flexShrink: 0,
                    }}
                >
                    <div style={{
                        position: 'absolute', top: 3,
                        left: twofa ? 23 : 3,
                        width: 18, height: 18, borderRadius: '50%',
                        background: '#fff', transition: 'left 0.2s',
                    }} />
                </div>
            </div>

            <SaveBtn onClick={() => {}} />
        </div>
    );
}

const LANGUES = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
];

function LanguePage() {
    const [selected, setSelected] = useState('fr');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
            {LANGUES.map(l => (
                <div
                    key={l.code}
                    onClick={() => setSelected(l.code)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '12px 16px', borderRadius: 12,
                        background: babyblue, cursor: 'pointer',
                        border: selected === l.code ? '3px solid ' + hotpink : '3px solid transparent',
                    }}
                >
                    <span style={{ fontSize: 32 }}>{l.flag}</span>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#333' }}>{l.label}</span>
                    {selected === l.code && (
                        <span style={{ marginLeft: 'auto', color: hotpink, fontWeight: 800, fontSize: 18 }}>✓</span>
                    )}
                </div>
            ))}
            <SaveBtn onClick={() => {}} />
        </div>
    );
}

function HomePage({ onNavigate }: { onNavigate: (p: Page) => void }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1, justifyContent: 'center' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    <button onClick={() => onNavigate('compte')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                        <img src="/btn_compte.png" alt="Mon compte" draggable={false} style={{ height: 90, width: 'auto' }} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>Mon compte</span>
                    </button>
                    <button onClick={() => onNavigate('securite')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                        <img src="/btn_securite.png" alt="Sécurité" draggable={false} style={{ height: 90, width: 'auto' }} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>Sécurité</span>
                    </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button onClick={() => onNavigate('langue')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                        <img src="/btn_langue.png" alt="Langue" draggable={false} style={{ height: 90, width: 'auto' }} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>Langue</span>
                    </button>
                </div>
            </div>

            <button style={{ background: 'none', border: 'none', cursor: 'pointer', margin: '0 auto 8px', display: 'flex' }}>
                <img src="/btn_deconect.png" alt="Déconnexion" draggable={false} style={{ height: 52, width: 'auto' }} />
            </button>

            <div style={{ textAlign: 'center', paddingBottom: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <a href="#" style={{ fontSize: 13, fontWeight: 700, color: teal, textDecoration: 'underline' }}>Conditions générales</a>
                <a href="#" style={{ fontSize: 13, fontWeight: 700, color: teal, textDecoration: 'underline' }}>Politique de confidentialité</a>
            </div>
        </div>
    );
}

export default function SettingsPopup({ onClose }: { onClose: () => void }) {
    const [page, setPage] = useState<Page>('home');

    const titles: Record<Page, string> = {
        home: 'Options de jeu',
        compte: 'Mon compte',
        securite: 'Sécurité',
        langue: 'Langue',
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }} onClick={onClose}>
            <div
                style={{
                    position: 'absolute',
                    top: '22%',
                    right: '2%',
                    width: 340,
                    height: 480,
                    borderRadius: 20,
                    overflow: 'hidden',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#fff',
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ background: teal, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    {page !== 'home' && (
                        <button
                            onClick={() => setPage('home')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                        >
                            <img src="/btn_retour.png" alt="retour" draggable={false} style={{ height: 44, width: 'auto', display: 'block' }} />
                        </button>
                    )}
                    <span style={{ fontWeight: 800, fontSize: 18, color: '#fff', flex: 1, textAlign: 'center', fontFamily: '"Segoe UI", sans-serif' }}>
                        {titles[page]}
                    </span>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                        onMouseDown={e => (e.currentTarget.style.opacity = '0.5')}
                        onMouseUp={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                        <img src="/btn_cross.png" alt="fermer" draggable={false} style={{ height: 44, width: 'auto', display: 'block' }} />
                    </button>
                </div>

                <div style={{ padding: '14px', flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                    {page === 'home' && <HomePage onNavigate={setPage} />}
                    {page === 'compte' && <ComptePage />}
                    {page === 'securite' && <SecuritePage />}
                    {page === 'langue' && <LanguePage />}
                </div>
            </div>
        </div>
    );
}
