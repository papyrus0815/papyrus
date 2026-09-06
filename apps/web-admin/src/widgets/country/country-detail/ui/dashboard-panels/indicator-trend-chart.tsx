import { useMemo } from 'react'

import {
  CartesianGrid,
  Dot,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import styled, { useTheme } from 'styled-components'

import { niceAxis } from '@/shared/lib/nice-axis'

export interface TrendPoint {
  year: number
  value: number
}

interface Props {
  title: string
  /** 무엇을 재는 값인지 — 제목 아래 한 줄 */
  caption: string
  points: TrendPoint[]
  /** 값 뒤에 붙는 단위. 기본 '%' */
  unit?: string
}

/** 1.66 → '1.66%', 0.5 → '0.5%' (뒤따르는 0은 잡음) */
function formatRate(value: number, unit: string): string {
  const text = Number(value.toFixed(2)).toLocaleString('ko-KR')
  return `${text}${unit}`
}

/**
 * 지표 추이 한 칸 — 경제 성장률·인구 증가율이 같이 쓴다.
 *
 * 예전엔 두 카드가 각자 차트를 들고 있었고, 색·격자·툴팁이 **라이트 전용 하드코딩**
 * 이었다(격자 `#e5e7eb`가 다크에서 흰 점선으로 튀어 데이터보다 진했다). 형태도
 * 서로 달라 인구 쪽만 면적 채움이었는데, 증가율은 쌓이는 양이 아니라 **비율**이라
 * 면적이 뜻을 지지 않는다 — 선으로 통일했다.
 *
 * (activeDot을 객체가 아닌 <Dot>으로 넘기는 건 `{ r: 4 }`가 레포 lint의 한 글자
 * 변수명 금지에 걸리기 때문이다 — 동작은 같다.)
 *
 * 값이 64개면 어느 해가 꼭짓점인지 눈으로 못 짚는다. 그래서 **최고·최저·최신 세 점만**
 * 직접 라벨을 단다(모든 점에 숫자를 붙이면 그건 목록이지 그래프가 아니다).
 */
export function IndicatorTrendChart({ title, caption, points, unit = '%' }: Props) {
  const theme = useTheme()
  const isDark = theme.mode === 'dark'
  const accent = isDark ? '#3987e5' : '#2a78d6'
  const grid = isDark ? 'rgba(255,255,255,0.08)' : '#eef1f5'
  const axisInk = theme.colors.text.secondary

  const chart = useMemo(() => {
    const rows = [...points].sort((left, right) => left.year - right.year)
    if (rows.length === 0) return null
    const values = rows.map((row) => row.value)
    const peak = rows.reduce((best, row) => (row.value > best.value ? row : best))
    const trough = rows.reduce((best, row) => (row.value < best.value ? row : best))
    const last = rows[rows.length - 1]
    const average = values.reduce((sum, value) => sum + value, 0) / values.length

    /*
     * 증가율은 0이 뜻을 가진 값이다(0 = 인구가 그대로, 음수 = 줄어듦). 그래서 축은
     * 늘 0을 품는다 — 데이터가 전부 양수여도 0에서 시작해야 '얼마나 느려졌나'가 읽힌다.
     */
    const upper = niceAxis(Math.max(0, ...values))
    const lower = Math.min(0, ...values)
    const lowerAxis = lower < 0 ? -niceAxis(-lower).max : 0
    const ticks: number[] = []
    for (
      let tick = lowerAxis;
      tick <= upper.max + 1e-9;
      tick += upper.step
    ) {
      ticks.push(Math.round(tick * 1e6) / 1e6)
    }

    /* x축은 10년 눈금 + 양 끝 — 64개를 다 적으면 글자가 겹쳐 뭉갠다 */
    const yearTicks = Array.from(
      new Set([
        rows[0].year,
        ...rows.map((row) => row.year).filter((year) => year % 10 === 0),
        last.year,
      ]),
    ).sort((left, right) => left - right)

    return {
      rows,
      peak,
      trough,
      last,
      average,
      domain: [lowerAxis, upper.max] as [number, number],
      ticks,
      yearTicks,
      hasNegative: lower < 0,
    }
  }, [points])

  if (!chart) return null

  /** 최고·최저·최신 — 겹치면(같은 해) 하나만 남긴다 */
  const marks = [
    { point: chart.peak, place: 'top' as const },
    { point: chart.trough, place: 'bottom' as const },
    { point: chart.last, place: 'top' as const },
  ].filter(
    (mark, index, all) =>
      all.findIndex((other) => other.point.year === mark.point.year) === index,
  )

  return (
    <Card>
      <Head>
        <Title>{title}</Title>
        <Caption>{caption}</Caption>
      </Head>
      <Summary>
        <SummaryItem>
          <SummaryLabel>{chart.last.year}년</SummaryLabel>
          <SummaryValue>{formatRate(chart.last.value, unit)}</SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>기간 평균</SummaryLabel>
          <SummaryValue>{formatRate(chart.average, unit)}</SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>최고 {chart.peak.year}</SummaryLabel>
          <SummaryValue>{formatRate(chart.peak.value, unit)}</SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>최저 {chart.trough.year}</SummaryLabel>
          <SummaryValue>{formatRate(chart.trough.value, unit)}</SummaryValue>
        </SummaryItem>
      </Summary>

      <Plot>
        <ResponsiveContainer width="100%" height={248}>
          <LineChart
            data={chart.rows}
            /* 위 여백은 최고점 직접 라벨이 서는 자리 — 18이면 글자 윗부분이 잘린다 */
            margin={{ top: 28, right: 34, bottom: 4, left: 0 }}
          >
            {/* 격자는 실선 hairline — 점선은 '추정치'나 '임계선'으로 읽혀 잡음이 된다 */}
            <CartesianGrid stroke={grid} vertical={false} />
            <XAxis
              dataKey="year"
              ticks={chart.yearTicks}
              type="number"
              domain={['dataMin', 'dataMax']}
              tick={{ fontSize: 12, fill: axisInk }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={chart.domain}
              ticks={chart.ticks}
              tickFormatter={(value: number) => formatRate(value, unit)}
              tick={{ fontSize: 12, fill: axisInk }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            {/* 0은 '인구가 그대로'인 지점 — 격자보다 진하게 둔다 */}
            {chart.hasNegative && (
              <ReferenceLine
                y={0}
                stroke={isDark ? 'rgba(255,255,255,0.28)' : '#cbd5e1'}
              />
            )}
            {/* 평균선은 격자와 구분돼야 하므로 파선을 쓴다 — 무엇인지 끝에 적어 둔다 */}
            <ReferenceLine
              y={chart.average}
              stroke={axisInk}
              strokeOpacity={0.45}
              strokeDasharray="4 4"
              /* 오른쪽 끝은 최신값 직접 라벨의 자리다 — 겹치지 않게 왼쪽 위에 붙인다 */
              label={{
                value: '평균',
                position: 'insideTopLeft',
                fill: axisInk,
                fontSize: 11,
                fontWeight: 600,
              }}
            />
            <Tooltip
              cursor={{ stroke: axisInk, strokeOpacity: 0.35 }}
              contentStyle={{
                background: isDark
                  ? 'rgba(24,24,27,0.97)'
                  : 'rgba(255,255,255,0.98)',
                border: `1px solid ${theme.colors.border.default}`,
                borderRadius: 12,
                fontSize: 12.5,
                color: theme.colors.text.primary,
              }}
              labelFormatter={(year: number) => `${year}년`}
              formatter={(value: number) => [formatRate(value, unit), title]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={accent}
              strokeWidth={2}
              dot={false}
              activeDot={<Dot r={4} strokeWidth={2} />}
              isAnimationActive={false}
            />
            {marks.map((mark) => (
              <ReferenceDot
                key={mark.point.year}
                x={mark.point.year}
                y={mark.point.value}
                r={4}
                fill={accent}
                stroke={isDark ? '#171717' : '#ffffff'}
                strokeWidth={2}
                label={{
                  value: formatRate(mark.point.value, unit),
                  position: mark.place,
                  offset: 8,
                  fill: theme.colors.text.primary,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Plot>
    </Card>
  )
}

const Card = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`

const Head = styled.div`
  margin-bottom: 10px;
`

const Title = styled.h3`
  margin: 0;
  font-size: 14.5px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Caption = styled.p`
  margin: 2px 0 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/** 그래프를 읽기 전에 먼저 잡히는 네 값 — 지금·평균·최고·최저 */
const Summary = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin-bottom: 12px;
`

const SummaryItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
`

const SummaryLabel = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SummaryValue = styled.span`
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Plot = styled.div`
  width: 100%;
`
