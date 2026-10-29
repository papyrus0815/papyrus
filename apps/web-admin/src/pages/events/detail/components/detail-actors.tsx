import { useEffect, useMemo, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiSettings } from 'react-icons/fi'

import { getAllCountries } from '@/shared/api/countries'
import { type UpdateEventDto } from '@/shared/api/events'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import { getAllPersons } from '@/shared/api/persons'
import { CountryPicker } from '@/shared/ui/country-picker'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'

import * as S from '../styles'
import { type PatchOptions } from '../use-undoable-patch'
import { type EventDetail } from '../use-event-detail'
import { countryRowKey, PERSON_PREVIEW_COUNT } from './actors/actors.lib'
import {
  ActorsHeader,
  AddBtn,
  CountryList,
  EmptyGroupLine,
  GroupCount,
  GroupHead,
  GroupLabel,
  ManageToggle,
  NationsBlock,
  PersonList,
  PersonsBlock,
  ShowAllToggle,
  SideColumns,
  SideCountryList,
  SideGroup,
  SideHead,
  SideSwatch,
} from './actors/actors.styles'
import { ActorCountryRow } from './actors/country-row'
import { ActorPersonRow } from './actors/person-row'
import { useActorMutations } from './actors/use-actor-mutations'
import { groupBySide } from './hero-countries.lib'
import { withSideColors } from './side-colors'

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

  const actors = useActorMutations({ event, onPatch })
  const { persons, countryRows } = actors

  const { data: allPersons = [], isLoading: personsLoading } = useQuery({
    queryKey: ['persons', 'all'],
    queryFn: getAllPersons,
    enabled: personModalOpen,
    staleTime: 5 * 60_000,
  })
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
  const totalCountries = countryRows.length
  const hasAnything = persons.length > 0 || totalCountries > 0
  /** 순서 변경 토글은 행이 2개 이상일 때만 의미가 있다 */
  const canManage = persons.length > 1 || totalCountries > 1
  const personsCollapsed = !showAllPersons && !manageMode && persons.length > PERSON_PREVIEW_COUNT
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
  const sideColorById = new Map(
    withSideColors(event.sides ?? []).map((side) => [side.id, side.color] as const),
  )

  const renderCountryRow = (row: (typeof countryRows)[number]) => {
    const index = countryRows.indexOf(row)
    return (
      <ActorCountryRow
        key={countryRowKey(row)}
        row={row}
        manageMode={manageMode}
        isFirst={index === 0}
        isLast={index === countryRows.length - 1}
        onCountryClick={onCountryClick}
        onUpdate={actors.updateCountry}
        onMove={actors.moveCountry}
        onRemove={actors.removeCountry}
      />
    )
  }

  return (
    <>
      <S.Section id="actors">
        <ActorsHeader>
          <S.SectionTitle>참여 행위자</S.SectionTitle>
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

        <PersonsBlock>
          <GroupHead>
            <GroupLabel>
              인물
              {persons.length > 0 && <GroupCount>{persons.length}</GroupCount>}
            </GroupLabel>
            <AddBtn type="button" onClick={() => setPersonModalOpen(true)}>
              인물 추가
            </AddBtn>
          </GroupHead>
          {persons.length === 0 && hasAnything && (
            // 빈 무리도 한 줄은 말한다 — 머리글만 서 있으면 비었는지 덜 불러온 건지 몰랐다
            <EmptyGroupLine>
              아직 없습니다 — 이끈 사람·지휘관·대표 같은 인물을 걸어 두면 인물 문서에서도 이 사건이 보입니다.
            </EmptyGroupLine>
          )}
          {persons.length > 0 && (
            <PersonList>
              {(personsCollapsed ? persons.slice(0, PERSON_PREVIEW_COUNT) : persons).map((entry, index) => (
                <ActorPersonRow
                  key={entry.personId}
                  entry={entry}
                  participationOptions={participationOptions}
                  manageMode={manageMode}
                  isFirst={index === 0}
                  isLast={index === persons.length - 1}
                  onOpen={onPersonClick}
                  onUpdate={actors.updatePerson}
                  onParticipation={actors.setParticipationCountry}
                  onMove={actors.movePerson}
                  onRemove={actors.removePerson}
                />
              ))}
            </PersonList>
          )}
          {persons.length > PERSON_PREVIEW_COUNT && !manageMode && (
            <ShowAllToggle ref={showAllToggleRef} type="button" aria-expanded={showAllPersons} onClick={togglePersons}>
              {showAllPersons ? '접기' : `${persons.length}명 모두 보기 (+${persons.length - PERSON_PREVIEW_COUNT})`}
            </ShowAllToggle>
          )}
        </PersonsBlock>

        <NationsBlock>
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
              <SideColumns>
                {countrySideGroups.map((group) => {
                  const color = group.sideId ? sideColorById.get(group.sideId) : undefined
                  return (
                    <SideGroup key={group.sideId ?? 'rest'} $rest={!group.sideId}>
                      <SideHead $color={color}>
                        {color && <SideSwatch $color={color} aria-hidden />}
                        {group.label}
                        <GroupCount>{group.items.length}</GroupCount>
                      </SideHead>
                      <SideCountryList>{group.items.map(renderCountryRow)}</SideCountryList>
                    </SideGroup>
                  )
                })}
              </SideColumns>
            ) : (
              <CountryList>{countryRows.map(renderCountryRow)}</CountryList>
            ))}
        </NationsBlock>
      </S.Section>

      {personModalOpen && (
        <PersonSelectModal
          persons={allPersons}
          selectedPersonId=""
          onSelect={(id) => addPerson(id)}
          onClose={() => setPersonModalOpen(false)}
          excludeIds={persons.map((person) => person.personId)}
          title="참여 인물 추가"
          searchPlaceholder="이름 또는 생몰년도로 검색..."
          multiSelect
          loading={personsLoading}
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
