/**
 * 가문 구성원 인포그래픽 모달.
 * 통계 스트립 + 검색·정렬·뷰 토글 + Timeline / Grid 뷰.
 */
import { useEffect, useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'

import { FiUsers, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { dynastyApi } from '@/shared/api/dynasty'
import { personApi, type Person } from '@/shared/api/person'
import {
  formatCountryYearShort,
  signedYearFromIsoLike,
  toSignedYear,
} from '@/shared/lib/country-period'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { glassCardMixin } from '@/shared/styles/mixins'
import { OVERLAY_STYLES, Z_INDEX } from '@/shared/styles/z-index'

import { MembersControls, type MemberSort, type MemberView } from './ui/members-controls'
import { MembersGridView } from './ui/members-grid-view'
import { MembersSkeleton } from './ui/members-skeleton'
import { MembersStatsStrip } from './ui/members-stats-strip'
import { MembersTimelineView } from './ui/members-timeline-view'
import { ViewBody } from './ui/members.styles'

export type DynastyMembersInfographicModalProps = {
  dynastyId: string
  dynastyName: string
  isOpen: boolean
  onClose: () => void
}

function signedYear(era: 'BC' | 'AD' | null | undefined, year: number): number {
  return era === 'BC' ? -year : year
}

/** ISO 문자열에서 연도만 안전 추출 — 네이티브 Date의 타임존/BC 함정을 피해 문자열 파싱. */
function yearOf(iso: string | null | undefined): string | null {
  if (!iso) return null
  const match = iso.match(/^(\d{1,4})-/)
  return match ? String(parseInt(match[1], 10)) : null
}

/**
 * 가문 존속기간 라벨 — 구조화(startEra/startYear) 우선, 없으면 레거시 DateTime ISO 폴백.
 * BC는 'BC 44' 표기. "1600–1918" / "BC 753–" / "–1918" / null(둘 다 없음).
 */
function periodOf(d: {
  startEra: string | null
  startYear: number | null
  startDate: string | null
  endEra: string | null
  endYear: number | null
  endDate: string | null
}): string | null {
  const start =
    toSignedYear(d.startEra, d.startYear) ?? signedYearFromIsoLike(d.startDate)
  const end = toSignedYear(d.endEra, d.endYear) ?? signedYearFromIsoLike(d.endDate)
  if (start == null && end == null) return null
  return `${formatCountryYearShort(start) ?? ''}–${formatCountryYearShort(end) ?? ''}`
}

/** 시조 생몰 연도 — "595–673" / "595–" / null. */
function lifespanYears(
  birth: string | null,
  death: string | null,
): string | null {
  const birthYear = yearOf(birth)
  const deathYear = yearOf(death)
  if (!birthYear && !deathYear) return null
  return `${birthYear ?? '?'}–${deathYear ?? ''}`
}

function ageOf(p: Person): number | null {
  if (p.birthYear == null) return null
  const start = signedYear(p.birthEra ?? null, p.birthYear)
  if (p.isAlive) return new Date().getFullYear() - start
  if (p.deathYear == null) return null
  const end = signedYear(p.deathEra ?? null, p.deathYear)
  return end - start
}

function compareBy(sort: MemberSort) {
  return (a: Person, b: Person) => {
    if (sort === 'name') {
      return getPersonDisplayName(a, true).localeCompare(
        getPersonDisplayName(b, true),
        'ko',
      )
    }
    if (sort === 'age') {
      const aa = ageOf(a) ?? -1
      const ab = ageOf(b) ?? -1
      return ab - aa
    }
    if (sort === 'influence') {
      return (b.influence ?? -1) - (a.influence ?? -1)
    }
    // birth: oldest first; missing birth at end
    const ya = a.birthYear != null ? signedYear(a.birthEra ?? null, a.birthYear) : Number.POSITIVE_INFINITY
    const yb = b.birthYear != null ? signedYear(b.birthEra ?? null, b.birthYear) : Number.POSITIVE_INFINITY
    return ya - yb
  }
}

function matchesQuery(p: Person, q: string): boolean {
  if (!q) return true
  const haystack = [
    p.name,
    p.surname,
    p.middleName,
    p.regnalName,
    p.country?.name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

export function DynastyMembersInfographicModal({
  dynastyId,
  dynastyName,
  isOpen,
  onClose,
}: DynastyMembersInfographicModalProps) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<MemberSort>('birth')
  const [view, setView] = useState<MemberView>('timeline')

  const { data: persons = [], isLoading, isError, error } = useQuery({
    queryKey: ['persons-by-dynasty', dynastyId],
    queryFn: () => personApi.getByDynastyId(dynastyId),
    enabled: isOpen && Boolean(dynastyId),
    staleTime: 60_000,
  })

  // 헤더 요약(시조·존속기간·설명)용 가문 엔티티 — 구성원 목록과 별개 쿼리.
  const { data: dynasty } = useQuery({
    queryKey: ['dynasty-brief', dynastyId],
    queryFn: () => dynastyApi.getById(dynastyId),
    enabled: isOpen && Boolean(dynastyId),
    staleTime: 300_000,
  })

  // ESC 키로 모달 닫기 + 모달 열려 있는 동안 배경 스크롤 잠금
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen, onClose])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return persons.filter((p) => matchesQuery(p, q)).sort(compareBy(sort))
  }, [persons, query, sort])

  if (!isOpen) return null

  const total = persons.length
  const showContent = !isLoading && !isError && total > 0

  // 헤더 요약 파생값 — 시조(등록 인물 또는 텍스트)·존속기간·설명.
  const founderName = dynasty?.founder
    ? [dynasty.founder.surname, dynasty.founder.name].filter(Boolean).join(' ')
    : dynasty?.founderText?.trim() || null
  const founderLifespan = dynasty?.founder
    ? lifespanYears(dynasty.founder.birthDate, dynasty.founder.deathDate)
    : null
  const periodLabel = dynasty ? periodOf(dynasty) : null
  const description = dynasty?.description?.trim() || null
  const hasMeta = Boolean(founderName || periodLabel || description)

  return (
    <Overlay
      role="dialog"
      aria-modal
      aria-labelledby="dynasty-members-title"
      onClick={onClose}
    >
      <Panel onClick={(e) => e.stopPropagation()}>
        <PanelHeader>
          <HeaderLead>
            <HeaderIcon aria-hidden>
              <FiUsers size={20} strokeWidth={1.75} />
            </HeaderIcon>
            <div>
              <PanelTitle id="dynasty-members-title">가문 인물 인포그래픽</PanelTitle>
              <PanelSubtitle>{dynastyName}</PanelSubtitle>
            </div>
          </HeaderLead>
          <CloseBtn type="button" aria-label="닫기" onClick={onClose}>
            <FiX size={22} />
          </CloseBtn>
        </PanelHeader>

        {hasMeta && (
          <DynastyMetaBand>
            {(founderName || periodLabel) && (
              <DynastyMetaList>
                {founderName && (
                  <DynastyMetaItem>
                    <DynastyMetaLabel>시조</DynastyMetaLabel>
                    <DynastyMetaValue>
                      {founderName}
                      {founderLifespan && (
                        <DynastyMetaSub>{founderLifespan}</DynastyMetaSub>
                      )}
                    </DynastyMetaValue>
                  </DynastyMetaItem>
                )}
                {periodLabel && (
                  <DynastyMetaItem>
                    <DynastyMetaLabel>존속</DynastyMetaLabel>
                    <DynastyMetaValue>{periodLabel}</DynastyMetaValue>
                  </DynastyMetaItem>
                )}
              </DynastyMetaList>
            )}
            {description && <DynastyDesc>{description}</DynastyDesc>}
          </DynastyMetaBand>
        )}

        {showContent && <MembersStatsStrip persons={persons} />}

        {showContent && (
          <MembersControls
            query={query}
            onQueryChange={setQuery}
            sort={sort}
            onSortChange={setSort}
            view={view}
            onViewChange={setView}
            total={total}
            filtered={filtered.length}
          />
        )}

        <ViewBody>
          {isLoading && <MembersSkeleton view={view} />}
          {isError && (
            <StatusMsg $err>
              {error instanceof Error && error.message
                ? error.message
                : '목록을 불러오지 못했습니다.'}
            </StatusMsg>
          )}
          {!isLoading && !isError && total === 0 && (
            <EmptyWrap>
              <EmptyIcon aria-hidden>
                <FiUsers size={28} strokeWidth={1.5} />
              </EmptyIcon>
              <EmptyTitle>이 가문에 등록된 인물이 없습니다</EmptyTitle>
              <EmptyDesc>
                인물 페이지에서 가문을 지정하면 여기에 표시됩니다.
              </EmptyDesc>
            </EmptyWrap>
          )}
          {!isLoading && !isError && total > 0 && filtered.length === 0 && (
            <StatusMsg>"{query}" 검색과 일치하는 인물이 없습니다.</StatusMsg>
          )}
          {!isLoading && !isError && filtered.length > 0 && (
            view === 'timeline' ? (
              <MembersTimelineView persons={filtered} />
            ) : (
              <MembersGridView persons={filtered} />
            )
          )}
        </ViewBody>
      </Panel>
    </Overlay>
  )
}

