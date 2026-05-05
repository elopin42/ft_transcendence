import { Controller, Get } from '@nestjs/common';
import { Public } from '@/modules/auth/decorators/public.decorator';

// Endpoint sonde : utilise par Docker (HEALTHCHECK), Nginx upstream check,
// et `make wait-healthy`. Doit etre public (sinon le JwtAuthGuard global le
// bloque) et sans dependance lourde (pas de DB ici, juste process info).
@Controller('health')
export class HealthController {
	@Public()
	@Get()
	check() {
		return {
			status: 'ok',
			uptime: process.uptime(),
			timestamp: new Date().toISOString(),
		};
	}
}
