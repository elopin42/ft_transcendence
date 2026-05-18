'use client';
import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import PopupShell from '@/components/ui/PopupShell';
import IconButton from '@/components/ui/IconButton';
import { hotpink, babyblue, teal } from '@/lib/colors';

type Msg = { id: number; who: string; txt: string; ts: string };
type Conv = { id: number; login: string; avatar: string | null; lastMsg: string; online: boolean };

// TODO: brancher sur l'API chat quand le backend sera pret
const convs: Conv[] = [];

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
                            <div style={{ fontSize: 11, color: teal, marginTop: 2, fontWeight: 600 }}>{c.online ? '●' : ''}</div>
                        </div>
                        <span style={{ color: '#b0b8c1', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>›</span>
                    </div>
                );
            })}
        </div>
    );
}

function ConvChat({ conv }: { conv: Conv }) {
    const t = useTranslations('chat');
    const { user } = useAuth();
    const me = user?.login ?? t('me');
    const [msgs, setMsgs] = useState<Msg[]>([]);
    const [val, setVal] = useState('');
    const idRef = useRef(0);
    const bottomRef = useRef<HTMLDivElement>(null);

    const send = () => {
        const txt = val.trim();
        if (!txt) return;
        const ts = new Date().toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });
        setMsgs(prev => [...prev, { id: idRef.current++, who: me, txt, ts }]);
        setVal('');
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
                {msgs.map(m => {
                    const isMe = m.who === me;
                    return (
                        <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 2 }}>
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
                            <span style={{ fontSize: 10, color: '#aaa' }}>{m.ts}</span>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            <div style={{ marginTop: 10, flexShrink: 0 }}>
                <input
                    value={val}
                    onChange={e => setVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') send(); }}
                    placeholder={t('placeholder')}
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
    const t = useTranslations('chat');
    const [selected, setSelected] = useState<Conv | null>(null);

    const backBtn = selected ? (
        <IconButton src="/btn_retour.png" alt="retour" onClick={() => setSelected(null)} height={44} />
    ) : undefined;

    return (
        <PopupShell title={selected ? selected.login : t('title')} onClose={onClose} header={backBtn}>
            {selected ? <ConvChat conv={selected} /> : <ConvList onSelect={setSelected} />}
        </PopupShell>
    );
}
