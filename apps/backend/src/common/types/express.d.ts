import type { JwtPayload } from '@/modules/auth/types/jwt-payload.type';

// Etend Express.Request.user pour le typer comme JwtPayload apres JWT auth.
// Cas particulier : la strategie 42 retourne FortyTwoProfile dans le callback,
// mais on l'utilise localement (pas via req.user type), donc pas de conflit.
declare global {
	namespace Express {
		interface User extends JwtPayload {}
	}
}

export {};
