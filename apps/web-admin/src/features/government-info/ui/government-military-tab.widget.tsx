import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiChevronDown,
  FiChevronRight,
  FiCompass,
  FiEdit2,
  FiExternalLink,
  FiGitCommit,
  FiGrid,
  FiList,
  FiMapPin,
  FiPlus,
  FiSearch,
  FiShield,
  FiTrash2,
  FiUser,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import {
  administrationDepartmentApi,
  type AdministrationDepartmentEventRole,
} from '@/shared/api/administration-department'
import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import {
  militaryUnitApi,
  type MilitaryUnit,
  type MilitaryUnitTenureItem,
  type MilitaryUnitType,
} from '@/shared/api/military-unit'
import { personCareerApi } from '@/shared/api/person-career'
import { signedYearFromIsoLike } from '@/shared/lib/country-period'
import { formatSignedYear } from '@/shared/lib/lifespan-text'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import {
  EventPickerModal,
  type EventPickerSelection,
} from '@/shared/ui/event-picker-modal/event-picker-modal'
import { InstitutionAppointmentModal } from '@/shared/ui/institution-appointment-modal'
import { notify } from '@/shared/ui/toast'

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
  onCreateUnit: (defaults?: CreateMilitaryUnitDefaults) => void
  onEditUnit: (unitId: string) => void
  onNavigateToDepartment?: (departmentId: string) => void
}

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

const EVENT_ROLE_LABEL: Record<AdministrationDepartmentEventRole, string> = {
  ISSUER: '지령 발령·하달',
  RECIPIENT: '수명·작전 이행',
  PRINCIPAL: '작전 주도·총괄',
  PARTICIPANT: '참여·관여',
  OTHER: '기타',
}

const EVENT_ROLE_KEYS: AdministrationDepartmentEventRole[] = [
  'ISSUER',
  'RECIPIENT',
  'PRINCIPAL',
  'PARTICIPANT',
  'OTHER',
]

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

