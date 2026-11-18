/**
 * 군부대 목록 사이드바 — `/military` 좌측.
 *
 * 군사 지면도 오래 플레이스홀더였다. MilitaryUnit은 API·폼만 있고 전용 화면이 없어 실제로
 * 볼 방법이 없었으므로, 좌측 목록이 그 첫 지면이 된다. 행이 0건이면 공용 빈 상태가
 * "등록된 부대가 없어요"를 보여준다 — 데이터가 비어 있다는 사실 자체가 정보다.
 */
import React, { useCallback, useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiShield } from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'

import { militaryUnitApi } from '@/shared/api/military-unit'
import { militaryUnitTypeLabelKo } from '@/shared/lib/military-unit-type-label'
import { pathKeys } from '@/shared/router'
import {
  EntityListSidebar,
  filterSidebarItems,
  useAnchorSelection,
  useSidebarPins,
  type EntitySidebarGroup,
  type EntitySidebarItem,
} from '@/widgets/entity-list-sidebar'

const NO_COUNTRY = '__no-country__'
const INDIGO_ACCENT = '#4f46e5'

const SIDEBAR_ECHELON_ORDER: Record<string, number> = {
  SUPREME_COMMAND: -3,
  GENERAL_STAFF: -2,
  SERVICE_HQ: -1,
  THEATER: 1,
  ARMY_GROUP: 2,
  FRONT: 2,
  MILITARY_DISTRICT: 3,
  FIELD_ARMY: 4,
  FLEET: 4,
  AIR_FLEET: 4,
  CORPS: 5,
  AIR_CORPS: 5,
  DIVISION: 6,
  WING: 6,
  BRIGADE: 7,
  REGIMENT: 8,
  SQUADRON: 8,
  BATTALION: 9,
  SPECIAL_FORCES: 9,
  DETACHMENT: 10,
  COMPANY: 11,
  PLATOON: 12,
  SQUAD: 13,
  OTHER: 99,
}

export interface MilitaryUnitListSidebarProps {
  selectedId?: string | null
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function MilitaryUnitListSidebar({
  selectedId: selectedIdProp,
  collapsed = false,
  onToggleCollapse,
}: MilitaryUnitListSidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const listSearch =
    (location.state as { listSearch?: string } | null)?.listSearch ?? ''
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['military-units', 'global-catalog'],
    queryFn: () => militaryUnitApi.getAll(),
    staleTime: 60_000,
  })
  const { pinnedIds, togglePin } = useSidebarPins('military-unit-sidebar-pins')
  const { selectedId: anchorUnitId } = useAnchorSelection('unitId')
  const effectiveSelectedId = selectedIdProp ?? anchorUnitId
  const [query, setQuery] = useState('')

  const handleSelect = useCallback(
    (nextUnitId: string) => {
      navigate(pathKeys.militaryUnitDetail(nextUnitId), {
        state: listSearch ? { listSearch } : undefined,
      })
    },
    [navigate, listSearch],
  )

  const { items, groups } = useMemo(() => {
    const list = (data ?? []) as Array<{
      id: string
      name: string
      unitType?: string | null
      country?: { name?: string | null } | null
      historicalCountry?: { name?: string | null } | null
    }>
    const groupMeta = new Map<string, string>()
    const sortedList = [...list].sort((left, right) => {
      const leftRank = left.unitType
        ? (SIDEBAR_ECHELON_ORDER[left.unitType] ?? 50)
        : 50
      const rightRank = right.unitType
        ? (SIDEBAR_ECHELON_ORDER[right.unitType] ?? 50)
        : 50
      if (leftRank !== rightRank) return leftRank - rightRank
      return left.name.localeCompare(right.name, 'ko')
    })
    const rows = sortedList.map<EntitySidebarItem>((unit) => {
      const countryName =
        unit.historicalCountry?.name ?? unit.country?.name ?? null
      const groupId = countryName ?? NO_COUNTRY
      if (!groupMeta.has(groupId)) {
        groupMeta.set(groupId, countryName ?? '국가 미지정')
      }
      return {
        id: unit.id,
        name: unit.name,
        meta: [unit.unitType ? militaryUnitTypeLabelKo(unit.unitType) : null, countryName],
        groupId,
      }
    })

    const ordered: EntitySidebarGroup[] = [...groupMeta.entries()]
      .filter(([groupId]) => groupId !== NO_COUNTRY)
      .sort((left, right) => left[1].localeCompare(right[1], 'ko'))
      .map(([groupId, name]) => ({
        id: groupId,
        name,
        accent: INDIGO_ACCENT,
      }))
    if (groupMeta.has(NO_COUNTRY)) {
      ordered.push({ id: NO_COUNTRY, name: '국가 미지정', accent: '#a1a1aa' })
    }

    return { items: filterSidebarItems(rows, query), groups: ordered }
  }, [data, query])

  return (
    <EntityListSidebar
      title="사령부 · 편제"
      noun="부대"
      domainKey="military-unit"
      items={items}
      totalCount={data?.length ?? 0}
      groups={groups}
      selectedId={effectiveSelectedId}
      onSelect={handleSelect}
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
