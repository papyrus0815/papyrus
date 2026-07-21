# 사건 상세 상위·하위 사건 처리 개선 검토

> **리뷰 범위**: 사건 *상세 페이지*의 계층(hierarchy) 처리 — 상위(parent) 지정·변경·해제, 하위(child) 추가·제거·표시, 조상 breadcrumb, 연결 후보 검색, 관련 서버 계약(link-candidates·updateEvent). 목록 뷰는 제외.
> **방법**: 7개 렌즈(fe-correctness·be-correctness·ux-ia·a11y·edge-bc-scale·consistency·perf-resilience)가 발견하고 각 항목을 2인 적대검증. 원시 발견 약 40건을 근본 원인별로 병합해 **P2 6건 · P3 19건**으로 정리(중복 다수는 childEventIds 낙관 미반영·updateMany deletedAt 부재·breadcrumb 죽은 코드 세 뿌리에 수렴). **P1(즉시 광범위 손상)은 없음** — 무결성 결함은 모두 특정 시퀀스/레이스 조건을 요구.
> 전건 **무마이그레이션**. confidence: CONFIRMED > PLAUSIBLE > CONTESTED.

---

## 근본 원인 클러스터(요약)

| # | 근인 | 파급 결함 | 대표 지점 |
|---|------|-----------|-----------|
| **R1** | `childEventIds`/`parentEventId`가 낙관 갱신에서 제외돼 캐시(`event.childEvents`)가 refetch 전까지 stale, 파생된 `childIdsRef`도 헛방어 | 다중선택/연속제거 무성 유실, 선택 체크 미반영, 상위 지정/해제 지연·깜빡임 | `use-event-mutation.ts:27-39,160-260` / `detail-network.tsx:143,152,157` |
| **R2** | `updateEvent`의 하위 재설정이 `updateMany({parentEventId:id}→null)`에 `deletedAt` 필터 없이 전량 detach + 비트랜잭션 delete-recreate | 소프트삭제 자식 부모 영구 유실, 부분 실패 시 고아, 동시 lost-update | `event.service.ts:484-505` |
| **R3** | `loadEventDetail`이 `parentEvent: true`(단일레벨)만 include, `childEvents`엔 `category` 누락·`eventSections/eventImages` 과적재 | 조부모 breadcrumb 죽은 코드, 하위 카드 회색 폴백, 응답 비대 | `event.controller.ts:829-840` |
| **R4** | 소프트삭제 정책이 경로마다 비대칭(childEvents는 `deletedAt:null`, parentEvent·findByParentEventId·GET/PUT은 무필터) | 유령 부모·유령 자식 노출, 삭제 사건 직접 조회·수정 | `event.controller.ts:820,829,947` / `repository.ts:47` |
| **R5** | BC/구조화 날짜 표기 규약이 상세 카드 포매터에 미적용, 정렬은 `startDate desc`(NULL last) | 하위 카드 '-44년', BC 후보 목록 하단 몰림 | `iso-date.ts:211` / `event.controller.ts:657` |
| **R6** | 공용 `SelectModal`이 `useModalBehavior` 미채택(규약 위반) + 상태 aria 미노출 | 계층 편집 UI 전반의 a11y(dialog/Esc/트랩/선택상태/live) 결여 | `select-modal.tsx` |
| **R7** | 검색 후보 계약이 has-more/오류/상태코드를 표면화하지 않음 | truncation 오탐, fetch 실패가 '결과 없음'으로 위장 | `detail-network.tsx:71,164` / `controller.ts:645` |

---

## P2 — 데이터 무결성·핵심 접근성

### P2-1. 하위 사건 연속 다중선택/연속제거 시 먼저 고른 자식이 무성 유실 (R1)
- **심각도** P2 · **confidence** CONFIRMED · **마이그** 불필요
- **파일** `apps/web-admin/src/pages/events/detail/components/detail-network.tsx:143,152` · `use-event-mutation.ts:27-39,160-260`
- **문제(재현)**: `childEventIds`는 `OPTIMISTIC_SCALAR_FIELDS`에 없고 `buildOptimisticEvent`에도 분기가 없어, `{childEventIds}`만 담은 patch는 `changed=false`로 null 반환→`onMutate`가 캐시를 건드리지 않는다. `children→childIds→childIdsRef`는 전부 `event.childEvents` 파생이라 refetch 완료 전까지 stale. `onSuccess`의 `isMutating===0` 게이트가 버스트 중 self-refetch를 막아 stale 창을 버스트 전체로 넓힌다. 하위 추가 모달은 multiple이라 선택해도 닫히지 않는 것이 정상 흐름 →
  - 자식 0개에서 A 클릭(`onPatch [A]`) 직후 B 클릭 시 `latest=childIdsRef.current=[]`→`onPatch [B]`. 서버 delete-recreate라 A가 소리 없이 detach, 3연속이면 마지막 1건만 생존.
  - `removeChild`(L152)는 ref조차 안 쓰고 렌더 시점 `childIds`를 캡처 → `[A,B,C]`에서 A 제거 후 B 제거 시 `[A,C]`로 A가 부활.
  - `selectedValues={childIds}`(L365)도 stale이라 방금 고른 항목 체크가 안 떠 재클릭·연속 클릭을 부추김(피드백 부재가 도달성을 오히려 높임).
