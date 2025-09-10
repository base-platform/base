# Security Implementation Guide

## Comprehensive Security Features Documentation

This guide documents all security features implemented in the Runtime API Platform, including authentication, authorization, replay attack prevention, and data protection mechanisms.

---

## Table of Contents

1. [Security Architecture Overview](#security-architecture-overview)
2. [Authentication Systems](#authentication-systems)
3. [Replay Attack Prevention](#replay-attack-prevention)
4. [Authorization & Access Control](#authorization--access-control)
5. [Data Protection](#data-protection)
6. [Security Headers & CORS](#security-headers--cors)
7. [Rate Limiting & DDoS Protection](#rate-limiting--ddos-protection)
8. [Session Security](#session-security)
9. [API Key Management](#api-key-management)
10. [Audit Logging](#audit-logging)
11. [Security Best Practices](#security-best-practices)
12. [Incident Response](#incident-response)

---

## Security Architecture Overview

### Defense in Depth Strategy

The platform implements multiple layers of security:

```
┌─────────────────────────────────────────┐
│         External Threats                │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│  Layer 1: Network Security              │
│  • Firewall Rules                       │
│  • DDoS Protection                      │
│  • SSL/TLS Encryption                   │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│  Layer 2: Application Security          │
│  • Rate Limiting                        │
│  • CORS Protection                      │
│  • Security Headers                     │
│  • Input Validation                     │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│  Layer 3: Authentication & Authorization│
│  • JWT with Nonce Tracking              │
│  • Multi-Factor Authentication          │
│  • OAuth 2.0 Integration                │
│  • API Key Management                   │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│  Layer 4: Data Security                 │
│  • Encryption at Rest                   │
│  • Encryption in Transit                │
│  • Database Security                    │
│  • Secrets Management                   │
└─────────────────────────────────────────┘
```

### Security Modules

```typescript
// Core security modules in the API
├── auth/
│   ├── strategies/
│   │   ├── jwt.strategy.ts          // JWT validation with nonce
│   │   ├── jwt-nonce.strategy.ts    // Enhanced JWT with nonce tracking
│   │   ├── api-key.strategy.ts      // API key authentication
│   │   └── oauth.strategy.ts        // OAuth providers
│   ├── guards/
│   │   ├── jwt-auth.guard.ts        // Standard JWT guard
│   │   ├── jwt-nonce-auth.guard.ts  // JWT with nonce validation
│   │   ├── api-key.guard.ts         // API key guard
│   │   └── admin.guard.ts           // Role-based access
│   └── services/
│       ├── auth.service.ts          // Authentication logic
│       ├── mfa.service.ts           // Multi-factor auth
│       └── session.service.ts       // Session management
├── common/
│   ├── guards/
│   │   └── nonce.guard.ts           // Request nonce validation
│   ├── services/
│   │   ├── nonce.service.ts         // Nonce management
│   │   └── idempotency.service.ts   // Idempotent requests
│   └── interceptors/
│       └── security.interceptor.ts  // Security headers
└── security/
    ├── rate-limit.module.ts         // Rate limiting
    └── security-settings.service.ts // Runtime security config
```

---

## Authentication Systems

### 1. JWT Authentication with Nonce Tracking

**Implementation:**

```typescript
// JWT Token Structure
{
  "sub": "user-id",           // Subject (user ID)
  "email": "user@example.com",
  "role": "user",
  "jti": "unique-jwt-id",      // JWT ID for nonce tracking
  "iat": 1704067200,           // Issued at
  "exp": 1704068100            // Expiration
}
```

**Token Generation with Nonce:**

```typescript
// auth.service.ts
private async generateTokens(userId: string, email: string) {
  // Generate unique JWT ID for replay protection
  const jti = await this.nonceService.generateJwtNonce(userId);
  
  const payload = { 
    sub: userId, 
    email,
    jti,  // Unique identifier for token tracking
    iat: Math.floor(Date.now() / 1000)
  };

  const [accessToken, refreshToken] = await Promise.all([
    this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: '15m'
    }),
    this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: '7d'
    })
  ]);

  return { accessToken, refreshToken };
}
```

**Token Validation with Nonce:**

```typescript
// jwt.strategy.ts
async validate(payload: any) {
  // Validate JWT nonce to prevent replay
  if (payload.jti) {
    const nonceValidation = await this.nonceService.validateJwtNonce(
      payload.jti,
      payload.sub
    );

    if (!nonceValidation.valid) {
      throw new UnauthorizedException(`Invalid token: ${nonceValidation.reason}`);
    }
  }

  // Validate user exists and is active
  const user = await this.prisma.user.findUnique({
    where: { id: payload.sub }
  });

  if (!user || !user.is_active) {
    throw new UnauthorizedException();
  }

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    jti: payload.jti
  };
}
```

**Token Revocation on Logout:**

```typescript
// auth.controller.ts
@Post('logout')
@UseGuards(JwtNonceAuthGuard)  // Uses nonce-aware JWT validation
async logout(@Request() req: any) {
  return this.authService.logout(req.user.userId, req.user.jti);
}

// auth.service.ts
async logout(userId: string, jti?: string) {
  // Revoke refresh tokens
  await this.prisma.refreshToken.deleteMany({
    where: { user_id: userId }
  });
  
  // Revoke JWT nonce to invalidate token immediately
  if (jti) {
    await this.nonceService.revokeJwtNonce(jti);
  }
  
  return { message: 'Logged out successfully' };
}
```

### 2. Multi-Factor Authentication (MFA)

**TOTP Implementation:**

```typescript
// mfa.service.ts
async setupMFA(userId: string) {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(
    user.email, 
    'Base Platform', 
    secret
  );
  
  // Store encrypted secret
  await this.prisma.user.update({
    where: { id: userId },
    data: { 
      mfa_secret: await this.encrypt(secret),
      mfa_enabled: false  // Not enabled until verified
    }
  });
  
  return {
    secret,
    qrCode: await QRCode.toDataURL(otpauth)
  };
}

async verifyMFA(userId: string, token: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId }
  });
  
  const secret = await this.decrypt(user.mfa_secret);
  const isValid = authenticator.verify({
    token,
    secret
  });
  
  if (!isValid) {
    throw new UnauthorizedException('Invalid MFA token');
  }
  
  return { valid: true };
}
```

### 3. OAuth 2.0 Integration

**Provider Configuration:**

```typescript
// oauth.service.ts
private providers = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v1/userinfo',
    scopes: ['email', 'profile']
  },
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scopes: ['user:email']
  }
};
```

---

## Replay Attack Prevention

### Request Nonce Implementation

**Nonce Guard for Request Protection:**

```typescript
// nonce.guard.ts
@Injectable()
export class NonceGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Extract nonce headers
    const nonce = request.headers['x-nonce'];
    const timestamp = request.headers['x-timestamp'];
    const signature = request.headers['x-signature'];
    
    // Validate timestamp freshness
    const now = Date.now();
    const requestTime = parseInt(timestamp);
    const maxAge = 300000; // 5 minutes
    
    if (Math.abs(now - requestTime) > maxAge) {
      throw new UnauthorizedException('Request expired');
    }
    
    // Validate nonce hasn't been used
    const validation = await this.nonceService.validateRequestNonce(
      nonce,
      request.url,
      request.method,
      request.user?.userId
    );
    
    if (!validation.valid) {
      throw new UnauthorizedException(`Nonce validation failed: ${validation.reason}`);
    }
    
    // Verify signature if required
    if (requireSignature) {
      const isValidSignature = this.nonceService.verifySignature(
        signature,
        request.method,
        request.url,
        nonce,
        requestTime,
        request.body
      );
      
      if (!isValidSignature) {
        throw new UnauthorizedException('Invalid signature');
      }
    }
    
    return true;
  }
}
```

**Nonce Service Implementation:**

```typescript
// nonce.service.ts
async validateRequestNonce(
  nonce: string,
  endpoint?: string,
  method?: string,
  userId?: string
): Promise<NonceValidationResult> {
  const existingNonce = await this.prisma.nonce.findUnique({
    where: { nonce }
  });

  // First-time use of client-generated nonce
  if (!existingNonce) {
    try {
      // Store nonce to prevent replay
      await this.prisma.nonce.create({
        data: {
          nonce,
          type: 'request',
          user_id: userId,
          endpoint,
          method,
          expires_at: new Date(Date.now() + 300000) // 5 min TTL
        }
      });
      return { valid: true };
    } catch (error) {
      // Duplicate key means nonce was already used
      return { valid: false, reason: 'Nonce already used' };
    }
  }

  // Nonce exists = already used = reject
  return { valid: false, reason: 'Nonce already used' };
}
```

**Protected Endpoints Configuration:**

```typescript
// entities.controller.ts
@Post(':entityId/records')
@UseGuards(NonceGuard)  // Requires nonce headers
async createEntityRecord(
  @Param('entityId') entityId: string,
  @Body() dto: CreateEntityRecordDto
) {
  // Request is guaranteed to be unique (no replay possible)
  return this.entitiesService.createEntityRecord(entityId, dto);
}
```

### HMAC Signature Verification

**Signature Generation:**

```typescript
generateSignature(
  method: string,
  url: string,
  nonce: string,
  timestamp: number,
  body?: any,
  secret?: string
): string {
  const signatureSecret = secret || this.config.get('NONCE_SECRET');
  const payload = `${method.toUpperCase()}:${url}:${nonce}:${timestamp}:${body ? JSON.stringify(body) : ''}`;
  
  return crypto
    .createHmac('sha256', signatureSecret)
    .update(payload)
    .digest('hex');
}
```

**Client Implementation Example:**

```typescript
// Client-side nonce generation
const nonce = crypto.randomUUID();
const timestamp = Date.now();
const body = { data: { name: 'Test' } };

// Generate signature
const signaturePayload = `POST:/api/v1/entities/123/records:${nonce}:${timestamp}:${JSON.stringify(body)}`;
const signature = crypto
  .createHmac('sha256', apiSecret)
  .update(signaturePayload)
  .digest('hex');

// Make request with nonce headers
const response = await fetch('/api/v1/entities/123/records', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Nonce': nonce,
    'X-Timestamp': timestamp.toString(),
    'X-Signature': signature
  },
  body: JSON.stringify(body)
});
```

---

## Authorization & Access Control

### Role-Based Access Control (RBAC)

**Role Hierarchy:**

```typescript
enum UserRole {
  SUPER_ADMIN = 'super_admin',  // Full system access
  ADMIN = 'admin',               // Administrative functions
  USER = 'user',                 // Standard user access
  GUEST = 'guest'                // Limited read-only access
}

// Role permissions matrix
const rolePermissions = {
  super_admin: ['*'],  // All permissions
  admin: [
    'users:read', 'users:write', 'users:delete',
    'entities:*',
    'settings:read', 'settings:write'
  ],
  user: [
    'entities:read', 'entities:write',
    'profile:*'
  ],
  guest: [
    'entities:read',
    'public:read'
  ]
};
```

**Admin Guard Implementation:**

```typescript
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new ForbiddenException('Admin access required');
    }
    
    return true;
  }
}
```

### Permission-Based Access Control

```typescript
// Decorator for fine-grained permissions
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  
  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler()
    );
    
    if (!requiredPermissions) {
      return true;
    }
    
    const request = context.switchToHttp().getRequest();
    const userPermissions = this.getUserPermissions(request.user);
    
    return requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );
  }
}

// Usage
@Post('sensitive-operation')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('admin:write', 'settings:modify')
async sensitiveOperation() {
  // Only users with both permissions can access
}
```

---

## Data Protection

### Encryption at Rest

**Database Field Encryption:**

```typescript
// Prisma schema with encrypted fields
model User {
  id              String   @id @default(uuid())
  email           String   @unique
  password_hash   String   // Bcrypt hashed
  mfa_secret      String?  // AES-256 encrypted
  api_keys        String[] // Encrypted array
  sensitive_data  Json?    // Encrypted JSON
}

// Encryption service
@Injectable()
export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  
  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }
  
  decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

### Password Security

```typescript
// Password hashing with bcrypt
async hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

async validatePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Password complexity requirements
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[a-z]/, 'Password must contain lowercase letter')
  .regex(/[0-9]/, 'Password must contain number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain special character');
```

---

## Security Headers & CORS

### Security Headers Configuration

```typescript
// main.ts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "no-referrer" },
  xssFilter: true,
}));
```

### CORS Configuration

```typescript
// CORS setup with dynamic origin validation
app.enableCors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://admin.example.com',
      process.env.FRONTEND_URL
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-ID',
    'X-Nonce',
    'X-Timestamp',
    'X-Signature'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  maxAge: 86400 // 24 hours
});
```

---

## Rate Limiting & DDoS Protection

### Dynamic Rate Limiting

```typescript
// Rate limit configuration
@Injectable()
export class RateLimitService {
  private limits = new Map<string, RateLimitRule>();
  
  async applyRateLimit(
    endpoint: string,
    identifier: string // IP, user ID, or API key
  ): Promise<RateLimitResult> {
    const key = `rate_limit:${endpoint}:${identifier}`;
    const rule = await this.getRule(endpoint);
    
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, rule.window);
    }
    
    if (current > rule.limit) {
      const ttl = await this.redis.ttl(key);
      throw new TooManyRequestsException({
        message: 'Rate limit exceeded',
        retryAfter: ttl,
        limit: rule.limit,
        remaining: 0,
        reset: Date.now() + (ttl * 1000)
      });
    }
    
    return {
      limit: rule.limit,
      remaining: rule.limit - current,
      reset: Date.now() + (rule.window * 1000)
    };
  }
}
```

### Throttling Configuration

```typescript
// Per-endpoint throttling
const throttleConfig = {
  '/api/v1/auth/login': {
    ttl: 900,    // 15 minutes
    limit: 5     // 5 attempts
  },
  '/api/v1/auth/register': {
    ttl: 3600,   // 1 hour
    limit: 3     // 3 registrations
  },
  '/api/v1/entities/*': {
    ttl: 60,     // 1 minute
    limit: 100   // 100 requests
  },
  'default': {
    ttl: 60,     // 1 minute
    limit: 100   // 100 requests
  }
};
```

---

## Session Security

### Session Management

```typescript
// Session fingerprinting
interface SessionFingerprint {
  userAgent: string;
  acceptLanguage: string;
  acceptEncoding: string;
  ip: string;
  screenResolution?: string;
  timezone?: string;
  plugins?: string[];
}

async createSession(
  userId: string,
  fingerprint: SessionFingerprint
): Promise<Session> {
  const sessionId = crypto.randomUUID();
  const fingerprintHash = this.hashFingerprint(fingerprint);
  
  const session = await this.prisma.session.create({
    data: {
      id: sessionId,
      user_id: userId,
      fingerprint: fingerprintHash,
      ip_address: fingerprint.ip,
      user_agent: fingerprint.userAgent,
      expires_at: new Date(Date.now() + SESSION_DURATION),
      last_activity: new Date()
    }
  });
  
  return session;
}

// Session validation
async validateSession(
  sessionId: string,
  fingerprint: SessionFingerprint
): Promise<boolean> {
  const session = await this.prisma.session.findUnique({
    where: { id: sessionId }
  });
  
  if (!session || session.expires_at < new Date()) {
    return false;
  }
  
  // Verify fingerprint hasn't changed
  const fingerprintHash = this.hashFingerprint(fingerprint);
  if (session.fingerprint !== fingerprintHash) {
    // Potential session hijacking
    await this.alertSecurityTeam({
      type: 'SESSION_HIJACK_ATTEMPT',
      sessionId,
      originalFingerprint: session.fingerprint,
      newFingerprint: fingerprintHash
    });
    return false;
  }
  
  // Update last activity
  await this.prisma.session.update({
    where: { id: sessionId },
    data: { last_activity: new Date() }
  });
  
  return true;
}
```

### Device Trust

```typescript
// Trusted device management
async trustDevice(
  userId: string,
  fingerprint: string,
  name?: string
): Promise<TrustedDevice> {
  const device = await this.prisma.trustedDevice.create({
    data: {
      user_id: userId,
      fingerprint,
      name: name || 'Unknown Device',
      trusted_at: new Date(),
      last_used: new Date(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  });
  
  return device;
}
```

---

## API Key Management

### API Key Generation and Rotation

```typescript
// API key service
@Injectable()
export class ApiKeyService {
  async createApiKey(
    userId: string,
    options: CreateApiKeyOptions
  ): Promise<ApiKeyResult> {
    const key = this.generateSecureKey();
    const keyHash = await this.hashApiKey(key);
    
    const apiKey = await this.prisma.apiKey.create({
      data: {
        user_id: userId,
        name: options.name,
        key_hash: keyHash,
        key_prefix: key.substring(0, 8),
        permissions: options.permissions || [],
        rate_limit: options.rateLimit || 1000,
        expires_at: options.expiresAt,
        last_rotated: new Date(),
        rotation_reminder: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
      }
    });
    
    // Return key only once
    return {
      id: apiKey.id,
      key: `${apiKey.key_prefix}...${key}`,
      message: 'Store this key securely. It cannot be retrieved again.'
    };
  }
  
  async rotateApiKey(keyId: string): Promise<ApiKeyResult> {
    const existingKey = await this.prisma.apiKey.findUnique({
      where: { id: keyId }
    });
    
    if (!existingKey) {
      throw new NotFoundException('API key not found');
    }
    
    // Generate new key
    const newKey = this.generateSecureKey();
    const newKeyHash = await this.hashApiKey(newKey);
    
    // Update with new key
    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: {
        key_hash: newKeyHash,
        key_prefix: newKey.substring(0, 8),
        last_rotated: new Date(),
        rotation_reminder: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        version: { increment: 1 }
      }
    });
    
    // Log rotation event
    await this.auditLog.log({
      event: 'API_KEY_ROTATED',
      keyId,
      userId: existingKey.user_id,
      timestamp: new Date()
    });
    
    return {
      id: keyId,
      key: `${newKey.substring(0, 8)}...${newKey}`,
      message: 'API key rotated successfully'
    };
  }
  
  private generateSecureKey(): string {
    return crypto.randomBytes(32).toString('base64url');
  }
  
  private async hashApiKey(key: string): Promise<string> {
    return bcrypt.hash(key, 10);
  }
}
```

---

## Audit Logging

### Comprehensive Audit Trail

```typescript
// Audit log service
@Injectable()
export class AuditLogService {
  async log(event: AuditEvent): Promise<void> {
    const log = await this.prisma.auditLog.create({
      data: {
        event_type: event.type,
        user_id: event.userId,
        ip_address: event.ip,
        user_agent: event.userAgent,
        resource_type: event.resourceType,
        resource_id: event.resourceId,
        action: event.action,
        changes: event.changes,
        metadata: event.metadata,
        timestamp: new Date(),
        success: event.success,
        error_message: event.error
      }
    });
    
    // Real-time alerting for critical events
    if (this.isCriticalEvent(event)) {
      await this.alertingService.sendAlert({
        severity: 'HIGH',
        event: event.type,
        details: log
      });
    }
  }
  
  private isCriticalEvent(event: AuditEvent): boolean {
    const criticalEvents = [
      'UNAUTHORIZED_ACCESS_ATTEMPT',
      'PRIVILEGE_ESCALATION',
      'DATA_BREACH_ATTEMPT',
      'MASS_DATA_EXPORT',
      'ADMIN_ACTION',
      'SECURITY_SETTING_CHANGE'
    ];
    
    return criticalEvents.includes(event.type);
  }
}
```

### Audit Event Types

```typescript
enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_DISABLED = 'MFA_DISABLED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  
  // Authorization events
  ACCESS_GRANTED = 'ACCESS_GRANTED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  PERMISSION_CHANGED = 'PERMISSION_CHANGED',
  ROLE_CHANGED = 'ROLE_CHANGED',
  
  // Data events
  DATA_CREATED = 'DATA_CREATED',
  DATA_READ = 'DATA_READ',
  DATA_UPDATED = 'DATA_UPDATED',
  DATA_DELETED = 'DATA_DELETED',
  DATA_EXPORTED = 'DATA_EXPORTED',
  
  // Security events
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_NONCE = 'INVALID_NONCE',
  SESSION_HIJACK_ATTEMPT = 'SESSION_HIJACK_ATTEMPT',
  API_KEY_COMPROMISED = 'API_KEY_COMPROMISED'
}
```

---

## Security Best Practices

### Input Validation

```typescript
// DTO validation with class-validator
export class CreateEntityDto {
  @IsString()
  @Length(3, 50)
  @Matches(/^[a-zA-Z0-9_-]+$/)
  name: string;
  
  @IsObject()
  @ValidateNested()
  @Type(() => EntitySchemaDto)
  schema: EntitySchemaDto;
  
  @IsOptional()
  @IsObject()
  @IsSanitized()  // Custom decorator for XSS prevention
  config?: Record<string, any>;
}

// SQL injection prevention (using Prisma)
// Prisma automatically escapes all queries
const users = await this.prisma.user.findMany({
  where: {
    email: userInput // Automatically escaped
  }
});

// XSS prevention
@Injectable()
export class SanitizationPipe implements PipeTransform {
  transform(value: any): any {
    if (typeof value === 'string') {
      return DOMPurify.sanitize(value);
    }
    if (typeof value === 'object') {
      return this.sanitizeObject(value);
    }
    return value;
  }
}
```

### Secrets Management

```typescript
// Environment variable validation
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z.string().length(64), // 32 bytes hex
  NONCE_SECRET: z.string().min(32),
  REDIS_URL: z.string().url(),
  OAUTH_CLIENT_ID: z.string(),
  OAUTH_CLIENT_SECRET: z.string(),
  MFA_ISSUER: z.string()
});

// Validate on startup
const env = envSchema.parse(process.env);
```

### Error Handling

```typescript
// Global exception filter
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    // Log error for monitoring
    this.logger.error(exception);
    
    // Sanitize error for client
    const sanitizedError = this.sanitizeError(exception);
    
    // Audit log for security events
    if (this.isSecurityException(exception)) {
      this.auditLog.log({
        type: 'SECURITY_EXCEPTION',
        error: exception,
        request: {
          url: request.url,
          method: request.method,
          ip: request.ip
        }
      });
    }
    
    response.status(sanitizedError.status).json({
      type: sanitizedError.type,
      title: sanitizedError.title,
      status: sanitizedError.status,
      detail: sanitizedError.detail,
      instance: request.url,
      timestamp: new Date().toISOString()
    });
  }
  
  private sanitizeError(exception: unknown): SanitizedError {
    // Never expose internal errors to client
    if (exception instanceof InternalServerErrorException) {
      return {
        type: 'internal-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred'
      };
    }
    // ... handle other exceptions
  }
}
```

---

## Incident Response

### Security Incident Detection

```typescript
@Injectable()
export class SecurityMonitoringService {
  private readonly thresholds = {
    failedLogins: 5,
    rateLimitViolations: 10,
    invalidNonces: 3,
    suspiciousPatterns: 5
  };
  
