import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiAnchor,
  FiArrowDown,
  FiArrowUp,
  FiArrowUpRight,
  FiAward,
  FiCalendar,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiColumns,
  FiCompass,
  FiCrosshair,
  FiEdit2,
  FiExternalLink,
  FiGitBranch,
  FiLayers,
  FiList,
  FiMapPin,
  FiMaximize2,
  FiNavigation,
  FiPlus,
  FiSearch,
  FiShield,
  FiTrash2,
  FiUser,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { useHistoricalCountriesByModernCountry } from '@/features/country/api/use-historical-countries-by-modern-country.hook'
import { useConstituentHistoricalPolities } from '@/features/government-info/model/use-constituent-historical-polities'
import { SIDE_UNIT_ROLE_LABEL } from '@/pages/events/detail/components/side-orbat.lib'
import { SIDE_OUTCOME_LABEL } from '@/pages/events/detail/components/side-outcome'
import {
  administrationDepartmentApi,
  type AdministrationDepartmentEventRole,
} from '@/shared/api/administration-department'
import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import {
  militaryUnitApi,
  type MilitaryUnit,
  type MilitaryUnitDatePartsDto,
  type MilitaryUnitEventLinkDto,
  type MilitaryUnitTenureItem,
  type MilitaryUnitType,
} from '@/shared/api/military-unit'
import { personCareerApi } from '@/shared/api/person-career'
import { getUploadImageUrl } from '@/shared/api/upload'
import { signedYearFromIsoLike } from '@/shared/lib/country-period'
import { formatSignedYear } from '@/shared/lib/lifespan-text'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import {
  getSignedDateChronologyKey,
  parseSignedDateParts,
} from '@/shared/lib/tenure-person-utils'
import { pathKeys } from '@/shared/router'
import { useThemeStore } from '@/shared/styles/theme.store'
import { confirm } from '@/shared/ui/confirm-dialog'
import {
  EmptyStateFill,
  EmptyStateSimple,
  EmptyStateSpotlight,
} from '@/shared/ui/empty-state/empty-state'
import {
  EventPickerModal,
  type EventPickerSelection,
} from '@/shared/ui/event-picker-modal/event-picker-modal'
import { InstitutionAppointmentModal } from '@/shared/ui/institution-appointment-modal'
import { notify } from '@/shared/ui/toast'
import * as DetailS from '@/widgets/country/country-detail/ui/ministry-department-detail.styles'
import { PersonInlineModal } from '@/widgets/person/person-inline-modal/person-inline-modal'

import {
  GOV_BRAND,
  GOV_ROW_HAIRLINE,
  GovActiveFilterChip,
  GovActiveFiltersRow,
  GovClearFiltersBtn,
  GovLedgerPanel,
  GovPrimaryBtn,
  GovPromSearch,
  GovPromSearchClear,
  GovPromSearchInput,
  GovToolbarBtn,
  GovToolbarDivider,
  GovToolbarGroup,
  GovToolbarRight,
  GovToolbarRow,
  GovToolbarShell,
  GovViewMeta,
} from './government-ledger.styles'
import {
  type LedgerMilitaryUnitItem,
  MilitaryUnitsLedgerView,
} from './military-units-ledger-view.widget'
import { UnlinkedCountryTenuresBar } from './unlinked-country-tenures-bar'

export interface CreateMilitaryUnitDefaults {
  parentUnitId?: string | null
  administrationDepartmentId?: string | null
  historicalCountryId?: string | null
  branch?: string | null
}

export interface GovernmentMilitaryTabProps {
  country?: UnifiedCountry
  effectiveCountryId: string | undefined
  focusUnitId?: string | null
  onConsumedFocusUnit?: () => void
  onSelectedUnitChange?: (unitId: string | null) => void
  onCreateUnit: (defaults?: CreateMilitaryUnitDefaults) => void
  onEditUnit: (unitId: string) => void
  onNavigateToDepartment?: (departmentId: string) => void
}

type EchelonGroupKey = 'ALL' | 'HIGH_COMMAND' | 'OPERATIONAL' | 'TACTICAL'
type UnitStatusFilter = 'ALL' | 'ACTIVE' | 'DISBANDED'
type BrowseViewMode = 'TREE' | 'LEDGER'
type WorkspaceLayoutMode = 'SPLIT' | 'FOCUS'

const ECHELON_GROUP_LABELS: Record<EchelonGroupKey, string> = {
  ALL: '전체 제대',
  HIGH_COMMAND: '상급지휘부',
  OPERATIONAL: '작전·전략',
  TACTICAL: '전술·부대',
}

const STATUS_FILTER_LABELS: Record<UnitStatusFilter, string> = {
  ALL: '전체 상태',
  ACTIVE: '운용',
  DISBANDED: '해체',
}

const HIGH_COMMAND_ECHELONS = new Set<string>([
  'SUPREME_COMMAND',
  'GENERAL_STAFF',
  'SERVICE_HQ',
  'THEATER',
])

const OPERATIONAL_ECHELONS = new Set<string>([
  'ARMY_GROUP',
  'FRONT',
  'MILITARY_DISTRICT',
  'FIELD_ARMY',
  'CORPS',
  'FLEET',
  'AIR_FLEET',
  'AIR_CORPS',
])

const UNIT_TYPE_LABELS: Record<MilitaryUnitType, string> = {
  SUPREME_COMMAND: '최고사령부',
  GENERAL_STAFF: '참모본부·합참',
  SERVICE_HQ: '각군 총사령부',
  THEATER: '전구·총사령부',
  ARMY_GROUP: '집단군',
  FRONT: '전선군·방면군',
  MILITARY_DISTRICT: '군관구',
  FIELD_ARMY: '야전군',
  CORPS: '군단',
  DIVISION: '사단',
  BRIGADE: '여단',
  REGIMENT: '연대',
  BATTALION: '대대',
  COMPANY: '중대',
  PLATOON: '소대',
  SQUAD: '분대',
  FLEET: '함대',
  AIR_FLEET: '항공함대',
  AIR_CORPS: '항공군단',
  SQUADRON: '전대',
  WING: '비행단',
  SPECIAL_FORCES: '특수부대',
  DETACHMENT: '파견대',
  OTHER: '기타',
}

/** 상급 부대부터 하급 부대 순으로 정렬하기 위한 위계 가중치 */
const UNIT_ECHELON_ORDER: Record<string, number> = {
  SUPREME_COMMAND: -3,
  GENERAL_STAFF: -2,
  SERVICE_HQ: -1,
  THEATER: 1,
  ARMY_GROUP: 2,
  FRONT: 2,
  MILITARY_DISTRICT: 3,
  FIELD_ARMY: 4,
  FLEET: 4,
  AIR_FLEET: 4,
  CORPS: 5,
  AIR_CORPS: 5,
  DIVISION: 6,
  WING: 6,
  BRIGADE: 7,
  REGIMENT: 8,
  SQUADRON: 8,
  BATTALION: 9,
  SPECIAL_FORCES: 9,
  DETACHMENT: 10,
  COMPANY: 11,
  PLATOON: 12,
  SQUAD: 13,
  OTHER: 99,
}

const TRANSITION_KIND_LABEL_KO: Record<string, string> = {
  RENAME: '개칭',
  REORGANIZE: '개편',
  SPLIT: '분할',
  MERGE: '통합',
  ABSORBED: '흡수',
  ABSORB: '흡수',
}

const EVENT_ROLE_LABEL: Record<AdministrationDepartmentEventRole, string> = {
  ISSUER: '지령 발령·하달',
  RECIPIENT: '수명·작전 이행',
  PRINCIPAL: '작전 주도·총괄',
  PARTICIPANT: '참여·관여',
  OTHER: '기타',
}

const EVENT_ROLE_KEYS: AdministrationDepartmentEventRole[] = [
  'PRINCIPAL',
  'ISSUER',
  'RECIPIENT',
  'PARTICIPANT',
  'OTHER',
]

const BRANCH_LABELS: Record<string, string> = {
  JOINT: '합동·통합군',
  ARMY: '육군',
  NAVY: '해군',
  AIR_FORCE: '공군',
  MARINE_CORPS: '해병대',
  COAST_GUARD: '해안경비대',
  SPACE_FORCE: '우주군',
  OTHER: '기타·독립군종',
}

const BRANCH_DISPLAY_ORDER: readonly string[] = [
  'JOINT',
  'ARMY',
  'NAVY',
  'AIR_FORCE',
  'MARINE_CORPS',
  'COAST_GUARD',
  'SPACE_FORCE',
  'OTHER',
  'UNSPECIFIED',
]

const INITIAL_VISIBLE_COMMANDERS = 15

type ExtendedMilitaryUnit = LedgerMilitaryUnitItem & {
  primaryMission?: string | null
  jurisdiction?: string | null
  notableBattles?: string | null
  honors?: string | null
  eventRelations?: MilitaryUnitEventLinkDto[]
  sideDeployedUnits?: Array<{
    id: string
    role?: string | null
    note?: string | null
    parentUnit?: { id: string; name: string; unitType?: string | null } | null
    commander?: { id: string; name: string; surname?: string | null } | null
    weaponsUsed?: Array<{
      id: string
      quantity?: string | number | null
      weapon?: { id: string; name: string } | null
      groundVehicle?: { id: string; name: string } | null
      aircraft?: { id: string; name: string } | null
      navalVessel?: { id: string; name: string } | null
    }>
    deployedWeapons?: Array<{
      id: string
      quantity?: string | number | null
      weapon?: { id: string; name: string } | null
      groundVehicle?: { id: string; name: string } | null
      aircraft?: { id: string; name: string } | null
      navalVessel?: { id: string; name: string } | null
    }>
    mapFeatures?: Array<{
      id: string
      eventId: string
      geometryType: string
      title?: string | null
    }>
    side: {
      id: string
      name: string
      color?: string | null
      outcome?: string | null
      event: {
        id: string
        title: string
        startDate?: string | null
        endDate?: string | null
        kind?: string | null
      }
    }
  }>
}

function getLedgerTokens(isDark: boolean) {
  return {
    hairline: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(20, 19, 34, 0.06)',
    border: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(20, 19, 34, 0.1)',
    rail: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(20, 19, 34, 0.14)',
    text: isDark ? '#f1f5f9' : '#0f172a',
    textSub: isDark ? '#94a3b8' : '#64748b',
    textFaint: isDark ? '#64748b' : '#94a3b8',
    hoverBg: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(20, 19, 34, 0.025)',
    selectedBg: isDark ? GOV_BRAND.primarySoftDark : GOV_BRAND.primarySoft,
    chipBg: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(20, 19, 34, 0.045)',
    chipBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(20, 19, 34, 0.1)',
    subtleBg: isDark ? 'rgba(255, 255, 255, 0.025)' : '#f8fafc',
    accent: isDark ? '#93c5fd' : GOV_BRAND.primary,
    accentSoft: isDark ? GOV_BRAND.primarySoftDark : GOV_BRAND.primarySoft,
  }
}

function resolveUnitSignedStartYear(
  unitItem: ExtendedMilitaryUnit,
): number | null {
  if (unitItem.established?.year && unitItem.established.year > 0) {
    return unitItem.established.era === 'BC'
      ? -Math.abs(unitItem.established.year)
      : unitItem.established.year
  }
  return signedYearFromIsoLike(unitItem.establishedDate)
}

function resolveUnitSignedEndYear(
  unitItem: ExtendedMilitaryUnit,
): number | null {
  if (unitItem.disbanded?.year && unitItem.disbanded.year > 0) {
    return unitItem.disbanded.era === 'BC'
      ? -Math.abs(unitItem.disbanded.year)
      : unitItem.disbanded.year
  }
  return signedYearFromIsoLike(unitItem.disbandedDate)
}

function parseSnapshotYearInput(rawInput: string): number | null {
  const trimmed = rawInput.trim()
  if (!trimmed) return null
  const bcPrefixMatch = /^(?:bc|기원전)\s*(\d{1,5})$/i.exec(trimmed)
  if (bcPrefixMatch) {
    const absVal = Number(bcPrefixMatch[1])
    return absVal > 0 ? -absVal : null
  }
  const signedMatch = /^([+-]?\d{1,5})$/.exec(trimmed)
  if (signedMatch) {
    const yearVal = Number(signedMatch[1])
    return Number.isFinite(yearVal) && yearVal !== 0 ? yearVal : null
  }
  return null
}

function isUnitActiveAtYear(
  unitItem: ExtendedMilitaryUnit,
  targetSignedYear: number,
): boolean {
  const estYear =
    resolveUnitSignedStartYear(unitItem) ??
    parseSignedDateParts(unitItem.establishedDate)?.signedYear ??
    null
  const disYear =
    resolveUnitSignedEndYear(unitItem) ??
    parseSignedDateParts(unitItem.disbandedDate)?.signedYear ??
    null

  if (estYear == null && disYear == null) return false
  if (estYear != null && targetSignedYear < estYear) return false
  if (disYear != null && targetSignedYear > disYear) return false
  return true
}

function formatUnitCompactPeriod(unitItem: ExtendedMilitaryUnit): string | null {
  const startYear = resolveUnitSignedStartYear(unitItem)
  const endYear = resolveUnitSignedEndYear(unitItem)
  if (startYear != null && endYear != null) {
    return `${formatSignedYear(startYear)}–${formatSignedYear(endYear)}`
  }
  if (startYear != null) {
    return `${formatSignedYear(startYear)}–${unitItem.isActive === false ? '해체' : '현재'}`
  }
  if (endYear != null) {
    return `?–${formatSignedYear(endYear)}`
  }
  return null
}

function formatUnitFullDate(
  parts: MilitaryUnitDatePartsDto | null | undefined,
  iso: string | null | undefined,
): string | null {
  if (parts && typeof parts.year === 'number' && parts.year > 0) {
    const prefix = parts.era === 'BC' ? 'BC ' : ''
    const monthStr =
      parts.month != null ? `.${String(parts.month).padStart(2, '0')}` : ''
    const dayStr =
      parts.month != null && parts.day != null
        ? `.${String(parts.day).padStart(2, '0')}`
        : ''
    return `${prefix}${parts.year}${monthStr}${dayStr}`
  }
  if (!iso) return null
  if (iso.startsWith('-')) {
    const bcMatch = iso.match(/^-(\d{1,6})-(\d{2})-(\d{2})/)
    if (bcMatch) return `BC ${Number(bcMatch[1])}`
  }
  return iso.slice(0, 10).replace(/-/g, '.')
}

function formatTransitionYearLabel(lineage: {
  era?: 'BC' | 'AD' | null
  year?: number | null
  month?: number | null
}): string | null {
  if (typeof lineage.year !== 'number' || lineage.year <= 0) return null
  const eraPrefix = lineage.era === 'BC' ? 'BC ' : ''
  const monthSuffix =
    typeof lineage.month === 'number' && lineage.month >= 1
      ? `.${String(lineage.month).padStart(2, '0')}`
      : ''
  return `${eraPrefix}${lineage.year}${monthSuffix}`
}

function formatTenureDatePart(
  era: string | null | undefined,
  year: number | null | undefined,
  month: number | null | undefined,
  day: number | null | undefined,
  iso: string | null | undefined,
): string {
  if (year != null && year > 0) {
    const prefix = era === 'BC' ? 'BC ' : ''
    const monthPart =
      month != null ? `.${String(month).padStart(2, '0')}` : ''
    const dayPart =
      month != null && day != null ? `.${String(day).padStart(2, '0')}` : ''
    return `${prefix}${year}${monthPart}${dayPart}`
  }
  if (iso) {
    if (iso.startsWith('-')) {
      const bcMatch = iso.match(/^-(\d{1,6})-(\d{2})-(\d{2})/)
      if (bcMatch) return `BC ${Number(bcMatch[1])}`
    }
    return iso.slice(0, 10).replace(/-/g, '.')
  }
  return ''
}

function getCommanderChronologyKey(tenureItem: MilitaryUnitTenureItem): number {
  if (typeof tenureItem.startYear === 'number' && tenureItem.startYear > 0) {
    const signedYear =
      tenureItem.startEra === 'BC'
        ? -Math.abs(tenureItem.startYear)
        : tenureItem.startYear
    const monthVal = tenureItem.startMonth ?? 1
    const dayVal = tenureItem.startDay ?? 1
    return signedYear * 10000 + monthVal * 100 + dayVal
  }
  return getSignedDateChronologyKey(
    tenureItem.startDate,
    0,
    tenureItem.startEra,
  )
}

