import React, { useEffect, useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createPortal } from 'react-dom'
import {
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiLayers,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { useCountries } from '@/features/country/api'
import { useHistoricalCountries } from '@/features/historical-country/use-historical-countries.hook'
import { linkCabinetToEvent } from '@/shared/api/cabinet-events'
import {
  addCabinetPoliticalParty,
  getPoliticalParties,
} from '@/shared/api/election'
import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import {
  type CreateGovernmentPositionTenureDto,
  type SuggestedCabinetMemberDto,
  personCareerApi,
} from '@/shared/api/person-career'
import {
  createPerson,
  type Era,
  getPersonsByHistoricalCountryUnion,
  getPersonsByTenureCountry,
  type PersonSearchItem,
  searchPersons,
} from '@/shared/api/persons'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { Z_INDEX } from '@/shared/styles/z-index'
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/shared/ui/searchable-select'
import { notify } from '@/shared/ui/toast'

import { formatDate, getPersonName } from './cabinets-section.helpers'
import { LinkedEventPickerField } from './linked-event-picker-field'

export type CabinetFormMode = 'head' | 'collective'
export type HeadTenureActionMode = 'new_tenure' | 'reshuffle_existing'

export interface CabinetFormPolityOption {
  id: string
  name: string
  kind: 'modern' | 'historical'
  modernCountryId?: string | null
  eraLabel?: string | null
}

export interface ExistingHeadTenureOption {
  id: string
  personId?: string | null
  person?: Parameters<typeof getPersonName>[0] & { id?: string | null }
  title?: string | null
  positionType?: string | null
  positionDefinitionId?: string | null
  positionDefinition?: {
    id?: string
    title?: string | null
    positionType?: string | null
    isMonarchical?: boolean | null
  } | null
  countryId?: string | null
  historicalCountryId?: string | null
  ordinal?: number | null
  subTermNumber?: number | null
  partyId?: string | null
  party?: { id?: string | null } | null
  startDate?: string | null
  endDate?: string | null
  startEra?: string | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  endEra?: string | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
  appointmentMethod?: string | null
  endReason?: string | null
  endReasonDetail?: string | null
  notes?: string | null
  _existingCabinetCount?: number
}

export interface EditableCabinetRecord {
  id: string
  name?: string | null
  description?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
  startDate?: string | null
  endDate?: string | null
  startEra?: string | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  endEra?: string | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
  headTenure?: ExistingHeadTenureOption | null
}

interface ScopedPositionOption {
  id: string
  title: string
  positionType?: string | null
  isMonarchical?: boolean | null
  scopes?: Array<{
    countryId?: string | null
    historicalCountryId?: string | null
  }> | null
}

export interface CabinetFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: (savedCabinetId?: string) => void
  isDark?: boolean
  /**
   * 국가 상세 페이지에서 열 때는 전달.
   * 전 국가 카탈로그(/government)나 상세 지면에서 열 때는 생략 가능(모달 내 국가 선택기 노출).
   */
  country?: UnifiedCountry | null
  /** 전 국가 카탈로그에서 현재 선택된 국가 필터(`m:uuid` 또는 `h:uuid`) 초기값 */
  initialPolityValue?: string
  constituentPolities?: Array<{
    id: string
    name: string
    startYear?: number | null
    endYear?: number | null
    startEra?: string | null
    endEra?: string | null
  }>
  defaultPolityFilterId?: string
  headPositionOptions?: ScopedPositionOption[]
  existingHeadTenures?: ExistingHeadTenureOption[]
  editingCabinet?: EditableCabinetRecord | null
}

interface ParsedDateParts {
  era: Era
  year: string
  month: string
  day: string
}

const DEFAULT_EXECUTIVE_ROLE_PRESETS: Array<{
  title: string
  positionType: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT'
  isMonarchical?: boolean
}> = [
  { title: '대통령', positionType: 'HEAD_OF_STATE' },
  { title: '총리', positionType: 'HEAD_OF_GOVERNMENT' },
  { title: '내각총리대신', positionType: 'HEAD_OF_GOVERNMENT' },
  { title: '국무총리', positionType: 'HEAD_OF_GOVERNMENT' },
  { title: '수상', positionType: 'HEAD_OF_GOVERNMENT' },
  { title: '재상', positionType: 'HEAD_OF_GOVERNMENT' },
  { title: '영의정', positionType: 'HEAD_OF_GOVERNMENT' },
  { title: '승상', positionType: 'HEAD_OF_GOVERNMENT' },
  { title: '집정관', positionType: 'HEAD_OF_STATE' },
  { title: '권한대행', positionType: 'HEAD_OF_GOVERNMENT' },
  { title: '최고지도자', positionType: 'HEAD_OF_STATE' },
  { title: '국왕(친정)', positionType: 'HEAD_OF_STATE', isMonarchical: true },
]

function parseStructuredOrIsoDate(
  record:
    | {
        era?: string | null
        year?: number | null
        month?: number | null
        day?: number | null
        isoDate?: string | null
      }
    | null
    | undefined,
): ParsedDateParts {
  if (!record) {
    return { era: 'AD', year: '', month: '', day: '' }
  }
  if (record.year != null && Number.isFinite(Number(record.year))) {
    const numericYear = Number(record.year)
    return {
      era: record.era === 'BC' || numericYear < 0 ? 'BC' : 'AD',
      year: String(Math.abs(numericYear)),
      month: record.month != null ? String(record.month) : '',
      day: record.day != null ? String(record.day) : '',
    }
  }
  const rawIso = record.isoDate?.trim()
  if (!rawIso) {
    return { era: 'AD', year: '', month: '', day: '' }
  }
  const isoMatch = /^(-?\d{1,6})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/.exec(rawIso)
  if (!isoMatch) {
    return { era: 'AD', year: '', month: '', day: '' }
  }
  const parsedYear = Number(isoMatch[1])
  if (!Number.isFinite(parsedYear) || parsedYear === 0) {
    return { era: 'AD', year: '', month: '', day: '' }
  }
  return {
    era: parsedYear < 0 ? 'BC' : 'AD',
    year: String(Math.abs(parsedYear)),
    month: isoMatch[2] ? String(Number(isoMatch[2])) : '',
    day: isoMatch[3] ? String(Number(isoMatch[3])) : '',
  }
}

function inferExecutivePositionType(
  roleTitle: string,
  explicitType?: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT' | null,
): 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT' {
  if (
    explicitType === 'HEAD_OF_STATE' ||
    explicitType === 'HEAD_OF_GOVERNMENT'
  ) {
    return explicitType
  }
  const normalized = roleTitle.trim()
  if (
    /대통령|국가원수|국가주석|최고지도자|집정관|제1집정|호국경|총통|국왕|황제|군주|여왕|대공|술탄|칼리프|파라오|섭정/.test(
      normalized,
    )
  ) {
    return 'HEAD_OF_STATE'
  }
  return 'HEAD_OF_GOVERNMENT'
}

function formatPolityEraRange(polity: {
  startYear?: number | null
  endYear?: number | null
  startEra?: string | null
  endEra?: string | null
}): string | null {
  if (polity.startYear == null && polity.endYear == null) return null
  const startPart =
    polity.startYear != null
      ? `${polity.startEra === 'BC' ? 'BC ' : ''}${Math.abs(polity.startYear)}`
      : ''
  const endPart =
    polity.endYear != null
      ? `${polity.endEra === 'BC' ? 'BC ' : ''}${Math.abs(polity.endYear)}`
      : '현재'
  return `${startPart}~${endPart}`
}

function toChronologyKey(
  dateInfo: { era: Era; year: number; month?: number; day?: number },
  edge: 'start' | 'end',
): number {
  const signedYear =
    dateInfo.era === 'BC' ? -Math.abs(dateInfo.year) : Math.abs(dateInfo.year)
  const monthPart = dateInfo.month ?? (edge === 'start' ? 1 : 12)
  const dayPart = dateInfo.day ?? (edge === 'start' ? 1 : 31)
  return signedYear * 10000 + monthPart * 100 + dayPart
}

function isDefinitionCompatibleWithAxis(
  definition: ScopedPositionOption,
  axis: { countryId: string | null; historicalCountryId: string | null },
): boolean {
  const scopes = definition.scopes
  if (!scopes || scopes.length === 0) return true
  return scopes.some((scopeItem) => {
    if (axis.historicalCountryId) {
      return (
        scopeItem.historicalCountryId === axis.historicalCountryId ||
        (!scopeItem.historicalCountryId &&
          Boolean(axis.countryId) &&
          scopeItem.countryId === axis.countryId)
      )
    }
    if (axis.countryId) {
      return (
        scopeItem.countryId === axis.countryId &&
        !scopeItem.historicalCountryId
      )
    }
    return false
  })
}

