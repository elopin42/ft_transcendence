import { Perm, Grade } from './types';
// toutes les permissions en bitmask pour les combiné mais avec auto asign trop chiant de tout mettre a la main si on en rajoute
// BigInt pour 63 permission max

export const PERM = createPerm([
	// Chat
	'READ_CHAT',        // lire les messages du chat
	'WRITE_CHAT',       // écrire des messages dans le chat
	'EDIT_OWN_MSG',     // modifier ses propres messages
	'DELETE_OWN_MSG',   // supprimer ses propres messages
	'DELETE_ANY_MSG',   // supprimer n'importe quel message (modération)
	'PIN_MSG',          // épingler un message

	// Moderation
	'MUTE_USER', // empêcher un utilisateur de parler dans le chat
	'BAN_USER', // empêcher un utilisateur d'accéder au jeu
	'KICK_USER', // expulser un utilisateur du jeu (temporaire)
	'VIEW_ONLY', // peux voir mais ne peux pas interagir (pour les comptes de test ou les utilisateurs bannis temporairement mais vers les autres pas le jeux)

	// Game
	'CREATE_GAME', // créer une partie
	'JOIN_GAME', // rejoindre une partie
	'SPECTATE', // spectate une partie

	// Debug
	'DEBUG_PANEL', // accès au panneau de debug (logs, stats, etc)
	'VIEW_LOGS', // accès aux logs du serveur

	// Dev
	'DEV_MOD', // accès aux outils de développement (test, debug, etc)

	// Admin
	'MANAGE_USERS', // gérer les utilisateurs (ban, mute, kick, etc)
	'MANAGE_ROLES', // gérer les rôles et leurs permissions
	'DATABASE_ACCESS', // accès direct à la base de données (pour les opérations de maintenance ou de récupération de données)
] as const);

// GROUPES DE PERMISSIONS POUR ETRE PLUS EFFICACE DANS LA GESTION DES ROLES
export const PERM_GROUP = {
	// Chat basique : lire + écrire + modifier/supprimer ses messages
	CHAT_BASE: PERM.READ_CHAT | PERM.WRITE_CHAT | PERM.EDIT_OWN_MSG | PERM.DELETE_OWN_MSG,
	// Chat modération : supprimer n'importe quel message + épingler
	CHAT_MOD: PERM.DELETE_ANY_MSG | PERM.PIN_MSG,

	// Sanctions : mute + ban + kick
	MOD: PERM.MUTE_USER | PERM.BAN_USER | PERM.KICK_USER | PERM.VIEW_ONLY,
	// Game complet
	GAME: PERM.CREATE_GAME | PERM.JOIN_GAME | PERM.SPECTATE,
	// Debug tools
	DEBUG: PERM.DEBUG_PANEL | PERM.VIEW_LOGS,
	// Dev tools
	DEV: PERM.DEV_MOD,
	// Admin tools
	ADMIN: PERM.MANAGE_USERS | PERM.MANAGE_ROLES | PERM.DATABASE_ACCESS,
} as const;

export const PERM_ALL: Grade = Object.values(PERM).reduce((acc, p) => acc | p, 0n); // combinaison de toutes les permissions pour un accès total
export type PermName = keyof typeof PERM; // type pour les noms de permissions
export type PermGroupName = keyof typeof PERM_GROUP; // type pour les noms de groupes de permissions

// pour créer les permissions automatiquement a partir d'une liste de nom
function createPerm<T extends string>(names: readonly T[]): Readonly<Record<T, Perm>> {
	const result = {} as Record<T, bigint>; // result sera un objet avec les noms comme clés et les valeurs comme des puissances de 2
	names.forEach((name, index) => {
		result[name] = 1n << BigInt(index); // on bitshift de 1n (BigInt) pour obtenir la valeur correspondante à chaque permission
	});
	return Object.freeze(result); // on retourne l'objet résultant en le gelant pour éviter les modifications ultérieures
}
