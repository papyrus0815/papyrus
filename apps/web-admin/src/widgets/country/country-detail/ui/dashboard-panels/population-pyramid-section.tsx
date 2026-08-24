import { useEffect, useMemo, useState } from 'react'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  pyramidTotals,
  toPyramidRows,
} from '@/entities/country/model/population-pyramid'
import type { DemographicIndicator } from '@/shared/api/country-indicators'

import { CountryDataManagerModal } from '../country-data-manager/country-data-manager-modal'
import { IconChart } from '../country-detail-dashboard.icons'
import * as S from '../country-detail-dashboard.styles'

interface Props {
  countryId: string
  countryName: string
}

const MALE = '#3b82f6'
const FEMALE = '#ec4899'

/** 축 라벨('80+')을 문장용 라벨('80세 이상')로 되돌린다 */
const bracketFormLabel = (label: string) =>
  AGE_BRACKETS.find((bracket) => bracket.label === label)?.formLabel ??
  `${label}세`

const compact = (value: number) => {
  const abs = Math.abs(value)
  if (abs >= 100_000_000) return `${(abs / 100_000_000).toFixed(1)}억`
  if (abs >= 10_000) return `${(abs / 10_000).toFixed(abs >= 1_000_000 ? 0 : 1)}만`
  return abs.toLocaleString()
}

/**
 * 인구 피라미드 — 한 해의 연령대 × 성별 인구를 좌(남)·우(여)로 펼친다.
 *
 * "연도별로 어떻게 증가했는지"는 연도 막대띠로 본다. 띠는 각 해의 총계를 높이로
 * 보여주면서 동시에 연도 선택기다 — 눌러 가며 피라미드 모양이 어떻게 변했는지 따라간다.
 * 값이 있는 해만 띠에 오른다(빈 해를 눌러 빈 차트를 보게 되는 일이 없도록).
 */
