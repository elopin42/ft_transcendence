'use client';
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { io } from 'socket.io-client';
import { DEFAULT_CHARACTER, type CharacterConfig } from '../characters';

class GameScene extends Phaser.Scene {
    player!: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
    cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    socket!: any;
    character!: CharacterConfig;

    timep = 0;
    otherPlayers = new Map<string, { login: Phaser.GameObjects.Text, sprite: Phaser.GameObjects.Sprite, ox: number, oy: number }>();

    preload() {
        this.load.image('map', '/map.png');
        this.load.spritesheet(`${c.id}-frame`, c.assets.spritesheetRight, {
            frameWidth: c.spritesheet.frameWidth,
            frameHeight: c.spritesheet.frameHeight,
        });
        this.load.image(`${c.id}-front`, c.assets.front);
    }

    create() {
        const c = this.character;
        const frontKey = `${c.id}-front`;
        const frameKey = `${c.id}-frame`;

        const map = this.add.image(0, 0, 'map').setOrigin(0, 0);
        this.scale.resize(map.width, map.height);
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.socket = io({ // meme hote que la page pour Nginx route /socket.io/* vers le backend
            withCredentials: true,
        });
        this.socket.on('players', (players: { id: string, pseudo: string, x: number, y: number }[]) => {
            console.log('joueurs connectés:', players);
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
                }
                else {
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
                        const movingleft = p.x < sprite.ox
                        sprite.sprite.setFlipX(movingleft);
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

        this.player = this.add.sprite(500, 1000, frontKey).setScale(0.35);

        this.anims.create({
            key: 'walk-right',
            frames: this.anims.generateFrameNumbers(frameKey, {
                start: c.spritesheet.walkFrames.start,
                end: c.spritesheet.walkFrames.end,
            }),
            frameRate: c.spritesheet.frameRate,
            repeat: -1,
        });
    }

    update() {
        const c = this.character;
        const frontKey = `${c.id}-front`;
        const speed = Phaser.Math.Linear(3, 7, (this.player.y - 250) / (1150 - 250));
        const sprite = this.player as Phaser.GameObjects.Sprite;
        const moving =
            this.cursors.left.isDown ||
            this.cursors.right.isDown ||
            this.cursors.up.isDown ||
            this.cursors.down.isDown;

        if (this.cursors.left.isDown) {
            this.player.x -= speed;
            sprite.setFlipX(true);
        }
        if (this.cursors.right.isDown) {
            this.player.x += speed;
            sprite.setFlipX(false);
        }
        if (this.cursors.up.isDown) this.player.y -= speed;
        if (this.cursors.down.isDown) this.player.y += speed;

        if (moving) {
            sprite.play('walk-right', true);
        } else {
            sprite.stop();
            sprite.setTexture(frontKey);
        }
        if (!this.cursors.left.isDown && !this.cursors.right.isDown && !this.cursors.up.isDown && !this.cursors.down.isDown) {
            (this.player as Phaser.GameObjects.Sprite).stop();
            (this.player as Phaser.GameObjects.Sprite).setTexture('nass-front');
        }
        this.player.x = Phaser.Math.Clamp(this.player.x, 50, 2680);
        this.player.y = Phaser.Math.Clamp(this.player.y, 225, 1150);
        this.socket.emit('move', { x: this.player.x, y: this.player.y });
        const scale = Phaser.Math.Linear(0.15, 0.35, (this.player.y - 280) / (1150 - 280));
        (this.player as Phaser.GameObjects.Sprite).setScale(scale);
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
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
            },
        });
        return () => game.destroy(true);
    }, []);

    return <div ref={ref} style={{ width: '100vw', height: '100vh' }} />;
}
