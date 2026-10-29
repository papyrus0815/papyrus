/**
 * 그룹 레이더 sub-tab — 가문/국가/시대/분야별 6축 평균 overlay + 수치 비교 표.
 */
import { useMemo, useState } from 'react'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import styled from 'styled-components'

import {
  type PersonStatKey,
  PERSON_STAT_KEYS,
  PERSON_STAT_META,
} from '@/shared/api/person-stats'
import type { PersonEvaluationSummary } from '@/shared/lib/person-evaluation-index'
import type { AdaptedPerson } from '../../model/types'

import { BRAND, hairline, surface } from '../_shared/catalog.styles'
import {
  ChartShell,
  ControlGroup,
  ControlLabel,
  ControlSelect,
  ControlsRow,
  CountHint,
  EmptyHint,
  getTooltipStyle,
  Legend,
  LegendCount,
  LegendDot,
  LegendItem,
  LegendName,
  SplitLayout,
  SurfaceCard,
  ToolbarCard,
  useChartTheme,
} from './shared'

type GroupKey = 'faction' | 'country' | 'era' | 'field'

const GROUP_OPTIONS: Array<{ key: GroupKey; label: string }> = [
  { key: 'faction', label: '가문' },
  { key: 'country', label: '국가' },
  { key: 'era', label: '시대' },
  { key: 'field', label: '분야' },
]

const PALETTE = [
  '#6366f1', '#dc2626', '#0891b2', '#7c3aed', '#f59e0b', '#10b981', '#ec4899', '#14b8a6',
]

interface Props {
  evaluated: AdaptedPerson[]
  evalIndex: Map<string, PersonEvaluationSummary>
}

