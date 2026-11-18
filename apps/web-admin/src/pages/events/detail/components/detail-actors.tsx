import { type DragEvent, useEffect, useMemo, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiSettings, FiUsers } from 'react-icons/fi'

import { getAllCountries } from '@/shared/api/countries'
import {
  getContemporaryLeadersForEvent,
  type UpdateEventDto,
} from '@/shared/api/events'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import { getAllPersons } from '@/shared/api/persons'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { CountryPicker } from '@/shared/ui/country-picker'
import { PersonPickerModal } from '@/shared/ui/person-picker'
import { notify } from '@/shared/ui/toast'
import {
  comparePersons,
  contextScore,
  headlineOffice,
  matchesQuery,
  searchHaystack,
} from '@/shared/ui/person-picker/person-picker.lib'

import * as S from '../styles'
import { type PatchOptions } from '../use-undoable-patch'
import { type EventDetail, eventObservationsQueryOptions } from '../use-event-detail'
import {
  countryRowKey,
  DELEGATION_PREVIEW_COUNT,
  groupDelegations,
  PERSON_PREVIEW_COUNT,
} from './actors/actors.lib'
import {
  ActorsBlock,
  ActorsHeader,
  ActorsSummary,
  AddBtn,
  CountryList,
  DelegationList,
  DelegationMore,
  EmptyGroupLine,
  GroupCount,
  GroupHead,
  GroupLabel,
  GroupTools,
  ManageToggle,
  PersonList,
  QuickMatchChip,
  QuickMatches,
  QuickSearchInput,
  RecommendBar,
  RecommendChip,
  RecommendLabel,
  RecommendMoreBtn,
  ShowAllToggle,
  SideColumns,
  SideCountryList,
  SideGroup,
  SideHead,
  SideOutcomeTag,
  SideSwatch,
} from './actors/actors.styles'
import { ActorCountryRow } from './actors/country-row'
import { ActorPersonRow } from './actors/person-row'
import { useActorMutations } from './actors/use-actor-mutations'
import { groupBySide } from './hero-countries.lib'
import { toAxisSpan } from './development-timeline.lib'
import { withSideColors } from './side-colors'
import { SubEventSidesRollupPanel } from './side-doctrine-and-weapons'
import { SIDE_OUTCOME_LABEL } from './side-outcome'

interface DetailActorsProps {
  event: EventDetail
  onPatch: (patch: UpdateEventDto, opts?: PatchOptions) => void
  /** 인물 클릭 시 상세 모달 오픈. 페이지 레벨 단일 모달이 처리. */
  onPersonClick: (personId: string) => void
  /**
   * 관련국 클릭 시 국가 정보 모달 오픈(인물과 대칭). 링크는 유지되므로
   * 수정자 키(cmd/ctrl/shift)·중클릭의 새 탭 동선은 그대로 보존된다.
   */
  onCountryClick: (countryId: string) => void
}

/**
 * 참여 행위자 — NYT editorial dramatis personae 사이드바.
 *
 * 디자인 의도
 * - 카드/필/배경색 폐기. 검정 1px 헤어라인 룰만으로 구획 (신문 룰).
 * - 타이틀: 큰 세리프 + italic subtitle, 그 아래 굵은 룰.
 * - 인물: 세로 리스트, 정사각 60px 아바타(b&w 톤) + bold serif 이름 + italic 역할
 *   + 본문체 비고. 행 사이 1px 라이트 룰.
 * - 참여국: 인물과 같은 행 구조. 이름 + 역할(10종 피커) + 역할 서술 + 비고.
 *   현대/역사를 한 목록으로 합쳐 sortOrder 순으로 세운다 — 순서가 두 배열에 걸쳐
 *   하나이기 때문.
 * - 액션(×, 편집)은 hover 시에만 노출.
 * - 인물·국가는 같은 모양의 무리 머리글(이름 · 수 · + 추가)로 연다 — 예전엔 국가에만
 *   머리글이 있고 '+ 인물 추가'가 두 목록 사이에 떠 있었다.
 * - 비고·서술은 절반이 150자를 넘어(인물 비고 83/160) 15명짜리 사건에서 섹션이
 *   4,000px을 넘었다. 2줄에서 접고 '더 보기'로 펼친다. 시드가 쓰는 `*강조*`는 굵게 렌더.
 * - 추가하는 길은 무리 머리 한 줄에 모은다(이름으로 추가 · 목록에서 고르기). 예전엔 머리(+추가) → 빠른 추가 칸 →
 *   추천 칩이 세 줄로 서서 목록이 그 아래에서야 시작했다. 추천은 목록 **뒤**에 둔다(이미 있는 사람이 먼저).
 */
