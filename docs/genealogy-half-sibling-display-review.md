# 가계도 배다른 형제(이복/이부) 표기 개선 검토

> 2026-07-11. 제보: "인물 상세의 가계도에서 배다른 형제도 그냥 형제로 표기됨".
> 검토 방식: 4갈래 코드 정독(백엔드 계약·프론트 렌더·선행 검토서·타 지면 전수조사) → 설계안 3안 경쟁(최소변경/시각그룹핑/역사충실) → 심판 종합 → 코드 사실 전제 11건 적대 검증(전건 CONFIRMED, 로컬 DB 실측 포함) → 완전성 비평 5건 반영. **미구현 — 검토서만.**

## 1. 요약

이 문제는 신규 발견이 아니라 **1차 가계도 리뷰 #16(§3.3 "이복형제 미구분")로 기등재된 미구현 항목**이다. 다만 본 검토는 #16 원문의 제안 방법론(엣지 기반 부모집합 교집합 + parentMarriageId 활용)을 **수정 이행**한다 — 엣지 존재는 판정 증거로 부적격이고(§2.3), parentMarriageId는 실측 0/376행 완전 공백이라(§2.4) 판정 축이 될 수 없다.

핵심 구도는 3층이다:

- **표기 계층**: 형제 배지가 카드 중 유일하게 컴포넌트 내부 하드코딩 단일 라벨(`card.tsx:336` `'형제'`). 카드·hover·모달 어디에도 부모 정보 노출 없음.
- **파생 계층**: 형제 파생이 3중 중복(인포그래픽 `person-genealogy-infographic.tsx:184-208` · `genealogy.page.tsx:214-218` · REST `person.controller.ts:551-553`)이고 셋 다 부모 union 후 **어느 부모를 공유했는지를 폐기**한다(인포그래픽 주석이 "이복 형제 포함"이라고 자인).
- **계약 계층(근인)**: BFS 노드에 `fatherId`/`motherId`가 없고 엣지는 무role `{source,target,type}` 3필드뿐이라, 클라이언트는 "두 번째 부모 엣지 부재"가 **FK NULL(미상)인지 그래프 밖(미페치)인지 구분할 수 없다**. 즉 현 계약으로는 '이복 확정'과 '어머니 미상' 자체가 구분 불가능하다. REST siblings 투영도 부모 FK를 탈락시킨다(부수 결함: 폴백 모드에선 사생아 `*` 마커도 안 뜸).

**데이터 실측(로컬 DB)**이 정책을 결정한다: person 376행 중 부모 FK 보유 119명은 father-only 49 vs mother-only 1로 극단 비대칭(상세 패널 '자녀 추가' 퀵액션이 ego 성별 기준 한쪽 FK만 기록하는 구조와 정합, `person-detail-panel.tsx:813-842`). 형제쌍 41쌍 중 친형제 확정 21 · **판별가능 half 1** · 판별불가 19(46%). 따라서 ① 판별불가는 예외가 아니라 대량 상태이고 ② 일괄 '배다른' 배지는 데이터상 불가능하며 ③ **"기록 부재 ≠ 상이"를 1원칙으로 하는 보수 판별**(확정 근거가 있을 때만 이복/이부 라벨, 미상이면 무수식 '형제')이 유일하게 정직한 설계다 — '배우자(추정)' inferred·소급 주장 금지 canon의 연장.

권고: **서버는 판정하지 않고 사실만 additive 노출**(BFS 노드에 `fatherId`/`motherId` 스칼라 — PERSON_SELECT가 이미 조회해 응답에서만 버리는 값이라 추가 쿼리 0, 마이그 0) + **판정은 클라 공용 순수함수 1곳**(`classifySiblingKinship`, 4상) + **라벨은 텍스트만 분화**(색은 amber sibling 단일 유지). 무마이그 3배치 + 마이그 대기열 훅 1배치(§5).

---

## 2. 현황 진단 (검증 완료 사실관계)

