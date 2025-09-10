import { Module } from '@nestjs/common';
import { EntitiesService } from './entities.service';
import { EntitiesController } from './entities.controller';
import { DynamicApiController } from './dynamic-api.controller';
import { SchemaValidatorService } from './schema-validator.service';
import { DynamicIdempotencyInterceptor } from './interceptors/dynamic-idempotency.interceptor';
import { IdempotencyModule } from '../common/idempotency.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [IdempotencyModule, CommonModule],
  controllers: [EntitiesController, DynamicApiController],
  providers: [EntitiesService, SchemaValidatorService, DynamicIdempotencyInterceptor],
  exports: [EntitiesService, SchemaValidatorService],
})
export class EntitiesModule {}