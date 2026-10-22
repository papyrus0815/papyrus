-- 사건 세부 분야 — 26종을 '분야의 2단계'로 다시 정한다(분야 › 세부, 세부는 선택).
-- 26종의 틀은 맞았다. 틀린 건 이름에 분야가 든 것(외교 조치·군사 조치·문화·종교·학술)과 여러 형식이 섞인 덩어리였다:
--   군사 조치 → 동원·배치(MOBILIZATION) · 학술 → 발견·학술(DISCOVERY) · 기타 → 세부 없음(NULL)
--   외교 조치 45건 → 선언·통첩(DECLARATION) / 방문·사절(VISIT) / 회담·교섭(SUMMIT) / 가입·동맹(TREATY)
--   문화·종교 8건 → 창제·저작(CREATION) / 개종·세례(CONVERSION) / 교황청 이전(MIGRATION)
--   봉기 중 여론·불매 운동 → 운동·캠페인(MOVEMENT)
-- 저장은 분야와 독립된 축이다(실측 (분야, 세부) 조합 61가지 — 트리로 저장하면 잎 복제나 분야 왜곡이 생긴다).
-- prisma migrate diff의 MODIFY 한 줄로는 옛 값이 든 행에서 실패하므로: 넓히고 → 옮기고 → 좁힌다.

-- 1) 옛 값 + 새 값을 모두 허용, 세부는 선택이라 NULL 허용
ALTER TABLE `event` MODIFY `type` ENUM('WAR', 'BATTLE', 'UPRISING', 'ATTACK', 'MILITARY_MEASURE', 'TREATY', 'SUMMIT', 'DIPLOMATIC_ACT', 'CRISIS', 'STATEHOOD', 'POWER_CHANGE', 'ELECTION', 'LAW_POLICY', 'INSTITUTION', 'EXPANSION', 'INCIDENT', 'COMPANY', 'MARKET', 'PRODUCT', 'CONSTRUCTION', 'DISASTER', 'SCIENCE', 'CULTURE_RELIGION', 'MIGRATION', 'PERSONAL', 'OTHER', 'MOBILIZATION', 'DECLARATION', 'VISIT', 'MOVEMENT', 'DISCOVERY', 'CREATION', 'CONVERSION') NULL;

-- 2) 이름만 바뀐 값
UPDATE `event` SET `type` = 'MOBILIZATION' WHERE `type` = 'MILITARY_MEASURE';
UPDATE `event` SET `type` = 'DISCOVERY' WHERE `type` = 'SCIENCE';
UPDATE `event` SET `type` = NULL WHERE `type` = 'OTHER';