### 2.1 표기: 하드코딩 단일 배지
`SiblingCompactNode`는 `<NodeBadge $role="sibling">형제</NodeBadge>` 내부 하드코딩(카드 중 유일 — 배우자·조상·후손 라벨은 전부 호출부 분기 관례). `DescendantNode`의 색 매핑은 `badge === '형제' ? 'sibling' : 'descendant'` **등호 판정**(`card.tsx:433`)이라 '이복형제'를 전달하면 amber가 탈락해 sky로 렌더된다 — `endsWith('형제')` 포함 판정으로 바꾸면 신규 라벨이 자동 호환.

### 2.2 파생: 3중 중복, 전부 provenance 폐기
`siblingsByPersonId`는 트리 내 노드별(per-anchor) `Map<string, FamilyTreePerson[]>`으로, 부모 union 과정에서 공유 부모 정보를 버린다. **per-anchor 구조는 자산**: 조상 형제 칩/모달(`ancestor-column.tsx:108,198-213` → `AncestorSiblingsModal`)의 판정 기준을 anchor 조상 본인으로 삼는 확장이 구조 변경 없이 가능하다. REST는 컨트롤러가 `father.childrenFromFather ∪ mother.childrenFromMother`를 병합하며 branch 출처(=공유 축 정보)를 버린다.

### 2.3 계약: '미상 vs 그래프밖' 구분 불가 + 취약 휴리스틱
- 엣지는 `parentChildSet`의 `"parentId__childId"` 문자열 키로 축적돼 **role이 키에서 소실**되고, 방출은 `nodeMap.has(src) && nodeMap.has(tgt)`일 때만 — 엣지 부재는 FK NULL과 미페치를 구분 못 한다(`person.prisma.repository.ts:4633,4646,5049-5051`).
- 프론트 `ftResolveParentIds`(`family-tree-derive.ts:47-68`)는 gender 1차 + **서버 Set 삽입순서(fatherId→motherId) 폴백**으로 부/모 축을 추정 — 주석(43-44)이 자인하는 서버 구현 세부와의 암묵 결합. 아버지 노드가 그래프 밖이면 `parents[0]`이 어머니가 되는 오판 경로 실재. 노드 FK 스칼라 노출이 이 결합을 계약으로 대체한다.
- FK 스칼라끼리 직접 비교하면 "어느 노드가 아버지인가"라는 role 판별 자체가 불필요 → **#6 엣지 parentRole '한계효용 낮음' 보류 판정을 뒤집지 않고** 휴리스틱 종속을 끊는다. (DTO 헤더 주석 121-129가 이미 'parentRole' 확장과 수제 래퍼 수동 동기화 절차를 문서화해 둔 상태.)
- REST siblings 투영(`person.controller.ts:554-560`)은 id/이름/성별/왕조/생몰/이미지뿐 — `fatherId`/`motherId`/`illegitimate` 미포함, 소스 Prisma select(1138-1146·1188-1196)에도 부모 FK 없음.

### 2.4 데이터: parentMarriageId는 판정 축 불가, 판별불가가 다수
- `parentMarriageId`: DTO→위젯 타입→매핑까지 배선 완비, **렌더/파생 소비처 0 · write UI 0 · 실측 0/376행 완전 공백** · FK relation 미도입(G22 잔여). v1 판정 입력에서 **완전 제외**(주석 훅만) — 향후 relation+저작 UI 도입 시 '같은 혼인=친형제' 양성 승격 신호로만 활성화(상이/NULL을 이복 근거로 쓰는 것은 영구 금지 — 혼인 미링크·혼외 출생 존재).
- 판별불가 46%는 결함이 아니라 사료 상태의 정직한 반영. 상류 개선(퀵액션 '자녀 추가'에 반대편 부모 동시 프롬프트)은 별건 등재(§5 배치4).

### 2.5 nestia/계약 변경 비용: 사실상 0
siblings는 컨트롤러 선언·생성 SDK 모두 `any[]`, family-tree는 web-admin이 raw fetch 래퍼(`persons-family-tree.ts:104`)로 소비하고 SDK Output도 `Primitive<any>` — 본 검토의 모든 additive 필드는 컴파일 계약을 안 바꿔 **nestia 재생성이 기능상 불필요**(swagger 정합용 선택, `build:nestia` 무동작이라 main() 직접 호출 우회). 단 수제 래퍼 `FamilyTreePerson` 동기화는 컴파일이 못 잡으므로 리뷰 체크리스트로 강제.

