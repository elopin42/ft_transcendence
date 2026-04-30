import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// ThrottlerGuard etendu : bypass complet si THROTTLER_DISABLED=true.
//
// Pratique en dev (les ~140 tests curl de make/tests.mk taperaient sinon le
// rate-limiter au bout de quelques secondes) et pour les load tests internes.
// EN PROD : ne PAS set THROTTLER_DISABLED, ou le mettre a "false".
//
// Lit directement process.env (pas via ConfigService) pour eviter les soucis
// d'init du guard avant que ConfigModule soit pret (ordre de bootstrap).
@Injectable()
export class ConditionalThrottlerGuard extends ThrottlerGuard {
	private readonly disabled = process.env.THROTTLER_DISABLED === 'true';

	async canActivate(context: ExecutionContext): Promise<boolean> {
		if (this.disabled) return true;
		return super.canActivate(context);
	}
}