export const CabinetFormModal: React.FC<CabinetFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  country = null,
  initialPolityValue = '',
  constituentPolities = [],
  defaultPolityFilterId = '',
  headPositionOptions = [],
  existingHeadTenures = [],
  editingCabinet = null,
}) => {
  const queryClient = useQueryClient()
  const isEditing = Boolean(editingCabinet)
  const isStandaloneCatalogMode = !country

  // Standalone global catalog queries (only active when country prop is omitted)
  const { data: globalCountries = [] } = useCountries({
    enabled: isOpen && isStandaloneCatalogMode,
  })
  const { data: globalHistoricalCountries = [] } = useHistoricalCountries({
    enabled: isOpen && isStandaloneCatalogMode,
  })

  const [standalonePolityValue, setStandalonePolityValue] =
    useState<string>('')

  const standaloneSelectOptions = useMemo<SearchableSelectOption[]>(() => {
    if (!isStandaloneCatalogMode) return []
    const modernOpts: SearchableSelectOption[] = [...globalCountries]
      .sort((leftItem, rightItem) =>
        leftItem.name.localeCompare(rightItem.name, 'ko'),
      )
      .map((countryItem) => ({
        value: `m:${countryItem.id}`,
        label: `${countryItem.flagEmoji ?? ''} ${countryItem.name}`.trim(),
        group: '현대 국가',
      }))
    const historicalOpts: SearchableSelectOption[] = [
      ...globalHistoricalCountries,
    ]
      .sort((leftItem, rightItem) =>
        leftItem.name.localeCompare(rightItem.name, 'ko'),
      )
      .map((histItem) => {
        const rangeText = formatPolityEraRange(histItem)
        return {
          value: `h:${histItem.id}`,
          label: rangeText ? `${histItem.name} (${rangeText})` : histItem.name,
          group: '역사적 국가 · 왕조 · 정체',
        }
      })
    return [...modernOpts, ...historicalOpts]
  }, [isStandaloneCatalogMode, globalCountries, globalHistoricalCountries])

  // Polity options when country prop IS provided (Country Detail mode)
  const polityOptions = useMemo<CabinetFormPolityOption[]>(() => {
    if (!country) return []
    const list: CabinetFormPolityOption[] = []
    if (country.type === 'modern') {
      list.push({
        id: country.id,
        name: `${country.name} (현대국가)`,
        kind: 'modern',
        modernCountryId: country.id,
      })
      for (const histItem of country.historicalCountries ?? []) {
        list.push({
          id: histItem.id,
          name: histItem.name,
          kind: 'historical',
          modernCountryId: country.id,
          eraLabel: formatPolityEraRange(histItem),
        })
      }
    } else {
      list.push({
        id: country.id,
        name:
          constituentPolities.length > 0
            ? `${country.name} (통합·제국 본체)`
            : country.name,
        kind: 'historical',
        modernCountryId: null,
        eraLabel: formatPolityEraRange(country),
      })
      for (const constituentItem of constituentPolities) {
        if (constituentItem.id === country.id) continue
        list.push({
          id: constituentItem.id,
          name: constituentItem.name,
          kind: 'historical',
          modernCountryId: null,
          eraLabel: formatPolityEraRange(constituentItem),
        })
      }
    }
    return list
  }, [country, constituentPolities])

  const [mode, setMode] = useState<CabinetFormMode>('head')
  const [selectedPolityId, setSelectedPolityId] = useState<string>(
    country?.id ?? '',
  )
  const [headActionMode, setHeadActionMode] =
    useState<HeadTenureActionMode>('new_tenure')
  const [showExistingTenureBrowser, setShowExistingTenureBrowser] =
    useState(false)
  const [existingTenureSearch, setExistingTenureSearch] = useState('')
  const [selectedExistingTenureId, setSelectedExistingTenureId] = useState<
    string | null
  >(null)

  // Person selection & quick create state
  const [selectedPersonId, setSelectedPersonId] = useState<string>('')
  const [selectedPersonLabel, setSelectedPersonLabel] = useState<string>('')
  const [personQuery, setPersonQuery] = useState<string>('')
  const [showQuickCreatePerson, setShowQuickCreatePerson] =
    useState<boolean>(false)
  const [quickPersonSurname, setQuickPersonSurname] = useState<string>('')
  const [quickPersonGivenName, setQuickPersonGivenName] = useState<string>('')
  const [quickPersonOriginalName, setQuickPersonOriginalName] =
    useState<string>('')

  // Role & term state
  const [roleTitle, setRoleTitle] = useState<string>('대통령')
  const [positionTypeOverride, setPositionTypeOverride] = useState<
    'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT'
  >('HEAD_OF_STATE')
  const [selectedPositionDefId, setSelectedPositionDefId] = useState<
    string | null
  >(null)
  const [ordinalInput, setOrdinalInput] = useState<string>('')
  const [subTermInput, setSubTermInput] = useState<string>('')

  // Period state (Start & End)
  const [startEra, setStartEra] = useState<Era>('AD')
  const [startYear, setStartYear] = useState<string>('')
  const [startMonth, setStartMonth] = useState<string>('')
  const [startDay, setStartDay] = useState<string>('')

  const [endEra, setEndEra] = useState<Era>('AD')
  const [endYear, setEndYear] = useState<string>('')
  const [endMonth, setEndMonth] = useState<string>('')
  const [endDay, setEndDay] = useState<string>('')

  // Edit mode protection: whether editing dates should also update headTenure's overall term
  const [syncPeriodToHeadTenure, setSyncPeriodToHeadTenure] =
    useState<boolean>(true)

  // Cabinet naming & description
  const [cabinetName, setCabinetName] = useState<string>('')
  const [cabinetDescription, setCabinetDescription] = useState<string>('')

  // Advanced optional details
  const [showAdvancedDetails, setShowAdvancedDetails] = useState<boolean>(false)
  const [partyId, setPartyId] = useState<string>('')
  const [autoLinkRulingParty, setAutoLinkRulingParty] = useState<boolean>(true)
  const [originEventId, setOriginEventId] = useState<string>('')
  const [appointmentMethod, setAppointmentMethod] = useState<string>('')
  const [endReason, setEndReason] = useState<string>('')
  const [endReasonDetail, setEndReasonDetail] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  // Post-create smart minister onboarding step
  const [onboardingCabinetId, setOnboardingCabinetId] = useState<string | null>(
    null,
  )
  const [suggestedMinisters, setSuggestedMinisters] = useState<
    SuggestedCabinetMemberDto[]
  >([])
  const [checkedMinisterIds, setCheckedMinisterIds] = useState<string[]>([])

  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Determine effective countryId / historicalCountryId & display label
  const resolvedPolityAxis = useMemo(() => {
    if (isStandaloneCatalogMode) {
      if (standalonePolityValue.startsWith('m:')) {
        const modernId = standalonePolityValue.slice(2)
        const foundModern = globalCountries.find(
          (countryItem) => countryItem.id === modernId,
        )
        return {
          countryId: modernId || null,
          historicalCountryId: null,
          displayName: foundModern?.name ?? '선택 국가',
          isHistorical: false,
        }
      }
      if (standalonePolityValue.startsWith('h:')) {
        const histId = standalonePolityValue.slice(2)
        const foundHist = globalHistoricalCountries.find(
          (histItem) => histItem.id === histId,
        )
        const linkedModernId =
          foundHist?.parentModernCountryIds?.[0] ??
          (
            foundHist as
              | {
                  modernCountries?: Array<{ modernCountryId?: string | null }>
                  countryId?: string | null
                }
              | undefined
          )?.modernCountries?.[0]?.modernCountryId ??
          (foundHist as { countryId?: string | null } | undefined)?.countryId ??
          null
        return {
          countryId: linkedModernId,
          historicalCountryId: histId || null,
          displayName: foundHist?.name ?? '선택 역사국가',
          isHistorical: true,
        }
      }
      return {
        countryId: null,
        historicalCountryId: null,
        displayName: '',
        isHistorical: false,
      }
    }

    const isHistPage = country.type === 'historical'
    const matchedPolity = polityOptions.find(
      (polityOption) => polityOption.id === selectedPolityId,
    )
    if (!matchedPolity) {
      return {
        countryId: isHistPage ? null : country.id,
        historicalCountryId: isHistPage ? country.id : null,
        displayName: country.name,
        isHistorical: isHistPage,
      }
    }
    if (matchedPolity.kind === 'modern') {
      return {
        countryId: matchedPolity.id,
        historicalCountryId: null,
        displayName: country.name,
        isHistorical: false,
      }
    }
    return {
      countryId: isHistPage ? null : country.id,
      historicalCountryId: matchedPolity.id,
      displayName: matchedPolity.name,
      isHistorical: true,
    }
  }, [
    isStandaloneCatalogMode,
    standalonePolityValue,
    globalCountries,
    globalHistoricalCountries,
    country,
    polityOptions,
    selectedPolityId,
  ])

  // Dynamically load position definitions & existing head tenures for the active polity when not supplied via props
  const { data: fetchedDefinitions = [] } = useQuery({
    queryKey: [
      'cabinet-form-pos-defs',
      resolvedPolityAxis.countryId ?? '',
      resolvedPolityAxis.historicalCountryId ?? '',
    ],
    queryFn: async () => {
      const defs = await personCareerApi.getPositionDefinitions({
        ...(resolvedPolityAxis.countryId
          ? { countryId: resolvedPolityAxis.countryId }
          : {}),
        ...(resolvedPolityAxis.historicalCountryId
          ? { historicalCountryId: resolvedPolityAxis.historicalCountryId }
          : {}),
      })
      return Array.isArray(defs) ? (defs as ScopedPositionOption[]) : []
    },
    enabled:
      isOpen &&
      headPositionOptions.length === 0 &&
      Boolean(
        resolvedPolityAxis.countryId || resolvedPolityAxis.historicalCountryId,
      ),
    staleTime: 60_000,
  })

  const { data: fetchedCountryTenures = [] } = useQuery({
    queryKey: [
      'cabinet-form-existing-tenures',
      resolvedPolityAxis.countryId ?? '',
      resolvedPolityAxis.historicalCountryId ?? '',
    ],
    queryFn: async () => {
      const [rawTenures, rawCabs] = await Promise.all([
        personCareerApi.getTenuresByCountry({
          ...(resolvedPolityAxis.historicalCountryId
            ? { historicalCountryId: resolvedPolityAxis.historicalCountryId }
            : resolvedPolityAxis.countryId
              ? { countryId: resolvedPolityAxis.countryId }
              : {}),
        }),
        personCareerApi.getCabinets({
          ...(resolvedPolityAxis.historicalCountryId
            ? { historicalCountryId: resolvedPolityAxis.historicalCountryId }
            : resolvedPolityAxis.countryId
              ? { countryId: resolvedPolityAxis.countryId }
              : {}),
          take: 500,
        }),
      ])
      const cabCountByHeadId = new Map<string, number>()
      for (const cabItem of rawCabs) {
        const headId = cabItem.headTenure?.id ?? cabItem.headTenureId
        if (headId) {
          cabCountByHeadId.set(headId, (cabCountByHeadId.get(headId) ?? 0) + 1)
        }
      }
      return (rawTenures as ExistingHeadTenureOption[])
        .filter((tenureItem) => {
          const effType =
            tenureItem.positionType ??
            tenureItem.positionDefinition?.positionType
          return (
            effType === 'HEAD_OF_STATE' || effType === 'HEAD_OF_GOVERNMENT'
          )
        })
        .map((tenureItem) => ({
          ...tenureItem,
          _existingCabinetCount: cabCountByHeadId.get(tenureItem.id) ?? 0,
        }))
    },
    enabled:
      isOpen &&
      existingHeadTenures.length === 0 &&
      Boolean(
        resolvedPolityAxis.countryId || resolvedPolityAxis.historicalCountryId,
      ),
    staleTime: 45_000,
  })

  const effectiveHeadPositionOptions = useMemo(() => {
    const sourceList =
      headPositionOptions.length > 0 ? headPositionOptions : fetchedDefinitions
    return sourceList.filter((defItem) => {
      const posType = defItem.positionType
      const isExec =
        posType === 'HEAD_OF_STATE' || posType === 'HEAD_OF_GOVERNMENT'
      if (!isExec) return false
      return isDefinitionCompatibleWithAxis(defItem, resolvedPolityAxis)
    })
  }, [headPositionOptions, fetchedDefinitions, resolvedPolityAxis])

  const effectiveExistingHeadTenures = useMemo(() => {
    const sourceList =
      existingHeadTenures.length > 0
        ? existingHeadTenures
        : fetchedCountryTenures
    return sourceList.filter((tenureItem) => {
      if (resolvedPolityAxis.historicalCountryId) {
        return (
          tenureItem.historicalCountryId ===
          resolvedPolityAxis.historicalCountryId
        )
      }
      if (resolvedPolityAxis.countryId) {
        return (
          tenureItem.countryId === resolvedPolityAxis.countryId &&
          !tenureItem.historicalCountryId
        )
      }
      return true
    })
  }, [existingHeadTenures, fetchedCountryTenures, resolvedPolityAxis])

  // Detect whether an edited cabinet is a reshuffle / distinct-period cabinet under a broader head tenure
  const isReshuffleOrDistinctPeriodEdit = useMemo(() => {
    if (!isEditing || !editingCabinet?.headTenure?.id) return false
    const headTenure = editingCabinet.headTenure
    if ((headTenure._existingCabinetCount ?? 0) > 1) return true
    const matchedFromList = effectiveExistingHeadTenures.find(
      (item) => item.id === headTenure.id,
    )
    if ((matchedFromList?._existingCabinetCount ?? 0) > 1) return true
    const hasOwnStart =
      editingCabinet.startYear != null &&
      headTenure.startYear != null &&
      (editingCabinet.startYear !== headTenure.startYear ||
        (editingCabinet.startMonth ?? null) !==
          (headTenure.startMonth ?? null))
    const hasOwnEnd =
      editingCabinet.startYear != null &&
      ((editingCabinet.endYear ?? null) !== (headTenure.endYear ?? null) ||
        (editingCabinet.endMonth ?? null) !== (headTenure.endMonth ?? null))
    return Boolean(hasOwnStart || hasOwnEnd)
  }, [isEditing, editingCabinet, effectiveExistingHeadTenures])

  // Initialize state when modal opens or editingCabinet changes
  useEffect(() => {
    if (!isOpen) return
    setErrorMessage(null)
    setOnboardingCabinetId(null)
    setSuggestedMinisters([])
    setCheckedMinisterIds([])
    setPersonQuery('')
    setShowQuickCreatePerson(false)
    setQuickPersonSurname('')
    setQuickPersonGivenName('')
    setQuickPersonOriginalName('')
    setShowExistingTenureBrowser(false)
    setExistingTenureSearch('')
    setOriginEventId('')
    setAutoLinkRulingParty(true)

    if (editingCabinet) {
      const headTenure = editingCabinet.headTenure
      const hasHeadTenure = Boolean(headTenure?.id)
      setMode(hasHeadTenure ? 'head' : 'collective')
      setHeadActionMode('new_tenure')
      setSelectedExistingTenureId(headTenure?.id ?? null)

      const editHistId =
        editingCabinet.historicalCountryId ??
        headTenure?.historicalCountryId ??
        null
      const editModernId =
        editingCabinet.countryId ?? headTenure?.countryId ?? null

      if (isStandaloneCatalogMode) {
        if (editHistId) {
          setStandalonePolityValue(`h:${editHistId}`)
        } else if (editModernId) {
          setStandalonePolityValue(`m:${editModernId}`)
        } else {
          setStandalonePolityValue(initialPolityValue || '')
        }
      } else if (
        editHistId &&
        polityOptions.some((opt) => opt.id === editHistId)
      ) {
        setSelectedPolityId(editHistId)
      } else if (
        editModernId &&
        polityOptions.some((opt) => opt.id === editModernId)
      ) {
        setSelectedPolityId(editModernId)
      } else if (country) {
        setSelectedPolityId(country.id)
      }

      if (hasHeadTenure && headTenure) {
        setSelectedPersonId(
          headTenure.personId ?? headTenure.person?.id ?? '',
        )
        setSelectedPersonLabel(
          headTenure.person ? getPersonName(headTenure.person) : '',
        )
        const initialTitle =
          headTenure.title ??
          headTenure.positionDefinition?.title ??
          '대통령'
        setRoleTitle(initialTitle)
        const initialPosType = inferExecutivePositionType(
          initialTitle,
          (headTenure.positionType ??
            headTenure.positionDefinition?.positionType) as
            | 'HEAD_OF_STATE'
            | 'HEAD_OF_GOVERNMENT'
            | null,
        )
        setPositionTypeOverride(initialPosType)
        setSelectedPositionDefId(
          headTenure.positionDefinitionId ??
            headTenure.positionDefinition?.id ??
            null,
        )
        setOrdinalInput(
          headTenure.ordinal != null ? String(headTenure.ordinal) : '',
        )
        setSubTermInput(
          headTenure.subTermNumber != null
            ? String(headTenure.subTermNumber)
            : '',
        )

        const parsedStart = parseStructuredOrIsoDate({
          era: editingCabinet.startEra ?? headTenure.startEra,
          year: editingCabinet.startYear ?? headTenure.startYear,
          month: editingCabinet.startMonth ?? headTenure.startMonth,
          day: editingCabinet.startDay ?? headTenure.startDay,
          isoDate: editingCabinet.startDate ?? headTenure.startDate,
        })
        setStartEra(parsedStart.era)
        setStartYear(parsedStart.year)
        setStartMonth(parsedStart.month)
        setStartDay(parsedStart.day)

        const parsedEnd = parseStructuredOrIsoDate({
          era:
            editingCabinet.startYear != null
              ? editingCabinet.endEra
              : (editingCabinet.endEra ?? headTenure.endEra),
          year:
            editingCabinet.startYear != null
              ? editingCabinet.endYear
              : (editingCabinet.endYear ?? headTenure.endYear),
          month:
            editingCabinet.startYear != null
              ? editingCabinet.endMonth
              : (editingCabinet.endMonth ?? headTenure.endMonth),
          day:
            editingCabinet.startYear != null
              ? editingCabinet.endDay
              : (editingCabinet.endDay ?? headTenure.endDay),
          isoDate:
            editingCabinet.startYear != null
              ? editingCabinet.endDate
              : (editingCabinet.endDate ?? headTenure.endDate),
        })
        setEndEra(parsedEnd.era)
        setEndYear(parsedEnd.year)
        setEndMonth(parsedEnd.month)
        setEndDay(parsedEnd.day)

        const multiCab = (headTenure._existingCabinetCount ?? 0) > 1
        const diffStart =
          editingCabinet.startYear != null &&
          headTenure.startYear != null &&
          (editingCabinet.startYear !== headTenure.startYear ||
            (editingCabinet.startMonth ?? null) !==
              (headTenure.startMonth ?? null))
        const diffEnd =
          editingCabinet.startYear != null &&
          ((editingCabinet.endYear ?? null) !== (headTenure.endYear ?? null) ||
            (editingCabinet.endMonth ?? null) !==
              (headTenure.endMonth ?? null))
        setSyncPeriodToHeadTenure(!(multiCab || diffStart || diffEnd))

        setCabinetName(editingCabinet.name ?? '')
        setCabinetDescription(editingCabinet.description ?? '')
        setPartyId(headTenure.partyId ?? headTenure.party?.id ?? '')
        setAutoLinkRulingParty(false)
        setAppointmentMethod(headTenure.appointmentMethod ?? '')
        setEndReason(headTenure.endReason ?? '')
        setEndReasonDetail(headTenure.endReasonDetail ?? '')
        setNotes(headTenure.notes ?? '')
        setShowAdvancedDetails(
          Boolean(
            headTenure.partyId ||
              headTenure.party?.id ||
              headTenure.appointmentMethod ||
              headTenure.endReason ||
              headTenure.notes,
          ),
        )
      } else {
        setSelectedPersonId('')
        setSelectedPersonLabel('')
        setCabinetName(editingCabinet.name ?? '')
        setCabinetDescription(editingCabinet.description ?? '')
        const parsedStart = parseStructuredOrIsoDate({
          era: editingCabinet.startEra,
          year: editingCabinet.startYear,
          month: editingCabinet.startMonth,
          day: editingCabinet.startDay,
          isoDate: editingCabinet.startDate,
        })
        setStartEra(parsedStart.era)
        setStartYear(parsedStart.year)
        setStartMonth(parsedStart.month)
        setStartDay(parsedStart.day)

        const parsedEnd = parseStructuredOrIsoDate({
          era: editingCabinet.endEra,
          year: editingCabinet.endYear,
          month: editingCabinet.endMonth,
          day: editingCabinet.endDay,
          isoDate: editingCabinet.endDate,
        })
        setEndEra(parsedEnd.era)
        setEndYear(parsedEnd.year)
        setEndMonth(parsedEnd.month)
        setEndDay(parsedEnd.day)
        setSyncPeriodToHeadTenure(false)
        setShowAdvancedDetails(false)
      }
      return
    }

    // Create Mode Defaults
    setMode('head')
    setHeadActionMode('new_tenure')
    setSelectedExistingTenureId(null)
    setSyncPeriodToHeadTenure(true)
    if (isStandaloneCatalogMode) {
      setStandalonePolityValue(initialPolityValue || '')
    } else if (
      defaultPolityFilterId &&
      polityOptions.some((opt) => opt.id === defaultPolityFilterId)
    ) {
      setSelectedPolityId(defaultPolityFilterId)
    } else if (country) {
      setSelectedPolityId(country.id)
    }
    setSelectedPersonId('')
    setSelectedPersonLabel('')

    const firstDef = headPositionOptions[0]
    const defaultRoleTitle =
      firstDef?.title ?? (country?.type === 'historical' ? '총리' : '대통령')
    setRoleTitle(defaultRoleTitle)
    setSelectedPositionDefId(firstDef?.id ?? null)
    setPositionTypeOverride(
      inferExecutivePositionType(
        defaultRoleTitle,
        firstDef?.positionType as
          | 'HEAD_OF_STATE'
          | 'HEAD_OF_GOVERNMENT'
          | null,
      ),
    )
    setOrdinalInput('')
    setSubTermInput('')
    setStartEra('AD')
    setStartYear('')
    setStartMonth('')
    setStartDay('')
    setEndEra('AD')
    setEndYear('')
    setEndMonth('')
    setEndDay('')
    setCabinetName('')
    setCabinetDescription('')
    setPartyId('')
    setAppointmentMethod('')
    setEndReason('')
    setEndReasonDetail('')
    setNotes('')
    setShowAdvancedDetails(false)
  }, [
    isOpen,
    editingCabinet,
    isStandaloneCatalogMode,
    initialPolityValue,
    defaultPolityFilterId,
    polityOptions,
    country,
    headPositionOptions,
  ])

  // Queries for person suggestions & search
  const { data: countryPersons = [] } = useQuery({
    queryKey: [
      'cabinet-form-country-persons',
      resolvedPolityAxis.countryId ?? '',
      resolvedPolityAxis.historicalCountryId ?? '',
    ],
    queryFn: async () => {
      if (resolvedPolityAxis.historicalCountryId) {
        return getPersonsByHistoricalCountryUnion(
          resolvedPolityAxis.historicalCountryId,
        )
      }
      if (resolvedPolityAxis.countryId) {
        return getPersonsByTenureCountry(resolvedPolityAxis.countryId)
      }
      return []
    },
    enabled:
      isOpen &&
      Boolean(
        resolvedPolityAxis.countryId || resolvedPolityAxis.historicalCountryId,
      ),
    staleTime: 60_000,
  })

  const { data: searchedPersons = [] } = useQuery({
    queryKey: ['cabinet-form-person-search', personQuery.trim()],
    queryFn: () =>
      searchPersons({
        query: personQuery.trim(),
        limit: 16,
      }),
    enabled: isOpen && personQuery.trim().length >= 1,
    staleTime: 30_000,
  })

  const { data: parties = [] } = useQuery({
    queryKey: [
      'cabinet-form-parties',
      resolvedPolityAxis.countryId ?? '',
      resolvedPolityAxis.historicalCountryId ?? '',
    ],
    queryFn: () =>
      getPoliticalParties({
        ...(resolvedPolityAxis.countryId
          ? { countryId: resolvedPolityAxis.countryId }
          : {}),
        ...(resolvedPolityAxis.historicalCountryId
          ? { historicalCountryId: resolvedPolityAxis.historicalCountryId }
          : {}),
      }),
    enabled:
      isOpen &&
      Boolean(
        resolvedPolityAxis.countryId || resolvedPolityAxis.historicalCountryId,
      ),
    staleTime: 60_000,
  })

  const personCandidates = useMemo(() => {
    if (personQuery.trim().length > 0) {
      return searchedPersons.map((personItem: PersonSearchItem) => ({
        id: personItem.id,
        label: getPersonDisplayName(personItem),
        subLabel: personItem.originalName ?? null,
      }))
    }
    return countryPersons.slice(0, 14).map((personItem) => ({
      id: personItem.id,
      label: getPersonDisplayName(personItem),
      subLabel:
        (personItem as { originalName?: string | null }).originalName ?? null,
    }))
  }, [personQuery, searchedPersons, countryPersons])

  // Smart Detection: Existing head tenures for the currently selected person
  const matchingExistingTenuresForPerson = useMemo(() => {
    if (!selectedPersonId || isEditing) return []
    return effectiveExistingHeadTenures.filter((tenureItem) => {
      const tenurePersonId = tenureItem.personId ?? tenureItem.person?.id
      return tenurePersonId === selectedPersonId
    })
  }, [selectedPersonId, isEditing, effectiveExistingHeadTenures])

  const selectedExistingTenure = useMemo(() => {
    if (!selectedExistingTenureId) return null
    return (
      effectiveExistingHeadTenures.find(
        (tenureItem) => tenureItem.id === selectedExistingTenureId,
      ) ?? null
    )
  }, [selectedExistingTenureId, effectiveExistingHeadTenures])

  // Next Ordinal Smart Suggestion (제 N+1 대)
  const suggestedNextOrdinal = useMemo<number | null>(() => {
    const cleanRole = roleTitle.trim()
    if (!cleanRole) return null
    let maxOrd = 0
    for (const tenureItem of effectiveExistingHeadTenures) {
      const itemTitle = (
        tenureItem.title ??
        tenureItem.positionDefinition?.title ??
        ''
      ).trim()
      const itemType =
        tenureItem.positionType ??
        tenureItem.positionDefinition?.positionType ??
        null
      const matchesRole =
        itemTitle === cleanRole ||
        (!itemTitle && itemType === positionTypeOverride)
      if (
        matchesRole &&
        tenureItem.ordinal != null &&
        Number.isFinite(tenureItem.ordinal) &&
        tenureItem.ordinal > maxOrd
      ) {
        maxOrd = tenureItem.ordinal
      }
    }
    return maxOrd > 0 ? maxOrd + 1 : null
  }, [effectiveExistingHeadTenures, roleTitle, positionTypeOverride])

  // Combined role presets (Country positionDefinitions + standard executive presets)
  const rolePresetChips = useMemo(() => {
    const seenTitles = new Set<string>()
    const result: Array<{
      title: string
      positionType: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT'
      positionDefId: string | null
    }> = []

    for (const defItem of effectiveHeadPositionOptions) {
      const cleanTitle = defItem.title?.trim()
      if (!cleanTitle || seenTitles.has(cleanTitle)) continue
      seenTitles.add(cleanTitle)
      result.push({
        title: cleanTitle,
        positionType: inferExecutivePositionType(
          cleanTitle,
          defItem.positionType as
            | 'HEAD_OF_STATE'
            | 'HEAD_OF_GOVERNMENT'
            | null,
        ),
        positionDefId: defItem.id,
      })
    }

    for (const presetItem of DEFAULT_EXECUTIVE_ROLE_PRESETS) {
      if (seenTitles.has(presetItem.title)) continue
      seenTitles.add(presetItem.title)
      result.push({
        title: presetItem.title,
        positionType: presetItem.positionType,
        positionDefId: null,
      })
    }

    return result
  }, [effectiveHeadPositionOptions])

  // Live preview of automatic cabinet name when cabinetName is left blank
  const autoCabinetNamePreview = useMemo(() => {
    const personLabel =
      selectedPersonLabel ||
      (selectedExistingTenure?.person
        ? getPersonName(selectedExistingTenure.person)
        : '수반')
    const ordinalText = ordinalInput.trim()
      ? `제${ordinalInput.trim()}대 `
      : selectedExistingTenure?.ordinal != null
        ? `제${selectedExistingTenure.ordinal}대 `
        : ''
    const suffix =
      positionTypeOverride === 'HEAD_OF_STATE' ? '행정부' : '내각'
    return `${ordinalText}${personLabel} ${suffix}`
  }, [
    selectedPersonLabel,
    selectedExistingTenure,
    ordinalInput,
    positionTypeOverride,
  ])

  const filteredExistingTenuresForBrowser = useMemo(() => {
    const keyword = existingTenureSearch.trim().toLowerCase()
    if (!keyword) return effectiveExistingHeadTenures
    return effectiveExistingHeadTenures.filter((tenureItem) => {
      const personLabel = getPersonName(tenureItem.person).toLowerCase()
      const titleLabel = String(
        tenureItem.title ?? tenureItem.positionDefinition?.title ?? '',
      ).toLowerCase()
      const startLabel = tenureItem.startDate
        ? formatDate(tenureItem.startDate).toLowerCase()
        : ''
      return (
        personLabel.includes(keyword) ||
        titleLabel.includes(keyword) ||
        startLabel.includes(keyword)
      )
    })
  }, [effectiveExistingHeadTenures, existingTenureSearch])

  const nearEventYear = useMemo<number | null>(() => {
    const numericStart = Number(startYear.trim())
    if (!startYear.trim() || !Number.isFinite(numericStart) || numericStart <= 0) {
      return null
    }
    return startEra === 'BC' ? -numericStart : numericStart
  }, [startEra, startYear])

  const applyExistingTenureForReshuffle = (
    tenureItem: ExistingHeadTenureOption,
  ) => {
    setHeadActionMode('reshuffle_existing')
    setSelectedExistingTenureId(tenureItem.id)
    setSelectedPersonId(tenureItem.personId ?? tenureItem.person?.id ?? '')
    setSelectedPersonLabel(
      tenureItem.person ? getPersonName(tenureItem.person) : '',
    )
    const parsedStart = parseStructuredOrIsoDate({
      era: tenureItem.startEra,
      year: tenureItem.startYear,
      month: tenureItem.startMonth,
      day: tenureItem.startDay,
      isoDate: tenureItem.startDate,
    })
    setStartEra(parsedStart.era)
    setStartYear(parsedStart.year)
    setStartMonth(parsedStart.month)
    setStartDay(parsedStart.day)

    const parsedEnd = parseStructuredOrIsoDate({
      era: tenureItem.endEra,
      year: tenureItem.endYear,
      month: tenureItem.endMonth,
      day: tenureItem.endDay,
      isoDate: tenureItem.endDate,
    })
    setEndEra(parsedEnd.era)
    setEndYear(parsedEnd.year)
    setEndMonth(parsedEnd.month)
    setEndDay(parsedEnd.day)
    setShowExistingTenureBrowser(false)
  }

  const quickCreatePersonMutation = useMutation({
    mutationFn: async () => {
      const trimmedGiven = quickPersonGivenName.trim()
      if (!trimmedGiven) {
        throw new Error('인물의 이름(또는 단명)을 입력해주세요.')
      }
      return createPerson({
        name: trimmedGiven,
        surname: quickPersonSurname.trim() || null,
        originalName: quickPersonOriginalName.trim() || undefined,
        ...(resolvedPolityAxis.countryId
          ? { countryId: resolvedPolityAxis.countryId }
          : {}),
        ...(resolvedPolityAxis.historicalCountryId
          ? { historicalCountryId: resolvedPolityAxis.historicalCountryId }
          : {}),
        ...(resolvedPolityAxis.countryId ||
        resolvedPolityAxis.historicalCountryId
          ? {
              countryAffiliations: [
                {
                  affiliationType: 'CITIZENSHIP',
                  ...(resolvedPolityAxis.countryId
                    ? { countryId: resolvedPolityAxis.countryId }
                    : {}),
                  ...(resolvedPolityAxis.historicalCountryId
                    ? {
                        historicalCountryId:
                          resolvedPolityAxis.historicalCountryId,
                      }
                    : {}),
                  priority: 0,
                },
              ],
            }
          : {}),
      } as Parameters<typeof createPerson>[0])
    },
    onSuccess: (createdPerson) => {
      const displayLabel = getPersonDisplayName(createdPerson)
      setSelectedPersonId(createdPerson.id)
      setSelectedPersonLabel(displayLabel)
      setShowQuickCreatePerson(false)
      setPersonQuery('')
      void queryClient.invalidateQueries({ queryKey: ['persons'] })
      void queryClient.invalidateQueries({
        queryKey: ['cabinet-form-country-persons'],
      })
    },
    onError: (mutationError) => {
      setErrorMessage(getApiErrorMessage(mutationError))
    },
  })

  const finalizeAndClose = (finalCabinetId?: string) => {
    invalidateTenureQueries(queryClient, {
      personId: selectedPersonId || null,
      cabinetId: finalCabinetId ?? editingCabinet?.id ?? null,
      countryId: resolvedPolityAxis.countryId ?? null,
      historicalCountryId: resolvedPolityAxis.historicalCountryId ?? null,
    })
    void queryClient.invalidateQueries({ queryKey: ['global-cabinets'] })
    void queryClient.invalidateQueries({ queryKey: ['global-cabinet-detail'] })
    void queryClient.invalidateQueries({
      queryKey: ['cabinet-political-parties'],
    })
    void queryClient.invalidateQueries({
      queryKey: ['cabinet-linked-events'],
    })
    onSaved?.(finalCabinetId ?? editingCabinet?.id)
    onClose()
  }

  const attachSuggestedMinistersMutation = useMutation({
    mutationFn: async () => {
      if (!onboardingCabinetId || checkedMinisterIds.length === 0) return
      const pickedRows = suggestedMinisters.filter((memberRow) =>
        checkedMinisterIds.includes(memberRow.tenureId),
      )
      await personCareerApi.attachCabinetMembers(
        onboardingCabinetId,
        pickedRows.map((memberRow) => ({
          tenureId: memberRow.tenureId,
          administrationDepartmentId:
            memberRow.administrationDepartment?.id ?? null,
          roleTitle:
            memberRow.title ?? memberRow.positionDefinition?.title ?? null,
        })),
      )
    },
    onSuccess: () => {
      notify.success(
        `동시대 부처 장관 ${checkedMinisterIds.length}명이 각료진에 편입되었습니다.`,
      )
      finalizeAndClose(onboardingCabinetId ?? undefined)
    },
    onError: (mutationError) => {
      setErrorMessage(getApiErrorMessage(mutationError))
    },
  })

  const saveCabinetMutation = useMutation({
    mutationFn: async () => {
      if (
        !resolvedPolityAxis.countryId &&
        !resolvedPolityAxis.historicalCountryId
      ) {
        throw new Error('소속 국가 또는 역사적 정치체를 먼저 선택해주세요.')
      }

      const parsedStartYear = Number(startYear.trim())
      if (
        !startYear.trim() ||
        !Number.isInteger(parsedStartYear) ||
        parsedStartYear <= 0
      ) {
        throw new Error('출범·취임 연도를 자연수로 입력해주세요.')
      }
      const parsedStartMonth = startMonth.trim()
        ? Number(startMonth.trim())
        : undefined
      const parsedStartDay = startDay.trim()
        ? Number(startDay.trim())
        : undefined
      const startDateInfo = {
        era: startEra,
        year: parsedStartYear,
        ...(parsedStartMonth ? { month: parsedStartMonth } : {}),
        ...(parsedStartDay ? { day: parsedStartDay } : {}),
      }

      let endDateInfo:
        | { era: Era; year: number; month?: number; day?: number }
        | null
        | undefined = undefined
      if (endYear.trim()) {
        const parsedEndYear = Number(endYear.trim())
        if (!Number.isInteger(parsedEndYear) || parsedEndYear <= 0) {
          throw new Error('종료·퇴임 연도가 올바르지 않습니다.')
        }
        const parsedEndMonth = endMonth.trim()
          ? Number(endMonth.trim())
          : undefined
        const parsedEndDay = endDay.trim() ? Number(endDay.trim()) : undefined
        endDateInfo = {
          era: endEra,
          year: parsedEndYear,
          ...(parsedEndMonth ? { month: parsedEndMonth } : {}),
          ...(parsedEndDay ? { day: parsedEndDay } : {}),
        }

        const startCompareKey = toChronologyKey(startDateInfo, 'start')
        const endCompareKey = toChronologyKey(endDateInfo, 'end')
        if (endCompareKey < startCompareKey) {
          throw new Error(
            '종료(퇴임·해산) 시점이 시작(취임·출범) 시점보다 앞설 수 없습니다. 기원전(BC)/서기(AD) 및 연·월·일을 확인해주세요.',
          )
        }
      } else if (isEditing) {
        endDateInfo = null
      }

      const postSaveEnrich = async (targetCabId: string | undefined) => {
        if (!targetCabId) return
        if (partyId && autoLinkRulingParty) {
          try {
            await addCabinetPoliticalParty(targetCabId, {
              partyId,
              role: 'LEADING',
              provenance: 'MANUAL',
            })
          } catch {
            // 이미 등록된 정당(409) 등은 무시
          }
        }
        if (originEventId.trim()) {
          try {
            await linkCabinetToEvent(
              originEventId.trim(),
              targetCabId,
              'ORIGIN',
            )
          } catch {
            // 중복 연결 등은 무시
          }
        }
      }

      // 1) Collective Leadership / Provisional Government Mode
      if (mode === 'collective') {
        const trimmedCollectiveName = cabinetName.trim()
        if (!trimmedCollectiveName) {
          throw new Error(
            '집단지도체제·과도정부 행정부의 명칭(예: 공안위원회, 연방평의회)을 입력해주세요.',
          )
        }
        if (isEditing && editingCabinet?.id) {
          const updatedCollective = (await personCareerApi.updateCabinet(
            editingCabinet.id,
            {
              name: trimmedCollectiveName,
              description: cabinetDescription.trim() || null,
              countryId: resolvedPolityAxis.countryId,
              historicalCountryId: resolvedPolityAxis.historicalCountryId,
              startDateInfo,
              endDateInfo,
            },
          )) as { id?: string } | null
          await postSaveEnrich(updatedCollective?.id ?? editingCabinet.id)
          return updatedCollective
        }
        const createdCollective = (await personCareerApi.createCabinet({
          headTenureId: null,
          name: trimmedCollectiveName,
          description: cabinetDescription.trim() || null,
          countryId: resolvedPolityAxis.countryId,
          historicalCountryId: resolvedPolityAxis.historicalCountryId,
          startDateInfo,
          endDateInfo: endDateInfo ?? null,
        })) as { id?: string } | null
        await postSaveEnrich(createdCollective?.id)
        return createdCollective
      }

      // 2) Reshuffle Mode on an Existing Head Tenure (Create mode only)
      if (
        !isEditing &&
        headActionMode === 'reshuffle_existing' &&
        selectedExistingTenureId
      ) {
        const existingCabinetCount =
          selectedExistingTenure?._existingCabinetCount ?? 0
        const trimmedReshuffleName = cabinetName.trim()
        if (existingCabinetCount > 0 && !trimmedReshuffleName) {
          throw new Error(
            '이미 내각이 개설된 임기에 개각(추가 내각)을 등록할 때는 구분할 내각 명칭(예: 제2차 개조내각, 전시연립내각)을 입력해주세요.',
          )
        }
        const createdReshuffle = (await personCareerApi.createCabinet({
          headTenureId: selectedExistingTenureId,
          name: trimmedReshuffleName || null,
          description: cabinetDescription.trim() || null,
          startDateInfo,
          endDateInfo: endDateInfo ?? null,
          allowReshuffle: existingCabinetCount > 0,
        })) as { id?: string } | null
        await postSaveEnrich(createdReshuffle?.id)
        return createdReshuffle
      }

      // 3) Create or Edit Head-of-State / Head-of-Government Tenure + Cabinet
      if (!selectedPersonId) {
        throw new Error('행정부 수반 인물을 선택해주세요.')
      }
      const trimmedRoleTitle = roleTitle.trim()
      if (!trimmedRoleTitle) {
        throw new Error('수반 직위명(예: 대통령, 총리, 영의정)을 입력해주세요.')
      }

      const matchedDef =
        effectiveHeadPositionOptions.find(
          (defOption) =>
            defOption.id === selectedPositionDefId &&
            defOption.title.trim() === trimmedRoleTitle,
        ) ??
        effectiveHeadPositionOptions.find(
          (defOption) => defOption.title.trim() === trimmedRoleTitle,
        ) ??
        null

      const resolvedPositionType = inferExecutivePositionType(
        trimmedRoleTitle,
        positionTypeOverride,
      )
      const parsedOrdinal = ordinalInput.trim()
        ? Number(ordinalInput.trim())
        : null
      const parsedSubTerm = subTermInput.trim()
        ? Number(subTermInput.trim())
        : null

      if (isEditing && editingCabinet?.id) {
        const headTenureId = editingCabinet.headTenure?.id
        if (headTenureId) {
          const updateTenurePayload: Parameters<
            typeof personCareerApi.updateGovernmentPositionTenure
          >[1] = {
            personId: selectedPersonId,
            positionType: resolvedPositionType,
            positionDefinitionId: matchedDef?.id ?? undefined,
            title: trimmedRoleTitle,
            countryId: resolvedPolityAxis.countryId ?? undefined,
            historicalCountryId:
              resolvedPolityAxis.historicalCountryId ?? undefined,
            ordinal: parsedOrdinal,
            subTermNumber: parsedSubTerm,
            partyId: partyId || null,
            ...(syncPeriodToHeadTenure
              ? {
                  startDateInfo,
                  endDateInfo,
                }
              : {}),
            appointmentMethod: (appointmentMethod ||
              null) as CreateGovernmentPositionTenureDto['appointmentMethod'],
            endReason: (endReason ||
              null) as CreateGovernmentPositionTenureDto['endReason'],
            endReasonDetail: endReasonDetail.trim() || null,
            notes: notes.trim() || null,
          }
          await personCareerApi.updateGovernmentPositionTenure(
            headTenureId,
            updateTenurePayload,
          )
        }
        const updatedCabinet = (await personCareerApi.updateCabinet(
          editingCabinet.id,
          {
            name: cabinetName.trim() || null,
            description: cabinetDescription.trim() || null,
            countryId: resolvedPolityAxis.countryId,
            historicalCountryId: resolvedPolityAxis.historicalCountryId,
            startDateInfo,
            endDateInfo,
          },
        )) as { id?: string } | null
        await postSaveEnrich(updatedCabinet?.id ?? editingCabinet.id)
        return updatedCabinet
      }

      // Create new head tenure + cabinet in one seamless transaction
      const tenurePayload: CreateGovernmentPositionTenureDto = {
        personId: selectedPersonId,
        positionType: resolvedPositionType,
        title: trimmedRoleTitle,
        ...(matchedDef?.id ? { positionDefinitionId: matchedDef.id } : {}),
        ...(resolvedPolityAxis.countryId
          ? { countryId: resolvedPolityAxis.countryId }
          : {}),
        ...(resolvedPolityAxis.historicalCountryId
          ? { historicalCountryId: resolvedPolityAxis.historicalCountryId }
          : {}),
        ...(parsedOrdinal != null && Number.isFinite(parsedOrdinal)
          ? { ordinal: parsedOrdinal }
          : {}),
        ...(parsedSubTerm != null && Number.isFinite(parsedSubTerm)
          ? { subTermNumber: parsedSubTerm }
          : {}),
        ...(partyId ? { partyId } : {}),
        startDateInfo,
        ...(endDateInfo ? { endDateInfo } : {}),
        ...(appointmentMethod
          ? {
              appointmentMethod:
                appointmentMethod as CreateGovernmentPositionTenureDto['appointmentMethod'],
            }
          : {}),
        ...(endReason
          ? {
              endReason:
                endReason as CreateGovernmentPositionTenureDto['endReason'],
            }
          : {}),
        ...(endReasonDetail.trim()
          ? { endReasonDetail: endReasonDetail.trim() }
          : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      }

      const createdTenure = (await personCareerApi.addGovernmentPositionTenure(
        tenurePayload,
      )) as { id: string }

      const savedCabinet = (await personCareerApi.createCabinet({
        headTenureId: createdTenure.id,
        name: cabinetName.trim() || null,
        description: cabinetDescription.trim() || null,
        countryId: resolvedPolityAxis.countryId,
        historicalCountryId: resolvedPolityAxis.historicalCountryId,
        startDateInfo,
        endDateInfo: endDateInfo ?? null,
      })) as { id?: string } | null

      await postSaveEnrich(savedCabinet?.id)
      return savedCabinet
    },
    onSuccess: async (savedCabinet) => {
      const targetId = savedCabinet?.id ?? editingCabinet?.id
      notify.success(
        isEditing
          ? '행정부 · 내각 정보가 수정되었습니다.'
          : headActionMode === 'reshuffle_existing'
            ? '기존 수반 임기에 새 내각(개각)이 개설되었습니다.'
            : '행정부 · 내각이 등록되었습니다.',
      )

      if (!isEditing && targetId) {
        try {
          const suggestions =
            await personCareerApi.getSuggestedCabinetMembers(targetId)
          if (suggestions.length > 0) {
            setOnboardingCabinetId(targetId)
            setSuggestedMinisters(suggestions)
            setCheckedMinisterIds(
              suggestions.map((suggestionItem) => suggestionItem.tenureId),
            )
            return
          }
        } catch {
          // 추천 조회 실패 시 곧바로 닫기 진행
        }
      }

      finalizeAndClose(targetId)
    },
    onError: (mutationError) => {
      setErrorMessage(getApiErrorMessage(mutationError))
    },
  })

  if (!isOpen) return null

  const headerCountryTitle = resolvedPolityAxis.displayName
    ? `${resolvedPolityAxis.displayName} 행정부 · 내각 등록`
    : '전 국가 행정부 · 내각 등록'

  return createPortal(
    <Backdrop onMouseDown={onClose}>
      <ModalCard onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}>
        <HeaderBar>
          <HeaderTitleGroup>
            <ContextBadge>
              {onboardingCabinetId
                ? '생성 완료 · 동시대 장관 편입'
                : isEditing
                  ? '행정부 · 내각 수정'
                  : '행정부 · 내각 원스톱 등록'}
            </ContextBadge>
            <HeaderTitle>
              {onboardingCabinetId
                ? '동시대 중앙부처 장관 · 인사를 각료로 편입할까요?'
                : isEditing
                  ? editingCabinet?.name?.trim() || autoCabinetNamePreview
                  : headerCountryTitle}
            </HeaderTitle>
          </HeaderTitleGroup>
          <CloseButton
            type="button"
            onClick={() => {
              if (onboardingCabinetId) {
                finalizeAndClose(onboardingCabinetId)
              } else {
                onClose()
              }
            }}
            aria-label="닫기"
          >
            <FiX size={18} />
          </CloseButton>
        </HeaderBar>

        {onboardingCabinetId ? (
          <>
            <BodyScroll>
              {errorMessage ? <ErrorBanner>{errorMessage}</ErrorBanner> : null}
              <OnboardingLead>
                이 내각의 존속 기간과 재임 시기가 겹치는 기등록 부처 인사{' '}
                <strong>{suggestedMinisters.length}명</strong>을 찾았습니다.
                체크된 인원을 원클릭으로 각료진에 바로 편입할 수 있습니다.
              </OnboardingLead>

              <LabelRow>
                <FieldSubtleHint>
                  선택됨: {checkedMinisterIds.length} /{' '}
                  {suggestedMinisters.length}명
                </FieldSubtleHint>
                <InlineActionGroup>
                  <TextActionButton
                    type="button"
                    onClick={() =>
                      setCheckedMinisterIds(
                        suggestedMinisters.map((item) => item.tenureId),
                      )
                    }
                  >
                    전체 선택
                  </TextActionButton>
                  <TextActionButton
                    type="button"
                    onClick={() => setCheckedMinisterIds([])}
                  >
                    전체 해제
                  </TextActionButton>
                </InlineActionGroup>
              </LabelRow>

              <SuggestedList>
                {suggestedMinisters.map((candidateRow) => {
                  const isChecked = checkedMinisterIds.includes(
                    candidateRow.tenureId,
                  )
                  const personName = candidateRow.person
                    ? getPersonDisplayName(candidateRow.person)
                    : '인물 미상'
                  const deptName =
                    candidateRow.administrationDepartment?.name ?? '부처 미지정'
                  const roleName =
                    candidateRow.title ??
                    candidateRow.positionDefinition?.title ??
                    '장관·인사'
                  const periodText = `${candidateRow.startDate ? formatDate(candidateRow.startDate) : '?'} ~ ${candidateRow.endDate ? formatDate(candidateRow.endDate) : '현직'}`
                  return (
                    <SuggestedItemLabel
                      key={candidateRow.tenureId}
                      $checked={isChecked}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setCheckedMinisterIds((prevIds) =>
                            prevIds.includes(candidateRow.tenureId)
                              ? prevIds.filter(
                                  (existingId) =>
                                    existingId !== candidateRow.tenureId,
                                )
                              : [...prevIds, candidateRow.tenureId],
                          )
                        }}
                      />
                      <SuggestedItemBody>
                        <div>
                          <strong>{personName}</strong>
                          <SmallRoleBadge>{deptName}</SmallRoleBadge>
                          <span>{roleName}</span>
                        </div>
                        <SuggestedPeriodText>{periodText}</SuggestedPeriodText>
                      </SuggestedItemBody>
                    </SuggestedItemLabel>
                  )
                })}
              </SuggestedList>
            </BodyScroll>

            <FooterBar>
              <CancelBtn
                type="button"
                onClick={() => finalizeAndClose(onboardingCabinetId)}
              >
                건너뛰고 완료
              </CancelBtn>
              <SubmitBtn
                type="button"
                disabled={
                  checkedMinisterIds.length === 0 ||
                  attachSuggestedMinistersMutation.isPending
                }
                onClick={() => attachSuggestedMinistersMutation.mutate()}
              >
                {attachSuggestedMinistersMutation.isPending
                  ? '편입 중...'
                  : `선택한 ${checkedMinisterIds.length}명 각료로 편입`}
              </SubmitBtn>
            </FooterBar>
          </>
        ) : (
          <>
            <BodyScroll>
              {errorMessage ? <ErrorBanner>{errorMessage}</ErrorBanner> : null}

              {/* 1. Mode Switch (Create mode only) */}
              {!isEditing ? (
                <ModeSwitchRow>
                  <ModeSwitchTab
                    type="button"
                    $active={mode === 'head'}
                    onClick={() => {
                      setMode('head')
                      setErrorMessage(null)
                    }}
                  >
                    <FiUser size={14} />
                    <span>수반 중심 행정부 · 내각</span>
                    <ModeSubBadge>대통령·총리·재상·친정</ModeSubBadge>
                  </ModeSwitchTab>
                  <ModeSwitchTab
                    type="button"
                    $active={mode === 'collective'}
                    onClick={() => {
                      setMode('collective')
                      setErrorMessage(null)
                    }}
                  >
                    <FiUsers size={14} />
                    <span>집단지도 · 과도정부</span>
                    <ModeSubBadge>위원회·평의회·과도기구</ModeSubBadge>
                  </ModeSwitchTab>
                </ModeSwitchRow>
              ) : null}

              {/* 2-A. Standalone Country / Historical Polity Picker (Global /government mode) */}
              {isStandaloneCatalogMode ? (
                <FieldBlock>
                  <LabelRow>
                    <FieldLabel>
                      소속 국가 · 시대 정치체 <RequiredMark>*</RequiredMark>
                    </FieldLabel>
                    <FieldSubtleHint>
                      현대 국가와 역사적 국가·왕조를 모두 검색해 지정할 수 있습니다
                    </FieldSubtleHint>
                  </LabelRow>
                  <SearchableSelect
                    options={standaloneSelectOptions}
                    value={standalonePolityValue}
                    onChange={(nextVal) => {
                      setStandalonePolityValue(nextVal)
                      setSelectedPositionDefId(null)
                      setSelectedExistingTenureId(null)
                      setHeadActionMode('new_tenure')
                    }}
                    placeholder="국가 또는 역사적 정치체 검색 (예: 대한민국, 영국, 조선, 바이마르 공화국...)"
                    searchPlaceholder="국가명 검색..."
                  />
                </FieldBlock>
              ) : polityOptions.length > 1 ? (
                /* 2-B. Target Polity / Historical Era Selector (Country Detail mode) */
                <FieldBlock>
                  <LabelRow>
                    <FieldLabel>소속 국가 · 시대 정치체</FieldLabel>
                    <FieldSubtleHint>
                      현재 보고 있는 탭에 맞춰 기본 선택됩니다
                    </FieldSubtleHint>
                  </LabelRow>
                  <PolityChipRow>
                    {polityOptions.map((polityItem) => {
                      const isSelected = selectedPolityId === polityItem.id
                      return (
                        <PolityChip
                          key={polityItem.id}
                          type="button"
                          $active={isSelected}
                          onClick={() => {
                            setSelectedPolityId(polityItem.id)
                            setSelectedPositionDefId(null)
                            if (!isEditing) {
                              setSelectedExistingTenureId(null)
                              setHeadActionMode('new_tenure')
                            }
                          }}
                        >
                          <span>{polityItem.name}</span>
                          {polityItem.eraLabel ? (
                            <PolityEraText>
                              ({polityItem.eraLabel})
                            </PolityEraText>
                          ) : null}
                        </PolityChip>
                      )
                    })}
                  </PolityChipRow>
                </FieldBlock>
              ) : null}

              {mode === 'head' ? (
                <>
                  {/* 3. Person Selection OR Existing Tenure Browser */}
                  <FieldBlock>
                    <LabelRow>
                      <FieldLabel>
                        수반 인물 <RequiredMark>*</RequiredMark>
                      </FieldLabel>
                      <InlineActionGroup>
                        {!isEditing &&
                        effectiveExistingHeadTenures.length > 0 ? (
                          <TextActionButton
                            type="button"
                            onClick={() =>
                              setShowExistingTenureBrowser((prev) => !prev)
                            }
                          >
                            <FiLayers size={12} />
                            {showExistingTenureBrowser
                              ? '인물 직접 검색으로 돌아가기'
                              : `기존 수반 임기(${effectiveExistingHeadTenures.length}건)에서 선택`}
                          </TextActionButton>
                        ) : null}
                        {!selectedPersonId && !showExistingTenureBrowser ? (
                          <TextActionButton
                            type="button"
                            onClick={() =>
                              setShowQuickCreatePerson((prev) => !prev)
                            }
                          >
                            <FiPlus size={12} />
                            {showQuickCreatePerson
                              ? '기존 인물 검색으로 전환'
                              : '새 인물 즉석 등록'}
                          </TextActionButton>
                        ) : null}
                      </InlineActionGroup>
                    </LabelRow>

                    {showExistingTenureBrowser && !isEditing ? (
                      <ExistingTenureBrowserBox>
                        <SearchInputWrap>
                          <FiSearch size={14} />
                          <SearchInput
                            type="text"
                            value={existingTenureSearch}
                            onChange={(changeEvent) =>
                              setExistingTenureSearch(changeEvent.target.value)
                            }
                            placeholder="기존 수반 이름 또는 직위 검색..."
                          />
                        </SearchInputWrap>
                        <ExistingTenureList>
                          {filteredExistingTenuresForBrowser.map(
                            (tenureItem) => {
                              const personLabel = getPersonName(
                                tenureItem.person,
                              )
                              const posTitle =
                                tenureItem.title ??
                                tenureItem.positionDefinition?.title ??
                                '수반'
                              const termBadge =
                                tenureItem.ordinal != null
                                  ? `제${tenureItem.ordinal}대${tenureItem.subTermNumber != null ? ` ${tenureItem.subTermNumber}기` : ''} `
                                  : ''
                              const periodText = `${tenureItem.startDate ? formatDate(tenureItem.startDate) : '?'} ~ ${tenureItem.endDate ? formatDate(tenureItem.endDate) : '현직'}`
                              const existingCabCount =
                                tenureItem._existingCabinetCount ?? 0
                              const isPicked =
                                selectedExistingTenureId === tenureItem.id &&
                                headActionMode === 'reshuffle_existing'
                              return (
                                <ExistingTenureItemButton
                                  key={tenureItem.id}
                                  type="button"
                                  $active={isPicked}
                                  onClick={() =>
                                    applyExistingTenureForReshuffle(tenureItem)
                                  }
                                >
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      flexWrap: 'wrap',
                                    }}
                                  >
                                    <strong>
                                      {termBadge}
                                      {personLabel}
                                    </strong>
                                    <SmallRoleBadge>{posTitle}</SmallRoleBadge>
                                    <SmallCountBadge
                                      $hasCabinet={existingCabCount > 0}
                                    >
                                      {existingCabCount > 0
                                        ? `내각 ${existingCabCount}개 (개각 추가)`
                                        : '내각 미개설'}
                                    </SmallCountBadge>
                                  </div>
                                  <span style={{ fontSize: 11.5, opacity: 0.75 }}>
                                    {periodText}
                                  </span>
                                </ExistingTenureItemButton>
                              )
                            },
                          )}
                        </ExistingTenureList>
                      </ExistingTenureBrowserBox>
                    ) : selectedPersonId ? (
                      <SelectedPersonCard>
                        <SelectedPersonInfo>
                          <PersonAvatarBadge>
                            {selectedPersonLabel.slice(0, 1) || '인'}
                          </PersonAvatarBadge>
                          <div>
                            <SelectedPersonName>
                              {selectedPersonLabel}
                            </SelectedPersonName>
                            <SelectedPersonSub>
                              {headActionMode === 'reshuffle_existing' &&
                              selectedExistingTenure
                                ? `기존 임기 선택됨: ${selectedExistingTenure.ordinal != null ? `제${selectedExistingTenure.ordinal}대 ` : ''}${selectedExistingTenure.title ?? selectedExistingTenure.positionDefinition?.title ?? '수반'} (${selectedExistingTenure.startDate ? formatDate(selectedExistingTenure.startDate) : '?'} ~ ${selectedExistingTenure.endDate ? formatDate(selectedExistingTenure.endDate) : '현직'})`
                                : '행정부 수반으로 선택됨'}
                            </SelectedPersonSub>
                          </div>
                        </SelectedPersonInfo>
                        <ChangePersonButton
                          type="button"
                          onClick={() => {
                            setSelectedPersonId('')
                            setSelectedPersonLabel('')
                            setHeadActionMode('new_tenure')
                            setSelectedExistingTenureId(null)
                          }}
                        >
                          인물 변경
                        </ChangePersonButton>
                      </SelectedPersonCard>
                    ) : showQuickCreatePerson ? (
                      <QuickCreateBox>
                        <QuickCreateRow>
                          <TextInput
                            value={quickPersonSurname}
                            onChange={(changeEvent) =>
                              setQuickPersonSurname(changeEvent.target.value)
                            }
                            placeholder="성 (예: 이 / 처칠 - 단명이면 비움)"
                          />
                          <TextInput
                            value={quickPersonGivenName}
                            onChange={(changeEvent) =>
                              setQuickPersonGivenName(changeEvent.target.value)
                            }
                            placeholder="이름 * (예: 순신 / 윈스턴)"
                          />
                        </QuickCreateRow>
                        <QuickCreateRow>
                          <TextInput
                            value={quickPersonOriginalName}
                            onChange={(changeEvent) =>
                              setQuickPersonOriginalName(
                                changeEvent.target.value,
                              )
                            }
                            placeholder="원어·한자 표기 (선택, 예: Winston Churchill)"
                          />
                          <QuickCreateSubmitBtn
                            type="button"
                            disabled={quickCreatePersonMutation.isPending}
                            onClick={() => quickCreatePersonMutation.mutate()}
                          >
                            {quickCreatePersonMutation.isPending
                              ? '생성 중...'
                              : '인물 생성 후 선택'}
                          </QuickCreateSubmitBtn>
                        </QuickCreateRow>
                      </QuickCreateBox>
                    ) : (
                      <>
                        <SearchInputWrap>
                          <FiSearch size={14} />
                          <SearchInput
                            type="text"
                            value={personQuery}
                            onChange={(changeEvent) =>
                              setPersonQuery(changeEvent.target.value)
                            }
                            placeholder="인물 이름 검색 (성·이름·원어명) — 아래 추천 인물 클릭 가능"
                          />
                        </SearchInputWrap>
                        <PersonChipGrid>
                          {personCandidates.length === 0 ? (
                            <EmptyPersonHint>
                              {personQuery.trim()
                                ? '검색 결과가 없습니다. 우측 상단 [새 인물 즉석 등록]으로 바로 추가할 수 있습니다.'
                                : resolvedPolityAxis.countryId ||
                                    resolvedPolityAxis.historicalCountryId
                                  ? '추천 인물이 없습니다. 이름을 검색하거나 [새 인물 즉석 등록]을 눌러주세요.'
                                  : '먼저 소속 국가 · 정치체를 선택하거나 인물 이름을 검색해주세요.'}
                            </EmptyPersonHint>
                          ) : (
                            personCandidates.map((candidate) => (
                              <PersonCandidateChip
                                key={candidate.id}
                                type="button"
                                onClick={() => {
                                  setSelectedPersonId(candidate.id)
                                  setSelectedPersonLabel(candidate.label)
                                  setHeadActionMode('new_tenure')
                                  setSelectedExistingTenureId(null)
                                }}
                              >
                                <span>{candidate.label}</span>
                                {candidate.subLabel ? (
                                  <CandidateSubText>
                                    ({candidate.subLabel})
                                  </CandidateSubText>
                                ) : null}
                              </PersonCandidateChip>
                            ))
                          )}
                        </PersonChipGrid>
                      </>
                    )}

                    {/* Smart Auto-Detection Banner when selected person already has head tenures */}
                    {!isEditing &&
                    matchingExistingTenuresForPerson.length > 0 ? (
                      <SmartTenureBanner>
                        <SmartBannerHeader>
                          <FiRefreshCw size={13} />
                          <span>
                            <strong>{selectedPersonLabel}</strong>의 기존 수반
                            재임 기록이 {matchingExistingTenuresForPerson.length}
                            건 있습니다. 어떤 작업을 진행할까요?
                          </span>
                        </SmartBannerHeader>
                        <SmartActionRadioRow>
                          <SmartActionChoiceBtn
                            type="button"
                            $active={headActionMode === 'new_tenure'}
                            onClick={() => {
                              setHeadActionMode('new_tenure')
                              setSelectedExistingTenureId(null)
                            }}
                          >
                            <FiCheck size={13} />
                            <div>
                              <strong>별도의 새 수반 임기 + 행정부 등록</strong>
                              <span>재집권 · 연임 · 다른 직위 취임 시</span>
                            </div>
                          </SmartActionChoiceBtn>
                          {matchingExistingTenuresForPerson.map(
                            (existingTenure) => {
                              const isThisSelected =
                                headActionMode === 'reshuffle_existing' &&
                                selectedExistingTenureId === existingTenure.id
                              const ordLabel =
                                existingTenure.ordinal != null
                                  ? `제${existingTenure.ordinal}대 `
                                  : ''
                              const roleLabel =
                                existingTenure.title ??
                                existingTenure.positionDefinition?.title ??
                                '수반'
                              const yearRange = `${existingTenure.startYear ?? '?'}~${existingTenure.endYear ?? '현직'}`
                              return (
                                <SmartActionChoiceBtn
                                  key={existingTenure.id}
                                  type="button"
                                  $active={isThisSelected}
                                  onClick={() =>
                                    applyExistingTenureForReshuffle(
                                      existingTenure,
                                    )
                                  }
                                >
                                  <FiRefreshCw size={13} />
                                  <div>
                                    <strong>
                                      기존 임기({ordLabel}
                                      {roleLabel}, {yearRange})에 개각 추가
                                    </strong>
                                    <span>
                                      제2차·개조내각·전시내각 등 새 내각 구성만
                                      개설
                                    </span>
                                  </div>
                                </SmartActionChoiceBtn>
                              )
                            },
                          )}
                        </SmartActionRadioRow>
                      </SmartTenureBanner>
                    ) : null}
                  </FieldBlock>

                  {/* 4. Role Title, PositionType & Ordinal (Hidden if adding a reshuffle to an existing tenure) */}
                  {headActionMode === 'new_tenure' ? (
                    <FieldBlock>
                      <LabelRow>
                        <FieldLabel>
                          수반 직위 · 대수 <RequiredMark>*</RequiredMark>
                        </FieldLabel>
                        <InlineActionGroup>
                          {!isEditing &&
                          suggestedNextOrdinal != null &&
                          ordinalInput.trim() !==
                            String(suggestedNextOrdinal) ? (
                            <NextOrdinalPill
                              type="button"
                              onClick={() =>
                                setOrdinalInput(String(suggestedNextOrdinal))
                              }
                            >
                              다음 대수 추천: 제{suggestedNextOrdinal}대 적용
                            </NextOrdinalPill>
                          ) : null}
                          <PositionTypeSegmented>
                            <PositionTypePill
                              type="button"
                              $active={positionTypeOverride === 'HEAD_OF_STATE'}
                              onClick={() =>
                                setPositionTypeOverride('HEAD_OF_STATE')
                              }
                            >
                              국가원수·대통령·친정
                            </PositionTypePill>
                            <PositionTypePill
                              type="button"
                              $active={
                                positionTypeOverride === 'HEAD_OF_GOVERNMENT'
                              }
                              onClick={() =>
                                setPositionTypeOverride('HEAD_OF_GOVERNMENT')
                              }
                            >
                              정부수반·총리·재상
                            </PositionTypePill>
                          </PositionTypeSegmented>
                        </InlineActionGroup>
                      </LabelRow>

                      <PresetChipRow>
                        {rolePresetChips.map((presetItem) => {
                          const isChipActive =
                            roleTitle.trim() === presetItem.title
                          return (
                            <PresetChip
                              key={presetItem.title}
                              type="button"
                              $active={isChipActive}
                              onClick={() => {
                                setRoleTitle(presetItem.title)
                                setPositionTypeOverride(presetItem.positionType)
                                setSelectedPositionDefId(
                                  presetItem.positionDefId,
                                )
                              }}
                            >
                              {presetItem.title}
                            </PresetChip>
                          )
                        })}
                      </PresetChipRow>

                      <RoleAndOrdinalGrid>
                        <TextInput
                          value={roleTitle}
                          onChange={(changeEvent) => {
                            const nextTitle = changeEvent.target.value
                            setRoleTitle(nextTitle)
                            setSelectedPositionDefId(null)
                            setPositionTypeOverride(
                              inferExecutivePositionType(nextTitle),
                            )
                          }}
                          placeholder="직위명 직접 입력 (예: 대통령, 내각총리대신, 영의정, 제1집정)"
                        />
                        <OrdinalInlineBox>
                          <OrdinalUnitText>제</OrdinalUnitText>
                          <OrdinalInput
                            type="number"
                            min={1}
                            value={ordinalInput}
                            onChange={(changeEvent) =>
                              setOrdinalInput(changeEvent.target.value)
                            }
                            placeholder="N"
                          />
                          <OrdinalUnitText>대</OrdinalUnitText>
                          <OrdinalInput
                            type="number"
                            min={1}
                            value={subTermInput}
                            onChange={(changeEvent) =>
                              setSubTermInput(changeEvent.target.value)
                            }
                            placeholder="기"
                            title="동일 대수 내 1기·2기 구분 시 입력 (선택)"
                          />
                          <OrdinalUnitText>기</OrdinalUnitText>
                        </OrdinalInlineBox>
                      </RoleAndOrdinalGrid>
                    </FieldBlock>
                  ) : null}
                </>
              ) : null}

              {/* 5. Cabinet Name & Description (available across ALL modes!) */}
              <FieldBlock>
                <LabelRow>
                  <FieldLabel>
                    {mode === 'collective' ? (
                      <>
                        집단지도 · 과도정부 명칭 <RequiredMark>*</RequiredMark>
                      </>
                    ) : headActionMode === 'reshuffle_existing' ? (
                      <>
                        개각 · 신규 내각 명칭 <RequiredMark>*</RequiredMark>
                      </>
                    ) : (
                      '행정부 · 내각 명칭 (선택)'
                    )}
                  </FieldLabel>
                  {mode === 'head' && !cabinetName.trim() ? (
                    <LivePreviewBadge>
                      자동 표시: <strong>{autoCabinetNamePreview}</strong>
                    </LivePreviewBadge>
                  ) : null}
                </LabelRow>
                <TextInput
                  value={cabinetName}
                  onChange={(changeEvent) =>
                    setCabinetName(changeEvent.target.value)
                  }
                  placeholder={
                    mode === 'collective'
                      ? '예: 공안위원회, 스위스 연방평의회, 대한민국 임시정부 국무원, 군사혁명위원회'
                      : headActionMode === 'reshuffle_existing'
                        ? '예: 제2차 아베 개조내각, 처칠 전시연립내각, 루즈벨트 제2기 내각'
                        : `비워두면 "${autoCabinetNamePreview}"(으)로 표시 · 개각/별칭 시 직접 입력`
                  }
                />
                <TextInput
                  value={cabinetDescription}
                  onChange={(changeEvent) =>
                    setCabinetDescription(changeEvent.target.value)
                  }
                  placeholder="내각 · 기구 한 줄 설명 (선택 — 예: 제1차 세계대전 거국전시연립내각, 3당 합당 이후 출범)"
                />
              </FieldBlock>

              {/* 6. Structured Period Input (BC/AD + Year + Month + Day) + Reshuffle Head-Tenure Protection */}
              <FieldBlock>
                <LabelRow>
                  <FieldLabel>
                    {headActionMode === 'reshuffle_existing' ||
                    (isEditing && !syncPeriodToHeadTenure && mode === 'head')
                      ? '이 내각(개각) 고유 존속 기간'
                      : mode === 'collective'
                        ? '기구 존속 기간 (출범 ~ 해산)'
                        : '재임 · 내각 기간 (취임 ~ 퇴임)'}{' '}
                    <RequiredMark>*</RequiredMark>
                  </FieldLabel>
                  <FieldSubtleHint>
                    연도만 입력해도 저장되며, 종료 연도를 비워두면 현직(재임
                    중)으로 처리됩니다
                  </FieldSubtleHint>
                </LabelRow>

                {isEditing && editingCabinet?.headTenure?.id ? (
                  <PeriodSyncNotice $protected={!syncPeriodToHeadTenure}>
                    <label>
                      <input
                        type="checkbox"
                        checked={syncPeriodToHeadTenure}
                        onChange={(changeEvent) =>
                          setSyncPeriodToHeadTenure(changeEvent.target.checked)
                        }
                      />
                      <span>
                        수반 전체 임기(
                        {editingCabinet.headTenure.startYear ?? '?'}~
                        {editingCabinet.headTenure.endYear ?? '현직'})도 이
                        기간과 동일하게 변경
                      </span>
                    </label>
                    {isReshuffleOrDistinctPeriodEdit &&
                    !syncPeriodToHeadTenure ? (
                      <PeriodProtectBadge>
                        개각 보호됨 · 내각 고유 기간만 수정
                      </PeriodProtectBadge>
                    ) : null}
                  </PeriodSyncNotice>
                ) : null}

                <DateGrid>
                  <DateCard>
                    <DateCardHeader>
                      <span>시작 (취임 · 출범) *</span>
                      <EraToggleGroup>
                        <EraBtn
                          type="button"
                          $active={startEra === 'BC'}
                          onClick={() => setStartEra('BC')}
                        >
                          BC
                        </EraBtn>
                        <EraBtn
                          type="button"
                          $active={startEra === 'AD'}
                          onClick={() => setStartEra('AD')}
                        >
                          AD
                        </EraBtn>
                      </EraToggleGroup>
                    </DateCardHeader>
                    <YmdInputRow>
                      <YearInput
                        type="number"
                        min={1}
                        value={startYear}
                        onChange={(changeEvent) =>
                          setStartYear(changeEvent.target.value)
                        }
                        placeholder="연도 *"
                      />
                      <MonthDayInput
                        type="number"
                        min={1}
                        max={12}
                        value={startMonth}
                        onChange={(changeEvent) =>
                          setStartMonth(changeEvent.target.value)
                        }
                        placeholder="월"
                      />
                      <MonthDayInput
                        type="number"
                        min={1}
                        max={31}
                        value={startDay}
                        onChange={(changeEvent) =>
                          setStartDay(changeEvent.target.value)
                        }
                        placeholder="일"
                      />
                    </YmdInputRow>
                  </DateCard>

                  <DateCard>
                    <DateCardHeader>
                      <span>종료 (퇴임 · 해산)</span>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {endYear ? (
                          <ClearDateBtn
                            type="button"
                            onClick={() => {
                              setEndYear('')
                              setEndMonth('')
                              setEndDay('')
                            }}
                          >
                            현직으로 비우기
                          </ClearDateBtn>
                        ) : null}
                        <EraToggleGroup>
                          <EraBtn
                            type="button"
                            $active={endEra === 'BC'}
                            onClick={() => setEndEra('BC')}
                          >
                            BC
                          </EraBtn>
                          <EraBtn
                            type="button"
                            $active={endEra === 'AD'}
                            onClick={() => setEndEra('AD')}
                          >
                            AD
                          </EraBtn>
                        </EraToggleGroup>
                      </div>
                    </DateCardHeader>
                    <YmdInputRow>
                      <YearInput
                        type="number"
                        min={1}
                        value={endYear}
                        onChange={(changeEvent) =>
                          setEndYear(changeEvent.target.value)
                        }
                        placeholder="현직/미상"
                      />
                      <MonthDayInput
                        type="number"
                        min={1}
                        max={12}
                        value={endMonth}
                        onChange={(changeEvent) =>
                          setEndMonth(changeEvent.target.value)
                        }
                        placeholder="월"
                      />
                      <MonthDayInput
                        type="number"
                        min={1}
                        max={31}
                        value={endDay}
                        onChange={(changeEvent) =>
                          setEndDay(changeEvent.target.value)
                        }
                        placeholder="일"
                      />
                    </YmdInputRow>
                  </DateCard>
                </DateGrid>
              </FieldBlock>

              {/* 7. Collapsible Optional Details (Party + Ruling Party Auto-Link, Origin Event, Appointment/End Reason, Notes) */}
              <AdvancedAccordion>
                <AdvancedToggleBtn
                  type="button"
                  onClick={() => setShowAdvancedDetails((prev) => !prev)}
                >
                  {showAdvancedDetails ? (
                    <FiChevronDown size={14} />
                  ) : (
                    <FiChevronRight size={14} />
                  )}
                  <span>
                    {mode === 'head' && headActionMode === 'new_tenure'
                      ? '상세 정보 (집권 정당 · 출범 사건 · 취임 방식 · 퇴임 사유 · 비고)'
                      : '상세 정보 (집권 정당 · 출범 계기 사건 연결)'}
                  </span>
                  {(partyId ||
                    originEventId ||
                    appointmentMethod ||
                    endReason ||
                    notes.trim()) && <FilledDotBadge>입력됨</FilledDotBadge>}
                </AdvancedToggleBtn>

                {showAdvancedDetails ? (
                  <AdvancedBody>
                    {mode === 'head' && headActionMode === 'new_tenure' ? (
                      <>
                        <ThreeColGrid>
                          <div>
                            <SubFieldLabel>수반 소속 · 집권 정당</SubFieldLabel>
                            <SelectInput
                              value={partyId}
                              onChange={(changeEvent) =>
                                setPartyId(changeEvent.target.value)
                              }
                            >
                              <option value="">무소속 / 정당 미지정</option>
                              {parties.map((partyItem) => (
                                <option key={partyItem.id} value={partyItem.id}>
                                  {partyItem.name}
                                </option>
                              ))}
                            </SelectInput>
                          </div>

                          <div>
                            <SubFieldLabel>취임 · 선출 방식</SubFieldLabel>
                            <SelectInput
                              value={appointmentMethod}
                              onChange={(changeEvent) =>
                                setAppointmentMethod(changeEvent.target.value)
                              }
                            >
                              <option value="">선택 안 함</option>
                              <option value="DIRECT_ELECTION">직접 선거</option>
                              <option value="INDIRECT_ELECTION">
                                간접 선거
                              </option>
                              <option value="PARLIAMENTARY_ELECTION">
                                의회 선출 (내각책임제 등)
                              </option>
                              <option value="APPOINTMENT">
                                군주 · 원수 임명 (승계 포함)
                              </option>
                              <option value="HEREDITARY">세습</option>
                              <option value="ELECTIVE_MONARCHY">
                                선거군주제 선출
                              </option>
                              <option value="COUP">쿠데타 · 혁명</option>
                              <option value="RESTORATION">복위 · 재추대</option>
                              <option value="CONQUEST">정복</option>
                              <option value="TREATY">조약에 의한 취임</option>
                              <option value="OTHER">기타</option>
                            </SelectInput>
                          </div>

                          <div>
                            <SubFieldLabel>퇴임 사유</SubFieldLabel>
                            <SelectInput
                              value={endReason}
                              onChange={(changeEvent) =>
                                setEndReason(changeEvent.target.value)
                              }
                            >
                              <option value="">선택 안 함</option>
                              <option value="TERM_COMPLETED">임기 만료</option>
                              <option value="RESIGNATION">
                                사임 · 내각 총사퇴 · 불신임
                              </option>
                              <option value="IMPEACHMENT">탄핵 · 파면</option>
                              <option value="REMOVAL">해임 · 면직</option>
                              <option value="DEATH_IN_OFFICE">
                                재임 중 사망 · 피살
                              </option>
                              <option value="OVERTHROWN">
                                쿠데타 · 혁명 축출
                              </option>
                              <option value="ABDICATION">자진 퇴위</option>
                              <option value="SUCCESSION_TRANSFER">
                                양위 · 선위
                              </option>
                              <option value="WAR_DEFEAT">전쟁 패배</option>
                              <option value="STATE_DISSOLVED">
                                국가 소멸 · 멸망
                              </option>
                              <option value="OTHER">기타</option>
                            </SelectInput>
                          </div>
                        </ThreeColGrid>

                        {partyId ? (
                          <InlineCheckLabel>
                            <input
                              type="checkbox"
                              checked={autoLinkRulingParty}
                              onChange={(changeEvent) =>
                                setAutoLinkRulingParty(
                                  changeEvent.target.checked,
                                )
                              }
                            />
                            <span>
                              선택한 정당을 이 내각의{' '}
                              <strong>집권·주도 여당</strong>으로도 자동 등록
                            </span>
                          </InlineCheckLabel>
                        ) : null}

                        <TwoColGrid>
                          <div>
                            <SubFieldLabel>취임 배경 · 비고 메모</SubFieldLabel>
                            <TextInput
                              value={notes}
                              onChange={(changeEvent) =>
                                setNotes(changeEvent.target.value)
                              }
                              placeholder="예: 연립내각 구성 배경, 비상대권 행사 등"
                            />
                          </div>
                          <div>
                            <SubFieldLabel>퇴임 상세 사유</SubFieldLabel>
                            <TextInput
                              value={endReasonDetail}
                              onChange={(changeEvent) =>
                                setEndReasonDetail(changeEvent.target.value)
                              }
                              placeholder="예: 의회 불신임안 가결로 총사퇴"
                            />
                          </div>
                        </TwoColGrid>
                      </>
                    ) : (
                      <div>
                        <SubFieldLabel>집권 · 주도 정당 (선택)</SubFieldLabel>
                        <SelectInput
                          value={partyId}
                          onChange={(changeEvent) => {
                            setPartyId(changeEvent.target.value)
                            if (changeEvent.target.value) {
                              setAutoLinkRulingParty(true)
                            }
                          }}
                        >
                          <option value="">정당 연결 안 함</option>
                          {parties.map((partyItem) => (
                            <option key={partyItem.id} value={partyItem.id}>
                              {partyItem.name}
                            </option>
                          ))}
                        </SelectInput>
                      </div>
                    )}

                    <div>
                      <SubFieldLabel>
                        출범 계기 · 관련 역사 사건 연결 (선택)
                      </SubFieldLabel>
                      <LinkedEventPickerField
                        value={originEventId}
                        nearYear={nearEventYear}
                        onChange={setOriginEventId}
                      />
                    </div>
                  </AdvancedBody>
                ) : null}
              </AdvancedAccordion>
            </BodyScroll>

            <FooterBar>
              <CancelBtn type="button" onClick={onClose}>
                취소
              </CancelBtn>
              <SubmitBtn
                type="button"
                disabled={saveCabinetMutation.isPending}
                onClick={() => {
                  setErrorMessage(null)
                  saveCabinetMutation.mutate()
                }}
              >
                {saveCabinetMutation.isPending
                  ? '저장 중...'
                  : isEditing
                    ? '수정 저장'
                    : headActionMode === 'reshuffle_existing'
                      ? '개각 내각 개설'
                      : '행정부 · 내각 등록'}
              </SubmitBtn>
            </FooterBar>
          </>
        )}
      </ModalCard>
    </Backdrop>,
    document.body,
  )
}

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${Z_INDEX.modal};
  background: rgba(15, 23, 42, 0.56);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
