import type { ReactNode, WheelEvent } from 'react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import styled from 'styled-components'

import {
  getEntityKindLabel,
  getStateTypeLabel,
} from '@/entities/historical-country/lib/utils'
import { getUploadImageUrl } from '@/shared/api/upload'
import {
  type CountryPeriodShape,
  compareByCountryStart,
  formatCountryPeriod,
  getCountryDurationYears,
  getCountryYearRange,
} from '@/shared/lib/country-period'

interface LineageNode {
  id: string
  name: string
  enName: string | null
  thumbnailUrl: string | null
  stateType: string | null
  entityKind: string | null
  linkKind: string | null
  capital: string | null
  distance: number | null
  yearsLabel: string | null
  /** 시작 연도(부호 연도). 세기 열을 가르는 데만 쓴다 — 미상이면 null */
  startYear: number | null
  /** 종료 연도(부호 연도). 존속 기간 바 뷰에서 사용 */
  endYear: number | null
  /** 존속 연수(년) */
  durationYears: number | null
}

/** 전체/경량 역사 국가 DTO 공통 — 여기서 실제로 쓰는 필드만 선택적으로 수용 */
export type LineageSource = {
  id: string
  name?: string | null
  enName?: string | null
  thumbnailUrl?: string | null
  stateType?: string | null
  entityKind?: string | null
  linkKind?: string | null
  capital?: string | null
  distance?: number | null
} & CountryPeriodShape

export interface LineageModernEndpoint {
  id: string
  name: string
  flagEmoji?: string | null
  thumbnailUrl?: string | null
  isoCode?: string | null
}

interface CenturyColumn {
  key: string
  label: string
  /** 기원전 8세기 → -8, 19세기 → 19, 미상 → null */
  centuryIndex: number | null
  nodes: LineageNode[]
}

type LineageViewMode = 'century' | 'span'

const ZOOM_STEPS = [0.75, 1, 1.25, 1.5, 2, 2.5, 3] as const
const DEFAULT_ZOOM_INDEX = 1 // 1.0 (100%)

function toNode(source: LineageSource): LineageNode {
  const yearsLabel = formatCountryPeriod(source, { variant: 'short' })
  const range = getCountryYearRange(source)
  const durationYears = getCountryDurationYears(source)
  return {
    id: source.id,
    name: source.name ?? '미상',
    enName: source.enName ?? null,
    thumbnailUrl: source.thumbnailUrl ?? null,
    stateType: source.stateType ?? null,
    entityKind: source.entityKind ?? null,
    linkKind: source.linkKind ?? null,
    capital: source.capital ?? null,
    distance: typeof source.distance === 'number' ? source.distance : null,
    yearsLabel: yearsLabel || null,
    startYear: range.start,
    endYear: range.end,
    durationYears,
  }
}

/**
 * 부호 연도 → 세기 번호. 1871 → 19, -753 → -8.
 * 0년과 0세기는 없으므로 음수는 음수 세기, 양수는 양수 세기로 변환한다.
 */
function centuryIndexOf(signedYear: number): number {
  if (signedYear < 0) {
    return -Math.ceil(Math.abs(signedYear) / 100)
  }
  return Math.max(1, Math.ceil(signedYear / 100))
}

function centuryLabelFromIndex(centuryIndex: number): string {
  if (centuryIndex < 0) {
    return `기원전 ${Math.abs(centuryIndex)}세기`
  }
  return `${centuryIndex}세기`
}

/** 두 세기 번호 사이의 세기 간격(0세기 제외) */
function computeCenturyStepGap(
  previousIndex: number | null,
  nextIndex: number | null,
): number | null {
  if (previousIndex == null || nextIndex == null) return null
  if (previousIndex < 0 && nextIndex > 0) {
    return nextIndex - previousIndex - 1
  }
  return nextIndex - previousIndex
}

/** 시간순으로 정렬된 노드를 시작 세기별 열로 묶는다. 연대 미상은 맨 뒤 한 열 */
function groupByCentury(nodes: LineageNode[]): CenturyColumn[] {
  const columns: CenturyColumn[] = []
  const unknown: LineageNode[] = []
  for (const node of nodes) {
    if (node.startYear == null) {
      unknown.push(node)
      continue
    }
    const centuryIndex = centuryIndexOf(node.startYear)
    const label = centuryLabelFromIndex(centuryIndex)
    const last = columns[columns.length - 1]
    if (last && last.centuryIndex === centuryIndex) {
      last.nodes.push(node)
    } else {
      columns.push({
        key: label,
        label,
        centuryIndex,
        nodes: [node],
      })
    }
  }
  if (unknown.length > 0) {
    columns.push({
      key: '__unknown',
      label: '연대 미상',
      centuryIndex: null,
      nodes: unknown,
    })
  }
  return columns
}

function resolveHierarchyLabel(
  node: LineageNode,
  isCurrent: boolean,
): string | null {
  if (isCurrent || node.distance === 0) {
    return '현재'
  }
  if (node.distance != null) {
    if (node.distance <= -2) {
      return `전신 ${Math.abs(node.distance)}대`
    }
    if (node.distance === -1) {
      return '직전 전신'
    }
    if (node.distance === 1) {
      return '직계 후신'
    }
    if (node.distance >= 2) {
      return `후신 ${node.distance}대`
    }
  }
  if (node.linkKind === 'PREDECESSOR') {
    return '직계 전신'
  }
  if (node.linkKind === 'CONSTITUENT') {
    return '구성국'
  }
  if (node.linkKind === 'HERITAGE') {
    return '역사 유산'
  }
  if (node.linkKind === 'SUCCESSOR') {
    return '후신'
  }
  return null
}

