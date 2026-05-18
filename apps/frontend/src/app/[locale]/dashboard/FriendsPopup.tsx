'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import PopupShell from '@/components/ui/PopupShell';
import { hotpink, babyblue } from '@/lib/colors';

type Friend = { id: number; login: string; avatar: string | null; online: boolean };
type FriendRequest = { id: number; login: string; avatar: string | null; direction: 'in' | 'out' };
type UserResult = { id: number; login: string; avatar: string | null };

// TODO: brancher sur l'API friends quand le backend sera pret
const friends: Friend[] = [];
const reqs: FriendRequest[] = [];

function UserAvatar({ login, avatar, size = 72 }: { login: string; avatar: string | null; size?: number }) {
    return (
        <div style={{
            width: size, height: size, borderRadius: 12, flexShrink: 0,
            background: avatar ? `url(${avatar}) center/cover` : babyblue,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            overflow: 'hidden', position: 'relative',
        }}>
            {!avatar && <span style={{ fontSize: size * 0.35, color: '#fff', fontWeight: 700, paddingBottom: 6 }}>{login[0].toUpperCase()}</span>}
        </div>
    );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button onClick={onClick} style={{
            padding: '8px 20px', borderRadius: 999, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 14,
            background: active ? hotpink : babyblue,
            color: '#fff',
        }}>
            {label}
        </button>
    );
}

function Amis() {
    const t = useTranslations('friends');
    const [sub, setSub] = useState<'all' | 'online'>('all');
    const list = sub === 'online' ? friends.filter(f => f.online) : friends;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexShrink: 0 }}>
                <TabButton label={t('my_friends')} active={sub === 'all'} onClick={() => setSub('all')} />
                <TabButton label={t('online')} active={sub === 'online'} onClick={() => setSub('online')} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, overflowY: 'auto' }}>
                {list.map(f => (
                    <div key={f.id} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: babyblue, cursor: 'pointer', aspectRatio: '1' }}>
                        <UserAvatar login={f.login} avatar={f.avatar} size={90} />
                        {f.online && <div style={{ position: 'absolute', top: 6, right: 6, width: 12, height: 12, borderRadius: '50%', background: '#4cce6e', border: '2px solid #fff' }} />}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: 11, fontWeight: 700, textAlign: 'center', padding: '3px 2px', wordBreak: 'break-all' }}>
                            {f.login}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Demandes() {
    const t = useTranslations('friends');
    const [sub, setSub] = useState<'in' | 'out'>('in');
    const list = reqs.filter(r => r.direction === sub);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexShrink: 0 }}>
                <TabButton label={t('received')} active={sub === 'in'} onClick={() => setSub('in')} />
                <TabButton label={t('sent')} active={sub === 'out'} onClick={() => setSub('out')} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
                {list.length === 0 && <p style={{ color: '#aaa', textAlign: 'center', marginTop: 40 }}>{t('no_requests')}</p>}
                {list.map(r => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 12, background: babyblue }}>
                        <UserAvatar login={r.login} avatar={r.avatar} size={48} />
                        <span style={{ fontWeight: 700, flex: 1, color: '#333' }}>{r.login}</span>
                        {sub === 'in' && (
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button style={{ background: hotpink, color: '#fff', border: 'none', borderRadius: 999, padding: '5px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 16 }}>✓</button>
                                <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}>
                                    <img src="/btn_cross.png" alt="refuser" draggable={false} style={{ height: 32, width: 'auto' }} />
                                </button>
                            </div>
                        )}
                        {sub === 'out' && <span style={{ fontSize: 12, color: '#888' }}>{t('pending')}</span>}
                    </div>
                ))}
            </div>
        </div>
    );
}

function Recherche() {
    const t = useTranslations('friends');
    const [q, setQ] = useState('');
    // TODO: appeler GET /api/users?search=q quand l'endpoint sera dispo
    const results: UserResult[] = [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexShrink: 0 }}>
                <input
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    placeholder={t('search_placeholder')}
                    style={{ flex: 1, borderRadius: 999, border: 'none', padding: '10px 18px', background: babyblue, fontSize: 14, color: '#333', outline: 'none', fontWeight: 600 }}
                />
                <button style={{ width: 40, height: 40, borderRadius: '50%', background: hotpink, border: 'none', cursor: 'pointer', fontSize: 18, flexShrink: 0, color: '#fff', fontWeight: 700 }}>🔎</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
                {results.map(u => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 12, background: babyblue }}>
                        <UserAvatar login={u.login} avatar={u.avatar} size={48} />
                        <span style={{ fontWeight: 700, flex: 1, color: '#333' }}>{u.login}</span>
                        <button style={{ background: hotpink, color: '#fff', border: 'none', borderRadius: 999, padding: '5px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>{t('add')}</button>
                    </div>
                ))}
            </div>
        </div>
    );
}

type Tab = 'amis' | 'demandes' | 'recherche';

export default function FriendsPopup({ onClose }: { onClose: () => void }) {
    const [tab, setTab] = useState<Tab>('amis');

    const tabs: { key: Tab; label: string }[] = [
        { key: 'amis', label: '👥' },
        { key: 'demandes', label: '🤝' },
        { key: 'recherche', label: '🔎' },
    ];

    const tabHeader = (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
            {tabs.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                    width: 50, height: 50, borderRadius: '12px 12px 0 0', border: 'none', cursor: 'pointer', fontSize: 22,
                    background: tab === t.key ? '#fff' : 'rgba(255,255,255,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: tab === t.key ? 0 : -4,
                }}>
                    {t.label}
                </button>
            ))}
        </div>
    );

    return (
        <PopupShell title="" onClose={onClose} header={tabHeader}>
            {tab === 'amis' && <Amis />}
            {tab === 'demandes' && <Demandes />}
            {tab === 'recherche' && <Recherche />}
        </PopupShell>
    );
}
