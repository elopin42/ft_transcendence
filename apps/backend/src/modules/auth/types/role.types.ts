// Re-export local. Source de verite : packages/shared/permissions/index.ts
// (consomme aussi par le frontend).
// Conserve ici car certains anciens imports backend pointent encore sur
// @/modules/auth/types/role.types ; a terme, importer directement
// @ftt/shared/permissions et supprimer ce fichier.
import type { Grade } from '@ftt/shared/permissions';
export type { Perm, Grade, RoleSeed, RoleResolved } from '@ftt/shared/permissions';
export { GRADE_ZERO } from '@ftt/shared/permissions';

// Forme Role (ligne en DB) — alias local conserve pour compat.
export interface Role {
	id: number;
	name: string;
	permissions: Grade;
}
