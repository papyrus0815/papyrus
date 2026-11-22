import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiAlertCircle,
  FiArrowRight,
  FiAward,
  FiBookmark,
  FiCheck,
  FiClock,
  FiFlag,
  FiHelpCircle,
  FiInfo,
  FiLayers,
  FiMoreHorizontal,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiUser,
  FiUsers,
} from 'react-icons/fi'
import styled, { type DefaultTheme } from 'styled-components'

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
import {
  InlineSearchSelect,
  type SearchOption,
} from '@/shared/ui/person-register-modal/sections/inline-search-select'
import { AlertBox } from '@/shared/ui/alert-box/alert-box'
import { confirm } from '@/shared/ui/confirm-dialog'
import {
  DatePickerModal,
  type DatePickerPrecision,
} from '@/shared/ui/date-picker/date-picker-modal'
import { InlineDateField } from '@/shared/ui/person-register-modal/sections/inline-date-field'
import {
  ChoiceChips,
  type ChoiceChipOption,
  KitAddButton,
  KitBusyBar,
  kitC,
} from '@/shared/ui/register-form-kit/register-form-kit'
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
  FooterMissingCount,
  FooterReadyBadge,
  FooterReadyGroup,
  useModalSubmitShortcut,
} from '@/shared/ui/register-modal-shell/register-modal-chrome'
import {
  type ModalMoreActionOption,
  type ModalMoreToggleOption,
  RegisterModalMoreMenu,
} from '@/shared/ui/register-modal-shell/register-modal-more-menu'
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
  resolveMatchingPartyFromMemberships,
  resolvePolityYearGuidance,
  resolveSmartDefaultExecutiveRole,
} from './cabinet-form-modal.helpers'
import { formatDate, getPersonName } from './cabinets-section.helpers'
import { LinkedEventPickerField } from './linked-event-picker-field'

export type CabinetFormMode = 'head' | 'collective' | 'monarch'
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
type CabinetEntryChoiceKey =
  | 'head_new'
  | 'head_reshuffle'
  | 'collective'
  | 'monarch'

const CABINET_LAYOUT_STORAGE_KEY = 'papyrus:cabinet-register-layout'

function readInitialCabinetLayoutMode(): 'split' | 'single' {
  if (typeof window === 'undefined') return 'split'
  try {
    const saved = window.localStorage.getItem(CABINET_LAYOUT_STORAGE_KEY)
    return saved === 'single' ? 'single' : 'split'
  } catch {
    return 'split'
  }
}

interface CabinetModeGuideItem {
  key: CabinetEntryChoiceKey
  label: string
  shortBadge: string
  icon: React.ReactNode
  summary: string
  criteria: string
  examples: string
}

const CABINET_MODE_GUIDE_LIST: ReadonlyArray<CabinetModeGuideItem> = [
  {
    key: 'head_new',
    label: '1인 수반 내각',
    shortBadge: '새 취임 · 재집권',
    icon: <FiUser size={13.5} />,
    summary:
      '총리·대통령·재상 등 수반의 새 임기와 해당 내각·행정부를 한 번에 함께 등록합니다.',
    criteria:
      '신규 취임, 퇴임 후 시간을 둔 재집권, 또는 수반이 있는 임시정부 출범 시 선택',
    examples: '제1차 처칠 내각 · 이승만 행정부 · 티사 이슈트반 내각 · 이토 내각',
  },
  {
    key: 'head_reshuffle',
    label: '임기 내 개각 추가',
    shortBadge: '연속 재임 중 개편',
    icon: <FiLayers size={13.5} />,
    summary:
      '이미 등록된 수반 임기 안에서 장관진 개편·연정 재구성 등으로 새 내각만 추가 개설합니다.',
    criteria:
      '수반 본인의 퇴임 없이 연속 재임하는 동안 제2차·개조·전시·거국내각을 나눌 때 선택',
    examples: '제2차 개조내각 · 전시연립내각 · 부분 개각 후 제3기 내각',
  },
  {
    key: 'collective',
    label: '집단지도 · 위원회',
    shortBadge: '수반 없는 합의체',
    icon: <FiUsers size={13.5} />,
    summary:
      '단일 1인 수반을 두지 않고 위원회·평의회·국무원이 공동으로 행정권을 행사한 정부입니다.',
    criteria:
      '혁명기 통치평의회, 군사혁명위원회, 합의제 연방평의회 등 공동 수반 체제에 선택',
    examples:
      '프랑스 공안위원회 · 스위스 연방평의회 · 혁명통치평의회 · 과도국가평의회',
  },
  {
    key: 'monarch',
    label: '군주 · 원수 재위',
    shortBadge: '국왕 · 황제 · 상징 원수',
    icon: <FiAward size={13.5} />,
    summary:
      '국왕·황제·천황 등의 재위 기록을 등록합니다. 내각 타임라인의 재위 띠와 왕조 통치자 목록에 함께 반영됩니다.',
    criteria:
      '전근대 왕조의 역대 군주·황제 재위 또는 입헌군주국의 국왕·천황 재위 등록 시 선택',
    examples: '세종 (조선 제4대 국왕) · 엘리자베스 2세 · 아우구스투스 황제',
  },
]

