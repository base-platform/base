# Base Infrastructure

Docker Compose setup for PostgreSQL 17 and Valkey databases with management scripts.

## Quick Start

```bash
# Start databases
make up

# Check status
make status

# View logs
make logs

# Stop databases
make down
```

## Services

### PostgreSQL 17
- **Port**: 5432
- **Database**: basedb
- **Username**: postgres
- **Password**: postgres123
- **Connection URL**: `postgresql://postgres:postgres123@localhost:5432/basedb`

### Valkey (Redis-compatible)
- **Port**: 6379
- **Password**: redis123
- **Connection URL**: `redis://localhost:6379/0`

## Available Commands

Run `make help` to see all available commands:

### Database Operations
- `make up` - Start all database services
- `make down` - Stop all services
- `make restart` - Restart database services
- `make status` - Show service status and health
- `make logs` - Show logs for all services

### Admin Interfaces (Optional)
- `make admin` - Start PGAdmin and Valkey Commander
- `make stop-admin` - Stop admin interfaces

**Admin URLs** (when started):
- PGAdmin: http://localhost:5050 (admin@example.com / admin123)
- Valkey Commander: http://localhost:8081 (admin / admin123)

### Database Access
- `make connect-postgres` - Connect via psql
- `make connect-redis` - Connect via valkey-cli

### Data Management
- `make backup` - Create database backups
- `make restore-postgres FILE=backup.sql` - Restore PostgreSQL
- `make seed` - Run seed scripts from ./seeds/ directory

### Maintenance
- `make reset` - Reset all data (WARNING: Deletes everything)
- `make clean` - Clean up Docker resources
- `make update` - Pull latest database images

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
```

### Database Initialization

- **PostgreSQL**: Scripts in `./init-scripts/` run on first startup
- **Seeds**: Place SQL files in `./seeds/` and run `make seed`

### Configuration Files

- **PostgreSQL**: `./postgres-config/postgresql.conf`
- **Redis**: `./redis-config/redis.conf`

## Directory Structure

```
infrastructure/
├── docker-compose.yml          # Main compose file
├── Makefile                    # Management commands
├── .env                        # Environment variables
├── .env.example               # Environment template
├── README.md                  # This file
├── init-scripts/              # PostgreSQL initialization
│   └── 01-init-database.sql
├── postgres-config/           # PostgreSQL configuration
│   └── postgresql.conf
├── redis-config/              # Redis configuration
│   └── redis.conf
├── backups/                   # Database backups (created)
└── seeds/                     # Seed scripts (optional)
```

## Integration with Applications

### API Server Setup

1. **Configure environment variables** in `../api/.env`:
   ```bash
   DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/basedb"
   REDIS_URL="redis://:redis123@localhost:6379/0"
   JWT_SECRET="your-secret-key-here"
   JWT_EXPIRES_IN="15m"
   JWT_REFRESH_EXPIRES_IN="7d"
   API_PORT=3001
   ```

2. **Run database migrations**:
   ```bash
   cd ../api
   npm install
   npx prisma migrate deploy
   npx prisma generate
   ```

3. **Start the API server**:
   ```bash
   npm run start:dev
   ```
   
   The API will be available at http://localhost:3001

### Admin UI Setup

1. **Navigate to admin UI directory**:
   ```bash
   cd ../admin-ui
   ```

2. **Install dependencies and start**:
   ```bash
   npm install
   npm run dev
   ```
   
   The admin UI will be available at http://localhost:3000

### Database Migration Commands

```bash
# Deploy existing migrations
npx prisma migrate deploy

# Create new migration
npx prisma migrate dev --name "your_migration_name"

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset --force

# Generate Prisma client after schema changes
npx prisma generate

# Sync schema with database (alternative to migrations)
npx prisma db push

# View database in browser
npx prisma studio
```

### Sample Data Management

The API includes scripts to manage sample data for development and testing:

```bash
# Create comprehensive sample data (recommended for development)
npm run db:sample

# Delete all sample data
npm run db:sample:delete

# Run seed script (if available)
npm run db:seed

# Reset entire database and recreate
npm run db:reset
```

**What's included in sample data:**
- 19 users with comprehensive roles and scenarios:
  - **Admin users** (3): Primary admin, secondary admin, MFA-enabled admin
  - **API users** (5): Standard API user, service accounts, webhook services
  - **Regular users** (11): Active users, test accounts, edge cases
  - **Problem scenarios**: Inactive users, locked accounts, suspended users, unverified emails
  - **Bulk test users**: Random generated users for testing
- 3 entity types (Contact, Task, Event) with JSON schemas
- 33 entity records across all types
- 3 API keys for testing API access
- 2 sample functions (validate-email, slugify)

**Comprehensive User Scenarios:**
- **Primary scenarios**: Core admin, API, and regular user accounts
- **Admin scenarios**: Multiple admin users with different configurations
- **API scenarios**: Service accounts for different integration patterns
- **Problem scenarios**: Users with various issues (inactive, locked, unverified)
- **Edge cases**: Long-time users, demo accounts, testing scenarios

**Default sample credentials:**
- All sample users have password: `password123`
- Key test accounts:
  - `admin@example.com` (admin) - Primary administrator
  - `api-user@example.com` (api_user) - API integration user
  - `user@example.com` (user) - Standard user
  - `manager@example.com` (admin) - Secondary admin
  - `super-admin@example.com` (admin) - MFA-enabled admin
  - `service@example.com` (api_user) - Service account
  - `webhook@example.com` (api_user) - Webhook service
  - `inactive@example.com` (user) - Deactivated account
  - `locked@example.com` (user) - Account with failed logins
  - `unverified@example.com` (user) - Pending email verification
  - `test@example.com` (user) - Testing account
  - `demo@example.com` (user) - Demo account

## Development Workflow

### Complete Setup from Scratch

```bash
# 1. Start database infrastructure
cd infrastructure
make up

