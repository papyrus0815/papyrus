# 인물 가계도(Family Tree) 기능 최종 개선 리뷰

## 1. 요약

현재 가계도는 **읽기(시각화)는 이미 상당히 성숙**했지만(4대 상향·3대 하향 BFS, 방계·혼인·이복 포함, 인포그래픽 + React Flow 두 렌더러) **저작·데이터모델·일관성 계층이 그 수준을 따라오지 못한** 상태로, 왕조/군주 도메인을 겨냥한 기능임에도 후궁 순위·입양·약혼·이복 구분 같은 핵심 계보 개념을 표현하거나 편집할 수 없다. 개선의 큰 방향은 세 가지다 — (A) **읽기/편집 격차 해소**: 트리에서 바로 자식·배우자를 붙이고, 후궁·이복·혼외자를 설정 가능하게, (B) **생물학적 FK 감옥 탈출**: 입양/양친·배우자 랭크·결합상태를 additive 스키마로 표현, (C) **두 서프스(임베드 인포그래픽 vs 독립 React Flow)·두 데이터소스(REST props vs BFS)·무DTO 계약의 분기 정리** — 캐시 키·계약·시각 규약을 하나로 수렴.

핵심 관찰: 38개 findings는 적대검증 과정에서 대부분 P2/P3로 하향됐다(데이터손실/크래시 없음). 따라서 아래 우선순위는 **명목 severity가 아니라 레버리지(영향÷비용)** 로 재배열했다. 특히 저비용·고효과인 캐시키 통일과 자기부모 가드, 그리고 모든 additive 변경의 열쇠가 되는 **FamilyTreeResponseDto 계약화**를 앞세운다.

---

## 2. 핵심 개선 (P0/P1 — 레버리지 최상위)

