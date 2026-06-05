/**
 * Event Timeline Widget — 가로 타임라인 메인 뷰 (v3)
 * FSD: widgets/event-timeline/ui
 *
 * 디자인 원칙
 *  - 역사는 (시간 × 카테고리)의 2차원 객체. 카드 리스트가 못 보여주는
 *    "동시대성·기간·밀도"를 막대 길이/색/굵기로 시각화한다.
 *
 * 인코딩
 *  - 색         = 카테고리
 *  - 길이       = 기간 (단발성 minWidth=6px)
 *  - 높이       = importance (44/36/28/28)
 *  - dashed border = notable (normal과 시각 차등 — 색맹 보조)
 *  - critical 안쪽 흰 dot / major 빈 ring (시점 사건 색맹 보조)
 *  - active outline = 선택 시 별도 rect (stroke center-align 회피)
 *  - focus outline = 키보드 포커스만 했을 때도 시각 단서 (rule #7)
 *
 * 인터랙션
 *  - Ctrl/⌘+휠 → 줌 (포인터 위치 중심), +/- 버튼, 100% 클릭 → 1× 복귀
 *  - Space+드래그 또는 미들 클릭 드래그 → panning
 *    (Bar focus 중에는 Space는 선택용으로 동작 — 충돌 회피)
 *  - 키보드: Tab → 막대 포커스, Enter/Space → 선택, ←/→ → 같은 lane 시간순 이동
 *  - Minimap: 클릭/드래그 → 그 시기로 이동 (pointer 통합)
 *  - Legend 클릭 → 해당 카테고리 hide/show 토글 (사용자 정의 필터)
 *  - "오늘" 마커, viewport 연도 readout, export(JSON/SVG) 메뉴
 *
 * 성능
 *  - viewport culling — 화면 밖 막대 skip (1000건+ 안전)
 *  - 첫 페인트 culling — viewport null이어도 첫 화면 추정 범위로 culling
 *  - scroll throttle — requestAnimationFrame 1회
 *  - ticks max 200개 cap — 먼 시간 범위 freeze 방지
 *  - SVG 첫 measure 전 렌더 보류 — CLS 0
 */
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  FiDownload,
  FiInfo,
  FiMaximize2,
  FiMinus,
  FiPlus,
} from 'react-icons/fi'
import styled, { css, keyframes } from 'styled-components'

import { getCategoryName } from '@/features/event-list/lib'
import type { ContinentResponseDto } from '@/shared/api/continents'
import type { CountryResponseDto } from '@/shared/api/countries'
import type { EventCategoryDto } from '@/shared/api/event-categories'

import { LEDGER_CATEGORY, resolveCategory } from '../../../pages/events/ledger/styles/ledger-tokens'
import { BRAND, MOTION } from '../../../pages/events/styles/theme'
import type {
  EventCountryRoleValue,
  EventHierarchyNode,
  HistoricalEvent,
} from '../../../pages/events/create/events.types'

// ─────────────────────────────────────────────────────────────────────────────
// types
// ─────────────────────────────────────────────────────────────────────────────

interface FlatItem {
  node: EventHierarchyNode
  depth: number
  parentEvent: HistoricalEvent | null
}

interface EventTimelineProps {
  flattenedHierarchy: FlatItem[]
  events: HistoricalEvent[]
  selectedEventId: string | null
  dbCategories: EventCategoryDto[]
  /** lane 축을 카테고리/대륙/국가로 분기하기 위한 참조 데이터 */
  continents?: ContinentResponseDto[]
  countries?: CountryResponseDto[]
  onSelectEvent: (id: string) => void
  /**
   * 페이지네이션 — 타임라인은 *전 시대를 한 화면에* 보여주는 게 목적이라
   * 부분 로드(첫 100건)면 "어떤 사건이 있나"가 구조적으로 안 보인다.
   * hasMore일 때 onLoadMore를 점진 호출해 전체 집합을 채운다.
   */
  hasMore?: boolean
  isFetchingMore?: boolean
  onLoadMore?: () => void
  /** 첫 페이지 로딩 중 — 데이터 0과 구분해 "불러오는 중" 표시 (로딩↔빈 상태 혼동 방지) */
  isLoading?: boolean
}

/** lane 축 — 카테고리(기존) · 대륙 · 국가. 색은 항상 카테고리. */
type GroupBy = 'category' | 'continent' | 'country'

const UNCATEGORIZED_LANE = '기타'

/**
 * 대표 국가 우선순위 — 사건이 여러 국가에 걸칠 때 *단 하나의* lane으로 보내기 위한 결정 규칙.
 *
 *   주도국(INITIATOR) → 대상국(TARGET) → 피해/적대국(VICTIM/ADVERSARY) → 그 외
 *
 * 같은 tier 내에서는 입력 순서(API 응답 순서)를 유지. role 미설정 데이터가 많을
 * 가능성이 있어 fallback으로 *첫 번째 항목*을 사용 — 점진적으로 데이터 정리하면
 * 자연스럽게 정확도 상승.
 */
const ROLE_PRIORITY: Record<EventCountryRoleValue, number> = {
  INITIATOR: 100,
  TARGET: 80,
  VICTIM: 70,
  ADVERSARY: 65,
  ALLY: 50,
  PARTICIPANT: 40,
  MEDIATOR: 30,
  BENEFICIARY: 25,
  OBSERVER: 20,
  OTHER: 10,
}

function pickPrimaryByRole<T extends { role?: EventCountryRoleValue | null }>(
  items: T[] | undefined,
): T | null {
  if (!items || items.length === 0) return null
  let best: T = items[0]
  let bestScore = best.role ? (ROLE_PRIORITY[best.role] ?? 0) : 0
  for (let i = 1; i < items.length; i++) {
    const it = items[i]
    const score = it.role ? (ROLE_PRIORITY[it.role] ?? 0) : 0
    if (score > bestScore) {
      best = it
      bestScore = score
    }
  }
  return best
}

interface BarData {
  id: string
  title: string
  /** 색 인코딩의 기준 — groupBy와 무관하게 *카테고리* 의미 보존 */
  category: string
  importance: 'critical' | 'major' | 'notable' | 'normal'
  startYear: number
  endYear: number
  startDate: string
  endDate: string | null
  /**
   * lane 멤버십. *항상 단일 키* — continent/country 모드에서는 대표 국가(role
   * INITIATOR > TARGET > ... 우선순위)의 lane으로만 배치. 미해결 시
   * [UNCATEGORIZED_LANE]. 배열 형태는 downstream이 multi-key를 자연스럽게
   * 처리하므로 (필요 시 향후 보조 lane 표시 등 확장 여지) 그대로 유지.
   */
  laneKeys: string[]
  /** 계층 깊이 — 0=최상위, 1+=자식. 시각 차별화(opacity)·row 우선순위에 사용. */
  depth: number
}

// ─────────────────────────────────────────────────────────────────────────────
// constants
// ─────────────────────────────────────────────────────────────────────────────

/** lane 높이 — 4-row stacking 여유 확보(이전 72에서 88로 상향). 자식 사건 노출로 lane 밀도 ↑ */
const LANE_HEIGHT = 88
const LANE_LABEL_WIDTH = 115
const TOP_AXIS_HEIGHT = 40
const PIXELS_PER_YEAR_DEFAULT = 24
const MIN_BAR_WIDTH = 6
const TIMELINE_BOTTOM_PAD = 20

/** Zoom 프리셋 — dropdown에서 선택 가능한 단계 */
const ZOOM_PRESETS = [0.5, 0.75, 1, 1.5, 2, 4, 8, 16] as const
const ZOOM_MIN = 0.5
/**
 * 최대 줌 — 짧은 사건(예: 1~2개월짜리)도 본문 라벨이 잘리지 않고 들어갈 만큼
 * 충분한 폭이 필요. 400%로는 부족했음.
 */
const ZOOM_MAX = 16
const ZOOM_STEP = 1.4

/**
 * 짧은 사건 인코딩 임계값.
 *   - 의미적 폭 < SHORT_BAR_PX → milestone(다이아몬드)로 표시
 *   - milestone 간 거리 < CLUSTER_GAP_PX 이고 같은 lane이면 클러스터 chip
 *   - 외부 라벨은 다음 milestone/막대까지 거리 ≥ EXT_LABEL_MIN_GAP 일 때만 표시
 */
const SHORT_BAR_PX = 8
const CLUSTER_GAP_PX = 5
/** Cluster 최소 개수 — 5에서 3으로 낮춤. 3~4개 밀집도 시각적으로 겹쳐 구별 어려워 cluster 처리. */
const CLUSTER_MIN_COUNT = 3
/**
 * 줌별 라벨 노출 importance 정책 — 저줌에서도 사건명을 볼 수 있도록 *완화된* 임계값.
 *
 * 기본 줌(1.0x)에서 모든 importance(notable 포함)에 라벨이 시도됨. 충돌은
 * importance-weighted conflict resolution이 처리하므로 *과한 사전 필터*는 불필요.
 *
 *  - zoom < 0.5  : critical만 (매우 좁아 시야 우선)
 *  - 0.5 ~ 0.85  : critical + major
 *  - >= 0.85     : 모든 importance (notable·normal 포함)
 */
const LABEL_IMPORTANCE_TIER: Record<BarData['importance'], number> = {
  critical: 4,
  major: 3,
  notable: 2,
  normal: 1,
}
function labelImportanceMinTier(zoom: number): number {
  if (zoom < 0.5) return LABEL_IMPORTANCE_TIER.critical
  if (zoom < 0.85) return LABEL_IMPORTANCE_TIER.major
  return LABEL_IMPORTANCE_TIER.normal
}
/**
 * 외부 라벨 최대 폭 — 이전 140은 한국어 12자 안팎까지밖에 못 담아 긴 타이틀
 * (예: "1872년 긴자 대화재 (메이지 대화재)") 다수가 잘렸다. 220으로 상향 →
 * 약 18~20자(CJK)까지 노출. fit-to-width 계산도 이 값에 맞춰 우측 padding
 * 자동 보정.
 */
const EXT_LABEL_MAX_WIDTH = 220

const IMPORTANCE_BAR_HEIGHT: Record<BarData['importance'], number> = {
  critical: 44,
  major: 36,
  notable: 28,
  normal: 28,
}

/**
 * Bar row stacking — 같은 lane에서 시간 겹친 bar들을 row 단위로 분리해 모두 보이게.
 *  - MAX_BAR_ROWS: lane 안 최대 row 수. 5번째+는 "+N" overflow 배지로 노출.
 *  - ROW_DELTA: row 간 y 간격(px). 인접 row 막대가 시각으로 분리되려면
 *    `ROW_DELTA >= COMPACT_BAR_HEIGHT.critical + 4` (4px 시각 여유).
 *  - COMPACT_BAR_HEIGHT: stacking 활성 lane의 bar 높이(작게). 단일 row일 땐 원래 높이 유지.
 *
 * 자식 사건 노출 후 밀도가 늘어 3→4로 row 한도 확장. ROW_DELTA(20)·COMPACT 높이는
 * 4 row가 LANE_HEIGHT(88) 안에 막대 사이 간격 ≥4px 유지하도록 조정.
 *  - 4 row 총 span = 3 × 20 = 60. 막대 critical=12 양 끝에 6px씩 → 총 72 < 88 OK.
 */
const MAX_BAR_ROWS = 4
const ROW_DELTA = 20
const COMPACT_BAR_HEIGHT: Record<BarData['importance'], number> = {
  critical: 12,
  major: 10,
  notable: 8,
  normal: 8,
}

/** Milestone 다이아몬드 반지름 — importance에 따라 차등 (critical 7 / major 6 / 그 외 5) */
const MILESTONE_RADIUS: Record<BarData['importance'], number> = {
  critical: 7,
  major: 6,
  notable: 5,
  normal: 5,
}
/** Cluster 다이아몬드 — importance와 무관, 묶음 표시용으로 약간 큼 */
const CLUSTER_RADIUS = 8
/**
 * 외부 라벨 최소 폭 — 이 값 미만이면 표시 자체를 보류.
 * CJK 한 글자 = 12px라 *의미 있는 표시 단위*는 3글자+ellipsis(≈ 40px) 이상.
 * 이전 24px은 한 글자만 잘리고 "…"가 붙는 무의미 라벨이 나와 시선 노이즈였음.
 */
const EXT_LABEL_MIN_WIDTH = 24

/**
 * Bar 안 라벨 표시 최소 폭. 이전 70 → 80으로 상향:
 *  - 라벨 내부 패딩(12~18px)을 빼면 실제 글자 영역이 ~58px → CJK 4자 한계,
 *    truncation이 거의 항상 발동되어 "이름…"으로 잘림.
 *  - 80px 이면 글자 영역 ≥ 62px → 5자 + ellipsis까지 안전.
 *  - 임계값 근처에서 zoom 시 inside↔outside 라벨 깜빡임도 자연 감소.
 */
const BAR_INSIDE_LABEL_MIN_PX = 80

// ─────────────────────────────────────────────────────────────────────────────
// RenderItem 타입 — 컴포넌트 외부 hoist (가독성)
// ─────────────────────────────────────────────────────────────────────────────

type RenderBar = {
  kind: 'bar'
  id: string
  bar: BarData
  x: number
  y: number
  w: number
  h: number
  showExternalLabel: boolean
  externalLabelWidth: number
  /** 0 = 막대 중앙(기본), 1 = 아래, 2 = 위, 3 = 더 아래 — 4-row staggering 시 충돌 회피 */
  labelRow: 0 | 1 | 2 | 3
}
type RenderMilestone = {
  kind: 'milestone'
  id: string
  bar: BarData
  cx: number
  cy: number
  r: number
  showExternalLabel: boolean
  externalLabelWidth: number
  labelRow: 0 | 1 | 2 | 3
}
type RenderCluster = {
  kind: 'cluster'
  id: string
  bars: BarData[]
  cx: number
  cy: number
  r: number
  /** cluster 시기 범위 — fit-to-cluster 줌에 사용 */
  startYear: number
  endYear: number
  centerYear: number
  category: string
  showExternalLabel: boolean
  externalLabelWidth: number
  labelRow: 0 | 1 | 2 | 3
}
type RenderItem = RenderBar | RenderMilestone | RenderCluster

const IMPORTANCE_LABEL: Record<BarData['importance'], string> = {
  critical: '핵심',
  major: '주요',
  notable: '주목',
  normal: '일반',
}

/**
 * 카테고리 lane 순서 — DB의 EventCategory와 동기화된 LEDGER_CATEGORY(한글 키)
 * 기준. 이전엔 'military'/'political' 같은 영문 슬러그였는데, 실제 데이터의
 * `event.category`는 한글 이름('정치'/'전쟁/군사' 등)이라 매칭이 전혀 되지
 * 않아 모든 사건이 "기타"로 떨어지던 버그가 있었음.
 */
const KNOWN_CATEGORIES = Object.keys(LEDGER_CATEGORY) as Array<
  keyof typeof LEDGER_CATEGORY
>

/** 한글 카테고리 이름 → 색상(배지·바·milestone 공통). */
const categoryColor = (name: string): string => resolveCategory(name).color

/**
 * 글자 폭 가중치 — 라벨 font-size 10.5px·weight 600 기준 측정.
 * 이전엔 CJK 12px로 *과대* 잡아 truncation이 실제보다 1~2자 더 잘랐다.
 * 10.5로 낮춰 같은 막대 폭에 평균 1자 더 표시 → 의미 있는 글자 수 확보.
 */
const CJK_CHAR_PX = 10.5
const ASCII_CHAR_PX = 6
const CJK_RE = /[ㄱ-힣一-鿿]/

// ─────────────────────────────────────────────────────────────────────────────
// component
// ─────────────────────────────────────────────────────────────────────────────

