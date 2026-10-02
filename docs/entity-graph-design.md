# 엔티티 연결 그래프 — 설계

> 상태: **P1 구현 완료** · 2026-10-02 (API·투영 17개·인물 상세 '연결' 묶음)
> 목적: 인물·국가·사건·가문·조직·조약·군사·민족… 모든 엔티티가 **서로를 통해 건너다닐 수 있는**
> 구조. 도메인이 늘어도 연결 비용이 곱으로 커지지 않게 한다.

## 1. 왜 — 지금 구조의 한계 (실측 2026-10-02)

| 문제 | 근거 |
|---|---|
| 연결이 **쌍마다 전용 테이블·API·화면** | 인물 하나에 사건참여·조직역할·조약서명·부대지휘·진영지휘·당직·당원·후보·재임·재위·건국주체·경력 9종이 각각 별도 구현. 새 도메인(민족)을 붙이려면 또 테이블·API·양쪽 화면 |
| "이 엔티티와 이어진 **모든 것**"을 물을 방법이 없음 | 화면마다 그 화면 작성자가 기억한 관계만 보인다(예: 인물 개요에 '참여 사건' 섹션 없음) |
| 국가가 **두 갈래(현대/역사)로 30개 모델에 복제** | `countryId`+`historicalCountryId` dual-FK 30곳. 소비처마다 정본 판정을 재구현 |
| 시간 표현 불통일 | 구조화 날짜(era/year/month/day)는 7개 스키마 파일뿐, 나머지 DATETIME(기원전 불가). 재임엔 종료 정밀도 컬럼 없음 |
| 다형 참조 규격이 기능마다 따로 | `AggregateType`(댓글·알림·포인트) · `AttachmentOwner` · evidence 대상 enum · 멘션 type 5종 — 서로 다른 목록 |
| 본문 언급이 연결로 쌓이지 않음 | 언급→관계 변환은 사건 본문→인물 하나뿐 |
| 결과 | 사건 363건 중 307건(85%)에 인물 없음, 재임·재위 인물 189명이 사건 0건, 인물 64%가 연결 축 1개 이하 |

## 2. 목표 / 비목표

**목표**
- 모든 엔티티를 하나의 참조 규격 **EntityRef `{ kind, id }`** 로 가리킨다.
- 엔티티 하나를 주면 이어진 모든 엔티티를 **양방향**으로 돌려주는 **연결 색인**.
- 새 도메인은 **투영(projection) 하나**만 추가하면 모든 화면의 '연결'에 자동으로 나타난다.
- 화면은 공통 부품(엔티티 칩·미리보기·연결 패널)으로 어디서나 같은 방식으로 건넌다.

**비목표(P1)**
- 기존 전용 테이블을 없애거나 이관하지 않는다 — 풍부한 속성(재임의 경위·사유 등)은 거기가 정본.
- 그래프 저장소(Neo4j 등) 도입 없음 — MariaDB 위에서.
- 쓰기(연결 생성)는 기존 화면의 몫. 색인은 **읽기 모델**.

## 3. EntityRef — 참조 규격

```ts
type EntityKind =
  | 'person' | 'event' | 'country' | 'historicalCountry' | 'dynasty'
  | 'organization' | 'treaty' | 'militaryUnit' | 'politicalParty'
  | 'personGroup' | 'election'
  // 이후: 'ethnicity' | 'place' | 'religion' | 'law' | 'company' …
interface EntityRef { kind: EntityKind; id: string }
```

- 문자열 kind는 **프론트 멘션 type·entity-link-search type과 같은 철자**(camelCase)를 쓴다 — 세 곳이 같은 말을 하게.
- DB enum은 P2(물질화)에서 만든다. P1은 TS 유니온.
- 기존 `AggregateType`은 감사·알림 도메인용으로 남기고, 새 기능(evidence 등)은 EntityKind로 수렴시킨다.

## 4. 연결(Edge) 모델

```ts
interface ConnectionEdge {
  relation: string          // 투영 코드 'person.tenure' 등 — 안정 식별자
  relationLabel: string     // 이 방향에서 읽는 말 '재임' / 역방향 '재임자'
  group: ConnectionGroup    // 화면 묶음: polity|lineage|office|event|family|social|organization|treaty|military|…
  direction: 'out' | 'in'   // 주어 기준 정방향/역방향
  target: { kind; id; label; subtitle?; imageUrl?; accessible: boolean }
  role?: string | null      // 참여 역할·직함·관계 유형
  period?: { from: number | null; to: number | null; label: string | null }  // 부호 연도
}
```

