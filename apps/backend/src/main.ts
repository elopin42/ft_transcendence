import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { AppModule } from '@/app.module';
import { EnvConfig } from '@/common/config/env.config';
import { AppLogger } from '@/logging/services/app-logger.service';

// JSON.stringify natif ne sait pas serialiser BigInt -> on patch global.
// Necessaire car les permissions facon Discord (@ftt/shared/permissions)
// sont stockees en BigInt en DB. Cote front : reconvertir avec BigInt(perms)
// pour faire du bitwise.
(BigInt.prototype as any).toJSON = function () {
	return this.toString();
};

async function bootstrap() {
	// bufferLogs : retient les logs du bootstrap jusqu'a useLogger() pour les
	// flusher avec AppLogger (sinon ils sortent avec le logger natif sans
	// passer par le stream). Pattern recommande dans la doc Nest 11.
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		bufferLogs: true,
	});
	app.useLogger(app.get(AppLogger));

	const config = app.get(ConfigService<EnvConfig, true>);

	// Trust proxy 'loopback' = on fait confiance UNIQUEMENT a nginx local.
	// Plus sur que `true` qui ferait confiance a n'importe quelle IP X-Forwarded
	// (spoofable). Critique pour le rate-limiter qui se base sur l'IP.
	app.set('trust proxy', 'loopback');

	// Parse les cookies HTTP -> req.cookies dispo dans toutes les routes.
	app.use(cookieParser());

	// Helmet pose les security headers HTTP recommandes par OWASP Secure
	// Headers Project 2024.
	//   - CSP/COEP : desactives ici (API JSON, le front Next.js gere sa CSP)
	//   - HSTS : gere par nginx en amont (RFC 6797), evite la duplication
	app.use(helmet({
		contentSecurityPolicy: false,
		crossOriginEmbedderPolicy: false,
		hsts: false,
	}));

	// Cache-Control: no-store sur toutes les reponses API. Necessaire pour les
	// donnees auth (pas de cache navigateur des reponses /users/me, /auth/*,
	// /sessions). RFC 7234 sec 5.2.2.3 + OWASP Secure Headers Project. Une
	// API JSON ne devrait jamais etre cache niveau intermediaire.
	app.use((_req: Request, res: Response, next: NextFunction) => {
		res.setHeader('Cache-Control', 'no-store');
		next();
	});

	// Validation globale des DTO via class-validator :
	//   whitelist             : retire les champs non declares dans le DTO
	//   forbidNonWhitelisted  : 400 si champ inconnu (defense en profondeur)
	//   transform             : convertit le body en instance du DTO
	//   exceptionFactory      : structure les erreurs avec un ErrorCode par
	//                           champ. Le GlobalExceptionFilter relit cette
	//                           structure pour produire la response finale.
	app.useGlobalPipes(new ValidationPipe({
		whitelist: true,
		forbidNonWhitelisted: true,
		transform: true,
		transformOptions: { enableImplicitConversion: true },
		exceptionFactory: (errors) => {
			const fieldErrors = errors.map((e) => ({
				field: e.property,
				code: Object.values(e.constraints ?? {})[0] ?? 'validation.failed',
			}));
			return new BadRequestException({
				code: fieldErrors[0]?.code ?? 'validation.failed',
				errors: fieldErrors,
			});
		},
	}));

	// CORS : credentials true pour autoriser l'envoi des cookies cross-origin
	// (sinon le front Next.js ne pourrait pas envoyer son access_token au back).
	app.enableCors({
		origin: config.get('CORS_ORIGIN', { infer: true }),
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
		credentials: true,
	});

	await app.listen(config.get('PORT', { infer: true }));
}

bootstrap();