export const EventTimeline: React.FC<EventTimelineProps> = ({
  flattenedHierarchy,
  events,
  selectedEventId,
  dbCategories,
  continents = [],
  countries = [],
  onSelectEvent,
  hasMore = false,
  isFetchingMore = false,
  onLoadMore,
  isLoading = false,
}) => {
  /**
   * lane 그룹 축. UI segmented control이 토글. category가 기본(기존 동작 유지).
   * 변경 시 lane 폭발(국가 모드)에 대비해 별도 cap을 lanes useMemo에서 적용.
   */
  const [groupBy, setGroupBy] = useState<GroupBy>('category')
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const tooltipIdRef = useRef(`tl-tooltip-${Math.random().toString(36).slice(2, 9)}`)
  /**
   * ScrollHost는 bars.length>0 일 때만 렌더되므로 단순 useRef + useEffect로
   * ResizeObserver를 한 번만 붙이면 첫 마운트 때 ref가 null이라 영원히 미동작.
   * (events 비동기 로딩 → 처음엔 EmptyHint 렌더 → 후에 ScrollHost로 교체되지만
   *  useEffect는 [] deps라 다시 실행 X). callback ref로 ScrollHost가 DOM에 들어
   * 올 때마다 (재)attach 하도록 만든다. tab 전환 후 데이터가 보이던 증상의 원인.
   */
  const observerRef = useRef<ResizeObserver | null>(null)
  const attachScrollHost = useCallback((el: HTMLDivElement | null) => {
    observerRef.current?.disconnect()
    observerRef.current = null
    scrollRef.current = el
    if (!el) {
      setContainerSize({ width: 0, height: 0 })
      return
    }
    const obs = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect
      if (r) setContainerSize({ width: r.width, height: r.height })
    })
    obs.observe(el)
    observerRef.current = obs
  }, [])

  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    bar: BarData
    /** cluster hover 시 — 묶인 사건들의 제목 미리보기 + 총 개수. 단일 막대면 undefined. */
    cluster?: { titles: string[]; count: number }
  } | null>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [zoom, setZoom] = useState(1)
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  /**
   * 레일 ↔ 막대 hover 동기화. 레일 행에 hover하면 그 사건 막대만 남기고 나머지를
   * dim(기존 메커니즘 재사용)해 "목록의 이 사건이 타임라인 어디인지" 즉시 짚어준다.
   * 반대로 막대에 hover하면 레일에서 같은 행이 강조됨.
   */
  const [hoveredBarId, setHoveredBarId] = useState<string | null>(null)
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set())
  const [exportOpen, setExportOpen] = useState(false)
  /** 모양(다이아·네모·wedge) 의미 설명 popover */
  const [shapeLegendOpen, setShapeLegendOpen] = useState(false)
  /** Zoom % 드롭다운 — 프리셋(50/75/100/150/200/400/800/1600%) 선택 */
  const [zoomMenuOpen, setZoomMenuOpen] = useState(false)
  /**
   * 핀(pin)된 라벨 set — 사용자가 *Shift+클릭*한 막대들. 자동 라벨 conflict 무관하게 항상 표시.
   * 일반 클릭은 사건 선택, Shift+클릭은 라벨 토글이라 두 행동을 분리.
   */
  const [pinnedLabelIds, setPinnedLabelIds] = useState<Set<string>>(new Set())
  const togglePinnedLabel = useCallback((id: string) => {
    setPinnedLabelIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])
  const [focusedBarId, setFocusedBarId] = useState<string | null>(null)
  /** Bar에 포커스 있을 때 Space는 선택. 그 외엔 panning 토글로 사용. */
  const [spaceHeld, setSpaceHeld] = useState(false)
  /** prefers-reduced-motion 감지 — smooth scroll 분기 */
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  /**
   * 전체 페이지 점진 로드 — 타임라인은 전 시대를 한눈에 보여주는 뷰라 첫 페이지(100건)만
   * 있으면 "어떤 사건이 있나"가 구조적으로 안 보인다. hasMore인 동안 다음 페이지를 자동 요청.
   * onLoadMore 내부 가드(중복 fetch 방지)가 있어 deps에서 제외하고 ref로 최신값만 호출.
   */
  const onLoadMoreRef = useRef(onLoadMore)
  onLoadMoreRef.current = onLoadMore
  useEffect(() => {
    if (hasMore && !isFetchingMore) onLoadMoreRef.current?.()
  }, [hasMore, isFetchingMore])

  /** 첫 진입 onboarding 코치마크 — localStorage 기반 1회만 노출.
   * SSR 안전(window 가드) + 사용자가 닫으면 다시 안 뜸. */
  const ONBOARDING_KEY = 'papyrus.timeline.onboarding.v1'
  const [showOnboarding, setShowOnboarding] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (!window.localStorage.getItem(ONBOARDING_KEY)) {
        setShowOnboarding(true)
      }
    } catch {
      /* storage disabled — onboarding 생략 */
    }
  }, [])
  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false)
    try {
      window.localStorage.setItem(ONBOARDING_KEY, '1')
    } catch {
      /* noop */
    }
  }, [])

  /* ── 컨테이너 크기 측정 ────────────────────────────────────────────────
   * ScrollHost가 DOM에 들어올 때 callback ref(`attachScrollHost`)에서 ResizeObserver
   * 를 (재)attach 하므로 별도 useEffect 불필요.
   * (이전 useEffect는 첫 마운트 시 ScrollHost가 EmptyHint로 가려져 ref=null이었던
   *  경우 다시 실행되지 않아 containerSize가 영원히 0인 버그가 있었음.)
   */

  /**
   * country.id → continent.name 매핑 (lane 라벨에 한글 대륙명을 직접 쓰기 위해
   * id가 아닌 name으로 키잉). country.id → 국가명/플래그 lookup도 함께.
   */
  const countryLaneInfo = useMemo(() => {
    const continentNameById = new Map<string, string>()
    for (const c of continents) continentNameById.set(c.id, c.name)
    const countryToContinentName = new Map<string, string>()
    const countryToLabel = new Map<string, string>()
    for (const c of countries) {
      if (c.continentId) {
        const contName = continentNameById.get(c.continentId)
        if (contName) countryToContinentName.set(c.id, contName)
      }
      countryToLabel.set(c.id, c.flagEmoji ? `${c.flagEmoji} ${c.name}` : c.name)
    }
    return { countryToContinentName, countryToLabel }
  }, [continents, countries])

  // ── 막대 데이터 추출 ───────────────────────────────────────────────────
  const allBars = useMemo<BarData[]>(() => {
    const out: BarData[] = []
    const eventById = new Map(events.map((e) => [e.id, e]))

    for (const item of flattenedHierarchy) {
      // 자식 사건도 동등하게 표시 — 자식도 자기 시점·기간·중요도를 가진 독립 사건.
      // 같은 lane에서 row stacking이 부모/자식 시각 분리 처리.
      const node = item.node
      const root = eventById.get(node.id) ?? item.parentEvent
      if (!root) continue
      const startStr = node.period.start
      const endStr = node.period.end
      if (!startStr) continue
      const start = new Date(startStr)
      const end = endStr ? new Date(endStr) : start
      const startYear =
        start.getFullYear() + (start.getMonth() + start.getDate() / 31) / 12
      const endYear =
        end.getFullYear() + (end.getMonth() + end.getDate() / 31) / 12
      const importance = (node.importance as BarData['importance']) ?? 'normal'
      const category = root.category || 'other'

      /**
       * lane 멤버십 — groupBy에 따라 분기. *대표 국가 1개*만 선정해 단일 lane에
       * 배치한다 (이전 multi-lane 복제는 시각 노이즈 + 카운트 inflation 문제).
       *
       *  - category: 색-lane 1:1 동일 (기존)
       *  - continent: 대표 국가의 대륙 1개. 미해결 = 기타.
       *  - country: 대표 국가 1개. 역사적 국가는 v1 lane 키만 노출(continentId 부재).
       */
      let laneKeys: string[]
      if (groupBy === 'continent') {
        const primary = pickPrimaryByRole(root.relatedCountries)
        const contName = primary
          ? countryLaneInfo.countryToContinentName.get(primary.id)
          : undefined
        laneKeys = [contName ?? UNCATEGORIZED_LANE]
      } else if (groupBy === 'country') {
        const primary = pickPrimaryByRole(root.relatedCountries)
        if (primary) {
          const label = countryLaneInfo.countryToLabel.get(primary.id) ?? primary.name
          laneKeys = [label]
        } else {
          // 현대 국가 없음 → 역사적 국가 대표라도
          const histPrimary = pickPrimaryByRole(root.relatedHistoricalCountries)
          laneKeys = [histPrimary ? histPrimary.name : UNCATEGORIZED_LANE]
        }
      } else {
        laneKeys = [category]
      }

      out.push({
        id: node.id,
        title: node.title,
        category,
        importance,
        startYear,
        endYear: Math.max(endYear, startYear),
        startDate: startStr,
        endDate: endStr ?? null,
        laneKeys,
        depth: item.depth,
      })
    }
    return out
  }, [flattenedHierarchy, events, groupBy, countryLaneInfo])

  /** 사용자가 legend로 hide한 카테고리는 막대/lane에서 제외 */
  const bars = useMemo(
    () => allBars.filter((b) => !hiddenCategories.has(b.category)),
    [allBars, hiddenCategories],
  )

  // ── 시간 범위 ───────────────────────────────────────────────────────────
  const { minYear, maxYear } = useMemo(() => {
    if (bars.length === 0) {
      const now = new Date().getFullYear()
      return { minYear: now - 10, maxYear: now }
    }
    let min = Infinity
    let max = -Infinity
    for (const b of bars) {
      if (b.startYear < min) min = b.startYear
      if (b.endYear > max) max = b.endYear
    }
    return { minYear: Math.floor(min - 1), maxYear: Math.ceil(max + 1) }
  }, [bars])

  const yearSpan = Math.max(1, maxYear - minYear)

  /** 데이터/범위 변경 시 zoom 자동 reset — 50년 → 1000년 등 큰 변화 후 압축 방지 */
  const prevSpanRef = useRef<number>(yearSpan)
  useEffect(() => {
    const prev = prevSpanRef.current
    // 2배 이상 변하면 reset
    if (prev > 0 && (yearSpan / prev > 2 || prev / yearSpan > 2)) {
      setZoom(1)
    }
    prevSpanRef.current = yearSpan
  }, [yearSpan])

  // ── 픽셀/연 환산 — fit-to-width × zoom (helper로 공유) ─────────────────
  const renderReady = containerSize.width > 0
  const computePxPerYear = useCallback(
    (forZoom: number, forSpan: number = yearSpan): number => {
      /**
       * fit-to-width 시 SVG 우측에 ExternalLabel(최대 EXT_LABEL_MAX_WIDTH+16)이
       * 위치할 공간을 추가로 비워둬야 마지막 데이터의 라벨이 잘리지 않으면서도
       * zoom=1 상태에서 가로 스크롤이 생기지 않는다.
       */
      const innerWidth = Math.max(
        0,
        containerSize.width - LANE_LABEL_WIDTH - 16 - (EXT_LABEL_MAX_WIDTH + 16),
      )
      const fit = innerWidth > 0 ? innerWidth / forSpan : PIXELS_PER_YEAR_DEFAULT
      const base = Math.max(fit, PIXELS_PER_YEAR_DEFAULT * 0.5)
      return base * forZoom
    },
    [containerSize.width, yearSpan],
  )
  const pixelsPerYear = useMemo(
    () => (renderReady ? computePxPerYear(zoom) : PIXELS_PER_YEAR_DEFAULT),
    [computePxPerYear, zoom, renderReady],
  )
  const timelineWidth = Math.ceil(yearSpan * pixelsPerYear)

  // ── 레인 ────────────────────────────────────────────────────────────────
  /**
   * lane key/label — groupBy 모드별 분기.
   *  - category: KNOWN_CATEGORIES(LEDGER_CATEGORY) 순서, 데이터-only 카테고리 append
   *  - continent: 데이터에서 등장한 대륙 + 기타 (continents 참조 데이터 순서 우선)
   *  - country: 등장 빈도 desc, 동률은 가나다, 상위 N개 + 기타. 폭발 방지.
   *
   * 모든 모드에서 *데이터에 등장한 적 없는* 빈 lane은 표시 X.
   */
  const COUNTRY_LANE_CAP = 25
  const lanes = useMemo<{ key: string; label: string }[]>(() => {
    if (groupBy === 'category') {
      const present = new Set(allBars.map((b) => b.category))
      const ordered: { key: string; label: string }[] = []
      const seen = new Set<string>()
      for (const name of KNOWN_CATEGORIES) {
        ordered.push({ key: name, label: name })
        seen.add(name)
      }
      for (const c of present) {
        if (seen.has(c)) continue
        ordered.push({
          key: c,
          label: dbCategories.find((d) => d.name === c)?.name ?? c,
        })
        seen.add(c)
      }
      return ordered
    }

    // continent / country 공통: 등장한 lane key를 빈도/사전 순으로 정렬
    const counts = new Map<string, number>()
    for (const b of allBars) {
      for (const k of b.laneKeys) {
        counts.set(k, (counts.get(k) ?? 0) + 1)
      }
    }

    if (groupBy === 'continent') {
      const present = new Set(counts.keys())
      const ordered: { key: string; label: string }[] = []
      const seen = new Set<string>()
      // 참조 데이터 순서를 우선 (관리자가 정의한 순서를 존중)
      for (const c of continents) {
        if (present.has(c.name)) {
          ordered.push({ key: c.name, label: c.name })
          seen.add(c.name)
        }
      }
      // 데이터에만 있는 / 미등록 lane (UNCATEGORIZED 포함) 뒤에 append
      for (const k of present) {
        if (seen.has(k)) continue
        if (k === UNCATEGORIZED_LANE) continue
        ordered.push({ key: k, label: k })
        seen.add(k)
      }
      if (present.has(UNCATEGORIZED_LANE)) {
        ordered.push({ key: UNCATEGORIZED_LANE, label: UNCATEGORIZED_LANE })
      }
      return ordered
    }

    // country — count desc, tiebreak alphabetical (locale 'ko')
    const sorted = Array.from(counts.entries())
      .filter(([k]) => k !== UNCATEGORIZED_LANE)
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1]
        return a[0].localeCompare(b[0], 'ko')
      })
    const top = sorted.slice(0, COUNTRY_LANE_CAP)
    const ordered: { key: string; label: string }[] = top.map(([k]) => ({
      key: k,
      label: k,
    }))
    const overflowed = sorted.length > COUNTRY_LANE_CAP
    if (overflowed || counts.has(UNCATEGORIZED_LANE)) {
      ordered.push({
        key: UNCATEGORIZED_LANE,
        label: overflowed
          ? `${UNCATEGORIZED_LANE} (그 외 ${sorted.length - COUNTRY_LANE_CAP}개국)`
          : UNCATEGORIZED_LANE,
      })
    }
    return ordered
  }, [groupBy, allBars, dbCategories, continents])

  /** legend로 숨기지 않은 lane만 그리기 */
  const visibleLanes = useMemo(
    () => lanes.filter((l) => !hiddenCategories.has(l.key)),
    [lanes, hiddenCategories],
  )

  const laneIndex = useMemo(() => {
    const m = new Map<string, number>()
    visibleLanes.forEach((l, i) => m.set(l.key, i))
    return m
  }, [visibleLanes])

  const intrinsicHeight =
    TOP_AXIS_HEIGHT + visibleLanes.length * LANE_HEIGHT + TIMELINE_BOTTOM_PAD
  const totalHeight = Math.max(intrinsicHeight, containerSize.height)

  /**
   * SVG 우측 padding — 마지막 bar/milestone에 붙는 외부 라벨(ExternalLabel)이
   * 최대 EXT_LABEL_MAX_WIDTH(220) + 8(gap)만큼 bar 오른쪽으로 뻗어나가는데,
   * SVG width를 timelineWidth로만 잡으면 그 라벨이 우측에서 잘린다. 약간의
   * 여유를 두어 마지막 데이터의 라벨까지 모두 보이도록 한다.
   */
  const RIGHT_LABEL_PAD = EXT_LABEL_MAX_WIDTH + 16
  const svgWidth = LANE_LABEL_WIDTH + timelineWidth + RIGHT_LABEL_PAD

  // ── 연도 눈금 ───────────────────────────────────────────────────────────
  const ticks = useMemo(() => {
    let step = 1
    const px = pixelsPerYear
    if (px < 4) step = 50
    else if (px < 8) step = 20
    else if (px < 16) step = 10
    else if (px < 30) step = 5
    else step = 1

    const out: number[] = []
    const start = Math.ceil(minYear / step) * step
    const MAX_TICKS = 200
    let count = 0
    for (let y = start; y <= maxYear && count < MAX_TICKS; y += step) {
      out.push(y)
      count++
    }
    return out
  }, [minYear, maxYear, pixelsPerYear])

  // ── 10년 sparkline ──────────────────────────────────────────────────────
  /**
   * decade별 카테고리 분포까지 같이 집계 — minimap stacked bar 렌더용.
   * 이전엔 단일 count/weight만 모아 단색 막대였는데, 카테고리 분포가 보이지 않아
   * "어느 시기에 어떤 카테고리가 많은지" 한눈에 못 봄. byCategory를 같이 들고
   * 가서 시간×카테고리 2D 정보를 미니맵에 응축한다.
   */
  type DecadeBucket = {
    decade: number
    count: number
    weight: number
    byCategory: Map<string, number>
  }
  const decadeBuckets = useMemo<DecadeBucket[]>(() => {
    const map = new Map<
      number,
      { count: number; weight: number; byCategory: Map<string, number> }
    >()
    for (const b of bars) {
      const decade = Math.floor(b.startYear / 10) * 10
      let cur = map.get(decade)
      if (!cur) {
        cur = { count: 0, weight: 0, byCategory: new Map() }
        map.set(decade, cur)
      }
      cur.count += 1
      cur.weight +=
        b.importance === 'critical' ? 3 : b.importance === 'major' ? 2 : 1
      cur.byCategory.set(
        b.category,
        (cur.byCategory.get(b.category) ?? 0) + 1,
      )
    }
    const startDecade = Math.floor(minYear / 10) * 10
    const endDecade = Math.ceil(maxYear / 10) * 10
    const out: DecadeBucket[] = []
    for (let d = startDecade; d <= endDecade; d += 10) {
      const cur = map.get(d) ?? {
        count: 0,
        weight: 0,
        byCategory: new Map<string, number>(),
      }
      out.push({ decade: d, ...cur })
    }
    return out
  }, [bars, minYear, maxYear])

  const maxBucketWeight = useMemo(
    () => Math.max(1, ...decadeBuckets.map((b) => b.weight)),
    [decadeBuckets],
  )

  const labelStep = useMemo<1 | 2 | 5>(() => {
    if (decadeBuckets.length <= 6) return 1
    if (decadeBuckets.length <= 14) return 2
    return 5
  }, [decadeBuckets.length])

  // ── viewport years + scrollLeft 추적 (raf throttle) ─────────────────────
  const [viewportYears, setViewportYears] = useState<{ start: number; end: number } | null>(null)
  /** lane 라벨 sticky용 — SVG 내부 `<g translate(scrollLeft, 0)>`로 좌측 고정 */
  const [scrollLeft, setScrollLeft] = useState(0)
  const rafIdRef = useRef<number | null>(null)
  const updateViewport = useCallback(() => {
    if (rafIdRef.current != null) return
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null
      const el = scrollRef.current
      if (!el) return
      const visibleLeft = Math.max(0, el.scrollLeft - LANE_LABEL_WIDTH)
      const visibleRight = el.scrollLeft + el.clientWidth - LANE_LABEL_WIDTH
      const start = visibleLeft / pixelsPerYear + minYear
      const end = visibleRight / pixelsPerYear + minYear
      setViewportYears({
        start: Math.max(minYear, start),
        end: Math.min(maxYear, end),
      })
      setScrollLeft(el.scrollLeft)
    })
  }, [pixelsPerYear, minYear, maxYear])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateViewport()
    el.addEventListener('scroll', updateViewport, { passive: true })
    return () => {
      el.removeEventListener('scroll', updateViewport)
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current)
    }
  }, [updateViewport, containerSize.width])

  // ── 휠 — Ctrl/⌘+휠은 줌, 그 외엔 deltaY를 가로 스크롤로 변환 ───────────────
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      const el = scrollRef.current
      if (!el) return

      // Ctrl/Meta + 휠 → 줌
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const rect = el.getBoundingClientRect()
        const pointerX = e.clientX - rect.left
        const pointerInTimeline = Math.max(0, pointerX - LANE_LABEL_WIDTH)
        const yearAtPointer =
          (el.scrollLeft + pointerInTimeline) / pixelsPerYear + minYear

        const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP
        const nextZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * factor))
        if (nextZoom === zoom) return

        setZoom(nextZoom)
        requestAnimationFrame(() => {
          const el2 = scrollRef.current
          if (!el2) return
          const newPx = computePxPerYear(nextZoom)
          const newScrollLeft =
            (yearAtPointer - minYear) * newPx - pointerInTimeline
          el2.scrollLeft = Math.max(0, newScrollLeft)
        })
        return
      }

      /**
       * 일반 휠 → 가로 스크롤. 타임라인은 수평 흐름이 주축이라 마우스 휠을 가로로 흐르게 한다.
       *  - Shift+휠 / 트랙패드 가로 swipe(deltaX 우세) → 브라우저 네이티브에 맡김
       *  - 가로 overflow가 없으면(전체가 viewport에 fit) 가로 변환 의미 없음 — 패스
       *
       * [트랩 수정] 이전엔 "세로 overflow가 있으면 세로 우선"이라, lane이 많아 세로 스크롤이
       * 생기는 (흔한) 상황에서 휠로 가로 이동이 *완전히 막혔다*. 대신 **가로를 우선**하되,
       * 가로 끝(좌/우)에 도달했고 세로 여백이 남았을 때만 세로로 양보 → 끝까지 가로로 훑은 뒤
       * 자연스럽게 세로 스크롤로 넘어간다.
       */
      if (e.shiftKey) return
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      if (e.deltaY === 0) return

      const hasHScroll = el.scrollWidth > el.clientWidth + 1
      const hasVScroll = el.scrollHeight > el.clientHeight + 1
      if (!hasHScroll) return

      const goingRight = e.deltaY > 0
      const atLeftEdge = el.scrollLeft <= 0
      const atRightEdge =
        el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
      const wouldOverscroll =
        (goingRight && atRightEdge) || (!goingRight && atLeftEdge)
      if (wouldOverscroll && hasVScroll) return // 가로 끝 → 세로 스크롤 양보

      e.preventDefault()
      el.scrollLeft += e.deltaY
    },
    [zoom, pixelsPerYear, minYear, computePxPerYear],
  )

  const zoomBy = (factor: number) => {
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z * factor)))
  }

  /**
   * 터치 핀치 줌 + 한 손가락 패닝 — 모바일/태블릿 지원.
   *
   * 기존 wheel/space-drag/middle-click은 데스크탑 전용. 터치 환경에서는 *완전히 작동 X*.
   * 이 effect로 scrollRef에 직접 listener를 붙여:
   *   - pointerType==='touch'만 가로채고 (마우스는 wheel/drag 경로 그대로)
   *   - 1 pointer  → 가로 패닝(scrollLeft delta)
   *   - 2 pointer  → 핀치 줌(거리 비율로 zoom 배율)
   *
   * touchAction을 none으로 두어 OS의 default 줌·새로고침 제스처 차단.
   */
  useEffect(() => {
    const host = scrollRef.current
    if (!host) return undefined
    const pointers = new Map<
      number,
      { x: number; y: number; clientX: number; clientY: number }
    >()
    let lastSingleX: number | null = null
    let initialPinchDistance = 0
    let initialZoom = 1

    const distanceOf = () => {
      const arr = Array.from(pointers.values())
      if (arr.length < 2) return 0
      const dx = arr[0].clientX - arr[1].clientX
      const dy = arr[0].clientY - arr[1].clientY
      return Math.hypot(dx, dy)
    }

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      pointers.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        clientX: e.clientX,
        clientY: e.clientY,
      })
      if (pointers.size === 1) {
        lastSingleX = e.clientX
      } else if (pointers.size === 2) {
        initialPinchDistance = distanceOf()
        initialZoom = zoom
        lastSingleX = null // 핀치 모드 진입 — single pan 중지
      }
      ;(e.target as Element).setPointerCapture?.(e.pointerId)
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      if (!pointers.has(e.pointerId)) return
      const prev = pointers.get(e.pointerId)!
      pointers.set(e.pointerId, {
        x: prev.x,
        y: prev.y,
        clientX: e.clientX,
        clientY: e.clientY,
      })

      if (pointers.size === 1 && lastSingleX != null) {
        // 한 손가락 — 패닝
        const dx = e.clientX - lastSingleX
        host.scrollLeft -= dx
        lastSingleX = e.clientX
      } else if (pointers.size >= 2 && initialPinchDistance > 0) {
        // 핀치 — 거리 비율을 zoom 배율로
        const cur = distanceOf()
        if (cur > 0) {
          const ratio = cur / initialPinchDistance
          const targetZoom = Math.min(
            ZOOM_MAX,
            Math.max(ZOOM_MIN, initialZoom * ratio),
          )
          setZoom(targetZoom)
        }
      }
    }

    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      pointers.delete(e.pointerId)
      if (pointers.size < 2) {
        initialPinchDistance = 0
        // 한 손가락 남았으면 그 위치를 기준으로 다시 pan 시작
        const remaining = Array.from(pointers.values())[0]
        lastSingleX = remaining ? remaining.clientX : null
      }
    }

    host.addEventListener('pointerdown', onDown, { passive: true })
    host.addEventListener('pointermove', onMove, { passive: true })
    host.addEventListener('pointerup', onUp, { passive: true })
    host.addEventListener('pointercancel', onUp, { passive: true })
    host.addEventListener('pointerleave', onUp, { passive: true })

    return () => {
      host.removeEventListener('pointerdown', onDown)
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerup', onUp)
      host.removeEventListener('pointercancel', onUp)
      host.removeEventListener('pointerleave', onUp)
    }
    // zoom 의존: pinch 시작 시점의 initialZoom을 최신화. 매 down에서 캡처하므로 OK
  }, [zoom])
  const resetZoom = () => setZoom(1)

  /**
   * Fit-all — 모든 사건이 한 화면에 들어가는 zoom으로.
   * computePxPerYear가 floor(fit, PIXELS_PER_YEAR_DEFAULT*0.5)를 base로 쓰므로
   * 데이터 span이 좁으면 zoom=1로 이미 fit. span이 매우 넓으면 zoom<1 필요.
   */
  const fitAll = useCallback(() => {
    const innerWidth = Math.max(
      0,
      containerSize.width - LANE_LABEL_WIDTH - 16 - (EXT_LABEL_MAX_WIDTH + 16),
    )
    if (innerWidth <= 0 || yearSpan <= 0) return
    const targetPxPerYear = innerWidth / yearSpan
    const base = Math.max(targetPxPerYear, PIXELS_PER_YEAR_DEFAULT * 0.5)
    const targetZoom = targetPxPerYear / base
    setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, targetZoom)))
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollLeft = 0
    })
  }, [containerSize.width, yearSpan])

  /**
   * 첫 진입 framing — 1회만.
   *
   * 기존 마운트 동작은 zoom=1(= 전 구간을 화면폭에 압축) + scrollLeft 0 이라, 사건이
   * 빽빽이 뭉쳐 라벨이 거의 안 보이는 *최악의 가독성*으로 시작했다. 대신:
   *   1) 전체를 화면폭의 ~2.5배로 펼치는 줌으로 시작(라벨 들어갈 여백 확보, 최대 6×)
   *   2) 가장 밀집한 10년 구간을 화면 중앙에 — "사건이 많은 곳"을 첫 화면으로
   *
   * 점진 로드(onLoadMore)로 span이 출렁이는 동안엔 보류하고, 전부 로드돼 span이 안정된
   * 뒤(또는 페이지네이션이 없을 때) 한 번만 적용 — 로딩 중 reset(>2×)과의 경합 회피.
   */
  const INITIAL_VIEW_WIDTH_FACTOR = 2.5
  const didInitialViewRef = useRef(false)
  useEffect(() => {
    if (didInitialViewRef.current) return
    if (!renderReady || bars.length === 0) return
    if (hasMore || isFetchingMore) return
    const innerWidth = Math.max(
      0,
      containerSize.width - LANE_LABEL_WIDTH - 16 - (EXT_LABEL_MAX_WIDTH + 16),
    )
    if (innerWidth <= 0 || yearSpan <= 0) return
    didInitialViewRef.current = true

    const fitPxPerYear = innerWidth / yearSpan
    const base = Math.max(fitPxPerYear, PIXELS_PER_YEAR_DEFAULT * 0.5)
    const desiredPxPerYear = (innerWidth * INITIAL_VIEW_WIDTH_FACTOR) / yearSpan
    const targetZoom = Math.min(6, Math.max(1, desiredPxPerYear / base))
    setZoom(targetZoom)

    const densest = decadeBuckets.reduce(
      (best, b) => (b.weight > best.weight ? b : best),
      decadeBuckets[0],
    )
    const px = computePxPerYear(targetZoom)
    requestAnimationFrame(() => {
      const el = scrollRef.current
      if (!el || !densest) return
      const centerX = (densest.decade + 5 - minYear) * px
      el.scrollLeft = Math.max(
        0,
        centerX - el.clientWidth / 2 + LANE_LABEL_WIDTH,
      )
    })
  }, [
    renderReady,
    bars.length,
    hasMore,
    isFetchingMore,
    yearSpan,
    containerSize.width,
    decadeBuckets,
    minYear,
    computePxPerYear,
  ])

  // ── 드래그 패닝 (Space+드래그 또는 미들 버튼) ──────────────────────────
  const dragStateRef = useRef<{ startX: number; startScrollLeft: number } | null>(null)
  /** Bar에 포커스 있으면 Space는 panning 토글이 아닌 *선택*용으로 동작.
   *  여기서 일찍 return하면 spaceHeld가 켜지지 않아 충돌 회피. */
  const isBarFocused = focusedBarId != null

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Space: panning 모드 진입(Bar focus 시 *선택*용으로 양보).
      if (e.key === ' ') {
        if (isInEditableElement(e.target)) return
        if (isBarFocused) return
        e.preventDefault()
        setSpaceHeld(true)
        return
      }
      // 줌 단축키 — `=`/`+` 줌 인, `-`/`_` 줌 아웃, `0` 리셋. 입력창에서는 비활성.
      if (isInEditableElement(e.target)) return
      // 마우스/터치 없는 사용자도 줌 가능하도록 timeline 영역 hover/focus 여부 무관 적용.
      // Cmd/Ctrl 조합은 OS 단축키와 충돌하므로 plain key만 받음.
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '=' || e.key === '+') {
        e.preventDefault()
        zoomBy(ZOOM_STEP)
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        zoomBy(1 / ZOOM_STEP)
      } else if (e.key === '0') {
        e.preventDefault()
        resetZoom()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') setSpaceHeld(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [isBarFocused])

  /** 창 blur / visibility 변경 → drag 종료 + cursor 복원 (잃어버린 mouseup 방어) */
  useEffect(() => {
    const cleanup = () => {
      if (dragStateRef.current) {
        dragStateRef.current = null
        document.body.style.cursor = ''
      }
      setSpaceHeld(false)
    }
    window.addEventListener('blur', cleanup)
    document.addEventListener('visibilitychange', cleanup)
    return () => {
      window.removeEventListener('blur', cleanup)
      document.removeEventListener('visibilitychange', cleanup)
    }
  }, [])

  const handlePanMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const isMiddle = e.button === 1
    const isSpaceLeft = e.button === 0 && spaceHeld
    if (!isMiddle && !isSpaceLeft) return
    e.preventDefault()
    const el = scrollRef.current
    if (!el) return
    dragStateRef.current = { startX: e.clientX, startScrollLeft: el.scrollLeft }
    document.body.style.cursor = 'grabbing'
  }

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const drag = dragStateRef.current
      if (!drag) return
      const el = scrollRef.current
      if (!el) return
      el.scrollLeft = drag.startScrollLeft - (e.clientX - drag.startX)
    }
    const onMouseUp = () => {
      if (dragStateRef.current) {
        dragStateRef.current = null
        document.body.style.cursor = ''
      }
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  // ── 호버/포커스 툴팁 + 4면 clamp ─────────────────────────────────────────
  const TOOLTIP_W = 280
  const TOOLTIP_H = 70
  const showTooltip = useCallback((
    target: SVGGraphicsElement,
    bar: BarData,
    cluster?: { titles: string[]; count: number },
  ) => {
    const host = scrollRef.current
    if (!host) return
    const hostRect = host.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const rawX = targetRect.left + targetRect.width / 2 - hostRect.left
    const rawY = targetRect.top - hostRect.top - 8
    // X: 좌·우 양 끝에서 8px 안전 여백
    const x = Math.max(
      TOOLTIP_W / 2 + 8,
      Math.min(hostRect.width - TOOLTIP_W / 2 - 8, rawX),
    )
    // Y: 위(TOOLTIP_H + 8 이상) + 아래(host 하단 8px 안쪽)도 클램프 — 이전엔 위만
    //    클램프되어 마지막 lane 사건에서 툴팁이 viewport 밖으로 나갔다.
    const y = Math.min(
      Math.max(TOOLTIP_H + 8, rawY),
      Math.max(TOOLTIP_H + 8, hostRect.height - 8),
    )
    setTooltip({ x, y, bar, cluster })
  }, [])
  const hideTooltip = useCallback(() => setTooltip(null), [])

  /**
   * Tooltip 글로벌 dismiss — Escape 키 또는 ScrollHost 바깥 클릭 시 즉시 닫음.
   * 모바일 터치 후 잔존 / 키보드 사용자가 빠져나갈 길이 없던 케이스 보강.
   */
  useEffect(() => {
    if (!tooltip) return undefined
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideTooltip()
    }
    const onPointerDown = (e: PointerEvent) => {
      const host = scrollRef.current
      if (!host) return
      if (e.target instanceof Node && host.contains(e.target)) return
      hideTooltip()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [tooltip, hideTooltip])

  // ── 미니맵 클릭/드래그 brush ────────────────────────────────────────────
  const minimapRef = useRef<HTMLDivElement | null>(null)
  const minimapDragRef = useRef<boolean>(false)

  const yearAtMinimapX = (clientX: number): number | null => {
    const el = minimapRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const ratio = (clientX - rect.left) / rect.width
    const startDecade = Math.floor(minYear / 10) * 10
    const endDecade = Math.ceil(maxYear / 10) * 10
    return startDecade + ratio * (endDecade - startDecade)
  }

  const scrollToYear = useCallback(
    (year: number) => {
      const el = scrollRef.current
      if (!el) return
      const x = (year - minYear) * pixelsPerYear + LANE_LABEL_WIDTH
      el.scrollTo({
        left: Math.max(0, x - el.clientWidth / 2),
        behavior: reducedMotion ? 'auto' : 'smooth',
      })
    },
    [minYear, pixelsPerYear, reducedMotion],
  )

  /**
   * 외부에서 사건 선택 시(예: list/grid에서 클릭 후 timeline 전환) 해당 막대로
   * 자동 스크롤. viewport 안에 이미 있으면 무동작.
   *
   * 의존성: selectedEventId만. minYear/pxPerYear가 안정될 때까지(첫 마운트)는
   *   bars/scrollRef가 비어 있을 수 있어 안전 가드.
   */
  useEffect(() => {
    if (!selectedEventId || !renderReady) return
    const sel = bars.find((b) => b.id === selectedEventId)
    if (!sel) return
    const el = scrollRef.current
    if (!el) return
    const x = (sel.startYear - minYear) * pixelsPerYear + LANE_LABEL_WIDTH
    const left = el.scrollLeft
    const right = left + el.clientWidth
    // 이미 viewport 안 → 스크롤 생략 (사용자 컨텍스트 유지)
    if (x >= left + 80 && x <= right - 80) return
    scrollToYear(sel.startYear)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId, renderReady])

  /**
   * Cluster 활성화 — fit-to-cluster:
   *   1) cluster span을 viewport 폭의 약 60%에 맞도록 zoom 계산
   *   2) ZOOM_MAX 이하로 클램프 (이미 MAX면 그대로)
   *   3) 줌 적용 후 raf 두 번 (state→render→layout) 후 scroll + focus 첫 사건
   */
  /**
   * activatedClusterId — 활성화 직후 ~700ms 동안 클러스터에 펄스 링을 띄워
   * "눌렸다"는 시각 피드백을 준다(특히 이미 zoom이 충분해서 setZoom 무동작인
   * 경우에도 사용자가 인지 가능하도록).
   */
  const [activatedClusterId, setActivatedClusterId] = useState<string | null>(
    null,
  )
  const activatedTimerRef = useRef<number | null>(null)

  const activateCluster = useCallback(
    (cluster: RenderCluster) => {
      // 1) 펄스 피드백 — zoom 변화와 무관하게 항상 발화
      if (activatedTimerRef.current != null) {
        window.clearTimeout(activatedTimerRef.current)
      }
      setActivatedClusterId(cluster.id)
      activatedTimerRef.current = window.setTimeout(() => {
        setActivatedClusterId((prev) => (prev === cluster.id ? null : prev))
        activatedTimerRef.current = null
      }, 700)

      // 2) zoom 계산 — fit-to-cluster (60% viewport 차지)
      const innerWidth = Math.max(0, containerSize.width - LANE_LABEL_WIDTH - 16)
      const span = Math.max(1, cluster.endYear - cluster.startYear)
      const desiredPxPerYear = (innerWidth * 0.6) / span
      const basePxPerYear = computePxPerYear(1)
      const fitZoom =
        basePxPerYear > 0 ? desiredPxPerYear / basePxPerYear : ZOOM_MAX
      const targetZoom = Math.min(ZOOM_MAX, Math.max(zoom, fitZoom))

      /**
       * Zoom 포화 fallback: 이미 zoom이 fit 이상이거나 ZOOM_MAX라 더 풀 수 없으면
       * overflow와 동일한 UX(목록 popover)로 자동 전환. 사용자가 cluster를 반복
       * 클릭해도 변화 없던 막힘 지점 해소.
       */
      if (targetZoom === zoom) {
        setOverflowPopoverLane(null) // overflow popover와 동시 X
        setClusterPopoverId(cluster.id)
        scrollToYear(cluster.centerYear)
        return
      }

      setZoom(targetZoom)

      // 3) 두 번 raf — state 적용 + 다음 프레임 layout 보장 후 scroll/focus
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToYear(cluster.centerYear)
          const firstId = cluster.bars[0].id
          const el = svgRef.current?.querySelector<SVGElement>(
            `[data-bar-id="${firstId}"]`,
          )
          if (el && 'focus' in el) (el as unknown as HTMLElement).focus()
        })
      })
    },
    [containerSize.width, computePxPerYear, zoom, scrollToYear],
  )

  const handleMinimapPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const year = yearAtMinimapX(e.clientX)
    if (year == null) return
    minimapDragRef.current = true
    scrollToYear(year)
  }
  const handleMinimapPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!minimapDragRef.current) return
    const year = yearAtMinimapX(e.clientX)
    if (year == null) return
    scrollToYear(year)
  }
  const endMinimapDrag = () => {
    minimapDragRef.current = false
  }

  /**
   * viewport culling 메모는 더 이상 사용하지 않음 — clustering / external label
   * placement는 *전역 정렬*이라 viewport로 잘라낸 부분 집합으로 계산하면 같은
   * milestone들이 viewport 경계에서 클러스터/싱글로 토글되는 시각 jitter가 생겼다.
   * 또한 viewportYears가 가로 스크롤마다 변해 renderItems 전체가 재계산되며 비용이
   * 컸다. 클러스터링은 한 번만(`bars`/`pixelsPerYear` 변경 시) 수행하고, viewport
   * 가시성은 브라우저 SVG paint 단계에 위임한다(전역 RenderItem은 즉시 위치 계산
   * 결과라 paint 영역 밖이면 자연히 비용 낮음).
   */

  // ── 렌더 파이프라인 — bar / milestone / cluster ─────────────────────────
  /**
   * visibleBars를 *시각 표현 단위*로 변환.
   *
   *   - 의미적 폭 ≥ SHORT_BAR_PX → bar (기존 막대)
   *   - 그 외 → milestone (다이아몬드 점)
   *   - milestone들이 같은 lane × CLUSTER_GAP_PX 이내 CLUSTER_MIN_COUNT개 이상 → cluster
   *
   * 외부 라벨 표시 여부는 *같은 lane 내 다음 아이템과의 거리*로 결정 (그리디 placement).
   */
  /**
   * lane(category) → 시간 정렬된 bar 배열. zoom·viewport 변화에 무관하므로 별도
   * memoize → renderResult에서 매번 sort 안 하도록 분리. (zoom 이벤트 직후
   * renderResult 재계산은 불가피하지만 sort 비용은 회피.)
   */
  const barsSortedByLane = useMemo(() => {
    const byLane = new Map<string, BarData[]>()
    const hasUncat = laneIndex.has(UNCATEGORIZED_LANE)
    for (const b of bars) {
      // valid lane key만 추림. 모두 cap-out이면 UNCATEGORIZED_LANE 폴백(있을 때만).
      const valid = b.laneKeys.filter((k) => laneIndex.has(k))
      const targets = valid.length > 0
        ? valid
        : hasUncat
          ? [UNCATEGORIZED_LANE]
          : []
      for (const k of targets) {
        const arr = byLane.get(k) ?? []
        arr.push(b)
        byLane.set(k, arr)
      }
    }
    for (const [, arr] of byLane) {
      arr.sort((a, b) => a.startYear - b.startYear)
    }
    return byLane
  }, [bars, laneIndex])

  const renderResult = useMemo<{
    items: RenderItem[]
    /** 카테고리(=lane key) → 숨겨진(overflow) bar 개수. 라벨 옆 "+N" 표시용 */
    overflow: Map<string, number>
    /** 카테고리(=lane key) → 숨겨진 bar 객체들. popover에서 목록 표시용 */
    overflowBars: Map<string, BarData[]>
    /** 카테고리 → 사용된 bar row 수 (1~MAX_BAR_ROWS). compact 높이 분기에 사용 */
    laneRows: Map<string, number>
  }>(() => {
    if (!renderReady) {
      return {
        items: [],
        overflow: new Map(),
        overflowBars: new Map(),
        laneRows: new Map(),
      }
    }

    const out: RenderItem[] = []
    const overflowByLane = new Map<string, number>()
    const overflowBarsByLane = new Map<string, BarData[]>()
    const rowsByLane = new Map<string, number>()

    /** 줌별 importance 필터 — 라벨 표시 *허용*하는 최소 importance.
     * 0.85x 이상이면 모든 importance 시도. 충돌은 staggering + conflict resolution이 처리. */
    const minLabelTier = labelImportanceMinTier(zoom)

    for (const [laneKey, arr] of barsSortedByLane) {
      const lane = laneIndex.get(laneKey)
      if (lane == null) continue
      const laneCenter = TOP_AXIS_HEIGHT + lane * LANE_HEIGHT + LANE_HEIGHT / 2

      // 1단계: bar / milestone 분리 + 위치 계산
      type Pre = {
        bar: BarData
        x: number
        w: number
        cx: number
        kind: 'bar' | 'milestone'
      }
      const pre: Pre[] = arr.map((b) => {
        const x = (b.startYear - minYear) * pixelsPerYear
        const w = Math.max(MIN_BAR_WIDTH, (b.endYear - b.startYear) * pixelsPerYear)
        const semanticW = (b.endYear - b.startYear) * pixelsPerYear
        const kind: 'bar' | 'milestone' = semanticW < SHORT_BAR_PX ? 'milestone' : 'bar'
        const cx = kind === 'milestone' ? x + Math.max(2, semanticW / 2) : x
        return { bar: b, x, w, cx, kind }
      })
      // 같은 시작 시각이면 부모(depth 낮음) 먼저 — row 0 우선 선점.
      pre.sort((a, b) => {
        if (a.x !== b.x) return a.x - b.x
        return a.bar.depth - b.bar.depth
      })

      /**
       * 통합 row 할당 — bar/milestone 모두 같은 row 좌표계 공유.
       * 이전엔 milestone이 별도 yOffset(±12, ±22)로 laneCenter 근처에 배치되어
       * bar row 1/2(±10)와 시각적으로 겹치는 케이스가 있었음.
       * 이제 둘 다 동일 ROW_DELTA 간격(20px)에 정렬 → 인접 row끼리 막대 사이 4px 시각 여유 확보.
       *
       * milestone hitbox는 8px 폭(시각 6px + 패딩)으로 잡아 너무 가까운 milestone끼리도 row 분리.
       */
      const barRowOf = new Map<string, number>()
      const hiddenBarIds = new Set<string>()
      const hiddenBarList: BarData[] = []
      const barEndsByRow: number[] = []
      let laneOverflow = 0
      for (const p of pre) {
        // milestone은 점이지만 충돌 회피 hitbox 8px로 처리(시각 6px + 좌우 1px씩 패딩)
        const itemStart = p.kind === 'milestone' ? p.cx - 4 : p.x
        const itemEnd = p.kind === 'milestone' ? p.cx + 4 : p.x + p.w
        let assignedRow = -1
        for (let r = 0; r < barEndsByRow.length; r++) {
          if (barEndsByRow[r] <= itemStart) {
            assignedRow = r
            barEndsByRow[r] = itemEnd
            break
          }
        }
        if (assignedRow === -1) {
          if (barEndsByRow.length < MAX_BAR_ROWS) {
            assignedRow = barEndsByRow.length
            barEndsByRow.push(itemEnd)
          } else {
            // milestone은 cluster 처리 가능하므로 hidden 처리 안 함 — 다음 단계 클러스터링이 흡수.
            // bar는 hidden + overflow.
            if (p.kind === 'bar') {
              hiddenBarIds.add(p.bar.id)
              hiddenBarList.push(p.bar)
              laneOverflow++
              continue
            } else {
              // milestone은 어쩔 수 없이 마지막 row에 강제 배치 (cluster pass에서 묶이길 기대)
              assignedRow = MAX_BAR_ROWS - 1
            }
          }
        }
        barRowOf.set(p.bar.id, assignedRow)
      }
      const usedBarRows = Math.min(MAX_BAR_ROWS, barEndsByRow.length)
      if (usedBarRows > 0) rowsByLane.set(laneKey, usedBarRows)
      if (laneOverflow > 0) {
        overflowByLane.set(laneKey, laneOverflow)
        overflowBarsByLane.set(laneKey, hiddenBarList)
      }

      // 2단계: milestone 클러스터링 — 연속된 milestone들이 CLUSTER_GAP_PX 이내 CLUSTER_MIN_COUNT개+ 면 묶음
      type Bucket = { items: Pre[]; isCluster: boolean }
      const buckets: Bucket[] = []
      let cur: Pre[] = []
      const flushCluster = () => {
        if (cur.length === 0) return
        if (cur.length >= CLUSTER_MIN_COUNT) {
          buckets.push({ items: cur, isCluster: true })
        } else {
          for (const it of cur) buckets.push({ items: [it], isCluster: false })
        }
        cur = []
      }

      for (const p of pre) {
        if (p.kind !== 'milestone') {
          flushCluster()
          buckets.push({ items: [p], isCluster: false })
          continue
        }
        const last = cur[cur.length - 1]
        if (!last || p.cx - last.cx <= CLUSTER_GAP_PX) {
          cur.push(p)
        } else {
          flushCluster()
          cur.push(p)
        }
      }
      flushCluster()

      /**
       * 3단계: 라벨 placement — 두 패스
       *  Pass 1: 각 bucket의 baseline showExt(geometry 가드) 계산 + bucket의 대표 importance 추출
       *  Pass 2:
       *    - 줌별 importance 필터 적용 (저줌은 critical만)
       *    - 2-row staggering — 인접 라벨이 같은 row일 때 충돌 검사, 아니면 row 교대로 풀어 더 노출
       *    - importance-weighted conflict — 충돌 시 더 중요한 bucket이 라벨 차지("steal")
       */
      type BucketInfo = {
        idx: number
        isCluster: boolean
        startX: number
        endX: number
        importance: BarData['importance']
        labelWidth: number
        baselineShow: boolean
      }
      // pill 바운드 계산 헬퍼 — milestone은 6px, cluster는 +N 텍스트 폭 기반
      const milestoneHalf = MIN_BAR_WIDTH / 2
      const clusterHalf = (b: { items: Pre[] }) =>
        Math.max(28, `+${b.items.length}`.length * 7 + 14) / 2
      const bucketInfos: BucketInfo[] = []
      for (let i = 0; i < buckets.length; i++) {
        const b = buckets[i]
        const next = buckets[i + 1]
        const myStart = b.isCluster
          ? (b.items[0].cx + b.items[b.items.length - 1].cx) / 2 - clusterHalf(b)
          : b.items[0].kind === 'milestone'
            ? b.items[0].cx - milestoneHalf
            : b.items[0].x
        const myEnd = b.isCluster
          ? (b.items[0].cx + b.items[b.items.length - 1].cx) / 2 + clusterHalf(b)
          : b.items[0].kind === 'milestone'
            ? b.items[0].cx + milestoneHalf
            : b.items[0].x + b.items[0].w
        const nextStart = next
          ? next.isCluster
            ? (next.items[0].cx + next.items[next.items.length - 1].cx) / 2 -
              clusterHalf(next)
            : next.items[0].kind === 'milestone'
              ? next.items[0].cx - milestoneHalf
              : next.items[0].x
          : Infinity
        const gap = nextStart - myEnd
        const candidateWidth = Math.min(EXT_LABEL_MAX_WIDTH, gap - 8)
        /**
         * baselineShow — *최소 표시 가능 폭*만 검사. 이전엔 `gap >= MIN_GAP(60)`도
         * 함께 봤는데, 2-row staggering이 충돌을 해결하므로 단일 row 가정의
         * 60px 게이트는 *과도하게 라벨을 차단*했다. (저줌 dense 시기에 모든 라벨 사라짐)
         * 이제 staggering pass에서 row별 실제 충돌만 검사.
         */
        const baselineShow = candidateWidth >= EXT_LABEL_MIN_WIDTH
        // bucket 대표 importance — 첫 항목 기준(milestone은 단일, bar도 단일)
        const importance = b.items[0].bar.importance
        bucketInfos.push({
          idx: i,
          isCluster: b.isCluster,
          startX: myStart,
          endX: myEnd,
          importance,
          labelWidth: Math.max(EXT_LABEL_MIN_WIDTH, candidateWidth),
          baselineShow,
        })
      }

      /**
       * Pass 2: row 0(중앙) → 1(아래) → 2(위) → 3(더 아래) 4-row 라벨 배치.
       * 각 row는 `lastEndX[row]`를 추적 — 라벨이 그 row에 들어가려면
       * `myStart >= lastEndX[row] + STAGGER_GAP`. 모두 충돌이면 importance 비교로 steal 또는 drop.
       *
       * 빽빽한 시기에 라벨 노출률 ↑ 위해 2-row → 4-row 확장. 빈 row 있으면 그쪽에 우선 배치.
       */
      type RowIdx = 0 | 1 | 2 | 3
      const ROW_COUNT: RowIdx[] = [0, 1, 2, 3]
      const lastLabelEndX = [-Infinity, -Infinity, -Infinity, -Infinity]
      const lastLabelOwner: Array<{
        bucketIdx: number
        importance: BarData['importance']
      } | null> = [null, null, null, null]
      const STAGGER_GAP = 6
      const labelDecision = new Map<
        number,
        { show: boolean; row: RowIdx }
      >()

      for (const info of bucketInfos) {
        /**
         * critical 단일 사건은 라벨이 *사라지지 않도록* 우대:
         *  1) baselineShow(폭) 게이트 무시
         *  2) zoom별 importance 필터 무시(이미 critical은 모든 zoom에서 통과지만 명시)
         *  3) labelWidth 최소 30px 보장 — 좁아도 ellipsis로라도 표시
         *  4) row 충돌 시 다른 critical만 아니면 무조건 steal
         * 저줌(0.5x↓)에서도 핵심 사건이 어디 있는지 한눈에 잡히게 한다.
         */
        const isCriticalSingle =
          !info.isCluster && info.importance === 'critical'

        if (!info.baselineShow && !isCriticalSingle) {
          labelDecision.set(info.idx, { show: false, row: 0 })
          continue
        }
        // 줌별 importance 필터 (cluster·critical 단일은 통과)
        if (
          !info.isCluster &&
          !isCriticalSingle &&
          LABEL_IMPORTANCE_TIER[info.importance] < minLabelTier
        ) {
          labelDecision.set(info.idx, { show: false, row: 0 })
          continue
        }
        const effectiveLabelWidth = isCriticalSingle
          ? Math.max(30, info.labelWidth)
          : info.labelWidth
        const labelEnd = info.endX + 4 + effectiveLabelWidth
        // 우선순위 순(0→1→2→3)으로 빈 row에 배치
        let placedRow: RowIdx | null = null
        for (const r of ROW_COUNT) {
          if (info.startX >= lastLabelEndX[r] + STAGGER_GAP) {
            placedRow = r
            break
          }
        }
        if (placedRow !== null) {
          lastLabelEndX[placedRow] = labelEnd
          lastLabelOwner[placedRow] = {
            bucketIdx: info.idx,
            importance: info.importance,
          }
          labelDecision.set(info.idx, { show: true, row: placedRow })
        } else {
          // 모든 row 충돌 — importance-weighted steal: 가장 importance 낮은 row 후보 찾기
          const myTier = LABEL_IMPORTANCE_TIER[info.importance]
          let weakestRow: RowIdx = 0
          let weakestTier = Infinity
          for (const r of ROW_COUNT) {
            const owner = lastLabelOwner[r]
            if (!owner) continue
            const t = LABEL_IMPORTANCE_TIER[owner.importance]
            if (t < weakestTier) {
              weakestTier = t
              weakestRow = r
            }
          }
          const weakest = lastLabelOwner[weakestRow]
          // critical은 동등 critical이 아닌 한 무조건 steal (저줌에서도 핵심 라벨 보존)
          const shouldSteal = !!weakest && (
            isCriticalSingle
              ? weakest.importance !== 'critical'
              : myTier > LABEL_IMPORTANCE_TIER[weakest.importance]
          )
          if (shouldSteal) {
            // steal: 이전 라벨 hide, 내가 차지
            labelDecision.set(weakest!.bucketIdx, { show: false, row: 0 })
            lastLabelEndX[weakestRow] = labelEnd
            lastLabelOwner[weakestRow] = {
              bucketIdx: info.idx,
              importance: info.importance,
            }
            labelDecision.set(info.idx, { show: true, row: weakestRow })
          } else {
            labelDecision.set(info.idx, { show: false, row: 0 })
          }
        }
      }

      // 4단계: render — bucket 별 RenderItem 생성. labelDecision으로 showExternalLabel/labelRow 주입.
      const items: RenderItem[] = []
      for (let i = 0; i < buckets.length; i++) {
        const b = buckets[i]
        const decision = labelDecision.get(i) ?? { show: false, row: 0 as RowIdx }
        const showExt = decision.show
        const info = bucketInfos[i]
        const labelWidth = info.labelWidth
        const labelRow = decision.row

        if (b.isCluster) {
          const first = b.items[0]
          const last = b.items[b.items.length - 1]
          const centerCx = (first.cx + last.cx) / 2
          // startYear 평균 — milestone들의 시점 중심 (endYear는 거의 startYear와 동일)
          const centerYear =
            b.items.reduce((acc, it) => acc + it.bar.startYear, 0) / b.items.length
          /**
           * 클러스터 색은 lane key가 아니라 *대표 사건의 카테고리*. continent/country
           * 모드에서 lane key는 카테고리가 아니므로 그대로 색에 넘기면 fallback color
           * 가 떨어진다.
           */
          items.push({
            kind: 'cluster',
            id: `cluster-${laneKey}-${first.bar.id}`,
            bars: b.items.map((it) => it.bar),
            cx: centerCx,
            cy: laneCenter,
            r: CLUSTER_RADIUS,
            startYear: first.bar.startYear,
            endYear: last.bar.endYear,
            centerYear,
            category: first.bar.category,
            showExternalLabel: showExt,
            externalLabelWidth: labelWidth,
            labelRow,
          })
        } else {
          const it = b.items[0]
          // 통합 row 좌표 — milestone과 bar 모두 동일 좌표계 공유로 시각 정렬.
          const rowsBlockHalf = ((usedBarRows - 1) * ROW_DELTA) / 2
          const itemRow = barRowOf.get(it.bar.id) ?? 0
          const itemRowCenter =
            laneCenter - rowsBlockHalf + itemRow * ROW_DELTA
          if (it.kind === 'milestone') {
            items.push({
              kind: 'milestone',
              id: `${laneKey}-${it.bar.id}`,
              bar: it.bar,
              cx: it.cx,
              cy: itemRowCenter,
              r: MILESTONE_RADIUS[it.bar.importance],
              showExternalLabel: showExt,
              externalLabelWidth: labelWidth,
              labelRow,
            })
          } else {
            if (hiddenBarIds.has(it.bar.id)) continue
            const isStacking = usedBarRows > 1
            const h = isStacking
              ? COMPACT_BAR_HEIGHT[it.bar.importance]
              : IMPORTANCE_BAR_HEIGHT[it.bar.importance]
            items.push({
              kind: 'bar',
              id: `${laneKey}-${it.bar.id}`,
              bar: it.bar,
              x: it.x,
              y: itemRowCenter - h / 2,
              w: it.w,
              h,
              showExternalLabel: showExt && it.w <= BAR_INSIDE_LABEL_MIN_PX,
              externalLabelWidth: labelWidth,
              labelRow,
            })
          }
        }
      }
      out.push(...items)
    }

    return {
      items: out,
      overflow: overflowByLane,
      overflowBars: overflowBarsByLane,
      laneRows: rowsByLane,
    }
  }, [barsSortedByLane, laneIndex, renderReady, minYear, pixelsPerYear, zoom])

  const renderItems = renderResult.items
  const laneBarOverflow = renderResult.overflow
  const laneBarOverflowBars = renderResult.overflowBars

  /** 어느 lane의 +N 배지가 popover 열려 있는지 — 한 번에 하나만 */
  const [overflowPopoverLane, setOverflowPopoverLane] = useState<string | null>(
    null,
  )
  /**
   * Cluster popover — cluster를 클릭했는데 zoom이 이미 최대치라 더 풀 수 없을 때
   * overflow와 동일한 UX(목록)로 fallback. 두 +N 모델이 *막힘 지점*에서 합류.
   * (사용자 멘탈 모델: "더 확대 안 되면 목록을 보자".)
   */
  const [clusterPopoverId, setClusterPopoverId] = useState<string | null>(null)

  /* overflow / cluster popover 외부 클릭 + Esc 닫기 — 한 번에 하나만 열림 */
  useEffect(() => {
    if (!overflowPopoverLane && !clusterPopoverId) return
    const onDocDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!t) return
      const el = t as Element
      if (
        !el.closest?.('[data-overflow-popover]') &&
        !el.closest?.('[data-cluster-popover]')
      ) {
        setOverflowPopoverLane(null)
        setClusterPopoverId(null)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOverflowPopoverLane(null)
        setClusterPopoverId(null)
      }
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [overflowPopoverLane, clusterPopoverId])

  // ── 키보드 ←/→ 같은 lane 시간순 이동 + Home/End ────────────────────────
  const focusBar = useCallback((id: string) => {
    const el = svgRef.current?.querySelector<SVGRectElement>(
      `[data-bar-id="${id}"]`,
    )
    if (el) el.focus()
  }, [])

  /**
   * Roving tabindex — 모든 막대에 tabIndex=0을 주면 50개+ 막대에서 Tab 키가
   * 사실상 사용 불가. 포커스된 항목 1개만 0, 나머지는 -1. 첫 진입 시엔
   * renderItems[0]을 디폴트로. focus 안에서는 ←/→/↑/↓ 화살표로 이동.
   *
   * id 기준으로 직접 비교(부모 컴포넌트 재렌더 시에도 안정).
   */
  const firstFocusableId = useMemo<string | null>(() => {
    if (renderItems.length === 0) return null
    const first = renderItems[0]
    return first.kind === 'cluster' ? first.id : first.bar.id
  }, [renderItems])

  const rovingTabIndex = useCallback(
    (id: string): 0 | -1 =>
      focusedBarId === id ||
      (focusedBarId === null && id === firstFocusableId)
        ? 0
        : -1,
    [focusedBarId, firstFocusableId],
  )

  /**
   * ↑/↓ — 인접 lane으로 포커스 이동. 현재 항목의 laneKeys[0]을 기준으로
   * visibleLanes에서 위치 찾고 ±1 lane의 항목 중 가장 가까운 시간 항목 선택.
   * groupBy=category/continent/country 어느 모드든 lane key 매칭만 일치하면 동작.
   *
   * 반환: ↑/↓로 처리됐으면 true.
   */
  const navigateBetweenLanes = (
    e: React.KeyboardEvent<SVGElement>,
    currentLaneKey: string | null,
    currentYear: number,
  ): boolean => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return false
    e.preventDefault()
    if (!currentLaneKey) return true
    const idx = visibleLanes.findIndex((l) => l.key === currentLaneKey)
    if (idx === -1) return true
    const dir = e.key === 'ArrowDown' ? 1 : -1
    const nextIdx = idx + dir
    if (nextIdx < 0 || nextIdx >= visibleLanes.length) return true
    const nextLane = visibleLanes[nextIdx]
    const yearOf = (r: RenderItem): number =>
      r.kind === 'cluster' ? r.centerYear : r.bar.startYear
    const laneKeysOf = (r: RenderItem): readonly string[] =>
      r.kind === 'cluster'
        ? (r.bars[0]?.laneKeys ?? [])
        : (r.bar.laneKeys ?? [])
    const candidates = renderItems.filter((r) =>
      laneKeysOf(r).includes(nextLane.key),
    )
    if (candidates.length === 0) return true
    candidates.sort(
      (a, b) =>
        Math.abs(yearOf(a) - currentYear) - Math.abs(yearOf(b) - currentYear),
    )
    const target = candidates[0]
    const targetId = target.kind === 'cluster' ? target.id : target.bar.id
    focusBar(targetId)
    scrollToYear(yearOf(target))
    return true
  }

  /**
   * 같은 lane 안에서 ←/→/Home/End로 인접 항목 포커스 이동 — cluster·bar 핸들러
   * 공통 로직. collection은 같은 카테고리로 미리 필터된 항목. 시간 정렬 후 현재
   * 인덱스 기준 이동, 위치한 연도로 스크롤.
   * 반환값: 화살표/Home/End 키로 처리되었으면 true (Enter/Space는 false → 호출자가
   * activate 분기).
   */
  const navigateInLane = <T extends { id: string }>(
    e: React.KeyboardEvent<SVGElement>,
    current: T,
    collection: T[],
    getYear: (item: T) => number,
  ): boolean => {
    if (
      e.key !== 'ArrowRight' &&
      e.key !== 'ArrowLeft' &&
      e.key !== 'Home' &&
      e.key !== 'End'
    ) {
      return false
    }
    e.preventDefault()
    const sorted = collection.slice().sort((a, b) => getYear(a) - getYear(b))
    const idx = sorted.findIndex((x) => x.id === current.id)
    if (idx === -1) return true
    let next: T | undefined
    if (e.key === 'Home') next = sorted[0]
    else if (e.key === 'End') next = sorted[sorted.length - 1]
    else if (e.key === 'ArrowRight')
      next = sorted[Math.min(idx + 1, sorted.length - 1)]
    else next = sorted[Math.max(idx - 1, 0)]
    if (next && next.id !== current.id) {
      focusBar(next.id)
      scrollToYear(getYear(next))
    }
    return true
  }

  /**
   * Cluster 키보드 — Enter/Space로 활성화, ←/→/Home/End로 같은 lane 안 인접
   * RenderItem(bar/milestone/cluster) 이동, ↑/↓로 lane 전환.
   */
  const handleClusterKeyDown = (
    e: React.KeyboardEvent<SVGElement>,
    cluster: RenderCluster,
    activate: () => void,
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      activate()
      return
    }
    // 먼저 ↑/↓ lane 전환 시도
    const laneKey = cluster.bars[0]?.laneKeys[0] ?? null
    if (navigateBetweenLanes(e, laneKey, cluster.centerYear)) return
    const sameLane = renderItems.filter((r) =>
      r.kind === 'cluster'
        ? r.category === cluster.category
        : r.bar.category === cluster.category,
    )
    navigateInLane(e, cluster, sameLane, (it) =>
      it.kind === 'cluster' ? it.centerYear : it.bar.startYear,
    )
  }

  const handleBarKeyDown = (e: React.KeyboardEvent<SVGElement>, b: BarData) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelectEvent(b.id)
      return
    }
    // 먼저 ↑/↓ lane 전환 시도
    const laneKey = b.laneKeys[0] ?? null
    if (navigateBetweenLanes(e, laneKey, b.startYear)) return
    const sameCategory = bars.filter((x) => x.category === b.category)
    navigateInLane(e, b, sameCategory, (it) => it.startYear)
  }

  // ── 오늘 마커 ───────────────────────────────────────────────────────────
  const currentYear = new Date().getFullYear()
  /**
   * "오늘" 마커는 *데이터가 현재 시점에 가까울 때만* 의미 있음.
   *  - currentYear가 데이터 범위 안에 있어야 함
   *  - AND 데이터의 maxYear가 currentYear-5 이상 (즉 최근 데이터가 있음)
   * 모든 사건이 100년 전이면 오늘 마커는 화면 우측 끝에 점 하나로 시선만 분산.
   */
  const showToday =
    currentYear >= minYear &&
    currentYear <= maxYear &&
    maxYear >= currentYear - 5
  const todayX = (currentYear - minYear) * pixelsPerYear

  // ── legend toggle ───────────────────────────────────────────────────────
  /**
   * Lane 점프 완화 — hiddenCategories 토글 시 visibleLanes가 줄어/늘어 SVG
   * height가 변하면 사용자가 보던 lane이 viewport 밖으로 밀려나는 CLS 발생.
   * 토글 직전 viewport 상단에 걸친 lane을 anchor로 기억 → 토글 이후 같은 lane이
   * viewport 같은 y에 오도록 scrollTop 재계산. 토글된 lane이 사라진 경우엔
   * 가장 가까운 이웃 lane으로 fallback.
   */
  const scrollAnchorRef = useRef<{
    laneKey: string
    offsetWithinLane: number
  } | null>(null)
  const prevVisibleLanesRef = useRef(visibleLanes)

  const captureScrollAnchor = useCallback(() => {
    const host = scrollRef.current
    if (!host) return
    const lanes = prevVisibleLanesRef.current
    if (lanes.length === 0) return
    const top = host.scrollTop
    const laneIdx = Math.max(
      0,
      Math.min(
        lanes.length - 1,
        Math.floor((top - TOP_AXIS_HEIGHT) / LANE_HEIGHT),
      ),
    )
    const laneTopY = TOP_AXIS_HEIGHT + laneIdx * LANE_HEIGHT
    scrollAnchorRef.current = {
      laneKey: lanes[laneIdx].key,
      offsetWithinLane: top - laneTopY,
    }
  }, [])

  // visibleLanes 변동 직후 anchor 복원 (paint 전에)
  useLayoutEffect(() => {
    const anchor = scrollAnchorRef.current
    const host = scrollRef.current
    if (anchor && host) {
      let newIdx = visibleLanes.findIndex((l) => l.key === anchor.laneKey)
      if (newIdx < 0) {
        // anchor lane이 hide됐다면 prev 위치에 가장 가까운 이웃으로 fallback
        const prevIdx = prevVisibleLanesRef.current.findIndex(
          (l) => l.key === anchor.laneKey,
        )
        if (prevIdx >= 0) {
          // prev에서 anchor 다음 lane 중 살아남은 것 찾기
          for (let i = prevIdx + 1; i < prevVisibleLanesRef.current.length; i++) {
            const k = prevVisibleLanesRef.current[i].key
            const j = visibleLanes.findIndex((l) => l.key === k)
            if (j >= 0) {
              newIdx = j
              break
            }
          }
        }
      }
      if (newIdx >= 0) {
        const newTop =
          TOP_AXIS_HEIGHT + newIdx * LANE_HEIGHT + anchor.offsetWithinLane
        host.scrollTop = Math.max(0, newTop - anchor.offsetWithinLane)
      }
      scrollAnchorRef.current = null
    }
    prevVisibleLanesRef.current = visibleLanes
  }, [visibleLanes])

  const toggleCategory = (key: string) => {
    captureScrollAnchor()
    setHiddenCategories((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  const showAllCategories = () => {
    captureScrollAnchor()
    setHiddenCategories(new Set())
  }

  // ── viewport readout 텍스트 — BC 연도 대응 ──────────────────────────────
  const viewportReadout = viewportYears
    ? `${formatYearLabel(Math.round(viewportYears.start))}–${formatYearLabel(Math.round(viewportYears.end))}`
    : `${formatYearLabel(minYear)}–${formatYearLabel(maxYear)}`

  /**
   * Lane별 decade 밀도 — 라벨이 안 보여도 *어디에 사건이 많은지* 시각 단서.
   * lane 하단에 5px 밴드로 그라데이션 strip 렌더.
   */
  const laneDensity = useMemo(() => {
    const byLane = new Map<string, { byDecade: Map<number, number>; max: number }>()
    const hasUncat = laneIndex.has(UNCATEGORIZED_LANE)
    for (const b of bars) {
      const valid = b.laneKeys.filter((k) => laneIndex.has(k))
      const targets = valid.length > 0
        ? valid
        : hasUncat
          ? [UNCATEGORIZED_LANE]
          : []
      const decade = Math.floor(b.startYear / 10) * 10
      for (const k of targets) {
        let entry = byLane.get(k)
        if (!entry) {
          entry = { byDecade: new Map(), max: 0 }
          byLane.set(k, entry)
        }
        const cur = (entry.byDecade.get(decade) ?? 0) + 1
        entry.byDecade.set(decade, cur)
        if (cur > entry.max) entry.max = cur
      }
    }
    return byLane
  }, [bars, laneIndex])

  /**
   * 현재 viewport 안 *모든* 사건 — 우측 레일에 시간순 목록으로. 막대 라벨이 충돌·클러스터·
   * +N으로 가려져도 "지금 보이는 구간에 어떤 사건이 있는지" 이름으로 한눈에 읽게 한다.
   * 이 레일이 타임라인의 약점(이름 가독성)을 메우는 핵심 장치.
   *
   * 정렬: 시작연도 asc → 같은 해는 중요도 desc(critical 먼저). 안전 상한(RAIL_CAP)으로
   * 자르되 총 개수(total)는 별도 표시 — 잘렸음을 숨기지 않는다.
   */
  const RAIL_CAP = 300
  const viewportBars = useMemo(() => {
    if (!viewportYears) return { items: [] as BarData[], total: 0 }
    const { start, end } = viewportYears
    const matched = bars.filter(
      (b) => b.endYear >= start && b.startYear <= end,
    )
    matched.sort((a, b) => {
      if (a.startYear !== b.startYear) return a.startYear - b.startYear
      return (
        LABEL_IMPORTANCE_TIER[b.importance] - LABEL_IMPORTANCE_TIER[a.importance]
      )
    })
    return { items: matched.slice(0, RAIL_CAP), total: matched.length }
  }, [bars, viewportYears])

  // ── export ──────────────────────────────────────────────────────────────
  const downloadBlob = (content: string, mime: string, ext: string) => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `timeline-${new Date().toISOString().slice(0, 10)}.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const exportSvg = () => {
    const svg = svgRef.current
    if (!svg) return
    const xml = new XMLSerializer().serializeToString(svg)
    downloadBlob(
      `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`,
      'image/svg+xml;charset=utf-8',
      'svg',
    )
    setExportOpen(false)
  }

  /**
   * PNG export — SVG를 canvas에 렌더링 후 toBlob.
   * SVG에 외부 폰트가 들어 있으면 일부 글리프 깨질 수 있음(브라우저 한계).
   * 라벨이 잘리는 경우 SVG 옵션 권장.
   */
  const exportPng = () => {
    const svg = svgRef.current
    if (!svg) return
    const xml = new XMLSerializer().serializeToString(svg)
    const svgBlob = new Blob(
      [`<?xml version="1.0" encoding="UTF-8"?>\n${xml}`],
      { type: 'image/svg+xml;charset=utf-8' },
    )
    const url = URL.createObjectURL(svgBlob)
    const img = new Image()
    img.onload = () => {
      const w = svg.clientWidth || svg.viewBox.baseVal.width || 1200
      const h = svg.clientHeight || svg.viewBox.baseVal.height || 600
      const dpr = window.devicePixelRatio || 1
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(w * dpr)
      canvas.height = Math.ceil(h * dpr)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        return
      }
      ctx.scale(dpr, dpr)
      // 흰 배경으로(다크 모드에서도 인쇄/공유에 적합)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      canvas.toBlob((blob) => {
        if (!blob) return
        const pngUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = pngUrl
        a.download = `timeline-${new Date().toISOString().slice(0, 10)}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(pngUrl), 1000)
      }, 'image/png')
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
    }
    img.src = url
    setExportOpen(false)
  }

  const exportJson = () => {
    const payload = bars.map((b) => ({
      id: b.id,
      title: b.title,
      category: b.category,
      importance: b.importance,
      startDate: b.startDate,
      endDate: b.endDate,
    }))
    downloadBlob(
      JSON.stringify(payload, null, 2),
      'application/json;charset=utf-8',
      'json',
    )
    setExportOpen(false)
  }

  /* export menu 외부 클릭 시 닫기 */
  useEffect(() => {
    if (!exportOpen) return
    const onDocDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (t && !(t as Element).closest?.('[data-export-menu]')) {
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [exportOpen])

  /* shape legend popover — 외부 클릭 + Esc 닫기 */
  useEffect(() => {
    if (!shapeLegendOpen) return
    const onDocDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (t && !(t as Element).closest?.('[data-shape-legend]')) {
        setShapeLegendOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShapeLegendOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [shapeLegendOpen])

  /* zoom menu — 외부 클릭 + Esc 닫기 */
  useEffect(() => {
    if (!zoomMenuOpen) return
    const onDocDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (t && !(t as Element).closest?.('[data-zoom-menu]')) {
        setZoomMenuOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [zoomMenuOpen])

  // ── render ──────────────────────────────────────────────────────────────
  /**
   * legend는 *항상 카테고리 기준*. 색 인코딩 = 카테고리이고, hide 토글은
   * b.category로 거른다(`hiddenCategories`). groupBy가 continent/country여도
   * 색 의미와 hide 의미를 일관되게 유지하려면 legend는 lane이 아닌 카테고리를
   * 노출해야 한다.
   *
   * lane 모드일 때는 lanes(=KNOWN_CATEGORIES + 데이터)를 그대로 쓰면 되지만,
   * continent/country 모드에서는 별도로 데이터 카테고리를 모아 쓴다.
   */
  const legendItems = useMemo<{ key: string; label: string }[]>(() => {
    if (groupBy === 'category') return lanes
    const present = new Set(allBars.map((b) => b.category))
    const ordered: { key: string; label: string }[] = []
    const seen = new Set<string>()
    for (const name of KNOWN_CATEGORIES) {
      if (present.has(name)) {
        ordered.push({ key: name, label: name })
        seen.add(name)
      }
    }
    for (const c of present) {
      if (seen.has(c)) continue
      ordered.push({
        key: c,
        label: dbCategories.find((d) => d.name === c)?.name ?? c,
      })
    }
    return ordered
  }, [groupBy, lanes, allBars, dbCategories])
  const anyHidden = hiddenCategories.size > 0

  return (
    <>
      {/* ═══ 카드 1: 사건 분포 ═══ */}
      <MinimapCard>
        <CardHeader>
          <CardTitleGroup>
            <CardTitle>사건 분포</CardTitle>
            <CardHint>
              10년 단위 · 색은 카테고리 · 클릭/드래그 → 그 시기로 이동
            </CardHint>
          </CardTitleGroup>
        </CardHeader>
        <Minimap
          ref={minimapRef}
          aria-label="10년 단위 사건 밀도 — 드래그로 범위 이동"
          onPointerDown={handleMinimapPointerDown}
          onPointerMove={handleMinimapPointerMove}
          onPointerUp={endMinimapDrag}
          onPointerCancel={endMinimapDrag}
          onPointerLeave={endMinimapDrag}
        >
          {decadeBuckets.map(({ decade, count, weight, byCategory }) => {
            const ratio = weight / maxBucketWeight
            const h = Math.max(2, ratio * 78)
            const showLabel =
              labelStep === 1
                ? true
                : labelStep === 2
                  ? decade % 20 === 0
                  : decade % 50 === 0
            const inViewport =
              viewportYears !== null &&
              !(decade + 10 < viewportYears.start || decade > viewportYears.end)
            /**
             * 카테고리별 stacked segment — count 내림차순으로 안정 정렬해
             * 큰 카테고리가 아래(시각적 base) 깔리고 작은 카테고리가 위로.
             * h<4 또는 segment 없을 땐 MinimapBarFill 자체 fallback 색만 보임.
             */
            const segments = Array.from(byCategory.entries()).sort(
              (a, b) => b[1] - a[1],
            )
            const showSegments = segments.length > 0 && h >= 4
            return (
              <MinimapBar
                key={decade}
                type="button"
                onClick={() => scrollToYear(decade + 5)}
                title={`${decade}~${decade + 9} · ${count}건`}
                data-count={`${count}건`}
                aria-label={`${decade}년대 ${count}건 — Enter 또는 클릭으로 이동`}
              >
                <MinimapBarFill
                  $inViewport={inViewport}
                  $thin={h < 6}
                  style={{ height: `${h}px` }}
                >
                  {showSegments &&
                    segments.map(([cat, c]) => (
                      <MinimapBarSegment
                        key={cat}
                        style={{
                          flexGrow: c,
                          background: categoryColor(cat),
                          opacity: inViewport ? 1 : 0.45,
                        }}
                      />
                    ))}
                </MinimapBarFill>
                {showLabel ? (
                  <MinimapBarLabel>{decade}</MinimapBarLabel>
                ) : (
                  <MinimapBarLabelSpacer aria-hidden="true" />
                )}
              </MinimapBar>
            )
          })}
        </Minimap>
      </MinimapCard>

      {/* ═══ 카드 2: 사건 타임라인 ═══ */}
      <TimelineCard>
        <CardHeader>
          <CardTitleGroup>
            <CardTitle>사건 타임라인</CardTitle>
            <CardHint>
              막대 클릭 · Shift+클릭 라벨 핀 · ←/→ 이동 · Ctrl+휠 줌 · Space+드래그
            </CardHint>
          </CardTitleGroup>
          <HeaderActions>
            <GroupByControls
              role="radiogroup"
              aria-label="lane 그룹 — 카테고리/대륙/국가"
            >
              {(
                [
                  { v: 'category', label: '카테고리' },
                  { v: 'continent', label: '대륙' },
                  { v: 'country', label: '국가' },
                ] as Array<{ v: GroupBy; label: string }>
              ).map(({ v, label }) => (
                <GroupBySegment
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={groupBy === v}
                  $active={groupBy === v}
                  onClick={() => setGroupBy(v)}
                  title={`lane을 ${label}별로 표시`}
                >
                  {label}
                </GroupBySegment>
              ))}
            </GroupByControls>
            <YearJumpInput
              type="number"
              defaultValue=""
              placeholder={viewportReadout}
              min={minYear}
              max={maxYear}
              aria-label={`연도 점프 — 현재 ${viewportReadout}`}
              title="연도를 입력하고 Enter — 그 시기로 이동"
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') {
                  const v = parseInt(e.currentTarget.value, 10)
                  if (!Number.isNaN(v)) {
                    scrollToYear(v)
                    e.currentTarget.blur()
                  }
                } else if (e.key === 'Escape') {
                  e.currentTarget.value = ''
                  e.currentTarget.blur()
                }
              }}
            />
            <ZoomMenuWrap data-zoom-menu>
              <ZoomControls aria-label="확대/축소">
                <ZoomButton
                  type="button"
                  aria-label="전체 보기 — 모든 사건이 한 화면에"
                  title="전체 보기 (Fit)"
                  onClick={fitAll}
                >
                  <FiMaximize2 size={12} aria-hidden="true" />
                </ZoomButton>
                <ZoomButton
                  type="button"
                  aria-label="축소"
                  title="축소"
                  onClick={() => zoomBy(1 / ZOOM_STEP)}
                  disabled={zoom <= ZOOM_MIN + 0.01}
                >
                  <FiMinus size={12} aria-hidden="true" />
                </ZoomButton>
                <ZoomReadout
                  onClick={() => setZoomMenuOpen((v) => !v)}
                  title="확대율 — 클릭하여 프리셋 선택"
                  aria-haspopup="menu"
                  aria-expanded={zoomMenuOpen}
                  aria-label={`현재 확대율 ${Math.round(zoom * 100)}% — 클릭하여 프리셋 메뉴 열기`}
                  aria-live="polite"
                >
                  {Math.round(zoom * 100)}%
                </ZoomReadout>
                <ZoomButton
                  type="button"
                  aria-label="확대"
                  title="확대"
                  onClick={() => zoomBy(ZOOM_STEP)}
                  disabled={zoom >= ZOOM_MAX - 0.01}
                >
                  <FiPlus size={12} aria-hidden="true" />
                </ZoomButton>
              </ZoomControls>
              {zoomMenuOpen && (
                <ZoomMenu role="menu" aria-label="확대율 프리셋">
                  {ZOOM_PRESETS.map((p) => {
                    const pct = Math.round(p * 100)
                    const isCurrent =
                      Math.abs(Math.round(zoom * 100) - pct) < 1
                    return (
                      <ZoomMenuItem
                        key={p}
                        role="menuitemradio"
                        aria-checked={isCurrent}
                        $active={isCurrent}
                        type="button"
                        onClick={() => {
                          setZoom(p)
                          setZoomMenuOpen(false)
                        }}
                      >
                        {pct}%
                        {p === 1 && <ZoomMenuHint>기본</ZoomMenuHint>}
                      </ZoomMenuItem>
                    )
                  })}
                  <ZoomMenuDivider />
                  <ZoomMenuItem
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      fitAll()
                      setZoomMenuOpen(false)
                    }}
                  >
                    전체 보기 (Fit)
                  </ZoomMenuItem>
                </ZoomMenu>
              )}
            </ZoomMenuWrap>
            <ExportWrap data-export-menu>
              <ExportButton
                type="button"
                onClick={() => setExportOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={exportOpen}
                title="내보내기"
                aria-label="내보내기"
              >
                <FiDownload size={13} aria-hidden="true" />
                <span>내보내기</span>
              </ExportButton>
              {exportOpen && (
                <ExportMenu role="menu">
                  <ExportMenuItem role="menuitem" onClick={exportPng}>
                    PNG로 내보내기
                  </ExportMenuItem>
                  <ExportMenuItem role="menuitem" onClick={exportSvg}>
                    SVG로 내보내기
                  </ExportMenuItem>
                  <ExportMenuItem role="menuitem" onClick={exportJson}>
                    JSON으로 내보내기
                  </ExportMenuItem>
                </ExportMenu>
              )}
            </ExportWrap>

            <ShapeLegendWrap data-shape-legend>
              <ZoomButton
                type="button"
                aria-label="모양 범례 — pill 의미"
                aria-expanded={shapeLegendOpen}
                aria-haspopup="dialog"
                title="모양 의미 설명"
                onClick={() => setShapeLegendOpen((v) => !v)}
              >
                <FiInfo size={12} aria-hidden="true" />
              </ZoomButton>
              {shapeLegendOpen && (
                <ShapeLegendPopover role="dialog" aria-label="모양 범례">
                  <ShapeLegendTitle>모양으로 구분되는 정보</ShapeLegendTitle>
                  <ShapeLegendRow>
                    <ShapeLegendIcon aria-hidden="true">
                      <svg width="20" height="14" viewBox="0 0 20 14">
                        <rect x="0" y="2" width="20" height="10" rx="5" fill="#2563eb" />
                      </svg>
                    </ShapeLegendIcon>
                    <ShapeLegendText>
                      <strong>긴 pill</strong>
                      <span>기간 있는 사건 (폭 = 기간)</span>
                    </ShapeLegendText>
                  </ShapeLegendRow>
                  <ShapeLegendRow>
                    <ShapeLegendIcon aria-hidden="true">
                      <svg width="20" height="14" viewBox="0 0 20 14">
                        <rect x="7" y="2" width="6" height="10" rx="3" fill="#2563eb" />
                      </svg>
                    </ShapeLegendIcon>
                    <ShapeLegendText>
                      <strong>짧은 pill</strong>
                      <span>시점 사건 (단발성 또는 줌 아웃 시)</span>
                    </ShapeLegendText>
                  </ShapeLegendRow>
                  <ShapeLegendRow>
                    <ShapeLegendIcon aria-hidden="true">
                      <svg width="32" height="14" viewBox="0 0 32 14">
                        <rect x="0" y="2" width="32" height="10" rx="5" fill="#2563eb" />
                        <text
                          x="16"
                          y="10"
                          fontSize="7"
                          fill="#fff"
                          textAnchor="middle"
                          fontWeight="700"
                        >
                          +5
                        </text>
                      </svg>
                    </ShapeLegendIcon>
                    <ShapeLegendText>
                      <strong>+N pill</strong>
                      <span>3개 이상 밀집 — 클릭 시 자동 확대</span>
                    </ShapeLegendText>
                  </ShapeLegendRow>
                  <ShapeLegendDivider />
                  <ShapeLegendHint>
                    색 = 카테고리 · 높이 = 중요도 · 폭 = 기간
                  </ShapeLegendHint>
                </ShapeLegendPopover>
              )}
            </ShapeLegendWrap>
            <Legend aria-label="카테고리 색 범례 — 클릭으로 표시/숨김 토글">
              {legendItems.map((lane) => {
                const hidden = hiddenCategories.has(lane.key)
                return (
                  <LegendItem
                    key={lane.key}
                    type="button"
                    aria-pressed={!hidden}
                    aria-label={`${lane.label} ${hidden ? '표시' : '숨기기'}`}
                    $dim={hoveredCategory != null && hoveredCategory !== lane.key}
                    $hidden={hidden}
                    onClick={() => toggleCategory(lane.key)}
                    onMouseEnter={() => setHoveredCategory(lane.key)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    <LegendDot style={{ background: categoryColor(lane.key) }} />
                    <span>{lane.label}</span>
                  </LegendItem>
                )
              })}
              {anyHidden && (
                <LegendShowAll
                  type="button"
                  onClick={showAllCategories}
                  aria-label="숨긴 카테고리 모두 보이기"
                >
                  모두 보이기
                </LegendShowAll>
              )}
            </Legend>
          </HeaderActions>
        </CardHeader>

        {/* 일부 카테고리가 숨겨져 있을 때 알림 띠 — bars > 0 일 때만 (전부 숨김은 EmptyHint 분기) */}
        {anyHidden && bars.length > 0 && (
          <HiddenCatStrip role="status" aria-live="polite">
            <span>
              카테고리 <strong>{hiddenCategories.size}</strong>개 숨김
              {(() => {
                const labels = Array.from(hiddenCategories).slice(0, 3)
                if (labels.length === 0) return null
                const more =
                  hiddenCategories.size > labels.length
                    ? ` 외 ${hiddenCategories.size - labels.length}개`
                    : ''
                return ` · ${labels.join(', ')}${more}`
              })()}
            </span>
            <HiddenCatStripButton type="button" onClick={showAllCategories}>
              모두 보이기
            </HiddenCatStripButton>
          </HiddenCatStrip>
        )}

        {bars.length === 0 ? (
          <EmptyHint role="status" aria-live="polite">
            <EmptyIconBubble aria-hidden="true">∅</EmptyIconBubble>
            {/**
             * 빈 상태는 두 케이스를 분기:
             *  - allBars > 0 이면 사용자가 legend로 모든 카테고리를 hide한 상태
             *    → "전부 숨겨져 있다 · 모두 보이기" 안내. (이전엔 데이터 없음과
             *       구분 안 돼 사용자가 새로고침하는 등 혼동했음)
             *  - allBars === 0 이면 진짜로 표시할 사건이 없음. 부모의 검색·필터
             *    상태를 모르므로 일반화된 가이드(목록·지도 뷰로 전환) 제시.
             */}
            {allBars.length > 0 ? (
              <>
                <EmptyTitle>모든 카테고리가 숨겨졌습니다</EmptyTitle>
                <EmptyDescription>
                  우측 legend에서{' '}
                  <strong>{hiddenCategories.size}개</strong> 카테고리를 숨겨
                  표시할 사건이 없습니다.
                </EmptyDescription>
                <EmptySubAction onClick={showAllCategories}>
                  숨긴 카테고리 모두 보이기
                </EmptySubAction>
              </>
            ) : isLoading ? (
              <>
                <EmptyTitle>사건 불러오는 중…</EmptyTitle>
                <EmptyDescription>
                  타임라인은 전 시대를 한 화면에 보여주기 위해 전체 사건을
                  불러옵니다. 잠시만 기다려 주세요.
                </EmptyDescription>
              </>
            ) : (
              <>
                <EmptyTitle>이 범위에 표시할 사건이 없습니다</EmptyTitle>
                <EmptyDescription>
                  상단 검색·필터를 조정하거나, 목록·지도·갤러리 등 다른 뷰로
                  전환해 보세요. 데이터가 아직 적재되지 않은 시기일 수도
                  있습니다.
                </EmptyDescription>
              </>
            )}
          </EmptyHint>
        ) : (
          <>
            {showOnboarding && (
              <OnboardingTip role="status" aria-live="polite">
                <OnboardingTipBody>
                  <OnboardingTipTitle>
                    💡 타임라인 사용법
                  </OnboardingTipTitle>
                  <OnboardingTipList>
                    <li>
                      <kbd>Ctrl</kbd> + 휠 · 두 손가락 핀치 — 줌
                    </li>
                    <li>
                      휠 · <kbd>Space</kbd>+드래그 · 한 손가락 스와이프 — 좌우 이동
                    </li>
                    <li>
                      <kbd>Tab</kbd> 후 <kbd>←</kbd>/<kbd>→</kbd> 시간, <kbd>↑</kbd>/<kbd>↓</kbd> 레인
                    </li>
                    <li>우측 목록 — 보이는 구간의 사건 한눈에 · 클릭해 선택</li>
                    <li>막대 클릭/탭 — 사건 상세</li>
                  </OnboardingTipList>
                </OnboardingTipBody>
                <OnboardingTipDismiss
                  type="button"
                  onClick={dismissOnboarding}
                  aria-label="안내 닫기"
                >
                  알겠어요
                </OnboardingTipDismiss>
              </OnboardingTip>
            )}
            <TimelineBody>
            <ScrollHost
              ref={attachScrollHost}
              onWheel={handleWheel}
              onMouseDown={handlePanMouseDown}
              $panning={spaceHeld}
              tabIndex={-1}
            >
            {renderReady && (
              <SvgRoot
                ref={svgRef}
                width={svgWidth}
                height={totalHeight}
                role="img"
                aria-label={`사건 타임라인 — ${bars.length}건, ${minYear}년부터 ${maxYear}년까지`}
              >
                {/* 상단 연도 눈금 */}
                <g transform={`translate(${LANE_LABEL_WIDTH}, 0)`}>
                  {ticks.map((y) => {
                    const x = (y - minYear) * pixelsPerYear
                    const major = y % 10 === 0
                    return (
                      <g key={y} transform={`translate(${x}, 0)`}>
                        <TickLine
                          x1={0}
                          x2={0}
                          y1={TOP_AXIS_HEIGHT - 8}
                          y2={totalHeight - TIMELINE_BOTTOM_PAD}
                          $major={major}
                        />
                        <TickLabel x={2} y={TOP_AXIS_HEIGHT - 12}>
                          {formatYearLabel(y)}
                        </TickLabel>
                      </g>
                    )
                  })}
                </g>

                {/* 레인 */}
                {visibleLanes.map((lane, i) => {
                  const yTop = TOP_AXIS_HEIGHT + i * LANE_HEIGHT
                  return (
                    <g
                      key={lane.key}
                      onMouseEnter={() => setHoveredCategory(lane.key)}
                      onMouseLeave={() => setHoveredCategory(null)}
                    >
                      <LaneBg
                        x={0}
                        y={yTop}
                        width={svgWidth}
                        height={LANE_HEIGHT}
                        $alt={i % 2 === 1}
                        $highlighted={hoveredCategory === lane.key}
                      />
                      {/**
                       * 밀도 underlay — lane 하단 5px 띠. "어디에 사건이 많은지" 시각 단서.
                       *  - category 모드: 카테고리 색으로 칠해 색·밀도 동시 전달
                       *  - continent/country 모드: lane key가 카테고리 아님 → 중립 회색
                       *    (색 의미는 빠지지만 *밀도* 정보는 살아남음 — 이전엔 전혀 안 보였음)
                       */}
                      {(() => {
                        const dens = laneDensity.get(lane.key)
                        if (!dens || dens.max === 0) return null
                        const color =
                          groupBy === 'category'
                            ? categoryColor(lane.key)
                            : '#94a3b8' // slate-400 — 중립색, 다른 색 의미와 충돌 X
                        const stripY = yTop + LANE_HEIGHT - 6
                        return (
                          <g pointerEvents="none">
                            {Array.from(dens.byDecade.entries()).map(
                              ([decade, count]) => {
                                const x =
                                  LANE_LABEL_WIDTH +
                                  (decade - minYear) * pixelsPerYear
                                const w = 10 * pixelsPerYear
                                if (w < 1) return null
                                const opacity = 0.08 + (count / dens.max) * 0.32
                                return (
                                  <rect
                                    key={`d-${lane.key}-${decade}`}
                                    x={x}
                                    y={stripY}
                                    width={w}
                                    height={4}
                                    fill={color}
                                    fillOpacity={opacity}
                                    rx={1}
                                  />
                                )
                              },
                            )}
                          </g>
                        )
                      })()}
                      {/**
                       * 좌측 라벨 영역 — sticky.
                       * `translate(${scrollLeft}, 0)`로 viewport 우측 스크롤에 따라 함께 이동 →
                       * 사용자 시야 기준으로 lane label 영역이 *항상 화면 좌측에 고정*.
                       *
                       * 내부 `<LaneLabelBg>`가 막대/라벨이 뒤에서 보이지 않도록 surface 색으로 덮음.
                       */}
                      <g transform={`translate(${scrollLeft}, 0)`}>
                        <LaneLabelBg
                          x={0}
                          y={yTop}
                          width={LANE_LABEL_WIDTH}
                          height={LANE_HEIGHT}
                        />
                        <LaneLabel
                          x={LANE_LABEL_WIDTH - 10}
                          y={yTop + LANE_HEIGHT / 2 - 6}
                        >
                          {truncateLabel(lane.label, 10)}
                        </LaneLabel>
                        {/* lane key가 카테고리인 모드에서만 색 dot이 의미 있음 */}
                        {groupBy === 'category' && (
                          <LaneDot
                            cx={12}
                            cy={yTop + LANE_HEIGHT / 2}
                            r={3}
                            fill={categoryColor(lane.key)}
                          />
                        )}
                        {/* 우측 hairline — 라벨 영역과 timeline 본문의 시각 경계 */}
                        <LaneLabelDivider
                          x1={LANE_LABEL_WIDTH}
                          y1={yTop}
                          x2={LANE_LABEL_WIDTH}
                          y2={yTop + LANE_HEIGHT}
                        />
                      </g>
                      {/* overflow "+N" 배지 — 빽빽한 시기 가까이 배치(median start year).
                       * sticky lane label 영역 밖이라 가로 스크롤과 함께 이동.
                       * 사용자가 dense region 어디인지 즉시 인지. */}
                      {(() => {
                        const overflowCount = laneBarOverflow.get(lane.key) ?? 0
                        if (overflowCount === 0) return null
                        const hidden =
                          laneBarOverflowBars.get(lane.key) ?? []
                        if (hidden.length === 0) return null
                        // median startYear → 대표 시점
                        const sorted = hidden
                          .map((h) => h.startYear)
                          .slice()
                          .sort((a, b) => a - b)
                        const mid = Math.floor(sorted.length / 2)
                        const medianYear =
                          sorted.length % 2 === 0
                            ? (sorted[mid - 1] + sorted[mid]) / 2
                            : sorted[mid]
                        const denseX =
                          LANE_LABEL_WIDTH +
                          (medianYear - minYear) * pixelsPerYear
                        return (
                          <LaneOverflowBadge
                            transform={`translate(${denseX}, ${yTop + LANE_HEIGHT - 14})`}
                            tabIndex={0}
                            role="button"
                            aria-label={`${lane.label} 가려진 사건 ${overflowCount}건 보기`}
                            onClick={() => {
                              setClusterPopoverId(null)
                              setOverflowPopoverLane((cur) =>
                                cur === lane.key ? null : lane.key,
                              )
                            }}
                            onMouseEnter={() => {
                              setClusterPopoverId(null)
                              setOverflowPopoverLane(lane.key)
                            }}
                            onKeyDown={(
                              e: React.KeyboardEvent<SVGGElement>,
                            ) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                setClusterPopoverId(null)
                                setOverflowPopoverLane((cur) =>
                                  cur === lane.key ? null : lane.key,
                                )
                              }
                            }}
                          >
                            <title>
                              시간 겹침으로 {overflowCount}건이 더 있습니다 — 클릭하여 목록 보기
                            </title>
                            <rect
                              x={-16}
                              y={-9}
                              width={32}
                              height={14}
                              rx={7}
                            />
                            <text x={0} y={1} textAnchor="middle">
                              +{overflowCount}
                            </text>
                          </LaneOverflowBadge>
                        )
                      })()}
                    </g>
                  )
                })}

                {/* 오늘 마커 — TickLine과 동일한 dasharray 패턴(2 4) 사용해 시각 통일 */}
                {showToday && (
                  <g transform={`translate(${LANE_LABEL_WIDTH}, 0)`} pointerEvents="none">
                    <TodayLine
                      x1={todayX}
                      x2={todayX}
                      y1={TOP_AXIS_HEIGHT - 4}
                      y2={totalHeight - TIMELINE_BOTTOM_PAD}
                    />
                    <TodayLabelBg
                      x={todayX - 18}
                      y={TOP_AXIS_HEIGHT - 28}
                      width={36}
                      height={18}
                      rx={4}
                    />
                    <TodayLabelText x={todayX} y={TOP_AXIS_HEIGHT - 15}>
                      오늘
                    </TodayLabelText>
                  </g>
                )}

                {/* 선택 vertical guide */}
                {(() => {
                  if (!selectedEventId) return null
                  const sel = bars.find((b) => b.id === selectedEventId)
                  if (!sel) return null
                  const xStart =
                    LANE_LABEL_WIDTH + (sel.startYear - minYear) * pixelsPerYear
                  const xEnd =
                    LANE_LABEL_WIDTH + (sel.endYear - minYear) * pixelsPerYear
                  // SelectedRangeBg와 LaneBg highlighted 누적 방지: highlight 중인 lane 제외
                  return (
                    <g pointerEvents="none">
                      <SelectedRangeBg
                        x={xStart}
                        y={TOP_AXIS_HEIGHT}
                        width={Math.max(MIN_BAR_WIDTH, xEnd - xStart)}
                        height={
                          totalHeight - TOP_AXIS_HEIGHT - TIMELINE_BOTTOM_PAD
                        }
                        $dimmed={hoveredCategory === sel.category}
                      />
                      <SelectedGuide
                        x1={xStart}
                        x2={xStart}
                        y1={TOP_AXIS_HEIGHT - 4}
                        y2={totalHeight - TIMELINE_BOTTOM_PAD}
                      />
                    </g>
                  )
                })()}

                {/* 막대 / milestone / cluster */}
                <g transform={`translate(${LANE_LABEL_WIDTH}, 0)`} role="list">
                  {renderItems.map((it) => {
                    if (it.kind === 'cluster') {
                      const color = categoryColor(it.category)
                      // 시기 정보 포함 — SR이 위치 인지 가능
                      const sy = Math.round(it.startYear)
                      const ey = Math.round(it.endYear)
                      const yearRange = sy === ey ? `${sy}년` : `${sy}–${ey}년`
                      const ariaLabel = `${it.bars.length}개 사건 모음, ${yearRange}, ${getCategoryName(
                        it.category,
                        dbCategories,
                      )} — Enter로 확대`
                      // cluster 안에 selectedEventId가 포함되면 active 표시
                      const containsSelected =
                        selectedEventId != null &&
                        it.bars.some((b) => b.id === selectedEventId)
                      const badgeText = `+${it.bars.length}`
                      const onActivate = () => activateCluster(it)
                      // cluster pill — 막대와 동일 시각 언어. badge 텍스트 길이에 따라 폭 조정.
                      const clusterPillH = 18
                      const clusterPillW = Math.max(28, badgeText.length * 7 + 14)
                      return (
                        <g key={it.id} role="listitem">
                          <ClusterPill
                            data-bar-id={it.id}
                            data-cluster
                            transform={`translate(${it.cx}, ${it.cy})`}
                            tabIndex={rovingTabIndex(it.id)}
                            role="button"
                            aria-label={ariaLabel}
                            aria-describedby={tooltipIdRef.current}
                            onClick={onActivate}
                            onKeyDown={(e) =>
                              handleClusterKeyDown(e, it, onActivate)
                            }
                            /**
                             * hover/focus 시 cluster 대표 사건(첫 번째)으로 tooltip 노출.
                             * 키보드 네비(↑/↓/←/→)로 cluster에 진입했을 때도 무엇이 들어있는지
                             * 즉시 확인 가능 — 이전엔 cluster에만 tooltip이 빠져 있었음.
                             * SR은 이미 aria-label로 "N개 사건 모음" 안내됨.
                             */
                            onMouseEnter={(e) =>
                              it.bars[0] &&
                              showTooltip(
                                e.currentTarget as SVGGraphicsElement,
                                it.bars[0],
                                {
                                  titles: it.bars.map((bb) => bb.title),
                                  count: it.bars.length,
                                },
                              )
                            }
                            onMouseLeave={hideTooltip}
                            onFocus={(e) => {
                              setFocusedBarId(it.id)
                              if (it.bars[0]) {
                                showTooltip(
                                  e.currentTarget as SVGGraphicsElement,
                                  it.bars[0],
                                  {
                                    titles: it.bars.map((bb) => bb.title),
                                    count: it.bars.length,
                                  },
                                )
                              }
                            }}
                            onBlur={() => {
                              setFocusedBarId((cur) =>
                                cur === it.id ? null : cur,
                              )
                              hideTooltip()
                            }}
                          >
                            <rect
                              x={-clusterPillW / 2}
                              y={-clusterPillH / 2}
                              width={clusterPillW}
                              height={clusterPillH}
                              rx={clusterPillH / 2}
                              fill={`${color}E6`}
                              stroke={color}
                              strokeWidth={1.5}
                            />
                            {/* 활성화 직후 ~700ms 펄스 — 사용자에게 "눌렸다" 시각 피드백 */}
                            {activatedClusterId === it.id && !reducedMotion && (
                              <ClusterPulseRect
                                x={-clusterPillW / 2}
                                y={-clusterPillH / 2}
                                width={clusterPillW}
                                height={clusterPillH}
                                rx={clusterPillH / 2}
                                stroke={color}
                                pointerEvents="none"
                              />
                            )}
                            {/* cluster 안에 선택된 사건 있으면 outline */}
                            {containsSelected && (
                              <rect
                                x={-clusterPillW / 2 - 2}
                                y={-clusterPillH / 2 - 2}
                                width={clusterPillW + 4}
                                height={clusterPillH + 4}
                                rx={(clusterPillH + 4) / 2}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={1.5}
                                style={{ color: '#0f172a' }}
                                pointerEvents="none"
                              />
                            )}
                            <ClusterBadgeText x={0} y={1}>
                              {badgeText}
                            </ClusterBadgeText>
                          </ClusterPill>
                        </g>
                      )
                    }

                    const b = it.bar
                    const color = categoryColor(b.category)
                    const isActive = selectedEventId === b.id
                    const isFocused = focusedBarId === b.id
                    const dim =
                      (hoveredCategory != null &&
                        hoveredCategory !== b.category) ||
                      (hoveredBarId != null && hoveredBarId !== b.id)
                    const importanceLabel = IMPORTANCE_LABEL[b.importance]
                    const ariaLabel = [
                      b.title,
                      `${b.startDate}${b.endDate && b.endDate !== b.startDate ? ` ~ ${b.endDate}` : ''}`,
                      getCategoryName(b.category, dbCategories),
                      b.importance !== 'normal' ? importanceLabel : null,
                    ]
                      .filter(Boolean)
                      .join(', ')

                    const commonHandlers = {
                      tabIndex: rovingTabIndex(b.id),
                      role: 'button' as const,
                      'aria-label': ariaLabel,
                      'aria-pressed': isActive,
                      'aria-describedby': tooltipIdRef.current,
                      'data-bar-id': b.id,
                      onClick: (e: React.MouseEvent<SVGElement>) => {
                        // Shift+클릭 = 라벨 핀 토글, 일반 클릭 = 사건 선택
                        if (e.shiftKey) {
                          e.stopPropagation()
                          togglePinnedLabel(b.id)
                          return
                        }
                        onSelectEvent(b.id)
                      },
                      onKeyDown: (e: React.KeyboardEvent<SVGElement>) =>
                        handleBarKeyDown(e, b),
                      onMouseEnter: (e: React.MouseEvent<SVGElement>) => {
                        setHoveredBarId(b.id)
                        showTooltip(e.currentTarget as SVGGraphicsElement, b)
                      },
                      onMouseLeave: () => {
                        setHoveredBarId(null)
                        hideTooltip()
                      },
                      onFocus: (e: React.FocusEvent<SVGElement>) => {
                        setFocusedBarId(b.id)
                        showTooltip(e.currentTarget as SVGGraphicsElement, b)
                      },
                      onBlur: () => {
                        setFocusedBarId((curr) => (curr === b.id ? null : curr))
                        hideTooltip()
                      },
                    }

                    if (it.kind === 'milestone') {
                      // 다이아 → 작은 pill로 통일 (모양 단순화). 시점 사건은 폭 6px.
                      const pillW = MIN_BAR_WIDTH
                      const pillH = COMPACT_BAR_HEIGHT[b.importance]
                      const rectX = it.cx - pillW / 2
                      const rectY = it.cy - pillH / 2
                      const importantStroke =
                        b.importance === 'critical' || b.importance === 'major'
                      const strokeColor = importantStroke
                        ? color
                        : `${color}80`
                      // 색맹 대응 — importance를 색만이 아닌 패턴/내부 마커로 보강:
                      //   critical: pill 안쪽 흰 dot
                      //   major:    pill 안쪽 빈 ring
                      //   notable:  dashed stroke
                      //   normal:   solid stroke
                      const dashed = b.importance === 'notable'
                      // hit area 확장 — 작은 pill은 그대로 두면 클릭 어려움
                      const hitW = Math.max(pillW + 12, 18)
                      const hitH = Math.max(pillH + 6, 18)
                      // External label y 위치 (4-row staggering)
                      const labelY =
                        it.labelRow === 1
                          ? it.cy + pillH / 2 + 12
                          : it.labelRow === 2
                            ? it.cy - pillH / 2 - 6
                            : it.labelRow === 3
                              ? it.cy + pillH / 2 + 24
                              : it.cy + 3.5
                      return (
                        <g key={it.id} role="listitem">
                          <rect
                            x={it.cx - hitW / 2}
                            y={it.cy - hitH / 2}
                            width={hitW}
                            height={hitH}
                            rx={hitH / 2}
                            fill="transparent"
                            stroke="none"
                            style={{ cursor: 'pointer' }}
                            {...commonHandlers}
                          />
                          <MilestonePill
                            x={rectX}
                            y={rectY}
                            width={pillW}
                            height={pillH}
                            rx={pillW / 2}
                            fill={`${color}E6`}
                            stroke={strokeColor}
                            strokeWidth={importantStroke ? 1.5 : 1}
                            strokeDasharray={dashed ? '2 1.5' : undefined}
                            $active={isActive}
                            $dim={dim}
                            $importance={b.importance}
                            $depth={b.depth}
                            pointerEvents="none"
                          />
                          {b.importance === 'critical' && (
                            <circle
                              cx={it.cx}
                              cy={it.cy}
                              r={1.6}
                              fill="#ffffff"
                              pointerEvents="none"
                            />
                          )}
                          {b.importance === 'major' && (
                            <circle
                              cx={it.cx}
                              cy={it.cy}
                              r={1.8}
                              fill="none"
                              stroke="#ffffff"
                              strokeWidth={1}
                              pointerEvents="none"
                            />
                          )}
                          {(isFocused || isActive) && (
                            <MilestoneOutlinePill
                              x={rectX - 2}
                              y={rectY - 2}
                              width={pillW + 4}
                              height={pillH + 4}
                              rx={(pillW + 4) / 2}
                              $active={isActive}
                              pointerEvents="none"
                            />
                          )}
                          {(it.showExternalLabel || pinnedLabelIds.has(b.id)) && (
                            <ExternalLabel
                              x={it.cx + pillW / 2 + 6}
                              y={labelY}
                              aria-hidden="true"
                              onClick={() => onSelectEvent(b.id)}
                              data-pinned={pinnedLabelIds.has(b.id) ? '1' : undefined}
                            >
                              {truncateBarText(b.title, it.externalLabelWidth)}
                            </ExternalLabel>
                          )}
                        </g>
                      )
                    }

                    // it.kind === 'bar'
                    const rx = b.importance === 'critical' ? 7 : 6
                    const dashedBorder = b.importance === 'notable'
                    const inLabel = it.w > BAR_INSIDE_LABEL_MIN_PX
                    // External label y 위치 (4-row staggering)
                    const labelY =
                      it.labelRow === 1
                        ? it.y + it.h + 12
                        : it.labelRow === 2
                          ? it.y - 4
                          : it.labelRow === 3
                            ? it.y + it.h + 24
                            : it.y + it.h / 2 + 3.5
                    return (
                      <g key={it.id} role="listitem">
                        <Bar
                          x={it.x}
                          y={it.y}
                          width={it.w}
                          height={it.h}
                          rx={rx}
                          fill={`${color}E6`}
                          $active={isActive}
                          $dim={dim}
                          $importance={b.importance}
                          $depth={b.depth}
                          {...commonHandlers}
                        />
                        {dashedBorder && (
                          <NotableDashed
                            x={it.x + 0.75}
                            y={it.y + 0.75}
                            width={Math.max(0, it.w - 1.5)}
                            height={Math.max(0, it.h - 1.5)}
                            rx={Math.max(0, rx - 1)}
                            pointerEvents="none"
                          />
                        )}
                        {isFocused && !isActive && (
                          <FocusOutline
                            x={it.x - 1.5}
                            y={it.y - 1.5}
                            width={it.w + 3}
                            height={it.h + 3}
                            rx={rx + 1}
                            pointerEvents="none"
                          />
                        )}
                        {isActive && (
                          <ActiveOutline
                            x={it.x - 1.5}
                            y={it.y - 1.5}
                            width={it.w + 3}
                            height={it.h + 3}
                            rx={rx + 1}
                            pointerEvents="none"
                          />
                        )}
                        {inLabel && (
                          <BarLabel
                            x={it.x + 6}
                            y={it.y + it.h / 2 + 3.5}
                            pointerEvents="none"
                          >
                            {truncateBarText(b.title, it.w - 12)}
                          </BarLabel>
                        )}
                        {/**
                         * Critical 단축 라벨 — 80px 미만이라 inLabel 못 들어가지만 24px 이상이고
                         * critical인 경우 *축약 첫 글자*만 막대 안에 노출. 외부 라벨이 다른 라벨 충돌로
                         * suppressed돼도 최소한 식별 단서 제공.
                         */}
                        {!inLabel &&
                          b.importance === 'critical' &&
                          it.w >= 24 && (
                            <BarLabelCompact
                              x={it.x + it.w / 2}
                              y={it.y + it.h / 2 + 3.5}
                              pointerEvents="none"
                              aria-hidden="true"
                            >
                              {compactCriticalLabel(b.title)}
                            </BarLabelCompact>
                          )}
                        {/* 막대 안에 라벨 안 들어가면 외부 라벨 시도.
                         * 4-row staggering — 충돌 회피로 노출률 ↑.
                         * 핀(Shift+클릭)된 라벨은 conflict 무관하게 항상 표시. */}
                        {!inLabel &&
                          (it.showExternalLabel || pinnedLabelIds.has(b.id)) && (
                            <ExternalLabel
                              x={it.x + it.w + 6}
                              y={labelY}
                              aria-hidden="true"
                              onClick={() => onSelectEvent(b.id)}
                              data-pinned={
                                pinnedLabelIds.has(b.id) ? '1' : undefined
                              }
                            >
                              {truncateBarText(b.title, it.externalLabelWidth)}
                            </ExternalLabel>
                          )}
                      </g>
                    )
                  })}
                </g>
              </SvgRoot>
            )}

            {tooltip && (
              <Tooltip
                id={tooltipIdRef.current}
                role="tooltip"
                style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
              >
                {tooltip.cluster ? (
                  /* 클러스터 — 묶인 사건들의 제목을 직접 나열해 "여기 뭐가 있나"를 확대 없이 노출 */
                  <>
                    <TooltipTitle>
                      밀집 사건 {tooltip.cluster.count}건
                    </TooltipTitle>
                    {tooltip.cluster.titles.slice(0, 5).map((t, i) => (
                      <TooltipClusterItem key={i}>{t}</TooltipClusterItem>
                    ))}
                    {tooltip.cluster.count > 5 && (
                      <TooltipMeta>
                        +{tooltip.cluster.count - 5}건 더 · 클릭 시 확대
                      </TooltipMeta>
                    )}
                  </>
                ) : (
                  <>
                    <TooltipTitle>{tooltip.bar.title}</TooltipTitle>
                    <TooltipMeta>
                      {tooltip.bar.startDate}
                      {tooltip.bar.endDate &&
                      tooltip.bar.endDate !== tooltip.bar.startDate
                        ? ` ~ ${tooltip.bar.endDate}`
                        : ''}
                    </TooltipMeta>
                    <TooltipMeta>
                      {getCategoryName(tooltip.bar.category, dbCategories)}
                      {tooltip.bar.importance !== 'normal' &&
                        ` · ${IMPORTANCE_LABEL[tooltip.bar.importance]}`}
                    </TooltipMeta>
                  </>
                )}
              </Tooltip>
            )}

            {/**
             * Cluster popover — zoom 포화 fallback. cluster 위치 바로 아래에 띄움.
             * overflow popover와 동일한 컴포넌트(시각 일관성), 헤더 카피만 다름.
             */}
            {clusterPopoverId &&
              (() => {
                const cluster = renderItems.find(
                  (r): r is RenderCluster =>
                    r.kind === 'cluster' && r.id === clusterPopoverId,
                )
                if (!cluster) return null
                const list = cluster.bars
                if (list.length === 0) return null
                return (
                  <OverflowPopover
                    data-cluster-popover
                    role="dialog"
                    aria-label={`밀집 사건 ${list.length}건`}
                    style={{
                      top: `${cluster.cy + 14}px`,
                      left: `${LANE_LABEL_WIDTH + cluster.cx}px`,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <OverflowPopoverHeader>
                      밀집 사건 {list.length}건 · 더 확대 불가
                      <OverflowPopoverClose
                        type="button"
                        onClick={() => setClusterPopoverId(null)}
                        aria-label="닫기"
                      >
                        ×
                      </OverflowPopoverClose>
                    </OverflowPopoverHeader>
                    <OverflowPopoverList>
                      {list.slice(0, 20).map((b) => (
                        <OverflowPopoverItem
                          key={b.id}
                          type="button"
                          onClick={() => {
                            onSelectEvent(b.id)
                            setClusterPopoverId(null)
                          }}
                        >
                          <OverflowPopoverYear>
                            {formatYearLabel(b.startYear)}
                          </OverflowPopoverYear>
                          <span>{b.title}</span>
                        </OverflowPopoverItem>
                      ))}
                      {list.length > 20 && (
                        <OverflowPopoverHint>
                          + {list.length - 20}건 더 있음
                        </OverflowPopoverHint>
                      )}
                    </OverflowPopoverList>
                  </OverflowPopover>
                )
              })()}

            {/* +N 배지 클릭 시 가려진 사건 목록 popover — ScrollHost 안에 절대 위치, 가로 스크롤과 함께 이동 */}
            {overflowPopoverLane &&
              (() => {
                const laneIdx = visibleLanes.findIndex(
                  (l) => l.key === overflowPopoverLane,
                )
                if (laneIdx === -1) return null
                const yTop = TOP_AXIS_HEIGHT + laneIdx * LANE_HEIGHT
                const list =
                  laneBarOverflowBars.get(overflowPopoverLane) ?? []
                if (list.length === 0) return null
                return (
                  <OverflowPopover
                    data-overflow-popover
                    role="dialog"
                    aria-label={`가려진 사건 ${list.length}건`}
                    style={{
                      top: `${yTop + LANE_HEIGHT / 2 - 12}px`,
                      left: `${LANE_LABEL_WIDTH + 8}px`,
                    }}
                  >
                    <OverflowPopoverHeader>
                      가려진 사건 {list.length}건
                      <OverflowPopoverClose
                        type="button"
                        onClick={() => setOverflowPopoverLane(null)}
                        aria-label="닫기"
                      >
                        ×
                      </OverflowPopoverClose>
                    </OverflowPopoverHeader>
                    <OverflowPopoverList>
                      {list.slice(0, 20).map((b) => (
                        <OverflowPopoverItem
                          key={b.id}
                          type="button"
                          onClick={() => {
                            onSelectEvent(b.id)
                            setOverflowPopoverLane(null)
                          }}
                        >
                          <OverflowPopoverYear>
                            {formatYearLabel(b.startYear)}
                          </OverflowPopoverYear>
                          <span>{b.title}</span>
                        </OverflowPopoverItem>
                      ))}
                      {list.length > 20 && (
                        <OverflowPopoverHint>
                          + {list.length - 20}건 더 있음 — 줌 인해 보세요
                        </OverflowPopoverHint>
                      )}
                    </OverflowPopoverList>
                  </OverflowPopover>
                )
              })()}
            </ScrollHost>
            {/**
             * 사건 레일 — 현재 보이는 연도 구간의 *모든* 사건을 시간순 이름 목록으로.
             * 막대 라벨이 가려져도 여기서 무슨 사건이 있는지 읽고 클릭해 선택할 수 있다.
             * 좁은 화면(<860px)에서는 타임라인 폭을 우선해 숨김(EventRail 미디어쿼리).
             */}
            <EventRail aria-label="현재 보이는 구간의 사건 목록">
              <EventRailHeader>
                <EventRailTitle>이 구간 사건</EventRailTitle>
                <EventRailCount>
                  {viewportBars.total.toLocaleString()}건
                  {(hasMore || isFetchingMore) && (
                    <EventRailLoading
                      aria-label="사건 더 불러오는 중"
                      title="전체 사건 불러오는 중…"
                    />
                  )}
                </EventRailCount>
              </EventRailHeader>
              {viewportBars.items.length === 0 ? (
                <EventRailEmpty>
                  이 구간에 사건이 없습니다.
                  <br />
                  좌우로 이동하거나 축소해 보세요.
                </EventRailEmpty>
              ) : (
                <EventRailList>
                  {viewportBars.items.map((b) => (
                    <EventRailRow
                      key={b.id}
                      type="button"
                      $active={b.id === selectedEventId}
                      $hovered={b.id === hoveredBarId}
                      onClick={() => onSelectEvent(b.id)}
                      onMouseEnter={() => setHoveredBarId(b.id)}
                      onMouseLeave={() => setHoveredBarId(null)}
                      title={`${b.title} · ${formatYearLabel(b.startYear)}`}
                    >
                      <EventRailDot
                        style={{ background: categoryColor(b.category) }}
                        aria-hidden="true"
                      />
                      <EventRailYear>
                        {formatYearLabel(b.startYear)}
                      </EventRailYear>
                      <EventRailLabel>{b.title}</EventRailLabel>
                    </EventRailRow>
                  ))}
                  {viewportBars.total > viewportBars.items.length && (
                    <EventRailMore>
                      +
                      {(
                        viewportBars.total - viewportBars.items.length
                      ).toLocaleString()}
                      건 더 — 확대하거나 필터로 좁혀 보세요
                    </EventRailMore>
                  )}
                </EventRailList>
              )}
            </EventRail>
            </TimelineBody>
          </>
        )}
      </TimelineCard>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Critical 사건의 *축약 첫 글자 라벨* — 막대 폭이 좁아 80px 풀 라벨이 못 들어갈 때
 * 의미 있는 첫 1~2자만 노출. CJK는 1자, ASCII는 약 2자.
 *  - "6.25 전쟁" → "6.2"
 *  - "임진왜란" → "임"
 *  - "WWII" → "WW"
 */
function compactCriticalLabel(title: string): string {
  if (!title) return ''
  const trimmed = title.trim()
  // CJK 시작이면 첫 1자, ASCII 시작이면 첫 2자
  if (CJK_RE.test(trimmed[0])) return trimmed.slice(0, 1)
  // 숫자.숫자 패턴(예: "6.25")이면 첫 3자
  if (/^\d+\.\d/.test(trimmed)) return trimmed.slice(0, 3)
  return trimmed.slice(0, 2)
}

/**
 * 연도 라벨 포맷 — BC/AD 처리.
 * - y > 0 : "1950" (그대로)
 * - y === 0 : 그레고리력에서 0년 없음 → "1 BC"로 처리
 * - y < 0 : "BC 57"
 */
function formatYearLabel(y: number): string {
  if (y > 0) return String(y)
  if (y === 0) return '1 BC'
  return `BC ${-y}`
}

function isInEditableElement(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    (el?.isContentEditable ?? false)
  )
}

function truncateLabel(label: string, maxChars: number): string {
  return label.length > maxChars ? `${label.slice(0, maxChars - 1)}…` : label
}

/**
 * 막대 안 텍스트 — CJK/ASCII 가중치로 truncation 정확도 ↑.
 * 끝에 ellipsis(약 7px) 자리가 남으면 마지막 글자까지 살리고 "…" 추가;
 * 자리 없으면 한 글자 제거해 "…"가 들어가게. 이전엔 무조건 한 글자 빼서
 * 평균 1자 더 잘려 보였다.
 */
const ELLIPSIS_PX = 7
function truncateBarText(title: string, widthPx: number): string {
  let acc = 0
  let cut = title.length
  for (let i = 0; i < title.length; i++) {
    const w = CJK_RE.test(title[i]) ? CJK_CHAR_PX : ASCII_CHAR_PX
    if (acc + w > widthPx) {
      cut = i
      break
    }
    acc += w
  }
  if (cut >= title.length) return title
  if (cut <= 0) return ''
  // 마지막 글자(cut-1)까지 표시한 acc로 ellipsis가 들어갈 자리 있는지 확인
  if (acc + ELLIPSIS_PX <= widthPx) {
    return `${title.slice(0, cut)}…`
  }
  // 자리 없으면 마지막 글자 제거 후 ellipsis
  return cut === 1 ? title.slice(0, 1) : `${title.slice(0, cut - 1)}…`
}

// ─────────────────────────────────────────────────────────────────────────────
// styled
// ─────────────────────────────────────────────────────────────────────────────

const cardBase = css`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(20,19,34,0.08)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#ffffff'};
`

/** 첫 진입 코치마크 — TimelineCard 상단 인라인 배너. localStorage 1회 노출 후 dismiss. */
const OnboardingTip = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 10px 14px 0;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(147, 197, 253, 0.22)'
        : 'rgba(37, 99, 235, 0.2)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(37, 99, 235, 0.08)'
      : 'rgba(37, 99, 235, 0.04)'};
  flex-wrap: wrap;
`

const OnboardingTipBody = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex-wrap: wrap;
`

const OnboardingTipTitle = styled.span`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const OnboardingTipList = styled.ul`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11.5px;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    padding: 1px 5px;
    border-radius: 4px;
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas,
      monospace;
    font-size: 10.5px;
    font-weight: 600;
    line-height: 1;
    ${({ theme }) =>
      theme.mode === 'dark'
        ? `background: rgba(255,255,255,0.08);
           border: 1px solid rgba(255,255,255,0.12);
           color: rgba(226, 232, 240, 0.85);`
        : `background: #ffffff;
           border: 1px solid rgba(15,23,42,0.12);
           color: #475569;`}
  }
`

const OnboardingTipDismiss = styled.button`
  flex-shrink: 0;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: ${BRAND.primary};
  color: #ffffff;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  cursor: pointer;
  font-family: inherit;
  transition: background ${MOTION.fast};

  &:hover {
    background: ${BRAND.primaryHover};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
`

const MinimapCard = styled.section`
  ${cardBase}
  flex: 0 0 152px;

  @media (max-width: 768px) {
    flex: 0 0 110px;
  }
`

const TimelineCard = styled.section`
  ${cardBase}
  flex: 1;
  min-height: 0;
`

const CardHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  flex-wrap: wrap;
`

const CardTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
`

const CardTitle = styled.h3`
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CardHint = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const HeaderActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;

  @media (max-width: 1024px) {
    & > [aria-label^='카테고리 색 범례'] {
      display: none;
    }
  }
`

const ZoomControls = styled.div`
  display: inline-flex;
  align-items: stretch;
  height: 26px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.12)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc'};
`

/* lane 그룹 토글 (segmented) — ZoomControls와 동일 외형 */
const GroupByControls = styled.div`
  display: inline-flex;
  align-items: stretch;
  height: 26px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.12)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc'};
