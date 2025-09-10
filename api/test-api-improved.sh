#!/bin/bash

# API Base URL
API_BASE="http://localhost:3001/api/v1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0

# Arrays to store test data for cleanup
declare -a TEST_ENTITY_IDS
declare -a TEST_RECORD_IDS
declare -a TEST_USER_IDS
declare -a TEST_API_KEY_IDS

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $2"
        ((FAILED++))
    fi
}

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5
    local auth_token=$6
    
    echo -e "\n${YELLOW}Testing:${NC} $description"
    
    if [ -z "$data" ]; then
        if [ -z "$auth_token" ]; then
            response=$(curl -s -w "\n%{http_code}" -X $method "$API_BASE$endpoint" -H "Content-Type: application/json")
        else
            response=$(curl -s -w "\n%{http_code}" -X $method "$API_BASE$endpoint" -H "Content-Type: application/json" -H "Authorization: Bearer $auth_token")
        fi
    else
        if [ -z "$auth_token" ]; then
            response=$(curl -s -w "\n%{http_code}" -X $method "$API_BASE$endpoint" -H "Content-Type: application/json" -d "$data")
        else
            response=$(curl -s -w "\n%{http_code}" -X $method "$API_BASE$endpoint" -H "Content-Type: application/json" -H "Authorization: Bearer $auth_token" -d "$data")
        fi
    fi
    
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')
    
    echo "Status: $http_code"
    echo "Response: $body" | head -c 200
    if [ ${#body} -gt 200 ]; then
        echo "... [truncated]"
    else
        echo
    fi
    
    if [ "$http_code" = "$expected_status" ]; then
        print_result 0 "$description (Status: $http_code)"
        echo "$body" > /tmp/last_response.json
    else
        print_result 1 "$description (Expected: $expected_status, Got: $http_code)"
    fi
}

echo "========================================="
echo "     API COMPREHENSIVE TEST SUITE"
echo "      Using Existing Sample Data"
echo "========================================="

# First, login with existing admin credentials to get token
echo -e "\n${BLUE}Authenticating with admin user...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@example.com","password":"admin123"}')
ADMIN_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${RED}Failed to authenticate. Make sure the database is seeded.${NC}"
    exit 1
fi
echo -e "${GREEN}Authentication successful!${NC}"

# 1. Test Health & Basic Endpoints
echo -e "\n${YELLOW}=== HEALTH & BASIC ENDPOINTS ===${NC}"
test_endpoint "GET" "/health" "" "200" "Health Check"
test_endpoint "GET" "/" "" "200" "API Root"

# 2. Test Authentication Endpoints
echo -e "\n${YELLOW}=== AUTHENTICATION ENDPOINTS ===${NC}"

# Test login with sample users
test_endpoint "POST" "/auth/login" \
    '{"email":"admin@example.com","password":"admin123"}' \
    "200" "Login with Admin User"

test_endpoint "POST" "/auth/login" \
    '{"email":"user@example.com","password":"user123"}' \
    "200" "Login with Test User"

test_endpoint "POST" "/auth/login" \
    '{"email":"invalid@example.com","password":"wrong"}' \
    "401" "Login with Invalid Credentials"

