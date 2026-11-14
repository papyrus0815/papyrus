/**
 * 전 국가 정부·내각 / 중앙부처 사이드바 — `/government/cabinets/:id`, `/government/departments/:id` 좌측.
 *
 * 카탈로그 본문(`/government`)과 같은 React Query 키(`['global-cabinets', 'all']` / `['global-departments', 'all']`)를
 * 공유해 추가 네트워크 요청 없이 상세 화면에서 다른 국가의 내각이나 기관으로 즉시 이동할 수 있게 한다.
 * 또한 카탈로그에서 넘어온 검색·시점·국가 필터 맥락(`listSearch`)을 존중하며 언제든 전체 보기로 해제할 수 있다.
 */
import React, { useEffect, useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiColumns } from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'

import type { PositionCategory } from '@/entities/government-position/model/types'
import {
  extractSignedStartYearFromIso,
  formatIsoShortPeriod,
  readGovernmentListSearch,
  resolveCabinetCategory,
  resolveCabinetDisplayTitle,
  resolveCabinetEffectiveDates,
  resolveCabinetHeadName,
  resolveCabinetPolityInfo,
  resolveDepartmentPolityInfo,
} from '@/pages/government/government-helpers'
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

const NO_COUNTRY_GROUP = '__no-country__'
const SIDEBAR_FETCH_LIMIT = 2500
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

interface ParsedCatalogFilterContext {
  hasFilter: boolean
  polityCountryId: string | null
  polityHistoricalCountryId: string | null
  activeAtYear: number | null
  currentOnly: boolean
  linkedOnly: boolean
  cabCat: PositionCategory | ''
  deptKind: string
  deptCategoryId: string
  deptStatus: string
  keyword: string
}

