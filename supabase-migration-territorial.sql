CREATE TABLE IF NOT EXISTS "provinces" (
    "id" VARCHAR(100) NOT NULL,
    "nom" VARCHAR(255) NOT NULL,
    "statut" VARCHAR(50) NOT NULL DEFAULT 'ACTIF',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "provinces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "villes" (
    "id" VARCHAR(100) NOT NULL,
    "nom" VARCHAR(255) NOT NULL,
    "provinceId" VARCHAR(100) NOT NULL,
    "statut" VARCHAR(50) NOT NULL DEFAULT 'ACTIF',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "villes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "villes_province_id_fkey" FOREIGN KEY ("provinceId") REFERENCES "provinces"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "communes" (
    "id" VARCHAR(100) NOT NULL,
    "nom" VARCHAR(255) NOT NULL,
    "villeId" VARCHAR(100) NOT NULL,
    "statut" VARCHAR(50) NOT NULL DEFAULT 'ACTIF',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "communes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "communes_ville_id_fkey" FOREIGN KEY ("villeId") REFERENCES "villes"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "provinces_statut_idx" ON "provinces" ("statut");
CREATE INDEX IF NOT EXISTS "villes_province_id_idx" ON "villes" ("provinceId");
CREATE INDEX IF NOT EXISTS "villes_statut_idx" ON "villes" ("statut");
CREATE INDEX IF NOT EXISTS "communes_ville_id_idx" ON "communes" ("villeId");
CREATE INDEX IF NOT EXISTS "communes_statut_idx" ON "communes" ("statut");