'use client';
import { useLocale } from 'next-intl';
import { api } from '@/lib/api';

// createContext = permet de créer un contexte React
// useContext = permet de consommer un contexte dans un composant enfant
// useEffect = permet d'exécuter du code au montage du composant
// useState = permet de gérer l'état local dans le composant (stocker les informations du user connecté et l'état de chargement)
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// meme interface que backend/src/types/user.ts pour la définition backend du user 42
// dois etre identique !!!
// et sur la db backend/prisma/schema.prisma pour la structure de la table User
interface User {
	id: number;
	login: string;
	email: string;
	imageUrl?: string;
	locale: string; // 'fr' ou 'en', utilisé pour la langue de l'interface a récuperer plus tard dans la db
}


// ce qu'on veut partager dans le context c'est a dire le user et les fonctions de login/logout
// le context c'est juste un objet JS, on va le typer avec TypeScript pour être sûr de ce qu'on met dedans 
// et on vas pouvoir le partager dans toute l'app sans se soucier de la structure des données
interface AuthContextType {
	user: User | null;
	locale: string;
	isLoading: boolean;
	isAuthenticated: boolean;
	login: (email: string, password: string) => Promise<void>;
	register: (email: string, password: string, login: string) => Promise<void>; 
	logout: () => Promise<void>;
	refresh: () => Promise<void>; // re-fetch le user sans recharger la page
}

const AuthContext = createContext<AuthContextType | null>(null); // on crée le context avec une valeur par défaut null, on va le remplir dans le provider

// un provider c'est un composant React qui va envelopper toute l'app et fournir le context à tous les composants enfants
export const AuthProvider = ({ children }: { children: ReactNode }) => {

	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const currentLocale = useLocale(); // 'fr' ou 'en'

	// au montage, on vérifie si le cookie contient un token valide
	// en demandant au back qui est le user connecté
	const fetchUser = async () => {
		try {
			const data = await api.get<User>('/auth/me');
			data.locale = 'fr'; // TODO: retirer cette ligne quand la locale sera stockée en db et renvoyée par le back
			setUser(data);
		} catch {
			// api.get throw si res.ok est false (401, 403, etc.)
			// donc si ca throw = pas connecté ou token expiré
			setUser(null);
			// Optionnel : si data.locale existe et est != currentLocale,
            // on pourrait rediriger ici, mais c'est mieux de laisser le proxy gérer.
		} finally {
			setIsLoading(false); // on a fini de vérifier le token
		}
	};

	// on appelle fetchUser au montage du provider pour savoir si on est connecté ou pas
	useEffect(() => { fetchUser(); }, []);

	const login = async (email: string, password: string) => {
		// api.post throw automatiquement si le back renvoie une erreur
		// le message d'erreur du back est dans le throw (data.message)
		await api.post('/auth/login', { email, password });
		await fetchUser(); // met a jour le context avec le nouveau user
	};

	const register = async (email: string, password: string, login: string) => {
		// inscription + connexion auto : le back cree le user et renvoie un cookie
		await api.post('/auth/register', { email, password, login });
		await fetchUser(); // met a jour le context = user connecté directement
	};

	const logout = async () => {
		try {
			await api.post('/auth/logout');
		} catch {/* ignore — on clear le user quoi qu'il arrive*/ }
		setUser(null);
	};

	// on fournit le context à tous les composants enfants via useContext(AuthContext) dans n'importe quel composant de l'app je sais je me répète 
	return (
		<AuthContext.Provider value={{
			user,
			locale: user?.locale || currentLocale, // On donne la priorité à la pref en DB
			isLoading,
			isAuthenticated: !!user,
			login,
			register,
			logout,
			refresh: fetchUser,
		}}>
			{children}
		</AuthContext.Provider>
	);
}


// export de la fonction pour quelle soit accecible
export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) { throw new Error('useAuth must be used within an AuthProvider'); }
	return context;
}

// racourci pour ne pas avoir à faire const { user, isLoading, isAuthenticated } = useAuth() à chaque fois dans les composants qui ont juste besoin du user
export function useUser() {
	const { user, isLoading, isAuthenticated } = useAuth();
	return { user, isLoading, isAuthenticated };
}