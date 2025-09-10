import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { BaseCustomException } from '../exceptions/custom-exceptions';
import { ERROR_TYPES } from '../../shared/constants';
import { ProblemDetail } from '../../shared/types';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const problemDetail = this.createProblemDetail(exception, request);
    
    // Log the error
    this.logError(exception, request, problemDetail);

    // Set appropriate headers
    response.setHeader('Content-Type', 'application/problem+json');
    
    // Add retry-after header for rate limit errors
    if (problemDetail.status === HttpStatus.TOO_MANY_REQUESTS) {
      const retryAfter = (problemDetail as any).retryAfter || 60;
      response.setHeader('Retry-After', retryAfter);
    }

    response.status(problemDetail.status).json(problemDetail);
  }

  private createProblemDetail(exception: unknown, request: Request): ProblemDetail {
    const instance = request.url;
    const timestamp = new Date().toISOString();

    // Custom exceptions
    if (exception instanceof BaseCustomException) {
      return {
        ...exception.problemDetail,
        instance,
        timestamp,
      };
    }

    // HTTP exceptions
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      
      let detail = exception.message;
      let errors;

      if (typeof response === 'object' && response !== null) {
        const responseObj = response as any;
        detail = responseObj.message || responseObj.error || detail;
        errors = responseObj.errors;
      }

      return {
        type: this.getTypeForStatus(status),
        title: this.getTitleForStatus(status),
        status,
        detail: Array.isArray(detail) ? detail.join(', ') : detail,
        instance,
        timestamp,
        ...(errors && { errors }),
      };
    }

    // Prisma errors
    if (exception instanceof PrismaClientKnownRequestError) {
      return this.handlePrismaError(exception, instance, timestamp);
    }

    // Generic errors
    if (exception instanceof Error) {
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
      
      return {
        type: ERROR_TYPES.INTERNAL_ERROR,
        title: 'Internal Server Error',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        detail: 'An unexpected error occurred',
        instance,
        timestamp,
      };
    }

    // Unknown exceptions
    return {
      type: ERROR_TYPES.INTERNAL_ERROR,
      title: 'Internal Server Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'An unknown error occurred',
      instance,
      timestamp,
    };
  }

  private handlePrismaError(
    error: PrismaClientKnownRequestError,
    instance: string,
    timestamp: string,
  ): ProblemDetail {
    switch (error.code) {
      case 'P2002': // Unique constraint violation
        return {
          type: ERROR_TYPES.CONFLICT_ERROR,
          title: 'Unique Constraint Violation',
          status: HttpStatus.CONFLICT,
          detail: 'A record with this value already exists',
          instance,
          timestamp,
        };

      case 'P2025': // Record not found
        return {
          type: ERROR_TYPES.NOT_FOUND_ERROR,
          title: 'Record Not Found',
          status: HttpStatus.NOT_FOUND,
          detail: 'The requested record was not found',
          instance,
          timestamp,
        };

      case 'P2003': // Foreign key constraint violation
        return {
          type: ERROR_TYPES.VALIDATION_ERROR,
          title: 'Foreign Key Constraint Violation',
          status: HttpStatus.BAD_REQUEST,
          detail: 'Referenced record does not exist',
          instance,
          timestamp,
        };

      case 'P2014': // Invalid ID
        return {
          type: ERROR_TYPES.VALIDATION_ERROR,
          title: 'Invalid Identifier',
          status: HttpStatus.BAD_REQUEST,
          detail: 'The provided identifier is invalid',
          instance,
          timestamp,
        };

      default:
        this.logger.error(`Unhandled Prisma error: ${error.code} - ${error.message}`);
        return {
          type: ERROR_TYPES.INTERNAL_ERROR,
          title: 'Database Error',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          detail: 'A database error occurred',
          instance,
          timestamp,
        };
    }
  }

  private getTypeForStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ERROR_TYPES.VALIDATION_ERROR;
      case HttpStatus.UNAUTHORIZED:
        return ERROR_TYPES.AUTHENTICATION_ERROR;
      case HttpStatus.FORBIDDEN:
        return ERROR_TYPES.AUTHORIZATION_ERROR;
      case HttpStatus.NOT_FOUND:
        return ERROR_TYPES.NOT_FOUND_ERROR;
      case HttpStatus.CONFLICT:
        return ERROR_TYPES.CONFLICT_ERROR;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ERROR_TYPES.RATE_LIMIT_ERROR;
      default:
        return ERROR_TYPES.INTERNAL_ERROR;
    }
  }

  private getTitleForStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'Bad Request';
      case HttpStatus.UNAUTHORIZED:
        return 'Unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'Forbidden';
      case HttpStatus.NOT_FOUND:
        return 'Not Found';
      case HttpStatus.CONFLICT:
        return 'Conflict';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'Unprocessable Entity';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'Too Many Requests';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'Internal Server Error';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'Service Unavailable';
      default:
        return 'Error';
    }
  }

  private logError(
    exception: unknown,
    request: Request,
    problemDetail: ProblemDetail,
  ): void {
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    
    const logContext = {
      method,
      url,
      ip,
      userAgent,
      status: problemDetail.status,
      type: problemDetail.type,
    };

    if (problemDetail.status >= 500) {
      this.logger.error(
        `Server Error: ${problemDetail.detail}`,
        exception instanceof Error ? exception.stack : undefined,
        logContext,
      );
    } else if (problemDetail.status >= 400) {
      this.logger.warn(
        `Client Error: ${problemDetail.detail}`,
        logContext,
      );
    }
  }
}