type ExtendedMilitaryUnit = MilitaryUnit & {
  branch?: string | null
  nickname?: string | null
  motto?: string | null
  garrison?: string | null
  strength?: string | null
  primaryMission?: string | null
  jurisdiction?: string | null
  notableBattles?: string | null
  honors?: string | null
  administrationDepartmentId?: string | null
  administrationDepartment?: {
    id: string
    name: string
    abbreviation?: string | null
    kind?: string | null
  } | null
  commanders?: Array<{
    id: string
    tenureId?: string | null
    personId: string
    rank?: string | null
    role?: string | null
    isCurrent?: boolean | null
    startDate?: string | null
    endDate?: string | null
    termNumber?: number | null
    person?: {
      id: string
      name: string
      surname?: string | null
    }
  }>
  tenures?: MilitaryUnitTenureItem[]
  sideDeployedUnits?: Array<{
    id: string
    role?: string | null
    note?: string | null
    parentUnit?: { id: string; name: string; unitType?: string | null } | null
    commander?: { id: string; name: string; surname?: string | null } | null
    weaponsUsed?: Array<{
      id: string
      quantity?: string | null
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

function resolveUnitSignedStartYear(
  unitItem: ExtendedMilitaryUnit,
): number | null {
  if (unitItem.established?.year && unitItem.established.year > 0) {
    return unitItem.established.era === 'BC'
      ? -unitItem.established.year
      : unitItem.established.year
  }
  return signedYearFromIsoLike(unitItem.establishedDate)
}

function resolveUnitSignedEndYear(
  unitItem: ExtendedMilitaryUnit,
): number | null {
  if (unitItem.disbanded?.year && unitItem.disbanded.year > 0) {
    return unitItem.disbanded.era === 'BC'
      ? -unitItem.disbanded.year
      : unitItem.disbanded.year
  }
  return signedYearFromIsoLike(unitItem.disbandedDate)
}

function formatUnitPeriod(unitItem: ExtendedMilitaryUnit): string | null {
  const startYear = resolveUnitSignedStartYear(unitItem)
  const endYear = resolveUnitSignedEndYear(unitItem)
  if (startYear != null && endYear != null) {
    return `${formatSignedYear(startYear)} – ${formatSignedYear(endYear)}`
  }
  if (startYear != null) {
    return `${formatSignedYear(startYear)} – ${unitItem.isActive === false ? '해체' : '현재'}`
  }
  if (endYear != null) {
    return `? – ${formatSignedYear(endYear)}`
  }
  return null
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
    return iso.slice(0, 10).replace(/-/g, '.')
  }
  return ''
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

export function GovernmentMilitaryTab({
  country,
  effectiveCountryId,
  focusUnitId,
  onConsumedFocusUnit,
  onCreateUnit,
  onEditUnit,
  onNavigateToDepartment,
}: GovernmentMilitaryTabProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isHistorical = country?.type === 'historical'
  const targetId = effectiveCountryId ?? country?.id ?? ''

  const [viewMode, setViewMode] = useState<'TREE' | 'GRID'>('TREE')
  const [searchQuery, setSearchQuery] = useState('')
  const [eraFilter, setEraFilter] = useState<string>('ALL')
  const [deptFilter, setDeptFilter] = useState<string>('ALL')
  const [branchFilter, setBranchFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'ACTIVE' | 'DISBANDED'
  >('ALL')
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [appointmentOpen, setAppointmentOpen] = useState(false)
  const [editingTenure, setEditingTenure] =
    useState<MilitaryUnitTenureItem | null>(null)
  const [eventPickerOpen, setEventPickerOpen] = useState(false)
  const [pendingEvent, setPendingEvent] =
    useState<EventPickerSelection | null>(null)
  const [eventRole, setEventRole] =
    useState<AdministrationDepartmentEventRole>('ISSUER')
  const [eventRoleDesc, setEventRoleDesc] = useState('')
  const [eventLinkBusy, setEventLinkBusy] = useState(false)

  const linkedHistoricalIds = useMemo(() => {
    const idSet = new Set<string>()
    for (const item of country?.historicalCountries ?? []) {
      if (item.id) idSet.add(item.id)
    }
    return idSet
  }, [country?.historicalCountries])

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
        return unitItem.historicalCountryId === targetId
      }
      return (
        unitItem.countryId === targetId ||
        (unitItem.historicalCountryId != null &&
          linkedHistoricalIds.has(unitItem.historicalCountryId))
      )
    })
  }, [unitsQuery.data, targetId, isHistorical, linkedHistoricalIds])

  const unitByIdMap = useMemo(() => {
    const map = new Map<string, ExtendedMilitaryUnit>()
    for (const unitItem of countryUnits) {
      map.set(unitItem.id, unitItem)
    }
    return map
  }, [countryUnits])

  /** 외부(중앙부처 상세 등)에서 특정 부대 포커스 요청 시 선택 및 필터 해제 */
  useEffect(() => {
    if (!focusUnitId || countryUnits.length === 0) return
    if (unitByIdMap.has(focusUnitId)) {
      setSelectedUnitId(focusUnitId)
      setEraFilter('ALL')
      setDeptFilter('ALL')
      setBranchFilter('ALL')
      setStatusFilter('ALL')
    }
    onConsumedFocusUnit?.()
  }, [focusUnitId, countryUnits.length, unitByIdMap, onConsumedFocusUnit])

  /** 부대 목록이 로드되었을 때 선택된 부대가 없으면 최상위 대표 부대 자동 선택 */
  useEffect(() => {
    if (countryUnits.length === 0) {
      setSelectedUnitId(null)
      return
    }
    if (selectedUnitId && unitByIdMap.has(selectedUnitId)) return
    const sortedDefaults = [...countryUnits].sort(compareUnitsByEchelonAndYear)
    setSelectedUnitId(sortedDefaults[0]?.id ?? null)
  }, [countryUnits, selectedUnitId, unitByIdMap])

  const historicalEras = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>()
    for (const unitItem of countryUnits) {
      if (unitItem.historicalCountry?.id && unitItem.historicalCountry.name) {
        const histId = unitItem.historicalCountry.id
        const existing = map.get(histId)
        if (existing) {
          existing.count += 1
        } else {
          map.set(histId, {
            id: histId,
            name: unitItem.historicalCountry.name,
            count: 1,
          })
        }
      }
    }
    return Array.from(map.values())
  }, [countryUnits])

  const modernDirectCount = useMemo(
    () =>
      countryUnits.filter((unitItem) => !unitItem.historicalCountryId).length,
    [countryUnits],
  )

  /** 상위 부대를 따라가며 소속 중앙부처(군령기구) 도출 */
  const resolveEffectiveDepartment = useMemo(() => {
    return (
      unitItem: ExtendedMilitaryUnit,
    ): { id: string; name: string; abbreviation?: string | null } | null => {
      let cursor: ExtendedMilitaryUnit | undefined = unitItem
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
    return Array.from(map.values())
  }, [countryUnits, resolveEffectiveDepartment])

  const branchCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const unitItem of countryUnits) {
      const branchKey = unitItem.branch || 'UNSPECIFIED'
      counts.set(branchKey, (counts.get(branchKey) ?? 0) + 1)
    }
    return counts
  }, [countryUnits])

  const filteredUnits = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase()
    return countryUnits
      .filter((unitItem) => {
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
        if (branchFilter !== 'ALL') {
          const itemBranch = unitItem.branch || 'UNSPECIFIED'
          if (itemBranch !== branchFilter) return false
        }
        if (statusFilter === 'ACTIVE' && unitItem.isActive === false)
          return false
        if (statusFilter === 'DISBANDED' && unitItem.isActive !== false)
          return false
        if (!keyword) return true
        const commanderMatch = (unitItem.commanders ?? []).some((cmdItem) => {
          const fullName = `${cmdItem.person?.surname ?? ''} ${cmdItem.person?.name ?? ''}`.toLowerCase()
          return fullName.includes(keyword)
        })
        return (
          unitItem.name.toLowerCase().includes(keyword) ||
          (unitItem.abbreviation ?? '').toLowerCase().includes(keyword) ||
          (unitItem.nameLocal ?? '').toLowerCase().includes(keyword) ||
          (unitItem.nameEn ?? '').toLowerCase().includes(keyword) ||
          (unitItem.nickname ?? '').toLowerCase().includes(keyword) ||
          (unitItem.garrison ?? '').toLowerCase().includes(keyword) ||
          (unitItem.description ?? '').toLowerCase().includes(keyword) ||
          (unitItem.administrationDepartment?.name ?? '')
            .toLowerCase()
            .includes(keyword) ||
          commanderMatch
        )
      })
      .sort(compareUnitsByEchelonAndYear)
  }, [
    countryUnits,
    eraFilter,
    deptFilter,
    branchFilter,
    statusFilter,
    searchQuery,
    resolveEffectiveDepartment,
  ])

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

    return { groups, childrenByParentId }
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

  const deleteMutation = useMutation({
    mutationFn: (unitId: string) => militaryUnitApi.delete(unitId),
    onSuccess: (_, deletedId) => {
      void queryClient.invalidateQueries({ queryKey: ['military-units'] })
      void queryClient.invalidateQueries({
        queryKey: ['administration-departments'],
      })
      if (selectedUnitId === deletedId) {
        setSelectedUnitId(null)
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

  const handleLinkDirectiveEvent = async () => {
    if (!pendingEvent || !selectedUnitFull || eventLinkBusy) return
    setEventLinkBusy(true)
    try {
      await administrationDepartmentApi.linkDepartmentEvent(pendingEvent.id, {
        militaryUnitId: selectedUnitFull.id,
        role: eventRole,
        roleDescription: eventRoleDesc.trim() || null,
      })
      notify.success(`'${pendingEvent.title}' 사건·지령을 연결했습니다.`)
      setPendingEvent(null)
      setEventRole('ISSUER')
      setEventRoleDesc('')
      await refreshSelectedUnitQueries()
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : '사건 연결에 실패했습니다.',
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
    const periodLabel = formatUnitPeriod(unitItem)
    const leadCommander = unitItem.commanders?.[0]
    const leadCommanderName = leadCommander?.person
      ? getPersonDisplayName({
          name: leadCommander.person.name ?? '',
          surname: leadCommander.person.surname ?? undefined,
        }) || leadCommander.person.name
      : null
    const battleCount = unitItem.sideDeployedUnits?.length ?? 0

    return (
      <TreeNodeContainer key={unitItem.id} $depth={depth}>
        <TreeNodeRow
          $selected={isSelected}
          onClick={() => setSelectedUnitId(unitItem.id)}
        >
          <TreeIndentGuide $depth={depth}>
            {hasChildren ? (
              <CollapseToggleBtn
                type="button"
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
              <TreeLeafBullet />
            )}
          </TreeIndentGuide>

          <TreeNodeMain>
            <TreeNodeTitleLine>
              {unitItem.unitType && (
                <EchelonBadge $echelon={unitItem.unitType}>
                  {UNIT_TYPE_LABELS[unitItem.unitType] ?? unitItem.unitType}
                </EchelonBadge>
              )}
              {unitItem.branch && (
                <BranchBadge>
                  {BRANCH_LABELS[unitItem.branch] ?? unitItem.branch}
                </BranchBadge>
              )}
              <TreeNodeTitle>
                {unitItem.name}
                {unitItem.abbreviation ? ` (${unitItem.abbreviation})` : ''}
              </TreeNodeTitle>
              {unitItem.nickname && (
                <UnitNickname>&ldquo;{unitItem.nickname}&rdquo;</UnitNickname>
              )}
              <StatusDot $active={unitItem.isActive !== false}>
                {unitItem.isActive === false ? '해체' : '운용'}
              </StatusDot>
            </TreeNodeTitleLine>

            <TreeNodeMetaLine>
              {periodLabel && <MetaPill>{periodLabel}</MetaPill>}
              {!isHistorical && unitItem.historicalCountry?.name && (
                <MetaPill>🏛️ {unitItem.historicalCountry.name}</MetaPill>
              )}
              {leadCommanderName && (
                <MetaPill $highlight>
                  👤 {leadCommander?.rank ? `${leadCommander.rank} ` : ''}
                  {leadCommanderName}
                  {(unitItem.commanders?.length ?? 0) > 1
                    ? ` 외 ${(unitItem.commanders?.length ?? 1) - 1}`
                    : ''}
                </MetaPill>
              )}
              {hasChildren && (
                <MetaPill>예하 {children.length}개 부대</MetaPill>
              )}
              {battleCount > 0 && (
                <MetaPill $accent>⚔️ 참전 {battleCount}건</MetaPill>
              )}
            </TreeNodeMetaLine>
          </TreeNodeMain>

          <TreeNodeActions onClick={(event) => event.stopPropagation()}>
            <MiniActionBtn
              type="button"
              title="이 부대 산하에 예하 부대 추가"
              onClick={() =>
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
              }
            >
              <FiPlus size={12} />
              예하 추가
            </MiniActionBtn>
            <IconButton
              type="button"
              onClick={() => onEditUnit(unitItem.id)}
              title="부대 수정"
              aria-label={`${unitItem.name} 수정`}
            >
              <FiEdit2 size={13} />
            </IconButton>
            <IconButton
              type="button"
              $danger
              onClick={() => void handleDelete(unitItem)}
              title="부대 삭제"
              aria-label={`${unitItem.name} 삭제`}
            >
              <FiTrash2 size={13} />
            </IconButton>
          </TreeNodeActions>
        </TreeNodeRow>

        {hasChildren && !isCollapsed && (
          <TreeChildrenList>
            {children.map((childUnit) =>
              renderTreeNode(childUnit, depth + 1, nextVisited),
            )}
          </TreeChildrenList>
        )}
      </TreeNodeContainer>
    )
  }

  return (
    <Wrap>
      <HeaderBar>
        <div>
          <HeaderTitleRow>
            <HeaderTitle>군사 조직 및 지휘 계통 (ORBAT)</HeaderTitle>
            <CountBadge>{countryUnits.length}개 부대</CountBadge>
          </HeaderTitleRow>
          <HeaderDesc>
            최고사령부·국방부처 산하의 전구·집단군·전선군·야전군·군단·사단 편제
            계통과 역대 지휘관, 참전 전투를 입체적으로 관리합니다.
          </HeaderDesc>
        </div>
        <HeaderRightActions>
          <ViewModeToggle role="group" aria-label="보기 방식 전환">
            <ViewModeBtn
              type="button"
              $active={viewMode === 'TREE'}
              onClick={() => setViewMode('TREE')}
            >
              <FiList size={14} />
              계층 편제 트리
            </ViewModeBtn>
            <ViewModeBtn
              type="button"
              $active={viewMode === 'GRID'}
              onClick={() => setViewMode('GRID')}
            >
              <FiGrid size={14} />
              카드 그리드
            </ViewModeBtn>
          </ViewModeToggle>
          <PrimaryButton
            type="button"
            onClick={() =>
              onCreateUnit({
                historicalCountryId:
                  eraFilter !== 'ALL' && eraFilter !== 'MODERN'
                    ? eraFilter
                    : null,
                administrationDepartmentId:
                  deptFilter !== 'ALL' && deptFilter !== 'UNLINKED'
                    ? deptFilter
                    : null,
                branch:
                  branchFilter !== 'ALL' && branchFilter !== 'UNSPECIFIED'
                    ? branchFilter
                    : null,
              })
            }
          >
            <FiPlus size={15} />
            부대 등록
          </PrimaryButton>
        </HeaderRightActions>
      </HeaderBar>

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

      {countryUnits.length > 0 && (
        <Toolbar>
          <SearchBox>
            <FiSearch size={14} />
            <SearchInput
              type="text"
              placeholder="부대명, 별칭, 지휘관명, 소속 사령부, 주둔지 검색..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            {searchQuery && (
              <ClearButton
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="검색어 지우기"
              >
                <FiX size={13} />
              </ClearButton>
            )}
          </SearchBox>

          {!isHistorical && historicalEras.length > 0 && (
            <FilterGroup role="group" aria-label="시대·역사국가 필터">
              <FilterChip
                type="button"
                $active={eraFilter === 'ALL'}
                onClick={() => setEraFilter('ALL')}
              >
                전체 시대 ({countryUnits.length})
              </FilterChip>
              {modernDirectCount > 0 && (
                <FilterChip
                  type="button"
                  $active={eraFilter === 'MODERN'}
                  onClick={() => setEraFilter('MODERN')}
                >
                  현대군 ({modernDirectCount})
                </FilterChip>
              )}
              {historicalEras.map((eraItem) => (
                <FilterChip
                  key={eraItem.id}
                  type="button"
                  $active={eraFilter === eraItem.id}
                  onClick={() => setEraFilter(eraItem.id)}
                >
                  🏛️ {eraItem.name} ({eraItem.count})
                </FilterChip>
              ))}
            </FilterGroup>
          )}

          {commandDepartments.length > 0 && (
            <FilterGroup role="group" aria-label="상급 군령·국방기구 필터">
              <FilterChip
                type="button"
                $active={deptFilter === 'ALL'}
                onClick={() => setDeptFilter('ALL')}
              >
                전체 지휘부
              </FilterChip>
              {commandDepartments.map((deptItem) => (
                <FilterChip
                  key={deptItem.id}
                  type="button"
                  $active={deptFilter === deptItem.id}
                  onClick={() => setDeptFilter(deptItem.id)}
                >
                  🛡️ {deptItem.name}
                  {deptItem.abbreviation ? ` (${deptItem.abbreviation})` : ''} (
                  {deptItem.count})
                </FilterChip>
              ))}
              <FilterChip
                type="button"
                $active={deptFilter === 'UNLINKED'}
                onClick={() => setDeptFilter('UNLINKED')}
              >
                지휘부 미지정
              </FilterChip>
            </FilterGroup>
          )}

          <FilterGroup role="group" aria-label="군종 필터">
            <FilterChip
              type="button"
              $active={branchFilter === 'ALL'}
              onClick={() => setBranchFilter('ALL')}
            >
              전체 군종
            </FilterChip>
            {Array.from(branchCounts.entries()).map(([branchKey, count]) => (
              <FilterChip
                key={branchKey}
                type="button"
                $active={branchFilter === branchKey}
                onClick={() => setBranchFilter(branchKey)}
              >
                {branchKey === 'UNSPECIFIED'
                  ? '군종 미지정'
                  : (BRANCH_LABELS[branchKey] ?? branchKey)}{' '}
                ({count})
              </FilterChip>
            ))}
          </FilterGroup>

          <FilterGroup role="group" aria-label="운용 상태 필터">
            <FilterChip
              type="button"
              $active={statusFilter === 'ALL'}
              onClick={() => setStatusFilter('ALL')}
            >
              전체 상태
            </FilterChip>
            <FilterChip
              type="button"
              $active={statusFilter === 'ACTIVE'}
              onClick={() => setStatusFilter('ACTIVE')}
            >
              운용 중
            </FilterChip>
            <FilterChip
              type="button"
              $active={statusFilter === 'DISBANDED'}
              onClick={() => setStatusFilter('DISBANDED')}
            >
              해체·과거
            </FilterChip>
          </FilterGroup>
        </Toolbar>
      )}

      {unitsQuery.isLoading ? (
        <EmptyCard>불러오는 중…</EmptyCard>
      ) : countryUnits.length === 0 ? (
        <EmptyCard>
          <EmptyIcon>
            <FiShield size={24} />
          </EmptyIcon>
          <EmptyTitle>등록된 군사 조직·부대가 없습니다</EmptyTitle>
          <EmptyDesc>
            우측 상단 &apos;부대 등록&apos; 버튼을 눌러 집단군·야전군·군단·사단·함대·비행단 등
            군사 편제를 등록해 보세요.
          </EmptyDesc>
          <PrimaryButton type="button" onClick={() => onCreateUnit()}>
            <FiPlus size={15} />첫 부대 등록
          </PrimaryButton>
        </EmptyCard>
      ) : filteredUnits.length === 0 ? (
        <EmptyCard>조건에 맞는 부대가 없습니다.</EmptyCard>
      ) : viewMode === 'TREE' ? (
        <WorkspaceSplit>
          <TreeColumn>
            {hierarchyGroups.groups.map((groupItem) => (
              <DeptGroupCard key={groupItem.key}>
                <DeptGroupHeader>
                  <DeptGroupTitleWrap>
                    <FiShield size={15} color="#6366f1" />
                    <DeptGroupTitle>{groupItem.departmentName}</DeptGroupTitle>
                    {groupItem.departmentAbbreviation && (
                      <DeptGroupAbbr>
                        ({groupItem.departmentAbbreviation})
                      </DeptGroupAbbr>
                    )}
                    <CountBadge>{groupItem.roots.length}개 상급 편제</CountBadge>
                  </DeptGroupTitleWrap>
                  <DeptGroupActions>
                    {groupItem.departmentId && onNavigateToDepartment && (
                      <GhostLinkBtn
                        type="button"
                        onClick={() =>
                          onNavigateToDepartment(groupItem.departmentId!)
                        }
                      >
                        기관 상세 ↗
                      </GhostLinkBtn>
                    )}
                    <MiniActionBtn
                      type="button"
                      onClick={() =>
                        onCreateUnit({
                          administrationDepartmentId: groupItem.departmentId,
                          historicalCountryId: groupItem.historicalCountryId,
                        })
                      }
                    >
                      <FiPlus size={12} />
                      직할 부대 등록
                    </MiniActionBtn>
                  </DeptGroupActions>
                </DeptGroupHeader>
                <DeptGroupBody>
                  {groupItem.roots.map((rootUnit) =>
                    renderTreeNode(rootUnit, 0, new Set()),
                  )}
                </DeptGroupBody>
              </DeptGroupCard>
            ))}
          </TreeColumn>

          <DetailColumn>
            {selectedUnitFull ? (
              <DetailCard>
                <DetailTopBar>
                  <BadgeRow>
                    {selectedUnitFull.unitType && (
                      <EchelonBadge $echelon={selectedUnitFull.unitType}>
                        {UNIT_TYPE_LABELS[selectedUnitFull.unitType] ??
                          selectedUnitFull.unitType}
                      </EchelonBadge>
                    )}
                    {selectedUnitFull.branch && (
                      <BranchBadge>
                        {BRANCH_LABELS[selectedUnitFull.branch] ??
                          selectedUnitFull.branch}
                      </BranchBadge>
                    )}
                    <StatusDot $active={selectedUnitFull.isActive !== false}>
                      {selectedUnitFull.isActive === false
                        ? '해체됨'
                        : '운용 중'}
                    </StatusDot>
                  </BadgeRow>

                  <ActionGroup>
                    <MiniActionBtn
                      type="button"
                      onClick={() =>
                        onCreateUnit({
                          parentUnitId: selectedUnitFull.id,
                          administrationDepartmentId:
                            selectedUnitFull.administrationDepartmentId ??
                            selectedUnitFull.administrationDepartment?.id ??
                            resolveEffectiveDepartment(selectedUnitFull)?.id ??
                            null,
                          historicalCountryId:
                            selectedUnitFull.historicalCountryId ?? null,
                          branch: selectedUnitFull.branch ?? null,
                        })
                      }
                    >
                      <FiPlus size={12} />
                      예하 부대 추가
                    </MiniActionBtn>
                    <MiniActionBtn
                      type="button"
                      onClick={() => onEditUnit(selectedUnitFull.id)}
                    >
                      <FiEdit2 size={12} />
                      부대·계보 수정
                    </MiniActionBtn>
                    <MiniActionBtn
                      type="button"
                      onClick={() =>
                        navigate(pathKeys.militaryUnitDetail(selectedUnitFull.id))
                      }
                      title="군사 타임라인 페이지에서 전체 상세 보기"
                    >
                      <FiExternalLink size={12} />
                      전력 타임라인
                    </MiniActionBtn>
                  </ActionGroup>
                </DetailTopBar>

                <div>
                  <DetailTitle>
                    {selectedUnitFull.name}
                    {selectedUnitFull.abbreviation
                      ? ` (${selectedUnitFull.abbreviation})`
                      : ''}
                    {selectedUnitFull.nickname && (
                      <UnitNickname>
                        {' '}
                        · &ldquo;{selectedUnitFull.nickname}&rdquo;
                      </UnitNickname>
                    )}
                  </DetailTitle>
                  {(selectedUnitFull.nameLocal || selectedUnitFull.nameEn) && (
                    <DetailSubName>
                      {[selectedUnitFull.nameLocal, selectedUnitFull.nameEn]
                        .filter(Boolean)
                        .join(' · ')}
                    </DetailSubName>
                  )}
                  {selectedUnitFull.motto && (
                    <DetailMotto>&ldquo;{selectedUnitFull.motto}&rdquo;</DetailMotto>
                  )}
                </div>

                {/* 지휘 계통 (Command Chain) */}
                <DetailSection>
                  <DetailSectionLabel>
                    <FiGitCommit size={13} />
                    지휘 계통 · 상하 편제
                  </DetailSectionLabel>
                  <ChainStack>
                    {(() => {
                      const effDept =
                        selectedUnitFull.administrationDepartment ??
                        resolveEffectiveDepartment(selectedUnitFull)
                      if (!effDept) return null
                      return (
                        <ChainRow>
                          <ChainTag>소관 국방·군정부처</ChainTag>
                          <ChainLinkBtn
                            type="button"
                            onClick={() =>
                              onNavigateToDepartment?.(effDept.id)
                            }
                          >
                            🏛️ {effDept.name}
                          </ChainLinkBtn>
                        </ChainRow>
                      )
                    })()}

                    {selectedUnitFull.parentUnit ? (
                      <ChainRow>
                        <ChainTag>상위 사령부·부대</ChainTag>
                        <ChainLinkBtn
                          type="button"
                          onClick={() =>
                            setSelectedUnitId(selectedUnitFull.parentUnit!.id)
                          }
                        >
                          ↑ {selectedUnitFull.parentUnit.name}
                          {selectedUnitFull.parentUnit.abbreviation
                            ? ` (${selectedUnitFull.parentUnit.abbreviation})`
                            : ''}
                          {selectedUnitFull.parentUnit.unitType
                            ? ` · ${UNIT_TYPE_LABELS[selectedUnitFull.parentUnit.unitType] ?? selectedUnitFull.parentUnit.unitType}`
                            : ''}
                        </ChainLinkBtn>
                      </ChainRow>
                    ) : (
                      <ChainRow>
                        <ChainTag>상위 사령부·부대</ChainTag>
                        <ChainMuted>최상위 편제 (상위 부대 없음)</ChainMuted>
                      </ChainRow>
                    )}

                    <ChainRow>
                      <ChainTag>
                        직속 예하 부대 (
                        {selectedUnitFull.subUnits?.length ?? 0}개)
                      </ChainTag>
                      {selectedUnitFull.subUnits &&
                      selectedUnitFull.subUnits.length > 0 ? (
                        <ChipWrap>
                          {selectedUnitFull.subUnits.map((subItem) => (
                            <ChainLinkBtn
                              key={subItem.id}
                              type="button"
                              onClick={() => setSelectedUnitId(subItem.id)}
                            >
                              ↓ {subItem.name}
                              {subItem.abbreviation
                                ? ` (${subItem.abbreviation})`
                                : ''}
                              {subItem.unitType
                                ? ` · ${UNIT_TYPE_LABELS[subItem.unitType] ?? subItem.unitType}`
                                : ''}
                            </ChainLinkBtn>
                          ))}
                        </ChipWrap>
                      ) : (
                        <ChainMuted>등록된 직속 예하 부대 없음</ChainMuted>
                      )}
                    </ChainRow>

                    {((selectedUnitFull.predecessors?.length ?? 0) > 0 ||
                      (selectedUnitFull.successors?.length ?? 0) > 0) && (
                      <>
                        {selectedUnitFull.predecessors &&
                          selectedUnitFull.predecessors.length > 0 && (
                            <ChainRow>
                              <ChainTag>전신 기관·부대</ChainTag>
                              <ChipWrap>
                                {selectedUnitFull.predecessors.map(
                                  (predItem) => {
                                    if (
                                      predItem.targetType === 'DEPARTMENT' &&
                                      predItem.department
                                    ) {
                                      return (
                                        <ChainLinkBtn
                                          key={predItem.transitionId}
                                          type="button"
                                          onClick={() =>
                                            onNavigateToDepartment?.(
                                              predItem.department!.id,
                                            )
                                          }
                                          title={
                                            predItem.note ??
                                            '전신 행정부처 상세로 이동'
                                          }
                                        >
                                          🏛️ {predItem.department.name}
                                          {predItem.year
                                            ? ` (${predItem.era === 'BC' ? 'BC ' : ''}${predItem.year} 개편)`
                                            : ' (전신 부처)'}
                                        </ChainLinkBtn>
                                      )
                                    }
                                    if (predItem.unit) {
                                      return (
                                        <ChainLinkBtn
                                          key={predItem.transitionId}
                                          type="button"
                                          onClick={() =>
                                            setSelectedUnitId(
                                              predItem.unit!.id,
                                            )
                                          }
                                          title={predItem.note ?? undefined}
                                        >
                                          ← {predItem.unit.name}
                                          {predItem.year
                                            ? ` (${predItem.era === 'BC' ? 'BC ' : ''}${predItem.year})`
                                            : ''}
                                        </ChainLinkBtn>
                                      )
                                    }
                                    return null
                                  },
                                )}
                              </ChipWrap>
                            </ChainRow>
                          )}

                        {selectedUnitFull.successors &&
                          selectedUnitFull.successors.length > 0 && (
                            <ChainRow>
                              <ChainTag>후신 부대</ChainTag>
                              <ChipWrap>
                                {selectedUnitFull.successors.map((succItem) =>
                                  succItem.unit ? (
                                    <ChainLinkBtn
                                      key={succItem.transitionId}
                                      type="button"
                                      onClick={() =>
                                        setSelectedUnitId(succItem.unit!.id)
                                      }
                                      title={succItem.note ?? undefined}
                                    >
                                      → {succItem.unit.name}
                                      {succItem.year
                                        ? ` (${succItem.era === 'BC' ? 'BC ' : ''}${succItem.year})`
                                        : ''}
                                    </ChainLinkBtn>
                                  ) : null,
                                )}
                              </ChipWrap>
                            </ChainRow>
                          )}
                      </>
                    )}
                  </ChainStack>
                </DetailSection>

                {/* 기본 제원 (창설·주둔지·병력·시대) */}
                <DetailMetaGrid>
                  {formatUnitPeriod(selectedUnitFull) && (
                    <DetailMetaBox>
                      <DetailMetaLabel>존속 기간</DetailMetaLabel>
                      <DetailMetaVal>
                        {formatUnitPeriod(selectedUnitFull)}
                      </DetailMetaVal>
                    </DetailMetaBox>
                  )}
                  {selectedUnitFull.historicalCountry?.name && (
                    <DetailMetaBox>
                      <DetailMetaLabel>시대·정체 소속</DetailMetaLabel>
                      <DetailMetaVal>
                        🏛️ {selectedUnitFull.historicalCountry.name}
                      </DetailMetaVal>
                    </DetailMetaBox>
                  )}
                  {selectedUnitFull.garrison && (
                    <DetailMetaBox>
                      <DetailMetaLabel>본부·주둔지</DetailMetaLabel>
                      <DetailMetaVal>
                        <FiMapPin size={12} style={{ marginRight: 4 }} />
                        {selectedUnitFull.garrison}
                      </DetailMetaVal>
                    </DetailMetaBox>
                  )}
                  {selectedUnitFull.strength && (
                    <DetailMetaBox>
                      <DetailMetaLabel>병력 규모</DetailMetaLabel>
                      <DetailMetaVal>{selectedUnitFull.strength}</DetailMetaVal>
                    </DetailMetaBox>
                  )}
                </DetailMetaGrid>

                {/* 역대 지휘관 · 참모 (통합 GovernmentPositionTenure + 레거시 호환) */}
                <DetailSection>
                  <DetailSectionHeaderRow>
                    <DetailSectionLabel>
                      <FiUser size={13} />
                      역대 지휘관 · 참모 (
                      {(selectedUnitFull.tenures?.length ?? 0) +
                        (selectedUnitFull.commanders?.filter(
                          (cmdItem) => !cmdItem.tenureId,
                        ).length ?? 0)}
                      명)
                    </DetailSectionLabel>
                    <GhostLinkBtn
                      type="button"
                      onClick={() => {
                        setEditingTenure(null)
                        setAppointmentOpen(true)
                      }}
                    >
                      + 지휘관·참모 임명
                    </GhostLinkBtn>
                  </DetailSectionHeaderRow>

                  {(() => {
                    const unifiedTenures = selectedUnitFull.tenures ?? []
                    const legacyOnlyCommanders = (
                      selectedUnitFull.commanders ?? []
                    ).filter((cmdItem) => !cmdItem.tenureId)

                    if (
                      unifiedTenures.length === 0 &&
                      legacyOnlyCommanders.length === 0
                    ) {
                      return (
                        <ChainMuted>
                          등록된 지휘관·참모가 없습니다. 우측 상단 &lsquo;+
                          지휘관·참모 임명&rsquo;으로 인물을 바로 임명하면 인물
                          페이지 경력과도 자동 연동됩니다.
                        </ChainMuted>
                      )
                    }

                    return (
                      <CommanderList>
                        {unifiedTenures.map((tenureItem) => {
                          const targetPersonId =
                            tenureItem.person?.id ?? tenureItem.personId
                          const personName = tenureItem.person
                            ? getPersonDisplayName({
                                name: tenureItem.person.name ?? '',
                                surname:
                                  tenureItem.person.surname ?? undefined,
                                middleName:
                                  tenureItem.person.middleName ?? undefined,
                                country:
                                  tenureItem.person.country ?? undefined,
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
                            <CommanderItem key={tenureItem.id}>
                              <CommanderNameBtn
                                type="button"
                                onClick={() => {
                                  if (targetPersonId) {
                                    navigate(
                                      pathKeys.personsTimelineDetail(
                                        targetPersonId,
                                      ),
                                    )
                                  }
                                }}
                              >
                                {tenureItem.ordinal
                                  ? `제${tenureItem.ordinal}대 `
                                  : ''}
                                {tenureItem.rankTitle
                                  ? `${tenureItem.rankTitle} `
                                  : ''}
                                <strong>{personName}</strong>
                              </CommanderNameBtn>
                              <CommanderRoleBadge>
                                {roleText}
                              </CommanderRoleBadge>
                              {(startStr || endStr) && (
                                <CommanderPeriod>
                                  {startStr || '?'} – {endStr || '재임·미상'}
                                </CommanderPeriod>
                              )}
                              <CommanderInlineActions>
                                <CommanderMiniBtn
                                  type="button"
                                  onClick={() => setEditingTenure(tenureItem)}
                                >
                                  수정
                                </CommanderMiniBtn>
                                <CommanderMiniBtn
                                  type="button"
                                  $danger
                                  onClick={() =>
                                    void handleDeleteCommanderTenure(
                                      tenureItem,
                                    )
                                  }
                                >
                                  삭제
                                </CommanderMiniBtn>
                              </CommanderInlineActions>
                            </CommanderItem>
                          )
                        })}

                        {legacyOnlyCommanders.map((cmdItem) => {
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
                            <CommanderItem key={cmdItem.id}>
                              <CommanderNameBtn
                                type="button"
                                onClick={() =>
                                  navigate(
                                    pathKeys.personsTimelineDetail(
                                      cmdItem.personId,
                                    ),
                                  )
                                }
                              >
                                {cmdItem.termNumber
                                  ? `제${cmdItem.termNumber}대 `
                                  : ''}
                                {cmdItem.rank ? `${cmdItem.rank} ` : ''}
                                <strong>{personName}</strong>
                              </CommanderNameBtn>
                              {cmdItem.role && (
                                <CommanderRoleBadge>
                                  {cmdItem.role}
                                </CommanderRoleBadge>
                              )}
                              {(startStr || endStr) && (
                                <CommanderPeriod>
                                  {startStr}
                                  {startStr && endStr ? ' – ' : ''}
                                  {endStr}
                                </CommanderPeriod>
                              )}
                            </CommanderItem>
                          )
                        })}
                      </CommanderList>
                    )
                  })()}
                </DetailSection>

                {/* 지령 · 작전 관여 사건 (EventDepartmentRelation.militaryUnitId) */}
                <DetailSection>
                  <DetailSectionHeaderRow>
                    <DetailSectionLabel>
                      📜 지령 · 작전 관여 사건 (
                      {selectedUnitFull.eventRelations?.length ?? 0}건)
                    </DetailSectionLabel>
                    {!pendingEvent && (
                      <GhostLinkBtn
                        type="button"
                        onClick={() => setEventPickerOpen(true)}
                      >
                        + 지령·사건 연결
                      </GhostLinkBtn>
                    )}
                  </DetailSectionHeaderRow>

                  {pendingEvent && (
                    <EventLinkDraftBox>
                      <div style={{ fontSize: 12.5, fontWeight: 700 }}>
                        연결할 사건: {pendingEvent.title}
                      </div>
                      <ChipWrap>
                        {EVENT_ROLE_KEYS.map((roleKey) => (
                          <FilterChip
                            key={roleKey}
                            type="button"
                            $active={eventRole === roleKey}
                            onClick={() => setEventRole(roleKey)}
                          >
                            {EVENT_ROLE_LABEL[roleKey]}
                          </FilterChip>
                        ))}
                      </ChipWrap>
                      <SearchInput
                        type="text"
                        placeholder="역할 설명 (선택 — 예: 총통 지령 제21호 기안·하달, 작전계획 수립)"
                        value={eventRoleDesc}
                        onChange={(changeEvent) =>
                          setEventRoleDesc(changeEvent.target.value)
                        }
                        style={{
                          padding: '6px 10px',
                          borderRadius: 7,
                          border: '1px solid rgba(148,163,184,0.35)',
                        }}
                      />
                      <ActionGroup>
                        <PrimaryButton
                          type="button"
                          disabled={eventLinkBusy}
                          onClick={() => void handleLinkDirectiveEvent()}
                          style={{ padding: '5px 12px', fontSize: 12 }}
                        >
                          {eventLinkBusy ? '연결 중…' : '연결 저장'}
                        </PrimaryButton>
                        <MiniActionBtn
                          type="button"
                          onClick={() => {
                            setPendingEvent(null)
                            setEventRoleDesc('')
                          }}
                        >
                          취소
                        </MiniActionBtn>
                      </ActionGroup>
                    </EventLinkDraftBox>
                  )}

                  {selectedUnitFull.eventRelations &&
                  selectedUnitFull.eventRelations.length > 0 ? (
                    <BattleList>
                      {selectedUnitFull.eventRelations.map((relItem) => {
                        const roleKo =
                          EVENT_ROLE_LABEL[
                            relItem.role as AdministrationDepartmentEventRole
                          ] ?? relItem.role
                        const yearLabel = relItem.event.startYear
                          ? `[${relItem.event.startEra === 'BC' ? 'BC ' : ''}${relItem.event.startYear}] `
                          : ''
                        return (
                          <BattleCard key={relItem.relationId}>
                            <BattleTopRow>
                              <BattleTitleBtn
                                type="button"
                                onClick={() =>
                                  navigate(
                                    pathKeys.events.detail(relItem.event.id),
                                  )
                                }
                              >
                                {yearLabel}
                                {relItem.event.title}
                              </BattleTitleBtn>
                              <BattleLinks>
                                <CommanderRoleBadge>
                                  {roleKo}
                                </CommanderRoleBadge>
                                <CommanderMiniBtn
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
                                </CommanderMiniBtn>
                              </BattleLinks>
                            </BattleTopRow>
                            {relItem.roleDescription && (
                              <BattleMetaRow>
                                <span>{relItem.roleDescription}</span>
                              </BattleMetaRow>
                            )}
                          </BattleCard>
                        )
                      })}
                    </BattleList>
                  ) : (
                    <ChainMuted>
                      지령 하달·수명·작전 총괄로 연결된 사건이 없습니다.
                    </ChainMuted>
                  )}
                </DetailSection>

                {/* 참전 전투 · 작전 (사건 전투서열 연동) */}
                <DetailSection>
                  <DetailSectionLabel>
                    <FiCompass size={13} />
                    참전 사건 · 전투서열 기록 (
                    {selectedUnitFull.sideDeployedUnits?.length ?? 0}건)
                  </DetailSectionLabel>
                  {selectedUnitFull.sideDeployedUnits &&
                  selectedUnitFull.sideDeployedUnits.length > 0 ? (
                    <BattleList>
                      {selectedUnitFull.sideDeployedUnits.map((deployment) => {
                        const eventRecord = deployment.side.event
                        const startYear = signedYearFromIsoLike(
                          eventRecord.startDate,
                        )
                        const weaponCount = deployment.weaponsUsed?.length ?? 0
                        const vectorCount = deployment.mapFeatures?.length ?? 0
                        const battleCommanderName = deployment.commander
                          ? getPersonDisplayName({
                              name: deployment.commander.name ?? '',
                              surname:
                                deployment.commander.surname ?? undefined,
                            }) || deployment.commander.name
                          : null
                        return (
                          <BattleCard key={deployment.id}>
                            <BattleTopRow>
                              <BattleTitleBtn
                                type="button"
                                onClick={() =>
                                  navigate(`/events/${eventRecord.id}`)
                                }
                              >
                                {startYear != null
                                  ? `[${formatSignedYear(startYear)}] `
                                  : ''}
                                {eventRecord.title}
                              </BattleTitleBtn>
                              <BattleLinks>
                                <GhostLinkBtn
                                  type="button"
                                  onClick={() =>
                                    navigate(
                                      `/events/${eventRecord.id}/overview?tab=survey&unit=${selectedUnitFull.id}`,
                                    )
                                  }
                                >
                                  조망·기동선 ↗
                                </GhostLinkBtn>
                              </BattleLinks>
                            </BattleTopRow>
                            <BattleMetaRow>
                              <span>진영: {deployment.side.name}</span>
                              {deployment.role && (
                                <span>· 임무: {deployment.role}</span>
                              )}
                              {deployment.parentUnit && (
                                <span>
                                  · 전투 당시 상급부대:{' '}
                                  {deployment.parentUnit.name}
                                </span>
                              )}
                              {battleCommanderName && (
                                <span>
                                  · 전투 지휘관: {battleCommanderName}
                                </span>
                              )}
                              {weaponCount > 0 && (
                                <span>· 배속 무기 {weaponCount}종</span>
                              )}
                              {vectorCount > 0 && (
                                <span>· 전선/기동 벡터 {vectorCount}개</span>
                              )}
                            </BattleMetaRow>
                          </BattleCard>
                        )
                      })}
                    </BattleList>
                  ) : (
                    <ChainMuted>
                      아직 참전(전투서열 투입)으로 연결된 사건이 없습니다.
                    </ChainMuted>
                  )}
                </DetailSection>

                {(selectedUnitFull.primaryMission ||
                  selectedUnitFull.jurisdiction ||
                  selectedUnitFull.description) && (
                  <DetailSection>
                    <DetailSectionLabel>임무 · 관할 · 개요</DetailSectionLabel>
                    {selectedUnitFull.primaryMission && (
                      <DetailParagraph>
                        <strong>주요 임무:</strong>{' '}
                        {selectedUnitFull.primaryMission}
                      </DetailParagraph>
                    )}
                    {selectedUnitFull.jurisdiction && (
                      <DetailParagraph>
                        <strong>작전 관할:</strong>{' '}
                        {selectedUnitFull.jurisdiction}
                      </DetailParagraph>
                    )}
                    {selectedUnitFull.description && (
                      <DetailParagraph>
                        {selectedUnitFull.description}
                      </DetailParagraph>
                    )}
                  </DetailSection>
                )}
              </DetailCard>
            ) : (
              <EmptyCard>
                좌측 편제 트리에서 부대를 선택하면 지휘 계통·역대 지휘관·참전
                전투 상세가 표시됩니다.
              </EmptyCard>
            )}
          </DetailColumn>
        </WorkspaceSplit>
      ) : (
        <UnitGrid>
          {filteredUnits.map((unitItem) => {
            const periodLabel = formatUnitPeriod(unitItem)
            const effDept = resolveEffectiveDepartment(unitItem)
            const leadCommander = unitItem.commanders?.[0]
            const leadCommanderName = leadCommander?.person
              ? getPersonDisplayName({
                  name: leadCommander.person.name ?? '',
                  surname: leadCommander.person.surname ?? undefined,
                }) || leadCommander.person.name
              : null
            return (
              <UnitCard key={unitItem.id}>
                <CardTop>
                  <BadgeRow>
                    {unitItem.branch && (
                      <BranchBadge>
                        {BRANCH_LABELS[unitItem.branch] ?? unitItem.branch}
                      </BranchBadge>
                    )}
                    {unitItem.unitType && (
                      <TypeBadge>
                        {UNIT_TYPE_LABELS[unitItem.unitType] ??
                          unitItem.unitType}
                      </TypeBadge>
                    )}
                    <StatusDot $active={unitItem.isActive !== false}>
                      {unitItem.isActive === false ? '해체' : '운용 중'}
                    </StatusDot>
                  </BadgeRow>

                  <ActionGroup>
                    <IconButton
                      type="button"
                      onClick={() =>
                        onCreateUnit({
                          parentUnitId: unitItem.id,
                          administrationDepartmentId: effDept?.id ?? null,
                          historicalCountryId:
                            unitItem.historicalCountryId ?? null,
                          branch: unitItem.branch ?? null,
                        })
                      }
                      title="예하 부대 추가"
                      aria-label={`${unitItem.name} 예하 부대 추가`}
                    >
                      <FiPlus size={14} />
                    </IconButton>
                    <IconButton
                      type="button"
                      onClick={() => onEditUnit(unitItem.id)}
                      title="부대 수정"
                      aria-label={`${unitItem.name} 수정`}
                    >
                      <FiEdit2 size={14} />
                    </IconButton>
                    <IconButton
                      type="button"
                      $danger
                      onClick={() => void handleDelete(unitItem)}
                      title="부대 삭제"
                      aria-label={`${unitItem.name} 삭제`}
                    >
                      <FiTrash2 size={14} />
                    </IconButton>
                  </ActionGroup>
                </CardTop>

                <UnitName
                  onClick={() => {
                    setSelectedUnitId(unitItem.id)
                    setViewMode('TREE')
                  }}
                >
                  {unitItem.name}
                  {unitItem.abbreviation ? ` (${unitItem.abbreviation})` : ''}
                  {unitItem.nickname && (
                    <UnitNickname>
                      {' '}
                      · &ldquo;{unitItem.nickname}&rdquo;
                    </UnitNickname>
                  )}
                </UnitName>

                <MetaList>
                  {periodLabel && <MetaItem>기간: {periodLabel}</MetaItem>}
                  {effDept && <MetaItem>지휘부: 🛡️ {effDept.name}</MetaItem>}
                  {unitItem.parentUnit && (
                    <MetaItem>상위 부대: {unitItem.parentUnit.name}</MetaItem>
                  )}
                  {leadCommanderName && (
                    <MetaItem>지휘관: 👤 {leadCommanderName}</MetaItem>
                  )}
                  {unitItem.garrison && (
                    <MetaItem>주둔지: {unitItem.garrison}</MetaItem>
                  )}
                  {unitItem.historicalCountry && !isHistorical && (
                    <MetaItem>
                      시대 소속: 🏛️ {unitItem.historicalCountry.name}
                    </MetaItem>
                  )}
                </MetaList>

                {unitItem.description && (
                  <UnitDesc>{unitItem.description}</UnitDesc>
                )}
              </UnitCard>
            )
          })}
        </UnitGrid>
      )}

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
          setPendingEvent(pickedEvent)
          setEventPickerOpen(false)
        }}
        title={`${selectedUnitFull?.name ?? '사령부·부대'} 지령·작전 사건 선택`}
      />
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
`

const HeaderBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 20px;
`

const HeaderRightActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`

const ViewModeToggle = styled.div`
  display: inline-flex;
  padding: 3px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const ViewModeBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 7px;
  border: none;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.primary : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? '#ffffff' : theme.colors.text.secondary};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
`

const HeaderTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const HeaderTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CountBadge = styled.span`
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: ${({ theme }) => theme.colors.background.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeaderDesc = styled.p`
  margin: 4px 0 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 9px;
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    opacity: 0.92;
  }
`

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
`

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 240px;
  flex: 1;
  max-width: 360px;
  padding: 7px 11px;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SearchInput = styled.input`
  flex: 1;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
  outline: none;
`

const ClearButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
`

const FilterGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
`

const FilterChip = styled.button<{ $active: boolean }>`
  padding: 5px 11px;
  border-radius: 999px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border.default};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  cursor: pointer;
`

const WorkspaceSplit = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(360px, 0.95fr);
  gap: 18px;
  align-items: start;

  @media (max-width: 1120px) {
    grid-template-columns: 1fr;
  }
`

const TreeColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
`

const DetailColumn = styled.div`
  position: sticky;
  top: 20px;
  min-width: 0;
`

const DeptGroupCard = styled.section`
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  overflow: hidden;
`

const DeptGroupHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.tertiary};
`

const DeptGroupTitleWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const DeptGroupTitle = styled.h4`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const DeptGroupAbbr = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const DeptGroupActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const DeptGroupBody = styled.div`
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 4px;
`

const TreeNodeContainer = styled.div<{ $depth: number }>`
  display: flex;
  flex-direction: column;
  gap: 3px;
`

const TreeNodeRow = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 9px 11px;
  border-radius: 10px;
  border: 1px solid
    ${({ $selected, theme }) =>
      $selected ? theme.colors.primary : 'transparent'};
  background: ${({ $selected, theme }) =>
    $selected ? theme.colors.activeLight : 'transparent'};
  cursor: pointer;
  transition: background 0.14s ease, border-color 0.14s ease;

  &:hover {
    background: ${({ $selected, theme }) =>
      $selected
        ? theme.colors.activeLight
        : theme.colors.background.tertiary};
  }
`

const TreeIndentGuide = styled.div<{ $depth: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: ${({ $depth }) => $depth * 18}px;
  padding-top: 2px;
  flex-shrink: 0;
`

const CollapseToggleBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.background.secondary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const TreeLeafBullet = styled.span`
  width: 6px;
  height: 6px;
  margin: 0 7px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.border.medium};
`

const TreeNodeMain = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const TreeNodeTitleLine = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
`

const TreeNodeTitle = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const TreeNodeMetaLine = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
`

const MetaPill = styled.span<{ $highlight?: boolean; $accent?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 7px;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: ${({ $highlight, $accent }) =>
    $highlight || $accent ? 600 : 500};
  background: ${({ $highlight, $accent, theme }) =>
    $accent
      ? 'rgba(245, 158, 11, 0.14)'
      : $highlight
        ? 'rgba(99, 102, 241, 0.12)'
        : theme.colors.background.tertiary};
  color: ${({ $highlight, $accent, theme }) =>
    $accent
      ? '#d97706'
      : $highlight
        ? '#6366f1'
        : theme.colors.text.secondary};
`

const TreeNodeActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`

const TreeChildrenList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const EchelonBadge = styled.span<{ $echelon: string }>`
  padding: 2px 7px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  background: ${({ $echelon }) =>
    ['SUPREME_COMMAND', 'GENERAL_STAFF', 'SERVICE_HQ'].includes($echelon)
      ? 'rgba(139, 92, 246, 0.16)'
      : ['THEATER', 'ARMY_GROUP', 'FRONT'].includes($echelon)
        ? 'rgba(220, 38, 38, 0.14)'
        : ['FIELD_ARMY', 'FLEET', 'AIR_FLEET'].includes($echelon)
          ? 'rgba(217, 119, 6, 0.15)'
          : ['CORPS', 'AIR_CORPS'].includes($echelon)
            ? 'rgba(37, 99, 235, 0.14)'
            : 'rgba(16, 185, 129, 0.14)'};
  color: ${({ $echelon }) =>
    ['SUPREME_COMMAND', 'GENERAL_STAFF', 'SERVICE_HQ'].includes($echelon)
      ? '#8b5cf6'
      : ['THEATER', 'ARMY_GROUP', 'FRONT'].includes($echelon)
        ? '#ef4444'
        : ['FIELD_ARMY', 'FLEET', 'AIR_FLEET'].includes($echelon)
          ? '#d97706'
          : ['CORPS', 'AIR_CORPS'].includes($echelon)
            ? '#3b82f6'
            : '#10b981'};
`

const DetailSubName = styled.div`
  margin-top: 3px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CommanderInlineActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 4px;
`

const CommanderMiniBtn = styled.button<{ $danger?: boolean }>`
  padding: 2px 7px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ $danger, theme }) =>
    $danger ? '#ef4444' : theme.colors.text.secondary};
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: ${({ $danger, theme }) =>
      $danger ? '#ef4444' : theme.colors.primary};
    color: ${({ $danger, theme }) =>
      $danger ? '#dc2626' : theme.colors.primary};
  }
