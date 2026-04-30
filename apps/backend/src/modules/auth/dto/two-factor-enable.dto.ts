import { IsString, Matches } from 'class-validator';
import { ERR } from '@ftt/shared/errors';
import { CODE_PATTERN_2FA } from '@/modules/auth/types/dto.type';

// DTO activation 2FA. Le user scanne le QR puis renvoie le code TOTP a 6 chiffres.
export class Enable2faDto {
	@IsString()
	@Matches(CODE_PATTERN_2FA, { message: ERR.TWO_FA.INVALID_CODE })
	code!: string;
}
