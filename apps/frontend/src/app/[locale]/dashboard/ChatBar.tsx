'use client';
import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { GameScene } from './GameScene';

type Msg = { id: number; who: string; txt: string };

export default function ChatBar({ gRef }: { gRef: React.RefObject<Phaser.Game | null> }) {
    const iRef = useRef<HTMLInputElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const spanRef = useRef<HTMLSpanElement>(null);

    const [inputValue, setInputValue] = useState('');
    const [focus, setFocus] = useState(false);
    const [open, setOpen] = useState(false);
    const [msgs, setMsgs] = useState<Msg[]>([]);
    const [ov, setOv] = useState(false);
    const idRef = useRef(0);

    useEffect(() => {
        const w = wrapRef.current;
        const s = spanRef.current;
        if (!w || !s) return;
        setOv(s.scrollWidth > w.clientWidth);
    }, [inputValue]);

    useEffect(() => {
        if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [msgs, open]);

    const send = () => {
        const t = inputValue.trim();
        if (!t) return;
        setMsgs(prev => [...prev, { id: idRef.current++, who: 'Moi', txt: t }]);
        setInputValue('');
        iRef.current?.focus();
        const scene = gRef.current?.scene.scenes[0] as GameScene | undefined;
        scene?.popChat(t);
    };

    return (
        <div
            style={{
                position: 'absolute',
                bottom: '3.5%',
                left: '2%',
                width: '28%',
                fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                isolation: 'isolate' as const,
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    height: open ? '28vw' : '0',
                    overflow: 'hidden',
                    transition: 'height 0.35s ease',
                    zIndex: 0,
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        width: '100%',
                        height: '28vw',
                        background: 'rgba(0,0,0,0.18)',
                        backdropFilter: 'blur(2px)',
                        borderRadius: '12px 12px 0 0',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '10px 8px 50% 8px',
                        boxSizing: 'border-box',
                        gap: '8px',
                    }}
                >
                    {msgs.map(m => (
                        <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                            <span style={{ fontSize: 'clamp(8px, 0.9vw, 12px)', color: '#1e90ff', fontWeight: 'bold', paddingLeft: '6px' }}>
                                {m.who}
                            </span>
                            <div style={{
                                background: '#fff',
                                borderRadius: '0 12px 12px 12px',
                                padding: '5px 10px',
                                maxWidth: '90%',
                                fontSize: 'clamp(10px, 1.1vw, 15px)',
                                fontWeight: '700',
                                color: '#111',
                                wordBreak: 'break-word',
                                lineHeight: 1.4,
                                boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                            }}>
                                {m.txt}
                            </div>
                        </div>
                    ))}
                    <div ref={bottomRef} />
                </div>
            </div>

            <div style={{ position: 'relative', zIndex: 1 }}>
                <div
                    style={{ width: '100%', position: 'relative', display: 'flex', alignItems: 'center', cursor: 'text' }}
                    onClick={() => iRef.current?.focus()}
                >
                    <img
                        src="/zone_text.png"
                        alt=""
                        draggable={false}
                        style={{ width: '100%', height: 'auto', display: 'block', userSelect: 'none', pointerEvents: 'none' }}
                    />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
                        <input
                            ref={iRef}
                            value={inputValue}
                            maxLength={150}
                            onChange={e => setInputValue(e.target.value)}
                            onFocus={() => setFocus(true)}
                            onBlur={() => setFocus(false)}
                            onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') send(); }}
                            onKeyUp={e => e.stopPropagation()}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                width: '100%',
                                height: '100%',
                                opacity: 0,
                                cursor: 'text',
                                border: 'none',
                                background: 'transparent',
                                outline: 'none',
                                caretColor: 'transparent',
                                zIndex: 1,
                            }}
                        />
                        <div ref={wrapRef} style={{
                            pointerEvents: 'none',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: ov ? 'flex-end' : 'flex-start',
                            paddingLeft: '6%',
                            paddingRight: '18%',
                            width: '100%',
                            height: '100%',
                            fontSize: 'clamp(10px, 1.4vw, 18px)',
                            fontWeight: '700',
                            userSelect: 'none',
                            boxSizing: 'border-box',
                            overflow: 'hidden',
                        }}>
                            {inputValue.length === 0 ? (
                                <span style={{ color: '#2edee4', position: 'relative', fontWeight: '700', whiteSpace: 'nowrap' }}>
                                    {focus && (
                                        <span style={{
                                            position: 'absolute',
                                            left: 0,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            display: 'inline-block',
                                            width: '2px',
                                            height: '1.1em',
                                            backgroundColor: '#000',
                                            animation: 'blink-cursor 1s step-start infinite',
                                        }} />
                                    )}
                                    {'Dis quelque chose...'}
                                </span>
                            ) : (
                                <span ref={spanRef} style={{ color: '#000', position: 'relative', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                    {inputValue}
                                    {focus && (
                                        <span style={{
                                            display: 'inline-block',
                                            width: '2px',
                                            height: '1.1em',
                                            backgroundColor: '#000',
                                            marginLeft: '1px',
                                            animation: 'blink-cursor 1s step-start infinite',
                                            verticalAlign: 'middle',
                                        }} />
                                    )}
                                </span>
                            )}
                        </div>

                        <button
                            onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
                            style={{
                                position: 'absolute',
                                right: '6%',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                zIndex: 2,
                                height: '55%',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            <img
                                src="/ouvrir_chat.png"
                                alt=""
                                draggable={false}
                                style={{
                                    height: '100%',
                                    width: 'auto',
                                    opacity: open ? 0.75 : 1,
                                    transition: 'opacity 0.2s',
                                    userSelect: 'none',
                                }}
                            />
                        </button>

                        <div style={{
                            position: 'absolute',
                            bottom: '18%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontSize: 'clamp(7px, 0.8vw, 11px)',
                            color: '#2edee4',
                            fontWeight: '700',
                            pointerEvents: 'none',
                            userSelect: 'none',
                            whiteSpace: 'nowrap',
                        }}>
                            {inputValue.length}/150
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
