/**
 * PlaceSelect — 출생지/사망지(·주둔지) 입력
 *
 * **한 칸 콤보박스**: 지명을 치면 그대로 값이 된다(직접 입력). 입력하는 동안 DB에 등록된
 * 도시·행정구역이 제안으로 뜨고, 고르면 DB 장소(cityId/adminDivisionId)로 바뀐다.
 *
 * 예전 모양(탭 '등록된 지역 선택 | 직접 입력' + 국가→행정구역→도시 셀렉트 사슬 + 결과 뱃지)을
 * 버린 이유:
 *  - DB에 도시가 3개뿐이라 기본 탭(DB)의 셀렉트 사슬은 대부분 '등록된 행정구역 없음'으로 끝났다.
 *  - 직접 입력은 '저장' 버튼을 눌러야 값이 되어, 치고 폼을 제출하면 지명이 조용히 사라졌다.
 *  - 탭을 바꾸면 값이 지워졌고, 선택 결과가 입력칸 아래 뱃지로 한 번 더 그려졌다.
 *
 * 값 계약(PlaceResult)은 그대로 — 호출부(인물 등록·군부대 주둔지) 무변경.
 */
import React, { useEffect, useId, useRef, useState } from 'react'

import { FiMapPin, FiX } from 'react-icons/fi'
import styled, { keyframes } from 'styled-components'

import {
  type AdministrativeDivisionSearchHit,
  type City,
  cityApi,
} from '@/shared/api/city'
import { type Country, countryApi } from '@/shared/api/country'
import { Z_INDEX } from '@/shared/styles/z-index'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlaceResult {
  displayName: string
  shortName: string
  /** DB City.id */
  cityId?: string
  /** DB AdministrativeDivision.id */
  adminDivisionId?: string
  region?: string
  countryName?: string
  /** 직접 입력 여부 */
  isManual?: boolean
}

export interface PlaceSelectProps {
  value?: PlaceResult | null
  onChange: (place: PlaceResult | null) => void
  /** 이 국가의 등록 장소를 제안 맨 앞에 둔다(다른 국가 장소도 검색된다) */
  countryId?: string
  disabled?: boolean
  /** @deprecated 강조색은 테마 토큰을 따른다 — 호환용으로만 받는다 */
  accentColor?: string
  placeholder?: string
}

/** 제안 한 줄 — DB 도시 또는 행정구역 */
interface Suggestion {
  key: string
  place: PlaceResult
  /** 보조 줄(상위 행정구역 · 국가) */
  context: string
  kind: '도시' | string
  inScope: boolean
}

const SEARCH_DEBOUNCE_MS = 200
const MAX_SUGGESTIONS = 8

// 국가명 조회용 — 제안의 '· 국가' 표기에만 쓴다. 폼마다 한 번만 받는다.
let countriesPromise: Promise<Country[]> | null = null
function loadCountries(): Promise<Country[]> {
  if (!countriesPromise) {
    countriesPromise = countryApi
      .getAll()
      .then((list) => list ?? [])
      .catch(() => {
        countriesPromise = null
        return []
      })
  }
  return countriesPromise
}

function toCitySuggestion(
  city: City,
  countryNameById: Map<string, string>,
  scopeCountryId?: string,
): Suggestion {
  const countryName = city.countryId
    ? countryNameById.get(city.countryId)
    : undefined
  const region = city.administrativeDivisionName ?? undefined
  return {
    key: `city:${city.id}`,
    place: {
      cityId: city.id,
      adminDivisionId: city.administrativeDivisionId ?? undefined,
      displayName: [city.name, region, countryName].filter(Boolean).join(', '),
      shortName: city.name,
      region,
      countryName,
    },
    context: [region, countryName].filter(Boolean).join(' · '),
    kind: '도시',
    inScope: !!scopeCountryId && city.countryId === scopeCountryId,
  }
}

