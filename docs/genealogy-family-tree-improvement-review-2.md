# 인물 가계도(Family Tree) 개선 리뷰 2차 — 배치1~3 이후 현재 코드 기준

> 2026-07-03. 1차 리뷰(`genealogy-family-tree-improvement-review.md`, 38건) 배치1·2 커밋 + 배치3 일부(#12 provenance)
> + 커넥터 geometry 수정(미커밋) + '전체 가계도 보기' 진입점 제거(240978e30) **이후의 작업트리**를 다시 리뷰한 결과.
>
> 방법: 7개 관점(백엔드 정합·지오메트리·저작 UX·시각·a11y/성능·계약·크로스커팅) 병렬 리뷰 → 발견별 적대적 검증
> (P0/P1 주장은 2인 교차검증). 후보 56건 → 검증 통과 52건 → 근인 기준 **39건 통합**. 기존 백로그(배치3 마이그 4건,
> 배치4·5, DynastyLink)는 재보고 제외 — 전제가 바뀐 재평가만 포함.
>
> 항목 번호는 1차와 구분해 **G1~G39**. P0 없음. P1 2건(기능 무동작·연대 오표시), 무성 데이터손실 경로 3건.

---

## 1. 요약 — 가장 아픈 곳

1. **배치2 '사생아 저작'이 실제로는 동작하지 않는다** (G1). 프론트·DTO·도메인 타입까지 다 있는데 컨트롤러 매핑에서 필드가 버려진다. 조용한 무동작이라 지금까지 발각이 안 됐다.
2. **BC 인물의 가계도가 전부 틀린다** (G2). era를 안 내려 BC 생몰년이 AD로 표시되고 형제·자녀 정렬이 연대 역순.
3. **배치1 canonical 배우자 쓰기의 후폭풍 2건** — detail 자녀 배우자 절반 누락(G3), 비트랜잭션 delete-recreate 소실 창(G4).
4. **저작 퀵액션이 남의 가계를 조용히 부순다** (G5) — '+자녀 추가'가 대상의 기존 부/모 FK를 무확인 덮어씀.
5. **/genealogy 독립 페이지 처분 결정 필요** (G37) — 진입점 0인데 라우트·1,201줄 페이지는 유지보수 중. inferred 시각화 등 신규 기능이 "아무도 못 보는 화면"에만 존재.

---

## 2. P1 — 기능 무동작·정합 (최우선)

### G1. 사생아(illegitimate) 저작이 컨트롤러에서 유실 — 전 구간 무동작 `P1` (1차 #11 재평가)

- **위치**: `apps/api/src/libs/person/presentation/person.controller.ts` — create 매핑(795~841)·update 매핑(902~952)·getDetailById 응답(551~752)
- 프론트는 payload에 `illegitimate`를 항상 포함(`person-register-view.tsx:1537`)하고 DTO(`create-person.dto.ts:441`, `update-person.dto.ts:265`)·도메인 타입(`domain/person.repository.ts:80,154`)도 전부 선언돼 있으나, **컨트롤러 파일 전체에 `illegitimate` 문자열이 0회** — 명시적 필드 매핑에서 탈락해 service로 전달되지 않는다. 저장 성공 토스트가 뜨지만 DB는 false 그대로.
- detail 응답에도 필드가 없어 수정 모달 hydrate `setIllegitimate(Boolean((p as any).illegitimate))`(`person-register-view.tsx:843`)는 항상 false. `as any` 캐스트 탓에 tsc도 계약 누락을 못 잡았다. 가계도 별표(*)는 시드/SQL 직접 삽입 데이터에서만 보인다.
- **결합 함정 (G1과 반드시 같은 커밋)**: 컨트롤러 배선만 고치고 detail 응답 누락을 안 고치면, illegitimate=true 인물의 이름 오타 하나만 고쳐 저장해도 (hydrate가 false → payload false 전송) 플래그가 **무성 클리어**되는 P1급 손실이 새로 발화한다.
- **수정 3곳(각 1줄) + 스펙**: create 매핑·update 매핑에 `illegitimate: dto.illegitimate`, getDetailById 응답에 `illegitimate: Boolean(person.illegitimate)`, register→detail 왕복 회귀 스펙 1건. 프론트는 `(p as any)` 대신 detail 응답 타입에 필드 명시.

### G2. 가계도 노드 BC era 미노출 — BC 생몰년 AD 둔갑 + 형제·자녀 정렬 연대 역순 `P1` (신규, 1차에 없음)

- **위치**: `person.prisma.repository.ts` PERSON_SELECT(~4346, era 미선택)·노드 매핑(4752 `birthYear: yearOfDate(p.birthDate)`)·fetchChildrenOf `orderBy birthDate asc`(4521~4524)
- Person은 BC를 "크기값 양수 연도 UTC Date + birthEra/deathEra 컬럼"으로 저장하는데 family-tree만 era를 통째로 누락: `FamilyTreeNodeDto`(person.response.ts:151-152)·프론트 `FamilyTreePerson`(persons-family-tree.ts:18-19)에도 era 필드가 없다. 같은 인물의 detail 응답은 birthEra를 내려(controller:567-569) 모달은 올바르다 — **키스톤 계약의 갭**.
- 증상: 카이사르(BC100–BC44)가 카드에 '100–44'로 AD처럼 표시. BC 구간에서 크기값 오름차순=연대 내림차순이라 `orderBy birthDate asc` + 프론트 birthYear asc 정렬 5곳+(형제·자녀·배우자 인접도 386-391)이 전부 장유 역전. 독립 페이지 lifespan(genealogy.page.tsx:445-446)도 동일.
- **제안**: BC면 음수로 변환한 **signed year**를 birthYear/deathYear에 실어 내리기(서버 1곳 수정으로 정렬·비교가 프론트 무수정 일관) + 카드에서 음수→'BC n' 포맷 + 래퍼 인터페이스 동기 갱신. 네이티브 Date 재파싱 금지 규약([[event-structured-bc-date]]) 동일 원칙.
- **동반 수정**: `utils.ts:20 yearOf`가 로컬 타임존 `getFullYear` 사용(G28) — 백엔드는 같은 함정을 피하려고 getUTCFullYear를 쓴다(repo:4443-4444 주석). REST 폴백 렌더에서 UTC 음수 오프셋 브라우저의 1월 1일생이 전년 표기. `t && !isNaN(t)` truthiness가 epoch 0도 null 처리하는 미세 불일치 포함해 함께 정리.

### G3. detail 응답 children[].spouse가 정방향만 조회 — canonical (min,max) 쓰기와 충돌, 자녀 배우자 ~절반 누락 `P2(정합)`

- **위치**: `person.controller.ts:516`(자녀 평탄화 `spouseRelationsAsPerson?.[0]`), `person.prisma.repository.ts:1170·1220`(childrenFromFather/Mother select가 AsPerson만 include)
- 배치1 `buildCanonicalSpouseRows`(repo:1683)는 (min,max) id 순으로 저장을 수렴시키므로, **자녀 id > 배우자 id인 커플은 canonical 행이 자녀의 역방향(AsSpouse)에 놓여** children[].spouse=null이 된다. ego 본인 spouseRelations는 양방향 머지(656-681)라 무사 — 자녀만 편향.
- 증상: country-detail 호스트(person-detail-view, familyTreeData 미전달)에서 자녀 배우자 카드·♥join **영구 누락**; 인물 상세 임베드는 BFS 도착 전 폴백 렌더에서 사라졌다 나타나는 깜빡임. 어느 쪽이든 배우자를 재저장하는 순간 canonical 방향으로 재발급되므로 "보이던 자녀 배우자가 저장 후 사라지는" 회귀도 가능.
- **제안**: 자녀 select에 `spouseRelationsAsSpouse`(person 포함) 추가 + 평탄화에서 `AsPerson?.[0] ?? AsSpouse?.[0].person` 머지(자기 자신 행 제외). ego 머지(656-681)와 동일 패턴 재사용.

### G4. 배우자·섹션 delete-recreate가 트랜잭션 밖 — 중간 실패 시 결혼 기록 전체 무성 소실 `P2(비가역)`

- **위치**: `person.prisma.repository.ts:1856~1864`(spouse), 1869~1881(sections) — update()가 person.update → deleteMany(양방향 OR) → createMany를 **독립 커밋**으로 실행, `$transaction` 없음
- deleteMany 커밋 후 createMany가 실패하면(폼 hydrate~저장 사이 배우자 인물 삭제로 FK P2003, 커넥션 단절, 크래시) 이 인물이 얽힌 결혼 행(날짜·메모 포함)이 전부 소실. 수정 모드는 배우자를 안 건드려도 항상 spouseRelations 배열을 전송(`person-register-view.tsx:1475-1477`)하므로 **모든 인물 저장이 이 경로를 지난다**. 에러 토스트가 손실을 알리지 않아 사용자가 이탈하면 손실 확정. 발생 창이 좁아 P1은 과장(검증 보정)이나 비가역이라 우선 수정 가치 높음. [[company-detail-improvement-backlog]]의 'delete-recreate 시한폭탄'과 동일 패턴.
- **제안**: update()의 person.update + spouse delete/createMany + sections delete/createMany를 `$transaction` 한 단위로. createMany 전 spouseId 존재 검증(findMany in)을 넣으면 FK 500도 400으로 정리.

### G5. '+자녀 추가'가 대상 인물의 기존 부/모 FK를 무확인 덮어씀 `P2(무성 데이터 변조)`

- **위치**: `person-detail-panel.tsx:744~746`(applyFamilyLink child 모드), 801(excludeIds=`[selfId]`뿐)
- ego 쪽은 '+아버지 추가'를 슬롯 점유 시 disabled(2334·2342)로 보호하면서, **대상(자녀) 쪽 부모 슬롯 점유는 무보호** — 비대칭. 세종의 아들 문종을 다른 인물의 '+자녀 추가'에서 선택하면 문종.fatherId가 무경고 교체되고 성공 토스트만 뜬다. 풀 데이터(getAllPersons)에 fatherId/motherId가 있어 클라 사전 확인 가능.
- **제안**: 선택 시 대상의 해당 슬롯 점유 확인 → 명령형 confirm("이미 아버지 ○○이 지정돼 있습니다. 교체할까요?") 게이트. 이미 ego의 자녀인 인물은 excludeIds로 제외(무의미한 '추가 성공' 차단).
- **동반 수정(같은 함수)**:
  - **G5a** `catch {}`가 서버 거부 사유를 삼킴(781행) — 배치1 assertNoParentCycle의 한글 400 메시지('순환…')가 사용자에게 안 감. nestia HttpError.message는 raw JSON body라 **body 파싱**(이벤트 상세 예외매핑 패턴) 필수. child exclude에 ego의 father/mother 추가로 순환 확정 케이스는 선택 자체를 차단.
  - **G5b** ego 성별 미지정(null/UNKNOWN)이면 무조건 fatherId 기록(745행) — 여성 인물이 아버지 슬롯에. MALE/FEMALE 외에는 기록 슬롯을 물어보거나 토스트에 명시.
  - **G5c** '+배우자 추가' excludeIds에 자녀 미포함(804행) — 자식 페이지에선 부모 선택이 차단되는데 부모 페이지에선 자식 선택 허용(비대칭). `person.children` 이미 로드돼 있음. family-section 배우자 모달(408~418)은 create 모드라 현행 유지 가능.

### G6. 임베드 위젯 Rules of Hooks 위반 — 조기 return 뒤 훅 6개, 레이스 시 크래시 `P2`

- **위치**: `person-genealogy-infographic.tsx:365` 조기 `return null` 뒤에 useState 2(375·376)·useMemo 4(380·412·416·424) — 렌더 간 훅 수 7↔13
- 호스트가 REST person + family-tree 쿼리 **듀얼 소스**라 invalidatePersonCaches(707) 후 refetch 도착 순서에 따라 마운트 상태에서 조건이 뒤집히는 창이 실재(예: 유일한 자녀 삭제 → family-tree 선착 → 전 조건 false). React invariant throw → 전역 SmartErrorBoundary 폴백으로 패널 뷰 전체 소실. 미커밋 geometry 작업으로 조기 return 아래 훅이 늘어 노출면 확대. eslint에 react-hooks 플러그인 부재라 안전망도 없음.
- **제안**: `return null`을 마지막 훅(424) 아래로 이동(조건 계산은 그대로) — 1줄 이동. 별도로 eslint `react-hooks/rules-of-hooks` 활성화 검토.

---

## 3. 지오메트리·레이아웃 — 커넥터 수정(미커밋)의 마감

### G7. center-shift가 transform이라 스크롤 모드에서 좌측 카드 도달 불가 잘림 `P2`

- **위치**: `person-genealogy-infographic.tsx:418` `transform: translateX(-shift)` — 레이아웃 불참여라 GenerationsInner(max-content) 폭에 미반영
- 자녀 세대가 최광폭 블록이면 그리드가 페인트 좌표 음수로 이동하는데, LTR 스크롤 컨테이너는 원점 왼쪽을 스크롤로 도달 못 함 → 좌측 |shift|px 카드가 **볼 방법이 없다**. shift<0이면 우측에 무의미한 여백. 결함 자체는 커밋된 HEAD에도 있었으나 **실측폭 도입으로 이전엔 shift=0이던 트리까지 큰 shift가 생겨 발현이 증폭**(스펙 픽스처 '발루아' 자체가 shift=102px).
- **제안**: ForkTrack+ChildrenGrid를 래퍼(max-content)로 묶고 shift>0이면 `padding-right: 2*shift`, shift<0이면 `padding-left: 2*|shift|` — 래퍼 중심=childMean 유지, 폭이 레이아웃에 포함돼 전부 스크롤 가능. ForkToChildren xMid 페어링 그대로 유효.

### G8. 조상 컬럼 커넥터 드리프트 잔존 — 하향만 실측폭, 상향은 여전히 균등분할 flex `P2`

- **위치**: `ancestor-column.tsx:213` — AncColumnDiv `flex: 1 1 0`(50:50) + ForkFromTwoParents(viewBox 400 스트레치)
- 두 부모 가지의 서브트리 폭이 다르면(친조부 부모 2명 vs 친조모 0명) 넓은 가지가 컬럼을 오버플로 → fork 끝점이 카드 중심에서 24~72px 이탈, 3세대(증조부모)부터 이웃 가지와 32px 실겹침 확인됨. 48행 주석 '항상 정확히 맞음'은 직하 fork에만 참. 이번에 하향을 고친 것과 정확히 같은 계열의 결함이 상향에 그대로.
- **제안**: geometry.ts에 `ancestorColumnWidth`(재귀 실측폭, descendantsRowWidth와 대칭) 추가 → AncColumnDiv 폭 px 명시 + fork를 실측 좌표 SVG로. 단일 출처 원칙을 상향에도 적용.

### G9. ego 배우자 2명 세로 스택 시 ♥ 연결선이 카드 사이 빈 gap을 가리킴 `P2`

- **위치**: `person-genealogy-infographic.tsx:1115` — SpouseJoin이 `align-self: center` 한 곳뿐이라 짝수 명이면 선이 8px gap(카드 232+gap 8)에 떨어짐. 배치2로 다중 배우자 저작이 1급이 되며 노출 빈도 상승.
- **제안**: 배우자별 개별 join(자녀 페어 `SpouseJoin $card` 패턴) 또는 좌측 세로 버스+브래킷 분기.

### G10~G12. 지오메트리 유지보수 부채 (전부 S)

- **G10** `maxDepth=3`이 4곳 하드코딩(geometry.ts:74 private 상수, main 741·784 리터럴, spec:30 로컬 상수) — 하나만 바꾸면 폭 계산과 렌더가 어긋나며 **스펙은 자기 상수를 쓰므로 계속 통과**. → `constants.ts`에 `DESCENDANT_MAX_DEPTH` export, 4곳 import 통일.
- **G11** DescendantSubtree pairWidths(42-53)가 descendantsRowWidth 루프 본문의 수동 복제(+렌더 map 64-70까지 3곳) — 한쪽만 수정되면 fork 바와 행 폭 분리. → geometry.ts에 `descendantSlotWidths()` export, 합산·소비 단일화.
- **G12** geometry.spec.ts가 '자녀 우측(배우자 좌측)' childOffset 브랜치(geometry.ts:129) 미검증 — 픽스처가 전부 MALE 자녀+FEMALE 배우자. 이 브랜치는 서브트리 팽창과 결합 시 오차 최대(~204px) 지점. → FEMALE 자녀+MALE 배우자+손자녀 픽스처 2건 추가.

### G13. childList·siblingList 참조 불안정 — memo 체인 전체 무력화 `P3(수정 1줄×3)`

- **위치**: `person-genealogy-infographic.tsx:230`(childList `.filter(Boolean)` 인라인)·318-328(siblingList)
- 1차 #35('sub-ms cleanup'으로 배치5 보류)의 **전제가 미커밋 geometry 작업으로 바뀜**: 이제 매 렌더 descendantsByParentId(3-phase BFS)뿐 아니라 childLayouts(후손마다 `new Set(visited)` 복제 재귀)·childrenShift·ForkToChildren path까지 재계산. DescendantSubtree pairWidths도 메모 없음. 모달 토글마다 O(트리) 순회 반복.
- **제안**: 세 리스트 useMemo 감싸기 + pairWidths useMemo — 하위 memo 3개가 정상 작동 회복. (1차 #35 우선순위 상향으로 흡수)

---

## 4. 모달·저작 폼 마감

### G14. 임베드 모달 위 픽커 Esc가 픽커 대신 인물 모달 전체를 닫음 `P2`

- **위치**: `person-detail-modal.tsx:75` — Escape를 window **capture**로 등록+stopPropagation. PersonSelectModal은 버블 리스너(person-select-modal.tsx:423)라 항상 선점당함.
- '+자녀 추가' 픽커에서 푸터가 안내하는 'esc 닫기'를 누르면 하위 인물 모달이 닫히거나 이전 인물로 pop(key 리마운트로 familyAddMode·검색어 소실). 독립 인물 상세(embedInModal=false)는 정상.
- **제안**: PersonDetailModal Esc를 useModalBehavior 패턴(자기 root keydown)으로 이관 — [[web-admin-modal-foundation]] 잔여 이관 목록에 편입하면 구조적 해결.

### G15. 이중 focus trap 충돌 — 픽커 안 Tab이 매번 첫 요소로 강제 리셋 `P2`

- **위치**: `use-focus-trap.hook.ts:84` — document capture에서 `!root.contains(active)`면 무조건 재포커스. 트랩 2개(PersonDetailModal panelRef + PersonSelectModal 포털)가 겹치면 등록순 연쇄 실행으로 픽커 내 Tab/Shift+Tab이 항상 닫기 X/마지막 요소로 튕김(리스트 ↑↓만 가능, 필터·'새 인물' 도달 불가). bioMention 트랩 등 **useFocusTrap 소비자가 겹치는 모든 스택 공통**.
- **제안**: 모듈 레벨 트랩 스택(최상위만 처리) 또는 container-root 바인딩. G14와 함께 useModalBehavior 수렴이 정공.

### G16~G20. 저작 폼 잔여 (전부 S)

- **G16** 혼인 종료일<시작일 검증 클라·서버 전무(family-section.tsx:331, controller:944~949 변환만) → 행 단위 검사(국가 소속 hasAffiliationDateError 패턴 재사용)+서버 400.
- **G17** 배우자 미선택 행의 혼인일·메모가 저장 시 무경고 폐기(person-register-view.tsx:1464 `!row.spouseId` 필터) → 값 있는 미선택 행은 에러로 차단.
- **G18** 배우자 행 × 삭제 무확인 즉시 실행(family-section.tsx:307) — edit 모드에선 hydrate된 기존 혼인 기록이 한 클릭+저장으로 서버에서 삭제 → 값 있는 행만 명령형 confirm([[web-admin-toast-confirm-unified]] 규약).
- **G19** 픽커 인물풀 캐시 `['persons-pool-for-family-add']`가 personKeys 프리픽스 밖이라 invalidatePersonCaches 미커버 + onCreatedPerson 미전달(person-detail-panel.tsx:722, 2380~2390) — 즉석 생성 인물이 60초간 검색 안 됨 → 키를 `['persons', 'pool-for-family-add']`로 편입.
- **G20** '새 인물' 버튼이 ego.countryId 없으면 조용히 미노출(person-select-modal.tsx:107 `canCreate = !!defaultCountryId`) — 국가 미상 인물에서 배치2가 없애려던 왕복 마찰 부활 → canCreate를 별도 prop으로 분리.

---

## 5. 계약·표면 정리

### G21. inferred(추론) 배우자가 유일한 살아있는 표면에서 확정 배우자와 동일 렌더 `P2`

- **위치**: `person-genealogy-infographic.tsx:187` ftDerivedEgoFamily — spouse 엣지에서 상대 노드만 추출, `e.inferred`/marriageStartYear/EndYear/note 전부 폐기(위젯 디렉토리 'inferred' 소비 0건)
- b8d0c87b6이 provenance를 정비하고 독립 페이지는 ♡·점선(2 4)·opacity로 구분하는데, 진입점 제거 후 사용자가 실제 보는 임베드에서는 **PersonSpouse 미등록 추론 관계(사생아 생모 등)가 '배우자 N' 실선 ♥로 확정처럼 표시** — 역사 데이터 오정보. (혼인일·메모 자체는 개요 탭 SpouseDetailSection이 표시하므로 '표시 지면 전무'는 아님 — 트리 내 구분만 gap.)
- **제안**: ftDerivedEgoFamily에서 엣지 메타를 배우자에 실어 추론이면 '배우자(추정)' 뱃지+점선/♡(독립 페이지 시각 문법 재사용), CardHoverInfo에 혼인기간. 배치4 범례(#25/#37)와 한 배치.

### G22. parentMarriageId 전제 침식 — 배치4 #1의 선결 조건 `P3(설계 게이트)` (1차 #1 재평가)

- **위치**: `person.prisma.repository.ts:1862` + `libs/db/prisma/person.prisma:189`(relation 없는 char(36), 인덱스만)
- update의 delete-recreate가 저장마다 PersonSpouse id를 재발급(양방향 OR로 배치1이 churn 표면 2배 — 단 id 불안정 자체는 배치1 이전부터). parentMarriageId를 백필하는 순간 부모 중 한 명의 아무 저장에도 자녀들 참조가 조용히 dangling(FK 없어 DB도 못 잡음). 현재 writer 0건이라 **오늘 피해는 0** — 미래 조건부.
- **제안(배치4 #1 착수 전 선결, 배치3 마이그 대기열 편성)**: delete-recreate → 페어키 기준 reconcile(일치 페어 update·신규 create·잔여 delete, id 보존) + parentMarriage relation(onDelete: SetNull) + spouse 엣지에 marriageId 노출. 또는 자녀 참조 키를 canonical 페어 자연키로 변경.

### G23~G26. 계약·死코드 (전부 S)

- **G23** `genealogy.page.tsx:325` `(e as any).inferred` — 계약에 이미 있는 필드(persons-family-tree.ts:70)를 any로 우회, 키스톤 무력화(바로 아래 327은 캐스트 없이 사용) → 캐스트 제거 1줄.
- **G24** 위젯 `spouse`(legacy 단수) prop 死분기(person-genealogy-infographic.tsx:329) — 두 호스트 모두 spouses 배열 항상 전달이라 도달 불가 → prop·분기·호스트 전달 삭제.
- **G25** BFS Step6 '배우자의 자녀'(repo:4599, take 40)는 임베드가 렌더하지 않는데 페치 + truncation 배너 대상(constants.ts:31) — 화면에 없는 그룹의 '일부만 표시' 유령 배너 가능 → 임베드에서 렌더하든지, truncationBanner에서 미렌더 scope 필터+서버 옵트아웃.
- **G26** family-tree useQuery가 `enabled: !!personId`로 **패널 마운트 즉시** BFS 풀 페치(person-detail-panel.tsx:430, 사용처는 genealogy 탭 1곳) — 인물 모달 훑기만 해도 인당 12+단계 BFS·수백 KB. → `activeTab==='genealogy'` 게이트(+탭 hover prefetch).

---

## 6. 시각·a11y·성능 마감 (배치4·5에 합류할 신규분)

- **G27** `P3` isOwned dim 카드가 hover 시 lift+보더 강조 유지(card.tsx:550 근방 공통 hover) — cursor:default와 모순된 어포던스. 독립 페이지는 이미 중화(genealogy.page.tsx:1032-1036). dim 사유는 title 전용이라 터치·키보드 미노출, '흐림=사망/비활성' 오독 여지 → $dimmed 시 hover 중화 + 소형 칩('타 계정') 상시 노출.
- **G28** `P3` (G2에 병합) utils.ts yearOf 로컬 타임존 — 상세는 §2 G2 동반 수정.
- **G29** `P3` 배지 색상 언어 붕괴(card.tsx:425) — DescendantNode가 $role="ancestor" 재사용이라 손자녀 배지가 증조부와 같은 회색; '형제' 배지가 본인 형제 모달(amber)과 조상 형제 모달(회색)에서 상이 → AvatarRole 'descendant' 추가, 조상 형제 모달은 sibling 경로.
- **G30** `P3` 사생아 별표(*)가 이름 문자열 연결이라 ellipsis에 먼저 잘리고 aria 전무(card.tsx:128, genealogy.page.tsx:436 포함 3곳; † 도 truncation 내성은 동일하므로 두 마커 모두 NodeName 밖 분리 필요) — 1차 #25/#37 범례의 대상 확대 재평가.
- **G31** `P3` genealogy 탭 이중 헤더(SectionLabel '가족 관계' → 퀵액션 → InfographicHeader '가계도') — 저작 버튼의 소속 블록 모호(person-detail-panel.tsx:2327). InfographicHeader에 액션 슬롯 열어 편입(country 호스트 person-detail-view.tsx:223 재사용 고려해 prop 옵션화).
- **G32** `P3` 비소유 노드 비활성 사유가 hover title 전용, role/tabIndex/aria-disabled 없음(person-genealogy-infographic.tsx:336 + card.tsx 3곳 + ancestor-column.tsx:146 반복) — 배치5 #8과 병합, useNodeOpenable 확장으로 일괄.
- **G33** `P3` FamilyActionBtn native disabled+title 전용(2334) — Tab 도달 불가·터치 미표시 → aria-disabled+클릭 시 notify, 또는 '아버지: ○○' 상태 표시화.
- **G34** `P3` 픽커 인물풀 getAllPersons 중량 로드(재임·소속 중첩 include 전 인물) — **앱 전반 관행(약 18개 파일 동일)**이므로 이 호출부만 고치지 말고 공용 경량 픽커 엔드포인트(findAllForInfographic 패턴)로 일괄 전환 항목으로 승격.
- **G35** `P3` 독립 페이지 노드 카드가 앱 테마 토글이 아닌 OS prefers-color-scheme(genealogy.page.tsx:1038, --node-* 변수) — 앱 다크+OS 라이트면 한 화면 테마 이중화. Background dots·MiniMap mask·엣지 stroke 라이트 고정([[dark-theme-inline-hardcode-mapping]] 위반). **G37 처분 결정에 종속**.

---

## 7. 결정 필요 — /genealogy 독립 페이지 처분 (G37)

- **현황**: 진입점 제거(240978e30) 후 `/genealogy/:personId`로 내비게이트하는 프로덕션 코드 0건(router.genealogy.full 사용처 없음, 유일 navigate는 페이지 내부 Shift+클릭 self-nav). 그러나 라우트는 등록 잔존(browser-router.tsx:149), 1,201줄 페이지+@xyflow lazy 청크는 미커밋 이름표시순서 수정까지 받으며 **계속 유지보수 중**. inferred 점선·혼인기간 라벨·줌/팬/fitView·PNG export의 유일 구현체가 URL 직입으로만 도달 가능 — b8d0c87b6의 "구현했는데 아무도 못 보는" 착시가 이미 발생.
- **선택지**:
  - **(a) 진입점 복원** — 임베드 헤더 아이콘 등. 줌/팬·export 가치 보존, 배치4 #13(줌/fit)의 대체재. G35(테마) 수정 필요해짐.
  - **(b) 일괄 삭제** — genealogyRoute+pages/genealogy+router.genealogy+ROUTES.GENEALOGY 제거. 단 **선행 이식 필수**: inferred 시각화(G21)·혼인기간 라벨을 임베드로. 1차 #30(truncation raw 키)·#13의 유일 레퍼런스 소멸을 감수.
- 현 상태(등록된 라우트+진입점 0+계속 수정)는 최악의 중간지대 — 두 서피스 이중 유지보수가 이번 리뷰에서도 다수 항목(G21·G23·G25·G35)의 근인.

---

## 8. 추천 실행 순서 (레버리지順)

### 배치 A — "무동작·정합 회복" (S~M, 최고 레버리지, 마이그 불필요)
G1(사생아 3곳 배선, 같은 커밋) · G2+G28(BC signed year) · G3(자녀 배우자 양방향 머지) · G4($transaction) · G5+a/b/c(덮어쓰기 confirm·catch 메시지·exclude 보강) · G6(Hooks 1줄 이동)

### 배치 B — "지오메트리 마감" (S~M, 미커밋 geometry 작업과 같은 흐름에서)
G7(shift 패딩화) · G8(조상 컬럼 실측폭) · G9(배우자 스택 join) · G10~G12(상수 통일·단일 출처·스펙 브랜치) · G13(memo 안정화)

### 배치 C — "모달·저작 폼" (S 다수)
G14·G15(useModalBehavior 수렴 — 모달 토대 잔여 이관에 편입) · G16~G20(폼 검증·confirm·캐시 키·canCreate)

### 배치 D — "표면 결정 + 계약 정리"
**G37 결정 선행** → G21(inferred 임베드 이식; (b)선택 시 필수 선행) · G23~G26(캐스트·死코드·유령 배너·탭 게이트) · G35((a)선택 시)

### 배치 E — "시각·a11y·성능 마감" (기존 배치4·5에 합류)
G27·G29~G33 (+1차 #1·#16·#13·#29·범례·#8·#14·#32) · G34(공용 경량 픽커 — 앱 전반 항목으로 승격)

### 마이그 대기열 추가 (기존 배치3과 함께, 트리 정리 후)
G22(reconcile 전환+parentMarriage relation) — **배치4 #1(fork 그룹핑) 착수 전 선결**

---

## 부록 — 적대적 검증 탈락 4건 (재발견 방지)

1. ~~fatherId/motherId/spouseId 대상 소유권 미검증~~ — 반박됨(스코프 정책상 공개 트리+게이팅이 의도된 결정, 서버 update는 소유 스코프 경유).
2. ~~성별 'F'/'M' 레거시 리터럴 미인식~~ — 반박됨(DB enum MALE/FEMALE만 존재, 레거시 값 유입 경로 없음).
3. ~~혼인일·메모 표시 지면 전무~~ — 반박됨(개요 탭 SpouseDetailSection이 표시). 트리 내 구분 gap만 G21로 존치.
4. ~~country 호스트 렌더 상이가 결함~~ — 반박됨(폴백 렌더는 의도된 점진 표시; 다만 G3 수정 시 country 호스트도 함께 좋아짐).

> 리뷰 방법 메모: 후보 56 → 검증 통과 52 → 근인 통합 39(G1~G37 + G5a-c·G28 병합). P0 없음.
> 1차 리뷰 대비 신규 근인은 대부분 (i) 배치1~2 구현의 마지막 1마일 미배선, (ii) 하향만 고친 geometry의 상향 잔여,
> (iii) 진입점 제거로 생긴 표면 이중화에서 나왔다.
