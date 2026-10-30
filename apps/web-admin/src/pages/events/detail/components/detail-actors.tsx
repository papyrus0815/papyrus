import { useEffect, useMemo, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiSettings } from 'react-icons/fi'

import { getAllCountries } from '@/shared/api/countries'
import { type UpdateEventDto } from '@/shared/api/events'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import { CountryPicker } from '@/shared/ui/country-picker'
import { PersonPickerModal } from '@/shared/ui/person-picker'

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
  ManageToggle,
  PersonList,
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
 */
export function DetailActors({ event, onPatch, onPersonClick, onCountryClick }: DetailActorsProps) {
  const [personModalOpen, setPersonModalOpen] = useState(false)
  const [countryModalOpen, setCountryModalOpen] = useState(false)
  /** 관리 모드 — true일 때만 reorder(↑↓) 버튼이 각 행에 등장한다(평소엔 read-first) */
  const [manageMode, setManageMode] = useState(false)
  /** 인물은 앞 PERSON_PREVIEW_COUNT명만 — 순서 변경 중엔 전원이 보여야 옮길 수 있어 강제로 펼친다 */
  const [showAllPersons, setShowAllPersons] = useState(false)
  /** 대표단을 다 펼친 나라(행 키) */
  const [openDelegations, setOpenDelegations] = useState<Set<string>>(() => new Set())

  const actors = useActorMutations({ event, onPatch })
  const { persons, countryRows } = actors
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

  const { data: allModern = [], isLoading: modernLoading } = useQuery({
    queryKey: ['countries', 'all'],
    queryFn: getAllCountries,
    enabled: countryModalOpen,
    staleTime: 5 * 60_000,
  })
  const { data: allHistorical = [], isLoading: historicalLoading } = useQuery({
    queryKey: ['historical-countries', 'all'],
    queryFn: getAllHistoricalCountries,
    enabled: countryModalOpen,
    staleTime: 5 * 60_000,
  })

  const addPerson = (personId: string) => {
    if (!actors.addPerson(personId)) return
    /* 새 인물은 끝에 붙는다 — 접혀 있으면 추가한 사람이 안 보이므로 펼친다 */
    if (persons.length >= PERSON_PREVIEW_COUNT) setShowAllPersons(true)
  }

  const selectedCountryIds = useMemo(() => countryRows.map((row) => row.id), [countryRows])
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

  const renderPersonRow = (
    entry: (typeof persons)[number],
    position: { isFirst: boolean; isLast: boolean },
    compact = false,
  ) => (
    <ActorPersonRow
      key={entry.personId}
      compact={compact}
      entry={entry}
      participationOptions={participationOptions}
      manageMode={manageMode}
      isFirst={position.isFirst}
      isLast={position.isLast}
      onOpen={onPersonClick}
      onUpdate={actors.updatePerson}
      onParticipation={actors.setParticipationCountry}
      onMove={actors.movePerson}
      onRemove={actors.removePerson}
    />
  )

  const renderCountryRow = (row: (typeof countryRows)[number]) => {
    const index = countryRows.indexOf(row)
    const rowKey = countryRowKey(row)
    const delegates = delegationMode ? (delegations.byCountry.get(rowKey) ?? []) : []
    const delegationOpen = openDelegations.has(rowKey)
    const shownDelegates = delegationOpen ? delegates : delegates.slice(0, DELEGATION_PREVIEW_COUNT)
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
        /* 진영 칸 밖(평평한 목록·순서 바꾸기)에서만 진영을 행에 적는다 */
        side={
          !countrySideGroups && row.sideId && sideById.get(row.sideId)
            ? sideById.get(row.sideId)
            : null
        }
        manageMode={manageMode}
        isFirst={index === 0}
        isLast={index === countryRows.length - 1}
        onCountryClick={onCountryClick}
        onUpdate={actors.updateCountry}
        onMove={actors.moveCountry}
        onRemove={actors.removeCountry}
      >
        {delegates.length > 0 && (
          <DelegationList aria-label={`${row.name} 대표·인물`}>
            {shownDelegates.map((entry) => {
              const order = persons.indexOf(entry)
              return renderPersonRow(entry, { isFirst: order === 0, isLast: order === persons.length - 1 }, true)
            })}
            {delegates.length > DELEGATION_PREVIEW_COUNT && (
              <li>
                <DelegationMore type="button" aria-expanded={delegationOpen} onClick={toggleDelegation}>
                  {delegationOpen ? '접기' : `+${delegates.length - DELEGATION_PREVIEW_COUNT}명 더 보기`}
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
          <AddBtn type="button" onClick={() => setCountryModalOpen(true)}>
            국가 추가
          </AddBtn>
        </GroupHead>
        {countryRows.length > 0 &&
          (countrySideGroups ? (
            /*
             * 진영이 있으면 진영별 — 진영 색 머리를 달고 넓으면 나란히(동맹국 | 협상국).
             * 진영에 안 든 나라('그 밖')는 맨 아래 한 줄을 다 쓴다.
             */
            <SideColumns $stack={delegationMode}>
              {countrySideGroups.map((group) => {
                const color = group.sideId ? sideColorById.get(group.sideId) : undefined
                return (
                  <SideGroup key={group.sideId ?? 'rest'} $rest={!group.sideId}>
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
                    <SideCountryList>{group.items.map(renderCountryRow)}</SideCountryList>
                  </SideGroup>
                )
              })}
            </SideColumns>
          ) : (
            <CountryList>{countryRows.map(renderCountryRow)}</CountryList>
          ))}
      </ActorsBlock>
  )
  /** 인물 무리 — 대표단 보기면 참여 국가가 없는 인물만 */
  const personsBlock = (
      <ActorsBlock $divided={delegationMode}>
        <GroupHead>
          <GroupLabel>
            {delegationMode ? '참여 국가 미지정 인물' : '인물'}
            {listedPersons.length > 0 && <GroupCount>{listedPersons.length}</GroupCount>}
          </GroupLabel>
          <AddBtn type="button" onClick={() => setPersonModalOpen(true)}>
            인물 추가
          </AddBtn>
        </GroupHead>
        {delegationMode && listedPersons.length === 0 && (
          <EmptyGroupLine>인물은 모두 위 나라 아래에 있습니다 — 참여 국가가 없는 인물만 여기에 모입니다.</EmptyGroupLine>
        )}
        {persons.length === 0 && hasAnything && (
          // 빈 무리도 한 줄은 말한다 — 머리글만 서 있으면 비었는지 덜 불러온 건지 몰랐다
          <EmptyGroupLine>
            아직 없습니다 — 이끈 사람·지휘관·대표 같은 인물을 걸어 두면 인물 문서에서도 이 사건이 보입니다.
          </EmptyGroupLine>
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
              <S.EmptyStateIcon aria-hidden>👥</S.EmptyStateIcon>
              <S.EmptyStateLine>
                아직 등록된 인물·국가가 없습니다. <strong>인물 추가</strong>·
                <strong>국가 추가</strong>로 시작하세요.
              </S.EmptyStateLine>
            </S.EmptyStateHead>
          </S.EmptyState>
        )}

        {/* 대표단 보기면 나라(+그 인물)가 먼저, 아니면 예전처럼 인물이 먼저 */}
        {delegationMode ? (
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
        selectedIds={selectedCountryIds}
        isLoading={modernLoading || historicalLoading}
      />
    </>
  )
}
