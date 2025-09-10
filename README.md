# Base Platform

A comprehensive runtime API platform for building and managing APIs and functions dynamically with JSON Schema-based entity definitions. Features enterprise-grade security, rate limiting, and a full-featured admin dashboard.

> **⚠️ Development Status**  
> This product remains in the early stages of development. While many features are currently functional, it is not yet a production-ready release and is subject to further refinement and change.

## 🚀 Features

### Core Platform
- **Dynamic API Builder**: Create REST APIs from JSON Schema definitions at runtime
- **Entity Management**: CRUD operations with JSONB storage in PostgreSQL
- **Multi-Factor Authentication**: JWT, OAuth2, API keys, and MFA support
- **Advanced Rate Limiting**: Configurable per endpoint, user, or API key
- **RFC 7807 Compliance**: Standard problem details for API errors
- **OpenAPI 3.1**: Auto-generated API documentation and testing
- **Function Runtime**: Execute serverless functions dynamically

### Admin Dashboard
- **Comprehensive Dashboard**: Real-time metrics and analytics
- **User Management**: Full user lifecycle management with role-based access
- **API Explorer**: Interactive API testing and documentation
- **Security Center**: Runtime security configuration and audit logs
- **Rate Limit Management**: Visual configuration of rate limiting rules
- **API Key Management**: Create, rotate, and monitor API keys

## 🛠 Tech Stack

### Backend (`/api`)
- **NestJS** - Enterprise-grade Node.js framework
- **Prisma** - Type-safe ORM with migrations
- **PostgreSQL** - Primary database with JSONB support
- **Valkey** - High-performance caching and rate limiting (Redis-compatible)
- **Swagger/OpenAPI** - Auto-generated API documentation
- **JWT & Passport** - Authentication and authorization
- **bcrypt** - Password hashing

### Frontend (`/admin-ui`)
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern React component library
- **TanStack Query** - Powerful data synchronization
- **React Hook Form + Zod** - Form validation
- **Recharts** - Data visualization
- **Axios** - HTTP client with interceptors

### Infrastructure (`/infrastructure`)
- **Docker Compose** - Container orchestration
- **PostgreSQL 16** - Latest stable database
- **Valkey 8** - Redis-compatible caching layer
- **Nginx** - Reverse proxy (optional)

## 🚀 Quick Start

### Using Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd base
```

2. Start the infrastructure:
```bash
cd infrastructure
docker-compose up -d
```

3. Set up the API:
```bash
cd ../api
npm install
cp .env.example .env
npx prisma migrate deploy
npm run start:dev
```

4. Set up the Admin UI:
```bash
cd ../admin-ui
npm install
cp .env.local.example .env.local
npm run dev
```

5. Access the applications:
- Admin UI: http://localhost:3000
- API: http://localhost:3001
- API Docs: http://localhost:3001/api/docs

### Demo Credentials
- Email: `admin@example.com`
- Password: `password123`

## 📚 API Documentation

### Authentication Endpoints

All authentication endpoints are under `/api/v1/auth/`:

```bash
# Register
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh

# MFA
GET  /api/v1/auth/mfa/setup
POST /api/v1/auth/mfa/enable
POST /api/v1/auth/mfa/verify
DELETE /api/v1/auth/mfa/disable

# OAuth
GET  /api/v1/auth/oauth/authorize/:provider
GET  /api/v1/auth/oauth/callback
POST /api/v1/auth/oauth/link
DELETE /api/v1/auth/oauth/:provider/unlink

# Sessions
GET  /api/v1/auth/sessions
POST /api/v1/auth/sessions
DELETE /api/v1/auth/sessions/:sessionId
```

### Admin Endpoints

Administrative endpoints require authentication and admin role:

```bash
# User Management
GET    /api/v1/admin/users
GET    /api/v1/admin/users/:id
POST   /api/v1/admin/users
PUT    /api/v1/admin/users/:id
DELETE /api/v1/admin/users/:id
POST   /api/v1/admin/users/:id/activate
POST   /api/v1/admin/users/:id/deactivate
GET    /api/v1/admin/users/stats/overview

# Rate Limiting
GET    /api/v1/admin/rate-limits
GET    /api/v1/admin/rate-limits/:name
POST   /api/v1/admin/rate-limits
PUT    /api/v1/admin/rate-limits/:name
DELETE /api/v1/admin/rate-limits/:name
POST   /api/v1/admin/rate-limits/reload

