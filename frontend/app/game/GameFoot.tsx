'use client';
import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { io } from 'socket.io-client';
import './game.css';

interface PlayerData {
    id: string;
    pseudo: string;
    x: number;
    y: number;
    win: number;
    pnumber: number;
    isMe: boolean;
}

class GameScene extends Phaser.Scene {
    player: Phaser.GameObjects.Sprite | null = null;
    cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    socket!: any;
    ballon: Phaser.GameObjects.Image | null = null;

    myPnumber = 0;
    timep = 0;
    otherPlayers = new Map<string, { sprite: Phaser.GameObjects.Sprite, ox: number, oy: number }>();
    onUpdatePlayers?: (players: PlayerData[], bal: { x: number, y: number }) => void;

    preload() {
        this.load.image('map', '/map.png');
        this.load.spritesheet('nass-frame', '/character/nass/nass-allframe-right.png', {
            frameWidth: 1760,
            frameHeight: 2412
        });
        this.load.image('nass-front', '/character/nass/nass-front.png');
    }

    create() {
        const map = this.add.image(0, 0, 'map').setOrigin(0, 0);
        this.scale.resize(map.width, map.height);
        this.cursors = this.input.keyboard!.createCursorKeys();

        const graphics = this.add.graphics();
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(20, 20, 20);
        graphics.generateTexture('bal', 40, 40);
        graphics.destroy();
        this.ballon = this.add.image(1340, 690, 'bal');

        this.socket = io('/gamefoot', {
            withCredentials: true,
        });

        this.socket.on('players', ({ players, bal }: { players: any[], bal: { x: number, y: number } }) => {
            const activeIds = new Set(players.map(p => p.id));
            
            // Cleanup disconnected
            this.otherPlayers.forEach((player, id) => {
                if (!activeIds.has(id)) {
                    player.sprite.destroy();
                    this.otherPlayers.delete(id);
                }
            });

            if (this.ballon) {
                this.ballon.setPosition(bal.x, bal.y);
            }

            const me = players.find(p => p.id === this.socket.id);
            if (me && !this.player) {
                this.myPnumber = me.pnumber;
                const mapWidth = this.scale.width;
                const startX = me.pnumber === 1 ? mapWidth * 0.12 : mapWidth * 0.88;
                this.player = this.add.sprite(startX, 660, 'nass-front').setScale(0.35);
                this.player.setFlipX(me.pnumber === 2);
            }

            players.forEach(p => {
                if (p.id === this.socket.id) return;

                if (!this.otherPlayers.has(p.id)) {
                    const sprite = this.add.sprite(p.x, p.y, 'nass-front').setScale(0.35);
                    this.otherPlayers.set(p.id, { sprite, ox: p.x, oy: p.y });
                } else {
                    const timeo = Date.now();
                    const entry = this.otherPlayers.get(p.id);
                    if (!entry) return;
                    
                    entry.sprite.setPosition(p.x, p.y);
                    const scale = Phaser.Math.Linear(0.15, 0.35, (p.y - 280) / (1150 - 280));
                    entry.sprite.setScale(scale);

                    if (timeo - this.timep > 50) {
                        this.timep = timeo;
                        if (p.x !== entry.ox || p.y !== entry.oy) {
                            entry.sprite.setFlipX(p.pnumber === 2);
                            entry.sprite.play('walk-right', true);
                        } else {
                            entry.sprite.stop();
                            entry.sprite.setTexture('nass-front');
                        }
                        entry.ox = p.x;
                        entry.oy = p.y;
                    }
                }
            });

            // Update React UI
            if (this.onUpdatePlayers) {
                const uiPlayers: PlayerData[] = players.map(p => {
                    const isMe = p.id === this.socket.id;
                    const scale = Phaser.Math.Linear(0.15, 0.35, (p.y - 280) / (1150 - 280));
                    const labelOffset = (2412 * scale) / 2 + 20;
                    
                    return {
                        id: p.id,
                        pseudo: p.pseudo,
                        x: p.x,
                        y: p.y,
                        win: p.win,
                        pnumber: p.pnumber,
                        isMe
                    };
                });
                this.onUpdatePlayers(uiPlayers, bal);
            }
        });

        this.anims.create({
            key: 'walk-right',
            frames: this.anims.generateFrameNumbers('nass-frame', { start: 2, end: 0 }),
            frameRate: 4,
            repeat: -1
        });
    }

