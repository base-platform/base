import { Module, DynamicModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { EntitiesService } from './entities.service';
import { SchemaValidatorService } from './schema-validator.service';
import { DynamicApiController } from './dynamic-api.controller';

/**
 * This module handles dynamic routing for user-defined entities.
 * It registers routes at the root level while avoiding conflicts with system endpoints.
 */
@Module({})
export class DynamicRoutingModule {
  static forRoot(): DynamicModule {
    return {
      module: DynamicRoutingModule,
      imports: [
        RouterModule.register([
          {
            path: '/', // Register at root level
            module: DynamicRoutingModule,
          },
        ]),
      ],
      controllers: [DynamicApiController],
      providers: [EntitiesService, SchemaValidatorService],
      exports: [EntitiesService, SchemaValidatorService],
    };
  }

  configure(consumer: MiddlewareConsumer) {
    // We can add middleware here to validate entity names
    // and prevent conflicts with system endpoints
  }
}

/**
 * Middleware to check if a route is a system endpoint or dynamic entity
 */
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class DynamicRouteMiddleware implements NestMiddleware {
  // System endpoints that should not be treated as dynamic entities
  private readonly systemEndpoints = [
    'auth',
    'entities',
    'users',
    'functions',
    'health',
    'metrics',
    'system',
    'api',
    'docs',
    'swagger',
  ];

  use(req: Request, res: Response, next: NextFunction) {
    const pathSegments = req.path.split('/').filter(Boolean);
    const firstSegment = pathSegments[0];

    // Check if this is a system endpoint
    if (firstSegment && this.systemEndpoints.includes(firstSegment)) {
      // Skip dynamic routing for system endpoints
      return next();
    }

    // This is potentially a dynamic entity route
    next();
  }
}