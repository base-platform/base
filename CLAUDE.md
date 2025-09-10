# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) and other AI assistants when working with code in this repository.

## Project Overview

Runtime API Platform - A comprehensive enterprise platform for building APIs and functions at runtime with JSON Schema-based entity definitions. Features include multi-factor authentication, OAuth integration, dynamic rate limiting, and a full-featured admin dashboard.

**Monorepo Structure:**
- **api/** - NestJS backend with Prisma ORM, PostgreSQL, and Valkey (Redis-compatible)
- **admin-ui/** - Next.js 15 admin dashboard with shadcn/ui components
- **infrastructure/** - Docker Compose setup for databases and services
- **docs/** - Comprehensive documentation

## Key Commands

### Infrastructure (infrastructure/)

```bash
# Start all services
make up                        # Start PostgreSQL and Valkey
make admin                     # Start admin interfaces (PGAdmin, Valkey Commander)

# Database operations
make connect-postgres          # Connect to PostgreSQL
make connect-redis            # Connect to Valkey
make backup                   # Create database backups
make seed                     # Run seed scripts

# Maintenance
make status                   # Check service health
make logs                     # View all logs
make down                     # Stop all services
make reset                    # Reset all data (WARNING: destructive)
```

### Backend (api/)

```bash
# Development
npm run start:dev             # Start with hot reload (port 3001)
npm run start:debug           # Start with debugger

# Database
npx prisma migrate dev        # Run database migrations
npx prisma generate           # Generate Prisma client
npm run db:sample             # Create comprehensive sample data
npm run db:sample:delete      # Delete sample data
npm run db:reset              # Reset database
npm run db:studio             # Open Prisma Studio

# Testing
npm run test                  # Run unit tests
npm run test:e2e              # Run E2E tests
npm run test:cov              # Test coverage
./test-api.sh                 # Run API integration tests
./test-api-improved.sh        # Enhanced API tests

# Code quality
npm run lint                  # Run ESLint
npm run format                # Format with Prettier
npm run typecheck             # Run TypeScript checks

# Production
npm run build                 # Build for production
npm run start:prod            # Start production server
```

### Frontend (admin-ui/)

```bash
# Development
npm run dev                   # Start with Turbopack (port 3000)

# Production
npm run build                 # Build with Turbopack
npm run start                 # Start production server

# Code quality
npm run lint                  # Run ESLint
npm run typecheck             # TypeScript checks
```

## Architecture

### Backend Structure

The API follows NestJS modular architecture with enterprise patterns:

**Core Modules:**
- `DatabaseModule` - Prisma ORM with PostgreSQL 16
- `RateLimitModule` - Dynamic rate limiting with Valkey
- `SecurityModule` - Runtime security configuration
- `LoggingModule` - Request logging and audit trails

**Feature Modules:**
- `AuthModule` - JWT, OAuth2, MFA, API keys, sessions
- `EntitiesModule` - Dynamic entity CRUD with JSON Schema
- `UsersModule` - User management under /admin/users

**Administrative API Structure:**
All admin endpoints are under `/api/v1/admin/`:
- `/admin/users` - User management
- `/admin/rate-limits` - Rate limit configuration
- `/admin/security-settings` - Runtime security settings

### Frontend Structure

Next.js 15 App Router with:

**Key Technologies:**
- **Authentication**: Custom JWT implementation
- **State Management**: TanStack Query for server state
- **Forms**: React Hook Form + Zod validation
- **UI Components**: shadcn/ui with Tailwind CSS
- **Charts**: Recharts for data visualization

**Main Pages:**
- `/dashboard` - System metrics and overview
- `/apis` - API Builder and OpenAPI docs
- `/functions` - Function management
- `/users` - User management interface
- `/api-management` - Rate limits, API keys, Explorer, Audit
- `/security` - Runtime security configuration
- `/api-docs` - OpenAPI documentation viewer
- `/api-management/explorer` - Interactive API testing

## Environment Configuration

### Infrastructure (.env)
```bash
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_DB=basedb
REDIS_PASSWORD=redis123
```

### API (.env)
```bash
# Database
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/basedb"

# Cache (Valkey/Redis)
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-jwt-secret"
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

### Admin UI (.env.local)
```bash
PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

## Default Credentials

**Demo Admin Account:**
- Email: `admin@example.com`
- Password: `password123`

## Testing

The platform includes comprehensive testing:

### API Testing
- Unit tests with Jest
- Integration tests for modules
- E2E tests for complete workflows
- Manual test scripts (test-api.sh)

### Test Coverage Areas
- Authentication flows (JWT, OAuth, MFA)
- Entity CRUD operations
- Dynamic API generation
- Rate limiting enforcement
- Security features
- Session management
- File upload security

## Development Notes

### Ports
- API: http://localhost:3001
- Admin UI: http://localhost:3000
- Swagger: http://localhost:3001/api/docs
- PostgreSQL: localhost:5432
- Valkey/Redis: localhost:6379
- PGAdmin: http://localhost:5050 (when started)
- Valkey Commander: http://localhost:8081 (when started)

### Key Features
- All API responses follow RFC 7807 Problem Details
- Entity data stored as JSONB with JSON Schema validation
- Comprehensive audit logging for security events
- Runtime configurable security settings
- Multi-factor authentication with TOTP
- OAuth integration (Google, GitHub)
- API key rotation and management
- Session fingerprinting and device trust

## Security Features

### Authentication & Authorization
- **JWT with Refresh Tokens**: Secure token rotation
- **Multi-Factor Authentication**: TOTP-based 2FA with backup codes
- **OAuth2 Integration**: Multiple provider support
- **API Key Management**: Rotation, expiration, rate limiting
- **Session Management**: Device fingerprinting and trust

### API Security
- **Dynamic Rate Limiting**: Per-user, per-endpoint, per-API key
- **Request Sanitization**: XSS and injection protection
- **Input Validation**: JSON Schema and DTO validation
- **CORS Protection**: Configurable origins
- **Security Headers**: Comprehensive HTTP headers via Helmet

### Runtime Security Settings

All configurable through admin interface:

**Authentication Settings:**
- Password complexity rules
- Session duration
- MFA requirements
- Account lockout policies

**Rate Limiting:**
- Global limits
- Per-endpoint limits
- User-specific limits
- API key limits

**Access Control:**
- IP whitelisting/blacklisting
- CORS configuration
- Role-based permissions
- API key scoping

**Audit & Compliance:**
- Activity logging levels
- Data retention policies
- Compliance mode
- Alert configurations

## API Endpoint Structure

### Public Endpoints
- `GET /api/v1` - API information
- `GET /api/v1/health` - Health check
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login

### Authentication (/api/v1/auth/)
- Login, register, logout, refresh
- MFA setup, enable, verify, disable
- OAuth authorize, callback, link, unlink
- Sessions management
- API key operations

### Admin Endpoints (/api/v1/admin/)
**Require admin role authentication**

- `/admin/users` - User CRUD operations
- `/admin/rate-limits` - Rate limit rules
- `/admin/security-settings` - Security configuration

### Entity Management (/api/v1/)
- `/entities` - Entity definitions
- `/entities/:id/records` - Entity records
- `/:entityName` - Dynamic API endpoints

## Best Practices

### Code Style
- Use TypeScript for type safety
- Follow NestJS conventions for modules
- Use DTOs for request/response validation
- Implement proper error handling
- Add comprehensive logging

### Security
- Never commit secrets or credentials
- Use environment variables for configuration
- Implement rate limiting on all endpoints
- Validate all user inputs
- Use parameterized queries (Prisma)

### Testing
- Write unit tests for services
- Add integration tests for modules
- Include E2E tests for workflows
- Test error scenarios
- Validate security features

### Documentation
- Document API endpoints with Swagger
- Update README files when adding features
- Comment complex business logic
- Keep CLAUDE.md updated

## Common Tasks

### Adding a New Entity
1. Create entity definition via API or UI
2. Define JSON Schema for validation
3. Test CRUD operations
4. Configure permissions if needed

### Implementing a New Feature
1. Create feature module in appropriate directory
2. Add DTOs for validation
3. Implement service logic
4. Add controller endpoints
5. Write tests
6. Update documentation

### Debugging Issues
1. Check service health: `make status`
2. View logs: `make logs` or `npm run start:dev`
3. Verify database: `npx prisma studio`
4. Test API: Use test scripts or Explorer
5. Check browser console for UI issues

## Troubleshooting

### Common Issues

**Database Connection Failed:**
```bash
cd infrastructure && make up
make status  # Verify services running
```

**Port Already in Use:**
```bash
lsof -i :3001  # Find process
kill -9 <PID>  # Kill process
```

**Prisma Client Out of Sync:**
```bash
npx prisma generate
npm run build
```

**Redis/Valkey Connection Issues:**
```bash
cd infrastructure
make logs-valkey
make restart
```

**Sample Data Issues:**
```bash
npm run db:sample:delete
npm run db:sample
```

## Support Resources

- API Documentation: http://localhost:3001/api/docs
- Admin Dashboard: http://localhost:3000
- Prisma Studio: http://localhost:5555
- Project Docs: /docs directory