/**
 * 인물 인포그래픽 콘텐츠
 * - 헤더 + 검색 + 뷰 전환 + 통계 스트립 + 시대 칩 + 뷰 영역(매트릭스/은하계/스토리/왕조)
 * - 필터·뷰 상태는 zustand store(usePersonInfographicFilterStore)로 공유.
 * - 좌측 NavRail은 분리(PersonFilterPanel).
 */
import React, { useCallback, useMemo, useState } from 'react'

import { motion } from 'framer-motion'
import { FiPlus, FiSearch, FiX } from 'react-icons/fi'
import styled, { css, useTheme } from 'styled-components'

import { usePersons } from '@/entities/person/api'
import type { Person } from '@/entities/person/api'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import {
  glassOrSolidMixin,
  scrollbarThinMixin,
} from '@/shared/styles/mixins'
import {
  PersonTabSharedDesc,
  PersonTabSharedHeader,
  PersonTabSharedHeaderLeft,
  PersonTabSharedHeaderRight,
  PersonTabSharedTitle,
} from '@/widgets/country/country-detail/ui/country-detail.styles'
import { PersonRegisterViewModal } from '@/widgets/country/country-list/ui/person-register-view-modal'
import {
  ERAS,
  FIELDS,
  REGIONS,
  REGION_COLORS,
  adapt,
  hueFrom,
  yearOfEra,
  usePersonInfographicFilterStore,
  type AdaptedPerson,
  type PersonInfographicView,
} from '@/widgets/person-infographic'

// 검색 하이라이트
function highlight(text: string, q: string): React.ReactNode {
  const trimmed = q.trim()
  if (!trimmed) return text
  const idx = text.toLowerCase().indexOf(trimmed.toLowerCase())
  if (idx < 0) return text
  return (
    <>
      {text.slice(0, idx)}
      <HLMark>{text.slice(idx, idx + trimmed.length)}</HLMark>
      {text.slice(idx + trimmed.length)}
    </>
  )
}

// ================================================================
// HEADER STATS STRIP (4-column)
// ================================================================
function HeaderStats({ people }: { people: AdaptedPerson[] }) {
  const theme = useTheme()
  const dark = theme.mode === 'dark'

  // 히스토그램
  const MIN_Y = -200, RANGE = 2230, BINS = 26, binW = RANGE / BINS
  const bins = new Array(BINS).fill(0)
  people.forEach((p) => {
    const i = Math.min(BINS - 1, Math.max(0, Math.floor((p.activityYear - MIN_Y) / binW)))
    bins[i]++
  })
  const maxBin = Math.max(1, ...bins)

  // 지역 파이
  const regC: Record<string, number> = {}
  people.forEach((p) => { regC[p.region] = (regC[p.region] || 0) + 1 })
  const total = people.length || 1

  // 분야
  const fieldC: Record<string, number> = {}
  people.forEach((p) => { fieldC[p.field] = (fieldC[p.field] || 0) + 1 })
  const fieldMax = Math.max(1, ...Object.values(fieldC))

  // 상위 국가
  const ctC: Record<string, number> = {}
  people.forEach((p) => { ctC[p.country] = (ctC[p.country] || 0) + 1 })
  const topCt = Object.entries(ctC).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const ctMax = topCt[0]?.[1] || 1

  const muted = dark ? 'rgba(255,255,255,0.3)' : '#9ca3af'
  const textPri = dark ? '#f5f5f5' : '#111827'
  const barBg = dark ? 'rgba(255,255,255,0.08)' : '#f3f4f6'

  const VB_W = 1200
  const CHART_H = 90
  const LABEL_H = 22
  // 연도 눈금
  const yearTicks: number[] = []
  for (let y = Math.ceil(MIN_Y / 200) * 200; y <= MIN_Y + RANGE; y += 200) yearTicks.push(y)

  return (
    <StatsStrip>
      {/* 시대 밀도 — 전체 너비 */}
      <EraDensityCard>
        <EraDensityHead>
          <StatLabel>시대 밀도</StatLabel>
          <EraDensityLegend>
            {ERAS.map((e) => (
              <EraDensityLegendItem key={e.key}>
                <span style={{ background: e.color }} />
                {e.lbl}
              </EraDensityLegendItem>
            ))}
          </EraDensityLegend>
        </EraDensityHead>
        <svg viewBox={`0 0 ${VB_W} ${CHART_H + LABEL_H}`} width="100%" style={{ display: 'block', marginTop: 6 }}>
          {/* 시대 배경 영역 */}
          {ERAS.map((e) => {
            const x1 = Math.max(0, ((e.from - MIN_Y) / RANGE) * VB_W)
            const x2 = Math.min(VB_W, ((e.to - MIN_Y) / RANGE) * VB_W)
            return <rect key={e.key} x={x1} y={0} width={x2 - x1} height={CHART_H} fill={e.color} opacity={0.08} />
          })}
          {/* 연도 눈금선 */}
          {yearTicks.map((y) => {
            const x = ((y - MIN_Y) / RANGE) * VB_W
            return <line key={y} x1={x} y1={0} x2={x} y2={CHART_H} stroke={dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'} strokeWidth={1} strokeDasharray="3 4" />
          })}
          {/* 히스토그램 */}
          {bins.map((n, i) => {
            const barW = VB_W / BINS
            const x = (i / BINS) * VB_W
            const h = (n / maxBin) * (CHART_H - 6)
            return (
              <rect
                key={i}
                x={x + 2}
                y={CHART_H - h}
                width={barW - 4}
                height={h}
                rx={2}
                fill={yearOfEra(MIN_Y + binW * (i + 0.5)).color}
                opacity={0.88}
              />
            )
          })}
          {/* 연도 라벨 */}
          {yearTicks.map((y) => {
            const x = ((y - MIN_Y) / RANGE) * VB_W
            return (
              <text
                key={y}
                x={x}
                y={CHART_H + 10}
                textAnchor="middle"
                fontSize={9}
                fill={dark ? 'rgba(255,255,255,0.35)' : '#9ca3af'}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {y < 0 ? `${-y}BC` : y === 0 ? '0' : y}
              </text>
            )
          })}
          {/* 시대 라벨 */}
          {ERAS.map((e) => {
            const x = (((e.from + e.to) / 2 - MIN_Y) / RANGE) * VB_W
            return (
              <text
                key={e.key}
                x={x}
                y={CHART_H + LABEL_H - 1}
                textAnchor="middle"
                fontSize={11}
                fill={e.color}
                fontWeight={700}
              >
                {e.lbl}
              </text>
            )
          })}
        </svg>
      </EraDensityCard>

      {/* 지역 파이 */}
      <StatCard>
        <StatLabel>지역 분포</StatLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <svg viewBox="0 0 64 64" width={56} height={56} style={{ flexShrink: 0 }}>
            {(() => {
              let acc = 0
              return REGIONS.filter((r) => regC[r]).map((r) => {
                const n = regC[r] || 0, start = (acc / total) * Math.PI * 2 - Math.PI / 2
                acc += n
                const end = (acc / total) * Math.PI * 2 - Math.PI / 2
                const x1 = 32 + Math.cos(start) * 26, y1 = 32 + Math.sin(start) * 26
                const x2 = 32 + Math.cos(end) * 26, y2 = 32 + Math.sin(end) * 26
                return <path key={r} d={`M32 32 L${x1} ${y1} A26 26 0 ${end - start > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`} fill={REGION_COLORS[REGIONS.indexOf(r) % REGION_COLORS.length]} />
              })
            })()}
            <circle cx={32} cy={32} r={13} fill={dark ? '#171717' : '#fff'} />
          </svg>
          <div style={{ flex: 1, fontSize: 11, lineHeight: 1.7 }}>
            {REGIONS.filter((r) => regC[r]).sort((a, b) => (regC[b] || 0) - (regC[a] || 0)).slice(0, 4).map((r) => (
              <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: 1, background: REGION_COLORS[REGIONS.indexOf(r)], flexShrink: 0 }} />
                <span style={{ flex: 1, color: muted }}>{r}</span>
                <span style={{ fontWeight: 600, color: textPri }}>{regC[r]}</span>
              </div>
            ))}
          </div>
        </div>
      </StatCard>

      {/* 분야 */}
      <StatCard>
        <StatLabel>분야</StatLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {FIELDS.filter((f) => fieldC[f]).map((f) => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 28, fontSize: 11, color: muted }}>{f}</span>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: barBg, position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: ((fieldC[f] || 0) / fieldMax * 100) + '%', borderRadius: 2, background: '#6366f1' }} />
              </div>
              <span style={{ width: 18, fontSize: 10, textAlign: 'right', color: muted }}>{fieldC[f]}</span>
            </div>
          ))}
        </div>
      </StatCard>

      {/* 상위 국가 */}
      <StatCard>
        <StatLabel>상위 국가</StatLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
          {topCt.map(([c, n], i) => (
            <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 14, fontSize: 10, color: muted, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: 11, color: dark ? 'rgba(255,255,255,0.7)' : '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c}</span>
              <div style={{ width: 40, height: 3, borderRadius: 2, background: barBg, position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: (n / ctMax * 100) + '%', borderRadius: 2, background: '#6366f1' }} />
              </div>
              <span style={{ width: 18, fontSize: 10, textAlign: 'right', color: muted }}>{n}</span>
            </div>
          ))}
        </div>
      </StatCard>
    </StatsStrip>
  )
}

const StatsStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 16px;
`
const StatCard = styled.div`
  border-radius: 12px;
  padding: 14px 16px;
  ${({ theme }) => glassOrSolidMixin(theme)}
`
const EraDensityCard = styled(StatCard)`
  grid-column: 1 / -1;
  padding: 12px 16px 8px;
`
const EraDensityHead = styled.div`
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
`
const EraDensityLegend = styled.div`
  display: flex; gap: 10px; margin-left: auto; flex-wrap: wrap;
`
const EraDensityLegendItem = styled.span`
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; color: ${({ theme }) => theme.colors.text.secondary};
  > span:first-child {
    width: 10px; height: 10px; border-radius: 3px; display: inline-block;
  }
`
const StatLabel = styled.div`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

// ================================================================
// VIEW 1: TIMELINE MATRIX
// ================================================================
function TimelineMatrix({ people, onOpen }: { people: AdaptedPerson[]; onOpen: (id: string) => void }) {
  const theme = useTheme()
  const dark = theme.mode === 'dark'
  const [hover, setHover] = useState<{ p: AdaptedPerson; x: number; y: number } | null>(null)

  const byCountry: Record<string, AdaptedPerson[]> = {}
  people.forEach((p) => { (byCountry[p.country] = byCountry[p.country] || []).push(p) })
  const countries = Object.entries(byCountry).sort((a, b) => b[1].length - a[1].length)

  if (!countries.length) return <EmptyState>인물 데이터가 없습니다. 국가·시대·분야 필터를 확인해보세요.</EmptyState>

  const minY = Math.min(...people.map((p) => p.born))
  const maxY = Math.max(...people.map((p) => p.died))
  const rng = Math.max(1, maxY - minY)
  const W = 1100, LANE_H = 18, GAP_PX = 2
  const yearX = (y: number) => ((y - minY) / rng) * W

  // 국가별 lane 패킹: 생년 순으로 그리디 배치 → 겹치는 인물만 새 라인으로 내려간다
  const packed = countries.map(([c, arr]) => {
    const sorted = [...arr].sort((a, b) => a.born - b.born)
    const lanes: number[] = []
    const placed = sorted.map((p) => {
      const x1 = yearX(p.born)
      const x2 = Math.max(x1 + 3, yearX(p.died))
      let lane = lanes.findIndex((rightX) => rightX + GAP_PX <= x1)
      if (lane === -1) { lanes.push(x2); lane = lanes.length - 1 }
      else lanes[lane] = x2
      return { p, x1, x2, lane }
    })
    const laneCount = Math.max(1, lanes.length)
    return { country: c, count: arr.length, placed, rowH: laneCount * LANE_H + 4 }
  })
  const totalRowH = packed.reduce((s, r) => s + r.rowH, 0)

  const startDec = Math.ceil(minY / 50) * 50
  const ticks: number[] = []
  for (let y = startDec; y <= maxY; y += 50) ticks.push(y)

  const gridLine = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'
  const tickLine = dark ? 'rgba(255,255,255,0.07)' : '#e5e7eb'

  return (
    <ViewPanel>
      <ViewPanelHeader>
        <span style={{ fontWeight: 600, fontSize: 14, color: dark ? '#f5f5f5' : '#111' }}>국가 × 연도 매트릭스</span>
        <ViewPanelDesc>가로 = 생몰 연도 · 막대 두께 = 영향력 · 같은 국가에서 시기가 겹치면 다음 줄로</ViewPanelDesc>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {ERAS.map((e) => (
            <span key={e.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: e.color }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: e.color, display: 'inline-block' }} />{e.lbl}
            </span>
          ))}
        </div>
      </ViewPanelHeader>
      <MatrixScroll>
        <div style={{ display: 'grid', gridTemplateColumns: `130px ${W}px` }}>
          {/* label col */}
          <MatrixLabels>
            <MatrixAxisRow><MatrixAxisTxt>국가 / 인물수</MatrixAxisTxt></MatrixAxisRow>
            {packed.map(({ country: c, count, rowH }) => (
              <MatrixLabelRow key={c} style={{ height: rowH }}>
                <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c}</span>
                <span style={{ fontSize: 10, color: theme.colors.text.tertiary }}>{count}</span>
              </MatrixLabelRow>
            ))}
          </MatrixLabels>
          {/* timeline */}
          <div style={{ position: 'relative' }}>
            <svg width={W} height={30 + totalRowH} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
              {ERAS.map((e) => {
                const x1 = Math.max(0, yearX(Math.max(e.from, minY))), x2 = Math.min(W, yearX(Math.min(e.to, maxY)))
                if (x2 <= x1) return null
                return <rect key={e.key} x={x1} y={0} width={x2 - x1} height={30 + totalRowH} fill={e.color} opacity={0.04} />
              })}
              {ticks.map((y) => (
                <line key={y} x1={yearX(y)} y1={30} x2={yearX(y)} y2={30 + totalRowH} stroke={tickLine} strokeWidth={0.5} strokeDasharray="2 5" />
              ))}
            </svg>
            {/* year axis */}
            <div style={{ height: 30, position: 'relative' }}>
              {ticks.filter((_, i) => i % 2 === 0).map((y) => (
                <div key={y} style={{ position: 'absolute', left: yearX(y), top: 0, fontSize: 9, color: dark ? 'rgba(255,255,255,0.3)' : '#9ca3af', transform: 'translateX(-50%)', paddingTop: 8, fontVariantNumeric: 'tabular-nums' }}>
                  {y < 0 ? `${-y}BC` : y}
                </div>
              ))}
            </div>
            {/* rows */}
            {packed.map(({ country: c, placed, rowH }) => (
              <div key={c} style={{ height: rowH, position: 'relative', borderTop: `1px solid ${gridLine}` }}>
                {placed.map(({ p, x1, x2, lane }) => {
                  const barH = Math.min(LANE_H - 3, 4 + (p.influence / 100) * 11)
                  const yy = lane * LANE_H + (LANE_H - barH) / 2
                  const era = yearOfEra(p.activityYear)
                  return (
                    <div
                      key={p.id}
                      onClick={() => onOpen(p.id)}
                      style={{ position: 'absolute', left: x1, top: yy, width: Math.max(3, x2 - x1), height: barH, background: era.color, borderRadius: 2, cursor: 'pointer', opacity: 0.8, transition: 'opacity 0.1s' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; setHover({ p, x: e.clientX, y: e.clientY }) }}
                      onMouseMove={(e) => setHover({ p, x: e.clientX, y: e.clientY })}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.8'; setHover(null) }}
                    />
                  )
                })}
                {placed.filter(({ p, x2, x1 }) => p.influence >= 50 && x2 - x1 >= 36).map(({ p, x1, x2, lane }) => (
                  <div key={'lbl-' + p.id} style={{ position: 'absolute', left: (x1 + x2) / 2, top: lane * LANE_H + 1, transform: 'translateX(-50%)', fontSize: 9, color: dark ? 'rgba(255,255,255,0.7)' : '#374151', pointerEvents: 'none', whiteSpace: 'nowrap', fontWeight: 500, textShadow: dark ? '0 0 3px rgba(0,0,0,0.6)' : '0 0 3px rgba(255,255,255,0.8)' }}>
                    {p.name}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </MatrixScroll>
      {hover && (
        <MatrixTooltip style={{ top: hover.y + 14, left: hover.x + 14 }}>
          {hover.p.profileImageUrl ? (
            <MatrixTooltipImg src={hover.p.profileImageUrl} alt={hover.p.name} />
          ) : (
            <MatrixTooltipImgPh $color={yearOfEra(hover.p.activityYear).color}>
              <svg viewBox="0 0 24 24" fill="currentColor" width={22} height={22}>
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </MatrixTooltipImgPh>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: dark ? '#f5f5f5' : '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hover.p.name}</div>
            <div style={{ fontSize: 11, color: theme.colors.text.secondary, marginTop: 2 }}>
              {hover.p.country}{hover.p.faction ? ` · ${hover.p.faction}` : ''}
            </div>
            <div style={{ fontSize: 10, color: theme.colors.text.tertiary, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
              {hover.p.born < 0 ? `${-hover.p.born}BC` : hover.p.born} – {hover.p.died < 0 ? `${-hover.p.died}BC` : hover.p.died} · 영향력 {hover.p.influence}
            </div>
          </div>
        </MatrixTooltip>
      )}
    </ViewPanel>
  )
}

const MatrixScroll = styled.div`overflow-x: auto; ${scrollbarThinMixin}`
const MatrixTooltip = styled.div`
  position: fixed; z-index: 50; pointer-events: none;
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: 10px; min-width: 180px; max-width: 280px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`background: rgba(20,20,25,0.95); border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 8px 24px rgba(0,0,0,0.4);`
      : css`background: #fff; border: 1px solid #e5e7eb; box-shadow: 0 8px 24px rgba(0,0,0,0.12);`}
`
const MatrixTooltipImg = styled.img`
  width: 44px; height: 44px; border-radius: 8px; object-fit: cover; object-position: top center; flex-shrink: 0;
`
const MatrixTooltipImgPh = styled.div<{ $color: string }>`
  width: 44px; height: 44px; border-radius: 8px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: ${({ $color }) => $color}18; color: ${({ $color }) => $color}; opacity: 0.7;
`
const MatrixLabels = styled.div`
  border-right: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : theme.colors.background.secondary};
`
const MatrixAxisRow = styled.div`height: 30px; display: flex; align-items: center; padding: 0 12px;`
const MatrixAxisTxt = styled.span`font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: ${({ theme }) => theme.colors.text.tertiary};`
const MatrixLabelRow = styled.div`
  display: flex; align-items: center; gap: 6px; padding: 0 10px;
  border-top: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f3f4f6'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

// ================================================================
// VIEW 2: 국가 은하계
// ================================================================
function fieldSvgPath(field: string, cx: number, cy: number, r: number): string {
  switch (field) {
    case '정치': return `M${cx},${cy - r} L${cx + r},${cy} L${cx},${cy + r} L${cx - r},${cy} Z`
    case '군사': { const h = r * 0.87; return `M${cx},${cy - r} L${cx + h},${cy + r * 0.5} L${cx - h},${cy + r * 0.5} Z` }
    case '과학': { const pts = Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2 - Math.PI / 2; return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}` }); return `M${pts.join(' L')} Z` }
    default: return `M${cx},${cy - r} A${r},${r} 0 1 1 ${cx - 0.001},${cy - r} Z`
  }
}

function GalaxyView({ people, onOpen }: { people: AdaptedPerson[]; onOpen: (id: string) => void }) {
  const theme = useTheme()
  const dark = theme.mode === 'dark'

  const byCountry: Record<string, AdaptedPerson[]> = {}
  people.forEach((p) => { (byCountry[p.country] = byCountry[p.country] || []).push(p) })
  const clusters = Object.entries(byCountry).sort((a, b) => b[1].length - a[1].length)

  if (!clusters.length) return <EmptyState>인물 데이터가 없습니다.</EmptyState>

  const CELL_H = 196, W = 240

  return (
    <ViewPanel>
      <ViewPanelHeader>
        <span style={{ fontWeight: 600, fontSize: 14, color: dark ? '#f5f5f5' : '#111' }}>국가 은하계</span>
        <ViewPanelDesc>노드 크기 = 영향력 · 색 = 시대 · 모양 = 분야</ViewPanelDesc>
      </ViewPanelHeader>
      <div style={{ padding: '14px 16px' }}>
        <GalaxyGrid>
          {clusters.map(([country, arr]) => {
            const minYr = Math.min(...arr.map((p) => p.born))
            const maxYr = Math.max(...arr.map((p) => p.died))
            const rng = Math.max(1, maxYr - minYr)
            return (
              <GalaxyCell key={country}>
                <GalaxyCellHdr>
                  <span style={{ fontWeight: 600, fontSize: 13, color: dark ? '#f5f5f5' : '#111' }}>{country}</span>
                  <span style={{ fontSize: 10, color: theme.colors.text.tertiary }}>n={arr.length}</span>
                </GalaxyCellHdr>
                <svg viewBox={`0 0 ${W} ${CELL_H - 36}`} width="100%" height={CELL_H - 36}>
                  <line x1={18} y1={0} x2={18} y2={CELL_H - 50} stroke={dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeWidth={1} />
                  <line x1={18} y1={CELL_H - 50} x2={W - 4} y2={CELL_H - 50} stroke={dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeWidth={1} />
                  {arr.map((p) => {
                    const x = (p.activityYear - minYr) / rng * (W - 40) + 20
                    const y = (CELL_H - 58) - (p.influence / 100) * (CELL_H - 80)
                    const r = 4 + (p.influence / 100) * 9
                    const era = yearOfEra(p.activityYear)
                    return (
                      <g key={p.id} style={{ cursor: 'pointer' }} onClick={() => onOpen(p.id)}>
                        <circle cx={x} cy={y} r={r + 4} fill={era.color} opacity={0.12} />
                        <path d={fieldSvgPath(p.field, x, y, r)} fill={era.color} opacity={0.85} />
                        <text x={x} y={y + r + 9} textAnchor="middle" fontSize={8} fill={dark ? 'rgba(255,255,255,0.5)' : '#6b7280'}>
                          {p.name.length > 7 ? p.name.slice(0, 6) + '…' : p.name}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </GalaxyCell>
            )
          })}
        </GalaxyGrid>
      </div>
    </ViewPanel>
  )
}

const GalaxyGrid = styled.div`display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 10px;`
const GalaxyCell = styled.div`
  border-radius: 10px; padding: 10px; overflow: hidden;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);`
      : css`background: ${theme.colors.background.secondary}; border: 1px solid ${theme.colors.border.light};`}
`
const GalaxyCellHdr = styled.div`display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px;`

// ================================================================
// 공용 인물 카드
// ================================================================
type EraConf = { color: string; lbl: string }
interface PersonCardProps {
  p: AdaptedPerson
  era: EraConf
  q: string
  pinned: boolean
  onTogglePin: (id: string, e: React.MouseEvent) => void
  onOpen: (id: string) => void
}
function PersonCardItem({ p, era, q, pinned, onTogglePin, onOpen }: PersonCardProps) {
  const hue = hueFrom(p.name)
  return (
    <EraCard
      $pinned={pinned}
      title={p.biography ?? undefined}
      onClick={() => onOpen(p.id)}
    >
      <EraCardThumbWrap $color={era.color}>
        {p.profileImageUrl ? (
          <EraCardThumbImg src={p.profileImageUrl} alt={p.name} loading="lazy" />
        ) : (
          <EraCardThumbGradient $hue={hue}>
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" width={46} height={46}>
              <circle cx="24" cy="18" r="8" />
              <path d="M8 40c0-8.8 7.2-14 16-14s16 5.2 16 14" />
            </svg>
          </EraCardThumbGradient>
        )}
        {(p.isMonarch || p.isHeadOfState) && (
          <EraCardBadge
            title={p.isMonarch ? '군주' : '국가원수'}
            style={{ background: p.isMonarch ? '#b45309' : '#1d4ed8' }}
          >
            {p.isMonarch ? (
              <svg viewBox="0 0 24 24" fill="currentColor" width={11} height={11}>
                <path d="M5 16L3 5l5.5 4L12 4l3.5 5L21 5l-2 11H5zm0 2v2h14v-2H5z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width={11} height={11}>
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            )}
          </EraCardBadge>
        )}
        <EraCardPin
          $active={pinned}
          onClick={(e) => onTogglePin(p.id, e)}
          title={pinned ? '핀 해제' : '핀 고정'}
          type="button"
        >
          <svg viewBox="0 0 24 24" fill={pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} width={12} height={12}>
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
          </svg>
        </EraCardPin>
        <EraCardFieldTag $color={era.color}>{p.field}</EraCardFieldTag>
      </EraCardThumbWrap>
      <EraCardBody>
        <EraName title={p.name}>{highlight(p.name, q)}</EraName>
        <EraCountryRow>
          <EraCountryDot style={{ background: era.color }} />
          <EraCountryName title={p.country}>{p.country}</EraCountryName>
          {p.faction && <EraFaction title={p.faction}>· {p.faction}</EraFaction>}
        </EraCountryRow>
        {p.primaryTitle && (
          <EraPrimaryTitle title={p.primaryTitle}>{p.primaryTitle}</EraPrimaryTitle>
        )}
        <EraYear>
          {p.born < 0 ? `${-p.born}BC` : p.born}
          {' – '}
          {p.isAlive ? '현재' : p.died < 0 ? `${-p.died}BC` : p.died}
          {p.age != null && ` · ${p.age}세`}
        </EraYear>
        <EraInfluenceBlock>
          <EraInfluenceHead>
            <EraInfluenceLabel>영향력</EraInfluenceLabel>
            <EraInfluenceValue>{p.influence}</EraInfluenceValue>
          </EraInfluenceHead>
          <EraBarTrack>
            <EraBarFill style={{ width: p.influence + '%', background: era.color }} />
          </EraBarTrack>
        </EraInfluenceBlock>
      </EraCardBody>
    </EraCard>
  )
}

// ================================================================
// VIEW 3: 시대 스토리
// ================================================================
function EraStory({
  people,
  onOpen,
  q,
  pinned,
  togglePin,
}: {
  people: AdaptedPerson[]
  onOpen: (id: string) => void
  q: string
  pinned: Set<string>
  togglePin: (id: string, e: React.MouseEvent) => void
}) {
  const theme = useTheme()
  const [sort, setSort] = useState<'influence' | 'name' | 'year' | 'deathYear'>('influence')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const TOP_N = 20

  const sortFn = (a: AdaptedPerson, b: AdaptedPerson) => {
    const pa = pinned.has(a.id), pb = pinned.has(b.id)
    if (pa !== pb) return pa ? -1 : 1
    if (sort === 'name') return a.name.localeCompare(b.name)
    if (sort === 'year') return a.born - b.born
    if (sort === 'deathYear') return b.died - a.died
    return b.influence - a.influence
  }

  const byEra: Record<string, AdaptedPerson[]> = {}
  people.forEach((p) => { const k = yearOfEra(p.activityYear).key; (byEra[k] = byEra[k] || []).push(p) })
  if (!Object.values(byEra).some((a) => a.length > 0)) return <EmptyState>인물 데이터가 없습니다.</EmptyState>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <EraSortBar>
        <EraSortLabel>정렬</EraSortLabel>
        {([['influence', '영향력'], ['name', '이름'], ['year', '출생연도'], ['deathYear', '사망연도']] as const).map(([k, lbl]) => (
          <EraSortBtn key={k} $active={sort === k} onClick={() => setSort(k)}>{lbl}</EraSortBtn>
        ))}
      </EraSortBar>
      {ERAS.map((era) => {
        const arr = (byEra[era.key] || []).slice().sort(sortFn)
        if (!arr.length) return null
        const isExpanded = !!expanded[era.key]
        const shown = isExpanded ? arr : arr.slice(0, TOP_N)
        const hasMore = arr.length > TOP_N
        return (
          <EraBlock key={era.key}>
            <EraBlockHdr>
              <span style={{ fontSize: 20, fontWeight: 700, color: era.color }}>{era.lbl}</span>
              <span style={{ fontSize: 11, color: theme.colors.text.tertiary }}>{era.from < 0 ? `${-era.from}BC` : era.from} — {era.to}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: theme.colors.text.tertiary }}>{arr.length}명</span>
            </EraBlockHdr>
            <EraCardGrid>
              {shown.map((p) => (
                <PersonCardItem
                  key={p.id}
                  p={p}
                  era={era}
                  q={q}
                  pinned={pinned.has(p.id)}
                  onTogglePin={togglePin}
                  onOpen={onOpen}
                />
              ))}
            </EraCardGrid>
            {hasMore && (
              <EraMoreBtn onClick={() => setExpanded((prev) => ({ ...prev, [era.key]: !prev[era.key] }))}>
                {isExpanded ? '접기' : `+ ${arr.length - TOP_N}명 더보기`}
              </EraMoreBtn>
            )}
          </EraBlock>
        )
      })}
    </div>
  )
}

// ================================================================
// VIEW 4: 왕조별 그룹핑
// ================================================================
function DynastyView({
  people,
  onOpen,
  q,
  pinned,
  togglePin,
}: {
  people: AdaptedPerson[]
  onOpen: (id: string) => void
  q: string
  pinned: Set<string>
  togglePin: (id: string, e: React.MouseEvent) => void
}) {
  const theme = useTheme()
  const byFaction: Record<string, AdaptedPerson[]> = {}
  const noFaction: AdaptedPerson[] = []
  people.forEach((p) => {
    if (p.faction) (byFaction[p.faction] = byFaction[p.faction] || []).push(p)
    else noFaction.push(p)
  })
  const factions = Object.entries(byFaction).sort((a, b) => b[1].length - a[1].length)
  if (!factions.length && !noFaction.length) return <EmptyState>인물 데이터가 없습니다.</EmptyState>

  const sortFn = (a: AdaptedPerson, b: AdaptedPerson) => {
    const pa = pinned.has(a.id), pb = pinned.has(b.id)
    if (pa !== pb) return pa ? -1 : 1
    return a.born - b.born
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {factions.map(([faction, arr]) => {
        const sorted = arr.slice().sort(sortFn)
        const minYr = Math.min(...arr.map((p) => p.born))
        const maxYr = Math.max(...arr.map((p) => p.died))
        const countryName = arr[0]?.country ?? ''
        return (
          <EraBlock key={faction}>
            <EraBlockHdr>
              <span style={{ fontSize: 18, fontWeight: 700, color: theme.colors.text.primary }}>{faction}</span>
              <span style={{ fontSize: 11, color: theme.colors.text.tertiary }}>
                {countryName} · {minYr < 0 ? `${-minYr}BC` : minYr}–{maxYr < 0 ? `${-maxYr}BC` : maxYr}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: theme.colors.text.tertiary }}>{arr.length}명</span>
            </EraBlockHdr>
            <EraCardGrid>
              {sorted.map((p) => {
                const era = yearOfEra(p.activityYear)
                return (
                  <PersonCardItem
                    key={p.id}
                    p={p}
                    era={era}
                    q={q}
                    pinned={pinned.has(p.id)}
                    onTogglePin={togglePin}
                    onOpen={onOpen}
                  />
                )
              })}
            </EraCardGrid>
          </EraBlock>
        )
      })}
      {noFaction.length > 0 && (
        <EraBlock>
          <EraBlockHdr>
            <span style={{ fontSize: 16, fontWeight: 600, color: theme.colors.text.secondary }}>소속 없음</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: theme.colors.text.tertiary }}>{noFaction.length}명</span>
          </EraBlockHdr>
          <EraCardGrid>
            {noFaction.slice().sort(sortFn).map((p) => {
              const era = yearOfEra(p.activityYear)
              return (
                <PersonCardItem
                  key={p.id}
                  p={p}
                  era={era}
                  q={q}
                  pinned={pinned.has(p.id)}
                  onTogglePin={togglePin}
                  onOpen={onOpen}
                />
              )
            })}
          </EraCardGrid>
        </EraBlock>
      )}
    </div>
  )
}

const EraBlock = styled.div`
  border-radius: 12px; padding: 16px 18px;
  ${({ theme }) => glassOrSolidMixin(theme)}
`
const EraBlockHdr = styled.div`display: flex; align-items: baseline; gap: 10px; margin-bottom: 12px;`
const EraSortBar = styled.div`
  display: flex; align-items: center; gap: 4px; padding: 0 2px;
`
const EraSortLabel = styled.span`
  font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-right: 6px;
`
const EraSortBtn = styled.button<{ $active: boolean }>`
  padding: 4px 10px; border-radius: 6px; border: none; cursor: pointer;
  font-size: 11px; transition: background 0.12s, color 0.12s;
  ${({ $active, theme }) =>
    $active
      ? css`background: ${theme.mode === 'dark' ? 'rgba(99,106,242,0.22)' : '#eef2ff'}; color: ${theme.mode === 'dark' ? '#a5b4fc' : '#4338ca'}; font-weight: 600;`
      : css`background: transparent; color: ${theme.colors.text.secondary}; &:hover { background: ${theme.colors.hover}; color: ${theme.colors.text.primary}; }`}
`
const EraCardGrid = styled.div`display: grid; grid-template-columns: repeat(auto-fill, minmax(172px, 1fr)); gap: 12px;`
const EraCard = styled.div<{ $pinned?: boolean }>`
  border-radius: 12px; cursor: pointer; overflow: hidden;
  display: flex; flex-direction: column; transition: transform 0.14s, box-shadow 0.14s, background 0.14s;
  ${({ theme, $pinned }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255,255,255,0.04);
          border: 1px solid ${$pinned ? '#fbbf24' : 'rgba(255,255,255,0.07)'};
          &:hover { background: rgba(255,255,255,0.07); transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,0.3); }
        `
      : css`
          background: ${theme.colors.background.secondary};
          border: 1px solid ${$pinned ? '#f59e0b' : theme.colors.border.light};
          &:hover { background: ${theme.colors.background.tertiary}; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.08); }
        `}
