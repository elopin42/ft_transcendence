'use client';
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { io } from 'socket.io-client';

class GameScene extends Phaser.Scene {
    player!: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
    cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    socket!: any;

    otherPlayers = new Map<string, Phaser.GameObjects.Sprite>();

    preload(){
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
        this.socket = io('http://localhost:4000', {
            withCredentials: true
        });
        this.socket.on('players', (players: { id: string, pseudo: string, x: number, y: number }[]) => {
            console.log('joueurs connectés:', players);
            players.forEach(p => {
              if (p.id === this.socket.id) return;

              if (!this.otherPlayers.has(p.id)) {
                  const newSprite = this.add.sprite(p.x, p.y, 'nass-front').setScale(0.35);
                  this.otherPlayers.set(p.id, newSprite);
              }
              else {
                  const sprite = this.otherPlayers.get(p.id);
                  if (!sprite) return;
                  const oldX = sprite.x;
                  const oldY = sprite.y;
                  sprite.setPosition(p.x, p.y);
                  if (p.x !== oldX || p.y !== oldY) {
                      if (p.x < oldX)
                        sprite.setFlipX(true);
                      else
                        sprite.setFlipX(false);
                      sprite.play('walk-right', true);
                  } else {
                      sprite.stop();
                      sprite.setTexture('nass-front');
                  }
                  const scale = Phaser.Math.Linear(0.15, 0.35, (sprite.y-280) / (1150 - 280));
                  sprite.setScale(scale);
                }
            });
        });
        this.player = this.add.sprite(500, 1000, 'nass-front').setScale(0.35);
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
        const scale = Phaser.Math.Linear(0.15, 0.35, (this.player.y-280) / (1150 - 280));
        (this.player as Phaser.GameObjects.Sprite).setScale(scale);
    }
}

export default function PhaserGame() {
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
