import { CountryTabEmptyState } from './country-tab-empty-state'
import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiArrowDown,
  FiArrowUp,
  FiArrowUpRight,
  FiBarChart2,
  FiCheck,
  FiChevronLeft,
  FiEdit2,
  FiExternalLink,
  FiFileText,
  FiGlobe,
  FiImage,
  FiLink,
  FiList,
  FiMapPin,
  FiPieChart,
  FiPlus,
  FiRotateCcw,
  FiSearch,
  FiTrash2,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { Link, useNavigate } from 'react-router-dom'
import styled, { ThemeProvider, keyframes, useTheme } from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { useHistoricalCountriesByModernCountry } from '@/features/country/api/use-historical-countries-by-modern-country.hook'
import {
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
  ledgerSubtleFill,
  MOTION,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { getApiConnection } from '@/shared/api/client'
import { getEventById } from '@/shared/api/events'
import { getCountryOrganizationMemberships } from '@/shared/api/organizations'
import {
  type AddTreatyImageDto,
  TREATY_EVENT_LINK_LABELS,
  TREATY_PARTICIPATION_LABELS,
  TREATY_TYPE_LABELS,
  type TreatyDto,
  type TreatyEventLinkType,
  type TreatyEventLinkWithEventDto,
  type TreatySignatoryDto,
  type TreatyType,
  treatyApi,
  treatyTypeTone,
} from '@/shared/api/treaty'
import { uploadImage } from '@/shared/api/upload'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import { parseIsoDateParts } from '@/shared/lib/iso-date'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { richTextToMultilineText } from '@/shared/lib/rich-text-plain'
import {
  isLikelyRichTextHtml,
  isVisuallyEmptyRichText,
} from '@/shared/lib/rich-text-read-view'
import { pathKeys } from '@/shared/router'
import { getTreatySectionPalette } from '@/shared/styles/country-detail-palette'
import { useThemeStore } from '@/shared/styles/theme.store'
import { ChartSkeleton } from '@/shared/ui/chart-skeleton/chart-skeleton'
import { confirm } from '@/shared/ui/confirm-dialog'
import {
  PopoverMenu,
  PopoverMenuDivider,
  PopoverMenuItem,
  PopoverMenuSectionLabel,
} from '@/shared/ui/popover-menu'
import { PrimaryActionButton } from '@/shared/ui/primary-action-button'
import { RichTextProseWithEntityClicks } from '@/shared/ui/rich-text-read-view'
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/shared/ui/searchable-select'
import { notify } from '@/shared/ui/toast'
import {
  UnderlineTabBadge,
  UnderlineTabButton,
  UnderlineTabNav,
} from '@/shared/ui/underline-tabs'
import {
  CountryInlineModal,
  type CountryInlineModalTarget,
  shouldInterceptEntityClick,
} from '@/widgets/country/country-inline-modal'
import { PersonInlineModal } from '@/widgets/person/person-inline-modal/person-inline-modal'

import { CountryInternationalOrgsSection } from './country-international-orgs-section'
import {
  countryTabCanvasPadding,
  LedgerSearchBox,
  LedgerSearchInput,
  LedgerToolbarButton,
  LedgerViewSwitch,
  LedgerViewSwitchItem,
} from './country-ledger-primitives'
import {
  BentoCard,
  BentoCardBadge,
  BentoCardBody,
  BentoCardHeader,
  BentoCardTitle,
  BentoCardTitleGroup,
} from './dashboard-infographic/bento-primitives'
import * as TD from './treaty-detail.styles'
import {
  TreatyCreateModal,
  TreatyEditModal,
  TreatyEventLinkModal,
  TreatySignatoryFormModal,
  TreatyTermFormModal,
} from './treaty-form-modal'

export { TreatyCreateModal }

const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`

type TreatyStatusKey = 'all' | 'active' | 'expired' | 'violated'
type TreatySortKey = 'dateDesc' | 'dateAsc' | 'partiesDesc' | 'nameAsc'

// ──────────────────────────────────────────────
// 날짜 · 세기 · 상태 헬퍼
// ──────────────────────────────────────────────

function formatYear(year: number): string {
  return year < 0 ? `기원전 ${-year}` : String(year)
}

function formatCompactYear(year: number): string {
  return year < 0 ? `BC ${-year}` : String(year)
}

function formatCenturyLabelFromIndex(centuryIdx: number): string {
  return centuryIdx > 0
    ? `${centuryIdx}세기`
    : `BC ${Math.abs(centuryIdx)}세기`
}

function getTreatyCenturyIndex(iso: string | null | undefined): number | null {
  const parts = parseIsoDateParts(iso)
  if (!parts || parts.year === 0) return null
  return parts.year > 0
    ? Math.ceil(parts.year / 100)
    : -Math.ceil(Math.abs(parts.year) / 100)
}

function getTreatySortDateKey(iso: string | null | undefined): number {
  const parts = parseIsoDateParts(iso)
  if (!parts) return Number.MIN_SAFE_INTEGER
  return parts.year * 10000 + parts.month * 100 + parts.day
}

function classifyTreatyStatus(
  treatyItem: TreatyDto,
  curY: number,
  curM: number,
  curD: number,
): Exclude<TreatyStatusKey, 'all'> {
  if (treatyItem.violationDate) return 'violated'
  if (treatyItem.expiryDate) {
    const expParts = parseIsoDateParts(treatyItem.expiryDate)
    if (
      expParts &&
      (expParts.year < curY ||
        (expParts.year === curY && expParts.month < curM) ||
        (expParts.year === curY &&
          expParts.month === curM &&
          expParts.day < curD))
    ) {
      return 'expired'
    }
  }
  return 'active'
}

function eventYearLabel(
  event: NonNullable<TreatyEventLinkWithEventDto['event']>,
): string | null {
  if (event.startYear !== null && event.startYear !== undefined) {
    return formatYear(
      event.startEra === 'BC' ? -event.startYear : event.startYear,
    )
  }
  const parts = parseIsoDateParts(event.startDate)
  return parts ? formatYear(parts.year) : null
}

const EVENT_LINK_ORDER: Record<TreatyEventLinkType, number> = {
  SIGNING: 0,
  RATIFICATION: 1,
  VIOLATION: 2,
  RELATED: 3,
}

function SignatoryNote({ note }: { note: string }) {
  const cleanNote = useMemo(() => richTextToMultilineText(note), [note])
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    const element = textRef.current
    if (!element || expanded) return undefined
    const measure = () =>
      setOverflowing(element.scrollHeight > element.clientHeight + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [cleanNote, expanded])

  if (!cleanNote) return null

  return (
    <TD.PartyNote>
      <TD.PartyNoteText ref={textRef} $expanded={expanded}>
        {cleanNote}
      </TD.PartyNoteText>
      {(overflowing || expanded) && (
        <TD.NoteToggle
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((previous) => !previous)}
        >
          {expanded ? '접기' : '더 보기'}
        </TD.NoteToggle>
      )}
    </TD.PartyNote>
  )
}

function fmtDate(value: string | null | undefined) {
  if (!value) return '—'
  const parts = parseIsoDateParts(value)
  if (!parts) return value
  const yearText =
    parts.year < 0 ? `기원전 ${-parts.year}년` : `${parts.year}년`
  return `${yearText} ${parts.month}월 ${parts.day}일`
}

// ──────────────────────────────────────────────
// Main Widget
// ──────────────────────────────────────────────

interface TreatySectionProps {
  country: UnifiedCountry
}

export const TreatySectionWidget: React.FC<TreatySectionProps> = ({
  country,
}) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const countryId = country.type === 'modern' ? country.id : undefined
  const historicalCountryId =
    country.type === 'historical' ? country.id : undefined

  const { data: linkedHistList = [] } = useHistoricalCountriesByModernCountry(
    countryId ?? '',
  )

  const selfHistoricalIdSet = useMemo(() => {
    const idSet = new Set<string>()
    if (historicalCountryId) idSet.add(historicalCountryId)
    for (const histItem of country.historicalCountries ?? []) {
      if (histItem.id) idSet.add(histItem.id)
    }
    for (const histItem of linkedHistList) {
      if (histItem.id) idSet.add(histItem.id)
    }
    return idSet
  }, [historicalCountryId, country.historicalCountries, linkedHistList])

  const isSelfSignatory = useCallback(
    (sig: TreatySignatoryDto): boolean => {
      if (countryId && sig.country?.id === countryId) return true
      if (sig.historicalCountry?.id && selfHistoricalIdSet.has(sig.historicalCountry.id)) {
        return true
      }
      const sigName = sig.country?.name ?? sig.historicalCountry?.name ?? ''
      return Boolean(sigName && sigName === country.name)
    },
    [countryId, selfHistoricalIdSet, country.name],
  )

  const { data: treaties = [], isLoading } = useQuery({
    queryKey: ['treaties', countryId, historicalCountryId],
    queryFn: async () => {
      const response = await treatyApi.getAll({
        countryId,
        historicalCountryId,
      })
      return response.items
    },
    enabled: !!(countryId || historicalCountryId),
  })

  const [detailId, setDetailId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [subDomain, setSubDomain] = useState<'treaties' | 'orgs'>('treaties')
  const [showInfographic, setShowInfographic] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TreatyType | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<TreatyStatusKey>('all')
  const [centuryFilter, setCenturyFilter] = useState<number | null>(null)
  const [partnerFilterKey, setPartnerFilterKey] = useState<string>('')
  const [sortBy, setSortBy] = useState<TreatySortKey>('dateDesc')
  const [inlineCountryTarget, setInlineCountryTarget] =
    useState<CountryInlineModalTarget | null>(null)

  const orgMembershipsQuery = useQuery({
    queryKey: ['country-org-memberships', countryId, historicalCountryId],
    queryFn: () =>
      getCountryOrganizationMemberships(getApiConnection(), {
        countryId,
        historicalCountryId,
      }),
    enabled: Boolean(countryId || historicalCountryId),
    staleTime: 60_000,
  })

  const orgMembershipCount = useMemo(
    () =>
      (orgMembershipsQuery.data ?? []).filter(
        (member) => member.organization.type !== 'COMPANY',
      ).length,
    [orgMembershipsQuery.data],
  )

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ['treaties'],
    })
    void queryClient.invalidateQueries({
      queryKey: ['treaties-by-country'],
    })
    if (detailId) {
      void queryClient.invalidateQueries({ queryKey: ['treaty', detailId] })
    }
  }, [queryClient, detailId])

  const parentTheme = useTheme()
  const { mode } = useThemeStore()
  const isDarkMode = mode === 'dark'
  const treatyPalette = getTreatySectionPalette(isDarkMode)
  const treatyTheme = useMemo(
    () => ({ ...parentTheme, ts: treatyPalette }),
    [parentTheme, treatyPalette],
  )

  const distinctTypeCount = useMemo(() => {
    const typeSet = new Set<string>()
    for (const treatyItem of treaties) {
      if (treatyItem.type) typeSet.add(treatyItem.type)
    }
    return typeSet.size
  }, [treaties])

  const typeChipItems = useMemo(() => {
    const counts = new Map<TreatyType, number>()
    for (const treatyItem of treaties) {
      counts.set(treatyItem.type, (counts.get(treatyItem.type) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .map(([typeKey, count]) => ({
        typeKey,
        label: TREATY_TYPE_LABELS[typeKey] ?? typeKey,
        shortLabel: (TREATY_TYPE_LABELS[typeKey] ?? typeKey).replace(
          / (조약|협정)$/,
          '',
        ),
        color: treatyTypeTone(typeKey, mode),
        count,
      }))
  }, [treaties, mode])

  const { treatyInfographic, partnerOptions } = useMemo(() => {
    const typeSlices: SegmentSlice[] = typeChipItems.map((item) => ({
      key: item.typeKey,
      label: item.shortLabel,
      value: item.count,
      color: item.color,
      meta: `${item.count}건`,
    }))

    const now = new Date()
    const curY = now.getUTCFullYear()
    const curM = now.getUTCMonth() + 1
    const curD = now.getUTCDate()

    let violatedCount = 0
    let expiredCount = 0
    let activeCount = 0
    const centuryCounts = new Map<number, number>()

    for (const item of treaties) {
      const status = classifyTreatyStatus(item, curY, curM, curD)
      if (status === 'violated') violatedCount += 1
      else if (status === 'expired') expiredCount += 1
      else activeCount += 1

      const cIdx = getTreatyCenturyIndex(item.signDate)
      if (cIdx != null) {
        centuryCounts.set(cIdx, (centuryCounts.get(cIdx) ?? 0) + 1)
      }
    }

    const activePct =
      treaties.length > 0
        ? Math.round((activeCount / treaties.length) * 100)
        : 0

    const statusSlices: SegmentSlice[] = [
      ...(activeCount > 0
        ? [
            {
              key: 'active',
              label: '유효·이행',
              value: activeCount,
              color: isDarkMode ? '#34d399' : '#059669',
              meta: `${activeCount}건`,
            },
          ]
        : []),
      ...(expiredCount > 0
        ? [
            {
              key: 'expired',
              label: '만료',
              value: expiredCount,
              color: isDarkMode ? '#fbbf24' : '#d97706',
              meta: `${expiredCount}건`,
            },
          ]
        : []),
      ...(violatedCount > 0
        ? [
            {
              key: 'violated',
              label: '파기·위반',
              value: violatedCount,
              color: isDarkMode ? '#f87171' : '#dc2626',
              meta: `${violatedCount}건`,
            },
          ]
        : []),
    ]

    const centuryBuckets = [...centuryCounts.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([century, count]) => ({
        key: String(century),
        century,
        label: formatCenturyLabelFromIndex(century),
        shortLabel:
          century > 0 ? `${century}세기` : `BC${Math.abs(century)}`,
        count,
      }))
    const maxCenturyCount = centuryBuckets.reduce(
      (acc, cur) => Math.max(acc, cur.count),
      0,
    )
    const peakCentury =
      centuryBuckets.length > 0
        ? [...centuryBuckets].sort((left, right) => right.count - left.count)[0]
        : null

    const partnerCounts = new Map<
      string,
      { key: string; name: string; flagEmoji: string; count: number }
    >()
    for (const treatyItem of treaties) {
      const seenInTreaty = new Set<string>()
      for (const sig of treatyItem.signatories) {
        const sigCountryId = sig.country?.id
        const sigHistId = sig.historicalCountry?.id
        const sigName =
          sig.country?.name ?? sig.historicalCountry?.name ?? ''
        if (!sigName) continue
        if (isSelfSignatory(sig)) continue

        const partnerKey = sigCountryId
          ? `c:${sigCountryId}`
          : sigHistId
            ? `h:${sigHistId}`
            : `n:${sigName}`
        if (seenInTreaty.has(partnerKey)) continue
        seenInTreaty.add(partnerKey)

        const prev = partnerCounts.get(partnerKey)
        if (prev) {
          prev.count += 1
        } else {
          partnerCounts.set(partnerKey, {
            key: partnerKey,
            name: sigName,
            flagEmoji: sig.country?.flagEmoji ?? '',
            count: 1,
          })
        }
      }
    }

    const sortedPartners = [...partnerCounts.values()].sort((left, right) => {
      if (left.count !== right.count) return right.count - left.count
      return left.name.localeCompare(right.name, 'ko')
    })
    const topPartners = sortedPartners.slice(0, 5)
    const maxPartnerCount = topPartners[0]?.count ?? 0

    return {
      treatyInfographic: {
        typeSlices,
        statusSlices,
        activeCount,
        expiredCount,
        violatedCount,
        activePct,
        centuryBuckets,
        maxCenturyCount,
        peakCentury,
        topPartners,
        maxPartnerCount,
        totalPartnerCount: sortedPartners.length,
      },
      partnerOptions: sortedPartners,
    }
  }, [treaties, typeChipItems, isDarkMode, isSelfSignatory])

  const selectedPartnerName = useMemo(
    () =>
      partnerOptions.find((opt) => opt.key === partnerFilterKey)?.name ?? null,
    [partnerOptions, partnerFilterKey],
  )

  const preTypeFilteredTreaties = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase()
    const now = new Date()
    const curY = now.getUTCFullYear()
    const curM = now.getUTCMonth() + 1
    const curD = now.getUTCDate()

    return treaties.filter((treatyItem) => {
      if (statusFilter !== 'all') {
        const itemStatus = classifyTreatyStatus(treatyItem, curY, curM, curD)
        if (itemStatus !== statusFilter) return false
      }
      if (centuryFilter != null) {
        if (getTreatyCenturyIndex(treatyItem.signDate) !== centuryFilter) {
          return false
        }
      }
      if (partnerFilterKey) {
        const matchedPartner = treatyItem.signatories.some((sig) => {
          const sigCountryId = sig.country?.id
          const sigHistId = sig.historicalCountry?.id
          const sigName =
            sig.country?.name ?? sig.historicalCountry?.name ?? ''
          const candKey = sigCountryId
            ? `c:${sigCountryId}`
            : sigHistId
              ? `h:${sigHistId}`
              : `n:${sigName}`
          return candKey === partnerFilterKey
        })
        if (!matchedPartner) return false
      }
      if (!keyword) return true
      const signatoryNames = treatyItem.signatories
        .map(
          (signatory) =>
            signatory.country?.name ?? signatory.historicalCountry?.name ?? '',
        )
        .join(' ')
      return [
        treatyItem.name,
        treatyItem.alias,
        treatyItem.location,
        TREATY_TYPE_LABELS[treatyItem.type],
        signatoryNames,
      ].some((field) => field?.toLowerCase().includes(keyword))
    })
  }, [treaties, statusFilter, centuryFilter, partnerFilterKey, searchQuery])

  const filteredTypeCounts = useMemo(() => {
    const map = new Map<TreatyType, number>()
    for (const treatyItem of preTypeFilteredTreaties) {
      map.set(treatyItem.type, (map.get(treatyItem.type) ?? 0) + 1)
    }
    return map
  }, [preTypeFilteredTreaties])

  const filteredTreaties = useMemo(() => {
    const list =
      typeFilter === 'ALL'
        ? preTypeFilteredTreaties
        : preTypeFilteredTreaties.filter(
            (treatyItem) => treatyItem.type === typeFilter,
          )

    return [...list].sort((left, right) => {
      if (sortBy === 'dateAsc') {
        return (
          getTreatySortDateKey(left.signDate) -
          getTreatySortDateKey(right.signDate)
        )
      }
      if (sortBy === 'partiesDesc') {
        const diff = right.signatories.length - left.signatories.length
        if (diff !== 0) return diff
        return (
          getTreatySortDateKey(right.signDate) -
          getTreatySortDateKey(left.signDate)
        )
      }
      if (sortBy === 'nameAsc') {
        return left.name.localeCompare(right.name, 'ko')
      }
      return (
        getTreatySortDateKey(right.signDate) -
        getTreatySortDateKey(left.signDate)
      )
    })
  }, [preTypeFilteredTreaties, typeFilter, sortBy])

  const hasSecondaryFilter = Boolean(
    statusFilter !== 'all' ||
      centuryFilter != null ||
      partnerFilterKey ||
      searchQuery.trim().length > 0,
  )
  const hasActiveFilter = typeFilter !== 'ALL' || hasSecondaryFilter

  const resetAllFilters = useCallback(() => {
    setTypeFilter('ALL')
    setStatusFilter('all')
    setCenturyFilter(null)
    setPartnerFilterKey('')
    setSearchQuery('')
  }, [])

  const inner = detailId ? (
    <TreatyDetail
      treatyId={detailId}
      onBack={() => setDetailId(null)}
      onInvalidate={invalidate}
    />
  ) : (
    <Wrap>
      <CountryTopTabBar>
        {subDomain === 'treaties' ? (
          <UnderlineTabNav as="nav" aria-label="조약 성격 탭">
            <UnderlineTabButton
              type="button"
              $active={typeFilter === 'ALL'}
              onClick={() => setTypeFilter('ALL')}
            >
              <span>전체 조약</span>
              <UnderlineTabBadge $active={typeFilter === 'ALL'}>
                {preTypeFilteredTreaties.length.toLocaleString('ko-KR')}
              </UnderlineTabBadge>
            </UnderlineTabButton>
            {typeChipItems.map((chip) => {
              const count = filteredTypeCounts.get(chip.typeKey) ?? 0
              const isActive = typeFilter === chip.typeKey
              if (count === 0 && !isActive) return null
              return (
                <UnderlineTabButton
                  key={chip.typeKey}
                  type="button"
                  $active={isActive}
                  onClick={() =>
                    setTypeFilter(isActive ? 'ALL' : chip.typeKey)
                  }
                >
                  <span>{chip.shortLabel}</span>
                  <UnderlineTabBadge $active={isActive}>
                    {count.toLocaleString('ko-KR')}
                  </UnderlineTabBadge>
                </UnderlineTabButton>
              )
            })}
          </UnderlineTabNav>
        ) : (
          <UnderlineTabNav as="nav" aria-label="국제기구 및 협의체 탭">
            <UnderlineTabButton type="button" $active>
              <span>가입 국제기구 · 다자협의체</span>
              <UnderlineTabBadge $active>
                {orgMembershipCount.toLocaleString('ko-KR')}
              </UnderlineTabBadge>
            </UnderlineTabButton>
          </UnderlineTabNav>
        )}

        <CountryTopActions>
          <LedgerViewSwitch role="group" aria-label="외교·조약 세부 보기 전환">
            <LedgerViewSwitchItem
              type="button"
              $active={subDomain === 'treaties'}
              onClick={() => setSubDomain('treaties')}
            >
              <FiFileText size={12.5} />
              <span>조약 · 협정 ({treaties.length})</span>
            </LedgerViewSwitchItem>
            <LedgerViewSwitchItem
              type="button"
              $active={subDomain === 'orgs'}
              onClick={() => setSubDomain('orgs')}
            >
              <FiGlobe size={12.5} />
              <span>국제기구 ({orgMembershipCount})</span>
            </LedgerViewSwitchItem>
          </LedgerViewSwitch>

          {subDomain === 'treaties' ? (
            <>
              {treaties.length > 0 ? (
                <UtilityToggleBtn
                  type="button"
                  $active={showInfographic}
                  onClick={() => setShowInfographic((prev) => !prev)}
                  title="조약 유형·세기·상대국 통계 요약 열기"
                >
                  <FiBarChart2 size={13} />
                  <span>통계 요약</span>
                </UtilityToggleBtn>
              ) : null}

              <TreatySecondaryBtn
                type="button"
                onClick={() => navigate(pathKeys.treaties.list())}
              >
                <FiExternalLink size={12.5} />
                조약 총람
              </TreatySecondaryBtn>

              <PrimaryActionButton
                $size="sm"
                onClick={() => setCreateOpen(true)}
              >
                <FiPlus size={13.5} /> 조약 등록
              </PrimaryActionButton>
            </>
          ) : null}
        </CountryTopActions>
      </CountryTopTabBar>

      {subDomain === 'orgs' ? (
        <CountryInternationalOrgsSection country={country} />
      ) : (
        <>
          {showInfographic && !isLoading && treaties.length > 0 ? (
            <EditorialSummaryGrid aria-label="조약 요약 인포그래픽">
              <BentoCard>
                <BentoCardHeader style={{ paddingBottom: 14 }}>
                  <BentoCardTitleGroup>
                    <BentoCardTitle style={{ fontSize: 15.5 }}>
                      조약 성격 · 효력 구성
                    </BentoCardTitle>
                    <BentoCardBadge>
                      {distinctTypeCount}개 유형 · 유효{' '}
                      {treatyInfographic.activePct}%
                    </BentoCardBadge>
                  </BentoCardTitleGroup>
                </BentoCardHeader>
                <BentoCardBody>
                  <StackedSegmentBar
                    slices={treatyInfographic.typeSlices}
                    height={9}
                  />
                  <TreatyStatusDivider>
                    <StackedSegmentBar
                      slices={treatyInfographic.statusSlices}
                      height={6}
                    />
                  </TreatyStatusDivider>
                </BentoCardBody>
              </BentoCard>

              <BentoCard>
                <BentoCardHeader style={{ paddingBottom: 14 }}>
                  <BentoCardTitleGroup>
                    <BentoCardTitle style={{ fontSize: 15.5 }}>
                      세기별 체결 추이
                    </BentoCardTitle>
                    <BentoCardBadge>
                      {treatyInfographic.centuryBuckets.length > 0
                        ? `${treatyInfographic.centuryBuckets.length}개 세기`
                        : '연도 미집계'}
                    </BentoCardBadge>
                  </BentoCardTitleGroup>
                  {centuryFilter != null ? (
                    <InlineCardResetBtn
                      type="button"
                      onClick={() => setCenturyFilter(null)}
                    >
                      전체 세기
                    </InlineCardResetBtn>
                  ) : null}
                </BentoCardHeader>
                <BentoCardBody>
                  {treatyInfographic.centuryBuckets.length > 0 ? (
                    <>
                      <CenturyHistBars
                        role="group"
                        $compact={treatyInfographic.centuryBuckets.length <= 5}
                        aria-label="세기별 체결 조약 분포"
                      >
                        {treatyInfographic.centuryBuckets.map((bucket) => {
                          const heightPct =
                            treatyInfographic.maxCenturyCount > 0
                              ? Math.max(
                                  14,
                                  (bucket.count /
                                    treatyInfographic.maxCenturyCount) *
                                    100,
                                )
                              : 14
                          const isSelected = centuryFilter === bucket.century
                          const isPeak =
                            centuryFilter == null &&
                            treatyInfographic.peakCentury?.century ===
                              bucket.century
                          const isDimmed = centuryFilter != null && !isSelected
                          return (
                            <CenturyBarColBtn
                              key={bucket.key}
                              type="button"
                              $active={isSelected}
                              $dimmed={isDimmed}
                              onClick={() =>
                                setCenturyFilter((prev) =>
                                  prev === bucket.century
                                    ? null
                                    : bucket.century,
                                )
                              }
                            >
                              <CenturyBarCount $active={isSelected}>
                                {bucket.count}
                              </CenturyBarCount>
                              <CenturyBarTrack $active={isSelected}>
                                <CenturyBarFill
                                  $highlight={isSelected || isPeak}
                                  style={{ height: `${heightPct}%` }}
                                />
                              </CenturyBarTrack>
                              <CenturyBarAxis $active={isSelected}>
                                {bucket.shortLabel}
                              </CenturyBarAxis>
                            </CenturyBarColBtn>
                          )
                        })}
                      </CenturyHistBars>
                      <HistFooterNote>
                        {treatyInfographic.peakCentury
                          ? `최다 체결: ${treatyInfographic.peakCentury.label} (${treatyInfographic.peakCentury.count}건)`
                          : ''}
                      </HistFooterNote>
                    </>
                  ) : (
                    <TreatyPartnerEmpty>
                      조약 서명일이 등록되면 세기별 추이가 표시됩니다.
                    </TreatyPartnerEmpty>
                  )}
                </BentoCardBody>
              </BentoCard>

              <BentoCard>
                <BentoCardHeader style={{ paddingBottom: 14 }}>
                  <BentoCardTitleGroup>
                    <BentoCardTitle style={{ fontSize: 15.5 }}>
                      주요 체결 상대국 Top 5
                    </BentoCardTitle>
                    <BentoCardBadge>
                      {treatyInfographic.totalPartnerCount > 0
                        ? `상대 ${treatyInfographic.totalPartnerCount}개국`
                        : '당사국 연결 대기'}
                    </BentoCardBadge>
                  </BentoCardTitleGroup>
                  {partnerFilterKey ? (
                    <InlineCardResetBtn
                      type="button"
                      onClick={() => setPartnerFilterKey('')}
                    >
                      전체 국가
                    </InlineCardResetBtn>
                  ) : null}
                </BentoCardHeader>
                <BentoCardBody>
                  {treatyInfographic.topPartners.length > 0 ? (
                    <TreatyPartnerRows>
                      {treatyInfographic.topPartners.map((partner, idx) => {
                        const barPct =
                          treatyInfographic.maxPartnerCount > 0
                            ? Math.max(
                                10,
                                (partner.count /
                                  treatyInfographic.maxPartnerCount) *
                                  100,
                              )
                            : 10
                        const isFiltered = partnerFilterKey === partner.key
                        return (
                          <TreatyPartnerRowBtn
                            key={partner.key}
                            type="button"
                            $active={isFiltered}
                            onClick={() =>
                              setPartnerFilterKey((prev) =>
                                prev === partner.key ? '' : partner.key,
                              )
                            }
                          >
                            <TreatyPartnerRank>#{idx + 1}</TreatyPartnerRank>
                            <TreatyPartnerName title={partner.name}>
                              {partner.name}
                            </TreatyPartnerName>
                            <TreatyPartnerBarTrack>
                              <TreatyPartnerBarFill
                                $active={isFiltered || idx === 0}
                                style={{ width: `${barPct}%` }}
                              />
                            </TreatyPartnerBarTrack>
                            <TreatyPartnerCount>
                              {partner.count}건
                            </TreatyPartnerCount>
                          </TreatyPartnerRowBtn>
                        )
                      })}
                    </TreatyPartnerRows>
                  ) : (
                    <TreatyPartnerEmpty>
                      상대 당사국을 연결하면 순위가 표시됩니다.
                    </TreatyPartnerEmpty>
                  )}
                </BentoCardBody>
              </BentoCard>
            </EditorialSummaryGrid>
          ) : null}

          {isLoading ? (
            <ChartSkeleton variant="bars" rows={5} />
          ) : treaties.length === 0 ? (
            <CountryTabEmptyState
              Icon={FiFileText}
              title="아직 등록된 조약이 없습니다"
              description={`${country.name}이(가) 서명·참여한 조약의 체결일·조항·서명국을 등록합니다. 이미 있는 다자·양자 조약이면 ‘조약 총람’에서 이 국가를 당사국으로 추가하세요.`}
              actionLabel="조약 등록"
              onAction={() => setCreateOpen(true)}
              features={[
                {
                  Icon: FiPieChart,
                  title: '성격 · 효력',
                  description: '평화·동맹·통상 등 유형별 비중과 유효·만료·파기 상태',
                },
                {
                  Icon: FiBarChart2,
                  title: '세기별 추이',
                  description: '시대별 외교 협약 체결 흐름 비교',
                },
                {
                  Icon: FiUsers,
                  title: '체결 상대국',
                  description: '가장 많이 조약을 맺은 상대 정치체 탐색',
                },
              ]}
            />
          ) : (
            <CountryLedgerWorkspace>
              <CountryControlRow>
                <CountryControlLeft>
                  <LedgerSearchBox style={{ width: 'clamp(210px, 24vw, 290px)' }}>
                    <FiSearch />
                    <LedgerSearchInput
                      type="search"
                      value={searchQuery}
                      onChange={(changeEvent) =>
                        setSearchQuery(changeEvent.target.value)
                      }
                      placeholder="조약명·별칭, 상대국, 체결지 검색…"
                      aria-label="조약 검색"
                    />
                    {searchQuery ? (
                      <ClearSearchIconBtn
                        type="button"
                        aria-label="검색어 지우기"
                        onClick={() => setSearchQuery('')}
                      >
                        <FiX size={13} />
                      </ClearSearchIconBtn>
                    ) : null}
                  </LedgerSearchBox>

                  {partnerOptions.length > 0 ? (
                    <PartnerSelectWrap>
                      <SearchableSelect
                        size="sm"
                        ariaLabel="상대 당사국 필터"
                        clearable
                        value={partnerFilterKey}
                        onChange={(nextKey) => setPartnerFilterKey(nextKey)}
                        placeholder={`전체 상대국 (${partnerOptions.length})`}
                        searchPlaceholder="상대 당사국 검색…"
                        options={partnerOptions.map<SearchableSelectOption>(
                          (opt) => ({
                            value: opt.key,
                            label: opt.name,
                            meta: `${opt.count}건`,
                          }),
                        )}
                      />
                    </PartnerSelectWrap>
                  ) : null}

                  <CountryQuickChipRow role="group" aria-label="효력 상태 필터">
                    <CountryQuickChip
                      type="button"
                      $active={statusFilter === 'all'}
                      onClick={() => setStatusFilter('all')}
                    >
                      전체 효력
                    </CountryQuickChip>
                    <CountryQuickChip
                      type="button"
                      $active={statusFilter === 'active'}
                      onClick={() =>
                        setStatusFilter((prev) =>
                          prev === 'active' ? 'all' : 'active',
                        )
                      }
                    >
                      유효·존속
                    </CountryQuickChip>
                    {treatyInfographic.violatedCount > 0 ? (
                      <CountryQuickChip
                        type="button"
                        $active={statusFilter === 'violated'}
                        onClick={() =>
                          setStatusFilter((prev) =>
                            prev === 'violated' ? 'all' : 'violated',
                          )
                        }
                      >
                        파기·위반
                      </CountryQuickChip>
                    ) : null}
                    {treatyInfographic.expiredCount > 0 ? (
                      <CountryQuickChip
                        type="button"
                        $active={statusFilter === 'expired'}
                        onClick={() =>
                          setStatusFilter((prev) =>
                            prev === 'expired' ? 'all' : 'expired',
                          )
                        }
                      >
                        만료
                      </CountryQuickChip>
                    ) : null}
                  </CountryQuickChipRow>
                </CountryControlLeft>

                <CountryControlRight>
                  <CountryResultCount>
                    {filteredTreaties.length === treaties.length ? (
                      <>
                        전체{' '}
                        <strong>
                          {treaties.length.toLocaleString('ko-KR')}
                        </strong>
                        건
                      </>
                    ) : (
                      <>
                        표시{' '}
                        <strong>
                          {filteredTreaties.length.toLocaleString('ko-KR')}
                        </strong>{' '}
                        / {treaties.length.toLocaleString('ko-KR')}건
                      </>
                    )}
                  </CountryResultCount>

                  <PopoverMenu
                    ariaLabel="조약 정렬 및 필터 관리"
                    title="정렬 순서 · 필터 초기화"
                    minWidth={208}
                    active={sortBy !== 'dateDesc' || hasActiveFilter}
                  >
                    {(closeMenu) => (
                      <>
                        <PopoverMenuSectionLabel>
                          정렬 순서
                        </PopoverMenuSectionLabel>
                        <PopoverMenuItem
                          type="button"
                          onClick={() => {
                            setSortBy('dateDesc')
                            closeMenu()
                          }}
                        >
                          <FiArrowDown size={13} />
                          <span>서명일 최신순</span>
                          {sortBy === 'dateDesc' ? (
                            <FiCheck size={13} style={{ marginLeft: 'auto' }} />
                          ) : null}
                        </PopoverMenuItem>
                        <PopoverMenuItem
                          type="button"
                          onClick={() => {
                            setSortBy('dateAsc')
                            closeMenu()
                          }}
                        >
                          <FiArrowUp size={13} />
                          <span>서명일 오래된순</span>
                          {sortBy === 'dateAsc' ? (
                            <FiCheck size={13} style={{ marginLeft: 'auto' }} />
                          ) : null}
                        </PopoverMenuItem>
                        <PopoverMenuItem
                          type="button"
                          onClick={() => {
                            setSortBy('partiesDesc')
                            closeMenu()
                          }}
                        >
                          <FiUsers size={13} />
                          <span>참여 당사국 많은순</span>
                          {sortBy === 'partiesDesc' ? (
                            <FiCheck size={13} style={{ marginLeft: 'auto' }} />
                          ) : null}
                        </PopoverMenuItem>
                        <PopoverMenuItem
                          type="button"
                          onClick={() => {
                            setSortBy('nameAsc')
                            closeMenu()
                          }}
                        >
                          <FiList size={13} />
                          <span>조약명 가나다순</span>
                          {sortBy === 'nameAsc' ? (
                            <FiCheck size={13} style={{ marginLeft: 'auto' }} />
                          ) : null}
                        </PopoverMenuItem>

                        {hasActiveFilter ? (
                          <>
                            <PopoverMenuDivider />
                            <PopoverMenuItem
                              type="button"
                              onClick={() => {
                                resetAllFilters()
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
                </CountryControlRight>
              </CountryControlRow>

              {centuryFilter != null || selectedPartnerName ? (
                <CountryActiveChipBar>
                  {centuryFilter != null ? (
                    <ActiveFilterTag
                      type="button"
                      onClick={() => setCenturyFilter(null)}
                    >
                      <span>
                        세기: {formatCenturyLabelFromIndex(centuryFilter)}
                      </span>
                      <FiX size={11} />
                    </ActiveFilterTag>
                  ) : null}
                  {selectedPartnerName ? (
                    <ActiveFilterTag
                      type="button"
                      onClick={() => setPartnerFilterKey('')}
                    >
                      <span>상대국: {selectedPartnerName}</span>
                      <FiX size={11} />
                    </ActiveFilterTag>
                  ) : null}
                </CountryActiveChipBar>
              ) : null}

              {filteredTreaties.length === 0 ? (
                <Empty>선택한 필터나 검색어와 일치하는 조약이 없습니다.</Empty>
              ) : (
                <CountryTableScroll>
                  <CountryTreatyTable aria-label={`${country.name} 조약 원장 표`}>
                    <thead>
                      <tr>
                        <CountryTh style={{ width: '158px' }}>
                          <CountrySortThBtn
                            type="button"
                            $active={
                              sortBy === 'dateDesc' || sortBy === 'dateAsc'
                            }
                            onClick={() =>
                              setSortBy((prev) =>
                                prev === 'dateAsc' ? 'dateDesc' : 'dateAsc',
                              )
                            }
                          >
                            <span>서명 · 효력</span>
                            {sortBy === 'dateAsc' ? (
                              <FiArrowUp size={11.5} />
                            ) : sortBy === 'dateDesc' ? (
                              <FiArrowDown size={11.5} />
                            ) : null}
                          </CountrySortThBtn>
                        </CountryTh>
                        <CountryTh>
                          <CountrySortThBtn
                            type="button"
                            $active={sortBy === 'nameAsc'}
                            onClick={() =>
                              setSortBy((prev) =>
                                prev === 'nameAsc' ? 'dateDesc' : 'nameAsc',
                              )
                            }
                          >
                            <span>조약 · 협약</span>
                            {sortBy === 'nameAsc' ? (
                              <FiArrowUp size={11.5} />
                            ) : null}
                          </CountrySortThBtn>
                        </CountryTh>
                        <CountryTh style={{ width: '172px' }}>
                          성격 · 서명 주체
                        </CountryTh>
                        <CountryTh style={{ width: '25%' }}>
                          체결 상대국
                        </CountryTh>
                        <CountryTh style={{ width: '19%' }}>체결 장소</CountryTh>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTreaties.map((treatyItem) => {
                        const signParts = parseIsoDateParts(treatyItem.signDate)
                        const pad2 = (num: number) =>
                          String(num).padStart(2, '0')
                        const dateTabular = signParts
                          ? `${formatCompactYear(signParts.year)}.${pad2(signParts.month)}.${pad2(signParts.day)}`
                          : '연도 미상'
                        const typeColor = treatyTypeTone(treatyItem.type, mode)
                        const shortType = (
                          TREATY_TYPE_LABELS[treatyItem.type] ?? treatyItem.type
                        ).replace(/ (조약|협정)$/, '')
                        const violParts = parseIsoDateParts(
                          treatyItem.violationDate,
                        )
                        const expParts = parseIsoDateParts(
                          treatyItem.expiryDate,
                        )
                        const rowTone: 'active' | 'violated' | 'expired' =
                          violParts
                            ? 'violated'
                            : expParts
                              ? 'expired'
                              : 'active'
                        const statusNote = violParts
                          ? `파기 ${formatCompactYear(violParts.year)}`
                          : expParts
                            ? `만료 ${formatCompactYear(expParts.year)}`
                            : null

                        const selfSig =
                          treatyItem.signatories.find(isSelfSignatory)
                        const selfHistoricalName =
                          selfSig?.historicalCountry?.name?.trim() || null
                        const subjectNote =
                          selfHistoricalName &&
                          selfHistoricalName !== country.name
                            ? selfHistoricalName
                            : treatyItem.signatories.length >= 3
                              ? `${treatyItem.signatories.length}개국`
                              : treatyItem.signatories.length === 2
                                ? '양자'
                                : null

                        const partnerSigs = treatyItem.signatories.filter(
                          (sig) => !isSelfSignatory(sig),
                        )
                        const displayPartners = (
                          partnerSigs.length > 0
                            ? partnerSigs
                            : treatyItem.signatories
                        ).filter((sig) =>
                          Boolean(sig.country?.name || sig.historicalCountry?.name),
                        )
                        const visiblePartners = displayPartners.slice(0, 2)
                        const extraPartnerCount = Math.max(
                          0,
                          displayPartners.length - visiblePartners.length,
                        )

                        return (
                          <CountryTr
                            key={treatyItem.id}
                            tabIndex={0}
                            onClick={() => setDetailId(treatyItem.id)}
                            onKeyDown={(keyEvent) => {
                              if (
                                keyEvent.key === 'Enter' ||
                                keyEvent.key === ' '
                              ) {
                                keyEvent.preventDefault()
                                setDetailId(treatyItem.id)
                              }
                            }}
                          >
                            <CountryTd>
                              <CountryDateStatusWrap>
                                <CountryStatusDot
                                  $tone={rowTone}
                                  aria-hidden
                                />
                                <CountryDateText>{dateTabular}</CountryDateText>
                                {statusNote ? (
                                  <CountryStatusNote $tone={rowTone}>
                                    · {statusNote}
                                  </CountryStatusNote>
                                ) : null}
                              </CountryDateStatusWrap>
                            </CountryTd>

                            <CountryTd>
                              <CountryTreatyNameLine>
                                <CountryTreatyTitle>
                                  {treatyItem.name}
                                </CountryTreatyTitle>
                                {treatyItem.alias ? (
                                  <CountryTreatyAlias>
                                    ({treatyItem.alias})
                                  </CountryTreatyAlias>
                                ) : null}
                                <CountryHoverArrow aria-hidden>
                                  <FiArrowUpRight size={13} />
                                </CountryHoverArrow>
                              </CountryTreatyNameLine>
                            </CountryTd>

                            <CountryTd>
                              <CountryTypeCell>
                                <CountryTypeText $color={typeColor}>
                                  {shortType}
                                </CountryTypeText>
                                {subjectNote ? (
                                  <CountrySubjectSub title={subjectNote}>
                                    · {subjectNote}
                                  </CountrySubjectSub>
                                ) : null}
                              </CountryTypeCell>
                            </CountryTd>

                            <CountryTd>
                              {visiblePartners.length > 0 ? (
                                <CountryPartnerPlainRow>
                                  {visiblePartners.map((sig, pIdx) => {
                                    const pName =
                                      sig.country?.name ??
                                      sig.historicalCountry?.name ??
                                      ''
                                    const pTarget: CountryInlineModalTarget | null =
                                      sig.historicalCountry?.id
                                        ? {
                                            id: sig.historicalCountry.id,
                                            kind: 'historical',
                                            name: sig.historicalCountry.name,
                                          }
                                        : sig.country?.id
                                          ? {
                                              id: sig.country.id,
                                              kind: 'modern',
                                              name: sig.country.name,
                                            }
                                          : null
                                    return (
                                      <React.Fragment key={sig.id}>
                                        {pIdx > 0 ? (
                                          <CountryMidDot aria-hidden>
                                            ·
                                          </CountryMidDot>
                                        ) : null}
                                        {pTarget ? (
                                          <CountryPartnerLinkBtn
                                            type="button"
                                            onClick={(clickEvent) => {
                                              clickEvent.stopPropagation()
                                              if (
                                                !shouldInterceptEntityClick(
                                                  clickEvent,
                                                )
                                              ) {
                                                navigate(
                                                  pathKeys.countryDetail(
                                                    pTarget.id,
                                                  ),
                                                )
                                                return
                                              }
                                              setInlineCountryTarget(pTarget)
                                            }}
                                          >
                                            {pName}
                                          </CountryPartnerLinkBtn>
                                        ) : (
                                          <CountryPartnerPlainSpan>
                                            {pName}
                                          </CountryPartnerPlainSpan>
                                        )}
                                      </React.Fragment>
                                    )
                                  })}
                                  {extraPartnerCount > 0 ? (
                                    <CountryPartnerExtra>
                                      외 {extraPartnerCount}개국
                                    </CountryPartnerExtra>
                                  ) : null}
                                </CountryPartnerPlainRow>
                              ) : (
                                <CountryEmptyDash>—</CountryEmptyDash>
                              )}
                            </CountryTd>

                            <CountryTd>
                              {treatyItem.location?.trim() ? (
                                <CountryLocSpan title={treatyItem.location}>
                                  {treatyItem.location}
                                </CountryLocSpan>
                              ) : (
                                <CountryEmptyDash>—</CountryEmptyDash>
                              )}
                            </CountryTd>
                          </CountryTr>
                        )
                      })}
                    </tbody>
                  </CountryTreatyTable>
                </CountryTableScroll>
              )}
            </CountryLedgerWorkspace>
          )}
        </>
      )}

      <CountryInlineModal
        target={inlineCountryTarget}
        onClose={() => setInlineCountryTarget(null)}
      />

      {createOpen && (
        <TreatyCreateModal
          country={country}
          onClose={() => setCreateOpen(false)}
          onCreated={(createdId) => {
            setCreateOpen(false)
            invalidate()
            setDetailId(createdId)
          }}
          onCreatedAndContinue={() => {
            invalidate()
          }}
        />
      )}
    </Wrap>
  )

  return <ThemeProvider theme={treatyTheme}>{inner}</ThemeProvider>
}

// ──────────────────────────────────────────────
// 조약 상세 뷰
// ──────────────────────────────────────────────

export const TreatySectionThemeProvider: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const parentTheme = useTheme()
  const { mode } = useThemeStore()
  const merged = useMemo(
    () => ({ ...parentTheme, ts: getTreatySectionPalette(mode === 'dark') }),
    [parentTheme, mode],
  )
  return <ThemeProvider theme={merged}>{children}</ThemeProvider>
}

export const TreatyDetail: React.FC<{
  treatyId: string
  onBack: () => void
  onInvalidate: () => void
}> = ({ treatyId, onBack, onInvalidate }) => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const themeMode = useTheme().mode

  const { data: treaty, isLoading } = useQuery({
    queryKey: ['treaty', treatyId],
    queryFn: () => treatyApi.getById(treatyId),
  })

  const [addSignatoryOpen, setAddSignatoryOpen] = useState(false)
  const [editSignatory, setEditSignatory] = useState<TreatySignatoryDto | null>(
    null,
  )
  const [addTermOpen, setAddTermOpen] = useState(false)
  const [addEventLinkOpen, setAddEventLinkOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [countryTarget, setCountryTarget] =
    useState<CountryInlineModalTarget | null>(null)
  const [mentionPersonId, setMentionPersonId] = useState<string | null>(null)

  const rawSigningEventId = useMemo(
    () =>
      treaty?.eventLinks?.find(
        (linkItem) => linkItem.linkType === 'SIGNING' && Boolean(linkItem.event),
      )?.eventId ?? null,
    [treaty?.eventLinks],
  )

  // 연결된 체결 사건(SIGNING) 정본에서 배경·여파·장소·개요를 참조(이중 입력 방지)
  const { data: signingEventDetail } = useQuery({
    queryKey: ['event-for-treaty-context', rawSigningEventId],
    queryFn: () => getEventById(rawSigningEventId!),
    enabled: Boolean(rawSigningEventId),
    staleTime: 60_000,
  })

  const invalidateTreaty = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['treaty', treatyId] })
    onInvalidate()
  }, [queryClient, treatyId, onInvalidate])

  const handleUnlinkEvent = async (linkId: string, eventTitle: string) => {
    if (
      !(await confirm({
        title: '사건 연결 해제',
        message: `사건 「${eventTitle}」과(와) 이 조약의 연결을 해제할까요? 사건과 조약 자체는 삭제되지 않습니다.`,
        confirmLabel: '연결 해제',
        danger: true,
      }))
    )
      return
    try {
      await treatyApi.unlinkEvent(linkId)
      invalidateTreaty()
      notify.success('사건 연결이 해제되었습니다.')
    } catch (err) {
      notify.error(
        getApiErrorMessage(err, '사건 연결 해제 중 오류가 발생했습니다.'),
      )
    }
  }

  const handleDeleteTreaty = async () => {
    if (
      !(await confirm({
        title: '삭제 확인',
        message:
          '이 조약을 삭제하시겠습니까? 모든 서명국, 조항, 이미지가 함께 삭제됩니다.',
        danger: true,
      }))
    )
      return
    try {
      await treatyApi.remove(treatyId)
      notify.success('조약이 삭제되었습니다.')
      onInvalidate()
      onBack()
    } catch (err) {
      notify.error(getApiErrorMessage(err, '삭제 중 오류가 발생했습니다.'))
    }
  }

  const handleDeleteSignatory = async (id: string) => {
    if (
      !(await confirm({
        title: '삭제 확인',
        message: '이 서명국 정보를 삭제하시겠습니까?',
        danger: true,
      }))
    )
      return
    try {
      await treatyApi.removeSignatory(id)
      invalidateTreaty()
      notify.success('서명국이 삭제되었습니다.')
    } catch (err) {
      notify.error(getApiErrorMessage(err, '삭제 중 오류가 발생했습니다.'))
    }
  }

  const handleDeleteTerm = async (id: string) => {
    if (
      !(await confirm({
        title: '삭제 확인',
        message: '이 조항을 삭제하시겠습니까?',
        danger: true,
      }))
    )
      return
    try {
      await treatyApi.removeTerm(id)
      invalidateTreaty()
      notify.success('조항이 삭제되었습니다.')
    } catch (err) {
      notify.error(getApiErrorMessage(err, '삭제 중 오류가 발생했습니다.'))
    }
  }

  const handleImageUpload = async (
    changeEvent: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = changeEvent.target.files?.[0]
    if (!file || !treaty) return
    setUploadingImage(true)
    try {
      const { url } = await uploadImage(file)
      const isFirst = treaty.images.length === 0
      const dto: AddTreatyImageDto = {
        treatyId: treaty.id,
        imageUrl: url,
        isPrimary: isFirst,
      }
      await treatyApi.addImage(dto)
      invalidateTreaty()
      notify.success('이미지가 추가되었습니다.')
    } catch (err) {
      notify.error(
        getApiErrorMessage(err, '이미지 업로드 중 오류가 발생했습니다.'),
      )
    } finally {
      setUploadingImage(false)
    }
  }

  const handleDeleteImage = async (id: string) => {
    if (
      !(await confirm({
        title: '삭제 확인',
        message: '이 이미지를 삭제하시겠습니까?',
        danger: true,
      }))
    )
      return
    try {
      await treatyApi.removeImage(id)
      invalidateTreaty()
      notify.success('이미지가 삭제되었습니다.')
    } catch (err) {
      notify.error(getApiErrorMessage(err, '삭제 중 오류가 발생했습니다.'))
    }
  }

  if (isLoading || !treaty)
    return (
      <Wrap>
        <ChartSkeleton variant="text" lines={6} />
      </Wrap>
    )

  const thumb =
    treaty.images.find((img) => img.isPrimary)?.imageUrl ??
    treaty.images[0]?.imageUrl
  const typeColor = treatyTypeTone(treaty.type, themeMode)

  const eventLinks = (treaty.eventLinks ?? [])
    .filter(
      (
        link,
      ): link is TreatyEventLinkWithEventDto & {
        event: NonNullable<TreatyEventLinkWithEventDto['event']>
      } => !!link.event,
    )
    .sort(
      (left, right) =>
        EVENT_LINK_ORDER[left.linkType] - EVENT_LINK_ORDER[right.linkType],
    )
  const signingLink = eventLinks.find((link) => link.linkType === 'SIGNING')
  const ratificationLink = eventLinks.find(
    (link) => link.linkType === 'RATIFICATION',
  )
  const violationLink = eventLinks.find(
    (link) => link.linkType === 'VIOLATION',
  )

  const signingDetailRecord = signingEventDetail as
    | {
        location?: string | null
        description?: string | null
        background?: string | null
        aftermath?: string | null
      }
    | undefined

  // 체결·비준·파기 사건이 연결되어 있으면 중복 입력 없이 사건 정본에서 값을 자동 보강
  const effectiveLocation =
    treaty.location?.trim() ||
    signingLink?.event.location?.trim() ||
    signingDetailRecord?.location?.trim() ||
    null
  const effectiveEffectiveDate =
    treaty.effectiveDate ?? ratificationLink?.event.startDate ?? null
  const effectiveViolationDate =
    treaty.violationDate ?? violationLink?.event.startDate ?? null
  const rawViolationReason =
    treaty.violationReason?.trim() ||
    (violationLink ? `${violationLink.event.title} 발생으로 파기` : null)
  const effectiveViolationReason = rawViolationReason
    ? richTextToMultilineText(rawViolationReason)
    : null

  const hasTreatySummary = !isVisuallyEmptyRichText(treaty.summary)
  const signingDescCandidate =
    !isVisuallyEmptyRichText(signingLink?.event.description)
      ? signingLink?.event.description
      : !isVisuallyEmptyRichText(signingDetailRecord?.description)
        ? signingDetailRecord?.description
        : null

  const resolvedSummary = hasTreatySummary
    ? { text: (treaty.summary ?? '').trim(), sourceEvent: null }
    : signingLink && signingDescCandidate
      ? {
          text: signingDescCandidate.trim(),
          sourceEvent: signingLink.event,
        }
      : null

  const hasTreatyBackground = !isVisuallyEmptyRichText(treaty.background)
  const signingBgCandidate =
    !isVisuallyEmptyRichText(signingLink?.event.background)
      ? signingLink?.event.background
      : !isVisuallyEmptyRichText(signingDetailRecord?.background)
        ? signingDetailRecord?.background
        : null

  const resolvedBackground = hasTreatyBackground
    ? { text: (treaty.background ?? '').trim(), sourceEvent: null }
    : signingLink && signingBgCandidate
      ? {
          text: signingBgCandidate.trim(),
          sourceEvent: signingLink.event,
        }
      : null

  const hasTreatyAftermath = !isVisuallyEmptyRichText(treaty.aftermath)
  const signingAftermathCandidate =
    !isVisuallyEmptyRichText(signingLink?.event.aftermath)
      ? signingLink?.event.aftermath
      : !isVisuallyEmptyRichText(signingDetailRecord?.aftermath)
        ? signingDetailRecord?.aftermath
        : null

  const resolvedAftermath = hasTreatyAftermath
    ? { text: (treaty.aftermath ?? '').trim(), sourceEvent: null }
    : signingLink && signingAftermathCandidate
      ? {
          text: signingAftermathCandidate.trim(),
          sourceEvent: signingLink.event,
        }
      : null

  const signParts = parseIsoDateParts(treaty.signDate)
  const endParts = parseIsoDateParts(
    effectiveViolationDate ?? treaty.expiryDate,
  )
  const periodLabel =
    signParts && endParts
      ? `${formatYear(signParts.year)}–${formatYear(endParts.year)}`
      : null
  const signLine = treaty.signDate
    ? `${fmtDate(treaty.signDate)} 서명`
    : '서명일 미상'

  const anchorId = (slug: string) => `treaty-${treaty.id}-${slug}`
  const scrollToAnchor = (slug: string) =>
    document
      .getElementById(anchorId(slug))
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  // 배경·여파는 Event 정본이므로 조약의 미입력 항목에서 제외
  const missing = [
    !resolvedSummary && '약정 요지',
    !effectiveLocation && '체결 장소',
    !effectiveEffectiveDate && '발효일',
  ].filter((label): label is string => !!label)

  const openEdit = () => setEditOpen(true)
  const fillItems = [
    eventLinks.length === 0 && {
      key: 'events',
      label: '체결·관련 사건 연결',
      onFill: () => setAddEventLinkOpen(true),
    },
    !treaty.summary?.trim() && {
      key: 'summary',
      label: '약정 요지',
      onFill: openEdit,
    },
    treaty.terms.length === 0 && {
      key: 'terms',
      label: '조항',
      onFill: () => setAddTermOpen(true),
    },
  ].filter(
    (item): item is { key: string; label: string; onFill: () => void } =>
      !!item,
  )

  const signatoryTarget = (
    signatory: TreatySignatoryDto,
  ): CountryInlineModalTarget | null =>
    signatory.country
      ? {
          id: signatory.country.id,
          kind: 'modern',
          name: signatory.country.name,
        }
      : signatory.historicalCountry
        ? {
            id: signatory.historicalCountry.id,
            kind: 'historical',
            name: signatory.historicalCountry.name,
          }
        : null
  const countryPeers = treaty.signatories
    .map(signatoryTarget)
    .filter((target): target is CountryInlineModalTarget => !!target)

  const tocEntries = [
    resolvedBackground && { slug: 'background', label: '배경' },
    resolvedAftermath && { slug: 'aftermath', label: '결과 · 여파' },
    eventLinks.length > 0 && {
      slug: 'events',
      label: '연결된 사건',
      count: eventLinks.length,
    },
    treaty.terms.length > 0 && {
      slug: 'terms',
      label: '조항',
      count: treaty.terms.length,
    },
    treaty.images.length > 0 && {
      slug: 'images',
      label: '이미지',
      count: treaty.images.length,
    },
  ].filter(
    (entry): entry is { slug: string; label: string; count?: number } =>
      !!entry,
  )

  const personLabel = (signatory: TreatySignatoryDto) =>
    signatory.person
      ? getPersonDisplayName({
          name: signatory.person.name ?? '',
          surname: signatory.person.surname,
          middleName: (signatory.person as { middleName?: string | null })
            .middleName,
          nameDisplayOrder: (
            signatory.person as { nameDisplayOrder?: string | null }
          ).nameDisplayOrder,
          country: (
            signatory.person as {
              country?: { defaultNameDisplayOrder?: string | null } | null
            }
          ).country,
        })
      : null

  const cabinetLabelOf = (signatory: TreatySignatoryDto) => {
    if (!signatory.cabinet) return null
    if (signatory.cabinet.name) return signatory.cabinet.name
    const headTenure = signatory.cabinet.headTenure
    const headName = headTenure?.person
      ? getPersonDisplayName({
          name: headTenure.person.name ?? '',
          surname: headTenure.person.surname,
          middleName: (headTenure.person as { middleName?: string | null })
            .middleName,
          nameDisplayOrder: (
            headTenure.person as { nameDisplayOrder?: string | null }
          ).nameDisplayOrder,
          country: (
            headTenure.person as {
              country?: { defaultNameDisplayOrder?: string | null } | null
            }
          ).country,
        })
      : ''
    const term = headTenure?.ordinal ?? headTenure?.subTermNumber
    return term ? `제${term}대 ${headName} 행정부` : `${headName} 행정부`
  }

  return (
    <TD.Page>
      <TD.Layout>
        <TD.TopRow>
          <TD.Breadcrumb aria-label="위치">
            <button type="button" onClick={onBack}>
              <FiChevronLeft size={13} aria-hidden /> 목록
            </button>
            <TD.CrumbSep aria-hidden>·</TD.CrumbSep>
            <button
              type="button"
              onClick={() => navigate(pathKeys.treaties.list())}
            >
              조약
            </button>
            <TD.CrumbSep aria-hidden>›</TD.CrumbSep>
            <TD.TypeCrumb
              type="button"
              $color={typeColor}
              onClick={() =>
                navigate(`${pathKeys.treaties.list()}?type=${treaty.type}`)
              }
              title={`${TREATY_TYPE_LABELS[treaty.type] ?? treaty.type}만 보기`}
            >
              {TREATY_TYPE_LABELS[treaty.type] ?? treaty.type}
            </TD.TypeCrumb>
          </TD.Breadcrumb>
          <TD.TopActions>
            <TD.QuietButton
              type="button"
              onClick={() => setAddEventLinkOpen(true)}
            >
              <FiLink size={12} aria-hidden /> 사건 연결
            </TD.QuietButton>
            <TD.QuietButton type="button" onClick={() => setEditOpen(true)}>
              <FiEdit2 size={12} aria-hidden /> 수정
            </TD.QuietButton>
            <TD.QuietButton type="button" $danger onClick={handleDeleteTreaty}>
              <FiTrash2 size={12} aria-hidden /> 삭제
            </TD.QuietButton>
          </TD.TopActions>
        </TD.TopRow>

        <TD.Hero>
          {thumb ? (
            <TD.HeroImage>
              <img src={thumb} alt={`${treaty.name} 대표 이미지`} />
            </TD.HeroImage>
          ) : (
            <TD.ImagePill $busy={uploadingImage}>
              <FiImage size={12} aria-hidden />
              {uploadingImage ? '업로드 중…' : '대표 이미지 추가'}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
              />
            </TD.ImagePill>
          )}

          <TD.TitleBlock>
            <TD.Title>{treaty.name}</TD.Title>
            {treaty.alias && <TD.Alias>{treaty.alias}</TD.Alias>}
            <TD.HeroDateLine>
              <span>{signLine}</span>
              {effectiveLocation && (
                <>
                  <span aria-hidden>·</span>
                  <span>{effectiveLocation}</span>
                </>
              )}
            </TD.HeroDateLine>
          </TD.TitleBlock>

          {resolvedSummary && (
            <LeadBlock>
              {resolvedSummary.sourceEvent && (
                <EventOriginPill
                  to={pathKeys.events.detail(resolvedSummary.sourceEvent.id)}
                >
                  <FiLink size={11} aria-hidden />
                  사건 정본 참조 · {resolvedSummary.sourceEvent.title}
                  <FiArrowUpRight size={11} aria-hidden />
                </EventOriginPill>
              )}
              {isLikelyRichTextHtml(resolvedSummary.text) ? (
                <RichTextProseWithEntityClicks
                  readViewAs={TD.LeadRichText}
                  html={resolvedSummary.text}
                  aria-label="조약 약정 요지"
                  hideWhenEmpty
                  onPersonClick={setMentionPersonId}
                />
              ) : (
                <TD.Lead>{richTextToMultilineText(resolvedSummary.text)}</TD.Lead>
              )}
            </LeadBlock>
          )}

          {effectiveViolationReason && (
            <TD.Broken>
              <b>파기 사유</b>
              <span>{effectiveViolationReason}</span>
            </TD.Broken>
          )}

          <TD.PartiesHead>
            <span>
              서명 · 참여 당사국 <b>{treaty.signatories.length}</b>
            </span>
            <TD.QuietButton
              type="button"
              onClick={() => setAddSignatoryOpen(true)}
            >
              <FiPlus size={12} aria-hidden /> 당사국 추가
            </TD.QuietButton>
          </TD.PartiesHead>
          <TD.PartiesGrid>
            {treaty.signatories.map((signatory) => {
              const countryName =
                signatory.country?.name ??
                signatory.historicalCountry?.name ??
                '알 수 없음'
              const historical =
                !signatory.country && !!signatory.historicalCountry
              const emblemImage =
                signatory.country?.thumbnailUrl ??
                signatory.historicalCountry?.thumbnailUrl ??
                null
              const personName = personLabel(signatory)
              const cabinetLabel = cabinetLabelOf(signatory)
              const partyTarget = signatoryTarget(signatory)

              const linkedTenure = signatory.tenure
              const tenureTitle =
                linkedTenure?.title ??
                linkedTenure?.positionDefinition?.title ??
                null
              const displayRole =
                signatory.role ??
                tenureTitle ??
                signatory.positionDefinition?.title ??
                null
              const instName =
                linkedTenure?.administrationDepartment?.abbreviation ??
                linkedTenure?.administrationDepartment?.name ??
                linkedTenure?.militaryUnit?.abbreviation ??
                linkedTenure?.militaryUnit?.name ??
                null
              const roleWithRank = [
                linkedTenure?.rankTitle ?? null,
                displayRole,
              ]
                .filter(Boolean)
                .join(' ')
              const fullRoleMeta = [
                roleWithRank || null,
                instName &&
                (!roleWithRank || !roleWithRank.includes(instName))
                  ? instName
                  : null,
                cabinetLabel || null,
              ]
                .filter(Boolean)
                .join(' · ')

              const showParticipationLabel =
                signatory.participationType &&
                signatory.participationType !== 'SIGNATORY'
              const showSignedAt =
                Boolean(signatory.signedAt) &&
                signatory.signedAt !== treaty.signDate

              return (
                <TD.PartyCard key={signatory.id}>
                  <TD.PartyPrimaryRow>
                    <TD.PartyHead>
                      <TD.Emblem $historical={historical} aria-hidden>
                        {signatory.country?.flagEmoji ? (
                          signatory.country.flagEmoji
                        ) : emblemImage ? (
                          <img src={emblemImage} alt="" />
                        ) : (
                          countryName.slice(0, 1)
                        )}
                      </TD.Emblem>
                      <TD.PartyName title={countryName}>
                        {partyTarget ? (
                          <TD.PartyNameLink
                            data-party-link
                            to={pathKeys.countryDetail(partyTarget.id)}
                            onClick={(clickEvent) => {
                              if (!shouldInterceptEntityClick(clickEvent))
                                return
                              clickEvent.preventDefault()
                              setCountryTarget(partyTarget)
                            }}
                          >
                            {countryName}
                          </TD.PartyNameLink>
                        ) : (
                          countryName
                        )}
                      </TD.PartyName>
                      {(showParticipationLabel || showSignedAt) && (
                        <TD.PartyTags>
                          {showParticipationLabel && (
                            <TD.Tag $strong>
                              {
                                TREATY_PARTICIPATION_LABELS[
                                  signatory.participationType
                                ]
                              }
                            </TD.Tag>
                          )}
                          {showSignedAt && (
                            <TD.Tag>
                              · {fmtDate(signatory.signedAt)} 서명
                            </TD.Tag>
                          )}
                        </TD.PartyTags>
                      )}
                    </TD.PartyHead>

                    {(personName || fullRoleMeta) && (
                      <TD.PartyLine>
                        {personName &&
                          (signatory.person ? (
                            <TD.PersonLink
                              to={pathKeys.personsTimelineDetail(
                                signatory.person.id,
                              )}
                            >
                              {personName}
                            </TD.PersonLink>
                          ) : (
                            <b>{personName}</b>
                          ))}
                        {personName && fullRoleMeta && ' · '}
                        {fullRoleMeta && (
                          <span className={personName ? 'meta' : undefined}>
                            {fullRoleMeta}
                          </span>
                        )}
                      </TD.PartyLine>
                    )}
                  </TD.PartyPrimaryRow>

                  {signatory.note?.trim() && (
                    <SignatoryNote note={signatory.note.trim()} />
                  )}

                  <TD.PartyActions data-party-actions>
                    <TD.IconButton
                      type="button"
                      onClick={() => setEditSignatory(signatory)}
                      title="서명국 수정"
                      aria-label={`${countryName} 서명국 수정`}
                    >
                      <FiEdit2 size={12} />
                    </TD.IconButton>
                    <TD.IconButton
                      type="button"
                      onClick={() => handleDeleteSignatory(signatory.id)}
                      title="서명국 삭제"
                      aria-label={`${countryName} 서명국 삭제`}
                    >
                      <FiTrash2 size={12} />
                    </TD.IconButton>
                  </TD.PartyActions>
                </TD.PartyCard>
              )
            })}
          </TD.PartiesGrid>
        </TD.Hero>

        <TD.Aside aria-label="조약 정보">
          <TD.YearDisplay>
            {signParts ? `${formatYear(signParts.year)}년` : '연도 미상'}
          </TD.YearDisplay>
          <TD.AsideLine data-wide-only>{signLine}</TD.AsideLine>
          {effectiveLocation && (
            <TD.AsideLine data-wide-only>
              <FiMapPin size={13} aria-hidden />
              <span>{effectiveLocation}</span>
            </TD.AsideLine>
          )}

          <TD.FactRows>
            <TD.FactRow>
              <TD.FactLabel>유형</TD.FactLabel>
              <TD.FactValue $tone="type" $color={typeColor}>
                {TREATY_TYPE_LABELS[treaty.type] ?? treaty.type}
              </TD.FactValue>
            </TD.FactRow>
            {effectiveEffectiveDate && (
              <TD.FactRow>
                <TD.FactLabel>발효</TD.FactLabel>
                <TD.FactValue>{fmtDate(effectiveEffectiveDate)}</TD.FactValue>
              </TD.FactRow>
            )}
            {treaty.expiryDate && (
              <TD.FactRow>
                <TD.FactLabel>만료</TD.FactLabel>
                <TD.FactValue>{fmtDate(treaty.expiryDate)}</TD.FactValue>
              </TD.FactRow>
            )}
            {effectiveViolationDate && (
              <TD.FactRow>
                <TD.FactLabel>파기</TD.FactLabel>
                <TD.FactValue $tone="danger">
                  {fmtDate(effectiveViolationDate)}
                </TD.FactValue>
              </TD.FactRow>
            )}
            {periodLabel && (
              <TD.FactRow>
                <TD.FactLabel>효력</TD.FactLabel>
                <TD.FactValue>{periodLabel}</TD.FactValue>
              </TD.FactRow>
            )}
            {signingLink && (
              <TD.FactRow>
                <TD.FactLabel>체결 사건</TD.FactLabel>
                <TD.FactValue>
                  <TD.FactLink to={pathKeys.events.detail(signingLink.eventId)}>
                    {signingLink.event.title}
                  </TD.FactLink>
                </TD.FactValue>
              </TD.FactRow>
            )}
            <TD.FactRow>
              <TD.FactLabel>서명국</TD.FactLabel>
              <TD.FactValue>{treaty.signatories.length}개국</TD.FactValue>
            </TD.FactRow>
            <TD.FactRow>
              <TD.FactLabel>조항</TD.FactLabel>
              <TD.FactValue>{treaty.terms.length}개</TD.FactValue>
            </TD.FactRow>
          </TD.FactRows>

          {missing.length > 0 && (
            <TD.FillHint
              type="button"
              onClick={() => setEditOpen(true)}
              title={`비어 있음: ${missing.join(', ')}`}
            >
              비어 있는 항목 {missing.length}개 · <b>채우기</b>
            </TD.FillHint>
          )}

          <TD.Toc aria-label="목차">
            <TD.TocLabel>목차</TD.TocLabel>
            <TD.TocList>
              {tocEntries.map((entry) => (
                <li key={entry.slug}>
                  <TD.TocItem
                    type="button"
                    onClick={() => scrollToAnchor(entry.slug)}
                  >
                    {entry.label}
                    {entry.count !== undefined && <span>{entry.count}</span>}
                  </TD.TocItem>
                </li>
              ))}
            </TD.TocList>
          </TD.Toc>
        </TD.Aside>

        <TD.Main>
          {resolvedBackground && (
            <TD.Section id={anchorId('background')}>
              <TD.SectionHeader>
                <TD.SectionTitle>배경</TD.SectionTitle>
                {resolvedBackground.sourceEvent && (
                  <TD.SectionActions>
                    <EventOriginPill
                      to={pathKeys.events.detail(
                        resolvedBackground.sourceEvent.id,
                      )}
                    >
                      <FiLink size={11} aria-hidden />
                      사건 정본 · {resolvedBackground.sourceEvent.title}
                      <FiArrowUpRight size={11} aria-hidden />
                    </EventOriginPill>
                  </TD.SectionActions>
                )}
              </TD.SectionHeader>
              {isLikelyRichTextHtml(resolvedBackground.text) ? (
                <RichTextProseWithEntityClicks
                  readViewAs={TD.ProseRichText}
                  html={resolvedBackground.text}
                  aria-label="조약 체결 배경"
                  hideWhenEmpty
                  onPersonClick={setMentionPersonId}
                />
              ) : (
                <TD.Prose>
                  {richTextToMultilineText(resolvedBackground.text)}
                </TD.Prose>
              )}
            </TD.Section>
          )}

          {resolvedAftermath && (
            <TD.Section id={anchorId('aftermath')}>
              <TD.SectionHeader>
                <TD.SectionTitle>결과 · 여파</TD.SectionTitle>
                {resolvedAftermath.sourceEvent && (
                  <TD.SectionActions>
                    <EventOriginPill
                      to={pathKeys.events.detail(
                        resolvedAftermath.sourceEvent.id,
                      )}
                    >
                      <FiLink size={11} aria-hidden />
                      사건 정본 · {resolvedAftermath.sourceEvent.title}
                      <FiArrowUpRight size={11} aria-hidden />
                    </EventOriginPill>
                  </TD.SectionActions>
                )}
              </TD.SectionHeader>
              {isLikelyRichTextHtml(resolvedAftermath.text) ? (
                <RichTextProseWithEntityClicks
                  readViewAs={TD.ProseRichText}
                  html={resolvedAftermath.text}
                  aria-label="조약 결과 및 여파"
                  hideWhenEmpty
                  onPersonClick={setMentionPersonId}
                />
              ) : (
                <TD.Prose>
                  {richTextToMultilineText(resolvedAftermath.text)}
                </TD.Prose>
              )}
            </TD.Section>
          )}

          {eventLinks.length > 0 && (
            <TD.Section id={anchorId('events')}>
              <TD.SectionHeader>
                <TD.SectionTitle>연결된 사건</TD.SectionTitle>
                <TD.SectionMeta>{eventLinks.length}건</TD.SectionMeta>
                <TD.SectionActions>
                  <TD.QuietButton
                    type="button"
                    onClick={() => setAddEventLinkOpen(true)}
                  >
                    <FiPlus size={12} aria-hidden /> 사건 연결
                  </TD.QuietButton>
                </TD.SectionActions>
              </TD.SectionHeader>
              <TD.EventLinkList>
                {eventLinks.map((link) => (
                  <TD.EventLinkRow key={link.id}>
                    <TD.EventLinkYear data-event-year>
                      {eventYearLabel(link.event) ?? '연도 미상'}
                    </TD.EventLinkYear>
                    <TD.EventLinkTitle
                      to={pathKeys.events.detail(link.eventId)}
                    >
                      {link.event.title}
                      <FiExternalLink size={12} aria-hidden />
                    </TD.EventLinkTitle>
                    <EventLinkRightCluster>
                      <TD.EventLinkKind>
                        {TREATY_EVENT_LINK_LABELS[link.linkType]}
                      </TD.EventLinkKind>
                      <TD.IconButton
                        type="button"
                        title="사건 연결 해제"
                        aria-label={`${link.event.title} 연결 해제`}
                        onClick={() =>
                          void handleUnlinkEvent(link.id, link.event.title)
                        }
                      >
                        <FiX size={12} />
                      </TD.IconButton>
                    </EventLinkRightCluster>
                    {link.note && !isVisuallyEmptyRichText(link.note) && (
                      <TD.EventLinkNote>
                        {richTextToMultilineText(link.note)}
                      </TD.EventLinkNote>
                    )}
                  </TD.EventLinkRow>
                ))}
              </TD.EventLinkList>
            </TD.Section>
          )}

          {treaty.terms.length > 0 && (
            <TD.Section id={anchorId('terms')}>
              <TD.SectionHeader>
                <TD.SectionTitle>조항</TD.SectionTitle>
                <TD.SectionMeta>{treaty.terms.length}개</TD.SectionMeta>
                <TD.SectionActions>
                  <TD.QuietButton
                    type="button"
                    onClick={() => setAddTermOpen(true)}
                  >
                    <FiPlus size={12} aria-hidden /> 조항 추가
                  </TD.QuietButton>
                </TD.SectionActions>
              </TD.SectionHeader>
              <TD.TermList>
                {treaty.terms.map((term, index) => {
                  const termLabel = term.title?.trim() || `조항 ${index + 1}`
                  return (
                    <TD.TermItem key={term.id}>
                      <TD.TermIndex $secret={term.isSecret} aria-hidden>
                        {index + 1}
                      </TD.TermIndex>
                      <TD.TermBody>
                        <TD.TermTitle>
                          {termLabel}
                          {term.isSecret && (
                            <TD.SecretTag>비밀 조항</TD.SecretTag>
                          )}
                        </TD.TermTitle>
                        {isLikelyRichTextHtml(term.content) ? (
                          <RichTextProseWithEntityClicks
                            readViewAs={TD.TermRichText}
                            html={term.content}
                            aria-label={termLabel}
                            hideWhenEmpty
                            onPersonClick={setMentionPersonId}
                          />
                        ) : (
                          <TD.TermContent>
                            {richTextToMultilineText(term.content)}
                          </TD.TermContent>
                        )}
                      </TD.TermBody>
                      <TD.TermActions data-term-actions>
                        <TD.IconButton
                          type="button"
                          onClick={() => handleDeleteTerm(term.id)}
                          title="조항 삭제"
                          aria-label={`${termLabel} 삭제`}
                        >
                          <FiTrash2 size={12} />
                        </TD.IconButton>
                      </TD.TermActions>
                    </TD.TermItem>
                  )
                })}
              </TD.TermList>
            </TD.Section>
          )}

          {treaty.images.length > 0 && (
            <TD.Section id={anchorId('images')}>
              <TD.SectionHeader>
                <TD.SectionTitle>이미지</TD.SectionTitle>
                <TD.SectionMeta>{treaty.images.length}장</TD.SectionMeta>
                <TD.SectionActions>
                  <TD.UploadLabel $busy={uploadingImage}>
                    <FiImage size={12} aria-hidden />
                    {uploadingImage ? '업로드 중…' : '이미지 추가'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                  </TD.UploadLabel>
                </TD.SectionActions>
              </TD.SectionHeader>
              <TD.ImageGrid>
                {treaty.images.map((image) => (
                  <TD.ImageTile key={image.id}>
                    <img src={image.imageUrl} alt={image.caption ?? ''} />
                    {image.isPrimary && <span data-primary>대표</span>}
                    <TD.IconButton
                      type="button"
                      data-remove
                      onClick={() => handleDeleteImage(image.id)}
                      title="이미지 삭제"
                      aria-label="이미지 삭제"
                    >
                      <FiTrash2 size={12} />
                    </TD.IconButton>
                  </TD.ImageTile>
                ))}
              </TD.ImageGrid>
            </TD.Section>
          )}

          {fillItems.length > 0 && (
            <TD.FillStrip aria-labelledby={anchorId('fill-title')}>
              <TD.FillStripTitle id={anchorId('fill-title')}>
                더 채울 수 있는 것
              </TD.FillStripTitle>
              <TD.FillChips>
                {fillItems.map((item) => (
                  <TD.FillChip
                    key={item.key}
                    type="button"
                    onClick={item.onFill}
                  >
                    <FiPlus size={12} aria-hidden />
                    {item.label}
                  </TD.FillChip>
                ))}
              </TD.FillChips>
            </TD.FillStrip>
          )}
        </TD.Main>
      </TD.Layout>

      {createPortal(
        <>
          {addSignatoryOpen && (
            <TreatySignatoryFormModal
              mode="create"
              treatyId={treatyId}
              treatySignDate={treaty.signDate}
              onClose={() => setAddSignatoryOpen(false)}
              onSaved={() => {
                setAddSignatoryOpen(false)
                invalidateTreaty()
              }}
            />
          )}

          {editSignatory && (
            <TreatySignatoryFormModal
              key={editSignatory.id}
              mode="edit"
              signatory={editSignatory}
              treatySignDate={treaty.signDate}
              onClose={() => setEditSignatory(null)}
              onSaved={() => {
                setEditSignatory(null)
                invalidateTreaty()
              }}
            />
          )}

          {addTermOpen && (
            <TreatyTermFormModal
              treatyId={treatyId}
              nextOrder={treaty.terms.length}
              onClose={() => setAddTermOpen(false)}
              onAdded={() => {
                setAddTermOpen(false)
                invalidateTreaty()
              }}
            />
          )}

          {addEventLinkOpen && (
            <TreatyEventLinkModal
              treatyId={treatyId}
              existingLinks={eventLinks.map((item) => ({
                eventId: item.eventId,
                linkType: item.linkType,
              }))}
              onClose={() => setAddEventLinkOpen(false)}
              onLinked={() => {
                setAddEventLinkOpen(false)
                invalidateTreaty()
              }}
            />
          )}

          {editOpen && (
            <TreatyEditModal
              treaty={treaty}
              onClose={() => setEditOpen(false)}
              onSaved={() => {
                setEditOpen(false)
                invalidateTreaty()
              }}
            />
          )}

          <CountryInlineModal
            target={countryTarget}
            onClose={() => setCountryTarget(null)}
            onSwitch={setCountryTarget}
            peers={countryPeers}
            peersLabel="이 조약의 다른 서명국"
          />

          <PersonInlineModal
            personId={mentionPersonId}
            onClose={() => setMentionPersonId(null)}
            onOpenDetail={(pid) => {
              setMentionPersonId(null)
              navigate(pathKeys.personsTimelineDetail(pid))
            }}
          />
        </>,
        document.body,
      )}
    </TD.Page>
  )
}

// ──────────────────────────────────────────────
// Styled Components
// ──────────────────────────────────────────────

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  ${countryTabCanvasPadding}
  min-height: 400px;
  animation: ${fadeIn} 0.16s ease;
`

const LeadBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const EventOriginPill = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  width: fit-content;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  text-decoration: none;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  border: 1px solid ${({ theme }) => `${ledgerAccent(theme.mode)}35`};
  transition: border-color 0.14s ease;

  &:hover {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`

const EventLinkRightCluster = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const TreatySecondaryBtn = styled(LedgerToolbarButton)``

const CountryTopTabBar = styled.div`
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

const CountryTopActions = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 7px;
  margin-left: auto;
`

const UtilityToggleBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 10px;
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

const EditorialSummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 28px;
  padding: 4px 0 22px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  @media (min-width: 1081px) {
    > * + * {
      padding-left: 28px;
      border-left: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
    }
  }

  @media (max-width: 1080px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 22px;
  }

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`

const InlineCardResetBtn = styled.button`
  padding: 2px 7px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-family: inherit;
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
`

const TreatyStatusDivider = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding-top: 10px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const CenturyHistBars = styled.div<{ $compact?: boolean }>`
  display: flex;
  align-items: flex-end;
  justify-content: ${({ $compact }) => ($compact ? 'flex-start' : 'space-between')};
  gap: ${({ $compact }) => ($compact ? '12px' : '6px')};
  min-height: 92px;
  padding-top: 4px;
  overflow-x: auto;
`

const CenturyBarColBtn = styled.button<{
  $active: boolean
  $dimmed: boolean
}>`
  appearance: none;
  flex: 1 1 0;
  max-width: 52px;
  min-width: 34px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 4px 3px;
  border-radius: 6px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : 'transparent'};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  opacity: ${({ $dimmed }) => ($dimmed ? 0.45 : 1)};
  cursor: pointer;
  transition: opacity 0.14s ease, background 0.14s ease;

  &:hover {
    opacity: 1;
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const CenturyBarCount = styled.span<{ $active: boolean }>`
  font-size: 10.5px;
  font-weight: 700;
  line-height: 1;
  ${DIGIT_DISPLAY}
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
`

const CenturyBarTrack = styled.span<{ $active: boolean }>`
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 100%;
  max-width: 24px;
  height: 54px;
  border-radius: 4px 4px 0 0;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  overflow: hidden;
`

const CenturyBarFill = styled.span<{ $highlight: boolean }>`
  width: 100%;
  border-radius: 4px 4px 0 0;
  background: ${({ theme, $highlight }) =>
    $highlight
      ? theme.mode === 'dark'
        ? 'linear-gradient(180deg, #a5b4fc 0%, #6366f1 100%)'
        : 'linear-gradient(180deg, #4f46e5 0%, #6366f1 100%)'
      : theme.mode === 'dark'
        ? 'rgba(165, 180, 252, 0.52)'
        : 'rgba(99, 102, 241, 0.45)'};
  transition: height 0.22s ease;
`

const CenturyBarAxis = styled.span<{ $active: boolean }>`
  font-size: 10px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  white-space: nowrap;
  ${DIGIT_DISPLAY}
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
`

const HistFooterNote = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const TreatyPartnerRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const TreatyPartnerRowBtn = styled.button<{ $active?: boolean }>`
  appearance: none;
  display: grid;
  grid-template-columns: 22px minmax(92px, 138px) minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 3px 6px;
  margin: 0 -6px;
  border: none;
  border-radius: ${RADIUS.XS};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  font-family: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const TreatyPartnerRank = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const TreatyPartnerName = styled.span`
  font-size: 12.5px;
  font-weight: 650;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const TreatyPartnerBarTrack = styled.div`
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  overflow: hidden;
`

const TreatyPartnerBarFill = styled.div<{ $active?: boolean }>`
  height: 100%;
  border-radius: 999px;
  background: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
  opacity: ${({ $active }) => ($active ? 0.9 : 0.45)};
`

const TreatyPartnerCount = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  ${DIGIT_DISPLAY}
`

const TreatyPartnerEmpty = styled.div`
  padding: 12px 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CountryLedgerWorkspace = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin-top: -10px;
`

const CountryControlRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 14px;
  padding: 10px 0;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const CountryControlLeft = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
  flex: 1 1 320px;
`

const PartnerSelectWrap = styled.div`
  width: 204px;
  min-width: 164px;
`

const CountryQuickChipRow = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 3px;
`

const CountryQuickChip = styled.button<{ $active: boolean }>`
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

const ClearSearchIconBtn = styled.button`
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

const CountryControlRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
`

const CountryResultCount = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
  white-space: nowrap;

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const CountryActiveChipBar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 0;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const ActiveFilterTag = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;
`

const Empty = styled.div`
  padding: 32px 0;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 13px;
`

const CountryTableScroll = styled.div`
  overflow-x: auto;
`

const CountryTreatyTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
`

const CountryTh = styled.th`
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

const CountrySortThBtn = styled.button<{ $active?: boolean }>`
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

const CountryHoverArrow = styled.span`
  display: inline-flex;
  align-items: center;
  opacity: 0;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
`

const CountryTreatyTitle = styled.span`
  font-size: 13.5px;
  font-weight: 720;
  color: ${({ theme }) => theme.colors.text.primary};
  transition: color 0.12s ease;
`

const CountryTr = styled.tr`
  cursor: pointer;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  transition: background 0.12s ease;

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};

    ${CountryTreatyTitle} {
      color: ${({ theme }) => ledgerAccent(theme.mode)};
    }

    ${CountryHoverArrow} {
      opacity: 0.9;
      transform: translate(1px, -1px);
    }
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
  }