- **period는 부호 연도 구간 하나로 정규화**한다. 구조화 날짜(era/year…)가 있으면 그것, 없으면
  DATETIME의 연도(1000년 이후만 신뢰 — 그 이전 DATETIME은 손상 이력). 날짜 체계가 통일되기 전에도
  색인 위에서는 '같은 시기' 질의가 가능해진다(P4 시간 커서의 토대).
- **accessible** — 인물·사건은 소유자 범위(계정별)라, 비소유 대상은 목록엔 남기되 누를 수 없게 표시.
  `person-contemporaries`의 `isOwned`와 같은 체제.

## 5. 투영(Projection) 레지스트리

전용 테이블 하나 = 투영 하나. 투영은 **주어 kind와 목적어 kind**를 선언하고 두 방향의 조회를 제공한다.

```ts
interface Projection {
  relation: string; group: ConnectionGroup
  subject: EntityKind; objects: EntityKind[]
  label: string; inverseLabel: string
  forward(ctx, subjectId): Promise<ConnectionEdge[]>   // 주어 → 목적어
  reverse(ctx, objectKind, objectId): Promise<ConnectionEdge[]>  // 목적어에서 주어로
}
connections(ref) = ∪ { p.forward(ref) | p.subject = ref.kind }
                 ∪ { p.reverse(ref) | ref.kind ∈ p.objects }
```

→ 사건 화면은 `person.event` 투영의 **역방향**만으로 '참여 인물'을 얻고, 역사국가 화면은
`person.tenure`·`person.reign`·`person.nationality`·`event.country`의 역방향으로 재임자·군주·
국적 인물·관련 사건을 얻는다. **반대쪽 화면을 따로 짤 필요가 없다.**

P1 투영 (17개)

| relation | 주어 → 목적어 | 정방향 / 역방향 라벨 |
|---|---|---|
| person.nationality | person → country·historicalCountry | 국적 / 국적 인물 |
| person.affiliation | person → country·historicalCountry | 소속(유형) / 소속 인물 |
| person.tenure | person → country·historicalCountry | 재임(직함) / 재임자 |
| person.reign | person → historicalCountry·country | 재위 / 군주 |
| person.statehood | person → historicalCountry | 건국·멸망 주체 / 주체 인물 |
| person.dynasty | person → dynasty | 가문 / 구성원 |
| person.dynastyFounder | person → dynasty | 시조 / 시조 |
| person.event | person → event | 참여(역할) / 참여 인물 |
| person.parent | person → person | 부·모 / 자녀 |
| person.spouse | person ↔ person | 배우자 (대칭) |
| person.relationship | person → person | 관계(유형) / 관계(유형) |
| person.group | person → personGroup | 소속 묶음 / 구성원 |
| person.organization | person → organization | 역할(직함) / 인물 |
| person.party | person → politicalParty | 당원·당직 / 당원 |
| person.treaty | person → treaty | 서명 / 서명자 |
| person.militaryUnit | person → militaryUnit | 지휘 / 지휘관 |
| event.country | event → country·historicalCountry | 참여국(배역) / 관련 사건 |

**큰 역방향 상한** — 국가의 '국적 인물'처럼 수백 건이 될 수 있는 역방향은 투영마다 상한(기본 60)을 두고
`totals[relation]`로 전체 수를 함께 준다(화면은 '외 N' → 해당 도메인 화면으로).

## 6. API

```
GET /entity-graph/:kind/:id/connections
→ { subject: { kind, id, label }, edges: ConnectionEdge[], totals: Record<relation, number> }
```
- JWT 가드. 주어가 인물·사건이면 소유자 범위로 존재 확인(미소유 404) — 기존 상세 API와 동일.
- 투영은 `Promise.all`로 병렬. 각 투영은 select 최소화(라벨·이미지·소유자 필드만).

## 7. UI — 공통 부품

