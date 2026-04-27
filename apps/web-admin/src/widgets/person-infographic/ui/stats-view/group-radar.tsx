/**
 * 그룹 레이더 sub-tab — 가문/국가별 6축 평균 overlay.
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

import {
  type PersonStatKey,
  PERSON_STAT_KEYS,
  PERSON_STAT_META,
} from '@/shared/api/person-stats'
import type { PersonEvaluationSummary } from '@/shared/lib/person-evaluation-index'
import type { AdaptedPerson } from '../../model/types'

import {
  ChartShell,
  ControlGroup,
  ControlLabel,
  ControlSelect,
  ControlsRow,
  CountHint,
  EmptyHint,
  Legend,
  LegendCount,
  LegendDot,
  LegendItem,
  LegendName,
} from './shared'

type GroupKey = 'country' | 'faction'

const GROUP_OPTIONS: Array<{ key: GroupKey; label: string }> = [
  { key: 'faction', label: '가문' },
  { key: 'country', label: '국가' },
]

const PALETTE = [
  '#6366f1', '#dc2626', '#0891b2', '#7c3aed', '#f59e0b', '#10b981', '#ec4899', '#14b8a6',
]

interface Props {
  evaluated: AdaptedPerson[]
  evalIndex: Map<string, PersonEvaluationSummary>
}

export function GroupRadarPane({ evaluated, evalIndex }: Props) {
  const [groupKey, setGroupKey] = useState<GroupKey>('faction')
  const [topN, setTopN] = useState<number>(5)

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { name: string; sums: Record<PersonStatKey, number>; counts: Record<PersonStatKey, number>; n: number }
    >()
    for (const p of evaluated) {
      const stats = evalIndex.get(p.id)?.stats
      if (!stats) continue
      const gname = (p[groupKey] || '').trim()
      if (!gname || gname === '미상') continue
      let g = map.get(gname)
      if (!g) {
        g = {
          name: gname,
          sums: { politics: 0, military: 0, diplomacy: 0, intellect: 0, charisma: 0, administration: 0 },
          counts: { politics: 0, military: 0, diplomacy: 0, intellect: 0, charisma: 0, administration: 0 },
          n: 0,
        }
        map.set(gname, g)
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
      .map((g) => ({
        name: g.name,
        n: g.n,
        avg: PERSON_STAT_KEYS.reduce(
          (acc, k) => {
            acc[k] = g.counts[k] > 0 ? Math.round(g.sums[k] / g.counts[k]) : 0
            return acc
          },
          {} as Record<PersonStatKey, number>,
        ),
      }))
      .sort((a, b) => b.n - a.n)
      .slice(0, topN)
  }, [evaluated, evalIndex, groupKey, topN])

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <ControlsRow>
        <ControlGroup>
          <ControlLabel>그룹</ControlLabel>
          <ControlSelect value={groupKey} onChange={(e) => setGroupKey(e.target.value as GroupKey)}>
            {GROUP_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
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

      {groups.length === 0 ? (
        <EmptyHint>그룹화 가능한 평가 데이터가 없습니다.</EmptyHint>
      ) : (
        <>
          <ChartShell $h={420}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="80%">
                <PolarGrid stroke="rgba(148,163,184,0.4)" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }} />
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
                <LegendCount>{g.n}명</LegendCount>
              </LegendItem>
            ))}
          </Legend>
        </>
      )}
    </div>
  )
}
