# Runtime API Platform Documentation

## Overview

The Runtime API Platform is a comprehensive solution for building and managing dynamic APIs with a modern administrative interface. It enables developers to create data structures on the fly, automatically generating RESTful endpoints with full CRUD operations, authentication, and real-time capabilities.

## Architecture

The platform consists of three main components working together:

### 1. API Backend (`/api`)
- **NestJS-based REST API** with dynamic entity management
- **PostgreSQL database** with Prisma ORM for type-safe data access
- **JWT & API Key authentication** with refresh token rotation
- **Real-time WebSocket** support for live updates
- **Comprehensive testing** with E2E test suites

### 2. Admin UI (`/admin-ui`)
- **Next.js 15 & React 19** modern web application
- **Visual entity builder** with drag-and-drop schema design
- **Real-time dashboard** with metrics and analytics
- **Responsive design** with dark mode support
- **Monaco editor** for advanced JSON schema editing

### 3. API Client (`/api-client`)
- **TypeScript SDK** for programmatic API access
- **Full API coverage** with type-safe methods
- **Browser & Node.js** compatibility
- **Automatic token management** and refresh handling

## Key Features

### Dynamic Entity System
Create and manage data structures at runtime using JSON Schema. The platform automatically generates:
- RESTful CRUD endpoints
- Schema validation
- Database tables and indexes
- API documentation
- TypeScript types

### Authentication & Security
- **Dual authentication**: JWT tokens and API keys
- **Refresh token rotation** for enhanced security
- **Role-based access control** (RBAC)
- **Rate limiting** per endpoint
- **Audit logging** for compliance

### Developer Experience
- **Swagger/OpenAPI** documentation
- **TypeScript** throughout the stack
- **Hot reload** in development
- **Comprehensive testing** tools
- **Docker** ready deployment

## Platform Components

| Component | Description | Documentation |
|-----------|-------------|---------------|
| **[Admin UI](./admin-ui-documentation.md)** | Modern React-based administrative dashboard built with Next.js 15 | [Full Documentation](./admin-ui-documentation.md) |
| **[API](./api-documentation.md)** | Enterprise-grade NestJS backend with dynamic API generation | [Full Documentation](./api-documentation.md) |
| **[API Client](./api-client-documentation.md)** | TypeScript client library for seamless API integration | [Full Documentation](./api-client-documentation.md) |

---

## Quick Start Guide

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher (or pnpm 8.0.0+)
- **PostgreSQL** 15.0 or higher
- **Redis** 7.0 or higher
- **Git** (optional, for version control)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd base
```

### 2. Start the Backend API

```bash
# Navigate to API directory
cd api

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
npx prisma generate
npx prisma migrate dev

# Start the API server
npm run start:dev

# API will be available at http://localhost:3001
# Swagger docs at http://localhost:3001/api/docs
```

### 3. Start the Admin UI

```bash
# In a new terminal, navigate to Admin UI directory
cd admin-ui

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local if needed (defaults should work)

# Start the development server
npm run dev

# Admin UI will be available at http://localhost:3000
```

### 4. Use the API Client

```bash
# Navigate to API Client directory
cd api-client

# Install dependencies
npm install

# Build the client library
npm run build

# For development with watch mode
npm run dev
```

---

## Core Concepts

### Entities
Entities are dynamic data structures defined using JSON Schema. Each entity automatically gets:
- Database table with JSONB storage
- REST API endpoints
- Validation rules
- Query capabilities

### Records
Records are instances of entities containing actual data. They support:
- CRUD operations
- Schema validation
- Version tracking
- Soft deletes

### Functions
Serverless functions that can be triggered by:
- HTTP requests
- Scheduled jobs
- System events

## Development Workflow

### Creating an Entity

1. **Via Admin UI**
   - Navigate to Entities → New Entity
   - Use visual builder or JSON editor
   - Define fields and validation rules
   - Save to create endpoints

2. **Via API**
```bash
curl -X POST http://localhost:3001/api/v1/entities \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "product",
    "displayName": "Products",
    "schema": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "price": { "type": "number" }
      },
      "required": ["name", "price"]
    }
  }'
```

3. **Use the generated API**
```bash
# Create a product
curl -X POST http://localhost:3001/api/v1/product \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "Widget", "price": 29.99}'