function resolveStateBadgeLabel(node: LineageNode): string | null {
  if (node.stateType) {
    const label = getStateTypeLabel(node.stateType)
    if (label && label !== '미분류') return label
  }
  if (node.entityKind && node.entityKind !== 'STATE') {
    return getEntityKindLabel(node.entityKind)
  }
  return null
}

function buildNodeTooltip(node: LineageNode): string {
  const parts: string[] = [node.name]
  if (node.enName) parts.push(`(${node.enName})`)
  const stateLabel = resolveStateBadgeLabel(node)
  if (stateLabel) parts.push(`· ${stateLabel}`)
  if (node.yearsLabel) parts.push(`· ${node.yearsLabel}`)
  if (node.durationYears != null && node.durationYears > 0) {
    parts.push(`(${node.durationYears.toLocaleString('ko-KR')}년간 존속)`)
  }
  if (node.capital) parts.push(`· 수도: ${node.capital}`)
  return parts.join(' ')
}

function formatSignedYearAxis(signedYear: number): string {
  if (signedYear < 0) {
    return `BC ${Math.abs(Math.round(signedYear))}`
  }
  return `${Math.round(signedYear)}년`
}

function ExternalArrowIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 11L11 5" />
      <path d="M6 5h5v5" />
    </svg>
  )
}

function ExpandViewportIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 2h4v4" />
      <path d="M6 14H2v-4" />
      <path d="M14 2L9.5 6.5" />
      <path d="M2 14l4.5-4.5" />
    </svg>
  )
}

function CloseModalIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 4l8 8" />
      <path d="M12 4l-8 8" />
    </svg>
  )
}

export interface LineageFlowProps {
  /** 시간순 정렬 전 historical countries (전체/경량 DTO 모두 허용) */
  historicalCountries: LineageSource[]
  /** 지금 보고 있는 나라 — 강조해 계보 안의 자기 자리를 보여준다(역사 국가 대시보드) */
  currentId?: string
  /** 카드를 누르면 그 나라로 — 없으면 카드는 읽기 전용 */
  onSelect?: (id: string) => void
  /**
   * 세기 한 칸에 처음 보일 카드 수 — 넘치면 '+N개 더'로 접는다. 미지정이면 전부.
   * 지금 보는 나라(currentId)는 접혀도 늘 보인다.
   */
  maxPerColumn?: number
  /** 현대 국가 대시보드에서 계보 오른쪽 끝에 표시할 현대 국가 종착점(Anchor) 노드 */
  modernEndpoint?: LineageModernEndpoint
  /** 상단 툴바 왼쪽에 배치할 보조 컨트롤(필터 칩, 이전 N개 펼치기 등) */
  toolbarLeft?: ReactNode
}

/**
 * 계보 — 세기별 카드 흐름도 & 존속 기간 타임라인 바(2-View) + 다단계 확대/전체화면 지원
 *
 * - 타임라인 축 선(AxisRailRow)과 세기 라벨(CenturyLabelRow)을 상하 2단으로 완전히 분리해
 *   가로 축 선이 글자와 겹치는 문제를 원천 제거.
 * - 카드 테두리에 색상을 덧대는 장식(좌측/하단 컬러 스트라이프·이중 테두리)을 제거하고
 *   단정하고 일관된 무채색 1px 보더와 정돈된 타이포그래피로 구성.
 */
