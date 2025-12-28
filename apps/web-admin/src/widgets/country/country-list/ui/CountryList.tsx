import React from 'react'

import { createPortal } from 'react-dom'

import { AnimatePresence, motion } from 'framer-motion'

import { type ContinentOption, type Country } from '@/entities/country/api'
import {
  COUNTRY_TYPE_LABELS,
  type CountryTypeFilter,
  type UnifiedCountry,
} from '@/entities/country/model/unified-types'
import * as S from '@/pages/history/country/country.styles'

export type SortBy = 'name' | 'population' | 'area'
export type ActiveTab = 'dashboard' | 'list'

interface CountryListProps {
  // Data
  countries: Country[]
  filtered: UnifiedCountry[]
  continents: ContinentOption[]

  // Selection
  selectedId: string | null
  onSelect: (id: string) => void

  // Filter state
  query: string
  onQueryChange: (query: string) => void
  continentFilter: string
  onContinentFilterChange: (continentId: string) => void
  countryTypeFilter?: CountryTypeFilter
  onCountryTypeFilterChange?: (type: CountryTypeFilter) => void
  sortBy: SortBy
  onSortByChange: (sortBy: SortBy) => void
  showContinentModal: boolean
  setShowContinentModal: (show: boolean) => void
  showSortModal: boolean
  setShowSortModal: (show: boolean) => void
  showCountryTypeModal?: boolean
  setShowCountryTypeModal?: (show: boolean) => void

  // Tab state
  activeTab: ActiveTab
  onTabChange: (tab: ActiveTab) => void

  // Actions
  onAdd: () => void
  onAddHistorical?: () => void
  onEditHistorical?: (country: UnifiedCountry) => void

  // Layout
  inHistory?: boolean
}

