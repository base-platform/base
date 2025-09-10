import { Module, Global } from '@nestjs/common';
import { SanitizationService } from './sanitization.service';
import { SanitizationInterceptor } from './sanitization.interceptor';
import { AccountLockoutService } from './account-lockout.service';
import { SecuritySettingsService } from '../config/security-settings.service';
import { PrismaModule } from '../database/prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    SanitizationService,
    SanitizationInterceptor,
    AccountLockoutService,
    SecuritySettingsService,
  ],
  exports: [
    SanitizationService,
    SanitizationInterceptor,
    AccountLockoutService,
    SecuritySettingsService,
  ],
})
export class SecurityModule {}