  async detectAnomalies(userId: string): Promise<AnomalyReport> {
    const recentActivity = await this.getRecentActivity(userId);
    
    const anomalies = [];
    
    // Check for brute force attempts
    if (recentActivity.failedLogins > this.thresholds.failedLogins) {
      anomalies.push({
        type: 'BRUTE_FORCE_ATTEMPT',
        severity: 'HIGH',
        details: `${recentActivity.failedLogins} failed login attempts`
      });
    }
    
    // Check for rate limit abuse
    if (recentActivity.rateLimitViolations > this.thresholds.rateLimitViolations) {
      anomalies.push({
        type: 'RATE_LIMIT_ABUSE',
        severity: 'MEDIUM',
        details: `${recentActivity.rateLimitViolations} rate limit violations`
      });
    }
    
    // Check for replay attack attempts
    if (recentActivity.invalidNonces > this.thresholds.invalidNonces) {
      anomalies.push({
        type: 'REPLAY_ATTACK_ATTEMPT',
        severity: 'HIGH',
        details: `${recentActivity.invalidNonces} invalid nonce attempts`
      });
    }
    
    return {
      userId,
      anomalies,
      timestamp: new Date(),
      recommended_action: this.getRecommendedAction(anomalies)
    };
  }
  
  private getRecommendedAction(anomalies: Anomaly[]): string {
    const hasCritical = anomalies.some(a => a.severity === 'HIGH');
    
    if (hasCritical) {
      return 'LOCKDOWN'; // Immediate account suspension
    }
    
    if (anomalies.length > 3) {
      return 'ENHANCED_MONITORING'; // Increase monitoring
    }
    
    return 'CONTINUE_MONITORING';
  }
}
```

### Automated Response

```typescript
@Injectable()
export class IncidentResponseService {
  async handleSecurityIncident(incident: SecurityIncident): Promise<void> {
    // 1. Immediate containment
    await this.containIncident(incident);
    
    // 2. Evidence collection
    const evidence = await this.collectEvidence(incident);
    
    // 3. Notification
    await this.notifyStakeholders(incident, evidence);
    
    // 4. Remediation
    await this.remediateIncident(incident);
    
    // 5. Documentation
    await this.documentIncident(incident, evidence);
  }
  
