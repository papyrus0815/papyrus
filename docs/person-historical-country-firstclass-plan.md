# Person 역사국가 first-class 승격 — 구현 계획 (옵션2)

> 목표: 현재 `PersonCountryAffiliation`의 CITIZENSHIP·priority=0·`historicalCountryId` 슬롯에 백엔드 id-probing으로 우회 저장하던 "주 국적이 역사국가"인 케이스를, `Person.historicalCountryId`를 정본 FK로 승격해 저장·도출·응답·폼·다운스트림을 일관되게 재배선한다. Event/Tenure/Organization의 dual-FK 선례에 맞춘다.
>
> 배경 검토서: [person-historical-country-review.md](./person-historical-country-review.md)

---

## 0. 요약 & 순서

전체 롤아웃은 **저장의 정본(스키마/리포)부터 굳히고 → 계약(DTO/응답)으로 노출 → 입력(폼) → 소비(다운스트림)** 순으로 내려간다.

| 단계 | 산출물 | 선행 의존 | 주 검증 |
|---|---|---|---|
| **1. 스키마+백필 마이그** | `libs/db/prisma/person.prisma`에 `historicalCountryId` FK + `HistoricalCountry` 역관계, additive 마이그 + 백필 UPDATE | 없음 | prisma validate, 마이그 적용, 컬럼 실재 확인 |
| **2. 리포 재작성** | create/update probing 제거·두 FK 직접기록·dual-write 미러·effective 도출 FK-first·include 6곳 | 1 | person 상세 200, 저장 왕복 |
| **3. DTO/응답/컨트롤러/SDK** | `historicalCountryId` 입력 필드, 응답 country 블록에 `isHistorical`/브리지 현대국가 id, 컨트롤러 IIFE 재작성, nestia 재생성, `shared/api` 래퍼 | 2 | tsc, 응답 계약 확인 |
| **4. 프론트 폼** | 역사국가 전용 state, `handleCountrySelect` 분기, payload 분리, 편집로드/또등록/reset/FieldHint 정합 | 3 | 등록/편집 왕복, draft 왕복 |
| **5. 다운스트림 & #1 배지** | #1 라우팅 분기, #2 가계도 국기, #3 이름순서, #4 카운트 union, 리스트/필터 | 2·3 | 배지 이동, 가계도 국기, 국가페이지 리스트 |

**커밋 분할**: (1) 스키마+마이그+백필 → (2) 리포 refactor → (3) chore(api): DTO/컨트롤러/SDK → (4) feat(web): 폼 → (5) 다운스트림. `schema.prisma`는 gitignore라 스테이징 제외.

**★ 재추가 안전성**: 이 컬럼은 과거 `20260409133932_add_person_historical_country_id`로 추가됐다가 같은 날 `20260409160000_remove_person_historical_country_id`로 되돌려졌다(사유: "PersonCountryAffiliation CITIZENSHIP priority=0가 authoritative source"). 현재 DB에 컬럼 없음 → **순수 additive**. 마이그명 `add_/remove_...`는 소진됐으니 **새 이름**(예: `promote_person_historical_country_fk`).

---

## 1. 스키마 & 마이그레이션 / 백필

### 1.1 CLAUDE.md 제약
- `apps/api/prisma/schema.prisma` 직접수정 금지 — 소스 `libs/db/prisma/person.prisma`(+`historical.prisma`)부터 → `npm run db:build`.
- 마이그는 `ts-node libs/db/prisma/run-migrate.ts <name>`. 손 SQL 금지, 백필은 `--create-only` 후 UPDATE만 덧댐.
- 병렬 스키마 WIP 드리프트 주의 — 내 hunk만 선별 스테이징.

### 1.2 `person.prisma` 필드 (onDelete=**SetNull**, 선례 일치: Organization/SovereignReign/Tenure/Event/기존 Person.country 모두 SetNull; PersonCountryAffiliation의 Cascade는 조인테이블 시맨틱이라 부적합)
```prisma
historicalCountryId String? @map("historical_country_id")
historicalCountry HistoricalCountry? @relation("PersonHistoricalCountry", fields: [historicalCountryId], references: [id], onDelete: SetNull)
@@index([historicalCountryId], map: "idx_person_historicalCountryId")
```

### 1.3 `historical.prisma` 역관계 (없으면 prisma validate 실패)
```prisma
persons Person[] @relation("PersonHistoricalCountry")
```

