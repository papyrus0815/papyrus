import { motion, AnimatePresence } from 'framer-motion'
import { FaLandmark } from 'react-icons/fa'
import { FiCheck, FiList, FiPlus, FiSearch, FiX } from 'react-icons/fi'

import {
  COUNTRY_TYPE_LABELS,
  type CountryTypeFilter,
} from '@/entities/country/model/unified-types'
import { formatCountryPeriod } from '@/shared/lib/country-period'
import { useCountryListState } from '@/widgets/country/country-list/country-list-state.context'
import { CountryListEmpty } from '@/widgets/country/country-list/ui/country-list-empty'

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
    countryTypeFilter,
    setCountryTypeFilter: onCountryTypeFilterChange,
    sortBy,
    setSortBy: onSortByChange,
  } = useCountryListState()
  // 데스크톱과 동일한 필터 활성 판정 — 유형까지 포함해 트랩(historical 잔존) 해제 가능(F10)
  const hasFilterActive =
    !!query || !!continentFilter || countryTypeFilter !== 'all'
  const handleClearFilters = () => {
    onQueryChange('')
    onContinentFilterChange('')
    onCountryTypeFilterChange('all')
  }
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
                      value={countryTypeFilter}
                      onChange={(e) =>
                        onCountryTypeFilterChange(
                          e.target.value as CountryTypeFilter,
                        )
                      }
                      $active={countryTypeFilter !== 'all'}
                      aria-label="국가 유형"
                    >
                      <option value="all">{COUNTRY_TYPE_LABELS.all}</option>
                      <option value="modern">
                        {COUNTRY_TYPE_LABELS.modern}
                      </option>
                      <option value="historical">
                        {COUNTRY_TYPE_LABELS.historical}
                      </option>
                    </ListS.FilterSelect>
                    <ListS.FilterSelect
                      value={
                        countryTypeFilter === 'historical' ? '' : continentFilter
                      }
                      onChange={(e) => onContinentFilterChange(e.target.value)}
                      $active={
                        countryTypeFilter !== 'historical' && !!continentFilter
                      }
                      disabled={countryTypeFilter === 'historical'}
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
                    {hasFilterActive && (
                      <PageS.MobileClearButton onClick={handleClearFilters}>
                        초기화
                      </PageS.MobileClearButton>
                    )}
                  </PageS.MobileFilterRow>
                </PageS.MobileListSearchRow>
              </PageS.MobileListHeader>
              {hasFilterActive && (
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
                    // 데스크톱과 동일한 빈 상태 컴포넌트 재사용 — 유형별 카피·사본 제거(F10)
                    <CountryListEmpty
                      query={query}
                      continentFilter={continentFilter}
                      countryTypeFilter={countryTypeFilter}
                      onAdd={onAddCountry}
                    />
                  ) : (
                    filtered.map((country) => {
                      // 역사 국가는 현대 전용 렌더(flagEmoji·수도·인구)로는 깨지므로 유형 분기(F10)
                      const isHistorical = country.type === 'historical'
                      const periodText = isHistorical
                        ? formatCountryPeriod(country, { variant: 'short' })
                        : ''
                      return (
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
                                {isHistorical ? (
                                  <FaLandmark size={16} />
                                ) : (
                                  country.flagEmoji || '🏳️'
                                )}
                              </ListS.FlagBadge>
                              <ListS.TextCol>
                                <ListS.CodeText $unread={false}>
                                  {country.name}
                                </ListS.CodeText>
                                <ListS.NameText>
                                  {isHistorical
                                    ? country.enName || periodText || '과거 국가'
                                    : `${country.isoCode || '-'} · ${country.capital || '수도 미상'}`}
                                </ListS.NameText>
                              </ListS.TextCol>
                            </ListS.RowLeft>
                          </ListS.RowTop>
                          <ListS.RowBottom>
                            <ListS.Meta>
                              {isHistorical ? (
                                periodText && <span>{periodText}</span>
                              ) : (
                                <>
                                  {country.population != null && (
                                    <span>
                                      인구{' '}
                                      {Number(
                                        country.population,
                                      ).toLocaleString()}
                                    </span>
                                  )}
                                  {country.population != null &&
                                    country.areaSqKm != null && <ListS.Dot />}
                                  {country.areaSqKm != null && (
                                    <span>
                                      면적 {country.areaSqKm.toLocaleString()}km²
                                    </span>
                                  )}
                                </>
                              )}
                            </ListS.Meta>
                          </ListS.RowBottom>
                        </ListS.ListRow>
                      )
                    })
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
