-- Migration SQL: rename direction* columns to division* and rename table directions -> divisions
-- Review before applying. Run with: mysql -u root sga_kna_db < rename-direction-to-division.sql

START TRANSACTION;

-- Rename columns on agents
ALTER TABLE `agents` CHANGE `directionId` `divisionId` varchar(191) DEFAULT NULL;
ALTER TABLE `agents` CHANGE `directionNom` `divisionNom` varchar(191) DEFAULT NULL;

-- Rename columns on services
ALTER TABLE `services` CHANGE `directionId` `divisionId` varchar(191) NOT NULL;
ALTER TABLE `services` CHANGE `directionNom` `divisionNom` varchar(191) DEFAULT NULL;

-- Optionally rename the directions table to divisions
-- Uncomment the following line if you want to rename the table itself.
-- RENAME TABLE `directions` TO `divisions`;

COMMIT;

-- End of migration SQL
