import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiArrowUpRight,
  FiBookOpen,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiColumns,
  FiGrid,
  FiLink2,
  FiList,
  FiMoreHorizontal,
  FiPlus,
  FiRotateCcw,
  FiSearch,
  FiSliders,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import styled, { css } from 'styled-components'

import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerChipFill,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerRowWash,
  ledgerSurface,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import type { PositionCategory } from '@/entities/government-position/model/types'
import { useCountries } from '@/features/country/api'
import { useHistoricalCountries } from '@/features/historical-country/use-historical-countries.hook'
import {
  administrationDepartmentApi,
  type AdministrationDepartment,
  type AdministrationDepartmentKind,
  DEPARTMENT_KIND_LABEL,
  DEPARTMENT_KIND_OPTIONS,
} from '@/shared/api/administration-department'
import { getAllContinents } from '@/shared/api/continents'
import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import {
  type CabinetListItemDto,
  personCareerApi,
} from '@/shared/api/person-career'
import { getUploadImageUrl } from '@/shared/api/upload'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { useDocumentTitle } from '@/shared/hooks/use-document-title.hook'
import { formatCenturyLabel, getCenturyFromIso } from '@/shared/lib/iso-date'
import { pathKeys } from '@/shared/router'
import { InstitutionAppointmentModal } from '@/shared/ui/institution-appointment-modal'
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/shared/ui/searchable-select'
import { SidePanel } from '@/shared/ui/side-panel'
import {
  CabinetFormModal,
  type EditableCabinetRecord,
} from '@/widgets/country/country-detail/ui/cabinet-form-modal.widget'
import { APPOINTMENT_METHOD_LABEL } from '@/widgets/country/country-detail/ui/cabinets-section.helpers'
import { PositionDefinitionsSection } from '@/widgets/country/country-detail/ui/position-definitions-section.widget'
import {
  CountryInlineModal,
  type CountryInlineModalTarget,
  shouldInterceptEntityClick,
} from '@/widgets/country/country-inline-modal/country-inline-modal'
import { PersonInlineModal } from '@/widgets/person/person-inline-modal/person-inline-modal'

import { GovernmentDepartmentFormModal } from './components/government-department-form-modal'
import { GovernmentDetailDrawer } from './components/government-detail-drawer'
import {
  type GovernmentCenturyBucket,
  type GovernmentDecadeBucket,
  GovernmentEraStrip,
} from './components/government-era-strip'
import {
  type CabinetDisplayMode,
  type CabinetSortKey,
  type DepartmentSortKey,
  type DepartmentStatusFilter,
  extractSignedStartYearFromIso,
  formatIsoShortPeriod,
  formatSignedYearLabel,
  GLOBAL_CABINET_CATEGORY_LABELS,
  type GovernmentCatalogTab,
  type GovernmentListDensity,
  type GovernmentListReturnState,
  readGovernmentCatalogMemory,
  resolveCabinetCategory,
  resolveCabinetDisplayTitle,
  resolveCabinetEffectiveDates,
  resolveCabinetHeadName,
  resolveCabinetLeadingParty,
  resolveCabinetMinisterCount,
  resolveCabinetPolityInfo,
  resolveCabinetPositionTitle,
  resolveDepartmentPolityInfo,
  toEditableCabinetRecord,
  toModalPolityValue,
  toRememberedGovernmentQuery,
  writeGovernmentCatalogMemory,
} from './government-helpers'

const UNDATED_CHAPTER = '__undated__'
const CATALOG_FETCH_LIMIT = 2500
const SEARCH_QUERY_PARAM = 'q'

function formatCenturyRangeSubtitle(century: number): string {
  if (century > 0) return `${(century - 1) * 100 + 1}–${century * 100}`
  const endMagnitude = (-century - 1) * 100 + 1
  return `기원전 ${-century * 100}–${endMagnitude}`
}

function isInteractiveInputTarget(eventTarget: EventTarget | null): boolean {
  if (!(eventTarget instanceof HTMLElement)) return false
  const tag = eventTarget.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (eventTarget.isContentEditable) return true
  return Boolean(eventTarget.closest('[role="dialog"], [aria-modal="true"]'))
}

function getCabinetYearBounds(cabinetItem: CabinetListItemDto): {
  startYear: number | null
  endYear: number | null
} {
  const effective = resolveCabinetEffectiveDates(cabinetItem)
  const startYear = extractSignedStartYearFromIso(effective.startDate)
  const endYear = extractSignedStartYearFromIso(effective.endDate)
  return { startYear, endYear }
}

function doesCabinetMatchActiveYear(
  cabinetItem: CabinetListItemDto,
  targetYear: number,
): boolean {
  const { startYear, endYear } = getCabinetYearBounds(cabinetItem)
  if (startYear == null && endYear == null) return false
  const lower = startYear ?? endYear!
  const upper = endYear ?? Number.MAX_SAFE_INTEGER
  return lower <= targetYear && targetYear <= upper
}

function getDepartmentSignedYears(deptItem: AdministrationDepartment): {
  startYear: number | null
  endYear: number | null
} {
  const startYear = deptItem.established
    ? deptItem.established.era === 'BC'
      ? -Math.abs(deptItem.established.year)
      : Math.abs(deptItem.established.year)
    : extractSignedStartYearFromIso(deptItem.establishedDate)
  const endYear = deptItem.abolished
    ? deptItem.abolished.era === 'BC'
      ? -Math.abs(deptItem.abolished.year)
      : Math.abs(deptItem.abolished.year)
    : extractSignedStartYearFromIso(deptItem.abolishedDate)
  return { startYear, endYear }
}

function doesDepartmentMatchActiveYear(
  deptItem: AdministrationDepartment,
  targetYear: number,
): boolean {
  const { startYear, endYear } = getDepartmentSignedYears(deptItem)
  if (startYear == null && endYear == null) return false
  const lower = startYear ?? -99999
  const upper = endYear ?? Number.MAX_SAFE_INTEGER
  return lower <= targetYear && targetYear <= upper
}

interface FilterReleaseSuggestion {
  key: string
  label: string
  count: number
  onRelease: () => void
}

