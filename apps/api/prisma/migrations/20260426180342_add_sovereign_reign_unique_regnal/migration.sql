/*
  Warnings:

  - A unique constraint covering the columns `[country_id,regnal_name,regnal_number]` on the table `sovereign_reign` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[historical_country_id,regnal_name,regnal_number]` on the table `sovereign_reign` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `sovereign_reign_country_id_regnal_name_regnal_number_key` ON `sovereign_reign`(`country_id`, `regnal_name`, `regnal_number`);

-- CreateIndex
CREATE UNIQUE INDEX `sovereign_reign_historical_country_id_regnal_name_regnal_num_key` ON `sovereign_reign`(`historical_country_id`, `regnal_name`, `regnal_number`);