`
const EraCardThumbWrap = styled.div<{ $color: string }>`
  position: relative; width: 100%; aspect-ratio: 4 / 3; overflow: hidden;
  background: ${({ $color }) => $color}12;
`
const EraCardThumbImg = styled.img`
  width: 100%; height: 100%; object-fit: cover; object-position: top center; display: block;
`
const EraCardThumbGradient = styled.div<{ $hue: number }>`
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  ${({ theme, $hue }) =>
    theme.mode === 'dark'
      ? css`
          background: linear-gradient(135deg, hsl(${$hue}, 10%, 20%), hsl(${$hue}, 12%, 13%));
          color: hsl(${$hue}, 10%, 50%);
        `
      : css`
          background: linear-gradient(135deg, hsl(${$hue}, 14%, 95%), hsl(${$hue}, 18%, 88%));
          color: hsl(${$hue}, 12%, 58%);
        `}
`
const EraCardBadge = styled.div`
  position: absolute; top: 6px; left: 6px;
  width: 20px; height: 20px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.25);
`
const EraCardPin = styled.button<{ $active: boolean }>`
  position: absolute; top: 6px; right: 6px;
  width: 22px; height: 22px; border-radius: 50%; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.14s, color 0.14s, transform 0.14s;
  ${({ $active }) =>
    $active
      ? css`background: #fbbf24; color: #1f1200;`
      : css`background: rgba(0,0,0,0.4); color: #fff; &:hover { background: rgba(0,0,0,0.6); transform: scale(1.08); }`}
