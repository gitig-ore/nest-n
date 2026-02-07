import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error: string;
}

// Helper to check if an object is a Prisma error
const isPrismaError = (obj: unknown): obj is { code: string; message: string } => {
  if (typeof obj !== 'object' || obj === null) return false;
  const code = (obj as Record<string, unknown>).code;
  return typeof code === 'string' && code.startsWith('P');
};

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | string[];
    let error: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string | string[]) || exception.message;
        error = (responseObj.error as string) || this.getErrorName(status);
      } else {
        message = exceptionResponse as string | string[];
        error = this.getErrorName(status);
      }
    } else if (exception instanceof Error && isPrismaError(exception)) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = this.handlePrismaError(exception);
      error = 'Prisma Error';
    } else if (exception instanceof Error) {
      status = this.getStatusFromError(exception);
      message = exception.message;
      error = this.getErrorName(status);
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected error occurred';
      error = 'Internal Server Error';
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error,
    };

    // Log error details
    this.logError(exception, request, status);

    // Don't expose internal error details in production
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && status === HttpStatus.INTERNAL_SERVER_ERROR) {
      errorResponse.message = 'An unexpected error occurred';
    }

    response.status(status).json(errorResponse);
  }

  private getErrorName(status: number): string {
    const errorNames: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };
    return errorNames[status] || 'Error';
  }

  private getStatusFromError(error: Error): number {
    if (error.name === 'UnauthorizedException') {
      return HttpStatus.UNAUTHORIZED;
    }
    if (error.name === 'ForbiddenException') {
      return HttpStatus.FORBIDDEN;
    }
    if (error.name === 'ValidationError') {
      return HttpStatus.BAD_REQUEST;
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private handlePrismaError(error: { code: string; message: string }): string {
    // Map Prisma error codes to user-friendly messages
    const errorCodeMessages: Record<string, string> = {
      P2000: 'The provided value is too long for the column',
      P2001: 'The requested record was not found',
      P2002: 'A record with this value already exists',
      P2003: 'Foreign key constraint failed',
      P2004: 'A constraint failed on the database',
      P2005: 'The value stored in the database is invalid',
      P2006: 'The provided value is not valid',
      P2007: 'Data validation error',
      P2008: 'Failed to parse the query',
      P2009: 'Failed to validate the query',
      P2010: 'Raw query failed',
      P2011: 'Null constraint violation',
      P2012: 'Missing required value',
      P2013: 'Missing the required argument',
      P2014: 'The relation would not be valid',
      P2015: 'A related record not found',
      P2016: 'Query interpretation error',
      P2017: 'The records for the relation are not connected',
      P2018: 'The required connected records not found',
      P2019: 'Input error',
      P2020: 'Value out of range',
      P2021: 'The table does not exist in the current database',
      P2022: 'The column does not exist in the current database',
      P2023: 'Inconsistent column data',
      P2024: 'Timeout while fetching data',
      P2025: 'An operation failed because it depends on one or more required records',
    };

    const code = error.code;
    return errorCodeMessages[code] || `Database error: ${code}`;
  }

  private logError(exception: unknown, request: Request, status: number): void {
    const { method, url, ip } = request;
    const userAgent = request.headers['user-agent'] || 'unknown';
    
    const logMessage = {
      method,
      url,
      ip,
      userAgent,
      statusCode: status,
      timestamp: new Date().toISOString(),
    };

    if (status >= 500) {
      this.logger.error(
        `Server Error: ${JSON.stringify(logMessage)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (status >= 400) {
      this.logger.warn(
        `Client Error: ${JSON.stringify(logMessage)}`,
        exception instanceof Error ? exception.message : undefined,
      );
    } else {
      this.logger.log(`Request: ${JSON.stringify(logMessage)}`);
    }
  }
}
