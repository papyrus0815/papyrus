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
  FiChevronDown,
  FiClock,
  FiFlag,
  FiGlobe,
  FiGrid,
  FiLayers,
  FiList,
  FiPlus,
  FiSearch,
  FiSliders,
  FiX,
} from 'react-icons/fi'
import styled, { useTheme } from 'styled-components'

import {
  BentoCard,
  BentoCardBadge,
  BentoCardBody,
  BentoCardHeader,
  BentoCardTitle,
  BentoCardTitleGroup,
  BentoGrid3Col,
  MiniDonutRing,
  StackedSegmentBar,
  type SegmentSlice,
} from '@/entities/event/ui/bento-primitives'
import {
  DIGIT_DISPLAY,
  MOTION,
  RADIUS,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerSubtleFill,
} from '@/entities/event/ui/ledger-tokens'
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
  type AliveFilter,
  countActiveScopes,
  usePersonInfographicFilterStore,
  type PersonGroupBy,
  type PersonInfographicView,
  type PersonSortKey,
} from '../model/filter.store'
import type { AdaptedPerson } from '../model/types'
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

const INFLUENCE_PRESETS = [0, 40, 60, 80, 90] as const
const ALIVE_FILTER_OPTIONS: ReadonlyArray<readonly [AliveFilter, string]> = [
  ['all', '전체'],
  ['dead', '사망'],
  ['alive', '생존'],
]

function resolvePersonFieldBucket(person: AdaptedPerson): string {
  const raw = person.field?.trim()
  if (raw && raw !== '기타' && raw !== '미상') return raw
  if (person.isMonarch || person.isHeadOfState) return '정치'
  const hint = `${person.primaryTitle ?? ''} ${person.faction ?? ''}`
  if (/장군|제독|원수|무장|군인|장수|사령관/.test(hint)) return '군사'
  if (/교황|주교|승려|선사|신학|선지자|목사|성인/.test(hint)) return '종교'
  if (/과학|수학|물리|화학|천문|의학|발명|박물/.test(hint)) return '과학'
  if (/철학|학자|역사가|사상가|유학|교수|경제/.test(hint)) return '학술'
  if (/화가|시인|작가|음악|예술|건축|소설|조각/.test(hint)) return '문화'
  if (/왕|황제|대통령|총리|수상|재상|정치|관료|대신|집정관/.test(hint)) return '정치'
  return raw || '기타'
}