| 부품 | 역할 |
|---|---|
| **EntityChip** | kind 아이콘 + 이름 + 보조(기간·역할). 누르면 그 kind의 미리보기(있으면) 또는 상세로. 비소유는 흐리게·비활성 |
| **ConnectionsPanel** | `connections` 응답을 group별로 묶어 보여준다. 묶음마다 건수, 접기, 정렬(기간순), '외 N'. **모든 상세 화면이 같은 부품** |
| 미리보기 라우팅 | person→PersonInlineModal, country/historicalCountry→CountryInlineModal, event→EventInlineModal, 그 외→상세 경로. 한 곳(`entityRoute(kind,id)`)에서 정한다 |

P1 적용 지면: **인물 상세 개요 '연결' 묶음**. 다음: 사건 상세·역사국가·가문.

## 8. 단계

| 단계 | 내용 | 스키마 |
|---|---|---|
| **P1** | EntityRef·투영 17개·`/connections` API·EntityChip·ConnectionsPanel·인물 상세 적용 | 변경 없음 |
| P2 | 연결 색인 **물질화**(`entity_link` 테이블, 투영을 쓰기 시점 동기화) → 다단계 탐색·전역 질의 | 신규 테이블 |
| P3 | **연결 제안함** — 같은 정체·같은 기간·본문 언급에서 후보 생성, 승인 시 해당 전용 테이블에 쓰기. 본문 멘션 kind 확장 | 제안 테이블 |
| P4 | **역사 날짜 값 타입** 통일 + **시간 커서**(연도 하나로 모든 화면이 그 시점 맥락) | 컬럼 정리 |
| P5 | **Polity(정체) 참조** 추상화(새 모델부터 dual-FK 중단), **Place** 엔티티(시기별 지명·좌표), **민족↔인물** | 신규·이관 |
| P6 | 연결 탐색(이웃 그래프) 뷰 | — |

## 9. 위험·결정

- P1은 매 요청 17개 쿼리 병렬 — 인물 한 명 기준 가볍다. 국가처럼 역방향이 큰 주어는 상한으로 제어, 진짜 해법은 P2.
- 투영 라벨은 서버 정본(화면 문구 드리프트 방지). 묶음(group) 순서·아이콘은 프론트.
- 연결 정본은 여전히 전용 테이블이다 — 색인은 **파생**이며 직접 쓰지 않는다(P2에서도).

## 10. P1 구현 기록 (2026-10-02)

- API `apps/api/src/libs/entity-graph/` — `domain/entity-graph.types.ts`(EntityKind 10종·Edge),
  `application/targets.ts`(kind별 select·라벨·부호 연도 정규화), `application/projections.ts`(투영 17개),
  `application/entity-graph.service.ts`(병렬 실행·`dropRedundant`·`mergeEdges`), 컨트롤러·DTO. 스펙 6.
- 서버 후처리 두 가지(실측에서 나옴)
  - **mergeEdges** — 같은 관계·방향·대상은 한 줄 + `count`·역할 앞 2개·기간 범위. 조프르 재임 15건이
    '재임 → 프랑스 제3공화국' 15줄로, 역사국가 쪽 '재임자 → 조프르' 15줄로 반복되던 것.
  - **dropRedundant** — 소속 '시민권'이 국적과 같은 나라면 국적만.
- 실측: 인물 1명 17~21ms, 역사국가(프랑스 제3공화국) 88건 21ms. 한국전쟁은 투영 역방향만으로
  참여 인물 9 + 참여국 7(배역별).
- 웹 `shared/api/entity-graph.ts`, `shared/ui/entity-graph/`(EntityChip·ConnectionsPanel·entity-kind·
  connections.lib + 스펙 4). 인물 상세 개요 '연결' 묶음(고정 내비 칩 포함) — 인물·사건·가문은 이 화면의
  모달로, 국가·조약·묶음은 상세 경로로, 조직·정당·군부대는 경로가 없어 표지.
- ⚠️ **SDK 재생성 함정** — `npm run build:nestia`는 `apps/api/src/api`를 **먼저 지우고** 생성한다.
  작업 트리에 다른 작업의 타입 오류가 있으면 생성이 실패해 SDK가 빈 채로 남고 웹 전체가 깨진다.
  그럴 땐 HEAD worktree(+자기 변경)에서 생성해 `src/api`만 복사한다 — 공용 `node_modules/.prisma`를
  덮지 않도록 worktree엔 `@prisma/client`만 실복사·나머지 심볼릭 링크 후 `prisma generate`.

다음: 역사국가·사건·가문 상세에 같은 ConnectionsPanel(역방향이 이미 동작) → P3 연결 제안함.
