import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common'; // Importation du ValidationPipe pour la validation des données d'entrée
import cookieParser from 'cookie-parser'; // Importation de cookie-parser pour gérer les cookies

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	app.use(cookieParser()); // Utilisation de cookie-parser

	// Application du ValidationPipe globalement pour valider les données d'entrée et sécurisées les endpoints se lie avec class-validator dans les DTOs (Data Transfer Objects)
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true, // Supprime les propriétés qui ne sont pas définies dans les DTOs (Si quelqu'un envoie { email, password, isAdmin: true } le isAdmin sera silencieusement retiré)
			forbidNonWhitelisted: true, // au lieu de retiré le isAdmin, ça va renvoyer une erreur 400 Bad Request
			transform: true, // Active les décorateurs de validation transforme le payload en DTO
		})
	); 

	app.enableCors({
		origin: process.env.CORS_ORIGIN || 'https://localhost', // fallback HTTPS car nginx gère le SSL
		methods: ['GET', 'POST', 'PUT', 'DELETE'],
		credentials: true,
	});
	const port = process.env.PORT || 4000; // via env
	await app.listen(port);
}
bootstrap();