`

const ModalCard = styled.div`
  width: min(640px, 100%);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  box-shadow: 0 22px 48px rgba(0, 0, 0, 0.28);
  overflow: hidden;
`

const HeaderBar = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px 13px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

const HeaderTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const ContextBadge = styled.span`
  align-self: flex-start;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => `${theme.colors.primary}15`};
`

const HeaderTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text};
`

const CloseButton = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  &:hover {
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
  }
`

const BodyScroll = styled.div`
  padding: 16px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
`

const ErrorBanner = styled.div`
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 600;
  color: #dc2626;
  background: rgba(220, 38, 38, 0.1);
  border: 1px solid rgba(220, 38, 38, 0.25);
`

const ModeSwitchRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 4px;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
`

const ModeSwitchTab = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
  padding: 8px 10px;
  border-radius: 7px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.primary : 'transparent'};
  background: ${({ theme, $active }) =>
    $active ? `${theme.colors.primary}15` : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.textSecondary};
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.14s ease;
`

const ModeSubBadge = styled.span`
  font-size: 10.5px;
  font-weight: 600;
  opacity: 0.78;
`

const FieldBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
`

const LabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
`

const FieldLabel = styled.label`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`

const RequiredMark = styled.span`
  color: #ef4444;
`

const FieldSubtleHint = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textSecondary};
`

const InlineActionGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const TextActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  &:hover {
    text-decoration: underline;
  }
`

const NextOrdinalPill = styled.button`
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid rgba(16, 185, 129, 0.4);
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
  cursor: pointer;
  &:hover {
    background: rgba(16, 185, 129, 0.2);
  }
`

const PolityChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const PolityChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.primary : theme.colors.border};
  background: ${({ theme, $active }) =>
    $active ? `${theme.colors.primary}16` : theme.colors.surface};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.text};
`

const PolityEraText = styled.span`
  font-size: 11px;
  opacity: 0.75;
`

const SearchInputWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 11px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textSecondary};
`

const SearchInput = styled.input`
  width: 100%;
  padding: 8px 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  font-size: 13px;
  outline: none;
`

const TextInput = styled.input`
  width: 100%;
  padding: 8px 11px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 13px;
  box-sizing: border-box;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const SelectInput = styled.select`
  width: 100%;
  padding: 7px 9px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 12.5px;
  box-sizing: border-box;
`

const PersonChipGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 124px;
  overflow-y: auto;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`

const PersonCandidateChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const CandidateSubText = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textSecondary};
`

const EmptyPersonHint = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
  padding: 4px;
`

const SelectedPersonCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => `${theme.colors.primary}55`};
  background: ${({ theme }) => `${theme.colors.primary}10`};
`

const SelectedPersonInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`

const PersonAvatarBadge = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const SelectedPersonName = styled.div`
  font-size: 13.5px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text};
`

const SelectedPersonSub = styled.div`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.textSecondary};
`

const ChangePersonButton = styled.button`
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 700;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  flex-shrink: 0;
  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`

const QuickCreateBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
  border: 1px dashed ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.surface};
`

const QuickCreateRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`

const QuickCreateSubmitBtn = styled.button`
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const SmartTenureBanner = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(245, 158, 11, 0.45);
  background: rgba(245, 158, 11, 0.08);
`

const SmartBannerHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text};
`

const SmartActionRadioRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const SmartActionChoiceBtn = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  text-align: left;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.primary : theme.colors.border};
  background: ${({ theme, $active }) =>
    $active ? `${theme.colors.primary}15` : theme.colors.background};
  color: ${({ theme }) => theme.colors.text};

  div {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  strong {
    font-size: 12px;
    font-weight: 700;
  }
  span {
    font-size: 11px;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
`

const ExistingTenureBrowserBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`

const ExistingTenureList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-height: 150px;
  overflow-y: auto;
`

const ExistingTenureItemButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 7px;
  cursor: pointer;
  text-align: left;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.primary : theme.colors.border};
  background: ${({ theme, $active }) =>
    $active ? `${theme.colors.primary}14` : theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-size: 12.5px;
`

const SmallRoleBadge = styled.span`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textSecondary};
`

const SmallCountBadge = styled.span<{ $hasCabinet: boolean }>`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 700;
  background: ${({ $hasCabinet }) =>
    $hasCabinet ? 'rgba(59, 130, 246, 0.14)' : 'rgba(16, 185, 129, 0.14)'};
  color: ${({ $hasCabinet }) => ($hasCabinet ? '#2563eb' : '#059669')};
`

const PositionTypeSegmented = styled.div`
  display: inline-flex;
  border-radius: 7px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
`

const PositionTypePill = styled.button<{ $active: boolean }>`
  padding: 3px 9px;
  font-size: 11px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.surface};
  color: ${({ theme, $active }) =>
    $active ? '#ffffff' : theme.colors.textSecondary};
`

const PresetChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
`

const PresetChip = styled.button<{ $active: boolean }>`
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.primary : theme.colors.border};
  background: ${({ theme, $active }) =>
    $active ? `${theme.colors.primary}18` : theme.colors.surface};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.text};
