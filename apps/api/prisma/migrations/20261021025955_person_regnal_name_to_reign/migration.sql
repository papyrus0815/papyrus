-- 인물 왕호 칸(person.regnal_name) 제거 — 왕호는 사람이 아니라 재위의 속성(제임스 6세/1세처럼 재위마다 다르다).
-- 113행의 행선지(검토 2026-10-20):
--   · 대수 접미사('1세', '2세 (평화왕)')·이미 재위 왕호에 있는 값 → 버림
--   · 원어 이름('Umberto I', 'Nicholas') → person.original_name에 이미 있음. 대신 비어 있던 재위 왕호를 한국어로 채움
--     (대수는 원어 이름의 로마 숫자·재위 연도로 확정 — 밀란 오브레노비치는 공(1868)=4세, 왕(1882)=1세)
--   · 직위('쇼군', '여왕', '왕비', '공비', '기이번 11대 번주') → 재임 기록과 중복이라 버림
--   · 별호('철공') → 별칭 EPITHET, 궁호·관명('가즈노미야 내친왕', '오미사노카타', '코즈케노스케') → 별칭 COURT_TITLE(신설)

-- 1) 별칭 유형에 궁호·관명 추가
ALTER TABLE `person_nickname` MODIFY `type` ENUM('EPITHET', 'PET_NAME', 'HONORIFIC', 'PEJORATIVE', 'BIRTH_NAME', 'CHILDHOOD_NAME', 'COURTESY_NAME', 'ART_NAME', 'PEN_NAME', 'POSTHUMOUS_NAME', 'TEMPLE_NAME', 'COURT_TITLE', 'PSEUDONYM', 'OTHER') NULL;

