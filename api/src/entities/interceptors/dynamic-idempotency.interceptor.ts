import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { IdempotencyService } from '../../common/services/idempotency.service';
import { EntitiesService } from '../entities.service';

@Injectable()
export class DynamicIdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(DynamicIdempotencyInterceptor.name);

  constructor(
    private readonly idempotencyService: IdempotencyService,
    private readonly entitiesService: EntitiesService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const idempotencyKey = request.headers['idempotency-key'] || request.headers['x-idempotency-key'];
    
    // Get entity name from the URL
    const entityName = request.params?.entityName;
    
    // Skip if not a dynamic entity endpoint
    if (!entityName) {
      return next.handle();
    }

    // Check if entity has idempotency enabled
    let entityConfig;
    try {
      entityConfig = await this.idempotencyService.getEntityIdempotencyConfig(entityName);
    } catch (error) {
      // Entity not found or error, proceed without idempotency
      return next.handle();
    }

    // If entity doesn't have idempotency enabled, proceed normally
    if (!entityConfig?.idempotency_enabled) {
      return next.handle();
    }

    // Check if method should be idempotent
    const allowedMethods = entityConfig.idempotency_methods || ['POST', 'PUT'];
    if (!allowedMethods.includes(request.method)) {
      return next.handle();
    }

    // If no key provided, proceed without idempotency (unless required)
    if (!idempotencyKey) {
      // For now, we'll make it optional. You can change this to require keys for certain entities
      return next.handle();
    }

    // Check for existing idempotency key
    const endpoint = `/${entityName}`;
    const idempotencyRequest = {
      key: idempotencyKey,
      endpoint,
      method: request.method,
      userId: request.user?.userId || request.user?.id,
      entityId: entityName,
      request: {
        method: request.method,
        url: request.url,
        body: request.body,
        params: request.params,
        query: request.query,
      },
    };

    const existingResult = await this.idempotencyService.checkIdempotency(idempotencyRequest);

    if (existingResult.exists) {
      if (existingResult.status === 'completed') {
        // Return cached response
        this.logger.debug(`Returning cached response for entity ${entityName} with key: ${idempotencyKey}`);
        response.status(existingResult.statusCode || 200);
        return of(existingResult.response);
      } else if (existingResult.status === 'processing') {
        throw new ConflictException(`Request for ${entityName} is still being processed`);
      } else if (existingResult.status === 'failed') {
        // Allow retry for failed requests
        this.logger.log(`Retrying previously failed request for ${entityName} with key: ${idempotencyKey}`);
      }
    }

    // Create new idempotency key
    const ttl = entityConfig.idempotency_ttl || 86400000; // Use entity-specific TTL or 24 hours default
    await this.idempotencyService.createIdempotencyKey(idempotencyRequest, ttl);

    return next.handle().pipe(
      tap(async (responseData) => {
        const statusCode = response.statusCode || 200;
        await this.idempotencyService.completeIdempotencyKey(
          idempotencyKey,
          responseData,
          statusCode,
        );
        this.logger.debug(`Completed idempotent request for ${entityName} with key: ${idempotencyKey}`);
      }),
      catchError(async (error) => {
        await this.idempotencyService.failIdempotencyKey(idempotencyKey, error);
        this.logger.error(`Failed idempotent request for ${entityName} with key: ${idempotencyKey}`, error);
        return throwError(() => error);
      }),
    );
  }
}