### 1.4 마이그 + 백필
1. 소스 수정 → `npm run db:build`(커밋 제외).
2. `ts-node libs/db/prisma/run-migrate.ts promote_person_historical_country_fk`.
3. 백필(슬롯→FK 미러, dual-write 전제):
```sql
UPDATE person p
JOIN person_country_affiliation a
  ON a.person_id = p.id AND a.affiliation_type = 'CITIZENSHIP'
 AND a.priority = 0 AND a.historical_country_id IS NOT NULL
SET p.historical_country_id = a.historical_country_id
WHERE p.historical_country_id IS NULL;
```
4. 검증: "슬롯 있음 & FK NULL" 행 수 0 확인.

---

## 2. 리포지토리 (`person.prisma.repository.ts`)

- **2.1 sanitize(296-307)**: fkKeys에 `'historicalCountryId'` 추가('' /undefined 스트립, null 통과).
- **2.2 create**: probing 블록(1783-1800) 삭제 → 두 FK 직접기록. CITIZENSHIP 슬롯 create(1818-1828)=F1종속(권장 dual-write: 조건을 `historicalCountryId||countryId`로 넓혀 미러). re-fetch include(1849-1863)에 `PERSON_INCLUDE_HISTORICAL_COUNTRY_FOR_NAME` 추가(안 넣으면 저장됐는데 화면 공란).
- **2.3 update**: probing(1879-1899) 삭제 → `'' → null` 정규화(sanitize 이후·updateData 이전 1908). 슬롯 upsert(1950-1974)=F1종속. include(2004-2017) 추가.
- **2.4 effective 도출 FK-first**(세 곳 반드시 한 배치): `getEffectiveBirthCountryId`(319-329), `resolveCountryBlockForName`(334-391, historicalCountry FK→country FK→슬롯폴백→BIRTH_PLACE), 컨트롤러 IIFE(controller:610-641).
- **2.5 include 6곳** + 신규 상수(historicalCountry.modernConnections take:1 → modernCountry flag/iso/defaultNameDisplayOrder 주입): PERSON_CARD_INCLUDE(118-163), PERSON_INFOGRAPHIC_INCLUDE(171-201), findById(1003-1034), findByIdWithRelations(1046-1047).
- **2.6 국가페이지 발견 쿼리** (F1=B 폐기 시에만): `findPersonsByAffiliationInCountry`(814)가 역사주국적 인물 놓침 → FK 기반 union 신설.
- **2.7 폴백**: 슬롯 폴백은 백필 검증(count=0) 전까지 유지(F6).

---

## 3. DTO · 응답 · 컨트롤러 · SDK

- **3.1 입력 DTO**: create-person.dto.ts(449 직후)·update-person.dto.ts에 `historicalCountryId?: string|null`(`@IsOptional @ValidateIf(v!=null) @IsString`). **countryId도 null 허용 승격**(현대→역사 전환 시 countryId=null 전송 400 방지).
- **3.2 응답(F3=b 분리)**: person.response.ts에 top-level `historicalCountryId: string|null`, country 블록에 `isHistorical?`·`modernCountryId?`(브리지 현대국가 id, 배지 이동 대상)·`thumbnailUrl?`. **countryId는 이제 항상 현대PK** → #1 배지 모호성 제거.
- **3.3 컨트롤러**: getById 반환타입(452)에 historicalCountryId, effective IIFE(610-641) FK-first 재작성 + isHistorical/modernCountryId 노출. create(838)·update(950) 호출에 `historicalCountryId` 전달. **CreatePersonData/UpdatePersonData(domain)에 top-level historicalCountryId 필수**(tsc 게이트).
- **3.4 SDK**: 엄밀히는 재생성 불필요(Primitive 라이브 참조)이나 권장. build:nestia 무동작 우회. shared/api/person/index.ts 수기 타입에 historicalCountryId·isHistorical·modernCountryId·thumbnailUrl 추가.

---

## 4. 프론트 등록/수정 폼 (F4=A 별도 state)

