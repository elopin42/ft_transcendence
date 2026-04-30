import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { resolveRoles } from '@ftt/shared/permissions';
import * as argon2 from 'argon2';

// Seed dev : rôles + 6 comptes simples pour la soutenance et les tests à plusieurs.

// Compte i : email = i@i.com, login = i, password = i
// Bypass volontaire des DTO (qui imposent password 12 chars + complexité) :
// on parle directement à Prisma -> la sécurité reste au niveau API publique,
// ces comptes ne sont créés QUE via ce script.

// Idempotent : upsert -> tu peux relancer make seed autant que tu veux.

// Prisma 7 nécessite un adapter explicit (cohérent avec PrismaService du backend)
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const ARGON2_OPTIONS = {
	type: argon2.argon2id,
	memoryCost: 19456,
	timeCost: 2,
	parallelism: 1,
} as const;

const COUNT = 6;
const DOMAIN_EMAIL = '.com';


// Seed les rôles avec héritage résolu (USER < MODERATOR < DEVELOPER, ADMIN à part).
// resolveRoles() calcule le bitmask final de chaque rôle en cumulant ses parents.
async function seedRoles() {
    console.log('Seed des rôles...');
    const roles = resolveRoles();

    for (const role of roles) {
        await prisma.role.upsert({
            where: { name: role.name },
            update: { permissions: role.permissions },
            create: { name: role.name, permissions: role.permissions },
        });
        // Affiche les perms en binaire pour vérifier visuellement les bits cumulés
        console.log(`${role.name.padEnd(10)} = 0b${role.permissions.toString(2)}`);
    }
}

async function seedUsers() {
    console.log(`\nSeed dev : création de ${COUNT} comptes ${1}/${1}/${1} -> ${COUNT}/${COUNT}/${COUNT}`);

    for (let i = 1; i <= COUNT; i++) {
        const email = `${i}@${i}${DOMAIN_EMAIL}`;
        const login = `${i}`;
        const hashedPassword = await argon2.hash(`${i}`, ARGON2_OPTIONS);

        await prisma.user.upsert({
            where: { email },
            update: { password: hashedPassword },
            create: {
                email,
                login,
                password: hashedPassword,
                profileComplete: true,
                // roleId: null -> user lambda par défaut.
                // À assigner manuellement via Prisma Studio ou query SQL si besoin
                // (ex: user 1 = ADMIN pour tester le DebugPanel plus tard).
            },
        });
        console.log(`${email}  (login: ${login}, password: ${i})`);
    }
}

async function main() {
    await seedRoles();
    await seedUsers();
    console.log(`\nSeed terminé. Connecte-toi avec 1@1${DOMAIN_EMAIL} / 1`);
}

main()
    .catch((error) => {
        console.error('Seed failed:', error);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());