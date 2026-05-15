'use client';
import { useState } from 'react';

const teal = '#4dd9e8';

type Page = 'home' | 'compte' | 'securite' | 'deconect';

function HomePage({ onNavigate }: { onNavigate: (p: Page) => void }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, flex: 1, alignContent: 'center' }}>
                <button onClick={() => onNavigate('compte')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <img src="/btn_compte.png" alt="Mon compte" draggable={false} style={{ height: 90, width: 'auto' }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#333', textAlign: 'center' }}>Mon compte</span>
                </button>
                <button onClick={() => onNavigate('securite')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <img src="/btn_securite.png" alt="Sécurité" draggable={false} style={{ height: 90, width: 'auto' }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#333', textAlign: 'center' }}>Sécurité</span>
                </button>
            </div>

            <button onClick={() => onNavigate('deconect')} style={{ background: 'none', border: 'none', cursor: 'pointer', margin: '0 auto 8px', display: 'flex' }}>
                <img src="/btn_deconect.png" alt="Déconnexion" draggable={false} style={{ height: 52, width: 'auto' }} />
            </button>

            <div style={{ textAlign: 'center', paddingBottom: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <a href="#" style={{ fontSize: 13, fontWeight: 700, color: teal, textDecoration: 'underline' }}>Conditions générales</a>
                <a href="#" style={{ fontSize: 13, fontWeight: 700, color: teal, textDecoration: 'underline' }}>Politique de confidentialité</a>
            </div>
        </div>
    );
}

function PlaceholderPage({ title }: { title: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <span style={{ color: '#aaa', fontSize: 15, fontWeight: 700 }}>{title} — à venir</span>
        </div>
    );
}

export default function SettingsPopup({ onClose }: { onClose: () => void }) {
    const [page, setPage] = useState<Page>('home');

    const titles: Record<Page, string> = {
        home: 'Options de jeu',
        compte: 'Mon compte',
        securite: 'Sécurité',
        deconect: 'Déconnexion',
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
                {/* header */}
                <div style={{ background: teal, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    {page !== 'home' && (
                        <button
                            onClick={() => setPage('home')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#fff', fontSize: 22, fontWeight: 700, lineHeight: 1 }}
                        >←</button>
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

                {/* contenu */}
                <div style={{ padding: '14px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {page === 'home' && <HomePage onNavigate={setPage} />}
                    {page === 'compte' && <PlaceholderPage title="Mon compte" />}
                    {page === 'securite' && <PlaceholderPage title="Sécurité" />}
                    {page === 'deconect' && <PlaceholderPage title="Déconnexion" />}
                </div>
            </div>
        </div>
    );
}
