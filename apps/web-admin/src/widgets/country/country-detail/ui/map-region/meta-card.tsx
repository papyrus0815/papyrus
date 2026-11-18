import { type RegionPalette } from './use-region-palette'

interface MetaCardProps {
  palette: RegionPalette
  label: string
  value: string
  fullWidth?: boolean
}

/**
 * 라벨 + 값 단일 메타 셀 — Event-Ledger 플랫 1px 헤어라인 박스.
 */
export function MetaCard({ palette, label, value, fullWidth }: MetaCardProps) {
  return (
    <div
      style={{
        padding: '11px 13px',
        background: palette.bgSecondary,
        borderRadius: 6,
        border: `1px solid ${palette.border}`,
        boxShadow: 'none',
        gridColumn: fullWidth ? '1 / -1' : undefined,
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          color: palette.textSecondary,
          marginBottom: 4,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: palette.text,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
    </div>
  )
}
