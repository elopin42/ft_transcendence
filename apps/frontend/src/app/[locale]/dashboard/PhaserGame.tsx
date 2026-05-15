'use client';
import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { GameScene } from './GameScene';
import ChatBar from './ChatBar';
import FriendsPopup from './FriendsPopup';

export default function PhaserGame() {
    const gameDiv = useRef<HTMLDivElement>(null);
    const gRef = useRef<Phaser.Game | null>(null);
    const [friendsOpen, setFriendsOpen] = useState(false);

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

            <ChatBar gRef={gRef} />

            <button
                onClick={() => setFriendsOpen(o => !o)}
                style={{
                    position: 'absolute',
                    top: '2%',
                    left: '2%',
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: '#4dd9e8',
                    border: '3px solid #fff',
                    cursor: 'pointer',
                    fontSize: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                    zIndex: 10,
                }}
            >
                👥
            </button>

            {friendsOpen && <FriendsPopup onClose={() => setFriendsOpen(false)} />}

            <style>{`
                @keyframes blink-cursor {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
            `}</style>
        </div>
    );
}
