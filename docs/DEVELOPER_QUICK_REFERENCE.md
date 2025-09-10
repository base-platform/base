# Developer Quick Reference

## Quick Start Commands

```bash
# Infrastructure
cd infrastructure && make up          # Start databases
cd api && npm run start:dev            # Start API (port 3001)
cd admin-ui && npm run dev             # Start UI (port 3000)

# Testing
cd api && ./test-nonce.sh              # Test nonce implementation
cd api && npm run test                 # Run unit tests
cd api && npm run test:e2e             # Run E2E tests

# Database
cd api && npx prisma studio            # Open Prisma Studio
cd api && npx prisma migrate dev       # Run migrations
cd api && npm run db:sample            # Create sample data
```

---

## API Authentication Examples

### JWT Authentication

```typescript
// Login
const response = await fetch('http://localhost:3001/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', password: 'password123' })
});
const { accessToken, refreshToken } = await response.json();

// Use token
const data = await fetch('http://localhost:3001/api/v1/entities', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

### Request with Nonce Protection

```typescript
// Generate nonce and timestamp
const nonce = crypto.randomUUID();
const timestamp = Date.now();

// Make request with nonce headers
const response = await fetch('http://localhost:3001/api/v1/entities/123/records', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Nonce': nonce,
    'X-Timestamp': timestamp.toString()
  },
  body: JSON.stringify({ data: { name: 'Test' } })
});
```

### API Key Authentication

```typescript
const response = await fetch('http://localhost:3001/api/v1/entities', {
  headers: { 'X-API-Key': 'your-api-key-here' }
});
```

---

## Common Development Tasks

### Creating a New Entity

```typescript
// POST /api/v1/entities
{
  "name": "products",
  "description": "Product catalog",
  "schema": {
    "type": "object",
    "properties": {
      "name": { "type": "string", "minLength": 1, "maxLength": 100 },
      "price": { "type": "number", "minimum": 0 },
      "category": { "type": "string" },
      "inStock": { "type": "boolean" }
    },
    "required": ["name", "price"]
  },
  "config": {
    "enableIdempotency": true,
    "nonceConfig": {
      "enabled": true,
      "methods": ["POST", "PUT", "DELETE"],
      "ttl": 300000
    }
  }
}
```

### Adding a New Module

```bash
# Generate new module
cd api && nest g module features/myfeature
cd api && nest g controller features/myfeature
cd api && nest g service features/myfeature

# Add to app.module.ts imports
```

### Database Migration

```bash
# Create migration after schema changes
cd api && npx prisma migrate dev --name description_of_change

# Apply migrations in production
cd api && npx prisma migrate deploy
```

---

## Security Implementation

### Adding Nonce Protection to Endpoint

```typescript
// In controller
import { NonceGuard } from '../common/guards/nonce.guard';

@Post('sensitive-operation')
@UseGuards(JwtAuthGuard, NonceGuard)
async sensitiveOperation(@Body() dto: OperationDto) {
  // Operation protected from replay attacks
}
```

### Adding Rate Limiting

```typescript
// In controller
import { Throttle } from '@nestjs/throttler';

@Post('login')
@Throttle(5, 900)  // 5 requests per 15 minutes
async login(@Body() dto: LoginDto) {
  // Rate-limited endpoint
}
```

### Adding Idempotency

```typescript
// In controller
import { Idempotent } from '../common/decorators/idempotent.decorator';

@Post('payment')
@Idempotent({ ttl: 86400000 })  // 24 hours
async processPayment(@Body() dto: PaymentDto) {
  // Idempotent operation
}
```

---

## Testing

### Unit Test Example

```typescript
// service.spec.ts
describe('EntityService', () => {
  let service: EntityService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [EntityService, PrismaService],
    }).compile();

    service = module.get<EntityService>(EntityService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should create entity', async () => {
    const dto = { name: 'test', schema: {} };
    jest.spyOn(prisma.entity, 'create').mockResolvedValue(mockEntity);
    
    const result = await service.createEntity('user-id', dto);
    expect(result).toEqual(mockEntity);
  });
});
```

### E2E Test Example

```typescript
// app.e2e-spec.ts
describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/auth/login (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password' })
      .expect(200)
      .expect(res => {
        expect(res.body).toHaveProperty('accessToken');
      });
  });
});
```

---

## Environment Variables

### Required Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/db"

# JWT
JWT_SECRET="minimum-32-character-secret-key"
JWT_REFRESH_SECRET="different-32-character-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Redis/Valkey
REDIS_URL="redis://localhost:6379"

# Encryption
ENCRYPTION_KEY="64-character-hex-string"
NONCE_SECRET="32-character-secret"

# Server
PORT=3001
NODE_ENV=development
CORS_ORIGIN="http://localhost:3000"
```