- **4.1 state**: `historicalCountryId` state 추가, `primaryCountryId = countryId || historicalCountryId` 단일 파생으로 봉인. countryIsHistorical=`!!historicalCountryId`로 단순화(방금 넣은 멤버십 memo 치환).
- **4.2 선택**: handleCountrySelect(1044) 시그니처 `{id,name,isHistorical}` → 분기 set + 반대 필드 클리어. countryName effect(932-939) 활성 필드 기준.
- **4.3 읽기 사이트**→primaryCountryId: namePreview(507), 이름순서(2039), onValuesChange(416-423), validate(1425), ConfirmDialog(2409).
- **4.4 payload**: buildPayload(1523) 두 필드 1:1, edit override(1638-1653) `countryId: countryId||null, historicalCountryId: historicalCountryId||null`(전환 시한폭탄 방지).
- **4.5 편집로드/또등록/reset**: setHistoricalCountryId 복원(769), formFields(671), preserveCountryIdRef→`{countryId,historicalCountryId}`.
- **4.6 타입**: helpers PersonDraftSnapshot·shared/api RelaxedPersonInputFields.
- **★ 상호배타 불변식**: write 4곳에서 반대 필드 반드시 클리어.

---

## 5. 다운스트림 & #1 배지

**확정**: 역사국가 전용 상세 라우트 **부재**. `/country/:id/historical`은 현대국가 상세 안 '연결된 역사국가' 탭(:id=현대PK).

- **5.1 #1 배지(F2=a+c 하이브리드)**: types.ts에 isHistorical·modernCountryId. person-detail-panel.tsx(1150-1166) 분기: 현대→기존, 역사+브리지→`pathKeys.countryHistorical(modernCountryId)`, 역사+브리지없음→비대화형 라벨(title '준비 중'). 깨진 `/country/<역사PK>/` 제거.
- **5.2 #2 가계도**: family-tree select(4467)에 historicalCountry 관계, personCountrySrc(4804) 폴백. `/genealogy`도 동일 해결.
- **5.3 #3 이름순서**: §2.4에서 커버.
- **5.4 #4 카운트/리스트 union**: collectPersonIdsLinkedToModernCountry(851-912)·findPersonsByAffiliationInCountry(814)에 `Person.historicalCountryId in linkedHistoricalIds` union.
- **5.5 상세 국적섹션**(2269-2324): affiliation 종속 → dual-write(F1=A)면 무해, 폐기 시 합성 필요.

---

## 6. 결정 포크 (권고)

| # | 포크 | 권고 | 이유 |
|---|---|---|---|
| **F1** | 백필 후 CITIZENSHIP 슬롯 유지 vs 폐기 | **A 유지(dual-write 1릴리스)** | 슬롯이 국가페이지 discovery 인덱스. 폐기는 발견쿼리 신설·상세섹션 합성 동반 필수. A는 롤백 안전 |
| **F2** | #1 배지 목적지 | **a+c 하이브리드** | a=브리지현대국가 역사탭, c=브리지없으면 비활성. b(역사상세 신설)는 대공사 |
| **F3** | 응답 countryId에 역사PK vs 분리 | **b 분리** | Organization/Event 선례, id-타입 모호성 제거 |
| **F4** | 프론트 state | **A 별도 state** | 백엔드 두-FK·핸들러 대칭, payload 직결 |
| **F5** | 두 컬럼 동시 채움 | **A 허용(도출 역사>현대)** | 독립 FK 선례, 도출이 결정적 |
| **F6** | 슬롯 폴백 유지 기간 | **A 백필검증까지** | 미백필/롤백 데이터 무성소실 방지 |

---

## 7. 검증
- **정적**: web-admin tsc(힙 상향+exit code), 변경파일 단독 lint, API tsc, prisma validate.
- **마이그**: 컬럼/FK/인덱스 실재, 백필 검증쿼리 0.
- **런타임**(API watch 아님 — build 후 재기동, admin/1234 :8000): 역사주국적 create/update, 현대 회귀, 공란 해제, 현대↔역사 전환 왕복+재편집 복원, #1 배지 이동, #2 가계도, #4 국가페이지 카운트, 목록↔상세 정합, 레거시 폴백.

## 8. 리스크 & 롤백
- 순수 additive라 롤백 용이(dual-write면 슬롯이 정본 보유). 병렬 스키마 WIP 드리프트 최우선 주의(hunk 선별). 체크섬 드리프트는 reset 금지·checksum UPDATE 복구.
- **조용한 회귀 표면**: 컨트롤러↔리포 도출 비동기화(반드시 한 배치), re-fetch include 누락, '' →null 정규화 누락, CreatePersonData 교차의존, findByIdWithRelations include 미확장, 편집로드 응답 미노출, 상호배타 불변식 누락.