-- 2) 비어 있던 재위 왕호 채우기 + 별칭으로 옮기기
UPDATE `government_position_tenure` SET `regnal_name` = '프리드리히 3세' WHERE `id` = '07476ac0-1cf1-4e76-957e-c3a982383f38' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '카를로 알베르토' WHERE `id` = '0905508a-4a60-4891-a777-cedd6e43faa8' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '비토리오 아메데오 2세' WHERE `id` = '09e33ae5-060e-4dda-a1c5-d63596d6fa62' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '비토리오 아메데오 3세' WHERE `id` = '163acafd-9024-42e3-95c0-ce1489cb803a' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '메이지' WHERE `id` = '2159c221-b52d-42e7-be78-870761c15a1f' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '움베르토 2세' WHERE `id` = '2b9b418b-7c9e-41d0-b3f7-dd66053120da' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '밀란 4세' WHERE `id` = '3b9c26fe-ffe0-4232-9fb9-ec554babc8f7' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '움베르토 1세' WHERE `id` = '4c2a6a69-2444-4139-8ee3-918916468b86' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '비토리오 에마누엘레 2세' WHERE `id` = '4fce571c-80e1-4fa9-b792-c97503e543fc' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '페타르 1세' WHERE `id` = '564679f2-3145-4bc5-bfde-4d620d169143' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '페타르 1세' WHERE `id` = '565afcff-fdf3-46db-a99d-7cb13b3dae45' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '다이쇼' WHERE `id` = '5b13dc29-a256-4119-a52b-a74f619a0f1c' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '빌헬름 1세' WHERE `id` = '64ea4837-975a-43a9-882a-4c4661d244ee' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '빅토리아' WHERE `id` = '6856163e-55cb-4163-a7c6-4589a95e2ed6' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '안나' WHERE `id` = '69140b0f-5787-4bf6-99d1-ef8eea939ddc' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '미하일로 3세' WHERE `id` = '6ed747b8-7d6e-438f-87dc-2c007debf6ac' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '프리드리히 3세' WHERE `id` = '6fdfb440-390d-49df-9b60-f5cb26d5289d' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '비토리오 에마누엘레 1세' WHERE `id` = '71e86a80-c477-476f-a53b-003d986fcdc4' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '미하일로 3세' WHERE `id` = '738d1813-4f64-4164-8f7b-d2dcf8778f90' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '빌헬름 1세' WHERE `id` = '78c5ee96-cc74-4471-a90f-b83c0333fe3c' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '표트르 2세' WHERE `id` = '7980af4d-9057-4ae1-a3b7-cc74c1eb06c4' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '알렉산다르' WHERE `id` = '8c66c794-adcc-4032-8284-7bfd5c4a1d50' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '빌헬름 2세' WHERE `id` = '8d24d1b1-e16e-4e18-97a2-221ba5b22292' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '밀로시 1세' WHERE `id` = 'a15adaca-b66c-4d7e-a69c-8234cf813692' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '카를로 펠리체' WHERE `id` = 'a268cc9d-4747-42ce-bab4-f65c761c2ae7' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '밀란 1세' WHERE `id` = 'a54723c6-e332-45b9-887a-f3a29a32fb85' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '에른스트 1세' WHERE `id` = 'ac03f745-7972-436f-8cb0-6d6be6f2aa68' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '알렉산다르 1세' WHERE `id` = 'b6246ddf-c39c-4c17-a909-196c83625aff' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '밀로시 1세' WHERE `id` = 'b87bb411-991d-4ca6-8560-d8e2bae380c2' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '빌헬름 1세' WHERE `id` = 'c10f4b40-484b-48ac-865a-5a0dac7aa4ee' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '밀란 2세' WHERE `id` = 'c4116663-fa97-48e8-bfaf-2cc12be266e7' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '니콜라이 1세' WHERE `id` = 'c71d2e0b-f2e1-4d7c-99da-e6abbef19416' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '비토리오 에마누엘레 3세' WHERE `id` = 'd7724019-2c81-4de4-a5c6-68063d985c1b' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '비토리오 에마누엘레 2세' WHERE `id` = 'd8f98fb0-4a1b-4692-8c63-4d05b25a9d98' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '이반 6세' WHERE `id` = 'da29e39b-1942-4913-91d1-08c48796a7de' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '빌헬름 2세' WHERE `id` = 'df21141a-bf60-4f14-817a-4008b6ad4221' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '카를로 에마누엘레 4세' WHERE `id` = 'e878bc0a-a1a5-4787-9290-53200c508251' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '카를로 에마누엘레 3세' WHERE `id` = 'edb31da4-25e0-4675-9eb7-1aee3ec3879c' AND `regnal_name` IS NULL;
INSERT INTO `person_nickname` (`id`, `person_id`, `nickname`, `type`, `priority`, `reason`, `created_at`, `updated_at`) VALUES (UUID(), '2d3182d8-14ac-4bce-80eb-49458464e532', '코즈케노스케', 'COURT_TITLE', 0, '인물 왕호 칸 제거 때 옮김', NOW(3), NOW(3));
INSERT INTO `person_nickname` (`id`, `person_id`, `nickname`, `type`, `priority`, `reason`, `created_at`, `updated_at`) VALUES (UUID(), '3ee36dcc-79e1-4d75-82b0-23c7d2babc2c', '가즈노미야 내친왕', 'COURT_TITLE', 0, '인물 왕호 칸 제거 때 옮김', NOW(3), NOW(3));
INSERT INTO `person_nickname` (`id`, `person_id`, `nickname`, `type`, `priority`, `reason`, `created_at`, `updated_at`) VALUES (UUID(), '922e7eae-e942-4d5a-8d42-0ff4f9199122', '철공', 'EPITHET', 0, '인물 왕호 칸 제거 때 옮김', NOW(3), NOW(3));
INSERT INTO `person_nickname` (`id`, `person_id`, `nickname`, `type`, `priority`, `reason`, `created_at`, `updated_at`) VALUES (UUID(), 'e25c8c45-099e-497f-a292-c50ff6e05924', '오미사노카타', 'COURT_TITLE', 0, '인물 왕호 칸 제거 때 옮김', NOW(3), NOW(3));

-- 3) 인물 왕호 칸 삭제
ALTER TABLE `person` DROP COLUMN `regnal_name`;
