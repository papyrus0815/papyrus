/**
 * 전 국가 정부·내각 / 중앙부처 사이드바 — `/government/cabinets/:id`, `/government/departments/:id` 좌측.
 *
 * 카탈로그 본문(`/government`)과 같은 React Query 키를 공유해 추가 네트워크 요청 없이
 * 상세 화면에서 다른 국가의 내각이나 기관으로 즉시 이동할 수 있게 한다.
 */
import React, { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiColumns } from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'

import {
  administrationDepartmentApi,
  DEPARTMENT_KIND_LABEL,
} from '@/shared/api/administration-department'
import { personCareerApi } from '@/shared/api/person-career'
import { getUploadImageUrl } from '@/shared/api/upload'
import { pathKeys } from '@/shared/router'
import {
  EntityListSidebar,
  type EntitySidebarGroup,
  type EntitySidebarItem,
  filterSidebarItems,
  useSidebarPins,
} from '@/widgets/entity-list-sidebar'

import {
  formatIsoShortPeriod,
  readGovernmentListSearch,
  resolveCabinetDisplayTitle,
  resolveCabinetHeadName,
  resolveCabinetPolityInfo,
  resolveDepartmentPolityInfo,
} from '@/pages/government/government-helpers'

const NO_COUNTRY_GROUP = '__no-country__'
const GROUP_PALETTE = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
]

