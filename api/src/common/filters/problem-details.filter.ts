import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  [key: string]: any;
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let problemDetails: ProblemDetails = {
      type: 'https://datatracker.ietf.org/doc/html/rfc7807#section-4',
      title: 'Internal Server Error',
      status,
      instance: request.url,
      timestamp: new Date().toISOString(),
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        problemDetails = {
          ...problemDetails,
          title: this.getTitle(status),
          status,
          detail: exceptionResponse,
        };
      } else if (typeof exceptionResponse === 'object') {
        const response = exceptionResponse as any;
        problemDetails = {
          ...problemDetails,
          title: response.error || this.getTitle(status),
          status,
          detail: response.message || exception.message,
          ...(response.errors && { errors: response.errors }),
        };
      }
    } else if (exception instanceof Error) {
      problemDetails.detail = exception.message;
      
      if (process.env.NODE_ENV === 'development') {
        problemDetails.stack = exception.stack;
      }
    }

    response
      .status(status)
      .header('Content-Type', 'application/problem+json')
      .json(problemDetails);
  }

  private getTitle(status: number): string {
    const titles: Record<number, string> = {
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
      504: 'Gateway Timeout',
    };

    return titles[status] || 'Error';
  }
}