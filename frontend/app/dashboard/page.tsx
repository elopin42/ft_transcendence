// charge le jeu mais pas cote serveur
'use client';
import dynamic from 'next/dynamic';

const PhaserGame = dynamic(() => import('./PhaserGame'), { ssr: false });

export default function DashboardPage() {
    return <PhaserGame />;
}