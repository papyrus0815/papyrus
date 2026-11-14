import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import React, { useEffect, useMemo, useState } from 'react'
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
import { getPoliticalParties } from '@/shared/api/election'
import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import {
  type CreateGovernmentPositionTenureDto,
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
import { notify } from '@/shared/ui/toast'

import { formatDate, getPersonName } from './cabinets-section.helpers'

export type CabinetFormMode = 'head' | 'collective'
export type HeadTenureActionMode = 'new_tenure' | 'reshuffle_existing'

export interface CabinetFormPolityOption {
  id: string
  name: string
  kind: 'modern' | 'historical'
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

export interface CabinetFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: (savedCabinetId?: string) => void
  isDark: boolean
  country: UnifiedCountry
  constituentPolities?: Array<{
    id: string
    name: string
    startYear?: number | null
    endYear?: number | null
    startEra?: string | null
    endEra?: string | null
  }>
  defaultPolityFilterId?: string
  headPositionOptions?: Array<{
    id: string
    title: string
    positionType?: string | null
    isMonarchical?: boolean | null
  }>
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
      era:
        record.era === 'BC' || numericYear < 0
          ? 'BC'
          : 'AD',
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
  if (explicitType === 'HEAD_OF_STATE' || explicitType === 'HEAD_OF_GOVERNMENT') {
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

export const CabinetFormModal: React.FC<CabinetFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  country,
  constituentPolities = [],
  defaultPolityFilterId = '',
  headPositionOptions = [],
  existingHeadTenures = [],
  editingCabinet = null,
}) => {
  const queryClient = useQueryClient()
  const isEditing = Boolean(editingCabinet)
  const isHistoricalCountryPage = country.type === 'historical'

  // 1) Polity options (Modern + linked historical countries, or Composite Historical + constituents)
  const polityOptions = useMemo<CabinetFormPolityOption[]>(() => {
    const list: CabinetFormPolityOption[] = []
    if (country.type === 'modern') {
      list.push({
        id: country.id,
        name: `${country.name} (현대국가)`,
        kind: 'modern',
      })
      for (const histItem of country.historicalCountries ?? []) {
        list.push({
          id: histItem.id,
          name: histItem.name,
          kind: 'historical',
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
        eraLabel: formatPolityEraRange(country),
      })
      for (const constituentItem of constituentPolities) {
        if (constituentItem.id === country.id) continue
        list.push({
          id: constituentItem.id,
          name: constituentItem.name,
          kind: 'historical',
          eraLabel: formatPolityEraRange(constituentItem),
        })
      }
    }
    return list
  }, [country, constituentPolities])

  const [mode, setMode] = useState<CabinetFormMode>('head')
  const [selectedPolityId, setSelectedPolityId] = useState<string>(country.id)
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

  // Cabinet naming & description
  const [cabinetName, setCabinetName] = useState<string>('')
  const [cabinetDescription, setCabinetDescription] = useState<string>('')

  // Advanced optional details
  const [showAdvancedDetails, setShowAdvancedDetails] = useState<boolean>(false)
  const [partyId, setPartyId] = useState<string>('')
  const [appointmentMethod, setAppointmentMethod] = useState<string>('')
  const [endReason, setEndReason] = useState<string>('')
  const [endReasonDetail, setEndReasonDetail] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Determine effective countryId / historicalCountryId from selectedPolityId
  const resolvedPolityAxis = useMemo(() => {
    const matchedPolity = polityOptions.find(
      (polityOption) => polityOption.id === selectedPolityId,
    )
    if (!matchedPolity) {
      return {
        countryId: isHistoricalCountryPage ? null : country.id,
        historicalCountryId: isHistoricalCountryPage ? country.id : null,
      }
    }
    if (matchedPolity.kind === 'modern') {
      return {
        countryId: matchedPolity.id,
        historicalCountryId: null,
      }
    }
    return {
      countryId: isHistoricalCountryPage ? null : country.id,
      historicalCountryId: matchedPolity.id,
    }
  }, [polityOptions, selectedPolityId, isHistoricalCountryPage, country.id])

  // Initialize state when modal opens or editingCabinet changes
  useEffect(() => {
    if (!isOpen) return
    setErrorMessage(null)
    setPersonQuery('')
    setShowQuickCreatePerson(false)
    setQuickPersonSurname('')
    setQuickPersonGivenName('')
    setQuickPersonOriginalName('')
    setShowExistingTenureBrowser(false)
    setExistingTenureSearch('')

    if (editingCabinet) {
      const headTenure = editingCabinet.headTenure
      const hasHeadTenure = Boolean(headTenure?.id)
      setMode(hasHeadTenure ? 'head' : 'collective')
      setHeadActionMode('new_tenure')
      setSelectedExistingTenureId(headTenure?.id ?? null)

      const editHistId =
        headTenure?.historicalCountryId ??
        editingCabinet.historicalCountryId ??
        null
      const editModernId =
        headTenure?.countryId ?? editingCabinet.countryId ?? null
      if (editHistId && polityOptions.some((opt) => opt.id === editHistId)) {
        setSelectedPolityId(editHistId)
      } else if (
        editModernId &&
        polityOptions.some((opt) => opt.id === editModernId)
      ) {
        setSelectedPolityId(editModernId)
      } else {
        setSelectedPolityId(country.id)
      }

      if (hasHeadTenure) {
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
          era: editingCabinet.endEra ?? headTenure.endEra,
          year: editingCabinet.endYear ?? headTenure.endYear,
          month: editingCabinet.endMonth ?? headTenure.endMonth,
          day: editingCabinet.endDay ?? headTenure.endDay,
          isoDate: editingCabinet.endDate ?? headTenure.endDate,
        })
        setEndEra(parsedEnd.era)
        setEndYear(parsedEnd.year)
        setEndMonth(parsedEnd.month)
        setEndDay(parsedEnd.day)

        setCabinetName(editingCabinet.name ?? '')
        setCabinetDescription(editingCabinet.description ?? '')
        setPartyId(headTenure.partyId ?? headTenure.party?.id ?? '')
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
        setShowAdvancedDetails(false)
      }
      return
    }

    // Create Mode Defaults
    setMode('head')
    setHeadActionMode('new_tenure')
    setSelectedExistingTenureId(null)
    if (
      defaultPolityFilterId &&
      polityOptions.some((opt) => opt.id === defaultPolityFilterId)
    ) {
      setSelectedPolityId(defaultPolityFilterId)
    } else {
      setSelectedPolityId(country.id)
    }
    setSelectedPersonId('')
    setSelectedPersonLabel('')

    const firstDef = headPositionOptions[0]
    const defaultRoleTitle = firstDef?.title ?? (isHistoricalCountryPage ? '총리' : '대통령')
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
    defaultPolityFilterId,
    polityOptions,
    country.id,
    headPositionOptions,
    isHistoricalCountryPage,
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

  // Smart Detection: Existing head tenures for the currently selected person!
  const matchingExistingTenuresForPerson = useMemo(() => {
    if (!selectedPersonId || isEditing) return []
    return existingHeadTenures.filter((tenureItem) => {
      const tenurePersonId = tenureItem.personId ?? tenureItem.person?.id
      return tenurePersonId === selectedPersonId
    })
  }, [selectedPersonId, isEditing, existingHeadTenures])

  const selectedExistingTenure = useMemo(() => {
    if (!selectedExistingTenureId) return null
    return (
      existingHeadTenures.find(
        (tenureItem) => tenureItem.id === selectedExistingTenureId,
      ) ?? null
    )
  }, [selectedExistingTenureId, existingHeadTenures])

  // Combined role presets (Country positionDefinitions + standard executive presets)
  const rolePresetChips = useMemo(() => {
    const seenTitles = new Set<string>()
    const result: Array<{
      title: string
      positionType: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT'
      positionDefId: string | null
    }> = []

    for (const defItem of headPositionOptions) {
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
  }, [headPositionOptions])

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
    if (!keyword) return existingHeadTenures
    return existingHeadTenures.filter((tenureItem) => {
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
  }, [existingHeadTenures, existingTenureSearch])

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

  const saveCabinetMutation = useMutation({
    mutationFn: async () => {
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
      } else if (isEditing) {
        endDateInfo = null
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
          const updatedCollective = await personCareerApi.updateCabinet(
            editingCabinet.id,
            {
              name: trimmedCollectiveName,
              description: cabinetDescription.trim() || null,
              countryId: resolvedPolityAxis.countryId,
              historicalCountryId: resolvedPolityAxis.historicalCountryId,
              startDateInfo,
              endDateInfo,
            },
          )
          return updatedCollective
        }
        const createdCollective = await personCareerApi.createCabinet({
          headTenureId: null,
          name: trimmedCollectiveName,
          description: cabinetDescription.trim() || null,
          countryId: resolvedPolityAxis.countryId,
          historicalCountryId: resolvedPolityAxis.historicalCountryId,
          startDateInfo,
          endDateInfo: endDateInfo ?? null,
        })
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
        const createdReshuffle = await personCareerApi.createCabinet({
          headTenureId: selectedExistingTenureId,
          name: trimmedReshuffleName || null,
          description: cabinetDescription.trim() || null,
          startDateInfo,
          endDateInfo: endDateInfo ?? null,
          allowReshuffle: existingCabinetCount > 0,
        })
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

      const matchedDef = headPositionOptions.find(
        (defOption) =>
          defOption.id === selectedPositionDefId &&
          defOption.title.trim() === trimmedRoleTitle,
      ) ??
        headPositionOptions.find(
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
            startDateInfo,
            endDateInfo,
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
        const updatedCabinet = await personCareerApi.updateCabinet(
          editingCabinet.id,
          {
            name: cabinetName.trim() || null,
            description: cabinetDescription.trim() || null,
            countryId: resolvedPolityAxis.countryId,
            historicalCountryId: resolvedPolityAxis.historicalCountryId,
            startDateInfo,
            endDateInfo,
          },
        )
        return updatedCabinet as { id?: string } | null
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

      const savedCabinet = await personCareerApi.createCabinet({
        headTenureId: createdTenure.id,
        name: cabinetName.trim() || null,
        description: cabinetDescription.trim() || null,
        countryId: resolvedPolityAxis.countryId,
        historicalCountryId: resolvedPolityAxis.historicalCountryId,
        startDateInfo,
        endDateInfo: endDateInfo ?? null,
      })
      return savedCabinet as { id?: string } | null
    },
    onSuccess: (savedCabinet) => {
      invalidateTenureQueries(queryClient, {
        personId: selectedPersonId || null,
        cabinetId: savedCabinet?.id ?? editingCabinet?.id ?? null,
        countryId: resolvedPolityAxis.countryId ?? null,
        historicalCountryId: resolvedPolityAxis.historicalCountryId ?? null,
      })
      notify.success(
        isEditing
          ? '행정부 · 내각 정보가 수정되었습니다.'
          : headActionMode === 'reshuffle_existing'
            ? '기존 수반 임기에 새 내각(개각)이 개설되었습니다.'
            : '행정부 · 내각이 등록되었습니다.',
      )
      onSaved?.(savedCabinet?.id ?? editingCabinet?.id)
      onClose()
    },
    onError: (mutationError) => {
      setErrorMessage(getApiErrorMessage(mutationError))
    },
  })

  if (!isOpen) return null

  return createPortal(
    <Backdrop onMouseDown={onClose}>
      <ModalCard onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}>
        <HeaderBar>
          <HeaderTitleGroup>
            <ContextBadge>
              {isEditing ? '행정부 · 내각 수정' : '행정부 · 내각 원스톱 등록'}
            </ContextBadge>
            <HeaderTitle>
              {isEditing
                ? editingCabinet?.name?.trim() || autoCabinetNamePreview
                : `${country.name} 행정부 · 내각 등록`}
            </HeaderTitle>
          </HeaderTitleGroup>
          <CloseButton type="button" onClick={onClose} aria-label="닫기">
            <FiX size={18} />
          </CloseButton>
        </HeaderBar>

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

          {/* 2. Target Polity / Historical Era Selector (if multiple polities exist) */}
          {polityOptions.length > 1 ? (
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
                      onClick={() => setSelectedPolityId(polityItem.id)}
                    >
                      <span>{polityItem.name}</span>
                      {polityItem.eraLabel ? (
                        <PolityEraText>({polityItem.eraLabel})</PolityEraText>
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
                    {!isEditing && existingHeadTenures.length > 0 ? (
                      <TextActionButton
                        type="button"
                        onClick={() =>
                          setShowExistingTenureBrowser((prev) => !prev)
                        }
                      >
                        <FiLayers size={12} />
                        {showExistingTenureBrowser
                          ? '인물 직접 검색으로 돌아가기'
                          : `기존 수반 임기(${existingHeadTenures.length}건)에서 선택`}
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
                      {filteredExistingTenuresForBrowser.map((tenureItem) => {
                        const personLabel = getPersonName(tenureItem.person)
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
                              <SmallCountBadge $hasCabinet={existingCabCount > 0}>
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
                      })}
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
                          setQuickPersonOriginalName(changeEvent.target.value)
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
                            : '추천 인물이 없습니다. 이름을 검색하거나 [새 인물 즉석 등록]을 눌러주세요.'}
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

                {/* Smart Auto-Detection Banner when selected person already has head tenures! */}
                {!isEditing && matchingExistingTenuresForPerson.length > 0 ? (
                  <SmartTenureBanner>
                    <SmartBannerHeader>
                      <FiRefreshCw size={13} />
                      <span>
                        <strong>{selectedPersonLabel}</strong>의 기존 수반 재임
                        기록이 {matchingExistingTenuresForPerson.length}건
                        있습니다. 어떤 작업을 진행할까요?
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
                      {matchingExistingTenuresForPerson.map((existingTenure) => {
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
                              applyExistingTenureForReshuffle(existingTenure)
                            }
                          >
                            <FiRefreshCw size={13} />
                            <div>
                              <strong>
                                기존 임기({ordLabel}
                                {roleLabel}, {yearRange})에 개각 추가
                              </strong>
                              <span>
                                제2차·개조내각·전시내각 등 새 내각 구성만 개설
                              </span>
                            </div>
                          </SmartActionChoiceBtn>
                        )
                      })}
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
                        $active={positionTypeOverride === 'HEAD_OF_GOVERNMENT'}
                        onClick={() =>
                          setPositionTypeOverride('HEAD_OF_GOVERNMENT')
                        }
                      >
                        정부수반·총리·재상
                      </PositionTypePill>
                    </PositionTypeSegmented>
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
                            setSelectedPositionDefId(presetItem.positionDefId)
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

          {/* 5. Cabinet Name (for both head & collective modes, and both create & edit modes!) */}
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
          </FieldBlock>

          {/* 6. Structured Period Input (BC/AD + Year + Month + Day) */}
          <FieldBlock>
            <LabelRow>
              <FieldLabel>
                {headActionMode === 'reshuffle_existing'
                  ? '개각 내각 존속 기간'
                  : mode === 'collective'
                    ? '기구 존속 기간 (출범 ~ 해산)'
                    : '재임 · 내각 기간 (취임 ~ 퇴임)'}{' '}
                <RequiredMark>*</RequiredMark>
              </FieldLabel>
              <FieldSubtleHint>
                연도만 입력해도 저장되며, 종료 연도를 비워두면 현직(재임 중)으로
                처리됩니다
              </FieldSubtleHint>
            </LabelRow>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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

          {/* 7. Collapsible Optional Details (Party, Appointment Method, End Reason, Notes) */}
          {mode === 'head' && headActionMode === 'new_tenure' ? (
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
                  상세 정보 (소속 정당 · 취임 방식 · 퇴임 사유 · 비고)
                </span>
                {(partyId || appointmentMethod || endReason || notes.trim()) && (
                  <FilledDotBadge>입력됨</FilledDotBadge>
                )}
              </AdvancedToggleBtn>

              {showAdvancedDetails ? (
                <AdvancedBody>
                  <ThreeColGrid>
                    <div>
                      <SubFieldLabel>소속 정당 (선택)</SubFieldLabel>
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
                        <option value="INDIRECT_ELECTION">간접 선거</option>
                        <option value="PARLIAMENTARY_ELECTION">
                          의회 선출 (내각책임제 등)
                        </option>
                        <option value="APPOINTMENT">군주 · 원수 임명</option>
                        <option value="SUCCESSION">승계 (부통령 등)</option>
                        <option value="HEREDITARY">세습</option>
                        <option value="COUP">쿠데타 · 혁명</option>
                        <option value="RESTORATION">복위 · 재추대</option>
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
                        <option value="RESIGNATION">사임 · 내각 총사퇴</option>
                        <option value="PARLIAMENT_DISSOLVED">
                          의회 해산 · 총선 교대
                        </option>
                        <option value="NO_CONFIDENCE">내각 불신임</option>
                        <option value="IMPEACHMENT">탄핵 · 파면</option>
                        <option value="REMOVAL">해임 · 면직</option>
                        <option value="DEATH_IN_OFFICE">재임 중 사망</option>
                        <option value="ASSASSINATION">암살 · 피살</option>
                        <option value="OVERTHROWN">쿠데타 · 혁명 축출</option>
                        <option value="ABDICATION">퇴위 · 양위</option>
                        <option value="WAR_DEFEAT">전쟁 패배</option>
                        <option value="STATE_DISSOLVED">국가 소멸 · 멸망</option>
                        <option value="OTHER">기타</option>
                      </SelectInput>
                    </div>
                  </ThreeColGrid>

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
                </AdvancedBody>
              ) : null}
            </AdvancedAccordion>
          ) : null}
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
  width: min(620px, 100%);
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
  gap: 10px;
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