- **권고**: `buildOptimisticEvent`에 `childEventIds→childEvents` 낙관 재구성 분기 추가(신규 id 이름은 link-candidates/all 캐시에서 보강, 못 찾으면 그 필드만 낙관 생략하는 기존 `related*` 패턴 재사용). 그러면 `childIds/childIdsRef/selectedValues`가 즉시 전진해 연속 선택·제거 누적과 체크 피드백이 동시 해결. 병행으로 (a) `removeChild`도 동일 base 사용, (b) 옵션 클릭 pending 가드, (c) 동일 사건 mutation에 `scope.id` 부여로 concurrent last-writer-wins 제거. 같은 페이지 `onPersonEntityLink`가 이미 `getQueryData` 스냅샷+낙관 `setQueryData`로 이 레이스를 해결한 선례가 있음 — 그 확립된 패턴을 재사용.
- **주의**: 낙관 반영 시 `use-undoable-patch`의 `buildInverse`(event.childEvents 기준)와 `onError` 롤백 경로가 새 캐시 형태와 정합하는지 확인.

### P2-2. 소프트삭제 자식의 부모 영구 유실 + 비트랜잭션 부분실패 (R2)
- **심각도** P2 · **confidence** CONFIRMED(부모 유실) / PLAUSIBLE(txn 부분실패·lost-update) · **마이그** 불필요
- **파일** `apps/api/src/libs/event/application/event.service.ts:484-505`
- **문제(재현)**:
  1. **소프트삭제 자식 부모 유실**: `updateMany({where:{parentEventId:id}, data:{parentEventId:null}})`에 `deletedAt:null`이 없어 이 부모에 딸린 *소프트삭제된* 자식의 `parentEventId`까지 null로 만든다. `deleteEvent`는 `deletedAt`만 세팅하고 부모 FK를 보존하므로 그 자식은 여전히 `parentEventId=id`라 매칭됨. 한편 `loadEventDetail`의 childEvents는 `where:{deletedAt:null}`이라 프론트가 만드는 `childEventIds`에 삭제 자식이 애초에 없어 재링크에서도 빠진다. 이후 `restoreEvent`는 `deletedAt`만 해제하고 `parentEventId`를 복원하지 않으므로 → **부모 P에 활성 자식 A와 소프트삭제 자식 D(3일 유예)가 있을 때, P의 자식목록을 한 번이라도 편집하면 D의 부모가 null로 확정되고, D 복구 시 부모 잃은 고아**가 된다. 사용자가 D를 건드린 적도 없는 무성·비가역 손실. `assertHierarchyLinkable(L571)`의 소프트삭제 자식 관용 예외는 프론트가 D를 보낼 방법이 없어 무의미.
  2. **비트랜잭션**: `updateMany`(전량 detach)→`Promise.all(개별 update 재링크)`→본체 `events.update`가 `$transaction` 밖 순차 실행. 재링크 중 하나라도 실패(동시 하드삭제 P2025·DB 오류)하면 이미 커밋된 detach는 롤백되지 않고 본체 update도 실행되지 않아 '자식 고아 + 본체 미저장' 반쪽 상태. `countryRelations·eventSections·eventImages·relatedPersons`도 전부 동일 비트랜잭션 위험 공유.
  3. **lost-update(부수)**: `setParent`가 자식 상세에서 `{parentEventId}`만 보내는 양방향 writer라, P 상세를 `[A,B]`로 로드한 뒤 다른 세션이 C를 P에 붙이면 P에서 B 제거 시 `updateMany`가 A,B,C 전부 detach하고 A만 relink → 만지지 않은 C가 고아.
- **권고**: (a) `updateMany` where에 `deletedAt:null` 추가(살아있는 자식만 detach — 소프트삭제 자식 FK 보존, `assertHierarchyLinkable` 설계 의도와 정합). (b) detach+재링크+본체 update를 `prisma.$transaction`으로 원자화. 재링크는 `updateMany({where:{id:{in:childEventIds}}, data:{parentEventId:id}})` 단일문으로 바꿔 N회 왕복 제거. (c) lost-update는 전체목록 덮어쓰기 대신 add/remove 차분(diff) 또는 낙관적 락이 필요 — 다만 이는 별도 백로그.

### P2-3. 사건 제목 유일성 검사가 전역(계정·삭제 무관) + 빠른등록 자식 무성 드롭
- **심각도** P2 · **confidence** CONFIRMED · **마이그** 불필요
- **파일** `apps/api/src/libs/event/application/event.service.ts:109,351` · `event.prisma.repository.ts:36`
- **문제(재현)**: `findByTitle`=`findFirst({where:{title}})`가 `createdById·deletedAt`을 스코프하지 않음(`title`엔 DB `@unique` 없음 — 순수 앱 강제 사고). ①타계정이 '즈다 전투'를 이미 등록했으면 내 생성이 409로 막히고 타계정 데이터 존재를 누설(나머지 소유권 로직과 불일치). ②내 사건을 소프트삭제해도 제목이 점유돼 재생성 시 409(활성 목록에 없어 원인 불명). ③`createEvent`의 `childEvents` 빠른등록은 각 자식을 재귀 `createEvent`로 만드는데(L247-264), 자식 제목이 전역 누군가와 겹치면 `ConflictException`이 던져지고 catch(L266-270)가 `console.error`만 남기고 상위는 유지 → **자식이 왜 안 생겼는지 사용자가 알 수 없는 무성 드롭**.
- **권고**: `findByTitle`을 `{title, createdById, deletedAt:null}`로 스코프(`updateEvent`는 자기 id 제외 유지). 제네릭 메서드라 다른 호출자 확인 후 스코프 변형 추가 또는 필터 인자 전달. 빠른등록 자식 실패는 응답에 부분성공/실패 목록으로 표면화.

