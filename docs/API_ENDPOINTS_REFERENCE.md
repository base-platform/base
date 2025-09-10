# API Endpoints Reference

## Complete API Endpoint Documentation

This document provides a comprehensive reference for all API endpoints in the Runtime API Platform.

---

## Table of Contents

1. [Authentication & Security](#authentication--security)
2. [Public Endpoints](#public-endpoints)
3. [Authentication Endpoints](#authentication-endpoints)
4. [Administrative Endpoints](#administrative-endpoints)
5. [Entity Management](#entity-management)
6. [Dynamic API Endpoints](#dynamic-api-endpoints)
7. [Nonce Protection](#nonce-protection)
8. [Rate Limiting](#rate-limiting)

---

## Authentication & Security

### Authentication Methods

The API supports multiple authentication methods:

1. **JWT Bearer Tokens** - Primary authentication method
2. **API Keys** - For programmatic access
3. **OAuth 2.0** - Social login integration
4. **Session-based** - With device fingerprinting

### Security Headers Required

```http
Authorization: Bearer <token>
Content-Type: application/json
X-Request-ID: <unique-request-id>  # For idempotency
X-Nonce: <unique-nonce>            # For replay protection (when required)
X-Timestamp: <unix-timestamp-ms>   # For nonce validation
X-Signature: <hmac-signature>      # For signature validation (when required)
```

---

## Public Endpoints

No authentication required:

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| GET | `/api/v1` | API information and version | `{ name, version, description }` |
| GET | `/api/v1/health` | Basic health check | `{ status: "ok", timestamp }` |
| GET | `/api/v1/health/database` | Database connectivity check | `{ database: "connected", latency }` |
| GET | `/api/v1/dashboard` | Public dashboard metrics | `{ metrics, stats }` |

---

## Authentication Endpoints

Base path: `/api/v1/auth`

### Core Authentication

| Method | Endpoint | Description | Request Body | Guards |
|--------|----------|-------------|--------------|--------|
| POST | `/register` | Register new user | `{ email, password, name }` | Idempotent(24h) |
| POST | `/login` | Login with credentials | `{ email, password }` | - |
| POST | `/login/mfa` | Complete MFA login | `{ tempToken, mfaToken }` | - |
| POST | `/refresh` | Refresh access token | `{ refreshToken }` | Idempotent(1m) |
| POST | `/logout` | Logout and revoke tokens | - | JwtNonceAuthGuard |

### Multi-Factor Authentication (MFA)

Base path: `/api/v1/auth/mfa`

| Method | Endpoint | Description | Request Body | Guards |
|--------|----------|-------------|--------------|--------|
| GET | `/setup` | Get MFA setup QR code | - | JwtAuthGuard |
| POST | `/enable` | Enable MFA | `{ token, secret }` | JwtAuthGuard |
| POST | `/verify` | Verify MFA token | `{ token }` | JwtAuthGuard |
| DELETE | `/disable` | Disable MFA | `{ password }` | JwtAuthGuard |
| POST | `/backup-codes` | Generate backup codes | - | JwtAuthGuard |
| GET | `/status` | Check MFA status | - | JwtAuthGuard |

### OAuth Integration

Base path: `/api/v1/auth/oauth`

| Method | Endpoint | Description | Request Body | Guards |
|--------|----------|-------------|--------------|--------|
| GET | `/authorize/:provider` | Start OAuth flow | - | - |
| GET | `/callback` | OAuth callback handler | Query params | - |
| POST | `/link` | Link OAuth account | `{ provider, code }` | JwtAuthGuard |
| DELETE | `/:provider/unlink` | Unlink OAuth account | - | JwtAuthGuard |
| GET | `/accounts` | List linked accounts | - | JwtAuthGuard |

### Session Management

Base path: `/api/v1/auth/sessions`

| Method | Endpoint | Description | Request Body | Guards |
|--------|----------|-------------|--------------|--------|
| GET | `/` | List active sessions | - | JwtAuthGuard |
| POST | `/` | Create new session | `{ deviceInfo }` | JwtAuthGuard |
| DELETE | `/:sessionId` | End specific session | - | JwtAuthGuard |
| DELETE | `/` | End all sessions | - | JwtAuthGuard |
| GET | `/current` | Current session info | - | JwtAuthGuard |
| GET | `/trusted-devices` | List trusted devices | - | JwtAuthGuard |
| POST | `/trust-device` | Trust current device | `{ fingerprint }` | JwtAuthGuard |
| DELETE | `/trusted-devices/:fingerprint` | Remove trusted device | - | JwtAuthGuard |
| GET | `/stats` | Session statistics | - | JwtAuthGuard |

### API Key Management

Base path: `/api/v1/auth/api-keys`

| Method | Endpoint | Description | Request Body | Guards |
|--------|----------|-------------|--------------|--------|
| POST | `/` | Create API key | `{ name, permissions, expiresAt }` | JwtAuthGuard, Idempotent(24h) |
| POST | `/:id/rotate` | Rotate API key | - | JwtAuthGuard |
| POST | `/rotate-bulk` | Rotate multiple keys | `{ keyIds }` | JwtAuthGuard |
| POST | `/:id/expire` | Set expiration | `{ expiresAt }` | JwtAuthGuard |
| POST | `/:id/revoke` | Revoke API key | - | JwtAuthGuard |
| GET | `/usage-stats` | Usage statistics | - | JwtAuthGuard |
| GET | `/rotation-needed` | Keys needing rotation | - | JwtAuthGuard |
| GET | `/rotation-history` | Rotation history | - | JwtAuthGuard |

### User Rate Limits

Base path: `/api/v1/auth/rate-limits`

| Method | Endpoint | Description | Request Body | Guards |
|--------|----------|-------------|--------------|--------|
| POST | `/` | Create user rate limit | `{ endpoint, limit, window }` | JwtAuthGuard |
| GET | `/` | List user rate limits | - | JwtAuthGuard |
| PUT | `/:id` | Update rate limit | `{ limit, window }` | JwtAuthGuard |
| DELETE | `/:id` | Delete rate limit | - | JwtAuthGuard |
| GET | `/stats` | Rate limit statistics | - | JwtAuthGuard |
| GET | `/status/:endpoint` | Check endpoint status | - | JwtAuthGuard |
| POST | `/clear` | Clear rate limit cache | - | JwtAuthGuard |

---

## Administrative Endpoints

All require admin role authentication.

### User Management

Base path: `/api/v1/admin/users`

| Method | Endpoint | Description | Request Body | Guards |
|--------|----------|-------------|--------------|--------|
| GET | `/` | List all users | Query: `page, limit, search` | JwtAuthGuard, AdminGuard |
| GET | `/:id` | Get user details | - | JwtAuthGuard, AdminGuard |
| POST | `/` | Create new user | `{ email, password, role }` | JwtAuthGuard, AdminGuard |
| PUT | `/:id` | Update user | `{ email, name, role }` | JwtAuthGuard, AdminGuard |
| DELETE | `/:id` | Delete user | - | JwtAuthGuard, AdminGuard |
| POST | `/:id/activate` | Activate user | - | JwtAuthGuard, AdminGuard |
| POST | `/:id/deactivate` | Deactivate user | - | JwtAuthGuard, AdminGuard |
| GET | `/stats/overview` | User statistics | - | JwtAuthGuard, AdminGuard |

### Global Rate Limits

Base path: `/api/v1/admin/rate-limits`

| Method | Endpoint | Description | Request Body | Guards |
|--------|----------|-------------|--------------|--------|
| GET | `/` | List rate limit rules | - | JwtAuthGuard, AdminGuard |
| GET | `/:name` | Get specific rule | - | JwtAuthGuard, AdminGuard |
| POST | `/` | Create rate limit rule | `{ name, limit, window, endpoints }` | JwtAuthGuard, AdminGuard |
| PUT | `/:name` | Update rule | `{ limit, window }` | JwtAuthGuard, AdminGuard |
| DELETE | `/:name` | Delete rule | - | JwtAuthGuard, AdminGuard |
| POST | `/reload` | Reload all rules | - | JwtAuthGuard, AdminGuard |

### Security Settings

Base path: `/api/v1/admin/security-settings`

| Method | Endpoint | Description | Request Body | Guards |
|--------|----------|-------------|--------------|--------|
| GET | `/categories` | List setting categories | - | JwtAuthGuard, AdminGuard |
| GET | `/definitions` | Get setting definitions | - | JwtAuthGuard, AdminGuard |
| GET | `/all` | Get all settings | - | JwtAuthGuard, AdminGuard |
| GET | `/category/:category` | Get category settings | - | JwtAuthGuard, AdminGuard |
| GET | `/:key` | Get specific setting | - | JwtAuthGuard, AdminGuard |
| PUT | `/:key` | Update setting | `{ value }` | JwtAuthGuard, AdminGuard |
| PUT | `/` | Bulk update settings | `{ settings: [...] }` | JwtAuthGuard, AdminGuard |
| POST | `/:key/reset` | Reset to default | - | JwtAuthGuard, AdminGuard |
| GET | `/validation/test` | Test validation rules | - | JwtAuthGuard, AdminGuard |
| GET | `/export/json` | Export settings | - | JwtAuthGuard, AdminGuard |
| POST | `/import/json` | Import settings | `{ settings }` | JwtAuthGuard, AdminGuard |

---

## Entity Management

Base path: `/api/v1/entities`

### Entity Definition

| Method | Endpoint | Description | Request Body | Guards |
|--------|----------|-------------|--------------|--------|
| GET | `/` | List all entities | Query: `isActive` | JwtAuthGuard |
| POST | `/` | Create new entity | `{ name, schema, config }` | JwtAuthGuard |
| GET | `/:id` | Get entity details | - | JwtAuthGuard |
| PUT | `/:id` | Update entity | `{ name, schema, config }` | JwtAuthGuard |
| DELETE | `/:id` | Delete entity | - | JwtAuthGuard |

### Entity Records

| Method | Endpoint | Description | Request Body | Guards | Nonce |
|--------|----------|-------------|--------------|--------|-------|
| GET | `/:entityId/records` | List records | Query: `page, limit` | JwtAuthGuard | No |
| POST | `/:entityId/records` | Create record | `{ data }` | JwtAuthGuard, NonceGuard | Yes* |
| GET | `/records/:id` | Get record | - | JwtAuthGuard | No |
| PUT | `/records/:id` | Update record | `{ data }` | JwtAuthGuard, NonceGuard | Yes* |
| DELETE | `/records/:id` | Delete record | - | JwtAuthGuard, NonceGuard | Yes* |

\* Nonce required if entity has nonce protection enabled

---

## Dynamic API Endpoints

For each entity created, these endpoints are automatically generated:

Base path: `/api/v1/:entityName`

| Method | Endpoint | Description | Request Body | Guards |
|--------|----------|-------------|--------------|--------|
| GET | `/` | List records | Query: filters, pagination | JwtAuthGuard |
| POST | `/` | Create record | `{ ...entitySchema }` | JwtAuthGuard, Idempotent* |
| GET | `/:id` | Get record | - | JwtAuthGuard |
| PUT | `/:id` | Update record | `{ ...entitySchema }` | JwtAuthGuard, Idempotent* |
| DELETE | `/:id` | Delete record | - | JwtAuthGuard |
| POST | `/bulk` | Bulk operations | `{ operations: [...] }` | JwtAuthGuard |
| POST | `/validate` | Validate data | `{ ...entitySchema }` | JwtAuthGuard |
| GET | `/schema` | Get entity schema | - | JwtAuthGuard |
| GET | `/openapi` | Get OpenAPI spec | - | JwtAuthGuard |

\* Idempotency enabled if configured for entity

---

## Nonce Protection

### Request Nonce Headers

When nonce protection is enabled for an endpoint:

```http
X-Nonce: <unique-uuid>           # Required: Unique identifier
X-Timestamp: <unix-timestamp-ms> # Required: Current timestamp in milliseconds
X-Signature: <hmac-sha256>       # Optional: HMAC signature if configured
```

### Nonce-Protected Endpoints

The following endpoints support or require nonce protection:

1. **Entity Records** (when entity has nonce enabled):
   - POST `/api/v1/entities/:entityId/records`
   - PUT `/api/v1/entities/records/:id`
   - DELETE `/api/v1/entities/records/:id`

2. **Authentication** (with JwtNonceAuthGuard):
   - POST `/api/v1/auth/logout`

### Nonce Configuration

Entities can be configured with nonce protection:

```json
{
  "nonceConfig": {
    "enabled": true,
    "ttl": 300000,           // 5 minutes
    "methods": ["POST", "PUT", "DELETE"],
    "requireSignature": false
  }
}
```

---

## Rate Limiting

### Default Limits

| Endpoint Pattern | Limit | Window | Notes |
|-----------------|-------|--------|-------|
| `/api/v1/auth/login` | 5 | 15 min | Prevent brute force |
| `/api/v1/auth/register` | 3 | 1 hour | Prevent spam |
| `/api/v1/auth/refresh` | 10 | 1 min | Token rotation |
| `/api/v1/entities/*` | 100 | 1 min | General CRUD |
| `/api/v1/admin/*` | 50 | 1 min | Admin operations |
| Default | 100 | 1 min | All other endpoints |

### Rate Limit Headers

Response headers include:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699564800000
```

### Custom Rate Limits

Can be configured per:
- User
- API Key
- IP Address
- Endpoint

---

## File Upload Endpoints

Base path: `/api/v1/files`

| Method | Endpoint | Description | Request Body | Guards |
|--------|----------|-------------|--------------|--------|
| POST | `/avatar` | Upload avatar | `multipart/form-data` | JwtAuthGuard |
| POST | `/documents` | Upload documents | `multipart/form-data` | JwtAuthGuard |
| POST | `/multiple` | Multiple files | `multipart/form-data` | JwtAuthGuard |
| GET | `/upload-policy/:context` | Get upload policy | - | JwtAuthGuard |
| POST | `/validate` | Validate file | `{ file metadata }` | JwtAuthGuard |

### File Upload Limits

| Type | Max Size | Allowed Types |
|------|----------|---------------|
| Avatar | 5 MB | image/jpeg, image/png, image/gif |
| Document | 10 MB | application/pdf, application/msword, text/* |
| General | 25 MB | Configurable |

---

## Error Response Format

All errors follow RFC 7807 Problem Details:

```json
{
  "type": "https://api.example.com/errors/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "The email field is required",
  "instance": "/api/v1/auth/register",
  "timestamp": "2025-01-10T12:00:00Z",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### Common Error Codes

| Status | Type | Description |
|--------|------|-------------|
| 400 | validation-error | Invalid request data |
| 401 | authentication-error | Invalid or missing credentials |
| 403 | authorization-error | Insufficient permissions |
| 404 | not-found | Resource not found |
| 409 | conflict | Resource conflict (duplicate) |
| 429 | rate-limit-exceeded | Too many requests |
| 500 | internal-error | Server error |

---

## Query Parameters

### Pagination

All list endpoints support:

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | number | 1 | - | Page number |
| `limit` | number | 10 | 100 | Items per page |
| `offset` | number | 0 | - | Skip items |

### Sorting

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `sort` | string | `created_at` | Field to sort by |
| `order` | string | `asc`, `desc` | Sort direction |

### Filtering

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `search` | string | `john` | Search term |
| `filters` | JSON | `{"status":"active"}` | Field filters |
| `dateFrom` | ISO 8601 | `2025-01-01` | Start date |
| `dateTo` | ISO 8601 | `2025-12-31` | End date |

### Example

```http
GET /api/v1/entities?page=2&limit=20&sort=created_at&order=desc&search=user&filters={"is_active":true}
```

---

## WebSocket Events

The API supports real-time updates via WebSocket:

### Connection

```javascript
const socket = io('ws://localhost:3001', {
  auth: {
    token: 'Bearer <jwt-token>'
  }
});
```

### Events

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `connect` | Client → Server | Establish connection | - |
| `authenticate` | Client → Server | Authenticate socket | `{ token }` |
| `entity:created` | Server → Client | Entity created | `{ entity }` |
| `entity:updated` | Server → Client | Entity updated | `{ entity }` |
| `entity:deleted` | Server → Client | Entity deleted | `{ id }` |
| `record:created` | Server → Client | Record created | `{ record }` |
| `record:updated` | Server → Client | Record updated | `{ record }` |
| `record:deleted` | Server → Client | Record deleted | `{ id }` |
| `error` | Server → Client | Error occurred | `{ message, code }` |

---

## Testing Endpoints

Available in development environment only:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/test/reset-db` | Reset database |
| POST | `/api/v1/test/seed` | Seed test data |
| GET | `/api/v1/test/token` | Get test JWT token |
| POST | `/api/v1/test/clear-cache` | Clear all caches |

---

## Swagger Documentation

Interactive API documentation available at:

- Development: `http://localhost:3001/api/docs`
- Production: `https://api.example.com/api/docs`

OpenAPI specification:
- JSON: `/api/docs-json`
- YAML: `/api/docs-yaml`

---

## SDK Support

Official SDKs available for:

- **JavaScript/TypeScript**: `@base/api-client`
- **Python**: `base-api-client`
- **Go**: `github.com/base/api-client-go`
- **Ruby**: `base-api-client`

### Example Usage (TypeScript)

```typescript
import { BaseAPIClient } from '@base/api-client';

const client = new BaseAPIClient({
  baseURL: 'http://localhost:3001',
  apiKey: 'your-api-key'
});

// With nonce protection
const response = await client.entities.create({
  name: 'products',
  schema: { ... }
}, {
  nonce: true,  // Auto-generate nonce headers
  signature: true  // Include HMAC signature
});
```

---

## Performance Considerations

### Response Times

| Endpoint Type | Target | Max |
|--------------|--------|-----|
| Health checks | < 50ms | 100ms |
| Auth operations | < 200ms | 500ms |
| CRUD operations | < 100ms | 300ms |
| Complex queries | < 500ms | 2000ms |
| File uploads | Depends on size | 30s |

### Caching

The following data is cached:

| Data | TTL | Cache Type |
|------|-----|------------|
| User sessions | 15 min | Redis/Valkey |
| Entity schemas | 1 hour | Redis/Valkey |
| Rate limit counters | Dynamic | Redis/Valkey |
| API responses | Configurable | CDN/Redis |

---

## Monitoring & Metrics

### Available Metrics

- Request rate (req/sec)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Active connections
- Database pool usage
- Cache hit ratio
- Rate limit violations

### Health Check Endpoints

| Endpoint | Description | Response |
|----------|-------------|----------|
| `/health` | Basic health | `{ status: "ok" }` |
| `/health/detailed` | Detailed health | All subsystems |
| `/metrics` | Prometheus metrics | Prometheus format |

---

## Compliance & Audit

### Audit Log Events

All sensitive operations are logged:

- Authentication attempts
- Permission changes
- Data modifications
- Admin actions
- Security events

### GDPR Compliance

| Endpoint | Description |
|----------|-------------|
| GET `/api/v1/users/me/data` | Export user data |
| DELETE `/api/v1/users/me` | Delete account (right to be forgotten) |
| GET `/api/v1/privacy/consent` | Get consent status |
| POST `/api/v1/privacy/consent` | Update consent |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01 | Initial release |
| 1.1.0 | 2025-01 | Added nonce protection |
| 1.2.0 | 2025-01 | Enhanced rate limiting |

---

## Support

- Documentation: `/docs`
- API Status: `https://status.example.com`
- Support Email: `api-support@example.com`
- GitHub Issues: `https://github.com/base/api/issues`