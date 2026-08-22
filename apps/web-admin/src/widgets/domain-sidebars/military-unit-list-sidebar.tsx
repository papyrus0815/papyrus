/**
 * 군부대 목록 사이드바 — `/military` 좌측.
 *
 * 군사 지면도 오래 플레이스홀더였다. MilitaryUnit은 API·폼만 있고 전용 화면이 없어 실제로
 * 볼 방법이 없었으므로, 좌측 목록이 그 첫 지면이 된다. 행이 0건이면 공용 빈 상태가
 * "등록된 부대가 없어요"를 보여준다 — 데이터가 비어 있다는 사실 자체가 정보다.
 */
import React, { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiShield } from 'react-icons/fi'

import { militaryUnitApi } from '@/shared/api/military-unit'
import {
  EntityListSidebar,
  filterSidebarItems,
  useAnchorSelection,
  useSidebarPins,
  type EntitySidebarGroup,
  type EntitySidebarItem,
} from '@/widgets/entity-list-sidebar'

const NO_COUNTRY = '__no-country__'
const PALETTE = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']

interface MilitaryUnitListSidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function MilitaryUnitListSidebar({
  collapsed = false,
  onToggleCollapse,
}: MilitaryUnitListSidebarProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['military-units', 'sidebar'],
    queryFn: () => militaryUnitApi.getAll(),
    staleTime: 60_000,
  })
  const { pinnedIds, togglePin } = useSidebarPins('military-unit-sidebar-pins')
  const { selectedId, select } = useAnchorSelection('unitId')
  const [query, setQuery] = useState('')

  const { items, groups } = useMemo(() => {
    const list = (data ?? []) as Array<{
      id: string
      name: string
      unitType?: string | null
      country?: { name?: string | null } | null
      historicalCountry?: { name?: string | null } | null
    }>
    const groupMeta = new Map<string, string>()
    const rows = list.map<EntitySidebarItem>((unit) => {
      const countryName =
        unit.country?.name ?? unit.historicalCountry?.name ?? null
      const groupId = countryName ?? NO_COUNTRY
      if (!groupMeta.has(groupId)) {
        groupMeta.set(groupId, countryName ?? '국가 미지정')
      }
      return {
        id: unit.id,
        name: unit.name,
        meta: [unit.unitType ?? null, countryName],
        groupId,
      }
    })
    rows.sort((left, right) => left.name.localeCompare(right.name, 'ko'))

    const ordered: EntitySidebarGroup[] = [...groupMeta.entries()]
      .filter(([groupId]) => groupId !== NO_COUNTRY)
      .sort((left, right) => left[1].localeCompare(right[1], 'ko'))
      .map(([groupId, name], index) => ({
        id: groupId,
        name,
        accent: PALETTE[index % PALETTE.length],
      }))
    if (groupMeta.has(NO_COUNTRY)) {
      ordered.push({ id: NO_COUNTRY, name: '국가 미지정', accent: '#a1a1aa' })
    }

    return { items: filterSidebarItems(rows, query), groups: ordered }
  }, [data, query])

  return (
    <EntityListSidebar
      title="부대 목록"
      noun="부대"
      domainKey="military-unit"
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
      collapsedIcon={<FiShield size={16} />}
    />
  )
}