  private async containIncident(incident: SecurityIncident): Promise<void> {
    switch (incident.type) {
      case 'ACCOUNT_COMPROMISE':
        // Immediately lock account
        await this.userService.lockAccount(incident.userId);
        // Revoke all sessions
        await this.sessionService.revokeAllSessions(incident.userId);
        // Revoke all API keys
        await this.apiKeyService.revokeAllKeys(incident.userId);
        break;
        
      case 'DATA_BREACH':
        // Enable read-only mode
        await this.systemService.enableReadOnlyMode();
        // Block suspected IP addresses
        await this.firewallService.blockIPs(incident.suspectedIPs);
        break;
        
      case 'DDOS_ATTACK':
        // Enable DDoS protection mode
        await this.cloudflareService.enableUnderAttackMode();
        // Scale up resources
        await this.infrastructureService.scaleUp();
        break;
    }
  }
}
```

---

## Security Monitoring Dashboard

### Real-time Security Metrics

```typescript
interface SecurityMetrics {
  authentication: {
    successfulLogins: number;
    failedLogins: number;
    mfaUsage: number;
    suspiciousAttempts: number;
  };
  authorization: {
    accessGranted: number;
    accessDenied: number;
    privilegeEscalations: number;
  };
  threats: {
    blockedIPs: number;
    replayAttacks: number;
    rateLimitViolations: number;
    maliciousPayloads: number;
  };
  compliance: {
    encryptedData: number;
    auditLogEntries: number;
    gdprRequests: number;
  };
}

