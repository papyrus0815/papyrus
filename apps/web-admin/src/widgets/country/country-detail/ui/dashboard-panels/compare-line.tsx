import type { ContinentComparison } from '../../model/use-country-dashboard-stats'
import * as S from '../country-detail-dashboard.styles'

export interface CompareLineProps {
  comparison: ContinentComparison
  metric: 'population' | 'area'
}

/** KPI 카드 하단 — 같은 대륙 평균 대비 % + 순위 표시. 표본 부족 시 미렌더. */
export function CompareLine({ comparison, metric }: CompareLineProps) {
  const delta =
    metric === 'population'
      ? comparison.populationDeltaPct
      : comparison.areaDeltaPct
  const rank =
    metric === 'population' ? comparison.populationRank : comparison.areaRank
  const rankTotal =
    metric === 'population'
      ? comparison.populationRankTotal
      : comparison.areaRankTotal
  if (delta == null && rank == null) return null
  if (comparison.sampleSize < 3) return null
  const rounded = delta != null ? Math.round(delta) : null
  const direction: 'up' | 'down' | 'flat' =
    rounded == null
      ? 'flat'
      : rounded >= 5
        ? 'up'
        : rounded <= -5
          ? 'down'
          : 'flat'
  const sign = rounded != null && rounded > 0 ? '+' : ''
  return (
    <S.CompareLine>
      {rounded != null && (
        <S.ComparePill $direction={direction}>
          대륙 평균 대비 {sign}
          {rounded}%
        </S.ComparePill>
      )}
      {rank != null && rankTotal != null && rankTotal > 1 && (
        <span>
          대륙 {rank}위 / {rankTotal}국 (등록 기준)
        </span>
      )}
    </S.CompareLine>
  )
}
