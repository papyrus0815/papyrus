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
import { SectionHelpPopover } from './section-help-popover'

interface BondYieldSectionProps {
  /** 모던 국가 ID — 국채 금리는 현대 국가에만 붙는다(역사 국가는 지표 축이 없다) */
  countryId: string
  countryName: string
  /** 경제·통계 상세 탭으로 이동하는 콜백 */
  onOpenDetailTab?: () => void
  /** 상세 탭 내부에 임베드된 경우 */
  embeddedInTab?: boolean
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
  onOpenDetailTab,
  embeddedInTab = false,
}: BondYieldSectionProps) {
  const [managerOpen, setManagerOpen] = useState(false)
  const [pickedYear, setPickedYear] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'chart' | 'ledger'>('chart')
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
      const priorPoints = priorYear != null ? (byYear.get(priorYear) ?? []) : []
      const shortLeg = SHORT_LEG_CANDIDATES.map((candidate) =>
        points.find((point) => point.maturity === candidate),
      ).find((point) => point != null && point.maturity !== benchmark)
      const spread =
        benchmarkYield != null && shortLeg != null
          ? benchmarkYield - shortLeg.value
          : null

      const maturitySpecs = points.map((pt) => {
        const priorPt = priorPoints.find((p) => p.maturity === pt.maturity)
        const historyPoints = years
          .map((y) => {
            const found = byYear
              .get(y)
              ?.find((p) => p.maturity === pt.maturity)
            return found ? { year: y, value: found.value } : null
          })
          .filter((item): item is { year: number; value: number } => item != null)
        return {
          maturity: pt.maturity,
          label: bondMaturityLabel(pt.maturity),
          value: pt.value,
          priorValue: priorPt?.value ?? null,
          deltaBp: priorPt != null ? pt.value - priorPt.value : null,
          spreadVsBenchmark:
            benchmarkYield != null && pt.maturity !== benchmark
              ? pt.value - benchmarkYield
              : null,
          isBenchmark: pt.maturity === benchmark,
          recentHistory: historyPoints.slice(-6).reverse(),
        }
      })

      return {
        benchmarkYield,
        priorYear,
        priorYield,
        deltaBp,
        spread,
        shortLeg: shortLeg ?? null,
        maturitySpecs,
      }
    }

    const benchmarkValues = trendPoints.map((pt) => pt.value)
    const minBenchmarkYield =
      benchmarkValues.length > 0 ? Math.min(...benchmarkValues) : null
    const maxBenchmarkYield =
      benchmarkValues.length > 0 ? Math.max(...benchmarkValues) : null

    return {
      byYear,
      years,
      latestYear,
      benchmark,
      trendPoints,
      minBenchmarkYield,
      maxBenchmarkYield,
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

  if (!bondQuery.isLoading && model == null && embeddedInTab) {
    return null
  }

  return (
    <S.Section $wide={model != null}>
      <S.SectionTitleRow>
        <S.SectionTitleIcon>
          <IconPercent />
        </S.SectionTitleIcon>
        <S.SectionTitleText>국채 금리</S.SectionTitleText>
        <SectionHelpPopover sectionKey="bonds" />
        {model != null && (
          <S.SectionCountChip>
            {model.years.length}개 연도 · 만기 {model.maturityCount}종
          </S.SectionCountChip>
        )}
        {model != null && !embeddedInTab && (
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

      {manager}

      {bondQuery.isLoading ? (
        <ChartSkeleton variant="line" count={2} />
      ) : model == null ? (
        <ChartEmpty
          text="연도·만기별 국채 금리를 넣으면 그 해의 수익률 곡선과 10년물 추이가 여기에 그려집니다."
          hint="동일 연도에 단기(2년물)와 장기(10년물) 금리를 함께 입력하면 장단기 금리차(스프레드)가 자동 계산됩니다"
          actionLabel="국채 금리 등록"
          onAction={() => setManagerOpen(true)}
        />
      ) : (
        <>
          <HeadlineStrip aria-label={`${curveYear}년 국채 금리 핵심 요약`}>
            <HeadlineCell>
              <HeadlineLabel>
                {curveYear}년 기준물 ({benchmarkLabel}물)
              </HeadlineLabel>
              <HeadlineValue>
                {stats?.benchmarkYield != null
                  ? formatYield(stats.benchmarkYield)
                  : '—'}
              </HeadlineValue>
              <HeadlineSubNote>
                {stats
                  ? `${curveYear}년 등록 만기 ${stats.maturitySpecs.length}종`
                  : '관측 기록 없음'}
              </HeadlineSubNote>
            </HeadlineCell>

            <HeadlineCell>
              <HeadlineLabel>직전 관측 대비 증감</HeadlineLabel>
              {stats?.deltaBp != null && stats.priorYear != null ? (
                <>
                  <HeadlineStatValue $tone={stats.deltaBp >= 0 ? 'up' : 'down'}>
                    {formatBasisPoints(stats.deltaBp)}
                  </HeadlineStatValue>
                  <HeadlineSubNote>
                    {stats.priorYear}년 (
                    {stats.priorYield != null
                      ? formatYield(stats.priorYield)
                      : '—'}
                    ) 대비
                  </HeadlineSubNote>
                </>
              ) : (
                <>
                  <HeadlineStatValue $tone="flat">
                    비교 연도 없음
                  </HeadlineStatValue>
                  <HeadlineSubNote>
                    직전 관측 연도 데이터 미등록
                  </HeadlineSubNote>
                </>
              )}
            </HeadlineCell>

            <HeadlineCell>
              <HeadlineLabel>장단기 금리차 (스프레드)</HeadlineLabel>
              {stats?.spread != null && stats.shortLeg != null ? (
                <>
                  <HeadlineStatValue $tone={stats.spread < 0 ? 'down' : 'flat'}>
                    {formatBasisPoints(stats.spread)}
                    {stats.spread < 0 ? (
                      <InvertedTag>장단기 역전</InvertedTag>
                    ) : stats.spread < 0.25 ? (
                      <CurveShapeTag>평탄화</CurveShapeTag>
                    ) : (
                      <CurveShapeTag $normal>정상 우상향</CurveShapeTag>
                    )}
                  </HeadlineStatValue>
                  <HeadlineSubNote>
                    {benchmarkLabel}물 −{' '}
                    {bondMaturityLabel(stats.shortLeg.maturity)}물 수익률 차
                  </HeadlineSubNote>
                </>
              ) : (
                <>
                  <HeadlineStatValue $tone="flat">산출 불가</HeadlineStatValue>
                  <HeadlineSubNote>
                    동일 연도 단기물(2년·1년) 입력 필요
                  </HeadlineSubNote>
                </>
              )}
            </HeadlineCell>

            <HeadlineCell>
              <HeadlineLabel>관측 연대 · 기준물 범위</HeadlineLabel>
              <HeadlineStatValue $tone="flat">
                {model.years.length > 1
                  ? `${model.years[0]}–${model.latestYear}년 (${model.years.length}개년)`
                  : `${model.latestYear}년 (1개년)`}
              </HeadlineStatValue>
              <HeadlineSubNote>
                {model.minBenchmarkYield != null &&
                model.maxBenchmarkYield != null
                  ? `${benchmarkLabel}물 ${formatYield(model.minBenchmarkYield)} ~ ${formatYield(model.maxBenchmarkYield)}`
                  : `전체 만기 ${model.maturityCount}종`}
              </HeadlineSubNote>
            </HeadlineCell>
          </HeadlineStrip>

          {stats && stats.maturitySpecs.length > 1 && (
            <MaturityStrip aria-label={`${curveYear}년 만기별 국채 수익률 명세`}>
              {stats.maturitySpecs.map((spec) => (
                <MaturityCell key={spec.maturity} $highlight={spec.isBenchmark}>
                  <MaturityTop>
                    <MaturityLabel>{spec.label}물</MaturityLabel>
                    {spec.isBenchmark && <BenchmarkBadge>기준</BenchmarkBadge>}
                  </MaturityTop>
                  <MaturityValRow>
                    <MaturityVal>{formatYield(spec.value)}</MaturityVal>
                    {spec.deltaBp != null && Math.abs(spec.deltaBp) > 1e-4 && (
                      <MaturityDelta $up={spec.deltaBp > 0}>
                        {formatBasisPoints(spec.deltaBp)}
                      </MaturityDelta>
                    )}
                  </MaturityValRow>
                </MaturityCell>
              ))}
            </MaturityStrip>
          )}

          <ToolbarRow>
            {model.years.length > 1 ? (
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
            ) : (
              <span />
            )}

            <ViewSwitch role="tablist" aria-label="국채 금리 보기 방식">
              <ViewSwitchBtn
                type="button"
                role="tab"
                aria-selected={viewMode === 'chart'}
                $active={viewMode === 'chart'}
                onClick={() => setViewMode('chart')}
              >
                곡선·추이 차트
              </ViewSwitchBtn>
              <ViewSwitchBtn
                type="button"
                role="tab"
                aria-selected={viewMode === 'ledger'}
                $active={viewMode === 'ledger'}
                onClick={() => setViewMode('ledger')}
              >
                만기·연도 원장
              </ViewSwitchBtn>
            </ViewSwitch>
          </ToolbarRow>

          {viewMode === 'chart' ? (
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
          ) : (
            <LedgerContainer>
              <LedgerGrid>
                {(stats?.maturitySpecs ?? []).map((spec) => (
                  <LedgerItem
                    key={spec.maturity}
                    $highlight={spec.isBenchmark}
                  >
                    <LedgerHeader>
                      <MaturityTop>
                        <LedgerTitle>{spec.label}물 국채</LedgerTitle>
                        {spec.isBenchmark && (
                          <BenchmarkBadge>기준물</BenchmarkBadge>
                        )}
                      </MaturityTop>
                      <LedgerMeta>{curveYear}년 기준</LedgerMeta>
                    </LedgerHeader>
                    <LedgerSummaryRow>
                      <LedgerPrimaryVal>
                        {formatYield(spec.value)}
                      </LedgerPrimaryVal>
                      {spec.deltaBp != null && stats?.priorYear != null && (
                        <MaturityDelta $up={spec.deltaBp > 0}>
                          {stats.priorYear}년 대비{' '}
                          {formatBasisPoints(spec.deltaBp)}
                        </MaturityDelta>
                      )}
                      {spec.spreadVsBenchmark != null && (
                        <LedgerSpreadSpan>
                          {benchmarkLabel}물 대비{' '}
                          {formatBasisPoints(spec.spreadVsBenchmark)}
                        </LedgerSpreadSpan>
                      )}
                    </LedgerSummaryRow>
                    {spec.recentHistory.length > 0 && (
                      <LedgerYearsRow>
                        {spec.recentHistory.map((pt) => (
                          <LedgerYearCell key={pt.year}>
                            <LedgerYearKey>{pt.year}년</LedgerYearKey>
                            <LedgerYearVal>
                              {formatYield(pt.value)}
                            </LedgerYearVal>
                          </LedgerYearCell>
                        ))}
                      </LedgerYearsRow>
                    )}
                  </LedgerItem>
                ))}
              </LedgerGrid>
            </LedgerContainer>
          )}
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


const HeadlineStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid ${({ theme }) => theme.colors.border.medium};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  margin-bottom: 10px;

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const HeadlineCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 12px 14px;
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};

  &:first-child {
    padding-left: 2px;
  }

  &:last-child {
    border-right: none;
    padding-right: 2px;
  }

  @media (max-width: 960px) {
    &:nth-child(2n) {
      border-right: none;
    }

    &:nth-child(-n + 2) {
      border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
    }
  }

  @media (max-width: 560px) {
    padding: 9px 4px;
    border-right: none;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

    &:last-child {
      border-bottom: none;
    }
  }
`

const HeadlineLabel = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeadlineValue = styled.strong`
  font-size: 20px;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const HeadlineStatValue = styled.span<{ $tone: 'up' | 'down' | 'flat' }>`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: ${({ $tone, theme }) => {
    if ($tone === 'flat') return theme.colors.text.primary
    const isDark = theme.mode === 'dark'
    if ($tone === 'up') return isDark ? '#fca5a5' : '#dc2626'
    return isDark ? '#7dd3fc' : '#0284c7'
  }};
`

const HeadlineSubNote = styled.span`
  font-size: 11px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

const CurveShapeTag = styled.span<{ $normal?: boolean }>`
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme, $normal }) =>
    $normal
      ? theme.mode === 'dark'
        ? '#34d399'
        : '#047857'
      : theme.colors.text.secondary};
  background: ${({ theme, $normal }) =>
    $normal
      ? theme.mode === 'dark'
        ? 'rgba(16,185,129,0.14)'
        : 'rgba(16,185,129,0.09)'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(15,23,42,0.05)'};
`

const MaturityStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(112px, 1fr));
  padding: 8px 0 10px;
  margin-bottom: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const MaturityCell = styled.div<{ $highlight?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 2px 12px;
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};

  &:first-child {
    padding-left: 2px;
  }

  &:last-child {
    border-right: none;
    padding-right: 2px;
  }
`

const MaturityTop = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
`

const MaturityLabel = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const BenchmarkBadge = styled.span`
  padding: 0 4px;
  border-radius: 3px;
  font-size: 9.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.activeLight};
`

const MaturityValRow = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px;
`

const MaturityVal = styled.strong`
  font-size: 14.5px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const MaturityDelta = styled.span<{ $up: boolean }>`
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $up }) =>
    $up
      ? theme.mode === 'dark'
        ? '#fca5a5'
        : '#dc2626'
      : theme.mode === 'dark'
        ? '#7dd3fc'
        : '#0284c7'};
