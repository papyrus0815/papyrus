import { useMemo } from 'react'

import styled, { useTheme } from 'styled-components'

import { directionColor, formatTradeValue } from '@/entities/trade/vocab'

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
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const LegendItem = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;

  &::before {
    content: '';
    width: 14px;
    height: 3px;
    border-radius: 2px;
    background: ${({ $color }) => $color};
  }
`

const Axis = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/*
 * 44px였다. 3개 연도의 두 선이 그 안에 겹쳐 앉으니 선도 점도 축 라벨도 다 눌렸다 —
 * 얇고 조용한 게 아니라 그냥 안 보이는 상태였다.
 */
const CHART_HEIGHT = 72

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
    /*
     * 0을 기준선으로 강제하지 않는다. 미국 교역은 2,045~3,297 사이에서 움직이는데
     * 0부터 그리면 44px 안에서 연간 변화가 0.5px로 뭉개져 두 줄이 평평한 직선이 된다.
     * 대신 위아래 여백을 조금 두고 범위 양 끝을 함께 적어, 축 없이도 폭을 읽게 한다.
     */
    const rawMax = Math.max(...values)
    const rawMin = Math.min(...values)
    const padding = (rawMax - rawMin) * 0.15 || rawMax * 0.05 || 1
    const max = rawMax + padding
    const min = rawMin - padding
    const span = max - min || 1

    /*
     * x는 **연도에 비례**한다. 배열 순번으로 놓으면 1890·1913·2020 세 해가 등간격이
     * 되어 없는 시간을 있는 것처럼 그린다 — 역사 자료는 해가 띄엄띄엄한 게 보통이다.
     */
    const firstYear = points[0].signedYear
    const lastYear = points[points.length - 1].signedYear
    const yearSpan = lastYear - firstYear || 1
    const xOf = (index: number) =>
      points.length === 1
        ? 50
        : ((points[index].signedYear - firstYear) / yearSpan) * 100
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

    /*
     * 두 선의 **간격이 곧 무역수지**다. 미국처럼 수출·수입이 각자 거의 평평해도
     * 그 사이가 벌어져 있다는 사실이 이 그래프의 본론이라, 면으로 칠해 드러낸다.
     * 두 값이 모두 있는 구간만 칠한다 — 한쪽이 비면 간격을 말할 수 없다.
     */
    const balanceAreas: string[] = []
    let run: TrendYear[] = []
    let runStart = 0
    const flushRun = () => {
      if (run.length < 2) {
        run = []
        return
      }
      const top = run.map(
        (point, offset) =>
          `${xOf(runStart + offset).toFixed(2)},${yOf(point.exportValue!).toFixed(2)}`,
      )
      const bottom = run
        .map(
          (point, offset) =>
            `${xOf(runStart + offset).toFixed(2)},${yOf(point.importValue!).toFixed(2)}`,
        )
        .reverse()
      balanceAreas.push(`M${top.join(' L')} L${bottom.join(' L')} Z`)
      run = []
    }
    points.forEach((point, index) => {
      if (point.exportValue != null && point.importValue != null) {
        if (run.length === 0) runStart = index
        run.push(point)
      } else {
        flushRun()
      }
    })
    flushRun()

    const lastBalance =
      points[points.length - 1].exportValue != null &&
      points[points.length - 1].importValue != null
        ? points[points.length - 1].exportValue! -
          points[points.length - 1].importValue!
        : null

    return {
      points,
      exportPath: pathOf((point) => point.exportValue),
      importPath: pathOf((point) => point.importValue),
      balanceAreas,
      lastBalance,
      xOf,
      yOf,
      rawMax,
      rawMin,
      first: points[0],
      last: points[points.length - 1],
    }
  }, [years])

  if (!chart) return null

  /* 같은 섹션의 규모 막대와 **같은 방향색**을 쓴다 — 위에서 주황이던 수입이 여기서
     하늘색이면 두 그림이 다른 이야기로 읽힌다 */
  const isDark = theme.mode === 'dark'
  const exportColor = directionColor('EXPORT', isDark)
  const importColor = directionColor('IMPORT', isDark)

  return (
    <Wrap>
      <Head>
        <LegendItem $color={exportColor}>수출</LegendItem>
        <LegendItem $color={importColor}>수입</LegendItem>
        {/* 0에서 시작하지 않는 축이라 폭을 밝힌다 — 안 적으면 변화가 과장돼 보인다 */}
        <span>
          {formatTradeValue(chart.rawMin)}–{formatTradeValue(chart.rawMax)} 구간
        </span>
        {chart.lastBalance != null && (
          <span>칠한 면 = 무역수지</span>
        )}
      </Head>
      <svg
        viewBox={`0 0 100 ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        width="100%"
        height={CHART_HEIGHT}
        role="img"
        aria-label={`교역 추이: ${chart.first.label}부터 ${chart.last.label}까지 ${chart.points.length}개 연도`}
      >
        {chart.balanceAreas.map((area, index) => (
          <path
            key={index}
            d={area}
            fill={
              (chart.lastBalance ?? 0) >= 0 ? exportColor : importColor
            }
            opacity={0.11}
          />
        ))}
        {chart.exportPath && (
          <path
            d={chart.exportPath}
            fill="none"
            stroke={exportColor}
            strokeWidth={2.2}
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
            strokeWidth={2.2}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {/*
          점을 찍어야 '등록된 해'가 어디인지 보인다 — 선만 있으면 3년치가 60년치처럼
          보인다. ⚠️ 이 svg는 preserveAspectRatio="none"으로 가로만 늘어나므로
          <circle>은 납작한 타원이 된다. 길이 0인 선분 + 둥근 캡 + non-scaling-stroke로
          그려야 늘어나도 동그란 점으로 남는다.
        */}
        {chart.points.map((point, index) =>
          (['exportValue', 'importValue'] as const).map((key) => {
            const value = point[key]
            if (value == null) return null
            const x = chart.xOf(index)
            const y = chart.yOf(value)
            return (
              <path
                key={`${point.label}-${key}`}
                d={`M ${x} ${y} l 0 0.01`}
                stroke={key === 'exportValue' ? exportColor : importColor}
                strokeWidth={7}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            )
          }),
        )}
      </svg>
      <Axis>
        <span>{chart.first.label}</span>
        <span>{chart.last.label}</span>
      </Axis>
    </Wrap>
  )
}
