import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { FaChessKing, FaStar } from 'react-icons/fa'
import {
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiSearch,
  FiStar,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import { usePersonsInfographic } from '@/entities/person/api'
import { getUploadImageUrl } from '@/shared/api/upload'
import { HighlightedText } from '@/shared/ui/highlighted-text'
import {
  formatYear,
  useAdaptedPersons,
  usePersonInfographicFilterStore,
  type AdaptedPerson,
} from '@/widgets/person-infographic'
import { useRecentPersonsStore } from '@/widgets/person/person-list/model/recent-persons.store'

export interface PersonTopSearchBarProps {
  currentPersonId: string
  onSelectPerson: (personId: string) => void
}

type ContextFilterMode = 'all' | 'faction' | 'country' | 'era'

interface DisplaySection {
  id: string
  title: string
  icon?: React.ReactNode
  items: AdaptedPerson[]
}

function lifespanText(person: AdaptedPerson): string {
  const birth = person.birthYear != null ? formatYear(person.birthYear) : null
  const death =
    person.deathYear != null
      ? formatYear(person.deathYear)
      : person.isAlive
        ? '현재'
        : null
  if (birth && death) return `${birth}~${death}`
  if (birth) return `${birth}~`
  if (death) return `~${death}`
  if (person.reignStartYear != null) {
    const end =
      person.reignEndYear != null ? formatYear(person.reignEndYear) : ''
    return `재위 ${formatYear(person.reignStartYear)}~${end}`
  }
  return '연도 미상'
}

export function PersonTopSearchBar({
  currentPersonId,
  onSelectPerson,
}: PersonTopSearchBarProps) {
  usePersonsInfographic()
  const allPersons = useAdaptedPersons()

  const pinnedList = usePersonInfographicFilterStore((state) => state.pinned)
  const togglePin = usePersonInfographicFilterStore((state) => state.togglePin)
  const recentIds = useRecentPersonsStore((state) => state.recentIds)

  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [contextFilter, setContextFilter] = useState<ContextFilterMode>('all')
  const [activeIndex, setActiveIndex] = useState<number>(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const pinnedSet = useMemo(() => new Set(pinnedList), [pinnedList])

  const personsById = useMemo(() => {
    const map = new Map<string, AdaptedPerson>()
    for (const p of allPersons) map.set(p.id, p)
    return map
  }, [allPersons])

  const currentPerson = useMemo(
    () => personsById.get(currentPersonId) ?? null,
    [personsById, currentPersonId],
  )

  // 인물 전환 시 컨텍스트 필터가 더 이상 유효하지 않으면 'all'로 리셋
  useEffect(() => {
    setContextFilter('all')
    setActiveIndex(0)
  }, [currentPersonId])

  const factionPeers = useMemo(() => {
    if (!currentPerson?.faction) return []
    return allPersons
      .filter((p) => p.faction === currentPerson.faction)
      .sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999))
  }, [allPersons, currentPerson])

  const countryPeers = useMemo(() => {
    if (!currentPerson?.country || currentPerson.country === '미상') return []
    return allPersons
      .filter((p) => p.country === currentPerson.country)
      .sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999))
  }, [allPersons, currentPerson])

  const eraPeers = useMemo(() => {
    if (!currentPerson?.era) return []
    return allPersons
      .filter((p) => p.era.key === currentPerson.era.key)
      .sort((a, b) => (b.influence ?? 0) - (a.influence ?? 0))
  }, [allPersons, currentPerson])

  // 이전/다음 인물 스테퍼 기준 목록: 같은 왕조(2명 이상) → 같은 국가(2명 이상) → 같은 시대(2명 이상)
  const stepperContext = useMemo(() => {
    if (factionPeers.length > 1 && currentPerson?.faction) {
      return {
        mode: 'faction' as ContextFilterMode,
        label: currentPerson.faction,
        list: factionPeers,
      }
    }
    if (countryPeers.length > 1 && currentPerson?.country) {
      return {
        mode: 'country' as ContextFilterMode,
        label: currentPerson.country,
        list: countryPeers,
      }
    }
    if (eraPeers.length > 1 && currentPerson?.era) {
      return {
        mode: 'era' as ContextFilterMode,
        label: currentPerson.era.lbl,
        list: eraPeers,
      }
    }
    return null
  }, [factionPeers, countryPeers, eraPeers, currentPerson])

  const stepperIndex = useMemo(() => {
    if (!stepperContext) return -1
    return stepperContext.list.findIndex((p) => p.id === currentPersonId)
  }, [stepperContext, currentPersonId])

  const prevPerson =
    stepperContext && stepperIndex > 0
      ? stepperContext.list[stepperIndex - 1]
      : null
  const nextPerson =
    stepperContext &&
    stepperIndex >= 0 &&
    stepperIndex < stepperContext.list.length - 1
      ? stepperContext.list[stepperIndex + 1]
      : null

  const trimmedQuery = query.trim()
  const lowerQuery = trimmedQuery.toLowerCase()

  const { sections, flatItems, totalMatchCount } = useMemo(() => {
    // 1. 검색어가 없고 컨텍스트 필터도 'all'인 경우: 고정 + 최근 + 맥락 동료 인물
    if (!lowerQuery && contextFilter === 'all') {
      const builtSections: DisplaySection[] = []
      const pinnedItems = pinnedList
        .map((id) => personsById.get(id))
        .filter((p): p is AdaptedPerson => !!p && p.id !== currentPersonId)
      if (pinnedItems.length > 0) {
        builtSections.push({
          id: 'pinned',
          title: '고정 인물',
          icon: <FiStar size={11} />,
          items: pinnedItems.slice(0, 6),
        })
      }

      const recentItems = recentIds
        .filter((id) => id !== currentPersonId && !pinnedSet.has(id))
        .map((id) => personsById.get(id))
        .filter((p): p is AdaptedPerson => !!p)
        .slice(0, 6)
      if (recentItems.length > 0) {
        builtSections.push({
          id: 'recent',
          title: '최근 본 인물',
          icon: <FiClock size={11} />,
          items: recentItems,
        })
      }

      const peerSource = stepperContext
        ? stepperContext.list.filter((p) => p.id !== currentPersonId)
        : [...allPersons]
            .filter((p) => p.id !== currentPersonId)
            .sort((a, b) => (b.influence ?? 0) - (a.influence ?? 0))
      const peerTitle = stepperContext
        ? `${stepperContext.label} 인물`
        : '주요 인물'
      if (peerSource.length > 0) {
        builtSections.push({
          id: 'peers',
          title: peerTitle,
          icon: <FiUsers size={11} />,
          items: peerSource.slice(0, 12),
        })
      }

      const flat: AdaptedPerson[] = []
      for (const sec of builtSections) {
        for (const item of sec.items) flat.push(item)
      }
      return {
        sections: builtSections,
        flatItems: flat,
        totalMatchCount: allPersons.length,
      }
    }

    // 2. 검색어 또는 컨텍스트 칩이 활성화된 경우
    let pool = allPersons
    if (contextFilter === 'faction' && currentPerson?.faction) {
      pool = pool.filter((p) => p.faction === currentPerson.faction)
    } else if (contextFilter === 'country' && currentPerson?.country) {
      pool = pool.filter((p) => p.country === currentPerson.country)
    } else if (contextFilter === 'era' && currentPerson?.era) {
      pool = pool.filter((p) => p.era.key === currentPerson.era.key)
    }

    if (lowerQuery) {
      pool = pool.filter((p) => p.searchText.includes(lowerQuery))
    }

    const sorted = [...pool].sort((a, b) => {
      if (lowerQuery) {
        const aExact = a.name.toLowerCase() === lowerQuery ? 1 : 0
        const bExact = b.name.toLowerCase() === lowerQuery ? 1 : 0
        if (aExact !== bExact) return bExact - aExact
        const aStarts = a.name.toLowerCase().startsWith(lowerQuery) ? 1 : 0
        const bStarts = b.name.toLowerCase().startsWith(lowerQuery) ? 1 : 0
        if (aStarts !== bStarts) return bStarts - aStarts
      }
      if (contextFilter === 'faction' || contextFilter === 'country') {
        return (a.year ?? 9999) - (b.year ?? 9999)
      }
      return (b.influence ?? 0) - (a.influence ?? 0)
    })

    const sliced = sorted.slice(0, 40)
    const sectionTitle =
      contextFilter === 'faction' && currentPerson?.faction
        ? `같은 왕조 · ${currentPerson.faction} (${sorted.length}명)`
        : contextFilter === 'country' && currentPerson?.country
          ? `같은 국가 · ${currentPerson.country} (${sorted.length}명)`
          : contextFilter === 'era' && currentPerson?.era
            ? `같은 시대 · ${currentPerson.era.lbl} (${sorted.length}명)`
            : `검색 결과 (${sorted.length}명)`

    return {
      sections:
        sliced.length > 0
          ? [{ id: 'results', title: sectionTitle, items: sliced }]
          : [],
      flatItems: sliced,
      totalMatchCount: sorted.length,
    }
  }, [
    lowerQuery,
    contextFilter,
    pinnedList,
    recentIds,
    pinnedSet,
    personsById,
    currentPersonId,
    currentPerson,
    stepperContext,
    allPersons,
  ])

  useEffect(() => {
    setActiveIndex(0)
  }, [lowerQuery, contextFilter])

  // 전역 '/' 또는 Cmd/Ctrl+K 단축키로 상단 검색창 포커스
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      const isCmdK =
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === 'k' &&
        !event.altKey
      const isSlash =
        event.key === '/' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey

      if ((!isCmdK && !isSlash) || event.defaultPrevented) return

      const target = event.target as HTMLElement | null
      if (
        isSlash &&
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }
      if (document.querySelector('[role="dialog"], [aria-modal="true"]')) {
        return
      }
      const input = inputRef.current
      if (!input || input.closest('[aria-hidden="true"]')) return
      event.preventDefault()
      setIsOpen(true)
      input.focus()
      input.select()
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isOpen])

  const handleSelect = useCallback(
    (personId: string) => {
      setIsOpen(false)
      setQuery('')
      onSelectPerson(personId)
    },
    [onSelectPerson],
  )

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
        return
      }
      if (flatItems.length === 0) return
      const next = (activeIndex + 1) % flatItems.length
      setActiveIndex(next)
      listRef.current
        ?.querySelector<HTMLElement>(`[data-search-idx="${next}"]`)
        ?.scrollIntoView({ block: 'nearest' })
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!isOpen || flatItems.length === 0) return
      const prev = (activeIndex - 1 + flatItems.length) % flatItems.length
      setActiveIndex(prev)
      listRef.current
        ?.querySelector<HTMLElement>(`[data-search-idx="${prev}"]`)
        ?.scrollIntoView({ block: 'nearest' })
    } else if (event.key === 'Enter') {
      if (!isOpen || flatItems.length === 0) return
      event.preventDefault()
      const target = flatItems[activeIndex] ?? flatItems[0]
      if (target) handleSelect(target.id)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      if (query) {
        setQuery('')
      } else {
        setIsOpen(false)
        event.currentTarget.blur()
      }
    }
  }

  let runningIdx = 0

  return (
    <BarRoot ref={containerRef}>
      <SearchFieldWrap $focused={isOpen}>
        <SearchIcon aria-hidden>
          <FiSearch size={14} />
        </SearchIcon>
        <SearchInput
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={isOpen}
          aria-label="인물 빠른 검색"
          placeholder="인물 검색 (이름·국가·왕조·직함·분야)..."
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            if (!isOpen) setIsOpen(true)
          }}
          onKeyDown={handleInputKeyDown}
        />
        {query ? (
          <ClearBtn
            type="button"
            aria-label="검색어 지우기"
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
          >
            <FiX size={13} />
          </ClearBtn>
        ) : (
          <ShortcutKbd aria-hidden title="단축키 / 또는 ⌘K">
            /
          </ShortcutKbd>
        )}
      </SearchFieldWrap>

      {stepperContext && stepperIndex >= 0 && (
        <StepperGroup role="group" aria-label={`${stepperContext.label} 인물 이동`}>
          <StepperNavBtn
            type="button"
            aria-label="이전 인물"
            disabled={!prevPerson}
            title={
              prevPerson
                ? `이전 (${stepperContext.label}): ${prevPerson.name}`
                : '첫 번째 인물입니다'
            }
            onClick={() => prevPerson && onSelectPerson(prevPerson.id)}
          >
            <FiChevronLeft size={14} />
          </StepperNavBtn>
          <StepperCountBtn
            type="button"
            title={`${stepperContext.label} 인물 목록 보기 (${stepperIndex + 1}/${stepperContext.list.length})`}
            onClick={() => {
              setContextFilter(stepperContext.mode)
              setIsOpen(true)
              inputRef.current?.focus()
            }}
          >
            <StepperContextName>{stepperContext.label}</StepperContextName>
            <StepperFraction>
              {stepperIndex + 1}/{stepperContext.list.length}
            </StepperFraction>
          </StepperCountBtn>
          <StepperNavBtn
            type="button"
            aria-label="다음 인물"
            disabled={!nextPerson}
            title={
              nextPerson
                ? `다음 (${stepperContext.label}): ${nextPerson.name}`
                : '마지막 인물입니다'
            }
            onClick={() => nextPerson && onSelectPerson(nextPerson.id)}
          >
            <FiChevronRight size={14} />
          </StepperNavBtn>
        </StepperGroup>
      )}

      {isOpen && (
        <Popover role="listbox" aria-label="인물 검색 결과">
          {currentPerson && (
            <ContextChipBar>
              <ContextChip
                type="button"
                $active={contextFilter === 'all'}
                aria-pressed={contextFilter === 'all'}
                onClick={() => setContextFilter('all')}
              >
                전체 ({allPersons.length})
              </ContextChip>
              {currentPerson.faction && factionPeers.length > 1 && (
                <ContextChip
                  type="button"
                  $active={contextFilter === 'faction'}
                  aria-pressed={contextFilter === 'faction'}
                  onClick={() =>
                    setContextFilter(
                      contextFilter === 'faction' ? 'all' : 'faction',
                    )
                  }
                >
                  같은 왕조: {currentPerson.faction} ({factionPeers.length})
                </ContextChip>
              )}
              {currentPerson.country &&
                currentPerson.country !== '미상' &&
                countryPeers.length > 1 && (
                  <ContextChip
                    type="button"
                    $active={contextFilter === 'country'}
                    aria-pressed={contextFilter === 'country'}
                    onClick={() =>
                      setContextFilter(
                        contextFilter === 'country' ? 'all' : 'country',
                      )
                    }
                  >
                    같은 국가: {currentPerson.country} ({countryPeers.length})
                  </ContextChip>
                )}
              {currentPerson.era && eraPeers.length > 1 && (
                <ContextChip
                  type="button"
                  $active={contextFilter === 'era'}
                  aria-pressed={contextFilter === 'era'}
                  onClick={() =>
                    setContextFilter(contextFilter === 'era' ? 'all' : 'era')
                  }
                >
                  같은 시대: {currentPerson.era.lbl} ({eraPeers.length})
                </ContextChip>
              )}
            </ContextChipBar>
          )}

          <ResultsScroll ref={listRef}>
            {sections.length === 0 ? (
              <EmptyState>
                조건에 맞는 인물이 없습니다.
                {(query || contextFilter !== 'all') && (
                  <ResetLink
                    type="button"
                    onClick={() => {
                      setQuery('')
                      setContextFilter('all')
                    }}
                  >
                    검색·필터 초기화
                  </ResetLink>
                )}
              </EmptyState>
            ) : (
              sections.map((section) => (
                <SectionBlock key={section.id}>
                  <SectionHeader>
                    {section.icon}
                    <span>{section.title}</span>
                  </SectionHeader>
                  {section.items.map((person) => {
                    const itemIdx = runningIdx++
                    const isActive = itemIdx === activeIndex
                    const isCurrent = person.id === currentPersonId
                    const isPinned = pinnedSet.has(person.id)
                    const thumbSrc = person.profileImageUrl
                      ? getUploadImageUrl(person.profileImageUrl) ||
                        person.profileImageUrl
                      : null

                    return (
                      <ResultRow
                        key={`${section.id}-${person.id}`}
                        data-search-idx={itemIdx}
                        role="option"
                        aria-selected={isActive}
                        $active={isActive}
                        $current={isCurrent}
                        onMouseEnter={() => setActiveIndex(itemIdx)}
                        onClick={() => handleSelect(person.id)}
                      >
                        <AvatarThumb>
                          {thumbSrc ? (
                            <img src={thumbSrc} alt="" loading="lazy" />
                          ) : (
                            <span>{person.name.slice(0, 1)}</span>
                          )}
                        </AvatarThumb>
                        <RowMain>
                          <RowTitleLine>
                            <RowName>
                              <HighlightedText
                                text={person.name}
                                query={trimmedQuery}
                              />
                            </RowName>
                            {(person.isMonarch || person.isHeadOfState) && (
                              <RoleBadge
                                $monarch={person.isMonarch}
                                title={person.isMonarch ? '군주' : '국가원수'}
                              >
                                {person.isMonarch ? (
                                  <FaChessKing size={9} />
                                ) : (
                                  <FaStar size={9} />
                                )}
                              </RoleBadge>
                            )}
                            {isCurrent && <CurrentTag>현재 열람</CurrentTag>}
                          </RowTitleLine>
                          <RowMetaLine>
                            <span>
                              <HighlightedText
                                text={person.country}
                                query={trimmedQuery}
                              />
                            </span>
                            <MetaDot>·</MetaDot>
                            <span>{lifespanText(person)}</span>
                            {person.primaryTitle && (
                              <>
                                <MetaDot>·</MetaDot>
                                <span>
                                  <HighlightedText
                                    text={person.primaryTitle}
                                    query={trimmedQuery}
                                  />
                                </span>
                              </>
                            )}
                            {person.faction &&
                              person.faction !== person.primaryTitle && (
                                <>
                                  <MetaDot>·</MetaDot>
                                  <span>
                                    <HighlightedText
                                      text={person.faction}
                                      query={trimmedQuery}
                                    />
                                  </span>
                                </>
                              )}
                          </RowMetaLine>
                        </RowMain>
                        <RowRight>
                          {person.influence > 0 && (
                            <InfluenceBadge title={`영향력 ${person.influence}`}>
                              {person.influence}
                            </InfluenceBadge>
                          )}
                          <PinBtn
                            type="button"
                            $pinned={isPinned}
                            aria-label={isPinned ? '고정 해제' : '상단 고정'}
                            title={isPinned ? '고정 해제' : '상단 고정'}
                            onClick={(e) => {
                              e.stopPropagation()
                              togglePin(person.id)
                            }}
                          >
                            <FiStar size={12} />
                          </PinBtn>
                        </RowRight>
                      </ResultRow>
                    )
                  })}
                </SectionBlock>
              ))
            )}
          </ResultsScroll>

          <PopoverFooter>
            <span>
              <kbd>↑</kbd> <kbd>↓</kbd> 이동 · <kbd>Enter</kbd> 선택 ·{' '}
              <kbd>Esc</kbd> 닫기
            </span>
            {totalMatchCount > 40 && (
              <span>상위 40명 표시 (전체 {totalMatchCount}명)</span>
            )}
          </PopoverFooter>
        </Popover>
      )}
    </BarRoot>
  )
}

