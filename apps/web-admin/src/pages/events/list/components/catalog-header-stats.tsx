/**
 * 인라인 통계 스트립 — ViewSwitcherRow의 ViewMeta 자리에 들어가는 한 줄 요약.
 *
 * 이전엔 PageHeader 우측에 별도 KPI chip 그룹이었으나, 사용자 시선 부담과
 * ViewMeta(표시/전체 카운트)와의 정보 중복 때문에 한 줄로 융합. 이제 다음과 같이 노출:
 *
 *   표시 1,247건 · 핵심 89 · 주요 234 · 정치 47
 *
 * 카테고리는 TOP 1만 표기(과부하 방지). 핵심·주요는 항상 표기, normal은 생략.
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
  /** 현재 필터된 표시 건수 — undefined면 serverTotal/events.length로 폴백 */
  visibleCount?: number
  /** 서버 권위 총개수 — 미필터 상태에서 "N건"을 로드된 수가 아닌 진짜 총량으로 */
  serverTotal?: number
}

type Tier = 'critical' | 'major'

const TIER_META: Record<Tier, { label: string; color: string }> = {
  critical: { label: '핵심', color: '#2563eb' },
  major: { label: '주요', color: '#f59e0b' },
}

export const CatalogHeaderStats: React.FC<Props> = ({
  events,
  dbCategories,
  visibleCount,
  serverTotal,
}) => {
  const { tiers, topCategory } = useMemo(() => {
    const tierCount: Record<Tier, number> = { critical: 0, major: 0 }
    const catCount = new Map<string, number>()

    for (const e of events) {
      const imp = e.hierarchy?.importance
      if (imp === 'critical') tierCount.critical += 1
      else if (imp === 'major') tierCount.major += 1

      const k = e.category || 'other'
      catCount.set(k, (catCount.get(k) ?? 0) + 1)
    }

    const top1 = Array.from(catCount.entries())
      .sort((a, b) => b[1] - a[1])[0]

    return {
      tiers: tierCount,
      topCategory: top1
        ? {
            key: top1[0],
            label: getCategoryName(top1[0], dbCategories),
            count: top1[1],
            color:
              CATEGORY_BADGE_COLORS[
                top1[0] as keyof typeof CATEGORY_BADGE_COLORS
              ] ?? '#2563eb',
          }
        : null,
    }
  }, [events, dbCategories])

  if (events.length === 0) return null

  // 필터 중이면 표시 건수, 아니면 서버 권위 총량(없으면 로드된 수)
  const total = visibleCount ?? serverTotal ?? events.length

  return (
    <Strip aria-label="등록 사건 분포">
      <Total>
        <strong>{total.toLocaleString()}</strong>건
      </Total>
      {tiers.critical > 0 && (
        <>
          <Sep aria-hidden="true">·</Sep>
          <StatItem title={`핵심 ${tiers.critical}건`}>
            <Dot style={{ background: TIER_META.critical.color }} />
            <span>핵심 {tiers.critical.toLocaleString()}</span>
          </StatItem>
        </>
      )}
      {tiers.major > 0 && (
        <>
          <Sep aria-hidden="true">·</Sep>
          <StatItem title={`주요 ${tiers.major}건`}>
            <Dot style={{ background: TIER_META.major.color }} />
            <span>주요 {tiers.major.toLocaleString()}</span>
          </StatItem>
        </>
      )}
      {topCategory && (
        <>
          <Sep aria-hidden="true">·</Sep>
          <StatItem title={`${topCategory.label} ${topCategory.count}건`}>
            <Dot style={{ background: topCategory.color }} />
            <span>
              {topCategory.label} {topCategory.count.toLocaleString()}
            </span>
          </StatItem>
        </>
      )}
    </Strip>
  )
}

const Strip = styled.div`
  display: inline-flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 8px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Total = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
    margin-right: 1px;
  }
`

const StatItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Dot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
`

const Sep = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  opacity: 0.45;
  user-select: none;
`
