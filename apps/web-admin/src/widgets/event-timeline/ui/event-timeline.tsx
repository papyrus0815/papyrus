/**
 * Event Timeline Widget — 시대 드릴다운 타임라인 (v4)
 * FSD: widgets/event-timeline/ui
 *
 * 설계: docs/event-timeline-redesign.md — v3 간트(연속 줌·팬·클러스터·라벨 스틸·레일)의
 * 전면 재설계. 원칙:
 *  - P1 익명 마크 금지 — 보이는 모든 것은 이름이 있거나 명시적 집계다
 *  - P2 스크롤 축은 세로 하나 — 가로 스크롤·팬·연속 줌 없음
 *  - P3 시간 탐색은 이산 3단 드릴(전체→세기→10년) — 내비게이터가 유일한 조작면
 *  - P4 인코딩 3개 — 색=카테고리, 위치/폭=시간, 볼드/칩=핵심
 *  - P5 설명이 필요 없는 UI — 온보딩·모양 범례·툴팁 없음
 *
 * 구조: [헤더(제목·범례·로드 상태)] → [시대 내비게이터] → [스크롤 영역: 기간 밴드 + 연표 리스트]
 *
 * 창 상태(`TimelineWindow`)는 v3의 lane/hide와 같은 규약 — 페이지가 내려주면(카탈로그,
 * URL `tlw` 정본) 그것이 정본이고, 아니면 지역 state로 동작한다.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import styled, { css, keyframes } from 'styled-components'

import type { EventCategoryDto } from '@/shared/api/event-categories'

import {
  LEDGER_CATEGORY,
  resolveCategory,
} from '../../../pages/events/ledger/styles/ledger-tokens'
import { BRAND, MOTION } from '../../../pages/events/styles/theme'
import type { HistoricalEvent } from '../../../pages/events/create/events.types'
import {
  buildTimelinePoints,
  continuingIntoCenturyCount,
  describeWindow,
  groupPointsForList,
  pointsStartingInWindow,
  serializeTimelineWindow,
  visibleTimelinePoints,
  windowContainingPoint,
  windowContainsPoint,
  windowYearRange,
  type TimelineWindow,
} from '../model/timeline-model'
import { EraNavigator } from './era-navigator'
import { SpanBand } from './span-band'
import { WindowList } from './window-list'

/** useEventHierarchy 출력 계약 단일화 — 각 뷰의 중복 선언 제거 */
type FlatItem = import('@/features/event-hierarchy/model').FlattenedHierarchyItem

export type { TimelineWindow }

interface EventTimelineProps {
  /**
   * ⚠️ **필터를 만족한 행만** 담긴 배열이어야 한다(검토 GAP-1).
   * 문맥용으로만 남은 부모까지 그리면 '전쟁'으로 좁힌 화면에 정치 행이 뜬다.
   */
  flattenedHierarchy: FlatItem[]
  events: HistoricalEvent[]
  selectedEventId: string | null
  dbCategories: EventCategoryDto[]
  onSelectEvent: (id: string) => void
  /**
   * 페이지네이션 — 타임라인은 *전 시대*가 모수라 부분 로드(첫 100건)면
   * 세기 개요부터 거짓말이 된다. hasMore인 동안 점진 소진한다(v3 규약 유지).
   */
  hasMore?: boolean
  isFetchingMore?: boolean
  onLoadMore?: () => void
  /** 자동 소진 중 한 페이지 실패로 멈춘 상태 — 재시도를 명시 노출 */
  loadMoreFailed?: boolean
  /** 첫 페이지 로딩 중 — 데이터 0과 구분 */
  isLoading?: boolean
  /** 집중(넓게) 보기 — 내비게이터를 슬림으로, 리스트 영역을 키운다 */
  wideMode?: boolean
  /** 카테고리 숨김 — 페이지 소유 우선(URL `hide`), 미전달 시 지역 state */
  hiddenCategories?: ReadonlySet<string>
  onToggleHiddenCategory?: (categoryKey: string) => void
  onShowAllCategories?: () => void
  /** 시간 창 — 페이지 소유 우선(URL `tlw`), 미전달 시 지역 state */
  window?: TimelineWindow | null
  onWindowChange?: (next: TimelineWindow | null) => void
}

const KNOWN_CATEGORIES = Object.keys(LEDGER_CATEGORY)

/** 밴드 없는 창에서 hover 상태 갱신을 무시하는 안정 참조 — memo 행 무효화 방지 */
const NOOP_HOVER: (id: string | null) => void = () => undefined

