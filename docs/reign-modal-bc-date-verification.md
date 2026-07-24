# 군주 재위 등록 모달 — 재위기간 텍스트 입력 + BC/구조화 날짜 검증

인물 상세 **군주 재위 등록** 모달에서 재위 기간을 **글(텍스트)로 입력**하고, 옆의 **달력(📅)을 보조 선택**으로 쓸 수 있게 한 기능의 검증 기록.
BC·고대·연단위 재위를 구조화 컬럼(`start_era/year/month/day` 등)으로 저장한다.

- **날짜**: 2026-07-23
- **관련 커밋**: `5e8b726c7` feat(api/person) — SovereignReign 구조화 날짜 마이그 + 서버 계약 · `fb6ef772c` feat(web/person) — 재위 등록 모달 텍스트 입력 + 달력 부가
- **검증 환경**: web `:3000`(vite) · api `:8000`(신규 빌드, `nx build api`) · 로그인 `admin` · 대상 인물 카를 5세(`64abac5d…`) · 헤드리스 Chrome(puppeteer, 확장 미연결로 대체)

---

## 1. 재위기간 텍스트 입력 (AD/BC 토글 + 년·월·일)

`재위 기간 *` 섹션이 `재위 시작` / `재위 종료 (비워두면 현재)` 두 개의 텍스트 필드로 렌더된다.
각 필드는 `AD | BC` 토글 + `년 · 월 · 일` 입력 + 달력(📅) 버튼으로 구성.
안내문: *"연도만 입력해도 됩니다(월·일은 비워도 됨). 기원전은 연도 왼쪽 BC 버튼으로, 정확한 날짜는 달력(📅)으로 선택하세요."*

![재위 등록 모달 — 재위기간 텍스트 입력(AD/BC 토글 + 년/월/일)](reign-modal-verification-assets/reign-modal-text-entry.png)

## 2. 달력 보조 선택 (📅 → DatePickerModal)

📅 버튼을 누르면 `재위 시작일` 달력 모달이 텍스트 입력과 병행해 열린다.
자체 `AD | BC` 토글 + `년/월/일` 숫자 필드 + 월 그리드 + `오늘` / `선택 적용`.

![재위 시작일 달력 보조 모달](reign-modal-verification-assets/reign-modal-calendar-picker.png)

---

## 3. 브라우저 DOM 감사 결과

| 확인 항목 | 재위 시작일 | 재위 종료일 |
|---|:---:|:---:|
| 필드 존재 | ✓ | ✓ |
| AD/BC 토글 | ✓ | ✓ |
| 년/월/일 텍스트 입력 | ✓ | ✓ |
| 달력(📅) 버튼 | ✓ | ✓ |
| 클릭 시 달력 열림 | ✓ | — |

## 4. 라이브 HTTP 라운드트립 (실 서버 `:8000`)

로그인 → `POST /government-positions/sovereign-reigns` → DB 확인 → `DELETE`(정리)까지 실제 계약 통과.

| 케이스 | HTTP | `start_date` | 구조화 컬럼 | precision |
|---|:---:|---|---|---|
| **BC** 기원전 44년 3월 ~ 3월 15일 | 201(게이트 통과) | **NULL** | `start_era=BC, year=44, month=3` · `end_era=BC, year=44, month=3, day=15` | 시작=`month`, 종료=`day` |
| **AD** 1519년 6월 28일 | 201 | **1519-06-28**(DATETIME 병행) | `start_era=AD, year=1519, month=6, day=28` | `day` |

두 건 생성·확인 후 API `DELETE`로 정리(잔여 0). BC 게이트가 구조화 채널을 정상 면제하고, precision은 월/일 유무로 서버 파생되며, AD는 DATETIME도 병행 기록됨을 확인.

## 5. 스코프

- 대상: **SovereignReign**(군주 재위) 전용. 일반 재임(tenure) BC는 이번 범위 밖(미계획 유지).
- 근거: MariaDB 드라이버가 연도<100 DATETIME을 2044로 손상 → BC/고대는 구조화 Int가 진실, `start_date`는 AD1000+ 완전일자만 병행. (`PersonSpouse.marriageStart*` 선례 동형)
