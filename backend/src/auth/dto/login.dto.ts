import { IsEmail, IsString } from "class-validator";

export class LoginDto {
	@IsEmail({}, { message: "L'email doit être une adresse email valide" }) // Validation de l'email "abc" ne passera pas et message d'erreur personnalisé
	email: string;

	@IsString()
	password: string;
}