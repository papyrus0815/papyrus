import { type DragEvent, Fragment, type ReactNode, Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  FiAward,
  FiBookOpen,
  FiChevronDown,
  FiChevronRight,
  FiLayers,
  FiLink2,
  FiMapPin,
  FiPlus,
} from 'react-icons/fi'
import { flushSync } from 'react-dom'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'

import { eventDomainDef } from '@/entities/event/model/event-domain'
import {
  RADIUS,
  ledgerAccent,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairline,
  ledgerHairlineStrong,
} from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { getEventOverview } from '@/shared/api/event-overview'
import { eventKeys } from '@/shared/api/event-query-keys'
import {
  type EventPhaseInput,
  type UpdateEventDto,
  deleteEvent,
  putEventPhases,
  updateEvent,
} from '@/shared/api/events'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import { invalidateEventQueries } from '@/shared/api/invalidate-events'
import {
  getOfficeHoldingTimeline,
  officeHoldingTimelineKey,
} from '@/shared/api/sovereign-reigns'
import { pathKeys } from '@/shared/router'
import { notify } from '@/shared/ui/toast'
import { shouldInterceptEntityClick } from '@/widgets/country/country-inline-modal'
import { EventInlineModal } from '@/widgets/event/event-inline-modal/event-inline-modal'

import * as S from '../styles'
import { type EventDetail, usePrefetchEventDetail } from '../use-event-detail'
import { ChronologicalFlow } from './chronological-flow'
import {
  type DevelopmentPhase,
  PHASE_LABEL,
  groupByPhase,
  phaseOf,
  spanOfChildren,
} from './collection-development.lib'
import {
  ExpandToggle,
  RegroupBar,
  type RegroupCandidate,
  RowMenu,
  createCollectionWith,
} from './collection-regroup'
import {
  type AccessionMarker,
  type BridgeCountry,
  type OfficeHoldingRow,
  accessionMarkers,
  eventWindow,
} from './contemporary-heads.lib'
import { compareEventStart, crossPatchErrorMessage } from './detail-network.lib'
import { compactRowDate, shortDateText, shortSpanText } from './development-date.lib'
import {
  type GapInfo,
  type QuietSpan,
  quietSpansWithStart,
  siblingGaps,
  spanText,
  trailingQuiet,
} from './development-gap.lib'
import {
  type DropAction,
  type TreeNode,
  type TreeSource,
  buildEventTree,
  dropActionFor,
  indexTree,
  subtreeIds,
} from './development-tree.lib'
import { EventPhaseEditor } from './event-phase-editor'
import {
  type EventPhase,
  type PhaseReach,
  isoToPhasePoint,
  orderByPhase,
  phaseRangeLabel,
  phaseReach,
} from './event-phase.lib'
import { REVEAL_MISSING_ANCHOR_EVENT } from './scroll-to-anchor'
import { HeaderTextAction } from './section-collapse'

const LazyEventRegisterModal = lazy(() =>
  import('@/widgets/event-form/ui/event-register-modal').then((module) => ({
    default: module.EventRegisterModal,
  })),
)

interface CollectionDevelopmentProps {
  event: EventDetail
  onPatch: (patch: UpdateEventDto, opts?: { savedLabel?: string }) => void
  /** 기존 사건을 하위로 모으기 — 연관 탭의 '하위 사건 모으기'로 보낸다 */
  onGatherExisting: () => void
}

/**
 * 묶음 사건의 전개 — **하위 사건이 곧 전개다.**
 *
 * 묶음 사건은 전개를 글로 쓰지 않는다(서버가 전개 단락을 거부한다). 전쟁의 경과는 전투·회담·
 * 조약 같은 하위 사건이 차례로 쌓여 드러나고, 이 섹션은 그 차례를 읽는 자리다. 배경과 여파
 * 사이, 단일 사건이라면 전개 단락이 놓였을 바로 그 자리에 선다.
 *
 * 하위가 하나도 없으면 첫 하위 등록을 권하고, 그때만 '단일 사건으로' 되돌릴 수 있다
 * (하위가 남은 묶음은 서버가 단일 전환을 거부한다).
 */
/**
 * 장 머리 자리 — 화면 차례에서 국면 자리가 바뀌는 첫 행마다 하나, 건수는 그 구간만.
 * 직계(이 사건의 국면)와 펼친 하위 묶음(그 묶음의 국면)이 같은 규칙을 쓴다.
 */
/** 전개 펼침 단계 — 사건까지(전부) · 국면까지(국면 목차만) · 묶음만(직계만) */
type FoldLevel = 'events' | 'chapters' | 'collections'

/** 주소의 보기 — '?dev=chapters'. 전부(all)·국면만·묶음만·시간순 */
const VIEW_PARAM = 'dev'
type ViewParam = 'all' | 'chapters' | 'collections' | 'chrono'
const VIEW_OF_LEVEL: Record<FoldLevel, ViewParam> = { events: 'all', chapters: 'chapters', collections: 'collections' }

interface ChapterRun {
  reach: PhaseReach
  count: number
  /** 구간 열쇠 — 접기 상태를 기억하는 데 쓴다('p3' = 3국면, 'o:before' = 국면 전) */
  key: string
}

function chapterRuns(
  chapterList: ReadonlyArray<EventPhase>,
  rows: ReadonlyArray<{ id: string }>,
  reachById: ReadonlyMap<string, PhaseReach>,
): { heads: Map<string, ChapterRun>; runOf: Map<string, string> } {
  const heads = new Map<string, ChapterRun>()
  const runOf = new Map<string, string>()
  if (chapterList.length === 0) return { heads, runOf }
  let currentHead: ChapterRun | null = null
  for (const row of rows) {
    const reach = reachById.get(row.id)
    if (!reach) continue
    const key = reach.from != null ? `p${reach.from}` : `o:${reach.outside}`
    if (!currentHead || key !== currentHead.key) {
      currentHead = { reach, count: 0, key }
      heads.set(row.id, currentHead)
    }
    currentHead.count += 1
    runOf.set(row.id, key)
  }
  return { heads, runOf }
}

/** 접기 상태 저장 열쇠 — 사건마다. 다른 사건에 다녀와도 접어 둔 그대로(예전엔 돌아오면 5,000px가 다 펼쳐졌다) */
const FOLD_STORAGE_PREFIX = 'event-development-fold:'

function readFoldState(eventId: string): {
  collapsed: Set<string>
  chapters: Set<string>
  stored: boolean
} {
  try {
    const raw = window.localStorage.getItem(`${FOLD_STORAGE_PREFIX}${eventId}`)
    if (!raw)
      return { collapsed: new Set(), chapters: new Set(), stored: false }
    const parsed = JSON.parse(raw) as {
      collapsed?: string[]
      chapters?: string[]
    }
    return {
      collapsed: new Set(parsed.collapsed ?? []),
      chapters: new Set(parsed.chapters ?? []),
      stored: true,
    }
  } catch {
    return { collapsed: new Set(), chapters: new Set(), stored: false }
  }
}

/**
 * 첫 방문 기본 접기 — 하위 전체가 이만큼 넘으면 '국면만'(국면이 없으면 '묶음만')으로 연다.
 * 프랑스 혁명(108건)은 다 펼치면 6,572px(7화면), '국면만'이면 899px에 대분류 4 › 국면 13이 한 화면에 든다.
 */
const AUTO_FOLD_MIN = 40