export function InfographicContent({
  onPersonClick,
  viewSwitcher,
  selectedPersonId,
  onOpenFilters: _onOpenFilters,
}: InfographicContentProps) {
  const theme = useTheme()
  const mode = theme.mode === 'dark' ? 'dark' : 'light'
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
  const [extraFilterOpen, setExtraFilterOpen] = useState(false)
  const extraFilterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!extraFilterOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (
        extraFilterRef.current &&
        !extraFilterRef.current.contains(event.target as Node)
      ) {
        setExtraFilterOpen(false)
      }
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExtraFilterOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onEscape)
    }
  }, [extraFilterOpen])

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
  /** 추가 조건 팝오버가 다루는 2개 필터(영향력·생존 여부)만 센다 — 시대·지역·분야·국가는 바로 옆 드롭다운이 표시 */
  const extraFilterCount =
    (minInfluence > 0 ? 1 : 0) + (aliveFilter !== 'all' ? 1 : 0)
  const extraFilterSummary =
    extraFilterCount === 0
      ? '영향력·생존'
      : [
          minInfluence > 0 ? `영향력 ${minInfluence}+` : null,
          aliveFilter === 'alive'
            ? '생존'
            : aliveFilter === 'dead'
              ? '사망'
              : null,
        ]
          .filter(Boolean)
          .join(' · ')
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

  // 상시 노출 3열 컴팩트 벤토 인포그래픽 요약 (시대 밀도 5-bar / 활동 분야 비중 / 소속 국가 Top 5)
  const summaryInfographic = useMemo(() => {
    const filteredEraCounts = new Map<string, number>()
    const fieldCounts = new Map<string, number>()
    const countryCounts = new Map<string, number>()

    for (const person of filtered) {
      filteredEraCounts.set(
        person.era.key,
        (filteredEraCounts.get(person.era.key) ?? 0) + 1,
      )
      const fieldKey = resolvePersonFieldBucket(person)
      fieldCounts.set(fieldKey, (fieldCounts.get(fieldKey) ?? 0) + 1)

      const countryName = person.country?.trim() || '미상'
      countryCounts.set(countryName, (countryCounts.get(countryName) ?? 0) + 1)
    }

    // 시대 막대는 시대 필터가 걸렸을 때 후보군(facet)도 유지하여 다른 시대 막대를 눌러 토글할 수 있게 한다
    const eraFacetByKey = new Map(
      scopeOptions.era.map((opt) => [opt.value, opt.count]),
    )
    const eraBars = ERAS.map((era) => {
      const count =
        scopes.era.length > 0
          ? (eraFacetByKey.get(era.key) ?? 0)
          : (filteredEraCounts.get(era.key) ?? 0)
      return {
        key: era.key,
        label: era.lbl,
        color: era.color,
        count,
        selected: scopes.era.includes(era.key),
      }
    })
    const maxEraCount = Math.max(1, ...eraBars.map((bar) => bar.count))

    const total = Math.max(1, filtered.length)
    const fieldSlices: SegmentSlice[] = Array.from(fieldCounts.entries())
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({
        key: label,
        label,
        value,
        color: colorForField(label),
        meta: `${Math.round((value / total) * 100)}%`,
      }))
    const topField = fieldSlices[0] ?? null
    const topFieldPct = topField
      ? Math.round((topField.value / total) * 100)
      : 0

    const namedCountries = Array.from(countryCounts.entries()).filter(
      ([name]) => name !== '미상',
    )
    const sourceCountries =
      namedCountries.length > 0
        ? namedCountries
        : Array.from(countryCounts.entries())
    const topCountries = sourceCountries
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))
      .slice(0, 5)
      .map(([country, count]) => ({
        country,
        count,
        pct: Math.round((count / total) * 100),
        selected: scopes.country.includes(country),
      }))
    const maxCountryCount = Math.max(
      1,
      ...topCountries.map((entry) => entry.count),
    )

    return {
      eraBars,
      maxEraCount,
      fieldSlices,
      topField,
      topFieldPct,
      topCountries,
      maxCountryCount,
      distinctCountryCount: namedCountries.length || countryCounts.size,
    }
  }, [filtered, scopeOptions.era, scopes.era, scopes.country])

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
          <HeaderLeft>
            {viewSwitcher}
            {!isLoading && !isError && (
              <ViewMeta aria-hidden>
                <strong>{filtered.length.toLocaleString()}</strong>명
                {filtered.length !== allPeople.length &&
                  ` / ${allPeople.length.toLocaleString()}명`}
              </ViewMeta>
            )}
            {isLoading && (
              <ViewMeta aria-hidden>
                <CountPlaceholder />
              </ViewMeta>
            )}
          </HeaderLeft>

          <Actions>
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

        <SubBar>
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
            <ExtraFilterAnchor ref={extraFilterRef}>
              <ExtraFilterBtn
                type="button"
                onClick={() => setExtraFilterOpen((open) => !open)}
                $active={extraFilterCount > 0 || extraFilterOpen}
                aria-expanded={extraFilterOpen}
                aria-haspopup="dialog"
                title="영향력 하한 · 생존 여부 조건"
              >
                <FiSliders size={13} aria-hidden />
                <span>{extraFilterSummary}</span>
                {extraFilterCount > 0 && (
                  <FilterCount aria-hidden>{extraFilterCount}</FilterCount>
                )}
                <FiChevronDown
                  size={12}
                  aria-hidden
                  style={{
                    transform: extraFilterOpen ? 'rotate(180deg)' : 'none',
                    transition: `transform ${MOTION.fast} ease`,
                  }}
                />
              </ExtraFilterBtn>
              {extraFilterOpen && (
                <ExtraFilterPopover
                  role="dialog"
                  aria-label="영향력 및 생존 여부 필터"
                >
                  <PopoverSection>
                    <PopoverHeadRow>
                      <PopoverLabel>영향력 하한</PopoverLabel>
                      <PopoverValue>
                        {minInfluence > 0 ? `${minInfluence}점 이상` : '전체'}
                      </PopoverValue>
                    </PopoverHeadRow>
                    <PresetPillsRow>
                      {INFLUENCE_PRESETS.map((preset) => (
                        <PresetPill
                          key={preset}
                          type="button"
                          $active={minInfluence === preset}
                          onClick={() => setMinInfluence(preset)}
                        >
                          {preset === 0 ? '전체' : `${preset}+`}
                        </PresetPill>
                      ))}
                    </PresetPillsRow>
                    <InfluenceSlider
                      type="range"
                      min={0}
                      max={95}
                      step={5}
                      value={minInfluence}
                      onChange={(event) =>
                        setMinInfluence(Number(event.target.value))
                      }
                      aria-label="영향력 최소 점수"
                    />
                  </PopoverSection>
                  <PopoverSection>
                    <PopoverHeadRow>
                      <PopoverLabel>생존 여부</PopoverLabel>
                    </PopoverHeadRow>
                    <PresetPillsRow role="group" aria-label="생존 여부 선택">
                      {ALIVE_FILTER_OPTIONS.map(([val, lbl]) => (
                        <PresetPill
                          key={val}
                          type="button"
                          $active={aliveFilter === val}
                          aria-pressed={aliveFilter === val}
                          onClick={() => setAliveFilter(val)}
                        >
                          {lbl}
                        </PresetPill>
                      ))}
                    </PresetPillsRow>
                  </PopoverSection>
                  {extraFilterCount > 0 && (
                    <PopoverFooter>
                      <PopoverResetBtn
                        type="button"
                        onClick={() => {
                          setMinInfluence(0)
                          setAliveFilter('all')
                        }}
                      >
                        추가 조건 초기화
                      </PopoverResetBtn>
                    </PopoverFooter>
                  )}
                </ExtraFilterPopover>
              )}
            </ExtraFilterAnchor>
          </FilterGroup>

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
                onChange={(event) =>
                  setSort(event.target.value as PersonSortKey)
                }
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
                  eraGroupOrder === 'desc'
                    ? '정렬 순서: 기본순 (역순으로 바꾸기)'
                    : '정렬 순서: 역순 (기본순으로 바꾸기)'
                }
                title={
                  eraGroupOrder === 'desc'
                    ? '정렬: 기본순 (클릭 시 역순)'
                    : '정렬: 역순 (클릭 시 기본순)'
                }
              >
                <FiArrowDown
                  size={15}
                  style={{
                    transform:
                      eraGroupOrder === 'desc' ? 'none' : 'rotate(180deg)',
                  }}
                />
              </IconBtn>
              <LayoutSegmented role="group" aria-label="목록 표시 형식">
                <LayoutSegmentBtn
                  type="button"
                  $active={listLayout === 'grid'}
                  aria-pressed={listLayout === 'grid'}
                  aria-label="카드형 보기"
                  onClick={() => setListLayout('grid')}
                  title="카드형 보기"
                >
                  <FiGrid size={14} aria-hidden />
                </LayoutSegmentBtn>
                <LayoutSegmentBtn
                  type="button"
                  $active={listLayout === 'row'}
                  aria-pressed={listLayout === 'row'}
                  aria-label="리스트형 보기"
                  onClick={() => setListLayout('row')}
                  title="리스트형 보기"
                >
                  <FiList size={14} aria-hidden />
                </LayoutSegmentBtn>
              </LayoutSegmented>
            </DisplayOptions>
          )}
        </SubBar>

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


        {!isLoading && !isError && filtered.length > 0 && (
          <SummaryStripWrap aria-label="인물 분포 요약 인포그래픽">
            <SummaryGrid3Col>
              {/* Col 1: 시대별 인물 밀도 미니 히스토그램 (5-bar) */}
              <CompactBentoCard>
                <CompactBentoHeader>
                  <BentoCardTitleGroup>
                    <CompactBentoTitle>시대별 인물 밀도</CompactBentoTitle>
                  </BentoCardTitleGroup>
                  <BentoCardBadge>
                    {scopes.era.length > 0
                      ? `${scopes.era.length}개 시대 선택`
                      : `${filtered.length.toLocaleString()}명`}
                  </BentoCardBadge>
                </CompactBentoHeader>
                <CompactBentoBody>
                  <EraMiniHistogram role="group" aria-label="시대별 인물 밀도 막대 — 클릭하여 시대 필터 토글">
                    {summaryInfographic.eraBars.map((bar) => {
                      const heightPct =
                        bar.count > 0
                          ? Math.max(
                              12,
                              Math.round(
                                (bar.count / summaryInfographic.maxEraCount) * 100,
                              ),
                            )
                          : 0
                      const dimmed =
                        scopes.era.length > 0 && !bar.selected
                      return (
                        <EraBarButton
                          key={bar.key}
                          type="button"
                          onClick={() => toggleScope('era', bar.key)}
                          aria-pressed={bar.selected}
                          $selected={bar.selected}
                          $dimmed={dimmed}
                          title={`${bar.label}: ${bar.count.toLocaleString()}명 (클릭하여 시대 필터 ${bar.selected ? '해제' : '적용'})`}
                        >
                          <EraBarCount $selected={bar.selected}>
                            {bar.count}
                          </EraBarCount>
                          <EraBarTrack $selected={bar.selected}>
                            {bar.count > 0 && (
                              <EraBarFill
                                style={{
                                  height: `${heightPct}%`,
                                  background: bar.color,
                                }}
                              />
                            )}
                          </EraBarTrack>
                          <EraBarLabel $selected={bar.selected}>
                            {bar.label}
                          </EraBarLabel>
                        </EraBarButton>
                      )
                    })}
                  </EraMiniHistogram>
                </CompactBentoBody>
              </CompactBentoCard>

              {/* Col 2: 활동 분야 비중 StackedSegmentBar + MiniDonutRing */}
              <CompactBentoCard>
                <CompactBentoHeader>
                  <BentoCardTitleGroup>
                    <CompactBentoTitle>활동 분야 비중</CompactBentoTitle>
                  </BentoCardTitleGroup>
                  {summaryInfographic.topField && (
                    <BentoCardBadge>
                      {summaryInfographic.topField.label}{' '}
                      {summaryInfographic.topFieldPct}%
                    </BentoCardBadge>
                  )}
                </CompactBentoHeader>
                <CompactBentoBody>
                  <FieldSummaryLayout>
                    <MiniDonutRing
                      slices={summaryInfographic.fieldSlices}
                      size={52}
                      strokeWidth={7}
                      centerValue={`${summaryInfographic.topFieldPct}%`}
                    />
                    <FieldSummaryMain>
                      <StackedSegmentBar
                        slices={summaryInfographic.fieldSlices}
                        height={8}
                      />
                      <FieldChipRow>
                        {summaryInfographic.fieldSlices.slice(0, 6).map((slice) => {
                          const canToggle = (FIELDS as readonly string[]).includes(
                            slice.key,
                          )
                          const isSelected = scopes.field.includes(slice.key)
                          return (
                            <FieldStatChip
                              key={slice.key}
                              type="button"
                              disabled={!canToggle}
                              $selected={isSelected}
                              aria-pressed={canToggle ? isSelected : undefined}
                              onClick={() => {
                                if (canToggle) toggleScope('field', slice.key)
                              }}
                              title={
                                canToggle
                                  ? `${slice.label} ${slice.value.toLocaleString()}명 (${slice.meta}) — 클릭하여 분야 필터 토글`
                                  : `${slice.label} ${slice.value.toLocaleString()}명 (${slice.meta})`
                              }
                            >
                              <FieldDot style={{ background: slice.color }} />
                              <span>{slice.label}</span>
                              <strong>{slice.meta}</strong>
                            </FieldStatChip>
                          )
                        })}
                      </FieldChipRow>
                    </FieldSummaryMain>
                  </FieldSummaryLayout>
                </CompactBentoBody>
              </CompactBentoCard>

              {/* Col 3: 소속 국가 Top 5 수평 비례 막대 */}
              <CompactBentoCard>
                <CompactBentoHeader>
                  <BentoCardTitleGroup>
                    <CompactBentoTitle>소속 국가 Top 5</CompactBentoTitle>
                  </BentoCardTitleGroup>
                  <BentoCardBadge>
                    총 {summaryInfographic.distinctCountryCount.toLocaleString()}개국
                  </BentoCardBadge>
                </CompactBentoHeader>
                <CompactBentoBody>
                  <TopCountryList>
                    {summaryInfographic.topCountries.map((item, idx) => {
                      const canToggle = item.country !== '미상'
                      const barPct = Math.max(
                        6,
                        Math.round(
                          (item.count / summaryInfographic.maxCountryCount) * 100,
                        ),
                      )
                      return (
                        <TopCountryRow
                          key={item.country}
                          type="button"
                          disabled={!canToggle}
                          $selected={item.selected}
                          aria-pressed={canToggle ? item.selected : undefined}
                          onClick={() => {
                            if (canToggle) toggleScope('country', item.country)
                          }}
                          title={
                            canToggle
                              ? `${item.country}: ${item.count.toLocaleString()}명 (${item.pct}%) — 클릭하여 국가 필터 ${item.selected ? '해제' : '적용'}`
                              : `${item.country}: ${item.count.toLocaleString()}명`
                          }
                        >
                          <TopCountryRank>{idx + 1}</TopCountryRank>
                          <TopCountryName $selected={item.selected}>
                            {item.country}
                          </TopCountryName>
                          <TopCountryBarTrack>
                            <TopCountryBarFill
                              $selected={item.selected}
                              style={{
                                width: `${barPct}%`,
                                background: ledgerAccent(mode),
                              }}
                            />
                          </TopCountryBarTrack>
                          <TopCountryStat>
                            <strong>{item.count.toLocaleString()}</strong>
                            <span>{item.pct}%</span>
                          </TopCountryStat>
                        </TopCountryRow>
                      )
                    })}
                  </TopCountryList>
                </CompactBentoBody>
              </CompactBentoCard>
            </SummaryGrid3Col>
          </SummaryStripWrap>
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
        initialCountryId={
          scopes.country.length === 1 ? scopes.country[0] : undefined
        }
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

const ExtraFilterAnchor = styled.div`
  position: relative;
  display: inline-flex;
`

const ExtraFilterBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 11px;
  border-radius: ${RADIUS.SM};
  border: 1px solid
    ${({ $active, theme }) => {
      const m = theme.mode === 'dark' ? 'dark' : 'light'
      return $active ? ledgerAccentBorder(m) : ledgerHairlineStrong(m)
    }};
  background: ${({ $active, theme }) => {
    const m = theme.mode === 'dark' ? 'dark' : 'light'
    return $active ? ledgerAccentSubtle(m) : ledgerBackground(m)
  }};
  color: ${({ $active, theme }) => {
    const m = theme.mode === 'dark' ? 'dark' : 'light'
    return $active ? ledgerAccent(m) : theme.colors.text.secondary
  }};
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  cursor: pointer;
  white-space: nowrap;
  box-shadow: none;
  transition:
    background ${MOTION.fast} ease,
    color ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      ledgerHoverFill(theme.mode === 'dark' ? 'dark' : 'light')};
  }
  &:focus-visible {
    outline: 2px solid
      ${({ theme }) => ledgerAccent(theme.mode === 'dark' ? 'dark' : 'light')};
    outline-offset: 1px;
  }
