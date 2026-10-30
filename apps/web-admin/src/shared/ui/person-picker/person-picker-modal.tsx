/**
 * 인물 고르기 — 프로젝트의 **단일** 인물 검색·선택 모달.
 *
 * 예전 PersonSelectModal(1,771줄)은 공용 <Modal> 토대 밖에서 포털·포커스 트랩·Esc를 직접 다뤘고,
 * 결과 수에 따라 상자 높이가 출렁였으며, 쓰는 곳마다 인물 전량(1.6MB)을 따로 받아 넘겨야 했다.
 * 사건 등록 폼·기업 등록·국가 인물 폼은 또 저마다 다른 고르기(SelectModal·드롭다운·select)를 썼다.
 *
 * - 셸은 공용 <Modal>(글래스·Esc·스크롤락·포커스 트랩·중첩) — 직접 구현하지 않는다
 * - `persons`를 안 주면 스스로 받는다(['persons','all'] 캐시 공유 — 앱 전체에서 한 번)
 * - `context`(기간·나라)를 주면 '이 무렵·관련 나라' 인물을 위로 묶어 보여 준다
 * - 행: 사진·이름·원어 이름·생몰(기원전·활동기)·나라·대표 직위 — 동명이인을 가를 만큼
 * - 연속 추가(multiSelect)·새 인물 즉석 등록·키보드(↑↓ Enter)
 *
 * 옛 이름 `PersonSelectModal`은 이 컴포넌트를 다시 내보낸다(호출부 22곳 무변경).
 */
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { FiPlus, FiSearch, FiX } from 'react-icons/fi'

import { getAllPersons, type PersonResponseDto } from '@/shared/api/persons'
import { getUploadImageUrl } from '@/shared/api/upload'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { Modal } from '@/shared/ui/modal'

import { PersonPickerCreateForm } from './person-picker-create-form'
import {
  comparePersons,
  contextScore,
  headlineOffice,
  lifeSpanLabel,
  matchesQuery,
  type PersonPickerContext,
  type PersonSortKey,
  searchHaystack,
} from './person-picker.lib'
import * as S from './person-picker.styles'

export interface PersonPickerModalProps {
  /** 후보 — 안 주면 스스로 받는다(앱 전역 캐시 공유) */
  persons?: PersonResponseDto[]
  selectedPersonId?: string
  onSelect: (personId: string, personName: string) => void
  onClose: () => void
  /** 목록에서 뺄 인물(자기 자신·이미 다른 슬롯에 든 인물 등) */
  excludeIds?: string[]
  /** 뺀 이유 — 결과가 0건일 때 빈 상태에 함께 말한다 */
  excludeReason?: string
  /** 제목(예: '아버지 선택') — 기본 '인물 선택' */
  title?: string
  searchPlaceholder?: string
  /** 새 인물 즉석 등록의 국가 기본값 */
  defaultCountryId?: string
  /** 새 인물 즉석 등록 노출 — 미지정이면 defaultCountryId가 있을 때만(기존 동작) */
  allowCreate?: boolean
  onCreatedPerson?: (person: PersonResponseDto) => void
  /** 연속 추가 — 골라도 닫히지 않고 방금 넣은 인물은 '추가됨'. 하단 '완료'로 닫는다 */
  multiSelect?: boolean
  /** 부모가 목록을 받는 중 */
  loading?: boolean
  /** 맨 위에 올릴 유력 후보 id(예: 반대편 부모 후보로 배우자) */
  pinnedIds?: string[]
  /** 고르는 자리의 맥락 — 기간·나라가 맞는 인물을 위로 묶는다 */
  context?: PersonPickerContext
}

const SORT_LABEL: Record<PersonSortKey, string> = {
  relevance: '관련순',
  name: '이름순',
  'birth-asc': '출생 빠른순',
  'birth-desc': '출생 늦은순',
}

type ListItem =
  | { kind: 'head'; key: string; label: string; count: number }
  | { kind: 'person'; key: string; person: PersonResponseDto; relevant: boolean }

