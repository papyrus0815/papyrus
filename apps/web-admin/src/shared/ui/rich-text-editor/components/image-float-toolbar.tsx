/**
 * 선택된 이미지(figure) 위에 뜨는 부유 툴바 — 정렬/너비 프리셋/원본복원/캡션/삭제.
 * 정렬·너비 상태는 selectedFigure DOM(dataset.align, style.width)에서 파생한다.
 * id="rich-text-image-toolbar"는 부모의 클릭 판정(getElementById)에서 참조하므로 유지.
 * (원본: rich-text-editor.tsx 인라인 JSX 추출 — 동작 보존)
 */
import React from 'react'

import { createPortal } from 'react-dom'

import {
  FiAlignCenter,
  FiAlignLeft,
  FiAlignRight,
  FiEdit2,
  FiMaximize2,
  FiTrash2,
} from 'react-icons/fi'
import styled from 'styled-components'

import { Z_INDEX } from '@/shared/styles/z-index'

const Toolbar = styled.div<{ $top: number; $left: number }>`
  position: fixed;
  top: ${({ $top }) => $top}px;
  left: ${({ $left }) => $left}px;
  transform: translateX(-50%);
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(25,25,25,0.95)' : '#fff'};
  backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(20px)' : 'none'};
  -webkit-backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(20px)' : 'none'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  border-radius: 12px;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.12),
    0 1px 3px rgba(0, 0, 0, 0.06);
  padding: 6px;
  z-index: ${Z_INDEX.RICH_TEXT_EDITOR_OVERLAY};
  display: flex;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
`

const IconButton = styled.button.attrs({ type: 'button' })<{
  $active?: boolean
  $danger?: boolean
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  min-width: 32px;
  padding: 0 8px;
  border: none;
  border-radius: 8px;
  background: ${({ $active }) =>
    $active ? 'rgba(79, 70, 229, 0.12)' : 'transparent'};
  color: ${({ theme, $active, $danger }) =>
    $danger ? '#dc2626' : $active ? '#4f46e5' : theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;

  &:hover {
    background: ${({ $danger }) =>
      $danger ? 'rgba(220, 38, 38, 0.08)' : 'rgba(79, 70, 229, 0.08)'};
    color: ${({ $danger }) => ($danger ? '#dc2626' : '#4f46e5')};
  }

  svg {
    width: 16px;
    height: 16px;
  }
`

const Divider = styled.span`
  width: 1px;
  height: 18px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  margin: 0 2px;
`

const WIDTH_PRESETS = [25, 50, 75, 100]

interface ImageFloatToolbarProps {
  selectedFigure: HTMLElement | null
  menuPos: { top: number; left: number } | null
  onAlign: (align: 'left' | 'center' | 'right') => void
  onWidthPreset: (percent: number) => void
  onResetSize: () => void
  onEditCaption: () => void
  onDelete: () => void
}

function ImageFloatToolbarComponent({
  selectedFigure,
  menuPos,
  onAlign,
  onWidthPreset,
  onResetSize,
  onEditCaption,
  onDelete,
}: ImageFloatToolbarProps) {
  if (typeof document === 'undefined' || !selectedFigure || !menuPos) {
    return null
  }
  const align = selectedFigure.dataset.align ?? 'center'
  const widthStyle = selectedFigure.style.width || ''
  const widthPercentMatch = /^(\d+(?:\.\d+)?)%$/.exec(widthStyle)
  const widthPercent = widthPercentMatch ? Number(widthPercentMatch[1]) : null

  return createPortal(
    <Toolbar
      id="rich-text-image-toolbar"
      $top={menuPos.top}
      $left={menuPos.left}
      onMouseDown={(event) => event.preventDefault()}
    >
      <IconButton
        title="왼쪽 정렬"
        aria-label="왼쪽 정렬"
        $active={align === 'left'}
        onClick={() => onAlign('left')}
      >
        <FiAlignLeft />
      </IconButton>
      <IconButton
        title="가운데 정렬"
        aria-label="가운데 정렬"
        $active={align === 'center'}
        onClick={() => onAlign('center')}
      >
        <FiAlignCenter />
      </IconButton>
      <IconButton
        title="오른쪽 정렬"
        aria-label="오른쪽 정렬"
        $active={align === 'right'}
        onClick={() => onAlign('right')}
      >
        <FiAlignRight />
      </IconButton>
      <Divider />
      {WIDTH_PRESETS.map((pct) => (
        <IconButton
          key={pct}
          title={`너비 ${pct}%`}
          aria-label={`너비 ${pct}%`}
          $active={widthPercent === pct}
          onClick={() => onWidthPreset(pct)}
        >
          {pct}%
        </IconButton>
      ))}
      <IconButton
        title="원본 크기로 복원"
        aria-label="원본 크기로 복원"
        onClick={onResetSize}
      >
        <FiMaximize2 />
      </IconButton>
      <Divider />
      <IconButton
        title="설명(캡션) 편집"
        aria-label="설명(캡션) 편집"
        onClick={onEditCaption}
      >
        <FiEdit2 />
      </IconButton>
      <IconButton
        title="이미지 삭제"
        aria-label="이미지 삭제"
        $danger
        onClick={onDelete}
      >
        <FiTrash2 />
      </IconButton>
    </Toolbar>,
    document.body,
  )
}

export const ImageFloatToolbar = React.memo(ImageFloatToolbarComponent)