`

const EventLinkDraftBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  border: 1px dashed ${({ theme }) => theme.colors.border.medium};
  background: ${({ theme }) => theme.colors.background.tertiary};
`

const MiniActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const GhostLinkBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  border: none;
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: rgba(99, 102, 241, 0.18);
  }
`

const DetailCard = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const DetailTopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
`

const DetailTitle = styled.h4`
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const DetailMotto = styled.div`
  margin-top: 4px;
  font-size: 12.5px;
  font-style: italic;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const DetailSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.default};
`

const DetailSectionHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const DetailSectionLabel = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.03em;
`

const ChainStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const ChainRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 12.5px;
`

const ChainTag = styled.span`
  min-width: 115px;
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ChainLinkBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.tertiary};
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

const ChainMuted = styled.span`
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ChipWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const DetailMetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
`

const DetailMetaBox = styled.div`
  padding: 9px 11px;
  border-radius: 9px;
  background: ${({ theme }) => theme.colors.background.tertiary};
  display: flex;
  flex-direction: column;
  gap: 3px;
`

const DetailMetaLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const DetailMetaVal = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  display: inline-flex;
  align-items: center;
`

const CommanderList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const CommanderItem = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background.tertiary};
  font-size: 12.5px;
`

const CommanderNameBtn = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 12.5px;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: underline;
  }
