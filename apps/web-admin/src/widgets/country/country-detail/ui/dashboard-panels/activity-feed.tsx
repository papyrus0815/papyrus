import { useMemo, useState } from 'react'

import { getUploadImageUrl } from '@/shared/api/upload'

import { formatRelativeTime } from '../../lib/relative-time'
import type {
  ActivityCategory,
  ActivityKind,
  RecentActivityItem,
} from '../../model/use-country-dashboard-stats'
import {
  IconBriefcase,
  IconCalendar,
  IconCity,
  IconLandmark,
  IconScroll,
  IconVote,
} from '../country-detail-dashboard.icons'
import * as S from '../country-detail-dashboard.styles'
import type { AccentKey } from '../country-detail-dashboard.styles'
import { getPersonInitial, startOfDay } from './format'

interface ActivityGroup {
  label: string
  items: RecentActivityItem[]
}

type FilterKey = 'all' | ActivityCategory

const DEFAULT_VISIBLE_COUNT = 10

const EMPTY_AXES = [
  { key: 'person', label: '인물 기록', value: '생몰년 · 작호 · 소속' },
  { key: 'event', label: '역사 사건', value: '발생 연도 · 시대 맥락' },
  { key: 'governance', label: '통치 · 제도', value: '정체 · 수반 재임 · 내각' },
  { key: 'archive', label: '법제 · 지역', value: '선거 · 법령 · 행정구역' },
] as const

function resolveCategory(item: RecentActivityItem): ActivityCategory {
  if (item.category) return item.category
  if (item.kind === 'person') return 'person'
  if (item.kind === 'event') return 'event'
  if (
    item.kind === 'tenure' ||
    item.kind === 'political-system' ||
    item.kind === 'cabinet' ||
    item.kind === 'department'
  ) {
    return 'governance'
  }
  return 'archive'
}

function getKindMeta(kind: ActivityKind): {
  label: string
  accent: AccentKey
  roundAvatar: boolean
} {
  switch (kind) {
    case 'person':
      return { label: '인물', accent: 'violet', roundAvatar: true }
    case 'event':
      return { label: '사건', accent: 'amber', roundAvatar: false }
    case 'tenure':
      return { label: '재임', accent: 'indigo', roundAvatar: true }
    case 'political-system':
      return { label: '정체', accent: 'indigo', roundAvatar: false }
    case 'cabinet':
      return { label: '행정부', accent: 'rose', roundAvatar: false }
    case 'department':
      return { label: '부처', accent: 'sky', roundAvatar: false }
    case 'election':
      return { label: '선거', accent: 'emerald', roundAvatar: false }
    case 'law':
      return { label: '법령', accent: 'sky', roundAvatar: false }
    case 'treaty':
      return { label: '조약', accent: 'emerald', roundAvatar: false }
    case 'city':
      return { label: '행정구역', accent: 'sky', roundAvatar: false }
  }
}

function renderKindIcon(kind: ActivityKind) {
  switch (kind) {
    case 'event':
      return <IconCalendar />
    case 'political-system':
    case 'department':
      return <IconLandmark />
    case 'cabinet':
      return <IconBriefcase />
    case 'election':
      return <IconVote />
    case 'law':
    case 'treaty':
      return <IconScroll />
    case 'city':
      return <IconCity />
    default:
      return <IconLandmark />
  }
}

function groupActivityByTime(items: RecentActivityItem[]): ActivityGroup[] {
  if (items.length === 0) return []
  const today = startOfDay(new Date())
  const sevenDaysAgo = today.getTime() - 6 * 86400000
  const thirtyDaysAgo = today.getTime() - 29 * 86400000
  const groups = {
    today: [] as RecentActivityItem[],
    thisWeek: [] as RecentActivityItem[],
    thisMonth: [] as RecentActivityItem[],
    older: [] as RecentActivityItem[],
  }
  for (const item of items) {
    const stamp = new Date(item.createdAt).getTime()
    if (!Number.isFinite(stamp)) {
      groups.older.push(item)
      continue
    }
    if (stamp >= today.getTime()) groups.today.push(item)
    else if (stamp >= sevenDaysAgo) groups.thisWeek.push(item)
    else if (stamp >= thirtyDaysAgo) groups.thisMonth.push(item)
    else groups.older.push(item)
  }
  const out: ActivityGroup[] = []
  if (groups.today.length) out.push({ label: '오늘', items: groups.today })
  if (groups.thisWeek.length)
    out.push({ label: '지난 7일', items: groups.thisWeek })
  if (groups.thisMonth.length)
    out.push({ label: '지난 30일', items: groups.thisMonth })
  if (groups.older.length) out.push({ label: '이전 기록', items: groups.older })
  return out
}

export interface ActivityFeedProps {
  items: RecentActivityItem[]
  isLoading: boolean
  onPersonClick: (personId: string) => void
  onEventClick: (eventId: string) => void
  onNavigateDomain?: (
    kind: ActivityKind,
    refId: string,
    personId?: string | null,
  ) => void
}

