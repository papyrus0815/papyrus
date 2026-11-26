/**
 * 군부대 목록 사이드바 — `/military/units/:unitId` 좌측.
 *
 * 카탈로그 본문(`/military`)과 동일한 쿼리 키(`militaryUnitQueryKeys.globalCatalog()`)를 공유하며,
 * 국가 군사 탭(`fromCountry`) 또는 총람 필터(`listSearch`)에서 넘어온 맥락을 기본 스코프로 존중하되
 * 언제든 `전 국가 보기`로 확장해 다른 국가·시대 사령부·편제로 건너갈 수 있게 한다.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiShield } from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import {
  extractUnitSignedYear,
  matchesMilitaryBranchTab,
  matchesMilitaryEchelonTier,
  MILITARY_BRANCH_LABELS,
  MILITARY_BRANCH_TABS,
  MILITARY_ECHELON_ORDER,
  type MilitaryBranchTabKey,
  type MilitaryEchelonTierFilter,
  militaryUnitQueryKeys,
  parseSnapshotYearInput,
} from '@/entities/military-unit'
import { centuryOf } from '@/pages/events/list/lib/era-strip.lib'
import {
  militaryUnitApi,
  type MilitaryUnitDto,
} from '@/shared/api/military-unit'
import { getUploadImageUrl } from '@/shared/api/upload'
import { militaryUnitTypeLabelKo } from '@/shared/lib/military-unit-type-label'
import { pathKeys } from '@/shared/router'
import {
  EntityListSidebar,
  type EntitySidebarGroup,
  type EntitySidebarItem,
  type EntitySidebarSelect,
  filterSidebarItems,
  useAnchorSelection,
  useSidebarPins,
} from '@/widgets/entity-list-sidebar'

const NO_COUNTRY = '__no-country__'

const GROUP_PALETTE = [
  '#4f46e5',
  '#0284c7',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#0d9488',
  '#dc2626',
]

interface LocationMilitaryState {
  listSearch?: string
  fromCountry?: {
    id: string
    name?: string | null
  } | null
}

interface ParsedCatalogSearch {
  hasFilter: boolean
  branch: MilitaryBranchTabKey
  country: string
  tier: MilitaryEchelonTierFilter
  snapshotYear: number | null
  centuryKey: string | null
  decadeStart: number | null
  currentOnly: boolean
  keyword: string
}

function parseListSearchContext(listSearch: string): ParsedCatalogSearch {
  const params = new URLSearchParams(
    listSearch.startsWith('?') ? listSearch.slice(1) : listSearch,
  )
  const branch = (params.get('branch') as MilitaryBranchTabKey) || 'ALL'
  const country = (params.get('country') ?? '').trim()
  const tier = (params.get('tier') as MilitaryEchelonTierFilter) || 'ALL'
  const yearRaw = (params.get('year') ?? '').trim()
  const snapshotYear = parseSnapshotYearInput(yearRaw)
  const centuryKey = params.get('century') ?? null
  const decadeRaw = params.get('decade')
  const decadeStart =
    decadeRaw !== null && decadeRaw !== '' && Number.isFinite(Number(decadeRaw))
      ? Number(decadeRaw)
      : null
  const currentOnly = params.get('active') === '1'
  const keyword = (params.get('q') ?? '').trim().toLowerCase()

  const hasFilter = Boolean(
    branch !== 'ALL' ||
      country ||
      tier !== 'ALL' ||
      snapshotYear !== null ||
      centuryKey ||
      decadeStart !== null ||
      currentOnly ||
      keyword,
  )

  return {
    hasFilter,
    branch,
    country,
    tier,
    snapshotYear,
    centuryKey,
    decadeStart,
    currentOnly,
    keyword,
  }
}

function formatCompactYearSpan(unit: MilitaryUnitDto): string | null {
  const startYr = extractUnitSignedYear(unit.established, unit.establishedDate)
  const endYr = extractUnitSignedYear(unit.disbanded, unit.disbandedDate)
  if (startYr == null && endYr == null) {
    return unit.isActive === false ? '해체' : null
  }
  const fmt = (yr: number) => (yr < 0 ? `BC ${Math.abs(yr)}` : String(yr))
  if (startYr != null && endYr != null) {
    return startYr === endYr ? fmt(startYr) : `${fmt(startYr)}–${fmt(endYr)}`
  }
  if (startYr != null) {
    return unit.isActive === false ? `${fmt(startYr)}–?` : `${fmt(startYr)}–`
  }
  return endYr != null ? `–${fmt(endYr)}` : null
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
  const locState = (location.state as LocationMilitaryState | null) ?? null
  const listSearch = locState?.listSearch ?? ''
  const fromCountry = locState?.fromCountry ?? null

  const parsedCatalog = useMemo(
    () => parseListSearchContext(listSearch),
    [listSearch],
  )
  const hasIncomingContext = Boolean(fromCountry?.id) || parsedCatalog.hasFilter

  const [scopeToContext, setScopeToContext] = useState<boolean>(
    () => hasIncomingContext,
  )
  const [query, setQuery] = useState('')
  const [branchFilter, setBranchFilter] = useState<string>('')

  useEffect(() => {
    setScopeToContext(hasIncomingContext)
  }, [hasIncomingContext, fromCountry?.id, listSearch])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: militaryUnitQueryKeys.globalCatalog(),
    queryFn: () => militaryUnitApi.getAll(),
    staleTime: 60_000,
  })
  const { pinnedIds, togglePin } = useSidebarPins('military-unit-sidebar-pins')
  const { selectedId: anchorUnitId } = useAnchorSelection('unitId')
  const effectiveSelectedId = selectedIdProp ?? anchorUnitId

  const fullList = useMemo(
    () => (data ?? []) as MilitaryUnitDto[],
    [data],
  )

  const handleSelect = useCallback(
    (nextUnitId: string) => {
      if (!nextUnitId) return
      const targetUnit = fullList.find((item) => item.id === nextUnitId)
      const keepFromCountry =
        fromCountry?.id &&
        targetUnit &&
        (targetUnit.countryId === fromCountry.id ||
          targetUnit.historicalCountryId === fromCountry.id ||
          (fromCountry.name &&
            (targetUnit.country?.name === fromCountry.name ||
              targetUnit.historicalCountry?.name === fromCountry.name)))

      const nextState: LocationMilitaryState = {}
      if (listSearch) nextState.listSearch = listSearch
      if (keepFromCountry && fromCountry) nextState.fromCountry = fromCountry

      navigate(pathKeys.militaryUnitDetail(nextUnitId), {
        state: Object.keys(nextState).length > 0 ? nextState : undefined,
      })
    },
    [navigate, fullList, listSearch, fromCountry],
  )

  const isContextScoped = scopeToContext && hasIncomingContext

  const { items, groups } = useMemo(() => {
    const contextFiltered = isContextScoped
      ? fullList.filter((unit) => {
          if (unit.id === effectiveSelectedId) return true
          if (fromCountry?.id) {
            const matchesFromCountry =
              unit.countryId === fromCountry.id ||
              unit.historicalCountryId === fromCountry.id ||
              Boolean(
                fromCountry.name &&
                  (unit.country?.name === fromCountry.name ||
                    unit.historicalCountry?.name === fromCountry.name),
              )
            if (!matchesFromCountry) return false
          }

          if (parsedCatalog.hasFilter) {
            if (
              parsedCatalog.branch !== 'ALL' &&
              !matchesMilitaryBranchTab(unit.branch, parsedCatalog.branch)
            ) {
              return false
            }
            const histLabel = unit.historicalCountry?.name?.trim() || null
            const modLabel = unit.country?.name?.trim() || null
            if (parsedCatalog.country) {
              const matchesCountry =
                parsedCatalog.country === '국가 미지정'
                  ? !histLabel && !modLabel
                  : histLabel === parsedCatalog.country ||
                    modLabel === parsedCatalog.country
              if (!matchesCountry) return false
            }
            if (!matchesMilitaryEchelonTier(unit.unitType, parsedCatalog.tier)) {
              return false
            }
            if (parsedCatalog.currentOnly && unit.isActive === false) {
              return false
            }

            const startYr = extractUnitSignedYear(
              unit.established,
              unit.establishedDate,
            )
            const endYr = extractUnitSignedYear(
              unit.disbanded,
              unit.disbandedDate,
            )

            if (parsedCatalog.decadeStart !== null) {
              if (startYr == null) return false
              const decEnd = parsedCatalog.decadeStart + 9
              const unitEnd =
                endYr ??
                (unit.isActive !== false ? new Date().getFullYear() : startYr)
              if (startYr > decEnd || unitEnd < parsedCatalog.decadeStart) {
                return false
              }
            } else if (
              parsedCatalog.centuryKey &&
              parsedCatalog.centuryKey.startsWith('c:')
            ) {
              const targetCentury = Number(parsedCatalog.centuryKey.slice(2))
              if (Number.isFinite(targetCentury)) {
                if (startYr == null) return false
                const unitStartC = centuryOf(startYr)
                const unitEndC =
                  endYr != null
                    ? centuryOf(endYr)
                    : unit.isActive !== false
                      ? centuryOf(new Date().getFullYear())
                      : unitStartC
                if (targetCentury < unitStartC || targetCentury > unitEndC) {
                  return false
                }
              }
            }

            if (parsedCatalog.snapshotYear !== null) {
              if (startYr == null && endYr == null) return false
              if (startYr != null && parsedCatalog.snapshotYear < startYr) {
                return false
              }
              if (endYr != null && parsedCatalog.snapshotYear > endYr) {
                return false
              }
            }

            if (parsedCatalog.keyword) {
              const hay = [
                unit.name,
                unit.abbreviation,
                unit.nameLocal,
                unit.nameEn,
                unit.nickname,
                unit.garrison,
                histLabel,
                modLabel,
              ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
              if (!hay.includes(parsedCatalog.keyword)) return false
            }
          }
          return true
        })
      : fullList

    const branchScoped = branchFilter
      ? contextFiltered.filter((unit) =>
          matchesMilitaryBranchTab(
            unit.branch,
            branchFilter as MilitaryBranchTabKey,
          ),
        )
      : contextFiltered

    const sortedList = [...branchScoped].sort((left, right) => {
      const leftRank = left.unitType
        ? (MILITARY_ECHELON_ORDER[left.unitType] ?? 50)
        : 50
      const rightRank = right.unitType
        ? (MILITARY_ECHELON_ORDER[right.unitType] ?? 50)
        : 50
      if (leftRank !== rightRank) return leftRank - rightRank
      return left.name.localeCompare(right.name, 'ko')
    })

    const groupMeta = new Map<string, string>()
    const rows = sortedList.map<EntitySidebarItem>((unit) => {
      const countryName =
        unit.historicalCountry?.name ?? unit.country?.name ?? null
      const flagEmoji = !unit.historicalCountry
        ? unit.country?.flagEmoji?.trim() || null
        : null
      const groupId =
        unit.historicalCountryId ?? unit.countryId ?? countryName ?? NO_COUNTRY
      if (!groupMeta.has(groupId)) {
        groupMeta.set(
          groupId,
          countryName
            ? flagEmoji
              ? `${flagEmoji} ${countryName}`
              : countryName
            : '국가 미지정',
        )
      }

      const typeKo = unit.unitType ? militaryUnitTypeLabelKo(unit.unitType) : null
      const branchKo = unit.branch
        ? (MILITARY_BRANCH_LABELS[unit.branch] ?? unit.branch)
        : null
      const classLabel = [typeKo, branchKo].filter(Boolean).join(' · ')
      const periodShort = formatCompactYearSpan(unit)
      const displayName = unit.abbreviation?.trim()
        ? `${unit.name} (${unit.abbreviation.trim()})`
        : unit.name
      const subCount = unit.subUnits?.length ?? 0

      return {
        id: unit.id,
        name: displayName,
        meta: [
          classLabel ? { text: classLabel, shrink: true } : null,
          periodShort,
        ],
        thumbnailUrl: unit.insigniaUrl
          ? getUploadImageUrl(unit.insigniaUrl)
          : null,
        noBadge: !unit.insigniaUrl,
        metric: subCount > 0 ? subCount : null,
        groupId,
        searchText: [
          unit.name,
          unit.abbreviation,
          unit.nameLocal,
          unit.nameEn,
          unit.nickname,
          unit.garrison,
          countryName,
          classLabel,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
      }
    })

    const orderedGroups: EntitySidebarGroup[] = [...groupMeta.entries()]
      .filter(([groupId]) => groupId !== NO_COUNTRY)
      .sort((left, right) => left[1].localeCompare(right[1], 'ko'))
      .map(([groupId, label], idx) => ({
        id: groupId,
        name: label,
        accent: GROUP_PALETTE[idx % GROUP_PALETTE.length],
      }))

    if (groupMeta.has(NO_COUNTRY)) {
      orderedGroups.push({
        id: NO_COUNTRY,
        name: '국가 미지정',
        accent: '#94a3b8',
      })
    }

    return { items: filterSidebarItems(rows, query), groups: orderedGroups }
  }, [
    fullList,
    isContextScoped,
    effectiveSelectedId,
    fromCountry,
    parsedCatalog,
    branchFilter,
    query,
  ])

  const sidebarSelects = useMemo<EntitySidebarSelect[]>(
    () => [
      {
        ariaLabel: '군종 필터',
        value: branchFilter,
        onChange: setBranchFilter,
        placeholder: '전체 군종',
        options: MILITARY_BRANCH_TABS.filter((tab) => tab.key !== 'ALL').map(
          (tab) => ({
            value: tab.key,
            label: tab.label,
          }),
        ),
      },
    ],
    [branchFilter],
  )

  const sidebarTitle = isContextScoped
    ? fromCountry?.name
      ? `${fromCountry.name} 편제`
      : '필터된 사령부 · 편제'
    : '사령부 · 편제'

  return (
    <EntityListSidebar
      title={sidebarTitle}
      noun="부대"
      domainKey="military-unit"
      items={items}
      totalCount={fullList.length}
      groups={groups}
      selectedId={effectiveSelectedId}
      onSelect={handleSelect}
      query={query}
      onQueryChange={setQuery}
      searchPlaceholder="부대명·약칭·주둔지 검색…"
      selects={sidebarSelects}
      hasActiveFilter={
        Boolean(query.trim()) || Boolean(branchFilter) || isContextScoped
      }
      onClearFilters={() => {
        setQuery('')
        setBranchFilter('')
        setScopeToContext(false)
      }}
      discovery={
        isContextScoped ? (
          <ContextScopeStrip>
            <span>
              {fromCountry?.name
                ? `${fromCountry.name} 소속 편제 표시 중`
                : '총람 필터 적용 중'}
            </span>
            <ScopeExpandBtn
              type="button"
              onClick={() => setScopeToContext(false)}
            >
              전 국가 보기
            </ScopeExpandBtn>
          </ContextScopeStrip>
        ) : undefined
      }
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

const ContextScopeStrip = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 2px 0;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ScopeExpandBtn = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 11.5px;
  font-weight: 650;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`
