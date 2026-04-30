// Source unique de verite pour les permissions et les roles.
//
// Partage backend + frontend via @ftt/shared/permissions. Le backend
// utilise PERM/PERM_GROUP/ROLE_SEEDS pour seeder la DB et evaluer les guards.
// Le frontend reutilise les memes constantes pour cacher les boutons que
// l'utilisateur n'a pas le droit d'utiliser (UI = mirroir du backend, pas
// source de verite).
//
// Modele : bitmask facon Discord. Une permission = un bit. Un grade = un
// bitmask de permissions cumule (perso + role). 63 bits dispo dans un
// BigInt -> 63 permissions max sans changement de structure.
//
// Ajouter une permission :
//   1. Ajouter le nom dans la liste createPerm([...])
//   2. Si elle entre dans un groupe existant : ajouter au groupe ci-dessous
//   3. Sinon : creer un groupe et l'attacher a un ROLE_SEED si necessaire
//   4. Lancer `make seed` pour que les roles en DB recoivent le nouveau bit

// === Types ==========================================================

export type Perm = bigint;
export type Grade = bigint;
export const GRADE_ZERO: Grade = 0n;

export interface RoleSeed {
	name: string;
	parent: string[]; // roles parents dont on herite (resolveRoles cumule)
	own: Grade; // permissions propres au role
}

export interface RoleResolved {
	name: string;
	permissions: Grade; // bitmask final apres heritage
}

// === Permissions atomiques ==========================================

export const PERM = createPerm([
	// Chat
	'READ_CHAT',
	'WRITE_CHAT',
	'EDIT_OWN_MSG',
	'DELETE_OWN_MSG',
	'DELETE_ANY_MSG',
	'PIN_MSG',
	// Moderation
	'MUTE_USER',
	'BAN_USER',
	'KICK_USER',
	'VIEW_ONLY', // peut regarder mais pas interagir (compte test, ban temporaire)
	// Game
	'CREATE_GAME',
	'JOIN_GAME',
	'SPECTATE',
	// Debug
	'DEBUG_PANEL', // accede au panneau debug runtime (logs, toggles)
	'VIEW_LOGS', // lit les logs serveur via WS
	// Dev
	'DEV_MODE', // outils dev (test routes, query brutes)
	// Admin
	'MANAGE_USERS', // ban / mute / kick / change role
	'MANAGE_ROLES', // edit perms d'un role existant
	'DATABASE_ACCESS', // operations directes en DB (maintenance)
] as const);

export type PermName = keyof typeof PERM;

// === Groupes (composes pour eviter de tout lister a la main) =======

export const PERM_GROUP = {
	// Chat
	CHAT_BASE: PERM.READ_CHAT | PERM.WRITE_CHAT | PERM.EDIT_OWN_MSG | PERM.DELETE_OWN_MSG,
	CHAT_MOD: PERM.DELETE_ANY_MSG | PERM.PIN_MSG,
	// Sanctions
	MOD: PERM.MUTE_USER | PERM.BAN_USER | PERM.KICK_USER | PERM.VIEW_ONLY,
	// Game
	GAME: PERM.CREATE_GAME | PERM.JOIN_GAME | PERM.SPECTATE,
	// Debug / dev
	DEBUG: PERM.DEBUG_PANEL | PERM.VIEW_LOGS,
	DEV: PERM.DEV_MODE,
	// Admin
	ADMIN: PERM.MANAGE_USERS | PERM.MANAGE_ROLES | PERM.DATABASE_ACCESS,
} as const;

export type PermGroupName = keyof typeof PERM_GROUP;

// Cumul de toutes les permissions atomiques (utilise par le role ADMIN).
export const PERM_ALL: Grade = Object.values(PERM).reduce((acc, p) => acc | p, GRADE_ZERO);

// === Roles par defaut ==============================================
//
// Heritage : USER < MODERATOR < DEVELOPER. ADMIN est independant et
// recoit PERM_ALL directement (cumul de tous les bits).
export const ROLE_SEEDS: RoleSeed[] = [
	{
		name: 'USER',
		parent: [],
		own: PERM_GROUP.CHAT_BASE | PERM_GROUP.GAME,
	},
	{
		name: 'MODERATOR',
		parent: ['USER'],
		own: PERM_GROUP.CHAT_MOD | PERM_GROUP.MOD,
	},
	{
		name: 'DEVELOPER',
		parent: ['MODERATOR'],
		own: PERM_GROUP.DEBUG | PERM_GROUP.DEV,
	},
	{
		name: 'ADMIN',
		parent: [],
		own: PERM_ALL,
	},
];

