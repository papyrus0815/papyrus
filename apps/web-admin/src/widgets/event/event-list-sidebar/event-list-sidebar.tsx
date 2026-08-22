/**
 * 사건 목록 사이드바 — `/events` 좌측.
 *
 * 목록 UI는 공용 EntityListSidebar. 여기서는 사건 도메인만 다룬다:
 * 세기 그룹핑(BC 안전) · 카테고리/정렬 셀렉트 · 행 클릭 시 사건 상세로 이동.
 *
 * 카탈로그 본문(우측)은 자체 필터 체계가 방대해 그대로 두고, 사이드바는 **탐색 전용**으로
 * 독립 검색을 갖는다. 본문 필터와 억지로 묶으면 두 필터 체계가 서로를 덮어쓴다.
 */
import React, { useMemo, useState } from 'react'

import { FiLayers } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

import { useEvents } from '@/entities/event/model'
import { signedYearFromIsoLike } from '@/shared/lib/country-period'
import { formatCenturyLabel } from '@/shared/lib/lifespan-text'
import { pathKeys } from '@/shared/router'
import {
  EntityListSidebar,
  filterSidebarItems,
  useSidebarPins,
  type EntitySidebarGroup,
  type EntitySidebarItem,
} from '@/widgets/entity-list-sidebar'

/** 세기 그룹 accent — 오래될수록 따뜻한 색. 시대 팔레트(ERAS)와 같은 계열. */
const CENTURY_ACCENTS = [
  '#f59e0b',
  '#ef4444',
  '#10b981',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
]

const UNKNOWN_GROUP = '__no-date__'
type SortKey = 'recent' | 'oldest' | 'title'

interface EventListSidebarProps {
  selectedId: string | null
  collapsed?: boolean
  onToggleCollapse?: () => void
  /** 사건 등록 진입 — 미지정 시 헤더 + 버튼 숨김 */
  onAdd?: () => void
}

function EventListSidebarInner({
  selectedId,
  collapsed = false,
  onToggleCollapse,
  onAdd,
}: EventListSidebarProps) {
  const navigate = useNavigate()
  // 사이드바는 세기 그룹을 온전히 보여야 하므로 전량 로드(서버 페이지네이션 위 클라 그룹핑은
  // 1페이지만 그룹이 잡히는 함정이 있다 — event-catalog 회귀와 같은 이유).
  const { events, isLoading, isError, refetch } = useEvents({ autoLoadAll: true })
  const { pinnedIds, togglePin } = useSidebarPins('event-sidebar-pins')

  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sort, setSort] = useState<SortKey>('recent')

  const categoryOptions = useMemo(() => {
    const names = new Set<string>()
    for (const event of events) {
      if (event.category) names.add(String(event.category))
    }
    return [...names].sort((left, right) => left.localeCompare(right, 'ko'))
  }, [events])

  /** 세기 그룹 id는 부호 연도 기준 — BC는 음수 세기로 따로 잡힌다 */
  const centuryIdOf = (signedYear: number): string => {
    const century = Math.floor((Math.abs(signedYear) - 1) / 100) + 1
    return signedYear < 0 ? `c-bc-${century}` : `c-ad-${century}`
  }

  const { items, groups, totalCount } = useMemo(() => {
    const rows: EntitySidebarItem[] = []
    const groupMeta = new Map<string, { name: string; sortKey: number }>()

    const sorted = [...events]
    if (sort === 'title') {
      sorted.sort((left, right) => left.title.localeCompare(right.title, 'ko'))
    } else {
      const direction = sort === 'oldest' ? 1 : -1
      sorted.sort((left, right) => {
        const leftYear = signedYearFromIsoLike(left.startDate)
        const rightYear = signedYearFromIsoLike(right.startDate)
        // 연도 미상은 방향과 무관하게 항상 뒤로
        if (leftYear == null && rightYear == null) return 0
        if (leftYear == null) return 1
        if (rightYear == null) return -1
        return (leftYear - rightYear) * direction
      })
    }

    for (const event of sorted) {
      if (categoryFilter && String(event.category) !== categoryFilter) continue
      const signedYear = signedYearFromIsoLike(event.startDate)
      const groupId =
        signedYear == null ? UNKNOWN_GROUP : centuryIdOf(signedYear)
      if (!groupMeta.has(groupId)) {
        groupMeta.set(groupId, {
          name: signedYear == null ? '연도 미상' : formatCenturyLabel(signedYear),
          // 미상은 항상 맨 끝
          sortKey: signedYear == null ? Number.POSITIVE_INFINITY : signedYear,
        })
      }
      rows.push({
        id: event.id,
        name: event.title,
        meta: [
          signedYear == null ? null : formatCenturyLabel(signedYear),
          event.category ? String(event.category) : null,
          event.relatedCountries?.[0]?.name ?? null,
        ],
        badgeText: signedYear == null ? '?' : String(Math.abs(signedYear) % 100),
        metric: event.countries?.length || null,
        searchText: [event.title, event.category, ...(event.keywords ?? [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
        groupId,
      })
    }

    // 최신 세기 먼저(기본) — 정렬이 '오래된순'이면 그룹도 오래된 세기 먼저
    const direction = sort === 'oldest' ? 1 : -1
    const orderedGroups: EntitySidebarGroup[] = [...groupMeta.entries()]
      .sort((left, right) => (left[1].sortKey - right[1].sortKey) * direction)
      .map(([groupId, meta], index) => ({
        id: groupId,
        name: meta.name,
        accent:
          groupId === UNKNOWN_GROUP
            ? '#a1a1aa'
            : CENTURY_ACCENTS[index % CENTURY_ACCENTS.length],
      }))

    return {
      items: filterSidebarItems(rows, query),
      groups: orderedGroups,
      totalCount: events.length,
    }
  }, [events, query, categoryFilter, sort])

  const hasActiveFilter = !!query.trim() || !!categoryFilter

  return (
    <EntityListSidebar
      title="사건 목록"
      noun="사건"
      domainKey="event"
      items={items}
      totalCount={totalCount}
      groups={groups}
      selectedId={selectedId}
      onSelect={(id) => navigate(pathKeys.events.detail(id))}
      query={query}
      onQueryChange={setQuery}
      searchPlaceholder="사건 검색..."
      selects={[
        {
          id: 'category',
          label: '분류',
          value: categoryFilter,
          onChange: setCategoryFilter,
          options: [
            { value: '', label: '분류 전체' },
            ...categoryOptions.map((name) => ({ value: name, label: name })),
          ],
        },
        {
          id: 'sort',
          label: '정렬',
          value: sort,
          active: false,
          onChange: (next) => setSort(next as SortKey),
          options: [
            { value: 'recent', label: '최신순' },
            { value: 'oldest', label: '오래된순' },
            { value: 'title', label: '이름순' },
          ],
        },
      ]}
      hasActiveFilter={hasActiveFilter}
      onClearFilters={() => {
        setQuery('')
        setCategoryFilter('')
      }}
      pinnedIds={pinnedIds}
      onTogglePin={togglePin}
      onAdd={onAdd}
      addLabel="사건 등록"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      collapsedIcon={<FiLayers size={16} />}
    />
  )
}

export const EventListSidebar = React.memo(EventListSidebarInner)
