/**
 * 인물 목록 콘텐츠 — 검색·필터 툴바 + 뷰 전환 줄 + 결과 요약 + 뷰 디스패치.
 *
 * 크롬은 사건 목록(/events)과 같은 순서·같은 컨트롤 문법:
 *   [검색 /] [시대|지역|분야] ··· [통계] [+ 새 인물 등록]
 *   [활성 필터 칩 … 모두 해제]
 *   [뷰 세그먼트] [정렬·순서] ··· [N명 · 평균 수명 · 대표 분야]
 *
 * 뷰(list/cards/matrix/galaxy/story/dynasty/stats)는 각자 별도 파일.
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
  FiGlobe,
  FiLayers,
  FiPlus,
  FiSearch,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import { usePersonsInfographic } from '@/entities/person/api'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
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
  matchesScopes,
  usePersonInfographicFilterStore,
  type PersonInfographicView,
  type PersonSortKey,
} from '../model/filter.store'
import { SORT_OPTIONS } from '../model/sort-helpers'
import { useAdaptedPersons } from '../model/use-adapted-persons'

import { CardsView } from './cards-view'
import { DynastyView } from './dynasty-view'
import { CardGridSkeleton } from './_shared/card-grid-skeleton'
import {
  Actions,
  ActiveFilterChip,
  ActiveFilterClear,
  ActiveFilterLabel,
  ActiveFiltersRow,
  DisplayOptions,
  FilterGroup,
  GhostBtn,
  IconBtn,
  MetaDot,
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
  ViewRow,
} from './_shared/catalog.styles'
import { EmptyState } from './_shared/empty-state'
import { ScopeDropdown } from './_shared/scope-dropdown'
import { EraStoryView } from './era-story-view'
import { GalaxyView } from './galaxy-view'
import { HeaderStats } from './header-stats'
import { ListView } from './list-view'
import { MatrixView } from './matrix-view'
import { StatsView } from './stats-view'

interface InfographicContentProps {
  /** 인물 카드/아이템 클릭 시 상세로 이동 */
  onPersonClick: (id: string) => void
  /** 뷰 전환 세그먼트 — 페인이 소유(records 분기와 공유)하고 여기서는 자리만 잡는다 */
  viewSwitcher: ReactNode
  /** 활성 뷰 한 줄 설명 */
  viewHint: ReactNode
}

const STATS_KEY = 'person-infographic-stats-open'