export function CollectionDevelopment({
  event,
  onPatch,
  onGatherExisting,
}: CollectionDevelopmentProps) {
  const queryClient = useQueryClient()
  const prefetchEvent = usePrefetchEventDetail()
  const [createOpen, setCreateOpen] = useState(false)
  /** 미리보기 모달로 연 하위 사건 — 전개에서 제목을 누르면 상세로 넘어가지 않고 그 자리에서 본다 */
  const [previewId, setPreviewId] = useState<string | null>(null)
  const navigate = useNavigate()
  /** 접은 묶음 — 기본은 전부 펼친다('모든 사건을 본다'). 접은 것만 기억한다 */
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(() => readFoldState(event.id).collapsed)
  /** 접은 국면 — '사건 id|구간 열쇠'. 장 머리를 누르면 그 국면의 사건만 접힌다 */
  const [foldedChapters, setFoldedChapters] = useState<ReadonlySet<string>>(
    () => readFoldState(event.id).chapters,
  )
  /** 이 사건에 기억한 접기가 있나 — 없으면 큰 트리는 첫 방문에 기본 접기를 쓴다(아래 autoFold) */
  const foldStoredRef = useRef(readFoldState(event.id).stored)
  /* 다른 사건으로 옮겨 가면 그 사건의 접기 상태로 */
  const foldLoadedFor = useRef(event.id)
  useEffect(() => {
    if (foldLoadedFor.current === event.id) return
    foldLoadedFor.current = event.id
    const stored = readFoldState(event.id)
    foldStoredRef.current = stored.stored
    setCollapsedIds(stored.collapsed)
    setFoldedChapters(stored.chapters)
  }, [event.id])
  useEffect(() => {
    if (foldLoadedFor.current !== event.id) return
    /* 아무것도 접지 않은 첫 상태는 적지 않는다 — 적으면 '기억 있음'이 되어 다음 방문의 기본 접기가 꺼진다 */
    if (
      !foldStoredRef.current &&
      collapsedIds.size === 0 &&
      foldedChapters.size === 0
    )
      return
    foldStoredRef.current = true
    try {
      window.localStorage.setItem(
        `${FOLD_STORAGE_PREFIX}${event.id}`,
        JSON.stringify({ collapsed: [...collapsedIds], chapters: [...foldedChapters] }),
      )
    } catch {
      /* 저장 못 해도 이번 방문 동안은 접힌 그대로 */
    }
  }, [event.id, collapsedIds, foldedChapters])
  /**
   * 시간순 — 계층을 풀고 잎 사건 전부를 상위 국면에 자기 날짜로 놓는다. 직계가 기간 전체를 덮는 묶음(전쟁 › 전선)이면
   * 계층 보기의 국면 장이 1·2국면에만 몰려, 흐름은 이 보기로 읽는다.
   */
  const [chronological, setChronological] = useState(false)
  /** 참여국 국가원수의 즉위·취임 표지 — 기본은 숨기고 머리의 단추로 켠다 */
  const [showAccessions, setShowAccessions] = useState(false)
  /** 국면(목차) 편집 모달 */
  const [chapterEditorOpen, setChapterEditorOpen] = useState(false)
  const [savingChapters, setSavingChapters] = useState(false)
  /** '이 국면에 사건' — 등록 모달이 저장되면 새 사건을 이 국면에 지정한다 */
  const [pendingChapter, setPendingChapter] = useState<EventPhase | null>(null)
  /** 골라서 묶기 — 켜면 번호 자리가 고르기 칸이 되고 아래에 묶기 막대가 붙는다 */
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set())
  /** 하위 사건 등록 모달의 상위 — 기본은 이 사건, 묶음의 '이 묶음에 하위 추가'면 그 묶음 */
  const [createUnder, setCreateUnder] = useState<{ id: string; title: string } | null>(null)
  /** 끌어다 놓기 — 끄는 중인 사건, 지금 가리키는 자리와 그 결과 */
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropHint, setDropHint] = useState<{ targetId: string; action: DropAction } | null>(null)
  const [chapterDropKey, setChapterDropKey] = useState<string | null>(null)
  /** 개별 위에 놓아 새 묶음을 만들 때 — 이름을 받는 줄이 놓인 사건 아래에 열린다 */
  const [groupPrompt, setGroupPrompt] = useState<{ draggedId: string; withId: string; parentId: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const toggleIn = (set: ReadonlySet<string>, id: string) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  }
  const stopSelecting = () => {
    setSelecting(false)
    setSelectedIds(new Set())
  }

  /**
   * 하위의 하위까지 — 조망 API가 주 상위 계보 전부를 준다(이 사건 상세 응답엔 직계뿐). 받기 전엔 직계로 그린다.
   * 조망은 ['events'] 아래 키라 하위를 고칠 때마다(invalidateEventQueries) 함께 다시 받는다.
   */
  const { data: overview, isError: overviewFailed, refetch: refetchOverview } = useQuery({
    queryKey: eventKeys.overview(event.id),
    queryFn: () => getEventOverview(event.id),
    staleTime: 0,
  })
  /**
   * 행 표지 — 어디서(위치)·무엇과 이어지나(연결 수). 조망 응답이 하위 전부의 위치·관련 사건을 실어 준다.
   * 누르면 조망의 지도·연결 보기로(하위 전부를 한 지도·한 목록에서).
   */
  const rowSignals = useMemo(() => {
    const place = new Map<string, { label: string; pinned: boolean }>()
    const links = new Map<string, number>()
    if (!overview) return { place, links }
    for (const node of [overview.root, ...overview.descendants]) {
      const pinned = node.locationLatitude != null && node.locationLongitude != null
      const label = node.location?.trim() ?? ''
      if (pinned || label) place.set(node.id, { label: label || '핀', pinned })
    }
    for (const relation of overview.relations ?? []) {
      for (const id of [relation.fromId, relation.toId]) links.set(id, (links.get(id) ?? 0) + 1)
    }
    return { place, links }
  }, [overview])

  /**
   * 이 화면에서 바꾼 종류 — 조망 응답에 종류가 안 실려 오는 동안(옛 API 빌드) 하위의 하위는 '하위가 있나'로만
   * 판별돼, 하위 없는 사건을 묶음으로 바꿔도 개별로 남아 보였다. 바꾼 결과를 기억해 판별에 얹는다.
   * 응답에 종류가 실리면 그것이 정본이라(buildEventTree가 node.kind 우선) 이 기억은 자연히 뒤로 물러난다.
   */
  const [kindOverrides, setKindOverrides] = useState<ReadonlyMap<string, 'SINGLE' | 'COLLECTION'>>(() => new Map())
  const rememberKind = (id: string, kind: 'SINGLE' | 'COLLECTION') =>
    setKindOverrides((prev) => new Map(prev).set(id, kind))
  const kindById = useMemo(
    () =>
      new Map([
        ...(event.childEvents ?? []).map(
          (child) => [child.id, child.kind === 'COLLECTION' ? ('COLLECTION' as const) : ('SINGLE' as const)] as const,
        ),
        ...kindOverrides,
      ]),
    [event.childEvents, kindOverrides],
  )
  const tree = useMemo<TreeRow[]>(() => {
    const sources: TreeSource[] = overview
      ? [overview.root, ...overview.descendants].map((node) => ({
          id: node.id,
          title: node.title,
          description: node.description,
          parentEventId: node.parentEventId,
          startDate: node.startDate,
          startDatePrecision: node.startDatePrecision,
          endDate: node.endDate,
          endDatePrecision: node.endDatePrecision,
          domain: node.domain,
          /* 조망 노드 kind가 정본 — API가 아직 옛 빌드면 비어 오고, 그땐 lib가 하위 유무로 판별 */
          kind: node.kind ?? null,
          phaseId: node.phaseId ?? null,
          phases: (node.phases ?? []) as EventPhase[],
        }))
      : (event.childEvents ?? []).map((child) => ({
          id: child.id,
          title: child.title,
          description: child.description ?? null,
          parentEventId: event.id,
          startDate: child.startDate ?? null,
          startDatePrecision: child.startDatePrecision ?? null,
          endDate: child.endDate ?? null,
          endDatePrecision: child.endDatePrecision ?? null,
          domain: (child.domain as string | undefined) ?? null,
          kind: child.kind === 'COLLECTION' ? 'COLLECTION' : 'SINGLE',
        }))
    const owned: TreeRow[] = buildEventTree(event.id, sources, kindById)
    /* 추가 상위로만 이어진 하위 — 조망(주 상위 계보)에 없다. 이 묶음 소유가 아니라 읽기만 */
    const extras: TreeRow[] = (event.extraChildren ?? [])
      .filter((child) => !owned.some((node) => node.id === child.id))
      .map((child) => ({
        id: child.id,
        title: child.title,
        description: null,
        parentEventId: null,
        startDate: child.startDate ?? null,
        startDatePrecision: child.startDatePrecision ?? null,
        endDate: child.endDate ?? null,
        endDatePrecision: child.endDatePrecision ?? null,
        domain: null,
        children: [],
        isCollection: false,
        depth: 1,
        viaExtraLink: true,
      }))
    return [...owned, ...extras].sort((first, second) => compareEventStart(first.startDate, second.startDate))
  }, [overview, event.id, event.childEvents, event.extraChildren, kindById])

  const index = useMemo(() => indexTree(tree), [tree])
  const totalCount = index.size
  const directCount = tree.length
  const truncated = overview?.truncated ?? false

  /*
   * 국면(목차) — 이 묶음을 시간으로 나눈 장. 사건이 아니라 구획이라 하위 사건은 이 묶음 바로 아래 그대로 두고,
   * 손으로 넣은 국면(하위 사건의 phaseId)이 없으면 시작일로 배정한다. 전개는 국면이 바뀌는 자리에 장 머리를 세운다.
   */
  const chapters = useMemo<EventPhase[]>(
    () =>
      [...(event.phases ?? [])].sort((left, right) => left.order - right.order),
    [event.phases],
  )
  /** 직계 하위마다 국면 자리 — 시작 국면·끝 국면(걸치면 '2–4국면'), 국면 밖이면 전·사이·후 */
  const reachById = useMemo(() => {
    const manual = new Map(
      (event.childEvents ?? []).map((child) => [
        child.id,
        child.phaseId ?? null,
      ]),
    )
    return new Map(
      tree.map((node) => [
        node.id,
        phaseReach(chapters, {
          id: node.id,
          phaseId: manual.get(node.id) ?? null,
          startDate: node.startDate,
          startDatePrecision: node.startDatePrecision,
          endDate: node.endDate,
          endDatePrecision: node.endDatePrecision,
        }),
      ]),
    )
  }, [chapters, tree, event.childEvents])
  /**
   * 상위 기간에 비춘 구획(직계만) — '시작 이전 · 기간 중 · 끝난 뒤'. **국면이 있으면 구획 띠를 그리지 않는다** —
   * 국면 장 머리가 이미 시간으로 나누고 기간을 적어, 띠까지 서면 사건 2건에 머리가 4개(띠 2 + 장 2) 섰다.
   * 그땐 직계 전부를 한 구획에 국면 순으로 모은다.
   */
  const periodGroups = useMemo(() => groupByPhase(tree, event), [tree, event])
  /*
   * 기간 밖이 몇 건(≤2)뿐이면 띠도 그리지 않는다 — 이틀짜리 '바르바로사 개전'은 끝난 뒤 1건 때문에 나머지 18건 위에
   * '기간 중' 띠가 섰다. 그 몇 건은 행 날짜 줄의 꼬리표('끝난 뒤')로 말한다.
   */
  const outsideCount = periodGroups
    .filter((group) => group.phase === 'before' || group.phase === 'after')
    .reduce((sum, group) => sum + group.items.length, 0)
  const bandsSuppressed =
    chapters.length > 0 ||
    (periodGroups.some((group) => group.phase === 'during') &&
      outsideCount <= 2)
  const groups = useMemo<
    Array<{ phase: DevelopmentPhase; items: TreeRow[] }>
  >(() => {
    if (!bandsSuppressed) return periodGroups
    const flat = periodGroups.flatMap((group) => group.items)
    return [
      {
        phase: 'during',
        items: chapters.length > 0 ? orderByPhase(flat, reachById) : flat,
      },
    ]
  }, [bandsSuppressed, periodGroups, chapters, reachById])
  /** 띠를 생략했을 때 기간 밖 행의 꼬리표 — '시작 이전' · '끝난 뒤' */
  const periodTagById = useMemo(() => {
    const tags = new Map<string, string>()
    if (!bandsSuppressed) return tags
    for (const group of periodGroups) {
      if (group.phase !== 'before' && group.phase !== 'after') continue
      for (const item of group.items)
        tags.set(item.id, PHASE_LABEL[group.phase])
    }
    return tags
  }, [bandsSuppressed, periodGroups])
  /* 전부 '기간 중'일 때만 생략 — 하나뿐이어도 기간 밖이면 그 사실을 말해야 한다 */
  const showPhaseHeads =
    chapters.length === 0 &&
    (groups.length > 1 || (groups.length === 1 && groups[0].phase !== 'during'))
  /** 번호 = 화면에 보이는 차례 — 기간에 걸친 하위는 시작일 순서와 구획 순서가 다를 수 있다 */
  const ordinalById = useMemo(
    () => new Map(groups.flatMap((group) => group.items).map((node, position) => [node.id, position + 1])),
    [groups],
  )
  /**
   * 앞 사건 시작 며칠 뒤인지 — 같은 상위 아래 화면 차례에서 앞에 나온 형제 중 가장 늦게 시작한 사건과 견준다(직계는 구획을 넘어 이어지는 차례,
   * 하위 묶음 안은 그 안에서). 첫 행은 비운다 — 상위 시작과의 관계는 구획(시작 이전·기간 중)이 이미 말한다.
   */
  const { gapById, quietById } = useMemo(() => {
    const gaps = new Map<string, GapInfo & { anchorRef: string | null }>()
    const quiets = new Map<string, QuietSpan>()
    /* 번호는 renderRow와 같은 규칙 — 직계는 화면 차례(ordinalById), 하위는 '상위 번호-자리' */
    const visit = (siblings: TreeRow[], ordinalOf: (node: TreeRow, position: number) => string) => {
      const siblingGapList = siblingGaps(siblings)
      const quietList = quietSpansWithStart(siblings)
      siblings.forEach((node, position) => {
        const gap = siblingGapList[position]
        if (gap) {
          /* 견준 사건이 화면 바로 위 행이 아니면 그 번호를 적는다 */
          const anchorIndex = gap.anchorIndex ?? position - 1
          const anchorRef =
            anchorIndex !== position - 1 && siblings[anchorIndex]
              ? ordinalOf(siblings[anchorIndex], anchorIndex)
              : null
          gaps.set(node.id, { ...gap, anchorRef })
        }
        const quiet = quietList[position]
        if (quiet) quiets.set(node.id, quiet)
        const own = ordinalOf(node, position)
        visit(node.children, (_child, childPosition) => `${own}-${childPosition + 1}`)
      })
    }
    visit(groups.flatMap((group) => group.items), (node) => String(ordinalById.get(node.id) ?? 0))
    return { gapById: gaps, quietById: quiets }
  }, [groups, ordinalById])
  /**
   * 하위가 끝난 뒤 상위가 끝나기까지 1년 넘게 빈 시간 — '기간 중' 구획 끝에 공백 줄로 단다.
   * 하위가 상위 끝 뒤까지 있으면(끝난 뒤 구획) 비어 있지 않으므로 직계 전체(추가 상위 연결 포함)로 잰다.
   */
  const trailing = useMemo(() => {
    const length = trailingQuiet(tree, event)
    if (!length) return null
    const covered = spanOfChildren(tree)
    const from = covered
      ? shortDateText({
          startDate: covered.endDate,
          startDatePrecision: covered.endDatePrecision,
        })
      : null
    return { length, from }
  }, [tree, event])
  /*
   * 즉위·취임 표지 — 참여국 국가원수가 이 사건 동안 바뀐 시점을 하위 사건 사이에 끼운다(사건 목록의 즉위 표지와 같은 피드·캐시).
   * 구간은 상위 기간과 하위 범위를 합친 것. 현대 국가 참여국은 그 해의 역사 국가로 이어 찾는다.
   */
  const { data: officeHoldings } = useQuery({
    queryKey: officeHoldingTimelineKey,
    queryFn: getOfficeHoldingTimeline,
    staleTime: 5 * 60 * 1000,
  })
  const hasModernParticipants = (event.relatedCountries?.length ?? 0) > 0
  const { data: historicalCountryList } = useQuery({
    queryKey: ['historical-countries'],
    queryFn: getAllHistoricalCountries,
    staleTime: 5 * 60 * 1000,
    enabled: hasModernParticipants,
  })
  const accessions = useMemo<AccessionMarker[]>(() => {
    if (!officeHoldings) return []
    const targets = [
      ...(event.relatedCountries ?? []).map((country) => ({ kind: 'C' as const, id: country.id })),
      ...(event.relatedHistoricalCountries ?? []).map((country) => ({ kind: 'H' as const, id: country.id })),
    ]
    if (targets.length === 0) return []
    const covered = spanOfChildren(tree)
    const windows = [
      eventWindow(event),
      covered
        ? eventWindow({ startDate: covered.startDate, startDatePrecision: covered.startDatePrecision, endDate: covered.endDate })
        : null,
    ].filter((window): window is NonNullable<typeof window> => window !== null)
    if (windows.length === 0) return []
    return accessionMarkers({
      rows: officeHoldings as OfficeHoldingRow[],
      targets,
      window: {
        fromKey: Math.min(...windows.map((window) => window.startKey)),
        toKey: Math.max(...windows.map((window) => window.endKey)),
        year: Math.min(...windows.map((window) => window.startYear)),
      },
      historicalCountries: (historicalCountryList ?? []) as unknown as BridgeCountry[],
      skipHistoricalIds: new Set((event.relatedHistoricalCountries ?? []).map((country) => country.id)),
      existingEvents: [...index.values()].map((node) => ({
        title: node.title,
        startDate: node.startDate,
        startDatePrecision: node.startDatePrecision,
      })),
    })
  }, [officeHoldings, historicalCountryList, event, tree, index])
  /** 하위 사건이 실제로 다룬 기간 — 상위 기간과 다를 때가 많다(1차대전 하위는 1914년 6~8월뿐) */
  const coveredRange = useMemo(() => shortSpanText(tree), [tree])

  /**
   * 구획의 기준 시점 — '시작 이전'은 무엇의 이전인지(상위 시작일)를 함께 말해야 구획이 읽힌다.
   * 상위 날짜를 모르면 라벨만.
   */
  const parentStart = event.startDate
    ? shortDateText({
        startDate: event.startDate,
        startDatePrecision: event.startDatePrecision,
      })
    : null
  const parentEnd = event.endDate
    ? shortDateText({
        startDate: event.endDate,
        startDatePrecision: event.endDatePrecision,
      })
    : null
  const phaseRange = (phase: string): string | null => {
    if (phase === 'before') return parentStart ? `${parentStart} 이전` : null
    if (phase === 'during') return parentStart ? `${parentStart} ~ ${parentEnd ?? ''}`.trim() : null
    if (phase === 'after') return parentEnd ? `${parentEnd} 이후` : null
    return '날짜를 모르는 사건'
  }

  const becomeSingle = () =>
    onPatch({ kind: 'SINGLE' } as UpdateEventDto, {
      savedLabel: `'${event.title}'을(를) 단일 사건으로 바꿈`,
    })

  /* ── 끌어다 놓기 ── */

  const titleOf = (id: string) => (id === event.id ? event.title : (index.get(id)?.title ?? '사건'))

  /** 끄는 동안 커서에 붙는 칩 — 기본 미리보기(행 전체 스냅샷)는 손자까지 딸려 와 커서를 덮었다 */
  const previewRef = useRef<HTMLDivElement>(null)
  /** 접힌 묶음 위에 잠시 머무르면 저절로 펼친다(스프링) — 접힌 묶음 속 깊은 자리에도 놓을 수 있게 */
  const springRef = useRef<{ id: string; timer: number } | null>(null)
  const clearSpring = () => {
    if (springRef.current) window.clearTimeout(springRef.current.timer)
    springRef.current = null
  }
  const sectionRef = useRef<HTMLElement>(null)

  const endDrag = () => {
    clearSpring()
    setDraggingId(null)
    setDropHint(null)
    setChapterDropKey(null)
  }

  /**
   * 끄는 동안 목록 위·아래 끝 근처에 오면 지면을 스스로 굴린다 — 이 지면의 스크롤은 창이 아니라 내부 S.Page라
   * 브라우저 기본 자동 스크롤이 닿지 않았다(긴 전개의 아래 묶음으로 옮기려면 놓았다가 다시 잡아야 했다).
   */
  useEffect(() => {
    if (!draggingId) return undefined
    let scroller: HTMLElement | null = sectionRef.current?.parentElement ?? null
    while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement
    if (!scroller) return undefined
    const edge = 72
    const onDragOver = (dragEvent: globalThis.DragEvent) => {
      const rect = scroller!.getBoundingClientRect()
      if (dragEvent.clientY < rect.top + edge) scroller!.scrollBy({ top: -18 })
      else if (dragEvent.clientY > rect.bottom - edge) scroller!.scrollBy({ top: 18 })
    }
    document.addEventListener('dragover', onDragOver)
    return () => document.removeEventListener('dragover', onDragOver)
  }, [draggingId])

  const actionAt = (targetId: string | 'root'): DropAction | null => {
    const dragged = draggingId ? index.get(draggingId) : undefined
    if (!dragged) return null
    const target = targetId === 'root' ? 'root' : index.get(targetId)
    if (!target || (target !== 'root' && (target as TreeRow).viaExtraLink)) return null
    return dropActionFor(dragged, target, event.id)
  }

  const refreshAround = (ids: Array<string | null | undefined>) => {
    for (const eventId of new Set([event.id, ...ids].filter(Boolean) as string[])) {
      invalidateEventQueries(queryClient, { eventId })
    }
  }

  /** 옮기기 — 끝나면 '되돌리기'가 달린 토스트(원래 상위로 다시 옮긴다) */
  const moveUnder = async (id: string, parentId: string, undo = false) => {
    const previousParent = index.get(id)?.parentEventId ?? event.id
    setBusy(true)
    try {
      await updateEvent(id, { parentEventId: parentId } as UpdateEventDto)
      if (undo) {
        notify.success(`'${titleOf(id)}'을(를) 제자리로 되돌렸습니다`)
      } else {
        notify.action(`'${titleOf(id)}'을(를) '${titleOf(parentId)}' 밑으로 옮겼습니다`, {
          label: '되돌리기',
          onClick: () => void moveUnder(id, previousParent, true),
        })
      }
    } catch (error) {
      notify.error(`옮기지 못했습니다 — ${crossPatchErrorMessage(error)}`)
    } finally {
      refreshAround([id, parentId, previousParent])
      setBusy(false)
    }
  }

  /** 국면(장) 머리 위에 놓기 — 하위 사건의 phaseId를 해당 국면(또는 국면 해제)으로 바로 바꾼다 */
  const assignChapterPhase = async (
    id: string,
    nextPhaseId: string | null,
    chapterLabel: string,
    ownerId: string,
  ) => {
    setBusy(true)
    try {
      await updateEvent(id, { phaseId: nextPhaseId } as UpdateEventDto)
      notify.success(
        `'${titleOf(id)}'을(를) ${chapterLabel}(으)로 배정했습니다`,
      )
    } catch (error) {
      notify.error(`국면 배정에 실패했습니다 — ${crossPatchErrorMessage(error)}`)
    } finally {
      refreshAround([id, ownerId])
      setBusy(false)
    }
  }

  const dropOn = (targetId: string | 'root') => {
    const action = actionAt(targetId)
    const draggedId = draggingId
    endDrag()
    if (!action || !draggedId) return
    if (action.type === 'move') {
      void moveUnder(draggedId, action.parentId)
    } else {
      /* 개별 위 — 둘을 묶을 새 묶음의 이름부터 받는다(놓인 사건 아래에 입력 줄) */
      setGroupPrompt({ draggedId, withId: action.withId, parentId: action.parentId })
    }
  }

  /** 끌어 묶기 — 끝나면 '되돌리기'(둘을 원래 상위로 돌려놓고 새 묶음은 지운다) */
  const submitGroup = async (name: string) => {
    if (!groupPrompt || !name.trim()) return
    const members = [groupPrompt.withId, groupPrompt.draggedId]
      .map((id) => index.get(id))
      .filter((node): node is TreeRow => Boolean(node))
    const previous = members.map((member) => ({ id: member.id, parentId: member.parentEventId ?? event.id }))
    setBusy(true)
    try {
      const created = await createCollectionWith({
        parentId: groupPrompt.parentId,
        title: name.trim(),
        members,
        domain: event.domain,
      })
      setGroupPrompt(null)
      notify.action(`${members.length}건을 새 묶음 '${created.title}'으로 묶었습니다`, {
        label: '되돌리기',
        onClick: () => void undoGroup(created.id, previous),
      })
    } catch (error) {
      notify.error(`묶지 못했습니다 — ${crossPatchErrorMessage(error)}`)
    } finally {
      refreshAround([groupPrompt.parentId, ...previous.map((item) => item.parentId), ...members.map((member) => member.id)])
      setBusy(false)
    }
  }

  const undoGroup = async (collectionId: string, previous: Array<{ id: string; parentId: string }>) => {
    setBusy(true)
    try {
      for (const item of previous) {
        await updateEvent(item.id, { parentEventId: item.parentId } as UpdateEventDto)
      }
      await deleteEvent(collectionId)
      notify.success('묶기를 되돌렸습니다')
    } catch (error) {
      notify.error(`되돌리지 못했습니다 — ${crossPatchErrorMessage(error)}`)
    } finally {
      refreshAround([collectionId, ...previous.flatMap((item) => [item.id, item.parentId])])
      setBusy(false)
    }
  }

  /** 끌어다 놓기 대상 하나 — 행과 루트 띠가 같이 쓴다 */
  const dropTargetProps = (targetId: string | 'root') => ({
    onDragOver: (dragEvent: DragEvent<HTMLElement>) => {
      if (!draggingId) return
      dragEvent.stopPropagation()
      const action = actionAt(targetId)
      if (!action) {
        dragEvent.dataTransfer.dropEffect = 'none'
        return
      }
      dragEvent.preventDefault()
      dragEvent.dataTransfer.dropEffect = 'move'
      if (dropHint?.targetId !== targetId || dropHint.action.type !== action.type) setDropHint({ targetId, action })
      /* 접힌 묶음 위에 머무르면 펼친다 */
      if (targetId !== 'root' && collapsedIds.has(targetId) && springRef.current?.id !== targetId) {
        clearSpring()
        springRef.current = {
          id: targetId,
          timer: window.setTimeout(() => {
            setCollapsedIds((prev) => {
              const next = new Set(prev)
              next.delete(targetId)
              return next
            })
            springRef.current = null
          }, 650),
        }
      }
    },
    onDragLeave: (dragEvent: DragEvent<HTMLElement>) => {
      /* 자식 요소로 들어간 것은 떠난 게 아니다 */
      if (dragEvent.currentTarget.contains(dragEvent.relatedTarget as Node | null)) return
      if (dropHint?.targetId === targetId) setDropHint(null)
      if (springRef.current?.id === targetId) clearSpring()
    },
    onDrop: (dragEvent: DragEvent<HTMLElement>) => {
      dragEvent.preventDefault()
      dragEvent.stopPropagation()
      dropOn(targetId)
    },
  })

  /** 끌기 손잡이 — 타임라인 노드와 날짜·제목 줄 둘 다(번호만 잡을 수 있던 때보다 잡을 자리가 넓다) */
  const dragSourceProps = (node: TreeRow) => ({
    draggable: true,
    onDragStart: (dragEvent: DragEvent<HTMLElement>) => {
      /* 손자 행의 시작이 부모 행까지 올라가 부모가 끌리지 않게 */
      dragEvent.stopPropagation()
      dragEvent.dataTransfer.effectAllowed = 'move'
      dragEvent.dataTransfer.setData('text/plain', node.id)
      if (previewRef.current) {
        previewRef.current.textContent = node.isCollection ? `▣ ${node.title} · 하위 ${node.children.length}` : node.title
        dragEvent.dataTransfer.setDragImage(previewRef.current, 14, 16)
      }
      setDraggingId(node.id)
      setGroupPrompt(null)
    },
    onDragEnd: endDrag,
  })

  const dropLabel = (action: DropAction) =>
    action.type === 'move'
      ? `'${titleOf(action.parentId)}' 밑으로 옮기기`
      : `'${titleOf(action.withId)}'와(과) 새 묶음으로 묶기`

  /* ── 한 행(재귀) — 타임라인의 한 마디 ── */

  /** 공백 줄 — 1년 넘게 기록이 빈 자리. 타임라인 선을 점선으로 끊고 얼마나 비었는지 적는다 */
  const renderQuiet = (node: TreeRow, quiet: QuietSpan): ReactNode => (
    <QuietGap key={`quiet-${node.id}`} $depth={node.depth}>
      <span>{quiet.label}</span>
    </QuietGap>
  )

  /**
   * @param quietOutside 공백 줄을 바깥(직계 목록)에서 이미 세웠다 — 즉위 표지와 날짜순으로 섞으려고 직계는 바깥이 맡는다
   */
  const renderRow = (node: TreeRow, ordinal: string, quietOutside = false): ReactNode => {
    const owned = !node.viaExtraLink
    const collapsed = collapsedIds.has(node.id)
    const checked = selectedIds.has(node.id)
    const hint = dropHint?.targetId === node.id ? dropHint.action : null
    /* 앞 형제와 같은 해·같은 날은 생략 — 해가 바뀌는 행만 연도를 굵게 */
    const compactDate = compactRowDate(node, previousById.get(node.id) ?? null)
    const domain = node.domain ? eventDomainDef(node.domain) : null
    /** 진행 기간·앞 사건과의 간격 — 날짜 줄에 붙인다(행 높이를 늘리지 않게) */
    const span = spanText(node)
    const gap = gapById.get(node.id) ?? null
    const quiet = quietById.get(node.id) ?? null
    const nested = node.depth > 1
    const canDrag = owned && !selecting && !busy
    return (
      <Fragment key={node.id}>
        <Step
          id={`narrative-${node.id}`}
          $depth={node.depth}
          data-selected={checked || undefined}
        data-highlight={highlightId === node.id || undefined}
          data-drop={hint?.type}
          data-dragging={draggingId === node.id || undefined}
          {...(owned && draggingId ? dropTargetProps(node.id) : {})}
        >
          {selecting && owned ? (
            <StepCheck>
              <input
                type="checkbox"
                checked={checked}
                onChange={() =>
                  setSelectedIds((prev) => toggleIn(prev, node.id))
                }
                aria-label={`${node.title} 고르기`}
              />
            </StepCheck>
          ) : (
            <NodeCol
              {...(canDrag ? dragSourceProps(node) : {})}
              data-grab={canDrag || undefined}
              title={
                canDrag
                  ? '끌어서 다른 묶음 밑으로 옮기거나, 개별 사건 위에 놓아 함께 묶기'
                  : undefined
              }
            >
              <Node
                $collection={node.isCollection}
                $depth={node.depth}
                aria-hidden
              />
            </NodeCol>
          )}
          <StepBody>
            <Grab
              {...(canDrag ? dragSourceProps(node) : {})}
              data-grab={canDrag || undefined}
            >
              {/* 날짜가 먼저 — 타임라인은 '언제'로 읽힌다(연혁·단락 타임라인과 같은 문법) */}
              <StepPeriod>
                {compactDate ? (
                  <span title={compactDate.full}>
                    {compactDate.yearText && (
                      <YearText>{compactDate.yearText}</YearText>
                    )}
                    {compactDate.rest}
                  </span>
                ) : (
                  <span>날짜 미상</span>
                )}
                {/* '국면 전' 장 아래 '시작 이전'은 같은 말로 읽혀 생략(기준은 다르지만 — 국면 1의 시작 vs 이 사건의 시작) */}
                {node.depth === 1 &&
                  periodTagById.has(node.id) &&
                  !(
                    periodTagById.get(node.id) === PHASE_LABEL.before &&
                    rootRuns.runOf.get(node.id) === 'o:before'
                  ) && (
                    <PeriodTag title={`'${event.title}' 기간 밖`}>
                      {periodTagById.get(node.id)}
                    </PeriodTag>
                  )}
              </StepPeriod>
              <StepHead>
                <StepTitle
                  to={pathKeys.events.detail(node.id)}
                  viewTransition
                  draggable={false}
                  $nested={nested}
                  aria-haspopup="dialog"
                  onMouseEnter={() => prefetchEvent(node.id)}
                  onFocus={() => prefetchEvent(node.id)}
                  onClick={(clickEvent) => {
                    /* 보통 클릭 = 미리보기 모달. 새 탭(⌘/Ctrl·가운데 버튼)은 링크 그대로 */
                    if (!shouldInterceptEntityClick(clickEvent)) return
                    clickEvent.preventDefault()
                    setPreviewId(node.id)
                  }}
                >
                  {node.title}
                </StepTitle>
                {node.isCollection && node.children.length === 0 && (
                  <PeriodTag>비어 있음</PeriodTag>
                )}
                {node.isCollection && node.children.length > 0 && (
                  <ExpandToggle
                    expanded={!collapsed}
                    count={node.children.length}
                    title={node.title}
                    onToggle={() =>
                      setCollapsedIds((prev) => toggleIn(prev, node.id))
                    }
                  />
                )}
              </StepHead>
              {/* 접힌 묶음 — 안의 국면 차례를 한 줄로(무엇이 접혀 있는지). 누르면 펼친다 */}
              {node.isCollection &&
                collapsed &&
                (nestedRuns.get(node.id)?.heads.size ?? 0) > 0 && (
                  <ChapterSummary
                    type="button"
                    onClick={() =>
                      setCollapsedIds((prev) => toggleIn(prev, node.id))
                    }
                    aria-label={`${node.title} 펼치기`}
                  >
                    {(() => {
                      /* 같은 국면은 합쳐 센다 — 구간이 끊겨도(사이에 국면 밖 사건) '3국면'이 두 번 서지 않게. 국면 순, 밖은 끝 */
                      const totals = new Map<
                        string,
                        { label: string; count: number; order: number }
                      >()
                      for (const run of nestedRuns
                        .get(node.id)
                        ?.heads.values() ?? []) {
                        const label =
                          run.reach.from != null
                            ? `${run.reach.from}국면`
                            : '국면 밖'
                        const entry = totals.get(label) ?? {
                          label,
                          count: 0,
                          order: run.reach.from ?? Number.MAX_SAFE_INTEGER,
                        }
                        entry.count += run.count
                        totals.set(label, entry)
                      }
                      return [...totals.values()]
                        .sort((left, right) => left.order - right.order)
                        .map((entry) => `${entry.label} ${entry.count}`)
                        .join(' · ')
                    })()}
                  </ChapterSummary>
                )}
              {owned && !selecting && !draggingId && (
                <StepTools>
                  <RowMenu
                    parentId={node.parentEventId ?? event.id}
                    rootId={event.id}
                    child={node}
                    childIds={node.children.map((child) => child.id)}
                    onKindChanged={(kind) => rememberKind(node.id, kind)}
                    onAddUnder={() =>
                      setCreateUnder({ id: node.id, title: node.title })
                    }
                  />
                </StepTools>
              )}
            </Grab>
            {hint && <DropLabel role="status">{dropLabel(hint)}</DropLabel>}
            {groupPrompt?.withId === node.id && (
              <GroupPromptForm
                onSubmit={(submitEvent) => {
                  submitEvent.preventDefault()
                  const field = submitEvent.currentTarget.elements.namedItem(
                    'group-name',
                  ) as HTMLInputElement | null
                  void submitGroup(field?.value ?? '')
                }}
              >
                <GroupPromptText>
                  '{titleOf(groupPrompt.draggedId)}'와(과) 함께 묶을 새 묶음
                  이름
                </GroupPromptText>
                <GroupPromptInput
                  name="group-name"
                  autoFocus
                  placeholder="예: 7월 위기"
                  aria-label="새 묶음 이름"
                  disabled={busy}
                />
                <GroupPromptSubmit type="submit" disabled={busy}>
                  묶기
                </GroupPromptSubmit>
                <GroupPromptCancel
                  type="button"
                  onClick={() => setGroupPrompt(null)}
                  disabled={busy}
                >
                  취소
                </GroupPromptCancel>
              </GroupPromptForm>
            )}
            {node.isCollection && node.children.length > 0 && (
              /* 접힌 묶음도 하위를 지우지 않는다 — '찾으면 펼쳐지는 숨김'이라 ⌘F가 닿으면 이 묶음이 펼쳐진다 */
              <NestedSteps
                $depth={node.depth + 1}
                ref={collapsed ? markUntilFound : clearUntilFound}
                data-collapsed-id={collapsed ? node.id : undefined}
              >
                {/* 하위 번호는 상위 번호를 잇는다 — 3의 하위는 3-1·3-2, 그 하위는 3-1-1(몇 번째 국면의 몇 번째인지) */}
                {(() => {
                  /* 펼친 묶음에도 그 묶음의 국면 — 최상위(프랑스 혁명)에서 대분류 안의 1·2·3국면이 보이게 */
                  const runs = nestedRuns.get(node.id)
                  /* 이 묶음이 덮는 즉위 표지 — 하위 사건 사이 제 날짜 자리에(직계 차례 끝으로 밀리지 않게) */
                  const pending = [
                    ...(accessionPlacement.byCollection.get(node.id) ?? []),
                  ]
                  const out: ReactNode[] = []
                  /* 앞 행의 국면이 접혔나 — 장 머리 앞에 끼는 표지는 앞 국면의 끝이라 그 국면을 따른다 */
                  let previousFolded = false
                  let foldedRows: ReactNode[] = []
                  let foldedKey: string | null = null
                  const flushFolded = () => {
                    if (foldedKey && foldedRows.length > 0)
                      out.push(renderFoldedRun(foldedKey, foldedRows, node.depth + 1))
                    foldedRows = []
                    foldedKey = null
                  }
                  const emptyQueue = runs ? emptyChaptersOf(runs.chapters, runs.rows, runs.reach) : []
                  const flushEmpty = (beforeRank: number) => {
                    while (runs && emptyQueue.length > 0 && emptyQueue[0].number < beforeRank) {
                      const { chapter, number } = emptyQueue.shift()!
                      out.push(
                        renderChapterHead(emptyRun(number), `empty-${chapter.id}`, runs.chapters, node.depth + 1, node.id, true),
                      )
                    }
                  }
                  ;(runs?.rows ?? node.children).forEach(
                    (child, childIndex) => {
                      const head = runs?.heads.get(child.id)
                      const runKey = runs?.runOf.get(child.id)
                      const childKey = eventWindow(child)?.startKey ?? null
                      const folded = Boolean(
                        runKey &&
                        foldedChapters.has(chapterFoldKey(node.id, runKey)),
                      )
                      /* 표지는 장 머리보다 먼저 — 다음 국면이 시작되기 전 날짜면 앞 국면 끝에 선다 */
                      while (
                        childKey != null &&
                        pending.length > 0 &&
                        pending[0].sortKey < childKey
                      ) {
                        const marker = pending.shift()!
                        if (!(head ? previousFolded : folded))
                          out.push(renderAccession(marker, node.depth + 1))
                      }
                      previousFolded = folded
                      if (head && runs) {
                        flushFolded()
                        const rank = rankOfRun(head)
                        if (rank != null) flushEmpty(rank)
                        out.push(
                          renderChapterHead(
                            head,
                            child.id,
                            runs.chapters,
                            node.depth + 1,
                            node.id,
                          ),
                        )
                      }
                      const row = renderRow(child, `${ordinal}-${childIndex + 1}`)
                      if (folded && runKey) {
                        foldedKey = chapterFoldKey(node.id, runKey)
                        foldedRows.push(row)
                        return
                      }
                      flushFolded()
                      out.push(row)
                    },
                  )
                  flushFolded()
                  flushEmpty(Number.POSITIVE_INFINITY)
                  for (const marker of pending)
                    out.push(renderAccession(marker, node.depth + 1))
                  return out
                })()}
              </NestedSteps>
            )}
          </StepBody>
        </Step>
      </Fragment>
    )
  }

  /** 접은 국면의 행 한 덩어리 — '찾으면 펼쳐지는 숨김'. 찾기가 닿으면 beforematch로 그 국면을 편다 */
  const renderFoldedRun = (foldKey: string, rows: ReactNode[], depth: number): ReactNode => (
    <FoldedRun key={`folded-${foldKey}`} ref={markUntilFound} data-fold-key={foldKey} $depth={depth}>
      <FoldedList>{rows}</FoldedList>
    </FoldedRun>
  )

  /** 즉위·취임 표지 한 줄 — 하위 사건과 같은 선 위, 번호 대신 왕관 노드. 번호·간격 계산에는 끼지 않는다 */
  const renderAccession = (marker: AccessionMarker, depth = 1): ReactNode => (
    <AccessionStep
      key={`accession-${marker.key}`}
      $depth={depth}
      aria-label={`${marker.countries.join('·')} ${marker.name} ${marker.verb}`}
    >
      <AccessionNode aria-hidden $verb={marker.verb}>
        {marker.verb === '즉위' ? '♛' : '★'}
      </AccessionNode>
      <AccessionBody>
        <AccessionDate>
          {shortDateText({
            startDate: marker.startDate,
            startDatePrecision: marker.startPrecision,
          })}
          {marker.countries.length > 0 && (
            <span>{marker.countries.join(' · ')}</span>
          )}
        </AccessionDate>
        <AccessionTitle>
          <b>{marker.name}</b>
          {marker.title ? ` ${marker.title}` : ''} {marker.verb}
          {marker.predecessor && <span className="prev"> · {marker.predecessor} 다음</span>}
        </AccessionTitle>
      </AccessionBody>
    </AccessionStep>
  )

  /**
   * 장 머리 — 화면 차례에서 국면 자리가 바뀌는 첫 행 앞에 하나. 건수는 **그 구간만**(예전엔 같은 '국면 밖'이
   * 위아래 두 번 서며 둘 다 전체 수를 적었다). 국면 밖은 첫 국면 전·국면 사이·마지막 국면 후로 나눈다.
   */
  const rootRuns = useMemo(
    () => chapterRuns(chapters, groups.flatMap((group) => group.items), reachById),
    [chapters, groups, reachById],
  )
  /** 펼친 하위 묶음마다 그 묶음의 국면 구간 — 렌더마다 다시 세지 않게 한 번에 */
  const nestedRuns = useMemo(() => {
    const byId = new Map<
      string,
      {
        chapters: EventPhase[]
        rows: TreeRow[]
        reach: Map<string, PhaseReach>
        heads: Map<string, ChapterRun>
        runOf: Map<string, string>
      }
    >()
    for (const value of index.values()) {
      const node = value as TreeRow
      if (!node.isCollection || !node.phases?.length) continue
      const nodeChapters = [...node.phases].sort((left, right) => left.order - right.order)
      const reach = new Map(
        node.children.map((child) => [
          child.id,
          phaseReach(nodeChapters, {
            id: child.id,
            phaseId: child.phaseId ?? null,
            startDate: child.startDate,
            startDatePrecision: child.startDatePrecision,
            endDate: child.endDate,
            endDatePrecision: child.endDatePrecision,
          }),
        ]),
      )
      /* 국면별로 모아 놓는다 — 날짜 순 그대로면 같은 국면 장 머리가 끊겨 두세 번 섰다 */
      const rows = orderByPhase(node.children, reach)
      byId.set(node.id, {
        chapters: nodeChapters,
        rows,
        reach,
        ...chapterRuns(nodeChapters, rows, reach),
      })
    }
    return byId
  }, [index])
  /**
   * 즉위 표지의 자리 — 펼친 묶음 가운데 그 날짜를 덮는 **가장 깊은** 묶음 안. 예전엔 직계 차례에만 끼워져
   * 2차대전의 1940년 페탱·안토네스쿠 취임이 1939–41 묶음이 다 끝난 뒤(1941년 행들 다음)에 섰다.
   * 덮는 펼친 묶음이 없으면 직계 차례(구획별)에.
   */
  const accessionPlacement = useMemo(() => {
    const byCollection = new Map<string, AccessionMarker[]>()
    const root: AccessionMarker[] = []
    if (!showAccessions) return { byCollection, root }
    const covers = (row: TreeRow, key: number) => {
      if (
        !row.isCollection ||
        row.children.length === 0 ||
        collapsedIds.has(row.id)
      )
        return false
      const window = eventWindow({
        startDate: row.startDate,
        startDatePrecision: row.startDatePrecision,
        endDate: row.endDate ?? spanOfChildren(row.children)?.endDate ?? null,
      })
      return Boolean(window && window.startKey <= key && key <= window.endKey)
    }
    for (const marker of accessions) {
      let rows: ReadonlyArray<TreeRow> = groups.flatMap((group) => group.items)
      let owner: TreeRow | null = null
      for (;;) {
        const next = rows.find((row) => covers(row, marker.sortKey))
        if (!next) break
        owner = next
        rows = nestedRuns.get(next.id)?.rows ?? next.children
      }
      if (owner)
        byCollection.set(owner.id, [
          ...(byCollection.get(owner.id) ?? []),
          marker,
        ])
      else root.push(marker)
    }
    return { byCollection, root }
  }, [accessions, showAccessions, groups, nestedRuns, collapsedIds])
  /** 표지를 구획에 나눈다 — 그 구획이 없으면(시작 이전 표지인데 구획이 '기간 중'뿐) 가장 가까운 구획 끝에 */
  const accessionsByPhase = useMemo(() => {
    const byPhase = new Map<DevelopmentPhase, AccessionMarker[]>()
    if (!showAccessions || groups.length === 0) return byPhase
    const phases = groups.map((group) => group.phase)
    for (const marker of accessionPlacement.root) {
      let phase = showPhaseHeads
        ? phaseOf(
            {
              startDate: marker.startDate,
              startDatePrecision: marker.startPrecision,
            },
            event,
          )
        : phases[0]
      if (!phases.includes(phase))
        phase = phase === 'before' ? phases[0] : phases[phases.length - 1]
      byPhase.set(phase, [...(byPhase.get(phase) ?? []), marker])
    }
    return byPhase
  }, [accessionPlacement, showAccessions, groups, showPhaseHeads, event])
  /*
   * 목차·해시가 접힌 하위를 가리키면 — 그 행을 덮은 국면·묶음만 펼친다(다른 국면은 접힌 그대로).
   * 시간순 보기면 계층 보기로 돌아온다(시간순 행에는 앵커가 없다).
   */
  /** 한 하위 행이 보이게 — 그 행을 덮은 국면·묶음만 펼친다(flushSync라 바로 뒤 DOM 조회가 펼친 뒤를 본다) */
  const revealRowRef = useRef<(rowId: string) => boolean>(() => false)
  revealRowRef.current = (rowId: string) => {
    const target = index.get(rowId) as TreeRow | undefined
    if (!target) return false
    const openIds: string[] = []
    const openChapters: string[] = []
    let current: TreeRow | undefined = target
    while (current) {
      const parentId: string = current.parentEventId ?? event.id
      const runKey =
        parentId === event.id ? rootRuns.runOf.get(current.id) : nestedRuns.get(parentId)?.runOf.get(current.id)
      /* 열쇠는 chapterFoldKey와 같은 꼴(소유 묶음 id|구간) */
      if (runKey) openChapters.push(`${parentId}|${runKey}`)
      if (parentId === event.id) break
      openIds.push(parentId)
      current = index.get(parentId) as TreeRow | undefined
    }
    flushSync(() => {
      setChronological(false)
      setCollapsedIds((previous) => new Set([...previous].filter((id) => !openIds.includes(id))))
      setFoldedChapters((previous) => new Set([...previous].filter((key) => !openChapters.includes(key))))
    })
    return true
  }
  useEffect(() => {
    const onReveal = (revealEvent: Event) => {
      const anchorId = (revealEvent as CustomEvent<{ anchorId?: string }>).detail?.anchorId ?? ''
      if (anchorId.startsWith('narrative-')) revealRowRef.current(anchorId.slice('narrative-'.length))
    }
    window.addEventListener(REVEAL_MISSING_ANCHOR_EVENT, onReveal)
    return () => window.removeEventListener(REVEAL_MISSING_ANCHOR_EVENT, onReveal)
  }, [])

  /**
   * 미리보기를 닫으면 — 마지막으로 본 사건 행으로 돌아온다(펼쳐서 가운데에, 잠깐 강조). 미리보기에서 →로 30건을 넘겨 읽고
   * 닫으면 목록은 처음 그대로라 어디까지 읽었는지 흔적이 없었다. 모달이 연 행으로 포커스를 돌려놓은 뒤에 옮긴다.
   */
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const returnToRow = (rowId: string) => {
    if (chronological) return
    window.setTimeout(() => {
      if (!revealRowRef.current(rowId)) return
      const element = document.getElementById(`narrative-${rowId}`)
      if (!element) return
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      element.querySelector<HTMLAnchorElement>('a[href]')?.focus({ preventScroll: true })
      setHighlightId(rowId)
      window.setTimeout(() => setHighlightId((current) => (current === rowId ? null : current)), 1600)
    }, 60)
  }

  /*
   * 브라우저 찾기(⌘F)가 접힌 자리에 닿으면 — 브라우저가 숨김을 풀기 직전(beforematch)에 그 국면·묶음을 접기 기억에서도 뺀다.
   * 예전엔 접힌 행을 아예 그리지 않아 프랑스 혁명 첫 화면('국면만')에서 '바스티유'를 찾으면 0건이었다.
   */
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return undefined
    const onBeforeMatch = (matchEvent: Event) => {
      const target = matchEvent.target as HTMLElement
      const foldKey = target.dataset.foldKey
      const collapsedId = target.dataset.collapsedId
      if (foldKey) setFoldedChapters((previous) => new Set([...previous].filter((key) => key !== foldKey)))
      if (collapsedId) setCollapsedIds((previous) => new Set([...previous].filter((id) => id !== collapsedId)))
    }
    section.addEventListener('beforematch', onBeforeMatch)
    return () => section.removeEventListener('beforematch', onBeforeMatch)
  }, [])

  /**
   * 화면 차례에서 바로 앞 형제 — 행 날짜 생략의 기준. 직계는 구획을 넘어 이어지는 차례, 하위 묶음 안은
   * 국면별로 모은 차례(nestedRuns.rows). 첫 행은 null이라 연도부터 다 쓴다.
   */
  /**
   * 읽는 차례 전체 — 화면 차례대로 하위의 하위까지(접힌 것도 포함). 미리보기의 '앞 사건 · 다음 사건'이 따른다.
   * 시간순 보기면 그 보기의 차례(잎 사건을 날짜순)로.
   */
  const readingOrder = useMemo(() => {
    const order: TreeRow[] = []
    if (chronological) {
      const leaves: TreeRow[] = []
      const walk = (row: TreeRow) => (row.children.length === 0 ? leaves.push(row) : row.children.forEach(walk))
      tree.forEach(walk)
      return leaves.sort((first, second) => compareEventStart(first.startDate, second.startDate))
    }
    const visit = (rows: ReadonlyArray<TreeRow>) => {
      for (const row of rows) {
        order.push(row)
        if (row.children.length > 0) visit(nestedRuns.get(row.id)?.rows ?? row.children)
      }
    }
    visit(groups.flatMap((group) => group.items))
    return order
  }, [chronological, tree, groups, nestedRuns])
  const previewSequence = useMemo(() => {
    if (!previewId) return null
    const position = readingOrder.findIndex((row) => row.id === previewId)
    if (position < 0) return null
    const pick = (row: TreeRow | undefined) => (row ? { id: row.id, title: row.title } : null)
    /* 어디쯤 — 이 사건까지의 묶음 경로 + 그 묶음 안의 국면(시간순 보기는 직계 묶음만) */
    const trail: string[] = []
    let current = readingOrder[position] as TreeRow | undefined
    let first = true
    while (current) {
      const parentId: string = current.parentEventId ?? event.id
      const runs = parentId === event.id ? { chapters, ...rootRuns } : nestedRuns.get(parentId)
      const runKey = runs?.runOf.get(current.id)
      if (!chronological && first && runs && runKey) {
        const chapterNumber = runKey.startsWith('p') ? Number(runKey.slice(1)) : null
        const chapter = chapterNumber != null ? runs.chapters[chapterNumber - 1] : null
        const outsideLabel = runKey === 'o:before' ? '국면 전' : runKey === 'o:after' ? '국면 후' : '국면 사이'
        trail.unshift(chapter ? `${chapterNumber}국면 ${chapter.title}` : outsideLabel)
      }
      first = false
      if (parentId === event.id) break
      const parent = index.get(parentId) as TreeRow | undefined
      if (parent) trail.unshift(parent.title)
      current = parent
    }
    return {
      context: trail.length > 0 ? trail.join(' › ') : null,
      previous: pick(readingOrder[position - 1]),
      next: pick(readingOrder[position + 1]),
      position: position + 1,
      total: readingOrder.length,
      onGo: (eventId: string) => setPreviewId(eventId),
    }
  }, [previewId, readingOrder, event.id, chapters, rootRuns, nestedRuns, index, chronological])

  const previousById = useMemo(() => {
    const previous = new Map<string, TreeRow | null>()
    const visit = (rows: ReadonlyArray<TreeRow>) => {
      rows.forEach((row, position) => {
        previous.set(row.id, rows[position - 1] ?? null)
        if (row.children.length > 0)
          visit(nestedRuns.get(row.id)?.rows ?? row.children)
      })
    }
    visit(groups.flatMap((group) => group.items))
    return previous
  }, [groups, nestedRuns])
  /** 국면 구간 접기 열쇠 — 소유 묶음 id|구간 */
  const chapterFoldKey = (ownerId: string, runKey: string) => `${ownerId}|${runKey}`
  /**
   * 사건이 하나도 들지 않은 국면 — 장 머리는 '그 국면에 든 행'이 있을 때만 서서, 국면을 먼저 나누고 채우는 순서면
   * 빈 국면은 머리도 '+ 이 국면에 사건'도 없었다(국면 편집 창에서만 보였다). 걸친 행(2–4국면)이 덮으면 빈 국면이 아니다.
   */
  const emptyChaptersOf = (
    chapterList: ReadonlyArray<EventPhase>,
    rows: ReadonlyArray<TreeRow>,
    reach: ReadonlyMap<string, PhaseReach>,
  ) =>
    chapterList
      .map((chapter, position) => ({ chapter, number: position + 1 }))
      .filter(
        ({ number }) =>
          !rows.some((row) => {
            const rowReach = reach.get(row.id)
            return rowReach?.from != null && rowReach.from <= number && number <= (rowReach.to ?? rowReach.from)
          }),
      )
  /** 장 머리의 차례 — 빈 국면을 그 앞에 끼울 자리. 국면 사이는 정할 수 없어 null(끼우지 않는다) */
  const rankOfRun = (run: ChapterRun): number | null =>
    run.reach.from ??
    (run.reach.outside === 'before' ? 0 : run.reach.outside === 'after' ? Number.POSITIVE_INFINITY : null)
  const emptyRun = (number: number): ChapterRun => ({
    reach: { from: number, to: number, outside: null, manual: false },
    count: 0,
    key: `p${number}`,
  })
  const toggleChapterFold = (key: string) => setFoldedChapters((prev) => toggleIn(prev, key))
  const saveChapters = async (phases: EventPhaseInput[]) => {
    setSavingChapters(true)
    try {
      await putEventPhases(event.id, phases)
      notify.success(phases.length > 0 ? `국면 ${phases.length}개를 저장했습니다` : '국면을 모두 지웠습니다')
      setChapterEditorOpen(false)
      invalidateEventQueries(queryClient, { eventId: event.id })
    } catch {
      notify.error('국면을 저장하지 못했습니다')
    } finally {
      setSavingChapters(false)
    }
  }
  /**
   * 골라서 국면으로 — 고른 직계 하위의 처음~끝을 기간으로 국면을 하나 더하고(시작 순 자리), 날짜로는 다른 국면에
   * 들어갈 것만 새 국면에 손으로 지정한다. 깊이는 그대로(새 묶음과 달리 트리를 한 단 깊게 만들지 않는다).
   */
  const makeChapterFrom = async (title: string, selected: ReadonlyArray<RegroupCandidate>) => {
    const span = spanOfChildren(selected)
    const start = isoToPhasePoint(span?.startDate, span?.startDatePrecision)
    const end = isoToPhasePoint(span?.endDate ?? span?.startDate, span?.endDate ? span?.endDatePrecision : span?.startDatePrecision)
    const toInput = (chapter: EventPhase): EventPhaseInput => ({
      id: chapter.id,
      title: chapter.title,
      startEra: chapter.startEra ?? null,
      startYear: chapter.startYear ?? null,
      startMonth: chapter.startMonth ?? null,
      startDay: chapter.startDay ?? null,
      endEra: chapter.endEra ?? null,
      endYear: chapter.endYear ?? null,
      endMonth: chapter.endMonth ?? null,
      endDay: chapter.endDay ?? null,
      description: chapter.description ?? null,
    })
    const added: EventPhaseInput = {
      title,
      startEra: start?.era ?? null,
      startYear: start?.year ?? null,
      startMonth: start?.month ?? null,
      startDay: start?.day ?? null,
      endEra: end?.era ?? null,
      endYear: end?.year ?? null,
      endMonth: end?.month ?? null,
      endDay: end?.day ?? null,
    }
    const keyOfInput = (input: EventPhaseInput) =>
      input.startYear == null
        ? Number.POSITIVE_INFINITY
        : (input.startEra === 'BC' ? -input.startYear : input.startYear) * 10000 +
          (input.startMonth ?? 1) * 100 +
          (input.startDay ?? 1)
    const next = [...chapters.map(toInput), added].sort((left, right) => keyOfInput(left) - keyOfInput(right))
    const saved = (await putEventPhases(event.id, next)) as unknown as EventPhase[]
    const created = saved.find((phase) => !chapters.some((chapter) => chapter.id === phase.id))
    if (created) {
      for (const item of selected) {
        const reach = phaseReach(saved, item)
        const landed = reach.from != null ? saved[reach.from - 1] : null
        if (landed?.id !== created.id) await updateEvent(item.id, { phaseId: created.id } as UpdateEventDto)
      }
    }
    invalidateEventQueries(queryClient, { eventId: event.id })
    notify.success(`${selected.length}건으로 국면 '${title}'을(를) 만들었습니다`)
  }
  /** 장 머리 한 줄 — 몇 번째 국면·이름·기간·이 구간 건수. 국면 밖은 어디쯤인지(전·사이·후)와 기준 날짜 */
  const renderChapterHead = (
    head: ChapterRun,
    firstNodeId: string,
    chapterList: ReadonlyArray<EventPhase> = chapters,
    depth = 1,
    ownerId: string = event.id,
    empty = false,
  ): ReactNode => {
    const chapters = chapterList
    const foldKey = chapterFoldKey(ownerId, head.key)
    const folded = foldedChapters.has(foldKey)
    const position = head.reach.from
    const chapter = position != null ? chapters[position - 1] : null
    const first = chapters[0]
    const last = chapters[chapters.length - 1]
    /* 위 줄(작게) = 몇 국면·기간·건수, 아래 줄(크게) = 국면 이름 — 사건 행(날짜 줄 + 제목)과 같은 두 줄 문법이되 띠로 갈린다 */
    const kicker = chapter
      ? `${position}국면`
      : head.reach.outside === 'before'
        ? '국면 전'
        : head.reach.outside === 'after'
          ? '국면 후'
          : '국면 사이'
    const title = chapter ? chapter.title : '어느 국면에도 들지 않는 하위 사건'
    const range = chapter
      ? phaseRangeLabel(chapter)
      : head.reach.outside === 'before' && first
        ? `1국면(${phaseRangeLabel(first).split('–')[0]}) 이전`
        : head.reach.outside === 'after' && last
          ? `${chapters.length}국면(–${phaseRangeLabel(last).split('–')[1] ?? ''}) 이후`
          : ''
    /*
     * 한 줄 머리 — 하위 묶음 안 · 국면 밖('어느 국면에도 들지 않는…'을 큰 제목으로 세우지 않는다) ·
     * 1건짜리 국면(그 1건이 대개 같은 이름의 묶음이라 제목이 두 번 섰다). 설명도 숨긴다.
     */
    const inline = depth > 1 || !chapter || head.count <= 1
    const canDropToChapter = Boolean(
      draggingId &&
      !(index.get(draggingId) as TreeRow | undefined)?.viaExtraLink &&
      (index.get(draggingId)?.parentEventId ?? event.id) === ownerId,
    )
    return (
      <ChapterHead
        key={`chapter-${firstNodeId}`}
        $depth={depth}
        $inline={inline}
        data-outside={!chapter || undefined}
        data-empty={empty || undefined}
        data-drop-chapter={chapterDropKey === foldKey || undefined}
        aria-label={`${kicker}${chapter ? ` ${chapter.title}` : ''}${range ? `, ${range}` : ''}, ${head.count}건`}
        onDragOver={(dragEvent) => {
          if (!canDropToChapter) return
          dragEvent.preventDefault()
          dragEvent.stopPropagation()
          dragEvent.dataTransfer.dropEffect = 'move'
          if (chapterDropKey !== foldKey) setChapterDropKey(foldKey)
        }}
        onDragLeave={(dragEvent) => {
          if (dragEvent.currentTarget.contains(dragEvent.relatedTarget as globalThis.Node | null)) return
          if (chapterDropKey === foldKey) setChapterDropKey(null)
        }}
        onDrop={(dragEvent) => {
          if (!canDropToChapter) return
          dragEvent.preventDefault()
          dragEvent.stopPropagation()
          const draggedId = draggingId
          endDrag()
          if (!draggedId) return
          void assignChapterPhase(
            draggedId,
            chapter ? chapter.id : null,
            chapter ? `${position}국면 '${chapter.title}'` : '국면 밖',
            ownerId,
          )
        }}
      >
        <ChapterMark aria-hidden $inline={inline} />
        <ChapterText data-inline={inline || undefined}>
          <ChapterKicker>
            {/* 이 국면만 접기 — 장 머리는 남고 그 아래 사건만 접힌다 */}
            {!empty && <ChapterFold
              type="button"
              aria-expanded={!folded}
              aria-label={`${kicker}${chapter ? ` ${chapter.title}` : ''} ${folded ? '펼치기' : '접기'}`}
              onClick={() => toggleChapterFold(foldKey)}
            >
              {folded ? <FiChevronRight aria-hidden /> : <FiChevronDown aria-hidden />}
            </ChapterFold>}
            <b>{kicker}</b>
            {/* 펼친 하위 묶음 안 — 한 줄 구분선: 'N국면 이름 · N건'. 기간은 바로 아래 사건 날짜가 말한다 */}
            {inline && chapter && <ChapterTitle $inline>{title}</ChapterTitle>}
            {/* 기간 — 직계는 늘, 하위 묶음 안은 접혔을 때('국면만' 보기는 개요라 '언제'가 빠지면 안 된다) */}
            {(depth === 1 || folded) && range && <span>{range}</span>}
            <span>{empty ? '아직 없음' : folded ? `${head.count}건 접힘` : `${head.count}건`}</span>
            {/* 이 국면 자리에서 바로 등록 — 저장되면 이 국면에 지정된다(직계 국면만) */}
            {chapter && depth === 1 && (
              <ChapterAdd
                type="button"
                onClick={() => {
                  setPendingChapter(chapter)
                  setCreateOpen(true)
                }}
                aria-label={`${kicker} ${chapter.title}에 하위 사건 추가`}
              >
                + 이 국면에 사건
              </ChapterAdd>
            )}
          </ChapterKicker>
          {!inline && <ChapterTitle $inline={false}>{title}</ChapterTitle>}
          {!inline && chapter?.description && (
            <ChapterDescription>{chapter.description}</ChapterDescription>
          )}
        </ChapterText>
      </ChapterHead>
    )
  }

  const allOwned = useMemo(() => [...index.values()].filter((node) => !(node as TreeRow).viaExtraLink), [index])
  /** 접을 수 있는 묶음 — 하위가 있는 것만 */
  const foldableIds = useMemo(
    () => allOwned.filter((node) => node.isCollection && node.children.length > 0).map((node) => node.id),
    [allOwned],
  )
  const allFolded = foldableIds.length > 0 && foldableIds.every((id) => collapsedIds.has(id))
  /** 모든 국면 구간 열쇠 — 이 사건의 국면과 펼친 하위 묶음들의 국면 */
  const allChapterKeys = useMemo(
    () => [
      ...[...new Set(rootRuns.runOf.values())].map((key) => chapterFoldKey(event.id, key)),
      ...[...nestedRuns.entries()].flatMap(([ownerId, runs]) =>
        [...new Set(runs.runOf.values())].map((key) => chapterFoldKey(ownerId, key)),
      ),
    ],
    // chapterFoldKey는 순수 함수(열쇠 조립)
    [rootRuns, nestedRuns, event.id],
  )
  /** 국면이 없는 묶음 — '국면까지'에서는 통째로 접는다(펼쳐 두면 사건이 다 보여 단계가 무의미) */
  const foldableWithoutChapters = foldableIds.filter((id) => !nestedRuns.has(id))
  const foldLevel: FoldLevel | null =
    collapsedIds.size === 0 && foldedChapters.size === 0
      ? 'events'
      : allFolded
        ? 'collections'
        : allChapterKeys.length > 0 &&
            allChapterKeys.every((key) => foldedChapters.has(key)) &&
            foldableWithoutChapters.every((id) => collapsedIds.has(id))
          ? 'chapters'
          : null
  const applyFoldLevel = (level: FoldLevel) => {
    if (level === 'events') {
      setCollapsedIds(new Set())
      setFoldedChapters(new Set())
    } else if (level === 'chapters') {
      setCollapsedIds(new Set(foldableWithoutChapters))
      setFoldedChapters(new Set(allChapterKeys))
    } else {
      setCollapsedIds(new Set(foldableIds))
      setFoldedChapters(new Set())
    }
  }

  /*
   * 첫 방문 기본 접기 — 하위의 하위까지 받은 뒤(조망 응답) 한 번만. 기억한 접기가 있으면 손대지 않는다.
   * 펼칠 것이 없는 단계(국면도 하위 묶음도 없음)면 그대로 둔다.
   */
  /*
   * 보기 상태를 주소에 — '?dev=chapters'로 연 링크는 받는 사람도 같은 보기로 연다(기억한 접기·기본 접기보다 먼저).
   * 고를 때마다 바꿔 적는다(replace — 뒤로 가기 기록을 쌓지 않는다). 일부만 접힌 상태는 적지 않는다.
   */
  const [searchParams, setSearchParams] = useSearchParams()
  const urlView = searchParams.get(VIEW_PARAM)
  const writeView = (view: ViewParam) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        next.set(VIEW_PARAM, view)
        return next
      },
      { replace: true },
    )
  const chooseLevel = (level: FoldLevel) => {
    setChronological(false)
    applyFoldLevel(level)
    writeView(VIEW_OF_LEVEL[level])
  }

  const autoFoldFor = useRef<string | null>(null)
  useEffect(() => {
    if (!overview || autoFoldFor.current === event.id) return
    autoFoldFor.current = event.id
    if (urlView === 'chrono') {
      setChronological(true)
      return
    }
    const urlLevel = (Object.keys(VIEW_OF_LEVEL) as FoldLevel[]).find((level) => VIEW_OF_LEVEL[level] === urlView)
    if (urlLevel) {
      applyFoldLevel(urlLevel)
      return
    }
    if (foldStoredRef.current || totalCount < AUTO_FOLD_MIN) return
    if (allChapterKeys.length > 0) applyFoldLevel('chapters')
    else if (foldableIds.length > 0) applyFoldLevel('collections')
    // applyFoldLevel은 매 렌더 새로 만들어지는 setter 조합 — 사건마다 한 번만 돈다(autoFoldFor)
  }, [overview, event.id, totalCount, allChapterKeys, foldableIds, urlView])

  return (
    <S.Section id="narrative" aria-busy={busy} ref={sectionRef}>
      {/* 끌기 미리보기 칩 — 화면 밖에 두고 setDragImage로만 쓴다 */}
      <DragPreview ref={previewRef} aria-hidden />
      <S.SectionHeader>
        <S.SectionTitle>전개</S.SectionTitle>
        <DevelopmentSubtitle>
          {directCount === 0
            ? '하위 사건으로 기록'
            : totalCount > directCount
              ? `하위 사건 ${directCount}건 · 그 아래까지 ${totalCount}건`
              : `하위 사건 ${directCount}건`}
          {coveredRange && directCount > 1 && (
            <CoveredRange title="하위 사건이 실제로 다룬 기간 — 가장 이른 시작부터 가장 늦은 끝까지">
              {' · '}
              {coveredRange}
            </CoveredRange>
          )}
        </DevelopmentSubtitle>
        {/*
         * 머리에는 '보기' 한 묶음만 — 전부 · 국면만 · 묶음만 · 시간순. 예전엔 국면 편집·즉위 표지까지 6개가 같은
         * 글자 단추로 두 줄을 채워, 보기를 바꾸는 것과 고치는 것이 갈리지 않았다. 고치는 단추는 목록 끝 줄로.
         */}
        {(foldableIds.length > 0 ||
          allChapterKeys.length > 0 ||
          totalCount > directCount) && (
          <S.SectionActions>
            {/* 국면·묶음을 하나씩 접어 단계에 맞지 않으면 어느 단추도 켜지지 않는다 — 그 상태를 말한다 */}
            {!chronological && foldLevel === null && <PartialFold>일부 접힘</PartialFold>}
            <FoldLevels role="group" aria-label="전개 보기">
              {(
                [
                  ['events', '전부'],
                  ...(allChapterKeys.length > 0
                    ? [['chapters', '국면만']]
                    : []),
                  ...(foldableIds.length > 0
                    ? [['collections', '묶음만']]
                    : []),
                ] as Array<[FoldLevel, string]>
              ).map(([level, label]) => (
                <HeaderTextAction
                  key={level}
                  type="button"
                  aria-pressed={!chronological && foldLevel === level}
                  data-active={
                    (!chronological && foldLevel === level) || undefined
                  }
                  onClick={() => chooseLevel(level)}
                >
                  {label}
                </HeaderTextAction>
              ))}
              {totalCount > directCount && (
                <HeaderTextAction
                  type="button"
                  aria-pressed={chronological}
                  data-active={chronological || undefined}
                  onClick={() => {
                    const next = !chronological
                    setChronological(next)
                    writeView(next ? 'chrono' : VIEW_OF_LEVEL[foldLevel ?? 'events'])
                  }}
                  title="묶음을 풀고 하위 전부를 시간 순서로 — 국면은 사건마다 자기 날짜로"
                >
                  시간순
                </HeaderTextAction>
              )}
            </FoldLevels>
          </S.SectionActions>
        )}
      </S.SectionHeader>

      {directCount === 0 ? (
        <Empty>
          <EmptyText>
            아직 하위 사건이 없습니다. 묶음 사건의 전개는 전투·회담·조약 같은 일을 하위 사건으로
            등록해 차례로 쌓습니다.
          </EmptyText>
          <EmptyActions>
            <S.TabEmptyAction type="button" onClick={() => setCreateOpen(true)}>
              <FiPlus aria-hidden />첫 하위 사건 등록
            </S.TabEmptyAction>
            <TextButton type="button" onClick={onGatherExisting}>
              이미 있는 사건을 모으기
            </TextButton>
            <TextButton type="button" onClick={becomeSingle}>
              하위 없이 쓸 사건이면 단일 사건으로
            </TextButton>
          </EmptyActions>
        </Empty>
      ) : chronological ? (
        <ChronologicalFlow tree={tree} chapters={chapters} onOpen={setPreviewId} />
      ) : (
        <Phases>
          {/* 끄는 동안에만 — 여기 놓으면 이 사건 바로 밑(묶음에서 꺼내기) */}
          {draggingId && (
            /* 화면 위에 붙어 있다(sticky) — 긴 전개의 아래에서 끌어도 꺼내는 자리가 늘 손 닿는 곳에 */
            <RootDrop
              data-active={dropHint?.targetId === 'root' || undefined}
              data-disabled={!actionAt('root') || undefined}
              {...dropTargetProps('root')}
            >
              {actionAt('root')
                ? `여기에 놓으면 '${event.title}' 바로 밑으로`
                : `이미 '${event.title}' 바로 밑에 있습니다`}
            </RootDrop>
          )}
          {groups.map((group) => (
            <PhaseGroup
              key={group.phase}
              data-phase={group.phase}
              aria-label={showPhaseHeads ? PHASE_LABEL[group.phase] : undefined}
            >
              {showPhaseHeads && (
                <PhaseHead>
                  <PhaseMark aria-hidden />
                  <PhaseLabel>{PHASE_LABEL[group.phase]}</PhaseLabel>
                  {phaseRange(group.phase) && <PhaseRange>{phaseRange(group.phase)}</PhaseRange>}
                  <PhaseCount>{group.items.length}건</PhaseCount>
                </PhaseHead>
              )}
              <Steps data-phase={showPhaseHeads ? group.phase : undefined}>
                {(() => {
                  /* 즉위 표지는 날짜가 앞서는 하위 사건 앞에 끼운다 — 날짜 모르는 행 앞에서는 끼우지 않는다 */
                  const pending = [...(accessionsByPhase.get(group.phase) ?? [])]
                  const out: ReactNode[] = []
                  let previousFolded = false
                  /* 접은 국면의 행 — 지우지 않고 '찾으면 펼쳐지는 숨김'으로 한 덩어리에 모은다(⌘F가 닿게) */
                  let foldedRows: ReactNode[] = []
                  let foldedKey: string | null = null
                  const flushFolded = () => {
                    if (foldedKey && foldedRows.length > 0) out.push(renderFoldedRun(foldedKey, foldedRows, 1))
                    foldedRows = []
                    foldedKey = null
                  }
                  /* 빈 국면 — 차례가 지난 자리에 한 줄 머리로(구획이 여럿이면 마지막 구획 끝까지 기다린다) */
                  const emptyQueue = chapters.length > 0 ? emptyChaptersOf(chapters, tree, reachById) : []
                  const flushEmpty = (beforeRank: number) => {
                    while (emptyQueue.length > 0 && emptyQueue[0].number < beforeRank) {
                      const { chapter, number } = emptyQueue.shift()!
                      out.push(renderChapterHead(emptyRun(number), `empty-${chapter.id}`, chapters, 1, event.id, true))
                    }
                  }
                  for (const node of group.items) {
                    const chapterHead = rootRuns.heads.get(node.id)
                    const nodeKey = eventWindow(node)?.startKey ?? null
                    const runKey = rootRuns.runOf.get(node.id)
                    const folded = Boolean(runKey && foldedChapters.has(chapterFoldKey(event.id, runKey)))
                    /*
                     * 즉위 표지는 장 머리보다 먼저 — 다음 국면이 시작되기 전 날짜면 앞 국면의 끝에 선다.
                     * 접은 국면 안에 드는 표지는 그리지 않는다(장 머리 앞이면 앞 국면이 접혔는지를 따른다).
                     */
                    while (nodeKey != null && pending.length > 0 && pending[0].sortKey < nodeKey) {
                      const marker = pending.shift()!
                      if (!(chapterHead ? previousFolded : folded)) out.push(renderAccession(marker))
                    }
                    previousFolded = folded
                    /* 국면 자리가 바뀌는 자리에 장 머리 — 국면이 정의돼 있을 때만 */
                    if (chapterHead) {
                      flushFolded()
                      const rank = rankOfRun(chapterHead)
                      if (rank != null) flushEmpty(rank)
                      out.push(renderChapterHead(chapterHead, node.id))
                    }
                    /* 번호는 구획을 넘어 이어지는 직계 차례(1·2·3…) — 구획마다 다시 1부터면 몇 번째 국면인지 흐려진다 */
                    const row = renderRow(node, String(ordinalById.get(node.id) ?? 0), true)
                    if (folded && runKey) {
                      foldedKey = chapterFoldKey(event.id, runKey)
                      foldedRows.push(row)
                      continue
                    }
                    flushFolded()
                    out.push(row)
                  }
                  flushFolded()
                  flushEmpty(Number.POSITIVE_INFINITY)
                  for (const marker of pending) out.push(renderAccession(marker))
                  return out
                })()}
              </Steps>
            </PhaseGroup>
          ))}
          {overviewFailed && !overview && (
            <TruncatedNote>
              하위의 하위를 불러오지 못해 직계만 보입니다.{' '}
              <TextButton type="button" onClick={() => void refetchOverview()}>
                다시 불러오기
              </TextButton>
            </TruncatedNote>
          )}
          {truncated && <TruncatedNote>하위가 너무 많아 일부만 보입니다 — 묶음 상세에서 나머지를 보세요.</TruncatedNote>}
          {/*
           * 다음 차례 — 추가는 목록 **끝**에 선다. 번호 열에 '+' 노드를 세워 목록의 다음 줄처럼 읽히게 한다.
           */}
          {selecting ? (
            <RegroupBar
              parent={{ id: event.id, domain: event.domain }}
              selected={allOwned.filter((node) => selectedIds.has(node.id))}
              candidates={allOwned.filter(
                (node) =>
                  node.isCollection &&
                  /* 고른 것의 하위 묶음으로는 못 옮긴다(순환) */
                  ![...selectedIds].some((id) => {
                    const picked = index.get(id)
                    return picked ? subtreeIds(picked).has(node.id) : false
                  }),
              )}
              onDone={stopSelecting}
              onCancel={stopSelecting}
              onMakeChapter={makeChapterFrom}
              chapterBlockedReason={
                allOwned.some((node) => selectedIds.has(node.id) && node.depth > 1)
                  ? '하위 묶음 안의 사건이 섞여 국면으로 나눌 수 없습니다 — 그 묶음 화면에서 나누세요'
                  : null
              }
            />
          ) : (
            <NextStep>
              <AddChildRow type="button" onClick={() => setCreateOpen(true)}>
                <NextStepNode aria-hidden>
                  <FiPlus />
                </NextStepNode>
                <AddChildText>
                  <AddChildTitle>하위 사건 추가</AddChildTitle>
                  <AddChildHint>{directCount + 1}번째 하위 사건 — 전투·회담·조약을 차례 끝에</AddChildHint>
                </AddChildText>
              </AddChildRow>
              <NextStepTools>
                {directCount > 1 && (
                  <GatherButton
                    type="button"
                    onClick={() => setChapterEditorOpen(true)}
                    title="이 사건을 시간으로 나눈 장(국면) — 사건이 아니라 목차라서 하위 사건 자리는 그대로"
                  >
                    <FiBookOpen aria-hidden />
                    {chapters.length > 0
                      ? `국면 편집 ${chapters.length}`
                      : '국면 나누기'}
                  </GatherButton>
                )}
                {accessions.length > 0 && (
                  <GatherButton
                    type="button"
                    aria-pressed={showAccessions}
                    onClick={() => setShowAccessions((shown) => !shown)}
                  >
                    <FiAward aria-hidden />
                    {showAccessions
                      ? `즉위 표지 숨기기 ${accessions.length}`
                      : `즉위 표지 ${accessions.length}`}
                  </GatherButton>
                )}
                {allOwned.length > 0 && (
                  <GatherButton
                    type="button"
                    onClick={() => setSelecting(true)}
                    /* 끌기 안내 — 예전엔 목록 끝 두 줄 문단이 '한 번 끌어 볼 때까지' 늘 섰다 */
                    title="끌어서도 됩니다 — 날짜·제목 줄을 묶음 위에 놓으면 그 밑으로, 개별 사건 위에 놓으면 둘을 새 묶음으로. 접힌 묶음 위에 잠시 머무르면 펼쳐집니다"
                  >
                    <FiLayers aria-hidden />
                    골라서 묶기
                  </GatherButton>
                )}
                <GatherButton type="button" onClick={onGatherExisting}>
                  <FiLink2 aria-hidden />
                  기존 사건 모으기
                </GatherButton>
              </NextStepTools>
            </NextStep>
          )}
        </Phases>
      )}

      <EventInlineModal
        eventId={previewId}
        sequence={previewSequence}
        onClose={() => {
          const lastViewed = previewId
          setPreviewId(null)
          if (lastViewed) returnToRow(lastViewed)
        }}
        onNavigate={(eventId) => {
          setPreviewId(null)
          navigate(pathKeys.events.detail(eventId))
        }}
      />

      {(createOpen || createUnder) && (
        <Suspense fallback={null}>
          <LazyEventRegisterModal
            isOpen
            onClose={() => {
              setCreateOpen(false)
              setCreateUnder(null)
              setPendingChapter(null)
            }}
            initialParent={
              createUnder
                ? { ...createUnder, domain: event.domain }
                : { id: event.id, title: event.title, domain: event.domain }
            }
            onSaved={(savedId) => {
              /* '이 국면에 사건'으로 열었으면 새 사건을 그 국면에 — 날짜를 무엇으로 적든 고른 장에 선다 */
              const chapter = pendingChapter
              setPendingChapter(null)
              const pin =
                chapter && savedId && !createUnder
                  ? updateEvent(savedId, { phaseId: chapter.id } as UpdateEventDto).catch(() =>
                      notify.error('국면에 넣지 못했습니다 — 하위 사건의 연관 탭에서 지정하세요'),
                    )
                  : Promise.resolve()
              void pin.then(() => {
                invalidateEventQueries(queryClient, { eventId: event.id })
                if (createUnder) invalidateEventQueries(queryClient, { eventId: createUnder.id })
              })
            }}
          />
        </Suspense>
      )}
      {chapterEditorOpen && (
        <EventPhaseEditor
          isOpen
          onClose={() => setChapterEditorOpen(false)}
          phases={chapters}
          childEvents={tree.map((node) => ({
            id: node.id,
            phaseId: (event.childEvents ?? []).find((child) => child.id === node.id)?.phaseId ?? null,
            startDate: node.startDate,
            startDatePrecision: node.startDatePrecision,
          }))}
          saving={savingChapters}
          onSave={(phases) => void saveChapters(phases)}
          collectionChildCount={tree.filter((node) => node.isCollection && !node.viaExtraLink).length}
        />
      )}
    </S.Section>
  )
}

