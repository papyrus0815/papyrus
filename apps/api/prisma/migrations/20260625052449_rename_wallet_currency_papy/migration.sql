-- 가상화폐 명칭을 프로젝트 테마(파피/Papy)로 통일하는 컬럼 리네임.
-- drop+add 대신 데이터 보존 RENAME(MySQL CHANGE COLUMN)으로 처리.

-- RenameColumn
ALTER TABLE `account` CHANGE COLUMN `dotori_balance` `papy_balance` INTEGER NOT NULL DEFAULT 0;

-- RenameColumn
ALTER TABLE `shop_item` CHANGE COLUMN `price_dotori` `price_papy` INTEGER NOT NULL;

-- RenameColumn
ALTER TABLE `promo_code` CHANGE COLUMN `dotori_amount` `papy_amount` INTEGER NOT NULL;