export function GovernmentCatalogPage() {
  useDocumentTitle('전 국가 정부 · 내각 카탈로그')
  const queryClient = useQueryClient()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const savedMemory = useMemo(() => readGovernmentCatalogMemory(), [])

  const activeTab: GovernmentCatalogTab =
    searchParams.get('tab') === 'departments' ? 'departments' : 'cabinets'
  const urlQueryText = searchParams.get('q') ?? ''
  const rawYearParam = searchParams.get('year') ?? ''
  const parsedYear =
    rawYearParam.trim() !== '' ? Number.parseInt(rawYearParam, 10) : Number.NaN
  const activeAtYear =
    Number.isFinite(parsedYear) && parsedYear !== 0 ? parsedYear : undefined

  const currentOnly = searchParams.get('current') === '1'
  const linkedOnly = searchParams.get('linked') === '1'
  const selectedContinentId = searchParams.get('continent') ?? ''
  const selectedPolityToken = searchParams.get('polity') ?? ''
  const cabinetCatFilter = (searchParams.get('cabCat') ?? '') as
    | PositionCategory
    | ''
  const deptCategoryFilter = searchParams.get('categoryId') ?? ''
  const deptKindFilter = (searchParams.get('kind') ?? '') as
    | AdministrationDepartmentKind
    | ''
  const deptStatusFilter = (searchParams.get('status') ??
    'all') as DepartmentStatusFilter
  const selectedId = searchParams.get('selected') ?? ''

  const cabinetSort = (searchParams.get('sort') ??
    savedMemory.cabinetSort ??
    'period_desc') as CabinetSortKey
  const deptSort = (searchParams.get('deptSort') ??
    savedMemory.deptSort ??
    'country') as DepartmentSortKey
  const displayMode: CabinetDisplayMode =
    (searchParams.get('view') as CabinetDisplayMode | null) ??
    savedMemory.displayMode ??
    'ledger'

  const [density, setDensity] = useState<GovernmentListDensity>(
    () => savedMemory.density ?? 'cozy',
  )
  const [searchDraft, setSearchDraft] = useState<string>(urlQueryText)
  const debouncedSearch = useDebouncedValue(searchDraft, 250)
  const [yearInputDraft, setYearInputDraft] = useState<string>(rawYearParam)

  const [positionDictOpen, setPositionDictOpen] = useState<boolean>(false)
  const [displayPopoverOpen, setDisplayPopoverOpen] = useState<boolean>(false)
  const [collapsedChapters, setCollapsedChapters] = useState<
    ReadonlySet<string>
  >(() => new Set(savedMemory.collapsedChapters ?? []))
  const [activeCenturyKey, setActiveCenturyKey] = useState<string | null>(null)

  const didInitQueryMemoryRef = useRef<boolean>(false)

  // In-place modals state
  const [cabinetModalOpen, setCabinetModalOpen] = useState<boolean>(false)
  const [editingCabinetRecord, setEditingCabinetRecord] =
    useState<EditableCabinetRecord | null>(null)
  const [deptModalOpen, setDeptModalOpen] = useState<boolean>(false)
  const [editingDepartmentRecord, setEditingDepartmentRecord] =
    useState<AdministrationDepartment | null>(null)
  const [appointingCabinet, setAppointingCabinet] =
    useState<CabinetListItemDto | null>(null)
  const [appointingDepartment, setAppointingDepartment] =
    useState<AdministrationDepartment | null>(null)
  const [personModalId, setPersonModalId] = useState<string | null>(null)
  const [countryModalTarget, setCountryModalTarget] =
    useState<CountryInlineModalTarget | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const ledgerScrollRef = useRef<HTMLDivElement>(null)
  const displayMenuWrapRef = useRef<HTMLDivElement>(null)

  // Restore remembered filter query once when visiting bare `/government`, and persist query updates
  useEffect(() => {
    if (!didInitQueryMemoryRef.current) {
      didInitQueryMemoryRef.current = true
      const skipMemoryRestore = Boolean(
        location.state &&
          typeof location.state === 'object' &&
          'skipGovernmentMemoryRestore' in location.state &&
          (location.state as { skipGovernmentMemoryRestore?: boolean })
            .skipGovernmentMemoryRestore,
      )
      if (!skipMemoryRestore && location.search === '' && savedMemory.lastQuery) {
        const restoredParams = new URLSearchParams(savedMemory.lastQuery)
        if ([...restoredParams.keys()].length > 0) {
          const restoredSearch = restoredParams.get(SEARCH_QUERY_PARAM) ?? ''
          const restoredYear = restoredParams.get('year') ?? ''
          setSearchDraft(restoredSearch)
          setYearInputDraft(restoredYear)
          setSearchParams(restoredParams, { replace: true })
          return
        }
      }
    }
    writeGovernmentCatalogMemory({
      lastQuery: toRememberedGovernmentQuery(searchParams),
    })
  }, [
    location.search,
    location.state,
    savedMemory.lastQuery,
    searchParams,
    setSearchParams,
  ])

  // Sync URL query param -> searchDraft on external navigation (back/forward)
  useEffect(() => {
    setSearchDraft((prevDraft) =>
      prevDraft === urlQueryText ? prevDraft : urlQueryText,
    )
  }, [urlQueryText])

  useEffect(() => {
    setYearInputDraft(rawYearParam)
  }, [rawYearParam])

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      setSearchParams(
        (prevParams) => {
          const nextParams = new URLSearchParams(prevParams)
          for (const [paramKey, paramValue] of Object.entries(updates)) {
            if (!paramValue) nextParams.delete(paramKey)
            else nextParams.set(paramKey, paramValue)
          }
          return nextParams
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  // Push debouncedSearch into URL `q`
  useEffect(() => {
    const trimmed = debouncedSearch.trim()
    if (trimmed === urlQueryText.trim()) return
    updateParams({ [SEARCH_QUERY_PARAM]: trimmed || null })
  }, [debouncedSearch, urlQueryText, updateParams])

  // Close display popover on outside click
  useEffect(() => {
    if (!displayPopoverOpen) return
    const handleOutsideMouseDown = (mouseEvent: MouseEvent) => {
      if (
        displayMenuWrapRef.current &&
        !displayMenuWrapRef.current.contains(mouseEvent.target as Node)
      ) {
        setDisplayPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideMouseDown)
    return () => document.removeEventListener('mousedown', handleOutsideMouseDown)
  }, [displayPopoverOpen])

  const returnState: GovernmentListReturnState = useMemo(
    () => ({
      governmentListSearch: location.search,
    }),
    [location.search],
  )

  // ─── Reference Queries ───────────────────────────────────────────────
  const { data: continents = [] } = useQuery({
    queryKey: ['continents', 'all'],
    queryFn: () => getAllContinents(),
    staleTime: 10 * 60_000,
  })
  const { data: modernCountries = [] } = useCountries()
  const { data: historicalCountries = [] } = useHistoricalCountries()
  const deptCategoriesQuery = useQuery({
    queryKey: ['administration-department-categories'],
    queryFn: () => administrationDepartmentApi.getCategories(),
    staleTime: 5 * 60_000,
  })

  // Continent lookup maps (modern + historical bridge via parentModernCountryIds)
  const { countryContinentMap, historicalContinentsMap } = useMemo(() => {
    const modernMap = new Map<string, string>()
    for (const countryItem of modernCountries) {
      if (countryItem.continentId) {
        modernMap.set(countryItem.id, countryItem.continentId)
      }
    }
    const histMap = new Map<string, Set<string>>()
    for (const histItem of historicalCountries) {
      const continentSet = new Set<string>()
      for (const parentModernId of histItem.parentModernCountryIds ?? []) {
        const contId = modernMap.get(parentModernId)
        if (contId) continentSet.add(contId)
      }
      if (continentSet.size > 0) {
        histMap.set(histItem.id, continentSet)
      }
    }
    return {
      countryContinentMap: modernMap,
      historicalContinentsMap: histMap,
    }
  }, [modernCountries, historicalCountries])

  const doesPolityMatchContinent = useCallback(
    (
      polity: {
        modernCountryId: string | null
        historicalCountryId: string | null
      },
      continentId: string,
    ): boolean => {
      if (!continentId) return true
      if (
        polity.modernCountryId &&
        countryContinentMap.get(polity.modernCountryId) === continentId
      ) {
        return true
      }
      if (polity.historicalCountryId) {
        const contSet = historicalContinentsMap.get(polity.historicalCountryId)
        if (contSet?.has(continentId)) return true
      }
      return false
    },
    [countryContinentMap, historicalContinentsMap],
  )

  // ─── Global Base Index Queries (shared with sidebar, enables counts & 0-result recovery) ───
  const allCabinetsQuery = useQuery({
    queryKey: ['global-cabinets', 'all'],
    queryFn: () => personCareerApi.getCabinets({ take: CATALOG_FETCH_LIMIT }),
    staleTime: 60_000,
  })

  const allDepartmentsQuery = useQuery({
    queryKey: ['global-departments', 'all'],
    queryFn: () =>
      administrationDepartmentApi.getAll({ take: CATALOG_FETCH_LIMIT }),
    staleTime: 60_000,
  })

  const selectedCountryId =
    selectedPolityToken.startsWith('C:') || selectedPolityToken.startsWith('m:')
      ? selectedPolityToken.slice(2)
      : undefined
  const selectedHistoricalCountryId =
    selectedPolityToken.startsWith('H:') || selectedPolityToken.startsWith('h:')
      ? selectedPolityToken.slice(2)
      : undefined

  const trimmedBackendSearch = debouncedSearch.trim()
  const needsServerCabinetScope = Boolean(
    selectedCountryId ||
      selectedHistoricalCountryId ||
      activeAtYear != null ||
      currentOnly ||
      linkedOnly ||
      trimmedBackendSearch,
  )

  const scopedCabinetsQuery = useQuery({
    queryKey: [
      'global-cabinets',
      'scoped',
      selectedPolityToken || 'all',
      activeAtYear ?? 'all-years',
      currentOnly ? 'current' : 'all-terms',
      linkedOnly ? 'linked' : 'all-links',
      trimmedBackendSearch || 'no-q',
    ],
    queryFn: () =>
      personCareerApi.getCabinets({
        countryId: selectedCountryId,
        historicalCountryId: selectedHistoricalCountryId,
        includeConstituents: Boolean(selectedHistoricalCountryId),
        activeAtYear,
        currentOnly: currentOnly || undefined,
        linkedOnly: linkedOnly || undefined,
        search: trimmedBackendSearch || undefined,
        take: CATALOG_FETCH_LIMIT,
      }),
    enabled: activeTab === 'cabinets' && needsServerCabinetScope,
    staleTime: 45_000,
  })

  const needsServerDeptScope = Boolean(
    selectedCountryId ||
      selectedHistoricalCountryId ||
      activeAtYear != null ||
      deptCategoryFilter ||
      deptKindFilter ||
      trimmedBackendSearch,
  )

  const scopedDepartmentsQuery = useQuery({
    queryKey: [
      'global-departments',
      'scoped',
      selectedPolityToken || 'all',
      activeAtYear ?? 'all-years',
      deptCategoryFilter || 'all-categories',
      deptKindFilter || 'all-kinds',
      trimmedBackendSearch || 'no-q',
    ],
    queryFn: () => {
      if (
        selectedHistoricalCountryId &&
        !deptCategoryFilter &&
        !deptKindFilter &&
        activeAtYear == null &&
        !trimmedBackendSearch
      ) {
        return administrationDepartmentApi.getByHistoricalCountryId(
          selectedHistoricalCountryId,
          { includeConstituents: true },
        )
      }
      return administrationDepartmentApi.getAll({
        countryId: selectedCountryId,
        historicalCountryId: selectedHistoricalCountryId,
        categoryId: deptCategoryFilter || undefined,
        kind: deptKindFilter || undefined,
        activeAtYear,
        search: trimmedBackendSearch || undefined,
        take: CATALOG_FETCH_LIMIT,
      })
    },
    enabled: activeTab === 'departments' && needsServerDeptScope,
    staleTime: 45_000,
  })

  const allCabinets = useMemo(
    () => allCabinetsQuery.data ?? [],
    [allCabinetsQuery.data],
  )
  const allDepartments = useMemo(
    () => allDepartmentsQuery.data ?? [],
    [allDepartmentsQuery.data],
  )

  const activeRawCabinets = useMemo(
    () =>
      needsServerCabinetScope
        ? (scopedCabinetsQuery.data ?? [])
        : allCabinets,
    [needsServerCabinetScope, scopedCabinetsQuery.data, allCabinets],
  )
  const activeRawDepartments = useMemo(
    () =>
      needsServerDeptScope
        ? (scopedDepartmentsQuery.data ?? [])
        : allDepartments,
    [needsServerDeptScope, scopedDepartmentsQuery.data, allDepartments],
  )

  // ─── Facet Counts (Continent, Polity, Categories) ────────────────────
  const { continentCounts, polityCounts } = useMemo(() => {
    const contCountMap = new Map<string, number>()
    const polCountMap = new Map<string, number>()

    if (activeTab === 'cabinets') {
      for (const cabinetItem of allCabinets) {
        const polity = resolveCabinetPolityInfo(cabinetItem)
        if (polity.historicalCountryId) {
          const token = `H:${polity.historicalCountryId}`
          polCountMap.set(token, (polCountMap.get(token) ?? 0) + 1)
          const contSet = historicalContinentsMap.get(
            polity.historicalCountryId,
          )
          if (contSet) {
            for (const contId of contSet) {
              contCountMap.set(contId, (contCountMap.get(contId) ?? 0) + 1)
            }
          } else if (polity.modernCountryId) {
            const contId = countryContinentMap.get(polity.modernCountryId)
            if (contId) {
              contCountMap.set(contId, (contCountMap.get(contId) ?? 0) + 1)
            }
          }
        } else if (polity.modernCountryId) {
          const token = `C:${polity.modernCountryId}`
          polCountMap.set(token, (polCountMap.get(token) ?? 0) + 1)
          const contId = countryContinentMap.get(polity.modernCountryId)
          if (contId) {
            contCountMap.set(contId, (contCountMap.get(contId) ?? 0) + 1)
          }
        }
      }
    } else {
      for (const deptItem of allDepartments) {
        const polity = resolveDepartmentPolityInfo(deptItem)
        if (polity.historicalCountryId) {
          const token = `H:${polity.historicalCountryId}`
          polCountMap.set(token, (polCountMap.get(token) ?? 0) + 1)
          const contSet = historicalContinentsMap.get(
            polity.historicalCountryId,
          )
          if (contSet) {
            for (const contId of contSet) {
              contCountMap.set(contId, (contCountMap.get(contId) ?? 0) + 1)
            }
          } else if (polity.modernCountryId) {
            const contId = countryContinentMap.get(polity.modernCountryId)
            if (contId) {
              contCountMap.set(contId, (contCountMap.get(contId) ?? 0) + 1)
            }
          }
        } else if (polity.modernCountryId) {
          const token = `C:${polity.modernCountryId}`
          polCountMap.set(token, (polCountMap.get(token) ?? 0) + 1)
          const contId = countryContinentMap.get(polity.modernCountryId)
          if (contId) {
            contCountMap.set(contId, (contCountMap.get(contId) ?? 0) + 1)
          }
        }
      }
    }

    return { continentCounts: contCountMap, polityCounts: polCountMap }
  }, [
    activeTab,
    allCabinets,
    allDepartments,
    countryContinentMap,
    historicalContinentsMap,
  ])

  const sortedContinents = useMemo(() => {
    return [...continents].sort((leftCont, rightCont) => {
      const leftCount = continentCounts.get(leftCont.id) ?? 0
      const rightCount = continentCounts.get(rightCont.id) ?? 0
      if (rightCount !== leftCount) return rightCount - leftCount
      return leftCont.name.localeCompare(rightCont.name, 'ko')
    })
  }, [continents, continentCounts])

  const polityOptions = useMemo<SearchableSelectOption[]>(() => {
    const filteredModern = selectedContinentId
      ? modernCountries.filter(
          (countryItem) => countryItem.continentId === selectedContinentId,
        )
      : modernCountries

    const filteredHistorical = selectedContinentId
      ? historicalCountries.filter((histItem) =>
          historicalContinentsMap.get(histItem.id)?.has(selectedContinentId),
        )
      : historicalCountries

    const modernOpts: SearchableSelectOption[] = [...filteredModern]
      .sort((leftItem, rightItem) => {
        const leftCount = polityCounts.get(`C:${leftItem.id}`) ?? 0
        const rightCount = polityCounts.get(`C:${rightItem.id}`) ?? 0
        if (rightCount !== leftCount) return rightCount - leftCount
        return leftItem.name.localeCompare(rightItem.name, 'ko')
      })
      .map((modernItem) => {
        const recordCount = polityCounts.get(`C:${modernItem.id}`) ?? 0
        const baseLabel = modernItem.flagEmoji
          ? `${modernItem.flagEmoji} ${modernItem.name}`
          : modernItem.name
        return {
          value: `C:${modernItem.id}`,
          label: recordCount > 0 ? `${baseLabel} (${recordCount})` : baseLabel,
          group: recordCount > 0 ? '기록 보유 · 현대 국가' : '현대 국가',
          keywords: [modernItem.name, modernItem.isoCode ?? ''],
        }
      })

    const historicalOpts: SearchableSelectOption[] = [...filteredHistorical]
      .sort((leftItem, rightItem) => {
        const leftCount = polityCounts.get(`H:${leftItem.id}`) ?? 0
        const rightCount = polityCounts.get(`H:${rightItem.id}`) ?? 0
        if (rightCount !== leftCount) return rightCount - leftCount
        return leftItem.name.localeCompare(rightItem.name, 'ko')
      })
      .map((histItem) => {
        const recordCount = polityCounts.get(`H:${histItem.id}`) ?? 0
        return {
          value: `H:${histItem.id}`,
          label:
            recordCount > 0
              ? `${histItem.name} (${recordCount})`
              : histItem.name,
          group:
            recordCount > 0
              ? '기록 보유 · 역사적 국가'
              : '역사적 국가 · 왕조 · 정체',
          keywords: [histItem.name, histItem.enName ?? ''],
        }
      })

    const withRecords = [
      ...modernOpts.filter((optItem) => optItem.group?.startsWith('기록 보유')),
      ...historicalOpts.filter((optItem) =>
        optItem.group?.startsWith('기록 보유'),
      ),
    ]
    const withoutRecords = [
      ...modernOpts.filter(
        (optItem) => !optItem.group?.startsWith('기록 보유'),
      ),
      ...historicalOpts.filter(
        (optItem) => !optItem.group?.startsWith('기록 보유'),
      ),
    ]
    return [...withRecords, ...withoutRecords]
  }, [
    modernCountries,
    historicalCountries,
    selectedContinentId,
    historicalContinentsMap,
    polityCounts,
  ])

  const cabinetCategoryCounts = useMemo(() => {
    const countMap = new Map<PositionCategory, number>()
    for (const cabinetItem of activeRawCabinets) {
      const cat = resolveCabinetCategory(cabinetItem)
      countMap.set(cat, (countMap.get(cat) ?? 0) + 1)
    }
    return countMap
  }, [activeRawCabinets])

  const { deptKindCounts, deptCategoryCounts, deptStatusCounts } =
    useMemo(() => {
      const kindMap = new Map<string, number>()
      const catMap = new Map<string, number>()
      let activeCount = 0
      let abolishedCount = 0
      for (const deptItem of allDepartments) {
        kindMap.set(deptItem.kind, (kindMap.get(deptItem.kind) ?? 0) + 1)
        if (deptItem.categoryId) {
          catMap.set(
            deptItem.categoryId,
            (catMap.get(deptItem.categoryId) ?? 0) + 1,
          )
        }
        const isAbolished = Boolean(
          deptItem.abolished || deptItem.abolishedDate,
        )
        if (isAbolished) abolishedCount += 1
        else activeCount += 1
      }
      return {
        deptKindCounts: kindMap,
        deptCategoryCounts: catMap,
        deptStatusCounts: {
          active: activeCount,
          abolished: abolishedCount,
        },
      }
    }, [allDepartments])

  // ─── Filtered & Sorted Collections ───────────────────────────────────
  const filteredCabinets = useMemo(() => {
    const needle = searchDraft.trim().toLowerCase()
    const filtered = activeRawCabinets.filter((cabinetItem) => {
      const polity = resolveCabinetPolityInfo(cabinetItem)
      if (
        selectedContinentId &&
        !doesPolityMatchContinent(polity, selectedContinentId)
      ) {
        return false
      }
      if (
        cabinetCatFilter &&
        resolveCabinetCategory(cabinetItem) !== cabinetCatFilter
      ) {
        return false
      }
      if (!needle) return true
      const headName = resolveCabinetHeadName(cabinetItem)
      const posTitle = resolveCabinetPositionTitle(cabinetItem)
      const displayTitle = resolveCabinetDisplayTitle(cabinetItem)
      const leadingParty = resolveCabinetLeadingParty(cabinetItem)
      const linkageLabel =
        cabinetItem.linkageGroup?.event?.title ??
        cabinetItem.linkageGroup?.label ??
        ''
      const haystack = [
        polity.polityName,
        headName,
        posTitle,
        displayTitle,
        cabinetItem.name ?? '',
        cabinetItem.description ?? '',
        leadingParty?.fullName ?? '',
        leadingParty?.label ?? '',
        linkageLabel,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })

    return [...filtered].sort((leftCab, rightCab) => {
      const leftEffective = resolveCabinetEffectiveDates(leftCab)
      const rightEffective = resolveCabinetEffectiveDates(rightCab)
      const leftYear = extractSignedStartYearFromIso(leftEffective.startDate)
      const rightYear = extractSignedStartYearFromIso(rightEffective.startDate)

      if (cabinetSort === 'country') {
        const leftCountry = resolveCabinetPolityInfo(leftCab).polityName
        const rightCountry = resolveCabinetPolityInfo(rightCab).polityName
        const countryCmp = leftCountry.localeCompare(rightCountry, 'ko')
        if (countryCmp !== 0) return countryCmp
        return (rightYear ?? -99999) - (leftYear ?? -99999)
      }
      if (cabinetSort === 'name') {
        return resolveCabinetDisplayTitle(leftCab).localeCompare(
          resolveCabinetDisplayTitle(rightCab),
          'ko',
        )
      }
      if (cabinetSort === 'period_asc') {
        if (leftYear == null && rightYear == null) return 0
        if (leftYear == null) return 1
        if (rightYear == null) return -1
        if (leftYear !== rightYear) return leftYear - rightYear
        return (leftEffective.startDate ?? '').localeCompare(
          rightEffective.startDate ?? '',
        )
      }
      if (leftYear == null && rightYear == null) return 0
      if (leftYear == null) return 1
      if (rightYear == null) return -1
      if (leftYear !== rightYear) return rightYear - leftYear
      return (rightEffective.startDate ?? '').localeCompare(
        leftEffective.startDate ?? '',
      )
    })
  }, [
    activeRawCabinets,
    selectedContinentId,
    doesPolityMatchContinent,
    cabinetCatFilter,
    searchDraft,
    cabinetSort,
  ])

  const filteredDepartments = useMemo(() => {
    const needle = searchDraft.trim().toLowerCase()
    const filtered = activeRawDepartments.filter((deptItem) => {
      const polity = resolveDepartmentPolityInfo(deptItem)
      if (
        selectedContinentId &&
        !doesPolityMatchContinent(polity, selectedContinentId)
      ) {
        return false
      }
      if (deptKindFilter && deptItem.kind !== deptKindFilter) return false
      if (deptCategoryFilter && deptItem.categoryId !== deptCategoryFilter) {
        return false
      }
      if (deptStatusFilter !== 'all') {
        const isAbolished = Boolean(
          deptItem.abolished || deptItem.abolishedDate,
        )
        if (deptStatusFilter === 'active' && isAbolished) return false
        if (deptStatusFilter === 'abolished' && !isAbolished) return false
      }
      if (!needle) return true
      const haystack = [
        deptItem.name,
        deptItem.nameLocal ?? '',
        deptItem.nameEn ?? '',
        deptItem.abbreviation ?? '',
        deptItem.category?.name ?? '',
        deptItem.headquarters ?? '',
        deptItem.primaryMission ?? '',
        polity.polityName,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })

    return [...filtered].sort((leftDept, rightDept) => {
      if (deptSort === 'name') {
        return leftDept.name.localeCompare(rightDept.name, 'ko')
      }
      const { startYear: leftYear } = getDepartmentSignedYears(leftDept)
      const { startYear: rightYear } = getDepartmentSignedYears(rightDept)

      if (deptSort === 'period_asc') {
        if (leftYear == null && rightYear == null) return 0
        if (leftYear == null) return 1
        if (rightYear == null) return -1
        return leftYear - rightYear
      }
      if (deptSort === 'period_desc') {
        if (leftYear == null && rightYear == null) return 0
        if (leftYear == null) return 1
        if (rightYear == null) return -1
        return rightYear - leftYear
      }
      const leftPolity = resolveDepartmentPolityInfo(leftDept).polityName
      const rightPolity = resolveDepartmentPolityInfo(rightDept).polityName
      const polityCmp = leftPolity.localeCompare(rightPolity, 'ko')
      if (polityCmp !== 0) return polityCmp
      return leftDept.name.localeCompare(rightDept.name, 'ko')
    })
  }, [
    activeRawDepartments,
    selectedContinentId,
    doesPolityMatchContinent,
    deptKindFilter,
    deptCategoryFilter,
    deptStatusFilter,
    searchDraft,
    deptSort,
  ])

  // ─── Century Chapters & Era Histogram Buckets ────────────────────────
  const isCabinetGroupedByCentury =
    cabinetSort === 'period_desc' || cabinetSort === 'period_asc'
  const isDepartmentGroupedByCentury =
    deptSort === 'period_desc' || deptSort === 'period_asc'

  const cabinetChapters = useMemo(() => {
    const groups = new Map<
      string,
      { key: string; century: number | null; items: CabinetListItemDto[] }
    >()
    for (const cabinetItem of filteredCabinets) {
      const effective = resolveCabinetEffectiveDates(cabinetItem)
      const century = getCenturyFromIso(effective.startDate)
      const chapterKey = century != null ? String(century) : UNDATED_CHAPTER
      const existing = groups.get(chapterKey)
      if (existing) {
        existing.items.push(cabinetItem)
      } else {
        groups.set(chapterKey, {
          key: chapterKey,
          century,
          items: [cabinetItem],
        })
      }
    }
    return [...groups.values()]
  }, [filteredCabinets])

  const departmentChapters = useMemo(() => {
    const groups = new Map<
      string,
      { key: string; century: number | null; items: AdministrationDepartment[] }
    >()
    for (const deptItem of filteredDepartments) {
      const { startYear } = getDepartmentSignedYears(deptItem)
      const century =
        startYear != null
          ? startYear > 0
            ? Math.ceil(startYear / 100)
            : -Math.ceil(Math.abs(startYear) / 100)
          : getCenturyFromIso(deptItem.establishedDate)
      const chapterKey = century != null ? String(century) : UNDATED_CHAPTER
      const existing = groups.get(chapterKey)
      if (existing) {
        existing.items.push(deptItem)
      } else {
        groups.set(chapterKey, {
          key: chapterKey,
          century,
          items: [deptItem],
        })
      }
    }
    return [...groups.values()]
  }, [filteredDepartments])

  const { eraBuckets, eraDecadeBuckets, eraUndatedCount } = useMemo(() => {
    const sourceChapters =
      activeTab === 'cabinets' ? cabinetChapters : departmentChapters
    const bucketList: GovernmentCenturyBucket[] = []
    let undated = 0
    for (const chapterItem of sourceChapters) {
      if (chapterItem.century == null) {
        undated += chapterItem.items.length
      } else {
        bucketList.push({
          key: chapterItem.key,
          century: chapterItem.century,
          count: chapterItem.items.length,
        })
      }
    }

    const decadeMap = new Map<number, { centuryKey: string; count: number }>()
    if (activeTab === 'cabinets') {
      for (const cabinetItem of filteredCabinets) {
        const effective = resolveCabinetEffectiveDates(cabinetItem)
        const startYear = extractSignedStartYearFromIso(effective.startDate)
        const century = getCenturyFromIso(effective.startDate)
        if (startYear == null || century == null) continue
        const decadeStart =
          startYear >= 0
            ? Math.floor(startYear / 10) * 10
            : -Math.ceil(Math.abs(startYear) / 10) * 10
        const prevEntry = decadeMap.get(decadeStart)
        if (prevEntry) {
          prevEntry.count += 1
        } else {
          decadeMap.set(decadeStart, {
            centuryKey: String(century),
            count: 1,
          })
        }
      }
    } else {
      for (const deptItem of filteredDepartments) {
        const { startYear } = getDepartmentSignedYears(deptItem)
        if (startYear == null) continue
        const century =
          startYear > 0
            ? Math.ceil(startYear / 100)
            : -Math.ceil(Math.abs(startYear) / 100)
        const decadeStart =
          startYear >= 0
            ? Math.floor(startYear / 10) * 10
            : -Math.ceil(Math.abs(startYear) / 10) * 10
        const prevEntry = decadeMap.get(decadeStart)
        if (prevEntry) {
          prevEntry.count += 1
        } else {
          decadeMap.set(decadeStart, {
            centuryKey: String(century),
            count: 1,
          })
        }
      }
    }

    const decadeList: GovernmentDecadeBucket[] = [...decadeMap.entries()].map(
      ([decadeStartYear, entryValue]) => ({
        key: `dec:${decadeStartYear}`,
        decadeStartYear,
        centuryKey: entryValue.centuryKey,
        count: entryValue.count,
      }),
    )

    return {
      eraBuckets: bucketList,
      eraDecadeBuckets: decadeList,
      eraUndatedCount: undated,
    }
  }, [
    activeTab,
    cabinetChapters,
    departmentChapters,
    filteredCabinets,
    filteredDepartments,
  ])

  // Navigable visible IDs (excludes items hidden inside collapsed century chapters)
  const navigableIds = useMemo<string[]>(() => {
    if (activeTab === 'cabinets') {
      if (!isCabinetGroupedByCentury) {
        return filteredCabinets.map((item) => item.id)
      }
      const ids: string[] = []
      for (const chapterItem of cabinetChapters) {
        if (collapsedChapters.has(chapterItem.key)) continue
        for (const cabItem of chapterItem.items) {
          ids.push(cabItem.id)
        }
      }
      return ids
    }
    if (!isDepartmentGroupedByCentury) {
      return filteredDepartments.map((item) => item.id)
    }
    const ids: string[] = []
    for (const chapterItem of departmentChapters) {
      if (collapsedChapters.has(chapterItem.key)) continue
      for (const deptItem of chapterItem.items) {
        ids.push(deptItem.id)
      }
    }
    return ids
  }, [
    activeTab,
    isCabinetGroupedByCentury,
    isDepartmentGroupedByCentury,
    filteredCabinets,
    filteredDepartments,
    cabinetChapters,
    departmentChapters,
    collapsedChapters,
  ])

  const selectedIndex = selectedId ? navigableIds.indexOf(selectedId) : -1
  const hasPrevSelection = selectedIndex > 0
  const hasNextSelection =
    selectedIndex >= 0 && selectedIndex < navigableIds.length - 1

  const stepSelection = useCallback(
    (delta: -1 | 1) => {
      if (navigableIds.length === 0) return
      if (selectedIndex < 0) {
        const firstId = navigableIds[0]
        if (firstId) updateParams({ selected: firstId })
        return
      }
      const nextIndex = selectedIndex + delta
      if (nextIndex < 0 || nextIndex >= navigableIds.length) return
      const nextId = navigableIds[nextIndex]
      if (!nextId) return
      updateParams({ selected: nextId })
      window.requestAnimationFrame(() => {
        const rowEl = ledgerScrollRef.current?.querySelector<HTMLElement>(
          `[data-gov-row-id="${CSS.escape(nextId)}"]`,
        )
        rowEl?.scrollIntoView({ block: 'nearest' })
      })
    },
    [navigableIds, selectedIndex, updateParams],
  )

  // Global keyboard shortcuts: `/` search, `↑`/`↓` step drawer, `Esc` close
  useEffect(() => {
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.defaultPrevented) return
      if (
        cabinetModalOpen ||
        deptModalOpen ||
        Boolean(appointingCabinet) ||
        Boolean(appointingDepartment) ||
        Boolean(personModalId) ||
        Boolean(countryModalTarget) ||
        positionDictOpen
      ) {
        return
      }

      if (keyEvent.key === 'Escape') {
        if (displayPopoverOpen) {
          keyEvent.preventDefault()
          setDisplayPopoverOpen(false)
          return
        }
        if (selectedId) {
          keyEvent.preventDefault()
          updateParams({ selected: null })
        }
        return
      }

      if (isInteractiveInputTarget(keyEvent.target)) return

      if (
        keyEvent.key === '/' &&
        !keyEvent.metaKey &&
        !keyEvent.ctrlKey &&
        !keyEvent.altKey
      ) {
        keyEvent.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
        return
      }

      if (selectedId && keyEvent.key === 'ArrowDown') {
        keyEvent.preventDefault()
        stepSelection(1)
        return
      }
      if (selectedId && keyEvent.key === 'ArrowUp') {
        keyEvent.preventDefault()
        stepSelection(-1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    cabinetModalOpen,
    deptModalOpen,
    appointingCabinet,
    appointingDepartment,
    personModalId,
    countryModalTarget,
    positionDictOpen,
    displayPopoverOpen,
    selectedId,
    stepSelection,
    updateParams,
  ])

  const commitYearFilter = (rawVal: string) => {
    const trimmed = rawVal.trim()
    if (!trimmed) {
      updateParams({ year: null })
      return
    }
    const parsed = Number.parseInt(trimmed, 10)
    if (Number.isFinite(parsed) && parsed !== 0) {
      updateParams({ year: String(parsed), current: null })
    }
  }

  const stepActiveYear = (delta: number) => {
    const baseYear = activeAtYear ?? 1914
    let nextYear = baseYear + delta
    if (nextYear === 0) nextYear = delta > 0 ? 1 : -1
    setYearInputDraft(String(nextYear))
    updateParams({ year: String(nextYear), current: null })
  }

  const applyCollapsedChapters = useCallback(
    (updater: (prev: ReadonlySet<string>) => Set<string>) => {
      setCollapsedChapters((prevSet) => {
        const nextSet = updater(prevSet)
        writeGovernmentCatalogMemory({ collapsedChapters: [...nextSet] })
        return nextSet
      })
    },
    [],
  )

  const toggleChapterCollapsed = (chapterKey: string) => {
    applyCollapsedChapters((prevSet) => {
      const nextSet = new Set(prevSet)
      if (nextSet.has(chapterKey)) nextSet.delete(chapterKey)
      else nextSet.add(chapterKey)
      return nextSet
    })
  }

  const handleJumpToCentury = useCallback(
    (centuryKey: string) => {
      // If current sort is non-chronological, switch to chronological so century headers exist
      if (activeTab === 'cabinets' && !isCabinetGroupedByCentury) {
        updateParams({ sort: 'period_desc' })
        writeGovernmentCatalogMemory({ cabinetSort: 'period_desc' })
      } else if (activeTab === 'departments' && !isDepartmentGroupedByCentury) {
        updateParams({ deptSort: 'period_desc' })
        writeGovernmentCatalogMemory({ deptSort: 'period_desc' })
      }

      applyCollapsedChapters((prevSet) => {
        const nextSet = new Set(prevSet)
        nextSet.delete(centuryKey)
        return nextSet
      })
      setActiveCenturyKey(centuryKey)

      window.requestAnimationFrame(() => {
        const headerEl = ledgerScrollRef.current?.querySelector<HTMLElement>(
          `[data-century-chapter="${CSS.escape(centuryKey)}"]`,
        )
        headerEl?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    },
    [
      activeTab,
      applyCollapsedChapters,
      isCabinetGroupedByCentury,
      isDepartmentGroupedByCentury,
      updateParams,
    ],
  )

  const handleJumpToDecade = useCallback(
    (decadeBucket: GovernmentDecadeBucket) => {
      if (activeTab === 'cabinets' && !isCabinetGroupedByCentury) {
        updateParams({ sort: 'period_desc' })
        writeGovernmentCatalogMemory({ cabinetSort: 'period_desc' })
      } else if (activeTab === 'departments' && !isDepartmentGroupedByCentury) {
        updateParams({ deptSort: 'period_desc' })
        writeGovernmentCatalogMemory({ deptSort: 'period_desc' })
      }

      applyCollapsedChapters((prevSet) => {
        const nextSet = new Set(prevSet)
        nextSet.delete(decadeBucket.centuryKey)
        return nextSet
      })
      setActiveCenturyKey(decadeBucket.centuryKey)

      window.requestAnimationFrame(() => {
        const scroller = ledgerScrollRef.current
        if (!scroller) return
        const matchingRow = scroller.querySelector<HTMLElement>(
          `[data-decade-start="${decadeBucket.decadeStartYear}"]`,
        )
        if (matchingRow) {
          matchingRow.scrollIntoView({ behavior: 'smooth', block: 'start' })
          return
        }
        const headerEl = scroller.querySelector<HTMLElement>(
          `[data-century-chapter="${CSS.escape(decadeBucket.centuryKey)}"]`,
        )
        headerEl?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    },
    [
      activeTab,
      applyCollapsedChapters,
      isCabinetGroupedByCentury,
      isDepartmentGroupedByCentury,
      updateParams,
    ],
  )

  // Scroll-spy on ledgerScrollRef to keep EraStrip activeCenturyKey synced with viewport
  useEffect(() => {
    const scroller = ledgerScrollRef.current
    if (!scroller) return

    const syncVisibleCentury = () => {
      const sections = scroller.querySelectorAll<HTMLElement>(
        '[data-century-chapter]',
      )
      if (sections.length === 0) {
        setActiveCenturyKey(null)
        return
      }
      const scrollerTop = scroller.getBoundingClientRect().top + 48
      let currentKey: string | null =
        sections[0]?.getAttribute('data-century-chapter') ?? null
      for (const sectionEl of sections) {
        const rect = sectionEl.getBoundingClientRect()
        if (rect.top <= scrollerTop) {
          currentKey = sectionEl.getAttribute('data-century-chapter')
        } else {
          break
        }
      }
      setActiveCenturyKey((prevKey) =>
        prevKey === currentKey ? prevKey : currentKey,
      )
    }

    syncVisibleCentury()
    scroller.addEventListener('scroll', syncVisibleCentury, { passive: true })
    return () => scroller.removeEventListener('scroll', syncVisibleCentury)
  }, [
    activeTab,
    cabinetChapters.length,
    departmentChapters.length,
    displayMode,
  ])

  // ─── Active Filter Chips & Smart 0-Result Recovery ───────────────────
  const selectedContinentName = useMemo(
    () =>
      continents.find((contItem) => contItem.id === selectedContinentId)
        ?.name ?? null,
    [continents, selectedContinentId],
  )

  const selectedPolityLabel = useMemo(() => {
    if (!selectedPolityToken) return null
    if (selectedCountryId) {
      return (
        modernCountries.find((item) => item.id === selectedCountryId)?.name ??
        '선택 국가'
      )
    }
    if (selectedHistoricalCountryId) {
      return (
        historicalCountries.find(
          (item) => item.id === selectedHistoricalCountryId,
        )?.name ?? '선택 역사국가'
      )
    }
    return null
  }, [
    selectedPolityToken,
    selectedCountryId,
    selectedHistoricalCountryId,
    modernCountries,
    historicalCountries,
  ])

  const selectedDeptCategoryName = useMemo(() => {
    if (!deptCategoryFilter) return null
    return (
      (deptCategoriesQuery.data ?? []).find(
        (catItem) => catItem.id === deptCategoryFilter,
      )?.name ?? '선택 분야'
    )
  }, [deptCategoryFilter, deptCategoriesQuery.data])

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> =
      []
    if (searchDraft.trim()) {
      chips.push({
        key: 'q',
        label: `검색: "${searchDraft.trim()}"`,
        onRemove: () => {
          setSearchDraft('')
          updateParams({ [SEARCH_QUERY_PARAM]: null })
        },
      })
    }
    if (selectedContinentId && selectedContinentName) {
      chips.push({
        key: 'continent',
        label: `대륙: ${selectedContinentName}`,
        onRemove: () => updateParams({ continent: null }),
      })
    }
    if (selectedPolityToken && selectedPolityLabel) {
      chips.push({
        key: 'polity',
        label: `국가: ${selectedPolityLabel}`,
        onRemove: () => updateParams({ polity: null }),
      })
    }
    if (activeAtYear != null) {
      chips.push({
        key: 'year',
        label: `시점: ${formatSignedYearLabel(activeAtYear)}년`,
        onRemove: () => {
          setYearInputDraft('')
          updateParams({ year: null })
        },
      })
    }
    if (activeTab === 'cabinets') {
      if (currentOnly) {
        chips.push({
          key: 'current',
          label: '현직 정부만',
          onRemove: () => updateParams({ current: null }),
        })
      }
      if (linkedOnly) {
        chips.push({
          key: 'linked',
          label: '다국 연계만',
          onRemove: () => updateParams({ linked: null }),
        })
      }
      if (cabinetCatFilter) {
        chips.push({
          key: 'cabCat',
          label: `체제: ${GLOBAL_CABINET_CATEGORY_LABELS[cabinetCatFilter]}`,
          onRemove: () => updateParams({ cabCat: null }),
        })
      }
    } else {
      if (deptKindFilter) {
        chips.push({
          key: 'kind',
          label: `종류: ${DEPARTMENT_KIND_LABEL[deptKindFilter] ?? deptKindFilter}`,
          onRemove: () => updateParams({ kind: null }),
        })
      }
      if (deptCategoryFilter && selectedDeptCategoryName) {
        chips.push({
          key: 'categoryId',
          label: `분야: ${selectedDeptCategoryName}`,
          onRemove: () => updateParams({ categoryId: null }),
        })
      }
      if (deptStatusFilter !== 'all') {
        chips.push({
          key: 'status',
          label: deptStatusFilter === 'active' ? '현존 기관만' : '폐지 기관만',
          onRemove: () => updateParams({ status: null }),
        })
      }
    }
    return chips
  }, [
    searchDraft,
    selectedContinentId,
    selectedContinentName,
    selectedPolityToken,
    selectedPolityLabel,
    activeAtYear,
    activeTab,
    currentOnly,
    linkedOnly,
    cabinetCatFilter,
    deptKindFilter,
    deptCategoryFilter,
    selectedDeptCategoryName,
    deptStatusFilter,
    updateParams,
  ])

  const hasAnyActiveFilter = activeFilterChips.length > 0

  const clearAllFilters = useCallback(() => {
    setSearchDraft('')
    setYearInputDraft('')
    setSearchParams(
      (prevParams) => {
        const cleanParams = new URLSearchParams()
        if (prevParams.get('tab') === 'departments') {
          cleanParams.set('tab', 'departments')
        }
        if (prevParams.get('view')) {
          cleanParams.set('view', prevParams.get('view')!)
        }
        if (prevParams.get('sort')) {
          cleanParams.set('sort', prevParams.get('sort')!)
        }
        if (prevParams.get('deptSort')) {
          cleanParams.set('deptSort', prevParams.get('deptSort')!)
        }
        return cleanParams
      },
      { replace: true },
    )
  }, [setSearchParams])

  // Compute smart 0-result recovery suggestions against allCabinets / allDepartments
  const releaseSuggestions = useMemo<FilterReleaseSuggestion[]>(() => {
    const currentListLength =
      activeTab === 'cabinets'
        ? filteredCabinets.length
        : filteredDepartments.length
    if (currentListLength > 0 || !hasAnyActiveFilter) return []

    const needle = searchDraft.trim().toLowerCase()
    const suggestions: FilterReleaseSuggestion[] = []

    if (activeTab === 'cabinets') {
      const countCabinetsWith = (omitAxis: string): number => {
        return allCabinets.filter((cabItem) => {
          const polity = resolveCabinetPolityInfo(cabItem)
          if (omitAxis !== 'polity' && selectedPolityToken) {
            if (
              selectedCountryId &&
              polity.modernCountryId !== selectedCountryId
            ) {
              return false
            }
            if (
              selectedHistoricalCountryId &&
              polity.historicalCountryId !== selectedHistoricalCountryId
            ) {
              return false
            }
          }
          if (
            omitAxis !== 'continent' &&
            selectedContinentId &&
            !doesPolityMatchContinent(polity, selectedContinentId)
          ) {
            return false
          }
          if (
            omitAxis !== 'year' &&
            activeAtYear != null &&
            !doesCabinetMatchActiveYear(cabItem, activeAtYear)
          ) {
            return false
          }
          if (omitAxis !== 'current' && currentOnly) {
            const eff = resolveCabinetEffectiveDates(cabItem)
            if (!eff.isOngoing) return false
          }
          if (omitAxis !== 'linked' && linkedOnly && !cabItem.linkageGroup) {
            return false
          }
          if (
            omitAxis !== 'cabCat' &&
            cabinetCatFilter &&
            resolveCabinetCategory(cabItem) !== cabinetCatFilter
          ) {
            return false
          }
          if (omitAxis !== 'q' && needle) {
            const haystack = [
              polity.polityName,
              resolveCabinetHeadName(cabItem),
              resolveCabinetPositionTitle(cabItem),
              resolveCabinetDisplayTitle(cabItem),
              cabItem.name ?? '',
            ]
              .join(' ')
              .toLowerCase()
            if (!haystack.includes(needle)) return false
          }
          return true
        }).length
      }

      if (activeAtYear != null) {
        const releasedCount = countCabinetsWith('year')
        if (releasedCount > 0) {
          suggestions.push({
            key: 'year',
            label: `${formatSignedYearLabel(activeAtYear)}년 시점 해제`,
            count: releasedCount,
            onRelease: () => {
              setYearInputDraft('')
              updateParams({ year: null })
            },
          })
        }
      }
      if (currentOnly) {
        const releasedCount = countCabinetsWith('current')
        if (releasedCount > 0) {
          suggestions.push({
            key: 'current',
            label: '현직 정부 필터 해제',
            count: releasedCount,
            onRelease: () => updateParams({ current: null }),
          })
        }
      }
      if (linkedOnly) {
        const releasedCount = countCabinetsWith('linked')
        if (releasedCount > 0) {
          suggestions.push({
            key: 'linked',
            label: '다국 연계 필터 해제',
            count: releasedCount,
            onRelease: () => updateParams({ linked: null }),
          })
        }
      }
      if (cabinetCatFilter) {
        const releasedCount = countCabinetsWith('cabCat')
        if (releasedCount > 0) {
          suggestions.push({
            key: 'cabCat',
            label: `${GLOBAL_CABINET_CATEGORY_LABELS[cabinetCatFilter]} 체제 해제`,
            count: releasedCount,
            onRelease: () => updateParams({ cabCat: null }),
          })
        }
      }
      if (selectedPolityToken && selectedPolityLabel) {
        const releasedCount = countCabinetsWith('polity')
        if (releasedCount > 0) {
          suggestions.push({
            key: 'polity',
            label: `${selectedPolityLabel} 국가 필터 해제`,
            count: releasedCount,
            onRelease: () => updateParams({ polity: null }),
          })
        }
      }
      if (selectedContinentId && selectedContinentName) {
        const releasedCount = countCabinetsWith('continent')
        if (releasedCount > 0) {
          suggestions.push({
            key: 'continent',
            label: `${selectedContinentName} 대륙 해제`,
            count: releasedCount,
            onRelease: () => updateParams({ continent: null }),
          })
        }
      }
      if (needle) {
        const releasedCount = countCabinetsWith('q')
        if (releasedCount > 0) {
          suggestions.push({
            key: 'q',
            label: '검색어 해제',
            count: releasedCount,
            onRelease: () => {
              setSearchDraft('')
              updateParams({ [SEARCH_QUERY_PARAM]: null })
            },
          })
        }
      }
      return suggestions.sort((leftSug, rightSug) => rightSug.count - leftSug.count)
    }

    const countDeptsWith = (omitAxis: string): number => {
      return allDepartments.filter((deptItem) => {
        const polity = resolveDepartmentPolityInfo(deptItem)
        if (omitAxis !== 'polity' && selectedPolityToken) {
          if (
            selectedCountryId &&
            polity.modernCountryId !== selectedCountryId
          ) {
            return false
          }
          if (
            selectedHistoricalCountryId &&
            polity.historicalCountryId !== selectedHistoricalCountryId
          ) {
            return false
          }
        }
        if (
          omitAxis !== 'continent' &&
          selectedContinentId &&
          !doesPolityMatchContinent(polity, selectedContinentId)
        ) {
          return false
        }
        if (
          omitAxis !== 'year' &&
          activeAtYear != null &&
          !doesDepartmentMatchActiveYear(deptItem, activeAtYear)
        ) {
          return false
        }
        if (
          omitAxis !== 'kind' &&
          deptKindFilter &&
          deptItem.kind !== deptKindFilter
        ) {
          return false
        }
        if (
          omitAxis !== 'categoryId' &&
          deptCategoryFilter &&
          deptItem.categoryId !== deptCategoryFilter
        ) {
          return false
        }
        if (omitAxis !== 'status' && deptStatusFilter !== 'all') {
          const isAbolished = Boolean(
            deptItem.abolished || deptItem.abolishedDate,
          )
          if (deptStatusFilter === 'active' && isAbolished) return false
          if (deptStatusFilter === 'abolished' && !isAbolished) return false
        }
        if (omitAxis !== 'q' && needle) {
          const haystack = [
            deptItem.name,
            deptItem.nameLocal ?? '',
            deptItem.nameEn ?? '',
            deptItem.abbreviation ?? '',
            polity.polityName,
          ]
            .join(' ')
            .toLowerCase()
          if (!haystack.includes(needle)) return false
        }
        return true
      }).length
    }

    if (activeAtYear != null) {
      const releasedCount = countDeptsWith('year')
      if (releasedCount > 0) {
        suggestions.push({
          key: 'year',
          label: `${formatSignedYearLabel(activeAtYear)}년 시점 해제`,
          count: releasedCount,
          onRelease: () => {
            setYearInputDraft('')
            updateParams({ year: null })
          },
        })
      }
    }
    if (deptStatusFilter !== 'all') {
      const releasedCount = countDeptsWith('status')
      if (releasedCount > 0) {
        suggestions.push({
          key: 'status',
          label: '존속/폐지 상태 필터 해제',
          count: releasedCount,
          onRelease: () => updateParams({ status: null }),
        })
      }
    }
    if (deptKindFilter) {
      const releasedCount = countDeptsWith('kind')
      if (releasedCount > 0) {
        suggestions.push({
          key: 'kind',
          label: `${DEPARTMENT_KIND_LABEL[deptKindFilter] ?? deptKindFilter} 종류 해제`,
          count: releasedCount,
          onRelease: () => updateParams({ kind: null }),
        })
      }
    }
    if (deptCategoryFilter && selectedDeptCategoryName) {
      const releasedCount = countDeptsWith('categoryId')
      if (releasedCount > 0) {
        suggestions.push({
          key: 'categoryId',
          label: `${selectedDeptCategoryName} 분야 해제`,
          count: releasedCount,
          onRelease: () => updateParams({ categoryId: null }),
        })
      }
    }
    if (selectedPolityToken && selectedPolityLabel) {
      const releasedCount = countDeptsWith('polity')
      if (releasedCount > 0) {
        suggestions.push({
          key: 'polity',
          label: `${selectedPolityLabel} 국가 필터 해제`,
          count: releasedCount,
          onRelease: () => updateParams({ polity: null }),
        })
      }
    }
    if (selectedContinentId && selectedContinentName) {
      const releasedCount = countDeptsWith('continent')
      if (releasedCount > 0) {
        suggestions.push({
          key: 'continent',
          label: `${selectedContinentName} 대륙 해제`,
          count: releasedCount,
          onRelease: () => updateParams({ continent: null }),
        })
      }
    }
    if (needle) {
      const releasedCount = countDeptsWith('q')
      if (releasedCount > 0) {
        suggestions.push({
          key: 'q',
          label: '검색어 해제',
          count: releasedCount,
            onRelease: () => {
              setSearchDraft('')
              updateParams({ [SEARCH_QUERY_PARAM]: null })
            },
        })
      }
    }

    return suggestions.sort((leftSug, rightSug) => rightSug.count - leftSug.count)
  }, [
    activeTab,
    filteredCabinets.length,
    filteredDepartments.length,
    hasAnyActiveFilter,
    searchDraft,
    allCabinets,
    allDepartments,
    selectedPolityToken,
    selectedCountryId,
    selectedHistoricalCountryId,
    selectedPolityLabel,
    selectedContinentId,
    selectedContinentName,
    doesPolityMatchContinent,
    activeAtYear,
    currentOnly,
    linkedOnly,
    cabinetCatFilter,
    deptKindFilter,
    deptCategoryFilter,
    selectedDeptCategoryName,
    deptStatusFilter,
    updateParams,
  ])

  // Available departments / cabinets scoped to the appointing target's polity
  const appointingCabinetDepartments = useMemo(() => {
    if (!appointingCabinet) return []
    const polity = resolveCabinetPolityInfo(appointingCabinet)
    return allDepartments.filter((deptItem) => {
      if (polity.historicalCountryId) {
        return deptItem.historicalCountryId === polity.historicalCountryId
      }
      if (polity.modernCountryId) {
        return (
          deptItem.countryId === polity.modernCountryId &&
          !deptItem.historicalCountryId
        )
      }
      return false
    })
  }, [appointingCabinet, allDepartments])

  const appointingDepartmentCabinets = useMemo(() => {
    if (!appointingDepartment) return []
    const polity = resolveDepartmentPolityInfo(appointingDepartment)
    return allCabinets.filter((cabItem) => {
      const cabPolity = resolveCabinetPolityInfo(cabItem)
      if (polity.historicalCountryId) {
        return cabPolity.historicalCountryId === polity.historicalCountryId
      }
      if (polity.modernCountryId) {
        return (
          cabPolity.modernCountryId === polity.modernCountryId &&
          !cabPolity.historicalCountryId
        )
      }
      return false
    })
  }, [appointingDepartment, allCabinets])

  const isDrawerOpen = Boolean(selectedId)
  const isCatalogLoading =
    activeTab === 'cabinets'
      ? needsServerCabinetScope
        ? scopedCabinetsQuery.isLoading
        : allCabinetsQuery.isLoading
      : needsServerDeptScope
        ? scopedDepartmentsQuery.isLoading
        : allDepartmentsQuery.isLoading

  const matchedCount =
    activeTab === 'cabinets'
      ? filteredCabinets.length
      : filteredDepartments.length
  const totalUnfilteredCount =
    activeTab === 'cabinets' ? allCabinets.length : allDepartments.length

  const allChapterKeys = useMemo(
    () =>
      (activeTab === 'cabinets' ? cabinetChapters : departmentChapters).map(
        (chapterItem) => chapterItem.key,
      ),
    [activeTab, cabinetChapters, departmentChapters],
  )

  const handleOpenPolityModal = (polity: {
    modernCountryId: string | null
    historicalCountryId: string | null
    polityName: string
  }) => {
    if (polity.historicalCountryId) {
      setCountryModalTarget({
        kind: 'historical',
        id: polity.historicalCountryId,
        name: polity.polityName,
      })
    } else if (polity.modernCountryId) {
      setCountryModalTarget({
        kind: 'modern',
        id: polity.modernCountryId,
        name: polity.polityName,
      })
    }
  }

  const renderCabinetRow = (cabinetItem: CabinetListItemDto) => {
    const polity = resolveCabinetPolityInfo(cabinetItem)
    const effectiveDates = resolveCabinetEffectiveDates(cabinetItem)
    const startYear = extractSignedStartYearFromIso(effectiveDates.startDate)
    const decadeStartAttr =
      startYear != null
        ? startYear >= 0
          ? Math.floor(startYear / 10) * 10
          : -Math.ceil(Math.abs(startYear) / 10) * 10
        : undefined
    const periodLabel = formatIsoShortPeriod(
      effectiveDates.startDate,
      effectiveDates.endDate,
      effectiveDates.isOngoing,
    )
    const headName = resolveCabinetHeadName(cabinetItem)
    const posTitle = resolveCabinetPositionTitle(cabinetItem)
    const displayTitle = resolveCabinetDisplayTitle(cabinetItem)
    const ministerCount = resolveCabinetMinisterCount(cabinetItem)
    const eventCount = cabinetItem._count?.events ?? 0
    const treatyCount = cabinetItem._count?.treatySignatories ?? 0
    const categoryKey = resolveCabinetCategory(cabinetItem)
    const leadingParty = resolveCabinetLeadingParty(cabinetItem)
    const appointmentLabel = cabinetItem.headTenure?.appointmentMethod
      ? (APPOINTMENT_METHOD_LABEL[cabinetItem.headTenure.appointmentMethod] ??
        cabinetItem.headTenure.appointmentMethod)
      : null
    const headPersonId = cabinetItem.headTenure?.person?.id ?? null
    const avatarUrl = cabinetItem.headTenure?.person?.profileImageUrl
      ? getUploadImageUrl(cabinetItem.headTenure.person.profileImageUrl)
      : null
    const linkageText =
      cabinetItem.linkageGroup?.event?.title ??
      cabinetItem.linkageGroup?.label ??
      null
    const isRowSelected = selectedId === cabinetItem.id

    return (
      <CabinetLedgerRow
        key={cabinetItem.id}
        data-gov-row-id={cabinetItem.id}
        data-decade-start={decadeStartAttr}
        $selected={isRowSelected}
        $density={density}
        onClick={() =>
          updateParams({
            selected: isRowSelected ? null : cabinetItem.id,
          })
        }
      >
        <PeriodCell>
          <TimelineNodeDot
            $active={isRowSelected}
            $ongoing={effectiveDates.isOngoing}
          />
          <span>{periodLabel}</span>
        </PeriodCell>

        <PolityCell>
          <PolityPillBtn
            type="button"
            $historical={polity.isHistorical}
            onClick={(clickEvent) => {
              if (!shouldInterceptEntityClick(clickEvent)) return
              clickEvent.stopPropagation()
              handleOpenPolityModal(polity)
            }}
            title={`${polity.polityName} 요약 보기`}
          >
            <PolityDot $historical={polity.isHistorical} />
            <span>{polity.polityName}</span>
          </PolityPillBtn>
        </PolityCell>

        <MainIdentityCell>
          {avatarUrl ? (
            <PersonAvatar src={avatarUrl} alt={headName} />
          ) : (
            <PersonAvatarFallback>{headName.slice(0, 1)}</PersonAvatarFallback>
          )}
          <IdentityTexts>
            <TitleInlineGroup>
              <EntryTitle>{displayTitle}</EntryTitle>
              {effectiveDates.isOngoing ? (
                <OngoingBadge>현직</OngoingBadge>
              ) : null}
            </TitleInlineGroup>
            <SubMetaLine>
              {headPersonId ? (
                <PersonTriggerBtn
                  type="button"
                  onClick={(clickEvent) => {
                    if (!shouldInterceptEntityClick(clickEvent)) return
                    clickEvent.stopPropagation()
                    setPersonModalId(headPersonId)
                  }}
                >
                  {headName}
                </PersonTriggerBtn>
              ) : (
                <span>{headName}</span>
              )}
              {posTitle ? <span>· {posTitle}</span> : null}
            </SubMetaLine>
          </IdentityTexts>
        </MainIdentityCell>

        <RegimeCell>
          <SubtleBadge>{GLOBAL_CABINET_CATEGORY_LABELS[categoryKey]}</SubtleBadge>
        </RegimeCell>

        <WideExtraCell className="col-wide-extra">
          {leadingParty ? (
            <PartyPill title={leadingParty.fullName}>
              <PartyColorDot $color={leadingParty.brandColor} />
              <span className="party-name">{leadingParty.label}</span>
              {leadingParty.extraCoalitionCount > 0 ? (
                <span className="party-coalition">
                  +{leadingParty.extraCoalitionCount}
                </span>
              ) : null}
            </PartyPill>
          ) : appointmentLabel ? (
            <WideSubtleText>{appointmentLabel}</WideSubtleText>
          ) : (
            <MutedDash>—</MutedDash>
          )}
        </WideExtraCell>

        <MetaBadgesCell>
          {ministerCount > 0 ? (
            <CountPill>
              <FiUsers size={11} />
              <span>각료 {ministerCount}</span>
            </CountPill>
          ) : null}
          {eventCount > 0 ? (
            <CountPill>
              <span>사건 {eventCount}</span>
            </CountPill>
          ) : null}
          {treatyCount > 0 ? (
            <CountPill>
              <span>조약 {treatyCount}</span>
            </CountPill>
          ) : null}
          {linkageText ? (
            <LinkageBadge title={linkageText}>
              <FiLink2 size={10} />
              <span>{linkageText}</span>
            </LinkageBadge>
          ) : null}
          {ministerCount === 0 &&
          eventCount === 0 &&
          treatyCount === 0 &&
          !linkageText ? (
            <MutedDash>—</MutedDash>
          ) : null}
        </MetaBadgesCell>

        <RowEndActionCell>
          <DetailPageIconLink
            to={pathKeys.government.cabinetDetail(cabinetItem.id)}
            state={returnState}
            onClick={(clickEvent) => clickEvent.stopPropagation()}
            title="전용 상세 지면으로 이동"
          >
            <span>상세</span>
            <FiArrowUpRight size={12} />
          </DetailPageIconLink>
        </RowEndActionCell>
      </CabinetLedgerRow>
    )
  }

  const renderDepartmentRow = (deptItem: AdministrationDepartment) => {
    const polity = resolveDepartmentPolityInfo(deptItem)
    const isAbolished = Boolean(deptItem.abolished || deptItem.abolishedDate)
    const { startYear } = getDepartmentSignedYears(deptItem)
    const decadeStartAttr =
      startYear != null
        ? startYear >= 0
          ? Math.floor(startYear / 10) * 10
          : -Math.ceil(Math.abs(startYear) / 10) * 10
        : undefined
    const periodLabel = formatIsoShortPeriod(
      deptItem.establishedDate,
      deptItem.abolishedDate,
      !polity.isHistorical && !isAbolished,
    )
    const logoUrl = deptItem.thumbnailUrl
      ? getUploadImageUrl(deptItem.thumbnailUrl)
      : null
    const isRowSelected = selectedId === deptItem.id
    const tenureCount = deptItem.tenureCount ?? 0
    const eventCount = deptItem.eventCount ?? 0
    const wideDeptMeta = [
      deptItem.parent?.name ? `상위: ${deptItem.parent.name}` : null,
      deptItem.headquarters || null,
    ]
      .filter(Boolean)
      .join(' · ')

    return (
      <DeptLedgerRow
        key={deptItem.id}
        data-gov-row-id={deptItem.id}
        data-decade-start={decadeStartAttr}
        $selected={isRowSelected}
        $density={density}
        onClick={() =>
          updateParams({
            selected: isRowSelected ? null : deptItem.id,
          })
        }
      >
        <PeriodCell>
          <TimelineNodeDot
            $active={isRowSelected}
            $ongoing={!polity.isHistorical && !isAbolished}
          />
          <span>{periodLabel}</span>
        </PeriodCell>

        <PolityCell>
          <PolityPillBtn
            type="button"
            $historical={polity.isHistorical}
            onClick={(clickEvent) => {
              if (!shouldInterceptEntityClick(clickEvent)) return
              clickEvent.stopPropagation()
              handleOpenPolityModal(polity)
            }}
            title={`${polity.polityName} 요약 보기`}
          >
            <PolityDot $historical={polity.isHistorical} />
            <span>{polity.polityName}</span>
          </PolityPillBtn>
        </PolityCell>

        <MainIdentityCell>
          {logoUrl ? (
            <DeptThumb src={logoUrl} alt={deptItem.name} />
          ) : (
            <DeptThumbFallback>
              <FiColumns size={13} />
            </DeptThumbFallback>
          )}
          <IdentityTexts>
            <TitleInlineGroup>
              <EntryTitle>{deptItem.name}</EntryTitle>
              {deptItem.abbreviation ? (
                <AbbrevSpan>({deptItem.abbreviation})</AbbrevSpan>
              ) : null}
              {isAbolished ? <AbolishedTag>폐지</AbolishedTag> : null}
            </TitleInlineGroup>
            {(deptItem.nameLocal ||
              deptItem.nameEn ||
              deptItem.primaryMission) && (
              <SubMetaLine>
                {[deptItem.nameLocal, deptItem.nameEn, deptItem.primaryMission]
                  .filter(Boolean)
                  .join(' · ')}
              </SubMetaLine>
            )}
          </IdentityTexts>
        </MainIdentityCell>

        <RegimeCell>
          {deptItem.category ? (
            <AccentCategoryBadge>{deptItem.category.name}</AccentCategoryBadge>
          ) : (
            <SubtleBadge>
              {DEPARTMENT_KIND_LABEL[deptItem.kind] ?? deptItem.kind}
            </SubtleBadge>
          )}
        </RegimeCell>

        <WideExtraCell className="col-wide-extra">
          {wideDeptMeta ? (
            <WideSubtleText title={wideDeptMeta}>{wideDeptMeta}</WideSubtleText>
          ) : (
            <MutedDash>—</MutedDash>
          )}
        </WideExtraCell>

        <MetaBadgesCell>
          {tenureCount > 0 ? (
            <CountPill>
              <FiUsers size={11} />
              <span>인사 {tenureCount}</span>
            </CountPill>
          ) : null}
          {eventCount > 0 ? (
            <CountPill>
              <span>사건 {eventCount}</span>
            </CountPill>
          ) : null}
          {tenureCount === 0 && eventCount === 0 ? (
            <MutedDash>—</MutedDash>
          ) : null}
        </MetaBadgesCell>

        <RowEndActionCell>
          <DetailPageIconLink
            to={pathKeys.government.departmentDetail(deptItem.id)}
            state={returnState}
            onClick={(clickEvent) => clickEvent.stopPropagation()}
            title="전용 상세 지면으로 이동"
          >
            <span>상세</span>
            <FiArrowUpRight size={12} />
          </DetailPageIconLink>
        </RowEndActionCell>
      </DeptLedgerRow>
    )
  }

  return (
    <PageScene>
      <VisuallyHiddenPageTitle>
        전 국가 정부 · 내각 카탈로그
      </VisuallyHiddenPageTitle>

      <PageWrapper>
        {/* ─── Top 1-Line 3-Zone Toolbar (Events Catalog Pattern) ─── */}
        <TopToolbarCard>
          <TopFilterRow>
            <ToolbarZoneLeft>
              <DomainSegment role="tablist" aria-label="정부 도메인 전환">
                <SegmentBtn
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'cabinets'}
                  $active={activeTab === 'cabinets'}
                  onClick={() =>
                    updateParams({ tab: null, selected: null })
                  }
                >
                  <span>행정부 · 내각</span>
                  <SegmentCount $active={activeTab === 'cabinets'}>
                    {allCabinets.length}
                  </SegmentCount>
                </SegmentBtn>
                <SegmentBtn
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'departments'}
                  $active={activeTab === 'departments'}
                  onClick={() =>
                    updateParams({ tab: 'departments', selected: null })
                  }
                >
                  <span>중앙부처 · 기관</span>
                  <SegmentCount $active={activeTab === 'departments'}>
                    {allDepartments.length}
                  </SegmentCount>
                </SegmentBtn>
              </DomainSegment>

              <PromSearchBox>
                <FiSearch size={14} />
                <PromSearchInput
                  ref={searchInputRef}
                  value={searchDraft}
                  onChange={(changeEvent) =>
                    setSearchDraft(changeEvent.target.value)
                  }
                  placeholder={
                    activeTab === 'cabinets'
                      ? '수반, 내각명, 국가, 연계 사건 검색 (/)'
                      : '기관명, 원어·약칭, 임무, 국가 검색 (/)'
                  }
                  aria-label="정부 카탈로그 검색"
                />
                {searchDraft ? (
                  <ClearInputBtn
                    type="button"
                    onClick={() => {
                      setSearchDraft('')
                      updateParams({ [SEARCH_QUERY_PARAM]: null })
                      searchInputRef.current?.focus()
                    }}
                    aria-label="검색어 지우기"
                  >
                    <FiX size={13} />
                  </ClearInputBtn>
                ) : (
                  <SlashKeyBadge aria-hidden="true">/</SlashKeyBadge>
                )}
              </PromSearchBox>
            </ToolbarZoneLeft>

            <ToolbarZoneCenter>
              <FilterSelect
                value={selectedContinentId}
                onChange={(changeEvent) =>
                  updateParams({
                    continent: changeEvent.target.value || null,
                    polity: null,
                  })
                }
                aria-label="대륙 필터"
              >
                <option value="">전체 대륙</option>
                {sortedContinents.map((contItem) => {
                  const contCount = continentCounts.get(contItem.id) ?? 0
                  return (
                    <option key={contItem.id} value={contItem.id}>
                      {contItem.name}
                      {contCount > 0 ? ` (${contCount})` : ''}
                    </option>
                  )
                })}
              </FilterSelect>

              <PolitySelectWrap>
                <SearchableSelect
                  options={polityOptions}
                  value={selectedPolityToken}
                  onChange={(nextVal) =>
                    updateParams({ polity: nextVal || null })
                  }
                  placeholder="전체 국가 · 시대 정체"
                  searchPlaceholder="국가 또는 왕조·정체 검색…"
                />
              </PolitySelectWrap>

              {activeTab === 'cabinets' ? (
                <>
                  <FilterSelect
                    value={cabinetCatFilter}
                    onChange={(changeEvent) =>
                      updateParams({
                        cabCat: changeEvent.target.value || null,
                      })
                    }
                    aria-label="정부 체제 분류"
                  >
                    <option value="">전체 체제</option>
                    {(
                      [
                        'PRESIDENT',
                        'PM',
                        'MONARCH',
                        'POPE',
                        'OTHER',
                      ] as PositionCategory[]
                    ).map((catKey) => {
                      const catCount = cabinetCategoryCounts.get(catKey) ?? 0
                      return (
                        <option key={catKey} value={catKey}>
                          {GLOBAL_CABINET_CATEGORY_LABELS[catKey]} ({catCount})
                        </option>
                      )
                    })}
                  </FilterSelect>

                  <YearStepperGroup>
                    <MiniIconBtn
                      type="button"
                      onClick={() => stepActiveYear(-1)}
                      title="이전 연도"
                      aria-label="이전 연도"
                    >
                      <FiChevronLeft size={13} />
                    </MiniIconBtn>
                    <YearNumberInput
                      value={yearInputDraft}
                      onChange={(changeEvent) =>
                        setYearInputDraft(changeEvent.target.value)
                      }
                      onKeyDown={(keyEvent) => {
                        if (keyEvent.key === 'Enter') {
                          commitYearFilter(yearInputDraft)
                        }
                      }}
                      onBlur={() => {
                        if (yearInputDraft.trim() !== rawYearParam.trim()) {
                          commitYearFilter(yearInputDraft)
                        }
                      }}
                      placeholder="시점 연도"
                      aria-label="동시대 시점 연도"
                    />
                    <MiniIconBtn
                      type="button"
                      onClick={() => stepActiveYear(1)}
                      title="다음 연도"
                      aria-label="다음 연도"
                    >
                      <FiChevronRight size={13} />
                    </MiniIconBtn>
                  </YearStepperGroup>

                  <FilterToggleChip
                    type="button"
                    $active={linkedOnly}
                    onClick={() =>
                      updateParams({ linked: linkedOnly ? null : '1' })
                    }
                  >
                    <FiLink2 size={12} />
                    <span>다국 연계</span>
                  </FilterToggleChip>
                </>
              ) : (
                <>
                  <FilterSelect
                    value={deptKindFilter}
                    onChange={(changeEvent) =>
                      updateParams({ kind: changeEvent.target.value || null })
                    }
                    aria-label="기관 종류 필터"
                  >
                    <option value="">전체 종류</option>
                    {DEPARTMENT_KIND_OPTIONS.map((kindOpt) => {
                      const kCount = deptKindCounts.get(kindOpt.value) ?? 0
                      return (
                        <option key={kindOpt.value} value={kindOpt.value}>
                          {kindOpt.label} ({kCount})
                        </option>
                      )
                    })}
                  </FilterSelect>

                  <FilterSelect
                    value={deptCategoryFilter}
                    onChange={(changeEvent) =>
                      updateParams({
                        categoryId: changeEvent.target.value || null,
                      })
                    }
                    aria-label="기관 분야 필터"
                  >
                    <option value="">전체 분야</option>
                    {(deptCategoriesQuery.data ?? []).map((catItem) => {
                      const cCount = deptCategoryCounts.get(catItem.id) ?? 0
                      return (
                        <option key={catItem.id} value={catItem.id}>
                          {catItem.name}
                          {cCount > 0 ? ` (${cCount})` : ''}
                        </option>
                      )
                    })}
                  </FilterSelect>

                  <FilterSelect
                    value={deptStatusFilter}
                    onChange={(changeEvent) =>
                      updateParams({
                        status:
                          changeEvent.target.value === 'all'
                            ? null
                            : changeEvent.target.value,
                      })
                    }
                    aria-label="존속 상태 필터"
                  >
                    <option value="all">전체 상태</option>
                    <option value="active">
                      현존 기관 ({deptStatusCounts.active})
                    </option>
                    <option value="abolished">
                      폐지·해체 ({deptStatusCounts.abolished})
                    </option>
                  </FilterSelect>

                  <YearStepperGroup>
                    <YearNumberInput
                      value={yearInputDraft}
                      onChange={(changeEvent) =>
                        setYearInputDraft(changeEvent.target.value)
                      }
                      onKeyDown={(keyEvent) => {
                        if (keyEvent.key === 'Enter') {
                          commitYearFilter(yearInputDraft)
                        }
                      }}
                      onBlur={() => {
                        if (yearInputDraft.trim() !== rawYearParam.trim()) {
                          commitYearFilter(yearInputDraft)
                        }
                      }}
                      placeholder="존속 연도"
                      aria-label="기관 존속 연도"
                    />
                  </YearStepperGroup>
                </>
              )}
            </ToolbarZoneCenter>

            <ToolbarZoneRight>
              <UtilityBtn
                type="button"
                onClick={() => setPositionDictOpen(true)}
                title="전 국가 표준 관직 사전 열기"
              >
                <FiBookOpen size={13} />
                <span>관직 사전</span>
              </UtilityBtn>

              <PopoverAnchor ref={displayMenuWrapRef}>
                <UtilityBtn
                  type="button"
                  $active={displayPopoverOpen}
                  onClick={() => setDisplayPopoverOpen((prevOpen) => !prevOpen)}
                  aria-expanded={displayPopoverOpen}
                  title="표시 방식 · 밀도 · 정렬 설정"
                >
                  <FiMoreHorizontal size={15} />
                  <span>표시</span>
                </UtilityBtn>

                {displayPopoverOpen ? (
                  <DisplayPopover role="dialog" aria-label="목록 표시 설정">
                    {activeTab === 'cabinets' ? (
                      <PopoverField>
                        <PopoverLabel>레이아웃</PopoverLabel>
                        <PopoverSegment>
                          <PopoverSegBtn
                            type="button"
                            $active={displayMode === 'ledger'}
                            onClick={() => {
                              updateParams({ view: null })
                              writeGovernmentCatalogMemory({
                                displayMode: 'ledger',
                              })
                            }}
                          >
                            <FiList size={12} />
                            <span>원장 리스트</span>
                          </PopoverSegBtn>
                          <PopoverSegBtn
                            type="button"
                            $active={displayMode === 'cards'}
                            onClick={() => {
                              updateParams({ view: 'cards' })
                              writeGovernmentCatalogMemory({
                                displayMode: 'cards',
                              })
                            }}
                          >
                            <FiGrid size={12} />
                            <span>비교 카드</span>
                          </PopoverSegBtn>
                        </PopoverSegment>
                      </PopoverField>
                    ) : null}

                    <PopoverField>
                      <PopoverLabel>행 밀도</PopoverLabel>
                      <PopoverSegment $cols={3}>
                        <PopoverSegBtn
                          type="button"
                          $active={density === 'compact'}
                          onClick={() => {
                            setDensity('compact')
                            writeGovernmentCatalogMemory({ density: 'compact' })
                          }}
                        >
                          촘촘
                        </PopoverSegBtn>
                        <PopoverSegBtn
                          type="button"
                          $active={density === 'cozy'}
                          onClick={() => {
                            setDensity('cozy')
                            writeGovernmentCatalogMemory({ density: 'cozy' })
                          }}
                        >
                          보통
                        </PopoverSegBtn>
                        <PopoverSegBtn
                          type="button"
                          $active={density === 'roomy'}
                          onClick={() => {
                            setDensity('roomy')
                            writeGovernmentCatalogMemory({ density: 'roomy' })
                          }}
                        >
                          여유
                        </PopoverSegBtn>
                      </PopoverSegment>
                    </PopoverField>

                    <PopoverField>
                      <PopoverLabel>정렬 기준</PopoverLabel>
                      {activeTab === 'cabinets' ? (
                        <PopoverSelect
                          value={cabinetSort}
                          onChange={(changeEvent) => {
                            const nextSort = changeEvent.target
                              .value as CabinetSortKey
                            updateParams({
                              sort:
                                nextSort === 'period_desc' ? null : nextSort,
                            })
                            writeGovernmentCatalogMemory({
                              cabinetSort: nextSort,
                            })
                          }}
                        >
                          <option value="period_desc">
                            최신 출범순 (세기 구분)
                          </option>
                          <option value="period_asc">
                            고대·초기순 (세기 구분)
                          </option>
                          <option value="country">국가명 가나다순</option>
                          <option value="name">내각명 가나다순</option>
                        </PopoverSelect>
                      ) : (
                        <PopoverSelect
                          value={deptSort}
                          onChange={(changeEvent) => {
                            const nextSort = changeEvent.target
                              .value as DepartmentSortKey
                            updateParams({
                              deptSort:
                                nextSort === 'country' ? null : nextSort,
                            })
                            writeGovernmentCatalogMemory({ deptSort: nextSort })
                          }}
                        >
                          <option value="country">국가명 가나다순</option>
                          <option value="period_desc">
                            설립 최신순 (세기 구분)
                          </option>
                          <option value="period_asc">
                            설립 초기순 (세기 구분)
                          </option>
                          <option value="name">기관명 가나다순</option>
                        </PopoverSelect>
                      )}
                    </PopoverField>

                    {allChapterKeys.length > 0 &&
                    ((activeTab === 'cabinets' && isCabinetGroupedByCentury) ||
                      (activeTab === 'departments' &&
                        isDepartmentGroupedByCentury)) ? (
                      <PopoverFooterRow>
                        <PopoverTextBtn
                          type="button"
                          onClick={() => applyCollapsedChapters(() => new Set())}
                        >
                          모든 세기 펼치기
                        </PopoverTextBtn>
                        <PopoverTextBtn
                          type="button"
                          onClick={() =>
                            applyCollapsedChapters(() => new Set(allChapterKeys))
                          }
                        >
                          모든 세기 접기
                        </PopoverTextBtn>
                      </PopoverFooterRow>
                    ) : null}
                  </DisplayPopover>
                ) : null}
              </PopoverAnchor>

              <PrimaryRegisterBtn
                type="button"
                onClick={() => {
                  if (activeTab === 'cabinets') {
                    setEditingCabinetRecord(null)
                    setCabinetModalOpen(true)
                  } else {
                    setEditingDepartmentRecord(null)
                    setDeptModalOpen(true)
                  }
                }}
              >
                <FiPlus size={14} />
                <span>
                  {activeTab === 'cabinets' ? '새 내각 등록' : '새 기관 등록'}
                </span>
              </PrimaryRegisterBtn>
            </ToolbarZoneRight>
          </TopFilterRow>

          {/* ─── Conditional Active Filters Row ─── */}
          {hasAnyActiveFilter ? (
            <ActiveFiltersRow>
              <ActiveFiltersLabel>
                <FiSliders size={11} />
                <span>적용 필터</span>
              </ActiveFiltersLabel>
              <ActiveChipList>
                {activeFilterChips.map((chipItem) => (
                  <ActiveFilterChip key={chipItem.key}>
                    <span>{chipItem.label}</span>
                    <button
                      type="button"
                      onClick={chipItem.onRemove}
                      aria-label={`${chipItem.label} 해제`}
                    >
                      <FiX size={11} />
                    </button>
                  </ActiveFilterChip>
                ))}
              </ActiveChipList>
              <ResetAllBtn type="button" onClick={clearAllFilters}>
                <FiRotateCcw size={11} />
                <span>전체 초기화</span>
              </ResetAllBtn>
            </ActiveFiltersRow>
          ) : null}
        </TopToolbarCard>

        {/* ─── Split Catalog Body (Left Ledger + Right Sticky Drawer) ─── */}
        <CatalogSplit $drawerOpen={isDrawerOpen}>
          <LedgerCardSurface>
            <GovernmentEraStrip
              buckets={eraBuckets}
              decadeBuckets={eraDecadeBuckets}
              activeCenturyKey={activeCenturyKey}
              onJumpToCentury={handleJumpToCentury}
              onJumpToDecade={handleJumpToDecade}
              activeYearValue={rawYearParam}
              currentOnly={currentOnly}
              showCurrentToggle={activeTab === 'cabinets'}
              onSelectPresetYear={(presetYear) => {
                const isSame =
                  !currentOnly && rawYearParam.trim() === String(presetYear)
                if (isSame) {
                  setYearInputDraft('')
                  updateParams({ year: null })
                } else {
                  setYearInputDraft(String(presetYear))
                  updateParams({ year: String(presetYear), current: null })
                }
              }}
              onToggleCurrentOnly={() => {
                if (currentOnly) {
                  updateParams({ current: null })
                } else {
                  setYearInputDraft('')
                  updateParams({ current: '1', year: null })
                }
              }}
              undatedCount={eraUndatedCount}
            />

            {/* Sticky Column Header */}
            <StickyLedgerHead $cardsMode={activeTab === 'cabinets' && displayMode === 'cards'}>
              <LedgerStatsSummary>
                <strong>표시 {matchedCount.toLocaleString()}건</strong>
                {hasAnyActiveFilter ? (
                  <span>
                    / 전체 {totalUnfilteredCount.toLocaleString()}건
                  </span>
                ) : null}
                {activeAtYear != null ? (
                  <ContextYearPill>
                    {formatSignedYearLabel(activeAtYear)}년 동시대 단면
                  </ContextYearPill>
                ) : null}
              </LedgerStatsSummary>

              {!(activeTab === 'cabinets' && displayMode === 'cards') ? (
                <ColumnHintsRow>
                  <span>존속 기간</span>
                  <span>국가 · 정체</span>
                  <span>
                    {activeTab === 'cabinets'
                      ? '행정부 · 수반'
                      : '기관명 · 임무'}
                  </span>
                  <span className="col-regime">
                    {activeTab === 'cabinets' ? '체제' : '분류'}
                  </span>
                  <span className="col-wide-extra">
                    {activeTab === 'cabinets'
                      ? '집권 정당 · 출범'
                      : '상위기관 · 소재지'}
                  </span>
                  <span className="col-meta">
                    {activeTab === 'cabinets'
                      ? '각료 · 사건 · 연계'
                      : '인사 · 사건'}
                  </span>
                  <span />
                </ColumnHintsRow>
              ) : null}
            </StickyLedgerHead>

            <LedgerScrollViewport ref={ledgerScrollRef}>
              {isCatalogLoading ? (
                <EmptyStateBox>
                  <EmptyTitle>
                    {activeTab === 'cabinets'
                      ? '전 국가 행정부·내각 원장을 불러오는 중입니다…'
                      : '전 국가 중앙부처·국가기관 원장을 불러오는 중입니다…'}
                  </EmptyTitle>
                </EmptyStateBox>
              ) : matchedCount === 0 ? (
                <EmptyStateBox>
                  <EmptyTitle>
                    조건에 일치하는{' '}
                    {activeTab === 'cabinets' ? '행정부·내각이' : '부처·기관이'}{' '}
                    없습니다.
                  </EmptyTitle>
                  <EmptySub>
                    아래 필터를 개별 해제해 조건을 넓히거나, 새 기록을 바로 등록할
                    수 있습니다.
                  </EmptySub>

                  {releaseSuggestions.length > 0 ? (
                    <RecoveryChipsWrap>
                      {releaseSuggestions.map((sugItem) => (
                        <RecoveryChipBtn
                          key={sugItem.key}
                          type="button"
                          onClick={sugItem.onRelease}
                        >
                          <span>{sugItem.label}</span>
                          <strong>{sugItem.count}건 보기</strong>
                        </RecoveryChipBtn>
                      ))}
                    </RecoveryChipsWrap>
                  ) : null}

                  <EmptyActionsRow>
                    {hasAnyActiveFilter ? (
                      <SecondaryResetBtn
                        type="button"
                        onClick={clearAllFilters}
                      >
                        <FiRotateCcw size={13} />
                        <span>전체 필터 초기화</span>
                      </SecondaryResetBtn>
                    ) : null}
                    <PrimaryRegisterBtn
                      type="button"
                      onClick={() => {
                        if (activeTab === 'cabinets') {
                          setEditingCabinetRecord(null)
                          setCabinetModalOpen(true)
                        } else {
                          setEditingDepartmentRecord(null)
                          setDeptModalOpen(true)
                        }
                      }}
                    >
                      <FiPlus size={14} />
                      <span>
                        {activeTab === 'cabinets'
                          ? '새 내각 바로 등록'
                          : '새 기관 바로 등록'}
                      </span>
                    </PrimaryRegisterBtn>
                  </EmptyActionsRow>
                </EmptyStateBox>
              ) : activeTab === 'cabinets' ? (
                displayMode === 'cards' ? (
                  <CardsGrid>
                    {filteredCabinets.map((cabinetItem) => {
                      const polity = resolveCabinetPolityInfo(cabinetItem)
                      const effDates = resolveCabinetEffectiveDates(cabinetItem)
                      const periodText = formatIsoShortPeriod(
                        effDates.startDate,
                        effDates.endDate,
                        effDates.isOngoing,
                      )
                      const headName = resolveCabinetHeadName(cabinetItem)
                      const posTitle = resolveCabinetPositionTitle(cabinetItem)
                      const displayTitle =
                        resolveCabinetDisplayTitle(cabinetItem)
                      const ministerCount =
                        resolveCabinetMinisterCount(cabinetItem)
                      const leadingParty =
                        resolveCabinetLeadingParty(cabinetItem)
                      const avatarUrl = cabinetItem.headTenure?.person
                        ?.profileImageUrl
                        ? getUploadImageUrl(
                            cabinetItem.headTenure.person.profileImageUrl,
                          )
                        : null
                      const isSelected = selectedId === cabinetItem.id

                      return (
                        <ComparisonCard
                          key={cabinetItem.id}
                          data-gov-row-id={cabinetItem.id}
                          $selected={isSelected}
                          onClick={() =>
                            updateParams({
                              selected: isSelected ? null : cabinetItem.id,
                            })
                          }
                        >
                          <CardTopRow>
                            <PolityPillBtn
                              type="button"
                              $historical={polity.isHistorical}
                              onClick={(clickEvent) => {
                                if (!shouldInterceptEntityClick(clickEvent)) {
                                  return
                                }
                                clickEvent.stopPropagation()
                                handleOpenPolityModal(polity)
                              }}
                            >
                              <PolityDot $historical={polity.isHistorical} />
                              <span>{polity.polityName}</span>
                            </PolityPillBtn>
                            <PeriodCell>
                              <span>{periodText}</span>
                            </PeriodCell>
                          </CardTopRow>

                          <CardIdentityRow>
                            {avatarUrl ? (
                              <CardAvatar src={avatarUrl} alt={headName} />
                            ) : (
                              <CardAvatarFallback>
                                {headName.slice(0, 1)}
                              </CardAvatarFallback>
                            )}
                            <IdentityTexts>
                              <EntryTitle>{displayTitle}</EntryTitle>
                              <SubMetaLine>
                                {headName}
                                {posTitle ? ` · ${posTitle}` : ''}
                              </SubMetaLine>
                            </IdentityTexts>
                          </CardIdentityRow>

                          <CardFooterRow>
                            <CardMetaBadgesWrap>
                              <SubtleBadge>
                                {
                                  GLOBAL_CABINET_CATEGORY_LABELS[
                                    resolveCabinetCategory(cabinetItem)
                                  ]
                                }
                              </SubtleBadge>
                              {leadingParty ? (
                                <PartyPill title={leadingParty.fullName}>
                                  <PartyColorDot
                                    $color={leadingParty.brandColor}
                                  />
                                  <span className="party-name">
                                    {leadingParty.label}
                                  </span>
                                </PartyPill>
                              ) : null}
                              {ministerCount > 0 ? (
                                <CountPill>
                                  <FiUsers size={11} />
                                  <span>각료 {ministerCount}</span>
                                </CountPill>
                              ) : null}
                            </CardMetaBadgesWrap>
                            <DetailPageIconLink
                              to={pathKeys.government.cabinetDetail(
                                cabinetItem.id,
                              )}
                              state={returnState}
                              onClick={(clickEvent) =>
                                clickEvent.stopPropagation()
                              }
                            >
                              <span>상세</span>
                              <FiArrowUpRight size={12} />
                            </DetailPageIconLink>
                          </CardFooterRow>
                        </ComparisonCard>
                      )
                    })}
                  </CardsGrid>
                ) : isCabinetGroupedByCentury ? (
                  <ChapterStack>
                    {cabinetChapters.map((chapterGroup) => {
                      const isCollapsed = collapsedChapters.has(
                        chapterGroup.key,
                      )
                      const headingText =
                        chapterGroup.century != null
                          ? formatCenturyLabel(chapterGroup.century)
                          : '연대 미상'
                      const subtitleText =
                        chapterGroup.century != null
                          ? formatCenturyRangeSubtitle(chapterGroup.century)
                          : ''
                      return (
                        <ChapterSection
                          key={chapterGroup.key}
                          data-century-chapter={chapterGroup.key}
                        >
                          <ChapterHeaderBtn
                            type="button"
                            onClick={() =>
                              toggleChapterCollapsed(chapterGroup.key)
                            }
                            aria-expanded={!isCollapsed}
                          >
                            <ChapterTitleGroup>
                              <ChevronWrap $collapsed={isCollapsed}>
                                <FiChevronDown size={13} />
                              </ChevronWrap>
                              <ChapterTitle>{headingText}</ChapterTitle>
                              {subtitleText ? (
                                <ChapterRange>{subtitleText}</ChapterRange>
                              ) : null}
                            </ChapterTitleGroup>
                            <ChapterCount>
                              {chapterGroup.items.length}개 내각
                            </ChapterCount>
                          </ChapterHeaderBtn>
                          {!isCollapsed ? (
                            <LedgerRowsContainer $withRail>
                              {chapterGroup.items.map(renderCabinetRow)}
                            </LedgerRowsContainer>
                          ) : null}
                        </ChapterSection>
                      )
                    })}
                  </ChapterStack>
                ) : (
                  <LedgerRowsContainer>
                    {filteredCabinets.map(renderCabinetRow)}
                  </LedgerRowsContainer>
                )
              ) : isDepartmentGroupedByCentury ? (
                <ChapterStack>
                  {departmentChapters.map((chapterGroup) => {
                    const isCollapsed = collapsedChapters.has(chapterGroup.key)
                    const headingText =
                      chapterGroup.century != null
                        ? formatCenturyLabel(chapterGroup.century)
                        : '설립 연대 미상'
                    const subtitleText =
                      chapterGroup.century != null
                        ? formatCenturyRangeSubtitle(chapterGroup.century)
                        : ''
                    return (
                      <ChapterSection
                        key={chapterGroup.key}
                        data-century-chapter={chapterGroup.key}
                      >
                        <ChapterHeaderBtn
                          type="button"
                          onClick={() =>
                            toggleChapterCollapsed(chapterGroup.key)
                          }
                          aria-expanded={!isCollapsed}
                        >
                          <ChapterTitleGroup>
                            <ChevronWrap $collapsed={isCollapsed}>
                              <FiChevronDown size={13} />
                            </ChevronWrap>
                            <ChapterTitle>{headingText}</ChapterTitle>
                            {subtitleText ? (
                              <ChapterRange>{subtitleText}</ChapterRange>
                            ) : null}
                          </ChapterTitleGroup>
                          <ChapterCount>
                            {chapterGroup.items.length}개 기관
                          </ChapterCount>
                        </ChapterHeaderBtn>
                        {!isCollapsed ? (
                          <LedgerRowsContainer $withRail>
                            {chapterGroup.items.map(renderDepartmentRow)}
                          </LedgerRowsContainer>
                        ) : null}
                      </ChapterSection>
                    )
                  })}
                </ChapterStack>
              ) : (
                <LedgerRowsContainer>
                  {filteredDepartments.map(renderDepartmentRow)}
                </LedgerRowsContainer>
              )}
            </LedgerScrollViewport>
          </LedgerCardSurface>

          {/* ─── Right-Hand Detail Preview & Action Drawer ─── */}
          {isDrawerOpen ? (
            <>
              <MobileDrawerBackdrop
                onClick={() => updateParams({ selected: null })}
              />
              <DrawerHostColumn>
                <GovernmentDetailDrawer
                  activeTab={activeTab}
                  selectedCabinetId={
                    activeTab === 'cabinets' ? selectedId : null
                  }
                  selectedDepartmentId={
                    activeTab === 'departments' ? selectedId : null
                  }
                  listSearch={location.search}
                  hasPrev={hasPrevSelection}
                  hasNext={hasNextSelection}
                  onStepPrev={() => stepSelection(-1)}
                  onStepNext={() => stepSelection(1)}
                  onClose={() => updateParams({ selected: null })}
                  onOpenPersonModal={(targetPersonId) =>
                    setPersonModalId(targetPersonId)
                  }
                  onOpenCountryModal={(targetCountry) =>
                    setCountryModalTarget(targetCountry)
                  }
                  onEditCabinet={(cabinetToEdit) => {
                    setEditingCabinetRecord(
                      toEditableCabinetRecord(cabinetToEdit),
                    )
                    setCabinetModalOpen(true)
                  }}
                  onAppointCabinetMinister={(targetCabinet) =>
                    setAppointingCabinet(targetCabinet)
                  }
                  onEditDepartment={(deptToEdit) => {
                    setEditingDepartmentRecord(deptToEdit)
                    setDeptModalOpen(true)
                  }}
                  onAppointDepartmentMember={(targetDept) =>
                    setAppointingDepartment(targetDept)
                  }
                  onSelectCabinetInCatalog={(nextCabId) =>
                    updateParams({ tab: null, selected: nextCabId })
                  }
                  onSelectDepartmentInCatalog={(nextDeptId) =>
                    updateParams({ tab: 'departments', selected: nextDeptId })
                  }
                />
              </DrawerHostColumn>
            </>
          ) : null}
        </CatalogSplit>
      </PageWrapper>

      {/* ─── In-Place Modals & Side Panels ─── */}
      <CabinetFormModal
        isOpen={cabinetModalOpen}
        onClose={() => {
          setCabinetModalOpen(false)
          setEditingCabinetRecord(null)
        }}
        initialPolityValue={toModalPolityValue(selectedPolityToken)}
        editingCabinet={editingCabinetRecord}
        onSaved={(savedCabinetId) => {
          void queryClient.invalidateQueries({ queryKey: ['global-cabinets'] })
          if (savedCabinetId) {
            updateParams({ tab: null, selected: savedCabinetId })
          }
        }}
      />

      <GovernmentDepartmentFormModal
        isOpen={deptModalOpen}
        onClose={() => {
          setDeptModalOpen(false)
          setEditingDepartmentRecord(null)
        }}
        initialPolityValue={toModalPolityValue(selectedPolityToken)}
        editingDepartment={editingDepartmentRecord}
        onSaved={(savedDepartmentId) => {
          void queryClient.invalidateQueries({
            queryKey: ['global-departments'],
          })
          if (savedDepartmentId) {
            updateParams({ tab: 'departments', selected: savedDepartmentId })
          }
        }}
      />

      {appointingCabinet ? (
        <InstitutionAppointmentModal
          isOpen={Boolean(appointingCabinet)}
          onClose={() => setAppointingCabinet(null)}
          contextType="CABINET"
          countryId={
            resolveCabinetPolityInfo(appointingCabinet).modernCountryId
          }
          historicalCountryId={
            resolveCabinetPolityInfo(appointingCabinet).historicalCountryId
          }
          countryName={resolveCabinetPolityInfo(appointingCabinet).polityName}
          cabinetId={appointingCabinet.id}
          cabinetName={resolveCabinetDisplayTitle(appointingCabinet)}
          availableDepartments={appointingCabinetDepartments}
          onSaved={() => {
            invalidateTenureQueries(queryClient, {
              cabinetId: appointingCabinet.id,
            })
            void queryClient.invalidateQueries({
              queryKey: ['global-cabinets'],
            })
            void queryClient.invalidateQueries({
              queryKey: ['cabinet-tenures', appointingCabinet.id],
            })
            void queryClient.invalidateQueries({
              queryKey: ['cabinet-suggested-members', appointingCabinet.id],
            })
          }}
        />
      ) : null}

      {appointingDepartment ? (
        <InstitutionAppointmentModal
          isOpen={Boolean(appointingDepartment)}
          onClose={() => setAppointingDepartment(null)}
          contextType="DEPARTMENT"
          countryId={
            resolveDepartmentPolityInfo(appointingDepartment).modernCountryId
          }
          historicalCountryId={
            resolveDepartmentPolityInfo(appointingDepartment)
              .historicalCountryId
          }
          countryName={
            resolveDepartmentPolityInfo(appointingDepartment).polityName
          }
          departmentId={appointingDepartment.id}
          departmentName={appointingDepartment.name}
          departmentKind={appointingDepartment.kind}
          availableCabinets={appointingDepartmentCabinets}
          onSaved={() => {
            invalidateTenureQueries(queryClient)
            void queryClient.invalidateQueries({
              queryKey: ['global-departments'],
            })
            void queryClient.invalidateQueries({
              queryKey: [
                'administration-department-tenures',
                appointingDepartment.id,
              ],
            })
          }}
        />
      ) : null}

      <PersonInlineModal
        personId={personModalId}
        onClose={() => setPersonModalId(null)}
        onEdit={() => setPersonModalId(null)}
      />

      <CountryInlineModal
        target={countryModalTarget}
        onClose={() => setCountryModalTarget(null)}
        onSwitch={(nextTarget) => setCountryModalTarget(nextTarget)}
      />

      <SidePanel
        isOpen={positionDictOpen}
        onClose={() => setPositionDictOpen(false)}
        title="전 국가 표준 관직 사전"
        width="760px"
      >
        <PositionDefinitionsSection />
      </SidePanel>
    </PageScene>
  )
}

export default GovernmentCatalogPage

/* ─── Events-Style Full-Viewport Shell & Ledger Styled Components ───────── */

const PageScene = styled.div`
  position: fixed;
  top: var(--header-height, 64px);
  left: var(--content-left-inset, 0px);
  right: 0;
  bottom: 0;
  height: calc(100vh - var(--header-height, 64px));
  padding-top: 10px;
  padding-bottom: max(14px, env(safe-area-inset-bottom));
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => (theme.mode === 'dark' ? '#0f0f0f' : '#ffffff')};

  @media (max-width: 768px) {
    height: calc(100dvh - var(--header-height, 64px));
  }
`

const VisuallyHiddenPageTitle = styled.h1`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
`

const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  padding: 0 clamp(16px, 1.2vw, 32px);
  flex: 1;
  min-height: 0;
  overflow: hidden;
`

const TopToolbarCard = styled.header`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
`

const TopFilterRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 0 4px;
  flex-wrap: wrap;
`

const ToolbarZoneLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
`

const ToolbarZoneCenter = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 240px;
  flex-wrap: wrap;
`

const ToolbarZoneRight = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`

const DomainSegment = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f1f5f9'};
`

const SegmentBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border-radius: ${RADIUS.XS};
  border: none;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  background: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.22)'
        : '#ffffff'
      : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  box-shadow: ${({ theme, $active }) =>
    $active && theme.mode !== 'dark'
      ? '0 1px 2px rgba(15, 23, 42, 0.08)'
      : 'none'};

  &:hover {
    color: ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
  }
`

const SegmentCount = styled.span<{ $active: boolean }>`
  ${DIGIT_DISPLAY}
  font-size: 10.5px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 999px;
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : ledgerChipFill(theme.mode)};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
`

const PromSearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  width: clamp(210px, 19vw, 310px);
  padding: 0 9px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.tertiary};

  &:focus-within {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }
`

const PromSearchInput = styled.input`
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.primary};

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const SlashKeyBadge = styled.kbd`
  ${DIGIT_DISPLAY}
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ClearInputBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const FilterSelect = styled.select`
  height: 32px;
  max-width: 170px;
  padding: 0 8px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
`

const PolitySelectWrap = styled.div`
  width: clamp(190px, 16vw, 250px);
`

const YearStepperGroup = styled.div`
  display: inline-flex;
  align-items: center;
  height: 32px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#ffffff'};
  overflow: hidden;
`

const MiniIconBtn = styled.button`
  width: 24px;
  height: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const YearNumberInput = styled.input`
  ${DIGIT_DISPLAY}
  width: 72px;
  height: 100%;
  padding: 0 6px;
  border: none;
  outline: none;
  text-align: center;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  font-weight: 700;

  &::placeholder {
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const FilterToggleChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccentBorder(theme.mode) : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    color: ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
    background: ${({ theme, $active }) =>
      $active ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
  }
`

const UtilityBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccentBorder(theme.mode) : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const PrimaryRegisterBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 13px;
  border-radius: ${RADIUS.SM};
  border: none;
  background: #4f46e5;
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: #4338ca;
  }
`

const PopoverAnchor = styled.div`
  position: relative;
`

const DisplayPopover = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 268px;
  padding: 12px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#18181b' : '#ffffff'};
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.22);
  display: flex;
  flex-direction: column;
  gap: 11px;
  z-index: 40;
`

const PopoverField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`

const PopoverLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PopoverSegment = styled.div<{ $cols?: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $cols }) => $cols ?? 2}, minmax(0, 1fr));
  gap: 4px;
  padding: 2px;
  border-radius: ${RADIUS.SM};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f1f5f9'};
`

const PopoverSegBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 28px;
  border-radius: ${RADIUS.XS};
  border: none;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  background: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.24)'
        : '#ffffff'
      : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
`

const PopoverSelect = styled.select`
  height: 30px;
  padding: 0 8px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#222226' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  font-weight: 600;
`

const PopoverFooterRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const PopoverTextBtn = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  padding: 2px 4px;

  &:hover {
    text-decoration: underline;
  }
`

const ActiveFiltersRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0 4px;
  flex-wrap: wrap;
`

const ActiveFiltersLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ActiveChipList = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  flex: 1;
`

const ActiveFilterChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 11.5px;
  font-weight: 700;

  button {
    display: inline-flex;
    align-items: center;
    border: none;
    background: transparent;
    color: inherit;
    padding: 0;
    cursor: pointer;
  }
`

const ResetAllBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: ${RADIUS.XS};
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const CatalogSplit = styled.div<{ $drawerOpen: boolean }>`
  display: grid;
  grid-template-columns: ${({ $drawerOpen }) =>
    $drawerOpen ? 'minmax(0, 1fr) 440px' : 'minmax(0, 1fr)'};
  gap: 10px;
  flex: 1;
  min-height: 0;
  overflow: hidden;

  @media (max-width: 1200px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const LedgerCardSurface = styled.main`
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  overflow: hidden;
`

const StickyLedgerHead = styled.div<{ $cardsMode: boolean }>`
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#141417' : '#f8fafc'};
  flex-shrink: 0;
`

const LedgerStatsSummary = styled.div`
  ${DIGIT_DISPLAY}
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 800;
  }
