/**
 * 중앙부처 — 검색 결과 없음 (카테고리 열 공통)
 */
type MinistryDeptSearchEmptyProps = {
  isDark: boolean
  onClearSearch: () => void
}

export function MinistryDeptSearchEmpty({
  isDark,
  onClearSearch,
}: MinistryDeptSearchEmptyProps) {
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
          color: isDark ? '#94a3b8' : '#64748b',
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
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'}`,
          borderRadius: 10,
          background: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
          color: isDark ? '#cbd5e1' : '#475569',
        }}
      >
        검색어 지우기
      </button>
    </div>
  )
}
