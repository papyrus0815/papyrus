-- 데이터베이스가 존재하지 않을 경우에만 'evolution' 데이터베이스를 생성합니다.
CREATE DATABASE IF NOT EXISTS evolution;

-- 'evolution' 사용자가 존재하지 않을 경우에만 생성하고,
-- 인증 방식을 'mysql_native_password'로, 비밀번호를 'evolution'으로 설정합니다.
CREATE USER IF NOT EXISTS 'evolution'@'%' IDENTIFIED WITH 'mysql_native_password' BY 'evolution';

-- ✨ 이 부분을 수정합니다.
-- 기존: 'evolution' 데이터베이스에 대해서만 모든 권한 부여
-- GRANT ALL PRIVILEGES ON evolution.* TO 'evolution'@'%';
-- 변경: 모든 데이터베이스(*.*)에 대해 모든 권한 부여
GRANT ALL PRIVILEGES ON *.* TO 'evolution'@'%';

-- 변경된 권한을 즉시 적용합니다.
FLUSH PRIVILEGES;