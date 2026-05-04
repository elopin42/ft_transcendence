// la protection de cette page est gérée par proxy.ts (middleware Next.js)
// pas besoin de vérification côté client — si le token est invalide,
// le middleware redirige vers /login avant que cette page ne se charge
'use client';
import dynamic from 'next/dynamic';

const GameFoot = dynamic(() => import('@/components/game/GameFoot'), { ssr: false });

export default function GamePage() {
    return <GameFoot />;
}
