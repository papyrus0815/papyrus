# 인물 상세 「전기」의 용어 설명·엔티티 링크 개선 검토서

- 작성일: 2026-07-11
- 상태: **검토 완료 · 배치 1·2 완료 + 배치 3·4 부분 + 배치 0 결정 확정 · 커밋·푸시 완료**(2026-07-11, feature/service-manager-v2 3커밋 `35abbd213`/`4faa66cbc`/`65fb52ea2`). 배치 0 = 「F1 역참조까지」(D-1 전역·D-2 국가스코프 살림·D-4 F1 구축, D-3 각주 보류 — §7-4). F1 구현 명세 §8. **D1(entity-link-search) 미커밋**(팀원 middleName 검색 WIP와 한 hunk 줄단위 혼재 → 그 WIP 커밋 후). 배치 5(마이그: F1·D-2 배선)는 스키마 정리 후 실행. 배치1 B2/B3/D1+B1완화, 배치2 C1~C5(+N1/N2), 배치3 D4 완료·D2-light·D3 보류 — api tsc0·web tsc0·변경파일 신규 lint0, 적대 리뷰(배치1·2) sound. 배치 4~5 및 배치 0 결정 게이트 미착수. **커밋 보류**: 팀원의 진행 중 커밋이 인덱스에 스테이징돼 있고 2개 파일(entity-link-search·person-detail-panel)이 병렬 WIP와 줄 단위로 엉켜, 팀원 커밋 랜딩 후 클린 베이스에서 커밋 예정.
- 구현 상세(배치 2 — 툴팁 UX·a11y, 전부 프론트/무마이그): 신규 공용 `RichTextEntityTooltip`(shared/ui/rich-text-read-view) — **C3** body 포털(framer transform 조상 밖 렌더로 중첩 모달 위치 어긋남 해소)·**C2** useLayoutEffect 뷰포트 클램프/flip·**C1** role=tooltip+aria-live·**C5** 「더 보기」 액션(용어→국가, 가문→구성원 모달). 공용 훅/래퍼(모든 4개 툴팁 소비자에 전파): **C1** 트리거 span tabindex/role 부여(식별자 있는 것만·N2)+Enter/Space→트리거 rect로 click 합성, **C4** term/dynasty 세션 캐시(재fetch·「로딩…」 깜빡임 제거)+응답으로 표제 갱신(개명 반영)+수정/삭제 시 무효화(N1, rich-text-editor 배선). person-detail-panel이 신규 컴포넌트 채택. **잔여**: country-elections·cabinets·inline-rich-text는 자체 팝오버 유지(C1 트리거·C4 캐시는 자동 수혜, C2/C3/C5는 미적용) — 공용 컴포넌트 이관은 후속.
- 구현 상세(배치 1): **B2** `glossary.controller.ts` list — `eventId` 미지정 시 `where.eventId=null` 강제(사건 전용 용어 누출·cascade dangling 차단). **B3** `BiographySectionDto`(create/update 공유) — `@MaxLength(500)` title·`@MaxByteLength(65535)` content·`@MaxLength(100)` sectionType + 신규 `libs/shared/max-byte-length.validator.ts`(TEXT 바이트 상한, 다국어 정확). **D1** `entity-link-search.controller.ts` — person을 `accountId`·event를 `createdById`로 actor 스코프(`getActorAccountId()`, 읽기 경로와 대칭이라 데드엔드만 제거·정상 링크 무손실). **B1 완화** `term-modals.tsx` — 전역 용어 편집 시 파급 경고 배너(문서전용 분기 제외). *(주의: `create-person.dto.ts`는 병렬 WIP와 엉킴 — 커밋 시 내 hunk만 선별.)*
- 요구: 인물 상세 전기(생애 서술)에서 (1) 용어 설명(glossary/term 툴팁)과 (2) 엔티티 링크(person·event·company·country·dynasty…)를 더 낫게 만들 여지를 다각도로 검토한다.
- 방법: 7개 렌즈(용어 데이터모델·용어 저작·툴팁 읽기·엔티티 저작·엔티티 읽기·정합성/보안·파리티/완전성)로 코드 근거 발굴 → **발견 36건을 전부 file:line 실측으로 적대 검증**(CONFIRMED 36 / PLAUSIBLE 0 / REFUTED 0). 검증 과정에서 초기 가설 3건이 정정됨(§5).
- 범위 경계: 전기 본문 리치텍스트의 **용어·엔티티 링크**에 한정. 가족/경력 등 정본 관계 모델, 연보·개요 IA는 별도 검토서 소관.

---

## 0. 결론 요약

전기의 용어·엔티티 파이프라인은 **읽기(툴팁·딥링크)는 갖춰졌으나 저작·데이터모델·안전판이 사건(event) 중심 설계에 얹혀 있어 인물 전기를 1급으로 취급하지 않는다.** 대부분의 결함이 이 한 뿌리에서 파생된다.

**먼저 결정해야 할 하나의 갈림길(코드 0):**

> **용어(GlossaryTerm)는 여러 문서가 공유하는 「전역 참조 사전」인가, 문서별 「인라인 주석」인가?**
> 현재 인물 전기는 `documentScope`를 안 넘겨 **전역 용어만** 만들 수 있다 — 사건이 누리는 「설명 넣기」(문서 전용 임시 주석)·「이 문서에만 사용」이 전기에서 통째로 사라졌고, 전기에서 만든 모든 용어는 되돌릴 수 없이 전역 사전에 누적된다. 이 결정이 배치 5(마이그)의 방향을 가른다.

