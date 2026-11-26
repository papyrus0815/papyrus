/**
 * 조약 · 국제협약 총람 (`/treaties`).
 *
 * 디자인 문법 (`/military` · `/government` 원장 총람과 통일):
 * - 상단 크롬 바: 좌측 인디고 강조 막대 + 제목 + 한 줄 핵심 집계, 우측 `통계 요약`·`시대 막대` 토글(기본 접힘) + `조약 등록`
 * - 1차 분류: 테두리·색점 없는 깔끔한 언더라인 탭(`UnderlineTabNav`) + 보기 방식(`원장 표` / `세기별 연대기`)
 * - 단일 검색·필터 바: 검색창 + 당사국 `SearchableSelect` + 무테 텍스트 필터(`유효·존속`·`파기·위반`·`만료`·`다자`) + 정렬/초기화 메뉴
 * - 원장 표: 회색 알약·색 배경 배지를 모두 걷어낸 고밀도 평문 열 표 (`treatyTypeTone`은 글자색 전용 규약 준수)
 */
import React, { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiArrowDown,
  FiArrowUp,
  FiArrowUpRight,
  FiBarChart2,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiClock,
  FiList,
  FiPlus,
  FiRotateCcw,
  FiSearch,
  FiX,
} from 'react-icons/fi'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'

import {
  MiniDonutRing,
  type SegmentSlice,
  StackedSegmentBar,
} from '@/entities/event/ui/bento-primitives'
import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  MOTION,
} from '@/entities/event/ui/ledger-tokens'
import { centuryOf } from '@/pages/events/list/lib/era-strip.lib'
import {
  type GovernmentCenturyBucket,
  type GovernmentDecadeBucket,
  type GovernmentEraSpanItem,
  GovernmentEraStrip,
} from '@/pages/government/components/government-era-strip'
import {
  TREATY_TYPE_LABELS,
  treatyApi,
  type TreatyDto,
  type TreatyType,
  treatyTypeTone,
} from '@/shared/api/treaty'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { useDocumentTitle } from '@/shared/hooks/use-document-title.hook'
import {
  formatCenturyLabel,
  getCenturyFromIso,
  parseIsoDateParts,
} from '@/shared/lib/iso-date'
import {
  parseTreatyListState,
  serializeTreatyListState,
  type TreatyListReturnState,
  type TreatyListState,
  type TreatySortKey,
} from '@/shared/lib/treaty-list-state'
import { pathKeys } from '@/shared/router'
import { ChartSkeleton } from '@/shared/ui/chart-skeleton/chart-skeleton'
import { EmptyStateSpotlight } from '@/shared/ui/empty-state/empty-state'
import {
  PopoverMenu,
  PopoverMenuDivider,
  PopoverMenuItem,
  PopoverMenuSectionLabel,
} from '@/shared/ui/popover-menu'
import { PrimaryActionButton } from '@/shared/ui/primary-action-button'
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/shared/ui/searchable-select'
import {
  UnderlineTabBadge,
  UnderlineTabButton,
  UnderlineTabNav,
} from '@/shared/ui/underline-tabs'
import {
  LedgerSearchBox,
  LedgerSearchInput,
  LedgerViewSwitch,
  LedgerViewSwitchItem,
} from '@/widgets/country/country-detail/ui/country-ledger-primitives'
import {
  TreatyCreateModal,
  TreatySectionThemeProvider,
} from '@/widgets/country/country-detail/ui/treaty-section.widget'
import {
  CountryInlineModal,
  type CountryInlineModalTarget,
  shouldInterceptEntityClick,
} from '@/widgets/country/country-inline-modal/country-inline-modal'

const UNDATED_GROUP = '__undated__'

type ValidityFilterKey = 'all' | 'active' | 'broken' | 'expired'
type CatalogViewMode = 'table' | 'century'

const CANONICAL_TYPE_ORDER: readonly TreatyType[] = [
  'PEACE',
  'ALLIANCE',
  'NON_AGGRESSION',
  'TERRITORIAL',
  'BORDER',
  'TRADE',
  'DISARMAMENT',
  'FRIENDSHIP',
  'MULTILATERAL',
  'SECRET',
  'OTHER',
]

const VALIDITY_QUICK_OPTIONS: ReadonlyArray<{
  key: ValidityFilterKey
  label: string
}> = [
  { key: 'all', label: '전체 효력' },
  { key: 'active', label: '유효·존속' },
  { key: 'broken', label: '파기·위반' },
  { key: 'expired', label: '만료' },
]

interface PartyDisplayItem {
  id: string
  polityKey: string
  name: string
  target: CountryInlineModalTarget | null
}

function extractParties(treatyItem: TreatyDto): PartyDisplayItem[] {
  const seen = new Set<string>()
  const result: PartyDisplayItem[] = []
  for (const signatory of treatyItem.signatories) {
    const modCountry = signatory.country
    const histCountry = signatory.historicalCountry
    const name = modCountry?.name?.trim() || histCountry?.name?.trim() || ''
    if (!name) continue
    const polityKey = histCountry?.id
      ? `hist:${histCountry.id}`
      : modCountry?.id
        ? `mod:${modCountry.id}`
        : `name:${name}`
    if (seen.has(polityKey)) continue
    seen.add(polityKey)
    const target: CountryInlineModalTarget | null = histCountry?.id
      ? { id: histCountry.id, kind: 'historical', name: histCountry.name }
      : modCountry?.id
        ? { id: modCountry.id, kind: 'modern', name: modCountry.name }
        : null
    result.push({
      id: signatory.id,
      polityKey,
      name,
      target,
    })
  }
  return result
}

function classifyValidity(
  treatyItem: TreatyDto,
): Exclude<ValidityFilterKey, 'all'> {
  if (parseIsoDateParts(treatyItem.violationDate)) return 'broken'
  if (parseIsoDateParts(treatyItem.expiryDate)) return 'expired'
  return 'active'
}

function formatCompactYear(yearVal: number): string {
  return yearVal < 0 ? `BC ${Math.abs(yearVal)}` : String(yearVal)
}

function formatSignDateTabular(signDate: string | null | undefined): string {
  const parts = parseIsoDateParts(signDate)
  if (!parts) return '연도 미상'
  const pad2 = (num: number) => String(num).padStart(2, '0')
  const yearStr = parts.year < 0 ? `BC ${Math.abs(parts.year)}` : String(parts.year)
  return `${yearStr}.${pad2(parts.month)}.${pad2(parts.day)}`
}

function getSignChronologyKey(treatyItem: TreatyDto): number {
  const parts = parseIsoDateParts(treatyItem.signDate)
  if (!parts) return Number.NEGATIVE_INFINITY
  return parts.year * 10000 + parts.month * 100 + parts.day
}

function shortTypeLabel(typeKey: TreatyType): string {
  return (TREATY_TYPE_LABELS[typeKey] ?? typeKey).replace(/ (조약|협정)$/, '')
}