`

const ExtraFilterPopover = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 30;
  width: 268px;
  padding: 12px;
  border-radius: ${RADIUS.MD};
  border: 1px solid
    ${({ theme }) =>
      ledgerHairlineStrong(theme.mode === 'dark' ? 'dark' : 'light')};
  background: ${({ theme }) =>
    ledgerBackground(theme.mode === 'dark' ? 'dark' : 'light')};
  box-shadow: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const PopoverSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const PopoverHeadRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const PopoverLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const PopoverValue = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) =>
    ledgerAccent(theme.mode === 'dark' ? 'dark' : 'light')};
`

const PresetPillsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`

const PresetPill = styled.button<{ $active: boolean }>`
  flex: 1;
  min-width: 42px;
  height: 26px;
  padding: 0 7px;
  border-radius: ${RADIUS.XS};
  border: 1px solid
    ${({ $active, theme }) => {
      const m = theme.mode === 'dark' ? 'dark' : 'light'
      return $active ? ledgerAccentBorder(m) : ledgerHairlineStrong(m)
    }};
  background: ${({ $active, theme }) => {
    const m = theme.mode === 'dark' ? 'dark' : 'light'
    return $active ? ledgerAccentSubtle(m) : 'transparent'
  }};
  color: ${({ $active, theme }) => {
    const m = theme.mode === 'dark' ? 'dark' : 'light'
    return $active ? ledgerAccent(m) : theme.colors.text.secondary
  }};
  font-size: 11px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  box-shadow: none;
  transition:
    background ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease,
    color ${MOTION.fast} ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      ledgerHoverFill(theme.mode === 'dark' ? 'dark' : 'light')};
  }
