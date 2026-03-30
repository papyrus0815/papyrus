/**
 * 행정부(역대 내각) — 행정조직 탭 내 "행정부" 서브탭에서 표시.
 * 수반 재임별 행정부 등록·조회, 각료 추가.
 * 정권 선택 시 아래에 중앙부처 스타일 그리드로 해당 정권의 부처별 각료 표시(전자: 카테고리만, 사용자 등록 부처).
 */
import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { createPortal } from 'react-dom'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import {
  FiCalendar,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiEdit2,
  FiFileText,
  FiGlobe,
  FiInfo,
  FiLayers,
  FiLink,
  FiMapPin,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import {
  EmptyStateFill,
  EmptyStateSpotlight,
} from '@/shared/ui/empty-state/empty-state'
import { administrationDepartmentApi } from '@/shared/api/administration-department'
import { type AdministrativeDivision, cityApi } from '@/shared/api/city'
import { getAllCountries } from '@/shared/api/countries'
import type { CountryResponseDto } from '@/shared/api/countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import {
  type CabinetListItemDto,
  type GovernmentCabinetTenureItem,
  personCareerApi,
} from '@/shared/api/person-career'
import { type PersonResponseDto, getAllPersons } from '@/shared/api/persons'
import { getPersonDetailById } from '@/shared/api/persons-detail'
import {
  TREATY_PARTICIPATION_LABELS,
  TREATY_TYPE_LABELS,
  type TreatyDto,
  type TreatyParticipationType,
  type TreatyType,
  treatyApi,
} from '@/shared/api/treaty'
import { getUploadImageUrl, uploadImage } from '@/shared/api/upload'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import {
  useRichTextProseClick,
  useRichTextTooltipEscape,
  type RichTextDynastyTooltipState,
  type RichTextTermTooltipState,
} from '@/shared/hooks/use-rich-text-prose-click'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import { administrationDepartmentsByCountryQueryKey } from '@/shared/lib/ministry-department/ministry-department-query-keys'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import {
  calcAgeAtTenure,
  formatPersonLifespan,
} from '@/shared/lib/tenure-person-utils'
import { getCabinetsSectionPalette } from '@/shared/styles/country-detail-palette'
import { useThemeStore } from '@/shared/styles/theme.store'
import { Z_INDEX } from '@/shared/styles/z-index'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog/confirm-dialog'
import { CountrySelectModal } from '@/shared/ui/country-select-modal/country-select-modal'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import { DateRangeField } from '@/shared/ui/form-fields/date-range-field'
import { PersonSelectField } from '@/shared/ui/form-fields/person-select-field'
import {
  ModalBody,
  ModalBox,
  ModalCloseButton,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
} from '@/shared/ui/modal/modal.styles'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import {
  DateFieldBtn,
  DateFieldsRow,
  FieldControl,
  FieldHint,
  FieldLabel,
  FieldRow,
  FormRows,
  FormSectionInner,
  Input as RegisterInput,
  Required,
  SubmitButton,
  TabButton,
  TabNavigation,
  Textarea,
} from '@/shared/ui/register-form-layout'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'
import { SelectModal } from '@/shared/ui/select-modal/select-modal'
import { SidePanel } from '@/shared/ui/side-panel'
import { PersonDetailPanel } from '@/widgets/person/person-detail-panel/person-detail-panel'

import { CabinetDetailChrome } from './cabinet-detail-chrome.widget'
import { CabinetMinisterCards } from './cabinet-minister-cards.widget'
import { CabinetPoliticalPartiesBlock } from './cabinet-political-parties-block.widget'
import { SubsectionAddBtn } from './country-politics-tab.styles'
import {
  TlItem,
  cabinetTimelineCellAriaLabel,
  formatCabinetTermBadge,
} from './cabinets-section-timeline'
import {
  HEAD_POSITION_TYPES,
  CABINET_SECTION_MAIN as MAIN,
  CABINET_SECTION_MAIN_HOVER as MAIN_HOVER,
  MINISTER_POSITION_TYPES,
  TL_BUBBLE_W,
  TL_COL_PAD_X,
  TL_GRID_GAP_X,
  TL_LIST_PAD_LEFT,
  TL_NODE_CENTER_X,
  TL_NODE_EDGE_PAD,
  TL_ROW_H,
  TL_THUMB,
  TL_VERT_SEG_H,
  TL_YEAR_BUBBLE_SHIFT_X,
} from './cabinets-section.constants'
import {
  APPOINTMENT_METHOD_LABEL,
  END_REASON_LABEL,
  buildCabinetTerritoryLegendEntries,
  buildCabinetTerritoryOrdinalMap,
  calcAgeAtEndTenure,
  calcTenureDuration,
  formatDate,
  getHeadTenureTerritoryLabel,
  getPersonName,
  getTimelineBubbleTextColors,
  paletteForCabinetListItem,
  stripHtmlToPlain,
} from './cabinets-section.helpers'
import * as CabS from './cabinets-section.styled'
import { RegisterCabinetModal } from './register-cabinet-modal'
import { TreatyLinkModal } from './treaty-link-modal'

export interface CabinetsSectionProps {
  country: UnifiedCountry
  /** 부처 등록 시 중앙부처 탭으로 전환하고 해당 카테고리로 폼 열기 */
  onOpenMinistriesTab?: (categoryId?: string) => void
}

