import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiArrowDown,
  FiArrowUp,
  FiArrowUpRight,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiCompass,
  FiEdit2,
  FiExternalLink,
  FiGitCommit,
  FiGrid,
  FiList,
  FiPlus,
  FiSearch,
  FiShield,
  FiTrash2,
  FiUser,
  FiX,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

import {
  buildChildrenByParentMap,
  buildUnitByIdMap,
  fetchCountryScopedMilitaryUnits,
  formatStructuredEventSpan,
  formatTenureSpan,
  formatTransitionTimeLabel,
  formatUnitPeriodSpan,
  getCommanderChronologyKey,
  MILITARY_BRANCH_LABELS,
  MILITARY_DIRECTIVE_ROLE_OPTIONS,
  MILITARY_TRANSITION_KIND_LABELS,
  MILITARY_TRANSITION_KIND_OPTIONS,
  militaryUnitQueryKeys,
  resolveUnitAncestorsAndDepartment,
  sortUnitsByEchelon,
} from '@/entities/military-unit'
import { UnlinkedCountryTenuresBar } from '@/features/government-info/ui/unlinked-country-tenures-bar'
import { SIDE_UNIT_ROLE_LABEL } from '@/pages/events/detail/components/side-orbat.lib'
import { SIDE_OUTCOME_LABEL } from '@/pages/events/detail/components/side-outcome'
import {
  administrationDepartmentApi,
  type AdministrationDepartmentEventRole,
  EVENT_DEPARTMENT_ROLE_LABEL,
} from '@/shared/api/administration-department'
import {
  addEventSideUnit,
  type EventSide,
  listEventSides,
  removeEventSideUnit,
  type SideUnitRole,
  syncEventSides,
} from '@/shared/api/event-sides'
import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import {
  militaryUnitApi,
  type MilitaryUnitEventLinkDto,
  type MilitaryUnitLineageDto,
  type MilitaryUnitTenureItem,
  type MilitaryUnitTransitionKind,
} from '@/shared/api/military-unit'
import { personCareerApi } from '@/shared/api/person-career'
import { getUploadImageUrl } from '@/shared/api/upload'
import { militaryUnitTypeLabelKo } from '@/shared/lib/military-unit-type-label'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { parseSignedDateParts } from '@/shared/lib/tenure-person-utils'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import {
  EventPickerModal,
  type EventPickerSelection,
} from '@/shared/ui/event-picker-modal/event-picker-modal'
import {
  type EditableInstitutionTenure,
  InstitutionAppointmentModal,
} from '@/shared/ui/institution-appointment-modal'
import {
  type SubUnitMapPin,
  UnitSpatialMapCard,
} from '@/shared/ui/jurisdiction-map-field'
import { PopoverMenu } from '@/shared/ui/popover-menu'
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
  LedgerCompactAction,
  LedgerPrimaryButton,
} from '@/widgets/country/country-detail/ui/country-ledger-primitives'
import { hydrateStrengthSnapshots } from '@/widgets/country/country-detail/ui/military-unit-form/strength-snapshots-editor'
import { StructuredPartsDateField } from '@/widgets/country/country-detail/ui/military-unit-form/structured-parts-date-field'
import {
  CountryInlineModal,
  type CountryInlineModalTarget,
  shouldInterceptEntityClick,
} from '@/widgets/country/country-inline-modal/country-inline-modal'
import { PersonInlineModal } from '@/widgets/person/person-inline-modal/person-inline-modal'

import * as S from './military-unit-detail.styles'
import type {
  CreateSubUnitDefaults,
  MilitaryUnitDetailActionsHandle,
  MilitaryUnitDetailResponse,
  MilitaryUnitDetailVariant,
} from './military-unit-detail.types'

type TransitionDirection =
  | 'PREDECESSOR_UNIT'
  | 'PREDECESSOR_DEPT'
  | 'SUCCESSOR_UNIT'

type DetailTabKey = 'all' | 'overview' | 'commanders' | 'operations'

function resolveLinearDays(parts: {
  signedYear: number
  month: number
  day: number
}): number {
  const yearLinear =
    parts.signedYear < 0 ? parts.signedYear + 1 : parts.signedYear
  return yearLinear * 365.25 + (parts.month - 1) * 30.44 + (parts.day - 1)
}

function formatDurationLabel(days: number): string {
  if (days < 31) return `${Math.max(1, days)}일`
  const totalMonths = Math.round(days / 30.44)
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  if (years === 0) return `${months}개월`
  return months === 0 ? `${years}년` : `${years}년 ${months}개월`
}

function computeCommanderTenureDuration(
  tenure: MilitaryUnitTenureItem,
  unitIsActive: boolean,
): { days: number; label: string } | null {
  const startParts =
    tenure.startYear && tenure.startYear > 0
      ? {
          signedYear:
            tenure.startEra === 'BC'
              ? -Math.abs(tenure.startYear)
              : tenure.startYear,
          month: tenure.startMonth ?? 1,
          day: tenure.startDay ?? 1,
        }
      : parseSignedDateParts(tenure.startDate)
  if (!startParts) return null

  const endParts =
    tenure.endYear && tenure.endYear > 0
      ? {
          signedYear:
            tenure.endEra === 'BC' ? -Math.abs(tenure.endYear) : tenure.endYear,
          month: tenure.endMonth ?? 12,
          day: tenure.endDay ?? 28,
        }
      : tenure.endDate
        ? parseSignedDateParts(tenure.endDate)
        : unitIsActive && startParts.signedYear >= 1980
          ? {
              signedYear: new Date().getFullYear(),
              month: new Date().getMonth() + 1,
              day: new Date().getDate(),
            }
          : null

  if (!endParts) return null
  const diffDays = Math.max(
    1,
    Math.round(resolveLinearDays(endParts) - resolveLinearDays(startParts)),
  )
  if (!Number.isFinite(diffDays) || diffDays <= 0) return null
  return {
    days: diffDays,
    label: formatDurationLabel(diffDays),
  }
}

function parseApproxNumber(raw: string | null | undefined): number | null {
  if (!raw) return null
  const cleaned = raw
    .replace(/^약\s*/u, '')
    .replace(/\+$/u, '')
    .replace(/,/gu, '')
    .trim()
  if (!cleaned) return null
  const rangeParts = cleaned.split('~')
  if (rangeParts.length === 2) {
    const low = Number(rangeParts[0].trim())
    const high = Number(rangeParts[1].trim())
    if (Number.isFinite(low) && Number.isFinite(high) && low >= 0 && high > 0) {
      return Math.round((low + high) / 2)
    }
  }
  const single = Number(cleaned)
  return Number.isFinite(single) && single > 0 ? Math.round(single) : null
}

function resolveSideOutcomeTone(
  outcome: string | null | undefined,
): 'win' | 'loss' | 'draw' | 'neutral' {
  if (!outcome) return 'neutral'
  const upper = outcome.toUpperCase()
  if (upper.includes('PYRRHIC')) return 'draw'
  if (upper.includes('VICTORY') || upper === 'WIN') return 'win'
  if (
    upper.includes('DEFEAT') ||
    upper.includes('LOSS') ||
    upper.includes('SURRENDER') ||
    upper.includes('ROUT')
  ) {
    return 'loss'
  }
  if (
    upper.includes('STALEMATE') ||
    upper.includes('INCONCLUSIVE') ||
    upper.includes('TRUCE') ||
    upper.includes('DRAW')
  ) {
    return 'draw'
  }
  return 'neutral'
}

export interface MilitaryUnitDetailContentProps {
  unitId: string
  variant: MilitaryUnitDetailVariant
  /** 이미 조회된 동일 국가 스코프 부대 목록 (제공 시 중복 쿼리 생략) */
  scopedUnits?: MilitaryUnitDetailResponse[]
  /** 부대 데이터가 로드/변경될 때 상위에 알림 (페이지 타이틀·헤더 동기화용) */
  onUnitLoaded?: (unit: MilitaryUnitDetailResponse | null) => void
  /** 상급 지휘 계통 체인이 계산되면 상위에 알림 (상단 전체 브레드크럼 표시용) */
  onAncestorsResolved?: (
    ancestors: Array<{ id: string; name: string; abbreviation?: string | null }>,
  ) => void
  /** 다른 부대 클릭 시 이동 핸들러 */
  onSelectUnit: (nextUnitId: string) => void
  /** 부대 수정 모달 열기 */
  onEditUnit: (targetUnitId: string) => void
  /** 예하 부대 등록 모달 열기 */
  onCreateSubUnit?: (defaults: CreateSubUnitDefaults) => void
  /** 부대 삭제 완료 후 콜백 */
  onDeleted?: (deletedUnitId: string) => void
  /** 소관 부처 이동 커스텀 핸들러 (미지정 시 단독 부처 상세 이동) */
  onNavigateToDepartment?: (departmentId: string) => void
  /** embedded 모드에서 뒤로/선택해제 버튼 */
  onCloseEmbedded?: () => void
  embeddedBackLabel?: string
}

function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const rawMsg = (err as { message?: unknown }).message
    if (typeof rawMsg === 'string' && rawMsg.trim()) return rawMsg
  }
  return fallback
}

export const MilitaryUnitDetailContent = forwardRef<
  MilitaryUnitDetailActionsHandle,
  MilitaryUnitDetailContentProps
