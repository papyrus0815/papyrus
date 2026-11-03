/**
 * 등록 모달 — **세부 분야** 칸. 분야 바로 아래, '분야 › 세부'의 2단계(선택).
 *
 * 분야가 '무엇에 관한 일인가'라면 세부는 '어떤 꼴의 일인가'다(entities/event/model/event-type-registry.ts).
 * 그 분야에서 쓰이는 세부를 앞에 보이고 나머지는 '다른 세부 더 보기'에 의미군별로 묶어 둔다 — 저장은
 * 독립 축이라 군사 › 조약, 경제 › 법령처럼 무엇이든 고를 수 있다. 분야를 고르기 전에도 자주 쓰는
 * 세부를 먼저 고르면 어울리는 분야가 함께 선택된다. 다시 누르면 해제된다.
 */
import React, { useEffect, useRef, useState } from 'react'

import styled from 'styled-components'

import {
  EVENT_DOMAINS,
  domainLabel,
  eventDomainDef,
  isEventDomainKey,
} from '@/entities/event/model/event-domain'
import {
  EVENT_TYPE_GROUPS,
  EVENT_TYPE_ORDER,
  EVENT_TYPES,
  type EventTypeKey,
  FACET_LABEL,
  FREQUENT_EVENT_TYPES,
  type RecentClassificationCombo,
  formatDomainPath,
  groupSubtypes,
  readRecentClassifications,
  searchClassifications,
  subtypesForDomain,
  suggestClassificationFromTitle,
} from '@/entities/event/model/event-type-registry'
import type { EventDomainKey } from '@/entities/event/model/event-domain'
import {
  KitChipGroup,
  KitChoiceChip,
  KitGroupLabel,
} from '@/shared/ui/register-form-kit/register-form-kit'

export interface EventTypeFieldProps {
  /** 고른 분야 키(MILITARY…) — 앞에 보일 세부를 정한다. 없으면 자주 쓰는 세부 + 전체 보기 */
  domain: string | null
  value: EventTypeKey | null
  onChange: (next: EventTypeKey | null) => void
  /** 편집 모드 여부 — 편집 모드는 하단 '기록' 섹션을 렌더하지 않으므로 안내 문구를 달리한다 */
  isEditMode?: boolean
  /** 사건명 — 끝말·핵심어로 분야·세부를 추론해 원클릭 추천 배지를 띄운다 */
  eventTitle?: string
  /** 사건명 추천·빠른 검색·최근 조합으로 분야와 세부를 한 번에 적용 */
  onApplySuggestion?: (suggestion: { domain: EventDomainKey; type: EventTypeKey | null }) => void
  /** 상위 사건 아래에 하위 사건을 등록하는 중인지 — 단일 국면(전투 등)을 묶음(전쟁 등)보다 앞에 둔다 */
  hasParent?: boolean
  /** 최근 사용한 '분야 › 세부' 조합(생략 시 localStorage에서 읽음) */
  recentCombos?: ReadonlyArray<RecentClassificationCombo>
}

