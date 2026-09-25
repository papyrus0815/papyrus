import { Fragment } from 'react'

import { getUploadImageUrl } from '@/shared/api/upload'

import { formatRelativeTime } from '../../lib/relative-time'
import type { RecentActivityItem } from '../../model/use-country-dashboard-stats'
import { IconCalendar } from '../country-detail-dashboard.icons'
import * as S from '../country-detail-dashboard.styles'
import { getPersonInitial, startOfDay } from './format'

interface ActivityGroup {
  label: string
  items: RecentActivityItem[]
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
  if (groups.older.length) out.push({ label: '이전', items: groups.older })
  return out
}

export interface ActivityFeedProps {
  items: RecentActivityItem[]
  isLoading: boolean
  onPersonClick: (personId: string) => void
  onEventClick: () => void
}

export function ActivityFeed({
  items,
  isLoading,
  onPersonClick,
  onEventClick,
}: ActivityFeedProps) {
  if (items.length === 0 && !isLoading) {
    return <S.FeedEmpty>최근 등록된 인물이나 사건이 없습니다.</S.FeedEmpty>
  }
  const groups = groupActivityByTime(items)
  return (
    <>
      {groups.map((g) => (
        <Fragment key={g.label}>
          <S.ActivityGroupHeader>{g.label}</S.ActivityGroupHeader>
          <S.FeedList>
            {g.items.map((item) => (
              <S.FeedItem key={item.id}>
                <S.FeedDot
                  $accent={item.kind === 'person' ? 'violet' : 'amber'}
                />
                <ActivityRow
                  item={item}
                  onSelect={() => {
                    if (item.kind === 'person') onPersonClick(item.refId)
                    else onEventClick()
                  }}
                />
              </S.FeedItem>
            ))}
          </S.FeedList>
        </Fragment>
      ))}
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
  return (
    <S.FeedRow as="button" type="button" onClick={onSelect}>
      {item.kind === 'person' ? (
        <S.FeedAvatar $accent="violet">
          {item.profileImageUrl ? (
            <img src={getUploadImageUrl(item.profileImageUrl)} alt="" />
          ) : (
            <span>{getPersonInitial(item.label)}</span>
          )}
        </S.FeedAvatar>
      ) : (
        /* 사건 줄만 아바타 자리가 비어 들여쓰기가 들쭉날쭉했다 — 달력 표지로 채운다 */
        <S.FeedAvatar $accent="amber" aria-hidden>
          <IconCalendar />
        </S.FeedAvatar>
      )}
      <S.FeedLabel>{item.label}</S.FeedLabel>
      <S.FeedKind>{item.kind === 'person' ? '인물' : '사건'}</S.FeedKind>
      <S.FeedTime>{formatRelativeTime(item.createdAt)}</S.FeedTime>
    </S.FeedRow>
  )
}
