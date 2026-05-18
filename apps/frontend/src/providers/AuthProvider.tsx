'use client';
import { useLocale } from 'next-intl';
import { api } from '@/lib/api';
import { API_ROUTES } from '@/config/api';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface User {
	id: number;
	login: string;
	email: string;
	imageUrl?: string;
}

interface AuthContextType {
	user: User | null;
	isLoading: boolean;
	isAuthenticated: boolean;
	login: (email: string, password: string) => Promise<void>;
	register: (email: string, password: string, login: string) => Promise<void>;
	logout: () => Promise<void>;
	refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const currentLocale = useLocale();

	const fetchUser = async () => {
		try {
			const data = await api.get<User>(API_ROUTES.USERS.ME);
			setUser(data);
		} catch {
			setUser(null);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => { fetchUser(); }, []);

	const login = async (email: string, password: string) => {
		await api.post(API_ROUTES.AUTH.LOGIN, { email, password });
		await fetchUser();
	};

	const register = async (email: string, password: string, login: string) => {
		await api.post(API_ROUTES.AUTH.REGISTER, { email, password, login });
		await fetchUser();
	};

	const logout = async () => {
		try { await api.post(API_ROUTES.AUTH.LOGOUT); } catch { }
		setUser(null);
	};

	return (
		<AuthContext.Provider value={{
			user,
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

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) { throw new Error('useAuth must be used within an AuthProvider'); }
	return context;
}

export function useUser() {
	const { user, isLoading, isAuthenticated } = useAuth();
	return { user, isLoading, isAuthenticated };
}