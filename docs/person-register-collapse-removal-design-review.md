# 인물 등록/수정 모달 — 상세정보 접기(moreOpen) 제거 + 디자인 개선 검토

작성: 2026-07-04 · 대상: `apps/web-admin/src/shared/ui/person-register-modal/*` + 셸 `widgets/country/country-form/ui/country-form-shell.tsx`
방법: 6개 디자인 관점(IA·시각위계·점진공개·내비게이션·a11y·canon정합) 병렬 비평 → 관점별 적대 검증 → 단일 방향 수렴(검증 통과 37건)

---

## 0. 요청과 핵심 긴장

요청: **상단 '상세 정보 접기'(= '더 입력 (선택)') 접기 토글을 없애** 상세 섹션을 항상 노출하고, 그에 맞춘 디자인을 개선.

긴장: 이 접기(`moreOpen`)는 원래 *"필수만 채우면 등록 끝, 상세는 원하는 사람만 펼침 → 첫인상 부담 감소, 빠른 등록 15초"*를 위해 의도적으로 넣은 것. 접기를 그냥 걷어내면 폼은 **6섹션이 항상 펼쳐진 긴 스크롤**이 되고, 이는 팀이 과거 여러 라운드 "조잡하다"고 고쳐온 바로 그 **'압도적 첫인상'** 위험을 재발시킨다.

> **결론: 접기 제거는 단독으로 머지하면 회귀다.** "숨기기"를 없앤 대신, 첫인상 방어를 **① 섹션 수 축소 ② 위계 정직화 ③ 필드단위 점진공개 보존**으로 흡수해야 한다. 이 셋과 접기 제거는 한 배포로 묶는다.

---

## 1. 디자인 방향 (3수)

### ① 최상위 섹션 6 → 4 (물리 병합)
현재 최상위 eyebrow 섹션이 7개(이름·신원·생몰·이름상세·생애상세·가문종교국가·가족)로 평평하게 나열되고, 논리적으로 쪼개져 있다:
- **이름 정보가 두 곳**으로 분리(basic의 성·이름·표시순서 ↔ names의 원어·뜻), 그 사이에 신원·생몰이 낌.
- **생몰 날짜(life) ↔ 출생지/사망지(death-detail)가 2섹션 떨어짐** — `place-fields.tsx` 자체 주석("출생 날짜와 한 흐름에 둬 발견성 회복")과 정면 모순.

→ **이름상세(원어+뜻)를 basic 이름 클러스터로**, **생애상세(장소+사망상세+군주호칭)를 life '생몰' 챕터로** 흡수. 최상위 챕터가 **basic / 생애 / 소속 / 가족 4개**로 정리되고, 좌측 레일도 4정적 챕터로 동기화된다. divider·eyebrow·섹션이 각각 줄어 세로 길이와 인지 부하가 함께 감소.

### ② 위계 정직화 + '필수/선택 경계' 복원
- MoreToggle은 두 일을 겸했다: (1)상세 숨김, (2)*"여기까지가 필수"* 경계 표식. 요청은 (1)만 없애지만 (2)도 같이 사라지면 안 된다 → 생몰 블록 직후에 **캡션 얹은 seam(OptionalSeam)** 1곳으로 복원("여기까지가 필수 · 아래는 선택, 지금 등록해도 됩니다"). 기존 divider를 *대체*(이중 스택 금지).
- basic 내부 중복 eyebrow('이름'은 hero·FieldLabel과 중복) 정리 → 본문 eyebrow 집합이 레일과 1:1.

### ③ 필드단위 점진공개는 전부 보존 (키스톤)
제거 대상은 **오직 섹션-레벨 컨테이너(moreOpen) 하나**. 폼이 '압도적'으로 안 보이게 막는 실제 압축은 **필드-레벨 게이팅**들이 담당한다:
- 사망유형 13칩(사망일 입력 후 노출), 이름의 뜻 `AdvancedSection`, 군주 호칭 `AdvancedSection`.
- 이걸 같이 평탄화하면 '전 필드 동시 펼침' 최대 팽창 상태로 렌더돼 과거 조잡함이 **정확히** 재발.
- 군주호칭을 왕조소속 신호로 완전 숨기는 것도 금지(regnal/temple/posthumousName 유일 입력구라 진입점 소실).

