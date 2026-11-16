import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiAlertCircle,
  FiArrowRight,
  FiCheck,
  FiClock,
  FiInfo,
  FiLayers,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiUser,
  FiUsers,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { GOVERNMENT_FORM_LABEL } from '@/entities/political-system/model/political-system'
import { useCountries } from '@/features/country/api'
import { useHistoricalCountries } from '@/features/historical-country/use-historical-countries.hook'
import {
  linkCabinetToEvent,
  listEventsForCabinet,
  unlinkCabinetFromEvent,
} from '@/shared/api/cabinet-events'
import {
  addCabinetPoliticalParty,
  getCabinetPoliticalParties,
  getPartyMemberships,
  getScopedPoliticalParties,
  type PoliticalPartyRow,
} from '@/shared/api/election'
import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import {
  type CreateGovernmentPositionTenureDto,
  type SuggestedCabinetMemberDto,
  personCareerApi,
} from '@/shared/api/person-career'
import {
  listPoliticalSystems,
  type PoliticalSystem,
} from '@/shared/api/political-system'
import { politicalPartyApi } from '@/shared/api/political-party'
import {
  createPerson,
  type Era,
  getPersonsByHistoricalCountryUnion,
  getPersonsByTenureCountry,
  type PersonResponseDto,
  type PersonSearchItem,
  searchPersons,
} from '@/shared/api/persons'
import { compareByCountryStart } from '@/shared/lib/country-period'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import {
  buildPartialDateString,
  isPartialRangeInverted,
  parsePartialDateString,
} from '@/shared/lib/partial-date-string'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { AlertBox } from '@/shared/ui/alert-box/alert-box'
import { confirm } from '@/shared/ui/confirm-dialog'
import {
  DatePickerModal,
  type DatePickerPrecision,
} from '@/shared/ui/date-picker/date-picker-modal'
import { InlineDateField } from '@/shared/ui/person-register-modal/sections/inline-date-field'
import {
  FieldControl,
  FieldHint,
  FieldLabel,
  FieldRow,
  FormGroup,
  FormGroupTitle,
  Input,
  LabeledRowsWrap,
  OptionalTag,
  Required,
  SubField,
  SubFieldLabel,
  SubFieldPair,
} from '@/shared/ui/register-form-layout'
import {
  FooterActions,
  FooterHint,
  FooterJumpArrow,
  FooterJumpButton,
  FooterKbd,
  FooterMissingCount,
  FooterReadyBadge,
  FooterReadyGroup,
  FooterShortcutItem,
  HeaderActionsBar,
  HeaderResetBtn,
  SectionJumpBtn,
  SectionJumpNav,
  useModalSubmitShortcut,
} from '@/shared/ui/register-modal-shell/register-modal-chrome'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import {
  PersonRegisterModalCancelBtn,
  PersonRegisterModalFormScroll,
  PersonRegisterModalPrimaryBtn,
  PersonRegisterModalStickyFooter,
  PersonRegisterModalTextarea,
} from '@/shared/ui/register-modal-shell/register-modal-shell'
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/shared/ui/searchable-select'
import { notify } from '@/shared/ui/toast'

import {
  buildPreviousCabinetBriefing,
  buildReappointmentSuggestion,
  buildSortedPolityOptions,
  canAutoClosePreviousOngoingCabinet,
  checkPersonTenureLifespanWarning,
  checkReshuffleTenureRangeWarning,
  type EnrichedPolityOption,
  type ExistingCabinetSummary,
  extractCanonicalRoleFromPoliticalSystem,
  findMatchingPoliticalSystem,
  formatPartyOptionLabel,
  formatPeriodDurationSummary,
  formatPersonLifespanTag,
  formatPolityEraRange,
  formatQuickPersonPreview,
  inferDefaultQuickPersonNameOrder,
  inferExecutivePositionType,
  isMonarchicalExecutiveOption,
  isPersonPlausibleForYear,
  organizePartiesForCabinetScope,
  parseStructuredOrIsoDate,
  type PersonLifespanCandidate,
  resolveContemporaryRepublicNotice,
  resolveMatchingPartyFromMemberships,
  resolvePolityYearGuidance,
  resolveSmartDefaultExecutiveRole,
} from './cabinet-form-modal.helpers'
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
  appointmentDetail?: string | null
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
  /** 진입 시 기본 등록 방식 (예: 집단지도 필터 활성 상태에서 열 때 `'collective'`) */
  initialMode?: CabinetFormMode
  headPositionOptions?: ScopedPositionOption[]
  existingHeadTenures?: ExistingHeadTenureOption[]
  editingCabinet?: EditableCabinetRecord | null
}

type ModalSectionKey = 'period' | 'leader' | 'role' | 'extra'

const DEFAULT_EXECUTIVE_ROLE_PRESETS: Array<{
  title: string
  positionType: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT'
  isMonarchical?: boolean
}> = [
  { title: '총리', positionType: 'HEAD_OF_GOVERNMENT' },
  { title: '대통령', positionType: 'HEAD_OF_STATE' },
  { title: '국무총리', positionType: 'HEAD_OF_GOVERNMENT' },
  { title: '내각총리대신', positionType: 'HEAD_OF_GOVERNMENT' },
  { title: '각료평의회 의장', positionType: 'HEAD_OF_GOVERNMENT' },
  { title: '수상', positionType: 'HEAD_OF_GOVERNMENT' },
  { title: '재상', positionType: 'HEAD_OF_GOVERNMENT' },
  { title: '권한대행', positionType: 'HEAD_OF_GOVERNMENT' },
  { title: '영의정', positionType: 'HEAD_OF_GOVERNMENT' },
  { title: '승상', positionType: 'HEAD_OF_GOVERNMENT' },
  { title: '집정관', positionType: 'HEAD_OF_STATE' },
  { title: '최고지도자', positionType: 'HEAD_OF_STATE' },
  { title: '섭정', positionType: 'HEAD_OF_STATE', isMonarchical: true },
  { title: '국왕(친정)', positionType: 'HEAD_OF_STATE', isMonarchical: true },
]

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

const EMPTY_CONSTITUENT_POLITIES: NonNullable<
  CabinetFormModalProps['constituentPolities']
> = []
const EMPTY_HEAD_POSITION_OPTIONS: ScopedPositionOption[] = []
const EMPTY_EXISTING_HEAD_TENURES: ExistingHeadTenureOption[] = []