`

const GroupBySegment = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  border: none;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.10)'
        : '#ffffff'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.colors.text.primary
      : theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  letter-spacing: -0.005em;
  cursor: pointer;
  transition: background ${MOTION.fast}, color ${MOTION.fast};

  & + & {
    border-left: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(255,255,255,0.08)'
          : 'rgba(15,23,42,0.08)'};
  }

  &:hover:not([aria-checked='true']) {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(15,23,42,0.04)'};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
    z-index: 1;
  }
`

const ZoomButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: background ${MOTION.fast};

  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(15,23,42,0.04)'};
    color: ${BRAND.primary};
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
    background: ${BRAND.primarySoft};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const ZoomReadout = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  padding: 0 4px;
  border: none;
  background: transparent;
  border-left: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
  border-right: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  font-family: inherit;
  transition: background ${MOTION.fast}, color ${MOTION.fast};

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(15,23,42,0.04)'};
    color: ${BRAND.primary};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/* zoom % dropdown wrapper — ZoomReadout 외부 감싸 popover 절대 위치 anchor */
const ZoomMenuWrap = styled.div`
  position: relative;
  display: inline-flex;
  align-items: stretch;
`

const ZoomMenu = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 100;
  min-width: 120px;
  padding: 4px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? `background: #18181b;
         border: 1px solid rgba(255,255,255,0.08);
         box-shadow: 0 12px 32px rgba(0,0,0,0.45);`
      : `background: #ffffff;
         border: 1px solid rgba(15,23,42,0.08);
         box-shadow: 0 12px 32px rgba(15,23,42,0.12);`}
