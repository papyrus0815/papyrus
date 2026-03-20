# government-info (행정조직)

국가 상세의 **행정조직** 블록(`GovernmentInfoSection`) 관련 FSD 모듈입니다.

## 현재 상태

- `model/` — `government-content-tab.ts`, `constants.ts`, `ministry-form-fields.ts`, **`organization-tab.constants.ts`** (조직 유형·활동 범위), **`use-ministries-tab.ts`** (배럴 `index.ts` 없음 — 직접 경로로 import)
- `ui/` — **`ministries-tab-section.widget.tsx`** (중앙부처 탭 본문), **`government-statistics-tab.widget.tsx`** (통계 탭), **`government-organizations-tab.widget.tsx`** + **`government-organizations-tab.styled.tsx`** (행정기구 탭 — 목록·상세·등록/수정 모달), **`ministry-form-modal.widget.tsx`** (부처 등록·수정 포털 — `getCabinetsSectionPalette`), **`department-blocks.tsx`**, **`ministry-form.styles.ts`**
- `shared/lib/ministry-department/` — **`ministry-department-utils`**, **`ministry-department-query-keys`**
- `widgets/.../cabinets-section.styled.tsx` — 행정부 전용 styled-components (`CabS.*` 네임스페이스로 위젯에서 사용)
- `widgets/.../government-info-section.widget.tsx` — **통계** `<GovernmentStatisticsTab />`, **중앙부처** `<MinistriesTabSection />`, **행정기구** `<GovernmentOrganizationsTab />`로 feature 연동(역대 수반·행정부·직위 정의은 위젯에서 조합). **부처 카테고리 모달**은 `getCabinetsSectionPalette` + `styled` `theme.gov`(`DefaultTheme` 확장)로 라이트/다크 대응.

## 다음 단계 (선택)

1. **다크 팔레트 나머지** — **`MinistryDepartmentDetailView`**(`ministry-department-detail.styles`)는 `theme.mode` 기반. 중앙부처 목록·**`ministry-form-modal`**·**`department-blocks`** 등은 `getCabinetsSectionPalette` 사용.
2. **행정부처 관리 페이지** — `useQuery` + `administrationDepartmentsAllQueryKey` / 무효화(`invalidateAdministrationDepartmentQueries`)로 국가 상세·목록·폼 캐시 정합성 유지 (적용됨)

## 레이어

| FSD   | 역할 |
|-------|------|
| features/government-info | 행정조직 도메인 로직·UI 조각 |
| widgets/country/country-detail | 국가 상세 조합 (여기서 feature import) |
