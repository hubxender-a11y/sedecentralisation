-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "postNom" TEXT,
    "prenom" TEXT NOT NULL,
    "dateNaissance" TEXT,
    "sexe" TEXT,
    "nationalite" TEXT DEFAULT 'Congolaise',
    "matricule" TEXT,
    "typeCarte" TEXT,
    "numeroCarte" TEXT,
    "expirationCarte" TEXT,
    "lieuDelivrance" TEXT,
    "directionId" TEXT,
    "directionNom" TEXT,
    "serviceId" TEXT,
    "service" TEXT,
    "fonctionId" TEXT,
    "fonctionNom" TEXT,
    "email" TEXT,
    "telephone" TEXT NOT NULL,
    "districtId" TEXT,
    "villeId" TEXT,
    "communeId" TEXT,
    "avenue" TEXT,
    "code" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "statutPresence" TEXT NOT NULL DEFAULT 'ACTIF',
    "presenceInactiveAt" TIMESTAMP(3),
    "presenceInactiveReason" TEXT,
    "presenceReactivatedAt" TIMESTAMP(3),
    "presenceReactivatedBy" VARCHAR(100),
    "statutPaiement" TEXT DEFAULT 'NON_PAYE',
    "montantPaiement" DOUBLE PRECISION DEFAULT 0,
    "datePaiement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "gradeStat" TEXT,
    "divisionId" VARCHAR(100),
    "divisionNom" VARCHAR(255),
    "dateEngagement" TEXT,
    "acteEngagement" TEXT,
    "remunerer" TEXT DEFAULT 'NON',
    "prime" TEXT DEFAULT 'NON',
    "montantPrime" DOUBLE PRECISION DEFAULT 0,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "divisions" (
    "id" VARCHAR(100) NOT NULL,
    "nom" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "statut" VARCHAR(50) NOT NULL DEFAULT 'ACTIF',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "directionId" VARCHAR(100),
    "directionNom" VARCHAR(255),

    CONSTRAINT "divisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bureaux" (
    "id" VARCHAR(100) NOT NULL,
    "directionId" VARCHAR(100),
    "directionNom" VARCHAR(255),
    "nom" VARCHAR(255) NOT NULL,
    "divisionId" VARCHAR(100),
    "divisionNom" VARCHAR(255),
    "codeService" VARCHAR(100),
    "description" TEXT,
    "chefService" VARCHAR(255),
    "statut" VARCHAR(50) NOT NULL DEFAULT 'ACTIF',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bureaux_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fonctions" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fonctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grades" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "directions" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "directions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presences" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "heure" TIMESTAMP(3) NOT NULL,
    "serviceId" VARCHAR(100),
    "serviceNom" VARCHAR(255),
    "directionId" VARCHAR(100),
    "directionNom" VARCHAR(255),
    "createdBy" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "presences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portal_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_users" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role_id" TEXT,
    "permissions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Actif',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "direction_id" VARCHAR(100),
    "password_reset_required" BOOLEAN NOT NULL DEFAULT false,
    "division_id" VARCHAR(100),
    "division_nom" VARCHAR(255),
    "service_id" VARCHAR(100),
    "service_nom" VARCHAR(255),
    "direction_nom" VARCHAR(255),

    CONSTRAINT "portal_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "directionId" TEXT NOT NULL,
    "directionNom" TEXT,
    "codeService" TEXT,
    "description" TEXT,
    "chefService" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "divisionId" VARCHAR(100),
    "divisionNom" VARCHAR(255),

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT,
    "content" TEXT,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "groupId" TEXT,
    "recipientId" TEXT,
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,
    "attachmentSize" INTEGER,
    "attachmentType" TEXT,
    "readBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bureaux_divisionId_idx" ON "bureaux"("divisionId");

-- CreateIndex
CREATE INDEX "documents_agent_id_idx" ON "documents"("agentId");

-- CreateIndex
CREATE INDEX "presences_date_serviceId_idx" ON "presences"("date", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "presences_agentId_date_key" ON "presences"("agentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "portal_users_email_key" ON "portal_users"("email");

-- CreateIndex
CREATE INDEX "portal_users_role_id_idx" ON "portal_users"("role_id");

-- CreateIndex
CREATE INDEX "chat_messages_senderId_idx" ON "chat_messages"("senderId");

-- AddForeignKey
ALTER TABLE "bureaux" ADD CONSTRAINT "bureaux_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "divisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presences" ADD CONSTRAINT "presences_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_users" ADD CONSTRAINT "portal_users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "portal_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

