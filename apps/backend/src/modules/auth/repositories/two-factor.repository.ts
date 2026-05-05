import { Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@prisma/client';

import { PrismaService } from '@/common/prisma/prisma.service';

// Repository TwoFactorAuth : encapsule TOUTES les queries Prisma sur la
// table TwoFactorAuth. Toutes les methodes acceptent un parametre `tx`
// optionnel pour pouvoir s'inscrire dans une transaction Serializable
// (utilise par TwoFactorService.verify() pour l'anti-race sur le code TOTP).
//
// Pattern Repository -- cf. docs/01-ARCHITECTURE.md
@Injectable()
export class TwoFactorRepository {
	constructor(private readonly prisma: PrismaService) { }

	// `tx` est typed comme le client Prisma (avec ou sans transaction). En
	// passant `tx ?? this.prisma`, on appelle soit le client transactionnel
	// soit le client global selon le contexte.
	private client(tx?: Prisma.TransactionClient): Prisma.TransactionClient | PrismaClient {
		return (tx ?? (this.prisma as unknown as PrismaClient));
	}

	// === READ

	findByUserId(userId: number, tx?: Prisma.TransactionClient) {
		return this.client(tx).twoFactorAuth.findUnique({ where: { userId } });
	}

	// === WRITE

	// Setup : cree ou re-setup la 2FA. Reset enabled=false jusqu'a verification
	// du 1er code TOTP par enable() -- evite qu'un user "oublie" sa 2FA active
	// sans l'avoir testee.
	upsertSetup(userId: number, encryptedSecret: string, tx?: Prisma.TransactionClient) {
		return this.client(tx).twoFactorAuth.upsert({
			where: { userId },
			update: { secret: encryptedSecret, enabled: false },
			create: { userId, secret: encryptedSecret, enabled: false, backupCodes: [] },
		});
	}

	// Active la 2FA apres verif du 1er code (cf. TwoFactorService.enable()).
	enable(userId: number, hashedBackupCodes: string[], tx?: Prisma.TransactionClient) {
		return this.client(tx).twoFactorAuth.update({
			where: { userId },
			data: { enabled: true, enabledAt: new Date(), backupCodes: hashedBackupCodes },
		});
	}

	// Met a jour lastTotpStep (anti-replay) + lastUsedAt. Appele dans la
	// transaction Serializable de verify().
	updateAfterTotpVerify(userId: number, timeStep: bigint, tx?: Prisma.TransactionClient) {
		return this.client(tx).twoFactorAuth.update({
			where: { userId },
			data: { lastTotpStep: timeStep, lastUsedAt: new Date() },
		});
	}

	// Consomme un backup code (le retire du tableau).
	consumeBackupCode(userId: number, remainingCodes: string[], tx?: Prisma.TransactionClient) {
		return this.client(tx).twoFactorAuth.update({
			where: { userId },
			data: { backupCodes: remainingCodes, lastUsedAt: new Date() },
		});
	}

	// Regenere les backup codes (apres un regenerateBackupCodes()).
	updateBackupCodes(userId: number, hashedBackupCodes: string[], tx?: Prisma.TransactionClient) {
		return this.client(tx).twoFactorAuth.update({
			where: { userId },
			data: { backupCodes: hashedBackupCodes },
		});
	}

	// Suppression complete de la 2FA. Appele apres re-verif du password.
	delete(userId: number, tx?: Prisma.TransactionClient) {
		return this.client(tx).twoFactorAuth.delete({ where: { userId } });
	}
}
