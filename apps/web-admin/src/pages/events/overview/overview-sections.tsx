/**
 * 최상위 사건 조망의 패널들. 상태(거르기·강조)는 페이지가 갖고, 여기는 그리기만 한다.
 *
 * 패널끼리 **같은 번호**를 쓴다 — 간트의 줄 번호 = 매트릭스의 열 번호 = 점검표의 줄 번호.
 * 한 패널에서 사건에 마우스를 올리면(`hotId`) 세 패널 모두 그 사건을 칠한다.
 */
import { Fragment, type ReactNode, useEffect, useRef, useState } from 'react'

import { useTheme } from 'styled-components'

import { domainAccent, domainLabel } from '@/entities/event/model/event-domain'
import type { EventOverviewNode } from '@/shared/api/event-overview'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'

import {
  CHECK_COLUMNS,
  type CountBar,
  type CoverageGap,
  type GanttFit,
  type GanttLayout,
  type MatrixCountry,
  type MetricRow,
  type MissingRootCountry,
  type OverviewGrouping,
  SINGLES_GROUP_KEY,
  type PeriodFilter,
  type TimeBin,
  type PersonAggregate,
  applicableCountByColumn,
  checkNode,
  chooseLabelPlace,
  compareOutline,
  checkFillHref,
  checkScore,
  emptyCountByColumn,
  groupRuns,
  roleLabel,
  roleTone,
} from './event-overview.lib'
import { type RegroupCandidate, RegroupBar } from '../detail/components/collection-regroup'
import { withSideColors } from '../detail/components/side-colors'

import * as S from './overview.styles'

/** 사건 하나가 지금 걸러진 집합 밖인가 — 집합이 없으면 아무것도 흐리지 않는다 */
const isDimmed = (visibleIds: Set<string> | null, id: string) =>
  visibleIds !== null && !visibleIds.has(id)

interface HoverProps {
  hotId: string | null
  onHover: (id: string | null) => void
  /** 사건 모달 열기 — 조망을 떠나지 않는다 */
  onOpen: (id: string) => void
}

// ─── 전개 간트 ─────────────────────────────────────────────────────────────

type TreeGuideKind = 'pass' | 'tee' | 'elbow' | 'stem'

/**
 * 들여쓰기 가지선 — 줄마다 단계(2단계부터)별로 무엇을 긋나.
 * - 자기 단계: 형제가 뒤에 더 있으면 ├(tee), 마지막이면 └(elbow)
 * - 조상 단계: 그 조상에게 뒤 형제가 있으면 세로선이 지나간다(pass), 없으면 비운다
 * 순서는 화면 줄 순서(트리 순) 그대로.
 */
function buildTreeGuides(
  nodes: EventOverviewNode[],
): Map<string, Array<{ level: number; kind: TreeGuideKind }>> {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  /** 뒤에 같은 부모의 형제가 또 나오는 사건 */
  const hasLaterSibling = new Set<string>()
  const seenParents = new Set<string>()
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const parentKey = nodes[index].parentEventId ?? ''
    if (seenParents.has(parentKey)) hasLaterSibling.add(nodes[index].id)
    seenParents.add(parentKey)
  }
  const hasShownChild = new Set(nodes.map((node) => node.parentEventId ?? ''))
  const guides = new Map<string, Array<{ level: number; kind: TreeGuideKind }>>()
  for (const node of nodes) {
    const list: Array<{ level: number; kind: TreeGuideKind }> = []
    // 자식이 보이는 줄 — 점 아래로 줄기를 내려 첫 자식의 가지선과 잇는다
    if (hasShownChild.has(node.id)) list.push({ level: node.depth + 1, kind: 'stem' })
    if (node.depth >= 2) list.push({ level: node.depth, kind: hasLaterSibling.has(node.id) ? 'tee' : 'elbow' })
    let ancestor = node.depth >= 2 && node.parentEventId ? byId.get(node.parentEventId) : undefined
    while (ancestor && ancestor.depth >= 2) {
      if (hasLaterSibling.has(ancestor.id)) list.push({ level: ancestor.depth, kind: 'pass' })
      ancestor = ancestor.parentEventId ? byId.get(ancestor.parentEventId) : undefined
    }
    if (list.length > 0) guides.set(node.id, list)
  }
  return guides
}