`

const ZoomMenuItem = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  border: none;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(37,99,235,0.18)'
        : 'rgba(37,99,235,0.08)'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? BRAND.primary : theme.colors.text.primary};
  font-family: inherit;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  font-variant-numeric: tabular-nums;
  text-align: left;
  cursor: pointer;
  border-radius: 5px;
  transition: background 0.12s, color 0.12s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(15,23,42,0.05)'};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
`

const ZoomMenuHint = styled.span`
  font-size: 10px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ZoomMenuDivider = styled.span`
  height: 1px;
  margin: 3px 4px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'};
`

/* Export 버튼/메뉴 */
const ExportWrap = styled.div`
  position: relative;
  flex-shrink: 0;
`

const ShapeLegendWrap = styled.div`
  position: relative;
  flex-shrink: 0;
`

/* 연도 직접 점프 input — placeholder는 현재 viewport 연도 범위.
 * focus되지 않은 상태에서는 차분한 readout처럼 보이도록 톤 정렬. */
const YearJumpInput = styled.input`
  width: 110px;
  height: 28px;
  padding: 0 8px;
  border-radius: 6px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
  transition: border-color 0.15s, background 0.15s;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
    font-weight: 600;
  }

  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.16)'
        : 'rgba(15,23,42,0.16)'};
  }

  &:focus {
    outline: none;
    border-color: ${BRAND.primary};
    box-shadow: ${BRAND.focusRing};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#ffffff'};
  }

  /* 숫자 input의 spinner 제거 — 좁은 폭에서 시각 노이즈 */
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  & {
    -moz-appearance: textfield;
  }
