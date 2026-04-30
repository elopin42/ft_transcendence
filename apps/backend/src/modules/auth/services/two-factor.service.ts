import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateSecret, generateURI } from 'otplib';
// `verify` importe directement depuis @otplib/totp pour le type VerifyResult
// specifique TOTP (timeStep). Le verify d'otplib racine retourne TOTP|HOTP, on
// veut le type plus precis.
import { verify } from '@otplib/totp';
import { crypto as nobleCrypto } from '@otplib/plugin-crypto-noble';
import { base32 as scureBase32 } from '@otplib/plugin-base32-scure';
import { toDataURL } from 'qrcode';
import { randomBytes } from 'node:crypto';

import { AppException } from '@/common/exceptions/app.exception';
import { ERR } from '@ftt/shared/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PasswordService } from '@/modules/auth/services/password.service';
import { encrypt, decrypt } from '@/common/utils/crypto';
import type { EnvConfig } from '@/common/config/env.config';

// 2FA TOTP conforme RFC 6238 (Time-based One-Time Password Algorithm) :
//   - HMAC-SHA-1 (defauts otplib, suffisant pour TOTP cf. RFC 6238 sec. 1.2)
//   - Pas de fenetre 30s, code a 6 chiffres
//   - Tolerance d'horloge configurable (epochTolerance)
//
// Secret stocke chiffre AES-256-GCM (NIST SP 800-38D) en DB. Sans la cle de
// chiffrement (TWO_FA_ENCRYPTION_KEY), un dump de DB ne donne rien.
//
// 10 backup codes hashes argon2id (RFC 9106) avant stockage. Format hex 8 chars
// = 32 bits d'entropie par code (~4.3 milliards de combinaisons), suffisant
// vu le throttle des routes 2fa.
@Injectable()
export class TwoFactorService {
	private readonly logger = new Logger(TwoFactorService.name);
	private readonly issuer = 'ft_transcendence';

	constructor(
		private readonly prisma: PrismaService,
		private readonly password: PasswordService,
		private readonly config: ConfigService<EnvConfig, true>,
	) { }

	// === PUBLIC

	// Genere secret + QR. enabled=false jusqu'a verification du 1er code par
	// enable(), ce qui evite qu'un user "oublie" sa 2FA active sans avoir
	// jamais teste son authenticator.
	async setup(userId: number, userEmail: string): Promise<{ secret: string; qrCode: string; otpauth: string }> {
		const secret = generateSecret();
		const otpauth = generateURI({ label: userEmail, issuer: this.issuer, secret });
		const qrCode = await toDataURL(otpauth);

		await this.prisma.twoFactorAuth.upsert({
			where: { userId },
			update: { secret: this.encryptSecret(secret), enabled: false },
			create: { userId, secret: this.encryptSecret(secret), enabled: false, backupCodes: [] },
		});

		return { secret, qrCode, otpauth };
	}

	// Active la 2FA apres verif stricte (tolerance 0) du 1er code TOTP.
	// Le user vient de scanner -> son telephone est synchro, pas de raison
	// d'accepter du drift d'horloge a ce moment.
	async enable(userId: number, code: string): Promise<{ backupCodes: string[] }> {
		const tfa = await this.findOrFail(userId);
		const ok = (await this.verifyTotpCode(this.decryptSecret(tfa.secret), code, undefined, 0)).valid;
		if (!ok) {
			this.logger.warn(`Failed 2FA enable attempt user=${userId}`);
			throw new AppException(ERR.TWO_FA.INVALID_CODE, HttpStatus.UNAUTHORIZED);
		}

		const plainCodes = this.generateBackupCodes();
		const hashedCodes = await Promise.all(plainCodes.map((c) => this.password.hash(c)));

		await this.prisma.twoFactorAuth.update({
			where: { userId },
			data: { enabled: true, enabledAt: new Date(), backupCodes: hashedCodes },
		});

		return { backupCodes: plainCodes };
	}

