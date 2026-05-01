import { type RegionPalette } from './use-region-palette'

interface KpiChipProps<V extends string> {
  palette: RegionPalette
  /** 칩 클릭 시 적용될 필터 값 */
  filterValue: V
  /** 현재 활성화된 필터 — 같으면 토글로 'all' 처리 */
  currentFilter: V | 'all'
  onFilterChange: (value: V | 'all') => void
  label: string
  count: number
}

/**
 * KPI 스트립 안의 클릭 가능한 칩.
 * 비활성 → 클릭 시 해당 type 필터로,
 * 활성 → 클릭 시 'all'로 토글.
 */
export function KpiChip<V extends string>({
  palette,
  filterValue,
  currentFilter,
  onFilterChange,
  label,
  count,
}: KpiChipProps<V>) {
  const active = currentFilter === filterValue
  return (
    <button
      type="button"
      onClick={() => onFilterChange(active ? 'all' : filterValue)}
      title={active ? '전체로 보기' : `${label}만 보기`}
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 4,
        padding: '3px 9px',
        borderRadius: 8,
        border: `1px solid ${active ? palette.primary : 'transparent'}`,
        background: active ? palette.bgSelected : 'transparent',
        color: active ? palette.primaryLight : 'inherit',
        fontWeight: active ? 600 : 500,
        fontSize: 13,
        cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = palette.bgHover
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent'
        }
      }}
    >
      <span>{label}</span>
      <span style={{ fontWeight: active ? 700 : 600 }}>{count}개</span>
    </button>
  )
}

interface KpiStripProps {
  palette: RegionPalette
  /** 좌측 라벨 ("현재 보기") + 칩들 */
  children: React.ReactNode
  /** 우측 합계 라벨 */
  totalCount: number
}

/**
 * 자연/인프라 뷰의 상단 KPI 스트립 — 라벨·칩들·합계를 한 줄로.
 */
export function KpiStrip({ palette, children, totalCount }: KpiStripProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
        padding: '8px 14px',
        background: palette.bgSecondary,
        borderRadius: 12,
        border: `1px solid ${palette.border}`,
        fontSize: 13,
        color: palette.textSecondary,
        fontWeight: 500,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ color: palette.text, fontWeight: 600 }}>현재 보기</span>
      <span>·</span>
      {children}
      <span
        style={{
          marginLeft: 'auto',
          color: palette.primary,
          fontWeight: 600,
        }}
      >
        총 {totalCount}개
      </span>
    </div>
  )
}
