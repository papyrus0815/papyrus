/**
 * 인물 묶음 목록 사이드바 — `/person-groups` 좌측.
 * 묶음 유형(세대·계파·사단 …) 그룹핑, 행 클릭 시 묶음 상세로 이동.
 */
import React, { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiGrid } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

import {
  GROUP_TONE,
  listPersonGroups,
  PERSON_GROUP_TYPE_META,
  PERSON_GROUP_TYPE_ORDER,
} from '@/shared/api/person-groups'
import { pathKeys } from '@/shared/router'
import {
  EntityListSidebar,
  filterSidebarItems,
  useSidebarPins,
  type EntitySidebarGroup,
  type EntitySidebarItem,
} from '@/widgets/entity-list-sidebar'

interface PersonGroupListSidebarProps {
  selectedId: string | null
  collapsed?: boolean
  onToggleCollapse?: () => void
  onAdd?: () => void
}

export function PersonGroupListSidebar({
  selectedId,
  collapsed = false,
  onToggleCollapse,
  onAdd,
}: PersonGroupListSidebarProps) {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['person-groups', 'sidebar'],
    queryFn: () => listPersonGroups(),
    staleTime: 60_000,
  })
  const { pinnedIds, togglePin } = useSidebarPins('person-group-sidebar-pins')
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const items = useMemo<EntitySidebarItem[]>(() => {
    const rows = (data ?? [])
      .filter((group) => !typeFilter || group.type === typeFilter)
      .map<EntitySidebarItem>((group) => ({
        id: group.id,
        name: group.name,
        meta: [
          PERSON_GROUP_TYPE_META[group.type]?.label ?? group.type,
          group.countryName,
          group.center?.name ?? null,
        ],
        badgeText: (PERSON_GROUP_TYPE_META[group.type]?.label ?? '?').slice(0, 1),
        metric: group.memberCount,
        groupId: group.type,
      }))
    rows.sort((left, right) => left.name.localeCompare(right.name, 'ko'))
    return filterSidebarItems(rows, query)
  }, [data, query, typeFilter])

  const groups = useMemo<EntitySidebarGroup[]>(
    () =>
      PERSON_GROUP_TYPE_ORDER.map((type) => ({
        id: type,
        name: PERSON_GROUP_TYPE_META[type]?.label ?? type,
        // GROUP_TONE은 배지 배경/전경 쌍이라 accent 키가 없다 — dot 색은 라이트 전경색을 쓴다
        accent:
          GROUP_TONE[PERSON_GROUP_TYPE_META[type]?.tone]?.fgLight ?? '#6366f1',
      })),
    [],
  )

  return (
    <EntityListSidebar
      title="집단 목록"
      noun="묶음"
      domainKey="person-group"
      items={items}
      totalCount={data?.length ?? 0}
      groups={groups}
      selectedId={selectedId}
      onSelect={(id) => navigate(pathKeys.personGroupDetail(id))}
      query={query}
      onQueryChange={setQuery}
      selects={[
        {
          id: 'type',
          label: '유형',
          value: typeFilter,
          onChange: setTypeFilter,
          options: [
            { value: '', label: '유형 전체' },
            ...PERSON_GROUP_TYPE_ORDER.map((type) => ({
              value: type,
              label: PERSON_GROUP_TYPE_META[type]?.label ?? type,
            })),
          ],
        },
      ]}
      hasActiveFilter={!!query.trim() || !!typeFilter}
      onClearFilters={() => {
        setQuery('')
        setTypeFilter('')
      }}
      pinnedIds={pinnedIds}
      onTogglePin={togglePin}
      onAdd={onAdd}
      addLabel="묶음 등록"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      collapsedIcon={<FiGrid size={16} />}
    />
  )
}
