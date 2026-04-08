import React, { useMemo } from 'react'

import { useTheme } from 'styled-components'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'

import {
  type ContinentOption,
  type Country,
} from '@/entities/country/api'
import { type UnifiedCountry } from '@/entities/country/model/unified-types'

import * as S from './country-dashboard.styles'

const PIE_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#94a3b8',
]

/** 대륙별 분포용 */
const CONTINENT_PIE_COLORS = [
  '#3b82f6',
  '#06b6d4',
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#64748b',
]

const METRIC_PALETTES: Record<
  'population' | 'gdp' | 'area',
  string[]
> = {
  population: [
    '#0ea5e9',
    '#38bdf8',
    '#7dd3fc',
    '#0369a1',
    '#0284c7',
    '#bae6fd',
    '#0c4a6e',
    '#38bdf8',
    '#94a3b8',
  ],
  gdp: [
    '#059669',
    '#10b981',
    '#34d399',
    '#047857',
    '#6ee7b7',
    '#a7f3d0',
    '#065f46',
    '#34d399',
    '#94a3b8',
  ],
  area: [
    '#d97706',
    '#f59e0b',
    '#fbbf24',
    '#b45309',
    '#fcd34d',
    '#78350f',
    '#f59e0b',
    '#fde68a',
    '#94a3b8',
  ],
}

type CountryWithOptionalGdp = Country & { gdpUsdBn?: number | null }

function shortLabel(name: string, max = 10): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name
}

function useInfographicTooltipStyle() {
  const theme = useTheme()
  const tooltipBg =
    theme.mode === 'dark' ? 'rgba(30,30,32,0.96)' : 'rgba(255,255,255,0.98)'
  const tooltipBorder =
    theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e2e8f0'
  return { theme, tooltipBg, tooltipBorder }
}

function useInfographicAxes() {
  const theme = useTheme()
  const axisMuted =
    theme.mode === 'dark' ? 'rgba(255,255,255,0.45)' : '#64748b'
  const gridLine =
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
  return { theme, axisMuted, gridLine }
}

function formatCompact(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(Math.round(n))
}

