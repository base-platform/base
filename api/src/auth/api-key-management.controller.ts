import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ApiKeyRotationService } from '../core/security/api-key-rotation.service';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  CreateApiKeyDto,
  RotateApiKeyDto,
  BulkRotateKeysDto,
  ExpireApiKeyDto,
} from './dto/auth.dto';

@ApiTags('API Key Management')
@Controller('auth/api-keys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApiKeyManagementController {
  constructor(
    private readonly authService: AuthService,
    private readonly rotationService: ApiKeyRotationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({
    status: 201,
    description: 'API key created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        key: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  async createApiKey(@Request() req: any, @Body() dto: CreateApiKeyDto) {
    return this.authService.createApiKey(req.user.userId, dto);
  }

  @Post(':id/rotate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate an API key' })
  @ApiResponse({
    status: 200,
    description: 'API key rotated successfully',
    schema: {
      type: 'object',
      properties: {
        oldKeyId: { type: 'string' },
        newKey: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            key: { type: 'string' },
            expiresAt: { type: 'string', format: 'date-time' },
          },
        },
        rotatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  async rotateApiKey(
    @Request() req: any,
    @Param('id') keyId: string,
    @Body() dto: RotateApiKeyDto,
  ) {
    return this.rotationService.rotateApiKey(req.user.userId, keyId, dto.newName);
  }

  @Post('rotate-bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk rotate multiple API keys' })
  @ApiResponse({
    status: 200,
    description: 'API keys rotated successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          oldKeyId: { type: 'string' },
          newKey: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              key: { type: 'string' },
              expiresAt: { type: 'string', format: 'date-time' },
            },
          },
          rotatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async bulkRotateKeys(@Request() req: any, @Body() dto: BulkRotateKeysDto) {
    return this.rotationService.bulkRotateKeys(req.user.userId, dto.keyIds);
  }

  @Post(':id/expire')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force expire an API key' })
  @ApiResponse({
    status: 200,
    description: 'API key expired successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  async expireApiKey(
    @Request() req: any,
    @Param('id') keyId: string,
    @Body() dto: ExpireApiKeyDto,
  ) {
    await this.rotationService.expireApiKey(req.user.userId, keyId, dto.reason);
    return { message: 'API key expired successfully' };
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({
    status: 200,
    description: 'API key revoked successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  async revokeApiKey(@Request() req: any, @Param('id') keyId: string) {
    return this.authService.revokeApiKey(req.user.userId, keyId);
  }

  @Get('usage-stats')
  @ApiOperation({ summary: 'Get API key usage statistics' })
  @ApiResponse({
    status: 200,
    description: 'API key usage statistics',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          keyId: { type: 'string' },
          totalRequests: { type: 'number' },
          lastUsedAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          status: { type: 'string' },
          daysUntilExpiration: { type: 'number' },
        },
      },
    },
  })
  async getUsageStats(@Request() req: any) {
    return this.rotationService.getApiKeyUsageStats(req.user.userId);
  }

  @Get('rotation-needed')
  @ApiOperation({ summary: 'Get API keys that need rotation' })
  @ApiResponse({
    status: 200,
    description: 'API keys needing rotation',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          keyId: { type: 'string' },
          totalRequests: { type: 'number' },
          lastUsedAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          status: { type: 'string' },
          daysUntilExpiration: { type: 'number' },
        },
      },
    },
  })
  async getKeysNeedingRotation(@Request() req: any) {
    return this.rotationService.getKeysNeedingRotation(req.user.userId);
  }

  @Get('rotation-history')
  @ApiOperation({ summary: 'Get API key rotation history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'API key rotation history',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          action: { type: 'string' },
          details: { type: 'object' },
          timestamp: { type: 'string', format: 'date-time' },
          ipAddress: { type: 'string' },
        },
      },
    },
  })
  async getRotationHistory(
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.rotationService.getRotationHistory(req.user.userId, limitNum);
  }
}