	// Verif 2FA au login. Transaction Serializable -> pas de double-acceptation
	// si deux requetes concurrentes presentent le meme code TOTP (anti-race).
	async verify(userId: number, code: string): Promise<boolean> {
		return this.prisma.$transaction(async (tx) => {
			const tfa = await tx.twoFactorAuth.findUnique({ where: { userId } });
			if (!tfa) throw new AppException(ERR.TWO_FA.NOT_ENABLED, HttpStatus.NOT_FOUND);
			if (!tfa.enabled) throw new AppException(ERR.TWO_FA.NOT_ENABLED, HttpStatus.BAD_REQUEST);

			// 1. TOTP avec anti-replay : afterTimeStep d'otplib refuse tout code
			// dont le timeStep est <= au dernier accepte. Combine avec lastTotpStep
			// stocke en DB, on garantit qu'un meme code ne peut servir deux fois.
			const lastStep = tfa.lastTotpStep !== null ? Number(tfa.lastTotpStep) : undefined;
			const result = await this.verifyTotpCode(this.decryptSecret(tfa.secret), code, lastStep);
			if (result.valid) {
				if (result.delta !== 0) this.logger.debug(`TOTP drift user=${userId} delta=${result.delta}`);
				await tx.twoFactorAuth.update({
					where: { userId },
					data: { lastTotpStep: BigInt(result.timeStep), lastUsedAt: new Date() },
				});
				return true;
			}

			// 2. Fallback backup codes (usage unique). On retire le code consomme
			// du tableau pour empecher sa reutilisation.
			for (let i = 0; i < tfa.backupCodes.length; i++) {
				if (await this.password.verify(tfa.backupCodes[i], code)) {
					const remaining = tfa.backupCodes.filter((_, idx) => idx !== i);
					await tx.twoFactorAuth.update({
						where: { userId },
						data: { backupCodes: remaining, lastUsedAt: new Date() },
					});
					this.logger.warn(`Backup code used user=${userId} remaining=${remaining.length}`);
					return true;
				}
			}
			return false;
		}, { isolationLevel: 'Serializable' });
	}

	// Suppression complete de la 2FA. Le controller doit avoir verifie le
	// password de l'user avant d'appeler — sinon un attaquant ayant vole une
	// session active pourrait desactiver la 2FA et garder l'acces.
	async disable(userId: number): Promise<void> {
		await this.prisma.twoFactorAuth.delete({ where: { userId } });
	}

	async regenerateBackupCodes(userId: number): Promise<string[]> {
		const plainCodes = this.generateBackupCodes();
		const hashedCodes = await Promise.all(plainCodes.map((c) => this.password.hash(c)));
		await this.prisma.twoFactorAuth.update({
			where: { userId },
			data: { backupCodes: hashedCodes },
		});
		return plainCodes;
	}

	// Lu par AuthService.login() pour brancher le flow requires_2fa
	// (pose le cookie pending au lieu des cookies access/refresh standards).
	async isEnabled(userId: number): Promise<boolean> {
		const tfa = await this.prisma.twoFactorAuth.findUnique({ where: { userId } });
		return tfa?.enabled ?? false;
	}

	// === PRIVATE

	private async findOrFail(userId: number) {
		const tfa = await this.prisma.twoFactorAuth.findUnique({ where: { userId } });
		if (!tfa) throw new AppException(ERR.TWO_FA.NOT_ENABLED, HttpStatus.NOT_FOUND);
		return tfa;
	}

	private encryptSecret(secret: string): string {
		return encrypt(secret, this.config.get('TWO_FA_ENCRYPTION_KEY', { infer: true }));
	}

	private decryptSecret(payload: string): string {
		return decrypt(payload, this.config.get('TWO_FA_ENCRYPTION_KEY', { infer: true }));
	}

	// epochTolerance [past, future] : tolere un decalage d'horloge.
	// [5, 0] = on accepte les codes du dernier 5s passe, mais pas du futur.
	// Justification cf. RFC 6238 section 5.2 (transmission delay).
	//
	// afterTimeStep : anti-replay natif d'otplib. Refuse tout token dont le
	// timeStep est <= au dernier utilise.
	private async verifyTotpCode(
		secret: string,
		code: string,
		afterTimeStep?: number,
		epochTolerance: number | [number, number] = [5, 0],
	) {
		return verify({
			secret,
			token: code,
			crypto: nobleCrypto,
			base32: scureBase32,
			epochTolerance,
			afterTimeStep,
		});
	}

	// 10 codes hex de 8 chars = 32 bits d'entropie par code (~4.3e9). Combine
	// avec le throttle sur /2fa/verify (5 essais/15min), brute force impossible.
	private generateBackupCodes(): string[] {
		return Array.from({ length: 10 }, () => randomBytes(4).toString('hex'));
	}
}
