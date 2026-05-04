const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

export const API_ROUTES = {
	AUTH: {
		REGISTER: `${API_BASE}/auth/register`,
		LOGIN: `${API_BASE}/auth/login`,
		LOGOUT: `${API_BASE}/auth/logout`,
		ME: `${API_BASE}/auth/me`,
		REFRESH: `${API_BASE}/auth/refresh`,
	},
	OAUTH_42: {
		LOGIN: `${API_BASE}/auth/42`,
		STATUS: `${API_BASE}/auth/42/status`,
	},
	USERS: {
		ME: `${API_BASE}/users/me`,
	},
	TWO_FA: {
		SETUP: `${API_BASE}/2fa/setup`,
		ENABLE: `${API_BASE}/2fa/enable`,
		VERIFY: `${API_BASE}/2fa/verify`,
		DISABLE: `${API_BASE}/2fa/disable`,
		BACKUP_CODES: `${API_BASE}/2fa/backup-codes`,
	},
	SESSIONS: {
		LIST: `${API_BASE}/auth/sessions`,
		REVOKE: (id: number) => `${API_BASE}/auth/sessions/${id}`,
	},
} as const;
