-- SIGAD: additive migration for agent assignments and administrative movements.
-- Safe to run more than once. Existing agent data is preserved.

CREATE TABLE IF NOT EXISTS "agent_assignments" (
  "id" TEXT PRIMARY KEY,
  "agentId" TEXT NOT NULL,
  "previousDirectionId" VARCHAR(100),
  "previousDirectionName" VARCHAR(255),
  "previousDivisionId" VARCHAR(100),
  "previousDivisionName" VARCHAR(255),
  "previousServiceId" VARCHAR(100),
  "previousServiceName" VARCHAR(255),
  "newDirectionId" VARCHAR(100),
  "newDirectionName" VARCHAR(255),
  "newDivisionId" VARCHAR(100),
  "newDivisionName" VARCHAR(255),
  "newServiceId" VARCHAR(100),
  "newServiceName" VARCHAR(255),
  "functionId" TEXT,
  "functionName" TEXT,
  "province" TEXT,
  "city" TEXT,
  "commune" TEXT,
  "effectiveDate" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "documentReference" VARCHAR(255),
  "responsibleUserId" VARCHAR(100),
  "status" VARCHAR(50) NOT NULL DEFAULT 'BROUILLON',
  "observations" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_assignments_agentId_fkey"
    FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "agent_assignments_agentId_effectiveDate_idx"
  ON "agent_assignments" ("agentId", "effectiveDate");
CREATE INDEX IF NOT EXISTS "agent_assignments_status_idx"
  ON "agent_assignments" ("status");

CREATE TABLE IF NOT EXISTS "agent_movements" (
  "id" TEXT PRIMARY KEY,
  "agentId" TEXT NOT NULL,
  "type" VARCHAR(50) NOT NULL,
  "previousSituation" TEXT,
  "newSituation" TEXT,
  "movementDate" TIMESTAMP(3) NOT NULL,
  "reference" VARCHAR(255),
  "documentUrl" TEXT,
  "userId" VARCHAR(100),
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_movements_agentId_fkey"
    FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "agent_movements_agentId_movementDate_idx"
  ON "agent_movements" ("agentId", "movementDate");
CREATE INDEX IF NOT EXISTS "agent_movements_type_idx"
  ON "agent_movements" ("type");
