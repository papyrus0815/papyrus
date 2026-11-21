import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiArrowRight,
  FiArrowUpRight,
  FiCalendar,
  FiEdit2,
  FiFlag,
  FiGitBranch,
  FiLayers,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { Link, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentHover,
  ledgerAccentSubtle,
  ledgerExpandedFill,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerRowWash,
  ledgerSubtleFill,
  ledgerSurface,
  MOTION,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { ORGANIZATION_ROLE_OPTIONS } from '@/features/event-facets/model/organization-roles'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import {
  isLikelyRichTextHtml,
  isVisuallyEmptyRichText,
} from '@/shared/lib/rich-text-read-view'
import {
  type PartyTransitionEndpoint,
  POLITICAL_POSITION_COLOR,
  POLITICAL_POSITION_LABEL,
  type PoliticalParty,
  politicalPartyApi,
  type PoliticalPartyTransitionKind,
  type PoliticalPosition,
} from '@/shared/api/political-party'
import { getUploadImageUrl } from '@/shared/api/upload'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog/confirm'
import { RichTextReadView } from '@/shared/ui/rich-text-read-view'
import { notify } from '@/shared/ui/toast'
import { PoliticalPartyQuickCreateModal } from '@/widgets/political-party/political-party-quick-create-modal'

type StatusFilter = 'all' | 'active' | 'dissolved'
type SortOption = 'founded_asc' | 'founded_desc' | 'name' | 'records'
type InspectorTab = 'overview' | 'events' | 'records'

const SPECTRUM_ORDER: PoliticalPosition[] = [
  'FAR_LEFT',
  'LEFT',
  'CENTER_LEFT',
  'CENTER',
  'CENTER_RIGHT',
  'RIGHT',
  'FAR_RIGHT',
  'BIG_TENT',
]

const TRANSITION_KIND_LABEL: Record<PoliticalPartyTransitionKind, string> = {
  SUCCESSION: '계승·재창당',
  MERGER_INTO: '합당·통합',
  SPLIT_FROM: '분당·독립',
  CONTINUITY: '당명 변경·연속',
}

const ROLE_LABEL_MAP: Record<string, string> = Object.fromEntries(
  ORGANIZATION_ROLE_OPTIONS.map((opt) => [opt.value, opt.label]),
)

const CABINET_PARTY_ROLE_LABEL: Record<string, string> = {
  RULING: '단독 여당',
  SENIOR_COALITION: '연정 주축당',
  JUNIOR_COALITION: '연정 파트너',
  CONFIDENCE_AND_SUPPLY: '각외 협력',
  OPPOSITION: '야당',
}

function parseYear(iso?: string | null): number | null {
  if (!iso) return null
  const m = /^(-?\d{4})/.exec(iso)
  if (!m) return null
  const yr = Number(m[1])
  return Number.isFinite(yr) ? yr : null
}

function formatIsoDateShort(iso?: string | null): string | null {
  if (!iso) return null
  return iso.slice(0, 10).replace(/-/g, '.')
}

function formatStructuredEventDate(ev: {
  startEra?: string | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  startDate?: string | null
}): string {
  if (ev.startYear != null) {
    const prefix = ev.startEra === 'BC' ? 'BC ' : ''
    const parts = [
      String(ev.startYear),
      ev.startMonth != null ? String(ev.startMonth).padStart(2, '0') : null,
      ev.startDay != null ? String(ev.startDay).padStart(2, '0') : null,
    ].filter(Boolean)
    return `${prefix}${parts.join('.')}`
  }
  if (ev.startDate) {
    return ev.startDate.slice(0, 10).replace(/-/g, '.')
  }
  return '연도 미상'
}

function partyAccentColor(party: {
  brandColor?: string | null
  position?: PoliticalPosition | null
}): string {
  if (party.brandColor && /^#[0-9A-Fa-f]{6}$/.test(party.brandColor)) {
    return party.brandColor
  }
  if (party.position && POLITICAL_POSITION_COLOR[party.position]) {
    return POLITICAL_POSITION_COLOR[party.position]
  }
  return '#64748b'
}

function partyPolityLabel(party: PoliticalParty): string | null {
  if (party.historicalCountry?.name && party.country?.name) {
    return `${party.historicalCountry.name} (${party.country.name})`
  }
  return party.historicalCountry?.name ?? party.country?.name ?? null
}

function partyPolityKey(party: PoliticalParty): string {
  if (party.historicalCountryId) return `hc:${party.historicalCountryId}`
  if (party.countryId) return `c:${party.countryId}`
  return 'none'
}

/**
 * 로고 없는 정당의 배지 글자 — 약칭이 짧으면(≤5자) 약칭 그대로, 아니면 당명 앞 두 글자.
 * 예전엔 약칭을 4자에서 잘라 'Libe'(Liberal)·'Zent'(Zentrum)처럼 낱말이 끊겼다.
 */
function badgeTextOf(party: PoliticalParty): string {
  const shortName = party.shortName?.trim()
  if (shortName && [...shortName].length <= 5) return shortName
  return [...party.name.replace(/\s+/g, '')].slice(0, 2).join('')
}

function totalRecordsOf(party: PoliticalParty): number {
  const c = party._count
  if (!c) return 0
  return (
    (c.eventRelations ?? 0) +
    (c.electionPartyResults ?? 0) +
    (c.cabinetAffiliations ?? 0) +
    (c.memberships ?? 0) +
    (c.transitionsFrom ?? 0) +
    (c.transitionsTo ?? 0)
  )
}

export function PoliticalPartiesCatalogPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const selectedId = searchParams.get('id')
  const initialPolityFromUrl = searchParams.get('historicalCountryId')
    ? `hc:${searchParams.get('historicalCountryId')}`
    : searchParams.get('countryId')
      ? `c:${searchParams.get('countryId')}`
      : 'all'

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '')
  const [positionFilter, setPositionFilter] = useState<
    PoliticalPosition | 'UNSPECIFIED' | 'ALL'
  >((searchParams.get('position') as PoliticalPosition) || 'ALL')
  const [polityFilter, setPolityFilter] = useState<string>(initialPolityFromUrl)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('founded_asc')
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('overview')

  const [modalState, setModalState] = useState<{
    open: boolean
    editingParty: PoliticalParty | null
  }>({ open: false, editingParty: null })

  // 계보 추가 인라인 폼 상태
  const [addingTransition, setAddingTransition] = useState(false)
  const [transDirection, setTransDirection] = useState<'predecessor' | 'successor'>('predecessor')
  const [transKind, setTransKind] = useState<PoliticalPartyTransitionKind>('SUCCESSION')
  const [transTargetPartyId, setTransTargetPartyId] = useState('')
  const [transEffectiveDate, setTransEffectiveDate] = useState('')
  const [transNotes, setTransNotes] = useState('')

  const partiesQuery = useQuery({
    queryKey: ['political-parties', 'global-catalog'],
    queryFn: () => politicalPartyApi.getAll(),
    staleTime: 30_000,
  })

  const allParties = useMemo(() => partiesQuery.data ?? [], [partiesQuery.data])

  const selectedParty = useMemo(
    () => allParties.find((p) => p.id === selectedId) ?? null,
    [allParties, selectedId],
  )

  const selectParty = useCallback(
    (partyId: string | null, nextTab?: InspectorTab) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (partyId) next.set('id', partyId)
          else next.delete('id')
          return next
        },
        { replace: true },
      )
      if (nextTab) setInspectorTab(nextTab)
      setAddingTransition(false)
    },
    [setSearchParams],
  )

  useEffect(() => {
    if (!selectedId) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !modalState.open) {
        selectParty(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId, modalState.open, selectParty])


  // 요약 KPI 및 스펙트럼 집계
  const summaryStats = useMemo(() => {
    let active = 0
    let dissolved = 0
    let eventLinked = 0
    let electionLinked = 0
    let cabinetLinked = 0
    const spectrumCounts: Record<string, number> = { UNSPECIFIED: 0 }
    for (const pos of SPECTRUM_ORDER) spectrumCounts[pos] = 0

    for (const p of allParties) {
      if (p.dissolvedDate) dissolved += 1
      else active += 1
      if ((p._count?.eventRelations ?? 0) > 0) eventLinked += 1
      if ((p._count?.electionPartyResults ?? 0) > 0) electionLinked += 1
      if ((p._count?.cabinetAffiliations ?? 0) > 0) cabinetLinked += 1
      if (p.position && spectrumCounts[p.position] !== undefined) {
        spectrumCounts[p.position] += 1
      } else {
        spectrumCounts.UNSPECIFIED += 1
      }
    }
    return {
      total: allParties.length,
      active,
      dissolved,
      eventLinked,
      electionLinked,
      cabinetLinked,
      spectrumCounts,
    }
  }, [allParties])

  // 국가·역사체제 옵션 목록
  const polityOptions = useMemo(() => {
    const map = new Map<string, { key: string; label: string; count: number }>()
    for (const p of allParties) {
      const key = partyPolityKey(p)
      if (key === 'none') continue
      const label =
        p.historicalCountry?.name ?? p.country?.name ?? '소속 미상'
      const prev = map.get(key)
      if (prev) prev.count += 1
      else map.set(key, { key, label, count: 1 })
    }
    return Array.from(map.values()).sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ko'),
    )
  }, [allParties])

  // 필터링 및 정렬
  const filteredParties = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const list = allParties.filter((p) => {
      if (positionFilter !== 'ALL') {
        if (positionFilter === 'UNSPECIFIED') {
          if (p.position) return false
        } else if (p.position !== positionFilter) {
          return false
        }
      }
      if (polityFilter !== 'all' && partyPolityKey(p) !== polityFilter) {
        return false
      }
      if (statusFilter === 'active' && p.dissolvedDate) return false
      if (statusFilter === 'dissolved' && !p.dissolvedDate) return false
      if (q) {
        const hay = [
          p.name,
          p.shortName,
          p.localName,
          p.ideology,
          p.country?.name,
          p.historicalCountry?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

    return list.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'ko')
      }
      if (sortBy === 'records') {
        const diff = totalRecordsOf(b) - totalRecordsOf(a)
        if (diff !== 0) return diff
        return a.name.localeCompare(b.name, 'ko')
      }
      const ya = parseYear(a.foundedDate)
      const yb = parseYear(b.foundedDate)
      if (ya == null && yb == null) return a.name.localeCompare(b.name, 'ko')
      if (ya == null) return 1
      if (yb == null) return -1
      return sortBy === 'founded_asc' ? ya - yb : yb - ya
    })
  }, [allParties, searchQuery, positionFilter, polityFilter, statusFilter, sortBy])

  // 존속기간 공유 시간축 범위 계산
  const yearBounds = useMemo(() => {
    const currentYear = new Date().getFullYear()
    let minYear = 1850
    for (const p of filteredParties) {
      const fy = parseYear(p.foundedDate)
      if (fy != null && fy < minYear) minYear = fy
    }
    return { minYear: Math.min(minYear, currentYear - 20), maxYear: currentYear }
  }, [filteredParties])

  /** 존속 열 머리 눈금 — 50년(범위가 짧으면 25년) 간격 */
  const axisTicks = useMemo(() => {
    const span = Math.max(1, yearBounds.maxYear - yearBounds.minYear)
    const step = span > 150 ? 50 : 25
    const ticks: Array<{ year: number; pct: number }> = []
    for (
      let year = Math.ceil(yearBounds.minYear / step) * step;
      year <= yearBounds.maxYear;
      year += step
    ) {
      const pct = ((year - yearBounds.minYear) / span) * 100
      if (pct >= 4 && pct <= 96) ticks.push({ year, pct })
    }
    return ticks
  }, [yearBounds])

  /**
   * 국가·체제 묶음 — 정당은 한 나라 안의 일이라 나라로 묶는다(행마다 '독일 제국' 알약을 10번 되풀이하던 것).
   * 묶음 순서는 정당 수 많은 순, 소속 미상은 맨 뒤. 묶음 안 순서는 고른 정렬 그대로.
   */
  const partyGroups = useMemo(() => {
    const groups = new Map<string, { key: string; label: string; parties: PoliticalParty[] }>()
    for (const party of filteredParties) {
      const key = partyPolityKey(party)
      const existing = groups.get(key)
      if (existing) existing.parties.push(party)
      else groups.set(key, { key, label: partyPolityLabel(party) ?? '소속 미상', parties: [party] })
    }
    return Array.from(groups.values()).sort((left, right) => {
      if (left.key === 'none') return 1
      if (right.key === 'none') return -1
      return right.parties.length - left.parties.length || left.label.localeCompare(right.label, 'ko')
    })
  }, [filteredParties])

  // 선택된 정당 상세 하위 쿼리
  const partyDetailQuery = useQuery({
    queryKey: ['political-parties', 'detail', selectedParty?.id],
    queryFn: () => politicalPartyApi.getById(selectedParty!.id),
    enabled: Boolean(selectedParty?.id),
  })

  const lineageQuery = useQuery({
    queryKey: ['political-parties', 'lineage', selectedParty?.id],
    queryFn: () => politicalPartyApi.getLineage(selectedParty!.id),
    enabled: Boolean(selectedParty?.id),
  })

  const partyEventsQuery = useQuery({
    queryKey: ['political-parties', 'events', selectedParty?.id],
    queryFn: () => politicalPartyApi.getEvents(selectedParty!.id),
    enabled: Boolean(selectedParty?.id),
  })

  const cabinetAffiliationsQuery = useQuery({
    queryKey: ['political-parties', 'cabinets', selectedParty?.id],
    queryFn: () => politicalPartyApi.getCabinetAffiliations(selectedParty!.id),
    enabled: Boolean(selectedParty?.id) && inspectorTab === 'records',
  })

  const topLeadersQuery = useQuery({
    queryKey: ['political-parties', 'top-leaders', selectedParty?.id],
    queryFn: () => politicalPartyApi.getTopLeaders(selectedParty!.id),
    enabled: Boolean(selectedParty?.id) && inspectorTab === 'records',
  })

  const electionResultsQuery = useQuery({
    queryKey: ['political-parties', 'elections', selectedParty?.id],
    queryFn: () => politicalPartyApi.getElectionResults(selectedParty!.id),
    enabled: Boolean(selectedParty?.id) && inspectorTab === 'records',
  })

  const createTransitionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedParty) throw new Error('선택된 정당이 없습니다.')
      if (!transTargetPartyId) throw new Error('연결할 상대 정당을 선택해 주세요.')
      const fromPartyId =
        transDirection === 'predecessor' ? transTargetPartyId : selectedParty.id
      const toPartyId =
        transDirection === 'predecessor' ? selectedParty.id : transTargetPartyId
      const effectiveDate = transEffectiveDate.trim()
        ? /^\d{4}$/.test(transEffectiveDate.trim())
          ? `${transEffectiveDate.trim()}-01-01`
          : transEffectiveDate.trim()
        : null
      return politicalPartyApi.createTransition({
        fromPartyId,
        toPartyId,
        kind: transKind,
        effectiveDate,
        notes: transNotes.trim() || null,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries?.({ queryKey: ['political-parties'] })
      setAddingTransition(false)
      setTransTargetPartyId('')
      setTransEffectiveDate('')
      setTransNotes('')
      notify.success('정당 계보를 연결했습니다.')
    },
    onError: (err) => {
      notify.error(
        err instanceof Error ? err.message : '계보 연결에 실패했습니다.',
      )
    },
  })

  const deleteTransitionMutation = useMutation({
    mutationFn: (transitionId: string) =>
      politicalPartyApi.deleteTransition(transitionId),
    onSuccess: () => {
      queryClient.invalidateQueries?.({ queryKey: ['political-parties'] })
      notify.success('계보 연결을 해제했습니다.')
    },
  })

  const deletePartyMutation = useMutation({
    mutationFn: (partyId: string) => politicalPartyApi.delete(partyId),
    onSuccess: () => {
      queryClient.invalidateQueries?.({ queryKey: ['political-parties'] })
      selectParty(null)
      notify.success('정당을 삭제했습니다.')
    },
    onError: (err) => {
      notify.error(
        err instanceof Error ? err.message : '정당 삭제에 실패했습니다.',
      )
    },
  })

  const handleDeleteSelected = async () => {
    if (!selectedParty) return
    const ok = await confirm({
      title: `「${selectedParty.name}」 정당을 삭제할까요?`,
      message:
        '연결된 계보·사건 참여 관계도 함께 해제됩니다. 선거 결과 기록이 연결되어 있으면 보호될 수 있습니다.',
      confirmLabel: '삭제',
      danger: true,
    })
    if (!ok) return
    deletePartyMutation.mutate(selectedParty.id)
  }

  const detailParty = partyDetailQuery.data ?? selectedParty
  const lineage = lineageQuery.data ?? { predecessors: [], successors: [] }
  const partyEvents = partyEventsQuery.data ?? []
  const countryJumpId =
    selectedParty?.countryId ?? selectedParty?.historicalCountryId ?? null

  return (
    <Workspace>
      <CatalogPane $detailOpen={Boolean(selectedParty)}>
        {/* 머리 — 제목 · 한 줄 요약 · 다른 지면 링크 · 등록 */}
        <TopChrome>
          <TopHeadlineGroup>
            <AccentBar aria-hidden />
            <div>
              <PageTitle>정당 · 정치 세력</PageTitle>
              <SummaryLine>
                <span>
                  전체 <b>{summaryStats.total}</b>
                </span>
                <span className="sep">·</span>
                <span>
                  현존 <b>{summaryStats.active}</b>
                </span>
                <span className="sep">·</span>
                <span>
                  해산·역사 <b>{summaryStats.dissolved}</b>
                </span>
                <span className="sep">·</span>
                <span>
                  국가·체제 <b>{polityOptions.length}</b>
                </span>
              </SummaryLine>
            </div>
          </TopHeadlineGroup>

          <HeaderActions>
            <CrossDomainLink to="/government">
              정부·내각 <FiArrowUpRight size={12} aria-hidden />
            </CrossDomainLink>
            <CrossDomainLink to="/organizations?view=domestic">
              비정부·민간단체 <FiArrowUpRight size={12} aria-hidden />
            </CrossDomainLink>
            <PrimaryActionBtn
              type="button"
              onClick={() => setModalState({ open: true, editingParty: null })}
            >
              <FiPlus size={14} />
              정당 등록
            </PrimaryActionBtn>
          </HeaderActions>
        </TopChrome>

        {/*
          거르기 — 검색 · 국가 · 존속 · 정렬 한 줄 + 스펙트럼 한 줄.
          예전엔 위에 그래프 카드 3장(스펙트럼·국가 Top5·존속 도넛)이 230~380px를 차지했는데,
          셋 다 이 줄의 거르기를 한 번 더 둔 것이었다. 분포 정보는 스펙트럼 막대 하나로 남긴다.
        */}
        <FilterArea>
          <FilterBar>
            <SearchBox>
              <FiSearch size={14} aria-hidden />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="정당명, 약칭(SPD·KPD·자민당·GOP), 원어명, 이념 검색…"
                aria-label="정당 검색"
              />
              {searchQuery && (
                <ClearBtn
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="검색어 지우기"
                >
                  <FiX size={13} />
                </ClearBtn>
              )}
            </SearchBox>

            <FilterSelect
              value={polityFilter}
              onChange={(event) => setPolityFilter(event.target.value)}
              aria-label="소속 국가·시대 체제 필터"
            >
              <option value="all">모든 국가·체제</option>
              {polityOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label} ({opt.count})
                </option>
              ))}
            </FilterSelect>

            <StatusSegment role="group" aria-label="존속 상태 필터">
              {(
                [
                  ['all', '전체', summaryStats.total],
                  ['active', '현존', summaryStats.active],
                  ['dissolved', '해산·역사', summaryStats.dissolved],
                ] as const
              ).map(([val, label, count]) => (
                <StatusSegBtn
                  key={val}
                  type="button"
                  aria-pressed={statusFilter === val}
                  $active={statusFilter === val}
                  onClick={() => setStatusFilter(val)}
                >
                  {label}
                  <span>{count}</span>
                </StatusSegBtn>
              ))}
            </StatusSegment>

            <FilterSelect
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
              aria-label="정렬 기준"
            >
              <option value="founded_asc">창당 오래된순</option>
              <option value="founded_desc">창당 최신순</option>
              <option value="records">사건·선거·내각 기록순</option>
              <option value="name">당명 가나다순</option>
            </FilterSelect>
          </FilterBar>

          {summaryStats.total > 0 && (
            <SpectrumRow role="group" aria-label="이념 스펙트럼 필터">
              <SpectrumRowLabel>스펙트럼</SpectrumRowLabel>
              <SpectrumTrack aria-hidden>
                {[...SPECTRUM_ORDER, 'UNSPECIFIED' as const].map((pos) => {
                  const cnt = summaryStats.spectrumCounts[pos] ?? 0
                  if (cnt === 0) return null
                  return (
                    <SpectrumSegment
                      key={pos}
                      $color={
                        pos === 'UNSPECIFIED'
                          ? '#94a3b8'
                          : POLITICAL_POSITION_COLOR[pos]
                      }
                      $ratio={(cnt / summaryStats.total) * 100}
                      $dimmed={positionFilter !== 'ALL' && positionFilter !== pos}
                    />
                  )
                })}
              </SpectrumTrack>
              <SpectrumChipRow>
                <SpectrumChip
                  type="button"
                  aria-pressed={positionFilter === 'ALL'}
                  $active={positionFilter === 'ALL'}
                  onClick={() => setPositionFilter('ALL')}
                >
                  전체 <span>{summaryStats.total}</span>
                </SpectrumChip>
                {SPECTRUM_ORDER.map((pos) => {
                  const cnt = summaryStats.spectrumCounts[pos] ?? 0
                  if (cnt === 0 && positionFilter !== pos) return null
                  return (
                    <SpectrumChip
                      key={pos}
                      type="button"
                      aria-pressed={positionFilter === pos}
                      $active={positionFilter === pos}
                      onClick={() =>
                        setPositionFilter((prev) => (prev === pos ? 'ALL' : pos))
                      }
                    >
                      <Dot $color={POLITICAL_POSITION_COLOR[pos]} />
                      {POLITICAL_POSITION_LABEL[pos]}
                      <span>{cnt}</span>
                    </SpectrumChip>
                  )
                })}
                {(summaryStats.spectrumCounts.UNSPECIFIED ?? 0) > 0 && (
                  <SpectrumChip
                    type="button"
                    aria-pressed={positionFilter === 'UNSPECIFIED'}
                    $active={positionFilter === 'UNSPECIFIED'}
                    onClick={() =>
                      setPositionFilter((prev) =>
                        prev === 'UNSPECIFIED' ? 'ALL' : 'UNSPECIFIED',
                      )
                    }
                  >
                    <Dot $color="#94a3b8" />
                    미분류
                    <span>{summaryStats.spectrumCounts.UNSPECIFIED}</span>
                  </SpectrumChip>
                )}
              </SpectrumChipRow>
            </SpectrumRow>
          )}
        </FilterArea>

        {/* 정당 원장 — 열 머리(존속 연도 눈금) + 국가·체제 묶음 */}
        <ListScroll>
          {partiesQuery.isLoading ? (
            <EmptyBox>정당 편람을 불러오는 중입니다…</EmptyBox>
          ) : filteredParties.length === 0 ? (
            <EmptyBox>
              <div>조건에 맞는 정당이 없습니다.</div>
              <EmptyHintBtn
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setPositionFilter('ALL')
                  setPolityFilter('all')
                  setStatusFilter('all')
                }}
              >
                필터 초기화
              </EmptyHintBtn>
            </EmptyBox>
          ) : (
            <LedgerTable>
              <ColumnHead aria-hidden>
                <span />
                <span>정당</span>
                <span>존속</span>
                <AxisRuler>
                  {axisTicks.map((tick) => (
                    <AxisTick key={tick.year} style={{ left: `${tick.pct}%` }}>
                      {tick.year}
                    </AxisTick>
                  ))}
                </AxisRuler>
                <span className="end">기록</span>
              </ColumnHead>
              {partyGroups.map((group) => (
                <section key={group.key} aria-label={`${group.label} 정당 ${group.parties.length}곳`}>
                  <GroupHead>
                    <span className="name">{group.label}</span>
                    <span className="count">{group.parties.length}</span>
                  </GroupHead>
                  {group.parties.map((party) => {
                    const isSelected = party.id === selectedParty?.id
                    const color = partyAccentColor(party)
                    const fYear = parseYear(party.foundedDate)
                    const dYear = parseYear(party.dissolvedDate)
                    const spanTotal = Math.max(1, yearBounds.maxYear - yearBounds.minYear)
                    const barLeft =
                      fYear != null
                        ? Math.max(0, Math.min(96, ((fYear - yearBounds.minYear) / spanTotal) * 100))
                        : 0
                    const endVal = dYear ?? yearBounds.maxYear
                    const barWidth =
                      fYear != null
                        ? Math.max(
                            1.5,
                            Math.min(100 - barLeft, ((Math.max(fYear, endVal) - fYear) / spanTotal) * 100),
                          )
                        : 0
                    const counts = party._count
                    const recordParts = [
                      ['사건', counts?.eventRelations ?? 0],
                      ['선거', counts?.electionPartyResults ?? 0],
                      ['내각', counts?.cabinetAffiliations ?? 0],
                      ['계보', (counts?.transitionsFrom ?? 0) + (counts?.transitionsTo ?? 0)],
                    ] as const
                    const shownRecords = recordParts.filter(([, value]) => value > 0)

                    return (
                      <PartyRow
                        key={party.id}
                        $selected={isSelected}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        onClick={() => selectParty(party.id)}
                        onKeyDown={(keyEvent) => {
                          if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                            keyEvent.preventDefault()
                            selectParty(party.id)
                          }
                        }}
                      >
                        <PartyBadge $color={color}>
                          {party.logoUrl ? (
                            <PartyBadgeImg src={getUploadImageUrl(party.logoUrl)} alt="" />
                          ) : (
                            <PartyBadgeText $length={badgeTextOf(party).length}>
                              {badgeTextOf(party)}
                            </PartyBadgeText>
                          )}
                        </PartyBadge>

                        <PartyMainCol>
                          <PartyTitleLine>
                            <PartyName>{party.name}</PartyName>
                            {party.shortName && <ShortName>{party.shortName}</ShortName>}
                          </PartyTitleLine>
                          <PartyMetaLine>
                            {party.position ? (
                              <PosLabel>
                                <Dot $color={POLITICAL_POSITION_COLOR[party.position]} />
                                {POLITICAL_POSITION_LABEL[party.position]}
                              </PosLabel>
                            ) : null}
                            {(party.ideology || party.localName) && (
                              <IdeologyText>{party.ideology || party.localName}</IdeologyText>
                            )}
                          </PartyMetaLine>
                        </PartyMainCol>

                        <LifespanYears $dissolved={Boolean(party.dissolvedDate)}>
                          {fYear != null ? fYear : '—'}–{dYear != null ? dYear : '현재'}
                        </LifespanYears>

                        <LifespanTrack>
                          {fYear != null && (
                            <LifespanFill
                              $left={barLeft}
                              $width={barWidth}
                              $color={color}
                              $dissolved={Boolean(party.dissolvedDate)}
                            />
                          )}
                        </LifespanTrack>

                        <RecordsCol>
                          {shownRecords.length === 0 ? (
                            <span className="none">—</span>
                          ) : (
                            shownRecords.map(([label, value]) => (
                              <span key={label}>
                                {label} <b>{value}</b>
                              </span>
                            ))
                          )}
                        </RecordsCol>
                      </PartyRow>
                    )
                  })}
                </section>
              ))}
            </LedgerTable>
          )}
        </ListScroll>
      </CatalogPane>

      {/* 우측 정당 인스펙터 패널 */}
      {selectedParty && detailParty && (
        <InspectorPane aria-label={`${detailParty.name} 상세 정보`}>
          <InspectorHeader $brandColor={partyAccentColor(detailParty)}>
            <InspectorIdentityRow>
              <InspectorEmblem $color={partyAccentColor(detailParty)}>
                {detailParty.logoUrl ? (
                  <PartyBadgeImg
                    src={getUploadImageUrl(detailParty.logoUrl)}
                    alt=""
                  />
                ) : (
                  (detailParty.shortName || detailParty.name).slice(0, 3)
                )}
              </InspectorEmblem>
              <InspectorTitleBlock>
                <InspectorEyebrow>
                  <span>
                    {partyPolityLabel(detailParty) ?? '소속 국가 미지정'}
                  </span>
                  {detailParty.position && (
                    <>
                      <span>·</span>
                      <span>
                        {POLITICAL_POSITION_LABEL[detailParty.position]}
                      </span>
                    </>
                  )}
                </InspectorEyebrow>
                <InspectorTitleRow>
                  <InspectorTitle>{detailParty.name}</InspectorTitle>
                  {detailParty.shortName && (
                    <ShortBadge>{detailParty.shortName}</ShortBadge>
                  )}
                  <CatalogStatusPill
                    $dissolved={Boolean(detailParty.dissolvedDate)}
                  >
                    {detailParty.dissolvedDate ? '해산' : '현존'}
                  </CatalogStatusPill>
                </InspectorTitleRow>
                {detailParty.localName && (
                  <InspectorLocalName>
                    {detailParty.localName}
                  </InspectorLocalName>
                )}
              </InspectorTitleBlock>
            </InspectorIdentityRow>

            <InspectorActions>
              {countryJumpId && (
                <IconLinkBtn
                  to={pathKeys.countryElectionPartyDetail(
                    countryJumpId,
                    detailParty.id,
                  )}
                  title="국가 상세 선거·정당 지면에서 보기"
                >
                  <FiArrowUpRight size={15} />
                </IconLinkBtn>
              )}
              <IconActionBtn
                type="button"
                title="정당 정보 수정"
                onClick={() =>
                  setModalState({ open: true, editingParty: detailParty })
                }
              >
                <FiEdit2 size={14} />
              </IconActionBtn>
              <IconActionBtn
                type="button"
                title="정당 삭제"
                onClick={handleDeleteSelected}
              >
                <FiTrash2 size={14} />
              </IconActionBtn>
              <IconActionBtn
                type="button"
                title="닫기 (Esc)"
                onClick={() => selectParty(null)}
              >
                <FiX size={16} />
              </IconActionBtn>
            </InspectorActions>
          </InspectorHeader>

          <InspectorTabBar role="tablist">
            <InspectorTabBtn
              type="button"
              role="tab"
              aria-selected={inspectorTab === 'overview'}
              $active={inspectorTab === 'overview'}
              onClick={() => setInspectorTab('overview')}
            >
              <FiGitBranch size={13} /> 개요 · 계보
            </InspectorTabBtn>
            <InspectorTabBtn
              type="button"
              role="tab"
              aria-selected={inspectorTab === 'events'}
              $active={inspectorTab === 'events'}
              onClick={() => setInspectorTab('events')}
            >
              <FiLayers size={13} /> 관련 사건 ({partyEvents.length})
            </InspectorTabBtn>
            <InspectorTabBtn
              type="button"
              role="tab"
              aria-selected={inspectorTab === 'records'}
              $active={inspectorTab === 'records'}
              onClick={() => setInspectorTab('records')}
            >
              <FiUsers size={13} /> 내각 · 수반 · 선거
            </InspectorTabBtn>
          </InspectorTabBar>

          <InspectorBody>
            {inspectorTab === 'overview' && (
              <SectionStack>
                <MetaGrid>
                  <MetaCell>
                    <MetaKey>창당일</MetaKey>
                    <MetaVal>
                      {formatIsoDateShort(detailParty.foundedDate) ?? '미기록'}
                    </MetaVal>
                  </MetaCell>
                  <MetaCell>
                    <MetaKey>해산·소멸일</MetaKey>
                    <MetaVal>
                      {detailParty.dissolvedDate
                        ? formatIsoDateShort(detailParty.dissolvedDate)
                        : '현존'}
                    </MetaVal>
                  </MetaCell>
                  <MetaCell>
                    <MetaKey>이념 노선</MetaKey>
                    <MetaVal>{detailParty.ideology || '미기록'}</MetaVal>
                  </MetaCell>
                  <MetaCell>
                    <MetaKey>상징 당색</MetaKey>
                    <MetaVal>
                      <InlineColorVal>
                        <Dot $color={partyAccentColor(detailParty)} />
                        <span>{detailParty.brandColor || '스펙트럼 기본색'}</span>
                      </InlineColorVal>
                    </MetaVal>
                  </MetaCell>
                </MetaGrid>

                {detailParty.aliases && detailParty.aliases.length > 0 && (
                  <SubCard>
                    <SubCardTitle>과거 명칭 · 별칭</SubCardTitle>
                    <AliasWrap>
                      {detailParty.aliases.map((al) => (
                        <ShortBadge key={al.id}>{al.name}</ShortBadge>
                      ))}
                    </AliasWrap>
                  </SubCard>
                )}

                {detailParty.description &&
                  !isVisuallyEmptyRichText(detailParty.description) && (
                    <SubCard>
                      <SubCardTitle>역사적 개요</SubCardTitle>
                      {isLikelyRichTextHtml(detailParty.description) ? (
                        <CatalogRichProse
                          html={detailParty.description}
                          aria-label="정당 역사적 개요"
                        />
                      ) : (
                        <ProseText>{detailParty.description}</ProseText>
                      )}
                    </SubCard>
                  )}

                {/* 창당·합당·분당 계보 */}
                <SubCard>
                  <SubCardHeader>
                    <SubCardTitle>창당 · 합당 · 분당 계보</SubCardTitle>
                    <SmallOutlineBtn
                      type="button"
                      onClick={() => setAddingTransition((v) => !v)}
                    >
                      <FiPlus size={12} />
                      {addingTransition ? '닫기' : '계보 추가'}
                    </SmallOutlineBtn>
                  </SubCardHeader>

                  {addingTransition && (
                    <TransitionFormBox>
                      <TransitionFormRow>
                        <SmallSelect
                          value={transDirection}
                          onChange={(e) =>
                            setTransDirection(
                              e.target.value as 'predecessor' | 'successor',
                            )
                          }
                        >
                          <option value="predecessor">← 전신·모태 정당 추가</option>
                          <option value="successor">후신·합당/분당 정당 추가 →</option>
                        </SmallSelect>
                        <SmallSelect
                          value={transKind}
                          onChange={(e) =>
                            setTransKind(
                              e.target.value as PoliticalPartyTransitionKind,
                            )
                          }
                        >
                          {(
                            Object.keys(
                              TRANSITION_KIND_LABEL,
                            ) as PoliticalPartyTransitionKind[]
                          ).map((k) => (
                            <option key={k} value={k}>
                              {TRANSITION_KIND_LABEL[k]}
                            </option>
                          ))}
                        </SmallSelect>
                      </TransitionFormRow>

                      <SmallSelect
                        value={transTargetPartyId}
                        onChange={(e) => setTransTargetPartyId(e.target.value)}
                      >
                        <option value="">상대 정당 선택…</option>
                        {allParties
                          .filter((p) => p.id !== detailParty.id)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                              {p.shortName ? ` (${p.shortName})` : ''}
                              {partyPolityLabel(p)
                                ? ` · ${partyPolityLabel(p)}`
                                : ''}
                            </option>
                          ))}
                      </SmallSelect>

                      <TransitionFormRow>
                        <SmallInput
                          placeholder="발효일 (예: 1918-12-30 또는 1955)"
                          value={transEffectiveDate}
                          onChange={(e) => setTransEffectiveDate(e.target.value)}
                        />
                        <SmallInput
                          placeholder="비고 (예: 고타 분당 대회)"
                          value={transNotes}
                          onChange={(e) => setTransNotes(e.target.value)}
                        />
                      </TransitionFormRow>

                      <TransitionFormActions>
                        <SmallPrimaryBtn
                          type="button"
                          disabled={
                            !transTargetPartyId ||
                            createTransitionMutation.isPending
                          }
                          onClick={() => createTransitionMutation.mutate()}
                        >
                          계보 저장
                        </SmallPrimaryBtn>
                      </TransitionFormActions>
                    </TransitionFormBox>
                  )}

                  {lineage.predecessors.length === 0 &&
                  lineage.successors.length === 0 ? (
                    <MutedEmpty>
                      등록된 전신·후신·합당·분당 계보가 없습니다.
                    </MutedEmpty>
                  ) : (
                    <>
                      <LineageFlowStrip aria-label="정당 계보 흐름 요약">
                        <LineageFlowStep $muted={lineage.predecessors.length === 0}>
                          <span className="k">전신</span>
                          <strong>
                            {lineage.predecessors.length > 0
                              ? `${lineage.predecessors.length}곳`
                              : '없음'}
                          </strong>
                        </LineageFlowStep>
                        <FiArrowRight size={12} aria-hidden />
                        <LineageFlowStep $current $color={partyAccentColor(detailParty)}>
                          <span className="k">현재</span>
                          <strong>
                            {detailParty.shortName || detailParty.name}
                          </strong>
                        </LineageFlowStep>
                        <FiArrowRight size={12} aria-hidden />
                        <LineageFlowStep $muted={lineage.successors.length === 0}>
                          <span className="k">후신</span>
                          <strong>
                            {lineage.successors.length > 0
                              ? `${lineage.successors.length}곳`
                              : '없음'}
                          </strong>
                        </LineageFlowStep>
                      </LineageFlowStrip>
                      <LineageColumns>
                      {lineage.predecessors.length > 0 && (
                        <LineageGroup>
                          <LineageGroupLabel>← 전신 · 모태 정당</LineageGroupLabel>
                          {lineage.predecessors.map(
                            (edge: PartyTransitionEndpoint) => (
                              <LineageCard key={edge.id}>
                                <LineageJumpBtn
                                  type="button"
                                  onClick={() =>
                                    edge.fromParty?.id &&
                                    selectParty(edge.fromParty.id)
                                  }
                                >
                                  <Dot
                                    $color={
                                      edge.fromParty?.brandColor || '#64748b'
                                    }
                                  />
                                  <strong>
                                    {edge.fromParty?.name ?? edge.fromPartyId}
                                  </strong>
                                  {edge.fromParty?.shortName && (
                                    <span>({edge.fromParty.shortName})</span>
                                  )}
                                </LineageJumpBtn>
                                <LineageMetaRow>
                                  <ShortBadge>
                                    {TRANSITION_KIND_LABEL[edge.kind] ??
                                      edge.kind}
                                  </ShortBadge>
                                  {edge.effectiveDate && (
                                    <span>
                                      {formatIsoDateShort(edge.effectiveDate)}
                                    </span>
                                  )}
                                  <MiniRemoveBtn
                                    type="button"
                                    title="계보 연결 해제"
                                    onClick={() =>
                                      deleteTransitionMutation.mutate(edge.id)
                                    }
                                  >
                                    <FiX size={12} />
                                  </MiniRemoveBtn>
                                </LineageMetaRow>
                                {edge.notes && (
                                  <LineageNote>{edge.notes}</LineageNote>
                                )}
                              </LineageCard>
                            ),
                          )}
                        </LineageGroup>
                      )}

                      {lineage.successors.length > 0 && (
                        <LineageGroup>
                          <LineageGroupLabel>후신 · 합당 · 분당 →</LineageGroupLabel>
                          {lineage.successors.map(
                            (edge: PartyTransitionEndpoint) => (
                              <LineageCard key={edge.id}>
                                <LineageJumpBtn
                                  type="button"
                                  onClick={() =>
                                    edge.toParty?.id &&
                                    selectParty(edge.toParty.id)
                                  }
                                >
                                  <Dot
                                    $color={
                                      edge.toParty?.brandColor || '#64748b'
                                    }
                                  />
                                  <strong>
                                    {edge.toParty?.name ?? edge.toPartyId}
                                  </strong>
                                  {edge.toParty?.shortName && (
                                    <span>({edge.toParty.shortName})</span>
                                  )}
                                  <FiArrowRight size={12} />
                                </LineageJumpBtn>
                                <LineageMetaRow>
                                  <ShortBadge>
                                    {TRANSITION_KIND_LABEL[edge.kind] ??
                                      edge.kind}
                                  </ShortBadge>
                                  {edge.effectiveDate && (
                                    <span>
                                      {formatIsoDateShort(edge.effectiveDate)}
                                    </span>
                                  )}
                                  <MiniRemoveBtn
                                    type="button"
                                    title="계보 연결 해제"
                                    onClick={() =>
                                      deleteTransitionMutation.mutate(edge.id)
                                    }
                                  >
                                    <FiX size={12} />
                                  </MiniRemoveBtn>
                                </LineageMetaRow>
                                {edge.notes && (
                                  <LineageNote>{edge.notes}</LineageNote>
                                )}
                              </LineageCard>
                            ),
                          )}
                        </LineageGroup>
                      )}
                    </LineageColumns>
                    </>
                  )}
                </SubCard>
              </SectionStack>
            )}

            {inspectorTab === 'events' && (
              <SectionStack>
                <SubCard>
                  <SubCardTitle>
                    관여 역사 사건 ({partyEvents.length})
                  </SubCardTitle>
                  {partyEventsQuery.isLoading ? (
                    <MutedEmpty>관련 사건을 불러오는 중입니다…</MutedEmpty>
                  ) : partyEvents.length === 0 ? (
                    <MutedEmpty>
                      아직 이 정당에 연결된 사건이 없습니다. 각 사건 상세 화면의 「관련 정당」 섹션에서 정당을 연결할 수 있습니다.
                    </MutedEmpty>
                  ) : (
                    <EventCardList>
                      {partyEvents.map((row) => (
                        <EventCardItem
                          key={row.relationId}
                          to={`/events/${encodeURIComponent(row.event.id)}`}
                        >
                          <EventCardTop>
                            <EventDateMono>
                              <FiCalendar size={11} />
                              {formatStructuredEventDate(row.event)}
                            </EventDateMono>
                            <EventBadgeGroup>
                              <ShortBadge>
                                {ROLE_LABEL_MAP[row.role] ?? row.role}
                              </ShortBadge>
                              {row.side && (
                                <SideTag $color={row.side.color || '#64748b'}>
                                  <Dot $color={row.side.color || '#64748b'} />
                                  {row.side.name}
                                </SideTag>
                              )}
                            </EventBadgeGroup>
                          </EventCardTop>
                          <EventCardTitle>{row.event.title}</EventCardTitle>
                          {row.roleDescription && (
                            <EventCardDesc>{row.roleDescription}</EventCardDesc>
                          )}
                        </EventCardItem>
                      ))}
                    </EventCardList>
                  )}
                </SubCard>
              </SectionStack>
            )}

            {inspectorTab === 'records' && (
              <SectionStack>
                <SubCard>
                  <SubCardTitle>
                    내각 참여 ({cabinetAffiliationsQuery.data?.length ?? 0})
                  </SubCardTitle>
                  {(cabinetAffiliationsQuery.data ?? []).length === 0 ? (
                    <MutedEmpty>내각 참여 기록이 없습니다.</MutedEmpty>
                  ) : (
                    <CompactRecordList>
                      {(cabinetAffiliationsQuery.data ?? []).map((cab) => (
                        <CompactRecordLink
                          key={cab.id}
                          to={pathKeys.government.cabinetDetail(cab.cabinetId)}
                        >
                          <span>{cab.cabinet?.name ?? '내각'}</span>
                          <ShortBadge>
                            {CABINET_PARTY_ROLE_LABEL[cab.role] ?? cab.role}
                          </ShortBadge>
                        </CompactRecordLink>
                      ))}
                    </CompactRecordList>
                  )}
                </SubCard>

                <SubCard>
                  <SubCardTitle>
                    배출 국가원수 · 정부수반 (
                    {topLeadersQuery.data?.length ?? 0})
                  </SubCardTitle>
                  {(topLeadersQuery.data ?? []).length === 0 ? (
                    <MutedEmpty>배출 국가수반 기록이 없습니다.</MutedEmpty>
                  ) : (
                    <CompactRecordList>
                      {(topLeadersQuery.data ?? []).map((tenure) => (
                        <CompactRecordLink
                          key={tenure.id}
                          to={`/persons-timeline/${encodeURIComponent(tenure.person.id)}`}
                        >
                          <span>{getPersonDisplayName(tenure.person)}</span>
                          <MutedMono>
                            {formatIsoDateShort(tenure.startDate)} ~{' '}
                            {formatIsoDateShort(tenure.endDate) ?? '재임'}
                          </MutedMono>
                        </CompactRecordLink>
                      ))}
                    </CompactRecordList>
                  )}
                </SubCard>

                <SubCard>
                  <SubCardTitle>
                    역대 선거 성적 ({electionResultsQuery.data?.length ?? 0})
                  </SubCardTitle>
                  {(electionResultsQuery.data ?? []).length === 0 ? (
                    <MutedEmpty>연결된 선거 성적 집계가 없습니다.</MutedEmpty>
                  ) : (
                    <CompactRecordList>
                      {(electionResultsQuery.data ?? []).map((er) => {
                        const votePctNum = er.voteSharePercent
                          ? Number(er.voteSharePercent)
                          : NaN
                        const seatPctNum =
                          er.seatsWon != null &&
                          er.election?.totalSeats &&
                          er.election.totalSeats > 0
                            ? (er.seatsWon / er.election.totalSeats) * 100
                            : NaN
                        const barPct = Number.isFinite(votePctNum)
                          ? Math.min(100, Math.max(2, votePctNum))
                          : Number.isFinite(seatPctNum)
                            ? Math.min(100, Math.max(2, seatPctNum))
                            : null
                        const elTitle = er.election
                          ? er.election.convocationOrdinal != null
                            ? `제${er.election.convocationOrdinal}대 ${er.election.shortName ?? er.election.name}`
                            : (er.election.shortName ?? er.election.name)
                          : '선거'
                        const elHref =
                          countryJumpId && er.election?.id
                            ? `${pathKeys.countryElections(countryJumpId)}?electionId=${encodeURIComponent(er.election.id)}`
                            : null
                        const inner = (
                          <>
                            <ElectionRecordRowTop>
                              <span className="title">{elTitle}</span>
                              <MutedMono>
                                {er.seatsWon != null
                                  ? `${er.seatsWon}${er.election?.totalSeats ? `/${er.election.totalSeats}` : ''}석`
                                  : ''}
                                {er.seatsWon != null && er.voteSharePercent
                                  ? ' · '
                                  : ''}
                                {er.voteSharePercent
                                  ? `${Number.isFinite(votePctNum) ? votePctNum.toFixed(1) : er.voteSharePercent}%`
                                  : ''}
                              </MutedMono>
                            </ElectionRecordRowTop>
                            {barPct != null && (
                              <ElectionRecordMiniTrack>
                                <ElectionRecordMiniFill
                                  $pct={barPct}
                                  $color={partyAccentColor(detailParty)}
                                />
                              </ElectionRecordMiniTrack>
                            )}
                          </>
                        )
                        return elHref ? (
                          <ElectionRecordLink key={er.id} to={elHref}>
                            {inner}
                          </ElectionRecordLink>
                        ) : (
                          <ElectionRecordStatic key={er.id}>
                            {inner}
                          </ElectionRecordStatic>
                        )
                      })}
                    </CompactRecordList>
                  )}
                </SubCard>
              </SectionStack>
            )}
          </InspectorBody>
        </InspectorPane>
      )}

      {modalState.open && (
        <PoliticalPartyQuickCreateModal
          editingParty={modalState.editingParty}
          onClose={() => setModalState({ open: false, editingParty: null })}
          onSaved={(saved) => {
            selectParty(saved.id, 'overview')
          }}
        />
      )}
    </Workspace>
  )
}

