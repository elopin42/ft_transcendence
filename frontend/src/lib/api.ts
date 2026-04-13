// helper centralisé pour les appels API vers le backend
// tout passe par le proxy nginx (/api/...) donc pas besoin de spécifier l'URL complète
// credentials: 'include' envoie les cookies (token httpOnly) automatiquement

const API_BASE = '/api';

// raccourcis pour chaque methode HTTP
// usage : const user = await api.get<User>('/auth/me')
//         await api.post('/auth/login', { email, password })
export const api = {
	get: <T>(endpoint: string) => request<T>(endpoint),
	post: <T>(endpoint: string, body?: unknown) => request<T>(endpoint, { method: 'POST', body }),
	put: <T>(endpoint: string, body?: unknown) => request<T>(endpoint, { method: 'PUT', body }),
	patch: <T>(endpoint: string, body?: unknown) => request<T>(endpoint, { method: 'PATCH', body }),
	delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};

interface FetchOptions {
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
	body?: unknown;
	headers?: Record<string, string>;
}

// fonction principale — tous les autres l'utilisent remplace fetch() directement et évite de passé 'include' à chaque fois
async function request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
	const { method = 'GET', body, headers = {} } = options;

	const config: RequestInit = {
		method,
		credentials: 'include', // envoie le cookie httpOnly a chaque requete
		headers: {
			'Content-Type': 'application/json',
			...headers,
		},
	};
	if (body) config.body = JSON.stringify(body);

	const res = await fetch(`${API_BASE}${endpoint}`, config);
	// si le serveur repond pas en JSON (ex: 204 No Content)
	if (res.status === 204) return {} as T;

	const data = await res.json();
	if (!res.ok) throw new Error(data.message || `Erreur ${res.status}`); // on throw avec le message du back si dispo
	return data as T;
}