function formatCenturyRangeLabel(centuryNum: number): string {
  if (centuryNum > 0) {
    return `${(centuryNum - 1) * 100 + 1}–${centuryNum * 100}`
  }
  const endAbs = (-centuryNum - 1) * 100 + 1
  return `BC ${-centuryNum * 100}–${endAbs}`
}

function formatCenturyChipLabel(centuryKey: string): string {
  const centuryNum = Number(centuryKey.replace(/^c:/, ''))
  if (!Number.isFinite(centuryNum)) return centuryKey
  return centuryNum < 0 ? `BC ${Math.abs(centuryNum)}세기` : `${centuryNum}세기`
}

export function TreatiesListPage() {
  useDocumentTitle('조약 · 국제협약 총람')
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const theme = useTheme()
  const isDarkMode = theme.mode === 'dark'

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['treaties', 'all'],
    queryFn: () => treatyApi.getAll(),
    staleTime: 60_000,
  })

  const [searchParams, setSearchParams] = useSearchParams()
  const listState = useMemo(
    () => parseTreatyListState(searchParams),
    [searchParams],
  )
  const { query: urlQuery, type: typeFilter, sort } = listState

  const patchListState = (patch: Partial<TreatyListState>) =>
    setSearchParams(serializeTreatyListState({ ...listState, ...patch }), {
      replace: true,
    })

  const [searchInput, setSearchInput] = useState(urlQuery)
  const debouncedSearch = useDebouncedValue(searchInput, 160)

  React.useEffect(() => {
    if (debouncedSearch !== urlQuery) {
      patchListState({ query: debouncedSearch })
    }
  }, [debouncedSearch])

  const setTypeFilter = (nextType: TreatyType | '') =>
    patchListState({ type: nextType })
  const setSort = (nextSort: TreatySortKey) =>
    patchListState({ sort: nextSort })

  const returnState: TreatyListReturnState = {
    treatyListSearch: location.search,
  }

  const [viewMode, setViewMode] = useState<CatalogViewMode>('table')
  const [countryFilter, setCountryFilter] = useState<string>('')
  const [validityFilter, setValidityFilter] =
    useState<ValidityFilterKey>('all')
  const [multilateralOnly, setMultilateralOnly] = useState<boolean>(false)
  const [activeCenturyKey, setActiveCenturyKey] = useState<string | null>(null)
  const [activeDecadeStart, setActiveDecadeStart] = useState<number | null>(
    null,
  )
  const [showInfographic, setShowInfographic] = useState<boolean>(false)
  const [showEraStrip, setShowEraStrip] = useState<boolean>(false)
  const [collapsedCenturies, setCollapsedCenturies] = useState<Set<string>>(
    new Set(),
  )
  const [createOpen, setCreateOpen] = useState<boolean>(false)
  const [countryModalTarget, setCountryModalTarget] =
    useState<CountryInlineModalTarget | null>(null)

  const allTreaties = useMemo(() => data?.items ?? [], [data])

  // 전체 KPI 및 당사국 옵션
  const { kpiMetrics, countryOptions, topPolities } = useMemo(() => {
    let activeCount = 0
    let brokenCount = 0
    let expiredCount = 0
    let multilateralCount = 0
    const countryNameCounts = new Map<string, { label: string; count: number }>()

    const bumpCountry = (label: string) => {
      const existing = countryNameCounts.get(label)
      if (existing) existing.count += 1
      else countryNameCounts.set(label, { label, count: 1 })
    }

    for (const treatyItem of allTreaties) {
      const validity = classifyValidity(treatyItem)
      if (validity === 'broken') brokenCount += 1
      else if (validity === 'expired') expiredCount += 1
      else activeCount += 1

      const parties = extractParties(treatyItem)
      if (parties.length >= 3) multilateralCount += 1

      const seenLabels = new Set<string>()
      for (const signatory of treatyItem.signatories) {
        const histLabel = signatory.historicalCountry?.name?.trim() || null
        const modLabel = signatory.country?.name?.trim() || null
        if (histLabel && !seenLabels.has(histLabel)) {
          seenLabels.add(histLabel)
          bumpCountry(histLabel)
        }
        if (modLabel && modLabel !== histLabel && !seenLabels.has(modLabel)) {
          seenLabels.add(modLabel)
          bumpCountry(modLabel)
        }
      }
    }

    const sortedOptions = [...countryNameCounts.values()].sort(
      (leftOpt, rightOpt) =>
        rightOpt.count - leftOpt.count ||
        leftOpt.label.localeCompare(rightOpt.label, 'ko'),
    )

    return {
      kpiMetrics: {
        totalCount: allTreaties.length,
        activeCount,
        brokenCount,
        expiredCount,
        endedCount: brokenCount + expiredCount,
        multilateralCount,
        polityCount: sortedOptions.length,
      },
      countryOptions: sortedOptions,
      topPolities: sortedOptions.slice(0, 5),
    }
  }, [allTreaties])

  // 시대 막대(GovernmentEraStrip) 버킷
  const eraStripData = useMemo(() => {
    const centuryCounts = new Map<number, number>()
    const decadeCounts = new Map<number, number>()
    const spans: GovernmentEraSpanItem[] = []
    let undatedCount = 0

    for (const treatyItem of allTreaties) {
      const signParts = parseIsoDateParts(treatyItem.signDate)
      if (!signParts) {
        undatedCount += 1
        continue
      }
      const signYear = signParts.year
      const cNum = centuryOf(signYear)
      centuryCounts.set(cNum, (centuryCounts.get(cNum) ?? 0) + 1)
      const decStart = Math.floor(signYear / 10) * 10
      decadeCounts.set(decStart, (decadeCounts.get(decStart) ?? 0) + 1)

      const endParts = parseIsoDateParts(
        treatyItem.violationDate ?? treatyItem.expiryDate,
      )
      if (endParts && endParts.year - signYear >= 3) {
        spans.push({
          id: treatyItem.id,
          title: treatyItem.name,
          from: signYear,
          to: endParts.year,
        })
      }
    }

    const buckets: GovernmentCenturyBucket[] = [...centuryCounts.entries()]
      .sort((leftEntry, rightEntry) => leftEntry[0] - rightEntry[0])
      .map(([century, count]) => ({
        key: `c:${century}`,
        century,
        count,
      }))

    const decadeBuckets: GovernmentDecadeBucket[] = [...decadeCounts.entries()]
      .sort((leftEntry, rightEntry) => leftEntry[0] - rightEntry[0])
      .map(([decadeStartYear, count]) => {
        const repYear = decadeStartYear === 0 ? 1 : decadeStartYear + 5
        const century = centuryOf(repYear)
        return {
          key: `d:${decadeStartYear}`,
          decadeStartYear,
          centuryKey: `c:${century}`,
          count,
        }
      })

    return { buckets, decadeBuckets, spans: spans.slice(0, 24), undatedCount }
  }, [allTreaties])

  // 유형 탭 제외 나머지 조건 일치 목록 (유형 탭 배지 숫자 정합성 유지)
  const preTypeFiltered = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase()

    return allTreaties.filter((treatyItem) => {
      if (countryFilter) {
        const matchesPolity = treatyItem.signatories.some(
          (sig) =>
            sig.country?.name?.trim() === countryFilter ||
            sig.historicalCountry?.name?.trim() === countryFilter,
        )
        if (!matchesPolity) return false
      }

      if (validityFilter !== 'all') {
        if (classifyValidity(treatyItem) !== validityFilter) return false
      }

      if (multilateralOnly) {
        if (extractParties(treatyItem).length < 3) return false
      }

      const signParts = parseIsoDateParts(treatyItem.signDate)
      if (activeDecadeStart !== null) {
        if (!signParts) return false
        if (
          signParts.year < activeDecadeStart ||
          signParts.year > activeDecadeStart + 9
        ) {
          return false
        }
      } else if (activeCenturyKey) {
        if (!signParts) return false
        if (`c:${centuryOf(signParts.year)}` !== activeCenturyKey) {
          return false
        }
      }

      if (needle) {
        const partyNames = extractParties(treatyItem)
          .map((party) => party.name)
          .join(' ')
        const haystack = [
          treatyItem.name,
          treatyItem.alias ?? '',
          treatyItem.location ?? '',
          TREATY_TYPE_LABELS[treatyItem.type] ?? '',
          partyNames,
        ]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(needle)) return false
      }

      return true
    })
  }, [
    allTreaties,
    debouncedSearch,
    countryFilter,
    validityFilter,
    multilateralOnly,
    activeCenturyKey,
    activeDecadeStart,
  ])

  const typeCounts = useMemo(() => {
    const counts = new Map<TreatyType, number>()
    for (const treatyItem of preTypeFiltered) {
      counts.set(treatyItem.type, (counts.get(treatyItem.type) ?? 0) + 1)
    }
    return counts
  }, [preTypeFiltered])

  const visibleTypeTabs = useMemo(() => {
    const allPresentTypes = new Set<TreatyType>()
    for (const treatyItem of allTreaties) {
      allPresentTypes.add(treatyItem.type)
    }
    if (typeFilter) {
      allPresentTypes.add(typeFilter)
    }
    return CANONICAL_TYPE_ORDER.filter((typeKey) =>
      allPresentTypes.has(typeKey),
    )
  }, [allTreaties, typeFilter])

  const filteredTreaties = useMemo(() => {
    const base = typeFilter
      ? preTypeFiltered.filter((treatyItem) => treatyItem.type === typeFilter)
      : preTypeFiltered

    return [...base].sort((leftItem, rightItem) => {
      if (sort === 'name') {
        return leftItem.name.localeCompare(rightItem.name, 'ko')
      }
      const leftKey = getSignChronologyKey(leftItem)
      const rightKey = getSignChronologyKey(rightItem)
      if (leftKey === rightKey) {
        return leftItem.name.localeCompare(rightItem.name, 'ko')
      }
      if (leftKey === Number.NEGATIVE_INFINITY) return 1
      if (rightKey === Number.NEGATIVE_INFINITY) return -1
      return sort === 'date-asc' ? leftKey - rightKey : rightKey - leftKey
    })
  }, [preTypeFiltered, typeFilter, sort])

  // 인포그래픽 슬라이스 (통계 요약 토글 열람용)
  const summaryStats = useMemo(() => {
    let activeCount = 0
    let expiredCount = 0
    let brokenCount = 0
    const localTypeCounts = new Map<TreatyType, number>()

    for (const treatyItem of filteredTreaties) {
      localTypeCounts.set(
        treatyItem.type,
        (localTypeCounts.get(treatyItem.type) ?? 0) + 1,
      )
      const val = classifyValidity(treatyItem)
      if (val === 'broken') brokenCount += 1
      else if (val === 'expired') expiredCount += 1
      else activeCount += 1
    }

    const typeSlices: SegmentSlice[] = CANONICAL_TYPE_ORDER.map((typeKey) => ({
      key: typeKey,
      label: shortTypeLabel(typeKey),
      value: localTypeCounts.get(typeKey) ?? 0,
      color: treatyTypeTone(typeKey, theme.mode),
    })).filter((slice) => slice.value > 0)

    const total = activeCount + expiredCount + brokenCount
    const activePct = total > 0 ? Math.round((activeCount / total) * 100) : 0

    const statusSlices: SegmentSlice[] = [
      {
        key: 'active',
        label: '유효·존속',
        value: activeCount,
        color: isDarkMode ? '#34d399' : '#059669',
        meta: `${activeCount}건 (${activePct}%)`,
      },
      {
        key: 'expired',
        label: '만료',
        value: expiredCount,
        color: isDarkMode ? '#fbbf24' : '#d97706',
        meta: `${expiredCount}건`,
      },
      {
        key: 'broken',
        label: '파기·위반',
        value: brokenCount,
        color: isDarkMode ? '#f87171' : '#dc2626',
        meta: `${brokenCount}건`,
      },
    ].filter((slice) => slice.value > 0)

    return { typeSlices, statusSlices, activePct }
  }, [filteredTreaties, theme.mode, isDarkMode])

  // 세기별 그룹 (세기별 연대기 보기용)
  const centuryChapters = useMemo(() => {
    const bucketMap = new Map<string, TreatyDto[]>()
    for (const treatyItem of filteredTreaties) {
      const centuryNum = getCenturyFromIso(treatyItem.signDate)
      const groupKey = centuryNum === null ? UNDATED_GROUP : String(centuryNum)
      const bucket = bucketMap.get(groupKey)
      if (bucket) bucket.push(treatyItem)
      else bucketMap.set(groupKey, [treatyItem])
    }

    const numericEntries = [...bucketMap.entries()]
      .filter(([groupKey]) => groupKey !== UNDATED_GROUP)
      .map(([groupKey, items]) => ({
        key: groupKey,
        century: Number(groupKey),
        label: formatCenturyLabel(Number(groupKey)),
        rangeLabel: formatCenturyRangeLabel(Number(groupKey)),
        items,
      }))
      .sort((leftGroup, rightGroup) =>
        sort === 'date-asc'
          ? leftGroup.century - rightGroup.century
          : rightGroup.century - leftGroup.century,
      )

    const undatedItems = bucketMap.get(UNDATED_GROUP)
    if (undatedItems && undatedItems.length > 0) {
      numericEntries.push({
        key: UNDATED_GROUP,
        century: 0,
        label: '서명일 미상',
        rangeLabel: '',
        items: undatedItems,
      })
    }
    return numericEntries
  }, [filteredTreaties, sort])

  const hasSecondaryFilters = Boolean(
    searchInput.trim() ||
      countryFilter ||
      validityFilter !== 'all' ||
      multilateralOnly ||
      activeCenturyKey ||
      activeDecadeStart !== null,
  )
  const hasAnyFilter = Boolean(typeFilter || hasSecondaryFilters)

  const handleResetAllFilters = () => {
    setSearchInput('')
    setCountryFilter('')
    setValidityFilter('all')
    setMultilateralOnly(false)
    setActiveCenturyKey(null)
    setActiveDecadeStart(null)
    patchListState({ query: '', type: '' })
  }

  const handleToggleSortDate = () => {
    setSort(sort === 'date-asc' ? 'date-desc' : 'date-asc')
  }

  const toggleCenturyCollapse = (chapterKey: string) => {
    setCollapsedCenturies((prev) => {
      const next = new Set(prev)
      if (next.has(chapterKey)) next.delete(chapterKey)
      else next.add(chapterKey)
      return next
    })
  }

  const openTreatyDetail = (treatyId: string) => {
    navigate(pathKeys.treaties.detail(treatyId), { state: returnState })
  }

  const renderTableRows = (rows: TreatyDto[]) =>
    rows.map((treatyItem) => {
      const validity = classifyValidity(treatyItem)
      const brokenParts = parseIsoDateParts(treatyItem.violationDate)
      const expiredParts = parseIsoDateParts(treatyItem.expiryDate)
      const statusSuffix = brokenParts
        ? `파기 ${formatCompactYear(brokenParts.year)}`
        : expiredParts
          ? `만료 ${formatCompactYear(expiredParts.year)}`
          : null

      const parties = extractParties(treatyItem)
      const visibleParties = parties.slice(0, 2)
      const extraPartyCount = Math.max(0, parties.length - visibleParties.length)
      const scaleText =
        parties.length === 2
          ? '양자'
          : parties.length >= 3
            ? `${parties.length}개국`
            : parties.length === 1
              ? '단독'
              : null

      const termCount = treatyItem.terms?.length ?? 0
      const eventCount = treatyItem.eventLinks?.length ?? 0
      const typeToneColor = treatyTypeTone(treatyItem.type, theme.mode)

      return (
        <Tr
          key={treatyItem.id}
          tabIndex={0}
          onClick={() => openTreatyDetail(treatyItem.id)}
          onKeyDown={(keyEvent) => {
            if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
              keyEvent.preventDefault()
              openTreatyDetail(treatyItem.id)
            }
          }}
        >
          <Td>
            <DateStatusCell>
              <StatusDot $validity={validity} aria-hidden />
              <DatePrimaryText>
                {formatSignDateTabular(treatyItem.signDate)}
              </DatePrimaryText>
              {statusSuffix ? (
                <StatusInlineText $validity={validity}>
                  · {statusSuffix}
                </StatusInlineText>
              ) : null}
            </DateStatusCell>
          </Td>

          <Td>
            <NamePrimaryLine>
              <NameTitleSpan>{treatyItem.name}</NameTitleSpan>
              {treatyItem.alias ? (
                <AliasInlineSpan>({treatyItem.alias})</AliasInlineSpan>
              ) : null}
              <DetailOpenIcon aria-hidden>
                <FiArrowUpRight size={13} />
              </DetailOpenIcon>
            </NamePrimaryLine>
          </Td>

          <Td>
            <TypeScaleCell>
              <TypePrimaryText $color={typeToneColor}>
                {shortTypeLabel(treatyItem.type)}
              </TypePrimaryText>
              {scaleText ? (
                <ScaleSecondaryText>· {scaleText}</ScaleSecondaryText>
              ) : null}
            </TypeScaleCell>
          </Td>

          <Td>
            {visibleParties.length > 0 ? (
              <PartiesPlainLine>
                {visibleParties.map((party, partyIndex) => (
                  <React.Fragment key={party.polityKey}>
                    {partyIndex > 0 ? (
                      <PartySep aria-hidden>·</PartySep>
                    ) : null}
                    {party.target ? (
                      <PartyPlainBtn
                        type="button"
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation()
                          if (!shouldInterceptEntityClick(clickEvent)) {
                            navigate(pathKeys.countryDetail(party.target!.id))
                            return
                          }
                          setCountryModalTarget(party.target)
                        }}
                      >
                        {party.name}
                      </PartyPlainBtn>
                    ) : (
                      <PartyPlainText>{party.name}</PartyPlainText>
                    )}
                  </React.Fragment>
                ))}
                {extraPartyCount > 0 ? (
                  <PartyOverflowSpan>외 {extraPartyCount}개국</PartyOverflowSpan>
                ) : null}
              </PartiesPlainLine>
            ) : (
              <DashText>—</DashText>
            )}
          </Td>

          <Td>
            {treatyItem.location?.trim() ? (
              <LocationPlainText title={treatyItem.location}>
                {treatyItem.location}
              </LocationPlainText>
            ) : (
              <DashText>—</DashText>
            )}
          </Td>

          <Td style={{ textAlign: 'right' }}>
            {termCount > 0 || eventCount > 0 ? (
              <RightCountsInline>
                {termCount > 0 ? (
                  <RecordCountSpan $accent>조항 {termCount}</RecordCountSpan>
                ) : null}
                {termCount > 0 && eventCount > 0 ? (
                  <PartySep aria-hidden>·</PartySep>
                ) : null}
                {eventCount > 0 ? (
                  <RecordCountSpan $accent>사건 {eventCount}</RecordCountSpan>
                ) : null}
              </RightCountsInline>
            ) : (
              <DashText>—</DashText>
            )}
          </Td>
        </Tr>
      )
    })

  const renderTableHead = () => (
    <thead>
      <tr>
        <Th style={{ width: '176px' }}>
          <SortableThBtn
            type="button"
            $active={sort === 'date-desc' || sort === 'date-asc'}
            onClick={handleToggleSortDate}
          >
            <span>서명 · 효력</span>
            {sort === 'date-asc' ? (
              <FiArrowUp size={11.5} />
            ) : sort === 'date-desc' ? (
              <FiArrowDown size={11.5} />
            ) : null}
          </SortableThBtn>
        </Th>
        <Th>
          <SortableThBtn
            type="button"
            $active={sort === 'name'}
            onClick={() => setSort(sort === 'name' ? 'date-desc' : 'name')}
          >
            <span>조약 · 협약</span>
            {sort === 'name' ? <FiArrowUp size={11.5} /> : null}
          </SortableThBtn>
        </Th>
        <Th style={{ width: '132px' }}>성격 · 규모</Th>
        <Th style={{ width: '28%' }}>서명 · 당사국</Th>
        <Th style={{ width: '19%' }}>체결 장소</Th>
        <Th style={{ width: '96px', textAlign: 'right' }}>조항 · 사건</Th>
      </tr>
    </thead>
  )

  return (
    <PageCanvas>
      <TopChromeBar>
        <TopHeadlineGroup>
          <HeadlineAccentBar aria-hidden="true" />
          <HeadlineTextStack>
            <PageTitle>조약 · 국제협약 총람</PageTitle>
            <HeadlineSummaryLine>
              <span>
                전체 조약{' '}
                <b>{kpiMetrics.totalCount.toLocaleString('ko-KR')}</b>
              </span>
              <span className="sep">·</span>
              <span className="accent">
                유효·존속{' '}
                <b>{kpiMetrics.activeCount.toLocaleString('ko-KR')}</b>
              </span>
              {kpiMetrics.endedCount > 0 ? (
                <>
                  <span className="sep">·</span>
                  <span>
                    파기·만료{' '}
                    <b>{kpiMetrics.endedCount.toLocaleString('ko-KR')}</b>
                  </span>
                </>
              ) : null}
              {kpiMetrics.polityCount > 0 ? (
                <>
                  <span className="sep">·</span>
                  <span>
                    당사 정치체{' '}
                    <b>{kpiMetrics.polityCount.toLocaleString('ko-KR')}</b>
                  </span>
                </>
              ) : null}
            </HeadlineSummaryLine>
          </HeadlineTextStack>
        </TopHeadlineGroup>

        <TopChromeActions>
          <UtilityToggleBtn
            type="button"
            $active={showInfographic}
            onClick={() => setShowInfographic((prev) => !prev)}
            title="조약 성격·효력 및 주요 당사국 통계 요약 열기"
          >
            <FiBarChart2 size={13} />
            <span>통계 요약</span>
          </UtilityToggleBtn>

          {eraStripData.buckets.length > 0 ? (
            <UtilityToggleBtn
              type="button"
              $active={
                showEraStrip ||
                Boolean(activeCenturyKey) ||
                activeDecadeStart !== null
              }
              onClick={() => setShowEraStrip((prev) => !prev)}
              title="세기·연대별 조약 체결 분포 막대 열기"
            >
              <FiCalendar size={13} />
              <span>시대 막대</span>
            </UtilityToggleBtn>
          ) : null}

          <PrimaryActionButton
            $size="md"
            icon={<FiPlus size={14} />}
            onClick={() => setCreateOpen(true)}
          >
            조약 등록
          </PrimaryActionButton>
        </TopChromeActions>
      </TopChromeBar>

      {showInfographic ? (
        <EditorialSummaryGrid aria-label="조약 총람 인포그래픽 요약">
          <EditorialSummaryCol>
            <EditorialSummaryHead>
              <EditorialSummaryTitle>
                조약 성격 · 효력 구성
                <span>
                  {filteredTreaties.length.toLocaleString('ko-KR')}건
                </span>
              </EditorialSummaryTitle>
              <SummaryMetaGroup>
                <span>
                  유효 비율 <strong>{summaryStats.activePct}%</strong>
                </span>
              </SummaryMetaGroup>
            </EditorialSummaryHead>
            {filteredTreaties.length > 0 ? (
              <SummarySplitRow>
                <MiniDonutRing
                  slices={summaryStats.typeSlices}
                  size={72}
                  strokeWidth={9}
                  centerValue={filteredTreaties.length.toLocaleString('ko-KR')}
                  centerLabel="조약"
                />
                <SummaryBarsCol>
                  <StackedSegmentBar
                    slices={summaryStats.typeSlices}
                    height={9}
                  />
                  <SummaryHairline />
                  <StackedSegmentBar
                    slices={summaryStats.statusSlices}
                    height={7}
                  />
                </SummaryBarsCol>
              </SummarySplitRow>
            ) : (
              <SummaryEmptyText>
                현재 필터 조건에 해당하는 조약이 없습니다.
              </SummaryEmptyText>
            )}
          </EditorialSummaryCol>

          <EditorialSummaryCol>
            <EditorialSummaryHead>
              <EditorialSummaryTitle>
                최다 참여 당사국 Top 5
                <span>
                  총 {kpiMetrics.polityCount.toLocaleString('ko-KR')}개 정치체
                </span>
              </EditorialSummaryTitle>
              {countryFilter ? (
                <InlineResetTextBtn
                  type="button"
                  onClick={() => setCountryFilter('')}
                >
                  국가 필터 해제
                </InlineResetTextBtn>
              ) : null}
            </EditorialSummaryHead>
            {topPolities.length > 0 ? (
              <TopPolityList>
                {topPolities.map((polityItem, index) => {
                  const maxCount = topPolities[0]?.count ?? 1
                  const widthPct = Math.max(
                    10,
                    Math.round((polityItem.count / maxCount) * 100),
                  )
                  const isSelected = countryFilter === polityItem.label
                  return (
                    <TopPolityRowBtn
                      key={polityItem.label}
                      type="button"
                      $active={isSelected}
                      onClick={() =>
                        setCountryFilter((prev) =>
                          prev === polityItem.label ? '' : polityItem.label,
                        )
                      }
                    >
                      <TopPolityRank>#{index + 1}</TopPolityRank>
                      <TopPolityName>{polityItem.label}</TopPolityName>
                      <TopPolityTrack>
                        <TopPolityFill
                          $active={isSelected || index === 0}
                          style={{ width: `${widthPct}%` }}
                        />
                      </TopPolityTrack>
                      <TopPolityCount>{polityItem.count}건</TopPolityCount>
                    </TopPolityRowBtn>
                  )
                })}
              </TopPolityList>
            ) : (
              <SummaryEmptyText>
                서명 당사국이 연결된 조약이 없습니다.
              </SummaryEmptyText>
            )}
          </EditorialSummaryCol>
        </EditorialSummaryGrid>
      ) : null}

      {(showEraStrip ||
        Boolean(activeCenturyKey) ||
        activeDecadeStart !== null) &&
      eraStripData.buckets.length > 0 ? (
        <GovernmentEraStrip
          buckets={eraStripData.buckets}
          decadeBuckets={eraStripData.decadeBuckets}
          spans={eraStripData.spans}
          activeCenturyKey={activeCenturyKey}
          onJumpToCentury={(centuryKey) => {
            setActiveDecadeStart(null)
            setActiveCenturyKey((prev) =>
              prev === centuryKey ? null : centuryKey,
            )
          }}
          onJumpToDecade={(decadeBucket) => {
            setActiveCenturyKey(decadeBucket.centuryKey)
            setActiveDecadeStart((prev) =>
              prev === decadeBucket.decadeStartYear
                ? null
                : decadeBucket.decadeStartYear,
            )
          }}
          undatedCount={eraStripData.undatedCount}
        />
      ) : null}

      <LedgerWorkspace>
        <TopTabBarRow>
          <UnderlineTabNav as="nav" aria-label="조약 성격 탭">
            <UnderlineTabButton
              type="button"
              $active={typeFilter === ''}
              onClick={() => setTypeFilter('')}
            >
              <span>전체 조약</span>
              <UnderlineTabBadge $active={typeFilter === ''}>
                {preTypeFiltered.length.toLocaleString('ko-KR')}
              </UnderlineTabBadge>
            </UnderlineTabButton>

            {visibleTypeTabs.map((typeKey) => {
              const count = typeCounts.get(typeKey) ?? 0
              const isActive = typeFilter === typeKey
              if (count === 0 && !isActive) return null
              return (
                <UnderlineTabButton
                  key={typeKey}
                  type="button"
                  $active={isActive}
                  onClick={() => setTypeFilter(isActive ? '' : typeKey)}
                >
                  <span>{shortTypeLabel(typeKey)}</span>
                  <UnderlineTabBadge $active={isActive}>
                    {count.toLocaleString('ko-KR')}
                  </UnderlineTabBadge>
                </UnderlineTabButton>
              )
            })}
          </UnderlineTabNav>

          <TabRightViewSlot>
            <LedgerViewSwitch role="group" aria-label="조약 보기 방식">
              <LedgerViewSwitchItem
                type="button"
                $active={viewMode === 'table'}
                onClick={() => setViewMode('table')}
              >
                <FiList size={13} />
                원장 표
              </LedgerViewSwitchItem>
              <LedgerViewSwitchItem
                type="button"
                $active={viewMode === 'century'}
                onClick={() => setViewMode('century')}
              >
                <FiClock size={13} />
                세기별 연대기
              </LedgerViewSwitchItem>
            </LedgerViewSwitch>
          </TabRightViewSlot>
        </TopTabBarRow>

        <CatalogControlRow>
          <ControlZoneLeft>
            <LedgerSearchBox style={{ width: 'clamp(220px, 26vw, 310px)' }}>
              <FiSearch />
              <LedgerSearchInput
                type="search"
                placeholder="조약명·별칭, 당사국, 체결 장소 검색…"
                value={searchInput}
                onChange={(evt) => setSearchInput(evt.target.value)}
                aria-label="조약 검색"
              />
              {searchInput ? (
                <ClearIconBtn
                  type="button"
                  aria-label="검색어 지우기"
                  onClick={() => {
                    setSearchInput('')
                    patchListState({ query: '' })
                  }}
                >
                  <FiX size={13} />
                </ClearIconBtn>
              ) : null}
            </LedgerSearchBox>

            <CountryPickerWrap>
              <SearchableSelect
                size="sm"
                ariaLabel="당사국 및 정치체 필터"
                clearable
                value={countryFilter}
                onChange={(nextVal) => setCountryFilter(nextVal)}
                placeholder={`전체 당사국 · 정체 (${countryOptions.length})`}
                searchPlaceholder="국가 · 역사 정치체 검색…"
                options={countryOptions.map<SearchableSelectOption>((opt) => ({
                  value: opt.label,
                  label: opt.label,
                  meta: `${opt.count}건`,
                }))}
              />
            </CountryPickerWrap>

            <QuickFilterRow role="group" aria-label="효력 및 규모 필터">
              {VALIDITY_QUICK_OPTIONS.map((opt) => (
                <QuickFilterChip
                  key={opt.key}
                  type="button"
                  $active={validityFilter === opt.key}
                  onClick={() => setValidityFilter(opt.key)}
                >
                  {opt.label}
                </QuickFilterChip>
              ))}
              {kpiMetrics.multilateralCount > 0 ? (
                <QuickFilterChip
                  type="button"
                  $active={multilateralOnly}
                  onClick={() => setMultilateralOnly((prev) => !prev)}
                >
                  다자(3개국+)
                </QuickFilterChip>
              ) : null}
            </QuickFilterRow>
          </ControlZoneLeft>

          <ControlZoneRight>
            <ResultCountMeta>
              {filteredTreaties.length === allTreaties.length ? (
                <>
                  전체{' '}
                  <strong>{allTreaties.length.toLocaleString('ko-KR')}</strong>건
                </>
              ) : (
                <>
                  표시{' '}
                  <strong>
                    {filteredTreaties.length.toLocaleString('ko-KR')}
                  </strong>{' '}
                  / {allTreaties.length.toLocaleString('ko-KR')}건
                </>
              )}
            </ResultCountMeta>

            <PopoverMenu
              ariaLabel="정렬 순서 및 필터 관리"
              title="정렬 기준 · 필터 초기화"
              minWidth={210}
              active={sort !== 'date-desc' || hasAnyFilter}
            >
              {(closeMenu) => (
                <>
                  <PopoverMenuSectionLabel>정렬 순서</PopoverMenuSectionLabel>
                  <PopoverMenuItem
                    type="button"
                    onClick={() => {
                      setSort('date-desc')
                      closeMenu()
                    }}
                  >
                    <FiArrowDown size={13} />
                    <span>서명일 최신순</span>
                    {sort === 'date-desc' ? (
                      <FiCheck size={13} style={{ marginLeft: 'auto' }} />
                    ) : null}
                  </PopoverMenuItem>
                  <PopoverMenuItem
                    type="button"
                    onClick={() => {
                      setSort('date-asc')
                      closeMenu()
                    }}
                  >
                    <FiArrowUp size={13} />
                    <span>서명일 오래된순</span>
                    {sort === 'date-asc' ? (
                      <FiCheck size={13} style={{ marginLeft: 'auto' }} />
                    ) : null}
                  </PopoverMenuItem>
                  <PopoverMenuItem
                    type="button"
                    onClick={() => {
                      setSort('name')
                      closeMenu()
                    }}
                  >
                    <FiList size={13} />
                    <span>조약명 가나다순</span>
                    {sort === 'name' ? (
                      <FiCheck size={13} style={{ marginLeft: 'auto' }} />
                    ) : null}
                  </PopoverMenuItem>

                  {hasAnyFilter ? (
                    <>
                      <PopoverMenuDivider />
                      <PopoverMenuItem
                        type="button"
                        onClick={() => {
                          handleResetAllFilters()
                          closeMenu()
                        }}
                      >
                        <FiRotateCcw size={13} />
                        <span>모든 필터 초기화</span>
                      </PopoverMenuItem>
                    </>
                  ) : null}
                </>
              )}
            </PopoverMenu>
          </ControlZoneRight>
        </CatalogControlRow>

        {hasSecondaryFilters ? (
          <ActiveFilterBar>
            {countryFilter ? (
              <ActiveFilterPill
                type="button"
                onClick={() => setCountryFilter('')}
              >
                <span>당사국: {countryFilter}</span>
                <FiX size={11} />
              </ActiveFilterPill>
            ) : null}
            {validityFilter !== 'all' ? (
              <ActiveFilterPill
                type="button"
                onClick={() => setValidityFilter('all')}
              >
                <span>
                  효력:{' '}
                  {
                    VALIDITY_QUICK_OPTIONS.find(
                      (item) => item.key === validityFilter,
                    )?.label
                  }
                </span>
                <FiX size={11} />
              </ActiveFilterPill>
            ) : null}
            {multilateralOnly ? (
              <ActiveFilterPill
                type="button"
                onClick={() => setMultilateralOnly(false)}
              >
                <span>규모: 다자(3개국+)</span>
                <FiX size={11} />
              </ActiveFilterPill>
            ) : null}
            {activeCenturyKey ? (
              <ActiveFilterPill
                type="button"
                onClick={() => {
                  setActiveCenturyKey(null)
                  setActiveDecadeStart(null)
                }}
              >
                <span>세기: {formatCenturyChipLabel(activeCenturyKey)}</span>
                <FiX size={11} />
              </ActiveFilterPill>
            ) : null}
            {activeDecadeStart !== null ? (
              <ActiveFilterPill
                type="button"
                onClick={() => setActiveDecadeStart(null)}
              >
                <span>연대: {activeDecadeStart}년대</span>
                <FiX size={11} />
              </ActiveFilterPill>
            ) : null}

            <ResetAllInlineBtn type="button" onClick={handleResetAllFilters}>
              <FiRotateCcw size={11} />
              <span>초기화</span>
            </ResetAllInlineBtn>
          </ActiveFilterBar>
        ) : null}

        <LedgerSurfacePanel>
          {isLoading ? (
            <div style={{ padding: '24px 0' }}>
              <ChartSkeleton variant="bars" rows={8} />
            </div>
          ) : isError ? (
            <EmptyStateSpotlight
              title="조약 목록을 불러오지 못했습니다"
              description="네트워크 연결 또는 서버 상태를 확인한 뒤 다시 시도해 주세요."
              actions={
                <UtilityToggleBtn type="button" onClick={() => void refetch()}>
                  다시 불러오기
                </UtilityToggleBtn>
              }
            />
          ) : allTreaties.length === 0 ? (
            <EmptyStateSpotlight
              title="등록된 조약이 없습니다"
              description="강화·동맹·불가침·무역 협정 등 역사적 조약을 등록하면 시대·당사국별로 정리됩니다."
              actions={
                <PrimaryActionButton
                  $size="md"
                  icon={<FiPlus size={14} />}
                  onClick={() => setCreateOpen(true)}
                >
                  첫 조약 등록
                </PrimaryActionButton>
              }
            />
          ) : filteredTreaties.length === 0 ? (
            <EmptyStateSpotlight
              title="조건에 일치하는 조약이 없습니다"
              description="검색어나 선택한 당사국·효력 필터를 완화해 보세요."
              actions={
                <UtilityToggleBtn type="button" onClick={handleResetAllFilters}>
                  <FiRotateCcw size={12.5} />
                  <span>필터 모두 초기화</span>
                </UtilityToggleBtn>
              }
            />
          ) : viewMode === 'table' ? (
            <TableScrollArea>
              <LedgerTable aria-label="조약 총람 원장 표">
                {renderTableHead()}
                <tbody>{renderTableRows(filteredTreaties)}</tbody>
              </LedgerTable>
            </TableScrollArea>
          ) : (
            <CenturyGroupStack>
              {centuryChapters.map((chapter) => {
                const isCollapsed = collapsedCenturies.has(chapter.key)
                return (
                  <CenturyChapterBlock key={chapter.key}>
                    <CenturyBandRow>
                      <CenturyBandToggle
                        type="button"
                        onClick={() => toggleCenturyCollapse(chapter.key)}
                      >
                        {isCollapsed ? (
                          <FiChevronRight size={14} />
                        ) : (
                          <FiChevronDown size={14} />
                        )}
                        <strong>{chapter.label}</strong>
                        {chapter.rangeLabel ? (
                          <CenturyRangeMeta>
                            {chapter.rangeLabel}
                          </CenturyRangeMeta>
                        ) : null}
                        <CenturyBandCount>
                          {chapter.items.length}건
                        </CenturyBandCount>
                      </CenturyBandToggle>
                    </CenturyBandRow>
                    {!isCollapsed ? (
                      <TableScrollArea>
                        <LedgerTable
                          aria-label={`${chapter.label} 체결 조약 표`}
                        >
                          {renderTableHead()}
                          <tbody>{renderTableRows(chapter.items)}</tbody>
                        </LedgerTable>
                      </TableScrollArea>
                    ) : null}
                  </CenturyChapterBlock>
                )
              })}
            </CenturyGroupStack>
          )}
        </LedgerSurfacePanel>
      </LedgerWorkspace>

      {createOpen &&
        createPortal(
          <TreatySectionThemeProvider>
            <TreatyCreateModal
              onClose={() => setCreateOpen(false)}
              onCreated={(createdId) => {
                setCreateOpen(false)
                void queryClient.invalidateQueries({ queryKey: ['treaties'] })
                navigate(pathKeys.treaties.detail(createdId), {
                  state: returnState,
                })
              }}
              onCreatedAndContinue={() => {
                void queryClient.invalidateQueries({ queryKey: ['treaties'] })
              }}
            />
          </TreatySectionThemeProvider>,
          document.body,
        )}

      <CountryInlineModal
        target={countryModalTarget}
        onClose={() => setCountryModalTarget(null)}
      />
    </PageCanvas>
  )
}

