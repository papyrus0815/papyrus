import { useMemo, useState } from 'react'

import styled from 'styled-components'

import {
  useDemographicIndicators,
  useEconomicIndicators,
} from '@/entities/country/api.indicators'

import { CountryDataManagerModal } from '../country-data-manager/country-data-manager-modal'
import { IconChart } from '../country-detail-dashboard.icons'
import * as S from '../country-detail-dashboard.styles'
import { IndicatorTrendChart, type TrendPoint } from './indicator-trend-chart'
import { ChartEmpty } from './chart-empty'

interface IndicatorTrendsSectionProps {
  /** 모던 국가 ID. 역사 국가에는 지표가 없으므로 호출하지 않는다. */
  countryId: string
  countryName: string
}

/**
 * 국가 지표 추이 — GDP 성장률·인구 증가율 + 데이터 관리 진입점.
 *
 * 두 카드는 형태가 같아야 나란히 읽힌다. 차트는 [[IndicatorTrendChart]] 하나를
 * 두 번 쓰고, 이 파일은 **무슨 값을 넘길지**만 정한다.
 * (수출·수입은 교역 섹션이 따로 맡는다)
 */
export function IndicatorTrendsSection({
  countryId,
  countryName,
}: IndicatorTrendsSectionProps) {
  const [managerOpen, setManagerOpen] = useState(false)
  const economicQuery = useEconomicIndicators(countryId)
  const demographicQuery = useDemographicIndicators(countryId)

  const economicPoints = useMemo<TrendPoint[]>(
    () =>
      (economicQuery.data ?? [])
        .filter((row) => row.gdpGrowthRate != null)
        .map((row) => ({ year: row.year, value: Number(row.gdpGrowthRate) })),
    [economicQuery.data],
  )

  const populationPoints = useMemo<TrendPoint[]>(
    () =>
      (demographicQuery.data ?? [])
        .filter((row) => row.populationGrowthRate != null)
        .map((row) => ({
          year: row.year,
          value: Number(row.populationGrowthRate),
        })),
    [demographicQuery.data],
  )

  const isLoading = economicQuery.isLoading || demographicQuery.isLoading
  const hasAny = economicPoints.length > 0 || populationPoints.length > 0

  const manager = (
    <CountryDataManagerModal
      countryId={countryId}
      countryName={countryName}
      open={managerOpen}
      onClose={() => setManagerOpen(false)}
    />
  )

  return (
    <S.Section>
      <S.SectionTitleRow>
        <S.SectionTitleIcon $accent="violet">
          <IconChart />
        </S.SectionTitleIcon>
        <S.SectionTitleText>지표 추이</S.SectionTitleText>
        <S.SectionAction type="button" onClick={() => setManagerOpen(true)}>
          데이터 관리
        </S.SectionAction>
      </S.SectionTitleRow>

      {!isLoading && !hasAny && (
        <ChartEmpty
          text="연도별 GDP 성장률·인구 증가율을 넣으면 여기에 추이선이 그려집니다."
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
                caption="전년 대비 인구 증감"
                points={[]}
              />
            </Grid>
          </GridContainer>
        </ChartEmpty>
      )}

      {manager}

      {/* 로딩 중엔 자리를 잡아만 둔다 — 뼈대가 번쩍이면 레이아웃이 튄다 */}
      {isLoading ? (
        <GridContainer>
          <Grid>
            <Placeholder />
          </Grid>
        </GridContainer>
      ) : (
        hasAny && (
          <GridContainer>
            <Grid>
              {economicPoints.length > 0 && (
                <IndicatorTrendChart
                  title="경제 성장률"
                  caption="연간 실질 GDP 성장률"
                  points={economicPoints}
                />
              )}
              {populationPoints.length > 0 && (
                <IndicatorTrendChart
                  title="인구 증가율"
                  caption="전년 대비 인구 증감"
                  points={populationPoints}
                />
              )}
            </Grid>
          </GridContainer>
        )
      )}
    </S.Section>
  )
}

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

const Placeholder = styled.div`
  height: 320px;
  border-radius: 14px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.02)'};
`

