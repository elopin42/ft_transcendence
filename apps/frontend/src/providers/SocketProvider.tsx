'use client';

// TODO: SocketProvider — a implémenter quand plusieurs composants
// auront besoin du meme socket (chat + game + notifications)
//
// Principe :
// - un seul socket par namespace, partagé via context
// - le provider se connecte au mount, deconnecte au unmount
// - les composants font useSocket('/world') et recoivent tous le meme socket
//
// Quand l'implémenter :
// - des qu'un 2eme composant a besoin du meme namespace
// - ex: chat sidebar + game scene utilisent '/world'
//
// Structure prévue :
// - SocketProvider wrap les children dans le layout (comme AuthProvider)
// - useSocket(namespace) retourne le socket du context au lieu d'en creer un
// - le provider gere la reconnexion automatique si deconnexion
// - le provider gere l'auth (envoie le token au handshake)

import { createContext, useContext, ReactNode } from 'react';
import { Socket } from 'socket.io-client';

interface SocketContextType {
	getSocket: (namespace: string) => Socket | null;
	// TODO: ajouter isConnected, reconnect, etc.
}

const SocketContext = createContext<SocketContextType | null>(null);

// export pour quand on l'implementera
export function useSocketContext() {
	const context = useContext(SocketContext);
	if (!context) throw new Error('useSocketContext doit etre dans un SocketProvider');
	return context;
}