### 2.6 형제 노출 지면 전수조사 (7곳)
| 지면 | 소스 | 구분 데이터 도달 | 우선순위 |
|---|---|---|---|
| 가계도 ego 형제 스트립+모달 | BFS | 엣지만(불충분) | P1 |
| 조상 형제 칩/모달 | BFS | 〃 | P1 (같은 파생) |
| 상세 헤더 '형제 N' 배지 | REST | 미도달 | P2 |
| 가계도 REST 폴백(BFS 도착 전) | REST | 미도달 | P2 |
| /genealogy 독립 페이지 | BFS | 〃(자체 파생) | P3 (G37 미결) |
| 생애 타임라인 사망 이벤트 | REST | 미도달 | 비대상('형제자매'는 집합명사로 정확) |
| 국가 상세 lineage-tree 행 배치 | 별도 | — | 별건 결함 후보(father 우선 단일 키라 이부 형제 행 분리, `heads-of-state-section.widget.tsx:1411`) |

공개 프로필·왕조 섹션·등록/수정 모달은 비대상. 형제 직접 저작 UI는 없음(정상 — 파생 관계).

---

## 3. 판정 규칙 — `classifySiblingKinship(anchor, sibling)` (클라 공용 순수함수)

입력: 양쪽의 `fatherId`/`motherId`(nullable FK 스칼라). **판정은 오직 FK 비교** — 금칙 3종을 명문화한다: ① 엣지 존재를 증거로 쓰지 말 것(미상/미페치 구분 불가) ② gender·삽입순서를 증거로 쓰지 말 것 ③ parentMarriageId를 v1 판정 입력으로 쓰지 말 것.

**집합 의미론으로 정의**(완전성 비평 반영 — 슬롯 비교의 함정 회피):

| 판정 | 조건 |
|---|---|
| 친형제 | 양측 부모 ID 집합이 완전 일치하고 원소 2개 모두 non-null |
| 이복(異腹) | 아버지 동일(non-null) ∧ 양측 motherId 모두 non-null ∧ 상이 |
| 이부(異父) | 어머니 동일(non-null) ∧ 양측 fatherId 모두 non-null ∧ 상이 |
| 판별불가 | 그 외 전부 — 특히 비공유 축에 어느 한쪽이라도 NULL. 공유축 서브타입(부계/모계)은 툴팁 문구용으로 보존 |

방어 규칙(현재 DB는 청정하나 저작 경로가 열려 있음):
- **공유 부모의 슬롯이 양측에서 불일치**(A의 father = B의 mother인 크로스슬롯) → 판별불가 + 데이터 품질 플래그. BFS 수집(`OR {fatherId:pid},{motherId:pid}`)은 이런 인물을 형제로 담지만 REST(슬롯 고정 relation)는 **목록에서 아예 누락**시키는 '행 출몰' 불일치가 있음 — 배치2에 명기.
- `fatherId === motherId`(동일인 중복 FK) → 판별불가. 서버 가드 1줄(`assertNoParentCycle` 동일 위치, additive)을 동반 권고.
- 향후 #2 입양(PersonParentLink) 도입 시 입력을 BIOLOGICAL 부모로 한정 — 게이트 주석으로 선제 명문화.

미상 정책: **"기록 부재 ≠ 상이"**. NULL은 증거가 아니라 공백. '이복(추정)' 같은 추정 접미사도 금지 — '배우자(추정)'는 공동자녀라는 양성 근거가 있는 추론이지만 여기는 근거 자체가 부재이므로, 아무것도 주장하지 않는 **무수식 '형제'가 학술적으로 정확한 표기**다.

'동복'은 배지 용어로 사용 금지 — 동복=모 공유일 뿐 친형제를 함의하지 않는다(이부도 동복이다).

## 4. 표기 정책

