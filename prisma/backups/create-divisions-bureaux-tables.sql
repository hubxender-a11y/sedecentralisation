-- Create clean division and bureau tables for MySQL
-- This migration creates new tables and copies the existing data from the legacy directions/services structure.
-- Run with: mysql -u root -p sga_kna_db < prisma/backups/create-divisions-bureaux-tables.sql

SET NAMES utf8mb4 COLLATE utf8mb4_general_ci;
SET foreign_key_checks = 0;

DROP TABLE IF EXISTS `bureaux`;
DROP TABLE IF EXISTS `divisions`;

CREATE TABLE `divisions` (
  `id` VARCHAR(100) NOT NULL COLLATE utf8mb4_general_ci,
  `nom` VARCHAR(255) NOT NULL COLLATE utf8mb4_general_ci,
  `description` TEXT COLLATE utf8mb4_general_ci,
  `statut` VARCHAR(50) NOT NULL DEFAULT 'ACTIF' COLLATE utf8mb4_general_ci,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `bureaux` (
  `id` VARCHAR(100) NOT NULL COLLATE utf8mb4_general_ci,
  `nom` VARCHAR(255) NOT NULL COLLATE utf8mb4_general_ci,
  `divisionId` VARCHAR(100) NULL COLLATE utf8mb4_general_ci,
  `divisionNom` VARCHAR(255) COLLATE utf8mb4_general_ci,
  `codeService` VARCHAR(100) COLLATE utf8mb4_general_ci,
  `description` TEXT COLLATE utf8mb4_general_ci,
  `chefService` VARCHAR(255) COLLATE utf8mb4_general_ci,
  `statut` VARCHAR(50) NOT NULL DEFAULT 'ACTIF' COLLATE utf8mb4_general_ci,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `bureaux_divisionId_idx` (`divisionId`),
  CONSTRAINT `bureaux_divisionId_fkey` FOREIGN KEY (`divisionId`) REFERENCES `divisions` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET foreign_key_checks = 1;

ALTER TABLE `agents`
  ADD COLUMN IF NOT EXISTS `divisionId` VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS `divisionNom` VARCHAR(255) NULL;

ALTER TABLE `services`
  ADD COLUMN IF NOT EXISTS `divisionId` VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS `divisionNom` VARCHAR(255) NULL;

INSERT INTO `divisions` (`id`, `nom`, `description`, `statut`, `createdAt`)
SELECT `id`, `nom`, `description`, `statut`, `createdAt`
FROM `directions`;

INSERT IGNORE INTO `divisions` (`id`, `nom`, `description`, `statut`, `createdAt`)
SELECT DISTINCT `directionId`,
       COALESCE(`directionNom`, `directionId`),
       NULL,
       'ACTIF',
       CURRENT_TIMESTAMP()
FROM `services`
WHERE `directionId` IS NOT NULL AND `directionId` != '';

INSERT INTO `bureaux` (`id`, `nom`, `divisionId`, `divisionNom`, `codeService`, `description`, `chefService`, `statut`, `createdAt`)
SELECT `id`, `nom`, `directionId`, `directionNom`, `codeService`, `description`, `chefService`, `statut`, `createdAt`
FROM `services`;

UPDATE `agents`
SET `divisionId` = COALESCE(`divisionId`, `directionId`),
    `divisionNom` = COALESCE(`divisionNom`, `directionNom`)
WHERE `divisionId` IS NULL OR `divisionNom` IS NULL;

UPDATE `services`
SET `divisionId` = COALESCE(`divisionId`, `directionId`),
    `divisionNom` = COALESCE(`divisionNom`, `directionNom`)
WHERE `divisionId` IS NULL OR `divisionNom` IS NULL;

COMMIT;