`

/* viewport 안 critical 사건 chip 행 — CardHeader 바로 아래, 라벨 가려져도 핵심 식별 가능 */
/* ── 사건 레일 — ScrollHost 우측, 뷰포트 구간의 모든 사건을 이름으로 ───────────── */

/** ScrollHost(가로 타임라인) + EventRail(세로 목록)을 한 행으로 묶는 컨테이너 */
const TimelineBody = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
`

const railSpin = keyframes`
  to { transform: rotate(360deg); }
`

const EventRail = styled.aside`
  flex: 0 0 232px;
  width: 232px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-left: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.015)' : 'rgba(15,23,42,0.012)'};

  /* 좁은 화면에서는 가로 타임라인 폭을 우선해 레일을 숨긴다. */
  @media (max-width: 860px) {
    display: none;
  }
`

const EventRailHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 12px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
`

const EventRailTitle = styled.span`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EventRailCount = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const EventRailLoading = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1.5px solid ${BRAND.primarySoftHover};
  border-top-color: ${BRAND.primaryFill};
  animation: ${railSpin} 0.7s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const EventRailList = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${BRAND.primarySoftHover};
    border-radius: 3px;
  }
`

const EventRailRow = styled.button<{ $active?: boolean; $hovered?: boolean }>`
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 5px 7px;
  border: none;
  border-radius: 6px;
  background: ${({ $active, $hovered, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(37,99,235,0.18)'
        : 'rgba(37,99,235,0.08)'
      : $hovered
        ? theme.mode === 'dark'
          ? 'rgba(255,255,255,0.06)'
          : 'rgba(15,23,42,0.05)'
        : 'transparent'};
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s;

  &:hover {
    background: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(37,99,235,0.22)'
          : 'rgba(37,99,235,0.1)'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.05)'
          : 'rgba(15,23,42,0.04)'};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
`

const EventRailDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
`

const EventRailYear = styled.span`
  flex-shrink: 0;
  min-width: 38px;
  font-size: 10.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const EventRailLabel = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const EventRailEmpty = styled.div`
  padding: 18px 14px;
  font-size: 11.5px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-align: center;
`

const EventRailMore = styled.div`
  padding: 8px 9px 4px;
  font-size: 10.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/* 일부 카테고리 숨김 알림 — CardHeader 아래, ScrollHost 위 */
const HiddenCatStrip = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 14px;
  margin: 0 0 6px;
  border-radius: 8px;
  font-size: 11.5px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? `background: rgba(245,158,11,0.08);
         border: 1px solid rgba(245,158,11,0.2);
         color: #fcd34d;`
      : `background: rgba(245,158,11,0.06);
         border: 1px solid rgba(245,158,11,0.18);
         color: #92400e;`}

  span {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  strong {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
`

const HiddenCatStripButton = styled.button`
  flex-shrink: 0;
  padding: 3px 9px;
  border-radius: 5px;
  border: 1px solid currentColor;
  background: transparent;
  color: inherit;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba(245, 158, 11, 0.12);
  }
`

const ShapeLegendPopover = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 100;
  width: 260px;
  padding: 12px 14px 10px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? `background: #18181b;
         border: 1px solid rgba(255,255,255,0.08);
         box-shadow: 0 12px 32px rgba(0,0,0,0.45);`
      : `background: #ffffff;
         border: 1px solid rgba(15,23,42,0.08);
         box-shadow: 0 12px 32px rgba(15,23,42,0.12);`}
`

const ShapeLegendTitle = styled.div`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-bottom: 2px;
`

const ShapeLegendRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const ShapeLegendIcon = styled.span`
  flex-shrink: 0;
  width: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
`

const ShapeLegendText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;

  strong {
    font-size: 12px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  span {
    font-size: 11px;
    color: ${({ theme }) => theme.colors.text.tertiary};
    line-height: 1.4;
  }
`

const ShapeLegendDivider = styled.span`
  height: 1px;
  margin: 4px 0 2px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'};
`

const ShapeLegendHint = styled.div`
  font-size: 10.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-align: center;
`

const ExportButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 26px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.12)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc'};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  cursor: pointer;
  font-family: inherit;
  transition: background ${MOTION.fast}, border-color ${MOTION.fast},
    color ${MOTION.fast};

  /* 1024px 이하 — 라벨 sr-only로 떨어짐 (icon만) */
  & > span {
    @media (max-width: 1024px) {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  }

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(15,23,42,0.04)'};
    color: ${BRAND.primary};
    border-color: ${BRAND.primaryBorder};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const ExportMenu = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 20;
  min-width: 180px;
  padding: 4px;
  border-radius: 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#1c1c20' : '#ffffff'};
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.15);
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const ExportMenuItem = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  font-family: inherit;
  transition: background ${MOTION.fast};

  &:hover {
    background: ${BRAND.primarySoft};
    color: ${BRAND.primary};
  }

  &:focus-visible {
    outline: none;
    background: ${BRAND.primarySoft};
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/* 11+ 카테고리 — 한 줄에 다 안 들어가면 가로 스크롤 (헤더 줄 wrap 방지). */
const Legend = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px 8px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex: 0 1 auto;
  max-width: 60%;
  justify-content: flex-end;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x proximity;
  scrollbar-width: thin;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.12)'
        : 'rgba(15,23,42,0.12)'};
    border-radius: 999px;
  }

  /* 한 줄 안에서 wrap 안 되게 */
  & > button {
    scroll-snap-align: start;
    flex-shrink: 0;
  }
`

const LegendItem = styled.button<{ $dim?: boolean; $hidden?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  padding: 2px 4px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  font-size: 11px;
  font-weight: ${({ $hidden }) => ($hidden ? 400 : 500)};
  color: inherit;
  /* hidden 카테고리 — strikethrough + opacity */
  text-decoration: ${({ $hidden }) => ($hidden ? 'line-through' : 'none')};
  opacity: ${({ $dim, $hidden }) => ($hidden ? 0.45 : $dim ? 0.5 : 1)};
  transition: opacity ${MOTION.fast}, background ${MOTION.fast};

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(15,23,42,0.04)'};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const LegendShowAll = styled.button`
  margin-left: 4px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  border: 1px solid ${BRAND.primaryBorder};
  background: ${BRAND.primarySoft};
  color: ${BRAND.primary};
  cursor: pointer;
  font-family: inherit;
  transition: background ${MOTION.fast};

  &:hover {
    background: ${BRAND.primarySoftHover};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const LegendDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
`

const Minimap = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 100%;
  padding: 8px 14px 8px;
  overflow-x: auto;
  overflow-y: hidden;
  flex: 1;
  min-height: 0;
  cursor: grab;
  touch-action: pan-x;

  &:active {
    cursor: grabbing;
  }

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${BRAND.primarySoftHover};
    border-radius: 2px;
  }
`

const MinimapBar = styled.button`
  position: relative;
  flex: 1 0 20px;
  min-width: 20px;
  max-width: 56px;
  height: 100%;
  padding: 0 1px;
  border: none;
  background: transparent;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: stretch;
  gap: 4px;
  cursor: pointer;
  border-radius: 4px;
  transition: background ${MOTION.fast};

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? BRAND.primarySoftDark : BRAND.primarySoft};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  &:hover::after {
    content: attr(data-count);
    position: absolute;
    bottom: calc(100% + 2px);
    left: 50%;
    transform: translateX(-50%);
    padding: 3px 7px;
    border-radius: 4px;
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(28, 28, 32, 0.96)'
        : 'rgba(15, 23, 42, 0.94)'};
    color: #ffffff;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: -0.005em;
    white-space: nowrap;
    pointer-events: none;
    z-index: 5;
    font-variant-numeric: tabular-nums;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/**
 * 미니맵 한 decade 막대 — 자식 MinimapBarSegment(카테고리별)로 stacked 채움.
 * segments가 없거나 막대 높이가 너무 낮으면(<4px) fallback 단색이 보임.
 * - $inViewport: 사용자가 현재 보는 시기면 BRAND.primary fallback / segments는 full opacity
 * - $thin: 막대가 매우 얇을 때 corner radius 제거(픽셀 더트 방지)
 */
const MinimapBarFill = styled.div<{ $inViewport: boolean; $thin: boolean }>`
  width: 100%;
  border-radius: ${({ $thin }) => ($thin ? '0' : '3px 3px 0 0')};
  background: ${({ $inViewport, theme }) =>
    $inViewport
      ? BRAND.primary
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.18)'
        : 'rgba(15, 23, 42, 0.18)'};
  flex-shrink: 0;
  display: flex;
  flex-direction: column-reverse;
  overflow: hidden;
  transition: background ${MOTION.base};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/** 카테고리 1개의 stack segment — flexGrow=count로 비율 정해짐 (inline style) */
const MinimapBarSegment = styled.div`
  flex-shrink: 1;
  flex-basis: 0;
  min-height: 1px;
  transition: opacity ${MOTION.base};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const MinimapBarLabel = styled.span`
  font-size: 9.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  pointer-events: none;
  text-align: center;
  flex-shrink: 0;
  line-height: 1;
  font-variant-numeric: tabular-nums;
`

const MinimapBarLabelSpacer = styled.span`
  height: 11px;
  flex-shrink: 0;
`

const ScrollHost = styled.div<{ $panning?: boolean }>`
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: auto;
  cursor: ${({ $panning }) => ($panning ? 'grab' : 'auto')};

  /* 터치 환경에서 OS 기본 핀치줌·당겨서 새로고침 차단 — 자체 핀치/팬 핸들러가 처리.
   * pan-y만 허용해 세로 스크롤은 OS에 양보, 가로 패닝·핀치 줌은 우리가 잡는다.
   * (이전 pinch-zoom 포함 시 OS와 동시 발동되어 우리 zoom 상태가 미세 어긋났음.) */
  touch-action: pan-y;

  &::-webkit-scrollbar {
    width: 6px;
    height: 8px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${BRAND.primarySoftHover};
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${BRAND.primaryFill};
  }
`

const SvgRoot = styled.svg`
  display: block;
  font-family: inherit;

  &:focus {
    outline: none;
  }
`

/**
 * Overflow popover — 가려진 사건 목록.
 * ScrollHost 안에 절대 위치 → 가로 스크롤과 함께 자연스럽게 이동.
 * lane 한계로 가려진 사건들이 시간순으로 나열됨 — 클릭 시 그 사건 선택.
 */
const OverflowPopover = styled.div`
  position: absolute;
  z-index: 50;
  width: 280px;
  max-height: 280px;
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? `background: #18181b;
         border: 1px solid rgba(255,255,255,0.1);
         box-shadow: 0 12px 32px rgba(0,0,0,0.5);`
      : `background: #ffffff;
         border: 1px solid rgba(15,23,42,0.1);
         box-shadow: 0 12px 32px rgba(15,23,42,0.16);`}
`

const OverflowPopoverHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px 6px 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'};
`

const OverflowPopoverClose = styled.button`
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(15,23,42,0.06)'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const OverflowPopoverList = styled.div`
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 4px;
`

const OverflowPopoverItem = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.primary};
  transition: background 0.12s;

  & > span {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(15,23,42,0.04)'};
  }
`

const OverflowPopoverYear = styled.span`
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  width: 48px;
`

const OverflowPopoverHint = styled.div`
  padding: 6px 10px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-align: center;
`

const TickLine = styled.line<{ $major?: boolean }>`
  stroke: ${({ theme, $major }) =>
    $major
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.18)'
        : 'rgba(15,23,42,0.16)'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.08)'
        : 'rgba(15,23,42,0.08)'};
  stroke-width: ${({ $major }) => ($major ? 1.25 : 1)};
  stroke-dasharray: ${({ $major }) => ($major ? 'none' : '2 4')};
`

const TickLabel = styled.text`
  font-size: 11.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  fill: ${({ theme }) => theme.colors.text.secondary};
`

const LaneBg = styled.rect<{ $alt: boolean; $highlighted?: boolean }>`
  fill: ${({ theme, $alt, $highlighted }) =>
    $highlighted
      ? theme.mode === 'dark'
        ? 'rgba(37, 99, 235, 0.07)'
        : 'rgba(37, 99, 235, 0.05)'
      : $alt
        ? theme.mode === 'dark'
          ? 'rgba(255,255,255,0.04)'
          : 'rgba(37, 99, 235,0.045)'
        : 'transparent'};
  transition: fill ${MOTION.fast};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/**
 * Lane label sticky 배경 — 우측 스크롤 시 lane label 그룹이 viewport 좌측에 고정될 때
 * 뒤쪽 막대/density가 *비치지 않도록* 카드 배경색으로 덮음.
 *
 * surface는 TimelineCard 배경과 일치 — 다크는 `rgba(255,255,255,0.012)` 같은 미세 알파가
 * 아닌 *완전 불투명*이어야 가림이 보장. 라이트도 흰색.
 */
const LaneLabelBg = styled.rect`
  fill: ${({ theme }) => (theme.mode === 'dark' ? '#0f0f12' : '#ffffff')};
`

/* sticky label 그룹의 우측 경계 hairline — 본문과 라벨 영역 시각 분리 */
const LaneLabelDivider = styled.line`
  stroke: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)'};
  stroke-width: 1;
`

const LaneLabel = styled.text`
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  text-anchor: end;
  fill: ${({ theme }) => theme.colors.text.secondary};
`

const LaneDot = styled.circle``

/**
 * 겹침으로 숨겨진 bar 수 표시 — 라벨 영역 우하단 작은 pill.
 * tertiary 톤이라 시선 분산 최소화.
 */
const LaneOverflowBadge = styled.g`
  pointer-events: auto;
  cursor: help;

  rect {
    fill: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'};
    stroke: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.12)'};
    stroke-width: 1;
  }

  text {
    font-size: 10px;
    font-weight: 700;
    fill: ${({ theme }) => theme.colors.text.tertiary};
    letter-spacing: 0.02em;
    font-variant-numeric: tabular-nums;
    dominant-baseline: middle;
  }
