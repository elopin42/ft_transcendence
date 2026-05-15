'use client';
import { useRef, useState } from 'react';

type Msg = { id: number; who: string; txt: string };
type Conv = { id: number; login: string; avatar: string | null; lastMsg: string; online: boolean };

const teal = '#4dd9e8';
const hotpink = '#e0358b';
const babyblue = '#b8eef5';

const convs: Conv[] = [
    { id: 1, login: 'nass42', avatar: null, lastMsg: 'gg wp !', online: true },
    { id: 2, login: 'mouna', avatar: null, lastMsg: 'tu joues ce soir ?', online: true },
    { id: 3, login: 'alex', avatar: null, lastMsg: 'rip le tournoi lol', online: false },
    { id: 4, login: 'julia', avatar: null, lastMsg: 'viens sur ma map', online: true },
    { id: 5, login: 'marco', avatar: null, lastMsg: '...', online: false },
];

const fakeHistory: Record<number, Msg[]> = {
    1: [
        { id: 1, who: 'nass42', txt: 'alors ce match ?' },
        { id: 2, who: 'Moi', txt: 'gg wp !' },
    ],
    2: [
        { id: 1, who: 'mouna', txt: 'tu joues ce soir ?' },
    ],
    3: [
        { id: 1, who: 'alex', txt: 'rip le tournoi lol' },
        { id: 2, who: 'Moi', txt: 'ouais grave...' },
    ],
    4: [
        { id: 1, who: 'julia', txt: 'viens sur ma map' },
    ],
    5: [
        { id: 1, who: 'marco', txt: '...' },
    ],
};

function Avatar({ login, avatar, size = 48 }: { login: string; avatar: string | null; size?: number }) {
    return (
        <div style={{
            width: size, height: size, borderRadius: 14, flexShrink: 0,
            background: avatar ? `url(${avatar}) center/cover` : '#e8eaed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
        }}>
            {!avatar && <span style={{ fontSize: size * 0.38, color: '#aaa', fontWeight: 700 }}>{login[0].toUpperCase()}</span>}
        </div>
    );
}

function ConvList({ onSelect }: { onSelect: (c: Conv) => void }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', flex: 1 }}>
            {convs.map(c => {
                const truncated = c.lastMsg.length > 10 ? c.lastMsg.slice(0, 10) + '...' : c.lastMsg;
                return (
                    <div
                        key={c.id}
                        onClick={() => onSelect(c)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 8px', borderRadius: 12,
                            background: '#fff', cursor: 'pointer',
                            borderBottom: '1px solid #f0f0f0',
                        }}
                    >
                        <Avatar login={c.login} avatar={c.avatar} size={52} />
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontWeight: 800, fontSize: 14, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.login}</div>
                            <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>{truncated}</div>
                            <div style={{ fontSize: 11, color: teal, marginTop: 2, fontWeight: 600 }}>18:27</div>
                        </div>
                        <span style={{ color: '#b0b8c1', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>›</span>
                    </div>
                );
            })}
        </div>
    );
}

function ConvChat({ conv }: { conv: Conv }) {
    const [msgs, setMsgs] = useState<Msg[]>(fakeHistory[conv.id] ?? []);
    const [val, setVal] = useState('');
    const idRef = useRef(100);
    const bottomRef = useRef<HTMLDivElement>(null);

    const send = () => {
        const t = val.trim();
        if (!t) return;
        setMsgs(prev => [...prev, { id: idRef.current++, who: 'Moi', txt: t }]);
        setVal('');
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

            {/* messages */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
                {msgs.map(m => {
                    const isMe = m.who === 'Moi';
                    return (
                        <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 2 }}>
                            {/* pas de nom en DM, on sait déjà avec qui on parle */}
                            <div style={{
                                background: isMe ? hotpink : '#f0f0f0',
                                borderRadius: isMe ? '12px 12px 0 12px' : '0 12px 12px 12px',
                                padding: '6px 12px',
                                maxWidth: '80%',
                                fontSize: 13,
                                fontWeight: 700,
                                color: isMe ? '#fff' : '#111',
                                wordBreak: 'break-word',
                                lineHeight: 1.4,
                                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                            }}>
                                {m.txt}
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* input */}
            <div style={{ marginTop: 10, flexShrink: 0 }}>
                <input
                    value={val}
                    onChange={e => setVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') send(); }}
                    placeholder="Dis quelque chose..."
                    style={{
                        width: '100%', borderRadius: 999, border: 'none',
                        padding: '10px 16px', background: babyblue,
                        fontSize: 13, fontWeight: 700, color: '#333',
                        outline: 'none', boxSizing: 'border-box',
                    }}
                />
            </div>
        </div>
    );
}

export default function ChatPopup({ onClose }: { onClose: () => void }) {
    const [selected, setSelected] = useState<Conv | null>(null);

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
                    {selected ? (
                        <>
                            <button
                                onClick={() => setSelected(null)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                            >
                                <img src="/btn_retour.png" alt="retour" draggable={false} style={{ height: 44, width: 'auto', display: 'block' }} />
                            </button>
                            <span style={{ fontWeight: 800, fontSize: 17, color: '#fff', flex: 1, textAlign: 'center', fontFamily: '"Segoe UI", sans-serif' }}>
                                {selected.login}
                            </span>
                        </>
                    ) : (
                        <span style={{ fontWeight: 800, fontSize: 18, color: '#fff', flex: 1, textAlign: 'center', fontFamily: '"Segoe UI", sans-serif' }}>
                            Conversations
                        </span>
                    )}
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', marginLeft: 'auto' }}
                        onMouseDown={e => (e.currentTarget.style.opacity = '0.5')}
                        onMouseUp={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                        <img src="/btn_cross.png" alt="fermer" draggable={false} style={{ height: 44, width: 'auto', display: 'block' }} />
                    </button>
                </div>

                {/* contenu */}
                <div style={{ padding: '14px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {selected
                        ? <ConvChat conv={selected} />
                        : <ConvList onSelect={setSelected} />
                    }
                </div>
            </div>
        </div>
    );
}
