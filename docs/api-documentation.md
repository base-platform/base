# API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Installation & Setup](#installation--setup)
5. [Core Features](#core-features)
6. [API Endpoints](#api-endpoints)
7. [Authentication](#authentication)
8. [Database Schema](#database-schema)
9. [Security Features](#security-features)
10. [Testing](#testing)
11. [Development](#development)

---

## Overview

The API is a modern, enterprise-grade backend service built with NestJS that provides a runtime API platform with dynamic entity management capabilities. It features comprehensive security, multi-factor authentication, rate limiting, and automatic API generation from JSON Schema definitions.

### Key Features

- 🚀 **Dynamic Entity System** - Create and manage data structures at runtime
- 🔐 **Multi-Layer Authentication** - JWT, OAuth2, API keys, and MFA support
- 🗄️ **PostgreSQL with Prisma** - Type-safe database access with migrations
- 💾 **Valkey Caching** - High-performance Redis-compatible caching
- 🛡️ **Enterprise Security** - Rate limiting, CORS, session management
- 📊 **Analytics & Monitoring** - Built-in usage tracking and audit logs
- 🧪 **Comprehensive Testing** - Unit, integration, and E2E tests
- 📝 **OpenAPI/Swagger** - Auto-generated API documentation
- 🎯 **Admin Endpoints** - Dedicated administrative API routes

---

## Architecture

### System Design

The API follows a modular monolithic architecture with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│         Client Applications              │
│    (Admin UI, API Client, External)      │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         API Gateway (NestJS)            │
│  ┌────────────────────────────────────┐ │
│  │ Guards: JWT, API Key, Role-Based   │ │
│  │ Middleware: CORS, Helmet, Logging  │ │
│  │ Interceptors: Sanitization, Logging│ │
│  └────────────────────────────────────┘ │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│           Core Modules                   │
├──────────────────────────────────────────┤
│ • Auth Module (JWT, OAuth, MFA, API Keys)│
│ • Entities Module (Dynamic APIs)         │
│ • Admin Modules (Users, Settings, Rates) │
│ • Security Module (Runtime Settings)     │
│ • Rate Limit Module (Dynamic Limits)     │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      Infrastructure Layer               │
├──────────────────────────────────────────┤
│ • PostgreSQL 16 (Main Database)         │
│ • Prisma ORM (Type-safe queries)        │
│ • Valkey 8 (Redis-compatible cache)     │
│ • IoRedis (Cache client)                │
└──────────────────────────────────────────┘
```

### Module Structure

- **Core Module** - Database, configuration, exceptions, and shared services
- **Auth Module** - Authentication, authorization, MFA, OAuth, sessions
- **Entities Module** - Dynamic entity and record management
- **Security Module** - Runtime security configuration
- **Rate Limit Module** - Dynamic rate limiting rules
- **Admin Modules** - User management, security settings, monitoring

---

## Technology Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Runtime** | Node.js 18+ | JavaScript runtime |
| **Framework** | NestJS 10.x | Enterprise Node.js framework |
| **Language** | TypeScript 5.x | Type-safe JavaScript |
| **Database** | PostgreSQL 16 | Primary data store |
| **Cache** | Valkey 8 | Redis-compatible caching |
| **ORM** | Prisma 5.x | Database toolkit and migrations |
| **Authentication** | Passport.js | Authentication strategies |
| **Validation** | class-validator | DTO validation |
| **Documentation** | Swagger/OpenAPI | API documentation |
| **Testing** | Jest, Supertest | Unit and E2E testing |
| **Security** | bcrypt, helmet | Password hashing, headers |

---

## Installation & Setup

### Prerequisites

```bash
# Required
Node.js >= 18.0.0
npm >= 9.0.0
PostgreSQL >= 16.0
Valkey >= 8.0 (or Redis >= 7.0)
```

### Quick Start with Docker

```bash
# Start infrastructure
cd infrastructure
docker-compose up -d

# Setup API
cd ../api
npm install
cp .env.example .env
npx prisma migrate deploy
npm run db:sample
npm run start:dev
```

### Environment Configuration

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/basedb"

# Cache
REDIS_URL="redis://localhost:6379"

# JWT Configuration
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Server
PORT=3001
NODE_ENV=development

# Security
CORS_ORIGIN="http://localhost:3000"
RATE_LIMIT_TTL=60000
RATE_LIMIT_MAX=100
```

---

## Core Features

### Dynamic Entity Management

Create and manage data structures dynamically at runtime:

```json
POST /api/v1/entities
{
  "name": "product",
  "displayName": "Products",
  "description": "Product catalog",
  "schema": {
    "type": "object",
    "properties": {
      "name": { "type": "string", "minLength": 1 },
      "price": { "type": "number", "minimum": 0 },
      "sku": { "type": "string", "pattern": "^[A-Z0-9-]+$" },
      "inStock": { "type": "boolean" },
      "categories": { 
        "type": "array",
        "items": { "type": "string" }
      }
    },
    "required": ["name", "price", "sku"]
  }
}
```

This automatically creates:
- `GET /api/v1/product` - List products with filtering
- `POST /api/v1/product` - Create product
- `GET /api/v1/product/:id` - Get product details
- `PUT /api/v1/product/:id` - Update product
- `DELETE /api/v1/product/:id` - Delete product
- `POST /api/v1/product/bulk` - Bulk operations
- `POST /api/v1/product/validate` - Validate data

### Multi-Factor Authentication (MFA)

Support for TOTP-based two-factor authentication:

```bash
# Setup MFA
GET /api/v1/auth/mfa/setup

# Enable MFA
POST /api/v1/auth/mfa/enable
{ "token": "123456" }

# Verify MFA
POST /api/v1/auth/mfa/verify
{ "token": "123456" }
```

### OAuth Integration

Support for multiple OAuth providers:

```bash
# OAuth flow
GET /api/v1/auth/oauth/authorize/:provider
GET /api/v1/auth/oauth/callback
POST /api/v1/auth/oauth/link
DELETE /api/v1/auth/oauth/:provider/unlink
```

---

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1` | API information |
| GET | `/api/v1/health` | Health check |
| GET | `/api/v1/health/database` | Database health |
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login with credentials |
| POST | `/api/v1/auth/refresh` | Refresh access token |

### Authentication Endpoints

All under `/api/v1/auth/`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `login` | Login with email/password |
| POST | `register` | Register new account |
| POST | `logout` | Logout and invalidate tokens |
| POST | `refresh` | Refresh access token |
| **MFA** | | |
| GET | `mfa/setup` | Get MFA setup QR code |
| POST | `mfa/enable` | Enable MFA |
| POST | `mfa/verify` | Verify MFA token |
| DELETE | `mfa/disable` | Disable MFA |
| POST | `mfa/backup-codes` | Generate backup codes |
| GET | `mfa/status` | Check MFA status |
| **OAuth** | | |
| GET | `oauth/authorize/:provider` | Start OAuth flow |
| GET | `oauth/callback` | OAuth callback |
| POST | `oauth/link` | Link OAuth account |
| DELETE | `oauth/:provider/unlink` | Unlink OAuth account |
| GET | `oauth/accounts` | List linked accounts |
| **Sessions** | | |
| GET | `sessions` | List active sessions |
| POST | `sessions` | Create session |
| DELETE | `sessions/:sessionId` | End specific session |
| DELETE | `sessions` | End all sessions |
| GET | `sessions/current` | Current session info |
| **API Keys** | | |
| POST | `api-keys` | Create API key |
| POST | `api-keys/:id/rotate` | Rotate API key |
| POST | `api-keys/:id/revoke` | Revoke API key |
| GET | `api-keys/usage-stats` | API key usage statistics |

### Administrative Endpoints

All under `/api/v1/admin/` and require admin role:

#### User Management (`/admin/users`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all users with pagination |
| GET | `/:id` | Get user details |
| POST | `/` | Create new user |
| PUT | `/:id` | Update user |
| DELETE | `/:id` | Delete user |
| POST | `/:id/activate` | Activate user account |
| POST | `/:id/deactivate` | Deactivate user account |
| GET | `/stats/overview` | User statistics |

#### Rate Limiting (`/admin/rate-limits`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List rate limit rules |
| GET | `/:name` | Get specific rule |
| POST | `/` | Create rate limit rule |
| PUT | `/:name` | Update rule |
| DELETE | `/:name` | Delete rule |
| POST | `/reload` | Reload all rules |

#### Security Settings (`/admin/security-settings`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/categories` | List setting categories |
| GET | `/all` | Get all settings |
| GET | `/category/:category` | Get category settings |
| GET | `/:key` | Get specific setting |
| PUT | `/:key` | Update setting |
| POST | `/:key/reset` | Reset to default |
| GET | `/export/json` | Export settings |
| POST | `/import/json` | Import settings |
| GET | `/validation/test` | Test validation rules |

### Entity Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/entities` | List all entities |
| POST | `/api/v1/entities` | Create new entity |
| GET | `/api/v1/entities/:id` | Get entity details |
| PUT | `/api/v1/entities/:id` | Update entity |
| DELETE | `/api/v1/entities/:id` | Delete entity |

### Entity Records

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/entities/:entityId/records` | List records |
| POST | `/api/v1/entities/:entityId/records` | Create record |
| GET | `/api/v1/entities/records/:id` | Get record |
| PUT | `/api/v1/entities/records/:id` | Update record |
| DELETE | `/api/v1/entities/records/:id` | Delete record |

### Dynamic API Endpoints

For each entity created, these endpoints are automatically available:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/:entityName` | List records with filters |
| POST | `/api/v1/:entityName` | Create new record |
| GET | `/api/v1/:entityName/:id` | Get specific record |
| PUT | `/api/v1/:entityName/:id` | Update record |
| DELETE | `/api/v1/:entityName/:id` | Delete record |
| POST | `/api/v1/:entityName/bulk` | Bulk operations |
| POST | `/api/v1/:entityName/validate` | Validate data |

### Query Parameters

All list endpoints support:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `sort` - Sort field (e.g., `created_at`)
- `order` - Sort order (`asc` or `desc`)
- `search` - Search term
- `filters` - JSON filters

---

## Authentication

### JWT Authentication

The API uses JWT tokens with refresh token rotation:

```typescript
// Login response
{
  "user": { ... },
  "accessToken": "eyJhbGc...",  // 15 minutes
  "refreshToken": "eyJhbGc..."  // 7 days
}
```

**Token Usage:**
```bash
# In Authorization header
curl -H "Authorization: Bearer <accessToken>" \
  http://localhost:3001/api/v1/entities
```

### API Key Authentication

For programmatic access:

```bash
# Create API key
POST /api/v1/auth/api-keys
{
  "name": "Production API",
  "permissions": ["read", "write"],
  "expiresAt": "2025-12-31T23:59:59Z",
  "rateLimit": 1000
}

# Use API key
curl -H "X-API-Key: your-api-key" \
  http://localhost:3001/api/v1/entities
```

### Session Management

Comprehensive session tracking:

```bash
# Get active sessions
GET /api/v1/auth/sessions

# Terminate session
DELETE /api/v1/auth/sessions/:sessionId

# Trust device
POST /api/v1/auth/sessions/trust-device
```

---

## Database Schema

### Core Models

#### User
```prisma
model User {
  id              String   @id @default(cuid())
  email           String   @unique
  password        String?
  name            String?
  role            String   @default("user")
  is_active       Boolean  @default(true)
  email_verified  Boolean  @default(false)
  mfa_enabled     Boolean  @default(false)
  mfa_secret      String?
  last_login_at   DateTime?
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
}
```

#### Entity
```prisma
model Entity {
  id           String   @id @default(cuid())
  name         String   @unique
  display_name String
  description  String?
  schema       Json
  permissions  Json?
  settings     Json?
  is_active    Boolean  @default(true)
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt
}
```

#### ApiKey
```prisma
model ApiKey {
  id          String    @id @default(cuid())
  user_id     String
  name        String
  key_hash    String    @unique
  key_prefix  String
  permissions String[]
  rate_limit  Int?
  expires_at  DateTime?
  last_used   DateTime?
  created_at  DateTime  @default(now())
}
```

#### SystemSettings
```prisma
model SystemSettings {
  id          String   @id @default(cuid())
  key         String   @unique
  value       Json
  category    String
  type        String
  description String?
  is_active   Boolean  @default(true)
  is_public   Boolean  @default(false)
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
}
```

---

## Security Features

### Runtime Security Configuration

All security settings can be configured at runtime through the admin interface:

- **Authentication Settings**
  - Password complexity rules
  - Session duration
  - MFA requirements
  - OAuth provider configuration

- **Rate Limiting**
  - Per-endpoint limits
  - Per-user limits
  - API key specific limits
  - Dynamic rule creation

- **Access Control**
  - IP whitelisting/blacklisting
  - CORS configuration
  - API key permissions
  - Role-based access

- **Audit & Compliance**
  - Activity logging
  - Data retention policies
  - Compliance mode settings
  - Alert configurations

### Security Headers

Automatically applied via Helmet:
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security

### Input Validation

- JSON Schema validation for entities
- DTO validation with class-validator
- SQL injection prevention via Prisma
- XSS protection

---

## Testing

### Test Coverage

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:cov
```

### Test Scripts

#### Manual API Testing
```bash
# Comprehensive API test
./test-api.sh

# Improved test with metrics
./test-api-improved.sh
```

### Test Categories

- **Unit Tests** - Individual service methods
- **Integration Tests** - Module interactions
- **E2E Tests** - Complete API workflows
- **Performance Tests** - Load and stress testing
- **Security Tests** - Authentication and authorization

---

## Development

### Project Structure

```
api/
├── src/
│   ├── auth/               # Authentication module
│   │   ├── controllers/    # Auth endpoints
│   │   ├── services/       # Auth logic
│   │   ├── guards/         # JWT, API key guards
│   │   ├── strategies/     # Passport strategies
│   │   └── dto/           # Data transfer objects
│   ├── core/              # Core functionality
│   │   ├── database/      # Prisma service
│   │   ├── config/        # Configuration
│   │   ├── exceptions/    # Custom exceptions
│   │   ├── filters/       # Exception filters
│   │   ├── interceptors/  # Request/response interceptors
│   │   ├── logging/       # Logging service
│   │   ├── rate-limit/    # Rate limiting
│   │   └── security/      # Security utilities
│   ├── entities/          # Entity management
│   ├── modules/           # Feature modules
│   │   └── users/         # User management
│   ├── shared/            # Shared resources
│   │   ├── types/         # TypeScript types
│   │   ├── utils/         # Utility functions
│   │   └── constants/     # Constants
│   └── main.ts           # Application entry
├── prisma/
│   ├── schema.prisma     # Database schema
│   ├── migrations/       # Migration files
│   └── scripts/          # Database scripts
├── test/                 # Test files
└── docker/              # Docker configurations
```

### Development Commands

```bash
# Start development
npm run start:dev

# Build for production
npm run build

# Start production
npm run start:prod

# Format code
npm run format

# Lint code
npm run lint

# Database commands
npm run db:migrate        # Run migrations
npm run db:generate       # Generate Prisma client
npm run db:seed          # Seed database
npm run db:reset         # Reset database
npm run db:sample        # Load sample data
npm run db:studio        # Open Prisma Studio
```

### Best Practices

1. **Use DTOs** for request/response validation
2. **Implement guards** for authentication and authorization
3. **Use interceptors** for cross-cutting concerns
4. **Follow NestJS conventions** for module structure
5. **Write tests** for all new features
6. **Document APIs** with Swagger decorators
7. **Handle errors** with custom exceptions
8. **Log important events** for debugging
9. **Validate environment** variables on startup
10. **Use transactions** for data consistency

---

## Deployment

### Production Checklist

- [ ] Set strong JWT secrets
- [ ] Configure production database
- [ ] Set up Valkey/Redis cluster
- [ ] Enable HTTPS
- [ ] Configure rate limiting
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Review security settings
- [ ] Set up CI/CD pipeline
- [ ] Configure logging

### Environment Variables

See `.env.example` for all available configuration options.

### Docker Deployment

```bash
# Build image
docker build -t api-platform .

# Run container
docker run -p 3001:3001 \
  -e DATABASE_URL="..." \
  -e REDIS_URL="..." \
  api-platform
```

---

## Support

- [API Documentation](http://localhost:3001/api/docs)
- [Admin Dashboard](http://localhost:3000)
- [GitHub Issues](https://github.com/your-org/api-platform/issues)