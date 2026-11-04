import { useEffect, useMemo, useState } from 'react'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import styled, { useTheme } from 'styled-components'

import { useDemographicIndicators } from '@/entities/country/api.indicators'
import {
  AGE_BRACKETS,
  edgeShares,
  pyramidTotals,
  toPyramidRows,
  type PyramidRow,
} from '@/entities/country/model/population-pyramid'
import type { DemographicIndicator } from '@/shared/api/country-indicators'

import { CountryDataManagerModal } from '../country-data-manager/country-data-manager-modal'
import { ChartEmpty } from './chart-empty'
import { ChartSkeleton } from './chart-skeleton'
import { SectionHelpPopover } from './section-help-popover'
import { IconUsers } from '../country-detail-dashboard.icons'
import * as S from '../country-detail-dashboard.styles'

import {
  barGeometry,
  barPath,
  markPath,
  niceAxis,
  symmetricTicks,
} from './population-pyramid-geometry'
import { PopulationYearScrubber } from './population-year-scrubber'

interface Props {
  countryId: string
  countryName: string
  /** 경제·통계 상세 탭으로 이동하는 콜백 */
  onOpenDetailTab?: () => void
  /** 상세 탭 내부에 임베드된 경우 */
  embeddedInTab?: boolean
}

/**
 * 남·여 두 색. 밝은 면/어두운 면에 각각 맞춘 단계를 쓴다 — 한 벌을 양쪽에 그대로
 * 쓰면 다크에서 형광처럼 뜨거나 라이트에서 배경에 잠긴다.
 *
 * 두 색 모두 색각 이상 분리(ΔE 13.4/15.9)와 배경 대비 3:1을 통과한 값이다.
 * 눈대중으로 바꾸지 말 것 — 바꾸려면 팔레트 검증을 다시 돌린다.
 */
const SEX_COLORS = {
  light: { male: '#2a78d6', female: '#d55181' },
  dark: { male: '#3987e5', female: '#d55181' },
} as const

/** 중앙 축에서 막대를 물러세우는 폭. 두 색 면이 맞닿지 않게 흰 틈이 가른다. */
const CENTER_GAP = 2
const BAR_THICKNESS = 20
const ROW_HEIGHT = 34

/** 축 라벨('80+')을 문장용 라벨('80세 이상')로 되돌린다 */
const bracketFormLabel = (label: string) =>
  AGE_BRACKETS.find((bracket) => bracket.label === label)?.formLabel ??
  `${label}세`

const compact = (value: number) => {
  const abs = Math.abs(value)
  if (abs === 0) return '0'
  if (abs >= 100_000_000) {
    const eok = abs / 100_000_000
    return `${eok >= 10 ? Math.round(eok).toLocaleString() : eok.toFixed(1)}억`
  }
  if (abs >= 10_000) return `${Math.round(abs / 10_000).toLocaleString()}만`
  return abs.toLocaleString()
}

const percent = (value: number) => `${value.toFixed(1)}%`

interface ChartRow extends PyramidRow {
  /** 겹쳐 그릴 기준 연도의 같은 연령대 값 (없으면 0) */
  compareMale: number
  compareFemale: number
}

interface BarShapeArgs {
  x?: number
  y?: number
  width?: number
  height?: number
  payload?: ChartRow
}

interface PyramidBarProps extends BarShapeArgs {
  side: 'male' | 'female'
  fill: string
  ghostInk: string | null
  ghostHalo: string
}

/**
 * 한 칸의 막대 + (켰다면) 기준 연도 윤곽.
 *
 * 윤곽은 리차트가 준 픽셀 폭에서 축척을 되짚어 그린다(값 1당 몇 px인가). 현재 값이
 * 0인 칸은 축척을 못 구해 윤곽을 건너뛴다 — 그 칸엔 애초에 막대도 없다.
 */