function compareUnitsByEchelonAndYear(
  left: ExtendedMilitaryUnit,
  right: ExtendedMilitaryUnit,
): number {
  const leftRank = left.unitType
    ? (UNIT_ECHELON_ORDER[left.unitType] ?? 50)
    : 50
  const rightRank = right.unitType
    ? (UNIT_ECHELON_ORDER[right.unitType] ?? 50)
    : 50
  if (leftRank !== rightRank) return leftRank - rightRank
  const leftStart = resolveUnitSignedStartYear(left) ?? 999999
  const rightStart = resolveUnitSignedStartYear(right) ?? 999999
  if (leftStart !== rightStart) return leftStart - rightStart
  return left.name.localeCompare(right.name, 'ko')
}

function matchesEchelonGroup(
  unitType: string | null | undefined,
  groupKey: EchelonGroupKey,
): boolean {
  if (groupKey === 'ALL') return true
  const resolved = unitType || 'OTHER'
  if (groupKey === 'HIGH_COMMAND') {
    return HIGH_COMMAND_ECHELONS.has(resolved)
  }
  if (groupKey === 'OPERATIONAL') {
    return OPERATIONAL_ECHELONS.has(resolved)
  }
  return (
    !HIGH_COMMAND_ECHELONS.has(resolved) && !OPERATIONAL_ECHELONS.has(resolved)
  )
}

function renderUnitBranchIcon(
  branch: string | null | undefined,
  unitType: string | null | undefined,
  size: number,
) {
  if (
    unitType === 'SUPREME_COMMAND' ||
    unitType === 'GENERAL_STAFF' ||
    unitType === 'SERVICE_HQ'
  ) {
    return <FiAward size={size} />
  }
  if (branch === 'NAVY' || branch === 'COAST_GUARD' || unitType === 'FLEET') {
    return <FiAnchor size={size} />
  }
  if (
    branch === 'AIR_FORCE' ||
    branch === 'SPACE_FORCE' ||
    unitType === 'AIR_FLEET' ||
    unitType === 'AIR_CORPS' ||
    unitType === 'WING'
  ) {
    return <FiNavigation size={size} />
  }
  if (branch === 'SPECIAL_FORCES' || unitType === 'SPECIAL_FORCES') {
    return <FiCrosshair size={size} />
  }
  if (branch === 'JOINT') {
    return <FiLayers size={size} />
  }
  return <FiShield size={size} />
}

function UnitEmblemThumb({
  unitItem,
  size = 30,
  isDark,
}: {
  unitItem: ExtendedMilitaryUnit
  size?: number
  isDark: boolean
}) {
  const tokens = getLedgerTokens(isDark)
  if (unitItem.insigniaUrl) {
    return (
      <img
        src={getUploadImageUrl(unitItem.insigniaUrl)}
        alt=""
        style={{
          width: size,
          height: size,
          objectFit: 'cover',
          borderRadius: 7,
          flexShrink: 0,
          border: `1px solid ${tokens.chipBorder}`,
        }}
        onError={(imgEvent) => {
          imgEvent.currentTarget.style.display = 'none'
        }}
      />
    )
  }

  const isHighCmd =
    unitItem.unitType != null && HIGH_COMMAND_ECHELONS.has(unitItem.unitType)
  const isNaval =
    unitItem.branch === 'NAVY' ||
    unitItem.branch === 'COAST_GUARD' ||
    unitItem.unitType === 'FLEET'
  const isAir =
    unitItem.branch === 'AIR_FORCE' ||
    unitItem.branch === 'SPACE_FORCE' ||
    unitItem.unitType === 'AIR_FLEET' ||
    unitItem.unitType === 'AIR_CORPS' ||
    unitItem.unitType === 'WING'

  const tone = isHighCmd
    ? {
        bg: isDark ? 'rgba(245, 158, 11, 0.14)' : '#fffbeb',
        border: isDark ? 'rgba(251, 191, 36, 0.28)' : '#fde68a',
        color: isDark ? '#fcd34d' : '#b45309',
      }
    : isNaval
      ? {
          bg: isDark ? 'rgba(37, 99, 235, 0.16)' : '#eff6ff',
          border: isDark ? 'rgba(96, 165, 250, 0.28)' : '#bfdbfe',
          color: isDark ? '#93c5fd' : '#1d4ed8',
        }
      : isAir
        ? {
            bg: isDark ? 'rgba(14, 165, 233, 0.16)' : '#f0f9ff',
            border: isDark ? 'rgba(56, 189, 248, 0.28)' : '#bae6fd',
            color: isDark ? '#7dd3fc' : '#0369a1',
          }
        : {
            bg: isDark ? 'rgba(13, 148, 136, 0.14)' : '#f0fdfa',
            border: isDark ? 'rgba(45, 212, 191, 0.24)' : '#ccfbf1',
            color: isDark ? '#5eead4' : '#0f766e',
          }

  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: 7,
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        color: tone.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {renderUnitBranchIcon(unitItem.branch, unitItem.unitType, 14)}
    </div>
  )
}

