#!/bin/bash

# API Base URL
API_BASE="http://localhost:3001/api/v1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0

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
    echo
    
    if [ "$http_code" = "$expected_status" ]; then
        print_result 0 "$description (Status: $http_code)"
        echo "$body"
    else
        print_result 1 "$description (Expected: $expected_status, Got: $http_code)"
    fi
}

echo "========================================="
echo "     API COMPREHENSIVE TEST SUITE"
echo "========================================="

# 1. Test Health Check
echo -e "\n${YELLOW}=== HEALTH & BASIC ENDPOINTS ===${NC}"
test_endpoint "GET" "/health" "" "200" "Health Check"

# 2. Test Authentication
echo -e "\n${YELLOW}=== AUTHENTICATION ENDPOINTS ===${NC}"

# Register new user
TIMESTAMP=$(date +%s)
TEST_USER="testuser_${TIMESTAMP}@example.com"
test_endpoint "POST" "/auth/register" \
    '{"email":"'$TEST_USER'","password":"Test123!@#","username":"testuser'$TIMESTAMP'","firstName":"Test","lastName":"User"}' \
    "201" "Register New User"

# Extract access token from registration
REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"email":"newtest'$TIMESTAMP'@example.com","password":"Test123!@#","username":"newtestuser'$TIMESTAMP'","firstName":"New","lastName":"Test"}')
ACCESS_TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# Login with existing user
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@example.com","password":"admin123"}')
ADMIN_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4)

test_endpoint "POST" "/auth/login" \
    '{"email":"admin@example.com","password":"admin123"}' \
    "200" "Login with Admin User"

test_endpoint "POST" "/auth/login" \
    '{"email":"invalid@example.com","password":"wrong"}' \
    "401" "Login with Invalid Credentials"

# Test refresh token
test_endpoint "POST" "/auth/refresh" \
    '{"refreshToken":"'$REFRESH_TOKEN'"}' \
    "200" "Refresh Access Token"

# Test logout
test_endpoint "POST" "/auth/logout" \
    '{"refreshToken":"'$REFRESH_TOKEN'"}' \
    "200" "Logout User" "$ADMIN_TOKEN"

# 3. Test Entities CRUD
echo -e "\n${YELLOW}=== ENTITY CRUD OPERATIONS ===${NC}"

# List entities
test_endpoint "GET" "/entities" "" "200" "List All Entities" "$ADMIN_TOKEN"

# Create new entity
ENTITY_DATA='{
    "name": "test-entity-'$TIMESTAMP'",
    "displayName": "Test Entity",
    "description": "Test entity for automated testing",
    "schema": {
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "value": {"type": "number"}
        },
        "required": ["name"]
    }
}'
CREATE_ENTITY_RESPONSE=$(curl -s -X POST "$API_BASE/entities" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "$ENTITY_DATA")
ENTITY_ID=$(echo $CREATE_ENTITY_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

test_endpoint "POST" "/entities" "$ENTITY_DATA" "201" "Create New Entity" "$ADMIN_TOKEN"

# Get entity by ID
test_endpoint "GET" "/entities/$ENTITY_ID" "" "200" "Get Entity by ID" "$ADMIN_TOKEN"

# Update entity
UPDATE_ENTITY_DATA='{
    "displayName": "Updated Test Entity",
    "description": "Updated description"
}'
test_endpoint "PUT" "/entities/$ENTITY_ID" "$UPDATE_ENTITY_DATA" "200" "Update Entity" "$ADMIN_TOKEN"

# 4. Test Entity Records
echo -e "\n${YELLOW}=== ENTITY RECORDS CRUD ===${NC}"

# Create record
RECORD_DATA='{
    "name": "Test Record",
    "value": 42
}'
CREATE_RECORD_RESPONSE=$(curl -s -X POST "$API_BASE/entities/$ENTITY_ID/records" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "$RECORD_DATA")
RECORD_ID=$(echo $CREATE_RECORD_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

test_endpoint "POST" "/entities/$ENTITY_ID/records" "$RECORD_DATA" "201" "Create Entity Record" "$ADMIN_TOKEN"

# List records
test_endpoint "GET" "/entities/$ENTITY_ID/records" "" "200" "List Entity Records" "$ADMIN_TOKEN"

# Get record by ID
test_endpoint "GET" "/entities/records/$RECORD_ID" "" "200" "Get Record by ID" "$ADMIN_TOKEN"

# Update record
UPDATE_RECORD_DATA='{
    "name": "Updated Record",
    "value": 100
}'
test_endpoint "PUT" "/entities/records/$RECORD_ID" "$UPDATE_RECORD_DATA" "200" "Update Record" "$ADMIN_TOKEN"