export const EventTimeline: React.FC<EventTimelineProps> = ({
  flattenedHierarchy,
  events,
  selectedEventId,
  dbCategories,
  onSelectEvent,
  hasMore = false,
  isFetchingMore = false,
  onLoadMore,
  loadMoreFailed = false,
  isLoading = false,
  wideMode = false,
  hiddenCategories: controlledHiddenCategories,
  onToggleHiddenCategory,
  onShowAllCategories,
  window: controlledWindow,
  onWindowChange,
}) => {
  /* ── 창 상태 — controlled(카탈로그·URL 정본) / uncontrolled 겸용 ───────── */
  const [localWindow, setLocalWindow] = useState<TimelineWindow | null>(null)
  const currentWindow =
    controlledWindow !== undefined ? controlledWindow : localWindow
  const changeWindow = useCallback(
    (next: TimelineWindow | null) => {
      if (onWindowChange) onWindowChange(next)
      else setLocalWindow(next)
    },
    [onWindowChange],
  )

  /* ── 카테고리 숨김 — 같은 규약 ────────────────────────────────────────── */
  const [localHidden, setLocalHidden] = useState<Set<string>>(new Set())
  const hiddenCategories: ReadonlySet<string> =
    controlledHiddenCategories ?? localHidden
  const toggleCategory = useCallback(
    (categoryKey: string) => {
      if (onToggleHiddenCategory) {
        onToggleHiddenCategory(categoryKey)
        return
      }
      setLocalHidden((prev) => {
        const next = new Set(prev)
        if (next.has(categoryKey)) next.delete(categoryKey)
        else next.add(categoryKey)
        return next
      })
    },
    [onToggleHiddenCategory],
  )
  const showAllCategories = useCallback(() => {
    if (onShowAllCategories) onShowAllCategories()
    else setLocalHidden(new Set())
  }, [onShowAllCategories])

  /* ── 데이터 파이프라인 (순수 모델) ────────────────────────────────────── */
  const allPoints = useMemo(
    () => buildTimelinePoints(flattenedHierarchy, events),
    [flattenedHierarchy, events],
  )
  const points = useMemo(
    () => visibleTimelinePoints(allPoints, hiddenCategories),
    [allPoints, hiddenCategories],
  )
  const windowPoints = useMemo(
    () => pointsStartingInWindow(points, currentWindow),
    [points, currentWindow],
  )
  const listGroups = useMemo(
    () => groupPointsForList(windowPoints, currentWindow),
    [windowPoints, currentWindow],
  )
  /**
   * 전체 단계 세기 그룹의 '이전 세기부터 계속 N건'(검토 R9) — 여러 세기 걸침
   * 대형 사건이 시작 세기 리스트 1행뿐이라 존재감이 소실됐다. 소속 모수(시작
   * 기준)는 그대로 두고 헤더 라인으로만 되살린다. 0건 그룹은 생략.
   */
  const continuingCounts = useMemo(() => {
    if (currentWindow !== null) return null
    const counts = new Map<string, number>()
    for (const group of listGroups) {
      const century = Number(group.key.slice(1))
      if (!Number.isFinite(century)) continue
      const count = continuingIntoCenturyCount(points, century)
      if (count > 0) counts.set(group.key, count)
    }
    return counts.size > 0 ? counts : null
  }, [currentWindow, listGroups, points])

  /* ── 범례 — 데이터에 등장한 카테고리만(known 순서 우선) ────────────────── */
  const legendItems = useMemo<string[]>(() => {
    const present = new Set(allPoints.map((point) => point.category))
    const ordered: string[] = []
    for (const name of KNOWN_CATEGORIES) {
      if (present.has(name)) {
        ordered.push(name)
        present.delete(name)
      }
    }
    const extras = Array.from(present).sort((left, right) =>
      left.localeCompare(right, 'ko'),
    )
    for (const name of extras) {
      ordered.push(dbCategories.find((dto) => dto.name === name)?.name ?? name)
    }
    return ordered
  }, [allPoints, dbCategories])
  const anyHidden = hiddenCategories.size > 0

  /* ── 전량 자동 로드 — v3 규약 유지(상한 + 수동 재개) ───────────────────── */
  const AUTO_LOAD_MAX_BATCHES = 25
  const onLoadMoreRef = useRef(onLoadMore)
  onLoadMoreRef.current = onLoadMore
  const autoLoadCountRef = useRef(0)
  const [autoLoadCapped, setAutoLoadCapped] = useState(false)
  useEffect(() => {
    if (!hasMore || isFetchingMore || loadMoreFailed) return
    if (autoLoadCountRef.current >= AUTO_LOAD_MAX_BATCHES) {
      setAutoLoadCapped(true)
      return
    }
    autoLoadCountRef.current += 1
    onLoadMoreRef.current?.()
  }, [hasMore, isFetchingMore, loadMoreFailed])
  const handleManualLoadMore = useCallback(() => {
    autoLoadCountRef.current = 0
    setAutoLoadCapped(false)
    onLoadMoreRef.current?.()
  }, [])

  /**
   * ── 창 전환 시 스크롤 리셋(검토 R1) ───────────────────────────────────
   * 드릴/스텝/브레드크럼으로 창이 바뀌면 ScrollRegion을 맨 위로. 안 하면 이전
   * 창에서 내려 본 scrollTop이 유지되고, 새 콘텐츠가 짧으면 바닥 클램프로
   * 리스트 꼬리·중간이 첫 화면이 된다("눌렀는데 화면이 깨졌다").
   *
   * 비교는 **직렬화 토큰**으로 — 창 객체는 URL 왕복 등에서 같은 값의 새 참조로
   * 갈아끼워질 수 있고, 그때 스크롤을 리셋하면 안 된다. 연도 버킷 클릭(flash
   * 스크롤)은 창이 그대로라 이 effect가 아예 깨어나지 않는다.
   */
  /**
   * hover 교차 강조는 **밴드가 있는 창에서만** React 상태를 쓴다(검토 R7).
   * 전체 창(밴드 없음 = 전 사건 리스트)에서는 행 스침마다 위젯 전체가 재렌더되던
   * 낭비 — 자기 hover는 행의 CSS `:hover`가 담당하므로 상태가 필요 없다.
   */
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null)

  const scrollRegionRef = useRef<HTMLDivElement | null>(null)
  const lastWindowTokenRef = useRef<string | null>(
    serializeTimelineWindow(currentWindow),
  )
  useEffect(() => {
    const token = serializeTimelineWindow(currentWindow)
    if (token === lastWindowTokenRef.current) return
    lastWindowTokenRef.current = token
    if (scrollRegionRef.current) scrollRegionRef.current.scrollTop = 0
    // 창 전환은 mouseleave를 발화하지 않는다 — 이전 창의 hover 강조가 새 창의
    // 같은 자리 행에 잔존하던 결함(검토 R28). 전환 시점에 명시적으로 비운다.
    setHoveredEventId(null)
  }, [currentWindow])

  /* ── 연도 버킷 클릭 → 리스트 그룹 스크롤 + 플래시 ─────────────────────── */
  const rootRef = useRef<HTMLElement | null>(null)
  const [flashGroupKey, setFlashGroupKey] = useState<string | null>(null)
  const flashTimerRef = useRef<number | null>(null)
  const flashRafRef = useRef<number | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])
  useEffect(
    () => () => {
      if (flashTimerRef.current != null) {
        window.clearTimeout(flashTimerRef.current)
      }
      // 타이머만 취소하면 언마운트 뒤 rAF 콜백이 setState를 부른다(검토 R26)
      if (flashRafRef.current != null) {
        window.cancelAnimationFrame(flashRafRef.current)
      }
    },
    [],
  )
  const handleYearSelect = useCallback(
    (year: number) => {
      const groupKey = `y${year}`
      const target = rootRef.current?.querySelector<HTMLElement>(
        `#tl-group-${CSS.escape(groupKey)}`,
      )
      target?.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'start',
      })
      setFlashGroupKey(null)
      if (flashTimerRef.current != null) {
        window.clearTimeout(flashTimerRef.current)
      }
      if (flashRafRef.current != null) {
        window.cancelAnimationFrame(flashRafRef.current)
      }
      // 다음 프레임에 켜야 같은 연도를 연달아 눌러도 애니메이션이 재시작된다
      flashRafRef.current = requestAnimationFrame(() => {
        flashRafRef.current = null
        setFlashGroupKey(groupKey)
      })
      flashTimerRef.current = window.setTimeout(
        () => setFlashGroupKey(null),
        1200,
      )
    },
    [reducedMotion],
  )

  /* ── 선택 사건이 창 밖일 때 — 자동 이동 대신 명시적 배너 ───────────────── */
  const selectedPoint = useMemo(
    () =>
      selectedEventId
        ? (allPoints.find((point) => point.id === selectedEventId) ?? null)
        : null,
    [allPoints, selectedEventId],
  )
  const selectedOutsideWindow =
    selectedPoint !== null && !windowContainsPoint(currentWindow, selectedPoint)
  /**
   * 선택 사건이 **숨긴 카테고리**에 있으면 창 안이어도 행·밴드 어디에도 없다
   * (드로어만 열림, 검토 R27) — 창밖 배너와 같은 자리에서 사정을 밝히고
   * 한 번에 되살릴 액션을 준다. 창밖 배너보다 우선한다(표시가 선행 조건).
   */
  const selectedHiddenCategory =
    selectedPoint !== null && hiddenCategories.has(selectedPoint.category)

  /**
   * ── 딥링크·창 전환 시 선택 행 자동 스크롤(검토 R17, v3 기능 승계) ────────
   * `?event=` 딥링크로 들어오면 선택 행이 창 안이라 배너도 없어 하이라이트가
   * 스크롤 밖에 묻힌다. 마운트(비동기 데이터 도착 포함)·창 전환 시 1회만
   * 센터로 데려가고, 사용자가 행을 직접 고른 뒤에는 점프하지 않는다.
   * 선언 순서 주의 — 창 전환 스크롤 리셋(R1) effect **뒤**에 있어야
   * 리셋 → 센터링 순서로 실행된다.
   */
  const userPickedRef = useRef(false)
  const handleSelectEvent = useCallback(
    (id: string) => {
      userPickedRef.current = true
      onSelectEvent(id)
    },
    [onSelectEvent],
  )
  const seenWindowTokenRef = useRef<string | null>(null)
  const centeredKeyRef = useRef<string | null>(null)
  useEffect(() => {
    const token = serializeTimelineWindow(currentWindow) ?? 'all'
    const windowChanged = seenWindowTokenRef.current !== token
    seenWindowTokenRef.current = token
    if (!selectedPoint) return
    if (!windowContainsPoint(currentWindow, selectedPoint)) return
    if (!windowChanged && userPickedRef.current) return
    const centerKey = `${token}:${selectedPoint.id}`
    if (centeredKeyRef.current === centerKey) return
    centeredKeyRef.current = centerKey
    const row = rootRef.current?.querySelector<HTMLElement>(
      `[data-tl-event="${CSS.escape(selectedPoint.id)}"]`,
    )
    // jsdom 등 scrollIntoView 미구현 환경 방어
    if (row && typeof row.scrollIntoView === 'function') {
      row.scrollIntoView({ block: 'center' })
    }
  }, [currentWindow, selectedPoint])

  /* ── 로드 상태 라벨 ────────────────────────────────────────────────────── */
  const loadStatus = loadMoreFailed ? (
    <LoadButton type="button" onClick={handleManualLoadMore}>
      일부를 불러오지 못함 · 다시 시도
    </LoadButton>
  ) : autoLoadCapped && hasMore && !isFetchingMore ? (
    <LoadButton type="button" onClick={handleManualLoadMore}>
      더 보기
    </LoadButton>
  ) : hasMore || isFetchingMore ? (
    <LoadSpinner role="status" aria-label="전체 사건 불러오는 중" />
  ) : null

  const showBand = windowYearRange(currentWindow) !== null

  /**
   * ── 창 변경 SR 발화(검토 R13, WCAG 4.1.3) ──────────────────────────────
   * 드릴·스텝·브레드크럼으로 리스트 전체가 교체돼도 시각 외 알림이 없었다.
   * 로딩 중에는 비워 둔다 — 전량 자동 로드가 페이지마다 건수를 바꿔
   * 라이브 영역이 스팸이 되는 것을 막고, 로드 완료 시점에 한 번 발화한다.
   */
  const liveStatusText =
    hasMore || isFetchingMore || isLoading
      ? ''
      : `${describeWindow(currentWindow)} · ${windowPoints.length}건`
  const sharedHoverId = showBand ? hoveredEventId : null
  const handleHoverEvent = showBand ? setHoveredEventId : NOOP_HOVER

  return (
    <TimelineCard ref={rootRef}>
      <SrLiveStatus role="status">{liveStatusText}</SrLiveStatus>
      <CardHeader>
        <CardTitleGroup>
          <CardTitle>사건 타임라인</CardTitle>
          <TotalCount>
            {points.length.toLocaleString()}건{loadStatus}
          </TotalCount>
        </CardTitleGroup>
        <Legend aria-label="카테고리 범례 — 클릭으로 표시/숨김 토글">
          {legendItems.map((categoryName) => {
            const hidden = hiddenCategories.has(categoryName)
            return (
              <LegendItem
                key={categoryName}
                type="button"
                $hidden={hidden}
                aria-pressed={!hidden}
                aria-label={`${categoryName} ${hidden ? '표시' : '숨기기'}`}
                onClick={() => toggleCategory(categoryName)}
              >
                <LegendDot
                  style={{ background: resolveCategory(categoryName).color }}
                />
                <span>{categoryName}</span>
              </LegendItem>
            )
          })}
          {anyHidden && (
            <LegendShowAll type="button" onClick={showAllCategories}>
              모두 보이기
            </LegendShowAll>
          )}
        </Legend>
      </CardHeader>

      {points.length === 0 ? (
        <EmptyHint role="status" aria-live="polite">
          <EmptyIconBubble aria-hidden="true">∅</EmptyIconBubble>
          {allPoints.length > 0 ? (
            <>
              <EmptyTitle>모든 카테고리가 숨겨졌습니다</EmptyTitle>
              <EmptyDescription>
                범례에서 <strong>{hiddenCategories.size}개</strong> 카테고리를
                숨겨 표시할 사건이 없습니다.
              </EmptyDescription>
              <EmptySubAction type="button" onClick={showAllCategories}>
                숨긴 카테고리 모두 보이기
              </EmptySubAction>
            </>
          ) : isLoading ? (
            <>
              <EmptyTitle>사건 불러오는 중…</EmptyTitle>
              <EmptyDescription>
                타임라인은 전 시대를 조망하기 위해 전체 사건을 불러옵니다.
              </EmptyDescription>
            </>
          ) : (
            <>
              <EmptyTitle>표시할 사건이 없습니다</EmptyTitle>
              <EmptyDescription>
                상단 검색·필터를 조정하거나, 목록 보기로 전환해 보세요.
              </EmptyDescription>
            </>
          )}
        </EmptyHint>
      ) : (
        <>
          <EraNavigator
            points={points}
            window={currentWindow}
            onWindowChange={changeWindow}
            onYearSelect={handleYearSelect}
            condensed={wideMode}
          />
          <ScrollRegion ref={scrollRegionRef} $wide={wideMode}>
            {/* 배너는 밴드 위(스크롤 최상단) — 밴드가 크면 배너가 fold 아래로
                밀려 안 보였다(검토 R20). */}
            {selectedHiddenCategory && selectedPoint && (
              <OutsideBanner role="status">
                <span>
                  선택한 사건 <strong>{selectedPoint.title}</strong>
                  {'은(는) 숨긴 카테고리에 있습니다.'}
                </span>
                <OutsideJump
                  type="button"
                  onClick={() => toggleCategory(selectedPoint.category)}
                >
                  {selectedPoint.category} 표시
                </OutsideJump>
              </OutsideBanner>
            )}
            {!selectedHiddenCategory && selectedOutsideWindow && selectedPoint && (
              <OutsideBanner role="status">
                <span>
                  선택한 사건 <strong>{selectedPoint.title}</strong>
                  {'은(는) 현재 창 밖에 있습니다.'}
                </span>
                <OutsideJump
                  type="button"
                  onClick={() =>
                    changeWindow(windowContainingPoint(selectedPoint))
                  }
                >
                  {describeWindow(windowContainingPoint(selectedPoint))}로 이동
                </OutsideJump>
              </OutsideBanner>
            )}
            {showBand && (
              <SpanBand
                points={points}
                window={currentWindow}
                selectedEventId={selectedEventId}
                hoveredEventId={hoveredEventId}
                onHoverEvent={setHoveredEventId}
                onSelectEvent={handleSelectEvent}
              />
            )}
            {listGroups.length === 0 ? (
              <WindowEmpty>
                이 창에 표시할 사건이 없습니다 — 위 내비게이터에서 다른
                시기를 고르세요.
              </WindowEmpty>
            ) : (
              <WindowList
                groups={listGroups}
                window={currentWindow}
                selectedEventId={selectedEventId}
                hoveredEventId={sharedHoverId}
                onHoverEvent={handleHoverEvent}
                onSelectEvent={handleSelectEvent}
                flashGroupKey={flashGroupKey}
                continuingCounts={continuingCounts}
              />
            )}
          </ScrollRegion>
        </>
      )}
    </TimelineCard>
  )
}