export type RoleName = typeof ROLE_SEEDS[number]['name'];

// === Helpers : verifications =======================================

export function hasPerm(grade: Grade, perm: Perm): boolean {
	return (grade & perm) !== GRADE_ZERO;
}

export function hasAllPerms(grade: Grade, ...perms: Perm[]): boolean {
	const mask = perms.reduce((acc, p) => acc | p, GRADE_ZERO);
	return (grade & mask) === mask;
}

export function hasRole(grade: Grade, rolePermissions: Grade): boolean {
	return (grade & rolePermissions) === rolePermissions;
}

// === Helpers : modifications de grade ==============================

export function addPerm(grade: Grade, ...perms: Perm[]): Grade {
	return perms.reduce((acc, p) => acc | p, grade);
}

export function removePerm(grade: Grade, ...perms: Perm[]): Grade {
	return perms.reduce((acc, p) => acc & ~p, grade);
}

export function effectiveGrade(userGrade: Grade, rolePermissions: Grade): Grade {
	return userGrade | rolePermissions;
}

// === Helpers : conversions JWT ====================================
// Le payload JWT n'aime pas BigInt -> on serialise en number quand le grade
// rentre dans un Number safe. Cap a MAX_SAFE_INTEGER (= 2^53-1) qui couvre
// 53 permissions, suffisant tant qu'on reste sous 53 bits.

export function gradeToNumber(grade: Grade): number {
	if (grade > BigInt(Number.MAX_SAFE_INTEGER)) {
		throw new Error('Grade exceeds MAX_SAFE_INTEGER (>53 perms cumulees)');
	}
	return Number(grade);
}

export function numberToGrade(num: number): Grade {
	return BigInt(num);
}

// === Helpers : listing pour debug / UI =============================

export function listPerms(grade: Grade): PermName[] {
	return (Object.entries(PERM) as [PermName, Perm][])
		.filter(([, value]) => (grade & value) !== GRADE_ZERO)
		.map(([name]) => name);
}

export function listGroups(grade: Grade): PermGroupName[] {
	return (Object.entries(PERM_GROUP) as [PermGroupName, Perm][])
		.filter(([, mask]) => (grade & mask) === mask)
		.map(([name]) => name);
}

// === Resolution de l'heritage des roles ============================
//
// Un seed declare ses perms propres + une liste de parents. resolveRoles
// calcule le bitmask final de chaque role en cumulant recursivement, et
// retourne la liste prete a etre seedee en DB.
export function resolveRoles(defs: RoleSeed[] = ROLE_SEEDS): RoleResolved[] {
	const resolved = new Map<string, Grade>();

	function resolve(def: RoleSeed): Grade {
		if (resolved.has(def.name)) return resolved.get(def.name)!;
		let perms = def.own;
		for (const parentName of def.parent) {
			const parentDef = defs.find((d) => d.name === parentName);
			if (parentDef) perms |= resolve(parentDef);
		}
		resolved.set(def.name, perms);
		return perms;
	}

	for (const def of defs) resolve(def);
	return defs.map((def) => ({
		name: def.name,
		permissions: resolved.get(def.name)!,
	}));
}

// Donne le nom du role le plus eleve dont l'utilisateur a TOUTES les
// permissions. Tri par nombre de bits decroissant -> ADMIN d'abord.
export function getRoleName(grade: Grade): RoleName | 'USER' {
	const roles = resolveRoles();
	const sorted = [...roles].sort((a, b) => bitCount(b.permissions) - bitCount(a.permissions));
	for (const role of sorted) {
		if ((grade & role.permissions) === role.permissions) return role.name as RoleName;
	}
	return 'USER';
}

function bitCount(n: Grade): number {
	let count = 0;
	while (n > 0n) {
		count += Number(n & 1n);
		n >>= 1n;
	}
	return count;
}

// === Internals =====================================================

// Genere un objet { NAME: 1n << index } a partir d'une liste de noms.
// Empeche les collisions (TS verifie l'unicite via le type) et garantit
// que chaque permission a son bit unique.
function createPerm<T extends string>(names: readonly T[]): Readonly<Record<T, Perm>> {
	const result = {} as Record<T, bigint>;
	names.forEach((name, index) => {
		result[name] = 1n << BigInt(index);
	});
	return Object.freeze(result);
}