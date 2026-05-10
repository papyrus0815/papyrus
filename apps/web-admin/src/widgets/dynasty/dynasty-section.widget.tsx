/**
 * 가문 섹션 — 풀 페이지 진입점이 사용.
 * 스티키 헤더 + 검색·필터·정렬 + 와이드 행 리스트 + 인라인 확장.
 */
import { useMemo, useState } from 'react'

import styled from 'styled-components'

import {
  useCreateDynasty,
  useDeleteDynasty,
  useDynasties,
  useUpdateDynasty,
} from '@/features/dynasty/use-dynasties.hook'
import type { Dynasty, DynastyMutationBody } from '@/shared/api/dynasty'

import { DynastyMembersInfographicModal } from './dynasty-members-infographic-modal'
import {
  DynastyControls,
  type SortKey,
  type StatusFilter,
} from './ui/dynasty-controls'
import { DynastyEmptyState } from './ui/dynasty-empty-state'
import { DynastyForm, type DynastyFormPayload } from './ui/dynasty-form'
import { DynastyRow, type DynastyDerived } from './ui/dynasty-row'
import { DynastySkeleton } from './ui/dynasty-skeleton'
import {
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

type View = 'list' | 'form'

function getYear(date: string | null | undefined): number | null {
  if (!date) return null
  const y = new Date(date).getFullYear()
  return Number.isFinite(y) ? y : null
}

function deriveOne(d: Dynasty): DynastyDerived {
  const startYear = getYear(d.startDate)
  const endYear = getYear(d.endDate)
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

function compareBy(sort: SortKey) {
  return (a: DynastyDerived, b: DynastyDerived) => {
    if (sort === 'name') {
      return (a.dynasty.name ?? '').localeCompare(b.dynasty.name ?? '', 'ko')
    }
    if (sort === 'duration') {
      const da = a.duration ?? -1
      const db = b.duration ?? -1
      return db - da
    }
    // era: oldest first; missing start goes last
    const sa = a.startYear ?? Number.POSITIVE_INFINITY
    const sb = b.startYear ?? Number.POSITIVE_INFINITY
    return sa - sb
  }
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

  const [view, setView] = useState<View>('list')
  const [editing, setEditing] = useState<Dynasty | null>(null)
  const [membersModal, setMembersModal] = useState<{
    id: string
    name: string
  } | null>(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('era')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const list = Array.isArray(dynasties) ? dynasties : []
  const isSaving = createDynasty.isPending || updateDynasty.isPending

  // 파생 데이터
  const allDerived = useMemo(() => list.map(deriveOne), [list])

  // 통계 — starts/ends 한 번만 모아서 axisMin/eraSpan/avgDuration 동시 계산
  const stats = useMemo(() => {
    const nowYear = new Date().getFullYear()
    let minStart: number | null = null
    let maxKnownEnd: number | null = null
    let maxAxisEnd = nowYear
    let durSum = 0
    let durCount = 0
    for (const d of allDerived) {
      if (d.startYear != null) {
        minStart = minStart == null ? d.startYear : Math.min(minStart, d.startYear)
      }
      if (d.endYear != null) {
        maxKnownEnd = maxKnownEnd == null ? d.endYear : Math.max(maxKnownEnd, d.endYear)
        maxAxisEnd = Math.max(maxAxisEnd, d.endYear)
      }
      if (d.duration != null) {
        durSum += d.duration
        durCount += 1
      }
    }
    const axisHasData = minStart != null
    const range = axisHasData ? maxAxisEnd - minStart! : 0
    const pad = Math.max(20, Math.round(range * 0.04))
    const axisMin = axisHasData ? minStart! - pad : 0
    const axisMax = axisHasData ? maxAxisEnd + pad : nowYear
    const avgDuration = durCount > 0 ? Math.round(durSum / durCount) : null
    const eraSpan = minStart != null ? { min: minStart, max: maxKnownEnd } : null
    return { axisMin, axisMax, avgDuration, eraSpan }
  }, [allDerived])

  // 필터 + 정렬
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allDerived
      .filter((d) => matchesQuery(d.dynasty, q) && matchesStatus(d, status))
      .sort(compareBy(sort))
  }, [allDerived, query, status, sort])

  const totalCount = allDerived.length

  const goToList = () => {
    setView('list')
    setEditing(null)
  }
  const openCreate = () => {
    setEditing(null)
    setView('form')
  }
  const openEdit = (d: Dynasty) => {
    setEditing(d)
    setView('form')
  }
  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const handleSubmit = async (data: DynastyFormPayload) => {
    const isEditing = Boolean(editing)
    const empty = (v: string) => emptyToNullOrUndefined(v, isEditing)
    const payload: Partial<DynastyMutationBody> = {
      name: data.name.trim(),
      description: empty(data.description),
      startDate: empty(data.startDate),
      endDate: empty(data.endDate),
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
    goToList()
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 가문을 삭제하시겠습니까?')) return
    await deleteDynasty.mutateAsync(id)
    if (editing?.id === id) goToList()
    if (expandedId === id) setExpandedId(null)
  }

  const isFiltering = query.trim().length > 0 || status !== 'all'

  return (
    <SectionRoot>
      <StickyHeader>
        <StickyHeaderInner>
          <HeaderTopRow>
            <TitleCluster>
              <PageTitle>가문</PageTitle>
              {view === 'list' && totalCount > 0 && (
                <KpiInlineGroup>
                  <KpiInlineItem>
                    <KpiInlineLabel>등록</KpiInlineLabel>
                    <KpiInlineValue>{totalCount.toLocaleString()}</KpiInlineValue>
                  </KpiInlineItem>
                  {stats.avgDuration != null && (
                    <KpiInlineItem>
                      <KpiInlineLabel>평균 존속</KpiInlineLabel>
                      <KpiInlineValue>{stats.avgDuration.toLocaleString()}년</KpiInlineValue>
                    </KpiInlineItem>
                  )}
                  {stats.eraSpan && (
                    <KpiInlineItem>
                      <KpiInlineLabel>시대</KpiInlineLabel>
                      <KpiInlineValue>
                        {stats.eraSpan.min} – {stats.eraSpan.max ?? '현재'}
                      </KpiInlineValue>
                    </KpiInlineItem>
                  )}
                </KpiInlineGroup>
              )}
            </TitleCluster>
            {view === 'list' && (
              <SecondaryButton type="button" onClick={openCreate} aria-label="새 가문 추가">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                새 가문 추가
              </SecondaryButton>
            )}
          </HeaderTopRow>

          {view === 'list' && totalCount > 0 && (
            <DynastyControls
              query={query}
              onQueryChange={setQuery}
              sort={sort}
              onSortChange={setSort}
              status={status}
              onStatusChange={setStatus}
              totalCount={totalCount}
              filteredCount={filtered.length}
            />
          )}
        </StickyHeaderInner>
      </StickyHeader>

      <ScrollBody>
        {view === 'form' ? (
          <DynastyForm
            editing={editing}
            isSaving={isSaving}
            onCancel={goToList}
            onSubmit={handleSubmit}
          />
        ) : isLoading ? (
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
            {filtered.map((derived) => (
              <DynastyRow
                key={derived.dynasty.id}
                derived={derived}
                axisMin={stats.axisMin}
                axisMax={stats.axisMax}
                isExpanded={expandedId === derived.dynasty.id}
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
              />
            ))}
          </RowList>
        )}
      </ScrollBody>

      {membersModal && (
        <DynastyMembersInfographicModal
          dynastyId={membersModal.id}
          dynastyName={membersModal.name}
          isOpen
          onClose={() => setMembersModal(null)}
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