/* ───────────────────────────── styles ───────────────────────────── */

const TimelineCard = styled.section`
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

const CardHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  flex-wrap: wrap;
  padding: 12px 14px 10px;
`

const CardTitleGroup = styled.div`
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
`

const CardTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const TotalCount = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  font-weight: 600;
  /* 데이터 텍스트는 secondary — tertiary는 4.5:1 미달(검토 R12) */
  color: ${({ theme }) => theme.colors.text.secondary};
  font-variant-numeric: tabular-nums;
`

/** SR 전용 라이브 영역 — 창 변경을 발화(검토 R13). 시각적으로 완전 숨김. */
const SrLiveStatus = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
`

const spinnerSpin = keyframes`
  to { transform: rotate(360deg); }
`

const LoadSpinner = styled.span`
  width: 11px;
  height: 11px;
  border-radius: 50%;
  border: 1.5px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(20,19,34,0.2)'};
  border-top-color: ${BRAND.primary};
  animation: ${spinnerSpin} 0.8s linear infinite;
`

const LoadButton = styled.button`
  border: 1px solid ${BRAND.primaryBorder};
  background: none;
  color: ${BRAND.primary};
  border-radius: 999px;
  padding: 2px 9px;
  font-size: 10.5px;
  font-weight: 700;
  cursor: pointer;
  transition: background ${MOTION.fast};

  &:hover {
    background: ${BRAND.primarySoft};
  }

  &:focus-visible {
    outline: 2px solid ${BRAND.primary};
    outline-offset: 1px;
  }
`

