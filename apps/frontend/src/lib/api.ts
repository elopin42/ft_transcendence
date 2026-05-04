
// helper centralisé pour les appels API vers le backend
// tout passe par le proxy nginx (/api/...) donc pas besoin de spécifier l'URL complète
// credentials: 'include' envoie les cookies (token httpOnly) automatiquement

// raccourcis par methode HTTP
// usage : const user = await api.get<User>(API_ROUTES.USERS.ME)
//         await api.post(API_ROUTES.AUTH.LOGIN, { email, password })
export const api = {
	get: <T>(url: string) => request<T>(url),
	post: <T>(url: string, body?: unknown) => request<T>(url, { method: 'POST', body }),
	put: <T>(url: string, body?: unknown) => request<T>(url, { method: 'PUT', body }),
	patch: <T>(url: string, body?: unknown) => request<T>(url, { method: 'PATCH', body }),
	delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};


interface FetchOptions {
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
	body?: unknown;
	headers?: Record<string, string>;
}

// fonction principale - tous les autres l'utilisent remplace fetch() directement et évite de passé 'include' à chaque fois
async function request<T>(url: string, options: FetchOptions = {}): Promise<T> {
	const { method = 'GET', body, headers = {} } = options;

	const config: RequestInit = {
		method,
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			...headers,
		},
	};

	if (body) config.body = JSON.stringify(body);

	const res = await fetch(url, config);

	if (!res.ok) {
		// recupere le message d'erreur du back si dispo
		const data = await res.json().catch(() => ({}));
		throw new Error(data.message || `Request failed with status ${res.status}`);
	}

	return res.json();
}

