import { PrismaClient } from '@prisma/client';
import { resolveRoles } from '@/auth/permissions/roles.helper';

const prisma = new PrismaClient();

async function main() {
	const roles = resolveRoles();

	for (const role of roles) {
		await prisma.role.upsert({ // upsert pour éviter les doublons si on relance le seed plusieurs fois
			where: { name: role.name },
			update: { permissions: role.permissions },
			create: { name: role.name, permissions: role.permissions },
		});
		console.log(`  ${role.name} = ${role.permissions} (0b${role.permissions.toString(2)})`); // Affiche les permissions en binaire pour vérifier les bits
	}
	console.log('Roles seeded successfully');
}

main().finally(() => prisma.$disconnect());