# List products
curl http://localhost:3001/api/v1/product
```

## Project Structure

```
base/
├── api/                    # Backend API server
│   ├── src/               # Source code
│   │   ├── auth/         # Authentication module
│   │   ├── entities/     # Entity management
│   │   ├── users/        # User management
│   │   └── core/         # Core utilities
│   ├── prisma/           # Database schema
│   └── test/             # Test files
│
├── admin-ui/              # Administrative interface
│   ├── app/              # Next.js app directory
│   ├── components/       # React components
│   └── lib/              # Utilities
│
├── api-client/            # TypeScript SDK
│   ├── src/              # Source code
│   └── dist/             # Built package
│
└── docs/                  # Documentation
    ├── api-documentation.md
    ├── admin-ui-documentation.md
    └── api-client-documentation.md
```

## Testing

### API Testing
```bash
cd api
npm run test        # Unit tests
npm run test:e2e    # End-to-end tests
./test-api.sh       # Manual API tests
```

### Admin UI Testing
```bash
cd admin-ui
npm run test        # Component tests
npm run test:e2e    # E2E tests
```

## Configuration

### Environment Variables

#### API (`/api/.env`)
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/db
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=3001
```

#### Admin UI (`/admin-ui/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_APP_NAME=Admin UI
```

## Deployment

### Docker Deployment
```bash
# Build images
docker-compose build

# Start services
docker-compose up -d
```

### Manual Deployment

1. **Build projects**
```bash
cd api && npm run build
cd ../admin-ui && npm run build
```

2. **Set production environment**
```bash
export NODE_ENV=production
```

3. **Run migrations**
```bash
cd api && npx prisma migrate deploy
```

4. **Start services**
```bash
cd api && npm run start:prod
cd ../admin-ui && npm start
```

## API Documentation

### Authentication

**Login**
```http
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "password"
}
```

**Refresh Token**
```http
POST /api/v1/auth/refresh
{
  "refreshToken": "<refresh-token>"
}
```

### Dynamic API Usage

For each entity created, the following endpoints are available:

```http
GET    /api/v1/<entity-name>        # List records
POST   /api/v1/<entity-name>        # Create record
GET    /api/v1/<entity-name>/:id    # Get record
PUT    /api/v1/<entity-name>/:id    # Update record
DELETE /api/v1/<entity-name>/:id    # Delete record
```

## Troubleshooting

### Common Issues

**Database Connection Failed**
- Check PostgreSQL is running
- Verify DATABASE_URL in .env
- Ensure database exists

**Authentication Errors**
- Clear browser cookies/localStorage
- Check JWT_SECRET matches
- Verify token expiration settings

**Build Failures**
```bash
# Clear caches and rebuild
rm -rf node_modules .next dist
npm install
npm run build
```

**Port Already in Use**
```bash
# Find and kill process using port
lsof -i :3001  # or :3000 for UI
kill -9 <PID>
```

## Recent Updates

### Token Refresh Fix ✅
- Fixed token refresh endpoint to properly verify and rotate tokens
- Implemented bcrypt comparison for hashed refresh tokens
- Updated authentication flow for better security

### Documentation Updates ✅
- Comprehensive documentation for all components
- Updated based on actual codebase analysis
- Added troubleshooting guides and best practices

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

## Support

For issues and questions:
- Check the documentation in `/docs`
- Review test files for examples
- Open an issue on GitHub
- Consult inline code documentation
- SQL injection prevention
- XSS protection
- CORS configuration

#### 📈 Analytics & Monitoring
- Built-in analytics tracking
- Prometheus metrics integration
- Comprehensive audit logging
- Performance monitoring
- Error tracking

#### 🔄 Real-time Features
- WebSocket support
- Live data updates
- Real-time notifications
- Event-driven architecture

---

## Development Workflow

### Local Development

1. **API Development**
   ```bash
   cd api
   npm run start:dev  # Hot reload enabled
   ```

2. **Frontend Development**
   ```bash
   cd admin-ui
   npm run dev  # Fast refresh enabled
   ```

3. **Client Library Development**
   ```bash
   cd api-client
   npm run dev  # Watch mode
   ```

### Running Tests

#### API Tests
```bash
cd api
npm run test        # Unit tests
npm run test:e2e    # End-to-end tests
npm run test:cov    # Coverage report
```

#### Admin UI Tests
```bash
cd admin-ui
npm run test        # Unit tests
npm run test:e2e    # E2E with Playwright
```

#### API Client Tests
```bash
cd api-client
npm run test        # Unit tests
```

### Code Quality

#### Linting
```bash
# In each project directory
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
```

#### Type Checking
```bash
# In each project directory
npm run type-check  # TypeScript validation
```

#### Formatting
```bash
# In each project directory
npm run format      # Format with Prettier
```

---

## Docker Deployment

### Using Docker Compose

```bash
# From the root directory
docker-compose up -d