export const CabinetFormModal: React.FC<CabinetFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  country = null,
  initialPolityValue = '',
  constituentPolities = EMPTY_CONSTITUENT_POLITIES,
  defaultPolityFilterId = '',
  initialMode,
  headPositionOptions = EMPTY_HEAD_POSITION_OPTIONS,
  existingHeadTenures = EMPTY_EXISTING_HEAD_TENURES,
  editingCabinet = null,
}) => {
  const queryClient = useQueryClient()
  const instanceId = useId()
  const isEditing = Boolean(editingCabinet)
  const isStandaloneCatalogMode = !country

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const periodSectionRef = useRef<HTMLElement>(null)
  const leaderSectionRef = useRef<HTMLElement>(null)
  const roleSectionRef = useRef<HTMLElement>(null)
  const extraSectionRef = useRef<HTMLElement>(null)

  const startDateAnchorId = `cab-start-date-${instanceId}`
  const endDateAnchorId = `cab-end-date-${instanceId}`

  const [activeSection, setActiveSection] =
    useState<ModalSectionKey>('period')
  const [activeDatePicker, setActiveDatePicker] = useState<
    'start' | 'end' | null
  >(null)
  const [showMonarchicalRolePresets, setShowMonarchicalRolePresets] =
    useState<boolean>(false)

  // Standalone global catalog queries OR fallback historicalCountries when synthetic country object omits them
  const needsModernCountryLookup =
    isStandaloneCatalogMode ||
    (country?.type === 'modern' &&
      (!country.historicalCountries ||
        country.historicalCountries.length === 0))

  const { data: globalCountries = [] } = useCountries({
    enabled: isOpen && needsModernCountryLookup,
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
      .sort(compareByCountryStart)
      .map((histItem) => {
        const rangeText = formatPolityEraRange(histItem)
        return {
          value: `h:${histItem.id}`,
          label: rangeText ? `${histItem.name} (${rangeText})` : histItem.name,
          group: '역사적 국가 · 왕조 · 시대 정체',
        }
      })
    return [...modernOpts, ...historicalOpts]
  }, [isStandaloneCatalogMode, globalCountries, globalHistoricalCountries])

  // Fetch all cabinets across the parent country scope so polity chips show exact counts & previous cabinet summary works
  const { data: countryScopeCabinets = [] } = useQuery({
    queryKey: [
      'cabinet-form-scope-cabinets',
      country?.id ?? '',
      country?.type ?? 'standalone',
    ],
    queryFn: async () => {
      if (!country) return []
      const rows = await personCareerApi.getCabinets({
        ...(country.type === 'modern'
          ? { countryId: country.id }
          : {
              historicalCountryId: country.id,
              includeConstituents: true,
            }),
        take: 500,
      })
      return Array.isArray(rows) ? (rows as ExistingCabinetSummary[]) : []
    },
    enabled: isOpen && Boolean(country?.id),
    staleTime: 45_000,
  })

  const cabinetCountByPolityId = useMemo(() => {
    const countMap = new Map<string, number>()
    for (const cabItem of countryScopeCabinets) {
      const targetPolityId =
        cabItem.historicalCountryId ??
        cabItem.headTenure?.historicalCountryId ??
        cabItem.countryId ??
        null
      if (targetPolityId) {
        countMap.set(targetPolityId, (countMap.get(targetPolityId) ?? 0) + 1)
      }
    }
    return countMap
  }, [countryScopeCabinets])

  const fallbackHistoricalCountries = useMemo(() => {
    if (!country || country.type !== 'modern') return []
    if (country.historicalCountries && country.historicalCountries.length > 0) {
      return country.historicalCountries
    }
    const foundModern = globalCountries.find(
      (countryItem) => countryItem.id === country.id,
    )
    return foundModern?.historicalCountries ?? []
  }, [country, globalCountries])

  const polityOptions = useMemo<EnrichedPolityOption[]>(
    () =>
      buildSortedPolityOptions({
        country,
        fallbackHistoricalCountries,
        constituentPolities,
        cabinetCountByPolityId,
      }),
    [
      country,
      fallbackHistoricalCountries,
      constituentPolities,
      cabinetCountByPolityId,
    ],
  )

  const [mode, setMode] = useState<CabinetFormMode>('head')
  const [selectedPolityId, setSelectedPolityId] = useState<string>(
    country?.id ?? '',
  )
  const [headActionMode, setHeadActionMode] =
    useState<HeadTenureActionMode>('new_tenure')
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
  const [quickPersonNameOrder, setQuickPersonNameOrder] = useState<
    'korean' | 'western'
  >('korean')
  const quickOrderTouchedRef = useRef<boolean>(false)

  // Role & term state
  const [roleTitle, setRoleTitle] = useState<string>('총리')
  const [positionTypeOverride, setPositionTypeOverride] = useState<
    'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT'
  >('HEAD_OF_GOVERNMENT')
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
  const [autoClosePreviousCabinet, setAutoClosePreviousCabinet] =
    useState<boolean>(true)

  // Cabinet naming & description
  const [cabinetName, setCabinetName] = useState<string>('')
  const [cabinetDescription, setCabinetDescription] = useState<string>('')

  // Extra context details
  const [partyId, setPartyId] = useState<string>('')
  const [autoLinkRulingParty, setAutoLinkRulingParty] = useState<boolean>(true)
  const [autoSuggestedPartyLabel, setAutoSuggestedPartyLabel] = useState<
    string | null
  >(null)
  const [showQuickCreateParty, setShowQuickCreateParty] =
    useState<boolean>(false)
  const [quickPartyName, setQuickPartyName] = useState<string>('')
  const [quickPartyShortName, setQuickPartyShortName] = useState<string>('')
  const [quickPartyScope, setQuickPartyScope] = useState<'active' | 'modern'>(
    'active',
  )

  const [originEventId, setOriginEventId] = useState<string>('')
  const [initialOriginEventTitle, setInitialOriginEventTitle] = useState<
    string | null
  >(null)
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
  const [batchSavedCount, setBatchSavedCount] = useState<number>(0)

  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const initializedSessionKeyRef = useRef<string | null>(null)
  const userTouchedRoleRef = useRef<boolean>(false)
  const userTouchedPartyRef = useRef<boolean>(false)
  const userTouchedOriginEventRef = useRef<boolean>(false)
  const hydratedEditExtrasIdRef = useRef<string | null>(null)
  const initialOriginEventIdRef = useRef<string>('')
  const initialEditPartyIdRef = useRef<string>('')
  const continueAfterSaveRef = useRef<boolean>(false)
  const lastBatchSavedCabinetIdRef = useRef<string | undefined>(undefined)

  // Determine effective countryId / historicalCountryId & display metadata
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
          stateType: null as string | null,
          isoCode: foundModern?.isoCode ?? null,
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
        const linkedModern = linkedModernId
          ? globalCountries.find(
              (countryItem) => countryItem.id === linkedModernId,
            )
          : null
        return {
          countryId: linkedModernId,
          historicalCountryId: histId || null,
          displayName: foundHist?.name ?? '선택 역사국가',
          isHistorical: true,
          stateType: foundHist?.stateType ?? null,
          isoCode: linkedModern?.isoCode ?? null,
        }
      }
      return {
        countryId: null,
        historicalCountryId: null,
        displayName: '',
        isHistorical: false,
        stateType: null as string | null,
        isoCode: null as string | null,
      }
    }

    const isHistPage = country.type === 'historical'
    const matchedPolity = polityOptions.find(
      (polityOption) => polityOption.id === selectedPolityId,
    )
    if (!matchedPolity) {
      if (selectedPolityId && selectedPolityId !== country.id) {
        return {
          countryId: isHistPage ? null : country.id,
          historicalCountryId: selectedPolityId,
          displayName: country.name,
          isHistorical: true,
          stateType: country.stateType ?? null,
          isoCode: country.isoCode ?? null,
        }
      }
      return {
        countryId: isHistPage ? null : country.id,
        historicalCountryId: isHistPage ? country.id : null,
        displayName: country.name,
        isHistorical: isHistPage,
        stateType: country.stateType ?? null,
        isoCode: country.isoCode ?? null,
      }
    }
    if (matchedPolity.kind === 'modern') {
      return {
        countryId: matchedPolity.id,
        historicalCountryId: null,
        displayName: country.name,
        isHistorical: false,
        stateType: null,
        isoCode: country.isoCode ?? null,
      }
    }
    return {
      countryId: isHistPage ? null : country.id,
      historicalCountryId: matchedPolity.id,
      displayName: matchedPolity.name,
      isHistorical: true,
      stateType: matchedPolity.stateType ?? country.stateType ?? null,
      isoCode: country.isoCode ?? null,
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

  const signedStartYear = useMemo<number | null>(() => {
    const numericStart = Number(startYear.trim())
    if (
      !startYear.trim() ||
      !Number.isInteger(numericStart) ||
      numericStart <= 0
    ) {
      return null
    }
    return startEra === 'BC' ? -numericStart : numericStart
  }, [startEra, startYear])

  // Load political systems across BOTH historical polity and parent modern country so parent regimes are never hidden
  const { data: politicalSystems = [] } = useQuery({
    queryKey: [
      'cabinet-form-political-systems',
      resolvedPolityAxis.countryId ?? '',
      resolvedPolityAxis.historicalCountryId ?? '',
    ],
    queryFn: async () => {
      const requests: Array<Promise<PoliticalSystem[]>> = []
      if (resolvedPolityAxis.historicalCountryId) {
        requests.push(
          listPoliticalSystems({
            historicalCountryId: resolvedPolityAxis.historicalCountryId,
          }),
        )
      }
      if (resolvedPolityAxis.countryId) {
        requests.push(
          listPoliticalSystems({ countryId: resolvedPolityAxis.countryId }),
        )
      }
      if (requests.length === 0) return []
      const batches = await Promise.all(requests)
      const dedupedMap = new Map<string, PoliticalSystem>()
      for (const batchRows of batches) {
        for (const sysItem of batchRows) {
          if (!dedupedMap.has(sysItem.id)) {
            dedupedMap.set(sysItem.id, sysItem)
          }
        }
      }
      return Array.from(dedupedMap.values())
    },
    enabled:
      isOpen &&
      Boolean(
        resolvedPolityAxis.countryId || resolvedPolityAxis.historicalCountryId,
      ),
    staleTime: 60_000,
  })

  const activePoliticalSystem = useMemo(
    () =>
      findMatchingPoliticalSystem(
        politicalSystems,
        resolvedPolityAxis,
        signedStartYear,
      ),
    [politicalSystems, resolvedPolityAxis, signedStartYear],
  )

  // Dynamically load position definitions & existing head tenures + cabinets for active polity
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

  const { data: fetchedPolityBundle } = useQuery({
    queryKey: [
      'cabinet-form-polity-bundle',
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
      const safeCabs = Array.isArray(rawCabs)
        ? (rawCabs as ExistingCabinetSummary[])
        : []
      const cabCountByHeadId = new Map<string, number>()
      for (const cabItem of rawCabs) {
        const headId = cabItem.headTenure?.id ?? cabItem.headTenureId
        if (headId) {
          cabCountByHeadId.set(headId, (cabCountByHeadId.get(headId) ?? 0) + 1)
        }
      }
      const execTenures = (rawTenures as ExistingHeadTenureOption[])
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

      return {
        tenures: execTenures,
        cabinets: safeCabs,
      }
    },
    enabled:
      isOpen &&
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
        : (fetchedPolityBundle?.tenures ?? [])
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
  }, [existingHeadTenures, fetchedPolityBundle, resolvedPolityAxis])

  const activePolityCabinets = useMemo<ExistingCabinetSummary[]>(() => {
    if (countryScopeCabinets.length > 0) {
      return countryScopeCabinets.filter((cabItem) => {
        const cabHistId =
          cabItem.historicalCountryId ??
          cabItem.headTenure?.historicalCountryId ??
          null
        const cabModernId =
          cabItem.countryId ?? cabItem.headTenure?.countryId ?? null
        if (resolvedPolityAxis.historicalCountryId) {
          return cabHistId === resolvedPolityAxis.historicalCountryId
        }
        if (resolvedPolityAxis.countryId) {
          return cabModernId === resolvedPolityAxis.countryId && !cabHistId
        }
        return true
      })
    }
    return fetchedPolityBundle?.cabinets ?? []
  }, [countryScopeCabinets, fetchedPolityBundle, resolvedPolityAxis])

  // Smart default executive role (excludes monarchical titles like 국왕!)
  const smartRoleDefault = useMemo(
    () =>
      resolveSmartDefaultExecutiveRole({
        headPositionOptions: effectiveHeadPositionOptions,
        existingHeadTenures: effectiveExistingHeadTenures,
        activePoliticalSystem,
        polityDisplayName: resolvedPolityAxis.displayName,
        polityStateType: resolvedPolityAxis.stateType,
        countryIsoCode: resolvedPolityAxis.isoCode ?? country?.isoCode ?? null,
        isHistoricalPolity: resolvedPolityAxis.isHistorical,
      }),
    [
      effectiveHeadPositionOptions,
      effectiveExistingHeadTenures,
      activePoliticalSystem,
      resolvedPolityAxis,
      country,
    ],
  )

  const resetCreateFormFields = useCallback(() => {
    userTouchedRoleRef.current = false
    userTouchedPartyRef.current = false
    userTouchedOriginEventRef.current = false
    hydratedEditExtrasIdRef.current = null
    initialOriginEventIdRef.current = ''
    initialEditPartyIdRef.current = ''
    quickOrderTouchedRef.current = false
    setErrorMessage(null)
    setOnboardingCabinetId(null)
    setSuggestedMinisters([])
    setCheckedMinisterIds([])
    setActiveDatePicker(null)
    setActiveSection('period')
    setShowMonarchicalRolePresets(false)
    setShowQuickCreateParty(false)
    setQuickPartyName('')
    setQuickPartyShortName('')
    setAutoSuggestedPartyLabel(null)
    setInitialOriginEventTitle(null)

    setMode(initialMode ?? 'head')
    setHeadActionMode('new_tenure')
    setSelectedExistingTenureId(null)
    setExistingTenureSearch('')
    setSyncPeriodToHeadTenure(true)
    setAutoClosePreviousCabinet(true)

    if (isStandaloneCatalogMode) {
      setStandalonePolityValue(initialPolityValue || '')
    } else if (defaultPolityFilterId) {
      setSelectedPolityId(defaultPolityFilterId)
    } else if (country) {
      setSelectedPolityId(country.id)
    }

    setSelectedPersonId('')
    setSelectedPersonLabel('')
    setPersonQuery('')
    setShowQuickCreatePerson(false)
    setQuickPersonSurname('')
    setQuickPersonGivenName('')
    setQuickPersonOriginalName('')
    setQuickPersonNameOrder(
      inferDefaultQuickPersonNameOrder({
        country,
        polityDisplayName: country?.name ?? '',
      }),
    )

    setRoleTitle(smartRoleDefault.title)
    setSelectedPositionDefId(smartRoleDefault.positionDefId)
    setPositionTypeOverride(smartRoleDefault.positionType)

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
    setAutoLinkRulingParty(true)
    setOriginEventId('')
    setAppointmentMethod('')
    setEndReason('')
    setEndReasonDetail('')
    setNotes('')
  }, [
    initialMode,
    isStandaloneCatalogMode,
    initialPolityValue,
    defaultPolityFilterId,
    country,
    smartRoleDefault,
  ])

  // Initialize state once per modal open session or when editingCabinet changes
  useEffect(() => {
    if (!isOpen) {
      initializedSessionKeyRef.current = null
      userTouchedRoleRef.current = false
      userTouchedPartyRef.current = false
      userTouchedOriginEventRef.current = false
      hydratedEditExtrasIdRef.current = null
      initialOriginEventIdRef.current = ''
      initialEditPartyIdRef.current = ''
      continueAfterSaveRef.current = false
      lastBatchSavedCabinetIdRef.current = undefined
      quickOrderTouchedRef.current = false
      setBatchSavedCount(0)
      setActiveDatePicker(null)
      return
    }
    const sessionKey = `${editingCabinet?.id ?? 'create'}:${country?.id ?? 'standalone'}:${initialPolityValue || ''}:${defaultPolityFilterId || ''}:${initialMode ?? ''}`
    if (initializedSessionKeyRef.current === sessionKey) {
      return
    }
    initializedSessionKeyRef.current = sessionKey
    setBatchSavedCount(0)
    lastBatchSavedCabinetIdRef.current = undefined
    continueAfterSaveRef.current = false

    if (editingCabinet) {
      userTouchedRoleRef.current = true
      userTouchedPartyRef.current = false
      userTouchedOriginEventRef.current = false
      hydratedEditExtrasIdRef.current = null
      initialOriginEventIdRef.current = ''
      setInitialOriginEventTitle(null)
      setAutoSuggestedPartyLabel(null)
      setShowQuickCreateParty(false)
      setQuickPartyName('')
      setQuickPartyShortName('')
      setErrorMessage(null)
      setOnboardingCabinetId(null)
      setSuggestedMinisters([])
      setCheckedMinisterIds([])
      setPersonQuery('')
      setShowQuickCreatePerson(false)
      setQuickPersonSurname('')
      setQuickPersonGivenName('')
      setQuickPersonOriginalName('')
      setExistingTenureSearch('')
      setOriginEventId('')
      setAutoLinkRulingParty(false)
      setActiveSection('period')

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
      } else if (editHistId) {
        setSelectedPolityId(editHistId)
      } else if (editModernId) {
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
          headTenure.title ?? headTenure.positionDefinition?.title ?? '총리'
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
        const headPartyId = headTenure.partyId ?? headTenure.party?.id ?? ''
        initialEditPartyIdRef.current = headPartyId
        setPartyId(headPartyId)
        setAppointmentMethod(headTenure.appointmentMethod ?? '')
        setEndReason(headTenure.endReason ?? '')
        setEndReasonDetail(headTenure.endReasonDetail ?? '')
        setNotes(headTenure.notes ?? '')
      } else {
        setSelectedPersonId('')
        setSelectedPersonLabel('')
        setCabinetName(editingCabinet.name ?? '')
        setCabinetDescription(editingCabinet.description ?? '')
        initialEditPartyIdRef.current = ''
        setPartyId('')
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
      }
      return
    }

    resetCreateFormFields()
  }, [
    isOpen,
    editingCabinet,
    isStandaloneCatalogMode,
    initialPolityValue,
    defaultPolityFilterId,
    initialMode,
    country,
    resetCreateFormFields,
  ])

  // Keep smart role synced in create mode until user manually chooses a role
  useEffect(() => {
    if (!isOpen || isEditing || userTouchedRoleRef.current) return
    setRoleTitle(smartRoleDefault.title)
    setSelectedPositionDefId(smartRoleDefault.positionDefId)
    setPositionTypeOverride(smartRoleDefault.positionType)
  }, [isOpen, isEditing, smartRoleDefault])

  // Keep quick-person nameDisplayOrder synced to country/polity default until touched
  useEffect(() => {
    if (!isOpen || quickOrderTouchedRef.current) return
    setQuickPersonNameOrder(
      inferDefaultQuickPersonNameOrder({
        country,
        polityDisplayName: resolvedPolityAxis.displayName,
      }),
    )
  }, [isOpen, country, resolvedPolityAxis.displayName])

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

  // Unified person candidate pool across BOTH modern country and active historical polity
  const { data: mergedCountryPersons = [] } = useQuery({
    queryKey: [
      'cabinet-form-unified-persons',
      resolvedPolityAxis.countryId ?? '',
      resolvedPolityAxis.historicalCountryId ?? '',
    ],
    queryFn: async () => {
      const promises: Array<Promise<PersonResponseDto[]>> = []
      if (resolvedPolityAxis.historicalCountryId) {
        promises.push(
          getPersonsByHistoricalCountryUnion(
            resolvedPolityAxis.historicalCountryId,
          ),
        )
      }
      if (resolvedPolityAxis.countryId) {
        promises.push(
          getPersonsByTenureCountry({
            countryId: resolvedPolityAxis.countryId,
          }),
        )
      }
      if (promises.length === 0) return []
      const batches = await Promise.all(promises)
      const dedupedMap = new Map<string, PersonResponseDto>()
      for (const batchList of batches) {
        for (const personItem of batchList) {
          if (!dedupedMap.has(personItem.id)) {
            dedupedMap.set(personItem.id, personItem)
          }
        }
      }
      return Array.from(dedupedMap.values())
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
    queryFn: () => searchPersons(personQuery.trim(), 18),
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
      getScopedPoliticalParties({
        countryId: resolvedPolityAxis.countryId,
        historicalCountryId: resolvedPolityAxis.historicalCountryId,
      }),
    enabled:
      isOpen &&
      Boolean(
        resolvedPolityAxis.countryId || resolvedPolityAxis.historicalCountryId,
      ),
    staleTime: 60_000,
  })

  // Create-mode: query selected person's party memberships to auto-preset ruling party
  const { data: selectedPersonMemberships = [] } = useQuery({
    queryKey: ['cabinet-form-person-memberships', selectedPersonId],
    queryFn: () => getPartyMemberships(selectedPersonId),
    enabled: isOpen && !isEditing && Boolean(selectedPersonId),
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!isOpen || isEditing || userTouchedPartyRef.current) return
    if (!selectedPersonId) {
      setPartyId('')
      setAutoSuggestedPartyLabel(null)
      return
    }
    const matchedMembership = resolveMatchingPartyFromMemberships(
      selectedPersonMemberships,
      signedStartYear,
    )
    if (matchedMembership) {
      setPartyId(matchedMembership.partyId)
      setAutoLinkRulingParty(true)
      setAutoSuggestedPartyLabel(matchedMembership.partyName)
    } else {
      setPartyId('')
      setAutoSuggestedPartyLabel(null)
    }
  }, [
    isOpen,
    isEditing,
    selectedPersonId,
    selectedPersonMemberships,
    signedStartYear,
  ])

  // Edit-mode: hydrate existing ORIGIN event & LEADING party links
  const { data: existingCabinetEventLinks = [] } = useQuery({
    queryKey: ['cabinet-linked-events', editingCabinet?.id ?? ''],
    queryFn: () =>
      editingCabinet?.id
        ? listEventsForCabinet(editingCabinet.id)
        : Promise.resolve([]),
    enabled: isOpen && isEditing && Boolean(editingCabinet?.id),
    staleTime: 30_000,
  })

  const { data: existingCabinetPartyLinks = [] } = useQuery({
    queryKey: ['cabinet-political-parties', editingCabinet?.id ?? ''],
    queryFn: () =>
      editingCabinet?.id
        ? getCabinetPoliticalParties(editingCabinet.id)
        : Promise.resolve([]),
    enabled: isOpen && isEditing && Boolean(editingCabinet?.id),
    staleTime: 30_000,
  })

  useEffect(() => {
    if (!isOpen || !isEditing || !editingCabinet?.id) return
    const targetEditId = editingCabinet.id
    if (hydratedEditExtrasIdRef.current !== targetEditId) {
      const originLink = existingCabinetEventLinks.find(
        (linkItem) => linkItem.role === 'ORIGIN',
      )
      if (originLink && !userTouchedOriginEventRef.current) {
        const linkedTitle =
          (originLink.event as { title?: string | null } | undefined)?.title ??
          '연결된 출범 사건'
        initialOriginEventIdRef.current = originLink.eventId
        setOriginEventId(originLink.eventId)
        setInitialOriginEventTitle(linkedTitle)
        hydratedEditExtrasIdRef.current = targetEditId
      }
    }

    if (!userTouchedPartyRef.current && !partyId) {
      const leadingLink = existingCabinetPartyLinks.find(
        (linkItem) => linkItem.role === 'LEADING',
      )
      if (leadingLink?.partyId) {
        initialEditPartyIdRef.current = leadingLink.partyId
        setPartyId(leadingLink.partyId)
      }
    }
  }, [
    isOpen,
    isEditing,
    editingCabinet,
    existingCabinetEventLinks,
    existingCabinetPartyLinks,
    partyId,
  ])

  const organizedPartyBuckets = useMemo(
    () =>
      organizePartiesForCabinetScope({
        parties,
        countryId: resolvedPolityAxis.countryId,
        historicalCountryId: resolvedPolityAxis.historicalCountryId,
        signedStartYear,
      }),
    [parties, resolvedPolityAxis, signedStartYear],
  )

  const fallbackSelectedPartyOption = useMemo<PoliticalPartyRow | null>(() => {
    if (!partyId) return null
    if (parties.some((partyRow) => partyRow.id === partyId)) return null
    const fromMembership = selectedPersonMemberships.find(
      (memRow) => (memRow.partyId ?? memRow.party?.id) === partyId,
    )
    if (fromMembership?.party) {
      return {
        id: partyId,
        name: fromMembership.party.name,
        shortName: fromMembership.party.shortName ?? null,
      }
    }
    const fromCabinetLink = existingCabinetPartyLinks.find(
      (linkRow) => linkRow.party?.id === partyId,
    )
    if (fromCabinetLink?.party) {
      return {
        id: partyId,
        name: fromCabinetLink.party.name,
        shortName: fromCabinetLink.party.shortName ?? null,
      }
    }
    return null
  }, [partyId, parties, selectedPersonMemberships, existingCabinetPartyLinks])

  const personCandidates = useMemo(() => {
    if (personQuery.trim().length > 0) {
      return searchedPersons.map((personItem: PersonSearchItem) => {
        const matchedFull = mergedCountryPersons.find(
          (fullPerson) => fullPerson.id === personItem.id,
        )
        const lifespanText = matchedFull
          ? formatPersonLifespanTag(matchedFull)
          : null
        return {
          id: personItem.id,
          label: getPersonDisplayName(personItem),
          subLabel: lifespanText ?? personItem.originalName ?? null,
          isContemporary: matchedFull
            ? isPersonPlausibleForYear(matchedFull, signedStartYear)
            : false,
        }
      })
    }

    const ranked = [...mergedCountryPersons].sort((leftPerson, rightPerson) => {
      const leftPlausible = isPersonPlausibleForYear(
        leftPerson,
        signedStartYear,
      )
      const rightPlausible = isPersonPlausibleForYear(
        rightPerson,
        signedStartYear,
      )
      if (leftPlausible !== rightPlausible) {
        return leftPlausible ? -1 : 1
      }
      return 0
    })

    return ranked.slice(0, 16).map((personItem) => ({
      id: personItem.id,
      label: getPersonDisplayName(personItem),
      subLabel:
        formatPersonLifespanTag(personItem) ?? personItem.originalName ?? null,
      isContemporary:
        signedStartYear != null &&
        isPersonPlausibleForYear(personItem, signedStartYear),
    }))
  }, [personQuery, searchedPersons, mergedCountryPersons, signedStartYear])

  const selectedPersonRecord = useMemo<PersonLifespanCandidate | null>(() => {
    if (!selectedPersonId) return null
    return (
      mergedCountryPersons.find(
        (personItem) => personItem.id === selectedPersonId,
      ) ?? null
    )
  }, [selectedPersonId, mergedCountryPersons])

  const personLifespanWarning = useMemo(
    () =>
      checkPersonTenureLifespanWarning(selectedPersonRecord, signedStartYear),
    [selectedPersonRecord, signedStartYear],
  )

  const matchingExistingTenuresForPerson = useMemo(() => {
    if (!selectedPersonId || isEditing) return []
    return effectiveExistingHeadTenures.filter((tenureItem) => {
      const tenurePersonId = tenureItem.personId ?? tenureItem.person?.id
      return tenurePersonId === selectedPersonId
    })
  }, [selectedPersonId, isEditing, effectiveExistingHeadTenures])

  const reappointmentSuggestion = useMemo(
    () => buildReappointmentSuggestion(matchingExistingTenuresForPerson),
    [matchingExistingTenuresForPerson],
  )

  const selectedExistingTenure = useMemo(() => {
    if (!selectedExistingTenureId) return null
    return (
      effectiveExistingHeadTenures.find(
        (tenureItem) => tenureItem.id === selectedExistingTenureId,
      ) ?? null
    )
  }, [selectedExistingTenureId, effectiveExistingHeadTenures])

  const previousCabinetBriefing = useMemo(
    () =>
      buildPreviousCabinetBriefing({
        cabinets: activePolityCabinets,
        existingHeadTenures: effectiveExistingHeadTenures,
        roleTitle,
        positionType: positionTypeOverride,
      }),
    [
      activePolityCabinets,
      effectiveExistingHeadTenures,
      roleTitle,
      positionTypeOverride,
    ],
  )

  const polityYearGuidance = useMemo(
    () =>
      resolvePolityYearGuidance({
        polityOptions,
        selectedPolityId,
        signedStartYear,
      }),
    [polityOptions, selectedPolityId, signedStartYear],
  )

  const contemporaryRepublicNotice = useMemo(
    () => resolveContemporaryRepublicNotice(polityOptions, selectedPolityId),
    [polityOptions, selectedPolityId],
  )

  // Combined role presets separated into standard executive vs monarchical direct-rule
  const { primaryRoleChips, monarchicalRoleChips } = useMemo(() => {
    const seenTitles = new Set<string>()
    const primaryList: Array<{
      title: string
      positionType: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT'
      positionDefId: string | null
    }> = []
    const monarchicalList: Array<{
      title: string
      positionType: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT'
      positionDefId: string | null
    }> = []

    const canonicalRole = extractCanonicalRoleFromPoliticalSystem(
      activePoliticalSystem,
      effectiveHeadPositionOptions,
    )
    if (canonicalRole && !seenTitles.has(canonicalRole.title)) {
      seenTitles.add(canonicalRole.title)
      primaryList.push({
        title: canonicalRole.title,
        positionType: canonicalRole.positionType,
        positionDefId: canonicalRole.positionDefId,
      })
    }

    for (const defItem of effectiveHeadPositionOptions) {
      const cleanTitle = defItem.title?.trim()
      if (!cleanTitle || seenTitles.has(cleanTitle)) continue
      seenTitles.add(cleanTitle)
      const targetEntry = {
        title: cleanTitle,
        positionType: inferExecutivePositionType(
          cleanTitle,
          defItem.positionType as
            | 'HEAD_OF_STATE'
            | 'HEAD_OF_GOVERNMENT'
            | null,
        ),
        positionDefId: defItem.id,
      }
      if (isMonarchicalExecutiveOption(defItem)) {
        monarchicalList.push(targetEntry)
      } else {
        primaryList.push(targetEntry)
      }
    }

    for (const presetItem of DEFAULT_EXECUTIVE_ROLE_PRESETS) {
      if (seenTitles.has(presetItem.title)) continue
      seenTitles.add(presetItem.title)
      const targetEntry = {
        title: presetItem.title,
        positionType: presetItem.positionType,
        positionDefId: null,
      }
      if (isMonarchicalExecutiveOption(presetItem)) {
        monarchicalList.push(targetEntry)
      } else {
        primaryList.push(targetEntry)
      }
    }

    return {
      primaryRoleChips: primaryList,
      monarchicalRoleChips: monarchicalList,
    }
  }, [activePoliticalSystem, effectiveHeadPositionOptions])

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
    const subTermText = subTermInput.trim()
      ? `${subTermInput.trim()}기 `
      : selectedExistingTenure?.subTermNumber != null
        ? `${selectedExistingTenure.subTermNumber}기 `
        : ''
    const suffix =
      positionTypeOverride === 'HEAD_OF_STATE' ? '행정부' : '내각'
    return `${ordinalText}${subTermText}${personLabel} ${suffix}`
  }, [
    selectedPersonLabel,
    selectedExistingTenure,
    ordinalInput,
    subTermInput,
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

  const startDateParts = useMemo(
    () => ({ era: startEra, year: startYear, month: startMonth, day: startDay }),
    [startEra, startYear, startMonth, startDay],
  )
  const endDateParts = useMemo(
    () => ({ era: endEra, year: endYear, month: endMonth, day: endDay }),
    [endEra, endYear, endMonth, endDay],
  )

  const isDateInverted = useMemo(
    () => isPartialRangeInverted(startDateParts, endDateParts),
    [startDateParts, endDateParts],
  )

  const durationSummary = useMemo(
    () =>
      isDateInverted
        ? null
        : formatPeriodDurationSummary(startDateParts, endDateParts),
    [isDateInverted, startDateParts, endDateParts],
  )

  const canAutoClosePrev = useMemo(
    () =>
      !isEditing &&
      !isDateInverted &&
      canAutoClosePreviousOngoingCabinet(
        previousCabinetBriefing,
        startDateParts,
      ),
    [isEditing, isDateInverted, previousCabinetBriefing, startDateParts],
  )

  const reshuffleRangeWarning = useMemo(
    () =>
      !isEditing && mode === 'head' && headActionMode === 'reshuffle_existing'
        ? checkReshuffleTenureRangeWarning({
            tenure: selectedExistingTenure,
            cabinetStart: startDateParts,
            cabinetEnd: endDateParts,
          })
        : null,
    [
      isEditing,
      mode,
      headActionMode,
      selectedExistingTenure,
      startDateParts,
      endDateParts,
    ],
  )

  const quickPersonFullPreview = useMemo(
    () =>
      formatQuickPersonPreview({
        surname: quickPersonSurname,
        givenName: quickPersonGivenName,
        nameDisplayOrder: quickPersonNameOrder,
      }),
    [quickPersonSurname, quickPersonGivenName, quickPersonNameOrder],
  )

  const applyExistingTenureForReshuffle = (
    tenureItem: ExistingHeadTenureOption,
  ) => {
    setMode('head')
    setHeadActionMode('reshuffle_existing')
    setSelectedExistingTenureId(tenureItem.id)
    setSelectedPersonId(tenureItem.personId ?? tenureItem.person?.id ?? '')
    setSelectedPersonLabel(
      tenureItem.person ? getPersonName(tenureItem.person) : '',
    )
    if (!startYear.trim()) {
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
    }
  }

  const applyDatePickerSelection = (
    target: 'start' | 'end',
    isoString: string,
    precision: DatePickerPrecision,
  ) => {
    const parsed = parsePartialDateString(isoString)
    const nextMonth = precision === 'year' ? '' : parsed.month
    const nextDay = precision === 'day' ? parsed.day : ''
    if (target === 'start') {
      setStartEra(parsed.era)
      setStartYear(parsed.year)
      setStartMonth(nextMonth)
      setStartDay(nextDay)
    } else {
      setEndEra(parsed.era)
      setEndYear(parsed.year)
      setEndMonth(nextMonth)
      setEndDay(nextDay)
    }
    setActiveDatePicker(null)
  }

  const jumpToSection = useCallback((sectionKey: ModalSectionKey) => {
    setActiveSection(sectionKey)
    const refMap: Record<ModalSectionKey, React.RefObject<HTMLElement | null>> =
      {
        period: periodSectionRef,
        leader: leaderSectionRef,
        role: roleSectionRef,
        extra: extraSectionRef,
      }
    refMap[sectionKey].current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }, [])

  // Missing required fields computation for Sticky Footer Jump Button
  const missingFieldItems = useMemo(() => {
    const items: Array<{ label: string; section: ModalSectionKey }> = []
    if (
      !resolvedPolityAxis.countryId &&
      !resolvedPolityAxis.historicalCountryId
    ) {
      items.push({ label: '소속 국가·정치체', section: 'period' })
    }
    if (!startYear.trim()) {
      items.push({ label: '출범·취임 연도', section: 'period' })
    } else if (isDateInverted) {
      items.push({ label: '종료일 역전 수정', section: 'period' })
    }

    if (mode === 'collective') {
      if (!cabinetName.trim()) {
        items.push({ label: '집단지도기구 명칭', section: 'role' })
      }
    } else if (!isEditing && headActionMode === 'reshuffle_existing') {
      if (!selectedExistingTenureId) {
        items.push({ label: '기준 수반 임기 선택', section: 'leader' })
      } else if (
        (selectedExistingTenure?._existingCabinetCount ?? 0) > 0 &&
        !cabinetName.trim()
      ) {
        items.push({ label: '개각 구분 명칭', section: 'role' })
      }
    } else {
      if (!selectedPersonId) {
        items.push({ label: '수반 인물 선택', section: 'leader' })
      }
      if (!roleTitle.trim()) {
        items.push({ label: '수반 직책명', section: 'role' })
      }
    }

    return items
  }, [
    resolvedPolityAxis,
    startYear,
    isDateInverted,
    mode,
    cabinetName,
    isEditing,
    headActionMode,
    selectedExistingTenureId,
    selectedExistingTenure,
    selectedPersonId,
    roleTitle,
  ])

  const isFormDirty = useMemo(() => {
    if (onboardingCabinetId) return false
    if (isEditing && editingCabinet) {
      const headTenure = editingCabinet.headTenure
      const hasHeadTenure = Boolean(headTenure?.id)
      const initialStart = hasHeadTenure && headTenure
        ? parseStructuredOrIsoDate({
            era: editingCabinet.startEra ?? headTenure.startEra,
            year: editingCabinet.startYear ?? headTenure.startYear,
            month: editingCabinet.startMonth ?? headTenure.startMonth,
            day: editingCabinet.startDay ?? headTenure.startDay,
            isoDate: editingCabinet.startDate ?? headTenure.startDate,
          })
        : parseStructuredOrIsoDate({
            era: editingCabinet.startEra,
            year: editingCabinet.startYear,
            month: editingCabinet.startMonth,
            day: editingCabinet.startDay,
            isoDate: editingCabinet.startDate,
          })
      const initialEnd = hasHeadTenure && headTenure
        ? parseStructuredOrIsoDate({
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
        : parseStructuredOrIsoDate({
            era: editingCabinet.endEra,
            year: editingCabinet.endYear,
            month: editingCabinet.endMonth,
            day: editingCabinet.endDay,
            isoDate: editingCabinet.endDate,
          })

      if (cabinetName !== (editingCabinet.name ?? '')) return true
      if (cabinetDescription !== (editingCabinet.description ?? '')) return true
      if (
        startEra !== initialStart.era ||
        startYear !== initialStart.year ||
        startMonth !== initialStart.month ||
        startDay !== initialStart.day
      ) {
        return true
      }
      if (
        endEra !== initialEnd.era ||
        endYear !== initialEnd.year ||
        endMonth !== initialEnd.month ||
        endDay !== initialEnd.day
      ) {
        return true
      }
      if (originEventId !== initialOriginEventIdRef.current) return true
      if (hasHeadTenure && headTenure) {
        const initPersonId = headTenure.personId ?? headTenure.person?.id ?? ''
        const initTitle =
          headTenure.title ?? headTenure.positionDefinition?.title ?? '총리'
        const initOrd =
          headTenure.ordinal != null ? String(headTenure.ordinal) : ''
        const initSub =
          headTenure.subTermNumber != null
            ? String(headTenure.subTermNumber)
            : ''
        const initParty =
          headTenure.partyId ??
          headTenure.party?.id ??
          initialEditPartyIdRef.current
        if (
          selectedPersonId !== initPersonId ||
          roleTitle !== initTitle ||
          ordinalInput !== initOrd ||
          subTermInput !== initSub ||
          partyId !== initParty ||
          notes !== (headTenure.notes ?? '') ||
          endReasonDetail !== (headTenure.endReasonDetail ?? '')
        ) {
          return true
        }
      } else if (partyId !== initialEditPartyIdRef.current) {
        return true
      }
      return false
    }
    return Boolean(
      selectedPersonId ||
        startYear.trim() ||
        endYear.trim() ||
        cabinetName.trim() ||
        cabinetDescription.trim() ||
        ordinalInput.trim() ||
        subTermInput.trim() ||
        partyId ||
        originEventId ||
        notes.trim() ||
        endReasonDetail.trim() ||
        quickPersonGivenName.trim() ||
        quickPersonSurname.trim() ||
        quickPartyName.trim(),
    )
  }, [
    onboardingCabinetId,
    isEditing,
    editingCabinet,
    selectedPersonId,
    roleTitle,
    startEra,
    startYear,
    startMonth,
    startDay,
    endEra,
    endYear,
    endMonth,
    endDay,
    cabinetName,
    cabinetDescription,
    ordinalInput,
    subTermInput,
    partyId,
    originEventId,
    notes,
    endReasonDetail,
    quickPersonGivenName,
    quickPersonSurname,
    quickPartyName,
  ])

  const quickCreatePartyMutation = useMutation({
    mutationFn: async () => {
      const trimmedPartyName = quickPartyName.trim()
      if (!trimmedPartyName) {
        throw new Error('생성할 정당명을 입력해주세요.')
      }
      const useModernScope =
        Boolean(
          resolvedPolityAxis.historicalCountryId &&
            resolvedPolityAxis.countryId,
        ) && quickPartyScope === 'modern'
      return politicalPartyApi.create({
        name: trimmedPartyName,
        shortName: quickPartyShortName.trim() || null,
        ...(useModernScope
          ? { countryId: resolvedPolityAxis.countryId }
          : resolvedPolityAxis.historicalCountryId
            ? { historicalCountryId: resolvedPolityAxis.historicalCountryId }
            : resolvedPolityAxis.countryId
              ? { countryId: resolvedPolityAxis.countryId }
              : {}),
      })
    },
    onSuccess: (createdParty) => {
      userTouchedPartyRef.current = true
      setPartyId(createdParty.id)
      setAutoLinkRulingParty(true)
      setAutoSuggestedPartyLabel(null)
      setShowQuickCreateParty(false)
      setQuickPartyName('')
      setQuickPartyShortName('')
      notify.success(`"${createdParty.name}" 정당이 등록되어 선택되었습니다.`)
      void queryClient.invalidateQueries({ queryKey: ['political-parties'] })
      void queryClient.invalidateQueries({
        queryKey: ['cabinet-form-parties'],
      })
    },
    onError: (mutationError) => {
      setErrorMessage(getApiErrorMessage(mutationError))
    },
  })

  const quickCreatePersonMutation = useMutation({
    mutationFn: async () => {
      const trimmedGiven = quickPersonGivenName.trim()
      if (!trimmedGiven) {
        throw new Error('인물의 이름(또는 단명)을 입력해주세요.')
      }
      const trimmedSurname = quickPersonSurname.trim()
      return createPerson({
        name: trimmedGiven,
        surname: trimmedSurname || null,
        originalName: quickPersonOriginalName.trim() || undefined,
        ...(trimmedSurname ? { nameDisplayOrder: quickPersonNameOrder } : {}),
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
      setQuickPersonSurname('')
      setQuickPersonGivenName('')
      setQuickPersonOriginalName('')
      notify.success(`"${displayLabel}" 인물이 등록되어 수반으로 선택되었습니다.`)
      void queryClient.invalidateQueries({ queryKey: ['persons'] })
      void queryClient.invalidateQueries({
        queryKey: ['cabinet-form-unified-persons'],
      })
    },
    onError: (mutationError) => {
      setErrorMessage(getApiErrorMessage(mutationError))
    },
  })

  const refreshCabinetRelatedQueries = useCallback(
    (targetCabinetId?: string) => {
      invalidateTenureQueries(queryClient, {
        personId: selectedPersonId || null,
        cabinetId: targetCabinetId ?? editingCabinet?.id ?? null,
        countryId: resolvedPolityAxis.countryId ?? null,
        historicalCountryId: resolvedPolityAxis.historicalCountryId ?? null,
      })
      void queryClient.invalidateQueries({ queryKey: ['global-cabinets'] })
      void queryClient.invalidateQueries({
        queryKey: ['global-cabinet-detail'],
      })
      void queryClient.invalidateQueries({
        queryKey: ['cabinet-form-scope-cabinets'],
      })
      void queryClient.invalidateQueries({
        queryKey: ['cabinet-form-polity-bundle'],
      })
      void queryClient.invalidateQueries({
        queryKey: ['cabinet-political-parties'],
      })
      void queryClient.invalidateQueries({
        queryKey: ['cabinet-linked-events'],
      })
    },
    [queryClient, selectedPersonId, editingCabinet, resolvedPolityAxis],
  )

  const finalizeAndClose = useCallback(
    (finalCabinetId?: string) => {
      refreshCabinetRelatedQueries(finalCabinetId)
      onSaved?.(finalCabinetId ?? editingCabinet?.id)
      onClose()
    },
    [refreshCabinetRelatedQueries, editingCabinet, onSaved, onClose],
  )

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
        throw new Error('소속 국가 또는 시대 정치체를 먼저 선택해주세요.')
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
      if (
        parsedStartMonth !== undefined &&
        (!Number.isInteger(parsedStartMonth) ||
          parsedStartMonth < 1 ||
          parsedStartMonth > 12)
      ) {
        throw new Error('출범·취임 월은 1~12 사이의 숫자로 입력해주세요.')
      }
      const parsedStartDay = startDay.trim()
        ? Number(startDay.trim())
        : undefined
      if (parsedStartDay !== undefined) {
        if (!parsedStartMonth) {
          throw new Error('출범·취임 일을 입력하려면 월도 함께 입력해주세요.')
        }
        if (
          !Number.isInteger(parsedStartDay) ||
          parsedStartDay < 1 ||
          parsedStartDay > 31
        ) {
          throw new Error('출범·취임 일은 1~31 사이의 숫자로 입력해주세요.')
        }
      }
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
        if (
          parsedEndMonth !== undefined &&
          (!Number.isInteger(parsedEndMonth) ||
            parsedEndMonth < 1 ||
            parsedEndMonth > 12)
        ) {
          throw new Error('종료·퇴임 월은 1~12 사이의 숫자로 입력해주세요.')
        }
        const parsedEndDay = endDay.trim() ? Number(endDay.trim()) : undefined
        if (parsedEndDay !== undefined) {
          if (!parsedEndMonth) {
            throw new Error('종료·퇴임 일을 입력하려면 월도 함께 입력해주세요.')
          }
          if (
            !Number.isInteger(parsedEndDay) ||
            parsedEndDay < 1 ||
            parsedEndDay > 31
          ) {
            throw new Error('종료·퇴임 일은 1~31 사이의 숫자로 입력해주세요.')
          }
        }
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
            '종료(퇴임·해산) 시점이 시작(취임·출범) 시점보다 앞설 수 없습니다. 기원(AD/BC) 및 연·월·일을 확인해주세요.',
          )
        }
      } else if (isEditing) {
        endDateInfo = null
      }

      const maybeAutoClosePreviousOngoing = async () => {
        if (
          isEditing ||
          !autoClosePreviousCabinet ||
          !canAutoClosePrev ||
          !previousCabinetBriefing?.latestCabinetId
        ) {
          return
        }
        try {
          await personCareerApi.updateCabinet(
            previousCabinetBriefing.latestCabinetId,
            {
              endDateInfo: startDateInfo,
            },
          )
        } catch {
          // 직전 내각 자동 마감 실패 시 본 저장은 유지
        }
        if (
          headActionMode !== 'reshuffle_existing' &&
          previousCabinetBriefing.latestHeadTenureId &&
          previousCabinetBriefing.latestHeadCabinetCount <= 1
        ) {
          try {
            await personCareerApi.updateGovernmentPositionTenure(
              previousCabinetBriefing.latestHeadTenureId,
              {
                endDateInfo: startDateInfo,
              },
            )
          } catch {
            // 직전 수반 임기 자동 마감 실패 시 본 저장은 유지
          }
        }
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
        if (
          isEditing &&
          initialOriginEventIdRef.current &&
          initialOriginEventIdRef.current !== originEventId.trim()
        ) {
          try {
            await unlinkCabinetFromEvent(
              initialOriginEventIdRef.current,
              targetCabId,
            )
          } catch {
            // 기존 연결 해제 실패 시 무시
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

      // 1) Collective Leadership / Council Mode
      if (mode === 'collective') {
        const trimmedCollectiveName = cabinetName.trim()
        if (!trimmedCollectiveName) {
          throw new Error(
            '위원회·평의회 등 집단지도기구의 명칭(예: 혁명통치평의회, 공안위원회)을 입력해주세요.',
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
        await maybeAutoClosePreviousOngoing()
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
        await maybeAutoClosePreviousOngoing()
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

      if (!isEditing && headActionMode === 'reshuffle_existing') {
        throw new Error('개각을 추가할 기준 수반 임기를 먼저 선택해주세요.')
      }

      // 3) Create or Edit Head Tenure + Cabinet
      if (!selectedPersonId) {
        throw new Error('내각·행정부를 이끈 수반 인물을 선택해주세요.')
      }
      const trimmedRoleTitle = roleTitle.trim()
      if (!trimmedRoleTitle) {
        throw new Error('수반 직책명(예: 총리, 대통령, 각료평의회 의장)을 입력해주세요.')
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
            positionDefinitionId: matchedDef?.id ?? null,
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

      await maybeAutoClosePreviousOngoing()

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
      const shouldContinue = !isEditing && continueAfterSaveRef.current
      continueAfterSaveRef.current = false

      if (shouldContinue) {
        refreshCabinetRelatedQueries(targetId)
        lastBatchSavedCabinetIdRef.current = targetId
        setBatchSavedCount((prevCount) => prevCount + 1)

        const hadEndYear = Boolean(endYear.trim())
        const nextStartEra = hadEndYear ? endEra : 'AD'
        const nextStartYear = hadEndYear ? endYear : ''
        const nextStartMonth = hadEndYear ? endMonth : ''
        const nextStartDay = hadEndYear ? endDay : ''

        const parsedCurrentOrdinal = Number(ordinalInput.trim())
        const nextOrdinalStr =
          Number.isInteger(parsedCurrentOrdinal) && parsedCurrentOrdinal > 0
            ? String(parsedCurrentOrdinal + 1)
            : ''

        setStartEra(nextStartEra)
        setStartYear(nextStartYear)
        setStartMonth(nextStartMonth)
        setStartDay(nextStartDay)
        setEndEra('AD')
        setEndYear('')
        setEndMonth('')
        setEndDay('')
        setOrdinalInput(nextOrdinalStr)
        setSubTermInput('')

        if (headActionMode === 'reshuffle_existing') {
          setHeadActionMode('new_tenure')
          setSelectedExistingTenureId(null)
        }

        setSelectedPersonId('')
        setSelectedPersonLabel('')
        setPersonQuery('')
        setShowQuickCreatePerson(false)
        setCabinetName('')
        setCabinetDescription('')
        userTouchedPartyRef.current = false
        setPartyId('')
        setAutoSuggestedPartyLabel(null)
        userTouchedOriginEventRef.current = false
        setOriginEventId('')
        setInitialOriginEventTitle(null)
        setAppointmentMethod('')
        setEndReason('')
        setEndReasonDetail('')
        setNotes('')
        setErrorMessage(null)

        jumpToSection(hadEndYear ? 'leader' : 'period')
        notify.success(
          hadEndYear
            ? '등록 완료! 직전 종료일을 다음 내각의 시작일로 넘겼습니다.'
            : '등록 완료! 이어서 다음 내각을 바로 입력할 수 있습니다.',
        )
        return
      }

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
      continueAfterSaveRef.current = false
      setErrorMessage(getApiErrorMessage(mutationError))
    },
  })

  const handleSubmitWithOption = useCallback(
    (continueAfterSave: boolean) => {
      if (saveCabinetMutation.isPending) return
      if (missingFieldItems.length > 0) {
        jumpToSection(missingFieldItems[0].section)
      }
      continueAfterSaveRef.current = !isEditing && continueAfterSave
      saveCabinetMutation.mutate()
    },
    [saveCabinetMutation, missingFieldItems, jumpToSection, isEditing],
  )

  useModalSubmitShortcut({
    enabled: isOpen && !onboardingCabinetId && !saveCabinetMutation.isPending,
    scrollContainerRef,
    onSubmit: ({ continueAfterSave }) =>
      handleSubmitWithOption(!isEditing && continueAfterSave),
  })

  const requestClose = useCallback(async () => {
    if (
      saveCabinetMutation.isPending ||
      attachSuggestedMinistersMutation.isPending
    ) {
      return
    }
    if (onboardingCabinetId) {
      finalizeAndClose(onboardingCabinetId)
      return
    }
    if (isFormDirty) {
      const confirmedClose = await confirm({
        title: '작성 중인 내용 닫기',
        message:
          '입력 중인 행정부·내각 내용이 저장되지 않습니다. 창을 닫으시겠습니까?',
        confirmLabel: '닫기',
        cancelLabel: '계속 작성',
        danger: true,
      })
      if (!confirmedClose) return
    }
    if (lastBatchSavedCabinetIdRef.current) {
      onSaved?.(lastBatchSavedCabinetIdRef.current)
    }
    onClose()
  }, [
    saveCabinetMutation.isPending,
    attachSuggestedMinistersMutation.isPending,
    onboardingCabinetId,
    finalizeAndClose,
    isFormDirty,
    onSaved,
    onClose,
  ])

  const handleResetClick = useCallback(async () => {
    if (isFormDirty) {
      const confirmedReset = await confirm({
        title: '입력 내용 초기화',
        message: '현재 입력한 항목을 모두 처음 상태로 되돌릴까요?',
        confirmLabel: '초기화',
        cancelLabel: '취소',
        danger: true,
      })
      if (!confirmedReset) return
    }
    resetCreateFormFields()
  }, [isFormDirty, resetCreateFormFields])

  const modalTitle = onboardingCabinetId
    ? '동시대 부처 장관을 각료진에 편입할까요?'
    : isEditing
      ? `${editingCabinet?.name?.trim() || autoCabinetNamePreview} 수정`
      : resolvedPolityAxis.displayName
        ? `${resolvedPolityAxis.displayName} 행정부 · 내각 등록`
        : '행정부 · 내각 등록'

  const hasMonarchicalContext =
    monarchicalRoleChips.length > 0 ||
    /왕국|제국|공국|섭정/.test(resolvedPolityAxis.displayName)

  const activePickerParts =
    activeDatePicker === 'start' ? startDateParts : endDateParts
  const activePickerInitialDate =
    buildPartialDateString(activePickerParts) || undefined
  const activePickerInitialPrecision: DatePickerPrecision | null =
    activePickerParts.day.trim()
      ? 'day'
      : activePickerParts.month.trim()
        ? 'month'
        : activePickerParts.year.trim()
          ? 'year'
          : null

  return (
    <RegisterModal
      isOpen={isOpen}
      onClose={() => {
        void requestClose()
      }}
      title={modalTitle}
      maxWidth="min(860px, 96vw)"
      minHeight="560px"
      fullBleedOnMobile
      closeOnOverlayClick={false}
      headerActions={
        !onboardingCabinetId ? (
          <HeaderActionsBar>
            <SectionJumpNav aria-label="폼 섹션 이동">
              <SectionJumpBtn
                type="button"
                $active={activeSection === 'period'}
                onClick={() => jumpToSection('period')}
              >
                시기·시대
              </SectionJumpBtn>
              <SectionJumpBtn
                type="button"
                $active={activeSection === 'leader'}
                onClick={() => jumpToSection('leader')}
              >
                정부형태·수반
              </SectionJumpBtn>
              <SectionJumpBtn
                type="button"
                $active={activeSection === 'role'}
                onClick={() => jumpToSection('role')}
              >
                직책·내각명
              </SectionJumpBtn>
              <SectionJumpBtn
                type="button"
                $active={activeSection === 'extra'}
                onClick={() => jumpToSection('extra')}
              >
                정당·사건·상세
              </SectionJumpBtn>
            </SectionJumpNav>
            {!isEditing ? (
              <HeaderResetBtn
                type="button"
                onClick={() => {
                  void handleResetClick()
                }}
              >
                초기화
              </HeaderResetBtn>
            ) : null}
          </HeaderActionsBar>
        ) : undefined
      }
    >
      {onboardingCabinetId ? (
        <>
          <PersonRegisterModalFormScroll ref={scrollContainerRef}>
            {errorMessage ? (
              <AlertBox
                variant="danger"
                icon={<FiAlertCircle />}
                style={{ marginBottom: 16 }}
              >
                {errorMessage}
              </AlertBox>
            ) : null}

            <OnboardingBanner>
              <div>
                <strong>내각 등록이 완료되었습니다!</strong> 방금 등록한 내각의
                존속 기간과 재임 시기가 겹치는 중앙부처 장관·인사{' '}
                <strong>{suggestedMinisters.length}명</strong>을 찾았습니다.
                원하는 인원을 각료 명단에 한 번에 편입할 수 있습니다.
              </div>
              <InlineActionRow>
                <SmallGhostBtn
                  type="button"
                  onClick={() =>
                    setCheckedMinisterIds(
                      suggestedMinisters.map((item) => item.tenureId),
                    )
                  }
                >
                  전체 선택
                </SmallGhostBtn>
                <SmallGhostBtn
                  type="button"
                  onClick={() => setCheckedMinisterIds([])}
                >
                  전체 해제
                </SmallGhostBtn>
              </InlineActionRow>
            </OnboardingBanner>

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
                        <SmallBadge>{deptName}</SmallBadge>
                        <span>{roleName}</span>
                      </div>
                      <MutedPeriodText>{periodText}</MutedPeriodText>
                    </SuggestedItemBody>
                  </SuggestedItemLabel>
                )
              })}
            </SuggestedList>
          </PersonRegisterModalFormScroll>

          <PersonRegisterModalStickyFooter>
            <FooterHint>
              선택됨: {checkedMinisterIds.length} / {suggestedMinisters.length}명
            </FooterHint>
            <FooterActions>
              <PersonRegisterModalCancelBtn
                type="button"
                onClick={() => finalizeAndClose(onboardingCabinetId)}
              >
                건너뛰고 완료
              </PersonRegisterModalCancelBtn>
              <PersonRegisterModalPrimaryBtn
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
              </PersonRegisterModalPrimaryBtn>
            </FooterActions>
          </PersonRegisterModalStickyFooter>
        </>
      ) : (
        <>
          <PersonRegisterModalFormScroll ref={scrollContainerRef}>
            {errorMessage ? (
              <AlertBox
                variant="danger"
                icon={<FiAlertCircle />}
                style={{ marginBottom: 18 }}
              >
                {errorMessage}
              </AlertBox>
            ) : null}

            {/* Top Beginner Guide Strip */}
            <GuideIntroStrip>
              <FiInfo size={14} />
              <div style={{ flex: 1 }}>
                <strong>무엇을 등록하나요?</strong> 정부·내각의{' '}
                <strong>존속 기간</strong>과 이를 이끈{' '}
                <strong>수반(총리·대통령 등)</strong> 또는{' '}
                <strong>집단지도기구</strong>를 함께 등록합니다.
                {hasMonarchicalContext
                  ? ' (국왕·황제·섭정의 재위 자체는 군주·원수 재위에서 관리하며, 여기서는 내각을 이끈 총리·수반을 등록합니다.)'
                  : ''}
              </div>
              {batchSavedCount > 0 ? (
                <BatchProgressPill>
                  연속 등록 중 · {batchSavedCount}건 완료
                </BatchProgressPill>
              ) : null}
            </GuideIntroStrip>

            <LabeledRowsWrap>
              {/* ═══════════════ STEP 1: 시기 · 시대 정치체 ═══════════════ */}
              <FormGroup ref={periodSectionRef}>
                <FormGroupTitle>1. 출범 시기 · 시대 정치체</FormGroupTitle>

                <FieldRow>
                  <FieldLabel>
                    존속 기간 <Required>*</Required>
                  </FieldLabel>
                  <FieldControl>
                    {isEditing && editingCabinet?.headTenure?.id ? (
                      <PeriodSyncCard $protected={!syncPeriodToHeadTenure}>
                        <label>
                          <input
                            type="checkbox"
                            checked={syncPeriodToHeadTenure}
                            onChange={(changeEvent) =>
                              setSyncPeriodToHeadTenure(
                                changeEvent.target.checked,
                              )
                            }
                          />
                          <span>
                            수반 전체 임기(
                            {editingCabinet.headTenure.startYear ?? '?'}~
                            {editingCabinet.headTenure.endYear ?? '현직'})도 이
                            기간과 함께 변경
                          </span>
                        </label>
                        {isReshuffleOrDistinctPeriodEdit &&
                        !syncPeriodToHeadTenure ? (
                          <ProtectPill>
                            개각 보호됨 · 내각 고유 기간만 수정
                          </ProtectPill>
                        ) : null}
                      </PeriodSyncCard>
                    ) : canAutoClosePrev && previousCabinetBriefing ? (
                      <PeriodSyncCard $protected={false}>
                        <label>
                          <input
                            type="checkbox"
                            checked={autoClosePreviousCabinet}
                            onChange={(changeEvent) =>
                              setAutoClosePreviousCabinet(
                                changeEvent.target.checked,
                              )
                            }
                          />
                          <span>
                            직전 현직 기록(
                            <strong>
                              {previousCabinetBriefing.cabinetTitle}
                            </strong>
                            )의 종료일도 이 출범일로 자동 마감
                          </span>
                        </label>
                      </PeriodSyncCard>
                    ) : null}

                    <SubFieldPair $cols={2}>
                      <SubField>
                        <SubFieldLabel>
                          출범 · 취임일 <Required>*</Required>
                        </SubFieldLabel>
                        <InlineDateField
                          appearance="field"
                          anchorId={startDateAnchorId}
                          pickerOpen={activeDatePicker === 'start'}
                          era={startEra}
                          year={startYear}
                          month={startMonth}
                          day={startDay}
                          onEra={setStartEra}
                          onYear={setStartYear}
                          onMonth={setStartMonth}
                          onDay={setStartDay}
                          onOpenPicker={() => setActiveDatePicker('start')}
                          ariaLabel="출범 및 취임일"
                        />
                      </SubField>

                      <SubField>
                        <SubFieldHeaderRow>
                          <SubFieldLabel>
                            종료 · 퇴임일 <OptionalTag>(선택)</OptionalTag>
                          </SubFieldLabel>
                          {endYear || endMonth || endDay ? (
                            <InlineClearLink
                              type="button"
                              onClick={() => {
                                setEndEra('AD')
                                setEndYear('')
                                setEndMonth('')
                                setEndDay('')
                              }}
                            >
                              현직·존속 중으로 비우기
                            </InlineClearLink>
                          ) : null}
                        </SubFieldHeaderRow>
                        <InlineDateField
                          appearance="field"
                          anchorId={endDateAnchorId}
                          pickerOpen={activeDatePicker === 'end'}
                          era={endEra}
                          year={endYear}
                          month={endMonth}
                          day={endDay}
                          onEra={setEndEra}
                          onYear={setEndYear}
                          onMonth={setEndMonth}
                          onDay={setEndDay}
                          onOpenPicker={() => setActiveDatePicker('end')}
                          error={isDateInverted}
                          ariaLabel="종료 및 퇴임일"
                        />
                      </SubField>
                    </SubFieldPair>

                    <DateMetaFooterRow>
                      <FieldHint>
                        정확한 월·일을 모르면 <strong>연도만 입력</strong>해도
                        저장되며, 종료일을 비워두면 현직(존속 중)으로
                        기록됩니다.
                      </FieldHint>
                      {durationSummary ? (
                        <DurationPill>
                          <FiClock size={11} />
                          <span>{durationSummary}</span>
                        </DurationPill>
                      ) : null}
                    </DateMetaFooterRow>

                    {isDateInverted ? (
                      <AlertBox variant="danger" icon={<FiAlertCircle />}>
                        종료 시점이 시작 시점보다 앞섭니다. 기원(서기/기원전)과
                        연·월·일을 확인해주세요.
                      </AlertBox>
                    ) : reshuffleRangeWarning ? (
                      <AlertBox variant="warning" icon={<FiAlertCircle />}>
                        {reshuffleRangeWarning}
                      </AlertBox>
                    ) : null}
                  </FieldControl>
                </FieldRow>

                {isStandaloneCatalogMode ? (
                  <FieldRow>
                    <FieldLabel>
                      소속 국가 · 정체 <Required>*</Required>
                    </FieldLabel>
                    <FieldControl>
                      <SearchableSelect
                        options={standaloneSelectOptions}
                        value={standalonePolityValue}
                        onChange={(nextVal) => {
                          setStandalonePolityValue(nextVal)
                          setSelectedPositionDefId(null)
                          setSelectedExistingTenureId(null)
                          setHeadActionMode('new_tenure')
                        }}
                        placeholder="국가 또는 역사적 정치체 검색 (예: 헝가리, 헝가리 왕국, 대한민국, 영국...)"
                        searchPlaceholder="국가명·왕조명·공화국명 검색..."
                      />
                      <FieldHint>
                        현대 국가뿐 아니라 왕국·공화국 등 시대별 역사 정치체를
                        직접 검색해 지정할 수 있습니다.
                      </FieldHint>
                    </FieldControl>
                  </FieldRow>
                ) : polityOptions.length > 1 ? (
                  <FieldRow>
                    <FieldLabel>시대 · 정치체</FieldLabel>
                    <FieldControl>
                      <PolityChipGrid>
                        {polityOptions.map((polityItem) => {
                          const isSelected = selectedPolityId === polityItem.id
                          return (
                            <PolityChipBtn
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
                                <PolityEraSpan>
                                  {polityItem.eraLabel}
                                </PolityEraSpan>
                              ) : null}
                              {polityItem.cabinetCount > 0 ? (
                                <PolityCountBadge $active={isSelected}>
                                  내각 {polityItem.cabinetCount}
                                </PolityCountBadge>
                              ) : null}
                            </PolityChipBtn>
                          )
                        })}
                      </PolityChipGrid>

                      {polityYearGuidance ? (
                        <SmartSuggestionCard
                          $tone={polityYearGuidance.severity}
                        >
                          <div className="guide-text">
                            <FiInfo size={14} />
                            <span>{polityYearGuidance.message}</span>
                          </div>
                          {polityYearGuidance.suggestedPolities.length > 0 ? (
                            <div className="guide-actions">
                              {polityYearGuidance.suggestedPolities.map(
                                (suggestedItem) => (
                                  <QuickSwitchChip
                                    key={suggestedItem.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedPolityId(suggestedItem.id)
                                      setSelectedPositionDefId(null)
                                      if (!isEditing) {
                                        setSelectedExistingTenureId(null)
                                        setHeadActionMode('new_tenure')
                                      }
                                    }}
                                  >
                                    <span>
                                      {suggestedItem.name}
                                      {suggestedItem.eraLabel
                                        ? ` (${suggestedItem.eraLabel})`
                                        : ''}{' '}
                                      선택
                                    </span>
                                    <FiArrowRight size={12} />
                                  </QuickSwitchChip>
                                ),
                              )}
                            </div>
                          ) : null}
                        </SmartSuggestionCard>
                      ) : contemporaryRepublicNotice ? (
                        <SubtleNoticeRow>
                          <span>{contemporaryRepublicNotice.message}</span>
                          {contemporaryRepublicNotice.recommendedPolity ? (
                            <InlineClearLink
                              type="button"
                              onClick={() => {
                                const rec =
                                  contemporaryRepublicNotice.recommendedPolity
                                if (!rec) return
                                setSelectedPolityId(rec.id)
                                setSelectedPositionDefId(null)
                              }}
                            >
                              {
                                contemporaryRepublicNotice.recommendedPolity
                                  .name
                              }{' '}
                              선택 →
                            </InlineClearLink>
                          ) : null}
                        </SubtleNoticeRow>
                      ) : (
                        <FieldHint>
                          연대순으로 정렬되어 있습니다. 위에서 출범 연도를 먼저
                          입력하면 알맞은 시대를 자동으로 안내합니다.
                        </FieldHint>
                      )}
                    </FieldControl>
                  </FieldRow>
                ) : null}
              </FormGroup>

              {/* ═══════════════ STEP 2: 정부 형태 · 수반 인물 ═══════════════ */}
              <FormGroup ref={leaderSectionRef}>
                <FormGroupTitle>2. 정부 형태 · 수반 지정</FormGroupTitle>

                {!isEditing ? (
                  <FieldRow>
                    <FieldLabel>등록 방식</FieldLabel>
                    <FieldControl>
                      <ModeCardsGrid>
                        <ModeCardButton
                          type="button"
                          $active={
                            mode === 'head' && headActionMode === 'new_tenure'
                          }
                          onClick={() => {
                            setMode('head')
                            setHeadActionMode('new_tenure')
                            setSelectedExistingTenureId(null)
                            setErrorMessage(null)
                          }}
                        >
                          <div className="card-top">
                            <FiUser size={14} />
                            <strong>총리·대통령 등 1인 수반 내각</strong>
                          </div>
                          <span className="card-desc">
                            가장 일반적 · 새 취임, 재집권, 수반이 있는 임시정부
                          </span>
                        </ModeCardButton>

                        <ModeCardButton
                          type="button"
                          $active={
                            mode === 'head' &&
                            headActionMode === 'reshuffle_existing'
                          }
                          onClick={() => {
                            setMode('head')
                            setHeadActionMode('reshuffle_existing')
                            setErrorMessage(null)
                          }}
                        >
                          <div className="card-top">
                            <FiLayers size={14} />
                            <strong>같은 임기 내 개각 추가</strong>
                            <SmallBadge>
                              {effectiveExistingHeadTenures.length}건
                            </SmallBadge>
                          </div>
                          <span className="card-desc">
                            기등록 수반 임기 안에서 제2차·개조·전시내각만 개설
                          </span>
                        </ModeCardButton>

                        <ModeCardButton
                          type="button"
                          $active={mode === 'collective'}
                          onClick={() => {
                            setMode('collective')
                            setSelectedExistingTenureId(null)
                            setErrorMessage(null)
                          }}
                        >
                          <div className="card-top">
                            <FiUsers size={14} />
                            <strong>수반 없는 위원회·평의회</strong>
                          </div>
                          <span className="card-desc">
                            1인 수반 없이 기구가 공동 통치 (예: 혁명통치평의회)
                          </span>
                        </ModeCardButton>
                      </ModeCardsGrid>
                    </FieldControl>
                  </FieldRow>
                ) : null}

                {/* 2-A. Reshuffle Mode: Pick an Existing Head Tenure */}
                {!isEditing &&
                mode === 'head' &&
                headActionMode === 'reshuffle_existing' ? (
                  <FieldRow>
                    <FieldLabel>
                      기준 수반 임기 <Required>*</Required>
                    </FieldLabel>
                    <FieldControl>
                      {effectiveExistingHeadTenures.length === 0 ? (
                        <AlertBox variant="info" icon={<FiInfo />}>
                          현재 선택한 시대 정치체에 아직 등록된 수반 임기가
                          없습니다. 위의{' '}
                          <strong>[총리·대통령 등 1인 수반 내각]</strong>을
                          선택해 첫 내각과 수반 임기를 함께 등록해주세요.
                        </AlertBox>
                      ) : (
                        <ExistingTenureBrowserBox>
                          <SearchInputWrap>
                            <FiSearch size={14} />
                            <SearchInput
                              type="text"
                              value={existingTenureSearch}
                              onChange={(changeEvent) =>
                                setExistingTenureSearch(
                                  changeEvent.target.value,
                                )
                              }
                              placeholder="기등록 수반 이름·직책·연도 검색..."
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
                                  selectedExistingTenureId === tenureItem.id
                                return (
                                  <ExistingTenureItemBtn
                                    key={tenureItem.id}
                                    type="button"
                                    $active={isPicked}
                                    onClick={() =>
                                      applyExistingTenureForReshuffle(
                                        tenureItem,
                                      )
                                    }
                                  >
                                    <div className="tenure-main">
                                      <strong>
                                        {termBadge}
                                        {personLabel}
                                      </strong>
                                      <SmallBadge>{posTitle}</SmallBadge>
                                      <CabinetStatePill
                                        $hasCabinet={existingCabCount > 0}
                                      >
                                        {existingCabCount > 0
                                          ? `기존 내각 ${existingCabCount}개 · 개각 추가`
                                          : '내각 미개설 · 첫 내각 연결'}
                                      </CabinetStatePill>
                                    </div>
                                    <MutedPeriodText>
                                      {periodText}
                                    </MutedPeriodText>
                                  </ExistingTenureItemBtn>
                                )
                              },
                            )}
                          </ExistingTenureList>
                        </ExistingTenureBrowserBox>
                      )}
                    </FieldControl>
                  </FieldRow>
                ) : null}

                {/* 2-B. Single Leader Mode (Create or Edit) */}
                {mode === 'head' &&
                (isEditing || headActionMode === 'new_tenure') ? (
                  <FieldRow>
                    <FieldLabel>
                      수반 인물 <Required>*</Required>
                    </FieldLabel>
                    <FieldControl>
                      {selectedPersonId ? (
                        <SelectedPersonBox>
                          <div className="person-summary">
                            <PersonInitialAvatar>
                              {selectedPersonLabel.slice(0, 1) || '인'}
                            </PersonInitialAvatar>
                            <div>
                              <div className="person-name">
                                {selectedPersonLabel}
                              </div>
                              <div className="person-sub">
                                {selectedPersonRecord
                                  ? (formatPersonLifespanTag(
                                      selectedPersonRecord,
                                    ) ?? '내각·행정부 수반으로 선택됨')
                                  : '내각·행정부 수반으로 선택됨'}
                              </div>
                            </div>
                          </div>
                          <SmallGhostBtn
                            type="button"
                            onClick={() => {
                              setSelectedPersonId('')
                              setSelectedPersonLabel('')
                              setSelectedExistingTenureId(null)
                            }}
                          >
                            인물 변경
                          </SmallGhostBtn>
                        </SelectedPersonBox>
                      ) : showQuickCreatePerson ? (
                        <QuickPersonCard>
                          <QuickCardTopBar>
                            <strong>새 인물 즉석 등록 후 선택</strong>
                            <InlineClearLink
                              type="button"
                              onClick={() => setShowQuickCreatePerson(false)}
                            >
                              기존 인물 검색으로 돌아가기
                            </InlineClearLink>
                          </QuickCardTopBar>

                          <NameOrderBar>
                            <span className="order-label">이름 표기 순서</span>
                            <NameOrderSegment>
                              <NameOrderBtn
                                type="button"
                                $active={quickPersonNameOrder === 'korean'}
                                onClick={() => {
                                  quickOrderTouchedRef.current = true
                                  setQuickPersonNameOrder('korean')
                                }}
                              >
                                성 + 이름 (한국·헝가리·동아시아식)
                              </NameOrderBtn>
                              <NameOrderBtn
                                type="button"
                                $active={quickPersonNameOrder === 'western'}
                                onClick={() => {
                                  quickOrderTouchedRef.current = true
                                  setQuickPersonNameOrder('western')
                                }}
                              >
                                이름 + 성 (서양식)
                              </NameOrderBtn>
                            </NameOrderSegment>
                          </NameOrderBar>

                          <SubFieldPair $cols={2}>
                            <SubField>
                              <SubFieldLabel>
                                성 (Surname) <OptionalTag>(단명이면 비움)</OptionalTag>
                              </SubFieldLabel>
                              <Input
                                value={quickPersonSurname}
                                onChange={(changeEvent) =>
                                  setQuickPersonSurname(
                                    changeEvent.target.value,
                                  )
                                }
                                placeholder={
                                  quickPersonNameOrder === 'korean'
                                    ? '예: 티사 / 오르반 / 이'
                                    : '예: 처칠 / 드골'
                                }
                              />
                            </SubField>
                            <SubField>
                              <SubFieldLabel>
                                이름 (Given Name) <Required>*</Required>
                              </SubFieldLabel>
                              <Input
                                value={quickPersonGivenName}
                                onChange={(changeEvent) =>
                                  setQuickPersonGivenName(
                                    changeEvent.target.value,
                                  )
                                }
                                placeholder={
                                  quickPersonNameOrder === 'korean'
                                    ? '예: 이슈트반 / 빅토르 / 순신'
                                    : '예: 윈스턴 / 샤를'
                                }
                              />
                            </SubField>
                          </SubFieldPair>

                          <QuickBottomRow>
                            <Input
                              value={quickPersonOriginalName}
                              onChange={(changeEvent) =>
                                setQuickPersonOriginalName(
                                  changeEvent.target.value,
                                )
                              }
                              placeholder="원어·한자 표기 (선택 — 예: Tisza István, Orbán Viktor)"
                            />
                            <QuickCreateBtn
                              type="button"
                              disabled={quickCreatePersonMutation.isPending}
                              onClick={() => quickCreatePersonMutation.mutate()}
                            >
                              {quickCreatePersonMutation.isPending
                                ? '생성 중...'
                                : '생성 후 수반 선택'}
                            </QuickCreateBtn>
                          </QuickBottomRow>

                          {quickPersonFullPreview ? (
                            <QuickPreviewLine>
                              화면에 표시될 이름:{' '}
                              <strong>{quickPersonFullPreview}</strong>
                            </QuickPreviewLine>
                          ) : null}
                        </QuickPersonCard>
                      ) : (
                        <>
                          <PersonSearchBarRow>
                            <SearchInputWrap style={{ flex: 1 }}>
                              <FiSearch size={14} />
                              <SearchInput
                                type="text"
                                value={personQuery}
                                onChange={(changeEvent) =>
                                  setPersonQuery(changeEvent.target.value)
                                }
                                placeholder="수반 인물 이름 검색 (성·이름·원어명)..."
                              />
                            </SearchInputWrap>
                            <SmallGhostBtn
                              type="button"
                              onClick={() => setShowQuickCreatePerson(true)}
                            >
                              <FiPlus size={12} />새 인물 즉석 등록
                            </SmallGhostBtn>
                          </PersonSearchBarRow>

                          <PersonChipWrap>
                            {personCandidates.length === 0 ? (
                              <EmptyHintBox>
                                {personQuery.trim()
                                  ? '검색 결과가 없습니다. 우측 [새 인물 즉석 등록] 버튼으로 바로 추가할 수 있습니다.'
                                  : '이 국가·시대에 연결된 추천 인물이 아직 없습니다. 이름을 검색하거나 [새 인물 즉석 등록]을 눌러주세요.'}
                              </EmptyHintBox>
                            ) : (
                              personCandidates.map((candidateItem) => (
                                <PersonCandidateBtn
                                  key={candidateItem.id}
                                  type="button"
                                  $contemporary={candidateItem.isContemporary}
                                  onClick={() => {
                                    setSelectedPersonId(candidateItem.id)
                                    setSelectedPersonLabel(candidateItem.label)
                                    setSelectedExistingTenureId(null)
                                  }}
                                >
                                  <span>{candidateItem.label}</span>
                                  {candidateItem.subLabel ? (
                                    <span className="sub">
                                      ({candidateItem.subLabel})
                                    </span>
                                  ) : null}
                                </PersonCandidateBtn>
                              ))
                            )}
                          </PersonChipWrap>
                        </>
                      )}

                      {personLifespanWarning ? (
                        <AlertBox
                          variant="warning"
                          icon={<FiAlertCircle />}
                        >
                          {personLifespanWarning}
                        </AlertBox>
                      ) : null}

                      {/* Re-appointment vs Reshuffle human-friendly assistant */}
                      {!isEditing &&
                      matchingExistingTenuresForPerson.length > 0 ? (
                        <ReappointmentHelperBox>
                          <div className="helper-header">
                            <FiRefreshCw size={13} />
                            <span>
                              <strong>{selectedPersonLabel}</strong> 인물은 이
                              시대 정치체에 기존 재임 기록이{' '}
                              {matchingExistingTenuresForPerson.length}건
                              있습니다. 어떤 상황인가요?
                            </span>
                          </div>
                          <div className="helper-options">
                            <div className="reappoint-card active">
                              <div className="title-line">
                                <FiCheck size={13} />
                                <strong>
                                  퇴임 후 다시 취임 (재집권 · 새 임기 등록)
                                </strong>
                              </div>
                              <span className="desc-line">
                                시간을 두고 재집권했거나 새 임기를 시작한 경우
                                (현재 선택됨)
                              </span>
                              {reappointmentSuggestion ? (
                                <QuickSwitchChip
                                  type="button"
                                  onClick={() => {
                                    if (
                                      reappointmentSuggestion.lastOrdinal !=
                                      null
                                    ) {
                                      setOrdinalInput(
                                        String(
                                          reappointmentSuggestion.lastOrdinal,
                                        ),
                                      )
                                    }
                                    setSubTermInput(
                                      String(
                                        reappointmentSuggestion.nextSubTermNumber,
                                      ),
                                    )
                                  }}
                                >
                                  <span>
                                    동일 인물 대수 유지:{' '}
                                    {reappointmentSuggestion.summaryLabel} 자동
                                    입력
                                  </span>
                                  <FiArrowRight size={11} />
                                </QuickSwitchChip>
                              ) : null}
                            </div>

                            {matchingExistingTenuresForPerson.map(
                              (priorTenure) => {
                                const ordLabel =
                                  priorTenure.ordinal != null
                                    ? `제${priorTenure.ordinal}대 `
                                    : ''
                                const roleLabel =
                                  priorTenure.title ??
                                  priorTenure.positionDefinition?.title ??
                                  '수반'
                                const yearRange = `${priorTenure.startYear ?? '?'}~${priorTenure.endYear ?? '현직'}`
                                return (
                                  <button
                                    key={priorTenure.id}
                                    type="button"
                                    className="reshuffle-switch-btn"
                                    onClick={() =>
                                      applyExistingTenureForReshuffle(
                                        priorTenure,
                                      )
                                    }
                                  >
                                    <FiLayers size={13} />
                                    <div>
                                      <strong>
                                        연속 재임 중 장관진만 개편 ({ordLabel}
                                        {roleLabel}, {yearRange}에 개각 추가)
                                      </strong>
                                      <span>
                                        새 수반 임기를 만들지 않고 제2차·개조내각만
                                        추가합니다
                                      </span>
                                    </div>
                                  </button>
                                )
                              },
                            )}
                          </div>
                        </ReappointmentHelperBox>
                      ) : null}
                    </FieldControl>
                  </FieldRow>
                ) : null}
              </FormGroup>

              {/* ═══════════════ STEP 3: 직책 · 대수 · 내각 명칭 ═══════════════ */}
              <FormGroup ref={roleSectionRef}>
                <FormGroupTitle>3. 수반 직책 · 대수 · 내각 명칭</FormGroupTitle>

                {/* Inline Previous Cabinet Briefing Bar */}
                {!isEditing && previousCabinetBriefing ? (
                  <PreviousCabinetBar>
                    <div className="prev-info">
                      <span className="prev-tag">이 시대의 최근 기록</span>
                      <strong>{previousCabinetBriefing.cabinetTitle}</strong>
                      <span className="prev-period">
                        ({previousCabinetBriefing.periodText})
                      </span>
                    </div>
                    <div className="prev-actions">
                      {mode === 'head' &&
                      headActionMode === 'new_tenure' &&
                      previousCabinetBriefing.suggestedNextOrdinal != null &&
                      ordinalInput.trim() !==
                        String(previousCabinetBriefing.suggestedNextOrdinal) ? (
                        <QuickFillBtn
                          type="button"
                          onClick={() =>
                            setOrdinalInput(
                              String(
                                previousCabinetBriefing.suggestedNextOrdinal,
                              ),
                            )
                          }
                        >
                          다음 대수(제
                          {previousCabinetBriefing.suggestedNextOrdinal}대) 채우기
                        </QuickFillBtn>
                      ) : null}
                      {previousCabinetBriefing.continuationStartParts &&
                      !startYear.trim() ? (
                        <QuickFillBtn
                          type="button"
                          onClick={() => {
                            const cont =
                              previousCabinetBriefing.continuationStartParts
                            if (!cont) return
                            setStartEra(cont.era)
                            setStartYear(cont.year)
                            setStartMonth(cont.month)
                            setStartDay(cont.day)
                          }}
                        >
                          직전 종료 시점({previousCabinetBriefing.continuationStartParts.year}
                          {previousCabinetBriefing.continuationStartParts.month
                            ? `.${previousCabinetBriefing.continuationStartParts.month}`
                            : ''}
                          )을 시작일로 채우기
                        </QuickFillBtn>
                      ) : null}
                    </div>
                  </PreviousCabinetBar>
                ) : null}

                {mode === 'head' &&
                (isEditing || headActionMode === 'new_tenure') ? (
                  <>
                    <FieldRow>
                      <FieldLabel>
                        수반 직책 <Required>*</Required>
                      </FieldLabel>
                      <FieldControl>
                        <PresetChipWrap>
                          {primaryRoleChips.map((presetItem) => {
                            const isChipActive =
                              roleTitle.trim() === presetItem.title
                            return (
                              <RolePresetChip
                                key={presetItem.title}
                                type="button"
                                $active={isChipActive}
                                onClick={() => {
                                  userTouchedRoleRef.current = true
                                  setRoleTitle(presetItem.title)
                                  setPositionTypeOverride(
                                    presetItem.positionType,
                                  )
                                  setSelectedPositionDefId(
                                    presetItem.positionDefId,
                                  )
                                }}
                              >
                                {presetItem.title}
                              </RolePresetChip>
                            )
                          })}
                          {monarchicalRoleChips.length > 0 ? (
                            <MonarchicalToggleChip
                              type="button"
                              onClick={() =>
                                setShowMonarchicalRolePresets(
                                  (prevVal) => !prevVal,
                                )
                              }
                            >
                              {showMonarchicalRolePresets
                                ? '군주·섭정 친정 직위 접기'
                                : '군주·섭정 직접 친정 직위 보기'}
                            </MonarchicalToggleChip>
                          ) : null}
                        </PresetChipWrap>

                        {showMonarchicalRolePresets &&
                        monarchicalRoleChips.length > 0 ? (
                          <PresetChipWrap>
                            {monarchicalRoleChips.map((monarchChip) => {
                              const isChipActive =
                                roleTitle.trim() === monarchChip.title
                              return (
                                <RolePresetChip
                                  key={monarchChip.title}
                                  type="button"
                                  $active={isChipActive}
                                  onClick={() => {
                                    userTouchedRoleRef.current = true
                                    setRoleTitle(monarchChip.title)
                                    setPositionTypeOverride(
                                      monarchChip.positionType,
                                    )
                                    setSelectedPositionDefId(
                                      monarchChip.positionDefId,
                                    )
                                  }}
                                >
                                  {monarchChip.title}
                                </RolePresetChip>
                              )
                            })}
                          </PresetChipWrap>
                        ) : null}

                        <Input
                          value={roleTitle}
                          onChange={(changeEvent) => {
                            userTouchedRoleRef.current = true
                            const nextTitle = changeEvent.target.value
                            setRoleTitle(nextTitle)
                            setSelectedPositionDefId(null)
                            setPositionTypeOverride(
                              inferExecutivePositionType(nextTitle),
                            )
                          }}
                          placeholder="직책명 직접 입력 가능 (예: 총리, 각료평의회 의장, 국민지도자, 내각총리대신)"
                        />

                        <RoleClassificationRow>
                          <span className="regime-note">
                            {activePoliticalSystem?.governmentForm
                              ? `시대 정체: ${GOVERNMENT_FORM_LABEL[activePoliticalSystem.governmentForm]}`
                              : (smartRoleDefault.reasonHint ??
                                '직책명에 맞춰 내각/행정부 분류가 자동 설정됩니다.')}
                          </span>
                          <BranchPillGroup>
                            <BranchPillBtn
                              type="button"
                              $active={
                                positionTypeOverride === 'HEAD_OF_GOVERNMENT'
                              }
                              onClick={() =>
                                setPositionTypeOverride('HEAD_OF_GOVERNMENT')
                              }
                            >
                              정부수반 (총리·내각)
                            </BranchPillBtn>
                            <BranchPillBtn
                              type="button"
                              $active={positionTypeOverride === 'HEAD_OF_STATE'}
                              onClick={() =>
                                setPositionTypeOverride('HEAD_OF_STATE')
                              }
                            >
                              국가원수 (대통령·행정부)
                            </BranchPillBtn>
                          </BranchPillGroup>
                        </RoleClassificationRow>
                      </FieldControl>
                    </FieldRow>

                    <FieldRow>
                      <FieldLabel>
                        대수 · 회차 <OptionalTag>(선택)</OptionalTag>
                      </FieldLabel>
                      <FieldControl>
                        <SubFieldPair $cols={2}>
                          <SubField>
                            <SubFieldHeaderRow>
                              <SubFieldLabel>역대 대수 (제 N 대)</SubFieldLabel>
                              {!isEditing &&
                              previousCabinetBriefing?.suggestedNextOrdinal !=
                                null &&
                              ordinalInput.trim() !==
                                String(
                                  previousCabinetBriefing.suggestedNextOrdinal,
                                ) ? (
                                <InlineClearLink
                                  type="button"
                                  onClick={() =>
                                    setOrdinalInput(
                                      String(
                                        previousCabinetBriefing.suggestedNextOrdinal,
                                      ),
                                    )
                                  }
                                >
                                  제{previousCabinetBriefing.suggestedNextOrdinal}
                                  대 적용
                                </InlineClearLink>
                              ) : null}
                            </SubFieldHeaderRow>
                            <AdornedNumberBox>
                              <span className="prefix">제</span>
                              <input
                                type="number"
                                min={1}
                                value={ordinalInput}
                                onChange={(changeEvent) =>
                                  setOrdinalInput(changeEvent.target.value)
                                }
                                placeholder="예: 15"
                              />
                              <span className="suffix">대</span>
                            </AdornedNumberBox>
                            <FieldHint>
                              역대 몇 번째 수반인지 입력 (모르면 비워도 됩니다)
                            </FieldHint>
                          </SubField>

                          <SubField>
                            <SubFieldLabel>
                              동일 인물 회차 (N 기)
                            </SubFieldLabel>
                            <AdornedNumberBox>
                              <input
                                type="number"
                                min={1}
                                value={subTermInput}
                                onChange={(changeEvent) =>
                                  setSubTermInput(changeEvent.target.value)
                                }
                                placeholder="예: 1, 2"
                              />
                              <span className="suffix">기</span>
                            </AdornedNumberBox>
                            <FieldHint>
                              재집권 시 같은 대수를 유지하는 나라(헝가리 등)에서
                              1기·2기 구분용
                            </FieldHint>
                          </SubField>
                        </SubFieldPair>
                      </FieldControl>
                    </FieldRow>
                  </>
                ) : null}

                <FieldRow>
                  <FieldLabel>
                    {mode === 'collective' ? (
                      <>
                        기구 · 정부 명칭 <Required>*</Required>
                      </>
                    ) : !isEditing &&
                      headActionMode === 'reshuffle_existing' &&
                      (selectedExistingTenure?._existingCabinetCount ?? 0) >
                        0 ? (
                      <>
                        개각 명칭 <Required>*</Required>
                      </>
                    ) : (
                      <>
                        내각 명칭 <OptionalTag>(선택)</OptionalTag>
                      </>
                    )}
                  </FieldLabel>
                  <FieldControl>
                    <Input
                      value={cabinetName}
                      onChange={(changeEvent) =>
                        setCabinetName(changeEvent.target.value)
                      }
                      placeholder={
                        mode === 'collective'
                          ? '예: 혁명통치평의회, 공안위원회, 스위스 연방평의회, 대한민국 임시정부 국무원'
                          : headActionMode === 'reshuffle_existing'
                            ? '예: 제2차 개조내각, 전시연립내각, 거국내각'
                            : `비워두면 "${autoCabinetNamePreview}"(으)로 자동 생성됩니다`
                      }
                    />
                    {mode === 'head' && !cabinetName.trim() ? (
                      <AutoNamePreviewBar>
                        자동 생성 미리보기:{' '}
                        <strong>{autoCabinetNamePreview}</strong>
                      </AutoNamePreviewBar>
                    ) : null}

                    <SubField style={{ marginTop: 4 }}>
                      <SubFieldLabel>
                        내각 개요 · 출범 기조 <OptionalTag>(선택)</OptionalTag>
                      </SubFieldLabel>
                      <PersonRegisterModalTextarea
                        rows={2}
                        style={{ minHeight: 68 }}
                        value={cabinetDescription}
                        onChange={(changeEvent) =>
                          setCabinetDescription(changeEvent.target.value)
                        }
                        placeholder="예: 오스트리아-헝가리 이중제국 시기 작업당 단독 내각, 1956년 혁명 직후 다당제 연립내각 등"
                      />
                    </SubField>
                  </FieldControl>
                </FieldRow>
              </FormGroup>

              {/* ═══════════════ STEP 4: 정당 · 계기 사건 · 상세 ═══════════════ */}
              <FormGroup ref={extraSectionRef}>
                <FormGroupTitle>
                  4. 집권 정당 · 계기 사건 · 취임/퇴임 상세 (선택)
                </FormGroupTitle>

                <FieldRow>
                  <FieldLabel>
                    집권 · 소속 정당 <OptionalTag>(선택)</OptionalTag>
                  </FieldLabel>
                  <FieldControl>
                    {showQuickCreateParty ? (
                      <QuickPersonCard>
                        <QuickCardTopBar>
                          <strong>새 정당 즉석 등록 후 선택</strong>
                          <InlineClearLink
                            type="button"
                            onClick={() => setShowQuickCreateParty(false)}
                          >
                            기존 정당 목록으로 돌아가기
                          </InlineClearLink>
                        </QuickCardTopBar>

                        {resolvedPolityAxis.historicalCountryId &&
                        resolvedPolityAxis.countryId ? (
                          <NameOrderBar>
                            <span className="order-label">소속 국가 범위</span>
                            <NameOrderSegment>
                              <NameOrderBtn
                                type="button"
                                $active={quickPartyScope === 'active'}
                                onClick={() => setQuickPartyScope('active')}
                              >
                                {resolvedPolityAxis.displayName || '현재 시대 정체'}
                              </NameOrderBtn>
                              <NameOrderBtn
                                type="button"
                                $active={quickPartyScope === 'modern'}
                                onClick={() => setQuickPartyScope('modern')}
                              >
                                상위 현대국가 ({country?.name ?? '현대 국가'})
                              </NameOrderBtn>
                            </NameOrderSegment>
                          </NameOrderBar>
                        ) : null}

                        <SubFieldPair $cols={2}>
                          <SubField>
                            <SubFieldLabel>
                              정당명 <Required>*</Required>
                            </SubFieldLabel>
                            <Input
                              value={quickPartyName}
                              onChange={(changeEvent) =>
                                setQuickPartyName(changeEvent.target.value)
                              }
                              placeholder="예: 자유당, 작업당, 피데스(Fidesz)"
                            />
                          </SubField>
                          <SubField>
                            <SubFieldLabel>
                              약칭 <OptionalTag>(선택)</OptionalTag>
                            </SubFieldLabel>
                            <Input
                              value={quickPartyShortName}
                              onChange={(changeEvent) =>
                                setQuickPartyShortName(changeEvent.target.value)
                              }
                              placeholder="예: 자유당, Fidesz"
                            />
                          </SubField>
                        </SubFieldPair>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <QuickCreateBtn
                            type="button"
                            disabled={quickCreatePartyMutation.isPending}
                            onClick={() => quickCreatePartyMutation.mutate()}
                          >
                            {quickCreatePartyMutation.isPending
                              ? '생성 중...'
                              : '정당 생성 후 선택'}
                          </QuickCreateBtn>
                        </div>
                      </QuickPersonCard>
                    ) : (
                      <PartySelectRow>
                        <NativeSelect
                          value={partyId}
                          onChange={(changeEvent) => {
                            const nextPartyVal = changeEvent.target.value
                            userTouchedPartyRef.current = true
                            setAutoSuggestedPartyLabel(null)
                            setPartyId(nextPartyVal)
                            if (nextPartyVal && !isEditing) {
                              setAutoLinkRulingParty(true)
                            }
                          }}
                        >
                          <option value="">무소속 / 정당 미지정</option>
                          {fallbackSelectedPartyOption ? (
                            <option value={fallbackSelectedPartyOption.id}>
                              {formatPartyOptionLabel(
                                fallbackSelectedPartyOption,
                              )}
                            </option>
                          ) : null}
                          {organizedPartyBuckets.recommendedParties.length > 0 &&
                          organizedPartyBuckets.otherParties.length > 0 ? (
                            <>
                              <optgroup label="추천 · 해당 시대 정당">
                                {organizedPartyBuckets.recommendedParties.map(
                                  (partyItem) => (
                                    <option
                                      key={partyItem.id}
                                      value={partyItem.id}
                                    >
                                      {formatPartyOptionLabel(partyItem)}
                                    </option>
                                  ),
                                )}
                              </optgroup>
                              <optgroup label="기타 · 상위 국가 및 타 시기 정당">
                                {organizedPartyBuckets.otherParties.map(
                                  (partyItem) => (
                                    <option
                                      key={partyItem.id}
                                      value={partyItem.id}
                                    >
                                      {formatPartyOptionLabel(partyItem)}
                                    </option>
                                  ),
                                )}
                              </optgroup>
                            </>
                          ) : (
                            [
                              ...organizedPartyBuckets.recommendedParties,
                              ...organizedPartyBuckets.otherParties,
                            ].map((partyItem) => (
                              <option key={partyItem.id} value={partyItem.id}>
                                {formatPartyOptionLabel(partyItem)}
                              </option>
                            ))
                          )}
                        </NativeSelect>
                        <SmallGhostBtn
                          type="button"
                          onClick={() => setShowQuickCreateParty(true)}
                        >
                          <FiPlus size={12} />새 정당 즉석 등록
                        </SmallGhostBtn>
                      </PartySelectRow>
                    )}

                    {autoSuggestedPartyLabel && partyId ? (
                      <FieldHint>
                        선택한 수반의 당적 이력(
                        <strong>{autoSuggestedPartyLabel}</strong>)에서 자동
                        선택되었습니다.
                      </FieldHint>
                    ) : null}

                    {partyId ? (
                      <InlineCheckRow>
                        <input
                          type="checkbox"
                          checked={autoLinkRulingParty}
                          onChange={(changeEvent) =>
                            setAutoLinkRulingParty(changeEvent.target.checked)
                          }
                        />
                        <span>
                          이 정당을 내각의 <strong>집권·주도 여당</strong>으로도
                          함께 연결
                        </span>
                      </InlineCheckRow>
                    ) : null}
                  </FieldControl>
                </FieldRow>

                <FieldRow>
                  <FieldLabel>
                    출범 계기 사건 <OptionalTag>(선택)</OptionalTag>
                  </FieldLabel>
                  <FieldControl>
                    <LinkedEventPickerField
                      value={originEventId}
                      initialTitle={initialOriginEventTitle}
                      nearYear={signedStartYear}
                      onChange={(nextEventId) => {
                        userTouchedOriginEventRef.current = true
                        setOriginEventId(nextEventId)
                      }}
                    />
                    <FieldHint>
                      총선·혁명·조약·정변 등 이 내각이 출범하게 된 역사적 사건을
                      연결합니다.
                      {signedStartYear != null
                        ? ` (${signedStartYear}년 전후 사건이 먼저 표시됩니다.)`
                        : ''}
                    </FieldHint>
                  </FieldControl>
                </FieldRow>

                {mode === 'head' &&
                (isEditing || headActionMode === 'new_tenure') ? (
                  <FieldRow>
                    <FieldLabel>
                      취임 · 퇴임 경위 <OptionalTag>(선택)</OptionalTag>
                    </FieldLabel>
                    <FieldControl>
                      <SubFieldPair $cols={2}>
                        <SubField>
                          <SubFieldLabel>취임 · 선출 방식</SubFieldLabel>
                          <NativeSelect
                            value={appointmentMethod}
                            onChange={(changeEvent) =>
                              setAppointmentMethod(changeEvent.target.value)
                            }
                          >
                            <option value="">선택 안 함</option>
                            <option value="PARLIAMENTARY_ELECTION">
                              의회 선출 (내각책임제 등)
                            </option>
                            <option value="APPOINTMENT">
                              군주 · 국가원수 임명 (승계 포함)
                            </option>
                            <option value="DIRECT_ELECTION">직접 선거</option>
                            <option value="INDIRECT_ELECTION">간접 선거</option>
                            <option value="COUP">쿠데타 · 혁명</option>
                            <option value="RESTORATION">복위 · 재추대</option>
                            <option value="HEREDITARY">세습</option>
                            <option value="ELECTIVE_MONARCHY">
                              선거군주제 선출
                            </option>
                            <option value="TREATY">조약에 의한 취임</option>
                            <option value="CONQUEST">정복</option>
                            <option value="OTHER">기타</option>
                          </NativeSelect>
                        </SubField>

                        <SubField>
                          <SubFieldLabel>퇴임 사유</SubFieldLabel>
                          <NativeSelect
                            value={endReason}
                            onChange={(changeEvent) =>
                              setEndReason(changeEvent.target.value)
                            }
                          >
                            <option value="">선택 안 함</option>
                            <option value="RESIGNATION">
                              사임 · 내각 총사퇴 · 불신임
                            </option>
                            <option value="TERM_COMPLETED">임기 만료</option>
                            <option value="REMOVAL">해임 · 면직</option>
                            <option value="IMPEACHMENT">탄핵 · 파면</option>
                            <option value="DEATH_IN_OFFICE">
                              재임 중 사망 · 피살
                            </option>
                            <option value="OVERTHROWN">
                              쿠데타 · 혁명 축출
                            </option>
                            <option value="WAR_DEFEAT">전쟁 패배</option>
                            <option value="STATE_DISSOLVED">
                              국가 소멸 · 체제 전환
                            </option>
                            <option value="ABDICATION">자진 퇴위</option>
                            <option value="SUCCESSION_TRANSFER">
                              양위 · 선위
                            </option>
                            <option value="OTHER">기타</option>
                          </NativeSelect>
                        </SubField>
                      </SubFieldPair>

                      <SubFieldPair $cols={2}>
                        <SubField>
                          <SubFieldLabel>취임 배경 · 비고 메모</SubFieldLabel>
                          <Input
                            value={notes}
                            onChange={(changeEvent) =>
                              setNotes(changeEvent.target.value)
                            }
                            placeholder="예: 거국연립내각 구성 배경, 비상대권 행사 등"
                          />
                        </SubField>
                        <SubField>
                          <SubFieldLabel>퇴임 상세 사유</SubFieldLabel>
                          <Input
                            value={endReasonDetail}
                            onChange={(changeEvent) =>
                              setEndReasonDetail(changeEvent.target.value)
                            }
                            placeholder="예: 선거법 개혁 갈등으로 사임, 의회 불신임 가결"
                          />
                        </SubField>
                      </SubFieldPair>
                    </FieldControl>
                  </FieldRow>
                ) : null}
              </FormGroup>
            </LabeledRowsWrap>
          </PersonRegisterModalFormScroll>

          <PersonRegisterModalStickyFooter>
            <FooterHint $warning={missingFieldItems.length > 0}>
              {missingFieldItems.length > 0 ? (
                <FooterJumpButton
                  type="button"
                  onClick={() => jumpToSection(missingFieldItems[0].section)}
                >
                  <span>필수 입력: {missingFieldItems[0].label}</span>
                  {missingFieldItems.length > 1 ? (
                    <FooterMissingCount>
                      외 {missingFieldItems.length - 1}개
                    </FooterMissingCount>
                  ) : null}
                  <FooterJumpArrow>↗ 이동</FooterJumpArrow>
                </FooterJumpButton>
              ) : (
                <FooterReadyGroup>
                  <FooterReadyBadge>등록 준비 완료</FooterReadyBadge>
                  <FooterShortcutItem>
                    <FooterKbd>⌘</FooterKbd>
                    <FooterKbd>↵</FooterKbd> 바로 저장
                  </FooterShortcutItem>
                  {!isEditing ? (
                    <FooterShortcutItem>
                      <FooterKbd>⇧</FooterKbd>
                      <FooterKbd>⌘</FooterKbd>
                      <FooterKbd>↵</FooterKbd> 연속 등록
                    </FooterShortcutItem>
                  ) : null}
                </FooterReadyGroup>
              )}
            </FooterHint>

            <FooterActions>
              <PersonRegisterModalCancelBtn
                type="button"
                onClick={() => {
                  void requestClose()
                }}
              >
                취소
              </PersonRegisterModalCancelBtn>
              {!isEditing ? (
                <ContinueSubmitBtn
                  type="button"
                  disabled={saveCabinetMutation.isPending}
                  onClick={() => handleSubmitWithOption(true)}
                >
                  등록 후 이어서 다음
                </ContinueSubmitBtn>
              ) : null}
              <PersonRegisterModalPrimaryBtn
                type="button"
                disabled={saveCabinetMutation.isPending}
                onClick={() => handleSubmitWithOption(false)}
              >
                {saveCabinetMutation.isPending
                  ? '저장 중...'
                  : isEditing
                    ? '변경사항 저장'
                    : headActionMode === 'reshuffle_existing'
                      ? '개각 · 신규 내각 개설'
                      : '행정부 · 내각 등록'}
              </PersonRegisterModalPrimaryBtn>
            </FooterActions>
          </PersonRegisterModalStickyFooter>

          <DatePickerModal
            isOpen={activeDatePicker !== null}
            onClose={() => setActiveDatePicker(null)}
            allowPartial
            initialDate={activePickerInitialDate}
            initialPrecision={activePickerInitialPrecision}
            anchorEl={
              activeDatePicker && typeof document !== 'undefined'
                ? document.getElementById(
                    activeDatePicker === 'start'
                      ? startDateAnchorId
                      : endDateAnchorId,
                  )
                : null
            }
            onSelect={(isoDate, precision) => {
              if (!activeDatePicker) return
              applyDatePickerSelection(activeDatePicker, isoDate, precision)
            }}
          />
        </>
      )}
    </RegisterModal>
  )
}