export default TreatiesListPage

// ── 스타일 (군사·정부 총람 원장 규격 통일) ──────────────────────────────────

const PageCanvas = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  max-width: 1480px;
  margin: 0 auto;
  padding: 24px clamp(20px, 2.8vw, 36px) 84px;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 16px 16px 72px;
    gap: 14px;
  }
`

const TopChromeBar = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 20px;
`

const TopHeadlineGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`

const HeadlineAccentBar = styled.span`
  width: 3.5px;
  height: 36px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  flex-shrink: 0;
`

const HeadlineTextStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`

const PageTitle = styled.h1`
  margin: 0;
  font-size: clamp(20px, 1.9vw, 23px);
  font-weight: 850;
  letter-spacing: -0.028em;
  line-height: 1.2;
  color: ${({ theme }) => theme.colors.text.primary};
`

const HeadlineSummaryLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px 8px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}

  b {
    font-weight: 750;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  .accent b {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }

  .sep {
    opacity: 0.55;
  }
`

const TopChromeActions = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: auto;
`

const UtilityToggleBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 11px;
  border-radius: 7px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active
        ? ledgerAccentBorder(theme.mode)
        : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font: inherit;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  cursor: pointer;
  white-space: nowrap;
  transition:
    background ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease,
    color ${MOTION.fast} ease;

  &:hover {
    color: ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
    background: ${({ theme, $active }) =>
      $active ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
  }
`

const EditorialSummaryGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: 6px 0 22px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  > *:first-child {
    padding-right: 32px;
  }

  > *:nth-child(2) {
    padding-left: 32px;
    border-left: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  }

  @media (max-width: 960px) {
    grid-template-columns: 1fr;

    > *:first-child {
      padding-right: 0;
    }

    > *:nth-child(2) {
      padding-left: 0;
      border-left: none;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
    }
  }
`

const EditorialSummaryCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
`

const EditorialSummaryHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px 12px;
`

const EditorialSummaryTitle = styled.h2`
  margin: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  font-size: 15.5px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};

  span {
    font-size: 12px;
    font-weight: 600;
    ${DIGIT_DISPLAY}
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const SummaryMetaGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 700;
    ${DIGIT_DISPLAY}
  }
`

const SummarySplitRow = styled.div`
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 0;
`

const SummaryBarsCol = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const SummaryHairline = styled.div`
  height: 1px;
  background: ${({ theme }) => ledgerHairline(theme.mode)};
`

const SummaryEmptyText = styled.p`
  margin: 0;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const InlineResetTextBtn = styled.button`
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const TopPolityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const TopPolityRowBtn = styled.button<{ $active: boolean }>`
  display: grid;
  grid-template-columns: 24px minmax(110px, 160px) 1fr 44px;
  align-items: center;
  gap: 10px;
  padding: 4px 6px;
  border: none;
  border-radius: 6px;
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
  }
`

const TopPolityRank = styled.span`
  font-size: 11px;
  font-weight: 700;
  ${DIGIT_DISPLAY}
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const TopPolityName = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const TopPolityTrack = styled.span`
  height: 5px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerHairline(theme.mode)};
  overflow: hidden;
`

const TopPolityFill = styled.span<{ $active: boolean }>`
  display: block;
  height: 100%;
  border-radius: 999px;
  background: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
  opacity: ${({ $active }) => ($active ? 0.9 : 0.45)};
`

const TopPolityCount = styled.span`
  font-size: 12px;
  font-weight: 650;
  ${DIGIT_DISPLAY}
  text-align: right;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const LedgerWorkspace = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`

const TopTabBarRow = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};

  ${UnderlineTabNav} {
    width: auto;
    flex: 1 1 auto;
    min-width: 0;
    margin-bottom: 0;
    border-bottom: none;
  }
`

const TabRightViewSlot = styled.div`
  display: inline-flex;
  align-items: center;
  padding-bottom: 7px;
  margin-left: auto;
`

const CatalogControlRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 14px;
  padding: 11px 0;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const ControlZoneLeft = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
  flex: 1 1 340px;
`

const CountryPickerWrap = styled.div`
  width: 216px;
  min-width: 174px;
`

const QuickFilterRow = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 3px;
  padding-left: 2px;
`

const QuickFilterChip = styled.button<{ $active: boolean }>`
  height: 28px;
  padding: 0 9px;
  border: none;
  border-radius: 6px;
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font: inherit;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  cursor: pointer;
  white-space: nowrap;
  transition:
    background ${MOTION.fast} ease,
    color ${MOTION.fast} ease;

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
    color: ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
  }
`

const ClearIconBtn = styled.button`
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

const ControlZoneRight = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: auto;
`

const ResultCountMeta = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
  white-space: nowrap;

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const ActiveFilterBar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 0;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const ActiveFilterPill = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
`

const ResetAllInlineBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const LedgerSurfacePanel = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`

const TableScrollArea = styled.div`
  overflow-x: auto;
`

const LedgerTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
`

const Th = styled.th`
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 9px 10px;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  white-space: nowrap;

  &:first-child {
    padding-left: 4px;
  }

  &:last-child {
    padding-right: 4px;
  }
`

const SortableThBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Tr = styled.tr`
  cursor: pointer;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  transition: background 0.12s ease;

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
  }