const MONARCH_ROLE_PRESETS: ReadonlyArray<string> = [
  '국왕',
  '황제',
  '여왕',
  '천황',
  '술탄',
  '차르',
  '대공',
  '섭정',
]

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

  const [layoutMode, setLayoutMode] = useState<'split' | 'single'>(
    readInitialCabinetLayoutMode,
  )
  const [headerMoreMenuOpen, setHeaderMoreMenuOpen] = useState<boolean>(false)
  const [modeGuideOpen, setModeGuideOpen] = useState<boolean>(false)
  const [activeDatePicker, setActiveDatePicker] = useState<
    'start' | 'end' | null
  >(null)

  const applyLayoutMode = useCallback((nextMode: 'split' | 'single') => {
    setLayoutMode(nextMode)
    try {
      window.localStorage.setItem(CABINET_LAYOUT_STORAGE_KEY, nextMode)
    } catch {
      // storage disabled
    }
  }, [])

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

  const [mode, setMode] = useState<CabinetFormMode>(() => initialMode ?? 'head')
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
  const [roleTitle, setRoleTitle] = useState<string>(() =>
    initialMode === 'monarch' ? '국왕' : '총리',
  )
  const [positionTypeOverride, setPositionTypeOverride] = useState<
    'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT'
  >(() =>
    initialMode === 'monarch' ? 'HEAD_OF_STATE' : 'HEAD_OF_GOVERNMENT',
  )
  const [selectedPositionDefId, setSelectedPositionDefId] = useState<
    string | null
  >(null)
  const [ordinalInput, setOrdinalInput] = useState<string>('')
  const [subTermInput, setSubTermInput] = useState<string>('')
  const [regnalNameInput, setRegnalNameInput] = useState<string>('')

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
    setModeGuideOpen(false)
    setShowQuickCreateParty(false)
    setQuickPartyName('')
    setQuickPartyShortName('')
    setAutoSuggestedPartyLabel(null)
    setInitialOriginEventTitle(null)

    const nextInitialMode = initialMode ?? 'head'
    setMode(nextInitialMode)
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

    if (nextInitialMode === 'monarch') {
      setRoleTitle('국왕')
      setSelectedPositionDefId(null)
      setPositionTypeOverride('HEAD_OF_STATE')
    } else {
      setRoleTitle(smartRoleDefault.title)
      setSelectedPositionDefId(smartRoleDefault.positionDefId)
      setPositionTypeOverride(smartRoleDefault.positionType)
    }

    setOrdinalInput('')
    setSubTermInput('')
    setRegnalNameInput('')
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
      setModeGuideOpen(false)

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
    const activeCreateMode =
      !isEditing && initializedSessionKeyRef.current === null
        ? (initialMode ?? mode)
        : mode
    if (
      !isOpen ||
      isEditing ||
      activeCreateMode === 'monarch' ||
      userTouchedRoleRef.current
    ) {
      return
    }
    setRoleTitle(smartRoleDefault.title)
    setSelectedPositionDefId(smartRoleDefault.positionDefId)
    setPositionTypeOverride(smartRoleDefault.positionType)
  }, [isOpen, isEditing, mode, initialMode, smartRoleDefault])

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

  const politySelectOptions = useMemo<SearchableSelectOption[]>(() => {
    if (polityOptions.length <= 1) return []
    const historicalCount = Math.max(0, polityOptions.length - 1)
    return polityOptions.map((polityItem, index) => {
      const metaBits: string[] = []
      if (polityItem.eraLabel) metaBits.push(polityItem.eraLabel)
      if (polityItem.cabinetCount > 0) {
        metaBits.push(`내각 ${polityItem.cabinetCount}건`)
      }
      return {
        value: polityItem.id,
        label: polityItem.name,
        meta: metaBits.length > 0 ? metaBits.join(' · ') : undefined,
        group:
          index === 0
            ? '기본 소속'
            : `연결된 시대 · 역사 정치체 (${historicalCount})`,
        icon: index === 0 ? <FiFlag size={13} /> : <FiBookmark size={13} />,
        keywords: [polityItem.name, polityItem.eraLabel]
          .filter(Boolean)
          .join(' '),
      }
    })
  }, [polityOptions])

  const partySelectOptions = useMemo<SearchableSelectOption[]>(() => {
    const result: SearchableSelectOption[] = []
    if (fallbackSelectedPartyOption) {
      result.push({
        value: fallbackSelectedPartyOption.id,
        label: formatPartyOptionLabel(fallbackSelectedPartyOption),
        group: '현재 선택된 정당',
      })
    }
    const hasBothGroups =
      organizedPartyBuckets.recommendedParties.length > 0 &&
      organizedPartyBuckets.otherParties.length > 0
    for (const partyItem of organizedPartyBuckets.recommendedParties) {
      result.push({
        value: partyItem.id,
        label: formatPartyOptionLabel(partyItem),
        group: hasBothGroups ? '추천 · 해당 시대 정당' : undefined,
        keywords: [partyItem.name, partyItem.shortName]
          .filter(Boolean)
          .join(' '),
      })
    }
    for (const partyItem of organizedPartyBuckets.otherParties) {
      result.push({
        value: partyItem.id,
        label: formatPartyOptionLabel(partyItem),
        group: hasBothGroups ? '기타 · 상위 국가 및 타 시기 정당' : undefined,
        keywords: [partyItem.name, partyItem.shortName]
          .filter(Boolean)
          .join(' '),
      })
    }
    return result
  }, [fallbackSelectedPartyOption, organizedPartyBuckets])

  /**
   * 수반 인물 드롭다운 — 인물 등록 모달의 국적 칸(InlineSearchSelect)과 같은 문법.
   * 묶음: 이 시기에 살았던 이 국가 인물 → 이 국가의 다른 인물 → 서버 검색으로 찾은 다른 국가 인물.
   * 예전엔 검색 칸 아래 추천 칩 5~8개만 깔려, 나머지 인물은 이름을 알아야 찾을 수 있었다.
   */
  const personSelectOptions = useMemo<SearchOption[]>(() => {
    const seen = new Set<string>()
    const contemporary: SearchOption[] = []
    const others: SearchOption[] = []
    for (const personItem of mergedCountryPersons) {
      if (seen.has(personItem.id)) continue
      seen.add(personItem.id)
      const isContemporary =
        signedStartYear != null &&
        isPersonPlausibleForYear(personItem, signedStartYear)
      const option: SearchOption = {
        value: personItem.id,
        label: getPersonDisplayName(personItem),
        meta: formatPersonLifespanTag(personItem) ?? undefined,
        keywords: [personItem.originalName, personItem.name, personItem.surname]
          .filter(Boolean)
          .join(' '),
        group: isContemporary ? '이 시기에 활동한 인물' : '이 국가의 인물',
      }
      if (isContemporary) contemporary.push(option)
      else others.push(option)
    }
    const searched: SearchOption[] = []
    for (const personItem of searchedPersons as PersonSearchItem[]) {
      if (seen.has(personItem.id)) continue
      seen.add(personItem.id)
      searched.push({
        value: personItem.id,
        label: getPersonDisplayName(personItem),
        meta: personItem.originalName ?? undefined,
        keywords: [personItem.originalName, personItem.name, personItem.surname]
          .filter(Boolean)
          .join(' '),
        group: '다른 국가 인물 (검색)',
      })
    }
    return [...contemporary, ...others, ...searched]
  }, [mergedCountryPersons, searchedPersons, signedStartYear])

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

  const { visibleRoleChips, overflowRoleChips } = useMemo(() => {
    if (mode === 'monarch') {
      const seenMonarch = new Set<string>()
      const monarchMerged: Array<{
        title: string
        positionType: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT'
        positionDefId: string | null
      }> = []
      for (const scopedChip of monarchicalRoleChips) {
        if (!scopedChip.positionDefId || seenMonarch.has(scopedChip.title)) {
          continue
        }
        seenMonarch.add(scopedChip.title)
        monarchMerged.push(scopedChip)
      }
      for (const presetTitle of MONARCH_ROLE_PRESETS) {
        if (seenMonarch.has(presetTitle)) continue
        seenMonarch.add(presetTitle)
        monarchMerged.push({
          title: presetTitle,
          positionType: 'HEAD_OF_STATE',
          positionDefId: null,
        })
      }
      return {
        visibleRoleChips: monarchMerged.slice(0, 6),
        overflowRoleChips: monarchMerged.slice(6),
      }
    }
    const quickFive = primaryRoleChips.slice(0, 5)
    const remainingPrimary = primaryRoleChips.slice(5)
    const trimmedCurrent = roleTitle.trim()
    const allOverflow = [...remainingPrimary, ...monarchicalRoleChips]
    const activeOverflowItem = allOverflow.find(
      (chipItem) => chipItem.title === trimmedCurrent,
    )
    return {
      visibleRoleChips: activeOverflowItem
        ? [...quickFive, activeOverflowItem]
        : quickFive,
      overflowRoleChips: remainingPrimary,
    }
  }, [mode, primaryRoleChips, monarchicalRoleChips, roleTitle])

  const filledExtraCount = useMemo(() => {
    let count = 0
    if (originEventId.trim()) count += 1
    if (appointmentMethod.trim() || endReason.trim()) count += 1
    if (notes.trim() || endReasonDetail.trim()) count += 1
    if (cabinetDescription.trim()) count += 1
    return count
  }, [
    originEventId,
    appointmentMethod,
    endReason,
    notes,
    endReasonDetail,
    cabinetDescription,
  ])

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
    const refMap: Record<ModalSectionKey, React.RefObject<HTMLElement | null>> =
      {
        period: periodSectionRef,
        leader: leaderSectionRef,
        role: roleSectionRef,
        extra: extraSectionRef,
      }
    const targetEl = refMap[sectionKey].current
    if (!targetEl) return
    targetEl.scrollIntoView?.({
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

      await maybeAutoClosePreviousOngoing()

      const tenurePayload: CreateGovernmentPositionTenureDto = {
        personId: selectedPersonId,
        positionType:
          mode === 'monarch' ? 'HEAD_OF_STATE' : resolvedPositionType,
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
        ...(mode !== 'monarch' &&
        parsedSubTerm != null &&
        Number.isFinite(parsedSubTerm)
          ? { subTermNumber: parsedSubTerm }
          : {}),
        ...(mode === 'monarch' && regnalNameInput.trim()
          ? { regnalName: regnalNameInput.trim() }
          : {}),
        ...(mode !== 'monarch' && partyId ? { partyId } : {}),
        ...(originEventId.trim() && mode === 'monarch'
          ? { accessionEventId: originEventId.trim() }
          : {}),
        startDateInfo,
        ...(endDateInfo ? { endDateInfo } : {}),
        ...(appointmentMethod
          ? {
              appointmentMethod:
                appointmentMethod as CreateGovernmentPositionTenureDto['appointmentMethod'],
            }
          : mode === 'monarch'
            ? { appointmentMethod: 'HEREDITARY' }
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

      if (mode === 'monarch') {
        return { id: undefined }
      }

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
        setRegnalNameInput('')

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
          : mode === 'monarch'
            ? '군주 · 국가원수 재위 기록이 등록되었습니다.'
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
      : mode === 'monarch'
        ? '군주 · 국가원수 재위 등록'
        : '행정부 · 내각 등록'

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

  const activeEntryChoiceKey: CabinetEntryChoiceKey =
    mode === 'collective'
      ? 'collective'
      : mode === 'monarch'
        ? 'monarch'
        : headActionMode === 'reshuffle_existing'
          ? 'head_reshuffle'
          : 'head_new'

  const entryModeChipOptions = useMemo<
    ChoiceChipOption<CabinetEntryChoiceKey>[]
  >(
    () => [
      {
        value: 'head_new',
        label: '1인 수반 내각',
        title: '총리·대통령 등 새 수반 임기와 내각을 함께 등록합니다',
      },
      {
        value: 'head_reshuffle',
        label:
          effectiveExistingHeadTenures.length > 0
            ? `임기 내 개각 추가 (${effectiveExistingHeadTenures.length})`
            : '임기 내 개각 추가',
        title: '기등록 수반 임기 안에서 제2차·개조·전시내각만 추가합니다',
      },
      {
        value: 'collective',
        label: '집단지도 · 위원회',
        title: '1인 수반 없이 평의회·위원회가 공동 통치한 정부를 등록합니다',
      },
      {
        value: 'monarch',
        label: '군주 · 원수 재위',
        title: '국왕·황제·천황 등 군주 및 상징 국가원수의 재위 기록을 등록합니다',
      },
    ],
    [effectiveExistingHeadTenures.length],
  )

  const activeModeGuide =
    CABINET_MODE_GUIDE_LIST.find(
      (guideItem) => guideItem.key === activeEntryChoiceKey,
    ) ?? CABINET_MODE_GUIDE_LIST[0]

  const selectEntryChoice = (nextChoice: CabinetEntryChoiceKey) => {
    setErrorMessage(null)
    if (nextChoice === 'collective') {
      setMode('collective')
      setSelectedExistingTenureId(null)
      return
    }
    if (nextChoice === 'monarch') {
      setMode('monarch')
      setHeadActionMode('new_tenure')
      setSelectedExistingTenureId(null)
      setPositionTypeOverride('HEAD_OF_STATE')
      if (!userTouchedRoleRef.current) {
        const dbMonarch = monarchicalRoleChips.find((chipItem) =>
          Boolean(chipItem.positionDefId),
        )
        setRoleTitle(dbMonarch?.title ?? '국왕')
        setSelectedPositionDefId(dbMonarch?.positionDefId ?? null)
      }
      return
    }
    if (nextChoice === 'head_reshuffle') {
      setMode('head')
      setHeadActionMode('reshuffle_existing')
      return
    }
    setMode('head')
    setHeadActionMode('new_tenure')
    setSelectedExistingTenureId(null)
    if (!userTouchedRoleRef.current) {
      setRoleTitle(smartRoleDefault.title)
      setSelectedPositionDefId(smartRoleDefault.positionDefId)
      setPositionTypeOverride(smartRoleDefault.positionType)
    }
  }

  const isSplitActive = !onboardingCabinetId && layoutMode === 'split'

  const headerMoreToggles = useMemo<ModalMoreToggleOption[]>(() => {
    const toggleList: ModalMoreToggleOption[] = []
    if (!isEditing && canAutoClosePrev && previousCabinetBriefing) {
      toggleList.push({
        key: 'auto-close-prev',
        label: '직전 현직 내각 자동 마감',
        description: `${previousCabinetBriefing.cabinetTitle} 종료일을 출범일로 마감`,
        checked: autoClosePreviousCabinet,
        onChange: setAutoClosePreviousCabinet,
      })
    }
    toggleList.push({
      key: 'auto-link-party',
      label: '소속 정당을 집권 여당으로 연결',
      description: '정당 지정 시 내각 주도 여당에도 함께 반영',
      checked: autoLinkRulingParty,
      onChange: setAutoLinkRulingParty,
    })
    if (isEditing && editingCabinet?.headTenure?.id) {
      toggleList.push({
        key: 'sync-head-tenure',
        label: '수반 전체 임기 기간도 함께 변경',
        description: isReshuffleOrDistinctPeriodEdit
          ? '개각 고유 기간만 수정할 때는 해제하세요'
          : '해제하면 내각 고유 기간만 수정됩니다',
        checked: syncPeriodToHeadTenure,
        onChange: setSyncPeriodToHeadTenure,
      })
    }
    return toggleList
  }, [
    isEditing,
    canAutoClosePrev,
    previousCabinetBriefing,
    autoClosePreviousCabinet,
    autoLinkRulingParty,
    editingCabinet,
    isReshuffleOrDistinctPeriodEdit,
    syncPeriodToHeadTenure,
  ])

  const headerMoreActions = useMemo<ModalMoreActionOption[]>(() => {
    const actionList: ModalMoreActionOption[] = []
    if (!isEditing) {
      actionList.push({
        key: 'mode-guide',
        label: modeGuideOpen
          ? '등록 방식 기준 안내 닫기'
          : '등록 방식 기준 안내',
        icon: <FiHelpCircle size={14} />,
        active: modeGuideOpen,
        onClick: () => setModeGuideOpen((prevOpen) => !prevOpen),
      })
    }
    if (!isEditing && isFormDirty && !saveCabinetMutation.isPending) {
      actionList.push({
        key: 'reset',
        label: '작성 내용 초기화',
        icon: <FiRefreshCw size={13.5} />,
        danger: true,
        onClick: () => {
          void handleResetClick()
        },
      })
    }
    return actionList
  }, [
    isEditing,
    modeGuideOpen,
    isFormDirty,
    saveCabinetMutation.isPending,
    handleResetClick,
  ])

  return (
    <RegisterModal
      isOpen={isOpen}
      onClose={() => {
        void requestClose()
      }}
      title={modalTitle}
      // 사건·군부대 등록 모달과 같은 크기 — 2단이면 1440·화면 높이 90%
      maxWidth={isSplitActive ? 'min(1440px, 96vw)' : 'min(1040px, 96vw)'}
      minHeight="90vh"
      fullBleedOnMobile
      closeOnEsc={
        !saveCabinetMutation.isPending &&
        activeDatePicker === null &&
        !headerMoreMenuOpen
      }
      closeOnOverlayClick={false}
      headerActions={
        !onboardingCabinetId ? (
          <HeaderRightBar>
            {resolvedPolityAxis.displayName ? (
              <HeaderPolityBadge title="현재 등록 대상 국가 · 시대 정치체">
                <FiFlag size={11.5} aria-hidden />
                <span>{resolvedPolityAxis.displayName}</span>
              </HeaderPolityBadge>
            ) : null}

            <RegisterModalMoreMenu
              layoutMode={layoutMode}
              onChangeLayoutMode={applyLayoutMode}
              toggles={headerMoreToggles}
              actions={headerMoreActions}
              ariaLabel="모달 설정 더보기"
              title="화면 배치 · 자동 연결 설정 · 초기화"
              hasActiveIndicator={modeGuideOpen}
              onOpenChange={setHeaderMoreMenuOpen}
            />
          </HeaderRightBar>
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
          <CabinetModalFormScroll
            ref={scrollContainerRef}
            $layoutMode={layoutMode}
          >
            {saveCabinetMutation.isPending && (
              <KitBusyBar role="status" aria-live="polite">
                {isEditing
                  ? '수정 사항을 저장하는 중...'
                  : '행정부 · 내각을 등록하는 중...'}
              </KitBusyBar>
            )}

            {errorMessage ? (
              <AlertBox
                variant="danger"
                icon={<FiAlertCircle />}
                style={{ marginBottom: 16 }}
              >
                {errorMessage}
              </AlertBox>
            ) : null}

            <LabeledRowsWrap>
              <SplitColumnsGrid
                $layoutMode={layoutMode}
                data-testid={
                  layoutMode === 'split' ? 'cabinet-form-split-grid' : undefined
                }
              >
                <SplitColumnLeft
                  id="cabinet-form-split-left"
                  $layoutMode={layoutMode}
                >
                  {/* ═══════════════ 좌측: 출범 · 수반 ═══════════════ */}
                  <FormGroup ref={periodSectionRef}>
                    <FormGroupTitle>출범 · 수반</FormGroupTitle>

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
                            placeholder="국가 또는 역사적 정치체 검색…"
                            searchPlaceholder="국가명·왕조명·공화국명 검색…"
                            ariaLabel="소속 국가 및 정치체 선택"
                          />
                        </FieldControl>
                      </FieldRow>
                    ) : politySelectOptions.length > 0 ? (
                      <FieldRow>
                        <FieldLabel>시대 · 정치체</FieldLabel>
                        <FieldControl>
                          <SearchableSelect
                            options={politySelectOptions}
                            value={selectedPolityId}
                            clearable={false}
                            onChange={(nextPolityId) => {
                              if (!nextPolityId) return
                              setSelectedPolityId(nextPolityId)
                              setSelectedPositionDefId(null)
                              if (!isEditing) {
                                setSelectedExistingTenureId(null)
                                setHeadActionMode('new_tenure')
                              }
                            }}
                            placeholder="시대 · 역사 정치체 선택"
                            searchPlaceholder="왕조 · 공화국명 또는 존속 연도 검색…"
                            ariaLabel="시대 및 정치체 선택"
                            noMatchMessage="일치하는 시대·정치체가 없습니다"
                          />

                          {polityYearGuidance ? (
                            <SmartSuggestionCard
                              $tone={polityYearGuidance.severity}
                            >
                              <div className="guide-text">
                                <FiInfo size={14} />
                                <span>{polityYearGuidance.message}</span>
                              </div>
                              {polityYearGuidance.suggestedPolities.length >
                              0 ? (
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
                          ) : null}
                        </FieldControl>
                      </FieldRow>
                    ) : null}

                    <FieldRow>
                      <FieldLabel>
                        <div>
                          존속 기간 <Required>*</Required>
                        </div>
                        {durationSummary ? (
                          <DurationPill>
                            <FiClock size={11} />
                            <span>{durationSummary}</span>
                          </DurationPill>
                        ) : null}
                      </FieldLabel>
                      <FieldControl>
                        <DateRangeGrid>
                          <SubField>
                            <SubFieldHeaderRow>
                              <SubFieldLabel>
                                출범 · 취임일 <Required>*</Required>
                              </SubFieldLabel>
                              {!isEditing &&
                              !startYear.trim() &&
                              previousCabinetBriefing?.continuationStartParts ? (
                                <InlineClearLink
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
                                  직전 종료일(
                                  {
                                    previousCabinetBriefing
                                      .continuationStartParts.year
                                  }
                                  {previousCabinetBriefing
                                    .continuationStartParts.month
                                    ? `.${previousCabinetBriefing.continuationStartParts.month}`
                                    : ''}
                                  ) 적용
                                </InlineClearLink>
                              ) : null}
                            </SubFieldHeaderRow>
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
                                종료 · 퇴임일{' '}
                                <OptionalTag>(비우면 현직)</OptionalTag>
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
                                  비우기
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
                        </DateRangeGrid>

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

                    <span
                      ref={leaderSectionRef as React.RefObject<HTMLSpanElement>}
                      style={{ display: 'contents' }}
                    />

                    {!isEditing ? (
                      <FieldRow>
                        <FieldLabel>등록 방식</FieldLabel>
                        <FieldControl>
                          <EntryModeHeaderRow>
                            <EntryChipsWrap>
                              <ChoiceChips
                                value={activeEntryChoiceKey}
                                options={entryModeChipOptions}
                                ariaLabel="내각 등록 방식 선택"
                                onChange={(nextChoice) => {
                                  if (!nextChoice) return
                                  selectEntryChoice(nextChoice)
                                }}
                              />
                            </EntryChipsWrap>

                            <InlineMoreIconBtn
                              type="button"
                              $open={modeGuideOpen}
                              aria-label="방식 기준 안내"
                              aria-expanded={modeGuideOpen}
                              title={
                                modeGuideOpen
                                  ? '등록 방식 비교 안내 닫기'
                                  : '등록 방식 기준 · 대표 사례 비교 보기'
                              }
                              onClick={() =>
                                setModeGuideOpen((prevOpen) => !prevOpen)
                              }
                            >
                              <FiMoreHorizontal size={15} aria-hidden />
                            </InlineMoreIconBtn>
                          </EntryModeHeaderRow>

                          <QuietModeCaption data-testid="active-cabinet-mode-callout">
                            <strong>{activeModeGuide.label}</strong>
                            <span className="sep" aria-hidden="true">
                              ·
                            </span>
                            <span>{activeModeGuide.summary}</span>
                          </QuietModeCaption>

                          {modeGuideOpen ? (
                            <ModeFullGuidePanel
                              role="region"
                              aria-label="내각 등록 방식 비교 안내"
                            >
                              <ModeGuideTopCaption>
                                3가지 등록 방식 비교 — 항목을 클릭하면 바로
                                선택됩니다
                              </ModeGuideTopCaption>
                              {CABINET_MODE_GUIDE_LIST.map((guideItem) => {
                                const isSelected =
                                  guideItem.key === activeEntryChoiceKey
                                return (
                                  <ModeGuideOptionBtn
                                    key={guideItem.key}
                                    type="button"
                                    $selected={isSelected}
                                    onClick={() =>
                                      selectEntryChoice(guideItem.key)
                                    }
                                  >
                                    <div className="guide-opt-head">
                                      <span className="guide-opt-title">
                                        {guideItem.icon}
                                        <strong>{guideItem.label}</strong>
                                        <span className="sub-badge">
                                          {guideItem.shortBadge}
                                        </span>
                                      </span>
                                      {isSelected ? (
                                        <span className="selected-pill">
                                          <FiCheck size={11} />
                                          선택됨
                                        </span>
                                      ) : null}
                                    </div>
                                    <span className="guide-opt-criteria">
                                      {guideItem.criteria}
                                    </span>
                                    <span className="guide-opt-ex">
                                      예: {guideItem.examples}
                                    </span>
                                  </ModeGuideOptionBtn>
                                )
                              })}
                              <ModeBoundaryTip>
                                <span className="tip-tag">재집권 vs 개각</span>
                                <span>
                                  퇴임 후 다시 취임한 경우는{' '}
                                  <strong>1인 수반 내각</strong>을, 퇴임 없이
                                  연속 재임 중 내각만 재편한 경우는{' '}
                                  <strong>임기 내 개각 추가</strong>를, 국왕·황제
                                  재위는 <strong>군주 · 원수 재위</strong>를
                                  선택하세요.
                                </span>
                              </ModeBoundaryTip>
                            </ModeFullGuidePanel>
                          ) : null}
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

                {/* 2-B. Single Leader / Monarch Mode (Create or Edit) */}
                {(mode === 'head' || mode === 'monarch') &&
                (isEditing || headActionMode === 'new_tenure') ? (
                  <FieldRow>
                    <FieldLabel>
                      {mode === 'monarch' ? '군주 · 원수' : '수반 인물'}{' '}
                      <Required>*</Required>
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
                          <InlineSearchSelect
                            ariaLabel="수반 인물"
                            placeholder="수반 인물 이름 검색 (성·이름·원어명) — 누르면 목록"
                            options={personSelectOptions}
                            value=""
                            limit={80}
                            clearable={false}
                            onQueryChange={setPersonQuery}
                            onChange={(personId) => {
                              if (!personId) return
                              const picked = personSelectOptions.find(
                                (option) => option.value === personId,
                              )
                              setSelectedPersonId(personId)
                              setSelectedPersonLabel(picked?.label ?? '')
                              setSelectedExistingTenureId(null)
                            }}
                            onCreateNew={() => setShowQuickCreatePerson(true)}
                            createLabel="새 인물 즉석 등록"
                          />
                          {personSelectOptions.length === 0 ? (
                            <FieldHint>
                              이 국가·시대에 연결된 인물이 아직 없습니다. 이름을
                              검색하거나 목록 맨 아래 ‘새 인물 즉석 등록’을
                              누르세요.
                            </FieldHint>
                          ) : null}
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
                    {isEditing && mode === 'collective' ? (
                      <FieldRow>
                        <FieldLabel>정부 형태</FieldLabel>
                        <FieldControl>
                          <QuietModeCaption data-testid="active-cabinet-mode-callout">
                            <strong>{activeModeGuide.label}</strong>
                            <span className="sep" aria-hidden="true">
                              ·
                            </span>
                            <span>{activeModeGuide.summary}</span>
                          </QuietModeCaption>
                        </FieldControl>
                      </FieldRow>
                    ) : null}
                  </FormGroup>

                  {/* ═══════════════ 좌측 하단: 추가 정보 — 예전엔 오른쪽 아래에 접혀 있었다. 늘 펼치고, 짧은 왼쪽 칸 아래로 옮겨 두 칸 높이를 맞춘다 ═══════════════ */}
                  <FormGroup
                    ref={extraSectionRef as React.RefObject<HTMLElement>}
                  >
                    <FormGroupTitle>
                      추가 정보
                      <ExtraHeaderSub>
                        {mode === 'monarch'
                          ? '즉위 사건 · 즉위/퇴위 경위 · 배경 메모'
                          : '출범 사건 · 취임/퇴임 경위 · 내각 개요'}
                      </ExtraHeaderSub>
                      {filledExtraCount > 0 ? (
                        <ExtraFilledBadge>
                          {filledExtraCount}건 입력됨
                        </ExtraFilledBadge>
                      ) : null}
                    </FormGroupTitle>
                        <FieldRow>
                          <FieldLabel>
                            {mode === 'monarch' ? '즉위 사건' : '출범 사건'}
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
                          </FieldControl>
                        </FieldRow>

                        {(mode === 'head' || mode === 'monarch') &&
                        (isEditing || headActionMode === 'new_tenure') ? (
                          <FieldRow>
                            <FieldLabel>
                              {mode === 'monarch' ? '즉위 · 퇴위' : '취임 · 퇴임'}
                            </FieldLabel>
                            <FieldControl>
                              <SubFieldPair $cols={2}>
                                <SubField>
                                  <SubFieldLabel>취임 방식</SubFieldLabel>
                                  <NativeSelect
                                    value={appointmentMethod}
                                    onChange={(changeEvent) =>
                                      setAppointmentMethod(
                                        changeEvent.target.value,
                                      )
                                    }
                                  >
                                    <option value="">선택 안 함</option>
                                    <option value="PARLIAMENTARY_ELECTION">
                                      의회 선출 (내각책임제 등)
                                    </option>
                                    <option value="APPOINTMENT">
                                      군주 · 국가원수 임명
                                    </option>
                                    <option value="DIRECT_ELECTION">
                                      직접 선거
                                    </option>
                                    <option value="INDIRECT_ELECTION">
                                      간접 선거
                                    </option>
                                    <option value="COUP">쿠데타 · 혁명</option>
                                    <option value="RESTORATION">
                                      복위 · 재추대
                                    </option>
                                    <option value="HEREDITARY">세습</option>
                                    <option value="ELECTIVE_MONARCHY">
                                      선거군주제 선출
                                    </option>
                                    <option value="TREATY">
                                      조약에 의한 취임
                                    </option>
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
                                    <option value="TERM_COMPLETED">
                                      임기 만료
                                    </option>
                                    <option value="REMOVAL">해임 · 면직</option>
                                    <option value="IMPEACHMENT">
                                      탄핵 · 파면
                                    </option>
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
                                  <SubFieldLabel>취임 배경 메모</SubFieldLabel>
                                  <Input
                                    value={notes}
                                    onChange={(changeEvent) =>
                                      setNotes(changeEvent.target.value)
                                    }
                                    placeholder="예: 거국연립내각 구성 배경"
                                  />
                                </SubField>
                                <SubField>
                                  <SubFieldLabel>퇴임 상세 사유</SubFieldLabel>
                                  <Input
                                    value={endReasonDetail}
                                    onChange={(changeEvent) =>
                                      setEndReasonDetail(
                                        changeEvent.target.value,
                                      )
                                    }
                                    placeholder="예: 의회 불신임 가결"
                                  />
                                </SubField>
                              </SubFieldPair>
                            </FieldControl>
                          </FieldRow>
                        ) : null}

                        {mode !== 'monarch' ? (
                          <FieldRow>
                            <FieldLabel>내각 개요</FieldLabel>
                            <FieldControl>
                              <PersonRegisterModalTextarea
                                rows={2}
                                style={{ minHeight: 64 }}
                                value={cabinetDescription}
                                onChange={(changeEvent) =>
                                  setCabinetDescription(changeEvent.target.value)
                                }
                                placeholder="출범 기조나 연립 구성 등 간단한 설명 (선택)"
                              />
                            </FieldControl>
                          </FieldRow>
                        ) : null}
                  </FormGroup>
                </SplitColumnLeft>

                <SplitColumnRight
                  id="cabinet-form-split-right"
                  $layoutMode={layoutMode}
                >
                  {/* ═══════════════ 우측: 직책 · 명칭 · 정당 ═══════════════ */}
                  <FormGroup ref={roleSectionRef}>
                    <FormGroupTitle>
                      {mode === 'monarch'
                        ? '군주 직함 · 대수 · 왕호'
                        : '직책 · 명칭 · 정당'}
                    </FormGroupTitle>

                    {(mode === 'head' || mode === 'monarch') &&
                    (isEditing || headActionMode === 'new_tenure') ? (
                      <>
                        <FieldRow>
                          <FieldLabel>
                            {mode === 'monarch' ? '군주 직함' : '수반 직책'}{' '}
                            <Required>*</Required>
                          </FieldLabel>
                          <FieldControl>
                            <RoleInputBar>
                              <Input
                                value={roleTitle}
                                onChange={(changeEvent) => {
                                  userTouchedRoleRef.current = true
                                  const nextTitle = changeEvent.target.value
                                  setRoleTitle(nextTitle)
                                  setSelectedPositionDefId(null)
                                  setPositionTypeOverride(
                                    mode === 'monarch'
                                      ? 'HEAD_OF_STATE'
                                      : inferExecutivePositionType(nextTitle),
                                  )
                                }}
                                placeholder={
                                  mode === 'monarch'
                                    ? '예: 국왕, 황제, 천황, 여왕, 술탄'
                                    : '예: 총리, 대통령, 국무총리, 내각총리대신'
                                }
                              />
                            </RoleInputBar>

                            {visibleRoleChips.length + overflowRoleChips.length > 0 ? (
                              <PresetChipWrap>
                                {/* 예전엔 6개 넘는 프리셋을 ⋯ 메뉴에 숨겼다 — 모두 펼친다 */}
                                {[...visibleRoleChips, ...overflowRoleChips].map((presetItem) => {
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
                                          mode === 'monarch'
                                            ? 'HEAD_OF_STATE'
                                            : presetItem.positionType,
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
                              </PresetChipWrap>
                            ) : null}
                            {mode !== 'monarch' ? (
                              <RoleExtrasBlock>
                                <div className="extras-row">
                                  <span className="extras-label">
                                    행정부 분류
                                    {activePoliticalSystem?.governmentForm ? (
                                      <span className="extras-sub">
                                        {
                                          GOVERNMENT_FORM_LABEL[
                                            activePoliticalSystem.governmentForm
                                          ]
                                        }
                                      </span>
                                    ) : null}
                                  </span>
                                  <BranchPillGroup>
                                    <BranchPillBtn
                                      type="button"
                                      $active={
                                        positionTypeOverride ===
                                        'HEAD_OF_GOVERNMENT'
                                      }
                                      onClick={() =>
                                        setPositionTypeOverride(
                                          'HEAD_OF_GOVERNMENT',
                                        )
                                      }
                                    >
                                      정부수반 (내각)
                                    </BranchPillBtn>
                                    <BranchPillBtn
                                      type="button"
                                      $active={
                                        positionTypeOverride === 'HEAD_OF_STATE'
                                      }
                                      onClick={() =>
                                        setPositionTypeOverride('HEAD_OF_STATE')
                                      }
                                    >
                                      국가원수 (행정부)
                                    </BranchPillBtn>
                                  </BranchPillGroup>
                                </div>
                                {monarchicalRoleChips.length > 0 ? (
                                  <div className="extras-row">
                                    <span className="extras-label">
                                      군주 · 섭정 직접 친정 직위
                                    </span>
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
                                  </div>
                                ) : null}
                              </RoleExtrasBlock>
                            ) : null}
                          </FieldControl>
                        </FieldRow>

                        <FieldRow>
                          <FieldLabel>
                            {mode === 'monarch' ? '대수 · 왕호' : '대수 · 회차'}{' '}
                            <OptionalTag>(선택)</OptionalTag>
                          </FieldLabel>
                          <FieldControl>
                            <SubFieldPair $cols={2}>
                              <SubField>
                                <SubFieldHeaderRow>
                                  <SubFieldLabel>
                                    {mode === 'monarch'
                                      ? '왕위 · 재위 대수'
                                      : '역대 대수'}
                                  </SubFieldLabel>
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
                                      제
                                      {
                                        previousCabinetBriefing.suggestedNextOrdinal
                                      }
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
                                    placeholder="번호"
                                  />
                                  <span className="suffix">대</span>
                                </AdornedNumberBox>
                              </SubField>

                              {mode === 'monarch' ? (
                                <SubField>
                                  <SubFieldLabel>왕호 · 묘호 · 재직명</SubFieldLabel>
                                  <Input
                                    value={regnalNameInput}
                                    onChange={(changeEvent) =>
                                      setRegnalNameInput(
                                        changeEvent.target.value,
                                      )
                                    }
                                    placeholder="예: 세종, 빅토리아"
                                  />
                                </SubField>
                              ) : (
                                <SubField>
                                  <SubFieldLabel>재집권 회차</SubFieldLabel>
                                  <AdornedNumberBox>
                                    <input
                                      type="number"
                                      min={1}
                                      value={subTermInput}
                                      onChange={(changeEvent) =>
                                        setSubTermInput(
                                          changeEvent.target.value,
                                        )
                                      }
                                      placeholder="1, 2"
                                    />
                                    <span className="suffix">기</span>
                                  </AdornedNumberBox>
                                </SubField>
                              )}
                            </SubFieldPair>
                          </FieldControl>
                        </FieldRow>
                      </>
                    ) : null}

                    {mode !== 'monarch' ? (
                      <>
                        <FieldRow>
                          <FieldLabel>
                            {mode === 'collective' ? (
                              <>
                                기구 · 정부 명칭 <Required>*</Required>
                              </>
                            ) : !isEditing &&
                              headActionMode === 'reshuffle_existing' &&
                              (selectedExistingTenure?._existingCabinetCount ??
                                0) > 0 ? (
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
                                  ? '예: 혁명통치평의회, 공안위원회, 스위스 연방평의회'
                                  : headActionMode === 'reshuffle_existing'
                                    ? '예: 제2차 개조내각, 전시연립내각, 거국내각'
                                    : `비워두면 "${autoCabinetNamePreview}"(으)로 자동 생성`
                              }
                            />
                          </FieldControl>
                        </FieldRow>

                        <FieldRow>
                          <FieldLabel>
                            집권 정당 <OptionalTag>(선택)</OptionalTag>
                          </FieldLabel>
                      <FieldControl>
                        {showQuickCreateParty ? (
                          <QuickPersonCard>
                            <QuickCardTopBar>
                              <strong>새 정당 즉석 등록</strong>
                              <InlineClearLink
                                type="button"
                                onClick={() => setShowQuickCreateParty(false)}
                              >
                                목록으로 돌아가기
                              </InlineClearLink>
                            </QuickCardTopBar>

                            {resolvedPolityAxis.historicalCountryId &&
                            resolvedPolityAxis.countryId ? (
                              <NameOrderBar>
                                <span className="order-label">소속 범위</span>
                                <NameOrderSegment>
                                  <NameOrderBtn
                                    type="button"
                                    $active={quickPartyScope === 'active'}
                                    onClick={() => setQuickPartyScope('active')}
                                  >
                                    {resolvedPolityAxis.displayName ||
                                      '현재 시대 정체'}
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
                                  placeholder="예: 자유당, 피데스"
                                />
                              </SubField>
                              <SubField>
                                <SubFieldLabel>
                                  약칭 <OptionalTag>(선택)</OptionalTag>
                                </SubFieldLabel>
                                <Input
                                  value={quickPartyShortName}
                                  onChange={(changeEvent) =>
                                    setQuickPartyShortName(
                                      changeEvent.target.value,
                                    )
                                  }
                                  placeholder="예: Fidesz"
                                />
                              </SubField>
                            </SubFieldPair>

                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                              }}
                            >
                              <QuickCreateBtn
                                type="button"
                                disabled={quickCreatePartyMutation.isPending}
                                onClick={() =>
                                  quickCreatePartyMutation.mutate()
                                }
                              >
                                {quickCreatePartyMutation.isPending
                                  ? '생성 중...'
                                  : '정당 생성 후 선택'}
                              </QuickCreateBtn>
                            </div>
                          </QuickPersonCard>
                        ) : (
                          <PartySelectRow>
                            <SearchableSelect
                              options={partySelectOptions}
                              value={partyId}
                              onChange={(nextPartyVal) => {
                                userTouchedPartyRef.current = true
                                setAutoSuggestedPartyLabel(null)
                                setPartyId(nextPartyVal)
                                if (nextPartyVal && !isEditing) {
                                  setAutoLinkRulingParty(true)
                                }
                              }}
                              placeholder="무소속 / 정당 미지정"
                              searchPlaceholder="정당명 또는 약칭 검색…"
                              ariaLabel="집권 · 소속 정당 선택"
                              emptyMessage="등록된 정당이 없습니다"
                              noMatchMessage="일치하는 정당이 없습니다"
                            />
                            <KitAddButton
                              type="button"
                              onClick={() => setShowQuickCreateParty(true)}
                            >
                              <FiPlus size={13} />새 정당
                            </KitAddButton>
                          </PartySelectRow>
                        )}

                        {autoSuggestedPartyLabel && partyId ? (
                          <FieldHint>
                            수반 당적(<strong>{autoSuggestedPartyLabel}</strong>
                            )에서 자동 선택됨
                          </FieldHint>
                        ) : null}
                      </FieldControl>
                    </FieldRow>
                      </>
                    ) : null}
                  </FormGroup>

                </SplitColumnRight>
              </SplitColumnsGrid>
            </LabeledRowsWrap>
          </CabinetModalFormScroll>


          <PersonRegisterModalStickyFooter>
            <FooterHint $warning={missingFieldItems.length > 0}>
              {!isEditing && batchSavedCount > 0 ? (
                <BatchSavedBadge role="status">
                  <BatchSavedDot aria-hidden="true" />
                  연속 {batchSavedCount}건 등록됨
                </BatchSavedBadge>
              ) : null}
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
                  <FooterJumpArrow aria-hidden="true">→</FooterJumpArrow>
                </FooterJumpButton>
              ) : (
                <FooterReadyGroup>
                  <FooterReadyBadge>
                    {isEditing ? '수정 준비 완료' : '등록 준비 완료'}
                  </FooterReadyBadge>
                </FooterReadyGroup>
              )}
            </FooterHint>

            <FooterActions>
              <PersonRegisterModalCancelBtn
                type="button"
                disabled={saveCabinetMutation.isPending}
                onClick={() => {
                  void requestClose()
                }}
              >
                취소
              </PersonRegisterModalCancelBtn>
              {!isEditing ? (
                <PersonRegisterModalCancelBtn
                  type="button"
                  disabled={saveCabinetMutation.isPending}
                  title="저장 후 창을 닫지 않고 이어서 다음 내각·행정부를 바로 등록합니다 (단축키: ⌘/Ctrl + Shift + Enter)"
                  onClick={() => handleSubmitWithOption(true)}
                >
                  등록 후 계속
                </PersonRegisterModalCancelBtn>
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

const CabinetModalFormScroll = styled(PersonRegisterModalFormScroll)<{
  $layoutMode: 'split' | 'single'
}>`
  overflow-x: hidden;

  ${({ $layoutMode }) =>
    $layoutMode === 'split'
      ? `
    @media (min-width: 980px) {
      overflow-y: hidden;
      padding: 20px 28px;
    }
  `
      : ''}
`

const DateRangeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(226px, 1fr));
  gap: 12px 16px;
  min-width: 0;
`

const SplitColumnsGrid = styled.div<{ $layoutMode: 'split' | 'single' }>`
  display: grid;
  grid-template-columns: ${({ $layoutMode }) =>
    $layoutMode === 'split'
      ? 'minmax(0, 1fr) minmax(0, 1fr)'
      : 'minmax(0, 1fr)'};
  gap: ${({ $layoutMode }) => ($layoutMode === 'split' ? '0' : '26px')};
  align-items: start;
  width: 100%;
  min-width: 0;
  overflow-x: hidden;

  ${({ $layoutMode }) =>
    $layoutMode === 'split'
      ? `
    @media (min-width: 980px) {
      ${FieldRow} {
        grid-template-columns: 112px minmax(0, 1fr);
        gap: 14px;
        padding: 12px 0;
      }

      ${FormGroup} + ${FormGroup} {
        margin-top: 22px;
        padding-top: 4px;
      }
    }
  `
      : ''}

  @media (max-width: 979px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
  }
`

const splitPaneScrollStyles = ({
  $layoutMode,
  theme,
}: {
  $layoutMode: 'split' | 'single'
  theme: DefaultTheme
}) =>
  $layoutMode === 'split'
    ? `
  min-width: 0;
  overflow-x: hidden;

  @media (min-width: 980px) {
    max-height: calc(88vh - 160px);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-bottom: 40px;

    &::-webkit-scrollbar {
      width: 4px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    &::-webkit-scrollbar-thumb {
      background: ${theme.colors.border.default};
      border-radius: 2px;
    }
  }
`
    : `
  min-width: 0;
  overflow-x: hidden;

  ${FormGroup} + ${FormGroup} {
    margin-top: 26px;
  }
`

const SplitColumnLeft = styled.div<{ $layoutMode: 'split' | 'single' }>`
  ${splitPaneScrollStyles}

  ${({ $layoutMode }) =>
    $layoutMode === 'split'
      ? `
    @media (min-width: 980px) {
      padding-left: 2px;
      padding-right: 26px;
    }
  `
      : ''}
`

const SplitColumnRight = styled.div<{ $layoutMode: 'split' | 'single' }>`
  ${splitPaneScrollStyles}

  ${({ $layoutMode, theme }) =>
    $layoutMode === 'split'
      ? `
    @media (min-width: 980px) {
      padding-left: 26px;
      padding-right: 2px;
      border-left: 1px solid ${theme.colors.border.light};
    }
  `
      : ''}
`

const HeaderRightBar = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  margin-right: 2px;
`

const HeaderPolityBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 220px;
  height: 27px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  background: ${({ theme }) => kitC(theme).section};
  color: ${({ theme }) => kitC(theme).textSecondary};
  font-size: 11.5px;
  font-weight: 600;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.primary};
  }

  @media (max-width: 560px) {
    display: none;
  }
`

const EntryModeHeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
`

const EntryChipsWrap = styled.div`
  flex: 1 1 auto;
  min-width: 0;
`

const InlineMoreIconBtn = styled.button<{ $open: boolean; $tall?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: ${({ $tall }) => ($tall ? '40px' : '34px')};
  height: ${({ $tall }) => ($tall ? '40px' : '34px')};
  padding: 0;
  border-radius: 8px;
  border: 1px solid
    ${({ $open, theme }) =>
      $open ? kitC(theme).focus : kitC(theme).border};
  background: ${({ $open, theme }) =>
    $open
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.2)'
        : 'rgba(99, 102, 241, 0.08)'
      : kitC(theme).content};
  color: ${({ $open, theme }) =>
    $open
      ? theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4f46e5'
      : kitC(theme).textSecondary};
  cursor: pointer;
  transition:
    border-color 0.14s ease,
    color 0.14s ease,
    background-color 0.14s ease;

  &:hover {
    border-color: ${({ theme }) => kitC(theme).focus};
    color: ${({ theme }) => kitC(theme).textPrimary};
  }
`

const QuietModeCaption = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 5px;
  font-size: 12px;
  line-height: 1.45;
  color: ${({ theme }) => kitC(theme).textMuted};

  strong {
    font-weight: 600;
    color: ${({ theme }) => kitC(theme).textSecondary};
  }

  .sep {
    opacity: 0.55;
  }
`

const RoleInputBar = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
`

const ExtraHeaderSub = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 직책 칸 아래 — 예전 ⋯ 메뉴에 숨던 행정부 분류·군주 직위를 바로 펼친 줄 */
const RoleExtrasBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 4px;

  .extras-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .extras-label {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    font-size: 11.5px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  .extras-sub {
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const ExtraFilledBadge = styled.span`
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#c7d2fe' : theme.colors.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.2)'
      : 'rgba(99, 102, 241, 0.1)'};
`

const ModeFullGuidePanel = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  border-radius: 10px;
  background: ${({ theme }) => kitC(theme).content};
`

const ModeGuideTopCaption = styled.div`
  padding: 7px 12px;
  border-bottom: 1px solid ${({ theme }) => kitC(theme).border};
  background: ${({ theme }) => kitC(theme).section};
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => kitC(theme).textSecondary};
`

const ModeGuideOptionBtn = styled.button<{ $selected: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
  padding: 9px 12px;
  border: none;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(15, 23, 42, 0.05)'};
  background: ${({ $selected, theme }) =>
    $selected
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.14)'
        : 'rgba(99, 102, 241, 0.06)'
      : 'transparent'};
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition: background 0.13s ease;

  &:hover {
    background: ${({ $selected, theme }) =>
      $selected
        ? theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.18)'
          : 'rgba(99, 102, 241, 0.09)'
        : kitC(theme).section};
  }

  .guide-opt-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .guide-opt-title {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    color: ${({ $selected, theme }) =>
      $selected
        ? theme.mode === 'dark'
          ? '#a5b4fc'
          : '#4f46e5'
        : kitC(theme).textSecondary};

    strong {
      font-size: 12.5px;
      font-weight: 700;
      color: ${({ theme }) => kitC(theme).textPrimary};
    }

    .sub-badge {
      padding: 1px 6px;
      border-radius: 999px;
      font-size: 10.5px;
      font-weight: 600;
      color: ${({ theme }) => kitC(theme).textMuted};
      background: ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.07)'
          : 'rgba(15, 23, 42, 0.05)'};
    }
  }

  .selected-pill {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 7px;
    border-radius: 999px;
    font-size: 10.5px;
    font-weight: 700;
    flex-shrink: 0;
    color: ${({ theme }) =>
      theme.mode === 'dark' ? '#c7d2fe' : '#4338ca'};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.24)'
        : 'rgba(99, 102, 241, 0.12)'};
  }

  .guide-opt-criteria {
    font-size: 12px;
    line-height: 1.44;
    color: ${({ theme }) => kitC(theme).textSecondary};
  }

  .guide-opt-ex {
    font-size: 11px;
    line-height: 1.4;
    color: ${({ theme }) => kitC(theme).textMuted};
  }
`

const ModeBoundaryTip = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 12px;
  border-top: 1px solid ${({ theme }) => kitC(theme).border};
  background: ${({ theme }) => kitC(theme).section};
  font-size: 11.5px;
  line-height: 1.45;
  color: ${({ theme }) => kitC(theme).textSecondary};

  .tip-tag {
    padding: 1px 7px;
    border-radius: 999px;
    font-size: 10.5px;
    font-weight: 700;
    flex-shrink: 0;
    color: ${({ theme }) =>
      theme.mode === 'dark' ? '#93c5fd' : '#1d4ed8'};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(59, 130, 246, 0.18)'
        : 'rgba(59, 130, 246, 0.1)'};
  }

  strong {
    font-weight: 700;
    color: ${({ theme }) => kitC(theme).textPrimary};
  }
`

const BatchSavedBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#6ee7b7' : '#047857')};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(16, 185, 129, 0.14)'
      : 'rgba(16, 185, 129, 0.1)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(16, 185, 129, 0.28)'
        : 'rgba(16, 185, 129, 0.22)'};
`

const BatchSavedDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
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

const DurationPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  width: fit-content;
  margin-top: 6px;
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
  height: 40px;
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

const PresetChipWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const RolePresetChip = styled.button<{ $active: boolean }>`
  padding: 4px 11px;
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
  transition:
    border-color 0.14s ease,
    background-color 0.14s ease,
    color 0.14s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const BranchPillGroup = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px;
  padding: 3px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => kitC(theme).section};
`

const BranchPillBtn = styled.button<{ $active: boolean }>`
  height: 28px;
  padding: 0 8px;
  border: none;
  border-radius: 6px;
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : '#ffffff'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  box-shadow: ${({ $active, theme }) =>
    $active && theme.mode !== 'dark'
      ? '0 1px 2px rgba(15, 23, 42, 0.08)'
      : 'none'};
`

const AdornedNumberBox = styled.div`
  display: flex;
  align-items: center;
  height: 40px;
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
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.primary};
    outline: none;
    appearance: textfield;
    -moz-appearance: textfield;

    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  }

  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff'};
  }
`

const NativeSelect = styled.select`
  width: 100%;
  height: 40px;
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

const PartySelectRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;

  ${KitAddButton} {
    height: 40px;
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`
