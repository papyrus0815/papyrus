/**
 * 인물 묶음 목록 사이드바 — `/person-groups/:groupId` 좌측.
 * 묶음 유형(세대·계파·사단 …) 그룹핑, 행 클릭 시 묶음 상세로 이동.
 */
import React, { useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiGrid } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

import {
  GROUP_TONE,
  listPersonGroups,
  PERSON_GROUP_TYPE_META,
  PERSON_GROUP_TYPE_ORDER,
} from '@/shared/api/person-groups'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import {
  EntityListSidebar,
  filterSidebarItems,
  useSidebarPins,
  type EntitySidebarGroup,
  type EntitySidebarItem,
} from '@/widgets/entity-list-sidebar'
import { PersonGroupCreateModal } from '@/widgets/person/person-group-create-modal/person-group-create-modal'

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
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['person-groups-all'],
    queryFn: () => listPersonGroups(),
    staleTime: 60_000,
  })
  const { pinnedIds, togglePin } = useSidebarPins('person-group-sidebar-pins')
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const group of data ?? []) {
      counts.set(group.type, (counts.get(group.type) ?? 0) + 1)
    }
    return counts
  }, [data])

  const items = useMemo<EntitySidebarItem[]>(() => {
    const rows = (data ?? [])
      .filter((group) => !typeFilter || group.type === typeFilter)
      .map<EntitySidebarItem>((group) => {
        const typeLabel = PERSON_GROUP_TYPE_META[group.type]?.label ?? group.type
        const countryLabel = group.historicalCountryName ?? group.countryName
        const centerLabel = group.center
          ? `★ ${getPersonDisplayName(group.center, true)}`
          : null
        const memberNames = (group.members ?? [])
          .map((m) => [
            getPersonDisplayName(m.person, true),
            m.person.name,
            m.person.surname,
            m.roleLabel,
          ])
          .flat()
          .filter(Boolean)
          .join(' ')
        const searchText = [
          group.name,
          typeLabel,
          group.countryName,
          group.historicalCountryName,
          centerLabel,
          group.description,
          memberNames,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return {
          id: group.id,
          name: group.name,
          meta: [
            countryLabel,
            centerLabel,
            !countryLabel && !centerLabel ? typeLabel : null,
          ],
          badgeText: (PERSON_GROUP_TYPE_META[group.type]?.label ?? '?').slice(
            0,
            1,
          ),
          metric: group.memberCount,
          groupId: group.type,
          searchText,
        }
      })
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
    <>
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
              { value: '', label: `유형 전체 (${data?.length ?? 0})` },
              ...PERSON_GROUP_TYPE_ORDER.filter(
                (type) => (typeCounts.get(type) ?? 0) > 0 || type === typeFilter,
              ).map((type) => ({
                value: type,
                label: `${PERSON_GROUP_TYPE_META[type]?.label ?? type} (${typeCounts.get(type) ?? 0})`,
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
        onAdd={onAdd ?? (() => setCreateOpen(true))}
        addLabel="묶음 등록"
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        collapsedIcon={<FiGrid size={16} />}
      />
      {createOpen && (
        <PersonGroupCreateModal
          onClose={() => setCreateOpen(false)}
          onCreated={(created) => {
            setCreateOpen(false)
            void queryClient.invalidateQueries({
              queryKey: ['person-groups-all'],
            })
            navigate(pathKeys.personGroupDetail(created.id))
          }}
        />
      )}
    </>
  )
}
