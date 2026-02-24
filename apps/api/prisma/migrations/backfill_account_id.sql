-- 기존 데이터에 계정 ID 부여 (한 번만 실행)
-- 계정 ID: cefd971b-2dda-4bc2-80d6-5e7b9a059e4b

SET @account_id = 'cefd971b-2dda-4bc2-80d6-5e7b9a059e4b';

-- 인물: account_id가 비어 있는 행만 해당 계정으로 설정
UPDATE `person`
SET `account_id` = @account_id
WHERE `account_id` IS NULL;

-- 역사적 국가: account_id가 비어 있는 행만 해당 계정으로 설정
UPDATE `historical_country`
SET `account_id` = @account_id
WHERE `account_id` IS NULL;

-- 현대 국가: account_id가 비어 있는 행만 해당 계정으로 설정
UPDATE `country`
SET `account_id` = @account_id
WHERE `account_id` IS NULL;
