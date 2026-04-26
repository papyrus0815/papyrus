/**
 * 가문 섹션 — 풀 페이지 진입점이 사용.
 * 스티키 헤더 + 검색·정렬 + 와이드 행 리스트 + 인라인 확장.
 */
import { useMemo, useState } from 'react'

import {
  useCreateDynasty,
  useDeleteDynasty,
  useDynasties,
  useUpdateDynasty,
} from '@/features/dynasty/use-dynasties.hook'
import type { Dynasty } from '@/shared/api/dynasty'

import { DynastyMembersInfographicModal } from './dynasty-members-infographic-modal'
import { DynastyControls, type SortKey } from './ui/dynasty-controls'
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

type DynastyExtra = Dynasty & {
  originPlace?: string | null
  founderText?: string | null
  motto?: string | null
}

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
  const ext = d as DynastyExtra
  const haystack = [
    d.name,
    d.description,
    ext.originPlace,
    ext.founderText,
    ext.motto,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
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
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const list = Array.isArray(dynasties) ? dynasties : []
  const isSaving = createDynasty.isPending || updateDynasty.isPending

  // 파생 데이터 + 필터 + 정렬
  const allDerived = useMemo(() => list.map(deriveOne), [list])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allDerived
      .filter(({ dynasty }) => matchesQuery(dynasty, q))
      .sort(compareBy(sort))
  }, [allDerived, query, sort])

  // 시대축 — 모든 가문 통합 범위
  const { axisMin, axisMax } = useMemo(() => {
    const starts = allDerived
      .map((d) => d.startYear)
      .filter((v): v is number => v != null)
    const ends = allDerived
      .map((d) => d.endYear ?? new Date().getFullYear())
      .filter((v): v is number => v != null)
    if (starts.length === 0) {
      return { axisMin: 0, axisMax: new Date().getFullYear() }
    }
    const min = Math.min(...starts)
    const max = Math.max(...ends, new Date().getFullYear())
    // 약간의 좌우 패딩
    const pad = Math.max(20, Math.round((max - min) * 0.04))
    return { axisMin: min - pad, axisMax: max + pad }
  }, [allDerived])

  // KPI
  const totalCount = allDerived.length
  const eraSpan = useMemo(() => {
    const starts = allDerived
      .map((d) => d.startYear)
      .filter((v): v is number => v != null)
    const ends = allDerived
      .map((d) => d.endYear)
      .filter((v): v is number => v != null)
    if (starts.length === 0) return null
    const min = Math.min(...starts)
    const max = ends.length ? Math.max(...ends) : null
    return { min, max }
  }, [allDerived])
  const avgDuration = useMemo(() => {
    const ds = allDerived
      .map((d) => d.duration)
      .filter((v): v is number => v != null && v > 0)
    if (ds.length === 0) return null
    return Math.round(ds.reduce((s, v) => s + v, 0) / ds.length)
  }, [allDerived])

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
    const payload: Record<string, unknown> = {
      name: data.name.trim(),
      description: data.description.trim() || undefined,
      startDate: data.startDate.trim() || undefined,
      endDate: data.endDate.trim() || undefined,
      originPlace: data.originPlace.trim() || (editing ? null : undefined),
      founderText: data.founderText.trim() || (editing ? null : undefined),
      motto: data.motto.trim() || (editing ? null : undefined),
    }
    if (data.thumbnailUrl !== undefined) payload.thumbnailUrl = data.thumbnailUrl
    if (data.crestImageUrl !== undefined) payload.crestImageUrl = data.crestImageUrl

    if (editing) {
      await updateDynasty.mutateAsync({ id: editing.id, data: payload })
    } else {
      await createDynasty.mutateAsync(payload as never)
    }
    goToList()
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 가문을 삭제하시겠습니까?')) return
    await deleteDynasty.mutateAsync(id)
    if (editing?.id === id) goToList()
    if (expandedId === id) setExpandedId(null)
  }

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
                  {avgDuration != null && (
                    <KpiInlineItem>
                      <KpiInlineLabel>평균 존속</KpiInlineLabel>
                      <KpiInlineValue>{avgDuration.toLocaleString()}년</KpiInlineValue>
                    </KpiInlineItem>
                  )}
                  {eraSpan && (
                    <KpiInlineItem>
                      <KpiInlineLabel>시대</KpiInlineLabel>
                      <KpiInlineValue>
                        {eraSpan.min} – {eraSpan.max ?? '현재'}
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
            <button
              type="button"
              onClick={() => refetch()}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                textDecoration: 'underline',
                cursor: 'pointer',
                font: 'inherit',
              }}
            >
              다시 시도
            </button>
          </StatusPanel>
        ) : totalCount === 0 ? (
          <DynastyEmptyState onCreate={openCreate} />
        ) : filtered.length === 0 ? (
          <StatusPanel>
            "{query}" 검색과 일치하는 가문이 없습니다.
          </StatusPanel>
        ) : (
          <RowList>
            {filtered.map((derived) => (
              <DynastyRow
                key={derived.dynasty.id}
                derived={derived}
                axisMin={axisMin}
                axisMax={axisMax}
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
