import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCode } from '@ftt/shared/errors';

// Exception metier de l'app. Transporte un ErrorCode (cf. @ftt/shared/errors)
// + un status HTTP. Le GlobalExceptionFilter relit cette structure pour formater
// la response.
//
// Usage typique :
//   throw new AppException(ERR.AUTH.LOGIN.INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED);
//   throw new AppException(ERR.TWO_FA.INVALID_CODE, HttpStatus.UNAUTHORIZED, 'optional human msg');
//
// Toujours preferer AppException a UnauthorizedException / ForbiddenException
// nus : on a un ErrorCode explicite que le front peut traduire (i18n) et sur
// lequel il peut brancher une logique (ex: refresh auto sur AUTH.TOKEN.EXPIRED).
export class AppException extends HttpException {
	constructor(
		public readonly code: ErrorCode,
		public readonly httpStatus: HttpStatus,
		message?: string,
	) {
		// On pousse `code` dans la response NestJS pour que le filter le
		// retrouve meme si quelqu'un decide de catch + rethrow ailleurs.
		super({ code, message: message ?? code }, httpStatus);
	}
}