@Injectable()
export class SecurityDashboardService {
  async getSecurityMetrics(): Promise<SecurityMetrics> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return {
      authentication: await this.getAuthMetrics(last24Hours),
      authorization: await this.getAuthzMetrics(last24Hours),
      threats: await this.getThreatMetrics(last24Hours),
      compliance: await this.getComplianceMetrics(last24Hours)
    };
  }
}
```

---

## Security Configuration

### Runtime Security Settings

```typescript
// Security settings that can be modified at runtime
interface SecuritySettings {
  authentication: {
    passwordMinLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireLowercase: boolean;
    passwordRequireNumbers: boolean;
    passwordRequireSpecialChars: boolean;
    passwordExpirationDays: number;
    mfaRequired: boolean;
    sessionTimeout: number;
    maxConcurrentSessions: number;
  };
  rateLimit: {
    globalLimit: number;
    globalWindow: number;
    perUserLimit: number;
    perUserWindow: number;
    perIpLimit: number;
    perIpWindow: number;
  };
  security: {
    enableNonceValidation: boolean;
    nonceTtl: number;
    requireSignature: boolean;
    enableIpWhitelist: boolean;
    ipWhitelist: string[];
    enableIpBlacklist: boolean;
    ipBlacklist: string[];
    corsOrigins: string[];
    enableAuditLogging: boolean;
    auditLogRetentionDays: number;
  };
}
```

---

## Testing Security

### Security Test Suite

```bash
# Run security tests
npm run test:security

