/**
 * 역대 수반 가계도 — 1대 좌측, 왕명 메인, 같은 부모(형제)는 같은 행에 배치
 */
import React, { useMemo } from 'react'
import styled from 'styled-components'
import { FiUser } from 'react-icons/fi'

const TIMELINE_WIDTH = 80
const CARD_WIDTH = 380
const CARD_HEIGHT = 230
const CONNECTOR_GAP = 32
const ROW_HEIGHT = CARD_HEIGHT + CONNECTOR_GAP
const COL_STEP = CARD_WIDTH + 40

interface LineageTreeProps {
  /** 세대별 재임 배열 (row 0 = 루트, row 1 = 그 자식들, ...) */
  rows: any[][]
  /** tenure id -> { row, col } */
  placement: Map<string, { row: number; col: number }>
  /** 부모 tenure id -> 자식 tenure id[] */
  parentToChildren: Map<string, string[]>
  getPersonName: (p: any) => string
  formatDate: (d: string) => string
  getRegnalNameFromNotes: (notes: string | null | undefined) => string | null
  onCardClick: (tenureId: string) => void
}

export function LineageTree({
  rows,
  placement,
  parentToChildren,
  getPersonName,
  formatDate,
  getRegnalNameFromNotes,
  onCardClick,
}: LineageTreeProps) {
  const totalRows = rows.length
  const totalCols = totalRows > 0 ? Math.max(...rows.map((r) => r.length)) : 0
  const treeWidth = totalCols * COL_STEP
  const svgHeight = totalRows * ROW_HEIGHT

  const round = (n: number) => Math.round(n)
  const colCenter = (col: number) => round(TIMELINE_WIDTH + col * COL_STEP + CARD_WIDTH / 2)
  const cardTop = (row: number) => round(row * ROW_HEIGHT + CONNECTOR_GAP / 2)
  const cardBottom = (row: number) => round(row * ROW_HEIGHT + CONNECTOR_GAP / 2 + CARD_HEIGHT)

  /** 각 행의 세기 라벨 (바뀔 때만 표시해 라벨 겹침 방지) */
  const rowCenturyLabels = useMemo(() => {
    let prev: string | null = null
    return rows.map((row) => {
      const t = row[0]
      if (!t?.startDate) return null
      const y = new Date(t.startDate).getFullYear()
      const century = Math.floor(y / 100) + (y >= 0 ? 1 : 0)
      const label = `${Math.abs(century)}C`
      if (label === prev) return null
      prev = label
      return label
    })
  }, [rows])

  /** SVG 연결선: 부모 카드 하단 중앙 → 세로 → 가로 → 각 자식 카드 상단 중앙 (그리드와 동일 좌표계) */
  const connectorPaths = useMemo(() => {
    const paths: { d: string; key: string }[] = []
    parentToChildren.forEach((childIds, parentId) => {
      const parent = placement.get(parentId)
      if (!parent || childIds.length === 0) return
      const children = childIds
        .map((id) => ({ id, pos: placement.get(id) }))
        .filter((c): c is { id: string; pos: { row: number; col: number } } => c.pos != null)
      if (children.length === 0) return

      const parentBottomX = colCenter(parent.col)
      const parentBottomY = cardBottom(parent.row)
      const childRow = parent.row + 1
      const childTopY = cardTop(childRow)
      const connectorY = round(parentBottomY + (childTopY - parentBottomY) / 2)

      const minCol = Math.min(...children.map((c) => c.pos.col))
      const maxCol = Math.max(...children.map((c) => c.pos.col))
      const leftX = colCenter(minCol)
      const rightX = colCenter(maxCol)

      let d = `M ${parentBottomX} ${parentBottomY} L ${parentBottomX} ${connectorY}`
      d += ` L ${leftX} ${connectorY} L ${rightX} ${connectorY}`
      children.forEach((c) => {
        const cx = colCenter(c.pos.col)
        d += ` M ${cx} ${connectorY} L ${cx} ${childTopY}`
      })
      paths.push({ d, key: parentId })
    })
    return paths
  }, [placement, parentToChildren])

  /** 자식 tenure id → 부모 tenure (카드에 "↑ 부/이전" 표시용) */
  const childToParentTenure = useMemo(() => {
    const tenureById = new Map<string, any>()
    rows.flat().forEach((t: any) => tenureById.set(t.id, t))
    const childToParentId = new Map<string, string>()
    parentToChildren.forEach((childIds, parentId) =>
      childIds.forEach((cid) => childToParentId.set(cid, parentId)),
    )
    const map = new Map<string, any>()
    childToParentId.forEach((parentId, childId) => {
      const parent = tenureById.get(parentId)
      if (parent) map.set(childId, parent)
    })
    return map
  }, [rows, parentToChildren])

  /** 재위 연도·기간 문자열 "(N년, YYYY~YYYY)" */
  const getReignLabel = (t: any) => {
    const start = t.startDate ? new Date(t.startDate).getFullYear() : null
    const end = t.endDate ? new Date(t.endDate).getFullYear() : null
    const endYear = end ?? (start != null ? new Date().getFullYear() : null)
    const years =
      start != null && endYear != null ? Math.max(0, endYear - start) : null
    if (start == null && endYear == null) return '재위 기간 미상'
    const range = end == null ? `${start}~현재` : `${start}~${endYear}`
    return years != null ? `(${years}년, ${range})` : `(${range})`
  }

  return (
    <TreeOuter>
      <TreeWrap style={{ width: TIMELINE_WIDTH + treeWidth, minHeight: svgHeight }}>
        <TimelineColumn>
          <TimelineBar />
          {rowCenturyLabels.map((label, idx) =>
            label ? (
              <TimelineLabel key={idx} style={{ top: cardTop(idx) + CARD_HEIGHT / 2 }}>
                {label}
              </TimelineLabel>
            ) : null,
          )}
        </TimelineColumn>
        <TreeArea style={{ width: treeWidth, height: svgHeight }}>
        <TreeGrid
          style={
            {
              '--tree-cols': totalCols,
              '--tree-rows': totalRows,
              '--tree-area-width': `${treeWidth}px`,
              '--tree-area-height': `${svgHeight}px`,
            } as React.CSSProperties
          }
        >
          {rows.map((row, rowIdx) =>
            row.map((t: any, colIdx: number) => {
              const titleText = t.title || t.position?.title || '—'
              const regnalName = getRegnalNameFromNotes(t.notes)
              const personName = getPersonName(t.person)
              const mainLabel = regnalName || personName
              const subLabel = regnalName ? personName : null
              const orderLabel =
                t.regnalNumber != null ? `${t.regnalNumber}세` : `제${t.termNumber}대`
              const reignLabel = getReignLabel(t)
              const parentTenure = childToParentTenure.get(t.id)
              const parentOrderLabel = parentTenure
                ? parentTenure.regnalNumber != null
                  ? `${parentTenure.regnalNumber}세`
                  : `제${parentTenure.termNumber}대`
                : ''
              const parentRegnal = parentTenure && getRegnalNameFromNotes(parentTenure.notes)
              const parentDisplay = parentRegnal || (parentTenure ? getPersonName(parentTenure.person) : '')

              return (
                <TreeCardWrap
                  key={t.id}
                  style={{
                    gridColumn: colIdx + 1,
                    gridRow: rowIdx + 1,
                  }}
                >
                  <TreeCard
                    onClick={() => onCardClick(t.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onCardClick(t.id)
                      }
                    }}
                  >
                    <TreeCardHead>
                      <TreeCardOrder>{orderLabel}</TreeCardOrder>
                    </TreeCardHead>
                    <TreeCardMainName>{mainLabel}</TreeCardMainName>
                    {subLabel && <TreeCardSubName>{subLabel}</TreeCardSubName>}
                    <TreeCardReign>{reignLabel}</TreeCardReign>
                    {parentTenure && parentDisplay && (
                      <TreeCardRelation>
                        ↑ 이전: {parentDisplay} ({parentOrderLabel})
                      </TreeCardRelation>
                    )}
                    <TreeCardTitle>{titleText}</TreeCardTitle>
                    <TreeCardAvatar $hasImage={!!t.person?.profileImageUrl}>
                      {t.person?.profileImageUrl ? (
                        <img src={t.person.profileImageUrl} alt="" />
                      ) : (
                        <FiUser size={28} />
                      )}
                    </TreeCardAvatar>
                  </TreeCard>
                </TreeCardWrap>
              )
            }),
          )}
        </TreeGrid>
        <TreeSvg
          width={TIMELINE_WIDTH + treeWidth}
          height={svgHeight}
          style={{
            position: 'absolute',
            left: -TIMELINE_WIDTH,
            top: 0,
            pointerEvents: 'none',
            zIndex: 5,
          }}
        >
          {connectorPaths.map(({ d, key }) => (
            <path
              key={key}
              d={d}
              fill="none"
              stroke="#7c3aed"
              strokeWidth="2"
              strokeLinecap="butt"
              strokeLinejoin="miter"
            />
          ))}
        </TreeSvg>
        </TreeArea>
      </TreeWrap>
      <Legend>↑ 이전 = 직전 재임 또는 부모 관계</Legend>
    </TreeOuter>
  )
}