# Test registration (create test user for cleanup later)
TIMESTAMP=$(date +%s)
TEST_USER_EMAIL="testuser_${TIMESTAMP}@example.com"
REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_USER_EMAIL\",\"password\":\"Test123!@#\",\"username\":\"testuser$TIMESTAMP\",\"firstName\":\"Test\",\"lastName\":\"User\"}")
TEST_USER_ID=$(echo $REGISTER_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
if [ ! -z "$TEST_USER_ID" ]; then
    TEST_USER_IDS+=("$TEST_USER_ID")
    echo -e "${BLUE}Created test user: $TEST_USER_EMAIL (ID: $TEST_USER_ID)${NC}"
fi

test_endpoint "POST" "/auth/register" \
    "{\"email\":\"newtest${TIMESTAMP}@example.com\",\"password\":\"Test123!@#\",\"username\":\"newuser$TIMESTAMP\",\"firstName\":\"New\",\"lastName\":\"User\"}" \
    "201" "Register New User"

# Test refresh token
test_endpoint "POST" "/auth/refresh" \
    "{\"refreshToken\":\"$REFRESH_TOKEN\"}" \
    "200" "Refresh Access Token"

# Test logout
test_endpoint "POST" "/auth/logout" \
    "{\"refreshToken\":\"$REFRESH_TOKEN\"}" \
    "200" "Logout User" "$ADMIN_TOKEN"

# Get new token after logout
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@example.com","password":"admin123"}')
ADMIN_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# 3. Test Entities (Using Existing Sample Data)
echo -e "\n${YELLOW}=== ENTITY OPERATIONS (SAMPLE DATA) ===${NC}"

# List existing entities
test_endpoint "GET" "/entities" "" "200" "List All Entities" "$ADMIN_TOKEN"

# Get existing entities to test with
ENTITIES_RESPONSE=$(curl -s "$API_BASE/entities" -H "Authorization: Bearer $ADMIN_TOKEN")
PRODUCT_ENTITY_ID=$(echo $ENTITIES_RESPONSE | grep -o '"name":"product"[^}]*"id":"[^"]*' | grep -o '"id":"[^"]*' | cut -d'"' -f4)
BLOG_ENTITY_ID=$(echo $ENTITIES_RESPONSE | grep -o '"name":"blog-post"[^}]*"id":"[^"]*' | grep -o '"id":"[^"]*' | cut -d'"' -f4)

echo -e "${BLUE}Using existing entities: Product($PRODUCT_ENTITY_ID), Blog($BLOG_ENTITY_ID)${NC}"

# Test get entity by ID
if [ ! -z "$PRODUCT_ENTITY_ID" ]; then
    test_endpoint "GET" "/entities/$PRODUCT_ENTITY_ID" "" "200" "Get Product Entity by ID" "$ADMIN_TOKEN"
fi

# Create a test entity for update/delete operations
TEST_ENTITY_DATA='{
    "name": "test-entity-'$TIMESTAMP'",
    "displayName": "Automated Test Entity",
    "description": "Entity created by automated tests",
    "schema": {
        "type": "object",
        "properties": {
            "testField": {"type": "string"},
            "testNumber": {"type": "number"}
        },
        "required": ["testField"]
    }
}'
CREATE_ENTITY_RESPONSE=$(curl -s -X POST "$API_BASE/entities" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "$TEST_ENTITY_DATA")
TEST_ENTITY_ID=$(echo $CREATE_ENTITY_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
if [ ! -z "$TEST_ENTITY_ID" ]; then
    TEST_ENTITY_IDS+=("$TEST_ENTITY_ID")
    echo -e "${BLUE}Created test entity: $TEST_ENTITY_ID${NC}"
fi

test_endpoint "POST" "/entities" "$TEST_ENTITY_DATA" "201" "Create Test Entity" "$ADMIN_TOKEN"

# Update test entity
if [ ! -z "$TEST_ENTITY_ID" ]; then
    UPDATE_ENTITY_DATA='{
        "displayName": "Updated Test Entity",
        "description": "Updated by automated tests"
    }'
    test_endpoint "PUT" "/entities/$TEST_ENTITY_ID" "$UPDATE_ENTITY_DATA" "200" "Update Test Entity" "$ADMIN_TOKEN"
fi

# 4. Test Entity Records with Sample Data
echo -e "\n${YELLOW}=== ENTITY RECORDS (SAMPLE DATA) ===${NC}"

# List existing product records
if [ ! -z "$PRODUCT_ENTITY_ID" ]; then
    test_endpoint "GET" "/entities/$PRODUCT_ENTITY_ID/records" "" "200" "List Product Records" "$ADMIN_TOKEN"
    
    # Get first product record for testing
    RECORDS_RESPONSE=$(curl -s "$API_BASE/entities/$PRODUCT_ENTITY_ID/records" -H "Authorization: Bearer $ADMIN_TOKEN")
    PRODUCT_RECORD_ID=$(echo $RECORDS_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    
    if [ ! -z "$PRODUCT_RECORD_ID" ]; then
        test_endpoint "GET" "/entities/records/$PRODUCT_RECORD_ID" "" "200" "Get Product Record by ID" "$ADMIN_TOKEN"
    fi
fi

# Create test record in test entity
if [ ! -z "$TEST_ENTITY_ID" ]; then
    TEST_RECORD_DATA='{
        "testField": "Test Value",
        "testNumber": 42
    }'
    CREATE_RECORD_RESPONSE=$(curl -s -X POST "$API_BASE/entities/$TEST_ENTITY_ID/records" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d "$TEST_RECORD_DATA")
    TEST_RECORD_ID=$(echo $CREATE_RECORD_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    if [ ! -z "$TEST_RECORD_ID" ]; then
        TEST_RECORD_IDS+=("$TEST_RECORD_ID")
        echo -e "${BLUE}Created test record: $TEST_RECORD_ID${NC}"
    fi
    
    test_endpoint "POST" "/entities/$TEST_ENTITY_ID/records" "$TEST_RECORD_DATA" "201" "Create Test Record" "$ADMIN_TOKEN"
    
    # Update test record
    if [ ! -z "$TEST_RECORD_ID" ]; then
        UPDATE_RECORD_DATA='{
            "testField": "Updated Value",
            "testNumber": 100
        }'
        test_endpoint "PUT" "/entities/records/$TEST_RECORD_ID" "$UPDATE_RECORD_DATA" "200" "Update Test Record" "$ADMIN_TOKEN"
    fi
