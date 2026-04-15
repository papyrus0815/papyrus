-- Remove historical_country_id from person table
-- PersonCountryAffiliation (CITIZENSHIP, priority=0) is the authoritative source
ALTER TABLE `person` DROP FOREIGN KEY `person_historical_country_id_fkey`;
ALTER TABLE `person` DROP COLUMN `historical_country_id`;