-- 3) 섞여 있던 덩어리를 제목으로 나눈다
UPDATE `event` SET `type` = 'MOVEMENT' WHERE `title` = '불가리아 선동 운동 (The Bulgarian Agitation)';
UPDATE `event` SET `type` = 'MOVEMENT' WHERE `title` = '보로 운동 (철도 국유화 반대 운동)';
UPDATE `event` SET `type` = 'MOVEMENT' WHERE `title` = '오스트리아 제국의 오스트리아 상품 불매운동';
UPDATE `event` SET `type` = 'TREATY' WHERE `title` = '알리 베이·다헤르 동맹과 러시아 제휴';
UPDATE `event` SET `type` = 'TREATY' WHERE `title` = '체코공화국 NATO 가입 — 약 51년 소련 진영 통합국의 서방 동맹 가입 (1989~1999)';
UPDATE `event` SET `type` = 'TREATY' WHERE `title` = '헝가리 NATO 가입 — 1956년 혁명 진압 약 43년 후 서방 동맹 통합 (1989~1999)';
UPDATE `event` SET `type` = 'TREATY' WHERE `title` = '폴란드 NATO 가입 — 약 44년 바르샤바조약기구 회원국의 서방 동맹 통합 (1989~1999)';
UPDATE `event` SET `type` = 'VISIT' WHERE `title` = '툴롱 항 방문';
UPDATE `event` SET `type` = 'VISIT' WHERE `title` = '쿠로후네 내항 (黒船来航, 1853-1854)';
UPDATE `event` SET `type` = 'VISIT' WHERE `title` = '크론시타트 항 방문';
UPDATE `event` SET `type` = 'VISIT' WHERE `title` = '도쿠가와 이에모치 상락 — 229년 만의 쇼군 교토 방문 (1863)';
UPDATE `event` SET `type` = 'VISIT' WHERE `title` = '홀데인 사절단 (Haldane Mission)';
UPDATE `event` SET `type` = 'VISIT' WHERE `title` = '니콜라이 2세 파리 방문';
UPDATE `event` SET `type` = 'VISIT' WHERE `title` = '표트르 대제 대사절단 파견 및 서구화 개혁 (Grand Embassy of Peter the Great)';
UPDATE `event` SET `type` = 'VISIT' WHERE `title` = '푸앵카레 총리의 러시아 상트페테르부르크 공식 방문 (1912)';
UPDATE `event` SET `type` = 'DECLARATION' WHERE `title` = 'IAEA 이란 비협조 결의 (2025-06-12)';
UPDATE `event` SET `type` = 'DECLARATION' WHERE `title` = '다고메 유덱스 작성';
UPDATE `event` SET `type` = 'DECLARATION' WHERE `title` = '영국의 대독 최후통첩과 참전';
UPDATE `event` SET `type` = 'DECLARATION' WHERE `title` = '독일의 대러시아 최후통첩 — 총동원 중지 요구 (1914)';
UPDATE `event` SET `type` = 'DECLARATION' WHERE `title` = '재보장 조약 갱신 거부';
UPDATE `event` SET `type` = 'DECLARATION' WHERE `title` = '러시아의 병합 승인(굴복)';
UPDATE `event` SET `type` = 'DECLARATION' WHERE `title` = '처칠 해군 예산 연설 — 60% 우위 원칙 천명 (Churchill''s Naval Estimates Speech)';
UPDATE `event` SET `type` = 'DECLARATION' WHERE `title` = '프랑스·영국의 대러시아 선전포고';
UPDATE `event` SET `type` = 'DECLARATION' WHERE `title` = '대한제국 국외중립 선언';
UPDATE `event` SET `type` = 'DECLARATION' WHERE `title` = '독일의 대벨기에 최후통첩 — 영토 통과 요구';
UPDATE `event` SET `type` = 'DECLARATION' WHERE `title` = '독일의 대러시아 각서("뷜로 최후통첩")';
UPDATE `event` SET `type` = 'DECLARATION' WHERE `title` = '오스트리아-헝가리 제국의 러시아 선전포고';
UPDATE `event` SET `type` = 'DECLARATION' WHERE `title` = '오스트리아-헝가리의 대세르비아 최후통첩 (1914)';
UPDATE `event` SET `type` = 'DECLARATION' WHERE `title` = '1876년 러시아의 대오스만 최후통첩';
UPDATE `event` SET `type` = 'DECLARATION' WHERE `title` = '프랑스의 대프로이센 선전포고 (1870)';
UPDATE `event` SET `type` = 'DECLARATION' WHERE `title` = '처칠 글래스고 연설 — ''사치품 함대'' 발언 (Churchill''s "Luxury Fleet" Speech)';
UPDATE `event` SET `type` = 'DECLARATION' WHERE `title` = '사르데냐 왕국의 크림 전쟁 참전';
UPDATE `event` SET `type` = 'DECLARATION' WHERE `title` = '영국 재무장관 맨션 하우스 연설';
UPDATE `event` SET `type` = 'DECLARATION' WHERE `title` = '미국의 핀란드 침공 중단 및 1939년 국경선 철수 요구';
UPDATE `event` SET `type` = 'DECLARATION' WHERE `title` = '볼레슬라프 2세의 신종 서약과 전쟁 종결 (978)';
UPDATE `event` SET `type` = 'DECLARATION' WHERE `title` = '세르비아의 최후통첩 회답 (1914)';
UPDATE `event` SET `type` = 'DECLARATION' WHERE `title` = '세르비아의 병합 승인 각서';
UPDATE `event` SET `type` = 'DECLARATION' WHERE `title` = '슈피티네프 1세의 동프랑크 신종 서약';
UPDATE `event` SET `type` = 'DECLARATION' WHERE `title` = '오스트리아-헝가리의 대세르비아 선전포고 (1914)';
UPDATE `event` SET `type` = 'DECLARATION' WHERE `title` = '포츠담 선언 수락과 옥음방송';
UPDATE `event` SET `type` = 'SUMMIT' WHERE `title` = '러일 협정안 4차 응수';
UPDATE `event` SET `type` = 'SUMMIT' WHERE `title` = '제1차 빈 중재';
UPDATE `event` SET `type` = 'SUMMIT' WHERE `title` = '윌슨 특사 하우스의 유럽 중재 외교';
UPDATE `event` SET `type` = 'SUMMIT' WHERE `title` = '트럼프, 네타냐후 총리 격노·욕설 통화';
UPDATE `event` SET `type` = 'SUMMIT' WHERE `title` = '러일 개전 전 외교 교섭(1903~1904)';
UPDATE `event` SET `type` = 'SUMMIT' WHERE `title` = '일본의 만한교환안 제출';
UPDATE `event` SET `type` = 'LAW_POLICY' WHERE `title` = 'NSPM-2 서명 — 이란 최대 압박 재발동 (2025-02-04)';
UPDATE `event` SET `type` = 'STATEHOOD' WHERE `title` = '단념 선언';
UPDATE `event` SET `type` = 'CONVERSION' WHERE `title` = '미에슈코 1세의 기독교 개종과 폴란드 교회 성립 (966~992)';
UPDATE `event` SET `type` = 'CONVERSION' WHERE `title` = '폴란드의 세례';
UPDATE `event` SET `type` = 'CONVERSION' WHERE `title` = '보헤미아의 기독교 수용 (보르지보이 1세의 세례)';
UPDATE `event` SET `type` = 'MIGRATION' WHERE `title` = '아비뇽 유수';
UPDATE `event` SET `type` = 'CREATION' WHERE `title` = '키릴 문자 창제';
UPDATE `event` SET `type` = 'CREATION' WHERE `title` = '칩 워 발매';
UPDATE `event` SET `type` = 'CREATION' WHERE `title` = '글라골 문자(Glagolitic alphabet) 창제';
UPDATE `event` SET `type` = 'CREATION' WHERE `title` = '자유의 여신상 프랑스의 미국 선물 — 양국 시민 약 21년 공동 사업 (1865~1886)';
-- 남은 외교 조치는 선언·통첩, 문화·종교는 창제·저작
UPDATE `event` SET `type` = 'DECLARATION' WHERE `type` = 'DIPLOMATIC_ACT';
UPDATE `event` SET `type` = 'CREATION' WHERE `type` = 'CULTURE_RELIGION';