/* ─────────────────────────── Styled Primitives ─────────────────────────── */

const GuideIntroStrip = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 10px 14px;
  margin-bottom: 20px;
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.08)'
      : 'rgba(99, 102, 241, 0.05)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.22)'
        : 'rgba(99, 102, 241, 0.16)'};
  font-size: 12.5px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};

  > svg {
    flex-shrink: 0;
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.primary};
  }

  strong {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const SubFieldHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const InlineClearLink = styled.button`
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const DateMetaFooterRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
`

const DurationPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(16, 185, 129, 0.14)'
      : 'rgba(16, 185, 129, 0.09)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#6ee7b7' : '#047857')};
`

const PeriodSyncCard = styled.div<{ $protected: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid
    ${({ $protected, theme }) =>
      $protected
        ? theme.mode === 'dark'
          ? 'rgba(245, 158, 11, 0.35)'
          : 'rgba(245, 158, 11, 0.35)'
        : theme.colors.border.light};
  background: ${({ $protected, theme }) =>
    $protected
      ? theme.mode === 'dark'
        ? 'rgba(245, 158, 11, 0.08)'
        : '#fffbeb'
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.03)'
        : '#f8fafc'};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.primary};

  label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }
`

const ProtectPill = styled.span`
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(245, 158, 11, 0.18);
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fcd34d' : '#b45309')};
`

const PolityChipGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const PolityChipBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 4px 11px;
  border-radius: 8px;
  font: inherit;
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  cursor: pointer;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border.default};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.18)'
        : 'rgba(99, 102, 241, 0.09)'
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.025)'
        : '#ffffff'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#c7d2fe'
        : theme.colors.primary
      : theme.colors.text.primary};
  transition: border-color 0.14s ease, background-color 0.14s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const PolityEraSpan = styled.span`
  font-size: 11px;
  opacity: 0.72;
  font-variant-numeric: tabular-nums;
`

const PolityCountBadge = styled.span<{ $active: boolean }>`
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  background: ${({ $active, theme }) =>
    $active
      ? theme.colors.primary
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.09)'
        : '#f1f5f9'};
  color: ${({ $active, theme }) =>
    $active ? '#ffffff' : theme.colors.text.secondary};
`

const SmartSuggestionCard = styled.div<{ $tone: 'warning' | 'info' }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 9px;
  border: 1px solid
    ${({ $tone, theme }) =>
      $tone === 'warning'
        ? theme.colors.alert.warning.border
        : theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.3)'
          : 'rgba(99, 102, 241, 0.22)'};
  background: ${({ $tone, theme }) =>
    $tone === 'warning'
      ? theme.mode === 'dark'
        ? 'rgba(245, 158, 11, 0.09)'
        : '#fffbeb'
      : theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.09)'
        : '#f5f7ff'};

  .guide-text {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    font-size: 12.5px;
    line-height: 1.45;
    color: ${({ theme }) => theme.colors.text.primary};

    svg {
      flex-shrink: 0;
      margin-top: 2px;
      color: ${({ $tone, theme }) =>
        $tone === 'warning' ? '#d97706' : theme.colors.primary};
    }
  }

  .guide-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding-left: 21px;
  }
