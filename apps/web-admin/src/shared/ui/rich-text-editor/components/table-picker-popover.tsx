/**
 * 리치 텍스트 에디터 표 삽입 격자 팝오버 — body 포털.
 * 앵커 버튼 rect로 위치를 잡고, 호버 좌표(hover)는 부모가 보유한다.
 * 셀 클릭 시 onConfirm(rows, cols)로 (행,열) = (row+1, col+1) 전달.
 * (원본: rich-text-editor.tsx 인라인 IIFE JSX 추출 — 동작 보존)
 */
import React from 'react'

import { createPortal } from 'react-dom'

import styled from 'styled-components'

import { TABLE_GRID_MAX } from '../utils/table-helpers'

const Popover = styled.div`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(30, 30, 30, 0.96)' : '#fff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#e5e7eb'};
  border-radius: 14px;
  box-shadow:
    0 8px 28px rgba(0, 0, 0, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 12px 14px 10px;
  min-width: auto;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(8, 12px);
  grid-template-rows: repeat(8, 12px);
  gap: 3px;
  margin-bottom: 8px;
`

const Cell = styled.button.attrs({ type: 'button' })<{
  $inSelection: boolean
}>`
  width: 12px;
  height: 12px;
  padding: 0;
  border: none;
  border-radius: 2px;
  cursor: pointer;
  transition:
    background 0.1s ease,
    transform 0.1s ease;
  background: ${({ $inSelection, theme }) =>
    $inSelection
      ? theme.mode === 'dark'
        ? 'rgba(249, 115, 22, 0.85)'
        : '#f97316'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.12)'
        : '#e8e8ed'};

  &:hover {
    transform: scale(1.08);
    filter: brightness(1.05);
  }
`

const Hint = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-align: center;
  letter-spacing: 0.02em;
`

interface TablePickerCell {
  row: number
  col: number
}

interface TablePickerPopoverProps {
  visible: boolean
  anchorRef: React.RefObject<HTMLButtonElement | null>
  hover: TablePickerCell
  onHover: (cell: TablePickerCell) => void
  /** (행 수, 열 수) = (row+1, col+1) */
  onConfirm: (rows: number, cols: number) => void
  onClose: () => void
}

function TablePickerPopoverComponent({
  visible,
  anchorRef,
  hover,
  onHover,
  onConfirm,
  onClose,
}: TablePickerPopoverProps) {
  if (typeof document === 'undefined' || !visible || !anchorRef.current) {
    return null
  }
  const rect = anchorRef.current.getBoundingClientRect()
  return createPortal(
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99998,
          background: 'transparent',
        }}
        onClick={(event) => {
          event.stopPropagation()
          onClose()
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: `${rect.bottom + 8}px`,
          left: `${rect.left}px`,
          zIndex: 99999,
        }}
      >
        <Popover>
          <Grid>
            {Array.from(
              { length: TABLE_GRID_MAX * TABLE_GRID_MAX },
              (_value, gridIdx) => {
                const row = Math.floor(gridIdx / TABLE_GRID_MAX)
                const col = gridIdx % TABLE_GRID_MAX
                return (
                  <Cell
                    key={gridIdx}
                    $inSelection={row <= hover.row && col <= hover.col}
                    onMouseEnter={() => onHover({ row, col })}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onConfirm(row + 1, col + 1)}
                  />
                )
              },
            )}
          </Grid>
          <Hint>
            {hover.row + 1} × {hover.col + 1}
          </Hint>
        </Popover>
      </div>
    </>,
    document.body,
  )
}

export const TablePickerPopover = React.memo(TablePickerPopoverComponent)