const Workspace = styled.div`
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.background.primary};
`

const CatalogPane = styled.div<{ $detailOpen: boolean }>`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: ${({ $detailOpen, theme }) =>
    $detailOpen ? `1px solid ${ledgerHairline(theme.mode)}` : 'none'};
`

const TopChrome = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 24px 12px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
`

const TopHeadlineGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const AccentBar = styled.span`
  width: 3px;
  height: 32px;
  border-radius: 2px;
  background: ${({ theme }) => ledgerAccent(theme.mode)};
`

const PageTitle = styled.h1`
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SummaryLine = styled.div`
  ${DIGIT_DISPLAY}
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
  font-size: 0.76rem;
  color: ${({ theme }) => theme.colors.text.secondary};

  b {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 600;
  }

  .sep {
    opacity: 0.45;
  }

  .accent {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    b {
      color: ${({ theme }) => ledgerAccent(theme.mode)};
    }
  }
`

const CrossDomainLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-right: 6px;
  font-size: 0.76rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-decoration: none;
  font-weight: 500;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
  }
`

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const PrimaryActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  font-size: 0.8rem;
  font-weight: 600;
  border-radius: ${RADIUS.SM};
  border: 1px solid transparent;
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#0e0f12' : '#ffffff')};
  cursor: pointer;
  transition: background ${MOTION.fast} ease;

  &:hover {
    background: ${({ theme }) => ledgerAccentHover(theme.mode)};
  }
`