>(function MilitaryUnitDetailContent(
  {
    unitId,
    variant,
    scopedUnits,
    onUnitLoaded,
    onAncestorsResolved,
    onSelectUnit,
    onEditUnit,
    onCreateSubUnit,
    onDeleted,
    onNavigateToDepartment,
    onCloseEmbedded,
    embeddedBackLabel = '선택 해제',
  },
  ref,
) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isCompact = variant !== 'page'

  const [activeTab, setActiveTab] = useState<DetailTabKey>('all')
  const [inspectPersonId, setInspectPersonId] = useState<string | null>(null)
  const [countryModalTarget, setCountryModalTarget] =
    useState<CountryInlineModalTarget | null>(null)

  // 예하 편제 보기 (카드 / 계층 트리)
  const [subViewMode, setSubViewMode] = useState<'cards' | 'tree'>('cards')
  const [collapsedSubIds, setCollapsedSubIds] = useState<Set<string>>(
    () => new Set(),
  )

  // 지휘관·참모 모달 및 검색/정렬
  const [appointmentOpen, setAppointmentOpen] = useState(false)
  const [editingTenure, setEditingTenure] =
    useState<EditableInstitutionTenure | null>(null)
  const [commanderSort, setCommanderSort] = useState<'asc' | 'desc'>('asc')
  const [commanderSearch, setCommanderSearch] = useState('')

  // 조직 개편 계보(전신·후신) 인라인 추가/수정
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

  // 지령·작전 사건 연결
  const [eventPickerOpen, setEventPickerOpen] = useState(false)
  const [pendingEvent, setPendingEvent] = useState<EventPickerSelection | null>(
    null,
  )
  const [editingEventLink, setEditingEventLink] =
    useState<MilitaryUnitEventLinkDto | null>(null)
  const [eventRole, setEventRole] =
    useState<AdministrationDepartmentEventRole>('ISSUER')
  const [eventRoleDesc, setEventRoleDesc] = useState('')
  const [eventLinkBusy, setEventLinkBusy] = useState(false)

  // 참전 전투·작전(SideDeployedUnit) 직접 연결
  const [deploymentPickerOpen, setDeploymentPickerOpen] = useState(false)
  const [pendingDeploymentEvent, setPendingDeploymentEvent] =
    useState<EventPickerSelection | null>(null)
  const [pendingEventSides, setPendingEventSides] = useState<EventSide[]>([])
  const [selectedDeploySideId, setSelectedDeploySideId] = useState('')
  const [autoSideName, setAutoSideName] = useState('')
  const [deployRole, setDeployRole] = useState<SideUnitRole>('MAIN_EFFORT')
  const [deployNote, setDeployNote] = useState('')
  const [deployBusy, setDeployBusy] = useState(false)

  // 부대 변경 시 UI 상태 초기화
  useEffect(() => {
    setActiveTab('all')
    setAddTransitionOpen(false)
    setEditingTransitionId(null)
    setPendingEvent(null)
    setEditingEventLink(null)
    setPendingDeploymentEvent(null)
    setPendingEventSides([])
    setCommanderSearch('')
    setCollapsedSubIds(new Set())
  }, [unitId])

  const detailQuery = useQuery({
    queryKey: militaryUnitQueryKeys.detail(unitId),
    queryFn: () =>
      militaryUnitApi.getById(unitId) as unknown as Promise<MilitaryUnitDetailResponse>,
    enabled: Boolean(unitId),
    staleTime: 30_000,
  })

  const unit = detailQuery.data ?? null

  useEffect(() => {
    onUnitLoaded?.(unit)
  }, [unit, onUnitLoaded])

  // 동일 국가 스코프 부대 목록만 조회 (기존 전역 militaryUnitApi.getAll() 완전 제거!)
  const scopeIsHistorical = Boolean(
    unit?.historicalCountryId && !unit?.countryId,
  )
  const scopeCountryId = unit?.countryId ?? unit?.historicalCountryId ?? ''

  const countryScopedUnitsQuery = useQuery({
    queryKey: militaryUnitQueryKeys.countryScope(
      scopeIsHistorical ? 'hist' : 'mod',
      scopeCountryId,
      '',
      true,
    ),
    queryFn: () =>
      fetchCountryScopedMilitaryUnits({
        countryId: scopeCountryId,
        isHistorical: scopeIsHistorical,
        summary: true,
      }) as unknown as Promise<MilitaryUnitDetailResponse[]>,
    enabled: !scopedUnits && Boolean(scopeCountryId),
    staleTime: 60_000,
  })

  const effectiveScopedUnits = useMemo(
    () => scopedUnits ?? countryScopedUnitsQuery.data ?? [],
    [scopedUnits, countryScopedUnitsQuery.data],
  )

  const departmentsForLineageQuery = useQuery({
    queryKey: [
      'administration-departments',
      'unit-detail-lineage',
      unit?.countryId ?? null,
      unit?.historicalCountryId ?? null,
    ],
    queryFn: async () => {
      if (unit?.historicalCountryId) {
        const histDepts = await administrationDepartmentApi.getAll({
          historicalCountryId: unit.historicalCountryId,
        })
        if (unit.countryId) {
          const modDepts = await administrationDepartmentApi.getAll({
            countryId: unit.countryId,
          })
          const seenIds = new Set(histDepts.map((deptItem) => deptItem.id))
          return [
            ...histDepts,
            ...modDepts.filter((deptItem) => !seenIds.has(deptItem.id)),
          ]
        }
        return histDepts
      }
      if (unit?.countryId) {
        return administrationDepartmentApi.getAll({ countryId: unit.countryId })
      }
      return []
    },
    enabled:
      Boolean(unit?.id) &&
      addTransitionOpen &&
      transitionDirection === 'PREDECESSOR_DEPT',
    staleTime: 60_000,
  })

  const invalidateUnitData = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: militaryUnitQueryKeys.detail(unitId),
    })
    await queryClient.invalidateQueries({
      queryKey: militaryUnitQueryKeys.all,
    })
    await queryClient.invalidateQueries({
      queryKey: ['administration-departments'],
    })
  }, [queryClient, unitId])

  const unitByIdMap = useMemo(
    () => buildUnitByIdMap(effectiveScopedUnits, unit),
    [effectiveScopedUnits, unit],
  )

  const childrenByParentMap = useMemo(
    () => buildChildrenByParentMap(effectiveScopedUnits),
    [effectiveScopedUnits],
  )

  const sortedSubUnits = useMemo(() => {
    const directSubs =
      unit?.subUnits && unit.subUnits.length > 0
        ? unit.subUnits
        : unit
          ? (childrenByParentMap.get(unit.id) ?? [])
          : []
    return sortUnitsByEchelon(directSubs)
  }, [unit, childrenByParentMap])

  const { ancestorChain, effectiveDepartment } = useMemo(
    () => resolveUnitAncestorsAndDepartment(unit, unitByIdMap),
    [unit, unitByIdMap],
  )

  useEffect(() => {
    onAncestorsResolved?.(ancestorChain)
  }, [ancestorChain, onAncestorsResolved])

  const { hasGrandchildren, totalDescendantCount } = useMemo(() => {
    if (!unit) return { hasGrandchildren: false, totalDescendantCount: 0 }
    const visited = new Set<string>([unit.id])
    let total = 0
    let grand = false
    const walk = (parentId: string, depth: number) => {
      const kids = childrenByParentMap.get(parentId) ?? []
      for (const childItem of kids) {
        if (visited.has(childItem.id)) continue
        visited.add(childItem.id)
        total += 1
        if (depth >= 2) grand = true
        walk(childItem.id, depth + 1)
      }
    }
    walk(unit.id, 1)
    return {
      hasGrandchildren: grand,
      totalDescendantCount: Math.max(total, sortedSubUnits.length),
    }
  }, [unit, childrenByParentMap, sortedSubUnits.length])

  const siblingUnits = useMemo(() => {
    if (!unit?.parentUnitId) return []
    const siblings = childrenByParentMap.get(unit.parentUnitId) ?? []
    if (siblings.length <= 1) return []
    return sortUnitsByEchelon(siblings)
  }, [unit?.parentUnitId, childrenByParentMap])

  const candidateLineageUnits = useMemo(() => {
    if (!unit) return []
    return sortUnitsByEchelon(
      effectiveScopedUnits.filter((candidate) => candidate.id !== unit.id),
    )
  }, [effectiveScopedUnits, unit])

  const lineageUnitSelectOptions = useMemo<SearchableSelectOption[]>(
    () =>
      candidateLineageUnits.map((unitCandidate) => {
        const candCountry =
          unitCandidate.historicalCountry?.name ?? unitCandidate.country?.name
        const candType = unitCandidate.unitType
          ? militaryUnitTypeLabelKo(unitCandidate.unitType)
          : undefined
        return {
          value: unitCandidate.id,
          label: unitCandidate.abbreviation
            ? `${unitCandidate.name} (${unitCandidate.abbreviation})`
            : unitCandidate.name,
          meta: [candType, candCountry].filter(Boolean).join(' · ') || undefined,
          keywords: [
            unitCandidate.abbreviation,
            unitCandidate.nameEn,
            unitCandidate.nameLocal,
            candType,
            candCountry,
          ]
            .filter(Boolean)
            .join(' '),
        }
      }),
    [candidateLineageUnits],
  )

  const sameCountryUnitOptions = useMemo(
    () =>
      effectiveScopedUnits.map((unitCandidate) => ({
        id: unitCandidate.id,
        label: unitCandidate.historicalCountry?.name
          ? `[${unitCandidate.historicalCountry.name}] ${unitCandidate.name}`
          : unitCandidate.name,
        historicalCountryId: unitCandidate.historicalCountryId ?? null,
      })),
    [effectiveScopedUnits],
  )

  const handleDeleteUnit = useCallback(async () => {
    if (!unit) return
    const subCount = sortedSubUnits.length
    if (subCount > 0) {
      notify.error(
        `직속 예하 편제가 ${subCount}개 연결되어 있어 삭제할 수 없습니다. 먼저 예하 부대의 상급 부대를 변경하거나 삭제해 주세요.`,
      )
      return
    }
    const confirmed = await confirm({
      title: '사령부·부대 삭제',
      message: `'${unit.name}' 편제를 삭제하시겠습니까?`,
      confirmLabel: '삭제',
      danger: true,
    })
    if (!confirmed) return
    try {
      await militaryUnitApi.delete(unit.id)
      await queryClient.invalidateQueries({
        queryKey: militaryUnitQueryKeys.all,
      })
      notify.success('사령부·부대가 삭제되었습니다.')
      onDeleted?.(unit.id)
    } catch (err) {
      notify.error(getApiErrorMessage(err, '부대 삭제에 실패했습니다.'))
    }
  }, [unit, sortedSubUnits.length, queryClient, onDeleted])

  useImperativeHandle(
    ref,
    () => ({
      openAppointment: () => {
        setEditingTenure(null)
        setAppointmentOpen(true)
      },
      openAddTransition: () => {
        setActiveTab((prev) => (prev === 'all' ? 'all' : 'overview'))
        setAddTransitionOpen(true)
      },
      openEventPicker: () => {
        setActiveTab((prev) => (prev === 'all' ? 'all' : 'operations'))
        setEventPickerOpen(true)
      },
      deleteCurrentUnit: handleDeleteUnit,
    }),
    [handleDeleteUnit],
  )

  const handleAddTransition = async () => {
    if (!unit || transitionBusy) return
    if (!transitionTargetId) {
      notify.error('연결할 전신·후신 부대 또는 행정부처를 선택해 주세요.')
      return
    }
    const yr = transitionYear.trim() ? Number(transitionYear.trim()) : null
    const mo = transitionMonth.trim() ? Number(transitionMonth.trim()) : null
    if (yr !== null && (!Number.isInteger(yr) || yr < 1)) {
      notify.error('전환 연도는 1 이상의 정수여야 합니다.')
      return
    }
    if (mo !== null && (!Number.isInteger(mo) || mo < 1 || mo > 12)) {
      notify.error('전환 월은 1~12 사이여야 합니다.')
      return
    }
    if (yr === null && mo !== null) {
      notify.error('연도 없이 월만 입력할 수 없습니다.')
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
        era: yr !== null ? transitionEra : null,
        year: yr,
        month: mo,
        note: transitionNote.trim() || null,
      })
      await invalidateUnitData()
      setAddTransitionOpen(false)
      setTransitionTargetId('')
      setTransitionYear('')
      setTransitionMonth('')
      setTransitionNote('')
      notify.success('개편 계보가 연결되었습니다.')
    } catch (err) {
      notify.error(getApiErrorMessage(err, '개편 계보 추가에 실패했습니다.'))
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
    if (transitionBusy) return
    const yr = editTransitionYear.trim()
      ? Number(editTransitionYear.trim())
      : null
    const mo = editTransitionMonth.trim()
      ? Number(editTransitionMonth.trim())
      : null
    if (yr !== null && (!Number.isInteger(yr) || yr < 1)) {
      notify.error('전환 연도는 1 이상의 정수여야 합니다.')
      return
    }
    if (mo !== null && (!Number.isInteger(mo) || mo < 1 || mo > 12)) {
      notify.error('전환 월은 1~12 사이여야 합니다.')
      return
    }
    if (yr === null && mo !== null) {
      notify.error('연도 없이 월만 입력할 수 없습니다.')
      return
    }
    setTransitionBusy(true)
    try {
      await militaryUnitApi.updateTransition(transitionId, {
        kind: editTransitionKind,
        era: yr !== null ? editTransitionEra : null,
        year: yr,
        month: mo,
        note: editTransitionNote.trim() || null,
      })
      await invalidateUnitData()
      setEditingTransitionId(null)
      notify.success('개편 계보가 수정되었습니다.')
    } catch (err) {
      notify.error(getApiErrorMessage(err, '개편 계보 수정에 실패했습니다.'))
    } finally {
      setTransitionBusy(false)
    }
  }

  const handleDeleteTransition = async (
    transitionId: string,
    targetLabel: string,
  ) => {
    const ok = await confirm({
      title: '개편 계보 연결 삭제',
      message: `'${targetLabel}' 계보 연결을 삭제하시겠습니까?`,
      confirmLabel: '삭제',
      danger: true,
    })
    if (!ok) return
    setTransitionBusy(true)
    try {
      await militaryUnitApi.deleteTransition(transitionId)
      await invalidateUnitData()
      if (editingTransitionId === transitionId) setEditingTransitionId(null)
      notify.success('개편 계보 연결이 삭제되었습니다.')
    } catch (err) {
      notify.error(getApiErrorMessage(err, '계보 연결 삭제에 실패했습니다.'))
    } finally {
      setTransitionBusy(false)
    }
  }

  const handleDeleteCommanderTenure = async (tenure: MilitaryUnitTenureItem) => {
    if (!unit) return
    const roleLabel =
      tenure.title ?? tenure.positionDefinition?.title ?? '지휘관 임기'
    const ok = await confirm({
      title: '지휘관·참모 보직 삭제',
      message: `'${roleLabel}' 재임 기록을 삭제하시겠습니까?`,
      confirmLabel: '삭제',
      danger: true,
    })
    if (!ok) return
    try {
      await personCareerApi.deleteGovernmentPositionTenure(tenure.id)
      invalidateTenureQueries(queryClient, {
        personId: tenure.person?.id ?? tenure.personId,
        countryId: unit.countryId ?? null,
        historicalCountryId: unit.historicalCountryId ?? null,
      })
      await invalidateUnitData()
      notify.success('지휘관·참모 보직이 삭제되었습니다.')
    } catch (err) {
      notify.error(getApiErrorMessage(err, '보직 삭제에 실패했습니다.'))
    }
  }

  const handleSaveDirectiveEvent = async () => {
    if (!unit || eventLinkBusy) return
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
        notify.success('사건 관여 역할이 수정되었습니다.')
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

  const handleSelectDeploymentEvent = async (picked: EventPickerSelection) => {
    setPendingDeploymentEvent(picked)
    const fallbackSide =
      (unit?.historicalCountry?.name ?? unit?.country?.name)
        ? `${unit?.historicalCountry?.name ?? unit?.country?.name} 측`
        : '참전 진영'
    setAutoSideName(fallbackSide)
    setDeployRole('MAIN_EFFORT')
    setDeployNote('')
    try {
      const sides = await listEventSides(picked.id)
      setPendingEventSides(sides)
      if (sides.length > 0) {
        const matched = sides.find((side) =>
          (side.participants ?? []).some(
            (p) =>
              (unit?.historicalCountryId &&
                p.historicalCountryId === unit.historicalCountryId) ||
              (unit?.countryId && p.countryId === unit.countryId),
          ),
        )
        setSelectedDeploySideId((matched ?? sides[0]).id)
      } else {
        setSelectedDeploySideId('')
      }
    } catch {
      setPendingEventSides([])
      setSelectedDeploySideId('')
    }
  }

  const handleSaveDeploymentLink = async () => {
    if (!unit || !pendingDeploymentEvent || deployBusy) return
    setDeployBusy(true)
    try {
      let sideIdToUse = selectedDeploySideId
      if (!sideIdToUse) {
        const createdSides = await syncEventSides(pendingDeploymentEvent.id, [
          {
            name: autoSideName.trim() || '참전 진영',
            level: 'COUNTRY',
          },
        ])
        sideIdToUse = createdSides[0]?.id ?? ''
      }
      if (!sideIdToUse) {
        notify.error('투입할 사건 진영을 생성·선택하지 못했습니다.')
        return
      }
      await addEventSideUnit(pendingDeploymentEvent.id, sideIdToUse, {
        militaryUnitId: unit.id,
        role: deployRole,
        note: deployNote.trim() || null,
      })
      setPendingDeploymentEvent(null)
      setPendingEventSides([])
      await invalidateUnitData()
      void queryClient.invalidateQueries({ queryKey: ['events'] })
      notify.success(`‘${pendingDeploymentEvent.title}’ 참전 전투서열에 연결했습니다.`)
    } catch (err) {
      notify.error(getApiErrorMessage(err, '참전 사건 연결에 실패했습니다.'))
    } finally {
      setDeployBusy(false)
    }
  }

  const handleRemoveDeploymentLink = async (
    eventId: string,
    deploymentId: string,
    eventTitle: string,
  ) => {
    const ok = await confirm({
      title: '참전 전투서열 투입 해제',
      message: `‘${eventTitle}’ 전투서열에서 이 부대를 제외하시겠습니까?`,
      confirmLabel: '제외',
      danger: true,
    })
    if (!ok) return
    try {
      await removeEventSideUnit(eventId, deploymentId)
      await invalidateUnitData()
      void queryClient.invalidateQueries({ queryKey: ['events'] })
      notify.success('참전 연결이 해제되었습니다.')
    } catch (err) {
      notify.error(getApiErrorMessage(err, '참전 연결 해제에 실패했습니다.'))
    }
  }

  if (detailQuery.isLoading) {
    return (
      <S.LoadingBox>사령부·부대 상세 정보를 불러오는 중입니다…</S.LoadingBox>
    )
  }

  if (!unit) {
    return <S.LoadingBox>해당 사령부·부대 정보를 찾을 수 없습니다.</S.LoadingBox>
  }

  const countryName =
    unit.historicalCountry?.name ?? unit.country?.name ?? null
  const countryIdForLink =
    unit.historicalCountry?.id ?? unit.country?.id ?? null
  const { isDisbanded, periodLabel } = formatUnitPeriodSpan(unit)
  const unitTypeLabel = unit.unitType
    ? militaryUnitTypeLabelKo(unit.unitType)
    : '군사 편제'
  const branchLabel = unit.branch
    ? (MILITARY_BRANCH_LABELS[unit.branch] ?? unit.branch)
    : null

  const predecessors = unit.predecessors ?? []
  const successors = unit.successors ?? []
  const unifiedTenures = unit.tenures ?? []
  const legacyCommanders = (unit.commanders ?? []).filter(
    (cmdItem) => !cmdItem.tenureId,
  )
  const totalCommanderCount = unifiedTenures.length + legacyCommanders.length

  const normalizedCmdQuery = commanderSearch.trim().toLowerCase()
  const sortedTenures = [...unifiedTenures].sort((leftTenure, rightTenure) => {
    const leftKey = getCommanderChronologyKey(leftTenure)
    const rightKey = getCommanderChronologyKey(rightTenure)
    const dirMult = commanderSort === 'asc' ? 1 : -1
    if (leftKey !== rightKey) return (leftKey - rightKey) * dirMult
    return ((leftTenure.ordinal ?? 0) - (rightTenure.ordinal ?? 0)) * dirMult
  })
  const filteredTenures = normalizedCmdQuery
    ? sortedTenures.filter((tenureItem) => {
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
        return [personLabel, roleLabel, rankLabel].some((textVal) =>
          textVal.toLowerCase().includes(normalizedCmdQuery),
        )
      })
    : sortedTenures

  const filteredLegacyCommanders = normalizedCmdQuery
    ? legacyCommanders.filter((cmdItem) => {
        const fullName = cmdItem.person
          ? [cmdItem.person.name, cmdItem.person.surname]
              .filter(Boolean)
              .join(' ')
          : ''
        return [fullName, cmdItem.rank ?? '', cmdItem.role ?? ''].some(
          (textVal) => textVal.toLowerCase().includes(normalizedCmdQuery),
        )
      })
    : legacyCommanders

  const deployments = (unit.sideDeployedUnits ?? []).filter(
    (depItem) => depItem.side?.event,
  )
  const eventRelations = unit.eventRelations ?? []
  const vessels = unit.assignedNavalVessels ?? unit.navalVessels ?? []
  const candidateLineageDepartments = departmentsForLineageQuery.data ?? []
  const lineageDeptSelectOptions: SearchableSelectOption[] =
    candidateLineageDepartments.map((deptItem) => ({
      value: deptItem.id,
      label: deptItem.abbreviation
        ? `${deptItem.name} (${deptItem.abbreviation})`
        : deptItem.name,
      keywords: deptItem.abbreviation ?? undefined,
    }))

  const tenureDurationById = new Map<string, { days: number; label: string }>()
  let maxCommanderTenureDays = 1
  for (const tItem of unifiedTenures) {
    const dur = computeCommanderTenureDuration(tItem, !isDisbanded)
    if (dur) {
      tenureDurationById.set(tItem.id, dur)
      if (dur.days > maxCommanderTenureDays) {
        maxCommanderTenureDays = dur.days
      }
    }
  }
  const parentUnitLabel =
    ancestorChain.length > 0
      ? ancestorChain[ancestorChain.length - 1].name
      : (unit.parentUnit?.name ?? '상급 부대')

  const unitObservations = unit.unitObservations ?? []
  const hydratedSnapshots =
    unitObservations.length > 0
      ? hydrateStrengthSnapshots(unitObservations, unit.branch ?? '')
      : []

  const headlineStrengthText =
    hydratedSnapshots[0]?.totalStrength
      ? `${
          hydratedSnapshots[0].basisKind === 'peacetime'
            ? '평시 정원'
            : hydratedSnapshots[0].basisKind === 'actual'
              ? '실병력'
              : '완편 정원'
        } ${hydratedSnapshots[0].totalStrength}명`
      : unit.strength?.trim()
        ? unit.strength.trim().split('\n')[0].slice(0, 60)
        : null

  const subUnitPins: SubUnitMapPin[] = sortedSubUnits
    .map((sub): SubUnitMapPin | null => {
      const fullSub = unitByIdMap.get(sub.id)
      const lat = sub.garrisonLatitude ?? fullSub?.garrisonLatitude ?? null
      const lng = sub.garrisonLongitude ?? fullSub?.garrisonLongitude ?? null
      if (
        typeof lat !== 'number' ||
        typeof lng !== 'number' ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
      ) {
        return null
      }
      return {
        id: sub.id,
        name: sub.name,
        abbreviation: sub.abbreviation ?? null,
        garrison: sub.garrison ?? fullSub?.garrison ?? null,
        lat,
        lng,
      }
    })
    .filter((item): item is SubUnitMapPin => item !== null)

  const contextMetaCards: Array<{ label: string; body: string }> = []
  if (unit.primaryMission?.trim()) {
    contextMetaCards.push({
      label: '주요 임무 · 역할',
      body: unit.primaryMission.trim(),
    })
  }
  if (unit.jurisdiction?.trim()) {
    contextMetaCards.push({
      label: '관할 · 작전구역',
      body: unit.jurisdiction.trim(),
    })
  }
  if (unit.notableBattles?.trim()) {
    contextMetaCards.push({
      label: '주요 참전 전투 · 작전',
      body: unit.notableBattles.trim(),
    })
  }
  if (unit.honors?.trim()) {
    contextMetaCards.push({
      label: '부대 표창 · 수훈',
      body: unit.honors.trim(),
    })
  }

  const handleOpenSubUnitCreate = () => {
    onCreateSubUnit?.({
      parentUnitId: unit.id,
      countryId: unit.countryId ?? null,
      historicalCountryId: unit.historicalCountryId ?? null,
      administrationDepartmentId:
        unit.administrationDepartmentId ??
        effectiveDepartment.dept?.id ??
        null,
      branch: unit.branch ?? null,
    })
  }

  const handleJumpDepartment = (deptId: string) => {
    if (onNavigateToDepartment) {
      onNavigateToDepartment(deptId)
      return
    }
    navigate(pathKeys.government.departmentDetail(deptId))
  }

  const hasSpatialData = Boolean(
    unit.garrison?.trim() ||
      (unit.garrisonLatitude != null && unit.garrisonLongitude != null) ||
      unit.jurisdictionGeometry ||
      subUnitPins.length > 0,
  )

  const formatMetricFigure = (rawVal: string) => {
    const cleaned = rawVal.replace(/,/g, '').trim()
    const num = Number(cleaned)
    return cleaned && Number.isFinite(num)
      ? num.toLocaleString('ko-KR')
      : rawVal.trim()
  }

  return (
    <>
      <S.DetailContainer $compact={isCompact}>
        {/* embedded 모드 상단 바 */}
        {variant === 'embedded' ? (
          <S.EmbeddedTopBar>
            <S.EmbeddedTopLeft>
              {onCloseEmbedded ? (
                <S.EmbeddedBackBtn type="button" onClick={onCloseEmbedded}>
                  <FiChevronLeft size={13} />
                  {embeddedBackLabel}
                </S.EmbeddedBackBtn>
              ) : null}
              <S.EmbeddedCrumbTitle title={unit.name}>
                {unit.name}
              </S.EmbeddedCrumbTitle>
            </S.EmbeddedTopLeft>

            <S.EmbeddedTopRight>
              <LedgerCompactAction
                type="button"
                onClick={() => onEditUnit(unit.id)}
              >
                <FiEdit2 size={12} /> 수정
              </LedgerCompactAction>

              <PopoverMenu
                size="sm"
                ariaLabel="부대 관리 및 작업 메뉴"
                title="예하 부대 추가 · 지휘관 임명 · 계보 · 단독 상세 · 삭제"
                items={[
                  ...(onCreateSubUnit
                    ? [
                        {
                          id: 'sub-unit',
                          label: '예하 부대 추가',
                          icon: <FiPlus size={13} />,
                          onSelect: handleOpenSubUnitCreate,
                        },
                      ]
                    : []),
                  {
                    id: 'appoint',
                    label: '지휘관 · 참모 임명',
                    icon: <FiUser size={13} />,
                    onSelect: () => {
                      setEditingTenure(null)
                      setAppointmentOpen(true)
                    },
                  },
                  {
                    id: 'lineage',
                    label: '조직 개편 계보 추가',
                    icon: <FiGitCommit size={13} />,
                    onSelect: () => {
                      setActiveTab((prev) =>
                        prev === 'all' ? 'all' : 'overview',
                      )
                      setAddTransitionOpen(true)
                    },
                  },
                  {
                    id: 'event',
                    label: '사건 · 지령 연결',
                    icon: <FiCompass size={13} />,
                    onSelect: () => {
                      setActiveTab((prev) =>
                        prev === 'all' ? 'all' : 'operations',
                      )
                      setEventPickerOpen(true)
                    },
                  },
                  { type: 'divider', id: 'div-1' },
                  {
                    id: 'standalone',
                    label: '단독 상세 페이지 열기',
                    icon: <FiExternalLink size={13} />,
                    onSelect: () =>
                      navigate(pathKeys.militaryUnitDetail(unit.id)),
                  },
                  { type: 'divider', id: 'div-2' },
                  {
                    id: 'delete',
                    label: '부대 삭제',
                    icon: <FiTrash2 size={13} />,
                    danger: true,
                    onSelect: () => void handleDeleteUnit(),
                  },
                ]}
              />
            </S.EmbeddedTopRight>
          </S.EmbeddedTopBar>
        ) : null}

        <S.DossierGrid $compact={isCompact}>
          {/* 1. 무카드 에디토리얼 히어로 */}
          <S.HeroArea>
            <S.HeroEyebrowRow>
              {countryName && countryIdForLink ? (
                <>
                  <S.InlineEntityBtn
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
                  </S.InlineEntityBtn>
                  <S.EyebrowDot aria-hidden>·</S.EyebrowDot>
                </>
              ) : null}
              <S.EyebrowAccent>{unitTypeLabel}</S.EyebrowAccent>
              {branchLabel ? (
                <>
                  <S.EyebrowDot aria-hidden>·</S.EyebrowDot>
                  <span>{branchLabel}</span>
                </>
              ) : null}
              <S.EyebrowDot aria-hidden>·</S.EyebrowDot>
              <S.LifecycleIndicator $disbanded={isDisbanded}>
                {isDisbanded ? '해체·종결' : '존속·현역'}
              </S.LifecycleIndicator>
              {periodLabel ? (
                <>
                  <S.EyebrowDot aria-hidden>·</S.EyebrowDot>
                  <span>{periodLabel}</span>
                </>
              ) : null}
            </S.HeroEyebrowRow>

            <S.HeroIdentityRow>
              {unit.insigniaUrl ? (
                <S.InsigniaImg
                  $compact={isCompact}
                  src={getUploadImageUrl(unit.insigniaUrl)}
                  alt={`${unit.name} 휘장`}
                  onError={(evt) => {
                    evt.currentTarget.style.display = 'none'
                  }}
                />
              ) : null}

              <S.HeroTitleStack>
                <S.UnitTitle $compact={isCompact}>
                  {unit.name}
                  {unit.abbreviation ? (
                    <S.AbbrSpan> ({unit.abbreviation})</S.AbbrSpan>
                  ) : null}
                </S.UnitTitle>

                {(unit.nickname || unit.nameLocal || unit.nameEn) && (
                  <S.SubtitleStack>
                    {unit.nickname ? (
                      <S.NickSpan>“{unit.nickname}”</S.NickSpan>
                    ) : null}
                    {unit.nickname && (unit.nameLocal || unit.nameEn) ? (
                      <S.EyebrowDot aria-hidden>·</S.EyebrowDot>
                    ) : null}
                    {unit.nameLocal || unit.nameEn ? (
                      <S.ForeignTitle>
                        {[unit.nameLocal, unit.nameEn]
                          .filter(Boolean)
                          .join(' · ')}
                      </S.ForeignTitle>
                    ) : null}
                  </S.SubtitleStack>
                )}

                {unit.motto ? (
                  <S.MottoLine>“{unit.motto}”</S.MottoLine>
                ) : null}
              </S.HeroTitleStack>
            </S.HeroIdentityRow>

            {unit.description?.trim() ? (
              <S.HeroLeadProse>{unit.description.trim()}</S.HeroLeadProse>
            ) : null}

            {predecessors.length > 0 || successors.length > 0 ? (
              <S.ContinuityStrip aria-label="전신·후신 편제 바로가기">
                {predecessors.map((predItem) => {
                  const timeText = formatTransitionTimeLabel(predItem)
                  const targetLabel =
                    predItem.targetType === 'DEPARTMENT'
                      ? predItem.department?.name
                      : predItem.unit?.name
                  if (!targetLabel) return null
                  return (
                    <S.ContinuityJumpBtn
                      key={predItem.transitionId}
                      type="button"
                      onClick={() => {
                        if (
                          predItem.targetType === 'DEPARTMENT' &&
                          predItem.department
                        ) {
                          handleJumpDepartment(predItem.department.id)
                        } else if (predItem.unit) {
                          onSelectUnit(predItem.unit.id)
                        }
                      }}
                    >
                      <span className="dir-tag">← 전신</span>
                      <span className="target-name">{targetLabel}</span>
                      {timeText ? (
                        <span className="target-year">({timeText})</span>
                      ) : null}
                    </S.ContinuityJumpBtn>
                  )
                })}

                {successors.map((succItem) => {
                  if (!succItem.unit) return null
                  const timeText = formatTransitionTimeLabel(succItem)
                  return (
                    <S.ContinuityJumpBtn
                      key={succItem.transitionId}
                      type="button"
                      onClick={() => onSelectUnit(succItem.unit!.id)}
                    >
                      <span className="dir-tag">후신 →</span>
                      <span className="target-name">{succItem.unit.name}</span>
                      {timeText ? (
                        <span className="target-year">({timeText})</span>
                      ) : null}
                    </S.ContinuityJumpBtn>
                  )
                })}
              </S.ContinuityStrip>
            ) : null}
          </S.HeroArea>

          {/* 2. 우측 고정 사실 장부 & 작전지도 레일 */}
          <S.AsideArea $compact={isCompact} aria-label="핵심 제원 및 위치 장부">
            {hasSpatialData ? (
              <UnitSpatialMapCard
                unitName={unit.name}
                countryName={countryName}
                garrison={unit.garrison}
                garrisonLatitude={unit.garrisonLatitude}
                garrisonLongitude={unit.garrisonLongitude}
                jurisdictionGeometry={unit.jurisdictionGeometry}
                subUnitPins={subUnitPins}
                compact
                onSelectSubUnit={onSelectUnit}
              />
            ) : null}

            <S.FactSheetBlock>
              <S.FactSheetTitle>핵심 제원 · 지휘 계통</S.FactSheetTitle>
              <S.FactList>
                <S.FactRow>
                  <S.FactTerm>존속 기간</S.FactTerm>
                  <S.FactDesc>{periodLabel || '미등록'}</S.FactDesc>
                </S.FactRow>

                <S.FactRow>
                  <S.FactTerm>소속 국가</S.FactTerm>
                  <S.FactDesc>
                    {countryName && countryIdForLink ? (
                      <S.InlineEntityBtn
                        type="button"
                        onClick={(evt) => {
                          if (!shouldInterceptEntityClick(evt)) {
                            navigate(
                              pathKeys.countryMilitary(
                                countryIdForLink,
                                unit.id,
                              ),
                            )
                            return
                          }
                          setCountryModalTarget({
                            kind: unit.historicalCountry
                              ? 'historical'
                              : 'modern',
                            id: countryIdForLink,
                            name: countryName,
                          })
                        }}
                      >
                        {countryName}
                      </S.InlineEntityBtn>
                    ) : (
                      <S.MutedSpan>미지정</S.MutedSpan>
                    )}
                  </S.FactDesc>
                </S.FactRow>

                <S.FactRow>
                  <S.FactTerm>소관 부처</S.FactTerm>
                  <S.FactDesc>
                    {effectiveDepartment.dept ? (
                      <S.InlineEntityBtn
                        type="button"
                        onClick={() =>
                          handleJumpDepartment(effectiveDepartment.dept!.id)
                        }
                      >
                        {effectiveDepartment.dept.name}
                        {effectiveDepartment.dept.abbreviation
                          ? ` (${effectiveDepartment.dept.abbreviation})`
                          : ''}
                        <FiArrowUpRight size={11.5} />
                        {effectiveDepartment.inherited ? (
                          <S.InheritedHint>(승계)</S.InheritedHint>
                        ) : null}
                      </S.InlineEntityBtn>
                    ) : (
                      <S.MutedSpan>직할 · 미연결</S.MutedSpan>
                    )}
                  </S.FactDesc>
                </S.FactRow>

                <S.FactRow>
                  <S.FactTerm>상급 편제</S.FactTerm>
                  <S.FactDesc>
                    {ancestorChain.length > 0 ? (
                      <S.ChainBreadcrumb>
                        {ancestorChain.map((anc, idx) => (
                          <React.Fragment key={anc.id}>
                            {idx > 0 ? (
                              <S.ChainSep aria-hidden>›</S.ChainSep>
                            ) : null}
                            <S.InlineEntityBtn
                              type="button"
                              onClick={() => onSelectUnit(anc.id)}
                            >
                              {anc.name}
                              {anc.abbreviation ? ` (${anc.abbreviation})` : ''}
                            </S.InlineEntityBtn>
                          </React.Fragment>
                        ))}
                      </S.ChainBreadcrumb>
                    ) : (
                      <S.MutedSpan>최상위 편제</S.MutedSpan>
                    )}
                  </S.FactDesc>
                </S.FactRow>

                {unit.garrison?.trim() ? (
                  <S.FactRow>
                    <S.FactTerm>본영 · 주둔지</S.FactTerm>
                    <S.FactDesc>{unit.garrison.trim()}</S.FactDesc>
                  </S.FactRow>
                ) : null}

                {headlineStrengthText ? (
                  <S.FactRow>
                    <S.FactTerm>병력 규모</S.FactTerm>
                    <S.FactDesc>{headlineStrengthText}</S.FactDesc>
                  </S.FactRow>
                ) : null}

                <S.FactRow>
                  <S.FactTerm>연결 기록</S.FactTerm>
                  <S.FactDesc>
                    <S.QuietMetaItem>
                      {[
                        `예하 ${sortedSubUnits.length}`,
                        `지휘관 ${totalCommanderCount}`,
                        `참전·지령 ${deployments.length + eventRelations.length}`,
                      ].join(' · ')}
                    </S.QuietMetaItem>
                  </S.FactDesc>
                </S.FactRow>
              </S.FactList>
            </S.FactSheetBlock>

            {siblingUnits.length > 1 ? (
              <S.SiblingUnitsBlock aria-label="동급 편제 전환">
                <S.FactSheetTitle>
                  {parentUnitLabel} 예하 편제 ({siblingUnits.length})
                </S.FactSheetTitle>
                <S.SiblingUnitsList>
                  {siblingUnits.slice(0, 12).map((sibItem) => {
                    const isCurrent = sibItem.id === unit.id
                    return (
                      <S.SiblingUnitBtn
                        key={sibItem.id}
                        type="button"
                        $current={isCurrent}
                        disabled={isCurrent}
                        onClick={() => {
                          if (!isCurrent) onSelectUnit(sibItem.id)
                        }}
                      >
                        <span className="sib-name">
                          {sibItem.name}
                          {sibItem.abbreviation
                            ? ` (${sibItem.abbreviation})`
                            : ''}
                        </span>
                        {sibItem.unitType ? (
                          <span className="sib-type">
                            {militaryUnitTypeLabelKo(sibItem.unitType)}
                          </span>
                        ) : null}
                      </S.SiblingUnitBtn>
                    )
                  })}
                </S.SiblingUnitsList>
              </S.SiblingUnitsBlock>
            ) : null}
          </S.AsideArea>

          {/* 3. 고정 탭 바 (전체 도시에 기본 + 영역별 필터 탭) */}
          <S.TabsArea>
            <UnderlineTabNav aria-label="부대 상세 지면">
              <UnderlineTabButton
                type="button"
                $active={activeTab === 'all'}
                onClick={() => setActiveTab('all')}
              >
                <span>전체</span>
              </UnderlineTabButton>
              <UnderlineTabButton
                type="button"
                $active={activeTab === 'overview'}
                onClick={() => setActiveTab('overview')}
              >
                <span>편제 · 계보</span>
                {sortedSubUnits.length +
                  predecessors.length +
                  successors.length >
                0 ? (
                  <UnderlineTabBadge $active={activeTab === 'overview'}>
                    {sortedSubUnits.length +
                      predecessors.length +
                      successors.length}
                  </UnderlineTabBadge>
                ) : null}
              </UnderlineTabButton>
              <UnderlineTabButton
                type="button"
                $active={activeTab === 'commanders'}
                onClick={() => setActiveTab('commanders')}
              >
                <span>역대 지휘관</span>
                {totalCommanderCount > 0 ? (
                  <UnderlineTabBadge $active={activeTab === 'commanders'}>
                    {totalCommanderCount}
                  </UnderlineTabBadge>
                ) : null}
              </UnderlineTabButton>
              <UnderlineTabButton
                type="button"
                $active={activeTab === 'operations'}
                onClick={() => setActiveTab('operations')}
              >
                <span>참전 · 작전 · 지령</span>
                {deployments.length + eventRelations.length > 0 ? (
                  <UnderlineTabBadge $active={activeTab === 'operations'}>
                    {deployments.length + eventRelations.length}
                  </UnderlineTabBadge>
                ) : null}
              </UnderlineTabButton>
            </UnderlineTabNav>
          </S.TabsArea>

          {/* 4. 무카드 본문 지면 */}
          <S.MainArea>
            {(activeTab === 'all' || activeTab === 'overview') && (
              <>
                {/* 정량 병력 · 편제 전력 시트 */}
                {hydratedSnapshots.length > 0 || unit.strength?.trim() ? (
                  <S.EditorialSection>
                    <S.SectionHeader>
                      <S.SectionHeadLeft>
                        <S.SectionTitle>병력 · 편제 전력</S.SectionTitle>
                        {hydratedSnapshots.length > 0 ? (
                          <S.SectionCount>
                            {hydratedSnapshots.length}시점
                          </S.SectionCount>
                        ) : null}
                      </S.SectionHeadLeft>
                      <LedgerCompactAction
                        type="button"
                        onClick={() => onEditUnit(unit.id)}
                      >
                        <FiEdit2 size={11.5} /> 전력 수정
                      </LedgerCompactAction>
                    </S.SectionHeader>

                    {hydratedSnapshots.length > 0 ? (
                      <S.StrengthSnapshotsStack>
                        {hydratedSnapshots.map((snap, snapIdx) => {
                          const basisKo =
                            snap.basisKind === 'peacetime'
                              ? '평시 편제 정원'
                              : snap.basisKind === 'actual'
                                ? '실병력 (현원)'
                                : '전시 완편 정원'
                          const dateTag = snap.year.trim()
                            ? `${snap.era === 'BC' ? 'BC ' : ''}${snap.year}${snap.month ? `.${snap.month.padStart(2, '0')}` : ''}${snap.day ? `.${snap.day.padStart(2, '0')}` : ''}`
                            : null

                          const prevSnap =
                            snapIdx > 0 ? hydratedSnapshots[snapIdx - 1] : null
                          const currTotalNum = parseApproxNumber(
                            snap.totalStrength,
                          )
                          const prevTotalNum = prevSnap
                            ? parseApproxNumber(prevSnap.totalStrength)
                            : null
                          const deltaDiff =
                            currTotalNum != null &&
                            prevTotalNum != null &&
                            prevTotalNum > 0 &&
                            currTotalNum !== prevTotalNum
                              ? currTotalNum - prevTotalNum
                              : null
                          const deltaPct =
                            deltaDiff != null && prevTotalNum != null
                              ? Math.round((deltaDiff / prevTotalNum) * 100)
                              : null

                          const officersNum = parseApproxNumber(snap.officers)
                          const ncosNum = parseApproxNumber(snap.ncos)
                          const enlistedNum = parseApproxNumber(snap.enlisted)
                          const rankParts = [
                            officersNum != null
                              ? {
                                  key: 'officers',
                                  label: '장교',
                                  val: officersNum,
                                  color: '#4f46e5',
                                }
                              : null,
                            ncosNum != null
                              ? {
                                  key: 'ncos',
                                  label: '부사관',
                                  val: ncosNum,
                                  color: '#0284c7',
                                }
                              : null,
                            enlistedNum != null
                              ? {
                                  key: 'enlisted',
                                  label: '병',
                                  val: enlistedNum,
                                  color: '#10b981',
                                }
                              : null,
                          ].filter(
                            (
                              item,
                            ): item is {
                              key: string
                              label: string
                              val: number
                              color: string
                            } => item !== null,
                          )
                          const rankTotalSum = rankParts.reduce(
                            (acc, item) => acc + item.val,
                            0,
                          )

                          const metricCells: Array<{
                            label: string
                            value: string
                            unit: string
                            highlight?: boolean
                          }> = []

                          if (snap.totalStrength) {
                            metricCells.push({
                              label: '총병력',
                              value: formatMetricFigure(snap.totalStrength),
                              unit: '명',
                              highlight: true,
                            })
                          }
                          if (snap.officers) {
                            metricCells.push({
                              label: '장교',
                              value: formatMetricFigure(snap.officers),
                              unit: '명',
                            })
                          }
                          if (snap.ncos) {
                            metricCells.push({
                              label: '부사관',
                              value: formatMetricFigure(snap.ncos),
                              unit: '명',
                            })
                          }
                          if (snap.enlisted) {
                            metricCells.push({
                              label: '병',
                              value: formatMetricFigure(snap.enlisted),
                              unit: '명',
                            })
                          }
                          if (snap.combatPersonnel) {
                            metricCells.push({
                              label: '전투원',
                              value: formatMetricFigure(snap.combatPersonnel),
                              unit: '명',
                            })
                          }
                          if (snap.subUnitsCount) {
                            metricCells.push({
                              label: '예하 편제',
                              value: formatMetricFigure(snap.subUnitsCount),
                              unit: snap.subUnitsLabel || '개',
                            })
                          }
                          if (snap.tanks) {
                            metricCells.push({
                              label: '전차 · 돌격포',
                              value: formatMetricFigure(snap.tanks),
                              unit: '대',
                            })
                          }
                          if (snap.afvs) {
                            metricCells.push({
                              label: '장갑차 · IFV',
                              value: formatMetricFigure(snap.afvs),
                              unit: '대',
                            })
                          }
                          if (snap.artillery) {
                            metricCells.push({
                              label: '화포 · 박격포',
                              value: formatMetricFigure(snap.artillery),
                              unit: '문',
                            })
                          }
                          if (snap.aircraft) {
                            metricCells.push({
                              label: '항공기',
                              value: formatMetricFigure(snap.aircraft),
                              unit: '기',
                            })
                          }
                          if (snap.vessels) {
                            metricCells.push({
                              label: '함정',
                              value: formatMetricFigure(snap.vessels),
                              unit: '척',
                            })
                          }

                          return (
                            <S.StrengthSnapshotBlock key={snap.localId}>
                              <S.SnapshotHeaderLine>
                                <S.SnapshotBasisTitle>
                                  {basisKo}
                                </S.SnapshotBasisTitle>
                                {dateTag ? (
                                  <S.SnapshotDateLabel>
                                    {dateTag}
                                  </S.SnapshotDateLabel>
                                ) : null}
                                {deltaDiff != null && deltaPct != null ? (
                                  <S.SnapshotDeltaSpan
                                    $positive={deltaDiff > 0}
                                  >
                                    {deltaDiff > 0
                                      ? `+${deltaDiff.toLocaleString('ko-KR')}명 (+${deltaPct}%)`
                                      : `${deltaDiff.toLocaleString('ko-KR')}명 (${deltaPct}%)`}
                                  </S.SnapshotDeltaSpan>
                                ) : null}
                                {snap.basisNote ? (
                                  <S.SnapshotNoteText>
                                    · {snap.basisNote}
                                  </S.SnapshotNoteText>
                                ) : null}
                              </S.SnapshotHeaderLine>

                              {metricCells.length > 0 ? (
                                <S.StrengthMetricsGrid>
                                  {metricCells.map((cell) => (
                                    <S.StrengthMetricCell
                                      key={cell.label}
                                      $highlight={cell.highlight}
                                    >
                                      <span className="metric-label">
                                        {cell.label}
                                      </span>
                                      <span className="metric-value">
                                        {cell.value}
                                        <span className="metric-unit">
                                          {cell.unit}
                                        </span>
                                      </span>
                                    </S.StrengthMetricCell>
                                  ))}
                                </S.StrengthMetricsGrid>
                              ) : null}

                              {rankParts.length >= 2 && rankTotalSum > 0 ? (
                                <S.RankBreakdownWrap aria-label="계급별 병력 구성 비율">
                                  <S.RankBreakdownTrack aria-hidden>
                                    {rankParts.map((part) => (
                                      <S.RankBreakdownSeg
                                        key={part.key}
                                        $pct={
                                          (part.val / rankTotalSum) * 100
                                        }
                                        $color={part.color}
                                      />
                                    ))}
                                  </S.RankBreakdownTrack>
                                  <S.RankBreakdownLegend>
                                    {rankParts.map((part) => (
                                      <span key={part.key}>
                                        <i
                                          style={{ background: part.color }}
                                          aria-hidden
                                        />
                                        {part.label}{' '}
                                        {Math.round(
                                          (part.val / rankTotalSum) * 100,
                                        )}
                                        %
                                      </span>
                                    ))}
                                  </S.RankBreakdownLegend>
                                </S.RankBreakdownWrap>
                              ) : null}
                            </S.StrengthSnapshotBlock>
                          )
                        })}
                      </S.StrengthSnapshotsStack>
                    ) : null}

                    {unit.strength?.trim() ? (
                      <S.StrengthNarrativeProse>
                        {unit.strength.trim()}
                      </S.StrengthNarrativeProse>
                    ) : null}
                  </S.EditorialSection>
                ) : null}

                {/* 임무 · 관할 · 주요 전투 · 수훈 서술 기록 */}
                {contextMetaCards.length > 0 ? (
                  <S.EditorialSection>
                    <S.SectionHeader>
                      <S.SectionHeadLeft>
                        <S.SectionTitle>임무 · 관할 · 전훈 기록</S.SectionTitle>
                      </S.SectionHeadLeft>
                    </S.SectionHeader>

                    <S.DossierProseGrid>
                      {contextMetaCards.map((card) => (
                        <S.DossierProseItem key={card.label}>
                          <S.DossierProseLabel>
                            {card.label}
                          </S.DossierProseLabel>
                          <S.DossierProseBody>{card.body}</S.DossierProseBody>
                        </S.DossierProseItem>
                      ))}
                    </S.DossierProseGrid>
                  </S.EditorialSection>
                ) : null}

                {/* 직속 예하 편제 (전체 도시에 뷰에서는 0건이면 본문 생략) */}
                {(activeTab === 'overview' || sortedSubUnits.length > 0) ? (
                <S.EditorialSection $compactEmpty={sortedSubUnits.length === 0}>
                  <S.SectionHeader>
                    <S.SectionHeadLeft>
                      <S.SectionTitle>
                        {subViewMode === 'tree' && hasGrandchildren
                          ? '하위 편제 계통'
                          : '직속 예하 편제'}
                      </S.SectionTitle>
                      {sortedSubUnits.length > 0 ? (
                        <S.SectionCount>
                          {subViewMode === 'tree' && hasGrandchildren
                            ? totalDescendantCount
                            : sortedSubUnits.length}
                        </S.SectionCount>
                      ) : (
                        <S.SectionEmptyInline>없음</S.SectionEmptyInline>
                      )}
                    </S.SectionHeadLeft>

                    <S.RowActions>
                      {hasGrandchildren ? (
                        <S.SubViewSegment
                          role="group"
                          aria-label="예하 편제 보기 방식"
                        >
                          <S.SubViewSegBtn
                            type="button"
                            $active={subViewMode === 'cards'}
                            onClick={() => setSubViewMode('cards')}
                          >
                            <FiGrid size={11.5} /> 직속
                          </S.SubViewSegBtn>
                          <S.SubViewSegBtn
                            type="button"
                            $active={subViewMode === 'tree'}
                            onClick={() => setSubViewMode('tree')}
                          >
                            <FiList size={11.5} /> 계통 ({totalDescendantCount})
                          </S.SubViewSegBtn>
                        </S.SubViewSegment>
                      ) : null}
                      {onCreateSubUnit ? (
                        <LedgerCompactAction
                          type="button"
                          onClick={handleOpenSubUnitCreate}
                        >
                          <FiPlus size={12} /> 예하 추가
                        </LedgerCompactAction>
                      ) : null}
                    </S.RowActions>
                  </S.SectionHeader>

                  {sortedSubUnits.length > 0 ? (
                    subViewMode === 'tree' && hasGrandchildren ? (
                      <S.SubTreeContainer>
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
                            const kids = (
                              childrenByParentMap.get(nodeItem.id) ?? []
                            ).filter((kidItem) => !visitedSet.has(kidItem.id))
                            const isCollapsed = collapsedSubIds.has(nodeItem.id)
                            const nextVisited = new Set(visitedSet)
                            nextVisited.add(nodeItem.id)
                            const subMetaParts = [
                              nodeItem.unitType
                                ? militaryUnitTypeLabelKo(nodeItem.unitType)
                                : null,
                              nodeItem.branch
                                ? (MILITARY_BRANCH_LABELS[nodeItem.branch] ??
                                  nodeItem.branch)
                                : null,
                            ].filter(Boolean)

                            return (
                              <S.SubTreeNodeWrap
                                key={nodeItem.id}
                                $child={depth > 0}
                              >
                                <S.SubTreeRow>
                                  {kids.length > 0 ? (
                                    <S.SubTreeToggleBtn
                                      type="button"
                                      aria-label={
                                        isCollapsed ? '하위 펼치기' : '하위 접기'
                                      }
                                      onClick={() =>
                                        setCollapsedSubIds((prev) => {
                                          const next = new Set(prev)
                                          if (next.has(nodeItem.id)) {
                                            next.delete(nodeItem.id)
                                          } else {
                                            next.add(nodeItem.id)
                                          }
                                          return next
                                        })
                                      }
                                    >
                                      {isCollapsed ? (
                                        <FiChevronRight size={13} />
                                      ) : (
                                        <FiChevronDown size={13} />
                                      )}
                                    </S.SubTreeToggleBtn>
                                  ) : (
                                    <S.SubTreeSpacer />
                                  )}
                                  <S.InlineEntityBtn
                                    type="button"
                                    onClick={() => onSelectUnit(nodeItem.id)}
                                  >
                                    {nodeItem.name}
                                    {nodeItem.abbreviation
                                      ? ` (${nodeItem.abbreviation})`
                                      : ''}
                                  </S.InlineEntityBtn>
                                  {subMetaParts.length > 0 ? (
                                    <S.QuietMetaItem>
                                      {subMetaParts.join(' · ')}
                                    </S.QuietMetaItem>
                                  ) : null}
                                  {kids.length > 0 ? (
                                    <S.MutedSpan style={{ fontSize: 11.5 }}>
                                      · 예하 {kids.length}
                                    </S.MutedSpan>
                                  ) : null}
                                </S.SubTreeRow>
                                {kids.length > 0 && !isCollapsed ? (
                                  <S.SubTreeChildren>
                                    {kids.map((childNode) =>
                                      renderSubTreeNode(
                                        childNode,
                                        depth + 1,
                                        nextVisited,
                                      ),
                                    )}
                                  </S.SubTreeChildren>
                                ) : null}
                              </S.SubTreeNodeWrap>
                            )
                          }

                          const rootVisited = new Set<string>([unit.id])
                          return sortedSubUnits.map((sub) =>
                            renderSubTreeNode(sub, 0, rootVisited),
                          )
                        })()}
                      </S.SubTreeContainer>
                    ) : (
                      <S.SubUnitDirectoryGrid>
                        {sortedSubUnits.map((sub) => {
                          const subMeta = [
                            sub.unitType
                              ? militaryUnitTypeLabelKo(sub.unitType)
                              : null,
                            sub.branch
                              ? (MILITARY_BRANCH_LABELS[sub.branch] ??
                                sub.branch)
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')
                          return (
                            <S.SubUnitRowBtn
                              key={sub.id}
                              type="button"
                              onClick={() => onSelectUnit(sub.id)}
                            >
                              <S.SubUnitRowText>
                                {subMeta ? (
                                  <span className="sub-meta">{subMeta}</span>
                                ) : null}
                                <span className="sub-name">
                                  {sub.name}
                                  {sub.abbreviation
                                    ? ` (${sub.abbreviation})`
                                    : ''}
                                </span>
                              </S.SubUnitRowText>
                              <FiArrowUpRight size={13} className="open-icon" />
                            </S.SubUnitRowBtn>
                          )
                        })}
                      </S.SubUnitDirectoryGrid>
                    )
                  ) : null}
                </S.EditorialSection>
                ) : null}

                {/* 배속 함정 */}
                {vessels.length > 0 ? (
                  <S.EditorialSection>
                    <S.SectionHeader>
                      <S.SectionHeadLeft>
                        <S.SectionTitle>배속 함정</S.SectionTitle>
                        <S.SectionCount>{vessels.length}척</S.SectionCount>
                      </S.SectionHeadLeft>
                    </S.SectionHeader>

                    <S.TableWrap>
                      <S.LedgerTable>
                        <thead>
                          <tr>
                            <th>함명</th>
                            <th>함종 · 함급</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vessels.map((vessel) => (
                            <tr key={vessel.id}>
                              <td>
                                <strong>{vessel.name}</strong>
                              </td>
                              <td>
                                {[vessel.vesselType, vessel.vesselClass]
                                  .filter(Boolean)
                                  .join(' · ') || '함정'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </S.LedgerTable>
                    </S.TableWrap>
                  </S.EditorialSection>
                ) : null}

                {/* 전신 · 후신 개편 계보 (전체 도시에 뷰에서는 0건이고 닫혀있으면 생략) */}
                {(activeTab === 'overview' ||
                  predecessors.length + successors.length > 0 ||
                  addTransitionOpen) ? (
                <S.EditorialSection
                  $compactEmpty={
                    predecessors.length === 0 &&
                    successors.length === 0 &&
                    !addTransitionOpen
                  }
                >
                  <S.SectionHeader>
                    <S.SectionHeadLeft>
                      <S.SectionTitle>조직 개편 계보</S.SectionTitle>
                      {predecessors.length + successors.length > 0 ? (
                        <S.SectionCount>
                          {predecessors.length + successors.length}
                        </S.SectionCount>
                      ) : (
                        <S.SectionEmptyInline>없음</S.SectionEmptyInline>
                      )}
                    </S.SectionHeadLeft>

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
                          <FiPlus size={12} /> 계보 연결
                        </>
                      )}
                    </LedgerCompactAction>
                  </S.SectionHeader>

                  {predecessors.length > 0 || successors.length > 0 ? (
                    <S.LineageList>
                      {[
                        ...predecessors.map((predItem) => ({
                          directionLabel:
                            predItem.targetType === 'DEPARTMENT'
                              ? '← 전신 기관'
                              : '← 전신 편제',
                          item: predItem,
                        })),
                        ...successors.map((succItem) => ({
                          directionLabel: '→ 후신 편제',
                          item: succItem,
                        })),
                      ].map(({ directionLabel, item }) => {
                        const targetName =
                          item.targetType === 'DEPARTMENT'
                            ? (item.department?.name ?? '행정부처')
                            : (item.unit?.name ?? '군사부대')
                        const timeText = formatTransitionTimeLabel(item)
                        const kindLabel =
                          MILITARY_TRANSITION_KIND_LABELS[item.kind] ??
                          item.kind
                        const isEditingThis =
                          editingTransitionId === item.transitionId

                        return (
                          <S.LineageRow key={item.transitionId}>
                            <S.LineageRowMain>
                              <S.LineageDirectionTag>
                                {directionLabel}
                              </S.LineageDirectionTag>
                              <S.LineageKindText>{kindLabel}</S.LineageKindText>
                              {timeText ? (
                                <S.LineageYearText>{timeText}</S.LineageYearText>
                              ) : null}
                              {item.targetType === 'DEPARTMENT' &&
                              item.department ? (
                                <S.InlineEntityBtn
                                  type="button"
                                  onClick={() =>
                                    handleJumpDepartment(item.department!.id)
                                  }
                                >
                                  {item.department.name}
                                  {item.department.abbreviation
                                    ? ` (${item.department.abbreviation})`
                                    : ''}
                                  <FiArrowUpRight size={12} />
                                </S.InlineEntityBtn>
                              ) : item.unit ? (
                                <S.InlineEntityBtn
                                  type="button"
                                  onClick={() => onSelectUnit(item.unit!.id)}
                                >
                                  {item.unit.name}
                                  {item.unit.abbreviation
                                    ? ` (${item.unit.abbreviation})`
                                    : ''}
                                  {item.unit.unitType
                                    ? ` · ${militaryUnitTypeLabelKo(item.unit.unitType)}`
                                    : ''}
                                </S.InlineEntityBtn>
                              ) : null}
                              {item.note ? (
                                <S.LineageNote>— {item.note}</S.LineageNote>
                              ) : null}
                            </S.LineageRowMain>

                            <S.RowActions>
                              <PopoverMenu
                                size="sm"
                                ariaLabel={`${targetName} 계보 관리 메뉴`}
                                items={[
                                  {
                                    id: 'edit',
                                    label: isEditingThis
                                      ? '수정 닫기'
                                      : '계보 수정',
                                    icon: <FiEdit2 size={12} />,
                                    onSelect: () => {
                                      if (isEditingThis) {
                                        setEditingTransitionId(null)
                                      } else {
                                        openEditTransition(item)
                                      }
                                    },
                                  },
                                  { type: 'divider', id: 'div' },
                                  {
                                    id: 'delete',
                                    label: '계보 연결 삭제',
                                    icon: <FiTrash2 size={12} />,
                                    danger: true,
                                    disabled: transitionBusy,
                                    onSelect: () =>
                                      void handleDeleteTransition(
                                        item.transitionId,
                                        targetName,
                                      ),
                                  },
                                ]}
                              />
                            </S.RowActions>

                            {isEditingThis ? (
                              <S.InlineFormBox>
                                <S.InlineFormRow>
                                  <S.FormSelect
                                    aria-label="개편 유형"
                                    value={editTransitionKind}
                                    onChange={(evt) =>
                                      setEditTransitionKind(
                                        evt.target
                                          .value as MilitaryUnitTransitionKind,
                                      )
                                    }
                                    style={{ maxWidth: 164 }}
                                  >
                                    {MILITARY_TRANSITION_KIND_OPTIONS.map(
                                      (opt) => (
                                        <option
                                          key={opt.value}
                                          value={opt.value}
                                        >
                                          {opt.label}
                                        </option>
                                      ),
                                    )}
                                  </S.FormSelect>
                                  <S.InlineFieldSlot $minW={220} $flex="0 1 250px">
                                    <StructuredPartsDateField
                                      era={editTransitionEra}
                                      year={editTransitionYear}
                                      month={editTransitionMonth}
                                      day=""
                                      onChange={(nextParts) => {
                                        setEditTransitionEra(nextParts.era)
                                        setEditTransitionYear(nextParts.year)
                                        setEditTransitionMonth(nextParts.month)
                                      }}
                                      ariaLabel="개편 시점"
                                      pickerTitle="개편 시점 선택"
                                    />
                                  </S.InlineFieldSlot>
                                  <S.FormInput
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
                                      void handleUpdateTransition(
                                        item.transitionId,
                                      )
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
                                </S.InlineFormRow>
                              </S.InlineFormBox>
                            ) : null}
                          </S.LineageRow>
                        )
                      })}
                    </S.LineageList>
                  ) : null}

                  {addTransitionOpen ? (
                    <S.InlineFormBox>
                      <S.InlineFormRow>
                        <S.FormSelect
                          aria-label="계보 방향"
                          value={transitionDirection}
                          onChange={(evt) => {
                            setTransitionDirection(
                              evt.target.value as TransitionDirection,
                            )
                            setTransitionTargetId('')
                          }}
                          style={{ maxWidth: 230 }}
                        >
                          <option value="PREDECESSOR_UNIT">
                            ← 전신 군사부대 (이전 → 현재)
                          </option>
                          <option value="PREDECESSOR_DEPT">
                            ← 전신 행정부처 (기관 → 현재)
                          </option>
                          <option value="SUCCESSOR_UNIT">
                            → 후신 군사부대 (현재 → 후속)
                          </option>
                        </S.FormSelect>

                        <S.InlineFieldSlot $minW={220} $flex="1 1 240px">
                          {transitionDirection === 'PREDECESSOR_DEPT' ? (
                            <SearchableSelect
                              size="sm"
                              ariaLabel="전신 행정부처 선택"
                              options={lineageDeptSelectOptions}
                              value={transitionTargetId}
                              onChange={(nextVal) =>
                                setTransitionTargetId(nextVal)
                              }
                              placeholder={
                                departmentsForLineageQuery.isLoading
                                  ? '행정부처 불러오는 중…'
                                  : '전신 행정부처 검색·선택…'
                              }
                              searchPlaceholder="부처명·약칭 검색…"
                            />
                          ) : (
                            <SearchableSelect
                              size="sm"
                              ariaLabel="연결할 군사부대 선택"
                              options={lineageUnitSelectOptions}
                              value={transitionTargetId}
                              onChange={(nextVal) =>
                                setTransitionTargetId(nextVal)
                              }
                              placeholder={
                                transitionDirection === 'PREDECESSOR_UNIT'
                                  ? '전신 군사부대 검색·선택…'
                                  : '후신 군사부대 검색·선택…'
                              }
                              searchPlaceholder="부대명·약칭·제대 검색…"
                            />
                          )}
                        </S.InlineFieldSlot>

                        <S.FormSelect
                          aria-label="개편 유형"
                          value={transitionKind}
                          onChange={(evt) =>
                            setTransitionKind(
                              evt.target.value as MilitaryUnitTransitionKind,
                            )
                          }
                          style={{ maxWidth: 164 }}
                        >
                          {MILITARY_TRANSITION_KIND_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </S.FormSelect>
                      </S.InlineFormRow>

                      <S.InlineFormRow>
                        <S.InlineFieldSlot $minW={220} $flex="0 1 250px">
                          <StructuredPartsDateField
                            era={transitionEra}
                            year={transitionYear}
                            month={transitionMonth}
                            day=""
                            onChange={(nextParts) => {
                              setTransitionEra(nextParts.era)
                              setTransitionYear(nextParts.year)
                              setTransitionMonth(nextParts.month)
                            }}
                            ariaLabel="전환 시점"
                            pickerTitle="전환 시점 선택"
                          />
                        </S.InlineFieldSlot>
                        <S.FormInput
                          type="text"
                          placeholder="개편 메모 (선택)"
                          value={transitionNote}
                          onChange={(evt) =>
                            setTransitionNote(evt.target.value)
                          }
                        />
                        <LedgerPrimaryButton
                          type="button"
                          disabled={transitionBusy || !transitionTargetId}
                          onClick={() => void handleAddTransition()}
                        >
                          {transitionBusy ? '저장 중…' : '계보 연결'}
                        </LedgerPrimaryButton>
                      </S.InlineFormRow>
                    </S.InlineFormBox>
                  ) : null}
                </S.EditorialSection>
                ) : null}
              </>
            )}

            {/* 역대 지휘관 · 참모 */}
            {(activeTab === 'all' || activeTab === 'commanders') && (
              <>
                {countryIdForLink && variant === 'page' ? (
                  <S.UnlinkedBarBox>
                    <UnlinkedCountryTenuresBar
                      mode="MILITARY_UNIT"
                      effectiveCountryId={countryIdForLink}
                      isHistorical={scopeIsHistorical}
                      targetOptions={sameCountryUnitOptions}
                    />
                  </S.UnlinkedBarBox>
                ) : null}

                {(activeTab === 'commanders' || totalCommanderCount > 0) ? (
              <S.EditorialSection $compactEmpty={totalCommanderCount === 0}>
                <S.SectionHeader>
                  <S.SectionHeadLeft>
                    <S.SectionTitle>역대 지휘관 · 참모</S.SectionTitle>
                    {totalCommanderCount > 0 ? (
                      <S.SectionCount>{totalCommanderCount}명</S.SectionCount>
                    ) : (
                      <S.SectionEmptyInline>없음</S.SectionEmptyInline>
                    )}
                    {unifiedTenures.length > 1 ? (
                      <LedgerCompactAction
                        type="button"
                        onClick={() =>
                          setCommanderSort((prev) =>
                            prev === 'asc' ? 'desc' : 'asc',
                          )
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
                  </S.SectionHeadLeft>

                  <S.RowActions>
                    {totalCommanderCount > 3 ? (
                      <S.CommanderSearchWrap>
                        <FiSearch size={12} />
                        <S.CommanderSearchInput
                          type="text"
                          value={commanderSearch}
                          onChange={(evt) =>
                            setCommanderSearch(evt.target.value)
                          }
                          placeholder="인물·보직·계급 검색"
                          aria-label="역대 지휘관 검색"
                        />
                        {commanderSearch ? (
                          <S.CommanderSearchClear
                            type="button"
                            onClick={() => setCommanderSearch('')}
                            aria-label="검색어 지우기"
                          >
                            <FiX size={11} />
                          </S.CommanderSearchClear>
                        ) : null}
                      </S.CommanderSearchWrap>
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
                  </S.RowActions>
                </S.SectionHeader>

                {totalCommanderCount > 0 &&
                filteredTenures.length === 0 &&
                filteredLegacyCommanders.length === 0 ? (
                  <S.SectionEmptyInline>
                    ‘{commanderSearch}’ 검색어와 일치하는 기록이 없습니다.
                  </S.SectionEmptyInline>
                ) : totalCommanderCount > 0 ? (
                  <S.TableWrap>
                    <S.LedgerTable>
                      <thead>
                        <tr>
                          <th>지휘관 · 참모</th>
                          <th>계급 · 보직명</th>
                          <th>재임 기간</th>
                          <th style={{ width: 44, textAlign: 'right' }} />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTenures.map((tenureItem) => {
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
                          const roleLabel =
                            [
                              tenureItem.rankTitle,
                              tenureItem.title ??
                                tenureItem.positionDefinition?.title,
                            ]
                              .filter(Boolean)
                              .join(' · ') || '지휘관'
                          const portraitUrl = tenureItem.person?.profileImageUrl
                            ? getUploadImageUrl(
                                tenureItem.person.profileImageUrl,
                              )
                            : null
                          const durationMeta = tenureDurationById.get(
                            tenureItem.id,
                          )
                          const barPct = durationMeta
                            ? Math.round(
                                (durationMeta.days / maxCommanderTenureDays) *
                                  100,
                              )
                            : 0
                          return (
                            <tr key={tenureItem.id}>
                              <td>
                                <S.PersonCellRow>
                                  {tenureItem.ordinal != null ? (
                                    <S.OrdinalText>
                                      제{tenureItem.ordinal}대
                                    </S.OrdinalText>
                                  ) : null}
                                  <S.PersonAvatarCircle aria-hidden>
                                    {portraitUrl ? (
                                      <img
                                        src={portraitUrl}
                                        alt=""
                                        onError={(imgEvt) => {
                                          imgEvt.currentTarget.style.display =
                                            'none'
                                        }}
                                      />
                                    ) : (
                                      personName.trim().slice(0, 1) || '?'
                                    )}
                                  </S.PersonAvatarCircle>
                                  {targetPersonId ? (
                                    <S.InlineEntityBtn
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
                                      {personName}
                                    </S.InlineEntityBtn>
                                  ) : (
                                    <span>{personName}</span>
                                  )}
                                  {tenureItem.party ? (
                                    <S.PartyTag
                                      $color={tenureItem.party.brandColor}
                                    >
                                      {tenureItem.party.shortName ||
                                        tenureItem.party.name}
                                    </S.PartyTag>
                                  ) : null}
                                </S.PersonCellRow>
                              </td>
                              <td>{roleLabel}</td>
                              <td className="num">
                                <S.TenureSpanStack>
                                  <S.TenureSpanLine>
                                    <span>{formatTenureSpan(tenureItem)}</span>
                                    {durationMeta ? (
                                      <S.TenureDurationSub>
                                        · {durationMeta.label}
                                      </S.TenureDurationSub>
                                    ) : null}
                                  </S.TenureSpanLine>
                                  {durationMeta && unifiedTenures.length > 1 ? (
                                    <S.TenureBarTrack aria-hidden>
                                      <S.TenureBarFill $pct={barPct} />
                                    </S.TenureBarTrack>
                                  ) : null}
                                </S.TenureSpanStack>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <PopoverMenu
                                  size="sm"
                                  ariaLabel={`${personName} 보직 관리 메뉴`}
                                  items={[
                                    {
                                      id: 'edit',
                                      label: '보직 수정',
                                      icon: <FiEdit2 size={12} />,
                                      onSelect: () => {
                                        setEditingTenure({
                                          id: tenureItem.id,
                                          personId: targetPersonId,
                                          personName,
                                          positionType:
                                            tenureItem.positionType ?? null,
                                          positionDefinitionId:
                                            tenureItem.positionDefinitionId ??
                                            null,
                                          title: tenureItem.title ?? null,
                                          rankTitle:
                                            tenureItem.rankTitle ?? null,
                                          ordinal: tenureItem.ordinal ?? null,
                                          partyId: tenureItem.partyId ?? null,
                                          militaryUnitId: unit.id,
                                          startDate:
                                            tenureItem.startDate ?? null,
                                          endDate: tenureItem.endDate ?? null,
                                          startEra:
                                            tenureItem.startEra ?? null,
                                          startYear:
                                            tenureItem.startYear ?? null,
                                          startMonth:
                                            tenureItem.startMonth ?? null,
                                          startDay:
                                            tenureItem.startDay ?? null,
                                          endEra: tenureItem.endEra ?? null,
                                          endYear: tenureItem.endYear ?? null,
                                          endMonth:
                                            tenureItem.endMonth ?? null,
                                          endDay: tenureItem.endDay ?? null,
                                          notes: tenureItem.notes ?? null,
                                        })
                                        setAppointmentOpen(true)
                                      },
                                    },
                                    { type: 'divider', id: 'div' },
                                    {
                                      id: 'delete',
                                      label: '보직 삭제',
                                      icon: <FiTrash2 size={12} />,
                                      danger: true,
                                      onSelect: () =>
                                        void handleDeleteCommanderTenure(
                                          tenureItem,
                                        ),
                                    },
                                  ]}
                                />
                              </td>
                            </tr>
                          )
                        })}

                        {filteredLegacyCommanders.map((cmdItem) => {
                          const fullName = cmdItem.person
                            ? [cmdItem.person.name, cmdItem.person.surname]
                                .filter(Boolean)
                                .join(' ')
                            : '인물 미상'
                          const legacyPortrait = cmdItem.person?.profileImageUrl
                            ? getUploadImageUrl(cmdItem.person.profileImageUrl)
                            : null
                          const startStr = cmdItem.startDate
                            ? cmdItem.startDate.slice(0, 10)
                            : '?'
                          const endStr = cmdItem.endDate
                            ? cmdItem.endDate.slice(0, 10)
                            : cmdItem.isCurrent
                              ? '현임'
                              : '?'
                          return (
                            <tr key={cmdItem.id}>
                              <td>
                                <S.PersonCellRow>
                                  <S.PersonAvatarCircle aria-hidden>
                                    {legacyPortrait ? (
                                      <img
                                        src={legacyPortrait}
                                        alt=""
                                        onError={(imgEvt) => {
                                          imgEvt.currentTarget.style.display =
                                            'none'
                                        }}
                                      />
                                    ) : (
                                      fullName.trim().slice(0, 1) || '?'
                                    )}
                                  </S.PersonAvatarCircle>
                                  <S.InlineEntityBtn
                                    type="button"
                                    onClick={(evt) => {
                                      if (!shouldInterceptEntityClick(evt)) {
                                        navigate(
                                          pathKeys.personsTimelineDetail(
                                            cmdItem.personId,
                                          ),
                                        )
                                        return
                                      }
                                      setInspectPersonId(cmdItem.personId)
                                    }}
                                  >
                                    {fullName}
                                  </S.InlineEntityBtn>
                                </S.PersonCellRow>
                              </td>
                              <td>
                                {[cmdItem.rank, cmdItem.role]
                                  .filter(Boolean)
                                  .join(' · ') || '지휘관'}
                              </td>
                              <td className="num">
                                {startStr} ~ {endStr}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <S.MutedSpan style={{ fontSize: 11 }}>
                                  기존 기록
                                </S.MutedSpan>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </S.LedgerTable>
                  </S.TableWrap>
                ) : null}
              </S.EditorialSection>
                ) : null}
              </>
            )}

            {/* 참전 · 작전 · 지령 */}
            {(activeTab === 'all' || activeTab === 'operations') && (
              <>
                {(activeTab === 'operations' ||
                  deployments.length > 0 ||
                  Boolean(pendingDeploymentEvent)) ? (
                <S.EditorialSection
                  $compactEmpty={
                    deployments.length === 0 && !pendingDeploymentEvent
                  }
                >
                  <S.SectionHeader>
                    <S.SectionHeadLeft>
                      <S.SectionTitle>참전 작전 · 전투 투입</S.SectionTitle>
                      {deployments.length > 0 ? (
                        <S.SectionCount>{deployments.length}건</S.SectionCount>
                      ) : (
                        <S.SectionEmptyInline>없음</S.SectionEmptyInline>
                      )}
                    </S.SectionHeadLeft>
                    <LedgerCompactAction
                      type="button"
                      onClick={() => setDeploymentPickerOpen(true)}
                    >
                      <FiPlus size={12} /> 참전 연결
                    </LedgerCompactAction>
                  </S.SectionHeader>

                  {pendingDeploymentEvent ? (
                    <S.InlineFormBox>
                      <S.InlineFormRow>
                        <strong style={{ fontSize: 12.5 }}>
                          {pendingDeploymentEvent.title}
                        </strong>
                        {pendingEventSides.length > 0 ? (
                          <S.FormSelect
                            aria-label="투입 진영"
                            value={selectedDeploySideId}
                            onChange={(e) =>
                              setSelectedDeploySideId(e.target.value)
                            }
                          >
                            {pendingEventSides.map((sideItem) => (
                              <option key={sideItem.id} value={sideItem.id}>
                                진영: {sideItem.name}
                              </option>
                            ))}
                          </S.FormSelect>
                        ) : (
                          <S.FormInput
                            type="text"
                            placeholder="자동 생성할 진영명"
                            value={autoSideName}
                            onChange={(e) => setAutoSideName(e.target.value)}
                            style={{ maxWidth: 160 }}
                          />
                        )}
                        <S.FormSelect
                          aria-label="작전 역할"
                          value={deployRole}
                          onChange={(e) =>
                            setDeployRole(e.target.value as SideUnitRole)
                          }
                        >
                          <option value="MAIN_EFFORT">주공</option>
                          <option value="SUPPORTING">조공·지원</option>
                          <option value="DEFENSE">수비·방어</option>
                          <option value="RESERVE">예비</option>
                          <option value="OTHER">기타</option>
                        </S.FormSelect>
                        <S.FormInput
                          type="text"
                          placeholder="작전 메모 (예: 민스크 포위 돌파)"
                          value={deployNote}
                          onChange={(e) => setDeployNote(e.target.value)}
                        />
                        <LedgerCompactAction
                          type="button"
                          $primary
                          disabled={deployBusy}
                          onClick={() => void handleSaveDeploymentLink()}
                        >
                          {deployBusy ? '저장 중…' : '투입 저장'}
                        </LedgerCompactAction>
                        <LedgerCompactAction
                          type="button"
                          onClick={() => setPendingDeploymentEvent(null)}
                        >
                          취소
                        </LedgerCompactAction>
                      </S.InlineFormRow>
                    </S.InlineFormBox>
                  ) : null}

                  {deployments.length > 0 ? (
                    <S.TableWrap>
                      <S.LedgerTable>
                        <thead>
                          <tr>
                            <th style={{ width: 112 }}>시기</th>
                            <th>작전 · 전투</th>
                            <th style={{ width: 140 }}>진영 · 결과</th>
                            {!isCompact ? (
                              <>
                                <th>현장 지휘 · 역할</th>
                                <th>전과 · 투입 병기</th>
                              </>
                            ) : null}
                            <th style={{ width: 44, textAlign: 'right' }} />
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
                              side.outcome &&
                              side.outcome in SIDE_OUTCOME_LABEL
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
                                  <S.DeploymentEventCell>
                                    <S.InlineLink
                                      to={pathKeys.events.detail(ev.id)}
                                    >
                                      {ev.title}
                                    </S.InlineLink>
                                    <S.DeploymentSubLinks>
                                      {ev.kind === 'COLLECTION' ? (
                                        <S.SurveyLink
                                          to={`${pathKeys.events.detail(ev.id)}?tab=survey&unit=${encodeURIComponent(unit.id)}`}
                                        >
                                          조망·전황 ↗
                                        </S.SurveyLink>
                                      ) : (
                                        <>
                                          <S.SurveyLink
                                            to={`${pathKeys.events.detail(ev.id)}?tab=modules&unit=${encodeURIComponent(unit.id)}#module-sides`}
                                          >
                                            전투서열 ↗
                                          </S.SurveyLink>
                                          {ev.parentEventId ? (
                                            <S.SurveyLink
                                              to={`${pathKeys.events.detail(ev.parentEventId)}?tab=survey&sv=map&unit=${encodeURIComponent(unit.id)}&event=${encodeURIComponent(ev.id)}`}
                                            >
                                              전역 지도 ↗
                                            </S.SurveyLink>
                                          ) : null}
                                        </>
                                      )}
                                      {ev.parentEvent ? (
                                        <S.ParentWarHintLink
                                          to={pathKeys.events.detail(
                                            ev.parentEvent.id,
                                          )}
                                        >
                                          상위: {ev.parentEvent.title}
                                        </S.ParentWarHintLink>
                                      ) : null}
                                    </S.DeploymentSubLinks>
                                  </S.DeploymentEventCell>
                                </td>
                                <td>
                                  <S.SideOutcomeStack>
                                    <strong>{side.name}</strong>
                                    {outcomeLabel ? (
                                      <S.OutcomeSpan
                                        $tone={resolveSideOutcomeTone(
                                          side.outcome,
                                        )}
                                      >
                                        {outcomeLabel}
                                      </S.OutcomeSpan>
                                    ) : null}
                                  </S.SideOutcomeStack>
                                </td>
                                {!isCompact ? (
                                  <>
                                    <td>
                                      <S.ChipStack>
                                        {dep.parentUnit ? (
                                          <S.InlineEntityBtn
                                            type="button"
                                            onClick={() =>
                                              onSelectUnit(dep.parentUnit!.id)
                                            }
                                          >
                                            상급: {dep.parentUnit.name}
                                          </S.InlineEntityBtn>
                                        ) : null}
                                        {dep.commander && commanderName ? (
                                          <S.InlineEntityBtn
                                            type="button"
                                            onClick={(evt) => {
                                              if (
                                                !shouldInterceptEntityClick(
                                                  evt,
                                                )
                                              ) {
                                                navigate(
                                                  pathKeys.personsTimelineDetail(
                                                    dep.commander!.id,
                                                  ),
                                                )
                                                return
                                              }
                                              setInspectPersonId(
                                                dep.commander!.id,
                                              )
                                            }}
                                          >
                                            {commanderName}
                                          </S.InlineEntityBtn>
                                        ) : null}
                                        {roleLabel || dep.note ? (
                                          <S.QuietMetaItem>
                                            {[roleLabel, dep.note]
                                              .filter(Boolean)
                                              .join(' — ')}
                                          </S.QuietMetaItem>
                                        ) : !dep.parentUnit &&
                                          !dep.commander ? (
                                          <S.MutedSpan>—</S.MutedSpan>
                                        ) : null}
                                      </S.ChipStack>
                                    </td>
                                    <td>
                                      <S.ChipStack>
                                        {unitMetrics.map((metricItem) => {
                                          const rawVal =
                                            metricItem.value ??
                                            metricItem.low ??
                                            metricItem.high
                                          const formattedVal =
                                            rawVal != null &&
                                            Number.isFinite(Number(rawVal))
                                              ? Number(rawVal).toLocaleString(
                                                  'ko-KR',
                                                )
                                              : (rawVal ?? '')
                                          return (
                                            <S.QuietMetaItem
                                              key={metricItem.id}
                                            >
                                              {metricItem.metricName}{' '}
                                              {metricItem.approx ? '약 ' : ''}
                                              {formattedVal}
                                              {metricItem.unit
                                                ? metricItem.unit
                                                : ''}
                                            </S.QuietMetaItem>
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
                                            weaponEntry.note
                                              ? weaponEntry.note
                                              : null,
                                          ].filter(Boolean)
                                          return (
                                            <S.QuietMetaItem
                                              key={weaponEntry.id}
                                            >
                                              {assetName}
                                              {countParts.length > 0
                                                ? ` (${countParts.join(' · ')})`
                                                : ''}
                                            </S.QuietMetaItem>
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
                                            <S.SurveyLink
                                              key={featItem.id}
                                              to={mapTargetUrl}
                                            >
                                              {featItem.title} ↗
                                            </S.SurveyLink>
                                          )
                                        })}
                                        {unitMetrics.length === 0 &&
                                        weapons.length === 0 &&
                                        mapFeatures.length === 0 ? (
                                          <S.MutedSpan>—</S.MutedSpan>
                                        ) : null}
                                      </S.ChipStack>
                                    </td>
                                  </>
                                ) : null}
                                <td style={{ textAlign: 'right' }}>
                                  <PopoverMenu
                                    size="sm"
                                    ariaLabel={`${ev.title} 참전 관리`}
                                    items={[
                                      {
                                        id: 'remove-dep',
                                        label: '참전 연결 해제',
                                        icon: <FiTrash2 size={12} />,
                                        danger: true,
                                        onSelect: () =>
                                          void handleRemoveDeploymentLink(
                                            ev.id,
                                            dep.id,
                                            ev.title,
                                          ),
                                      },
                                    ]}
                                  />
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </S.LedgerTable>
                    </S.TableWrap>
                  ) : null}
                </S.EditorialSection>
                ) : null}

                {(activeTab === 'operations' ||
                  eventRelations.length > 0 ||
                  Boolean(pendingEvent) ||
                  Boolean(editingEventLink)) ? (
                <S.EditorialSection
                  $compactEmpty={
                    eventRelations.length === 0 &&
                    !pendingEvent &&
                    !editingEventLink
                  }
                >
                  <S.SectionHeader>
                    <S.SectionHeadLeft>
                      <S.SectionTitle>지령 · 작전 관여 사건</S.SectionTitle>
                      {eventRelations.length > 0 ? (
                        <S.SectionCount>{eventRelations.length}건</S.SectionCount>
                      ) : (
                        <S.SectionEmptyInline>없음</S.SectionEmptyInline>
                      )}
                    </S.SectionHeadLeft>
                    <LedgerCompactAction
                      type="button"
                      onClick={() => setEventPickerOpen(true)}
                    >
                      <FiPlus size={12} /> 사건·지령 연결
                    </LedgerCompactAction>
                  </S.SectionHeader>

                  {pendingEvent || editingEventLink ? (
                    <S.InlineFormBox>
                      <S.InlineFormRow>
                        <strong style={{ fontSize: 12.5 }}>
                          {editingEventLink
                            ? editingEventLink.event.title
                            : pendingEvent?.title}
                        </strong>
                        <S.FormSelect
                          aria-label="사건 관여 역할"
                          value={eventRole}
                          onChange={(evt) =>
                            setEventRole(
                              evt.target
                                .value as AdministrationDepartmentEventRole,
                            )
                          }
                        >
                          {MILITARY_DIRECTIVE_ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </S.FormSelect>
                        <S.FormInput
                          type="text"
                          placeholder="세부 역할·지령 번호 (예: 작전 지령 제21호 입안)"
                          value={eventRoleDesc}
                          onChange={(evt) =>
                            setEventRoleDesc(evt.target.value)
                          }
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
                      </S.InlineFormRow>
                    </S.InlineFormBox>
                  ) : null}

                  {eventRelations.length > 0 ? (
                    <S.TableWrap>
                      <S.LedgerTable>
                        <thead>
                          <tr>
                            <th style={{ width: 100 }}>시기</th>
                            <th>사건 · 지령명</th>
                            <th style={{ width: 130 }}>관여 역할</th>
                            {!isCompact ? <th>세부 내용</th> : null}
                            <th style={{ width: 44, textAlign: 'right' }} />
                          </tr>
                        </thead>
                        <tbody>
                          {eventRelations.map((relItem) => {
                            const roleKo =
                              EVENT_DEPARTMENT_ROLE_LABEL[
                                relItem.role as AdministrationDepartmentEventRole
                              ] ?? relItem.role
                            return (
                              <tr key={relItem.relationId}>
                                <td className="num">
                                  {relItem.event.startYear
                                    ? `${relItem.event.startEra === 'BC' ? 'BC ' : ''}${relItem.event.startYear}`
                                    : '—'}
                                </td>
                                <td>
                                  <S.InlineLink
                                    to={pathKeys.events.detail(
                                      relItem.event.id,
                                    )}
                                  >
                                    {relItem.event.title}
                                  </S.InlineLink>
                                </td>
                                <td>
                                  <S.QuietMetaItem>{roleKo}</S.QuietMetaItem>
                                </td>
                                {!isCompact ? (
                                  <td>{relItem.roleDescription || '—'}</td>
                                ) : null}
                                <td style={{ textAlign: 'right' }}>
                                  <PopoverMenu
                                    size="sm"
                                    ariaLabel={`${relItem.event.title} 연결 관리 메뉴`}
                                    items={[
                                      {
                                        id: 'edit',
                                        label: '역할 수정',
                                        icon: <FiEdit2 size={12} />,
                                        onSelect: () => {
                                          setPendingEvent(null)
                                          setEditingEventLink(relItem)
                                          setEventRole(
                                            (relItem.role as AdministrationDepartmentEventRole) ||
                                              'ISSUER',
                                          )
                                          setEventRoleDesc(
                                            relItem.roleDescription ?? '',
                                          )
                                        },
                                      },
                                      { type: 'divider', id: 'div' },
                                      {
                                        id: 'delete',
                                        label: '연결 해제',
                                        icon: <FiTrash2 size={12} />,
                                        danger: true,
                                        onSelect: () =>
                                          void handleUnlinkDirectiveEvent(
                                            relItem.event.id,
                                            relItem.relationId,
                                            relItem.event.title,
                                          ),
                                      },
                                    ]}
                                  />
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </S.LedgerTable>
                    </S.TableWrap>
                  ) : null}
                </S.EditorialSection>
                ) : null}
              </>
            )}

            {activeTab === 'all' ? (
              (() => {
                const hasAnyDossierSection =
                  hydratedSnapshots.length > 0 ||
                  Boolean(unit.strength?.trim()) ||
                  contextMetaCards.length > 0 ||
                  sortedSubUnits.length > 0 ||
                  vessels.length > 0 ||
                  predecessors.length + successors.length > 0 ||
                  addTransitionOpen ||
                  totalCommanderCount > 0 ||
                  deployments.length > 0 ||
                  Boolean(pendingDeploymentEvent) ||
                  eventRelations.length > 0 ||
                  Boolean(pendingEvent) ||
                  Boolean(editingEventLink)

                const quickItems: Array<{
                  key: string
                  label: string
                  onClick: () => void
                }> = []

                if (
                  hydratedSnapshots.length === 0 &&
                  !unit.strength?.trim()
                ) {
                  quickItems.push({
                    key: 'strength',
                    label: '병력·전력 제원',
                    onClick: () => onEditUnit(unit.id),
                  })
                }
                if (sortedSubUnits.length === 0 && onCreateSubUnit) {
                  quickItems.push({
                    key: 'sub-unit',
                    label: '예하 편제',
                    onClick: handleOpenSubUnitCreate,
                  })
                }
                if (totalCommanderCount === 0) {
                  quickItems.push({
                    key: 'commander',
                    label: '지휘관·참모 임명',
                    onClick: () => {
                      setEditingTenure(null)
                      setAppointmentOpen(true)
                    },
                  })
                }
                if (deployments.length === 0 && !pendingDeploymentEvent) {
                  quickItems.push({
                    key: 'deployment',
                    label: '참전 연결',
                    onClick: () => setDeploymentPickerOpen(true),
                  })
                }
                if (
                  eventRelations.length === 0 &&
                  !pendingEvent &&
                  !editingEventLink
                ) {
                  quickItems.push({
                    key: 'directive',
                    label: '사건·지령 연결',
                    onClick: () => setEventPickerOpen(true),
                  })
                }
                if (
                  predecessors.length + successors.length === 0 &&
                  !addTransitionOpen
                ) {
                  quickItems.push({
                    key: 'lineage',
                    label: '개편 계보',
                    onClick: () => {
                      setAddTransitionOpen(true)
                      setTransitionTargetId('')
                    },
                  })
                }

                if (quickItems.length === 0) return null

                return (
                  <>
                    {!hasAnyDossierSection ? (
                      <S.DossierEmptyLead>
                        아직 세부 편제·지휘관·참전 기록이 등록되지 않았습니다.
                      </S.DossierEmptyLead>
                    ) : null}
                    <S.QuickAppendStrip aria-label="미등록 기록 빠른 추가">
                      <S.QuickAppendLabel>미등록 기록 추가</S.QuickAppendLabel>
                      {quickItems.map((qItem) => (
                        <S.QuickAppendBtn
                          key={qItem.key}
                          type="button"
                          onClick={qItem.onClick}
                        >
                          <FiPlus size={11.5} />
                          <span>{qItem.label}</span>
                        </S.QuickAppendBtn>
                      ))}
                    </S.QuickAppendStrip>
                  </>
                )
              })()
            ) : null}
          </S.MainArea>
        </S.DossierGrid>
      </S.DetailContainer>

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

      <EventPickerModal
        isOpen={eventPickerOpen}
        onClose={() => setEventPickerOpen(false)}
        onSelect={(selectedEv) => {
          setEditingEventLink(null)
          setPendingEvent(selectedEv)
          setEventRole('ISSUER')
          setEventRoleDesc('')
          setEventPickerOpen(false)
        }}
        excludeEventIds={eventRelations.map((relItem) => relItem.event.id)}
        title="군사 지령 · 작전 사건 선택"
      />

      <EventPickerModal
        isOpen={deploymentPickerOpen}
        onClose={() => setDeploymentPickerOpen(false)}
        onSelect={(selectedEv) => {
          setDeploymentPickerOpen(false)
          void handleSelectDeploymentEvent(selectedEv)
        }}
        excludeEventIds={deployments
          .map((depItem) => depItem.side?.event?.id)
          .filter((id): id is string => Boolean(id))}
        title="참전 전투 · 작전 사건 선택"
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
    </>
  )
})