`

const InfluenceSlider = styled.input`
  width: 100%;
  margin: 2px 0 0;
  accent-color: ${({ theme }) =>
    ledgerAccent(theme.mode === 'dark' ? 'dark' : 'light')};
  cursor: pointer;
`

const PopoverFooter = styled.div`
  padding-top: 8px;
  border-top: 1px solid
    ${({ theme }) => ledgerHairline(theme.mode === 'dark' ? 'dark' : 'light')};
  display: flex;
  justify-content: flex-end;
`

const PopoverResetBtn = styled.button`
  border: none;
  background: transparent;
  padding: 2px 6px;
  border-radius: ${RADIUS.XS};
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) =>
    ledgerAccent(theme.mode === 'dark' ? 'dark' : 'light')};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) =>
      ledgerAccentSubtle(theme.mode === 'dark' ? 'dark' : 'light')};
  }
`

const SummaryStripWrap = styled.section`
  margin-top: 10px;
`

const SummaryGrid3Col = styled(BentoGrid3Col)`
  gap: 8px;
`

const CompactBentoCard = styled(BentoCard)`
  padding: 10px 12px;
  gap: 8px;
  box-shadow: none;
  border: 1px solid
    ${({ theme }) =>
      ledgerHairlineStrong(theme.mode === 'dark' ? 'dark' : 'light')};