export function EventTypeField({
  domain,
  value,
  onChange,
  isEditMode = false,
  eventTitle,
  onApplySuggestion,
  hasParent = false,
  recentCombos,
}: EventTypeFieldProps) {
  const { primary, rest } = subtypesForDomain(domain, { hasParent })
  const [showRest, setShowRest] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [storedRecents] = useState<RecentClassificationCombo[]>(() => readRecentClassifications())
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([])

  const effectiveRecents = recentCombos ?? storedRecents
  const searchMatches = searchQuery.trim() ? searchClassifications(searchQuery, domain) : []

  /* 분야가 바뀌면 펼쳐 둔 '더 보기'를 접는다 */
  useEffect(() => {
    setShowRest(false)
  }, [domain])

  const selected = value ? EVENT_TYPES[value] : null
  const records = selected ? selected.core.filter((facet) => facet !== 'participants') : []
  const activeDomainDef = eventDomainDef(domain)
  const activeDomainTone = activeDomainDef?.soft

  const rawSuggestion = suggestClassificationFromTitle(eventTitle)
  const effectiveSuggestedDomain =
    rawSuggestion && domain && isEventDomainKey(domain) && primary.includes(rawSuggestion.type)
      ? domain
      : rawSuggestion?.domain

  const frequentList = hasParent
    ? [
        ...FREQUENT_EVENT_TYPES.filter((type) => !EVENT_TYPES[type].usuallyCollection),
        ...FREQUENT_EVENT_TYPES.filter((type) => EVENT_TYPES[type].usuallyCollection),
      ]
    : FREQUENT_EVENT_TYPES

  const isNoDomain = !domain
  const isOtherDomain = domain === 'OTHER'
  const lockedInRest = value !== null && (isNoDomain ? !frequentList.includes(value) : rest.includes(value))
  const expanded = showRest || lockedInRest

  /* 현재 화면에 그려지는 칩 순서 — 방향키 이동과 탭 정지점(roving tabIndex)의 기준 */
  const visibleTypes: EventTypeKey[] = isNoDomain
    ? expanded
      ? EVENT_TYPE_GROUPS.flatMap((group) => group.types)
      : frequentList
    : isOtherDomain
      ? EVENT_TYPE_GROUPS.flatMap((group) => group.types)
      : expanded
        ? [...primary, ...groupSubtypes(rest).flatMap((group) => group.types)]
        : primary

  const applyCombo = (combo: { domain: EventDomainKey; type: EventTypeKey | null }) => {
    if (onApplySuggestion) {
      onApplySuggestion(combo)
    } else {
      onChange(combo.type)
    }
  }

  const selectedIndex = value ? visibleTypes.indexOf(value) : -1
  const tabStop = selectedIndex >= 0 ? selectedIndex : 0

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const current = buttonsRef.current.findIndex((button) => button === document.activeElement)
    if (current < 0 || visibleTypes.length === 0) return
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      const next = (current + 1) % visibleTypes.length
      buttonsRef.current[next]?.focus()
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      const prev = (current - 1 + visibleTypes.length) % visibleTypes.length
      buttonsRef.current[prev]?.focus()
    }
  }

  let runningIndex = 0
  const chip = (type: EventTypeKey) => {
    const index = runningIndex
    runningIndex += 1
    const isSelected = value === type
    const def = EVENT_TYPES[type]
    const chipTone = isNoDomain ? EVENT_DOMAINS[def.defaultDomain].soft : undefined
    return (
      <KitChoiceChip
        key={type}
        ref={(element) => {
          buttonsRef.current[index] = element
        }}
        type="button"
        role="radio"
        aria-label={def.label}
        aria-checked={isSelected}
        tabIndex={index === tabStop ? 0 : -1}
        $selected={isSelected}
        style={
          chipTone
            ? ({
                '--chip-rgb': chipTone.rgb,
                '--chip-text': chipTone.text,
                '--chip-text-dark': chipTone.textDark,
              } as React.CSSProperties)
            : undefined
        }
        title={
          isNoDomain
            ? `${domainLabel(def.defaultDomain)} › ${def.label} — ${def.examples}`
            : def.examples
        }
        onClick={() => onChange(isSelected ? null : type)}
      >
        <span>{def.label}</span>
        {isNoDomain && <DomainBadge aria-hidden="true">{domainLabel(def.defaultDomain)}</DomainBadge>}
      </KitChoiceChip>
    )
  }

  const groupLabel = domain ? `${domainLabel(domain)}의 세부 분야` : '세부 분야'

  const showSuggestion = Boolean(rawSuggestion && effectiveSuggestedDomain && value === null)
  const showRecents = isNoDomain && !isEditMode && effectiveRecents.length > 0 && Boolean(onApplySuggestion)
  const showToolbar = isNoDomain || showSuggestion

  return (
    <Wrap
      style={
        activeDomainTone
          ? ({
              '--chip-rgb': activeDomainTone.rgb,
              '--chip-text': activeDomainTone.text,
              '--chip-text-dark': activeDomainTone.textDark,
            } as React.CSSProperties)
          : undefined
      }
    >
      {showToolbar && (
        <ToolbarRow>
          {isNoDomain && (
            <QuickSearchAnchor>
              <QuickSearchRow>
                <QuickSearchInput
                  type="search"
                  aria-label="세부 분야 빠른 검색"
                  placeholder="세부·예시 검색 (전투, 선전포고, 개통, 탄핵…)"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && searchMatches.length > 0) {
                      event.preventDefault()
                      const first = searchMatches[0]
                      applyCombo({ domain: first.domain, type: first.type })
                      setSearchQuery('')
                    } else if (event.key === 'Escape' && searchQuery) {
                      event.preventDefault()
                      setSearchQuery('')
                    }
                  }}
                />
                {searchQuery && (
                  <QuickSearchClear type="button" onClick={() => setSearchQuery('')}>
                    지우기
                  </QuickSearchClear>
                )}
              </QuickSearchRow>
              {searchQuery.trim() && (
                <SearchResultBox role="region" aria-label="세부 분야 검색 결과">
                  {searchMatches.length > 0 ? (
                    searchMatches.map((match) => (
                      <SearchResultButton
                        key={match.type}
                        type="button"
                        onClick={() => {
                          applyCombo({ domain: match.domain, type: match.type })
                          setSearchQuery('')
                        }}
                      >
                        <SearchResultTitle>{formatDomainPath(match.domain, match.type)}</SearchResultTitle>
                        <SearchResultExamples>{match.examples}</SearchResultExamples>
                      </SearchResultButton>
                    ))
                  ) : (
                    <SearchEmptyText>&lsquo;{searchQuery.trim()}&rsquo;에 맞는 세부 분야가 없습니다.</SearchEmptyText>
                  )}
                </SearchResultBox>
              )}
            </QuickSearchAnchor>
          )}
          {showSuggestion && rawSuggestion && effectiveSuggestedDomain && (
            <SuggestionBar>
              <SuggestionLabel>사건명 추천</SuggestionLabel>
              <SuggestionButton
                type="button"
                onClick={() => applyCombo({ domain: effectiveSuggestedDomain, type: rawSuggestion.type })}
              >
                {formatDomainPath(effectiveSuggestedDomain, rawSuggestion.type)} 적용
              </SuggestionButton>
            </SuggestionBar>
          )}
          {showRecents && (
            <RecentBar aria-label="최근 사용한 분류">
              <RecentLabel>최근</RecentLabel>
              {effectiveRecents.map((combo) => {
                const key = `${combo.domain}:${combo.type ?? ''}`
                const isCurrent = domain === combo.domain && value === combo.type
                return (
                  <RecentChip
                    key={key}
                    type="button"
                    aria-pressed={isCurrent}
                    $active={isCurrent}
                    onClick={() => applyCombo(combo)}
                  >
                    {formatDomainPath(combo.domain, combo.type)}
                  </RecentChip>
                )
              })}
            </RecentBar>
          )}
        </ToolbarRow>
      )}
      <RadioHost role="radiogroup" aria-label={groupLabel} onKeyDown={handleKeyDown}>
        {isNoDomain ? (
          expanded ? (
            <GroupStack>
              {EVENT_TYPE_GROUPS.map((group) => (
                <GroupBlock key={group.label}>
                  <KitGroupLabel>{group.label}</KitGroupLabel>
                  <KitChipGroup>{group.types.map(chip)}</KitChipGroup>
                </GroupBlock>
              ))}
              {!lockedInRest && (
                <MoreRow>
                  <MoreButton type="button" onClick={() => setShowRest(false)}>
                    자주 쓰는 세부만 보기
                  </MoreButton>
                </MoreRow>
              )}
            </GroupStack>
          ) : (
            <KitChipGroup>
              {frequentList.map(chip)}
              <MoreButton type="button" onClick={() => setShowRest(true)}>
                전체 세부 보기 ({EVENT_TYPE_ORDER.length})
              </MoreButton>
            </KitChipGroup>
          )
        ) : isOtherDomain ? (
          <GroupStack>
            {EVENT_TYPE_GROUPS.map((group) => (
              <GroupBlock key={group.label}>
                <KitGroupLabel>{group.label}</KitGroupLabel>
                <KitChipGroup>{group.types.map(chip)}</KitChipGroup>
              </GroupBlock>
            ))}
          </GroupStack>
        ) : (
          <GroupStack>
            <KitChipGroup>
              {primary.map(chip)}
              {rest.length > 0 && !expanded && (
                <MoreButton type="button" onClick={() => setShowRest(true)}>
                  다른 세부 더 보기 ({rest.length})
                </MoreButton>
              )}
            </KitChipGroup>
            {expanded && rest.length > 0 && (
              <RestSection>
                {groupSubtypes(rest).map((group) => (
                  <GroupBlock key={group.label}>
                    <KitGroupLabel>{group.label}</KitGroupLabel>
                    <KitChipGroup>{group.types.map(chip)}</KitChipGroup>
                  </GroupBlock>
                ))}
                {!lockedInRest && (
                  <MoreRow>
                    <MoreButton type="button" onClick={() => setShowRest(false)}>
                      기본 세부만 보기
                    </MoreButton>
                  </MoreRow>
                )}
              </RestSection>
            )}
          </GroupStack>
        )}
      </RadioHost>
      {(selected || (domain && activeDomainDef)) && (
        <Hint>
          {selected ? (
            <>
              <span>
                {formatDomainPath(domain ?? selected.defaultDomain, selected.key)} — 예: {selected.examples}
              </span>
              {records.length > 0 && (
                <span>
                  {isEditMode ? (
                    <>
                      핵심 기록 <b>{records.map((facet) => FACET_LABEL[facet]).join(' · ')}</b> — 상세 화면에서
                      편집합니다
                    </>
                  ) : (
                    <>
                      붙는 기록 <b>{records.map((facet) => FACET_LABEL[facet]).join(' · ')}</b> — 아래
                      &lsquo;기록&rsquo;에서 바로 적습니다
                    </>
                  )}
                </span>
              )}
            </>
          ) : (
            activeDomainDef && (
              <span>
                <b>{activeDomainDef.label}</b> — {activeDomainDef.tagline}
              </span>
            )
          )}
        </Hint>
      )}
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const ToolbarRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 10px;
`

const QuickSearchAnchor = styled.div`
  position: relative;
  flex: 1 1 200px;
  max-width: 320px;
  min-width: 0;
