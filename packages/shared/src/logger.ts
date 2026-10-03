import { formatRiyadhDateTime } from './timezone.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    const time = formatRiyadhDateTime(new Date());
    const prefix = `[${time} Asia/Riyadh] [${level.toUpperCase()}] [${this.context}]:`;
    if (meta) {
      console.log(prefix, message, JSON.stringify(meta));
    } else {
      console.log(prefix, message);
    }
  }

  debug(msg: string, meta?: Record<string, unknown>) {
    if (process.env.DEBUG) this.log('debug', msg, meta);
  }

  info(msg: string, meta?: Record<string, unknown>) {
    this.log('info', msg, meta);
  }

  warn(msg: string, meta?: Record<string, unknown>) {
    this.log('warn', msg, meta);
  }

  error(msg: string, meta?: Record<string, unknown>) {
    this.log('error', msg, meta);
  }
}