### P2-4. 빠른등록 자식(childEvents)이 네이티브 `new Date` 파싱 + 구조화 필드 미설정 (R5)
- **심각도** P2 · **confidence** PLAUSIBLE · **마이그** 불필요
- **파일** `apps/api/src/libs/event/application/event.service.ts:249-264`
- **문제(재현)**: `childEvents` 자동 생성이 컨트롤러 `parseEventDate`(구조화 BC 파서)를 우회하고 `startDate: childData.startDate ? new Date(...) : null`로 직접 파싱하며 `startEra/startYear/startMonth/startDay`를 미전달. 규약상 DATETIME은 AD1000+만 저장, BC·고대는 구조화 필드가 진실. **실제 실패 모드는 '무성 드롭'이 아니라 조용한 손상**: 검증자 실측상 `new Date('-0044-03-15')`는 Invalid가 아니라 2044로 파싱됨(2자리 연도 규칙) → BC 44가 AD 2044로 둔갑 + 구조화 필드 공백. AD 1000 미만 자식은 MySQL DATETIME 범위 밖으로 예외→catch 드롭. **도달성 주의**: web-admin·mobile 어디에도 `childEvents`(제목+날짜) 입력 UI가 없고 주 경로는 `childEventIds`(기존 사건 링크)라 현재 라이브 진입점 없음(데드코드 아닌 라이브 API 계약이나 UI 미배선).
- **권고**: 빠른등록 UI 배선 전에 함께 수정 — 자식 날짜도 `parseEventDate`를 경유해 `date/era/year/month/day`(+end*)를 산출·전달하거나 동일 파서를 공용 util로 추출. catch가 실패를 삼키지 말고 드롭 개수를 호출자에 신호.

### P2-5. 연결 피커 `SelectModal`이 dialog 시맨틱·Esc·포커스 트랩·복원·닫기 라벨 전무 (R6)
- **심각도** P2 · **confidence** CONFIRMED · **마이그** 불필요
- **파일** `apps/web-admin/src/shared/ui/select-modal/select-modal.tsx:142-164`
- **문제(재현)**: 상위/하위 연결의 유일 진입 UI(이자 앱 전역 ~30-50 콜사이트 공용 피커)가 `useModalBehavior`를 안 쓰고 손수 만든 portal이라 — ①`keydown` 핸들러 전무 → Esc 닫기 불가(오버레이 `onClick`은 마우스 전용). ②포커스 트랩 없음 → 검색창(`autoFocus`) 뒤 Tab이 배경으로 유출. ③`role=dialog`·`aria-modal`·`aria-labelledby` 없고 배경이 inert/aria-hidden 아님 → SR browse 사용자는 모달 열림을 인지 못 함. ④선택 시 언마운트로 포커스가 body로 유실 → 트리거로 복원 안 됨. ⑤닫기(×) 버튼에 aria-label/텍스트 없음. 대조군 `confirm-dialog.tsx:80`은 `useModalBehavior`로 전부 표준 제공, `web-admin/CLAUDE.md` '새 모달은 반드시 useModalBehavior' 규약 위반.
- **권고**: `useModalBehavior(isOpen,onClose,containerRef,initialFocusRef)`로 감싸기(containerRef→`S.SelectModal`, initialFocusRef→검색창 또는 첫 옵션 폴백). `role="dialog" aria-modal="true" aria-labelledby`(제목 id 연결), `SelectModalClose`에 `aria-label="닫기"`. 공용 컴포넌트라 전 콜사이트 회귀 검증 필요(표면 로직 불변이라 위험 낮음).

