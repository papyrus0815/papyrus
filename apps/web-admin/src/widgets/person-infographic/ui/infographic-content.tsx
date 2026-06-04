/**
 * 인물 인포그래픽 콘텐츠 — 헤더 + 검색 + 통계 토글 + 뷰 디스패치.
 *
 * 6개 뷰(matrix/galaxy/story/dynasty/stats)는 각자 별도 파일.
 * 필터·뷰·정렬 상태는 zustand store + URL 쿼리 동기화로 공유.
 */
import React, { useCallback, useMemo, useState } from 'react'

import { motion } from 'framer-motion'
import { FiBarChart2, FiPlus, FiSearch, FiX } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import { usePersons } from '@/entities/person/api'
import {
  PersonTabSharedHeader,
  PersonTabSharedHeaderLeft,
  PersonTabSharedHeaderRight,
  PersonTabSharedTitle,
} from '@/widgets/country/country-detail/ui/country-detail.styles'
import { PersonRegisterViewModal } from '@/widgets/country/country-list/ui/person-register-view-modal'

import {
  ERAS,
  yearOfEra,
  useAdaptedPersons,
  usePersonInfographicFilterStore,
  type PersonInfographicView,
} from '@/widgets/person-infographic'
import { useFilterUrlSync } from '../model/url-sync'

import { DynastyView } from './dynasty-view'
import { EmptyState } from './_shared/empty-state'
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
  useFilterUrlSync()
  const { isLoading } = usePersons()
  const allPeople = useAdaptedPersons()

  const scopes = usePersonInfographicFilterStore((s) => s.scopes)
  const resetFilters = usePersonInfographicFilterStore((s) => s.resetFilters)
  const view = usePersonInfographicFilterStore((s) => s.view)
  const q = usePersonInfographicFilterStore((s) => s.query)
  const setQ = usePersonInfographicFilterStore((s) => s.setQuery)
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
  const [editId] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)

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
    let arr = allPeople
    if (scopes.era.length > 0)
      arr = arr.filter((p) =>
        scopes.era.includes(yearOfEra(p.activityYear).key),
      )
    if (scopes.region.length > 0)
      arr = arr.filter((p) => scopes.region.includes(p.region))
    if (scopes.field.length > 0)
      arr = arr.filter((p) => scopes.field.includes(p.field))
    if (scopes.country.length > 0)
      arr = arr.filter((p) => scopes.country.includes(p.country))
    if (minInfluence > 0) arr = arr.filter((p) => p.influence >= minInfluence)
    if (aliveFilter === 'alive') arr = arr.filter((p) => p.isAlive)
    else if (aliveFilter === 'dead') arr = arr.filter((p) => !p.isAlive)
    if (q.trim()) {
      const qq = q.toLowerCase()
      arr = arr.filter(
        (p) =>
          p.name.toLowerCase().includes(qq) ||
          p.country.toLowerCase().includes(qq) ||
          p.faction.toLowerCase().includes(qq) ||
          (p.primaryTitle?.toLowerCase().includes(qq) ?? false),
      )
    }
    return arr
  }, [allPeople, scopes, q, minInfluence, aliveFilter])

  // 활성 scope 라벨 — 단일이면 그 값, 다중이면 "필터링됨". 모두 비면 "전체 인물".
  const totalScopeCount =
    scopes.era.length +
    scopes.region.length +
    scopes.field.length +
    scopes.country.length
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

  const avgLifespan = filtered.length
    ? Math.round(
        filtered.reduce((s, p) => s + Math.abs(p.died - p.born), 0) /
          filtered.length,
      )
    : 0

  // 'cards' 이외의 뷰만 이 컴포넌트가 다룸. (cards 뷰는 PersonInfographicPane이 분기.)
  const activeView: Exclude<PersonInfographicView, 'cards'> =
    view === 'cards' ? 'story' : view

  const hasActiveFilter =
    totalScopeCount > 0 ||
    minInfluence > 0 ||
    aliveFilter !== 'all' ||
    !!q.trim()

  return (
    <motion.div
      key="infographic"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Wrap>
        <PersonTabSharedHeader>
          <PersonTabSharedHeaderLeft>
            <PersonTabSharedTitle>
              {scopeLabel}
              {filtered.length > 0 && (
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 400,
                    color: 'var(--text-tertiary)',
                    marginLeft: 10,
                  }}
                >
                  {filtered.length}명 · 평균 수명 {avgLifespan}년
                </span>
              )}
            </PersonTabSharedTitle>
          </PersonTabSharedHeaderLeft>
          <PersonTabSharedHeaderRight>
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
          </PersonTabSharedHeaderRight>
        </PersonTabSharedHeader>

        <SearchRow>
          <SearchBox>
            <SearchIconWrap>
              <FiSearch size={13} />
            </SearchIconWrap>
            <SearchInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="이름, 국가, 소속 검색…"
            />
            {q && (
              <ClearBtn onClick={() => setQ('')} aria-label="검색어 지우기">
                <FiX size={13} />
              </ClearBtn>
            )}
          </SearchBox>
        </SearchRow>

        {!isLoading && filtered.length > 0 && statsOpen && (
          <HeaderStats people={filtered} />
        )}

        {isLoading && <EmptyState title="데이터를 불러오는 중…" />}

        {!isLoading && filtered.length === 0 && (
          <EmptyState
            hasActiveFilter={hasActiveFilter}
            onClearFilters={resetFilters}
          />
        )}

        {!isLoading && filtered.length > 0 && (
          <ViewArea>
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
                q={q}
                pinned={pinned}
                togglePin={togglePin}
              />
            )}
            {activeView === 'dynasty' && (
              <DynastyView
                people={filtered}
                onOpen={onPersonClick}
                q={q}
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
      <PersonRegisterViewModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        editPersonId={editId}
        onSuccess={() => setEditOpen(false)}
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

const Footer = styled.div`
  margin-top: 24px;
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 4px;
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
  background: #6366f1;
  color: #fff;
  transition: background 0.14s;
  &:hover {
    background: #4f46e5;
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
