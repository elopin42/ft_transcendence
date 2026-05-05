import { IsEmail, IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ERR } from '@ftt/shared/errors';

// DTO du POST /auth/login.
//
// Volontairement laxiste cote password : pas de MinLength ni de regex de
// complexite. Imposer ces regles ici reviendrait a fuiter la politique
// active a un attaquant qui brute force (il saurait que tout password de
// moins de 12 chars est inutile a essayer). C'est l'objet du register.
//
// Email : validation conforme RFC 5321 (max 254 chars : 64 local-part +
// '@' + 253 domain max, RFC 5321 sec. 4.5.3.1).
//
// Les `message` portent un ErrorCode -> i18n cote front via la cle.
export class LoginDto {
	@IsEmail({}, { message: ERR.VALIDATION.EMAIL.INVALID })
	@MaxLength(254, { message: ERR.VALIDATION.EMAIL.TOO_LONG })
	email!: string;

	@IsString()
	@IsNotEmpty({ message: ERR.VALIDATION.PASSWORD.REQUIRED })
	@MaxLength(128, { message: ERR.VALIDATION.PASSWORD.TOO_LONG })
	password!: string;
}
