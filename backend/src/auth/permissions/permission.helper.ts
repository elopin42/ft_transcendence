import { Grade, Perm, GRADE_ZERO } from './types';
import { PERM, PermName, PERM_GROUP, PermGroupName } from './permission.enum';

// Vérifications

export function hasPerm(grade: Grade, perm: Perm): boolean {
	return (grade & perm) !== GRADE_ZERO;
}

export function hasAllPerms(grade: Grade, ...perms: Perm[]): boolean {
	const mask = perms.reduce((acc, p) => acc | p, GRADE_ZERO);
	return (grade & mask) === mask;
}

// Modifications

export function addPerm(grade: Grade, ...perms: Perm[]): Grade {
	return perms.reduce((acc, p) => acc | p, grade);
}

export function removePerm(grade: Grade, ...perms: Perm[]): Grade {
	return perms.reduce((acc, p) => acc & ~p, grade);
}

// Grade effectif

export function effectiveGrade(userGrade: Grade, rolePermissions: Grade): Grade {
	return userGrade | rolePermissions;
}

// Conversion BigInt to number (pour JWT)

export function gradeToNumber(grade: Grade): number {
	if (grade > BigInt(Number.MAX_SAFE_INTEGER)) {
		throw new Error('Grade exceeds MAX_SAFE_INTEGER');
	}
	return Number(grade);
}

export function numberToGrade(num: number): Grade {
	return BigInt(num);
}

// Listage

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