'use client';
import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { io, Socket } from 'socket.io-client';
import * as GameShared from '@ftt/shared/game';

class Player {
    base: GameShared.PlayerBase;
    sprite: Phaser.Physics.Arcade.Sprite;

    constructor(base: GameShared.PlayerBase, sprite: Phaser.Physics.Arcade.Sprite) {
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
    deskGroup!: Phaser.Physics.Arcade.StaticGroup;
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

        this.deskGroup = this.physics.add.staticGroup();

        // Helper Nass : cree un desk avec hitbox arcade dimensionnee proprement.
        // bodyOffsetY/X compensent l asymetrie sprite (le pied du desk est au bas).
        const setupDesk = (
            x: number,
            y: number,
            scale: number,
            bodyOffsetY = 0,
            bodyWidth = 1900,
            bodyOffsetX = 0,
            bodyHeight = 107,
        ) => {
            const d = this.deskGroup.create(x, y, 'desk').setScale(scale) as Phaser.Physics.Arcade.Image;
            const bw = bodyWidth * scale;
            const bh = bodyHeight * scale;
            const b = d.body as Phaser.Physics.Arcade.StaticBody;
            b.setSize(bw, bh, false);
            b.position.x = x - bw / 2 + bodyOffsetX;
            b.position.y = y + (536 * scale) / 2 - bh + bodyOffsetY;
            d.setDepth(b.bottom);
        };

        setupDesk(2128, 443, 0.49);
        setupDesk(2356, 607, 0.62);
        setupDesk(2546, 795, 0.70);
        setupDesk(2889, 1010, 0.92);
        setupDesk(3179, 1263, 1.06);
        setupDesk(5179, 1263, 1.06);

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
                        this.player = new Player(p, this.physics.add.sprite(GameShared.DASHBOARD_SPAWN_X, GameShared.DASHBOARD_SPAWN_Y, 'nass-front'));
                        this.player.setScale(GameShared.DASHBOARD_SPAWN_SCALE);
                        this.physics.add.collider(this.player.sprite, this.deskGroup);
                        this.player.sprite.setSize(400, 200).setOffset(680, 2200);
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
            frames: this.anims.generateFrameNumbers('nass-frame', { start: 2, end: 0 }),
            frameRate: 4,
            repeat: -1,
        });
    }

    update() {
        if (!this.player) return;
        const moveX: boolean = this.cursors.left.isDown !== this.cursors.right.isDown;
        const moveY: boolean = this.cursors.up.isDown !== this.cursors.down.isDown;

        if (!moveX && !moveY) {
            this.player.sprite.stop();
            this.player.sprite.setTexture('nass-front');
        }

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
        GameShared.movePlayer(this.player.base, { xVector: vx, yVector: vy });
        this.player.setPosition(this.player.base.x, this.player.base.y);

        if (this.socket.connected && (moveX || moveY)) this.socket.emit('move', { xVector: vx, yVector: vy });
        this.player.sprite.setDepth(this.player.sprite.body!.bottom);
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