    update() {
        if (!this.player) return;
        const speed = Phaser.Math.Linear(3, 7, (this.player.y - 250) / (1150 - 250));
        let moving = false;

        if (this.cursors.up.isDown) {
            this.player.y -= speed;
            moving = true;
        }
        if (this.cursors.down.isDown) {
            this.player.y += speed;
            moving = true;
        }
        
        if (moving) {
            this.player.play('walk-right', true);
        } else {
            this.player.stop();
            this.player.setTexture('nass-front');
        }

        this.player.x = Phaser.Math.Clamp(this.player.x, 50, 2680);
        this.player.y = Phaser.Math.Clamp(this.player.y, 225, 1150);
        const scale = Phaser.Math.Linear(0.15, 0.35, (this.player.y - 280) / (1150 - 280));
        this.player.setScale(scale);
        
        this.socket.emit('move', { x: this.player.x, y: this.player.y, scale: scale });

        // Force a UI update for local player movement smoothness
        if (this.onUpdatePlayers && this.socket.id) {
            // Optional: we could update the local player in state here
        }
    }

    start() {
        this.socket.emit('start');
    }
}

export default function GameFoot() {
    const ref = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);
    const [players, setPlayers] = useState<PlayerData[]>([]);
    const [ball, setBall] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const game = new Phaser.Game({
            width: 1280,
            height: 720,
            parent: ref.current!,
            scene: GameScene,
            transparent: true,
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
            },
        });
        gameRef.current = game;

        const checkScene = setInterval(() => {
            const activeScene = game.scene.scenes[0] as GameScene;
            if (activeScene) {
                activeScene.onUpdatePlayers = (p, b) => {
                    setPlayers(p);
                    setBall(b);
                };
                clearInterval(checkScene);
            }
        }, 100);

        return () => {
            clearInterval(checkScene);
            game.destroy(true);
        };
    }, []);

    const handleStart = () => {
        const scene = gameRef.current?.scene.scenes[0] as GameScene;
        if (scene) scene.start();
    };

    const getScreenPos = (worldX: number, worldY: number) => {
        if (!gameRef.current) return { x: 0, y: 0 };
        const game = gameRef.current;
        const scene = game.scene.scenes[0];
        if (!scene) return { x: 0, y: 0 };

        const cam = scene.cameras.main;
        
        // World to Camera (Internal resolution)
        const camX = (worldX - cam.scrollX) * cam.zoom;
        const camY = (worldY - cam.scrollY) * cam.zoom;

        // Internal to Display (Canvas pixels)
        // CRITICAL: use game.scale.width because we resized the game to the map size
        const displayScaleX = game.scale.displaySize.width / game.scale.width;
        const displayScaleY = game.scale.displaySize.height / game.scale.height;

        const canvas = game.canvas;
        const rect = canvas.getBoundingClientRect();

        return {
            x: rect.left + (camX * displayScaleX),
            y: rect.top + (camY * displayScaleY)
        };
    };

    const player1 = players.find(p => p.pnumber === 1);
    const player2 = players.find(p => p.pnumber === 2);

    return (
        <div style={{ width: '100vw', height: '100vh', backgroundColor: '#000', overflow: 'hidden' }}>
            <div ref={ref} style={{ width: '100%', height: '100%' }} />
            
            <div className="game-ui-container">
                <div className="score-board">
                    <div className="score-card">
                        <span className="name">{player1?.pseudo || 'Player 1'}</span>
                        <span className="value">{player1?.win ?? 0}</span>
                    </div>
                    <div className="score-card" style={{ borderLeft: 'none', borderRight: '1px solid rgba(158, 48, 169, 0.4)' }}>
                        <span className="name" style={{ color: '#9e30a9' }}>{player2?.pseudo || 'Player 2'}</span>
                        <span className="value">{player2?.win ?? 0}</span>
                    </div>
                </div>

                {players.map(p => {
                    // Calculate "top of head" in world coordinates
                    const scale = Phaser.Math.Linear(0.15, 0.35, (p.y - 280) / (1150 - 280));
                    const labelOffset = (2412 * scale) / 2 + 20;
                    const pos = getScreenPos(p.x, p.y - labelOffset);

                    return (
                        <div 
                            key={p.id} 
                            className={`player-label ${p.isMe ? 'me' : ''}`}
                            style={{ 
                                left: `${pos.x}px`, 
                                top: `${pos.y}px`,
                            }}
                        >
                            {p.pseudo}
                        </div>
                    );
                })}

                <div className="start-button-container">
                    <button className="game-button" onClick={handleStart}>
                        Start Match
                    </button>
                </div>
            </div>
        </div>
    );
}