`

/**
 * Bar opacity:
 *   - dim (다른 카테고리 hover 중): 0.4 (이전 0.25에서 완화 — 정보 유지)
 *   - notable/normal: 0.7
 *   - critical/major: 1.0
 *   - hover/focus: 1.0 (dim 무시)
 */
const Bar = styled.rect<{
  $active: boolean
  $dim: boolean
  $importance: BarData['importance']
  $depth: number
}>`
  cursor: pointer;
  transition: opacity ${MOTION.fast};
  opacity: ${({ $importance, $dim, $depth }) => {
    if ($dim) return 0.4
    const base =
      $importance === 'normal' || $importance === 'notable' ? 0.7 : 1
    /* 자식(depth>0) 톤 다운 — 부모/형제 사건과 시각 위계 분리 */
    return $depth > 0 ? base * 0.65 : base
  }};

  &:hover,
  &:focus {
    opacity: 1;
  }

  &:focus {
    outline: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/**
 * Milestone pill — 짧은 사건(시점)의 인코딩. 다이아 → 작은 가로 pill로 통일.
 * Bar와 동일한 opacity/dim/active 의미.
 */
const MilestonePill = styled.rect<{
  $active: boolean
  $dim: boolean
  $importance: BarData['importance']
  $depth: number
}>`
  cursor: pointer;
  transition: opacity ${MOTION.fast}, stroke-width ${MOTION.fast};
  opacity: ${({ $importance, $dim, $depth }) => {
    if ($dim) return 0.4
    const base =
      $importance === 'normal' || $importance === 'notable' ? 0.7 : 1
    return $depth > 0 ? base * 0.65 : base
  }};

  &:hover,
  &:focus {
    opacity: 1;
    stroke-width: 2.5;
  }

  &:focus {
    outline: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/**
 * Milestone pill active/focus outline — Bar의 ActiveOutline/FocusOutline에 대응.
 * focus(미선택)는 dashed BRAND.primary 2px, active(선택)는 단색 darker 1.5px.
 */
const MilestoneOutlinePill = styled.rect<{ $active: boolean }>`
  fill: none;
  stroke: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#ffffff'
        : '#0f172a'
      : BRAND.primary};
  stroke-width: ${({ $active }) => ($active ? 1.5 : 2)};
  stroke-dasharray: ${({ $active }) => ($active ? 'none' : '3 2')};
  paint-order: stroke;
