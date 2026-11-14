-- ============================================================================
-- 중앙부처·국가기관(AdministrationDepartment) 구조화 상세 컬럼 승격 및 레거시 마커·임시 URL 정리
-- ============================================================================

-- 1) AdministrationDepartment 정식 상세 컬럼 추가
ALTER TABLE `administration_department`
    ADD COLUMN `primary_mission` TEXT NULL,
    ADD COLUMN `headquarters` VARCHAR(500) NULL,
    ADD COLUMN `org_structure` TEXT NULL,
    ADD COLUMN `budget_note` TEXT NULL;

-- 2) 기존 description 본문 끝의 <!--papyrus-dept-defense:BASE64--> 마커에서 정식 컬럼으로 무손실 백필 및 본문 정리
UPDATE `administration_department`
SET
    `name_en` = COALESCE(
        NULLIF(TRIM(`name_en`), ''),
        NULLIF(
            TRIM(
                JSON_UNQUOTE(
                    JSON_EXTRACT(
                        CONVERT(
                            FROM_BASE64(
                                SUBSTRING_INDEX(
                                    SUBSTRING_INDEX(`description`, '<!--papyrus-dept-defense:', -1),
                                    '-->',
                                    1
                                )
                            ) USING utf8mb4
                        ),
                        '$.officialNameEn'
                    )
                )
            ),
            ''
        )
    ),
    `primary_mission` = COALESCE(
        `primary_mission`,
        NULLIF(
            TRIM(
                JSON_UNQUOTE(
                    JSON_EXTRACT(
                        CONVERT(
                            FROM_BASE64(
                                SUBSTRING_INDEX(
                                    SUBSTRING_INDEX(`description`, '<!--papyrus-dept-defense:', -1),
                                    '-->',
                                    1
                                )
                            ) USING utf8mb4
                        ),
                        '$.missionScope'
                    )
                )
            ),
            ''
        )
    ),
    `headquarters` = COALESCE(
        `headquarters`,
        LEFT(
            NULLIF(
                TRIM(
                    JSON_UNQUOTE(
                        JSON_EXTRACT(
                            CONVERT(
                                FROM_BASE64(
                                    SUBSTRING_INDEX(
                                        SUBSTRING_INDEX(`description`, '<!--papyrus-dept-defense:', -1),
                                        '-->',
                                        1
                                    )
                                ) USING utf8mb4
                            ),
                            '$.headquarters'
                        )
                    )
                ),
                ''
            ),
            500
        )
    ),
    `org_structure` = COALESCE(
        `org_structure`,
        NULLIF(
            TRIM(
                JSON_UNQUOTE(
                    JSON_EXTRACT(
                        CONVERT(
                            FROM_BASE64(
                                SUBSTRING_INDEX(
                                    SUBSTRING_INDEX(`description`, '<!--papyrus-dept-defense:', -1),
                                    '-->',
                                    1
                                )
                            ) USING utf8mb4
                        ),
                        '$.orgStructure'
                    )
                )
            ),
            ''
        )
    ),
    `budget_note` = COALESCE(
        `budget_note`,
        NULLIF(
            TRIM(
                JSON_UNQUOTE(
                    JSON_EXTRACT(
                        CONVERT(
                            FROM_BASE64(
                                SUBSTRING_INDEX(
                                    SUBSTRING_INDEX(`description`, '<!--papyrus-dept-defense:', -1),
                                    '-->',
                                    1
                                )
                            ) USING utf8mb4
                        ),
                        '$.budgetOrForcesNote'
                    )
                )
            ),
            ''
        )
    ),
    `description` = NULLIF(
        TRIM(SUBSTRING_INDEX(`description`, '<!--papyrus-dept-defense:', 1)),
        ''
    )
WHERE `description` LIKE '%<!--papyrus-dept-defense:%-->%';

-- 3) 군부대 휘장(insignia_url)에 잘못 저장된 브라우저 임시 blob: URL 정리
UPDATE `military_units`
SET `insignia_url` = NULL
WHERE `insignia_url` LIKE 'blob:%';
