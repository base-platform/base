-- CreateTable
CREATE TABLE "public"."nonces" (
    "id" UUID NOT NULL,
    "nonce" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "user_id" UUID,
    "token_jti" VARCHAR(255),
    "endpoint" VARCHAR(255),
    "method" VARCHAR(10),
    "used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nonces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."nonce_configs" (
    "id" UUID NOT NULL,
    "entity_id" UUID,
    "endpoint" VARCHAR(255),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "ttl" INTEGER NOT NULL DEFAULT 300000,
    "methods" TEXT[] DEFAULT ARRAY['POST', 'PUT', 'DELETE']::TEXT[],
    "require_signature" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nonce_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nonces_nonce_key" ON "public"."nonces"("nonce");

-- CreateIndex
CREATE INDEX "nonces_nonce_idx" ON "public"."nonces"("nonce");

-- CreateIndex
CREATE INDEX "nonces_expires_at_idx" ON "public"."nonces"("expires_at");

-- CreateIndex
CREATE INDEX "nonces_user_id_idx" ON "public"."nonces"("user_id");

-- CreateIndex
CREATE INDEX "nonces_token_jti_idx" ON "public"."nonces"("token_jti");

-- CreateIndex
CREATE INDEX "nonce_configs_entity_id_idx" ON "public"."nonce_configs"("entity_id");

-- CreateIndex
CREATE INDEX "nonce_configs_enabled_idx" ON "public"."nonce_configs"("enabled");

-- CreateIndex
CREATE INDEX "nonce_configs_priority_idx" ON "public"."nonce_configs"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "nonce_configs_entity_id_key" ON "public"."nonce_configs"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "nonce_configs_endpoint_key" ON "public"."nonce_configs"("endpoint");

-- AddForeignKey
ALTER TABLE "public"."nonces" ADD CONSTRAINT "nonces_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nonce_configs" ADD CONSTRAINT "nonce_configs_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