`

/**
 * Cluster — 같은 lane × 5px 이내 milestone 3개+ 묶음.
 * pill 모양 + "+N" 텍스트. 클릭 시 줌 + 점프.
 */
const ClusterPill = styled.g`
  cursor: pointer;
  transition: opacity ${MOTION.fast};

  & rect {
    transition: opacity ${MOTION.fast};
  }

  &:hover rect,
  &:focus rect {
    opacity: 1;
  }

  &:focus {
    outline: none;
  }

  &:focus rect {
    stroke-width: 2.5;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    & rect {
      transition: none;
    }
  }
`

/**
 * 클러스터 활성화 직후 700ms 동안 외곽으로 퍼지면서 사라지는 링.
 * fill 없이 stroke만, scale + opacity 동시 변화.
 */
const clusterPulseAnim = keyframes`
  0% {
    transform: scale(1);
    opacity: 0.85;
    stroke-width: 2;
  }
  100% {
    transform: scale(2.4);
    opacity: 0;
    stroke-width: 1;
  }
`

const ClusterPulseRect = styled.rect`
  fill: none;
  transform-origin: center;
  transform-box: fill-box;
  animation: ${clusterPulseAnim} 0.7s ease-out forwards;
`

const ClusterBadgeText = styled.text`
  font-size: 10px;
  font-weight: 700;
  fill: #ffffff;
  text-anchor: middle;
  dominant-baseline: middle;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
