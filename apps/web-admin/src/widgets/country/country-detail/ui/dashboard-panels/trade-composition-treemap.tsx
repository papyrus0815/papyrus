import { useEffect, useRef, useState } from 'react'

import { ResponsiveContainer, Treemap } from 'recharts'
import styled, { useTheme } from 'styled-components'

import type { CompositionSlice } from './trade-composition'

interface Props {
  slices: CompositionSlice[]
  /** 등록 품목이 그 방향의 몇 %를 덮는가. null이면 등록분끼리의 비율만 안다 */
  coverage: number | null
  /** '수출'·'수입' — 낭독용 라벨 */
  label: string
}

interface Cell {
  name: string
  value: number
  color: string
  /** 미등록 칸 — 분류가 아니라 '모르는 몫'이라 글자도 색도 뒤로 물러난다 */
  muted?: boolean
  /* 리차트 Treemap의 data 타입이 인덱스 시그니처를 요구한다 */
  [key: string]: unknown
}

/**
 * 분류 색을 바탕색 쪽으로 섞어 **연한 면**으로 만든다.
 *
 * 트리맵은 본디 큰 면이라, 채도 높은 원색을 그대로 부으면 다섯 칸이 서로 소리를
 * 지른다(막대 12px일 때는 없던 문제다). 면은 연하게 깔고 글자는 본문 잉크를 쓴다.
 * 정체는 색이 아니라 **칸 안의 이름**이 진다 — 이름이 못 들어간 작은 칸만 범례가 받는다.
 */
function tint(color: string, surface: string, weight: number): string {
  const parse = (hex: string) => {
    const clean = hex.replace('#', '')
    return [0, 2, 4].map((offset) => parseInt(clean.slice(offset, offset + 2), 16))
  }
  const [red, green, blue] = parse(color)
  const [baseRed, baseGreen, baseBlue] = parse(surface)
  const mix = (value: number, base: number) =>
    Math.round(base + (value - base) * weight)
  const toHex = (value: number) => value.toString(16).padStart(2, '0')
  return `#${toHex(mix(red, baseRed))}${toHex(mix(green, baseGreen))}${toHex(mix(blue, baseBlue))}`
}

/** 조각 사이는 테두리가 아니라 바탕색 틈이 가른다 (양쪽 1px씩 = 2px) */
const GAP = 1
const CORNER = 6

/**
 * 분류 구성 트리맵.
 *
 * 가로 100% 누적 막대였다. 막대는 큰 조각 두엇만 이름이 들어가고 나머지는 실오라기가
 * 되어, 다섯 분류 중 셋은 범례를 왕복해야 읽혔다. 같은 넓이를 **면적**으로 나누면
 * 작은 몫도 사각형을 가져 이름표가 들어가고, 무엇보다 **미등록 몫이 한 칸으로 보인다**
 * — "우리가 아는 건 수출의 29.5%뿐"이 문장이 아니라 그림이 된다.
 */
