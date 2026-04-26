'use client';
import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { io } from 'socket.io-client';

class GameScene extends Phaser.Scene {
    player!: Phaser.Physics.Arcade.Sprite; //%% desk - physics sprite pour les collisions
    deskGroup!: Phaser.Physics.Arcade.StaticGroup; //%% desk - groupe statique pour bloquer le joueur
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
        this.load.image('desk', '/desk.png'); //%% desk
    }
    create() {
        const map = this.add.image(0, 0, 'map').setOrigin(0, 0);
        this.scale.resize(map.width, map.height);

        this.deskGroup = this.physics.add.staticGroup(); //%% desk - groupe de collision

        // %% desk - rangée 1 (la plus en arrière, petite)
        (this.deskGroup.create(2100, 420, 'desk') as Phaser.Physics.Arcade.Image).setScale(0.18).setDepth(420).refreshBody(); //%% desk
        // %% desk - rangée 2
        (this.deskGroup.create(2100, 580, 'desk') as Phaser.Physics.Arcade.Image).setScale(0.22).setDepth(580).refreshBody(); //%% desk
        // %% desk - rangée 3
        (this.deskGroup.create(2100, 740, 'desk') as Phaser.Physics.Arcade.Image).setScale(0.26).setDepth(740).refreshBody(); //%% desk
        // %% desk - rangée 4
        (this.deskGroup.create(2100, 900, 'desk') as Phaser.Physics.Arcade.Image).setScale(0.30).setDepth(900).refreshBody(); //%% desk
        // %% desk - rangée 5 (la plus en avant, grande)
        (this.deskGroup.create(2100, 1060, 'desk') as Phaser.Physics.Arcade.Image).setScale(0.34).setDepth(1060).refreshBody(); //%% desk
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.socket = io('/world', { // meme hote que la page pour Nginx route /socket.io/* vers le backend
            withCredentials: true,
        });
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
        this.player = this.physics.add.sprite(500, 1000, 'nass-front').setScale(0.35); //%% desk - physics sprite
        this.physics.add.collider(this.player, this.deskGroup); //%% desk - bloque le joueur contre les bureaux
        this.anims.create({
            key: 'walk-right',
            frames: this.anims.generateFrameNumbers('nass-frame', { start: 2, end: 0 }),
            frameRate: 4,
            repeat: -1
        })
    }
    update() {
        const speed = Phaser.Math.Linear(3, 7, (this.player.y - 250) / (1150 - 250));
        if (this.cursors.left.isDown) {
            this.player.x -= speed;
            (this.player as Phaser.GameObjects.Sprite).setFlipX(true);
            (this.player as Phaser.GameObjects.Sprite).play('walk-right', true);
        }
        if (this.cursors.right.isDown) {
            this.player.x += speed;
            (this.player as Phaser.GameObjects.Sprite).setFlipX(false);
            (this.player as Phaser.GameObjects.Sprite).play('walk-right', true);
        }
        if (this.cursors.up.isDown) {
            this.player.y -= speed;
            (this.player as Phaser.GameObjects.Sprite).play('walk-right', true);
        }
        if (this.cursors.down.isDown) {
            this.player.y += speed;
            (this.player as Phaser.GameObjects.Sprite).play('walk-right', true);
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
        this.player.setDepth(this.player.y); //%% y-sort : joueur devant si y plus grand
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
            physics: { default: 'arcade', arcade: { debug: true } }, //%% desk - debug:true pour voir les hitboxes en vert
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
            },
        });
        return () => game.destroy(true);
    }, []);

    return <div ref={ref} style={{ width: '100vw', height: '100vh' }} />;
}