export function GanttPanel({
  root = null,
  hideFiltered = false,
  grouping,
  foldedGroups,
  onToggleGroup: toggleGroup,
  gantt,
  gaps,
  fit,
  onFitChange,
  numberById,
  visibleIds,
  hotId,
  onHover,
  onOpen,
}: HoverProps & {
  /**
   * 걸리지 않은 줄을 흐리지 않고 뺀다 — 묶음을 고르면 '그 묶음만 보기'라 다른 줄 8개가 흐린 채
   * 자리를 차지할 이유가 없다. 나라·세부·시기 거르기는 흐리기(맥락 유지) 그대로.
   */
  hideFiltered?: boolean
  /**
   * 상위 사건 — 주면 '묶음 만들기'가 선다: 줄을 골라 새 묶음으로 묶거나 기존 묶음 밑으로 옮긴다
   * (개요 › 전개의 RegroupBar와 같은 길). 조망에서 함께 묶일 것이 보이는데 묶으려면 전개로 가야 했다.
   */
  root?: { id: string; domain?: string | null } | null
  /** 묶음 — 묶음 줄을 머리로 세우고, 그 아래 줄에 묶음 선·기간 띠를 깐다 */
  grouping: OverviewGrouping
  /**
   * 접은 묶음 — 머리 줄(묶음 자신)만 남기고 아래 줄을 감춘다. 상태는 조망 지면이 든다:
   * 패널 안에 두면 다른 탭에 다녀오는 순간(패널이 내려갔다 다시 서며) 다 펼쳐졌다.
   */
  foldedGroups: Set<string>
  onToggleGroup: (groupId: string) => void
  gantt: GanttLayout
  /** 상위 기간 중 하위가 덮지 않는 구간 */
  gaps: CoverageGap[]
  fit: GanttFit
  onFitChange: (fit: GanttFit) => void
  numberById: Map<string, string>
  visibleIds: Set<string> | null
}) {
  const theme = useTheme()
  const groupById = new Map(grouping.groups.map((group) => [group.id, group]))
  const shownRows = gantt.rows.filter((row) => {
    if (hideFiltered && visibleIds && !visibleIds.has(row.node.id)) return false
    const groupId = grouping.groupIdOf.get(row.node.id)
    return !groupId || groupId === row.node.id || !foldedGroups.has(groupId)
  })
  const hiddenCount = hideFiltered && visibleIds ? gantt.rows.filter((row) => !visibleIds.has(row.node.id)).length : 0
  /** 묶음 띠의 끝 — 그 묶음의 마지막으로 보이는 줄(띠 아래를 조금 띄운다) */
  const lastShownOfGroup = new Map<string, string>()
  for (const row of shownRows) {
    const groupId = grouping.groupIdOf.get(row.node.id)
    if (groupId) lastShownOfGroup.set(groupId, row.node.id)
  }
  const treeGuides = buildTreeGuides(shownRows.map((row) => row.node))
  /** 묶음 만들기 — 고르는 중인가, 무엇을 골랐나 */
  const [regrouping, setRegrouping] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(() => new Set())
  const togglePick = (id: string) =>
    setPicked((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const endRegroup = () => {
    setRegrouping(false)
    setPicked(new Set())
  }
  const allNodes = [...gantt.rows.map((row) => row.node), ...gantt.undated]
  const toCandidate = (node: EventOverviewNode): RegroupCandidate => ({
    id: node.id,
    title: node.title,
    isCollection: node.kind === 'COLLECTION',
    startDate: node.startDate,
    startDatePrecision: node.startDatePrecision,
    endDate: node.endDate,
    endDatePrecision: node.endDatePrecision,
  })
  /** 고른 것과 그 아래 — 그 밑으로는 옮길 수 없다(순환) */
  const pickedSubtree = new Set<string>(picked)
  for (let grew = true; grew; ) {
    grew = false
    for (const node of allNodes) {
      if (node.parentEventId && pickedSubtree.has(node.parentEventId) && !pickedSubtree.has(node.id)) {
        pickedSubtree.add(node.id)
        grew = true
      }
    }
  }
  /** 트랙 실제 폭 — 날짜 라벨이 들어갈 자리를 픽셀로 판정한다(축 행과 트랙 열의 폭이 같다) */
  const axisRef = useRef<HTMLDivElement>(null)
  const [trackPx, setTrackPx] = useState(420)
  useEffect(() => {
    const element = axisRef.current
    if (!element || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(([entry]) => setTrackPx(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  /** 띠가 축을 거의 다 덮어 그리지 않을 때만 경계선으로 말한다(띠가 있으면 띠 가장자리가 곧 경계) */
  const edges = gantt.parentBand ? [] : gantt.parentEdges
  /** 막대 색 = 분야 — 둘 이상일 때만 범례(하나뿐이면 색이 가르는 게 없다). 많은 순 */
  const domainCounts = new Map<string, number>()
  for (const row of gantt.rows) domainCounts.set(row.node.domain, (domainCounts.get(row.node.domain) ?? 0) + 1)
  const domainsShown = [...domainCounts].sort((left, right) => right[1] - left[1])
  /** 빗금은 지금 축 안에 드는 부분만 — 하위에 맞춘 축이면 대개 화면 밖이라 경고 줄이 대신 말한다 */
  const hatches = gaps
    .map((gap) => ({
      left: Math.max(0, gantt.toPct(gap.from)),
      right: Math.min(100, gantt.toPct(gap.to)),
    }))
    .filter((hatch) => hatch.right > hatch.left)
  const outsideCount = gantt.rows.filter((row) => row.outside).length
  return (
    <S.Panel $wide id="overview-gantt" aria-labelledby="overview-gantt-title">
      <S.PanelHead>
        <S.PanelTitle id="overview-gantt-title">전개</S.PanelTitle>
        {root && (
          <S.RegroupToggle
            type="button"
            aria-pressed={regrouping}
            $active={regrouping}
            onClick={() => (regrouping ? endRegroup() : setRegrouping(true))}
          >
            {regrouping ? '고르기 끝' : '묶음 만들기'}
          </S.RegroupToggle>
        )}
        <S.ViewSwitch role="group" aria-label="시간축 범위">
          <S.ViewSwitchItem
            type="button"
            $active={fit === 'children'}
            aria-pressed={fit === 'children'}
            onClick={() => onFitChange('children')}
          >
            하위 사건에 맞춤
          </S.ViewSwitchItem>
          <S.ViewSwitchItem
            type="button"
            $active={fit === 'parent'}
            aria-pressed={fit === 'parent'}
            onClick={() => onFitChange('parent')}
          >
            상위 기간 전체
          </S.ViewSwitchItem>
        </S.ViewSwitch>
        <S.PanelNote style={{ flexBasis: '100%' }}>
          {gantt.parentBand
            ? '회색 띠 = 상위 사건의 기간'
            : edges.length > 0
              ? '세로 선 = 상위 사건의 시작·끝'
              : '축 전체가 상위 사건의 기간 안'}
          {' · 점선 막대 = 연·월만 아는 날짜(그 기간 어딘가)'}
          {gantt.undated.length > 0 && ` · 날짜 없음 ${gantt.undated.length}건은 '기록 점검' 탭에`}
          {outsideCount > 0 && ` · 상위 기간 밖 ${outsideCount}건(제목 뒤 '기간 전·후' 표지)`}
          {hiddenCount > 0 && ` · 묶음 밖 ${hiddenCount}건 숨김`}
        </S.PanelNote>
        {domainsShown.length > 1 && (
          <S.DomainLegend aria-label="막대 색 — 분야">
            {domainsShown.map(([domain, count]) => (
              <li key={domain}>
                <S.CategoryDot $color={domainAccent(domain, theme.mode)} aria-hidden="true" />
                {domainLabel(domain)}
                <S.Muted> {count}</S.Muted>
              </li>
            ))}
          </S.DomainLegend>
        )}
        {gaps.length > 0 && (
          <S.GapNotice role="note">
            <span>
              하위 사건이 없는 구간{' '}
              {gaps.map((gap, index) => (
                <span key={gap.label}>
                  {index > 0 && ', '}
                  <strong>{gap.label}</strong> (상위 기간의 {Math.round(gap.share * 100)}%)
                </span>
              ))}
            </span>
            {/* 하위에 맞춘 축은 공백이 대개 화면 밖(빗금이 끝에 한 줄기만 걸리기도 한다) — 늘 길을 준다 */}
            {fit === 'children' && (
              <S.TextButton type="button" onClick={() => onFitChange('parent')}>
                상위 기간 전체로 보기
              </S.TextButton>
            )}
          </S.GapNotice>
        )}
      </S.PanelHead>
      {regrouping && root && (
        <S.RegroupArea>
          {picked.size === 0 ? (
            <S.PanelNote>묶을 사건을 줄 왼쪽 상자로 고르세요 — 새 묶음으로 묶거나 기존 묶음 밑으로 옮깁니다.</S.PanelNote>
          ) : (
            <RegroupBar
              parent={root}
              selected={allNodes.filter((node) => picked.has(node.id)).map(toCandidate)}
              candidates={allNodes
                .filter((node) => node.kind === 'COLLECTION' && !pickedSubtree.has(node.id))
                .map(toCandidate)}
              onDone={endRegroup}
              onCancel={endRegroup}
            />
          )}
        </S.RegroupArea>
      )}
      {gantt.rows.length === 0 ? (
        <S.Empty>날짜가 있는 하위 사건이 없습니다.</S.Empty>
      ) : (
        <S.GanttScroll>
          <S.GanttGrid role="list" aria-label="하위 사건 시간축">
            <S.GanttAxisCorner aria-hidden="true" />
            <S.GanttAxis aria-hidden="true" ref={axisRef}>
              {edges.map((edge) => (
                <S.ParentEdgeMark key={edge.side} $side={edge.side} style={{ left: `${edge.pct}%` }}>
                  {edge.label}
                </S.ParentEdgeMark>
              ))}
              {gantt.parentBand && (
                <S.ParentBandMark
                  style={{
                    left: `${gantt.parentBand.leftPct}%`,
                    width: `${gantt.parentBand.widthPct}%`,
                  }}
                />
              )}
              {gantt.breaks.map((axisBreak) => (
                <S.AxisBreak
                  key={axisBreak.from}
                  title={`${axisBreak.label} — 빈 구간을 접어 그렸습니다`}
                  style={{ left: `${axisBreak.pct}%` }}
                >
                  ≈
                </S.AxisBreak>
              ))}
              {gantt.ticks.map((tick) => (
                <S.GanttTick
                  key={`${tick.pct}-${tick.label}`}
                  $align={tick.align}
                  style={{ left: `${tick.pct}%` }}
                >
                  {tick.label}
                </S.GanttTick>
              ))}
            </S.GanttAxis>
            {shownRows.map((row, rowIndex) => {
              const stripe = rowIndex % 2 === 1
              const groupId = grouping.groupIdOf.get(row.node.id)
              const group = groupId ? groupById.get(groupId) : undefined
              const isGroupHead = group !== undefined && group.id === row.node.id
              const groupTone = group ? S.groupColor(group.index, theme.mode) : null
              const groupBand =
                group?.span !== null && group !== undefined && group.span
                  ? {
                      left: Math.max(0, gantt.toPct(group.span.from)),
                      right: Math.min(100, gantt.toPct(group.span.to)),
                    }
                  : null
              const dim = isDimmed(visibleIds, row.node.id)
              const hot = hotId === row.node.id
              const color = domainAccent(row.node.domain, theme.mode)
              // 라벨이 막대 오른쪽에 붙되, 오른쪽 끝에 가까우면 막대 왼쪽 안쪽으로 들인다
              // 날짜 라벨 자리: 막대 오른쪽 → (오른쪽 끝이면) 왼쪽 → (양쪽 다 없으면) 막대 안.
              // 25년짜리 차관처럼 축 전체를 덮는 막대는 왼쪽에 두면 제목 열 밑으로 잘렸다('14.7.28')
              const labelLeft = row.leftPct + row.widthPct
              const labelPlace = chooseLabelPlace({
                leftPct: row.leftPct,
                widthPct: row.widthPct,
                trackPx,
                label: row.dateLabel,
                uncertain: row.uncertain,
              })
              return (
                <div
                  key={row.node.id}
                  role="listitem"
                  style={{ display: 'contents' }}
                  onMouseEnter={() => onHover(row.node.id)}
                  onMouseLeave={() => onHover(null)}
                >
                  <S.GanttLabel
                    $depth={row.node.depth}
                    $dim={dim}
                    $hot={hot}
                    $stripe={stripe}
                    $groupHead={isGroupHead}
                  >
                    {/* 접기 칸 — 묶음 머리 줄만 단추, 나머지는 빈 칸이라 번호 열이 줄마다 같은 자리 */}
                    {regrouping ? (
                      <S.RowPick
                        type="checkbox"
                        checked={picked.has(row.node.id)}
                        onChange={() => togglePick(row.node.id)}
                        aria-label={`${row.node.title} 고르기`}
                      />
                    ) : isGroupHead && group ? (
                      <S.GroupFold
                        type="button"
                        aria-expanded={!foldedGroups.has(group.id)}
                        aria-label={`${group.title} 묶음 ${foldedGroups.has(group.id) ? '펼치기' : '접기'}`}
                        onClick={() => toggleGroup(group.id)}
                      >
                        {foldedGroups.has(group.id) ? '▸' : '▾'}
                      </S.GroupFold>
                    ) : (
                      <S.FoldSlot aria-hidden="true" />
                    )}
                    <S.GanttNumber $sub={row.node.depth >= 2}>{numberById.get(row.node.id)}</S.GanttNumber>
                    {/* 하위는 제목을 한 단계씩 들이고 상위에서 내려오는 가지선을 긋는다 */}
                    {(row.node.depth >= 2 || treeGuides.has(row.node.id)) && (
                      <S.TreeIndent $levels={row.node.depth - 1} aria-hidden="true">
                        {(treeGuides.get(row.node.id) ?? []).map((guide) => (
                          <S.TreeGuide key={guide.level} $level={guide.level} $kind={guide.kind} />
                        ))}
                      </S.TreeIndent>
                    )}
                    <S.CategoryDot $color={color} title={domainLabel(row.node.domain)} />
                    <S.RowTitleButton
                      type="button"
                      $wrap
                      onClick={() => onOpen(row.node.id)}
                      title={
                        row.parentTitle ? `${row.node.title} — ${row.parentTitle}의 하위` : row.node.title
                      }
                      onFocus={() => onHover(row.node.id)}
                      onBlur={() => onHover(null)}
                    >
                      {row.node.title}
                    </S.RowTitleButton>
                    {/* 상위 기간 밖 — 예전엔 줄 맨 왼쪽 주황 세로선이었다(묶음 왼쪽 색선과 같은 문법이라
                        함께 걷어 냄). 이제 제목 뒤 작은 글자 표지 */}
                    {row.outside && (
                      <S.OutsideTag
                        title={
                          row.outside === 'before'
                            ? '기간 전 — 상위 사건이 시작하기 전에 시작. 상위 기간을 넓힐지, 전사(前史)인지 확인'
                            : '기간 후 — 상위 사건이 끝난 뒤까지 이어짐. 상위 기간을 넓힐지 확인'
                        }
                      >
                        {row.outside === 'before' ? '기간 전' : '기간 후'}
                      </S.OutsideTag>
                    )}
                    {isGroupHead && group && groupTone && (
                      <S.GroupTag $color={groupTone}>
                        묶음 · {group.memberIds.length}건
                        {foldedGroups.has(group.id) && ' 접힘'}
                      </S.GroupTag>
                    )}
                  </S.GanttLabel>
                  {/* 막대 영역은 마우스 보조 진입점 — 키보드는 왼쪽 제목 버튼 */}
                  <S.GanttTrack
                    $dim={dim}
                    $hot={hot}
                    $stripe={stripe}
                    aria-hidden="true"
                    onClick={() => onOpen(row.node.id)}
                  >
                    {gantt.parentBand && (
                      <S.ParentBand
                        style={{
                          left: `${gantt.parentBand.leftPct}%`,
                          width: `${gantt.parentBand.widthPct}%`,
                        }}
                      />
                    )}
                    {groupBand && groupTone && (
                      <S.GroupBand
                        $color={groupTone}
                        $head={isGroupHead}
                        style={{
                          left: `${groupBand.left}%`,
                          width: `${Math.max(0.4, groupBand.right - groupBand.left)}%`,
                          bottom: lastShownOfGroup.get(group?.id ?? '') === row.node.id ? 4 : 0,
                        }}
                      />
                    )}
                    {hatches.map((hatch) => (
                      <S.GapHatch
                        key={hatch.left}
                        style={{ left: `${hatch.left}%`, width: `${hatch.right - hatch.left}%` }}
                      />
                    ))}
                    {gantt.breaks.map((axisBreak) => (
                      <S.BreakBand
                        key={axisBreak.from}
                        style={{ left: `${axisBreak.pct - S.BREAK_HALF_PCT}%`, width: `${S.BREAK_HALF_PCT * 2}%` }}
                      />
                    ))}
                    {gantt.ticks.map((tick) => (
                      <S.GridLine key={`${tick.pct}-${tick.label}`} style={{ left: `${tick.pct}%` }} />
                    ))}
                    {edges.map((edge) => (
                      <S.ParentEdgeLine key={edge.side} style={{ left: `${edge.pct}%` }} />
                    ))}
                    <S.Bar
                      $color={color}
                      $uncertain={row.uncertain}
                      $point={row.isPoint}
                      style={{ left: `${row.leftPct}%`, width: row.isPoint ? undefined : `${row.widthPct}%` }}
                    />
                    <S.BarLabel
                      $inside={labelPlace === 'inside' && !row.uncertain}
                      $pinned={labelPlace === 'pinned'}
                      style={
                        labelPlace === 'pinned'
                          ? { right: 4 }
                          : labelPlace === 'right'
                          ? { left: `${labelLeft}%` }
                          : labelPlace === 'left'
                            ? { right: `${100 - row.leftPct}%`, paddingLeft: 0, paddingRight: 8 }
                            : { right: `${100 - labelLeft}%`, paddingLeft: 0, paddingRight: 10 }
                      }
                    >
                      {row.dateLabel}
                    </S.BarLabel>
                  </S.GanttTrack>
                </div>
              )
            })}
          </S.GanttGrid>
        </S.GanttScroll>
      )}
    </S.Panel>
  )
}

// ─── 참여국 매트릭스 ───────────────────────────────────────────────────────

/**
 * 가로로 넘치는 표 — 아직 오른쪽에 열이 남아 있으면 오른쪽 끝을 흐려 '더 있다'를 알린다.
 * 하위 12번째 열부터 화면 밖이었는데 스크롤바 말고는 단서가 없었다(맥은 스크롤바도 숨는다).
 */
function EdgeFadeScroll({ children }: { children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [moreRight, setMoreRight] = useState(false)
  useEffect(() => {
    const element = scrollRef.current
    if (!element) return undefined
    const measure = () => setMoreRight(element.scrollLeft + element.clientWidth < element.scrollWidth - 2)
    measure()
    element.addEventListener('scroll', measure, { passive: true })
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(element)
    if (element.firstElementChild) observer?.observe(element.firstElementChild)
    return () => {
      element.removeEventListener('scroll', measure)
      observer?.disconnect()
    }
  }, [])
  return (
    <S.EdgeFadeFrame data-more-right={moreRight || undefined}>
      <S.Scroll ref={scrollRef}>{children}</S.Scroll>
    </S.EdgeFadeFrame>
  )
}

export function CountryMatrixPanel(props: Parameters<typeof CountryMatrixTable>[0]) {
  const { hideFiltered = false, visibleIds, events } = props
  if (!hideFiltered || !visibleIds) return <CountryMatrixTable {...props} />
  // 묶음 거르기 — 묶음 밖 열은 빼고, 몇 개를 뺐는지 패널 안내에 남긴다
  return (
    <CountryMatrixTable
      {...props}
      events={events.filter((event) => visibleIds.has(event.id))}
      hiddenColumns={events.filter((event) => !visibleIds.has(event.id)).length}
    />
  )
}

function CountryMatrixTable({
  hiddenColumns = 0,
  grouping,
  missing,
  attaching,
  onAttachMissing,
  matrix,
  events,
  numberById,
  selectedCountryKey,
  onSelectCountry,
  visibleIds,
  hotId,
  onHover,
  onOpen,
}: HoverProps & {
  /**
   * 거르기 결과 — 간트·점검표처럼 걸리지 않은 열을 흐리고 나라별 건수를 걸린 사건으로만 센다.
   * 예전엔 이 패널만 거르기를 몰라 '전투만'을 걸어도 18열·원래 건수 그대로였다.
   */
  visibleIds: Set<string> | null
  /** 묶음 — 열 위에 묶음 머리 줄, 묶음 경계에 세로 선 */
  grouping: OverviewGrouping
  /** 걸리지 않은 열을 흐리지 않고 뺀다(묶음 거르기) — 간트와 같은 규칙 */
  hideFiltered?: boolean
  /** 뺀 열 수 — 안내에만 쓴다(래퍼가 채운다) */
  hiddenColumns?: number
  /** 하위에만 나오고 상위엔 안 걸린 나라 */
  missing: MissingRootCountry[]
  attaching: boolean
  onAttachMissing: () => void
  matrix: MatrixCountry[]
  events: EventOverviewNode[]
  numberById: Map<string, string>
  selectedCountryKey: string | null
  onSelectCountry: (key: string | null) => void
}) {
  const theme = useTheme()
  const tones = ['lead', 'target', 'statehood', 'neutral'] as const
  /** 걸린 사건 중 이 나라가 나오는 수 — 거르기가 없으면 전체 건수 */
  const shownCount = (country: MatrixCountry) =>
    visibleIds
      ? [...country.roleByEvent.keys()].filter((id) => visibleIds.has(id)).length
      : country.eventCount
  const maxCount = Math.max(1, ...matrix.map(shownCount))
  /** 상위 자신에 참여국이 하나도 없으면 '상위' 열은 통째로 빈칸이라 그리지 않는다 */
  const showRootColumn = matrix.some((country) => country.inRoot)
  /**
   * 하위 사건에 한 번도 안 나오는 나라(상위에만 걸림) — 1차대전 15개국 중 9개국이 '상위' 점 하나뿐인
   * 빈 줄이라 표 절반이 비어 있었다. 한 줄로 접고 이름만 보인다. 고른 나라는 접어도 남긴다.
   */
  const [rootOnlyOpen, setRootOnlyOpen] = useState(false)
  const rootOnly = matrix.filter((country) => country.eventCount === 0)
  const foldRootOnly = rootOnly.length >= 3 && !rootOnlyOpen
  const shownRows = foldRootOnly
    ? matrix.filter((country) => country.eventCount > 0 || country.key === selectedCountryKey)
    : matrix
  const foldedNames = rootOnly.filter((country) => country.key !== selectedCountryKey)
  /** 묶음 구간 — 열 순서(간트 순)에서 같은 묶음이 이어지는 칸들 */
  const hasGroups = grouping.groups.length > 0
  const groupById = new Map(grouping.groups.map((group) => [group.id, group]))
  const runs = hasGroups ? groupRuns(events.map((event) => event.id), grouping) : []
  /** 묶음 경계 열 — 그 열 왼쪽에 묶음 색 선 */
  const boundaryColor = new Map<string, string>()
  for (const run of runs) {
    if (run.start === 0 && !showRootColumn) continue
    const group = run.groupId ? groupById.get(run.groupId) : undefined
    boundaryColor.set(
      events[run.start].id,
      group ? S.groupColor(group.index, theme.mode) : theme.colors.border.default,
    )
  }
  const boundaryStyle = (id: string) => {
    const color = boundaryColor.get(id)
    return color ? { boxShadow: `inset 2px 0 0 ${color}` } : undefined
  }
  return (
    <S.Panel $wide id="overview-matrix" aria-labelledby="overview-matrix-title">
      <S.PanelHead>
        <S.PanelTitle id="overview-matrix-title">참여국 × 하위 사건</S.PanelTitle>
        <S.PanelNote>
          열 번호 = 사건 번호('전개' 탭과 같음, 3 아래는 3-1) · 나라를 누르면 그 나라가 낀 사건만 남는다
          {visibleIds && ' · 건수는 걸린 사건 기준'}
          {hiddenColumns > 0 && ` · 묶음 밖 ${hiddenColumns}건은 열에서 뺐다`}
        </S.PanelNote>
      </S.PanelHead>
      {matrix.length === 0 ? (
        <S.Empty>참여국이 기록된 하위 사건이 없습니다.</S.Empty>
      ) : (
        <>
          {missing.length > 0 && (
            <S.PanelNotice role="note">
              <span>
                상위 사건에 걸리지 않은 나라 <strong>{missing.length}개</strong> —{' '}
                {missing
                  .slice(0, 4)
                  .map((country) => `${country.name}(${country.eventCount})`)
                  .join(' · ')}
                {missing.length > 4 && ` 외 ${missing.length - 4}`}. 나라별 사건 목록·국가 대시보드에서 이
                사건이 빠진다.
              </span>
              <S.TextButton type="button" onClick={onAttachMissing} disabled={attaching}>
                {attaching ? '거는 중…' : `상위에도 ${missing.length}개국 걸기`}
              </S.TextButton>
            </S.PanelNotice>
          )}
          <S.Legend>
            {tones.map((tone) => (
              <span key={tone}>
                <S.RoleMark
                  $color={S.toneColor(tone, theme.mode)}
                  $hollow={tone === 'neutral'}
                  aria-hidden="true"
                />
                {S.ROLE_TONE_COLOR[tone].label}
              </span>
            ))}
          </S.Legend>
          <EdgeFadeScroll>
            <S.MatrixTable>
              <thead>
                {hasGroups && (
                  <tr>
                    <S.MatrixCountryCell aria-hidden="true" />
                    {showRootColumn && <th aria-hidden="true" />}
                    {runs.map((run) => {
                      const group = run.groupId ? groupById.get(run.groupId) : undefined
                      return (
                        <S.MatrixGroupHead
                          key={`${run.groupId ?? 'single'}-${run.start}`}
                          colSpan={run.length}
                          scope="colgroup"
                          $color={group ? S.groupColor(group.index, theme.mode) : null}
                          title={group ? `${group.title} — 묶음 ${group.memberIds.length}건` : '개별 사건'}
                        >
                          {group ? group.title : '개별'}
                        </S.MatrixGroupHead>
                      )
                    })}
                  </tr>
                )}
                <tr>
                  <S.MatrixCountryCell scope="col">
                    <S.Muted style={{ fontSize: 11, padding: '0 4px' }}>나라 (하위 N건)</S.Muted>
                  </S.MatrixCountryCell>
                  {showRootColumn && (
                    <S.MatrixHeadCell scope="col" title="상위 사건 자신에서의 배역">
                      상위
                    </S.MatrixHeadCell>
                  )}
                  {events.map((event) => (
                    <S.MatrixHeadCell
                      key={event.id}
                      style={boundaryStyle(event.id)}
                      scope="col"
                      title={event.title}
                      $hot={hotId === event.id}
                      $dim={isDimmed(visibleIds, event.id)}
                      onMouseEnter={() => onHover(event.id)}
                      onMouseLeave={() => onHover(null)}
                    >
                      <button
                        type="button"
                        onClick={() => onOpen(event.id)}
                        aria-label={`${numberById.get(event.id)}번 ${event.title} 열기`}
                      >
                        {numberById.get(event.id)}
                      </button>
                    </S.MatrixHeadCell>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shownRows.map((country) => {
                  const active = selectedCountryKey === country.key
                  const count = shownCount(country)
                  return (
                    <tr key={country.key}>
                      <S.MatrixCountryCell scope="row">
                        <S.CountryButton
                          type="button"
                          $active={active}
                          $dim={visibleIds !== null && count === 0 && !active}
                          aria-pressed={active}
                          onClick={() => onSelectCountry(active ? null : country.key)}
                          title={`${country.name}${country.kind === 'historical' ? ' (역사 국가)' : ''}${
                            visibleIds ? ` — 걸린 사건 중 ${count}건(전체 ${country.eventCount}건)` : ''
                          } — 눌러서 이 나라가 낀 사건만 보기`}
                        >
                          <span>
                            {country.flagEmoji ? `${country.flagEmoji} ` : ''}
                            {country.name}
                          </span>
                          <S.CountBadge $pct={(count / maxCount) * 100}>{count}</S.CountBadge>
                        </S.CountryButton>
                      </S.MatrixCountryCell>
                      {showRootColumn && (
                        <S.MatrixCell $hot={false}>
                          {country.inRoot ? (
                            <S.RoleMark
                              $color={S.toneColor(roleTone(country.rootRole), theme.mode)}
                              $hollow={roleTone(country.rootRole) === 'neutral'}
                              title={`상위 사건 — ${roleLabel(country.rootRole)}`}
                            />
                          ) : null}
                        </S.MatrixCell>
                      )}
                      {events.map((event) => {
                        const has = country.roleByEvent.has(event.id)
                        const role = country.roleByEvent.get(event.id) ?? null
                        return (
                          <S.MatrixCell
                            key={event.id}
                            style={boundaryStyle(event.id)}
                            $hot={hotId === event.id}
                            $dim={isDimmed(visibleIds, event.id)}
                            onMouseEnter={() => onHover(event.id)}
                            onMouseLeave={() => onHover(null)}
                            onClick={() => onOpen(event.id)}
                          >
                            {has && (
                              <S.RoleMark
                                $color={S.toneColor(roleTone(role), theme.mode)}
                                $hollow={roleTone(role) === 'neutral'}
                                title={`${event.title} — ${roleLabel(role)}`}
                                role="img"
                                aria-label={`${numberById.get(event.id)}번 ${event.title}: ${roleLabel(role)}`}
                              />
                            )}
                          </S.MatrixCell>
                        )
                      })}
                    </tr>
                  )
                })}
                {rootOnly.length >= 3 && (
                  <tr>
                    <S.RootOnlyCell colSpan={1 + (showRootColumn ? 1 : 0) + events.length}>
                      <S.RootOnlyToggle
                        type="button"
                        aria-expanded={rootOnlyOpen}
                        onClick={() => setRootOnlyOpen((open) => !open)}
                      >
                        <span aria-hidden="true">{rootOnlyOpen ? '▾' : '▸'}</span>
                        {rootOnlyOpen ? (
                          '하위에 안 나오는 나라 접기'
                        ) : (
                          <>
                            <strong>상위에만 걸린 나라 {foldedNames.length}곳</strong>
                            <S.Muted>
                              {foldedNames
                                .map((country) => `${country.flagEmoji ? `${country.flagEmoji} ` : ''}${country.name}`)
                                .join(' · ')}
                            </S.Muted>
                          </>
                        )}
                      </S.RootOnlyToggle>
                    </S.RootOnlyCell>
                  </tr>
                )}
              </tbody>
            </S.MatrixTable>
          </EdgeFadeScroll>
        </>
      )}
    </S.Panel>
  )
}

// ─── 분포 ──────────────────────────────────────────────────────────────────

/**
 * 세부 분야 + 시기 — 한 패널.
 *
 * 세부는 **정렬된 가로 막대**(세부마다 한 줄, 길이 = 건수, 누르면 거르기). 예전 한 줄 누적 막대는 구간 색을
 * 그 세부의 최다 분야 색으로 칠해, 1차대전처럼 세부 5개 중 3개가 '군사'면 같은 색 구간이 붙어 2px 틈으로만
 * 갈렸다 — 비율이 읽히지 않았고, 아래 범례 칩이 이미 같은 숫자를 말하고 있었다.
 *
 * 시기는 폭 전체 막대 — '진행 중'(옅게) 안에 '새로 시작'(진하게). 거르기가 걸리면 전체를 옅은 윤곽으로
 * 남기고 걸린 사건만 채운다(예전엔 거르기를 무시하고 전체만 그렸다).
 */
export function DistributionPanel({
  part,
  axis = null,
  matchedTypes = null,
  types,
  bins,
  selectedType,
  onSelectType,
  filtered = false,
  selectedPeriod = null,
  onSelectPeriod,
}: {
  types: CountBar[]
  bins: TimeBin[]
  selectedType: string | null
  onSelectType: (key: string | null) => void
  /** 나라·세부 거르기가 걸렸나 — 시기 막대가 걸린 사건만 채운다 */
  filtered?: boolean
  /** 고른 시기 — 그 막대를 강조하고, 다시 누르면 푼다 */
  selectedPeriod?: PeriodFilter | null
  /** 시기 막대 누르기 → 그 시기에 진행 중이던 사건만 남긴다 */
  onSelectPeriod?: (period: PeriodFilter | null) => void
  /**
   * 어느 쪽을 그리나 — 조망 탭이 성격별로 갈리면서 시기는 '전개'(시간) 탭, 세부는 '구성' 탭으로 갔다.
   */
  part: 'types' | 'period'
  /**
   * 간트 축 — 주면 시기 막대를 간트와 **같은 시간축**(같은 제목 열 폭·같은 트랙)에 세운다. 바로 위 간트의
   * 막대 아래에 그 시기의 밀도가 오도록. 예전엔 칸을 폭에 고르게 나눠, 간트의 7월과 막대의 7월이 어긋났다.
   */
  axis?: GanttLayout | null
  /**
   * 거르기가 걸렸을 때 세부별 걸린 사건 수 — 막대를 걸린 몫만 채우고 전체는 윤곽으로 남긴다.
   * 예전엔 묶음을 골라도 이 패널만 20건 전체를 셌다(다른 패널은 12건).
   */
  matchedTypes?: Map<string, number> | null
}) {
  const theme = useTheme()
  const total = types.reduce((sum, bar) => sum + bar.count, 0)
  const maxType = Math.max(1, ...types.map((bar) => bar.count))
  const maxActive = Math.max(1, ...bins.map((bin) => bin.active))
  const colorOf = (bar: CountBar) => domainAccent(bar.domain, theme.mode)
  return (
    <S.Panel $wide id={`overview-${part}`} aria-labelledby={`overview-${part}-title`}>
      <S.PanelHead>
        <S.PanelTitle id={`overview-${part}-title`}>{part === 'types' ? '세부 분야' : '시기 분포'}</S.PanelTitle>
        <S.PanelNote>
          {part === 'types'
            ? '어떤 일이 많았나 — 막대를 누르면 그 세부만 남는다'
            : '언제 몰렸나 — 칸을 누르면 그 시기에 진행 중이던 사건만 남는다'}
        </S.PanelNote>
      </S.PanelHead>

      {part !== 'types' ? null : total === 0 ? (
        <S.Empty>하위 사건이 없어 분포가 아직 없습니다.</S.Empty>
      ) : (
        <S.TypeBarList aria-label="세부 분야별 하위 사건 수">
          {types.map((bar) => {
            const active = selectedType === bar.key
            return (
              <li key={bar.key}>
                <S.TypeBarRow
                  type="button"
                  $active={active}
                  $dim={selectedType !== null && !active}
                  aria-pressed={active}
                  onClick={() => onSelectType(active ? null : bar.key)}
                >
                  <S.TypeBarName>
                    <S.CategoryDot $color={colorOf(bar)} aria-hidden="true" />
                    {bar.label}
                  </S.TypeBarName>
                  <S.TypeBarTrack aria-hidden="true">
                    {matchedTypes && (
                      <S.TypeBarGhost style={{ width: `${(bar.count / maxType) * 100}%` }} />
                    )}
                    <S.TypeBarFill
                      $color={colorOf(bar)}
                      $empty={matchedTypes !== null && (matchedTypes.get(bar.key) ?? 0) === 0}
                      style={{
                        width: `${(((matchedTypes ? matchedTypes.get(bar.key) : bar.count) ?? 0) / maxType) * 100}%`,
                      }}
                    />
                  </S.TypeBarTrack>
                  <S.TypeBarCount>
                    {matchedTypes ? (
                      <>
                        {matchedTypes.get(bar.key) ?? 0}
                        <S.Muted> / {bar.count}</S.Muted>
                      </>
                    ) : (
                      <>
                        {bar.count}
                        <S.Muted> · {Math.round((bar.count / Math.max(1, total)) * 100)}%</S.Muted>
                      </>
                    )}
                  </S.TypeBarCount>
                </S.TypeBarRow>
              </li>
            )
          })}
        </S.TypeBarList>
      )}

      {part === 'period' && bins.length > 0 && (
        <>
          <S.ChartLegend aria-hidden="true">
            <span>
              <S.LegendSwatch $tone="active" /> 그 시기에 진행 중
            </span>
            <span>
              <S.LegendSwatch $tone="started" /> 새로 시작
            </span>
            {filtered && (
              <span>
                <S.LegendSwatch $tone="ghost" /> 거르기 전 전체
              </span>
            )}
          </S.ChartLegend>
          {(() => {
          const histogram = (
          <S.Histogram
            role="group"
            aria-label="시기별 하위 사건 — 진행 중과 새로 시작. 누르면 그 시기로 거른다"
            $aligned={axis !== null}
          >
            {bins.map((bin) => {
              const left = axis ? Math.max(0, axis.toPct(bin.from)) : 0
              const right = axis ? Math.min(100, axis.toPct(bin.to)) : 0
              const placed = axis
                ? { position: 'absolute' as const, left: `${left}%`, width: `${Math.max(0.3, right - left)}%`, top: 0, bottom: 0, padding: '0 1px' }
                : undefined
              const active = filtered ? bin.matchedActive : bin.active
              const started = filtered ? bin.matchedStarted : bin.started
              const isSelected =
                selectedPeriod !== null && Math.abs(selectedPeriod.from - bin.from) < 1e-3
              return (
                <S.HistogramColumn
                  key={bin.label}
                  type="button"
                  style={placed}
                  $selected={isSelected}
                  aria-pressed={isSelected}
                  disabled={!onSelectPeriod || bin.active === 0}
                  onClick={() =>
                    onSelectPeriod?.(isSelected ? null : { from: bin.from, to: bin.to })
                  }
                  aria-label={
                    filtered
                      ? `${bin.label}: 걸린 사건 중 진행 중 ${active}건·새로 시작 ${started}건 (전체 진행 중 ${bin.active}건)`
                      : `${bin.label}: 진행 중 ${active}건, 새로 시작 ${started}건`
                  }
                  title={
                    filtered
                      ? `${bin.label} — 걸린 사건 진행 중 ${active} · 새로 시작 ${started} (전체 ${bin.active})`
                      : `${bin.label} — 진행 중 ${active} · 새로 시작 ${started}`
                  }
                >
                  {(active > 0 || (filtered && bin.active > 0)) && (
                    <S.HistogramCount aria-hidden="true">
                      {active}
                      {/* 전부 새로 시작이면 막대가 통째로 진한 색이라 '새 N'은 같은 말 반복 */}
                      {started > 0 && started !== active && <S.HistogramStarted>새 {started}</S.HistogramStarted>}
                    </S.HistogramCount>
                  )}
                  {/* 쌓음 높이 = 전체(거르기 전) — 그 안에서 걸린 몫을 바닥부터 채운다. 숫자는 막대 바로 위 */}
                  <S.HistogramStack style={{ height: `${(bin.active / maxActive) * 74}%` }}>
                    {filtered && <S.GhostBar />}
                    <S.ActiveBar $pct={bin.active === 0 ? 0 : (active / bin.active) * 100}>
                      <S.StartedBar $pct={active === 0 ? 0 : (started / active) * 100} />
                    </S.ActiveBar>
                  </S.HistogramStack>
                </S.HistogramColumn>
              )
            })}
          </S.Histogram>
          )
          if (!axis) return histogram
          // 간트와 같은 격자 — 왼쪽 제목 열 자리에 척도, 오른쪽 트랙에 막대와 간트 눈금
          return (
            <S.Scroll>
              <S.GanttGrid>
                <S.HistogramScale aria-hidden="true">
                  <span>최대 {maxActive}건</span>
                  <span>막대 높이 = 그 시기에 진행 중인 하위 수</span>
                </S.HistogramScale>
                <div>
                  {histogram}
                  <S.HistogramTickRow aria-hidden="true">
                    {axis.breaks.map((axisBreak) => (
                      <S.AxisBreak key={axisBreak.from} title={axisBreak.label} style={{ left: `${axisBreak.pct}%` }}>
                        ≈
                      </S.AxisBreak>
                    ))}
                    {axis.ticks.map((tick) => (
                      <S.GanttTick key={`${tick.pct}-${tick.label}`} $align={tick.align} style={{ left: `${tick.pct}%` }}>
                        {tick.label}
                      </S.GanttTick>
                    ))}
                  </S.HistogramTickRow>
                </div>
              </S.GanttGrid>
            </S.Scroll>
          )
          })()}
          {axis ? null : bins.length <= 16 ? (
            <S.HistogramLabels aria-hidden="true">
              {bins.map((bin) => (
                <span key={bin.label}>{bin.label}</span>
              ))}
            </S.HistogramLabels>
          ) : (
            <S.HistogramAxis aria-hidden="true">
              <span>{bins[0].label}</span>
              <span>{bins[Math.floor(bins.length / 2)].label}</span>
              <span>{bins[bins.length - 1].label}</span>
            </S.HistogramAxis>
          )}
        </>
      )}
    </S.Panel>
  )
}

// ─── 인물·진영·수치 ────────────────────────────────────────────────────────

export function PersonsPanel({
  persons,
  numberById,
  wide = false,
  onOpen,
  onPersonClick,
}: {
  persons: PersonAggregate[]
  numberById: Map<string, string>
  onOpen: (id: string) => void
  /** 이름 → 인물 모달. 없으면 이름은 글자로만 */
  onPersonClick?: (personId: string) => void
  /** 짝(진영·수치)이 접혀 혼자 설 때는 한 줄을 다 쓴다 — 오른쪽 반이 비지 않게 */
  wide?: boolean
}) {
  return (
    <S.Panel $wide={wide} id="overview-people" aria-labelledby="overview-persons-title">
      <S.PanelHead>
        <S.PanelTitle id="overview-persons-title">인물</S.PanelTitle>
        <S.PanelNote>{persons.length > 0 ? `${persons.length}명 · 많이 나오는 순` : ''}</S.PanelNote>
      </S.PanelHead>
      {persons.length === 0 ? (
        <S.Empty>하위 사건에 참여 인물이 아직 없습니다.</S.Empty>
      ) : (
        <S.Scroll>
          <S.Table>
            <thead>
              <tr>
                <th scope="col">인물</th>
                <th scope="col">나오는 사건</th>
              </tr>
            </thead>
            <tbody>
              {persons.map(({ person, events }) => {
                const displayName = getPersonDisplayName({
                  name: person.name ?? '',
                  surname: person.surname,
                  middleName: person.middleName,
                  nameDisplayOrder: person.nameDisplayOrder,
                  country: { defaultNameDisplayOrder: person.defaultNameDisplayOrder },
                })
                return (
                <tr key={person.personId}>
                  <td>
                    {onPersonClick ? (
                      <S.RowTitleButton
                        type="button"
                        onClick={() => onPersonClick(person.personId)}
                        aria-label={`${displayName} 인물 정보 열기`}
                      >
                        {displayName}
                      </S.RowTitleButton>
                    ) : (
                      displayName
                    )}
                  </td>
                  <td>
                    {events.map((event, index) => (
                      <span key={event.id}>
                        {index > 0 && ', '}
                        <S.RowTitleButton
                          type="button"
                          onClick={() => onOpen(event.id)}
                          style={{ whiteSpace: 'normal' }}
                        >
                          {numberById.has(event.id) ? `${numberById.get(event.id)}. ` : ''}
                          {event.title}
                        </S.RowTitleButton>
                        {event.role && <S.Muted> ({event.role})</S.Muted>}
                      </span>
                    ))}
                  </td>
                </tr>
                )
              })}
            </tbody>
          </S.Table>
        </S.Scroll>
      )}
    </S.Panel>
  )
}

/**
 * 진영 · 수치 — 다른 패널과 **같은 번호**를 달고, 제목을 누르면 사건 모달이 열리며, 마우스를 올리면
 * 세 패널이 함께 칠해진다. 예전엔 제목 글자뿐이라 이 패널만 번호 체계 밖에 있었다.
 * 줄 순서도 번호순(상위 사건 자신은 맨 위 '상위').
 */
export function SidesMetricsPanel({
  root,
  descendants,
  metrics,
  numberById,
  wide = false,
  hotId,
  onHover,
  onOpen,
}: HoverProps & {
  root: EventOverviewNode
  descendants: EventOverviewNode[]
  metrics: MetricRow[]
  numberById: Map<string, string>
  wide?: boolean
}) {
  /** 상위 = 0, 하위 = 전개 번호, 번호 없는 것(이론상 없음)은 맨 뒤 */
  const orderOf = (id: string) => (id === root.id ? '0' : (numberById.get(id) ?? '99999'))
  const withSides = [root, ...descendants]
    .filter((node) => node.sides.length > 0)
    .sort((left, right) => compareOutline(orderOf(left.id), orderOf(right.id)))
  const sortedMetrics = metrics
    .map((row, index) => ({ row, index }))
    .sort(
      (left, right) =>
        compareOutline(orderOf(left.row.eventId), orderOf(right.row.eventId)) || left.index - right.index,
    )
    .map(({ row }) => row)

  /** 번호 칸 + 제목 칸 — 상위는 모달 대상이 아니라 글자로만 */
  const renderEventCells = (id: string, title: string) =>
    id === root.id ? (
      <>
        <td>
          <S.Muted>상위</S.Muted>
        </td>
        <td>{title}</td>
      </>
    ) : (
      <>
        <td>
          <S.Muted>{numberById.get(id) ?? '—'}</S.Muted>
        </td>
        <td>
          <S.RowTitleButton
            type="button"
            style={{ whiteSpace: 'normal' }}
            onClick={(clickEvent) => {
              // 줄 클릭과 겹쳐 두 번 열리지 않게
              clickEvent.stopPropagation()
              onOpen(id)
            }}
          >
            {title}
          </S.RowTitleButton>
        </td>
      </>
    )
  const rowProps = (id: string) =>
    id === root.id
      ? { $hot: false, style: { cursor: 'default' } }
      : {
          $hot: hotId === id,
          onMouseEnter: () => onHover(id),
          onMouseLeave: () => onHover(null),
          onClick: () => onOpen(id),
        }

  return (
    <S.Panel $wide={wide} id="overview-sides" aria-labelledby="overview-sides-title">
      <S.PanelHead>
        <S.PanelTitle id="overview-sides-title">진영 · 수치</S.PanelTitle>
      </S.PanelHead>
      {withSides.length === 0 ? (
        <S.Empty>진영이 나뉜 사건이 아직 없습니다.</S.Empty>
      ) : (
        <S.Scroll>
          <S.Table>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">사건</th>
                <th scope="col">진영</th>
              </tr>
            </thead>
            <tbody>
              {withSides.map((node) => (
                <S.ChecklistRow key={node.id} {...rowProps(node.id)}>
                  {renderEventCells(node.id, node.title)}
                  <td>
                    {/* 진영마다 그 진영 색 칩 — 상세 '진영' 카드·수치 막대와 같은 색이라 지면을 건너도 같은 편으로 읽힌다 */}
                    <S.SideChips>
                      {withSideColors(node.sides).map((side, index) => (
                        <Fragment key={side.id}>
                          {index > 0 && <S.SideVersus aria-label="대">↔</S.SideVersus>}
                          <S.SideChip $color={side.color}>{side.name}</S.SideChip>
                        </Fragment>
                      ))}
                    </S.SideChips>
                  </td>
                </S.ChecklistRow>
              ))}
            </tbody>
          </S.Table>
        </S.Scroll>
      )}
      {sortedMetrics.length === 0 ? (
        <S.Empty>사상자·병력 같은 수치가 기록된 사건이 아직 없습니다.</S.Empty>
      ) : (
        <S.Scroll>
          <S.Table>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">사건</th>
                <th scope="col">항목</th>
                <th scope="col">값</th>
              </tr>
            </thead>
            <tbody>
              {sortedMetrics.map((row, index) => (
                <S.ChecklistRow
                  key={`${row.eventId}-${row.metricName}-${index}`}
                  {...rowProps(row.eventId)}
                >
                  {renderEventCells(row.eventId, row.eventTitle)}
                  <td>{row.metricName}</td>
                  <td>
                    {row.display}
                    {row.unit && ` ${row.unit}`}
                  </td>
                </S.ChecklistRow>
              ))}
            </tbody>
          </S.Table>
        </S.Scroll>
      )}
    </S.Panel>
  )
}

// ─── 기록 점검표 ───────────────────────────────────────────────────────────

const CHECK_MARK = { full: '●', partial: '◐', empty: '–', na: '·' } as const
const CHECK_TEXT = { full: '채움', partial: '일부', empty: '비어 있음', na: '이 갈래엔 해당 없음' } as const

export function ChecklistPanel({
  selectedGroup = null,
  onSelectGroup,
  grouping,
  order,
  onOrderChange,
  events,
  numberById,
  visibleIds,
  hotId,
  onHover,
  onOpen,
}: HoverProps & {
  /** 번호순 | 빈 칸 많은 순 — 점검은 '어디부터 채울까'라서 뒤쪽이 자주 필요하다(URL ?order=) */
  order: 'number' | 'gaps'
  onOrderChange: (order: 'number' | 'gaps') => void
  /** 번호순일 때 묶음마다 머리 줄(묶음 이름·평균 채움) */
  grouping: OverviewGrouping
  /** 고른 묶음(?group=) — 묶음별 채움 요약에서 강조 */
  selectedGroup?: string | null
  /** 묶음별 채움 요약의 줄을 누르면 그 묶음으로 거른다 */
  onSelectGroup?: (key: string | null) => void
  events: EventOverviewNode[]
  numberById: Map<string, string>
  visibleIds: Set<string> | null
}) {
  const filtered = visibleIds ? events.filter((event) => visibleIds.has(event.id)) : events
  const scored = filtered.map((event) => {
    const checks = checkNode(event)
    return { event, checks, score: checkScore(checks) }
  })
  const shown =
    order === 'gaps'
      ? [...scored].sort((left, right) => left.score.pct - right.score.pct)
      : scored
  const emptyCounts = emptyCountByColumn(filtered)
  const applicableCounts = applicableCountByColumn(filtered)
  const theme = useTheme()
  /** 묶음 머리 줄 — 번호순에서만(빈 칸 순은 묶음을 가로질러 섞인다). 줄 시작 index → 머리 */
  const groupHeadAt = new Map<number, { label: string; color: string | null; count: number; avg: number }>()
  if (order === 'number' && grouping.groups.length > 0) {
    const groupById = new Map(grouping.groups.map((group) => [group.id, group]))
    for (const run of groupRuns(
      shown.map((item) => item.event.id),
      grouping,
    )) {
      const slice = shown.slice(run.start, run.start + run.length)
      const group = run.groupId ? groupById.get(run.groupId) : undefined
      groupHeadAt.set(run.start, {
        label: group ? group.title : '개별 사건',
        color: group ? S.groupColor(group.index, theme.mode) : null,
        // 묶음 칩·간트 꼬리표와 같은 수 — 묶음 자신은 세지 않는다
        count: slice.filter((item) => item.event.id !== run.groupId).length,
        avg: Math.round(slice.reduce((sum, item) => sum + item.score.pct, 0) / Math.max(1, slice.length)),
      })
    }
  }
  /**
   * 묶음별 채움 요약 — 어느 묶음부터 채울지. 거르기와 무관하게 전체에서 센다(고르는 자리라서).
   * 가장 많이 빈 칸 하나를 함께 말한다('인물 11칸 빔').
   */
  const groupFill =
    grouping.groups.length === 0
      ? []
      : [
          ...grouping.groups.map((group) => ({
            key: group.id,
            label: group.title,
            color: S.groupColor(group.index, theme.mode),
            ids: [group.id, ...group.memberIds],
          })),
          ...(grouping.singleIds.length > 0
            ? [{ key: SINGLES_GROUP_KEY, label: '개별 사건', color: null, ids: grouping.singleIds }]
            : []),
        ].map((entry) => {
          const nodes = events.filter((event) => entry.ids.includes(event.id))
          const scores = nodes.map((node) => checkScore(checkNode(node)).pct)
          const empties = emptyCountByColumn(nodes)
          const worst = CHECK_COLUMNS.map((column) => ({ column, empty: empties[column.key] }))
            .filter((item) => item.empty > 0)
            .sort((left, right) => right.empty - left.empty)[0]
          return {
            ...entry,
            // 묶음 칩·간트 꼬리표와 같은 수 — 묶음 자신은 세지 않는다(채움 평균에는 넣는다)
            count: nodes.filter((node) => node.id !== entry.key).length,
            avg: Math.round(scores.reduce((sum, pct) => sum + pct, 0) / Math.max(1, scores.length)),
            worst: worst ? `${worst.column.label} ${worst.empty}건 빔` : '빈 칸 없음',
          }
        })
  return (
    <S.Panel $wide id="overview-checklist" aria-labelledby="overview-checklist-title">
      <S.PanelHead>
        <S.PanelTitle id="overview-checklist-title">기록 점검</S.PanelTitle>
        <S.ViewSwitch role="group" aria-label="점검표 순서">
          <S.ViewSwitchItem
            type="button"
            $active={order === 'number'}
            aria-pressed={order === 'number'}
            onClick={() => onOrderChange('number')}
          >
            번호순
          </S.ViewSwitchItem>
          <S.ViewSwitchItem
            type="button"
            $active={order === 'gaps'}
            aria-pressed={order === 'gaps'}
            onClick={() => onOrderChange('gaps')}
          >
            빈 칸 많은 순
          </S.ViewSwitchItem>
        </S.ViewSwitch>
        <S.PanelNote style={{ flexBasis: '100%' }}>
          ● 채움 · ◐ 일부(연·월만 아는 날짜) · – 비어 있음 · · 해당 없음(외교·정치 사건의 수치 등) —
          머리글 아래 숫자는 그 칸이 빈 사건 수 · 빈 칸을 누르면 그 사건 문서의 해당 자리로 간다
        </S.PanelNote>
      </S.PanelHead>
      {groupFill.length > 0 && (
        <S.GroupFillList aria-label="묶음별 채움 — 누르면 그 묶음만 본다">
          {groupFill.map((entry) => {
            const active = selectedGroup === entry.key
            return (
              <li key={entry.key}>
                <S.GroupFillRow
                  type="button"
                  aria-pressed={active}
                  $active={active}
                  disabled={!onSelectGroup}
                  onClick={() => onSelectGroup?.(active ? null : entry.key)}
                >
                  <S.GroupFillName>
                    {entry.color && <S.GroupDot $color={entry.color} aria-hidden="true" />}
                    <span>{entry.label}</span>
                    <S.Muted>{entry.count}건</S.Muted>
                  </S.GroupFillName>
                  <S.FillBar $pct={entry.avg} aria-hidden="true" />
                  <S.GroupFillPct>{entry.avg}%</S.GroupFillPct>
                  <S.GroupFillWorst>{entry.worst}</S.GroupFillWorst>
                </S.GroupFillRow>
              </li>
            )
          })}
        </S.GroupFillList>
      )}
      <S.Scroll>
        <S.Table>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">하위 사건</th>
              <th scope="col">채움</th>
              {CHECK_COLUMNS.map((column) => (
                <S.CheckHead key={column.key} scope="col" title={column.hint}>
                  {column.label}
                  <br />
                  {emptyCounts[column.key] > 0 ? (
                    <S.EmptyCount
                      $severe={emptyCounts[column.key] * 2 > applicableCounts[column.key]}
                      title={`${column.label}이(가) 빈 사건 ${emptyCounts[column.key]}건`}
                    >
                      {emptyCounts[column.key]}
                    </S.EmptyCount>
                  ) : (
                    <S.Muted style={{ fontSize: 11 }}>✓</S.Muted>
                  )}
                </S.CheckHead>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map(({ event, checks, score }, index) => {
              const pct = score.pct
              const head = groupHeadAt.get(index)
              return (
                <Fragment key={event.id}>
                {head && (
                  <S.ChecklistGroupRow $color={head.color}>
                    <td colSpan={3 + CHECK_COLUMNS.length}>
                      {head.label}
                      <span>
                        {head.count}건 · 평균 채움 {head.avg}%
                      </span>
                    </td>
                  </S.ChecklistGroupRow>
                )}
                <S.ChecklistRow
                  $hot={hotId === event.id}
                  onMouseEnter={() => onHover(event.id)}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => onOpen(event.id)}
                >
                  <td>
                    <S.Muted>{numberById.get(event.id) ?? '—'}</S.Muted>
                  </td>
                  <td>
                    <S.RowTitleButton
                      type="button"
                      onClick={(clickEvent) => {
                        // 줄 클릭과 겹쳐 두 번 열리지 않게
                        clickEvent.stopPropagation()
                        onOpen(event.id)
                      }}
                    >
                      {/* 하위는 단계만큼 들여 └ 로 상위에 매단다(간트 가지선과 같은 뜻) */}
                      {event.depth >= 2 && (
                        <S.ListIndent $levels={event.depth - 1} aria-hidden="true">
                          └
                        </S.ListIndent>
                      )}
                      {event.title}
                    </S.RowTitleButton>
                  </td>
                  <S.FillCell title={`해당하는 ${score.applicable}칸 중 ${score.filled}칸`}>
                    <S.FillBar $pct={pct} aria-hidden="true" />
                    <span>{pct}%</span>
                  </S.FillCell>
                  {CHECK_COLUMNS.map((column) => {
                    const state = checks[column.key]
                    return (
                      <S.CheckCell key={column.key} $state={state} title={`${column.label}: ${CHECK_TEXT[state]}`}>
                        {state === 'empty' || state === 'partial' ? (
                          // 빈 칸은 채우러 가는 길 — 그 사건 문서의 해당 섹션으로(줄 클릭=모달과 겹치지 않게 막는다)
                          <S.FillLink
                            to={checkFillHref(pathKeys.events.detail(event.id), column.key)}
                            onClick={(clickEvent) => clickEvent.stopPropagation()}
                            title={`${event.title} — ${column.label} 채우러 가기`}
                          >
                            <span aria-hidden="true">{CHECK_MARK[state]}</span>
                            <S.VisuallyHidden>
                              {CHECK_TEXT[state]} — {column.label} 채우러 가기
                            </S.VisuallyHidden>
                          </S.FillLink>
                        ) : (
                          <>
                            <span aria-hidden="true">{CHECK_MARK[state]}</span>
                            <S.VisuallyHidden>{CHECK_TEXT[state]}</S.VisuallyHidden>
                          </>
                        )}
                      </S.CheckCell>
                    )
                  })}
                </S.ChecklistRow>
                </Fragment>
              )
            })}
          </tbody>
        </S.Table>
      </S.Scroll>
    </S.Panel>
  )
}