export function InfographicContent({
  onPersonClick,
  viewSwitcher,
  viewHint,
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
  const eraGroupOrder = usePersonInfographicFilterStore((state) => state.eraGroupOrder)
  const setEraGroupOrder = usePersonInfographicFilterStore(
    (state) => state.setEraGroupOrder,
  )
  const searchRef = useRef<HTMLInputElement>(null)
  const resetFilters = usePersonInfographicFilterStore((state) => state.resetFilters)
  const view = usePersonInfographicFilterStore((state) => state.view)
  const storeQuery = usePersonInfographicFilterStore((state) => state.query)
  const setStoreQuery = usePersonInfographicFilterStore((state) => state.setQuery)
  // 검색 입력은 로컬 state로 즉시 반영하고, 디바운스된 값만 store(→URL)에 커밋.
  // (이전엔 키 입력마다 store.query→url-sync가 URL을 replaceState로 갱신해 history 스팸)
  const [searchInput, setSearchInput] = useState(storeQuery)
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

  // 무거운 필터/뷰는 디바운스된 검색어로만 갱신 — 대량 인물 타이핑 랙 완화.
  const dq = useDebouncedValue(searchInput, 200)

  // 디바운스된 검색어만 store(→URL·필터)에 커밋
  useEffect(() => {
    if (dq !== storeQuery) setStoreQuery(dq)
  }, [dq, storeQuery, setStoreQuery])

  // 외부에서 store.query가 바뀌면(URL 진입·필터 초기화) 입력칸 동기화
  useEffect(() => {
    setSearchInput((cur) => (cur === storeQuery ? cur : storeQuery))
  }, [storeQuery])

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

  const filtered = useMemo(() => {
    // scope 매칭 정본은 filter.store의 matchesScopes (era.key 주입) — 인라인 재구현 금지.
    let arr = allPeople.filter((person) =>
      matchesScopes(person, scopes, (candidate) => candidate.era.key),
    )
    if (minInfluence > 0) arr = arr.filter((p) => p.influence >= minInfluence)
    if (aliveFilter === 'alive') arr = arr.filter((p) => p.isAlive)
    else if (aliveFilter === 'dead') arr = arr.filter((p) => !p.isAlive)
    if (dq.trim()) {
      const qq = dq.trim().toLowerCase()
      arr = arr.filter((p) => p.searchText.includes(qq))
    }
    return arr
  }, [allPeople, scopes, dq, minInfluence, aliveFilter])

  // 활성 scope 라벨 — 단일이면 그 값, 다중이면 "필터링됨". 모두 비면 "전체 인물".
  const totalScopeCount = countActiveScopes(scopes)
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

  // 평균 수명: 생몰이 모두 확인돼 age가 산출된 인물만 집계(미상 born=0 오염 제거).
  const knownAges = filtered
    .map((p) => p.age)
    .filter((age): age is number => age != null)
  const avgLifespan = knownAges.length
    ? Math.round(knownAges.reduce((sum, age) => sum + age, 0) / knownAges.length)
    : 0

  // records 뷰만 상위 PersonInfographicPane이 분기 — 여기선 목록 포함 나머지를 다룬다.
  const activeView: Exclude<PersonInfographicView, 'records'> =
    view === 'records' ? 'list' : view

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

  // 상단 필터 드롭다운 옵션 — 카운트는 전체 모수(필터 전) 기준이라 선택해도 숫자가 흔들리지 않는다.
  const scopeOptions = useMemo(() => {
    const eraCount = new Map<string, number>()
    const regionCount = new Map<string, number>()
    const fieldCount = new Map<string, number>()
    for (const person of allPeople) {
      eraCount.set(person.era.key, (eraCount.get(person.era.key) ?? 0) + 1)
      regionCount.set(person.region, (regionCount.get(person.region) ?? 0) + 1)
      fieldCount.set(person.field, (fieldCount.get(person.field) ?? 0) + 1)
    }
    return {
      era: ERAS.map((era) => ({
        value: era.key,
        label: era.lbl,
        color: era.color,
        count: eraCount.get(era.key) ?? 0,
      })),
      region: REGIONS.map((region, index) => ({
        value: region,
        label: region,
        color: REGION_COLORS[index % REGION_COLORS.length],
        count: regionCount.get(region) ?? 0,
      })),
      field: FIELDS.map((field) => ({
        value: field,
        label: field,
        color: colorForField(field),
        count: fieldCount.get(field) ?? 0,
      })),
    }
  }, [allPeople])

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

  // 결과 요약의 대표 분야 — 사건 목록 우측의 '● 전쟁/군사 78'과 같은 자리.
  const topField = useMemo(() => {
    const counts = new Map<string, number>()
    for (const person of filtered)
      counts.set(person.field, (counts.get(person.field) ?? 0) + 1)
    let best: [string, number] | null = null
    for (const entry of counts) if (!best || entry[1] > best[1]) best = entry
    return best
  }, [filtered])

  const aliveCount = useMemo(
    () => filtered.filter((person) => person.isAlive).length,
    [filtered],
  )

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
          </FilterGroup>

          <Actions>
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
            <PrimaryBtn type="button" onClick={() => setFormOpen(true)}>
              <FiPlus size={16} />새 인물 등록
            </PrimaryBtn>
          </Actions>
        </TopBar>

        {activeChips.length > 0 && (
          <ActiveFiltersRow>
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
          </ActiveFiltersRow>
        )}

        <ViewRow>
          {viewSwitcher}
          <DisplayOptions>
            {/* 정렬은 카드 그리드 뷰(카드·스토리·왕조)에서만 의미 */}
            {(activeView === 'cards' ||
              activeView === 'story' ||
              activeView === 'dynasty') && (
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
            )}
            {/* 세기 나열 방향은 세기 그룹 뷰(목록·스토리) 전용 */}
            {(activeView === 'list' || activeView === 'story') && (
              <IconBtn
                type="button"
                onClick={() =>
                  setEraGroupOrder(eraGroupOrder === 'desc' ? 'asc' : 'desc')
                }
                aria-label={
                  eraGroupOrder === 'desc'
                    ? '세기 순서: 최신순 (오래된순으로 바꾸기)'
                    : '세기 순서: 오래된순 (최신순으로 바꾸기)'
                }
                title={eraGroupOrder === 'desc' ? '최신순' : '오래된순'}
              >
                <FiArrowDown
                  size={15}
                  style={{
                    transform: eraGroupOrder === 'desc' ? 'none' : 'rotate(180deg)',
                  }}
                />
              </IconBtn>
            )}
          </DisplayOptions>
          {!isLoading && !isError && (
            <ViewMeta aria-hidden>
              <span>
                <strong>{filtered.length.toLocaleString()}</strong>명
                {filtered.length !== allPeople.length &&
                  ` / ${allPeople.length.toLocaleString()}`}
              </span>
              {avgLifespan > 0 && <span>평균 수명 {avgLifespan}년</span>}
              {aliveCount > 0 && <span>생존 {aliveCount}</span>}
              {topField && (
                <span>
                  <MetaDot $color={colorForField(topField[0])} />
                  {topField[0]} {topField[1]}
                </span>
              )}
            </ViewMeta>
          )}
        </ViewRow>
        {viewHint}

        {!isLoading && filtered.length > 0 && statsOpen && (
          <StatsArea>
            <HeaderStats people={filtered} />
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
              <CardGridSkeleton />
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
              {activeView === 'list' && (
                <ListView
                  people={filtered}
                  onOpen={onPersonClick}
                  query={dq}
                  pinned={pinned}
                  togglePin={togglePin}
                />
              )}
              {activeView === 'cards' && (
                <CardsView
                  people={filtered}
                  onOpen={onPersonClick}
                  query={dq}
                  pinned={pinned}
                  togglePin={togglePin}
                />
              )}
              {activeView === 'matrix' && (
                <MatrixView people={filtered} onOpen={onPersonClick} />
              )}
              {activeView === 'galaxy' && (
                <GalaxyView people={filtered} onOpen={onPersonClick} />
              )}
              {activeView === 'story' && (
                <EraStoryView
                  people={filtered}
                  onOpen={onPersonClick}
                  query={dq}
                  pinned={pinned}
                  togglePin={togglePin}
                />
              )}
              {activeView === 'dynasty' && (
                <DynastyView
                  people={filtered}
                  onOpen={onPersonClick}
                  query={dq}
                  pinned={pinned}
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
        // 등록 후 '상세 보기'는 이 지면의 정본 경로(onPersonClick = /persons-timeline/:id)로.
        // 기본값 /persons/:id는 ContentShell 밖이라 좌측 필터 레일·뷰 탭이 통째로 사라진다
        // — 같은 화면의 인물 카드 클릭과 결과가 달라지는 것을 막는다.
        onViewDetail={onPersonClick}
      />
    </motion.div>
  )
}

const Wrap = styled.div`
  /* 상위(PersonInfographicPane)가 좌우/상단 padding을 담당. 여기서는 하단 여백만. */
  padding: 0 0 60px;

  @media (max-width: 768px) {
    padding: 0 0 40px;
  }
`

const ViewArea = styled.div`
  margin-top: 16px;
`

const StatsArea = styled.div`
  margin-top: 16px;
`

/** 시각적으로 숨기되 스크린리더에는 노출되는 라이브 영역. */
const SrStatus = styled.div`
  ${srOnly}
`
