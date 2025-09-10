import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, Prisma } from '@prisma/client';
import { DatabaseException } from '../exceptions/custom-exceptions';

export enum DatabaseConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

export interface DatabaseHealth {
  status: DatabaseConnectionStatus;
  lastConnected?: Date;
  lastError?: string;
  reconnectAttempts: number;
  uptime?: number;
}

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private connectionStatus: DatabaseConnectionStatus = DatabaseConnectionStatus.DISCONNECTED;
  private lastConnected?: Date;
  private lastError?: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseRetryDelay = 1000; // 1 second
  private maxRetryDelay = 30000; // 30 seconds
  private reconnectTimer?: NodeJS.Timeout;
  private connectionStartTime?: Date;

  constructor(private configService: ConfigService) {
    const databaseUrl = configService.get('app.database.url') || process.env.DATABASE_URL;
    const logLevel = configService.get('app.database.logLevel', 'info');
    
    super({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
      ],
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });

    // Set up logging listeners
    if (process.env.NODE_ENV !== 'production') {
      this.$on('query', (e) => {
        this.logger.debug(`Query: ${e.query} - Duration: ${e.duration}ms`);
      });
    }

    this.$on('info', (e) => {
      this.logger.log(`Database Info: ${e.message}`);
    });

    this.$on('warn', (e) => {
      this.logger.warn(`Database Warning: ${e.message}`);
    });

    this.$on('error', (e) => {
      this.logger.error(`Database Error: ${e.message}`);
    });
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  private async connectWithRetry(): Promise<void> {
    this.connectionStatus = DatabaseConnectionStatus.CONNECTING;
    
    try {
      await this.$connect();
      this.onConnectionSuccess();
    } catch (error) {
      this.onConnectionError(error as Error);
      this.scheduleReconnect();
    }
  }

  private onConnectionSuccess(): void {
    this.connectionStatus = DatabaseConnectionStatus.CONNECTED;
    this.lastConnected = new Date();
    this.connectionStartTime = this.connectionStartTime || new Date();
    this.reconnectAttempts = 0;
    this.lastError = undefined;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    
    this.logger.log('Database connection established successfully');
  }

  private onConnectionError(error: Error): void {
    this.connectionStatus = DatabaseConnectionStatus.ERROR;
    this.lastError = error.message;
    this.reconnectAttempts++;
    
    this.logger.error(`Database connection failed (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}): ${error.message}`);
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.connectionStatus = DatabaseConnectionStatus.DISCONNECTED;
      this.logger.error('Max reconnection attempts reached. Database will remain disconnected.');
      return;
    }

    const delay = this.calculateRetryDelay();
    this.connectionStatus = DatabaseConnectionStatus.RECONNECTING;
    
    this.logger.log(`Scheduling database reconnection in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.$connect();
        this.onConnectionSuccess();
      } catch (error) {
        this.onConnectionError(error as Error);
        this.scheduleReconnect();
      }
    }, delay);
  }

  private calculateRetryDelay(): number {
    // Exponential backoff with jitter
    const exponentialDelay = Math.min(
      this.baseRetryDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxRetryDelay
    );
    
    // Add jitter (±25% of the delay)
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
    return Math.round(exponentialDelay + jitter);
  }

  async onModuleDestroy() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    
    try {
      await this.$disconnect();
      this.connectionStatus = DatabaseConnectionStatus.DISCONNECTED;
      this.logger.log('Database connection closed');
    } catch (error) {
      this.logger.error('Error disconnecting from database', error);
    }
  }

  // Helper methods for common operations
  async executeTransaction<T>(
    operations: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.$transaction(operations);
    } catch (error) {
      this.logger.error('Transaction failed', error);
      throw new DatabaseException('Transaction failed');
    }
  }

  async findWithPagination<T>(
    model: any,
    args: {
      where?: any;
      include?: any;
      select?: any;
      orderBy?: any;
    },
    pagination: { page: number; limit: number },
  ): Promise<{ data: T[]; total: number }> {
    try {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        model.findMany({
          ...args,
          skip,
          take: limit,
        }),
        model.count({ where: args.where }),
      ]);

      return { data, total };
    } catch (error) {
      this.logger.error('Paginated query failed', error);
      throw new DatabaseException('Failed to fetch paginated data');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      if (this.connectionStatus !== DatabaseConnectionStatus.CONNECTED) {
        this.onConnectionSuccess();
      }
      return true;
    } catch (error) {
      if (this.connectionStatus === DatabaseConnectionStatus.CONNECTED) {
        this.onConnectionError(error as Error);
        this.scheduleReconnect();
      }
      return false;
    }
  }

  getConnectionStatus(): DatabaseConnectionStatus {
    return this.connectionStatus;
  }

  getHealth(): DatabaseHealth {
    return {
      status: this.connectionStatus,
      lastConnected: this.lastConnected,
      lastError: this.lastError,
      reconnectAttempts: this.reconnectAttempts,
      uptime: this.connectionStartTime && this.connectionStatus === DatabaseConnectionStatus.CONNECTED 
        ? Date.now() - this.connectionStartTime.getTime() 
        : undefined
    };
  }

  async forceReconnect(): Promise<void> {
    this.logger.log('Forcing database reconnection...');
    this.reconnectAttempts = 0;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    
    try {
      await this.$disconnect();
    } catch (error) {
      this.logger.warn('Error during disconnect before reconnect:', error);
    }
    
    await this.connectWithRetry();
  }

  isConnected(): boolean {
    return this.connectionStatus === DatabaseConnectionStatus.CONNECTED;
  }
}