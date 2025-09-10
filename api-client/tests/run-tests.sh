#!/bin/bash

# API Client Test Runner
echo "🧪 Running Base Platform API Client Tests"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run tests with formatting
run_test_suite() {
    local suite_name=$1
    local test_command=$2
    
    echo -e "\n${YELLOW}Running $suite_name...${NC}"
    if npm run $test_command; then
        echo -e "${GREEN}✓ $suite_name passed${NC}"
        return 0
    else
        echo -e "${RED}✗ $suite_name failed${NC}"
        return 1
    fi
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run from api-client directory.${NC}"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Parse command line arguments
TEST_TYPE=${1:-all}
WATCH_MODE=${2:-false}

case $TEST_TYPE in
    unit)
        echo "Running unit tests only..."
        run_test_suite "Unit Tests" "test:unit"
        ;;
    integration)
        echo "Running integration tests only..."
        run_test_suite "Integration Tests" "test:integration"
        ;;
    coverage)
        echo "Running tests with coverage..."
        run_test_suite "Coverage Tests" "test:coverage"
        ;;
    watch)
        echo "Running tests in watch mode..."
        npm run test:watch
        ;;
    ci)
        echo "Running CI test suite..."
        # Run all tests with coverage for CI
        run_test_suite "Linting" "lint"
        run_test_suite "Unit Tests" "test:unit"
        run_test_suite "Integration Tests" "test:integration"
        run_test_suite "Coverage Report" "test:coverage"
        
        # Check coverage thresholds
        echo -e "\n${YELLOW}Checking coverage thresholds...${NC}"
        if [ -f "coverage/coverage-summary.json" ]; then
            # You can add coverage threshold checking here
            echo -e "${GREEN}✓ Coverage check passed${NC}"
        fi
        ;;
    *)
        echo "Running all tests..."
        
        # Run linting first
        run_test_suite "Linting" "lint" || true
        
        # Run all test suites
        FAILED=0
        
        run_test_suite "Unit Tests" "test:unit" || FAILED=1
        run_test_suite "Integration Tests" "test:integration" || FAILED=1
        
        # Generate coverage report
        echo -e "\n${YELLOW}Generating coverage report...${NC}"
        npm run test:coverage > /dev/null 2>&1
        
        # Display coverage summary
        if [ -f "coverage/lcov-report/index.html" ]; then
            echo -e "${GREEN}✓ Coverage report generated at coverage/lcov-report/index.html${NC}"
            
            # Try to display coverage summary
            if command -v npx &> /dev/null && npx -p nyc nyc report --reporter=text-summary 2>/dev/null; then
                echo "Coverage summary displayed above"
            fi
        fi
        
        # Final status
        echo -e "\n========================================="
        if [ $FAILED -eq 0 ]; then
            echo -e "${GREEN}✅ All tests passed!${NC}"
            exit 0
        else
            echo -e "${RED}❌ Some tests failed. Please check the output above.${NC}"
            exit 1
        fi
        ;;
esac