- **배지**: `SiblingCompactNode` badge prop화(다자녀 배우자 916행 분기 관례). 친형제·판별불가='형제'(현행), 이복 확정='이복형제', 이부 확정='이부형제'. **색은 전 분류 amber sibling 단일 유지** — 텍스트만 분화(G29 배지색 이원화 미해결 상태에서 색 언어 확장 금지). `DescendantNode` 색 매핑 `endsWith('형제')` 전환 동반. 4자 라벨의 nowrap 스트립 폭 오버플로는 실측 필요(문제 시 '이복'/'이부' 축약 후퇴하되 색 매핑을 명시 role prop으로 재설계).
- **툴팁**: `buildPersonTooltipLines`(utils.ts:100-109)에 '아버지: X / 어머니: Y' 라인 + 판별불가 시 '모(부)계 기록 미상 — 동복/이복 판별 불가' 비단정 고지. PersonMetaSource 확장 + 파생 시점 이름 주입.
- **이름 해소 한계(완전성 비평 P1)**: BFS에는 자녀의 반대편 부모를 항상 페치하는 Step 5와 달리 **형제의 반대편 부모를 페치하는 스텝이 없다** — Step 9 all-spouses(cap 200)에 우연히 걸릴 때만 이름 확보 가능하고, 실측 DB에 부모 양쪽 FK가 있으나 PersonSpouse 행이 없는 자녀 7행이 실재(후궁·무등록 혼인 = 이복 판별의 시그니처 케이스와 정확히 겹침). **판정 자체는 FK id 비교라 영향 없음**(이것이 노드 스칼라 방식의 존재 이유). 대응: ① 배치1에 Step 5와 동형의 소규모 'ego 형제 반대편 부모 fetchBatch'(bounded, additive) 추가 ② 그래도 미해소 시 폴백 문구는 **«이 가계도에 미표시»** 류 비단정 표현 — «미등재 인물» 단정은 금지(fetchBatch는 계정 무스코프라 nodeMap 부재 = 커버리지 절단이지 미등재가 아님. 등재된 인물에게 '미등재'를 붙이는 오정보).
- **범례**(#25/#37과 동배치): "이복=아버지 같고 어머니 다름 · 이부=어머니 같고 아버지 다름 · 무표기=친형제 또는 기록 미상(툴팁 참조) · *=서출(이복과 별개)".
- **서자(*) 직교 유지**: illegitimate는 개인 적법성 플래그 ≠ ego 대비 관계(#16 명시 구분). '이복형제'+'*' 병존 가능, 상호 대체 금지(계비 소생 적자 이복 존재 — 연산군/중종 류). illegitimate Boolean에 새 의미 얹기 금지(birthLegitimacy enum이 미래 정본 — 출생 검토 3-3).
- **a11y**: 배지 aria-label 전체 문장('이복형제 — 아버지 공유, 어머니 다름'), 분리 span(G30 선례), NodeName 문자열 연결 금지.
- **라벨 전이**: REST 폴백→BFS 단방향 승격만 허용(확정→미상 강등 깜빡임 금지).

## 5. 권고 배치 (전부 순서 독립적 아님 — 1→2→3 순차, 4는 대기열)

### 배치1 — 계약+판별 코어 (무마이그, effort M) → **원 제보가 여기서 해소**
1. `FamilyTreeNodeDto`에 `fatherId`/`motherId` additive + BFS 노드 직렬화(4964-5031)에 2필드 — PERSON_SELECT(4537) 기조회 값 pass-through, 추가 쿼리 0.
2. 수제 래퍼 `FamilyTreePerson` 대칭 갱신(DTO 주석 121-129의 수동 동기화 의무 — 컴파일이 못 잡으므로 체크리스트화).
3. `classifySiblingKinship` 신설(family-tree-derive.ts) — §3 규칙·금칙·게이트 주석 + 단위테스트.
4. `siblingsByPersonId` 분류 보존형 확장 — per-anchor 그대로라 조상 형제도 anchor 본인 기준 자동 판정.
5. 배지·모달 배선: `SiblingCompactNode` badge prop화, `DescendantNode` `endsWith('형제')`, `SiblingsListModal`/`AncestorSiblingsModal`(컴포넌트 공유라 badge 전달만).
6. 툴팁 부모 라인 + 미상 고지 + **ego 형제 반대편 부모 bounded fetchBatch**(§4 이름 해소) + 미해소 시 «이 가계도에 미표시» 폴백.
7. `ftResolveParentIds` 노드 FK 직독 1차 승격, gender+삽입순서 휴리스틱은 폴백 강등(암묵 결합 해소).
8. 서버 가드 1줄: `fatherId !== motherId`(assertNoParentCycle 위치).
9. BFS `fetchChildrenOf` orderBy `[birthOrder, birthDate]` 복합키 — **birthOrder는 이미 마이그·서버 저작 배선 완료 상태**(20260705142632, person.prisma:198)라 무마이그로 즉시 가능. take:40 절단의 생존 집합도 개선(출생 미상 형제의 체계적 탈락 완화 — 이 컬럼의 도입 목적 그 자체).
10. 범례(#25/#37)·a11y 동배치. 검증: web tsc(힙 확장+exit code)·변경 파일 단독 lint·derive 단위테스트·이복 다수 왕가 인물 3지면 육안. **병렬 WIP 오염 파일(repository·person.response.ts·인포그래픽·panel)은 hunk 선별 커밋.**

### 배치2 — REST 편승·폴백 정합 (무마이그, effort S)
1. REST siblings 투영에 `fatherId`/`motherId`/`illegitimate` additive + 소스 select 2곳 보강 → 폴백 classifier 적용, 폴백 `*` 마커 드리프트(기존 결함) 동시 해소.
2. 헤더 '형제 N' 배지: 총계 유지 + title 툴팁 side-분해('친형제 K · 아버지만 공유 M · 어머니만 공유 J' — 사실 진술만). **REST는 take 무제한(무절단 완전)이므로 억제 규칙 불필요** — 절단 한정 문구는 BFS 소스 표면에만 적용(anchor→scope 매핑: ego='siblings' 40 · 부모='aunts-uncles' 60 · 조부모='grand-aunts-uncles' 80).
3. REST/BFS 형제 '집합' 불일치 명기(크로스슬롯 인물의 행 출몰 — §3 방어 규칙과 세트).
4. genealogy.page 자체 파생을 공용 classifier로 교체(시각 무변경 — G37 처분 미결이라 신규 라벨은 임베드 우선).
5. 타임라인 '형제자매'는 명시 비대상(변경 0, 결정 기록만). nestia 재생성은 swagger 정합용 선택 1회.

### 배치3 — 밀집 왕가 가독성: 레인 그룹핑 (무마이그, effort M, **기등재 배치4 #1(혼인별 자식 fork)·#14/#26 모달 공용 Modal 이관·G29와 합류**)
1. 형제 모달 flat 그리드 → 레인 파티션: 친형제 / 이복—어머니별 / 이부—아버지별 / 관계 미상 최후순. 그룹 키는 **공동부모 FK**(parentMarriageId 아님 — G22 의존 회피). 레인 내 정렬은 기존 comparator 위임(재정렬 신설 금지 — G2 signed year·birthOrder 복합키 존중).
2. 레인 헤더 role=group + aria-label, 이름 미해소 어머니는 ID별 레인 + §4 비단정 문구, truncation 시 '표시된 형제 기준' 한정.
3. 스트립 '외 N명 더 보기'에 확정 반형제 은폐 시에만 '· 이복 K' 병기(근접-3 선별이 전원 동복일 때의 은폐 방지, nowrap 폭 실측).
4. ChildrenGrid 다른-부모 레인 — 자녀는 Step 5가 반대편 부모를 항상 페치해 현 BFS로 완전, 동일 파티션 유틸 재사용으로 형제↔자녀 시각 문법 대칭 회복.

### 배치4 — 마이그 대기열 합류 후속 (기존 additive 마이그 1회에 편승: #7 rank·#19 결합상태·#2 입양·#31)
- parentMarriage FK relation(onDelete: SetNull, G22 잔여) + 저작 UI → classifier '같은 혼인=친형제' 양성 승격 신호 활성화(그때까지 코드 미도입 — 죽은 코드 회피).
- birthLegitimacy enum(서자/얼자 세분) → '이복형제'+'서출' 병기 정밀화.
- #2 입양 PersonParentLink 도입 시 BIOLOGICAL 한정 강제 재검토(배치1 게이트 주석이 트리거).
- birthOrder **저작 UI·데이터 입력 흐름만**(정렬 배선은 배치1로 앞당김 — 완전성 비평 반영).
- 저작측 근인 별건: '자녀 추가' 퀵액션에 반대편 부모 동시 프롬프트(판별불가 양산 경로 상류 개선).
- 소스는 `libs/db/prisma/person.prisma`(schema.prisma 직접 수정 금지).

## 6. 설계 대안 비교 (기각 근거)

3안 모두 "사실만 additive 노출 + 클라 단일 분류 + 미상 무수식" 코어는 동일 수렴(독립 생성임에도) — 변별점만 기록:
- **안1 최소변경**(배지 텍스트만): REST 폴백·헤더·`*` 드리프트 미커버. 채택안의 한계비용이 사실상 0이라 최소성 우위가 무력 → 기각, Phase 분리 아이디어만 흡수.
- **안2 시각 그룹핑 우선**(레인이 본체): v1 일괄이 과대(모달 전면 개조+#14/#26 이관 동배치)하고 레인은 기등재 배치4 #1과 지면 중복 → 배치3으로 분리 흡수. '이복'/'이부' 2자 배지는 색 매핑 재설계 필요+축약 모호로 기각, more-버튼 요약·ID별 레인·단방향 승격 규칙 흡수.
- **안3 보수 판별**(4상+금칙): 채택. 오정보 방지 최강(엣지 증거 금칙·'동복' 금지·'(추정)' 배제·parentMarriageId 제외)·커버리지 최광·기존 canon 정합.

## 7. 검증 기록

- 코드 사실 전제 11건 적대 검증 **전건 CONFIRMED**(파일:행 근거 확보, DB 실측 2건 포함). 유일 강화: parentMarriageId는 "사실상 공백"이 아니라 **완전 공백(0/376)**.
- 완전성 비평 5건 → 본문 반영: P1 «미등재 인물» 문구 오정보+형제 반대편 부모 미페치(§4), P2 집합 의미론·중복 FK 가드·REST/BFS 집합 불일치(§3), P2 birthOrder 기마이그 재분류(배치1·4), P2 truncation 억제 규칙 소스 정정(배치2), P3 #16 '이행'→'수정 이행' 프레이밍 교정(§1).

## 8. 구현 기록 (2026-07-11, 배치1+배치2 구현 완료 — 미커밋)

§8(구 미결) 채택값: ① 배지 '이복형제'/'이부형제' 전체 표기(NODE_W 192px 카드 내부라 오버플로 없음 — 코드 확인) ② 판별불가 툴팁 명시 고지 ③ G37 보류안 ④ 이부 방어는 확정 조건 판별로 충분 ⑤ 범위=배치1·2(배치3 레인·배치4 마이그 미착수).

**구현 편차 3건**: (a) genealogy.page 형제 '멤버십' 파생은 레이아웃 전용(라벨 없음)이라 공용화 미실시 — truncation 라벨 매핑만 적용, G37 처분 시 재검토. (b) `siblingKinshipNote`는 판별불가 전용이 아니라 **전 분류 상시 주입**으로 확장 — REST-only 임베드(country-detail 등, 부모 이름 라인 부재)에서 친형제도 범례의 '사유 표시' 약속을 지키기 위함. (c) 형제 모달 판별은 값 전달이 아닌 모달 내부 계산(context nodeMap) — per-anchor 구조 그대로.

**적대 리뷰 2차(구현 디프, 14에이전트) CONFIRMED 10건 전건 반영**: create() 중복 FK 가드 미배선(P2)·'' 센티널 우회(P3) → create 등호 검사+assertNoParentCycle 진입 정규화, `ftResolveParentIds` Pass 0가 손상 FK(자기부모·축퇴)를 신뢰(P2) → 클라 resolveFk 방어+서버 스칼라 새니타이즈(엣지 억제와 동일 정책), UNDETERMINED 노트의 거짓 사유(데이터 모순을 '기록 미상'으로)·무주어 모순 렌더(P3×2) → `cause`(anchor/sibling/both-gap·data-anomaly) 분화+'기준 인물의 …' 주어 명시+구캐시 계약 미도달 시 노트 생략(undefined/null 구분 보존), 헤더 배지 title-only a11y(P3) → aria-label 병합, Step 7a가 Step 9 배우자 cap 200 예산 선점(P3) → 보조 전용 노드 배우자 수집 제외.

**검증**: api tsc 0 · web tsc 0 · jest 29/29 · lint 순증 0(HEAD 대비 파일별 동일, panel −4) · 라이브 e2e(BFS 노드 FK·Step 7a 페치·REST siblings FK/illegitimate·헤더 분해 '아버지만 공유 2'·create/update/'' 가드 400 전부 확인, 실데이터 이복 쌍 브와디스와프 2세↔카지미에시 2세).

## 9. 배치3 구현 기록 (2026-07-11, 미커밋)

레인 그룹핑 + 합류 항목(#14/#26·G29·#1 최소안) 구현 완료:

- **레인 파티션**: `partitionSiblingsByKinship` — 친형제 → 이복(어머니 ID별, 첫 등장 순) → 이부(아버지 ID별) → 관계 미상 최후순. 그룹 키는 공동부모 FK(parentMarriageId 아님), 레인 내 재정렬 금지. 레인 2개 이상일 때만 헤더(단일 구성이면 flat 유지).
- **#14/#26**: 형제 모달 2종(~90% 중복)을 `SiblingsLaneModal` 하나로 통합, 공용 `<Modal>`+`useModalBehavior` 이관(직접 Esc/트랩 구현 제거), `ModalBody` 재사용.
- **G29**: DescendantNode의 'ancestor' 회색 재사용 해소 — 형제 계열=amber, 손자녀=sky로 카드·아바타·배지 role 통일.
- **#1 최소안(consort 인디케이터)**: ego 자녀들의 반대편 부모가 2명 이상 갈릴 때만 자녀 카드에 «○○○ 소생» 칩 + 툴팁 반대편 부모 라인(ego 라인 생략) + 범례 항목. 혼인별 fork 재배치(최대안)는 기하 회귀 리스크로 마이그 배치(#7 rank)와 함께 보류.
- **스트립 요약**: 근접-3 선별이 확정 반형제를 숨길 때만 '외 N명 더 보기 · 이복 K' 병기(판별불가 불산입).
- **truncation 한정 고지**: 절단 시 모달 부제 '구분·인원수는 표시된 형제 기준'(ego='siblings', 조상=방계 3-scope — ego scope 제외로 거짓 고지 방지).

**적대 리뷰 3차 9건 CONFIRMED(중복 정리 후 7건) 전건 반영**: 미상 레인 제목의 거짓 사유 단정 중립화(카드 노트와 자기모순 해소), 이름 미해소 레인 순번(①②) 병기+«미표시» 괄호화, collateralsTruncated에서 ego scope 제거, 사문 ariaLabel 제거(공용 Modal title 우선), 레인 헤딩 h4→h3+aria-labelledby(이중 낭독 방지), bespoke 스크롤 → ModalBody 재사용, 카드 밖 칩(Consort/InMarriage) 불투명 합성(커넥터 비침 방지)+死 title 제거. 검증: jest 34 · web tsc 전체 0 · lint 순증 0.

## 10. 잔여 미결

1. **G37**(/genealogy 처분) — 여전히 미결. 처분 확정 시 그 지면의 형제 라벨 반영 여부 재검토.
2. **이부 라벨 민감성** — 확정 조건 판별로 1차 방어했으나, 부모 FK 오입력(동명이인) 시 확정 오정보 전파는 데이터 정정 경로 의존. 신규 입력 검수 흐름은 별건 백로그.
3. **배치4 마이그 대기열** — parentMarriage relation(양성 승격 신호)·birthLegitimacy·입양 BIOLOGICAL 게이트·birthOrder 저작 UI·퀵액션 반대편 부모 프롬프트·혼인별 자식 fork 최대안(#1+#7 rank).