export function PersonPickerModal({
  persons: givenPersons,
  selectedPersonId = '',
  onSelect,
  onClose,
  excludeIds,
  excludeReason,
  title,
  searchPlaceholder,
  defaultCountryId,
  allowCreate,
  onCreatedPerson,
  multiSelect = false,
  loading: givenLoading = false,
  pinnedIds,
  context,
}: PersonPickerModalProps) {
  const playClickSound = useClickSound()
  const { data: fetchedPersons = [], isLoading: fetching } = useQuery({
    queryKey: ['persons', 'all'],
    queryFn: getAllPersons,
    enabled: givenPersons === undefined,
    staleTime: 5 * 60_000,
  })
  const persons = givenPersons ?? fetchedPersons
  const loading = givenPersons === undefined ? fetching : givenLoading

  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<PersonSortKey>(context ? 'relevance' : 'name')
  const [countryFilter, setCountryFilter] = useState('')
  const [dynastyFilter, setDynastyFilter] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  /** 이번 세션에 추가한 인물(연속 추가) — 이름까지 들고 있어 아래 칩으로 보인다 */
  const [added, setAdded] = useState<Array<{ id: string; name: string }>>([])
  const [createMode, setCreateMode] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const canCreate = allowCreate ?? Boolean(defaultCountryId)
  const addedIds = useMemo(() => new Set(added.map((entry) => entry.id)), [added])
  const excludeSet = useMemo(() => new Set((excludeIds ?? []).filter(Boolean)), [excludeIds])

  /** 검색 대상 문자열 — 인물마다 한 번만 만든다(이름 양식 셋·원어·왕명·생몰년) */
  const haystacks = useMemo(() => new Map(persons.map((person) => [person.id, searchHaystack(person)])), [persons])

  /** 거르기 선택지 — 응답에 이름이 함께 와서 추가 요청 없이 만든다. 인원수 많은 순 */
  const filterOptions = useMemo(() => {
    const tally = (pick: (person: PersonResponseDto) => { id: string; name: string } | null) => {
      const counts = new Map<string, { id: string; name: string; count: number }>()
      for (const person of persons) {
        const option = pick(person)
        if (!option) continue
        const current = counts.get(option.id)
        counts.set(option.id, { ...option, count: (current?.count ?? 0) + 1 })
      }
      return [...counts.values()].sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, 'ko'))
    }
    return {
      countries: tally((person) =>
        person.countryId ? { id: person.countryId, name: person.country?.name ?? '이름 없는 나라' } : null,
      ),
      dynasties: tally((person) =>
        person.dynastyId ? { id: person.dynastyId, name: person.dynasty?.name ?? '이름 없는 왕조' } : null,
      ),
    }
  }, [persons])

  const visible = useMemo(() => {
    let list = persons.filter((person) => !excludeSet.has(person.id) || addedIds.has(person.id))
    if (query.trim()) list = list.filter((person) => matchesQuery(haystacks.get(person.id) ?? '', query))
    if (countryFilter) list = list.filter((person) => person.countryId === countryFilter)
    if (dynastyFilter) list = list.filter((person) => person.dynastyId === dynastyFilter)
    list = [...list].sort(comparePersons(sortKey, context))
    if (pinnedIds && pinnedIds.length > 0) {
      const pinned = new Set(pinnedIds)
      list = [...list.filter((person) => pinned.has(person.id)), ...list.filter((person) => !pinned.has(person.id))]
    }
    return list
  }, [persons, excludeSet, addedIds, query, haystacks, countryFilter, dynastyFilter, sortKey, context, pinnedIds])

  /**
   * 목록 — 관련순이면 '이 무렵·관련 나라'와 '그 밖'을 머리로 가른다. 머리는 화살표 이동에서 건너뛴다.
   */
  const items = useMemo<ListItem[]>(() => {
    const toItem = (person: PersonResponseDto, relevant: boolean): ListItem => ({
      kind: 'person',
      key: person.id,
      person,
      relevant,
    })
    if (!context || sortKey !== 'relevance') return visible.map((person) => toItem(person, false))
    const relevant = visible.filter((person) => contextScore(person, context) > 0)
    if (relevant.length === 0 || relevant.length === visible.length) {
      return visible.map((person) => toItem(person, relevant.length > 0))
    }
    const rest = visible.filter((person) => contextScore(person, context) === 0)
    return [
      { kind: 'head', key: 'head-relevant', label: context.label ?? '관련 인물', count: relevant.length },
      ...relevant.map((person) => toItem(person, true)),
      { kind: 'head', key: 'head-rest', label: '그 밖의 인물', count: rest.length },
      ...rest.map((person) => toItem(person, false)),
    ]
  }, [visible, context, sortKey])

  /** 화살표로 갈 수 있는 자리(인물 줄)만 */
  const personPositions = useMemo(
    () => items.flatMap((item, index) => (item.kind === 'person' ? [index] : [])),
    [items],
  )

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => viewportRef.current,
    estimateSize: (index) => (items[index]?.kind === 'head' ? 36 : 64),
    overscan: 8,
  })

  useEffect(() => setActiveIndex(0), [query, countryFilter, dynastyFilter, sortKey])
  useEffect(() => {
    const position = personPositions[activeIndex]
    if (position !== undefined) virtualizer.scrollToIndex(position, { align: 'auto' })
    // virtualizer는 안정 참조라 의존성에서 뺀다
  }, [activeIndex, personPositions])

  const choose = (person: PersonResponseDto) => {
    if (addedIds.has(person.id)) return
    const name = getPersonDisplayName(person)
    playClickSound()
    onSelect(person.id, name)
    if (multiSelect) setAdded((previous) => [...previous, { id: person.id, name }])
    else onClose()
  }

  const onSearchKey = (keyEvent: React.KeyboardEvent<HTMLInputElement>) => {
    if (keyEvent.key === 'ArrowDown') {
      keyEvent.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, personPositions.length - 1))
    } else if (keyEvent.key === 'ArrowUp') {
      keyEvent.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (keyEvent.key === 'Enter') {
      const item = items[personPositions[activeIndex]]
      if (item?.kind === 'person') {
        keyEvent.preventDefault()
        choose(item.person)
      }
    }
  }

  const filtersActive = Boolean(countryFilter || dynastyFilter || query)
  const resetFilters = () => {
    setQuery('')
    setCountryFilter('')
    setDynastyFilter('')
    searchRef.current?.focus()
  }

  const subtitle = loading
    ? '인물 목록을 불러오는 중…'
    : `${persons.length.toLocaleString()}명 중 고르기${excludeSet.size > 0 ? ` · 이미 걸린 ${excludeSet.size}명은 빠짐` : ''}`

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={createMode ? '새 인물 등록' : (title ?? '인물 선택')}
      subtitle={createMode ? '찾는 인물이 없을 때 — 뼈대만 바로 만듭니다' : subtitle}
      size="wide"
      maxWidth="760px"
      initialFocusRef={searchRef}
    >
      <S.Body>
        {createMode ? (
          <PersonPickerCreateForm
            initialName={query.trim()}
            defaultCountryId={defaultCountryId}
            onCancel={() => setCreateMode(false)}
            onCreated={(person, name) => {
              onCreatedPerson?.(person)
              onSelect(person.id, name)
              onClose()
            }}
          />
        ) : (
          <>
            <S.Toolbar>
              <S.SearchRow>
                <S.SearchBox>
                  <FiSearch size={18} aria-hidden />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(changeEvent) => setQuery(changeEvent.target.value)}
                    onKeyDown={onSearchKey}
                    placeholder={searchPlaceholder ?? '이름·원어 이름·생몰년으로 검색'}
                    aria-label="인물 검색"
                    aria-controls="person-picker-list"
                    aria-activedescendant={
                      personPositions[activeIndex] !== undefined
                        ? `person-picker-option-${(items[personPositions[activeIndex]] as { key: string }).key}`
                        : undefined
                    }
                  />
                  {query && (
                    <S.ClearButton type="button" onClick={() => setQuery('')} aria-label="검색어 지우기">
                      <FiX size={16} />
                    </S.ClearButton>
                  )}
                </S.SearchBox>
                {canCreate && (
                  <S.GhostButton type="button" onClick={() => setCreateMode(true)} title="목록에 없는 인물을 바로 등록">
                    <FiPlus size={15} aria-hidden />
                    새 인물
                  </S.GhostButton>
                )}
              </S.SearchRow>
              <S.FilterRow>
                {filterOptions.countries.length > 1 && (
                  <S.FilterSelect
                    value={countryFilter}
                    $active={Boolean(countryFilter)}
                    onChange={(changeEvent) => setCountryFilter(changeEvent.target.value)}
                    aria-label="국가로 거르기"
                  >
                    <option value="">모든 국가</option>
                    {filterOptions.countries.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name} ({option.count})
                      </option>
                    ))}
                  </S.FilterSelect>
                )}
                {filterOptions.dynasties.length > 0 && (
                  <S.FilterSelect
                    value={dynastyFilter}
                    $active={Boolean(dynastyFilter)}
                    onChange={(changeEvent) => setDynastyFilter(changeEvent.target.value)}
                    aria-label="왕조로 거르기"
                  >
                    <option value="">모든 왕조</option>
                    {filterOptions.dynasties.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name} ({option.count})
                      </option>
                    ))}
                  </S.FilterSelect>
                )}
                <S.FilterSelect
                  value={sortKey}
                  onChange={(changeEvent) => setSortKey(changeEvent.target.value as PersonSortKey)}
                  aria-label="정렬"
                >
                  {(Object.keys(SORT_LABEL) as PersonSortKey[])
                    .filter((key) => key !== 'relevance' || context)
                    .map((key) => (
                      <option key={key} value={key}>
                        {SORT_LABEL[key]}
                      </option>
                    ))}
                </S.FilterSelect>
                <S.FilterSpacer />
                <S.ResultCount aria-live="polite">
                  <strong>{visible.length.toLocaleString()}</strong>명
                </S.ResultCount>
                {filtersActive && (
                  <S.TextButton type="button" onClick={resetFilters}>
                    초기화
                  </S.TextButton>
                )}
              </S.FilterRow>
            </S.Toolbar>

            <S.ListViewport ref={viewportRef} id="person-picker-list" role="listbox" aria-label="인물 후보">
              {loading && persons.length === 0 ? (
                <S.Empty>인물 목록을 불러오는 중…</S.Empty>
              ) : items.length === 0 ? (
                <S.Empty>
                  <strong>{query ? `'${query}'에 맞는 인물이 없습니다` : '고를 인물이 없습니다'}</strong>
                  {excludeSet.size > 0 && excludeReason && <span>{excludeReason}</span>}
                  {filtersActive && (
                    <S.TextButton type="button" onClick={resetFilters}>
                      거르기 풀기
                    </S.TextButton>
                  )}
                  {canCreate && (
                    <S.PrimaryButton type="button" onClick={() => setCreateMode(true)}>
                      <FiPlus size={15} aria-hidden />
                      {query ? `'${query.trim()}' 새로 등록` : '새 인물 등록'}
                    </S.PrimaryButton>
                  )}
                </S.Empty>
              ) : (
                <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                  {virtualizer.getVirtualItems().map((virtualRow) => {
                    const item = items[virtualRow.index]
                    return (
                      <div
                        key={item.key}
                        data-index={virtualRow.index}
                        ref={virtualizer.measureElement}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(${virtualRow.start}px)` }}
                      >
                        {item.kind === 'head' ? (
                          <S.SectionHead role="presentation">
                            {item.label}
                            <span>{item.count}</span>
                          </S.SectionHead>
                        ) : (
                          <PersonOption
                            person={item.person}
                            query={query}
                            active={personPositions[activeIndex] === virtualRow.index}
                            selected={selectedPersonId === item.person.id}
                            added={addedIds.has(item.person.id)}
                            pinned={Boolean(pinnedIds?.includes(item.person.id))}
                            onChoose={() => choose(item.person)}
                            onHover={() => setActiveIndex(personPositions.indexOf(virtualRow.index))}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </S.ListViewport>

            <S.Footer>
              {multiSelect && added.length > 0 ? (
                <S.AddedTray aria-live="polite">
                  {added.length}명 추가
                  {added.map((entry) => (
                    <S.AddedChip key={entry.id}>{entry.name}</S.AddedChip>
                  ))}
                </S.AddedTray>
              ) : (
                <S.KeyHints aria-hidden>
                  <kbd>↑</kbd>
                  <kbd>↓</kbd> 이동 · <kbd>Enter</kbd> {multiSelect ? '추가' : '선택'} · <kbd>Esc</kbd> 닫기
                </S.KeyHints>
              )}
              <S.FilterSpacer />
              {multiSelect ? (
                <S.PrimaryButton type="button" onClick={onClose}>
                  완료
                </S.PrimaryButton>
              ) : (
                <S.GhostButton type="button" onClick={onClose}>
                  취소
                </S.GhostButton>
              )}
            </S.Footer>
          </>
        )}
      </S.Body>
    </Modal>
  )
}

/** 검색어 강조 — 이름 안의 첫 낱말 일치 */
function highlight(text: string, query: string): ReactNode {
  const word = query.trim().split(/\s+/)[0]
  if (!word) return text
  const at = text.toLowerCase().indexOf(word.toLowerCase())
  if (at < 0) return text
  return (
    <>
      {text.slice(0, at)}
      <mark>{text.slice(at, at + word.length)}</mark>
      {text.slice(at + word.length)}
    </>
  )
}

function PersonOption({
  person,
  query,
  active,
  selected,
  added,
  pinned,
  onChoose,
  onHover,
}: {
  person: PersonResponseDto
  query: string
  active: boolean
  selected: boolean
  added: boolean
  pinned: boolean
  onChoose: () => void
  onHover: () => void
}) {
  const name = getPersonDisplayName(person)
  const years = lifeSpanLabel(person)
  const office = headlineOffice(person)
  const country = person.country?.name
  const flag = (person.country as { flagEmoji?: string | null } | null)?.flagEmoji
  const image = person.profileImageUrl ? getUploadImageUrl(person.profileImageUrl) || person.profileImageUrl : null
  return (
    <S.Row
      type="button"
      id={`person-picker-option-${person.id}`}
      role="option"
      aria-selected={selected || added}
      aria-disabled={added || undefined}
      tabIndex={-1}
      $active={active}
      $selected={selected}
      $added={added}
      onClick={onChoose}
      onMouseMove={active ? undefined : onHover}
    >
      <S.Avatar $hasImage={Boolean(image)} aria-hidden>
        {image ? <img src={image} alt="" loading="lazy" /> : name.charAt(0)}
      </S.Avatar>
      <S.RowMain>
        <S.NameLine>
          <span>{highlight(name, query)}</span>
          {person.originalName && <S.OriginalName>{person.originalName}</S.OriginalName>}
        </S.NameLine>
        <S.MetaLine>
          {years && <span className="years">{years}</span>}
          {country && (
            <span>
              {flag ? `${flag} ` : ''}
              {country}
            </span>
          )}
          {office && <span className="office">{office}</span>}
        </S.MetaLine>
      </S.RowMain>
      {added ? (
        <S.RowState $tone="muted">추가됨</S.RowState>
      ) : selected ? (
        <S.RowState $tone="primary">선택됨</S.RowState>
      ) : pinned ? (
        <S.RowState $tone="context">유력 후보</S.RowState>
      ) : active ? (
        <S.RowState $tone="primary">Enter</S.RowState>
      ) : null}
    </S.Row>
  )
}