# Test files
├── test/
│   ├── security/
│   │   ├── auth.security.spec.ts      # Authentication tests
│   │   ├── nonce.security.spec.ts     # Nonce validation tests
│   │   ├── injection.security.spec.ts # Injection prevention tests
│   │   ├── xss.security.spec.ts       # XSS prevention tests
│   │   └── rate-limit.security.spec.ts # Rate limiting tests
```

### Penetration Testing Checklist

- [ ] SQL Injection attempts
- [ ] XSS payload injection
- [ ] CSRF token validation
- [ ] JWT token manipulation
- [ ] Nonce replay attacks
- [ ] Rate limit bypass attempts
- [ ] Authentication bypass
- [ ] Authorization escalation
- [ ] Session hijacking
- [ ] API key compromise
- [ ] File upload vulnerabilities
- [ ] XXE injection
- [ ] SSRF attempts
- [ ] Directory traversal
- [ ] Command injection

---

## Compliance

### GDPR Compliance

```typescript
// Data privacy endpoints
@Controller('privacy')
export class PrivacyController {
  @Get('my-data')
  @UseGuards(JwtAuthGuard)
  async exportUserData(@Request() req) {
    // Export all user data
    return this.privacyService.exportUserData(req.user.userId);
  }
  
  @Delete('my-account')
  @UseGuards(JwtAuthGuard)
  async deleteAccount(@Request() req) {
    // Right to be forgotten
    return this.privacyService.deleteAllUserData(req.user.userId);
  }
  
  @Post('consent')
  @UseGuards(JwtAuthGuard)
  async updateConsent(@Request() req, @Body() consent: ConsentDto) {
    return this.privacyService.updateConsent(req.user.userId, consent);
  }
}
```

### Security Standards

- **OWASP Top 10**: All vulnerabilities addressed
- **PCI DSS**: Payment card data protection (if applicable)
- **SOC 2**: Security controls implemented
- **ISO 27001**: Information security management
- **HIPAA**: Healthcare data protection (if applicable)

---

## Conclusion

This comprehensive security implementation provides multiple layers of protection:

1. **Authentication**: Multi-factor, OAuth, API keys
2. **Authorization**: RBAC, permissions, guards
3. **Replay Protection**: JWT nonces, request nonces
4. **Data Security**: Encryption, hashing, sanitization
5. **Network Security**: Rate limiting, CORS, headers
6. **Monitoring**: Audit logs, metrics, alerting
7. **Incident Response**: Detection, containment, remediation

Regular security audits, penetration testing, and updates are essential to maintain security posture.