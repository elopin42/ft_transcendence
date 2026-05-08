'use client';
import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { io, Socket } from 'socket.io-client';
import * as GameShared from '@ftt/shared/game';

class Player {
    base: GameShared.PlayerBase;
    sprite: Phaser.GameObjects.Sprite;

    constructor(base: GameShared.PlayerBase, sprite: Phaser.GameObjects.Sprite) {
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
            frameWidth: GameShared.PLAYER_WIDTH,
            frameHeight: GameShared.PLAYER_HEIGHT,
        });
        this.load.image('nass-front', '/character/nass/nass-front.png');
        this.load.image('desk', '/desk.png');
    }

    create() {
        const map = this.add.image(0, 0, 'map').setOrigin(0, 0);
        this.scale.resize(map.width, map.height);

        GameShared.DESKTOPS.forEach(d => {
            const img = this.add.image(d.x, d.y, 'desk').setScale(d.scale);
            img.setDepth(d.y + (img.height * d.scale) / 2);
        });

        this.cursors = this.input.keyboard!.createCursorKeys();
        this.socket = io('/world', { withCredentials: true, reconnection: false });

        this.socket.on('players', (players: GameShared.PlayerBase[]) => {
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
                        this.player = new Player(p, this.add.sprite(GameShared.DASHBOARD_SPAWN_X, GameShared.DASHBOARD_SPAWN_Y, 'nass-front'));
                        this.player.setScale(GameShared.DASHBOARD_SPAWN_SCALE);
                    } else {
                        this.player.setPosition(p.x, p.y).setScale(p.scale);
                    }
                } else if (!this.otherPlayers.has(p.id)) {
                    const sprite = this.add.sprite(p.x, p.y, 'nass-front').setScale(p.scale);
                    const labelOffset = (GameShared.PLAYER_HEIGHT * p.scale) / 2 + 20;
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
                    const labelOffset = (GameShared.PLAYER_HEIGHT * p.scale) / 2 + 20;
                    sprite.login.setPosition(p.x, p.y - labelOffset);
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
            if (!GameShared.movePlayer(this.player.base, { xVector: vx, yVector: vy })) {
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
        this.player.sprite.setDepth(this.player.base.y + (GameShared.PLAYER_HEIGHT * this.player.base.scale) / 2);
    }
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
        return () => game.destroy(true);
    }, []);

    return <div ref={ref} style={{ width: '100vw', height: '100vh' }} />;
}
