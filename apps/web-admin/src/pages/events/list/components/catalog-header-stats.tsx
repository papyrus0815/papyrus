/**
 * 인라인 통계 스트립 — ViewSwitcherRow의 ViewMeta 자리에 들어가는 한 줄 요약.
 *
 * 이전엔 PageHeader 우측에 별도 KPI chip 그룹이었으나, 사용자 시선 부담과
 * ViewMeta(표시/전체 카운트)와의 정보 중복 때문에 한 줄로 융합. 이제 다음과 같이 노출:
 *
 *   표시 1,247건 · 정치 47
 *
 * 카테고리는 TOP 1만 표기(과부하 방지).
 *
 * 중요도(핵심·주요) 칩은 **제거됐다**(2026-07-28 검토 M9) — importance는 스키마·DTO에
 * 없는 값이라 transformer가 전부 'notable'로 채웠고, 그래서 이 칩은 단 한 번도 렌더된
 * 적이 없다. 실재하지 않는 집계를 지운다.
 *
 * 모수 규약: `events`는 **총계와 같은 모수**여야 한다(검토 IA-13).
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
  /** 필터를 만족하는 사건 수 — undefined(미필터)면 serverTotal/events.length로 폴백 */
  visibleCount?: number
  /** 서버 권위 총개수(최상위 기준) — 미필터 상태의 "N건" */
  serverTotal?: number
}

export const CatalogHeaderStats: React.FC<Props> = ({
  events,
  dbCategories,
  visibleCount,
  serverTotal,
}) => {
  const { topCategory } = useMemo(() => {
    const catCount = new Map<string, number>()

    for (const historicalEvent of events) {
      const key = historicalEvent.category || 'other'
      catCount.set(key, (catCount.get(key) ?? 0) + 1)
    }

    const top1 = Array.from(catCount.entries()).sort(
      (left, right) => right[1] - left[1],
    )[0]

    return {
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

  // 필터 중이면 조건을 만족하는 사건 수, 아니면 서버 권위 총량(없으면 로드된 수)
  const isFiltered = visibleCount !== undefined
  const total = visibleCount ?? serverTotal ?? events.length

  return (
    <Strip aria-label="등록 사건 분포">
      <Total
        title={
          isFiltered
            ? '현재 조건을 만족하는 사건 수'
            : '등록된 최상위 사건 수(하위 사건은 별도)'
        }
      >
        {isFiltered && <TotalPrefix>조건 일치</TotalPrefix>}
        <strong>{total.toLocaleString()}</strong>건
      </Total>
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

const TotalPrefix = styled.span`
  margin-right: 4px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
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