# Services will be available at:
# - API: http://localhost:3001
# - Admin UI: http://localhost:3000
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
```

### Docker Compose Configuration

```yaml
version: '3.8'

services:
  api:
    build: ./api
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/api_db
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  admin-ui:
    build: ./admin-ui
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://api:3001/api/v1
    depends_on:
      - api

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=api_db
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## Production Deployment

### Environment Variables

#### API Environment Variables
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://redis:6379
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://admin.yourdomain.com
```

#### Admin UI Environment Variables
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
NEXT_PUBLIC_APP_URL=https://admin.yourdomain.com
```

### Deployment Options

#### 1. Traditional Server Deployment
- Deploy API to any Node.js hosting (AWS EC2, DigitalOcean, etc.)
- Deploy Admin UI to Vercel, Netlify, or static hosting
- Use managed PostgreSQL and Redis services

#### 2. Kubernetes Deployment
- Use provided Kubernetes manifests
- Scale horizontally with replicas
- Implement service mesh for microservices

#### 3. Serverless Deployment
- Deploy API as serverless functions (AWS Lambda, Vercel Functions)
- Use serverless PostgreSQL (Neon, Supabase)
- Implement edge caching

### Production Checklist

- [ ] Set strong JWT secrets
- [ ] Configure HTTPS/SSL certificates
- [ ] Set up database backups
- [ ] Configure monitoring and alerts
- [ ] Implement error tracking (Sentry)
- [ ] Set up CI/CD pipelines
- [ ] Configure rate limiting
- [ ] Review security headers
- [ ] Set up log aggregation
- [ ] Configure auto-scaling

---

## Common Use Cases

### 1. Building a SaaS Application

```typescript
// Define your entities
const userEntity = {
  name: 'users',
  schema: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      name: { type: 'string' },
      subscription: { type: 'string', enum: ['free', 'pro', 'enterprise'] }
    }
  }
};

// API automatically generates endpoints:
// GET    /api/v1/entities/users/records
// POST   /api/v1/entities/users/records
// GET    /api/v1/entities/users/records/:id
// PUT    /api/v1/entities/users/records/:id
// DELETE /api/v1/entities/users/records/:id
```

### 2. Building an E-commerce Platform

```typescript
// Product entity with complex schema
const productEntity = {
  name: 'products',
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      price: { type: 'number', minimum: 0 },
      inventory: { 
        type: 'object',
        properties: {
          quantity: { type: 'integer' },
          warehouse: { type: 'string' }
        }
      },
      categories: {
        type: 'array',
        items: { type: 'string' }
      }
    }
  }
};

// Use the API client for operations
const products = await client.entities.records('products').list({
  where: {
    'inventory.quantity': { $gt: 0 },
    categories: { $contains: 'electronics' }
  }
});
```

### 3. Building a CMS

```typescript
// Content entity with flexible schema
const contentEntity = {
  name: 'content',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      slug: { type: 'string', pattern: '^[a-z0-9-]+$' },
      content: { type: 'string' },
      metadata: { type: 'object' },
      publishedAt: { type: 'string', format: 'date-time' }
    }
  },
  permissions: {
    create: ['editor', 'admin'],
    read: ['*'],  // Public read access
    update: ['editor', 'admin'],
    delete: ['admin']
  }
};
```

### 4. Building an Analytics Dashboard

```typescript
// Track events
await client.analytics.track({
  event: 'page_view',
  properties: {
    page: '/dashboard',
    referrer: document.referrer
  }
});

// Query analytics
const stats = await client.analytics.query({
  metrics: ['views', 'unique_visitors'],
  dimensions: ['page', 'date'],
  dateRange: {
    start: '2024-01-01',
    end: '2024-01-31'
  }
});
```

---

## API Examples

### Authentication Flow

```typescript
// 1. Register a new user
const { user, accessToken } = await client.auth.register({
  email: 'user@example.com',
  password: 'SecurePassword123!',
  name: 'John Doe'
});

// 2. Login existing user
const { accessToken, refreshToken } = await client.auth.login({
  email: 'user@example.com',
  password: 'SecurePassword123!'
});

// 3. Use authenticated endpoints
client.setToken(accessToken);
const profile = await client.auth.getProfile();

// 4. Refresh token when expired
const newTokens = await client.auth.refreshToken(refreshToken);
```