const TreeOuter = styled.div`
  width: 100%;
`

const TreeWrap = styled.div`
  position: relative;
  display: flex;
  margin: 0;
  margin-right: auto;
  padding: 32px 0 40px;
`

const Legend = styled.div`
  font-size: 13px;
  color: #64748b;
  margin-top: 16px;
  padding-left: ${TIMELINE_WIDTH}px;
  font-weight: 500;
`

const TimelineColumn = styled.div`
  width: ${TIMELINE_WIDTH}px;
  flex-shrink: 0;
  position: relative;
`

const TimelineBar = styled.div`
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 8px;
  margin-left: -4px;
  background: linear-gradient(180deg, #6366f1 0%, #818cf8 40%, #a78bfa 100%);
  border-radius: 8px;
  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.08), 0 2px 8px rgba(99, 102, 241, 0.15);
`

const TimelineLabel = styled.span`
  position: absolute;
  left: 0;
  transform: translateY(-50%);
  font-size: 14px;
  font-weight: 700;
  color: #334155;
  letter-spacing: 0.05em;
`

const TreeArea = styled.div`
  position: relative;
  flex-shrink: 0;
  overflow: visible;
  isolation: isolate;
`

const TreeSvg = styled.svg`
  display: block;
  overflow: visible;
  pointer-events: none;
`

