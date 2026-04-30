import { Global, Module } from '@nestjs/common';

import { AppLogger } from '@/logging/services/app-logger.service';
import { LogStreamService } from '@/logging/services/log-stream.service';

// Logger global. AppLogger est branche dans main.ts via app.useLogger() :
// du coup tous les `new Logger('Foo')` natif passent par AppLogger qui
// duplique dans LogStreamService. Pas besoin d'injecter AppLogger dans les
// services metiers, ils utilisent le `Logger` natif comme d'habitude.
@Global()
@Module({
	providers: [LogStreamService, AppLogger],
	exports: [LogStreamService, AppLogger],
})
export class LoggingModule {}
