import { IsEmail, IsString, MinLength, MaxLength } from "class-validator";

export class RegisterDto {
	@IsEmail({}, { message: "L'email doit être une adresse email valide" }) // Validation de l'email "abc" ne passera pas et message d'erreur personnalisé
	email: string;

	@IsString()
	@MinLength(8, { message: 'Le mot de passe doit faire au moins 8 caractères' }) // password < 8 ne passera pas et message d'erreur personnalisé
	@MaxLength(72, { message: 'Le mot de passe ne peut pas dépasser 72 caractères' }) // bcrypt a une limite de 72 caractères, donc on impose cette limite pour éviter les erreurs lors du hashage
	password: string;
}