### canon 강제 (회귀 지뢰 제거)
- 마커 = `CoreSectionLabel`(eyebrow) 단일 어휘, 구분 = `CoreDivider` 24px 단일 리듬. **h3 `SectionHeader` 재도입 금지** — 오히려 現 死코드 h3 트리오(`SectionHeader`·`SectionHeaderTitle`·`SectionHeaderDesc`)와 고아 `FONT.title`을 **삭제**해 재발 후크를 물리 제거.

---

## 2. moreOpen 제거 체크리스트 (죽은코드·회귀 가드)

| 위치 | 처리 |
|---|---|
| `useState(moreOpen)` + `autoExpandedDetailsRef` | 삭제 (`nameMeaningsOpen`·`monarchTitlesOpen`은 존치) |
| `hasDetailValues` memo + auto-expand effect | 통째 삭제(유일 소비자가 이 effect) |
| reset의 `setMoreOpen(false)`·`autoExpandedDetailsRef=false` | 삭제(`setNameMeaningsOpen(false)`·`setMonarchTitlesOpen(false)` 존치) |
| validate의 `setMoreOpen(true)` | 삭제(가드·`e._form` 존치 — 소속행 상시 마운트라 파생 aria-invalid로 스크롤 착지) |
| sections rail effect `if(moreOpen)` + deps | 4정적 챕터 무조건 emit으로 재작성, deps에서 `moreOpen` 제거 |
| MoreToggle JSX + `{moreOpen && (…)}` 래퍼 | 삭제, 자식 상시 렌더 |
| `MoreToggle` import + styled 정의 | 삭제(**JSX 제거 후 마지막에** — 순서 뒤집으면 빌드 붕괴) |
| 스테일 주석(moreOpen JSDoc·레일 dead항목·MoreToggle로 펼침) | 갱신/삭제 |
| **회귀 결정** `needsPersons = moreOpen \|\| …` | `moreOpen` 항 제거 시 가족 상시노출로 인물풀 미로드 → 부/모/배우자 콤보 빈 후보(중복 생성 유발). **마운트 idle 로드**(`requestIdleCallback`, 폴백 `setTimeout(300)`)로 재배선, `show*Modal` 즉시 폴백 존치 |

---

## 3. 함께 갈 것(with-removal) vs 후속(follow-up)

**with-removal (한 배포 필수):**
1. 필드단위 점진공개 전면 보존 (키스톤, 변경 없음·감시)
2. 이름상세 → basic 이름 클러스터 흡수 (섹션 −1)
3. 생애상세 → life '생몰' 챕터 병합 (섹션 −1, 날짜↔장소 인접)
4. OptionalSeam(필수/선택 경계) 복원
5. 死코드 h3 트리오 + `FONT.title` 삭제
6. `CoreSectionLabel` `styled.div → h3` 승격 (heading 랜드마크, **시각 불변**)
7. persons 마운트 idle 로드 재배선
8. 레일 4정적 챕터 always-emit + filled OR-병합
9. basic 내부 위계 정직화('이름' eyebrow 중복 삭제)

**follow-up (별도, 저위험 순):**
- 페이지/모바일 내비 갭(레일 공용 훅 추출, effort L) — 우선 StickyFooter 진척칩만
- CountryAffiliations 시각 무게 감량(ghost AddBtn·힌트 1줄)
- `_form`-only 에러 스크롤 타깃 보강(배우자 행)
- 푸터 completeHint('· 이하 선택 입력') / submit `$emphasis` 死프롭 배선
- scroll-spy 마지막 섹션 바닥감지(가족이 영영 활성 안 되는 결함)
- 공용 AddRowBtn primitive / place-fields 2열 그리드
- affiliation 死CSS·하드코딩 hex 토큰화·잔여 aria 마감

---

## 4. 사용자 결정 필요

1. **빠른등록 안심 신호 복원 범위** → 권장 (b): 본문 seam + 푸터 completeHint + submit 강조 이중화. (개별 섹션 접기 부활은 토글 난립=조잡 재생산이라 금지)
2. **CountryAffiliations**: 상시노출+ghost(저위험) vs disclosure 강등 → 권장 (a) 먼저.
3. **군주호칭 최종 위치**: 생애상세 유지 vs 이름 클러스터 이관 → 권장 (b) 이관(호칭류 응집). 어느 쪽이든 collapsed `AdvancedSection` 유지.
4. **페이지/모바일 내비 갭**: 함께 vs 단계분리 → 권장 (b) 모달 먼저 랜딩, 레일 공용훅은 후속 PR.
