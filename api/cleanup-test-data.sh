#!/bin/bash

# API Base URL
API_BASE="http://localhost:3001/api/v1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================="
echo "     TEST DATA CLEANUP SCRIPT"
echo "========================================="

# Login as admin to get token
echo -e "\n${BLUE}Authenticating as admin...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@example.com","password":"admin123"}')
ADMIN_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${RED}Failed to authenticate. Cannot clean up test data.${NC}"
    exit 1
fi
echo -e "${GREEN}Authentication successful!${NC}"

# Function to delete items
delete_item() {
    local endpoint=$1
    local id=$2
    local description=$3
    
    response=$(curl -s -w "\n%{http_code}" -X DELETE "$API_BASE$endpoint" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    http_code=$(echo "$response" | tail -n 1)
    
    if [ "$http_code" = "204" ] || [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓${NC} Deleted $description: $id"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} Could not delete $description: $id (Status: $http_code)"
        return 1
    fi
}

# 1. Clean up test entities
echo -e "\n${YELLOW}=== CLEANING TEST ENTITIES ===${NC}"
ENTITIES_RESPONSE=$(curl -s "$API_BASE/entities" -H "Authorization: Bearer $ADMIN_TOKEN")

# Find and delete test entities (those with 'test' in the name)
echo "$ENTITIES_RESPONSE" | grep -o '"id":"[^"]*","name":"test[^"]*"' | while read -r line; do
    entity_id=$(echo "$line" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    entity_name=$(echo "$line" | grep -o '"name":"[^"]*' | cut -d'"' -f4)
    
    if [[ $entity_name == test* ]] || [[ $entity_name == *test-entity* ]]; then
        # First delete all records in this entity
        echo -e "\n${BLUE}Cleaning entity: $entity_name${NC}"
        RECORDS_RESPONSE=$(curl -s "$API_BASE/entities/$entity_id/records" -H "Authorization: Bearer $ADMIN_TOKEN")
        record_ids=$(echo "$RECORDS_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
        
        for record_id in $record_ids; do
            delete_item "/entities/records/$record_id" "$record_id" "record"
        done
        
        # Then delete the entity itself
        delete_item "/entities/$entity_id" "$entity_id" "entity $entity_name"
    fi
done

# 2. Clean up test products created via dynamic API
echo -e "\n${YELLOW}=== CLEANING TEST PRODUCTS ===${NC}"
PRODUCTS_RESPONSE=$(curl -s "$API_BASE/product" -H "Authorization: Bearer $ADMIN_TOKEN")

# Find products with TEST in SKU or Test in name
echo "$PRODUCTS_RESPONSE" | grep -o '"id":"[^"]*"[^}]*"sku":"TEST[^"]*"' | while read -r line; do
    product_id=$(echo "$line" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    delete_item "/product/$product_id" "$product_id" "test product"
done

echo "$PRODUCTS_RESPONSE" | grep -o '"id":"[^"]*"[^}]*"name":"Test[^"]*"' | while read -r line; do
    product_id=$(echo "$line" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    delete_item "/product/$product_id" "$product_id" "test product"
done

# Products with BULK in SKU
echo "$PRODUCTS_RESPONSE" | grep -o '"id":"[^"]*"[^}]*"sku":"BULK[^"]*"' | while read -r line; do
    product_id=$(echo "$line" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    delete_item "/product/$product_id" "$product_id" "bulk test product"
done

# 3. Clean up test users
echo -e "\n${YELLOW}=== CLEANING TEST USERS ===${NC}"
# Note: This requires admin endpoint to list users, which may not be available
# For now, we'll keep track of test users in a file during test runs

if [ -f "/tmp/test_users.txt" ]; then
    while IFS= read -r user_id; do
        delete_item "/users/$user_id" "$user_id" "test user"
    done < "/tmp/test_users.txt"
    rm /tmp/test_users.txt
fi

# 4. Clean up revoked API keys
echo -e "\n${YELLOW}=== API KEYS STATUS ===${NC}"
echo -e "${BLUE}Note: Revoked API keys are kept for audit. Manual cleanup may be required.${NC}"

# 5. Summary
echo -e "\n${YELLOW}=== CLEANUP SUMMARY ===${NC}"
echo -e "${GREEN}Test data cleanup completed!${NC}"
echo -e "${BLUE}Note: Some test data may remain if it was created outside of automated tests.${NC}"
echo -e "${BLUE}To completely reset, use: npm run db:reset${NC}"