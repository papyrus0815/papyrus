-- 자동 생성 — 직접 수정하지 말 것. 갱신은 ./tools/capture-golden.sh (골든과 함께 떠야 한다).
--
-- 골든을 뜬 시점의 실 DB 원본 행이다. 골든 대조 테스트의 *입력*이고 기대값은 golden/*.json 이다.
-- 골든에서 거꾸로 시드하면 출력으로 입력을 만드는 순환이 되므로, 여기 값은 응답이 아니라
-- 테이블 행 그대로여야 한다.
--
-- password_hash 는 실값을 넣지 않는다. 파일럿은 로그인을 구현하지 않아 검증에 쓰이지 않고,
-- 저장소가 공개라 해시를 올릴 이유가 없다.

SET FOREIGN_KEY_CHECKS = 0;

INSERT INTO `account` (`id`, `hero_id`, `user_name`, `password_hash`, `created_at`, `grade_code`, `total_points`, `representative_person_id`, `display_name`, `papy_balance`) VALUES
  ('6af53fe7-d02b-4c42-b86c-f32800897b32', NULL, 'admin', '__fixture_not_a_real_hash__', '2026-01-01 00:00:00.000', 'DIAMOND', 7205, NULL, '에디터', 210);

INSERT INTO `wallet_ledger` (`id`, `account_id`, `amount`, `reason`, `idempotency_key`, `reversal_of_id`, `related_item_id`, `actor_account_id`, `created_at`) VALUES
  ('828c038d-e3b0-4002-837b-b42ceeee7c16', '6af53fe7-d02b-4c42-b86c-f32800897b32', 700, 'PROMO_CODE', 'PROMO:PORTFOLIO32116', NULL, NULL, NULL, '2026-07-20 07:21:56.642000'),
  ('647759e0-f12f-4c65-a7c5-2c99b1bc110b', '6af53fe7-d02b-4c42-b86c-f32800897b32', -150, 'CONSUME', 'ARTIFACT:8d490757-dda3-4db9-88ef-a000d4341ef2:79581c61-edba-46f5-adef-723e76d96af6', NULL, '8d490757-dda3-4db9-88ef-a000d4341ef2', NULL, '2026-07-20 07:21:56.667000'),
  ('d6950033-b6df-4f28-a0b3-f1588473e692', '6af53fe7-d02b-4c42-b86c-f32800897b32', -150, 'CONSUME', 'ARTIFACT:cf41c92d-654a-4bda-8770-e55cfe1a89ef:9c2169e6-c0d7-490d-9984-640924d87884', NULL, 'cf41c92d-654a-4bda-8770-e55cfe1a89ef', NULL, '2026-07-20 07:21:56.684000'),
  ('f7deff90-3d58-4819-92d0-da394f7c3544', '6af53fe7-d02b-4c42-b86c-f32800897b32', -70, 'CONSUME', 'ARTIFACT:9f573fff-af73-4ea1-b584-31c7a22b7632:7a0cb161-cad3-4c42-aa69-def6355518e9', NULL, '9f573fff-af73-4ea1-b584-31c7a22b7632', NULL, '2026-07-20 07:21:56.699000'),
  ('38d83cb5-8975-4011-b934-edae25339a68', '6af53fe7-d02b-4c42-b86c-f32800897b32', -80, 'CONSUME', 'ARTIFACT:1e446634-845c-4860-90a4-4576267137b2:bd83efd9-e4cb-4ee3-b016-436879f179b1', NULL, '1e446634-845c-4860-90a4-4576267137b2', NULL, '2026-07-20 07:21:56.713000'),
  ('c55029de-3ac4-4b48-bd7b-5661fef867e0', '6af53fe7-d02b-4c42-b86c-f32800897b32', -40, 'CONSUME', 'ARTIFACT:190ba092-5944-481e-a7d9-218fc1bed815:d3cc1b82-1207-450c-83f0-4df2d2c8897f', NULL, '190ba092-5944-481e-a7d9-218fc1bed815', NULL, '2026-07-20 07:21:56.727000');

SET FOREIGN_KEY_CHECKS = 1;