export function ActivityFeed({
  items,
  isLoading,
  onPersonClick,
  onEventClick,
  onNavigateDomain,
}: ActivityFeedProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [expanded, setExpanded] = useState(false)

  const categoryCounts = useMemo(() => {
    const counts: Record<FilterKey, number> = {
      all: items.length,
      person: 0,
      event: 0,
      governance: 0,
      archive: 0,
    }
    for (const item of items) {
      counts[resolveCategory(item)] += 1
    }
    return counts
  }, [items])

  const filterTabs = useMemo(() => {
    const candidates: Array<{ key: FilterKey; label: string; count: number }> = [
      { key: 'all', label: '전체', count: categoryCounts.all },
      { key: 'person', label: '인물', count: categoryCounts.person },
      { key: 'event', label: '사건', count: categoryCounts.event },
      { key: 'governance', label: '통치·제도', count: categoryCounts.governance },
      { key: 'archive', label: '법제·지역', count: categoryCounts.archive },
    ]
    const nonEmptyCategories = candidates.filter(
      (c) => c.key !== 'all' && c.count > 0,
    )
    if (nonEmptyCategories.length <= 1) return []
    return [candidates[0], ...nonEmptyCategories]
  }, [categoryCounts])

  const resolvedFilter: FilterKey =
    activeFilter !== 'all' && categoryCounts[activeFilter] === 0
      ? 'all'
      : activeFilter

  const filteredItems = useMemo(() => {
    if (resolvedFilter === 'all') return items
    return items.filter((item) => resolveCategory(item) === resolvedFilter)
  }, [items, resolvedFilter])

  const visibleItems = expanded
    ? filteredItems
    : filteredItems.slice(0, DEFAULT_VISIBLE_COUNT)
  const hiddenCount = Math.max(0, filteredItems.length - visibleItems.length)

  const summaryNote = useMemo(() => {
    if (filteredItems.length === 0) return null
    const updatedCount = filteredItems.filter((item) => item.isUpdated).length
    const createdCount = filteredItems.length - updatedCount
    if (updatedCount > 0 && createdCount > 0) {
      return `신규 ${createdCount} · 수정 ${updatedCount}`
    }
    if (updatedCount > 0) {
      return `수정 ${updatedCount}건`
    }
    return `신규 등록 ${createdCount}건`
  }, [filteredItems])

  const headlineCells = useMemo(() => {
    const updatedCount = items.filter((item) => item.isUpdated).length
    const createdCount = items.length - updatedCount
    const categoryEntries: Array<{ key: ActivityCategory; label: string; count: number }> = [
      { key: 'person', label: '인물 기록', count: categoryCounts.person },
      { key: 'event', label: '역사 사건', count: categoryCounts.event },
      { key: 'governance', label: '통치 · 제도', count: categoryCounts.governance },
      { key: 'archive', label: '법제 · 지역', count: categoryCounts.archive },
    ]
    const activeCategoryCount = categoryEntries.filter((c) => c.count > 0).length
    const topCategory =
      [...categoryEntries].sort((a, b) => b.count - a.count)[0] ?? null
    const latestItem = items[0] ?? null

    return [
      {
        label: '집계 활동 건수',
        value: `${items.length}건`,
        meta:
          resolvedFilter === 'all'
            ? `현재 ${visibleItems.length}건 표시 · ${activeCategoryCount}개 분야`
            : `필터 ${filteredItems.length}건 중 ${visibleItems.length}건 표시`,
      },
      {
        label: '신규 등록 · 수정 비중',
        value:
          updatedCount > 0 && createdCount > 0
            ? `신규 ${createdCount} · 수정 ${updatedCount}`
            : updatedCount > 0
              ? `수정 ${updatedCount}건`
              : `신규 등록 ${createdCount}건`,
        meta:
          items.length > 0
            ? `신규 ${Math.round((createdCount / items.length) * 100)}% · 수정 ${Math.round((updatedCount / items.length) * 100)}%`
            : '등록·갱신 이력 집계',
      },
      {
        label: '최다 활동 분야',
        value:
          topCategory && topCategory.count > 0
            ? `${topCategory.label} · ${topCategory.count}건`
            : '—',
        meta: categoryEntries
          .filter((c) => c.count > 0)
          .map((c) => `${c.label.split(' ')[0]} ${c.count}`)
          .join(' · ') || '도메인별 집계',
      },
      {
        label: '최근 갱신 기록',
        value: latestItem ? latestItem.label : '—',
        meta: latestItem
          ? `${getKindMeta(latestItem.kind).label} · ${formatRelativeTime(latestItem.createdAt)}`
          : '최근 기록 시각',
      },
    ]
  }, [items, categoryCounts, resolvedFilter, visibleItems.length, filteredItems.length])

  if (items.length === 0 && !isLoading) {
    return (
      <S.ActivityEmptyGrid aria-label="최근 활동 대기 상태">
        {EMPTY_AXES.map((axis) => (
          <S.ActivityEmptyCell key={axis.key}>
            <S.ActivityEmptyLabel>{axis.label}</S.ActivityEmptyLabel>
            <S.ActivityEmptyValue>{axis.value}</S.ActivityEmptyValue>
          </S.ActivityEmptyCell>
        ))}
      </S.ActivityEmptyGrid>
    )
  }

  const groups = groupActivityByTime(visibleItems)

  const handleRowSelect = (item: RecentActivityItem) => {
    if (item.kind === 'person') {
      onPersonClick(item.refId)
      return
    }
    if (item.kind === 'event') {
      onEventClick(item.refId)
      return
    }
    if (item.kind === 'tenure' && item.personId && !onNavigateDomain) {
      onPersonClick(item.personId)
      return
    }
    if (onNavigateDomain) {
      onNavigateDomain(item.kind, item.refId, item.personId)
      return
    }
    if (item.personId) {
      onPersonClick(item.personId)
    }
  }

  return (
    <>
      {items.length > 0 && (
        <S.ActivityHeadlineStrip role="group" aria-label="최근 활동 핵심 요약">
          {headlineCells.map((cell) => (
            <S.ActivityHeadlineCell key={cell.label}>
              <S.ActivityHeadlineLabel>{cell.label}</S.ActivityHeadlineLabel>
              <S.ActivityHeadlineValue>{cell.value}</S.ActivityHeadlineValue>
              <S.ActivityHeadlineMeta>{cell.meta}</S.ActivityHeadlineMeta>
            </S.ActivityHeadlineCell>
          ))}
        </S.ActivityHeadlineStrip>
      )}

      {filterTabs.length > 0 && (
        <S.ActivityToolbar>
          <S.ActivityFilterGroup role="group" aria-label="최근 활동 분류 필터">
            {filterTabs.map((tab) => {
              const isActive = resolvedFilter === tab.key
              return (
                <S.ActivityFilterPill
                  key={tab.key}
                  type="button"
                  $active={isActive}
                  onClick={() => {
                    setActiveFilter(tab.key)
                    setExpanded(false)
                  }}
                >
                  {tab.label}
                  <S.ActivityFilterCount $active={isActive}>
                    {tab.count}
                  </S.ActivityFilterCount>
                </S.ActivityFilterPill>
              )
            })}
          </S.ActivityFilterGroup>
          {summaryNote && (
            <S.ActivitySummaryMeta>{summaryNote}</S.ActivitySummaryMeta>
          )}
        </S.ActivityToolbar>
      )}

      {groups.map((g) => (
        <S.ActivityGroupBlock key={g.label}>
          <S.ActivityGroupHeader>
            <span>{g.label}</span>
            <S.ActivityGroupCount>{g.items.length}</S.ActivityGroupCount>
          </S.ActivityGroupHeader>
          <S.FeedList>
            {g.items.map((item) => (
              <S.FeedItem key={item.id}>
                <ActivityRow
                  item={item}
                  onSelect={() => handleRowSelect(item)}
                />
              </S.FeedItem>
            ))}
          </S.FeedList>
        </S.ActivityGroupBlock>
      ))}

      {(hiddenCount > 0 ||
        (expanded && filteredItems.length > DEFAULT_VISIBLE_COUNT)) && (
        <S.ActivityFooterRow>
          <S.ActivityToggleBtn
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded
              ? '최근 활동 접기'
              : `활동 내역 더보기 (+${hiddenCount}건)`}
          </S.ActivityToggleBtn>
        </S.ActivityFooterRow>
      )}
    </>
  )
}