export function CabinetsSection({
  country,
  onOpenMinistriesTab,
}: CabinetsSectionProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'
  const C = getCabinetsSectionPalette(isDark)

  const isHistorical = country.type === 'historical'
  const countryId = !isHistorical ? country.id : undefined
  const historicalCountryId = isHistorical ? country.id : undefined

  /** 선택한 정권 — 위에 행정부처(중앙부처) 그리드로 해당 정권의 부처별 각료 표시 */
  const [selectedCabinetId, setSelectedCabinetId] = useState<string | null>(
    null,
  )
  /** 뷰 전환: list(행정부 그리드) / detail(행정부 상세) */
  const [cabinetView, setCabinetView] = useState<'list' | 'detail'>('list')
  const [addMinisterCabinet, setAddMinisterCabinet] = useState<any | null>(null)
  const [personSelectOpen, setPersonSelectOpen] = useState(false)
  const [ministerFormPositionDefId, setMinisterFormPositionDefId] = useState<
    string | null
  >(null)
  const [ministerFormTitle, setMinisterFormTitle] = useState('')
  const [ministerFormStartDate, setMinisterFormStartDate] = useState('')
  const [ministerFormEndDate, setMinisterFormEndDate] = useState('')
  const [ministerFormTermNumber, setMinisterFormTermNumber] = useState('')
  const [ministerFormDeptId, setMinisterFormDeptId] = useState<string | null>(
    null,
  )
  const [ministerFormSubmitting, setMinisterFormSubmitting] = useState(false)
  const [personPickerOpen, setPersonPickerOpen] = useState(false)
  const [selectedPersonIdForAdd, setSelectedPersonIdForAdd] = useState<
    string | null
  >(null)
  const [registerCabinetModalOpen, setRegisterCabinetModalOpen] =
    useState(false)
  const [registerCabinetSubmitting, setRegisterCabinetSubmitting] =
    useState(false)
  /** 'select' = 기존 수반 재임 선택, 'new' = 새 수반 등록(재임+행정부 한 번에) */
  const [registerFlow, setRegisterFlow] = useState<'select' | 'new'>('select')
  /** 현대국가에서 등록 시 하위 역사국가 선택 (null = 현대국가 자신에 등록) */
  const [
    registerTargetHistoricalCountryId,
    setRegisterTargetHistoricalCountryId,
  ] = useState<string | null>(null)
  const [newHeadPersonId, setNewHeadPersonId] = useState<string | null>(null)
  const [newHeadPositionDefId, setNewHeadPositionDefId] = useState<
    string | null
  >(null)
  const [newHeadStartDate, setNewHeadStartDate] = useState('')
  const [newHeadEndDate, setNewHeadEndDate] = useState('')
  /** 새 수반 등록 시 대수(제 N대). 빈 값이면 미전송, 숫자면 termNumber로 전송. 중간 등록 가능. */
  const [newHeadTermNumber, setNewHeadTermNumber] = useState('')
  /** 새 수반 등록 시 기수(1기, 2기). 같은 대수 내 복수 임기 구분. */
  const [newHeadSubTermNumber, setNewHeadSubTermNumber] = useState('')
  const [newCabinetName, setNewCabinetName] = useState('')
  const [newHeadAppointmentMethod, setNewHeadAppointmentMethod] =
    useState<string>('')
  const [newHeadEndReason, setNewHeadEndReason] = useState<string>('')
  const [newHeadEndReasonDetail, setNewHeadEndReasonDetail] = useState('')
  const [newHeadNotes, setNewHeadNotes] = useState('')
  const [deletingCabinetId, setDeletingCabinetId] = useState<string | null>(
    null,
  )
  /** 각료/수반 썸네일 클릭 시 인물 상세 모달 (포스트 상세와 동일한 mentionPersonId 패턴) */
  const [mentionPersonId, setMentionPersonId] = useState<string | null>(null)
  const [historyProseTermTooltip, setHistoryProseTermTooltip] =
    useState<RichTextTermTooltipState | null>(null)
  const [historyProseDynastyTooltip, setHistoryProseDynastyTooltip] =
    useState<RichTextDynastyTooltipState | null>(null)
  const { data: mentionPerson } = useQuery({
    queryKey: ['person-detail', mentionPersonId],
    queryFn: () => getPersonDetailById(mentionPersonId!),
    enabled: !!mentionPersonId,
  })
  const mentionPersonName = mentionPerson
    ? getPersonDisplayName(mentionPerson)
    : ''

  /** 좁은 화면에서 타임라인 열 수 (접근성·가독성) */
  const [timelineColumnCount, setTimelineColumnCount] = useState(4)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 900px)')
    const apply = () => setTimelineColumnCount(mq.matches ? 2 : 4)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  /** 히스토리 본문 클릭 — 멘션/엔티티/용어·가문 툴팁 (인물·정당·사건·국가 등) 공통 처리 */
  const { handleProseClick: handleHistoryProseClick } = useRichTextProseClick({
    navigate,
    onPersonClick: setMentionPersonId,
    setTermTooltip: setHistoryProseTermTooltip,
    setDynastyTooltip: setHistoryProseDynastyTooltip,
  })

  useRichTextTooltipEscape(
    !!historyProseTermTooltip,
    !!historyProseDynastyTooltip,
    () => setHistoryProseTermTooltip(null),
    () => setHistoryProseDynastyTooltip(null),
  )

  /** 행정부 수정 모달 (이름 + 수반 재임 대수/직위/취임·퇴임) */
  const [editingCabinet, setEditingCabinet] = useState<any | null>(null)
  const [editingCabinetName, setEditingCabinetName] = useState('')
  const [editingTermNumber, setEditingTermNumber] = useState('')
  const [editingSubTermNumber, setEditingSubTermNumber] = useState('')
  const [editingPositionDefId, setEditingPositionDefId] = useState<
    string | null
  >(null)
  const [editingStartDate, setEditingStartDate] = useState('')
  const [editingEndDate, setEditingEndDate] = useState('')
  const [editingAppointmentMethod, setEditingAppointmentMethod] =
    useState<string>('')
  const [editingEndReason, setEditingEndReason] = useState<string>('')
  const [editingEndReasonDetail, setEditingEndReasonDetail] = useState('')
  const [editingNotes, setEditingNotes] = useState('')
  /** 취임/퇴임 인라인 편집 모드 (수반 상세 뷰에서 그자리 수정) */
  const [editingTenureInfo, setEditingTenureInfo] = useState<{
    cabinetId: string
    mode: 'appointment' | 'end'
  } | null>(null)
  const [tenureInfoSubmitting, setTenureInfoSubmitting] = useState(false)
  /** 행정부 수정: 수반 재임의 소속 국가 변경 (현대국가인 경우 하위 역사국가 선택 가능) */
  const [
    editingTargetHistoricalCountryId,
    setEditingTargetHistoricalCountryId,
  ] = useState<string | null>(null)
  /** editingTargetHistoricalCountryId가 '현대국가 자신'인지 '역사국가'인지 — 'modern' | 'historical' */
  const [editingTargetType, setEditingTargetType] = useState<
    'modern' | 'historical'
  >('modern')
  const [editStartDatePickerOpen, setEditStartDatePickerOpen] = useState(false)
  const [editEndDatePickerOpen, setEditEndDatePickerOpen] = useState(false)
  const [updatingCabinetId, setUpdatingCabinetId] = useState<string | null>(
    null,
  )
  const [historyTargetTenureId, setHistoryTargetTenureId] = useState<
    string | null
  >(null)
  const [historyTitle, setHistoryTitle] = useState('')
  const [historyDescription, setHistoryDescription] = useState('')
  const [historyStartDate, setHistoryStartDate] = useState('')
  const [historyEndDate, setHistoryEndDate] = useState('')
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null)
  const [historySubmitting, setHistorySubmitting] = useState(false)
  const [cabinetSearchQuery, setCabinetSearchQuery] = useState('')
  /** 국가 필터: '' = 전체, countryId = 현대국가, historicalCountryId = 하위 역사국가 */
  const [cabinetCountryFilter, setCabinetCountryFilter] = useState<string>('')
  const [ministerSearchQuery, setMinisterSearchQuery] = useState('')
  const [selectedMinisterId, setSelectedMinisterId] = useState<string | null>(
    null,
  )
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(
    null,
  )
  /** 행정부 상세(수반) 뷰 — 재임 히스토리 목록만 상세로 전환할 때 사용 */
  const [selectedHeadHistoryId, setSelectedHeadHistoryId] = useState<
    string | null
  >(null)
  const [editingHistoryContent, setEditingHistoryContent] = useState(false)
  const [historyDraftContent, setHistoryDraftContent] = useState('')
  const [historyContentSaving, setHistoryContentSaving] = useState(false)
  const [editingHistoryMeta, setEditingHistoryMeta] = useState(false)
  const [historyMetaTitle, setHistoryMetaTitle] = useState('')
  const [historyMetaStartDate, setHistoryMetaStartDate] = useState('')
  const [historyMetaEndDate, setHistoryMetaEndDate] = useState('')
  const [historyMetaSaving, setHistoryMetaSaving] = useState(false)

  // ── 조약 섹션 state ──
  const [cabinetTreaties, setCabinetTreaties] = useState<TreatyDto[]>([])
  const [loadingCabinetTreaties, setLoadingCabinetTreaties] = useState(false)
  const [selectedTreatyId, setSelectedTreatyId] = useState<string | null>(null)
  const [showTreatyLinkModal, setShowTreatyLinkModal] = useState(false)

  const cabDetailBackBtnRef = useRef<HTMLButtonElement>(null)
  const cabinetViewPrevRef = useRef<'list' | 'detail'>(cabinetView)

  const { data: cabinets = [], isLoading: loadingCabinets } = useQuery<
    CabinetListItemDto[]
  >({
    queryKey: ['cabinets-by-country', countryId, historicalCountryId],
    queryFn: () =>
      personCareerApi.getCabinets({
        countryId: countryId || undefined,
        historicalCountryId: historicalCountryId || undefined,
      }),
    enabled: !!countryId || !!historicalCountryId,
  })

  /** 행정부 리스트: 수반 취임일 기준 시간순(과거→현재) 정렬 */
  const sortedCabinets = useMemo(() => {
    const list = [...cabinets]
    return list.sort((a, b) => {
      const dateA = a.headTenure?.startDate
        ? new Date(a.headTenure.startDate).getTime()
        : 0
      const dateB = b.headTenure?.startDate
        ? new Date(b.headTenure.startDate).getTime()
        : 0
      return dateA - dateB
    })
  }, [cabinets])

  const filteredCabinets = useMemo(() => {
    let list = sortedCabinets

    // 국가 필터
    if (cabinetCountryFilter) {
      list = list.filter((c: any) => {
        const head = c.headTenure
        if (cabinetCountryFilter === countryId) {
          return head?.countryId === countryId && !head?.historicalCountryId
        }
        return head?.historicalCountryId === cabinetCountryFilter
      })
    }

    const q = cabinetSearchQuery.trim().toLowerCase()
    if (!q) return list
    return list.filter((c: any) => {
      const head = c.headTenure
      const personName = head?.person ? getPersonName(head.person) : ''
      const posTitle =
        head?.positionDefinition?.title ?? head?.title ?? c.name ?? ''
      const start = head?.startDate
        ? new Date(head.startDate).getFullYear().toString()
        : ''
      const end = head?.endDate
        ? new Date(head.endDate).getFullYear().toString()
        : '현재'
      const territory = getHeadTenureTerritoryLabel(head, country.name)
      const cabName = typeof c.name === 'string' ? c.name : ''
      return [personName, posTitle, start, end, territory, cabName].some((v) =>
        String(v).toLowerCase().includes(q),
      )
    })
  }, [
    sortedCabinets,
    cabinetSearchQuery,
    cabinetCountryFilter,
    countryId,
    country.name,
  ])

  /** 목록에 등장하는 소속마다 서로 다른 강조색(ordinal) — 같은 countryId만 있어도 이름 키로 분리 */
  const cabinetTerritoryOrdinalMap = useMemo(
    () => buildCabinetTerritoryOrdinalMap(filteredCabinets),
    [filteredCabinets],
  )

  const cabinetTerritoryLegendEntries = useMemo(
    () =>
      buildCabinetTerritoryLegendEntries(
        filteredCabinets,
        country.name,
        cabinetTerritoryOrdinalMap,
        country.type === 'modern'
          ? {
              modernCountryId: country.id,
              historicalCountries: country.historicalCountries,
            }
          : {
              pageHistoricalCountry: {
                id: country.id,
                startYear: country.startYear ?? null,
                startEra: country.startEra ?? null,
                startMonth: country.startMonth ?? null,
                startDay: country.startDay ?? null,
              },
            },
      ),
    [filteredCabinets, country.name, cabinetTerritoryOrdinalMap, country],
  )

  /** 현대국가 + 역사국가 하위가 있을 때만 "전체" 목록에서 소속 국가명 표시 */
  const showCabinetTerritoryLabels = useMemo(
    () =>
      country.type === 'modern' &&
      cabinetCountryFilter === '' &&
      Array.isArray(country.historicalCountries) &&
      country.historicalCountries.length > 0,
    [country, cabinetCountryFilter],
  )

  /** 타임라인 그리드 행(열 수만큼 슬라이스) — 한 번만 계산 */
  const cabinetTimelineRows = useMemo(() => {
    const cols = timelineColumnCount
    const list = filteredCabinets
    const rows: any[][] = []
    for (let i = 0; i < list.length; i += cols) {
      rows.push(list.slice(i, i + cols))
    }
    return rows
  }, [filteredCabinets, timelineColumnCount])

  /** 요약 헤더 연도 범위 */
  const cabinetTimelineYearRange = useMemo(() => {
    const years = filteredCabinets.flatMap((c) => {
      const s = c.headTenure?.startDate
        ? new Date(c.headTenure.startDate).getFullYear()
        : null
      return s != null ? [s] : []
    })
    if (years.length === 0)
      return { minY: null as number | null, maxY: null as number | null }
    return { minY: Math.min(...years), maxY: Math.max(...years) }
  }, [filteredCabinets])

  const isMinisterMatched = (t: GovernmentCabinetTenureItem) => {
    const q = ministerSearchQuery.trim().toLowerCase()
    if (!q) return true
    const personName = getPersonName(t.person)
    const title = t.positionDefinition?.title ?? t.title ?? ''
    const start = t.startDate ? formatDate(t.startDate) : ''
    const end = t.endDate ? formatDate(t.endDate) : '현재'
    return [personName, title, start, end].some((v) =>
      String(v).toLowerCase().includes(q),
    )
  }

  /** 각료 선택 모달: 인물 테이블 전체에서 선택 (재임 여부 무관) */
  const { data: personsForMinisterSelect = [] } = useQuery({
    queryKey: ['persons', 'all-for-minister'],
    queryFn: () => getAllPersons(),
    enabled: personSelectOpen,
  })

  /** 선택한 정권의 각료 — 부처 그리드에 채우기 위함 */
  const effectiveCountryIdForDept =
    country.type === 'historical' ? undefined : country.id
  const {
    data: selectedCabinetMinisters = [],
    isPending: loadingCabinetMinisters,
  } = useQuery({
    queryKey: ['cabinet-tenures', selectedCabinetId],
    queryFn: () =>
      selectedCabinetId
        ? personCareerApi.getTenuresByCabinetId(selectedCabinetId)
        : Promise.resolve([]),
    enabled: !!selectedCabinetId,
  })
  /** 카테고리·부처는 탭 진입 시 미리 로드 — 정권 클릭 시 곧바로 중앙부처 그리드 표시 */
  const { data: ministriesForCabinet = [] } = useQuery({
    queryKey: administrationDepartmentsByCountryQueryKey(
      effectiveCountryIdForDept,
    ),
    queryFn: () =>
      effectiveCountryIdForDept
        ? administrationDepartmentApi.getByCountryId(effectiveCountryIdForDept)
        : Promise.resolve([]),
    enabled: !!effectiveCountryIdForDept,
  })

  const { data: countryTenures = [] } = useQuery({
    queryKey: [
      'tenures-by-country-for-cabinet',
      countryId,
      historicalCountryId,
    ],
    queryFn: () =>
      personCareerApi.getTenuresByCountry({
        countryId: countryId || undefined,
        historicalCountryId: historicalCountryId || undefined,
      }),
    enabled: (!!countryId || !!historicalCountryId) && registerCabinetModalOpen,
  })

  const { data: positionDefinitions = [] } = useQuery({
    queryKey: ['position-definitions-cabinet', countryId, historicalCountryId],
    queryFn: () =>
      personCareerApi.getPositionDefinitions({
        countryId: countryId || undefined,
        historicalCountryId: historicalCountryId || undefined,
      }),
    enabled:
      (!!countryId || !!historicalCountryId) &&
      (registerCabinetModalOpen ||
        !!editingCabinet ||
        personSelectOpen ||
        !!addMinisterCabinet),
  })

  const { data: allPersons = [] } = useQuery({
    queryKey: ['persons', 'all'],
    queryFn: () => getAllPersons(),
    enabled: registerCabinetModalOpen && registerFlow === 'new',
  })

  const headPositionOptions = (positionDefinitions as any[]).filter((d: any) =>
    HEAD_POSITION_TYPES.has(d.positionType),
  )

  /** 각료 등록 모달용 직위 옵션 (각료/차관/기타만) */
  const ministerPositionOptions = useMemo(
    () =>
      (positionDefinitions as any[]).filter(
        (d: any) =>
          d.positionType && MINISTER_POSITION_TYPES.has(d.positionType),
      ),
    [positionDefinitions],
  )

  /** 부처 선택 시 해당 부처 카테고리의 직위만 필터링, 미선택 시 전체 */
  const filteredMinisterPositionOptions = useMemo(() => {
    if (!ministerFormDeptId) return ministerPositionOptions
    const dept = (ministriesForCabinet as any[]).find(
      (d: any) => d.id === ministerFormDeptId,
    )
    const catId = dept?.categoryId ?? null
    if (!catId) return ministerPositionOptions
    return ministerPositionOptions.filter((d: any) => d.categoryId === catId)
  }, [ministerPositionOptions, ministerFormDeptId, ministriesForCabinet])

  /** 각료 등록 모달에서 선택한 인물 (썸네일·이름 표시용) */
  const selectedMinisterPerson = useMemo(
    () =>
      (personsForMinisterSelect as any[]).find(
        (p: any) => p.id === selectedPersonIdForAdd,
      ),
    [personsForMinisterSelect, selectedPersonIdForAdd],
  )

  const resetHistoryForm = () => {
    setHistoryTitle('')
    setHistoryDescription('')
    setHistoryStartDate('')
    setHistoryEndDate('')
    setEditingHistoryId(null)
  }

  const closeHistoryModal = () => {
    setHistoryTargetTenureId(null)
    resetHistoryForm()
  }

  const openMinisterHistoryModal = (tenure: any, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setHistoryTargetTenureId(tenure.id)
    resetHistoryForm()
  }

  const startEditHistory = (achievement: any) => {
    setEditingHistoryId(achievement.id)
    setHistoryTitle(achievement.title ?? '')
    setHistoryDescription(achievement.description ?? '')
    setHistoryStartDate(
      achievement.startDate ? String(achievement.startDate).slice(0, 10) : '',
    )
    setHistoryEndDate(
      achievement.endDate ? String(achievement.endDate).slice(0, 10) : '',
    )
  }

  const saveHistoryDescription = async (
    tenureId: string,
    achievementId: string,
    description: string,
  ) => {
    setHistoryContentSaving(true)
    try {
      await personCareerApi.updateTenureAchievement(tenureId, achievementId, {
        description: description.trim() || undefined,
      })
      queryClient.invalidateQueries({
        queryKey: ['cabinets-by-country', countryId, historicalCountryId],
      })
      queryClient.invalidateQueries({
        queryKey: ['cabinet-tenures', selectedCabinetId],
      })
      setEditingHistoryContent(false)
      setHistoryDraftContent('')
      toast.success('저장되었습니다.')
    } catch {
      toast.error('저장에 실패했습니다.')
    } finally {
      setHistoryContentSaving(false)
    }
  }

  const saveHistoryMeta = async (tenureId: string, achievementId: string) => {
    if (!historyMetaTitle.trim()) {
      toast.error('제목을 입력해 주세요.')
      return
    }
    setHistoryMetaSaving(true)
    try {
      await personCareerApi.updateTenureAchievement(tenureId, achievementId, {
        title: historyMetaTitle.trim(),
        startDate: historyMetaStartDate || undefined,
        endDate: historyMetaEndDate || undefined,
      })
      queryClient.invalidateQueries({
        queryKey: ['cabinets-by-country', countryId, historicalCountryId],
      })
      queryClient.invalidateQueries({
        queryKey: ['cabinet-tenures', selectedCabinetId],
      })
      setEditingHistoryMeta(false)
      toast.success('저장되었습니다.')
    } catch {
      toast.error('저장에 실패했습니다.')
    } finally {
      setHistoryMetaSaving(false)
    }
  }

  const submitMinisterHistory = async () => {
    if (!historyTargetTenure) return
    if (!historyTitle.trim()) {
      toast.error('히스토리 제목을 입력해 주세요.')
      return
    }

    setHistorySubmitting(true)
    try {
      const payload = {
        title: historyTitle.trim(),
        description: historyDescription.trim() || undefined,
        startDate: historyStartDate || undefined,
        endDate: historyEndDate || undefined,
        showOnEventsPage: false,
      }

      if (editingHistoryId) {
        await personCareerApi.updateTenureAchievement(
          historyTargetTenure.id,
          editingHistoryId,
          payload,
        )
        toast.success('히스토리가 수정되었습니다.')
      } else {
        await personCareerApi.createTenureAchievement(
          historyTargetTenure.id,
          payload,
        )
        toast.success('히스토리가 등록되었습니다.')
      }

      queryClient.invalidateQueries({
        queryKey: ['cabinet-tenures', selectedCabinetId],
      })
      queryClient.invalidateQueries({
        queryKey: ['cabinets-by-country', countryId, historicalCountryId],
      })
      resetHistoryForm()
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ??
          e?.message ??
          '히스토리 저장에 실패했습니다.',
      )
    } finally {
      setHistorySubmitting(false)
    }
  }

  const deleteMinisterHistory = async (achievementId: string) => {
    if (!historyTargetTenure) return
    if (!window.confirm('이 히스토리를 삭제하시겠습니까?')) return

    setHistorySubmitting(true)
    try {
      await personCareerApi.deleteTenureAchievement(
        historyTargetTenure.id,
        achievementId,
      )
      if (editingHistoryId === achievementId) resetHistoryForm()
      queryClient.invalidateQueries({
        queryKey: ['cabinet-tenures', selectedCabinetId],
      })
      toast.success('히스토리가 삭제되었습니다.')
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ??
          e?.message ??
          '히스토리 삭제에 실패했습니다.',
      )
    } finally {
      setHistorySubmitting(false)
    }
  }

  const handleAddMinister = (cabinet: any) => {
    setAddMinisterCabinet(cabinet)
    setPersonSelectOpen(true)
  }

  /** 각료 상세 뷰에서 직접 히스토리 삭제 */
  const deleteMinisterHistoryDirect = async (
    tenureId: string,
    achievementId: string,
  ) => {
    if (!window.confirm('이 히스토리를 삭제하시겠습니까?')) return
    try {
      await personCareerApi.deleteTenureAchievement(tenureId, achievementId)
      if (selectedHistoryId === achievementId) {
        setSelectedHistoryId(null)
        setEditingHistoryContent(false)
      }
      if (selectedHeadHistoryId === achievementId) {
        setSelectedHeadHistoryId(null)
        setEditingHistoryContent(false)
      }
      queryClient.invalidateQueries({
        queryKey: ['cabinet-tenures', selectedCabinetId],
      })
      queryClient.invalidateQueries({
        queryKey: ['cabinets-by-country', countryId, historicalCountryId],
      })
      toast.success('히스토리가 삭제되었습니다.')
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ??
          e?.message ??
          '히스토리 삭제에 실패했습니다.',
      )
    }
  }

  /** 인물 선택 시 같은 모달 안에서 직위·날짜 입력 단계로 (사이드바 없음) */
  const handleSelectPersonForMinister = (personId: string) => {
    setSelectedPersonIdForAdd(personId)
  }

  const handleChangePersonForMinister = () => {
    setSelectedPersonIdForAdd(null)
    setMinisterFormPositionDefId(null)
    setMinisterFormTitle('')
    setMinisterFormStartDate('')
    setMinisterFormEndDate('')
    setMinisterFormTermNumber('')
    setMinisterFormDeptId(null)
  }

  const handleSubmitMinister = async () => {
    if (!addMinisterCabinet || !selectedPersonIdForAdd) return
    const isOther =
      ministerFormPositionDefId === '__OTHER__' || !ministerFormPositionDefId
    const def = !isOther
      ? (positionDefinitions as any[]).find(
          (d: any) => d.id === ministerFormPositionDefId,
        )
      : null
    const titleValue = def?.title ?? ministerFormTitle.trim()
    if (!titleValue) {
      toast.error('직위를 선택하거나 직접 입력해 주세요.')
      return
    }
    if (!ministerFormStartDate.trim()) {
      toast.error('취임일을 입력해 주세요.')
      return
    }
    setMinisterFormSubmitting(true)
    try {
      const termNumParsed = ministerFormTermNumber.trim()
        ? parseInt(ministerFormTermNumber.trim(), 10)
        : undefined
      const termNumber =
        termNumParsed != null &&
        !Number.isNaN(termNumParsed) &&
        termNumParsed >= 1
          ? termNumParsed
          : undefined

      await personCareerApi.addGovernmentPositionTenure({
        personId: selectedPersonIdForAdd,
        positionType: (def as any)?.positionType ?? 'OTHER',
        positionDefinitionId:
          def?.id && ministerFormPositionDefId !== '__OTHER__'
            ? (ministerFormPositionDefId ?? undefined)
            : undefined,
        title: titleValue,
        countryId: addMinisterCabinet.countryId ?? undefined,
        historicalCountryId:
          addMinisterCabinet.historicalCountryId ?? undefined,
        cabinetId: addMinisterCabinet.id,
        startDate: ministerFormStartDate,
        endDate: ministerFormEndDate || undefined,
        termNumber,
      })
      toast.success('각료가 등록되었습니다.')
      setPersonSelectOpen(false)
      setAddMinisterCabinet(null)
      queryClient.invalidateQueries({
        queryKey: ['cabinets-by-country', countryId, historicalCountryId],
      })
      queryClient.invalidateQueries({ queryKey: ['cabinet-tenures'] })
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ?? e?.message ?? '등록에 실패했습니다.',
      )
    } finally {
      setMinisterFormSubmitting(false)
    }
  }

  const handleCloseMinisterModal = () => {
    setPersonSelectOpen(false)
    setAddMinisterCabinet(null)
    setMinisterFormPositionDefId(null)
    setMinisterFormTitle('')
    setMinisterFormStartDate('')
    setMinisterFormEndDate('')
    setMinisterFormTermNumber('')
    setMinisterFormDeptId(null)
    setSelectedPersonIdForAdd(null)
  }

  const headTenureIdsWithCabinet = new Set(
    (cabinets as any[]).map((c: any) => c.headTenureId),
  )
  const headTenuresForRegister = (countryTenures as any[]).filter(
    (t: any) =>
      (t.positionType === 'HEAD_OF_STATE' ||
        t.positionType === 'HEAD_OF_GOVERNMENT') &&
      !headTenureIdsWithCabinet.has(t.id),
  )

  const handleRegisterCabinet = async (tenure: any) => {
    setRegisterCabinetSubmitting(true)
    try {
      await personCareerApi.createCabinet({ headTenureId: tenure.id })
      toast.success('행정부가 등록되었습니다.')
      setRegisterCabinetModalOpen(false)
      setRegisterFlow('select')
      queryClient.invalidateQueries({
        queryKey: ['cabinets-by-country', countryId, historicalCountryId],
      })
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ?? e?.message ?? '등록에 실패했습니다.'
      toast.error(msg)
    } finally {
      setRegisterCabinetSubmitting(false)
    }
  }

  const resetNewHeadForm = useCallback(() => {
    setRegisterTargetHistoricalCountryId(null)
    setNewHeadPersonId(null)
    setNewHeadPositionDefId(null)
    setNewHeadStartDate('')
    setNewHeadEndDate('')
    setNewHeadTermNumber('')
    setNewHeadSubTermNumber('')
    setNewCabinetName('')
    setNewHeadAppointmentMethod('')
    setNewHeadEndReason('')
    setNewHeadEndReasonDetail('')
    setNewHeadNotes('')
  }, [])

  /** 새 수반 재임 생성 후 행정부까지 한 번에 등록 */
  const handleRegisterNewHeadAndCabinet = async () => {
    if (!newHeadPersonId || !newHeadPositionDefId || !newHeadStartDate.trim()) {
      toast.error('인물, 직위, 취임일을 입력해주세요.')
      return
    }
    const def = headPositionOptions.find(
      (d: any) => d.id === newHeadPositionDefId,
    )
    if (!def) {
      toast.error('직위를 선택해주세요.')
      return
    }
    const termNumParsed = newHeadTermNumber.trim()
      ? parseInt(newHeadTermNumber.trim(), 10)
      : undefined
    const termNumber =
      termNumParsed != null &&
      !Number.isNaN(termNumParsed) &&
      termNumParsed >= 1
        ? termNumParsed
        : undefined
    const subTermNumParsed = newHeadSubTermNumber.trim()
      ? parseInt(newHeadSubTermNumber.trim(), 10)
      : undefined
    const subTermNumber =
      subTermNumParsed != null &&
      !Number.isNaN(subTermNumParsed) &&
      subTermNumParsed >= 1
        ? subTermNumParsed
        : undefined

    setRegisterCabinetSubmitting(true)
    try {
      // 현대국가에서 하위 역사국가를 선택한 경우 해당 historicalCountryId로 등록
      const effectiveCountryId =
        !isHistorical && !registerTargetHistoricalCountryId
          ? countryId
          : undefined
      const effectiveHistoricalCountryId =
        registerTargetHistoricalCountryId ?? historicalCountryId ?? undefined
      const tenure = await personCareerApi.addGovernmentPositionTenure({
        personId: newHeadPersonId,
        positionType: def.positionType,
        title: def.title,
        positionDefinitionId: def.id,
        countryId: effectiveCountryId,
        historicalCountryId: effectiveHistoricalCountryId,
        termNumber,
        subTermNumber,
        startDate: newHeadStartDate.trim(),
        endDate: newHeadEndDate.trim() || undefined,
        appointmentMethod: (newHeadAppointmentMethod || undefined) as any,
        endReason: (newHeadEndReason || undefined) as any,
        endReasonDetail: newHeadEndReasonDetail.trim() || undefined,
        notes: newHeadNotes.trim() || undefined,
      })
      const created = tenure as { id: string }
      await personCareerApi.createCabinet({
        headTenureId: created.id,
        name: newCabinetName.trim() || null,
      })
      toast.success('수반 재임과 행정부가 등록되었습니다.')
      setRegisterCabinetModalOpen(false)
      setRegisterFlow('select')
      resetNewHeadForm()
      queryClient.invalidateQueries({
        queryKey: ['cabinets-by-country', countryId, historicalCountryId],
      })
      queryClient.invalidateQueries({
        queryKey: [
          'tenures-by-country-for-cabinet',
          countryId,
          historicalCountryId,
        ],
      })
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ?? e?.message ?? '등록에 실패했습니다.'
      toast.error(msg)
    } finally {
      setRegisterCabinetSubmitting(false)
    }
  }

  const handleDeleteCabinet = async (
    cabinetId: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation()
    if (
      !window.confirm(
        '이 행정부와 수반 재임, 소속 각료 재임을 모두 삭제합니다. 계속할까요?',
      )
    )
      return
    setDeletingCabinetId(cabinetId)
    try {
      await personCareerApi.deleteCabinet(cabinetId)
      toast.success('행정부가 삭제되었습니다.')
      if (selectedCabinetId === cabinetId) {
        setSelectedCabinetId(null)
        setCabinetView('list')
      }
      queryClient.invalidateQueries({
        queryKey: ['cabinets-by-country', countryId, historicalCountryId],
      })
      queryClient.invalidateQueries({
        queryKey: [
          'tenures-by-country-for-cabinet',
          countryId,
          historicalCountryId,
        ],
      })
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ?? err?.message ?? '삭제에 실패했습니다.',
      )
    } finally {
      setDeletingCabinetId(null)
    }
  }

  const handleOpenEditCabinet = (c: any, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const head = c.headTenure
    setEditingCabinet(c)
    setEditingCabinetName(c.name ?? '')
    setEditingTermNumber(
      head?.termNumber != null ? String(head.termNumber) : '',
    )
    setEditingSubTermNumber(
      head?.subTermNumber != null ? String(head.subTermNumber) : '',
    )
    setEditingPositionDefId(
      head?.positionDefinitionId ?? head?.positionDefinition?.id ?? null,
    )
    setEditingStartDate(
      head?.startDate
        ? typeof head.startDate === 'string'
          ? head.startDate.slice(0, 10)
          : new Date(head.startDate).toISOString().slice(0, 10)
        : '',
    )
    setEditingEndDate(
      head?.endDate
        ? typeof head.endDate === 'string'
          ? head.endDate.slice(0, 10)
          : new Date(head.endDate).toISOString().slice(0, 10)
        : '',
    )
    setEditingAppointmentMethod(head?.appointmentMethod ?? '')
    setEditingEndReason(head?.endReason ?? '')
    setEditingEndReasonDetail(head?.endReasonDetail ?? '')
    setEditingNotes(head?.notes ?? '')
    // 수반 재임의 현재 소속 국가 초기화
    if (head?.historicalCountryId) {
      setEditingTargetType('historical')
      setEditingTargetHistoricalCountryId(head.historicalCountryId)
    } else {
      setEditingTargetType('modern')
      setEditingTargetHistoricalCountryId(null)
    }
  }

  const closeEditCabinetModal = () => {
    setEditingCabinet(null)
    setEditingCabinetName('')
    setEditingTermNumber('')
    setEditingSubTermNumber('')
    setEditingStartDate('')
    setEditingEndDate('')
    setEditingAppointmentMethod('')
    setEditingEndReason('')
    setEditingEndReasonDetail('')
    setEditingNotes('')
    setEditingTargetType('modern')
    setEditingTargetHistoricalCountryId(null)
  }

  const handleSaveTenureInfoInline = async (
    cabinetId: string,
    headTenureId: string,
  ) => {
    setTenureInfoSubmitting(true)
    const mode = editingTenureInfo?.mode
    try {
      await personCareerApi.updateGovernmentPositionTenure(headTenureId, {
        ...(mode === 'appointment'
          ? {
              appointmentMethod: (editingAppointmentMethod || undefined) as any,
              notes: editingNotes.trim() || undefined,
            }
          : {
              endReason: (editingEndReason || undefined) as any,
              endReasonDetail: editingEndReasonDetail.trim() || undefined,
            }),
      })
      toast.success('저장되었습니다.')
      setEditingTenureInfo(null)
      queryClient.invalidateQueries({
        queryKey: ['cabinets-by-country', countryId, historicalCountryId],
      })
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ?? err?.message ?? '저장에 실패했습니다.',
      )
    } finally {
      setTenureInfoSubmitting(false)
    }
  }

  const handleUpdateCabinet = async () => {
    if (!editingCabinet) return
    const cabinetId = editingCabinet.id
    const headTenureId = editingCabinet.headTenure?.id
    if (!headTenureId) {
      toast.error('수반 재임 정보가 없습니다.')
      return
    }
    setUpdatingCabinetId(cabinetId)
    try {
      const termNumParsed = editingTermNumber.trim()
        ? parseInt(editingTermNumber.trim(), 10)
        : undefined
      const termNumber =
        termNumParsed != null &&
        !Number.isNaN(termNumParsed) &&
        termNumParsed >= 1
          ? termNumParsed
          : undefined
      const subTermNumParsed = editingSubTermNumber.trim()
        ? parseInt(editingSubTermNumber.trim(), 10)
        : undefined
      const subTermNumber =
        subTermNumParsed != null &&
        !Number.isNaN(subTermNumParsed) &&
        subTermNumParsed >= 1
          ? subTermNumParsed
          : undefined

      await personCareerApi.updateCabinet(cabinetId, {
        name: editingCabinetName.trim() || null,
      })
      // 현대국가에서 하위 역사국가로/현대국가로 소속 변경
      const newCountryId =
        editingTargetType === 'modern' && !isHistorical ? countryId : null
      const newHistoricalCountryId =
        editingTargetType === 'historical'
          ? (editingTargetHistoricalCountryId ??
            historicalCountryId ??
            undefined)
          : isHistorical
            ? historicalCountryId
            : undefined
      await personCareerApi.updateGovernmentPositionTenure(headTenureId, {
        termNumber,
        subTermNumber,
        positionDefinitionId: editingPositionDefId || undefined,
        startDate: editingStartDate.trim() || undefined,
        endDate: editingEndDate.trim() || undefined,
        appointmentMethod: (editingAppointmentMethod || undefined) as any,
        endReason: (editingEndReason || undefined) as any,
        endReasonDetail: editingEndReasonDetail.trim() || undefined,
        notes: editingNotes.trim() || undefined,
        countryId: newCountryId ?? undefined,
        historicalCountryId: newHistoricalCountryId ?? undefined,
      })
      toast.success('행정부가 수정되었습니다.')
      closeEditCabinetModal()
      queryClient.invalidateQueries({
        queryKey: ['cabinets-by-country', countryId, historicalCountryId],
      })
      queryClient.invalidateQueries({
        queryKey: [
          'tenures-by-country-for-cabinet',
          countryId,
          historicalCountryId,
        ],
      })
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ?? err?.message ?? '수정에 실패했습니다.',
      )
    } finally {
      setUpdatingCabinetId(null)
    }
  }

  useEffect(() => {
    if (!personSelectOpen) {
      setSelectedPersonIdForAdd(null)
      setMinisterFormPositionDefId(null)
      setMinisterFormTitle('')
      setMinisterFormStartDate('')
      setMinisterFormEndDate('')
      setMinisterFormTermNumber('')
      setPersonPickerOpen(false)
    }
  }, [personSelectOpen])

  useEffect(() => {
    setMinisterSearchQuery('')
    setSelectedMinisterId(null)
    setSelectedHistoryId(null)
    setSelectedHeadHistoryId(null)
    setSelectedTreatyId(null)
  }, [selectedCabinetId])

  // 행정부 선택 시 조약 로드
  useEffect(() => {
    if (!selectedCabinetId) {
      setCabinetTreaties([])
      return
    }
    setLoadingCabinetTreaties(true)
    treatyApi
      .getAll({ cabinetId: selectedCabinetId })
      .then((r) => setCabinetTreaties(r.items))
      .catch(() => setCabinetTreaties([]))
      .finally(() => setLoadingCabinetTreaties(false))
  }, [selectedCabinetId])

  const selectedCabinet = (cabinets as any[]).find(
    (c: any) => c.id === selectedCabinetId,
  )
  const hasSelectedCabinet = Boolean(selectedCabinetId && selectedCabinet)

  useEffect(() => {
    let cancelRaf: (() => void) | undefined
    if (
      cabinetView === 'detail' &&
      cabinetViewPrevRef.current === 'list' &&
      hasSelectedCabinet
    ) {
      const id = requestAnimationFrame(() =>
        cabDetailBackBtnRef.current?.focus(),
      )
      cancelRaf = () => cancelAnimationFrame(id)
    }
    cabinetViewPrevRef.current = cabinetView
    return cancelRaf
  }, [cabinetView, hasSelectedCabinet])

  const historyTargetTenure =
    useMemo((): GovernmentCabinetTenureItem | null => {
      if (!historyTargetTenureId) return null
      const fromMinisters = selectedCabinetMinisters.find(
        (t) => t.id === historyTargetTenureId,
      )
      if (fromMinisters) return fromMinisters
      const head = selectedCabinet?.headTenure
      if (head?.id === historyTargetTenureId)
        return head as GovernmentCabinetTenureItem
      return null
    }, [selectedCabinetMinisters, selectedCabinet, historyTargetTenureId])

  /** 히스토리 등록 모달 — 수반 재임이면 제목 구분 */
  const historyModalTitle =
    historyTargetTenure &&
    selectedCabinet?.headTenure?.id === historyTargetTenure.id
      ? '수반 재임 히스토리'
      : '각료 재임 히스토리'

  useEffect(() => {
    if (historyTargetTenureId && !historyTargetTenure) {
      closeHistoryModal()
    }
  }, [historyTargetTenureId, historyTargetTenure])

  const visibleSelectedCabinetMinisters = selectedCabinetMinisters.filter((t) =>
    isMinisterMatched(t),
  )
  const sortedVisibleMinisters = useMemo(
    () =>
      [...visibleSelectedCabinetMinisters].sort((a, b) => {
        const aTime = a?.startDate ? new Date(a.startDate).getTime() : 0
        const bTime = b?.startDate ? new Date(b.startDate).getTime() : 0
        return bTime - aTime
      }),
    [visibleSelectedCabinetMinisters],
  )

  const getMinisterDepartmentName = (t: GovernmentCabinetTenureItem) => {
    const depId = t?.positionDefinition?.administrationDepartmentId
    if (!depId) return '미연결'
    const dep = (ministriesForCabinet as any[]).find((d: any) => d.id === depId)
    return dep?.name ?? '미연결'
  }
  if (loadingCabinets) {
    return (
      <CabS.CabinetsSectionRoot>
        <CabS.CabinetListSkeletonRoot
          aria-busy="true"
          aria-label="행정부 목록 불러오는 중"
        >
          <CabS.CabinetListSkeletonBar $w="40%" $h="18px" />
          <CabS.CabinetListSkeletonBar $w="72%" $h="12px" />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 12,
              marginTop: 8,
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                <CabS.CabinetListSkeletonBar
                  $h="120px"
                  style={{ borderRadius: 14 }}
                />
                <CabS.CabinetListSkeletonBar $w="85%" />
                <CabS.CabinetListSkeletonBar $w="60%" $h="10px" />
              </div>
            ))}
          </div>
        </CabS.CabinetListSkeletonRoot>
      </CabS.CabinetsSectionRoot>
    )
  }

  return (
    <CabS.CabinetsSectionRoot>
      {/* ── 포스트 상세 패턴: list view(카드 그리드) / detail view(행정부 상세) ── */}
      {/* wait 제거: 리스트·상세 DOM이 커서 exit 끝날 때까지 다음 뷰가 안 뜨면 체감 지연이 큼 → sync + 짧은 opacity만 */}
      <AnimatePresence mode="sync" initial={false}>
        {cabinetView === 'list' ? (
          <motion.div
            key="cab-list-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            style={{
              padding: 0,
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
            }}
          >
            <CabS.CabListPanel>
              <CabS.CabListToolbarShell>
                {/* ── 툴바: 국가 필터 + 검색 + 등록 ── */}
                <CabS.CabListToolbar>
                  {country.type === 'modern' &&
                    Array.isArray(country.historicalCountries) &&
                    country.historicalCountries.length > 0 && (
                      <>
                        <CabS.CabListFilterSegment>
                          <CabS.CabListFilterLabel>
                            <FiGlobe size={14} strokeWidth={2} aria-hidden />
                            국가·시기
                          </CabS.CabListFilterLabel>
                          <CabS.CabListFilterChips
                            role="tablist"
                            aria-label="국가·시기 필터"
                          >
                            {[
                              { id: '', label: '전체' },
                              { id: countryId ?? '', label: country.name },
                              ...country.historicalCountries.map((hc) => ({
                                id: hc.id,
                                label: hc.name,
                              })),
                            ].map((tab) => {
                              const active = cabinetCountryFilter === tab.id
                              return (
                                <CabS.CabListFilterPill
                                  key={tab.id}
                                  type="button"
                                  role="tab"
                                  aria-selected={active}
                                  $active={active}
                                  onClick={() =>
                                    setCabinetCountryFilter(tab.id)
                                  }
                                >
                                  {tab.label}
                                </CabS.CabListFilterPill>
                              )
                            })}
                          </CabS.CabListFilterChips>
                        </CabS.CabListFilterSegment>
                        <CabS.CabListToolbarHairline aria-hidden />
                      </>
                    )}

                  <CabS.CabListControlsRow>
                    <CabS.CabListSearchBox>
                      <CabS.CabListSearchIcon aria-hidden>
                        <FiSearch size={16} />
                      </CabS.CabListSearchIcon>
                      <CabS.CabListSearchInput
                        type="text"
                        placeholder="수반명, 직위, 연도, 소속 국가명, 행정부명 검색"
                        value={cabinetSearchQuery}
                        onChange={(e) => setCabinetSearchQuery(e.target.value)}
                        $hasTrailing={Boolean(
                          cabinetSearchQuery.trim() ||
                          filteredCabinets.length > 0,
                        )}
                      />
                      {cabinetSearchQuery.trim() ? (
                        <CabS.CabListSearchClearBtn
                          type="button"
                          aria-label="검색어 지우기"
                          onClick={() => setCabinetSearchQuery('')}
                        >
                          <FiX size={14} />
                        </CabS.CabListSearchClearBtn>
                      ) : (
                        filteredCabinets.length > 0 && (
                          <CabS.CabListSearchCount aria-hidden>
                            {filteredCabinets.length}개
                          </CabS.CabListSearchCount>
                        )
                      )}
                    </CabS.CabListSearchBox>

                    <CabS.CabListSortBadge>
                      <FiClock size={13} aria-hidden />
                      최신순
                    </CabS.CabListSortBadge>

                    <CabS.CabListRegisterBtn
                      type="button"
                      onClick={() => {
                        setRegisterFlow('new')
                        setRegisterCabinetModalOpen(true)
                      }}
                    >
                      <FiPlus size={14} />
                      행정부 등록
                    </CabS.CabListRegisterBtn>
                  </CabS.CabListControlsRow>
                </CabS.CabListToolbar>
              </CabS.CabListToolbarShell>
              {filteredCabinets.length === 0 ? (
                <CabS.CabListBody>
                  <EmptyStateFill>
                    {cabinetSearchQuery.trim() || cabinetCountryFilter ? (
                      <EmptyStateSpotlight
                        icon={<FiSearch size={30} strokeWidth={1.75} />}
                        title="검색 결과가 없습니다"
                        description="다른 검색어나 필터를 사용해 보세요."
                        primaryAction={{
                          label: '필터 초기화',
                          onClick: () => {
                            setCabinetSearchQuery('')
                            setCabinetCountryFilter('')
                          },
                          icon: <FiX size={14} />,
                        }}
                      />
                    ) : (
                      <EmptyStateSpotlight
                        icon={<FiUsers size={30} strokeWidth={1.75} />}
                        title="등록된 행정부가 없습니다"
                        description="행정부는 수반(국가원수·정부수반)의 재임 기록을 기반으로 생성됩니다."
                        primaryAction={{
                          label: '새 수반과 함께 등록',
                          onClick: () => {
                            setRegisterFlow('new')
                            setRegisterCabinetModalOpen(true)
                          },
                          icon: <FiPlus size={16} strokeWidth={2.25} />,
                        }}
                      />
                    )}
                  </EmptyStateFill>
                </CabS.CabListBody>
              ) : (
                <CabS.CabListBody>
                  <CabS.CabTimelineSummaryOuter>
                    <CabS.CabTimelineSummaryHeader>
                      <CabS.CabTimelineSummaryTopRow>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <FiUsers size={13} color={C.iconColor} />
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: C.text,
                              letterSpacing: '-0.02em',
                            }}
                          >
                            {filteredCabinets.length}개 행정부
                          </span>
                        </div>
                        {cabinetTimelineYearRange.minY != null && (
                          <>
                            <CabS.CabTimelineSepRule aria-hidden />
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <FiCalendar size={12} color={C.iconColor} />
                              <span
                                style={{ fontSize: 12, color: C.textMuted }}
                              >
                                {cabinetTimelineYearRange.minY} –{' '}
                                {cabinetTimelineYearRange.maxY ?? '현재'}
                              </span>
                            </div>
                          </>
                        )}
                        <div style={{ flex: 1 }} />
                      </CabS.CabTimelineSummaryTopRow>
                      {cabinetTerritoryLegendEntries.length > 0 && (
                        <CabS.CabTimelineLegendRow
                          role="list"
                          aria-label="이 목록의 소속별 강조 색"
                        >
                          {cabinetTerritoryLegendEntries.map((e) => (
                            <div
                              key={e.key}
                              role="listitem"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                maxWidth: '100%',
                              }}
                              title={e.label}
                            >
                              <span
                                aria-hidden
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  background: e.line,
                                  flexShrink: 0,
                                }}
                              />
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: C.textMuted,
                                  lineHeight: 1.35,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: 220,
                                }}
                              >
                                {e.label}
                              </span>
                            </div>
                          ))}
                        </CabS.CabTimelineLegendRow>
                      )}
                      <CabS.CabTimelineNote role="note">
                        아래 목록에서 <strong>서로 다른 소속</strong>
                        (역사국가·현대국가, 또는 행정부 명칭 구분)마다 강조 색을
                        나눕니다. 필터·검색으로 목록이 바뀌면 같은 소속도 배정
                        순서가 달라질 수 있습니다. 가로줄은 시간 흐름만
                        나타냅니다. 짝수 행은 왼쪽→오른쪽, 홀수 행은
                        오른쪽→왼쪽으로 이어집니다.
                      </CabS.CabTimelineNote>
                    </CabS.CabTimelineSummaryHeader>
                    <CabS.CabTimelineGrid
                      role="region"
                      aria-label="역대 행정부 타임라인"
                    >
                      <CabS.CabTimelineColLeft>
                        {cabinetTimelineRows.map((rowItems, rowIdx) => {
                          const rowLabelColor = C.textMuted
                          const firstHead = rowItems[0]?.headTenure
                          const lastHead =
                            rowItems[rowItems.length - 1]?.headTenure
                          const firstTerm =
                            firstHead?.termNumber ?? firstHead?.regnalNumber
                          const lastTerm =
                            lastHead?.termNumber ?? lastHead?.regnalNumber
                          const termLabel = (t: number, sub?: number | null) =>
                            sub != null ? `제${t}대 ${sub}기` : `제${t}대`
                          const rangeLabel =
                            firstTerm != null && lastTerm != null
                              ? firstTerm === lastTerm
                                ? termLabel(firstTerm, firstHead?.subTermNumber)
                                : `제${firstTerm}–${lastTerm}대`
                              : `${rowIdx * timelineColumnCount + 1}번째 행`
                          return (
                            <Fragment key={`cab-tl-l-${rowIdx}`}>
                              <CabS.CabTimelineRowLabelWrap
                                title={
                                  rowIdx % 2 === 0
                                    ? '이 행의 시간 순서: 왼쪽 → 오른쪽'
                                    : '이 행의 시간 순서: 오른쪽 → 왼쪽'
                                }
                              >
                                <CabS.CabTimelineRowSpine />
                                {rowIdx % 2 === 0 ? (
                                  <FiChevronRight
                                    size={12}
                                    color={rowLabelColor}
                                    style={{ opacity: 0.8, flexShrink: 0 }}
                                    aria-hidden
                                  />
                                ) : (
                                  <FiChevronLeft
                                    size={12}
                                    color={rowLabelColor}
                                    style={{ opacity: 0.8, flexShrink: 0 }}
                                    aria-hidden
                                  />
                                )}
                                <CabS.CabTimelineRowTermText>
                                  {rangeLabel}
                                </CabS.CabTimelineRowTermText>
                                <CabS.CabTimelineRowRule />
                              </CabS.CabTimelineRowLabelWrap>
                            </Fragment>
                          )
                        })}
                      </CabS.CabTimelineColLeft>
                      <CabS.CabTimelineColRight>
                        {cabinetTimelineRows.map((rowItems, rowIdx) => {
                          const cols = timelineColumnCount
                          const rowFlowLine = C.borderMid
                          const isReversed = rowIdx % 2 === 1
                          const displayItems = isReversed
                            ? [...rowItems].reverse()
                            : rowItems
                          const NODE_X = TL_NODE_CENTER_X

                          return (
                            <Fragment key={`cab-tl-t-${rowIdx}`}>
                              <div
                                style={{
                                  position: 'relative',
                                  height: TL_ROW_H,
                                  padding: `0 0 0 ${TL_LIST_PAD_LEFT}px`,
                                }}
                              >
                                {/* 수평선 — 첫 노드에서 컨테이너 우측 끝까지(잘라내지 않음) */}
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: NODE_X,
                                    right: 0,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    height: 3,
                                    background: rowFlowLine,
                                    opacity: 0.35,
                                    zIndex: 0,
                                    borderRadius: 2,
                                    pointerEvents: 'none',
                                  }}
                                />

                                {/* 아이템 그리드 */}
                                <div
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                                    height: '100%',
                                    gap: `0 ${TL_GRID_GAP_X}px`,
                                    position: 'relative',
                                    zIndex: 1,
                                  }}
                                >
                                  {Array.from({ length: cols }).map(
                                    (_, colIdx) => {
                                      const item = displayItems[colIdx]
                                      if (!item)
                                        return (
                                          <div
                                            key={`e-${colIdx}`}
                                            aria-hidden
                                          />
                                        )

                                      const head = item.headTenure
                                      const itemP = paletteForCabinetListItem(
                                        item,
                                        cabinetTerritoryOrdinalMap,
                                      )
                                      const bubbleColors =
                                        getTimelineBubbleTextColors(
                                          itemP,
                                          isDark,
                                          C.text,
                                        )
                                      const territoryLabel =
                                        showCabinetTerritoryLabels
                                          ? getHeadTenureTerritoryLabel(
                                              head,
                                              country.name,
                                            )
                                          : null
                                      const personName = head?.person
                                        ? getPersonName(head.person)
                                        : '이름 없음'
                                      const posTitle =
                                        head?.positionDefinition?.title ??
                                        head?.title ??
                                        '—'
                                      const termNum =
                                        head?.termNumber ?? head?.regnalNumber
                                      const thumbUrl =
                                        head?.person?.profileImageUrl ?? null
                                      const startYear = head?.startDate
                                        ? new Date(head.startDate).getFullYear()
                                        : null
                                      const range = head?.startDate
                                        ? `${formatDate(head.startDate)} – ${head?.endDate ? formatDate(head.endDate) : '현재'}`
                                        : '—'
                                      const ageAtStart =
                                        head?.person && head?.startDate
                                          ? calcAgeAtTenure(
                                              head.person,
                                              head.startDate,
                                            )
                                          : null
                                      const birthPlace = head?.person
                                        ? ((head.person as any).birthCity
                                            ?.name ??
                                          (head.person as any)
                                            .birthAdminDivision?.name ??
                                          (head.person as any).birthPlaceText ??
                                          null)
                                        : null
                                      const isDeleting =
                                        deletingCabinetId === item.id
                                      // 짝수: 아이템 위 / 버블 아래, 홀수: 버블 위 / 아이템 아래
                                      const itemOnTop = colIdx % 2 === 0

                                      const cellLabel =
                                        cabinetTimelineCellAriaLabel(
                                          termNum,
                                          head?.subTermNumber ?? null,
                                          posTitle,
                                          personName,
                                          territoryLabel,
                                        )
                                      return (
                                        <CabS.CabinetTimelineCellBtn
                                          key={item.id}
                                          disabled={isDeleting}
                                          aria-label={cellLabel}
                                          onClick={() => {
                                            if (!isDeleting) {
                                              setSelectedCabinetId(item.id)
                                              setCabinetView('detail')
                                            }
                                          }}
                                        >
                                          {/* 위쪽 영역 */}
                                          <div
                                            style={{
                                              flex: 1,
                                              width: '100%',
                                              display: 'flex',
                                              flexDirection: 'column',
                                              alignItems: 'stretch',
                                              justifyContent: 'flex-end',
                                              paddingBottom: TL_NODE_EDGE_PAD,
                                            }}
                                          >
                                            {itemOnTop ? (
                                              /* 아이템 (위) */
                                              <div
                                                style={{
                                                  width: '100%',
                                                  maxWidth: '100%',
                                                  transition:
                                                    'transform 0.18s ease, opacity 0.15s',
                                                }}
                                                onMouseEnter={(e) => {
                                                  ;(
                                                    e.currentTarget as HTMLDivElement
                                                  ).style.transform =
                                                    'translateY(-3px)'
                                                  ;(
                                                    e.currentTarget as HTMLDivElement
                                                  ).style.opacity = '0.92'
                                                }}
                                                onMouseLeave={(e) => {
                                                  ;(
                                                    e.currentTarget as HTMLDivElement
                                                  ).style.transform =
                                                    'translateY(0)'
                                                  ;(
                                                    e.currentTarget as HTMLDivElement
                                                  ).style.opacity = '1'
                                                }}
                                              >
                                                <TlItem
                                                  thumbUrl={thumbUrl}
                                                  personName={personName}
                                                  posTitle={posTitle}
                                                  range={range}
                                                  ageAtStart={ageAtStart}
                                                  birthPlace={birthPlace}
                                                  lineColor={itemP.line}
                                                  territoryLabel={
                                                    territoryLabel ?? undefined
                                                  }
                                                  isDark={isDark}
                                                />
                                              </div>
                                            ) : (
                                              /* 연도 버블 (위) — 썸네일과 같은 좌측 기준선 */
                                              <div
                                                style={{
                                                  width: '100%',
                                                  display: 'flex',
                                                  justifyContent: 'flex-start',
                                                  paddingLeft:
                                                    TL_YEAR_BUBBLE_SHIFT_X,
                                                }}
                                              >
                                                <div
                                                  style={{
                                                    display: 'inline-flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    flexShrink: 0,
                                                    width: 'fit-content',
                                                    maxWidth: '100%',
                                                    background: C.bg,
                                                    border: `2.5px solid ${itemP.line}`,
                                                    borderRadius: 28,
                                                    padding: '8px 16px',
                                                    minWidth: TL_BUBBLE_W,
                                                    boxShadow: `0 2px 10px ${itemP.line}44`,
                                                    textAlign: 'center',
                                                  }}
                                                >
                                                  <span
                                                    style={{
                                                      fontSize: 17,
                                                      fontWeight: 900,
                                                      color: bubbleColors.year,
                                                      letterSpacing: '-0.03em',
                                                      lineHeight: 1.2,
                                                    }}
                                                  >
                                                    {startYear ?? '—'}
                                                  </span>
                                                  {termNum != null && (
                                                    <span
                                                      style={{
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        color: itemP.line,
                                                        marginTop: 3,
                                                      }}
                                                    >
                                                      제{termNum}대
                                                      {head?.subTermNumber !=
                                                      null
                                                        ? ` ${head.subTermNumber}기`
                                                        : ''}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                          </div>

                                          {/* 수직선 + 노드 — 썸네일 너비 안에서 가운데(원 중심과 일치) */}
                                          <div
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              justifyContent: 'flex-start',
                                              width: '100%',
                                              flexShrink: 0,
                                            }}
                                          >
                                            <div
                                              style={{
                                                width: TL_THUMB,
                                                flexShrink: 0,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                              }}
                                            >
                                              <div
                                                style={{
                                                  width: 2,
                                                  height: TL_VERT_SEG_H,
                                                  background: itemP.line,
                                                  opacity: 0.6,
                                                }}
                                              />
                                              <div
                                                style={{
                                                  width: 14,
                                                  height: 14,
                                                  borderRadius: '50%',
                                                  background: C.bg,
                                                  border: `3px solid ${itemP.line}`,
                                                  boxShadow: `0 0 0 3px ${C.bg}`,
                                                  zIndex: 2,
                                                }}
                                              />
                                              <div
                                                style={{
                                                  width: 2,
                                                  height: TL_VERT_SEG_H,
                                                  background: itemP.line,
                                                  opacity: 0.6,
                                                }}
                                              />
                                            </div>
                                          </div>

                                          {/* 아래쪽 영역 */}
                                          <div
                                            style={{
                                              flex: 1,
                                              width: '100%',
                                              display: 'flex',
                                              flexDirection: 'column',
                                              alignItems: 'stretch',
                                              justifyContent: 'flex-start',
                                              paddingTop: TL_NODE_EDGE_PAD,
                                            }}
                                          >
                                            {!itemOnTop ? (
                                              /* 아이템 (아래) */
                                              <div
                                                style={{
                                                  width: '100%',
                                                  maxWidth: '100%',
                                                  transition:
                                                    'transform 0.18s ease, opacity 0.15s',
                                                }}
                                                onMouseEnter={(e) => {
                                                  ;(
                                                    e.currentTarget as HTMLDivElement
                                                  ).style.transform =
                                                    'translateY(3px)'
                                                  ;(
                                                    e.currentTarget as HTMLDivElement
                                                  ).style.opacity = '0.92'
                                                }}
                                                onMouseLeave={(e) => {
                                                  ;(
                                                    e.currentTarget as HTMLDivElement
                                                  ).style.transform =
                                                    'translateY(0)'
                                                  ;(
                                                    e.currentTarget as HTMLDivElement
                                                  ).style.opacity = '1'
                                                }}
                                              >
                                                <TlItem
                                                  thumbUrl={thumbUrl}
                                                  personName={personName}
                                                  posTitle={posTitle}
                                                  range={range}
                                                  ageAtStart={ageAtStart}
                                                  birthPlace={birthPlace}
                                                  lineColor={itemP.line}
                                                  territoryLabel={
                                                    territoryLabel ?? undefined
                                                  }
                                                  isDark={isDark}
                                                />
                                              </div>
                                            ) : (
                                              /* 연도 버블 (아래) — 썸네일과 같은 좌측 기준선 */
                                              <div
                                                style={{
                                                  width: '100%',
                                                  display: 'flex',
                                                  justifyContent: 'flex-start',
                                                  paddingLeft:
                                                    TL_YEAR_BUBBLE_SHIFT_X,
                                                }}
                                              >
                                                <div
                                                  style={{
                                                    display: 'inline-flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    flexShrink: 0,
                                                    width: 'fit-content',
                                                    maxWidth: '100%',
                                                    background: C.bg,
                                                    border: `2.5px solid ${itemP.line}`,
                                                    borderRadius: 28,
                                                    padding: '8px 16px',
                                                    minWidth: TL_BUBBLE_W,
                                                    boxShadow: `0 2px 10px ${itemP.line}44`,
                                                    textAlign: 'center',
                                                  }}
                                                >
                                                  <span
                                                    style={{
                                                      fontSize: 17,
                                                      fontWeight: 900,
                                                      color: bubbleColors.year,
                                                      letterSpacing: '-0.03em',
                                                      lineHeight: 1.2,
                                                    }}
                                                  >
                                                    {startYear ?? '—'}
                                                  </span>
                                                  {termNum != null && (
                                                    <span
                                                      style={{
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        color: itemP.line,
                                                        marginTop: 3,
                                                      }}
                                                    >
                                                      제{termNum}대
                                                      {head?.subTermNumber !=
                                                      null
                                                        ? ` ${head.subTermNumber}기`
                                                        : ''}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </CabS.CabinetTimelineCellBtn>
                                      )
                                    },
                                  )}
                                </div>
                              </div>
                            </Fragment>
                          )
                        })}
                      </CabS.CabTimelineColRight>
                    </CabS.CabTimelineGrid>
                  </CabS.CabTimelineSummaryOuter>
                </CabS.CabListBody>
              )}
            </CabS.CabListPanel>
          </motion.div>
        ) : (
          /* ── 상세 뷰: 선택한 행정부 내용 ── */
          <motion.div
            key="cab-detail-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
          >
            {hasSelectedCabinet && selectedCabinet && (
              <>
                <CabinetDetailChrome
                  cabDetailBackBtnRef={cabDetailBackBtnRef}
                  selectedCabinet={selectedCabinet}
                  selectedMinisterId={selectedMinisterId}
                  sortedVisibleMinisters={sortedVisibleMinisters}
                  setCabinetView={setCabinetView}
                  setSelectedCabinetId={setSelectedCabinetId}
                  setSelectedMinisterId={setSelectedMinisterId}
                  setSelectedHeadHistoryId={setSelectedHeadHistoryId}
                  setSelectedHistoryId={setSelectedHistoryId}
                  setEditingHistoryContent={setEditingHistoryContent}
                  setMinisterFormPositionDefId={setMinisterFormPositionDefId}
                  setMinisterFormTitle={setMinisterFormTitle}
                  setMinisterFormStartDate={setMinisterFormStartDate}
                  setMinisterFormEndDate={setMinisterFormEndDate}
                  setMinisterFormTermNumber={setMinisterFormTermNumber}
                  setMinisterFormDeptId={setMinisterFormDeptId}
                  setAddMinisterCabinet={setAddMinisterCabinet}
                  setPersonSelectOpen={setPersonSelectOpen}
                  handleDeleteCabinet={handleDeleteCabinet}
                  onEditCabinet={() => handleOpenEditCabinet(selectedCabinet)}
                />
                {selectedMinisterId
                  ? /* ── 각료 상세 뷰 ── */
                    (() => {
                      const minister = sortedVisibleMinisters.find(
                        (t) => t.id === selectedMinisterId,
                      )
                      if (!minister) return null
                      const achievementCount = Array.isArray(
                        minister.achievements,
                      )
                        ? minister.achievements.length
                        : 0
                      const thumbUrl = minister.person?.profileImageUrl ?? null
                      const personName = getPersonName(minister.person)
                      const posTitle =
                        minister.positionDefinition?.title ??
                        minister.title ??
                        '—'
                      const deptName = getMinisterDepartmentName(minister)
                      const start = minister.startDate
                        ? formatDate(minister.startDate)
                        : '—'
                      const end = minister.endDate
                        ? formatDate(minister.endDate)
                        : '현재'
                      const tenureDuration = calcTenureDuration(
                        minister.startDate,
                        minister.endDate,
                      )
                      const ageAtStart = calcAgeAtTenure(
                        minister.person ?? null,
                        minister.startDate,
                      )
                      const ageAtEnd = minister.endDate
                        ? calcAgeAtEndTenure(
                            minister.person ?? null,
                            minister.endDate,
                          )
                        : null
                      return (
                        <>
                          {/* 각료 프로필 — compact horizontal 카드 */}
                          <CabS.MinisterProfileBlock>
                            <CabS.MinisterProfileAvatar
                              onClick={() =>
                                minister.person?.id &&
                                setMentionPersonId(minister.person.id)
                              }
                              style={{
                                cursor: minister.person?.id
                                  ? 'pointer'
                                  : 'default',
                              }}
                              title={
                                minister.person?.id
                                  ? `${personName} 인물 정보 보기`
                                  : undefined
                              }
                            >
                              {thumbUrl ? (
                                <img
                                  src={thumbUrl}
                                  alt={personName}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    objectPosition: 'top center',
                                    borderRadius: '50%',
                                  }}
                                />
                              ) : (
                                <FiUser size={28} color={C.iconColor} />
                              )}
                            </CabS.MinisterProfileAvatar>
                            <CabS.MinisterProfileMeta>
                              <CabS.MinisterProfileName>
                                {personName}
                              </CabS.MinisterProfileName>
                              <CabS.MinisterProfileBadges>
                                <CabS.MinisterPosBadge>
                                  {posTitle}
                                </CabS.MinisterPosBadge>
                                {deptName !== '—' && deptName !== '미연결' && (
                                  <CabS.MinisterDeptTag>
                                    {deptName}
                                  </CabS.MinisterDeptTag>
                                )}
                              </CabS.MinisterProfileBadges>
                              <CabS.MinisterProfileStats>
                                <CabS.MinisterStatItem>
                                  <FiCalendar size={10} />
                                  {start} – {end}
                                </CabS.MinisterStatItem>
                                {tenureDuration && (
                                  <CabS.MinisterStatAge>
                                    재임 {tenureDuration}
                                  </CabS.MinisterStatAge>
                                )}
                                {ageAtStart != null && (
                                  <CabS.MinisterStatAge>
                                    {ageAtEnd != null
                                      ? `${ageAtStart}세 ~ ${ageAtEnd}세`
                                      : `취임 ${ageAtStart}세`}
                                  </CabS.MinisterStatAge>
                                )}
                              </CabS.MinisterProfileStats>
                              {minister.person && (
                                <CabS.MinisterProfileLifespan>
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      color: C.slate400,
                                      marginRight: 4,
                                      fontSize: 10,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.04em',
                                    }}
                                  >
                                    생몰년
                                  </span>
                                  {formatPersonLifespan(minister.person)}
                                </CabS.MinisterProfileLifespan>
                              )}
                              {(() => {
                                const p = minister.person as any
                                const birthPlace =
                                  p?.birthCity?.name ??
                                  p?.birthAdminDivision?.name ??
                                  p?.birthPlaceText
                                return birthPlace ? (
                                  <CabS.MinisterProfileLifespan>
                                    <span
                                      style={{
                                        fontWeight: 700,
                                        color: C.slate400,
                                        marginRight: 4,
                                        fontSize: 10,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.04em',
                                      }}
                                    >
                                      출신
                                    </span>
                                    {birthPlace}
                                  </CabS.MinisterProfileLifespan>
                                ) : null
                              })()}
                            </CabS.MinisterProfileMeta>
                            <CabS.MinisterProfileAction></CabS.MinisterProfileAction>
                          </CabS.MinisterProfileBlock>

                          {/* 히스토리 섹션: 선택 시 NYT 상세, 미선택 시 목록 */}
                          {selectedHistoryId ? (
                            (() => {
                              const selAch = Array.isArray(
                                minister.achievements,
                              )
                                ? minister.achievements.find(
                                    (a: any) => a.id === selectedHistoryId,
                                  )
                                : null
                              if (!selAch) return null
                              const achStartDate = selAch.startDate
                                ? formatDate(selAch.startDate)
                                : null
                              const achEndDate = selAch.endDate
                                ? formatDate(selAch.endDate)
                                : null
                              const hasContent = !!selAch.description?.trim()
                              return (
                                <CabS.HistoryArticleWrap>
                                  <CabS.HistoryArticleTopBar>
                                    <CabS.HistoryArticleBackBtn
                                      type="button"
                                      onClick={() => {
                                        setSelectedHistoryId(null)
                                        setEditingHistoryContent(false)
                                        setEditingHistoryMeta(false)
                                      }}
                                    >
                                      <FiChevronLeft size={13} />
                                      재임 히스토리 목록
                                    </CabS.HistoryArticleBackBtn>
                                    <CabS.HistoryArticleDeleteBtn
                                      type="button"
                                      onClick={() =>
                                        deleteMinisterHistoryDirect(
                                          minister.id,
                                          selAch.id,
                                        )
                                      }
                                    >
                                      <FiTrash2 size={13} />
                                      삭제
                                    </CabS.HistoryArticleDeleteBtn>
                                  </CabS.HistoryArticleTopBar>

                                  {/* 제목/날짜 영역: 100% width, 별도 수정 버튼 */}
                                  <CabS.HistoryArticleMetaSection>
                                    {editingHistoryMeta ? (
                                      <>
                                        <CabS.HistoryMetaForm>
                                          <CabS.HistoryMetaInput
                                            type="text"
                                            value={historyMetaTitle}
                                            onChange={(e) =>
                                              setHistoryMetaTitle(
                                                e.target.value,
                                              )
                                            }
                                            placeholder="히스토리 제목"
                                          />
                                          <CabS.HistoryMetaDateRow>
                                            <CabS.HistoryMetaDateInput
                                              type="date"
                                              value={historyMetaStartDate}
                                              onChange={(e) =>
                                                setHistoryMetaStartDate(
                                                  e.target.value,
                                                )
                                              }
                                            />
                                            <span
                                              style={{
                                                color: C.textFaint,
                                                fontSize: 13,
                                              }}
                                            >
                                              –
                                            </span>
                                            <CabS.HistoryMetaDateInput
                                              type="date"
                                              value={historyMetaEndDate}
                                              onChange={(e) =>
                                                setHistoryMetaEndDate(
                                                  e.target.value,
                                                )
                                              }
                                            />
                                          </CabS.HistoryMetaDateRow>
                                        </CabS.HistoryMetaForm>
                                        <CabS.HistoryArticleEditActions
                                          style={{ marginTop: 12 }}
                                        >
                                          <CabS.HistoryArticleCancelBtn
                                            type="button"
                                            onClick={() =>
                                              setEditingHistoryMeta(false)
                                            }
                                            disabled={historyMetaSaving}
                                          >
                                            취소
                                          </CabS.HistoryArticleCancelBtn>
                                          <CabS.HistoryArticleSaveBtn
                                            type="button"
                                            onClick={() =>
                                              saveHistoryMeta(
                                                minister.id,
                                                selAch.id,
                                              )
                                            }
                                            disabled={
                                              historyMetaSaving ||
                                              !historyMetaTitle.trim()
                                            }
                                            $isRegister={false}
                                          >
                                            {historyMetaSaving
                                              ? '저장 중…'
                                              : '저장'}
                                          </CabS.HistoryArticleSaveBtn>
                                        </CabS.HistoryArticleEditActions>
                                      </>
                                    ) : (
                                      <>
                                        <CabS.HistoryHeadlineRow>
                                          <CabS.HistoryArticleHeadline>
                                            {selAch.title}
                                          </CabS.HistoryArticleHeadline>
                                          <CabS.HistoryMetaEditBtn
                                            type="button"
                                            onClick={() => {
                                              setHistoryMetaTitle(
                                                selAch.title ?? '',
                                              )
                                              setHistoryMetaStartDate(
                                                selAch.startDate
                                                  ? String(
                                                      selAch.startDate,
                                                    ).slice(0, 10)
                                                  : '',
                                              )
                                              setHistoryMetaEndDate(
                                                selAch.endDate
                                                  ? String(
                                                      selAch.endDate,
                                                    ).slice(0, 10)
                                                  : '',
                                              )
                                              setEditingHistoryMeta(true)
                                            }}
                                          >
                                            <FiEdit2 size={11} />
                                          </CabS.HistoryMetaEditBtn>
                                        </CabS.HistoryHeadlineRow>
                                        {(achStartDate || achEndDate) && (
                                          <CabS.HistoryArticleByline>
                                            {achStartDate && (
                                              <span>{achStartDate}</span>
                                            )}
                                            {achStartDate && achEndDate && (
                                              <span> – </span>
                                            )}
                                            {achEndDate && (
                                              <span>{achEndDate}</span>
                                            )}
                                          </CabS.HistoryArticleByline>
                                        )}
                                      </>
                                    )}
                                  </CabS.HistoryArticleMetaSection>

                                  <CabS.HistoryArticleDivider />

                                  {/* 본문 영역: max-width 680px 가운데 */}
                                  <CabS.HistoryArticleInner>
                                    <CabS.HistoryArticleContentBar>
                                      {!editingHistoryContent && (
                                        <CabS.HistoryArticleEditBtn
                                          type="button"
                                          style={{ marginLeft: 'auto' }}
                                          onClick={() => {
                                            setHistoryDraftContent(
                                              selAch.description ?? '',
                                            )
                                            setEditingHistoryContent(true)
                                          }}
                                        >
                                          <FiEdit2 size={13} />
                                          {hasContent ? '수정' : '추가'}
                                        </CabS.HistoryArticleEditBtn>
                                      )}
                                    </CabS.HistoryArticleContentBar>

                                    {editingHistoryContent ? (
                                      <>
                                        <CabS.HistoryArticleEditorWrap>
                                          <RichTextEditor
                                            value={historyDraftContent}
                                            onChange={setHistoryDraftContent}
                                            showTitle={false}
                                            placeholder={
                                              hasContent
                                                ? '본문을 수정하세요.'
                                                : '본문 내용을 입력하세요.'
                                            }
                                            onImageUpload={async (file) => {
                                              const result = await uploadImage(
                                                file,
                                                'persons',
                                              )
                                              return (
                                                getUploadImageUrl(result.url) ||
                                                (result.url ?? '')
                                              )
                                            }}
                                          />
                                        </CabS.HistoryArticleEditorWrap>
                                        <CabS.HistoryArticleEditActions>
                                          <CabS.HistoryArticleCancelBtn
                                            type="button"
                                            onClick={() => {
                                              setEditingHistoryContent(false)
                                              setHistoryDraftContent('')
                                            }}
                                            disabled={historyContentSaving}
                                          >
                                            취소
                                          </CabS.HistoryArticleCancelBtn>
                                          <CabS.HistoryArticleSaveBtn
                                            type="button"
                                            onClick={() =>
                                              saveHistoryDescription(
                                                minister.id,
                                                selAch.id,
                                                historyDraftContent,
                                              )
                                            }
                                            disabled={historyContentSaving}
                                            $isRegister={!hasContent}
                                          >
                                            {historyContentSaving
                                              ? hasContent
                                                ? '저장 중…'
                                                : '등록 중…'
                                              : hasContent
                                                ? '저장'
                                                : '등록'}
                                          </CabS.HistoryArticleSaveBtn>
                                        </CabS.HistoryArticleEditActions>
                                      </>
                                    ) : hasContent ? (
                                      <div
                                        onClick={handleHistoryProseClick}
                                        role="presentation"
                                      >
                                        <CabS.HistoryArticleProse
                                          html={selAch.description ?? ''}
                                        />
                                      </div>
                                    ) : (
                                      <CabS.HistoryArticleEmpty>
                                        본문 내용이 없습니다.
                                      </CabS.HistoryArticleEmpty>
                                    )}
                                  </CabS.HistoryArticleInner>
                                </CabS.HistoryArticleWrap>
                              )
                            })()
                          ) : (
                            <CabS.ProfileSection>
                              <CabS.ProfileSectionLabel>
                                재임 히스토리
                                {achievementCount > 0 && (
                                  <CabS.ProfileSectionCount>
                                    {achievementCount}
                                  </CabS.ProfileSectionCount>
                                )}
                              </CabS.ProfileSectionLabel>
                              {achievementCount === 0 ? (
                                <CabS.ProfileEmptyNote>
                                  등록된 히스토리가 없습니다.
                                  <button
                                    type="button"
                                    onClick={(e) =>
                                      openMinisterHistoryModal(minister, e)
                                    }
                                    style={{
                                      marginLeft: 10,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      padding: '4px 10px',
                                      fontSize: 11.5,
                                      fontWeight: 600,
                                      color: C.chipActionColor,
                                      background: C.chipActionBg,
                                      border: `1px solid ${C.chipActionBorder}`,
                                      borderRadius: 7,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <FiPlus size={11} />
                                    등록
                                  </button>
                                </CabS.ProfileEmptyNote>
                              ) : (
                                <CabS.HistoryCardList>
                                  {(minister.achievements ?? []).map(
                                    (ach: any) => (
                                      <CabS.HistoryCard
                                        key={ach.id}
                                        onClick={() =>
                                          setSelectedHistoryId(ach.id)
                                        }
                                      >
                                        <CabS.HistoryCardTitle>
                                          {ach.title}
                                        </CabS.HistoryCardTitle>
                                        {(ach.startDate || ach.endDate) && (
                                          <CabS.HistoryCardMeta>
                                            {ach.startDate
                                              ? formatDate(ach.startDate)
                                              : '—'}
                                            {' – '}
                                            {ach.endDate
                                              ? formatDate(ach.endDate)
                                              : '현재'}
                                          </CabS.HistoryCardMeta>
                                        )}
                                        {ach.description && (
                                          <CabS.HistoryCardExcerpt>
                                            {stripHtmlToPlain(
                                              ach.description,
                                              80,
                                            )}
                                          </CabS.HistoryCardExcerpt>
                                        )}
                                        <CabS.HistoryCardChevron>
                                          <FiChevronRight size={13} />
                                        </CabS.HistoryCardChevron>
                                        <CabS.HistoryCardDeleteBtn
                                          type="button"
                                          title="삭제"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            deleteMinisterHistoryDirect(
                                              minister.id,
                                              ach.id,
                                            )
                                          }}
                                        >
                                          <FiTrash2 size={12} />
                                        </CabS.HistoryCardDeleteBtn>
                                      </CabS.HistoryCard>
                                    ),
                                  )}
                                </CabS.HistoryCardList>
                              )}
                            </CabS.ProfileSection>
                          )}
                        </>
                      )
                    })()
                  : /* ── 행정부 상세 뷰 (수반 정보 + 각료 목록) ── */
                    (() => {
                      const head = selectedCabinet.headTenure
                      const thumbUrl = head?.person?.profileImageUrl ?? null
                      const personName = head?.person
                        ? getPersonName(head.person)
                        : '이름 없음'
                      const posTitle =
                        head?.positionDefinition?.title ?? head?.title ?? '—'
                      const termNum = head?.termNumber ?? head?.regnalNumber
                      const startFull = head?.startDate
                        ? formatDate(head.startDate)
                        : '—'
                      const endFull = head?.endDate
                        ? formatDate(head.endDate)
                        : '현재'
                      const duration = calcTenureDuration(
                        head?.startDate,
                        head?.endDate,
                      )
                      const ageAtStart = calcAgeAtTenure(
                        head?.person,
                        head?.startDate,
                      )
                      const ageAtEnd = head?.endDate
                        ? calcAgeAtEndTenure(head?.person, head?.endDate)
                        : null
                      const termBadge = formatCabinetTermBadge(
                        termNum,
                        head?.subTermNumber ?? null,
                      )
                      return (
                        <>
                          {/* 수반 프로필 — 기본은 히어로형, 히스토리 상세 시에는 각료와 동일한 컴팩트 카드 */}
                          {selectedHeadHistoryId ? (
                            <CabS.MinisterProfileBlock
                              id="cab-detail-profile"
                              style={{ scrollMarginTop: 12 }}
                            >
                              <CabS.MinisterProfileAvatar
                                tabIndex={head?.person?.id ? 0 : undefined}
                                role={head?.person?.id ? 'button' : undefined}
                                onClick={() =>
                                  head?.person?.id &&
                                  setMentionPersonId(head.person.id)
                                }
                                onKeyDown={(e) => {
                                  if (!head?.person?.id) return
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    setMentionPersonId(head.person.id)
                                  }
                                }}
                                style={{
                                  cursor: head?.person?.id
                                    ? 'pointer'
                                    : 'default',
                                }}
                                title={
                                  head?.person?.id
                                    ? `${personName} 인물 정보 보기`
                                    : undefined
                                }
                              >
                                {thumbUrl ? (
                                  <img
                                    src={thumbUrl}
                                    alt={personName}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                      objectPosition: 'top center',
                                      borderRadius: '50%',
                                    }}
                                  />
                                ) : (
                                  <FiUser size={28} color={C.iconColor} />
                                )}
                              </CabS.MinisterProfileAvatar>
                              <CabS.MinisterProfileMeta>
                                <CabS.MinisterProfileName>
                                  {personName}
                                </CabS.MinisterProfileName>
                                <CabS.MinisterProfileBadges>
                                  {termBadge && (
                                    <CabS.HeadProfileDetailChipTerm
                                      style={{
                                        fontSize: 10,
                                        padding: '3px 10px',
                                      }}
                                    >
                                      {termBadge}
                                    </CabS.HeadProfileDetailChipTerm>
                                  )}
                                  <CabS.MinisterPosBadge>
                                    {posTitle}
                                  </CabS.MinisterPosBadge>
                                </CabS.MinisterProfileBadges>
                                <CabS.MinisterProfileStats>
                                  <CabS.MinisterStatItem>
                                    <FiCalendar size={10} />
                                    {startFull} – {endFull}
                                  </CabS.MinisterStatItem>
                                  {duration && (
                                    <CabS.MinisterStatAge>
                                      재임 {duration}
                                    </CabS.MinisterStatAge>
                                  )}
                                  {ageAtStart != null && (
                                    <CabS.MinisterStatAge>
                                      {ageAtEnd != null
                                        ? `${ageAtStart}세 ~ ${ageAtEnd}세`
                                        : `취임 ${ageAtStart}세`}
                                    </CabS.MinisterStatAge>
                                  )}
                                </CabS.MinisterProfileStats>
                              </CabS.MinisterProfileMeta>
                              <CabS.MinisterProfileAction />
                            </CabS.MinisterProfileBlock>
                          ) : (
                            <CabS.HeadProfileBlock
                              id="cab-detail-profile"
                              style={{ scrollMarginTop: 12 }}
                            >
                              <CabS.HeadProfileAvatar
                                tabIndex={head?.person?.id ? 0 : undefined}
                                role={head?.person?.id ? 'button' : undefined}
                                onClick={() =>
                                  head?.person?.id &&
                                  setMentionPersonId(head.person.id)
                                }
                                onKeyDown={(e) => {
                                  if (!head?.person?.id) return
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    setMentionPersonId(head.person.id)
                                  }
                                }}
                                style={{
                                  cursor: head?.person?.id
                                    ? 'pointer'
                                    : 'default',
                                }}
                                title={
                                  head?.person?.id
                                    ? `${personName} 인물 정보 보기`
                                    : undefined
                                }
                              >
                                {thumbUrl ? (
                                  <img
                                    src={thumbUrl}
                                    alt={personName}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                      objectPosition: 'top center',
                                      borderRadius: '50%',
                                    }}
                                  />
                                ) : (
                                  <FiUser size={52} color={C.iconColor} />
                                )}
                              </CabS.HeadProfileAvatar>
                              <CabS.HeadProfileMeta>
                                <CabS.HeadProfileBadgeRow>
                                  {termBadge && (
                                    <CabS.HeadProfileDetailChipTerm>
                                      {termBadge}
                                    </CabS.HeadProfileDetailChipTerm>
                                  )}
                                  <CabS.HeadProfileDetailChipPosition>
                                    {posTitle}
                                  </CabS.HeadProfileDetailChipPosition>
                                </CabS.HeadProfileBadgeRow>
                                <CabS.HeadProfileHeadline>
                                  {personName}
                                </CabS.HeadProfileHeadline>
                                <CabS.HeadTenureRow>
                                  <CabS.HeadTenureDates>
                                    <FiCalendar size={10} />
                                    {startFull} – {endFull}
                                  </CabS.HeadTenureDates>
                                  {duration && (
                                    <CabS.HeadTenureDuration>
                                      재임 {duration}
                                    </CabS.HeadTenureDuration>
                                  )}
                                  {ageAtStart != null && (
                                    <CabS.HeadTenureAge>
                                      {ageAtEnd != null
                                        ? `${ageAtStart}세 ~ ${ageAtEnd}세`
                                        : `취임 ${ageAtStart}세`}
                                    </CabS.HeadTenureAge>
                                  )}
                                </CabS.HeadTenureRow>
                                <CabS.HeadProfileDivider aria-hidden />
                                {head?.person && (
                                  <CabS.HeadLifespan>
                                    <CabS.HeadMetaKicker>생몰년</CabS.HeadMetaKicker>
                                    {formatPersonLifespan(head.person)}
                                  </CabS.HeadLifespan>
                                )}
                                {(() => {
                                  const p = head?.person as any
                                  const birthPlace =
                                    p?.birthCity?.name ??
                                    p?.birthAdminDivision?.name ??
                                    p?.birthPlaceText
                                  return birthPlace ? (
                                    <CabS.HeadLifespan>
                                      <CabS.HeadMetaKicker>출신</CabS.HeadMetaKicker>
                                      {birthPlace}
                                    </CabS.HeadLifespan>
                                  ) : null
                                })()}
                              </CabS.HeadProfileMeta>
                            </CabS.HeadProfileBlock>
                          )}

                          {!selectedHeadHistoryId && selectedCabinet?.id && (
                            <CabinetPoliticalPartiesBlock
                              cabinetId={selectedCabinet.id}
                              countryId={countryId}
                              historicalCountryId={historicalCountryId}
                              isDark={isDark}
                            />
                          )}

                          {!selectedHeadHistoryId && (
                            <>
                              {/* 취임/퇴임 정보 섹션 — 수반 히스토리 상세 시에는 숨김(각료 상세와 동일하게 프로필+히스토리만) */}
                              <CabS.CabDetailScrollSection id="cab-detail-tenure">
                                {/* ── 취임 정보 ── */}
                                <CabS.HeadTenureInfoSection $accent="mint">
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      marginBottom:
                                        !!editingTenureInfo &&
                                        editingTenureInfo.cabinetId ===
                                          selectedCabinet.id &&
                                        editingTenureInfo.mode === 'appointment'
                                          ? 10
                                          : 0,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: C.sectionLabelTint,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                      }}
                                    >
                                      <span
                                        style={{
                                          width: 6,
                                          height: 6,
                                          borderRadius: '50%',
                                          background: '#6ee7b7',
                                          flexShrink: 0,
                                          display: 'inline-block',
                                        }}
                                      />
                                      취임 정보
                                    </span>
                                    {!!editingTenureInfo &&
                                    editingTenureInfo.cabinetId ===
                                      selectedCabinet.id &&
                                    editingTenureInfo.mode === 'appointment' ? (
                                      <div style={{ display: 'flex', gap: 6 }}>
                                        <button
                                          type="button"
                                          disabled={tenureInfoSubmitting}
                                          onClick={() =>
                                            handleSaveTenureInfoInline(
                                              selectedCabinet.id,
                                              head.id,
                                            )
                                          }
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            padding: '4px 12px',
                                            fontSize: 11.5,
                                            fontWeight: 700,
                                            color: '#fff',
                                            background: '#6366f1',
                                            border: 'none',
                                            borderRadius: 7,
                                            cursor: 'pointer',
                                          }}
                                        >
                                          {tenureInfoSubmitting
                                            ? '저장 중…'
                                            : '저장'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setEditingTenureInfo(null)
                                          }
                                          style={{
                                            padding: '4px 10px',
                                            fontSize: 11.5,
                                            fontWeight: 600,
                                            color: C.slate400,
                                            background: 'transparent',
                                            border: `1px solid ${C.borderHairline12}`,
                                            borderRadius: 7,
                                            cursor: 'pointer',
                                          }}
                                        >
                                          취소
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingAppointmentMethod(
                                            head?.appointmentMethod ?? '',
                                          )
                                          setEditingNotes(head?.notes ?? '')
                                          setEditingTenureInfo({
                                            cabinetId: selectedCabinet.id,
                                            mode: 'appointment',
                                          })
                                        }}
                                        style={{
                                          fontSize: 12,
                                          fontWeight: 600,
                                          color: C.chipActionColor,
                                          background: 'transparent',
                                          border: 'none',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 4,
                                          padding: '4px 8px',
                                          borderRadius: 6,
                                        }}
                                      >
                                        <FiPlus size={12} />
                                        {head?.appointmentMethod || head?.notes
                                          ? '수정'
                                          : '등록'}
                                      </button>
                                    )}
                                  </div>
                                  {!!editingTenureInfo &&
                                  editingTenureInfo.cabinetId ===
                                    selectedCabinet.id &&
                                  editingTenureInfo.mode === 'appointment' ? (
                                    <div
                                      style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 10,
                                      }}
                                    >
                                      <div>
                                        <label
                                          style={{
                                            display: 'block',
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: C.slate400,
                                            marginBottom: 4,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                          }}
                                        >
                                          임명 방식
                                        </label>
                                        <select
                                          value={editingAppointmentMethod}
                                          onChange={(e) =>
                                            setEditingAppointmentMethod(
                                              e.target.value,
                                            )
                                          }
                                          style={{
                                            maxWidth: 280,
                                            width: '100%',
                                            padding: '8px 10px',
                                            fontSize: 13,
                                            border: `1.5px solid ${C.badgeBorder}`,
                                            borderRadius: 8,
                                            background: C.inputBg,
                                            color: C.text,
                                            outline: 'none',
                                          }}
                                        >
                                          <option value="">선택 안 함</option>
                                          {Object.entries(
                                            APPOINTMENT_METHOD_LABEL,
                                          ).map(([k, v]) => (
                                            <option key={k} value={k}>
                                              {v}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <div>
                                        <label
                                          style={{
                                            display: 'block',
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: C.slate400,
                                            marginBottom: 4,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                          }}
                                        >
                                          취임 배경 / 비고
                                        </label>
                                        <textarea
                                          value={editingNotes}
                                          onChange={(e) =>
                                            setEditingNotes(e.target.value)
                                          }
                                          rows={3}
                                          placeholder="취임 배경, 특이 사항 등"
                                          style={{
                                            maxWidth: 500,
                                            height: 200,
                                            width: '100%',
                                            padding: '8px 10px',
                                            fontSize: 13,
                                            resize: 'vertical',
                                            border: `1.5px solid ${C.badgeBorder}`,
                                            borderRadius: 8,
                                            background: C.inputBg,
                                            color: C.text,
                                            outline: 'none',
                                            fontFamily: 'inherit',
                                            lineHeight: 1.6,
                                            boxSizing: 'border-box',
                                            display: 'block',
                                          }}
                                        />
                                      </div>
                                    </div>
                                  ) : head?.appointmentMethod || head?.notes ? (
                                    <>
                                      <CabS.HeadTenureInfoBadge
                                        $type="appointment"
                                        style={{ width: 'fit-content' }}
                                      >
                                        <CabS.HeadTenureInfoBadgeLabel>
                                          임명
                                        </CabS.HeadTenureInfoBadgeLabel>
                                        {APPOINTMENT_METHOD_LABEL[
                                          head.appointmentMethod
                                        ] ?? head.appointmentMethod}
                                      </CabS.HeadTenureInfoBadge>
                                      {head.notes && (
                                        <CabS.HeadTenureInfoRow $block>
                                          <CabS.HeadTenureInfoLabel>
                                            취임 배경 / 비고
                                          </CabS.HeadTenureInfoLabel>
                                          <CabS.HeadTenureInfoText>
                                            {head.notes}
                                          </CabS.HeadTenureInfoText>
                                        </CabS.HeadTenureInfoRow>
                                      )}
                                    </>
                                  ) : (
                                    <p
                                      style={{
                                        margin: '2px 0 0',
                                        fontSize: 12,
                                        color: C.textFaint,
                                      }}
                                    >
                                      — 등록된 정보 없음
                                    </p>
                                  )}
                                </CabS.HeadTenureInfoSection>

                                {/* 구분선 */}

                                {/* ── 퇴임 정보 ── */}
                                <CabS.HeadTenureInfoSection $accent="rose">
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      marginBottom:
                                        !!editingTenureInfo &&
                                        editingTenureInfo.cabinetId ===
                                          selectedCabinet.id &&
                                        editingTenureInfo.mode === 'end'
                                          ? 10
                                          : 0,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: C.sectionLabelTint,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                      }}
                                    >
                                      <span
                                        style={{
                                          width: 6,
                                          height: 6,
                                          borderRadius: '50%',
                                          background: '#fca5a5',
                                          flexShrink: 0,
                                          display: 'inline-block',
                                        }}
                                      />
                                      퇴임 정보
                                    </span>
                                    {!!editingTenureInfo &&
                                    editingTenureInfo.cabinetId ===
                                      selectedCabinet.id &&
                                    editingTenureInfo.mode === 'end' ? (
                                      <div style={{ display: 'flex', gap: 6 }}>
                                        <button
                                          type="button"
                                          disabled={tenureInfoSubmitting}
                                          onClick={() =>
                                            handleSaveTenureInfoInline(
                                              selectedCabinet.id,
                                              head.id,
                                            )
                                          }
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            padding: '4px 12px',
                                            fontSize: 11.5,
                                            fontWeight: 700,
                                            color: '#fff',
                                            background: '#6366f1',
                                            border: 'none',
                                            borderRadius: 7,
                                            cursor: 'pointer',
                                          }}
                                        >
                                          {tenureInfoSubmitting
                                            ? '저장 중…'
                                            : '저장'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setEditingTenureInfo(null)
                                          }
                                          style={{
                                            padding: '4px 10px',
                                            fontSize: 11.5,
                                            fontWeight: 600,
                                            color: C.slate400,
                                            background: 'transparent',
                                            border: `1px solid ${C.borderHairline12}`,
                                            borderRadius: 7,
                                            cursor: 'pointer',
                                          }}
                                        >
                                          취소
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingEndReason(
                                            head?.endReason ?? '',
                                          )
                                          setEditingEndReasonDetail(
                                            head?.endReasonDetail ?? '',
                                          )
                                          setEditingTenureInfo({
                                            cabinetId: selectedCabinet.id,
                                            mode: 'end',
                                          })
                                        }}
                                        style={{
                                          fontSize: 12,
                                          fontWeight: 600,
                                          color: C.chipActionColor,
                                          background: 'transparent',
                                          border: 'none',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 4,
                                          padding: '4px 8px',
                                          borderRadius: 6,
                                        }}
                                      >
                                        <FiPlus size={12} />
                                        {head?.endReason ||
                                        head?.endReasonDetail
                                          ? '수정'
                                          : '등록'}
                                      </button>
                                    )}
                                  </div>
                                  {!!editingTenureInfo &&
                                  editingTenureInfo.cabinetId ===
                                    selectedCabinet.id &&
                                  editingTenureInfo.mode === 'end' ? (
                                    <div
                                      style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 10,
                                      }}
                                    >
                                      <div>
                                        <label
                                          style={{
                                            display: 'block',
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: C.slate400,
                                            marginBottom: 4,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                          }}
                                        >
                                          퇴임 사유
                                        </label>
                                        <select
                                          value={editingEndReason}
                                          onChange={(e) =>
                                            setEditingEndReason(e.target.value)
                                          }
                                          style={{
                                            maxWidth: 280,
                                            width: '100%',
                                            padding: '8px 10px',
                                            fontSize: 13,
                                            border: `1.5px solid ${C.badgeBorder}`,
                                            borderRadius: 8,
                                            background: C.inputBg,
                                            color: C.text,
                                            outline: 'none',
                                          }}
                                        >
                                          <option value="">선택 안 함</option>
                                          {Object.entries(END_REASON_LABEL).map(
                                            ([k, v]) => (
                                              <option key={k} value={k}>
                                                {v}
                                              </option>
                                            ),
                                          )}
                                        </select>
                                      </div>
                                      <div>
                                        <label
                                          style={{
                                            display: 'block',
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: C.slate400,
                                            marginBottom: 4,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                          }}
                                        >
                                          퇴임 상세
                                        </label>
                                        <textarea
                                          value={editingEndReasonDetail}
                                          onChange={(e) =>
                                            setEditingEndReasonDetail(
                                              e.target.value,
                                            )
                                          }
                                          rows={3}
                                          placeholder="퇴임 경위, 상세 내용 등"
                                          style={{
                                            maxWidth: 500,
                                            height: 200,
                                            width: '100%',
                                            padding: '8px 10px',
                                            fontSize: 13,
                                            resize: 'vertical',
                                            border: `1.5px solid ${C.badgeBorder}`,
                                            borderRadius: 8,
                                            background: C.inputBg,
                                            color: C.text,
                                            outline: 'none',
                                            fontFamily: 'inherit',
                                            lineHeight: 1.6,
                                            boxSizing: 'border-box',
                                            display: 'block',
                                          }}
                                        />
                                      </div>
                                    </div>
                                  ) : head?.endReason ||
                                    head?.endReasonDetail ? (
                                    <>
                                      <CabS.HeadTenureInfoBadge
                                        $type="end"
                                        style={{ width: 'fit-content' }}
                                      >
                                        <CabS.HeadTenureInfoBadgeLabel>
                                          퇴임
                                        </CabS.HeadTenureInfoBadgeLabel>
                                        {END_REASON_LABEL[head.endReason] ??
                                          head.endReason}
                                      </CabS.HeadTenureInfoBadge>
                                      {head.endReasonDetail && (
                                        <CabS.HeadTenureInfoRow $block>
                                          <CabS.HeadTenureInfoLabel>
                                            퇴임 상세
                                          </CabS.HeadTenureInfoLabel>
                                          <CabS.HeadTenureInfoText>
                                            {head.endReasonDetail}
                                          </CabS.HeadTenureInfoText>
                                        </CabS.HeadTenureInfoRow>
                                      )}
                                    </>
                                  ) : (
                                    <p
                                      style={{
                                        margin: '2px 0 0',
                                        fontSize: 12,
                                        color: C.textFaint,
                                      }}
                                    >
                                      — 등록된 정보 없음
                                    </p>
                                  )}
                                </CabS.HeadTenureInfoSection>
                              </CabS.CabDetailScrollSection>
                            </>
                          )}

                          {/* 수반 재임 히스토리 — 각료와 동일: 목록 영역만 상세 전환 */}
                          <CabS.HeadTenureInfoSection>
                            {selectedHeadHistoryId ? (
                              (() => {
                                const selAch = Array.isArray(head.achievements)
                                  ? head.achievements.find(
                                      (a: any) =>
                                        a.id === selectedHeadHistoryId,
                                    )
                                  : null
                                if (!selAch) return null
                                if (!head?.id) return null
                                const achStartDate = selAch.startDate
                                  ? formatDate(selAch.startDate)
                                  : null
                                const achEndDate = selAch.endDate
                                  ? formatDate(selAch.endDate)
                                  : null
                                const hasContent = !!selAch.description?.trim()
                                return (
                                  <CabS.HistoryArticleWrap>
                                    <CabS.HistoryArticleTopBar>
                                      <CabS.HistoryArticleBackBtn
                                        type="button"
                                        onClick={() => {
                                          setSelectedHeadHistoryId(null)
                                          setEditingHistoryContent(false)
                                          setEditingHistoryMeta(false)
                                        }}
                                      >
                                        <FiChevronLeft size={13} />
                                        재임 히스토리 목록
                                      </CabS.HistoryArticleBackBtn>
                                      <CabS.HistoryArticleDeleteBtn
                                        type="button"
                                        onClick={() =>
                                          deleteMinisterHistoryDirect(
                                            head.id,
                                            selAch.id,
                                          )
                                        }
                                      >
                                        <FiTrash2 size={13} />
                                        삭제
                                      </CabS.HistoryArticleDeleteBtn>
                                    </CabS.HistoryArticleTopBar>

                                    {/* 제목/날짜 영역: 100% width, 별도 수정 버튼 */}
                                    <CabS.HistoryArticleMetaSection>
                                      {editingHistoryMeta ? (
                                        <>
                                          <CabS.HistoryMetaForm>
                                            <CabS.HistoryMetaInput
                                              type="text"
                                              value={historyMetaTitle}
                                              onChange={(e) =>
                                                setHistoryMetaTitle(
                                                  e.target.value,
                                                )
                                              }
                                              placeholder="히스토리 제목"
                                            />
                                            <CabS.HistoryMetaDateRow>
                                              <CabS.HistoryMetaDateInput
                                                type="date"
                                                value={historyMetaStartDate}
                                                onChange={(e) =>
                                                  setHistoryMetaStartDate(
                                                    e.target.value,
                                                  )
                                                }
                                              />
                                              <span
                                                style={{
                                                  color: C.textFaint,
                                                  fontSize: 13,
                                                }}
                                              >
                                                –
                                              </span>
                                              <CabS.HistoryMetaDateInput
                                                type="date"
                                                value={historyMetaEndDate}
                                                onChange={(e) =>
                                                  setHistoryMetaEndDate(
                                                    e.target.value,
                                                  )
                                                }
                                              />
                                            </CabS.HistoryMetaDateRow>
                                          </CabS.HistoryMetaForm>
                                          <CabS.HistoryArticleEditActions
                                            style={{ marginTop: 12 }}
                                          >
                                            <CabS.HistoryArticleCancelBtn
                                              type="button"
                                              onClick={() =>
                                                setEditingHistoryMeta(false)
                                              }
                                              disabled={historyMetaSaving}
                                            >
                                              취소
                                            </CabS.HistoryArticleCancelBtn>
                                            <CabS.HistoryArticleSaveBtn
                                              type="button"
                                              onClick={() =>
                                                saveHistoryMeta(
                                                  head.id,
                                                  selAch.id,
                                                )
                                              }
                                              disabled={
                                                historyMetaSaving ||
                                                !historyMetaTitle.trim()
                                              }
                                              $isRegister={false}
                                            >
                                              {historyMetaSaving
                                                ? '저장 중…'
                                                : '저장'}
                                            </CabS.HistoryArticleSaveBtn>
                                          </CabS.HistoryArticleEditActions>
                                        </>
                                      ) : (
                                        <>
                                          <CabS.HistoryHeadlineRow>
                                            <CabS.HistoryArticleHeadline>
                                              {selAch.title}
                                            </CabS.HistoryArticleHeadline>
                                            <CabS.HistoryMetaEditBtn
                                              type="button"
                                              onClick={() => {
                                                setHistoryMetaTitle(
                                                  selAch.title ?? '',
                                                )
                                                setHistoryMetaStartDate(
                                                  selAch.startDate
                                                    ? String(
                                                        selAch.startDate,
                                                      ).slice(0, 10)
                                                    : '',
                                                )
                                                setHistoryMetaEndDate(
                                                  selAch.endDate
                                                    ? String(
                                                        selAch.endDate,
                                                      ).slice(0, 10)
                                                    : '',
                                                )
                                                setEditingHistoryMeta(true)
                                              }}
                                            >
                                              <FiEdit2 size={11} />
                                            </CabS.HistoryMetaEditBtn>
                                          </CabS.HistoryHeadlineRow>
                                          {(achStartDate || achEndDate) && (
                                            <CabS.HistoryArticleByline>
                                              {achStartDate && (
                                                <span>{achStartDate}</span>
                                              )}
                                              {achStartDate && achEndDate && (
                                                <span> – </span>
                                              )}
                                              {achEndDate && (
                                                <span>{achEndDate}</span>
                                              )}
                                            </CabS.HistoryArticleByline>
                                          )}
                                        </>
                                      )}
                                    </CabS.HistoryArticleMetaSection>

                                    <CabS.HistoryArticleDivider />

                                    {/* 본문 영역: max-width 680px 가운데 */}
                                    <CabS.HistoryArticleInner>
                                      <CabS.HistoryArticleContentBar>
                                        {!editingHistoryContent && (
                                          <CabS.HistoryArticleEditBtn
                                            type="button"
                                            style={{ marginLeft: 'auto' }}
                                            onClick={() => {
                                              setHistoryDraftContent(
                                                selAch.description ?? '',
                                              )
                                              setEditingHistoryContent(true)
                                            }}
                                          >
                                            <FiEdit2 size={13} />
                                            {hasContent ? '수정' : '추가'}
                                          </CabS.HistoryArticleEditBtn>
                                        )}
                                      </CabS.HistoryArticleContentBar>

                                      {editingHistoryContent ? (
                                        <>
                                          <CabS.HistoryArticleEditorWrap>
                                            <RichTextEditor
                                              value={historyDraftContent}
                                              onChange={setHistoryDraftContent}
                                              showTitle={false}
                                              placeholder={
                                                hasContent
                                                  ? '본문을 수정하세요.'
                                                  : '본문 내용을 입력하세요.'
                                              }
                                              onImageUpload={async (file) => {
                                                const result =
                                                  await uploadImage(
                                                    file,
                                                    'persons',
                                                  )
                                                return (
                                                  getUploadImageUrl(
                                                    result.url,
                                                  ) ||
                                                  (result.url ?? '')
                                                )
                                              }}
                                            />
                                          </CabS.HistoryArticleEditorWrap>
                                          <CabS.HistoryArticleEditActions>
                                            <CabS.HistoryArticleCancelBtn
                                              type="button"
                                              onClick={() => {
                                                setEditingHistoryContent(false)
                                                setHistoryDraftContent('')
                                              }}
                                              disabled={historyContentSaving}
                                            >
                                              취소
                                            </CabS.HistoryArticleCancelBtn>
                                            <CabS.HistoryArticleSaveBtn
                                              type="button"
                                              onClick={() =>
                                                saveHistoryDescription(
                                                  head.id,
                                                  selAch.id,
                                                  historyDraftContent,
                                                )
                                              }
                                              disabled={historyContentSaving}
                                              $isRegister={!hasContent}
                                            >
                                              {historyContentSaving
                                                ? hasContent
                                                  ? '저장 중…'
                                                  : '등록 중…'
                                                : hasContent
                                                  ? '저장'
                                                  : '등록'}
                                            </CabS.HistoryArticleSaveBtn>
                                          </CabS.HistoryArticleEditActions>
                                        </>
                                      ) : hasContent ? (
                                        <div
                                          onClick={handleHistoryProseClick}
                                          role="presentation"
                                        >
                                          <CabS.HistoryArticleProse
                                            html={selAch.description ?? ''}
                                          />
                                        </div>
                                      ) : (
                                        <CabS.HistoryArticleEmpty>
                                          본문 내용이 없습니다.
                                        </CabS.HistoryArticleEmpty>
                                      )}
                                    </CabS.HistoryArticleInner>
                                  </CabS.HistoryArticleWrap>
                                )
                              })()
                            ) : (
                              <>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 13,
                                      fontWeight: 700,
                                      color: C.sectionHeading,
                                    }}
                                  >
                                    재임 히스토리
                                    {Array.isArray(head?.achievements) &&
                                    head.achievements.length > 0
                                      ? ` (${head.achievements.length})`
                                      : ''}
                                  </span>
                                  {Array.isArray(head?.achievements) &&
                                    head.achievements.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openMinisterHistoryModal(head)
                                        }
                                        style={{
                                          fontSize: 12,
                                          fontWeight: 600,
                                          color: C.chipActionColor,
                                          background: 'transparent',
                                          border: 'none',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 4,
                                          padding: '4px 8px',
                                          borderRadius: 6,
                                        }}
                                      >
                                        <FiPlus size={12} />
                                        추가
                                      </button>
                                    )}
                                </div>
                                {Array.isArray(head?.achievements) &&
                                head.achievements.length > 0 ? (
                                  <CabS.HistoryCardList>
                                    {head.achievements.map((ach: any) => (
                                      <CabS.HistoryCard
                                        key={ach.id}
                                        onClick={() =>
                                          setSelectedHeadHistoryId(ach.id)
                                        }
                                      >
                                        <CabS.HistoryCardTitle>
                                          {ach.title}
                                        </CabS.HistoryCardTitle>
                                        {(ach.startDate || ach.endDate) && (
                                          <CabS.HistoryCardMeta>
                                            {ach.startDate
                                              ? formatDate(ach.startDate)
                                              : '—'}
                                            {' – '}
                                            {ach.endDate
                                              ? formatDate(ach.endDate)
                                              : '현재'}
                                          </CabS.HistoryCardMeta>
                                        )}
                                        {ach.description && (
                                          <CabS.HistoryCardExcerpt>
                                            {stripHtmlToPlain(
                                              ach.description,
                                              80,
                                            )}
                                          </CabS.HistoryCardExcerpt>
                                        )}
                                        <CabS.HistoryCardChevron>
                                          <FiChevronRight size={13} />
                                        </CabS.HistoryCardChevron>
                                        <CabS.HistoryCardDeleteBtn
                                          type="button"
                                          title="삭제"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            deleteMinisterHistoryDirect(
                                              head.id,
                                              ach.id,
                                            )
                                          }}
                                        >
                                          <FiTrash2 size={12} />
                                        </CabS.HistoryCardDeleteBtn>
                                      </CabS.HistoryCard>
                                    ))}
                                  </CabS.HistoryCardList>
                                ) : (
                                  <CabS.CabDetailEmptyStack $padding="20px 0">
                                    <CabS.CabDetailEmptyText
                                      $fontSize="12px"
                                      $muted
                                    >
                                      등록된 재임 히스토리가 없습니다.
                                    </CabS.CabDetailEmptyText>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openMinisterHistoryModal(head)
                                      }
                                      style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: C.chipActionColor,
                                        background: C.chipActionBg,
                                        border: `1px solid ${C.chipActionBorder}`,
                                        borderRadius: 8,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        padding: '6px 14px',
                                      }}
                                    >
                                      <FiPlus size={12} />
                                      등록
                                    </button>
                                  </CabS.CabDetailEmptyStack>
                                )}
                              </>
                            )}
                          </CabS.HeadTenureInfoSection>

                          {!selectedHeadHistoryId && (
                            <>
                              {/* 각료 목록 */}
                              <CabS.CabDetailMinistersSection
                                id="cab-detail-ministers"
                                style={{ scrollMarginTop: 12 }}
                              >
                                <CabS.CabDetailMinistersSectionHeader>
                                  <CabS.CabDetailMinistersSectionTitle>
                                    각료
                                  </CabS.CabDetailMinistersSectionTitle>
                                  <CabS.CabResultCount
                                    style={{ marginLeft: 6 }}
                                  >
                                    {loadingCabinetMinisters
                                      ? '…'
                                      : `${sortedVisibleMinisters.length}명`}
                                  </CabS.CabResultCount>
                                  <div style={{ flex: 1 }} />
                                  {/* 검색창 — 6명 초과일 때만 표시, 추가 버튼 왼쪽 */}
                                  {sortedVisibleMinisters.length > 5 && (
                                    <CabS.CabSearchWrap
                                      style={{
                                        maxWidth: 180,
                                        margin: '0 8px 0 0',
                                      }}
                                    >
                                      <CabS.CabSearchIcon>
                                        <FiSearch size={14} />
                                      </CabS.CabSearchIcon>
                                      <CabS.CabSearchInput
                                        type="text"
                                        placeholder="각료명, 직위..."
                                        value={ministerSearchQuery}
                                        onChange={(e) =>
                                          setMinisterSearchQuery(e.target.value)
                                        }
                                        style={{ height: 32, fontSize: 12 }}
                                      />
                                      {ministerSearchQuery.trim() && (
                                        <CabS.CabSearchClear
                                          type="button"
                                          onClick={() =>
                                            setMinisterSearchQuery('')
                                          }
                                        >
                                          <FiX size={12} />
                                        </CabS.CabSearchClear>
                                      )}
                                    </CabS.CabSearchWrap>
                                  )}
                                  {!loadingCabinetMinisters &&
                                    sortedVisibleMinisters.length > 0 && (
                                      <SubsectionAddBtn
                                        type="button"
                                        onClick={() =>
                                          handleAddMinister(selectedCabinet)
                                        }
                                      >
                                        <FiPlus size={14} strokeWidth={2.25} />
                                        각료 추가
                                      </SubsectionAddBtn>
                                    )}
                                </CabS.CabDetailMinistersSectionHeader>

                                {loadingCabinetMinisters ? (
                                  <CabS.CabMinistersLoadingBox
                                    aria-busy="true"
                                    aria-live="polite"
                                  >
                                    각료 불러오는 중…
                                  </CabS.CabMinistersLoadingBox>
                                ) : sortedVisibleMinisters.length === 0 ? (
                                  ministerSearchQuery.trim() ? (
                                    <CabS.EmptyStateBox>
                                      검색 결과가 없습니다.
                                    </CabS.EmptyStateBox>
                                  ) : (
                                    <CabS.CabDetailEmptyStack $padding="32px 0">
                                      <CabS.CabDetailEmptyText>
                                        등록된 각료가 없습니다.
                                      </CabS.CabDetailEmptyText>
                                      <SubsectionAddBtn
                                        type="button"
                                        onClick={() =>
                                          handleAddMinister(selectedCabinet)
                                        }
                                      >
                                        <FiPlus size={14} strokeWidth={2.25} />
                                        각료 추가
                                      </SubsectionAddBtn>
                                    </CabS.CabDetailEmptyStack>
                                  )
                                ) : (
                                  <CabinetMinisterCards
                                    selectedMinisterId={selectedMinisterId}
                                    ministers={sortedVisibleMinisters}
                                    onSelectMinister={(tenureId) => {
                                      setSelectedHeadHistoryId(null)
                                      setSelectedMinisterId(tenureId)
                                    }}
                                    onMentionPerson={setMentionPersonId}
                                  />
                                )}
                              </CabS.CabDetailMinistersSection>

                              {/* 조약 섹션 */}
                              <CabS.CabDetailSubSection
                                id="cab-detail-treaties"
                                style={{ marginTop: 24, scrollMarginTop: 12 }}
                              >
                                <CabS.CabDetailMinistersSectionHeader>
                                  <FiFileText
                                    size={15}
                                    style={{ color: MAIN }}
                                  />
                                  <CabS.CabDetailMinistersSectionTitle>
                                    체결 조약
                                  </CabS.CabDetailMinistersSectionTitle>
                                  <CabS.CabResultCount
                                    style={{ marginLeft: 6 }}
                                  >
                                    {cabinetTreaties.length}건
                                  </CabS.CabResultCount>
                                  <div style={{ flex: 1 }} />
                                  <SubsectionAddBtn
                                    type="button"
                                    onClick={() => setShowTreatyLinkModal(true)}
                                  >
                                    <FiLink size={14} strokeWidth={2.25} />
                                    조약 연결
                                  </SubsectionAddBtn>
                                </CabS.CabDetailMinistersSectionHeader>

                                {loadingCabinetTreaties ? (
                                  <CabS.EmptyStateBox>
                                    불러오는 중…
                                  </CabS.EmptyStateBox>
                                ) : cabinetTreaties.length === 0 ? (
                                  <CabS.CabDetailEmptyStack>
                                    <FiFileText
                                      size={32}
                                      style={{ color: C.placeholderText }}
                                    />
                                    <CabS.CabDetailEmptyText>
                                      연결된 조약이 없습니다.
                                    </CabS.CabDetailEmptyText>
                                    <SubsectionAddBtn
                                      type="button"
                                      onClick={() =>
                                        setShowTreatyLinkModal(true)
                                      }
                                    >
                                      <FiLink size={14} strokeWidth={2.25} />
                                      조약 연결
                                    </SubsectionAddBtn>
                                  </CabS.CabDetailEmptyStack>
                                ) : (
                                  <CabS.CabDetailTreatyList>
                                    {cabinetTreaties.map((treaty) => {
                                      const signatory =
                                        treaty.signatories?.find(
                                          (s) =>
                                            s.cabinetId === selectedCabinetId,
                                        )
                                      const isExpanded =
                                        selectedTreatyId === treaty.id
                                      return (
                                        <CabS.CabDetailTreatyCard
                                          key={treaty.id}
                                          $expanded={isExpanded}
                                          $accent={MAIN}
                                          $borderIdle={C.borderHairline}
                                        >
                                          <CabS.CabDetailTreatyCardBtn
                                            onClick={() =>
                                              setSelectedTreatyId(
                                                isExpanded ? null : treaty.id,
                                              )
                                            }
                                          >
                                            <CabS.CabDetailTreatyTypeChip
                                              $accent={MAIN}
                                            >
                                              {TREATY_TYPE_LABELS[
                                                treaty.type
                                              ] ?? treaty.type}
                                            </CabS.CabDetailTreatyTypeChip>
                                            <CabS.CabDetailTreatyTitleCell>
                                              {treaty.name}
                                              {treaty.alias && (
                                                <CabS.CabDetailTreatyAlias>
                                                  ({treaty.alias})
                                                </CabS.CabDetailTreatyAlias>
                                              )}
                                            </CabS.CabDetailTreatyTitleCell>
                                            <CabS.CabDetailTreatyYearCell>
                                              {treaty.signDate
                                                ? new Date(
                                                    treaty.signDate,
                                                  ).getFullYear()
                                                : '—'}
                                            </CabS.CabDetailTreatyYearCell>
                                            <CabS.CabDetailTreatyChevronWrap
                                              $expanded={isExpanded}
                                            >
                                              <FiChevronDown size={14} />
                                            </CabS.CabDetailTreatyChevronWrap>
                                          </CabS.CabDetailTreatyCardBtn>

                                          {isExpanded && (
                                            <CabS.CabDetailTreatyExpandedPanel>
                                              <CabS.CabDetailTreatySectionTitle>
                                                이 행정부 연결
                                              </CabS.CabDetailTreatySectionTitle>
                                              {signatory ? (
                                                <CabS.CabDetailTreatySignatoryRow>
                                                  {signatory.person && (
                                                    <CabS.CabDetailTreatyMetaText>
                                                      서명자:{' '}
                                                      <strong>
                                                        {getPersonName(
                                                          signatory.person,
                                                        )}
                                                      </strong>
                                                    </CabS.CabDetailTreatyMetaText>
                                                  )}
                                                  {signatory.role && (
                                                    <CabS.CabDetailTreatyMetaText>
                                                      직책:{' '}
                                                      <strong>
                                                        {signatory.role}
                                                      </strong>
                                                    </CabS.CabDetailTreatyMetaText>
                                                  )}
                                                  <CabS.CabDetailTreatyMetaText>
                                                    참여유형:{' '}
                                                    <strong>
                                                      {TREATY_PARTICIPATION_LABELS[
                                                        signatory
                                                          .participationType
                                                      ] ??
                                                        signatory.participationType}
                                                    </strong>
                                                  </CabS.CabDetailTreatyMetaText>
                                                  {signatory.signedAt && (
                                                    <CabS.CabDetailTreatyMetaText>
                                                      서명 시각:{' '}
                                                      <strong>
                                                        {formatDate(
                                                          signatory.signedAt,
                                                        )}
                                                      </strong>
                                                    </CabS.CabDetailTreatyMetaText>
                                                  )}
                                                  {signatory.note?.trim() && (
                                                    <CabS.CabDetailTreatyMetaText>
                                                      비고:{' '}
                                                      <strong>
                                                        {signatory.note}
                                                      </strong>
                                                    </CabS.CabDetailTreatyMetaText>
                                                  )}
                                                </CabS.CabDetailTreatySignatoryRow>
                                              ) : (
                                                <CabS.CabDetailTreatyMetaText>
                                                  이 행정부와 직접 연결된 서명
                                                  행을 찾지 못했습니다. 아래
                                                  「서명·참여」에서 전체 서명국을
                                                  확인하세요.
                                                </CabS.CabDetailTreatyMetaText>
                                              )}

                                              <CabS.CabDetailTreatySectionTitle
                                                $spaced
                                              >
                                                조약 정보
                                              </CabS.CabDetailTreatySectionTitle>
                                              <CabS.CabDetailTreatyInfoRows>
                                                <CabS.CabDetailTreatyInfoDt>
                                                  서명일
                                                </CabS.CabDetailTreatyInfoDt>
                                                <CabS.CabDetailTreatyInfoDd>
                                                  {treaty.signDate
                                                    ? formatDate(
                                                        treaty.signDate,
                                                      )
                                                    : '—'}
                                                </CabS.CabDetailTreatyInfoDd>
                                                <CabS.CabDetailTreatyInfoDt>
                                                  발효일
                                                </CabS.CabDetailTreatyInfoDt>
                                                <CabS.CabDetailTreatyInfoDd>
                                                  {treaty.effectiveDate
                                                    ? formatDate(
                                                        treaty.effectiveDate,
                                                      )
                                                    : '—'}
                                                </CabS.CabDetailTreatyInfoDd>
                                                <CabS.CabDetailTreatyInfoDt>
                                                  만료일
                                                </CabS.CabDetailTreatyInfoDt>
                                                <CabS.CabDetailTreatyInfoDd>
                                                  {treaty.expiryDate
                                                    ? formatDate(
                                                        treaty.expiryDate,
                                                      )
                                                    : '—'}
                                                </CabS.CabDetailTreatyInfoDd>
                                                <CabS.CabDetailTreatyInfoDt>
                                                  위치
                                                </CabS.CabDetailTreatyInfoDt>
                                                <CabS.CabDetailTreatyInfoDd>
                                                  {treaty.location?.trim() ||
                                                    '—'}
                                                </CabS.CabDetailTreatyInfoDd>
                                                <CabS.CabDetailTreatyInfoDt>
                                                  서명 장소
                                                </CabS.CabDetailTreatyInfoDt>
                                                <CabS.CabDetailTreatyInfoDd>
                                                  {treaty.signingAdministrativeDivision
                                                    ? [
                                                        treaty
                                                          .signingAdministrativeDivision
                                                          .name,
                                                        treaty
                                                          .signingAdministrativeDivision
                                                          .localName,
                                                      ]
                                                        .filter(Boolean)
                                                        .join(' · ') || '—'
                                                    : '—'}
                                                </CabS.CabDetailTreatyInfoDd>
                                                {(treaty.violationDate ||
                                                  treaty.violationReason?.trim()) && (
                                                  <>
                                                    <CabS.CabDetailTreatyInfoDt>
                                                      파기·위반
                                                    </CabS.CabDetailTreatyInfoDt>
                                                    <CabS.CabDetailTreatyInfoDd>
                                                      {treaty.violationDate
                                                        ? formatDate(
                                                            treaty.violationDate,
                                                          )
                                                        : '—'}
                                                      {treaty.violationReason?.trim()
                                                        ? ` — ${treaty.violationReason}`
                                                        : ''}
                                                    </CabS.CabDetailTreatyInfoDd>
                                                  </>
                                                )}
                                              </CabS.CabDetailTreatyInfoRows>

                                              {treaty.summary?.trim() && (
                                                <>
                                                  <CabS.CabDetailTreatySectionTitle
                                                    $spaced
                                                  >
                                                    요약
                                                  </CabS.CabDetailTreatySectionTitle>
                                                  <CabS.CabDetailTreatyBodyPara>
                                                    {treaty.summary}
                                                  </CabS.CabDetailTreatyBodyPara>
                                                </>
                                              )}
                                              {treaty.background?.trim() && (
                                                <>
                                                  <CabS.CabDetailTreatySectionTitle
                                                    $spaced
                                                  >
                                                    배경
                                                  </CabS.CabDetailTreatySectionTitle>
                                                  <CabS.CabDetailTreatyBodyPara>
                                                    {treaty.background}
                                                  </CabS.CabDetailTreatyBodyPara>
                                                </>
                                              )}
                                              {treaty.aftermath?.trim() && (
                                                <>
                                                  <CabS.CabDetailTreatySectionTitle
                                                    $spaced
                                                  >
                                                    이후 영향
                                                  </CabS.CabDetailTreatySectionTitle>
                                                  <CabS.CabDetailTreatyBodyPara>
                                                    {treaty.aftermath}
                                                  </CabS.CabDetailTreatyBodyPara>
                                                </>
                                              )}

                                              {treaty.terms &&
                                                treaty.terms.length > 0 && (
                                                  <>
                                                    <CabS.CabDetailTreatySectionTitle
                                                      $spaced
                                                    >
                                                      조항 ({treaty.terms.length})
                                                    </CabS.CabDetailTreatySectionTitle>
                                                    <CabS.CabDetailTreatyTermList>
                                                      {treaty.terms.map(
                                                        (term) => (
                                                          <CabS.CabDetailTreatyTermItem
                                                            key={term.id}
                                                          >
                                                            <CabS.CabDetailTreatyTermTitle>
                                                              {term.title?.trim() ||
                                                                `조항 ${term.order}`}
                                                              {term.isSecret
                                                                ? ' · 비밀'
                                                                : ''}
                                                            </CabS.CabDetailTreatyTermTitle>
                                                            <CabS.CabDetailTreatyTermExcerpt>
                                                              {stripHtmlToPlain(
                                                                term.content,
                                                                500,
                                                              )}
                                                            </CabS.CabDetailTreatyTermExcerpt>
                                                          </CabS.CabDetailTreatyTermItem>
                                                        ),
                                                      )}
                                                    </CabS.CabDetailTreatyTermList>
                                                  </>
                                                )}

                                              {treaty.signatories &&
                                                treaty.signatories.length >
                                                  0 && (
                                                  <>
                                                    <CabS.CabDetailTreatySectionTitle
                                                      $spaced
                                                    >
                                                      서명·참여 국가
                                                    </CabS.CabDetailTreatySectionTitle>
                                                    <CabS.CabDetailTreatyPillRow>
                                                      {treaty.signatories.map(
                                                        (s) => (
                                                          <CabS.CabDetailTreatyCountryPill
                                                            key={s.id}
                                                          >
                                                            {s.country?.name ??
                                                              s
                                                                .historicalCountry
                                                                ?.name ??
                                                              '미상'}
                                                          </CabS.CabDetailTreatyCountryPill>
                                                        ),
                                                      )}
                                                    </CabS.CabDetailTreatyPillRow>
                                                    <CabS.CabDetailTreatySectionTitle
                                                      $spaced
                                                    >
                                                      서명 행 상세
                                                    </CabS.CabDetailTreatySectionTitle>
                                                    <CabS.CabDetailTreatySigTable>
                                                      {treaty.signatories.map(
                                                        (s) => (
                                                          <CabS.CabDetailTreatySigRow
                                                            key={s.id}
                                                          >
                                                            <div>
                                                              <CabS.CabDetailTreatySigCountry>
                                                                {s.country
                                                                  ?.flagEmoji
                                                                  ? `${s.country.flagEmoji} `
                                                                  : ''}
                                                                {s.country
                                                                  ?.name ??
                                                                  s
                                                                    .historicalCountry
                                                                    ?.name ??
                                                                  '미상'}
                                                              </CabS.CabDetailTreatySigCountry>
                                                              {s.cabinetId && (
                                                                <CabS.CabDetailTreatySigCabinetHint>
                                                                  행정부 연결됨
                                                                </CabS.CabDetailTreatySigCabinetHint>
                                                              )}
                                                            </div>
                                                            <div>
                                                              {s.person && (
                                                                <div>
                                                                  인물:{' '}
                                                                  {getPersonName(
                                                                    s.person,
                                                                  )}
                                                                </div>
                                                              )}
                                                              <div>
                                                                {
                                                                  TREATY_PARTICIPATION_LABELS[
                                                                    s.participationType
                                                                  ]
                                                                }
                                                                {s.role
                                                                  ? ` · ${s.role}`
                                                                  : ''}
                                                              </div>
                                                              {s.signedAt && (
                                                                <div>
                                                                  서명:{' '}
                                                                  {formatDate(
                                                                    s.signedAt,
                                                                  )}
                                                                </div>
                                                              )}
                                                              {s.positionDefinition
                                                                ?.title && (
                                                                <div>
                                                                  관직:{' '}
                                                                  {
                                                                    s
                                                                      .positionDefinition
                                                                      .title
                                                                  }
                                                                </div>
                                                              )}
                                                              {s.note?.trim() && (
                                                                <div>
                                                                  비고:{' '}
                                                                  {s.note}
                                                                </div>
                                                              )}
                                                            </div>
                                                          </CabS.CabDetailTreatySigRow>
                                                        ),
                                                      )}
                                                    </CabS.CabDetailTreatySigTable>
                                                  </>
                                                )}

                                              {treaty.images &&
                                                treaty.images.length > 0 && (
                                                  <>
                                                    <CabS.CabDetailTreatySectionTitle
                                                      $spaced
                                                    >
                                                      관련 이미지
                                                    </CabS.CabDetailTreatySectionTitle>
                                                    <CabS.CabDetailTreatyImageRow>
                                                      {treaty.images.map(
                                                        (img) => (
                                                          <CabS.CabDetailTreatyImageThumb
                                                            key={img.id}
                                                            src={getUploadImageUrl(
                                                              img.imageUrl,
                                                            )}
                                                            alt={
                                                              img.caption?.trim() ||
                                                              treaty.name
                                                            }
                                                            title={
                                                              img.caption?.trim() ||
                                                              undefined
                                                            }
                                                            loading="lazy"
                                                          />
                                                        ),
                                                      )}
                                                    </CabS.CabDetailTreatyImageRow>
                                                  </>
                                                )}
                                            </CabS.CabDetailTreatyExpandedPanel>
                                          )}
                                        </CabS.CabDetailTreatyCard>
                                      )
                                    })}
                                  </CabS.CabDetailTreatyList>
                                )}
                              </CabS.CabDetailSubSection>
                            </>
                          )}
                        </>
                      )
                    })()}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {historyTargetTenure && (
        <ModalOverlay
          role="dialog"
          aria-modal="true"
          aria-labelledby="cabinet-tenure-history-modal-title"
          onClick={closeHistoryModal}
        >
          <CabS.MinisterHistoryModalBox onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle id="cabinet-tenure-history-modal-title">
                {historyModalTitle}
              </ModalTitle>
              <ModalCloseButton
                type="button"
                onClick={closeHistoryModal}
                aria-label="닫기"
              >
                <FiX size={22} strokeWidth={2} />
              </ModalCloseButton>
            </ModalHeader>
            <CabS.MinisterHistoryModalBody>
              <CabS.MinisterHistoryTarget>
                <strong>{getPersonName(historyTargetTenure.person)}</strong> ·{' '}
                {historyTargetTenure.positionDefinition?.title ??
                  historyTargetTenure.title ??
                  '직위 미상'}
              </CabS.MinisterHistoryTarget>

              <CabS.MinisterHistorySection>
                <CabS.MinisterHistorySectionTitle>
                  등록된 히스토리
                </CabS.MinisterHistorySectionTitle>
                {Array.isArray(historyTargetTenure.achievements) &&
                historyTargetTenure.achievements.length > 0 ? (
                  <CabS.HistoryItemList>
                    {historyTargetTenure.achievements.map((a: any) => (
                      <CabS.HistoryItem key={a.id}>
                        <CabS.HistoryItemTop>
                          <CabS.HistoryItemTitle>
                            {a.title}
                          </CabS.HistoryItemTitle>
                          <CabS.HistoryItemActions>
                            <CabS.CardIconButton
                              type="button"
                              title="히스토리 수정"
                              onClick={() => startEditHistory(a)}
                            >
                              <FiEdit2 size={14} />
                            </CabS.CardIconButton>
                            <CabS.CardIconButton
                              type="button"
                              title="히스토리 삭제"
                              $danger
                              onClick={() => deleteMinisterHistory(a.id)}
                              disabled={historySubmitting}
                            >
                              <FiTrash2 size={14} />
                            </CabS.CardIconButton>
                          </CabS.HistoryItemActions>
                        </CabS.HistoryItemTop>
                        <CabS.HistoryItemMeta>
                          {a.startDate
                            ? formatDate(a.startDate)
                            : '시작일 미지정'}{' '}
                          ~{' '}
                          {a.endDate ? formatDate(a.endDate) : '종료일 미지정'}
                        </CabS.HistoryItemMeta>
                      </CabS.HistoryItem>
                    ))}
                  </CabS.HistoryItemList>
                ) : (
                  <CabS.MinisterEmptyText>
                    등록된 히스토리가 없습니다.
                  </CabS.MinisterEmptyText>
                )}
              </CabS.MinisterHistorySection>

              <CabS.MinisterHistorySection>
                <CabS.MinisterHistorySectionTitle>
                  {editingHistoryId ? '히스토리 수정' : '히스토리 등록'}
                </CabS.MinisterHistorySectionTitle>
                <FormRows>
                  <FieldRow>
                    <FieldLabel>
                      제목 <Required aria-label="필수" />
                    </FieldLabel>
                    <FieldControl>
                      <RegisterInput
                        type="text"
                        value={historyTitle}
                        onChange={(e) => setHistoryTitle(e.target.value)}
                        placeholder="예: 국방개혁 기본계획 수립"
                      />
                    </FieldControl>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>시작일 / 종료일 (선택)</FieldLabel>
                    <FieldControl>
                      <DateFieldsRow>
                        <RegisterInput
                          type="date"
                          value={historyStartDate}
                          onChange={(e) => setHistoryStartDate(e.target.value)}
                        />
                        <RegisterInput
                          type="date"
                          value={historyEndDate}
                          onChange={(e) => setHistoryEndDate(e.target.value)}
                        />
                      </DateFieldsRow>
                    </FieldControl>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>내용 (선택)</FieldLabel>
                    <FieldControl style={{ maxWidth: 'none' }}>
                      <RichTextEditor
                        value={historyDescription}
                        onChange={setHistoryDescription}
                        showTitle={false}
                        placeholder="재임 중 활동 내용을 입력하세요. 서식/이미지 입력이 가능합니다."
                        onImageUpload={async (file) => {
                          const result = await uploadImage(file, 'persons')
                          return (
                            getUploadImageUrl(result.url) ||
                            (result.url ?? '')
                          )
                        }}
                      />
                    </FieldControl>
                  </FieldRow>
                </FormRows>
                <CabS.MinisterHistoryActions>
                  {editingHistoryId && (
                    <CabS.HistorySecondaryButton
                      type="button"
                      onClick={resetHistoryForm}
                      disabled={historySubmitting}
                    >
                      수정 취소
                    </CabS.HistorySecondaryButton>
                  )}
                  <SubmitButton
                    type="button"
                    onClick={submitMinisterHistory}
                    disabled={historySubmitting || !historyTitle.trim()}
                  >
                    {historySubmitting
                      ? editingHistoryId
                        ? '수정 중…'
                        : '등록 중…'
                      : editingHistoryId
                        ? '수정 완료'
                        : '히스토리 등록'}
                  </SubmitButton>
                </CabS.MinisterHistoryActions>
              </CabS.MinisterHistorySection>
            </CabS.MinisterHistoryModalBody>
          </CabS.MinisterHistoryModalBox>{' '}
        </ModalOverlay>
      )}

      {registerCabinetModalOpen && (
        <RegisterCabinetModal
          registerFlow={registerFlow}
          setRegisterFlow={setRegisterFlow}
          headTenuresForRegister={headTenuresForRegister}
          handleRegisterCabinet={handleRegisterCabinet}
          handleRegisterNewHeadAndCabinet={handleRegisterNewHeadAndCabinet}
          registerCabinetSubmitting={registerCabinetSubmitting}
          setRegisterCabinetModalOpen={setRegisterCabinetModalOpen}
          allPersons={allPersons}
          headPositionOptions={headPositionOptions}
          newHeadPersonId={newHeadPersonId}
          setNewHeadPersonId={setNewHeadPersonId}
          newHeadPositionDefId={newHeadPositionDefId}
          setNewHeadPositionDefId={setNewHeadPositionDefId}
          newHeadTermNumber={newHeadTermNumber}
          setNewHeadTermNumber={setNewHeadTermNumber}
          newHeadSubTermNumber={newHeadSubTermNumber}
          setNewHeadSubTermNumber={setNewHeadSubTermNumber}
          newCabinetName={newCabinetName}
          setNewCabinetName={setNewCabinetName}
          newHeadAppointmentMethod={newHeadAppointmentMethod}
          setNewHeadAppointmentMethod={setNewHeadAppointmentMethod}
          newHeadEndReason={newHeadEndReason}
          setNewHeadEndReason={setNewHeadEndReason}
          newHeadEndReasonDetail={newHeadEndReasonDetail}
          setNewHeadEndReasonDetail={setNewHeadEndReasonDetail}
          newHeadNotes={newHeadNotes}
          setNewHeadNotes={setNewHeadNotes}
          newHeadStartDate={newHeadStartDate}
          setNewHeadStartDate={setNewHeadStartDate}
          newHeadEndDate={newHeadEndDate}
          setNewHeadEndDate={setNewHeadEndDate}
          country={country}
          registerTargetHistoricalCountryId={registerTargetHistoricalCountryId}
          setRegisterTargetHistoricalCountryId={
            setRegisterTargetHistoricalCountryId
          }
          resetNewHeadForm={resetNewHeadForm}
        />
      )}

      {editingCabinet && (
        <ModalOverlay
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-cabinet-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEditCabinetModal()
          }}
        >
          <CabS.CabinetModalBox onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle id="edit-cabinet-title">행정부 수정</ModalTitle>
              <ModalCloseButton
                type="button"
                onClick={closeEditCabinetModal}
                aria-label="닫기"
              >
                <FiX size={22} strokeWidth={2} />
              </ModalCloseButton>
            </ModalHeader>
            <CabS.CabinetModalBody>
              <CabS.CabinetFormDesc>
                <FiInfo size={20} />
                <span>
                  수반 재임의 핵심 정보(국가·인물·직위·취임/퇴임)는 등록 폼과
                  동일한 구성으로 수정할 수 있습니다.
                </span>
              </CabS.CabinetFormDesc>
              <FormRows>
                {/* 현대국가인 경우: 소속 국가 변경 (하위 역사국가 포함) */}
                {country.type === 'modern' &&
                  Array.isArray(country.historicalCountries) &&
                  country.historicalCountries.length > 0 && (
                    <FieldRow>
                      <FieldLabel>등록 대상 국가</FieldLabel>
                      <FieldControl>
                        <CabS.CabinetSelectNative
                          value={
                            editingTargetType === 'historical'
                              ? (editingTargetHistoricalCountryId ?? '')
                              : ''
                          }
                          onChange={(e) => {
                            if (e.target.value === '') {
                              setEditingTargetType('modern')
                              setEditingTargetHistoricalCountryId(null)
                            } else {
                              setEditingTargetType('historical')
                              setEditingTargetHistoricalCountryId(
                                e.target.value,
                              )
                            }
                          }}
                        >
                          <option value="">{country.name} (현대국가)</option>
                          {country.historicalCountries.map((hc) => (
                            <option key={hc.id} value={hc.id}>
                              {hc.name}
                            </option>
                          ))}
                        </CabS.CabinetSelectNative>
                      </FieldControl>
                    </FieldRow>
                  )}
                {/* 역사국가인 경우: 소속 국가 읽기 전용 표시 */}
                {country.type === 'historical' && (
                  <FieldRow>
                    <FieldLabel>등록 대상 국가</FieldLabel>
                    <FieldControl>
                      <CabS.CabinetSelectTrigger
                        type="button"
                        $hasValue
                        disabled
                        aria-label="등록 대상 국가"
                        style={{ cursor: 'default' }}
                      >
                        <span>{country.name}</span>
                      </CabS.CabinetSelectTrigger>
                    </FieldControl>
                  </FieldRow>
                )}
                <FieldRow>
                  <FieldLabel>대수 (선택)</FieldLabel>
                  <FieldControl>
                    <CabS.CabinetTermNumberWrap>
                      <RegisterInput
                        type="number"
                        min={1}
                        placeholder="제 N대"
                        value={editingTermNumber}
                        onChange={(e) => setEditingTermNumber(e.target.value)}
                        aria-label="대수"
                      />
                    </CabS.CabinetTermNumberWrap>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>기수 (선택)</FieldLabel>
                  <FieldControl>
                    <CabS.CabinetTermNumberWrap>
                      <RegisterInput
                        type="number"
                        min={1}
                        placeholder="N기 (예: 1, 2)"
                        value={editingSubTermNumber}
                        onChange={(e) =>
                          setEditingSubTermNumber(e.target.value)
                        }
                        aria-label="기수"
                        title="같은 대수 내 복수 임기 구분 (예: 클린턴 42대 1기/2기)"
                      />
                    </CabS.CabinetTermNumberWrap>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>
                    인물 <Required />
                  </FieldLabel>
                  <FieldControl>
                    <CabS.CabinetSelectTrigger
                      type="button"
                      $hasValue
                      disabled
                      aria-label="수반 인물"
                      style={{ cursor: 'default' }}
                    >
                      <span>
                        {editingCabinet.headTenure?.person
                          ? getPersonName(editingCabinet.headTenure.person)
                          : '—'}
                      </span>
                    </CabS.CabinetSelectTrigger>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>
                    직위 (수반) <Required />
                  </FieldLabel>
                  <FieldControl>
                    <CabS.CabinetSelectNative
                      value={editingPositionDefId ?? ''}
                      onChange={(e) =>
                        setEditingPositionDefId(e.target.value || null)
                      }
                      aria-label="직위 선택"
                    >
                      <option value="">선택</option>
                      {headPositionOptions.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {d.title}
                        </option>
                      ))}
                    </CabS.CabinetSelectNative>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>
                    취임일 <Required /> / 퇴임일
                  </FieldLabel>
                  <FieldControl $variant="datePair">
                    <DateFieldsRow>
                      <CabS.CabinetDateTrigger
                        type="button"
                        $hasValue={!!editingStartDate}
                        onClick={() => setEditStartDatePickerOpen(true)}
                        aria-label="취임일 선택"
                      >
                        <span>
                          {editingStartDate
                            ? formatDate(editingStartDate)
                            : '취임일 선택'}
                        </span>
                        <FiChevronDown size={18} />
                      </CabS.CabinetDateTrigger>
                      <CabS.CabinetDateTrigger
                        type="button"
                        $hasValue={!!editingEndDate}
                        onClick={() => setEditEndDatePickerOpen(true)}
                        aria-label="퇴임일 선택"
                      >
                        <span>
                          {editingEndDate
                            ? formatDate(editingEndDate)
                            : '퇴임일 선택'}
                        </span>
                        <FiChevronDown size={18} />
                      </CabS.CabinetDateTrigger>
                    </DateFieldsRow>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>행정부 이름 (선택)</FieldLabel>
                  <FieldControl>
                    <RegisterInput
                      type="text"
                      placeholder="예: 루즈벨트 제1기"
                      value={editingCabinetName}
                      onChange={(e) => setEditingCabinetName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateCabinet()
                      }}
                    />
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>임명 방식 (선택)</FieldLabel>
                  <FieldControl>
                    <CabS.CabinetSelectNative
                      value={editingAppointmentMethod}
                      onChange={(e) =>
                        setEditingAppointmentMethod(e.target.value)
                      }
                    >
                      <option value="">선택 안 함</option>
                      <option value="DIRECT_ELECTION">직접 선거</option>
                      <option value="INDIRECT_ELECTION">간접 선거</option>
                      <option value="PARLIAMENTARY_ELECTION">의회 선출</option>
                      <option value="APPOINTMENT">임명</option>
                      <option value="HEREDITARY">세습</option>
                      <option value="COUP">쿠데타 / 혁명</option>
                      <option value="OTHER">기타</option>
                    </CabS.CabinetSelectNative>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>퇴임 사유 (선택)</FieldLabel>
                  <FieldControl>
                    <CabS.CabinetSelectNative
                      value={editingEndReason}
                      onChange={(e) => setEditingEndReason(e.target.value)}
                    >
                      <option value="">선택 안 함</option>
                      <option value="TERM_COMPLETED">임기 만료</option>
                      <option value="RESIGNATION">사임 / 사퇴</option>
                      <option value="ABDICATION">자진 퇴위</option>
                      <option value="SUCCESSION_TRANSFER">양위 / 선위</option>
                      <option value="REMOVAL">폐위 / 해임</option>
                      <option value="IMPEACHMENT">탄핵</option>
                      <option value="DEATH_IN_OFFICE">재임 중 사망</option>
                      <option value="OVERTHROWN">쿠데타 / 혁명으로 축출</option>
                      <option value="WAR_DEFEAT">전쟁 패배</option>
                      <option value="STATE_DISSOLVED">국가 멸망</option>
                      <option value="OTHER">기타</option>
                    </CabS.CabinetSelectNative>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>퇴임 사유 상세</FieldLabel>
                  <FieldControl>
                    <CabS.EditingTextarea
                      placeholder="퇴임 배경, 상세 사유 등을 자유롭게 기술하세요."
                      value={editingEndReasonDetail}
                      onChange={(e) =>
                        setEditingEndReasonDetail(e.target.value)
                      }
                      rows={4}
                    />
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>취임 배경 / 비고</FieldLabel>
                  <FieldControl>
                    <CabS.EditingTextarea
                      placeholder="취임 배경, 임명 경위 등 특이사항을 기술하세요."
                      value={editingNotes}
                      onChange={(e) => setEditingNotes(e.target.value)}
                      rows={3}
                    />
                  </FieldControl>
                </FieldRow>
              </FormRows>
              <CabS.CabinetActions>
                <CabS.CabinetCancelBtn
                  type="button"
                  onClick={closeEditCabinetModal}
                >
                  취소
                </CabS.CabinetCancelBtn>
                <SubmitButton
                  type="button"
                  disabled={
                    updatingCabinetId !== null || !editingStartDate.trim()
                  }
                  onClick={handleUpdateCabinet}
                >
                  {updatingCabinetId ? '저장 중…' : '저장'}
                </SubmitButton>
              </CabS.CabinetActions>
            </CabS.CabinetModalBody>
          </CabS.CabinetModalBox>
          {(editStartDatePickerOpen || editEndDatePickerOpen) && (
            <CabS.CabinetSubModalLayer>
              <DatePickerModal
                isOpen={editStartDatePickerOpen}
                onClose={() => setEditStartDatePickerOpen(false)}
                onSelect={(date) => {
                  setEditingStartDate(date.slice(0, 10))
                  setEditStartDatePickerOpen(false)
                }}
                initialDate={editingStartDate || undefined}
                title="취임일 선택"
              />
              <DatePickerModal
                isOpen={editEndDatePickerOpen}
                onClose={() => setEditEndDatePickerOpen(false)}
                onSelect={(date) => {
                  setEditingEndDate(date.slice(0, 10))
                  setEditEndDatePickerOpen(false)
                }}
                initialDate={editingEndDate || undefined}
                title="퇴임일 선택"
              />
            </CabS.CabinetSubModalLayer>
          )}
        </ModalOverlay>
      )}

      {personSelectOpen && addMinisterCabinet && (
        <>
          <ModalOverlay
            role="dialog"
            aria-modal="true"
            aria-labelledby="minister-select-title"
            onClick={handleCloseMinisterModal}
          >
            <CabS.MinisterSelectModalBox onClick={(e) => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle id="minister-select-title">각료 등록</ModalTitle>
                <ModalCloseButton
                  type="button"
                  onClick={handleCloseMinisterModal}
                  aria-label="닫기"
                >
                  <FiX size={22} strokeWidth={2} />
                </ModalCloseButton>
              </ModalHeader>
              <CabS.MinisterSelectModalBody>
                <FormRows>
                  <FieldRow>
                    <FieldLabel>
                      인물 <Required aria-label="필수" />
                    </FieldLabel>
                    <FieldControl>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          flexWrap: 'wrap',
                        }}
                      >
                        <CabS.MinisterPersonTrigger
                          type="button"
                          onClick={() => setPersonPickerOpen(true)}
                        >
                          <CabS.MinisterPersonThumb
                            $hasImage={
                              !!selectedMinisterPerson?.profileImageUrl
                            }
                          >
                            {selectedMinisterPerson?.profileImageUrl ? (
                              <img
                                src={
                                  getUploadImageUrl(
                                    selectedMinisterPerson.profileImageUrl,
                                  ) || selectedMinisterPerson.profileImageUrl
                                }
                                alt=""
                              />
                            ) : (
                              <FiUser size={24} strokeWidth={2} />
                            )}
                          </CabS.MinisterPersonThumb>
                          <CabS.MinisterPersonLabel
                            className={
                              selectedPersonIdForAdd ? '' : 'placeholder'
                            }
                          >
                            {selectedMinisterPerson
                              ? getPersonName(selectedMinisterPerson)
                              : '인물 선택'}
                          </CabS.MinisterPersonLabel>
                          <FiChevronDown
                            size={18}
                            style={{ flexShrink: 0, color: '#94a3b8' }}
                          />
                        </CabS.MinisterPersonTrigger>
                        {selectedPersonIdForAdd && (
                          <button
                            type="button"
                            onClick={handleChangePersonForMinister}
                            style={{
                              padding: '6px 12px',
                              fontSize: 13,
                              fontWeight: 500,
                              color: MAIN,
                              background: 'transparent',
                              border: `1px solid ${C.borderMid}`,
                              borderRadius: 8,
                              cursor: 'pointer',
                            }}
                          >
                            변경
                          </button>
                        )}
                      </div>
                    </FieldControl>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>부처 · 행정기구 (선택)</FieldLabel>
                    <FieldControl>
                      <select
                        value={ministerFormDeptId ?? ''}
                        onChange={(e) => {
                          const v = e.target.value
                          setMinisterFormDeptId(v === '' ? null : v)
                          setMinisterFormPositionDefId(null)
                          setMinisterFormTitle('')
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: 14,
                          border: `1px solid ${C.borderMid}`,
                          borderRadius: 10,
                          background: C.inputBg,
                          color: C.text,
                        }}
                      >
                        <option value="">전체 (부처 미지정)</option>
                        {(ministriesForCabinet as any[]).map((dept: any) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                      <p
                        style={{
                          margin: '6px 0 0',
                          fontSize: 12,
                          color: C.textMuted,
                        }}
                      >
                        부처를 선택하면 해당 부처의 직위만 표시됩니다.
                      </p>
                    </FieldControl>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>
                      직위 <Required aria-label="필수" />
                    </FieldLabel>
                    <FieldControl>
                      <select
                        value={ministerFormPositionDefId ?? ''}
                        onChange={(e) => {
                          const v = e.target.value
                          setMinisterFormPositionDefId(v === '' ? null : v)
                          if (!v || v === '__OTHER__') {
                            if (v !== '__OTHER__') setMinisterFormTitle('')
                          } else {
                            const d = ministerPositionOptions.find(
                              (o: any) => o.id === v,
                            )
                            if (d) setMinisterFormTitle('')
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: 14,
                          border: `1px solid ${C.borderMid}`,
                          borderRadius: 10,
                          background: C.inputBg,
                          color: C.text,
                        }}
                      >
                        <option value="">직위 선택</option>
                        {filteredMinisterPositionOptions.map((d: any) => (
                          <option key={d.id} value={d.id}>
                            {d.title ?? d.name ?? d.id}
                          </option>
                        ))}
                        <option value="__OTHER__">기타 (직접 입력)</option>
                      </select>
                      {ministerFormPositionDefId === '__OTHER__' && (
                        <RegisterInput
                          type="text"
                          placeholder="예: 국방장관"
                          value={ministerFormTitle}
                          onChange={(e) => setMinisterFormTitle(e.target.value)}
                          style={{ marginTop: 8, maxWidth: 320 }}
                        />
                      )}
                      <p
                        style={{
                          margin: '8px 0 0',
                          fontSize: 12,
                          color: C.textMuted,
                        }}
                      >
                        교육부 장관·외무대신 등 직위는 행정조직{' '}
                        <strong>직위 정의</strong> 탭에서 등록한 뒤 목록에서
                        선택할 수 있습니다. 없으면 기타(직접 입력)을 사용하세요.
                      </p>
                    </FieldControl>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>대수 (선택)</FieldLabel>
                    <FieldControl>
                      <RegisterInput
                        type="number"
                        min={1}
                        placeholder="예: 1"
                        value={ministerFormTermNumber}
                        onChange={(e) =>
                          setMinisterFormTermNumber(e.target.value)
                        }
                        aria-label="대수"
                        style={{ width: '100%', maxWidth: 96 }}
                      />
                    </FieldControl>
                  </FieldRow>
                  <DateRangeField
                    label="취임일 · 퇴임일"
                    required
                    startValue={ministerFormStartDate}
                    endValue={ministerFormEndDate}
                    onStartChange={setMinisterFormStartDate}
                    onEndChange={setMinisterFormEndDate}
                    startPlaceholder="취임일"
                    endPlaceholder="퇴임일 (선택)"
                    openEndAfterStart
                  />
                </FormRows>
                <CabS.MinisterSelectActions>
                  <CabS.CabinetCancelBtn
                    type="button"
                    onClick={handleCloseMinisterModal}
                  >
                    취소
                  </CabS.CabinetCancelBtn>
                  <SubmitButton
                    type="button"
                    disabled={
                      ministerFormSubmitting ||
                      !selectedPersonIdForAdd ||
                      !ministerFormStartDate.trim() ||
                      (!(
                        ministerFormPositionDefId &&
                        ministerFormPositionDefId !== '__OTHER__'
                      ) &&
                        !ministerFormTitle.trim())
                    }
                    onClick={handleSubmitMinister}
                  >
                    {ministerFormSubmitting ? '처리 중…' : '각료 등록'}
                  </SubmitButton>
                </CabS.MinisterSelectActions>
              </CabS.MinisterSelectModalBody>
            </CabS.MinisterSelectModalBox>
          </ModalOverlay>

          {personPickerOpen && (
            <PersonSelectModal
              persons={personsForMinisterSelect as any[]}
              selectedPersonId={selectedPersonIdForAdd ?? ''}
              onSelect={(personId) => {
                handleSelectPersonForMinister(personId)
                setPersonPickerOpen(false)
              }}
              onClose={() => setPersonPickerOpen(false)}
            />
          )}
        </>
      )}

      {/* 인물 상세 모달 (썸네일/엔티티 클릭 시) — 포스트 상세와 동일한 mentionPersonId 패턴 */}
      <AnimatePresence>
        {mentionPersonId && (
          <CabS.PersonViewOverlay
            key="mention-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setMentionPersonId(null)}
            role="presentation"
          >
            <CabS.PersonViewModalBox
              key="mention-modal-panel"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader>
                <ModalTitle title={mentionPersonName}>
                  {mentionPersonName || '인물'}
                </ModalTitle>
                <ModalCloseButton
                  type="button"
                  onClick={() => setMentionPersonId(null)}
                  aria-label="닫기"
                >
                  <FiX size={20} strokeWidth={2.5} />
                </ModalCloseButton>
              </ModalHeader>
              <CabS.PersonViewModalBody>
                <PersonDetailPanel
                  personId={mentionPersonId}
                  onClose={() => setMentionPersonId(null)}
                  onEdit={() => setMentionPersonId(null)}
                  hideHeaderActions
                  embedInModal
                  onLinkedPersonClick={setMentionPersonId}
                />
              </CabS.PersonViewModalBody>
            </CabS.PersonViewModalBox>
          </CabS.PersonViewOverlay>
        )}
      </AnimatePresence>

      {historyProseTermTooltip && (
        <CabS.HistoryProseTooltipOverlay
          role="presentation"
          onClick={() => setHistoryProseTermTooltip(null)}
        >
          <CabS.HistoryProseTermTooltipPopover
            $x={historyProseTermTooltip.x}
            $y={historyProseTermTooltip.y}
            onClick={(e) => e.stopPropagation()}
          >
            <strong>{historyProseTermTooltip.name}</strong>
            <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {historyProseTermTooltip.description === null
                ? ' 로딩…'
                : historyProseTermTooltip.description || '(설명 없음)'}
            </span>
          </CabS.HistoryProseTermTooltipPopover>
        </CabS.HistoryProseTooltipOverlay>
      )}

      {historyProseDynastyTooltip && (
        <CabS.HistoryProseTooltipOverlay
          role="presentation"
          onClick={() => setHistoryProseDynastyTooltip(null)}
        >
          <CabS.HistoryProseDynastyTooltipPopover
            $x={historyProseDynastyTooltip.x}
            $y={historyProseDynastyTooltip.y}
            onClick={(e) => e.stopPropagation()}
          >
            <strong>가문 · {historyProseDynastyTooltip.name}</strong>
            <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {historyProseDynastyTooltip.description === null
                ? ' 로딩…'
                : historyProseDynastyTooltip.description || '(설명 없음)'}
            </span>
          </CabS.HistoryProseDynastyTooltipPopover>
        </CabS.HistoryProseTooltipOverlay>
      )}

      {/* ── 조약 연결 모달 ── */}
      {showTreatyLinkModal && selectedCabinetId && (
        <TreatyLinkModal
          cabinetId={selectedCabinetId}
          country={country}
          countryId={countryId}
          historicalCountryId={historicalCountryId}
          cabinets={sortedCabinets as any[]}
          allPersons={allPersons as PersonResponseDto[]}
          currentTreaties={cabinetTreaties}
          isDark={isDark}
          onClose={() => setShowTreatyLinkModal(false)}
          onLinked={async () => {
            const updated = await treatyApi.getAll({
              cabinetId: selectedCabinetId,
            })
            setCabinetTreaties(updated.items)
            setShowTreatyLinkModal(false)
          }}
        />
      )}
    </CabS.CabinetsSectionRoot>
  )
}
