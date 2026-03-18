import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { type Country, type ContinentOption } from '@/entities/country/api'
import { type UnifiedCountry } from '@/entities/country/model/unified-types'
import { useCountryListState } from '@/widgets/country/country-list/country-list-state.context'
import * as PageS from '@/pages/history/country/country-page.styles'
import * as ListS from '@/widgets/country/country-list/ui/country-list.styles'

// 두 스타일 모듈을 합쳐서 S.*로 사용 가능하도록
const S = { ...PageS, ...ListS }

interface CountryMobileUIProps {
  activeTab: 'dashboard' | 'list'
  onTabChange: (tab: 'dashboard' | 'list') => void
  isMobileListOpen: boolean
  onMobileListOpenChange: (open: boolean) => void
  selectedId: string | null
  onSelectCountry: (id: string) => void
  onShowContinentModal: () => void
  onShowSortModal: () => void
  onAddCountry: () => void
  inHistory: boolean
  countries?: Country[]
  filtered?: UnifiedCountry[]
  continents?: ContinentOption[]
  query?: string
  onQueryChange?: (query: string) => void
  continentFilter?: string
  onContinentFilterChange?: (filter: string) => void
  sortBy?: 'name' | 'population' | 'area'
  onSortByChange?: (sort: 'name' | 'population' | 'area') => void
}

