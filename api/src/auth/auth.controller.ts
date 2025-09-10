import { Controller, Post, Body, UseGuards, UseInterceptors, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto, CreateApiKeyDto } from './dto/auth.dto';
import { LoginWithMfaDto } from './dto/mfa.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtNonceAuthGuard } from './guards/jwt-nonce-auth.guard';
import { Idempotent } from '../common/decorators/idempotent.decorator';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';

@ApiTags('Authentication')
@Controller('auth')
@UseInterceptors(IdempotencyInterceptor)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @Idempotent({ ttl: 86400000 }) // 24 hours - prevent duplicate registrations
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('login/mfa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete login with MFA token' })
  async loginWithMfa(@Body() dto: LoginWithMfaDto) {
    return this.authService.loginWithMfa(dto.tempToken, dto.mfaToken);
  }

  @Post('refresh')
  @Idempotent({ ttl: 60000 }) // 1 minute - prevent rapid refresh token generation
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtNonceAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate refresh tokens' })
  async logout(@Request() req: any) {
    return this.authService.logout(req.user.userId, req.user.jti);
  }

  @Post('api-keys')
  @UseGuards(JwtAuthGuard)
  @Idempotent({ ttl: 86400000 }) // 24 hours - prevent duplicate API key creation
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new API key' })
  async createApiKey(@Request() req: any, @Body() dto: CreateApiKeyDto) {
    return this.authService.createApiKey(req.user.userId, dto);
  }

  @Post('api-keys/:id/revoke')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke an API key' })
  async revokeApiKey(@Request() req: any, @Body() keyId: string) {
    return this.authService.revokeApiKey(req.user.userId, keyId);
  }
}