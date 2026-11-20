/**
 * 행정부(역대 내각) — 행정조직 탭 내 "행정부" 서브탭에서 표시.
 * 수반 재임별 행정부 등록·조회, 각료 추가.
 * 타임라인: 내각(행정부)만 칸으로 나열. 군주 재임과 겹치는 칸은 군주마다 다른 색 가로 띠·축 라벨로 표시.
 * 정권 선택 시 아래에 중앙부처 스타일 그리드로 해당 정권의 부처별 각료 표시(전자: 카테고리만, 사용자 등록 부처).
 */
import React, {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { AnimatePresence, motion } from 'framer-motion'
import {
  FiArrowUpRight,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiClock,
  FiEdit2,
  FiFileText,
  FiGrid,
  FiLayers,
  FiLink,
  FiLink2,
  FiList,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { categorizePosition } from '@/entities/government-position/model/categorize'
import type { PositionCategory } from '@/entities/government-position/model/types'
import { useConstituentHistoricalPolities } from '@/features/government-info/model/use-constituent-historical-polities'
import { administrationDepartmentApi } from '@/shared/api/administration-department'
import {
  type CabinetListItemDto,
  type GovernmentCabinetTenureItem,
  type GovernmentHeadTenureInCabinetList,
  type SuggestedCabinetMemberDto,
  type TenureAchievementByEventLinkRow,
  personCareerApi,
} from '@/shared/api/person-career'
import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import {
  TREATY_PARTICIPATION_LABELS,
  TREATY_TYPE_LABELS,
  type TreatyDto,
  treatyApi,
} from '@/shared/api/treaty'
import { getUploadImageUrl, uploadImage } from '@/shared/api/upload'
import {
  type RichTextDynastyTooltipState,
  type RichTextTermTooltipState,
  useRichTextProseClick,
  useRichTextTooltipEscape,
} from '@/shared/hooks/use-rich-text-prose-click'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import { isLikelyRichTextHtml } from '@/shared/lib/rich-text-read-view'
import { sanitizeRichTextHtml } from '@/shared/lib/sanitize-rich-text-html'
import {
  administrationDepartmentsByCountryQueryKey,
  administrationDepartmentsByHistoricalCountryQueryKey,
} from '@/shared/lib/ministry-department/ministry-department-query-keys'

import {
  GovMoreFieldGroup,
  GovMoreFieldLabel,
  GovMoreNativeSelect,
  GovMorePopover,
} from '@/features/government-info/ui/gov-more-popover'
import {
  doesCabinetMatchPoliticalSystem,
  filterDepartmentsForCabinet,
  findActivePoliticalSystemForCabinet,
  findDepartmentForMember,
  GOVERNMENT_FORM_META,
} from '@/shared/lib/ministry-department/department-cabinet-matcher'
import { usePoliticalSystems } from '@/entities/political-system/api'
import {
  calcAgeAtTenure,
  formatPersonLifespan,
  formatSignedYearLabel,
  getSignedDateChronologyKey,
  parseSignedDateParts,
} from '@/shared/lib/tenure-person-utils'
import { pathKeys } from '@/shared/router'
import { getCabinetsSectionPalette } from '@/shared/styles/country-detail-palette'
import { useThemeStore } from '@/shared/styles/theme.store'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'
import {
  EmptyStateFill,
  EmptyStateSpotlight,
} from '@/shared/ui/empty-state/empty-state'
import { DateRangeField } from '@/shared/ui/form-fields/date-range-field'
import {
  ModalCloseButton,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
} from '@/shared/ui/modal/modal.styles'
import {
  type EditableInstitutionTenure,
  InstitutionAppointmentModal,
} from '@/shared/ui/institution-appointment-modal/institution-appointment-modal'
import {
  FieldControl,
  FieldLabel,
  FieldRow,
  FormRows,
  Input as RegisterInput,
  Required,
  SubmitButton,
} from '@/shared/ui/register-form-layout'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'
import { PersonInlineModal } from '@/widgets/person/person-inline-modal/person-inline-modal'

import {
  CabinetDetailChrome,
  type CabinetNavTarget,
} from './cabinet-detail-chrome.widget'
import { CabinetsLedgerView } from './cabinets-ledger-view.widget'
import { CabinetLinkageModal } from './cabinet-linkage-modal.widget'
import { LinkedCabinetPeersRow } from './cabinet-linked-peers-panel.widget'
import { CabinetMinisterCards } from './cabinet-minister-cards.widget'
import { CabinetPoliticalPartiesBlock } from './cabinet-political-parties-block.widget'
import { CabinetPortfolioMatrix } from './cabinet-portfolio-matrix.widget'
import {
  TlItem,
  cabinetTimelineCellAriaLabel,
  formatCabinetTermBadge,
} from './cabinets-section-timeline'
import {
  HEAD_POSITION_TYPES,
  CABINET_SECTION_MAIN as MAIN,
  TL_COL_PAD_X,
  TL_FIRST_COL_EXTRA_SHIFT_X,
  TL_GRID_GAP_X,
  TL_MONARCH_LINE_HEXES,
  TL_NODE_EDGE_PAD,
  TL_ROW_H,
  TL_TERRITORY_PALETTE,
  TL_THUMB,
  TL_VERT_SEG_H,
  TL_YEAR_NUDGE_Y_EVEN_COL,
  TL_YEAR_NUDGE_Y_ODD_COL,
} from './cabinets-section.constants'
import {
  APPOINTMENT_METHOD_LABEL,
  END_REASON_LABEL,
  buildCabinetTerritoryLegendEntries,
  buildCabinetTerritoryOrdinalMap,
  cabinetTimelineHeaderYearRange,
  cabinetTimelineMonarchRailGradient,
  cabinetTimelineMonarchUiTint,
  calcAgeAtEndTenure,
  calcTenureDuration,
  formatCabinetHeadBreadcrumbLabel,
  formatDate,
  getHeadTenureTerritoryLabel,
  getPersonBirthPlaceLabel,
  getPersonName,
  getTenureAchievementDisplayBody,
  isLinkagePeerAchievement,
  lineColorForCabinetHeadPositionBadge,
  overlappingMonarchCaptionForExecutiveHead,
  overlappingMonarchTenureForExecutiveHead,
  paletteForCabinetListItem,
  resolveCabinetEffectiveDates,
  resolveReignEraLineForCabinetHead,
  shouldHideCabinetFromExecutiveTimeline,
  getRegnalOrPersonDisplayName,
  sovereignLegendPersonLabelFromMonarchTenure,
  stripHtmlToPlain,
} from './cabinets-section.helpers'
import * as CabS from './cabinets-section.styled'
import { SubsectionAddBtn } from './country-politics-tab.styles'
import { CabinetBulkMinisterModal } from './cabinet-bulk-minister-modal.widget'
import {
  CabinetFormModal,
  type CabinetFormMode,
} from './cabinet-form-modal.widget'
import { TenureHistoryHorizTimeline } from './tenure-history-horiz-timeline'
import { TreatyLinkModal } from './treaty-link-modal'
import { CabinetEventsSection } from './cabinet-events-section.widget'

type CabinetCategoryFilterKey = PositionCategory | 'COLLECTIVE'

/** 행정부 수반 직위 유형 필터의 라벨·노출 순서 */
const CABINET_CATEGORY_LABEL: Record<CabinetCategoryFilterKey, string> = {
  PRESIDENT: '대통령',
  PM: '총리',
  MONARCH: '군주',
  POPE: '교황',
  COLLECTIVE: '집단지도·과도정부',
  OTHER: '기타',
}
const CABINET_CATEGORY_ORDER: CabinetCategoryFilterKey[] = [
  'PRESIDENT',
  'PM',
  'MONARCH',
  'POPE',
  'COLLECTIVE',
  'OTHER',
]

/** 행정부 수반(재임) 한 건의 직위 분류 — 무수반(집단지도)은 COLLECTIVE, 그 외는 categorizePosition에 위임 */
function cabinetHeadCategory(
  head:
    | {
        positionType?: string | null
        positionDefinition?: { positionType?: string | null; title?: string | null } | null
        title?: string | null
        appointmentMethod?: string | null
        isMonarchical?: boolean | null
      }
    | null
    | undefined,
): CabinetCategoryFilterKey {
  if (!head) return 'COLLECTIVE'
  return categorizePosition({
    isMonarchical: head?.isMonarchical,
    positionType: head?.positionType ?? head?.positionDefinition?.positionType,
    positionTitle: head?.title ?? head?.positionDefinition?.title,
    appointmentMethod: head?.appointmentMethod,
  })
}

/** BC 부호 연도(`-0044-03-15` 등)까지 보존하는 날짜 입력값 정규화 (`.slice(0, 10)` 일자 잘림 방지) */
function toAchievementDateInput(raw?: string | null): string {
  if (!raw?.trim()) return ''
  const parts = parseSignedDateParts(raw)
  if (!parts) return raw.trim()
  const pad2 = (num: number) => String(num).padStart(2, '0')
  const yearToken =
    parts.era === 'BC'
      ? `-${String(parts.absYear).padStart(4, '0')}`
      : String(parts.absYear).padStart(4, '0')
  return `${yearToken}-${pad2(parts.month ?? 1)}-${pad2(parts.day ?? 1)}`
}

/** 업적 API 호출 시: 묶음으로 병합된 항목은 실제 소유 재임 ID 사용 */
function tenureIdForAchievement(
  ach: { tenureId?: string | null },
  fallbackTenureId: string,
): string {
  return typeof ach.tenureId === 'string' && ach.tenureId.trim()
    ? ach.tenureId
    : fallbackTenureId
}

/** RichTextEditor HTML — 시각적 빈 본문이면 저장하지 않음 */
function optionalCabinetTenureRichText(
  html: string | null | undefined,
): string | undefined {
  const trimmed = (html ?? '').trim()
  if (!trimmed) return undefined
  const safe = sanitizeRichTextHtml(trimmed)
  if (typeof document === 'undefined') {
    const stripped = safe
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .trim()
    return stripped === '' ? undefined : safe
  }
  const div = document.createElement('div')
  div.innerHTML = safe
  const text = div.textContent?.replace(/\u00a0/g, ' ').trim() ?? ''
  return text === '' ? undefined : safe
}

function cabinetTenureDetailHasContent(
  html: string | null | undefined,
): boolean {
  return optionalCabinetTenureRichText(html) !== undefined
}

function achievementRowIsSovereign(row: TenureAchievementByEventLinkRow) {
  return row.tenure?.isMonarchical === true
}

/** 국가 · (재위 | 행정부) · 인물 줄의 가운데 구간 */
function relatedAchievementAdminLabel(row: TenureAchievementByEventLinkRow) {
  if (achievementRowIsSovereign(row)) return '재위'
  return row.tenure?.cabinet?.name?.trim() || '행정부 미지정'
}

/** 동일 사건(eventId)을 다른 나라 행정부 재임에도 연결했을 때 목록 (공유 가시화) */
function RelatedAchievementsBySameEventBlock({
  eventId,
  currentAchievementId,
  textMuted,
  border,
  background,
}: {
  eventId: string
  currentAchievementId: string
  textMuted: string
  border: string
  background: string
}) {
  const navigate = useNavigate()
  const { data = [], isLoading } = useQuery({
    queryKey: ['tenure-achievements-by-event', eventId],
    queryFn: () => personCareerApi.getTenureAchievementsByEventId(eventId),
  })
  const others = (data as TenureAchievementByEventLinkRow[]).filter(
    (a) => a.id !== currentAchievementId,
  )
  if (isLoading || others.length === 0) return null
  const anySovereign = others.some(achievementRowIsSovereign)
  const anyCabinetTenure = others.some((o) => !achievementRowIsSovereign(o))
  const blockTitle =
    anySovereign && anyCabinetTenure
      ? '같은 묶음에 속한 다른 기록'
      : anySovereign
        ? '같은 묶음에 속한 다른 재위'
        : '같은 묶음에 속한 다른 나라 행정부'
  return (
    <div
      style={{
        marginTop: 4,
        marginBottom: 8,
        padding: '10px 12px',
        borderRadius: 8,
        border: `1px solid ${border}`,
        background,
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8, color: textMuted }}>
        {blockTitle}
      </div>
      <ul
        style={{
          margin: '0 0 8px',
          paddingLeft: 18,
          color: textMuted,
          lineHeight: 1.55,
        }}
      >
        {others.map((row) => {
          const t = row.tenure
          const country =
            t?.country?.name ?? t?.historicalCountry?.name ?? '국가 미상'
          const mid = relatedAchievementAdminLabel(row)
          const person = t?.person ? getPersonName(t.person) : '—'
          return (
            <li key={row.id}>
              {country} · {mid} · {person} — {row.title}
            </li>
          )
        })}
      </ul>
      <button
        type="button"
        onClick={() => navigate(pathKeys.events.detail(eventId))}
        style={{
          fontSize: 11,
          fontWeight: 600,
          padding: '4px 8px',
          borderRadius: 6,
          border: `1px solid ${border}`,
          background: 'transparent',
          color: textMuted,
          cursor: 'pointer',
        }}
      >
        연대표에서 기준 사건 열기
      </button>
    </div>
  )
}

/** 재임 기록 상세 진입 시 스크롤을 목록에서의 위치로 두지 않고 최상단으로 맞춤 */
function scrollCabinetDetailAreaToTop(fromEl: HTMLElement | null) {
  if (!fromEl) return
  let node: HTMLElement | null = fromEl
  while (node) {
    const { overflowY } = getComputedStyle(node)
    if (
      (overflowY === 'auto' ||
        overflowY === 'scroll' ||
        overflowY === 'overlay') &&
      node.scrollHeight > node.clientHeight + 1
    ) {
      node.scrollTop = 0
    }
    node = node.parentElement
  }
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
  fromEl.scrollIntoView({ block: 'start', behavior: 'auto' })
}

const CABINET_VIEW_PREFS_STORAGE_KEY = 'papyrus:country-cabinet-prefs:v1'

function readPersistedCabinetViewPrefs(): {
  layout: 'timeline' | 'ledger'
  sortOrder: 'asc' | 'desc'
  ministerViewMode: 'cards' | 'matrix'
} {
  if (typeof window === 'undefined') {
    return { layout: 'timeline', sortOrder: 'asc', ministerViewMode: 'cards' }
  }
  try {
    const raw = window.localStorage.getItem(CABINET_VIEW_PREFS_STORAGE_KEY)
    if (!raw) {
      return { layout: 'timeline', sortOrder: 'asc', ministerViewMode: 'cards' }
    }
    const parsed = JSON.parse(raw) as {
      layout?: unknown
      sortOrder?: unknown
      ministerViewMode?: unknown
    }
    return {
      layout: parsed.layout === 'ledger' ? 'ledger' : 'timeline',
      sortOrder: parsed.sortOrder === 'desc' ? 'desc' : 'asc',
      ministerViewMode:
        parsed.ministerViewMode === 'matrix' ? 'matrix' : 'cards',
    }
  } catch {
    return { layout: 'timeline', sortOrder: 'asc', ministerViewMode: 'cards' }
  }
}

const EMPTY_CONSTITUENT_POLITIES: never[] = []

export interface CabinetsSectionProps {
  country: UnifiedCountry
  /** 정체·헌정 기록 보유 여부 (빈 상태 온보딩 가이드용) */
  hasAnyPoliticalSystem?: boolean
  /** 중앙부처 기록 보유 여부 (빈 상태 온보딩 가이드용) */
  hasAnyDepartment?: boolean
  /** 정체·헌정 탭으로 이동 */
  onOpenPoliticalSystemTab?: () => void
  /** 부처 등록 시 중앙부처 탭으로 전환하고 해당 카테고리로 폼 열기 */
  onOpenMinistriesTab?: (categoryId?: string) => void
  /** 각료 소속 부처 배지 클릭 시 중앙부처 탭의 해당 부처 상세로 이동 */
  onOpenDepartmentDetail?: (departmentId: string) => void
}

export function CabinetsSection({
  country,
  hasAnyPoliticalSystem = false,
  hasAnyDepartment = false,
  onOpenPoliticalSystemTab,
  onOpenMinistriesTab,
  onOpenDepartmentDetail,
}: CabinetsSectionProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const linkEventIdFromUrl = searchParams.get('linkEventId')
  const linkEventTitleFromUrl = searchParams.get('linkEventTitle')
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'
  const C = getCabinetsSectionPalette(isDark)
  const palette = getCabinetsSectionPalette(isDark)

  const isHistorical = country.type === 'historical'
  const countryId = !isHistorical ? country.id : undefined
  const historicalCountryId = isHistorical ? country.id : undefined

  const { data: constituentPolities = EMPTY_CONSTITUENT_POLITIES } =
    useConstituentHistoricalPolities(historicalCountryId)

  const allowedHistoricalIdsSet = useMemo(() => {
    if (!isHistorical) return null
    return new Set<string>([
      country.id,
      ...constituentPolities.map((polityItem) => polityItem.id),
    ])
  }, [isHistorical, country.id, constituentPolities])

  /** 현대국가 + 연결된 역사국가(또는 복합 역사국가 + 구성국)를 한 범위로 — 총리·군주 재임 매칭 */
  const cabinetTimelineCountryScope = useMemo(
    () =>
      country.type === 'modern'
        ? ({
            kind: 'modern' as const,
            modernCountryId: country.id,
            linkedHistoricalCountryIds: (country.historicalCountries ?? [])
              .map((histItem) => histItem.id)
              .filter((histId): histId is string => Boolean(histId)),
          } as const)
        : ({
            kind: 'historical' as const,
            historicalCountryId: country.id,
            constituentHistoricalCountryIds: constituentPolities.map(
              (polityItem) => polityItem.id,
            ),
          } as const),
    [country, constituentPolities],
  )

  /** 선택한 정권 — 위에 행정부처(중앙부처) 그리드로 해당 정권의 부처별 각료 표시 */
  const cabinetIdFromUrl = searchParams.get('cabinetId')
  const ministerIdFromUrl = searchParams.get('ministerId')
  const regimeIdFromUrl = searchParams.get('regimeId')?.trim() || ''
  const [selectedCabinetId, setSelectedCabinetId] = useState<string | null>(
    () => cabinetIdFromUrl ?? null,
  )
  /** 뷰 전환: list(행정부 그리드) / detail(행정부 상세) */
  const [cabinetView, setCabinetView] = useState<'list' | 'detail'>(() =>
    cabinetIdFromUrl ? 'detail' : 'list',
  )
  const [cabinetListLayout, setCabinetListLayout] = useState<
    'timeline' | 'ledger'
  >(() => readPersistedCabinetViewPrefs().layout)
  const [showTimelineLegend, setShowTimelineLegend] = useState(false)
  const [includeCeremonialMonarchs, setIncludeCeremonialMonarchs] =
    useState(false)

  const setRegimeFilterInUrl = useCallback(
    (nextRegimeId: string) => {
      const nextParams = new URLSearchParams(searchParams)
      const trimmed = nextRegimeId.trim()
      if (trimmed) {
        nextParams.set('regimeId', trimmed)
      } else {
        nextParams.delete('regimeId')
      }
      setSearchParams(nextParams, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const clearRegimeFilter = useCallback(() => {
    setRegimeFilterInUrl('')
  }, [setRegimeFilterInUrl])

  const selectCabinetWithUrl = useCallback(
    (targetCabinetId: string) => {
      setSelectedCabinetId(targetCabinetId)
      setSelectedMinisterId(null)
      setCabinetView('detail')
      const nextParams = new URLSearchParams(searchParams)
      nextParams.set('sub', 'cabinets')
      nextParams.set('cabinetId', targetCabinetId)
      nextParams.delete('ministerId')
      setSearchParams(nextParams, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const clearCabinetSelectionInUrl = useCallback(() => {
    setSelectedCabinetId(null)
    setSelectedMinisterId(null)
    setCabinetView('list')
    const nextParams = new URLSearchParams(searchParams)
    let changed = false
    if (nextParams.has('cabinetId')) {
      nextParams.delete('cabinetId')
      changed = true
    }
    if (nextParams.has('ministerId')) {
      nextParams.delete('ministerId')
      changed = true
    }
    if (changed) {
      setSearchParams(nextParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const selectMinisterWithUrl = useCallback(
    (targetMinisterId: string | null) => {
      setSelectedMinisterId(targetMinisterId)
      const nextParams = new URLSearchParams(searchParams)
      if (targetMinisterId) {
        nextParams.set('ministerId', targetMinisterId)
        setSearchParams(nextParams)
      } else if (nextParams.has('ministerId')) {
        nextParams.delete('ministerId')
        setSearchParams(nextParams, { replace: true })
      }
    },
    [searchParams, setSearchParams],
  )

  useEffect(() => {
    if (cabinetIdFromUrl) {
      setSelectedCabinetId(cabinetIdFromUrl)
      setCabinetView('detail')
    } else {
      setSelectedCabinetId(null)
      setCabinetView('list')
    }
  }, [cabinetIdFromUrl])

  const [addMinisterCabinet, setAddMinisterCabinet] = useState<any | null>(null)
  const [registerCabinetModalOpen, setRegisterCabinetModalOpen] =
    useState(false)
  const [registerModalInitialMode, setRegisterModalInitialMode] = useState<
    CabinetFormMode | undefined
  >(undefined)
  const [bulkMinisterModalOpen, setBulkMinisterModalOpen] = useState(false)
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false)
  const [preselectedMinisterDeptId, setPreselectedMinisterDeptId] = useState<
    string | null
  >(null)
  const [ministerViewMode, setMinisterViewMode] = useState<'cards' | 'matrix'>(
    () => readPersistedCabinetViewPrefs().ministerViewMode,
  )
  const [editingMinisterForModal, setEditingMinisterForModal] =
    useState<EditableInstitutionTenure | null>(null)
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<string[]>(
    [],
  )
  const [attachingSuggestions, setAttachingSuggestions] = useState(false)
  const [deletingCabinetId, setDeletingCabinetId] = useState<string | null>(
    null,
  )
  /** 각료/수반 썸네일 클릭 시 인물 상세 모달 (포스트 상세와 동일한 mentionPersonId 패턴) */
  const [mentionPersonId, setMentionPersonId] = useState<string | null>(null)
  const [historyProseTermTooltip, setHistoryProseTermTooltip] =
    useState<RichTextTermTooltipState | null>(null)
  const [historyProseDynastyTooltip, setHistoryProseDynastyTooltip] =
    useState<RichTextDynastyTooltipState | null>(null)
  /** 타임라인 컨테이너 실측 너비별 열 수 — 사이드패널 열림 등에서도 칸이 쪼그라들지 않게 반응 */
  const timelineContainerRef = useRef<HTMLDivElement | null>(null)
  const [timelineColumnCount, setTimelineColumnCount] = useState(4)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const computeCols = (width: number) => {
      if (width <= 560) setTimelineColumnCount(2)
      else if (width <= 920) setTimelineColumnCount(3)
      else setTimelineColumnCount(4)
    }
    const target = timelineContainerRef.current
    if (target && typeof ResizeObserver !== 'undefined') {
      computeCols(target.getBoundingClientRect().width || window.innerWidth)
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0]
        if (entry && entry.contentRect.width > 0) {
          computeCols(entry.contentRect.width)
        }
      })
      observer.observe(target)
      return () => observer.disconnect()
    }
    const applyWindowFallback = () => computeCols(window.innerWidth)
    applyWindowFallback()
    window.addEventListener('resize', applyWindowFallback)
    return () => window.removeEventListener('resize', applyWindowFallback)
  }, [cabinetView, cabinetListLayout])

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

  /** 행정부 수정 모달 대상 */
  const [editingCabinet, setEditingCabinet] = useState<any | null>(null)
  /** 취임/퇴임 인라인 편집 모드 전용 상태 (모달 상태와 분리) */
  const [editingAppointmentMethod, setEditingAppointmentMethod] =
    useState<string>('')
  const [editingEndReason, setEditingEndReason] = useState<string>('')
  const [editingEndReasonDetail, setEditingEndReasonDetail] = useState('')
  const [editingNotes, setEditingNotes] = useState('')
  const [editingTenureInfo, setEditingTenureInfo] = useState<{
    cabinetId: string
    mode: 'appointment' | 'end'
  } | null>(null)
  const [tenureInfoSubmitting, setTenureInfoSubmitting] = useState(false)
  const [historyTargetTenureId, setHistoryTargetTenureId] = useState<
    string | null
  >(null)
  const [historyTitle, setHistoryTitle] = useState('')
  const [historyStartDate, setHistoryStartDate] = useState('')
  const [historyEndDate, setHistoryEndDate] = useState('')
  const [historySubmitting, setHistorySubmitting] = useState(false)
  const [cabinetSearchQuery, setCabinetSearchQuery] = useState('')
  /** 국가 필터: '' = 전체, countryId = 현대국가, historicalCountryId = 하위 역사국가/구성국 */
  const [cabinetCountryFilter, setCabinetCountryFilter] = useState<string>('')
  useEffect(() => {
    setCabinetCountryFilter('')
  }, [country.id])
  /** 직위 유형 필터(대통령/총리/집단지도…) — ''이면 전체 */
  const [cabinetCategoryFilter, setCabinetCategoryFilter] = useState<
    CabinetCategoryFilterKey | ''
  >('')
  /** 행정부 타임라인 정렬 순서: 'asc' = 과거순(기본), 'desc' = 최신순 */
  const [cabinetSortOrder, setCabinetSortOrder] = useState<'asc' | 'desc'>(
    () => readPersistedCabinetViewPrefs().sortOrder,
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(
        CABINET_VIEW_PREFS_STORAGE_KEY,
        JSON.stringify({
          layout: cabinetListLayout,
          sortOrder: cabinetSortOrder,
          ministerViewMode,
        }),
      )
    } catch {
      // storage quota / private mode
    }
  }, [cabinetListLayout, cabinetSortOrder, ministerViewMode])
  const [ministerSearchQuery, setMinisterSearchQuery] = useState('')
  const [selectedMinisterId, setSelectedMinisterId] = useState<string | null>(
    () => ministerIdFromUrl ?? null,
  )
  useEffect(() => {
    setSelectedMinisterId(ministerIdFromUrl ?? null)
  }, [ministerIdFromUrl])

  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(
    null,
  )
  /** 행정부 상세(수반) 뷰 — 재임 기록 목록만 상세로 전환할 때 사용 */
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

  /** 재임 기록 목록·상세의 추가·수정·삭제 — 수반 및 각료 상세 모두 허용 */
  const showCabinetHeadTenureHistoryActions = true

  // ── 조약 섹션 state ──
  const [selectedTreatyId, setSelectedTreatyId] = useState<string | null>(null)
  const [showTreatyLinkModal, setShowTreatyLinkModal] = useState(false)
  /** 다른 나라 행정부와 묶기(CabinetLinkageGroup) 모달 */
  const [cabinetLinkageOpen, setCabinetLinkageOpen] = useState(false)
  /** 재임 기록 상세에서 열 때 — 해당 성과에 연결된 사건 (URL `linkEventId` 없을 때 사용) */
  const [cabinetLinkageEventId, setCabinetLinkageEventId] = useState<
    string | null
  >(null)
  const [cabinetLinkageEventTitle, setCabinetLinkageEventTitle] = useState<
    string | null
  >(null)
  const handledLinkEventParamRef = useRef<string | null>(null)
  useEffect(() => {
    if (
      linkEventIdFromUrl &&
      selectedCabinetId &&
      cabinetView === 'detail' &&
      handledLinkEventParamRef.current !== `${selectedCabinetId}:${linkEventIdFromUrl}`
    ) {
      handledLinkEventParamRef.current = `${selectedCabinetId}:${linkEventIdFromUrl}`
      setCabinetLinkageOpen(true)
    }
  }, [linkEventIdFromUrl, selectedCabinetId, cabinetView])

  const cabDetailBackBtnRef = useRef<HTMLButtonElement>(null)
  /** 재임 기록 상세 진입 시 스크롤 최상단 맞춤용 */
  const cabinetDetailViewRootRef = useRef<HTMLDivElement>(null)
  const cabinetViewPrevRef = useRef<'list' | 'detail'>(cabinetView)

  const { data: cabinets = [], isLoading: loadingCabinets } = useQuery<
    CabinetListItemDto[]
  >({
    queryKey: [
      'cabinets-by-country',
      countryId ?? '',
      historicalCountryId ?? null,
      ...(isHistorical ? (['with-constituents'] as const) : []),
    ],
    queryFn: () =>
      personCareerApi.getCabinets({
        countryId: countryId || undefined,
        historicalCountryId: historicalCountryId || undefined,
        includeConstituents: isHistorical || undefined,
      }),
    enabled: !!countryId || !!historicalCountryId,
  })

  const { data: politicalSystems = [] } = usePoliticalSystems({
    countryId: countryId || undefined,
    historicalCountryId: historicalCountryId || undefined,
    includeConstituents: isHistorical || undefined,
  })

  const activeRegimeFilter = useMemo(
    () =>
      regimeIdFromUrl
        ? (politicalSystems.find((sysItem) => sysItem.id === regimeIdFromUrl) ??
          null)
        : null,
    [regimeIdFromUrl, politicalSystems],
  )

  const { data: countryTenures = [] } = useQuery({
    queryKey: [
      'tenures-by-country-for-cabinet',
      countryId,
      historicalCountryId,
      isHistorical ? 'with-constituents' : 'direct',
    ],
    queryFn: () =>
      personCareerApi.getTenuresByCountry({
        countryId: countryId || undefined,
        historicalCountryId: historicalCountryId || undefined,
        includeConstituents: isHistorical || undefined,
      }),
    enabled: !!countryId || !!historicalCountryId,
  })

  /** 행정부 리스트: 내각 고유 출범일 우선(없으면 수반 취임일) 기준 시간순(과거→현재, BC 안전) 정렬 */
  const sortedCabinets = useMemo(() => {
    const list = [...cabinets]
    return list.sort((left, right) => {
      const leftStart = resolveCabinetEffectiveDates(left).startDate
      const rightStart = resolveCabinetEffectiveDates(right).startDate
      const keyLeft = getSignedDateChronologyKey(leftStart) ?? 0
      const keyRight = getSignedDateChronologyKey(rightStart) ?? 0
      return keyLeft - keyRight
    })
  }, [cabinets])

  /** 내각 목록 — 총리 내각이 있는 국가는 의례적 원수 중복 행을 기본 숨기되, 전근대 왕조(군주만 존재)나 토글 ON 시 함께 표시 */
  const nonCeremonialCabinets = useMemo(
    () =>
      sortedCabinets.filter(
        (cabinetItem) =>
          !shouldHideCabinetFromExecutiveTimeline(
            cabinetItem.headTenure,
            cabinetItem,
          ),
      ),
    [sortedCabinets],
  )
  const ceremonialMonarchCabinetCount =
    sortedCabinets.length - nonCeremonialCabinets.length
  const executiveCabinetsSorted = useMemo(() => {
    if (includeCeremonialMonarchs || nonCeremonialCabinets.length === 0) {
      return sortedCabinets
    }
    return nonCeremonialCabinets
  }, [includeCeremonialMonarchs, nonCeremonialCabinets, sortedCabinets])

  const historicalConstituentTabs = useMemo(() => {
    if (country.type !== 'historical') return []
    const cabinetCountByPolityId = new Map<string, number>()
    const fallbackNameByPolityId = new Map<string, string>()
    for (const cabinetItem of executiveCabinetsSorted) {
      const head = cabinetItem.headTenure
      const effHistId =
        head?.historicalCountryId ?? cabinetItem.historicalCountryId
      if (!effHistId || effHistId === country.id) continue
      cabinetCountByPolityId.set(
        effHistId,
        (cabinetCountByPolityId.get(effHistId) ?? 0) + 1,
      )
      const histName =
        head?.historicalCountry?.name ?? cabinetItem.historicalCountry?.name
      if (histName) fallbackNameByPolityId.set(effHistId, histName)
    }

    const tabMap = new Map<
      string,
      { id: string; name: string; cabinetCount: number; rolePriority: number }
    >()
    for (const polityItem of constituentPolities) {
      if (!polityItem.id || polityItem.id === country.id) continue
      const rolePriority =
        polityItem.role === 'UNION'
          ? 0
          : polityItem.role === 'CONFEDERATION_MEMBER'
            ? 1
            : 2
      tabMap.set(polityItem.id, {
        id: polityItem.id,
        name: polityItem.name,
        cabinetCount: cabinetCountByPolityId.get(polityItem.id) ?? 0,
        rolePriority,
      })
    }
    for (const [polityId, count] of cabinetCountByPolityId.entries()) {
      if (!tabMap.has(polityId)) {
        tabMap.set(polityId, {
          id: polityId,
          name: fallbackNameByPolityId.get(polityId) ?? '구성국',
          cabinetCount: count,
          rolePriority: 1,
        })
      }
    }

    return Array.from(tabMap.values()).sort((leftTab, rightTab) => {
      const leftHasCabinets = leftTab.cabinetCount > 0 ? 0 : 1
      const rightHasCabinets = rightTab.cabinetCount > 0 ? 0 : 1
      if (leftHasCabinets !== rightHasCabinets) {
        return leftHasCabinets - rightHasCabinets
      }
      if (leftTab.rolePriority !== rightTab.rolePriority) {
        return leftTab.rolePriority - rightTab.rolePriority
      }
      return leftTab.name.localeCompare(rightTab.name, 'ko')
    })
  }, [country, constituentPolities, executiveCabinetsSorted])

  const countryFilteredCabinets = useMemo(() => {
    if (!cabinetCountryFilter) return executiveCabinetsSorted
    return executiveCabinetsSorted.filter((cabinet) => {
      const head = cabinet.headTenure
      const effCountryId = head?.countryId ?? cabinet.countryId
      const effHistCountryId =
        head?.historicalCountryId ?? cabinet.historicalCountryId
      if (cabinetCountryFilter === countryId) {
        return effCountryId === countryId && !effHistCountryId
      }
      return effHistCountryId === cabinetCountryFilter
    })
  }, [executiveCabinetsSorted, cabinetCountryFilter, countryId])

  /** 직위 유형 탭: 현재 국가 범위에 실제 존재하는 분류만 노출(전체는 별도) */
  const cabinetCategoryOptions = useMemo(() => {
    const present = new Set<CabinetCategoryFilterKey>()
    for (const cabinet of countryFilteredCabinets) {
      present.add(cabinetHeadCategory(cabinet.headTenure))
    }
    return CABINET_CATEGORY_ORDER.filter((category) =>
      present.has(category),
    ).map((category) => ({ category, label: CABINET_CATEGORY_LABEL[category] }))
  }, [countryFilteredCabinets])

  const filteredCabinets = useMemo(() => {
    let list = countryFilteredCabinets

    // 헌정 체제(정체·헌정 탭 연동) 필터
    if (activeRegimeFilter) {
      list = list.filter((cabinet) =>
        doesCabinetMatchPoliticalSystem(cabinet, activeRegimeFilter),
      )
    }

    // 직위 유형 필터 (대통령/총리/집단지도…)
    if (cabinetCategoryFilter) {
      list = list.filter(
        (cabinet) =>
          cabinetHeadCategory(cabinet.headTenure) === cabinetCategoryFilter,
      )
    }

    const query = cabinetSearchQuery.trim().toLowerCase()
    if (!query) return list
    return list.filter((cabinetItem) => {
      const head = cabinetItem.headTenure
      const personName = head?.person ? getPersonName(head.person) : ''
      const posTitle =
        head?.title ??
        head?.positionDefinition?.title ??
        cabinetItem.name ??
        '집단지도체제'
      const { startDate: effStart, endDate: effEnd } =
        resolveCabinetEffectiveDates(cabinetItem)
      const cabOverride = {
        startDate: effStart,
        endDate: effEnd,
        countryId: cabinetItem.countryId,
        historicalCountryId: cabinetItem.historicalCountryId,
      }
      const start = effStart ? (formatSignedYearLabel(effStart) ?? '') : ''
      const end = effEnd ? (formatSignedYearLabel(effEnd) ?? '') : '현재'
      const territory = getHeadTenureTerritoryLabel(
        head ?? {
          country: cabinetItem.country,
          historicalCountry: cabinetItem.historicalCountry,
        },
        country.name,
      )
      const cabName =
        typeof cabinetItem.name === 'string' ? cabinetItem.name : ''
      const partyNames = [
        ...(cabinetItem.politicalParties ?? []).map(
          (partyEntry) => partyEntry.party?.name ?? '',
        ),
        head?.party?.name ?? '',
      ].join(' ')
      const eraLine = resolveReignEraLineForCabinetHead(
        head,
        countryTenures as Parameters<
          typeof resolveReignEraLineForCabinetHead
        >[1],
        cabinetTimelineCountryScope,
        effStart,
        cabOverride,
      )
      const monarchLine = overlappingMonarchCaptionForExecutiveHead(
        head,
        countryTenures as readonly GovernmentHeadTenureInCabinetList[],
        cabinetTimelineCountryScope,
        cabOverride,
      )
      const monarchTenure = overlappingMonarchTenureForExecutiveHead(
        head,
        countryTenures as readonly GovernmentHeadTenureInCabinetList[],
        cabinetTimelineCountryScope,
        cabOverride,
      )
      const monarchPersonRaw = monarchTenure
        ? getRegnalOrPersonDisplayName(monarchTenure)
        : '—'
      const monarchPersonSearch =
        monarchPersonRaw !== '—' ? monarchPersonRaw : ''
      return [
        personName,
        posTitle,
        start,
        end,
        territory,
        cabName,
        partyNames,
        eraLine,
        monarchLine,
        monarchPersonSearch,
      ].some((val) =>
        String(val ?? '')
          .toLowerCase()
          .includes(query),
      )
    })
  }, [
    countryFilteredCabinets,
    activeRegimeFilter,
    cabinetCategoryFilter,
    cabinetSearchQuery,
    country.name,
    countryTenures,
    cabinetTimelineCountryScope,
  ])

  /** 타임라인·범례: 내각(행정부)만 — 군주는 칸으로 넣지 않음 */
  const timelineCabinetsMerged = useMemo(() => {
    const dir = cabinetSortOrder === 'asc' ? 1 : -1
    return [...filteredCabinets].sort((left, right) => {
      const leftStart = resolveCabinetEffectiveDates(left).startDate
      const rightStart = resolveCabinetEffectiveDates(right).startDate
      const dateLeft = getSignedDateChronologyKey(leftStart, 0)
      const dateRight = getSignedDateChronologyKey(rightStart, 0)
      return (dateLeft - dateRight) * dir
    })
  }, [filteredCabinets, cabinetSortOrder])

  const reignEraLineByCabinetId = useMemo(() => {
    const eraMap = new Map<string, string>()
    const tenures = countryTenures as Parameters<
      typeof resolveReignEraLineForCabinetHead
    >[1]
    for (const cabItem of timelineCabinetsMerged) {
      const effDates = resolveCabinetEffectiveDates(cabItem)
      const line = resolveReignEraLineForCabinetHead(
        cabItem.headTenure,
        tenures,
        cabinetTimelineCountryScope,
        effDates.startDate,
        {
          countryId: cabItem.countryId,
          historicalCountryId: cabItem.historicalCountryId,
        },
      )
      if (line) eraMap.set(cabItem.id, line)
    }
    return eraMap
  }, [timelineCabinetsMerged, countryTenures, cabinetTimelineCountryScope])

  /** 군주별 색·라벨 — 타임라인 칸·가로 띠·범례(상단 「군주 재위」 블록 없음) */
  const cabinetTimelineMonarchVisuals = useMemo(() => {
    const tenures =
      countryTenures as readonly GovernmentHeadTenureInCabinetList[]
    const scope = cabinetTimelineCountryScope
    const monarchOrder = new Map<string, number>()
    let nextOrd = 0
    for (const cabItem of timelineCabinetsMerged) {
      const effDates = resolveCabinetEffectiveDates(cabItem)
      const matchedMonarch = overlappingMonarchTenureForExecutiveHead(
        cabItem.headTenure,
        tenures,
        scope,
        {
          startDate: effDates.startDate,
          endDate: effDates.endDate,
          countryId: cabItem.countryId,
          historicalCountryId: cabItem.historicalCountryId,
        },
      )
      if (matchedMonarch && !monarchOrder.has(matchedMonarch.id)) {
        monarchOrder.set(matchedMonarch.id, nextOrd++)
      }
    }
    const byCabinetId = new Map<
      string,
      { lineHex: string; monarchId: string }
    >()
    for (const cabItem of timelineCabinetsMerged) {
      const effDates = resolveCabinetEffectiveDates(cabItem)
      const matchedMonarch = overlappingMonarchTenureForExecutiveHead(
        cabItem.headTenure,
        tenures,
        scope,
        {
          startDate: effDates.startDate,
          endDate: effDates.endDate,
          countryId: cabItem.countryId,
          historicalCountryId: cabItem.historicalCountryId,
        },
      )
      if (!matchedMonarch) continue
      const ord = monarchOrder.get(matchedMonarch.id) ?? 0
      const lineHex =
        TL_MONARCH_LINE_HEXES[ord % TL_MONARCH_LINE_HEXES.length]
      byCabinetId.set(cabItem.id, { lineHex, monarchId: matchedMonarch.id })
    }
    const legend = [...monarchOrder.entries()]
      .sort((leftEntry, rightEntry) => leftEntry[1] - rightEntry[1])
      .map(([monId, ord]) => {
        const cab = timelineCabinetsMerged.find((cabItem) => {
          const effDates = resolveCabinetEffectiveDates(cabItem)
          const matchedMonarch = overlappingMonarchTenureForExecutiveHead(
            cabItem.headTenure,
            tenures,
            scope,
            {
              startDate: effDates.startDate,
              endDate: effDates.endDate,
              countryId: cabItem.countryId,
              historicalCountryId: cabItem.historicalCountryId,
            },
          )
          return matchedMonarch?.id === monId
        })
        const mTenure = tenures.find((tenureItem) => tenureItem.id === monId)
        const pivotIso =
          (cab ? resolveCabinetEffectiveDates(cab).startDate : null) ??
          mTenure?.startDate
        const label = sovereignLegendPersonLabelFromMonarchTenure(
          mTenure ?? null,
          pivotIso ?? null,
        )
        return {
          key: monId,
          label,
          lineHex: TL_MONARCH_LINE_HEXES[ord % TL_MONARCH_LINE_HEXES.length],
        }
      })
    return { byCabinetId, legend }
  }, [timelineCabinetsMerged, countryTenures, cabinetTimelineCountryScope])

  /** 목록에 등장하는 소속마다 서로 다른 강조색(ordinal) — 같은 countryId만 있어도 이름 키로 분리 */
  const cabinetTerritoryOrdinalMap = useMemo(
    () => buildCabinetTerritoryOrdinalMap(timelineCabinetsMerged),
    [timelineCabinetsMerged],
  )

  const cabinetTerritoryLegendEntries = useMemo(
    () =>
      buildCabinetTerritoryLegendEntries(
        timelineCabinetsMerged,
        country.name,
        cabinetTerritoryOrdinalMap,
        country.type === 'modern'
          ? {
              modernCountryId: country.id,
              historicalCountries: country.historicalCountries,
            }
          : {
              historicalCountries: constituentPolities,
              pageHistoricalCountry: {
                id: country.id,
                startYear: country.startYear ?? null,
                startEra: country.startEra ?? null,
                startMonth: country.startMonth ?? null,
                startDay: country.startDay ?? null,
              },
            },
        { groupByHeadTerritory: true },
      ),
    [
      timelineCabinetsMerged,
      country.name,
      cabinetTerritoryOrdinalMap,
      country,
      constituentPolities,
    ],
  )

  /** 현대국가 + 하위 역사국가, 또는 복합 역사국가 + 구성국이 있을 때 "전체" 목록에서 소속 정치체명 표시 */
  const showCabinetTerritoryLabels = useMemo(
    () =>
      cabinetCountryFilter === '' &&
      ((country.type === 'modern' &&
        Array.isArray(country.historicalCountries) &&
        country.historicalCountries.length > 0) ||
        (country.type === 'historical' && historicalConstituentTabs.length > 0)),
    [country, cabinetCountryFilter, historicalConstituentTabs.length],
  )

  /** 타임라인 그리드 행(열 수만큼 슬라이스) — 한 번만 계산 */
  const cabinetTimelineRows = useMemo(() => {
    const cols = timelineColumnCount
    const list = timelineCabinetsMerged
    const rows: any[][] = []
    for (let i = 0; i < list.length; i += cols) {
      rows.push(list.slice(i, i + cols))
    }
    return rows
  }, [timelineCabinetsMerged, timelineColumnCount])

  /** 요약 헤더 연도 범위 — 수반 재임 시작·종료 + 겹치는 군주 재위 구간 */
  const cabinetTimelineYearRange = useMemo(() => {
    const tenures = countryTenures as Parameters<
      typeof cabinetTimelineHeaderYearRange
    >[1]
    return cabinetTimelineHeaderYearRange(
      timelineCabinetsMerged,
      tenures,
      cabinetTimelineCountryScope,
    )
  }, [timelineCabinetsMerged, countryTenures, cabinetTimelineCountryScope])

  const isMinisterMatched = (t: GovernmentCabinetTenureItem) => {
    const q = ministerSearchQuery.trim().toLowerCase()
    if (!q) return true
    const personName = getPersonName(t.person)
    const title = t.title ?? t.positionDefinition?.title ?? ''
    const start = t.startDate ? formatDate(t.startDate) : ''
    const end = t.endDate ? formatDate(t.endDate) : '현재'
    return [personName, title, start, end].some((v) =>
      String(v).toLowerCase().includes(q),
    )
  }

  /** 선택한 정권의 각료 — 부처 그리드에 채우기 위함 */
  const effectiveCountryIdForDept =
    country.type === 'historical' ? undefined : country.id
  const effectiveHistoricalCountryIdForDept =
    country.type === 'historical' ? country.id : undefined
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
  const { data: allMinistriesForCabinet = [] } = useQuery({
    queryKey: effectiveHistoricalCountryIdForDept
      ? administrationDepartmentsByHistoricalCountryQueryKey(
          effectiveHistoricalCountryIdForDept,
          { includeConstituents: true },
        )
      : administrationDepartmentsByCountryQueryKey(effectiveCountryIdForDept),
    queryFn: () =>
      effectiveHistoricalCountryIdForDept
        ? administrationDepartmentApi.getByHistoricalCountryId(
            effectiveHistoricalCountryIdForDept,
            { includeConstituents: true },
          )
        : effectiveCountryIdForDept
          ? administrationDepartmentApi.getByCountryId(effectiveCountryIdForDept)
          : Promise.resolve([]),
    enabled: Boolean(
      effectiveCountryIdForDept || effectiveHistoricalCountryIdForDept,
    ),
  })

  /** 선택된 행정부 또는 각료 추가 대상 행정부의 시대/역사국가에 맞춰 필터링된 부처 목록 */
  const ministriesForCabinet = useMemo(() => {
    const targetCabinet =
      addMinisterCabinet ??
      (cabinets as CabinetListItemDto[]).find(
        (cabItem) => cabItem.id === selectedCabinetId,
      ) ??
      null
    if (!targetCabinet) return allMinistriesForCabinet
    const effectiveDates = resolveCabinetEffectiveDates(targetCabinet)
    return filterDepartmentsForCabinet(allMinistriesForCabinet, {
      startDate: effectiveDates.startDate,
      endDate: effectiveDates.endDate,
      historicalCountryId:
        targetCabinet.historicalCountryId ??
        targetCabinet.headTenure?.historicalCountryId ??
        null,
      allowedHistoricalCountryIds: allowedHistoricalIdsSet,
    })
  }, [
    allMinistriesForCabinet,
    addMinisterCabinet,
    cabinets,
    selectedCabinetId,
    allowedHistoricalIdsSet,
  ])

  const { data: positionDefinitions = [] } = useQuery({
    queryKey: [
      'position-definitions',
      'cabinet',
      countryId ?? null,
      historicalCountryId ?? null,
    ],
    queryFn: () =>
      personCareerApi.getPositionDefinitions({
        countryId: countryId || undefined,
        historicalCountryId: historicalCountryId || undefined,
      }),
    enabled:
      (!!countryId || !!historicalCountryId) &&
      (registerCabinetModalOpen ||
        !!editingCabinet ||
        !!addMinisterCabinet),
  })

  const headPositionOptions = useMemo(
    () =>
      (positionDefinitions as any[]).filter(
        (d: any) => d.positionType && HEAD_POSITION_TYPES.has(d.positionType),
      ),
    [positionDefinitions],
  )

  const resetHistoryForm = () => {
    setHistoryTitle('')
    setHistoryStartDate('')
    setHistoryEndDate('')
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
      invalidateTenureQueries(queryClient)
      setEditingHistoryContent(false)
      setHistoryDraftContent('')
      notify.success('저장되었습니다.')
    } catch {
      notify.error('저장에 실패했습니다.')
    } finally {
      setHistoryContentSaving(false)
    }
  }

  const saveHistoryMeta = async (tenureId: string, achievementId: string) => {
    if (!historyMetaTitle.trim()) {
      notify.error('제목을 입력해 주세요.')
      return
    }
    setHistoryMetaSaving(true)
    try {
      await personCareerApi.updateTenureAchievement(tenureId, achievementId, {
        title: historyMetaTitle.trim(),
        startDate: historyMetaStartDate || undefined,
        endDate: historyMetaEndDate || undefined,
      })
      invalidateTenureQueries(queryClient)
      setEditingHistoryMeta(false)
      notify.success('저장되었습니다.')
    } catch {
      notify.error('저장에 실패했습니다.')
    } finally {
      setHistoryMetaSaving(false)
    }
  }

  const submitMinisterHistory = async () => {
    if (!historyTargetTenure) return
    if (!historyTitle.trim()) {
      notify.error('히스토리 제목을 입력해 주세요.')
      return
    }

    setHistorySubmitting(true)
    try {
      const payload = {
        title: historyTitle.trim(),
        startDate: historyStartDate || undefined,
        endDate: historyEndDate || undefined,
        showOnEventsPage: false,
      }

      await personCareerApi.createTenureAchievement(
        historyTargetTenure.id,
        payload,
      )
      notify.success('히스토리가 등록되었습니다.')

      invalidateTenureQueries(queryClient)
      resetHistoryForm()
    } catch (e: any) {
      notify.error(
        e?.response?.data?.message ??
          e?.message ??
          '히스토리 저장에 실패했습니다.',
      )
    } finally {
      setHistorySubmitting(false)
    }
  }

  const handleAddMinister = (
    cabinet: any,
    preselectedDeptId?: string | null,
  ) => {
    setAddMinisterCabinet(cabinet)
    setEditingMinisterForModal(null)
    setPreselectedMinisterDeptId(preselectedDeptId ?? null)
    setAppointmentModalOpen(true)
  }

  const handleEditMinister = (minister: any) => {
    if (!selectedCabinet) return
    setAddMinisterCabinet(selectedCabinet)
    setPreselectedMinisterDeptId(null)
    setEditingMinisterForModal({
      id: minister.id,
      personId: minister.personId ?? minister.person?.id ?? null,
      personName: minister.person ? getPersonName(minister.person) : null,
      positionType:
        minister.positionType ??
        minister.positionDefinition?.positionType ??
        'CABINET_MINISTER',
      positionDefinitionId:
        minister.positionDefinition?.id ??
        minister.positionDefinitionId ??
        null,
      title: minister.title ?? minister.positionDefinition?.title ?? null,
      rankTitle: minister.rankTitle ?? null,
      ordinal: minister.ordinal ?? null,
      partyId: minister.partyId ?? minister.party?.id ?? null,
      administrationDepartmentId:
        minister.administrationDepartmentId ??
        minister.administrationDepartment?.id ??
        null,
      cabinetId: selectedCabinet.id,
      startDate: minister.startDate ?? null,
      endDate: minister.endDate ?? null,
      startEra: minister.startEra ?? null,
      startYear: minister.startYear ?? null,
      startMonth: minister.startMonth ?? null,
      startDay: minister.startDay ?? null,
      endEra: minister.endEra ?? null,
      endYear: minister.endYear ?? null,
      endMonth: minister.endMonth ?? null,
      endDay: minister.endDay ?? null,
    })
    setAppointmentModalOpen(true)
  }

  const handleDetachMinisterFromCabinet = async (minister: any) => {
    if (!selectedCabinet?.id || !minister?.id) return
    const personLabel = minister.person
      ? getPersonName(minister.person)
      : '해당 각료'
    const ok = await confirm({
      title: '내각 각료 편입 해제',
      message: `「${personLabel}」을(를) 이 행정부에서 제외합니다. 중앙부처·인물의 본래 재임 기록은 삭제되지 않고 내각 연결만 해제됩니다.`,
      confirmLabel: '편입 해제',
      danger: true,
    })
    if (!ok) return
    try {
      await personCareerApi.detachCabinetMember(selectedCabinet.id, minister.id)
      notify.success('내각 연결을 해제했습니다.')
      if (selectedMinisterId === minister.id) {
        selectMinisterWithUrl(null)
      }
      invalidateTenureQueries(queryClient)
      void queryClient.invalidateQueries({
        queryKey: ['cabinet-suggested-members', selectedCabinet.id],
      })
    } catch (err: unknown) {
      notify.error(getApiErrorMessage(err, '편입 해제에 실패했습니다.'))
    }
  }

  /** 각료 상세 뷰에서 직접 히스토리 삭제 */
  const deleteMinisterHistoryDirect = async (
    tenureId: string,
    achievementId: string,
  ) => {
    if (
      !(await confirm({
        title: '삭제 확인',
        message: '이 히스토리를 삭제하시겠습니까?',
        danger: true,
      }))
    )
      return
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
      invalidateTenureQueries(queryClient)
      notify.success('히스토리가 삭제되었습니다.')
    } catch (e: any) {
      notify.error(
        e?.response?.data?.message ??
          e?.message ??
          '히스토리 삭제에 실패했습니다.',
      )
    }
  }

  const cabinetCountByHeadId = useMemo(() => {
    const counts = new Map<string, number>()
    for (const cabinetItem of cabinets as any[]) {
      if (cabinetItem.headTenureId) {
        counts.set(
          cabinetItem.headTenureId,
          (counts.get(cabinetItem.headTenureId) ?? 0) + 1,
        )
      }
    }
    return counts
  }, [cabinets])

  const headTenuresForRegister = useMemo(
    () =>
      (countryTenures as any[])
        .filter((tenureItem: any) => {
          const posType =
            tenureItem.positionType ??
            tenureItem.positionDefinition?.positionType ??
            tenureItem.position?.positionType
          return Boolean(posType && HEAD_POSITION_TYPES.has(posType))
        })
        .map((tenureItem: any) => ({
          ...tenureItem,
          _existingCabinetCount: cabinetCountByHeadId.get(tenureItem.id) ?? 0,
        })),
    [countryTenures, cabinetCountByHeadId],
  )

  const openCabinetRegisterModal = useCallback(
    (preferredMode?: CabinetFormMode) => {
      setRegisterModalInitialMode(preferredMode)
      setRegisterCabinetModalOpen(true)
    },
    [],
  )

  const handleDeleteCabinet = async (
    cabinetId: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation()
    if (
      !(await confirm({
        title: '행정부 삭제 확인',
        message:
          '이 행정부(내각) 구성을 삭제합니다. 수반 재임과 소속 각료 재임 기록 자체는 삭제되지 않고 행정부 연결만 해제됩니다. 계속할까요?',
        danger: true,
      }))
    )
      return
    setDeletingCabinetId(cabinetId)
    try {
      await personCareerApi.deleteCabinet(cabinetId)
      notify.success('행정부가 삭제되었습니다.')
      if (selectedCabinetId === cabinetId) {
        clearCabinetSelectionInUrl()
      }
      invalidateTenureQueries(queryClient)
    } catch (err: any) {
      notify.error(
        err?.response?.data?.message ?? err?.message ?? '삭제에 실패했습니다.',
      )
    } finally {
      setDeletingCabinetId(null)
    }
  }

  const handleOpenEditCabinet = (cabinetItem: any, clickEvent?: React.MouseEvent) => {
    clickEvent?.stopPropagation()
    setEditingCabinet(cabinetItem)
  }

  const closeEditCabinetModal = () => {
    setEditingCabinet(null)
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
              notes: optionalCabinetTenureRichText(editingNotes),
            }
          : {
              endReason: (editingEndReason || undefined) as any,
              endReasonDetail: optionalCabinetTenureRichText(
                editingEndReasonDetail,
              ),
            }),
      })
      notify.success('저장되었습니다.')
      setEditingTenureInfo(null)
      invalidateTenureQueries(queryClient)
    } catch (err: any) {
      notify.error(
        err?.response?.data?.message ?? err?.message ?? '저장에 실패했습니다.',
      )
    } finally {
      setTenureInfoSubmitting(false)
    }
  }

  const prevCabinetIdForResetRef = useRef<string | null>(selectedCabinetId)
  useEffect(() => {
    if (prevCabinetIdForResetRef.current === selectedCabinetId) return
    prevCabinetIdForResetRef.current = selectedCabinetId
    setMinisterSearchQuery('')
    setSelectedHistoryId(null)
    setSelectedHeadHistoryId(null)
    setSelectedTreatyId(null)
    setEditingTenureInfo(null)
  }, [selectedCabinetId])

  const {
    data: cabinetTreatiesData,
    isPending: loadingCabinetTreaties,
  } = useQuery({
    queryKey: ['treaties-by-cabinet', selectedCabinetId],
    queryFn: () => treatyApi.getAll({ cabinetId: selectedCabinetId! }),
    enabled: Boolean(selectedCabinetId && cabinetView === 'detail'),
    staleTime: 60_000,
  })
  const cabinetTreaties = cabinetTreatiesData?.items ?? []

  const handleUnlinkTreatyFromCabinet = async (
    treaty: TreatyDto,
    signatoryId: string,
  ) => {
    const ok = await confirm({
      title: '내각 조약 연결 해제',
      message: `「${treaty.name}」에서 이 행정부 연결을 해제합니다. 조약 본체와 국가 서명 기록은 유지됩니다.`,
      confirmLabel: '연결 해제',
      danger: true,
    })
    if (!ok) return
    try {
      await treatyApi.updateSignatory(signatoryId, { cabinetId: null })
      notify.success('이 행정부에서 조약 연결을 해제했습니다.')
      if (selectedTreatyId === treaty.id) {
        setSelectedTreatyId(null)
      }
      void queryClient.invalidateQueries({
        queryKey: ['treaties-by-cabinet', selectedCabinetId],
      })
      void queryClient.invalidateQueries({ queryKey: ['cabinets-by-country'] })
      void queryClient.invalidateQueries({ queryKey: ['cabinets'] })
      void queryClient.invalidateQueries({ queryKey: ['global-cabinets'] })
      void queryClient.invalidateQueries({ queryKey: ['global-cabinet-detail'] })
    } catch (err: unknown) {
      notify.error(getApiErrorMessage(err, '조약 연결 해제에 실패했습니다.'))
    }
  }

  const selectedCabinet = (cabinets as any[]).find(
    (c: any) => c.id === selectedCabinetId,
  )
  const hasSelectedCabinet = Boolean(selectedCabinetId && selectedCabinet)

  /** 전임·후임 내각 및 동일 수반 개각(제1차·2차) 연속 탐색 정보 */
  const cabinetContinuityNav = useMemo(() => {
    if (!selectedCabinet) {
      return {
        prevCabinet: null as CabinetNavTarget | null,
        nextCabinet: null as CabinetNavTarget | null,
        cabinetPositionBadge: null as string | null,
        siblingCabinets: [] as CabinetNavTarget[],
      }
    }
    const basePool =
      countryFilteredCabinets.some((cab) => cab.id === selectedCabinet.id)
        ? countryFilteredCabinets
        : executiveCabinetsSorted
    const toNavTarget = (cab: CabinetListItemDto): CabinetNavTarget => {
      const effDates = resolveCabinetEffectiveDates(cab)
      const startYr = effDates.startDate
        ? formatSignedYearLabel(effDates.startDate)
        : null
      const endYr = effDates.endDate
        ? formatSignedYearLabel(effDates.endDate)
        : effDates.startDate
          ? '현재'
          : null
      return {
        id: cab.id,
        label: formatCabinetHeadBreadcrumbLabel(cab.headTenure, cab.name),
        period: startYr ? `${startYr}${endYr && endYr !== startYr ? `–${endYr}` : ''}` : null,
      }
    }
    const idx = basePool.findIndex((cab) => cab.id === selectedCabinet.id)
    const prevCabinet = idx > 0 ? toNavTarget(basePool[idx - 1]) : null
    const nextCabinet =
      idx >= 0 && idx < basePool.length - 1
        ? toNavTarget(basePool[idx + 1])
        : null
    const cabinetPositionBadge =
      idx >= 0 && basePool.length > 0 ? `${idx + 1} / ${basePool.length}` : null

    const sharedHeadId = selectedCabinet.headTenure?.id ?? null
    const siblingCabinets = sharedHeadId
      ? sortedCabinets
          .filter((cab) => cab.headTenure?.id === sharedHeadId)
          .map((cab, sibIdx) => {
            const effDates = resolveCabinetEffectiveDates(cab)
            const startYr = effDates.startDate
              ? formatSignedYearLabel(effDates.startDate)
              : null
            return {
              id: cab.id,
              label: cab.name?.trim() || `제${sibIdx + 1}차 내각`,
              period: startYr,
            }
          })
      : []

    return {
      prevCabinet,
      nextCabinet,
      cabinetPositionBadge,
      siblingCabinets,
    }
  }, [
    selectedCabinet,
    countryFilteredCabinets,
    executiveCabinetsSorted,
    sortedCabinets,
  ])

  /** 같은 사건 묶음의 다른 행정부 — 모달과 동일 queryKey로 캐시 공유 */
  const {
    data: linkedCabinetsInDetail = [],
    isPending: loadingLinkedCabinetsInDetail,
  } = useQuery({
    queryKey: ['cabinet-linked-cabinets', selectedCabinetId],
    queryFn: () =>
      selectedCabinetId
        ? personCareerApi.getLinkedCabinets(selectedCabinetId)
        : Promise.resolve([]),
    enabled: !!selectedCabinetId && cabinetView === 'detail',
  })

  /** 내각 기간과 겹치는 해당 국가 중앙부처 장·차관 추천 목록 */
  const { data: suggestedCabinetMembers = [] } = useQuery<
    SuggestedCabinetMemberDto[]
  >({
    queryKey: ['cabinet-suggested-members', selectedCabinetId],
    queryFn: () =>
      selectedCabinetId
        ? personCareerApi.getSuggestedCabinetMembers(selectedCabinetId)
        : Promise.resolve([]),
    enabled: Boolean(
      selectedCabinetId &&
        cabinetView === 'detail' &&
        !selectedMinisterId &&
        !selectedHeadHistoryId,
    ),
  })

  const suggestionCabinetRef = useRef<string | null>(null)
  const seenSuggestionIdsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    const incomingIds = suggestedCabinetMembers.map(
      (suggestedItem) => suggestedItem.tenureId,
    )
    const incomingSet = new Set(incomingIds)
    if (suggestionCabinetRef.current !== selectedCabinetId) {
      suggestionCabinetRef.current = selectedCabinetId
      seenSuggestionIdsRef.current = new Set(incomingIds)
      setSelectedSuggestionIds(incomingIds)
      return
    }
    setSelectedSuggestionIds((prev) => {
      const kept = prev.filter((id) => incomingSet.has(id))
      const newlyArrived = incomingIds.filter(
        (id) => !seenSuggestionIdsRef.current.has(id),
      )
      seenSuggestionIdsRef.current = new Set(incomingIds)
      if (newlyArrived.length === 0 && kept.length === prev.length) {
        return prev
      }
      return Array.from(new Set([...kept, ...newlyArrived]))
    })
  }, [selectedCabinetId, suggestedCabinetMembers])

  const handleAttachSuggestedMinisters = async () => {
    if (!selectedCabinetId || selectedSuggestionIds.length === 0) return
    const selectedSet = new Set(selectedSuggestionIds)
    const itemsToAttach = suggestedCabinetMembers
      .filter((suggestedItem) => selectedSet.has(suggestedItem.tenureId))
      .map((suggestedItem) => ({
        tenureId: suggestedItem.tenureId,
        administrationDepartmentId:
          suggestedItem.administrationDepartment?.id ?? null,
        roleTitle:
          suggestedItem.title ??
          suggestedItem.positionDefinition?.title ??
          null,
      }))
    if (itemsToAttach.length === 0) return
    setAttachingSuggestions(true)
    try {
      await personCareerApi.attachCabinetMembers(
        selectedCabinetId,
        itemsToAttach,
      )
      notify.success(
        `${itemsToAttach.length}명의 부처 재임을 내각 각료로 일괄 편입했습니다.`,
      )
      invalidateTenureQueries(queryClient)
      void queryClient.invalidateQueries({
        queryKey: ['cabinet-suggested-members', selectedCabinetId],
      })
    } catch (err: unknown) {
      notify.error(getApiErrorMessage(err, '일괄 편입에 실패했습니다.'))
    } finally {
      setAttachingSuggestions(false)
    }
  }

  useLayoutEffect(() => {
    if (!selectedHeadHistoryId && !selectedHistoryId) return
    const el = cabinetDetailViewRootRef.current
    if (!el) return
    scrollCabinetDetailAreaToTop(el)
    requestAnimationFrame(() => scrollCabinetDetailAreaToTop(el))
  }, [selectedHeadHistoryId, selectedHistoryId])

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

  /** 재임 기록 등록 모달 — 수반 재임이면 제목 구분 */
  const historyModalTitle =
    historyTargetTenure &&
    selectedCabinet?.headTenure?.id === historyTargetTenure.id
      ? '수반 재임 기록'
      : '각료 재임 기록'

  useEffect(() => {
    if (historyTargetTenureId && !historyTargetTenure) {
      closeHistoryModal()
    }
  }, [historyTargetTenureId, historyTargetTenure])

  const nonHeadMinisters = useMemo(() => {
    const headId = selectedCabinet?.headTenure?.id ?? null
    if (!headId) return selectedCabinetMinisters
    return selectedCabinetMinisters.filter(
      (ministerItem) => ministerItem.id !== headId,
    )
  }, [selectedCabinetMinisters, selectedCabinet?.headTenure?.id])

  const visibleSelectedCabinetMinisters = nonHeadMinisters.filter(
    (tenureItem) => isMinisterMatched(tenureItem),
  )
  const sortedVisibleMinisters = useMemo(
    () =>
      [...visibleSelectedCabinetMinisters].sort((leftMin, rightMin) => {
        const leftTime = getSignedDateChronologyKey(leftMin?.startDate, 0)
        const rightTime = getSignedDateChronologyKey(rightMin?.startDate, 0)
        return rightTime - leftTime
      }),
    [visibleSelectedCabinetMinisters],
  )

  const resolveMinisterDepartment = (
    tenureItem: GovernmentCabinetTenureItem,
  ): { id: string; name: string; categoryId?: string | null } | null => {
    const matched = findDepartmentForMember(
      {
        title:
          tenureItem?.title ?? tenureItem?.positionDefinition?.title ?? null,
        administrationDepartmentId:
          tenureItem?.administrationDepartmentId ??
          tenureItem?.positionDefinition?.administrationDepartmentId ??
          null,
        administrationDepartment: tenureItem?.administrationDepartment ?? null,
        positionDefinition: tenureItem?.positionDefinition ?? null,
      },
      allMinistriesForCabinet,
    )
    if (matched) return matched
    if (
      tenureItem?.administrationDepartment?.id &&
      tenureItem?.administrationDepartment?.name
    ) {
      return {
        id: tenureItem.administrationDepartment.id,
        name: tenureItem.administrationDepartment.name,
        categoryId: tenureItem.administrationDepartment.categoryId ?? null,
      }
    }
    return null
  }

  const getMinisterDepartmentName = (
    tenureItem: GovernmentCabinetTenureItem,
  ) => {
    if (tenureItem?.administrationDepartment?.name) {
      return tenureItem.administrationDepartment.name
    }
    const matched = resolveMinisterDepartment(tenureItem)
    return matched?.name ?? '미연결'
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
      <CabS.CabinetDetailPrintGlobalStyle />
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
                {/* ── 단일 행 슬림 툴바: 검색 + 시대 선택 + [⋯] + 등록 ── */}
                <CabS.CabListToolbar>
                  {(() => {
                    const polityFilterOptions: Array<{
                      id: string
                      label: string
                    }> =
                      country.type === 'modern' &&
                      Array.isArray(country.historicalCountries) &&
                      country.historicalCountries.length > 0
                        ? [
                            { id: '', label: '전체 시대 · 정치체' },
                            { id: countryId ?? '', label: country.name },
                            ...country.historicalCountries.map((histItem) => ({
                              id: histItem.id,
                              label: histItem.name,
                            })),
                          ]
                        : country.type === 'historical' &&
                            historicalConstituentTabs.length > 0
                          ? [
                              { id: '', label: '전체 구성국 · 정치체' },
                              {
                                id: country.id,
                                label: `${country.name} 직속`,
                              },
                              ...historicalConstituentTabs.map((polityTab) => ({
                                id: polityTab.id,
                                label: polityTab.name,
                              })),
                            ]
                          : []

                    const activePolityLabel = cabinetCountryFilter
                      ? (polityFilterOptions.find(
                          (optItem) => optItem.id === cabinetCountryFilter,
                        )?.label ?? null)
                      : null

                    const hasLegendItems =
                      cabinetTerritoryLegendEntries.length > 0 ||
                      cabinetTimelineMonarchVisuals.legend.some(
                        (legendEntry) => legendEntry.label !== '—',
                      )

                    const hasActiveToolbarFilters = Boolean(
                      cabinetCountryFilter ||
                        cabinetCategoryFilter ||
                        activeRegimeFilter,
                    )

                    return (
                      <>
                        <CabS.CabListControlsRow>
                          <CabS.CabListSearchBox>
                            <CabS.CabListSearchIcon aria-hidden>
                              <FiSearch size={14} />
                            </CabS.CabListSearchIcon>
                            <CabS.CabListSearchInput
                              type="text"
                              placeholder="수반명, 직위, 연도, 행정부명 검색…"
                              value={cabinetSearchQuery}
                              onChange={(changeEvent) =>
                                setCabinetSearchQuery(changeEvent.target.value)
                              }
                              $hasTrailing={Boolean(
                                cabinetSearchQuery.trim() ||
                                  timelineCabinetsMerged.length > 0,
                              )}
                            />
                            {cabinetSearchQuery.trim() ? (
                              <CabS.CabListSearchClearBtn
                                type="button"
                                aria-label="검색어 지우기"
                                onClick={() => setCabinetSearchQuery('')}
                              >
                                <FiX size={13} />
                              </CabS.CabListSearchClearBtn>
                            ) : (
                              timelineCabinetsMerged.length > 0 && (
                                <CabS.CabListSearchCount aria-hidden>
                                  {timelineCabinetsMerged.length}개
                                </CabS.CabListSearchCount>
                              )
                            )}
                          </CabS.CabListSearchBox>

                          {polityFilterOptions.length > 1 ? (
                            <select
                              aria-label="시대·정치체 필터"
                              value={cabinetCountryFilter}
                              onChange={(changeEvent) =>
                                setCabinetCountryFilter(
                                  changeEvent.target.value,
                                )
                              }
                              style={{
                                height: 34,
                                maxWidth: 200,
                                padding: '0 26px 0 10px',
                                borderRadius: 8,
                                border: `1px solid ${
                                  cabinetCountryFilter
                                    ? isDark
                                      ? '#a5b4fc'
                                      : MAIN
                                    : palette.borderMid
                                }`,
                                background: 'transparent',
                                color: cabinetCountryFilter
                                  ? palette.text
                                  : palette.textMuted,
                                fontSize: 12.5,
                                fontWeight: cabinetCountryFilter ? 700 : 600,
                                cursor: 'pointer',
                                outline: 'none',
                              }}
                            >
                              {polityFilterOptions.map((optItem) => (
                                <option
                                  key={optItem.id || '__all__'}
                                  value={optItem.id}
                                >
                                  {optItem.label}
                                </option>
                              ))}
                            </select>
                          ) : null}

                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              marginLeft: 'auto',
                              flexShrink: 0,
                            }}
                          >
                            <GovMorePopover
                              ariaLabel="행정부 목록 표시 및 필터 설정"
                              title="표시 방식 · 정렬 · 상세 필터 · 군주 등록"
                              menuWidth={280}
                              hasActiveIndicator={
                                cabinetListLayout !== 'timeline' ||
                                cabinetSortOrder !== 'asc' ||
                                Boolean(cabinetCategoryFilter) ||
                                Boolean(activeRegimeFilter) ||
                                showTimelineLegend ||
                                includeCeremonialMonarchs
                              }
                              segments={[
                                {
                                  key: 'cabinet-layout',
                                  label: '목록 표시 방식',
                                  value: cabinetListLayout,
                                  options: [
                                    {
                                      value: 'timeline',
                                      label: '타임라인',
                                      icon: <FiGrid size={12} />,
                                    },
                                    {
                                      value: 'ledger',
                                      label: '원장 목록',
                                      icon: <FiList size={12} />,
                                    },
                                  ],
                                  onChange: (nextVal) =>
                                    setCabinetListLayout(
                                      nextVal as 'timeline' | 'ledger',
                                    ),
                                },
                                {
                                  key: 'cabinet-sort',
                                  label: '정렬 순서',
                                  value: cabinetSortOrder,
                                  options: [
                                    {
                                      value: 'asc',
                                      label: '과거순',
                                      icon: <FiClock size={12} />,
                                    },
                                    {
                                      value: 'desc',
                                      label: '최신순',
                                      icon: <FiClock size={12} />,
                                    },
                                  ],
                                  onChange: (nextVal) =>
                                    setCabinetSortOrder(
                                      nextVal as 'asc' | 'desc',
                                    ),
                                },
                              ]}
                              customContent={
                                cabinetCategoryOptions.length > 1 ||
                                politicalSystems.length > 0 ? (
                                  <>
                                    {cabinetCategoryOptions.length > 1 ? (
                                      <GovMoreFieldGroup>
                                        <GovMoreFieldLabel htmlFor="cab-more-category-select">
                                          수반 직위 유형
                                        </GovMoreFieldLabel>
                                        <GovMoreNativeSelect
                                          id="cab-more-category-select"
                                          aria-label="직위 유형 필터"
                                          value={cabinetCategoryFilter}
                                          onChange={(changeEvent) =>
                                            setCabinetCategoryFilter(
                                              changeEvent.target.value as
                                                | CabinetCategoryFilterKey
                                                | '',
                                            )
                                          }
                                        >
                                          <option value="">전체 직위</option>
                                          {cabinetCategoryOptions.map(
                                            (catOpt) => (
                                              <option
                                                key={catOpt.category}
                                                value={catOpt.category}
                                              >
                                                {catOpt.label}
                                              </option>
                                            ),
                                          )}
                                        </GovMoreNativeSelect>
                                      </GovMoreFieldGroup>
                                    ) : null}

                                    {politicalSystems.length > 0 ? (
                                      <GovMoreFieldGroup>
                                        <GovMoreFieldLabel htmlFor="cab-more-regime-select">
                                          헌정 체제 필터
                                        </GovMoreFieldLabel>
                                        <GovMoreNativeSelect
                                          id="cab-more-regime-select"
                                          aria-label="헌정 체제 필터"
                                          value={regimeIdFromUrl}
                                          onChange={(changeEvent) =>
                                            setRegimeFilterInUrl(
                                              changeEvent.target.value,
                                            )
                                          }
                                        >
                                          <option value="">전체 체제</option>
                                          {politicalSystems.map((sysItem) => {
                                            const formLabel =
                                              sysItem.governmentForm
                                                ? (GOVERNMENT_FORM_META[
                                                    sysItem.governmentForm
                                                  ]?.label ??
                                                  sysItem.governmentForm)
                                                : null
                                            const optionText =
                                              sysItem.name?.trim() ||
                                              formLabel ||
                                              '헌정 체제'
                                            return (
                                              <option
                                                key={sysItem.id}
                                                value={sysItem.id}
                                              >
                                                {optionText}
                                              </option>
                                            )
                                          })}
                                        </GovMoreNativeSelect>
                                      </GovMoreFieldGroup>
                                    ) : null}
                                  </>
                                ) : undefined
                              }
                              toggles={[
                                ...(ceremonialMonarchCabinetCount > 0 &&
                                nonCeremonialCabinets.length > 0
                                  ? [
                                      {
                                        key: 'include-ceremonial-monarchs',
                                        label: `군주·상징 원수 함께 표시 (${ceremonialMonarchCabinetCount})`,
                                        description:
                                          '총리 내각 외 국왕·황제 재위 항목도 목록에 표시',
                                        checked: includeCeremonialMonarchs,
                                        onChange: setIncludeCeremonialMonarchs,
                                      },
                                    ]
                                  : []),
                                ...(hasLegendItems
                                  ? [
                                      {
                                        key: 'timeline-legend',
                                        label: '색상 범례 표시',
                                        description:
                                          '소속 정치체 · 동시대 군주 색상 안내',
                                        checked: showTimelineLegend,
                                        onChange: setShowTimelineLegend,
                                      },
                                    ]
                                  : []),
                              ]}
                              actions={[
                                {
                                  key: 'register-monarch',
                                  label: '군주 · 원수 재위 등록',
                                  icon: <FiPlus size={13.5} />,
                                  onClick: () =>
                                    openCabinetRegisterModal('monarch'),
                                },
                              ]}
                            />

                            <CabS.CabListRegisterBtn
                              type="button"
                              onClick={() => openCabinetRegisterModal()}
                            >
                              <FiPlus size={14} />
                              <span>행정부 · 내각 등록</span>
                            </CabS.CabListRegisterBtn>
                          </div>
                        </CabS.CabListControlsRow>

                        {hasActiveToolbarFilters ? (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: 6,
                              paddingTop: 2,
                            }}
                          >
                            {cabinetCountryFilter && activePolityLabel ? (
                              <button
                                type="button"
                                onClick={() => setCabinetCountryFilter('')}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  padding: '3px 9px',
                                  borderRadius: 999,
                                  border: `1px solid ${palette.borderMid}`,
                                  background: palette.inputBg,
                                  color: palette.text,
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                <span
                                  style={{
                                    color: palette.textMuted,
                                    fontWeight: 500,
                                  }}
                                >
                                  정치체:
                                </span>
                                <span>{activePolityLabel}</span>
                                <FiX size={12} color={palette.textMuted} />
                              </button>
                            ) : null}

                            {cabinetCategoryFilter ? (
                              <button
                                type="button"
                                onClick={() => setCabinetCategoryFilter('')}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  padding: '3px 9px',
                                  borderRadius: 999,
                                  border: `1px solid ${palette.borderMid}`,
                                  background: palette.inputBg,
                                  color: palette.text,
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                <span
                                  style={{
                                    color: palette.textMuted,
                                    fontWeight: 500,
                                  }}
                                >
                                  직위:
                                </span>
                                <span>
                                  {
                                    CABINET_CATEGORY_LABEL[
                                      cabinetCategoryFilter
                                    ]
                                  }
                                </span>
                                <FiX size={12} color={palette.textMuted} />
                              </button>
                            ) : null}

                            {activeRegimeFilter ? (
                              <button
                                type="button"
                                onClick={clearRegimeFilter}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  padding: '3px 9px',
                                  borderRadius: 999,
                                  border: `1px solid ${palette.borderMid}`,
                                  background: palette.inputBg,
                                  color: palette.text,
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                <span
                                  style={{
                                    color: palette.textMuted,
                                    fontWeight: 500,
                                  }}
                                >
                                  헌정 체제:
                                </span>
                                <span>
                                  {activeRegimeFilter.name ||
                                    (activeRegimeFilter.governmentForm
                                      ? (GOVERNMENT_FORM_META[
                                          activeRegimeFilter.governmentForm
                                        ]?.label ??
                                        activeRegimeFilter.governmentForm)
                                      : '선택된 체제')}
                                </span>
                                <FiX size={12} color={palette.textMuted} />
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </>
                    )
                  })()}
                </CabS.CabListToolbar>
              </CabS.CabListToolbarShell>
              {timelineCabinetsMerged.length === 0 ? (
                <CabS.CabListBody>
                  <EmptyStateFill>
                    {cabinetSearchQuery.trim() ||
                    cabinetCountryFilter ||
                    cabinetCategoryFilter ||
                    activeRegimeFilter ? (
                      <EmptyStateSpotlight
                        icon={<FiSearch size={30} strokeWidth={1.75} />}
                        title="검색 결과가 없습니다"
                        description="다른 검색어나 필터를 사용해 보세요."
                        primaryAction={{
                          label: '필터 초기화',
                          onClick: () => {
                            setCabinetSearchQuery('')
                            setCabinetCountryFilter('')
                            setCabinetCategoryFilter('')
                            clearRegimeFilter()
                          },
                          icon: <FiX size={14} />,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 14,
                          width: '100%',
                        }}
                      >
                        <EmptyStateSpotlight
                          icon={<FiUsers size={30} strokeWidth={1.75} />}
                          title="등록된 행정부가 없습니다"
                          description="총리·대통령·재상 등 수반 중심 내각, 집단지도정부, 국왕·황제 재위를 한 모달에서 빠르게 등록할 수 있습니다."
                          primaryAction={{
                            label: '행정부 · 내각 등록',
                            onClick: () => openCabinetRegisterModal(),
                            icon: <FiPlus size={16} strokeWidth={2.25} />,
                          }}
                          secondaryAction={{
                            label: '군주 · 원수 재위 등록',
                            onClick: () => openCabinetRegisterModal('monarch'),
                          }}
                        />

                        {(!hasAnyPoliticalSystem || !hasAnyDepartment) &&
                        (onOpenPoliticalSystemTab || onOpenMinistriesTab) ? (
                          <div
                            aria-label="권장 초기 세팅 순서"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexWrap: 'wrap',
                              gap: 8,
                              padding: '8px 14px',
                              borderRadius: 10,
                              border: `1px solid ${palette.borderMid}`,
                              background: palette.bgSubtle,
                              fontSize: 12,
                              color: palette.textMuted,
                            }}
                          >
                            <span style={{ fontWeight: 700, color: palette.text }}>
                              추천 세팅 순서
                            </span>
                            {onOpenPoliticalSystemTab ? (
                              <button
                                type="button"
                                onClick={onOpenPoliticalSystemTab}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '3px 9px',
                                  borderRadius: 6,
                                  border: `1px solid ${palette.borderMid}`,
                                  background: palette.cardBg,
                                  color: hasAnyPoliticalSystem
                                    ? palette.textMuted
                                    : palette.text,
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                {hasAnyPoliticalSystem ? (
                                  <FiCheck size={11.5} color="#10b981" />
                                ) : null}
                                <span>1. 정체·헌정</span>
                              </button>
                            ) : null}
                            <span aria-hidden>→</span>
                            {onOpenMinistriesTab ? (
                              <button
                                type="button"
                                onClick={() => onOpenMinistriesTab()}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '3px 9px',
                                  borderRadius: 6,
                                  border: `1px solid ${palette.borderMid}`,
                                  background: palette.cardBg,
                                  color: hasAnyDepartment
                                    ? palette.textMuted
                                    : palette.text,
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                {hasAnyDepartment ? (
                                  <FiCheck size={11.5} color="#10b981" />
                                ) : null}
                                <span>2. 중앙부처</span>
                              </button>
                            ) : null}
                            <span aria-hidden>→</span>
                            <button
                              type="button"
                              onClick={() => openCabinetRegisterModal()}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 9px',
                                borderRadius: 6,
                                border: `1px solid ${palette.borderMid}`,
                                background: palette.cardBg,
                                color: palette.text,
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              <span>3. 행정부·내각</span>
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </EmptyStateFill>
                </CabS.CabListBody>
              ) : (
                <CabS.CabListBody>
                  <CabS.CabTimelineSummaryOuter ref={timelineContainerRef}>
                    <CabS.CabTimelineSummaryHeader>
                      <CabS.CabTimelineSummaryTopRow>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            flexShrink: 0,
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
                                flexShrink: 0,
                              }}
                            >
                              <FiCalendar size={12} color={C.iconColor} />
                              <span
                                style={{ fontSize: 12, color: C.textMuted }}
                              >
                                {cabinetTimelineYearRange.minY < 0
                                  ? `BC ${Math.abs(cabinetTimelineYearRange.minY)}`
                                  : cabinetTimelineYearRange.minY}{' '}
                                –{' '}
                                {cabinetTimelineYearRange.maxY != null
                                  ? cabinetTimelineYearRange.maxY < 0
                                    ? `BC ${Math.abs(cabinetTimelineYearRange.maxY)}`
                                    : cabinetTimelineYearRange.maxY
                                  : '현재'}
                              </span>
                            </div>
                          </>
                        )}
                        {(cabinetTerritoryLegendEntries.length > 0 ||
                          (cabinetListLayout === 'timeline' &&
                            cabinetTimelineMonarchVisuals.legend.some(
                              (legendItem) => legendItem.label !== '—',
                            ))) && (
                          <button
                            type="button"
                            onClick={() =>
                              setShowTimelineLegend((prevVal) => !prevVal)
                            }
                            style={{
                              marginLeft: 'auto',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '3px 9px',
                              borderRadius: 999,
                              border: `1px solid ${palette.borderMid}`,
                              background: showTimelineLegend
                                ? palette.accentBg
                                : 'transparent',
                              color: showTimelineLegend
                                ? palette.accent
                                : palette.textMuted,
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            <span>
                              {showTimelineLegend ? '범례 접기' : '범례 보기'}
                            </span>
                          </button>
                        )}
                        {showTimelineLegend &&
                          cabinetTerritoryLegendEntries.length > 0 && (
                            <CabS.CabTimelineLegendRow
                              role="list"
                              aria-label="이 목록의 소속별 강조 색"
                            >
                              {cabinetTerritoryLegendEntries.map((entryItem) => (
                                <div
                                  key={entryItem.key}
                                  role="listitem"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    flexShrink: 0,
                                    maxWidth: '100%',
                                  }}
                                  title={entryItem.label}
                                >
                                  <span
                                    aria-hidden
                                    style={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: '50%',
                                      background: entryItem.line,
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
                                    {entryItem.label}
                                  </span>
                                </div>
                              ))}
                            </CabS.CabTimelineLegendRow>
                          )}
                        {showTimelineLegend &&
                        cabinetListLayout === 'timeline' &&
                        cabinetTimelineMonarchVisuals.legend.some(
                          (entryItem) => entryItem.label !== '—',
                        ) ? (
                          <CabS.CabTimelineMonarchLegendBand
                            role="list"
                            aria-label="타임라인 군주 색 구분"
                          >
                            {cabinetTimelineMonarchVisuals.legend
                              .filter((entryItem) => entryItem.label !== '—')
                              .map((entryItem) => {
                                const chip = cabinetTimelineMonarchUiTint(
                                  entryItem.lineHex,
                                  isDark,
                                )
                                return (
                                  <div
                                    key={entryItem.key}
                                    role="listitem"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 5,
                                      flexShrink: 0,
                                      maxWidth: '100%',
                                      padding: '3px 9px 3px 7px',
                                      borderRadius: 9999,
                                      border: `1px solid ${chip.border}`,
                                      background: chip.background,
                                    }}
                                    title={entryItem.label}
                                  >
                                    <span
                                      aria-hidden
                                      style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        background: entryItem.lineHex,
                                        flexShrink: 0,
                                        boxShadow: `0 0 0 1px ${chip.border}`,
                                      }}
                                    />
                                    <span
                                      style={{
                                        fontSize: 10.5,
                                        fontWeight: 600,
                                        color: C.textMuted,
                                        lineHeight: 1.3,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        maxWidth: 188,
                                        letterSpacing: '0.01em',
                                      }}
                                    >
                                      {entryItem.label}
                                    </span>
                                  </div>
                                )
                              })}
                          </CabS.CabTimelineMonarchLegendBand>
                        ) : null}
                      </CabS.CabTimelineSummaryTopRow>
                    </CabS.CabTimelineSummaryHeader>
                    {cabinetListLayout === 'ledger' ? (
                      <CabinetsLedgerView
                        items={timelineCabinetsMerged}
                        countryName={country.name}
                        isHistoricalCountry={isHistorical}
                        showTerritoryLabels={showCabinetTerritoryLabels}
                        reignEraLineByCabinetId={reignEraLineByCabinetId}
                        deletingCabinetId={deletingCabinetId}
                        onSelectCabinet={selectCabinetWithUrl}
                        onInspectPerson={setMentionPersonId}
                        onEditCabinet={handleOpenEditCabinet}
                      />
                    ) : (
                    <CabS.CabTimelineGrid
                      role="region"
                      aria-label="역대 행정부 타임라인"
                    >
                      <CabS.CabTimelineColRight>
                        {cabinetTimelineRows.map((rowItems, rowIdx) => {
                          const cols = timelineColumnCount
                          const rowFlowLine = C.borderMid
                          const thumbConnectorLineStyle: React.CSSProperties = {
                            width: 4,
                            maxWidth: 4,
                            height: '100%',
                            maxHeight: '100%',
                            flexShrink: 0,
                            boxSizing: 'border-box',
                            borderRadius: 2,
                            opacity: 0.85,
                            overflow: 'hidden',
                            background: `repeating-linear-gradient(
                                to bottom,
                                ${rowFlowLine} 0 5px,
                                transparent 5px 11px
                              )`,
                          }
                          const gx = TL_GRID_GAP_X
                          const gxHalf = gx / 2
                          /** 과거 → 현재가 항상 왼쪽 → 오른쪽 (역전 시 타임라인이 어긋남) */
                          const displayItems = rowItems
                          return (
                            <Fragment key={`cab-tl-t-${rowIdx}`}>
                              <div
                                style={{
                                  position: 'relative',
                                  height: TL_ROW_H,
                                  minHeight: TL_ROW_H,
                                  maxHeight: TL_ROW_H,
                                  padding: 0,
                                }}
                              >
                                {/* 아이템 그리드 — 수평선보다 아래(z-1), 클릭 타깃 */}
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
                                      /** 노드·버블·칩 등 — 무채색(국가 구분색과 분리) */
                                      const uiLine = C.textMuted
                                      const posPillLine =
                                        lineColorForCabinetHeadPositionBadge(
                                          {
                                            positionDefinitionId:
                                              head?.positionDefinition?.id ??
                                              null,
                                            tenureTitle: head?.title,
                                            definitionTitle:
                                              head?.positionDefinition?.title,
                                          },
                                          C.posPillDefault,
                                        )
                                      const territoryLabel =
                                        showCabinetTerritoryLabels
                                          ? getHeadTenureTerritoryLabel(
                                              head ?? {
                                                country: item.country,
                                                historicalCountry:
                                                  item.historicalCountry,
                                              },
                                              country.name,
                                            )
                                          : null
                                      const personName = head?.person
                                        ? getPersonName(head.person)
                                        : item.name?.trim() ||
                                          '집단지도 · 과도정부'
                                      const posTitle = head
                                        ? (head.positionDefinition?.title ??
                                          head.title ??
                                          '—')
                                        : '집단지도 · 위원회'
                                      const termNum = head?.ordinal
                                      const thumbUrl = head?.person
                                        ?.profileImageUrl
                                        ? getUploadImageUrl(
                                            head.person.profileImageUrl,
                                          )
                                        : null
                                      const {
                                        startDate: effStartDate,
                                        endDate: effEndDate,
                                      } = resolveCabinetEffectiveDates(item)
                                      const parsedStartParts = effStartDate
                                        ? parseSignedDateParts(effStartDate)
                                        : null
                                      const startYearLabel = parsedStartParts
                                        ? parsedStartParts.era === 'BC'
                                          ? `BC ${parsedStartParts.absYear}`
                                          : String(parsedStartParts.absYear)
                                        : null
                                      const isBcStartYear =
                                        parsedStartParts?.era === 'BC'
                                      const range = effStartDate
                                        ? `${formatDate(effStartDate)} – ${effEndDate ? formatDate(effEndDate) : '현재'}`
                                        : '—'
                                      const ageAtStart =
                                        head?.person && effStartDate
                                          ? calcAgeAtTenure(
                                              head.person,
                                              effStartDate,
                                            )
                                          : null
                                      const birthPlace =
                                        getPersonBirthPlaceLabel(head?.person)
                                      const isDeleting =
                                        deletingCabinetId === item.id
                                      // 짝수: 썸네일 위·연도는 축 중앙, 홀수: 연도 축 중앙·썸네일 아래
                                      const itemOnTop = colIdx % 2 === 0
                                      const monarchV =
                                        cabinetTimelineMonarchVisuals.byCabinetId.get(
                                          item.id,
                                        ) ?? null
                                      const monarchAxisChipTint = monarchV
                                        ? cabinetTimelineMonarchUiTint(
                                            monarchV.lineHex,
                                            isDark,
                                          )
                                        : null
                                      const cardReignLineOnly =
                                        reignEraLineByCabinetId.get(item.id) ??
                                        null
                                      /** 연도 아래 — 연호만(천황·총리 등 직함 문구 없음) */
                                      const yearAxisEraLine = cardReignLineOnly
                                      const cellLabelAriaOpts: Parameters<
                                        typeof cabinetTimelineCellAriaLabel
                                      >[4] = {
                                        ...(territoryLabel
                                          ? { territoryPrefix: territoryLabel }
                                          : {}),
                                        ...(yearAxisEraLine
                                          ? { reignEraLine: yearAxisEraLine }
                                          : {}),
                                      }
                                      const cellLabel =
                                        cabinetTimelineCellAriaLabel(
                                          termNum,
                                          head?.subTermNumber ?? null,
                                          posTitle,
                                          personName,
                                          Object.keys(cellLabelAriaOpts).length
                                            ? cellLabelAriaOpts
                                            : undefined,
                                        )
                                      const cabinetTimelineTlItemProps = {
                                        thumbUrl,
                                        personName,
                                        cabinetName:
                                          item.name?.trim() || undefined,
                                        posTitle,
                                        range,
                                        ageAtStart,
                                        birthPlace,
                                        lineColor: uiLine,
                                        posPillLineColor: posPillLine,
                                        thumbRingColor: itemP.line,
                                        territoryLabel:
                                          territoryLabel ?? undefined,
                                        reignEraLine:
                                          cardReignLineOnly ?? undefined,
                                        hideMonarchBadge: true as const,
                                        achievementCount: Array.isArray(
                                          head?.achievements,
                                        )
                                          ? head.achievements.length
                                          : 0,
                                        isDark,
                                      }
                                      const cellPadStyle =
                                        colIdx === 0
                                          ? {
                                              padding: `0 ${TL_COL_PAD_X}px 0 ${
                                                TL_COL_PAD_X +
                                                TL_FIRST_COL_EXTRA_SHIFT_X
                                              }px`,
                                            }
                                          : undefined
                                      return (
                                        <div
                                          key={item.id}
                                          style={{
                                            position: 'relative',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            minWidth: 0,
                                          }}
                                          onMouseEnter={(e) => {
                                            const quickBtn =
                                              e.currentTarget.querySelector<HTMLButtonElement>(
                                                '[data-tl-quick-edit]',
                                              )
                                            if (quickBtn) {
                                              quickBtn.style.opacity = '1'
                                            }
                                          }}
                                          onMouseLeave={(e) => {
                                            const quickBtn =
                                              e.currentTarget.querySelector<HTMLButtonElement>(
                                                '[data-tl-quick-edit]',
                                              )
                                            if (
                                              quickBtn &&
                                              document.activeElement !==
                                                quickBtn
                                            ) {
                                              quickBtn.style.opacity = '0'
                                            }
                                          }}
                                        >
                                          <button
                                            type="button"
                                            data-tl-quick-edit=""
                                            aria-label={`${personName} 행정부 빠른 수정`}
                                            title="행정부 빠른 수정"
                                            onClick={(clickEvent) => {
                                              handleOpenEditCabinet(
                                                item,
                                                clickEvent,
                                              )
                                            }}
                                            onFocus={(focusEvent) => {
                                              focusEvent.currentTarget.style.opacity =
                                                '1'
                                            }}
                                            onBlur={(blurEvent) => {
                                              blurEvent.currentTarget.style.opacity =
                                                '0'
                                            }}
                                            style={{
                                              position: 'absolute',
                                              right: 6,
                                              top: itemOnTop ? 6 : undefined,
                                              bottom: itemOnTop ? undefined : 6,
                                              zIndex: 4,
                                              width: 26,
                                              height: 26,
                                              borderRadius: 7,
                                              border: `1px solid ${palette.borderMid}`,
                                              background: palette.inputBg,
                                              color: palette.textMuted,
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              cursor: 'pointer',
                                              opacity: 0,
                                              transition: 'opacity 0.14s ease',
                                            }}
                                          >
                                            <FiEdit2 size={12} />
                                          </button>
                                          <CabS.CabinetTimelineCellBtn
                                            disabled={isDeleting}
                                            aria-label={cellLabel}
                                            style={cellPadStyle}
                                            onKeyDown={(e) => {
                                              if (e.target !== e.currentTarget)
                                                return
                                            }}
                                            onClick={() => {
                                              if (!isDeleting) {
                                                selectCabinetWithUrl(item.id)
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
                                                }}
                                              >
                                                <TlItem
                                                  {...cabinetTimelineTlItemProps}
                                                />
                                              </div>
                                            ) : (
                                              <div
                                                style={{
                                                  flex: 1,
                                                  minHeight: 0,
                                                }}
                                                aria-hidden
                                              />
                                            )}
                                          </div>

                                          {/* 타임라인 축: 수직선 + 중앙 연도(구 포인트 대신) */}
                                          <div
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              justifyContent: 'flex-start',
                                              width: '100%',
                                              flexShrink: 0,
                                              transform: `translateY(${
                                                itemOnTop
                                                  ? TL_YEAR_NUDGE_Y_EVEN_COL
                                                  : TL_YEAR_NUDGE_Y_ODD_COL
                                              }px)`,
                                              position: 'relative',
                                              zIndex: 1,
                                            }}
                                          >
                                            <div
                                              style={{
                                                width: TL_THUMB,
                                                flexShrink: 0,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                position: 'relative',
                                              }}
                                            >
                                              {itemOnTop ? (
                                                <div
                                                  style={{
                                                    height: TL_VERT_SEG_H,
                                                    minHeight: TL_VERT_SEG_H,
                                                    maxHeight: TL_VERT_SEG_H,
                                                    flexShrink: 0,
                                                    width: '100%',
                                                    maxWidth: '100%',
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'stretch',
                                                    overflow: 'hidden',
                                                    boxSizing: 'border-box',
                                                  }}
                                                  aria-hidden
                                                >
                                                  <div
                                                    style={
                                                      thumbConnectorLineStyle
                                                    }
                                                  />
                                                </div>
                                              ) : null}
                                              <div
                                                style={{
                                                  display: 'flex',
                                                  flexDirection: 'column',
                                                  alignItems: 'center',
                                                  width: '100%',
                                                  maxWidth: TL_THUMB,
                                                  boxSizing: 'border-box',
                                                  padding: '12px 6px 14px',
                                                  textAlign: 'center',
                                                  background: 'transparent',
                                                }}
                                              >
                                                <span
                                                  style={{
                                                    fontSize: isBcStartYear
                                                      ? 26
                                                      : 42,
                                                    fontWeight: 800,
                                                    color: C.text,
                                                    letterSpacing: '-0.04em',
                                                    lineHeight: 1,
                                                    fontVariantNumeric:
                                                      'tabular-nums',
                                                    textShadow: isDark
                                                      ? '0 0 10px rgba(0,0,0,0.85), 0 1px 2px rgba(0,0,0,0.9)'
                                                      : '0 0 8px rgba(255,255,255,0.95), 0 1px 0 rgba(255,255,255,1)',
                                                  }}
                                                >
                                                  {startYearLabel ?? '—'}
                                                </span>
                                                {termNum != null && (
                                                  <span
                                                    style={{
                                                      fontSize: 10,
                                                      fontWeight: 600,
                                                      color: C.textMuted,
                                                      marginTop: 8,
                                                      lineHeight: 1.3,
                                                      letterSpacing: '0.02em',
                                                      textShadow: isDark
                                                        ? '0 0 8px rgba(0,0,0,0.8)'
                                                        : '0 0 6px rgba(255,255,255,0.9)',
                                                    }}
                                                  >
                                                    제{termNum}대
                                                    {head?.subTermNumber != null
                                                      ? ` ${head.subTermNumber}기`
                                                      : ''}
                                                  </span>
                                                )}
                                                {yearAxisEraLine ? (
                                                  <span
                                                    style={{
                                                      ...(monarchAxisChipTint
                                                        ? {
                                                            fontSize: 10.5,
                                                            fontWeight: 600,
                                                            color: C.textMuted,
                                                            marginTop: 6,
                                                            lineHeight: 1.35,
                                                            maxWidth:
                                                              TL_THUMB + 12,
                                                            padding: '4px 9px',
                                                            borderRadius: 9999,
                                                            boxSizing:
                                                              'border-box',
                                                            border: `1px solid ${monarchAxisChipTint.border}`,
                                                            background:
                                                              monarchAxisChipTint.background,
                                                            letterSpacing:
                                                              '0.01em',
                                                          }
                                                        : {
                                                            fontSize: 9,
                                                            fontWeight: 500,
                                                            color: C.textFaint,
                                                            marginTop: 6,
                                                            lineHeight: 1.35,
                                                            maxWidth:
                                                              TL_THUMB + 12,
                                                          }),
                                                      textShadow: isDark
                                                        ? '0 0 6px rgba(0,0,0,0.75)'
                                                        : '0 0 5px rgba(255,255,255,0.85)',
                                                    }}
                                                  >
                                                    {yearAxisEraLine}
                                                  </span>
                                                ) : null}
                                              </div>
                                              {!itemOnTop ? (
                                                <div
                                                  style={{
                                                    height: TL_VERT_SEG_H,
                                                    minHeight: TL_VERT_SEG_H,
                                                    maxHeight: TL_VERT_SEG_H,
                                                    flexShrink: 0,
                                                    width: '100%',
                                                    maxWidth: '100%',
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'stretch',
                                                    overflow: 'hidden',
                                                    boxSizing: 'border-box',
                                                  }}
                                                  aria-hidden
                                                >
                                                  <div
                                                    style={
                                                      thumbConnectorLineStyle
                                                    }
                                                  />
                                                </div>
                                              ) : null}
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
                                                }}
                                              >
                                                <TlItem
                                                  {...cabinetTimelineTlItemProps}
                                                />
                                              </div>
                                            ) : (
                                              <div
                                                style={{
                                                  flex: 1,
                                                  minHeight: 0,
                                                }}
                                                aria-hidden
                                              />
                                            )}
                                          </div>
                                          </CabS.CabinetTimelineCellBtn>
                                        </div>
                                      )
                                    },
                                  )}
                                </div>
                                {/* 기본 수평 축 — 회색 스파인(해당 행의 실제 칸 수만큼만 신장) */}
                                {rowItems.length > 0 && (
                                  <div
                                    aria-hidden
                                    style={{
                                      position: 'absolute',
                                      inset: 0,
                                      display: 'grid',
                                      gridTemplateColumns: `repeat(${cols}, 1fr)`,
                                      gap: `0 ${TL_GRID_GAP_X}px`,
                                      alignItems: 'center',
                                      pointerEvents: 'none',
                                      zIndex: 2,
                                    }}
                                  >
                                    <div
                                      style={{
                                        gridColumn: `1 / span ${rowItems.length}`,
                                        height: 3,
                                        background: rowFlowLine,
                                        opacity: 0.45,
                                        borderRadius: 2,
                                      }}
                                    />
                                  </div>
                                )}
                                {/* 군주 재임과 겹치는 칸 — 같은 군주 연속 칸은 띠가 하나로 이어짐 */}
                                <div
                                  aria-hidden
                                  style={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                                    gap: `0 ${TL_GRID_GAP_X}px`,
                                    alignItems: 'center',
                                    pointerEvents: 'none',
                                    zIndex: 3,
                                  }}
                                >
                                  {Array.from({ length: cols }).map(
                                    (_, colIdx) => {
                                      const item = displayItems[colIdx]
                                      const mv =
                                        item != null
                                          ? cabinetTimelineMonarchVisuals.byCabinetId.get(
                                              item.id,
                                            )
                                          : null
                                      const prevItem =
                                        colIdx > 0
                                          ? displayItems[colIdx - 1]
                                          : null
                                      const nextItem =
                                        colIdx < cols - 1
                                          ? displayItems[colIdx + 1]
                                          : null
                                      const prevMv =
                                        prevItem != null
                                          ? cabinetTimelineMonarchVisuals.byCabinetId.get(
                                              prevItem.id,
                                            )
                                          : null
                                      const nextMv =
                                        nextItem != null
                                          ? cabinetTimelineMonarchVisuals.byCabinetId.get(
                                              nextItem.id,
                                            )
                                          : null
                                      const connectPrev = Boolean(
                                        mv &&
                                          prevMv &&
                                          prevMv.monarchId === mv.monarchId,
                                      )
                                      const connectNext = Boolean(
                                        mv &&
                                          nextMv &&
                                          nextMv.monarchId === mv.monarchId,
                                      )
                                      return (
                                        <div
                                          key={`tl-seg-${rowIdx}-${colIdx}`}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            minWidth: 0,
                                            height: '100%',
                                          }}
                                        >
                                          {mv ? (
                                            <div
                                              style={{
                                                ...(cols <= 1
                                                  ? {
                                                      width: '100%',
                                                      marginLeft: 0,
                                                    }
                                                  : colIdx === 0
                                                    ? {
                                                        width: `calc(100% + ${gxHalf}px)`,
                                                        marginLeft: 0,
                                                      }
                                                    : colIdx === cols - 1
                                                      ? {
                                                          width: `calc(100% + ${gxHalf}px)`,
                                                          marginLeft: -gxHalf,
                                                        }
                                                      : {
                                                          width: `calc(100% + ${gx}px)`,
                                                          marginLeft: -gxHalf,
                                                        }),
                                                flexShrink: 0,
                                                height: 4,
                                                borderTopLeftRadius: connectPrev
                                                  ? 0
                                                  : 9999,
                                                borderBottomLeftRadius:
                                                  connectPrev ? 0 : 9999,
                                                borderTopRightRadius:
                                                  connectNext ? 0 : 9999,
                                                borderBottomRightRadius:
                                                  connectNext ? 0 : 9999,
                                                background:
                                                  cabinetTimelineMonarchRailGradient(
                                                    mv.lineHex,
                                                    isDark,
                                                    { connectPrev, connectNext },
                                                  ),
                                                boxShadow: isDark
                                                  ? '0 1px 2px rgba(0,0,0,0.5)'
                                                  : '0 1px 2px rgba(0,0,0,0.08)',
                                              }}
                                            />
                                          ) : null}
                                        </div>
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
                    )}
                  </CabS.CabTimelineSummaryOuter>
                </CabS.CabListBody>
              )}
            </CabS.CabListPanel>
          </motion.div>
        ) : (
          /* ── 상세 뷰: 선택한 행정부 내용 ── */
          <motion.div
            ref={cabinetDetailViewRootRef}
            key="cab-detail-view"
            data-cabinet-print-root=""
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
                  selectedHeadHistoryId={selectedHeadHistoryId}
                  selectedHistoryId={selectedHistoryId}
                  sortedVisibleMinisters={
                    nonHeadMinisters.length > 0
                      ? nonHeadMinisters
                      : selectedCabinetMinisters
                  }
                  setCabinetView={setCabinetView}
                  setSelectedCabinetId={setSelectedCabinetId}
                  setSelectedMinisterId={selectMinisterWithUrl}
                  setSelectedHeadHistoryId={setSelectedHeadHistoryId}
                  setSelectedHistoryId={setSelectedHistoryId}
                  setEditingHistoryContent={setEditingHistoryContent}
                  setEditingHistoryMeta={setEditingHistoryMeta}
                  handleDeleteCabinet={handleDeleteCabinet}
                  onEditMinister={handleEditMinister}
                  onEditCabinet={() => handleOpenEditCabinet(selectedCabinet)}
                  onOpenLinkageModal={() => {
                    setCabinetLinkageEventId(null)
                    setCabinetLinkageEventTitle(null)
                    setCabinetLinkageOpen(true)
                  }}
                  linkedPeerCount={linkedCabinetsInDetail.length}
                  prevCabinet={cabinetContinuityNav.prevCabinet}
                  nextCabinet={cabinetContinuityNav.nextCabinet}
                  cabinetPositionBadge={
                    cabinetContinuityNav.cabinetPositionBadge
                  }
                  siblingCabinets={cabinetContinuityNav.siblingCabinets}
                  onNavigateCabinet={selectCabinetWithUrl}
                  onPrint={() => window.print()}
                  onBackToList={clearCabinetSelectionInUrl}
                  onCompareContemporary={(signedYear) =>
                    navigate(pathKeys.government.list({ year: signedYear }))
                  }
                />
                {selectedMinisterId
                  ? /* ── 각료 상세 뷰 ── */
                    (() => {
                      const minister =
                        nonHeadMinisters.find(
                          (t) => t.id === selectedMinisterId,
                        ) ??
                        selectedCabinetMinisters.find(
                          (t) => t.id === selectedMinisterId,
                        )
                      if (!minister) return null
                      const achievementCount = Array.isArray(
                        minister.achievements,
                      )
                        ? minister.achievements.length
                        : 0
                      const thumbUrl = minister.person?.profileImageUrl
                        ? getUploadImageUrl(minister.person.profileImageUrl)
                        : null
                      const personName = getPersonName(minister.person)
                      const posTitle =
                        minister.positionDefinition?.title ??
                        minister.title ??
                        '—'
                      const matchedDepartment =
                        resolveMinisterDepartment(minister)
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
                          {/* 각료 프로필 — 재임 기록 상세일 때는 숨김 */}
                          {!selectedHistoryId && (
                            <CabS.MinisterProfileBlock id="cab-detail-minister-profile">
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
                                  {deptName !== '—' &&
                                    deptName !== '미연결' && (
                                      <CabS.MinisterDeptTag
                                        onClick={
                                          matchedDepartment?.id &&
                                          onOpenDepartmentDetail
                                            ? () =>
                                                onOpenDepartmentDetail(
                                                  matchedDepartment.id,
                                                )
                                            : undefined
                                        }
                                        style={
                                          matchedDepartment?.id &&
                                          onOpenDepartmentDetail
                                            ? { cursor: 'pointer' }
                                            : undefined
                                        }
                                        title={
                                          matchedDepartment?.id &&
                                          onOpenDepartmentDetail
                                            ? `${deptName} 중앙부처 상세로 이동`
                                            : undefined
                                        }
                                      >
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
                                    <CabS.HeadMetaKicker>
                                      생몰년
                                    </CabS.HeadMetaKicker>
                                    {formatPersonLifespan(minister.person)}
                                  </CabS.MinisterProfileLifespan>
                                )}
                                {(() => {
                                  const birthPlace = getPersonBirthPlaceLabel(
                                    minister.person,
                                  )
                                  return birthPlace ? (
                                    <CabS.MinisterProfileLifespan>
                                      <CabS.HeadMetaKicker>
                                        출신
                                      </CabS.HeadMetaKicker>
                                      {birthPlace}
                                    </CabS.MinisterProfileLifespan>
                                  ) : null
                                })()}
                              </CabS.MinisterProfileMeta>
                              <CabS.MinisterProfileAction>
                                <SubsectionAddBtn
                                  type="button"
                                  onClick={() => handleEditMinister(minister)}
                                  title="각료 직위·부처·재임 기간 등 임명 정보를 수정합니다"
                                >
                                  <FiEdit2 size={13} strokeWidth={2.25} />
                                  임명 수정
                                </SubsectionAddBtn>
                                <SubsectionAddBtn
                                  type="button"
                                  onClick={() =>
                                    void handleDetachMinisterFromCabinet(
                                      minister,
                                    )
                                  }
                                  title="부처·인물의 본래 재임 기록은 남기고 이 내각 연결만 해제합니다"
                                >
                                  <FiX size={13} strokeWidth={2.25} />
                                  내각 제외
                                </SubsectionAddBtn>
                              </CabS.MinisterProfileAction>
                            </CabS.MinisterProfileBlock>
                          )}

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
                              const effectiveHistoryBody =
                                getTenureAchievementDisplayBody(selAch)
                              const hasContent =
                                !!String(effectiveHistoryBody).trim()
                              return (
                                <CabS.HistoryArticleWrap>
                                  {/* 제목/날짜 영역: 100% width, 별도 수정 버튼 */}
                                  <CabS.HistoryArticleMetaSection>
                                    {isLinkagePeerAchievement(
                                      selAch,
                                      minister.id,
                                    ) ? (
                                      <CabS.TenureHistoryLinkagePeerBadge
                                        style={{ marginBottom: 10 }}
                                      >
                                        <FiLink2
                                          size={11}
                                          strokeWidth={2.5}
                                          aria-hidden
                                        />
                                        묶음 연동
                                      </CabS.TenureHistoryLinkagePeerBadge>
                                    ) : null}
                                    {editingHistoryMeta &&
                                    showCabinetHeadTenureHistoryActions ? (
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
                                          <DateRangeField
                                            label="시작일 / 종료일 (선택)"
                                            startValue={historyMetaStartDate}
                                            endValue={historyMetaEndDate}
                                            onStartChange={
                                              setHistoryMetaStartDate
                                            }
                                            onEndChange={setHistoryMetaEndDate}
                                            startPlaceholder="시작일"
                                            endPlaceholder="종료일 (선택)"
                                            openEndAfterStart={false}
                                            startPickerTitle="시작일 선택"
                                            endPickerTitle="종료일 선택"
                                          />
                                        </CabS.HistoryMetaForm>
                                        <CabS.HistoryArticleEditActions
                                          style={{ marginTop: 12 }}
                                        >
                                          {showCabinetHeadTenureHistoryActions && (
                                            <CabS.HistoryArticleToolbarActions>
                                              <CabS.HistoryArticleToolbarDeleteBtn
                                                type="button"
                                                onClick={() =>
                                                  deleteMinisterHistoryDirect(
                                                    tenureIdForAchievement(
                                                      selAch,
                                                      minister.id,
                                                    ),
                                                    selAch.id,
                                                  )
                                                }
                                              >
                                                <FiTrash2 size={13} />
                                                삭제
                                              </CabS.HistoryArticleToolbarDeleteBtn>
                                            </CabS.HistoryArticleToolbarActions>
                                          )}
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
                                                tenureIdForAchievement(
                                                  selAch,
                                                  minister.id,
                                                ),
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
                                            {selAch.event?.title ??
                                              selAch.title}
                                          </CabS.HistoryArticleHeadline>
                                          {showCabinetHeadTenureHistoryActions && (
                                            <CabS.HistoryArticleHeadlineAside>
                                              <CabS.HistoryArticleToolbarActions>
                                                <CabS.HistoryArticleToolbarDeleteBtn
                                                  type="button"
                                                  onClick={() =>
                                                    deleteMinisterHistoryDirect(
                                                      tenureIdForAchievement(
                                                        selAch,
                                                        minister.id,
                                                      ),
                                                      selAch.id,
                                                    )
                                                  }
                                                >
                                                  <FiTrash2 size={13} />
                                                  삭제
                                                </CabS.HistoryArticleToolbarDeleteBtn>
                                              </CabS.HistoryArticleToolbarActions>
                                              <CabS.HistoryMetaEditBtn
                                                type="button"
                                                onClick={() => {
                                                  setHistoryMetaTitle(
                                                    selAch.title ?? '',
                                                  )
                                                  setHistoryMetaStartDate(
                                                    toAchievementDateInput(
                                                      selAch.startDate,
                                                    ),
                                                  )
                                                  setHistoryMetaEndDate(
                                                    toAchievementDateInput(
                                                      selAch.endDate,
                                                    ),
                                                  )
                                                  setEditingHistoryMeta(true)
                                                }}
                                              >
                                                <FiEdit2 size={11} />
                                              </CabS.HistoryMetaEditBtn>
                                            </CabS.HistoryArticleHeadlineAside>
                                          )}
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
                                        {selectedCabinet?.id && (
                                          <LinkedCabinetPeersRow
                                            variant="article"
                                            linkedCabinets={
                                              linkedCabinetsInDetail as CabinetListItemDto[]
                                            }
                                            loading={
                                              loadingLinkedCabinetsInDetail
                                            }
                                          />
                                        )}
                                      </>
                                    )}
                                  </CabS.HistoryArticleMetaSection>

                                  {selAch.eventId ? (
                                    <RelatedAchievementsBySameEventBlock
                                      eventId={selAch.eventId}
                                      currentAchievementId={selAch.id}
                                      textMuted={C.textMuted}
                                      border={C.badgeBorder}
                                      background={C.chipActionBg}
                                    />
                                  ) : null}

                                  <CabS.HistoryArticleDivider />

                                  {/* 본문 영역: max-width 720px 가운데 */}
                                  <CabS.HistoryArticleInner>
                                    <CabS.HistoryArticleContentBar>
                                      {!editingHistoryContent &&
                                        showCabinetHeadTenureHistoryActions && (
                                          <CabS.HistoryArticleEditBtn
                                            type="button"
                                            style={{ marginLeft: 'auto' }}
                                            onClick={() => {
                                              setHistoryDraftContent(
                                                getTenureAchievementDisplayBody(
                                                  selAch,
                                                ),
                                              )
                                              setEditingHistoryContent(true)
                                            }}
                                          >
                                            <FiEdit2 size={13} />
                                            {hasContent ? '수정' : '추가'}
                                          </CabS.HistoryArticleEditBtn>
                                        )}
                                    </CabS.HistoryArticleContentBar>

                                    {selAch.eventId &&
                                      showCabinetHeadTenureHistoryActions && (
                                        <CabS.HistoryArticleBodyHint>
                                          본문 표시: 재임 칸과 사건 정본이 둘 다
                                          있으면 보통은 재임 칸을 쓰고, 이미지가
                                          한쪽에만 있으면 그쪽을 보여 줍니다.
                                          편집·저장은 항상 이 재임 칸 본문만
                                          바뀝니다.
                                        </CabS.HistoryArticleBodyHint>
                                      )}

                                    {editingHistoryContent &&
                                    showCabinetHeadTenureHistoryActions ? (
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
                                                tenureIdForAchievement(
                                                  selAch,
                                                  minister.id,
                                                ),
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
                                          html={String(effectiveHistoryBody)}
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
                            <CabS.HeadTenureInfoSection
                              id="cab-detail-minister-achievements"
                              $omitBottomRule
                            >
                              <CabS.CabDetailMinistersSectionHeader>
                                <FiLayers
                                  size={15}
                                  strokeWidth={2}
                                  aria-hidden
                                  style={{ color: MAIN, flexShrink: 0 }}
                                />
                                <CabS.CabDetailMinistersSectionTitle>
                                  재임 기록
                                </CabS.CabDetailMinistersSectionTitle>
                                <CabS.CabResultCount style={{ marginLeft: 4 }}>
                                  {achievementCount}건
                                </CabS.CabResultCount>
                                <div style={{ flex: 1 }} />
                                {showCabinetHeadTenureHistoryActions && (
                                  <SubsectionAddBtn
                                    type="button"
                                    onClick={(e) =>
                                      openMinisterHistoryModal(minister, e)
                                    }
                                  >
                                    <FiPlus size={14} strokeWidth={2.25} />
                                    기록 추가
                                  </SubsectionAddBtn>
                                )}
                              </CabS.CabDetailMinistersSectionHeader>
                              {achievementCount === 0 ? (
                                <CabS.CabDetailEmptyStack $padding="24px 0 28px">
                                  <CabS.CabDetailPartyEmptyIconWrap aria-hidden>
                                    <FiLayers
                                      size={26}
                                      strokeWidth={1.5}
                                      style={{ color: C.placeholderText }}
                                    />
                                  </CabS.CabDetailPartyEmptyIconWrap>
                                  <CabS.CabDetailEmptyText>
                                    등록된 재임 기록이 없습니다.
                                  </CabS.CabDetailEmptyText>
                                </CabS.CabDetailEmptyStack>
                              ) : (
                                <TenureHistoryHorizTimeline
                                  achievements={minister.achievements ?? []}
                                  contextTenureId={minister.id}
                                  onSelectAchievement={setSelectedHistoryId}
                                  showPeersRow={Boolean(selectedCabinet?.id)}
                                  linkedCabinets={
                                    linkedCabinetsInDetail as CabinetListItemDto[]
                                  }
                                  loadingLinkedCabinets={
                                    loadingLinkedCabinetsInDetail
                                  }
                                />
                              )}
                            </CabS.HeadTenureInfoSection>
                          )}
                        </>
                      )
                    })()
                  : /* ── 행정부 상세 뷰 (수반 정보 + 각료 목록) ── */
                    (() => {
                      const head = selectedCabinet.headTenure
                      const effectiveCabHistoricalCountryId =
                        selectedCabinet.historicalCountryId ??
                        head?.historicalCountryId ??
                        historicalCountryId
                      const effectiveCabCountryId =
                        effectiveCabHistoricalCountryId
                          ? undefined
                          : (selectedCabinet.countryId ??
                            head?.countryId ??
                            countryId)
                      const thumbUrl = head?.person?.profileImageUrl
                        ? getUploadImageUrl(head.person.profileImageUrl)
                        : null
                      const personName = head?.person
                        ? getPersonName(head.person)
                        : selectedCabinet.name?.trim() ||
                          '집단지도 · 과도정부'
                      const posTitle = head
                        ? (head.title ??
                          head.positionDefinition?.title ??
                          '—')
                        : '집단지도체제 · 과도정부'
                      const termNum = head?.ordinal
                      const { startDate: effStart, endDate: effEnd } =
                        resolveCabinetEffectiveDates(selectedCabinet)
                      const startFull = effStart
                        ? formatDate(effStart)
                        : '—'
                      const endFull = effEnd
                        ? formatDate(effEnd)
                        : '현재'
                      const duration = calcTenureDuration(effStart, effEnd)
                      const ageAtStart =
                        head?.person && effStart
                          ? calcAgeAtTenure(head.person, effStart)
                          : null
                      const ageAtEnd =
                        head?.person && effEnd
                          ? calcAgeAtEndTenure(head.person, effEnd)
                          : null
                      const explicitCabName =
                        selectedCabinet.name?.trim() &&
                        selectedCabinet.name.trim() !== personName
                          ? selectedCabinet.name.trim()
                          : null
                      const hasDistinctHeadTenureSpan = Boolean(
                        head?.startDate &&
                          selectedCabinet.startDate &&
                          (getSignedDateChronologyKey(
                            selectedCabinet.startDate,
                          ) !== getSignedDateChronologyKey(head.startDate) ||
                            getSignedDateChronologyKey(
                              selectedCabinet.endDate ?? null,
                            ) !==
                              getSignedDateChronologyKey(
                                head.endDate ?? null,
                              )),
                      )
                      const hasCabinetDescription =
                        cabinetTenureDetailHasContent(
                          selectedCabinet.description,
                        )
                      const termBadge = formatCabinetTermBadge(
                        termNum,
                        head?.subTermNumber ?? null,
                      )
                      const activePolSys = findActivePoliticalSystemForCabinet(
                        politicalSystems,
                        {
                          startDate: effStart ?? null,
                          endDate: effEnd ?? null,
                          historicalCountryId:
                            selectedCabinet.historicalCountryId ??
                            head?.historicalCountryId ??
                            null,
                          allowedHistoricalCountryIds: allowedHistoricalIdsSet,
                        },
                      )
                      const regimeBadgeLabel = activePolSys?.governmentForm
                        ? (GOVERNMENT_FORM_META[activePolSys.governmentForm]
                            ?.label ?? null)
                        : null
                      return (
                        <>
                          {/* 수반 프로필 — 재임 기록 상세일 때는 숨김 */}
                          {!selectedHeadHistoryId && (
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
                                  {regimeBadgeLabel && (
                                    <CabS.HeadProfileDetailChipTerm>
                                      {regimeBadgeLabel}
                                    </CabS.HeadProfileDetailChipTerm>
                                  )}
                                  <CabS.HeadProfileDetailChipPosition>
                                    {posTitle}
                                  </CabS.HeadProfileDetailChipPosition>
                                </CabS.HeadProfileBadgeRow>
                                <CabS.HeadProfileHeadline>
                                  {personName}
                                </CabS.HeadProfileHeadline>
                                {explicitCabName && (
                                  <div
                                    style={{
                                      fontSize: 13,
                                      fontWeight: 600,
                                      color: palette.textMuted,
                                      marginTop: -2,
                                      marginBottom: 2,
                                    }}
                                  >
                                    {explicitCabName}
                                  </div>
                                )}
                                <CabS.HeadTenureRow>
                                  <CabS.HeadTenureDates>
                                    <FiCalendar size={10} />
                                    {startFull} – {endFull}
                                  </CabS.HeadTenureDates>
                                  {duration && (
                                    <CabS.HeadTenureDuration>
                                      {explicitCabName ? '내각 존속' : '재임'}{' '}
                                      {duration}
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
                                {hasDistinctHeadTenureSpan && head?.startDate && (
                                  <div
                                    style={{
                                      fontSize: 11.5,
                                      color: palette.textFaint,
                                      marginTop: 2,
                                    }}
                                  >
                                    수반 전체 재임: {formatDate(head.startDate)} –{' '}
                                    {head.endDate
                                      ? formatDate(head.endDate)
                                      : '현재'}
                                  </div>
                                )}
                                {head?.person &&
                                  (() => {
                                    const lifespanText = formatPersonLifespan(
                                      head.person,
                                    )
                                    const birthPlace = getPersonBirthPlaceLabel(
                                      head.person,
                                    )
                                    if (!lifespanText && !birthPlace) {
                                      return null
                                    }
                                    return (
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          flexWrap: 'wrap',
                                          gap: '6px 14px',
                                          marginTop: 4,
                                        }}
                                      >
                                        {lifespanText ? (
                                          <CabS.HeadLifespan>
                                            <CabS.HeadMetaKicker>
                                              생몰년
                                            </CabS.HeadMetaKicker>
                                            {lifespanText}
                                          </CabS.HeadLifespan>
                                        ) : null}
                                        {birthPlace ? (
                                          <CabS.HeadLifespan>
                                            <CabS.HeadMetaKicker>
                                              출신
                                            </CabS.HeadMetaKicker>
                                            {birthPlace}
                                          </CabS.HeadLifespan>
                                        ) : null}
                                      </div>
                                    )
                                  })()}
                              </CabS.HeadProfileMeta>
                            </CabS.HeadProfileBlock>
                          )}

                          {!selectedHeadHistoryId && (
                            <>
                              {hasCabinetDescription && (
                                <CabS.HeadTenureInfoSection
                                  id="cab-detail-overview"
                                  style={{ scrollMarginTop: 12 }}
                                >
                                  <CabS.CabDetailMinistersSectionHeader>
                                    <FiFileText
                                      size={15}
                                      strokeWidth={2}
                                      aria-hidden
                                      style={{ color: MAIN, flexShrink: 0 }}
                                    />
                                    <CabS.CabDetailMinistersSectionTitle>
                                      내각 개요 · 출범 기조
                                    </CabS.CabDetailMinistersSectionTitle>
                                    <div style={{ flex: 1 }} />
                                    <SubsectionAddBtn
                                      type="button"
                                      onClick={() =>
                                        handleOpenEditCabinet(selectedCabinet)
                                      }
                                    >
                                      <FiEdit2 size={13} strokeWidth={2.25} />
                                      수정
                                    </SubsectionAddBtn>
                                  </CabS.CabDetailMinistersSectionHeader>
                                  {isLikelyRichTextHtml(
                                    selectedCabinet.description,
                                  ) ? (
                                    <CabS.HeadTenureInfoRichColumn
                                      onClick={handleHistoryProseClick}
                                      role="presentation"
                                    >
                                      <CabS.HeadTenureInfoRichProse
                                        html={String(
                                          selectedCabinet.description ?? '',
                                        )}
                                      />
                                    </CabS.HeadTenureInfoRichColumn>
                                  ) : (
                                    <CabS.HeadTenureInfoRichColumn>
                                      <CabS.HeadTenureInfoText>
                                        {selectedCabinet.description}
                                      </CabS.HeadTenureInfoText>
                                    </CabS.HeadTenureInfoRichColumn>
                                  )}
                                </CabS.HeadTenureInfoSection>
                              )}
                              {/* 취임/퇴임 정보 섹션 — 내용이 있거나 편집 중일 때만 카드 노출, 비어 있으면 한 줄 추가 버튼 */}
                              {head &&
                                (() => {
                                  const hasAppointmentContent = Boolean(
                                    head.appointmentMethod ||
                                      cabinetTenureDetailHasContent(head.notes),
                                  )
                                  const isEditingAppointment = Boolean(
                                    editingTenureInfo &&
                                      editingTenureInfo.cabinetId ===
                                        selectedCabinet.id &&
                                      editingTenureInfo.mode === 'appointment',
                                  )
                                  const hasEndContent = Boolean(
                                    head.endReason ||
                                      cabinetTenureDetailHasContent(
                                        head.endReasonDetail,
                                      ),
                                  )
                                  const isEditingEnd = Boolean(
                                    editingTenureInfo &&
                                      editingTenureInfo.cabinetId ===
                                        selectedCabinet.id &&
                                      editingTenureInfo.mode === 'end',
                                  )
                                  const showAppointmentCard =
                                    hasAppointmentContent ||
                                    isEditingAppointment
                                  const showEndCard =
                                    hasEndContent || isEditingEnd
                                  const showQuickAddRow =
                                    !showAppointmentCard || !showEndCard

                                  return (
                                    <CabS.CabDetailScrollSection id="cab-detail-tenure">
                                      {showAppointmentCard ? (
                                        <CabS.HeadTenureInfoSection $accent="mint">
                                          <CabS.CabDetailMinistersSectionHeader>
                                            <span
                                              aria-hidden
                                              style={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                background: '#6ee7b7',
                                                flexShrink: 0,
                                                display: 'inline-block',
                                              }}
                                            />
                                            <CabS.CabDetailMinistersSectionTitle>
                                              취임 정보
                                            </CabS.CabDetailMinistersSectionTitle>
                                            <div style={{ flex: 1 }} />
                                            {isEditingAppointment ? (
                                              <div
                                                style={{
                                                  display: 'flex',
                                                  gap: 6,
                                                }}
                                              >
                                                <CabS.HistoryArticleCancelBtn
                                                  type="button"
                                                  onClick={() =>
                                                    setEditingTenureInfo(null)
                                                  }
                                                >
                                                  취소
                                                </CabS.HistoryArticleCancelBtn>
                                                <CabS.HistoryArticleSaveBtn
                                                  type="button"
                                                  disabled={
                                                    tenureInfoSubmitting
                                                  }
                                                  onClick={() =>
                                                    handleSaveTenureInfoInline(
                                                      selectedCabinet.id,
                                                      head.id,
                                                    )
                                                  }
                                                  $isRegister={false}
                                                >
                                                  {tenureInfoSubmitting
                                                    ? '저장 중…'
                                                    : '저장'}
                                                </CabS.HistoryArticleSaveBtn>
                                              </div>
                                            ) : (
                                              <SubsectionAddBtn
                                                type="button"
                                                onClick={() => {
                                                  setEditingAppointmentMethod(
                                                    head.appointmentMethod ??
                                                      '',
                                                  )
                                                  setEditingNotes(
                                                    head.notes ?? '',
                                                  )
                                                  setEditingTenureInfo({
                                                    cabinetId:
                                                      selectedCabinet.id,
                                                    mode: 'appointment',
                                                  })
                                                }}
                                              >
                                                <FiEdit2
                                                  size={13}
                                                  strokeWidth={2.25}
                                                />
                                                수정
                                              </SubsectionAddBtn>
                                            )}
                                          </CabS.CabDetailMinistersSectionHeader>
                                          {isEditingAppointment ? (
                                            <div
                                              style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 12,
                                              }}
                                            >
                                              <div>
                                                <CabS.HeadTenureInfoLabel>
                                                  임명 방식
                                                </CabS.HeadTenureInfoLabel>
                                                <CabS.CabinetSelectNative
                                                  value={
                                                    editingAppointmentMethod
                                                  }
                                                  onChange={(changeEvent) =>
                                                    setEditingAppointmentMethod(
                                                      changeEvent.target.value,
                                                    )
                                                  }
                                                  style={{ maxWidth: 280 }}
                                                >
                                                  <option value="">
                                                    선택 안 함
                                                  </option>
                                                  {Object.entries(
                                                    APPOINTMENT_METHOD_LABEL,
                                                  ).map(
                                                    ([
                                                      methodKey,
                                                      methodLabel,
                                                    ]) => (
                                                      <option
                                                        key={methodKey}
                                                        value={methodKey}
                                                      >
                                                        {methodLabel}
                                                      </option>
                                                    ),
                                                  )}
                                                </CabS.CabinetSelectNative>
                                              </div>
                                              <div>
                                                <CabS.HeadTenureInfoLabel>
                                                  취임 배경 / 비고
                                                </CabS.HeadTenureInfoLabel>
                                                <CabS.HeadTenureInfoEditorWrap>
                                                  <RichTextEditor
                                                    value={editingNotes}
                                                    onChange={setEditingNotes}
                                                    showTitle={false}
                                                    placeholder="취임 배경, 특이 사항 등"
                                                    onImageUpload={async (
                                                      file,
                                                    ) => {
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
                                                </CabS.HeadTenureInfoEditorWrap>
                                              </div>
                                            </div>
                                          ) : (
                                            <>
                                              {head.appointmentMethod && (
                                                <CabS.HeadTenureInfoBadge
                                                  $type="appointment"
                                                  style={{
                                                    width: 'fit-content',
                                                  }}
                                                >
                                                  <CabS.HeadTenureInfoBadgeLabel>
                                                    임명
                                                  </CabS.HeadTenureInfoBadgeLabel>
                                                  {APPOINTMENT_METHOD_LABEL[
                                                    head.appointmentMethod
                                                  ] ?? head.appointmentMethod}
                                                </CabS.HeadTenureInfoBadge>
                                              )}
                                              {cabinetTenureDetailHasContent(
                                                head.notes,
                                              ) && (
                                                <CabS.HeadTenureInfoRow $block>
                                                  <CabS.HeadTenureInfoLabel>
                                                    취임 배경 / 비고
                                                  </CabS.HeadTenureInfoLabel>
                                                  {isLikelyRichTextHtml(
                                                    head.notes,
                                                  ) ? (
                                                    <CabS.HeadTenureInfoRichColumn
                                                      onClick={
                                                        handleHistoryProseClick
                                                      }
                                                      role="presentation"
                                                    >
                                                      <CabS.HeadTenureInfoRichProse
                                                        html={String(
                                                          head.notes ?? '',
                                                        )}
                                                      />
                                                    </CabS.HeadTenureInfoRichColumn>
                                                  ) : (
                                                    <CabS.HeadTenureInfoRichColumn>
                                                      <CabS.HeadTenureInfoText>
                                                        {head.notes}
                                                      </CabS.HeadTenureInfoText>
                                                    </CabS.HeadTenureInfoRichColumn>
                                                  )}
                                                </CabS.HeadTenureInfoRow>
                                              )}
                                            </>
                                          )}
                                        </CabS.HeadTenureInfoSection>
                                      ) : null}

                                      {showEndCard ? (
                                        <CabS.HeadTenureInfoSection $accent="rose">
                                          <CabS.CabDetailMinistersSectionHeader>
                                            <span
                                              aria-hidden
                                              style={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                background: '#fca5a5',
                                                flexShrink: 0,
                                                display: 'inline-block',
                                              }}
                                            />
                                            <CabS.CabDetailMinistersSectionTitle>
                                              퇴임 정보
                                            </CabS.CabDetailMinistersSectionTitle>
                                            <div style={{ flex: 1 }} />
                                            {isEditingEnd ? (
                                              <div
                                                style={{
                                                  display: 'flex',
                                                  gap: 6,
                                                }}
                                              >
                                                <CabS.HistoryArticleCancelBtn
                                                  type="button"
                                                  onClick={() =>
                                                    setEditingTenureInfo(null)
                                                  }
                                                >
                                                  취소
                                                </CabS.HistoryArticleCancelBtn>
                                                <CabS.HistoryArticleSaveBtn
                                                  type="button"
                                                  disabled={
                                                    tenureInfoSubmitting
                                                  }
                                                  onClick={() =>
                                                    handleSaveTenureInfoInline(
                                                      selectedCabinet.id,
                                                      head.id,
                                                    )
                                                  }
                                                  $isRegister={false}
                                                >
                                                  {tenureInfoSubmitting
                                                    ? '저장 중…'
                                                    : '저장'}
                                                </CabS.HistoryArticleSaveBtn>
                                              </div>
                                            ) : (
                                              <SubsectionAddBtn
                                                type="button"
                                                onClick={() => {
                                                  setEditingEndReason(
                                                    head.endReason ?? '',
                                                  )
                                                  setEditingEndReasonDetail(
                                                    head.endReasonDetail ?? '',
                                                  )
                                                  setEditingTenureInfo({
                                                    cabinetId:
                                                      selectedCabinet.id,
                                                    mode: 'end',
                                                  })
                                                }}
                                              >
                                                <FiEdit2
                                                  size={13}
                                                  strokeWidth={2.25}
                                                />
                                                수정
                                              </SubsectionAddBtn>
                                            )}
                                          </CabS.CabDetailMinistersSectionHeader>
                                          {isEditingEnd ? (
                                            <div
                                              style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 12,
                                              }}
                                            >
                                              <div>
                                                <CabS.HeadTenureInfoLabel>
                                                  퇴임 사유
                                                </CabS.HeadTenureInfoLabel>
                                                <CabS.CabinetSelectNative
                                                  value={editingEndReason}
                                                  onChange={(changeEvent) =>
                                                    setEditingEndReason(
                                                      changeEvent.target.value,
                                                    )
                                                  }
                                                  style={{ maxWidth: 280 }}
                                                >
                                                  <option value="">
                                                    선택 안 함
                                                  </option>
                                                  {Object.entries(
                                                    END_REASON_LABEL,
                                                  ).map(
                                                    ([
                                                      reasonKey,
                                                      reasonLabel,
                                                    ]) => (
                                                      <option
                                                        key={reasonKey}
                                                        value={reasonKey}
                                                      >
                                                        {reasonLabel}
                                                      </option>
                                                    ),
                                                  )}
                                                </CabS.CabinetSelectNative>
                                              </div>
                                              <div>
                                                <CabS.HeadTenureInfoLabel>
                                                  퇴임 상세
                                                </CabS.HeadTenureInfoLabel>
                                                <CabS.HeadTenureInfoEditorWrap>
                                                  <RichTextEditor
                                                    value={
                                                      editingEndReasonDetail
                                                    }
                                                    onChange={
                                                      setEditingEndReasonDetail
                                                    }
                                                    showTitle={false}
                                                    placeholder="퇴임 경위, 상세 내용 등"
                                                    onImageUpload={async (
                                                      file,
                                                    ) => {
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
                                                </CabS.HeadTenureInfoEditorWrap>
                                              </div>
                                            </div>
                                          ) : (
                                            <>
                                              {head.endReason && (
                                                <CabS.HeadTenureInfoBadge
                                                  $type="end"
                                                  style={{
                                                    width: 'fit-content',
                                                  }}
                                                >
                                                  <CabS.HeadTenureInfoBadgeLabel>
                                                    퇴임
                                                  </CabS.HeadTenureInfoBadgeLabel>
                                                  {END_REASON_LABEL[
                                                    head.endReason
                                                  ] ?? head.endReason}
                                                </CabS.HeadTenureInfoBadge>
                                              )}
                                              {cabinetTenureDetailHasContent(
                                                head.endReasonDetail,
                                              ) && (
                                                <CabS.HeadTenureInfoRow $block>
                                                  <CabS.HeadTenureInfoLabel>
                                                    퇴임 상세
                                                  </CabS.HeadTenureInfoLabel>
                                                  {isLikelyRichTextHtml(
                                                    head.endReasonDetail,
                                                  ) ? (
                                                    <CabS.HeadTenureInfoRichColumn
                                                      onClick={
                                                        handleHistoryProseClick
                                                      }
                                                      role="presentation"
                                                    >
                                                      <CabS.HeadTenureInfoRichProse
                                                        html={String(
                                                          head.endReasonDetail ??
                                                            '',
                                                        )}
                                                      />
                                                    </CabS.HeadTenureInfoRichColumn>
                                                  ) : (
                                                    <CabS.HeadTenureInfoRichColumn>
                                                      <CabS.HeadTenureInfoText>
                                                        {head.endReasonDetail}
                                                      </CabS.HeadTenureInfoText>
                                                    </CabS.HeadTenureInfoRichColumn>
                                                  )}
                                                </CabS.HeadTenureInfoRow>
                                              )}
                                            </>
                                          )}
                                        </CabS.HeadTenureInfoSection>
                                      ) : null}

                                      {showQuickAddRow ? (
                                        <div
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            flexWrap: 'wrap',
                                            gap: 8,
                                          }}
                                        >
                                          {!showAppointmentCard ? (
                                            <SubsectionAddBtn
                                              type="button"
                                              onClick={() => {
                                                setEditingAppointmentMethod(
                                                  head.appointmentMethod ?? '',
                                                )
                                                setEditingNotes(
                                                  head.notes ?? '',
                                                )
                                                setEditingTenureInfo({
                                                  cabinetId: selectedCabinet.id,
                                                  mode: 'appointment',
                                                })
                                              }}
                                            >
                                              <FiPlus
                                                size={13}
                                                strokeWidth={2.25}
                                              />
                                              취임 경위 추가
                                            </SubsectionAddBtn>
                                          ) : null}
                                          {!showEndCard ? (
                                            <SubsectionAddBtn
                                              type="button"
                                              onClick={() => {
                                                setEditingEndReason(
                                                  head.endReason ?? '',
                                                )
                                                setEditingEndReasonDetail(
                                                  head.endReasonDetail ?? '',
                                                )
                                                setEditingTenureInfo({
                                                  cabinetId: selectedCabinet.id,
                                                  mode: 'end',
                                                })
                                              }}
                                            >
                                              <FiPlus
                                                size={13}
                                                strokeWidth={2.25}
                                              />
                                              퇴임 경위 추가
                                            </SubsectionAddBtn>
                                          ) : null}
                                        </div>
                                      ) : null}
                                    </CabS.CabDetailScrollSection>
                                  )
                                })()}

                              {selectedCabinet?.id && (
                                <div
                                  id="cab-detail-parties"
                                  style={{ scrollMarginTop: 12 }}
                                >
                                  <CabinetPoliticalPartiesBlock
                                    cabinetId={selectedCabinet.id}
                                    countryId={
                                      selectedCabinet.countryId ??
                                      head?.countryId ??
                                      countryId
                                    }
                                    historicalCountryId={
                                      effectiveCabHistoricalCountryId
                                    }
                                    headTenureParty={head?.party ?? null}
                                    isDark={isDark}
                                  />
                                </div>
                              )}

                              {/* 소속 각료 목록 */}
                              <CabS.CabDetailMinistersSection
                                id="cab-detail-ministers"
                                style={{ scrollMarginTop: 12 }}
                              >
                                <CabS.CabDetailMinistersSectionHeader>
                                  <FiUsers
                                    size={15}
                                    strokeWidth={2}
                                    aria-hidden
                                    style={{ color: MAIN, flexShrink: 0 }}
                                  />
                                  <CabS.CabDetailMinistersSectionTitle>
                                    소속 각료
                                  </CabS.CabDetailMinistersSectionTitle>
                                  <CabS.CabResultCount
                                    style={{ marginLeft: 4 }}
                                  >
                                    {loadingCabinetMinisters
                                      ? '…'
                                      : ministerSearchQuery.trim()
                                        ? `${sortedVisibleMinisters.length}/${nonHeadMinisters.length}명`
                                        : `${nonHeadMinisters.length}명`}
                                  </CabS.CabResultCount>
                                  <div style={{ flex: 1 }} />
                                  {/* 검색창 — 전체 각료 6명 이상이거나 검색어가 있을 때 유지 */}
                                  {(nonHeadMinisters.length > 5 ||
                                    Boolean(ministerSearchQuery.trim())) && (
                                    <CabS.CabSearchWrap
                                      style={{
                                        maxWidth: 180,
                                        margin: '0 6px 0 0',
                                      }}
                                    >
                                      <CabS.CabSearchIcon>
                                        <FiSearch size={14} />
                                      </CabS.CabSearchIcon>
                                      <CabS.CabSearchInput
                                        type="text"
                                        placeholder="각료명, 직위..."
                                        value={ministerSearchQuery}
                                        onChange={(changeEvent) =>
                                          setMinisterSearchQuery(
                                            changeEvent.target.value,
                                          )
                                        }
                                        style={{ height: 30, fontSize: 12 }}
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
                                  <GovMorePopover
                                    triggerSize="sm"
                                    ariaLabel="각료 목록 보기 설정"
                                    title="각료 표시 방식 전환"
                                    hasActiveIndicator={
                                      ministerViewMode !== 'cards'
                                    }
                                    segments={[
                                      {
                                        key: 'minister-view',
                                        label: '각료 표시 방식',
                                        value: ministerViewMode,
                                        options: [
                                          {
                                            value: 'cards',
                                            label: '각료 카드',
                                            icon: <FiGrid size={12} />,
                                          },
                                          {
                                            value: 'matrix',
                                            label:
                                              ministriesForCabinet.length > 0
                                                ? `부처 편제 (${ministriesForCabinet.length})`
                                                : '부처 편제',
                                            icon: <FiLayers size={12} />,
                                          },
                                        ],
                                        onChange: (nextVal) =>
                                          setMinisterViewMode(
                                            nextVal as 'cards' | 'matrix',
                                          ),
                                      },
                                    ]}
                                    actions={[
                                      {
                                        key: 'bulk-appoint-ministers',
                                        label: '부처별 일괄 각료 임명',
                                        icon: <FiUsers size={13.5} />,
                                        badge:
                                          ministriesForCabinet.length > 0
                                            ? `${ministriesForCabinet.length}개 부처`
                                            : undefined,
                                        onClick: () =>
                                          setBulkMinisterModalOpen(true),
                                      },
                                    ]}
                                  />
                                  {!loadingCabinetMinisters && (
                                    <SubsectionAddBtn
                                      type="button"
                                      onClick={() =>
                                        handleAddMinister(selectedCabinet)
                                      }
                                    >
                                      <FiPlus size={14} strokeWidth={2.25} />
                                      각료 · 장관 임명
                                    </SubsectionAddBtn>
                                  )}
                                </CabS.CabDetailMinistersSectionHeader>

                                {suggestedCabinetMembers.length > 0 && (
                                  <div
                                    style={{
                                      marginBottom: 14,
                                      padding: '12px 14px',
                                      borderRadius: 10,
                                      border: `1px solid ${palette.badgeBorder}`,
                                      background: palette.chipActionBg,
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 10,
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 10,
                                        flexWrap: 'wrap',
                                      }}
                                    >
                                      <div
                                        style={{
                                          fontSize: 12.5,
                                          fontWeight: 600,
                                          color: palette.text,
                                        }}
                                      >
                                        이 내각 임기와 겹치는 중앙부처 장·차관{' '}
                                        <strong>
                                          {suggestedCabinetMembers.length}명
                                        </strong>
                                        이 감지되었습니다
                                      </div>
                                      <SubsectionAddBtn
                                        type="button"
                                        disabled={
                                          attachingSuggestions ||
                                          selectedSuggestionIds.length === 0
                                        }
                                        onClick={() =>
                                          void handleAttachSuggestedMinisters()
                                        }
                                      >
                                        <FiCheck size={13} strokeWidth={2.5} />
                                        {attachingSuggestions
                                          ? '편입 중…'
                                          : `선택한 ${selectedSuggestionIds.length}명 내각 일괄 편입`}
                                      </SubsectionAddBtn>
                                    </div>
                                    <div
                                      style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: 6,
                                      }}
                                    >
                                      {suggestedCabinetMembers.map(
                                        (suggestedItem) => {
                                          const checked =
                                            selectedSuggestionIds.includes(
                                              suggestedItem.tenureId,
                                            )
                                          const personLabel =
                                            getPersonName(suggestedItem.person)
                                          const deptLabel =
                                            suggestedItem
                                              .administrationDepartment?.name ??
                                            ''
                                          const roleLabel =
                                            suggestedItem.title ??
                                            suggestedItem.positionDefinition
                                              ?.title ??
                                            '장관'
                                          const candidatePeriod =
                                            suggestedItem.startDate
                                              ? `${formatDate(suggestedItem.startDate)}~${suggestedItem.endDate ? formatDate(suggestedItem.endDate) : '현재'}`
                                              : null
                                          return (
                                            <button
                                              key={suggestedItem.tenureId}
                                              type="button"
                                              onClick={() =>
                                                setSelectedSuggestionIds(
                                                  (prev) =>
                                                    prev.includes(
                                                      suggestedItem.tenureId,
                                                    )
                                                      ? prev.filter(
                                                          (id) =>
                                                            id !==
                                                            suggestedItem.tenureId,
                                                        )
                                                      : [
                                                          ...prev,
                                                          suggestedItem.tenureId,
                                                        ],
                                                )
                                              }
                                              style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 5,
                                                padding: '4px 10px',
                                                borderRadius: 9999,
                                                border: `1px solid ${checked ? MAIN : palette.badgeBorder}`,
                                                background: checked
                                                  ? `${MAIN}18`
                                                  : 'transparent',
                                                color: palette.text,
                                                fontSize: 11.5,
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                              }}
                                            >
                                              <span>{checked ? '✓' : '○'}</span>
                                              <span>{personLabel}</span>
                                              <span
                                                style={{
                                                  color: palette.textMuted,
                                                  fontWeight: 500,
                                                }}
                                              >
                                                ·{' '}
                                                {deptLabel
                                                  ? `${deptLabel} ${roleLabel}`
                                                  : roleLabel}
                                              </span>
                                              {candidatePeriod && (
                                                <span
                                                  style={{
                                                    color: palette.textFaint,
                                                    fontSize: 10.5,
                                                    fontWeight: 400,
                                                  }}
                                                >
                                                  ({candidatePeriod})
                                                </span>
                                              )}
                                            </button>
                                          )
                                        },
                                      )}
                                    </div>
                                  </div>
                                )}

                                {loadingCabinetMinisters ? (
                                  <CabS.CabMinistersLoadingBox
                                    aria-busy="true"
                                    aria-live="polite"
                                  >
                                    각료 불러오는 중…
                                  </CabS.CabMinistersLoadingBox>
                                ) : ministerViewMode === 'matrix' ? (
                                  <CabinetPortfolioMatrix
                                    departments={ministriesForCabinet}
                                    ministers={
                                      ministerSearchQuery.trim()
                                        ? sortedVisibleMinisters
                                        : nonHeadMinisters
                                    }
                                    selectedMinisterId={selectedMinisterId}
                                    isDark={isDark}
                                    onSelectMinister={(tenureId) => {
                                      setSelectedHeadHistoryId(null)
                                      selectMinisterWithUrl(tenureId)
                                    }}
                                    onEditMinister={handleEditMinister}
                                    onAppointForDepartment={(deptTarget) =>
                                      handleAddMinister(
                                        selectedCabinet,
                                        deptTarget?.id ?? null,
                                      )
                                    }
                                    onOpenDepartmentDetail={
                                      onOpenDepartmentDetail
                                    }
                                    onOpenMinistriesTab={
                                      onOpenMinistriesTab
                                        ? () => onOpenMinistriesTab()
                                        : undefined
                                    }
                                  />
                                ) : sortedVisibleMinisters.length === 0 ? (
                                  ministerSearchQuery.trim() ? (
                                    <CabS.CabDetailEmptyStack $padding="24px 0 28px">
                                      <CabS.CabDetailPartyEmptyIconWrap
                                        aria-hidden
                                      >
                                        <FiSearch
                                          size={26}
                                          strokeWidth={1.5}
                                          style={{
                                            color: palette.placeholderText,
                                          }}
                                        />
                                      </CabS.CabDetailPartyEmptyIconWrap>
                                      <CabS.CabDetailEmptyText>
                                        검색 결과가 없습니다.
                                      </CabS.CabDetailEmptyText>
                                      <SubsectionAddBtn
                                        type="button"
                                        onClick={() =>
                                          setMinisterSearchQuery('')
                                        }
                                        style={{ marginTop: 8 }}
                                      >
                                        <FiX size={13} />
                                        검색어 초기화
                                      </SubsectionAddBtn>
                                    </CabS.CabDetailEmptyStack>
                                  ) : (
                                    <CabS.CabDetailEmptyStack $padding="24px 0 28px">
                                      <CabS.CabDetailPartyEmptyIconWrap
                                        aria-hidden
                                      >
                                        <FiUsers
                                          size={26}
                                          strokeWidth={1.5}
                                          style={{
                                            color: palette.placeholderText,
                                          }}
                                        />
                                      </CabS.CabDetailPartyEmptyIconWrap>
                                      <CabS.CabDetailEmptyText>
                                        등록된 각료가 없습니다.
                                      </CabS.CabDetailEmptyText>
                                      {ministriesForCabinet.length > 0 && (
                                        <div
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexWrap: 'wrap',
                                            gap: 8,
                                            marginTop: 8,
                                          }}
                                        >
                                          <SubsectionAddBtn
                                            type="button"
                                            onClick={() =>
                                              setBulkMinisterModalOpen(true)
                                            }
                                          >
                                            <FiUsers size={13} />
                                            부처별 일괄 임명 (
                                            {ministriesForCabinet.length}개 부처)
                                          </SubsectionAddBtn>
                                          <SubsectionAddBtn
                                            type="button"
                                            onClick={() =>
                                              setMinisterViewMode('matrix')
                                            }
                                          >
                                            <FiLayers size={13} />
                                            편제표 보기
                                          </SubsectionAddBtn>
                                        </div>
                                      )}
                                    </CabS.CabDetailEmptyStack>
                                  )
                                ) : (
                                  <CabinetMinisterCards
                                    selectedMinisterId={selectedMinisterId}
                                    ministers={sortedVisibleMinisters}
                                    onSelectMinister={(tenureId) => {
                                      setSelectedHeadHistoryId(null)
                                      selectMinisterWithUrl(tenureId)
                                    }}
                                    onMentionPerson={setMentionPersonId}
                                    onEditMinister={handleEditMinister}
                                    onOpenDepartmentDetail={
                                      onOpenDepartmentDetail
                                    }
                                    resolveDepartment={resolveMinisterDepartment}
                                  />
                                )}
                              </CabS.CabDetailMinistersSection>
                            </>
                          )}

                          {/* 수반 재임 기록 — 수반이 있는 내각에서만 표시 */}
                          {head && (
                          <CabS.HeadTenureInfoSection
                            id="cab-detail-achievements"
                            style={{ scrollMarginTop: 12 }}
                            $omitBottomRule={!!selectedHeadHistoryId}
                          >
                            {selectedHeadHistoryId ? (
                              (() => {
                                const selAch = Array.isArray(head.achievements)
                                  ? head.achievements.find(
                                      (achItem: { id: string }) =>
                                        achItem.id === selectedHeadHistoryId,
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
                                const effectiveHistoryBody =
                                  getTenureAchievementDisplayBody(selAch)
                                const hasContent =
                                  !!String(effectiveHistoryBody).trim()
                                return (
                                  <CabS.HistoryArticleWrap>
                                    {/* 제목/날짜 영역: 100% width, 별도 수정 버튼 */}
                                    <CabS.HistoryArticleMetaSection>
                                      {isLinkagePeerAchievement(
                                        selAch,
                                        head.id,
                                      ) ? (
                                        <CabS.TenureHistoryLinkagePeerBadge
                                          style={{ marginBottom: 10 }}
                                        >
                                          <FiLink2
                                            size={11}
                                            strokeWidth={2.5}
                                            aria-hidden
                                          />
                                          묶음 연동
                                        </CabS.TenureHistoryLinkagePeerBadge>
                                      ) : null}
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
                                            <DateRangeField
                                              label="시작일 / 종료일 (선택)"
                                              startValue={historyMetaStartDate}
                                              endValue={historyMetaEndDate}
                                              onStartChange={
                                                setHistoryMetaStartDate
                                              }
                                              onEndChange={
                                                setHistoryMetaEndDate
                                              }
                                              startPlaceholder="시작일"
                                              endPlaceholder="종료일 (선택)"
                                              openEndAfterStart={false}
                                              startPickerTitle="시작일 선택"
                                              endPickerTitle="종료일 선택"
                                            />
                                          </CabS.HistoryMetaForm>
                                          <CabS.HistoryArticleEditActions
                                            style={{ marginTop: 12 }}
                                          >
                                            {showCabinetHeadTenureHistoryActions && (
                                              <CabS.HistoryArticleToolbarActions>
                                                {selectedCabinet?.id ? (
                                                  <CabS.HistoryArticleToolbarSecondaryBtn
                                                    type="button"
                                                    onClick={() => {
                                                      setCabinetLinkageEventId(
                                                        selAch.eventId ?? null,
                                                      )
                                                      setCabinetLinkageEventTitle(
                                                        selAch.event?.title?.trim() ||
                                                          selAch.title?.trim() ||
                                                          null,
                                                      )
                                                      setCabinetLinkageOpen(
                                                        true,
                                                      )
                                                    }}
                                                    title="다른 나라 행정부와 묶기"
                                                  >
                                                    <FiLink2
                                                      size={14}
                                                      strokeWidth={2}
                                                      aria-hidden
                                                    />
                                                    다국 행정부 묶기
                                                  </CabS.HistoryArticleToolbarSecondaryBtn>
                                                ) : null}
                                                <CabS.HistoryArticleToolbarDeleteBtn
                                                  type="button"
                                                  onClick={() =>
                                                    deleteMinisterHistoryDirect(
                                                      tenureIdForAchievement(
                                                        selAch,
                                                        head.id,
                                                      ),
                                                      selAch.id,
                                                    )
                                                  }
                                                >
                                                  <FiTrash2 size={13} />
                                                  삭제
                                                </CabS.HistoryArticleToolbarDeleteBtn>
                                              </CabS.HistoryArticleToolbarActions>
                                            )}
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
                                                  tenureIdForAchievement(
                                                    selAch,
                                                    head.id,
                                                  ),
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
                                              {selAch.event?.title ??
                                                selAch.title}
                                            </CabS.HistoryArticleHeadline>
                                            {showCabinetHeadTenureHistoryActions && (
                                              <CabS.HistoryArticleHeadlineAside>
                                                <CabS.HistoryArticleToolbarActions>
                                                  {selectedCabinet?.id ? (
                                                    <CabS.HistoryArticleToolbarSecondaryBtn
                                                      type="button"
                                                      onClick={() => {
                                                        setCabinetLinkageEventId(
                                                          selAch.eventId ??
                                                            null,
                                                        )
                                                        setCabinetLinkageEventTitle(
                                                          selAch.event?.title?.trim() ||
                                                            selAch.title?.trim() ||
                                                            null,
                                                        )
                                                        setCabinetLinkageOpen(
                                                          true,
                                                        )
                                                      }}
                                                      title="다른 나라 행정부와 묶기"
                                                    >
                                                      <FiLink2
                                                        size={14}
                                                        strokeWidth={2}
                                                        aria-hidden
                                                      />
                                                      다국 행정부 묶기
                                                    </CabS.HistoryArticleToolbarSecondaryBtn>
                                                  ) : null}
                                                  <CabS.HistoryArticleToolbarDeleteBtn
                                                    type="button"
                                                    onClick={() =>
                                                      deleteMinisterHistoryDirect(
                                                        tenureIdForAchievement(
                                                          selAch,
                                                          head.id,
                                                        ),
                                                        selAch.id,
                                                      )
                                                    }
                                                  >
                                                    <FiTrash2 size={13} />
                                                    삭제
                                                  </CabS.HistoryArticleToolbarDeleteBtn>
                                                </CabS.HistoryArticleToolbarActions>
                                                <CabS.HistoryMetaEditBtn
                                                  type="button"
                                                  onClick={() => {
                                                    setHistoryMetaTitle(
                                                      selAch.title ?? '',
                                                    )
                                                    setHistoryMetaStartDate(
                                                      toAchievementDateInput(
                                                        selAch.startDate,
                                                      ),
                                                    )
                                                    setHistoryMetaEndDate(
                                                      toAchievementDateInput(
                                                        selAch.endDate,
                                                      ),
                                                    )
                                                    setEditingHistoryMeta(true)
                                                  }}
                                                >
                                                  <FiEdit2 size={11} />
                                                </CabS.HistoryMetaEditBtn>
                                              </CabS.HistoryArticleHeadlineAside>
                                            )}
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
                                          {selectedCabinet?.id && (
                                            <LinkedCabinetPeersRow
                                              variant="article"
                                              linkedCabinets={
                                                linkedCabinetsInDetail as CabinetListItemDto[]
                                              }
                                              loading={
                                                loadingLinkedCabinetsInDetail
                                              }
                                            />
                                          )}
                                        </>
                                      )}
                                    </CabS.HistoryArticleMetaSection>

                                    {selAch.eventId ? (
                                      <RelatedAchievementsBySameEventBlock
                                        eventId={selAch.eventId}
                                        currentAchievementId={selAch.id}
                                        textMuted={palette.textMuted}
                                        border={palette.badgeBorder}
                                        background={palette.chipActionBg}
                                      />
                                    ) : null}

                                    <CabS.HistoryArticleDivider />

                                    {/* 본문 영역: max-width 720px 가운데 */}
                                    <CabS.HistoryArticleInner>
                                      <CabS.HistoryArticleContentBar>
                                        {!editingHistoryContent && (
                                          <CabS.HistoryArticleEditBtn
                                            type="button"
                                            style={{ marginLeft: 'auto' }}
                                            onClick={() => {
                                              setHistoryDraftContent(
                                                getTenureAchievementDisplayBody(
                                                  selAch,
                                                ),
                                              )
                                              setEditingHistoryContent(true)
                                            }}
                                          >
                                            <FiEdit2 size={13} />
                                            {hasContent ? '수정' : '추가'}
                                          </CabS.HistoryArticleEditBtn>
                                        )}
                                      </CabS.HistoryArticleContentBar>

                                      {selAch.eventId && (
                                        <CabS.HistoryArticleBodyHint>
                                          본문 표시: 재임 칸과 사건 정본이 둘 다
                                          있으면 보통은 재임 칸을 쓰고, 이미지가
                                          한쪽에만 있으면 그쪽을 보여 줍니다.
                                          편집·저장은 항상 이 재임 칸 본문만
                                          바뀝니다.
                                        </CabS.HistoryArticleBodyHint>
                                      )}

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
                                                  tenureIdForAchievement(
                                                    selAch,
                                                    head.id,
                                                  ),
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
                                            html={String(effectiveHistoryBody)}
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
                                <CabS.CabDetailMinistersSectionHeader>
                                  <FiLayers
                                    size={15}
                                    strokeWidth={2}
                                    aria-hidden
                                    style={{ color: MAIN, flexShrink: 0 }}
                                  />
                                  <CabS.CabDetailMinistersSectionTitle>
                                    재임 기록
                                  </CabS.CabDetailMinistersSectionTitle>
                                  <CabS.CabResultCount style={{ marginLeft: 4 }}>
                                    {Array.isArray(head?.achievements)
                                      ? `${head.achievements.length}건`
                                      : '0건'}
                                  </CabS.CabResultCount>
                                  <div style={{ flex: 1 }} />
                                  <SubsectionAddBtn
                                    type="button"
                                    onClick={() =>
                                      openMinisterHistoryModal(head)
                                    }
                                  >
                                    <FiPlus size={14} strokeWidth={2.25} />
                                    기록 추가
                                  </SubsectionAddBtn>
                                </CabS.CabDetailMinistersSectionHeader>
                                {Array.isArray(head?.achievements) &&
                                head.achievements.length > 0 ? (
                                  <TenureHistoryHorizTimeline
                                    achievements={head.achievements}
                                    contextTenureId={head.id}
                                    onSelectAchievement={
                                      setSelectedHeadHistoryId
                                    }
                                    showPeersRow={Boolean(selectedCabinet?.id)}
                                    linkedCabinets={
                                      linkedCabinetsInDetail as CabinetListItemDto[]
                                    }
                                    loadingLinkedCabinets={
                                      loadingLinkedCabinetsInDetail
                                    }
                                  />
                                ) : (
                                  <CabS.CabDetailEmptyStack $padding="24px 0 28px">
                                    <CabS.CabDetailPartyEmptyIconWrap
                                      aria-hidden
                                    >
                                      <FiLayers
                                        size={26}
                                        strokeWidth={1.5}
                                        style={{
                                          color: palette.placeholderText,
                                        }}
                                      />
                                    </CabS.CabDetailPartyEmptyIconWrap>
                                    <CabS.CabDetailEmptyText>
                                      등록된 재임 기록이 없습니다.
                                    </CabS.CabDetailEmptyText>
                                  </CabS.CabDetailEmptyStack>
                                )}
                              </>
                            )}
                          </CabS.HeadTenureInfoSection>
                          )}

                          {!selectedHeadHistoryId && (
                            <>
                              {/* 관련 사건 섹션 (CabinetEvent N:M) */}
                              {selectedCabinetId && (
                                <div
                                  id="cab-detail-events"
                                  style={{ scrollMarginTop: 12 }}
                                >
                                  <CabinetEventsSection
                                    cabinetId={selectedCabinetId}
                                    countryId={effectiveCabCountryId}
                                    historicalCountryId={
                                      effectiveCabHistoricalCountryId
                                    }
                                  />
                                </div>
                              )}

                              {/* 조약 섹션 */}
                              <CabS.CabDetailSubSection
                                id="cab-detail-treaties"
                                style={{ scrollMarginTop: 12 }}
                              >
                                <CabS.CabDetailMinistersSectionHeader>
                                  <FiFileText
                                    size={15}
                                    strokeWidth={2}
                                    aria-hidden
                                    style={{ color: MAIN, flexShrink: 0 }}
                                  />
                                  <CabS.CabDetailMinistersSectionTitle>
                                    체결 조약
                                  </CabS.CabDetailMinistersSectionTitle>
                                  <CabS.CabResultCount
                                    style={{ marginLeft: 4 }}
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
                                  <CabS.CabMinistersLoadingBox
                                    aria-busy="true"
                                    aria-live="polite"
                                  >
                                    조약 불러오는 중…
                                  </CabS.CabMinistersLoadingBox>
                                ) : cabinetTreaties.length === 0 ? (
                                  <CabS.CabDetailEmptyStack $padding="24px 0 28px">
                                    <CabS.CabDetailPartyEmptyIconWrap
                                      aria-hidden
                                    >
                                      <FiFileText
                                        size={26}
                                        strokeWidth={1.5}
                                        style={{ color: C.placeholderText }}
                                      />
                                    </CabS.CabDetailPartyEmptyIconWrap>
                                    <CabS.CabDetailEmptyText>
                                      연결된 조약이 없습니다.
                                    </CabS.CabDetailEmptyText>
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
                                              {formatSignedYearLabel(
                                                treaty.signDate,
                                              ) ?? '—'}
                                            </CabS.CabDetailTreatyYearCell>
                                            <CabS.CabDetailTreatyChevronWrap
                                              $expanded={isExpanded}
                                            >
                                              <FiChevronDown size={14} />
                                            </CabS.CabDetailTreatyChevronWrap>
                                          </CabS.CabDetailTreatyCardBtn>

                                          {isExpanded && (
                                            <CabS.CabDetailTreatyExpandedPanel>
                                              <div
                                                style={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent:
                                                    'space-between',
                                                  gap: 8,
                                                  flexWrap: 'wrap',
                                                  marginBottom: 8,
                                                }}
                                              >
                                                <CabS.CabDetailTreatySectionTitle
                                                  style={{ marginBottom: 0 }}
                                                >
                                                  이 행정부 연결
                                                </CabS.CabDetailTreatySectionTitle>
                                                <div
                                                  style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                  }}
                                                >
                                                  <Link
                                                    to={pathKeys.treaties.detail(
                                                      treaty.id,
                                                    )}
                                                    style={{
                                                      display: 'inline-flex',
                                                      alignItems: 'center',
                                                      gap: 4,
                                                      padding: '4px 9px',
                                                      borderRadius: 7,
                                                      border: `1px solid ${palette.badgeBorder}`,
                                                      background:
                                                        palette.chipActionBg,
                                                      color: palette.text,
                                                      fontSize: 11.5,
                                                      fontWeight: 600,
                                                      textDecoration: 'none',
                                                    }}
                                                  >
                                                    <span>조약 상세 보기</span>
                                                    <FiArrowUpRight size={12} />
                                                  </Link>
                                                  {signatory && (
                                                    <SubsectionAddBtn
                                                      type="button"
                                                      onClick={() =>
                                                        void handleUnlinkTreatyFromCabinet(
                                                          treaty,
                                                          signatory.id,
                                                        )
                                                      }
                                                      title="조약 본체나 서명국은 삭제하지 않고 이 내각과의 연결만 해제합니다"
                                                    >
                                                      <FiX
                                                        size={13}
                                                        strokeWidth={2.25}
                                                      />
                                                      이 내각에서 연결 해제
                                                    </SubsectionAddBtn>
                                                  )}
                                                </div>
                                              </div>
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
                                                  「서명·참여」에서 전체
                                                  서명국을 확인하세요.
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
                                                      조항 (
                                                      {treaty.terms.length})
                                                    </CabS.CabDetailTreatySectionTitle>
                                                    <CabS.CabDetailTreatyTermList>
                                                      {treaty.terms
                                                        .slice(0, 4)
                                                        .map((term) => (
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
                                                        ))}
                                                    </CabS.CabDetailTreatyTermList>
                                                    {treaty.terms.length > 4 && (
                                                      <details
                                                        style={{ marginTop: 8 }}
                                                      >
                                                        <summary
                                                          style={{
                                                            cursor: 'pointer',
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            color:
                                                              palette.textMuted,
                                                            userSelect: 'none',
                                                          }}
                                                        >
                                                          나머지{' '}
                                                          {treaty.terms.length -
                                                            4}
                                                          개 조항 펼치기
                                                        </summary>
                                                        <CabS.CabDetailTreatyTermList
                                                          style={{
                                                            marginTop: 8,
                                                          }}
                                                        >
                                                          {treaty.terms
                                                            .slice(4)
                                                            .map((term) => (
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
                                                            ))}
                                                        </CabS.CabDetailTreatyTermList>
                                                      </details>
                                                    )}
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
                                                                    s
                                                                      .participationType
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
                                                              {s
                                                                .positionDefinition
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
                                                                  비고: {s.note}
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
                  히스토리 등록
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
                  <DateRangeField
                    label="시작일 / 종료일 (선택)"
                    startValue={historyStartDate}
                    endValue={historyEndDate}
                    onStartChange={setHistoryStartDate}
                    onEndChange={setHistoryEndDate}
                    startPlaceholder="시작일"
                    endPlaceholder="종료일 (선택)"
                    openEndAfterStart={false}
                    startPickerTitle="시작일 선택"
                    endPickerTitle="종료일 선택"
                  />
                </FormRows>
                <CabS.MinisterHistoryActions>
                  <SubmitButton
                    type="button"
                    onClick={submitMinisterHistory}
                    disabled={historySubmitting || !historyTitle.trim()}
                  >
                    {historySubmitting ? '등록 중…' : '등록'}
                  </SubmitButton>
                </CabS.MinisterHistoryActions>
              </CabS.MinisterHistorySection>
            </CabS.MinisterHistoryModalBody>
          </CabS.MinisterHistoryModalBox>{' '}
        </ModalOverlay>
      )}

      {(registerCabinetModalOpen || Boolean(editingCabinet)) && (
        <CabinetFormModal
          isOpen={registerCabinetModalOpen || Boolean(editingCabinet)}
          onClose={() => {
            setRegisterCabinetModalOpen(false)
            setRegisterModalInitialMode(undefined)
            closeEditCabinetModal()
          }}
          onSaved={(savedCabinetId) => {
            const wasCreating = !editingCabinet
            setRegisterCabinetModalOpen(false)
            setRegisterModalInitialMode(undefined)
            closeEditCabinetModal()
            invalidateTenureQueries(queryClient)
            void queryClient.invalidateQueries({ queryKey: ['cabinets'] })
            void queryClient.invalidateQueries({
              queryKey: ['cabinets-by-country'],
            })
            if (wasCreating && savedCabinetId) {
              selectCabinetWithUrl(savedCabinetId)
            }
          }}
          isDark={isDark}
          country={country}
          constituentPolities={constituentPolities}
          defaultPolityFilterId={
            cabinetCountryFilter ||
            activeRegimeFilter?.historicalCountryId ||
            ''
          }
          initialMode={
            registerModalInitialMode ??
            (cabinetCategoryFilter === 'COLLECTIVE' ? 'collective' : undefined)
          }
          headPositionOptions={headPositionOptions}
          existingHeadTenures={headTenuresForRegister}
          editingCabinet={editingCabinet}
        />
      )}

      {bulkMinisterModalOpen && selectedCabinet && (
        <CabinetBulkMinisterModal
          isOpen={bulkMinisterModalOpen}
          onClose={() => setBulkMinisterModalOpen(false)}
          cabinet={selectedCabinet}
          departments={ministriesForCabinet}
          existingMinisters={nonHeadMinisters}
          countryId={
            selectedCabinet.countryId ??
            selectedCabinet.headTenure?.countryId ??
            countryId ??
            null
          }
          historicalCountryId={
            selectedCabinet.historicalCountryId ??
            selectedCabinet.headTenure?.historicalCountryId ??
            historicalCountryId ??
            null
          }
          countryName={country.name}
        />
      )}

      {appointmentModalOpen && addMinisterCabinet && (
        <InstitutionAppointmentModal
          isOpen={appointmentModalOpen}
          onClose={() => {
            setAppointmentModalOpen(false)
            setEditingMinisterForModal(null)
            setPreselectedMinisterDeptId(null)
            setAddMinisterCabinet(null)
          }}
          onSaved={() => {
            setAppointmentModalOpen(false)
            setEditingMinisterForModal(null)
            setPreselectedMinisterDeptId(null)
            setAddMinisterCabinet(null)
            invalidateTenureQueries(queryClient)
            void queryClient.invalidateQueries({
              queryKey: ['cabinet-suggested-members'],
            })
            void queryClient.invalidateQueries({
              queryKey: ['administration-department-tenures'],
            })
          }}
          contextType="CABINET"
          departmentId={preselectedMinisterDeptId}
          countryId={
            addMinisterCabinet.countryId ??
            addMinisterCabinet.headTenure?.countryId ??
            countryId ??
            null
          }
          historicalCountryId={
            addMinisterCabinet.historicalCountryId ??
            addMinisterCabinet.headTenure?.historicalCountryId ??
            historicalCountryId ??
            null
          }
          countryName={
            addMinisterCabinet.historicalCountry?.name ??
            addMinisterCabinet.headTenure?.historicalCountry?.name ??
            country.name
          }
          countryIsoCode={country.isoCode}
          cabinetId={addMinisterCabinet.id}
          cabinetName={
            addMinisterCabinet.name?.trim() ||
            formatCabinetHeadBreadcrumbLabel(
              addMinisterCabinet.headTenure,
              addMinisterCabinet.name,
            )
          }
          cabinetStartDate={
            resolveCabinetEffectiveDates(addMinisterCabinet).startDate
          }
          cabinetEndDate={
            resolveCabinetEffectiveDates(addMinisterCabinet).endDate
          }
          availableDepartments={ministriesForCabinet}
          editingTenure={editingMinisterForModal}
        />
      )}

      {/* 인물 상세 모달 — 공용 위젯 PersonInlineModal (사건 상세와 동일한 모달) */}
      <PersonInlineModal
        personId={mentionPersonId}
        onClose={() => setMentionPersonId(null)}
        onEdit={() => setMentionPersonId(null)}
      />

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

      {/* ── 다른 나라 행정부 묶기 ── */}
      {cabinetLinkageOpen &&
        selectedCabinetId &&
        (() => {
          const selCabDto = selectedCabinet as CabinetListItemDto | null
          const modalHistId =
            selCabDto?.historicalCountryId ??
            selCabDto?.headTenure?.historicalCountryId ??
            historicalCountryId
          const modalCountryId = modalHistId
            ? undefined
            : (selCabDto?.countryId ??
              selCabDto?.headTenure?.countryId ??
              countryId)
          return (
            <CabinetLinkageModal
              cabinetId={selectedCabinetId}
              countryId={modalCountryId}
              historicalCountryId={modalHistId}
              countryName={
                selCabDto?.historicalCountry?.name ??
                selCabDto?.headTenure?.historicalCountry?.name ??
                country.name
              }
              isDark={isDark}
              linkageGroupId={selCabDto?.linkageGroup?.id ?? null}
              linkageGroup={selCabDto?.linkageGroup ?? null}
              linkEventId={linkEventIdFromUrl ?? cabinetLinkageEventId}
              linkEventTitle={linkEventTitleFromUrl ?? cabinetLinkageEventTitle}
              onClose={() => {
                setCabinetLinkageOpen(false)
                setCabinetLinkageEventId(null)
                setCabinetLinkageEventTitle(null)
                if (
                  searchParams.get('linkEventId') ||
                  searchParams.get('linkEventTitle')
                ) {
                  const next = new URLSearchParams(searchParams)
                  next.delete('linkEventId')
                  next.delete('linkEventTitle')
                  setSearchParams(next, { replace: true })
                }
              }}
            />
          )
        })()}

      {/* ── 조약 연결 모달 ── */}
      {showTreatyLinkModal &&
        selectedCabinetId &&
        (() => {
          const selCabDto = selectedCabinet as CabinetListItemDto | null
          const modalHistId =
            selCabDto?.historicalCountryId ??
            selCabDto?.headTenure?.historicalCountryId ??
            historicalCountryId
          const modalCountryId = modalHistId
            ? undefined
            : (selCabDto?.countryId ??
              selCabDto?.headTenure?.countryId ??
              countryId)
          const modalCountryLabel =
            selCabDto?.historicalCountry?.name ??
            selCabDto?.headTenure?.historicalCountry?.name ??
            country.name
          const effectiveCountryForTreaty: UnifiedCountry =
            modalHistId && !isHistorical
              ? {
                  ...country,
                  id: modalHistId,
                  name: modalCountryLabel,
                  type: 'historical',
                }
              : country
          return (
            <TreatyLinkModal
              cabinetId={selectedCabinetId}
              country={effectiveCountryForTreaty}
              countryId={modalCountryId}
              historicalCountryId={modalHistId}
              cabinets={sortedCabinets}
              currentTreaties={cabinetTreaties}
              isDark={isDark}
              onClose={() => setShowTreatyLinkModal(false)}
              onLinked={async () => {
                void queryClient.invalidateQueries({
                  queryKey: ['treaties-by-cabinet', selectedCabinetId],
                })
                void queryClient.invalidateQueries({
                  queryKey: ['cabinets-by-country'],
                })
                void queryClient.invalidateQueries({ queryKey: ['cabinets'] })
                void queryClient.invalidateQueries({
                  queryKey: ['global-cabinets'],
                })
                void queryClient.invalidateQueries({
                  queryKey: ['global-cabinet-detail', selectedCabinetId],
                })
                setShowTreatyLinkModal(false)
              }}
            />
          )
        })()}
    </CabS.CabinetsSectionRoot>
  )
}