const Legend = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px 6px;
  flex-wrap: wrap;
`

const LegendItem = styled.button<{ $hidden: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: none;
  background: none;
  padding: 3px 6px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.secondary};
  transition:
    background ${MOTION.fast},
    opacity ${MOTION.fast};

  ${({ $hidden }) =>
    $hidden &&
    css`
      opacity: 0.4;
      text-decoration: line-through;
    `}

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(20,19,34,0.05)'};
  }

  &:focus-visible {
    outline: 2px solid ${BRAND.primary};
    outline-offset: 1px;
  }
`

const LegendDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
`

const LegendShowAll = styled.button`
  border: none;
  background: none;
  color: ${BRAND.primary};
  font-size: 11px;
  font-weight: 700;
  padding: 3px 6px;
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    background: ${BRAND.primarySoft};
  }

  &:focus-visible {
    outline: 2px solid ${BRAND.primary};
    outline-offset: 1px;
  }
`

/**
 * dvh가 이 폴더의 정본(list-page.styles:520) — 모바일 주소창 수축 시 100vh는
 * 실제 뷰포트보다 커져 바닥이 잘린다(검토 R16). vh는 미지원 브라우저 폴백.
 */
const ScrollRegion = styled.div<{ $wide: boolean }>`
  overflow-y: auto;
  overscroll-behavior: contain;
  max-height: ${({ $wide }) =>
    $wide ? 'calc(100vh - 230px)' : 'calc(100vh - 320px)'};
  max-height: ${({ $wide }) =>
    $wide ? 'calc(100dvh - 230px)' : 'calc(100dvh - 320px)'};
  min-height: 260px;
`

const OutsideBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin: 10px 14px 0;
  padding: 8px 12px;
  border-radius: 9px;
  border: 1px solid ${BRAND.primaryBorder};
  background: ${BRAND.primarySoft};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 700;
  }
`

const OutsideJump = styled.button`
  border: none;
  background: none;
  color: ${BRAND.primary};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 6px;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  &:focus-visible {
    outline: 2px solid ${BRAND.primary};
    outline-offset: 1px;
  }
`

const WindowEmpty = styled.div`
  padding: 40px 14px;
  text-align: center;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EmptyHint = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 56px 24px;
  text-align: center;
`

const EmptyIconBubble = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 18px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(20,19,34,0.05)'};
`

const EmptyTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EmptyDescription = styled.div`
  font-size: 12.5px;
  line-height: 1.6;
  max-width: 420px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EmptySubAction = styled.button`
  margin-top: 4px;
  border: 1px solid ${BRAND.primaryBorder};
  background: none;
  color: ${BRAND.primary};
  border-radius: 999px;
  padding: 5px 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background ${MOTION.fast};

  &:hover {
    background: ${BRAND.primarySoft};
  }

  &:focus-visible {
    outline: 2px solid ${BRAND.primary};
    outline-offset: 1px;
  }
`