export function TradeCompositionTreemap({ slices, coverage, label }: Props) {
  const theme = useTheme()
  /*
   * 높이를 폭에 매단다. 수출·수입을 좌우로 세우면 열이 절반으로 좁아지는데, 높이를
   * 고정해 두면 같은 면적이 세로로 길쭉한 칸으로 잘려 이름이 안 들어간다.
   * (열 폭은 컨테이너 쿼리가 정하므로 부모도 모른다 — 여기서 직접 잰다.)
   */
  const boxRef = useRef<HTMLDivElement>(null)
  const [boxWidth, setBoxWidth] = useState(0)
  useEffect(() => {
    const element = boxRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      setBoxWidth(entry.contentRect.width)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const height = Math.round(Math.min(252, Math.max(172, boxWidth * 0.46)))
  const isDark = theme.mode === 'dark'
  const surface = isDark ? '#171717' : '#ffffff'
  const mutedFill = isDark ? '#26262a' : '#eef0f3'

  if (slices.length === 0) return null

  /* 칸이 많을수록 세로가 있어야 이름이 들어간다 — 분류 수에 맞춰 늘린다 */
  const unknown = coverage == null ? 0 : Math.max(0, 100 - coverage)
  /*
   * 큰 것부터 넣는다 — squarify는 준 순서대로 칸을 잘라서, 가장 큰 '미등록'을 뒤에
   * 두면 그게 남은 자리를 비집고 들어가며 앞의 작은 분류들이 실오라기가 된다.
   */
  const cells: Cell[] = [
    ...slices.map((slice) => ({
      name: slice.name,
      value: slice.pct,
      color: slice.color,
    })),
    ...(unknown > 0.5
      ? [{ name: '미등록', value: unknown, color: mutedFill, muted: true }]
      : []),
  ].sort((left, right) => right.value - left.value)

  const describe = cells
    .map((cell) => `${cell.name} ${cell.value.toFixed(1)}%`)
    .join(', ')

  return (
    <Box ref={boxRef} role="img" aria-label={`${label} 분류 구성: ${describe}`}>
      <ResponsiveContainer width="100%" height={height}>
        <Treemap
          data={cells}
          dataKey="value"
          nameKey="name"
          isAnimationActive={false}
          content={(node) => (
            <CompositionCell node={node} surface={surface} isDark={isDark} />
          )}
        />
      </ResponsiveContainer>
    </Box>
  )
}

interface CellProps {
  // recharts가 넘겨주는 노드 — 좌표·크기에 원본 필드(color·muted)가 얹혀 온다
  node: {
    x?: number
    y?: number
    width?: number
    height?: number
    name?: string
    value?: number
    color?: string
    muted?: boolean
  }
  surface: string
  isDark: boolean
}

function CompositionCell({ node, surface, isDark }: CellProps) {
  const { x = 0, y = 0, width = 0, height = 0, name = '', value = 0 } = node
  if (width <= 0 || height <= 0) return <g />

  const accent = node.color ?? surface
  const fill = node.muted
    ? isDark
      ? '#242428'
      : '#f1f3f6'
    : tint(accent, surface, isDark ? 0.42 : 0.26)
  const ink = node.muted
    ? isDark
      ? '#a1a1aa'
      : '#6b7280'
    : isDark
      ? '#f5f5f5'
      : '#1f2937'

  const innerWidth = Math.max(0, width - GAP * 2)
  const innerHeight = Math.max(0, height - GAP * 2)
  /*
   * 칸 안에 글자를 넣는 건 **들어갈 때만**. 넘치면 자르지 않고 아예 뺀다 —
   * 잘린 이름은 없는 이름보다 나쁘고, 작은 칸의 정체는 아래 범례가 맡는다.
   */
  const showName = innerWidth >= 66 && innerHeight >= 34
  const showValue = innerWidth >= 34 && innerHeight >= 16
  const centerX = x + width / 2
  const centerY = y + height / 2

  return (
    <g>
      <title>{`${name} ${value.toFixed(1)}%`}</title>
      <rect
        x={x + GAP}
        y={y + GAP}
        width={innerWidth}
        height={innerHeight}
        rx={Math.min(CORNER, innerWidth / 2, innerHeight / 2)}
        fill={fill}
      />
      {showName && (
        <text
          x={centerX}
          y={centerY - 7}
          textAnchor="middle"
          fill={ink}
          fontSize={13}
          fontWeight={700}
        >
          {name}
        </text>
      )}
      {showValue && (
        <text
          x={centerX}
          y={showName ? centerY + 13 : centerY + 4}
          textAnchor="middle"
          fill={ink}
          fontSize={showName ? 12.5 : 11.5}
          fontWeight={showName ? 600 : 700}
        >
          {value.toFixed(1)}%
        </text>
      )}
    </g>
  )
}

const Box = styled.div`
  width: 100%;

  /* 리차트가 svg에 걸어 두는 focus 링을 지운다 — 칸은 조회 전용이다 */
  svg:focus {
    outline: none;
  }
`
