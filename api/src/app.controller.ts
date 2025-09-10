import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { DatabaseService } from './core/database/database.service';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly databaseService: DatabaseService
  ) {}

  @Get()
  @ApiOperation({ 
    summary: 'API Information',
    description: 'Get basic API information and welcome message'
  })
  @ApiResponse({ status: 200, description: 'API information retrieved successfully' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @SkipThrottle()
  @ApiOperation({ 
    summary: 'System health check',
    description: 'Get overall system health status including database connectivity'
  })
  @ApiResponse({ status: 200, description: 'System health status retrieved successfully' })
  health() {
    const dbHealth = this.databaseService.getHealth();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbHealth,
    };
  }

  @Get('health/database')
  @SkipThrottle()
  @ApiOperation({ 
    summary: 'Get database health status',
    description: 'Check the health and connectivity status of the database'
  })
  @ApiResponse({ status: 200, description: 'Database health status retrieved successfully' })
  getDatabaseHealth() {
    return this.databaseService.getHealth();
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get dashboard statistics and analytics',
    description: 'Retrieve comprehensive dashboard data including user statistics, API usage, and recent activity'
  })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' })
  async getDashboard() {
    return this.appService.getDashboardStats();
  }
}