export interface GovernmentListSidebarProps {
  mode: 'cabinets' | 'departments'
  selectedId: string | null
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function GovernmentListSidebar({
  mode,
  selectedId,
  collapsed = false,
  onToggleCollapse,
}: GovernmentListSidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const listSearch = readGovernmentListSearch(location.state)

  const [query, setQuery] = useState('')
  const { pinnedIds, togglePin } = useSidebarPins(
    mode === 'cabinets'
      ? 'global-cabinet-sidebar-pins'
      : 'global-department-sidebar-pins',
  )

  const cabinetsQuery = useQuery({
    queryKey: ['global-cabinets', 'all'],
    queryFn: () => personCareerApi.getCabinets({ take: 500 }),
    enabled: mode === 'cabinets',
    staleTime: 60_000,
  })

  const departmentsQuery = useQuery({
    queryKey: ['global-departments', 'all'],
    queryFn: () => administrationDepartmentApi.getAll({ take: 500 }),
    enabled: mode === 'departments',
    staleTime: 60_000,
  })

  const { items, groups, totalCount } = useMemo(() => {
    const groupNameMap = new Map<string, string>()

    if (mode === 'cabinets') {
      const sourceList = cabinetsQuery.data ?? []
      const mappedRows = sourceList.map<EntitySidebarItem>((cabinetItem) => {
        const polity = resolveCabinetPolityInfo(cabinetItem)
        const groupId = polity.polityId ?? NO_COUNTRY_GROUP
        if (!groupNameMap.has(groupId)) {
          groupNameMap.set(
            groupId,
            polity.flagEmoji
              ? `${polity.flagEmoji} ${polity.polityName}`
              : polity.polityName,
          )
        }
        const periodLabel = formatIsoShortPeriod(
          cabinetItem.headTenure?.startDate ?? cabinetItem.startDate,
          cabinetItem.headTenure
            ? cabinetItem.headTenure.endDate
            : cabinetItem.endDate,
          !polity.isHistorical,
        )
        const headName = resolveCabinetHeadName(cabinetItem)
        const displayTitle = resolveCabinetDisplayTitle(cabinetItem)
        const profileUrl = cabinetItem.headTenure?.person?.profileImageUrl
          ? getUploadImageUrl(cabinetItem.headTenure.person.profileImageUrl)
          : null

        return {
          id: cabinetItem.id,
          name: displayTitle,
          meta: [
            headName !== displayTitle ? headName : null,
            periodLabel,
          ],
          thumbnailUrl: profileUrl,
          groupId,
        }
      })

      const orderedGroups: EntitySidebarGroup[] = [...groupNameMap.entries()]
        .filter(([groupId]) => groupId !== NO_COUNTRY_GROUP)
        .sort((leftEntry, rightEntry) =>
          leftEntry[1].localeCompare(rightEntry[1], 'ko'),
        )
        .map(([groupId, label], idx) => ({
          id: groupId,
          name: label,
          accent: GROUP_PALETTE[idx % GROUP_PALETTE.length],
        }))
      if (groupNameMap.has(NO_COUNTRY_GROUP)) {
        orderedGroups.push({
          id: NO_COUNTRY_GROUP,
          name: '국가 미지정',
          accent: '#94a3b8',
        })
      }

      return {
        items: filterSidebarItems(mappedRows, query),
        groups: orderedGroups,
        totalCount: sourceList.length,
      }
    }

    const deptSourceList = departmentsQuery.data ?? []
    const mappedDeptRows = deptSourceList.map<EntitySidebarItem>((deptItem) => {
      const polity = resolveDepartmentPolityInfo(deptItem)
      const groupId = polity.polityId ?? NO_COUNTRY_GROUP
      if (!groupNameMap.has(groupId)) {
        groupNameMap.set(
          groupId,
          polity.flagEmoji
            ? `${polity.flagEmoji} ${polity.polityName}`
            : polity.polityName,
        )
      }
      return {
        id: deptItem.id,
        name: deptItem.name,
        meta: [
          deptItem.category?.name ?? DEPARTMENT_KIND_LABEL[deptItem.kind],
          deptItem.abbreviation ?? null,
        ],
        thumbnailUrl: deptItem.thumbnailUrl
          ? getUploadImageUrl(deptItem.thumbnailUrl)
          : null,
        groupId,
      }
    })

    const orderedDeptGroups: EntitySidebarGroup[] = [...groupNameMap.entries()]
      .filter(([groupId]) => groupId !== NO_COUNTRY_GROUP)
      .sort((leftEntry, rightEntry) =>
        leftEntry[1].localeCompare(rightEntry[1], 'ko'),
      )
      .map(([groupId, label], idx) => ({
        id: groupId,
        name: label,
        accent: GROUP_PALETTE[idx % GROUP_PALETTE.length],
      }))
    if (groupNameMap.has(NO_COUNTRY_GROUP)) {
      orderedDeptGroups.push({
        id: NO_COUNTRY_GROUP,
        name: '국가 미지정',
        accent: '#94a3b8',
      })
    }

    return {
      items: filterSidebarItems(mappedDeptRows, query),
      groups: orderedDeptGroups,
      totalCount: deptSourceList.length,
    }
  }, [mode, cabinetsQuery.data, departmentsQuery.data, query])

  const isLoading =
    mode === 'cabinets' ? cabinetsQuery.isLoading : departmentsQuery.isLoading
  const isError =
    mode === 'cabinets' ? cabinetsQuery.isError : departmentsQuery.isError

  return (
    <EntityListSidebar
      title={mode === 'cabinets' ? '전 국가 내각' : '전 국가 부처·기관'}
      noun={mode === 'cabinets' ? '내각' : '기관'}
      domainKey={mode === 'cabinets' ? 'global-cabinet' : 'global-department'}
      items={items}
      totalCount={totalCount}
      groups={groups}
      selectedId={selectedId}
      onSelect={(nextId) => {
        if (!nextId) return
        const destination =
          mode === 'cabinets'
            ? pathKeys.government.cabinetDetail(nextId)
            : pathKeys.government.departmentDetail(nextId)
        navigate(destination, {
          state: { governmentListSearch: listSearch },
        })
      }}
      query={query}
      onQueryChange={setQuery}
      hasActiveFilter={Boolean(query.trim())}
      onClearFilters={() => setQuery('')}
      pinnedIds={pinnedIds}
      onTogglePin={togglePin}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => {
        if (mode === 'cabinets') void cabinetsQuery.refetch()
        else void departmentsQuery.refetch()
      }}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      collapsedIcon={<FiColumns size={16} />}
    />
  )
}
