import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common'; // Importation du ValidationPipe pour la validation des données d'entrée

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	// Application du ValidationPipe globalement pour valider les données d'entrée et sécurisées les endpoints se lie avec class-validator dans les DTOs (Data Transfer Objects)
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true, // Supprime les propriétés qui ne sont pas définies dans les DTOs (Si quelqu'un envoie { email, password, isAdmin: true } le isAdmin sera silencieusement retiré)
			forbidNonWhitelisted: true, // au lieu de retiré le isAdmin, ça va renvoyer une erreur 400 Bad Request
			transform: true, // Active les décorateurs de validation transforme le payload en DTO
		})
	); 

	app.enableCors({
		origin: process.env.CORS_ORIGIN || 'http://localhost:3000', // via env
		methods: ['GET', 'POST', 'PUT', 'DELETE'],
		credentials: true,
	});
	const port = process.env.PORT || 4000; // via env
	await app.listen(port);
}
bootstrap();
