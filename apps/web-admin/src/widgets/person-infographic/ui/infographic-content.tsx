/**
 * 인물 목록 콘텐츠 — 검색·필터 툴바 + 뷰 전환 줄 + 결과 요약 + 뷰 디스패치.
 *
 * 크롬은 사건 목록(/events)과 같은 순서·같은 컨트롤 문법:
 *   [검색 /] [시대|지역|분야] ··· [통계] [+ 새 인물 등록]
 *   [활성 필터 칩 … 모두 해제]
 *   [뷰 세그먼트] [정렬·순서] ··· [N명 · 평균 수명 · 대표 분야]
 *
 * 뷰(matrix/galaxy/story/dynasty/stats)는 각자 별도 파일.
 * records(기록 비교) 뷰는 상위 PersonInfographicPane이 별도 분기.
 * 필터·뷰·정렬 상태는 zustand store + URL 쿼리 동기화로 공유.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { motion } from 'framer-motion'
import {
  FiArrowDown,
  FiBarChart2,
  FiClock,
  FiFilter,
  FiFlag,
  FiGlobe,
  FiGrid,
  FiLayers,
  FiList,
  FiPlus,
  FiSearch,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import { usePersonsInfographic } from '@/entities/person/api'
import { PersonRegisterViewModal } from '@/widgets/country/country-list/ui/person-register-view-modal'

import {
  colorForField,
  ERAS,
  FIELDS,
  REGION_COLORS,
  REGIONS,
} from '../model/constants'
import {
  countActiveScopes,
  usePersonInfographicFilterStore,
  type PersonGroupBy,
  type PersonInfographicView,
  type PersonSortKey,
} from '../model/filter.store'
import {
  computePersonFacetCounts,
  filterPersons,
} from '../model/filter-persons'
import { SORT_OPTIONS } from '../model/sort-helpers'
import { usePersonQueryInput } from '../model/use-person-query-input'
import { useAdaptedPersons } from '../model/use-adapted-persons'

import { PersonViewSkeleton } from './_shared/view-skeleton'
import {
  BRAND,
  Actions,
  ActiveFilterChip,
  ActiveFilterClear,
  ActiveFilterLabel,
  ActiveFiltersRow,
  DisplayOptions,
  FilterGroup,
  GhostBtn,
  IconBtn,
  PrimaryBtn,
  Search,
  SearchClear,
  SearchIcon,
  SearchInput,
  SearchKbd,
  Select,
  srOnly,
  TopBar,
  ViewMeta,
} from './_shared/catalog.styles'
import { EmptyState } from './_shared/empty-state'
import { ScopeDropdown } from './_shared/scope-dropdown'
import { EraStoryView } from './era-story-view'
import { HeaderStats, type HeaderStatsVariant } from './header-stats'
import { MatrixView } from './matrix-view'
import { StatsView } from './stats-view'

const GROUP_OPTIONS: ReadonlyArray<readonly [PersonGroupBy, string]> = [
  ['century', '세기별'],
  ['country', '국가별'],
  ['field', '분야별'],
  ['dynasty', '가문별'],
  ['none', '전체 목록'],
]

interface InfographicContentProps {
  /** 인물 클릭 — 페이지가 인물 상세 모달을 띄운다(모달의 '상세 페이지'로 상세 진입) */
  onPersonClick: (id: string) => void
  /** 뷰 전환 세그먼트 — 페인이 소유(records 분기와 공유)하고 여기서는 자리만 잡는다 */
  viewSwitcher: ReactNode
  /** 우측 상세 패널에 현재 열려 있는 인물 ID — 목록 카드 하이라이트용 */
  selectedPersonId?: string | null
  /**
   * 상세 필터 시트 열기 — 시트는 페이지가 소유한다. 예전엔 좌측 사이드바의 배지·모바일 FAB만
   * 열 수 있었는데 목록 지면에서 사이드바를 걷어 내면서 툴바로 옮겼다. 없으면 버튼을 그리지 않는다.
   */
  onOpenFilters?: () => void
}