# Security Settings
GET    /api/v1/admin/security-settings/categories
GET    /api/v1/admin/security-settings/all
GET    /api/v1/admin/security-settings/:key
PUT    /api/v1/admin/security-settings/:key
POST   /api/v1/admin/security-settings/:key/reset
GET    /api/v1/admin/security-settings/export/json
POST   /api/v1/admin/security-settings/import/json
```

### Entity Management

Dynamic API creation and management:

```bash
# Entity CRUD
GET    /api/v1/entities
GET    /api/v1/entities/:id
POST   /api/v1/entities
PUT    /api/v1/entities/:id
DELETE /api/v1/entities/:id

# Entity Records
GET    /api/v1/entities/:entityId/records
GET    /api/v1/entities/records/:id
POST   /api/v1/entities/:entityId/records
PUT    /api/v1/entities/records/:id
DELETE /api/v1/entities/records/:id

# Dynamic API (created entities become API endpoints)
GET    /api/v1/:entityName
GET    /api/v1/:entityName/:id
POST   /api/v1/:entityName
PUT    /api/v1/:entityName/:id
DELETE /api/v1/:entityName/:id
POST   /api/v1/:entityName/bulk
POST   /api/v1/:entityName/validate
```

## 🎯 Admin UI Features

### Dashboard
- Real-time system metrics
- API usage statistics
- Recent activity logs
- Quick actions panel

### APIs Section
- **API Builder**: Visual JSON Schema editor with validation
- **OpenAPI Docs**: Interactive API documentation and testing

### Functions
- Serverless function management
- Runtime configuration
- Execution logs and metrics

### User Management
- User CRUD operations
- Role-based access control
- Bulk operations
- Activity monitoring

### API Management
- **Rate Limits**: Visual rate limit configuration
- **API Keys**: Generate and manage API keys
- **API Explorer**: Interactive API testing interface
- **Audit & Monitoring**: Comprehensive audit logs

### Security
- Runtime security settings
- Authentication configuration
- Password policies
- Session management
- IP whitelisting/blacklisting

## 🔧 Development

### Project Structure
```
base/
├── api/                 # NestJS backend API
│   ├── src/
│   │   ├── auth/       # Authentication module
│   │   ├── core/       # Core services and utilities
│   │   ├── entities/   # Entity management
│   │   └── modules/    # Feature modules
│   └── prisma/         # Database schemas and migrations
├── admin-ui/           # Next.js admin dashboard
│   ├── src/
│   │   ├── app/       # App router pages
│   │   ├── components/# React components
│   │   ├── lib/       # Utilities and API client
│   │   └── contexts/  # React contexts
├── infrastructure/     # Docker and deployment
│   ├── docker-compose.yml
│   └── .env.example
└── docs/              # Documentation
```

### Environment Variables

#### API (.env)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/api_platform"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
PORT=3001
```

#### Admin UI (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
PORT=3000
```

### Running Tests

```bash
# Backend tests
cd api
npm run test
npm run test:e2e
npm run test:cov

# Frontend tests
cd admin-ui
npm run test
npm run test:watch
```

### Building for Production

```bash
# Build all services
docker-compose -f docker-compose.prod.yml build

# Or build individually
cd api && npm run build
cd admin-ui && npm run build
```

### Database Management

```bash
# Create migration
npx prisma migrate dev --name your_migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database
npx prisma migrate reset

# Studio GUI
npx prisma studio
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Fine-grained permissions
- **API Key Management**: Multiple API key support with scoping
- **Rate Limiting**: DDoS protection and usage control
- **Input Validation**: Comprehensive request validation
- **SQL Injection Protection**: Parameterized queries via Prisma
- **XSS Protection**: Content Security Policy headers
- **CORS Configuration**: Configurable cross-origin policies
- **Audit Logging**: Complete activity tracking
- **Session Management**: Secure session handling

## 📖 Documentation

- [Platform Architecture](./docs/PLATFORM_ARCHITECTURE.md)
- [API Documentation](./docs/api-documentation.md)
- [Admin UI Guide](./docs/admin-ui-documentation.md)
- [Infrastructure Setup](./infrastructure/README.md)
- [Development Guide](./docs/README.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT License - see the [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- Built with [NestJS](https://nestjs.com/)
- UI powered by [Next.js](https://nextjs.org/) and [shadcn/ui](https://ui.shadcn.com/)
- Database by [PostgreSQL](https://www.postgresql.org/)
- Caching by [Valkey](https://valkey.io/)