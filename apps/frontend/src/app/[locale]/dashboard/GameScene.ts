import * as Phaser from 'phaser';
import { io, Socket } from 'socket.io-client';

export class GameScene extends Phaser.Scene {
    player!: Phaser.Physics.Arcade.Sprite;
    deskGroup!: Phaser.Physics.Arcade.StaticGroup;
    cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    socket!: Socket;

    timep = 0;
    otherPlayers = new Map<string, { login: Phaser.GameObjects.Text, sprite: Phaser.GameObjects.Sprite, ox: number, oy: number }>();

    gfx!: Phaser.GameObjects.Graphics;
    txt!: Phaser.GameObjects.Text;
    chatTimer: Phaser.Time.TimerEvent | null = null;

    popChat(msg: string) {
        this.txt.setText(msg);
        this.gfx.setVisible(true);
        this.txt.setVisible(true);
        if (this.chatTimer) this.chatTimer.remove();
        this.chatTimer = this.time.delayedCall(4000, () => {
            this.gfx.setVisible(false);
            this.txt.setVisible(false);
        });
    }

    drawChat(x: number, y: number) {
        const pad = 18;
        const r = 14;
        const th = 14;
        const tw = 16;
        const w = this.txt.width + pad * 2;
        const h = this.txt.height + pad * 2;

        const ty = y;
        const by = ty - th;
        const top = by - h;
        const left = x - w / 2;

        this.gfx.clear();
        this.gfx.setPosition(0, 0);
        this.gfx.fillStyle(0xffffff, 1);
        this.gfx.lineStyle(2, 0xcccccc, 1);
        this.gfx.fillRoundedRect(left, top, w, h, r);
        this.gfx.strokeRoundedRect(left, top, w, h, r);
        this.gfx.fillStyle(0xffffff, 1);
        this.gfx.fillTriangle(x - tw / 2, by, x + tw / 2, by, x, ty);
        this.txt.setPosition(x, top + h / 2);
    }

    preload() {
        this.load.image('map', '/map.png');
        this.load.spritesheet('nass-frame', '/character/nass/nass-allframe-right.png', {
            frameWidth: 1760,
            frameHeight: 2412,
        });
        this.load.image('nass-front', '/character/nass/nass-front.png');
        this.load.image('desk', '/desk.png');
    }

    create() {
        const map = this.add.image(0, 0, 'map').setOrigin(0, 0);
        this.scale.resize(map.width, map.height);

        this.deskGroup = this.physics.add.staticGroup();

        const mkDesk = (x: number, y: number, scale: number, offY = 0, bw = 1900, offX = 0, bh = 107) => {
            const d = this.deskGroup.create(x, y, 'desk').setScale(scale) as Phaser.Physics.Arcade.Image;
            const fw = bw * scale;
            const fh = bh * scale;
            const b = d.body as Phaser.Physics.Arcade.StaticBody;
            b.setSize(fw, fh, false);
            b.position.x = x - fw / 2 + offX;
            b.position.y = y + (536 * scale) / 2 - fh + offY;
            d.setDepth(b.bottom);
        };

        mkDesk(2128, 443, 0.49);
        mkDesk(2356, 607, 0.62);
        mkDesk(2546, 795, 0.70);
        mkDesk(2889, 1010, 0.92);
        mkDesk(3179, 1263, 1.06);
        mkDesk(5179, 1263, 1.06);

        this.cursors = this.input.keyboard!.createCursorKeys();
        this.socket = io('/world', { withCredentials: true, reconnection: false });

        this.socket.on('players', (players: { id: string, pseudo: string, x: number, y: number }[]) => {
            const ids = new Set(players.map(p => p.id));
            this.otherPlayers.forEach((pl, id) => {
                if (!ids.has(id)) {
                    pl.sprite.destroy();
                    pl.login.destroy();
                    this.otherPlayers.delete(id);
                }
            });

            players.forEach(p => {
                if (p.id === this.socket.id) return;
                if (!this.otherPlayers.has(p.id)) {
                    const sprite = this.add.sprite(p.x, p.y, 'nass-front').setScale(0.35);
                    const scale = Phaser.Math.Linear(0.15, 0.35, (p.y - 280) / (1150 - 280));
                    const off = (2412 * scale) / 2 + 20;
                    const login = this.add.text(p.x, p.y - off, p.pseudo, {
                        fontSize: '20px',
                        color: '#ff0000',
                        stroke: '#000000',
                    }).setOrigin(0.5);
                    this.otherPlayers.set(p.id, { login, sprite, ox: p.x, oy: p.y });
                } else {
                    const t = Date.now();
                    const pl = this.otherPlayers.get(p.id);
                    if (!pl) return;
                    pl.sprite.setPosition(p.x, p.y);
                    const scale = Phaser.Math.Linear(0.15, 0.35, (p.y - 280) / (1150 - 280));
                    const off = (2412 * scale) / 2 + 20;
                    pl.login.setPosition(p.x, p.y - off);
                    pl.sprite.setScale(scale);
                    if (t - this.timep < 50) return;
                    this.timep = t;
                    if (p.x !== pl.ox || p.y !== pl.oy) {
                        pl.sprite.setFlipX(p.x < pl.ox);
                        pl.sprite.play('walk-right', true);
                    } else {
                        pl.sprite.stop();
                        pl.sprite.setTexture('nass-front');
                    }
                    pl.ox = p.x;
                    pl.oy = p.y;
                }
            });
        });

        this.player = this.physics.add.sprite(500, 1000, 'nass-front').setScale(0.35);
        this.physics.add.collider(this.player, this.deskGroup);
        this.player.setSize(400, 200).setOffset(680, 2200);

        this.gfx = this.add.graphics().setDepth(9999);
        this.txt = this.add.text(0, 0, '', {
            fontSize: '30px',
            fontStyle: 'bold',
            color: '#111111',
            fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
            wordWrap: { width: 700, useAdvancedWrap: true },
            align: 'center',
        }).setOrigin(0.5, 0.5).setDepth(9999);
        this.gfx.setVisible(false);
        this.txt.setVisible(false);

        this.anims.create({
            key: 'walk-right',
            frames: this.anims.generateFrameNumbers('nass-frame', { start: 2, end: 0 }),
            frameRate: 4,
            repeat: -1,
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

        if (this.gfx.visible) {
            const hy = this.player.y - (2412 * scale) / 2 + 30;
            this.drawChat(this.player.x, hy);
        }
    }
}
