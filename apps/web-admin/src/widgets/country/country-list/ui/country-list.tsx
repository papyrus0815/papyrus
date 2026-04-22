import React, { useEffect } from 'react'

import { createPortal } from 'react-dom'

import { AnimatePresence, motion } from 'framer-motion'

import {
  COUNTRY_TYPE_LABELS,
  type UnifiedCountry,
} from '@/entities/country/model/unified-types'
import { getUploadImageUrl } from '@/shared/api/upload'
import { UnderlineTabButton } from '@/shared/ui/underline-tabs'
import { IconPeople } from '@/widgets/history-shell/model/dashboard-menu-items'

import { useCountryListState } from '../country-list-state.context'
import * as S from './country-list.styles'
import { PersonRegisterViewModal } from './person-register-view-modal'

export type SortBy = 'name' | 'population' | 'area'

interface CountryListProps {
  selectedId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
  /** 역사적 국가 폼 열기. preset이 있으면 막부 등 미리 채움 */
  onAddHistorical?: (preset?: {
    stateType: 'SHOGUNATE'
    entityKind: 'REGIME'
  }) => void
  onEditHistorical?: (country: UnifiedCountry) => void
  showContinentModal: boolean
  setShowContinentModal: (v: boolean) => void
  showSortModal: boolean
  setShowSortModal: (v: boolean) => void
  showCountryTypeModal: boolean
  setShowCountryTypeModal: (v: boolean) => void
  /** 좌측 패널 접기 상태 */
  collapsed?: boolean
  /** 접기/펼치기 토글 핸들러 */
  onToggleCollapse?: () => void
}