`

const ToolbarRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  margin-bottom: 14px;
`

const YearChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
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

const ViewSwitch = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
`

const ViewSwitchBtn = styled.button<{ $active: boolean }>`
  appearance: none;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border.light};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const LedgerContainer = styled.div`
  container-type: inline-size;
`

const LedgerGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  border-top: 1px solid ${({ theme }) => theme.colors.border.medium};

  @container (min-width: 720px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const LedgerItem = styled.div<{ $highlight?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding: 14px 4px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme, $highlight }) =>
    $highlight ? theme.colors.activeLight : 'transparent'};

  @container (min-width: 720px) {
    &:nth-child(odd) {
      border-right: 1px solid ${({ theme }) => theme.colors.border.light};
      padding-right: 18px;
    }
    &:nth-child(even) {
      padding-left: 18px;
    }
  }
`

const LedgerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const LedgerTitle = styled.span`
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const LedgerMeta = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LedgerSummaryRow = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px 12px;
`

const LedgerPrimaryVal = styled.strong`
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const LedgerSpreadSpan = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LedgerYearsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(76px, 1fr));
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  padding-top: 8px;
  gap: 6px 10px;
`

const LedgerYearCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  padding-right: 8px;
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};

  &:last-child {
    border-right: none;
    padding-right: 0;
  }
`

const LedgerYearKey = styled.span`
  font-size: 10.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LedgerYearVal = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`