function ActivityRow({
  item,
  onSelect,
}: {
  item: RecentActivityItem
  onSelect: () => void
}) {
  const meta = getKindMeta(item.kind)

  return (
    <S.FeedRow as="button" type="button" onClick={onSelect}>
      <S.FeedAvatar $accent={meta.accent} $round={meta.roundAvatar} aria-hidden>
        {meta.roundAvatar ? (
          item.profileImageUrl ? (
            <img src={getUploadImageUrl(item.profileImageUrl)} alt="" />
          ) : (
            <span>{getPersonInitial(item.label)}</span>
          )
        ) : (
          renderKindIcon(item.kind)
        )}
      </S.FeedAvatar>

      <S.FeedTextCol>
        <S.FeedTitleLine>
          <S.FeedLabel>{item.label}</S.FeedLabel>
          {item.isUpdated && <S.FeedUpdateBadge>수정</S.FeedUpdateBadge>}
        </S.FeedTitleLine>
        {item.subLabel && <S.FeedSubLabel>{item.subLabel}</S.FeedSubLabel>}
      </S.FeedTextCol>

      <S.FeedMetaCol>
        <S.FeedKind $accent={meta.accent}>{meta.label}</S.FeedKind>
        <S.FeedTime>{formatRelativeTime(item.createdAt)}</S.FeedTime>
      </S.FeedMetaCol>
    </S.FeedRow>
  )
}
