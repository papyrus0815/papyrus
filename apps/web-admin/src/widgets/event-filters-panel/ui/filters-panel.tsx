/**
 * Event Filters Panel Widget
 * FSD: widgets/event-filters-panel/ui
 *
 * 검색 입력 / 활성 칩 / reset / *정렬·페이지 크기*는 페이지 또는 ViewSwitcherRow가
 * 담당. 이 위젯은 "데이터 좁히기"인 카테고리·국가·세기 + 표시 토글만.
 *
 * v2 — 인라인 팝오버: 카테고리·국가 모두 클릭 시 *드롭다운 리스트*로 즉시 선택 가능.
 * 항목이 많으면 popover 내부 검색 박스 노출. 기존 모달 진입은 "전체 보기" 풋터에서.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { createPortal } from 'react-dom'
import {
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiGlobe,
  FiGrid,
  FiLayers,
  FiMap,
  FiSearch,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { CenturyFilter } from '@/entities/event/model'
import { FILTER_ALL } from '@/features/event-list/lib'
import type { ContinentResponseDto } from '@/shared/api/continents'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import { useAnchoredPosition } from '@/shared/hooks/use-anchored-position.hook'
import { useOverlayEscape } from '@/shared/hooks/use-overlay-escape.hook'
import { Z_INDEX } from '@/shared/styles/z-index'

import * as Filter from '../../../pages/events/styles/filter.styles'
import { BRAND, MOTION, SHADOW } from '../../../pages/events/styles/theme'

interface FiltersPanelProps {
  selectedCategory: typeof FILTER_ALL | string
  selectedCountry: typeof FILTER_ALL | string
  selectedContinent: typeof FILTER_ALL | string
  selectedCentury: CenturyFilter
  showFlatView: boolean

  dbCategories: EventCategoryDto[]
  availableCenturies: number[]
  countries?: Array<{ id: string; name: string; flagEmoji?: string | null }>
  historicalCountries?: Array<{ id: string; name: string }>
  continents?: ContinentResponseDto[]

  /** 인라인 선택 핸들러 — 신규 (모달 우회) */
  onSelectCategory?: (id: typeof FILTER_ALL | string) => void
  onSelectCountry?: (id: typeof FILTER_ALL | string) => void
  onSelectContinent?: (id: typeof FILTER_ALL | string) => void

  /** 모달 트리거 — "전체 보기"용 fallback */
  onShowCategoryModal: () => void
  onShowCountryModal: () => void
  onToggleFlatView: () => void
  onSelectCentury: (century: CenturyFilter) => void
}

