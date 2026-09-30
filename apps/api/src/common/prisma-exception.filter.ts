import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@loopambiental/database';

type NormalizedError = {
  code: string;
  message: string;
  details: string[];
};

@Catch()
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(error: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const requestId = this.resolveRequestId(request);
    response.setHeader('X-Request-Id', requestId);

    if (error instanceof HttpException) {
      const status = error.getStatus();
      const normalized = this.normalizeHttpException(error, status);
      response.status(status).json({
        error: { ...normalized, requestId },
      });
      return;
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002' || error.code === 'P2034') {
        status = HttpStatus.CONFLICT;
        code = 'RESOURCE_CONFLICT';
      } else if (error.code === 'P2003') {
        status = HttpStatus.BAD_REQUEST;
        code = 'INVALID_REFERENCE';
      } else if (error.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        code = 'RESOURCE_NOT_FOUND';
      } else if (['P1001', 'P1008', 'P1017', 'P2024'].includes(error.code)) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        code = 'DATABASE_UNAVAILABLE';
      }
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      code = 'INVALID_DATA';
    }

    this.logger.error(
      `${code} ${request.method} ${request.originalUrl ?? request.url ?? ''} requestId=${requestId}`,
      error instanceof Error ? error.stack : String(error),
    );
    response.status(status).json({
      error: { code, message: code, details: [], requestId },
    });
  }

  private resolveRequestId(request: Request) {
    const header = request.headers['x-request-id'];
    if (typeof header === 'string' && header.trim()) return header.trim();
    return randomUUID();
  }

  private normalizeHttpException(
    error: HttpException,
    status: number,
  ): NormalizedError {
    const body = error.getResponse();
    if (typeof body === 'string')
      return { code: body, message: body, details: [] };
    const record = body as {
      message?: unknown;
      error?: unknown;
      statusCode?: unknown;
    };
    const rawMessage = record.message;
    const details = Array.isArray(rawMessage) ? rawMessage.map(String) : [];
    const code =
      (typeof rawMessage === 'string' && rawMessage) ||
      (Array.isArray(rawMessage) && rawMessage.length > 0
        ? String(rawMessage[0])
        : '') ||
      (typeof record.error === 'string' && record.error) ||
      `HTTP_${status}`;
    return { code, message: code, details };
  }
}
