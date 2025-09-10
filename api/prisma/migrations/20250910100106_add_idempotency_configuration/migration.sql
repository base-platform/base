/*
  Warnings:

  - You are about to drop the `ApiEndpoint` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ApiKey` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AuditLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Entity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EntityRecord` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Function` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FunctionExecution` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `IdempotencyKey` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OAuthAccount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RateLimitRule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RefreshToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SystemSetting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."user_role" AS ENUM ('admin', 'user', 'api_user');

-- CreateEnum
CREATE TYPE "public"."api_key_status" AS ENUM ('active', 'revoked', 'expired', 'rotated');

-- CreateEnum
CREATE TYPE "public"."function_runtime" AS ENUM ('javascript', 'python', 'typescript');

-- CreateEnum
CREATE TYPE "public"."execution_status" AS ENUM ('pending', 'running', 'completed', 'failed', 'timeout');

-- DropForeignKey
ALTER TABLE "public"."ApiEndpoint" DROP CONSTRAINT "ApiEndpoint_entityId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ApiKey" DROP CONSTRAINT "ApiKey_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Entity" DROP CONSTRAINT "Entity_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "public"."EntityRecord" DROP CONSTRAINT "EntityRecord_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "public"."EntityRecord" DROP CONSTRAINT "EntityRecord_entityId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Function" DROP CONSTRAINT "Function_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "public"."FunctionExecution" DROP CONSTRAINT "FunctionExecution_functionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."OAuthAccount" DROP CONSTRAINT "OAuthAccount_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RateLimitRule" DROP CONSTRAINT "RateLimitRule_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";

-- DropTable
DROP TABLE "public"."ApiEndpoint";

-- DropTable
DROP TABLE "public"."ApiKey";

-- DropTable
DROP TABLE "public"."AuditLog";

-- DropTable
DROP TABLE "public"."Entity";

-- DropTable
DROP TABLE "public"."EntityRecord";

-- DropTable
DROP TABLE "public"."Function";

-- DropTable
DROP TABLE "public"."FunctionExecution";

-- DropTable
DROP TABLE "public"."IdempotencyKey";

-- DropTable
DROP TABLE "public"."OAuthAccount";

-- DropTable
DROP TABLE "public"."RateLimitRule";

-- DropTable
DROP TABLE "public"."RefreshToken";

-- DropTable
DROP TABLE "public"."SystemSetting";

-- DropTable
DROP TABLE "public"."User";

-- DropEnum
DROP TYPE "public"."ApiKeyStatus";

-- DropEnum
DROP TYPE "public"."UserRole";

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "username" VARCHAR(100),
    "password_hash" VARCHAR(255),
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "role" "public"."user_role" NOT NULL DEFAULT 'user',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "account_locked_until" TIMESTAMP(3),
    "last_failed_login" TIMESTAMP(3),
    "password_changed_at" TIMESTAMP(3),
    "password_history" JSONB,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" VARCHAR(255),
    "mfa_backup_codes" JSONB,
    "mfa_verified_at" TIMESTAMP(3),
    "active_sessions" JSONB,
    "device_tokens" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."oauth_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "provider_user_id" VARCHAR(255) NOT NULL,
    "provider_email" VARCHAR(255),
    "provider_name" VARCHAR(255),
    "provider_avatar" VARCHAR(500),
    "access_token" TEXT,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMP(3),
    "scope" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."refresh_tokens" (
    "id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."api_keys" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "key_hash" VARCHAR(255) NOT NULL,
    "key_prefix" VARCHAR(20) NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "public"."api_key_status" NOT NULL DEFAULT 'active',
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "rate_limit" INTEGER,
    "expires_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "rotated_at" TIMESTAMP(3),
    "rotated_to" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."entities" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "display_name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "schema" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "idempotency_enabled" BOOLEAN NOT NULL DEFAULT false,
    "idempotency_ttl" INTEGER DEFAULT 86400000,
    "idempotency_methods" TEXT[] DEFAULT ARRAY['POST', 'PUT']::TEXT[],
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."entity_records" (
    "id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "data" JSONB NOT NULL,
    "metadata" JSONB,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entity_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."functions" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "code" TEXT NOT NULL,
    "runtime" "public"."function_runtime" NOT NULL DEFAULT 'javascript',
    "timeout" INTEGER NOT NULL DEFAULT 30,
    "memory" INTEGER NOT NULL DEFAULT 128,
    "env_vars" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "functions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."function_executions" (
    "id" UUID NOT NULL,
    "function_id" UUID NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "status" "public"."execution_status" NOT NULL DEFAULT 'pending',
    "duration_ms" INTEGER,
    "memory_used" INTEGER,
    "error" TEXT,
    "executed_by" UUID,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "function_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."api_endpoints" (
    "id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "method" VARCHAR(10) NOT NULL,
    "path" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "rate_limit" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rate_limit_rules" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "pattern" VARCHAR(500) NOT NULL,
    "user_id" UUID,
    "api_key_id" UUID,
    "limit" INTEGER NOT NULL,
    "window_ms" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."idempotency_keys" (
    "id" UUID NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "endpoint" VARCHAR(255) NOT NULL,
    "method" VARCHAR(10) NOT NULL,
    "request" JSONB NOT NULL,
    "response" JSONB,
    "status" VARCHAR(50) NOT NULL,
    "status_code" INTEGER,
    "user_id" UUID,
    "entity_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."idempotency_configs" (
    "id" UUID NOT NULL,
    "endpoint" VARCHAR(255) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "ttl" INTEGER NOT NULL DEFAULT 86400000,
    "methods" TEXT[] DEFAULT ARRAY['POST', 'PUT']::TEXT[],
    "require_key" BOOLEAN NOT NULL DEFAULT false,
    "cleanup_interval" INTEGER NOT NULL DEFAULT 3600000,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" VARCHAR(255),
    "details" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."system_settings" (
    "id" UUID NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "value" JSONB NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."api_usage" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "api_key_id" UUID,
    "endpoint" VARCHAR(500) NOT NULL,
    "method" VARCHAR(10) NOT NULL,
    "status_code" INTEGER NOT NULL,
    "response_time" INTEGER NOT NULL,
    "request_size" INTEGER,
    "response_size" INTEGER,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rate_limit_configs" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "ttl" INTEGER NOT NULL,
    "limit" INTEGER NOT NULL,
    "endpoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "rate_limit_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "public"."users"("username");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "public"."users"("role");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "public"."users"("is_active");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "public"."users"("created_at");

-- CreateIndex
CREATE INDEX "oauth_accounts_user_id_idx" ON "public"."oauth_accounts"("user_id");

-- CreateIndex
CREATE INDEX "oauth_accounts_provider_idx" ON "public"."oauth_accounts"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_accounts_provider_provider_user_id_key" ON "public"."oauth_accounts"("provider", "provider_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "public"."refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "public"."refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "public"."refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "public"."api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_keys_user_id_idx" ON "public"."api_keys"("user_id");

-- CreateIndex
CREATE INDEX "api_keys_key_hash_idx" ON "public"."api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_keys_status_idx" ON "public"."api_keys"("status");

-- CreateIndex
CREATE INDEX "api_keys_expires_at_idx" ON "public"."api_keys"("expires_at");

-- CreateIndex
CREATE INDEX "api_keys_key_prefix_idx" ON "public"."api_keys"("key_prefix");

-- CreateIndex
CREATE UNIQUE INDEX "entities_name_key" ON "public"."entities"("name");

-- CreateIndex
CREATE INDEX "entities_name_idx" ON "public"."entities"("name");

-- CreateIndex
CREATE INDEX "entities_created_by_idx" ON "public"."entities"("created_by");

-- CreateIndex
CREATE INDEX "entities_is_active_idx" ON "public"."entities"("is_active");

-- CreateIndex
CREATE INDEX "entities_created_at_idx" ON "public"."entities"("created_at");

-- CreateIndex
CREATE INDEX "entity_records_entity_id_idx" ON "public"."entity_records"("entity_id");

-- CreateIndex
CREATE INDEX "entity_records_created_by_idx" ON "public"."entity_records"("created_by");

-- CreateIndex
CREATE INDEX "entity_records_created_at_idx" ON "public"."entity_records"("created_at");

-- CreateIndex
CREATE INDEX "entity_records_data_idx" ON "public"."entity_records" USING GIN ("data");

-- CreateIndex
CREATE UNIQUE INDEX "functions_name_key" ON "public"."functions"("name");

-- CreateIndex
CREATE INDEX "functions_name_idx" ON "public"."functions"("name");

-- CreateIndex
CREATE INDEX "functions_created_by_idx" ON "public"."functions"("created_by");

-- CreateIndex
CREATE INDEX "functions_runtime_idx" ON "public"."functions"("runtime");

-- CreateIndex
CREATE INDEX "functions_is_active_idx" ON "public"."functions"("is_active");

-- CreateIndex
CREATE INDEX "function_executions_function_id_idx" ON "public"."function_executions"("function_id");

-- CreateIndex
CREATE INDEX "function_executions_status_idx" ON "public"."function_executions"("status");

-- CreateIndex
CREATE INDEX "function_executions_started_at_idx" ON "public"."function_executions"("started_at");

-- CreateIndex
CREATE INDEX "function_executions_executed_by_idx" ON "public"."function_executions"("executed_by");

-- CreateIndex
CREATE INDEX "api_endpoints_entity_id_idx" ON "public"."api_endpoints"("entity_id");

-- CreateIndex
CREATE INDEX "api_endpoints_method_idx" ON "public"."api_endpoints"("method");

-- CreateIndex
CREATE INDEX "api_endpoints_is_active_idx" ON "public"."api_endpoints"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "api_endpoints_method_path_key" ON "public"."api_endpoints"("method", "path");

-- CreateIndex
CREATE INDEX "rate_limit_rules_user_id_idx" ON "public"."rate_limit_rules"("user_id");

-- CreateIndex
CREATE INDEX "rate_limit_rules_pattern_idx" ON "public"."rate_limit_rules"("pattern");

-- CreateIndex
CREATE INDEX "rate_limit_rules_is_active_idx" ON "public"."rate_limit_rules"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_key_key" ON "public"."idempotency_keys"("key");

-- CreateIndex
CREATE INDEX "idempotency_keys_key_idx" ON "public"."idempotency_keys"("key");

-- CreateIndex
CREATE INDEX "idempotency_keys_expires_at_idx" ON "public"."idempotency_keys"("expires_at");

-- CreateIndex
CREATE INDEX "idempotency_keys_user_id_idx" ON "public"."idempotency_keys"("user_id");

-- CreateIndex
CREATE INDEX "idempotency_keys_endpoint_idx" ON "public"."idempotency_keys"("endpoint");

-- CreateIndex
CREATE INDEX "idempotency_keys_status_idx" ON "public"."idempotency_keys"("status");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_configs_endpoint_key" ON "public"."idempotency_configs"("endpoint");

-- CreateIndex
CREATE INDEX "idempotency_configs_endpoint_idx" ON "public"."idempotency_configs"("endpoint");

-- CreateIndex
CREATE INDEX "idempotency_configs_enabled_idx" ON "public"."idempotency_configs"("enabled");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "public"."audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "public"."audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_idx" ON "public"."audit_logs"("entity_type");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "public"."audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_id_idx" ON "public"."audit_logs"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "public"."system_settings"("key");

-- CreateIndex
CREATE INDEX "system_settings_key_idx" ON "public"."system_settings"("key");

-- CreateIndex
CREATE INDEX "system_settings_category_idx" ON "public"."system_settings"("category");

-- CreateIndex
CREATE INDEX "system_settings_is_active_idx" ON "public"."system_settings"("is_active");

-- CreateIndex
CREATE INDEX "system_settings_is_public_idx" ON "public"."system_settings"("is_public");

-- CreateIndex
CREATE INDEX "api_usage_user_id_idx" ON "public"."api_usage"("user_id");

-- CreateIndex
CREATE INDEX "api_usage_api_key_id_idx" ON "public"."api_usage"("api_key_id");

-- CreateIndex
CREATE INDEX "api_usage_endpoint_idx" ON "public"."api_usage"("endpoint");

-- CreateIndex
CREATE INDEX "api_usage_created_at_idx" ON "public"."api_usage"("created_at");

-- CreateIndex
CREATE INDEX "api_usage_status_code_idx" ON "public"."api_usage"("status_code");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limit_configs_name_key" ON "public"."rate_limit_configs"("name");

-- CreateIndex
CREATE INDEX "rate_limit_configs_name_idx" ON "public"."rate_limit_configs"("name");

-- CreateIndex
CREATE INDEX "rate_limit_configs_is_active_idx" ON "public"."rate_limit_configs"("is_active");

-- CreateIndex
CREATE INDEX "rate_limit_configs_priority_idx" ON "public"."rate_limit_configs"("priority");

-- AddForeignKey
ALTER TABLE "public"."oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."entities" ADD CONSTRAINT "entities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."entity_records" ADD CONSTRAINT "entity_records_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."entity_records" ADD CONSTRAINT "entity_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."functions" ADD CONSTRAINT "functions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."function_executions" ADD CONSTRAINT "function_executions_function_id_fkey" FOREIGN KEY ("function_id") REFERENCES "public"."functions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."function_executions" ADD CONSTRAINT "function_executions_executed_by_fkey" FOREIGN KEY ("executed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."api_endpoints" ADD CONSTRAINT "api_endpoints_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rate_limit_rules" ADD CONSTRAINT "rate_limit_rules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."idempotency_keys" ADD CONSTRAINT "idempotency_keys_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."system_settings" ADD CONSTRAINT "system_settings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."system_settings" ADD CONSTRAINT "system_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."api_usage" ADD CONSTRAINT "api_usage_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rate_limit_configs" ADD CONSTRAINT "rate_limit_configs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rate_limit_configs" ADD CONSTRAINT "rate_limit_configs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