# 5. Test Dynamic API
echo -e "\n${YELLOW}=== DYNAMIC API ENDPOINTS ===${NC}"

# Get existing entity records via dynamic API
test_endpoint "GET" "/product" "" "200" "Get Products via Dynamic API" "$ADMIN_TOKEN"
test_endpoint "GET" "/blog-post" "" "200" "Get Blog Posts via Dynamic API" "$ADMIN_TOKEN"

# Create record via dynamic API
DYNAMIC_RECORD='{
    "name": "Dynamic Product",
    "price": 99.99,
    "currency": "USD",
    "sku": "DYN-001",
    "inStock": true
}'
test_endpoint "POST" "/product" "$DYNAMIC_RECORD" "201" "Create Product via Dynamic API" "$ADMIN_TOKEN"

# Validate data
test_endpoint "POST" "/product/validate" "$DYNAMIC_RECORD" "200" "Validate Product Data" "$ADMIN_TOKEN"

# Invalid data validation
INVALID_RECORD='{
    "name": "Invalid Product",
    "price": -10,
    "currency": "INVALID"
}'
test_endpoint "POST" "/product/validate" "$INVALID_RECORD" "400" "Validate Invalid Product Data" "$ADMIN_TOKEN"

# 6. Test API Keys
echo -e "\n${YELLOW}=== API KEY MANAGEMENT ===${NC}"

# Create API key
API_KEY_DATA='{
    "name": "Test API Key",
    "permissions": ["read", "write"],
    "expiresAt": "2025-12-31T23:59:59Z"
}'
CREATE_KEY_RESPONSE=$(curl -s -X POST "$API_BASE/auth/api-keys" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "$API_KEY_DATA")
API_KEY=$(echo $CREATE_KEY_RESPONSE | grep -o '"key":"[^"]*' | cut -d'"' -f4)
API_KEY_ID=$(echo $CREATE_KEY_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

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
fi

# Revoke API key
test_endpoint "POST" "/auth/api-keys/$API_KEY_ID/revoke" "" "200" "Revoke API Key" "$ADMIN_TOKEN"

# 7. Test Rate Limiting
echo -e "\n${YELLOW}=== RATE LIMITING TEST ===${NC}"
echo "Sending 5 rapid requests..."
for i in {1..5}; do
    response=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/health")
    echo "Request $i: Status $response"
done

# 8. Test Error Handling
echo -e "\n${YELLOW}=== ERROR HANDLING ===${NC}"

test_endpoint "GET" "/nonexistent" "" "404" "Non-existent Endpoint"
test_endpoint "POST" "/auth/login" "invalid json" "400" "Invalid JSON"
test_endpoint "GET" "/entities/invalid-uuid" "" "400" "Invalid UUID Parameter" "$ADMIN_TOKEN"

# 9. Test Pagination
echo -e "\n${YELLOW}=== PAGINATION TEST ===${NC}"

test_endpoint "GET" "/entities?page=1&limit=5" "" "200" "Paginated Entities (Page 1)" "$ADMIN_TOKEN"
test_endpoint "GET" "/entities?page=2&limit=5" "" "200" "Paginated Entities (Page 2)" "$ADMIN_TOKEN"

# 10. Test Filtering and Sorting
echo -e "\n${YELLOW}=== FILTERING & SORTING ===${NC}"

test_endpoint "GET" "/entities?isActive=true" "" "200" "Filter Active Entities" "$ADMIN_TOKEN"
test_endpoint "GET" "/entities?sort=createdAt:desc" "" "200" "Sort Entities by Date" "$ADMIN_TOKEN"

# Cleanup - Delete test entity
echo -e "\n${YELLOW}=== CLEANUP ===${NC}"
test_endpoint "DELETE" "/entities/records/$RECORD_ID" "" "204" "Delete Test Record" "$ADMIN_TOKEN"
test_endpoint "DELETE" "/entities/$ENTITY_ID" "" "204" "Delete Test Entity" "$ADMIN_TOKEN"

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
    exit 1
fi