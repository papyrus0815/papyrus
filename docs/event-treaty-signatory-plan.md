# 사건 참여국 · 조약 — 설계와 구현 기록

작성일 2026-09-23 · 브랜치 `feature/service-manager-v2` · **구현 완료(미커밋)**

> 출발 질문: **"사건 등록할 때 조약 같은 걸 등록하려는데, 체결한 국가들을 디테일하게 작성하고 싶다."**
> 방침: 기존 설계에 맞추지 말고 **개념부터 다시 잡아** 가장 좋은 형태로 만들 것.

---

## 1. 무엇이 문제였나

세 개의 개념이 같은 일을 따로 하고 있었다.

| 개념 | 어디에 | 무엇을 표현 |
|---|---|---|
| `relatedCountryIds` / `relatedHistoricalCountryIds` | DTO·폼·상세 | "이 사건에 이 나라가 관련됨" |
| `primaryCountryId` (별표 ★) | 등록 폼 | "이 나라가 주도국" |
| `EventCountryRelation.role` 10종 + `roleDescription` | DB·시드 전용 | "이 나라가 무슨 배역" |

셋이 따로였기 때문에 셋 다 반쪽이었다.

- **역할은 화면에 존재하지 않았다.** 서버는 `role`을 내려주는데 프론트 타입
  `EventDetailCountryRef`가 `{id,name,flagEmoji}`라 **받자마자 버렸다.** 시드가 채운
  `role_description` 204행은 한 번도 렌더된 적이 없다.
- **저장은 delete-and-recreate였다.** 관련국을 **하나만 추가해도** 전량 삭제 후
  `primary 일치 ? INITIATOR : PARTICIPANT`로 재생성 — 역할 10종과 서술이 통째로 증발.
  상세 경로는 `primaryCountryId`를 보내지도 않아 INITIATOR까지 눕었다.
  **270 사건 중 66건(24%)** 이 한 번만 건드리면 복구 불가였다.
- **순서 이동은 저장되지 않았다.** 순서 컬럼이 없어 `createdAt asc`로 읽었는데
  생성이 한 트랜잭션에 몰려 같은 밀리초를 공유(실측 113묶음) — 버튼은 있는데 무효였다.
- **조약은 사건과 완전히 분리돼 있었다.** `Treaty`/`TreatySignatory`는 서명 인물·직책·
  내각·국가별 서명일·조항까지 갖춘 풍부한 도메인인데, '회담/조약' 사건 35건과 조약 14건
  사이에 연결이 **0건**. 게다가 서명 인물·내각 입력이 **생 UUID 텍스트 필드**라
  `person_id`·`cabinet_id`가 42행 중 **0건**이었다.

---

## 2. 새 개념 — 참여국(Participant) 하나로 접다

**한 줄 = "이 사건에서 이 나라가 맡은 배역"**
= 국가(현대 | 역사) + 역할 + 역할 서술 + 비고 + 순서.

여기서 세 개념이 하나가 된다.

- **주도국 = `role: 'INITIATOR'`.** 별표(`primaryCountryId`)라는 개념은 **삭제**했다.
  역할이 이미 10종인데 그중 하나만 따로 boolean으로 들고 있을 이유가 없다.
- **현대·역사를 한 배열에.** 순서(sortOrder)가 두 축에 걸쳐 하나이므로 편집도 하나여야
  한다. 서버 응답만 표시 편의로 두 배열로 나눠 보낸다.
- **요청 필드는 `relatedCountries` 하나.** `relatedCountryIds`·
  `relatedHistoricalCountryIds`·`primaryCountryId`·`primaryHistoricalCountryId` 네 개는
  요청 계약에서 **제거**했다(응답의 id 배열은 목록 필터가 쓰는 파생값이라 유지).

조약은 별도 축이다.

- **조약 본문·조항·서명자는 `Treaty`가 정본**이고 사건은 링크만 갖는다. 서명 인물·직책·
  국가별 서명일은 *조약에만 있는 사실*이라 사건 쪽에 복제하지 않는다.
- 체결·비준·파기는 **각각 다른 사건**이므로 단일 FK가 아니라 `(조약, 사건, 자격)`
  링크표다.

