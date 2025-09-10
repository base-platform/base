import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
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
} from '@nestjs/swagger';
import { MfaService } from '../core/security/mfa.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  EnableMfaDto,
  VerifyMfaDto,
  DisableMfaDto,
  GenerateBackupCodesDto,
} from './dto/mfa.dto';

@ApiTags('MFA')
@Controller('auth/mfa')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  @Get('setup')
  @ApiOperation({ summary: 'Setup MFA for the user' })
  @ApiResponse({
    status: 200,
    description: 'MFA setup information including QR code',
    schema: {
      type: 'object',
      properties: {
        secret: { type: 'string' },
        qrCodeUrl: { type: 'string' },
        qrCodeDataUrl: { type: 'string' },
        backupCodes: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  async setupMfa(@Request() req: any) {
    return this.mfaService.setupMfa(req.user.userId);
  }

  @Post('enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable MFA after setup' })
  @ApiResponse({
    status: 200,
    description: 'MFA enabled successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        enabled: { type: 'boolean' },
      },
    },
  })
  async enableMfa(@Request() req: any, @Body() dto: EnableMfaDto) {
    const result = await this.mfaService.enableMfa(req.user.userId, dto.token);
    return {
      message: 'MFA enabled successfully',
      enabled: result,
    };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify MFA token' })
  @ApiResponse({
    status: 200,
    description: 'MFA token verification result',
    schema: {
      type: 'object',
      properties: {
        isValid: { type: 'boolean' },
        remainingBackupCodes: { type: 'number' },
      },
    },
  })
  async verifyMfa(@Request() req: any, @Body() dto: VerifyMfaDto) {
    return this.mfaService.verifyMfaToken(req.user.userId, dto.token);
  }

  @Delete('disable')
  @ApiOperation({ summary: 'Disable MFA' })
  @ApiResponse({
    status: 200,
    description: 'MFA disabled successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        disabled: { type: 'boolean' },
      },
    },
  })
  async disableMfa(@Request() req: any, @Body() dto: DisableMfaDto) {
    const result = await this.mfaService.disableMfa(req.user.userId, dto.token);
    return {
      message: 'MFA disabled successfully',
      disabled: result,
    };
  }

  @Post('backup-codes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate new backup codes' })
  @ApiResponse({
    status: 200,
    description: 'New backup codes generated',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        backupCodes: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  async generateBackupCodes(
    @Request() req: any,
    @Body() dto: GenerateBackupCodesDto,
  ) {
    const backupCodes = await this.mfaService.generateNewBackupCodes(
      req.user.userId,
      dto.token,
    );
    return {
      message: 'New backup codes generated successfully',
      backupCodes,
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get MFA status' })
  @ApiResponse({
    status: 200,
    description: 'MFA status information',
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        backupCodesCount: { type: 'number' },
        lastVerified: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getMfaStatus(@Request() req: any) {
    return this.mfaService.getMfaStatus(req.user.userId);
  }
}