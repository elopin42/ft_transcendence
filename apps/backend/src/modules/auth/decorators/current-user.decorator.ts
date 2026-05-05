import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from '@/modules/auth/types/jwt-payload.type';

// Sucre syntaxique : @CurrentUser() au lieu de @Req() puis req.user.
// Le payload est garanti pose par JwtStrategy.validate() apres passage du
// JwtAuthGuard global.
export const CurrentUser = createParamDecorator(
	(_data: unknown, ctx: ExecutionContext): JwtPayload => {
		const req = ctx.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
		return req.user as JwtPayload;
	},
);
