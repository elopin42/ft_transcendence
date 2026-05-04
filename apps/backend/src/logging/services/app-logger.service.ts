import { ConsoleLogger, Injectable } from '@nestjs/common';
import { LogStreamService } from '@/logging/services/log-stream.service';
import { getLogLevels } from '@/logging/config/log-levels';

// Logger par defaut de l'application. Branche dans main.ts via app.useLogger() :
// du coup tous les `new Logger('Foo')` natif des services metier passent par
// ici, et on capture chaque entree dans LogStreamService — sans avoir a
// toucher au code des services.
//
// Singleton volontaire. Faire du TRANSIENT + INQUIRER (autre pattern recommande
// par la doc Nest) propage le scope TRANSIENT a toute la chaine d'injection
// quand un guard/filter global resout AppLogger -> grosse perte de perf et
// bugs subtils. Le contexte par classe est porte par le `new Logger('Foo')`
// que chaque service instancie de son cote, suffit largement.
//
// Pattern "tee" : on print via super (ConsoleLogger natif, format JSON en prod
// ou colore en dev) + on duplique vers le stream pour le DebugPanel admin.
@Injectable()
export class AppLogger extends ConsoleLogger {
	constructor(private readonly stream: LogStreamService) {
		const isProd = process.env.ENV_MODE === 'production';
		super({
			json: isProd,
			prefix: 'API',
			logLevels: getLogLevels(isProd),
		});
	}

	log(message: any, context?: string) {
		super.log(message, context);
		this.tee('log', message, context);
	}

	warn(message: any, context?: string) {
		super.warn(message, context);
		this.tee('warn', message, context);
	}

	// error a une signature speciale : (message, stack?, context?)
	error(message: any, stack?: string, context?: string) {
		super.error(message, stack, context);
		this.tee('error', message, context, stack);
	}

	debug(message: any, context?: string) {
		super.debug(message, context);
		this.tee('debug', message, context);
	}

	verbose(message: any, context?: string) {
		super.verbose(message, context);
		this.tee('verbose', message, context);
	}

	fatal(message: any, context?: string) {
		super.fatal(message, context);
		this.tee('fatal', message, context);
	}

	private tee(
		level: 'log' | 'warn' | 'error' | 'debug' | 'verbose' | 'fatal',
		message: unknown,
		context?: string,
		stack?: string,
	) {
		this.stream.push({
			timestamp: new Date().toISOString(),
			level,
			context: context ?? this.context ?? 'App',
			message: typeof message === 'string' ? message : safeStringify(message),
			meta: stack ? { stack } : undefined,
		});
	}
}

// JSON.stringify peut throw sur reference circulaire (req, res, etc.).
// Petit helper pour ne pas planter le logger en plein crash.
function safeStringify(value: unknown): string {
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}
