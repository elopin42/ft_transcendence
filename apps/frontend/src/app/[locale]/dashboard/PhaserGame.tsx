'use client';
import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { GameScene } from './GameScene';
import ChatBar from './ChatBar';
import FriendsPopup from './FriendsPopup';
import ChatPopup from './ChatPopup';

const playerName = 'nass42';

export default function PhaserGame() {
    const gameDiv = useRef<HTMLDivElement>(null);
    const gRef = useRef<Phaser.Game | null>(null);
    const [friendsOpen, setFriendsOpen] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);

    useEffect(() => {
        const g = new Phaser.Game({
            width: 1280,
            height: 720,
            parent: gameDiv.current!,
            scene: GameScene,
            physics: { default: 'arcade', arcade: { debug: false } },
            scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        });
        gRef.current = g;
        return () => { g.destroy(true); gRef.current = null; };
    }, []);

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
            <div ref={gameDiv} style={{ width: '100%', height: '100%' }} />

            {/* Barre du haut */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 90,
                background: 'rgba(0,0,0,0.38)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 18px',
                zIndex: 20,
                gap: 10,
            }}>
                <span style={{
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 17,
                    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                    letterSpacing: 0.5,
                    textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                }}>
                    {playerName}
                </span>

                <button
                    onClick={() => setChatOpen(o => !o)}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: 16,
                    }}
                    onMouseDown={e => (e.currentTarget.style.opacity = '0.5')}
                    onMouseUp={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                    <img src="/btn_chat.png" alt="chat" draggable={false} style={{ height: 56, width: 'auto', display: 'block' }} />
                </button>

                <button
                    onClick={() => setFriendsOpen(o => !o)}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    onMouseDown={e => (e.currentTarget.style.opacity = '0.5')}
                    onMouseUp={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                    <img src="/btn_friends.png" alt="amis" draggable={false} style={{ height: 56, width: 'auto', display: 'block' }} />
                </button>

                <button
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    onMouseDown={e => (e.currentTarget.style.opacity = '0.5')}
                    onMouseUp={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                    <img src="/btn_game.png" alt="jeu" draggable={false} style={{ height: 56, width: 'auto', display: 'block' }} />
                </button>

                <div style={{ flex: 1 }} />

                <button
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    onMouseDown={e => (e.currentTarget.style.opacity = '0.5')}
                    onMouseUp={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                    <img src="/btn_settings.png" alt="paramètres" draggable={false} style={{ height: 56, width: 'auto', display: 'block' }} />
                </button>
            </div>

            <ChatBar gRef={gRef} />

            {friendsOpen && <FriendsPopup onClose={() => setFriendsOpen(false)} />}
            {chatOpen && <ChatPopup onClose={() => setChatOpen(false)} />}

            <style>{`
                @keyframes blink-cursor {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
            `}</style>
        </div>
    );
}
