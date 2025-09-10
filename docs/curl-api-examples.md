# Comprehensive curl API Examples

This guide provides comprehensive curl examples for interacting with the Runtime API Platform. The API provides multi-factor authentication, OAuth integration, dynamic entity management, rate limiting, and administrative features.

## Table of Contents

- [Base Configuration](#base-configuration)
- [Authentication](#authentication)
- [Multi-Factor Authentication (MFA)](#multi-factor-authentication-mfa)
- [OAuth Integration](#oauth-integration)
- [Session Management](#session-management)
- [Entity Management](#entity-management)
- [Admin Operations](#admin-operations)
- [Rate Limiting](#rate-limiting)
- [Nonce and Idempotency](#nonce-and-idempotency)
- [File Upload](#file-upload)
- [Error Handling](#error-handling)
- [Troubleshooting](#troubleshooting)

## Base Configuration

```bash
# Base URL configuration
export API_BASE_URL="http://localhost:3001/api/v1"
export CONTENT_TYPE="Content-Type: application/json"

# Authentication tokens (set after login)
export ACCESS_TOKEN=""
export REFRESH_TOKEN=""
export API_KEY=""
```

## Authentication

### Health Check (No Authentication Required)

```bash
# Check API health
curl -X GET "${API_BASE_URL}/" \
  -H "${CONTENT_TYPE}"

# Detailed health check
curl -X GET "${API_BASE_URL}/health" \
  -H "${CONTENT_TYPE}"

# Database health check
curl -X GET "${API_BASE_URL}/health/database" \
  -H "${CONTENT_TYPE}"
```

### User Registration

```bash
# Register a new user
curl -X POST "${API_BASE_URL}/auth/register" \
  -H "${CONTENT_TYPE}" \
  -H "X-Idempotency-Key: $(uuidgen)" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "name": "John Doe"
  }'
```

### User Login

```bash
# Login with email and password
curl -X POST "${API_BASE_URL}/auth/login" \
  -H "${CONTENT_TYPE}" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'

# Save the tokens from response
# export ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
# export REFRESH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Token Refresh

```bash
# Refresh access token using refresh token
curl -X POST "${API_BASE_URL}/auth/refresh" \
  -H "${CONTENT_TYPE}" \
  -H "X-Idempotency-Key: $(uuidgen)" \
  -d '{
    "refreshToken": "'"${REFRESH_TOKEN}"'"
  }'
```

### Logout

```bash
# Logout and invalidate tokens
curl -X POST "${API_BASE_URL}/auth/logout" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "X-Nonce: $(date +%s%N)"
```

## Multi-Factor Authentication (MFA)

### Setup MFA

```bash
# Get MFA setup information (QR code, secret, backup codes)
curl -X GET "${API_BASE_URL}/auth/mfa/setup" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### Enable MFA

```bash
# Enable MFA after setup with TOTP token
curl -X POST "${API_BASE_URL}/auth/mfa/enable" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{
    "token": "123456"
  }'
```

### Verify MFA Token

```bash
# Verify MFA token
curl -X POST "${API_BASE_URL}/auth/mfa/verify" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{
    "token": "123456"
  }'
```

### Login with MFA

```bash
# Step 1: Regular login (returns temp token if MFA required)
TEMP_TOKEN=$(curl -X POST "${API_BASE_URL}/auth/login" \
  -H "${CONTENT_TYPE}" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }' | jq -r '.tempToken')

# Step 2: Complete login with MFA token
curl -X POST "${API_BASE_URL}/auth/login/mfa" \
  -H "${CONTENT_TYPE}" \
  -d '{
    "tempToken": "'"${TEMP_TOKEN}"'",
    "mfaToken": "123456"
  }'
```

### Generate New Backup Codes

```bash
# Generate new backup codes
curl -X POST "${API_BASE_URL}/auth/mfa/backup-codes" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{
    "token": "123456"
  }'
```

### Disable MFA

```bash
# Disable MFA
curl -X DELETE "${API_BASE_URL}/auth/mfa/disable" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{
    "token": "123456"
  }'
```

### Get MFA Status

```bash
# Get current MFA status
curl -X GET "${API_BASE_URL}/auth/mfa/status" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

## OAuth Integration

### Initiate OAuth Authorization

```bash
# Get OAuth authorization URL for Google
curl -X GET "${API_BASE_URL}/auth/oauth/authorize/google?redirectUrl=http://localhost:3000/auth/callback" \
  -H "${CONTENT_TYPE}"

# Get OAuth authorization URL for GitHub
curl -X GET "${API_BASE_URL}/auth/oauth/authorize/github?redirectUrl=http://localhost:3000/auth/callback" \
  -H "${CONTENT_TYPE}"
```

### Handle OAuth Callback

```bash
# Handle OAuth callback (typically called by OAuth provider)
curl -X GET "${API_BASE_URL}/auth/oauth/callback?code=OAUTH_CODE&state=STATE&provider=google" \
  -H "${CONTENT_TYPE}"
```

### Link OAuth Account

```bash
# Link OAuth account to current user
curl -X POST "${API_BASE_URL}/auth/oauth/link" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{
    "provider": "google",
    "code": "OAUTH_CODE"
  }'
```

### Get Linked OAuth Accounts

```bash
# Get all linked OAuth accounts
curl -X GET "${API_BASE_URL}/auth/oauth/accounts" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### Unlink OAuth Account

```bash
# Unlink OAuth account
curl -X DELETE "${API_BASE_URL}/auth/oauth/google/unlink" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

## Session Management

### Get Active Sessions

```bash
# Get all active sessions for current user
curl -X GET "${API_BASE_URL}/auth/sessions" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### Create Session with Device Fingerprinting

```bash
# Create new session with device information
curl -X POST "${API_BASE_URL}/auth/sessions" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" \
  -d '{
    "acceptLanguage": "en-US,en;q=0.9",
    "acceptEncoding": "gzip, deflate, br",
    "timezone": "America/New_York",
    "screenResolution": "1920x1080",
    "colorDepth": 24,
    "platform": "MacIntel"
  }'
```

### Get Current Session

```bash
# Get current session information
curl -X GET "${API_BASE_URL}/auth/sessions/current" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### Terminate Specific Session

```bash
# Terminate a specific session
curl -X DELETE "${API_BASE_URL}/auth/sessions/SESSION_ID" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### Terminate All Sessions

```bash
# Terminate all sessions except current
curl -X DELETE "${API_BASE_URL}/auth/sessions" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### Get Session Statistics

```bash
# Get session statistics for last 30 days
curl -X GET "${API_BASE_URL}/auth/sessions/stats" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Get session statistics for specific period
curl -X GET "${API_BASE_URL}/auth/sessions/stats?days=7" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### Device Trust Management

```bash
# Get trusted devices
curl -X GET "${API_BASE_URL}/auth/sessions/trusted-devices" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Trust current device
curl -X POST "${API_BASE_URL}/auth/sessions/trust-device" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{
    "deviceFingerprint": "device_fingerprint_hash"
  }'

# Remove device trust
curl -X DELETE "${API_BASE_URL}/auth/sessions/trusted-devices/device_fingerprint_hash" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

## Entity Management

### Create Entity Definition

```bash
# Create a new entity with JSON Schema
curl -X POST "${API_BASE_URL}/entities" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{
    "name": "products",
    "description": "Product catalog entity",
    "schema": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "description": "Product name"
        },
        "price": {
          "type": "number",
          "minimum": 0,
          "description": "Product price"
        },
        "category": {
          "type": "string",
          "enum": ["electronics", "clothing", "books"],
          "description": "Product category"
        },
        "inStock": {
          "type": "boolean",
          "description": "Whether product is in stock"
        }
      },
      "required": ["name", "price", "category"]
    },
    "enableAudit": true,
    "enableVersioning": true
  }'
```

### Get All Entities

```bash
# Get all entities
curl -X GET "${API_BASE_URL}/entities" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Get only active entities
curl -X GET "${API_BASE_URL}/entities?isActive=true" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### Get Specific Entity

```bash
# Get entity by ID
curl -X GET "${API_BASE_URL}/entities/ENTITY_ID" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### Update Entity

```bash
# Update entity definition
curl -X PUT "${API_BASE_URL}/entities/ENTITY_ID" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{
    "description": "Updated product catalog entity",
    "schema": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "description": "Product name"
        },
        "price": {
          "type": "number",
          "minimum": 0,
          "description": "Product price"
        },
        "category": {
          "type": "string",
          "enum": ["electronics", "clothing", "books", "home"],
          "description": "Product category"
        },
        "inStock": {
          "type": "boolean",
          "description": "Whether product is in stock"
        },
        "description": {
          "type": "string",
          "description": "Product description"
        }
      },
      "required": ["name", "price", "category"]
    }
  }'
```

### Delete Entity

```bash
# Delete entity
curl -X DELETE "${API_BASE_URL}/entities/ENTITY_ID" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

## Entity Records Management

### Create Entity Record (with Nonce)

```bash
# Create a new product record (requires nonce for security)
curl -X POST "${API_BASE_URL}/entities/ENTITY_ID/records" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "X-Nonce: $(date +%s%N)" \
  -d '{
    "data": {
      "name": "MacBook Pro",
      "price": 1299.99,
      "category": "electronics",
      "inStock": true,
      "description": "Apple MacBook Pro 13-inch"
    }
  }'
```

### Get Entity Records

```bash
# Get all records for an entity
curl -X GET "${API_BASE_URL}/entities/ENTITY_ID/records" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Get records with pagination
curl -X GET "${API_BASE_URL}/entities/ENTITY_ID/records?page=1&limit=10" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Alternative pagination parameter
curl -X GET "${API_BASE_URL}/entities/ENTITY_ID/records?page=1&pageSize=20" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### Get Specific Entity Record

```bash
# Get record by ID
curl -X GET "${API_BASE_URL}/entities/records/RECORD_ID" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### Update Entity Record (with Nonce)

```bash
# Update entity record (requires nonce for security)
curl -X PUT "${API_BASE_URL}/entities/records/RECORD_ID" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "X-Nonce: $(date +%s%N)" \
  -d '{
    "data": {
      "name": "MacBook Pro M2",
      "price": 1399.99,
      "category": "electronics",
      "inStock": false,
      "description": "Apple MacBook Pro 13-inch with M2 chip"
    }
  }'
```

### Delete Entity Record (with Nonce)

```bash
# Delete entity record (requires nonce for security)
curl -X DELETE "${API_BASE_URL}/entities/records/RECORD_ID" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "X-Nonce: $(date +%s%N)"
```

## Admin Operations

### User Management

```bash
# Get all users with filtering
curl -X GET "${API_BASE_URL}/admin/users" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Get users with pagination and filters
curl -X GET "${API_BASE_URL}/admin/users?page=1&limit=20&role=user&is_active=true&search=john" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Get specific user
curl -X GET "${API_BASE_URL}/admin/users/USER_ID" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Create new user
curl -X POST "${API_BASE_URL}/admin/users" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePassword123!",
    "name": "Jane Smith",
    "role": "user"
  }'

# Update user
curl -X PUT "${API_BASE_URL}/admin/users/USER_ID" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{
    "name": "Jane Doe",
    "role": "admin",
    "is_active": true
  }'

# Delete user
curl -X DELETE "${API_BASE_URL}/admin/users/USER_ID" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Activate user
curl -X POST "${API_BASE_URL}/admin/users/USER_ID/activate" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Deactivate user
curl -X POST "${API_BASE_URL}/admin/users/USER_ID/deactivate" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Get user statistics
curl -X GET "${API_BASE_URL}/admin/users/stats/overview" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

## Rate Limiting

### Get Rate Limit Configurations

```bash
# Get all rate limit configurations
curl -X GET "${API_BASE_URL}/admin/rate-limits" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Get specific rate limit configuration
curl -X GET "${API_BASE_URL}/admin/rate-limits/api-general" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### Create Rate Limit Configuration

```bash
# Create new rate limit rule
curl -X POST "${API_BASE_URL}/admin/rate-limits" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{
    "name": "strict-api-limit",
    "description": "Strict rate limit for sensitive endpoints",
    "ttl": 60000,
    "limit": 10,
    "endpoints": ["/auth/login", "/auth/register"],
    "is_active": true,
    "priority": 90
  }'
```

### Update Rate Limit Configuration

```bash
# Update rate limit configuration
curl -X PUT "${API_BASE_URL}/admin/rate-limits/strict-api-limit" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{
    "description": "Updated strict rate limit",
    "limit": 15,
    "is_active": true
  }'
```

### Delete Rate Limit Configuration

```bash
# Delete rate limit configuration
curl -X DELETE "${API_BASE_URL}/admin/rate-limits/strict-api-limit" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### Reload Rate Limit Configurations

```bash
# Reload all rate limit configurations
curl -X POST "${API_BASE_URL}/admin/rate-limits/reload" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

## API Key Management

### Create API Key

```bash
# Create new API key with idempotency
curl -X POST "${API_BASE_URL}/auth/api-keys" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "X-Idempotency-Key: $(uuidgen)" \
  -d '{
    "name": "mobile-app-key",
    "description": "API key for mobile application",
    "expiresAt": "2024-12-31T23:59:59Z",
    "permissions": ["read:entities", "write:entities"]
  }'
```

### Use API Key for Authentication

```bash
# Use API key instead of JWT token
curl -X GET "${API_BASE_URL}/entities" \
  -H "${CONTENT_TYPE}" \
  -H "X-API-Key: YOUR_API_KEY_HERE"
```

### Revoke API Key

```bash
# Revoke API key
curl -X POST "${API_BASE_URL}/auth/api-keys/API_KEY_ID/revoke" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{
    "keyId": "API_KEY_ID"
  }'
```

## Nonce and Idempotency

### Understanding Nonce
Nonce (Number Used Once) prevents replay attacks on sensitive operations.

```bash
# Generate nonce (timestamp in nanoseconds)
NONCE=$(date +%s%N)

# Use nonce in sensitive operations
curl -X POST "${API_BASE_URL}/entities/ENTITY_ID/records" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "X-Nonce: ${NONCE}" \
  -d '{
    "data": {
      "name": "Secure Product",
      "price": 99.99,
      "category": "electronics"
    }
  }'
```

### Understanding Idempotency
Idempotent operations can be safely repeated without changing the result.

```bash
# Generate idempotency key
IDEMPOTENCY_KEY=$(uuidgen)

# Use idempotency key for safe retries
curl -X POST "${API_BASE_URL}/auth/register" \
  -H "${CONTENT_TYPE}" \
  -H "X-Idempotency-Key: ${IDEMPOTENCY_KEY}" \
  -d '{
    "email": "idempotent@example.com",
    "password": "SecurePassword123!",
    "name": "Idempotent User"
  }'

# Retry the same request (will not create duplicate)
curl -X POST "${API_BASE_URL}/auth/register" \
  -H "${CONTENT_TYPE}" \
  -H "X-Idempotency-Key: ${IDEMPOTENCY_KEY}" \
  -d '{
    "email": "idempotent@example.com",
    "password": "SecurePassword123!",
    "name": "Idempotent User"
  }'
```

### Operations Requiring Nonce

```bash
# Entity record operations (create, update, delete)
curl -X PUT "${API_BASE_URL}/entities/records/RECORD_ID" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "X-Nonce: $(date +%s%N)" \
  -d '{"data": {"updated": true}}'

curl -X DELETE "${API_BASE_URL}/entities/records/RECORD_ID" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "X-Nonce: $(date +%s%N)"

# Logout operation
curl -X POST "${API_BASE_URL}/auth/logout" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "X-Nonce: $(date +%s%N)"
```

### Operations Supporting Idempotency

```bash
# User registration (24-hour TTL)
curl -X POST "${API_BASE_URL}/auth/register" \
  -H "${CONTENT_TYPE}" \
  -H "X-Idempotency-Key: $(uuidgen)" \
  -d '{"email": "user@example.com", "password": "pass", "name": "User"}'

# Token refresh (1-minute TTL)
curl -X POST "${API_BASE_URL}/auth/refresh" \
  -H "${CONTENT_TYPE}" \
  -H "X-Idempotency-Key: $(uuidgen)" \
  -d '{"refreshToken": "'"${REFRESH_TOKEN}"'"}'

# API key creation (24-hour TTL)
curl -X POST "${API_BASE_URL}/auth/api-keys" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "X-Idempotency-Key: $(uuidgen)" \
  -d '{"name": "test-key", "description": "Test API key"}'
```

## File Upload

### Upload File

```bash
# Upload file with authentication
curl -X POST "${API_BASE_URL}/auth/upload" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -F "file=@/path/to/your/file.jpg" \
  -F "category=profile" \
  -F "description=Profile picture"
```

## Dashboard Data

### Get Dashboard Statistics

```bash
# Get dashboard overview (requires authentication)
curl -X GET "${API_BASE_URL}/dashboard" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

## Error Handling

### Common HTTP Status Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource already exists
- **422 Unprocessable Entity**: Validation errors
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

### Error Response Format

All errors follow RFC 7807 Problem Details format:

```json
{
  "type": "https://example.com/probs/validation-error",
  "title": "Validation Error",
  "status": 422,
  "detail": "The request body contains invalid data",
  "instance": "/api/v1/entities",
  "errors": [
    {
      "field": "name",
      "message": "Name is required"
    }
  ]
}
```

### Handling Rate Limits

```bash
# Check rate limit headers in response
curl -v -X GET "${API_BASE_URL}/entities" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Response headers include:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 95
# X-RateLimit-Reset: 1640995200
```

### Retry Logic Example

```bash
#!/bin/bash
# Retry logic with exponential backoff

API_CALL() {
  curl -s -w "%{http_code}" -X GET "${API_BASE_URL}/entities" \
    -H "${CONTENT_TYPE}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -o response.json
}

retry_count=0
max_retries=3
base_delay=1

while [ $retry_count -lt $max_retries ]; do
  response_code=$(API_CALL)
  
  if [ "$response_code" = "200" ]; then
    echo "Success!"
    cat response.json
    break
  elif [ "$response_code" = "429" ]; then
    retry_count=$((retry_count + 1))
    delay=$((base_delay * retry_count))
    echo "Rate limited. Retrying in ${delay} seconds..."
    sleep $delay
  else
    echo "Error: $response_code"
    cat response.json
    break
  fi
done
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Authentication Errors

```bash
# Test token validity
curl -X GET "${API_BASE_URL}/auth/sessions/current" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# If token expired, refresh it
curl -X POST "${API_BASE_URL}/auth/refresh" \
  -H "${CONTENT_TYPE}" \
  -d '{"refreshToken": "'"${REFRESH_TOKEN}"'"}'
```

#### 2. Nonce Errors

```bash
# Ensure nonce is unique and recent
NONCE=$(date +%s%N)
echo "Using nonce: $NONCE"

curl -X POST "${API_BASE_URL}/entities/ENTITY_ID/records" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "X-Nonce: ${NONCE}" \
  -d '{"data": {"test": true}}'
```

#### 3. Idempotency Key Issues

```bash
# Use proper UUID format for idempotency keys
IDEMPOTENCY_KEY=$(uuidgen)
echo "Using idempotency key: $IDEMPOTENCY_KEY"

curl -X POST "${API_BASE_URL}/auth/register" \
  -H "${CONTENT_TYPE}" \
  -H "X-Idempotency-Key: ${IDEMPOTENCY_KEY}" \
  -d '{"email": "test@example.com", "password": "pass", "name": "Test"}'
```

#### 4. Rate Limiting

```bash
# Check rate limit status
curl -v -X GET "${API_BASE_URL}/entities" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  2>&1 | grep -i "x-ratelimit"
```

#### 5. Schema Validation

```bash
# Test entity schema validation
curl -X POST "${API_BASE_URL}/entities/ENTITY_ID/records" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "X-Nonce: $(date +%s%N)" \
  -d '{
    "data": {
      "name": "Test Product",
      "price": "invalid_price",
      "category": "invalid_category"
    }
  }'
```

### Environment Variables for Testing

```bash
# Create a .env file for testing
cat > api_test.env << 'EOF'
export API_BASE_URL="http://localhost:3001/api/v1"
export CONTENT_TYPE="Content-Type: application/json"
export ACCESS_TOKEN=""
export REFRESH_TOKEN=""
export API_KEY=""
export TEST_EMAIL="test@example.com"
export TEST_PASSWORD="SecurePassword123!"

# Helper functions
generate_nonce() {
  date +%s%N
}

generate_uuid() {
  uuidgen
}

login() {
  local email="${1:-$TEST_EMAIL}"
  local password="${2:-$TEST_PASSWORD}"
  
  response=$(curl -s -X POST "${API_BASE_URL}/auth/login" \
    -H "${CONTENT_TYPE}" \
    -d '{
      "email": "'${email}'",
      "password": "'${password}'"
    }')
  
  export ACCESS_TOKEN=$(echo "$response" | jq -r '.accessToken')
  export REFRESH_TOKEN=$(echo "$response" | jq -r '.refreshToken')
  
  echo "Logged in successfully"
}
EOF

# Source the environment
source api_test.env

# Login and test
login
curl -X GET "${API_BASE_URL}/entities" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### Testing Scripts

Create comprehensive testing scripts:

```bash
#!/bin/bash
# comprehensive_api_test.sh

source api_test.env

echo "Starting comprehensive API tests..."

# Test 1: Health check
echo "Test 1: Health check"
curl -s "${API_BASE_URL}/health" | jq .

# Test 2: Login
echo "Test 2: Login"
login

# Test 3: Create entity
echo "Test 3: Create entity"
ENTITY_ID=$(curl -s -X POST "${API_BASE_URL}/entities" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{
    "name": "test_products",
    "schema": {
      "type": "object",
      "properties": {
        "name": {"type": "string"},
        "price": {"type": "number"}
      },
      "required": ["name"]
    }
  }' | jq -r '.id')

echo "Created entity: $ENTITY_ID"

# Test 4: Create record with nonce
echo "Test 4: Create record with nonce"
RECORD_ID=$(curl -s -X POST "${API_BASE_URL}/entities/${ENTITY_ID}/records" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "X-Nonce: $(generate_nonce)" \
  -d '{
    "data": {
      "name": "Test Product",
      "price": 29.99
    }
  }' | jq -r '.id')

echo "Created record: $RECORD_ID"

# Test 5: Update record with nonce
echo "Test 5: Update record with nonce"
curl -s -X PUT "${API_BASE_URL}/entities/records/${RECORD_ID}" \
  -H "${CONTENT_TYPE}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "X-Nonce: $(generate_nonce)" \
  -d '{
    "data": {
      "name": "Updated Test Product",
      "price": 39.99
    }
  }' | jq .

echo "All tests completed!"
```

This comprehensive guide covers all major API operations with practical curl examples, including proper usage of nonce headers for security and idempotency keys for safe retries. The examples include error handling, authentication methods, and troubleshooting guidance for common scenarios.