/** 직계·손자 행 — 상세 응답 하위(추가 상위 연결 표지 포함) */
type TreeRow = TreeNode & { viaExtraLink?: boolean; children: TreeRow[] }

/**
 * 목록 끝 '다음 차례' 줄 — **비어 있는 다음 행**처럼 생겼다.
 *
 * 하위 사건 행(Step)과 같은 격자(번호 28px + 본문)·같은 세로 리듬이라, 번호 자리엔 강조색 '+' 노드,
 * 제목 자리엔 '하위 사건 추가'와 몇 번째 국면이 될지가 선다. 줄 전체가 누르는 자리(hover 면)이고,
 * 이미 있는 사건을 끌어오는 '모으기'는 같은 줄 오른쪽 끝의 보조 버튼이다.
 * 위 머리카락선은 마지막 행의 아래선이 맡고, 이 줄은 점선 아래선으로 '아직 비어 있는 자리'를 말한다.
 */
const NextStep = styled.div`
  position: relative;
  display: flex;
  /* 보조 단추가 넷(국면·즉위·묶기·모으기)이 되면서 한 줄에 다 세우면 '하위 사건 추 / 가'로 낱말이 꺾였다 —
     추가 줄이 최소 폭을 지키고, 남는 자리가 없으면 보조 단추가 다음 줄 제목 열로 내려간다 */
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  max-width: ${S.PROSE_WIDTH}px;
  /* 구획 간격(22px)을 덜어 마지막 마디에 붙인다 — 떨어져 있으면 목록 밖의 별도 버튼으로 읽힌다 */
  margin-top: -14px;

  /* 타임라인의 다음 마디 — 위 세로선에서 점선으로 이어져 '+' 노드에 닿는다(아직 비어 있는 자리) */
  &::before {
    content: '';
    position: absolute;
    left: 13px;
    top: -10px;
    height: 30px;
    border-left: 2px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }

  /* 좁은 지면 — 추가 줄은 한 줄을 다 쓰고, 모으기는 그 아래 제목 열에서 시작(나란히 두면 설명이 낱말 중간에 꺾였다) */
  @container eventdetail (max-width: 639px) {
    flex-wrap: wrap;
  }
`

