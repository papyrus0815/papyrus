/**
 * 인물 인포그래픽 콘텐츠 — 헤더 + 검색 + 통계 토글 + 뷰 디스패치.
 *
 * 5개 뷰(matrix/galaxy/story/dynasty/stats)는 각자 별도 파일.
 * records(기록 비교) 뷰는 상위 PersonInfographicPane이 별도 분기.
 * 필터·뷰·정렬 상태는 zustand store + URL 쿼리 동기화로 공유.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { motion } from 'framer-motion'
import { FiBarChart2, FiPlus, FiSearch, FiX } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import { usePersonsInfographic } from '@/entities/person/api'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { PersonTabSharedTitle } from '@/widgets/country/country-detail/ui/country-detail.styles'
import { PersonRegisterViewModal } from '@/widgets/country/country-list/ui/person-register-view-modal'

import { ERAS } from '../model/constants'
import {
  countActiveScopes,
  matchesScopes,
  usePersonInfographicFilterStore,
  type PersonInfographicView,
} from '../model/filter.store'
import { useAdaptedPersons } from '../model/use-adapted-persons'

import { CardsView } from './cards-view'
import { DynastyView } from './dynasty-view'
import { CardGridSkeleton } from './_shared/card-grid-skeleton'
import { EmptyState } from './_shared/empty-state'
import { EraOrderToggle } from './_shared/era-order-toggle'
import { SortBar } from './_shared/sort-bar'
import { EraStoryView } from './era-story-view'
import { GalaxyView } from './galaxy-view'
import { HeaderStats } from './header-stats'
import { MatrixView } from './matrix-view'
import { StatsView } from './stats-view'

interface InfographicContentProps {
  /** 인물 카드/아이템 클릭 시 상세로 이동 */
  onPersonClick: (id: string) => void
}

const STATS_KEY = 'person-infographic-stats-open'

export function InfographicContent({
  onPersonClick,
}: InfographicContentProps) {
  // URL ↔ store 동기화는 상위 PersonInfographicPane이 담당 (records 뷰 분기 공유)
  const { isLoading, isError, refetch } = usePersonsInfographic()
  const allPeople = useAdaptedPersons()

  const scopes = usePersonInfographicFilterStore((s) => s.scopes)
  const resetFilters = usePersonInfographicFilterStore((s) => s.resetFilters)
  const view = usePersonInfographicFilterStore((s) => s.view)
  const storeQuery = usePersonInfographicFilterStore((s) => s.query)
  const setStoreQuery = usePersonInfographicFilterStore((s) => s.setQuery)
  // 검색 입력은 로컬 state로 즉시 반영하고, 디바운스된 값만 store(→URL)에 커밋.
  // (이전엔 키 입력마다 store.query→url-sync가 URL을 replaceState로 갱신해 history 스팸)
  const [searchInput, setSearchInput] = useState(storeQuery)
  const minInfluence = usePersonInfographicFilterStore((s) => s.minInfluence)
  const aliveFilter = usePersonInfographicFilterStore((s) => s.aliveFilter)
  const pinnedList = usePersonInfographicFilterStore((s) => s.pinned)
  const storeTogglePin = usePersonInfographicFilterStore((s) => s.togglePin)

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

  // records 뷰만 상위 PersonInfographicPane이 분기 — 여기선 cards(평면 목록) 포함 나머지를 다룬다.
  const activeView: Exclude<PersonInfographicView, 'records'> =
    view === 'records' ? 'cards' : view

  const hasActiveFilter =
    totalScopeCount > 0 ||
    minInfluence > 0 ||
    aliveFilter !== 'all' ||
    !!dq.trim()

  return (
    <motion.div
      key="infographic"
      id="person-view-panel"
      role="tabpanel"
      aria-labelledby={`person-view-tab-${activeView}`}
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
        <Toolbar>
          <ToolbarHead>
            <PersonTabSharedTitle>
              {scopeLabel}
              {filtered.length > 0 && (
                <TitleMeta>
                  {filtered.length}명
                  {avgLifespan > 0 && ` · 평균 수명 ${avgLifespan}년`}
                </TitleMeta>
              )}
            </PersonTabSharedTitle>
          </ToolbarHead>

          <ToolbarMid>
            <SearchBox>
              <SearchIconWrap>
                <FiSearch size={13} />
              </SearchIconWrap>
              <SearchInput
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="이름, 국가, 소속 검색…"
                aria-label="인물 검색"
              />
              {searchInput && (
                <ClearBtn
                  onClick={() => setSearchInput('')}
                  aria-label="검색어 지우기"
                >
                  <FiX size={13} />
                </ClearBtn>
              )}
            </SearchBox>
            {/* 정렬은 카드 그리드 뷰(카드·스토리·왕조)에서만 의미 */}
            {(activeView === 'cards' ||
              activeView === 'story' ||
              activeView === 'dynasty') && <SortBar />}
            {/* 세기 그룹 나열 방향(최신/오래된순)은 세기 그룹 뷰(스토리) 전용 */}
            {activeView === 'story' && <EraOrderToggle />}
          </ToolbarMid>

          <ToolbarActions>
            <StatsToggleBtn
              type="button"
              onClick={toggleStats}
              aria-pressed={statsOpen}
              title={statsOpen ? '통계 숨기기' : '통계 보기'}
            >
              <FiBarChart2 size={13} />
              통계
            </StatsToggleBtn>
            <AddPersonBtn onClick={() => setFormOpen(true)}>
              <FiPlus size={14} />새 인물
            </AddPersonBtn>
          </ToolbarActions>
        </Toolbar>

        {!isLoading && filtered.length > 0 && statsOpen && (
          <HeaderStats people={filtered} />
        )}

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

        {!isLoading && filtered.length > 0 && (
          <Footer>
            <span>총 {filtered.length}명</span>
            <span>
              · 평균 영향력{' '}
              {Math.round(
                filtered.reduce((s, p) => s + p.influence, 0) / filtered.length,
              )}
            </span>
          </Footer>
        )}
      </Wrap>

      <PersonRegisterViewModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={() => setFormOpen(false)}
      />
    </motion.div>
  )
}