/** 대륙별 등록 국가 수 — 도넛(비중) + 막대 */
export function ContinentDistributionInfographic({
  continents,
  countries,
}: {
  continents: ContinentOption[]
  countries: Country[]
}) {
  const { theme, axisMuted, gridLine } = useInfographicAxes()
  const { tooltipBg, tooltipBorder } = useInfographicTooltipStyle()

  const { pieRows, barRows, totalCountries } = useMemo(() => {
    const rows = continents.map((ct) => ({
      id: ct.id,
      name: ct.name,
      shortLabel: shortLabel(ct.name, 12),
      value: countries.filter((c) => c.continentId === ct.id).length,
    }))
    const pieRows = rows
      .filter((r) => r.value > 0)
      .map((r) => ({ name: r.shortLabel, value: r.value }))
    const barRows = [...rows]
      .sort((a, b) => b.value - a.value)
      .map((r) => ({ label: r.shortLabel, value: r.value }))
    return {
      pieRows,
      barRows,
      totalCountries: countries.length,
    }
  }, [continents, countries])

  if (countries.length === 0) {
    return (
      <S.InfographicEmpty>등록된 국가가 없습니다.</S.InfographicEmpty>
    )
  }

  if (pieRows.length === 0) {
    return (
      <S.InfographicEmpty>
        대륙에 속한 국가가 없습니다. 국가에 대륙을 지정해 주세요.
      </S.InfographicEmpty>
    )
  }

  return (
    <S.InfographicSplit>
      <S.DonutWrap>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={pieRows}
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="82%"
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {pieRows.map((_, i) => (
                <Cell
                  key={`ct-${i}`}
                  fill={CONTINENT_PIE_COLORS[i % CONTINENT_PIE_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [
                `${value}개국`,
                '등록 국가',
              ]}
              contentStyle={{
                background: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: 12,
                fontSize: 12,
                color: theme.colors.text.primary,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <S.DonutCenter>
          <S.DonutCenterValue>{totalCountries}</S.DonutCenterValue>
          <S.DonutCenterLabel>등록 국가</S.DonutCenterLabel>
          <S.DonutCenterHint>대륙별 비중 · 막대는 국가 수</S.DonutCenterHint>
        </S.DonutCenter>
      </S.DonutWrap>

      <S.BarPanel>
        <S.BarPanelTitle>대륙별 국가 수</S.BarPanelTitle>
        <ResponsiveContainer
          width="100%"
          height={Math.max(260, barRows.length * 32)}
        >
          <BarChart
            data={barRows}
            layout="vertical"
            margin={{ left: 8, right: 28, top: 8, bottom: 8 }}
            barCategoryGap={12}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={gridLine}
              horizontal
              vertical={false}
            />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              width={100}
              tick={{ fill: axisMuted, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number) => [`${value}개국`, '']}
              contentStyle={{
                background: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: 12,
                fontSize: 12,
                color: theme.colors.text.primary,
              }}
            />
            <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={18}>
              {barRows.map((_, i) => (
                <Cell
                  key={`cb-${i}`}
                  fill={CONTINENT_PIE_COLORS[i % CONTINENT_PIE_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </S.BarPanel>
    </S.InfographicSplit>
  )
}

export type RankingMetricKind = 'population' | 'gdp' | 'area'

/** 인구 / GDP / 면적 상위 국가 — 도넛(비중) + 막대 */
export function MetricRankingInfographic({
  countries,
  kind,
  topN = 8,
}: {
  countries: Country[]
  kind: RankingMetricKind
  topN?: number
}) {
  const { theme, axisMuted, gridLine } = useInfographicAxes()
  const { tooltipBg, tooltipBorder } = useInfographicTooltipStyle()
  const palette = METRIC_PALETTES[kind]

  const formatTooltip = (v: number): string => {
    if (kind === 'population') return `${formatCompact(v)} (명)`
    if (kind === 'gdp') return `${v.toLocaleString(undefined, { maximumFractionDigits: 1 })}B USD`
    return `${v.toLocaleString()} km²`
  }

  const centerTitle =
    kind === 'population'
      ? '인구 합계'
      : kind === 'gdp'
        ? 'GDP 합계'
        : '면적 합계'

  const { pieRows, barRows, totalAll, showEmpty } = useMemo(() => {
    const valueOf = (c: Country): number => {
      if (kind === 'population') return Number(c.population) || 0
      if (kind === 'area') return Number(c.areaSqKm) || 0
      const g = (c as CountryWithOptionalGdp).gdpUsdBn
      return g != null ? Number(g) || 0 : 0
    }

    const pool =
      kind === 'gdp'
        ? countries.filter((c) => valueOf(c) > 0)
        : [...countries]

    const sorted = [...pool].sort((a, b) => valueOf(b) - valueOf(a))
    const totalAll = sorted.reduce((s, c) => s + valueOf(c), 0)

    if (sorted.length === 0 || totalAll === 0) {
      return {
        pieRows: [] as { name: string; value: number }[],
        barRows: [] as { label: string; value: number }[],
        totalAll: 0,
        showEmpty: true,
      }
    }

    const top = sorted.slice(0, topN)
    const topSum = top.reduce((s, c) => s + valueOf(c), 0)
    const rest = totalAll - topSum

    const pieRows = [
      ...top.map((c) => ({
        name: shortLabel(c.name, 10),
        value: valueOf(c),
      })),
      ...(rest > 0 ? [{ name: '기타', value: rest }] : []),
    ]

    const barRows = top.map((c) => ({
      label: shortLabel(c.name, 12),
      value: valueOf(c),
    }))

    return { pieRows, barRows, totalAll, showEmpty: false }
  }, [countries, kind, topN])

  if (showEmpty) {
    const msg =
      kind === 'gdp'
        ? 'GDP(십억 달러) 데이터가 있는 국가가 없습니다.'
        : kind === 'population'
          ? '인구 데이터가 있는 국가가 없습니다.'
          : '면적 데이터가 있는 국가가 없습니다.'
    return <S.InfographicEmpty>{msg}</S.InfographicEmpty>
  }

  const centerMain =
    kind === 'population'
      ? formatCompact(totalAll)
      : kind === 'gdp'
        ? `${totalAll.toLocaleString(undefined, { maximumFractionDigits: 1 })}B`
        : formatCompact(totalAll)

  return (
    <S.InfographicSplit>
      <S.DonutWrap>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={pieRows}
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="82%"
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {pieRows.map((_, i) => (
                <Cell key={`m-${i}`} fill={palette[i % palette.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [formatTooltip(value), '']}
              contentStyle={{
                background: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: 12,
                fontSize: 12,
                color: theme.colors.text.primary,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <S.DonutCenter>
          <S.DonutCenterValue>{centerMain}</S.DonutCenterValue>
          <S.DonutCenterLabel>{centerTitle}</S.DonutCenterLabel>
          <S.DonutCenterHint>
            상위 {topN}개국 + 기타 비중 · 등록 국가 기준
          </S.DonutCenterHint>
        </S.DonutCenter>
      </S.DonutWrap>

      <S.BarPanel>
        <S.BarPanelTitle>상위 국가</S.BarPanelTitle>
        <ResponsiveContainer
          width="100%"
          height={Math.max(260, barRows.length * 36)}
        >
          <BarChart
            data={barRows}
            layout="vertical"
            margin={{ left: 8, right: 28, top: 8, bottom: 8 }}
            barCategoryGap={14}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={gridLine}
              horizontal
              vertical={false}
            />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              width={108}
              tick={{ fill: axisMuted, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number) => [formatTooltip(value), '']}
              contentStyle={{
                background: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: 12,
                fontSize: 12,
                color: theme.colors.text.primary,
              }}
            />
            <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={20}>
              {barRows.map((_, i) => (
                <Cell key={`mb-${i}`} fill={palette[i % palette.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </S.BarPanel>
    </S.InfographicSplit>
  )
}

/** 등록 인물 — 도넛(비중) + 가로 막대(순위) */
export function PersonsInfographic({
  countries,
  personCountByModernCountryId,
  isLoading,
}: {
  countries: Country[]
  personCountByModernCountryId: Record<string, number>
  isLoading: boolean
}) {
  const theme = useTheme()
  const axisMuted =
    theme.mode === 'dark' ? 'rgba(255,255,255,0.45)' : '#64748b'
  const gridLine =
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
  const tooltipBg =
    theme.mode === 'dark' ? 'rgba(30,30,32,0.96)' : 'rgba(255,255,255,0.98)'
  const tooltipBorder =
    theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e2e8f0'

  const { pieRows, barRows, totalPersonLinks } = useMemo(() => {
    const ranked = [...countries]
      .map((c) => ({
        id: c.id,
        label: `${c.flagEmoji ? `${c.flagEmoji} ` : ''}${c.name}`,
        shortLabel:
          c.name.length > 10 ? `${c.name.slice(0, 9)}…` : c.name,
        count: personCountByModernCountryId[c.id] ?? 0,
      }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count)

    const top = ranked.slice(0, 8)
    const topSum = top.reduce((s, x) => s + x.count, 0)
    const allSum = ranked.reduce((s, x) => s + x.count, 0)
    const rest = allSum - topSum

    const pieRows = [
      ...top.map((x) => ({ name: x.shortLabel, value: x.count })),
      ...(rest > 0 ? [{ name: '기타', value: rest }] : []),
    ]

    const barRows = top.map((x) => ({
      label: x.shortLabel,
      count: x.count,
    }))

    return {
      pieRows,
      barRows,
      totalPersonLinks: allSum,
    }
  }, [countries, personCountByModernCountryId])

  if (isLoading) {
    return (
      <S.InfographicEmpty>
        등록 인물 통계를 불러오는 중…
      </S.InfographicEmpty>
    )
  }

  if (pieRows.length === 0 || totalPersonLinks === 0) {
    return (
      <S.InfographicEmpty>
        아직 국가에 연결된 인물이 없습니다.
      </S.InfographicEmpty>
    )
  }

  return (
    <S.InfographicSplit>
      <S.DonutWrap>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={pieRows}
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="82%"
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {pieRows.map((_, i) => (
                <Cell
                  key={`p-${i}`}
                  fill={PIE_COLORS[i % PIE_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [
                `${value.toLocaleString()}명`,
                '연결 인물',
              ]}
              contentStyle={{
                background: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: 12,
                fontSize: 12,
                color: theme.colors.text.primary,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <S.DonutCenter>
          <S.DonutCenterValue>
            {totalPersonLinks.toLocaleString()}
          </S.DonutCenterValue>
          <S.DonutCenterLabel>연결 합계(건)</S.DonutCenterLabel>
          <S.DonutCenterHint>
            동일 인물이 여러 국가에 잡히면 합산에 반복됩니다
          </S.DonutCenterHint>
        </S.DonutCenter>
      </S.DonutWrap>

      <S.BarPanel>
        <S.BarPanelTitle>상위 국가</S.BarPanelTitle>
        <ResponsiveContainer width="100%" height={Math.max(260, barRows.length * 36)}>
          <BarChart
            data={barRows}
            layout="vertical"
            margin={{ left: 8, right: 28, top: 8, bottom: 8 }}
            barCategoryGap={14}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={gridLine}
              horizontal
              vertical={false}
            />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              width={108}
              tick={{ fill: axisMuted, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number) => [`${value.toLocaleString()}명`, '']}
              contentStyle={{
                background: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: 12,
                fontSize: 12,
                color: theme.colors.text.primary,
              }}
            />
            <Bar dataKey="count" radius={[0, 10, 10, 0]} barSize={20}>
              {barRows.map((_, i) => (
                <Cell
                  key={`b-${i}`}
                  fill={PIE_COLORS[i % PIE_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </S.BarPanel>
    </S.InfographicSplit>
  )
}

export type ScatterCountryPoint = {
  id: string
  name: string
  population: number
  persons: number
  area: number
}

/** 인구 × 등록 인물 산점도 (버블 크기 ∝ 면적) */
export function CountryComparisonScatter({
  filtered,
  personCountByModernCountryId,
  isLoadingPersonCounts,
  onModernCountryClick,
}: {
  filtered: UnifiedCountry[]
  personCountByModernCountryId: Record<string, number>
  isLoadingPersonCounts: boolean
  onModernCountryClick?: (country: Country) => void
}) {
  const theme = useTheme()
  const axisMuted =
    theme.mode === 'dark' ? 'rgba(255,255,255,0.45)' : '#64748b'
  const gridLine =
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
  const tooltipBg =
    theme.mode === 'dark' ? 'rgba(30,30,32,0.96)' : 'rgba(255,255,255,0.98)'
  const tooltipBorder =
    theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e2e8f0'

  const data = useMemo((): ScatterCountryPoint[] => {
    return filtered
      .filter((c) => c.type === 'modern')
      .map((c) => ({
        id: c.id,
        name: `${c.flagEmoji ? `${c.flagEmoji} ` : ''}${c.name}`,
        population: Math.max(Number(c.population) || 0, 0),
        persons: personCountByModernCountryId[c.id] ?? 0,
        area: Math.max(Number(c.areaSqKm) || 0, 1),
      }))
  }, [filtered, personCountByModernCountryId])

  const toCountry = (id: string): Country | undefined => {
    const c = filtered.find((x) => x.id === id && x.type === 'modern')
    if (!c) return undefined
    return {
      id: c.id,
      name: c.name,
      fullName: c.fullName ?? undefined,
      localName: c.localName,
      isoCode: c.isoCode,
      flagEmoji: c.flagEmoji,
      capital: c.capital,
      population: c.population,
      areaSqKm: c.areaSqKm,
      thumbnailUrl: c.thumbnailUrl || undefined,
      continentId: c.continentId,
      defaultNameDisplayOrder: c.defaultNameDisplayOrder ?? undefined,
    }
  }

  if (isLoadingPersonCounts) {
    return (
      <S.InfographicEmpty style={{ minHeight: 360 }}>
        그래프 데이터를 불러오는 중…
      </S.InfographicEmpty>
    )
  }

  if (data.length === 0) {
    return (
      <S.InfographicEmpty style={{ minHeight: 360 }}>
        표시할 현대 국가가 없습니다.
      </S.InfographicEmpty>
    )
  }

  return (
    <>
      <S.ScatterChartWrap>
        <ResponsiveContainer width="100%" height={420}>
          <ScatterChart margin={{ top: 16, right: 24, bottom: 16, left: 16 }}>
            <CartesianGrid strokeDasharray="4 4" stroke={gridLine} />
            <XAxis
              type="number"
              dataKey="population"
              name="인구"
              tick={{ fill: axisMuted, fontSize: 11 }}
              tickFormatter={(v) => formatCompact(v)}
              label={{
                value: '인구',
                position: 'insideBottom',
                offset: -4,
                fill: axisMuted,
                fontSize: 11,
              }}
            />
            <YAxis
              type="number"
              dataKey="persons"
              name="등록 인물"
              tick={{ fill: axisMuted, fontSize: 11 }}
              label={{
                value: '등록 인물',
                angle: -90,
                position: 'insideLeft',
                fill: axisMuted,
                fontSize: 11,
              }}
            />
            <ZAxis type="number" dataKey="area" range={[70, 320]} />
            <Tooltip
              cursor={{ strokeDasharray: '4 4', stroke: theme.colors.primary }}
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null
                const p = payload[0].payload as ScatterCountryPoint
                return (
                  <div
                    style={{
                      background: tooltipBg,
                      border: `1px solid ${tooltipBorder}`,
                      borderRadius: 12,
                      padding: '10px 12px',
                      fontSize: 12,
                      color: theme.colors.text.primary,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>
                      {p.name}
                    </div>
                    <div>인구: {p.population.toLocaleString()}</div>
                    <div>등록 인물: {p.persons.toLocaleString()}명</div>
                    <div>면적: {p.area.toLocaleString()} km²</div>
                    {onModernCountryClick && (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 11,
                          color: theme.colors.primary,
                        }}
                      >
                        클릭하여 국가 수정
                      </div>
                    )}
                  </div>
                )
              }}
            />
            <Scatter
              data={data}
              fill={theme.colors.primary}
              fillOpacity={0.72}
              style={{ cursor: onModernCountryClick ? 'pointer' : 'default' }}
              onClick={(point: { payload?: ScatterCountryPoint }) => {
                const raw = point?.payload
                if (!raw?.id || !onModernCountryClick) return
                const co = toCountry(raw.id)
                if (co) onModernCountryClick(co)
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </S.ScatterChartWrap>
      <S.ScatterFootnote>
        가로축 인구 · 세로축 등록 인물 · 점 크기는 국토 면적에 비례합니다.
        {onModernCountryClick ? ' 점을 누르면 해당 국가 수정 모달이 열립니다.' : ''}
      </S.ScatterFootnote>
    </>
  )
}