const STATS_KEY = 'person-infographic-stats-open'

const EMPTY_SCOPES = {
  era: [] as string[],
  region: [] as string[],
  field: [] as string[],
  country: [] as string[],
}

export function InfographicContent({
  onPersonClick,
  viewSwitcher,
  selectedPersonId,
  onOpenFilters,
}: InfographicContentProps) {
  // URL ↔ store 동기화는 상위 PersonInfographicPane이 담당 (records 뷰 분기 공유)
  const { isLoading, isError, refetch } = usePersonsInfographic()
  const allPeople = useAdaptedPersons()

  const scopes = usePersonInfographicFilterStore((state) => state.scopes)
  const toggleScope = usePersonInfographicFilterStore((state) => state.toggleScope)
  const setMinInfluence = usePersonInfographicFilterStore((state) => state.setMinInfluence)
  const setAliveFilter = usePersonInfographicFilterStore((state) => state.setAliveFilter)
  const sort = usePersonInfographicFilterStore((state) => state.sort)
  const setSort = usePersonInfographicFilterStore((state) => state.setSort)
  const groupBy = usePersonInfographicFilterStore((state) => state.groupBy)
  const setGroupBy = usePersonInfographicFilterStore((state) => state.setGroupBy)
  const listLayout = usePersonInfographicFilterStore((state) => state.listLayout)
  const setListLayout = usePersonInfographicFilterStore(
    (state) => state.setListLayout,
  )
  const eraGroupOrder = usePersonInfographicFilterStore((state) => state.eraGroupOrder)
  const setEraGroupOrder = usePersonInfographicFilterStore(
    (state) => state.setEraGroupOrder,
  )
  const searchRef = useRef<HTMLInputElement>(null)
  const resetFilters = usePersonInfographicFilterStore((state) => state.resetFilters)
  const view = usePersonInfographicFilterStore((state) => state.view)
  // 검색 입력은 로컬 즉시 반영 + 디바운스 커밋 — 좌측 인물 목록 사이드바의 검색창과 같은 훅을
  // 쓴다(각자 동기화 쌍을 들면 서로 되돌리며 무한 루프가 난다).
  const {
    input: searchInput,
    setInput: setSearchInput,
    query: dq,
  } = usePersonQueryInput()
  const minInfluence = usePersonInfographicFilterStore((state) => state.minInfluence)
  const aliveFilter = usePersonInfographicFilterStore((state) => state.aliveFilter)
  const pinnedList = usePersonInfographicFilterStore((state) => state.pinned)
  const storeTogglePin = usePersonInfographicFilterStore((state) => state.togglePin)

  const pinned = useMemo(() => new Set(pinnedList), [pinnedList])
  const togglePin = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation()
      storeTogglePin(id)
    },
    [storeTogglePin],
  )

  const [formOpen, setFormOpen] = useState(false)

  // 통계 차트 접힘 — 기본 접힘. localStorage persist.
  const [statsOpen, setStatsOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STATS_KEY) === '1'
    } catch {
      return false
    }
  })
  const toggleStats = useCallback(() => {
    setStatsOpen((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STATS_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  // 필터 술어 정본은 filterPersons — 좌측 인물 목록 사이드바와 공유한다.
  // (검색어만 여기서 디바운스된 값을 넘긴다)
  const filtered = useMemo(
    () =>
      filterPersons(allPeople, {
        scopes,
        minInfluence,
        aliveFilter,
        query: dq,
      }),
    [allPeople, scopes, dq, minInfluence, aliveFilter],
  )

  // 매트릭스·은하계 뷰는 전체(검색·영향력·생존만 적용) 배경 위에서 선택된 scope를 밝게 강조하도록
  // scope 적용 전 후보군(baseFiltered)을 전달한다.
  const baseFiltered = useMemo(
    () =>
      filterPersons(allPeople, {
        scopes: EMPTY_SCOPES,
        minInfluence,
        aliveFilter,
        query: dq,
      }),
    [allPeople, dq, minInfluence, aliveFilter],
  )

  // 활성 scope 라벨 — 단일이면 그 값, 다중이면 "필터링됨". 모두 비면 "전체 인물".
  const totalScopeCount = countActiveScopes(scopes)
  /** 상세 필터 시트가 다루는 것만 센다(검색어는 툴바 검색창이 따로 보여 준다) */
  const sheetFilterCount =
    totalScopeCount + (minInfluence > 0 ? 1 : 0) + (aliveFilter !== 'all' ? 1 : 0)
  const scopeLabel =
    totalScopeCount === 0
      ? '전체 인물'
      : totalScopeCount === 1
        ? scopes.era[0]
          ? ERAS.find((e) => e.key === scopes.era[0])?.lbl ?? scopes.era[0]
          : scopes.region[0] ??
            scopes.field[0] ??
            scopes.country[0] ??
            '필터링됨'
        : `${totalScopeCount}개 필터 적용됨`

  // records 뷰만 상위 PersonInfographicPane이 분기 — 여기선 나머지를 다룬다.
  const activeView: Exclude<PersonInfographicView, 'records'> =
    view === 'records' ? 'story' : view

  // 통계 패널 구성 — 요약 타일은 공통, 분포는 뷰가 스스로 보여주지 않는 것만
  const hasStatsPanel = activeView !== 'stats'
  const statsPanelShown = statsOpen && hasStatsPanel
  const statsVariant: HeaderStatsVariant =
    activeView === 'story' && groupBy === 'dynasty'
      ? 'dynasty'
      : activeView === 'matrix'
        ? 'tiles'
        : 'full'

  // '/' 로 검색 포커스 — 사건 목록과 같은 단축키. 입력 중에는 가로채지 않는다.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey)
        return
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      )
        return
      event.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const hasActiveFilter =
    totalScopeCount > 0 ||
    minInfluence > 0 ||
    aliveFilter !== 'all' ||
    !!dq.trim()

  // 상단 필터 드롭다운 옵션 — 상세 필터 시트와 동일한 패싯 카운트(자기 카테고리 외 활성 필터 반영).
  const scopeOptions = useMemo(() => {
    const facets = computePersonFacetCounts(allPeople, {
      scopes,
      minInfluence,
      aliveFilter,
      query: dq,
    })
    const countryNames = new Set<string>([
      ...Object.keys(facets.country),
      ...scopes.country,
    ])
    const countryOptions = Array.from(countryNames)
      .filter((name) => name && name !== '미상')
      .map((name) => ({
        value: name,
        label: name,
        count: facets.country[name] ?? 0,
      }))
      .sort((a, b) => {
        const aSelected = scopes.country.includes(a.value) ? 1 : 0
        const bSelected = scopes.country.includes(b.value) ? 1 : 0
        if (aSelected !== bSelected) return bSelected - aSelected
        return b.count - a.count || a.label.localeCompare(b.label, 'ko')
      })

    return {
      era: ERAS.map((era) => ({
        value: era.key,
        label: era.lbl,
        color: era.color,
        count: facets.era[era.key] ?? 0,
      })),
      region: REGIONS.map((region, index) => ({
        value: region,
        label: region,
        color: REGION_COLORS[index % REGION_COLORS.length],
        count: facets.region[region] ?? 0,
      })),
      field: FIELDS.map((field) => ({
        value: field,
        label: field,
        color: colorForField(field),
        count: facets.field[field] ?? 0,
      })),
      country: countryOptions,
    }
  }, [allPeople, scopes, minInfluence, aliveFilter, dq])

  // 활성 필터 칩 — 좌측 레일·상단 드롭다운 어디서 걸었든 한 줄에서 보고 하나씩 해제.
  const activeChips: Array<{ key: string; label: string; onRemove: () => void }> = [
    ...scopes.era.map((value) => ({
      key: `era-${value}`,
      label: ERAS.find((era) => era.key === value)?.lbl ?? value,
      onRemove: () => toggleScope('era', value),
    })),
    ...(['region', 'field', 'country'] as const).flatMap((kind) =>
      scopes[kind].map((value) => ({
        key: `${kind}-${value}`,
        label: value,
        onRemove: () => toggleScope(kind, value),
      })),
    ),
    ...(minInfluence > 0
      ? [
          {
            key: 'min-influence',
            label: `영향력 ${minInfluence}+`,
            onRemove: () => setMinInfluence(0),
          },
        ]
      : []),
    ...(aliveFilter !== 'all'
      ? [
          {
            key: 'alive',
            label: aliveFilter === 'alive' ? '생존 인물' : '사망 인물',
            onRemove: () => setAliveFilter('all'),
          },
        ]
      : []),
  ]

  return (
    <motion.div
      key="infographic"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Wrap>
        {/* 스크린리더용 — 필터/검색으로 결과 수가 바뀌면 조용히 안내 (시각적으로 숨김) */}
        <SrStatus role="status" aria-live="polite">
          {isError
            ? '인물 데이터를 불러오지 못했습니다'
            : isLoading
              ? '인물 데이터를 불러오는 중'
              : `${scopeLabel}, ${filtered.length}명`}
        </SrStatus>

        <TopBar>
          <Search>
            <SearchIcon>
              <FiSearch size={16} />
            </SearchIcon>
            <SearchInput
              ref={searchRef}
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && searchInput) {
                  event.preventDefault()
                  setSearchInput('')
                }
              }}
              placeholder="이름·국가·소속·직함 검색"
              aria-label="인물 검색"
            />
            {searchInput ? (
              <SearchClear
                type="button"
                onClick={() => {
                  setSearchInput('')
                  searchRef.current?.focus()
                }}
                aria-label="검색어 지우기"
              >
                <FiX size={13} />
              </SearchClear>
            ) : (
              <SearchKbd aria-hidden>/</SearchKbd>
            )}
          </Search>

          <FilterGroup role="group" aria-label="빠른 필터">
            <ScopeDropdown
              kind="era"
              label="시대"
              icon={<FiClock size={14} aria-hidden />}
              options={scopeOptions.era}
            />
            <ScopeDropdown
              kind="region"
              label="지역"
              icon={<FiGlobe size={14} aria-hidden />}
              options={scopeOptions.region}
            />
            <ScopeDropdown
              kind="field"
              label="분야"
              icon={<FiLayers size={14} aria-hidden />}
              options={scopeOptions.field}
            />
            <ScopeDropdown
              kind="country"
              label="국가"
              icon={<FiFlag size={14} aria-hidden />}
              options={scopeOptions.country}
              searchable
            />
          </FilterGroup>

          {onOpenFilters && (
            <GhostBtn
              type="button"
              onClick={onOpenFilters}
              aria-haspopup="dialog"
              aria-label={
                sheetFilterCount > 0
                  ? `상세 필터 열기, ${sheetFilterCount}개 적용 중`
                  : '상세 필터 열기'
              }
              title="시대·지역·분야·국가·영향력·생존 필터"
            >
              <FiFilter size={14} />
              필터
              {sheetFilterCount > 0 && (
                <FilterCount aria-hidden>{sheetFilterCount}</FilterCount>
              )}
            </GhostBtn>
          )}

          <Actions>
            {viewSwitcher}
            {/* 능력치 뷰는 자체 '개요'(평가 진행률·축별 평균)를 가져서 통계가 두 겹이 된다 */}
            {hasStatsPanel && (
              <GhostBtn
                type="button"
                onClick={toggleStats}
                aria-pressed={statsOpen}
                title={statsOpen ? '통계 숨기기' : '통계 보기'}
                $hideOnMobile
              >
                <FiBarChart2 size={14} />
                통계
              </GhostBtn>
            )}
            <PrimaryBtn type="button" onClick={() => setFormOpen(true)}>
              <FiPlus size={16} />새 인물 등록
            </PrimaryBtn>
          </Actions>
        </TopBar>

        {(activeView === 'story' || activeChips.length > 0 || !isError) && (
          <SubBar>
            {activeView === 'story' && (
              <DisplayOptions>
                <Select
                  value={groupBy}
                  onChange={(event) =>
                    setGroupBy(event.target.value as PersonGroupBy)
                  }
                  aria-label="인물 그룹 기준"
                >
                  {GROUP_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <Select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as PersonSortKey)}
                  aria-label="인물 정렬 기준"
                >
                  {SORT_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}순
                    </option>
                  ))}
                </Select>
                <IconBtn
                  type="button"
                  onClick={() =>
                    setEraGroupOrder(eraGroupOrder === 'desc' ? 'asc' : 'desc')
                  }
                  aria-label={
                    groupBy === 'century'
                      ? eraGroupOrder === 'desc'
                        ? '세기 순서: 최신순 (오래된순으로 바꾸기)'
                        : '세기 순서: 오래된순 (최신순으로 바꾸기)'
                      : eraGroupOrder === 'desc'
                        ? '정렬 순서: 기본순 (역순으로 바꾸기)'
                        : '정렬 순서: 역순 (기본순으로 바꾸기)'
                  }
                  title={
                    groupBy === 'century'
                      ? eraGroupOrder === 'desc'
                        ? '세기: 최신순'
                        : '세기: 오래된순'
                      : eraGroupOrder === 'desc'
                        ? '정렬: 기본순 (클릭 시 역순)'
                        : '정렬: 역순 (클릭 시 기본순)'
                  }
                >
                  <FiArrowDown
                    size={15}
                    style={{
                      transform: eraGroupOrder === 'desc' ? 'none' : 'rotate(180deg)',
                    }}
                  />
                </IconBtn>
                <LayoutSegmented role="group" aria-label="목록 표시 형식">
                  <LayoutSegmentBtn
                    type="button"
                    $active={listLayout === 'grid'}
                    aria-pressed={listLayout === 'grid'}
                    onClick={() => setListLayout('grid')}
                    title="카드형(그리드) 보기"
                  >
                    <FiGrid size={13} aria-hidden />
                    <span>카드</span>
                  </LayoutSegmentBtn>
                  <LayoutSegmentBtn
                    type="button"
                    $active={listLayout === 'row'}
                    aria-pressed={listLayout === 'row'}
                    onClick={() => setListLayout('row')}
                    title="리스트형(컴팩트 행) 보기"
                  >
                    <FiList size={13} aria-hidden />
                    <span>리스트</span>
                  </LayoutSegmentBtn>
                </LayoutSegmented>
              </DisplayOptions>
            )}

            {activeChips.length > 0 && (
              <ActiveFiltersInline>
                <ActiveFilterLabel>필터 {activeChips.length}</ActiveFilterLabel>
                {activeChips.map((chip) => (
                  <ActiveFilterChip
                    key={chip.key}
                    type="button"
                    onClick={chip.onRemove}
                    aria-label={`${chip.label} 필터 해제`}
                  >
                    {chip.label}
                    <FiX size={11} aria-hidden />
                  </ActiveFilterChip>
                ))}
                <ActiveFilterClear type="button" onClick={resetFilters}>
                  모두 해제
                </ActiveFilterClear>
              </ActiveFiltersInline>
            )}

            {isLoading && (
              <ViewMeta aria-hidden>
                <CountPlaceholder />
              </ViewMeta>
            )}
            {!isLoading && !isError && (
              <ViewMeta aria-hidden>
                <span>
                  표시 <strong>{filtered.length.toLocaleString()}</strong>명
                  {filtered.length !== allPeople.length &&
                    ` / 전체 ${allPeople.length.toLocaleString()}명`}
                </span>
              </ViewMeta>
            )}
          </SubBar>
        )}


        {!isLoading && (filtered.length > 0 || baseFiltered.length > 0) && statsPanelShown && (
          <StatsArea>
            <HeaderStats
              people={filtered}
              basePeople={baseFiltered}
              variant={statsVariant}
            />
          </StatsArea>
        )}

        <div
          id="person-view-panel"
          role="tabpanel"
          aria-labelledby={`person-view-tab-${activeView}`}
        >
          {isError && (
            <EmptyState
              title="인물 데이터를 불러오지 못했어요"
              description="네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
              actionLabel="다시 시도"
              onAction={() => refetch()}
            />
          )}

          {!isError && isLoading && (
            <ViewArea>
              <PersonViewSkeleton view={activeView} />
            </ViewArea>
          )}

          {!isError && !isLoading && filtered.length === 0 && (
            <EmptyState
              hasActiveFilter={hasActiveFilter}
              onClearFilters={resetFilters}
            />
          )}

          {!isLoading && filtered.length > 0 && (
            <ViewArea>
              {activeView === 'matrix' && (
                <MatrixView
                  people={baseFiltered}
                  onOpen={onPersonClick}
                  selectedPersonId={selectedPersonId}
                />
              )}
              {activeView === 'story' && (
                <EraStoryView
                  people={filtered}
                  onOpen={onPersonClick}
                  query={dq}
                  pinned={pinned}
                  selectedPersonId={selectedPersonId}
                  togglePin={togglePin}
                />
              )}
              {activeView === 'stats' && (
                <StatsView people={filtered} onPersonClick={onPersonClick} />
              )}
            </ViewArea>
          )}
        </div>
      </Wrap>

      <PersonRegisterViewModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={() => setFormOpen(false)}
        // 등록 후 '상세 보기'는 모달 기본값(/persons-timeline/:id)으로 바로 상세 진입
      />

    </motion.div>
  )
}