`

const CommanderRoleBadge = styled.span`
  padding: 1px 6px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(99, 102, 241, 0.14);
  color: #6366f1;
`

const CommanderPeriod = styled.span`
  margin-left: auto;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

const BattleList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const BattleCard = styled.div`
  padding: 10px 12px;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.tertiary};
  display: flex;
  flex-direction: column;
  gap: 5px;
`

const BattleTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const BattleTitleBtn = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`

const BattleLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`

const BattleMetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const DetailParagraph = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: pre-wrap;
`

const UnitGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
`

const UnitCard = styled.article`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  transition: border-color 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
`

const CardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
`

const BranchBadge = styled.span`
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(99, 102, 241, 0.14);
  color: #6366f1;
`

const TypeBadge = styled.span`
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme }) => theme.colors.background.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const StatusDot = styled.span<{ $active: boolean }>`
  font-size: 11px;
  font-weight: 600;
  color: ${({ $active, theme }) =>
    $active ? '#10b981' : theme.colors.text.tertiary};
`

const ActionGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
`

const IconButton = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: ${({ $danger, theme }) =>
    $danger ? '#ef4444' : theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ $danger, theme }) =>
      $danger ? '#dc2626' : theme.colors.text.primary};
  }
`

const UnitName = styled.button`
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`

const UnitNickname = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const MetaList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const MetaItem = styled.span`
  font-variant-numeric: tabular-nums;
`

const UnitDesc = styled.p`
  margin: 2px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const EmptyCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 48px 24px;
  border-radius: 14px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 13.5px;
`

const EmptyIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(99, 102, 241, 0.12);
  color: #6366f1;
`

const EmptyTitle = styled.h4`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EmptyDesc = styled.p`
  margin: 0;
  max-width: 400px;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`
