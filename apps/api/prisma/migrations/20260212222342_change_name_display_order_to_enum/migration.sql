/*
  Warnings:

  - You are about to alter the column `name_display_order` on the `person` table. The data in that column could be lost. The data in that column will be cast from `VarChar(20)` to `Enum(EnumId(42))`.

*/
-- AlterTable
ALTER TABLE `person` MODIFY `name_display_order` ENUM('korean', 'western') NULL;
