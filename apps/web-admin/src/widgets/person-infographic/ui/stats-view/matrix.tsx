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

export function MatrixPane({ evaluated, evalIndex, onPersonClick }: Props) {
  const [xKey, setXKey] = useState<PersonStatKey>('politics')
  const [yKey, setYKey] = useState<PersonStatKey>('military')

  const data = useMemo(() => {
    const points: Array<{
      x: number
      y: number
      name: string
      id: string
      influence: number
    }> = []
    for (const p of evaluated) {
      const stats = evalIndex.get(p.id)?.stats
      if (!stats) continue
      const xv = stats[xKey]
      const yv = stats[yKey]
      if (xv == null || yv == null) continue
      points.push({
        x: xv as number,
        y: yv as number,
        name: p.name,
        id: p.id,
        influence: p.influence ?? 50,
      })
    }
    return points
  }, [evaluated, evalIndex, xKey, yKey])

  const xMeta = PERSON_STAT_META[xKey]
  const yMeta = PERSON_STAT_META[yKey]
  const labels = quadrantLabels(xMeta.label, yMeta.label)

  return (
    <Wrap>
      <ControlsRow>
        <ControlGroup>
          <ControlLabel>X축</ControlLabel>
          <ControlSelect value={xKey} onChange={(e) => setXKey(e.target.value as PersonStatKey)}>
            {PERSON_STAT_KEYS.map((k) => (
              <option key={k} value={k}>{PERSON_STAT_META[k].label}</option>
            ))}
          </ControlSelect>
        </ControlGroup>
        <ControlGroup>
          <ControlLabel>Y축</ControlLabel>
          <ControlSelect value={yKey} onChange={(e) => setYKey(e.target.value as PersonStatKey)}>
            {PERSON_STAT_KEYS.map((k) => (
              <option key={k} value={k}>{PERSON_STAT_META[k].label}</option>
            ))}
          </ControlSelect>
        </ControlGroup>
        <CountHint>{data.length}명 plotting</CountHint>
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
              <ReferenceArea x1={0} x2={50} y1={50} y2={100} fill="rgba(99,102,241,0.02)" stroke="none" label={{ value: labels.topLeft, position: 'insideTopLeft', fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
              <ReferenceArea x1={50} x2={100} y1={0} y2={50} fill="rgba(99,102,241,0.02)" stroke="none" label={{ value: labels.bottomRight, position: 'insideBottomRight', fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
              <ReferenceArea x1={0} x2={50} y1={0} y2={50} fill="rgba(0,0,0,0.02)" stroke="none" label={{ value: labels.bottomLeft, position: 'insideBottomLeft', fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
              <ReferenceLine x={50} stroke="rgba(148,163,184,0.4)" strokeDasharray="4 2" />
              <ReferenceLine y={50} stroke="rgba(148,163,184,0.4)" strokeDasharray="4 2" />
              <XAxis
                type="number"
                dataKey="x"
                domain={[0, 100]}
                name={xMeta.label}
                tick={{ fontSize: 11, fill: '#64748b' }}
                label={{ value: xMeta.label, position: 'insideBottom', offset: -16, fontSize: 12, fill: '#475569' }}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[0, 100]}
                name={yMeta.label}
                tick={{ fontSize: 11, fill: '#64748b' }}
                label={{ value: yMeta.label, angle: -90, position: 'insideLeft', offset: 0, fontSize: 12, fill: '#475569' }}
              />
              <ZAxis type="number" dataKey="influence" range={[60, 280]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }}
                formatter={(value, name) => {
                  if (name === 'influence') return [`영향력 ${value}`, '']
                  return [value, name]
                }}
                labelFormatter={(_, payload: any) =>
                  payload && payload[0] ? payload[0].payload.name : ''
                }
              />
              <Scatter
                data={data}
                fill="#6366f1"
                fillOpacity={0.55}
                stroke="#4f46e5"
                strokeWidth={1}
                onClick={(e: any) => e?.id && onPersonClick(e.id)}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartShell>
      )}
      <ChartHint>
        점 크기 = 영향력. 50점선 기준 사분면 라벨 표시. 점 클릭 시 인물 상세로 이동.
      </ChartHint>
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`
