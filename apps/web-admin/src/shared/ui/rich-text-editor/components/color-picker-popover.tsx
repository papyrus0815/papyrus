/**
 * 리치 텍스트 에디터 글자색 선택 팝오버 — body 포털.
 * 앵커 버튼(anchorRef)의 getBoundingClientRect로 위치를 잡고, 색 적용 로직은
 * 부모 onApplyColor에 위임한다(스와치=close:true, 네이티브 입력=close:false).
 * (원본: rich-text-editor.tsx 인라인 IIFE JSX 추출 — 동작 보존)
 */
import React from 'react'

import { createPortal } from 'react-dom'

import styled from 'styled-components'

/** 기본 팔레트 22색 — 원본 인라인 배열을 모듈 상수로 hoist(렌더마다 재생성 방지). */
const COLOR_PALETTE = [
  '#000000',
  '#374151',
  '#6b7280',
  '#9ca3af',
  '#d1d5db',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
] as const

const ColorPickerDropdown = styled.div`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(30,30,30,0.95)' : '#fff'};
  backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(20px)' : 'none'};
  -webkit-backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(20px)' : 'none'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  border-radius: 14px;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.08),
    0 1px 3px rgba(0, 0, 0, 0.04);
  padding: 14px;
  min-width: 260px;
`

const ColorPickerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  margin-bottom: 12px;
`

const ColorPickerItem = styled.div<{ $color: string; $selected: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: ${({ $color }) => $color};
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  border: 2px solid
    ${({ $selected }) => ($selected ? '#4f46e5' : 'rgba(0, 0, 0, 0.1)')};
  box-shadow: ${({ $selected }) =>
    $selected
      ? '0 0 0 2px rgba(79, 70, 229, 0.15)'
      : '0 1px 3px rgba(0, 0, 0, 0.08)'};

  &:hover {
    border-color: rgba(79, 70, 229, 0.5);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`

const ColorPickerInputWrapper = styled.div`
  padding-top: 8px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.default};
`

interface ColorPickerPopoverProps {
  visible: boolean
  anchorRef: React.RefObject<HTMLButtonElement | null>
  currentColor: string
  onApplyColor: (color: string, options: { close: boolean }) => void
  onClose: () => void
}

function ColorPickerPopoverComponent({
  visible,
  anchorRef,
  currentColor,
  onApplyColor,
  onClose,
}: ColorPickerPopoverProps) {
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
          /* fixed + getBoundingClientRect는 뷰포트 기준 — scrollY/X를 더하면 스크롤만큼 어긋남 */
          top: `${rect.bottom + 8}px`,
          left: `${rect.left}px`,
          zIndex: 99999,
        }}
      >
        <ColorPickerDropdown>
          <ColorPickerGrid>
            {COLOR_PALETTE.map((color) => (
              <ColorPickerItem
                key={color}
                $color={color}
                $selected={currentColor === color}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onApplyColor(color, { close: true })}
                title={color}
              />
            ))}
          </ColorPickerGrid>
          <ColorPickerInputWrapper>
            <input
              type="color"
              value={currentColor}
              onMouseDown={(event) => event.preventDefault()}
              onChange={(event) =>
                onApplyColor(event.target.value, { close: false })
              }
              style={{
                width: '100%',
                height: '32px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            />
          </ColorPickerInputWrapper>
        </ColorPickerDropdown>
      </div>
    </>,
    document.body,
  )
}

export const ColorPickerPopover = React.memo(ColorPickerPopoverComponent)