`

const CountryTd = styled.td`
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

const CountryDateStatusWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
`

const CountryStatusDot = styled.span<{
  $tone: 'active' | 'violated' | 'expired'
}>`
  width: 6px;
  height: 6px;
  border-radius: 999px;
  flex-shrink: 0;
  background: ${({ $tone }) =>
    $tone === 'violated'
      ? '#ef4444'
      : $tone === 'expired'
        ? '#d97706'
        : '#10b981'};
  opacity: ${({ $tone }) => ($tone === 'active' ? 0.8 : 0.9)};
`

const CountryDateText = styled.span`
  font-size: 12.5px;
  ${DIGIT_DISPLAY}
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CountryStatusNote = styled.span<{
  $tone: 'active' | 'violated' | 'expired'
}>`
  font-size: 11.5px;
  font-weight: 600;
  ${DIGIT_DISPLAY}
  color: ${({ theme, $tone }) =>
    $tone === 'violated'
      ? theme.mode === 'dark'
        ? '#fca5a5'
        : '#b91c1c'
      : $tone === 'expired'
        ? theme.mode === 'dark'
          ? '#fcd34d'
          : '#b45309'
        : theme.colors.text.tertiary};
`

const CountryTreatyNameLine = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
  line-height: 1.38;
`

const CountryTreatyAlias = styled.span`
  font-size: 12px;
  font-weight: 450;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CountryTypeCell = styled.div`
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  max-width: 190px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const CountryTypeText = styled.span<{ $color: string }>`
  font-size: 12.5px;
  font-weight: 650;
  color: ${({ $color }) => $color};
  flex-shrink: 0;
`

const CountrySubjectSub = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const CountryPartnerPlainRow = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0 5px;
  min-width: 0;
  line-height: 1.4;
`

const CountryPartnerLinkBtn = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  font-weight: 550;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const CountryPartnerPlainSpan = styled.span`
  font-size: 12.5px;
  font-weight: 550;
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const CountryMidDot = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  opacity: 0.65;
`

const CountryPartnerExtra = styled.span`
  font-size: 11.5px;
  font-weight: 550;
  ${DIGIT_DISPLAY}
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`

const CountryLocSpan = styled.span`
  display: block;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const CountryEmptyDash = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  opacity: 0.65;
`