export function GovernmentMilitaryTab({
  country,
  effectiveCountryId,
  focusUnitId,
  onConsumedFocusUnit,
  onSelectedUnitChange,
  onCreateUnit,
  onEditUnit,
  onNavigateToDepartment,
}: GovernmentMilitaryTabProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isDark = useThemeStore((state) => state.mode === 'dark')
  const isHistorical = country?.type === 'historical'
  const targetId = effectiveCountryId ?? country?.id ?? ''

  const [browseViewMode, setBrowseViewMode] = useState<BrowseViewMode>('TREE')
  const [layoutMode, setLayoutMode] = useState<WorkspaceLayoutMode>('SPLIT')
  const [searchQuery, setSearchQuery] = useState('')
  const [echelonGroupFilter, setEchelonGroupFilter] =
    useState<EchelonGroupKey>('ALL')
  const [statusFilter, setStatusFilter] = useState<UnitStatusFilter>('ALL')
  const [snapshotYearInput, setSnapshotYearInput] = useState('')
  const [eraFilter, setEraFilter] = useState<string>('ALL')
  const [deptFilter, setDeptFilter] = useState<string>('ALL')
  const [branchFilter, setBranchFilter] = useState<string>('ALL')

  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(
    focusUnitId || null,
  )
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(
    () => new Set(),
  )

  // Commander tenure & inline person inspection states
  const [appointmentOpen, setAppointmentOpen] = useState(false)
  const [editingTenure, setEditingTenure] =
    useState<MilitaryUnitTenureItem | null>(null)
  const [commanderSortOrder, setCommanderSortOrder] = useState<'desc' | 'asc'>(
    'asc',
  )
  const [commanderSearch, setCommanderSearch] = useState('')
  const [expandedAllCommanders, setExpandedAllCommanders] = useState(false)
  const [inspectPersonId, setInspectPersonId] = useState<string | null>(null)

  // Directive event link & inline edit states
  const [eventPickerOpen, setEventPickerOpen] = useState(false)
  const [pendingEvent, setPendingEvent] =
    useState<EventPickerSelection | null>(null)
  const [editingEventLink, setEditingEventLink] =
    useState<MilitaryUnitEventLinkDto | null>(null)
  const [eventRole, setEventRole] =
    useState<AdministrationDepartmentEventRole>('ISSUER')
  const [eventRoleDesc, setEventRoleDesc] = useState('')
  const [eventLinkBusy, setEventLinkBusy] = useState(false)

  const parsedSnapshotYear = useMemo(
    () => parseSnapshotYearInput(snapshotYearInput),
    [snapshotYearInput],
  )

  const { data: linkedHistoricalCountries = [] } =
    useHistoricalCountriesByModernCountry(
      !isHistorical && targetId ? targetId : '',
    )

  const { data: constituentPolities = [] } = useConstituentHistoricalPolities(
    isHistorical && targetId ? targetId : undefined,
  )

  const linkedHistoricalIds = useMemo(() => {
    const idSet = new Set<string>()
    for (const item of country?.historicalCountries ?? []) {
      if (item.id) idSet.add(item.id)
    }
    for (const item of linkedHistoricalCountries) {
      if (item.id) idSet.add(item.id)
    }
    return idSet
  }, [country?.historicalCountries, linkedHistoricalCountries])

  const constituentPolityIdSet = useMemo(() => {
    const idSet = new Set<string>()
    for (const item of constituentPolities) {
      if (item.id) idSet.add(item.id)
    }
    return idSet
  }, [constituentPolities])

  const unitsQuery = useQuery({
    queryKey: ['military-units', 'all'],
    queryFn: () => militaryUnitApi.getAll(),
    staleTime: 1000 * 60 * 2,
  })

  const countryUnits = useMemo<ExtendedMilitaryUnit[]>(() => {
    const allUnits = (unitsQuery.data ?? []) as ExtendedMilitaryUnit[]
    if (!targetId) return []
    return allUnits.filter((unitItem) => {
      if (isHistorical) {
        return (
          unitItem.historicalCountryId === targetId ||
          (unitItem.historicalCountryId != null &&
            constituentPolityIdSet.has(unitItem.historicalCountryId))
        )
      }
      return (
        unitItem.countryId === targetId ||
        (unitItem.historicalCountryId != null &&
          linkedHistoricalIds.has(unitItem.historicalCountryId))
      )
    })
  }, [
    unitsQuery.data,
    targetId,
    isHistorical,
    constituentPolityIdSet,
    linkedHistoricalIds,
  ])

  const unitByIdMap = useMemo(() => {
    const map = new Map<string, ExtendedMilitaryUnit>()
    for (const unitItem of countryUnits) {
      map.set(unitItem.id, unitItem)
    }
    return map
  }, [countryUnits])

  const selectUnit = (nextUnitId: string | null) => {
    setSelectedUnitId(nextUnitId)
    onSelectedUnitChange?.(nextUnitId)
  }

  /** 외부(중앙부처 상세 또는 URL ?unitId=)에서 특정 부대 포커스 요청 시 선택 및 필터 해제 */
  useEffect(() => {
    if (!focusUnitId || countryUnits.length === 0) return
    if (unitByIdMap.has(focusUnitId)) {
      setSelectedUnitId(focusUnitId)
      setEchelonGroupFilter('ALL')
      setEraFilter('ALL')
      setDeptFilter('ALL')
      setBranchFilter('ALL')
      setStatusFilter('ALL')
      setSnapshotYearInput('')
    }
    onConsumedFocusUnit?.()
  }, [focusUnitId, countryUnits.length, unitByIdMap, onConsumedFocusUnit])

  const autoSelectedSplitScopeRef = useRef<string | null>(null)
  const currentSplitScopeKey = `${targetId}:${branchFilter}:${eraFilter}:${deptFilter}`

  useEffect(() => {
    if (layoutMode !== 'SPLIT') {
      autoSelectedSplitScopeRef.current = null
      return
    }
    if (countryUnits.length === 0) {
      setSelectedUnitId(null)
      return
    }
    if (selectedUnitId && unitByIdMap.has(selectedUnitId)) {
      autoSelectedSplitScopeRef.current = currentSplitScopeKey
      return
    }
    if (autoSelectedSplitScopeRef.current === currentSplitScopeKey) {
      return
    }
    const sortedDefaults = [...countryUnits].sort(compareUnitsByEchelonAndYear)
    if (sortedDefaults[0]) {
      autoSelectedSplitScopeRef.current = currentSplitScopeKey
      setSelectedUnitId(sortedDefaults[0].id)
    }
  }, [
    layoutMode,
    currentSplitScopeKey,
    countryUnits,
    selectedUnitId,
    unitByIdMap,
  ])

  const historicalErasAvailable = useMemo(() => {
    const eraMap = new Map<string, string>()
    if (isHistorical) {
      for (const constituentItem of constituentPolities) {
        if (constituentItem.id && constituentItem.name) {
          eraMap.set(constituentItem.id, constituentItem.name)
        }
      }
      for (const unitItem of countryUnits) {
        if (
          unitItem.historicalCountry?.id &&
          unitItem.historicalCountry.id !== targetId &&
          unitItem.historicalCountry.name
        ) {
          eraMap.set(
            unitItem.historicalCountry.id,
            unitItem.historicalCountry.name,
          )
        }
      }
    } else {
      for (const linkedItem of linkedHistoricalCountries) {
        if (linkedItem.id && linkedItem.name) {
          eraMap.set(linkedItem.id, linkedItem.name)
        }
      }
      for (const unitItem of countryUnits) {
        if (unitItem.historicalCountry?.id && unitItem.historicalCountry.name) {
          eraMap.set(
            unitItem.historicalCountry.id,
            unitItem.historicalCountry.name,
          )
        }
      }
    }
    return Array.from(eraMap.entries())
      .map(([histId, histName]) => ({
        id: histId,
        name: histName,
        count: countryUnits.filter(
          (unitRow) => unitRow.historicalCountryId === histId,
        ).length,
      }))
      .filter((item) => item.count > 0)
  }, [
    constituentPolities,
    countryUnits,
    isHistorical,
    linkedHistoricalCountries,
    targetId,
  ])

  const directCountryUnitCount = useMemo(
    () =>
      isHistorical
        ? countryUnits.filter(
            (unitItem) => unitItem.historicalCountryId === targetId,
          ).length
        : countryUnits.filter((unitItem) => !unitItem.historicalCountryId)
            .length,
    [countryUnits, isHistorical, targetId],
  )

  /** 상위 부대를 따라가며 소속 중앙부처(군령·국방기구) 도출 */
  const resolveEffectiveDepartment = useMemo(() => {
    return (
      unitItem: LedgerMilitaryUnitItem,
    ): { id: string; name: string; abbreviation?: string | null } | null => {
      let cursor: LedgerMilitaryUnitItem | undefined = unitItem
      const visited = new Set<string>()
      while (cursor && !visited.has(cursor.id)) {
        visited.add(cursor.id)
        if (cursor.administrationDepartment?.id) {
          return cursor.administrationDepartment
        }
        cursor = cursor.parentUnitId
          ? unitByIdMap.get(cursor.parentUnitId)
          : undefined
      }
      return null
    }
  }, [unitByIdMap])

  const commandDepartments = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; abbreviation?: string | null; count: number }
    >()
    for (const unitItem of countryUnits) {
      const dept = resolveEffectiveDepartment(unitItem)
      if (!dept) continue
      const existing = map.get(dept.id)
      if (existing) {
        existing.count += 1
      } else {
        map.set(dept.id, {
          id: dept.id,
          name: dept.name,
          abbreviation: dept.abbreviation,
          count: 1,
        })
      }
    }
    return Array.from(map.values()).sort((left, right) =>
      left.name.localeCompare(right.name, 'ko'),
    )
  }, [countryUnits, resolveEffectiveDepartment])

  const unlinkedDeptUnitCount = useMemo(
    () =>
      countryUnits.filter((unitRow) => !resolveEffectiveDepartment(unitRow))
        .length,
    [countryUnits, resolveEffectiveDepartment],
  )

  /** 군종 탭 제외한 툴바 조건(검색·제대·상태·연도·시대·지휘부) 통과 여부 */
  const matchesNonBranchFilters = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase()
    return (unitItem: ExtendedMilitaryUnit): boolean => {
      if (eraFilter === 'MODERN' && unitItem.historicalCountryId) return false
      if (
        eraFilter !== 'ALL' &&
        eraFilter !== 'MODERN' &&
        unitItem.historicalCountryId !== eraFilter
      ) {
        return false
      }
      if (deptFilter !== 'ALL') {
        const effDept = resolveEffectiveDepartment(unitItem)
        if (deptFilter === 'UNLINKED') {
          if (effDept != null) return false
        } else if (effDept?.id !== deptFilter) {
          return false
        }
      }
      if (!matchesEchelonGroup(unitItem.unitType, echelonGroupFilter)) {
        return false
      }
      if (statusFilter === 'ACTIVE' && unitItem.isActive === false) {
        return false
      }
      if (statusFilter === 'DISBANDED' && unitItem.isActive !== false) {
        return false
      }
      if (
        parsedSnapshotYear != null &&
        !isUnitActiveAtYear(unitItem, parsedSnapshotYear)
      ) {
        return false
      }
      if (!keyword) return true
      const commanderMatch =
        (unitItem.commanders ?? []).some((cmdItem) => {
          const fullName =
            `${cmdItem.person?.surname ?? ''} ${cmdItem.person?.name ?? ''}`.toLowerCase()
          return fullName.includes(keyword)
        }) ||
        (unitItem.tenures ?? []).some((tenureItem) => {
          const fullName =
            `${tenureItem.person?.surname ?? ''} ${tenureItem.person?.name ?? ''}`.toLowerCase()
          return fullName.includes(keyword)
        })
      return (
        unitItem.name.toLowerCase().includes(keyword) ||
        (unitItem.abbreviation ?? '').toLowerCase().includes(keyword) ||
        (unitItem.nameLocal ?? '').toLowerCase().includes(keyword) ||
        (unitItem.nameEn ?? '').toLowerCase().includes(keyword) ||
        (unitItem.nickname ?? '').toLowerCase().includes(keyword) ||
        (unitItem.motto ?? '').toLowerCase().includes(keyword) ||
        (unitItem.garrison ?? '').toLowerCase().includes(keyword) ||
        (unitItem.description ?? '').toLowerCase().includes(keyword) ||
        (unitItem.administrationDepartment?.name ?? '')
          .toLowerCase()
          .includes(keyword) ||
        commanderMatch
      )
    }
  }, [
    searchQuery,
    eraFilter,
    deptFilter,
    echelonGroupFilter,
    statusFilter,
    parsedSnapshotYear,
    resolveEffectiveDepartment,
  ])

  const unitsMatchingToolbar = useMemo(
    () => countryUnits.filter(matchesNonBranchFilters),
    [countryUnits, matchesNonBranchFilters],
  )

  const branchTabs = useMemo(() => {
    const presentBranches = new Set<string>()
    for (const unitItem of countryUnits) {
      presentBranches.add(unitItem.branch || 'UNSPECIFIED')
    }
    const countsInToolbar = new Map<string, number>()
    for (const unitItem of unitsMatchingToolbar) {
      const bKey = unitItem.branch || 'UNSPECIFIED'
      countsInToolbar.set(bKey, (countsInToolbar.get(bKey) ?? 0) + 1)
    }

    const orderedKeys = [
      ...BRANCH_DISPLAY_ORDER.filter((key) => presentBranches.has(key)),
      ...Array.from(presentBranches).filter(
        (key) => !BRANCH_DISPLAY_ORDER.includes(key),
      ),
    ]

    return [
      {
        id: 'ALL',
        label: '전체 편제',
        count: unitsMatchingToolbar.length,
      },
      ...orderedKeys.map((branchKey) => ({
        id: branchKey,
        label:
          branchKey === 'UNSPECIFIED'
            ? '군종 미지정'
            : (BRANCH_LABELS[branchKey] ?? branchKey),
        count: countsInToolbar.get(branchKey) ?? 0,
      })),
    ]
  }, [countryUnits, unitsMatchingToolbar])

  const filteredUnits = useMemo(() => {
    const list =
      branchFilter === 'ALL'
        ? unitsMatchingToolbar
        : unitsMatchingToolbar.filter(
            (unitItem) => (unitItem.branch || 'UNSPECIFIED') === branchFilter,
          )
    return [...list].sort(compareUnitsByEchelonAndYear)
  }, [unitsMatchingToolbar, branchFilter])

  /** 트리 구성: 필터된 부대 집합 내에서 부모-자식 맵 및 중앙부처(군령기구)별 루트 그룹 생성 */
  const hierarchyGroups = useMemo(() => {
    const filteredIdSet = new Set(filteredUnits.map((unitItem) => unitItem.id))
    const childrenByParentId = new Map<string, ExtendedMilitaryUnit[]>()
    const rootUnits: ExtendedMilitaryUnit[] = []

    for (const unitItem of filteredUnits) {
      const parentId = unitItem.parentUnitId
      if (parentId && filteredIdSet.has(parentId) && parentId !== unitItem.id) {
        const list = childrenByParentId.get(parentId) ?? []
        list.push(unitItem)
        childrenByParentId.set(parentId, list)
      } else {
        rootUnits.push(unitItem)
      }
    }

    for (const childList of childrenByParentId.values()) {
      childList.sort(compareUnitsByEchelonAndYear)
    }
    rootUnits.sort(compareUnitsByEchelonAndYear)

    type DeptGroup = {
      key: string
      departmentId: string | null
      departmentName: string
      departmentAbbreviation?: string | null
      historicalCountryId?: string | null
      roots: ExtendedMilitaryUnit[]
    }

    const groupMap = new Map<string, DeptGroup>()
    for (const rootUnit of rootUnits) {
      const effDept = resolveEffectiveDepartment(rootUnit)
      const groupKey = effDept ? `dept:${effDept.id}` : 'dept:unlinked'
      const existing = groupMap.get(groupKey)
      if (existing) {
        existing.roots.push(rootUnit)
      } else {
        groupMap.set(groupKey, {
          key: groupKey,
          departmentId: effDept?.id ?? null,
          departmentName: effDept
            ? effDept.name
            : '독립 · 상급 군령기구 미지정 편제',
          departmentAbbreviation: effDept?.abbreviation,
          historicalCountryId: rootUnit.historicalCountryId ?? null,
          roots: [rootUnit],
        })
      }
    }

    const groups = Array.from(groupMap.values()).sort((left, right) => {
      if (left.departmentId && !right.departmentId) return -1
      if (!left.departmentId && right.departmentId) return 1
      return left.departmentName.localeCompare(right.departmentName, 'ko')
    })

    return {
      groups,
      childrenByParentId,
      collapsibleParentIds: Array.from(childrenByParentId.keys()),
    }
  }, [filteredUnits, resolveEffectiveDepartment])

  const selectedUnitDetailQuery = useQuery({
    queryKey: ['military-unit', 'detail', selectedUnitId],
    queryFn: () => militaryUnitApi.getById(selectedUnitId!),
    enabled: Boolean(selectedUnitId),
    staleTime: 1000 * 60,
  })

  const selectedUnitSummary = useMemo(
    () => (selectedUnitId ? (unitByIdMap.get(selectedUnitId) ?? null) : null),
    [selectedUnitId, unitByIdMap],
  )

  const selectedUnitFull =
    (selectedUnitDetailQuery.data as ExtendedMilitaryUnit | undefined) ??
    selectedUnitSummary

  useEffect(() => {
    setCommanderSearch('')
    setExpandedAllCommanders(false)
    setPendingEvent(null)
    setEditingEventLink(null)
  }, [selectedUnitId])

  const deleteMutation = useMutation({
    mutationFn: (unitId: string) => militaryUnitApi.delete(unitId),
    onSuccess: (_, deletedId) => {
      void queryClient.invalidateQueries({ queryKey: ['military-units'] })
      void queryClient.invalidateQueries({
        queryKey: ['administration-departments'],
      })
      if (selectedUnitId === deletedId) {
        selectUnit(null)
      }
      notify.success('군부대가 삭제되었습니다.')
    },
    onError: () => {
      notify.error(
        '군부대 삭제에 실패했습니다. 예하 부대나 참전 기록이 연결되어 있는지 확인해주세요.',
      )
    },
  })

  const handleDelete = async (unitItem: ExtendedMilitaryUnit) => {
    const childCount = countryUnits.filter(
      (candidate) => candidate.parentUnitId === unitItem.id,
    ).length
    if (childCount > 0) {
      notify.error(
        `'${unitItem.name}' 아래에 예하 부대 ${childCount}개가 연결되어 있습니다. 먼저 예하 부대를 이동하거나 삭제해주세요.`,
      )
      return
    }
    const confirmed = await confirm({
      title: '군부대 삭제',
      message: `'${unitItem.name}' 부대를 삭제하시겠습니까?`,
      confirmText: '삭제',
      danger: true,
    })
    if (!confirmed) return
    deleteMutation.mutate(unitItem.id)
  }

  const refreshSelectedUnitQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ['military-units'] })
    if (selectedUnitId) {
      await queryClient.invalidateQueries({
        queryKey: ['military-unit', 'detail', selectedUnitId],
      })
    }
  }

  const handleDeleteCommanderTenure = async (tenure: MilitaryUnitTenureItem) => {
    const roleLabel =
      tenure.title ?? tenure.positionDefinition?.title ?? '지휘관 임기'
    const confirmed = await confirm({
      title: '지휘관·참모 재임 삭제',
      message: `'${roleLabel}' 임기 기록을 삭제하시겠습니까?`,
      confirmText: '삭제',
      danger: true,
    })
    if (!confirmed) return
    try {
      await personCareerApi.deleteGovernmentPositionTenure(tenure.id)
      invalidateTenureQueries(queryClient, {
        personId: tenure.person?.id ?? tenure.personId,
        countryId: isHistorical ? null : targetId,
        historicalCountryId: isHistorical ? targetId : null,
      })
      await refreshSelectedUnitQueries()
      notify.success('지휘관·참모 재임 기록이 삭제되었습니다.')
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : '재임 기록 삭제에 실패했습니다.',
      )
    }
  }

  const resetEventLinkForm = () => {
    setPendingEvent(null)
    setEditingEventLink(null)
    setEventRole('ISSUER')
    setEventRoleDesc('')
  }

  const handleSaveDirectiveEvent = async () => {
    if (!selectedUnitFull || eventLinkBusy) return
    setEventLinkBusy(true)
    try {
      if (editingEventLink) {
        await administrationDepartmentApi.updateDepartmentEventLink(
          editingEventLink.event.id,
          editingEventLink.relationId,
          {
            role: eventRole,
            roleDescription: eventRoleDesc.trim() || null,
          },
        )
        notify.success('지령·작전 사건 역할이 수정되었습니다.')
      } else if (pendingEvent) {
        await administrationDepartmentApi.linkDepartmentEvent(pendingEvent.id, {
          militaryUnitId: selectedUnitFull.id,
          role: eventRole,
          roleDescription: eventRoleDesc.trim() || null,
        })
        notify.success(`'${pendingEvent.title}' 사건·지령을 연결했습니다.`)
      }
      resetEventLinkForm()
      await refreshSelectedUnitQueries()
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : '사건 연결 저장에 실패했습니다.',
      )
    } finally {
      setEventLinkBusy(false)
    }
  }

  const handleUnlinkDirectiveEvent = async (
    eventId: string,
    relationId: string,
    eventTitle: string,
  ) => {
    const confirmed = await confirm({
      title: '사건·지령 연결 해제',
      message: `'${eventTitle}' 연결을 해제하시겠습니까?`,
      confirmText: '해제',
      danger: true,
    })
    if (!confirmed) return
    try {
      await administrationDepartmentApi.unlinkDepartmentEvent(
        eventId,
        relationId,
      )
      notify.success('사건 연결이 해제되었습니다.')
      await refreshSelectedUnitQueries()
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : '연결 해제에 실패했습니다.',
      )
    }
  }

  const toggleNodeCollapse = (unitId: string) => {
    setCollapsedNodeIds((prev) => {
      const next = new Set(prev)
      if (next.has(unitId)) {
        next.delete(unitId)
      } else {
        next.add(unitId)
      }
      return next
    })
  }

  const allCollapsibleCollapsed =
    hierarchyGroups.collapsibleParentIds.length > 0 &&
    hierarchyGroups.collapsibleParentIds.every((id) =>
      collapsedNodeIds.has(id),
    )

  const toggleCollapseAll = () => {
    if (allCollapsibleCollapsed) {
      setCollapsedNodeIds(new Set())
    } else {
      setCollapsedNodeIds(new Set(hierarchyGroups.collapsibleParentIds))
    }
  }

  const resolveDefaultCreateOptions = (): CreateMilitaryUnitDefaults => ({
    historicalCountryId:
      eraFilter !== 'ALL' && eraFilter !== 'MODERN'
        ? eraFilter
        : isHistorical
          ? targetId
          : null,
    administrationDepartmentId:
      deptFilter !== 'ALL' && deptFilter !== 'UNLINKED' ? deptFilter : null,
    branch:
      branchFilter !== 'ALL' && branchFilter !== 'UNSPECIFIED'
        ? branchFilter
        : null,
  })

  const isFocusDetailOnly =
    layoutMode === 'FOCUS' && Boolean(selectedUnitFull)

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    echelonGroupFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    parsedSnapshotYear != null ||
    eraFilter !== 'ALL' ||
    deptFilter !== 'ALL' ||
    branchFilter !== 'ALL'

  const activeEraName =
    eraFilter === 'MODERN'
      ? '현대 직속'
      : isHistorical && eraFilter === targetId
        ? `${country?.name ?? '본국'} 직속`
        : (historicalErasAvailable.find((eraItem) => eraItem.id === eraFilter)
            ?.name ?? null)

  const activeDeptName =
    deptFilter === 'UNLINKED'
      ? '지휘부 미지정'
      : (commandDepartments.find((deptItem) => deptItem.id === deptFilter)
          ?.name ?? null)

  const activeBranchName =
    branchFilter === 'UNSPECIFIED'
      ? '군종 미지정'
      : (BRANCH_LABELS[branchFilter] ?? null)

  const renderTreeNode = (
    unitItem: ExtendedMilitaryUnit,
    depth: number,
    visitedIds: Set<string>,
  ) => {
    if (visitedIds.has(unitItem.id)) return null
    const nextVisited = new Set(visitedIds)
    nextVisited.add(unitItem.id)

    const children =
      hierarchyGroups.childrenByParentId.get(unitItem.id) ?? []
    const hasChildren = children.length > 0
    const isCollapsed = collapsedNodeIds.has(unitItem.id)
    const isSelected = selectedUnitId === unitItem.id
    const periodLabel = formatUnitCompactPeriod(unitItem)

    const firstTenure = unitItem.tenures?.[0]
    const leadCommander = unitItem.commanders?.[0]
    const leadCommanderName = firstTenure?.person
      ? getPersonDisplayName({
          name: firstTenure.person.name ?? '',
          surname: firstTenure.person.surname ?? undefined,
          middleName: firstTenure.person.middleName ?? undefined,
          country: firstTenure.person.country ?? undefined,
        }) || firstTenure.person.name
      : leadCommander?.person
        ? getPersonDisplayName({
            name: leadCommander.person.name ?? '',
            surname: leadCommander.person.surname ?? undefined,
          }) || leadCommander.person.name
        : null
    const leadCommanderRank =
      firstTenure?.rankTitle ?? leadCommander?.rank ?? null
    const totalCommandersCount =
      (unitItem.tenures?.length ?? 0) +
      (unitItem.commanders?.filter((cmd) => !cmd.tenureId).length ?? 0)
    const battleCount = unitItem.sideDeployedUnits?.length ?? 0

    const metaTextParts: string[] = []
    if (periodLabel) metaTextParts.push(periodLabel)
    if (unitItem.branch) {
      metaTextParts.push(BRANCH_LABELS[unitItem.branch] ?? unitItem.branch)
    }
    if (
      (!isHistorical || unitItem.historicalCountryId !== targetId) &&
      unitItem.historicalCountry?.name
    ) {
      metaTextParts.push(unitItem.historicalCountry.name)
    }

    return (
      <div key={unitItem.id} style={{ minWidth: 0 }}>
        <TreeRow
          $selected={isSelected}
          $depth={depth}
          onClick={() => selectUnit(unitItem.id)}
        >
          <TreeCaretSlot>
            {hasChildren ? (
              <CollapseToggleBtn
                type="button"
                aria-expanded={!isCollapsed}
                aria-label={isCollapsed ? '예하 부대 펼치기' : '예하 부대 접기'}
                onClick={(event) => {
                  event.stopPropagation()
                  toggleNodeCollapse(unitItem.id)
                }}
              >
                {isCollapsed ? (
                  <FiChevronRight size={14} />
                ) : (
                  <FiChevronDown size={14} />
                )}
              </CollapseToggleBtn>
            ) : (
              <TreeLeafDot $selected={isSelected} />
            )}
          </TreeCaretSlot>

          <TreeMainBtn type="button" onClick={() => selectUnit(unitItem.id)}>
            <UnitEmblemThumb unitItem={unitItem} size={28} isDark={isDark} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <TreeTitleLine $selected={isSelected}>
                <span>{unitItem.name}</span>
                {unitItem.abbreviation?.trim() ? (
                  <TreeAbbrSpan>
                    ({unitItem.abbreviation.trim()})
                  </TreeAbbrSpan>
                ) : null}
                {unitItem.nickname?.trim() ? (
                  <TreeNicknameSpan>
                    &ldquo;{unitItem.nickname.trim()}&rdquo;
                  </TreeNicknameSpan>
                ) : null}
                {unitItem.unitType ? (
                  <EchelonMiniBadge $echelon={unitItem.unitType}>
                    {UNIT_TYPE_LABELS[unitItem.unitType] ?? unitItem.unitType}
                  </EchelonMiniBadge>
                ) : null}
                {unitItem.isActive === false ? (
                  <TreeDisbandedBadge>해체</TreeDisbandedBadge>
                ) : null}
              </TreeTitleLine>

              <TreeMetaStrip>
                {metaTextParts.length > 0 ? (
                  <TreeLifespanSpan>
                    {metaTextParts.join(' · ')}
                  </TreeLifespanSpan>
                ) : null}
                {leadCommanderName ? (
                  <TreeCommanderBadge>
                    <FiUser size={10} />
                    {leadCommanderRank ? `${leadCommanderRank} ` : ''}
                    {leadCommanderName}
                    {totalCommandersCount > 1
                      ? ` 외 ${totalCommandersCount - 1}`
                      : ''}
                  </TreeCommanderBadge>
                ) : null}
                {hasChildren ? (
                  <TreeCountHint>예하 {children.length}</TreeCountHint>
                ) : null}
                {battleCount > 0 ? (
                  <TreeBattleBadge>
                    <FiCompass size={10} />
                    참전 {battleCount}
                  </TreeBattleBadge>
                ) : null}
              </TreeMetaStrip>
            </div>
          </TreeMainBtn>

          <TreeRowActionCluster
            onClick={(clickEvent) => clickEvent.stopPropagation()}
          >
            <TreeAddSubBtn
              type="button"
              title={`${unitItem.name} 산하에 예하 부대 추가`}
              onClick={() => {
                onCreateUnit({
                  parentUnitId: unitItem.id,
                  administrationDepartmentId:
                    unitItem.administrationDepartmentId ??
                    unitItem.administrationDepartment?.id ??
                    resolveEffectiveDepartment(unitItem)?.id ??
                    null,
                  historicalCountryId: unitItem.historicalCountryId ?? null,
                  branch: unitItem.branch ?? null,
                })
              }}
            >
              <FiPlus size={11} />
              예하
            </TreeAddSubBtn>
            <TreeEditIconBtn
              type="button"
              title={`${unitItem.name} 정보 수정`}
              aria-label={`${unitItem.name} 정보 수정`}
              onClick={() => onEditUnit(unitItem.id)}
            >
              <FiEdit2 size={11.5} />
            </TreeEditIconBtn>
          </TreeRowActionCluster>
        </TreeRow>

        {hasChildren && !isCollapsed ? (
          <TreeChildrenGroup>
            {children.map((childUnit) =>
              renderTreeNode(childUnit, depth + 1, nextVisited),
            )}
          </TreeChildrenGroup>
        ) : null}
      </div>
    )
  }

  const renderDetailView = (unitFull: ExtendedMilitaryUnit) => {
    const estDateStr = formatUnitFullDate(
      unitFull.established,
      unitFull.establishedDate,
    )
    const disDateStr = formatUnitFullDate(
      unitFull.disbanded,
      unitFull.disbandedDate,
    )
    const isDisbanded = unitFull.isActive === false || Boolean(disDateStr)

    const dateBits: string[] = []
    if (estDateStr) dateBits.push(`창설 ${estDateStr}`)
    if (disDateStr) dateBits.push(`해체 ${disDateStr}`)

    const subNameBits = [
      unitFull.nameLocal?.trim(),
      unitFull.nameEn?.trim(),
    ].filter(Boolean)

    const effDept =
      unitFull.administrationDepartment ?? resolveEffectiveDepartment(unitFull)
    const isInheritedDept =
      !unitFull.administrationDepartment?.id && Boolean(effDept?.id)

    const parentUnitRef = unitFull.parentUnit
      ? unitFull.parentUnit
      : unitFull.parentUnitId
        ? (unitByIdMap.get(unitFull.parentUnitId) ?? null)
        : null

    const subUnitsList =
      unitFull.subUnits && unitFull.subUnits.length > 0
        ? unitFull.subUnits
        : countryUnits.filter((candidate) => candidate.parentUnitId === unitFull.id)

    const predecessors = unitFull.predecessors ?? []
    const successors = unitFull.successors ?? []

    const hasRelationsMatrix = Boolean(
      effDept ||
        parentUnitRef ||
        subUnitsList.length > 0 ||
        predecessors.length > 0 ||
        successors.length > 0,
    )

    const hasStructuredSpecs = Boolean(
      unitFull.garrison?.trim() ||
        unitFull.strength?.trim() ||
        unitFull.primaryMission?.trim() ||
        unitFull.jurisdiction?.trim() ||
        unitFull.notableBattles?.trim() ||
        unitFull.honors?.trim(),
    )

    const unifiedTenures = unitFull.tenures ?? []
    const legacyOnlyCommanders = (unitFull.commanders ?? []).filter(
      (cmdItem) => !cmdItem.tenureId,
    )
    const totalCommandersCount =
      unifiedTenures.length + legacyOnlyCommanders.length

    const normalizedCmdQuery = commanderSearch.trim().toLowerCase()
    const matchedTenures = normalizedCmdQuery
      ? unifiedTenures.filter((tenureItem) => {
          const personLabel = tenureItem.person
            ? getPersonDisplayName({
                name: tenureItem.person.name ?? '',
                surname: tenureItem.person.surname ?? undefined,
                middleName: tenureItem.person.middleName ?? undefined,
                country: tenureItem.person.country ?? undefined,
              }) || tenureItem.person.name
            : ''
          const roleLabel =
            tenureItem.title ?? tenureItem.positionDefinition?.title ?? ''
          const rankLabel = tenureItem.rankTitle ?? ''
          return [personLabel, roleLabel, rankLabel].some((txt) =>
            txt.toLowerCase().includes(normalizedCmdQuery),
          )
        })
      : unifiedTenures

    const sortDir = commanderSortOrder === 'asc' ? 1 : -1
    const filteredTenures = [...matchedTenures].sort((left, right) => {
      const leftKey = getCommanderChronologyKey(left)
      const rightKey = getCommanderChronologyKey(right)
      if (leftKey !== rightKey) return (leftKey - rightKey) * sortDir
      return ((left.ordinal ?? 0) - (right.ordinal ?? 0)) * sortDir
    })

    const filteredLegacyCommanders = normalizedCmdQuery
      ? legacyOnlyCommanders.filter((cmdItem) => {
          const personLabel = cmdItem.person
            ? getPersonDisplayName({
                name: cmdItem.person.name ?? '',
                surname: cmdItem.person.surname ?? undefined,
              }) || cmdItem.person.name
            : ''
          return [personLabel, cmdItem.role ?? '', cmdItem.rank ?? ''].some(
            (txt) => txt.toLowerCase().includes(normalizedCmdQuery),
          )
        })
      : legacyOnlyCommanders

    const visibleTenures =
      expandedAllCommanders || Boolean(normalizedCmdQuery)
        ? filteredTenures
        : filteredTenures.slice(0, INITIAL_VISIBLE_COMMANDERS)
    const hiddenTenuresCount = filteredTenures.length - visibleTenures.length

    const directiveEvents = unitFull.eventRelations ?? []
    const combatDeployments = unitFull.sideDeployedUnits ?? []

    return (
      <DetailS.DetailRoot>
        {/* 1. 상단 브레드크럼 & 액션 툴바 */}
        <DetailS.DeptDetailTopBar>
          <DetailS.DeptDetailTopLeft>
            <DetailS.DeptDetailBackBtn
              type="button"
              onClick={() => selectUnit(null)}
            >
              <FiChevronLeft size={13} />
              {layoutMode === 'SPLIT' ? '선택 해제' : '부대 목록'}
            </DetailS.DeptDetailBackBtn>
            <DetailS.DeptBreadcrumbSep>/</DetailS.DeptBreadcrumbSep>
            <DetailS.DeptCrumbTitle title={unitFull.name}>
              {unitFull.name}
            </DetailS.DeptCrumbTitle>
          </DetailS.DeptDetailTopLeft>

          <DetailS.DeptDetailTopBarRight>
            <DetailS.DeptDetailActionsGroup
              role="group"
              aria-label="부대 편집 및 관리"
            >
              <DetailS.DeptTopGhostBtn
                onClick={() =>
                  onCreateUnit({
                    parentUnitId: unitFull.id,
                    administrationDepartmentId:
                      unitFull.administrationDepartmentId ??
                      unitFull.administrationDepartment?.id ??
                      effDept?.id ??
                      null,
                    historicalCountryId: unitFull.historicalCountryId ?? null,
                    branch: unitFull.branch ?? null,
                  })
                }
              >
                <FiPlus size={13} />
                예하 추가
              </DetailS.DeptTopGhostBtn>
              <DetailS.DeptTopTealBtn
                onClick={() => {
                  setEditingTenure(null)
                  setAppointmentOpen(true)
                }}
              >
                <FiUser size={13} />
                지휘관 임명
              </DetailS.DeptTopTealBtn>
              <DetailS.DeptTopGhostLink
                to={pathKeys.militaryUnitDetail(unitFull.id)}
                title="전력 타임라인 페이지에서 전체 상세 보기"
              >
                <FiExternalLink size={13} />
                전력 타임라인
              </DetailS.DeptTopGhostLink>
              <DetailS.DeptTopEditBtn onClick={() => onEditUnit(unitFull.id)}>
                <FiEdit2 size={13} />
                수정
              </DetailS.DeptTopEditBtn>
              <DetailS.DeptTopDeleteBtn
                onClick={() => void handleDelete(unitFull)}
              >
                <FiTrash2 size={13} />
                삭제
              </DetailS.DeptTopDeleteBtn>
            </DetailS.DeptDetailActionsGroup>
          </DetailS.DeptDetailTopBarRight>
        </DetailS.DeptDetailTopBar>

        {/* 2. 가로형 사령부·부대 아이덴티티 카드 */}
        <DetailS.DeptIdentityCard>
          <DetailS.DeptIdentityMain>
            <DetailS.DeptEmblemFrame $isDefense>
              {unitFull.insigniaUrl ? (
                <img
                  src={getUploadImageUrl(unitFull.insigniaUrl)}
                  alt={`${unitFull.name} 휘장`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  onError={(imgEvent) => {
                    imgEvent.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                renderUnitBranchIcon(unitFull.branch, unitFull.unitType, 26)
              )}
            </DetailS.DeptEmblemFrame>

            <DetailS.DeptIdentityBody>
              <DetailS.DeptBadgeStrip>
                <DetailS.DeptStatusBadge $abolished={isDisbanded}>
                  <DetailS.DeptStatusDot $abolished={isDisbanded} />
                  {isDisbanded ? '해체·개편' : '운용 중'}
                </DetailS.DeptStatusBadge>
                {unitFull.historicalCountry?.name ? (
                  <DetailS.DeptCategoryBadge>
                    {unitFull.historicalCountry.name}
                  </DetailS.DeptCategoryBadge>
                ) : null}
                {unitFull.unitType ? (
                  <EchelonMiniBadge $echelon={unitFull.unitType}>
                    {UNIT_TYPE_LABELS[unitFull.unitType] ?? unitFull.unitType}
                  </EchelonMiniBadge>
                ) : null}
                {unitFull.branch ? (
                  <DetailS.DefenseBadge>
                    <FiShield size={11} aria-hidden />
                    {BRANCH_LABELS[unitFull.branch] ?? unitFull.branch}
                  </DetailS.DefenseBadge>
                ) : null}
              </DetailS.DeptBadgeStrip>

              <DetailS.DeptProfileName>
                {unitFull.name}
                {unitFull.abbreviation?.trim() ? (
                  <DetailS.DeptAbbrSpan>
                    ({unitFull.abbreviation.trim()})
                  </DetailS.DeptAbbrSpan>
                ) : null}
                {unitFull.nickname?.trim() ? (
                  <DetailNicknameSpan>
                    &ldquo;{unitFull.nickname.trim()}&rdquo;
                  </DetailNicknameSpan>
                ) : null}
              </DetailS.DeptProfileName>

              <DetailS.DeptSubMetaRow>
                {subNameBits.length > 0 ? (
                  <DetailS.DeptPosBadge>
                    {subNameBits.join(' · ')}
                  </DetailS.DeptPosBadge>
                ) : null}
                {unitFull.motto?.trim() ? (
                  <DetailMottoSpan>
                    &ldquo;{unitFull.motto.trim()}&rdquo;
                  </DetailMottoSpan>
                ) : null}
                <DetailS.DeptTenureDates>
                  <FiCalendar size={11} />
                  {dateBits.length > 0
                    ? dateBits.join(' · ')
                    : '창설·해체일 미등록'}
                </DetailS.DeptTenureDates>
              </DetailS.DeptSubMetaRow>
            </DetailS.DeptIdentityBody>
          </DetailS.DeptIdentityMain>

          {/* 3. 지휘 계통 · 상하 편제 · 개편 계보 매트릭스 */}
          {hasRelationsMatrix ? (
            <DetailS.DeptRelationsMatrix>
              {effDept ? (
                <DetailS.DeptRelationRow>
                  <DetailS.UnitsLabel>소관 부처</DetailS.UnitsLabel>
                  <DetailS.UnitsChipList>
                    <DetailS.UnitChip
                      $tone="military"
                      role={onNavigateToDepartment ? 'button' : undefined}
                      tabIndex={onNavigateToDepartment ? 0 : undefined}
                      onClick={() => onNavigateToDepartment?.(effDept.id)}
                      onKeyDown={(keyEvent) => {
                        if (
                          !onNavigateToDepartment ||
                          (keyEvent.key !== 'Enter' && keyEvent.key !== ' ')
                        ) {
                          return
                        }
                        keyEvent.preventDefault()
                        onNavigateToDepartment(effDept.id)
                      }}
                      style={{
                        cursor: onNavigateToDepartment ? 'pointer' : undefined,
                      }}
                    >
                      <FiShield size={11} />
                      {effDept.name}
                      {effDept.abbreviation ? ` (${effDept.abbreviation})` : ''}
                      {isInheritedDept ? (
                        <span style={{ opacity: 0.72, fontWeight: 500 }}>
                          · 상위 사령부 경유
                        </span>
                      ) : null}
                    </DetailS.UnitChip>
                  </DetailS.UnitsChipList>
                </DetailS.DeptRelationRow>
              ) : null}

              {(parentUnitRef || subUnitsList.length > 0) && (
                <DetailS.DeptRelationRow>
                  <DetailS.UnitsLabel>상하 편제</DetailS.UnitsLabel>
                  <DetailS.UnitsChipList>
                    {parentUnitRef ? (
                      <DetailS.UnitChip
                        role="button"
                        tabIndex={0}
                        onClick={() => selectUnit(parentUnitRef.id)}
                        onKeyDown={(keyEvent) => {
                          if (
                            keyEvent.key !== 'Enter' &&
                            keyEvent.key !== ' '
                          ) {
                            return
                          }
                          keyEvent.preventDefault()
                          selectUnit(parentUnitRef.id)
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <span style={{ opacity: 0.65, fontWeight: 500 }}>
                          상위
                        </span>
                        {parentUnitRef.name}
                        {parentUnitRef.abbreviation
                          ? ` (${parentUnitRef.abbreviation})`
                          : ''}
                        {parentUnitRef.unitType ? (
                          <span style={{ opacity: 0.72, fontWeight: 500 }}>
                            ·{' '}
                            {UNIT_TYPE_LABELS[
                              parentUnitRef.unitType as MilitaryUnitType
                            ] ?? parentUnitRef.unitType}
                          </span>
                        ) : null}
                      </DetailS.UnitChip>
                    ) : null}
                    {subUnitsList.map((subItem) => (
                      <DetailS.UnitChip
                        key={`sub-${subItem.id}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => selectUnit(subItem.id)}
                        onKeyDown={(keyEvent) => {
                          if (
                            keyEvent.key !== 'Enter' &&
                            keyEvent.key !== ' '
                          ) {
                            return
                          }
                          keyEvent.preventDefault()
                          selectUnit(subItem.id)
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <span style={{ opacity: 0.65, fontWeight: 500 }}>
                          예하
                        </span>
                        {subItem.name}
                        {subItem.abbreviation
                          ? ` (${subItem.abbreviation})`
                          : ''}
                        {subItem.unitType ? (
                          <span style={{ opacity: 0.72, fontWeight: 500 }}>
                            ·{' '}
                            {UNIT_TYPE_LABELS[
                              subItem.unitType as MilitaryUnitType
                            ] ?? subItem.unitType}
                          </span>
                        ) : null}
                      </DetailS.UnitChip>
                    ))}
                  </DetailS.UnitsChipList>
                </DetailS.DeptRelationRow>
              )}

              {(predecessors.length > 0 || successors.length > 0) && (
                <DetailS.DeptRelationRow>
                  <DetailS.UnitsLabel>개편 계보</DetailS.UnitsLabel>
                  <DetailS.UnitsChipList>
                    {predecessors.map((predItem) => {
                      const kindKo = predItem.kind
                        ? TRANSITION_KIND_LABEL_KO[predItem.kind]
                        : null
                      const yearStr = formatTransitionYearLabel(predItem)
                      const metaSuffix = [
                        kindKo,
                        yearStr ? `(${yearStr})` : null,
                      ]
                        .filter(Boolean)
                        .join(' ')

                      if (
                        predItem.targetType === 'DEPARTMENT' &&
                        predItem.department
                      ) {
                        return (
                          <DetailS.UnitChip
                            key={`pred-dept-${predItem.transitionId}`}
                            $tone="military"
                            title={
                              predItem.note ?? '전신 행정부처 상세로 이동'
                            }
                            role={onNavigateToDepartment ? 'button' : undefined}
                            tabIndex={onNavigateToDepartment ? 0 : undefined}
                            onClick={() =>
                              onNavigateToDepartment?.(predItem.department!.id)
                            }
                            style={{
                              cursor: onNavigateToDepartment
                                ? 'pointer'
                                : undefined,
                            }}
                          >
                            <span style={{ opacity: 0.7, fontWeight: 500 }}>
                              전신 부처
                            </span>
                            {predItem.department.name}
                            {metaSuffix ? (
                              <span style={{ opacity: 0.75, fontWeight: 500 }}>
                                · {metaSuffix}
                              </span>
                            ) : null}
                          </DetailS.UnitChip>
                        )
                      }
                      if (predItem.unit) {
                        return (
                          <DetailS.UnitChip
                            key={`pred-unit-${predItem.transitionId}`}
                            title={predItem.note ?? undefined}
                            role="button"
                            tabIndex={0}
                            onClick={() => selectUnit(predItem.unit!.id)}
                            style={{ cursor: 'pointer' }}
                          >
                            <span style={{ opacity: 0.65, fontWeight: 500 }}>
                              전신
                            </span>
                            {predItem.unit.name}
                            {metaSuffix ? (
                              <span style={{ opacity: 0.72, fontWeight: 500 }}>
                                · {metaSuffix}
                              </span>
                            ) : null}
                          </DetailS.UnitChip>
                        )
                      }
                      return null
                    })}

                    {successors.map((succItem) => {
                      if (!succItem.unit) return null
                      const kindKo = succItem.kind
                        ? TRANSITION_KIND_LABEL_KO[succItem.kind]
                        : null
                      const yearStr = formatTransitionYearLabel(succItem)
                      const metaSuffix = [
                        kindKo,
                        yearStr ? `(${yearStr})` : null,
                      ]
                        .filter(Boolean)
                        .join(' ')
                      return (
                        <DetailS.UnitChip
                          key={`succ-unit-${succItem.transitionId}`}
                          title={succItem.note ?? undefined}
                          role="button"
                          tabIndex={0}
                          onClick={() => selectUnit(succItem.unit!.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <span style={{ opacity: 0.65, fontWeight: 500 }}>
                            후신
                          </span>
                          {succItem.unit.name}
                          {metaSuffix ? (
                            <span style={{ opacity: 0.72, fontWeight: 500 }}>
                              · {metaSuffix}
                            </span>
                          ) : null}
                        </DetailS.UnitChip>
                      )
                    })}
                  </DetailS.UnitsChipList>
                </DetailS.DeptRelationRow>
              )}
            </DetailS.DeptRelationsMatrix>
          ) : null}
        </DetailS.DeptIdentityCard>

        {/* 4. 주요 제원 · 임무 · 관할 매트릭스 */}
        {hasStructuredSpecs ? (
          <DetailS.MetaGrid>
            {unitFull.garrison?.trim() ? (
              <DetailS.MetaPanel>
                <DetailS.MetaPanelLabel>본부·주둔지</DetailS.MetaPanelLabel>
                <DetailS.MetaPanelBody>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <FiMapPin size={12} style={{ opacity: 0.7 }} />
                    {unitFull.garrison.trim()}
                  </span>
                </DetailS.MetaPanelBody>
              </DetailS.MetaPanel>
            ) : null}
            {unitFull.strength?.trim() ? (
              <DetailS.MetaPanel>
                <DetailS.MetaPanelLabel>병력 규모·정원</DetailS.MetaPanelLabel>
                <DetailS.MetaPanelBody>
                  {unitFull.strength.trim()}
                </DetailS.MetaPanelBody>
              </DetailS.MetaPanel>
            ) : null}
            {unitFull.primaryMission?.trim() ? (
              <DetailS.MetaPanel>
                <DetailS.MetaPanelLabel>주요 임무</DetailS.MetaPanelLabel>
                <DetailS.MetaPanelBody>
                  {unitFull.primaryMission.trim()}
                </DetailS.MetaPanelBody>
              </DetailS.MetaPanel>
            ) : null}
            {unitFull.jurisdiction?.trim() ? (
              <DetailS.MetaPanel>
                <DetailS.MetaPanelLabel>작전 관할 구역</DetailS.MetaPanelLabel>
                <DetailS.MetaPanelBody>
                  {unitFull.jurisdiction.trim()}
                </DetailS.MetaPanelBody>
              </DetailS.MetaPanel>
            ) : null}
            {unitFull.notableBattles?.trim() ? (
              <DetailS.MetaPanel>
                <DetailS.MetaPanelLabel>주요 참전·작전</DetailS.MetaPanelLabel>
                <DetailS.MetaPanelBody>
                  {unitFull.notableBattles.trim()}
                </DetailS.MetaPanelBody>
              </DetailS.MetaPanel>
            ) : null}
            {unitFull.honors?.trim() ? (
              <DetailS.MetaPanel>
                <DetailS.MetaPanelLabel>부대 표창·훈장</DetailS.MetaPanelLabel>
                <DetailS.MetaPanelBody>
                  {unitFull.honors.trim()}
                </DetailS.MetaPanelBody>
              </DetailS.MetaPanel>
            ) : null}
          </DetailS.MetaGrid>
        ) : null}

        {unitFull.description?.trim() ? (
          <DetailS.DeptInfoSection>
            <DetailS.DeptInfoSectionTitle>
              <DetailS.DeptInfoDot $color="#0d9488" />
              사령부·부대 개요
            </DetailS.DeptInfoSectionTitle>
            <DetailS.DeptInfoText>
              {unitFull.description.trim()}
            </DetailS.DeptInfoText>
          </DetailS.DeptInfoSection>
        ) : null}

        {/* 5. 역대 지휘관 · 참모 원장 섹션 */}
        <LedgerBlockSection>
          <LedgerBlockHeader>
            <LedgerBlockHeaderLeft>
              <LedgerBlockTitle>역대 지휘관 · 참모</LedgerBlockTitle>
              <LedgerCountPill>{totalCommandersCount}</LedgerCountPill>
              {unifiedTenures.length > 1 ? (
                <MiniSortToggleBtn
                  type="button"
                  onClick={() =>
                    setCommanderSortOrder((prev) =>
                      prev === 'asc' ? 'desc' : 'asc',
                    )
                  }
                  title={
                    commanderSortOrder === 'asc'
                      ? '현재 과거순 정렬 (클릭하여 최신순 전환)'
                      : '현재 최신순 정렬 (클릭하여 과거순 전환)'
                  }
                >
                  {commanderSortOrder === 'asc' ? (
                    <>
                      <FiArrowUp size={11} />
                      과거순
                    </>
                  ) : (
                    <>
                      <FiArrowDown size={11} />
                      최신순
                    </>
                  )}
                </MiniSortToggleBtn>
              ) : null}
            </LedgerBlockHeaderLeft>

            <LedgerBlockHeaderRight>
              {totalCommandersCount > 5 ? (
                <InlineMiniSearchWrap>
                  <FiSearch
                    size={12}
                    style={{
                      position: 'absolute',
                      left: 8,
                      color: tokens.textFaint,
                      pointerEvents: 'none',
                    }}
                  />
                  <InlineMiniSearchInput
                    type="text"
                    value={commanderSearch}
                    onChange={(event) => setCommanderSearch(event.target.value)}
                    placeholder="인물·직책·계급 검색"
                    aria-label="부대 역대 지휘관 검색"
                  />
                  {commanderSearch ? (
                    <InlineMiniClearBtn
                      type="button"
                      onClick={() => setCommanderSearch('')}
                      aria-label="검색 지우기"
                    >
                      <FiX size={11} />
                    </InlineMiniClearBtn>
                  ) : null}
                </InlineMiniSearchWrap>
              ) : null}

              <OutlineActionBtn
                type="button"
                onClick={() => {
                  setEditingTenure(null)
                  setAppointmentOpen(true)
                }}
              >
                + 지휘관·참모 임명
              </OutlineActionBtn>
            </LedgerBlockHeaderRight>
          </LedgerBlockHeader>

          {totalCommandersCount === 0 ? (
            <LedgerEmptyHint>
              등록된 지휘관·참모 재임 기록이 없습니다. 우측 상단 &lsquo;+
              지휘관·참모 임명&rsquo;으로 인물을 임명하면 인물 페이지 경력과
              자동 연동됩니다.
            </LedgerEmptyHint>
          ) : visibleTenures.length === 0 &&
            filteredLegacyCommanders.length === 0 ? (
            <LedgerEmptyHint>
              검색 조건에 일치하는 지휘관·참모 기록이 없습니다.
            </LedgerEmptyHint>
          ) : (
            <>
              <LedgerRowList>
                {visibleTenures.map((tenureItem, idx) => {
                  const targetPersonId =
                    tenureItem.person?.id ?? tenureItem.personId
                  const personName = tenureItem.person
                    ? getPersonDisplayName({
                        name: tenureItem.person.name ?? '',
                        surname: tenureItem.person.surname ?? undefined,
                        middleName: tenureItem.person.middleName ?? undefined,
                        country: tenureItem.person.country ?? undefined,
                      }) || tenureItem.person.name
                    : '인물 미상'
                  const roleText =
                    tenureItem.title ??
                    tenureItem.positionDefinition?.title ??
                    '지휘관'
                  const startStr = formatTenureDatePart(
                    tenureItem.startEra,
                    tenureItem.startYear,
                    tenureItem.startMonth,
                    tenureItem.startDay,
                    tenureItem.startDate,
                  )
                  const endStr = formatTenureDatePart(
                    tenureItem.endEra,
                    tenureItem.endYear,
                    tenureItem.endMonth,
                    tenureItem.endDay,
                    tenureItem.endDate,
                  )
                  return (
                    <LedgerListItem key={tenureItem.id} $first={idx === 0}>
                      {tenureItem.ordinal != null ? (
                        <OrdinalPill>제{tenureItem.ordinal}대</OrdinalPill>
                      ) : null}
                      {targetPersonId ? (
                        <PersonJumpBtn
                          type="button"
                          onClick={() => setInspectPersonId(targetPersonId)}
                          title={`${personName} 인물 요약 보기`}
                        >
                          {personName}
                        </PersonJumpBtn>
                      ) : (
                        <span style={{ fontWeight: 700 }}>{personName}</span>
                      )}
                      <RoleLabelSpan>{roleText}</RoleLabelSpan>
                      {tenureItem.rankTitle ? (
                        <NeutralChip>{tenureItem.rankTitle}</NeutralChip>
                      ) : null}
                      {tenureItem.party ? (
                        <PartyChip $color={tenureItem.party.brandColor}>
                          {tenureItem.party.shortName || tenureItem.party.name}
                        </PartyChip>
                      ) : null}
                      {(startStr || endStr) && (
                        <TenureDateSpan>
                          {startStr || '?'} – {endStr || '재임·미상'}
                        </TenureDateSpan>
                      )}
                      <RowRightActions>
                        <RowMiniBtn
                          type="button"
                          onClick={() => setEditingTenure(tenureItem)}
                        >
                          수정
                        </RowMiniBtn>
                        <RowMiniBtn
                          type="button"
                          $danger
                          onClick={() =>
                            void handleDeleteCommanderTenure(tenureItem)
                          }
                        >
                          삭제
                        </RowMiniBtn>
                      </RowRightActions>
                    </LedgerListItem>
                  )
                })}

                {filteredLegacyCommanders.map((cmdItem, idx) => {
                  const personName = cmdItem.person
                    ? getPersonDisplayName({
                        name: cmdItem.person.name ?? '',
                        surname: cmdItem.person.surname ?? undefined,
                      }) || cmdItem.person.name
                    : '인물 미상'
                  const startStr = cmdItem.startDate
                    ? cmdItem.startDate.slice(0, 10).replace(/-/g, '.')
                    : ''
                  const endStr = cmdItem.endDate
                    ? cmdItem.endDate.slice(0, 10).replace(/-/g, '.')
                    : cmdItem.isCurrent
                      ? '현재'
                      : ''
                  return (
                    <LedgerListItem
                      key={cmdItem.id}
                      $first={visibleTenures.length === 0 && idx === 0}
                    >
                      {cmdItem.termNumber != null ? (
                        <OrdinalPill>제{cmdItem.termNumber}대</OrdinalPill>
                      ) : null}
                      <PersonJumpBtn
                        type="button"
                        onClick={() => setInspectPersonId(cmdItem.personId)}
                        title={`${personName} 인물 요약 보기`}
                      >
                        {personName}
                      </PersonJumpBtn>
                      {cmdItem.role ? (
                        <RoleLabelSpan>{cmdItem.role}</RoleLabelSpan>
                      ) : null}
                      {cmdItem.rank ? (
                        <NeutralChip>{cmdItem.rank}</NeutralChip>
                      ) : null}
                      {(startStr || endStr) && (
                        <TenureDateSpan>
                          {startStr}
                          {startStr && endStr ? ' – ' : ''}
                          {endStr}
                        </TenureDateSpan>
                      )}
                    </LedgerListItem>
                  )
                })}
              </LedgerRowList>

              {(hiddenTenuresCount > 0 ||
                (expandedAllCommanders &&
                  filteredTenures.length > INITIAL_VISIBLE_COMMANDERS)) && (
                <div style={{ marginTop: 8 }}>
                  <ExpandListBtn
                    type="button"
                    onClick={() =>
                      setExpandedAllCommanders((prevVal) => !prevVal)
                    }
                  >
                    {expandedAllCommanders
                      ? `접기 (상위 ${INITIAL_VISIBLE_COMMANDERS}명만 표시)`
                      : `전체 ${filteredTenures.length}명 모두 보기 (+${hiddenTenuresCount}명)`}
                  </ExpandListBtn>
                </div>
              )}
            </>
          )}
        </LedgerBlockSection>

        {/* 6. 지령 · 작전 관여 사건 원장 섹션 */}
        <LedgerBlockSection>
          <LedgerBlockHeader>
            <LedgerBlockHeaderLeft>
              <LedgerBlockTitle>지령 · 작전 관여 사건</LedgerBlockTitle>
              <LedgerCountPill>{directiveEvents.length}</LedgerCountPill>
            </LedgerBlockHeaderLeft>
            {!pendingEvent && !editingEventLink ? (
              <OutlineActionBtn
                type="button"
                onClick={() => setEventPickerOpen(true)}
              >
                + 지령·사건 연결
              </OutlineActionBtn>
            ) : null}
          </LedgerBlockHeader>

          {pendingEvent ? (
            <EventDraftPanel>
              <EventDraftTitle>
                연결할 사건: {pendingEvent.title}
              </EventDraftTitle>
              <EventRolePillRow>
                {EVENT_ROLE_KEYS.map((roleKey) => (
                  <EventRolePillBtn
                    key={roleKey}
                    type="button"
                    $active={eventRole === roleKey}
                    onClick={() => setEventRole(roleKey)}
                  >
                    {EVENT_ROLE_LABEL[roleKey]}
                  </EventRolePillBtn>
                ))}
              </EventRolePillRow>
              <EventDraftInput
                type="text"
                placeholder="역할 설명 (선택 — 예: 총통 지령 제21호 기안·하달, 작전계획 수립)"
                value={eventRoleDesc}
                onChange={(changeEvent) =>
                  setEventRoleDesc(changeEvent.target.value)
                }
              />
              <EventDraftActions>
                <EventDraftSaveBtn
                  type="button"
                  disabled={eventLinkBusy}
                  onClick={() => void handleSaveDirectiveEvent()}
                >
                  {eventLinkBusy ? '연결 중…' : '연결 저장'}
                </EventDraftSaveBtn>
                <EventDraftCancelBtn
                  type="button"
                  disabled={eventLinkBusy}
                  onClick={resetEventLinkForm}
                >
                  취소
                </EventDraftCancelBtn>
              </EventDraftActions>
            </EventDraftPanel>
          ) : null}

          {directiveEvents.length === 0 ? (
            !pendingEvent ? (
              <LedgerEmptyHint>
                지령 하달·수명·작전 총괄로 연결된 사건이 없습니다.
              </LedgerEmptyHint>
            ) : null
          ) : (
            <LedgerRowList>
              {directiveEvents.map((relItem, idx) => {
                const isEditing =
                  editingEventLink?.relationId === relItem.relationId
                const roleKo =
                  EVENT_ROLE_LABEL[
                    relItem.role as AdministrationDepartmentEventRole
                  ] ?? relItem.role
                const dateLabel = formatTenureDatePart(
                  relItem.event.startEra,
                  relItem.event.startYear,
                  relItem.event.startMonth,
                  relItem.event.startDay,
                  null,
                )

                return (
                  <LedgerListItem
                    key={relItem.relationId}
                    $first={idx === 0}
                    style={{
                      flexDirection: isEditing ? 'column' : 'row',
                      alignItems: isEditing ? 'stretch' : 'center',
                    }}
                  >
                    {isEditing ? (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                          width: '100%',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 12.5 }}>
                          {relItem.event.title}
                        </div>
                        <EventRolePillRow>
                          {EVENT_ROLE_KEYS.map((roleKey) => (
                            <EventRolePillBtn
                              key={roleKey}
                              type="button"
                              $active={eventRole === roleKey}
                              onClick={() => setEventRole(roleKey)}
                            >
                              {EVENT_ROLE_LABEL[roleKey]}
                            </EventRolePillBtn>
                          ))}
                        </EventRolePillRow>
                        <EventDraftInput
                          type="text"
                          placeholder="역할 설명"
                          value={eventRoleDesc}
                          onChange={(changeEvent) =>
                            setEventRoleDesc(changeEvent.target.value)
                          }
                        />
                        <EventDraftActions>
                          <EventDraftSaveBtn
                            type="button"
                            disabled={eventLinkBusy}
                            onClick={() => void handleSaveDirectiveEvent()}
                          >
                            {eventLinkBusy ? '저장 중…' : '저장'}
                          </EventDraftSaveBtn>
                          <EventDraftCancelBtn
                            type="button"
                            disabled={eventLinkBusy}
                            onClick={resetEventLinkForm}
                          >
                            취소
                          </EventDraftCancelBtn>
                        </EventDraftActions>
                      </div>
                    ) : (
                      <>
                        <EventRowLink
                          to={pathKeys.events.detail(relItem.event.id)}
                          title={`${relItem.event.title} 사건 상세 보기`}
                        >
                          {relItem.event.title}
                        </EventRowLink>
                        {dateLabel ? (
                          <TenureDateSpan>{dateLabel}</TenureDateSpan>
                        ) : null}
                        <NeutralChip>{roleKo}</NeutralChip>
                        {relItem.roleDescription ? (
                          <RoleDescSpan>
                            · {relItem.roleDescription}
                          </RoleDescSpan>
                        ) : null}
                        <RowRightActions>
                          <RowMiniBtn
                            type="button"
                            onClick={() => {
                              setEditingEventLink(relItem)
                              setPendingEvent(null)
                              setEventRole(
                                (relItem.role as AdministrationDepartmentEventRole) ||
                                  'ISSUER',
                              )
                              setEventRoleDesc(relItem.roleDescription ?? '')
                            }}
                          >
                            역할 수정
                          </RowMiniBtn>
                          <RowMiniBtn
                            type="button"
                            $danger
                            onClick={() =>
                              void handleUnlinkDirectiveEvent(
                                relItem.event.id,
                                relItem.relationId,
                                relItem.event.title,
                              )
                            }
                          >
                            해제
                          </RowMiniBtn>
                        </RowRightActions>
                      </>
                    )}
                  </LedgerListItem>
                )
              })}
            </LedgerRowList>
          )}
        </LedgerBlockSection>

        {/* 7. 참전 사건 · 전투서열 기록 원장 섹션 */}
        <LedgerBlockSection $last>
          <LedgerBlockHeader>
            <LedgerBlockHeaderLeft>
              <LedgerBlockTitle>참전 사건 · 전투서열 기록</LedgerBlockTitle>
              <LedgerCountPill>{combatDeployments.length}</LedgerCountPill>
            </LedgerBlockHeaderLeft>
          </LedgerBlockHeader>

          {combatDeployments.length === 0 ? (
            <LedgerEmptyHint>
              참전(전투서열 투입)으로 연결된 사건이 없습니다.
            </LedgerEmptyHint>
          ) : (
            <LedgerRowList>
              {combatDeployments.map((deployment, idx) => {
                const eventRecord = deployment.side.event
                const startYear = signedYearFromIsoLike(eventRecord.startDate)
                const weaponsList =
                  deployment.deployedWeapons ?? deployment.weaponsUsed ?? []
                const weaponCount = weaponsList.length
                const vectorCount = deployment.mapFeatures?.length ?? 0
                const battleCommanderName = deployment.commander
                  ? getPersonDisplayName({
                      name: deployment.commander.name ?? '',
                      surname: deployment.commander.surname ?? undefined,
                    }) || deployment.commander.name
                  : null
                const roleKo = deployment.role
                  ? (SIDE_UNIT_ROLE_LABEL[
                      deployment.role as keyof typeof SIDE_UNIT_ROLE_LABEL
                    ] ?? deployment.role)
                  : null
                const outcomeKo = deployment.side.outcome
                  ? (SIDE_OUTCOME_LABEL[
                      deployment.side.outcome as keyof typeof SIDE_OUTCOME_LABEL
                    ] ?? deployment.side.outcome)
                  : null

                return (
                  <CombatLedgerItem key={deployment.id} $first={idx === 0}>
                    <CombatTopLine>
                      <CombatTitleGroup>
                        {startYear != null ? (
                          <CombatYearBadge>
                            {formatSignedYear(startYear)}
                          </CombatYearBadge>
                        ) : null}
                        <EventRowLink
                          to={`/events/${eventRecord.id}`}
                          title={`${eventRecord.title} 사건 상세 보기`}
                        >
                          {eventRecord.title}
                        </EventRowLink>
                        <SideTagPill>
                          {deployment.side.color ? (
                            <SideColorDot $color={deployment.side.color} />
                          ) : null}
                          <span>{deployment.side.name}</span>
                          {outcomeKo ? (
                            <span style={{ opacity: 0.75 }}>· {outcomeKo}</span>
                          ) : null}
                        </SideTagPill>
                      </CombatTitleGroup>

                      <SurveyLinkBtn
                        to={`/events/${eventRecord.id}/overview?tab=survey&unit=${unitFull.id}`}
                      >
                        <span>조망·기동선</span>
                        <FiArrowUpRight size={11} />
                      </SurveyLinkBtn>
                    </CombatTopLine>

                    <CombatMetaLine>
                      {roleKo ? <span>임무: {roleKo}</span> : null}
                      {deployment.parentUnit ? (
                        <span>
                          전투 상급부대:{' '}
                          {unitByIdMap.has(deployment.parentUnit.id) ? (
                            <InlineTextBtn
                              type="button"
                              onClick={() =>
                                selectUnit(deployment.parentUnit!.id)
                              }
                            >
                              {deployment.parentUnit.name}
                            </InlineTextBtn>
                          ) : (
                            deployment.parentUnit.name
                          )}
                        </span>
                      ) : null}
                      {battleCommanderName && deployment.commander ? (
                        <span>
                          전투 지휘관:{' '}
                          <InlineTextBtn
                            type="button"
                            onClick={() =>
                              setInspectPersonId(deployment.commander!.id)
                            }
                          >
                            {battleCommanderName}
                          </InlineTextBtn>
                        </span>
                      ) : null}
                      {weaponCount > 0 ? (
                        <span>배속 무기 {weaponCount}종</span>
                      ) : null}
                      {vectorCount > 0 ? (
                        <span>기동 벡터 {vectorCount}개</span>
                      ) : null}
                      {deployment.note ? <span>{deployment.note}</span> : null}
                    </CombatMetaLine>
                  </CombatLedgerItem>
                )
              })}
            </LedgerRowList>
          )}
        </LedgerBlockSection>
      </DetailS.DetailRoot>
    )
  }

  return (
    <>
      <SectionRoot aria-label="군사 조직 및 편제 현황">
        {!isFocusDetailOnly ? (
          <GovToolbarShell>
            <GovToolbarRow>
              <GovPromSearch>
                <FiSearch size={14} aria-hidden />
                <GovPromSearchInput
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="부대·사령부명, 약칭, 별칭, 지휘관, 주둔지 검색…"
                  aria-label="부대 이름 및 지휘관 검색"
                />
                {searchQuery ? (
                  <GovPromSearchClear
                    type="button"
                    aria-label="검색어 지우기"
                    onClick={() => setSearchQuery('')}
                  >
                    <FiX size={12} />
                  </GovPromSearchClear>
                ) : null}
              </GovPromSearch>

              {historicalErasAvailable.length > 0 ? (
                <ToolbarSelect
                  aria-label={isHistorical ? '소속 정치체 필터' : '시대·정체 필터'}
                  value={eraFilter}
                  onChange={(event) => setEraFilter(event.target.value)}
                >
                  <option value="ALL">
                    {isHistorical
                      ? `전체 본국·구성국 (${countryUnits.length})`
                      : `전체 시대 (${countryUnits.length})`}
                  </option>
                  {isHistorical && targetId ? (
                    <option value={targetId}>
                      {country?.name ?? '본국'} 직속 ({directCountryUnitCount})
                    </option>
                  ) : directCountryUnitCount > 0 ? (
                    <option value="MODERN">
                      현대 직속 ({directCountryUnitCount})
                    </option>
                  ) : null}
                  {historicalErasAvailable.map((eraItem) => (
                    <option key={eraItem.id} value={eraItem.id}>
                      {eraItem.name} ({eraItem.count})
                    </option>
                  ))}
                </ToolbarSelect>
              ) : null}

              {commandDepartments.length > 0 ? (
                <ToolbarSelect
                  aria-label="소관 국방·군정부처 필터"
                  value={deptFilter}
                  onChange={(event) => setDeptFilter(event.target.value)}
                >
                  <option value="ALL">
                    전체 지휘부 ({countryUnits.length})
                  </option>
                  {commandDepartments.map((deptItem) => (
                    <option key={deptItem.id} value={deptItem.id}>
                      {deptItem.name}
                      {deptItem.abbreviation
                        ? ` (${deptItem.abbreviation})`
                        : ''}{' '}
                      ({deptItem.count})
                    </option>
                  ))}
                  {unlinkedDeptUnitCount > 0 ? (
                    <option value="UNLINKED">
                      지휘부 미지정 ({unlinkedDeptUnitCount})
                    </option>
                  ) : null}
                </ToolbarSelect>
              ) : null}

              <SnapshotYearWrap title="특정 연도(예: 1941, BC 221)에 존재했던 군부대만 스냅샷 필터링합니다">
                <FiCalendar size={12.5} aria-hidden />
                <SnapshotYearInput
                  type="text"
                  value={snapshotYearInput}
                  onChange={(changeEvt) =>
                    setSnapshotYearInput(changeEvt.target.value)
                  }
                  placeholder="기준 연도 (예: 1941)"
                  aria-label="기준 연도 스냅샷 필터"
                />
                {snapshotYearInput ? (
                  <GovPromSearchClear
                    type="button"
                    aria-label="기준 연도 지우기"
                    onClick={() => setSnapshotYearInput('')}
                  >
                    <FiX size={11} />
                  </GovPromSearchClear>
                ) : null}
              </SnapshotYearWrap>

              <GovToolbarRight>
                <GovViewMeta>
                  표시 <strong>{filteredUnits.length}</strong> · 전체{' '}
                  <strong>{countryUnits.length}</strong>
                </GovViewMeta>

                <GovToolbarDivider />

                <ToolbarSegmentTrack role="group" aria-label="목록 표시 방식">
                  <ToolbarSegmentBtn
                    type="button"
                    $active={browseViewMode === 'TREE'}
                    onClick={() => setBrowseViewMode('TREE')}
                    title="상하 위계 편제 트리 보기"
                  >
                    <FiGitBranch size={12.5} />
                    <span>편제 트리</span>
                  </ToolbarSegmentBtn>
                  <ToolbarSegmentBtn
                    type="button"
                    $active={browseViewMode === 'LEDGER'}
                    onClick={() => setBrowseViewMode('LEDGER')}
                    title="창설·해체일, 제대·군종, 상급 편제·전과 원장 표 보기"
                  >
                    <FiList size={12.5} />
                    <span>원장 표</span>
                  </ToolbarSegmentBtn>
                </ToolbarSegmentTrack>

                <ToolbarSegmentTrack role="group" aria-label="화면 분할 방식">
                  <ToolbarSegmentBtn
                    type="button"
                    $active={layoutMode === 'SPLIT'}
                    onClick={() => setLayoutMode('SPLIT')}
                    title="좌측 목록 · 우측 상세 2단 분할 보기"
                  >
                    <FiColumns size={12.5} />
                    <span>분할</span>
                  </ToolbarSegmentBtn>
                  <ToolbarSegmentBtn
                    type="button"
                    $active={layoutMode === 'FOCUS'}
                    onClick={() => {
                      setLayoutMode('FOCUS')
                      selectUnit(null)
                    }}
                    title="전체 폭 목록 보기 (부대 클릭 시 단독 상세로 전환)"
                  >
                    <FiMaximize2 size={12.5} />
                    <span>전체폭</span>
                  </ToolbarSegmentBtn>
                </ToolbarSegmentTrack>

                <GovPrimaryBtn
                  type="button"
                  onClick={() => onCreateUnit(resolveDefaultCreateOptions())}
                >
                  <FiPlus size={14} />
                  <span>사령부·부대 등록</span>
                </GovPrimaryBtn>
              </GovToolbarRight>
            </GovToolbarRow>

            {hasActiveFilters ? (
              <GovActiveFiltersRow>
                {searchQuery.trim() ? (
                  <GovActiveFilterChip
                    type="button"
                    onClick={() => setSearchQuery('')}
                  >
                    검색: &ldquo;{searchQuery.trim()}&rdquo;
                    <FiX size={11} />
                  </GovActiveFilterChip>
                ) : null}
                {echelonGroupFilter !== 'ALL' ? (
                  <GovActiveFilterChip
                    type="button"
                    onClick={() => setEchelonGroupFilter('ALL')}
                  >
                    제대: {ECHELON_GROUP_LABELS[echelonGroupFilter]}
                    <FiX size={11} />
                  </GovActiveFilterChip>
                ) : null}
                {statusFilter !== 'ALL' ? (
                  <GovActiveFilterChip
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                  >
                    상태: {STATUS_FILTER_LABELS[statusFilter]}
                    <FiX size={11} />
                  </GovActiveFilterChip>
                ) : null}
                {parsedSnapshotYear != null ? (
                  <GovActiveFilterChip
                    type="button"
                    onClick={() => setSnapshotYearInput('')}
                  >
                    기준 연도:{' '}
                    {parsedSnapshotYear < 0
                      ? `BC ${Math.abs(parsedSnapshotYear)}년`
                      : `${parsedSnapshotYear}년`}
                    <FiX size={11} />
                  </GovActiveFilterChip>
                ) : null}
                {eraFilter !== 'ALL' && activeEraName ? (
                  <GovActiveFilterChip
                    type="button"
                    onClick={() => setEraFilter('ALL')}
                  >
                    시대: {activeEraName}
                    <FiX size={11} />
                  </GovActiveFilterChip>
                ) : null}
                {deptFilter !== 'ALL' && activeDeptName ? (
                  <GovActiveFilterChip
                    type="button"
                    onClick={() => setDeptFilter('ALL')}
                  >
                    지휘부: {activeDeptName}
                    <FiX size={11} />
                  </GovActiveFilterChip>
                ) : null}
                {branchFilter !== 'ALL' && activeBranchName ? (
                  <GovActiveFilterChip
                    type="button"
                    onClick={() => setBranchFilter('ALL')}
                  >
                    군종: {activeBranchName}
                    <FiX size={11} />
                  </GovActiveFilterChip>
                ) : null}
                <GovClearFiltersBtn
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setEchelonGroupFilter('ALL')
                    setStatusFilter('ALL')
                    setSnapshotYearInput('')
                    setEraFilter('ALL')
                    setDeptFilter('ALL')
                    setBranchFilter('ALL')
                  }}
                >
                  필터 초기화
                </GovClearFiltersBtn>
              </GovActiveFiltersRow>
            ) : null}
          </GovToolbarShell>
        ) : null}

        {!isFocusDetailOnly ? (
          <UnlinkedCountryTenuresBar
            mode="MILITARY_UNIT"
            effectiveCountryId={targetId || undefined}
            isHistorical={isHistorical}
            targetOptions={countryUnits.map((unitRow) => ({
              id: unitRow.id,
              label: unitRow.historicalCountry?.name
                ? `[${unitRow.historicalCountry.name}] ${unitRow.name}`
                : unitRow.name,
              historicalCountryId: unitRow.historicalCountryId ?? null,
            }))}
            onRequestCreateTarget={(tenureHistCountryId) =>
              onCreateUnit({
                historicalCountryId: tenureHistCountryId,
              })
            }
          />
        ) : null}

        <WorkspaceStage>
          {unitsQuery.isLoading ? (
            <EmptyStateFill>
              <EmptyStateSimple border="solid">불러오는 중…</EmptyStateSimple>
            </EmptyStateFill>
          ) : countryUnits.length === 0 ? (
            <EmptyStateSpotlight
              flat
              icon={<FiShield size={30} strokeWidth={1.75} />}
              title="등록된 군사 사령부·편제가 없습니다"
              description="최고사령부·참모본부·각군 총사령부부터 전구·집단군·야전군·군단·사단·함대까지 첫 군사 편제를 등록해 보세요."
              primaryAction={{
                label: '사령부·부대 등록',
                onClick: () => onCreateUnit(resolveDefaultCreateOptions()),
                icon: <FiPlus size={16} strokeWidth={2.25} />,
              }}
            />
          ) : isFocusDetailOnly && selectedUnitFull ? (
            <GovLedgerPanel>{renderDetailView(selectedUnitFull)}</GovLedgerPanel>
          ) : (
            <WorkspaceStack>
              <SubFilterHeaderRow>
                <BranchNavBar role="tablist" aria-label="군종별 편제 필터">
                  {branchTabs.map((tabItem) => {
                    const active = branchFilter === tabItem.id
                    return (
                      <BranchTabBtn
                        key={tabItem.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        tabIndex={active ? 0 : -1}
                        $active={active}
                        onClick={() => setBranchFilter(tabItem.id)}
                      >
                        <span>{tabItem.label}</span>
                        <BranchCountPill $active={active}>
                          {tabItem.count}
                        </BranchCountPill>
                      </BranchTabBtn>
                    )
                  })}
                </BranchNavBar>

                <SubFilterPillsCluster>
                  <SubFilterSegmentTrack
                    role="group"
                    aria-label="제대 위계 필터"
                  >
                    {(
                      [
                        'ALL',
                        'HIGH_COMMAND',
                        'OPERATIONAL',
                        'TACTICAL',
                      ] as const
                    ).map((groupKey) => (
                      <SubFilterSegmentBtn
                        key={groupKey}
                        type="button"
                        $active={echelonGroupFilter === groupKey}
                        onClick={() => setEchelonGroupFilter(groupKey)}
                      >
                        {ECHELON_GROUP_LABELS[groupKey]}
                      </SubFilterSegmentBtn>
                    ))}
                  </SubFilterSegmentTrack>

                  <SubFilterSegmentTrack
                    role="group"
                    aria-label="운용 상태 필터"
                  >
                    {(['ALL', 'ACTIVE', 'DISBANDED'] as const).map(
                      (statusKey) => (
                        <SubFilterSegmentBtn
                          key={statusKey}
                          type="button"
                          $active={statusFilter === statusKey}
                          onClick={() => setStatusFilter(statusKey)}
                        >
                          {STATUS_FILTER_LABELS[statusKey]}
                        </SubFilterSegmentBtn>
                      ),
                    )}
                  </SubFilterSegmentTrack>
                </SubFilterPillsCluster>
              </SubFilterHeaderRow>

              {filteredUnits.length === 0 ? (
                <EmptyStateSpotlight
                  flat
                  icon={<FiShield size={28} strokeWidth={1.75} />}
                  title="조건에 일치하는 군사 편제가 없습니다"
                  description="선택한 검색어나 제대·군종·시대·연도 조건에 해당하는 사령부·부대가 없습니다. 이 조건으로 새 부대를 등록하거나 필터를 초기화해 보세요."
                  primaryAction={{
                    label: '현재 조건으로 부대 등록',
                    onClick: () => onCreateUnit(resolveDefaultCreateOptions()),
                    icon: <FiPlus size={15} strokeWidth={2.25} />,
                  }}
                />
              ) : layoutMode === 'SPLIT' ? (
                <SplitWorkspaceGrid $ledgerView={browseViewMode === 'LEDGER'}>
                  <TreeLedgerColumn>
                    {browseViewMode === 'LEDGER' ? (
                      <MilitaryUnitsLedgerView
                        units={filteredUnits}
                        allUnits={countryUnits}
                        selectedUnitId={selectedUnitFull?.id}
                        compact
                        isHistorical={isHistorical}
                        unitTypeLabels={UNIT_TYPE_LABELS}
                        branchLabels={BRANCH_LABELS}
                        echelonOrder={UNIT_ECHELON_ORDER}
                        resolveEffectiveDepartment={resolveEffectiveDepartment}
                        onSelectUnit={(unitItem) => selectUnit(unitItem.id)}
                        onAddRoot={() =>
                          onCreateUnit(resolveDefaultCreateOptions())
                        }
                        onEditUnit={(unitItem) => onEditUnit(unitItem.id)}
                        onAddSubUnit={(unitItem) =>
                          onCreateUnit({
                            parentUnitId: unitItem.id,
                            administrationDepartmentId:
                              unitItem.administrationDepartmentId ??
                              unitItem.administrationDepartment?.id ??
                              resolveEffectiveDepartment(unitItem)?.id ??
                              null,
                            historicalCountryId:
                              unitItem.historicalCountryId ?? null,
                            branch: unitItem.branch ?? null,
                          })
                        }
                      />
                    ) : (
                      <TreeContainer>
                        <TreeScrollArea>
                          {hierarchyGroups.groups.map((groupItem, groupIdx) => {
                            const showGroupHeader =
                              hierarchyGroups.groups.length > 1 ||
                              Boolean(groupItem.departmentId)
                            return (
                              <div key={groupItem.key}>
                                {showGroupHeader ? (
                                  <DeptGroupHeaderBar $first={groupIdx === 0}>
                                    <DeptGroupTitleWrap>
                                      <FiShield size={13} />
                                      <DeptGroupName>
                                        {groupItem.departmentName}
                                      </DeptGroupName>
                                      {groupItem.departmentAbbreviation ? (
                                        <DeptGroupAbbr>
                                          ({groupItem.departmentAbbreviation})
                                        </DeptGroupAbbr>
                                      ) : null}
                                      <DeptGroupCountPill>
                                        {groupItem.roots.length}
                                      </DeptGroupCountPill>
                                    </DeptGroupTitleWrap>
                                    <DeptGroupRightActions>
                                      {groupItem.departmentId &&
                                      onNavigateToDepartment ? (
                                        <DeptHeaderLinkBtn
                                          type="button"
                                          onClick={() =>
                                            onNavigateToDepartment(
                                              groupItem.departmentId!,
                                            )
                                          }
                                        >
                                          부처 상세
                                          <FiArrowUpRight size={11} />
                                        </DeptHeaderLinkBtn>
                                      ) : null}
                                      <DeptHeaderAddBtn
                                        type="button"
                                        onClick={() =>
                                          onCreateUnit({
                                            administrationDepartmentId:
                                              groupItem.departmentId,
                                            historicalCountryId:
                                              groupItem.historicalCountryId,
                                            branch:
                                              branchFilter !== 'ALL' &&
                                              branchFilter !== 'UNSPECIFIED'
                                                ? branchFilter
                                                : null,
                                          })
                                        }
                                      >
                                        <FiPlus size={11} />
                                        직할 추가
                                      </DeptHeaderAddBtn>
                                    </DeptGroupRightActions>
                                  </DeptGroupHeaderBar>
                                ) : null}
                                {groupItem.roots.map((rootUnit) =>
                                  renderTreeNode(rootUnit, 0, new Set()),
                                )}
                              </div>
                            )
                          })}
                        </TreeScrollArea>

                        <TreeFooterBar>
                          <TreeFooterAddBtn
                            type="button"
                            onClick={() =>
                              onCreateUnit(resolveDefaultCreateOptions())
                            }
                          >
                            <FiPlus size={13} />
                            최상위 사령부·부대 추가
                          </TreeFooterAddBtn>
                          {hierarchyGroups.collapsibleParentIds.length > 0 ? (
                            <TreeFooterCollapseBtn
                              type="button"
                              onClick={toggleCollapseAll}
                            >
                              {allCollapsibleCollapsed
                                ? '모두 펼치기'
                                : '모두 접기'}
                            </TreeFooterCollapseBtn>
                          ) : null}
                        </TreeFooterBar>
                      </TreeContainer>
                    )}
                  </TreeLedgerColumn>

                  <GovLedgerPanel>
                    {selectedUnitFull ? (
                      renderDetailView(selectedUnitFull)
                    ) : (
                      <EmptyDetailPlaceholder>
                        좌측 편제 트리에서 사령부·부대를 선택하면 지휘 계통,
                        개편 계보, 역대 지휘관 재임, 지령 및 참전 전투 기록이
                        표시됩니다.
                      </EmptyDetailPlaceholder>
                    )}
                  </GovLedgerPanel>
                </SplitWorkspaceGrid>
              ) : (
                <GovLedgerPanel>
                  {browseViewMode === 'LEDGER' ? (
                    <MilitaryUnitsLedgerView
                      units={filteredUnits}
                      allUnits={countryUnits}
                      selectedUnitId={selectedUnitId}
                      isHistorical={isHistorical}
                      unitTypeLabels={UNIT_TYPE_LABELS}
                      branchLabels={BRANCH_LABELS}
                      echelonOrder={UNIT_ECHELON_ORDER}
                      resolveEffectiveDepartment={resolveEffectiveDepartment}
                      onSelectUnit={(unitItem) => selectUnit(unitItem.id)}
                      onAddRoot={() =>
                        onCreateUnit(resolveDefaultCreateOptions())
                      }
                      onEditUnit={(unitItem) => onEditUnit(unitItem.id)}
                      onAddSubUnit={(unitItem) =>
                        onCreateUnit({
                          parentUnitId: unitItem.id,
                          administrationDepartmentId:
                            unitItem.administrationDepartmentId ??
                            unitItem.administrationDepartment?.id ??
                            resolveEffectiveDepartment(unitItem)?.id ??
                            null,
                          historicalCountryId:
                            unitItem.historicalCountryId ?? null,
                          branch: unitItem.branch ?? null,
                        })
                      }
                    />
                  ) : (
                    <TreeContainer>
                      <TreeScrollArea>
                        {hierarchyGroups.groups.map((groupItem, groupIdx) => {
                          const showGroupHeader =
                            hierarchyGroups.groups.length > 1 ||
                            Boolean(groupItem.departmentId)
                          return (
                            <div key={groupItem.key}>
                              {showGroupHeader ? (
                                <DeptGroupHeaderBar $first={groupIdx === 0}>
                                  <DeptGroupTitleWrap>
                                    <FiShield size={13} />
                                    <DeptGroupName>
                                      {groupItem.departmentName}
                                    </DeptGroupName>
                                    {groupItem.departmentAbbreviation ? (
                                      <DeptGroupAbbr>
                                        ({groupItem.departmentAbbreviation})
                                      </DeptGroupAbbr>
                                    ) : null}
                                    <DeptGroupCountPill>
                                      {groupItem.roots.length}
                                    </DeptGroupCountPill>
                                  </DeptGroupTitleWrap>
                                  <DeptGroupRightActions>
                                    {groupItem.departmentId &&
                                    onNavigateToDepartment ? (
                                      <DeptHeaderLinkBtn
                                        type="button"
                                        onClick={() =>
                                          onNavigateToDepartment(
                                            groupItem.departmentId!,
                                          )
                                        }
                                      >
                                        부처 상세
                                        <FiArrowUpRight size={11} />
                                      </DeptHeaderLinkBtn>
                                    ) : null}
                                    <DeptHeaderAddBtn
                                      type="button"
                                      onClick={() =>
                                        onCreateUnit({
                                          administrationDepartmentId:
                                            groupItem.departmentId,
                                          historicalCountryId:
                                            groupItem.historicalCountryId,
                                          branch:
                                            branchFilter !== 'ALL' &&
                                            branchFilter !== 'UNSPECIFIED'
                                              ? branchFilter
                                              : null,
                                        })
                                      }
                                    >
                                      <FiPlus size={11} />
                                      직할 추가
                                    </DeptHeaderAddBtn>
                                  </DeptGroupRightActions>
                                </DeptGroupHeaderBar>
                              ) : null}
                              {groupItem.roots.map((rootUnit) =>
                                renderTreeNode(rootUnit, 0, new Set()),
                              )}
                            </div>
                          )
                        })}
                      </TreeScrollArea>

                      <TreeFooterBar>
                        <TreeFooterAddBtn
                          type="button"
                          onClick={() =>
                            onCreateUnit(resolveDefaultCreateOptions())
                          }
                        >
                          <FiPlus size={13} />
                          최상위 사령부·부대 추가
                        </TreeFooterAddBtn>
                        {hierarchyGroups.collapsibleParentIds.length > 0 ? (
                          <TreeFooterCollapseBtn
                            type="button"
                            onClick={toggleCollapseAll}
                          >
                            {allCollapsibleCollapsed
                              ? '모두 펼치기'
                              : '모두 접기'}
                          </TreeFooterCollapseBtn>
                        ) : null}
                      </TreeFooterBar>
                    </TreeContainer>
                  )}
                </GovLedgerPanel>
              )}
            </WorkspaceStack>
          )}
        </WorkspaceStage>
      </SectionRoot>

      {selectedUnitFull && (
        <InstitutionAppointmentModal
          isOpen={appointmentOpen || Boolean(editingTenure)}
          onClose={() => {
            setAppointmentOpen(false)
            setEditingTenure(null)
          }}
          onSuccess={() => {
            void refreshSelectedUnitQueries()
          }}
          contextType="MILITARY_UNIT"
          countryId={
            selectedUnitFull.countryId ?? (isHistorical ? null : targetId)
          }
          historicalCountryId={
            selectedUnitFull.historicalCountryId ??
            (isHistorical ? targetId : null)
          }
          militaryUnitId={selectedUnitFull.id}
          militaryUnitName={selectedUnitFull.name}
          militaryUnitType={selectedUnitFull.unitType ?? null}
          departmentId={
            selectedUnitFull.administrationDepartmentId ??
            selectedUnitFull.administrationDepartment?.id ??
            null
          }
          editingTenure={
            editingTenure
              ? {
                  id: editingTenure.id,
                  personId:
                    editingTenure.person?.id ?? editingTenure.personId,
                  personName: editingTenure.person
                    ? getPersonDisplayName({
                        name: editingTenure.person.name ?? '',
                        surname: editingTenure.person.surname ?? undefined,
                        middleName:
                          editingTenure.person.middleName ?? undefined,
                        country: editingTenure.person.country ?? undefined,
                      }) || editingTenure.person.name
                    : '',
                  positionType:
                    editingTenure.positionDefinition?.positionType ??
                    'MILITARY_COMMANDER',
                  positionDefinitionId:
                    editingTenure.positionDefinition?.id ?? null,
                  title:
                    editingTenure.title ??
                    editingTenure.positionDefinition?.title ??
                    '사령관',
                  rankTitle: editingTenure.rankTitle ?? null,
                  ordinal: editingTenure.ordinal ?? null,
                  partyId: editingTenure.partyId ?? null,
                  administrationDepartmentId:
                    editingTenure.administrationDepartmentId ?? null,
                  militaryUnitId: selectedUnitFull.id,
                  cabinetId: editingTenure.cabinetId ?? null,
                  cabinetIds: editingTenure.cabinets?.map((cab) => cab.id),
                  startDate: editingTenure.startDate,
                  endDate: editingTenure.endDate,
                  startEra: editingTenure.startEra,
                  startYear: editingTenure.startYear,
                  startMonth: editingTenure.startMonth,
                  startDay: editingTenure.startDay,
                  endEra: editingTenure.endEra,
                  endYear: editingTenure.endYear,
                  endMonth: editingTenure.endMonth,
                  endDay: editingTenure.endDay,
                }
              : null
          }
        />
      )}

      <EventPickerModal
        isOpen={eventPickerOpen}
        onClose={() => setEventPickerOpen(false)}
        onSelect={(pickedEvent) => {
          setEditingEventLink(null)
          setPendingEvent(pickedEvent)
          setEventRole('ISSUER')
          setEventRoleDesc('')
          setEventPickerOpen(false)
        }}
        title={`${selectedUnitFull?.name ?? '사령부·부대'} 지령·작전 사건 선택`}
      />

      <PersonInlineModal
        personId={inspectPersonId}
        onClose={() => setInspectPersonId(null)}
        onOpenDetail={(targetPersonId) =>
          navigate(pathKeys.personsTimelineDetail(targetPersonId))
        }
      />
    </>
  )
}

const SectionRoot = styled.section`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
`

const ToolbarSelect = styled.select`
  height: 34px;
  padding: 0 28px 0 10px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  color: ${({ theme }) => theme.colors.text.primary};
  background-color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#ffffff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(20, 19, 34, 0.1)'};
`

const SnapshotYearWrap = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 8px 0 10px;
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background-color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#ffffff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(20, 19, 34, 0.1)'};
`

const SnapshotYearInput = styled.input`
  width: 118px;
  height: 100%;
  border: none;
  background: transparent;
  outline: none;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};

  &::placeholder {
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const WorkspaceStage = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`

const WorkspaceStack = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const BranchNavBar = styled.div`
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 2px;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  -ms-overflow-style: none;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? GOV_ROW_HAIRLINE.dark : GOV_ROW_HAIRLINE.light};

  &::-webkit-scrollbar {
    display: none;
  }
`

const BranchTabBtn = styled.button<{ $active: boolean }>`
  position: relative;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 11px;
  margin: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  letter-spacing: -0.015em;
  white-space: nowrap;
  cursor: pointer;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  transition: color 0.14s ease;

  &::after {
    content: '';
    position: absolute;
    left: 10px;
    right: 10px;
    bottom: 0;
    height: 2px;
    border-radius: 2px 2px 0 0;
    background: ${({ $active }) =>
      $active ? GOV_BRAND.primary : 'transparent'};
    transition: background 0.14s ease;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${GOV_BRAND.primary};
    outline-offset: -2px;
    border-radius: 6px;
  }
`

const BranchCountPill = styled.span<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 17px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? GOV_BRAND.primarySoftDark
        : GOV_BRAND.primarySoft
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.07)'
        : 'rgba(20, 19, 34, 0.05)'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#93c5fd'
        : GOV_BRAND.primary
      : theme.colors.text.tertiary};
`

const SplitWorkspaceGrid = styled.div<{ $ledgerView?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $ledgerView }) =>
    $ledgerView
      ? 'minmax(420px, 1.05fr) minmax(0, 1fr)'
      : 'minmax(330px, 420px) minmax(0, 1fr)'};
  gap: 16px;
  align-items: start;
  flex: 1;
  min-height: 0;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`

const TreeLedgerColumn = styled(GovLedgerPanel)`
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 250px);
`

const TreeContainer = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const TreeScrollArea = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`

const DeptGroupHeaderBar = styled.div<{ $first?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.025)' : '#f8fafc'};
  border-top: ${({ theme, $first }) =>
    $first
      ? 'none'
      : `1px solid ${
          theme.mode === 'dark' ? GOV_ROW_HAIRLINE.dark : GOV_ROW_HAIRLINE.light
        }`};
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? GOV_ROW_HAIRLINE.dark : GOV_ROW_HAIRLINE.light};
`

const DeptGroupTitleWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#5eead4' : '#0f766e')};
`

const DeptGroupName = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.01em;
`

const DeptGroupAbbr = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const DeptGroupCountPill = styled.span`
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.07)'
      : 'rgba(20, 19, 34, 0.06)'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const DeptGroupRightActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
`

const DeptHeaderLinkBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 23px;
  padding: 0 7px;
  border-radius: 5px;
  border: none;
  background: transparent;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#93c5fd' : GOV_BRAND.primary};
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? GOV_BRAND.primarySoftDark : GOV_BRAND.primarySoft};
  }
`

const DeptHeaderAddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 23px;
  padding: 0 7px;
  border-radius: 5px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(20, 19, 34, 0.12)'};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.24)'
        : 'rgba(20, 19, 34, 0.24)'};
  }
`

const TreeRow = styled.div<{ $selected: boolean; $depth: number }>`
  display: flex;
  align-items: center;
  min-height: 46px;
  padding-left: ${({ $depth }) => 8 + $depth * 18}px;
  padding-right: 10px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.06)'
        : 'rgba(20, 19, 34, 0.06)'};
  border-left: 2.5px solid
    ${({ $selected }) => ($selected ? GOV_BRAND.primary : 'transparent')};
  background: ${({ theme, $selected }) =>
    $selected
      ? theme.mode === 'dark'
        ? GOV_BRAND.primarySoftDark
        : GOV_BRAND.primarySoft
      : 'transparent'};
  transition: background 0.12s ease;

  &:hover {
    background: ${({ theme, $selected }) =>
      $selected
        ? theme.mode === 'dark'
          ? GOV_BRAND.primarySoftDark
          : GOV_BRAND.primarySoft
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.03)'
          : 'rgba(20, 19, 34, 0.025)'};
  }
`

const TreeCaretSlot = styled.div`
  width: 22px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
`

const CollapseToggleBtn = styled.button`
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border: none;
  border-radius: 5px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: 0;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.06)'
        : 'rgba(20, 19, 34, 0.05)'};
  }
`

const TreeLeafDot = styled.span<{ $selected: boolean }>`
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: ${({ theme, $selected }) =>
    $selected
      ? GOV_BRAND.primary
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.14)'
        : 'rgba(20, 19, 34, 0.14)'};
`

const TreeMainBtn = styled.button`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 6px 8px 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
`

const TreeTitleLine = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  font-size: 13.5px;
  font-weight: ${({ $selected }) => ($selected ? 700 : 600)};
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.015em;
  line-height: 1.3;
`

const TreeAbbrSpan = styled.span`
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const TreeNicknameSpan = styled.span`
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const TreeMetaStrip = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  margin-top: 3px;
`

const TreeLifespanSpan = styled.span`
  font-size: 11px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const TreeDisbandedBadge = styled.span`
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.06)'
      : 'rgba(20, 19, 34, 0.05)'};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const EchelonMiniBadge = styled.span<{ $echelon: string }>`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 700;
  background: ${({ theme, $echelon }) =>
    ['SUPREME_COMMAND', 'GENERAL_STAFF', 'SERVICE_HQ'].includes($echelon)
      ? theme.mode === 'dark'
        ? 'rgba(139, 92, 246, 0.18)'
        : 'rgba(139, 92, 246, 0.1)'
      : ['THEATER', 'ARMY_GROUP', 'FRONT', 'MILITARY_DISTRICT'].includes(
            $echelon,
          )
        ? theme.mode === 'dark'
          ? 'rgba(245, 158, 11, 0.16)'
          : 'rgba(245, 158, 11, 0.1)'
        : ['FIELD_ARMY', 'FLEET', 'AIR_FLEET', 'CORPS', 'AIR_CORPS'].includes(
              $echelon,
            )
          ? theme.mode === 'dark'
            ? GOV_BRAND.primarySoftDark
            : GOV_BRAND.primarySoft
          : theme.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.06)'
            : 'rgba(20, 19, 34, 0.045)'};
  color: ${({ theme, $echelon }) =>
    ['SUPREME_COMMAND', 'GENERAL_STAFF', 'SERVICE_HQ'].includes($echelon)
      ? theme.mode === 'dark'
        ? '#c4b5fd'
        : '#6d28d9'
      : ['THEATER', 'ARMY_GROUP', 'FRONT', 'MILITARY_DISTRICT'].includes(
            $echelon,
          )
        ? theme.mode === 'dark'
          ? '#fcd34d'
          : '#b45309'
        : ['FIELD_ARMY', 'FLEET', 'AIR_FLEET', 'CORPS', 'AIR_CORPS'].includes(
              $echelon,
            )
          ? theme.mode === 'dark'
            ? '#93c5fd'
            : GOV_BRAND.primary
          : theme.colors.text.secondary};
`

const TreeNeutralBadge = styled.span`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 600;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.06)'
      : 'rgba(20, 19, 34, 0.045)'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const TreeCommanderBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 600;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.06)'
      : 'rgba(20, 19, 34, 0.045)'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const TreeCountHint = styled.span`
  font-size: 10.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const TreeBattleBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(13, 148, 136, 0.16)' : '#f0fdfa'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#5eead4' : '#0f766e')};
`

const TreeAddSubBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 24px;
  padding: 0 7px;
  border-radius: 6px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(20, 19, 34, 0.1)'};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  flex-shrink: 0;
  opacity: 0.72;
  transition:
    opacity 0.12s ease,
    border-color 0.12s ease,
    color 0.12s ease;

  ${TreeRow}:hover & {
    opacity: 1;
  }

  &:hover {
    opacity: 1;
    color: ${({ theme }) =>
      theme.mode === 'dark' ? '#93c5fd' : GOV_BRAND.primary};
    border-color: ${GOV_BRAND.primary};
  }
`

const TreeFooterBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px 14px;
  flex-shrink: 0;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.06)'
        : 'rgba(20, 19, 34, 0.06)'};
`

const TreeFooterAddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 10px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(20, 19, 34, 0.1)'};
  border-radius: 7px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};

  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.2)'
        : 'rgba(20, 19, 34, 0.2)'};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.04)'
        : 'rgba(20, 19, 34, 0.025)'};
  }
`

const TreeFooterCollapseBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 6px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const DetailNicknameSpan = styled.span`
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-left: 8px;
`

const DetailMottoSpan = styled.span`
  font-size: 12px;
  font-style: italic;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const LedgerBlockSection = styled.div<{ $last?: boolean }>`
  padding: 15px 20px;
  border-bottom: ${({ theme, $last }) =>
    $last
      ? 'none'
      : `1px solid ${
          theme.mode === 'dark' ? GOV_ROW_HAIRLINE.dark : GOV_ROW_HAIRLINE.light
        }`};
`

const LedgerBlockHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
`

const LedgerBlockHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
`

const LedgerBlockHeaderRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
`

const LedgerBlockTitle = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const LedgerCountPill = styled.span`
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.06)'
      : 'rgba(20, 19, 34, 0.045)'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const MiniSortToggleBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 24px;
  padding: 0 8px;
  border-radius: 6px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(20, 19, 34, 0.1)'};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const InlineMiniSearchWrap = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
`

const InlineMiniSearchInput = styled.input`
  height: 28px;
  width: 156px;
  padding: 0 24px 0 24px;
  border-radius: 6px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(20, 19, 34, 0.1)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.025)' : '#f8fafc'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 11.5px;
  outline: none;
`

const InlineMiniClearBtn = styled.button`
  position: absolute;
  right: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  padding: 2px;
`

const OutlineActionBtn = styled.button`
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(20, 19, 34, 0.1)'};
  background: transparent;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#93c5fd' : GOV_BRAND.primary};
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: ${GOV_BRAND.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? GOV_BRAND.primarySoftDark : GOV_BRAND.primarySoft};
  }
`

const LedgerEmptyHint = styled.div`
  padding: 6px 0 2px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LedgerRowList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
`

const LedgerListItem = styled.li<{ $first?: boolean }>`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  align-items: center;
  padding: 8px 0;
  border-top: ${({ theme, $first }) =>
    $first
      ? 'none'
      : `1px solid ${
          theme.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.06)'
            : 'rgba(20, 19, 34, 0.06)'
        }`};
`

const OrdinalPill = styled.span`
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#93c5fd' : GOV_BRAND.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? GOV_BRAND.primarySoftDark : GOV_BRAND.primarySoft};
  padding: 1px 6px;
  border-radius: 5px;
`

const PersonJumpBtn = styled.button`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  background: transparent;
  border: none;
  padding: 0;
  font-size: inherit;
  font-family: inherit;
  cursor: pointer;
  text-align: left;

  &:hover {
    color: ${({ theme }) =>
      theme.mode === 'dark' ? '#93c5fd' : GOV_BRAND.primary};
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`

const RoleLabelSpan = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 500;
`

const NeutralChip = styled.span`
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.06)'
      : 'rgba(20, 19, 34, 0.045)'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const PartyChip = styled.span<{ $color?: string | null }>`
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme, $color }) =>
      $color ||
      (theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(20, 19, 34, 0.1)')};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const TenureDateSpan = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  font-variant-numeric: tabular-nums;
`

const RoleDescSpan = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const RowRightActions = styled.div`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const RowMiniBtn = styled.button<{ $danger?: boolean }>`
  padding: 2px 7px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 500;
  border-radius: 5px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(20, 19, 34, 0.1)'};
  background: transparent;
  color: ${({ theme, $danger }) =>
    $danger ? '#ef4444' : theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    border-color: ${({ $danger }) => ($danger ? '#ef4444' : GOV_BRAND.primary)};
    color: ${({ theme, $danger }) =>
      $danger
        ? '#dc2626'
        : theme.mode === 'dark'
          ? '#93c5fd'
          : GOV_BRAND.primary};
  }
`

const ExpandListBtn = styled.button`
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(20, 19, 34, 0.1)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.025)' : '#f8fafc'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#93c5fd' : GOV_BRAND.primary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  font-variant-numeric: tabular-nums;
`

const EventDraftPanel = styled.div`
  padding: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.025)' : '#f8fafc'};
  border-radius: 8px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(20, 19, 34, 0.1)'};
  margin-bottom: 10px;
`

const EventDraftTitle = styled.div`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 8px;
`

const EventRolePillRow = styled.div`
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  margin-bottom: 8px;
`

const EventRolePillBtn = styled.button<{ $active: boolean }>`
  padding: 4px 9px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  border-radius: 6px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active
        ? GOV_BRAND.primary
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(20, 19, 34, 0.1)'};
  background: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? GOV_BRAND.primarySoftDark
        : GOV_BRAND.primarySoft
      : 'transparent'};
  color: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? '#93c5fd'
        : GOV_BRAND.primary
      : theme.colors.text.secondary};
  cursor: pointer;
`

const EventDraftInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 8px;
  padding: 7px 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(20, 19, 34, 0.1)'};
  border-radius: 7px;
  font-family: inherit;
  font-size: 12.5px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  outline: none;
`

const EventDraftActions = styled.div`
  display: flex;
  gap: 6px;
`

const EventDraftSaveBtn = styled.button`
  padding: 5px 12px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  background: ${GOV_BRAND.primary};
  color: #ffffff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
`

const EventDraftCancelBtn = styled.button`
  padding: 5px 12px;
  font-family: inherit;
  font-size: 12px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(20, 19, 34, 0.1)'};
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
`

const EventRowLink = styled(Link)`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: underline;
  text-underline-offset: 2px;

  &:hover {
    color: ${({ theme }) =>
      theme.mode === 'dark' ? '#93c5fd' : GOV_BRAND.primary};
  }
`

const CombatLedgerItem = styled.li<{ $first?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px 0;
  border-top: ${({ theme, $first }) =>
    $first
      ? 'none'
      : `1px solid ${
          theme.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.06)'
            : 'rgba(20, 19, 34, 0.06)'
        }`};
`

const CombatTopLine = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
`

const CombatTitleGroup = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  font-size: 13px;
`

const CombatYearBadge = styled.span`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.06)'
      : 'rgba(20, 19, 34, 0.05)'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SideTagPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.06)'
      : 'rgba(20, 19, 34, 0.045)'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SideColorDot = styled.span<{ $color: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const SurveyLinkBtn = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 5px;
  font-size: 11.5px;
  font-weight: 600;
  text-decoration: none;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#93c5fd' : GOV_BRAND.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? GOV_BRAND.primarySoftDark : GOV_BRAND.primarySoft};

  &:hover {
    opacity: 0.88;
  }
`

const CombatMetaLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const InlineTextBtn = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: inherit;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) =>
      theme.mode === 'dark' ? '#93c5fd' : GOV_BRAND.primary};
  }
`

const EmptyDetailPlaceholder = styled.div`
  padding: 48px 24px;
  text-align: center;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
