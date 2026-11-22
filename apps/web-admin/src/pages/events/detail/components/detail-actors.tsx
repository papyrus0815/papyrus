import { type DragEvent, useEffect, useMemo, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import {
  FiBarChart2,
  FiCheck,
  FiGitBranch,
  FiGitMerge,
  FiList,
  FiPlus,
  FiSliders,
} from 'react-icons/fi'

import { observationExtent } from '@/entities/evidence/lib/format-observation'
import { findReplacementForMismatchedCountry } from '@/entities/event/model'
import { BentoActionBtn } from '@/entities/event/ui/bento-primitives'
import { getAllCountries } from '@/shared/api/countries'
import { type Observation } from '@/shared/api/evidence'
import { listEventSideUnits, type SideUnitView } from '@/shared/api/event-sides'
import { type UpdateEventDto } from '@/shared/api/events'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import { PopoverMenu, type PopoverMenuEntry } from '@/shared/ui/popover-menu'
import {
  LedgerViewSwitch,
  LedgerViewSwitchItem,
} from '@/widgets/country/country-detail/ui/country-ledger-primitives'

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
  ActorsSubtitle,
  ActorsSummary,
  CountryList,
  CrossSideLabel,
  DelegationCaption,
  DelegationList,
  DelegationMore,
  EmptyActorsCard,
  EmptyGroupLine,
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
  SideHead,
  SideHeadTitle,
  SideOutcomeTag,
  SideSwatch,
} from './actors/actors.styles'
import { CountryLinkModal } from './actors/country-link-modal'
import { ActorCountryRow } from './actors/country-row'
import { PersonLinkModal } from './actors/person-link-modal'
import { ActorPersonRow } from './actors/person-row'
import { useActorMutations } from './actors/use-actor-mutations'
import { toAxisSpan } from './development-timeline.lib'
import { groupBySide, makeSideRootOf } from './hero-countries.lib'
import { withSideColors } from './side-colors'
import { SubEventSidesRollupPanel } from './side-doctrine-and-weapons'
import { LOSS_METRIC_PRIORITY, PERSONNEL_METRIC, representativeOf } from './side-metrics.lib'
import { SIDE_OUTCOME_LABEL } from './side-outcome'

type ActorsViewMode = 'board' | 'ledger'

function pickParticipantHeadlineFigure(list: ReadonlyArray<Observation>): Observation | null {
  for (const metricKey of [PERSONNEL_METRIC, ...LOSS_METRIC_PRIORITY]) {
    const candidates = list.filter((entry) => entry.metric.key === metricKey)
    const picked = representativeOf(candidates)
    if (picked) return picked
  }
  return null
}

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
  onPatch: (patch: UpdateEventDto, opts?: PatchOptions) => void
  onPersonClick: (personId: string) => void
  onCountryClick: (countryId: string) => void
  onStartSides?: () => void
  onManageSides?: () => void
  /** 참여 요약판의 '수치 자세히' — 수치 모듈로 */
  onShowMetrics?: () => void
}

