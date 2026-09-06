import { useCallback, useMemo } from 'react'

import {
  Area,
  AreaChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import styled, { useTheme } from 'styled-components'

import { VisuallyHidden } from '@/shared/ui/visually-hidden'

/** 1억 8,067만 처럼 — 축이 아니라 문장에 들어가는 짧은 표기 */
function compactCount(value: number) {
  if (value >= 100_000_000) {
    const eok = Math.floor(value / 100_000_000)
    const man = Math.floor((value % 100_000_000) / 10_000)
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만` : `${eok}억`
  }
  if (value >= 10_000) return `${Math.floor(value / 10_000).toLocaleString()}만`
  return value.toLocaleString()
}

export interface YearPoint {
  year: number
  total: number
}

interface Props {
  /** 오래된 → 최신 순. 값이 있는 해만 들어온다. */
  points: YearPoint[]
  selected: number | null
  onSelect: (year: number) => void
}

/**
 * 연도 선택기 — 총인구 추이 스파크라인 위에서 한 해를 고른다.
 *
 * 예전엔 연도마다 버튼 하나였다. 미국(1960~2024, 65개)이 붙자 세 가지가 한꺼번에
 * 무너졌다. ⑴ 65개가 가로 스크롤로 밀려 앞쪽 연도는 화면 밖이었고, ⑵ 탭 정지점이
 * 65개라 키보드로는 지나갈 수 없는 벽이었고, ⑶ 막대 65개가 같은 폭으로 붙어 서면
 * 1.9배 증가가 "다 비슷한 높이"로 뭉갰다.
 *
 * 하나의 추이선으로 바꾸면 셋이 같이 풀린다 — 폭은 항상 컨테이너에 맞고(스크롤 없음),
 * 정지점은 슬라이더 하나이며(←/→로 이동), 0을 바닥에 둔 면적이 증가를 그대로 보여준다.
 */
export function PopulationYearScrubber({ points, selected, onSelect }: Props) {
  const theme = useTheme()
  const isDark = theme.mode === 'dark'

  const line = isDark ? '#8b95a5' : '#64748b'
  const marker = theme.colors.text.primary
  const surface = isDark ? '#212121' : '#ffffff'

  const first = points[0]?.year ?? null
  const last = points[points.length - 1]?.year ?? null
  const selectedPoint = points.find((point) => point.year === selected) ?? null

  /* 완만한 기울기만으로는 '얼마나 늘었나'가 안 읽힌다 — 양 끝 값을 캡션에 적는다
     (0을 바닥에 둔 정직한 축을 유지하면서 크기를 같이 전달하는 방법). */
  const span =
    points.length > 1
      ? { from: compactCount(points[0].total), to: compactCount(points[points.length - 1].total) }
      : null

  /** 눈금은 10년 단위 + 양 끝. 65개를 다 쓰면 글자가 겹쳐 뭉갠다. */
  const ticks = useMemo(() => {
    const decades = points
      .map((point) => point.year)
      .filter((year) => year % 10 === 0)
    const edges = [first, last].filter((year): year is number => year != null)
    return Array.from(new Set([...edges, ...decades])).sort(
      (left, right) => left - right,
    )
  }, [points, first, last])

  const moveBy = useCallback(
    (step: number) => {
      if (points.length === 0) return
      const index = points.findIndex((point) => point.year === selected)
      const base = index < 0 ? points.length - 1 : index
      const next = Math.min(points.length - 1, Math.max(0, base + step))
      onSelect(points[next].year)
    },
    [points, selected, onSelect],
  )

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = {
      ArrowLeft: -1,
      ArrowDown: -1,
      ArrowRight: 1,
      ArrowUp: 1,
      PageDown: -5,
      PageUp: 5,
    }
    if (event.key === 'Home') {
      event.preventDefault()
      if (points[0]) onSelect(points[0].year)
      return
    }
    if (event.key === 'End') {
      event.preventDefault()
      const tail = points[points.length - 1]
      if (tail) onSelect(tail.year)
      return
    }
    const step = steps[event.key]
    if (step == null) return
    event.preventDefault()
    moveBy(step)
  }

  return (
    <Wrapper>
      <Caption>
        <CaptionText>
          연도별 총인구
          {span && (
            <CaptionSpan>
              {span.from} → {span.to}
            </CaptionSpan>
          )}
        </CaptionText>
        <CaptionHint>눌러서 그 해의 피라미드 보기 · ←/→ 키로도 이동</CaptionHint>
      </Caption>
      <Plot
        role="slider"
        tabIndex={0}
        aria-label="연도 선택"
        aria-valuemin={first ?? undefined}
        aria-valuemax={last ?? undefined}
        aria-valuenow={selected ?? undefined}
        aria-valuetext={selected != null ? `${selected}년` : undefined}
        onKeyDown={handleKeyDown}
      >
        <ResponsiveContainer width="100%" height={86}>
          <AreaChart
            data={points}
            margin={{ top: 10, right: 10, bottom: 0, left: 10 }}
            onClick={(state) => {
              const label = state?.activeLabel
              if (label != null) onSelect(Number(label))
            }}
          >
            <defs>
              <linearGradient id="pyramid-year-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={line} stopOpacity={0.34} />
                <stop offset="100%" stopColor={line} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="year"
              ticks={ticks}
              interval="preserveStartEnd"
              height={20}
              tick={{ fontSize: 12, fill: theme.colors.text.secondary }}
              axisLine={false}
              tickLine={false}
            />
            {/* 0을 바닥에 두어야 '몇 배가 됐나'를 면적으로 읽을 수 있다 */}
            <YAxis hide domain={[0, (max: number) => max * 1.12]} />
            <Area
              type="monotone"
              dataKey="total"
              stroke={line}
              strokeWidth={2}
              fill="url(#pyramid-year-area)"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            {selected != null && (
              <ReferenceLine
                x={selected}
                stroke={marker}
                strokeOpacity={0.4}
                strokeWidth={1}
              />
            )}
            {selectedPoint && (
              <ReferenceDot
                x={selectedPoint.year}
                y={selectedPoint.total}
                r={4.5}
                fill={marker}
                stroke={surface}
                strokeWidth={2}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
        <VisuallyHidden aria-live="polite">
          {selected != null ? `${selected}년 선택됨` : ''}
        </VisuallyHidden>
      </Plot>
    </Wrapper>
  )
}

const Wrapper = styled.div`
  margin-bottom: 18px;
`

const Caption = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 2px;
`

const CaptionText = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CaptionSpan = styled.span`
  margin-left: 8px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CaptionHint = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Plot = styled.div`
  position: relative;
  cursor: pointer;
  border-radius: 10px;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 3px;
  }
`
