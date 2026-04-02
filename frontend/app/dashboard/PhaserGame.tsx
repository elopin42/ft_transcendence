'use client';
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

class GameScene extends Phaser.Scene {
    preload(){
        this.load.image('map', '/map.png');
        this.load.spritesheet('nass-frame', '/character/nass/nass-allframe-right.png', {
            frameWidth: 1762,
            frameHeight: 2414
        });
        this.load.image('nass-front', '/character/nass/nass-front.png');
    }
    create() {
        const map = this.add.image(0, 0, 'map').setOrigin(0, 0);
        this.scale.resize(map.width, map.height);
        this.add.image(500, 1000, 'nass-front').setScale(0.35);
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