export function LineageFlow({
  historicalCountries,
  currentId,
  onSelect,
  maxPerColumn,
  modernEndpoint,
  toolbarLeft,
}: LineageFlowProps) {
  const nodes = useMemo(
    () => [...historicalCountries].sort(compareByCountryStart).map(toNode),
    [historicalCountries],
  )
  const columns = useMemo(() => groupByCentury(nodes), [nodes])

  const overallSpanSummary = useMemo(() => {
    const startYears = nodes
      .map((node) => node.startYear)
      .filter((year): year is number => year != null)
    if (startYears.length === 0) return null
    const earliest = Math.min(...startYears)
    const firstCentury = centuryLabelFromIndex(centuryIndexOf(earliest))
    if (modernEndpoint) {
      return `${firstCentury} — 현재`
    }
    const endYears = nodes
      .map((node) => node.endYear ?? node.startYear)
      .filter((year): year is number => year != null)
    const latest = endYears.length > 0 ? Math.max(...endYears) : earliest
    const lastCentury = centuryLabelFromIndex(centuryIndexOf(latest))
    return firstCentury === lastCentury
      ? firstCentury
      : `${firstCentury} — ${lastCentury}`
  }, [nodes, modernEndpoint])

  const [viewMode, setViewMode] = useState<LineageViewMode>('century')
  const [zoomIndex, setZoomIndex] = useState<number>(DEFAULT_ZOOM_INDEX)
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false)
  const zoomScale = ZOOM_STEPS[zoomIndex] ?? 1
  const zoomPercent = Math.round(zoomScale * 100)

  const canZoomOut = zoomIndex > 0
  const canZoomIn = zoomIndex < ZOOM_STEPS.length - 1

  const handleZoomOut = () => {
    setZoomIndex((prev) => Math.max(0, prev - 1))
  }
  const handleZoomIn = () => {
    setZoomIndex((prev) => Math.min(ZOOM_STEPS.length - 1, prev + 1))
  }
  const handleZoomReset = () => {
    setZoomIndex(DEFAULT_ZOOM_INDEX)
  }

  useEffect(() => {
    if (!isFullscreenOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFullscreenOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreenOpen])

  // 존속 기간 바 뷰를 위한 전체 연도 범위 계산
  const spanBounds = useMemo(() => {
    const currentYear = new Date().getFullYear()
    let minYear = Infinity
    let maxYear = -Infinity
    for (const node of nodes) {
      if (node.startYear != null) {
        if (node.startYear < minYear) minYear = node.startYear
        const resolvedEnd = node.endYear ?? node.startYear
        if (resolvedEnd > maxYear) maxYear = resolvedEnd
      }
    }
    if (modernEndpoint && maxYear < currentYear) {
      maxYear = currentYear
    }
    if (!Number.isFinite(minYear) || !Number.isFinite(maxYear)) {
      return {
        minYear: 1000,
        maxYear: currentYear,
        totalSpan: currentYear - 1000,
        ticks: [1000, 1250, 1500, 1750, currentYear],
      }
    }
    if (maxYear <= minYear) {
      maxYear = minYear + 50
    }
    const totalSpan = Math.max(10, maxYear - minYear)
    const ticks: number[] = [
      minYear,
      minYear + totalSpan * 0.25,
      minYear + totalSpan * 0.5,
      minYear + totalSpan * 0.75,
      maxYear,
    ]
    return { minYear, maxYear, totalSpan, ticks }
  }, [nodes, modernEndpoint])

  const renderToolbarControls = (inModal: boolean) => (
    <ToolbarRow>
      <ToolbarLeftGroup>
        {overallSpanSummary && (
          <SpanSummaryBadge title="계보 전체 시간 범위">
            {overallSpanSummary}
          </SpanSummaryBadge>
        )}
        {toolbarLeft}
      </ToolbarLeftGroup>

      <ToolbarRightGroup>
        <ZoomControlGroup role="group" aria-label="계보 확대·축소">
          <ZoomStepButton
            type="button"
            onClick={handleZoomOut}
            disabled={!canZoomOut}
            aria-label="축소"
            title="축소 (Ctrl/Cmd + 휠 아래로)"
          >
            −
          </ZoomStepButton>
          <ZoomReadoutButton
            type="button"
            onClick={handleZoomReset}
            title="클릭하여 100% 기본 배율로 초기화"
            $modified={zoomIndex !== DEFAULT_ZOOM_INDEX}
          >
            {zoomPercent}%
          </ZoomReadoutButton>
          <ZoomStepButton
            type="button"
            onClick={handleZoomIn}
            disabled={!canZoomIn}
            aria-label="확대"
            title="확대 (Ctrl/Cmd + 휠 위로)"
          >
            +
          </ZoomStepButton>
        </ZoomControlGroup>

        <ViewSwitchGroup role="tablist" aria-label="계보 보기 방식 전환">
          <ViewSwitchButton
            type="button"
            role="tab"
            aria-selected={viewMode === 'century'}
            $active={viewMode === 'century'}
            onClick={() => setViewMode('century')}
          >
            세기별 카드
          </ViewSwitchButton>
          <ViewSwitchButton
            type="button"
            role="tab"
            aria-selected={viewMode === 'span'}
            $active={viewMode === 'span'}
            onClick={() => setViewMode('span')}
          >
            존속 기간 바
          </ViewSwitchButton>
        </ViewSwitchGroup>

        {!inModal ? (
          <ExpandModalButton
            type="button"
            onClick={() => setIsFullscreenOpen(true)}
            title="전체화면으로 크게 보기"
          >
            <ExpandViewportIcon />
            <span>크게 보기</span>
          </ExpandModalButton>
        ) : (
          <ModalCloseButton
            type="button"
            onClick={() => setIsFullscreenOpen(false)}
            aria-label="전체화면 닫기 (ESC)"
          >
            <CloseModalIcon />
            <span>닫기</span>
          </ModalCloseButton>
        )}
      </ToolbarRightGroup>
    </ToolbarRow>
  )

  return (
    <Container>
      {renderToolbarControls(false)}

      <LineageViewportBody
        columns={columns}
        nodes={nodes}
        currentId={currentId}
        onSelect={onSelect}
        maxPerColumn={maxPerColumn}
        modernEndpoint={modernEndpoint}
        spanBounds={spanBounds}
        viewMode={viewMode}
        zoomScale={zoomScale}
        onWheelZoom={(direction) => {
          if (direction === 'in') handleZoomIn()
          else handleZoomOut()
        }}
      />

      {isFullscreenOpen && (
        <FullscreenBackdrop
          role="dialog"
          aria-modal="true"
          aria-label="계보 크게 보기"
          onClick={() => setIsFullscreenOpen(false)}
        >
          <FullscreenDialog onClick={(event) => event.stopPropagation()}>
            <FullscreenHeader>
              <FullscreenTitleGroup>
                <FullscreenTitle>국가 계보 상세 흐름도</FullscreenTitle>
                <FullscreenHint>
                  상단 + / − 버튼이나 Ctrl(Cmd) + 마우스 휠로 최대 300%까지 확대할 수 있습니다
                </FullscreenHint>
              </FullscreenTitleGroup>
              {renderToolbarControls(true)}
            </FullscreenHeader>

            <FullscreenCanvas>
              <LineageViewportBody
                columns={columns}
                nodes={nodes}
                currentId={currentId}
                onSelect={(selectedId) => {
                  setIsFullscreenOpen(false)
                  onSelect?.(selectedId)
                }}
                maxPerColumn={undefined}
                modernEndpoint={modernEndpoint}
                spanBounds={spanBounds}
                viewMode={viewMode}
                zoomScale={zoomScale}
                onWheelZoom={(direction) => {
                  if (direction === 'in') handleZoomIn()
                  else handleZoomOut()
                }}
              />
            </FullscreenCanvas>
          </FullscreenDialog>
        </FullscreenBackdrop>
      )}
    </Container>
  )
}