`

const QuickSwitchChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.2)' : '#ffffff'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#c7d2fe' : theme.colors.primary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.primary};
    color: #ffffff;
  }
`

const SubtleNoticeRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ModeCardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`

const ModeCardButton = styled.button<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  padding: 11px 12px;
  border-radius: 10px;
  text-align: left;
  cursor: pointer;
  font: inherit;
  border: 1.5px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border.default};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.16)'
        : 'rgba(99, 102, 241, 0.06)'
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.02)'
        : '#ffffff'};
  transition: border-color 0.15s ease, background-color 0.15s ease;

  .card-top {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    color: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? '#c7d2fe'
          : theme.colors.primary
        : theme.colors.text.primary};

    strong {
      font-size: 12.5px;
      font-weight: 700;
    }
  }

  .card-desc {
    font-size: 11.5px;
    line-height: 1.4;
    color: ${({ theme }) => theme.colors.text.secondary};
    word-break: keep-all;
  }

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const SmallBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.09)' : '#f1f5f9'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ExistingTenureBrowserBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const SearchInputWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f9fafb'};

  > svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff'};
  }
`

const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.primary};
  outline: none;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const ExistingTenureList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 220px;
  overflow-y: auto;
`

const ExistingTenureItemBtn = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
  font: inherit;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border.default};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.16)'
        : 'rgba(99, 102, 241, 0.07)'
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.02)'
        : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.primary};

  .tenure-main {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 13px;
  }
`

