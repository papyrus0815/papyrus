/**
 * Event Filters Panel Widget
 * FSD: widgets/event-filters-panel/ui
 *
 * 검색 입력 / 활성 칩 / reset / *정렬·페이지 크기*는 페이지 또는 ViewSwitcherRow가
 * 담당. 이 위젯은 "데이터 좁히기"인 카테고리·국가·직책·세기 + 표시 토글만.
 *
 * v2 — 인라인 팝오버: 카테고리·국가·직책 모두 클릭 시 *드롭다운 리스트*로 즉시 선택 가능.
 * 항목이 많으면 popover 내부 검색 박스 노출. 기존 모달 진입은 "전체 보기" 풋터에서.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'

import {
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiGlobe,
  FiGrid,
  FiLayers,
  FiMap,
  FiSearch,
  FiUsers,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { CenturyFilter } from '@/entities/event/model'
import { FILTER_ALL } from '@/features/event-list/lib'
import { MOCK_POSITION_TYPES } from '@/entities/event/model/mock-government-positions'
import type { ContinentResponseDto } from '@/shared/api/continents'
import type { EventCategoryDto } from '@/shared/api/event-categories'

import * as Filter from '../../../pages/events/styles/filter.styles'
import { BRAND, MOTION, SHADOW } from '../../../pages/events/styles/theme'

interface FiltersPanelProps {
  selectedCategory: typeof FILTER_ALL | string
  selectedCountry: typeof FILTER_ALL | string
  selectedContinent: typeof FILTER_ALL | string
  selectedPositionType: typeof FILTER_ALL | string
  selectedCentury: CenturyFilter
  showFlatView: boolean

  dbCategories: EventCategoryDto[]
  availableCenturies: number[]
  countries?: Array<{ id: string; name: string; flagEmoji?: string }>
  historicalCountries?: Array<{ id: string; name: string }>
  continents?: ContinentResponseDto[]

  /** 인라인 선택 핸들러 — 신규 (모달 우회) */
  onSelectCategory?: (id: typeof FILTER_ALL | string) => void
  onSelectCountry?: (id: typeof FILTER_ALL | string) => void
  onSelectContinent?: (id: typeof FILTER_ALL | string) => void
  onSelectPositionType?: (id: typeof FILTER_ALL | string) => void

  /** 모달 트리거 — "전체 보기"용 fallback */
  onShowCategoryModal: () => void
  onShowCountryModal: () => void
  onShowPositionTypeModal: () => void
  onToggleFlatView: () => void
  onSelectCentury: (century: CenturyFilter) => void
}

export const FiltersPanel: React.FC<FiltersPanelProps> = ({
  selectedCategory,
  selectedCountry,
  selectedContinent,
  selectedPositionType,
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
  onSelectPositionType,
  onShowCategoryModal,
  onShowCountryModal,
  onShowPositionTypeModal,
  onToggleFlatView,
  onSelectCentury,
}) => {
  const positionLabel =
    selectedPositionType === FILTER_ALL
      ? '직책'
      : MOCK_POSITION_TYPES.find((p) => p.value === selectedPositionType)
          ?.label ?? '직책'

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
        prefix: c.flagEmoji,
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

        {/* 직책 — 인라인 팝오버 */}
        <InlineFilterPopover
          icon={<FiUsers size={13} />}
          label={positionLabel}
          isActive={selectedPositionType !== FILTER_ALL}
          options={[
            { id: FILTER_ALL, name: '전체' },
            ...MOCK_POSITION_TYPES.map((p) => ({ id: p.value, name: p.label })),
          ]}
          selectedId={selectedPositionType}
          onSelect={(id) => onSelectPositionType?.(id)}
          onShowMoreModal={onShowPositionTypeModal}
          ariaLabel="직책 필터"
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
                {century}C
              </option>
            ))}
          </Filter.CenturySelect>
        </Filter.CenturySelectWrap>
      </Filter.FilterGroup>

      {/* 토글들 — segmented group 외부, inline group */}
      <Filter.FilterToggle onClick={onToggleFlatView}>
        <FiLayers size={12} style={{ color: '#64748b' }} aria-hidden="true" />
        <Filter.FilterToggleLabel>계층</Filter.FilterToggleLabel>
        <Filter.Switch
          type="button"
          $active={!showFlatView}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFlatView()
          }}
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
  const searchRef = useRef<HTMLInputElement | null>(null)

  // 닫기: 외부 클릭 / Escape
  useEffect(() => {
    if (!open) return
    const onDocDown = (e: MouseEvent) => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

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
        type="button"
        onClick={() => setOpen((v) => !v)}
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
      {open && (
        <Popover role="listbox" aria-label={ariaLabel}>
          {searchable && (
            <SearchRow>
              <FiSearch size={12} aria-hidden="true" />
              <SearchInput
                ref={searchRef}
                type="search"
                value={query}
                placeholder="검색…"
                onChange={(e) => setQuery(e.target.value)}
                aria-label={`${ariaLabel} 검색`}
              />
            </SearchRow>
          )}
          <List>
            {visibleList.length === 0 ? (
              <Empty>검색 결과 없음</Empty>
            ) : (
              visibleList.map((opt) => {
                const selected = opt.id === selectedId
                return (
                  <Item
                    key={opt.id}
                    role="option"
                    aria-selected={selected}
                    $selected={selected}
                    type="button"
                    onClick={() => {
                      onSelect(opt.id)
                      setOpen(false)
                    }}
                  >
                    {opt.prefix && (
                      <ItemPrefix aria-hidden="true">{opt.prefix}</ItemPrefix>
                    )}
                    <ItemName>{opt.name}</ItemName>
                    {selected && (
                      <FiCheck size={12} aria-hidden="true" />
                    )}
                  </Item>
                )
              })
            )}
          </List>
          {(truncated || onShowMoreModal) && (
            <Footer>
              {truncated && (
                <FooterHint>
                  + 더 많은 항목은 검색으로 찾기
                </FooterHint>
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
        </Popover>
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

const Popover = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 60;
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
