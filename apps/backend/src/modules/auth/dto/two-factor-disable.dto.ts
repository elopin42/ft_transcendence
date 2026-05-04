import { IsString, MinLength } from 'class-validator';
import { ERR } from '@ftt/shared/errors';

// DTO desactivation 2FA. Le password est obligatoire pour bloquer un attaquant
// qui aurait vole une session active.
export class Disable2faDto {
	@IsString()
	@MinLength(1, { message: ERR.VALIDATION.PASSWORD.REQUIRED })
	password!: string;
}
