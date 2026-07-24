/**
 * 가문 섹션 — 풀 페이지 진입점이 사용.
 * 스티키 헤더(스크롤 시 compact) + 검색·필터·정렬 + 와이드 행 리스트 + 인라인 다중 확장.
 *
 * 주의: 행 가상화는 의도적으로 미적용 (현재 데이터 규모: 수 개~수십 개).
 *       200+ 도달 시 react-virtuoso 등 도입 검토 필요.
 */
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import styled from 'styled-components'

import {
  useCreateDynasty,
  useDeleteDynasty,
  useDynasties,
  useUpdateDynasty,
} from '@/features/dynasty/use-dynasties.hook'
import type { Dynasty, DynastyMutationBody } from '@/shared/api/dynasty'
import {
  formatCountryYearShort,
  signedYearFromIsoLike,
  toSignedYear,
} from '@/shared/lib/country-period'
import { confirm } from '@/shared/ui/confirm-dialog'

import { DynastyFormModal } from './dynasty-form-modal'
import { DynastyMembersInfographicModal } from './dynasty-members-infographic-modal'
import { DynastyRulesModal } from './dynasty-rules-modal'
import {
  defaultDirFor,
  DynastyControls,
  type SortDir,
  type SortKey,
  type StatusFilter,
} from './ui/dynasty-controls'
import { DynastyEmptyState } from './ui/dynasty-empty-state'
import type { DynastyFormPayload } from './ui/dynasty-form'
import { DynastyRow, type DynastyDerived } from './ui/dynasty-row'
import { DynastySkeleton } from './ui/dynasty-skeleton'
import {
  EraGroupCount,
  EraGroupMarker,
  HeaderTopRow,
  KpiInlineGroup,
  KpiInlineItem,
  KpiInlineLabel,
  KpiInlineValue,
  PageTitle,
  RowList,
  ScrollBody,
  SecondaryButton,
  SectionRoot,
  StatusPanel,
  StickyHeader,
  StickyHeaderInner,
  TitleCluster,
} from './ui/dynasty.styles'

/** 구조화(startEra/startYear) 우선, 없으면 레거시 DateTime ISO를 부호연도로 폴백 파싱(new Date 금지). */
function signedStartYear(d: Dynasty): number | null {
  return toSignedYear(d.startEra, d.startYear) ?? signedYearFromIsoLike(d.startDate)
}
function signedEndYear(d: Dynasty): number | null {
  return toSignedYear(d.endEra, d.endYear) ?? signedYearFromIsoLike(d.endDate)
}

function deriveOne(d: Dynasty): DynastyDerived {
  const startYear = signedStartYear(d)
  const endYear = signedEndYear(d)
  const ongoing = startYear != null && endYear == null
  let duration: number | null = null
  if (startYear != null) {
    const e = endYear ?? new Date().getFullYear()
    duration = Math.max(0, e - startYear)
  }
  return { dynasty: d, startYear, endYear, duration, ongoing }
}

