import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private isConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    await this.$disconnect();
  }

  private async connectWithRetry(): Promise<void> {
    try {
      await this.$connect();
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.logger.log('Database connected successfully');
    } catch (error) {
      this.isConnected = false;
      this.logger.error(`Database connection failed: ${error.message}`);
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectAttempts++;
        
        this.logger.log(`Attempting to reconnect to database (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);
        
        this.reconnectTimer = setTimeout(() => {
          this.connectWithRetry();
        }, delay);
      } else {
        this.logger.error('Max reconnection attempts reached. Database connection failed.');
      }
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error(`Database health check failed: ${error.message}`);
      if (!this.isConnected && this.reconnectAttempts === 0) {
        this.connectWithRetry();
      }
      return false;
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
    };
  }
}