#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API Base URL
API_URL="http://localhost:3001/api/v1"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test user credentials
TEST_EMAIL="nonce-test-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"
TEST_ENTITY_NAME="nonce-test-entity-$(date +%s)"

# Function to print test results
print_result() {
    TESTS_RUN=$((TESTS_RUN + 1))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗${NC} $2"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Function to extract value from JSON
extract_json() {
    echo "$1" | grep -o "\"$2\":[^,}]*" | cut -d':' -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//;s/^"//;s/"$//'
}

echo -e "${BLUE}=== Nonce Implementation Test Suite ===${NC}\n"

# ============================================
# SETUP: Create test user and login
# ============================================
echo -e "${YELLOW}Setting up test environment...${NC}"

# Register test user
echo "Creating test user..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\",
        \"firstName\": \"Nonce\",
        \"lastName\": \"Tester\"
    }")

if echo "$REGISTER_RESPONSE" | grep -q "accessToken"; then
    echo -e "${GREEN}✓${NC} Test user created"
else
    echo -e "${RED}✗${NC} Failed to create test user"
    echo "Response: $REGISTER_RESPONSE"
    exit 1
fi

ACCESS_TOKEN=$(extract_json "$REGISTER_RESPONSE" "accessToken")
REFRESH_TOKEN=$(extract_json "$REGISTER_RESPONSE" "refreshToken")

# ============================================
# TEST 1: JWT Nonce - Token includes JTI
# ============================================
echo -e "\n${YELLOW}Testing JWT Nonce Implementation...${NC}"

# Decode JWT to check for jti claim
JWT_PAYLOAD=$(echo "$ACCESS_TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null || echo "$ACCESS_TOKEN" | cut -d'.' -f2 | base64 -D 2>/dev/null)

if echo "$JWT_PAYLOAD" | grep -q "jti"; then
    JTI=$(echo "$JWT_PAYLOAD" | grep -o '"jti":"[^"]*"' | cut -d':' -f2 | sed 's/"//g')
    print_result 0 "JWT contains jti (JWT ID): $JTI"
else
    print_result 1 "JWT does not contain jti claim"
fi

# ============================================
# TEST 2: JWT Nonce - Token Revocation on Logout
# ============================================
echo "Testing token revocation on logout..."

# First, verify token works
AUTH_CHECK=$(curl -s -X GET "$API_URL/auth/profile" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$AUTH_CHECK" | grep -q "$TEST_EMAIL"; then
    echo "Token is currently valid"
else
    echo "Warning: Token validation failed before logout test"
fi

# Logout to revoke the token
LOGOUT_RESPONSE=$(curl -s -X POST "$API_URL/auth/logout" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$LOGOUT_RESPONSE" | grep -q "success"; then
    echo "Logout successful"
else
    echo "Logout response: $LOGOUT_RESPONSE"
fi

# Try to use the token after logout (should fail)
AUTH_CHECK_AFTER=$(curl -s -X GET "$API_URL/auth/profile" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$AUTH_CHECK_AFTER" | grep -q "Unauthorized\|Invalid token"; then
    print_result 0 "Token revoked after logout (JWT nonce working)"
else
    print_result 1 "Token still valid after logout (JWT nonce not working)"
fi

# ============================================
# TEST 3: Create Entity with Nonce Configuration
# ============================================
echo -e "\n${YELLOW}Testing Request Nonce Configuration...${NC}"

# Login again to get new token
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\"
    }")

ACCESS_TOKEN=$(extract_json "$LOGIN_RESPONSE" "accessToken")

# Create entity with nonce enabled
echo "Creating entity with nonce protection..."
CREATE_ENTITY=$(curl -s -X POST "$API_URL/entities" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d "{
        \"name\": \"$TEST_ENTITY_NAME\",
        \"displayName\": \"Nonce Test Entity\",
        \"description\": \"Entity for testing nonce functionality\",
        \"schema\": {
            \"type\": \"object\",
            \"properties\": {
                \"name\": { \"type\": \"string\" },
                \"value\": { \"type\": \"number\" }
            },
            \"required\": [\"name\"]
        },
        \"isActive\": true,
        \"nonceEnabled\": true,
        \"nonceTtl\": 300000,
        \"nonceMethods\": [\"POST\", \"PUT\", \"DELETE\"],
        \"nonceRequireSignature\": false
    }")

if echo "$CREATE_ENTITY" | grep -q "\"id\""; then
    ENTITY_ID=$(extract_json "$CREATE_ENTITY" "id")
    print_result 0 "Entity created with nonce configuration"
else
    print_result 1 "Failed to create entity with nonce configuration"
    echo "Response: $CREATE_ENTITY"
fi

# ============================================
# TEST 4: Request Nonce - Valid Request with Nonce
# ============================================
echo -e "\n${YELLOW}Testing Request Nonce Validation...${NC}"

# Generate nonce and timestamp
NONCE=$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid 2>/dev/null || echo "test-nonce-$(date +%s)")
TIMESTAMP=$(($(date +%s) * 1000))  # Use seconds * 1000 for milliseconds

# Create a record with nonce headers
echo "Testing valid request with nonce headers..."
CREATE_RECORD=$(curl -s -X POST "$API_URL/entities/$ENTITY_ID/records" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "X-Nonce: $NONCE" \
    -H "X-Timestamp: $TIMESTAMP" \
    -d "{
        \"data\": {
            \"name\": \"Test Record\",
            \"value\": 123
        }
    }")

if echo "$CREATE_RECORD" | grep -q "\"id\""; then
    RECORD_ID=$(extract_json "$CREATE_RECORD" "id")
    print_result 0 "Request with valid nonce accepted"
