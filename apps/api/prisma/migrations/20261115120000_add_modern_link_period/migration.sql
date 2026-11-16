-- 현대 국가 연결 기간 — 같은 나라가 땅을 옮긴 경우(중화민국: 중국 1912~1949 / 대만 1945~).
-- 전부 NULL 허용: 비우면 그 나라의 존속 기간 전체로 본다(기존 행 무변경).
-- AlterTable
ALTER TABLE `historical_country_modern_country` ADD COLUMN `end_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `end_month` INTEGER NULL,
    ADD COLUMN `end_year` INTEGER NULL,
    ADD COLUMN `start_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `start_month` INTEGER NULL,
    ADD COLUMN `start_year` INTEGER NULL;
