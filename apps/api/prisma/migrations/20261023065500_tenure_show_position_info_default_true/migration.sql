-- '사건 화면에 직책 표시' 기본값을 true로 — 다른 경력 테이블·API·등록 폼이 모두 true인데 재임 테이블만 false였다.
-- 그래서 API를 거치지 않은 시드 재임 358행이 전부 꺼져, 사건 페이지의 '사건 당시 국가원수' 조회에서 빠졌다
-- (국가원수 140·정부수반 56 포함). 시드가 이 칸을 false로 명시한 곳은 0곳 — 전부 칸 기본값이었다.
ALTER TABLE `government_position_tenure` MODIFY `show_position_info` BOOLEAN NOT NULL DEFAULT true;
UPDATE `government_position_tenure` SET `show_position_info` = true WHERE `show_position_info` = false;