`

const RoleAndOrdinalGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`

const OrdinalInlineBox = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`

const OrdinalUnitText = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textSecondary};
`

const OrdinalInput = styled.input`
  width: 46px;
  padding: 4px 6px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-size: 12.5px;
  text-align: center;
`

const LivePreviewBadge = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.textSecondary};
  strong {
    color: ${({ theme }) => theme.colors.primary};
  }
`

const PeriodSyncNotice = styled.div<{ $protected: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 12px;
  background: ${({ theme, $protected }) =>
    $protected ? 'rgba(16, 185, 129, 0.09)' : theme.colors.surface};
  border: 1px solid
    ${({ theme, $protected }) =>
      $protected ? 'rgba(16, 185, 129, 0.35)' : theme.colors.border};
  color: ${({ theme }) => theme.colors.text};

  label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    font-weight: 600;
  }
`

const PeriodProtectBadge = styled.span`
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
  color: #059669;
  background: rgba(16, 185, 129, 0.14);
`

const DateGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const DateCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 10px;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`

const DateCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textSecondary};
`

const EraToggleGroup = styled.div`
  display: inline-flex;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
`

const EraBtn = styled.button<{ $active: boolean }>`
  padding: 2px 7px;
  font-size: 10.5px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.background};
  color: ${({ theme, $active }) =>
    $active ? '#ffffff' : theme.colors.textSecondary};
`

