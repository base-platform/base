# Nonce and Replay Attack Protection

## Table of Contents
- [Overview](#overview)
- [What are Replay Attacks?](#what-are-replay-attacks)
- [What is a Nonce?](#what-is-a-nonce)
- [Implementation in This Project](#implementation-in-this-project)
- [JWT Nonce (Option 1)](#jwt-nonce-option-1)
- [Request Nonce (Option 2)](#request-nonce-option-2)
- [Configuration Guide](#configuration-guide)
- [Client Implementation](#client-implementation)
- [Testing](#testing)
- [Best Practices](#best-practices)
- [Comparison with Idempotency](#comparison-with-idempotency)

## Overview

This platform implements comprehensive replay attack protection using a dual-layer nonce system. Nonce (Number used once) is a cryptographic technique that ensures each request or token can only be used once, preventing malicious actors from capturing and replaying legitimate requests.

## What are Replay Attacks?

A replay attack is a network security breach where an attacker intercepts a valid data transmission and maliciously repeats or delays it. Common scenarios include:

1. **Token Replay**: Attacker captures a valid JWT token and reuses it after the user logs out
2. **Request Replay**: Attacker captures a valid API request (e.g., payment) and replays it multiple times
3. **Session Hijacking**: Attacker uses captured session credentials to impersonate a user
4. **Man-in-the-Middle**: Attacker intercepts and replays requests to gain unauthorized access

### Real-World Examples

- **Banking**: Replaying a fund transfer request to drain an account
- **E-commerce**: Replaying a purchase request to create duplicate orders
- **Authentication**: Reusing a captured authentication token after logout
- **API Access**: Replaying API calls to exceed rate limits or manipulate data

## What is a Nonce?

A nonce (Number used once) is a unique value that can only be used once within a specified context. It serves as a one-time password for a single transaction or session.

### Key Characteristics

1. **Uniqueness**: Each nonce must be unique within its scope
2. **Unpredictability**: Should be cryptographically random
3. **Time-bound**: Often includes expiration for added security
4. **Single-use**: Once consumed, cannot be reused
5. **Verifiable**: Server can validate authenticity

### How Nonces Prevent Replay Attacks

```
Normal Flow:
1. Client generates unique nonce: "abc123"
2. Client sends request with nonce
3. Server validates and consumes nonce
4. Server processes request
5. Response sent to client

Replay Attack (Blocked):
1. Attacker captures request with nonce: "abc123"
2. Attacker replays request
3. Server checks nonce "abc123" - already used!
4. Server rejects request
5. Attack prevented
```

## Implementation in This Project

This project implements two complementary nonce strategies:

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Application                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ Request with Headers:
                  │ - Authorization: Bearer <JWT with jti>
                  │ - X-Nonce: <unique-request-id>
                  │ - X-Timestamp: <current-time>
                  │ - X-Signature: <HMAC-signature> (optional)
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                             │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            JWT Nonce Validation (Option 1)          │   │
│  │                                                     │   │
│  │  - Extract jti from JWT                            │   │
│  │  - Check if jti exists in Nonce table              │   │
│  │  - Verify not revoked                              │   │
│  │  - Check token age                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          Request Nonce Validation (Option 2)        │   │
│  │                                                     │   │
│  │  - Check if endpoint requires nonce                │   │
│  │  - Validate timestamp freshness                    │   │
│  │  - Verify nonce not already used                   │   │
│  │  - Validate signature if required                  │   │
│  │  - Consume nonce                                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Protected Resources                       │
└─────────────────────────────────────────────────────────────┘
```

## JWT Nonce (Option 1)

### Overview
Every JWT token issued by the system includes a unique JWT ID (jti) that is tracked in the database. This prevents token reuse after logout or revocation.

### Implementation Details

#### Database Schema
```prisma
model Nonce {
  id         String   @id @default(uuid())
  nonce      String   @unique
  type       String   // 'jwt' for JWT nonces
  user_id    String?
  token_jti  String?  // JWT ID
  used_at    DateTime @default(now())
  expires_at DateTime
}
```

#### Token Generation
```typescript
// In AuthService
async generateTokens(userId: string, email: string) {
  // Generate unique JWT ID
  const jti = await this.nonceService.generateJwtNonce(userId);
  
  const payload = {
    sub: userId,
    email,
    jti,  // Unique identifier for this token
    iat: Math.floor(Date.now() / 1000),
  };
  
  return {
    accessToken: this.jwtService.sign(payload),
    refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
  };
}
```

#### Token Validation
```typescript
// In JwtNonceStrategy
async validate(request: any, payload: any) {
  // Validate JWT nonce
  if (!payload.jti) {
    throw new UnauthorizedException('Invalid token: missing JWT ID');
  }
  
  const nonceValidation = await this.nonceService.validateJwtNonce(
    payload.jti,
    payload.sub,
  );
  
  if (!nonceValidation.valid) {
    throw new UnauthorizedException(`Invalid token: ${nonceValidation.reason}`);
  }
  
  return { userId: payload.sub, email: payload.email };
}
```

#### Token Revocation
```typescript
// On logout
async logout(userId: string, jti: string) {
  await this.nonceService.revokeJwtNonce(jti, userId);
  return { message: 'Logged out successfully' };
}
```

### Benefits
- Immediate token invalidation on logout
- Protection against token theft
- Granular token management
- No need for blocklists

## Request Nonce (Option 2)

### Overview
Individual API requests can require a unique nonce header, preventing any request from being replayed, even with a valid token.

### Implementation Details

#### Configuration per Entity
Entities can be configured with nonce requirements through the admin UI:

```typescript
interface NonceConfig {
  enabled: boolean;              // Enable/disable nonce
  ttl: number;                   // Time-to-live in milliseconds
  methods: string[];             // HTTP methods requiring nonce
  require_signature: boolean;    // Require HMAC signature
}
```

#### Request Headers
```http
POST /api/v1/entities/123/records
Authorization: Bearer <token>
X-Nonce: 550e8400-e29b-41d4-a716-446655440000
X-Timestamp: 1699564800000
X-Signature: sha256=abcd1234... (optional)
```

#### Nonce Guard
```typescript
@Injectable()
export class NonceGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Check if nonce is required for this endpoint
    if (!this.isNonceRequired(request)) {
      return true;
    }
    
    // Extract headers
    const nonce = request.headers['x-nonce'];
    const timestamp = request.headers['x-timestamp'];
    
    // Validate timestamp freshness
    if (Date.now() - timestamp > this.maxAge) {
      throw new UnauthorizedException('Request expired');
    }
    
    // Validate and consume nonce
    const validation = await this.nonceService.validateRequestNonce(
      nonce,
      request.url,
      request.method,
      request.user?.userId
    );
    
    if (!validation.valid) {
      throw new UnauthorizedException(`Nonce validation failed: ${validation.reason}`);
    }
    
    return true;
  }
}
```

#### Signature Validation (Optional)
For high-security operations, HMAC signatures can be required:

```typescript
// Client-side signature generation
const signature = crypto
  .createHmac('sha256', secretKey)
  .update(`${method}:${url}:${nonce}:${timestamp}:${JSON.stringify(body)}`)
  .digest('hex');

// Server-side validation
verifySignature(signature, method, url, nonce, timestamp, body) {
  const expected = this.generateSignature(method, url, nonce, timestamp, body);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### Benefits
- Per-request protection
- Configurable per entity/endpoint
- Optional signature for integrity
- Time-window validation

## Configuration Guide

### Admin UI Configuration

1. **Navigate to Entity Builder**
   - Go to `/entities` in the admin dashboard
   - Select or create an entity

2. **Enable Nonce Protection**
   ```
   ☑ Enable Nonce Protection
   
   TTL: [5 minutes ▼]
   
   Protected Methods:
   ☐ GET
   ☑ POST
   ☑ PUT
   ☐ PATCH
   ☑ DELETE
   
   ☑ Require Signature
   ```

3. **Configuration Options**
   - **TTL**: How long a nonce remains valid (5 min - 1 hour)
   - **Methods**: Which HTTP methods require nonce
   - **Signature**: Whether to require HMAC signature

### Environment Variables

```bash
# JWT Nonce Configuration
JWT_MAX_AGE=900              # Maximum JWT age in seconds (15 minutes)
JWT_NONCE_CLEANUP_INTERVAL=3600000  # Cleanup interval (1 hour)

# Request Nonce Configuration
NONCE_DEFAULT_TTL=300000     # Default TTL (5 minutes)
NONCE_SIGNATURE_SECRET=your-secret-key  # For HMAC signatures
```

### Database Configuration

Run migrations to create nonce tables:
```bash
npx prisma migrate dev --name add-nonce-tables
```

## Client Implementation

### JavaScript/TypeScript Example

```typescript
class ApiClient {
  private async makeRequest(method: string, url: string, data?: any) {
    // Generate nonce and timestamp
    const nonce = crypto.randomUUID();
    const timestamp = Date.now();
    
    // Prepare headers
    const headers: any = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
      'X-Nonce': nonce,
      'X-Timestamp': timestamp.toString(),
    };
    
    // Add signature if required
    if (this.requiresSignature(url)) {
      headers['X-Signature'] = this.generateSignature(
        method,
        url,
        nonce,
        timestamp,
        data
      );
    }
    
    return fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  private generateSignature(
    method: string,
    url: string,
    nonce: string,
    timestamp: number,
    body: any
  ): string {
    const message = `${method}:${url}:${nonce}:${timestamp}:${JSON.stringify(body || {})}`;
    return CryptoJS.HmacSHA256(message, this.signatureKey).toString();
  }
}
```

### Python Example

```python
import uuid
import time
import hmac
import hashlib
import requests

class ApiClient:
    def make_request(self, method, url, data=None):
        # Generate nonce and timestamp
        nonce = str(uuid.uuid4())
        timestamp = int(time.time() * 1000)
        
        # Prepare headers
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.token}',
            'X-Nonce': nonce,
            'X-Timestamp': str(timestamp),
        }
        
        # Add signature if required
        if self.requires_signature(url):
            headers['X-Signature'] = self.generate_signature(
                method, url, nonce, timestamp, data
            )
        
        return requests.request(
            method=method,
            url=url,
            headers=headers,
            json=data
        )
    
    def generate_signature(self, method, url, nonce, timestamp, body):
        message = f"{method}:{url}:{nonce}:{timestamp}:{json.dumps(body or {})}"
        return hmac.new(
            self.signature_key.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
```

## Testing

### Manual Testing

Use the provided test script:
```bash
chmod +x test-nonce.sh
./test-nonce.sh
```

### Test Scenarios

1. **JWT Nonce Tests**
   - ✓ Token includes jti claim
   - ✓ Token revoked on logout
   - ✓ Revoked token rejected
   - ✓ Token age validation

2. **Request Nonce Tests**
   - ✓ Valid nonce accepted
   - ✓ Duplicate nonce rejected
   - ✓ Expired timestamp rejected
   - ✓ Missing nonce rejected (when required)
   - ✓ Invalid signature rejected

### Automated Testing

```typescript
describe('Nonce Protection', () => {
  it('should reject duplicate nonces', async () => {
    const nonce = uuid();
    
    // First request should succeed
    const response1 = await makeRequest({ nonce });
    expect(response1.status).toBe(200);
    
    // Second request with same nonce should fail
    const response2 = await makeRequest({ nonce });
    expect(response2.status).toBe(401);
    expect(response2.body.message).toContain('already used');
  });
  
  it('should reject expired timestamps', async () => {
    const oldTimestamp = Date.now() - 3600000; // 1 hour ago
    
    const response = await makeRequest({
      nonce: uuid(),
      timestamp: oldTimestamp,
    });
    
    expect(response.status).toBe(401);
    expect(response.body.message).toContain('expired');
  });
});
```

## Best Practices

### Security Considerations

1. **Use Cryptographically Secure Random Generators**
   ```typescript
   // Good
   const nonce = crypto.randomUUID();
   
   // Bad
   const nonce = Math.random().toString();
   ```

2. **Implement Time Windows**
   - Keep TTL short (5-15 minutes)
   - Reject requests with future timestamps
   - Use synchronized clocks (NTP)

3. **Store Nonces Securely**
   - Use indexed database columns
   - Implement automatic cleanup
   - Consider Redis for high-volume

4. **Rate Limiting**
   - Combine with rate limiting
   - Prevent nonce flooding attacks
   - Monitor nonce generation patterns

### Performance Optimization

1. **Database Indexing**
   ```sql
   CREATE INDEX idx_nonce_value ON nonces(nonce);
   CREATE INDEX idx_nonce_expiry ON nonces(expires_at);
   ```

2. **Caching Strategy**
   ```typescript
   // Use Redis for recent nonces
   await redis.setex(`nonce:${nonce}`, ttl, 'used');
   ```

3. **Batch Cleanup**
   ```typescript
   @Cron('0 */15 * * * *') // Every 15 minutes
   async cleanupExpiredNonces() {
     await this.prisma.nonce.deleteMany({
       where: { expires_at: { lt: new Date() } }
     });
   }
   ```

### Error Handling

1. **Clear Error Messages**
   ```typescript
   if (!nonce) {
     throw new BadRequestException('Missing X-Nonce header');
   }
   
   if (nonceAlreadyUsed) {
     throw new UnauthorizedException('Nonce already used');
   }
   
   if (timestampExpired) {
     throw new UnauthorizedException('Request timestamp expired');
   }
   ```

2. **Logging and Monitoring**
   ```typescript
   logger.warn('Replay attack attempted', {
     userId,
     nonce,
     endpoint,
     ip: request.ip,
   });
   ```

## Comparison with Idempotency

### Idempotency vs Nonce

| Feature | Idempotency | Nonce |
|---------|------------|-------|
| **Purpose** | Prevent duplicate processing | Prevent replay attacks |
| **Scope** | Business logic | Security |
| **Response** | Returns cached result | Rejects request entirely |
| **Use Case** | Safe retries | Attack prevention |
| **Storage** | Stores response | Stores only usage flag |
| **TTL** | Longer (hours/days) | Shorter (minutes) |

### When to Use Each

**Use Idempotency for:**
- Payment processing
- Order creation
- Resource creation
- Network retry safety

**Use Nonce for:**
- High-security operations
- Token management
- Preventing replay attacks
- Session security

### Combined Usage

Both can be used together for maximum protection:

```http
POST /api/v1/payments
Idempotency-Key: payment-12345  # For safe retries
X-Nonce: abc-def-ghi             # For replay protection
```

## Troubleshooting

### Common Issues

1. **"Nonce already used" errors**
   - Ensure client generates unique nonces
   - Check for retry logic reusing nonces
   - Verify nonce generation is truly random

2. **"Request expired" errors**
   - Synchronize client/server clocks
   - Adjust TTL if network is slow
   - Check timezone handling

3. **Performance degradation**
   - Implement database indexing
   - Use caching layer (Redis)
   - Schedule regular cleanup

4. **Token still valid after logout**
   - Verify JwtNonceStrategy is registered
   - Check nonce service is initialized
   - Ensure logout calls revokeJwtNonce

## Additional Resources

- [OWASP: Session Management](https://owasp.org/www-project-cheat-sheets/cheatsheets/Session_Management_Cheat_Sheet)
- [RFC 7617: HTTP Digest Access Authentication](https://tools.ietf.org/html/rfc7617)
- [NIST: Authentication and Lifecycle Management](https://pages.nist.gov/800-63-3/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

## Summary

The nonce implementation in this project provides robust protection against replay attacks through:

1. **JWT-level protection** preventing token reuse after logout
2. **Request-level protection** preventing any request replay
3. **Configurable security** allowing per-entity customization
4. **Optional signatures** for high-security operations
5. **Comprehensive validation** including time windows and uniqueness

This dual-layer approach ensures maximum security while maintaining flexibility for different use cases and performance requirements.