export function PopulationPyramidSection({ countryId, countryName }: Props) {
  const [managerOpen, setManagerOpen] = useState(false)
  const theme = useTheme()
  const isDark = theme.mode === 'dark'
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

  // 축은 전 연도 공통 최대치로 고정한다 — 해마다 축이 늘었다 줄면 모양 변화가
  // 실제 증감인지 축 눈금 탓인지 구분되지 않는다.
  const axisMax = useMemo(() => {
    let max = 0
    for (const entry of years) {
      for (const row of entry.rows) {
        max = Math.max(max, row.male, row.female)
      }
    }
    if (max === 0) return 1
    // 눈금이 딱 떨어지도록 위로 올림 (예: 4,300,000 → 5,000,000)
    const step = Math.pow(10, Math.floor(Math.log10(max)))
    return Math.ceil(max / step) * step
  }, [years])

  /** 0을 반드시 지나는 대칭 눈금. 자동 눈금은 0을 건너뛴 계열을 고른다. */
  const axisTicks = useMemo(
    () => [-axisMax, -axisMax / 2, 0, axisMax / 2, axisMax],
    [axisMax],
  )

  const maxYearTotal = useMemo(
    () => years.reduce((max, entry) => Math.max(max, entry.totals.total), 0) || 1,
    [years],
  )

  // 고령이 위로 오도록 뒤집는다 (모델은 어린 연령부터 나열).
  const chartRows = useMemo(
    () => (current ? [...current.rows].reverse() : []),
    [current],
  )

  const manager = (
    <CountryDataManagerModal
      countryId={countryId}
      countryName={countryName}
      open={managerOpen}
      onClose={() => setManagerOpen(false)}
      initialTab="pyramid"
    />
  )

  if (query.isLoading) return null
  if (years.length === 0) {
    return (
      <S.Section>
        <Title onRegister={() => setManagerOpen(true)} />
        <S.EmptyHint>
          등록된 연령대별 인구가 없습니다. 연도별 남·여 인구를 넣으면 여기에
          피라미드가 그려집니다.
        </S.EmptyHint>
        {manager}
      </S.Section>
    )
  }

  const growth =
    current && previous
      ? current.totals.total - previous.totals.total
      : null

  return (
    <S.Section>
      <Title onRegister={() => setManagerOpen(true)} />
      {manager}

      {years.length > 1 && (
        <YearStrip role="group" aria-label="연도 선택">
          {years.map((entry) => (
            <YearBar
              key={entry.year}
              type="button"
              $active={entry.year === selectedYear}
              aria-pressed={entry.year === selectedYear}
              title={`${entry.year}년 · ${entry.totals.total.toLocaleString()}명`}
              onClick={() => setSelectedYear(entry.year)}
            >
              <YearBarTrack>
                <YearBarFill
                  style={{
                    height: `${Math.max(6, (entry.totals.total / maxYearTotal) * 100)}%`,
                  }}
                />
              </YearBarTrack>
              <YearBarLabel>{entry.year}</YearBarLabel>
            </YearBar>
          ))}
        </YearStrip>
      )}

      {current && (
        <>
          <SummaryRow>
            <SummaryItem>
              <SummaryLabel>{current.year}년 합계</SummaryLabel>
              <SummaryValue>
                {current.totals.total.toLocaleString()}명
              </SummaryValue>
            </SummaryItem>
            <SummaryItem>
              <SummaryLabel $dot={MALE}>남성</SummaryLabel>
              <SummaryValue>{current.totals.male.toLocaleString()}</SummaryValue>
            </SummaryItem>
            <SummaryItem>
              <SummaryLabel $dot={FEMALE}>여성</SummaryLabel>
              <SummaryValue>
                {current.totals.female.toLocaleString()}
              </SummaryValue>
            </SummaryItem>
            <SummaryItem>
              <SummaryLabel>성비</SummaryLabel>
              <SummaryValue>
                {current.totals.female > 0
                  ? ((current.totals.male / current.totals.female) * 100).toFixed(1)
                  : '—'}
              </SummaryValue>
            </SummaryItem>
            {growth != null && previous && (
              <SummaryItem>
                <SummaryLabel>{previous.year}년 대비</SummaryLabel>
                <SummaryValue $tone={growth >= 0 ? 'up' : 'down'}>
                  {growth >= 0 ? '+' : '−'}
                  {Math.abs(growth).toLocaleString()}
                </SummaryValue>
              </SummaryItem>
            )}
          </SummaryRow>

          <ChartBox>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart
                data={chartRows}
                layout="vertical"
                stackOffset="sign"
                margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
                barCategoryGap="24%"
              >
                <CartesianGrid
                  horizontal={false}
                  stroke={isDark ? 'rgba(255,255,255,0.08)' : '#eef1f5'}
                />
                <XAxis
                  type="number"
                  domain={[-axisMax, axisMax]}
                  ticks={axisTicks}
                  tickFormatter={(value: number) =>
                    value === 0 ? '0' : compact(value)
                  }
                  tick={{ fontSize: 11, fill: theme.colors.text.tertiary }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="bracket"
                  width={52}
                  tick={{ fontSize: 11, fill: theme.colors.text.secondary }}
                  axisLine={false}
                  tickLine={false}
                />
                <ReferenceLine
                  x={0}
                  stroke={isDark ? 'rgba(255,255,255,0.22)' : '#cbd5e1'}
                />
                <Tooltip
                  cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                  contentStyle={{
                    background: isDark ? 'rgba(24,24,27,0.97)' : 'rgba(255,255,255,0.98)',
                    border: `1px solid ${theme.colors.border.default}`,
                    borderRadius: 12,
                    fontSize: 12,
                    color: theme.colors.text.primary,
                  }}
                  labelFormatter={(label: string) => bracketFormLabel(label)}
                  formatter={(value: number, name: string) => [
                    Math.abs(value).toLocaleString(),
                    name,
                  ]}
                />
                {/* 남성은 축 왼쪽 — 음수로 그리고 라벨만 절댓값으로 되돌린다 */}
                <Bar
                  dataKey="maleSigned"
                  name="남성"
                  stackId="pyramid"
                  barSize={22}
                  radius={[4, 0, 0, 4]}
                >
                  {chartRows.map((row) => (
                    <Cell key={`m-${row.bracket}`} fill={MALE} />
                  ))}
                </Bar>
                <Bar
                  dataKey="female"
                  name="여성"
                  stackId="pyramid"
                  barSize={22}
                  radius={[0, 4, 4, 0]}
                >
                  {chartRows.map((row) => (
                    <Cell key={`f-${row.bracket}`} fill={FEMALE} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>
        </>
      )}
    </S.Section>
  )
}

function Title({ onRegister }: { onRegister: () => void }) {
  return (
    <S.SectionTitleRow>
      <S.SectionTitleIcon $accent="sky">
        <IconChart />
      </S.SectionTitleIcon>
      <S.SectionTitleText>인구 피라미드</S.SectionTitleText>
      {/* 이 자리에 버튼이 없으면 등록 진입점이 '지표 추이'의 작은 버튼 하나뿐이다 */}
      <RegisterButton type="button" onClick={onRegister}>
        연령·성별 인구 등록
      </RegisterButton>
    </S.SectionTitleRow>
  )
}

const RegisterButton = styled.button`
  margin-left: auto;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(56, 130, 246, 0.35);
  background: rgba(56, 130, 246, 0.08);
  color: #2563eb;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: rgba(56, 130, 246, 0.16);
  }
`

const YearStrip = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
  margin-bottom: 16px;
`

const YearBar = styled.button<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  flex: 0 0 auto;
  width: 44px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  opacity: ${({ $active }) => ($active ? 1 : 0.5)};

  &:hover {
    opacity: 1;
  }
`

const YearBarTrack = styled.span`
  display: flex;
  align-items: flex-end;
  width: 100%;
  height: 56px;
`

const YearBarFill = styled.span`
  width: 100%;
  border-radius: 4px 4px 0 0;
  background: linear-gradient(180deg, ${FEMALE} 0%, ${MALE} 100%);
`

const YearBarLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SummaryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px 28px;
  margin-bottom: 14px;
`

const SummaryItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const SummaryLabel = styled.span<{ $dot?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};

  ${({ $dot }) =>
    $dot &&
    `&::before {
      content: '';
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${$dot};
    }`}
`

const SummaryValue = styled.span<{ $tone?: 'up' | 'down' }>`
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  color: ${({ $tone, theme }) =>
    $tone === 'up' ? '#16a34a' : $tone === 'down' ? '#dc2626' : theme.colors.text.primary};
`

const ChartBox = styled.div`
  width: 100%;
`
