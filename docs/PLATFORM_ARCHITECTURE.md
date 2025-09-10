# Base Platform Architecture

## Executive Summary

Base Platform is a comprehensive runtime API platform that enables dynamic API creation, management, and execution through JSON Schema definitions. Built with enterprise-grade security, scalability, and developer experience in mind, it provides a complete solution for building modern APIs with runtime flexibility.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Admin UI (Next.js 15)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │Dashboard │ │   APIs   │ │   Users  │ │ Security │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS (Port 3000)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway (NestJS)                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            Authentication & Authorization Layer          │   │
│  │         (JWT, OAuth2, API Keys, MFA, Sessions)          │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Rate Limiting Layer                     │   │
│  │           (Per-user, Per-endpoint, Per-API key)         │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │   Auth   │ │  Admin   │ │ Entities │ │Functions │          │
│  │  Module  │ │  Module  │ │  Module  │ │  Module  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└────────────────────┬───────────────────┬────────────────────────┘
                     │ Port 3001         │
        ┌────────────▼──────────┐  ┌────▼─────┐
        │    PostgreSQL 17      │  │  Valkey  │
        │  ┌──────────────────┐ │  │ (Redis-  │
        │  │ Entities (JSONB) │ │  │compatible)│
        │  │ Users & Auth     │ │  │  Cache   │
        │  │ Audit Logs       │ │  │  Sessions│
        │  │ Functions        │ │  │  Rate    │
        │  └──────────────────┘ │  │  Limits  │
        └────────────────────────┘  └──────────┘
