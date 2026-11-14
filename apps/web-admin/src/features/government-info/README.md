# government-info (행정조직)

국가 상세의 **행정조직** 블록(`GovernmentInfoSection`) 관련 FSD 모듈입니다.

## 현재 상태

- `model/` — `government-content-tab.ts`, `constants.ts`, `ministry-form-fields.ts`, **`use-ministries-tab.ts`**, **`use-constituent-historical-polities.ts`** (배럴 `index.ts` 없음 — 직접 경로로 import)
- `ui/` — **`political-system-tab.widget.tsx`** (정체·헌정 탭), **`ministries-tab-section.widget.tsx`** (중앙부처·국가기관 탭 본문), **`ministries-ledger-view.widget.tsx`** (중앙부처 원장 표 뷰), **`government-statistics-tab.widget.tsx`** (통계·연혁 탭), **`government-organizations-tab.styled.tsx`** (공통 섹션 스타일 조각), **`ministry-form-modal.widget.tsx`** (부처 등록·수정 포털 — `getCabinetsSectionPalette`), **`department-blocks.tsx`**, **`ministry-form.styles.ts`**
- `shared/lib/ministry-department/` — **`ministry-department-utils`**, **`ministry-department-query-keys`**, **`department-cabinet-matcher`**
- `widgets/.../cabinets-section.styled.tsx` — 행정부 전용 styled-components (`CabS.*` 네임스페이스로 위젯에서 사용)
- `widgets/.../cabinets-ledger-view.widget.tsx` — 행정부·내각 원장 목록(Ledger) 뷰
- `widgets/.../cabinet-portfolio-matrix.widget.tsx` — 내각 상세의 부처별 각료 편제표 및 공석 즉시 임명 뷰
- `widgets/.../government-info-section.widget.tsx` — 4개 주 탭(**정체·헌정** `<PoliticalSystemTab />`, **행정부·내각** `<CabinetsSection />`, **중앙부처·국가기관** `<MinistriesTabSection />`, **통계·연혁** `<GovernmentStatisticsTab />`) + 보조 서랍(**고유 관직** `<PositionDefinitionsSection />` `SidePanel`) 연동 및 URL 쿼리(`?sub=`, `?cabinetId=`, `?departmentId=`) 동기화.

## 다음 단계 (선택)

1. **다크 팔레트 나머지** — **`MinistryDepartmentDetailView`**(`ministry-department-detail.styles`)는 `theme.mode` 기반. 중앙부처 목록·**`ministry-form-modal`**·**`department-blocks`** 등은 `getCabinetsSectionPalette` 사용.
2. **행정부처 관리 페이지** — `useQuery` + `administrationDepartmentsAllQueryKey` / 무효화(`invalidateAdministrationDepartmentQueries`)로 국가 상세·목록·폼 캐시 정합성 유지 (적용됨)

## 레이어

| FSD   | 역할 |
|-------|------|
| features/government-info | 행정조직 도메인 로직·UI 조각 |
| widgets/country/country-detail | 국가 상세 조합 (여기서 feature import) |