const TreeGrid = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  display: grid;
  grid-template-columns: repeat(var(--tree-cols, 1), ${COL_STEP}px);
  grid-template-rows: repeat(var(--tree-rows, 1), ${ROW_HEIGHT}px);
  justify-content: start;
  justify-items: start;
  align-items: start;
  width: var(--tree-area-width, 0px);
  height: var(--tree-area-height, 0px);
  box-sizing: border-box;
`

const TreeCardWrap = styled.div`
  box-sizing: border-box;
  padding-top: ${CONNECTOR_GAP / 2}px;
  width: ${COL_STEP}px;
  min-height: ${ROW_HEIGHT}px;
`

const TreeCard = styled.div`
  box-sizing: border-box;
  width: ${CARD_WIDTH}px;
  min-height: ${CARD_HEIGHT}px;
  padding: 24px 26px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 8px 24px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s ease;
  position: relative;
  text-align: left;

  &:hover {
    border-color: #c7d2fe;
    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.12), 0 16px 48px rgba(0, 0, 0, 0.06);
    transform: translateY(-2px);
  }
`

const TreeCardHead = styled.div`
  margin-bottom: 10px;
`

const TreeCardOrder = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.03em;
`

const TreeCardMainName = styled.div`
  font-size: 26px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.04em;
  line-height: 1.2;
  margin-bottom: 6px;
`

const TreeCardSubName = styled.div`
  font-size: 15px;
  font-weight: 500;
  color: #64748b;
  margin-bottom: 10px;
`

const TreeCardReign = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: #6366f1;
  margin-bottom: 10px;
  letter-spacing: -0.02em;
`

const TreeCardRelation = styled.div`
  font-size: 13px;
  color: #0369a1;
  font-weight: 600;
  margin-bottom: 8px;
  padding: 8px 12px;
  background: #f0f9ff;
  border-radius: 10px;
  border: 1px solid #e0f2fe;
`

const TreeCardRegnal = styled.div`
  font-size: 13px;
  color: #64748b;
  font-style: italic;
  margin-top: 2px;
`

const TreeCardTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  margin-top: 6px;
`

const TreeCardAvatar = styled.div<{ $hasImage?: boolean }>`
  position: absolute;
  top: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  overflow: hidden;
  background: ${({ $hasImage }) => ($hasImage ? '#f1f5f9' : '#e2e8f0')};
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

export const CARD_WIDTH_PX = CARD_WIDTH
export const CARD_HEIGHT_PX = CARD_HEIGHT
export const CONNECTOR_GAP_PX = CONNECTOR_GAP
