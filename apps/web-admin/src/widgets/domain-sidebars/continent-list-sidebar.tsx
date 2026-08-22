/**
 * 대륙 목록 사이드바 — `/continents` 좌측.
 * 대륙은 개수가 적어 그룹 축이 필요 없다 — 단일 '대륙' 그룹으로 평면 나열한다.
 */
import React, { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiGlobe } from 'react-icons/fi'

import { getAllContinents } from '@/shared/api/continents'
import { getContinentColor } from '@/widgets/country/country-list/model/continent-colors'
import {
  EntityListSidebar,
  filterSidebarItems,
  useAnchorSelection,
  useSidebarPins,
  type EntitySidebarGroup,
  type EntitySidebarItem,
} from '@/widgets/entity-list-sidebar'

const ALL_GROUP = '__continents__'

interface ContinentListSidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
  onAdd?: () => void
}

export function ContinentListSidebar({
  collapsed = false,
  onToggleCollapse,
  onAdd,
}: ContinentListSidebarProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['continents', 'sidebar'],
    queryFn: () => getAllContinents(),
    staleTime: 300_000,
  })
  const { pinnedIds, togglePin } = useSidebarPins('continent-sidebar-pins')
  const { selectedId, select } = useAnchorSelection('continentId')
  const [query, setQuery] = useState('')

  const items = useMemo<EntitySidebarItem[]>(() => {
    const rows = (data ?? []).map<EntitySidebarItem>((continent) => ({
      id: continent.id,
      name: continent.name,
      meta: [continent.enName ?? null, continent.isoCode ?? null],
      badgeText: (continent.isoCode ?? continent.name).slice(0, 2),
      metric: continent.countryCount ?? null,
      groupId: ALL_GROUP,
    }))
    rows.sort((left, right) => left.name.localeCompare(right.name, 'ko'))
    return filterSidebarItems(rows, query)
  }, [data, query])

  // 그룹 accent는 첫 대륙 색을 쓰지 않고 중립으로 — 행마다 색이 다른 게 아니라 그룹이 하나뿐이다.
  const groups = useMemo<EntitySidebarGroup[]>(
    () => [
      {
        id: ALL_GROUP,
        name: '대륙',
        accent: getContinentColor({ continentName: null }),
        alwaysExpanded: true,
      },
    ],
    [],
  )

  return (
    <EntityListSidebar
      title="대륙 목록"
      noun="대륙"
      domainKey="continent"
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
      onAdd={onAdd}
      addLabel="대륙 등록"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      collapsedIcon={<FiGlobe size={16} />}
    />
  )
}
