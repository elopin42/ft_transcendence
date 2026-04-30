import { Controller, Get } from '@nestjs/common';
import { Public } from '@/modules/auth/decorators/public.decorator';

// Healthcheck pour le monitoring (Prometheus, k8s, docker healthcheck...).
// Public car il doit repondre meme aux clients non authentifies.
@Controller()
export class AppController {
	@Public()
	@Get('health')
	health() {
		return { status: 'ok', timestamp: new Date().toISOString() };
	}
}
