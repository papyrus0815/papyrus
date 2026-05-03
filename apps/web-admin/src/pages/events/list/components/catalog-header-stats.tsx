/**
 * 카탈로그 헤더 우측 KPI chip 그룹.
 *
 * - 중요도 분포 (핵심·주요·평범) — 색 dot + 숫자
 * - 카테고리 TOP3 — 한국어 라벨 + 건수
 *
 * 카운트는 *전체 등록 사건* 기준 (필터 무관). 페이지에 들어왔을 때 데이터 규모를
 * 한눈에 인지하기 위한 집계.
 */
import React, { useMemo } from 'react'

import styled from 'styled-components'

import { getCategoryName } from '@/features/event-list/lib'
import type { EventCategoryDto } from '@/shared/api/event-categories'

import type { HistoricalEvent } from '../../create/events.types'
import { CATEGORY_BADGE_COLORS } from '../../styles/theme'

interface Props {
  events: HistoricalEvent[]
  dbCategories: EventCategoryDto[]
}

type Tier = 'critical' | 'major' | 'normal'

const TIER_META: Record<Tier, { label: string; color: string }> = {
  critical: { label: '핵심', color: '#2563eb' },
  major: { label: '주요', color: '#f59e0b' },
  normal: { label: '평범', color: '#94a3b8' },
}

export const CatalogHeaderStats: React.FC<Props> = ({
  events,
  dbCategories,
}) => {
  const { tiers, topCategories } = useMemo(() => {
    const tierCount: Record<Tier, number> = { critical: 0, major: 0, normal: 0 }
    const catCount = new Map<string, number>()

    for (const e of events) {
      const imp = e.hierarchy?.importance
      if (imp === 'critical') tierCount.critical += 1
      else if (imp === 'major') tierCount.major += 1
      else tierCount.normal += 1

      const k = e.category || 'other'
      catCount.set(k, (catCount.get(k) ?? 0) + 1)
    }

    const top = Array.from(catCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, c]) => ({
        key: k,
        label: getCategoryName(k, dbCategories),
        count: c,
        color:
          CATEGORY_BADGE_COLORS[k as keyof typeof CATEGORY_BADGE_COLORS] ??
          '#2563eb',
      }))

    return { tiers: tierCount, topCategories: top }
  }, [events, dbCategories])

  if (events.length === 0) return null

  return (
    <StatsRow aria-label="등록 사건 통계">
      {(['critical', 'major', 'normal'] as Tier[]).map((tier) => {
        if (tiers[tier] === 0) return null
        const meta = TIER_META[tier]
        return (
          <Chip key={tier} title={`${meta.label} ${tiers[tier]}건`}>
            <Dot style={{ background: meta.color }} aria-hidden="true" />
            <span>{meta.label}</span>
            <Count>{tiers[tier].toLocaleString()}</Count>
          </Chip>
        )
      })}

      {topCategories.length > 0 && <Divider aria-hidden="true" />}

      {topCategories.map((c) => (
        <Chip key={c.key} title={`${c.label} ${c.count}건`}>
          <Dot style={{ background: c.color }} aria-hidden="true" />
          <span>{c.label}</span>
          <Count>{c.count.toLocaleString()}</Count>
        </Chip>
      ))}
    </StatsRow>
  )
}

const StatsRow = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
`

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 8px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'};
`

const Dot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
`

const Count = styled.span`
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 700;
`

const Divider = styled.span`
  width: 1px;
  height: 14px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)'};
  margin: 0 2px;
`
