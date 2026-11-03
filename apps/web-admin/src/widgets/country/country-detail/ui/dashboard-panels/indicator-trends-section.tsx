import { useMemo, useState } from 'react'

import styled from 'styled-components'

import {
  useDemographicIndicators,
  useDevelopmentIndicators,
  useEconomicIndicators,
} from '@/entities/country/api.indicators'

import { CountryDataManagerModal } from '../country-data-manager/country-data-manager-modal'
import {
  INDICATOR_META,
  type IndicatorType,
} from '../country-data-manager/field-configs'
import { IconChart } from '../country-detail-dashboard.icons'
import * as S from '../country-detail-dashboard.styles'
import {
  formatMetricValue,
  IndicatorTrendChart,
  type TrendPoint,
} from './indicator-trend-chart'
import { ChartEmpty } from './chart-empty'
import { ChartSkeleton } from './chart-skeleton'
import { SectionHelpPopover } from './section-help-popover'

interface IndicatorTrendsSectionProps {
  /** 모던 국가 ID. 역사 국가에는 지표가 없으므로 호출하지 않는다. */
  countryId: string
  countryName: string
  /** 경제·통계 상세 탭으로 이동하는 콜백 (대시보드에서 호출) */
  onOpenDetailTab?: () => void
  /** 상세 탭 내부에 임베드된 경우 (데이터 관리 모달 버튼 생략) */
  embeddedInTab?: boolean
}

interface IndicatorSeries {
  key: string
  category: IndicatorType
  title: string
  caption: string
  unit: string
  points: TrendPoint[]
}

const FIELD_CAPTIONS: Record<string, string> = {
  gdpGrowthRate: '연간 실질 GDP 성장률',
  gdp: '연간 명목 국내총생산',
  gdpPerCapita: '1인당 국내총생산',
  inflationRate: '연간 소비자물가 상승률',
  unemploymentRate: '연간 실업률',
  tradeBalance: '연간 수출입 수지',
  governmentDebt: '중앙정부 총부채',
  debtToGdpRatio: 'GDP 대비 국가부채 비율',
  populationGrowthRate: '전년 대비 인구 증감률',
  population: '연도별 총인구 추이',
  birthRate: '인구 1,000명당 조출생률',
  deathRate: '인구 1,000명당 조사망률',
  fertilityRate: '가임여성 1인당 합계출산율',
  lifeExpectancy: '출생 시 기대수명',
  medianAge: '전체 인구의 중위연령',
  urbanizationRate: '전체 인구 중 도시 거주 비율',
  hdi: '유엔 인간개발지수 (0–1)',
  literacyRate: '성인 문해율',
  giniCoefficient: '소득 불평등 지니계수',
  gniPerCapita: '1인당 국민총소득',
  co2EmissionsPerCapita: '1인당 연간 온실가스 배출량',
  internetPenetration: '인구 대비 인터넷 이용률',
  povertyRate: '빈곤선 이하 인구 비율',
}

/** 핵심 성장률·증가율을 맨 앞에 두고 나머지는 카테고리 순으로 배치 */
const PRIORITY_KEYS = [
  'gdpGrowthRate',
  'populationGrowthRate',
  'gdpPerCapita',
  'gdp',
  'inflationRate',
  'unemploymentRate',
  'fertilityRate',
  'lifeExpectancy',
  'hdi',
]

function extractSeries(
  rows: ReadonlyArray<Record<string, unknown>> | undefined,
  category: IndicatorType,
): IndicatorSeries[] {
  if (!rows || rows.length === 0) return []
  const meta = INDICATOR_META[category]
  const result: IndicatorSeries[] = []
  for (const field of meta.fields) {
    const points: TrendPoint[] = []
    for (const row of rows) {
      const year = Number(row.year)
      const raw = row[field.key]
      if (!Number.isFinite(year) || raw == null || raw === '') continue
      const num =
        typeof raw === 'string'
          ? Number(raw.replace(/,/g, ''))
          : Number(raw)
      if (!Number.isFinite(num)) continue
      points.push({ year, value: num })
    }
    if (points.length > 0) {
      result.push({
        key: `${category}:${field.key}`,
        category,
        title: field.label,
        caption: FIELD_CAPTIONS[field.key] ?? `${meta.label} · ${field.label}`,
        unit: field.unit ?? '',
        points,
      })
    }
  }
  return result
}

/**
 * 국가 지표 추이 — 경제(8종)·인구(8종)·발전(7종) 중 등록된 모든 지표를 추이 차트로 표시.
 *
 * 예전에는 gdpGrowthRate·populationGrowthRate 두 필드만 하드코딩해 읽어서, 사용자가 데이터 관리
 * 모달에서 GDP·1인당 GDP·출산율·기대수명·HDI를 입력해도 지면이 '자료 없음'으로 남았다.
 */
