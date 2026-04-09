'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const PhaserGame = dynamic(() => import('./PhaserGame'), { ssr: false });

export default function DashboardPage() {
    const [authorized, setAuthorized] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetch('/api/auth/validate', {
            method: 'POST',
            credentials: 'include',
        })
            .then(res => {
                if (!res.ok) {
                    router.push('/login');
                } else {
                    setAuthorized(true);
                }
            })
            .catch(() => router.push('/login'));
    }, []);

    if (!authorized) return null;

    return <PhaserGame />;
}
