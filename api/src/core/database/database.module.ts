import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { PrismaService } from './prisma/prisma.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    DatabaseService,
    // Keep the original PrismaService for backwards compatibility
    {
      provide: PrismaService,
      useClass: DatabaseService,
    },
  ],
  exports: [DatabaseService, PrismaService],
})
export class DatabaseModule {}