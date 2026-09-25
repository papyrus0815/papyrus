import { useMemo, useState } from 'react'

import styled from 'styled-components'

import type { BondMaturity } from '@/entities/country/api.indicators'
import { useBondYields } from '@/entities/country/api.indicators'
import {
  bondMaturityLabel,
  compareBondMaturity,
  formatBasisPoints,
  formatYield,
  pickBenchmarkMaturity,
} from '@/entities/country/lib/bond-maturity'

import { CountryDataManagerModal } from '../country-data-manager/country-data-manager-modal'
import { IconPercent } from '../country-detail-dashboard.icons'
import * as S from '../country-detail-dashboard.styles'
import { BondYieldCurve, type CurveSeries } from './bond-yield-curve'
import { ChartEmpty } from './chart-empty'
import { ChartSkeleton } from './chart-skeleton'
import { IndicatorTrendChart, type TrendPoint } from './indicator-trend-chart'

interface BondYieldSectionProps {
  /** 모던 국가 ID — 국채 금리는 현대 국가에만 붙는다(역사 국가는 지표 축이 없다) */
  countryId: string
  countryName: string
}

/** 장단기 스프레드를 재는 짧은 쪽 후보 — 앞에서부터 있는 것을 쓴다 */
const SHORT_LEG_CANDIDATES: BondMaturity[] = ['Y2', 'Y1', 'M6', 'M3', 'Y3']

/**
 * 국채 금리 — 한 나라가 돈을 빌리는 값.
 *
 * 다른 지표와 달리 **한 해에 값이 여럿**이라(만기별) 그림이 두 장이다.
 *  · 수익률 곡선: 한 해를 만기 순으로 — 장기가 단기보다 싼 '역전'은 모양으로만 보인다.
 *  · 금리 추이: 대표 만기(10년물)를 연도 순으로 — 다른 지표 카드와 같은 형태다.
 *
 * 자료가 없어도 자리를 지킨다(지표 추이·교역과 같은 규약) — 감추면 "그런 기능 없다"가 된다.
 */