`
const EraCardFieldTag = styled.span<{ $color: string }>`
  position: absolute; bottom: 6px; right: 6px;
  font-size: 9px; font-weight: 600; padding: 3px 7px; border-radius: 10px;
  background: ${({ $color }) => $color}ee; color: #fff;
  letter-spacing: 0.02em;
`
const EraPrimaryTitle = styled.div`
  font-size: 10px; color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-style: italic;
`
const HLMark = styled.mark`
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(251,191,36,0.35)' : '#fef3c7'};
  color: inherit;
  padding: 0 1px; border-radius: 2px;
`
const EraCardBody = styled.div`
  padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 5px;
`
const EraName = styled.div`
  font-size: 13px; font-weight: 600; color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
`
const EraCountryRow = styled.div`display: flex; align-items: center; gap: 5px; min-width: 0;`
const EraCountryDot = styled.span`width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;`
const EraCountryName = styled.span`
  font-size: 11px; font-weight: 500; color: ${({ theme }) => theme.colors.text.secondary};
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0; max-width: 60%;
`
const EraFaction = styled.span`
  font-size: 11px; color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0;
`
const EraYear = styled.div`font-size: 10px; color: ${({ theme }) => theme.colors.text.tertiary}; font-variant-numeric: tabular-nums;`
const EraInfluenceBlock = styled.div`display: flex; flex-direction: column; gap: 3px; margin-top: 3px;`
const EraInfluenceHead = styled.div`display: flex; align-items: baseline; justify-content: space-between; gap: 6px;`
const EraInfluenceLabel = styled.span`
  font-size: 9px; font-weight: 700; letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
