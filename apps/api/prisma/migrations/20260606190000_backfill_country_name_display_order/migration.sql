-- Backfill: 미설정(NULL) 국가의 이름 표시 순서를 채운다.
-- 성(姓) 우선 문화권(한·일·중·베트남)만 korean, 나머지는 western.
-- 이미 값이 설정된 국가는 건드리지 않는다(관리자 수동 설정 보존).
UPDATE `country`
  SET `default_name_display_order` = 'korean'
  WHERE `default_name_display_order` IS NULL
    AND `iso_code` IN ('KR', 'JP', 'CN', 'VN');

UPDATE `country`
  SET `default_name_display_order` = 'western'
  WHERE `default_name_display_order` IS NULL;

-- 폼 아티팩트 정리: 과거 등록 폼은 표시순서 컨트롤이 없어 모든 인물에
-- name_display_order='korean'을 강제 저장했다. 모던 서양권 국가에 연결된
-- 'korean' 값은 사용자 의도가 아닌 기본값 잔재이므로 NULL로 되돌려(=국가 기본 따름)
-- 국가의 western 순서가 적용되게 한다.
-- 시드가 의도적으로 넣은 'western' 값과, 동양권 국가 인물의 'korean' 값은 건드리지 않는다.
UPDATE `person` p
  JOIN `country` c ON p.`country_id` = c.`id`
  SET p.`name_display_order` = NULL
  WHERE p.`name_display_order` = 'korean'
    AND c.`default_name_display_order` = 'western';
