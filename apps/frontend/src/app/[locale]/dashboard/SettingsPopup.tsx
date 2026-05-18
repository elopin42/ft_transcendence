'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import PopupShell from '@/components/ui/PopupShell';
import IconButton from '@/components/ui/IconButton';
import { hotpink, babyblue } from '@/lib/colors';

type Page = 'home' | 'compte' | 'securite' | 'langue';

const LANGUES = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
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

function ComptePage() {
    const t = useTranslations('settings');
    const tAuth = useTranslations('auth');
    const { user } = useAuth();
    const [login, setLogin] = useState(user?.login ?? '');
    const [email, setEmail] = useState(user?.email ?? '');
    const [selected, setSelected] = useState(0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('avatar')}</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
                    {['🐱', '🐸', '🦊', '🐼', '🐧', '🦁'].map((emoji, i) => (
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
                            {emoji}
                        </div>
                    ))}
                </div>
            </div>
            <InputField label={tAuth('username')} value={login} onChange={setLogin} />
            <InputField label={tAuth('email')} value={email} onChange={setEmail} />
            <button onClick={() => {}} style={{
                marginTop: 'auto', borderRadius: 999, border: 'none',
                background: hotpink, color: '#fff', fontWeight: 800,
                fontSize: 14, padding: '10px 0', cursor: 'pointer', width: '100%',
            }}>
                {t('save')}
            </button>
        </div>
    );
}

function SecuritePage() {
    const t = useTranslations('settings');
    const [oldPwd, setOldPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [twofa, setTwofa] = useState(false);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
            <InputField label={t('current_password')} value={oldPwd} onChange={setOldPwd} type="password" />
            <InputField label={t('new_password')} value={newPwd} onChange={setNewPwd} type="password" />
            <InputField label={t('confirm_password')} value={confirmPwd} onChange={setConfirmPwd} type="password" />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: babyblue }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#333' }}>{t('two_fa')}</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{t('two_fa_desc')}</div>
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

            <button onClick={() => {}} style={{
                marginTop: 'auto', borderRadius: 999, border: 'none',
                background: hotpink, color: '#fff', fontWeight: 800,
                fontSize: 14, padding: '10px 0', cursor: 'pointer', width: '100%',
            }}>
                {t('save')}
            </button>
        </div>
    );
}

function LanguePage() {
    const t = useTranslations('settings');
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
            <button onClick={() => {}} style={{
                marginTop: 'auto', borderRadius: 999, border: 'none',
                background: hotpink, color: '#fff', fontWeight: 800,
                fontSize: 14, padding: '10px 0', cursor: 'pointer', width: '100%',
            }}>
                {t('save')}
            </button>
        </div>
    );
}

function HomePage({ onNavigate }: { onNavigate: (p: Page) => void }) {
    const t = useTranslations('settings');
    const tFooter = useTranslations('footer');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1, justifyContent: 'center' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    <button onClick={() => onNavigate('compte')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                        <img src="/btn_compte.png" alt={t('account')} draggable={false} style={{ height: 90, width: 'auto' }} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>{t('account')}</span>
                    </button>
                    <button onClick={() => onNavigate('securite')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                        <img src="/btn_securite.png" alt={t('security')} draggable={false} style={{ height: 90, width: 'auto' }} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>{t('security')}</span>
                    </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button onClick={() => onNavigate('langue')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                        <img src="/btn_langue.png" alt={t('language')} draggable={false} style={{ height: 90, width: 'auto' }} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>{t('language')}</span>
                    </button>
                </div>
            </div>

            <button style={{ background: 'none', border: 'none', cursor: 'pointer', margin: '0 auto 8px', display: 'flex' }}>
                <img src="/btn_deconect.png" alt="logout" draggable={false} style={{ height: 52, width: 'auto' }} />
            </button>

            <div style={{ textAlign: 'center', paddingBottom: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <a href="#" style={{ fontSize: 13, fontWeight: 700, color: '#4dd9e8', textDecoration: 'underline' }}>{tFooter('policy')}</a>
                <a href="#" style={{ fontSize: 13, fontWeight: 700, color: '#4dd9e8', textDecoration: 'underline' }}>{tFooter('privacy')}</a>
            </div>
        </div>
    );
}

export default function SettingsPopup({ onClose }: { onClose: () => void }) {
    const t = useTranslations('settings');
    const [page, setPage] = useState<Page>('home');

    const titles: Record<Page, string> = {
        home: t('title'),
        compte: t('account'),
        securite: t('security'),
        langue: t('language'),
    };

    const backBtn = page !== 'home' ? (
        <IconButton src="/btn_retour.png" alt="retour" onClick={() => setPage('home')} height={44} />
    ) : undefined;

    return (
        <PopupShell title={titles[page]} onClose={onClose} header={backBtn}>
            {page === 'home' && <HomePage onNavigate={setPage} />}
            {page === 'compte' && <ComptePage />}
            {page === 'securite' && <SecuritePage />}
            {page === 'langue' && <LanguePage />}
        </PopupShell>
    );
}
