import { type DragEvent, useEffect, useMemo, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import {
  FiAward,
  FiBarChart2,
  FiBriefcase,
  FiCheck,
  FiFlag,
  FiGitBranch,
  FiGitMerge,
  FiList,
  FiPlus,
  FiRepeat,
  FiSliders,
  FiUserPlus,
  FiUsers,
} from 'react-icons/fi'
import styled from 'styled-components'

import { findReplacementForMismatchedCountry } from '@/entities/event/model'
import { BentoActionBtn } from '@/entities/event/ui/bento-primitives'
import { ledgerHairline } from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { getAllCountries } from '@/shared/api/countries'
import { type EventSide, listEventSideUnits, type SideUnitView } from '@/shared/api/event-sides'
import { type UpdateEventDto } from '@/shared/api/events'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import { PopoverMenu, type PopoverMenuEntry } from '@/shared/ui/popover-menu'
import {
  LedgerViewSwitch,
  LedgerViewSwitchItem,
} from '@/widgets/country/country-detail/ui/country-ledger-primitives'
import { PersonGroupCreateModal } from '@/widgets/person/person-group-create-modal/person-group-create-modal'

import * as S from '../styles'
import { type EventDetail, eventKeys, eventObservationsQueryOptions } from '../use-event-detail'
import { type PatchOptions } from '../use-undoable-patch'
import { ActorsInfographicBoard } from './actors/actors-infographic-board'
import { ActorsLedgerTable } from './actors/actors-ledger-table'
import {
  countryRowKey,
  countrySideByParticipationValueOf,
  countrySideMapOf,
  DELEGATION_PREVIEW_COUNT,
  effectivePersonSide,
  groupDelegations,
  isCrossSidePerson,
  participationOptionsOf,
  PERSON_PREVIEW_COUNT,
  personNameOf,
  shouldCollapse,
} from './actors/actors.lib'
import {
  ActorsCanvas,
  ActorSectionBody,
  ActorSectionCard,
  ActorSectionHead,
  ActorSectionHeadActions,
  ActorSectionTitleGroup,
  ActorSectionTitleRow,
  ActorsHeader,
  ActorsHeaderLeft,
  ActorsHeaderRight,
  ActorsSummary,
  CountryList,
  CrossSideLabel,
  DelegationCaption,
  DelegationList,
  DelegationMore,
  GroupCount,
  GroupLabel,
  HeaderControlBtn,
  ManageBanner,
  PersonList,
  SectionHintText,
  ShowAllToggle,
  SideColumns,
  SideCountryList,
  SideGroup,
} from './actors/actors.styles'
import { CountryLinkModal } from './actors/country-link-modal'
import { ActorCountryRow } from './actors/country-row'
import { PersonLinkModal } from './actors/person-link-modal'
import { ActorPersonRow } from './actors/person-row'
import { SideColumnHeader } from './actors/side-column-header'
import { useActorMutations } from './actors/use-actor-mutations'
import { useSideManagement } from './actors/use-side-management'
import { toAxisSpan } from './development-timeline.lib'
import { EventTabEmptyState } from './event-tab-empty-state'
import { groupBySide, makeSideRootOf } from './hero-countries.lib'
import { withSideColors } from './side-colors'

type ActorsViewMode = 'board' | 'ledger'

interface CountryLinkTarget {
  open: boolean
  defaultSideId?: string | null
  initialRowKey?: string | null
}

interface PersonLinkTarget {
  open: boolean
  defaultParticipationValue?: string
  defaultSideId?: string | null
  countryName?: string | null
  initialPersonId?: string | null
  initialCreateMode?: boolean
}

interface DetailActorsProps {
  event: EventDetail
  departmentCount?: number
  readOnly?: boolean
  /** 참여 탭 전체에 아직 아무 기록이 없을 때 — 하위 빈 섹션 대신 단일 빈 상태를 세운다 */
  fullTabEmpty?: boolean
  onOpenExtendedActors?: () => void
  onPatch: (patch: UpdateEventDto, opts?: PatchOptions) => void
  onPersonClick: (personId: string) => void
  onCountryClick: (countryId: string) => void
  onStartSides?: () => void
  /** 참여 요약판의 '수치 자세히' — 수치·전력 탭으로 */
  onShowMetrics?: () => void
}

export function DetailActors({
  event,
  departmentCount = 0,
  readOnly = false,
  fullTabEmpty = false,
  onOpenExtendedActors,
  onPatch,
  onPersonClick,
  onCountryClick,
  onStartSides,
  onShowMetrics,
}: DetailActorsProps) {
  const [viewMode, setViewMode] = useState<ActorsViewMode>('board')
  const [showInfographic, setShowInfographic] = useState(true)
  const [countryLinkTarget, setCountryLinkTarget] = useState<CountryLinkTarget>({
    open: false,
  })
  const [personLinkTarget, setPersonLinkTarget] = useState<PersonLinkTarget>({
    open: false,
  })
  const [manageMode, setManageMode] = useState(false)
  const [showAllPersons, setShowAllPersons] = useState(false)
  const [openDelegations, setOpenDelegations] = useState<Set<string>>(() => new Set())

  const actors = useActorMutations({ event, onPatch })
  const { persons, countryRows } = actors
  const sideManager = useSideManagement({ event, actors, enabled: !readOnly })

  const { data: observations = [] } = useQuery(eventObservationsQueryOptions(event.id))
  const { data: sideUnits = [] } = useQuery<SideUnitView[]>({
    queryKey: eventKeys.sideUnits(event.id),
    queryFn: () => listEventSideUnits(event.id),
    staleTime: 30_000,
    enabled: (event.sides ?? []).length > 0,
  })
  const figuresByParticipant = useMemo(() => {
    const byParticipant = new Map<string, typeof observations>()
    for (const observation of observations) {
      if (observation.subjectType !== 'EVENT_PARTICIPANT') continue
      byParticipant.set(observation.subjectId, [
        ...(byParticipant.get(observation.subjectId) ?? []),
        observation,
      ])
    }
    return byParticipant
  }, [observations])

  const hasExistenceMismatch = useMemo(
    () => countryRows.some((row) => Boolean(row.existenceWarning)),
    [countryRows],
  )
  const shouldLoadCountriesForMismatch = !readOnly && hasExistenceMismatch

  const { data: allModern = [] } = useQuery({
    queryKey: ['countries', 'all'],
    queryFn: getAllCountries,
    enabled: shouldLoadCountriesForMismatch,
    staleTime: 5 * 60_000,
  })
  const { data: allHistorical = [] } = useQuery({
    queryKey: ['historical-countries', 'all'],
    queryFn: getAllHistoricalCountries,
    enabled: shouldLoadCountriesForMismatch,
    staleTime: 5 * 60_000,
  })

  const existingCountryKeys = useMemo(() => new Set(countryRows.map(countryRowKey)), [countryRows])

  const personContext = useMemo(() => {
    const span = toAxisSpan(event)
    const targetPartValue = personLinkTarget.defaultParticipationValue
    const scopedCountryId =
      targetPartValue && targetPartValue !== 'none'
        ? (targetPartValue.split(':')[1] ?? null)
        : null
    return {
      fromYear: span ? Math.floor(span.from) : null,
      toYear: span ? Math.floor(span.to) : null,
      countryIds: scopedCountryId ? [scopedCountryId] : countryRows.map((row) => row.id),
      label: personLinkTarget.countryName
        ? `이 사건 무렵 · ${personLinkTarget.countryName} 관련 인물`
        : '이 사건 무렵 · 참여국 인물',
    }
  }, [
    event,
    countryRows,
    personLinkTarget.defaultParticipationValue,
    personLinkTarget.countryName,
  ])

  const hintYearRange = useMemo(
    () => ({ startYear: personContext.fromYear, endYear: personContext.toYear }),
    [personContext.fromYear, personContext.toYear],
  )

  const countryPickerInitialKind = useMemo<'modern' | 'historical' | undefined>(() => {
    const refYear = personContext.toYear ?? personContext.fromYear
    if (refYear != null && refYear < 1945) return 'historical'
    if (countryRows.length > 0 && countryRows.every((row) => row.isHistorical)) {
      return 'historical'
    }
    return undefined
  }, [personContext.fromYear, personContext.toYear, countryRows])

  const replacementByRowKey = useMemo(() => {
    const map = new Map<string, { id: string; name: string; isHistorical: boolean }>()
    const refYear = personContext.fromYear ?? personContext.toYear
    if (readOnly || refYear == null || (allModern.length === 0 && allHistorical.length === 0)) {
      return map
    }
    for (const row of countryRows) {
      if (!row.isHistorical || !row.existenceWarning) continue
      const candidate = findReplacementForMismatchedCountry(
        { id: row.id, name: row.name },
        refYear,
        allModern,
        allHistorical,
        existingCountryKeys,
      )
      if (!candidate) continue
      const targetId = candidate.historicalCountryId ?? candidate.countryId
      if (!targetId) continue
      map.set(countryRowKey(row), {
        id: targetId,
        name: candidate.name,
        isHistorical: Boolean(candidate.historicalCountryId),
      })
    }
    return map
  }, [
    readOnly,
    personContext.fromYear,
    personContext.toYear,
    allModern,
    allHistorical,
    countryRows,
    existingCountryKeys,
  ])

  const totalCountries = countryRows.length
  const hasAnything = persons.length > 0 || totalCountries > 0
  /* 제목 줄 수 — 요약판의 '참여 주체 구성'이 하던 일(기관·정당·기구 수)을 여기로 모았다 */
  const institutionalCount =
    departmentCount + (event.politicalParties?.length ?? 0) + (event.organizations?.length ?? 0)
  const canManage = !readOnly && (persons.length > 1 || totalCountries > 1)
  const personsCollapsedBase = !showAllPersons && !manageMode
  const showAllToggleRef = useRef<HTMLButtonElement>(null)

  const participationOptions = useMemo(() => participationOptionsOf(countryRows), [countryRows])

  const countrySideByValue = useMemo(() => countrySideByParticipationValueOf(countryRows), [countryRows])

  const togglePersons = () => {
    const willCollapse = showAllPersons
    setShowAllPersons(!showAllPersons)
    if (willCollapse) {
      requestAnimationFrame(() => showAllToggleRef.current?.scrollIntoView({ block: 'center' }))
    }
  }

  useEffect(() => {
    if (!canManage && manageMode) setManageMode(false)
  }, [canManage, manageMode])

  const allSides = useMemo(() => event.sides ?? [], [event.sides])
  const countrySideByKey = useMemo(
    () => countrySideMapOf(event.relatedCountries, event.relatedHistoricalCountries),
    [event.relatedCountries, event.relatedHistoricalCountries],
  )
  const sideRootOf = useMemo(() => makeSideRootOf(allSides), [allSides])
  const rootSides = useMemo(() => {
    const byId = new Set(allSides.map((side) => side.id))
    return allSides
      .filter((side) => !side.parentSideId || !byId.has(side.parentSideId))
      .slice()
      .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))
  }, [allSides])
  const rawSideById = useMemo(
    () => new Map<string, EventSide>(allSides.map((side) => [side.id, side])),
    [allSides],
  )

  const hasCountrySideAssignment = useMemo(
    () => countryRows.some((row) => Boolean(sideRootOf(row.sideId))),
    [countryRows, sideRootOf],
  )
  const hasPersonOnlySideAssignment = useMemo(
    () =>
      !hasCountrySideAssignment &&
      persons.some((personEntry) =>
        Boolean(sideRootOf(effectivePersonSide(personEntry, countrySideByKey).sideId)),
      ),
    [hasCountrySideAssignment, persons, sideRootOf, countrySideByKey],
  )
  const countrySideMode =
    !manageMode &&
    rootSides.length > 0 &&
    (hasCountrySideAssignment ||
      (!hasPersonOnlySideAssignment && (countryRows.length >= 2 || persons.length === 0)))

  const countrySideGroups = useMemo(() => {
    if (manageMode || rootSides.length === 0) return null
    if (readOnly) return groupBySide(countryRows, allSides)
    if (!countrySideMode) return null
    const grouped = rootSides.map((side) => ({
      sideId: side.id as string | null,
      label: side.name,
      items: countryRows.filter((row) => sideRootOf(row.sideId) === side.id),
    }))
    const rest = countryRows.filter((row) => sideRootOf(row.sideId) === null)
    return rest.length > 0
      ? [...grouped, { sideId: null, label: '미배정 · 기타 참여', items: rest }]
      : grouped
  }, [manageMode, rootSides, readOnly, countryRows, allSides, countrySideMode, sideRootOf])

  /* 단일 국가 내전·정변·분당 등 국가가 진영으로 나뉘지 않을 때는 인물 섹션에서 진영 열을 세운다 */
  const personSideGroups = useMemo(() => {
    if (manageMode || countrySideGroups || rootSides.length === 0) return null
    if (readOnly) {
      const grouped = groupBySide(
        persons.map((entry) => ({
          entry,
          sideId: effectivePersonSide(entry, countrySideByKey).sideId,
        })),
        allSides,
      )
      return grouped
        ? grouped.map((group) => ({ ...group, items: group.items.map((item) => item.entry) }))
        : null
    }
    const grouped = rootSides.map((side) => ({
      sideId: side.id as string | null,
      label: side.name,
      items: persons.filter(
        (entry) => sideRootOf(effectivePersonSide(entry, countrySideByKey).sideId) === side.id,
      ),
    }))
    const rest = persons.filter(
      (entry) => sideRootOf(effectivePersonSide(entry, countrySideByKey).sideId) === null,
    )
    return rest.length > 0
      ? [...grouped, { sideId: null, label: '미배정 · 기타 참여', items: rest }]
      : grouped
  }, [manageMode, countrySideGroups, rootSides, readOnly, persons, countrySideByKey, allSides, sideRootOf])

  const coloredSides = withSideColors(allSides)
  const sideColorById = new Map(coloredSides.map((side) => [side.id, side.color] as const))
  const sideById = new Map(
    coloredSides.map(
      (side) =>
        [
          side.id,
          {
            name: side.name,
            color: side.color,
            outcome: side.outcome,
            outcomeNote: side.outcomeNote,
          },
        ] as const,
    ),
  )
  const sideOptions = useMemo(
    () =>
      coloredSides.length === 0
        ? []
        : [
            { value: 'none', label: '없음' },
            ...coloredSides.map((side) => ({
              value: side.id,
              label: side.name,
              color: side.color,
            })),
          ],
    [coloredSides],
  )

  /*
   * 소속국과 다른 편에 선 인물(내전 등) — 나라가 진영별로 갈려 있을 때 소속국 줄 밑에 두면 반대편 묶음
   * 안에 서 버린다. 대표단에서 빼서 **자기 진영 묶음 끝**에 세운다. 그 진영 묶음이 없으면(나라 없는
   * 진영) 단독 목록으로 내린다 — 어디에도 안 보이는 일은 없게.
   */
  const crossSidePersons = countrySideGroups
    ? persons.filter((entry) => isCrossSidePerson(entry, countrySideByKey, sideRootOf))
    : []
  const shownSideGroupIds = new Set((countrySideGroups ?? []).map((group) => group.sideId).filter(Boolean))
  const crossSideByGroup = new Map<string, typeof persons>()
  const crossSideOrphans: typeof persons = []
  for (const entry of crossSidePersons) {
    const rootId = sideRootOf(entry.sideId)
    if (rootId && shownSideGroupIds.has(rootId)) {
      crossSideByGroup.set(rootId, [...(crossSideByGroup.get(rootId) ?? []), entry])
    } else {
      crossSideOrphans.push(entry)
    }
  }
  const crossSideIds = new Set(crossSidePersons.map((entry) => entry.personId))
  const delegations = groupDelegations(
    countryRows,
    persons.filter((entry) => !crossSideIds.has(entry.personId)),
  )
  const delegationMode = !manageMode && !personSideGroups && delegations.byCountry.size > 0
  const listedPersons = delegationMode
    ? [...delegations.unassigned, ...crossSideOrphans]
    : persons
  const personsCollapsed =
    !personSideGroups &&
    personsCollapsedBase &&
    shouldCollapse(listedPersons.length, PERSON_PREVIEW_COUNT)
  const sideCount = rootSides.length

  const settingsMenuItems = useMemo<PopoverMenuEntry[]>(() => {
    const entries: PopoverMenuEntry[] = [
      { type: 'section', id: 'sec-display', label: '화면 표시' },
      {
        id: 'toggle-infographic',
        label: '상단 요약 인포그래픽 표시',
        icon: <FiBarChart2 size={13} />,
        checked: showInfographic,
        onSelect: () => setShowInfographic((prev) => !prev),
      },
    ]

    if (!readOnly) {
      const hasStructureActions =
        (sideCount === 0 && Boolean(onStartSides)) ||
        sideCount > 0 ||
        (canManage && viewMode === 'board')

      if (hasStructureActions) {
        entries.push({ type: 'divider', id: 'div-structure' })
        entries.push({ type: 'section', id: 'sec-structure', label: '진영 · 순서' })

        if (sideCount === 0 && onStartSides) {
          entries.push({
            id: 'start-sides',
            label: '대립 진영 나누기',
            icon: <FiGitMerge size={13} />,
            onSelect: () => onStartSides(),
          })
        } else if (sideCount > 0) {
          entries.push({
            id: 'add-side',
            label: '진영 추가',
            icon: <FiPlus size={13} />,
            onSelect: () => sideManager.addSide(),
          })
          if (sideCount >= 2) {
            entries.push({
              id: 'swap-sides',
              label: '1·2번 진영 순서 바꾸기',
              icon: <FiRepeat size={13} />,
              onSelect: () => sideManager.swapFirstTwoSides(),
            })
          }
        }

        if (canManage && viewMode === 'board') {
          entries.push({
            id: 'toggle-manage',
            label: manageMode ? '표시 순서 정렬 완료' : '표시 순서 정렬 모드',
            icon: <FiSliders size={13} />,
            checked: manageMode,
            onSelect: () => setManageMode((prev) => !prev),
          })
        }
      }
    }

    return entries
  }, [
    showInfographic,
    readOnly,
    sideCount,
    onStartSides,
    sideManager,
    canManage,
    viewMode,
    manageMode,
  ])

  type ActorDragItem = { kind: 'country' | 'person'; key: string }
  const [dragItem, setDragItem] = useState<ActorDragItem | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)

  const encodeDrag = (item: ActorDragItem) => `${item.kind}|${item.key}`
  const decodeDrag = (raw: string): ActorDragItem | null => {
    const separator = raw.indexOf('|')
    if (separator <= 0) return null
    const kind = raw.slice(0, separator)
    const key = raw.slice(separator + 1)
    if ((kind === 'country' || kind === 'person') && key) return { kind, key }
    return null
  }
  const clearDrag = () => {
    setDragItem(null)
    setDragOverTarget(null)
  }

  const openEditPersonModal = (personId: string) => {
    setPersonLinkTarget({
      open: true,
      initialPersonId: personId,
    })
  }

  const openEditCountryModal = (rowKey: string) => {
    setCountryLinkTarget({
      open: true,
      initialRowKey: rowKey,
    })
  }

  const renderPersonRow = (
    entry: (typeof persons)[number],
    position: { isFirst: boolean; isLast: boolean },
    compact = false,
    groupSideId?: string | null,
  ) => {
    const targetKey = `person:${entry.personId}`
    return (
      <ActorPersonRow
        key={entry.personId}
        compact={compact}
        entry={entry}
        side={entry.sideId && sideById.get(entry.sideId) ? sideById.get(entry.sideId) : null}
        countrySideName={
          sideById.get(effectivePersonSide(entry, countrySideByKey).countrySideId ?? '')?.name ?? null
        }
        groupSideId={groupSideId}
        sideOptions={sideOptions}
        participationOptions={participationOptions}
        readOnly={readOnly}
        onOpenEdit={() => openEditPersonModal(entry.personId)}
        manageMode={manageMode}
        isFirst={position.isFirst}
        isLast={position.isLast}
        onOpen={onPersonClick}
        onUpdate={actors.updatePerson}
        onParticipation={actors.setParticipationCountry}
        onMove={actors.movePerson}
        onRemove={actors.removePerson}
        isDragOver={dragOverTarget === targetKey}
        onDragStart={(dragEvent) => {
          dragEvent.stopPropagation()
          const item: ActorDragItem = { kind: 'person', key: entry.personId }
          setDragItem(item)
          dragEvent.dataTransfer.effectAllowed = 'move'
          dragEvent.dataTransfer.setData('text/plain', encodeDrag(item))
        }}
        onDragOver={(dragEvent) => {
          dragEvent.preventDefault()
          dragEvent.stopPropagation()
          if (dragOverTarget !== targetKey) setDragOverTarget(targetKey)
        }}
        onDragLeave={(dragEvent) => {
          if (!dragEvent.currentTarget.contains(dragEvent.relatedTarget as globalThis.Node | null)) {
            setDragOverTarget((current) => (current === targetKey ? null : current))
          }
        }}
        onDrop={(dragEvent) => {
          dragEvent.preventDefault()
          dragEvent.stopPropagation()
          const payload = dragItem ?? decodeDrag(dragEvent.dataTransfer.getData('text/plain'))
          clearDrag()
          if (!payload || payload.kind !== 'person') return
          actors.reorderPerson(payload.key, entry.personId)
        }}
        onDragEnd={clearDrag}
      />
    )
  }

  const renderCountryRow = (row: (typeof countryRows)[number], groupSideId?: string | null) => {
    const index = countryRows.indexOf(row)
    const rowKey = countryRowKey(row)
    const targetKey = `country:${rowKey}`
    const delegates = delegationMode ? (delegations.byCountry.get(rowKey) ?? []) : []
    const delegationOpen = openDelegations.has(rowKey)
    const delegationCollapsible = shouldCollapse(delegates.length, DELEGATION_PREVIEW_COUNT)
    const shownDelegates =
      delegationOpen || !delegationCollapsible
        ? delegates
        : delegates.slice(0, DELEGATION_PREVIEW_COUNT)
    const toggleDelegation = () =>
      setOpenDelegations((previous) => {
        const next = new Set(previous)
        if (next.has(rowKey)) next.delete(rowKey)
        else next.add(rowKey)
        return next
      })

    const resolvedSide =
      row.sideId && sideById.get(row.sideId) ? sideById.get(row.sideId) : null

    return (
      <ActorCountryRow
        key={rowKey}
        row={row}
        figures={row.participantId ? figuresByParticipant.get(row.participantId) : undefined}
        side={resolvedSide}
        sideOptions={sideOptions}
        groupSideId={groupSideId}
        replacement={replacementByRowKey.get(rowKey) ?? null}
        readOnly={readOnly}
        onOpenEdit={() => openEditCountryModal(rowKey)}
        manageMode={manageMode}
        isFirst={index === 0}
        isLast={index === countryRows.length - 1}
        onCountryClick={onCountryClick}
        onAddDelegate={
          readOnly
            ? undefined
            : () =>
                setPersonLinkTarget({
                  open: true,
                  defaultParticipationValue: `${row.isHistorical ? 'h' : 'c'}:${row.id}`,
                  defaultSideId: row.sideId,
                  countryName: row.name,
                })
        }
        onUpdate={actors.updateCountry}
        onReplace={actors.replaceCountry}
        onMove={actors.moveCountry}
        onRemove={actors.removeCountry}
        isDragOver={dragOverTarget === targetKey}
        onDragStart={(dragEvent) => {
          dragEvent.stopPropagation()
          const item: ActorDragItem = { kind: 'country', key: rowKey }
          setDragItem(item)
          dragEvent.dataTransfer.effectAllowed = 'move'
          dragEvent.dataTransfer.setData('text/plain', encodeDrag(item))
        }}
        onDragOver={(dragEvent) => {
          dragEvent.preventDefault()
          dragEvent.stopPropagation()
          if (dragOverTarget !== targetKey) setDragOverTarget(targetKey)
        }}
        onDragLeave={(dragEvent) => {
          if (!dragEvent.currentTarget.contains(dragEvent.relatedTarget as globalThis.Node | null)) {
            setDragOverTarget((current) => (current === targetKey ? null : current))
          }
        }}
        onDrop={(dragEvent) => {
          dragEvent.preventDefault()
          dragEvent.stopPropagation()
          const payload = dragItem ?? decodeDrag(dragEvent.dataTransfer.getData('text/plain'))
          clearDrag()
          if (!payload) return
          if (payload.kind === 'person') {
            actors.setParticipationCountry(
              payload.key,
              `${row.isHistorical ? 'h' : 'c'}:${row.id}`,
            )
            return
          }
          if (payload.key !== rowKey) {
            actors.reorderCountry(payload.key, rowKey)
          }
          if (!manageMode) {
            const draggedCountry = countryRows.find(
              (candidate) => countryRowKey(candidate) === payload.key,
            )
            if (draggedCountry && draggedCountry.sideId !== row.sideId) {
              actors.updateCountry(payload.key, { sideId: row.sideId ?? null })
            }
          }
        }}
        onDragEnd={clearDrag}
      >
        {delegates.length > 0 && (
          <>
            <DelegationCaption>소속 인물 {delegates.length}명</DelegationCaption>
            <DelegationList aria-label={`${row.name} 대표·인물`}>
              {shownDelegates.map((entry) => {
                const order = persons.indexOf(entry)
                return renderPersonRow(
                  entry,
                  { isFirst: order === 0, isLast: order === persons.length - 1 },
                  true,
                  row.sideId,
                )
              })}
              {delegationCollapsible &&
                (delegationOpen || delegates.length > shownDelegates.length) && (
                  <li data-more>
                    <DelegationMore
                      type="button"
                      aria-expanded={delegationOpen}
                      onClick={toggleDelegation}
                    >
                      {delegationOpen ? '접기' : `+${delegates.length - shownDelegates.length}명 더 보기`}
                    </DelegationMore>
                  </li>
                )}
            </DelegationList>
          </>
        )}
      </ActorCountryRow>
    )
  }

  const targetPartValue = personLinkTarget.defaultParticipationValue
  const defaultCountryForPersonCreate =
    (targetPartValue?.startsWith('c:') ? targetPartValue.slice(2) : null) ??
    countryRows.find((row) => !row.isHistorical)?.id ??
    undefined
  const defaultHistoricalCountryForPersonCreate =
    (targetPartValue?.startsWith('h:') ? targetPartValue.slice(2) : null) ??
    countryRows.find((row) => row.isHistorical)?.id ??
    undefined

  const showCountrySection = countryRows.length > 0 || !readOnly || !hasAnything
  const showPersonSection = persons.length > 0 || !readOnly || Boolean(personSideGroups)
  const delegatedPersonCount = delegationMode ? persons.length - listedPersons.length : 0

  const showFullEmptyState = fullTabEmpty && !hasAnything && allSides.length === 0

  return (
    <>
      <S.Section id="actors">
        {showFullEmptyState ? (
          <EventTabEmptyState
            Icon={FiUsers}
            ariaLabel="참여 주체 빈 상태"
            title="아직 등록된 참여 국가 · 인물이 없습니다"
            description={
              readOnly
                ? '이 사건에 연결된 참여 국가·인물이나 기관·영토·권력 변동 기록이 없습니다.'
                : '이 사건에 관여한 국가와 주요 인물을 연결하면 당사국 역할 구도와 대립 진영 세력 비교가 정리됩니다.'
            }
            primaryAction={
              !readOnly
                ? {
                    label: '참여 국가 연결',
                    Icon: FiPlus,
                    onClick: () => setCountryLinkTarget({ open: true }),
                  }
                : undefined
            }
            secondaryAction={
              !readOnly
                ? {
                    label: '참여 인물 연결',
                    Icon: FiUserPlus,
                    onClick: () => setPersonLinkTarget({ open: true }),
                  }
                : undefined
            }
            quietLinks={
              !readOnly && onOpenExtendedActors
                ? [
                    {
                      label: '기관 · 정당 · 영토 · 권력 변동부터 기록하기',
                      onClick: onOpenExtendedActors,
                    },
                  ]
                : undefined
            }
            features={
              readOnly
                ? undefined
                : [
                    {
                      Icon: FiFlag,
                      title: '참여 국가 · 대립 진영',
                      description: '교전국·당사국의 역할을 지정하고 2개국 이상이면 진영별 승패와 세력을 비교합니다.',
                    },
                    {
                      Icon: FiUsers,
                      title: '주요 인물 · 국가별 대표단',
                      description: '국가원수·지휘관·외교 대표를 연결하면 소속 국가 아래 대표단으로 함께 묶입니다.',
                    },
                    {
                      Icon: FiBriefcase,
                      title: '기관 · 정당 · 기구 · 기업',
                      description: '사령부·정부 부처·정당·국제기구·기업 등 조직 단위의 관여 내역을 기록합니다.',
                    },
                    {
                      Icon: FiAward,
                      title: '성립 · 영토 · 권력 변동',
                      description: '사건의 결과로 일어난 건국·멸망, 영토 할양·반환, 즉위·취임·선거를 정리합니다.',
                    },
                  ]
            }
          />
        ) : (
          <>
        {hasAnything && (
          <ActorsHeader>
            <ActorsHeaderLeft>
              <ActorsSummary>
                {[
                  totalCountries > 0 && `국가 ${totalCountries}`,
                  persons.length > 0 && `인물 ${persons.length}`,
                  institutionalCount > 0 && `기관·단체 ${institutionalCount}`,
                  sideCount >= 2 && `진영 ${sideCount}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </ActorsSummary>
            </ActorsHeaderLeft>

            <ActorsHeaderRight>
              {viewMode === 'ledger' && !readOnly && (
                <>
                  <HeaderControlBtn
                    type="button"
                    onClick={() => setCountryLinkTarget({ open: true })}
                  >
                    <FiPlus aria-hidden />
                    국가 잇기
                  </HeaderControlBtn>
                  <HeaderControlBtn
                    type="button"
                    onClick={() => setPersonLinkTarget({ open: true })}
                  >
                    <FiPlus aria-hidden />
                    인물 잇기
                  </HeaderControlBtn>
                </>
              )}

              <LedgerViewSwitch role="group" aria-label="참여 보기 방식 전환">
                <LedgerViewSwitchItem
                  type="button"
                  $active={viewMode === 'board'}
                  onClick={() => setViewMode('board')}
                >
                  <FiGitBranch size={13} />
                  그룹 보기
                </LedgerViewSwitchItem>
                <LedgerViewSwitchItem
                  type="button"
                  $active={viewMode === 'ledger'}
                  onClick={() => setViewMode('ledger')}
                >
                  <FiList size={13} />
                  표로 보기
                </LedgerViewSwitchItem>
              </LedgerViewSwitch>

              <PopoverMenu
                size="md"
                items={settingsMenuItems}
                active={manageMode || !showInfographic}
                ariaLabel="화면 표시 및 정렬 설정"
                title="요약 인포그래픽 표시 · 순서 정렬 · 진영 설정"
                minWidth={220}
              />
            </ActorsHeaderRight>
          </ActorsHeader>
        )}

        <ActorsCanvas>
          {showInfographic && (
            <ActorsInfographicBoard
              event={event}
              countryRows={countryRows}
              persons={persons}
              observations={observations}
              sideUnits={sideUnits}
              departmentCount={departmentCount}
              readOnly={readOnly}
              onStartSides={onStartSides}
              onShowMetrics={onShowMetrics}
              onCountryClick={onCountryClick}
              onPersonClick={onPersonClick}
            />
          )}

          {manageMode && viewMode === 'board' && (
            <ManageBanner role="status">
              <span>
                <strong>표시 순서 정렬 모드</strong> — 행을 드래그하거나 우측 <strong>↑ · ↓</strong> 버튼으로 순서를 조정하세요.
              </span>
              <HeaderControlBtn type="button" $active onClick={() => setManageMode(false)}>
                <FiCheck />
                정렬 완료
              </HeaderControlBtn>
            </ManageBanner>
          )}

          {viewMode === 'ledger' && hasAnything ? (
            <ActorsLedgerTable
              countryRows={countryRows}
              persons={persons}
              figuresByParticipant={figuresByParticipant}
              sideById={sideById}
              sideOptions={sideOptions}
              participationOptions={participationOptions}
              readOnly={readOnly}
              onCountryClick={onCountryClick}
              onPersonClick={onPersonClick}
              onOpenEditCountry={openEditCountryModal}
              onOpenEditPerson={openEditPersonModal}
              onUpdateCountry={actors.updateCountry}
              onRemoveCountry={actors.removeCountry}
              onUpdatePerson={actors.updatePerson}
              onParticipation={actors.setParticipationCountry}
              onRemovePerson={actors.removePerson}
            />
          ) : (
            <>
              {showCountrySection && (
                <ActorSectionCard>
                  <ActorSectionHead>
                    <ActorSectionTitleGroup>
                      <ActorSectionTitleRow>
                        <GroupLabel>참여 국가</GroupLabel>
                        {totalCountries > 0 && <GroupCount>{totalCountries}개국</GroupCount>}
                      </ActorSectionTitleRow>
                      <SectionHintText>
                        {countrySideGroups
                          ? '진영 이름·승패 결과를 바로 수정하고, 국가를 다른 진영으로 끌어 옮길 수 있습니다.'
                          : '주도·대상·중재 등 당사국의 역할과 사건 중 수행한 일을 기록합니다.'}
                      </SectionHintText>
                    </ActorSectionTitleGroup>

                    {!readOnly && (countryRows.length > 0 || Boolean(countrySideGroups)) && (
                      <ActorSectionHeadActions>
                        {sideCount === 0 && onStartSides && countryRows.length >= 2 && (
                          <BentoActionBtn type="button" $accent onClick={onStartSides}>
                            <FiGitMerge size={12} />
                            진영 나누기
                          </BentoActionBtn>
                        )}
                        {countrySideGroups && sideCount >= 2 && (
                          <BentoActionBtn
                            type="button"
                            onClick={sideManager.swapFirstTwoSides}
                            disabled={sideManager.busy}
                            title="1번·2번 진영 표시 순서를 맞바꿉니다"
                          >
                            <FiRepeat size={11} />
                            순서 바꾸기
                          </BentoActionBtn>
                        )}
                        {countrySideGroups && (
                          <BentoActionBtn
                            type="button"
                            onClick={sideManager.addSide}
                            disabled={sideManager.busy}
                          >
                            <FiPlus size={12} />
                            진영 추가
                          </BentoActionBtn>
                        )}
                        <HeaderControlBtn
                          type="button"
                          onClick={() => setCountryLinkTarget({ open: true })}
                        >
                          <FiPlus aria-hidden />
                          국가 잇기
                        </HeaderControlBtn>
                      </ActorSectionHeadActions>
                    )}
                  </ActorSectionHead>

                  <ActorSectionBody>
                    {countryRows.length === 0 && !countrySideGroups && (
                      <S.EmptyGuide>
                        <S.EmptyGuideBody>
                          <S.EmptyGuideTitle>아직 연결된 참여 국가가 없습니다</S.EmptyGuideTitle>
                          <S.EmptyGuideDesc>
                            교전국·당사국·중재국 등 현대 국가와 역사 국가를 역할과 함께 연결합니다.
                          </S.EmptyGuideDesc>
                        </S.EmptyGuideBody>
                        {!readOnly && (
                          <S.EmptyGuideActions>
                            <S.EmptyPrimaryAction
                              type="button"
                              onClick={() => setCountryLinkTarget({ open: true })}
                            >
                              <FiPlus aria-hidden />
                              참여 국가 연결
                            </S.EmptyPrimaryAction>
                          </S.EmptyGuideActions>
                        )}
                      </S.EmptyGuide>
                    )}

                    {(countryRows.length > 0 || Boolean(countrySideGroups)) &&
                      (countrySideGroups ? (
                        <SideColumns>
                          {countrySideGroups.map((group) => {
                            const color = group.sideId ? sideColorById.get(group.sideId) : undefined
                            const rawSide = group.sideId ? (rawSideById.get(group.sideId) ?? null) : null
                            const groupTargetKey = `side:${group.sideId ?? 'rest'}`
                            return (
                              <SideGroup
                                key={group.sideId ?? 'rest'}
                                $rest={!group.sideId}
                                $color={color}
                                $dragOver={dragOverTarget === groupTargetKey}
                                data-side-group={group.sideId ?? 'rest'}
                                onDragOver={(dragEvent: DragEvent<HTMLDivElement>) => {
                                  dragEvent.preventDefault()
                                  if (dragOverTarget !== groupTargetKey) {
                                    setDragOverTarget(groupTargetKey)
                                  }
                                }}
                                onDragLeave={(dragEvent: DragEvent<HTMLDivElement>) => {
                                  if (
                                    !dragEvent.currentTarget.contains(
                                      dragEvent.relatedTarget as globalThis.Node | null,
                                    )
                                  ) {
                                    setDragOverTarget((current) =>
                                      current === groupTargetKey ? null : current,
                                    )
                                  }
                                }}
                                onDrop={(dragEvent: DragEvent<HTMLDivElement>) => {
                                  dragEvent.preventDefault()
                                  const payload =
                                    dragItem ??
                                    decodeDrag(dragEvent.dataTransfer.getData('text/plain'))
                                  clearDrag()
                                  if (!payload) return
                                  if (payload.kind === 'country') {
                                    actors.updateCountry(payload.key, {
                                      sideId: group.sideId ?? null,
                                    })
                                  } else {
                                    actors.updatePerson(payload.key, {
                                      sideId: group.sideId ?? null,
                                    })
                                  }
                                }}
                              >
                                <SideColumnHeader
                                  side={rawSide}
                                  label={group.label}
                                  color={color}
                                  memberCount={group.items.length}
                                  readOnly={readOnly}
                                  busy={sideManager.busy}
                                  quickAddLabel={rawSide ? '국가' : undefined}
                                  onQuickAdd={
                                    rawSide
                                      ? () =>
                                          setCountryLinkTarget({
                                            open: true,
                                            defaultSideId: rawSide.id,
                                          })
                                      : undefined
                                  }
                                  showOutcomeNote={
                                    rawSide
                                      ? sideManager.isExtraOpened(rawSide.id, 'outcomeNote')
                                      : false
                                  }
                                  showDescription={
                                    rawSide
                                      ? sideManager.isExtraOpened(rawSide.id, 'description')
                                      : false
                                  }
                                  showFaction={
                                    rawSide
                                      ? sideManager.isExtraOpened(rawSide.id, 'faction')
                                      : false
                                  }
                                  groupOptions={sideManager.groupOptions}
                                  onOpenExtra={
                                    rawSide
                                      ? (extraKey) => sideManager.openExtra(rawSide.id, extraKey)
                                      : undefined
                                  }
                                  onRename={
                                    rawSide
                                      ? (nextName) => sideManager.renameSide(rawSide, nextName)
                                      : undefined
                                  }
                                  onSetOutcome={
                                    rawSide
                                      ? (patch) => sideManager.setOutcome(rawSide, patch)
                                      : undefined
                                  }
                                  onDescribe={
                                    rawSide
                                      ? (desc) => sideManager.describeSide(rawSide, desc)
                                      : undefined
                                  }
                                  onLinkGroup={
                                    rawSide
                                      ? (groupId) => void sideManager.linkPersonGroup(rawSide, groupId)
                                      : undefined
                                  }
                                  onImportGroupMembers={
                                    rawSide?.personGroupId
                                      ? () =>
                                          void sideManager.importGroupMembersToSide(
                                            rawSide.id,
                                            rawSide.personGroupId!,
                                          )
                                      : undefined
                                  }
                                  onCreateGroup={
                                    rawSide
                                      ? () => sideManager.setCreatingGroupSide(rawSide)
                                      : undefined
                                  }
                                  onRemoveSide={
                                    rawSide
                                      ? () => void sideManager.removeSide(rawSide)
                                      : undefined
                                  }
                                />
                                <SideCountryList>
                                  {group.items.length === 0 &&
                                    (!delegationMode ||
                                      !group.sideId ||
                                      (crossSideByGroup.get(group.sideId) ?? []).length === 0) && (
                                      <EmptySideSlot>
                                        여기로 국가를 끌어 놓거나 상단 <strong>+ 국가</strong> 버튼으로 배정하세요.
                                      </EmptySideSlot>
                                    )}
                                  {group.items.map((row) => renderCountryRow(row, group.sideId))}
                                  {delegationMode &&
                                    group.sideId &&
                                    (crossSideByGroup.get(group.sideId) ?? []).length > 0 && (
                                      <>
                                        <CrossSideLabel
                                          title="소속국은 다른 진영이지만 이 인물은 따로 이 진영으로 정해 두었습니다"
                                        >
                                          소속국과 다른 편
                                        </CrossSideLabel>
                                        {(crossSideByGroup.get(group.sideId) ?? []).map((entry) => {
                                          const order = persons.indexOf(entry)
                                          return renderPersonRow(
                                            entry,
                                            { isFirst: order === 0, isLast: order === persons.length - 1 },
                                            false,
                                            group.sideId,
                                          )
                                        })}
                                      </>
                                    )}
                                </SideCountryList>
                              </SideGroup>
                            )
                          })}
                        </SideColumns>
                      ) : (
                        <CountryList data-manage={manageMode || undefined}>
                          {countryRows.map((row) => renderCountryRow(row))}
                        </CountryList>
                      ))}
                  </ActorSectionBody>
                </ActorSectionCard>
              )}

              {showPersonSection && (
                <ActorSectionCard
                  $dragOver={dragOverTarget === 'unassigned-persons'}
                  onDragOver={(dragEvent: DragEvent<HTMLDivElement>) => {
                    if (!delegationMode) return
                    dragEvent.preventDefault()
                    if (dragOverTarget !== 'unassigned-persons') {
                      setDragOverTarget('unassigned-persons')
                    }
                  }}
                  onDragLeave={(dragEvent: DragEvent<HTMLDivElement>) => {
                    if (
                      !dragEvent.currentTarget.contains(
                        dragEvent.relatedTarget as globalThis.Node | null,
                      )
                    ) {
                      setDragOverTarget((current) =>
                        current === 'unassigned-persons' ? null : current,
                      )
                    }
                  }}
                  onDrop={(dragEvent: DragEvent<HTMLDivElement>) => {
                    if (!delegationMode) return
                    dragEvent.preventDefault()
                    const payload =
                      dragItem ?? decodeDrag(dragEvent.dataTransfer.getData('text/plain'))
                    clearDrag()
                    if (payload?.kind === 'person') {
                      actors.setParticipationCountry(payload.key, 'none')
                    }
                  }}
                >
                  <ActorSectionHead>
                    <ActorSectionTitleGroup>
                      <ActorSectionTitleRow>
                        <GroupLabel>참여 인물</GroupLabel>
                        {persons.length > 0 && <GroupCount>{persons.length}명</GroupCount>}
                      </ActorSectionTitleRow>
                      <SectionHintText>
                        {delegationMode && listedPersons.length === 0
                          ? `등록된 인물 ${persons.length}명 모두 위 소속 국가 행 아래에 표시 중입니다.`
                          : delegationMode && delegatedPersonCount > 0
                            ? `소속국이 지정된 ${delegatedPersonCount}명은 위 국가 아래에, 소속국 없는 단독 참여 ${listedPersons.length}명은 아래에 표시됩니다.`
                            : '지휘관·국가원수·외교 대표 등 이 사건에서 활동한 주요 인물과 역할을 기록합니다.'}
                      </SectionHintText>
                    </ActorSectionTitleGroup>

                    {!readOnly && (persons.length > 0 || Boolean(personSideGroups)) && (
                      <ActorSectionHeadActions>
                        {sideCount === 0 &&
                          onStartSides &&
                          countryRows.length < 2 &&
                          persons.length >= 2 && (
                            <BentoActionBtn type="button" $accent onClick={onStartSides}>
                              <FiGitMerge size={12} />
                              진영·계파 나누기
                            </BentoActionBtn>
                          )}
                        {personSideGroups && sideCount >= 2 && (
                          <BentoActionBtn
                            type="button"
                            onClick={sideManager.swapFirstTwoSides}
                            disabled={sideManager.busy}
                            title="1번·2번 진영 표시 순서를 맞바꿉니다"
                          >
                            <FiRepeat size={11} />
                            순서 바꾸기
                          </BentoActionBtn>
                        )}
                        {personSideGroups && (
                          <BentoActionBtn
                            type="button"
                            onClick={sideManager.addSide}
                            disabled={sideManager.busy}
                          >
                            <FiPlus size={12} />
                            진영 추가
                          </BentoActionBtn>
                        )}
                        <HeaderControlBtn
                          type="button"
                          onClick={() => setPersonLinkTarget({ open: true })}
                        >
                          <FiPlus aria-hidden />
                          인물 잇기
                        </HeaderControlBtn>
                      </ActorSectionHeadActions>
                    )}
                  </ActorSectionHead>

                  <ActorSectionBody>
                    {persons.length === 0 && !personSideGroups && (
                      <S.EmptyGuide>
                        <S.EmptyGuideBody>
                          <S.EmptyGuideTitle>아직 연결된 참여 인물이 없습니다</S.EmptyGuideTitle>
                          <S.EmptyGuideDesc>
                            국가원수·지휘관·외교 대표 등 활동한 인물을 연결하면 소속 국가 아래 대표단으로 정리됩니다.
                          </S.EmptyGuideDesc>
                        </S.EmptyGuideBody>
                        {!readOnly && (
                          <S.EmptyGuideActions>
                            <S.EmptyPrimaryAction
                              type="button"
                              onClick={() => setPersonLinkTarget({ open: true })}
                            >
                              <FiPlus aria-hidden />
                              참여 인물 연결
                            </S.EmptyPrimaryAction>
                          </S.EmptyGuideActions>
                        )}
                      </S.EmptyGuide>
                    )}

                    {(listedPersons.length > 0 || Boolean(personSideGroups)) &&
                      (personSideGroups ? (
                        <SideColumns>
                          {personSideGroups.map((group) => {
                            const color = group.sideId ? sideColorById.get(group.sideId) : undefined
                            const rawSide = group.sideId ? (rawSideById.get(group.sideId) ?? null) : null
                            const groupTargetKey = `person-side:${group.sideId ?? 'rest'}`
                            return (
                              <SideGroup
                                key={group.sideId ?? 'rest'}
                                $rest={!group.sideId}
                                $color={color}
                                $dragOver={dragOverTarget === groupTargetKey}
                                data-side-group={group.sideId ?? 'rest'}
                                onDragOver={(dragEvent: DragEvent<HTMLDivElement>) => {
                                  dragEvent.preventDefault()
                                  if (dragOverTarget !== groupTargetKey) {
                                    setDragOverTarget(groupTargetKey)
                                  }
                                }}
                                onDragLeave={(dragEvent: DragEvent<HTMLDivElement>) => {
                                  if (
                                    !dragEvent.currentTarget.contains(
                                      dragEvent.relatedTarget as globalThis.Node | null,
                                    )
                                  ) {
                                    setDragOverTarget((current) =>
                                      current === groupTargetKey ? null : current,
                                    )
                                  }
                                }}
                                onDrop={(dragEvent: DragEvent<HTMLDivElement>) => {
                                  dragEvent.preventDefault()
                                  const payload =
                                    dragItem ??
                                    decodeDrag(dragEvent.dataTransfer.getData('text/plain'))
                                  clearDrag()
                                  if (!payload || payload.kind !== 'person') return
                                  actors.updatePerson(payload.key, { sideId: group.sideId ?? null })
                                }}
                              >
                                <SideColumnHeader
                                  side={rawSide}
                                  label={group.label}
                                  color={color}
                                  memberCount={group.items.length}
                                  readOnly={readOnly}
                                  busy={sideManager.busy}
                                  quickAddLabel={rawSide ? '인물' : undefined}
                                  onQuickAdd={
                                    rawSide
                                      ? () =>
                                          setPersonLinkTarget({
                                            open: true,
                                            defaultSideId: rawSide.id,
                                          })
                                      : undefined
                                  }
                                  showOutcomeNote={
                                    rawSide
                                      ? sideManager.isExtraOpened(rawSide.id, 'outcomeNote')
                                      : false
                                  }
                                  showDescription={
                                    rawSide
                                      ? sideManager.isExtraOpened(rawSide.id, 'description')
                                      : false
                                  }
                                  showFaction={
                                    rawSide
                                      ? sideManager.isExtraOpened(rawSide.id, 'faction')
                                      : false
                                  }
                                  groupOptions={sideManager.groupOptions}
                                  onOpenExtra={
                                    rawSide
                                      ? (extraKey) => sideManager.openExtra(rawSide.id, extraKey)
                                      : undefined
                                  }
                                  onRename={
                                    rawSide
                                      ? (nextName) => sideManager.renameSide(rawSide, nextName)
                                      : undefined
                                  }
                                  onSetOutcome={
                                    rawSide
                                      ? (patch) => sideManager.setOutcome(rawSide, patch)
                                      : undefined
                                  }
                                  onDescribe={
                                    rawSide
                                      ? (desc) => sideManager.describeSide(rawSide, desc)
                                      : undefined
                                  }
                                  onLinkGroup={
                                    rawSide
                                      ? (groupId) => void sideManager.linkPersonGroup(rawSide, groupId)
                                      : undefined
                                  }
                                  onImportGroupMembers={
                                    rawSide?.personGroupId
                                      ? () =>
                                          void sideManager.importGroupMembersToSide(
                                            rawSide.id,
                                            rawSide.personGroupId!,
                                          )
                                      : undefined
                                  }
                                  onCreateGroup={
                                    rawSide
                                      ? () => sideManager.setCreatingGroupSide(rawSide)
                                      : undefined
                                  }
                                  onRemoveSide={
                                    rawSide
                                      ? () => void sideManager.removeSide(rawSide)
                                      : undefined
                                  }
                                />
                                <SideCountryList>
                                  {group.items.length === 0 && (
                                    <EmptySideSlot>
                                      여기로 인물을 끌어 놓거나 상단 <strong>+ 인물</strong> 버튼으로 배정하세요.
                                    </EmptySideSlot>
                                  )}
                                  {group.items.map((entry) => {
                                    const order = persons.indexOf(entry)
                                    return renderPersonRow(
                                      entry,
                                      { isFirst: order === 0, isLast: order === persons.length - 1 },
                                      false,
                                      group.sideId,
                                    )
                                  })}
                                </SideCountryList>
                              </SideGroup>
                            )
                          })}
                        </SideColumns>
                      ) : (
                        <PersonList data-manage={manageMode || undefined}>
                          {(personsCollapsed
                            ? listedPersons.slice(0, PERSON_PREVIEW_COUNT)
                            : listedPersons
                          ).map((entry) => {
                            const order = persons.indexOf(entry)
                            return renderPersonRow(entry, {
                              isFirst: order === 0,
                              isLast: order === persons.length - 1,
                            })
                          })}
                        </PersonList>
                      ))}

                    {!personSideGroups &&
                      shouldCollapse(listedPersons.length, PERSON_PREVIEW_COUNT) &&
                      !manageMode && (
                        <ShowAllToggle
                          ref={showAllToggleRef}
                          type="button"
                          aria-expanded={showAllPersons}
                          onClick={togglePersons}
                        >
                          {showAllPersons
                            ? '목록 접기'
                            : `${listedPersons.length}명 전체 보기 (+${listedPersons.length - PERSON_PREVIEW_COUNT}명)`}
                        </ShowAllToggle>
                      )}
                  </ActorSectionBody>
                </ActorSectionCard>
              )}
            </>
          )}
        </ActorsCanvas>
          </>
        )}
      </S.Section>

      <PersonLinkModal
        isOpen={personLinkTarget.open}
        onClose={() => setPersonLinkTarget({ open: false })}
        eventTitle={event.title}
        existingPersons={persons}
        context={personContext}
        participationOptions={participationOptions}
        countrySideByValue={countrySideByValue}
        sideOptions={sideOptions}
        defaultCountryId={defaultCountryForPersonCreate}
        defaultHistoricalCountryId={defaultHistoricalCountryForPersonCreate}
        defaultParticipationValue={personLinkTarget.defaultParticipationValue}
        defaultSideId={personLinkTarget.defaultSideId}
        initialPersonId={personLinkTarget.initialPersonId}
        initialCreateMode={personLinkTarget.initialCreateMode}
        onSave={(input) => {
          const result = actors.upsertPerson(input)
          if (result === 'added' && persons.length >= PERSON_PREVIEW_COUNT) {
            setShowAllPersons(true)
          }
          const targetRowKey = input.historicalCountryId
            ? `h:${input.historicalCountryId}`
            : input.countryId
              ? `m:${input.countryId}`
              : null
          if (targetRowKey) {
            setOpenDelegations((previous) => {
              if (previous.has(targetRowKey)) return previous
              const next = new Set(previous)
              next.add(targetRowKey)
              return next
            })
          }
          return result
        }}
        onRemove={actors.removePerson}
      />

      <CountryLinkModal
        isOpen={countryLinkTarget.open}
        onClose={() => setCountryLinkTarget({ open: false })}
        eventTitle={event.title}
        existingRows={countryRows}
        hintYearRange={hintYearRange}
        initialKind={countryPickerInitialKind}
        sideOptions={sideOptions}
        defaultSideId={countryLinkTarget.defaultSideId}
        initialRowKey={countryLinkTarget.initialRowKey}
        onSave={actors.upsertCountry}
        onRemove={actors.removeCountry}
      />

      {sideManager.creatingGroupSide && (
        <PersonGroupCreateModal
          defaultType="FACTION"
          defaultName={sideManager.creatingGroupSide.name}
          defaultCountryId={event.relatedCountries?.[0]?.id}
          defaultHistoricalCountryId={event.relatedHistoricalCountries?.[0]?.id}
          defaultMembers={persons
            .filter(
              (personEntry) =>
                sideRootOf(effectivePersonSide(personEntry, countrySideByKey).sideId) ===
                sideManager.creatingGroupSide?.id,
            )
            .map((personEntry) => ({
              id: personEntry.personId,
              name: personNameOf(personEntry),
            }))}
          candidatePersons={persons.map((personEntry) => ({
            id: personEntry.personId,
            name: personNameOf(personEntry),
          }))}
          onClose={() => sideManager.setCreatingGroupSide(null)}
          onCreated={(createdGroup) => {
            const targetSide = sideManager.creatingGroupSide
            sideManager.setCreatingGroupSide(null)
            if (targetSide) {
              void sideManager.linkPersonGroup(targetSide, createdGroup.id)
            }
          }}
        />
      )}
    </>
  )
}

const EmptySideSlot = styled.li`
  padding: 12px 6px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  font-size: 12px;
  line-height: 1.5;
  color: ${metaText};

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`
