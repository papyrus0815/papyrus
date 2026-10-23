-- 재임 권한 근원(mandate_source) 삭제 — 취임 방식은 appointment_method 하나로.
-- 두 칸이 같은 사실을 다른 굵기로 적고 있었다: 429행 중 410행이 UNKNOWN이고, 값이 있던 19행
-- (APPOINTMENT 18 · ELECTION 1)은 모두 appointment_method(APPOINTMENT · INDIRECT_ELECTION)와 일치했다.
-- 선거로 생긴 임기는 election_candidacy_id 연결이 정본이다.
DROP INDEX `idx_gov_tenure_mandateSource` ON `government_position_tenure`;
ALTER TABLE `government_position_tenure` DROP COLUMN `mandate_source`;
