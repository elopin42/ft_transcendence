'use client';
import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { io, Socket } from 'socket.io-client';
import '@/styles/game.css';
import { useRouter } from '@/config/navigation';
import { ROUTES } from '@/config/routes';
import {
    getPlayerScale,
    getPlayerSpeed,
    PLAYER_HEIGHT,
    PLAYER_MAX_Y,
    PLAYER_MIN_Y,
    PLAYER_WIDTH
} from '@ftt/shared/game';
import {
    BALL_SIZE,
    MAX_POINTS,
    type Player,
    SPAWN_X_BALL,
    SPAWN_Y_BALL
} from '@ftt/shared/game/foot';

interface FootPlayer extends Player {
    isMe: boolean;
}

class GameScene extends Phaser.Scene {
    player: Phaser.GameObjects.Sprite | null = null;
    cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    socket!: Socket;
    ballon: Phaser.GameObjects.Image | null = null;
    wsKeys!: { w: Phaser.Input.Keyboard.Key, s: Phaser.Input.Keyboard.Key };

    myPnumber = 0;
    timep = 0;
    tx = 0;
    ty = 0;
    twoPlayer = false;
    lasttwoPlayer = false;
    otherPlayers = new Map<string, { sprite: Phaser.GameObjects.Sprite, ox: number, oy: number }>();
    onUpdatePlayers?: (players: FootPlayer[], bal: { x: number, y: number }) => void;

    preload() {
        this.load.image('map', '/map.png');
        this.load.spritesheet('nass-frame', '/character/nass/nass-allframe-right.png', {
            frameWidth: PLAYER_WIDTH,
            frameHeight: PLAYER_HEIGHT
        });
        this.load.image('nass-front', '/character/nass/nass-front.png');
    }

    create() {
        const map = this.add.image(0, 0, 'map').setOrigin(0, 0);
        this.scale.resize(map.width, map.height);
        this.cursors = this.input.keyboard!.createCursorKeys();

        const graphics = this.add.graphics();
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(BALL_SIZE / 2, BALL_SIZE / 2, BALL_SIZE / 2);
        graphics.generateTexture('bal', BALL_SIZE, BALL_SIZE);
        graphics.destroy();
        this.ballon = this.add.image(SPAWN_X_BALL, SPAWN_Y_BALL, 'bal');

        this.socket = io('/gamefoot', {
            withCredentials: true,
        });
        this.wsKeys = {
            w: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            s: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        };

        this.socket.on('players', ({ players, bal }: { players: FootPlayer[], bal: { x: number, y: number } }) => {
            const activeIds = new Set(players.map(p => p.id));

            const invite = localStorage.getItem('invite_player');
            if (invite) {
                console.log('invite ', invite)
                this.socket.emit('private_game', { login: invite });
                localStorage.removeItem('invite_player');
            }

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
                // Spawn position fournie par le serveur (Julien : coords pilotees back-side)
                this.myPnumber = me.pnumber;
                this.player = this.add.sprite(me.x, me.y, 'nass-front').setScale(0.35);
                this.player.setFlipX(me.pnumber === 2);
                this.tx = me.x;
                this.ty = me.y;
            } else if (me && this.player) {
                this.player.setPosition(me.x, me.y);
            }

            players.forEach(p => {
                if (p.id === this.socket.id) return;

                if (!this.otherPlayers.has(p.id)) {
                    const sprite = this.add.sprite(p.x, p.y, 'nass-front').setScale(p.scale);
                    this.otherPlayers.set(p.id, { sprite, ox: p.x, oy: p.y });
                    this.tx = p.x;
                    this.ty = p.y;
                } else {
                    const timeo = Date.now();
                    const entry = this.otherPlayers.get(p.id);
                    if (!entry) return;

                    entry.sprite.setPosition(p.x, p.y).setScale(getPlayerScale(p.y));

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
                const uiPlayers: FootPlayer[] = players.map(p => ({
                    id: p.id,
                    pseudo: p.pseudo,
                    x: p.x,
                    y: p.y,
                    scale: p.scale,
                    win: p.win,
                    pnumber: p.pnumber,
                    isMe: p.id === this.socket.id,
                    isAI: p.isAI,
                    twoPlayer: p.twoPlayer,
                }));
                this.onUpdatePlayers(uiPlayers, bal);
            }
        });

        this.anims.create({
            key: 'walk-right',
            frames: this.anims.generateFrameNumbers('nass-frame', { start: 1, end: 0 }).concat(this.anims.generateFrameNumbers('nass-frame', { start: 1, end: 2 })),
            frameRate: 4,
            repeat: -1
        });
    }

    update() {
        if (!this.player) return;
        const speed = getPlayerSpeed(this.player.y);
        const moving = this.cursors.up.isDown !== this.cursors.down.isDown;
        let vy = 0;

        if (this.cursors.up.isDown) {
            this.player.y -= speed;
            vy = -1;
        } else if (this.cursors.down.isDown) {
            this.player.y += speed;
            vy = 1;
        }

        if (moving) {
            this.player.play('walk-right', true);
        } else {
            this.player.stop();
            this.player.setTexture('nass-front');
        }

        this.player.y = Phaser.Math.Clamp(this.player.y, PLAYER_MIN_Y, PLAYER_MAX_Y);
        this.player.setScale(getPlayerScale(this.player.y));

        this.socket.emit('move', { y: vy });

        // Mode 2 joueurs sur le meme ecran : touches W/S pilotent le 2e
        // joueur localement, on emet 'move2' au serveur qui re-route vers
        // le bon player de la room.
        const moving2 = this.wsKeys.w.isDown !== this.wsKeys.s.isDown;
        if (moving2 && (this.ty !== 0 || this.tx !== 0)) {
            const speed2 = getPlayerSpeed(this.ty);
            let vy2 = 0;
            if (this.wsKeys.w.isDown) {
                this.ty -= speed2;
                vy2 = -1;
            } else if (this.wsKeys.s.isDown) {
                this.ty += speed2;
                vy2 = 1;
            }
            this.ty = Phaser.Math.Clamp(this.ty, PLAYER_MIN_Y, PLAYER_MAX_Y);
            this.socket.emit('move2', { y: vy2 });
        }

        if (this.twoPlayer !== this.lasttwoPlayer) {
          this.lasttwoPlayer = this.twoPlayer;
          this.socket.emit('twoPlayer', { twoPlayer: this.twoPlayer });
        }
    }

    start() {
        this.socket.emit('start');
    }
}

export default function GameFoot() {
    const ref = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);
    const [players, setPlayers] = useState<FootPlayer[]>([]);
    const [ball, setBall] = useState({ x: 0, y: 0 });
    const [isStarting, setIsStarting] = useState(false);
    const [twoPlayer, setTwoPlayer] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [finished, setFinished] = useState(false);
    const [winner, setWinner] = useState<string | null>(null);
    const router = useRouter();

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

