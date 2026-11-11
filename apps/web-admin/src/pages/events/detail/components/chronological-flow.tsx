/**
 * 전개 '시간순' — 묶음 사건의 하위 전부(잎)를 계층을 풀고 한 줄기의 시간 순서로, 상위 국면으로 나눠 읽는다.
 *
 * 기본 전개는 계층이 먼저다. 직계가 기간 전체를 덮는 묶음(전쟁 › 전선)이면 국면이 직계에만 날짜로 배정돼
 * 모든 전선이 1·2국면에 들어가고 '전환점'·'반격과 종전' 장은 비었다(인포그래픽 검토 §4·10). 여기서는
 * **잎 사건마다 자기 날짜로** 상위 국면에 놓는다 — 스탈린그라드·노르망디가 제 장에 선다.
 * 행마다 어느 묶음 소속인지('서부·북유럽 전선 › 노르망디 상륙 작전')를 묶음 색과 함께 꼬리로 단다.
 */
import { Fragment, useMemo } from 'react'

import styled, { useTheme } from 'styled-components'

import { groupColor } from '@/pages/events/overview/overview.styles'
import { metaText } from '@/pages/events/styles/theme'

import { compareEventStart } from './detail-network.lib'
import { compactRowDate } from './development-date.lib'
import type { TreeNode } from './development-tree.lib'
import { type EventPhase, phaseRangeLabel, phaseReach } from './event-phase.lib'

interface FlowRow {
  node: TreeNode
  /** 직계 조상 이름 — 직계 묶음부터 바로 위까지 */
  path: string[]
  /** 직계 묶음 순번(색) — 직계 개별 사건이면 null */
  groupIndex: number | null
}

interface FlowSection {
  key: string
  label: string
  meta: string | null
  rows: FlowRow[]
}

