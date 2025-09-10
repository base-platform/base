import { Module, Global } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';
import { RateLimitController } from './rate-limit.controller';
import { PrismaService } from '../database/prisma/prisma.service';
import { SecurityModule } from '../security/security.module';

@Global()
@Module({
  imports: [SecurityModule],
  controllers: [RateLimitController],
  providers: [RateLimitService, PrismaService],
  exports: [RateLimitService],
})
export class RateLimitModule {}