# 2. Wait for databases to initialize (check status)
make status

# 3. Set up and start API server
cd ../api
npm install
npx prisma migrate deploy
npx prisma db push
npm run db:sample
npm run start:dev &

# 4. Set up and start admin UI (in another terminal)
cd ../admin-ui
npm install
npm run dev &

# 5. Optional: Start admin interfaces
cd ../infrastructure
make admin
```

### Daily Development Workflow

1. **Start infrastructure** (if not already running):
   ```bash
   cd infrastructure
   make up
   ```

2. **Check everything is running**:
   ```bash
   make status
   ```

3. **Start your applications**:
   ```bash
   # API Server (Terminal 1)
   cd api && npm run start:dev
   
   # Admin UI (Terminal 2)
   cd admin-ui && npm run dev
   ```

4. **Access your applications**:
   - API: http://localhost:3001
   - Admin UI: http://localhost:3000
   - PGAdmin (if started): http://localhost:5050
   - Valkey Commander (if started): http://localhost:8081

5. **When done**:
   ```bash
   cd infrastructure
   make down
   ```

## Backup Strategy

### Automatic Backups
```bash
# Create timestamped backups
make backup
```

### Restore from Backup
```bash
# Restore PostgreSQL
make restore-postgres FILE=./backups/postgres-20241201_120000.sql
```

## Troubleshooting

### Database Connection Issues

1. **Check if databases are running**:
   ```bash
   make status
   ```

2. **Check database health**:
   ```bash
   make health
   ```

3. **If databases aren't starting**:
   ```bash
   # Check logs for errors
   make logs-postgres
   
   # Reset with clean slate
   make down
   docker volume rm base_postgres_data base_valkey_data 2>/dev/null || true
   make up
   ```

### Migration Issues

1. **Database connection errors during migration**:
   ```bash
   # Ensure database is running first
   cd ../infrastructure && make status
   
   # Then run migrations
   cd ../api && npx prisma migrate deploy
   ```

2. **Reset migrations** (WARNING: Deletes all data):
   ```bash
   cd ../api
   npx prisma migrate reset --force
   npx prisma migrate deploy
   ```

3. **Prisma client issues**:
   ```bash
   # Regenerate client
   npx prisma generate
   
   # If still issues, clear node_modules
   rm -rf node_modules package-lock.json
   npm install
   npx prisma generate
   ```

### Sample Data Issues

1. **Duplicate data errors**:
   ```bash
   # Delete existing sample data first
   npm run db:sample:delete
   
   # Then create fresh sample data
   npm run db:sample
   ```

2. **Schema out of sync**:
   ```bash
   # Push schema changes to database
   npx prisma db push
   
   # Then recreate sample data
   npm run db:sample:delete
   npm run db:sample
   ```

3. **Complete data reset** (WARNING: Deletes everything):
   ```bash
   # Option 1: Use API script
   npm run db:reset
   
   # Option 2: Reset infrastructure
   cd ../infrastructure
   make reset
   make up
   cd ../api
   npx prisma migrate deploy
   npm run db:sample
   ```

### API Server Issues

1. **Port conflicts**:
   ```bash
   # Check what's using port 3001
   lsof -i :3001
   
   # Kill process if needed
   kill -9 <PID>
   ```

2. **TypeScript compilation errors**:
   ```bash
   # Clear built files and restart
   rm -rf dist/
   npm run start:dev
   ```

### General Debugging

1. **View all service logs**:
   ```bash
   make logs
   ```

2. **Check specific service logs**:
   ```bash
   make logs-postgres
   make logs-valkey
   ```

3. **Network issues**:
   ```bash
   make network
   ```

4. **Complete reset** (WARNING: Deletes all data):
   ```bash
   make reset
   ```

### Environment Issues

1. **Verify .env files exist**:
   ```bash
   # Infrastructure
   ls infrastructure/.env
   
   # API
   ls api/.env
   ```

2. **Check environment variables**:
   ```bash
   cd api
   node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL)"
   ```

## Security Notes

- Default passwords are for development only
- Change passwords in production
- Valkey requires authentication
- PostgreSQL is configured for development (not production-ready)

## Production Considerations

For production deployment:

1. Update passwords and use secrets management
2. Configure SSL/TLS
3. Set up proper logging and monitoring
4. Configure backup automation
5. Review security settings in config files
6. Use external volumes for data persistence