import { motion, AnimatePresence } from 'framer-motion'
import { FiCheck, FiList, FiPlus, FiSearch, FiX } from 'react-icons/fi'

import { useCountryListState } from '@/widgets/country/country-list/country-list-state.context'

import * as PageS from './country-mobile-ui.styles'
import * as ListS from '@/widgets/country/country-list/ui/country-list.styles'

interface CountryMobileUIProps {
  isMobileListOpen: boolean
  onMobileListOpenChange: (open: boolean) => void
  selectedId: string | null
  onSelectCountry: (id: string) => void
  onAddCountry: () => void
}

export function CountryMobileUI({
  isMobileListOpen,
  onMobileListOpenChange,
  selectedId,
  onSelectCountry,
  onAddCountry,
}: CountryMobileUIProps) {
  // 검색·필터·정렬 등 리스트 상태는 모두 컨텍스트에서 — 데스크톱 리스트와 단일 진실의 원천 공유.
  const {
    filtered,
    continents,
    query,
    setQuery: onQueryChange,
    continentFilter,
    setContinentFilter: onContinentFilterChange,
    sortBy,
    setSortBy: onSortByChange,
  } = useCountryListState()
  return (
    <>
      {/* Mobile View Switcher */}
      <PageS.MobileViewSwitcher>
        <PageS.ViewSwitchButton $active onClick={() => onMobileListOpenChange(true)}>
          <FiList size={18} />
          목록
        </PageS.ViewSwitchButton>
      </PageS.MobileViewSwitcher>

      {/* Mobile List Overlay */}
      <AnimatePresence>
        {isMobileListOpen && (
          <>
            <PageS.MobileListOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => onMobileListOpenChange(false)}
            />
            <PageS.MobileListPane
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(_e, info: { offset: { y: number } }) => {
                if (info.offset.y > 150) {
                  onMobileListOpenChange(false)
                }
              }}
            >
              <PageS.MobileListHeader>
                <PageS.DragHandle />
                <PageS.MobileListTitleRow>
                  <PageS.MobileListTitle>메뉴</PageS.MobileListTitle>
                  <PageS.MobileListClose
                    onClick={() => onMobileListOpenChange(false)}
                    aria-label="목록 닫기"
                  >
                    <FiX size={22} />
                  </PageS.MobileListClose>
                </PageS.MobileListTitleRow>
                <PageS.MobileTabBar>
                  <PageS.MobileTabButton $active>
                    <FiList size={18} />
                    국가 목록
                    {/* 배지는 검색·필터 후 결과 수와 일치 — 사용자가 보는 행 수와 동기 */}
                    <PageS.MobileTabBadge>{filtered.length}</PageS.MobileTabBadge>
                  </PageS.MobileTabButton>
                </PageS.MobileTabBar>
                <PageS.MobileActionRow>
                  <PageS.MobileAddButton
                    onClick={() => {
                      onAddCountry()
                      onMobileListOpenChange(false)
                    }}
                  >
                    <FiPlus size={18} />
                    새 국가 등록
                  </PageS.MobileAddButton>
                </PageS.MobileActionRow>
                <PageS.MobileListSearchRow>
                  <PageS.MobileSearchWrapper>
                    <ListS.SearchIcon>
                      <FiSearch size={18} />
                    </ListS.SearchIcon>
                    <ListS.SearchInput
                      type="text"
                      placeholder="국가 검색..."
                      value={query}
                      onChange={(e) => onQueryChange(e.target.value)}
                    />
                    {query && (
                      <ListS.ClearButton
                        onClick={() => onQueryChange('')}
                        aria-label="검색어 지우기"
                      >
                        <FiX size={14} />
                      </ListS.ClearButton>
                    )}
                  </PageS.MobileSearchWrapper>
                  <PageS.MobileFilterRow>
                    <ListS.FilterSelect
                      value={continentFilter}
                      onChange={(e) => onContinentFilterChange(e.target.value)}
                      $active={!!continentFilter}
                      aria-label="대륙"
                    >
                      <option value="">대륙 전체</option>
                      {continents.map((continent) => (
                        <option key={continent.id} value={continent.id}>
                          {continent.name}
                        </option>
                      ))}
                    </ListS.FilterSelect>
                    <ListS.FilterSelect
                      value={sortBy}
                      onChange={(e) =>
                        onSortByChange(
                          e.target.value as 'name' | 'population' | 'area',
                        )
                      }
                      aria-label="정렬"
                    >
                      <option value="name">이름순</option>
                      <option value="population">인구순</option>
                      <option value="area">면적순</option>
                    </ListS.FilterSelect>
                    {(query || continentFilter) && (
                      <PageS.MobileClearButton
                        onClick={() => {
                          onQueryChange('')
                          onContinentFilterChange('')
                        }}
                      >
                        초기화
                      </PageS.MobileClearButton>
                    )}
                  </PageS.MobileFilterRow>
                </PageS.MobileListSearchRow>
              </PageS.MobileListHeader>
              {(query || continentFilter) && (
                <ListS.FilterResultBar>
                  <ListS.FilterResultText>
                    <FiCheck size={16} />
                    <ListS.FilterResultCount>{filtered.length}</ListS.FilterResultCount>
                    개의 국가 발견
                  </ListS.FilterResultText>
                </ListS.FilterResultBar>
              )}
              <ListS.ListContainer>
                <ListS.VirtualList>
                  {filtered.length === 0 ? (
                    <ListS.EmptyFilterState>
                      <ListS.EmptyFilterIcon>🔍</ListS.EmptyFilterIcon>
                      <ListS.EmptyFilterTitle>
                        {query
                          ? '일치하는 국가가 없어요'
                          : '등록된 국가가 없어요'}
                      </ListS.EmptyFilterTitle>
                      <ListS.EmptyFilterText>
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
                      </ListS.EmptyFilterText>
                      <ListS.EmptyFilterActions>
                        <ListS.AddButton onClick={onAddCountry}>
                          <ListS.AddButtonIcon>
                            <FiPlus size={14} />
                          </ListS.AddButtonIcon>
                          새 국가 등록
                        </ListS.AddButton>
                      </ListS.EmptyFilterActions>
                    </ListS.EmptyFilterState>
                  ) : (
                    filtered.map((country) => (
                      <ListS.ListRow
                        key={country.id}
                        $active={country.id === selectedId}
                        onClick={() => {
                          onSelectCountry(country.id)
                          onMobileListOpenChange(false)
                        }}
                      >
                        <ListS.RowTop>
                          <ListS.RowLeft>
                            <ListS.FlagBadge>
                              {country.flagEmoji || '🏳️'}
                            </ListS.FlagBadge>
                            <ListS.TextCol>
                              <ListS.CodeText $unread={!country.isoCode}>
                                {country.name}
                              </ListS.CodeText>
                              <ListS.NameText>
                                {country.isoCode || '-'} ·{' '}
                                {country.capital || '수도 미상'}
                              </ListS.NameText>
                            </ListS.TextCol>
                          </ListS.RowLeft>
                        </ListS.RowTop>
                        <ListS.RowBottom>
                          <ListS.Meta>
                            {country.population != null && (
                              <span>인구 {country.population.toLocaleString()}</span>
                            )}
                            {country.population != null &&
                              country.areaSqKm != null && <ListS.Dot />}
                            {country.areaSqKm != null && (
                              <span>면적 {country.areaSqKm.toLocaleString()}km²</span>
                            )}
                          </ListS.Meta>
                        </ListS.RowBottom>
                      </ListS.ListRow>
                    ))
                  )}
                </ListS.VirtualList>
              </ListS.ListContainer>
            </PageS.MobileListPane>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