const ClearDateBtn = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: underline;
  }
`

const YmdInputRow = styled.div`
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: 6px;
`

const YearInput = styled(TextInput)`
  padding: 6px 8px;
  font-size: 12.5px;
`

const MonthDayInput = styled(TextInput)`
  padding: 6px 8px;
  font-size: 12.5px;
`

const AdvancedAccordion = styled.div`
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  overflow: hidden;
`

const AdvancedToggleBtn = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 12px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  text-align: left;
  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`

const FilledDotBadge = styled.span`
  margin-left: auto;
  font-size: 10.5px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 999px;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => `${theme.colors.primary}18`};
`

const AdvancedBody = styled.div`
  padding: 10px 12px 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const InlineCheckLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
`

const ThreeColGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const TwoColGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const SubFieldLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 4px;
`

const OnboardingLead = styled.div`
  padding: 10px 12px;
  border-radius: 9px;
  font-size: 12.5px;
  line-height: 1.55;
  background: ${({ theme }) => `${theme.colors.primary}10`};
  border: 1px solid ${({ theme }) => `${theme.colors.primary}35`};
  color: ${({ theme }) => theme.colors.text};
`

const SuggestedList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 300px;
  overflow-y: auto;
`

const SuggestedItemLabel = styled.label<{ $checked: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid
    ${({ theme, $checked }) =>
      $checked ? theme.colors.primary : theme.colors.border};
  background: ${({ theme, $checked }) =>
    $checked ? `${theme.colors.primary}12` : theme.colors.surface};
`

const SuggestedItemBody = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text};

  > div {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
`

const SuggestedPeriodText = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.textSecondary};
`

const FooterBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`

const CancelBtn = styled.button`
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
`

const SubmitBtn = styled.button`
  padding: 8px 18px;
  border-radius: 8px;
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`