### P2-6. `loadEventDetail` childEvents include가 대용량 `eventSections/eventImages` 과적재 + 필수 `category` 누락 (R3)
- **심각도** P2 · **confidence** CONFIRMED · **마이그** 불필요
- **파일** `apps/api/src/libs/event/presentation/event.controller.ts:830-840` (+ `event.prisma.repository.ts:29 findById`)
- **문제(재현)**: childEvents include가 `historicalCountry·eventSections·eventImages`만 담고 `category`를 뺌. `toResponseDto`가 childEvents를 재귀 매핑하며 각 자식의 모든 섹션 `content`(MEDIUMTEXT, 최대 16MB)를 직렬화 → 자식 수×섹션 길이만큼 상세 응답이 부풀고, 이 응답은 매 인라인 patch PUT + 이후 GET refetch에서 반복 전송. 반면 하위 카드가 실제 읽는 필드는 `id·title·description·startDate/precision·category`뿐이고 sections/images는 미소비. 필수인 `category`는 미적재라 `child.category=undefined`→`resolveCategory(undefined)`가 항상 DEFAULT(기타·회색 #6b7280)로 폴백 → **서로 다른 카테고리 하위 사건 카드가 전부 동일 회색 색띠**. `on-this-day`·LIST 쿼리는 `category:true`를 포함해 경로 간 불일치.
- **권고**: include를 카드가 쓰는 최소 필드로 교체 — `category:{select:{name:true}}` 추가, `eventSections·eventImages` 제거. 손자 존재 표시 필요 시 `_count:{select:{childEvents:{where:{deletedAt:null}}}}`만 얹기. `toResponseDto`가 자식엔 경량 매핑을 쓰도록 분리하거나 select 기반으로 좁힘(sections/images 제거 시 자식 `thumbnail`이 빈 값 되나 현재 소비자 없어 안전 — 향후 썸네일 필요 시 `eventImages: isPrimary만` 최소 복원).

---

## P3 — 계층 표시·데이터 일관성

### P3-1. 조상 breadcrumb 다단 표시가 죽은 코드 — parentEvent 단일레벨 include (R3)
- **심각도** P3 · **confidence** CONFIRMED · **마이그** 불필요
- **파일** `detail-hero.tsx:54-64,95-97` · `event.controller.ts:829`
- **문제**: hero가 `cursor=cursor.parentEvent`로 최대 3단(`PARENT_CHAIN_CAP=3`) walk하고 남으면 `ParentEllipsis('…')` 렌더하도록 작성됐으나, `loadEventDetail`이 `parentEvent: true`(중첩 없음)만 include→`event.parentEvent.parentEvent`가 항상 undefined. while은 1회로 끝나 breadcrumb에 직속 부모 1개만, `parentChainTruncated=Boolean(undefined)=false` 고정 → CAP·`ParentEllipsis` 전부 도달 불가 죽은 코드. 최근 손자(2단 하위) 로드 지원으로 3단 계층이 실재하므로 손자 상세에서 조부모·'더 있음' 표식이 조용히 누락(직속 부모 링크는 정상이라 2홉 우회 가능).
- **권고**: 조상 체인 전용 경량 쿼리(id·title만, 재귀 CTE 또는 반복 조회)로 breadcrumb 전용 `[{id,title}]` 배열을 내려주기(중첩 include로 늘리면 조상마다 전체 sections/images까지 과적재되므로 비권장). 다단 미지원이면 walk/CAP/ParentEllipsis를 단일 부모 표시로 축소해 죽은 코드 정리.

### P3-2. 소프트삭제 '유령 부모' 노출 + GET/PUT `deletedAt` 가드 부재 (R4)
- **심각도** P3 · **confidence** CONFIRMED · **마이그** 불필요
- **파일** `event.controller.ts:829(parentEvent 무필터),820,947` · `service.ts updateEvent 소유권 select만`
- **문제**: childEvents는 `deletedAt:null`로 삭제분 제외하나 `parentEvent: true`는 무필터. 부모 P를 소프트삭제해도 자식 C의 `parentEventId`는 그대로라 C 상세의 breadcrumb·'상위 사건' 링크에 삭제된 P가 생존 사건처럼 표시(클릭 가능). `link-candidates`는 `liveParent`로 유령 부모를 거르는데 상세만 안 걸러 경로 간 비대칭. 게다가 `loadEventDetail`의 `findUnique({where:{id}})`, `getEventById`, `updateEvent`에 `deletedAt` 가드가 없어 유령 링크 클릭 시 삭제 사건이 정상 조회·수정됨(소유권은 확인하므로 cross-account 유출은 아님).
- **권고**: `parentEvent` select에 `deletedAt` 포함→`toResponseDto`에서 삭제 부모면 `parentEvent`를 null 처리(link-candidates `liveParent` 패턴 재사용). GET/PUT에 소프트삭제 접근 정책(404 또는 복구 전용) 추가 — 단 휴지통 복원 UX가 상세 편집을 의도적으로 허용하는지 제품 확인 후 범위 결정.

### P3-3. `findByParentEventId`(GET /events/parent/:id)가 소프트삭제 자식 반환 — 유령 자식 (R4)
- **심각도** P3 · **confidence** CONFIRMED · **마이그** 불필요
- **파일** `apps/api/src/libs/event/infrastructure/event.prisma.repository.ts:47`
- **문제**: `where:{parentEventId}`만 걸고 `deletedAt` 필터 없음. 유일 소비자는 상위사건 수정 폼(`event-create-form-dashboard.tsx:740`)으로 결과를 `childEventIds` 칩으로 렌더 → 삭제된 자식이 `availableEvents`에 없어 title 조회 실패, **원시 UUID 칩**으로 노출(3일 유예 창 내). 저장 시 재전송돼도 `assertHierarchyLinkable` 예외로 통과해 손상은 없음(경미 일관성 결함).
- **권고**: where에 `deletedAt:null` 추가해 `loadEventDetail` include 정책과 통일.

### P3-4. BC 하위 사건 카드가 '-44년'으로 표기(피커는 '기원전 44년') (R5)
- **심각도** P3 · **confidence** CONFIRMED · **마이그** 불필요
- **파일** `detail-network.tsx:255-262` · `iso-date.ts:211` · `controller.ts:89-93,682`
- **문제**: `toResponseDto→formatEventDate`가 BC 자식 `startDate`를 음수연도 ISO('-0044-03-15')로 합성해 내려주고, 카드는 `formatDateRange→formatDateWithPrecision`으로 렌더하는데 이 함수가 BC 접두 없이 `${year}년`만 반환→'-44년 3월 15일'. 반면 `link-candidates`는 BC의 `startDate`를 null로 내려 `candidateDateLabel`의 `startEra==='BC'` 분기가 '기원전 '을 붙임 → **동일 사건이 피커 '기원전 44년', 하위 카드 '-44년'으로 갈림**. BC 사건을 하위로 연결한 상세를 열면 결정론적 발생.
- **권고**: 단일 출처 수정 — `formatDateWithPrecision`이 음수연도를 '기원전 {abs(year)}년'으로 표기하도록 보정하면 상세/타임라인 등 이 함수를 쓰는 모든 곳이 일괄 교정(피커 `startYear` 분기와 이중 접두 안 되게 주의).

---

## P3 — 검색·정렬·후보 계약

### P3-5. link-candidates 정렬이 `startDate desc`(NULL last) — BC·1000년 이전 사건이 바닥에 몰려 50캡에 먼저 잘림 (R5/R7)
- **심각도** P3 · **confidence** CONTESTED · **마이그** 불필요
- **파일** `event.controller.ts:657`
- **문제**: 검색 시 `orderBy:{startDate:'desc'}`인데 BC·AD1000 이전은 `startDate=NULL`(구조화 필드가 진실). MySQL DESC는 NULL을 맨 뒤로 → 고대 사건이 목록 하단에 몰려 `take=50` 캡에서 먼저 잘리고, NULL끼리는 상대 순서 비결정. 역사 앱 핵심 대상인 BC 접근성 저하.
- **이견 사유(CONTESTED)**: 한 검증자는 REFUTED — (1) `title contains` + 본인 소유 스코프라 특정 고대 사건명을 직접 입력하면 매칭돼 데드엔드 아님(50건 초과 매칭이라는 비현실적 조건 필요), (2) `truncationHint`가 잘림을 표면화하고 검색어를 좁히면 도달 가능, (3) 정렬 의도가 명시적 '시대순 내림'이라 고대가 꼬리로 가는 건 설계상 자연스러움, (4) 결정적으로 권고안(부호연도 DESC)을 적용해도 BC는 여전히 맨 아래라 truncation을 해결 못 하고 pre-1000 그룹 내부 순서만 교정. 다른 검증자는 CONFIRMED(정렬 왜곡은 조건 없이 상시 발생).
- **권고**: 실제 truncation을 바꾸려면 `NULLS FIRST`/오름차순은 정렬 의도를 뒤집는 제품 결정. 최소 개선은 pre-1000 그룹 내부를 부호연도(`startEra 부호 × startYear`)로 정렬 + 결정적 tiebreaker(`{id:'desc'}`)로 비결정성 제거. 우선순위 낮음.

### P3-6. `truncationHint` 임계가 요청 limit과 동일(≥50) — 정확히 50건에서 오탐 (R7)
- **심각도** P3 · **confidence** CONFIRMED(오탐) / PLAUSIBLE(개수 불일치) · **마이그** 불필요
- **파일** `detail-network.tsx:78,164-169` · `controller.ts:645`
- **문제**: `limit:50` 요청 + 서버 take=50 캡인데 `candidates.length>=50`에서 '50건까지만 표시 중' → 실제 50건(더 없음)이어도 잘림 오탐, '=50'과 '>50' 구분 불가. 게다가 표시 옵션은 `parentOptions/childOptions`로 자기 자신·현재 자식/부모를 걸러낸 것이라 문구 개수(50)와 실제 표시 행수(47~49)가 어긋남.
- **권고**: `limit:51` 요청 후 `candidates.length>50`일 때만 힌트 표시하고 옵션은 `slice(0,50)`(현재 `eventOptions`는 전체 사용이라 slice 누락 주의), 또는 서버가 `hasMore` 플래그 반환. 두 모달이 `truncationHint`를 공유하므로 한 곳만 고치면 됨.

### P3-7. link-candidates 조회 실패가 조용히 삼켜짐 — 오류가 '결과 없음'으로 위장, 재시도 수단 없음 (R7)
- **심각도** P3 · **confidence** CONFIRMED · **마이그** 불필요
- **파일** `detail-network.tsx:71-83` · `queryClient.ts:8` · `events.ts:206`
- **문제**: useQuery가 `isError`를 무시하고 data 기본값 `[]`, 전역 `retry:false`, `getEventLinkCandidates`는 상태코드 버린 일반 Error를 던짐 → fetch 실패 시 `candidates=[]`가 되어 `SelectModal`이 '검색 결과 없음'을 확정 표기. 사용자는 '검색이 깨짐'과 '해당 사건 없음'을 구분 못 하고 재시도 버튼도 없음(존재하는 부모를 못 붙이거나 중복 사건 생성 소지). 단 검색어를 바꾸면 새 쿼리키로 자연 재요청되어 영구 고착은 아님.
- **권고**: `isError/refetch`를 받아 `SelectModal`에 오류 전용 상태(재시도 버튼) 추가, 빈-상태와 오류-상태 구분 표기. 이 조회에 한해 retry 1~2회 허용. 진짜 '없음'(404)과 실패(500/네트워크) 구분하려면 status를 구조화 필드로 보존.

---

## P3 — UX 피드백·내비게이션

### P3-8. 상위 지정/해제가 낙관 미반영 — breadcrumb·상위 링크·댓글 게이트가 refetch까지 지연/깜빡임 (R1)
- **심각도** P3 · **confidence** CONFIRMED · **마이그** 불필요
- **파일** `detail-network.tsx:157-161` · `use-event-mutation.ts:27-39` · `event-detail.page.tsx:214,290`
- **문제**: `setParent`가 `{parentEventId}`만 보내고 모달을 닫는데 이 필드도 낙관 제외라 refetch 전까지 캐시 stale → ①'해제' 후에도 ParentLink+변경/해제 버튼이 남아 '먹었는지' 모름(재클릭 유발), ②지정 시 breadcrumb·상위 링크 지연, ③최상위에 부모 지정 시 댓글 섹션(`!event.parentEventId` 게이트)이 refetch 전까지 남았다 사라지는 깜빡임(반대로 해제 시 늦게 나타남). '저장됨' 토스트는 즉시 떠 화면과 어긋남. 데이터 손실 없이 refetch 1왕복으로 자기수렴.
- **권고**: `buildOptimisticEvent`에 `parentEventId` 분기 추가 — 해제(null)는 `parentEvent=null`도 세팅(트리비얼), 지정은 후보 캐시에서 title 보강해 `parentEvent` 스텁 함께 세팅(scalar만 세팅하면 댓글 게이트만 반영되고 breadcrumb/상위 블록은 여전히 지연).

### P3-9. 상위 피커가 손자·후손을 후보로 노출 → 순환 409가 일반 '저장 실패' 토스트로 (R7)
- **심각도** P3 · **confidence** CONTESTED · **마이그** 불필요
- **파일** `detail-network.tsx:113-116` · `event.service.ts:582-615` · `use-event-mutation.ts:117-126`
- **문제**: `parentOptions`는 직계 자식만 제외해 손자 이하 후손이 상위 후보로 노출. 후손을 부모로 고르면 서버 `assertHierarchyLinkable`이 순환을 정확히 감지해 409를 던지지만(데이터 무결성은 보호됨), 클라 `onError`는 `저장 실패: ${message}`만 표시. `setParent`가 mutate 직후 모달을 닫아 맥락도 상실.
- **이견 사유(CONTESTED)**: 여러 검증자가 REFUTED — 핵심 피해 주장('순환 때문인지 알 수 없다')이 실제와 배치. nestia `HttpError.message`가 응답 본문 원문(fetch 경로는 JSON.parse 건너뜀)이라 토스트에 한국어 순환 사유('순환 계층은 만들 수 없습니다…')가 그대로 포함됨(JSON 블롭에 감싸여 지저분할 뿐). 손자 노출은 주석에 명시된 의도적 트레이드오프(클라가 전체 후손 집합 계산 회피). 무결성 보호+사유 전달됨 → 결함이 아닌 폴리시. 반대 검증자는 CONFIRMED(절대 성공 못 할 선택지를 UI가 제시하는 UX 결함).
- **권고**: 개선한다면 폴리시성 — `onError`에서 409/`ConflictException` 감지해 raw JSON 대신 `.message`만 추출한 전용 문구('하위 계보에 있는 사건은 상위로 지정할 수 없습니다'). 근본 개선은 link-candidates에 후손 힌트를 실어 사전 제외. 우선순위 최하.

### P3-10. 하위 사건 상세에서 댓글 섹션이 안내 없이 사라짐
- **심각도** P3 · **confidence** CONTESTED · **마이그** 불필요
- **파일** `event-detail.page.tsx:214,290`
- **문제**: `parentEventId`가 있는 사건은 댓글 rail 항목·섹션이 통째 숨겨짐(백엔드 스코프상 의도, 주석 문서화). 부모 카드에서 진입한 사용자는 다른 사건엔 있던 댓글이 이유 없이 증발한 것으로 경험, 논의 경로 안내 없음.
- **이견 사유(CONTESTED)**: 한 검증자 REFUTED — 하위 사건 상세는 hero breadcrumb과 '연관' 섹션 상위 링크로 부모(댓글 있는 곳)를 항상 노출하므로 막다른 길 아님, 숨김은 문서화된 의도적 설계. 다른 검증자 CONFIRMED(빈 상태 안내조차 없는 발견성 저하).
- **권고**: additive 안내만 — 댓글 자리에 '이 사건의 논의는 상위 사건 댓글에서' + 상위 `#comments` 딥링크. 이미 브레드크럼과 중복이라 선택적.

### P3-11. 형제(sibling) 사건 간 좌우 이동 부재
- **심각도** P3 · **confidence** CONTESTED · **마이그** 불필요
- **파일** `detail-network.tsx:249-295` · `detail-hero.tsx`
- **문제**: 하위 사건 상세에 같은 부모의 다른 형제로 바로 이동하는 수단 없음 → 연속된 하위(전쟁의 여러 전투)를 순서대로 읽을 때 매번 부모 왕복.
- **이견 사유(CONTESTED)**: REFUTED 우세 — 이는 correctness 버그가 아닌 nice-to-have 부재이고, 핵심 근거('부모의 childEvents 순서가 이미 존재')가 거짓. `findById`가 `parentEvent: true`(얕은 include)라 상세 페이로드에 형제 배열이 없어 별도 fetch(`findByParentEventId`) 필요. '이미 있는 데이터 배선'이 아님.
- **권고**: 채택 시 부모의 childEvents를 별도 조회해 시간순(`compareEventStart`, BC 안전) 이전/다음 링크. 필수 아님.

### P3-12. 상위=텍스트 링크 vs 하위=리치 카드 비대칭 + 손자 카운트 미표시 + 부제 상위 누락 + docstring stale
- **심각도** P3 · **confidence** CONFIRMED(사실)/CONTESTED(조치 필요성) · **마이그** 불필요
- **파일** `detail-network.tsx:31-36,211-217,224-244,251-291`
- **문제**: ①상위는 제목만의 얇은 링크, 하위는 날짜·설명(+P2-6 수정 후 카테고리) 카드라 시각 위계 역전. ②childEvents include에 nested childEvents/`_count` 없어 하위 카드가 '가지/잎'(손자 보유) 구분 단서 없음. ③'연관' 섹션 부제가 `자식 N·키워드 N`만 세고 상위 미반영 — 상위만 있고 자식·키워드 없는 사건은 부제 자체가 안 뜸(단, 상위 블록 본문은 항상 렌더돼 정보 은닉은 아님). ④docstring이 나중 추가된 상위 블록을 미언급(유지보수 오해).
- **이견 사유(CONTESTED)**: 비대칭은 단일(상위) vs 컬렉션(하위) 카디널리티 차이로 정당화 가능한 의도적 IA일 수 있어 강제 통일 전 제품 판단 필요. docstring/부제 갱신은 무기능 정리로 유효.
- **권고**: (무논쟁) docstring·부제를 상위/하위/키워드 3요소로 갱신(부제 조건에 `!!parentEvent` OR 추가, '상위 1' 세그먼트 — 상위는 최대 1이라 존재 배지). 손자 배지 필요 시 `_count:{select:{childEvents:true}}` 추가(P2-6과 함께). 상위 링크에 날짜 소폭 보강은 선택.

---

## P3 — 접근성(a11y)

### P3-13. 다중선택 '하위 사건 추가'에서 선택 상태가 보조기술에 미전달 (R6)
- **심각도** P3 · **confidence** CONFIRMED · **마이그** 불필요
- **파일** `select-modal.tsx:213,229-238`
- **문제**: 옵션이 순수 `<button>`이고 `aria-pressed/aria-selected/role` 없음. 선택 여부가 `$active` 배경색+장식 체크 SVG(대체텍스트·aria-hidden 없음)로만 표현 → SR 사용자가 Enter로 토글해도 선택/해제 상태를 알 수 없음(WCAG 4.1.2). 단일 '상위 지정'도 현재 부모 옵션 구분 불가.
- **권고**: multiple 모드 옵션에 `aria-pressed={isSelected}`, 단일 모드에 `aria-selected`/`aria-current`. 체크 SVG는 `aria-hidden`. (`role=option/listbox` 전환은 화살표 키내비까지 안 하면 회귀 위험 — 버튼+aria-pressed가 안전. 1.4.1 색 의존 주장은 체크 형태 단서가 있어 약함, 실질 결함은 4.1.2.)

### P3-14. 검색 중·로딩·50건 초과 상태가 `aria-live` 없이 조용히 갱신 (R6/R7)
- **심각도** P3 · **confidence** CONFIRMED · **마이그** 불필요
- **파일** `select-modal.tsx:184,167` · `detail-network.tsx:164-169`
- **문제**: 로딩·검색중·결과없음·목록교체·truncationHint가 전부 비-라이브 div 시각 텍스트로만 렌더. 검색창 `autoFocus`로 포커스 유지한 채 아래만 교체되어 SR이 어떤 전환도 낭독받지 못함(WCAG 4.1.3).
- **권고**: `SelectModalContent`(또는 시각적 숨김 영역)에 `role="status" aria-live="polite"` 부여, 로딩/검색중/결과 개수/절단 힌트를 announce. `truncationHint`를 `headerExtra`(비-라이브) 대신 라이브 리전에 포함.

### P3-15. 상위 '변경/해제' 버튼이 24px 미만 초소형 타깃 + 파괴적 '해제' 무확인
- **심각도** P3 · **confidence** CONTESTED · **마이그** 불필요
- **파일** `detail-network.tsx:233-238` · `TextBtn L484-498`
- **문제**: `TextBtn`이 `padding:0; font-size:12px`라 WCAG 2.5.8(24×24) 미달, '해제'는 `setParent(null)`을 확인 없이 즉시 실행(하위 이동은 confirm 사용과 대조).
- **이견 사유(CONTESTED)**: 한 검증자 REFUTED — (1) `HierRow`의 `gap:12px`로 2.5.8 Spacing 예외(중심 24px 원 미겹침) 충족 가능, (2) 같은 파일 `removeChild`·`removeKeyword`도 confirm 없어 '해제 무확인'이 이상치가 아님(파일 관례 일치), (3) 해제는 FK만 비우고 재지정으로 복구 가능(데이터 손실 아님). 다른 검증자 CONFIRMED(세로축 미달은 실재).
- **권고**: 개선 시 `TextBtn`에 `min-height/min-width 24px`, '해제'에 `confirm({danger:true})` — 단 '해제만' 추가하면 `removeChild/removeKeyword`와 새 불일치 생기므로 제거 동작 전반의 확인 정책을 함께 결정.

### P3-16. '되돌리기'(유일 undo)가 키보드로 사실상 도달 불가
- **심각도** P3 · **confidence** PLAUSIBLE · **마이그** 불필요
- **파일** `use-undoable-patch.tsx:93-121`
- **문제**: 모든 상·하위 patch의 되돌리기가 5초 토스트 버튼뿐(텍스트는 polite 낭독되나 포커스 이동 없음, DOM 말단 bottom-center, 5초 자동 소멸, Ctrl+Z 미바인딩). 키보드 전용 사용자가 5초 내 도달 어려움.
- **이견 사유(PLAUSIBLE)**: '도달 불가'는 다소 과장 — UndoBtn은 실제 포커스 가능하고, 파괴적 흐름에선 트리거가 언마운트돼 포커스가 body로 떨어지므로 Shift+Tab 한 번이면 토스트 도달. 또 상·하위 편집은 키보드 접근 가능한 인라인 컨트롤로 재조작해 되돌릴 수 있어 데이터 손실 아님(편의 격차).
- **권고**: 파괴적 patch(해제·제거)에 confirm 다이얼로그를 붙이면 접근성·복구 두 문제 동시 해결. 토스트 유지 시 등장 시 UndoBtn 포커스 이동 또는 키보드 포커스 시 타이머 pause(`startPause/endPause`). 앱 전역 공통 패턴이라 `notify` 헬퍼 레벨 개선이 일관적.

### P3-17. 상위/하위/키워드 하위 블록이 프로그래매틱 그룹/라벨 없이 스타일 div
- **심각도** P3 · **confidence** PLAUSIBLE · **마이그** 불필요
- **파일** `detail-network.tsx:221-222,249-250,297-298`
- **문제**: 세 블록 라벨이 `KeywordsLabel`(styled.div, heading/label 시맨틱 0)이고 `HierBlock/KeywordsBlock`에 `role=group`/`aria-labelledby` 없음. 컨트롤 점프(Tab) 내비게이션 시 각 컨트롤이 상위/하위 어느 구역인지 그룹 맥락 없이 들림(WCAG 1.3.1). 단 라벨이 각 블록 첫 자식이라 선형 낭독 모드엔 정보 존재, 대부분 컨트롤은 자체 aria-label 보유 — 진짜 모호한 건 상위 블록의 제네릭 '변경'/'해제'뿐.
- **권고**: 각 블록에 `role="group" + aria-labelledby`(라벨 id 연결) 또는 라벨을 `h3` 승격(부모 h2 순서 유지). 최소 즉효는 '변경'/'해제'에 맥락 `aria-label`('상위 사건 변경/해제').

---

## P3 — 성능

### P3-18. PUT 응답의 전체 상세를 `onSuccess`가 버리고 즉시 재invalidate → 저장 1회당 무거운 상세 2회 왕복 (R3)
- **심각도** P3 · **confidence** CONFIRMED · **마이그** 불필요
- **파일** `use-event-mutation.ts:84,91-93` · `controller.ts:1157`
- **문제**: `@Put(':id')`가 `loadEventDetail` full 응답(childEvents·parentEvent·군사·전체 섹션 content)을 반환하는데, `onSuccess`가 `_data`를 무시하고 `detailKey`를 invalidate해 동일한 무거운 GET을 재유발. 사소한 스칼라 저장조차 full 상세 조립·전송(폐기)→같은 상세 재조회. 아이러니하게 낙관 포기한 childEvents·parentEvent가 버려진 PUT 응답에 이미 담겨 있음.
- **권고**: `isMutating===0`(마지막 in-flight)일 때 invalidate 대신 `setQueryData(detailKey, data)`로 PUT 응답 시딩 → 두 번째 GET 제거 + 계층 낙관 공백까지 즉시 반영. out-of-order 방지는 기존 게이트 유지. (동시 편집 극소수 케이스는 시딩 후 `refetchType:'none'` 하이브리드로 최종 정합.)

### P3-19. 하위 사건 카드 그리드 무제한 렌더 + 카드마다 hover prefetch
- **심각도** P3 · **confidence** PLAUSIBLE · **마이그** 불필요
- **파일** `detail-network.tsx:251-291,268-269`
- **문제**: `children.map`으로 상한/가상화 없이 전량 렌더(hero의 참여자 4·국가 8 캡과 비대칭), 각 카드 `onMouseEnter/onFocus`마다 `prefetchEvent`. 수십~수백 하위를 가진 상위 사건에서 렌더/프리페치 표면 확대.
- **이견 사유(PLAUSIBLE)**: '성능 저하' 결론은 재현 조건 미확립 — 직계 자식 수십~수백은 드문 pathological, prefetch는 hover 의도 기반+`staleTime` no-op이라 최악값 한정. 스크롤 자체는 트리거 아님(포인터 진입 필요).
- **권고**: 하위 카드에 표시 상한(12~24)+'외 N개 보기'로 hero와 대칭(가상화까지 불필요), prefetch는 첫 상한 이내 카드에만. 백엔드 childEvents include에 방어적 take 병행 검토.

---

## 배치 실행 순서 제안 (레버리지順, 무마이그 우선 — 전건 무마이그)

**배치 1 — 데이터 무결성 (P2, 최우선)**
1. **P2-1** childEventIds 낙관 재구성 (front, `buildOptimisticEvent` 분기) — R1 뿌리, P3-8도 동시 해소. `onPersonEntityLink` 선례 재사용.
2. **P2-2** `updateMany` where `deletedAt:null` 추가 + `$transaction` 원자화 (server) — R2 뿌리.
3. **P2-3** `findByTitle` 계정·삭제 스코프 + 빠른등록 자식 실패 표면화 (server).

**배치 2 — 서버 계약·응답 정합 (P2/P3, 성능+표시)**
4. **P2-6** childEvents include에 `category` 추가·`eventSections/eventImages` 제거 (server) — P3-12 손자 배지, P3-4와 인접, 카드 회색 폴백 해소.
5. **P3-18** PUT 응답 `setQueryData` 시딩 (front) — 이중 왕복 제거.
6. **P3-2·P3-3** 소프트삭제 정책 통일(parentEvent `deletedAt` 처리, `findByParentEventId` 필터, GET/PUT 가드) (server) — R4 뿌리.

**배치 3 — 접근성 (P2/P3)**
7. **P2-5** `SelectModal` → `useModalBehavior` + dialog/aria (shared, ~30-50 콜사이트 회귀 검증) — 최대 레버리지.
8. **P3-13·P3-14** 옵션 `aria-pressed`·검색 상태 `aria-live` (같은 파일, 7과 함께).
9. **P3-16·P3-17·P3-15** 파괴적 동작 confirm 정책·블록 그룹 라벨·타깃 크기 (front, 제거 동작 전반 정책 결정 동반).

**배치 4 — BC·검색 UX (P3)**
10. **P3-4** `formatDateWithPrecision` BC 표기 (단일 출처, 광범위 파급).
11. **P3-6·P3-7** truncationHint `limit+1`·검색 오류 상태 표면화 (front, 같은 useQuery).
12. **P3-5** link-candidates 정렬 tiebreaker/부호연도 (server, CONTESTED — 제품 판단 후).

**배치 5 — 표시·내비 다듬기 (P3, 선택)**
13. **P3-12** docstring·부제 갱신(무논쟁 부분), **P3-1** breadcrumb 조상 체인 경량 쿼리 or 죽은 코드 정리, **P3-19** 하위 카드 캡.

**제품 결정 대기(구현 보류)**: P2-4(빠른등록 UI 미배선 — 배선 전 함께 수정), P3-9·P3-10·P3-11(CONTESTED, 폴리시/기능 추가 — 채택 여부 결정 후).

**마이그레이션 필요 항목**: **없음**. 전 항목이 include/필터/낙관 로직/aria/포매터 수정으로 스키마 무변경.