function parseCatalogFilterContext(listSearch: string): ParsedCatalogFilterContext {
  const params = new URLSearchParams(
    listSearch.startsWith('?') ? listSearch.slice(1) : listSearch,
  )
  const polity = params.get('polity') ?? ''
  const polityCountryId =
    polity.startsWith('C:') || polity.startsWith('m:') ? polity.slice(2) : null
  const polityHistoricalCountryId =
    polity.startsWith('H:') || polity.startsWith('h:') ? polity.slice(2) : null
  const yearRaw = params.get('year') ?? ''
  const parsedYear = yearRaw ? Number.parseInt(yearRaw, 10) : Number.NaN
  const activeAtYear =
    Number.isFinite(parsedYear) && parsedYear !== 0 ? parsedYear : null
  const currentOnly = params.get('current') === '1'
  const linkedOnly = params.get('linked') === '1'
  const cabCat = (params.get('cabCat') ?? '') as PositionCategory | ''
  const deptKind = params.get('kind') ?? ''
  const deptCategoryId = params.get('categoryId') ?? ''
  const deptStatus = params.get('status') ?? 'all'
  const keyword = (params.get('q') ?? '').trim().toLowerCase()

  const hasFilter = Boolean(
    polityCountryId ||
      polityHistoricalCountryId ||
      activeAtYear != null ||
      currentOnly ||
      linkedOnly ||
      cabCat ||
      deptKind ||
      deptCategoryId ||
      deptStatus !== 'all' ||
      keyword,
  )

  return {
    hasFilter,
    polityCountryId,
    polityHistoricalCountryId,
    activeAtYear,
    currentOnly,
    linkedOnly,
    cabCat,
    deptKind,
    deptCategoryId,
    deptStatus,
    keyword,
  }
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

  const catalogFilterCtx = useMemo(
    () => parseCatalogFilterContext(listSearch),
    [listSearch],
  )

  const [query, setQuery] = useState('')
  const [scopeToCatalogFilter, setScopeToCatalogFilter] = useState<boolean>(
    () => catalogFilterCtx.hasFilter,
  )

  useEffect(() => {
    setScopeToCatalogFilter(catalogFilterCtx.hasFilter)
  }, [catalogFilterCtx.hasFilter, listSearch])

  const { pinnedIds, togglePin } = useSidebarPins(
    mode === 'cabinets'
      ? 'global-cabinet-sidebar-pins'
      : 'global-department-sidebar-pins',
  )

  const cabinetsQuery = useQuery({
    queryKey: ['global-cabinets', 'all'],
    queryFn: () => personCareerApi.getCabinets({ take: SIDEBAR_FETCH_LIMIT }),
    enabled: mode === 'cabinets',
    staleTime: 60_000,
  })

  const departmentsQuery = useQuery({
    queryKey: ['global-departments', 'all'],
    queryFn: () =>
      administrationDepartmentApi.getAll({ take: SIDEBAR_FETCH_LIMIT }),
    enabled: mode === 'departments',
    staleTime: 60_000,
  })

  const { items, groups, totalCount } = useMemo(() => {
    const groupNameMap = new Map<string, string>()

    if (mode === 'cabinets') {
      const fullList = cabinetsQuery.data ?? []
      const scopedList =
        scopeToCatalogFilter && catalogFilterCtx.hasFilter
          ? fullList.filter((cabinetItem) => {
              if (cabinetItem.id === selectedId) return true
              const polity = resolveCabinetPolityInfo(cabinetItem)
              const effDates = resolveCabinetEffectiveDates(cabinetItem)
              if (
                catalogFilterCtx.polityCountryId &&
                polity.modernCountryId !== catalogFilterCtx.polityCountryId
              ) {
                return false
              }
              if (
                catalogFilterCtx.polityHistoricalCountryId &&
                polity.historicalCountryId !==
                  catalogFilterCtx.polityHistoricalCountryId
              ) {
                return false
              }
              if (catalogFilterCtx.activeAtYear != null) {
                const startY = extractSignedStartYearFromIso(effDates.startDate)
                const endY = extractSignedStartYearFromIso(effDates.endDate)
                if (startY == null && endY == null) return false
                const low = startY ?? endY!
                const high = endY ?? Number.MAX_SAFE_INTEGER
                if (
                  catalogFilterCtx.activeAtYear < low ||
                  catalogFilterCtx.activeAtYear > high
                ) {
                  return false
                }
              }
              if (catalogFilterCtx.currentOnly && !effDates.isOngoing) {
                return false
              }
              if (catalogFilterCtx.linkedOnly && !cabinetItem.linkageGroup) {
                return false
              }
              if (
                catalogFilterCtx.cabCat &&
                resolveCabinetCategory(cabinetItem) !== catalogFilterCtx.cabCat
              ) {
                return false
              }
              if (catalogFilterCtx.keyword) {
                const hay = [
                  polity.polityName,
                  resolveCabinetHeadName(cabinetItem),
                  resolveCabinetDisplayTitle(cabinetItem),
                ]
                  .join(' ')
                  .toLowerCase()
                if (!hay.includes(catalogFilterCtx.keyword)) return false
              }
              return true
            })
          : fullList

      const mappedRows = scopedList.map<EntitySidebarItem>((cabinetItem) => {
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
        const effectiveDates = resolveCabinetEffectiveDates(cabinetItem)
        const periodLabel = formatIsoShortPeriod(
          effectiveDates.startDate,
          effectiveDates.endDate,
          effectiveDates.isOngoing,
        )
        const headName = resolveCabinetHeadName(cabinetItem)
        const displayTitle = resolveCabinetDisplayTitle(cabinetItem)
        const profileUrl = cabinetItem.headTenure?.person?.profileImageUrl
          ? getUploadImageUrl(cabinetItem.headTenure.person.profileImageUrl)
          : null

        return {
          id: cabinetItem.id,
          name: displayTitle,
          meta: [headName !== displayTitle ? headName : null, periodLabel],
          thumbnailUrl: profileUrl,
          groupId,
        }
      })

      const orderedGroups: EntitySidebarGroup[] = [...groupNameMap.entries()]
        .filter(([groupId]) => groupId !== NO_COUNTRY_GROUP)
        .sort((leftEntry, rightEntry) =>
          leftEntry[1].localeCompare(rightEntry[1], 'ko'),
        )
        .map(([groupId, label], groupIdx) => ({
          id: groupId,
          name: label,
          accent: GROUP_PALETTE[groupIdx % GROUP_PALETTE.length],
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
        totalCount: fullList.length,
      }
    }

    const fullDeptList = departmentsQuery.data ?? []
    const scopedDeptList =
      scopeToCatalogFilter && catalogFilterCtx.hasFilter
        ? fullDeptList.filter((deptItem) => {
            if (deptItem.id === selectedId) return true
            const polity = resolveDepartmentPolityInfo(deptItem)
            if (
              catalogFilterCtx.polityCountryId &&
              polity.modernCountryId !== catalogFilterCtx.polityCountryId
            ) {
              return false
            }
            if (
              catalogFilterCtx.polityHistoricalCountryId &&
              polity.historicalCountryId !==
                catalogFilterCtx.polityHistoricalCountryId
            ) {
              return false
            }
            if (
              catalogFilterCtx.deptKind &&
              deptItem.kind !== catalogFilterCtx.deptKind
            ) {
              return false
            }
            if (
              catalogFilterCtx.deptCategoryId &&
              deptItem.categoryId !== catalogFilterCtx.deptCategoryId
            ) {
              return false
            }
            if (catalogFilterCtx.deptStatus !== 'all') {
              const isAbolished = Boolean(
                deptItem.abolished || deptItem.abolishedDate,
              )
              if (catalogFilterCtx.deptStatus === 'active' && isAbolished) {
                return false
              }
              if (catalogFilterCtx.deptStatus === 'abolished' && !isAbolished) {
                return false
              }
            }
            if (catalogFilterCtx.keyword) {
              const hay = [
                deptItem.name,
                deptItem.abbreviation ?? '',
                polity.polityName,
              ]
                .join(' ')
                .toLowerCase()
              if (!hay.includes(catalogFilterCtx.keyword)) return false
            }
            return true
          })
        : fullDeptList

    const mappedDeptRows = scopedDeptList.map<EntitySidebarItem>((deptItem) => {
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
      .map(([groupId, label], groupIdx) => ({
        id: groupId,
        name: label,
        accent: GROUP_PALETTE[groupIdx % GROUP_PALETTE.length],
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
      totalCount: fullDeptList.length,
    }
  }, [
    mode,
    cabinetsQuery.data,
    departmentsQuery.data,
    scopeToCatalogFilter,
    catalogFilterCtx,
    selectedId,
    query,
  ])

  const isLoading =
    mode === 'cabinets' ? cabinetsQuery.isLoading : departmentsQuery.isLoading
  const isError =
    mode === 'cabinets' ? cabinetsQuery.isError : departmentsQuery.isError

  const isCatalogContextScoped =
    scopeToCatalogFilter && catalogFilterCtx.hasFilter

  return (
    <EntityListSidebar
      title={
        mode === 'cabinets'
          ? isCatalogContextScoped
            ? '필터된 내각 목록'
            : '전 국가 내각'
          : isCatalogContextScoped
            ? '필터된 부처·기관'
            : '전 국가 부처·기관'
      }
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
      hasActiveFilter={Boolean(query.trim()) || isCatalogContextScoped}
      onClearFilters={() => {
        setQuery('')
        setScopeToCatalogFilter(false)
      }}
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
