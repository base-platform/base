import { IsString, IsObject, IsOptional, IsBoolean } from 'class-validator';
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