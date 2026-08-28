CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(100),
    "entityId" VARCHAR(100),
    "oldValue" TEXT,
    "newValue" TEXT,
    "ipAddress" VARCHAR(45),
    "result" VARCHAR(30) NOT NULL DEFAULT 'SUCCESS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "audit_logs_user_id_created_at_idx"
    ON "audit_logs" ("userId", "created_at");

CREATE INDEX IF NOT EXISTS "audit_logs_action_created_at_idx"
    ON "audit_logs" ("action", "created_at");