function toDivisionSuggestion(
  hit: AdministrativeDivisionSearchHit,
  countryNameById: Map<string, string>,
  scopeCountryId?: string,
): Suggestion {
  const countryName = hit.countryId
    ? countryNameById.get(hit.countryId)
    : undefined
  const parent = hit.parentPath.length
    ? hit.parentPath[hit.parentPath.length - 1]
    : undefined
  return {
    key: `div:${hit.id}`,
    place: {
      adminDivisionId: hit.id,
      displayName: [hit.name, parent, countryName].filter(Boolean).join(', '),
      shortName: hit.name,
      region: parent,
      countryName,
    },
    context: [...hit.parentPath, countryName].filter(Boolean).join(' · '),
    kind: hit.divisionLabel || '행정구역',
    inScope: !!scopeCountryId && hit.countryId === scopeCountryId,
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlaceSelect({
  value,
  onChange,
  countryId,
  disabled = false,
  placeholder = '지명 입력 (예: 한성부, 코르시카)',
}: PlaceSelectProps) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState(value?.shortName ?? '')
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const searchSeqRef = useRef(0)

  const isRegistered = !!value && !value.isManual

  // 밖에서 값이 바뀌면(편집 하이드레이트·'출생지와 동일'·국가 변경으로 비움) 칸 글자를 맞춘다.
  // 직접 입력 중에는 value.shortName === text.trim()이라 커서가 튀지 않는다.
  useEffect(() => {
    const next = value?.shortName ?? ''
    setText((current) => (current.trim() === next ? current : next))
  }, [value?.shortName])

  // 제안 검색 — 도시·행정구역을 함께, 지정 국가 것을 앞에.
  useEffect(() => {
    const query = text.trim()
    if (!open || !query || isRegistered) {
      setSuggestions([])
      setLoading(false)
      return
    }
    const seq = ++searchSeqRef.current
    setLoading(true)
    const timer = window.setTimeout(async () => {
      const [cities, divisions, countries] = await Promise.all([
        cityApi.searchCities(query),
        // owner '' = 국가 필터 없음(서버가 빈 countryId를 무시) — 해외 출생지도 제안
        cityApi.searchAdministrativeDivisions(query, '', MAX_SUGGESTIONS),
        loadCountries(),
      ])
      if (seq !== searchSeqRef.current) return
      const countryNameById = new Map(
        countries.map((country) => [country.id, country.name]),
      )
      const merged = [
        ...cities.map((city) => toCitySuggestion(city, countryNameById, countryId)),
        ...divisions.map((hit) =>
          toDivisionSuggestion(hit, countryNameById, countryId),
        ),
      ]
        // 안정 정렬 — 지정 국가 것이 앞, 그 안에선 도시 → 행정구역 순 유지
        .sort((left, right) => Number(right.inScope) - Number(left.inScope))
        .slice(0, MAX_SUGGESTIONS)
      setSuggestions(merged)
      setActiveIndex(-1)
      setLoading(false)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [text, open, isRegistered, countryId])

  /** 친 글자가 곧 값 — '저장' 단계 없음 */
  const handleType = (next: string) => {
    setText(next)
    setOpen(true)
    const trimmed = next.trim()
    onChange(
      trimmed
        ? { displayName: trimmed, shortName: trimmed, isManual: true }
        : null,
    )
  }

  const pick = (suggestion: Suggestion) => {
    onChange(suggestion.place)
    setText(suggestion.place.shortName)
    setOpen(false)
    setActiveIndex(-1)
  }

  const clear = () => {
    onChange(null)
    setText('')
    setOpen(false)
    inputRef.current?.focus()
  }

  const showList = open && !isRegistered && !!text.trim() && suggestions.length > 0

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      if (!suggestions.length) return
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => (index + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      if (!suggestions.length) return
      event.preventDefault()
      setActiveIndex((index) =>
        index <= 0 ? suggestions.length - 1 : index - 1,
      )
    } else if (event.key === 'Enter') {
      // 폼 조기 제출 방지 — 제안을 고르거나, 없으면 친 글자를 그대로 두고 닫는다
      event.preventDefault()
      if (showList && activeIndex >= 0) pick(suggestions[activeIndex])
      else setOpen(false)
    } else if (event.key === 'Escape' && showList) {
      // 셸의 Esc(모달 닫기)로 번지지 않게 — 목록만 닫는다
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <Wrap>
      <Box $disabled={disabled} $open={showList}>
        <FiMapPin size={14} aria-hidden="true" />
        <Input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            showList && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
          }
          value={text}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          onChange={(event) => handleType(event.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={handleKeyDown}
        />
        {isRegistered && value && (
          <RegisteredTag title={value.displayName}>
            {[value.region, value.countryName].filter(Boolean).join(' · ') ||
              '등록 지역'}
          </RegisteredTag>
        )}
        {loading && open && !isRegistered && <Spinner aria-hidden="true" />}
        {!!text && !disabled && (
          <ClearBtn
            type="button"
            onClick={clear}
            aria-label="지우기"
            title="지우기"
          >
            <FiX size={13} />
          </ClearBtn>
        )}
      </Box>
      {showList && (
        <List id={listId} role="listbox">
          {suggestions.map((suggestion, index) => (
            <Option
              key={suggestion.key}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              $active={index === activeIndex}
              // blur보다 먼저 — 고르기 전에 목록이 닫히지 않게
              onMouseDown={(event) => {
                event.preventDefault()
                pick(suggestion)
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <OptionName>{suggestion.place.shortName}</OptionName>
              {suggestion.context && (
                <OptionContext>{suggestion.context}</OptionContext>
              )}
              <OptionKind>{suggestion.kind}</OptionKind>
            </Option>
          ))}
          <ListFoot>
            목록에 없으면 친 그대로 저장돼요
          </ListFoot>
        </List>
      )}
    </Wrap>
  )
}

// ---------------------------------------------------------------------------
// Styled — 인물 등록 폼의 날짜 칸(InlineDateField field)과 같은 40px 한 칸
// ---------------------------------------------------------------------------

const Wrap = styled.div`
  position: relative;
  width: 100%;
`

const Box = styled.div<{ $disabled?: boolean; $open?: boolean }>`
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  height: 40px;
  padding: 0 6px 0 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  background: ${({ theme, $disabled }) =>
    $disabled
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.02)'
        : '#f8fafc'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.03)'
        : '#fff'};
  opacity: ${({ $disabled }) => ($disabled ? 0.6 : 1)};
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;

  > svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:hover {
    border-color: ${({ theme, $disabled }) =>
      $disabled ? theme.colors.border.default : theme.colors.border.medium};
  }
  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
`

const Input = styled.input`
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: transparent;
  border: none;
  outline: none;

  /* 전역 input:focus 테·링을 누른다 — 테는 칸(Box) 하나만 가진다 */
  &&,
  &&:focus {
    border: none;
    box-shadow: none;
    outline: none;
  }
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:disabled {
    cursor: not-allowed;
  }
  @media (max-width: 768px) {
    font-size: 16px;
  }
`

/** DB 장소를 골랐을 때 — 상위 행정구역·국가를 칸 안 오른쪽에 옅게(예전 결과 뱃지 대신) */
const RegisteredTag = styled.span`
  flex-shrink: 1;
  min-width: 0;
  max-width: 50%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.active};
  background: ${({ theme }) => theme.colors.activeLight};
  border-radius: 999px;
`

const spin = keyframes`to { transform: rotate(360deg); }`

const Spinner = styled.span`
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  border: 1.5px solid ${({ theme }) => theme.colors.border.default};
  border-top-color: ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`

const ClearBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  padding: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f1f5f9'};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
`

const List = styled.div`
  position: absolute;
  z-index: ${Z_INDEX.DROPDOWN};
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 280px;
  overflow-y: auto;
  padding: 4px;
  /* 인물 폼 InlineSearchSelect 드롭다운과 같은 표면 */
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(28,28,32,0.98)' : '#fff'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  box-shadow: 0 8px 24px ${({ theme }) => theme.colors.shadow.md};
`

const Option = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.activeLight : 'transparent'};
`

const OptionName = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
`

const OptionContext = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const OptionKind = styled.span`
  margin-left: auto;
  flex-shrink: 0;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ListFoot = styled.div`
  padding: 6px 10px 4px;
  margin-top: 2px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