---

## Database Schema Quick Reference

### Core Tables

```sql
-- Users
users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  password_hash VARCHAR,
  role VARCHAR,
  is_active BOOLEAN,
  mfa_enabled BOOLEAN,
  created_at TIMESTAMP
)

-- Entities (Dynamic schemas)
entities (
  id UUID PRIMARY KEY,
  name VARCHAR UNIQUE,
  schema JSONB,
  config JSONB,
  created_by UUID REFERENCES users(id)
)

-- Entity Records
entity_records (
  id UUID PRIMARY KEY,
  entity_id UUID REFERENCES entities(id),
  data JSONB,
  created_by UUID REFERENCES users(id)
)

-- Nonces (Replay protection)
nonces (
  id UUID PRIMARY KEY,
  nonce VARCHAR UNIQUE,
  type VARCHAR,  -- 'jwt' or 'request'
  user_id UUID,
  expires_at TIMESTAMP
)

-- Sessions
sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  fingerprint VARCHAR,
  ip_address VARCHAR,
  expires_at TIMESTAMP
)

-- API Keys
api_keys (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  key_hash VARCHAR,
  permissions TEXT[],
  expires_at TIMESTAMP
)
```

---

## Debugging Tips

### Common Issues and Solutions

```bash
# Port already in use
lsof -i :3001 && kill -9 <PID>

# Database connection failed
cd infrastructure && make status
cd infrastructure && make restart

# Prisma client out of sync
cd api && npx prisma generate

# TypeScript errors
cd api && npm run typecheck

# Module not found errors
cd api && rm -rf node_modules && npm install
```

### Useful Debug Commands

```bash
# View API logs
cd api && npm run start:dev | grep ERROR

# Check database
cd api && npx prisma studio

# Test specific endpoint
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Check Redis/Valkey
redis-cli ping
redis-cli KEYS "*"
```

---

## Performance Optimization

### Query Optimization

```typescript
// Bad - N+1 query
const users = await prisma.user.findMany();
for (const user of users) {
  const posts = await prisma.post.findMany({ where: { userId: user.id } });
}

// Good - Single query with relation
const users = await prisma.user.findMany({
  include: { posts: true }
});
```

### Caching Strategy

```typescript
// Cache service
@Injectable()
export class CacheService {
  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  async set(key: string, value: any, ttl = 3600): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }
}

// Usage in service
async getEntity(id: string) {
  const cacheKey = `entity:${id}`;
  const cached = await this.cache.get(cacheKey);
  if (cached) return cached;
  
  const entity = await this.prisma.entity.findUnique({ where: { id } });
  await this.cache.set(cacheKey, entity);
  return entity;
}
```

---

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/your-feature

# Commit message convention
# feat: new feature
# fix: bug fix
# docs: documentation
# refactor: code refactoring
# test: tests
# chore: maintenance
```

---

## Useful Resources

### Documentation
- API Docs: http://localhost:3001/api/docs
- Prisma Studio: http://localhost:5555
- Admin UI: http://localhost:3000

### External Links
- [NestJS Docs](https://docs.nestjs.com)
- [Prisma Docs](https://www.prisma.io/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [shadcn/ui](https://ui.shadcn.com)

### Project Structure
```
base/
├── api/                 # NestJS backend
│   ├── src/
│   │   ├── auth/       # Authentication
│   │   ├── common/     # Shared modules
│   │   ├── entities/   # Entity management
│   │   └── main.ts     # Entry point
│   └── test/           # Tests
├── admin-ui/           # Next.js frontend
│   ├── app/           # App router pages
│   ├── components/    # React components
│   └── lib/          # Utilities
├── infrastructure/    # Docker setup
│   ├── docker-compose.yml
│   └── Makefile
└── docs/             # Documentation
```

---

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Cannot connect to database | Check Docker is running: `docker ps` |
| Prisma migration fails | Reset DB: `npx prisma migrate reset` |
| JWT expired error | Refresh token or login again |
| CORS error | Check CORS_ORIGIN env variable |
| Rate limit error | Wait or increase limits in config |
| Nonce already used | Ensure unique nonce per request |
| Module not found | Run `npm install` |
| Type errors | Run `npx prisma generate` |

---

## Contact & Support

- GitHub Issues: Report bugs and request features
- Security: security@example.com
- Documentation: /docs folder
- API Status: http://localhost:3001/health