`

const CompactBentoHeader = styled(BentoCardHeader)`
  padding: 0;
  min-height: 0;
`

const CompactBentoTitle = styled(BentoCardTitle)`
  font-size: 11.5px;
  font-weight: 700;
`

const CompactBentoBody = styled(BentoCardBody)`
  padding: 0;
  gap: 6px;
`

const EraMiniHistogram = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 5px;
  align-items: end;
`

const EraBarButton = styled.button<{ $selected: boolean; $dimmed: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 4px 3px 3px;
  border-radius: ${RADIUS.XS};
  border: 1px solid
    ${({ $selected, theme }) => {
      const m = theme.mode === 'dark' ? 'dark' : 'light'
      return $selected ? ledgerAccentBorder(m) : 'transparent'
    }};
  background: ${({ $selected, theme }) => {
    const m = theme.mode === 'dark' ? 'dark' : 'light'
    return $selected ? ledgerAccentSubtle(m) : 'transparent'
  }};
  opacity: ${({ $dimmed }) => ($dimmed ? 0.42 : 1)};
  cursor: pointer;
  box-shadow: none;
  min-width: 0;
  transition:
    opacity ${MOTION.fast} ease,
    background ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease;

  &:hover {
    opacity: 1;
    background: ${({ theme }) =>
      ledgerHoverFill(theme.mode === 'dark' ? 'dark' : 'light')};
  }
  &:focus-visible {
    outline: 2px solid
      ${({ theme }) => ledgerAccent(theme.mode === 'dark' ? 'dark' : 'light')};
    outline-offset: 1px;
  }
`

const EraBarCount = styled.span<{ $selected: boolean }>`
  ${DIGIT_DISPLAY}
  font-size: 10px;
  font-weight: ${({ $selected }) => ($selected ? 800 : 600)};
  line-height: 1.1;
  color: ${({ $selected, theme }) =>
    $selected
      ? ledgerAccent(theme.mode === 'dark' ? 'dark' : 'light')
      : theme.colors.text.secondary};
`

const EraBarTrack = styled.span<{ $selected: boolean }>`
  width: 100%;
  height: 36px;
  display: flex;
  align-items: flex-end;
  padding: 2px;
  border-radius: ${RADIUS.XS};
  background: ${({ theme }) =>
    ledgerSubtleFill(theme.mode === 'dark' ? 'dark' : 'light')};
  border: 1px solid
    ${({ $selected, theme }) => {
      const m = theme.mode === 'dark' ? 'dark' : 'light'
      return $selected ? ledgerAccentBorder(m) : ledgerHairline(m)
    }};
`

const EraBarFill = styled.span`
  display: block;
  width: 100%;
  border-radius: 2px 2px 0 0;
  transition: height ${MOTION.normal} ease;
`

const EraBarLabel = styled.span<{ $selected: boolean }>`
  max-width: 100%;
  font-size: 10px;
  font-weight: ${({ $selected }) => ($selected ? 700 : 500)};
  line-height: 1.15;
  color: ${({ $selected, theme }) =>
    $selected
      ? ledgerAccent(theme.mode === 'dark' ? 'dark' : 'light')
      : theme.colors.text.tertiary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const FieldSummaryLayout = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`

const FieldSummaryMain = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
`

const FieldChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`

const FieldStatChip = styled.button<{ $selected: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: ${RADIUS.XS};
  border: 1px solid
    ${({ $selected, theme }) => {
      const m = theme.mode === 'dark' ? 'dark' : 'light'
      return $selected ? ledgerAccentBorder(m) : ledgerHairlineStrong(m)
    }};
  background: ${({ $selected, theme }) => {
    const m = theme.mode === 'dark' ? 'dark' : 'light'
    return $selected ? ledgerAccentSubtle(m) : 'transparent'
  }};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 10.5px;
  font-weight: ${({ $selected }) => ($selected ? 700 : 500)};
  cursor: pointer;
  box-shadow: none;

  strong {
    ${DIGIT_DISPLAY}
    font-weight: 700;
    color: ${({ $selected, theme }) =>
      $selected
        ? ledgerAccent(theme.mode === 'dark' ? 'dark' : 'light')
        : theme.colors.text.primary};
  }

  &:disabled {
    cursor: default;
  }

  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      ledgerHoverFill(theme.mode === 'dark' ? 'dark' : 'light')};
  }
`

const FieldDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
`

const TopCountryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const TopCountryRow = styled.button<{ $selected: boolean }>`
  display: grid;
  grid-template-columns: 14px minmax(52px, 84px) minmax(40px, 1fr) auto;
  align-items: center;
  gap: 6px;
  padding: 2px 4px;
  margin: 0 -4px;
  border-radius: ${RADIUS.XS};
  border: 1px solid
    ${({ $selected, theme }) => {
      const m = theme.mode === 'dark' ? 'dark' : 'light'
      return $selected ? ledgerAccentBorder(m) : 'transparent'
    }};
  background: ${({ $selected, theme }) => {
    const m = theme.mode === 'dark' ? 'dark' : 'light'
    return $selected ? ledgerAccentSubtle(m) : 'transparent'
  }};
  cursor: pointer;
  text-align: left;
  box-shadow: none;

  &:disabled {
    cursor: default;
  }

  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      ledgerHoverFill(theme.mode === 'dark' ? 'dark' : 'light')};
  }
