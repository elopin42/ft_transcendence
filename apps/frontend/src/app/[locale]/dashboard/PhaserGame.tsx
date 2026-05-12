'use client';
import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { io, Socket } from 'socket.io-client';
import { PLAYER_HEIGHT, PLAYER_WIDTH, PlayerBase } from '@ftt/shared/game';
import { ROUTES } from '@/config/routes';
import { useRouter } from '@/config/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
    movePlayer,
    DESKTOPS,
    SPAWN_SCALE,
    SPAWN_X,
    SPAWN_Y
} from '@ftt/shared/game/dashboard';

class Player {
    base: PlayerBase;
    sprite: Phaser.GameObjects.Sprite;

    constructor(base: PlayerBase, sprite: Phaser.GameObjects.Sprite) {
        this.base = base;
        this.sprite = sprite;
    }

    setScale(scale: number): this {
        this.base.scale = scale;
        this.sprite.setScale(scale);
        return this;
    }

    setPosition(x: number, y: number): this {
        this.base.x = x;
        this.base.y = y;
        this.sprite.setPosition(x, y);
        return this;
    }
}

class GameScene extends Phaser.Scene {
    player: Player | null = null;
    cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    socket!: Socket;

    timep = 0;
    otherPlayers = new Map<string, { login: Phaser.GameObjects.Text, sprite: Phaser.GameObjects.Sprite, ox: number, oy: number }>();

    preload() {
        this.load.image('map', '/map.png');
        this.load.spritesheet('nass-frame', '/character/nass/nass-allframe-right.png', {
            frameWidth: PLAYER_WIDTH,
            frameHeight: PLAYER_HEIGHT,
        });
        this.load.image('nass-front', '/character/nass/nass-front.png');
        this.load.image('desk', '/desk.png');
    }

    create() {
        const map = this.add.image(0, 0, 'map').setOrigin(0, 0);
        this.scale.resize(map.width, map.height);

        DESKTOPS.forEach(d => {
            const img = this.add.image(d.x, d.y, 'desk').setScale(d.scale);
            img.setDepth(d.y + (img.height * d.scale) / 2);
        });

        this.cursors = this.input.keyboard!.createCursorKeys();
        this.socket = io('/world', { withCredentials: true, reconnection: false });

        this.socket.on('players', (players: PlayerBase[]) => {
            const activeIds = new Set(players.map(p => p.id));
            this.otherPlayers.forEach((player, id) => {
                if (!activeIds.has(id)) {
                    player.sprite.destroy();
                    player.login.destroy();
                    this.otherPlayers.delete(id);
                }
            });

            players.forEach(p => {
                if (p.id === this.socket.id) {
                    if (!this.player) {
                        this.player = new Player(p, this.add.sprite(SPAWN_X, SPAWN_Y, 'nass-front'));
                        this.player.setScale(SPAWN_SCALE);
                    } else {
                        this.player.setPosition(p.x, p.y).setScale(p.scale);
                    }
                } else if (!this.otherPlayers.has(p.id)) {
                    const sprite = this.add.sprite(p.x, p.y, 'nass-front').setScale(p.scale);
                    const labelOffset = (PLAYER_HEIGHT * p.scale) / 2 + 20;
                    const login = this.add.text(p.x, p.y - labelOffset, p.pseudo, {
                        fontSize: '20px',
                        color: '#ff0000',
                        stroke: '#000000',
                    }).setOrigin(0.5);
                    this.otherPlayers.set(p.id, { login, sprite, ox: p.x, oy: p.y });
                } else {
                    const timeo = Date.now();
                    const sprite = this.otherPlayers.get(p.id);
                    if (!sprite) return;
                    sprite.sprite.setPosition(p.x, p.y).setScale(p.scale);
                    const labelOffset = (PLAYER_HEIGHT * p.scale) / 2 + 20;
                    sprite.login.setPosition(p.x, p.y - labelOffset);
                    const depth = sprite.sprite.y + (PLAYER_HEIGHT * sprite.sprite.scale) / 2;
                    sprite.sprite.setDepth(depth);
                    sprite.login.setDepth(depth);
                    if (timeo - this.timep < 50) return;
                    this.timep = timeo;
                    if (p.x !== sprite.ox || p.y !== sprite.oy) {
                        sprite.sprite.setFlipX(p.x < sprite.ox);
                        sprite.sprite.play('walk-right', true);
                    } else {
                        sprite.sprite.stop();
                        sprite.sprite.setTexture('nass-front');
                    }
                    sprite.ox = p.x;
                    sprite.oy = p.y;
                }
            });
        });

        this.anims.create({
            key: 'walk-right',
            frames: this.anims.generateFrameNumbers('nass-frame', { start: 1, end: 0 }).concat(this.anims.generateFrameNumbers('nass-frame', { start: 1, end: 2 })),
            frameRate: 4,
            repeat: -1,
        });
    }