`

const ContextYearPill = styled.span`
  margin-left: 4px;
  padding: 1px 7px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 11px;
  font-weight: 700;
`

const LEDGER_GRID_TEMPLATE = css`
  display: grid;
  grid-template-columns: 128px 146px minmax(220px, 1fr) 114px 168px 186px 64px;
  align-items: center;
  gap: 12px;

  @container (max-width: 1240px) {
    grid-template-columns: 124px 144px minmax(210px, 1fr) 114px 176px 64px;
    .col-wide-extra {
      display: none;
    }
  }

  @container (max-width: 960px) {
    grid-template-columns: 112px 132px minmax(180px, 1fr) 150px 58px;
    .col-wide-extra,
    .col-regime {
      display: none;
    }
  }

  @container (max-width: 720px) {
    grid-template-columns: 102px 118px minmax(150px, 1fr) 54px;
    .col-wide-extra,
    .col-regime,
    .col-meta {
      display: none;
    }
  }
`

const ColumnHintsRow = styled.div`
  ${LEDGER_GRID_TEMPLATE}
  padding: 5px 16px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LedgerScrollViewport = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
`

const ChapterStack = styled.div`
  display: flex;
  flex-direction: column;
`

const ChapterSection = styled.section`
  display: flex;
  flex-direction: column;