### 2.1 무DTO 계약 → `FamilyTreeResponseDto` 정의 (키스톤) — findings #20
- **문제**: `getFamilyTree`가 `Promise<any>`로 반환(`person.controller.ts:407`), `person.response.ts`에 트리 shape 없음. 실계약은 손으로 유지하는 `shared/api/persons-family-tree.ts`의 인터페이스뿐이고, 클라이언트는 nestia SDK가 아니라 raw `fetch()`로 받는다. nestia SDK는 생성되지만 Output이 `Primitive<any>`라 타입 안전성 0.
- **제안**: `FamilyTreeResponseDto`(nodes/edges/truncations)를 클라이언트 인터페이스와 대칭으로 정의하고 컨트롤러에 부착 → 클라이언트를 생성 SDK 경유로. 
- **근거/effort**: **이것이 아래 데이터모델 확장(#6/#7/#2/#31/#19 등) 전부를 컴파일타임에 강제하는 전제조건이다.** 지금은 `dynastyOrdinal`·`parentRole` 같은 필드를 추가해도 타입/SDK가 드리프트를 못 잡는다(현 git status의 `dynastyOrdinal` 마이그레이션이 바로 그 상황). effort **M**, 런타임 버그는 아니지만 **후속 작업 레버리지가 가장 큰 항목**.

### 2.2 stale 캐시 키 통일 — findings #23, #36 (동일 건)
- **문제**: 독립 `/genealogy` 페이지는 `['family-tree', personId]`로 fetch(`genealogy.page.tsx:564`, staleTime 5분)하지만, 모든 무효화 경로는 `['person-family-tree']`를 친다(`person-detail-panel.tsx:701`, `person-edit.page.tsx:83`, `person-register-view-modal.tsx:64`). React Query 프리픽스 매칭이 첫 요소 불일치로 안 걸려, 가족 편집 후 전체 트리가 최대 5분간 stale. 두 키는 동일 요청의 중복 캐시 엔트리이기도 하다.
- **제안**: 페이지를 `['person-family-tree', personId]`로 통일(동일 `getPersonFamilyTree` 래퍼) → 기존 무효화에 자동 편입 + 중복 캐시 제거.
- **근거/effort**: **한 줄 rename, 명백한 correctness 버그**. effort **S**, 레버리지 최상.

### 2.3 그래프 무결성 가드 (자기부모·순환·불가능 날짜) — findings #10, #24
- **문제**: `fatherId/motherId`는 `@IsOptional @IsString`만(심지어 `@IsUUID`도 아님, `create-person.dto.ts:425`), `SpouseRelationDto.spouseId`도 self-check 없음. 서비스/리포지토리도 검증 0. `A.father=A`, `A↔B` 순환, 부모가 자식보다 늦게 태어난 날짜가 전부 저장된다. `A.fatherId===A`이면 `4748` 엣지 루프가 `A__A` self 엣지를 emit → `AncestorColumn`이 자기 자신을 자기 부모 카드로 렌더(visited-set이 재귀만 멈춤). 유일한 가드인 폼별 `excludeIds`(`family-section.tsx:128`)는 폼 간을 못 본다.
- **제안**: `PersonService.create/update`에 서버 검증 추가 — `fatherId/motherId===self` 거부, 조상 체인 순환 거부, 부모 birthYear > 자식이면 경고/거부. 방어적으로 엣지 emit 루프에 `if (src===tgt) continue`. 이미 선례 있음: `resolveHumanRelationshipEndpoints`가 self-relationship 차단(`service.ts:1328`), `assertLifeEventDateRange`가 날짜순 강제(`service.ts:683`) — 부모/배우자만 일관성 없는 공백.
- **근거/effort**: effort **M**. 데이터손실은 아니나(읽기는 BFS 고정깊이라 hang 안 함) 손상 그래프를 소리없이 생성하고 편집폼에 진짜 검증 피드백을 줄 수 있게 함.

### 2.4 배우자 쓰기 대칭화 (역방향 재저장 중복행) — findings #9
- **문제**: 배우자 쓰기는 단방향 wholesale-replace: `update()`가 `deleteMany({personId:id})` 후 `createMany`(`person.prisma.repository.ts:1802`)로 미러행(spouse→me) 미작성. `@@unique([personId,spouseId])`는 **방향성** 키라 `A→B`와 `B→A`가 합법 공존. 결혼을 B측에서 등록(행 `B→A`)한 뒤 A를 편집·저장하면 역방향 행이 hydrate되어(`person-register-view.tsx:850`) 새 `A→B` 행이 insert → 커플당 2행. 읽기측 dedup(`controller.ts:647`)이 divergence를 숨겨 marriage start/end/note가 조용히 갈라진다. **정상 사용 경로에서 발생**.
- **제안**: 쓰기 시점에 대칭화 — 트랜잭션으로 미러행 유지하거나, 정렬 페어키(`a__b`)로 정규화해 단일 canonical 행 저장. 최소한 저장 시 페어로 reconcile.
- **근거/effort**: effort **M**. 마스킹돼 있지만 중복행 누적 + 메타 divergence + 자식↔결혼 FK delete-recreate 취약성 복합.

### 2.5 계정 스코프 정책 일원화 (cross-account 死 노드) — findings #5
- **문제**: `findFamilyTree`가 의도적으로 `_accountId`를 무시("가계도는 공개 데이터", `repo:4276`)해 타 계정 소유 친족이 노드로 뜬다. 그러나 모든 노드가 클릭 가능하고 클릭 시 계정 스코프된 `findById`(`repo:1031`)로 라우팅 → cross-account 노드는 보이지만 열면 `NotFoundException`. 또한 타 계정 비공개 인물(이름·왕조·생몰·묘호)이 누구의 트리로든 노출되는 열거 누수.
- **제안**: **한 정책으로 통일** — (a) 트리도 accountId 스코프(단, 시드/공용 조상 누락 위험), 또는 (b) 비소유 노드를 non-clickable 처리하고 상세 읽기가 공개 의도인지 확정. 공개-트리 의도와는 (b)가 정합.
- **근거/effort**: effort **M**. 최악 열거 경로는 상향 상세 fetch가 이미 스코프돼 대부분 차단되나, 소유자 자기 트리 안의 시드/관리자 소유 인물 노드가 死 카드가 되는 UX 결함은 실재.

---

## 3. UX·시각 개선 (정보그래픽 관점)

정보그래픽으로서의 "가독성 회복"을 묶는다. 대부분 저비용·눈에 띄는 개선.

### 3.1 오버뷰 부재 — 줌/팬/fit-view 없음 — findings #13
- 임베드 `TreeCanvas`는 `overflow-x:auto`뿐, 카드는 하드 192×232px(`constants.ts` NODE_W/H), zoom/fitView/minimap 전무(`person-genealogy-infographic.tsx:951`). 독립 페이지는 React Flow로 이미 해결 → 두 서프스 격차. **특히 `!embedInModal` 게이트(`:2201`)로 모달 임베드 모드엔 '전체 가계도 보기' 탈출구조차 없어** 넓은 트리가 진짜 막다른 길.
- **제안**: 임베드에 최소 '전체 맞춤'(scrollWidth vs clientWidth 측정 후 `transform:scale`) + 스크롤 그림자 gradient. 모달 모드에서도 전체보기 링크 노출. 장기적으로 두 서프스를 React Flow로 수렴.

### 3.2 다중혼 자식이 배우자별로 묶이지 않음 — findings #1
- 다배우자는 SpouseStack(배우자 1/2/…)로 세로 쌓이나 모든 자식이 ego의 단일 수직 drop에서 하나의 `ForkToChildren`로 매달림(`:676`, `:683`). `parentMarriageId`는 백엔드가 fetch하고 `NodePerson`(`types.ts:28`)까지 실려오지만 렌더에서 **한 번도 읽히지 않음**. 여러 후궁을 둔 왕에서 어느 자식이 어느 배우자 소생인지 알 수 없다 — 왕조/안네표 차트가 존재하는 바로 그 이유를 놓침.
- **제안**: `childList`를 `parentMarriageId`(없으면 추론된 공동부모)로 버킷팅해 각 ♥ join에서 별도 자식 fork를 내림(위키피디아 왕조 차트 방식). 최소한 각 자식에 SpouseStack 항목과 매칭되는 consort 인디케이터(색/이니셜) 뱃지. (엣지에 PersonSpouse id가 없어 정확 매칭엔 소규모 백엔드 추가 필요하나, 공동부모 fallback은 기존 데이터로 파생 가능.)

### 3.3 이복형제 미구분 — findings #16
- Step7 및 클라이언트 `siblingsByPersonId`(`:139`) 모두 한쪽 부모 공유를 형제로 인정하나 half/full 표시 없음. `illegitimate` 별표는 개인 적법성 플래그일 뿐 ego 대비 이복 관계 뱃지가 아니다. 서자/이복이 역사적으로 중요한 도메인.
- **제안**: 자식별 부모집합 교집합으로 half/full 판정(이미 `ftParentsOf`로 부모 ID 집합 보유 → 대부분 클라이언트에서 계산 가능) → 이복/이부 뱃지. `parentMarriageId`도 노드에 이미 존재하므로 백엔드 재작업 최소.

### 3.4 사촌혼 '외 N명' 도달 불가 — findings #18
- `InMarriageMark`가 `pointer-events:none`(`card.tsx:784`) + ellipsis라 전체 파트너 목록이 title/aria-label에만 있고 hover 툴팁조차 안 뜬다. 왕가 재혼 추가 파트너가 시각적으로 은폐.
- **제안**: 칩을 포커스/hover 가능하게(popover) 하거나, 이미 body로 portal되는 `CardHoverInfo` 버블로 라우팅.

### 3.5 플레이스홀더 이니셜 충돌 — findings #27
- `displayInitial`(`utils.ts:128`)는 성씨 충돌('합/합/합') 방지용으로 given-name 첫 글자를 쓰지만 `GeoThumbnail`에만 연결. `DescendantNode`(`card.tsx:358`)와 `AncestorColumn`(`ancestor-column.tsx:97`)은 전체 표시명 첫 글자를 재구현 → 같은 성 조상/후손 아바타가 전부 동일 성씨 글자. 사진 없는 노드의 유일한 구분 단서를 무력화.
- **제안**: 두 인라인 계산을 `displayInitial(person)`으로 교체(타입 호환됨, western은 no-op).

### 3.6 긴 이름 무리버설 클리핑 — findings #28
- `NodeName`은 `nowrap+ellipsis`(`card.tsx:685`), title/hover 버블은 메타(원어/작호/…)만 담고 **표시명은 안 담음**(`buildPersonTooltipLines`). 메타 없는 긴 이름 인물은 title도 버블도 없어 전체 이름 복구 불가(마우스 유저 기준).
- **제안**: `title={displayName}`을 `NodeName`에 부여하거나 툴팁 첫 줄에 표시명 prepend.

### 3.7 같은 인물, 위치별 다른 국기 — findings #29
- 플래그 우선순위가 렌더 경로별로 다름: ego/spouse/child는 `useNodePersonFlag`가 `person.country` 우선(`card.tsx:216`), ancestor/descendant는 `familyTreePersonFlag`가 `sovereignCountry` 우선(`card.tsx:238`). 재위국≠국적인 군주(외국출신·동군연합 — 겨냥 도메인)가 조상일 때와 배우자/자식일 때 다른 국기 → 독자가 데이터 오류로 읽음. 개발자도 인지한 미완 롤아웃(`ancestor-column.tsx:22`).
- **제안**: `sovereignCountry > country` 단일 헬퍼로 전 경로 통일.

### 3.8 독립 페이지 truncation이 영문 raw 키 출력 — findings #30
- 페이지가 `${t.scope} ${t.took}+`로 'grand-aunts-uncles 80+' 같은 kebab-case 영문을 한글 알림 안에 출력(`genealogy.page.tsx:762`). 임베드 위젯은 `TRUNCATION_SCOPE_LABEL`(`constants.ts:20`)로 한글화 + 친절 배너.
- **제안**: 페이지에서 `TRUNCATION_SCOPE_LABEL`(및 배너 컴포넌트) 재사용.

### 3.9 심볼 범례 부재 — findings #25, #37 (동일 건, 아래 6.3 a11y와 연동)
- `*`(혼외)·`†`(사망)·`♛`(군주)·`♥`(혼인) 글리프에 범례 없음. `*`는 aria-label도 없어 스크린리더가 '별표'만 읽고 인접 `†`는 'aria-label=사망'.
- **제안**: 헤더 아래 접이식 범례 한 줄 + `*`를 `<span aria-label="혼외자">`로 래핑.

---

## 4. 데이터모델·기능확장 (additive 스키마/DTO)

모두 **additive nullable/enum이라 무백필·무데이터이동**. §2.1 DTO 계약화 후 진행해야 end-to-end 타입 강제됨. 마이그레이션은 CLAUDE.md 규약대로 `libs/db/prisma/*.prisma` 소스부터 수정 → `db:build`.

### 4.1 부모-자식 엣지에 role 부재 — findings #6
- BFS는 각 자식의 fatherId/motherId를 알지만 emit 엣지는 role 없는 `{source,target,type:'parent-child'}`(`repo:4751`). 클라이언트가 `ftResolveParentIds` 휴리스틱(`family-tree-derive.ts:45`)으로 gender 문자열→DB 컬럼순으로 재추론 → gender null/비표준 시 오배치.
- **제안**: 엣지에 `parentRole:'father'|'mother'` 추가(`addPCEdge`가 이미 FK별로 실행되므로 매칭된 FK로 세팅). **순수 DTO 변경, 무마이그레이션**. (half-sibling은 `parentMarriageId`가 이미 노드에 있어 별도 `via` 키는 불필요 — 리뷰 과정에서 finding의 half-sibling 논거 일부 과장 확인.)

### 4.2 배우자 순위/랭크 컬럼 부재 — findings #7
- `PersonSpouse`는 `@@unique([personId,spouseId])`에 marriage dates/note만(`person.prisma:438`). 정실/후궁·1·2비 순위가 free-text `note`로만 표현. SpouseStack '배우자 1/2/…'는 fetch 순서(orderBy 없음, random UUID PK 스캔)라 **편집 후 순서가 실제로 뒤섞임**.
- **제안**: additive nullable `spouseOrder Int?` 및/또는 `consortRank` enum(PRIMARY/SECONDARY/CONCUBINE/MORGANATIC/UNKNOWN). 엣지에 노출 + SpouseStack 정렬. effort **M**(마이그는 trivial, DTO/createMany 매핑/BFS meta/정렬/큐레이터 UI 필요).

### 4.3 결합상태(약혼/이혼/무효/사별) 부재 — findings #19
- `PersonSpouse`는 marriage-only(`person.prisma:427`). 약혼(왕조적으로 중요 — 성사 안 된 정략혼 다수)·annulment·이혼vs사별이 무날짜 결혼이나 무관한 `LOVER` 태그로 붕괴.
- **제안**: additive `unionType`/`status` enum(BETROTHED/MARRIED/DIVORCED/ANNULLED/WIDOWED/UNKNOWN) default MARRIED, 엣지 노출 → 약혼은 dashed 커넥터. 기존 행은 MARRIED로 읽힘.

### 4.4 입양/양친/의붓/후견 불표현 — findings #2 (§4.1~4.3보다 큼)
- `Person`은 생물학적 `fatherId/motherId`뿐(`person.prisma:209`), gender-slot 타입. 입양(로마/조선 양자 상속 — 도메인 핵심)·의붓·후견·양부양부/양모양모 불가. 유일 탈출구 `RELATIVE` 태그는 무구조.
- **제안**: additive `PersonParentLink` join(personId, parentId, role enum BIOLOGICAL/ADOPTIVE/FOSTER/STEP/GUARDIAN, acknowledged, sinceDate, note) — 기존 FK를 BIOLOGICAL fast-path로 유지하고 union을 `findFamilyTree`에서 읽어 엣지 role emit. **신규 테이블만, 무데이터이동**. 저비용 임시안: nullable `adoptiveFatherId/motherId` + `isAdopted`.
- effort **L**(BFS ~11단계 + 엣지 role emit + DTO + nestia + 프론트 렌더 관통). 무능동해악이라 P2.

### 4.5 `dynastyOrdinal` fetch 후 폐기 — findings #31
- BFS가 `dynastyOrdinal` select(`repo:4313`)하나 노드 빌더는 `regnalNumber`만 emit(`repo:4702`)하고 폐기. `take:1`로 다국 군주(부르봉=프랑스+스페인) 최초 재위만 남음.
- **제안**: `sovereignCountry`에 `dynastyOrdinal` 추가(+클라이언트 타입). 승계 표기 위해 전체 재위 배열 emit 고려('프랑스 부르봉 5대 · 스페인 1대'). additive, 무마이그. (인물 상세 패널엔 이미 노출됨(`tenure-reign-list.tsx:138`) — 갭은 가계도 카드 한정, polish급.)

### 4.6 inferred 배우자 플래그가 provenance 아닌 메타부재로 계산 — findings #12, #33 (동일 건)
- `inferred = start==null && end==null && note==null`(`repo:4756`). 실제 PersonSpouse 행이 있어도 날짜/노트 공란이면 inferred=true → 독립 페이지가 확정 결혼을 흐린 점선 '추정' 엣지로 그림(`genealogy.page.tsx:325`). 역사 인물은 날짜 공란이 흔해 오검출 현실적.
- **제안**: `spouseEdgeMeta`에 `derived` boolean 추가 — Step5 공동부모 파생 엣지(`repo:4531`, meta 없이 add)만 true, PersonSpouse 유래(`repo:4434/4437`)는 메타 채움 여부와 무관하게 false. **소규모, 무마이그**.

### 4.7 RELATIVE 방계 친족 미표현 + 무구조 — findings #15
- `findFamilyTree`가 `PersonHumanRelationship`를 아예 안 query해 `RELATIVE` 태그 친족이 트리에 안 뜸(단, 별도 관계 섹션엔 노출). RELATIVE는 삼촌/사촌/조카/인척 하위타입 없는 flat 태그.
- **제안**: (모델) `kinshipType` enum 또는 RELATIVE를 소enum(UNCLE_AUNT/COUSIN/NEPHEW_NIECE/IN_LAW/GRANDKIN/OTHER)으로 승격. (읽기) ego의 RELATIVE 관계를 query해 `relative` 엣지 타입으로 dashed/aux 렌더. additive. **P3 — 저우선**.

---

## 5. 저작(편집) 플로우 개선

읽기/편집 격차의 본체. §2.1 DTO + §4 모델이 선행 조건인 항목 있음.

### 5.1 하향 저작 불가 — 다세대 트리가 자식별 왕복 — findings #3
- '가족' 탭은 father/mother/spouse 슬롯만(`family-section.tsx:198`), 어디에도 '자식 추가' UI 없음. 부모 엣지가 자식 위의 단방향 스칼라 FK라 자식을 붙이려면 그 자식을 열어 위로 가리켜야 함 → 3세대 왕가 = 후손 1인당 왕복 1회. 읽기전용 인포그래픽/독립 페이지는 후손을 아름답게 그리나 생성 수단 0.
- **제안**: 노드 클릭 모달에 '자녀 추가'/'부모 추가'/'배우자 추가' 버튼 → `PersonSelectModal` pre-wired로 새 인물의 fatherId/motherId를 클릭 노드로 세팅(자식 생성은 새 인물에 FK 쓰기 = **무스키마변경**). 읽기전용 인포그래픽을 저작 서프스로 전환.

### 5.2 트리에서 기존 인물 검색·연결 진입점 없음 — findings #22
- 인포그래픽·독립 페이지 완전 읽기전용(노드 클릭=상세 모달 push/route). 기존 인물 검색-연결은 편집폼 `PersonSelectModal` 안에만. 큐레이터가 트리에서 누락 링크를 봐도 제자리 연결 불가 → 대상 인물 열어 FK 편집해야.
- **제안**: 노드 클릭 플로우에 '기존 인물 연결…' → `PersonSelectModal` 검색으로 적절 FK 쓰기(클릭 노드를 검색 인물의 부/모/자/배우자로). 5.1과 한 배치. 관계 방향 시맨틱 + 두 소비 컨텍스트(임베드 패널 vs 독립 페이지) 배선 필요 → effort **M**.

### 5.3 배우자 저작이 대표 1명 캡 + 결혼날짜 입력 불가 — findings #4
- 폼에 배우자 슬롯 1개('대표 1명', `family-section.tsx:238`) + free-text note. 편집 시 2번째+ 동시 배우자는 라운드트립 보존되나 첫 번째만 편집 노출. `SpouseRelationDto`에 결혼 start/end 있으나 폼에 날짜 입력 없음(보존된 날짜만 carry). 정실/후궁·순차 재혼이 도메인 핵심인데 순서는 free-text로만.
- **제안**: 단일 슬롯을 반복 배우자 행 리스트(add/remove)로 — 각 행 spouseId + marriageStartDate/EndDate + note (+ §4.2 rank). 이미 존재하는 DTO 필드의 자연스러운 거처, 인포그래픽이 이미 렌더하는 다배우자를 저작 해금. **무백엔드변경**. effort **L**(스칼라→배열 상태 전환 + 행별 피커/날짜 + 단일배우자 결합점 언탱글: 128/140/152/204/220 exclude, 104 快배정, buildSpouseRelations, hydration).

### 5.4 `illegitimate`·`parentMarriageId` 렌더되나 저작 불가 — findings #11
- `illegitimate`(별표)·`parentMarriageId`는 스키마 존재 + 위젯이 읽음(`card.tsx` 별표 3곳)이나 `create-person.dto`에 없고 폼 컨트롤 없음. 별표는 **그려지지만 켤 수 없는 반쯤 지어진 기능**.
- **제안**: 가족 섹션에 `illegitimate` 체크박스 + DTO 추가(저비용, 렌더는 이미 완성). `parentMarriageId` 피커는 §5.3 다배우자 행 뒤 2단계. 

### 5.5 고아 死코드 — findings #38
- `family-member-card.tsx`(247줄)는 어디서도 import 안 됨. 라이브 탭은 `InlineSearchSelect` 사용. 저작 플로우 확장자를 오도.
- **제안**: 삭제(또는 그 리치카드 UX를 실제 슬롯 렌더러로 채택). effort **S**.

---

## 6. 성능·접근성

### 6.1 접근성 (a11y)
- **`role="tree"` 오류 그래프 — findings #8**: 캔버스는 `role="tree"`(`:455`)이나 자손에 `treeitem`/`group` 0개(전부 `role="button"`). WAI-ARIA 위반 — 스크린리더가 항목 없는 트리를 announce, 키보드 유저는 세대 간 화살표 이동 없이 전 노드를 Tab. **제안**: 정직한 최소안 = `role="tree"` 제거 → 라벨된 region/list + GenerationBlock별 aria-label(effort S). 완전안 = `treeitem`+`aria-level`+roving-tabindex(effort L).
- **형제 모달이 공용 Modal 우회 — findings #14, #26 (동일 건)**: `SiblingsListModal`/`AncestorSiblingsModal`(`modals.tsx:24/73`)이 Esc+click-outside만 손수 구현 — focus trap·scroll lock·focus restore·glass surface 없음, CLAUDE.md 모달 mandate 위반. **제안**: 공용 `<Modal>`+`useModalBehavior`로 재양육, ~90% 중복인 둘을 파라미터화 모달 하나로(카드 렌더 param 필요). effort **S~M**.
- **`*` 마커 무라벨 — findings #25, #37**: §3.9 참조. `*`를 라벨된 span으로, 범례 추가. effort **S**.

### 6.2 성능
- **~18개 순차 await 쿼리 — findings #21**: `findFamilyTree`가 Step1~11 무병렬 순차(`repo:4425`). 배치돼 N+1은 없으나 latency 가산. **제안**: 같은 입력세대 스텝을 `Promise.all`(children+siblings+삼촌 병렬). **단 리뷰에서 확인**: Step9(전 nodeMap 읽음)는 배리어, Step11⊃Step10 의존 → 이상적 병렬로도 ~2x(critical path = 4세대 조상체인 + Step9 배리어 + 10→11 꼬리), 'several-fold' 아님. PK/인덱스 소형 lookup이라 실측 영향 modest. effort **M**, **저우선**.
- **memoization 무력화 — findings #35**: `childList`(`:227`)/`siblingList`/`spouseList`가 인라인 `.filter()`로 매렌더 새 배열 → 이를 dep로 쓰는 `descendantsByParentId` useMemo(`:239`)의 3-phase BFS가 매렌더 재계산. **제안**: 세 배열을 useMemo 래핑. **단**: genealogy 탭에서만 렌더 + 카드 hover는 로컬 state라 재렌더 안 유발 → 실영향 sub-ms. effort **S**, cleanup급.
- **카드별 전역 scroll(capture) 리스너 — findings #34**: 매 `CardHoverInfo`가 window scroll(capture)+resize 등록(`card.tsx:76`) → O(nodes). **단 리뷰 확인**: `reposition`이 `if(visible)`로 hover된 1개만 `getBoundingClientRect` 실행, 나머지는 boolean read 후 반환 → 실제 jank 근거 약함(finding severity 과장). **제안**: hover/focus 중에만 리스너 등록, 또는 위젯 레벨 단일 shared 리스너. effort **S**, **저우선**.

### 6.3 완결성/기타
- **cousins 무조건 누락 — findings #32**: `includeCollaterals=true`여도 `void auntsUnclesIds`(`repo:4610`)로 사촌 미fetch → 삼촌은 있고 그 자식은 없는 비대칭. **제안**: `includeCousins` 플래그 뒤에 `fetchChildrenOf(auntsUnclesIds)`(scope 'cousins', cap) + truncation 기록. 의도된 폭발방지 tradeoff이므로 완결성 갭. effort **S**.
- **truncation 실오버플로 미공개 + 비결정 subset — findings #17**: `fetchBatch`가 `Set.slice(0,cap)`로 임의(무순서) 절단, 실excess 미기록 → 배너가 '3 vs 300 숨김'을 못 말함. **제안**: take 경로는 `count()` 또는 `>take` report, cap 경로는 id로 결정적 정렬 후 slice. Habsburg급 초과 시만 발동, 저우선.

---

## 7. 추천 실행 순서 (레버리지順 배치)

### 배치 1 — "새는 곳 막기 + 계약 고정" (S~M, 최고 레버리지)
**목표**: 저비용 correctness 버그 제거 + 이후 모든 additive 작업의 타입 전제 확보.
- #23/#36 캐시 키 통일(1줄), #24+#10 자기부모/순환/날짜 서버 가드 + 방어적 self-엣지 skip, #9 배우자 쓰기 대칭화, #5 계정 스코프 정책 결정, **#20 `FamilyTreeResponseDto` 계약화(키스톤)**, #38 死코드 삭제.
- *왜 먼저*: #20이 배치 3의 모든 DTO 확장을 컴파일타임에 강제. 나머지는 한 줄~중간 비용으로 실버그 제거.

### 배치 2 — "저작 기초 해금" (M, 사용자 체감 큼)
**목표**: 읽기/편집 격차의 즉효 부분 — 이미 렌더되는 것을 켤 수 있게.
- #11 `illegitimate` 저작(체크박스+DTO, 렌더 완성됨), #4 배우자 반복 행 + 결혼날짜 입력, #3+#22 트리 노드에서 하향 '자녀/부모/배우자 추가' 및 '기존 인물 연결'.
- *왜*: #4/#11은 백엔드 무변경(또는 DTO 필드만), 인포그래픽이 이미 그리는 것을 저작 가능케 함. #3는 다세대 입력 최대 마찰 제거.

### 배치 3 — "데이터모델 additive 확장" (M~L)
**목표**: 왕조 도메인 표현력 — 전부 무백필 마이그레이션.
- #6 엣지 `parentRole`(무마이그), #12/#33 inferred provenance 플래그, #31 `dynastyOrdinal` 노출, #7 배우자 rank/order, #19 결합상태 enum, #2 `PersonParentLink`(입양). 
- *왜 배치 2 뒤*: 계약(#20)·배우자 저작(#4)이 선행돼야 rank/union이 UI에서 유의미. #6/#12/#31은 저비용 먼저.

### 배치 4 — "정보그래픽 시각·일관성" (S 다수)
**목표**: 두 서프스/카드 경로 시각 규약 통일 + 가독성.
- #1 배우자별 자식 fork(#7 rank 활용), #16 이복 뱃지, #13 줌/fit + 모달 탈출구, #29 플래그 우선순위 통일, #27 이니셜, #28 긴이름 title, #18 사촌혼 칩, #30 scope 한글화, #25/#37 범례+`*` 라벨.
- *왜*: 대부분 S, 배치 3의 새 데이터(rank/role/dynastyOrdinal)를 시각에 반영하며 함께.

### 배치 5 — "a11y·성능·완결성 마감" (S~M, 저우선)
**목표**: 규약 준수 + 잔여 갭.
- #8 `role="tree"` 정상화(최소안 먼저), #14/#26 형제 모달 공용 Modal 이관, #35 memoization, #34 리스너 게이팅, #21 쿼리 병렬화, #32 cousins, #17 truncation 카운트, #15 RELATIVE 친족.
- *왜 마지막*: 실측 영향이 낮거나(퍼포먼스 3건 severity 과장 확인) 니치 완결성. 단 #8/#14 a11y는 mandate 위반이므로 배치 4와 병행 가능.

---

**참고 파일 경로**:
- 백엔드 BFS: `apps/api/src/libs/person/infrastructure/person.prisma.repository.ts:4283-4778`
- 컨트롤러/DTO: `apps/api/src/libs/person/presentation/person.controller.ts:402`, `dto/create-person.dto.ts:425`, `dto/person.response.ts`
- 스키마 소스: `libs/db/prisma/person.prisma:76,185,189,209,423-440` (CLAUDE.md 규약: 소스 수정 후 `db:build`)
- 클라이언트 계약: `apps/web-admin/src/shared/api/persons-family-tree.ts`
- 임베드 위젯: `apps/web-admin/src/widgets/person/person-genealogy-infographic/{person-genealogy-infographic.tsx,card.tsx,ancestor-column.tsx,modals.tsx,constants.ts,utils.ts,family-tree-derive.ts}`
- 독립 페이지: `apps/web-admin/src/pages/genealogy/genealogy.page.tsx`
- 저작 폼: `apps/web-admin/src/shared/ui/person-register-modal/{sections/family-section.tsx,person-register-view.tsx,family-member-card.tsx(死)}`
- 임베드/무효화: `apps/web-admin/src/widgets/person/person-detail-panel/person-detail-panel.tsx:424,701,2160-2216`