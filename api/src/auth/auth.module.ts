import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MfaController } from './mfa.controller';
import { OAuthController } from './oauth.controller';
import { ApiKeyManagementController } from './api-key-management.controller';
import { UserRateLimitController } from './user-rate-limit.controller';
import { FileUploadController } from './file-upload.controller';
import { SessionController } from './session.controller';
import { SecuritySettingsController } from './security-settings.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ApiKeyStrategy } from './strategies/api-key.strategy';
import { MfaService } from '../core/security/mfa.service';
import { AccountLockoutService } from '../core/security/account-lockout.service';
import { OAuthService } from '../core/security/oauth.service';
import { ApiKeyRotationService } from '../core/security/api-key-rotation.service';
import { UserRateLimitService } from '../core/security/user-rate-limit.service';
import { FileUploadSecurityService } from '../core/security/file-upload-security.service';
import { SessionSecurityService } from '../core/security/session-security.service';
import { SecuritySettingsService } from '../core/config/security-settings.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, MfaController, OAuthController, ApiKeyManagementController, UserRateLimitController, FileUploadController, SessionController, SecuritySettingsController],
  providers: [AuthService, MfaService, AccountLockoutService, OAuthService, ApiKeyRotationService, UserRateLimitService, FileUploadSecurityService, SessionSecurityService, SecuritySettingsService, JwtStrategy, ApiKeyStrategy],
  exports: [AuthService, MfaService, OAuthService, ApiKeyRotationService, UserRateLimitService, FileUploadSecurityService, SessionSecurityService, SecuritySettingsService],
})
export class AuthModule {}