const BarRoot = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-width: 560px;
  min-width: 180px;
`

const SearchFieldWrap = styled.div<{ $focused: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  height: 36px;
  padding: 0 10px 0 32px;
  border-radius: 10px;
  border: 1px solid
    ${({ theme, $focused }) =>
      $focused
        ? '#6366f1'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.12)'
          : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc'};
  box-shadow: ${({ $focused }) =>
    $focused ? '0 0 0 3px rgba(99, 102, 241, 0.14)' : 'none'};
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background 0.15s ease;
`

const SearchIcon = styled.span`
  position: absolute;
  left: 10px;
  display: inline-flex;
  align-items: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  pointer-events: none;
`

const SearchInput = styled.input`
  width: 100%;
  min-width: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  outline: none;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &::-webkit-search-cancel-button {
    display: none;
  }
`

const ClearBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.background.tertiary};
  }
`

const ShortcutKbd = styled.kbd`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 18px;
  min-width: 18px;
  padding: 0 5px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1;
  user-select: none;
`

const StepperGroup = styled.div`
  display: inline-flex;
  align-items: center;
  height: 36px;
  border-radius: 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#ffffff'};
  overflow: hidden;
  flex-shrink: 0;

  @media (max-width: 768px) {
    display: none;
  }
`

const StepperNavBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 100%;
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition:
    background 0.12s ease,
    color 0.12s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
`

const StepperCountBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 100%;
  padding: 0 8px;
  border: none;
  border-left: 1px solid ${({ theme }) => theme.colors.border.light};
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const StepperContextName = styled.span`
  max-width: 96px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const StepperFraction = styled.span`
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 700;
`

const Popover = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  width: min(520px, calc(100vw - 32px));
  max-height: 440px;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.14)' : '#cbd5e1'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#1e293b' : '#ffffff'};
  box-shadow: 0 18px 40px -12px rgba(15, 23, 42, 0.28);
  z-index: 60;
  overflow: hidden;
`

const ContextChipBar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc'};
`

const ContextChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? '#6366f1' : theme.colors.border.default};
  background: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.22)'
        : 'rgba(99, 102, 241, 0.1)'
      : theme.colors.background.primary};
  color: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? '#c7d2fe'
        : '#4338ca'
      : theme.colors.text.secondary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.12s ease;

  &:hover {
    border-color: #6366f1;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#4338ca')};
  }
`

const ResultsScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 6px;
`

const SectionBlock = styled.div`
  & + & {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  }
`

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ResultRow = styled.div<{ $active: boolean; $current: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 8px;
  border-radius: 9px;
  cursor: pointer;
  background: ${({ theme, $active, $current }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.18)'
        : 'rgba(99, 102, 241, 0.08)'
      : $current
        ? theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.04)'
          : '#f8fafc'
        : 'transparent'};
`

const AvatarThumb = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 999px;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.background.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 700;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const RowMain = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const RowTitleLine = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

const RowName = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const RoleBadge = styled.span<{ $monarch: boolean }>`
  display: inline-flex;
  align-items: center;
  color: ${({ $monarch }) => ($monarch ? '#b45309' : '#1d4ed8')};
  flex-shrink: 0;
`

const CurrentTag = styled.span`
  font-size: 10.5px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.14);
  color: #6366f1;
  flex-shrink: 0;
`

const RowMetaLine = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const MetaDot = styled.span`
  opacity: 0.55;
`

const RowRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`

const InfluenceBadge = styled.span`
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  padding: 2px 6px;
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.background.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const PinBtn = styled.button<{ $pinned: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme, $pinned }) =>
    $pinned ? '#eab308' : theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme, $pinned }) =>
      $pinned ? '#ca8a04' : theme.colors.text.primary};
  }
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 28px 16px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ResetLink = styled.button`
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
`

const PopoverFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc'};
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};

  kbd {
    padding: 1px 4px;
    border-radius: 3px;
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    background: ${({ theme }) => theme.colors.background.primary};
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
  }
`
