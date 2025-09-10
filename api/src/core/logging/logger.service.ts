import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface LogContext {
  userId?: string;
  requestId?: string;
  method?: string;
  url?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  statusCode?: number;
  [key: string]: any;
}

@Injectable()
export class AppLoggerService implements LoggerService {
  private logLevels: LogLevel[] = ['error', 'warn', 'log', 'debug', 'verbose'];
  private currentLogLevel: LogLevel;

  constructor(private configService: ConfigService) {
    this.currentLogLevel = this.configService.get('logging.level', 'log') as LogLevel;
  }

  log(message: any, context?: string | LogContext): void {
    this.writeLog('log', message, context);
  }

  error(message: any, trace?: string, context?: string | LogContext): void {
    this.writeLog('error', message, context, trace);
  }

  warn(message: any, context?: string | LogContext): void {
    this.writeLog('warn', message, context);
  }

  debug(message: any, context?: string | LogContext): void {
    this.writeLog('debug', message, context);
  }

  verbose(message: any, context?: string | LogContext): void {
    this.writeLog('verbose', message, context);
  }

  // Custom methods for structured logging
  logApiRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: LogContext,
  ): void {
    const logContext = {
      ...context,
      method,
      url,
      statusCode,
      duration,
      type: 'api_request',
    };

    const message = `${method} ${url} ${statusCode} - ${duration}ms`;
    
    if (statusCode >= 400) {
      this.warn(message, logContext);
    } else {
      this.log(message, logContext);
    }
  }

  logDatabaseQuery(
    query: string,
    duration: number,
    context?: LogContext,
  ): void {
    const logContext = {
      ...context,
      query,
      duration,
      type: 'database_query',
    };

    this.debug(`DB Query executed in ${duration}ms`, logContext);
  }

  logBusinessEvent(
    event: string,
    data?: any,
    context?: LogContext,
  ): void {
    const logContext = {
      ...context,
      event,
      data,
      type: 'business_event',
    };

    this.log(`Business Event: ${event}`, logContext);
  }

  logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    data?: any,
    context?: LogContext,
  ): void {
    const logContext = {
      ...context,
      event,
      severity,
      data,
      type: 'security_event',
    };

    const message = `Security Event: ${event} (${severity})`;
    
    if (severity === 'critical' || severity === 'high') {
      this.error(message, undefined, logContext);
    } else {
      this.warn(message, logContext);
    }
  }

  logPerformanceMetric(
    metric: string,
    value: number,
    unit: string,
    context?: LogContext,
  ): void {
    const logContext = {
      ...context,
      metric,
      value,
      unit,
      type: 'performance_metric',
    };

    this.debug(`Performance: ${metric} = ${value}${unit}`, logContext);
  }

  private writeLog(
    level: LogLevel,
    message: any,
    context?: string | LogContext,
    trace?: string,
  ): void {
    if (!this.isLogLevelEnabled(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = this.formatLogEntry(level, message, context, trace, timestamp);

    // In production, you might want to use a proper logging library like Winston
    // or send logs to external services like DataDog, New Relic, etc.
    console[level === 'log' ? 'log' : level](JSON.stringify(logEntry));
  }

  private formatLogEntry(
    level: LogLevel,
    message: any,
    context?: string | LogContext,
    trace?: string,
    timestamp?: string,
  ): any {
    let entry: any = {
      timestamp,
      level,
      message: typeof message === 'string' ? message : JSON.stringify(message),
    };

    if (typeof context === 'string') {
      entry.context = context;
    } else if (context && typeof context === 'object') {
      entry = { ...entry, ...context };
    }

    if (trace) {
      entry.trace = trace;
    }

    // Add environment information
    entry.environment = this.configService.get('environment', 'development');
    entry.service = 'api-platform';

    return entry;
  }

  private isLogLevelEnabled(level: LogLevel): boolean {
    const currentIndex = this.logLevels.indexOf(this.currentLogLevel);
    const requestedIndex = this.logLevels.indexOf(level);
    return requestedIndex <= currentIndex;
  }
}

// Request logging interceptor
import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private logger: AppLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    
    const startTime = Date.now();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const requestId = headers['x-request-id'] as string || 'unknown';

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const { statusCode } = response;

        this.logger.logApiRequest(method, url, statusCode, duration, {
          requestId,
          ip,
          userAgent,
        });
      }),
    );
  }
}