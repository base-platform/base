import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRateLimitService } from './user-rate-limit.service';
import { Request, Response } from 'express';

export const SKIP_USER_RATE_LIMIT_KEY = 'skipUserRateLimit';
export const USER_RATE_LIMIT_CONFIG_KEY = 'userRateLimitConfig';

export interface UserRateLimitOptions {
  limit?: number;
  windowMs?: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Decorator to skip rate limiting for specific endpoints
export const SkipUserRateLimit = () => 
  Reflector.createDecorator<boolean>({ key: SKIP_USER_RATE_LIMIT_KEY });

// Decorator to set custom rate limit for specific endpoints
export const UserRateLimit = (options: UserRateLimitOptions) =>
  Reflector.createDecorator<UserRateLimitOptions>({ key: USER_RATE_LIMIT_CONFIG_KEY });

@Injectable()
export class UserRateLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userRateLimitService: UserRateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: any }>();
    const response = context.switchToHttp().getResponse<Response>();

    // Skip rate limiting if decorator is present
    const skipRateLimit = this.reflector.getAllAndOverride<boolean>(
      SKIP_USER_RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipRateLimit) {
      return true;
    }

    // Skip if no authenticated user (let global rate limits handle it)
    if (!request.user?.userId) {
      return true;
    }

    const userId = request.user.userId;
    const endpoint = request.route?.path || request.url;
    const method = request.method;
    const userAgent = request.get('User-Agent');
    const ipAddress = this.getClientIp(request);

    try {
      const result = await this.userRateLimitService.checkRateLimit(
        userId,
        `${method} ${endpoint}`,
        userAgent,
        ipAddress,
      );

      // Set rate limit headers
      response.set({
        'X-RateLimit-Limit': result.remaining + (result.allowed ? 1 : 0).toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(result.resetTime.getTime() / 1000).toString(),
      });

      if (!result.allowed) {
        if (result.retryAfter) {
          response.set('Retry-After', result.retryAfter.toString());
        }

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests from this user',
            error: 'Too Many Requests',
            retryAfter: result.retryAfter,
            resetTime: result.resetTime.toISOString(),
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      // Log error but don't block request if rate limiting service fails
      console.error('User rate limit check failed:', error);
      return true;
    }
  }

  private getClientIp(request: Request): string {
    const forwarded = request.get('X-Forwarded-For');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    const realIp = request.get('X-Real-IP');
    if (realIp) {
      return realIp;
    }
    
    const clientIp = request.get('X-Client-IP');
    if (clientIp) {
      return clientIp;
    }
    
    return request.ip || request.socket.remoteAddress || 'unknown';
  }
}