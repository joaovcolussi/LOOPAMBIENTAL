import type { NextFunction, Request, Response } from 'express';
import { randomBytes, randomUUID } from 'node:crypto';
import { MetricsService } from './metrics.service';
import { jsonLogger, useJsonLogs } from './json-logger';

export type ObservedRequest = Request & {
  requestId?: string;
  traceId?: string;
  user?: { id: string };
};

const TRACEPARENT = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/;
const REQUEST_ID = /^[A-Za-z0-9._-]{8,100}$/;

/**
 * Assigns a request id and a W3C trace context to every request, echoes them
 * in the response and records one structured access log line plus metrics.
 * Only the path is logged: query strings may carry tokens.
 */
export function requestContextMiddleware(metrics: MetricsService) {
  const json = useJsonLogs();
  return (request: ObservedRequest, response: Response, next: NextFunction) => {
    const started = process.hrtime.bigint();
    const incomingId = request.headers['x-request-id'];
    const requestId =
      typeof incomingId === 'string' && REQUEST_ID.test(incomingId)
        ? incomingId
        : randomUUID();
    const incomingTrace = request.headers.traceparent;
    const traceMatch =
      typeof incomingTrace === 'string'
        ? TRACEPARENT.exec(incomingTrace)
        : null;
    const traceId = traceMatch?.[1] ?? randomBytes(16).toString('hex');
    const spanId = randomBytes(8).toString('hex');
    request.requestId = requestId;
    request.traceId = traceId;
    response.setHeader('X-Request-Id', requestId);
    response.setHeader('traceparent', `00-${traceId}-${spanId}-01`);

    response.on('finish', () => {
      const seconds = Number(process.hrtime.bigint() - started) / 1e9;
      const routePath = (request.route as { path?: string } | undefined)?.path;
      const route = routePath
        ? `${request.baseUrl ?? ''}${routePath}`
        : 'unmatched';
      metrics.recordRequest(
        request.method,
        route,
        response.statusCode,
        seconds,
      );
      if (!json) return;
      jsonLogger.event(
        response.statusCode >= 500
          ? 'error'
          : response.statusCode >= 400
            ? 'warn'
            : 'info',
        {
          type: 'http_request',
          requestId,
          traceId,
          method: request.method,
          route,
          path: request.path,
          statusCode: response.statusCode,
          durationMs: Math.round(seconds * 1000),
          userId: request.user?.id,
        },
      );
    });
    next();
  };
}
