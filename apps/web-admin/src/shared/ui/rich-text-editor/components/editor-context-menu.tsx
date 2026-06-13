/**
 * 리치 텍스트 에디터 우클릭/선택 컨텍스트 메뉴 — 엔티티 연결 / 용어 연결 / (문서 전용)설명.
 * 원본과 동일하게 항상 포털로 렌더하고 $visible로 display를 토글한다(조건부 unmount 아님).
 * 상태/핸들러는 부모 보유, props로 받는 표현 컴포넌트. (rich-text-editor.tsx 인라인 JSX 추출)
 */
import React from 'react'

import { createPortal } from 'react-dom'

import { FiLink, FiMessageSquare, FiType } from 'react-icons/fi'
import styled from 'styled-components'

import { Z_INDEX } from '@/shared/styles/z-index'

const Menu = styled.div<{
  $visible: boolean
  $top: number
  $left: number
}>`
  position: fixed;
  top: ${({ $top }) => $top}px;
  left: ${({ $left }) => $left}px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(25,25,25,0.92)' : '#fff'};
  backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(20px)' : 'none'};
  -webkit-backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(20px)' : 'none'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  border-radius: 12px;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.08),
    0 1px 3px rgba(0, 0, 0, 0.04);
  padding: 8px;
  z-index: ${Z_INDEX.RICH_TEXT_EDITOR_OVERLAY};
  display: ${({ $visible }) => ($visible ? 'block' : 'none')};
  min-width: 180px;
`

const MenuItem = styled.button.attrs({ type: 'button' })`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  border-radius: 10px;
  transition:
    background 0.2s ease,
    color 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(79, 70, 229, 0.08);
    color: #4f46e5;
  }

  &:disabled {
    color: ${({ theme }) => theme.colors.text.tertiary};
    cursor: not-allowed;
  }

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
`

interface EditorContextMenuProps {
  visible: boolean
  top: number
  left: number
  selectedText: string
  entityLinkUsable: boolean
  /** documentScope가 있을 때만 "설명 넣기" 항목 노출 */
  hasDocumentScope: boolean
  playClickSound: () => void
  onEntityLink: () => void
  onTermLink: () => void
  onExplanation: () => void
}

function EditorContextMenuComponent({
  visible,
  top,
  left,
  selectedText,
  entityLinkUsable,
  hasDocumentScope,
  playClickSound,
  onEntityLink,
  onTermLink,
  onExplanation,
}: EditorContextMenuProps) {
  if (typeof document === 'undefined') return null
  const hasSelection = selectedText.length > 0
  return createPortal(
    <Menu $visible={visible} $top={top} $left={left}>
      {!hasSelection ? (
        <div
          style={{
            padding: '10px 14px',
            fontSize: 12,
            color: '#64748b',
            borderBottom: '1px solid #e2e8f0',
            whiteSpace: 'nowrap',
          }}
        >
          설명·용어를 달 문구를 드래그로 선택한 뒤 메뉴를 선택하세요
        </div>
      ) : null}
      <MenuItem
        onClick={() => {
          if (!hasSelection) return
          playClickSound()
          onEntityLink()
        }}
        disabled={!hasSelection || !entityLinkUsable}
        title={
          !hasSelection
            ? '먼저 문구를 선택하세요'
            : !entityLinkUsable
              ? '엔티티 연결을 쓸 수 없습니다'
              : undefined
        }
      >
        <FiLink />
        엔티티 연결
      </MenuItem>
      <MenuItem
        onClick={() => {
          if (!hasSelection) return
          playClickSound()
          onTermLink()
        }}
        disabled={!hasSelection}
        title={!hasSelection ? '먼저 문구를 선택하세요' : undefined}
      >
        <FiType />
        용어 연결
      </MenuItem>
      {hasDocumentScope ? (
        <MenuItem
          onClick={() => {
            if (!hasSelection) return
            playClickSound()
            onExplanation()
          }}
          disabled={!hasSelection}
          title={
            !hasSelection
              ? '먼저 문구를 선택하세요'
              : '선택한 문구에 이 문서 전용 설명을 붙입니다'
          }
        >
          <FiMessageSquare />
          설명 넣기
        </MenuItem>
      ) : null}
    </Menu>,
    document.body,
  )
}

export const EditorContextMenu = React.memo(EditorContextMenuComponent)