`

/**
 * 외부 라벨 — 막대/milestone이 좁아 안에 라벨 못 넣을 때 우측 옆에 표시.
 * `paint-order: stroke` + 배경색 stroke로 outline 효과 — LaneBg highlighted 위에서도 가독.
 * 클릭 가능 (hit-area).
 */
const ExternalLabel = styled.text`
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  fill: ${({ theme }) => theme.colors.text.primary};
  paint-order: stroke;
  stroke: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(15, 15, 15, 0.95)' : 'rgba(255, 255, 255, 0.92)'};
  stroke-width: 3;
  stroke-linejoin: round;
  cursor: pointer;

  /* Shift+클릭으로 핀된 라벨은 indigo 배경 stroke + bold로 시각 차별화 */
  &[data-pinned='1'] {
    font-weight: 800;
    stroke: ${BRAND.primary};
    stroke-width: 3.5;
    fill: #ffffff;
  }
`

/* notable importance dashed inner border — normal과 패턴 차등 (색맹 보조) */
const NotableDashed = styled.rect`
  fill: none;
  stroke: rgba(255, 255, 255, 0.5);
  stroke-width: 1;
  stroke-dasharray: 3 2;
`

/* Active outline — 선택 시 */
/**
 * Active outline — 선택된 막대 강조.
 *  - light: 다크 컬러 stroke
 *  - dark : 흰색 stroke + 살짝의 outer halo로 다크 배경에서도 또렷하게 (이전 1.5px는 작은 막대에서 불명확)
 */
const ActiveOutline = styled.rect`
  fill: none;
  stroke: ${({ theme }) => (theme.mode === 'dark' ? '#ffffff' : '#0f172a')};
  stroke-width: 2;
  paint-order: stroke;
  filter: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'drop-shadow(0 0 3px rgba(37, 99, 235, 0.6))'
      : 'drop-shadow(0 0 2px rgba(37, 99, 235, 0.35))'};
`

/**
 * Focus outline — 키보드 포커스만(선택 안 됨). 1.5px이라 잘 안 보였던 케이스를
 * 보강: stroke 2px + paint-order로 fill 위에 그려 글자에 가려지지 않게.
 */
const FocusOutline = styled.rect`
  fill: none;
  stroke: ${BRAND.primary};
  stroke-width: 2;
  stroke-dasharray: 3 2;
  paint-order: stroke;
`

/* SelectedRangeBg — alpha 강화 + lane highlight 누적 회피 */
const SelectedRangeBg = styled.rect<{ $dimmed?: boolean }>`
  fill: ${({ theme, $dimmed }) => {
    const a = $dimmed ? 0.07 : theme.mode === 'dark' ? 0.16 : 0.12
    return `rgba(37, 99, 235, ${a})`
  }};
`

const SelectedGuide = styled.line`
  stroke: ${BRAND.primaryBorderHover};
  stroke-width: 2;
`

/* TodayLine — TickLine과 같은 dasharray 패턴(2 4) — 점선 패턴 통일 */
const TodayLine = styled.line`
  stroke: #dc2626;
  stroke-width: 1.5;
  stroke-dasharray: 2 4;
`

const TodayLabelBg = styled.rect`
  fill: #dc2626;
`

const TodayLabelText = styled.text`
  font-size: 10.5px;
  font-weight: 700;
  fill: #ffffff;
  text-anchor: middle;
  letter-spacing: -0.005em;
`

const BarLabel = styled.text`
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  fill: #ffffff;
`

/* 좁은 critical 막대 안 *축약* 라벨 — 첫 1~3자만 가운데 정렬. */
const BarLabelCompact = styled.text`
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0;
  fill: #ffffff;
  text-anchor: middle;
`

const Tooltip = styled.div`
  position: absolute;
  transform: translate(-50%, -100%);
  pointer-events: none;
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 12px;
  z-index: 10;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? `
    background: rgba(28, 28, 32, 0.96);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  `
      : `
    background: rgba(15, 23, 42, 0.94);
    border: 1px solid rgba(15, 23, 42, 0.9);
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.14);
  `}
  color: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 280px;
  white-space: normal;
`

const TooltipTitle = styled.div`
  font-weight: 700;
  letter-spacing: -0.01em;
`

const TooltipMeta = styled.div`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.75);
  font-variant-numeric: tabular-nums;
`

const TooltipClusterItem = styled.div`
  font-size: 11.5px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.92);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-left: 8px;
  position: relative;

  &::before {
    content: '·';
    position: absolute;
    left: 0;
    color: rgba(255, 255, 255, 0.5);
  }
`

const EmptyHint = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const EmptyIconBubble = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? BRAND.primarySoftDark : BRAND.primarySoft};
  color: ${BRAND.primary};
`

const EmptyTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-top: 4px;
`

const EmptyDescription = styled.div`
  font-size: 12.5px;
  line-height: 1.55;
  max-width: 320px;
  color: ${({ theme }) => theme.colors.text.tertiary};

  strong {
    color: ${({ theme }) => theme.colors.text.secondary};
    font-weight: 600;
  }
`

const EmptySubAction = styled.button`
  margin-top: 4px;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid ${BRAND.primaryBorder};
  background: ${BRAND.primarySoft};
  color: ${BRAND.primary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background ${MOTION.fast};

  &:hover {
    background: ${BRAND.primarySoftHover};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`
