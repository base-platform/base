-- Initialize base database with extensions and basic setup
-- This script runs when PostgreSQL container starts for the first time

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create additional databases for different environments if needed
-- CREATE DATABASE basedb_test;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE basedb TO postgres;

-- Set timezone
SET timezone = 'UTC';

-- Create schemas if needed
-- CREATE SCHEMA IF NOT EXISTS audit;
-- CREATE SCHEMA IF NOT EXISTS logs;

-- Log initialization
\echo 'Base database initialization completed successfully!'