export function DetailActors({ event, onPatch, onPersonClick, onCountryClick }: DetailActorsProps) {
  const [personModalOpen, setPersonModalOpen] = useState(false)
  const [countryModalOpen, setCountryModalOpen] = useState(false)
  const [countryQuery, setCountryQuery] = useState('')
  const [countrySearchFocused, setCountrySearchFocused] = useState(false)
  const [personQuery, setPersonQuery] = useState('')
  const [showAllRecommendedPersons, setShowAllRecommendedPersons] = useState(false)
  /** 관리 모드 — true일 때만 reorder(↑↓) 버튼이 각 행에 등장한다(평소엔 read-first) */
  const [manageMode, setManageMode] = useState(false)
  /** 인물은 앞 PERSON_PREVIEW_COUNT명만 — 순서 변경 중엔 전원이 보여야 옮길 수 있어 강제로 펼친다 */
  const [showAllPersons, setShowAllPersons] = useState(false)
  /** 대표단을 다 펼친 나라(행 키) */
  const [openDelegations, setOpenDelegations] = useState<Set<string>>(() => new Set())
  /**
   * 편집 칸이 열린 인물(한 번에 한 사람) — 여기서 쥐어야 참여 국가를 골라 카드가 그 나라 밑으로 옮겨 가
   * 새로 그려져도 열린 채로 따라간다(행이 쥐고 있을 땐 옮겨 가는 순간 닫혔다).
   */
  const [editingKey, setEditingKey] = useState<string | null>(null)
  /** 편집 칸은 한 번에 하나 — 인물('person:id')과 나라('country:행 키')가 한 자리를 나눠 쓴다 */
  const editingPersonId = editingKey?.startsWith('person:') ? editingKey.slice('person:'.length) : null
  const editingCountryKey = editingKey?.startsWith('country:') ? editingKey.slice('country:'.length) : null
  const setEditingPersonId = (personId: string | null) => setEditingKey(personId ? `person:${personId}` : null)
  const [importingLeaders, setImportingLeaders] = useState(false)

  const actors = useActorMutations({ event, onPatch })
  const { persons, countryRows } = actors

  const handleImportContemporaryLeaders = async () => {
    if (!event.startDate || countryRows.length === 0 || importingLeaders) return
    setImportingLeaders(true)
    try {
      const modernIds = countryRows
        .filter((countryRow) => !countryRow.isHistorical)
        .map((countryRow) => countryRow.id)
      const histIds = countryRows
        .filter((countryRow) => countryRow.isHistorical)
        .map((countryRow) => countryRow.id)
      const candidates = await getContemporaryLeadersForEvent({
        date: event.startDate,
        datePrecision: event.startDatePrecision ?? null,
        countryIds: modernIds,
        historicalCountryIds: histIds,
      })
      if (candidates.length === 0) {
        notify.info('사건 시점에 참여국의 등록된 국가원수·정부수반·군주 기록이 없습니다.')
        return
      }
      const addedCount = actors.addPersonsBatch(
        candidates.map((candidate) => ({
          personId: candidate.personId,
          role: candidate.suggestedRole,
          countryId: candidate.countryId,
          historicalCountryId: candidate.historicalCountryId,
        })),
        `당시 수반 ${candidates.length}명 불러오기`,
      )
      if (addedCount === 0) {
        notify.info('당시 수반이 이미 모두 참여 인물에 포함되어 있습니다.')
      } else {
        if (persons.length + addedCount >= PERSON_PREVIEW_COUNT) {
          setShowAllPersons(true)
        }
        notify.success(`참여국 당시 수반·정상 ${addedCount}명을 불러왔습니다.`)
      }
    } catch {
      notify.error('참여국 당시 수반 목록을 불러오지 못했습니다.')
    } finally {
      setImportingLeaders(false)
    }
  }
  /**
   * 나라 몫의 측정값(병력·사상자…) — 수치 모듈과 같은 캐시. 참여국 줄 id(participantId)에 붙은 값만.
   * 예전엔 진영·수치 모듈에만 있어 참여 탭에서는 나라가 이름뿐이었다.
   */
  const { data: observations = [] } = useQuery(eventObservationsQueryOptions(event.id))
  const figuresByParticipant = useMemo(() => {
    const byParticipant = new Map<string, typeof observations>()
    for (const observation of observations) {
      if (observation.subjectType !== 'EVENT_PARTICIPANT') continue
      byParticipant.set(observation.subjectId, [...(byParticipant.get(observation.subjectId) ?? []), observation])
    }
    return byParticipant
  }, [observations])

  const shouldLoadCountries = countryModalOpen || countrySearchFocused || countryQuery.trim().length > 0
  const { data: allModern = [], isLoading: modernLoading } = useQuery({
    queryKey: ['countries', 'all'],
    queryFn: getAllCountries,
    enabled: shouldLoadCountries,
    staleTime: 5 * 60_000,
  })
  const { data: allHistorical = [], isLoading: historicalLoading } = useQuery({
    queryKey: ['historical-countries', 'all'],
    queryFn: getAllHistoricalCountries,
    enabled: shouldLoadCountries,
    staleTime: 5 * 60_000,
  })
  const { data: allPersons = [] } = useQuery({
    queryKey: ['persons', 'all'],
    queryFn: getAllPersons,
    staleTime: 5 * 60_000,
  })

  const addPerson = (personId: string) => {
    if (!actors.addPerson(personId)) return
    /* 새 인물은 끝에 붙는다 — 접혀 있으면 추가한 사람이 안 보이므로 펼친다 */
    if (persons.length >= PERSON_PREVIEW_COUNT) setShowAllPersons(true)
    /* 방금 더한 사람은 곧 적을 사람 — 편집 칸을 열어 둔다(예전엔 목록 끝에 닫힌 채 붙어 찾아서 ✎를 눌러야 했다) */
    setEditingPersonId(personId)
  }

  const selectedCountryIds = useMemo(() => countryRows.map((row) => row.id), [countryRows])
  const selectedCountrySet = useMemo(() => new Set(selectedCountryIds), [selectedCountryIds])
  const selectedPersonSet = useMemo(() => new Set(persons.map((entry) => entry.personId)), [persons])
  /** 인물 고르기 맥락 — 사건 기간(앞뒤 여유는 고르기 쪽이 생몰 겹침으로 판단)·참여국 */
  const personContext = useMemo(() => {
    const span = toAxisSpan(event)
    return {
      fromYear: span ? Math.floor(span.from) : null,
      toYear: span ? Math.floor(span.to) : null,
      countryIds: countryRows.map((row) => row.id),
      label: '이 사건 무렵 · 참여국 인물',
    }
  }, [event, countryRows])
  const countryPickerInitialKind = useMemo<'modern' | 'historical' | undefined>(() => {
    const refYear = personContext.toYear ?? personContext.fromYear
    if (refYear != null && refYear < 1945) return 'historical'
    if (countryRows.length > 0 && countryRows.every((row) => row.isHistorical)) {
      return 'historical'
    }
    return undefined
  }, [personContext.fromYear, personContext.toYear, countryRows])

  const countryQuickMatches = useMemo(() => {
    const trimmed = countryQuery.trim().toLowerCase()
    if (!trimmed) return []
    const modernItems = allModern
      .filter((country) => !selectedCountrySet.has(country.id) && country.name.toLowerCase().includes(trimmed))
      .map((country) => ({
        id: country.id,
        name: country.name,
        flagEmoji: (country as { flagEmoji?: string | null }).flagEmoji ?? null,
        isHistorical: false,
      }))
    const historicalItems = allHistorical
      .filter((country) => !selectedCountrySet.has(country.id) && country.name.toLowerCase().includes(trimmed))
      .map((country) => ({
        id: country.id,
        name: country.name,
        flagEmoji: null as string | null,
        isHistorical: true,
      }))
    const ordered =
      countryPickerInitialKind === 'historical'
        ? [...historicalItems, ...modernItems]
        : [...modernItems, ...historicalItems]
    return ordered.slice(0, 6)
  }, [countryQuery, allModern, allHistorical, selectedCountrySet, countryPickerInitialKind])

  const personQuickMatches = useMemo(() => {
    const trimmed = personQuery.trim()
    if (!trimmed) return []
    return allPersons
      .filter((person) => !selectedPersonSet.has(person.id) && matchesQuery(searchHaystack(person), trimmed))
      .sort(comparePersons('relevance', personContext))
      .slice(0, 6)
  }, [personQuery, allPersons, selectedPersonSet, personContext])

  const recommendedPersons = useMemo(() => {
    const hasContext = personContext.fromYear !== null || personContext.countryIds.length > 0
    if (!hasContext || allPersons.length === 0) return []
    const minScore = personContext.fromYear !== null && personContext.countryIds.length > 0 ? 3 : 1
    return allPersons
      .filter((person) => !selectedPersonSet.has(person.id) && contextScore(person, personContext) >= minScore)
      .sort(comparePersons('relevance', personContext))
      .slice(0, 12)
  }, [allPersons, selectedPersonSet, personContext])
  const totalCountries = countryRows.length
  const hasAnything = persons.length > 0 || totalCountries > 0
  /** 순서 변경 토글은 행이 2개 이상일 때만 의미가 있다 */
  const canManage = persons.length > 1 || totalCountries > 1
  const personsCollapsedBase = !showAllPersons && !manageMode
  const showAllToggleRef = useRef<HTMLButtonElement>(null)

  /** 참여 자격 국가 선택지 — 이 사건의 참여국 */
  const participationOptions = useMemo(
    () =>
      countryRows.length === 0
        ? []
        : [
            // 비우기는 별도 값 — ''(미지정)과 겹치면 '참여 국가 지정' 안내가 안 보였다
            { value: 'none', label: '지정 안 함' },
            ...countryRows.map((row) => ({
              value: `${row.isHistorical ? 'h' : 'c'}:${row.id}`,
              label: `${row.flagEmoji ? `${row.flagEmoji} ` : ''}${row.name}`,
            })),
          ],
    [countryRows],
  )

  /** 긴 목록을 접으면 버튼이 수천 px 위로 올라간다 — 접은 직후 버튼을 화면에 다시 데려온다 */
  const togglePersons = () => {
    const willCollapse = showAllPersons
    setShowAllPersons(!showAllPersons)
    if (willCollapse) {
      requestAnimationFrame(() => showAllToggleRef.current?.scrollIntoView({ block: 'center' }))
    }
  }
  /** 항목을 1개 이하로 지우면 토글이 사라진다 — 모드가 갇히지 않게 함께 끈다 */
  useEffect(() => {
    if (!canManage && manageMode) setManageMode(false)
  }, [canManage, manageMode])

  /* 순서 바꾸기 중에는 평평하게 — 진영으로 나누면 '위로·아래로'가 진영 경계를 넘는 게 보이지 않는다 */
  const countrySideGroups = manageMode ? null : groupBySide(countryRows, event.sides ?? [])
  /** 진영 색 — 진영 모듈·조망 진영 칩과 같은 색(저장 색 없으면 순서대로 팔레트) */
  const coloredSides = withSideColors(event.sides ?? [])
  const sideColorById = new Map(coloredSides.map((side) => [side.id, side.color] as const))
  const sideById = new Map(
    coloredSides.map(
      (side) => [side.id, { name: side.name, color: side.color, outcome: side.outcome, outcomeNote: side.outcomeNote }] as const,
    ),
  )
  const sideOptions = useMemo(
    () =>
      coloredSides.length === 0
        ? []
        : [
            { value: 'none', label: '진영 미지정' },
            ...coloredSides.map((side) => ({ value: side.id, label: side.name })),
          ],
    [coloredSides],
  )

  /**
   * 대표단 보기 — 나라 줄 밑에 그 나라 자격으로 참여한 인물을 매단다(진영 → 나라 → 인물).
   * 예전엔 인물과 나라가 따로 늘어서 '일본 대표가 누구였나'를 두 목록을 오가며 맞춰야 했다.
   * 순서 바꾸기 중에는 예전처럼 두 목록(옮기는 단위가 목록이라서).
   */
  const delegations = groupDelegations(countryRows, persons)
  const delegationMode = !manageMode && delegations.byCountry.size > 0
  /** 아래 '인물' 무리에 남는 사람 — 대표단 보기면 참여 국가가 없는 인물만 */
  const listedPersons = delegationMode ? delegations.unassigned : persons
  const personsCollapsed = personsCollapsedBase && listedPersons.length > PERSON_PREVIEW_COUNT
  const sideCount = (event.sides ?? []).filter((side) => !side.parentSideId).length

  type ActorDragItem = { kind: 'country' | 'person'; key: string }
  const [dragItem, setDragItem] = useState<ActorDragItem | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)

  const encodeDrag = (item: ActorDragItem) => `${item.kind}|${item.key}`
  const decodeDrag = (raw: string): ActorDragItem | null => {
    const sep = raw.indexOf('|')
    if (sep <= 0) return null
    const kind = raw.slice(0, sep)
    const key = raw.slice(sep + 1)
    if ((kind === 'country' || kind === 'person') && key) return { kind, key }
    return null
  }
  const clearDrag = () => {
    setDragItem(null)
    setDragOverTarget(null)
  }

  const renderPersonRow = (
    entry: (typeof persons)[number],
    position: { isFirst: boolean; isLast: boolean },
    compact = false,
  ) => {
    const targetKey = `person:${entry.personId}`
    return (
      <ActorPersonRow
        key={entry.personId}
        compact={compact}
        entry={entry}
        side={entry.sideId && sideById.get(entry.sideId) ? sideById.get(entry.sideId) : null}
        sideOptions={sideOptions}
        participationOptions={participationOptions}
        editing={editingPersonId === entry.personId}
        onEditingChange={(open) => setEditingPersonId(open ? entry.personId : null)}
        manageMode={manageMode}
        isFirst={position.isFirst}
        isLast={position.isLast}
        onOpen={onPersonClick}
        onUpdate={actors.updatePerson}
        onParticipation={actors.setParticipationCountry}
        onMove={actors.movePerson}
        onRemove={(personId) => {
          if (editingPersonId === personId) setEditingPersonId(null)
          actors.removePerson(personId)
        }}
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
    /* 고치는 중인 사람은 접힌 대표단 뒤쪽이어도 보인다 — 참여 국가를 골라 옮겨 간 카드가 '+N명' 뒤로 숨지 않게 */
    const shownDelegates = delegationOpen
      ? delegates
      : delegates.filter(
          (entry, position) => position < DELEGATION_PREVIEW_COUNT || entry.personId === editingPersonId,
        )
    const toggleDelegation = () =>
      setOpenDelegations((previous) => {
        const next = new Set(previous)
        if (next.has(rowKey)) next.delete(rowKey)
        else next.add(rowKey)
        return next
      })
    return (
      <ActorCountryRow
        key={countryRowKey(row)}
        row={row}
        figures={row.participantId ? figuresByParticipant.get(row.participantId) : undefined}
        side={row.sideId && sideById.get(row.sideId) ? sideById.get(row.sideId) : null}
        sideOptions={sideOptions}
        groupSideId={groupSideId}
        editing={editingCountryKey === rowKey}
        onEditingChange={(open) => setEditingKey(open ? `country:${rowKey}` : null)}
        manageMode={manageMode}
        isFirst={index === 0}
        isLast={index === countryRows.length - 1}
        onCountryClick={onCountryClick}
        onUpdate={actors.updateCountry}
        onMove={actors.moveCountry}
        onRemove={(removedKey) => {
          if (editingCountryKey === removedKey) setEditingKey(null)
          actors.removeCountry(removedKey)
        }}
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
            const draggedCountry = countryRows.find((candidate) => countryRowKey(candidate) === payload.key)
            if (draggedCountry && draggedCountry.sideId !== row.sideId) {
              actors.updateCountry(payload.key, { sideId: row.sideId ?? null })
            }
          }
        }}
        onDragEnd={clearDrag}
      >
        {delegates.length > 0 && (
          <DelegationList aria-label={`${row.name} 대표·인물`}>
            {shownDelegates.map((entry) => {
              const order = persons.indexOf(entry)
              return renderPersonRow(entry, { isFirst: order === 0, isLast: order === persons.length - 1 }, true)
            })}
            {delegates.length > DELEGATION_PREVIEW_COUNT && (delegationOpen || delegates.length > shownDelegates.length) && (
              <li>
                <DelegationMore type="button" aria-expanded={delegationOpen} onClick={toggleDelegation}>
                  {delegationOpen ? '접기' : `+${delegates.length - shownDelegates.length}명 더 보기`}
                </DelegationMore>
              </li>
            )}
          </DelegationList>
        )}
      </ActorCountryRow>
    )
  }

  /** 국가 무리(진영별·대표단 포함) */
  const nationsBlock = (
      <ActorsBlock $divided={!delegationMode}>
        <GroupHead>
          <GroupLabel>
            국가
            {totalCountries > 0 && <GroupCount>{totalCountries}</GroupCount>}
          </GroupLabel>
          <GroupTools>
            <QuickSearchInput
              type="search"
              value={countryQuery}
              onFocus={() => setCountrySearchFocused(true)}
              onChange={(changeEvent) => setCountryQuery(changeEvent.target.value)}
              onKeyDown={(keyEvent) => {
                if (keyEvent.key === 'Enter' && countryQuickMatches.length > 0) {
                  keyEvent.preventDefault()
                  const firstMatch = countryQuickMatches[0]
                  actors.addCountries([
                    {
                      id: firstMatch.id,
                      name: firstMatch.name,
                      isHistorical: firstMatch.isHistorical,
                    },
                  ])
                  setCountryQuery('')
                }
              }}
              placeholder="이름으로 추가 (Enter)"
              aria-label="참여국 이름으로 추가"
            />
            <AddBtn type="button" onClick={() => setCountryModalOpen(true)} title="국가 목록에서 여러 나라를 골라 추가">
              목록에서 고르기
            </AddBtn>
          </GroupTools>
        </GroupHead>
        {countryQuickMatches.length > 0 && (
          <QuickMatches aria-label="이름이 맞는 나라">
            {countryQuickMatches.map((candidate) => (
              <QuickMatchChip
                key={`${candidate.isHistorical ? 'h' : 'c'}:${candidate.id}`}
                type="button"
                onClick={() => {
                  actors.addCountries([
                    {
                      id: candidate.id,
                      name: candidate.name,
                      isHistorical: candidate.isHistorical,
                    },
                  ])
                  setCountryQuery('')
                }}
              >
                + {candidate.flagEmoji ? `${candidate.flagEmoji} ` : ''}
                {candidate.name}
                {candidate.isHistorical ? ' (역사)' : ''}
              </QuickMatchChip>
            ))}
          </QuickMatches>
        )}
        {/*
          * 진영은 있는데 어느 나라도 진영에 들지 않았다 — 머리엔 '진영 4'가 서 있는데 목록은 평평해 진영이 어디 갔는지 몰랐다
          * (프랑스 혁명: 진영 4 · 진영에 든 나라 0). 어디서 넣는지 한 줄로.
          */}
        {sideCount >= 2 && !manageMode && countryRows.length > 0 && !countryRows.some((row) => row.sideId) && (
          <EmptyGroupLine>
            진영 {sideCount}개에 아직 나라가 들지 않았습니다 — 각 나라의 <strong>진영 지정</strong> 배지를 눌러 바로
            지정하거나 <a href="#module-sides">진영·수치</a>에서 나라를 진영에 넣으면 여기서 진영별로 나뉩니다.
          </EmptyGroupLine>
        )}
        {countryRows.length > 0 &&
          (countrySideGroups ? (
            /*
             * 진영이 있으면 진영별 — 진영 색 머리를 달고 넓으면 나란히(동맹국 | 협상국).
             * 진영에 안 든 나라('그 밖')는 맨 아래 한 줄을 다 쓴다.
             */
            <SideColumns $stack={delegationMode}>
              {countrySideGroups.map((group) => {
                const color = group.sideId ? sideColorById.get(group.sideId) : undefined
                const groupTargetKey = `side:${group.sideId ?? 'rest'}`
                return (
                  <SideGroup
                    key={group.sideId ?? 'rest'}
                    $rest={!group.sideId}
                    $dragOver={dragOverTarget === groupTargetKey}
                    data-side-group={group.sideId ?? 'rest'}
                    onDragOver={(dragEvent: DragEvent<HTMLDivElement>) => {
                      dragEvent.preventDefault()
                      if (dragOverTarget !== groupTargetKey) setDragOverTarget(groupTargetKey)
                    }}
                    onDragLeave={(dragEvent: DragEvent<HTMLDivElement>) => {
                      if (!dragEvent.currentTarget.contains(dragEvent.relatedTarget as globalThis.Node | null)) {
                        setDragOverTarget((current) => (current === groupTargetKey ? null : current))
                      }
                    }}
                    onDrop={(dragEvent: DragEvent<HTMLDivElement>) => {
                      dragEvent.preventDefault()
                      const payload = dragItem ?? decodeDrag(dragEvent.dataTransfer.getData('text/plain'))
                      clearDrag()
                      if (!payload) return
                      if (payload.kind === 'country') {
                        actors.updateCountry(payload.key, { sideId: group.sideId ?? null })
                      } else {
                        actors.updatePerson(payload.key, { sideId: group.sideId ?? null })
                      }
                    }}
                  >
                    <SideHead $color={color}>
                      {color && <SideSwatch $color={color} aria-hidden />}
                      {group.label}
                      <GroupCount>{group.items.length}</GroupCount>
                      {group.sideId && sideById.get(group.sideId)?.outcome && (
                        <SideOutcomeTag title={sideById.get(group.sideId)?.outcomeNote ?? undefined}>
                          {SIDE_OUTCOME_LABEL[sideById.get(group.sideId)!.outcome!]}
                        </SideOutcomeTag>
                      )}
                    </SideHead>
                    <SideCountryList>{group.items.map((row) => renderCountryRow(row, group.sideId))}</SideCountryList>
                  </SideGroup>
                )
              })}
            </SideColumns>
          ) : (
            <CountryList>{countryRows.map((row) => renderCountryRow(row))}</CountryList>
          ))}
      </ActorsBlock>
  )
  const visibleRecommendedPersons = showAllRecommendedPersons
    ? recommendedPersons
    : recommendedPersons.slice(0, 3)

  /** 인물 무리 — 대표단 보기면 참여 국가가 없는 인물만 */
  const personsBlock = (
      <ActorsBlock
        $divided={delegationMode}
        onDragOver={(dragEvent: DragEvent<HTMLDivElement>) => {
          if (!delegationMode) return
          dragEvent.preventDefault()
          if (dragOverTarget !== 'unassigned-persons') setDragOverTarget('unassigned-persons')
        }}
        onDragLeave={(dragEvent: DragEvent<HTMLDivElement>) => {
          if (!dragEvent.currentTarget.contains(dragEvent.relatedTarget as globalThis.Node | null)) {
            setDragOverTarget((current) => (current === 'unassigned-persons' ? null : current))
          }
        }}
        onDrop={(dragEvent: DragEvent<HTMLDivElement>) => {
          if (!delegationMode) return
          dragEvent.preventDefault()
          const payload = dragItem ?? decodeDrag(dragEvent.dataTransfer.getData('text/plain'))
          clearDrag()
          if (payload?.kind === 'person') {
            actors.setParticipationCountry(payload.key, 'none')
          }
        }}
      >
        <GroupHead>
          <GroupLabel>
            {delegationMode && listedPersons.length > 0 ? '나라 없이 참여한 인물' : '인물'}
            {listedPersons.length > 0 && <GroupCount>{listedPersons.length}</GroupCount>}
            {/* 빈 무리도 비었다고 말한다 — 예전엔 머리 아래 따로 한 줄('아직 없습니다 — …')을 세웠다 */}
            {persons.length === 0 && hasAnything && <GroupCount>아직 없음</GroupCount>}
          </GroupLabel>
          <GroupTools>
            <QuickSearchInput
              type="search"
              value={personQuery}
              onChange={(changeEvent) => setPersonQuery(changeEvent.target.value)}
              onKeyDown={(keyEvent) => {
                if (keyEvent.key === 'Enter' && personQuickMatches.length > 0) {
                  keyEvent.preventDefault()
                  addPerson(personQuickMatches[0].id)
                  setPersonQuery('')
                }
              }}
              placeholder="이름·직위로 추가 (Enter)"
              aria-label="참여 인물 이름으로 추가"
              title="이끈 사람·지휘관·대표를 걸어 두면 인물 문서에도 이 사건이 보입니다"
            />
            <AddBtn type="button" onClick={() => setPersonModalOpen(true)} title="인물 목록에서 여러 사람을 골라 추가">
              목록에서 고르기
            </AddBtn>
            {countryRows.length > 0 && Boolean(event.startDate) && (
              <AddBtn
                type="button"
                disabled={importingLeaders}
                onClick={() => void handleImportContemporaryLeaders()}
                title="참여국들의 사건 시작일 당시 재임·재위 중인 국가원수·정부수반·군주를 한 번에 불러옵니다"
              >
                {importingLeaders ? '불러오는 중…' : '👑 당시 수반 불러오기'}
              </AddBtn>
            )}
          </GroupTools>
        </GroupHead>
        {personQuickMatches.length > 0 && (
          <QuickMatches aria-label="이름이 맞는 인물">
            {personQuickMatches.map((candidate) => {
              const displayName = getPersonDisplayName(candidate)
              const office = headlineOffice(candidate)
              return (
                <QuickMatchChip
                  key={candidate.id}
                  type="button"
                  title={office ?? undefined}
                  onClick={() => {
                    addPerson(candidate.id)
                    setPersonQuery('')
                  }}
                >
                  + {displayName}
                </QuickMatchChip>
              )
            })}
          </QuickMatches>
        )}
        {listedPersons.length > 0 && (
          <PersonList>
            {(personsCollapsed ? listedPersons.slice(0, PERSON_PREVIEW_COUNT) : listedPersons).map((entry) => {
              const order = persons.indexOf(entry)
              return renderPersonRow(entry, { isFirst: order === 0, isLast: order === persons.length - 1 })
            })}
          </PersonList>
        )}
        {listedPersons.length > PERSON_PREVIEW_COUNT && !manageMode && (
          <ShowAllToggle ref={showAllToggleRef} type="button" aria-expanded={showAllPersons} onClick={togglePersons}>
            {showAllPersons
              ? '접기'
              : `${listedPersons.length}명 모두 보기 (+${listedPersons.length - PERSON_PREVIEW_COUNT})`}
          </ShowAllToggle>
        )}
          {recommendedPersons.length > 0 && !personQuery.trim() && !manageMode && (
            <RecommendBar aria-label="이 사건 무렵 · 참여국 추천 인물">
              <RecommendLabel>동시대·참여국 추천</RecommendLabel>
              {visibleRecommendedPersons.map((candidate) => {
                const displayName = getPersonDisplayName(candidate)
                const office = headlineOffice(candidate)
                return (
                  <RecommendChip
                    key={candidate.id}
                    type="button"
                    title={office ? `${displayName} · ${office}` : displayName}
                    onClick={() => addPerson(candidate.id)}
                  >
                    + {displayName}
                  </RecommendChip>
                )
              })}
              {recommendedPersons.length > 3 && (
                <RecommendMoreBtn
                  type="button"
                  onClick={() => setShowAllRecommendedPersons((previous) => !previous)}
                >
                  {showAllRecommendedPersons
                    ? '접기'
                    : `+${recommendedPersons.length - 3}명 더 보기`}
                </RecommendMoreBtn>
              )}
            </RecommendBar>
          )}
      </ActorsBlock>
  )

  return (
    <>
      <S.Section id="actors">
        <ActorsHeader>
          {/* 탭 이름('참여')과 같은 말을 되풀이하던 제목 — 이 사건의 참여 규모를 한 줄로 */}
          <S.SectionTitle>
            참여
            {hasAnything && (
              <ActorsSummary>
                {[
                  totalCountries > 0 && `국가 ${totalCountries}`,
                  persons.length > 0 && `인물 ${persons.length}`,
                  sideCount >= 2 && `진영 ${sideCount}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </ActorsSummary>
            )}
          </S.SectionTitle>
          {canManage && (
            <S.SectionActions>
              <ManageToggle
                type="button"
                onClick={() => setManageMode((previous) => !previous)}
                $active={manageMode}
                aria-pressed={manageMode}
              >
                <FiSettings />
                {manageMode ? '관리 끝' : '순서 변경'}
              </ManageToggle>
            </S.SectionActions>
          )}
        </ActorsHeader>

        {/* 비어 있을 때 통일 안내 — 인물·국가 모두 없을 때만 */}
        {!hasAnything && (
          <S.EmptyState>
            <S.EmptyStateHead>
              <S.EmptyStateIcon aria-hidden>
                <FiUsers />
              </S.EmptyStateIcon>
              <S.EmptyStateLine>
                아직 등록된 인물·국가가 없습니다. <strong>인물 추가</strong>·
                <strong>국가 추가</strong>로 시작하세요.
              </S.EmptyStateLine>
            </S.EmptyStateHead>
          </S.EmptyState>
        )}

        {/*
          * 대표단 보기면 나라(+그 인물)가 먼저, 아니면 인물이 먼저 — 단 인물이 0명이면 나라가 먼저.
          * 사건 602건 중 인물이 걸린 사건은 59건이라, 대부분의 탭이 빈 인물 칸으로 시작했다.
          */}
        {delegationMode || (persons.length === 0 && totalCountries > 0) ? (
          <>
            {nationsBlock}
            {personsBlock}
          </>
        ) : (
          <>
            {personsBlock}
            {nationsBlock}
          </>
        )}

        {/* 하위 사건 모아보기 — 이 사건 자신의 참여가 먼저다(예전엔 머리 바로 밑에 서서 목록을 한 칸 밀었다) */}
        {event.kind === 'COLLECTION' && <SubEventSidesRollupPanel eventId={event.id} />}
      </S.Section>

      {personModalOpen && (
        /* 인물 목록은 고르기 모달이 스스로 받는다(앱 전역 캐시 공유) */
        <PersonPickerModal
          onSelect={(id) => addPerson(id)}
          onClose={() => setPersonModalOpen(false)}
          excludeIds={persons.map((person) => person.personId)}
          /* 이 사건 무렵·참여국 인물을 위로 — 470명 이름순 맨 앞은 대개 이 사건과 무관했다 */
          context={personContext}
          title="참여 인물 추가"
          multiSelect
        />
      )}
      {/* 추가 전용 — 이미 관련국인 나라는 잠기고, 빼기는 행의 ✕(undo 있음)에서만 */}
      <CountryPicker
        isOpen={countryModalOpen}
        onClose={() => setCountryModalOpen(false)}
        mode="add"
        title="관련 국가 추가"
        onCommit={actors.addCountries}
        modernCountries={allModern}
        historicalCountries={allHistorical}
        hintYearRange={{ startYear: personContext.fromYear, endYear: personContext.toYear }}
        initialKind={countryPickerInitialKind}
        selectedIds={selectedCountryIds}
        isLoading={modernLoading || historicalLoading}
      />
    </>
  )
}
