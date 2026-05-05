import { Controller, Get, HttpStatus } from '@nestjs/common';

import { AppException } from '@/common/exceptions/app.exception';
import { ERR } from '@ftt/shared/errors';
import { UsersService } from '@/modules/users/services/users.service';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { JwtPayload } from '@/modules/auth/types/jwt-payload.type';

// Endpoints utilisateurs. Pour l'instant uniquement GET /users/me.
// A etendre plus tard : PATCH /users/me, GET /users/:id, change password, etc.
@Controller('users')
export class UsersController {
	constructor(private readonly users: UsersService) { }

	// Profil du user connecte. Le JwtAuthGuard global a deja valide le token
	// et injecte le payload dans req.user, qu'on extrait via @CurrentUser().
	//
	// findByIdPublic() utilise un select Prisma explicite (whitelist) -> aucun
	// risque de leak du password ou d'un futur champ sensible.
	@Get('me')
	async me(@CurrentUser() payload: JwtPayload) {
		const user = await this.users.findByIdPublic(payload.sub);
		// JWT valide mais user supprime entre temps -> token techniquement invalide.
		if (!user) throw new AppException(ERR.AUTH.TOKEN.INVALID, HttpStatus.UNAUTHORIZED);
		return user;
	}
}