`

const Td = styled.td`
  padding: 11.5px 10px;
  vertical-align: middle;
  font-size: 13px;

  &:first-child {
    padding-left: 4px;
  }

  &:last-child {
    padding-right: 4px;
  }
`

const DateStatusCell = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
`

const StatusDot = styled.span<{
  $validity: Exclude<ValidityFilterKey, 'all'>
}>`
  width: 6px;
  height: 6px;
  border-radius: 999px;
  flex-shrink: 0;
  background: ${({ $validity }) =>
    $validity === 'broken'
      ? '#ef4444'
      : $validity === 'expired'
        ? '#d97706'
        : '#10b981'};
  opacity: ${({ $validity }) => ($validity === 'active' ? 0.8 : 0.9)};
`

const DatePrimaryText = styled.span`
  font-size: 12.5px;
  ${DIGIT_DISPLAY}
  color: ${({ theme }) => theme.colors.text.secondary};
`

const StatusInlineText = styled.span<{
  $validity: Exclude<ValidityFilterKey, 'all'>
}>`
  font-size: 11.5px;
  font-weight: 600;
  ${DIGIT_DISPLAY}
  color: ${({ theme, $validity }) =>
    $validity === 'broken'
      ? theme.mode === 'dark'
        ? '#fca5a5'
        : '#b91c1c'
      : $validity === 'expired'
        ? theme.mode === 'dark'
          ? '#fcd34d'
          : '#b45309'
        : theme.colors.text.tertiary};
`