`

const RadioHost = styled.div`
  outline: none;
`

const GroupStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const GroupBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const RestSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const MoreRow = styled.div`
  display: flex;
  align-items: center;
`

const Hint = styled.p`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 10px;
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.secondary};

  b {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const MoreButton = styled.button`
  height: 34px;
  padding: 0 13px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 999px;
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.medium};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc'};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

const DomainBadge = styled.span`
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
  background: rgba(var(--chip-rgb, 99, 102, 241), ${({ theme }) => (theme.mode === 'dark' ? 0.18 : 0.1)});
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'var(--chip-text-dark, #a5b4fc)' : 'var(--chip-text, #4f46e5)'};
`

const SuggestionBar = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
`

const SuggestionLabel = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SuggestionButton = styled.button`
  height: 26px;
  padding: 0 10px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.08);
  color: ${({ theme }) => theme.colors.primary};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: rgba(99, 102, 241, 0.14);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

const RecentBar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
`

const RecentLabel = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RecentChip = styled.button<{ $active: boolean }>`
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border.light)};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.background.secondary : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

const QuickSearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const QuickSearchInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 34px;
  padding: 0 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 12.5px;
  letter-spacing: -0.01em;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:hover:not(:focus) {
    border-color: ${({ theme }) => theme.colors.border.medium};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
`

const QuickSearchClear = styled.button`
  padding: 4px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 12px;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const SearchResultBox = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 100%;
  width: max-content;
  max-width: min(440px, 85vw);
  max-height: 200px;
  overflow-y: auto;
  padding: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.background.secondary};
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
`

const SearchResultButton = styled.button`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 10px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    background: rgba(var(--chip-rgb, 99, 102, 241), ${({ theme }) => (theme.mode === 'dark' ? 0.16 : 0.08)});
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }
`

const SearchResultTitle = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  white-space: nowrap;
`

const SearchResultExamples = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const SearchEmptyText = styled.p`
  margin: 0;
  padding: 6px 8px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`


