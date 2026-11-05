/**
 * 전개 간트 위 연결 화살표 — 하위 사건끼리의 관련 사건(원인 → 결과)을 막대 사이 곡선으로.
 *
 * 막대 자리는 DOM에서 잰다(`[data-gantt-bar]`) — 접힌 묶음·거르기로 숨은 줄, 한 열(휴대폰) 배치까지 간트가
 * 실제로 그린 대로 따라가게. 한쪽 막대가 화면에 없으면 그 연결은 그리지 않는다.
 *
 * 선 모양 = 관계 종류(RELATION_DASH, 연결 보기의 범례와 같다). 방향 있는 종류만 화살촉.
 * 색은 글자 보조색 하나 — 막대 색(분야)과 겨루지 않게. 마우스를 올린 사건에 닿는 선만 진하게.
 */
import { useLayoutEffect, useRef, useState } from 'react'

import { useTheme } from 'styled-components'

import { type EventOverviewRelation } from '@/shared/api/event-overview'


/** 관계 종류 → 선 모양(연결 보기 범례와 같은 규약). 색이 아니라 모양으로 가른다 */
export const RELATION_DASH: Record<EventOverviewRelation['type'], string> = {
  LED_TO: '',
  INFLUENCED: '6 4',
  RESPONSE_TO: '10 3 2 3',
  CONCURRENT: '2 4',
  RELATED: '1 5',
}

/**
 * 방향 있는 관계 — shared/api/event-relations의 같은 이름 상수와 같은 값. 여기서 그 모듈을 가져오면 간트(overview-sections)가
 * API 클라이언트(import.meta)를 끌고 들어가 조망 렌더 테스트가 돌지 못한다.
 */
const DIRECTED_TYPES: ReadonlySet<EventOverviewRelation['type']> = new Set(['LED_TO', 'INFLUENCED', 'RESPONSE_TO'])

interface GanttLinksProps {
  relations: ReadonlyArray<EventOverviewRelation>
  hotId: string | null
  /** 바뀌면 다시 잰다(접기·거르기·축 범위) */
  layoutKey: string
}

interface DrawnLink {
  id: string
  type: EventOverviewRelation['type']
  path: string
  fromId: string
  toId: string
}

function linkPath(source: DOMRect, target: DOMRect, origin: DOMRect): string {
  const sx = source.right - origin.left
  const sy = source.top + source.height / 2 - origin.top
  const tx = target.left - origin.left
  const ty = target.top + target.height / 2 - origin.top
  if (tx >= sx + 6) {
    /* 결과가 원인 뒤에 시작 — 원인 끝에서 결과 시작으로 가로 곡선 */
    const bend = Math.max(18, (tx - sx) / 2)
    return `M${sx},${sy} C${sx + bend},${sy} ${tx - bend},${ty} ${tx},${ty}`
  }
  /* 겹치거나 거꾸로(같은 국면·기간 중 대응) — 막대 머리끼리 왼쪽으로 휘는 세로 곡선 */
  const ax = source.left - origin.left + Math.min(8, source.width / 2)
  const bx = target.left - origin.left + Math.min(8, target.width / 2)
  const down = ty > sy
  const ay = down ? source.bottom - origin.top : source.top - origin.top
  const by = down ? target.top - origin.top : target.bottom - origin.top
  const reach = Math.max(16, Math.abs(by - ay) * 0.35)
  return `M${ax},${ay} C${ax - reach},${ay + (down ? reach : -reach)} ${bx - reach},${by - (down ? reach : -reach)} ${bx},${by}`
}

export function GanttLinks({ relations, hotId, layoutKey }: GanttLinksProps) {
  const theme = useTheme()
  /**
   * 기준 격자 = 이 SVG의 부모. 부모의 ref를 받아 쓰면 안 된다 — 자식의 레이아웃 효과가 부모 ref가 붙기 전에 돌아
   * 첫 측정에서 격자가 null이었고(deps가 그대로라 다시 재지도 않아) 화살표가 하나도 서지 않았다.
   */
  const svgRef = useRef<SVGSVGElement>(null)
  const [links, setLinks] = useState<DrawnLink[]>([])
  const [size, setSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const grid = svgRef.current?.parentElement
    if (!grid) return undefined
    const measure = () => {
      const origin = grid.getBoundingClientRect()
      const barOf = (id: string) => grid.querySelector<HTMLElement>(`[data-gantt-bar="${id}"]`)
      const next: DrawnLink[] = []
      for (const relation of relations) {
        const source = barOf(relation.fromId)
        const target = barOf(relation.toId)
        if (!source || !target) continue
        next.push({
          id: relation.id,
          type: relation.type,
          fromId: relation.fromId,
          toId: relation.toId,
          path: linkPath(source.getBoundingClientRect(), target.getBoundingClientRect(), origin),
        })
      }
      setLinks(next)
      setSize({ width: grid.scrollWidth, height: grid.scrollHeight })
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(grid)
    return () => observer?.disconnect()
  }, [relations, layoutKey])

  const ink = theme.colors.text.secondary
  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      width={size.width}
      height={size.height}
      style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', overflow: 'visible' }}
    >
      <defs>
        <marker id="gantt-link-head" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 z" fill={ink} />
        </marker>
      </defs>
      {links.map((link) => {
        const hot = hotId !== null && (link.fromId === hotId || link.toId === hotId)
        const quiet = hotId !== null && !hot
        return (
          <path
            key={link.id}
            d={link.path}
            fill="none"
            stroke={ink}
            strokeWidth={hot ? 2.25 : 1.5}
            strokeOpacity={quiet ? 0.18 : hot ? 0.95 : 0.55}
            strokeDasharray={RELATION_DASH[link.type] || undefined}
            strokeLinecap="round"
            markerEnd={DIRECTED_TYPES.has(link.type) ? 'url(#gantt-link-head)' : undefined}
          />
        )
      })}
    </svg>
  )
}
