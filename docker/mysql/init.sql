-- ============================================================================
-- Papyrus 프로젝트용 데이터베이스 및 사용자 설정
-- ============================================================================
-- 
-- 이 스크립트는 Docker MySQL 컨테이너 최초 생성 시 자동 실행됩니다.
-- Prisma 마이그레이션을 위해 Shadow Database 생성/삭제 권한이 필요합니다.
--

-- ----------------------------------------------------------------------------
-- 1. 데이터베이스 생성
-- ----------------------------------------------------------------------------

-- 메인 데이터베이스 (실제 데이터 저장)
CREATE DATABASE IF NOT EXISTS papyrus 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- Shadow 데이터베이스 (Prisma 마이그레이션용 임시 DB)
-- 
-- ⚠️ Shadow Database란?
-- Prisma는 마이그레이션을 안전하게 실행하기 위해 임시 데이터베이스를 사용합니다.
-- 
-- 작동 방식:
--   1. 마이그레이션 실행 시 Shadow DB 자동 생성
--   2. Shadow DB에 새로운 스키마 먼저 적용 (테스트)
--   3. 문제 없으면 → 실제 DB(papyrus)에 적용
--   4. 문제 있으면 → 에러 반환, 실제 DB는 안전하게 유지
--   5. 작업 완료 후 Shadow DB 자동 삭제
-- 
-- 왜 필요한가?
--   - SQL 문법 오류 사전 감지
--   - 제약조건 위반 사전 확인
--   - 메인 DB를 손상시키지 않고 안전하게 테스트
--   - 실패 시 롤백 불필요 (메인 DB는 변경되지 않음)
-- 
-- 참고: 이 DB는 마이그레이션할 때만 임시로 생성/삭제되며,
--       영구적인 데이터는 저장되지 않습니다.
CREATE DATABASE IF NOT EXISTS papyrus_shadow 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. 사용자 생성 및 권한 부여
-- ----------------------------------------------------------------------------

-- 기존 사용자가 있다면 삭제 (권한 문제 방지)
DROP USER IF EXISTS 'papyrus'@'%';
DROP USER IF EXISTS 'papyrus'@'localhost';

-- papyrus 사용자 생성 (모든 호스트에서 접근 가능)
CREATE USER 'papyrus'@'%' 
  IDENTIFIED WITH 'mysql_native_password' BY 'papyrus';

-- 모든 데이터베이스에 대한 전체 권한 부여
-- - Prisma는 shadow database를 동적으로 생성/삭제해야 함
-- - CREATE, DROP, ALTER, INDEX, REFERENCES 등 모든 DDL 권한 필요
GRANT ALL PRIVILEGES ON *.* TO 'papyrus'@'%' WITH GRANT OPTION;

-- 명시적으로 필요한 권한 확인 (중복이지만 명확성을 위해)
GRANT CREATE, DROP, ALTER, INDEX, REFERENCES ON *.* TO 'papyrus'@'%';
GRANT CREATE TEMPORARY TABLES ON *.* TO 'papyrus'@'%';

-- 변경된 권한을 메모리에 즉시 적용
FLUSH PRIVILEGES;

-- ----------------------------------------------------------------------------
-- 3. 권한 확인 (로그 출력)
-- ----------------------------------------------------------------------------

-- 생성된 데이터베이스 확인
SELECT '✅ 데이터베이스 생성 완료:' AS '';
SHOW DATABASES LIKE 'papyrus%';

-- 사용자 권한 확인
SELECT '✅ papyrus 사용자 권한:' AS '';
SHOW GRANTS FOR 'papyrus'@'%';


-- ----------------------------------------------------------------------------
-- ✅ 초기화 완료
-- ----------------------------------------------------------------------------