const Wrap = styled.div`
  /* 상위(PersonInfographicPane)가 좌우/상단 padding을 담당. 여기서는 하단 여백만. */
  padding: 12px 0 60px;

  @media (max-width: 768px) {
    padding: 8px 0 40px;
  }
`

const ViewArea = styled.div`
  margin-top: 18px;
`

/** 시각적으로 숨기되 스크린리더에는 노출되는 라이브 영역. */
const SrStatus = styled.div`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`

const Footer = styled.div`
  margin-top: 24px;
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px 16px;
  flex-wrap: wrap;
  margin-bottom: 6px;
`

const ToolbarHead = styled.div`
  flex-shrink: 0;
  min-width: 0;
`

const TitleMeta = styled.span`
  margin-left: 10px;
  font-size: 13px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ToolbarMid = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 260px;
  min-width: 0;
  flex-wrap: wrap;
`

const ToolbarActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto;
`

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 1;
  max-width: 320px;
  height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
        `
      : css`
          background: ${theme.colors.background.secondary};
          border: 1px solid ${theme.colors.border.default};
        `}
`

const SearchInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const SearchIconWrap = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  display: flex;
  align-items: center;
  flex-shrink: 0;
`

const ClearBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding: 0 2px;
  line-height: 1;
  display: flex;
  align-items: center;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const AddPersonBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  /* 테마 액센트 토큰 사용 — empty-state의 기본 버튼과 동일(다크모드 일관성) */
  background: ${({ theme }) => theme.colors.active};
  color: ${({ theme }) => theme.colors.background.primary};
  transition: opacity 0.14s;
  &:hover {
    opacity: 0.9;
  }
`

const StatsToggleBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  transition: background 0.14s, color 0.14s, border-color 0.14s;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &[aria-pressed='true'] {
    background: ${({ theme }) => theme.colors.activeLight};
    color: ${({ theme }) => theme.colors.active};
    border-color: transparent;
  }
`
