'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Hook reutilisable pour se connecter a un namespace socket.io.
// L'origine est lue dans NEXT_PUBLIC_SOCKET_URL (genere par make setup).
// Vide -> socket.io tape l'origine courante (utile en dev derriere nginx).
//
// Usage : const socketRef = useSocket('/world');
//         const gameRef = useSocket('/game');
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? '';

export function useSocket(namespace: string = '/') {
	const socketRef = useRef<Socket | null>(null);

	useEffect(() => {
		// withCredentials envoie le cookie access_token au handshake (auth WS).
		const socket = io(`${SOCKET_URL}${namespace}`, { withCredentials: true });
		socketRef.current = socket;
		return () => {
			socket.disconnect();
			socketRef.current = null;
		};
	}, [namespace]);

	return socketRef;
}