fi

# 5. Test Dynamic API with Sample Data
echo -e "\n${YELLOW}=== DYNAMIC API (SAMPLE DATA) ===${NC}"

# Test with existing entities
test_endpoint "GET" "/product" "" "200" "Get Products via Dynamic API" "$ADMIN_TOKEN"
test_endpoint "GET" "/blog-post" "" "200" "Get Blog Posts via Dynamic API" "$ADMIN_TOKEN"
test_endpoint "GET" "/user-profile" "" "200" "Get User Profiles via Dynamic API" "$ADMIN_TOKEN"

# Get specific product via dynamic API
PRODUCTS_RESPONSE=$(curl -s "$API_BASE/product" -H "Authorization: Bearer $ADMIN_TOKEN")
SAMPLE_PRODUCT_ID=$(echo $PRODUCTS_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ ! -z "$SAMPLE_PRODUCT_ID" ]; then
    test_endpoint "GET" "/product/$SAMPLE_PRODUCT_ID" "" "200" "Get Specific Product via Dynamic API" "$ADMIN_TOKEN"
fi

# Create test product via dynamic API
TEST_PRODUCT_DATA='{
    "name": "Test Product '$TIMESTAMP'",
    "price": 99.99,
    "currency": "USD",
    "sku": "TEST-'$TIMESTAMP'",
    "inStock": true,
    "category": "Test Category"
}'
test_endpoint "POST" "/product" "$TEST_PRODUCT_DATA" "201" "Create Product via Dynamic API" "$ADMIN_TOKEN"

# Validate product data
test_endpoint "POST" "/product/validate" "$TEST_PRODUCT_DATA" "200" "Validate Valid Product Data" "$ADMIN_TOKEN"

# Test invalid data validation
INVALID_PRODUCT='{
    "name": "Invalid Product",
    "price": -10,
    "currency": "INVALID",
    "sku": "invalid sku"
}'
test_endpoint "POST" "/product/validate" "$INVALID_PRODUCT" "400" "Validate Invalid Product Data" "$ADMIN_TOKEN"

# 6. Test API Keys
echo -e "\n${YELLOW}=== API KEY MANAGEMENT ===${NC}"

