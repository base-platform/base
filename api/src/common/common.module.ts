import { Module, Global } from '@nestjs/common';
import { IdempotencyService } from './services/idempotency.service';
import { NonceService } from './services/nonce.service';
import { NonceGuard } from './guards/nonce.guard';
import { PrismaModule } from '../core/database/prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [IdempotencyService, NonceService, NonceGuard],
  exports: [IdempotencyService, NonceService, NonceGuard],
})
export class CommonModule {}