interface LineageViewportBodyProps {
  columns: CenturyColumn[]
  nodes: LineageNode[]
  currentId?: string
  onSelect?: (id: string) => void
  maxPerColumn?: number
  modernEndpoint?: LineageModernEndpoint
  spanBounds: {
    minYear: number
    maxYear: number
    totalSpan: number
    ticks: number[]
  }
  viewMode: LineageViewMode
  zoomScale: number
  onWheelZoom: (direction: 'in' | 'out') => void
}

function LineageViewportBody({
  columns,
  nodes,
  currentId,
  onSelect,
  maxPerColumn,
  modernEndpoint,
  spanBounds,
  viewMode,
  zoomScale,
  onWheelZoom,
}: LineageViewportBodyProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [edges, setEdges] = useState({ start: false, end: false })
  const [expandedColumns, setExpandedColumns] = useState<ReadonlySet<string>>(
    () => new Set(),
  )

  const visibleNodesOf = (column: CenturyColumn): LineageNode[] => {
    if (maxPerColumn == null || expandedColumns.has(column.key)) {
      return column.nodes
    }
    if (column.nodes.length <= maxPerColumn) return column.nodes
    const head = column.nodes.slice(0, maxPerColumn)
    const current = column.nodes.find((node) => node.id === currentId)
    if (current && !head.includes(current)) head[maxPerColumn - 1] = current
    return head
  }

  /* 처음 그릴 때 최근 쪽 끝으로 — 열 수가 바뀌어도 다시 맞춘다 */
  useLayoutEffect(() => {
    if (viewMode !== 'century') return
    const scroller = scrollerRef.current
    if (!scroller) return
    const current = currentId
      ? scroller.querySelector<HTMLElement>('[aria-current="page"]')
      : null
    if (current) {
      const scrollerRect = scroller.getBoundingClientRect()
      const currentRect = current.getBoundingClientRect()
      scroller.scrollLeft +=
        currentRect.left -
        scrollerRect.left -
        (scrollerRect.width - currentRect.width) / 2
      return
    }
    scroller.scrollLeft = scroller.scrollWidth
  }, [columns.length, currentId, viewMode])

  /* 가려진 쪽 가장자리를 흐리게 — 넘길 게 있다는 표시 */
  useLayoutEffect(() => {
    if (viewMode !== 'century') return
    const scroller = scrollerRef.current
    if (!scroller) return
    const update = () => {
      const maxLeft = scroller.scrollWidth - scroller.clientWidth
      const next = {
        start: scroller.scrollLeft > 4,
        end: scroller.scrollLeft < maxLeft - 4,
      }
      setEdges((previous) =>
        previous.start === next.start && previous.end === next.end
          ? previous
          : next,
      )
    }
    update()
    scroller.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(scroller)
    return () => {
      scroller.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [columns.length, viewMode, zoomScale])

  const handleStepScroll = (direction: 'left' | 'right') => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const delta = (direction === 'left' ? -380 : 380) * zoomScale
    scroller.scrollBy({ left: delta, behavior: 'smooth' })
  }

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) return
    event.preventDefault()
    if (event.deltaY < 0) onWheelZoom('in')
    else if (event.deltaY > 0) onWheelZoom('out')
  }

  const endpointAvatarUrl = getUploadImageUrl(modernEndpoint?.thumbnailUrl)
  const totalColumnsCount = columns.length + (modernEndpoint ? 1 : 0)

  if (viewMode === 'century') {
    return (
      <ViewportWrap onWheel={handleWheel}>
        {edges.start && (
          <NavStepButton
            type="button"
            $side="left"
            onClick={() => handleStepScroll('left')}
            aria-label="이전 세기로 스크롤"
            title="이전 세기로 이동"
          >
            ‹
          </NavStepButton>
        )}
        {edges.end && (
          <NavStepButton
            type="button"
            $side="right"
            onClick={() => handleStepScroll('right')}
            aria-label="다음 세기로 스크롤"
            title="다음 세기로 이동"
          >
            ›
          </NavStepButton>
        )}

        <Frame $fadeStart={edges.start} $fadeEnd={edges.end}>
          <Scroller ref={scrollerRef}>
            <ZoomCanvas $scale={zoomScale}>
              <Columns>
                {columns.map((column, columnIdx) => {
                  const previousColumn =
                    columnIdx > 0 ? columns[columnIdx - 1] : null
                  const centuryGap = previousColumn
                    ? computeCenturyStepGap(
                        previousColumn.centuryIndex,
                        column.centuryIndex,
                      )
                    : null
                  const hasColumnCurrent = column.nodes.some(
                    (node) => node.id === currentId,
                  )
                  const isLastColumn = columnIdx === totalColumnsCount - 1

                  return (
                    <Column key={column.key}>
                      {/* 1단: 순수 기하학 축 선(점 + 가로 연결선) — 텍스트가 전혀 없으므로 겹침 0% */}
                      <AxisRailRow aria-hidden>
                        <TickDot $highlight={hasColumnCurrent} />
                        {!isLastColumn && <AxisRailLine />}
                      </AxisRailRow>

                      {/* 2단: 세기 라벨 행 — 축 선 아래에 독립 배치 */}
                      <CenturyLabelRow>
                        <TickLabel $highlight={hasColumnCurrent}>
                          {column.label}
                        </TickLabel>
                        {column.nodes.length > 1 && (
                          <ColumnCountText>
                            {column.nodes.length}
                          </ColumnCountText>
                        )}
                        {centuryGap != null && centuryGap > 1 && (
                          <CenturyGapText
                            title={`앞 세기 열과 ${centuryGap}세기 간격`}
                          >
                            +{centuryGap}세기
                          </CenturyGapText>
                        )}
                      </CenturyLabelRow>

                      {/* 3단: 해당 세기에 시작된 국가 카드 스택 */}
                      <Stack>
                        {visibleNodesOf(column).map((node) => {
                          const isCurrent = node.id === currentId
                          const interactive = !!onSelect && !isCurrent
                          const avatarUrl = getUploadImageUrl(node.thumbnailUrl)
                          const hierarchyLabel = resolveHierarchyLabel(
                            node,
                            isCurrent,
                          )
                          const stateLabel = resolveStateBadgeLabel(node)
                          const metaTags = [
                            hierarchyLabel,
                            stateLabel,
                            node.capital ? `수도 ${node.capital}` : null,
                          ].filter((tag): tag is string => Boolean(tag))

                          return (
                            <Card
                              key={node.id}
                              as={interactive ? 'button' : 'div'}
                              type={interactive ? 'button' : undefined}
                              onClick={
                                interactive
                                  ? () => onSelect(node.id)
                                  : undefined
                              }
                              aria-current={isCurrent ? 'page' : undefined}
                              title={buildNodeTooltip(node)}
                              $current={isCurrent}
                              $interactive={interactive}
                            >
                              <CardHeaderRow>
                                <CardTitleGroup>
                                  {avatarUrl && (
                                    <FlagThumb aria-hidden>
                                      <FlagThumbImg src={avatarUrl} alt="" />
                                    </FlagThumb>
                                  )}
                                  <CardName>{node.name}</CardName>
                                </CardTitleGroup>
                                {interactive && (
                                  <CardJumpIcon aria-hidden>
                                    <ExternalArrowIcon />
                                  </CardJumpIcon>
                                )}
                              </CardHeaderRow>

                              {(node.yearsLabel ||
                                (node.durationYears != null &&
                                  node.durationYears > 0)) && (
                                <CardPeriodRow>
                                  {node.yearsLabel && (
                                    <CardYears>{node.yearsLabel}</CardYears>
                                  )}
                                  {node.durationYears != null &&
                                    node.durationYears > 0 && (
                                      <CardDurationText>
                                        ·{' '}
                                        {node.durationYears.toLocaleString(
                                          'ko-KR',
                                        )}
                                        년
                                      </CardDurationText>
                                    )}
                                </CardPeriodRow>
                              )}

                              {metaTags.length > 0 && (
                                <CardTagsRow>
                                  {metaTags.map((tag) => (
                                    <MetaTag
                                      key={tag}
                                      $highlight={
                                        isCurrent && tag === '현재'
                                      }
                                    >
                                      {tag}
                                    </MetaTag>
                                  ))}
                                </CardTagsRow>
                              )}
                            </Card>
                          )
                        })}

                        {(() => {
                          if (
                            maxPerColumn == null ||
                            column.nodes.length <= maxPerColumn
                          ) {
                            return null
                          }
                          const expanded = expandedColumns.has(column.key)
                          const hidden = column.nodes.length - maxPerColumn
                          return (
                            <MoreButton
                              type="button"
                              aria-expanded={expanded}
                              onClick={() =>
                                setExpandedColumns((previous) => {
                                  const next = new Set(previous)
                                  if (next.has(column.key)) {
                                    next.delete(column.key)
                                  } else {
                                    next.add(column.key)
                                  }
                                  return next
                                })
                              }
                            >
                              {expanded ? '접기' : `+${hidden}개 더 보기`}
                            </MoreButton>
                          )
                        })()}
                      </Stack>
                    </Column>
                  )
                })}

                {modernEndpoint && (
                  <EndpointColumn key="__modern_endpoint">
                    <AxisRailRow aria-hidden>
                      <TickDot $highlight />
                    </AxisRailRow>
                    <CenturyLabelRow>
                      <TickLabel $highlight>현재</TickLabel>
                    </CenturyLabelRow>
                    <Stack>
                      <Card
                        aria-current="page"
                        $current
                        $interactive={false}
                        title={`${modernEndpoint.name} (현재 조회 중인 현대 국가)`}
                      >
                        <CardHeaderRow>
                          <CardTitleGroup>
                            {endpointAvatarUrl && (
                              <FlagThumb aria-hidden>
                                <FlagThumbImg src={endpointAvatarUrl} alt="" />
                              </FlagThumb>
                            )}
                            <CardName>{modernEndpoint.name}</CardName>
                          </CardTitleGroup>
                        </CardHeaderRow>
                        <CardTagsRow>
                          <MetaTag $highlight>현대 국가 · 현재</MetaTag>
                          {modernEndpoint.isoCode && (
                            <MetaTag>{modernEndpoint.isoCode}</MetaTag>
                          )}
                        </CardTagsRow>
                      </Card>
                    </Stack>
                  </EndpointColumn>
                )}
              </Columns>
            </ZoomCanvas>
          </Scroller>
        </Frame>
      </ViewportWrap>
    )
  }

  return (
    <SpanViewScrollOuter onWheel={handleWheel}>
      <SpanViewContainer $scale={zoomScale}>
        <SpanRulerRow aria-hidden>
          <SpanRulerIdentityStub>국가</SpanRulerIdentityStub>
          <SpanRulerTrack>
            {spanBounds.ticks.map((tickValue, tickIdx) => (
              <SpanRulerTick
                key={tickIdx}
                style={{ left: `${tickIdx * 25}%` }}
                $align={
                  tickIdx === 0
                    ? 'start'
                    : tickIdx === 4
                      ? 'end'
                      : 'center'
                }
              >
                {formatSignedYearAxis(tickValue)}
              </SpanRulerTick>
            ))}
          </SpanRulerTrack>
          <SpanRulerPeriodStub>존속 기간</SpanRulerPeriodStub>
        </SpanRulerRow>

        <SpanRowsList>
          {nodes.map((node) => {
            const isCurrent = node.id === currentId
            const interactive = !!onSelect && !isCurrent
            const avatarUrl = getUploadImageUrl(node.thumbnailUrl)
            const stateLabel = resolveStateBadgeLabel(node)
            const hierarchyLabel = resolveHierarchyLabel(node, isCurrent)

            const hasRange = node.startYear != null
            const startVal = node.startYear ?? spanBounds.minYear
            const endVal = node.endYear ?? startVal
            const clampedStart = Math.max(
              spanBounds.minYear,
              Math.min(spanBounds.maxYear, startVal),
            )
            const clampedEnd = Math.max(
              clampedStart,
              Math.min(spanBounds.maxYear, endVal),
            )
            const leftPct = hasRange
              ? ((clampedStart - spanBounds.minYear) / spanBounds.totalSpan) *
                100
              : 0
            const widthPct = hasRange
              ? Math.max(
                  1.5,
                  ((clampedEnd - clampedStart) / spanBounds.totalSpan) * 100,
                )
              : 0

            return (
              <SpanRowItem
                key={node.id}
                as={interactive ? 'button' : 'div'}
                type={interactive ? 'button' : undefined}
                onClick={interactive ? () => onSelect(node.id) : undefined}
                aria-current={isCurrent ? 'page' : undefined}
                title={buildNodeTooltip(node)}
                $current={isCurrent}
                $interactive={interactive}
              >
                <SpanRowIdentity>
                  {avatarUrl && (
                    <FlagThumb $small aria-hidden>
                      <FlagThumbImg src={avatarUrl} alt="" />
                    </FlagThumb>
                  )}
                  <SpanRowTitleLine>
                    <SpanRowName>{node.name}</SpanRowName>
                    {hierarchyLabel && (
                      <MetaTag $highlight={isCurrent}>{hierarchyLabel}</MetaTag>
                    )}
                    {stateLabel && <MetaTag>{stateLabel}</MetaTag>}
                  </SpanRowTitleLine>
                </SpanRowIdentity>

                <SpanBarLane>
                  <SpanGridGuide style={{ left: '25%' }} aria-hidden />
                  <SpanGridGuide style={{ left: '50%' }} aria-hidden />
                  <SpanGridGuide style={{ left: '75%' }} aria-hidden />
                  {hasRange ? (
                    <SpanBarFill
                      style={{
                        left: `${Math.min(98.5, Math.max(0, leftPct))}%`,
                        width: `${Math.min(100 - Math.max(0, leftPct), widthPct)}%`,
                      }}
                      $current={isCurrent}
                    />
                  ) : (
                    <SpanUnknownTag>연대 미상</SpanUnknownTag>
                  )}
                </SpanBarLane>

                <SpanRowPeriodCol>
                  <SpanRowMetaText>
                    {node.yearsLabel ?? '미상'}
                    {node.durationYears != null &&
                      node.durationYears > 0 &&
                      ` (${node.durationYears.toLocaleString('ko-KR')}년)`}
                  </SpanRowMetaText>
                  {interactive && (
                    <SpanRowJump aria-hidden>
                      <ExternalArrowIcon />
                    </SpanRowJump>
                  )}
                </SpanRowPeriodCol>
              </SpanRowItem>
            )
          })}

          {modernEndpoint && (
            <SpanRowItem
              key="__modern_endpoint_span"
              aria-current="page"
              $current
              $interactive={false}
            >
              <SpanRowIdentity>
                {endpointAvatarUrl && (
                  <FlagThumb $small aria-hidden>
                    <FlagThumbImg src={endpointAvatarUrl} alt="" />
                  </FlagThumb>
                )}
                <SpanRowTitleLine>
                  <SpanRowName>{modernEndpoint.name}</SpanRowName>
                  <MetaTag $highlight>현재</MetaTag>
                </SpanRowTitleLine>
              </SpanRowIdentity>
              <SpanBarLane>
                <SpanGridGuide style={{ left: '25%' }} aria-hidden />
                <SpanGridGuide style={{ left: '50%' }} aria-hidden />
                <SpanGridGuide style={{ left: '75%' }} aria-hidden />
                <SpanBarFill
                  style={{ left: '96%', width: '4%' }}
                  $current
                />
              </SpanBarLane>
              <SpanRowPeriodCol>
                <SpanRowMetaText>현대 국가</SpanRowMetaText>
              </SpanRowPeriodCol>
            </SpanRowItem>
          )}
        </SpanRowsList>
      </SpanViewContainer>
    </SpanViewScrollOuter>
  )
}