const CabinetStatePill = styled.span<{ $hasCabinet: boolean }>`
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ $hasCabinet, theme }) =>
    $hasCabinet
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.2)'
        : 'rgba(99, 102, 241, 0.1)'
      : theme.mode === 'dark'
        ? 'rgba(16, 185, 129, 0.18)'
        : 'rgba(16, 185, 129, 0.1)'};
  color: ${({ $hasCabinet, theme }) =>
    $hasCabinet
      ? theme.mode === 'dark'
        ? '#c7d2fe'
        : theme.colors.primary
      : theme.mode === 'dark'
        ? '#6ee7b7'
        : '#047857'};
`

const MutedPeriodText = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-variant-numeric: tabular-nums;
`

const PersonSearchBarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const SmallGhostBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 11px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const PersonChipWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const PersonCandidateBtn = styled.button<{ $contemporary: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid
    ${({ $contemporary, theme }) =>
      $contemporary
        ? theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.4)'
          : 'rgba(99, 102, 241, 0.3)'
        : theme.colors.border.default};
  background: ${({ $contemporary, theme }) =>
    $contemporary
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.1)'
        : 'rgba(99, 102, 241, 0.04)'
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.02)'
        : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;

  .sub {
    font-size: 11px;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const EmptyHintBox = styled.div`
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SelectedPersonBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.35)'
        : 'rgba(99, 102, 241, 0.25)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.1)'
      : 'rgba(99, 102, 241, 0.04)'};

  .person-summary {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .person-name {
    font-size: 14px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  .person-sub {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const PersonInitialAvatar = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  flex-shrink: 0;
`

const QuickPersonCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.025)' : '#f8fafc'};
`

const QuickCardTopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const NameOrderBar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;

  .order-label {
    font-size: 12px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const NameOrderSegment = styled.div`
  display: inline-flex;
  padding: 2px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : '#ffffff'};
`

const NameOrderBtn = styled.button<{ $active: boolean }>`
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.primary : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? '#ffffff' : theme.colors.text.secondary};
`

const QuickBottomRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const QuickCreateBtn = styled.button`
  height: 38px;
  padding: 0 14px;
  border: none;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const QuickPreviewLine = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};

  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 700;
  }
`

const ReappointmentHelperBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.3)'
        : 'rgba(99, 102, 241, 0.2)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.07)' : '#f8faff'};

  .helper-header {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 12.5px;
    color: ${({ theme }) => theme.colors.text.primary};

    svg {
      color: ${({ theme }) => theme.colors.primary};
      flex-shrink: 0;
    }
  }

  .helper-options {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .reappoint-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
    padding: 9px 11px;
    border-radius: 8px;
    border: 1px solid ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.14)' : '#ffffff'};

    .title-line {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      color: ${({ theme }) => theme.colors.text.primary};
    }

    .desc-line {
      font-size: 11.5px;
      color: ${({ theme }) => theme.colors.text.secondary};
    }
  }

  .reshuffle-switch-btn {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 9px 11px;
    border-radius: 8px;
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#ffffff'};
    text-align: left;
    font: inherit;
    cursor: pointer;

    > svg {
      margin-top: 2px;
      flex-shrink: 0;
      color: ${({ theme }) => theme.colors.text.secondary};
    }

    strong {
      display: block;
      font-size: 12.5px;
      color: ${({ theme }) => theme.colors.text.primary};
    }

    span {
      font-size: 11.5px;
      color: ${({ theme }) => theme.colors.text.secondary};
    }

    &:hover {
      border-color: ${({ theme }) => theme.colors.primary};
    }
  }
`

const PreviousCabinetBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 9px 13px;
  margin-bottom: 6px;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc'};
  font-size: 12.5px;

  .prev-info {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  .prev-tag {
    padding: 2px 7px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'};
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  .prev-period {
    color: ${({ theme }) => theme.colors.text.secondary};
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  .prev-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
`

const QuickFillBtn = styled.button`
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.4)'
        : 'rgba(99, 102, 241, 0.3)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.14)' : '#ffffff'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#c7d2fe' : theme.colors.primary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.primary};
    color: #ffffff;
  }
`

const PresetChipWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const RolePresetChip = styled.button<{ $active: boolean }>`
  padding: 5px 11px;
  border-radius: 999px;
  font: inherit;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  cursor: pointer;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border.default};
  background: ${({ $active, theme }) =>
    $active
      ? theme.colors.primary
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.025)'
        : '#ffffff'};
  color: ${({ $active, theme }) =>
    $active ? '#ffffff' : theme.colors.text.primary};
`

const MonarchicalToggleChip = styled.button`
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 11.5px;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.text.secondary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const RoleClassificationRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;

  .regime-note {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const BranchPillGroup = styled.div`
  display: inline-flex;
  padding: 2px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f1f5f9'};
`

const BranchPillBtn = styled.button<{ $active: boolean }>`
  padding: 3px 9px;
  border: none;
  border-radius: 6px;
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.14)'
        : '#ffffff'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
