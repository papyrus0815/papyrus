/**
 * 능력치 매트릭스 sub-tab — 두 축 선택 가능한 2D scatter + 사분면 라벨.
 */
import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import styled from 'styled-components'

import {
  type PersonStatKey,
  PERSON_STAT_KEYS,
  PERSON_STAT_META,
} from '@/shared/api/person-stats'
import type { PersonEvaluationSummary } from '@/shared/lib/person-evaluation-index'
import type { AdaptedPerson } from '../../model/types'

import {
  ChartHint,
  ChartShell,
  ControlGroup,
  ControlLabel,
  ControlSelect,
  ControlsRow,
  CountHint,
  EmptyHint,
  useChartTheme,
} from './shared'

interface Props {
  evaluated: AdaptedPerson[]
  evalIndex: Map<string, PersonEvaluationSummary>
  onPersonClick: (id: string) => void
}

/**
 * 사분면 의미 생성 — X축↑·Y축↑ 등 4사분면 자동 라벨.
 * 50점을 중간선으로 사용 (능력치 범위 0–100).
 */
function quadrantLabels(xAxis: string, yAxis: string): {
  topLeft: string
  topRight: string
  bottomLeft: string
  bottomRight: string
} {
  return {
    topRight: `${xAxis}↑ ${yAxis}↑`,
    topLeft: `${xAxis}↓ ${yAxis}↑`,
    bottomRight: `${xAxis}↑ ${yAxis}↓`,
    bottomLeft: `${xAxis}↓ ${yAxis}↓`,
  }
}

const AXIS_PRESETS: ReadonlyArray<{
  label: string
  x: PersonStatKey
  y: PersonStatKey
}> = [
  { label: '정치 × 군사', x: 'politics', y: 'military' },
  { label: '지성 × 행정', x: 'intellect', y: 'administration' },
  { label: '외교 × 카리스마', x: 'diplomacy', y: 'charisma' },
  { label: '정치 × 카리스마', x: 'politics', y: 'charisma' },
]

