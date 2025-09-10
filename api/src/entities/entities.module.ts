import { Module } from '@nestjs/common';
import { EntitiesService } from './entities.service';
import { EntitiesController } from './entities.controller';
import { DynamicApiController } from './dynamic-api.controller';
import { SchemaValidatorService } from './schema-validator.service';
import { DynamicIdempotencyInterceptor } from './interceptors/dynamic-idempotency.interceptor';
import { IdempotencyModule } from '../common/idempotency.module';

@Module({
  imports: [IdempotencyModule],
  controllers: [EntitiesController, DynamicApiController],
  providers: [EntitiesService, SchemaValidatorService, DynamicIdempotencyInterceptor],
  exports: [EntitiesService, SchemaValidatorService],
})
export class EntitiesModule {}