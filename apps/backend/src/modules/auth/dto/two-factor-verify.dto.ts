import { IsString, Matches } from 'class-validator';
import { ERR } from '@ftt/shared/errors';
import { CODE_PATTERN_2FA } from '@/modules/auth/types/dto.type';

// DTO verif 2FA au login. Accepte :
//   - TOTP : 6 chiffres
//   - Backup code : 8 chars hex
export class Verify2faDto {
	@IsString()
	@Matches(CODE_PATTERN_2FA, { message: ERR.TWO_FA.INVALID_CODE })
	code!: string;
}