function PyramidBar({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  payload,
  side,
  fill,
  ghostInk,
  ghostHalo,
}: PyramidBarProps) {
  const { zero, valueEnd, direction, span } = barGeometry(x, width, side)
  const start = zero + direction * CENTER_GAP

  const value = side === 'male' ? (payload?.male ?? 0) : (payload?.female ?? 0)
  const compare =
    side === 'male' ? (payload?.compareMale ?? 0) : (payload?.compareFemale ?? 0)
  const pixelsPerPerson = value > 0 ? span / value : 0
  const ghostEnd =
    ghostInk && compare > 0 && pixelsPerPerson > 0
      ? start + direction * compare * pixelsPerPerson
      : null

  return (
    <g>
      {Math.abs(valueEnd - start) >= 1 && (
        <path d={barPath(start, valueEnd, y, height, 4)} fill={fill} />
      )}
      {ghostEnd != null && (
        <>
          {/* 눈금은 막대 안에 떨어지기도, 밖에 떨어지기도 한다 — 채움색 위에서도
              읽히도록 바탕색 테를 먼저 깐다(선을 두 번 그리는 그 방법). */}
          <path
            d={markPath(ghostEnd, -direction, y - 3, height + 6)}
            fill="none"
            stroke={ghostHalo}
            strokeWidth={4}
            strokeLinejoin="round"
          />
          <path
            d={markPath(ghostEnd, -direction, y - 3, height + 6)}
            fill="none"
            stroke={ghostInk as string}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </>
      )}
    </g>
  )
}

/**
 * 인구 피라미드 — 한 해의 연령대 × 성별 인구를 좌(남)·우(여)로 펼친다.
 *
 * 연도는 위쪽 추이선에서 고른다([[PopulationYearScrubber]]). 한 해만 봐서는 "이 나라가
 * 늙고 있나"를 알 수 없으므로 **기준 연도(가장 이른 해)의 윤곽을 겹쳐** 둔다 — 아래가
 * 홀쭉해지고 위가 두꺼워지는 변화가 클릭 없이 한눈에 읽힌다.
 */
