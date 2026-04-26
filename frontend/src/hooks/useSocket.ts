// Prend un namespace en paramètre ('world', 'game')
// Gère la connexion, la déconnexion propre au unmount
// Retourne le socket prêt à l'emploi
// Un seul endroit qui gère la config (withCredentials etc.)

'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// hook réutilisable pour se connecter à un namespace socket.io
// usage : const socket = useSocket('/world');
//         const gameSocket = useSocket('/game');
export function useSocket(namespace: string = '/') {
	const socketRef = useRef<Socket | null>(null);

	useEffect(() => {
		// connexion au namespace avec les cookies (pour l'auth)
		const socket = io(namespace, { withCredentials: true });
		socketRef.current = socket; // on stocke le socket dans la ref pour pouvoir l'utiliser dans les autres fonctions du composant
		return () => {
			socket.disconnect(); // on se déconnecte proprement au unmount du composant pour éviter les fuites de mémoire et les connexions fantômes
			socketRef.current = null; // on nettoie la ref
		};
	}, [namespace]); // on se reconnecte si le namespace change

	return socketRef; // on retourne le socket prêt à l'emploi (ou null si pas encore connecté)
}