export function ChronologicalFlow({
  tree,
  chapters,
  onOpen,
}: {
  tree: ReadonlyArray<TreeNode>
  /** 이 사건(상위)의 국면 — 없으면 해 단위로만 나눈다 */
  chapters: ReadonlyArray<EventPhase>
  onOpen: (id: string) => void
}) {
  const theme = useTheme()
  const sections = useMemo<FlowSection[]>(() => {
    const rows: FlowRow[] = []
    let collectionIndex = 0
    for (const top of tree) {
      const groupIndex = top.children.length > 0 ? collectionIndex++ : null
      const walk = (node: TreeNode, path: string[]) => {
        if (node.children.length === 0) {
          rows.push({ node, path, groupIndex })
          return
        }
        for (const child of node.children) walk(child, [...path, node.title])
      }
      walk(top, [])
    }
    rows.sort((left, right) => compareEventStart(left.node.startDate, right.node.startDate))

    const ordered = [...chapters].sort((left, right) => left.order - right.order)
    if (ordered.length === 0) {
      return [{ key: 'all', label: '전체', meta: null, rows }]
    }
    const buckets = new Map<string, FlowSection>()
    const sectionOf = (row: FlowRow): FlowSection => {
      const reach = phaseReach(ordered, {
        id: row.node.id,
        /* 손 지정 국면은 직계의 것이라 잎에는 쓰지 않는다 — 자기 날짜로만 */
        phaseId: null,
        startDate: row.node.startDate ?? null,
        startDatePrecision: row.node.startDatePrecision ?? null,
        endDate: row.node.endDate ?? null,
        endDatePrecision: row.node.endDatePrecision ?? null,
      })
      const key = reach.from != null ? `p${reach.from}` : `o:${reach.outside ?? 'none'}`
      const existing = buckets.get(key)
      if (existing) return existing
      const phase = reach.from != null ? ordered[reach.from - 1] : null
      const section: FlowSection = {
        key,
        label: phase
          ? `${reach.from}국면 · ${phase.title}`
          : reach.outside === 'before'
            ? '국면 전'
            : reach.outside === 'after'
              ? '국면 뒤'
              : '날짜 미상',
        meta: phase ? phaseRangeLabel(phase) || null : null,
        rows: [],
      }
      buckets.set(key, section)
      return section
    }
    for (const row of rows) sectionOf(row).rows.push(row)
    const order = (key: string) =>
      key === 'o:before' ? -1 : key.startsWith('p') ? Number(key.slice(1)) : key === 'o:after' ? 1e6 : 2e6
    return [...buckets.values()].sort((left, right) => order(left.key) - order(right.key))
  }, [tree, chapters])

  const neutral = theme.mode === 'dark' ? '#71717a' : '#a1a1aa'

  return (
    <Flow>
      {sections.map((section) => (
        <Section key={section.key} aria-label={section.label}>
          {/* 국면이 없으면 머리를 세우지 않는다 — '전체 103건'은 아무것도 가르지 않고, 머리 부제의 '그 아래까지 108건'(묶음 포함)과
              숫자만 엇갈렸다. 소속은 행의 색 점·바뀔 때의 경로가 말한다 */}
          {section.key !== 'all' && (
            <SectionHead>
              <b>{section.label}</b>
              {section.meta && <span>{section.meta}</span>}
              <span>{section.rows.length}건</span>
            </SectionHead>
          )}
          <Rows>
            {section.rows.map((row, index) => {
              const previous = section.rows[index - 1]
              const color =
                row.groupIndex != null
                  ? groupColor(row.groupIndex, theme.mode)
                  : neutral
              /* 계층 보기와 같은 날짜 문법 — 앞 행과 같은 해·같은 날은 생략, 해가 바뀌면 연도를 굵게(연 표지 줄 대신) */
              const date = compactRowDate(row.node, previous?.node ?? null)
              /* 소속 경로는 바뀔 때만 — 같은 묶음이 이어지면 같은 색 점이 말한다(예전엔 6행 연속 같은 경로) */
              const pathText = row.path.join(' › ')
              const showPath =
                row.path.length > 0 && pathText !== previous?.path.join(' › ')
              return (
                <Fragment key={row.node.id}>
                  <Row>
                    <Dot style={{ background: color }} aria-hidden="true" />
                    <When title={date?.full}>
                      {date?.yearText && <b>{date.yearText}</b>}
                      {date?.rest ?? '날짜 미상'}
                    </When>
                    <Title
                      type="button"
                      onClick={() => onOpen(row.node.id)}
                      title="미리보기"
                    >
                      {row.node.title}
                    </Title>
                    {showPath && (
                      <Path style={{ color }} title={pathText}>
                        {pathText}
                      </Path>
                    )}
                  </Row>
                </Fragment>
              )
            })}
          </Rows>
        </Section>
      ))}
    </Flow>
  )
}

/* ── styled ── */

const Flow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
`

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

/** 국면 머리 — 계층 보기의 목차 줄과 같은 문법(면 없이 아래 머리카락선 하나) */
const SectionHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  padding: 6px 0;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(20,19,34,0.12)'};
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: ${metaText};

  b {
    font-size: 15px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Rows = styled.ol`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 6px 0 4px 26px;
  list-style: none;

  &::before {
    content: '';
    position: absolute;
    left: 4px;
    top: 10px;
    bottom: 8px;
    width: 2px;
    border-radius: 1px;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(20,19,34,0.12)'};
  }
`

const Row = styled.li`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const Dot = styled.span`
  position: absolute;
  left: -26px;
  top: 5px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.background.primary};
`

const When = styled.span`
  font-size: 12.5px;
  font-weight: 500;
  line-height: 18px;
  color: ${metaText};
  font-variant-numeric: tabular-nums;

  b {
    font-weight: 800;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Title = styled.button`
  align-self: flex-start;
  min-width: 0;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 15.5px;
  font-weight: 600;
  line-height: 1.45;
  text-align: left;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const Path = styled.span`
  font-size: 12px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`