const SpectrumTrack = styled.div`
  flex: 0 0 160px;
  display: flex;
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
  background: ${({ theme }) => ledgerHairline(theme.mode)};
  gap: 1.5px;

  @media (max-width: 900px) {
    display: none;
  }
`

const SpectrumSegment = styled.span<{
  $color: string
  $ratio: number
  $dimmed: boolean
}>`
  height: 100%;
  width: ${({ $ratio }) => `${Math.max(1.5, $ratio)}%`};
  background: ${({ $color }) => $color};
  opacity: ${({ $dimmed }) => ($dimmed ? 0.22 : 0.9)};
  transition: opacity 0.15s ease;
`

const SpectrumChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
`

const SpectrumChip = styled.button<{ $active: boolean }>`
  ${DIGIT_DISPLAY}
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 25px;
  padding: 0 9px;
  font-size: 0.73rem;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  border-radius: ${RADIUS.SM};
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? ledgerAccentBorder(theme.mode)
        : ledgerHairlineStrong(theme.mode)};
  background: ${({ $active, theme }) =>
    $active ? ledgerAccentSubtle(theme.mode) : theme.colors.background.primary};
  color: ${({ $active, theme }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  cursor: pointer;

  span {
    opacity: 0.72;
    font-size: 0.7rem;
  }
`

const Dot = styled.span<{ $color: string }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const FilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

/** 거르기 두 줄(검색·국가·존속·정렬 / 스펙트럼)을 한 덩어리로 — 밑선 하나 */
const FilterArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 24px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
`

const SpectrumRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`

const SpectrumRowLabel = styled.span`
  flex: none;
  font-size: 0.72rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SearchBox = styled.div`
  flex: 1;
  min-width: 220px;
  height: 33px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  gap: 7px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.SM};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.tertiary};

  input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.text.primary};
    outline: none;
  }
`

const ClearBtn = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  display: inline-flex;
  padding: 2px;
`

const FilterSelect = styled.select`
  height: 33px;
  padding: 0 10px;
  font-size: 0.78rem;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.SM};
`

const StatusSegment = styled.div`
  display: inline-flex;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.SM};
  overflow: hidden;