const MIN_COLUMN_WIDTH = 196
const MAX_COLUMN_WIDTH = 276
const DOT_SIZE = 9
const COLUMN_GAP = 12

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const ToolbarRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
`

const ToolbarLeftGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const ToolbarRightGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-left: auto;
`

const SpanSummaryBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 7px;
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.035)'};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const ZoomControlGroup = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border-radius: 8px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.045)' : 'rgba(15,23,42,0.04)'};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const ZoomStepButton = styled.button`
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.background.primary};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
`

const ZoomReadoutButton = styled.button<{ $modified: boolean }>`
  min-width: 46px;
  height: 24px;
  padding: 0 6px;
  border: none;
  border-radius: 6px;
  background: ${({ theme, $modified }) =>
    $modified ? theme.colors.background.primary : 'transparent'};
  color: ${({ theme, $modified }) =>
    $modified ? theme.colors.primary : theme.colors.text.secondary};
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    color 0.15s ease,
    background 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.background.primary};
  }
`

const ViewSwitchGroup = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border-radius: 8px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.045)' : 'rgba(15,23,42,0.04)'};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const ViewSwitchButton = styled.button<{ $active: boolean }>`
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : theme.colors.text.tertiary};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.background.primary : 'transparent'};
  box-shadow: ${({ $active }) =>
    $active ? '0 1px 2px rgba(15, 23, 42, 0.08)' : 'none'};
  transition:
    color 0.15s ease,
    background 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focusRing.primary};
    outline-offset: 1px;
  }