/** 필터 버튼 옆 적용 개수 — 사건 목록 '최상위' 배지와 같은 알약 */
const FilterCount = styled.span`
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  color: ${BRAND.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? BRAND.primaryFillDark : BRAND.primaryFill};
`

/** 2단 보조 바 — 뷰별 표시 옵션(그룹·정렬·레이아웃) + 활성 필터 칩 + 우측 인원 요약 */
const SubBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px 12px;
  flex-wrap: wrap;
  margin-top: 10px;
  padding-top: 10px;
  min-height: 34px;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)'};
`

const LayoutSegmented = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 1px;
  height: 34px;
  padding: 2px;
  border-radius: 8px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)'};
`

const LayoutSegmentBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 9px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  cursor: pointer;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : '#ffffff'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? BRAND.primary : theme.colors.text.tertiary};
  box-shadow: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '0 1px 2px rgba(0,0,0,0.35)'
        : '0 1px 2px rgba(15,23,42,0.06)'
      : 'none'};
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    color: ${({ $active, theme }) =>
      $active ? BRAND.primary : theme.colors.text.primary};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
`

const ActiveFiltersInline = styled(ActiveFiltersRow)`
  padding-top: 0;
`

const Wrap = styled.div`
  /* 상위(PersonInfographicPane)가 좌우/상단 padding을 담당. 여기서는 하단 여백만. */
  padding: 0 0 60px;

  @media (max-width: 768px) {
    padding: 0 0 40px;
  }
`

/* '469명' 자리 — 같은 폭의 옅은 막대(숫자 3자리 + '명') */
const CountPlaceholder = styled.span`
  display: inline-block;
  width: 34px;
  height: 11px;
  border-radius: 4px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.07)'};
`

const ViewArea = styled.div`
  margin-top: 12px;
`

const StatsArea = styled.div`
  margin-top: 16px;
`

/** 시각적으로 숨기되 스크린리더에는 노출되는 라이브 영역. */
const SrStatus = styled.div`
  ${srOnly}
`
