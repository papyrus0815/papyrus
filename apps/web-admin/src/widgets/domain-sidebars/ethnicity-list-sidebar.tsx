/**
 * 민족 목록 사이드바 — `/ethnicity` 좌측.
 * 상위 민족(parent) 기준 그룹핑 — 계보가 목록의 자연 축이다. 상위가 없으면 '대분류'.
 */
import React, { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiUsers } from 'react-icons/fi'

import { ethnicityApi } from '@/shared/api/ethnicity'
import { getUploadImageUrl } from '@/shared/api/upload'
import {
  EntityListSidebar,
  filterSidebarItems,
  useAnchorSelection,
  useSidebarPins,
  type EntitySidebarGroup,
  type EntitySidebarItem,
} from '@/widgets/entity-list-sidebar'

const ROOT_GROUP = '__root__'
const PALETTE = ['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#14b8a6']

interface EthnicityListSidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function EthnicityListSidebar({
  collapsed = false,
  onToggleCollapse,
}: EthnicityListSidebarProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['ethnicities'],
    queryFn: () => ethnicityApi.getAll(),
    staleTime: 60_000,
  })
  const { pinnedIds, togglePin } = useSidebarPins('ethnicity-sidebar-pins')
  const { selectedId, select } = useAnchorSelection('ethnicityId')
  const [query, setQuery] = useState('')

  const { items, groups } = useMemo(() => {
    const list = data ?? []
    const groupMeta = new Map<string, string>()
    const rows = list.map<EntitySidebarItem>((ethnicity) => {
      const groupId = ethnicity.parent?.id ?? ROOT_GROUP
      if (!groupMeta.has(groupId)) {
        groupMeta.set(groupId, ethnicity.parent?.name ?? '대분류')
      }
      return {
        id: ethnicity.id,
        name: ethnicity.name,
        meta: [ethnicity.nameLocal, ethnicity.parent?.name ?? null],
        thumbnailUrl: ethnicity.thumbnailUrl
          ? getUploadImageUrl(ethnicity.thumbnailUrl)
          : null,
        groupId,
      }
    })
    rows.sort((left, right) => left.name.localeCompare(right.name, 'ko'))

    // 대분류(상위 없음)를 맨 위에, 나머지는 이름순
    const ordered: EntitySidebarGroup[] = []
    if (groupMeta.has(ROOT_GROUP)) {
      ordered.push({ id: ROOT_GROUP, name: '대분류', accent: '#64748b' })
      groupMeta.delete(ROOT_GROUP)
    }
    ;[...groupMeta.entries()]
      .sort((left, right) => left[1].localeCompare(right[1], 'ko'))
      .forEach(([groupId, name], index) => {
        ordered.push({
          id: groupId,
          name,
          accent: PALETTE[index % PALETTE.length],
        })
      })

    return { items: filterSidebarItems(rows, query), groups: ordered }
  }, [data, query])

  return (
    <EntityListSidebar
      title="민족 목록"
      noun="민족"
      domainKey="ethnicity"
      items={items}
      totalCount={data?.length ?? 0}
      groups={groups}
      selectedId={selectedId}
      onSelect={select}
      query={query}
      onQueryChange={setQuery}
      hasActiveFilter={!!query.trim()}
      onClearFilters={() => setQuery('')}
      pinnedIds={pinnedIds}
      onTogglePin={togglePin}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      collapsedIcon={<FiUsers size={16} />}
    />
  )
}
