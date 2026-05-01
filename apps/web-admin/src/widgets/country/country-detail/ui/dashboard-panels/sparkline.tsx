import * as S from '../country-detail-dashboard.styles'

export type SparkAccent =
  | 'violet'
  | 'rose'
  | 'amber'
  | 'sky'
  | 'emerald'
  | 'indigo'

const COLORS: Record<SparkAccent, string> = {
  violet: '#8b5cf6',
  rose: '#f43f5e',
  amber: '#f59e0b',
  sky: '#0ea5e9',
  emerald: '#10b981',
  indigo: '#6366f1',
}

export interface SparklineProps {
  values: number[]
  accent: SparkAccent
  /** sr-only 텍스트로 사용할 카테고리 라벨 (예: "사건 발생") */
  srLabel: string
}

/** 경량 SVG sparkline — 라이브러리 없음. */
export function Sparkline({ values, accent, srLabel }: SparklineProps) {
  const W = 100
  const H = 24
  const max = Math.max(1, ...values)
  const total = values.reduce((s, v) => s + v, 0)
  const step = values.length > 1 ? W / (values.length - 1) : W
  const points = values
    .map((v, i) => {
      const x = i * step
      const y = H - (v / max) * H
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const area = `0,${H} ${points} ${W},${H}`
  const color = COLORS[accent]
  const fillId = `spark-fill-${accent}`
  return (
    <>
      <S.SparkSvg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#${fillId})`} />
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </S.SparkSvg>
      <S.VisuallyHidden>
        최근 12개월 {srLabel} 분포: 총 {total}건, 최대 {max}건/월
      </S.VisuallyHidden>
    </>
  )
}
