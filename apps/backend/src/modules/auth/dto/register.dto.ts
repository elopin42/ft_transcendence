import { IsEmail, IsString, MinLength, MaxLength, IsNotEmpty, Matches } from 'class-validator';
import { ERR } from '@ftt/shared/errors';
import { CODE_PATTERN_LOGIN, CODE_PATTERN_PASSWORD } from '@/modules/auth/types/dto.type';

// DTO du POST /auth/register. Strict : on impose les regles a la creation,
// le LoginDto reste laxe (cf. login.dto.ts).
//
// Politique mot de passe conforme NIST SP 800-63B-3 (revision juin 2024) :
//   - 12 caracteres minimum (NIST recommande 8 mais nous montons a 12 pour
//     compenser l'absence de check contre les rainbow tables Have I Been Pwned)
//   - 128 maximum (limite raisonnable, evite DoS via hash argon2id sur input
//     enorme)
//   - Complexite : 1 minuscule + 1 majuscule + 1 chiffre + 1 special (cf.
//     CODE_PATTERN_PASSWORD). NIST SP 800-63B-3 ne l'exige plus depuis 2017
//     mais OWASP Password Storage Cheat Sheet 2024 le recommande encore en
//     l'absence de check contre les listes de mots de passe compromis.
//
// Login : alphanumerique + underscore + tiret. Evite les soucis URL / display
// / search. Pas d'espaces, pas de caracteres exotiques.
//
// Les `message` portent un ErrorCode -> i18n cote front via la cle.
export class RegisterDto {
	@IsEmail({}, { message: ERR.VALIDATION.EMAIL.INVALID })
	@MaxLength(254, { message: ERR.VALIDATION.EMAIL.TOO_LONG })
	email!: string;

	@IsString()
	@IsNotEmpty({ message: ERR.VALIDATION.PASSWORD.REQUIRED })
	@MinLength(12, { message: ERR.VALIDATION.PASSWORD.TOO_SHORT })
	@MaxLength(128, { message: ERR.VALIDATION.PASSWORD.TOO_LONG })
	@Matches(CODE_PATTERN_PASSWORD, { message: ERR.VALIDATION.PASSWORD.MISSING_COMPLEXITY })
	password!: string;

	@IsString()
	@IsNotEmpty({ message: ERR.VALIDATION.LOGIN.REQUIRED })
	@MinLength(3, { message: ERR.VALIDATION.LOGIN.TOO_SHORT })
	@MaxLength(20, { message: ERR.VALIDATION.LOGIN.TOO_LONG })
	@Matches(CODE_PATTERN_LOGIN, { message: ERR.VALIDATION.LOGIN.INVALID_CHARS })
	login!: string;
}