`

const ChapterHeaderBtn = styled.button`
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 7px 16px;
  border: none;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(22, 22, 26, 0.95)'
      : 'rgba(241, 245, 249, 0.95)'};
  backdrop-filter: blur(6px);
  cursor: pointer;
  text-align: left;

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const ChapterTitleGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
`

const ChevronWrap = styled.span<{ $collapsed: boolean }>`
  display: inline-flex;
  align-items: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  transform: rotate(${({ $collapsed }) => ($collapsed ? '-90deg' : '0deg')});
  transition: transform 0.15s ease;
`

const ChapterTitle = styled.h3`
  margin: 0;
  font-size: 12.5px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ChapterRange = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ChapterCount = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const LedgerRowsContainer = styled.div<{ $withRail?: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;

  ${({ $withRail, theme }) =>
    $withRail
      ? css`
          &::before {
            content: '';
            position: absolute;
            top: 0;
            bottom: 0;
            left: 19px;
            width: 1px;
            background: ${ledgerHairlineStrong(theme.mode)};
            pointer-events: none;
          }
        `
      : ''}
`

const baseLedgerRowCss = css<{
  $selected: boolean
  $density: GovernmentListDensity
}>`
  ${LEDGER_GRID_TEMPLATE}
  padding: ${({ $density }) =>
    $density === 'compact'
      ? '6px 16px'
      : $density === 'cozy'
        ? '9px 16px'
        : '13px 16px'};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme, $selected }) =>
    $selected ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  box-shadow: ${({ theme, $selected }) =>
    $selected ? `inset 3px 0 0 ${ledgerAccent(theme.mode)}` : 'none'};
  cursor: pointer;
  transition: background 0.12s ease;

  &:hover {
    background: ${({ theme, $selected }) =>
      $selected ? ledgerAccentSubtle(theme.mode) : ledgerRowWash(theme.mode)};
  }
