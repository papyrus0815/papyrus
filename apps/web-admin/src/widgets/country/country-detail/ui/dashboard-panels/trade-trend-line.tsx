import { useMemo } from 'react'

import styled, { useTheme } from 'styled-components'

import { formatTradeValue } from '@/entities/trade/vocab'

/**
 * 연도별 수출·수입 추이.
 *
 * 대시보드는 가장 최근 해만 펼쳐 보여준다. 한 해만 보면 "많다/적다"를 말할 수 없어
 * 그 위에 시간 축을 얹는다. **등록된 해가 하나뿐이면 그리지 않는다** — 점 하나짜리
 * 추세선은 추세가 아니라 장식이다.
 *
 * recharts를 쓰지 않고 인라인 SVG로 그린 이유: 축·툴팁 없는 40px 스파크라인이라
 * 차트 라이브러리의 레이아웃 계산이 오히려 이 크기에서 어긋난다.
 */
interface TrendYear {
  label: string
  signedYear: number
  exportValue: number | null
  importValue: number | null
}

interface TradeTrendLineProps {
  years: TrendYear[]
}

const Wrap = styled.div`
  margin-bottom: 12px;
`

const Head = styled.div`
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 4px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LegendItem = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;

  &::before {
    content: '';
    width: 10px;
    height: 2px;
    border-radius: 1px;
    background: ${({ $color }) => $color};
  }
`

const Axis = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 2px;
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CHART_HEIGHT = 44

export function TradeTrendLine({ years }: TradeTrendLineProps) {
  const theme = useTheme()

  const chart = useMemo(() => {
    /*
     * 금액이 있는 해만 축에 올린다. 총액을 비우고 구성만 적은 자료(추계가 갈리는
     * 역사 통계)가 흔한데, 그 해를 0으로 찍으면 "교역이 없었다"는 거짓말이 된다.
     */
    const points = years.filter(
      (year) => year.exportValue != null || year.importValue != null,
    )
    if (points.length < 2) return null

    const values = points.flatMap((point) =>
      [point.exportValue, point.importValue].filter(
        (value): value is number => value != null,
      ),
    )
    const max = Math.max(...values)
    const min = Math.min(...values, 0)
    const span = max - min || 1

    const xOf = (index: number) =>
      points.length === 1 ? 50 : (index / (points.length - 1)) * 100
    const yOf = (value: number) =>
      CHART_HEIGHT - ((value - min) / span) * CHART_HEIGHT

    const pathOf = (pick: (point: TrendYear) => number | null) => {
      const segments: string[] = []
      let penDown = false
      points.forEach((point, index) => {
        const value = pick(point)
        if (value == null) {
          /* 값이 빠진 해는 선을 잇지 않고 끊는다 — 이어 그리면 없던 값을 지어낸다 */
          penDown = false
          return
        }
        segments.push(
          `${penDown ? 'L' : 'M'}${xOf(index).toFixed(2)},${yOf(value).toFixed(2)}`,
        )
        penDown = true
      })
      return segments.join(' ')
    }

    return {
      points,
      exportPath: pathOf((point) => point.exportValue),
      importPath: pathOf((point) => point.importValue),
      max,
      first: points[0],
      last: points[points.length - 1],
    }
  }, [years])

  if (!chart) return null

  const exportColor = theme.colors.success
  const importColor = theme.colors.accent

  return (
    <Wrap>
      <Head>
        <LegendItem $color={exportColor}>수출</LegendItem>
        <LegendItem $color={importColor}>수입</LegendItem>
        <span>최대 {formatTradeValue(chart.max)}</span>
      </Head>
      <svg
        viewBox={`0 0 100 ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        width="100%"
        height={CHART_HEIGHT}
        role="img"
        aria-label={`교역 추이: ${chart.first.label}부터 ${chart.last.label}까지 ${chart.points.length}개 연도`}
      >
        {chart.exportPath && (
          <path
            d={chart.exportPath}
            fill="none"
            stroke={exportColor}
            strokeWidth={1.6}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {chart.importPath && (
          <path
            d={chart.importPath}
            fill="none"
            stroke={importColor}
            strokeWidth={1.6}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="3 2"
          />
        )}
      </svg>
      <Axis>
        <span>{chart.first.label}</span>
        <span>{chart.last.label}</span>
      </Axis>
    </Wrap>
  )
}