export function GroupRadarPane({ evaluated, evalIndex }: Props) {
  const chart = useChartTheme()
  const [groupKey, setGroupKey] = useState<GroupKey>('faction')
  const [topN, setTopN] = useState<number>(5)
  const [minCount, setMinCount] = useState<number>(1)

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { name: string; sums: Record<PersonStatKey, number>; counts: Record<PersonStatKey, number>; n: number }
    >()
    for (const p of evaluated) {
      const stats = evalIndex.get(p.id)?.stats
      if (!stats) continue
      const rawName =
        groupKey === 'era'
          ? p.era.lbl
          : (p[groupKey] || '').trim()
      if (!rawName || rawName === '미상' || rawName === '연도 미상') continue
      let g = map.get(rawName)
      if (!g) {
        g = {
          name: rawName,
          sums: { politics: 0, military: 0, diplomacy: 0, intellect: 0, charisma: 0, administration: 0 },
          counts: { politics: 0, military: 0, diplomacy: 0, intellect: 0, charisma: 0, administration: 0 },
          n: 0,
        }
        map.set(rawName, g)
      }
      g.n += 1
      for (const key of PERSON_STAT_KEYS) {
        const v = stats[key]
        if (v != null) {
          g.sums[key] += v as number
          g.counts[key] += 1
        }
      }
    }
    return Array.from(map.values())
      .filter((g) => g.n >= minCount)
      .map((g) => {
        const avg = PERSON_STAT_KEYS.reduce(
          (acc, k) => {
            acc[k] = g.counts[k] > 0 ? Math.round(g.sums[k] / g.counts[k]) : 0
            return acc
          },
          {} as Record<PersonStatKey, number>,
        )
        const overall = Math.round(
          PERSON_STAT_KEYS.reduce((s, k) => s + avg[k], 0) /
            PERSON_STAT_KEYS.length,
        )
        return {
          name: g.name,
          n: g.n,
          avg,
          overall,
        }
      })
      .sort((a, b) => b.n - a.n || b.overall - a.overall)
      .slice(0, topN)
  }, [evaluated, evalIndex, groupKey, topN, minCount])

  const radarData = useMemo(() => {
    return PERSON_STAT_KEYS.map((key) => {
      const row: Record<string, string | number> = {
        axis: PERSON_STAT_META[key].label,
      }
      for (const g of groups) {
        row[g.name] = g.avg[key]
      }
      return row
    })
  }, [groups])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <ToolbarCard>
        <ControlsRow>
          <ControlGroup>
            <ControlLabel>그룹 기준</ControlLabel>
            <ControlSelect value={groupKey} onChange={(e) => setGroupKey(e.target.value as GroupKey)}>
              {GROUP_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </ControlSelect>
          </ControlGroup>
          <ControlGroup>
            <ControlLabel>최소 인원</ControlLabel>
            <ControlSelect value={String(minCount)} onChange={(e) => setMinCount(Number(e.target.value))}>
              <option value="1">1명 이상</option>
              <option value="2">2명 이상</option>
              <option value="3">3명 이상</option>
            </ControlSelect>
          </ControlGroup>
          <ControlGroup>
            <ControlLabel>상위</ControlLabel>
            <ControlSelect value={String(topN)} onChange={(e) => setTopN(Number(e.target.value))}>
              {[3, 5, 8].map((n) => (
                <option key={n} value={n}>{n}개</option>
              ))}
            </ControlSelect>
          </ControlGroup>
          <CountHint>{groups.length}개 그룹</CountHint>
        </ControlsRow>
      </ToolbarCard>

      {groups.length === 0 ? (
        <SurfaceCard>
          <EmptyHint>
            조건에 맞는 평가 그룹이 없습니다. 최소 인원을 1명 이상으로 낮추거나 다른 그룹 기준을 선택해 보세요.
          </EmptyHint>
        </SurfaceCard>
      ) : (
        <SplitLayout>
          <SurfaceCard>
            <ChartShell $h={380}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="78%">
                  <PolarGrid stroke="rgba(148,163,184,0.4)" />
                  <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12, fill: chart.axisLabel, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Tooltip contentStyle={getTooltipStyle(chart)} />
                  {groups.map((g, i) => (
                    <Radar
                      key={g.name}
                      name={`${g.name} (n=${g.n})`}
                      dataKey={g.name}
                      stroke={PALETTE[i % PALETTE.length]}
                      fill={PALETTE[i % PALETTE.length]}
                      fillOpacity={0.18}
                      strokeWidth={2}
                    />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </ChartShell>
            <Legend>
              {groups.map((g, i) => (
                <LegendItem key={g.name}>
                  <LegendDot style={{ background: PALETTE[i % PALETTE.length] }} />
                  <LegendName>{g.name}</LegendName>
                  <LegendCount>{g.n}명 · 평균 {g.overall}</LegendCount>
                </LegendItem>
              ))}
            </Legend>
          </SurfaceCard>

          <GroupTableWrap>
            <GroupTable>
              <thead>
                <tr>
                  <th>그룹</th>
                  <th>평가 인원</th>
                  <th>종합 평균</th>
                  {PERSON_STAT_KEYS.map((k) => (
                    <th key={k}>{PERSON_STAT_META[k].label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((g, i) => {
                  const maxOverall =
                    groups.length >= 2
                      ? Math.max(...groups.map((x) => x.overall))
                      : null
                  return (
                    <tr key={g.name}>
                      <td>
                        <GroupNameCell>
                          <LegendDot style={{ background: PALETTE[i % PALETTE.length] }} />
                          {g.name}
                        </GroupNameCell>
                      </td>
                      <td>{g.n}명</td>
                      <td
                        data-best={
                          maxOverall != null && g.overall === maxOverall
                            ? true
                            : undefined
                        }
                      >
                        <strong>{g.overall}</strong>
                      </td>
                      {PERSON_STAT_KEYS.map((k) => {
                        const maxAxis =
                          groups.length >= 2
                            ? Math.max(...groups.map((x) => x.avg[k]))
                            : null
                        const val = g.avg[k]
                        return (
                          <td
                            key={k}
                            data-best={
                              maxAxis != null && val === maxAxis ? true : undefined
                            }
                          >
                            {val}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </GroupTable>
          </GroupTableWrap>
        </SplitLayout>
      )}
    </div>
  )
}

const GroupTableWrap = styled.div`
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid ${hairline};
  background: ${surface};
`

const GroupTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;

  th,
  td {
    padding: 9px 14px;
    text-align: left;
    border-bottom: 1px solid ${hairline};
  }

  th {
    font-size: 11.5px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.secondary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.02)'};
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  td[data-best='true'] {
    font-weight: 800;
    color: ${BRAND.primary};
  }
`

const GroupNameCell = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`
