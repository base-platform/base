import { IsString, IsObject, IsOptional, IsBoolean, IsNumber, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEntityDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  displayName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: 'object' })
  @IsObject()
  schema: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false, description: 'Enable idempotency for this entity' })
  @IsOptional()
  @IsBoolean()
  idempotencyEnabled?: boolean;

  @ApiProperty({ required: false, description: 'TTL for idempotency keys in milliseconds' })
  @IsOptional()
  @IsNumber()
  idempotencyTtl?: number;

  @ApiProperty({ required: false, description: 'HTTP methods to apply idempotency', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  idempotencyMethods?: string[];
}

export class UpdateEntityDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: 'object', required: false })
  @IsOptional()
  @IsObject()
  schema?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false, description: 'Enable idempotency for this entity' })
  @IsOptional()
  @IsBoolean()
  idempotencyEnabled?: boolean;

  @ApiProperty({ required: false, description: 'TTL for idempotency keys in milliseconds' })
  @IsOptional()
  @IsNumber()
  idempotencyTtl?: number;

  @ApiProperty({ required: false, description: 'HTTP methods to apply idempotency', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  idempotencyMethods?: string[];
}

export class CreateEntityRecordDto {
  @ApiProperty({ type: 'object' })
  @IsObject()
  data: any;

  @ApiProperty({ type: 'object', required: false })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateEntityRecordDto {
  @ApiProperty({ type: 'object' })
  @IsObject()
  data: any;

  @ApiProperty({ type: 'object', required: false })
  @IsOptional()
  @IsObject()
  metadata?: any;
}