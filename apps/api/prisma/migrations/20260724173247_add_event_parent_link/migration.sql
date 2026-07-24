-- 사건 추가 상위 링크(다중 부모 DAG 엣지) — docs/event-multi-parent-review.md §4.1/§4.3
-- 기존 parent_event_id는 '주 상위'로 존치 — 이 테이블은 추가 상위 전용, 초기 데이터 없음(백필 0).
-- 불변식(앱 레이어 강제): INV-1 주 상위와 중복 엣지 금지 · INV-2 추가 상위는 주 상위가
-- 있는 사건에만 · INV-3 자기참조 금지. 위반 검출은 감사 쿼리(스크립트) 참조.
--
-- ⚠️ 시드/수동 INSERT 시 함정:
--   · updated_at DATETIME(3) NOT NULL에 DEFAULT 없음 → NOW(3) 명시 공급 필수
--   · id는 UUID() 명시 생성
--   · child_event_id <> parent_event_id 가드 후 삽입, 삽입 후 카운트 대조 검증
-- CreateTable
CREATE TABLE `event_parent_link` (
    `id` CHAR(36) NOT NULL,
    `child_event_id` CHAR(36) NOT NULL,
    `parent_event_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_event_parent_link_parentId`(`parent_event_id`),
    UNIQUE INDEX `event_parent_link_child_event_id_parent_event_id_key`(`child_event_id`, `parent_event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `event_parent_link` ADD CONSTRAINT `event_parent_link_child_event_id_fkey` FOREIGN KEY (`child_event_id`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_parent_link` ADD CONSTRAINT `event_parent_link_parent_event_id_fkey` FOREIGN KEY (`parent_event_id`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
