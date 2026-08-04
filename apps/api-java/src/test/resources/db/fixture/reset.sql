-- 픽스처 적용 전 초기화. 컨테이너는 JVM 당 하나라 테스트 간에 상태가 남는다.
--
-- TRUNCATE 가 아니라 DELETE 인 이유: TRUNCATE 는 MySQL 에서 암묵 커밋이라
-- 테스트 트랜잭션 롤백 경계를 깨뜨린다.
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM `wallet_ledger`;
DELETE FROM `user_item`;
DELETE FROM `user_artifact`;
DELETE FROM `account_badge`;
DELETE FROM `point_entry`;
DELETE FROM `account`;
SET FOREIGN_KEY_CHECKS = 1;