export function DetailActors({
  event,
  departmentCount = 0,
  readOnly = false,
  onPatch,
  onPersonClick,
  onCountryClick,
  onStartSides,
  onManageSides,
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

  const leadParticipantFigures = useMemo(() => {
    const headlineByParticipant = new Map<string, Observation>()
    const metricCounts = new Map<string, number>()
    for (const [participantId, list] of figuresByParticipant.entries()) {
      const picked = pickParticipantHeadlineFigure(list)
      if (!picked) continue
      headlineByParticipant.set(participantId, picked)
      if (!picked.atLeast) {
        metricCounts.set(picked.metric.key, (metricCounts.get(picked.metric.key) ?? 0) + 1)
      }
    }
    const topMetricKey = [...metricCounts.entries()].sort(
      (left, right) => right[1] - left[1],
    )[0]?.[0]
    const byParticipant = new Map<string, { obs: Observation; pct: number | null }>()
    for (const [participantId, obs] of headlineByParticipant.entries()) {
      byParticipant.set(participantId, { obs, pct: null })
    }
    if (!topMetricKey) {
      return { byParticipant }
    }
    const comparableEntries = [...headlineByParticipant.entries()].filter(
      ([, obs]) => obs.metric.key === topMetricKey && !obs.atLeast,
    )
    if (comparableEntries.length < 2) {
      return { byParticipant }
    }
    const maxVal = Math.max(
      1,
      ...comparableEntries.map(([, obs]) => observationExtent(obs)?.center ?? 0),
    )
    for (const [participantId, obs] of comparableEntries) {
      const center = observationExtent(obs)?.center ?? 0
      if (center > 0) {
        byParticipant.set(participantId, {
          obs,
          pct: Math.max(5, Math.min(100, Math.round((center / maxVal) * 100))),
        })
      }
    }
    return { byParticipant }
  }, [figuresByParticipant])

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

  const countrySideGroups = manageMode ? null : groupBySide(countryRows, event.sides ?? [])
  /** 소속국 진영 표 — 인물의 실효 진영(따로 정한 진영 ?? 소속국 진영)을 진영 탭과 같은 규칙으로 낸다 */
  const countrySideByKey = useMemo(
    () => countrySideMapOf(event.relatedCountries, event.relatedHistoricalCountries),
    [event.relatedCountries, event.relatedHistoricalCountries],
  )
  const sideRootOf = useMemo(() => makeSideRootOf(event.sides ?? []), [event.sides])
  /* 나라가 진영으로 안 갈릴 때는 인물을 실효 진영으로 가른다 — 소속국 진영을 따르는 인물도 그 편에 선다 */
  const personSideGroups = useMemo(() => {
    if (manageMode || countrySideGroups) return null
    const grouped = groupBySide(
      persons.map((entry) => ({ entry, sideId: effectivePersonSide(entry, countrySideByKey).sideId })),
      event.sides ?? [],
    )
    return grouped
      ? grouped.map((group) => ({ ...group, items: group.items.map((item) => item.entry) }))
      : null
  }, [manageMode, countrySideGroups, persons, countrySideByKey, event.sides])

  const coloredSides = withSideColors(event.sides ?? [])
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
  const sideCount = (event.sides ?? []).filter((side) => !side.parentSideId).length

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
        (sideCount >= 2 && Boolean(onManageSides)) ||
        (canManage && viewMode === 'board')

      if (hasStructureActions) {
        entries.push({ type: 'divider', id: 'div-structure' })
        entries.push({ type: 'section', id: 'sec-structure', label: '구도 · 정렬' })

        if (sideCount === 0 && onStartSides) {
          entries.push({
            id: 'start-sides',
            label: '대립 진영 나누기',
            icon: <FiGitMerge size={13} />,
            onSelect: () => onStartSides(),
          })
        } else if (sideCount >= 2 && onManageSides) {
          entries.push({
            id: 'manage-sides',
            label: '진영·수치 탭에서 진영 편집 →',
            icon: <FiGitMerge size={13} />,
            onSelect: () => onManageSides(),
          })
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
    onManageSides,
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

    const leadEntry = row.participantId
      ? leadParticipantFigures.byParticipant.get(row.participantId)
      : undefined
    const resolvedSide =
      row.sideId && sideById.get(row.sideId) ? sideById.get(row.sideId) : null

    return (
      <ActorCountryRow
        key={rowKey}
        row={row}
        figures={row.participantId ? figuresByParticipant.get(row.participantId) : undefined}
        leadObservation={leadEntry?.obs ?? null}
        leadSharePct={leadEntry?.pct ?? null}
        side={resolvedSide}
        sideColor={resolvedSide?.color ?? null}
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

  return (
    <>
      <S.Section id="actors">
        <ActorsHeader>
          <ActorsHeaderLeft>
            <S.SectionTitle>
              참여 국가 · 인물
              {hasAnything && (
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
              )}
            </S.SectionTitle>
            <ActorsSubtitle>
              {viewMode === 'ledger'
                ? '등록된 모든 참여 국가와 인물을 한 표에서 비교하고 편집합니다.'
                : '사건에 관여한 국가와 인물의 역할을 기록합니다. 인물에 소속국을 지정하면 해당 국가 아래에 묶이며 진영도 함께 따릅니다.'}
            </ActorsSubtitle>
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

            {hasAnything && (
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
            )}

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
              onManageSides={onManageSides}
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
                        {totalCountries > 0 ? (
                          <GroupCount>{totalCountries}개국</GroupCount>
                        ) : (
                          <GroupCount $muted>미등록</GroupCount>
                        )}
                      </ActorSectionTitleRow>
                      <SectionHintText>
                        {sideCount >= 2
                          ? '대립 진영별로 국가를 나누어 표시합니다. 행을 다른 진영으로 끌어 옮기거나 편집에서 진영을 바꿀 수 있습니다.'
                          : '주도·대상·중재 등 당사국의 역할과 사건 중 수행한 일을 기록합니다.'}
                      </SectionHintText>
                    </ActorSectionTitleGroup>

                    {!readOnly && (
                      <ActorSectionHeadActions>
                        {sideCount === 0 && onStartSides && countryRows.length >= 2 && (
                          <BentoActionBtn type="button" $accent onClick={onStartSides}>
                            <FiGitMerge size={12} />
                            진영 나누기
                          </BentoActionBtn>
                        )}
                        {sideCount >= 2 && onManageSides && (
                          <BentoActionBtn
                            type="button"
                            onClick={onManageSides}
                            title="진영·수치 탭으로 이동해 진영 이름·승패 결과·전투서열을 편집합니다"
                          >
                            진영·수치 탭에서 편집 →
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
                    {countryRows.length === 0 && (
                      <EmptyActorsCard>
                        <strong>등록된 참여 국가가 없습니다.</strong>
                        <span>
                          우측 ‘국가 잇기’ 버튼으로 현대 국가나 역사 국가를 찾아 역할과 함께 연결하세요.
                        </span>
                      </EmptyActorsCard>
                    )}

                    {sideCount >= 2 &&
                      !manageMode &&
                      !readOnly &&
                      !personSideGroups &&
                      countryRows.length >= 2 &&
                      !countryRows.some((row) => row.sideId) && (
                        <EmptyGroupLine>
                          진영 {sideCount}개가 준비되어 있습니다 — 각 국가 이름 옆의{' '}
                          <strong>+ 진영 배정</strong> 버튼이나 <strong>편집</strong>에서 진영을 지정하세요.
                        </EmptyGroupLine>
                      )}

                    {countryRows.length > 0 &&
                      (countrySideGroups ? (
                        <SideColumns>
                          {countrySideGroups.map((group) => {
                            const color = group.sideId ? sideColorById.get(group.sideId) : undefined
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
                                <SideHead $color={color}>
                                  <SideHeadTitle>
                                    {color && <SideSwatch $color={color} aria-hidden />}
                                    <span>{group.label}</span>
                                    <GroupCount>{group.items.length}</GroupCount>
                                    {group.sideId && sideById.get(group.sideId)?.outcome && (
                                      <SideOutcomeTag
                                        title={
                                          sideById.get(group.sideId)?.outcomeNote ?? undefined
                                        }
                                      >
                                        {SIDE_OUTCOME_LABEL[sideById.get(group.sideId)!.outcome!]}
                                      </SideOutcomeTag>
                                    )}
                                  </SideHeadTitle>
                                </SideHead>
                                <SideCountryList>
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
                        {persons.length > 0 ? (
                          <GroupCount>{persons.length}명</GroupCount>
                        ) : (
                          <GroupCount $muted>미등록</GroupCount>
                        )}
                      </ActorSectionTitleRow>
                      <SectionHintText>
                        {delegationMode && listedPersons.length === 0
                          ? `등록된 인물 ${persons.length}명 모두 위 소속 국가 행 아래에 표시 중입니다.`
                          : delegationMode && delegatedPersonCount > 0
                            ? `소속국이 지정된 ${delegatedPersonCount}명은 위 국가 아래에, 소속국 없는 단독 참여 ${listedPersons.length}명은 아래에 표시됩니다.`
                            : '지휘관·국가원수·외교 대표 등 이 사건에서 활동한 주요 인물과 역할을 기록합니다.'}
                      </SectionHintText>
                    </ActorSectionTitleGroup>

                    {!readOnly && (
                      <ActorSectionHeadActions>
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
                    {persons.length === 0 && (
                      <EmptyActorsCard>
                        <strong>등록된 참여 인물이 없습니다.</strong>
                        <span>
                          우측 ‘인물 잇기’ 버튼으로 기존 인물을 찾거나 새 인물을 바로 만들어 연결할 수 있습니다.
                        </span>
                      </EmptyActorsCard>
                    )}

                    {sideCount >= 2 &&
                      !manageMode &&
                      !readOnly &&
                      countryRows.length <= 1 &&
                      !personSideGroups &&
                      persons.length >= 2 &&
                      !persons.some((person) => person.sideId) && (
                        <EmptyGroupLine>
                          진영 {sideCount}개가 준비되어 있습니다 — 각 인물 우측 <strong>편집</strong>이나 <strong>⋯</strong> 메뉴에서 진영을 배정하면 진영별로 나뉩니다.
                        </EmptyGroupLine>
                      )}

                    {listedPersons.length > 0 &&
                      (personSideGroups ? (
                        <SideColumns>
                          {personSideGroups.map((group) => {
                            const color = group.sideId ? sideColorById.get(group.sideId) : undefined
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
                                <SideHead $color={color}>
                                  <SideHeadTitle>
                                    {color && <SideSwatch $color={color} aria-hidden />}
                                    <span>{group.label}</span>
                                    <GroupCount>{group.items.length}</GroupCount>
                                    {group.sideId && sideById.get(group.sideId)?.outcome && (
                                      <SideOutcomeTag
                                        title={
                                          sideById.get(group.sideId)?.outcomeNote ?? undefined
                                        }
                                      >
                                        {SIDE_OUTCOME_LABEL[sideById.get(group.sideId)!.outcome!]}
                                      </SideOutcomeTag>
                                    )}
                                  </SideHeadTitle>
                                </SideHead>
                                <SideCountryList>
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

          {event.kind === 'COLLECTION' && (
            <SubEventSidesRollupPanel
              eventId={event.id}
              domain={event.domain}
              defaultOpen={persons.length === 0}
            />
          )}
        </ActorsCanvas>
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
    </>
  )
}
