import { Module } from '@nestjs/common';
import { EntitiesService } from './entities.service';
import { EntitiesController } from './entities.controller';
import { DynamicApiController } from './dynamic-api.controller';
import { SchemaValidatorService } from './schema-validator.service';

@Module({
  controllers: [EntitiesController, DynamicApiController],
  providers: [EntitiesService, SchemaValidatorService],
  exports: [EntitiesService, SchemaValidatorService],
})
export class EntitiesModule {}