/* ─── shell styles ──────────────────────────────────────────────────────── */

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: ${OVERLAY_STYLES.BACKGROUND};
  backdrop-filter: ${OVERLAY_STYLES.BACKDROP_FILTER};
`

const Panel = styled.div`
  ${({ theme }) => glassCardMixin(theme)}
  width: 100%;
  max-width: 1280px;
  height: 90vh;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  overflow: hidden;
  z-index: ${Z_INDEX.MODAL_CONTENT};
`

const PanelHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const HeaderLead = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
`

const HeaderIcon = styled.div`
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.activeLight};
`

const PanelTitle = styled.h2`
  margin: 0 0 4px;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const PanelSubtitle = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

// ─── 가문 요약 밴드 (시조·존속기간·설명) — 헤더와 통계 스트립 사이 ───────────────
const DynastyMetaBand = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 22px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const DynastyMetaList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
`

const DynastyMetaItem = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
`

const DynastyMetaLabel = styled.span`
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const DynastyMetaValue = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const DynastyMetaSub = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const DynastyDesc = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const CloseBtn = styled.button`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.tertiary};
  transition: background 0.15s ease, color 0.15s ease;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.background.quaternary};
  }
`

const StatusMsg = styled.p<{ $err?: boolean }>`
  margin: 32px 0;
  text-align: center;
  font-size: 14px;
  color: ${({ theme, $err }) =>
    $err ? theme.colors.error : theme.colors.text.secondary};
`

const EmptyWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 56px 24px;
`

const EmptyIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99,106,242,0.14)'
      : 'rgba(99,102,241,0.08)'};
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: 18px;
`

const EmptyTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EmptyDesc = styled.p`
  margin: 8px 0 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 320px;
  line-height: 1.55;
`