    update() {
        if (!this.player) return;
        let moveX: boolean = this.cursors.left.isDown !== this.cursors.right.isDown;
        let moveY: boolean = this.cursors.up.isDown !== this.cursors.down.isDown;

        let vx = 0;
        let vy = 0;

        if (moveX) {
            vx = this.cursors.left.isDown ? -1 : 1;
            this.player.sprite.setFlipX(this.cursors.left.isDown);
            this.player.sprite.play('walk-right', true);
        }
        if (moveY) {
            vy = this.cursors.up.isDown ? -1 : 1;
            if (!moveX) this.player.sprite.play('walk-right', true);
        }
        if (moveX || moveY) {
            if (!movePlayer(this.player.base, { xVector: vx, yVector: vy })) {
                moveY = false;
                moveX = false;
            } else {
                // Set la posi de la class pour set aussi la posi de la sprite
                this.player.setPosition(this.player.base.x, this.player.base.y);
                if (this.socket.connected) this.socket.emit('move', { xVector: vx, yVector: vy });
            }
        }
        if (!moveX && !moveY) {
            this.player.sprite.stop();
            this.player.sprite.setTexture('nass-front');
        }
        this.player.sprite.setDepth(this.player.base.y + (PLAYER_HEIGHT * this.player.base.scale) / 2);
    }
}

function DashboardOverlay() {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const { logout } = useAuth();
    const handleLogout = async () => {
      try {
        await logout();
      } catch (e) {
        // ignore — on redirige quand même
      }
      router.push(ROUTES.HOME);
    };

    return (
        <div className="absolute top-4 left-4 z-50 flex flex-col items-end gap-2" style={{cursor: 'pointer'}}>
            {/* Toolbar pill */}
            <div className="flex items-center justify-between bg-white bg-opacity-80 backdrop-blur-md rounded-full shadow-lg transition-all duration-300 hover:shadow-xl hover:bg-opacity-90" style={{cursor: 'pointer'}} >

                <button
                    onClick={() => setOpen(!open)}
                    className="relative w-9 h-9 flex items-center justify-center rounded-full text-black hover:text-[rgb(241,16,255)] transition"
                >
                    <span
                        className={`absolute text-xl transition-all duration-300 ${
                            open
                                ? "opacity-0 rotate-90 scale-0"
                                : "opacity-100 rotate-0 scale-100"
                        }`}
                    >
                        ☰
                    </span>

                    <span
                        className={`absolute text-xl transition-all duration-300 ${
                            open
                                ? "opacity-100 rotate-0 scale-100"
                                : "opacity-0 -rotate-90 scale-0"
                        }`}
                    >
                        ✕
                    </span>
                </button>

                <div
                  className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out ${
                    open ? "max-w-[500px] opacity-100 ml-2" : "max-w-0 opacity-0"
                  }`}
                >
                    {/* Bouton profile */}
                    <button className="text-black hover:text-[rgb(241,16,255)] mx-2 transition-all duration-200 ease-in-out hover:rotate-12 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded-full"style={{cursor: 'pointer'}}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                    </button>

                    {/* Bouton chat */}
                    <button className="text-black hover:text-[rgb(241,16,255)] mx-2 transition-all duration-200 ease-in-out hover:rotate-12 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded-full"style={{cursor: 'pointer'}}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                        </svg>
                    </button>

                    {/* Bouton classement */}
                    <button className="text-black hover:text-[rgb(241,16,255)] mx-2 transition-all duration-200 ease-in-out hover:rotate-12 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded-full"style={{cursor: 'pointer'}}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                        </svg>
                    </button>

                    {/* Bouton game */}
                    <button className="text-black hover:text-[rgb(241,16,255)] mx-2 transition-all duration-200 ease-in-out hover:rotate-12 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded-full" onClick={() => router.push(ROUTES.GAME)} style={{cursor: 'pointer'}}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
                        </svg>
                    </button>

                    {/* Bouton disconnect */}
                    <button className="text-red-500 hover:text-red-600 mx-2 transition-transform duration-200 ease-in-out hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-full" onClick={handleLogout}style={{cursor: 'pointer'}}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}


export default function PhaserGame() {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const game = new Phaser.Game({
            width: 1280,
            height: 720,
            parent: ref.current!,
            scene: GameScene,
            physics: { default: 'arcade', arcade: { debug: false } },
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
            },
        });
        return () => {
            const scene = game.scene.scenes[0] as GameScene | undefined;
            if (scene?.socket) {
                scene.socket.off('players');
                scene.socket.disconnect();
            }
            game.destroy(true);
        };
    }, []);

    // return <div ref={ref} style={{ width: '100vw', height: '100vh' }} />;
    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
            <div ref={ref} style={{ width: '100%', height: '100%' }} />
            <DashboardOverlay />
        </div>
    );
}
