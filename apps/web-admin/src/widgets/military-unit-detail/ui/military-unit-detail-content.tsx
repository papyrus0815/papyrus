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
  FiAnchor,
  FiArrowDown,
  FiArrowRight,
  FiArrowUp,
  FiArrowUpRight,
  FiCalendar,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiCompass,
  FiEdit2,
  FiExternalLink,
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

type DetailTabKey = 'overview' | 'commanders' | 'operations'

export interface MilitaryUnitDetailContentProps {
  unitId: string
  variant: MilitaryUnitDetailVariant
  /** 이미 조회된 동일 국가 스코프 부대 목록 (제공 시 중복 쿼리 생략) */
  scopedUnits?: MilitaryUnitDetailResponse[]
  /** 부대 데이터가 로드/변경될 때 상위에 알림 (페이지 타이틀·헤더 동기화용) */
  onUnitLoaded?: (unit: MilitaryUnitDetailResponse | null) => void
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

  const [activeTab, setActiveTab] = useState<DetailTabKey>('overview')
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
    setActiveTab('overview')
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

  const candidateLineageUnits = useMemo(() => {
    if (!unit) return []
    return sortUnitsByEchelon(
      effectiveScopedUnits.filter((candidate) => candidate.id !== unit.id),
    )
  }, [effectiveScopedUnits, unit])

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
        setActiveTab('overview')
        setAddTransitionOpen(true)
      },
      openEventPicker: () => {
        setActiveTab('operations')
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
                      setActiveTab('overview')
                      setAddTransitionOpen(true)
                    },
                  },
                  {
                    id: 'event',
                    label: '사건 · 지령 연결',
                    icon: <FiCompass size={13} />,
                    onSelect: () => {
                      setActiveTab('operations')
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

        {/* 아이덴티티 헤더 카드 */}
        <S.LedgerSection $compact={isCompact}>
          <S.IdentityHeader $compact={isCompact}>
            <S.IdentityMain>
              {unit.insigniaUrl ? (
                <S.InsigniaImg
                  $compact={isCompact}
                  src={getUploadImageUrl(unit.insigniaUrl)}
                  alt={`${unit.name} 휘장`}
                  onError={(evt) => {
                    evt.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <S.InsigniaFallback $compact={isCompact}>
                  <FiShield size={isCompact ? 19 : 22} />
                </S.InsigniaFallback>
              )}

              <S.IdentityTitleGroup>
                <S.BadgeRow>
                  <S.AccentBadge>{unitTypeLabel}</S.AccentBadge>
                  {branchLabel ? (
                    <S.NeutralBadge>{branchLabel}</S.NeutralBadge>
                  ) : null}
                  <S.StatusPill $disbanded={isDisbanded}>
                    {isDisbanded ? '해체·종결' : '존속·현역'}
                  </S.StatusPill>
                </S.BadgeRow>

                <S.UnitTitle $compact={isCompact}>
                  {unit.name}
                  {unit.abbreviation ? (
                    <S.AbbrSpan> ({unit.abbreviation})</S.AbbrSpan>
                  ) : null}
                  {unit.nickname ? (
                    <S.NickSpan> “{unit.nickname}”</S.NickSpan>
                  ) : null}
                </S.UnitTitle>

                {unit.nameLocal || unit.nameEn ? (
                  <S.ForeignTitle>
                    {[unit.nameLocal, unit.nameEn].filter(Boolean).join(' · ')}
                  </S.ForeignTitle>
                ) : null}
                {unit.motto ? (
                  <S.MottoLine>표어: {unit.motto}</S.MottoLine>
                ) : null}
              </S.IdentityTitleGroup>
            </S.IdentityMain>
          </S.IdentityHeader>

          <S.SpecStrip $compact={isCompact}>
            <S.SpecCell>
              <S.SpecLabel>
                <FiCalendar size={11.5} /> 존속 기간
              </S.SpecLabel>
              <S.SpecValue>{periodLabel}</S.SpecValue>
            </S.SpecCell>

            <S.SpecCell>
              <S.SpecLabel>
                <FiGlobe size={11.5} /> 소속 국가 · 정치체
              </S.SpecLabel>
              <S.SpecValue>
                {countryName && countryIdForLink ? (
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
                ) : (
                  <S.MutedSpan>미지정</S.MutedSpan>
                )}
              </S.SpecValue>
            </S.SpecCell>

            <S.SpecCell>
              <S.SpecLabel>
                <FiShield size={11.5} /> 소관 중앙부처
              </S.SpecLabel>
              <S.SpecValue>
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
                    <FiArrowUpRight size={12} />
                    {effectiveDepartment.inherited ? (
                      <S.InheritedHint>(상급 승계)</S.InheritedHint>
                    ) : null}
                  </S.InlineEntityBtn>
                ) : (
                  <S.MutedSpan>직할 · 미연결</S.MutedSpan>
                )}
              </S.SpecValue>
            </S.SpecCell>

            <S.SpecCell>
              <S.SpecLabel>
                <FiMapPin size={11.5} /> 주둔지 · 병력 규모
              </S.SpecLabel>
              <S.SpecValue>
                {[
                  unit.garrison ? unit.garrison : null,
                  headlineStrengthText,
                ]
                  .filter(Boolean)
                  .join(' · ') || <S.MutedSpan>미등록</S.MutedSpan>}
              </S.SpecValue>
            </S.SpecCell>
          </S.SpecStrip>

          {Boolean(
            unit.garrison?.trim() ||
              (unit.garrisonLatitude != null &&
                unit.garrisonLongitude != null) ||
              unit.jurisdictionGeometry ||
              subUnitPins.length > 0,
          ) ? (
            <S.MapPreviewSection>
              <UnitSpatialMapCard
                unitName={unit.name}
                countryName={countryName}
                garrison={unit.garrison}
                garrisonLatitude={unit.garrisonLatitude}
                garrisonLongitude={unit.garrisonLongitude}
                jurisdictionGeometry={unit.jurisdictionGeometry}
                subUnitPins={subUnitPins}
                compact={isCompact}
                onSelectSubUnit={onSelectUnit}
              />
            </S.MapPreviewSection>
          ) : null}
        </S.LedgerSection>

        {/* 통합 3탭 네비게이션 */}
        <UnderlineTabNav aria-label="부대 상세 지면">
          <UnderlineTabButton
            type="button"
            $active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          >
            <span>편제 · 계보</span>
            <UnderlineTabBadge $active={activeTab === 'overview'}>
              {sortedSubUnits.length + predecessors.length + successors.length}
            </UnderlineTabBadge>
          </UnderlineTabButton>
          <UnderlineTabButton
            type="button"
            $active={activeTab === 'commanders'}
            onClick={() => setActiveTab('commanders')}
          >
            <span>역대 지휘관</span>
            <UnderlineTabBadge $active={activeTab === 'commanders'}>
              {totalCommanderCount}
            </UnderlineTabBadge>
          </UnderlineTabButton>
          <UnderlineTabButton
            type="button"
            $active={activeTab === 'operations'}
            onClick={() => setActiveTab('operations')}
          >
            <span>참전 · 작전 · 지령</span>
            <UnderlineTabBadge $active={activeTab === 'operations'}>
              {deployments.length + eventRelations.length}
            </UnderlineTabBadge>
          </UnderlineTabButton>
        </UnderlineTabNav>

        {/* 탭 1: 편제 · 계보 · 소개 */}
        {activeTab === 'overview' && (
          <>
            <S.LedgerSection>
              <S.SectionHead>
                <S.SectionHeadTitle>지휘 계통 · 개편 계보</S.SectionHeadTitle>
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
              </S.SectionHead>

              <S.SectionBody>
                <S.ChainRow>
                  {effectiveDepartment.dept ? (
                    <>
                      <S.ChainDeptLink
                        to={pathKeys.government.departmentDetail(
                          effectiveDepartment.dept.id,
                        )}
                      >
                        <S.NeutralBadge>중앙부처</S.NeutralBadge>
                        <strong>
                          {effectiveDepartment.dept.name}
                          {effectiveDepartment.dept.abbreviation
                            ? ` (${effectiveDepartment.dept.abbreviation})`
                            : ''}
                        </strong>
                        <FiArrowUpRight size={12} />
                      </S.ChainDeptLink>
                      <FiArrowRight size={13} />
                    </>
                  ) : null}

                  {ancestorChain.length > 0 ? (
                    ancestorChain.map((anc) => (
                      <React.Fragment key={anc.id}>
                        <S.ChainNodeBtn
                          type="button"
                          onClick={() => onSelectUnit(anc.id)}
                        >
                          <S.NeutralBadge>
                            {anc.unitType
                              ? militaryUnitTypeLabelKo(anc.unitType)
                              : '상급 편제'}
                          </S.NeutralBadge>
                          <strong>
                            {anc.name}
                            {anc.abbreviation ? ` (${anc.abbreviation})` : ''}
                          </strong>
                        </S.ChainNodeBtn>
                        <FiArrowRight size={13} />
                      </React.Fragment>
                    ))
                  ) : !effectiveDepartment.dept ? (
                    <>
                      <S.RootPill>최상위 편제 (상급 부대 없음)</S.RootPill>
                      <FiArrowRight size={13} />
                    </>
                  ) : null}

                  <S.CurrentNodePill>
                    <S.AccentBadge>{unitTypeLabel}</S.AccentBadge>
                    <strong>
                      {unit.name}
                      {unit.abbreviation ? ` (${unit.abbreviation})` : ''}
                    </strong>
                  </S.CurrentNodePill>
                </S.ChainRow>

                {/* 전신·후신 개편 계보 */}
                <S.SubBlock>
                  <S.SubBlockLabel>
                    <FiGitCommit size={12} /> 조직 개편 계보 (
                    {predecessors.length + successors.length}건)
                  </S.SubBlockLabel>

                  {predecessors.length === 0 &&
                  successors.length === 0 &&
                  !addTransitionOpen ? (
                    <S.MutedLine>
                      등록된 전신·후신 개편 계보가 없습니다.
                    </S.MutedLine>
                  ) : null}

                  {predecessors.length > 0 || successors.length > 0 ? (
                    <S.LineageStack>
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
                        const timeText = formatTransitionTimeLabel(item)
                        const kindLabel =
                          MILITARY_TRANSITION_KIND_LABELS[item.kind] ??
                          item.kind
                        const isEditingThis =
                          editingTransitionId === item.transitionId

                        return (
                          <S.LineageRowCard key={item.transitionId}>
                            <S.LineageRowMain>
                              <S.AccentBadge>
                                {arrowSymbol} {directionLabel}
                              </S.AccentBadge>
                              <S.NeutralBadge>{kindLabel}</S.NeutralBadge>
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
                              {timeText ? (
                                <S.YearPill>{timeText}</S.YearPill>
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
                                  <S.FormSelect
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
                                  </S.FormSelect>
                                  <S.FormInput
                                    type="number"
                                    placeholder="연도 (예: 1938)"
                                    value={editTransitionYear}
                                    onChange={(evt) =>
                                      setEditTransitionYear(evt.target.value)
                                    }
                                    style={{ maxWidth: 120 }}
                                  />
                                  <S.FormInput
                                    type="number"
                                    placeholder="월 (1~12)"
                                    value={editTransitionMonth}
                                    onChange={(evt) =>
                                      setEditTransitionMonth(evt.target.value)
                                    }
                                    style={{ maxWidth: 92 }}
                                  />
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
                          </S.LineageRowCard>
                        )
                      })}
                    </S.LineageStack>
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
                        </S.FormSelect>

                        {transitionDirection === 'PREDECESSOR_DEPT' ? (
                          <S.FormSelect
                            aria-label="전신 행정부처 선택"
                            value={transitionTargetId}
                            onChange={(evt) =>
                              setTransitionTargetId(evt.target.value)
                            }
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
                          </S.FormSelect>
                        ) : (
                          <S.FormSelect
                            aria-label="연결할 군사부대 선택"
                            value={transitionTargetId}
                            onChange={(evt) =>
                              setTransitionTargetId(evt.target.value)
                            }
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
                                ? militaryUnitTypeLabelKo(
                                    unitCandidate.unitType,
                                  )
                                : null
                              const suffix = [candType, candCountry]
                                .filter(Boolean)
                                .join(' · ')
                              return (
                                <option
                                  key={unitCandidate.id}
                                  value={unitCandidate.id}
                                >
                                  {unitCandidate.name}
                                  {suffix ? ` (${suffix})` : ''}
                                </option>
                              )
                            })}
                          </S.FormSelect>
                        )}

                        <S.FormSelect
                          aria-label="개편 유형"
                          value={transitionKind}
                          onChange={(evt) =>
                            setTransitionKind(
                              evt.target.value as MilitaryUnitTransitionKind,
                            )
                          }
                        >
                          {MILITARY_TRANSITION_KIND_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </S.FormSelect>
                      </S.InlineFormRow>

                      <S.InlineFormRow>
                        <S.FormSelect
                          aria-label="기원"
                          value={transitionEra}
                          onChange={(evt) =>
                            setTransitionEra(evt.target.value as 'AD' | 'BC')
                          }
                          style={{ maxWidth: 88 }}
                        >
                          <option value="AD">서기</option>
                          <option value="BC">BC</option>
                        </S.FormSelect>
                        <S.FormInput
                          type="number"
                          placeholder="전환 연도 (예: 1938)"
                          value={transitionYear}
                          onChange={(evt) =>
                            setTransitionYear(evt.target.value)
                          }
                          style={{ maxWidth: 136 }}
                        />
                        <S.FormInput
                          type="number"
                          placeholder="월 (1~12)"
                          value={transitionMonth}
                          onChange={(evt) =>
                            setTransitionMonth(evt.target.value)
                          }
                          style={{ maxWidth: 92 }}
                        />
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
                </S.SubBlock>

                {/* 예하 편제 목록 */}
                <S.SubBlock>
                  <S.SubBlockHeadRow>
                    <S.SubBlockLabel>
                      <FiUsers size={12} />{' '}
                      {subViewMode === 'tree' && hasGrandchildren
                        ? `하위 편제 계층 (${totalDescendantCount}개)`
                        : `직속 예하 편제 (${sortedSubUnits.length}개)`}
                    </S.SubBlockLabel>
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
                            <FiGrid size={11.5} /> 카드
                          </S.SubViewSegBtn>
                          <S.SubViewSegBtn
                            type="button"
                            $active={subViewMode === 'tree'}
                            onClick={() => setSubViewMode('tree')}
                          >
                            <FiList size={11.5} /> 트리 ({totalDescendantCount})
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
                  </S.SubBlockHeadRow>

                  {sortedSubUnits.length === 0 ? (
                    <S.MutedLine>
                      직속 예하 편제가 등록되어 있지 않습니다.
                    </S.MutedLine>
                  ) : subViewMode === 'tree' && hasGrandchildren ? (
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

                          return (
                            <S.SubTreeNodeWrap key={nodeItem.id}>
                              <S.SubTreeRow $depth={depth}>
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
                                {nodeItem.unitType ? (
                                  <S.AccentBadge>
                                    {militaryUnitTypeLabelKo(nodeItem.unitType)}
                                  </S.AccentBadge>
                                ) : null}
                                {nodeItem.branch ? (
                                  <S.NeutralBadge>
                                    {MILITARY_BRANCH_LABELS[nodeItem.branch] ??
                                      nodeItem.branch}
                                  </S.NeutralBadge>
                                ) : null}
                                <S.InlineEntityBtn
                                  type="button"
                                  onClick={() => onSelectUnit(nodeItem.id)}
                                >
                                  {nodeItem.name}
                                  {nodeItem.abbreviation
                                    ? ` (${nodeItem.abbreviation})`
                                    : ''}
                                </S.InlineEntityBtn>
                                {kids.length > 0 ? (
                                  <S.MutedSpan style={{ fontSize: 11.5 }}>
                                    예하 {kids.length}
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
                    <S.SubUnitGrid>
                      {sortedSubUnits.map((sub) => (
                        <S.SubUnitCard
                          key={sub.id}
                          type="button"
                          onClick={() => onSelectUnit(sub.id)}
                        >
                          <S.BadgeRow>
                            {sub.unitType ? (
                              <S.AccentBadge>
                                {militaryUnitTypeLabelKo(sub.unitType)}
                              </S.AccentBadge>
                            ) : null}
                            {sub.branch ? (
                              <S.NeutralBadge>
                                {MILITARY_BRANCH_LABELS[sub.branch] ??
                                  sub.branch}
                              </S.NeutralBadge>
                            ) : null}
                          </S.BadgeRow>
                          <S.SubUnitTitle>
                            {sub.name}
                            {sub.abbreviation ? ` (${sub.abbreviation})` : ''}
                          </S.SubUnitTitle>
                        </S.SubUnitCard>
                      ))}
                    </S.SubUnitGrid>
                  )}
                </S.SubBlock>
              </S.SectionBody>
            </S.LedgerSection>

            {/* 배속 함정 */}
            {vessels.length > 0 ? (
              <S.LedgerSection>
                <S.SectionHead>
                  <S.SectionHeadTitle>
                    <FiAnchor
                      size={13}
                      style={{ marginRight: 5, verticalAlign: -1 }}
                    />
                    배속 함정 ({vessels.length}척)
                  </S.SectionHeadTitle>
                </S.SectionHead>
                <S.SectionBody>
                  <S.SubUnitGrid>
                    {vessels.map((vessel) => (
                      <S.VesselCard key={vessel.id}>
                        <S.AccentBadge>
                          {vessel.vesselType ?? '함정'}
                        </S.AccentBadge>
                        <strong>{vessel.name}</strong>
                        {vessel.vesselClass ? (
                          <S.NeutralBadge>{vessel.vesselClass}</S.NeutralBadge>
                        ) : null}
                      </S.VesselCard>
                    ))}
                  </S.SubUnitGrid>
                </S.SectionBody>
              </S.LedgerSection>
            ) : null}

            {/* 정밀 병력 · 전력 편제 현황 */}
            {hydratedSnapshots.length > 0 || unit.strength?.trim() ? (
              <S.LedgerSection>
                <S.SectionHead>
                  <S.SectionHeadTitle>
                    병력 · 편제 전력 현황
                  </S.SectionHeadTitle>
                </S.SectionHead>
                {hydratedSnapshots.length > 0 ? (
                  <S.ContextMetaGrid>
                    {hydratedSnapshots.map((snap) => {
                      const basisKo =
                        snap.basisKind === 'peacetime'
                          ? '평시 편제 정원'
                          : snap.basisKind === 'actual'
                            ? '실병력 (현원)'
                            : '전시 완편 정원'
                      const dateTag = snap.year.trim()
                        ? `${snap.era === 'BC' ? 'BC ' : ''}${snap.year}${snap.month ? `.${snap.month}` : ''}${snap.day ? `.${snap.day}` : ''}`
                        : null
                      const personnelLines = [
                        snap.totalStrength ? `총병력 ${snap.totalStrength}명` : null,
                        snap.officers ? `장교 ${snap.officers}명` : null,
                        snap.ncos ? `부사관 ${snap.ncos}명` : null,
                        snap.enlisted ? `병 ${snap.enlisted}명` : null,
                        snap.combatPersonnel
                          ? `전투원 ${snap.combatPersonnel}명`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                      const equipmentLines = [
                        snap.subUnitsCount
                          ? `예하 ${snap.subUnitsCount}개 ${snap.subUnitsLabel || '편제'}`
                          : null,
                        snap.tanks ? `전차·돌격포 ${snap.tanks}대` : null,
                        snap.afvs ? `장갑차·IFV ${snap.afvs}대` : null,
                        snap.artillery ? `화포·박격포 ${snap.artillery}문` : null,
                        snap.aircraft ? `항공기 ${snap.aircraft}기` : null,
                        snap.vessels ? `함정 ${snap.vessels}척` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                      return (
                        <S.ContextMetaCard key={snap.localId}>
                          <S.ContextMetaLabel>
                            {[basisKo, dateTag].filter(Boolean).join(' · ')}
                          </S.ContextMetaLabel>
                          <S.ContextMetaBody>
                            {[personnelLines, equipmentLines, snap.basisNote]
                              .filter(Boolean)
                              .join('\n')}
                          </S.ContextMetaBody>
                        </S.ContextMetaCard>
                      )
                    })}
                  </S.ContextMetaGrid>
                ) : null}
                {unit.strength?.trim() ? (
                  <S.DescriptionProse style={{ whiteSpace: 'pre-wrap' }}>
                    {unit.strength.trim()}
                  </S.DescriptionProse>
                ) : null}
              </S.LedgerSection>
            ) : null}

            {/* 부대 소개 · 임무 · 제원 */}
            {contextMetaCards.length > 0 || unit.description ? (
              <S.LedgerSection>
                <S.SectionHead>
                  <S.SectionHeadTitle>
                    부대 소개 · 주요 임무 · 제원
                  </S.SectionHeadTitle>
                </S.SectionHead>
                {contextMetaCards.length > 0 ? (
                  <S.ContextMetaGrid>
                    {contextMetaCards.map((card) => (
                      <S.ContextMetaCard key={card.label}>
                        <S.ContextMetaLabel>{card.label}</S.ContextMetaLabel>
                        <S.ContextMetaBody>{card.body}</S.ContextMetaBody>
                      </S.ContextMetaCard>
                    ))}
                  </S.ContextMetaGrid>
                ) : null}
                {unit.description ? (
                  <S.DescriptionProse>{unit.description}</S.DescriptionProse>
                ) : null}
              </S.LedgerSection>
            ) : null}
          </>
        )}

        {/* 탭 2: 역대 지휘관 · 참모 */}
        {activeTab === 'commanders' && (
          <S.LedgerSection>
            <S.SectionHead>
              <S.SectionHeadLeft>
                <S.SectionHeadTitle>
                  역대 지휘관 · 참모 ({totalCommanderCount}명)
                </S.SectionHeadTitle>
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
                      onChange={(evt) => setCommanderSearch(evt.target.value)}
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
            </S.SectionHead>

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

            {totalCommanderCount === 0 ? (
              <S.SectionEmpty>
                등록된 지휘관·참모 재임 기록이 없습니다. 우측 상단 버튼으로
                사령관·참모장 등을 임명할 수 있습니다.
              </S.SectionEmpty>
            ) : filteredTenures.length === 0 &&
              filteredLegacyCommanders.length === 0 ? (
              <S.SectionEmpty>
                ‘{commanderSearch}’ 검색어와 일치하는 기록이 없습니다.
              </S.SectionEmpty>
            ) : (
              <S.TableWrap>
                <S.LedgerTable>
                  <thead>
                    <tr>
                      <th>지휘관 · 참모</th>
                      <th>계급 · 보직명</th>
                      <th>재임 기간</th>
                      <th style={{ width: 56, textAlign: 'right' }}>관리</th>
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
                            middleName:
                              tenureItem.person.middleName ?? undefined,
                            country: tenureItem.person.country ?? undefined,
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
                      return (
                        <tr key={tenureItem.id}>
                          <td>
                            <S.ChipStack>
                              {tenureItem.ordinal != null ? (
                                <S.OrdinalBadge>
                                  제{tenureItem.ordinal}대
                                </S.OrdinalBadge>
                              ) : null}
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
                                  <FiUser size={12} /> {personName}
                                </S.InlineEntityBtn>
                              ) : (
                                <span>{personName}</span>
                              )}
                              {tenureItem.party ? (
                                <S.PartyBadge
                                  $color={tenureItem.party.brandColor}
                                >
                                  {tenureItem.party.shortName ||
                                    tenureItem.party.name}
                                </S.PartyBadge>
                              ) : null}
                            </S.ChipStack>
                          </td>
                          <td>{roleLabel}</td>
                          <td className="num">
                            {formatTenureSpan(tenureItem)}
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
                              <FiUser size={12} /> {fullName}
                            </S.InlineEntityBtn>
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
                            <S.NeutralBadge>레거시</S.NeutralBadge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </S.LedgerTable>
              </S.TableWrap>
            )}
          </S.LedgerSection>
        )}

        {/* 탭 3: 참전 · 작전 · 지령 */}
        {activeTab === 'operations' && (
          <>
            <S.LedgerSection>
              <S.SectionHead>
                <S.SectionHeadTitle>
                  지령 · 작전 관여 사건 ({eventRelations.length}건)
                </S.SectionHeadTitle>
                <LedgerCompactAction
                  type="button"
                  onClick={() => setEventPickerOpen(true)}
                >
                  <FiPlus size={12} /> 사건·지령 연결
                </LedgerCompactAction>
              </S.SectionHead>

              {pendingEvent || editingEventLink ? (
                <S.SectionBody style={{ paddingBottom: 0 }}>
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
                    </S.InlineFormRow>
                  </S.InlineFormBox>
                </S.SectionBody>
              ) : null}

              {eventRelations.length === 0 ? (
                <S.SectionEmpty>
                  연결된 지령 발령·작전 주관 사건이 없습니다.
                </S.SectionEmpty>
              ) : (
                <S.TableWrap>
                  <S.LedgerTable>
                    <thead>
                      <tr>
                        <th style={{ width: 110 }}>시기</th>
                        <th>사건 · 지령명</th>
                        <th style={{ width: 140 }}>관여 역할</th>
                        {!isCompact ? <th>비고</th> : null}
                        <th style={{ width: 56, textAlign: 'right' }}>관리</th>
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
                                to={pathKeys.events.detail(relItem.event.id)}
                              >
                                {relItem.event.title}
                                <FiArrowUpRight size={12} />
                              </S.InlineLink>
                            </td>
                            <td>
                              <S.AccentBadge>{roleKo}</S.AccentBadge>
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
              )}
            </S.LedgerSection>

            <S.LedgerSection>
              <S.SectionHead>
                <S.SectionHeadTitle>
                  참전 작전 · 전투 투입 기록 ({deployments.length}건)
                </S.SectionHeadTitle>
                <LedgerCompactAction
                  type="button"
                  onClick={() => setDeploymentPickerOpen(true)}
                >
                  <FiPlus size={12} /> 참전 전투·작전 연결
                </LedgerCompactAction>
              </S.SectionHead>

              {pendingDeploymentEvent ? (
                <S.SectionBody style={{ paddingBottom: 0 }}>
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
                </S.SectionBody>
              ) : null}

              {deployments.length === 0 ? (
                <S.SectionEmpty>
                  아직 이 편제가 전투서열(ORBAT)로 투입된 전쟁·전투 사건이
                  없습니다.
                </S.SectionEmpty>
              ) : (
                <S.TableWrap>
                  <S.LedgerTable>
                    <thead>
                      <tr>
                        <th style={{ width: 120 }}>시기</th>
                        <th>작전 · 전투 (사건)</th>
                        <th style={{ width: 148 }}>소속 진영 · 결과</th>
                        {!isCompact ? (
                          <>
                            <th>작전 편제 · 현장 지휘관 · 역할</th>
                            <th>부대 전과 · 투입 병기 · 기동</th>
                          </>
                        ) : null}
                        <th style={{ width: 52, textAlign: 'right' }}>관리</th>
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
                              <S.DeploymentEventCell>
                                <S.InlineLink
                                  to={pathKeys.events.detail(ev.id)}
                                >
                                  {ev.title}
                                </S.InlineLink>
                                {ev.kind === 'COLLECTION' ? (
                                  <S.SurveyLink
                                    to={`${pathKeys.events.detail(ev.id)}?tab=survey&unit=${encodeURIComponent(unit.id)}`}
                                  >
                                    <FiCompass size={11} /> 조망·전황
                                  </S.SurveyLink>
                                ) : (
                                  <>
                                    <S.SurveyLink
                                      to={`${pathKeys.events.detail(ev.id)}?tab=modules&unit=${encodeURIComponent(unit.id)}#module-sides`}
                                    >
                                      <FiShield size={11} /> 전투서열
                                    </S.SurveyLink>
                                    {ev.parentEventId ? (
                                      <S.SurveyLink
                                        to={`${pathKeys.events.detail(ev.parentEventId)}?tab=survey&sv=map&unit=${encodeURIComponent(unit.id)}&event=${encodeURIComponent(ev.id)}`}
                                      >
                                        <FiCompass size={11} /> 전역 지도
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
                              </S.DeploymentEventCell>
                            </td>
                            <td>
                              <strong>{side.name}</strong>
                              {outcomeLabel ? (
                                <S.OutcomeSpan> ({outcomeLabel})</S.OutcomeSpan>
                              ) : null}
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
                                            !shouldInterceptEntityClick(evt)
                                          ) {
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
                                      </S.InlineEntityBtn>
                                    ) : null}
                                    {roleLabel || dep.note ? (
                                      <S.MutedSpan>
                                        {[roleLabel, dep.note]
                                          .filter(Boolean)
                                          .join(' — ')}
                                      </S.MutedSpan>
                                    ) : !dep.parentUnit && !dep.commander ? (
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
                                        <S.NeutralBadge key={metricItem.id}>
                                          {metricItem.metricName}:{' '}
                                          {metricItem.approx ? '약 ' : ''}
                                          {formattedVal}
                                          {metricItem.unit
                                            ? ` ${metricItem.unit}`
                                            : ''}
                                        </S.NeutralBadge>
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
                                        <S.NeutralBadge key={weaponEntry.id}>
                                          <FiShield size={10} />
                                          {assetName}
                                          {countParts.length > 0
                                            ? ` (${countParts.join(' · ')})`
                                            : ''}
                                        </S.NeutralBadge>
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
                                          <FiCompass size={11} />
                                          {featItem.title}
                                          <FiArrowUpRight size={11} />
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
              )}
            </S.LedgerSection>
          </>
        )}
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