const EraInfluenceValue = styled.span`
  font-size: 11px; font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-variant-numeric: tabular-nums;
`
const EraBarTrack = styled.div`
  width: 100%; height: 6px; border-radius: 3px; overflow: hidden;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f3f4f6'};
`
const EraBarFill = styled.div`height: 100%; border-radius: 3px; transition: width 0.3s;`
const EraMoreBtn = styled.button`
  margin: 12px auto 0; display: block;
  padding: 6px 16px; border-radius: 16px; border: none; cursor: pointer;
  font-size: 11px; font-weight: 500; transition: background 0.12s, color 0.12s;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`background: rgba(255,255,255,0.06); color: ${theme.colors.text.secondary}; &:hover { background: rgba(255,255,255,0.12); color: ${theme.colors.text.primary}; }`
      : css`background: #f3f4f6; color: ${theme.colors.text.secondary}; &:hover { background: #e5e7eb; color: ${theme.colors.text.primary}; }`}
`

// ================================================================
// 뷰 공통 컨테이너
// ================================================================
const ViewPanel = styled.div`
  border-radius: 12px; overflow: hidden;
  ${({ theme }) => glassOrSolidMixin(theme)}
`
const ViewPanelHeader = styled.div`
  display: flex; align-items: center; gap: 12px; padding: 12px 16px; flex-wrap: wrap;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
