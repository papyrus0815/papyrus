-- DropForeignKey
ALTER TABLE `election` DROP FOREIGN KEY `election_previous_election_id_fkey`;

-- DropIndex
DROP INDEX `idx_election_previousElectionId` ON `election`;

-- AlterTable
ALTER TABLE `election` DROP COLUMN `convocation_label`,
    DROP COLUMN `convocation_scope`,
    DROP COLUMN `legal_framework_notes`,
    DROP COLUMN `previous_election_id`,
    DROP COLUMN `prior_legislature_closure_kind`,
    DROP COLUMN `prior_legislature_dissolution_date`,
    DROP COLUMN `prior_legislature_dissolution_notes`,
    DROP COLUMN `prior_legislature_dissolved`,
    DROP COLUMN `prior_legislature_label`;