-- 4) 분야 잔재 정리 — 옛 카테고리 한 칸 시절에 들어간 값(선전포고·최후통첩이 정치·군사로, 문자 창제가 사회로…).
--    지금 값이 그 잔재일 때만 옮긴다(사람이 이미 고친 값은 건드리지 않는다).
UPDATE `event` `e` JOIN `event_category` `cur` ON `cur`.`id` = `e`.`category_id` AND `cur`.`name` = '사회'
  JOIN `event_category` `nxt` ON `nxt`.`name` = '군사'
  SET `e`.`category_id` = `nxt`.`id` WHERE `e`.`title` = '폴란드 대홍수(Potop)';
UPDATE `event` `e` JOIN `event_category` `cur` ON `cur`.`id` = `e`.`category_id` AND `cur`.`name` = '사회'
  JOIN `event_category` `nxt` ON `nxt`.`name` = '군사'
  SET `e`.`category_id` = `nxt`.`id` WHERE `e`.`title` = '알리 베이의 망명과 최후';
UPDATE `event` `e` JOIN `event_category` `cur` ON `cur`.`id` = `e`.`category_id` AND `cur`.`name` = '사회'
  JOIN `event_category` `nxt` ON `nxt`.`name` = '군사'
  SET `e`.`category_id` = `nxt`.`id` WHERE `e`.`title` = '시리아 원정과 아부 알 다합의 배신';
UPDATE `event` `e` JOIN `event_category` `cur` ON `cur`.`id` = `e`.`category_id` AND `cur`.`name` = '외교'
  JOIN `event_category` `nxt` ON `nxt`.`name` = '정치'
  SET `e`.`category_id` = `nxt`.`id` WHERE `e`.`title` = '하인리히의 왕위 도전 (2차 반란)';
UPDATE `event` `e` JOIN `event_category` `cur` ON `cur`.`id` = `e`.`category_id` AND `cur`.`name` = '외교'
  JOIN `event_category` `nxt` ON `nxt`.`name` = '정치'
  SET `e`.`category_id` = `nxt`.`id` WHERE `e`.`title` = '사라예보 암살 사건';
UPDATE `event` `e` JOIN `event_category` `cur` ON `cur`.`id` = `e`.`category_id` AND `cur`.`name` = '사회'
  JOIN `event_category` `nxt` ON `nxt`.`name` = '정치'
  SET `e`.`category_id` = `nxt`.`id` WHERE `e`.`title` = '체르케스 하산 사건';
