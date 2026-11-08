/**
 * 묶음 레인 — 조망 › 전개 맨 위, 묶음(전선·전역)마다 한 줄에 그 아래 사건 전부를 쌓는다.
 *
 * 아래 상세 간트는 사건 하나가 한 줄이라, 묶음이 기간 전체를 덮는 사건(전쟁 › 전선)에서는 같은 달의 일이
 * 묶음마다 수천 px씩 떨어져 섰다. '1942년 11월에 어느 전선에서 무엇이 함께 있었나'는 그림 어디에도 없었다
 * (2026-11-08 인포그래픽 검토 §4·10). 이 판은 묶음 수만큼의 줄로 전체 기간을 한 화면에 놓고, 세로로 같은
 * 자리가 같은 때다. 축은 상세 간트와 같은 것(gantt.toPct)이라 아래 간트와 세로선이 맞는다.
 *
 * - 줄 = 직계 묶음(색 = 묶음 색, 칩·지도 핀과 같은 색) + 묶음에 안 든 직계 개별 사건 한 줄
 * - 줄 안 = 하위 사건(아래에 사건이 있는 중간 묶음은 빼고 잎만) — 겹치면 칸을 나눠 쌓는다(최대 4칸)
 * - 배경 = 상위 사건의 국면 띠
 * - 누르면 그 사건 모달(상세 간트와 같은 열기)
 */
import { useTheme } from 'styled-components'
import styled from 'styled-components'

import type { EventOverviewNode } from '@/shared/api/event-overview'

import { toAxisSpan } from '../detail/components/development-timeline.lib'
import { type EventPhase, datedPhases } from '../detail/components/event-phase.lib'
import type { GanttLayout, GanttRow, OverviewGrouping } from './event-overview.lib'
import * as S from './overview.styles'

const SUB_LANES = 4
const SUB_LANE_HEIGHT = 8

interface LaneMark {
  row: GanttRow
  left: number
  width: number
  point: boolean
  lane: number
}

/** 줄 안에서 겹치지 않게 칸을 나눈다 — 가장 먼저 비는 칸, 다 차면 가장 일찍 끝나는 칸에 겹친다 */
function packMarks(rows: GanttRow[]): { marks: LaneMark[]; depth: number } {
  const ends: number[] = []
  const marks = [...rows]
    .sort((left, right) => left.leftPct - right.leftPct)
    .map((row) => {
      const point = row.isPoint || row.widthPct < 0.6
      const left = row.leftPct
      const right = left + Math.max(row.widthPct, 0.9)
      let lane = ends.findIndex((end) => end <= left)
      if (lane < 0) lane = ends.length < SUB_LANES ? ends.length : ends.indexOf(Math.min(...ends))
      ends[lane] = Math.max(ends[lane] ?? -Infinity, right)
      return { row, left, width: row.widthPct, point, lane }
    })
  return { marks, depth: Math.max(1, ends.length) }
}

