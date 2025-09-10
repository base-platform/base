import {
  Controller,
  Get,
  Post,
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
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SessionSecurityService, DeviceFingerprint } from '../core/security/session-security.service';
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrustDeviceDto {
  @ApiProperty()
  @IsString()
  deviceFingerprint: string;
}

export class CreateSessionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  acceptLanguage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  acceptEncoding?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  screenResolution?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  colorDepth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  platform?: string;
}

@ApiTags('Session Management')
@Controller('auth/sessions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SessionController {
  constructor(private readonly sessionService: SessionSecurityService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active sessions for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of active sessions',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sessionId: { type: 'string' },
          deviceInfo: {
            type: 'object',
            properties: {
              userAgent: { type: 'string' },
              ipAddress: { type: 'string' },
              fingerprint: { type: 'string' },
              platform: { type: 'string' },
              browser: { type: 'string' },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
          lastActiveAt: { type: 'string', format: 'date-time' },
          expiresAt: { type: 'string', format: 'date-time' },
          isActive: { type: 'boolean' },
          isTrusted: { type: 'boolean' },
        },
      },
    },
  })
  async getSessions(@Request() req: any) {
    return this.sessionService.getUserSessions(req.user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new session with device fingerprinting' })
  @ApiResponse({
    status: 201,
    description: 'Session created successfully',
    schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        deviceInfo: {
          type: 'object',
          properties: {
            userAgent: { type: 'string' },
            ipAddress: { type: 'string' },
            fingerprint: { type: 'string' },
            platform: { type: 'string' },
            browser: { type: 'string' },
          },
        },
        createdAt: { type: 'string', format: 'date-time' },
        expiresAt: { type: 'string', format: 'date-time' },
        isTrusted: { type: 'boolean' },
      },
    },
  })
  async createSession(@Request() req: any, @Body() dto: CreateSessionDto) {
    const userAgent = req.get('User-Agent') || 'Unknown';
    const ipAddress = this.getClientIp(req);

    return this.sessionService.createSession(
      req.user.userId,
      userAgent,
      ipAddress,
      dto,
    );
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Terminate a specific session' })
  @ApiResponse({
    status: 200,
    description: 'Session terminated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  async terminateSession(
    @Request() req: any,
    @Param('sessionId') sessionId: string,
  ) {
    await this.sessionService.terminateSession(sessionId, 'manual');
    return { message: 'Session terminated successfully' };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Terminate all sessions except current' })
  @ApiResponse({
    status: 200,
    description: 'All sessions terminated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        terminatedCount: { type: 'number' },
      },
    },
  })
  async terminateAllSessions(@Request() req: any) {
    // Note: In practice, you'd get the current session ID from the JWT or request
    const currentSessionId = req.user.sessionId; // This would need to be added to JWT
    
    const terminatedCount = await this.sessionService.terminateAllUserSessions(
      req.user.userId,
      currentSessionId,
    );

    return {
      message: 'All other sessions terminated successfully',
      terminatedCount,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get session statistics' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Session statistics',
    schema: {
      type: 'object',
      properties: {
        totalSessions: { type: 'number' },
        activeSessions: { type: 'number' },
        uniqueDevices: { type: 'number' },
        uniqueIPs: { type: 'number' },
        suspiciousActivity: { type: 'number' },
      },
    },
  })
  async getSessionStats(
    @Request() req: any,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.sessionService.getSessionStats(req.user.userId, daysNum);
  }

  @Get('trusted-devices')
  @ApiOperation({ summary: 'Get trusted devices' })
  @ApiResponse({
    status: 200,
    description: 'List of trusted devices',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          fingerprint: { type: 'string' },
          trustedAt: { type: 'string', format: 'date-time' },
          expiresAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async getTrustedDevices(@Request() req: any) {
    return this.sessionService.getTrustedDevices(req.user.userId);
  }

  @Post('trust-device')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trust current device' })
  @ApiResponse({
    status: 200,
    description: 'Device trusted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        fingerprint: { type: 'string' },
      },
    },
  })
  async trustDevice(@Request() req: any, @Body() dto: TrustDeviceDto) {
    await this.sessionService.trustDevice(req.user.userId, dto.deviceFingerprint);
    return {
      message: 'Device trusted successfully',
      fingerprint: dto.deviceFingerprint,
    };
  }

  @Delete('trusted-devices/:fingerprint')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove device trust' })
  @ApiResponse({
    status: 200,
    description: 'Device trust removed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  async untrustDevice(
    @Request() req: any,
    @Param('fingerprint') fingerprint: string,
  ) {
    await this.sessionService.untrustDevice(req.user.userId, fingerprint);
    return { message: 'Device trust removed successfully' };
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current session information' })
  @ApiResponse({
    status: 200,
    description: 'Current session information',
    schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        deviceInfo: {
          type: 'object',
          properties: {
            userAgent: { type: 'string' },
            ipAddress: { type: 'string' },
            fingerprint: { type: 'string' },
            platform: { type: 'string' },
            browser: { type: 'string' },
          },
        },
        createdAt: { type: 'string', format: 'date-time' },
        lastActiveAt: { type: 'string', format: 'date-time' },
        expiresAt: { type: 'string', format: 'date-time' },
        isTrusted: { type: 'boolean' },
      },
    },
  })
  async getCurrentSession(@Request() req: any) {
    // Note: In practice, you'd get the current session ID from the JWT
    const sessionId = req.user.sessionId; // This would need to be added to JWT
    
    if (!sessionId) {
      // Create a session info from current request if none exists
      const userAgent = req.get('User-Agent') || 'Unknown';
      const ipAddress = this.getClientIp(req);
      
      return this.sessionService.createSession(
        req.user.userId,
        userAgent,
        ipAddress,
      );
    }

    // Validate and get current session
    const userAgent = req.get('User-Agent') || 'Unknown';
    const ipAddress = this.getClientIp(req);
    
    return this.sessionService.validateSession(sessionId, userAgent, ipAddress);
  }

  private getClientIp(request: any): string {
    const forwarded = request.get('X-Forwarded-For');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    const realIp = request.get('X-Real-IP');
    if (realIp) {
      return realIp;
    }
    
    const clientIp = request.get('X-Client-IP');
    if (clientIp) {
      return clientIp;
    }
    
    return request.ip || request.socket.remoteAddress || 'unknown';
  }
}