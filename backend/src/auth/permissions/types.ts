// les types de permission on utilise des bitmask donc si on veut agrandir on agrandi ici
export type Perm = bigint; // bigint pour la plage qui passe de 32-1 a 64-1

export type Grade = bigint; // grade de l'utilisateur qui est la combinaison de tout les permissions de ses roles
// aucune permission def
export const GRADE_ZERO: Grade = 0n;

// interface Role comme en DB
export interface Role {
	id: number;
	name: string;
	permissions: Grade;
}

// interface Role avant seed pour les valeurs par defaut
export interface RoleSeed {
	name: string;
	parent: string[]; // les roles parents dont il hérite des permissions
	own: Grade;
}

// interface de resolution de l'héritage des permissions d'un role
export interface RoleResolved {
	name: string;
	permissions: Grade;
}