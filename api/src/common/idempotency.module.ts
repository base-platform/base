import { Module, Global, OnModuleInit } from '@nestjs/common';
import { IdempotencyService } from './services/idempotency.service';
import { IdempotencyInterceptor } from './interceptors/idempotency.interceptor';
import { DatabaseModule } from '../core/database/database.module';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [IdempotencyService, IdempotencyInterceptor],
  exports: [IdempotencyService, IdempotencyInterceptor],
})
export class IdempotencyModule implements OnModuleInit {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  async onModuleInit() {
    // Initialize default idempotency configurations on startup
    await this.idempotencyService.createDefaultConfigurations();
  }
}