### Entity Management

```typescript
// 1. Create an entity
const entity = await client.entities.create({
  name: 'tasks',
  displayName: 'Tasks',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      completed: { type: 'boolean' },
      dueDate: { type: 'string', format: 'date' }
    },
    required: ['title']
  }
});

// 2. Create records
const task = await client.entities.records('tasks').create({
  title: 'Complete documentation',
  completed: false,
  dueDate: '2024-12-31'
});

// 3. Query records
const incompleteTasks = await client.entities.records('tasks').list({
  where: { completed: false },
  orderBy: { dueDate: 'asc' }
});

// 4. Update record
await client.entities.records('tasks').update(task.id, {
  completed: true
});
```

### Bulk Operations

```typescript
// Import CSV data
const formData = new FormData();
formData.append('file', csvFile);

const result = await client.entities.records('products').import(formData, {
  format: 'csv',
  mapping: {
    'Product Name': 'name',
    'Price': 'price',
    'Stock': 'inventory'
  }
});

// Bulk create
const products = await client.entities.records('products').bulkCreate([
  { name: 'Product 1', price: 100 },
  { name: 'Product 2', price: 200 },
  { name: 'Product 3', price: 300 }
]);

// Export data
const csvData = await client.entities.records('products').export({
  format: 'csv',
  where: { price: { $gte: 100 } }
});
```

---

## Troubleshooting

### Common Issues

#### Database Connection Error
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Check connection string
psql "postgresql://user:password@localhost:5432/dbname"
```

#### Redis Connection Error
```bash
# Check Redis is running
redis-cli ping

# Should return: PONG
```

#### CORS Issues
```javascript
// Ensure API CORS configuration includes your frontend URL
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com
```

#### Build Errors
```bash
# Clear all caches and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Next.js cache (Admin UI)
rm -rf .next

# Clear TypeScript cache
rm -rf dist
```

### Performance Optimization

#### Database Indexes
```sql
-- Add indexes for frequently queried fields
CREATE INDEX idx_entity_records_entity_id ON entity_records(entity_id);
CREATE INDEX idx_entity_records_data_gin ON entity_records USING gin(data);
```

#### API Response Caching
```typescript
// Enable Redis caching
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const result = await expensive_operation();
await redis.setex(cacheKey, 300, JSON.stringify(result));
```

#### Frontend Optimization
```typescript
// Use React Query for caching
const { data } = useQuery({
  queryKey: ['entities'],
  queryFn: () => client.entities.list(),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

---

## Support & Resources

### Documentation
- [Admin UI Documentation](./admin-ui-documentation.md) - Complete guide for the administrative interface
- [API Documentation](./api-documentation.md) - Backend API reference and guides
- [API Client Documentation](./api-client-documentation.md) - Client library usage and examples

### Community
- GitHub Issues - Report bugs and request features
- Discussions - Ask questions and share ideas
- Discord - Join our community chat

### Contributing
We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details on:
- Code style and standards
- Development setup
- Testing requirements
- Pull request process

### License
This project is licensed under the MIT License. See [LICENSE](./LICENSE) file for details.

---

## Roadmap

### Q1 2024
- [ ] GraphQL API support
- [ ] Multi-tenancy support
- [ ] Advanced workflow automation
- [ ] Mobile app (React Native)

### Q2 2024
- [ ] AI/ML integration
- [ ] Advanced analytics dashboard
- [ ] Plugin system
- [ ] Marketplace for extensions

### Q3 2024
- [ ] Enterprise features (SSO, SAML)
- [ ] Advanced security features
- [ ] Performance optimizations
- [ ] Horizontal scaling improvements

### Q4 2024
- [ ] Global CDN integration
- [ ] Multi-region deployment
- [ ] Advanced monitoring
- [ ] Compliance certifications

---

## Changelog

### Version 1.0.0 (Current)
- Initial release
- Core platform features
- Dynamic API generation
- Admin dashboard
- TypeScript client library
- Docker support
- Comprehensive documentation

---

## Acknowledgments

This platform is built with amazing open-source technologies:
- [Next.js](https://nextjs.org/) - React framework
- [NestJS](https://nestjs.com/) - Node.js framework
- [PostgreSQL](https://www.postgresql.org/) - Database
- [Redis](https://redis.io/) - Cache and queue
- [Prisma](https://www.prisma.io/) - ORM
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [shadcn/ui](https://ui.shadcn.com/) - UI components

---

Thank you for choosing the Base Platform for your project! We're excited to see what you build with it. 🚀