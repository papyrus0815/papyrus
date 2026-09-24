import { useMemo } from 'react'

import {
  CartesianGrid,
  Dot,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import styled, { useTheme } from 'styled-components'

import type { BondMaturity } from '@/entities/country/api.indicators'
import {
  bondMaturityLabel,
  compareBondMaturity,
  formatYield,
} from '@/entities/country/lib/bond-maturity'
import { niceAxis } from '@/shared/lib/nice-axis'

export interface CurvePoint {
  maturity: BondMaturity
  value: number
}

export interface CurveSeries {
  year: number
  points: CurvePoint[]
}

interface Props {
  title: string
  caption: string
  /** 앞이 기준 연도, 뒤가 비교 연도. 최대 두 개만 그린다 */
  series: CurveSeries[]
}

/**
 * 수익률 곡선 — 한 해의 금리를 **만기 순으로** 늘어놓은 선.
 *
 * 추이선(연도 축)과 다른 그림이다. 추이선은 "10년물이 언제 비쌌나"를 답하고, 이 곡선은
 * "지금 돈을 오래 빌려주는 값이 짧게 빌려주는 값보다 싼가"를 답한다. 뒤집힌 곡선
 * (장기 < 단기)은 역사적으로 침체의 전조로 읽혀 왔고, 그건 **모양**으로만 보인다.
 *
 * 가로축은 만기를 연수 그대로 쓰지 않고 **순서**로 세운다. 3개월과 30년을 실제 길이로
 * 놓으면 왼쪽 절반이 한 점에 뭉쳐 곡선의 앞머리(가장 많이 움직이는 구간)가 사라진다.
 */
export function BondYieldCurve({ title, caption, series }: Props) {
  const theme = useTheme()
  const isDark = theme.mode === 'dark'
  const accent = isDark ? '#3987e5' : '#2a78d6'
  const compareInk = isDark ? 'rgba(255,255,255,0.42)' : '#94a3b8'
  const grid = isDark ? 'rgba(255,255,255,0.08)' : '#eef1f5'
  const axisInk = theme.colors.text.secondary

  const chart = useMemo(() => {
    const drawn = series.slice(0, 2).filter((row) => row.points.length > 0)
    if (drawn.length === 0) return null

    /* 가로축은 두 해에 등장한 만기의 합집합 — 한 해에만 있는 만기도 자리를 갖는다 */
    const maturities = Array.from(
      new Set(drawn.flatMap((row) => row.points.map((point) => point.maturity))),
    ).sort(compareBondMaturity)

    const rows = maturities.map((maturity) => {
      const row: Record<string, number | string> = {
        label: bondMaturityLabel(maturity),
      }
      for (const entry of drawn) {
        const found = entry.points.find((point) => point.maturity === maturity)
        if (found) row[`y${entry.year}`] = found.value
      }
      return row
    })

    const values = drawn.flatMap((row) => row.points.map((point) => point.value))
    const upper = niceAxis(Math.max(0, ...values))
    const lowest = Math.min(0, ...values)
    /* 마이너스 금리는 실제로 있었다(2010년대 유럽·일본) — 축이 0에서 끊기면 안 된다 */
    const lowerAxis = lowest < 0 ? -niceAxis(-lowest).max : 0
    const ticks: number[] = []
    for (let tick = lowerAxis; tick <= upper.max + 1e-9; tick += upper.step) {
      ticks.push(Math.round(tick * 1e6) / 1e6)
    }

    return {
      rows,
      drawn,
      domain: [lowerAxis, upper.max] as [number, number],
      ticks,
      hasNegative: lowest < 0,
    }
  }, [series])

  /* 자료가 없어도 축과 눈금선은 남긴다 — 값 라벨만 비운다 */
  if (!chart) {
    return (
      <Card>
        <Head>
          <Title>{title}</Title>
          <Caption>{caption}</Caption>
        </Head>
        <ResponsiveContainer width="100%" height={248}>
          <LineChart margin={{ top: 28, right: 20, bottom: 4, left: 0 }}>
            <CartesianGrid stroke={grid} vertical={false} />
            <XAxis
              type="number"
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tick={false}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tick={false}
              tickLine={false}
              axisLine={false}
              width={52}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    )
  }

  return (
    <Card>
      <Head>
        <Title>{title}</Title>
        <Caption>{caption}</Caption>
      </Head>
      <Legend>
        {chart.drawn.map((entry, index) => (
          <LegendItem key={entry.year}>
            <LegendSwatch $color={index === 0 ? accent : compareInk} />
            {entry.year}년
          </LegendItem>
        ))}
      </Legend>

      <ResponsiveContainer width="100%" height={248}>
        <LineChart
          data={chart.rows}
          margin={{ top: 28, right: 20, bottom: 4, left: 0 }}
        >
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: axisInk }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={chart.domain}
            ticks={chart.ticks}
            /*
             * 축 눈금은 소수점 두 자리를 떼고 적는다 — 값(4.58%)은 두 자리로 읽어야
             * 하지만 눈금은 '6.00%'보다 '6%'가 옆 카드(추이선)와 같은 결로 읽힌다.
             */
            tickFormatter={(value: number) =>
              `${Number(value.toFixed(2)).toLocaleString('ko-KR')}%`
            }
            tick={{ fontSize: 12, fill: axisInk }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          {chart.hasNegative && (
            <ReferenceLine
              y={0}
              stroke={isDark ? 'rgba(255,255,255,0.28)' : '#cbd5e1'}
            />
          )}
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
            labelFormatter={(label: string) => `${label} 만기`}
            formatter={(value: number, name: string) => [
              formatYield(value),
              `${name.replace(/^y/, '')}년`,
            ]}
          />
          {chart.drawn.map((entry, index) => (
            <Line
              key={entry.year}
              type="monotone"
              dataKey={`y${entry.year}`}
              stroke={index === 0 ? accent : compareInk}
              strokeWidth={index === 0 ? 2 : 1.5}
              strokeDasharray={index === 0 ? undefined : '5 4'}
              /* 만기는 점이 8개 안팎이라 각 점을 찍어야 '어느 만기의 값'인지 짚인다 */
              dot={<Dot r={3} strokeWidth={0} />}
              activeDot={<Dot r={5} strokeWidth={2} />}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
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

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin-bottom: 12px;
`

const LegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const LegendSwatch = styled.span<{ $color: string }>`
  width: 14px;
  height: 3px;
  border-radius: 2px;
  background: ${({ $color }) => $color};
`
