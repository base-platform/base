import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UserRateLimitService } from '../core/security/user-rate-limit.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRateLimitDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  pattern: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  limit: number;

  @ApiProperty({ description: 'Window in milliseconds' })
  @IsNumber()
  @Min(1000)
  windowMs: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateRateLimitDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Window in milliseconds' })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  windowMs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pattern?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

@ApiTags('User Rate Limiting')
@Controller('auth/rate-limits')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserRateLimitController {
  constructor(private readonly rateLimitService: UserRateLimitService) {}

  @Post()
  @ApiOperation({ summary: 'Create a custom rate limit rule' })
  @ApiResponse({
    status: 201,
    description: 'Rate limit rule created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        pattern: { type: 'string' },
        limit: { type: 'number' },
        window_ms: { type: 'number' },
        is_active: { type: 'boolean' },
        created_at: { type: 'string', format: 'date-time' },
      },
    },
  })
  async createRateLimit(
    @Request() req: any,
    @Body() dto: CreateRateLimitDto,
  ) {
    return this.rateLimitService.createUserRateLimit(
      req.user.userId,
      dto.name,
      dto.pattern,
      dto.limit,
      dto.windowMs,
      dto.description,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get user rate limit rules' })
  @ApiResponse({
    status: 200,
    description: 'List of user rate limit rules',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          pattern: { type: 'string' },
          limit: { type: 'number' },
          window_ms: { type: 'number' },
          is_active: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async getRateLimits(@Request() req: any) {
    return this.rateLimitService.getUserRateLimits(req.user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a rate limit rule' })
  @ApiResponse({
    status: 200,
    description: 'Rate limit rule updated successfully',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number' },
      },
    },
  })
  async updateRateLimit(
    @Request() req: any,
    @Param('id') ruleId: string,
    @Body() dto: UpdateRateLimitDto,
  ) {
    return this.rateLimitService.updateUserRateLimit(
      ruleId,
      req.user.userId,
      dto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a rate limit rule' })
  @ApiResponse({
    status: 200,
    description: 'Rate limit rule deleted successfully',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number' },
      },
    },
  })
  async deleteRateLimit(
    @Request() req: any,
    @Param('id') ruleId: string,
  ) {
    return this.rateLimitService.deleteUserRateLimit(ruleId, req.user.userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get rate limit usage statistics' })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Rate limit usage statistics',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          endpoint: { type: 'string' },
          total: { type: 'number' },
          success: { type: 'number' },
          errors: { type: 'number' },
          rateLimited: { type: 'number' },
        },
      },
    },
  })
  async getRateLimitStats(
    @Request() req: any,
    @Query('hours') hours?: string,
  ) {
    const hoursNum = hours ? parseInt(hours, 10) : 24;
    return this.rateLimitService.getUserRateLimitStats(req.user.userId, hoursNum);
  }

  @Get('status/:endpoint')
  @ApiOperation({ summary: 'Check current rate limit status for an endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Current rate limit status',
    schema: {
      type: 'object',
      properties: {
        allowed: { type: 'boolean' },
        remaining: { type: 'number' },
        resetTime: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getRateLimitStatus(
    @Request() req: any,
    @Param('endpoint') endpoint: string,
  ) {
    return this.rateLimitService.getRateLimitStatus(req.user.userId, endpoint);
  }

  @Post('clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear current rate limit counters (admin)' })
  @ApiResponse({
    status: 200,
    description: 'Rate limit counters cleared',
    schema: {
      type: 'object',
      properties: {
        cleared: { type: 'number' },
      },
    },
  })
  async clearRateLimit(
    @Request() req: any,
    @Body() dto: { endpoint?: string },
  ) {
    // Note: In production, this should be restricted to admin users
    // Check if user has admin role
    if (req.user.role !== 'admin') {
      throw new Error('Only administrators can clear rate limits');
    }
    
    return this.rateLimitService.clearUserRateLimit(req.user.userId, dto.endpoint);
  }
}