export function GroupLanesPanel({
  gantt,
  grouping,
  ordered,
  rootPhases = [],
  visibleIds,
  numberById,
  onOpen,
}: {
  gantt: GanttLayout
  grouping: OverviewGrouping
  /** 화면 차례의 하위 전부 — 잎(아래에 사건이 없는 것)을 고르는 데 쓴다 */
  ordered: EventOverviewNode[]
  rootPhases?: EventPhase[]
  visibleIds: Set<string> | null
  numberById: Map<string, string>
  onOpen: (id: string) => void
}) {
  const theme = useTheme()
  if (grouping.groups.length < 2) return null

  const parentIds = new Set(ordered.map((node) => node.parentEventId).filter((id): id is string => Boolean(id)))
  const rowById = new Map(gantt.rows.map((row) => [row.node.id, row]))
  const leafRows = (ids: ReadonlyArray<string>) =>
    ids
      .filter((id) => !parentIds.has(id))
      .map((id) => rowById.get(id))
      /* 확대한 축 밖은 이 판에서 뺀다 — 상세 간트가 끝 표지로 말한다 */
      .filter((row): row is GanttRow => row !== undefined && !row.offWindow)

  const lanes = [
    ...grouping.groups.map((group) => ({
      key: group.id,
      title: group.title,
      color: S.groupColor(group.index, theme.mode),
      ...packMarks(leafRows(group.memberIds.length > 0 ? group.memberIds : [group.id])),
    })),
    ...(grouping.singleIds.length > 0
      ? [
          {
            key: 'singles',
            title: '개별 사건',
            color: theme.mode === 'dark' ? '#a1a1aa' : '#71717a',
            ...packMarks(leafRows(grouping.singleIds)),
          },
        ]
      : []),
  ].filter((lane) => lane.marks.length > 0)

  /* 국면 띠 — 상세 간트의 국면 줄과 같은 계산 */
  const chapters = datedPhases(rootPhases).flatMap((dated) => {
    const span = toAxisSpan({
      id: dated.phase.id,
      title: dated.phase.title,
      startDate: dated.startDate,
      startDatePrecision: dated.startDatePrecision,
      endDate: dated.endDate,
      endDatePrecision: dated.endDatePrecision,
    })
    if (!span) return []
    const left = Math.max(0, gantt.toPct(span.from))
    const right = Math.min(100, gantt.toPct(span.to))
    return right > left ? [{ key: dated.phase.id, position: dated.position, title: dated.phase.title, left, width: right - left }] : []
  })

  return (
    <S.Panel $wide aria-labelledby="overview-lanes-title">
      <S.PanelHead>
        <S.PanelTitle id="overview-lanes-title">묶음별 흐름</S.PanelTitle>
        <S.PanelNote>
          묶음마다 한 줄 · 세로로 같은 자리가 같은 때 · 점 = 하루, 막대 = 기간 · 누르면 그 사건
        </S.PanelNote>
      </S.PanelHead>
      <Grid>
        <span aria-hidden="true" />
        <Axis aria-hidden="true">
          {chapters.map((chapter) => (
            <ChapterBand
              key={chapter.key}
              data-even={chapter.position % 2 === 0 || undefined}
              style={{ left: `${chapter.left}%`, width: `${chapter.width}%` }}
              title={`${chapter.position}국면 · ${chapter.title}`}
            >
              {chapter.position}
              {chapter.width >= 16 && ` ${chapter.title}`}
            </ChapterBand>
          ))}
          {gantt.ticks.map((tick) => (
            <Tick key={tick.pct} data-align={tick.align} style={{ left: `${tick.pct}%` }}>
              {tick.label}
            </Tick>
          ))}
        </Axis>
        {lanes.map((lane) => (
          <LaneRow key={lane.key}>
            <LaneLabel title={lane.title}>
              <i style={{ background: lane.color }} aria-hidden="true" />
              <span>{lane.title}</span>
              <small>{lane.marks.length}</small>
            </LaneLabel>
            <LaneTrack style={{ height: `${lane.depth * SUB_LANE_HEIGHT + 10}px` }}>
              {chapters.map((chapter) => (
                <ChapterShade
                  key={chapter.key}
                  data-even={chapter.position % 2 === 0 || undefined}
                  style={{ left: `${chapter.left}%`, width: `${chapter.width}%` }}
                  aria-hidden="true"
                />
              ))}
              {lane.marks.map((mark) => {
                const dim = visibleIds !== null && !visibleIds.has(mark.row.node.id)
                const label = `${numberById.get(mark.row.node.id) ?? ''} ${mark.row.node.title} · ${mark.row.dateLabel}`.trim()
                const top = 5 + mark.lane * SUB_LANE_HEIGHT + SUB_LANE_HEIGHT / 2
                return (
                  <Mark
                    key={mark.row.node.id}
                    type="button"
                    $point={mark.point}
                    title={label}
                    aria-label={label}
                    onClick={() => onOpen(mark.row.node.id)}
                    style={{
                      left: `${mark.left}%`,
                      width: mark.point ? undefined : `${mark.width}%`,
                      top: `${top}px`,
                      background: lane.color,
                      opacity: dim ? 0.18 : 1,
                    }}
                  />
                )
              })}
            </LaneTrack>
          </LaneRow>
        ))}
      </Grid>
    </S.Panel>
  )
}

/* ── styled — 상세 간트와 같은 열 폭(GANTT_LABEL_WIDTH)이라 세로선이 맞는다 ── */

const Grid = styled.div`
  display: grid;
  grid-template-columns: ${S.GANTT_LABEL_WIDTH} minmax(0, 1fr);
  row-gap: 2px;

  @container overviewpanel (max-width: 659px) {
    grid-template-columns: 96px minmax(0, 1fr);
  }
`

const Axis = styled.div`
  position: relative;
  height: 36px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ChapterBand = styled.span`
  position: absolute;
  top: 0;
  height: 16px;
  padding: 0 4px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  line-height: 16px;
  font-size: 11px;
  font-weight: 700;
  border-left: 2px solid ${({ theme }) => (theme.mode === 'dark' ? '#818cf8' : '#4f46e5')};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4338ca')};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(129,140,248,0.12)' : 'rgba(79,70,229,0.07)')};

  &[data-even] {
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(129,140,248,0.06)' : 'rgba(79,70,229,0.035)')};
  }
`

const Tick = styled.span`
  position: absolute;
  bottom: 2px;
  transform: translateX(-50%);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;

  &[data-align='start'] {
    transform: none;
  }
  &[data-align='end'] {
    transform: translateX(-100%);
  }
`

const LaneRow = styled.div`
  display: contents;
`

const LaneLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding-right: 10px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};

  i {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 2px;
  }

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.tertiary};
    font-variant-numeric: tabular-nums;
  }
`

const LaneTrack = styled.div`
  position: relative;
  border-radius: 4px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.025)' : 'rgba(20,19,34,0.025)')};
`

const ChapterShade = styled.span`
  position: absolute;
  top: 0;
  bottom: 0;
  border-left: 1px dashed ${({ theme }) => (theme.mode === 'dark' ? 'rgba(129,140,248,0.35)' : 'rgba(79,70,229,0.25)')};

  &[data-even] {
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(129,140,248,0.04)' : 'rgba(79,70,229,0.025)')};
  }
`

const Mark = styled.button<{ $point: boolean }>`
  position: absolute;
  padding: 0;
  border: none;
  cursor: pointer;
  transform: translateY(-50%);
  ${({ $point }) =>
    $point
      ? `
    width: 6px;
    height: 6px;
    margin-left: -3px;
    border-radius: 50%;
  `
      : `
    height: 5px;
    min-width: 4px;
    border-radius: 3px;
  `}

  &:hover,
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.text.primary};
    outline-offset: 1px;
    z-index: 1;
  }
`