`

const StatusSegBtn = styled.button<{ $active: boolean }>`
  ${DIGIT_DISPLAY}
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 31px;
  padding: 0 10px;
  font-size: 0.76rem;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  border: none;
  background: ${({ $active, theme }) =>
    $active ? ledgerAccentSubtle(theme.mode) : theme.colors.background.primary};
  color: ${({ $active, theme }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  cursor: pointer;

  span {
    font-size: 0.7rem;
    opacity: 0.7;
  }
`

const ListScroll = styled.div`
  flex: 1;
  overflow-y: auto;
`

const LedgerTable = styled.div`
  display: flex;
  flex-direction: column;
`

/*
 * 행 — 고정 열(배지 · 정당 · 존속 연도 · 존속 막대 · 기록). 예전엔 마지막 열이 auto라 기록 칩 개수에 따라
 * 막대 열 시작이 행마다 30~60px 흔들렸다. 열 머리(ColumnHead)와 같은 틀을 쓴다.
 * 당색은 배지와 막대에만 — 왼쪽 3px 띠까지 칠하면 32행이 무지개 줄이 됐다.
 */
const ROW_GRID = '40px minmax(0, 1fr) 84px minmax(140px, 0.9fr) 124px'
const ROW_GRID_NARROW = '40px minmax(0, 1fr) 84px'

const PartyRow = styled.div<{ $selected: boolean }>`
  display: grid;
  grid-template-columns: ${ROW_GRID};
  align-items: center;
  column-gap: 16px;
  min-height: 56px;
  padding: 8px 24px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  box-shadow: ${({ $selected, theme }) =>
    $selected ? `inset 3px 0 0 ${ledgerAccent(theme.mode)}` : 'none'};
  background: ${({ $selected, theme }) =>
    $selected ? ledgerExpandedFill(theme.mode) : 'transparent'};
  cursor: pointer;
  transition: background 0.12s ease;

  &:hover {
    background: ${({ $selected, theme }) =>
      $selected ? ledgerExpandedFill(theme.mode) : ledgerRowWash(theme.mode)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
  }

  @media (max-width: 900px) {
    grid-template-columns: ${ROW_GRID_NARROW};
  }
`

const ColumnHead = styled.div`
  position: sticky;
  top: 0;
  z-index: 2;
  display: grid;
  grid-template-columns: ${ROW_GRID};
  align-items: center;
  column-gap: 16px;
  height: 30px;
  padding: 0 24px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.primary};
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.tertiary};

  .end {
    text-align: right;
  }

  @media (max-width: 900px) {
    grid-template-columns: ${ROW_GRID_NARROW};
    > :nth-child(n + 4) {
      display: none;
    }
  }
`

/** 존속 막대 열 머리의 연도 눈금 — 막대와 같은 좌표(yearBounds) */
const AxisRuler = styled.div`
  ${DIGIT_DISPLAY}
  position: relative;
  height: 100%;
  letter-spacing: 0;
`

const AxisTick = styled.span`
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.66rem;
  font-weight: 500;
`

/** 국가·체제 묶음 머리 — 지면색 위 글자만(회색 띠 없이), 행보다 한 단계 굵게 */
const GroupHead = styled.div`
  ${DIGIT_DISPLAY}
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 18px 24px 6px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  .name {
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .count {
    font-size: 0.72rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const PartyBadge = styled.div<{ $color: string }>`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $color }) => $color};
  background: ${({ $color }) => `${$color}14`};
  border: 1px solid ${({ $color }) => `${$color}33`};
  overflow: hidden;
  padding: 3px;
`

/** 배지 글자 — 길이에 따라 크기를 줄여 낱말을 자르지 않는다 */
const PartyBadgeText = styled.span<{ $length: number }>`
  font-size: ${({ $length }) => ($length <= 2 ? '0.8rem' : $length <= 3 ? '0.72rem' : '0.62rem')};
  font-weight: 700;
  letter-spacing: -0.02em;
  white-space: nowrap;
`

const PartyBadgeImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
`

const PartyMainCol = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const PartyTitleLine = styled.div`
  display: flex;
  align-items: baseline;
  gap: 7px;
  min-width: 0;
`

const PartyName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ShortName = styled.span`
  flex: none;
  font-size: 0.74rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 스펙트럼 — 색 점 + 글자(알약 면 없이) */
const PosLabel = styled.span`
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.74rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};

  & + span::before {
    content: '·';
    margin-right: 6px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const ShortBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  font-size: 0.69rem;
  font-weight: 600;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const PartyMetaLine = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

const IdeologyText = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const LifespanYears = styled.span<{ $dissolved: boolean }>`
  ${DIGIT_DISPLAY}
  font-size: 0.74rem;
  white-space: nowrap;
  color: ${({ $dissolved, theme }) =>
    $dissolved ? theme.colors.text.tertiary : theme.colors.text.secondary};
  font-weight: ${({ $dissolved }) => ($dissolved ? 500 : 600)};

  @media (max-width: 900px) {
    text-align: right;
  }
`

const LifespanTrack = styled.div`
  position: relative;
  height: 6px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerHairline(theme.mode)};
  overflow: hidden;

  @media (max-width: 900px) {
    display: none;
  }
`

const LifespanFill = styled.div<{
  $left: number
  $width: number
  $color: string
  $dissolved: boolean
}>`
  position: absolute;
  top: 0;
  bottom: 0;
  left: ${({ $left }) => `${$left}%`};
  width: ${({ $width }) => `${$width}%`};
  background: ${({ $color }) => $color};
  /* 해산 정당은 흐리게 — 다크에선 어두운 당색이 바탕에 묻혀 덜 흐리게 */
  opacity: ${({ $dissolved, theme }) => ($dissolved ? (theme.mode === 'dark' ? 0.72 : 0.5) : 0.9)};
  border-radius: 999px;
`

/** 기록 수 — 칩 면 없이 글자만, 오른쪽 정렬(열 폭 고정) */
const RecordsCol = styled.div`
  ${DIGIT_DISPLAY}
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 2px 10px;
  font-size: 0.72rem;
  color: ${({ theme }) => theme.colors.text.tertiary};

  b {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  .none {
    opacity: 0.6;
  }

  @media (max-width: 900px) {
    display: none;
  }
`

const EmptyBox = styled.div`
  padding: 56px 24px;
  text-align: center;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
`

const EmptyHintBtn = styled.button`
  height: 30px;
  padding: 0 12px;
  font-size: 0.76rem;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
`

const InspectorPane = styled.aside`
  width: 440px;
  max-width: 46vw;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  transition: width ${MOTION.normal} ease, opacity ${MOTION.normal} ease;

  @media (max-width: 960px) {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(440px, 94vw);
    max-width: none;
    z-index: 40;
    border-left: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
    box-shadow: none;
  }
`

const InspectorHeader = styled.div<{ $brandColor: string }>`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px 14px;
  border-top: 3px solid ${({ $brandColor }) => $brandColor};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const InspectorIdentityRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 11px;
  min-width: 0;
  flex: 1;
`

const InspectorEmblem = styled.div<{ $color: string }>`
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: ${RADIUS.SM};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3px;
  overflow: hidden;
  font-size: 0.72rem;
  font-weight: 800;
  color: ${({ $color }) => $color};
  background: ${({ $color }) => `${$color}14`};
  border: 1px solid ${({ $color }) => `${$color}38`};
`

const CatalogStatusPill = styled.span<{ $dissolved: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 0.67rem;
  font-weight: 700;
  color: ${({ $dissolved, theme }) =>
    $dissolved
      ? theme.mode === 'dark'
        ? '#fca5a5'
        : '#b91c1c'
      : theme.mode === 'dark'
        ? '#86efac'
        : '#15803d'};
  background: ${({ $dissolved, theme }) =>
    $dissolved
      ? theme.mode === 'dark'
        ? 'rgba(248, 113, 113, 0.16)'
        : '#fef2f2'
      : theme.mode === 'dark'
        ? 'rgba(34, 197, 94, 0.14)'
        : '#f0fdf4'};
`

const InspectorTitleBlock = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
`

const InspectorEyebrow = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.72rem;
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const InspectorTitleRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
`

const InspectorTitle = styled.h2`
  margin: 0;
  font-size: 1.02rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const InspectorLocalName = styled.div`
  font-size: 0.74rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const InspectorActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`

const IconActionBtn = styled.button`
  width: 28px;
  height: 28px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.background.secondary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const IconLinkBtn = styled(Link)`
  width: 28px;
  height: 28px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;

  &:hover {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const InspectorTabBar = styled.div`
  display: flex;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  padding: 0 14px;
  gap: 4px;
`

const InspectorTabBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 36px;
  padding: 0 10px;
  font-size: 0.78rem;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  border: none;
  border-bottom: 2px solid
    ${({ $active, theme }) =>
      $active ? ledgerAccent(theme.mode) : 'transparent'};
  background: transparent;
  color: ${({ $active, theme }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  cursor: pointer;
`

const InspectorBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 18px 28px;
`

const SectionStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`

const MetaCell = styled.div`
  padding: 9px 11px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-radius: ${RADIUS.SM};
  background: ${({ theme }) => theme.colors.background.primary};
`

const MetaKey = styled.div`
  font-size: 0.69rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-bottom: 3px;
`

const MetaVal = styled.div`
  ${DIGIT_DISPLAY}
  font-size: 0.8rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const InlineColorVal = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const SubCard = styled.section`
  padding: 12px 14px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-radius: ${RADIUS.MD};
  background: ${({ theme }) => theme.colors.background.primary};
  display: flex;
  flex-direction: column;
  gap: 9px;
`

const SubCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const SubCardTitle = styled.h3`
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const AliasWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
`

const ProseText = styled.p`
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.58;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: pre-wrap;
`

const CatalogRichProse = styled(RichTextReadView)`
  font-size: 0.8125rem;
  line-height: 1.65;
  color: ${({ theme }) => theme.colors.text.primary};
  word-break: break-word;

  & p {
    margin: 0 0 0.65em;
  }
  & p:last-child {
    margin-bottom: 0;
  }
`

const SmallOutlineBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 25px;
  padding: 0 8px;
  font-size: 0.72rem;
  font-weight: 600;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
`

const TransitionFormBox = styled.div`
  padding: 10px;
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  border-radius: ${RADIUS.SM};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  display: flex;
  flex-direction: column;
  gap: 7px;
`

const TransitionFormRow = styled.div`
  display: flex;
  gap: 6px;
`

const SmallSelect = styled.select`
  flex: 1;
  height: 30px;
  padding: 0 8px;
  font-size: 0.75rem;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
`

const SmallInput = styled.input`
  flex: 1;
  height: 30px;
  padding: 0 8px;
  font-size: 0.75rem;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
`

const TransitionFormActions = styled.div`
  display: flex;
  justify-content: flex-end;
`

const SmallPrimaryBtn = styled.button`
  height: 28px;
  padding: 0 12px;
  font-size: 0.74rem;
  font-weight: 600;
  border-radius: ${RADIUS.SM};
  border: none;
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#0e0f12' : '#ffffff')};
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${({ theme }) => ledgerAccentHover(theme.mode)};
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

const LineageFlowStrip = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 7px 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LineageFlowStep = styled.div<{
  $current?: boolean
  $muted?: boolean
  $color?: string
}>`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  text-align: center;
  opacity: ${({ $muted }) => ($muted ? 0.48 : 1)};

  .k {
    font-size: 0.65rem;
    font-weight: 700;
    color: ${({ $current, $color, theme }) =>
      $current && $color ? $color : theme.colors.text.tertiary};
  }

  strong {
    ${DIGIT_DISPLAY}
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.74rem;
    font-weight: 700;
    color: ${({ $current, theme }) =>
      $current ? theme.colors.text.primary : theme.colors.text.secondary};
  }
`

const MutedEmpty = styled.div`
  font-size: 0.76rem;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LineageColumns = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const LineageGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const LineageGroupLabel = styled.div`
  font-size: 0.7rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LineageCard = styled.div`
  padding: 8px 10px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-radius: ${RADIUS.SM};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const LineageJumpBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: none;
  background: transparent;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  text-align: left;

  span {
    font-size: 0.73rem;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:hover strong {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
  }
`

const LineageMetaRow = styled.div`
  ${DIGIT_DISPLAY}
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.71rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MiniRemoveBtn = styled.button`
  margin-left: auto;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  padding: 2px;
`

const LineageNote = styled.div`
  font-size: 0.74rem;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EventCardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const EventCardItem = styled(Link)`
  padding: 10px 11px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-radius: ${RADIUS.SM};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  text-decoration: none;
  display: flex;
  flex-direction: column;
  gap: 5px;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
`

const EventCardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
`

const EventDateMono = styled.span`
  ${DIGIT_DISPLAY}
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.71rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const EventBadgeGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const SideTag = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 6px;
  font-size: 0.68rem;
  font-weight: 600;
  border-radius: 4px;
  color: ${({ $color }) => $color};
  background: ${({ $color }) => `${$color}16`};
`

const EventCardTitle = styled.div`
  font-size: 0.82rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EventCardDesc = styled.div`
  font-size: 0.75rem;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CompactRecordList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const CompactRecordLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 9px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  text-decoration: none;
  font-size: 0.78rem;
  color: ${({ theme }) => theme.colors.text.primary};

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const ElectionRecordLink = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 8px 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  text-decoration: none;
  color: ${({ theme }) => theme.colors.text.primary};

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  }
`

const ElectionRecordStatic = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 8px 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  color: ${({ theme }) => theme.colors.text.primary};
`

const ElectionRecordRowTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.78rem;

  .title {
    font-weight: 600;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const ElectionRecordMiniTrack = styled.div`
  height: 4px;
  width: 100%;
  border-radius: 999px;
  background: ${({ theme }) => ledgerHairline(theme.mode)};
  overflow: hidden;
`

const ElectionRecordMiniFill = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  width: ${({ $pct }) => `${Math.min(100, Math.max(2, $pct))}%`};
  border-radius: 999px;
  background: ${({ $color }) => $color};
`

const MutedMono = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 0.72rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
