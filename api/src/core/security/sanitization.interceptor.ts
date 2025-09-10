import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { SanitizationService } from './sanitization.service';

@Injectable()
export class SanitizationInterceptor implements NestInterceptor {
  constructor(private readonly sanitizationService: SanitizationService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // Skip sanitization for file uploads and specific endpoints
    const skipPaths = ['/api/v1/upload', '/api/v1/files'];
    if (skipPaths.some(path => request.path.startsWith(path))) {
      return next.handle();
    }

    // Sanitize request body
    if (request.body && typeof request.body === 'object') {
      // Check for XSS attempts
      const bodyString = JSON.stringify(request.body);
      if (this.sanitizationService.detectXss(bodyString)) {
        throw new BadRequestException('Potential XSS attack detected');
      }
      
      // Sanitize the body
      request.body = this.sanitizationService.sanitizeObject(request.body);
    }

    // Sanitize query parameters
    if (request.query && typeof request.query === 'object') {
      const sanitizedQuery: any = {};
      for (const key in request.query) {
        if (request.query.hasOwnProperty(key)) {
          const value = request.query[key];
          
          // Check for XSS in query params
          if (typeof value === 'string' && this.sanitizationService.detectXss(value)) {
            throw new BadRequestException('Potential XSS attack detected in query parameters');
          }
          
          sanitizedQuery[this.sanitizationService.sanitizeString(key)] = 
            typeof value === 'string' 
              ? this.sanitizationService.sanitizeString(value)
              : value;
        }
      }
      request.query = sanitizedQuery;
    }

    // Sanitize path parameters
    if (request.params && typeof request.params === 'object') {
      const sanitizedParams: any = {};
      for (const key in request.params) {
        if (request.params.hasOwnProperty(key)) {
          const value = request.params[key];
          
          // Check for XSS in path params
          if (typeof value === 'string' && this.sanitizationService.detectXss(value)) {
            throw new BadRequestException('Potential XSS attack detected in path parameters');
          }
          
          sanitizedParams[key] = typeof value === 'string' 
            ? this.sanitizationService.sanitizeSqlInput(value)
            : value;
        }
      }
      request.params = sanitizedParams;
    }

    return next.handle();
  }
}