const NamePrimaryLine = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
  line-height: 1.38;
`

const NameTitleSpan = styled.span`
  font-size: 13.5px;
  font-weight: 720;
  color: ${({ theme }) => theme.colors.text.primary};
  transition: color 0.12s ease;

  ${Tr}:hover & {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const AliasInlineSpan = styled.span`
  font-size: 12px;
  font-weight: 450;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const DetailOpenIcon = styled.span`
  display: inline-flex;
  align-items: center;
  opacity: 0;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;

  ${Tr}:hover & {
    opacity: 0.9;
    transform: translate(1px, -1px);
  }
`

const TypeScaleCell = styled.div`
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
`

const TypePrimaryText = styled.span<{ $color: string }>`
  font-size: 12.5px;
  font-weight: 650;
  color: ${({ $color }) => $color};
`

const ScaleSecondaryText = styled.span`
  font-size: 12px;
  font-weight: 500;
  ${DIGIT_DISPLAY}
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PartiesPlainLine = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0 5px;
  min-width: 0;
  line-height: 1.4;
`

const PartyPlainBtn = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  font-weight: 550;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  max-width: 190px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const PartyPlainText = styled.span`
  font-size: 12.5px;
  font-weight: 550;
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 190px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const PartySep = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  opacity: 0.65;
`

const PartyOverflowSpan = styled.span`
  font-size: 11.5px;
  font-weight: 550;
  ${DIGIT_DISPLAY}
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`

const LocationPlainText = styled.span`
  display: block;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const DashText = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  opacity: 0.65;
`

const RightCountsInline = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  white-space: nowrap;
`

const RecordCountSpan = styled.span<{ $accent?: boolean }>`
  font-size: 11.5px;
  font-weight: ${({ $accent }) => ($accent ? 650 : 500)};
  ${DIGIT_DISPLAY}
  color: ${({ theme, $accent }) =>
    $accent ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
`

const CenturyGroupStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-top: 8px;
`

const CenturyChapterBlock = styled.section`
  display: flex;
  flex-direction: column;
`

const CenturyBandRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 4px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const CenturyBandToggle = styled.button`
  display: inline-flex;
  align-items: baseline;
  gap: 7px;
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 14px;
  cursor: pointer;

  strong {
    font-weight: 800;
    letter-spacing: -0.015em;
  }

  svg {
    align-self: center;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const CenturyRangeMeta = styled.span`
  font-size: 12px;
  ${DIGIT_DISPLAY}
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CenturyBandCount = styled.span`
  font-size: 12px;
  font-weight: 650;
  ${DIGIT_DISPLAY}
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`