export function PopulationPyramidSection({
  countryId,
  countryName,
  onOpenDetailTab,
  embeddedInTab = false,
}: Props) {
  const [managerOpen, setManagerOpen] = useState(false)
  const theme = useTheme()
  const isDark = theme.mode === 'dark'
  const colors = isDark ? SEX_COLORS.dark : SEX_COLORS.light
  const query = useDemographicIndicators(countryId)

  /** 피라미드 값이 실제로 있는 해만. 오래된 → 최신 (증가를 왼쪽에서 오른쪽으로 읽는다) */
  const years = useMemo(() => {
    const list = (query.data ?? []) as DemographicIndicator[]
    return list
      .map((indicator) => ({
        year: indicator.year,
        rows: toPyramidRows(indicator),
      }))
      .filter((entry) => entry.rows.length > 0)
      .map((entry) => ({ ...entry, totals: pyramidTotals(entry.rows) }))
      .sort((left, right) => left.year - right.year)
  }, [query.data])

  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [ghostOn, setGhostOn] = useState(true)
  const [viewMode, setViewMode] = useState<'chart' | 'ledger'>('chart')

  // 기본은 가장 최근 해. 국가를 바꿔 목록이 갈리면 선택도 따라 옮긴다.
  useEffect(() => {
    if (years.length === 0) {
      setSelectedYear(null)
      return
    }
    setSelectedYear((prev) =>
      prev != null && years.some((entry) => entry.year === prev)
        ? prev
        : years[years.length - 1].year,
    )
  }, [years])

  const current = years.find((entry) => entry.year === selectedYear) ?? null
  const previous = useMemo(() => {
    if (!current) return null
    const index = years.findIndex((entry) => entry.year === current.year)
    return index > 0 ? years[index - 1] : null
  }, [years, current])

  /** 겹쳐 볼 기준은 가장 이른 해 — 바로 앞 해와의 차이는 0.3%라 형태로 보이지 않는다. */
  const baseline = years[0] ?? null
  const ghostYear =
    ghostOn && baseline && current && baseline.year !== current.year
      ? baseline
      : null

  // 축은 전 연도 공통 최대치로 고정한다 — 해마다 축이 늘었다 줄면 모양 변화가
  // 실제 증감인지 축 눈금 탓인지 구분되지 않는다.
  const axis = useMemo(() => {
    let max = 0
    for (const entry of years) {
      for (const row of entry.rows) {
        max = Math.max(max, row.male, row.female)
      }
    }
    return niceAxis(max)
  }, [years])

  const axisTicks = useMemo(() => symmetricTicks(axis), [axis])

  // 고령이 위로 오도록 뒤집는다 (모델은 어린 연령부터 나열).
  const chartRows = useMemo<ChartRow[]>(() => {
    if (!current) return []
    const compareOf = (bracket: string) =>
      ghostYear?.rows.find((row) => row.bracket === bracket) ?? null
    return [...current.rows].reverse().map((row) => ({
      ...row,
      compareMale: compareOf(row.bracket)?.male ?? 0,
      compareFemale: compareOf(row.bracket)?.female ?? 0,
    }))
  }, [current, ghostYear])

  const shares = useMemo(
    () => (current ? edgeShares(current.rows) : null),
    [current],
  )

  const workingShare = useMemo(() => {
    if (!shares) return null
    return Math.max(0, 100 - shares.young - shares.old)
  }, [shares])

  const peakBracket = useMemo(() => {
    if (!current || current.rows.length === 0 || current.totals.total <= 0) {
      return null
    }
    const best = current.rows.reduce((acc, row) =>
      row.total > acc.total ? row : acc,
    )
    return {
      label: bracketFormLabel(best.bracket),
      share: (best.total / current.totals.total) * 100,
    }
  }, [current])

  const manager = (
    <CountryDataManagerModal
      countryId={countryId}
      countryName={countryName}
      open={managerOpen}
      onClose={() => setManagerOpen(false)}
      initialTab="pyramid"
    />
  )

  /*
   * 로딩 중에도 섹션은 선다. null을 돌려주던 시절엔 자료가 오는 순간 피라미드가 통째로
   * 끼어들며 아래 지면을 400px 밀어냈고, 그 사이 목차에서도 이 장이 빠져 있었다.
   */
  if (query.isLoading) {
    return (
      <S.Section>
        <Title onRegister={null} onOpenDetailTab={onOpenDetailTab} />
        <ChartSkeleton variant="pyramid" />
      </S.Section>
    )
  }
  if (years.length === 0) {
    if (embeddedInTab) {
      return null
    }
    /*
     * 자료가 없어도 **피라미드 골격**은 그대로 둔다. 연령대 라벨은 카탈로그라 이미
     * 아는 값이고, 축 눈금 숫자는 지어낼 수 없으니 눈금선만 남긴다.
     */
    return (
      <S.Section>
        <Title onRegister={null} onOpenDetailTab={onOpenDetailTab} />
        <ChartEmpty
          text="연도별 남·여 인구를 연령대로 넣으면 여기에 피라미드가 그려집니다."
          hint="2개 연도 이상 등록하면 가장 이른 기준 연도의 윤곽선이 함께 겹쳐져 고령화 추이를 비교합니다"
          actionLabel="연령·성별 인구 등록"
          onAction={() => setManagerOpen(true)}
        />
        {manager}
      </S.Section>
    )
  }

  const growth =
    current && previous ? current.totals.total - previous.totals.total : null
  const ghostInk = ghostYear
    ? isDark
      ? 'rgba(255,255,255,0.62)'
      : 'rgba(15,23,42,0.55)'
    : null
  const ghostHalo = isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.9)'

  const maleShare =
    current && current.totals.total > 0
      ? (current.totals.male / current.totals.total) * 100
      : 0
  const femaleShare =
    current && current.totals.total > 0
      ? (current.totals.female / current.totals.total) * 100
      : 0
  const sexRatioText =
    current && current.totals.female > 0
      ? ((current.totals.male / current.totals.female) * 100).toFixed(1)
      : '—'
  const agingIndexText =
    shares && shares.young > 0
      ? ((shares.old / shares.young) * 100).toFixed(1)
      : null

  return (
    <S.Section $wide>
      <Title
        yearCount={years.length}
        activeYear={current?.year ?? null}
        onRegister={embeddedInTab ? null : () => setManagerOpen(true)}
        onOpenDetailTab={onOpenDetailTab}
      />
      {manager}

      {years.length > 1 && (
        <PopulationYearScrubber
          points={years.map((entry) => ({
            year: entry.year,
            total: entry.totals.total,
          }))}
          selected={selectedYear}
          onSelect={setSelectedYear}
        />
      )}

      {current && (
        <>
          <HeadlineStrip aria-label={`${current.year}년 인구 피라미드 핵심 요약`}>
            <HeadlineCell>
              <HeadlineLabel>{current.year}년 총인구</HeadlineLabel>
              <HeadlineValue>
                {current.totals.total.toLocaleString()}
                <HeadlineUnit>명</HeadlineUnit>
              </HeadlineValue>
              {growth != null && previous ? (
                <HeadlineDelta $tone={growth >= 0 ? 'up' : 'down'}>
                  {previous.year}년 대비 {growth >= 0 ? '+' : '−'}
                  {Math.abs(growth).toLocaleString()}명
                </HeadlineDelta>
              ) : (
                <HeadlineSubNote>
                  {years.length > 1
                    ? `${years[0].year}–${years[years.length - 1].year}년 (${years.length}개년 관측)`
                    : `${current.year}년 단일 관측 기록`}
                </HeadlineSubNote>
              )}
            </HeadlineCell>

            <HeadlineCell>
              <HeadlineLabel>남녀 구성 · 성비 (여 100당 남)</HeadlineLabel>
              <HeadlineValue>
                성비 {sexRatioText}
              </HeadlineValue>
              <HeadlineSubNote>
                <DotInline $color={colors.male} />남{' '}
                {compact(current.totals.male)} ({percent(maleShare)}) ·{' '}
                <DotInline $color={colors.female} />여{' '}
                {compact(current.totals.female)} ({percent(femaleShare)})
              </HeadlineSubNote>
            </HeadlineCell>

            <HeadlineCell>
              <HeadlineLabel>연령 3구간 비중 (핵심 생산연령)</HeadlineLabel>
              <HeadlineValue>
                20–59세 {workingShare != null ? percent(workingShare) : '—'}
              </HeadlineValue>
              <HeadlineSubNote>
                {shares
                  ? `${shares.youngLabel} ${percent(shares.young)} · ${shares.oldLabel} ${percent(shares.old)}`
                  : '연령 구간 미집계'}
              </HeadlineSubNote>
            </HeadlineCell>

            <HeadlineCell>
              <HeadlineLabel>고령화 · 최다 연령층</HeadlineLabel>
              <HeadlineValue>
                {agingIndexText != null
                  ? `노령화지수 ${agingIndexText}`
                  : shares
                    ? `${shares.oldLabel} ${percent(shares.old)}`
                    : '—'}
              </HeadlineValue>
              <HeadlineSubNote>
                {peakBracket
                  ? `최다 연령층: ${peakBracket.label} (${percent(peakBracket.share)})`
                  : '연령대 데이터 없음'}
              </HeadlineSubNote>
            </HeadlineCell>
          </HeadlineStrip>

          {shares && workingShare != null && (
            <AgeStructureBar aria-label="연령대별 인구 비중 구성">
              <AgeStructureTrack>
                <AgeSegment
                  $tone="young"
                  style={{ width: `${shares.young}%` }}
                  title={`${shares.youngLabel}: ${percent(shares.young)}`}
                />
                <AgeSegment
                  $tone="working"
                  style={{ width: `${workingShare}%` }}
                  title={`20–59세: ${percent(workingShare)}`}
                />
                <AgeSegment
                  $tone="old"
                  style={{ width: `${shares.old}%` }}
                  title={`${shares.oldLabel}: ${percent(shares.old)}`}
                />
              </AgeStructureTrack>
              <AgeStructureLegend>
                <AgeLegendItem $tone="young">
                  {shares.youngLabel} {percent(shares.young)}
                </AgeLegendItem>
                <AgeLegendItem $tone="working">
                  20–59세 {percent(workingShare)}
                </AgeLegendItem>
                <AgeLegendItem $tone="old">
                  {shares.oldLabel} {percent(shares.old)}
                </AgeLegendItem>
              </AgeStructureLegend>
            </AgeStructureBar>
          )}

          <ChartToolbar>
            {baseline && baseline.year !== current.year && viewMode === 'chart' ? (
              <GhostToggle
                type="button"
                aria-pressed={ghostOn}
                $on={ghostOn}
                onClick={() => setGhostOn((prev) => !prev)}
              >
                <GhostSwatch aria-hidden="true" />
                {baseline.year}년 윤곽 겹치기
              </GhostToggle>
            ) : (
              <span />
            )}

            <ViewSwitch role="tablist" aria-label="인구 피라미드 보기 방식">
              <ViewSwitchBtn
                type="button"
                role="tab"
                aria-selected={viewMode === 'chart'}
                $active={viewMode === 'chart'}
                onClick={() => setViewMode('chart')}
              >
                피라미드 차트
              </ViewSwitchBtn>
              <ViewSwitchBtn
                type="button"
                role="tab"
                aria-selected={viewMode === 'ledger'}
                $active={viewMode === 'ledger'}
                onClick={() => setViewMode('ledger')}
              >
                연령대 원장
              </ViewSwitchBtn>
            </ViewSwitch>
          </ChartToolbar>

          {viewMode === 'chart' ? (
            <ChartBox>
              <ResponsiveContainer
                width="100%"
                height={chartRows.length * ROW_HEIGHT + 44}
              >
                <BarChart
                  data={chartRows}
                  layout="vertical"
                  stackOffset="sign"
                  margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
                >
                  <CartesianGrid
                    horizontal={false}
                    stroke={isDark ? 'rgba(255,255,255,0.07)' : '#eef1f5'}
                  />
                  <XAxis
                    type="number"
                    domain={[-axis.max, axis.max]}
                    ticks={axisTicks}
                    tickFormatter={(value: number) =>
                      value === 0 ? '0' : compact(value)
                    }
                    tick={{ fontSize: 12, fill: theme.colors.text.secondary }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="bracket"
                    width={54}
                    tick={{ fontSize: 12.5, fill: theme.colors.text.primary }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ReferenceLine
                    x={0}
                    stroke={isDark ? 'rgba(255,255,255,0.22)' : '#cbd5e1'}
                  />
                  <Tooltip
                    cursor={{
                      fill: isDark
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(0,0,0,0.03)',
                    }}
                    content={(props) => (
                      <PyramidTooltip
                        active={props.active}
                        row={
                          (props.payload?.[0]?.payload as
                            | ChartRow
                            | undefined) ?? null
                        }
                        total={current.totals.total}
                        year={current.year}
                        ghostYear={ghostYear?.year ?? null}
                        colors={colors}
                      />
                    )}
                  />
                  {/* 남성은 축 왼쪽 — 음수로 그리고 라벨만 절댓값으로 되돌린다 */}
                  <Bar
                    dataKey="maleSigned"
                    name="남성"
                    stackId="pyramid"
                    barSize={BAR_THICKNESS}
                    isAnimationActive={false}
                    activeBar={false}
                    shape={(shapeProps: unknown) => (
                      <PyramidBar
                        {...(shapeProps as BarShapeArgs)}
                        side="male"
                        fill={colors.male}
                        ghostInk={ghostInk}
                        ghostHalo={ghostHalo}
                      />
                    )}
                  />
                  <Bar
                    dataKey="female"
                    name="여성"
                    stackId="pyramid"
                    barSize={BAR_THICKNESS}
                    isAnimationActive={false}
                    activeBar={false}
                    shape={(shapeProps: unknown) => (
                      <PyramidBar
                        {...(shapeProps as BarShapeArgs)}
                        side="female"
                        fill={colors.female}
                        ghostInk={ghostInk}
                        ghostHalo={ghostHalo}
                      />
                    )}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
          ) : (
            <LedgerContainer>
              <LedgerGrid>
                {current.rows.map((row) => {
                  const rowShare =
                    current.totals.total > 0
                      ? (row.total / current.totals.total) * 100
                      : 0
                  const baseRow =
                    baseline && baseline.year !== current.year
                      ? baseline.rows.find(
                          (baseItem) => baseItem.bracket === row.bracket,
                        )
                      : null
                  const deltaVsBase =
                    baseRow != null ? row.total - baseRow.total : null
                  const rowSexRatio =
                    row.female > 0
                      ? ((row.male / row.female) * 100).toFixed(1)
                      : '—'
                  return (
                    <LedgerItem key={row.bracket}>
                      <LedgerHeader>
                        <LedgerTitle>
                          {bracketFormLabel(row.bracket)}
                        </LedgerTitle>
                        <LedgerShareBadge>{percent(rowShare)}</LedgerShareBadge>
                      </LedgerHeader>
                      <LedgerSummaryRow>
                        <LedgerPrimaryVal>
                          {row.total.toLocaleString()}명
                        </LedgerPrimaryVal>
                        {deltaVsBase != null && baseline && (
                          <HeadlineDelta $tone={deltaVsBase >= 0 ? 'up' : 'down'}>
                            {baseline.year}년 대비{' '}
                            {deltaVsBase >= 0 ? '+' : '−'}
                            {Math.abs(deltaVsBase).toLocaleString()}명
                          </HeadlineDelta>
                        )}
                      </LedgerSummaryRow>
                      <LedgerSexRow>
                        <LedgerSexItem>
                          <DotInline $color={colors.male} />남{' '}
                          {row.male.toLocaleString()}명
                        </LedgerSexItem>
                        <LedgerSexItem>
                          <DotInline $color={colors.female} />여{' '}
                          {row.female.toLocaleString()}명
                        </LedgerSexItem>
                        <LedgerSexRatio>성비 {rowSexRatio}</LedgerSexRatio>
                      </LedgerSexRow>
                    </LedgerItem>
                  )
                })}
              </LedgerGrid>
            </LedgerContainer>
          )}
        </>
      )}
    </S.Section>
  )
}

interface TooltipProps {
  active?: boolean
  row: ChartRow | null
  total: number
  year: number
  ghostYear: number | null
  colors: { male: string; female: string }
}

/** 칸 하나의 남·여 인원과 전체 대비 비중. 겹쳐 보기가 켜져 있으면 기준 연도도 같이. */
function PyramidTooltip({
  active,
  row,
  total,
  year,
  ghostYear,
  colors,
}: TooltipProps) {
  if (!active || !row) return null
  const share = (value: number) =>
    total > 0 ? ` · ${((value / total) * 100).toFixed(1)}%` : ''
  return (
    <TooltipCard>
      <TooltipTitle>
        {bracketFormLabel(row.bracket)}
        <TooltipYear>{year}년</TooltipYear>
      </TooltipTitle>
      <TooltipLine>
        <TooltipDot style={{ background: colors.male }} />
        남성 {row.male.toLocaleString()}
        <TooltipMuted>{share(row.male)}</TooltipMuted>
      </TooltipLine>
      <TooltipLine>
        <TooltipDot style={{ background: colors.female }} />
        여성 {row.female.toLocaleString()}
        <TooltipMuted>{share(row.female)}</TooltipMuted>
      </TooltipLine>
      {ghostYear != null && (
        <TooltipCompare>
          {ghostYear}년 · 남 {row.compareMale.toLocaleString()} · 여{' '}
          {row.compareFemale.toLocaleString()}
        </TooltipCompare>
      )}
    </TooltipCard>
  )
}

function Title({
  yearCount,
  activeYear,
  onRegister,
  onOpenDetailTab,
}: {
  yearCount?: number
  activeYear?: number | null
  /** null이면 버튼을 내지 않는다 — 빈 자리 CTA와 라벨이 글자까지 같아 두 번 나온다 */
  onRegister: (() => void) | null
  onOpenDetailTab?: () => void
}) {
  return (
    <S.SectionTitleRow>
      <S.SectionTitleIcon>
        <IconUsers />
      </S.SectionTitleIcon>
      <S.SectionTitleText>인구 피라미드</S.SectionTitleText>
      <SectionHelpPopover sectionKey="pyramid" />
      {yearCount != null && yearCount > 0 && (
        <S.SectionCountChip>
          {yearCount}개 연도{activeYear ? ` · ${activeYear}년 기준` : ''}
        </S.SectionCountChip>
      )}
      {/* 이 자리에 버튼이 없으면 등록 진입점이 '지표 추이'의 작은 버튼 하나뿐이다 */}
      {onRegister && (
        <S.SectionAction type="button" onClick={onRegister}>
          연령·성별 인구 등록
        </S.SectionAction>
      )}
      {onOpenDetailTab && (
        <S.SectionLink type="button" onClick={onOpenDetailTab}>
          상세·원장 보기
        </S.SectionLink>
      )}
    </S.SectionTitleRow>
  )
}

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
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeadlineValue = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const HeadlineUnit = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeadlineDelta = styled.span<{ $tone: 'up' | 'down' }>`
  font-size: 11.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ $tone, theme }) =>
    $tone === 'up'
      ? theme.mode === 'dark'
        ? '#4ade80'
        : '#15803d'
      : theme.mode === 'dark'
        ? '#f87171'
        : '#b91c1c'};
`

const HeadlineSubNote = styled.span`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 11.5px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const DotInline = styled.span<{ $color: string }>`
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const AgeStructureBar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
`

const AgeStructureTrack = styled.div`
  display: flex;
  width: 100%;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  gap: 2px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'};
`

const AGE_SEGMENT_COLOR = {
  young: { light: '#38bdf8', dark: '#38bdf8' },
  working: { light: '#6366f1', dark: '#818cf8' },
  old: { light: '#f59e0b', dark: '#fbbf24' },
} as const

const AgeSegment = styled.span<{ $tone: 'young' | 'working' | 'old' }>`
  height: 100%;
  background: ${({ theme, $tone }) =>
    AGE_SEGMENT_COLOR[$tone][theme.mode === 'dark' ? 'dark' : 'light']};
`

const AgeStructureLegend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
`

const AgeLegendItem = styled.span<{ $tone: 'young' | 'working' | 'old' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 2px;
    background: ${({ theme, $tone }) =>
      AGE_SEGMENT_COLOR[$tone][theme.mode === 'dark' ? 'dark' : 'light']};
  }
`

const ChartToolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  margin-bottom: 6px;
`

const GhostToggle = styled.button<{ $on: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ $on, theme }) =>
    $on ? theme.colors.background.tertiary : 'transparent'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