---

## 3. 구현

### 3.1 스키마 (마이그레이션 1개)

`20260923005424_add_event_country_sort_and_treaty_event_link`

```prisma
model EventCountryRelation {
  role            EventCountryRole   // INITIATOR가 곧 주도국
  roleDescription String?  @db.Text
  note            String?  @db.Text
  sortOrder       Int      @default(0) @map("sort_order")   // 신규
  @@index([eventId, sortOrder], name: "idx_event_country_eventId_sortOrder")
}

enum TreatyEventLinkType { SIGNING RATIFICATION VIOLATION RELATED }

model TreatyEventLink {                                      // 신규
  treatyId String; eventId String; linkType TreatyEventLinkType @default(SIGNING)
  note     String? @db.Text
  @@unique([treatyId, eventId, linkType], name: "uq_treaty_event_link")
}
```

- `sort_order`는 기존 표시 순서(`created_at, id`)를 `ROW_NUMBER()`로 **백필**했다.
  안 했으면 그동안 보이던 관련국 순서가 한 번 뒤섞였다.
- `migrate dev`는 shadow DB가 기존 마이그레이션에서 죽어(P3006) `migrate diff` →
  수동 적용 → `migrate resolve --applied` 경로로 넣었다(레포 관례).
- **`@@unique([eventId, countryId, historicalCountryId])`는 일부러 넣지 않았다.**
  두 FK 중 하나는 항상 NULL이고 MySQL은 NULL을 서로 다른 값으로 보므로 아무것도 막지
  못한다(조용히 무력한 인덱스). 자연키를 컬럼으로 승격하는 안도 기각 — 시드 46개가
  `prisma.eventCountryRelation.create`를 직접 호출해 NOT NULL 컬럼이 늘면 전부 깨진다.
  중복 방지는 쓰기 단일 통로가 진다(§3.2).

### 3.2 쓰기 단일 통로 — `EventCountryParticipantService`

`apps/api/src/libs/event/application/event-country-participant.service.ts`

**자연키 머지.** 키는 `m:<uuid>` | `h:<uuid>`.

```
keep   = 기존 ∩ 요청 → 달라지는 필드만 UPDATE. 같으면 UPDATE조차 안 한다
remove = 기존 − 요청 → deleteMany
add    = 요청 − 기존 → create (역할 미지정이면 PARTICIPANT)
sortOrder = 배열 index
```

줄 단위 필드는 레포 공통 **3상**: 생략=유지 · `null`=비움 · 값=설정.
그래서 "국가 칩 하나 추가"(id만 보내는 요청)가 그 사건의 큐레이션을 건드리지 않는다.
전체가 `$transaction` 안에서 돈다(예전 `Promise.all` + 개별 create는 부분 실패 시
관련국이 반쯤 지워진 채 남았다).

가드: 한 줄에 두 FK 동시 지정 400 · 국가 없는 줄 400 · 같은 국가 두 줄 400.

### 3.3 서비스 시그니처 정리

`createEvent`/`updateEvent`의 위치기반 인자 13개(+`undefined` 체인)를 **options 객체**로
바꿨다. 국가 슬롯 4개가 1개로 줄면서 위치 규약이 어차피 깨지는 자리였고, 스펙의
`undefined, undefined, undefined, …` 나열도 같이 사라졌다.

```ts
createEvent(data, { relatedCountries, relatedPersons, eventSections, … })
updateEvent(id, data, { relatedCountries, childEventIds, parentLinkReasons, … })
```

### 3.4 API 계약

| | Before | After |
|---|---|---|
| 요청 | `relatedCountryIds` · `relatedHistoricalCountryIds` · `primaryCountryId` · `primaryHistoricalCountryId` | **`relatedCountries: [{countryId?, historicalCountryId?, role?, roleDescription?, note?}]`** |
| 저장 시맨틱 | delete-all + recreate | 자연키 머지(keep 무손실) |
| 응답 참여국 | `{id,name,flagEmoji,role}` | `+ roleDescription, note, sortOrder` |
| 응답 | — | `+ treaties[]` (상세 전용) |
| 조약 | — | `POST /treaties/:id/events` · `DELETE /treaties/event-links/:linkId` · `GET /treaties?eventId=` |

