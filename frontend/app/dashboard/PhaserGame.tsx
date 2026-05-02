'use client';
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { io } from 'socket.io-client';

class GameScene extends Phaser.Scene {
    player!: Phaser.Physics.Arcade.Sprite;
    deskGroup!: Phaser.Physics.Arcade.StaticGroup;
    cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    socket!: any;

    timep = 0;
    otherPlayers = new Map<string, { login: Phaser.GameObjects.Text, sprite: Phaser.GameObjects.Sprite, ox: number, oy: number }>();

    preload() {
        this.load.image('map', '/map.png');
        this.load.spritesheet('nass-frame', '/character/nass/nass-allframe-right.png', {
            frameWidth: 1760,
            frameHeight: 2412
        });
        this.load.image('nass-front', '/character/nass/nass-front.png');
        this.load.image('desk', '/desk.png');
    }
    create() {
        const map = this.add.image(0, 0, 'map').setOrigin(0, 0);
        this.scale.resize(map.width, map.height);

        this.deskGroup = this.physics.add.staticGroup();

        const setupDesk = (x: number, y: number, scale: number, bodyOffsetY = 0, bodyWidth = 1900, bodyOffsetX = 0, bodyHeight = 107) => {
            const d = this.deskGroup.create(x, y, 'desk').setScale(scale);
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
        this.socket.on('players', (players: { id: string, pseudo: string, x: number, y: number }[]) => {
            console.log('joueurs connectés:', players);
            const activeIds = new Set(players.map(p => p.id));
            this.otherPlayers.forEach((player, id) => {
                if (!activeIds.has(id)) {
                    player.sprite.destroy();
                    player.login.destroy();
                    this.otherPlayers.delete(id);
                }
            });
            players.forEach(p => {
                if (p.id === this.socket.id) return;
                if (!this.otherPlayers.has(p.id)) {
                    const sprite = this.add.sprite(p.x, p.y, 'nass-front').setScale(0.35);
                    const scales = Phaser.Math.Linear(0.15, 0.35, (p.y - 280) / (1150 - 280));
                    const labelOffset = (2412 * scales) / 2 + 20;
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
                    sprite.sprite.setPosition(p.x, p.y);
                    const scale = Phaser.Math.Linear(0.15, 0.35, (p.y - 280) / (1150 - 280));
                    const labelOffset = (2412 * scale) / 2 + 20;
                    sprite.login.setPosition(p.x, p.y - labelOffset);
                    sprite.sprite.setScale(scale);
                    if (timeo - this.timep < 50) return;
                    this.timep = timeo;
                    if (p.x != sprite.ox || p.y != sprite.oy) {
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

        this.player = this.physics.add.sprite(500, 1000, 'nass-front').setScale(0.35);
        this.physics.add.collider(this.player, this.deskGroup);
        this.player.setSize(400, 200).setOffset(680, 2200);

        this.anims.create({
            key: 'walk-right',
            frames: this.anims.generateFrameNumbers('nass-frame', { start: 2, end: 0 }),
            frameRate: 4,
            repeat: -1
        });
    }
    update() {
        const speed = Phaser.Math.Linear(3, 7, (this.player.y - 250) / (1150 - 250)) * 60;
        const moving = this.cursors.left.isDown || this.cursors.right.isDown || this.cursors.up.isDown || this.cursors.down.isDown;

        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
            this.player.setFlipX(true);
            this.player.play('walk-right', true);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
            this.player.setFlipX(false);
            this.player.play('walk-right', true);
        } else {
            this.player.setVelocityX(0);
        }

        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-speed);
            if (!this.cursors.left.isDown && !this.cursors.right.isDown) this.player.play('walk-right', true);
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(speed);
            if (!this.cursors.left.isDown && !this.cursors.right.isDown) this.player.play('walk-right', true);
        } else {
            this.player.setVelocityY(0);
        }

        if (!moving) {
            this.player.stop();
            this.player.setTexture('nass-front');
        }

        this.player.x = Phaser.Math.Clamp(this.player.x, 50, 2690);
        this.player.y = Phaser.Math.Clamp(this.player.y, 250, 1180);

        if (this.socket.connected) this.socket.emit('move', { x: this.player.x, y: this.player.y });
        const scale = Phaser.Math.Linear(0.13, 0.30, (this.player.y - 280) / (1150 - 280));
        this.player.setScale(scale);
        this.player.setDepth(this.player.body!.bottom);
    }
}

export default function PhaserGame() {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const game = (window as any).__game = new Phaser.Game({
            width: 1280,
            height: 720,
            parent: ref.current!,
            scene: GameScene,
            physics: { default: 'arcade', arcade: { debug: true, height: 1600 } },
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
            },
        });
        return () => game.destroy(true);
    }, []);

    return <div ref={ref} style={{ width: '100vw', height: '100vh' }} />;
}