`

const AdornedNumberBox = styled.div`
  display: flex;
  align-items: center;
  height: 38px;
  padding: 0 11px;
  gap: 6px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f9fafb'};

  .prefix,
  .suffix {
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    font: inherit;
    font-size: 14px;
    color: ${({ theme }) => theme.colors.text.primary};
    outline: none;
  }

  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff'};
  }
`

const AutoNamePreviewBar = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 600;
  }
`

const NativeSelect = styled.select`
  width: 100%;
  height: 38px;
  padding: 0 11px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f9fafb'};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 13.5px;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff'};
  }
`

const InlineCheckRow = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const OnboardingBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 14px 16px;
  margin-bottom: 14px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.08)' : '#f8faff'};
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.primary};
`

const InlineActionRow = styled.div`
  display: inline-flex;
  gap: 6px;
`

const SuggestedList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const SuggestedItemLabel = styled.label<{ $checked: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid
    ${({ $checked, theme }) =>
      $checked ? theme.colors.primary : theme.colors.border.default};
  background: ${({ $checked, theme }) =>
    $checked
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.14)'
        : 'rgba(99, 102, 241, 0.05)'
      : 'transparent'};
`

const SuggestedItemBody = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};

  > div {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
  }
`

const BatchProgressPill = styled.span`
  flex-shrink: 0;
  align-self: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
`

const PartySelectRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const ContinueSubmitBtn = styled.button`
  height: 38px;
  padding: 0 14px;
  border-radius: 9px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.45)'
        : 'rgba(99, 102, 241, 0.35)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.14)'
      : 'rgba(99, 102, 241, 0.06)'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#c7d2fe' : theme.colors.primary};
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.14s ease, border-color 0.14s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.24)'
        : 'rgba(99, 102, 241, 0.12)'};
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`
