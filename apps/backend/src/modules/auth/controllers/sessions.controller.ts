import { Controller, Delete, Get, HttpStatus, Param, ParseIntPipe } from '@nestjs/common';

import { AppException } from '@/common/exceptions/app.exception';
import { ERR } from '@ftt/shared/errors';
import { SessionService } from '@/modules/auth/services/session.service';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { JwtPayload } from '@/modules/auth/types/jwt-payload.type';
import type { SessionPublic } from '@/modules/auth/types/session-public.type';

// Endpoints de gestion des sessions actives (page "Mes appareils" cote front).
//
// Routes :
//   GET    /auth/sessions       -> liste des sessions actives du user
//   DELETE /auth/sessions/:id   -> revoque une session specifique
@Controller('auth/sessions')
export class SessionsController {
	constructor(private readonly session: SessionService) { }

	// Liste les sessions actives du user authentifie. Le JwtAuthGuard global
	// a deja valide le token et injecte le payload dans req.user.
	@Get()
	async list(@CurrentUser() payload: JwtPayload): Promise<SessionPublic[]> {
		const sessions = await this.session.findActiveByUserId(payload.sub);
		return sessions.map(s => ({
			id: s.id,
			ipAddress: s.ipAddress,
			userAgent: s.userAgent,
			createdAt: s.createdAt,
			lastUsedAt: s.lastUsedAt,
			expiresAt: s.expiresAt,
		}));
	}

	// Revoque une session specifique (deconnexion d'un appareil distant).
	// Anti-IDOR : on verifie que la session appartient bien au user authentifie.
	// Code identique pour "pas trouvee" ET "pas a toi" -> empeche un attaquant
	// d'enumerer les ids de sessions existants en bruteforce.
	@Delete(':id')
	async revoke(@CurrentUser() payload: JwtPayload, @Param('id', ParseIntPipe) id: number) {
		const target = await this.session.findById(id);
		if (!target || target.userId !== payload.sub) {
			throw new AppException(ERR.USER.PERMISSION_DENIED, HttpStatus.FORBIDDEN);
		}
		await this.session.revokeById(id);
		return { success: true };
	}
}