`

const ExpandModalButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)'};
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease,
    background 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.medium};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.055)'};
  }
`

const ModalCloseButton = styled(ExpandModalButton)`
  padding: 6px 12px;
  font-size: 12px;
`

const ViewportWrap = styled.div`
  position: relative;
`

const NavStepButton = styled.button<{ $side: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  ${({ $side }) => ($side === 'left' ? 'left: 6px;' : 'right: 6px;')}
  transform: translateY(-50%);
  z-index: 3;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.medium};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.12);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.text.secondary};
    transform: translateY(-50%) scale(1.05);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focusRing.primary};
    outline-offset: 2px;
  }
`

/** 가장자리 흐림은 틀에 씌운다 — 스크롤되는 안쪽에 씌우면 흐림도 같이 밀려간다 */
const Frame = styled.div<{ $fadeStart: boolean; $fadeEnd: boolean }>`
  position: relative;
  mask-image: linear-gradient(
    90deg,
    ${({ $fadeStart }) => ($fadeStart ? 'transparent 0, #000 36px' : '#000 0')},
    ${({ $fadeEnd }) =>
      $fadeEnd ? '#000 calc(100% - 36px), transparent 100%' : '#000 100%'}
  );
`

const Scroller = styled.div`
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 10px;
  scrollbar-width: thin;
