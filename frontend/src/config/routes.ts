// config/routes.ts
export const ROUTES = {
  HOME: '/',
  AUTH: '/auth',       // etait /login
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
} as const;

export const ROUTES_PUBLIC = ['/auth', '/register', '/not-found'] as const ;