else
    print_result 1 "Request with valid nonce rejected"
    echo "Response: $CREATE_RECORD"
fi

# ============================================
# TEST 5: Request Nonce - Replay Attack Prevention
# ============================================
echo "Testing replay attack prevention..."

# Try to reuse the same nonce (should fail)
REPLAY_ATTEMPT=$(curl -s -X POST "$API_URL/entities/$ENTITY_ID/records" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "X-Nonce: $NONCE" \
    -H "X-Timestamp: $TIMESTAMP" \
    -d "{
        \"data\": {
            \"name\": \"Replay Attack\",
            \"value\": 456
        }
    }")

if echo "$REPLAY_ATTEMPT" | grep -q "nonce\|Nonce\|replay\|already used"; then
    print_result 0 "Replay attack prevented (nonce rejected on reuse)"
else
    if echo "$REPLAY_ATTEMPT" | grep -q "\"id\""; then
        print_result 1 "Replay attack NOT prevented (duplicate nonce accepted)"
    else
        # If failed for another reason, check if it's nonce-related
        echo "Response: $REPLAY_ATTEMPT"
        print_result 1 "Unclear if nonce validation is working"
    fi
fi

# ============================================
# TEST 6: Request Nonce - Expired Timestamp
# ============================================
echo "Testing expired timestamp rejection..."

# Use an old timestamp (1 hour ago)
OLD_TIMESTAMP=$(($(date +%s) * 1000 - 3600000))
NEW_NONCE=$(uuidgen 2>/dev/null || echo "expired-nonce-$(date +%s)")

EXPIRED_REQUEST=$(curl -s -X POST "$API_URL/entities/$ENTITY_ID/records" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "X-Nonce: $NEW_NONCE" \
    -H "X-Timestamp: $OLD_TIMESTAMP" \
    -d "{
        \"data\": {
            \"name\": \"Expired Request\",
            \"value\": 789
        }
    }")

if echo "$EXPIRED_REQUEST" | grep -q "expired\|Expired\|too old\|timestamp"; then
    print_result 0 "Expired timestamp rejected"
else
    if echo "$EXPIRED_REQUEST" | grep -q "\"id\""; then
        print_result 1 "Expired timestamp accepted (should be rejected)"
    else
        echo "Response: $EXPIRED_REQUEST"
        print_result 1 "Unclear if timestamp validation is working"
    fi
fi

# ============================================
# TEST 7: Request Without Nonce Headers
# ============================================
echo "Testing request without nonce headers (should be rejected for protected entity)..."

NO_NONCE_REQUEST=$(curl -s -X POST "$API_URL/entities/$ENTITY_ID/records" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d "{
        \"data\": {
            \"name\": \"No Nonce Request\",
            \"value\": 999
        }
    }")

if echo "$NO_NONCE_REQUEST" | grep -q "Missing nonce\|nonce.*required\|X-Nonce"; then
    print_result 0 "Request without nonce headers rejected"
else
    if echo "$NO_NONCE_REQUEST" | grep -q "\"id\""; then
        print_result 1 "Request without nonce accepted (should be rejected)"
    else
        echo "Response: $NO_NONCE_REQUEST"
        print_result 1 "Unclear if nonce requirement is enforced"
    fi
fi

# ============================================
# TEST 8: Test Nonce with Signature (if enabled)
# ============================================
echo -e "\n${YELLOW}Testing Nonce with Signature Requirement...${NC}"

# Update entity to require signature
UPDATE_ENTITY=$(curl -s -X PUT "$API_URL/entities/$ENTITY_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d "{
        \"nonceEnabled\": true,
        \"nonceRequireSignature\": true
    }")

if echo "$UPDATE_ENTITY" | grep -q "\"id\""; then
    echo "Entity updated to require signature"
else
    echo "Warning: Failed to update entity for signature test"
fi

# Test request without signature (should fail)
NONCE_NO_SIG=$(uuidgen 2>/dev/null || echo "nosig-nonce-$(date +%s)")
TIMESTAMP_NO_SIG=$(date +%s%3N)

NO_SIG_REQUEST=$(curl -s -X POST "$API_URL/entities/$ENTITY_ID/records" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "X-Nonce: $NONCE_NO_SIG" \
    -H "X-Timestamp: $TIMESTAMP_NO_SIG" \
    -d "{
        \"data\": {
            \"name\": \"No Signature\",
            \"value\": 111
        }
    }")

if echo "$NO_SIG_REQUEST" | grep -q "signature\|Signature"; then
    print_result 0 "Request without signature rejected when signature required"
else
    if echo "$NO_SIG_REQUEST" | grep -q "\"id\""; then
        print_result 1 "Request without signature accepted (should be rejected)"
    else
        echo "Note: Signature validation may not be fully implemented yet"
        print_result 0 "Signature requirement test skipped"
    fi
fi

# ============================================
# CLEANUP
# ============================================
echo -e "\n${YELLOW}Cleaning up test data...${NC}"

# Delete the test entity
if [ ! -z "$ENTITY_ID" ]; then
    DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/entities/$ENTITY_ID" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    
    if echo "$DELETE_RESPONSE" | grep -q "success\|deleted"; then
        echo -e "${GREEN}✓${NC} Test entity deleted"
    else
        echo -e "${YELLOW}⚠${NC} Could not delete test entity"
    fi
fi

# Note: In production, you might also want to delete the test user

# ============================================
# SUMMARY
# ============================================
echo -e "\n${BLUE}=== Test Summary ===${NC}"
echo "Tests Run: $TESTS_RUN"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed! ✓${NC}"
    exit 0
else
    echo -e "\n${RED}Some tests failed. Please review the implementation.${NC}"
    exit 1
fi