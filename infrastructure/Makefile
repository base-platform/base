# Base Infrastructure Management Makefile
# Manages PostgreSQL 17 and Valkey databases via Docker Compose

.PHONY: help up down restart status logs clean reset backup restore health admin stop-admin

# Default target
help: ## Show this help message
	@echo "Base Infrastructure Management Commands:"
	@echo ""
	@egrep -h '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Environment setup
setup: ## Copy .env.example to .env if it doesn't exist
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "Created .env file from .env.example"; \
		echo "Please review and update the configuration in .env"; \
	else \
		echo ".env file already exists"; \
	fi

# Database operations
up: setup ## Start all database services
	@echo "Starting PostgreSQL 17 and Valkey (Redis-compatible)..."
	docker compose up -d postgres valkey
	@echo "Databases started. Use 'make status' to check health."

down: ## Stop all services
	@echo "Stopping all services..."
	docker compose down

restart: ## Restart all database services
	@echo "Restarting database services..."
	docker compose restart postgres valkey

stop: ## Stop database services without removing containers
	@echo "Stopping database services..."
	docker compose stop postgres valkey

# Service status and monitoring
status: ## Show status of all services
	@echo "Service Status:"
	@docker compose ps
	@echo ""
	@echo "Health Checks:"
	@docker compose exec postgres pg_isready -U postgres -d basedb 2>/dev/null && echo "✓ PostgreSQL: Ready" || echo "✗ PostgreSQL: Not Ready"
	@docker compose exec valkey valkey-cli -a redis123 ping 2>/dev/null | grep -q PONG && echo "✓ Valkey: Ready" || echo "✗ Valkey: Not Ready"

health: ## Check health of database services
	@echo "Checking database health..."
	@docker compose exec postgres pg_isready -U postgres -d basedb
	@docker compose exec valkey valkey-cli -a redis123 ping

logs: ## Show logs for all services
	docker compose logs -f

logs-postgres: ## Show PostgreSQL logs
	docker compose logs -f postgres

logs-valkey: ## Show Valkey logs
	docker compose logs -f valkey

# Admin interfaces
admin: ## Start admin interfaces (PGAdmin + Redis Commander)
	@echo "Starting admin interfaces..."
	docker compose --profile admin up -d pgadmin redis-commander
	@echo ""
	@echo "Admin interfaces started:"
	@echo "  PGAdmin: http://localhost:5050"
	@echo "  Redis Commander: http://localhost:8081"

stop-admin: ## Stop admin interfaces
	@echo "Stopping admin interfaces..."
	docker compose stop pgadmin redis-commander

# Database management
connect-postgres: ## Connect to PostgreSQL via psql
	docker compose exec postgres psql -U postgres -d basedb

connect-redis: ## Connect to Valkey via valkey-cli
	docker compose exec valkey valkey-cli -a redis123

# Data management
backup: ## Create database backups
	@echo "Creating database backups..."
	@mkdir -p ./backups
	@echo "Backing up PostgreSQL..."
	docker compose exec -T postgres pg_dump -U postgres basedb > ./backups/postgres-$(shell date +%Y%m%d_%H%M%S).sql
	@echo "Backing up Valkey..."
	docker compose exec valkey valkey-cli -a redis123 --rdb ./backups/valkey-$(shell date +%Y%m%d_%H%M%S).rdb
	@echo "Backups completed in ./backups/"

restore-postgres: ## Restore PostgreSQL from backup (Usage: make restore-postgres FILE=backup.sql)
	@if [ -z "$(FILE)" ]; then \
		echo "Usage: make restore-postgres FILE=backup.sql"; \
		exit 1; \
	fi
	@if [ ! -f "$(FILE)" ]; then \
		echo "Backup file $(FILE) not found"; \
		exit 1; \
	fi
	@echo "Restoring PostgreSQL from $(FILE)..."
	docker compose exec -T postgres psql -U postgres -d basedb < $(FILE)

# Reset and cleanup
reset: ## Reset all data (WARNING: This will delete all data)
	@echo "⚠️  WARNING: This will delete ALL database data!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "Resetting databases..."; \
		docker compose down -v; \
		docker volume rm base_postgres_data base_valkey_data base_pgadmin_data 2>/dev/null || true; \
		echo "All data has been reset. Run 'make up' to restart."; \
	else \
		echo "Reset cancelled."; \
	fi

clean: ## Clean up stopped containers and unused images
	@echo "Cleaning up Docker resources..."
	docker compose down --remove-orphans
	docker system prune -f --volumes
	@echo "Cleanup completed."

# Development helpers
seed: ## Run database seed scripts (if any)
	@if [ -d "./seeds" ]; then \
		echo "Running seed scripts..."; \
		for file in ./seeds/*.sql; do \
			if [ -f "$$file" ]; then \
				echo "Running $$file..."; \
				docker compose exec -T postgres psql -U postgres -d basedb < "$$file"; \
			fi; \
		done; \
		echo "Seed scripts completed."; \
	else \
		echo "No seed scripts found in ./seeds/ directory"; \
	fi

migrate: ## Apply database migrations (requires connection from external app)
	@echo "Migration command should be run from your application directory."
	@echo "Example database URLs:"
	@echo "  PostgreSQL: postgresql://postgres:postgres123@localhost:5432/basedb"
	@echo "  Redis: redis://localhost:6379/0 (password: redis123)"

# Network and debugging
inspect: ## Show detailed container information
	@echo "PostgreSQL Container Info:"
	@docker inspect base_postgres | grep -A 20 '"Config"'
	@echo ""
	@echo "Valkey Container Info:"
	@docker inspect base_valkey | grep -A 20 '"Config"'

network: ## Show network information
	docker network ls | grep base
	docker network inspect base_network

# Maintenance
update: ## Pull latest database images
	@echo "Updating database images..."
	docker compose pull postgres valkey
	@echo "Images updated. Run 'make restart' to use new versions."

info: ## Show database connection information
	@echo "Database Connection Information:"
	@echo "================================"
	@echo "PostgreSQL 17:"
	@echo "  Host: localhost"
	@echo "  Port: 5432"
	@echo "  Database: basedb"
	@echo "  Username: postgres"
	@echo "  Password: postgres123"
	@echo "  URL: postgresql://postgres:postgres123@localhost:5432/basedb"
	@echo ""
	@echo "Valkey (Redis-compatible):"
	@echo "  Host: localhost" 
	@echo "  Port: 6379"
	@echo "  Password: redis123"
	@echo "  URL: redis://localhost:6379/0"
	@echo ""
	@echo "Admin Interfaces (when started with 'make admin'):"
	@echo "  PGAdmin: http://localhost:5050 (admin@example.com / admin123)"
	@echo "  Redis Commander: http://localhost:8081 (admin / admin123)"