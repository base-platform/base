import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RateLimitService } from './rate-limit.service';
import { IsString, IsNumber, IsArray, IsBoolean, IsOptional, Min, Max } from 'class-validator';

export class CreateRateLimitDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(1000)
  @Max(3600000)
  ttl: number;

  @IsNumber()
  @Min(1)
  @Max(10000)
  limit: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  endpoints?: string[];

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  priority?: number;
}

export class UpdateRateLimitDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(3600000)
  ttl?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  limit?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  endpoints?: string[];

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  priority?: number;
}

@Controller('admin/rate-limits')
@UseGuards(JwtAuthGuard)
export class RateLimitController {
  constructor(private readonly rateLimitService: RateLimitService) {}

  @Get()
  async getAllConfigs() {
    return this.rateLimitService.getAllConfigs();
  }

  @Get(':name')
  async getConfig(@Param('name') name: string) {
    return this.rateLimitService.getConfig(name);
  }

  @Post()
  async createConfig(@Body() dto: CreateRateLimitDto) {
    return this.rateLimitService.createConfig(dto);
  }

  @Put(':name')
  async updateConfig(
    @Param('name') name: string,
    @Body() dto: UpdateRateLimitDto,
  ) {
    return this.rateLimitService.updateConfig(name, dto);
  }

  @Delete(':name')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteConfig(@Param('name') name: string) {
    await this.rateLimitService.deleteConfig(name);
  }

  @Post('reload')
  @HttpCode(HttpStatus.OK)
  async reloadConfigs() {
    await this.rateLimitService.reloadConfigs();
    return { message: 'Rate limit configurations reloaded successfully' };
  }
}