UPDATE `event` `e` JOIN `event_category` `cur` ON `cur`.`id` = `e`.`category_id` AND `cur`.`name` = '사회'
  JOIN `event_category` `nxt` ON `nxt`.`name` = '외교'
  SET `e`.`category_id` = `nxt`.`id` WHERE `e`.`title` = '제81차 유엔총회';
UPDATE `event` `e` JOIN `event_category` `cur` ON `cur`.`id` = `e`.`category_id` AND `cur`.`name` = '사회'
  JOIN `event_category` `nxt` ON `nxt`.`name` = '정치'
  SET `e`.`category_id` = `nxt`.`id` WHERE `e`.`title` = '895년 레겐스부르크 의회(Diet of Regensburg)';
UPDATE `event` `e` JOIN `event_category` `cur` ON `cur`.`id` = `e`.`category_id` AND `cur`.`name` = '사회'
  JOIN `event_category` `nxt` ON `nxt`.`name` = '정치'
  SET `e`.`category_id` = `nxt`.`id` WHERE `e`.`title` = '동루멜리아 합병';
UPDATE `event` `e` JOIN `event_category` `cur` ON `cur`.`id` = `e`.`category_id` AND `cur`.`name` = '사회'
  JOIN `event_category` `nxt` ON `nxt`.`name` = '정치'
  SET `e`.`category_id` = `nxt`.`id` WHERE `e`.`title` = '러시아 대동란 시대 종결 및 로마노프 왕조 개창';
UPDATE `event` `e` JOIN `event_category` `cur` ON `cur`.`id` = `e`.`category_id` AND `cur`.`name` = '사회'
  JOIN `event_category` `nxt` ON `nxt`.`name` = '외교'
  SET `e`.`category_id` = `nxt`.`id` WHERE `e`.`title` = '알리 베이·다헤르 동맹과 러시아 제휴';
UPDATE `event` `e` JOIN `event_category` `cur` ON `cur`.`id` = `e`.`category_id` AND `cur`.`name` = '기타'
  JOIN `event_category` `nxt` ON `nxt`.`name` = '문화'
  SET `e`.`category_id` = `nxt`.`id` WHERE `e`.`title` = '칩 워 발매';
UPDATE `event` `e` JOIN `event_category` `cur` ON `cur`.`id` = `e`.`category_id` AND `cur`.`name` = '사회'
  JOIN `event_category` `nxt` ON `nxt`.`name` = '문화'
  SET `e`.`category_id` = `nxt`.`id` WHERE `e`.`title` = '글라골 문자(Glagolitic alphabet) 창제';
UPDATE `event` `e` JOIN `event_category` `cur` ON `cur`.`id` = `e`.`category_id` AND `cur`.`name` = '사회'
  JOIN `event_category` `nxt` ON `nxt`.`name` = '문화'
  SET `e`.`category_id` = `nxt`.`id` WHERE `e`.`title` = '키릴 문자 창제';
UPDATE `event` `e` JOIN `event_category` `cur` ON `cur`.`id` = `e`.`category_id` AND `cur`.`name` = '정치'
  JOIN `event_category` `nxt` ON `nxt`.`name` = '외교'
  SET `e`.`category_id` = `nxt`.`id` WHERE `e`.`title` = '1876년 러시아의 대오스만 최후통첩';
UPDATE `event` `e` JOIN `event_category` `cur` ON `cur`.`id` = `e`.`category_id` AND `cur`.`name` = '정치'
  JOIN `event_category` `nxt` ON `nxt`.`name` = '외교'
  SET `e`.`category_id` = `nxt`.`id` WHERE `e`.`title` = '프랑스의 대프로이센 선전포고 (1870)';
UPDATE `event` `e` JOIN `event_category` `cur` ON `cur`.`id` = `e`.`category_id` AND `cur`.`name` = '정치'
  JOIN `event_category` `nxt` ON `nxt`.`name` = '외교'
  SET `e`.`category_id` = `nxt`.`id` WHERE `e`.`title` = '프랑스·영국의 대러시아 선전포고';
UPDATE `event` `e` JOIN `event_category` `cur` ON `cur`.`id` = `e`.`category_id` AND `cur`.`name` = '군사'
  JOIN `event_category` `nxt` ON `nxt`.`name` = '외교'
  SET `e`.`category_id` = `nxt`.`id` WHERE `e`.`title` = '오스트리아-헝가리 제국의 러시아 선전포고';
