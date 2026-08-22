/**
 * 가문 목록 사이드바 — `/dynasty` 좌측.
 * 첫 글자(가나다) 그룹핑. 상세 라우트가 없어 선택은 URL 쿼리 + 본문 앵커 스크롤.
 */
import React, { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiHome } from 'react-icons/fi'

import { dynastyApi } from '@/shared/api/dynasty'
import { getUploadImageUrl } from '@/shared/api/upload'
import {
  EntityListSidebar,
  filterSidebarItems,
  useAnchorSelection,
  useSidebarPins,
  type EntitySidebarGroup,
  type EntitySidebarItem,
} from '@/widgets/entity-list-sidebar'

import { initialGroupOf, INITIAL_GROUPS } from './initial-groups'

interface DynastyListSidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function DynastyListSidebar({
  collapsed = false,
  onToggleCollapse,
}: DynastyListSidebarProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dynasties'],
    queryFn: () => dynastyApi.getAll(),
    staleTime: 60_000,
  })
  const { pinnedIds, togglePin } = useSidebarPins('dynasty-sidebar-pins')
  const { selectedId, select } = useAnchorSelection('dynastyId')
  const [query, setQuery] = useState('')

  const items = useMemo<EntitySidebarItem[]>(() => {
    const rows = (data ?? []).map<EntitySidebarItem>((dynasty) => ({
      id: dynasty.id,
      name: dynasty.name,
      meta: [dynasty.originPlace ?? null, dynasty.founderText ?? null],
      thumbnailUrl: dynasty.thumbnailUrl
        ? getUploadImageUrl(dynasty.thumbnailUrl)
        : null,
      groupId: initialGroupOf(dynasty.name),
    }))
    rows.sort((left, right) => left.name.localeCompare(right.name, 'ko'))
    return filterSidebarItems(rows, query)
  }, [data, query])

  const groups = useMemo<EntitySidebarGroup[]>(() => INITIAL_GROUPS, [])

  return (
    <EntityListSidebar
      title="가문 목록"
      noun="가문"
      domainKey="dynasty"
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
      collapsedIcon={<FiHome size={16} />}
    />
  )
}