function CountryListInner({
  selectedId,
  onSelect,
  onAdd,
  onAddHistorical,
  onEditHistorical,
  showContinentModal,
  setShowContinentModal,
  showSortModal,
  setShowSortModal,
  showCountryTypeModal,
  setShowCountryTypeModal,
  collapsed = false,
  onToggleCollapse,
}: CountryListProps) {
  const {
    countries,
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
    showPersonRegisterModal,
    setShowPersonRegisterModal,
  } = useCountryListState()
  const [showAddTypeModal, setShowAddTypeModal] = React.useState(false)
  const [expandedCountries, setExpandedCountries] = React.useState<Set<string>>(
    new Set(),
  )
  const listRef = React.useRef<HTMLDivElement>(null)

  // 대륙별로 그룹화 (현대 국가만; continentId 기준). 과거만 선택 시 단일 그룹으로 플랫 목록
  const groupedByContinent = React.useMemo(() => {
    // 과거(역사적)만 선택된 경우: 그룹 없이 단일 섹션으로 표시
    if (countryTypeFilter === 'historical') {
      if (filtered.length === 0) return []
      return [
        {
          continentId: '__historical__',
          name: '과거 국가',
          countries: filtered,
        },
      ]
    }
    const groups = new Map<string, typeof filtered>()
    const UNKNOWN = '__unknown__'
    const historicalMatches: typeof filtered = []
    for (const country of filtered) {
      if (country.type !== 'modern') {
        historicalMatches.push(country)
        continue
      }
      const key = country.continentId ?? UNKNOWN
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(country)
    }
    // continents 순서대로 정렬, 미분류는 맨 뒤
    const result: {
      continentId: string
      name: string
      countries: typeof filtered
    }[] = []
    for (const cont of continents) {
      const list = groups.get(cont.id)
      if (list?.length)
        result.push({ continentId: cont.id, name: cont.name, countries: list })
    }
    const unknownList = groups.get('__unknown__')
    if (unknownList?.length) {
      result.push({
        continentId: '__unknown__',
        name: '미분류',
        countries: unknownList,
      })
    }
    // 검색으로 매칭된 역사적 국가가 있으면 별도 섹션으로 추가
    if (historicalMatches.length > 0) {
      result.push({
        continentId: '__historical__',
        name: '과거 국가',
        countries: historicalMatches,
      })
    }
    return result
  }, [filtered, continents, countryTypeFilter])

  // 액티브 국가가 변경되면 자동으로 펼치기
  useEffect(() => {
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
    onCountryTypeFilterChange('all')
  }

  const handleAddClick = () => {
    setShowAddTypeModal(true)
  }

  const handleSelectAddType = (type: 'modern' | 'historical' | 'person') => {
    setShowAddTypeModal(false)
    if (type === 'modern') {
      onAdd()
    } else if (type === 'historical' && onAddHistorical) {
      onAddHistorical()
    } else if (type === 'person') {
      setShowPersonRegisterModal(true)
    }
  }

  return (
    <>
      <S.ListPaneWrapper>
        <S.ListPane $collapsed={collapsed}>
          {!collapsed && (
            <>
              <S.ControlsRow>
                <S.ControlsLeft>
                  <S.SidebarModeTabNav aria-label="국가 목록">
                    <UnderlineTabButton as="div" $active>
                      국가 목록
                      <S.SidebarTabCount $active>
                        {countries.length}
                      </S.SidebarTabCount>
                    </UnderlineTabButton>
                  </S.SidebarModeTabNav>
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

              <S.FilterRow>
                  <S.FilterWrapper>
                    <S.SearchWrapper>
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
                    </S.SearchWrapper>
                    <S.FilterButton
                      onClick={() => setShowCountryTypeModal?.(true)}
                      $active={countryTypeFilter !== 'all'}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
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
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
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
                      <svg
                        width="18"
                        height="18"
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
                          ? '인구순,'
                          : '면적순'}
                    </S.FilterButton>
                  </S.FilterWrapper>
                  {(query ||
                    continentFilter ||
                    countryTypeFilter !== 'all') && (
                    <S.ClearAllFiltersButton onClick={handleClearFilters}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                          fill="currentColor"
                        />
                      </svg>
                      초기화
                    </S.ClearAllFiltersButton>
                  )}
                </S.FilterRow>

              <S.SidebarTabBody>
                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                      key="list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      style={{
                        width: '100%',
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          minHeight: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                        }}
                      >
                        {(query ||
                          continentFilter ||
                          countryTypeFilter !== 'all') && (
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
                          <S.VirtualList ref={listRef}>
                            {filtered.length === 0 ? (
                              <S.EmptyFilterState>
                                <S.EmptyFilterIcon>🔍</S.EmptyFilterIcon>
                                <S.EmptyFilterTitle>
                                  {query
                                    ? '일치하는 국가가 없어요'
                                    : countryTypeFilter === 'historical'
                                      ? '등록된 과거 국가가 없어요'
                                      : countryTypeFilter === 'modern'
                                        ? '등록된 현대 국가가 없어요'
                                        : '등록된 국가가 없어요'}
                                </S.EmptyFilterTitle>
                                <S.EmptyFilterText>
                                  {query && (
                                    <>
                                      <strong>"{query}"</strong> 검색어와
                                      일치하는 국가를 찾지 못했어요.
                                      <br />
                                      다른 검색어를 시도하거나 새 국가를
                                      등록해보세요.
                                    </>
                                  )}
                                  {!query && continentFilter && (
                                    <>
                                      선택한 대륙에 등록된 국가가 없어요.
                                      <br />
                                      필터를 초기화하거나 새 국가를
                                      등록해보세요.
                                    </>
                                  )}
                                  {!query &&
                                    countryTypeFilter === 'historical' && (
                                      <>
                                        과거(역사적) 국가를 등록한 뒤, 현대 국가
                                        편집에서 &quot;연결할 현대 국가&quot;로
                                        지정하면 여기에 표시됩니다.
                                        <br />
                                        필터를 초기화하면 현대 국가 목록을 볼 수
                                        있어요.
                                      </>
                                    )}
                                  {!query &&
                                    !continentFilter &&
                                    countryTypeFilter !== 'historical' && (
                                      <>
                                        아직 등록된 국가가 없어요.
                                        <br />첫 국가를 등록해서 시작해보세요.
                                      </>
                                    )}
                                </S.EmptyFilterText>
                                <S.EmptyFilterActions>
                                  <S.AddButton onClick={onAdd}>
                                    <S.AddButtonIcon>➕</S.AddButtonIcon>새 국가
                                    등록
                                  </S.AddButton>
                                </S.EmptyFilterActions>
                              </S.EmptyFilterState>
                            ) : (
                              groupedByContinent.map((group) => (
                                <React.Fragment key={group.continentId}>
                                  <S.ContinentSectionHeader>
                                    {group.name}
                                  </S.ContinentSectionHeader>
                                  {group.countries.map((country) => (
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
                                            country.historicalCountries.length >
                                              0 ? (
                                              <S.ExpandButton
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  toggleExpand(country.id)
                                                }}
                                                aria-label={
                                                  expandedCountries.has(
                                                    country.id,
                                                  )
                                                    ? '접기'
                                                    : '펼치기'
                                                }
                                              >
                                                {expandedCountries.has(
                                                  country.id,
                                                )
                                                  ? '▼'
                                                  : '▶'}
                                              </S.ExpandButton>
                                            ) : (
                                              <S.RowCheckbox
                                                aria-hidden
                                                style={{ visibility: 'hidden' }}
                                              />
                                            )}
                                            <S.StarIcon aria-hidden>
                                              ☆
                                            </S.StarIcon>
                                            {country.thumbnailUrl ? (
                                              <S.ThumbnailAvatar>
                                                <img
                                                  src={getUploadImageUrl(
                                                    country.thumbnailUrl,
                                                  )}
                                                  alt={country.name}
                                                />
                                              </S.ThumbnailAvatar>
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
                                                <S.CodeText
                                                  $unread={!country.isoCode}
                                                >
                                                  {country.name}
                                                </S.CodeText>
                                                {country.type === 'modern' &&
                                                  country.historicalCountries &&
                                                  country.historicalCountries
                                                    .length > 0 && (
                                                    <S.HistoricalCountBadge>
                                                      {
                                                        country
                                                          .historicalCountries
                                                          .length
                                                      }
                                                    </S.HistoricalCountBadge>
                                                  )}
                                              </div>
                                              <S.NameText>
                                                {country.type === 'modern' ? (
                                                  <>
                                                    {country.isoCode || '-'} ·{' '}
                                                    {country.capital ||
                                                      '수도 미상'}
                                                  </>
                                                ) : (
                                                  <>
                                                    {country.enName || '-'}
                                                    {country.startYear &&
                                                      ` · ${country.startYear}`}
                                                    {country.endYear &&
                                                      `-${country.endYear}`}
                                                  </>
                                                )}
                                              </S.NameText>
                                            </S.TextCol>
                                          </S.RowLeft>
                                          <S.RowRight>
                                            <S.AttachmentDot aria-hidden />
                                            <S.TimeText>
                                              {country.type === 'historical'
                                                ? '역사'
                                                : '현대'}
                                            </S.TimeText>
                                            <S.RadioDot
                                              $active={
                                                country.id === selectedId
                                              }
                                            />
                                          </S.RowRight>
                                        </S.RowTop>
                                        <S.RowBottom>
                                          <S.Meta>
                                            {typeof country.population ===
                                              'number' && (
                                              <span>
                                                {Math.round(
                                                  country.population /
                                                    1_000_000,
                                                ).toLocaleString()}
                                                M
                                              </span>
                                            )}
                                            <S.Dot />
                                            {typeof country.areaSqKm ===
                                              'number' && (
                                              <span>
                                                {Math.round(
                                                  country.areaSqKm,
                                                ).toLocaleString()}{' '}
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
                                                initial={{
                                                  opacity: 0,
                                                  height: 0,
                                                }}
                                                animate={{
                                                  opacity: 1,
                                                  height: 'auto',
                                                }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{
                                                  duration: 0.12,
                                                  delay: index * 0.015,
                                                  ease: 'easeInOut',
                                                }}
                                              >
                                                <S.ListRow
                                                  $active={
                                                    historical.id === selectedId
                                                  }
                                                  $historicalActive={
                                                    historical.id === selectedId
                                                  }
                                                  onClick={() =>
                                                    onSelect(historical.id)
                                                  }
                                                  className="historical-sub-item"
                                                >
                                                  <S.RowTop>
                                                    <S.RowLeft
                                                      style={{
                                                        paddingLeft:
                                                          'clamp(20px, 5vw, 42px)',
                                                      }}
                                                    >
                                                      <S.StarIcon
                                                        aria-hidden
                                                        style={{
                                                          visibility: 'hidden',
                                                        }}
                                                      >
                                                        ☆
                                                      </S.StarIcon>
                                                      {historical.thumbnailUrl ? (
                                                        <S.ThumbnailAvatar $size="sm">
                                                          <img
                                                            src={getUploadImageUrl(
                                                              historical.thumbnailUrl,
                                                            )}
                                                            alt={
                                                              historical.name
                                                            }
                                                          />
                                                        </S.ThumbnailAvatar>
                                                      ) : (
                                                        <div
                                                          style={{
                                                            width:
                                                              'clamp(24px, 5vw, 28px)',
                                                            height:
                                                              'clamp(24px, 5vw, 28px)',
                                                            display: 'flex',
                                                            alignItems:
                                                              'center',
                                                            justifyContent:
                                                              'center',
                                                            fontSize:
                                                              'clamp(14px, 3vw, 16px)',
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
                                                            fontSize:
                                                              'clamp(10px, 2vw, 11px)',
                                                          }}
                                                        >
                                                          {historical.enName ||
                                                            '-'}
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
                                                          fontSize:
                                                            'clamp(10px, 2vw, 11px)',
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
                                  ))}
                                </React.Fragment>
                              ))
                            )}
                          </S.VirtualList>
                        </S.ListContainer>
                      </div>
                    </motion.div>
                </AnimatePresence>
              </S.SidebarTabBody>
            </>
          )}
        </S.ListPane>
        <S.ListCollapseButton
          $collapsed={collapsed}
          onClick={onToggleCollapse}
          title={collapsed ? '펼치기' : '접기'}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </S.ListCollapseButton>
      </S.ListPaneWrapper>

      {/* 국가 타입 선택 모달 - Portal로 body에 렌더링 */}
      {showAddTypeModal
        ? createPortal(
            <S.SelectModalOverlay
              as={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setShowAddTypeModal(false)}
            >
              <S.SelectModal
                as={motion.div}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <S.SelectModalHeader>
                  <S.SelectModalTitle>등록</S.SelectModalTitle>
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
                    <S.SelectOptionTextGroup>
                      <S.SelectOptionLabel>현대 국가</S.SelectOptionLabel>
                      <S.SelectOptionDesc>
                        현재 존재하는 국가 (ISO 코드, 대륙, 수도 등)
                      </S.SelectOptionDesc>
                    </S.SelectOptionTextGroup>
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
                    <S.SelectOptionTextGroup>
                      <S.SelectOptionLabel>역사적 국가</S.SelectOptionLabel>
                      <S.SelectOptionDesc>
                        과거 국가·정권·시대 (제국, 왕국, 막부, 연호 시대 등 —
                        폼에서 형태 선택)
                      </S.SelectOptionDesc>
                    </S.SelectOptionTextGroup>
                  </S.SelectOption>
                  <S.SelectOption onClick={() => handleSelectAddType('person')}>
                    <S.SelectOptionIcon>
                      <IconPeople />
                    </S.SelectOptionIcon>
                    <S.SelectOptionTextGroup>
                      <S.SelectOptionLabel>인물</S.SelectOptionLabel>
                      <S.SelectOptionDesc>
                        역사적 인물 등록 (이름, 생몰년, 소속 국가 등)
                      </S.SelectOptionDesc>
                    </S.SelectOptionTextGroup>
                  </S.SelectOption>
                </S.SelectModalContent>
              </S.SelectModal>
            </S.SelectModalOverlay>,
            document.body,
          )
        : null}

      {/* 인물 등록 모달 - 등록 버튼 폼과 동일한 디자인 */}
      <PersonRegisterViewModal
        isOpen={showPersonRegisterModal}
        onClose={() => setShowPersonRegisterModal(false)}
        onSuccess={() => setShowPersonRegisterModal(false)}
      />
    </>
  )
}

export const CountryList = React.memo(CountryListInner)
