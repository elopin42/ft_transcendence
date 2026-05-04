import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';

export type LogLevel = 'debug' | 'log' | 'warn' | 'error' | 'fatal' | 'verbose';

export interface LogEntry {
	timestamp: string;
	level: LogLevel;
	context: string;
	message: string;
	meta?: Record<string, unknown>;
}

// Ring buffer en RAM des N derniers logs + EventEmitter pour subscribe.
// AppLogger pousse ici a chaque log, le DebugPanel admin (cf. todo Phase 5)
// consommera via une WS gateway.
//
// Capacite 500 = arbitraire mais raisonnable : plus c'est gros, plus le
// rendu temps reel cote front rame ; plus c'est petit, moins on a de
// contexte historique au connect d'un admin.
@Injectable()
export class LogStreamService {
	private readonly buffer: LogEntry[] = [];
	private readonly capacity = 500;
	private readonly emitter = new EventEmitter();

	push(entry: LogEntry): void {
		this.buffer.push(entry);
		if (this.buffer.length > this.capacity) this.buffer.shift();
		this.emitter.emit('log', entry);
	}

	// Snapshot des N derniers logs. Utilise au connect WS pour rejouer
	// l'historique avant de streamer le nouveau.
	recent(limit = this.capacity): LogEntry[] {
		return this.buffer.slice(-limit);
	}

	// Retourne un unsubscribe pour eviter les leaks d'handler dans la WS
	// (au disconnect du client admin, on appelle le retour de subscribe).
	subscribe(handler: (entry: LogEntry) => void): () => void {
		this.emitter.on('log', handler);
		return () => this.emitter.off('log', handler);
	}
}