/** 줄 오른쪽 보조 동작 묶음 — 좁은 지면에선 아래 줄 제목 열에서 시작 */
const NextStepTools = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-left: auto;

  @container eventdetail (max-width: 639px) {
    margin: -4px 0 10px 40px;
  }
`

const AddChildRow = styled.button`
  flex: 1 1 260px;
  min-width: 0;
  display: grid;
  /* 위 마디들과 같은 노드 열(28px)·간격(12px) — '+' 노드가 세로선 위에 선다 */
  grid-template-columns: 28px minmax(0, 1fr);
  /* 노드는 제목 첫 줄에 — 설명이 둘째 줄로 내려가도 '+'가 가운데로 끌려 내려가지 않게 */
  align-items: start;
  gap: 12px;
  /* 좌우 8px 안쪽 여백만큼 바깥으로 — 번호 열·제목 열이 위 행들과 같은 x에 선다 */
  margin: 0 0 0 -8px;
  padding: 10px 8px;
  border: none;
  border-radius: ${RADIUS.SM};
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.14s;

  @container eventdetail (max-width: 639px) {
    flex-basis: 100%;
  }

  &:hover {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
  }
`

/** 번호 자리의 '+' — 번호(우측 정렬)와 같은 오른쪽 끝, 강조색 면 원. hover에 채워진다 */
const NextStepNode = styled.span`
  position: relative;
  z-index: 1;
  justify-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px dashed ${({ theme }) => ledgerAccent(theme.mode)};
  box-sizing: border-box;
  box-shadow: 0 0 0 4px ${({ theme }) => ledgerBackground(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  transition:
    background 0.14s,
    color 0.14s;

  svg {
    width: 13px;
    height: 13px;
    stroke-width: 2.5;
  }

  ${AddChildRow}:hover & {
    border-style: solid;
    background: ${({ theme }) => ledgerAccent(theme.mode)};
    /* 채운 면의 전경은 지면색 — 다크 강조색은 밝은 인디고라 흰 글자가 묻힌다(ledger 규약) */
    color: ${({ theme }) => ledgerBackground(theme.mode)};
  }
`

const AddChildText = styled.span`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 10px;
  min-width: 0;
`

/** 행 제목(15px·700)과 같은 단 — 강조색이 '아직 없는 행'임을 말한다 */
const AddChildTitle = styled.span`
  font-size: 15px;
  font-weight: 700;
  line-height: 1.45;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

/** 행의 날짜·분야 줄과 같은 단(12px·metaText) */
const AddChildHint = styled.span`
  font-size: 12px;
  color: ${metaText};
  word-break: keep-all;
`

/** 보조 동작 — 이미 있는 사건을 이 묶음으로(연관 탭의 모으기). 테두리 알약, 줄 오른쪽 끝 */
const GatherButton = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition:
    color 0.14s,
    border-color 0.14s;

  svg {
    width: 13px;
    height: 13px;
  }
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

const Empty = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: ${S.PROSE_WIDTH}px;
`

const EmptyText = styled.p`
  margin: 0;
  font-size: 15px;
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EmptyActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
`

const TextButton = styled.button`
  padding: 4px 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 12.5px;
  color: ${metaText};
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

/*
 * ───────────────────────── 타임라인 ─────────────────────────
 *
 * 연혁·단락 타임라인과 같은 문법: 왼쪽 세로선 하나에 사건마다 번호 노드가 꿰이고, 노드 옆에 **날짜 줄이 먼저**,
 * 그 아래 제목. 묶음은 노드가 둥근 사각(강조색 면)이라 '그 아래에 더 있다'를 모양으로 말하고, 그 하위는 본문
 * 열 안에서 한 단 작은 타임라인으로 이어진다. 예전엔 행 사이 머리카락선만 있는 목록이라 차례(시간)가 읽히지 않았다.
 */
const NODE = 24
const NESTED_NODE = 20
const columnOf = (_depth: number) => 28
const nodeSizeOf = (depth: number) => (depth <= 1 ? NODE : NESTED_NODE)
/** 세로선 x — 노드 가운데(선 2px) */
const lineLeft = (size: number) => size / 2 - 1

/** 한 단 타임라인 — 세로선은 첫 노드 가운데에서 시작해 마지막 행 끝까지 흐른다 */
const Steps = styled.ol`
  position: relative;
  display: flex;
  flex-direction: column;
  /* 날짜 줄이 생략·가늘어져(같은 해·같은 날은 안 쓴다) 행이 가벼워진 만큼 한 단 더 좁힌다 */
  gap: 10px;
  max-width: ${S.PROSE_WIDTH}px;
  margin: 0;
  padding: 0;
  list-style: none;

  &::before {
    content: '';
    position: absolute;
    left: ${lineLeft(columnOf(1))}px;
    top: ${NODE / 2}px;
    bottom: 6px;
    width: 2px;
    border-radius: 1px;
    background: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }

  /* 상위 기간 밖 구획 — 선을 점선으로(기간 안이 아니라는 표지) */
  &[data-phase='before']::before,
  &[data-phase='after']::before,
  &[data-phase='undated']::before {
    width: 0;
    background: none;
    border-left: 2px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
`

const Step = styled.li<{ $depth: number }>`
  position: relative;
  /* 목차에서 왔을 때 sticky 구획 머리 아래로 파묻히지 않게 */
  scroll-margin-top: 72px;
  display: grid;
  grid-template-columns: ${({ $depth }) => columnOf($depth)}px minmax(0, 1fr);
  column-gap: ${({ $depth }) => ($depth > 1 ? 10 : 12)}px;
  border-radius: ${RADIUS.SM};
  transition:
    background 0.12s,
    box-shadow 0.12s,
    opacity 0.12s;

  /* 고른 행 — 강조색 옅은 면(고르기 중에만 생긴다) */
  &[data-selected] {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }

  /* 미리보기에서 돌아온 행 — 잠깐 강조색 면(어디까지 읽었는지) */
  &[data-highlight] {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
    box-shadow: 0 0 0 6px ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }

  /* 끄는 중인 행 — 흐리게(어디서 왔는지는 남긴다) */
  &[data-dragging] {
    opacity: 0.35;
  }

  /*
   * 놓을 자리 — 묶음 밑으로(move)는 옅은 면 + 실선, 새 묶음(group)은 점선. 테두리는 inset 그림자·outline이라
   * 레이아웃이 밀리지 않는다. 노드도 함께 강조색으로 채워 '여기에 꿰인다'를 선 위에서 말한다.
   */
  &[data-drop='move'] {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
    box-shadow: inset 0 0 0 2px ${({ theme }) => ledgerAccent(theme.mode)};
  }
  &[data-drop='group'] {
    outline: 2px dashed ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

/** 노드 열 — 끌기 손잡이이기도 하다(커서 grab) */
const NodeCol = styled.div`
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 6px;

  &[data-grab] {
    cursor: grab;
  }
  &[data-grab]:active {
    cursor: grabbing;
  }
`

/**
 * 노드 — 개별은 원(10px), 묶음은 둥근 사각(12px, 강조색 테두리·옅은 면). 지면색 후광이 세로선을 끊어 노드가 선 위에 꿰인 것처럼.
 * 손이 닿으면(가장 안쪽 행만) 강조색으로 차서 '잡을 수 있다'를 말한다.
 */
const Node = styled.span<{ $collection: boolean; $depth: number }>`
  position: relative;
  z-index: 1;
  display: inline-block;
  box-sizing: border-box;
  width: ${({ $collection }) => ($collection ? 12 : 10)}px;
  height: ${({ $collection }) => ($collection ? 12 : 10)}px;
  border-radius: ${({ $collection }) => ($collection ? '4px' : '50%')};
  border: 2px solid
    ${({ theme, $collection }) =>
      $collection ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
  background: ${({ theme, $collection }) =>
    $collection
      ? ledgerAccentSubtle(theme.mode)
      : ledgerBackground(theme.mode)};
  box-shadow: 0 0 0 3px ${({ theme }) => ledgerBackground(theme.mode)};
  user-select: none;
  transition:
    background 0.12s,
    border-color 0.12s;

  li:hover:not(:has(li:hover)) > [data-grab] > &,
  li[data-drop='move'] > div > & {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    background: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

/** 고르기 칸 — 노드 자리 */
const StepCheck = styled.label`
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  padding-top: 3px;

  input {
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: ${({ theme }) => ledgerAccent(theme.mode)};
    cursor: pointer;
    box-shadow: 0 0 0 4px ${({ theme }) => ledgerBackground(theme.mode)};
  }
`

const StepBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 2px 0 4px;
`

/** 날짜·제목 줄 묶음 — 끌기 손잡이(노드보다 넓은 잡을 자리) */
const Grab = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1px;

  &[data-grab] {
    cursor: grab;
  }
  &[data-grab]:active {
    cursor: grabbing;
  }
`

/** 날짜 줄 — 노드와 같은 높이에서 시작(연혁 날짜 줄과 같은 크기·굵기) */
const StepPeriod = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 10px;
  min-height: 18px;
  font-size: 12.5px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${metaText};
`

/** 기간 밖 꼬리표 — 띠를 생략했을 때 그 몇 건에만 */
const PeriodTag = styled.span`
  padding: 0 6px;
  border-radius: ${RADIUS.PILL};
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  font-size: 11px;
  font-weight: 600;
  line-height: 16px;
`

/** 해가 바뀌는 행의 연도 — 연 표지 줄을 따로 세우지 않고 날짜 줄 안에서 굵게 */
const YearText = styled.b`
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

/** 1년 넘는 공백 — 행 사이 한 줄. 선 위에 지면색+점선을 덮어 실선을 끊는다 */
const QuietGap = styled.li<{ $depth: number }>`
  position: relative;
  list-style: none;
  padding: 0 0 6px ${({ $depth }) => columnOf($depth) + ($depth > 1 ? 10 : 12)}px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${metaText};

  &::before {
    content: '';
    position: absolute;
    left: ${({ $depth }) => lineLeft(columnOf($depth))}px;
    top: -4px;
    bottom: -4px;
    width: 2px;
    box-sizing: border-box;
    background: ${({ theme }) => ledgerBackground(theme.mode)};
    border-left: 2px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
`

/** 즉위·취임 표지 — 하위 사건 행과 같은 격자, 한 단 작고 흐리게(사건이 아니라 배경 사실) */
const AccessionStep = styled.li<{ $depth: number }>`
  position: relative;
  display: grid;
  grid-template-columns: ${({ $depth }) => columnOf($depth)}px minmax(0, 1fr);
  column-gap: ${({ $depth }) => ($depth > 1 ? 10 : 12)}px;
  list-style: none;
`

const AccessionNode = styled.span<{ $verb: '즉위' | '취임' }>`
  position: relative;
  z-index: 1;
  justify-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  box-sizing: border-box;
  font-size: 12px;
  line-height: 1;
  border: 1.5px solid ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#b45309')};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#b45309')};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  box-shadow: 0 0 0 3px ${({ theme }) => ledgerBackground(theme.mode)};
`

const AccessionBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  padding: 1px 0 2px;
`

const AccessionDate = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 2px 10px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#b45309')};

  span {
    font-weight: 500;
    color: ${metaText};
  }
`

const AccessionTitle = styled.div`
  font-size: 14px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.secondary};

  b {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .prev {
    font-size: 12.5px;
    color: ${metaText};
  }
`

/** 전개 머리의 '하위가 다룬 기간' — 건수 뒤에 이어 쓴다 */
/** 머리 부제 — 좁은 화면에서 '37 / 건'처럼 낱말 가운데가 꺾이지 않게(꺾을 때는 띄어쓰기에서) */
const DevelopmentSubtitle = styled(S.SectionSubtitle)`
  word-break: keep-all;
`

const CoveredRange = styled.span`
  font-variant-numeric: tabular-nums;
  /* 좁은 화면에서 '1941년 6월 30 / 일'처럼 날짜 중간이 끊기지 않게 — 줄을 넘기면 통째로 */
  white-space: nowrap;
`

/** 진행 기간 — 날짜 바로 뒤, 한 단 흐리게 */
const StepSpan = styled.span`
  font-weight: 500;
  color: ${metaText};
`

/**
 * '앞 사건 9일 뒤'·'앞 사건과 같은 날'·'10번 사건 3일 뒤 · 기간 겹침'(뒷말 = 견준 사건이 끝나기 전에 시작).
 * 예전 뒷말 '아직 진행 중'은 이 사건 얘기인지 앞 사건 얘기인지 읽히지 않았다. 자세한 말은 title이 든다.
 */
function gapPhrase(gap: GapInfo & { anchorRef: string | null }): string {
  const reference = gap.anchorRef ? `${gap.anchorRef}번 사건` : '앞 사건'
  const sameTime = gap.text === '같은 날' || gap.text === '같은 달'
  const base = sameTime ? `${reference}과 ${gap.text}` : `${reference} ${gap.text}`
  return gap.ongoing ? `${base} · 기간 겹침` : base
}

/** 앞 사건과의 간격 — 날짜 줄 끝, 한 단 흐리게(날짜보다 앞서지 않게) */
const StepGap = styled.span`
  margin-left: auto;
  font-weight: 500;
  color: ${metaText};

  /* 휴대폰 폭 — 오른쪽 끝에 홀로 떨어지지 않게 날짜 아래 한 줄로(왼쪽 정렬) */
  @container eventdetail (max-width: 639px) {
    flex-basis: 100%;
    margin-left: 0;
  }
`

/** 제목 + 하위 펼침 — 좁으면 펼침 단추가 다음 줄로 */
const StepHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 10px;
`

/** 분야 — 아이콘 + 이름. 예전 글자 글리프(⚔·✚)는 12px에서 '✕'·'+'로 읽혀 지우기·추가 버튼처럼 보였다 */
/** 행 표지(위치·연결) — 날짜 줄의 조용한 링크. 핀 없는 위치 글은 한 단 흐리게 */
const SignalLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  min-width: 0;
  max-width: 220px;
  font-weight: 500;
  color: ${metaText};
  text-decoration: none;

  &[data-unpinned] {
    opacity: 0.75;
  }
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
    border-radius: 3px;
  }

  svg {
    flex-shrink: 0;
    width: 11px;
    height: 11px;
  }
  .text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const DomainMeta = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-weight: 500;
  color: ${metaText};

  /* 휴대폰 폭 — 분야까지 서면 간격(+9일)이 둘째 줄로 밀린다. 분야는 제목·목록에서도 읽힌다 */
  @container eventdetail (max-width: 639px) {
    display: none;
  }

  svg {
    width: 11px;
    height: 11px;
  }
`

const StepTitle = styled(Link)<{ $nested?: boolean }>`
  font-size: ${({ $nested }) => ($nested ? 14 : 15.5)}px;
  font-weight: 600;
  line-height: 1.45;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  overflow-wrap: anywhere;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: 2px;
  }
`




/**
 * 행 도구(개별|묶음) — 날짜 줄 오른쪽 끝에 겹쳐 뜬다. 가장 안쪽 행에 손이 닿을 때만(손자에 닿으면 부모도
 * :hover라 겹겹이 떴다). 흐름 밖이라 숨어 있어도 줄을 만들지 않는다.
 */
const StepTools = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  position: absolute;
  top: -2px;
  right: 0;
  z-index: 2;
  padding-left: 8px;
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.14s;

  li:hover:not(:has(li:hover)) > div > div > &,
  div:focus-within > &,
  &:has([aria-expanded='true']) {
    opacity: 1;
    pointer-events: auto;
  }

  /* 터치 환경 — 손이 닿는 순간이 없으니 '⋯' 하나는 늘 보인다(예전 '개별 | 묶음' 두 칸 줄과 달리 행을 늘리지 않는다) */
  @media (hover: none) {
    opacity: 1;
    pointer-events: auto;
  }
`

/** 놓을 자리의 결과 한 줄 — '‘7월 위기’ 밑으로 옮기기' */
const DropLabel = styled.span`
  align-self: flex-start;
  margin-top: 2px;
  padding: 1px 8px;
  border-radius: ${RADIUS.PILL};
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  color: ${({ theme }) => ledgerBackground(theme.mode)};
  font-size: 11.5px;
  font-weight: 700;
`

/*
 * '찾으면 펼쳐지는 숨김' — React 19 타입이 hidden을 boolean으로만 알아 ref로 단다. 지원하지 않는 브라우저는
 * 그냥 hidden(display:none)으로 읽어 지금처럼 숨기기만 한다.
 */
const markUntilFound = (element: HTMLElement | null) => {
  element?.setAttribute('hidden', 'until-found')
}
const clearUntilFound = (element: HTMLElement | null) => {
  element?.removeAttribute('hidden')
}

/**
 * 접은 국면의 행 덩어리 — 지원 브라우저에선 숨긴 상자(높이 0)가 남아 목록 간격 한 칸을 먹으므로 그만큼 당긴다.
 * 미지원 브라우저는 display:none이라 여백이 생기지 않는다.
 */
const FoldedRun = styled.li<{ $depth: number }>`
  list-style: none;
  margin-top: ${({ $depth }) => ($depth > 1 ? -8 : -10)}px;
`

const FoldedList = styled.ol`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
`

/** 묶음의 하위 — 본문 열 안에서 한 단 작은 타임라인 */
const NestedSteps = styled.ol<{ $depth: number }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 8px 0 2px;

  /* 접힌 묶음(찾으면 펼쳐지는 숨김) — 높이 0 상자에 여백까지 남지 않게 */
  &[hidden] {
    margin: 0;
  }
  padding: 0;
  list-style: none;

  &::before {
    content: '';
    position: absolute;
    left: ${({ $depth }) => lineLeft(columnOf($depth))}px;
    top: ${NESTED_NODE / 2}px;
    bottom: 10px;
    width: 2px;
    border-radius: 1px;
    background: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
`

/** 끄는 동안 지면 위쪽에 붙는 띠 — 여기 놓으면 이 사건 바로 밑(묶음에서 꺼내기) */
const RootDrop = styled.div`
  position: sticky;
  top: 64px;
  z-index: 6;
  max-width: ${S.PROSE_WIDTH}px;
  padding: 12px 14px;
  border-radius: ${RADIUS.MD};
  border: 2px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark' ? '0 6px 18px rgba(0, 0, 0, 0.45)' : '0 6px 18px rgba(15, 23, 42, 0.08)'};
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-align: center;
  transition:
    background 0.12s,
    border-color 0.12s,
    color 0.12s;

  &[data-active] {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
  &[data-disabled] {
    opacity: 0.6;
  }
`

/** 끌기 미리보기 칩 — 화면 밖에 두고 setDragImage로만 쓴다(커서 옆에 제목 한 줄) */
const DragPreview = styled.div`
  position: fixed;
  top: -200px;
  left: -2000px;
  max-width: 320px;
  padding: 6px 12px;
  border-radius: ${RADIUS.PILL};
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  color: ${({ theme }) => ledgerBackground(theme.mode)};
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
`

/** 개별 위에 놓아 새 묶음 — 이름을 받는 줄(놓인 사건 아래) */
const GroupPromptForm = styled.form`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  margin-top: 6px;
  padding: 8px 10px;
  border-radius: ${RADIUS.SM};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
`

const GroupPromptText = styled.span`
  flex-basis: 100%;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const GroupPromptInput = styled.input`
  flex: 1 1 180px;
  min-width: 0;
  padding: 6px 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  font: inherit;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const GroupPromptSubmit = styled.button`
  padding: 6px 12px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerAccent(theme.mode)};
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  color: ${({ theme }) => ledgerBackground(theme.mode)};
  font: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: progress;
  }
`

const GroupPromptCancel = styled.button`
  padding: 6px 4px;
  border: none;
  background: none;
  font: inherit;
  font-size: 12.5px;
  color: ${metaText};
  cursor: pointer;
`

const TruncatedNote = styled.p`
  margin: -8px 0 0;
  font-size: 12.5px;
  color: ${metaText};
`

const Phases = styled.div`
  display: flex;
  flex-direction: column;
  gap: 28px;
  max-width: ${S.PROSE_WIDTH}px;
`

/**
 * 구획 — 상위 기간에 비춘 '시작 이전 · 기간 중 · 끝난 뒤 · 날짜 미상'. 구획마다 머리 줄(표지 + 이름 + 기준 시점 +
 * 건수)과 위 경계선으로 갈라, 타임라인이 구획마다 끊겼다 다시 시작한다. **기간 밖(이전·이후) 구획은 세로선을
 * 점선으로** — 상위 사건의 기간 바깥이라는 것을 선 모양이 말한다(예전엔 작은 라벨 하나라 구획이 안 갈렸다).
 */
/**
 * 구획 — 상위 기간에 비춘 '시작 이전 · 기간 중 · 끝난 뒤 · 날짜 미상'. 구획마다 **면이 있는 머리 띠**로 갈라
 * (기간 중 = 강조색 옅은 면, 기간 밖 = 점선 테두리), 스크롤하는 동안 탭 아래에 붙어 지금 어느 구획을 읽는지
 * 늘 보인다. 기간 밖 구획은 세로선도 점선이다. 예전엔 작은 라벨 + 머리카락선뿐이라 구획이 안 갈렸다.
 */
const PhaseGroup = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;

  & + & {
    margin-top: 14px;
  }
`

/**
 * 장(국면) 머리 — 면 없는 목차 줄. 예전엔 옅은 강조색 카드 + 번호 칸 + 설명 3줄이라, 사건 1건짜리 국면은
 * 사건보다 장 머리가 더 컸고 하위 묶음 안에서도 같은 카드가 또 섰다(한 화면에 카드 6개).
 * - 직계(depth 1): 위 줄 작은 표지(N국면 · 기간 · 건수) + 아래 줄 이름 + 설명 2줄. 노드 자리엔 강조색 막대.
 * - 펼친 하위 묶음 안: 한 줄 구분선 'N국면 이름 · N건'. 노드 자리엔 짧은 가로 눈금.
 */
const ChapterHead = styled.li<{ $depth: number; $inline: boolean }>`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: ${({ $depth }) => columnOf($depth)}px minmax(0, 1fr);
  column-gap: ${({ $depth }) => ($depth > 1 ? 10 : 12)}px;
  align-items: ${({ $inline }) => ($inline ? 'center' : 'start')};
  margin: ${({ $depth, $inline }) =>
    $depth > 1 ? '6px 0 -2px' : $inline ? '10px 0 -2px' : '14px 0 0'};
  padding: ${({ $inline }) => ($inline ? '0' : '2px 0')};
  list-style: none;
  border-radius: 8px;

  &:first-child {
    margin-top: 0;
  }

  &[data-drop-chapter] {
    box-shadow: inset 0 0 0 2px ${({ theme }) => ledgerAccent(theme.mode)};
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
`

/** 노드 자리 표지 — 직계는 세로 막대(장의 시작), 하위 묶음 안은 짧은 가로 눈금. 국면 밖은 회색 */
const ChapterMark = styled.span<{ $inline: boolean }>`
  justify-self: center;
  display: block;
  width: ${({ $inline }) => ($inline ? 10 : 4)}px;
  height: ${({ $inline }) => ($inline ? 2 : 34)}px;
  margin-top: ${({ $inline }) => ($inline ? 0 : 2)}px;
  border-radius: 2px;
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  /* 세로선 위에 떠 있게 — 지면색 테두리로 선을 끊는다 */
  box-shadow: 0 0 0 3px ${({ theme }) => ledgerBackground(theme.mode)};

  [data-outside] > & {
    background: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const ChapterText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  &[data-inline] {
    flex-direction: row;
  }
`

const ChapterKicker = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 8px;
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${metaText};

  b {
    font-weight: 800;
    letter-spacing: 0.02em;
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
  [data-outside] & b {
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  /* 하위 묶음 안 한 줄 — 줄바꿈 없이, 넘치는 이름만 말줄임 */
  [data-inline] > & {
    flex-wrap: nowrap;
    min-width: 0;
    white-space: nowrap;
  }

  /*
   * 좁은 지면 — 이름이 첫 줄을 다 쓰고 기간·건수·'+ 이 국면에 사건'은 둘째 줄로.
   * 한 줄에 다 세우면 390px에서 이름이 '독..'까지 잘렸다.
   */
  @container eventdetail (max-width: 639px) {
    [data-inline] > & {
      flex-wrap: wrap;
    }
    [data-inline] > & > :nth-child(3) {
      flex: 1 1 calc(100% - 72px);
    }
  }
`

const ChapterFold = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-left: -2px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${metaText};
  cursor: pointer;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)')};
  }
`

/** 접힌 묶음의 국면 차례 — 제목 아래 작은 한 줄 */
const ChapterSummary = styled.button`
  align-self: flex-start;
  margin-top: 2px;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: left;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

/** 일부만 접힌 상태 — 보기 단추 앞 흐린 글자 */
const PartialFold = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${metaText};
`

/** 펼침 단계 — 고른 단계는 굵게 */
const FoldLevels = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;

  [data-active] {
    font-weight: 800;
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const ChapterAdd = styled.button`
  margin-left: auto;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;
  /* 장 머리에 손이 닿을 때만 — 늘 서 있으면 국면마다 강조색 글자가 하나씩 더 붙었다 */
  opacity: 0;

  li:hover > div > span > &,
  li:focus-within > div > span > &,
  li[data-empty] > div > span > & {
    opacity: 0.8;
  }
  &:hover,
  &:focus-visible {
    opacity: 1;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  @media (hover: none) {
    opacity: 0.8;
  }
`

/** 국면 설명 — 직계 장 머리 아래 두 줄까지 */
const ChapterDescription = styled.p`
  margin: 2px 0 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/** 국면 이름 — 직계는 사건 제목보다 한 단 크게, 하위 묶음 안은 표지 줄 안의 한 토막(넘치면 말줄임) */
const ChapterTitle = styled.span<{ $inline: boolean }>`
  font-size: ${({ $inline }) => ($inline ? 12.5 : 16)}px;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: -0.01em;
  color: ${({ theme, $inline }) =>
    $inline ? theme.colors.text.secondary : theme.colors.text.primary};
  overflow-wrap: anywhere;

  ${({ $inline }) =>
    $inline
      ? `
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  `
      : ''}

  [data-outside] & {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

/**
 * 구획 머리 — 국면 머리와 같은 목차 줄(면·테두리 상자 없이). 탭 아래에 붙어(sticky) 지금 어느 구획인지
 * 남기므로 바탕만 지면색으로 불투명하게, 아래 머리카락선 하나로 행과 가른다.
 */
const PhaseHead = styled.h3`
  position: sticky;
  /* 탭 줄(sticky top 0) 바로 아래 */
  top: 48px;
  z-index: 3;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 10px;
  padding: 8px 0;
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
`

/** 구획 표지 — 노드 열 자리(세로선 위). 기간 중은 강조색으로 찬 사각, 기간 밖은 테두리만, 날짜 미상은 회색 */
const PhaseMark = styled.span`
  display: inline-block;
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  margin: 0 0 0 ${(28 - 12) / 2}px;
  border-radius: 3px;
  border: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
  background: transparent;

  [data-phase='during'] > h3 > & {
    background: ${({ theme }) => ledgerAccent(theme.mode)};
  }
  [data-phase='undated'] > h3 > & {
    border-color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const PhaseLabel = styled.span`
  margin-left: 6px;
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};

  [data-phase='during'] > h3 > & {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

/** 기준 시점 — '1914년 7월 28일 이전' */
const PhaseRange = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const PhaseCount = styled.span`
  margin-left: auto;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${metaText};
`

/**
 * 묶음 사건의 '전체 글' 안내 — 배경·여파가 둘 다 비었을 때 개요 탭 머리에 한 줄.
 *
 * 묶음 사건은 전개를 하위 사건에 맡기므로, 이 사건 자신의 글은 '전체가 무엇이었고(개요) 왜
 * 일어나(배경) 어떻게 끝났나(여파)'뿐이다. 1차세계대전은 하위 18건을 거느리면서 이 셋이 모두 0자였다.
 */
export function CollectionWholeTextNotice({
  onWriteSummary,
  onWriteBackground,
  onWriteNarrative,
  onWriteAftermath,
}: {
  /** 요약도 비었으면 — 빈 요약 자리표시를 따로 세우지 않고 여기서 쓴다 */
  onWriteSummary?: () => void
  onWriteBackground: () => void
  /**
   * 단일 사건의 '아직 글이 없다' 안내로 쓸 때 — 단일 사건은 전개도 제 글이라 전개 쓰기가 붙는다.
   * (글이 하나도 없는 단일 사건 11건은 빈 요약 기울임 한 줄 + 칩 띠 + 그보다 큰 댓글 칸이 전부였다)
   */
  onWriteNarrative?: () => void
  onWriteAftermath: () => void
}) {
  const single = Boolean(onWriteNarrative)
  return (
    <Notice role="note">
      <NoticeText>
        {single ? (
          <>
            <b>아직 글이 없습니다.</b> 요약 한 문단으로 시작하거나, 배경·전개·여파로 나눠 씁니다.
          </>
        ) : (
          <>
            <b>전체에 대한 글이 비어 있습니다.</b> 전개는 하위 사건이 맡고, 이 사건에는{' '}
            {onWriteSummary ? '요약·배경·여파' : '배경·여파'}를 씁니다.
          </>
        )}
      </NoticeText>
      <NoticeActions>
        {onWriteSummary && (
          <TextButton type="button" onClick={onWriteSummary}>
            요약 쓰기
          </TextButton>
        )}
        <TextButton type="button" onClick={onWriteBackground}>
          배경 쓰기
        </TextButton>
        {onWriteNarrative && (
          <TextButton type="button" onClick={onWriteNarrative}>
            전개 쓰기
          </TextButton>
        )}
        <TextButton type="button" onClick={onWriteAftermath}>
          여파 쓰기
        </TextButton>
      </NoticeActions>
    </Notice>
  )
}

/*
 * '아직 글이 없다' 안내 — 면 없는 한 줄. 예전엔 강조색 면 상자라 오른쪽 '비어 있는 항목 · 채우기', 아래 '더 채울 수
 * 있는 것'과 함께 같은 말이 세 번, 그중 가장 크게 섰다. 쓰기 단추만 강조색으로 남긴다.
 */
const Notice = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 14px;
  max-width: ${S.PROSE_WIDTH}px;
  padding: 2px 0 2px 12px;
  border-left: 2px solid ${({ theme }) => ledgerAccentSubtle(theme.mode)};
`

const NoticeText = styled.p`
  flex: 1 1 320px;
  margin: 0;
  /* 한국어는 낱말 경계에서 줄을 바꾼다 — 안 그러면 '배 / 경'처럼 낱말이 잘린다 */
  word-break: keep-all;
  font-size: 12.5px;
  line-height: 1.6;
  color: ${metaText};

  b {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const NoticeActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
`
