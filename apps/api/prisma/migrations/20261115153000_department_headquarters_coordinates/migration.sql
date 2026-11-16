-- 중앙부처·국가기관(AdministrationDepartment) 청사·본부 소재지 대표 좌표(WGS84) 컬럼 추가
-- AlterTable
ALTER TABLE `administration_department` ADD COLUMN `headquarters_latitude` DECIMAL(10, 7) NULL,
    ADD COLUMN `headquarters_longitude` DECIMAL(10, 7) NULL;