function matchesQuery(d: Dynasty, q: string): boolean {
  if (!q) return true
  const haystack = [
    d.name,
    d.description,
    d.originPlace,
    d.founderText,
    d.motto,
    d.startReason,
    d.endReason,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

function matchesStatus(d: DynastyDerived, status: StatusFilter): boolean {
  if (status === 'all') return true
  if (status === 'ongoing') return d.ongoing
  // 'ended' — 종료년이 명시된 가문만
  return d.endYear != null
}

function compareBy(sort: SortKey, dir: SortDir) {
  // sort 자연 정렬(asc) 기준으로 비교한 뒤 dir 가 desc 면 부호 반전.
  // 단, 미상(null) 항목은 dir 와 무관하게 항상 뒤로.
  const sign = dir === 'desc' ? -1 : 1
  return (a: DynastyDerived, b: DynastyDerived) => {
    if (sort === 'name') {
      return sign * (a.dynasty.name ?? '').localeCompare(b.dynasty.name ?? '', 'ko')
    }
    if (sort === 'duration') {
      const da = a.duration
      const db = b.duration
      if (da == null && db == null) return 0
      if (da == null) return 1
      if (db == null) return -1
      return sign * (da - db)
    }
    // era 자연순 = 오래된 순(작은 시작년 먼저)
    const sa = a.startYear
    const sb = b.startYear
    if (sa == null && sb == null) return 0
    if (sa == null) return 1
    if (sb == null) return -1
    return sign * (sa - sb)
  }
}

/** 시작년도 기준 century 라벨 반환. 미상은 null. */
function centuryOf(year: number | null): number | null {
  if (year == null) return null
  // BC 케이스도 안전하게 처리: -50 → -100년대 (BC 100년대 = -100 ~ -1)
  return Math.floor(year / 100) * 100
}

function centuryLabel(century: number): string {
  if (century >= 0) return `${century}년대`
  return `BC ${Math.abs(century)}년대`
}

/** 빈 문자열은 편집 시 null(=clear), 신규 시 undefined(=skip)로. */
function emptyToNullOrUndefined(
  value: string,
  editing: boolean,
): string | null | undefined {
  const trimmed = value.trim()
  if (trimmed) return trimmed
  return editing ? null : undefined
}

export function DynastySection() {
  const { data: dynasties = [], isLoading, isError, refetch } = useDynasties()
  const createDynasty = useCreateDynasty()
  const updateDynasty = useUpdateDynasty()
  const deleteDynasty = useDeleteDynasty()

  // 폼 모달이 열려있을 때 editing이 null이면 신규, 객체면 수정
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Dynasty | null>(null)
  const [membersModal, setMembersModal] = useState<{
    id: string
    name: string
  } | null>(null)
  const [rulesModal, setRulesModal] = useState<{
    id: string
    name: string
  } | null>(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('era')
  const [sortDir, setSortDir] = useState<SortDir>(defaultDirFor('era'))
  const [status, setStatus] = useState<StatusFilter>('all')
  // 다중 expand 허용 — Set 으로 보관
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())
  // 스크롤 컨테이너 + 헤더 compact 토글
  const scrollRootRef = useRef<HTMLDivElement>(null)
  const [headerCompact, setHeaderCompact] = useState(false)

  const list = Array.isArray(dynasties) ? dynasties : []
  const isSaving = createDynasty.isPending || updateDynasty.isPending

  // 파생 데이터
  const allDerived = useMemo(() => list.map(deriveOne), [list])

  // 전역 통계(KPI 용) — 항상 전체 가문 기준
  const globalStats = useMemo(() => {
    let minStart: number | null = null
    let maxKnownEnd: number | null = null
    let durSum = 0
    let durCount = 0
    let ongoingCount = 0
    let endedCount = 0
    for (const d of allDerived) {
      if (d.startYear != null) {
        minStart = minStart == null ? d.startYear : Math.min(minStart, d.startYear)
      }
      if (d.endYear != null) {
        maxKnownEnd = maxKnownEnd == null ? d.endYear : Math.max(maxKnownEnd, d.endYear)
      }
      if (d.duration != null) {
        durSum += d.duration
        durCount += 1
      }
      if (d.ongoing) ongoingCount += 1
      else if (d.endYear != null) endedCount += 1
    }
    const avgDuration = durCount > 0 ? Math.round(durSum / durCount) : null
    const eraSpan = minStart != null ? { min: minStart, max: maxKnownEnd } : null
    return { avgDuration, eraSpan, ongoingCount, endedCount }
  }, [allDerived])

  // 필터 + 정렬
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allDerived
      .filter((d) => matchesQuery(d.dynasty, q) && matchesStatus(d, status))
      .sort(compareBy(sort, sortDir))
  }, [allDerived, query, status, sort, sortDir])

  // 타임라인 축 — 필터 결과 기준으로 재계산해 막대가 의미있는 너비를 가짐
  const axis = useMemo(() => {
    const nowYear = new Date().getFullYear()
    let minStart: number | null = null
    let maxAxisEnd = nowYear
    for (const d of filtered) {
      if (d.startYear != null) {
        minStart = minStart == null ? d.startYear : Math.min(minStart, d.startYear)
      }
      if (d.endYear != null) maxAxisEnd = Math.max(maxAxisEnd, d.endYear)
    }
    if (minStart == null) return { axisMin: 0, axisMax: nowYear }
    const range = maxAxisEnd - minStart
    const pad = Math.max(20, Math.round(range * 0.04))
    return { axisMin: minStart - pad, axisMax: maxAxisEnd + pad }
  }, [filtered])

  const totalCount = allDerived.length
  const showTimeline = sort === 'era'

  // sort='era' 일 때 century 별 count — 한 번만 집계
  const centuryCounts = useMemo(() => {
    if (sort !== 'era') return null
    const counts = new Map<number, number>()
    for (const d of filtered) {
      const c = centuryOf(d.startYear)
      if (c == null) continue
      counts.set(c, (counts.get(c) ?? 0) + 1)
    }
    return counts
  }, [filtered, sort])

  // sort 키가 바뀌면 그 키의 자연 방향으로 sortDir 도 재설정 (사용자가 따로 토글하지 않은 경우)
  const handleSortChange = (next: SortKey) => {
    setSort(next)
    setSortDir(defaultDirFor(next))
  }

  // 스크롤 다운 시 헤더 compact 토글 (60px 이상 스크롤 시)
  useEffect(() => {
    const root = scrollRootRef.current
    if (!root) return
    const onScroll = () => {
      setHeaderCompact(root.scrollTop > 60)
    }
    onScroll()
    root.addEventListener('scroll', onScroll, { passive: true })
    return () => root.removeEventListener('scroll', onScroll)
  }, [])

  // 데이터/필터 변경 시 더 이상 보이지 않는 expand 항목은 정리
  useLayoutEffect(() => {
    setExpandedIds((prev) => {
      if (prev.size === 0) return prev
      const visible = new Set(filtered.map((d) => d.dynasty.id))
      let changed = false
      const next = new Set<string>()
      for (const id of prev) {
        if (visible.has(id)) next.add(id)
        else changed = true
      }
      return changed ? next : prev
    })
  }, [filtered])

  const closeForm = () => {
    setFormOpen(false)
    // 닫기 애니메이션 동안 editing 유지 → AnimatePresence 종료 후 리셋
    setTimeout(() => setEditing(null), 250)
  }
  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (d: Dynasty) => {
    setEditing(d)
    setFormOpen(true)
  }
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSubmit = async (data: DynastyFormPayload) => {
    const isEditing = Boolean(editing)
    const empty = (v: string) => emptyToNullOrUndefined(v, isEditing)
    const payload: Partial<DynastyMutationBody> = {
      name: data.name.trim(),
      description: empty(data.description),
      // 구조화 날짜 채널 — 폼이 DateInfo|null로 빌드(null=축 클리어). 신규·편집 모두 그대로 전달.
      startDateInfo: data.startDateInfo,
      endDateInfo: data.endDateInfo,
      startReason: empty(data.startReason),
      endReason: empty(data.endReason),
      originPlace: empty(data.originPlace),
      founderText: empty(data.founderText),
      motto: empty(data.motto),
    }
    if (data.thumbnailUrl !== undefined) payload.thumbnailUrl = data.thumbnailUrl
    if (data.crestImageUrl !== undefined) payload.crestImageUrl = data.crestImageUrl

    if (editing) {
      await updateDynasty.mutateAsync({ id: editing.id, data: payload })
    } else {
      await createDynasty.mutateAsync(payload as DynastyMutationBody)
    }
    closeForm()
  }

  const handleDelete = async (id: string) => {
    if (
      !(await confirm({
        title: '삭제 확인',
        message: '이 가문을 삭제하시겠습니까?',
        danger: true,
      }))
    )
      return
    await deleteDynasty.mutateAsync(id)
    if (editing?.id === id) closeForm()
    setExpandedIds((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const isFiltering = query.trim().length > 0 || status !== 'all'

  return (
    <SectionRoot ref={scrollRootRef}>
      <StickyHeader $compact={headerCompact}>
        <StickyHeaderInner $compact={headerCompact}>
          <HeaderTopRow>
            <TitleCluster>
              <PageTitle>가문</PageTitle>
              {totalCount > 0 && !headerCompact && (
                <KpiInlineGroup>
                  <KpiInlineItem>
                    <KpiInlineLabel>등록</KpiInlineLabel>
                    <KpiInlineValue>{totalCount.toLocaleString()}</KpiInlineValue>
                  </KpiInlineItem>
                  {(globalStats.ongoingCount > 0 || globalStats.endedCount > 0) && (
                    <KpiInlineItem>
                      <KpiInlineLabel>상태</KpiInlineLabel>
                      <KpiInlineValue>
                        진행 {globalStats.ongoingCount.toLocaleString()} · 종료{' '}
                        {globalStats.endedCount.toLocaleString()}
                      </KpiInlineValue>
                    </KpiInlineItem>
                  )}
                  {globalStats.avgDuration != null && (
                    <KpiInlineItem>
                      <KpiInlineLabel>평균 존속</KpiInlineLabel>
                      <KpiInlineValue>
                        {globalStats.avgDuration.toLocaleString()}년
                      </KpiInlineValue>
                    </KpiInlineItem>
                  )}
                  {globalStats.eraSpan && (
                    <KpiInlineItem>
                      <KpiInlineLabel>시대</KpiInlineLabel>
                      <KpiInlineValue>
                        {formatCountryYearShort(globalStats.eraSpan.min)} –{' '}
                        {globalStats.eraSpan.max != null
                          ? formatCountryYearShort(globalStats.eraSpan.max)
                          : '현재'}
                      </KpiInlineValue>
                    </KpiInlineItem>
                  )}
                </KpiInlineGroup>
              )}
            </TitleCluster>
            <SecondaryButton type="button" onClick={openCreate} aria-label="새 가문 추가">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              새 가문 추가
            </SecondaryButton>
          </HeaderTopRow>

          {totalCount > 0 && (
            <DynastyControls
              query={query}
              onQueryChange={setQuery}
              sort={sort}
              onSortChange={handleSortChange}
              sortDir={sortDir}
              onSortDirChange={setSortDir}
              status={status}
              onStatusChange={setStatus}
              totalCount={totalCount}
              filteredCount={filtered.length}
            />
          )}
        </StickyHeaderInner>
      </StickyHeader>

      <ScrollBody>
        {isLoading ? (
          <DynastySkeleton />
        ) : isError ? (
          <StatusPanel>
            가문 목록을 불러오지 못했습니다.{' '}
            <InlineLinkBtn type="button" onClick={() => refetch()}>
              다시 시도
            </InlineLinkBtn>
          </StatusPanel>
        ) : totalCount === 0 ? (
          <DynastyEmptyState onCreate={openCreate} />
        ) : filtered.length === 0 ? (
          <StatusPanel>
            {query.trim() ? `"${query}" 검색과 일치하는 가문이 없습니다.` : '조건에 맞는 가문이 없습니다.'}
            {isFiltering && (
              <>
                {' '}
                <InlineLinkBtn
                  type="button"
                  onClick={() => {
                    setQuery('')
                    setStatus('all')
                  }}
                >
                  필터 초기화
                </InlineLinkBtn>
              </>
            )}
          </StatusPanel>
        ) : (
          <RowList>
            {filtered.map((derived, idx) => {
              // sort='era' 일 때 행 사이에 century 마커 — 같은 century 가 묶일 때만 의미
              const showGroupMarker =
                sort === 'era' &&
                derived.startYear != null &&
                (() => {
                  const cur = centuryOf(derived.startYear)
                  if (cur == null) return false
                  if (idx === 0) return true
                  const prev = filtered[idx - 1]
                  const prevCent = centuryOf(prev.startYear)
                  return prevCent !== cur
                })()
              const groupCent = showGroupMarker ? centuryOf(derived.startYear) : null
              const groupCount =
                groupCent != null && centuryCounts ? centuryCounts.get(groupCent) ?? 0 : 0
              return (
                <Fragment key={derived.dynasty.id}>
                  {showGroupMarker && groupCent != null && (
                    <EraGroupMarker>
                      {centuryLabel(groupCent)}
                      <EraGroupCount>· {groupCount.toLocaleString()}</EraGroupCount>
                    </EraGroupMarker>
                  )}
                  <DynastyRow
                    derived={derived}
                    axisMin={axis.axisMin}
                    axisMax={axis.axisMax}
                    showTimeline={showTimeline}
                    query={query.trim()}
                    isExpanded={expandedIds.has(derived.dynasty.id)}
                    isDeleting={deleteDynasty.isPending}
                    onToggleExpand={() => toggleExpand(derived.dynasty.id)}
                    onEdit={() => openEdit(derived.dynasty)}
                    onDelete={() => handleDelete(derived.dynasty.id)}
                    onShowMembers={() =>
                      setMembersModal({
                        id: derived.dynasty.id,
                        name: derived.dynasty.name,
                      })
                    }
                    onShowRules={() =>
                      setRulesModal({
                        id: derived.dynasty.id,
                        name: derived.dynasty.name,
                      })
                    }
                  />
                </Fragment>
              )
            })}
          </RowList>
        )}
      </ScrollBody>

      <DynastyFormModal
        isOpen={formOpen}
        editing={editing}
        isSaving={isSaving}
        onClose={closeForm}
        onSubmit={handleSubmit}
      />

      {membersModal && (
        <DynastyMembersInfographicModal
          dynastyId={membersModal.id}
          dynastyName={membersModal.name}
          isOpen
          onClose={() => setMembersModal(null)}
        />
      )}

      {rulesModal && (
        <DynastyRulesModal
          dynastyId={rulesModal.id}
          dynastyName={rulesModal.name}
          isOpen
          onClose={() => setRulesModal(null)}
        />
      )}
    </SectionRoot>
  )
}

/* ── 작은 인라인 버튼 (StatusPanel 안의 "다시 시도", "필터 초기화") ─────── */
const InlineLinkBtn = styled.button`
  background: none;
  border: none;
  color: inherit;
  text-decoration: underline;
  cursor: pointer;
  font: inherit;
  padding: 0;
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`
