import { RoleSeed } from './types';
import { PERM_ALL, PERM_GROUP } from './permission.enum';

// Roles par defaut avec heritage parent
// own = permissions propres (pas heritées des parents)
// Le bitmask final est calculé par resolveRoles() dans roles.helper.ts
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