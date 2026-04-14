// ce fichier centralise les routes de l'application pour éviter les hardcodes dans les composants
// si on change une route, on la change ici et c'est appliqué partout
// ca facilite aussi la lecture du code, on voit tout de suite que c'est une route et pas une url externe
// on exporte aussi un tableau des routes publiques pour le proxy (redirections selon auth)


// true = tout le site nécessite une connexion, / redirige vers /auth
export const IS_PRIVATE = false;

export const ROUTES = {
  HOME: '/',
  AUTH: '/auth',       // etait /login
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
} as const;

export const ROUTES_PUBLIC = ['/auth', '/register', '/not-found'] as const ;