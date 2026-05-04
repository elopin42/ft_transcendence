// Source unique de verite des shapes de donnees voyageant entre back et front.
//
// Pourquoi ici plutot que cote backend uniquement :
//   - le frontend hooks (useUser, usePerms) consomme exactement ce que le
//     backend renvoie. Une seule definition -> compile-time check des deux
//     cotes. Si le backend change un champ, le frontend casse au build.
//   - rotation : si on ajoute un champ a UserPublic, on le voit immediatement
//     dans tous les composants qui consomment user.*
//
// Convention : les types ici sont strictement le "wire format" (JSON
// serialise). Donc :
//   - BigInt -> string  (BigInt n'est pas JSON-serialisable, transforme cote
//                        controller via interceptor BigIntSerializer)
//   - Date   -> string  (ISO 8601, format JS natif via JSON.stringify)
//   - bigint  -> string aussi pour Grade (idem BigInt)
//
// La conversion DB -> wire se fait dans les controllers via toUserPublic(),
// toFortyTwoProfilePublic(), etc. (cf. apps/backend/src/modules/users/utils).

import type { Grade, RoleName } from '@ftt/shared/permissions';

// === User ===========================================================

// User retourne au client. Strictement aucune donnee sensible (password,
// secrets 2FA, refresh tokens) ne doit jamais apparaitre dans ce shape.
//
// La whitelist Prisma (omit: { password: true }) garantit qu'on ne leak
// pas si un champ sensible est ajoute au modele plus tard.
export interface UserPublic {
	id: number;
	login: string;
	email: string;
	avatarUrl: string | null;
	profileComplete: boolean;
	grade: string; // BigInt serialise en string (cf. note plus haut)
	roleId: number | null;
	title: string | null;
	points: number;
	createdAt: string; // ISO 8601
	updatedAt: string;
}

// User enrichi avec son role resolu et la liste de ses permissions.
// Utilise quand le client a besoin de savoir ce qu'il a le droit de faire
// (DebugPanel, AdminPanel, boutons conditionnels).
export interface UserMe extends UserPublic {
	role: RolePublic | null;
	effectiveGrade: string; // grade utilisateur OR role.permissions
}

// === Role ===========================================================

export interface RolePublic {
	id: number;
	name: RoleName | string; // RoleName pour les seeds, string pour roles custom
	permissions: string; // BigInt serialise (Grade)
}

// === FortyTwoProfile ================================================

// Donnees publiques de la liaison 42. Pas de token 42 (jamais stocke).
export interface FortyTwoProfilePublic {
	fortyTwoId: number;
	login: string; // login intra
	email: string | null;
	displayName: string | null;
	imageUrl: string | null;
	campus: string | null;
	poolMonth: string | null;
	poolYear: string | null;
	linkedAt: string; // ISO 8601
	refreshedAt: string;
}

// === Session ========================================================

// Une session = un refresh token actif. Affichee sur la page "Mes appareils".
export interface SessionPublic {
	id: number;
	ipAddress: string;
	userAgent: string;
	deviceLabel: string | null; // futur : nom donne par l'utilisateur
	current: boolean; // true pour la session du JWT courant
	twoFactorPending: boolean;
	createdAt: string;
	lastUsedAt: string;
	expiresAt: string;
}

// === Auth response shapes ==========================================

// Reponse de POST /auth/login quand 2FA n'est pas enable.
export interface LoginResponseAuthenticated {
	status: 'authenticated';
	user: UserPublic;
}

// Reponse de POST /auth/login quand 2FA est enable. Le client doit POST
// /auth/2fa/verify avec le code TOTP pour finaliser.
export interface LoginResponseRequires2fa {
	status: 'requires_2fa';
}

export type LoginResponse = LoginResponseAuthenticated | LoginResponseRequires2fa;

// === Re-exports utiles ==============================================
// Le grade et le nom de role sont definis dans permissions/, mais on les
// re-expose ici pour qu'un consommateur frontend n'ait qu'un seul import a
// faire pour tous les types de l'API : `import type { UserPublic, Grade }
// from '@ftt/shared/types'`.

export type { Grade, RoleName };