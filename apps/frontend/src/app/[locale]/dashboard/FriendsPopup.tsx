'use client';
import { useState } from 'react';
import { PlayerBase } from '@ftt/shared/game';
import { ROUTES } from '@/config/routes';
import { useRouter } from '@/config/navigation';

type Friend = { id: number; login: string; avatar: string | null; online: boolean };
type FriendRequest = { id: number; login: string; avatar: string | null; direction: 'in' | 'out' };
type UserResult = { id: number; login: string; avatar: string | null };

const friends: Friend[] = [
    { id: 1, login: 'nass42', avatar: null, online: true },
    { id: 2, login: 'mouna', avatar: null, online: false },
    { id: 3, login: 'alex', avatar: null, online: true },
    { id: 4, login: 'julia', avatar: null, online: true },
    { id: 5, login: 'marco', avatar: null, online: false },
    { id: 6, login: 'sara', avatar: null, online: true },
];

const reqs: FriendRequest[] = [
    { id: 10, login: 'pierre', avatar: null, direction: 'in' },
    { id: 11, login: 'lea', avatar: null, direction: 'out' },
];

const teal = '#4dd9e8';
const hotpink = '#e0358b';
const babyblue = '#b8eef5';

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

function Players({ onlinePlayers }: { onlinePlayers: PlayerBase[] }) {
    const router = useRouter();

const [sub, setSub] = useState<'all' | 'online'>('all');

return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, overflowY: 'auto' }}>
            {onlinePlayers.map(f => (
                <div key={f.id} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: babyblue, cursor: 'pointer', aspectRatio: '1' }}>
                    {/* <UserAvatar login={f.pseudo}  size={90} /> */}
                    <div style={{ position: 'absolute', top: 6, right: 6, width: 12, height: 12, borderRadius: '50%', background: '#4cce6e', border: '2px solid #fff'}} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: 11, fontWeight: 700, textAlign: 'center', padding: '3px 2px', wordBreak: 'break-all' }}>
                        {f.pseudo}
                    </div>
                    <button
                        className="w-full text-left px-4 py-2 rounded-xl hover:bg-[rgb(241,16,255)] hover:text-white transition-all duration-150 text-gray-700 font-medium"
                        style={{cursor: 'pointer'}}
                        onClick={() => {
                            localStorage.setItem('invite_player', f.pseudo);
                            router.push(ROUTES.GAME);
                            // onInvitePlayer(player.id);
                            // setShowInviteModal(false);
                        }}
                    >
                      invite
                    </button>

                </div>
            ))}
        </div>
    </div>
    );
}


function Amis() {
    const [sub, setSub] = useState<'all' | 'online'>('all');
    const list = sub === 'online' ? friends.filter(f => f.online) : friends;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexShrink: 0 }}>
                <TabButton label="Mes Amis" active={sub === 'all'} onClick={() => setSub('all')} />
                <TabButton label="En ligne" active={sub === 'online'} onClick={() => setSub('online')} />
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
    const [sub, setSub] = useState<'in' | 'out'>('in');
    const list = reqs.filter(r => r.direction === sub);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexShrink: 0 }}>
                <TabButton label="Reçues" active={sub === 'in'} onClick={() => setSub('in')} />
                <TabButton label="Envoyées" active={sub === 'out'} onClick={() => setSub('out')} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
                {list.length === 0 && <p style={{ color: '#aaa', textAlign: 'center', marginTop: 40 }}>Aucune demande</p>}
                {list.map(r => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 12, background: babyblue }}>
                        <UserAvatar login={r.login} avatar={r.avatar} size={48} />
                        <span style={{ fontWeight: 700, flex: 1, color: '#333' }}>{r.login}</span>
                        {sub === 'in' && (
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button style={{ background: hotpink, color: '#fff', border: 'none', borderRadius: 999, padding: '5px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>✓</button>
                                <button style={{ background: '#ccc', color: '#fff', border: 'none', borderRadius: 999, padding: '5px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>✗</button>
                            </div>
                        )}
                        {sub === 'out' && <span style={{ fontSize: 12, color: '#888' }}>En attente</span>}
                    </div>
                ))}
            </div>
        </div>
    );
}

function Recherche() {
    const [q, setQ] = useState('');
    const results: UserResult[] = q.length > 0
        ? [{ id: 20, login: 'user42', avatar: null }, { id: 21, login: 'userTest', avatar: null }].filter(u => u.login.toLowerCase().includes(q.toLowerCase()))
        : [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexShrink: 0 }}>
                <input
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    placeholder="Rechercher un utilisateur"
                    style={{ flex: 1, borderRadius: 999, border: 'none', padding: '10px 18px', background: babyblue, fontSize: 14, color: '#333', outline: 'none', fontWeight: 600 }}
                />
                <button style={{ width: 40, height: 40, borderRadius: '50%', background: hotpink, border: 'none', cursor: 'pointer', fontSize: 18, flexShrink: 0, color: '#fff' }}>🔍</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
                {results.map(u => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 12, background: babyblue }}>
                        <UserAvatar login={u.login} avatar={u.avatar} size={48} />
                        <span style={{ fontWeight: 700, flex: 1, color: '#333' }}>{u.login}</span>
                        <button style={{ background: hotpink, color: '#fff', border: 'none', borderRadius: 999, padding: '5px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>+ Ami</button>
                    </div>
                ))}
            </div>
        </div>
    );
}

type Tab = 'Players' | 'amis' | 'demandes' | 'recherche';

export default function FriendsPopup({ onClose, onlinePlayers }: { onClose: () => void; onlinePlayers: PlayerBase[] }) {
    const [tab, setTab] = useState<Tab>('amis');

    const tabs: { key: Tab; icon: string }[] = [
        { key: 'Players', icon: '👥' },
        { key: 'amis', icon: '👥' },
        { key: 'demandes', icon: '🤝' },
        { key: 'recherche', icon: '🔎' },
    ];

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
                <div style={{ background: teal, padding: '10px 14px 0 14px', display: 'flex', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)} style={{
                            width: 50, height: 50, borderRadius: '12px 12px 0 0', border: 'none', cursor: 'pointer', fontSize: 22,
                            background: tab === t.key ? '#fff' : 'rgba(255,255,255,0.25)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: tab === t.key ? 0 : -4,
                        }}>
                            {t.icon}
                        </button>
                    ))}
                    <div style={{ flex: 1 }} />
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseDown={e => (e.currentTarget.style.opacity = '0.5')}
                        onMouseUp={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                        <img src="/btn_cross.png" alt="fermer" draggable={false} style={{ height: 44, width: 'auto', display: 'block' }} />
                    </button>
                </div>
                <div style={{ padding: '14px 14px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {tab === 'Players' && <Players onlinePlayers={onlinePlayers}/>}
                    {tab === 'amis' && <Amis />}
                    {tab === 'demandes' && <Demandes />}
                    {tab === 'recherche' && <Recherche />}
                </div>
            </div>
        </div>
    );
}