export function MatrixPane({ evaluated, evalIndex, onPersonClick }: Props) {
  const chart = useChartTheme()
  const [xKey, setXKey] = useState<PersonStatKey>('politics')
  const [yKey, setYKey] = useState<PersonStatKey>('military')
  const [showLabels, setShowLabels] = useState(true)

  const data = useMemo(() => {
    const raw: Array<{
      x: number
      y: number
      name: string
      id: string
      influence: number
      color: string
      eraLbl: string
    }> = []
    for (const p of evaluated) {
      const stats = evalIndex.get(p.id)?.stats
      if (!stats) continue
      const xv = stats[xKey]
      const yv = stats[yKey]
      if (xv == null || yv == null) continue
      raw.push({
        x: xv as number,
        y: yv as number,
        name: p.name,
        id: p.id,
        influence: p.influence ?? 50,
        color: p.era.color,
        eraLbl: p.era.lbl,
      })
    }
    // 상위 20명(영향력 + 두 축 거리 합산)만 라벨 표시해 겹침 최소화
    const rankedIds = new Set(
      [...raw]
        .sort(
          (a, b) =>
            b.influence + Math.hypot(b.x - 50, b.y - 50) -
            (a.influence + Math.hypot(a.x - 50, a.y - 50)),
        )
        .slice(0, 20)
        .map((d) => d.id),
    )
    return raw.map((d) => ({
      ...d,
      labeled: raw.length <= 24 || rankedIds.has(d.id),
    }))
  }, [evaluated, evalIndex, xKey, yKey])

  const xMeta = PERSON_STAT_META[xKey]
  const yMeta = PERSON_STAT_META[yKey]
  const labels = quadrantLabels(xMeta.label, yMeta.label)

  // 같은 능력치를 두 축에 고르면 무의미한 대각선이 되므로 충돌 시 기존 값과 스왑
  const handleXChange = (next: PersonStatKey) => {
    if (next === yKey) setYKey(xKey)
    setXKey(next)
  }
  const handleYChange = (next: PersonStatKey) => {
    if (next === xKey) setXKey(yKey)
    setYKey(next)
  }

  return (
    <Wrap>
      <ControlsRow>
        <ControlGroup>
          <ControlLabel>X축</ControlLabel>
          <ControlSelect value={xKey} onChange={(e) => handleXChange(e.target.value as PersonStatKey)}>
            {PERSON_STAT_KEYS.map((k) => (
              <option key={k} value={k}>{PERSON_STAT_META[k].label}</option>
            ))}
          </ControlSelect>
        </ControlGroup>
        <ControlGroup>
          <ControlLabel>Y축</ControlLabel>
          <ControlSelect value={yKey} onChange={(e) => handleYChange(e.target.value as PersonStatKey)}>
            {PERSON_STAT_KEYS.map((k) => (
              <option key={k} value={k}>{PERSON_STAT_META[k].label}</option>
            ))}
          </ControlSelect>
        </ControlGroup>
        <PresetGroup role="group" aria-label="축 조합 프리셋">
          {AXIS_PRESETS.map((preset) => {
            const active = xKey === preset.x && yKey === preset.y
            return (
              <PresetChip
                key={preset.label}
                type="button"
                $active={active}
                onClick={() => {
                  setXKey(preset.x)
                  setYKey(preset.y)
                }}
              >
                {preset.label}
              </PresetChip>
            )
          })}
        </PresetGroup>
        <PresetChip
          type="button"
          $active={showLabels}
          onClick={() => setShowLabels((v) => !v)}
        >
          이름 라벨 {showLabels ? '켜짐' : '꺼짐'}
        </PresetChip>
        <CountHint>{data.length}명</CountHint>
      </ControlsRow>

      {data.length === 0 ? (
        <EmptyHint>두 축 모두 점수가 있는 인물이 없습니다.</EmptyHint>
      ) : (
        <ChartShell $h={520}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 16, right: 24, bottom: 36, left: 36 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
              {/* B1. 사분면 의미 라벨 — 4구역 자동 표기 */}
              <ReferenceArea x1={50} x2={100} y1={50} y2={100} fill="rgba(99,102,241,0.04)" stroke="none" label={{ value: labels.topRight, position: 'insideTopRight', fill: '#6366f1', fontSize: 11, fontWeight: 700 }} />
              <ReferenceArea x1={0} x2={50} y1={50} y2={100} fill="rgba(99,102,241,0.02)" stroke="none" label={{ value: labels.topLeft, position: 'insideTopLeft', fill: chart.tick, fontSize: 11, fontWeight: 600 }} />
              <ReferenceArea x1={50} x2={100} y1={0} y2={50} fill="rgba(99,102,241,0.02)" stroke="none" label={{ value: labels.bottomRight, position: 'insideBottomRight', fill: chart.tick, fontSize: 11, fontWeight: 600 }} />
              <ReferenceArea x1={0} x2={50} y1={0} y2={50} fill="rgba(0,0,0,0.02)" stroke="none" label={{ value: labels.bottomLeft, position: 'insideBottomLeft', fill: chart.tick, fontSize: 11, fontWeight: 600 }} />
              <ReferenceLine x={50} stroke="rgba(148,163,184,0.4)" strokeDasharray="4 2" />
              <ReferenceLine y={50} stroke="rgba(148,163,184,0.4)" strokeDasharray="4 2" />
              <XAxis
                type="number"
                dataKey="x"
                domain={[0, 100]}
                name={xMeta.label}
                tick={{ fontSize: 11, fill: chart.tick }}
                label={{ value: xMeta.label, position: 'insideBottom', offset: -16, fontSize: 12, fill: chart.axisLabel }}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[0, 100]}
                name={yMeta.label}
                tick={{ fontSize: 11, fill: chart.tick }}
                label={{ value: yMeta.label, angle: -90, position: 'insideLeft', offset: 0, fontSize: 12, fill: chart.axisLabel }}
              />
              <ZAxis type="number" dataKey="influence" range={[60, 280]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ borderRadius: 8, fontSize: 12, border: `1px solid ${chart.border}` }}
                formatter={(value, name) => {
                  if (name === 'influence') return [`영향력 ${value}`, '']
                  return [value, name]
                }}
                labelFormatter={(_, payload: any) =>
                  payload && payload[0]
                    ? `${payload[0].payload.name} (${payload[0].payload.eraLbl})`
                    : ''
                }
              />
              <Scatter
                data={data}
                fill="#6366f1"
                shape={(props: any) => {
                  const { cx, cy, payload } = props
                  if (cx == null || cy == null || !payload) return <g />
                  const r = Math.max(4.5, Math.min(9, (payload.influence ?? 50) / 11))
                  return (
                    <g
                      style={{ cursor: 'pointer' }}
                      onClick={() => payload.id && onPersonClick(payload.id)}
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill={payload.color || '#6366f1'}
                        fillOpacity={0.75}
                        stroke={payload.color || '#4f46e5'}
                        strokeWidth={1.2}
                      />
                      {showLabels && payload.labeled && (
                        <text
                          x={cx}
                          y={cy - r - 4}
                          textAnchor="middle"
                          fontSize={10.5}
                          fontWeight={600}
                          fill={chart.axisLabel}
                          style={{ pointerEvents: 'none' }}
                        >
                          {payload.name}
                        </text>
                      )}
                    </g>
                  )
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartShell>
      )}
      <ChartHint>
        점 색 = 시대 · 점 크기 = 영향력 · 50점선 기준 사분면 라벨 표시 · 점 클릭 시 인물 상세로 이동.
      </ChartHint>
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const PresetGroup = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
`

const PresetChip = styled.button<{ $active: boolean }>`
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  cursor: pointer;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.active : theme.colors.border.default};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.activeLight : theme.colors.background.primary};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.active : theme.colors.text.secondary};
  transition: all 0.12s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`
