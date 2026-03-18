import * as S from './country-detail.styles'
import { KPICard } from './kpi-card.ui'

interface KPIGridProps {
  population: string
  area: string
  density: string
  gdpPerCapita: string
  onPopulationClick: () => void
  onGdpClick: () => void
  isAdministrativeStats?: boolean // 행정구역 통계 모드인지 여부
  regionName?: string // 행정구역명 (행정구역 모드에서 사용)
  industry?: string // 주요 산업 (행정구역 모드에서 사용)
  // 통계 메타 데이터
  populationGrowthRate?: string
  populationGrowthChange?: string
  economicGrowthRate?: string
  economicGrowthChange?: string
}

/**
 * KPI 그리드 위젯
 * - 4개의 KPI 카드를 조합하여 국가 통계 지표를 표시
 */
export function KPIGrid({
  population,
  area,
  density,
  gdpPerCapita,
  onPopulationClick,
  onGdpClick,
  isAdministrativeStats = false,
  regionName,
  industry,
  populationGrowthRate,
  populationGrowthChange,
  economicGrowthRate,
  economicGrowthChange,
}: KPIGridProps) {
  if (isAdministrativeStats) {
    // 행정구역 메타정보 모드
    return (
      <S.KPIGrid>
        <KPICard
          label="총 인구"
          rank={regionName || '행정구역'}
          value={population}
          percentageChange="지역 인구"
          year="2024년"
          sparklinePoints="0,35 12,33 24,29 36,27 48,23 60,21 72,18 84,14 100,10"
          isPositive
          variant="population"
          delay={0.1}
        />

        <KPICard
          label="행정구역 면적"
          rank={regionName || '행정구역'}
          value={area}
          percentageChange="총 면적"
          year="2024년"
          sparklinePoints="0,38 12,38 24,37 36,37 48,36 60,36 72,35 84,35 100,34"
          isPositive
          variant="population"
          delay={0.15}
        />

        <KPICard
          label="인구 밀도"
          rank={regionName || '행정구역'}
          value={density}
          percentageChange="단위면적당"
          year="2024년"
          sparklinePoints="0,32 12,31 24,29 36,28 48,26 60,25 72,23 84,22 100,20"
          isPositive
          variant="gdp"
          delay={0.2}
        />

        <KPICard
          label={industry ? '주요 산업' : '지역 GDP'}
          rank={regionName || '행정구역'}
          value={industry || gdpPerCapita}
          percentageChange={industry ? '핵심 산업' : '지역 총생산'}
          year="2024년"
          sparklinePoints="0,30 12,28 24,32 36,27 48,26 60,22 72,24 84,20 100,18"
          isPositive
          variant="gdp"
          delay={0.25}
        />
      </S.KPIGrid>
    )
  }

  // 기본 국가 통계 모드
  return (
    <S.KPIGrid>
      <KPICard
        label="총 인구"
        rank={`인구 증가율 ${populationGrowthRate || '-'}`}
        value={population}
        percentageChange={populationGrowthChange ? `${populationGrowthChange}% 전년대비` : '-'}
        year="2024년"
        sparklinePoints="0,35 12,33 24,29 36,27 48,23 60,21 72,18 84,14 100,10"
        isPositive={parseFloat(populationGrowthChange || '0') >= 0}
        variant="population"
        delay={0.1}
        onClick={onPopulationClick}
      />

      <KPICard
        label="국토 면적"
        rank="국토 총면적"
        value={area}
        percentageChange="변동 없음"
        year="2024년"
        sparklinePoints="0,38 12,38 24,37 36,37 48,36 60,36 72,35 84,35 100,34"
        isPositive
        variant="population"
        delay={0.15}
      />

      <KPICard
        label="인구 밀도"
        rank="단위면적당 인구"
        value={density}
        percentageChange={populationGrowthChange ? `${populationGrowthChange}% 전년대비` : '-'}
        year="2024년"
        sparklinePoints="0,32 12,31 24,29 36,28 48,26 60,25 72,23 84,22 100,20"
        isPositive={parseFloat(populationGrowthChange || '0') >= 0}
        variant="gdp"
        delay={0.2}
      />

      <KPICard
        label="1인당 GDP"
        rank={`경제 성장률 ${economicGrowthRate || '-'}`}
        value={gdpPerCapita}
        percentageChange={economicGrowthChange ? `${economicGrowthChange}% 전년대비` : '-'}
        year="2024년"
        sparklinePoints="0,30 12,28 24,32 36,27 48,26 60,22 72,24 84,20 100,18"
        isPositive={parseFloat(economicGrowthChange || '0') >= 0}
        variant="gdp"
        delay={0.25}
        onClick={onGdpClick}
      />
    </S.KPIGrid>
  )
}
