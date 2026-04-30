import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

import { AppException } from '@/common/exceptions/app.exception';
import { ERR, STATUS_TO_CODE, type ErrorCode } from '@ftt/shared/errors';

// Detail par champ pour les erreurs ValidationPipe (cf. main.ts qui customise
// l'exceptionFactory pour produire ce format).
type FieldError = { field: string; code: ErrorCode | string };

// Format standardise renvoye au client. Le frontend parse `code` pour i18n
// (cle dans shared/i18n/locales/{fr,en}.json) et pour brancher la logique
// (ex: refresh sur AUTH.TOKEN.EXPIRED). `errors[]` n'est pose que sur les
// BadRequest issues du ValidationPipe.
type ErrorResponse = {
	statusCode: number;
	code: ErrorCode;
	message: string;
	errors?: FieldError[];
	timestamp: string;
	path: string;
};

// Catch tout. Routage :
//   1. AppException        -> code preserve, status preserve (cas nominal)
//   2. HttpException natif -> on tente d'extraire un code de la response,
//                             sinon fallback STATUS_TO_CODE + warn (signale
//                             un oubli d'AppException dans le code metier)
//   3. Erreur inconnue     -> 500 + ERR.GENERIC.UNKNOWN + log error avec stack
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(GlobalExceptionFilter.name);

	catch(exception: unknown, host: ArgumentsHost): void {
		// Hors HTTP (WS, RPC, ...) on laisse Nest gerer. Surcharger sans
		// res.status() valable casserait plus que ca repare.
		if (host.getType() !== 'http') return;

		const ctx = host.switchToHttp();
		const req = ctx.getRequest<Request>();
		const res = ctx.getResponse<Response>();

		const { statusCode, code, message, errors } = this.normalize(exception);

		const body: ErrorResponse = {
			statusCode,
			code,
			message,
			timestamp: new Date().toISOString(),
			// req.path = pathname sans query string. Evite de leak un token
			// qui aurait ete passe en URL par erreur (anti-fuite dans les logs
			// nginx + dans la response error elle-meme).
			path: req.path ?? req.url,
		};
		if (errors) body.errors = errors;

		// 5xx = bug serveur, log full avec stack pour diagnostic.
		// 4xx = erreur client attendue, log debug pour ne pas spammer en prod.
		if (statusCode >= 500) {
			this.logger.error(
				`${req.method} ${req.url} -> ${statusCode} ${code}`,
				exception instanceof Error ? exception.stack : undefined,
			);
		} else {
			this.logger.debug(`${req.method} ${req.url} -> ${statusCode} ${code}`);
		}

		res.status(statusCode).json(body);
	}

	private normalize(exception: unknown): {
		statusCode: number;
		code: ErrorCode;
		message: string;
		errors?: FieldError[];
	} {
		// 1. AppException : code et status deja propres
		if (exception instanceof AppException) {
			return {
				statusCode: exception.httpStatus,
				code: exception.code,
				message: exception.message,
			};
		}

		// 2. HttpException standard NestJS (UnauthorizedException, etc.)
		if (exception instanceof HttpException) {
			const statusCode = exception.getStatus();
			const resp = exception.getResponse();
			const message = this.extractMessage(resp);
			const explicit = this.extractExplicitCode(resp);
			const errors = this.extractFieldErrors(resp);

			if (explicit) {
				return { statusCode, code: explicit, message, errors };
			}

			// Aucun code explicite -> fallback generique. On warn pour
			// reperer les endroits ou il faudrait remplacer par AppException.
			const fallback = STATUS_TO_CODE[statusCode] ?? ERR.GENERIC.UNKNOWN;
			this.logger.warn(
				`Fallback code utilise: ${statusCode} -> ${fallback}. ` +
				`Throw AppException(ERR.X.Y, ${statusCode}) pour un code explicite.`,
			);
			return { statusCode, code: fallback, message, errors };
		}

		// 3. Erreur non-HTTP : bug serveur, on remonte 500
		const message = exception instanceof Error ? exception.message : 'Internal server error';
		return {
			statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
			code: ERR.GENERIC.UNKNOWN,
			message,
		};
	}

	// Extrait un code 'a.b.c' pose explicitement par AppException ou par
	// le ValidationPipe custom (cf. main.ts).
	private extractExplicitCode(resp: unknown): ErrorCode | null {
		if (typeof resp === 'object' && resp !== null && 'code' in resp) {
			const c = (resp as { code: unknown }).code;
			if (typeof c === 'string') return c as ErrorCode;
		}
		return null;
	}

	// Le ValidationPipe custom (cf. main.ts) pose un `errors[]` dans la response
	// avec une entree par champ qui a echoue.
	private extractFieldErrors(resp: unknown): FieldError[] | undefined {
		if (typeof resp !== 'object' || resp === null || !('errors' in resp)) return undefined;
		const e = (resp as { errors: unknown }).errors;
		if (!Array.isArray(e)) return undefined;
		return e.filter(
			(x): x is FieldError =>
				typeof x === 'object' && x !== null && 'field' in x && 'code' in x,
		);
	}

	// Message lisible pour debug. Pas garanti i18n -> le frontend doit
	// utiliser `code` pour la traduction.
	private extractMessage(resp: unknown): string {
		if (typeof resp === 'string') return resp;
		if (typeof resp === 'object' && resp !== null && 'message' in resp) {
			const m = (resp as { message: unknown }).message;
			if (Array.isArray(m)) return m.join('; ');
			if (typeof m === 'string') return m;
		}
		return 'Error';
	}
}
