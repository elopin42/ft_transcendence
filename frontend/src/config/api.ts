// toutes les routes du backend
// /api est le prefixe utilisé par nginx pour proxy vers NestJS
// si on change le prefixe nginx un jour, on le change ici seulement

const API_BASE = '/api';

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
} as const;
