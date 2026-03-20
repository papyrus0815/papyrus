/**
 * 중앙부처 — 검색 결과 없음 (카테고리 열 공통)
 */
import { getCabinetsSectionPalette } from '@/shared/styles/country-detail-palette'

type MinistryDeptSearchEmptyProps = {
  isDark: boolean
  onClearSearch: () => void
}

export function MinistryDeptSearchEmpty({
  isDark,
  onClearSearch,
}: MinistryDeptSearchEmptyProps) {
  const C = getCabinetsSectionPalette(isDark)

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '24px 0',
      }}
    >
      <span
        style={{
          fontSize: 13,
          color: C.textMuted,
          textAlign: 'center',
          lineHeight: 1.5,
          maxWidth: 280,
        }}
      >
        이 카테고리에서 검색과 일치하는 부처가 없습니다.
      </span>
      <button
        type="button"
        onClick={onClearSearch}
        style={{
          padding: '6px 12px',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          border: `1px solid ${C.borderMid}`,
          borderRadius: 10,
          background: C.btnBg,
          color: C.sectionLabelTint,
        }}
      >
        검색어 지우기
      </button>
    </div>
  )
}