export function CountryMobileUI({
  activeTab,
  onTabChange,
  isMobileListOpen,
  onMobileListOpenChange,
  selectedId,
  onSelectCountry,
  onShowContinentModal,
  onShowSortModal,
  onAddCountry,
  inHistory,
}: CountryMobileUIProps) {
  const listState = useCountryListState()
  const {
    countries,
    filtered,
    continents,
    query,
    setQuery: onQueryChange,
    continentFilter,
    setContinentFilter: onContinentFilterChange,
    sortBy,
    setSortBy: onSortByChange,
  } = listState
  return (
    <>
      {/* Mobile View Switcher */}
      <S.MobileViewSwitcher>
        <S.ViewSwitchButton
          $active={activeTab === 'dashboard'}
          onClick={() => {
            onTabChange('dashboard')
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
          </svg>
          대시보드
        </S.ViewSwitchButton>
        <S.ViewSwitchButton
          $active={activeTab === 'list'}
          onClick={() => onMobileListOpenChange(true)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
          </svg>
          목록
        </S.ViewSwitchButton>
      </S.MobileViewSwitcher>

      {/* Mobile List Overlay */}
      <AnimatePresence>
        {isMobileListOpen && (
          <>
            <S.MobileListOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => onMobileListOpenChange(false)}
            />
            <S.MobileListPane
              as={motion.div}
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, info) => {
                if (info.offset.y > 150) {
                  onMobileListOpenChange(false)
                }
              }}
              $inHistory={inHistory}
            >
              <S.MobileListHeader>
                <S.DragHandle />
                <S.MobileListTitleRow>
                  <S.MobileListTitle>메뉴</S.MobileListTitle>
                  <S.MobileListClose
                    onClick={() => onMobileListOpenChange(false)}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                        fill="currentColor"
                      />
                    </svg>
                  </S.MobileListClose>
                </S.MobileListTitleRow>
                <S.MobileTabBar>
                  <S.MobileTabButton
                    $active={activeTab === 'dashboard'}
                    onClick={() => {
                      onTabChange('dashboard')
                      onMobileListOpenChange(false)
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"
                        fill="currentColor"
                      />
                    </svg>
                    대시보드
                  </S.MobileTabButton>
                  <S.MobileTabButton
                    $active={activeTab === 'list'}
                    onClick={() => {
                      onTabChange('list')
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"
                        fill="currentColor"
                      />
                    </svg>
                    국가 목록
                    <S.MobileTabBadge>{countries.length}</S.MobileTabBadge>
                  </S.MobileTabButton>
                </S.MobileTabBar>
                <S.MobileActionRow>
                  <S.MobileAddButton
                    onClick={() => {
                      onAddCountry()
                      onMobileListOpenChange(false)
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
                        fill="currentColor"
                      />
                    </svg>
                    새 국가 등록
                  </S.MobileAddButton>
                </S.MobileActionRow>
                {activeTab === 'list' && (
                  <S.MobileListSearchRow>
                    <S.MobileSearchWrapper>
                      <S.SearchIcon>
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
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
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                              fill="currentColor"
                            />
                          </svg>
                        </S.ClearButton>
                      )}
                    </S.MobileSearchWrapper>
                    <S.MobileFilterRow>
                      <S.MobileFilterButton
                        onClick={onShowContinentModal}
                        $active={!!continentFilter}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path d="M12 2l-5.5 9h11z" fill="currentColor" />
                        </svg>
                        {continentFilter
                          ? continents.find(
                              (continent) => continent.id === continentFilter,
                            )?.name || '대륙'
                          : '대륙'}
                      </S.MobileFilterButton>
                      <S.MobileFilterButton onClick={onShowSortModal}>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
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
                      </S.MobileFilterButton>
                      {(query || continentFilter) && (
                        <S.MobileClearButton
                          onClick={() => {
                            onQueryChange('')
                            onContinentFilterChange('')
                          }}
                        >
                          초기화
                        </S.MobileClearButton>
                      )}
                    </S.MobileFilterRow>
                  </S.MobileListSearchRow>
                )}
              </S.MobileListHeader>
              {activeTab === 'list' ? (
                <>
                  {(query || continentFilter) && (
                    <S.FilterResultBar>
                      <S.FilterResultText>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                            fill="currentColor"
                          />
                        </svg>
                        <S.FilterResultCount>
                          {filtered.length}
                        </S.FilterResultCount>
                        개의 국가 발견
                      </S.FilterResultText>
                    </S.FilterResultBar>
                  )}
                  <S.ListContainer>
                    <S.VirtualList>
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
                                <strong>"{query}"</strong> 검색어와 일치하는
                                국가를 찾지 못했어요.
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
                            <S.AddButton onClick={onAddCountry}>
                              <S.AddButtonIcon>➕</S.AddButtonIcon>새 국가 등록
                            </S.AddButton>
                          </S.EmptyFilterActions>
                        </S.EmptyFilterState>
                      ) : (
                        filtered.map((country) => (
                          <S.ListRow
                            key={country.id}
                            $active={country.id === selectedId}
                            onClick={() => {
                              onSelectCountry(country.id)
                              onMobileListOpenChange(false)
                            }}
                          >
                            <S.RowTop>
                              <S.RowLeft>
                                <S.RowCheckbox aria-hidden />
                                <S.StarIcon aria-hidden>☆</S.StarIcon>
                                <S.FlagBadge>
                                  {country.flagEmoji || '🏳️'}
                                </S.FlagBadge>
                                <S.TextCol>
                                  <S.CodeText $unread={!country.isoCode}>
                                    {country.name}
                                  </S.CodeText>
                                  <S.NameText>
                                    {country.isoCode || '-'} ·{' '}
                                    {country.capital || '수도 미상'}
                                  </S.NameText>
                                </S.TextCol>
                              </S.RowLeft>
                              <S.RowRight>
                                <S.AttachmentDot aria-hidden />
                                <S.TimeText>12:34</S.TimeText>
                              </S.RowRight>
                            </S.RowTop>
                            <S.RowBottom>
                              <S.Meta>
                                <span>
                                  인구 {country.population?.toLocaleString()}
                                </span>
                                <S.Dot />
                                <span>
                                  면적 {country.areaSqKm?.toLocaleString()}km²
                                </span>
                              </S.Meta>
                            </S.RowBottom>
                          </S.ListRow>
                        ))
                      )}
                    </S.VirtualList>
                  </S.ListContainer>
                </>
              ) : (
                <S.MobileDashboardInfo>
                  <S.MobileDashboardIcon>📊</S.MobileDashboardIcon>
                  <S.MobileDashboardText>
                    창을 닫으면 대시보드를 볼 수 있습니다
                  </S.MobileDashboardText>
                </S.MobileDashboardInfo>
              )}
            </S.MobileListPane>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
