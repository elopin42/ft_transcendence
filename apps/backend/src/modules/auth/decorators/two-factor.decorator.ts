import { SetMetadata } from '@nestjs/common';

// Marque une route comme exigeant une 2FA active sur le compte du user.
// Lu par TwoFactorGuard.
export const REQUIRE_2FA_KEY = 'require2fa';
export const Require2FA = () => SetMetadata(REQUIRE_2FA_KEY, true);