UPDATE `event` `e` JOIN `event_category` `cur` ON `cur`.`id` = `e`.`category_id` AND `cur`.`name` = '군사'
  JOIN `event_category` `nxt` ON `nxt`.`name` = '외교'
  SET `e`.`category_id` = `nxt`.`id` WHERE `e`.`title` = '오스트리아-헝가리의 대세르비아 선전포고 (1914)';
UPDATE `event` `e` JOIN `event_category` `cur` ON `cur`.`id` = `e`.`category_id` AND `cur`.`name` = '정치'
  JOIN `event_category` `nxt` ON `nxt`.`name` = '외교'
  SET `e`.`category_id` = `nxt`.`id` WHERE `e`.`title` = '사르데냐 왕국의 크림 전쟁 참전';
UPDATE `event` `e` JOIN `event_category` `cur` ON `cur`.`id` = `e`.`category_id` AND `cur`.`name` = '정치'
  JOIN `event_category` `nxt` ON `nxt`.`name` = '외교'
  SET `e`.`category_id` = `nxt`.`id` WHERE `e`.`title` = '미국의 핀란드 침공 중단 및 1939년 국경선 철수 요구';
UPDATE `event` `e` JOIN `event_category` `cur` ON `cur`.`id` = `e`.`category_id` AND `cur`.`name` = '정치'
  JOIN `event_category` `nxt` ON `nxt`.`name` = '외교'
  SET `e`.`category_id` = `nxt`.`id` WHERE `e`.`title` = '슈피티네프 1세의 동프랑크 신종 서약';
UPDATE `event` `e` JOIN `event_category` `cur` ON `cur`.`id` = `e`.`category_id` AND `cur`.`name` = '정치'
  JOIN `event_category` `nxt` ON `nxt`.`name` = '외교'
  SET `e`.`category_id` = `nxt`.`id` WHERE `e`.`title` = '포츠담 선언 수락과 옥음방송';
UPDATE `event` `e` JOIN `event_category` `cur` ON `cur`.`id` = `e`.`category_id` AND `cur`.`name` = '정치'
  JOIN `event_category` `nxt` ON `nxt`.`name` = '외교'
  SET `e`.`category_id` = `nxt`.`id` WHERE `e`.`title` = '제1차 빈 중재';
UPDATE `event` `e` JOIN `event_category` `cur` ON `cur`.`id` = `e`.`category_id` AND `cur`.`name` = '정치'
  JOIN `event_category` `nxt` ON `nxt`.`name` = '외교'
  SET `e`.`category_id` = `nxt`.`id` WHERE `e`.`title` = '트럼프, 네타냐후 총리 격노·욕설 통화';
UPDATE `event` `e` JOIN `event_category` `cur` ON `cur`.`id` = `e`.`category_id` AND `cur`.`name` = '정치'
  JOIN `event_category` `nxt` ON `nxt`.`name` = '외교'
  SET `e`.`category_id` = `nxt`.`id` WHERE `e`.`title` = '영국 재무장관 맨션 하우스 연설';
UPDATE `event` `e` JOIN `event_category` `cur` ON `cur`.`id` = `e`.`category_id` AND `cur`.`name` = '정치'
  JOIN `event_category` `nxt` ON `nxt`.`name` = '외교'
  SET `e`.`category_id` = `nxt`.`id` WHERE `e`.`title` = '2026년 9월 미중 정상회담';
UPDATE `event` `e` JOIN `event_category` `cur` ON `cur`.`id` = `e`.`category_id` AND `cur`.`name` = '사회'
  JOIN `event_category` `nxt` ON `nxt`.`name` = '경제'
  SET `e`.`category_id` = `nxt`.`id` WHERE `e`.`title` = '한국 소주 1도 1사';

-- 5) 새 값만 (prisma migrate diff 생성분)
ALTER TABLE `event` MODIFY `type` ENUM('WAR', 'BATTLE', 'UPRISING', 'ATTACK', 'MOBILIZATION', 'TREATY', 'SUMMIT', 'DECLARATION', 'VISIT', 'CRISIS', 'EXPANSION', 'STATEHOOD', 'POWER_CHANGE', 'ELECTION', 'LAW_POLICY', 'INSTITUTION', 'INCIDENT', 'MOVEMENT', 'COMPANY', 'MARKET', 'PRODUCT', 'CONSTRUCTION', 'DISASTER', 'DISCOVERY', 'CREATION', 'CONVERSION', 'MIGRATION', 'PERSONAL') NULL;
