import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { PrismaService } from '../../core/database/prisma/prisma.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const idempotencyKey = request.headers['idempotency-key'];

    if (!idempotencyKey) {
      return next.handle();
    }

    const existingKey = await this.prisma.idempotencyKey.findUnique({
      where: { key: idempotencyKey },
    });

    if (existingKey) {
      if (existingKey.status === 'completed') {
        return new Observable(observer => {
          observer.next(existingKey.response);
          observer.complete();
        });
      } else if (existingKey.status === 'processing') {
        throw new ConflictException('Request is still being processed');
      }
    }

    await this.prisma.idempotencyKey.create({
      data: {
        key: idempotencyKey,
        request: {
          method: request.method,
          url: request.url,
          body: request.body,
        },
        status: 'processing',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    return next.handle().pipe(
      tap(async (response) => {
        await this.prisma.idempotencyKey.update({
          where: { key: idempotencyKey },
          data: {
            response,
            status: 'completed',
          },
        });
      }),
      catchError(async (error) => {
        await this.prisma.idempotencyKey.update({
          where: { key: idempotencyKey },
          data: {
            status: 'failed',
          },
        });
        return throwError(() => error);
      }),
    );
  }
}