export function IndicatorTrendsSection({
  countryId,
  countryName,
  onOpenDetailTab,
  embeddedInTab = false,
}: IndicatorTrendsSectionProps) {
  const [managerOpen, setManagerOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | IndicatorType>('ALL')
  const [showAllCharts, setShowAllCharts] = useState(false)
  const economicQuery = useEconomicIndicators(countryId)
  const demographicQuery = useDemographicIndicators(countryId)
  const developmentQuery = useDevelopmentIndicators(countryId)

  const allSeries = useMemo<IndicatorSeries[]>(() => {
    const combined = [
      ...extractSeries(
        economicQuery.data as ReadonlyArray<Record<string, unknown>> | undefined,
        'economic',
      ),
      ...extractSeries(
        demographicQuery.data as ReadonlyArray<Record<string, unknown>> | undefined,
        'demographic',
      ),
      ...extractSeries(
        developmentQuery.data as ReadonlyArray<Record<string, unknown>> | undefined,
        'development',
      ),
    ]
    return combined.sort((left, right) => {
      const leftField = left.key.split(':')[1] ?? ''
      const rightField = right.key.split(':')[1] ?? ''
      const leftPriority = PRIORITY_KEYS.indexOf(leftField)
      const rightPriority = PRIORITY_KEYS.indexOf(rightField)
      if (leftPriority !== -1 && rightPriority !== -1) {
        return leftPriority - rightPriority
      }
      if (leftPriority !== -1) return -1
      if (rightPriority !== -1) return 1
      return 0
    })
  }, [economicQuery.data, demographicQuery.data, developmentQuery.data])

  const isLoading =
    economicQuery.isLoading ||
    demographicQuery.isLoading ||
    developmentQuery.isLoading
  const hasAny = allSeries.length > 0

  const categoryCounts = useMemo(() => {
    const counts: Record<IndicatorType, number> = {
      economic: 0,
      demographic: 0,
      development: 0,
    }
    for (const item of allSeries) {
      counts[item.category] += 1
    }
    return counts
  }, [allSeries])

  const activeCategory =
    categoryFilter !== 'ALL' && categoryCounts[categoryFilter] === 0
      ? 'ALL'
      : categoryFilter

  const filteredSeries = useMemo(
    () =>
      activeCategory === 'ALL'
        ? allSeries
        : allSeries.filter((item) => item.category === activeCategory),
    [allSeries, activeCategory],
  )

  const defaultLimit = embeddedInTab ? filteredSeries.length : 4
  const visibleSeries =
    showAllCharts || filteredSeries.length <= defaultLimit
      ? filteredSeries
      : filteredSeries.slice(0, defaultLimit)
  const hiddenChartCount = Math.max(
    0,
    filteredSeries.length - visibleSeries.length,
  )

  /** 상단 핵심 지표 요약 바 — 우선순위 상위 최대 6개 지표의 최신값과 직전 대비 증감 */
  const headlineSpecs = useMemo(() => {
    return allSeries.slice(0, 6).map((series) => {
      const sorted = [...series.points].sort((a, b) => a.year - b.year)
      const latest = sorted[sorted.length - 1]
      const prev = sorted.length >= 2 ? sorted[sorted.length - 2] : null
      const delta = latest && prev ? latest.value - prev.value : null
      return {
        key: series.key,
        title: series.title,
        unit: series.unit,
        latestYear: latest?.year ?? null,
        latestValue: latest?.value ?? null,
        prevYear: prev?.year ?? null,
        delta,
      }
    })
  }, [allSeries])

  const activeCategoryCount = (
    ['economic', 'demographic', 'development'] as const
  ).filter((cat) => categoryCounts[cat] > 0).length

  const manager = (
    <CountryDataManagerModal
      countryId={countryId}
      countryName={countryName}
      open={managerOpen}
      onClose={() => setManagerOpen(false)}
    />
  )

  if (!isLoading && !hasAny && embeddedInTab) {
    return null
  }

  return (
    <S.Section $wide={hasAny}>
      <S.SectionTitleRow>
        <S.SectionTitleIcon>
          <IconChart />
        </S.SectionTitleIcon>
        <S.SectionTitleText>지표 추이</S.SectionTitleText>
        <SectionHelpPopover sectionKey="trends" />
        {hasAny && (
          <S.SectionCountChip>{allSeries.length}개 지표</S.SectionCountChip>
        )}
        {hasAny && !embeddedInTab && (
          <S.SectionAction type="button" onClick={() => setManagerOpen(true)}>
            데이터 관리
          </S.SectionAction>
        )}
        {onOpenDetailTab && (
          <S.SectionLink type="button" onClick={onOpenDetailTab}>
            상세·원장 보기
          </S.SectionLink>
        )}
      </S.SectionTitleRow>

      {!isLoading && !hasAny && (
        <ChartEmpty
          text="연도별 경제(GDP·성장률·물가)·인구(출산율·기대수명)·발전(HDI·지니계수) 지표를 넣으면 여기에 추이선이 그려집니다."
          hint="최소 2개 연도 이상 입력 시 전년 대비 증감과 시계열 꺾은선 차트가 활성화됩니다"
          actionLabel="연도별 지표 등록"
          onAction={() => setManagerOpen(true)}
        >
          <GridContainer>
            <Grid>
              <IndicatorTrendChart
                title="경제 성장률"
                caption="연간 실질 GDP 성장률"
                points={[]}
              />
              <IndicatorTrendChart
                title="인구 증가율"
                caption="전년 대비 인구 증감률"
                points={[]}
              />
            </Grid>
          </GridContainer>
        </ChartEmpty>
      )}

      {manager}

      {/* 로딩 중엔 그려질 두 그래프와 같은 모양·높이로 자리를 잡는다 — 자료가 와도 지면이 튀지 않는다 */}
      {isLoading ? (
        <ChartSkeleton variant="line" count={2} />
      ) : (
        hasAny && (
          <>
            {headlineSpecs.length > 0 && (
              <HeadlineStrip aria-label="핵심 지표 최신 요약">
                {headlineSpecs.map((spec) => {
                  if (spec.latestValue == null || spec.latestYear == null) {
                    return null
                  }
                  const deltaUnit = spec.unit === '%' ? '%p' : spec.unit
                  const deltaSign =
                    spec.delta != null && spec.delta > 0 ? '+' : ''
                  return (
                    <HeadlineCell key={spec.key}>
                      <HeadlineTop>
                        <HeadlineTitle>{spec.title}</HeadlineTitle>
                        <HeadlineYear>{spec.latestYear}년</HeadlineYear>
                      </HeadlineTop>
                      <HeadlineValueRow>
                        <HeadlineVal>
                          {formatMetricValue(spec.latestValue, spec.unit)}
                        </HeadlineVal>
                        {spec.delta != null &&
                          spec.prevYear != null &&
                          Math.abs(spec.delta) > 1e-6 && (
                            <HeadlineDelta>
                              {spec.prevYear} 대비 {deltaSign}
                              {formatMetricValue(spec.delta, deltaUnit)}
                            </HeadlineDelta>
                          )}
                      </HeadlineValueRow>
                    </HeadlineCell>
                  )
                })}
              </HeadlineStrip>
            )}

            {activeCategoryCount > 1 && (
              <FilterBar role="tablist" aria-label="지표 분야 필터">
                <FilterChip
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === 'ALL'}
                  $active={activeCategory === 'ALL'}
                  onClick={() => {
                    setCategoryFilter('ALL')
                    setShowAllCharts(false)
                  }}
                >
                  전체 <FilterCount>{allSeries.length}</FilterCount>
                </FilterChip>
                {(['economic', 'demographic', 'development'] as const).map(
                  (cat) =>
                    categoryCounts[cat] > 0 ? (
                      <FilterChip
                        key={cat}
                        type="button"
                        role="tab"
                        aria-selected={activeCategory === cat}
                        $active={activeCategory === cat}
                        onClick={() => {
                          setCategoryFilter(cat)
                          setShowAllCharts(false)
                        }}
                      >
                        {INDICATOR_META[cat].label}{' '}
                        <FilterCount>{categoryCounts[cat]}</FilterCount>
                      </FilterChip>
                    ) : null,
                )}
              </FilterBar>
            )}
            <GridContainer>
              <Grid>
                {visibleSeries.map((series) => (
                  <IndicatorTrendChart
                    key={series.key}
                    title={series.title}
                    caption={series.caption}
                    points={series.points}
                    unit={series.unit}
                  />
                ))}
              </Grid>
            </GridContainer>
            {(hiddenChartCount > 0 ||
              (showAllCharts && filteredSeries.length > defaultLimit)) && (
              <MoreChartsRow>
                <MoreChartsBtn
                  type="button"
                  onClick={() => setShowAllCharts((prev) => !prev)}
                >
                  {showAllCharts
                    ? '핵심 추이 차트만 보기'
                    : `추이 차트 더보기 (+${hiddenChartCount}개 지표)`}
                </MoreChartsBtn>
              </MoreChartsRow>
            )}
          </>
        )
      )}
    </S.Section>
  )
}

const HeadlineStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(175px, 1fr));
  gap: 12px 24px;
  padding: 14px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.medium};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const HeadlineCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const HeadlineTop = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
`

const HeadlineTitle = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const HeadlineYear = styled.span`
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const HeadlineValueRow = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 8px;
`

const HeadlineVal = styled.strong`
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const HeadlineDelta = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MoreChartsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
`

const MoreChartsBtn = styled.button`
  appearance: none;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.medium};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.hover};
  }
`

const FilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const FilterChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 999px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border.light};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  cursor: pointer;
  transition:
    border-color 0.12s ease,
    background 0.12s ease,
    color 0.12s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const FilterCount = styled.span`
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  opacity: 0.78;
`

/**
 * 두 카드가 있으면 좌우로, 하나뿐이면 전체 폭.
 * 뷰포트가 아니라 이 그릇의 폭으로 판단한다 — 대시보드 열 폭은 화면 폭과 다르다.
 *
 * ⚠️ 컨테이너와 격자는 **다른 엘리먼트**여야 한다. 한 엘리먼트에 둘 다 걸면 자기가
 * 자기 컨테이너를 쿼리하는 꼴이라 규칙이 통째로 무시된다(두 카드가 세로로 쌓였다).
 */
const GridContainer = styled.div`
  container-type: inline-size;
`

const Grid = styled.div`
  display: grid;
  gap: 28px;

  @container (min-width: 760px) {
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  }
`