                    // Detect match finish (server awards win counts). If any player reached 5, show finish modal
                    const p1 = p.find(x => x.pnumber === 1);
                    const p2 = p.find(x => x.pnumber === 2);
                    const p1win = p1?.win ?? 0;
                    const p2win = p2?.win ?? 0;
                    if (p1win >= MAX_POINTS || p2win >= MAX_POINTS) {
                        setFinished(true);
                        const winnerPseudo = p1win >= MAX_POINTS ? p1?.pseudo ?? 'Player 1' : p2?.pseudo ?? 'Player 2';
                        setWinner(winnerPseudo);
                    } else {
                        // hide modal if scores reset
                        setFinished(false);
                        setWinner(null);
                    }
                };
                clearInterval(checkScene);
            }
        }, 100);

        return () => {
            clearInterval(checkScene);
            const scene = game.scene.scenes[0] as GameScene | undefined;
            if (scene?.socket) {
                scene.socket.off('players');
                scene.socket.disconnect();
            }
            game.destroy(true);
        };
    }, []);
  
    useEffect(() => {
        const scene = gameRef.current?.scene.scenes[0] as GameScene | undefined;
        if (scene) scene.twoPlayer = twoPlayer;
    }, [twoPlayer]);

    const handleStart = () => {
        if (isStarting) return;
        // Start a 3s countdown, then emit start to server
        setIsStarting(true);
        setCountdown(3);
        const tick = setInterval(() => {
            setCountdown(c => {
                if (c === null) return null;
                if (c <= 1) {
                    clearInterval(tick);
                    setCountdown(null);
                    setIsStarting(false);
                    const scene = gameRef.current?.scene.scenes[0] as GameScene;
                    if (scene) scene.start();
                    return null;
                }
                return c - 1;
            });
        }, 1000);
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
        <div style={{ width: '100vw', height: '100vh', backgroundColor: '#000', overflow: 'hidden', position: 'relative' }}>
            {/* Checkbox 2 players */}
            <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontWeight: 500 }}>
                    <input
                        type="checkbox"
                        checked={twoPlayer}
                        onChange={e => setTwoPlayer(e.target.checked)}
                    />
                    2 Players (local)
                </label>
            </div>

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
                    const labelOffset = (PLAYER_HEIGHT * getPlayerScale(p.y)) / 2 + 20;
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
                    <button className="game-button" onClick={handleStart} disabled={isStarting || finished}>
                        {isStarting ? `Starting in ${countdown ?? 0}s` : 'Start Match'}
                    </button>
                </div>
            </div>

            {/* Countdown overlay */}
            {isStarting && countdown !== null && (
                <div className="overlay">
                    <div className="countdown">{countdown}</div>
                </div>
            )}

            {/* Finish modal */}
            {finished && (
                <div className="overlay">
                    <div className="modal">
                        <h2>Match Finished</h2>
                        <p>{winner ? `${winner} won the match` : 'The match is finished'}</p>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button className="modal-button" onClick={() => router.push(ROUTES.DASHBOARD)}>Go to Dashboard</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
