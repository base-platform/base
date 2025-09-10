import { HttpException, HttpStatus } from '@nestjs/common';
import { ERROR_TYPES } from '../../shared/constants';
import { ProblemDetail, ErrorDetail } from '../../shared/types';

export class BaseCustomException extends HttpException {
  constructor(
    public readonly problemDetail: ProblemDetail,
  ) {
    super(problemDetail, problemDetail.status);
  }
}

export class ValidationException extends BaseCustomException {
  constructor(
    message: string,
    errors: ErrorDetail[] = [],
    instance?: string,
  ) {
    super({
      type: ERROR_TYPES.VALIDATION_ERROR,
      title: 'Validation Error',
      status: HttpStatus.BAD_REQUEST,
      detail: message,
      instance,
      errors,
    });
  }
}

export class AuthenticationException extends BaseCustomException {
  constructor(
    message: string = 'Authentication failed',
    instance?: string,
  ) {
    super({
      type: ERROR_TYPES.AUTHENTICATION_ERROR,
      title: 'Authentication Error',
      status: HttpStatus.UNAUTHORIZED,
      detail: message,
      instance,
    });
  }
}

export class AuthorizationException extends BaseCustomException {
  constructor(
    message: string = 'Insufficient permissions',
    instance?: string,
  ) {
    super({
      type: ERROR_TYPES.AUTHORIZATION_ERROR,
      title: 'Authorization Error',
      status: HttpStatus.FORBIDDEN,
      detail: message,
      instance,
    });
  }
}

export class ResourceNotFoundException extends BaseCustomException {
  constructor(
    resource: string,
    identifier?: string,
    instance?: string,
  ) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;

    super({
      type: ERROR_TYPES.NOT_FOUND_ERROR,
      title: 'Resource Not Found',
      status: HttpStatus.NOT_FOUND,
      detail: message,
      instance,
    });
  }
}

export class ResourceConflictException extends BaseCustomException {
  constructor(
    message: string,
    instance?: string,
  ) {
    super({
      type: ERROR_TYPES.CONFLICT_ERROR,
      title: 'Resource Conflict',
      status: HttpStatus.CONFLICT,
      detail: message,
      instance,
    });
  }
}

export class RateLimitException extends BaseCustomException {
  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter?: number,
    instance?: string,
  ) {
    const problemDetail: ProblemDetail = {
      type: ERROR_TYPES.RATE_LIMIT_ERROR,
      title: 'Rate Limit Exceeded',
      status: HttpStatus.TOO_MANY_REQUESTS,
      detail: message,
      instance,
    };

    if (retryAfter) {
      (problemDetail as any).retryAfter = retryAfter;
    }

    super(problemDetail);
  }
}

export class BusinessLogicException extends BaseCustomException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.UNPROCESSABLE_ENTITY,
    instance?: string,
  ) {
    super({
      type: ERROR_TYPES.VALIDATION_ERROR,
      title: 'Business Logic Error',
      status,
      detail: message,
      instance,
    });
  }
}

export class ExternalServiceException extends BaseCustomException {
  constructor(
    service: string,
    message?: string,
    instance?: string,
  ) {
    super({
      type: ERROR_TYPES.INTERNAL_ERROR,
      title: 'External Service Error',
      status: HttpStatus.SERVICE_UNAVAILABLE,
      detail: message || `External service '${service}' is unavailable`,
      instance,
    });
  }
}

export class DatabaseException extends BaseCustomException {
  constructor(
    message: string = 'Database operation failed',
    instance?: string,
  ) {
    super({
      type: ERROR_TYPES.INTERNAL_ERROR,
      title: 'Database Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: message,
      instance,
    });
  }
}