export const FiltersPanel: React.FC<FiltersPanelProps> = ({
  selectedCategory,
  selectedCountry,
  selectedContinent,
  selectedCentury,
  showFlatView,
  dbCategories,
  availableCenturies,
  countries = [],
  historicalCountries = [],
  continents = [],
  onSelectCategory,
  onSelectCountry,
  onSelectContinent,
  onShowCategoryModal,
  onShowCountryModal,
  onToggleFlatView,
  onSelectCentury,
}) => {
  const categoryLabel =
    selectedCategory === FILTER_ALL
      ? '카테고리'
      : dbCategories.find((cat) => cat.id === selectedCategory)?.name ||
        '알 수 없음'

  const countryLabel =
    selectedCountry === FILTER_ALL
      ? '국가'
      : countries.find((c) => c.id === selectedCountry)?.name ||
        historicalCountries.find((c) => c.id === selectedCountry)?.name ||
        '국가'

  const continentLabel =
    selectedContinent === FILTER_ALL
      ? '대륙'
      : continents.find((c) => c.id === selectedContinent)?.name ?? '대륙'

  const allCountryOptions = useMemo(
    () => [
      ...countries.map((c) => ({
        id: c.id,
        name: c.name,
        prefix: c.flagEmoji ?? undefined,
      })),
      ...historicalCountries.map((c) => ({
        id: c.id,
        name: c.name,
        prefix: '🏛️',
      })),
    ],
    [countries, historicalCountries],
  )

  return (
    <Filter.FilterBlock>
      {/* 필터 트리거 5개 — 한 외곽 border로 묶음 (내부 hairline divider) */}
      <Filter.FilterGroup>
        {/* 카테고리 — 인라인 팝오버 (전체 + 카테고리 N개 + 모달 진입) */}
        <InlineFilterPopover
          icon={<FiGrid size={13} />}
          label={categoryLabel}
          isActive={selectedCategory !== FILTER_ALL}
          options={[
            { id: FILTER_ALL, name: '전체' },
            ...dbCategories.map((cat) => ({ id: cat.id, name: cat.name })),
          ]}
          selectedId={selectedCategory}
          onSelect={(id) => onSelectCategory?.(id)}
          onShowMoreModal={onShowCategoryModal}
          ariaLabel="카테고리 필터"
          searchable={dbCategories.length > 12}
        />

        {/* 대륙 — 인라인 팝오버 (대륙 → 국가 순으로 좁혀가는 동선) */}
        <InlineFilterPopover
          icon={<FiMap size={13} />}
          label={continentLabel}
          isActive={selectedContinent !== FILTER_ALL}
          options={[
            { id: FILTER_ALL, name: '전체' },
            ...continents.map((c) => ({ id: c.id, name: c.name })),
          ]}
          selectedId={selectedContinent}
          onSelect={(id) => onSelectContinent?.(id)}
          ariaLabel="대륙 필터"
          searchable={continents.length > 12}
        />

        {/* 국가 — 인라인 팝오버 (검색 가능, 자주 쓰는 항목 위주) */}
        <InlineFilterPopover
          icon={<FiGlobe size={13} />}
          label={countryLabel}
          isActive={selectedCountry !== FILTER_ALL}
          options={[
            { id: FILTER_ALL, name: '전체' },
            ...allCountryOptions,
          ]}
          selectedId={selectedCountry}
          onSelect={(id) => onSelectCountry?.(id)}
          onShowMoreModal={onShowCountryModal}
          ariaLabel="국가 필터"
          searchable
          maxVisible={50}
        />

        {/* 세기 — icon은 select prefix 자리에 padding으로 통합 */}
        <Filter.CenturySelectWrap>
          <FiCalendar size={13} aria-hidden="true" />
          <Filter.CenturySelect
            value={selectedCentury === FILTER_ALL ? 'all' : selectedCentury}
            onChange={(e) => {
              const value = e.target.value
              onSelectCentury(
                value === 'all' ? FILTER_ALL : parseInt(value, 10),
              )
            }}
            aria-label="세기 선택"
          >
            <option value="all">전체</option>
            {availableCenturies.map((century) => (
              <option key={century} value={century}>
                {century < 0 ? `기원전 ${Math.abs(century)}세기` : `${century}세기`}
              </option>
            ))}
          </Filter.CenturySelect>
        </Filter.CenturySelectWrap>
      </Filter.FilterGroup>

      {/* 토글들 — segmented group 외부, inline group.
       *
       * ⚠️ FilterToggle(label)에 onClick을 걸지 말 것. label 안의 Switch는 button —
       * HTML labelable 요소라 label의 피제어 컨트롤이 된다. 라벨 영역을 누르면
       * ⑴ label 자신의 onClick ⑵ 브라우저가 button으로 전달한 활성화 클릭이 연달아 실행돼
       * **짝수 번 토글 = 순 변화 0**이 됐다. 라이브 실측에선 URL만 flat=1로 바뀌고 목록은
       * 계층 그대로 남아, 새로고침하면 다른 화면이 뜨는 URL↔화면 desync까지 생겼다.
       * 토글 주체는 Switch 하나로 단일화한다(라벨 클릭은 브라우저가 알아서 버튼으로 전달). */}
      <Filter.FilterToggle>
        <FiLayers size={12} style={{ color: '#64748b' }} aria-hidden="true" />
        <Filter.FilterToggleLabel>계층</Filter.FilterToggleLabel>
        <Filter.Switch
          type="button"
          role="switch"
          aria-checked={!showFlatView}
          aria-label="계층 보기"
          $active={!showFlatView}
          onClick={onToggleFlatView}
        >
          <Filter.SwitchThumb $active={!showFlatView} />
        </Filter.Switch>
      </Filter.FilterToggle>
    </Filter.FilterBlock>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline filter popover — 트리거 버튼 + 드롭다운 리스트 (선택/검색/전체보기 모달)
// ─────────────────────────────────────────────────────────────────────────────

interface InlineFilterOption {
  id: string
  name: string
  prefix?: string // 국기 이모지 등 (옵션 좌측 prefix)
}

interface InlineFilterPopoverProps {
  icon: React.ReactNode
  label: string
  isActive: boolean
  options: InlineFilterOption[]
  selectedId: string
  onSelect: (id: string) => void
  onShowMoreModal?: () => void
  ariaLabel: string
  searchable?: boolean
  /** popover 내 보일 최대 항목 수 (검색 후엔 무관). undefined = 전체. */
  maxVisible?: number
}

const InlineFilterPopover: React.FC<InlineFilterPopoverProps> = ({
  icon,
  label,
  isActive,
  options,
  selectedId,
  onSelect,
  onShowMoreModal,
  ariaLabel,
  searchable = false,
  maxVisible,
}) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  /** 포털된 팝오버 노드 — wrapRef의 자손이 아니므로 외부클릭 판정에 따로 필요 */
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const position = useAnchoredPosition(triggerRef, open)
  const closePopover = useCallback(() => setOpen(false), [])

  // 닫기: 외부 클릭(Escape는 useOverlayEscape)
  useEffect(() => {
    if (!open) return
    const onDocDown = (event: MouseEvent) => {
      const target = event.target as Node
      // 팝오버는 body로 포털되어 wrapRef 밖에 있다. popoverRef를 함께 보지 않으면
      // 옵션을 누르는 mousedown이 "외부 클릭"으로 판정돼 click 전에 언마운트되고,
      // 결과적으로 아무것도 선택되지 않는다.
      if (wrapRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
    }
  }, [open])
  // Escape는 공용 훅이 처리한다 — 전파를 끊어 페이지의 window 핸들러가 같은 키를
  // '선택 해제'로 재해석하지 못하게 한다(검토 INT-1).
  useOverlayEscape(open, closePopover)

  // 열렸을 때 검색 input 자동 포커스
  useEffect(() => {
    if (open && searchable) {
      requestAnimationFrame(() => searchRef.current?.focus())
    }
    if (!open) setQuery('')
  }, [open, searchable])

  const filtered = useMemo(() => {
    if (!query.trim()) return options
    const q = query.trim().toLowerCase()
    return options.filter((o) => o.name.toLowerCase().includes(q))
  }, [options, query])

  const visibleList =
    maxVisible !== undefined && !query.trim()
      ? filtered.slice(0, maxVisible)
      : filtered
  const truncated =
    maxVisible !== undefined && !query.trim() && filtered.length > maxVisible

  return (
    <PopoverWrap ref={wrapRef}>
      <Filter.FilterTriggerButton
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        data-active={isActive ? 'true' : undefined}
      >
        {icon}
        <span>{label}</span>
        <FiChevronDown
          size={11}
          aria-hidden="true"
          style={{
            marginLeft: 1,
            opacity: 0.7,
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.15s ease',
          }}
        />
      </Filter.FilterTriggerButton>
      {open &&
        position &&
        createPortal(
          <Popover
            ref={popoverRef}
            role="listbox"
            aria-label={ariaLabel}
            style={{
              top: position.top,
              left: position.left,
              minWidth: position.minWidth,
              maxHeight: position.maxHeight,
            }}
          >
            {searchable && (
              <SearchRow>
                <FiSearch size={12} aria-hidden="true" />
                <SearchInput
                  ref={searchRef}
                  type="search"
                  value={query}
                  placeholder="검색…"
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label={`${ariaLabel} 검색`}
                />
              </SearchRow>
            )}
            <List>
              {visibleList.length === 0 ? (
                <Empty>검색 결과 없음</Empty>
              ) : (
                visibleList.map((option) => {
                  const selected = option.id === selectedId
                  return (
                    <Item
                      key={option.id}
                      role="option"
                      aria-selected={selected}
                      $selected={selected}
                      type="button"
                      onClick={() => {
                        onSelect(option.id)
                        setOpen(false)
                      }}
                    >
                      {option.prefix && (
                        <ItemPrefix aria-hidden="true">
                          {option.prefix}
                        </ItemPrefix>
                      )}
                      <ItemName>{option.name}</ItemName>
                      {selected && <FiCheck size={12} aria-hidden="true" />}
                    </Item>
                  )
                })
              )}
            </List>
            {(truncated || onShowMoreModal) && (
              <Footer>
                {truncated && (
                  <FooterHint>+ 더 많은 항목은 검색으로 찾기</FooterHint>
                )}
                {onShowMoreModal && (
                  <FooterAction
                    type="button"
                    onClick={() => {
                      onShowMoreModal()
                      setOpen(false)
                    }}
                  >
                    전체 보기 →
                  </FooterAction>
                )}
              </Footer>
            )}
          </Popover>,
          document.body,
        )}
    </PopoverWrap>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// styled — popover
// ─────────────────────────────────────────────────────────────────────────────

const PopoverWrap = styled.div`
  position: relative;
  display: inline-flex;
  align-items: stretch;
`

/**
 * body로 포털되어 뜬다 — `top`/`left`/`minWidth`/`maxHeight`는 useAnchoredPosition이
 * 인라인 스타일로 주입한다. 툴바 안에서 absolute로 띄우면 FilterGroup의
 * `overflow: hidden`에 잘리므로 이 컴포넌트를 다시 DOM 자식으로 되돌리지 말 것.
 * (같은 이유로 FilterGroup의 `& button { ...!important }` 자손 리셋도 더 이상 닿지 않는다.)
 */
const Popover = styled.div`
  position: fixed;
  z-index: ${Z_INDEX.DROPDOWN};
  min-width: 200px;
  max-width: 280px;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? `background: #18181b;
         border: 1px solid rgba(255,255,255,0.1);
         box-shadow: ${SHADOW.mdDark};`
      : `background: #ffffff;
         border: 1px solid rgba(15,23,42,0.1);
         box-shadow: ${SHADOW.md};`}
  overflow: hidden;
`

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SearchInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  min-width: 0;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &::-webkit-search-cancel-button {
    display: none;
  }
`

const List = styled.div`
  display: flex;
  flex-direction: column;
  /* 뷰포트가 짧으면 Popover의 maxHeight가 더 작다 — flex 축소로 그 안에 맞춘다. */
  flex: 1 1 auto;
  min-height: 0;
  max-height: 280px;
  overflow-y: auto;
  padding: 4px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(37, 99, 235, 0.2);
    border-radius: 3px;
  }
`

const Item = styled.button<{ $selected: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: none;
  border-radius: 6px;
  background: ${({ $selected, theme }) =>
    $selected
      ? theme.mode === 'dark'
        ? BRAND.primaryFillDark
        : BRAND.primarySoftHover
      : 'transparent'};
  color: ${({ $selected, theme }) =>
    $selected
      ? theme.mode === 'dark'
        ? BRAND.primaryTextOnDark
        : BRAND.primaryHover
      : theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: ${({ $selected }) => ($selected ? 700 : 500)};
  letter-spacing: -0.005em;
  cursor: pointer;
  text-align: left;
  transition: background ${MOTION.fast}, color ${MOTION.fast};

  &:hover {
    background: ${({ $selected, theme }) =>
      $selected
        ? theme.mode === 'dark'
          ? BRAND.primaryFillDark
          : BRAND.primarySoftHover
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.05)'
          : 'rgba(15,23,42,0.04)'};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
`

const ItemPrefix = styled.span`
  flex-shrink: 0;
  font-size: 14px;
  line-height: 1;
`

const ItemName = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Empty = styled.div`
  padding: 12px;
  text-align: center;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  font-size: 11px;
`

const FooterHint = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 500;
  letter-spacing: -0.005em;
`

const FooterAction = styled.button`
  margin-left: auto;
  padding: 3px 8px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: ${BRAND.primary};
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: -0.005em;
  cursor: pointer;
  transition: background ${MOTION.fast};

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(37, 99, 235, 0.14)'
        : BRAND.primarySoftHover};
  }
`
