// ce fichier centralise les routes de l'application pour éviter les hardcodes dans les composants
// si on change une route, on la change ici et c'est appliqué partout
// ca facilite aussi la lecture du code, on voit tout de suite que c'est une route et pas une url externe
// on exporte aussi un tableau des routes publiques pour le proxy (redirections selon auth)


// true = tout le site nécessite une connexion, / redirige vers /auth
export const IS_PRIVATE = false;

export const ROUTES = {
  HOME: '/',
  AUTH: '/auth',
  DASHBOARD: '/dashboard',
  GAME: '/game',
  PRIVACY_POLICY: '/privacy-policy',
  TERMS_OF_SERVICE: '/terms-of-service'
} as const;

export const ROUTES_PUBLIC = [ROUTES.AUTH, ROUTES.PRIVACY_POLICY, ROUTES.TERMS_OF_SERVICE, '/not-found'] as const ;
