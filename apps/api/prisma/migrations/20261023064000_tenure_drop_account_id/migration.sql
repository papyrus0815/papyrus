-- 재임의 소유 계정 칸(account_id) 삭제 — 재임의 소유는 인물의 소유다.
-- 이 칸은 쓰기만 하고 읽히지 않았다: 소유 검사는 전부 person.account_id(assertSubResourceOwnership·isOwned),
-- 행정부 소유는 cabinet.account_id(트리거가 수반 인물 계정으로 채운다). 실데이터 69행은 비어 있고 360행은 인물 계정과 같았다.
ALTER TABLE `government_position_tenure` DROP FOREIGN KEY `government_position_tenure_account_id_fkey`;
DROP INDEX `idx_gov_tenure_accountId` ON `government_position_tenure`;
ALTER TABLE `government_position_tenure` DROP COLUMN `account_id`;