/* 토글 안의 견본은 차트 위 윤곽과 같은 모양 — 무엇이 켜지는지 말이 아니라 그림으로 */
const GhostSwatch = styled.span`
  width: 6px;
  height: 12px;
  border: 1.5px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.62)' : 'rgba(15,23,42,0.55)'};
  border-left: none;
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

  @container (min-width: 680px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const LedgerItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
  padding: 11px 4px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  @container (min-width: 680px) {
    &:nth-child(odd) {
      border-right: 1px solid ${({ theme }) => theme.colors.border.light};
      padding-right: 18px;
    }
    &:nth-child(even) {
      padding-left: 18px;
    }
    &:last-child:nth-child(odd) {
      grid-column: 1 / -1;
      border-right: none;
      padding-right: 4px;
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
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const LedgerShareBadge = styled.span`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'};
`

const LedgerSummaryRow = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px 10px;
`

const LedgerPrimaryVal = styled.strong`
  font-size: 15.5px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const LedgerSexRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const LedgerSexItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 500;
`

const LedgerSexRatio = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ChartBox = styled.div`
  width: 100%;
`

const TooltipCard = styled.div`
  min-width: 168px;
  padding: 9px 11px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(24,24,27,0.97)' : 'rgba(255,255,255,0.98)'};
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.12);
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const TooltipTitle = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
  font-size: 12.5px;
  font-weight: 700;
`

const TooltipYear = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const TooltipLine = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-variant-numeric: tabular-nums;
  line-height: 1.7;
`

const TooltipDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
`

const TooltipMuted = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
`

const TooltipCompare = styled.div`
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`