export function BondYieldSection({
  countryId,
  countryName,
}: BondYieldSectionProps) {
  const [managerOpen, setManagerOpen] = useState(false)
  const [pickedYear, setPickedYear] = useState<number | null>(null)
  const bondQuery = useBondYields(countryId)

  const model = useMemo(() => {
    const rows = bondQuery.data ?? []
    if (rows.length === 0) return null

    /** 연도 → 그 해의 만기별 금리 */
    const byYear = new Map<number, { maturity: BondMaturity; value: number }[]>()
    for (const row of rows) {
      const bucket = byYear.get(row.year) ?? []
      bucket.push({ maturity: row.maturity, value: Number(row.yieldRate) })
      byYear.set(row.year, bucket)
    }
    for (const bucket of byYear.values()) {
      bucket.sort((left, right) =>
        compareBondMaturity(left.maturity, right.maturity),
      )
    }

    const years = [...byYear.keys()].sort((left, right) => left - right)
    const latestYear = years[years.length - 1]

    /*
     * 대표 만기는 **전 기간을 통틀어** 한 번만 고른다. 해마다 다시 고르면 10년물이
     * 빠진 해에 축이 2년물로 갈아타면서 추이선이 뚝 끊긴 것처럼 보인다.
     */
    const benchmark = pickBenchmarkMaturity(
      Array.from(new Set(rows.map((row) => row.maturity))),
    )

    const trendPoints: TrendPoint[] = benchmark
      ? years
          .map((year) => {
            const found = byYear
              .get(year)!
              .find((point) => point.maturity === benchmark)
            return found ? { year, value: found.value } : null
          })
          .filter((point): point is TrendPoint => point != null)
      : []

    const benchmarkAt = (year: number) =>
      benchmark
        ? (byYear.get(year)?.find((point) => point.maturity === benchmark)
            ?.value ?? null)
        : null

    /**
     * 고른 해의 요약 — 대표 만기 금리, 직전 해 대비, 장단기 스프레드.
     *
     * 최신 연도로 고정하지 않는다. 연도 칩이 곡선만 갈아끼우고 위 숫자는 그대로면
     * "2024년 10년물 4.58%" 아래에 2023년 곡선이 놓여 서로를 부정한다.
     */
    const statsFor = (year: number) => {
      const benchmarkYield = benchmarkAt(year)
      const index = years.indexOf(year)
      const priorYear = index > 0 ? years[index - 1] : null
      const priorYield = priorYear != null ? benchmarkAt(priorYear) : null
      const deltaBp =
        benchmarkYield != null && priorYield != null
          ? benchmarkYield - priorYield
          : null

      /* 장단기 스프레드 — 긴 쪽은 대표 만기, 짧은 쪽은 그 해에 있는 것 중 앞선 후보 */
      const points = byYear.get(year) ?? []
      const shortLeg = SHORT_LEG_CANDIDATES.map((candidate) =>
        points.find((point) => point.maturity === candidate),
      ).find((point) => point != null && point.maturity !== benchmark)
      const spread =
        benchmarkYield != null && shortLeg != null
          ? benchmarkYield - shortLeg.value
          : null

      return {
        benchmarkYield,
        priorYear,
        deltaBp,
        spread,
        shortLeg: shortLeg ?? null,
      }
    }

    return {
      byYear,
      years,
      latestYear,
      benchmark,
      trendPoints,
      statsFor,
      maturityCount: new Set(rows.map((row) => row.maturity)).size,
    }
  }, [bondQuery.data])

  /** 곡선의 기준 연도 — 고르지 않았으면 최신 연도 */
  const curveYear =
    model == null
      ? null
      : pickedYear != null && model.byYear.has(pickedYear)
        ? pickedYear
        : model.latestYear

  const stats =
    model != null && curveYear != null ? model.statsFor(curveYear) : null

  const curveSeries: CurveSeries[] = useMemo(() => {
    if (model == null || curveYear == null) return []
    const base: CurveSeries = {
      year: curveYear,
      points: model.byYear.get(curveYear) ?? [],
    }
    /* 비교선은 바로 앞 해 — 곡선이 통째로 올랐는지 앞머리만 섰는지가 겹쳐야 보인다 */
    const index = model.years.indexOf(curveYear)
    const priorYear = index > 0 ? model.years[index - 1] : null
    if (priorYear == null) return [base]
    return [base, { year: priorYear, points: model.byYear.get(priorYear) ?? [] }]
  }, [model, curveYear])

  const manager = (
    <CountryDataManagerModal
      countryId={countryId}
      countryName={countryName}
      open={managerOpen}
      onClose={() => setManagerOpen(false)}
      initialTab="bonds"
    />
  )

  const benchmarkLabel = model?.benchmark
    ? bondMaturityLabel(model.benchmark)
    : '10년'

  return (
    <S.Section>
      <S.SectionTitleRow>
        <S.SectionTitleIcon>
          <IconPercent />
        </S.SectionTitleIcon>
        <S.SectionTitleText>국채 금리</S.SectionTitleText>
        {model != null && (
          <S.SectionCountChip>
            {model.years.length}개 연도 · 만기 {model.maturityCount}종
          </S.SectionCountChip>
        )}
        <S.SectionAction type="button" onClick={() => setManagerOpen(true)}>
          데이터 관리
        </S.SectionAction>
      </S.SectionTitleRow>

      {manager}

      {bondQuery.isLoading ? (
        <ChartSkeleton variant="line" count={2} />
      ) : model == null ? (
        <ChartEmpty
          text="연도·만기별 국채 금리를 넣으면 그 해의 수익률 곡선과 10년물 추이가 여기에 그려집니다."
          actionLabel="국채 금리 등록"
          onAction={() => setManagerOpen(true)}
        >
          <GridContainer>
            <Grid>
              <BondYieldCurve
                title="수익률 곡선"
                caption="한 해의 만기별 국채 금리"
                series={[]}
              />
              <IndicatorTrendChart
                title="10년물 금리 추이"
                caption="대표 만기 국채 수익률"
                points={[]}
              />
            </Grid>
          </GridContainer>
        </ChartEmpty>
      ) : (
        <>
          <Headline>
            <HeadlineMain>
              <HeadlineLabel>
                {curveYear}년 {benchmarkLabel}물
              </HeadlineLabel>
              <HeadlineValue>
                {stats?.benchmarkYield != null
                  ? formatYield(stats.benchmarkYield)
                  : '—'}
              </HeadlineValue>
            </HeadlineMain>
            {stats?.deltaBp != null && stats.priorYear != null && (
              <HeadlineStat>
                <HeadlineLabel>{stats.priorYear}년 대비</HeadlineLabel>
                <HeadlineStatValue $tone={stats.deltaBp >= 0 ? 'up' : 'down'}>
                  {formatBasisPoints(stats.deltaBp)}
                </HeadlineStatValue>
              </HeadlineStat>
            )}
            {stats?.spread != null && stats.shortLeg != null && (
              <HeadlineStat>
                <HeadlineLabel>
                  장단기 스프레드 ({benchmarkLabel} −{' '}
                  {bondMaturityLabel(stats.shortLeg.maturity)})
                </HeadlineLabel>
                <HeadlineStatValue $tone={stats.spread < 0 ? 'down' : 'flat'}>
                  {formatBasisPoints(stats.spread)}
                  {/*
                    장단기 역전은 이 지면에서 유일하게 '경고'로 읽혀야 하는 값이다 —
                    긴 돈이 짧은 돈보다 싸다는 건 시장이 앞날을 어둡게 본다는 뜻이라
                    숫자만으로는 그 뜻이 전달되지 않는다.
                  */}
                  {stats.spread < 0 && <InvertedTag>역전</InvertedTag>}
                </HeadlineStatValue>
              </HeadlineStat>
            )}
          </Headline>

          {model.years.length > 1 && (
            <YearChips role="group" aria-label="수익률 곡선 기준 연도">
              {model.years
                .slice()
                .reverse()
                .map((year) => (
                  <YearChip
                    key={year}
                    type="button"
                    $active={year === curveYear}
                    aria-pressed={year === curveYear}
                    onClick={() => setPickedYear(year)}
                  >
                    {year}
                  </YearChip>
                ))}
            </YearChips>
          )}

          <GridContainer>
            <Grid>
              <BondYieldCurve
                title="수익률 곡선"
                caption={`${curveYear}년 만기별 국채 금리`}
                series={curveSeries}
              />
              {model.trendPoints.length > 0 && (
                <IndicatorTrendChart
                  title={`${benchmarkLabel}물 금리 추이`}
                  caption="대표 만기 국채 수익률"
                  points={model.trendPoints}
                />
              )}
            </Grid>
          </GridContainer>
        </>
      )}
    </S.Section>
  )
}

/** 지표 추이 섹션과 같은 격자 규약 — 두 카드면 좌우, 하나면 전체 폭 */
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


const Headline = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px 32px;
  margin-bottom: 14px;
`

const HeadlineMain = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const HeadlineStat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const HeadlineLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeadlineValue = styled.strong`
  font-size: 30px;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const HeadlineStatValue = styled.span<{ $tone: 'up' | 'down' | 'flat' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 17px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ $tone, theme }) => {
    if ($tone === 'flat') return theme.colors.text.primary
    const isDark = theme.mode === 'dark'
    if ($tone === 'up') return isDark ? '#fca5a5' : '#dc2626'
    return isDark ? '#7dd3fc' : '#0284c7'
  }};
`

const InvertedTag = styled.span`
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fca5a5' : '#b91c1c')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(248,113,113,0.16)' : 'rgba(220,38,38,0.10)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(248,113,113,0.34)' : 'rgba(220,38,38,0.22)'};
`

const YearChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
`

const YearChip = styled.button<{ $active: boolean }>`
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.active : theme.colors.border.default};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.active : theme.colors.text.secondary};
`