export function CountryList({
  countries,
  filtered,
  continents,
  selectedId,
  onSelect,
  query,
  onQueryChange,
  continentFilter,
  onContinentFilterChange,
  countryTypeFilter = 'all',
  onCountryTypeFilterChange,
  sortBy,
  onSortByChange,
  showContinentModal,
  setShowContinentModal,
  showSortModal,
  setShowSortModal,
  showCountryTypeModal = false,
  setShowCountryTypeModal,
  activeTab,
  onTabChange,
  onAdd,
  onAddHistorical,
  onEditHistorical,
  inHistory = false,
}: CountryListProps) {
  const [showAddTypeModal, setShowAddTypeModal] = React.useState(false)
  const [expandedCountries, setExpandedCountries] = React.useState<Set<string>>(
    new Set(),
  )
  const listRef = React.useRef<HTMLDivElement>(null)

  // 액티브 국가가 변경되면 자동으로 펼치기
  React.useEffect(() => {
    if (selectedId) {
      setExpandedCountries((prev) => {
        const newSet = new Set<string>()

        // 선택된 ID가 현대 국가인지 확인
        const selectedCountry = filtered.find(
          (country) => country.id === selectedId,
        )

        if (selectedCountry && selectedCountry.type === 'modern') {
          // 현대 국가가 선택된 경우 - 해당 국가 펼치기
          newSet.add(selectedId)
        } else {
          // 역사적 국가가 선택된 경우 - 부모 현대 국가 찾아서 펼치기
          const parentCountry = filtered.find(
            (country) =>
              country.type === 'modern' &&
              country.historicalCountries?.some(
                (historical) => historical.id === selectedId,
              ),
          )
          if (parentCountry) {
            newSet.add(parentCountry.id)
          }
        }

        return newSet
      })
    }
  }, [selectedId, filtered])

  const toggleExpand = (countryId: string) => {
    setExpandedCountries((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(countryId)) {
        // 이미 열려있으면 닫기
        newSet.delete(countryId)
      } else {
        // 새로운 항목을 열면 다른 항목은 모두 닫기
        newSet.clear()
        newSet.add(countryId)
        // 펼칠 때 해당 항목으로 스크롤
        setTimeout(() => {
          const element = document.getElementById(`country-${countryId}`)
          if (element && listRef.current) {
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest',
            })
          }
        }, 80)
      }

      return newSet
    })
  }

  const handleClearFilters = () => {
    onQueryChange('')
    onContinentFilterChange('')
  }

  const handleAddClick = () => {
    setShowAddTypeModal(true)
  }

  const handleSelectAddType = (type: 'modern' | 'historical') => {
    setShowAddTypeModal(false)
    if (type === 'modern') {
      onAdd()
    } else if (onAddHistorical) {
      onAddHistorical()
    }
  }

  const handleTabChange = (tab: ActiveTab) => {
    onTabChange(tab)
  }

  return (
    <>
      <S.ListPane $inHistory={inHistory}>
        <S.ControlsRow>
          <S.ControlsLeft>
            <S.TabBar>
              <S.TabButton
                $active={activeTab === 'dashboard'}
                onClick={() => handleTabChange('dashboard')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"
                    fill="currentColor"
                  />
                </svg>
                대시보드
              </S.TabButton>
              <S.TabButton
                $active={activeTab === 'list'}
                onClick={() => handleTabChange('list')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"
                    fill="currentColor"
                  />
                </svg>
                국가 목록
                <S.TabBadge>{countries.length}</S.TabBadge>
              </S.TabButton>
            </S.TabBar>
          </S.ControlsLeft>
          <S.ControlsRight>
            <S.AddIconButton onClick={handleAddClick} title="국가 등록">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
                  fill="currentColor"
                />
              </svg>
            </S.AddIconButton>
          </S.ControlsRight>
        </S.ControlsRow>

        {activeTab === 'list' && (
          <S.FilterRow>
            <S.FilterWrapper>
              <S.SearchWrapper>
                <S.SearchIcon>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                      fill="currentColor"
                    />
                  </svg>
                </S.SearchIcon>
                <S.SearchInput
                  type="text"
                  placeholder="국가 검색..."
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                />
                {query && (
                  <S.ClearButton onClick={() => onQueryChange('')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                        fill="currentColor"
                      />
                    </svg>
                  </S.ClearButton>
                )}
              </S.SearchWrapper>
              <S.FilterButton
                onClick={() => setShowCountryTypeModal?.(true)}
                $active={countryTypeFilter !== 'all'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
                    fill="currentColor"
                  />
                </svg>
                {COUNTRY_TYPE_LABELS[countryTypeFilter]}
              </S.FilterButton>
              <S.FilterButton
                onClick={() => setShowContinentModal(true)}
                $active={!!continentFilter}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                    fill="currentColor"
                  />
                </svg>
                {continentFilter
                  ? continents.find(
                      (continent) => continent.id === continentFilter,
                    )?.name || '대륙'
                  : '대륙'}
              </S.FilterButton>
              <S.FilterButton onClick={() => setShowSortModal(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"
                    fill="currentColor"
                  />
                </svg>
                {sortBy === 'name'
                  ? '이름순'
                  : sortBy === 'population'
                    ? '인구순'
                    : '면적순'}
              </S.FilterButton>
            </S.FilterWrapper>
            {(query || continentFilter) && (
              <S.ClearAllFiltersButton onClick={handleClearFilters}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                    fill="currentColor"
                  />
                </svg>
                초기화
              </S.ClearAllFiltersButton>
            )}
          </S.FilterRow>
        )}

        {activeTab === 'dashboard' ? (
          <S.DashboardSummary>
            <S.SummaryCard>
              <S.SummaryIcon>🌍</S.SummaryIcon>
              <S.SummaryValue>{countries.length}</S.SummaryValue>
              <S.SummaryLabel>총 국가</S.SummaryLabel>
            </S.SummaryCard>

            <S.SummaryCard>
              <S.SummaryIcon>🏛️</S.SummaryIcon>
              <S.SummaryValue>
                {
                  filtered.filter((country) => country.type === 'historical')
                    .length
                }
              </S.SummaryValue>
              <S.SummaryLabel>역사적 국가</S.SummaryLabel>
            </S.SummaryCard>

            <S.SummaryCard>
              <S.SummaryIcon>🏳️</S.SummaryIcon>
              <S.SummaryValue>
                {filtered.filter((country) => country.type === 'modern').length}
              </S.SummaryValue>
              <S.SummaryLabel>현대 국가</S.SummaryLabel>
            </S.SummaryCard>

            <S.SummaryCard>
              <S.SummaryIcon>👥</S.SummaryIcon>
              <S.SummaryValue>
                {Math.round(
                  filtered
                    .filter(
                      (country) =>
                        country.type === 'modern' && country.population,
                    )
                    .reduce(
                      (sum, country) => sum + (Number(country.population) || 0),
                      0,
                    ) / 1_000_000_000,
                )}
                B
              </S.SummaryValue>
              <S.SummaryLabel>총 인구</S.SummaryLabel>
            </S.SummaryCard>
          </S.DashboardSummary>
        ) : (
          <>
            {(query || continentFilter) && (
              <S.FilterResultBar>
                <S.FilterResultText>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                      fill="currentColor"
                    />
                  </svg>
                  <S.FilterResultCount>{filtered.length}</S.FilterResultCount>
                  개의 국가 발견
                </S.FilterResultText>
              </S.FilterResultBar>
            )}

            <S.ListContainer>
              <S.VirtualList ref={listRef}>
                {filtered.length === 0 ? (
                  <S.EmptyFilterState>
                    <S.EmptyFilterIcon>🔍</S.EmptyFilterIcon>
                    <S.EmptyFilterTitle>
                      {query
                        ? '일치하는 국가가 없어요'
                        : '등록된 국가가 없어요'}
                    </S.EmptyFilterTitle>
                    <S.EmptyFilterText>
                      {query && (
                        <>
                          <strong>"{query}"</strong> 검색어와 일치하는 국가를
                          찾지 못했어요.
                          <br />
                          다른 검색어를 시도하거나 새 국가를 등록해보세요.
                        </>
                      )}
                      {!query && continentFilter && (
                        <>
                          선택한 대륙에 등록된 국가가 없어요.
                          <br />
                          필터를 초기화하거나 새 국가를 등록해보세요.
                        </>
                      )}
                      {!query && !continentFilter && (
                        <>
                          아직 등록된 국가가 없어요.
                          <br />첫 국가를 등록해서 시작해보세요.
                        </>
                      )}
                    </S.EmptyFilterText>
                    <S.EmptyFilterActions>
                      <S.AddButton onClick={onAdd}>
                        <S.AddButtonIcon>➕</S.AddButtonIcon>새 국가 등록
                      </S.AddButton>
                    </S.EmptyFilterActions>
                  </S.EmptyFilterState>
                ) : (
                  filtered.map((country) => (
                    <React.Fragment key={country.id}>
                      <S.ListRow
                        id={`country-${country.id}`}
                        $active={country.id === selectedId}
                        onClick={() => onSelect(country.id)}
                        onDoubleClick={() => {
                          if (
                            country.type === 'historical' &&
                            onEditHistorical
                          ) {
                            onEditHistorical(country)
                          }
                        }}
                      >
                        <S.RowTop>
                          <S.RowLeft>
                            {country.type === 'modern' &&
                            country.historicalCountries &&
                            country.historicalCountries.length > 0 ? (
                              <S.ExpandButton
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleExpand(country.id)
                                }}
                                aria-label={
                                  expandedCountries.has(country.id)
                                    ? '접기'
                                    : '펼치기'
                                }
                              >
                                {expandedCountries.has(country.id) ? '▼' : '▶'}
                              </S.ExpandButton>
                            ) : (
                              <S.RowCheckbox
                                aria-hidden
                                style={{ visibility: 'hidden' }}
                              />
                            )}
                            <S.StarIcon aria-hidden>☆</S.StarIcon>
                            {country.thumbnailUrl ? (
                              <div
                                style={{
                                  width: 'clamp(24px, 5vw, 32px)',
                                  height: 'clamp(24px, 5vw, 32px)',
                                  borderRadius: '50%',
                                  overflow: 'hidden',
                                  flexShrink: 0,
                                  border: '1px solid #e5e7eb',
                                  background: '#f9fafb',
                                }}
                              >
                                <img
                                  src={country.thumbnailUrl}
                                  alt={country.name}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    display: 'block',
                                  }}
                                />
                              </div>
                            ) : (
                              <S.FlagBadge>
                                {country.type === 'modern'
                                  ? country.flagEmoji || '🏳️'
                                  : '🏛️'}
                              </S.FlagBadge>
                            )}
                            <S.TextCol>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 'clamp(4px, 1vw, 6px)',
                                }}
                              >
                                <S.CodeText $unread={!country.isoCode}>
                                  {country.name}
                                </S.CodeText>
                                {country.type === 'modern' &&
                                  country.historicalCountries &&
                                  country.historicalCountries.length > 0 && (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minWidth: 'clamp(16px, 3vw, 18px)',
                                        height: 'clamp(16px, 3vw, 18px)',
                                        padding: '0 clamp(3px, 1vw, 5px)',
                                        fontSize: 'clamp(9px, 2vw, 10px)',
                                        fontWeight: '600',
                                        color: '#6366f1',
                                        backgroundColor: '#eef2ff',
                                        borderRadius: '9px',
                                        border: '1px solid #c7d2fe',
                                        flexShrink: 0,
                                      }}
                                    >
                                      {country.historicalCountries.length}
                                    </span>
                                  )}
                              </div>
                              <S.NameText>
                                {country.type === 'modern' ? (
                                  <>
                                    {country.isoCode || '-'} ·{' '}
                                    {country.capital || '수도 미상'}
                                  </>
                                ) : (
                                  <>
                                    {country.enName || '-'}
                                    {country.startYear &&
                                      ` · ${country.startYear}`}
                                    {country.endYear && `-${country.endYear}`}
                                  </>
                                )}
                              </S.NameText>
                            </S.TextCol>
                          </S.RowLeft>
                          <S.RowRight>
                            <S.AttachmentDot aria-hidden />
                            <S.TimeText>
                              {country.type === 'historical' ? '역사' : '현대'}
                            </S.TimeText>
                            <S.RadioDot $active={country.id === selectedId} />
                          </S.RowRight>
                        </S.RowTop>
                        <S.RowBottom>
                          <S.Meta>
                            {typeof country.population === 'number' && (
                              <span>
                                {Math.round(
                                  country.population / 1_000_000,
                                ).toLocaleString()}
                                M
                              </span>
                            )}
                            <S.Dot />
                            {typeof country.areaSqKm === 'number' && (
                              <span>
                                {Math.round(country.areaSqKm).toLocaleString()}{' '}
                                km²
                              </span>
                            )}
                          </S.Meta>
                        </S.RowBottom>
                      </S.ListRow>

                      {/* 역사 국가 하위 항목 */}
                      <AnimatePresence>
                        {country.type === 'modern' &&
                          expandedCountries.has(country.id) &&
                          country.historicalCountries?.map(
                            (historical, index) => (
                              <motion.div
                                key={historical.id}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{
                                  duration: 0.12,
                                  delay: index * 0.015,
                                  ease: 'easeInOut',
                                }}
                              >
                                <S.ListRow
                                  $active={historical.id === selectedId}
                                  onClick={() => {
                                    onSelect(historical.id)
                                  }}
                                  className="historical-sub-item"
                                  style={{
                                    background:
                                      historical.id === selectedId
                                        ? '#f3e8ff'
                                        : '#f9fafb',
                                    borderLeft:
                                      historical.id === selectedId
                                        ? '3px solid #8b5cf6'
                                        : '3px solid #e5e7eb',
                                  }}
                                >
                                  <S.RowTop>
                                    <S.RowLeft
                                      style={{
                                        paddingLeft: 'clamp(20px, 5vw, 42px)',
                                      }}
                                    >
                                      <S.StarIcon
                                        aria-hidden
                                        style={{ visibility: 'hidden' }}
                                      >
                                        ☆
                                      </S.StarIcon>
                                      {historical.thumbnailUrl ? (
                                        <div
                                          style={{
                                            width: 'clamp(24px, 5vw, 28px)',
                                            height: 'clamp(24px, 5vw, 28px)',
                                            borderRadius: '50%',
                                            overflow: 'hidden',
                                            flexShrink: 0,
                                            border: '1px solid #e5e7eb',
                                            background: '#ffffff',
                                          }}
                                        >
                                          <img
                                            src={historical.thumbnailUrl}
                                            alt={historical.name}
                                            style={{
                                              width: '100%',
                                              height: '100%',
                                              objectFit: 'cover',
                                              display: 'block',
                                            }}
                                          />
                                        </div>
                                      ) : (
                                        <div
                                          style={{
                                            width: 'clamp(24px, 5vw, 28px)',
                                            height: 'clamp(24px, 5vw, 28px)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 'clamp(14px, 3vw, 16px)',
                                            flexShrink: 0,
                                          }}
                                        >
                                          🏛️
                                        </div>
                                      )}
                                      <S.TextCol>
                                        <S.CodeText
                                          $unread={false}
                                          style={{
                                            fontSize:
                                              'clamp(12px, 2.5vw, 13px)',
                                          }}
                                        >
                                          {historical.name}
                                        </S.CodeText>
                                        <S.NameText
                                          style={{
                                            fontSize: 'clamp(10px, 2vw, 11px)',
                                            color: '#9ca3af',
                                          }}
                                        >
                                          {historical.enName || '-'}
                                          {historical.startYear &&
                                            ` · ${historical.startYear}`}
                                          {historical.endYear &&
                                            `-${historical.endYear}`}
                                        </S.NameText>
                                      </S.TextCol>
                                    </S.RowLeft>
                                    <S.RowRight>
                                      <S.TimeText
                                        style={{
                                          fontSize: 'clamp(10px, 2vw, 11px)',
                                        }}
                                      >
                                        역사
                                      </S.TimeText>
                                    </S.RowRight>
                                  </S.RowTop>
                                </S.ListRow>
                              </motion.div>
                            ),
                          )}
                      </AnimatePresence>
                    </React.Fragment>
                  ))
                )}
              </S.VirtualList>
            </S.ListContainer>
          </>
        )}
      </S.ListPane>

      {/* 국가 타입 선택 모달 - Portal로 body에 렌더링 */}
      {showAddTypeModal
        ? createPortal(
            <>
              <S.SelectModalOverlay
                as={motion.div}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setShowAddTypeModal(false)}
              />
              <S.SelectModal
                as={motion.div}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <S.SelectModalHeader>
                  <S.SelectModalTitle>등록할 국가 타입</S.SelectModalTitle>
                  <S.SelectModalClose
                    onClick={() => setShowAddTypeModal(false)}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                        fill="currentColor"
                      />
                    </svg>
                  </S.SelectModalClose>
                </S.SelectModalHeader>
                <S.SelectModalContent>
                  <S.SelectOption onClick={() => handleSelectAddType('modern')}>
                    <S.SelectOptionIcon>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2c1.7 0 3.25.62 4.45 1.64-.53.18-1.12.36-1.45.36-1 0-2-.5-3.5-.5-.86 0-1.6.17-2.22.44C9.73 4.67 10.83 4 12 4z"
                          fill="currentColor"
                        />
                      </svg>
                    </S.SelectOptionIcon>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>현대 국가</span>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        현재 존재하는 국가 (ISO 코드, 대륙, 수도 등)
                      </span>
                    </div>
                  </S.SelectOption>
                  <S.SelectOption
                    onClick={() => handleSelectAddType('historical')}
                  >
                    <S.SelectOptionIcon>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"
                          fill="currentColor"
                        />
                      </svg>
                    </S.SelectOptionIcon>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>역사적 국가</span>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        과거에 존재했던 국가 (왕조, 제국, 존속 기간 등)
                      </span>
                    </div>
                  </S.SelectOption>
                </S.SelectModalContent>
              </S.SelectModal>
            </>,
            document.body,
          )
        : null}
    </>
  )
}
