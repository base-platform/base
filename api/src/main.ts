import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // We'll configure this manually for size limits
  });

  // Configure body parser with size limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Configure comprehensive security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // For Swagger UI
          styleSrc: ["'self'", "'unsafe-inline'", "https:"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", "https:", "data:"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Set to false for API
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    })
  );

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001'
    ],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
  });

  const config = new DocumentBuilder()
    .setTitle('Runtime API Platform')
    .setDescription('A comprehensive enterprise platform for building APIs and functions at runtime with JSON Schema-based entity definitions.\n\nFeatures:\n• Multi-factor Authentication: JWT, OAuth2, MFA, API keys, sessions\n• Dynamic Entity Management: JSON Schema-based entity definitions with CRUD operations\n• Runtime Security: Configurable rate limiting, security settings, and access control\n• Admin Dashboard: Full-featured admin interface for platform management\n• API Builder: Dynamic API generation with OpenAPI documentation\n• Audit & Compliance: Comprehensive logging and audit trails\n\nBase URL: All API endpoints are prefixed with /api/v1\n\nAuthentication: The API supports JWT tokens, API keys, OAuth2 (Google, GitHub), and MFA (TOTP-based two-factor authentication).')
    .setVersion('1.0.0')
    .setContact(
      'API Support',
      'https://github.com/your-org/runtime-api-platform', 
      'support@example.com'
    )
    .setLicense(
      'MIT',
      'https://opensource.org/licenses/MIT'
    )
    .setExternalDoc(
      'API Documentation',
      'https://docs.example.com/api'
    )
    .addServer('http://localhost:3001', 'Development Server')
    .addServer('https://api.example.com', 'Production Server')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'JWT-auth'
    )
    .addApiKey(
      { 
        type: 'apiKey', 
        name: 'X-API-Key', 
        in: 'header',
        description: 'API key for server-to-server authentication'
      },
      'API-Key'
    )
    .addTag('Health', 'System health and status endpoints')
    .addTag('Authentication', 'User authentication and session management')
    .addTag('Entities', 'Dynamic entity management and CRUD operations')
    .addTag('Admin', 'Administrative endpoints for platform management')
    .addTag('Users', 'User management and administration')
    .addTag('API Keys', 'API key management and rotation')
    .addTag('Security', 'Security settings and configuration')
    .addTag('Rate Limiting', 'Rate limiting configuration and management')
    .addTag('Sessions', 'Session management and device trust')
    .addTag('MFA', 'Multi-factor authentication setup and verification')
    .addTag('OAuth', 'OAuth provider integration and management')
    .addTag('Files', 'File upload and management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  console.log(`API is running on: http://localhost:${port}`);
  console.log(`OpenAPI documentation: http://localhost:${port}/api/docs`);
}
bootstrap();