**레버리지 최상위(결정 없이 지금 할 수 있는 것):**
1. **[P1 보안]** 전역 용어 쓰기에 권한 경계가 전무 — 한 전기의 「용어 수정」한 번이 무관한 타 문서·타 계정 툴팁을 조용히 바꾼다(#26).
2. **[P2 버그·무마이그 S]** `glossary list`가 `eventId` 미지정 시 **모든 사건의 문서 전용 용어를 전기 검색에 노출** — 사건 삭제 시 전기 툴팁이 cascade로 사망(#27/#34). `where.eventId = null` 한 줄로 차단.
3. **[P2 무마이그]** 크로스계정 인물/사건 링크가 **404/403 데드엔드**(isOwned 가드 부재 — 가계도·동시대수장 선례 미적용, #21).
4. **[P2 무마이그 M]** 툴팁이 **키보드·스크린리더로 열 수 없고**(#12) 뷰포트 경계에서 **잘린다**(#13/#25).

전체 36건 중 **P1 1 · P2 17 · P3 18**. 중복 통합 시 고유 이슈 ~24건. 아래 §3 배치는 (보안·버그) → (읽기 UX/a11y) → (라우팅 정합성) → (저작 발견성) → (데이터모델·마이그) 순 레버리지 정렬.

---

## 1. 현황 진단 (검증된 코드 사실)

### 1-1. 용어(Glossary) 파이프라인
- **모델**: `GlossaryTerm`(`libs/db/prisma/event.prisma:405-433`) — `name`(VarChar 1000)·`description`(Text)·`countryId`·`historicalCountryId`·`eventId`. **`personId` 없음.** `eventId`만 `onDelete:Cascade`, country/hist는 `SetNull`. `event.prisma` 파일에 사는 이유는 이 기능이 사건 전용으로 태어났기 때문.
- **컨트롤러**(`apps/api/src/libs/glossary/presentation/glossary.controller.ts`): 클래스 `@UseGuards(AuthGuard('jwt'))`만. `list`는 `countryId`/`historicalCountryId`/`eventId`/`q` 필터. **update/delete에 소유자 검사 없음** — 전면 전역 테이블.
- **문서 스코프 타입**(`rich-text-editor.tsx:520`): `DocumentScope = { type:'event'; id }` **단 하나.** `documentScope`를 넘기는 사용처는 전 코드베이스에서 `event-create-form-dashboard.tsx:1405` **하나뿐.**
- **인물 전기 에디터 호출**(`person-biography-sections.tsx:842`): `documentScope`·`onEntityLink`·`mentionEntities`·`entityLinkCountryId` **전부 미전달.** → `hasDocumentScope=false` → 「설명 넣기」 버튼(`editor-toolbar.tsx:418`)·컨텍스트 메뉴 항목(`editor-context-menu.tsx:150`)·「이 문서에만 사용」 체크박스(`term-modals.tsx:357`) 전부 숨김.
- **읽기**(`person-biography-sections.tsx:877`): `RichTextProseWithEntityClicks`에 `setTermTooltip`/`setDynastyTooltip` 배선 → 툴팁·엔티티 클릭 완비. **읽기는 저작보다 앞서 있다.**
- **툴팁 렌더**(`person-detail-panel.tsx:3017-3055` + `person-detail-panel.styles.ts:187-249`): `position:fixed` + 클릭 `clientX/clientY`. 뷰포트 클램프·`role="tooltip"`·포커스 이동 없음. 설명은 클릭마다 `getGlossaryTermById` **재fetch**(캐시 없음, `use-rich-text-prose-click.ts:325`).
- **시드**: `apps/api/prisma/seeds`에 `GlossaryTerm` 생성 **0건** — 신규 DB는 사전이 비어 기능이 죽은 듯 보임.

### 1-2. 엔티티 링크 파이프라인
- **삽입·검색·클릭 타입이 9종으로 정합**: `entity-link-search`가 반환하는 9종(person/event/company/country/historicalCountry/dynasty/militaryUnit/politicalParty/personGroup, `entity-link-search.controller.ts`)과 읽기 라우팅(`use-rich-text-prose-click.ts`) 세트가 **정확히 일치**. (초기 가설 "삽입 vs 렌더 불일치"는 오류 — §5.)
- **저작 사이드이펙트 격차**: 사건 에디터는 인물 링크 시 `onPersonEntityLink`(`event-detail.page.tsx:140`)로 `relatedPersons`(참여 행위자)에 낙관 등록+PUT한다. **전기는 `onEntityLink` 미전달** → 링크는 오직 섹션 content HTML의 `<span data-entity-id>`로만 존재, 어떤 관계 테이블에도 안 남음.
- **링크는 FK가 아니다**: content 문자열에 박힌 `data-entity-id`(sanitize가 보존: `sanitize-rich-text-html.ts:50-55`). 대상 삭제 시 무결성·GC 없음 → dangling.
- **저장**: 사건과 동일하게 sections 배열 통째 PUT → 서버 delete-and-recreate(`person.prisma.repository.ts:2038-2050`). content는 온전히 왕복되나 서버측 sanitize·길이검증 없음.

### 1-3. 사건(event) 대비 전기(biography) 저작 파리티 표
| 능력 | 사건 저작 | 인물 전기 저작 | 근거 |
|---|:---:|:---:|---|
| 전역 용어 연결 | ✅ | ✅ | 공용 에디터 |
| 「설명 넣기」(문서 전용 인라인 주석) | ✅ | ❌ | `documentScope` 미전달 (#7/#33) |
| 「이 문서에만 사용」 격리 | ✅ | ❌ | `hasDocumentScope=false` (#1) |
| 용어 국가 스코프 프리필터/귀속 | ❌ | ❌ | 양쪽 死票 (#0/#9) |
| 엔티티 링크 자동 구조화 | ✅ (행위자) | ❌ | `onEntityLink` 미전달 (#17) |
| 링크 대상 프리시드/추천 | ✅ (`mentionEntities`) | ❌ | 미전달 (#19) |
| 저작 도움말 문구 | ✅ | ❌ | `event-create-form-dashboard.tsx:1395` (#11/#32) |
| 읽기 툴팁·엔티티 딥링크 | ✅ | ✅ | 공용 읽기뷰 |

---

## 2. 발견 (중복 통합 · 검증 CONFIRMED 36/36)

원자료 36건은 렌즈별로 중복이 크다(dangling ×3, documentScope 부재 ×3, 문서전용 누출 ×2, 툴팁 클램프 ×2, 재fetch ×2, 발견성 ×2). 아래는 **통합 후 고유 이슈**로 재편.

### A. 용어 스코프·데이터모델 (뿌리)
- **A1 [P2·keystone] 전기는 전역 용어만 생성 가능 — 문서 전용 주석 전면 부재** (#1·#7·#33 통합). `documentScope` 미전달로 「설명 넣기」/「이 문서에만 사용」 소실, 만든 용어는 전부 전역 오염. **§0 결정 게이트의 본체.** 마이그(문서전용 도입 시).
- **A2 [P2] country/historicalCountry 스코프 컬럼이 저작·검색 어디서도 안 쓰여 완전 死票** (#0). 게다가 `list`의 `where.countryId = countryId`는 정확일치라 전역 용어(null)를 배제 — `eventId`의 `OR[null,id]`와 비대칭. **필터가 언젠가 배선되면 전역 용어가 조용히 사라지는 잠재 버그.**
- **A3 [P3] 용어 국가 스코프 미배선(검색 프리필터·신규 등록 귀속 둘 다 없음)** (#9). 컬럼·create 파라미터는 이미 존재 → **무마이그**. 단 A2의 list 비대칭을 `OR 전역`으로 대칭화해야 효과. `person.countryId`는 현대전용 deprecated FK라 역사국가 인물의 `historicalCountryId` 매핑 정확성 병행 검토([[person-historical-country-as-primary-nationality]]).
- **A4 [P3] `name VarChar(1000)`에 「설명 넣기」가 선택 문장 전체를 저장** (#5). term 라벨과 주석 대상 span text 혼용. 전기는 현재 이 경로 미도달이나, A1로 문서전용 도입 시 오남용 상속. `anchorText` 분리 권고.
- **A5 [P3] 스키마 주석이 존재하지 않는 `postId` 참조 + '사건 본문'만 서술** (#6). `user_social_layer` 드롭 잔재. 인물 전기 미반영 stale 문서. trivial.

### B. 정합성·보안 (안전판)
- **B1 [P1] 전역 용어 쓰기에 소유자/계정 권한 경계 전무** (#26). `update`/`delete`에 소유자 검사 없고 모델에 `ownerAccountId` 컬럼도 없음. persons는 계정 종속인데 용어만 전 계정 공유 → A 계정이 B가 의존하는 term을 이름·설명째 덮어써도 못 막고, 변경이 **모든 참조 문서로 즉시 전파.** delete는 하드삭제라 참조 전부 dangling. `TermEditModal`은 「용어 수정」 라벨만 띄워 전역 파급을 은폐(#3 통합).
- **B2 [P2·최고 quick win] 문서 전용(사건) 용어가 전기 검색으로 누출 + cascade dangling** (#27·#34 통합). `list`는 `eventId` 미지정 시 `eventId` 제약을 안 걸어 **전역 + 모든 사건 전용 용어**를 반환. 전기는 `eventId`를 안 넘기므로 이 경로를 탐 → 사건 사설 용어가 전기에 링크되고, 그 사건 삭제 시 `onDelete:Cascade`로 term 물삭 → 전기 `.term`이 `(설명을 불러올 수 없습니다)`로 사망. **`where.eventId = null` 명시 한 줄, 무마이그 S.**
- **B3 [P2] 전기 섹션 content/title 길이 검증 부재 → 불투명한 전체 저장 실패** (#28). `BiographySectionDto`는 `@IsString()`뿐 `@MaxLength` 없음. 컬럼은 `content @db.Text`(64KB)·`title @db.VarChar(500)`. 링크 span 많은 긴 전기·붙여넣기가 초과하면 `createMany`가 던지고 **$transaction 전체 롤백** → 그 저장의 모든 섹션 미반영, 프론트는 원인 불명 실패만 표시. `@MaxLength` 추가 또는 `MEDIUMTEXT` 승격. EventSection도 대칭.
- **B4 [P3] 전역 용어 GC·관리 표면 전무 + 전역 편집 모달에 삭제 버튼 없음** (#2). 관리/목록 페이지 부재, `TermEditModal` 전역 분기(`term-modals.tsx:527-563`)에 삭제 버튼 없음(삭제는 eventId 분기에만). 전기 저작 중 만든 오타·중복 용어가 **영구 orphan** — 유일한 제거 수단이 DB 직접 조작.
- **B5 [P3] 서버가 전기 HTML을 sanitize 없이 저장 — 방어 심층 공백** (#31). 현 SPA 렌더는 전부 DOMPurify 경유라 **활성 취약점 아님**. 그러나 신뢰 경계가 클라 한 지점에 몰려, 향후 `formatRichTextForReadView`를 안 거치는 소비자(공개 방문/[[cyworld-room-visiting-plan]], export, 알림 프리뷰)가 생기면 저장형 XSS로 발화. 쓰기 경로 서버측 sanitize 권고.

### C. 툴팁 읽기 UX·a11y
- **C1 [P2] 툴팁을 키보드·스크린리더로 전혀 열 수 없음** (#12). `.term`/멘션 트리거는 tabindex·role 없는 순수 span, 훅에 keydown 없음, 팝오버에 `role="tooltip"`·`aria-describedby` 없음. term/dynasty만 완전 사각지대(인물은 모달, 사건/기업은 라우팅으로 최소 접근). `role=button`+tabindex+키다운 재사용+`:focus-visible`+`role=tooltip`+포커스 이동 권고.
- **C2 [P2] 툴팁 뷰포트 경계 잘림 + 오버레이가 스크롤 차단해 복구 불가** (#13·#25 통합). `left=clientX·top=clientY`만, 클램프·flip 없음(`styles:187-249`). max-width 360px가 화면 우/하단에서 넘침. 게다가 오버레이(`inset:0`)가 휠을 흡수해 잘린 설명을 스크롤로도 못 봄. 긴 전기 하단 용어일수록 아예 못 읽음. 렌더 후 rect로 클램프.
- **C3 [P2] 인물 링크 중첩 모달 안에서 툴팁 위치 어긋남** (#14). `BioMentionModalPanel`(framer `motion.div`)의 잔여 `transform`이 `position:fixed`의 포함 블록을 오염 → 뷰포트 기준 좌표가 어긋남. **인물 링크 타고 전기 읽는 흔한 경로에서 발생.** `document.body`로 포털(라이트박스 선례 재사용).
- **C4 [P3] 클릭마다 재fetch(캐시 없음) + 개명 시 표제 불일치** (#15·#29 통합). bare fetch라 반복 클릭마다 네트워크+「로딩…」깜빡임. 툴팁 name은 프리즈된 `data-term-name`이라 전역 개명 후 옛이름+새설명. termId 키 react-query/Map 캐시 + name 갱신.
- **C5 [P3] 툴팁이 이름+설명뿐 — '더 보기' 딥링크 부재** (#16). 응답에 `countryId`가 오는데 미사용, 가문은 상세 라우트 자체가 없음(`DynastyMembersInfographicModal`은 있는데 미연결). 이미 있는 데이터/모달을 안 쓰는 낭비. 용어→국가(역사 탭) 칩, 가문→가문 모달 재사용.

### D. 엔티티 링크 읽기·라우팅
- **D1 [P2] 크로스계정 인물/사건 링크가 404/403 데드엔드** (#21). `entity-link-search`의 person 검색은 accountId 필터가 없어 전 계정 반환하는데, 읽기 도달점 `person.findById`는 비소유 404, `event.getEventById`는 비소유 403. `use-rich-text-prose-click`에 isOwned 판별 없음. event는 인라인 모달이 아니라 `/events/:id` 전체 라우팅이라 **읽던 맥락에서 강제 이탈.** 가계도·[[person-contemporary-rulers-access]]는 isOwned 비활성 선례 보유. **최소 수정: entity-link-search(person 최소)를 actor accountId로 스코프.**
- **D2 [P2] 역사국가·정당·군부대 링크가 목적지 없으면 error 토스트만** (#22). 이 3종은 연결된 현대국가 id가 있어야만 우회 이동, 없으면 `notify.error`. `pathKeys`에 독립 상세 라우트가 없어 현대 후신 없는 고대 왕국·무국적 부대는 **영구 도달 불가.** 전기(역사 인물)는 역사국가를 빈번히 링크. 같은 훅의 dynasty는 인라인 툴팁으로 우아하게 처리하는데 이 3종만 데드엔드 — 처리 비일관. **dynasty식 인라인 요약 툴팁 폴백**(무마이그).
- **D3 [P2/P3] 대상 삭제 시 dangling — navigate 타입은 감지 없이 404 직행** (#18·#24·#30 통합). content의 `data-entity-id`는 FK 아님. personGroup/event/company/country는 존재확인 없이 즉시 navigate/모달푸시 → 삭제 대상이면 404. dynasty/party/역사국가/부대/term은 fetch 후 catch로 그나마 토스트. **처리 통일 필요** — navigate 타입도 온-리드 존재확인 또는 실패 시 토스트+비이동.
- **D4 [P3] `.entity-link`는 타입 무관 단일 amber인데 클릭 결과는 제각각** (#23). 멘션(`.mention`)은 8종 타입색이 있으나 검색삽입 링크(`.entity-link`)는 amber 하나. 그 amber가 페이지 이동(맥락 이탈)·인라인 툴팁(맥락 유지)·모달·데드엔드를 동일 기호로 공유 → **결과 예측 불가.** 툴팁형 vs 이동형 최소 시각 구분(점선밑줄 vs 화살표 글리프).

### E. 저작 발견성·마찰
- **E1 [P2] 전기 에디터가 용어·엔티티 기능을 전혀 안내 안 함** (#11·#32 통합). placeholder는 '인물 멘션'만 광고(`person-biography-sections.tsx:846`), 삽입 진입점은 '드래그 후 우클릭'뿐인데 도움말 없음. 사건은 명시 도움말 보유(`event-create-form-dashboard.tsx:1395`). **읽기뷰는 완비됐는데 저작 발견성 부재로 콘텐츠가 안 만들어져 기능이 유휴.** 사건 도움말 컴포넌트 재사용.
- **E2 [P2] 용어 연결 모달이 기존 용어를 초기에 안 보여주고 신규등록칸에만 프리필 → 중복 전역 용어 양산** (#8). 모달 오픈 시 `query=''·results=[]`로 초기화하고 selectedText는 **검색창이 아니라 신규 이름칸**에 채움 → '등록 후 연결' 버튼이 눈앞. 이미 같은 용어가 있어도 사용자가 검색창에 재타이핑해야 발견. 서버 create에도 유일성 검사 없음. **오픈 시 selectedText로 검색 시드**, 매칭 있으면 '연결' 우선.
- **E3 [P3] 용어 등록 실패가 무성(silent)** (#10). `createGlossaryTerm` 실패 시 `console.error`만 — 표준 `notify` 우회. 반복 클릭(중복 생성)/저장 오인 유발. `notify.error` + 모달 유지.
- **E4 [P3] 엔티티 저작 프리시드/추천 부재** (#19). `mentionEntities`·추천 칩 없어 빈 검색어면 결과 0, 주체의 국적·가문·재임 직위·참여 사건을 원탭으로 못 넣음. **주의: `entityLinkCountryId` 하드필터는 외교관 전기의 외국 엔티티를 가리므로 부적절** — '추천만 스코프, 검색은 전역'.
- **E5 [P3] 용어 사전 시드 부재** (#35). E1과 겹쳐 갓 시드한 환경에서 검색해도 아무것도 안 나와 미구현/고장 오인. 자주 쓰는 관직·작위 소수 시드.

### F. 구조화 (최대 기능)
- **F1 [P3·L] 전기 엔티티 링크는 순수 인라인 HTML — 역참조·구조적 승격 전무** (#17). A 전기가 B/사건/기업을 링크해도 B 상세에서 '나를 언급한 전기'를 역조회 불가. **단 사건식 자동 '행위자 등록' 미러링은 과설계** — 가족/경력은 별도 정본 모델이므로. 필요한 건 **경량 mention(역참조) 인덱스**: 저장 시 content에서 `(sourcePersonId, targetType, targetId)` 파싱→폴리모픽 upsert, 인물 상세에 '이 인물을 언급한 전기' 섹션. **자동 관계 승격은 금지.** 마이그.
- **F2 [P3] 죽은 mention config 타입 + governmentPosition 링크 불가** (#20). `MENTION_TYPE_CONFIG`는 ~30종 선언하나 ~21종은 검색·라우팅 死코드(오독 유발). 정치가 전기의 자연 대상인 재임 정부직은 검색·라우팅 브랜치 없음(militaryUnit→countryGovernment 선례로 추가 가능), 조약/법률은 독립 라우트 없어 링크 불가 유지. config를 실제 세트로 축소 or 미지원 주석.
- **F3 [P3] 용어 name 무제약·list 무페이지네이션·contains 풀스캔** (#4). 소규모 무해하나 전역 용어 대량화(A1 귀결) 시 매 입력 무제한 풀스캔+전량 전송+동명 구별 불가. limit/커서 + name 인덱스. A1/B4와 함께.

---

## 3. 레버리지順 배치 로드맵

각 배치는 독립 인도 가능. 상위일수록 (안전·버그 차단 × 저비용 × 하위 언블록).

### 배치 0 — 결정 게이트 (제품 결정, 코드 0)
- **G-용어스코프**: 전역 공유 사전 vs 문서(인물)별 주석. → A1/A2/F1/B4의 마이그 방향 결정. *(권고: 전역을 정본으로 유지하되 B1/B2/B4로 전역을 '안전하게' 만들고, 문서전용은 수요 확인 후 폴리모픽 스코프로. 억지 personId 대칭 지양.)*

### 배치 1 — 보안·버그 차단 (대부분 무마이그, 최고 레버리지)
| 이슈 | 심각도 | 마이그 | 노력 | 상태 |
|---|:---:|:---:|:---:|:---:|
| B2 문서전용 용어 누출 `where.eventId=null` | P2 | ✕ | S | ✅ 구현 |
| B1 전역 용어 쓰기 권한 — **무마이그 완화**(편집 경고 배너) 구현 / 근본(ownerAccountId 백필)은 배치 5 | **P1** | △ | M | ◐ 완화만 |
| B3 BiographySectionDto `@MaxLength`·`@MaxByteLength` | P2 | ✕ | S | ✅ 구현 |
| D1 크로스계정 isOwned — entity-link-search를 actor 스코프(person=accountId·event=createdById) | P2 | ✕ | M | ✅ 구현 |

> B1 근본 수정(`GlossaryTerm.ownerAccountId` 백필 + update/delete 소유자 한정)은 마이그레이션이라 배치 5로 이월. 이번엔 편집 시 파급 경고 배너로 blast-radius를 **가시화**만 함.

### 배치 2 — 툴팁 읽기 UX·a11y (전량 무마이그, 사용자 직접 체감) — ✅ 구현 완료
| 이슈 | 심각도 | 노력 | 상태 |
|---|:---:|:---:|:---:|
| C1 키보드·SR 접근성(role/tabindex/aria) | P2 | M | ✅ 구현 |
| C2 뷰포트 클램프/flip | P2 | M | ✅ 구현 |
| C3 중첩 모달 body 포털 | P2 | M | ✅ 구현 |
| C4 term/dynasty 캐시 + name 갱신 + 무효화 | P3 | S | ✅ 구현 |
| C5 툴팁 '더 보기' 딥링크(국가/가문 모달 재사용) | P3 | M | ✅ 구현 |

> 공용 `RichTextEntityTooltip` + 훅/래퍼 개선으로 구현. person-detail-panel 채택 완료. C2 오버레이 스크롤 차단은 포털·클램프로 실질 해소(경계 잘림 제거). 하드닝 2건: N1(캐시 세션 staleness → 용어 수정/삭제 시 무효화), N2(식별자 없는 inert span은 포커스 대상 제외). **후속**: 나머지 3개 소비자(country-elections·cabinets·inline-rich-text) 공용 컴포넌트 이관 시 C2/C3/C5도 전파.

### 배치 3 — 엔티티 라우팅 정합성 (무마이그) — 부분 구현
| 이슈 | 심각도 | 노력 | 상태 |
|---|:---:|:---:|:---:|
| D4 entity-link 어포던스 구분(이동형↗ vs 툴팁형) | P3 | S | ✅ 구현 |
| D2 역사국가/정당/부대 데드엔드 완화 | P2 | M | ◐ D2-light(안내 토스트) |
| D3 dangling — navigate 타입 온-리드 검증 | P2 | M | ⏸ 보류 |

> **D4**(구현): `RichTextReadView` Root에 읽기 전용 어포던스 — 확실히 페이지 이동하는 타입(event·company·country·personGroup)엔 `↗` 글리프, 제자리 툴팁형(dynasty)엔 `cursor:help`. 에디터 공유 css(`richTextEntityLinkStyles`)가 아닌 읽기 컴포넌트에만 넣어 에디터 `.entity-link::after` 충돌 회피.
> **D2**(부분): 데드엔드 토스트를 `notify.error`→`notify.show`(ℹ️)로 완화하고 클릭한 엔티티명 노출(hook 전용, 무회귀). **완전판(dynasty식 인라인 요약 툴팁)은 보류** — 4개 소비자 렌더 배선 필요(overload 시 타 소비자 "가문 ·" 오라벨 회귀) + person-detail-panel이 병렬 WIP와 엉킴. person-detail-panel 클린화(팀원 커밋 랜딩) 후 신규 `setEntityInfoTooltip` opt-in으로 진행 예정.
> **D3**(보류): navigate 타입에 삭제 감지를 넣으려면 클릭마다 사전 fetch가 필요해 흔한 정상 경로의 지연·왕복 비용이 큼(드문 삭제 케이스 대비). 근본 해결은 인라인 id 모델상 고비용(리뷰 §D3). D1(배치1)이 신규 크로스계정 데드링크는 이미 차단.

### 배치 4 — 저작 발견성·마찰 (무마이그) — 부분 구현
| 이슈 | 심각도 | 노력 | 상태 |
|---|:---:|:---:|:---:|
| E1 저작 도움말 + placeholder 확장 | P2 | S | ✅ 구현 |
| E2 용어 모달 오픈 시 검색 시드(중복 방지) | P2 | S | ✅ 구현 |
| E3 등록 실패 토스트 | P3 | S | ✅ 구현 |
| E4 엔티티 추천 칩(국적·가문·직위·사건) | P3 | M | ⏸ 보류 |
| E5 용어 최소 시드 | P3 | S | ⏸ 보류 |

> **E1**(구현): 전기 섹션 편집기 위에 `AuthoringHint`("문구 선택 후 우클릭 → 용어 연결·엔티티 연결") + placeholder를 '멘션'만 → 용어·엔티티 링크 포함으로 확장(person-biography-sections.tsx, 사건 저작 화면과 동형).
> **E2**(구현): `handleOpenTermLinkModal`이 선택 문구로 검색을 **시드**(`searchTermLinks(seed)`)해 기존 용어를 먼저 노출 — 신규 등록칸만 프리필돼 중복 전역 용어를 양산하던 흐름 차단(rich-text-editor.tsx). **공용 편집기라 사건 저작에도 함께 적용**(동일 개선).
> **E3**(구현): `handleCreateAndLinkTerm` 실패 catch에 `notify.error` 추가(모달 유지→재시도) — console만 찍던 무성 실패 해소.
> **E4**(보류): 주체의 국적·가문·재임 직위·참여 사건을 `mentionEntities` 추천 프리시드로 주입하려면 person-detail-panel(병렬 WIP 엉킴)에서 데이터 계산·배선 필요. **하드필터 금지 원칙**(외교관 전기의 외국 엔티티 가림 방지) 유지. person-detail-panel 클린화 후 진행.
> **E5**(보류): 용어 시드는 '어떤 관직·작위를 넣을지' 제품/도메인 판단 필요 — 배치 0(스코프 결정)·A3(국가 스코프)와 함께 다루는 게 자연스러움.

### 배치 5 — 데이터모델·마이그 (배치 0 결정 완료 → §7-4·§8)
**배치 0 확정(2026-07-11)** = D-1 전역 · D-2 국가 스코프 살림 · **D-4 F1 구축** · D-3 각주 보류. 아래 표에 결정 반영.
| 이슈 | 심각도 | 마이그 | 노력 | 결정 |
|---|:---:|:---:|:---:|:---:|
| **F1 mention 역참조 인덱스** (§8) | P3 | ✅ | L | ✅ 구축(D-4) |
| A3 용어 국가 스코프 배선(list `OR 전역` 대칭화) | P3 | ✕ | M | ✅ 살림(D-2) |
| A2 country/hist 死票 → 배선 | P2 | ✕ | M | ✅ 살림(D-2, 제거 아님) |
| A1 personId 공유용어 스코프 | P2 | — | — | ❌ 불필요(D-1) |
| D-3 문서 주석 폴리모픽(각주) | P2 | ✅ | M | ⏸ 보류(수요 재검토) |
| B4 전역 용어 관리 표면·삭제·GC | P3 | ✕ | M | 유지 |
| F3 용어 name 인덱스/페이지네이션/dedup | P3 | △ | S | 유지 |
| A4 name↔anchorText 분리 | P3 | ✅ | M | 각주 도입 시(D-3 종속) |
| F2 죽은 mention config 정리 + governmentPosition 링크 | P3 | ✕ | M | 유지 |
| A5 stale 주석(postId) 정리 | P3 | ✕ | S | 유지 |
| B5 서버측 sanitize(방어 심층) | P3 | ✕ | M | 유지 |

> **마이그 게이트**: A1/A2/A4/F1은 스키마 변경. [[genealogy-family-tree-review-batches]]·[[person-record-convergence-era-compare-review]]가 지적한 대로 **병렬 스키마 WIP 드리프트 회피**를 위해 배치 5는 다른 마이그 항목과 함께 트리 정리 후 진행. 배치 1~4는 스키마 무관하게 선행 가능.

---

## 4. 구현 시 유의 (검증 단계에서 실측된 함정)
1. **B2/B1의 공용 컴포넌트 파급**: 용어 모달·`glossary list`는 사건과 공유. `where.eventId=null` 수정은 사건 저작이 `eventId`를 넘기므로 사건엔 무영향(전역+자기문서 유지), 비-사건 소비자만 전역 한정 — 안전. 회귀 검증은 사건·전기 양쪽.
2. **A3의 list 비대칭**: 인물 국가를 그냥 넘기면 `where.countryId=countryId` 정확일치라 전역 용어가 사라짐. 반드시 `eventId`식 `OR[null, 국가]`로 대칭화한 뒤 배선.
3. **C3의 근본 원인은 framer transform**: 툴팁 좌표 로직만 고치면 안 되고, `transform` 조상 밖(body 포털)으로 빼야 fixed 기준이 뷰포트로 복원됨.
4. **E4의 하드필터 금지**: `entityLinkCountryId`는 컨트롤러에서 정당·집단·기업에 AND 하드필터라 외국 엔티티를 가림. 추천 프리시드로만 쓰고 검색은 전역 유지.
5. **F1은 자동 관계 승격 아님**: 가족/경력 정본을 건드리지 말 것. 역참조 인덱스는 표시·무효화용 경량 테이블.

---

## 5. 정정된 초기 가설 (정직성 기록)
검증 단계에서 스카우트 브리프의 3개 가정이 **반증**됨:
1. ❌ "삽입 vs 렌더 엔티티 타입 커버리지 불일치" — 실측상 9종이 검색·삽입·클릭에서 정확히 정합(#20). 진짜 문제는 config 死코드(F2)와 governmentPosition/조약 미지원.
2. ❌ "역사국가/정당/부대 데드엔드는 '왜 못 가는지 안내가 없다'" — 메시지는 이유를 설명함(#22). 진짜 결함은 **목적지 부재**와 dynasty 인라인 처리와의 **비일관**.
3. ❌ ".entity-link는 타입 구분이 전혀 없다" — 멘션(`.mention`)은 타입색 있음, **`.entity-link`만** 단일 amber(#23).

## 6. 검증 부록
- 발굴 렌즈 7 × 발견 36건 → **각 건 독립 에이전트가 file:line 실측 재확인**(CONFIRMED 36 / PLAUSIBLE 0 / REFUTED 0, 43 에이전트).
- 대표 하중 지지 사실: `GlossaryTerm.personId 부재`(event.prisma:405) · `DocumentScope={type:'event'}`(rich-text-editor.tsx:520) · `documentScope` 유일 사용처 event-create-form-dashboard.tsx:1405 · glossary update/delete 소유자 검사 부재(glossary.controller.ts:143-172) · `list` eventId 미지정 시 무제약(glossary.controller.ts:103-108) · 툴팁 fixed clientX/Y 무클램프(person-detail-panel.styles.ts:187-249) · sanitize allowlist가 data-*/.term/.entity-link 보존(sanitize-rich-text-html.ts:50-55, 현 XSS 비활성 확인).

---

## 7. 배치 0 결정 게이트 — 「전역 사전 vs 문서 주석」 분석·권고

### 7-1. 질문 재정의: A-vs-B가 아니라 "두 기능의 분리"
「전역 사전인가 문서 주석인가」는 사실 **한 모델(GlossaryTerm)에 두 기능이 섞여** 생긴 질문이다:
- **① 공유 사전(dictionary)**: 관직·제도·작위·고어처럼 여러 문서에 **반복** 등장하는 참조 용어. "영의정" 설명은 세종 전기든 정도전 전기든 동일 → **전역이 정본**.
- **② 문서 주석(footnote)**: "이 전기의 이 문장에만 다는 일회성 해설". 특정 문서 종속 → **스코프 필요**.

현재 `GlossaryTerm`은 (전역 용어)+(eventId 스코프 「설명 넣기」)로 둘을 겸한다. 「설명 넣기」는 선택 문구 전체를 `name`에 저장(#5)하는 사실상 **각주**지 사전 용어가 아니다. 즉 결정은 "A냐 B냐"가 아니라 **"①은 전역 확정, ②를 인물(및 타 문서)로 어떻게 확장하느냐"**로 분해된다.

### 7-2. 하위 결정 4개와 권고
- **D-1. 공유 용어(「용어 연결」) 스코프 → 전역 확정.** 백과 특성상 관직·제도는 반복되므로 전역 단일 정본이 옳다. **인물 전기가 전역 용어를 쓰는 것은 정상**이며 공유 용어에 `personId`를 다는 것(억지 대칭)은 불필요. → 배치 5의 A1을 "공유 용어에 personId 추가"로 해석하지 말 것.
- **D-2. 국가 스코프(A2/A3) → 배선(wire), 제거 아님.** 컬럼은 死票(#0)지만 **제거보다 배선**을 권고 — 조선 인물 전기에서 조선 관직 용어를 국가로 프리필터·귀속하면 발견성↑, **마이그 불필요**(컬럼·create 파라미터 존재). 단 `list`의 countryId를 eventId식 `OR 전역`으로 대칭화(현 배타 AND라 배선 시 전역 누락 잠재버그) 필수. → **무마이그. clean 파일(use-term-link-search·glossary.controller·생성 dto)은 지금도 가능**; 인물 국가를 편집기로 내리는 배선만 person-detail-panel(엉킴) 경유라 클린화 후.
- **D-3. 문서 주석(「설명 넣기」)의 인물 확장 → (권고) 당분간 보류, 도입 시 폴리모픽.** 옵션 (a) `personId` FK(eventId 답습 — 문서 타입 늘 때마다 FK 증식, 비확장) / (b) **폴리모픽 `(ownerType, ownerId)`**(event/person/… 균일, FK cascade 상실→앱 정리, eventId 백필 마이그) / (c) 미지원(현행). **권고: 각주 수요 검증 전엔 (c) 유지+문서화** — 각주는 secondary고 인물 전기는 D-1(전역)+D-2(국가)로 대부분 커버. 정말 필요하면 **(b) 폴리모픽**(→ (a) FK 증식 금지). (b)가 배치 5의 유일한 진짜 마이그.
- **D-4. F1 역참조 인덱스("이 인물이 언급된 전기") → 별도 결정.** 용어가 아니라 **엔티티 링크** 사안(#17)이라 D-1~3와 독립. 최대 가치·최대 비용(L, 폴리모픽 mention 인덱스 마이그). 자동 관계 승격 금지(과설계). **별건 우선순위 판단** 권고.

### 7-3. 종합 권고 (마이그 최소화 경로)
1. **지금 가능**: D-2(국가 스코프)의 무마이그 부분(검색·생성 dto·list 대칭화) 선행 가능; 편집기↔person 국가 배선만 person-detail-panel 클린 후.
2. **배치 0 확정안**: 공유 용어=전역(D-1) · 국가 스코프=살림(D-2) · 인물 각주=당분간 미지원, 필요 시 폴리모픽(D-3) · F1=별건(D-4).
3. **마이그는 팀원 커밋 랜딩 + 스키마 WIP 정리 후**(메모리 "병렬 스키마 WIP 드리프트 회피"). 그때 D-3(b) 각주 폴리모픽 or F1을 수요順 배치.

이 경로는 **마이그를 (선택적) 하나로 최소화**하면서 인물 전기의 용어 경험을 전역+국가 스코프로 대부분 메운다. 억지 personId 대칭·FK 증식·성급한 폴리모픽 전환을 피한다.

### 7-4. 결정 확정 (2026-07-11)
사용자 결정 = **「F1 역참조까지」** — **D-1(공유 용어 전역 확정) + D-2(국가 스코프 살림) + D-4(F1 역참조 인덱스 구축)**. **D-3(인물 각주 폴리모픽)은 보류.**
- 즉시 배치 5 대상 = **D-2 국가 스코프 배선**(무마이그) + **F1 역참조 인덱스**(마이그). 둘 다 person-detail-panel/스키마 클린 후.
- F1 구현 명세 = §8. D-3 각주는 수요 재검토 전까지 현행(전역만) 유지.

---

## 8. F1 역참조 인덱스 구현 명세 (배치 5 · 마이그 게이트)

목표: 전기가 링크한 엔티티를 구조적으로 기록해 **"이 인물을 언급한 전기"** 역참조를 인물 상세에 노출한다. **자동 관계 승격 금지**(가족·경력 정본 불변) — 표시·무효화용 경량 인덱스일 뿐(#17).

### 8-1. 스키마 (신규 폴리모픽 테이블, additive 마이그)
`libs/db/prisma/`에 신규(예: `content.prisma` 또는 person 인접):
```prisma
/// 전기 등 리치텍스트 본문이 링크한 엔티티의 역참조 인덱스(표시·무효화용, FK 아님).
model EntityMention {
  id String @id @default(uuid()) @db.Char(36)
  /// 언급을 담은 원본 문서 종류(확장 대비 폴리모픽). v1은 'personBiography'.
  sourceType String @map("source_type") @db.VarChar(32)
  /// 원본 문서 키. personBiography면 **Person.id**(섹션은 delete-recreate라 인물 단위로 재동기화).
  sourceId   String @map("source_id") @db.Char(36)
  /// 언급 대상 엔티티(폴리모픽): person|event|company|country|historicalCountry|dynasty|militaryUnit|politicalParty|personGroup
  targetType String @map("target_type") @db.VarChar(32)
  targetId   String @map("target_id") @db.Char(36)
  createdAt  DateTime @default(now()) @map("created_at")

  @@unique([sourceType, sourceId, targetType, targetId], name: "uq_mention")
  @@index([targetType, targetId], name: "idx_mention_target") // "이걸 언급한 것들"
  @@index([sourceType, sourceId], name: "idx_mention_source") // 저장 시 재동기화
  @@map("entity_mention")
}
```
- **폴리모픽이라 DB FK 없음** → cascade 대신 앱 레벨 정리. `sourceId=Person.id`로 두어 **섹션 delete-recreate에도 안정**(섹션 id로 키잉하면 매 저장 churn).
- target 삭제 시 dangling은 **읽기 시점 존재확인/필터**로 흡수(별도 GC 잡은 선택).

### 8-2. 쓰기 경로 (person 저장 트랜잭션 내)
`person.prisma.repository`의 biography sections 저장(deleteMany+createMany $transaction) 뒤에:
1. 모든 섹션 `content` HTML에서 `data-entity-type`+`data-entity-id`(및 `.mention` `data-type`+`data-id`) 파싱 → `(targetType, targetId)` 유니크 집합.
2. `entityMention.deleteMany({ sourceType:'personBiography', sourceId: personId })` → `createMany`(파싱 결과). **같은 트랜잭션**에 포함(부분 반영 방지).
3. 파싱은 서버측 정규식/DOM 파서(클라 sanitize allowlist가 data-* 보존하므로 저장 HTML에 존재). 자기 자신 링크(targetType='person'&&targetId===personId)는 제외.

### 8-3. 읽기 API
`GET /persons/:id/mentioned-by` (PersonController 클래스 JWT 가드 상속):
- `entityMention where targetType='person' AND targetId=:id` → `sourceId`(언급한 전기의 personId) 수집.
- **계정 스코프 필수**: 그 source person들을 `accountId=actor`로 필터(뷰어는 자기 전기만 열 수 있음 — D1과 대칭). Person join으로 accountId 필터 + 표시명/카드 필드 select.
- DTO: `[{ personId, name, surname, nameDisplayOrder, profileImageUrl }]`. 이름 순서는 entity-link-search의 `displayPersonName` 규약 재사용.

### 8-4. 읽기 UI
인물 상세에 **"이 인물을 언급한 전기"** 섹션(결과 비면 미노출). 카드/칩 클릭 → 해당 인물 상세(모달 스택 push, 기존 onPersonClick 재사용). person-detail-panel 소관(클린 후).

### 8-5. 마이그·롤아웃
- 마이그 **additive**(테이블+인덱스 3). `ts-node libs/db/prisma/run-migrate.ts add_entity_mention_index`(소스 .prisma부터 — CLAUDE.md 규약). **팀원 마이그 랜딩 후** 실행(드리프트 회피).
- 백필: 선택. 기존 전기 일괄 파싱 스크립트 or "다음 저장 시 채움"(무백필). 무백필이 안전(점진).
- SDK 재생성: 신규 GET 엔드포인트라 `build:nestia` 필요(메모리 build-nestia 우회 주의).

### 8-6. 확장성·경계
- `sourceType`/`targetType`가 폴리모픽이라 후일 사건 본문·기업 연혁 등도 같은 테이블로 편입 가능(D-3 각주와 별개).
- **금지**: 이 인덱스로 가족/경력/재직 등 정본 관계를 만들거나 수정하지 말 것. 순수 "언급했다" 사실만.
- 성능: 저장당 파싱 1회 + 소량 rows. 읽기는 `idx_mention_target` 커버. 대량 전기에도 무해.