`

const ZoomCanvas = styled.div<{ $scale: number }>`
  zoom: ${({ $scale }) => $scale};
  min-width: 100%;
  width: max-content;
`

const Columns = styled.ol`
  display: flex;
  width: max-content;
  min-width: 100%;
  margin: 0;
  padding: 2px 0 0;
  list-style: none;
`

const Column = styled.li`
  flex: 1 0 ${MIN_COLUMN_WIDTH}px;
  max-width: ${MAX_COLUMN_WIDTH}px;
  display: flex;
  flex-direction: column;
`

const EndpointColumn = styled(Column)`
  flex: 0 0 ${MIN_COLUMN_WIDTH}px;
`

/**
 * 1단: 축 레일 행 — 오직 점(TickDot)과 가로 연결선(AxisRailLine)만 배치한다.
 * 텍스트가 이 행에 절대 들어오지 않으므로 선과 글자가 겹칠 일이 없다.
 */
const AxisRailRow = styled.div`
  display: flex;
  align-items: center;
  height: ${DOT_SIZE}px;
  margin-bottom: 6px;
`

const TickDot = styled.span<{ $highlight?: boolean }>`
  width: ${DOT_SIZE}px;
  height: ${DOT_SIZE}px;
  flex-shrink: 0;
  border-radius: 999px;
  background: ${({ theme, $highlight }) =>
    $highlight ? theme.colors.text.primary : theme.colors.background.primary};
  border: 2px solid
    ${({ theme, $highlight }) =>
      $highlight ? theme.colors.text.primary : theme.colors.text.tertiary};
  box-sizing: border-box;
`

const AxisRailLine = styled.span`
  flex: 1;
  height: 1px;
  background: ${({ theme }) => theme.colors.border.medium};
`

/**
 * 2단: 세기 라벨 행 — 축 레일(AxisRailRow) 바로 아래에 분리 배치.
 */
const CenturyLabelRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 5px;
  padding-right: ${COLUMN_GAP}px;
  margin-bottom: 10px;
  min-height: 18px;
`

const TickLabel = styled.span<{ $highlight?: boolean }>`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.01em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: ${({ theme, $highlight }) =>
    $highlight ? theme.colors.text.primary : theme.colors.text.secondary};
`

const ColumnCountText = styled.span`
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CenturyGapText = styled.span`
  margin-left: auto;
  font-size: 10.5px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 같은 세기에 시작한 나라들 — 위아래는 동시대 */
const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding-right: ${COLUMN_GAP}px;
`

const Card = styled.div<{
  $current?: boolean
  $interactive?: boolean
}>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 10px;
  font: inherit;
  text-align: left;
  border: 1px solid
    ${({ theme, $current }) =>
      $current ? theme.colors.border.medium : theme.colors.border.light};
  background: ${({ theme, $current }) =>
    $current
      ? theme.colors.activeLight
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.03)'
        : 'rgba(15, 23, 42, 0.02)'};
  cursor: ${({ $interactive }) => ($interactive ? 'pointer' : 'default')};
  transition:
    background 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    border-color: ${({ theme, $interactive, $current }) =>
      $interactive || $current
        ? theme.colors.border.medium
        : theme.colors.border.light};
    background: ${({ theme, $interactive, $current }) =>
      $current
        ? theme.colors.activeLight
        : $interactive
          ? theme.mode === 'dark'
            ? 'rgba(255,255,255,0.055)'
            : 'rgba(15, 23, 42, 0.04)'
          : theme.mode === 'dark'
            ? 'rgba(255,255,255,0.03)'
            : 'rgba(15, 23, 42, 0.02)'};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focusRing.primary};
    outline-offset: 2px;
  }
`

const CardHeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
`

const CardTitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  flex: 1;
`