# Create API key
API_KEY_DATA='{
    "name": "Test API Key '$TIMESTAMP'",
    "permissions": ["read", "write"],
    "expiresAt": "2025-12-31T23:59:59Z"
}'
CREATE_KEY_RESPONSE=$(curl -s -X POST "$API_BASE/auth/api-keys" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "$API_KEY_DATA")
API_KEY=$(echo $CREATE_KEY_RESPONSE | grep -o '"key":"[^"]*' | cut -d'"' -f4)
API_KEY_ID=$(echo $CREATE_KEY_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$API_KEY_ID" ]; then
    TEST_API_KEY_IDS+=("$API_KEY_ID")
    echo -e "${BLUE}Created test API key: $API_KEY_ID${NC}"
fi

test_endpoint "POST" "/auth/api-keys" "$API_KEY_DATA" "201" "Create API Key" "$ADMIN_TOKEN"

# Test API key authentication
if [ ! -z "$API_KEY" ]; then
    echo -e "\n${YELLOW}Testing API Key Authentication${NC}"
    response=$(curl -s -w "\n%{http_code}" "$API_BASE/entities" -H "X-API-Key: $API_KEY")
    http_code=$(echo "$response" | tail -n 1)
    if [ "$http_code" = "200" ]; then
        print_result 0 "API Key Authentication (Status: $http_code)"
    else
        print_result 1 "API Key Authentication (Expected: 200, Got: $http_code)"
    fi
    
    # Revoke API key
    test_endpoint "POST" "/auth/api-keys/$API_KEY_ID/revoke" "" "200" "Revoke API Key" "$ADMIN_TOKEN"
fi

# 7. Test Pagination & Filtering
echo -e "\n${YELLOW}=== PAGINATION & FILTERING ===${NC}"

test_endpoint "GET" "/entities?page=1&limit=3" "" "200" "Paginated Entities (Page 1, Limit 3)" "$ADMIN_TOKEN"
test_endpoint "GET" "/entities?page=2&limit=3" "" "200" "Paginated Entities (Page 2, Limit 3)" "$ADMIN_TOKEN"
test_endpoint "GET" "/entities?isActive=true" "" "200" "Filter Active Entities" "$ADMIN_TOKEN"
test_endpoint "GET" "/product?page=1&limit=2" "" "200" "Paginated Products via Dynamic API" "$ADMIN_TOKEN"

# 8. Test Error Handling
echo -e "\n${YELLOW}=== ERROR HANDLING ===${NC}"

test_endpoint "GET" "/nonexistent" "" "404" "Non-existent Endpoint"
test_endpoint "POST" "/auth/login" "invalid json" "400" "Invalid JSON"
test_endpoint "GET" "/entities/invalid-uuid" "" "400" "Invalid UUID Parameter" "$ADMIN_TOKEN"
test_endpoint "GET" "/entities" "" "401" "Unauthorized Request (No Token)"
test_endpoint "POST" "/entities" "" "401" "Unauthorized Create (No Token)"

# 9. Test Rate Limiting
echo -e "\n${YELLOW}=== RATE LIMITING TEST ===${NC}"
echo "Sending rapid requests to test rate limiting..."
RATE_LIMIT_HITS=0
for i in {1..10}; do
    response=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/health")
    if [ "$response" = "429" ]; then
        ((RATE_LIMIT_HITS++))
    fi
    echo "Request $i: Status $response"
    sleep 0.1
done
if [ $RATE_LIMIT_HITS -gt 0 ]; then
    print_result 0 "Rate Limiting Active (Hit $RATE_LIMIT_HITS times)"
else
    print_result 1 "Rate Limiting Not Triggered"
fi

# 10. Test Bulk Operations
echo -e "\n${YELLOW}=== BULK OPERATIONS ===${NC}"

BULK_PRODUCTS='[
    {
        "name": "Bulk Product 1",
        "price": 10.99,
        "currency": "USD",
        "sku": "BULK-001-'$TIMESTAMP'",
        "inStock": true
    },
    {
        "name": "Bulk Product 2",
        "price": 20.99,
        "currency": "USD",
        "sku": "BULK-002-'$TIMESTAMP'",
        "inStock": false
    }
]'
test_endpoint "POST" "/product/bulk" "$BULK_PRODUCTS" "201" "Bulk Create Products" "$ADMIN_TOKEN"

# CLEANUP SECTION
echo -e "\n${YELLOW}=== CLEANUP TEST DATA ===${NC}"
echo -e "${BLUE}Cleaning up test data created during tests...${NC}"

# Delete test records
for record_id in "${TEST_RECORD_IDS[@]}"; do
    if [ ! -z "$record_id" ]; then
        echo "Deleting test record: $record_id"
        curl -s -X DELETE "$API_BASE/entities/records/$record_id" \
            -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
    fi
done

# Delete test entities
for entity_id in "${TEST_ENTITY_IDS[@]}"; do
    if [ ! -z "$entity_id" ]; then
        echo "Deleting test entity: $entity_id"
        curl -s -X DELETE "$API_BASE/entities/$entity_id" \
            -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
    fi
done

# Delete test API keys (already revoked)
for key_id in "${TEST_API_KEY_IDS[@]}"; do
    if [ ! -z "$key_id" ]; then
        echo "Test API key already revoked: $key_id"
    fi
done

# Note: Test users are kept for audit purposes but can be cleaned up separately

# Print Summary
echo -e "\n========================================="
echo -e "            TEST SUMMARY"
echo -e "========================================="
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
echo -e "Total: $((PASSED + FAILED))"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed! ✓${NC}"
    exit 0
else
    echo -e "\n${RED}Some tests failed ✗${NC}"
    echo -e "${YELLOW}Note: Some failures may be expected (rate limiting, validation errors)${NC}"
    exit 1
fi