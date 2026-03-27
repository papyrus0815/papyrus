-- DropForeignKey
ALTER TABLE `election_law` DROP FOREIGN KEY `election_law_election_id_fkey`;

-- DropForeignKey
ALTER TABLE `election_law` DROP FOREIGN KEY `election_law_law_id_fkey`;

-- DropTable
DROP TABLE `election_law`;