`

const CabinetLedgerRow = styled.div<{
  $selected: boolean
  $density: GovernmentListDensity
}>`
  ${baseLedgerRowCss}
`

const DeptLedgerRow = styled.div<{
  $selected: boolean
  $density: GovernmentListDensity
}>`
  ${baseLedgerRowCss}
`

const PeriodCell = styled.span`
  ${DIGIT_DISPLAY}
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
  }
`

const TimelineNodeDot = styled.span<{ $active: boolean; $ongoing?: boolean }>`
  position: relative;
  z-index: 1;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ theme, $active, $ongoing }) =>
    $active
      ? ledgerAccent(theme.mode)
      : $ongoing
        ? '#10b981'
        : theme.mode === 'dark'
          ? '#52525b'
          : '#cbd5e1'};
  box-shadow: ${({ theme }) =>
    `0 0 0 2px ${theme.mode === 'dark' ? '#141417' : '#ffffff'}`};
`

const PolityDot = styled.span<{ $historical: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ theme, $historical }) =>
    $historical
      ? theme.mode === 'dark'
        ? '#f59e0b'
        : '#d97706'
      : ledgerAccent(theme.mode)};
`

const WideExtraCell = styled.div`
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;

  @container (max-width: 1240px) {
    display: none;
  }
`

const PartyPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};

  .party-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .party-coalition {
    ${DIGIT_DISPLAY}
    font-size: 10px;
    color: ${({ theme }) => theme.colors.text.tertiary};
    flex-shrink: 0;
  }
`

const PartyColorDot = styled.span<{ $color?: string | null }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $color, theme }) => $color || ledgerAccent(theme.mode)};
`

const WideSubtleText = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const CardMetaBadgesWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  min-width: 0;
`

const PolityCell = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
`

const PolityPillBtn = styled.button<{ $historical: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme, $historical }) =>
      $historical
        ? theme.mode === 'dark'
          ? 'rgba(217, 119, 6, 0.35)'
          : 'rgba(180, 83, 9, 0.25)'
        : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $historical }) =>
    $historical
      ? theme.mode === 'dark'
        ? 'rgba(217, 119, 6, 0.12)'
        : 'rgba(254, 243, 199, 0.65)'
      : ledgerChipFill(theme.mode)};
  color: ${({ theme, $historical }) =>
    $historical
      ? theme.mode === 'dark'
        ? '#fbbf24'
        : '#92400e'
      : theme.colors.text.primary};
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  overflow: hidden;

  span:last-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }
`

const MainIdentityCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`

const PersonAvatar = styled.img`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const PersonAvatarFallback = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11.5px;
  font-weight: 800;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const DeptThumb = styled.img`
  width: 28px;
  height: 28px;
  border-radius: ${RADIUS.XS};
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const DeptThumbFallback = styled.div`
  width: 28px;
  height: 28px;
  border-radius: ${RADIUS.XS};
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const IdentityTexts = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
`

const TitleInlineGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

const EntryTitle = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const AbbrevSpan = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
`

const OngoingBadge = styled.span`
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  background: rgba(16, 185, 129, 0.14);
  color: #10b981;
  flex-shrink: 0;
`

const AbolishedTag = styled.span`
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
`

const SubMetaLine = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const PersonTriggerBtn = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
  }
`

const RegimeCell = styled.div`
  display: flex;
  align-items: center;
  min-width: 0;

  @container (max-width: 960px) {
    display: none;
  }
`

const SubtleBadge = styled.span`
  padding: 2px 7px;
  border-radius: ${RADIUS.XS};
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const AccentCategoryBadge = styled.span`
  padding: 2px 7px;
  border-radius: ${RADIUS.XS};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const MetaBadgesCell = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  overflow: hidden;

  @container (max-width: 720px) {
    display: none;
  }
`

const CountPill = styled.span`
  ${DIGIT_DISPLAY}
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
`

const LinkageBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 115px;
  padding: 2px 7px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 10.5px;
  font-weight: 700;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const MutedDash = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RowEndActionCell = styled.div`
  display: flex;
  justify-content: flex-end;
`

const DetailPageIconLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 7px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
`

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 10px;
  padding: 14px 16px;
`

const ComparisonCard = styled.div<{ $selected: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 13px 14px;
  border-radius: ${RADIUS.MD};
  border: 1px solid
    ${({ theme, $selected }) =>
      $selected ? ledgerAccentBorder(theme.mode) : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $selected }) =>
    $selected ? ledgerAccentSubtle(theme.mode) : ledgerSurface(theme.mode)};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }
`

const CardTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const CardIdentityRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`

const CardAvatar = styled.img`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`

const CardAvatarFallback = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const CardFooterRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const DrawerHostColumn = styled.aside`
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  overflow: hidden;

  @media (max-width: 1200px) {
    position: fixed;
    top: var(--header-height, 64px);
    right: 0;
    bottom: 0;
    width: min(440px, 94vw);
    border-radius: 0;
    z-index: 1100;
    box-shadow: -12px 0 32px rgba(15, 23, 42, 0.24);
  }
`

const MobileDrawerBackdrop = styled.div`
  display: none;

  @media (max-width: 1200px) {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.42);
    backdrop-filter: blur(2px);
    z-index: 1099;
  }
`

const EmptyStateBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 10px;
  padding: 56px 24px;
`

const EmptyTitle = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EmptySub = styled.p`
  margin: 0;
  max-width: 440px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const RecoveryChipsWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
`

const RecoveryChipBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  strong {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    font-weight: 800;
  }

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const EmptyActionsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
`

const SecondaryResetBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 12px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`