```

## Core Components

### 1. API Layer (NestJS)

#### Authentication & Authorization
- **JWT Authentication**: Access and refresh token management with rotation
- **OAuth2 Integration**: Support for Google, GitHub, Microsoft providers
- **API Key Management**: Long-lived keys for service-to-service communication
- **Multi-Factor Authentication**: TOTP-based 2FA with QR code generation
- **Session Management**: Active session tracking and invalidation
- **Role-Based Access Control**: Admin, API User, and User roles

#### Admin Module (`/api/v1/admin/*`)
Administrative endpoints with enhanced security:
- **User Management**: `/admin/users` - Full CRUD operations
- **Rate Limiting**: `/admin/rate-limits` - Dynamic rate limit configuration
- **Security Settings**: `/admin/security-settings` - Runtime security configuration
- **Audit Logs**: `/admin/audit-logs` - System activity tracking
- **System Metrics**: `/admin/metrics` - Performance and usage statistics

#### Entity Management
- **Dynamic API Creation**: Generate REST endpoints from JSON Schema
- **Schema Validation**: Real-time validation using Ajv
- **CRUD Operations**: Full lifecycle management for entities and records
- **Bulk Operations**: Mass create, update, delete capabilities
- **Import/Export**: CSV, JSON, Excel format support
- **Version Control**: Track schema changes over time

#### Function Runtime
- **Serverless Functions**: Execute JavaScript/TypeScript functions
- **Sandboxed Execution**: Secure isolated runtime environment
- **Event Triggers**: HTTP, scheduled, and event-based triggers
- **Performance Monitoring**: Execution time and resource tracking
- **Error Handling**: Comprehensive error capture and logging

### 2. Data Layer

#### PostgreSQL 17
Primary data store with advanced features:
```sql
-- Core Tables
entities          -- Entity definitions with JSON Schema
entity_records    -- Dynamic data storage with JSONB
users            -- User accounts and profiles
roles            -- Role definitions
user_roles       -- User-role mappings
api_keys         -- API key management
sessions         -- Active session tracking
oauth_accounts   -- OAuth provider connections
mfa_settings     -- MFA configuration
functions        -- Function definitions
audit_logs       -- Comprehensive audit trail
rate_limit_rules -- Rate limiting configuration
security_settings -- Runtime security configuration
```

#### Valkey (Redis-compatible)
High-performance caching and session store:
- **Session Storage**: User session management
- **Rate Limiting**: Request counting and throttling
- **Cache Layer**: Frequently accessed data
- **Real-time Updates**: WebSocket connection state
- **Queue Management**: Background job processing

### 3. Frontend Layer (Next.js 15)

#### Admin Dashboard
Comprehensive management interface:
- **Dashboard**: Real-time metrics and activity feed
- **API Builder**: Visual JSON Schema editor
- **User Management**: Complete user lifecycle management
- **Security Center**: Runtime security configuration
- **API Explorer**: Interactive API testing interface
- **Rate Limit Manager**: Visual rate limit configuration
- **Audit Viewer**: System activity logs

#### Technical Stack
- **Framework**: Next.js 15 with App Router
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **State Management**: TanStack Query v5
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization
- **Notifications**: Sonner for toast notifications

### 4. Infrastructure Layer

#### Docker Compose Setup
```yaml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: basedb
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  valkey:
    image: valkey/valkey:8-alpine
    command: valkey-server --requirepass redis123
    volumes:
      - valkey_data:/data
    ports:
      - "6379:6379"

  api:
    build: ./api
    environment:
      DATABASE_URL: postgresql://postgres:postgres123@postgres:5432/basedb
      REDIS_URL: redis://:redis123@valkey:6379/0
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - valkey

  admin-ui:
    build: ./admin-ui
    environment:
      NEXT_PUBLIC_API_URL: http://api:3001/api/v1
    ports:
      - "3000:3000"
    depends_on:
      - api
```

## Security Architecture

### Authentication Flow
```
1. User Login → POST /api/v1/auth/login
2. Validate Credentials → bcrypt comparison
3. Check MFA → If enabled, require TOTP code
4. Generate Tokens → Access (15m) + Refresh (7d)
5. Set HTTP-only Cookies → Secure token storage
6. Return User Profile → With permissions
```

### Authorization Layers
1. **Request Level**: JWT/API Key validation
2. **Route Level**: Guard-based protection
3. **Resource Level**: RBAC permissions
4. **Field Level**: Schema-based filtering

### Security Features
- **Password Policy**: Configurable complexity requirements
- **Session Security**: Concurrent session limits, timeout management
- **IP Security**: Whitelist/blacklist management
- **CORS Configuration**: Dynamic origin validation
- **Rate Limiting**: Multi-strategy throttling
- **Input Validation**: Request sanitization and validation
- **SQL Injection Prevention**: Parameterized queries via Prisma
- **XSS Protection**: Content Security Policy headers
- **CSRF Protection**: Token-based verification
- **Audit Logging**: Complete activity tracking

## Performance Architecture

### Optimization Strategies

#### Database Optimizations
- **Connection Pooling**: Prisma connection management
- **Index Strategy**: JSONB GIN indexes for entity records
- **Query Optimization**: Selective field projection
- **Batch Operations**: Bulk insert/update capabilities
- **Pagination**: Cursor and offset-based pagination

#### Caching Strategy
```
L1 Cache: Application Memory (Node.js)
  ↓
L2 Cache: Valkey (Redis-compatible)
  ↓
L3 Cache: PostgreSQL Query Cache
  ↓
Persistent Storage: PostgreSQL
```

#### API Performance
- **Response Compression**: Gzip/Brotli compression
- **Field Selection**: GraphQL-like field filtering
- **Lazy Loading**: On-demand resource loading
- **Connection Reuse**: HTTP/2 multiplexing
- **CDN Integration**: Static asset delivery

### Scalability Considerations

#### Horizontal Scaling
```
Load Balancer (nginx/HAProxy)
       ↓
┌──────┐ ┌──────┐ ┌──────┐
│API-1 │ │API-2 │ │API-N │  (Stateless API Instances)
└──────┘ └──────┘ └──────┘
       ↓
┌─────────────┐ ┌─────────┐
│ PostgreSQL  │ │ Valkey  │  (Shared Data Layer)
│  (Primary)  │ │ Cluster │
└─────────────┘ └─────────┘
```

#### Vertical Scaling
- Database: Read replicas for query distribution
- Cache: Redis Cluster for distributed caching
- Storage: Partitioned tables for large datasets

## API Design Principles

### RESTful Conventions
```
GET    /api/v1/entities          # List entities
POST   /api/v1/entities          # Create entity
GET    /api/v1/entities/:id      # Get entity
PUT    /api/v1/entities/:id      # Update entity
DELETE /api/v1/entities/:id      # Delete entity

# Dynamic entity endpoints
GET    /api/v1/:entityName       # List records
POST   /api/v1/:entityName       # Create record
GET    /api/v1/:entityName/:id   # Get record
PUT    /api/v1/:entityName/:id   # Update record
DELETE /api/v1/:entityName/:id   # Delete record
```

### Error Handling (RFC 7807)
```json
{
  "type": "https://api.example.com/errors/validation",
  "title": "Validation Error",
  "status": 400,
  "detail": "The request body failed validation",
  "instance": "/api/v1/entities",
  "errors": [
    {
      "field": "name",
      "message": "Name is required"
    }
  ]
}
```

### Response Format
```json
{
  "data": {...},           // Resource data
  "meta": {                // Metadata
    "total": 100,
    "page": 1,
    "limit": 20
  },
  "links": {               // HATEOAS links
    "self": "/api/v1/entities?page=1",
    "next": "/api/v1/entities?page=2",
    "prev": null
  }
}
```

## Development Workflow

### Local Development
```bash
# 1. Start infrastructure
cd infrastructure
make up

# 2. Run migrations
cd ../api
npx prisma migrate deploy
npx prisma db seed

# 3. Start API server
npm run start:dev

# 4. Start Admin UI
cd ../admin-ui
npm run dev
```

### Testing Strategy
- **Unit Tests**: Service and utility functions
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full user flow validation
- **Load Tests**: Performance benchmarking
- **Security Tests**: Vulnerability scanning

### Deployment Pipeline
```
1. Code Push → GitHub
2. CI/CD → GitHub Actions
3. Build → Docker images
4. Test → Automated test suite
5. Deploy → Kubernetes/ECS
6. Monitor → Prometheus/Grafana
```

## Monitoring & Observability

### Metrics Collection
- **Application Metrics**: Request rate, latency, errors
- **Business Metrics**: Entity creation, API usage
- **Infrastructure Metrics**: CPU, memory, disk usage
- **Custom Metrics**: Function execution, cache hit rate

### Logging Strategy
```
Application Logs → Winston/Pino
    ↓
Log Aggregation → ELK Stack/CloudWatch
    ↓
Analysis → Kibana/CloudWatch Insights
```

### Health Checks
```bash
GET /api/v1/health          # Basic health
GET /api/v1/health/ready    # Readiness probe
GET /api/v1/health/live     # Liveness probe
```

## Technology Stack Summary

### Backend (`/api`)
| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Framework | NestJS | 10.x | Enterprise Node.js framework |
| ORM | Prisma | 5.x | Type-safe database access |
| Database | PostgreSQL | 17 | Primary data storage |
| Cache | Valkey | 8.x | Redis-compatible caching |
| Auth | Passport.js | 0.7.x | Authentication strategies |
| Validation | class-validator | 0.14.x | DTO validation |
| Documentation | Swagger | 7.x | OpenAPI documentation |
| Testing | Jest | 29.x | Unit and integration testing |

### Frontend (`/admin-ui`)
| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Framework | Next.js | 15.x | React framework |
| UI Library | React | 19.x | Component library |
| Styling | Tailwind CSS | 3.4.x | Utility-first CSS |
| Components | shadcn/ui | Latest | UI component library |
| State | TanStack Query | 5.x | Server state management |
| Forms | React Hook Form | 7.x | Form management |
| Validation | Zod | 3.x | Schema validation |
| HTTP | Axios | 1.x | API communication |

### Infrastructure (`/infrastructure`)
| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Containerization | Docker | 24.x | Container runtime |
| Orchestration | Docker Compose | 2.x | Local orchestration |
| Database | PostgreSQL | 17 | Relational database |
| Cache | Valkey | 8.x | In-memory data store |
| Proxy | nginx | 1.25.x | Reverse proxy (optional) |

## Future Enhancements

### Short-term (Q1 2025)
- [ ] WebSocket support for real-time updates
- [ ] GraphQL API layer
- [ ] Advanced search with Elasticsearch
- [ ] File upload/storage integration
- [ ] Webhook management system

### Medium-term (Q2-Q3 2025)
- [ ] Kubernetes deployment manifests
- [ ] Multi-tenancy support
- [ ] API versioning strategy
- [ ] Custom domain support
- [ ] Advanced analytics dashboard

### Long-term (Q4 2025+)
- [ ] Edge deployment capabilities
- [ ] AI/ML integration for predictions
- [ ] Blockchain integration for audit trail
- [ ] Global CDN integration
- [ ] Compliance certifications (SOC2, ISO27001)

## Conclusion

The Base Platform provides a robust, scalable, and secure foundation for building modern APIs with runtime flexibility. Its modular architecture, comprehensive security features, and developer-friendly interface make it suitable for both startups and enterprise deployments. The platform's use of industry-standard technologies ensures maintainability, while its dynamic nature allows for rapid iteration and deployment of new API capabilities.