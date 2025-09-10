import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

// Core modules
import { DatabaseModule } from './core/database/database.module';
import configuration from './core/config/configuration';
import { AllExceptionsFilter } from './core/filters/all-exceptions.filter';
import { RequestLoggingInterceptor } from './core/logging/logger.service';
import { AppLoggerService } from './core/logging/logger.service';
import { RateLimitModule } from './core/rate-limit/rate-limit.module';
import { RateLimitService } from './core/rate-limit/rate-limit.service';
import { SecurityModule } from './core/security/security.module';
import { SanitizationInterceptor } from './core/security/sanitization.interceptor';

// Feature modules
import { AuthModule } from './auth/auth.module';
import { EntitiesModule } from './entities/entities.module';
import { UsersModule } from './modules/users/users.module';

// Controllers
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting with environment configuration (dynamic loading happens after init)
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        // Use environment variables or defaults initially
        return {
          throttlers: [
            {
              name: 'default',
              ttl: configService.get<number>('RATE_LIMIT_DEFAULT_TTL', 60000),
              limit: configService.get<number>('RATE_LIMIT_DEFAULT_LIMIT', 1000),
            },
            {
              name: 'auth',
              ttl: configService.get<number>('RATE_LIMIT_AUTH_TTL', 900000),
              limit: configService.get<number>('RATE_LIMIT_AUTH_LIMIT', 20),
            },
          ],
        };
      },
    }),

    // Core modules
    DatabaseModule,
    RateLimitModule,
    SecurityModule,

    // Feature modules - Order matters! UsersModule must come before EntitiesModule
    // to ensure admin/users routes are registered before dynamic catch-all routes
    AuthModule,
    UsersModule,
    EntitiesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AppLoggerService,
    
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    
    // Global request logging interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
    
    // Global sanitization interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: SanitizationInterceptor,
    },
    
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}