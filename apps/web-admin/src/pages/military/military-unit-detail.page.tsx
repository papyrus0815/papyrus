import React, { useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiAnchor,
  FiArrowDown,
  FiArrowLeft,
  FiArrowRight,
  FiArrowUp,
  FiArrowUpRight,
  FiCalendar,
  FiChevronDown,
  FiChevronRight,
  FiCompass,
  FiEdit2,
  FiGitCommit,
  FiGlobe,
  FiGrid,
  FiList,
  FiMapPin,
  FiPlus,
  FiSearch,
  FiShield,
  FiTrash2,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

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
import { UnlinkedCountryTenuresBar } from '@/features/government-info/ui/unlinked-country-tenures-bar'
import { formatSpanLabel } from '@/pages/events/detail/components/development-timeline.lib'
import { SIDE_UNIT_ROLE_LABEL } from '@/pages/events/detail/components/side-orbat.lib'
import { SIDE_OUTCOME_LABEL } from '@/pages/events/detail/components/side-outcome'
import { toolbarControlHeight } from '@/pages/events/styles/theme'
import {
  administrationDepartmentApi,
  type AdministrationDepartmentEventRole,
  EVENT_DEPARTMENT_ROLE_LABEL,
  type EventDepartmentRoleValue,
} from '@/shared/api/administration-department'
import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import {
  militaryUnitApi,
  type MilitaryUnitDatePartsDto,
  type MilitaryUnitEventLinkDto,
  type MilitaryUnitLineageDto,
  type MilitaryUnitTenureItem,
  type MilitaryUnitTransitionKind,
} from '@/shared/api/military-unit'
import { personCareerApi } from '@/shared/api/person-career'
import { getUploadImageUrl } from '@/shared/api/upload'
import { useDocumentTitle } from '@/shared/hooks/use-document-title.hook'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import { militaryUnitTypeLabelKo } from '@/shared/lib/military-unit-type-label'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { parseSignedDateParts } from '@/shared/lib/tenure-person-utils'
import { goBackOr, pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import { EmptyStateSpotlight } from '@/shared/ui/empty-state/empty-state'
import {
  EventPickerModal,
  type EventPickerSelection,
} from '@/shared/ui/event-picker-modal/event-picker-modal'
import { HeadquartersMapPreview } from '@/shared/ui/headquarters-location-field'
import {
  type EditableInstitutionTenure,
  InstitutionAppointmentModal,
} from '@/shared/ui/institution-appointment-modal'
import { notify } from '@/shared/ui/toast'
import {
  LedgerCompactAction,
  LedgerIconButton,
  LedgerPrimaryButton,
  LedgerToolbarButton,
} from '@/widgets/country/country-detail/ui/country-ledger-primitives'
import { MilitaryUnitFormModal } from '@/widgets/country/country-detail/ui/military-unit-form.modal'
import {
  CountryInlineModal,
  type CountryInlineModalTarget,
  shouldInterceptEntityClick,
} from '@/widgets/country/country-inline-modal/country-inline-modal'
import { PersonInlineModal } from '@/widgets/person/person-inline-modal/person-inline-modal'

const TRANSITION_KIND_LABELS: Record<MilitaryUnitTransitionKind, string> = {
  REORGANIZE: '개편',
  RENAME: '개칭',
  MERGE: '통합',
  SPLIT: '분할',
  ABSORBED: '흡수',
}

const TRANSITION_KIND_OPTIONS: Array<{
  value: MilitaryUnitTransitionKind
  label: string
}> = [
  { value: 'REORGANIZE', label: '개편 (편제·역할 재편)' },
  { value: 'RENAME', label: '개칭 (명칭 변경)' },
  { value: 'SPLIT', label: '분할 (신설 분리)' },
  { value: 'MERGE', label: '통합 (합병)' },
  { value: 'ABSORBED', label: '흡수 (타 편제로 편입)' },
]

const DIRECTIVE_ROLE_OPTIONS: Array<{
  value: AdministrationDepartmentEventRole
  label: string
}> = [
  { value: 'PRINCIPAL', label: '작전 주도 · 총괄' },
  { value: 'ISSUER', label: '지령 발령 · 하달' },
  { value: 'RECIPIENT', label: '수명 · 작전 이행' },
  { value: 'PARTICIPANT', label: '참여 · 관여' },
  { value: 'OTHER', label: '기타' },
]

type TransitionDirection =
  | 'PREDECESSOR_UNIT'
  | 'PREDECESSOR_DEPT'
  | 'SUCCESSOR_UNIT'

const BRANCH_LABELS: Record<string, string> = {
  ARMY: '육군',
  NAVY: '해군',
  AIR_FORCE: '공군',
  MARINE_CORPS: '해병대',
  COAST_GUARD: '해안경비대',
  SPACE_FORCE: '우주군',
  JOINT: '합동',
  OTHER: '기타',
}

const ECHELON_ORDER: Record<string, number> = {
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

interface UnitWeaponEntry {
  id: string
  quantity?: number | null
  note?: string | null
  weapon?: { id: string; name: string; weaponType?: string | null } | null
  groundVehicle?: {
    id: string
    name: string
    vehicleType?: string | null
  } | null
  aircraft?: { id: string; name: string; aircraftType?: string | null } | null
  navalVessel?: { id: string; name: string; vesselType?: string | null } | null
}

interface UnitDetailResponse {
  id: string
  name: string
  nameLocal?: string | null
  nameEn?: string | null
  abbreviation?: string | null
  unitType?: string | null
  branch?: string | null
  isActive?: boolean | null
  nickname?: string | null
  motto?: string | null
  garrison?: string | null
  strength?: string | null
  primaryMission?: string | null
  jurisdiction?: string | null
  notableBattles?: string | null
  honors?: string | null
  insigniaUrl?: string | null
  administrationDepartmentId?: string | null
  description?: string | null
  established?: MilitaryUnitDatePartsDto | null
  disbanded?: MilitaryUnitDatePartsDto | null
  establishedDate?: string | null
  disbandedDate?: string | null
  predecessors?: MilitaryUnitLineageDto[]
  successors?: MilitaryUnitLineageDto[]
  eventRelations?: MilitaryUnitEventLinkDto[]
  countryId?: string | null
  historicalCountryId?: string | null
  country?: { id: string; name: string } | null
  historicalCountry?: { id: string; name: string } | null
  administrationDepartment?: {
    id: string
    name: string
    abbreviation?: string | null
  } | null
  parentUnitId?: string | null
  parentUnit?: {
    id: string
    name: string
    unitType?: string | null
  } | null
  subUnits?: Array<{
    id: string
    name: string
    abbreviation?: string | null
    unitType?: string | null
    branch?: string | null
    isActive?: boolean | null
  }>
  tenures?: MilitaryUnitTenureItem[]
  commanders?: Array<{
    id: string
    tenureId?: string | null
    personId: string
    rank?: string | null
    role?: string | null
    startDate?: string | null
    endDate?: string | null
    isCurrent?: boolean | null
    person?: {
      id: string
      name: string
      surname?: string | null
    } | null
  }>
  assignedNavalVessels?: Array<{
    id: string
    name: string
    vesselType?: string | null
    vesselClass?: string | null
  }>
  navalVessels?: Array<{
    id: string
    name: string
    vesselType?: string | null
    vesselClass?: string | null
  }>
  sideDeployedUnits?: Array<{
    id: string
    role?: string | null
    note?: string | null
    parentUnit?: {
      id: string
      name: string
      unitType?: string | null
    } | null
    commander?: {
      id: string
      name: string
      surname?: string | null
    } | null
    deployedWeapons?: UnitWeaponEntry[]
    weaponsUsed?: UnitWeaponEntry[]
    mapFeatures?: Array<{
      id: string
      eventId: string
      geometryType: 'POINT' | 'ARROW' | 'LINE' | 'POLYGON'
      title: string
      description?: string | null
      color?: string | null
    }>
    metrics?: Array<{
      id: string
      metricKey: string
      metricName: string
      unit?: string | null
      value?: string | null
      low?: string | null
      high?: string | null
      approx?: boolean
      atLeast?: boolean
    }>
    side?: {
      id: string
      name: string
      color?: string | null
      outcome?: string | null
      event?: {
        id: string
        title: string
        startDate?: string | null
        startDatePrecision?: string | null
        endDate?: string | null
        endDatePrecision?: string | null
        startEra?: string | null
        startYear?: number | null
        startMonth?: number | null
        startDay?: number | null
        endEra?: string | null
        endYear?: number | null
        endMonth?: number | null
        endDay?: number | null
        domain?: string | null
        type?: string | null
        kind?: string | null
        parentEventId?: string | null
        parentEvent?: {
          id: string
          title: string
          kind?: string | null
        } | null
      } | null
    } | null
  }>
}

function getTenureChronologyScore(tenure: MilitaryUnitTenureItem): number {
  if (tenure.startYear != null && tenure.startYear > 0) {
    const signedYear =
      tenure.startEra === 'BC' ? -Math.abs(tenure.startYear) : tenure.startYear
    return (
      signedYear * 10000 +
      (tenure.startMonth ?? 1) * 100 +
      (tenure.startDay ?? 1)
    )
  }
  const parsed = parseSignedDateParts(tenure.startDate ?? null)
  if (parsed) {
    return parsed.signedYear * 10000 + parsed.month * 100 + parsed.day
  }
  return Number.POSITIVE_INFINITY
}

function formatStructuredEventSpan(ev: {
  id: string
  title: string
  startDate?: string | null
  startDatePrecision?: string | null
  endDate?: string | null
  endDatePrecision?: string | null
  startEra?: string | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  endEra?: string | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
}): string {
  const isoFormatted = formatSpanLabel({
    id: ev.id,
    title: ev.title,
    startDate: ev.startDate,
    startDatePrecision: ev.startDatePrecision,
    endDate: ev.endDate,
    endDatePrecision: ev.endDatePrecision,
  })
  if (isoFormatted) return isoFormatted

  const fmtPoint = (
    era?: string | null,
    yr?: number | null,
    mo?: number | null,
    dy?: number | null,
  ) => {
    if (!yr || yr <= 0) return null
    const prefix = era === 'BC' ? 'BC ' : ''
    const mPart = mo != null ? `.${String(mo).padStart(2, '0')}` : ''
    const dPart =
      mo != null && dy != null ? `.${String(dy).padStart(2, '0')}` : ''
    return `${prefix}${yr}${mPart}${dPart}`
  }
  const s = fmtPoint(ev.startEra, ev.startYear, ev.startMonth, ev.startDay)
  const e = fmtPoint(ev.endEra, ev.endYear, ev.endMonth, ev.endDay)
  if (s && e && s !== e) return `${s} ~ ${e}`
  return s ?? e ?? '연도 미상'
}

export function MilitaryUnitDetailPage() {
  const { unitId } = useParams<{ unitId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const listSearch =
    (location.state as { listSearch?: string } | null)?.listSearch ?? ''

  const [inspectPersonId, setInspectPersonId] = useState<string | null>(null)
  const [countryModalTarget, setCountryModalTarget] =
    useState<CountryInlineModalTarget | null>(null)

  const [appointmentOpen, setAppointmentOpen] = useState(false)
  const [editingTenure, setEditingTenure] =
    useState<EditableInstitutionTenure | null>(null)

  const [unitFormOpen, setUnitFormOpen] = useState(false)
  const [unitFormEditingId, setUnitFormEditingId] = useState<string | null>(
    null,
  )
  const [unitFormDefaults, setUnitFormDefaults] = useState<{
    countryId?: string | null
    historicalCountryId?: string | null
    parentUnitId?: string | null
    administrationDepartmentId?: string | null
    branch?: string | null
  }>({})

  const [addTransitionOpen, setAddTransitionOpen] = useState(false)
  const [transitionDirection, setTransitionDirection] =
    useState<TransitionDirection>('PREDECESSOR_UNIT')
  const [transitionTargetId, setTransitionTargetId] = useState('')
  const [transitionKind, setTransitionKind] =
    useState<MilitaryUnitTransitionKind>('REORGANIZE')
  const [transitionEra, setTransitionEra] = useState<'AD' | 'BC'>('AD')
  const [transitionYear, setTransitionYear] = useState('')
  const [transitionMonth, setTransitionMonth] = useState('')
  const [transitionNote, setTransitionNote] = useState('')
  const [transitionBusy, setTransitionBusy] = useState(false)

  const [editingTransitionId, setEditingTransitionId] = useState<string | null>(
    null,
  )
  const [editTransitionKind, setEditTransitionKind] =
    useState<MilitaryUnitTransitionKind>('REORGANIZE')
  const [editTransitionEra, setEditTransitionEra] = useState<'AD' | 'BC'>('AD')
  const [editTransitionYear, setEditTransitionYear] = useState('')
  const [editTransitionMonth, setEditTransitionMonth] = useState('')
  const [editTransitionNote, setEditTransitionNote] = useState('')

  const [eventPickerOpen, setEventPickerOpen] = useState(false)
  const [pendingEvent, setPendingEvent] =
    useState<EventPickerSelection | null>(null)
  const [editingEventLink, setEditingEventLink] =
    useState<MilitaryUnitEventLinkDto | null>(null)
  const [eventRole, setEventRole] =
    useState<AdministrationDepartmentEventRole>('ISSUER')
  const [eventRoleDesc, setEventRoleDesc] = useState('')
  const [eventLinkBusy, setEventLinkBusy] = useState(false)

  const [subViewMode, setSubViewMode] = useState<'cards' | 'tree'>('cards')
  const [collapsedSubIds, setCollapsedSubIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [commanderSearch, setCommanderSearch] = useState('')
  const [commanderSort, setCommanderSort] = useState<'asc' | 'desc'>('asc')

  const detailQuery = useQuery({
    queryKey: ['military-unit', 'detail', unitId],
    queryFn: () =>
      militaryUnitApi.getById(unitId!) as unknown as Promise<UnitDetailResponse>,
    enabled: Boolean(unitId),
    staleTime: 30_000,
  })

  const allUnitsQuery = useQuery({
    queryKey: ['military-units', 'global-catalog'],
    queryFn: () => militaryUnitApi.getAll(),
    enabled: Boolean(unitId),
    staleTime: 60_000,
  })

  const unit = detailQuery.data ?? null

  useDocumentTitle(
    unit ? `${unit.name} · 군사 편제` : '사령부 · 부대 상세',
  )

  const departmentsForLineageQuery = useQuery({
    queryKey: [
      'administration-departments',
      'lineage-candidates',
      unit?.countryId ?? null,
      unit?.historicalCountryId ?? null,
    ],
    queryFn: async () => {
      if (unit?.historicalCountryId) {
        const histDepts = await administrationDepartmentApi.getAll({
          historicalCountryId: unit.historicalCountryId,
        })
        if (unit.countryId) {
          const modernDepts = await administrationDepartmentApi.getAll({
            countryId: unit.countryId,
          })
          const seen = new Set(histDepts.map((deptItem) => deptItem.id))
          return [
            ...histDepts,
            ...modernDepts.filter((deptItem) => !seen.has(deptItem.id)),
          ]
        }
        return histDepts
      }
      if (unit?.countryId) {
        return administrationDepartmentApi.getAll({
          countryId: unit.countryId,
        })
      }
      return administrationDepartmentApi.getAll({ take: 200 })
    },
    enabled:
      Boolean(unitId) &&
      addTransitionOpen &&
      transitionDirection === 'PREDECESSOR_DEPT',
    staleTime: 60_000,
  })

  const invalidateUnitData = async () => {
    await queryClient.invalidateQueries({ queryKey: ['military-units'] })
    if (unitId) {
      await queryClient.invalidateQueries({
        queryKey: ['military-unit', 'detail', unitId],
      })
    }
    await queryClient.invalidateQueries({
      queryKey: ['administration-departments'],
    })
  }

  const navigateToUnit = (nextUnitId: string) => {
    setAddTransitionOpen(false)
    setEditingTransitionId(null)
    setPendingEvent(null)
    setEditingEventLink(null)
    navigate(pathKeys.militaryUnitDetail(nextUnitId), {
      state: { listSearch },
    })
  }

  const sortedSubUnits = useMemo(() => {
    const subs = unit?.subUnits ?? []
    return [...subs].sort((a, b) => {
      const rA = a.unitType ? (ECHELON_ORDER[a.unitType] ?? 50) : 50
      const rB = b.unitType ? (ECHELON_ORDER[b.unitType] ?? 50) : 50
      if (rA !== rB) return rA - rB
      return a.name.localeCompare(b.name, 'ko')
    })
  }, [unit?.subUnits])

  const allUnits = useMemo(
    () => (allUnitsQuery.data ?? []) as UnitDetailResponse[],
    [allUnitsQuery.data],
  )

  const unitByIdMap = useMemo(() => {
    const map = new Map<string, UnitDetailResponse>()
    for (const item of allUnits) {
      map.set(item.id, item)
    }
    if (unit) {
      map.set(unit.id, unit)
    }
    return map
  }, [allUnits, unit])

  const childrenByParentMap = useMemo(() => {
    const map = new Map<string, UnitDetailResponse[]>()
    for (const item of allUnits) {
      if (!item.parentUnitId) continue
      const bucket = map.get(item.parentUnitId) ?? []
      bucket.push(item)
      map.set(item.parentUnitId, bucket)
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => {
        const rA = a.unitType ? (ECHELON_ORDER[a.unitType] ?? 50) : 50
        const rB = b.unitType ? (ECHELON_ORDER[b.unitType] ?? 50) : 50
        if (rA !== rB) return rA - rB
        return a.name.localeCompare(b.name, 'ko')
      })
    }
    return map
  }, [allUnits])

  const { ancestorChain, effectiveDepartment } = useMemo(() => {
    if (!unit) {
      return {
        ancestorChain: [] as Array<{
          id: string
          name: string
          abbreviation?: string | null
          unitType?: string | null
          administrationDepartment?: {
            id: string
            name: string
            abbreviation?: string | null
          } | null
        }>,
        effectiveDepartment: {
          dept: null as {
            id: string
            name: string
            abbreviation?: string | null
          } | null,
          inherited: false,
        },
      }
    }

    const chain: Array<{
      id: string
      name: string
      abbreviation?: string | null
      unitType?: string | null
      administrationDepartment?: {
        id: string
        name: string
        abbreviation?: string | null
      } | null
    }> = []
    const visited = new Set<string>([unit.id])
    let cursor:
      | {
          id: string
          name: string
          abbreviation?: string | null
          unitType?: string | null
          parentUnitId?: string | null
          parentUnit?: { id: string; name: string; unitType?: string | null } | null
          administrationDepartment?: {
            id: string
            name: string
            abbreviation?: string | null
          } | null
        }
      | null
      | undefined = unit.parentUnitId
      ? (unitByIdMap.get(unit.parentUnitId) ?? unit.parentUnit ?? null)
      : (unit.parentUnit ?? null)

    while (cursor && !visited.has(cursor.id)) {
      visited.add(cursor.id)
      const fullNode = unitByIdMap.get(cursor.id)
      chain.unshift({
        id: cursor.id,
        name: fullNode?.name ?? cursor.name,
        abbreviation: fullNode?.abbreviation ?? cursor.abbreviation ?? null,
        unitType: fullNode?.unitType ?? cursor.unitType ?? null,
        administrationDepartment:
          fullNode?.administrationDepartment ??
          cursor.administrationDepartment ??
          null,
      })
      cursor = fullNode?.parentUnitId
        ? (unitByIdMap.get(fullNode.parentUnitId) ??
          fullNode.parentUnit ??
          null)
        : null
    }

    if (unit.administrationDepartment) {
      return {
        ancestorChain: chain,
        effectiveDepartment: {
          dept: unit.administrationDepartment,
          inherited: false,
        },
      }
    }

    for (let idx = chain.length - 1; idx >= 0; idx -= 1) {
      const ancDept = chain[idx].administrationDepartment
      if (ancDept) {
        return {
          ancestorChain: chain,
          effectiveDepartment: {
            dept: ancDept,
            inherited: true,
          },
        }
      }
    }

    return {
      ancestorChain: chain,
      effectiveDepartment: { dept: null, inherited: false },
    }
  }, [unit, unitByIdMap])

  const { hasGrandchildren, totalDescendantCount } = useMemo(() => {
    if (!unit) return { hasGrandchildren: false, totalDescendantCount: 0 }
    let grand = false
    let count = 0
    const seen = new Set<string>([unit.id])
    const walk = (parentId: string, depth: number) => {
      const kids = childrenByParentMap.get(parentId) ?? []
      for (const child of kids) {
        if (seen.has(child.id)) continue
        seen.add(child.id)
        count += 1
        if (depth >= 1) grand = true
        walk(child.id, depth + 1)
      }
    }
    walk(unit.id, 0)
    return {
      hasGrandchildren: grand,
      totalDescendantCount: Math.max(count, sortedSubUnits.length),
    }
  }, [childrenByParentMap, sortedSubUnits.length, unit])

  const sameCountryUnitOptions = useMemo(() => {
    if (!unit) return []
    const matched = allUnits.filter(
      (cand) =>
        cand.id === unit.id ||
        (unit.historicalCountryId &&
          cand.historicalCountryId === unit.historicalCountryId) ||
        (unit.countryId && cand.countryId === unit.countryId),
    )
    const list = matched.length > 0 ? matched : [unit]
    return list.map((cand) => ({
      id: cand.id,
      label: `${cand.name}${cand.unitType ? ` (${militaryUnitTypeLabelKo(cand.unitType)})` : ''}`,
      historicalCountryId: cand.historicalCountryId ?? null,
    }))
  }, [allUnits, unit])

  if (detailQuery.isLoading) {
    return (
      <PageCanvas>
        <LoadingBox>사령부·부대 상세 정보를 불러오는 중입니다…</LoadingBox>
      </PageCanvas>
    )
  }

  if (!unit) {
    return (
      <PageCanvas>
        <TopBar>
          <LedgerToolbarButton
            type="button"
            onClick={() => navigate(`${pathKeys.military()}${listSearch}`)}
          >
            <FiArrowLeft size={14} /> 군사 총람
          </LedgerToolbarButton>
        </TopBar>
        <LedgerSection>
          <EmptyStateSpotlight
            flat
            icon={<FiShield size={24} />}
            title="선택한 사령부·부대를 찾을 수 없습니다"
            description="삭제되었거나 주소가 잘못되었을 수 있습니다."
            primaryAction={{
              label: '군사 총람으로 돌아가기',
              onClick: () => navigate(`${pathKeys.military()}${listSearch}`),
            }}
          />
        </LedgerSection>
      </PageCanvas>
    )
  }

  const countryName =
    unit.historicalCountry?.name ?? unit.country?.name ?? null
  const countryIdForLink =
    unit.historicalCountry?.id ?? unit.country?.id ?? null
  const unitTypeLabel = unit.unitType
    ? militaryUnitTypeLabelKo(unit.unitType)
    : '군사 편제'
  const branchLabel = unit.branch
    ? (BRANCH_LABELS[unit.branch] ?? unit.branch)
    : null
  const unifiedTenures = unit.tenures ?? []
  const legacyOnlyCommanders = (unit.commanders ?? []).filter(
    (cmdItem) => !cmdItem.tenureId,
  )
  const totalCommanderCount =
    unifiedTenures.length + legacyOnlyCommanders.length

  const normalizedCmdQuery = commanderSearch.trim().toLowerCase()
  const cmdSortDir = commanderSort === 'asc' ? 1 : -1
  const filteredTenures = [...unifiedTenures]
    .filter((tenureItem) => {
      if (!normalizedCmdQuery) return true
      const pName = tenureItem.person
        ? getPersonDisplayName({
            name: tenureItem.person.name ?? '',
            surname: tenureItem.person.surname ?? undefined,
            middleName: tenureItem.person.middleName ?? undefined,
            country: tenureItem.person.country ?? undefined,
          }) || tenureItem.person.name
        : ''
      return [
        pName,
        tenureItem.rankTitle ?? '',
        tenureItem.title ?? '',
        tenureItem.positionDefinition?.title ?? '',
        tenureItem.party?.name ?? '',
        tenureItem.party?.shortName ?? '',
        tenureItem.notes ?? '',
      ].some((txt) => txt.toLowerCase().includes(normalizedCmdQuery))
    })
    .sort((left, right) => {
      const sLeft = getTenureChronologyScore(left)
      const sRight = getTenureChronologyScore(right)
      if (sLeft !== sRight) return (sLeft - sRight) * cmdSortDir
      return ((left.ordinal ?? 0) - (right.ordinal ?? 0)) * cmdSortDir
    })

  const filteredLegacyCommanders = legacyOnlyCommanders.filter((cmd) => {
    if (!normalizedCmdQuery) return true
    const fullName = cmd.person
      ? [cmd.person.name, cmd.person.surname].filter(Boolean).join(' ')
      : ''
    return [fullName, cmd.rank ?? '', cmd.role ?? ''].some((txt) =>
      txt.toLowerCase().includes(normalizedCmdQuery),
    )
  })

  const contextMetaCards = [
    unit.primaryMission?.trim()
      ? { label: '주요 임무 · 역할', body: unit.primaryMission.trim() }
      : null,
    unit.jurisdiction?.trim()
      ? { label: '작전 관할 구역', body: unit.jurisdiction.trim() }
      : null,
    unit.notableBattles?.trim()
      ? { label: '주요 참전 · 작전', body: unit.notableBattles.trim() }
      : null,
    unit.honors?.trim()
      ? { label: '부대 표창 · 훈장', body: unit.honors.trim() }
      : null,
  ].filter((entry): entry is { label: string; body: string } => entry !== null)
  const predecessors = unit.predecessors ?? []
  const successors = unit.successors ?? []
  const eventRelations = unit.eventRelations ?? []
  const deployments = (unit.sideDeployedUnits ?? []).filter(
    (dep) => dep.side?.event,
  )
  const vessels = unit.assignedNavalVessels ?? unit.navalVessels ?? []

  const candidateLineageUnits = allUnits
    .filter((candidate) => candidate.id !== unit.id)
    .sort((left, right) => {
      const leftSameCountry =
        (unit.historicalCountryId &&
          left.historicalCountryId === unit.historicalCountryId) ||
        (unit.countryId && left.countryId === unit.countryId)
          ? 1
          : 0
      const rightSameCountry =
        (unit.historicalCountryId &&
          right.historicalCountryId === unit.historicalCountryId) ||
        (unit.countryId && right.countryId === unit.countryId)
          ? 1
          : 0
      if (leftSameCountry !== rightSameCountry) {
        return rightSameCountry - leftSameCountry
      }
      return left.name.localeCompare(right.name, 'ko')
    })

  const candidateLineageDepartments = departmentsForLineageQuery.data ?? []

  const formatPartsOrIso = (
    parts: MilitaryUnitDatePartsDto | null | undefined,
    iso: string | null | undefined,
    fallback: string,
  ): string => {
    if (parts?.year && parts.year > 0) {
      const prefix = parts.era === 'BC' ? 'BC ' : ''
      const monthPart =
        parts.month != null ? `.${String(parts.month).padStart(2, '0')}` : ''
      const dayPart =
        parts.month != null && parts.day != null
          ? `.${String(parts.day).padStart(2, '0')}`
          : ''
      return `${prefix}${parts.year}${monthPart}${dayPart}`
    }
    if (iso) return iso.slice(0, 10)
    return fallback
  }

  const establishedStr = formatPartsOrIso(
    unit.established,
    unit.establishedDate,
    '',
  )
  const disbandedStr = formatPartsOrIso(unit.disbanded, unit.disbandedDate, '')
  const isDisbanded = unit.isActive === false || Boolean(disbandedStr)
  const periodDisplay =
    establishedStr || disbandedStr
      ? `${establishedStr || '?'} ~ ${disbandedStr || (unit.isActive === false ? '해체' : '현재')}`
      : unit.isActive === false
        ? '해체 (연도 미상)'
        : '연도 미등록'

  const formatLineageTime = (item: MilitaryUnitLineageDto): string | null => {
    if (!item.year) return null
    const eraPrefix = item.era === 'BC' ? 'BC ' : ''
    const monthPart = item.month
      ? `.${String(item.month).padStart(2, '0')}`
      : ''
    return `${eraPrefix}${item.year}${monthPart}`
  }

  const formatTenureSpan = (tenureItem: MilitaryUnitTenureItem): string => {
    const fmtSide = (
      eraVal: string | null | undefined,
      yearVal: number | null | undefined,
      monthVal: number | null | undefined,
      dayVal: number | null | undefined,
      isoVal: string | null | undefined,
    ) => {
      if (yearVal && yearVal > 0) {
        const eraPrefix = eraVal === 'BC' ? 'BC ' : ''
        const mStr = monthVal ? `.${String(monthVal).padStart(2, '0')}` : ''
        const dStr =
          monthVal && dayVal ? `.${String(dayVal).padStart(2, '0')}` : ''
        return `${eraPrefix}${yearVal}${mStr}${dStr}`
      }
      if (isoVal) return isoVal.slice(0, 10)
      return ''
    }
    const startPart = fmtSide(
      tenureItem.startEra,
      tenureItem.startYear,
      tenureItem.startMonth,
      tenureItem.startDay,
      tenureItem.startDate,
    )
    const endPart = fmtSide(
      tenureItem.endEra,
      tenureItem.endYear,
      tenureItem.endMonth,
      tenureItem.endDay,
      tenureItem.endDate,
    )
    if (!startPart && !endPart) return '연도 미상'
    return `${startPart || '?'} ~ ${endPart || '현임'}`
  }

  const handleDeleteUnit = async () => {
    if (sortedSubUnits.length > 0) {
      notify.error(
        `예하 편제 ${sortedSubUnits.length}개가 연결되어 있습니다. 먼저 예하 편제를 이동하거나 삭제해 주세요.`,
      )
      return
    }
    const ok = await confirm({
      title: '군부대 삭제',
      message: `'${unit.name}' 사령부·부대를 삭제하시겠습니까?`,
      confirmLabel: '삭제',
      danger: true,
    })
    if (!ok) return
    try {
      await militaryUnitApi.delete(unit.id)
      await queryClient.invalidateQueries({ queryKey: ['military-units'] })
      notify.success('사령부·부대가 삭제되었습니다.')
      navigate(`${pathKeys.military()}${listSearch}`, { replace: true })
    } catch (err) {
      notify.error(getApiErrorMessage(err, '부대 삭제에 실패했습니다.'))
    }
  }

  const handleAddTransition = async () => {
    if (!transitionTargetId) {
      notify.error('연결할 대상 부대 또는 행정부처를 선택해 주세요.')
      return
    }
    const parsedYear = transitionYear.trim()
      ? Number(transitionYear.trim())
      : null
    const parsedMonth = transitionMonth.trim()
      ? Number(transitionMonth.trim())
      : null
    if (
      parsedYear !== null &&
      (!Number.isInteger(parsedYear) || parsedYear < 1)
    ) {
      notify.error('계보 전환 연도는 1 이상의 정수여야 합니다.')
      return
    }
    if (
      parsedMonth !== null &&
      (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12)
    ) {
      notify.error('계보 전환 월은 1~12 사이여야 합니다.')
      return
    }
    if (parsedYear === null && parsedMonth !== null) {
      notify.error('전환 연도 없이 월만 입력할 수 없습니다.')
      return
    }

    setTransitionBusy(true)
    try {
      await militaryUnitApi.addTransition(unit.id, {
        ...(transitionDirection === 'PREDECESSOR_UNIT'
          ? { predecessorUnitId: transitionTargetId }
          : transitionDirection === 'PREDECESSOR_DEPT'
            ? { predecessorDepartmentId: transitionTargetId }
            : { successorUnitId: transitionTargetId }),
        kind: transitionKind,
        era: parsedYear !== null ? transitionEra : null,
        year: parsedYear,
        month: parsedMonth,
        note: transitionNote.trim() || null,
      })
      await invalidateUnitData()
      setAddTransitionOpen(false)
      setTransitionTargetId('')
      setTransitionYear('')
      setTransitionMonth('')
      setTransitionNote('')
      notify.success('조직 계보 연결이 추가되었습니다.')
    } catch (err) {
      notify.error(getApiErrorMessage(err, '계보 연결 추가에 실패했습니다.'))
    } finally {
      setTransitionBusy(false)
    }
  }

  const openEditTransition = (item: MilitaryUnitLineageDto) => {
    setEditingTransitionId(item.transitionId)
    setEditTransitionKind(item.kind)
    setEditTransitionEra(item.era === 'BC' ? 'BC' : 'AD')
    setEditTransitionYear(item.year != null ? String(item.year) : '')
    setEditTransitionMonth(item.month != null ? String(item.month) : '')
    setEditTransitionNote(item.note ?? '')
  }

  const handleUpdateTransition = async (transitionId: string) => {
    const parsedYear = editTransitionYear.trim()
      ? Number(editTransitionYear.trim())
      : null
    const parsedMonth = editTransitionMonth.trim()
      ? Number(editTransitionMonth.trim())
      : null
    if (
      parsedYear !== null &&
      (!Number.isInteger(parsedYear) || parsedYear < 1)
    ) {
      notify.error('계보 전환 연도는 1 이상의 정수여야 합니다.')
      return
    }
    if (
      parsedMonth !== null &&
      (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12)
    ) {
      notify.error('계보 전환 월은 1~12 사이여야 합니다.')
      return
    }
    if (parsedYear === null && parsedMonth !== null) {
      notify.error('전환 연도 없이 월만 입력할 수 없습니다.')
      return
    }

    setTransitionBusy(true)
    try {
      await militaryUnitApi.updateTransition(transitionId, {
        kind: editTransitionKind,
        era: parsedYear !== null ? editTransitionEra : null,
        year: parsedYear,
        month: parsedMonth,
        note: editTransitionNote.trim() || null,
      })
      await invalidateUnitData()
      setEditingTransitionId(null)
      notify.success('계보 정보가 수정되었습니다.')
    } catch (err) {
      notify.error(getApiErrorMessage(err, '계보 수정에 실패했습니다.'))
    } finally {
      setTransitionBusy(false)
    }
  }

  const handleDeleteTransition = async (
    transitionId: string,
    targetLabel: string,
  ) => {
    const ok = await confirm({
      title: '조직 계보 연결 삭제',
      message: `'${targetLabel}' 계보 연결을 삭제하시겠습니까? (부대·부처 자체는 삭제되지 않습니다)`,
      confirmLabel: '삭제',
      danger: true,
    })
    if (!ok) return
    setTransitionBusy(true)
    try {
      await militaryUnitApi.deleteTransition(transitionId)
      await invalidateUnitData()
      if (editingTransitionId === transitionId) {
        setEditingTransitionId(null)
      }
      notify.success('계보 연결이 삭제되었습니다.')
    } catch (err) {
      notify.error(getApiErrorMessage(err, '계보 삭제에 실패했습니다.'))
    } finally {
      setTransitionBusy(false)
    }
  }

  const handleDeleteCommanderTenure = async (
    tenureItem: MilitaryUnitTenureItem,
  ) => {
    const roleLabel =
      tenureItem.title ??
      tenureItem.positionDefinition?.title ??
      '지휘관·참모 보직'
    const ok = await confirm({
      title: '지휘관·참모 재임 삭제',
      message: `'${roleLabel}' 재임 기록을 삭제하시겠습니까?`,
      confirmLabel: '삭제',
      danger: true,
    })
    if (!ok) return
    try {
      await personCareerApi.deleteGovernmentPositionTenure(tenureItem.id)
      invalidateTenureQueries(queryClient, {
        personId: tenureItem.person?.id ?? tenureItem.personId,
        countryId: unit.countryId ?? null,
        historicalCountryId: unit.historicalCountryId ?? null,
      })
      await invalidateUnitData()
      notify.success('재임 기록이 삭제되었습니다.')
    } catch (err) {
      notify.error(getApiErrorMessage(err, '재임 기록 삭제에 실패했습니다.'))
    }
  }

  const handleSaveDirectiveEvent = async () => {
    if (eventLinkBusy) return
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
          militaryUnitId: unit.id,
          role: eventRole,
          roleDescription: eventRoleDesc.trim() || null,
        })
        notify.success(`'${pendingEvent.title}' 사건을 연결했습니다.`)
      }
      setPendingEvent(null)
      setEditingEventLink(null)
      setEventRole('ISSUER')
      setEventRoleDesc('')
      await invalidateUnitData()
    } catch (err) {
      notify.error(getApiErrorMessage(err, '사건 연결 저장에 실패했습니다.'))
    } finally {
      setEventLinkBusy(false)
    }
  }

  const handleUnlinkDirectiveEvent = async (
    eventId: string,
    relationId: string,
    eventTitle: string,
  ) => {
    const ok = await confirm({
      title: '사건·지령 연결 해제',
      message: `'${eventTitle}' 연결을 해제하시겠습니까?`,
      confirmLabel: '해제',
      danger: true,
    })
    if (!ok) return
    try {
      await administrationDepartmentApi.unlinkDepartmentEvent(
        eventId,
        relationId,
      )
      await invalidateUnitData()
      notify.success('사건 연결이 해제되었습니다.')
    } catch (err) {
      notify.error(getApiErrorMessage(err, '사건 연결 해제에 실패했습니다.'))
    }
  }

  return (
    <PageCanvas>
      <TopBar>
        <TopBarLeft>
          {listSearch ? (
            <LedgerToolbarButton
              type="button"
              onClick={() => navigate(`${pathKeys.military()}${listSearch}`)}
            >
              <FiArrowLeft size={14} /> 군사 총람
            </LedgerToolbarButton>
          ) : (
            <>
              <LedgerToolbarButton
                type="button"
                onClick={() => goBackOr(navigate, pathKeys.military())}
              >
                <FiArrowLeft size={14} /> 이전 화면
              </LedgerToolbarButton>
              <LedgerToolbarButton
                type="button"
                onClick={() => navigate(pathKeys.military())}
              >
                <FiShield size={13} /> 군사 총람
              </LedgerToolbarButton>
            </>
          )}
          {countryName && countryIdForLink ? (
            <LedgerToolbarButton
              type="button"
              onClick={() =>
                navigate(pathKeys.countryMilitary(countryIdForLink, unit.id))
              }
            >
              <FiGlobe size={13} />
              <span>{countryName} 군사 탭</span>
              <FiArrowUpRight size={13} />
            </LedgerToolbarButton>
          ) : null}
        </TopBarLeft>

        <TopBarRight>
          <LedgerToolbarButton
            type="button"
            onClick={() => {
              setUnitFormEditingId(null)
              setUnitFormDefaults({
                parentUnitId: unit.id,
                countryId: unit.countryId ?? null,
                historicalCountryId: unit.historicalCountryId ?? null,
                administrationDepartmentId:
                  unit.administrationDepartmentId ??
                  unit.administrationDepartment?.id ??
                  null,
                branch: unit.branch ?? null,
              })
              setUnitFormOpen(true)
            }}
          >
            <FiPlus size={14} /> 예하 부대 추가
          </LedgerToolbarButton>
          <LedgerToolbarButton
            type="button"
            onClick={() => {
              setEditingTenure(null)
              setAppointmentOpen(true)
            }}
          >
            <FiUser size={14} /> 지휘관·참모 임명
          </LedgerToolbarButton>
          <LedgerToolbarButton
            type="button"
            onClick={() => {
              setUnitFormEditingId(unit.id)
              setUnitFormDefaults({})
              setUnitFormOpen(true)
            }}
          >
            <FiEdit2 size={13} /> 수정
          </LedgerToolbarButton>
          <LedgerCompactAction
            type="button"
            $danger
            onClick={() => void handleDeleteUnit()}
            style={{ height: 34, padding: '0 11px', borderRadius: 8 }}
          >
            <FiTrash2 size={13} /> 삭제
          </LedgerCompactAction>
        </TopBarRight>
      </TopBar>

      {/* 아이덴티티 헤더 카드 */}
      <LedgerSection>
        <IdentityHeader>
          <IdentityMain>
            {unit.insigniaUrl ? (
              <InsigniaImg
                src={getUploadImageUrl(unit.insigniaUrl)}
                alt={`${unit.name} 휘장`}
                onError={(evt) => {
                  evt.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <InsigniaFallback>
                <FiShield size={22} />
              </InsigniaFallback>
            )}

            <IdentityTitleGroup>
              <BadgeRow>
                <AccentBadge>{unitTypeLabel}</AccentBadge>
                {branchLabel ? <NeutralBadge>{branchLabel}</NeutralBadge> : null}
                <StatusPill $disbanded={isDisbanded}>
                  {isDisbanded ? '해체·종결' : '존속·현역'}
                </StatusPill>
              </BadgeRow>

              <UnitTitle>
                {unit.name}
                {unit.abbreviation ? (
                  <AbbrSpan> ({unit.abbreviation})</AbbrSpan>
                ) : null}
                {unit.nickname ? (
                  <NickSpan> “{unit.nickname}”</NickSpan>
                ) : null}
              </UnitTitle>

              {unit.nameLocal || unit.nameEn ? (
                <ForeignTitle>
                  {[unit.nameLocal, unit.nameEn].filter(Boolean).join(' · ')}
                </ForeignTitle>
              ) : null}
              {unit.motto ? <MottoLine>표어: {unit.motto}</MottoLine> : null}
            </IdentityTitleGroup>
          </IdentityMain>
        </IdentityHeader>

        <SpecStrip>
          <SpecCell>
            <SpecLabel>
              <FiCalendar size={11.5} /> 존속 기간
            </SpecLabel>
            <SpecValue>{periodDisplay}</SpecValue>
          </SpecCell>

          <SpecCell>
            <SpecLabel>
              <FiGlobe size={11.5} /> 소속 국가 · 정치체
            </SpecLabel>
            <SpecValue>
              {countryName && countryIdForLink ? (
                <InlineEntityBtn
                  type="button"
                  onClick={(evt) => {
                    if (!shouldInterceptEntityClick(evt)) {
                      navigate(
                        pathKeys.countryMilitary(countryIdForLink, unit.id),
                      )
                      return
                    }
                    setCountryModalTarget({
                      kind: unit.historicalCountry ? 'historical' : 'modern',
                      id: countryIdForLink,
                      name: countryName,
                    })
                  }}
                >
                  {countryName}
                </InlineEntityBtn>
              ) : (
                <MutedSpan>미지정</MutedSpan>
              )}
            </SpecValue>
          </SpecCell>

          <SpecCell>
            <SpecLabel>
              <FiShield size={11.5} /> 소관 중앙부처
            </SpecLabel>
            <SpecValue>
              {effectiveDepartment.dept ? (
                <InlineLink
                  to={pathKeys.government.departmentDetail(
                    effectiveDepartment.dept.id,
                  )}
                >
                  {effectiveDepartment.dept.name}
                  {effectiveDepartment.dept.abbreviation
                    ? ` (${effectiveDepartment.dept.abbreviation})`
                    : ''}
                  <FiArrowUpRight size={12} />
                  {effectiveDepartment.inherited ? (
                    <InheritedHint>(상급 승계)</InheritedHint>
                  ) : null}
                </InlineLink>
              ) : (
                <MutedSpan>직할 · 미연결</MutedSpan>
              )}
            </SpecValue>
          </SpecCell>

          <SpecCell>
            <SpecLabel>
              <FiMapPin size={11.5} /> 주둔지 · 병력 규모
            </SpecLabel>
            <SpecValue>
              {[
                unit.garrison ? unit.garrison : null,
                unit.strength ? `규모 ${unit.strength}` : null,
              ]
                .filter(Boolean)
                .join(' · ') || <MutedSpan>미등록</MutedSpan>}
            </SpecValue>
          </SpecCell>
        </SpecStrip>

        {unit.garrison?.trim() ? (
          <MapPreviewSection>
            <HeadquartersMapPreview
              headquarters={unit.garrison}
              countryName={countryName}
              departmentName={unit.name}
              showHeadline
            />
          </MapPreviewSection>
        ) : null}

        {contextMetaCards.length > 0 ? (
          <ContextMetaGrid>
            {contextMetaCards.map((card) => (
              <ContextMetaCard key={card.label}>
                <ContextMetaLabel>{card.label}</ContextMetaLabel>
                <ContextMetaBody>{card.body}</ContextMetaBody>
              </ContextMetaCard>
            ))}
          </ContextMetaGrid>
        ) : null}

        {unit.description ? (
          <DescriptionProse>{unit.description}</DescriptionProse>
        ) : null}
      </LedgerSection>

      {/* 1. 지휘 계통 · 예하 편제 + 개편 계보 */}
      <LedgerSection>
        <SectionHead>
          <SectionHeadTitle>
            지휘 계통 · 개편 계보
          </SectionHeadTitle>
          <LedgerCompactAction
            type="button"
            onClick={() => {
              setAddTransitionOpen((prev) => !prev)
              setTransitionTargetId('')
            }}
          >
            {addTransitionOpen ? (
              <>
                <FiX size={12} /> 닫기
              </>
            ) : (
              <>
                <FiPlus size={12} /> 계보 연결 추가
              </>
            )}
          </LedgerCompactAction>
        </SectionHead>

        <SectionBody>
          <ChainRow>
            {effectiveDepartment.dept ? (
              <>
                <ChainDeptLink
                  to={pathKeys.government.departmentDetail(
                    effectiveDepartment.dept.id,
                  )}
                  title={
                    effectiveDepartment.inherited
                      ? '상급 사령부를 통해 연결된 소관 국방·군정 부처'
                      : '직속 소관 국방·군정 부처'
                  }
                >
                  <NeutralBadge>중앙부처</NeutralBadge>
                  <strong>
                    {effectiveDepartment.dept.name}
                    {effectiveDepartment.dept.abbreviation
                      ? ` (${effectiveDepartment.dept.abbreviation})`
                      : ''}
                  </strong>
                  <FiArrowUpRight size={12} />
                </ChainDeptLink>
                <FiArrowRight size={13} />
              </>
            ) : null}

            {ancestorChain.length > 0 ? (
              ancestorChain.map((anc) => (
                <React.Fragment key={anc.id}>
                  <ChainNodeBtn
                    type="button"
                    onClick={() => navigateToUnit(anc.id)}
                  >
                    <NeutralBadge>
                      {anc.unitType
                        ? militaryUnitTypeLabelKo(anc.unitType)
                        : '상급 편제'}
                    </NeutralBadge>
                    <strong>
                      {anc.name}
                      {anc.abbreviation ? ` (${anc.abbreviation})` : ''}
                    </strong>
                  </ChainNodeBtn>
                  <FiArrowRight size={13} />
                </React.Fragment>
              ))
            ) : !effectiveDepartment.dept ? (
              <>
                <RootPill>최상위 편제 (상급 부대 없음)</RootPill>
                <FiArrowRight size={13} />
              </>
            ) : null}

            <CurrentNodePill>
              <AccentBadge>{unitTypeLabel}</AccentBadge>
              <strong>
                {unit.name}
                {unit.abbreviation ? ` (${unit.abbreviation})` : ''}
              </strong>
            </CurrentNodePill>
          </ChainRow>

          {/* 전신·후신 개편 계보 */}
          <SubBlock>
            <SubBlockLabel>
              <FiGitCommit size={12} /> 조직 개편 계보 ({predecessors.length + successors.length}건)
            </SubBlockLabel>

            {predecessors.length === 0 &&
            successors.length === 0 &&
            !addTransitionOpen ? (
              <MutedLine>
                등록된 전신·후신 개편 계보가 없습니다. (예: 제국전쟁부 → 국방군 최고사령부, 제2기갑집단 → 제2기갑군)
              </MutedLine>
            ) : null}

            {predecessors.length > 0 || successors.length > 0 ? (
              <LineageStack>
                {[
                  ...predecessors.map((predItem) => ({
                    directionLabel:
                      predItem.targetType === 'DEPARTMENT'
                        ? '전신 행정부처'
                        : '전신 부대',
                    arrowSymbol: '←',
                    item: predItem,
                  })),
                  ...successors.map((succItem) => ({
                    directionLabel: '후신 부대',
                    arrowSymbol: '→',
                    item: succItem,
                  })),
                ].map(({ directionLabel, arrowSymbol, item }) => {
                  const targetName =
                    item.targetType === 'DEPARTMENT'
                      ? (item.department?.name ?? '행정부처')
                      : (item.unit?.name ?? '군사부대')
                  const timeText = formatLineageTime(item)
                  const kindLabel =
                    TRANSITION_KIND_LABELS[item.kind] ?? item.kind
                  const isEditingThis =
                    editingTransitionId === item.transitionId

                  return (
                    <LineageRowCard key={item.transitionId}>
                      <LineageRowMain>
                        <AccentBadge>
                          {arrowSymbol} {directionLabel}
                        </AccentBadge>
                        <NeutralBadge>{kindLabel}</NeutralBadge>
                        {item.targetType === 'DEPARTMENT' && item.department ? (
                          <InlineLink
                            to={pathKeys.government.departmentDetail(
                              item.department.id,
                            )}
                          >
                            {item.department.name}
                            {item.department.abbreviation
                              ? ` (${item.department.abbreviation})`
                              : ''}
                            <FiArrowUpRight size={12} />
                          </InlineLink>
                        ) : item.unit ? (
                          <InlineEntityBtn
                            type="button"
                            onClick={() => navigateToUnit(item.unit!.id)}
                          >
                            {item.unit.name}
                            {item.unit.abbreviation
                              ? ` (${item.unit.abbreviation})`
                              : ''}
                            {item.unit.unitType
                              ? ` · ${militaryUnitTypeLabelKo(item.unit.unitType)}`
                              : ''}
                          </InlineEntityBtn>
                        ) : null}
                        {timeText ? <YearPill>{timeText}</YearPill> : null}
                        {item.note ? (
                          <LineageNote>— {item.note}</LineageNote>
                        ) : null}
                      </LineageRowMain>

                      <RowActions>
                        <LedgerIconButton
                          type="button"
                          $size="sm"
                          title="계보 수정"
                          aria-label={`${targetName} 계보 수정`}
                          onClick={() =>
                            isEditingThis
                              ? setEditingTransitionId(null)
                              : openEditTransition(item)
                          }
                        >
                          <FiEdit2 />
                        </LedgerIconButton>
                        <LedgerIconButton
                          type="button"
                          $size="sm"
                          $danger
                          title="계보 연결 삭제"
                          aria-label={`${targetName} 계보 연결 삭제`}
                          disabled={transitionBusy}
                          onClick={() =>
                            void handleDeleteTransition(
                              item.transitionId,
                              targetName,
                            )
                          }
                        >
                          <FiTrash2 />
                        </LedgerIconButton>
                      </RowActions>

                      {isEditingThis ? (
                        <InlineFormBox>
                          <InlineFormRow>
                            <FormSelect
                              aria-label="개편 유형"
                              value={editTransitionKind}
                              onChange={(evt) =>
                                setEditTransitionKind(
                                  evt.target.value as MilitaryUnitTransitionKind,
                                )
                              }
                            >
                              {TRANSITION_KIND_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </FormSelect>
                            <FormSelect
                              aria-label="기원"
                              value={editTransitionEra}
                              onChange={(evt) =>
                                setEditTransitionEra(
                                  evt.target.value as 'AD' | 'BC',
                                )
                              }
                              style={{ maxWidth: 88 }}
                            >
                              <option value="AD">서기</option>
                              <option value="BC">BC</option>
                            </FormSelect>
                            <FormInput
                              type="number"
                              placeholder="연도 (예: 1938)"
                              value={editTransitionYear}
                              onChange={(evt) =>
                                setEditTransitionYear(evt.target.value)
                              }
                              style={{ maxWidth: 124 }}
                            />
                            <FormInput
                              type="number"
                              placeholder="월 (1~12)"
                              value={editTransitionMonth}
                              onChange={(evt) =>
                                setEditTransitionMonth(evt.target.value)
                              }
                              style={{ maxWidth: 96 }}
                            />
                            <FormInput
                              type="text"
                              placeholder="개편 사유·비고"
                              value={editTransitionNote}
                              onChange={(evt) =>
                                setEditTransitionNote(evt.target.value)
                              }
                            />
                            <LedgerCompactAction
                              type="button"
                              $primary
                              disabled={transitionBusy}
                              onClick={() =>
                                void handleUpdateTransition(item.transitionId)
                              }
                            >
                              저장
                            </LedgerCompactAction>
                            <LedgerCompactAction
                              type="button"
                              onClick={() => setEditingTransitionId(null)}
                            >
                              취소
                            </LedgerCompactAction>
                          </InlineFormRow>
                        </InlineFormBox>
                      ) : null}
                    </LineageRowCard>
                  )
                })}
              </LineageStack>
            ) : null}

            {addTransitionOpen ? (
              <InlineFormBox>
                <InlineFormRow>
                  <FormSelect
                    aria-label="계보 방향"
                    value={transitionDirection}
                    onChange={(evt) => {
                      setTransitionDirection(
                        evt.target.value as TransitionDirection,
                      )
                      setTransitionTargetId('')
                    }}
                  >
                    <option value="PREDECESSOR_UNIT">
                      ← 전신 군사부대 (이전 부대 → {unit.name})
                    </option>
                    <option value="PREDECESSOR_DEPT">
                      ← 전신 행정부처 (전쟁부 등 → {unit.name})
                    </option>
                    <option value="SUCCESSOR_UNIT">
                      → 후신 군사부대 ({unit.name} → 후속 부대)
                    </option>
                  </FormSelect>

                  {transitionDirection === 'PREDECESSOR_DEPT' ? (
                    <FormSelect
                      aria-label="전신 행정부처 선택"
                      value={transitionTargetId}
                      onChange={(evt) => setTransitionTargetId(evt.target.value)}
                    >
                      <option value="">
                        {departmentsForLineageQuery.isLoading
                          ? '행정부처 불러오는 중…'
                          : '전신 행정부처 선택…'}
                      </option>
                      {candidateLineageDepartments.map((deptItem) => (
                        <option key={deptItem.id} value={deptItem.id}>
                          {deptItem.name}
                          {deptItem.abbreviation
                            ? ` (${deptItem.abbreviation})`
                            : ''}
                        </option>
                      ))}
                    </FormSelect>
                  ) : (
                    <FormSelect
                      aria-label="연결할 군사부대 선택"
                      value={transitionTargetId}
                      onChange={(evt) => setTransitionTargetId(evt.target.value)}
                    >
                      <option value="">
                        {transitionDirection === 'PREDECESSOR_UNIT'
                          ? '전신 군사부대 선택…'
                          : '후신 군사부대 선택…'}
                      </option>
                      {candidateLineageUnits.map((unitCandidate) => {
                        const candCountry =
                          unitCandidate.historicalCountry?.name ??
                          unitCandidate.country?.name
                        const candType = unitCandidate.unitType
                          ? militaryUnitTypeLabelKo(unitCandidate.unitType)
                          : null
                        const suffix = [candType, candCountry]
                          .filter(Boolean)
                          .join(' · ')
                        return (
                          <option key={unitCandidate.id} value={unitCandidate.id}>
                            {unitCandidate.name}
                            {suffix ? ` (${suffix})` : ''}
                          </option>
                        )
                      })}
                    </FormSelect>
                  )}

                  <FormSelect
                    aria-label="개편 유형"
                    value={transitionKind}
                    onChange={(evt) =>
                      setTransitionKind(
                        evt.target.value as MilitaryUnitTransitionKind,
                      )
                    }
                  >
                    {TRANSITION_KIND_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </FormSelect>
                </InlineFormRow>

                <InlineFormRow>
                  <FormSelect
                    aria-label="기원"
                    value={transitionEra}
                    onChange={(evt) =>
                      setTransitionEra(evt.target.value as 'AD' | 'BC')
                    }
                    style={{ maxWidth: 88 }}
                  >
                    <option value="AD">서기</option>
                    <option value="BC">BC</option>
                  </FormSelect>
                  <FormInput
                    type="number"
                    placeholder="전환 연도 (예: 1938)"
                    value={transitionYear}
                    onChange={(evt) => setTransitionYear(evt.target.value)}
                    style={{ maxWidth: 140 }}
                  />
                  <FormInput
                    type="number"
                    placeholder="월 (1~12)"
                    value={transitionMonth}
                    onChange={(evt) => setTransitionMonth(evt.target.value)}
                    style={{ maxWidth: 96 }}
                  />
                  <FormInput
                    type="text"
                    placeholder="개편 메모 (예: 국방군 최고사령부로 재편)"
                    value={transitionNote}
                    onChange={(evt) => setTransitionNote(evt.target.value)}
                  />
                  <LedgerPrimaryButton
                    type="button"
                    disabled={transitionBusy || !transitionTargetId}
                    onClick={() => void handleAddTransition()}
                  >
                    {transitionBusy ? '저장 중…' : '계보 연결'}
                  </LedgerPrimaryButton>
                </InlineFormRow>
              </InlineFormBox>
            ) : null}
          </SubBlock>

          {/* 예하 편제 목록 */}
          <SubBlock>
            <SubBlockHeadRow>
              <SubBlockLabel>
                <FiUsers size={12} />{' '}
                {subViewMode === 'tree' && hasGrandchildren
                  ? `하위 편제 계층 (${totalDescendantCount}개)`
                  : `직속 예하 편제 (${sortedSubUnits.length}개)`}
              </SubBlockLabel>
              <RowActions>
                {hasGrandchildren ? (
                  <SubViewSegment role="group" aria-label="예하 편제 보기 방식">
                    <SubViewSegBtn
                      type="button"
                      $active={subViewMode === 'cards'}
                      onClick={() => setSubViewMode('cards')}
                    >
                      <FiGrid size={11.5} /> 카드
                    </SubViewSegBtn>
                    <SubViewSegBtn
                      type="button"
                      $active={subViewMode === 'tree'}
                      onClick={() => setSubViewMode('tree')}
                    >
                      <FiList size={11.5} /> 계층 트리 ({totalDescendantCount})
                    </SubViewSegBtn>
                  </SubViewSegment>
                ) : null}
                <LedgerCompactAction
                  type="button"
                  onClick={() => {
                    setUnitFormEditingId(null)
                    setUnitFormDefaults({
                      parentUnitId: unit.id,
                      countryId: unit.countryId ?? null,
                      historicalCountryId: unit.historicalCountryId ?? null,
                      administrationDepartmentId:
                        unit.administrationDepartmentId ??
                        effectiveDepartment.dept?.id ??
                        null,
                      branch: unit.branch ?? null,
                    })
                    setUnitFormOpen(true)
                  }}
                >
                  <FiPlus size={12} /> 예하 추가
                </LedgerCompactAction>
              </RowActions>
            </SubBlockHeadRow>

            {sortedSubUnits.length === 0 ? (
              <MutedLine>직속 예하 편제가 등록되어 있지 않습니다.</MutedLine>
            ) : subViewMode === 'tree' && hasGrandchildren ? (
              <SubTreeContainer>
                {(() => {
                  const renderSubTreeNode = (
                    nodeItem: {
                      id: string
                      name: string
                      abbreviation?: string | null
                      unitType?: string | null
                      branch?: string | null
                    },
                    depth: number,
                    visitedSet: Set<string>,
                  ): React.ReactNode => {
                    const kids = (childrenByParentMap.get(nodeItem.id) ?? []).filter(
                      (k) => !visitedSet.has(k.id),
                    )
                    const isCollapsed = collapsedSubIds.has(nodeItem.id)
                    const nextVisited = new Set(visitedSet)
                    nextVisited.add(nodeItem.id)

                    return (
                      <SubTreeNodeWrap key={nodeItem.id}>
                        <SubTreeRow $depth={depth}>
                          {kids.length > 0 ? (
                            <SubTreeToggleBtn
                              type="button"
                              aria-label={isCollapsed ? '하위 펼치기' : '하위 접기'}
                              onClick={() =>
                                setCollapsedSubIds((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(nodeItem.id)) next.delete(nodeItem.id)
                                  else next.add(nodeItem.id)
                                  return next
                                })
                              }
                            >
                              {isCollapsed ? (
                                <FiChevronRight size={13} />
                              ) : (
                                <FiChevronDown size={13} />
                              )}
                            </SubTreeToggleBtn>
                          ) : (
                            <SubTreeSpacer />
                          )}
                          {nodeItem.unitType ? (
                            <AccentBadge>
                              {militaryUnitTypeLabelKo(nodeItem.unitType)}
                            </AccentBadge>
                          ) : null}
                          {nodeItem.branch ? (
                            <NeutralBadge>
                              {BRANCH_LABELS[nodeItem.branch] ?? nodeItem.branch}
                            </NeutralBadge>
                          ) : null}
                          <InlineEntityBtn
                            type="button"
                            onClick={() => navigateToUnit(nodeItem.id)}
                          >
                            {nodeItem.name}
                            {nodeItem.abbreviation
                              ? ` (${nodeItem.abbreviation})`
                              : ''}
                          </InlineEntityBtn>
                          {kids.length > 0 ? (
                            <MutedSpan style={{ fontSize: 11.5 }}>
                              예하 {kids.length}
                            </MutedSpan>
                          ) : null}
                        </SubTreeRow>
                        {kids.length > 0 && !isCollapsed ? (
                          <SubTreeChildren>
                            {kids.map((childNode) =>
                              renderSubTreeNode(childNode, depth + 1, nextVisited),
                            )}
                          </SubTreeChildren>
                        ) : null}
                      </SubTreeNodeWrap>
                    )
                  }

                  const rootVisited = new Set<string>([unit.id])
                  return sortedSubUnits.map((sub) =>
                    renderSubTreeNode(sub, 0, rootVisited),
                  )
                })()}
              </SubTreeContainer>
            ) : (
              <SubUnitGrid>
                {sortedSubUnits.map((sub) => (
                  <SubUnitCard
                    key={sub.id}
                    type="button"
                    onClick={() => navigateToUnit(sub.id)}
                  >
                    <BadgeRow>
                      {sub.unitType ? (
                        <AccentBadge>
                          {militaryUnitTypeLabelKo(sub.unitType)}
                        </AccentBadge>
                      ) : null}
                      {sub.branch ? (
                        <NeutralBadge>
                          {BRANCH_LABELS[sub.branch] ?? sub.branch}
                        </NeutralBadge>
                      ) : null}
                    </BadgeRow>
                    <SubUnitTitle>
                      {sub.name}
                      {sub.abbreviation ? ` (${sub.abbreviation})` : ''}
                    </SubUnitTitle>
                  </SubUnitCard>
                ))}
              </SubUnitGrid>
            )}
          </SubBlock>
        </SectionBody>
      </LedgerSection>

      {/* 2. 역대 지휘관 · 참모 */}
      <LedgerSection>
        <SectionHead>
          <SectionHeadLeft>
            <SectionHeadTitle>
              역대 지휘관 · 참모 ({totalCommanderCount}명)
            </SectionHeadTitle>
            {unifiedTenures.length > 1 ? (
              <LedgerCompactAction
                type="button"
                onClick={() =>
                  setCommanderSort((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                }
                title={
                  commanderSort === 'asc'
                    ? '현재 과거순 (클릭하여 최신순 전환)'
                    : '현재 최신순 (클릭하여 과거순 전환)'
                }
              >
                {commanderSort === 'asc' ? (
                  <>
                    <FiArrowUp size={11.5} /> 과거순
                  </>
                ) : (
                  <>
                    <FiArrowDown size={11.5} /> 최신순
                  </>
                )}
              </LedgerCompactAction>
            ) : null}
          </SectionHeadLeft>

          <RowActions>
            {totalCommanderCount > 3 ? (
              <CommanderSearchWrap>
                <FiSearch size={12} />
                <CommanderSearchInput
                  type="text"
                  value={commanderSearch}
                  onChange={(evt) => setCommanderSearch(evt.target.value)}
                  placeholder="인물·보직·계급 검색"
                  aria-label="역대 지휘관 검색"
                />
                {commanderSearch ? (
                  <CommanderSearchClear
                    type="button"
                    onClick={() => setCommanderSearch('')}
                    aria-label="검색어 지우기"
                  >
                    <FiX size={11} />
                  </CommanderSearchClear>
                ) : null}
              </CommanderSearchWrap>
            ) : null}
            <LedgerCompactAction
              type="button"
              onClick={() => {
                setEditingTenure(null)
                setAppointmentOpen(true)
              }}
            >
              <FiPlus size={12} /> 지휘관·참모 임명
            </LedgerCompactAction>
          </RowActions>
        </SectionHead>

        {countryIdForLink ? (
          <UnlinkedBarBox>
            <UnlinkedCountryTenuresBar
              mode="MILITARY_UNIT"
              effectiveCountryId={countryIdForLink}
              isHistorical={Boolean(unit.historicalCountryId && !unit.countryId)}
              targetOptions={sameCountryUnitOptions}
            />
          </UnlinkedBarBox>
        ) : null}

        {totalCommanderCount === 0 ? (
          <SectionEmpty>
            등록된 지휘관·참모 재임 기록이 없습니다. 우측 상단 버튼으로 사령관·참모장 등을 바로 임명할 수 있습니다.
          </SectionEmpty>
        ) : filteredTenures.length === 0 &&
          filteredLegacyCommanders.length === 0 ? (
          <SectionEmpty>
            ‘{commanderSearch}’ 검색어와 일치하는 지휘관·참모 기록이 없습니다.
          </SectionEmpty>
        ) : (
          <TableWrap>
            <LedgerTable>
              <thead>
                <tr>
                  <th>지휘관 · 참모</th>
                  <th>계급 · 보직명</th>
                  <th>재임 기간</th>
                  <th style={{ width: 84, textAlign: 'right' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenures.map((tenureItem) => {
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
                  const roleLabel =
                    [
                      tenureItem.rankTitle,
                      tenureItem.title ?? tenureItem.positionDefinition?.title,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '지휘관'
                  return (
                    <tr key={tenureItem.id}>
                      <td>
                        <ChipStack>
                          {tenureItem.ordinal != null ? (
                            <OrdinalBadge>제{tenureItem.ordinal}대</OrdinalBadge>
                          ) : null}
                          {targetPersonId ? (
                            <InlineEntityBtn
                              type="button"
                              onClick={(evt) => {
                                if (!shouldInterceptEntityClick(evt)) {
                                  navigate(
                                    pathKeys.personsTimelineDetail(
                                      targetPersonId,
                                    ),
                                  )
                                  return
                                }
                                setInspectPersonId(targetPersonId)
                              }}
                            >
                              <FiUser size={12} /> {personName}
                            </InlineEntityBtn>
                          ) : (
                            <span>{personName}</span>
                          )}
                          {tenureItem.party ? (
                            <PartyBadge $color={tenureItem.party.brandColor}>
                              {tenureItem.party.shortName ||
                                tenureItem.party.name}
                            </PartyBadge>
                          ) : null}
                        </ChipStack>
                      </td>
                      <td>{roleLabel}</td>
                      <td className="num">{formatTenureSpan(tenureItem)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <RowActions style={{ justifyContent: 'flex-end' }}>
                          <LedgerIconButton
                            type="button"
                            $size="sm"
                            title="보직 수정"
                            aria-label={`${personName} 보직 수정`}
                            onClick={() => {
                              setEditingTenure({
                                id: tenureItem.id,
                                personId: targetPersonId,
                                personName,
                                positionType: tenureItem.positionType ?? null,
                                positionDefinitionId:
                                  tenureItem.positionDefinitionId ?? null,
                                title: tenureItem.title ?? null,
                                rankTitle: tenureItem.rankTitle ?? null,
                                ordinal: tenureItem.ordinal ?? null,
                                partyId: tenureItem.partyId ?? null,
                                militaryUnitId: unit.id,
                                startDate: tenureItem.startDate ?? null,
                                endDate: tenureItem.endDate ?? null,
                                startEra: tenureItem.startEra ?? null,
                                startYear: tenureItem.startYear ?? null,
                                startMonth: tenureItem.startMonth ?? null,
                                startDay: tenureItem.startDay ?? null,
                                endEra: tenureItem.endEra ?? null,
                                endYear: tenureItem.endYear ?? null,
                                endMonth: tenureItem.endMonth ?? null,
                                endDay: tenureItem.endDay ?? null,
                                notes: tenureItem.notes ?? null,
                              })
                              setAppointmentOpen(true)
                            }}
                          >
                            <FiEdit2 />
                          </LedgerIconButton>
                          <LedgerIconButton
                            type="button"
                            $size="sm"
                            $danger
                            title="보직 삭제"
                            aria-label={`${personName} 보직 삭제`}
                            onClick={() =>
                              void handleDeleteCommanderTenure(tenureItem)
                            }
                          >
                            <FiTrash2 />
                          </LedgerIconButton>
                        </RowActions>
                      </td>
                    </tr>
                  )
                })}

                {filteredLegacyCommanders.map((cmd) => {
                  const fullName = cmd.person
                    ? [cmd.person.name, cmd.person.surname]
                        .filter(Boolean)
                        .join(' ')
                    : '인물 미상'
                  const startStr = cmd.startDate
                    ? cmd.startDate.slice(0, 10)
                    : '?'
                  const endStr = cmd.endDate
                    ? cmd.endDate.slice(0, 10)
                    : cmd.isCurrent
                      ? '현임'
                      : '?'
                  return (
                    <tr key={cmd.id}>
                      <td>
                        <InlineEntityBtn
                          type="button"
                          onClick={(evt) => {
                            if (!shouldInterceptEntityClick(evt)) {
                              navigate(
                                pathKeys.personsTimelineDetail(cmd.personId),
                              )
                              return
                            }
                            setInspectPersonId(cmd.personId)
                          }}
                        >
                          <FiUser size={12} /> {fullName}
                        </InlineEntityBtn>
                      </td>
                      <td>
                        {[cmd.rank, cmd.role].filter(Boolean).join(' · ') ||
                          '지휘관'}
                      </td>
                      <td className="num">
                        {startStr} ~ {endStr}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <NeutralBadge>레거시</NeutralBadge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </LedgerTable>
          </TableWrap>
        )}
      </LedgerSection>

      {/* 3. 배속 함정 */}
      {vessels.length > 0 ? (
        <LedgerSection>
          <SectionHead>
            <SectionHeadTitle>
              <FiAnchor size={13} style={{ marginRight: 5, verticalAlign: -1 }} />
              배속 함정 ({vessels.length}척)
            </SectionHeadTitle>
          </SectionHead>
          <SectionBody>
            <SubUnitGrid>
              {vessels.map((vessel) => (
                <VesselCard key={vessel.id}>
                  <AccentBadge>{vessel.vesselType ?? '함정'}</AccentBadge>
                  <strong>{vessel.name}</strong>
                  {vessel.vesselClass ? (
                    <NeutralBadge>{vessel.vesselClass}</NeutralBadge>
                  ) : null}
                </VesselCard>
              ))}
            </SubUnitGrid>
          </SectionBody>
        </LedgerSection>
      ) : null}

      {/* 4. 지령 · 작전 관여 사건 */}
      <LedgerSection>
        <SectionHead>
          <SectionHeadTitle>
            지령 · 작전 관여 사건 ({eventRelations.length}건)
          </SectionHeadTitle>
          <LedgerCompactAction
            type="button"
            onClick={() => setEventPickerOpen(true)}
          >
            <FiPlus size={12} /> 사건·지령 연결
          </LedgerCompactAction>
        </SectionHead>

        {pendingEvent || editingEventLink ? (
          <SectionBody style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <InlineFormBox>
              <InlineFormRow>
                <strong style={{ fontSize: 12.5 }}>
                  {editingEventLink
                    ? editingEventLink.event.title
                    : pendingEvent?.title}
                </strong>
                <FormSelect
                  aria-label="사건 관여 역할"
                  value={eventRole}
                  onChange={(evt) =>
                    setEventRole(
                      evt.target.value as AdministrationDepartmentEventRole,
                    )
                  }
                >
                  {DIRECTIVE_ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </FormSelect>
                <FormInput
                  type="text"
                  placeholder="세부 역할·지령 번호 (예: 총통 지령 제21호 입안)"
                  value={eventRoleDesc}
                  onChange={(evt) => setEventRoleDesc(evt.target.value)}
                />
                <LedgerCompactAction
                  type="button"
                  $primary
                  disabled={eventLinkBusy}
                  onClick={() => void handleSaveDirectiveEvent()}
                >
                  {eventLinkBusy ? '저장 중…' : '저장'}
                </LedgerCompactAction>
                <LedgerCompactAction
                  type="button"
                  onClick={() => {
                    setPendingEvent(null)
                    setEditingEventLink(null)
                  }}
                >
                  취소
                </LedgerCompactAction>
              </InlineFormRow>
            </InlineFormBox>
          </SectionBody>
        ) : null}

        {eventRelations.length === 0 ? (
          <SectionEmpty>
            연결된 지령 발령·작전 주관 사건이 없습니다. 최고사령부나 참모본부가 입안·발령한 작전·지령 사건을 연결할 수 있습니다.
          </SectionEmpty>
        ) : (
          <TableWrap>
            <LedgerTable>
              <thead>
                <tr>
                  <th style={{ width: 120 }}>시기</th>
                  <th>사건 · 지령명</th>
                  <th style={{ width: 150 }}>관여 역할</th>
                  <th>비고</th>
                  <th style={{ width: 84, textAlign: 'right' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {eventRelations.map((relItem) => {
                  const roleKo =
                    EVENT_DEPARTMENT_ROLE_LABEL[
                      relItem.role as EventDepartmentRoleValue
                    ] ?? relItem.role
                  return (
                    <tr key={relItem.relationId}>
                      <td className="num">
                        {relItem.event.startYear
                          ? `${relItem.event.startEra === 'BC' ? 'BC ' : ''}${relItem.event.startYear}`
                          : '—'}
                      </td>
                      <td>
                        <InlineLink to={pathKeys.events.detail(relItem.event.id)}>
                          {relItem.event.title}
                          <FiArrowUpRight size={12} />
                        </InlineLink>
                      </td>
                      <td>
                        <AccentBadge>{roleKo}</AccentBadge>
                      </td>
                      <td>{relItem.roleDescription || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <RowActions style={{ justifyContent: 'flex-end' }}>
                          <LedgerIconButton
                            type="button"
                            $size="sm"
                            title="역할 수정"
                            onClick={() => {
                              setPendingEvent(null)
                              setEditingEventLink(relItem)
                              setEventRole(
                                (relItem.role as AdministrationDepartmentEventRole) ||
                                  'ISSUER',
                              )
                              setEventRoleDesc(relItem.roleDescription ?? '')
                            }}
                          >
                            <FiEdit2 />
                          </LedgerIconButton>
                          <LedgerIconButton
                            type="button"
                            $size="sm"
                            $danger
                            title="연결 해제"
                            onClick={() =>
                              void handleUnlinkDirectiveEvent(
                                relItem.event.id,
                                relItem.relationId,
                                relItem.event.title,
                              )
                            }
                          >
                            <FiTrash2 />
                          </LedgerIconButton>
                        </RowActions>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </LedgerTable>
          </TableWrap>
        )}
      </LedgerSection>

      {/* 5. 참전 작전 · 전투 투입 기록 (ORBAT) */}
      <LedgerSection>
        <SectionHead>
          <SectionHeadTitle>
            참전 작전 · 전투 투입 기록 ({deployments.length}건)
          </SectionHeadTitle>
        </SectionHead>

        {deployments.length === 0 ? (
          <SectionEmpty>
            아직 이 편제가 전투서열(ORBAT)로 투입된 전쟁·전투 사건이 없습니다. 사건 상세 → 진영 → 전투서열에서 이 부대를 배치하면 자동으로 집계됩니다.
          </SectionEmpty>
        ) : (
          <TableWrap>
            <LedgerTable>
              <thead>
                <tr>
                  <th style={{ width: 136 }}>시기</th>
                  <th>작전 · 전투 (사건)</th>
                  <th style={{ width: 160 }}>소속 진영 · 결과</th>
                  <th>작전 편제 · 현장 지휘관 · 역할</th>
                  <th>부대 전과 · 투입 병기 · 기동</th>
                </tr>
              </thead>
              <tbody>
                {deployments.map((dep) => {
                  const ev = dep.side!.event!
                  const side = dep.side!
                  const dateLabel = formatStructuredEventSpan(ev)
                  const roleLabel =
                    dep.role && dep.role in SIDE_UNIT_ROLE_LABEL
                      ? SIDE_UNIT_ROLE_LABEL[
                          dep.role as keyof typeof SIDE_UNIT_ROLE_LABEL
                        ]
                      : null
                  const outcomeLabel =
                    side.outcome && side.outcome in SIDE_OUTCOME_LABEL
                      ? SIDE_OUTCOME_LABEL[
                          side.outcome as keyof typeof SIDE_OUTCOME_LABEL
                        ]
                      : null
                  const commanderName = dep.commander
                    ? [dep.commander.name, dep.commander.surname]
                        .filter(Boolean)
                        .join(' ')
                    : null
                  const weapons =
                    dep.deployedWeapons ?? dep.weaponsUsed ?? []
                  const mapFeatures = dep.mapFeatures ?? []
                  const unitMetrics = dep.metrics ?? []

                  return (
                    <tr key={dep.id}>
                      <td className="num">{dateLabel}</td>
                      <td>
                        <DeploymentEventCell>
                          <InlineLink to={pathKeys.events.detail(ev.id)}>
                            {ev.title}
                          </InlineLink>
                          {ev.kind === 'COLLECTION' ? (
                            <SurveyLink
                              to={`${pathKeys.events.detail(ev.id)}?tab=survey&unit=${encodeURIComponent(unit.id)}`}
                              title="전쟁·전역 조망 탭에서 이 부대의 전투서열·전황 보기"
                            >
                              <FiCompass size={11} /> 조망·전황
                            </SurveyLink>
                          ) : (
                            <>
                              <SurveyLink
                                to={`${pathKeys.events.detail(ev.id)}?tab=modules&unit=${encodeURIComponent(unit.id)}#module-sides`}
                                title="전투 사건 상세의 진영·전투서열(ORBAT)에서 이 부대 강조 보기"
                              >
                                <FiShield size={11} /> 전투서열
                              </SurveyLink>
                              {ev.parentEventId ? (
                                <SurveyLink
                                  to={`${pathKeys.events.detail(ev.parentEventId)}?tab=survey&sv=map&unit=${encodeURIComponent(unit.id)}&event=${encodeURIComponent(ev.id)}`}
                                  title={
                                    ev.parentEvent?.title
                                      ? `상위 전쟁(${ev.parentEvent.title}) 조망 지도에서 보기`
                                      : '상위 전쟁 조망 지도에서 보기'
                                  }
                                >
                                  <FiCompass size={11} /> 전역 지도
                                </SurveyLink>
                              ) : null}
                            </>
                          )}
                          {ev.parentEvent ? (
                            <ParentWarHintLink
                              to={pathKeys.events.detail(ev.parentEvent.id)}
                            >
                              상위: {ev.parentEvent.title}
                            </ParentWarHintLink>
                          ) : null}
                        </DeploymentEventCell>
                      </td>
                      <td>
                        <strong>{side.name}</strong>
                        {outcomeLabel ? (
                          <OutcomeSpan> ({outcomeLabel})</OutcomeSpan>
                        ) : null}
                      </td>
                      <td>
                        <ChipStack>
                          {dep.parentUnit ? (
                            <InlineEntityBtn
                              type="button"
                              onClick={() =>
                                navigateToUnit(dep.parentUnit!.id)
                              }
                            >
                              상급: {dep.parentUnit.name}
                            </InlineEntityBtn>
                          ) : null}
                          {dep.commander && commanderName ? (
                            <InlineEntityBtn
                              type="button"
                              onClick={(evt) => {
                                if (!shouldInterceptEntityClick(evt)) {
                                  navigate(
                                    pathKeys.personsTimelineDetail(
                                      dep.commander!.id,
                                    ),
                                  )
                                  return
                                }
                                setInspectPersonId(dep.commander!.id)
                              }}
                            >
                              <FiUser size={11.5} /> {commanderName}
                            </InlineEntityBtn>
                          ) : null}
                          {roleLabel || dep.note ? (
                            <MutedSpan>
                              {[roleLabel, dep.note]
                                .filter(Boolean)
                                .join(' — ')}
                            </MutedSpan>
                          ) : !dep.parentUnit && !dep.commander ? (
                            <MutedSpan>—</MutedSpan>
                          ) : null}
                        </ChipStack>
                      </td>
                      <td>
                        <ChipStack>
                          {unitMetrics.map((metricItem) => {
                            const rawVal =
                              metricItem.value ??
                              metricItem.low ??
                              metricItem.high
                            const formattedVal =
                              rawVal != null && Number.isFinite(Number(rawVal))
                                ? Number(rawVal).toLocaleString('ko-KR')
                                : (rawVal ?? '')
                            return (
                              <NeutralBadge key={metricItem.id}>
                                {metricItem.metricName}:{' '}
                                {metricItem.approx ? '약 ' : ''}
                                {formattedVal}
                                {metricItem.unit ? ` ${metricItem.unit}` : ''}
                              </NeutralBadge>
                            )
                          })}
                          {weapons.map((weaponEntry) => {
                            const assetName =
                              weaponEntry.groundVehicle?.name ??
                              weaponEntry.aircraft?.name ??
                              weaponEntry.navalVessel?.name ??
                              weaponEntry.weapon?.name ??
                              '병기'
                            const countParts = [
                              weaponEntry.quantity != null
                                ? `${weaponEntry.quantity.toLocaleString('ko-KR')}기`
                                : null,
                              weaponEntry.note ? weaponEntry.note : null,
                            ].filter(Boolean)
                            return (
                              <NeutralBadge key={weaponEntry.id}>
                                <FiShield size={10} />
                                {assetName}
                                {countParts.length > 0
                                  ? ` (${countParts.join(' · ')})`
                                  : ''}
                              </NeutralBadge>
                            )
                          })}
                          {mapFeatures.map((featItem) => {
                            const mapTargetUrl =
                              ev.kind === 'COLLECTION'
                                ? `${pathKeys.events.detail(featItem.eventId)}?tab=survey&sv=map&unit=${encodeURIComponent(unit.id)}`
                                : ev.parentEventId
                                  ? `${pathKeys.events.detail(ev.parentEventId)}?tab=survey&sv=map&unit=${encodeURIComponent(unit.id)}&event=${encodeURIComponent(ev.id)}`
                                  : `${pathKeys.events.detail(ev.id)}?tab=modules&unit=${encodeURIComponent(unit.id)}#module-sides`
                            return (
                              <SurveyLink
                                key={featItem.id}
                                to={mapTargetUrl}
                                title={
                                  featItem.description ??
                                  '조망 지도 또는 전투서열에서 기동 축선·배치 보기'
                                }
                              >
                                <FiCompass size={11} />
                                {featItem.title}
                                <FiArrowUpRight size={11} />
                              </SurveyLink>
                            )
                          })}
                          {unitMetrics.length === 0 &&
                          weapons.length === 0 &&
                          mapFeatures.length === 0 ? (
                            <MutedSpan>—</MutedSpan>
                          ) : null}
                        </ChipStack>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </LedgerTable>
          </TableWrap>
        )}
      </LedgerSection>

      <InstitutionAppointmentModal
        isOpen={appointmentOpen}
        onClose={() => {
          setAppointmentOpen(false)
          setEditingTenure(null)
        }}
        onSaved={() => {
          void invalidateUnitData()
        }}
        contextType="MILITARY_UNIT"
        countryId={unit.countryId ?? null}
        historicalCountryId={unit.historicalCountryId ?? null}
        countryName={countryName}
        militaryUnitId={unit.id}
        militaryUnitName={unit.name}
        militaryUnitType={unit.unitType ?? null}
        editingTenure={editingTenure}
      />

      <MilitaryUnitFormModal
        isOpen={unitFormOpen}
        onClose={() => {
          setUnitFormOpen(false)
          setUnitFormEditingId(null)
          setUnitFormDefaults({})
        }}
        onSaved={() => {
          void invalidateUnitData()
        }}
        editingUnitId={unitFormEditingId}
        defaultCountryId={unitFormDefaults.countryId ?? null}
        defaultHistoricalCountryId={
          unitFormDefaults.historicalCountryId ?? null
        }
        defaultParentUnitId={unitFormDefaults.parentUnitId ?? null}
        defaultAdministrationDepartmentId={
          unitFormDefaults.administrationDepartmentId ?? null
        }
        defaultBranch={unitFormDefaults.branch ?? null}
      />

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
        title={`${unit.name} 지령·작전 사건 선택`}
      />

      <PersonInlineModal
        personId={inspectPersonId}
        onClose={() => setInspectPersonId(null)}
        onOpenDetail={(pid) => {
          setInspectPersonId(null)
          navigate(pathKeys.personsTimelineDetail(pid))
        }}
      />

      <CountryInlineModal
        target={countryModalTarget}
        onClose={() => setCountryModalTarget(null)}
      />
    </PageCanvas>
  )
}

const PageCanvas = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px clamp(18px, 2.4vw, 32px) 56px;
  box-sizing: border-box;
`

const LoadingBox = styled.div`
  padding: 56px 24px;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const TopBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`

const TopBarLeft = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const TopBarRight = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const LedgerSection = styled.section`
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.MD};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  overflow: hidden;
`

const IdentityHeader = styled.div`
  padding: 20px 22px 16px;
`

const IdentityMain = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
`

const InsigniaImg = styled.img`
  width: 56px;
  height: 56px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const InsigniaFallback = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 10px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const IdentityTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
  flex: 1;
`

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

const AccentBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 700;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const NeutralBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const StatusPill = styled.span<{ $disbanded: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme, $disbanded }) =>
    $disbanded
      ? ledgerSubtleFill(theme.mode)
      : theme.mode === 'dark'
        ? 'rgba(16, 185, 129, 0.14)'
        : 'rgba(16, 185, 129, 0.1)'};
  color: ${({ theme, $disbanded }) =>
    $disbanded
      ? theme.colors.text.tertiary
      : theme.mode === 'dark'
        ? '#6ee7b7'
        : '#047857'};
`

const UnitTitle = styled.h1`
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.3;
`

const AbbrSpan = styled.span`
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const NickSpan = styled.span`
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const ForeignTitle = styled.div`
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const MottoLine = styled.div`
  font-size: 12px;
  font-style: italic;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SpecStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`

const SpecCell = styled.div`
  padding: 12px 16px;
  border-right: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  display: flex;
  flex-direction: column;
  gap: 4px;

  &:last-child {
    border-right: none;
  }
`

const SpecLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SpecValue = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  ${DIGIT_DISPLAY}
`

const DescriptionProse = styled.div`
  padding: 14px 22px 18px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  font-size: 13.5px;
  line-height: 1.65;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: pre-wrap;
`

const SectionHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 18px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

const SectionHeadTitle = styled.h2`
  margin: 0;
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  ${DIGIT_DISPLAY}
`

const SectionBody = styled.div`
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const SectionEmpty = styled.div`
  padding: 24px 18px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ChainRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ChainNodeBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 11px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 12.5px;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
`

const RootPill = styled.span`
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CurrentNodePill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12.5px;
`

const SubBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const SubBlockHeadRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const SubBlockLabel = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const MutedLine = styled.div`
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MutedSpan = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 500;
`

const LineageStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const LineageRowCard = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
`

const LineageRowMain = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  font-size: 12.5px;
`

const YearPill = styled.span`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11.5px;
  font-weight: 600;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  ${DIGIT_DISPLAY}
`

const LineageNote = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const RowActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const InlineFormBox = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

const InlineFormRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const FormSelect = styled.select`
  ${toolbarControlHeight}
  padding: 0 26px 0 10px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 12.5px;
  max-width: 260px;
`

const FormInput = styled.input`
  ${toolbarControlHeight}
  padding: 0 10px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 12.5px;
  flex: 1 1 180px;
`

const SubUnitGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
`

const SubUnitCard = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    background ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease;

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }
`

const SubUnitTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
`

const VesselCard = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const TableWrap = styled.div`
  overflow-x: auto;
`

const LedgerTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;

  th {
    padding: 8.5px 14px;
    font-size: 11px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.tertiary};
    border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
    white-space: nowrap;
  }

  td {
    padding: 10px 14px;
    font-size: 12.5px;
    color: ${({ theme }) => theme.colors.text.primary};
    border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
    vertical-align: middle;
  }

  td.num {
    ${DIGIT_DISPLAY}
    color: ${({ theme }) => theme.colors.text.secondary};
    white-space: nowrap;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  tbody tr:hover td {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const InlineEntityBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-family: inherit;
  font-size: inherit;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const InlineLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-weight: 600;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const DeploymentEventCell = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const SurveyLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 11px;
  font-weight: 600;
  text-decoration: none;

  &:hover {
    opacity: 0.88;
  }
`

const OutcomeSpan = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ChipStack = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
`

const InheritedHint = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MapPreviewSection = styled.div`
  padding: 14px 18px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const ContextMetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 10px;
  padding: 14px 18px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const ContextMetaCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

const ContextMetaLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ContextMetaBody = styled.div`
  font-size: 12.5px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: pre-wrap;
`

const ChainDeptLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 11px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12.5px;
  text-decoration: none;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
`

const SubViewSegment = styled.div`
  display: inline-flex;
  align-items: center;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: 7px;
  overflow: hidden;
`

const SubViewSegBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 9px;
  border: none;
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  cursor: pointer;

  &:not(:last-child) {
    border-right: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  }
`

const SubTreeContainer = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: 8px;
  overflow: hidden;
`

const SubTreeNodeWrap = styled.div`
  display: flex;
  flex-direction: column;
`

const SubTreeRow = styled.div<{ $depth: number }>`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px 12px 8px ${({ $depth }) => 12 + $depth * 22}px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  font-size: 12.5px;

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const SubTreeChildren = styled.div`
  display: flex;
  flex-direction: column;
`

const SubTreeToggleBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  }
`

const SubTreeSpacer = styled.span`
  display: inline-block;
  width: 20px;
  height: 20px;
`

const SectionHeadLeft = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const CommanderSearchWrap = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 8px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CommanderSearchInput = styled.input`
  border: none;
  outline: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 12px;
  width: 148px;
`

const CommanderSearchClear = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
`

const UnlinkedBarBox = styled.div`
  padding: 10px 18px 0;
`

const OrdinalBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  ${DIGIT_DISPLAY}
`

const PartyBadge = styled.span<{ $color?: string | null }>`
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid
    ${({ theme, $color }) => $color || ledgerHairlineStrong(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ParentWarHintLink = styled(Link)`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
  }
`