`

const TopCountryRank = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-align: center;
`

const TopCountryName = styled.span<{ $selected: boolean }>`
  font-size: 11px;
  font-weight: ${({ $selected }) => ($selected ? 700 : 600)};
  color: ${({ $selected, theme }) =>
    $selected
      ? ledgerAccent(theme.mode === 'dark' ? 'dark' : 'light')
      : theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const TopCountryBarTrack = styled.span`
  height: 6px;
  border-radius: ${RADIUS.PILL};
  background: ${({ theme }) =>
    ledgerSubtleFill(theme.mode === 'dark' ? 'dark' : 'light')};
  border: 1px solid
    ${({ theme }) => ledgerHairline(theme.mode === 'dark' ? 'dark' : 'light')};
  overflow: hidden;
`

const TopCountryBarFill = styled.span<{ $selected: boolean }>`
  display: block;
  height: 100%;
  border-radius: ${RADIUS.PILL};
  opacity: ${({ $selected }) => ($selected ? 1 : 0.85)};
  transition: width ${MOTION.normal} ease;
`

const TopCountryStat = styled.span`
  ${DIGIT_DISPLAY}
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  font-size: 10.5px;

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  span {
    font-size: 9.5px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`

/** 2단 컨트롤 바 — 검색 + 빠른 필터 + 우측 표시 옵션(그룹·정렬·카드/리스트) */
const SubBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px 10px;
  flex-wrap: wrap;
  margin-top: 8px;
  min-height: 36px;

  & > ${DisplayOptions} {
    margin-left: auto;
  }
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
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.13)'
        : '#ffffff'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.tertiary};
  box-shadow: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '0 1px 2px rgba(0,0,0,0.35)'
        : '0 1px 2px rgba(15,23,42,0.06)'
      : 'none'};
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
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
