import { type RegionPalette } from './use-region-palette'

interface MetaCardProps {
  palette: RegionPalette
  label: string
  value: string
  fullWidth?: boolean
}

/**
 * 라벨 + 값 단일 카드. 우측 상세 패널의 메타 그리드 구성 단위.
 * (이전엔 nature/infra 뷰가 같은 함수를 따로 정의)
 */
export function MetaCard({ palette, label, value, fullWidth }: MetaCardProps) {
  return (
    <div
      style={{
        padding: '14px 16px',
        background: palette.bgSecondary,
        borderRadius: 12,
        border: `1px solid ${palette.border}`,
        gridColumn: fullWidth ? '1 / -1' : undefined,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: palette.textSecondary,
          marginBottom: 6,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: palette.text }}>
        {value}
      </div>
    </div>
  )
}