`
const ViewPanelDesc = styled.span`font-size: 11px; color: ${({ theme }) => theme.colors.text.tertiary};`
const EmptyState = styled.div`
  padding: 60px 0; text-align: center; font-size: 14px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

// ================================================================
// 검색 인풋
// ================================================================
const SearchRow = styled.div`
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;
`
const SearchBox = styled.div`
  display: flex; align-items: center; gap: 7px; flex: 1; max-width: 320px; height: 36px; padding: 0 12px; border-radius: 8px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);`
      : css`background: ${theme.colors.background.secondary}; border: 1px solid ${theme.colors.border.default};`}
`
const SearchInput = styled.input`
  flex: 1; border: none; outline: none; background: transparent; font-size: 13px; color: ${({ theme }) => theme.colors.text.primary};
  &::placeholder { color: ${({ theme }) => theme.colors.text.tertiary}; }
`
const SearchIconWrap = styled.span`color: ${({ theme }) => theme.colors.text.tertiary}; display: flex; align-items: center; flex-shrink: 0;`
const ClearBtn = styled.button`background: none; border: none; cursor: pointer; color: ${({ theme }) => theme.colors.text.tertiary}; padding: 0 2px; line-height: 1; display: flex; align-items: center; &:hover { color: ${({ theme }) => theme.colors.text.primary}; }`
const AddPersonBtn = styled.button`
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px;
  font-size: 13px; font-weight: 600; cursor: pointer; border: none; background: #6366f1; color: #fff;
  transition: background 0.14s;
  &:hover { background: #4f46e5; }
`

// ================================================================
// MAIN CONTENT (인포그래픽 중앙 영역)
// ================================================================
interface InfographicContentProps {
  /** 인물 카드/아이템 클릭 시 상세로 이동 */
  onPersonClick: (id: string) => void
}

export function InfographicContent({ onPersonClick }: InfographicContentProps) {
  const { data: rawPersons, isLoading } = usePersons()

  const scope = usePersonInfographicFilterStore((s) => s.scope)
  const setScope = usePersonInfographicFilterStore((s) => s.setScope)
  const view = usePersonInfographicFilterStore((s) => s.view)
  const q = usePersonInfographicFilterStore((s) => s.query)
  const setQ = usePersonInfographicFilterStore((s) => s.setQuery)
  const minInfluence = usePersonInfographicFilterStore((s) => s.minInfluence)
  const aliveFilter = usePersonInfographicFilterStore((s) => s.aliveFilter)
  const pinnedList = usePersonInfographicFilterStore((s) => s.pinned)
  const storeTogglePin = usePersonInfographicFilterStore((s) => s.togglePin)

  const pinned = useMemo(() => new Set(pinnedList), [pinnedList])
  const togglePin = React.useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation()
      storeTogglePin(id)
    },
    [storeTogglePin],
  )

  const [formOpen, setFormOpen] = React.useState(false)
  const [editId, setEditId] = React.useState<string | null>(null)
  const [editOpen, setEditOpen] = React.useState(false)

  const allPeople = useMemo<AdaptedPerson[]>(() => {
    if (!rawPersons) return []
    return (rawPersons as Person[]).map(adapt).filter((p): p is AdaptedPerson => p !== null)
  }, [rawPersons])

  const filtered = useMemo(() => {
    let arr = allPeople
    if (scope.type === 'era') arr = arr.filter((p) => yearOfEra(p.activityYear).key === scope.val)
    else if (scope.type === 'region') arr = arr.filter((p) => p.region === scope.val)
    else if (scope.type === 'field') arr = arr.filter((p) => p.field === scope.val)
    else if (scope.type === 'country') arr = arr.filter((p) => p.country === scope.val)
    if (minInfluence > 0) arr = arr.filter((p) => p.influence >= minInfluence)
    if (aliveFilter === 'alive') arr = arr.filter((p) => p.isAlive)
    else if (aliveFilter === 'dead') arr = arr.filter((p) => !p.isAlive)
    if (q.trim()) {
      const qq = q.toLowerCase()
      arr = arr.filter((p) =>
        p.name.toLowerCase().includes(qq) ||
        p.country.toLowerCase().includes(qq) ||
        p.faction.toLowerCase().includes(qq) ||
        (p.primaryTitle?.toLowerCase().includes(qq) ?? false),
      )
    }
    return arr
  }, [allPeople, scope, q, minInfluence, aliveFilter])

  const scopeLabel =
    scope.type === 'all' ? '전체 인물'
    : scope.type === 'era' ? (ERAS.find((e) => e.key === scope.val)?.lbl ?? scope.val)
    : scope.val ?? ''

  const avgLifespan = filtered.length ? Math.round(filtered.reduce((s, p) => s + Math.abs(p.died - p.born), 0) / filtered.length) : 0

  // 뷰 스위처에서 'cards' 이외의 뷰만 이 콘텐츠가 다룸. (cards는 PersonListContent가 처리.)
  const activeView: Exclude<PersonInfographicView, 'cards'> =
    view === 'cards' ? 'story' : view

  return (
    <motion.div
      key="infographic"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <InfographicWrap>
        {/* 헤더 */}
        <PersonTabSharedHeader>
          <PersonTabSharedHeaderLeft>
            <PersonTabSharedTitle>
              {scopeLabel}
              {filtered.length > 0 && (
                <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 10 }}>
                  {filtered.length}명 · 평균 수명 {avgLifespan}년
                </span>
              )}
            </PersonTabSharedTitle>
            <PersonTabSharedDesc>
              시대·지역·분야·국가별 필터로 인물 현황을 탐색하고, 클릭하면 상세 정보를 볼 수 있습니다.
            </PersonTabSharedDesc>
          </PersonTabSharedHeaderLeft>
          <PersonTabSharedHeaderRight>
            <AddPersonBtn onClick={() => setFormOpen(true)}>
              <FiPlus size={14} />
              새 인물
            </AddPersonBtn>
          </PersonTabSharedHeaderRight>
        </PersonTabSharedHeader>

        {/* 검색 — 뷰 전환은 상위(PersonDashboardSection)의 5뷰 스위처에서 처리 */}
        <SearchRow>
          <SearchBox>
            <SearchIconWrap><FiSearch size={13} /></SearchIconWrap>
            <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름, 국가, 소속 검색…" />
            {q && <ClearBtn onClick={() => setQ('')}><FiX size={13} /></ClearBtn>}
          </SearchBox>
        </SearchRow>

        {/* 인포그래픽 통계 스트립 */}
        {!isLoading && filtered.length > 0 && <HeaderStats people={filtered} />}

        {/* 시대 빠른 필터 */}
        <EraChipRow>
          <EraChip $active={scope.type === 'all'} $color="#6366f1" onClick={() => setScope({ type: 'all', val: null })}>전체</EraChip>
          {ERAS.map((e) => (
            <EraChip key={e.key} $active={scope.type === 'era' && scope.val === e.key} $color={e.color} onClick={() => setScope({ type: 'era', val: e.key })}>
              {e.lbl}
            </EraChip>
          ))}
        </EraChipRow>

        {/* 로딩 */}
        {isLoading && <EmptyState>데이터를 불러오는 중…</EmptyState>}

        {/* 메인 뷰 */}
        {!isLoading && (
          <ViewArea>
            {activeView === 'matrix' && <TimelineMatrix people={filtered} onOpen={onPersonClick} />}
            {activeView === 'galaxy' && <GalaxyView people={filtered} onOpen={onPersonClick} />}
            {activeView === 'story' && <EraStory people={filtered} onOpen={onPersonClick} q={q} pinned={pinned} togglePin={togglePin} />}
            {activeView === 'dynasty' && <DynastyView people={filtered} onOpen={onPersonClick} q={q} pinned={pinned} togglePin={togglePin} />}
          </ViewArea>
        )}

        {/* 푸터 */}
        {!isLoading && filtered.length > 0 && (
          <Footer>
            <span>총 {filtered.length}명</span>
            <span>· 평균 영향력 {Math.round(filtered.reduce((s, p) => s + p.influence, 0) / filtered.length)}</span>
          </Footer>
        )}
      </InfographicWrap>

      {/* 모달 */}
      <PersonRegisterViewModal isOpen={formOpen} onClose={() => setFormOpen(false)} onSuccess={() => setFormOpen(false)} />
      <PersonRegisterViewModal isOpen={editOpen} onClose={() => setEditOpen(false)} editPersonId={editId} onSuccess={() => setEditOpen(false)} />
    </motion.div>
  )
}


const InfographicWrap = styled.div`
  padding: 36px 32px 60px;
`

const EraChipRow = styled.div`
  display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-top: 14px;
`
const EraChip = styled.button<{ $active: boolean; $color: string }>`
  padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.12s;
  border: 1px solid ${({ $color }) => $color}55;
  ${({ $active, $color }) =>
    $active
      ? css`background: ${$color}; color: #fff; border-color: ${$color};`
      : css`background: ${$color}10; color: ${$color}; &:hover { background: ${$color}22; }`}
`

const ViewArea = styled.div`margin-top: 18px;`
const Footer = styled.div`
  margin-top: 24px; display: flex; gap: 12px; font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
