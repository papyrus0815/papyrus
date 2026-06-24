/**
 * 갤럭시 sub-tab — 6축 PCA 2D 산포도.
 *
 * 색상 모드:
 *  - 'top': 가장 높은 축으로 칠함 ("외교형/군사형/...")
 *  - 'kmeans': K-means 클러스터링 (K=3,4,5,6 선택)
 */
import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'

import {
  type PersonStatKey,
  PERSON_STAT_KEYS,
  PERSON_STAT_META,
} from '@/shared/api/person-stats'
import { kmeans } from '@/shared/lib/kmeans'
import { pca2D } from '@/shared/lib/pca-2d'
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
  Legend,
  LegendCount,
  LegendDot,
  LegendItem,
  LegendName,
  useChartTheme,
} from './shared'

const KMEANS_PALETTE = [
  '#6366f1', '#dc2626', '#10b981', '#f59e0b', '#7c3aed', '#0891b2',
]

interface Props {
  evaluated: AdaptedPerson[]
  evalIndex: Map<string, PersonEvaluationSummary>
  onPersonClick: (id: string) => void
}

type ColorMode = 'top' | 'kmeans'

export function GalaxyPane({ evaluated, evalIndex, onPersonClick }: Props) {
  const chart = useChartTheme()
  const [colorMode, setColorMode] = useState<ColorMode>('top')
  const [k, setK] = useState<number>(4)

  // 6축 모두 채워진 인물만 PCA 입력
  const pcaInput = useMemo(() => {
    const rows: Array<{
      id: string
      name: string
      country: string
      faction: string
      influence: number
      vec: number[]
      topAxis: PersonStatKey
    }> = []
    for (const p of evaluated) {
      const stats = evalIndex.get(p.id)?.stats
      if (!stats) continue
      const vec: number[] = []
      let allFilled = true
      for (const key of PERSON_STAT_KEYS) {
        const v = stats[key]
        if (v == null) {
          allFilled = false
          break
        }
        vec.push(v as number)
      }
      if (!allFilled) continue
      let topIdx = 0
      for (let i = 1; i < vec.length; i++) {
        if (vec[i]! > vec[topIdx]!) topIdx = i
      }
      rows.push({
        id: p.id,
        name: p.name,
        country: p.country,
        faction: p.faction,
        influence: p.influence ?? 50,
        vec,
        topAxis: PERSON_STAT_KEYS[topIdx]!,
      })
    }
    return rows
  }, [evaluated, evalIndex])

  const pca = useMemo(() => pca2D(pcaInput.map((r) => r.vec)), [pcaInput])

  // K-means cluster assignments (colorMode='kmeans'일 때만 계산)
  const km = useMemo(() => {
    if (colorMode !== 'kmeans' || pcaInput.length < k) return null
    return kmeans(
      pcaInput.map((r) => r.vec),
      k,
      { iters: 30, seed: 42 },
    )
  }, [colorMode, pcaInput, k])

  // recharts Scatter는 series당 한 색이라 series 분리 필요
  const series = useMemo(() => {
    type Point = {
      x: number
      y: number
      name: string
      id: string
      influence: number
      stats6: number[]
      country: string
      faction: string
      groupKey: string
    }
    const buckets = new Map<string, Point[]>()
    pcaInput.forEach((r, i) => {
      const point = pca.points[i]
      if (!point) return
      let groupKey: string
      if (colorMode === 'kmeans' && km) {
        groupKey = `cluster-${km.assignments[i]}`
      } else {
        groupKey = r.topAxis
      }
      const list = buckets.get(groupKey) ?? []
      list.push({
        x: point[0],
        y: point[1],
        name: r.name,
        id: r.id,
        influence: r.influence,
        stats6: r.vec,
        country: r.country,
        faction: r.faction,
        groupKey,
      })
      buckets.set(groupKey, list)
    })
    return buckets
  }, [pcaInput, pca, colorMode, km])

  const explained = useMemo(
    () => ({
      pc1: Math.round(pca.explained[0] * 100),
      pc2: Math.round(pca.explained[1] * 100),
    }),
    [pca],
  )

  const loadingHint = useMemo(() => {
    const dominantOf = (loading: number[]): string => {
      let topIdx = 0
      let topAbs = -Infinity
      for (let i = 0; i < loading.length; i++) {
        const a = Math.abs(loading[i] ?? 0)
        if (a > topAbs) {
          topAbs = a
          topIdx = i
        }
      }
      const sign = (loading[topIdx] ?? 0) >= 0 ? '' : '−'
      return `${sign}${PERSON_STAT_META[PERSON_STAT_KEYS[topIdx]!].label}`
    }
    return {
      pc1: pca.loadings.pc1.length ? dominantOf(pca.loadings.pc1) : '—',
      pc2: pca.loadings.pc2.length ? dominantOf(pca.loadings.pc2) : '—',
    }
  }, [pca])

  const colorOf = (groupKey: string): string => {
    if (colorMode === 'kmeans') {
      const idx = Number(groupKey.replace('cluster-', '')) || 0
      return KMEANS_PALETTE[idx % KMEANS_PALETTE.length]!
    }
    return PERSON_STAT_META[groupKey as PersonStatKey].color
  }

  const labelOf = (groupKey: string): string => {
    if (colorMode === 'kmeans') {
      // 클러스터 별 톱 축 (centroid에서 가장 큰 차원) 찾아서 라벨링
      if (!km) return groupKey
      const idx = Number(groupKey.replace('cluster-', '')) || 0
      const centroid = km.centroids[idx]
      if (!centroid) return `클러스터 ${idx + 1}`
      let topIdx = 0
      for (let i = 1; i < centroid.length; i++) {
        if (centroid[i]! > centroid[topIdx]!) topIdx = i
      }
      return `${PERSON_STAT_META[PERSON_STAT_KEYS[topIdx]!].label}형 (C${idx + 1})`
    }
    return `${PERSON_STAT_META[groupKey as PersonStatKey].label}형`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <ControlsRow>
        <ControlGroup>
          <ControlLabel>색상</ControlLabel>
          <ControlSelect value={colorMode} onChange={(e) => setColorMode(e.target.value as ColorMode)}>
            <option value="top">톱축</option>
            <option value="kmeans">K-means 클러스터</option>
          </ControlSelect>
        </ControlGroup>
        {colorMode === 'kmeans' && (
          <ControlGroup>
            <ControlLabel>K</ControlLabel>
            <ControlSelect value={String(k)} onChange={(e) => setK(Number(e.target.value))}>
              {[3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </ControlSelect>
          </ControlGroup>
        )}
        <CountHint>
          {pcaInput.length}명 plotting (6축 모두 채워진 인물)
        </CountHint>
      </ControlsRow>

      {pcaInput.length < 3 ? (
        <EmptyHint>
          PCA에 최소 3명 (6축 모두 채움) 필요. 현재 {pcaInput.length}명.
        </EmptyHint>
      ) : (
        <>
          <ChartShell $h={520}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 16, right: 24, bottom: 36, left: 36 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                <XAxis
                  type="number"
                  dataKey="x"
                  tick={{ fontSize: 10, fill: chart.tick }}
                  label={{
                    value: `PC1 — ${loadingHint.pc1} (${explained.pc1}%)`,
                    position: 'insideBottom',
                    offset: -16,
                    fontSize: 12,
                    fill: chart.axisLabel,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  tick={{ fontSize: 10, fill: chart.tick }}
                  label={{
                    value: `PC2 — ${loadingHint.pc2} (${explained.pc2}%)`,
                    angle: -90,
                    position: 'insideLeft',
                    offset: 0,
                    fontSize: 12,
                    fill: chart.axisLabel,
                  }}
                />
                <ZAxis type="number" dataKey="influence" range={[60, 280]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ borderRadius: 10, fontSize: 12, border: `1px solid ${chart.border}`, padding: 10 }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload[0]) return null
                    const d: any = payload[0].payload
                    return (
                      <div style={{ background: chart.tooltipBg, color: chart.text, border: `1px solid ${chart.border}`, borderRadius: 10, padding: 10, fontSize: 12, minWidth: 200 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.name}</div>
                        <div style={{ color: chart.tooltipText, fontSize: 11, marginBottom: 6 }}>
                          {d.country}{d.faction ? ` · ${d.faction}` : ''} · 영향력 {d.influence}
                        </div>
                        {/* C4: 6축 미니 표 */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                          {PERSON_STAT_KEYS.map((key, i) => (
                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11 }}>
                              <span style={{ color: PERSON_STAT_META[key].color, fontWeight: 600 }}>
                                {PERSON_STAT_META[key].label}
                              </span>
                              <span style={{ fontWeight: 700 }}>{d.stats6?.[i] ?? '—'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  }}
                />
                {Array.from(series.entries()).map(([groupKey, data]) => (
                  <Scatter
                    key={groupKey}
                    name={labelOf(groupKey)}
                    data={data}
                    fill={colorOf(groupKey)}
                    fillOpacity={0.55}
                    stroke={colorOf(groupKey)}
                    strokeWidth={1}
                    onClick={(e: any) => e?.id && onPersonClick(e.id)}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </ChartShell>
          <Legend>
            {Array.from(series.entries()).map(([groupKey, data]) => (
              <LegendItem key={groupKey}>
                <LegendDot style={{ background: colorOf(groupKey) }} />
                <LegendName>{labelOf(groupKey)}</LegendName>
                <LegendCount>{data.length}명</LegendCount>
              </LegendItem>
            ))}
          </Legend>
          <ChartHint>
            점 크기 = 영향력. PC1·PC2 = 6차원 능력치의 주성분. 비슷한 강세 인물끼리 가까이 표시됨. 점 hover 시 6축 미리보기.
          </ChartHint>
        </>
      )}
    </div>
  )
}
