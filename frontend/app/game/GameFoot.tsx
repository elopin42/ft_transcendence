'use client';
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { io } from 'socket.io-client';

class GameScene extends Phaser.Scene {
    player: Phaser.GameObjects.Image |  null = null;
    cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    socket!: any;
    ballon: Phaser.GameObjects.Image | null = null;

    myPnumber = 0;
    timep = 0;
    otherPlayers = new Map<string, { login: Phaser.GameObjects.Text, sprite: Phaser.GameObjects.Sprite, ox: number, oy: number }>();

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
        let myPnumber = 0;
        this.scale.resize(map.width, map.height);
        this.cursors = this.input.keyboard!.createCursorKeys();
        // génère la texture du ballon blanc
        const graphics = this.add.graphics();
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(20, 20, 20); 
        graphics.generateTexture('bal', 40, 40);
        graphics.destroy();
        this.ballon = this.add.image(1340, 690, 'bal');
        this.socket = io('/gamefoot', { // meme hote que la page pour Nginx route /socket.io/* vers le backend
            withCredentials: true,
        });
        this.player = null;
        this.socket.on('players', ({players, bal}: {players: { id: string, pnumber: number, pseudo: string, x: number, y: number }[], bal: { x: number, y: number}}) => {
            console.log('joueurs connectés:', players);
            const me = players.find(p => p.id === this.socket.id);
          if (me && !this.player) {  // première fois seulement
            this.myPnumber = me.pnumber;
            const mapWidth = this.scale.width; // largeur réelle de la map
            const startX = me.pnumber === 1 ? mapWidth * 0.12 : mapWidth * 0.88; // 12% gauche / 88% droite
            this.player = this.add.sprite(startX, 660, 'nass-front').setScale(0.35);
            (this.player as Phaser.GameObjects.Sprite).setFlipX(me.pnumber === 2);
          }
            if (me && myPnumber === 0)
              myPnumber = me.pnumber;
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
                        const movingleft = (p.pnumber == 1 ? false : true);
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
        this.anims.create({
            key: 'walk-right',
            frames: this.anims.generateFrameNumbers('nass-frame', { start: 2, end: 0 }),
            frameRate: 4,
            repeat: -1
        })
    }
    update() {
        if (!this.player) return;
        const speed = Phaser.Math.Linear(3, 7, (this.player.y - 250) / (1150 - 250));
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
    }
}

export default function GameFoot() {
    const ref = useRef<HTMLDivElement>(null); // creer ref vers une elements html

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
