import { Grade, Perm, RoleResolved, RoleSeed } from './types';
import { ROLE_SEEDS } from './roles.enum';

// fonction de résolution de l'héritage des permissions d'un role DEVELOPER -> MODERATOR -> USER
// chaque role recoit ses perms propres + celles de ses parents
export function resolveRoles(defs: RoleSeed[] = ROLE_SEEDS): RoleResolved[] {
	const resolved = new Map<string, Grade>(); // map pour stocker les permissions résolues de chaque role par son nom

	function resolve(def: RoleSeed): Grade {
		if (resolved.has(def.name)) { return resolved.get(def.name)!; } // si le role est déjà résolu, on retourne ses permissions

		let perms = def.own; // on part des permissions propres du role
		for (const parentName of def.parent) { // pour chaque role parent
			const parentDef = defs.find(d => d.name === parentName); // on trouve sa définition dans la liste des defs
			if (parentDef) perms |= resolve(parentDef); // si le parent existe, on résout ses permissions et on les ajoute à celles du role courant
		}

		resolved.set(def.name, perms); // une fois toutes les permissions résolues, on les stocke dans la map
		return perms; // on retourne les permissions résolues du role courant
	}

	for (const def of defs) resolve(def); // on résout tous les roles de la liste des defs
	return defs.map(def => ({ // on retourne une liste de roles résolus avec leur nom et leurs permissions effectives
		name: def.name,
		permissions: resolved.get(def.name)!,
	}));
}

export function getRoleName(grade: Grade): string { // fonction pour obtenir le nom du role le plus élevé correspondant au grade de l'utilisateur
	const roles = resolveRoles(); // on résout les roles pour obtenir leurs permissions effectives
	const sorted = [...roles].sort((a, b) => bitCount(b.permissions) - bitCount(a.permissions)); // on trie les roles par nombre de permissions décroissant
	for (const role of sorted) {
		if ((grade & role.permissions) === role.permissions) return role.name; // on retourne le nom du premier role dont les permissions sont toutes présentes dans le grade de l'utilisateur
	}
	return 'USER'; // si aucun role ne correspond, on retourne USER par défaut
}

export function hasRole(grade: Grade, rolePermissions: Grade): boolean { // vérifie si le grade de l'utilisateur inclut toutes les permissions d'un role donné
	return (grade & rolePermissions) === rolePermissions; // on vérifie que tous les bits de la permission sont présents dans le grade de l'utilisateur
}

function bitCount(n: Grade): number { // fonction pour compter le nombre de bits à 1 dans un bigint
	let count = 0;
	while (n > 0n) { count += Number(n & 1n); n >>= 1n; } // on compte le nombre de bits à 1 dans le bigint en utilisant un masque et un décalage
	return count;
}