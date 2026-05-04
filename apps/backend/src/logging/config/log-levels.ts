import type { LogLevel } from '@nestjs/common';

// Niveaux actifs selon le mode runtime.
//   prod : silencieux — log/warn/error/fatal seulement
//   dev  : verbeux — debug + verbose en plus
export function getLogLevels(isProd: boolean): LogLevel[] {
	return isProd
		? ['log', 'warn', 'error', 'fatal']
		: ['log', 'warn', 'error', 'fatal', 'debug', 'verbose'];
}