const FlagThumb = styled.span<{ $small?: boolean }>`
  width: ${({ $small }) => ($small ? '20px' : '22px')};
  height: ${({ $small }) => ($small ? '14px' : '15px')};
  flex-shrink: 0;
  border-radius: 3px;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)'};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const FlagThumbImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const CardName = styled.span`
  font-size: 13.5px;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  word-break: keep-all;
  overflow-wrap: anywhere;
`

const CardJumpIcon = styled.span`
  flex-shrink: 0;
  margin-top: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  opacity: 0.55;
  transition:
    opacity 0.15s ease,
    color 0.15s ease,
    transform 0.15s ease;

  ${Card}:hover & {
    opacity: 1;
    color: ${({ theme }) => theme.colors.text.primary};
    transform: translate(1px, -1px);
  }
`

const CardPeriodRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
  flex-wrap: wrap;
`

const CardYears = styled.span`
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CardDurationText = styled.span`
  font-size: 11.5px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CardTagsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 2px;
`

const MetaTag = styled.span<{ $highlight?: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 1.5px 6px;
  border-radius: 5px;
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1.3;
  color: ${({ theme, $highlight }) =>
    $highlight ? theme.colors.primary : theme.colors.text.tertiary};
  background: ${({ theme, $highlight }) =>
    $highlight
      ? theme.colors.background.primary
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.055)'
        : 'rgba(15, 23, 42, 0.045)'};
`

const MoreButton = styled.button`
  align-self: flex-start;
  padding: 4px 8px;
  margin-left: -2px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.045)'};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focusRing.primary};
    outline-offset: 2px;
  }
`

/* ── 존속 기간 바(Timeline Span Bar) 뷰 스타일 ── */

const SpanViewScrollOuter = styled.div`
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.015)'};
  scrollbar-width: thin;
`

const SpanViewContainer = styled.div<{ $scale: number }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  min-width: ${({ $scale }) => Math.round($scale * 100)}%;
  box-sizing: border-box;
`

const SpanRulerRow = styled.div`
  display: grid;
  grid-template-columns: minmax(180px, 230px) 1fr 140px;
  align-items: center;
  gap: 14px;
  padding: 0 8px 8px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (max-width: 640px) {
    grid-template-columns: 150px 1fr 110px;
  }
`

const SpanRulerIdentityStub = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SpanRulerPeriodStub = styled.span`
  font-size: 11px;
  font-weight: 700;
  text-align: right;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SpanRulerTrack = styled.div`
  position: relative;
  height: 18px;
`

const SpanRulerTick = styled.span<{ $align: 'start' | 'center' | 'end' }>`
  position: absolute;
  top: 0;
  transform: ${({ $align }) =>
    $align === 'start'
      ? 'translateX(0)'
      : $align === 'end'
        ? 'translateX(-100%)'
        : 'translateX(-50%)'};
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SpanRowsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 4px;
`

const SpanRowItem = styled.div<{
  $current?: boolean
  $interactive?: boolean
}>`
  display: grid;
  grid-template-columns: minmax(180px, 230px) 1fr 140px;
  align-items: center;
  gap: 14px;
  padding: 7px 8px;
  border-radius: 8px;
  border: 1px solid
    ${({ theme, $current }) =>
      $current ? theme.colors.border.medium : 'transparent'};
  background: ${({ theme, $current }) =>
    $current ? theme.colors.activeLight : 'transparent'};
  font: inherit;
  text-align: left;
  cursor: ${({ $interactive }) => ($interactive ? 'pointer' : 'default')};
  transition: background 0.15s ease;

  &:hover {
    background: ${({ theme, $current, $interactive }) =>
      $current
        ? theme.colors.activeLight
        : $interactive
          ? theme.mode === 'dark'
            ? 'rgba(255,255,255,0.045)'
            : 'rgba(15,23,42,0.035)'
          : 'transparent'};
  }

  @media (max-width: 640px) {
    grid-template-columns: 150px 1fr 110px;
  }
`

const SpanRowIdentity = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
`

const SpanRowTitleLine = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  min-width: 0;
`

const SpanRowName = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  word-break: keep-all;
`

const SpanRowPeriodCol = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  min-width: 0;
`

const SpanRowMetaText = styled.span`
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SpanBarLane = styled.div`
  position: relative;
  height: 12px;
  border-radius: 6px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.045)'};
  display: flex;
  align-items: center;
  overflow: hidden;
`

const SpanGridGuide = styled.span`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: ${({ theme }) => theme.colors.border.light};
  opacity: 0.6;
`

const SpanBarFill = styled.div<{ $current?: boolean }>`
  position: absolute;
  top: 2px;
  bottom: 2px;
  border-radius: 4px;
  background: ${({ theme, $current }) =>
    $current ? theme.colors.primary : theme.colors.text.secondary};
  opacity: ${({ $current }) => ($current ? 0.9 : 0.65)};
  min-width: 6px;
`

const SpanUnknownTag = styled.span`
  padding-left: 8px;
  font-size: 10.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SpanRowJump = styled.span`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  opacity: 0.45;
  transition: opacity 0.15s ease;

  ${SpanRowItem}:hover & {
    opacity: 1;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

/* ── 전체화면(Fullscreen) 확대 모달 스타일 ── */

const FullscreenBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(15, 23, 42, 0.62);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
`

const FullscreenDialog = styled.div`
  width: min(1680px, 96vw);
  height: min(920px, 90vh);
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.medium};
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.28);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const FullscreenHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.015)'};
`

const FullscreenTitleGroup = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`

const FullscreenTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const FullscreenHint = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const FullscreenCanvas = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 24px;
`
