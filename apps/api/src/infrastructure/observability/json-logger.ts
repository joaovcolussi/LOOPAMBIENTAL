import { LoggerService } from '@nestjs/common';

const SENSITIVE_KEY =
  /pass(word)?|token|secret|cookie|authorization|cnpj|tax_?id|signature|card/i;

/** Recursively masks values whose keys look sensitive before logging. */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? '[REDACTED]' : redact(item, depth + 1),
    ]),
  );
}

type Level = 'error' | 'warn' | 'info' | 'debug' | 'verbose' | 'fatal';

/**
 * One JSON object per line, ready for any log aggregator. Used when
 * LOG_FORMAT=json (the default in production).
 */
export class JsonLogger implements LoggerService {
  constructor(
    private readonly service = 'api',
    private readonly environment = process.env.NODE_ENV ?? 'development',
  ) {}

  log(message: unknown, ...optional: unknown[]) {
    this.write('info', message, optional);
  }
  error(message: unknown, ...optional: unknown[]) {
    this.write('error', message, optional);
  }
  warn(message: unknown, ...optional: unknown[]) {
    this.write('warn', message, optional);
  }
  debug(message: unknown, ...optional: unknown[]) {
    this.write('debug', message, optional);
  }
  verbose(message: unknown, ...optional: unknown[]) {
    this.write('verbose', message, optional);
  }
  fatal(message: unknown, ...optional: unknown[]) {
    this.write('fatal', message, optional);
  }

  /** Structured event with arbitrary (redacted) fields. */
  event(level: Level, fields: Record<string, unknown>) {
    process.stdout.write(
      `${JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        service: this.service,
        environment: this.environment,
        ...(redact(fields) as Record<string, unknown>),
      })}\n`,
    );
  }

  private write(level: Level, message: unknown, optional: unknown[]) {
    const context =
      typeof optional[optional.length - 1] === 'string'
        ? (optional.pop() as string)
        : undefined;
    const stack =
      level === 'error' && typeof optional[0] === 'string'
        ? optional[0]
        : undefined;
    this.event(level, {
      context,
      message:
        typeof message === 'string' ? message : (redact(message) as unknown),
      ...(stack ? { stack } : {}),
    });
  }
}

export const jsonLogger = new JsonLogger();

export function useJsonLogs() {
  const format =
    process.env.LOG_FORMAT ??
    (process.env.NODE_ENV === 'production' ? 'json' : 'pretty');
  return format === 'json';
}
