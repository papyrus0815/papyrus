-- 구 인물 폼이 모든 인물에 name_display_order를 강제 저장한 아티팩트 정리.
--
-- 인물 폼이 'auto'(NULL) 옵션을 지원하게 되면서 표시 순서 해소 체인이
-- 개인 오버라이드 → 국가 기본(default_name_display_order) → korean(동양식)으로
-- 동작하지만, 기존 행은 거의 전부 명시값이 저장돼 있어 국가 기본이 적용될 여지가 없다.
--
-- 국가 기본(또는 최종 fallback인 korean)과 동일하게 해소되는 "중복 korean 오버라이드"만
-- NULL(auto)로 되돌린다. korean은 해소 체인의 최종 fallback이므로 국가 정보가 없는
-- 화면에서도 표시가 바뀌지 않는다.
--
-- western 오버라이드는 건드리지 않는다 — 국가 정보를 싣지 않는 화면에서는
-- fallback(korean)으로 뒤집혀 표시가 실제로 바뀔 수 있기 때문.
UPDATE person p
LEFT JOIN country c ON p.country_id = c.id
SET p.name_display_order = NULL
WHERE p.name_display_order = 'korean'
  AND (
    c.id IS NULL
    OR c.default_name_display_order IS NULL
    OR c.default_name_display_order = 'korean'
  );