### 3.5 프론트

- **정본 모델** `entities/event/model/country-participant.ts` — 타입·역할 라벨 10종·
  `participantKey`·`toParticipants`(두 배열 → 한 목록). 폼과 상세가 같은 것을 쓴다.
- **등록 폼**: 국가 칩 → **행**(국가 · 역할 셀렉트 · "이 나라가 한 일" 입력 · 삭제).
  별표 토글과 그 styled는 삭제. ← *원래 질문이 여기서 끝난다.*
- **사건 상세 참여국**: 인물 행과 같은 편집 수준으로 승격 — 역할 피커(InlineSelect),
  역할 서술·비고 인라인 편집, 순서 이동(이제 실제로 저장된다), 현대·역사 한 목록.
- **조약 모듈**(`detail-treaties.tsx`): 연결 / **이 사건에서 체결된 조약 만들기** /
  연결 해제. 만들기는 사건의 제목·시작일·위치·**참여국을 서명국 초안으로 승격**해
  POST 한 번으로 끝낸다(역할 → 참여유형 매핑, 역할 서술 → 서명국 note).
- **서명자 피커**: 생 UUID 입력 → 인물 선택 모달 + 서명국으로 스코프된 행정부 셀렉트.
- **undo**: `relatedCountries` 통째로 되돌린다(예전엔 id만 되돌려 역할 편집 undo가
  역할을 복원하지 못했다).

---

## 4. 검증

- `tsc` API·web 각각 **exit 0**
- jest: API **177 pass**, web **915 pass** / 실패는 전부 기존 건(EventTreeView 9,
  cabinets-section 2, `import.meta` 3스위트 — stash 대조로 동일 확인)
- 신규 spec 9건(`event-country-participant.service.spec.ts`) — 무손실·3상·순서·중복 가드
- 변경 파일 lint: **95 → 70**(신규 0, 레거시 25건 제거)
- **라이브 실DB 라운드트립** (API :8000, admin/1234)

```
대상: 샌프란시스코 강화조약 체결 (14행, role 4종, 서술 14행)
국가 1개 추가(PUT relatedCountries, 역할 미전송)
  → 15행 / ✅ 무손실 — 기존 14행의 역할·서술 전부 생존, 새 행 PARTICIPANT sortOrder=14
역할만 변경(PARTICIPANT→MEDIATOR)
  → ✅ 역할 바뀌고 서술 보존

조약 생성(참여국 14 → 서명국 14 승격)  SIGNATORY 9 · OBSERVER 5 · note 이관 14건
사건 연결 201 / 같은 자격 중복 400 / 다른 자격(비준) 201
사건 상세 treaties 2건 · GET /treaties?eventId= 1건
연결 해제 → 조약 유지 · 조약 삭제 → 링크 CASCADE 0
사건 참여국 최종 14행 / 서술 14행 (변동 없음)
```

---

## 5. 남은 것 · 알려진 제약

- **커밋**: 전부 미커밋.
- **BC 조약 불가**: `Treaty.signDate`가 `DateTime` NOT NULL이고 BC 구조화 필드
  (`startEra`/`startYear` 계열)가 없다. 레포 규약상 DATETIME은 AD1000+만 안전하므로
  BC·고대 조약은 이 경로로 등록할 수 없다 → 별도 마이그(구조화 9컬럼) 과제.
- **비대칭**: `relatedPersons`·`eventSections`·`eventImages`는 여전히
  delete-and-recreate다. 참여국만 머지로 올린 이유는 *큐레이션된 데이터가 거기 있기
  때문*(코드 주석에 명시). 인물에 role/note 큐레이션이 쌓이면 같은 처방이 필요하다.
- **시드**: 46개 시드는 prisma를 직접 쓰므로 `sortOrder`가 0으로 들어간다(정렬은
  `createdAt` tiebreak로 폴백). 새 시드는 sortOrder를 채우는 편이 낫다.
- **브라우저 시각 검증 미실시** — 크롬 확장 미연결. 타입·테스트·API 라운드트립까지만 확인.
