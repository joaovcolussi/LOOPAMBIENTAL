import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@loopambiental/database';

@Catch()
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const request = host.switchToHttp().getRequest<{ url?: string }>();

    if (error instanceof HttpException) {
      response.status(error.getStatus()).json(error.getResponse());
      return;
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'INTERNAL_SERVER_ERROR';

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002' || error.code === 'P2034') {
        status = HttpStatus.CONFLICT;
        message = 'RESOURCE_CONFLICT';
      } else if (error.code === 'P2003') {
        status = HttpStatus.BAD_REQUEST;
        message = 'INVALID_REFERENCE';
      } else if (error.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'RESOURCE_NOT_FOUND';
      } else if (['P1001', 'P1008', 'P1017', 'P2024'].includes(error.code)) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        message = 'DATABASE_UNAVAILABLE';
      }
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'INVALID_DATA';
    }

    this.logger.error(
      `${message} ${request.url ?? ''}`.trim(),
      error instanceof Error ? error.stack : String(error),
    );
    response.status(status).json({
      error: { code: message, message, details: [] },
    });
  }
}
