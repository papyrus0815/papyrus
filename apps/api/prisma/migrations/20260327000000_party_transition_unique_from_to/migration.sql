-- 동일 (from_party_id, to_party_id) 계보 행은 하나만 허용
CREATE UNIQUE INDEX `uniq_party_transition_from_to` ON `political_party_transition`(`from_party_id`, `to_party_id`);
