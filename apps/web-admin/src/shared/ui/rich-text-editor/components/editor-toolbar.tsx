/**
 * 리치 텍스트 에디터 서식 툴바 — 굵게/기울임/제목/정렬/목록/링크/엔티티·용어/이미지/표/코드/색/수평선.
 * 모든 상태·핸들러는 부모가 보유하고 props로 받는 표현 컴포넌트.
 * 색/표 피커 토글은 교차 닫힘 로직 때문에 부모 콜백(onToggleColorPicker/onToggleTablePicker)에 위임.
 * (원본: rich-text-editor.tsx 인라인 툴바 JSX 추출 — 동작 보존)
 */
import React from 'react'

import {
  FiAlignCenter,
  FiAlignLeft,
  FiBold,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiChevronUp,
  FiCode,
  FiDroplet,
  FiGrid,
  FiImage,
  FiItalic,
  FiLink,
  FiList,
  FiMessageSquare,
  FiMinus,
  FiMoreHorizontal,
  FiTrash2,
  FiType,
} from 'react-icons/fi'
import styled, { css } from 'styled-components'

import { PROSE_HR_HTML, PROSE_HR_SMALL_HTML } from '@/shared/styles/prose-hr'
import { Z_INDEX } from '@/shared/styles/z-index'

import {
  richTableAddColumnLeft,
  richTableAddColumnRight,
  richTableAddRowAbove,
  richTableAddRowBelow,
  richTableDeleteColumn,
  richTableDeleteRow,
} from '../utils/table-helpers'

const Toolbar = styled.div<{ $bounded?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 12px 16px;
  background: ${({ theme }) => theme.colors.background.tertiary};
  border-top: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 0 0 20px 20px;
  overflow: visible;
  width: 100%;
  z-index: 100;
  flex-shrink: 0;
  ${({ $bounded }) =>
    $bounded
      ? ''
      : css`
          position: sticky;
          bottom: 0;
        `}
`

const ToolbarActions = styled.div`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const ToolbarButton = styled.button.attrs({ type: 'button' })<{
  $active?: boolean
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border: none;
  border-radius: 10px;
  background: ${({ $active }) => ($active ? '#4f46e5' : 'transparent')};
  color: ${({ $active, theme }) =>
    $active ? '#fff' : theme.colors.text.secondary};
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  position: relative;
  user-select: none;

  &:not(:disabled):hover {
    background: ${({ $active }) =>
      $active ? '#4338ca' : 'rgba(79, 70, 229, 0.1)'};
    color: ${({ $active }) => ($active ? '#fff' : '#4f46e5')};
  }

  /* 비활성(예: onImageUpload 없음)일 때는 호버 툴팁·배경 없음 — 금지 커서만으로 혼동 줄임 */
  &:not(:disabled):hover::after {
    content: attr(title);
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    background: rgba(15, 23, 42, 0.95);
    color: #ffffff;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    z-index: ${Z_INDEX.RICH_TEXT_EDITOR_OVERLAY};
    pointer-events: none;
    animation: tooltipFadeIn 0.15s ease;
  }

  @keyframes tooltipFadeIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    transform: none;
  }

  svg {
    width: 18px;
    height: 18px;
    stroke-width: 2.5;
  }

  span {
    margin-left: 2px;
    font-size: 10px;
    font-weight: 700;
  }
`

const ToolbarDivider = styled.div`
  width: 1px;
  height: 22px;
  background: ${({ theme }) => theme.colors.border.default};
  margin: 5px 4px;
  align-self: center;
`

const preventMouseDown = (event: React.MouseEvent) => event.preventDefault()

interface EditorToolbarProps {
  bounded?: boolean
  isBold: boolean
  isItalic: boolean
  isStrike: boolean
  currentHeading: number | null
  isAlignCenter: boolean
  isBulletList: boolean
  isOrderedList: boolean
  isCode: boolean
  currentColor: string
  cursorInTable: boolean
  selectedText: string
  entityLinkUsable: boolean
  hasDocumentScope: boolean
  canUploadImage: boolean
  colorPickerVisible: boolean
  tablePickerVisible: boolean
  colorPickerButtonRef: React.RefObject<HTMLButtonElement | null>
  tablePickerButtonRef: React.RefObject<HTMLButtonElement | null>
  playClickSound: () => void
  onFormat: (command: string) => void
  onHeading: (level: 1 | 2 | 3) => void
  onLink: () => void
  onEntityLink: () => void
  onTermLink: () => void
  onExplanation: () => void
  onImageUpload: () => void
  onTableOp: (op: (cell: HTMLTableCellElement) => void) => void
  onDeleteTable: () => void
  onInsertHr: (html: string) => void
  onToggleColorPicker: () => void
  onToggleTablePicker: () => void
  actions?: React.ReactNode
}

function EditorToolbarComponent({
  bounded,
  isBold,
  isItalic,
  isStrike,
  currentHeading,
  isAlignCenter,
  isBulletList,
  isOrderedList,
  isCode,
  currentColor,
  cursorInTable,
  selectedText,
  entityLinkUsable,
  hasDocumentScope,
  canUploadImage,
  colorPickerVisible,
  tablePickerVisible,
  colorPickerButtonRef,
  tablePickerButtonRef,
  playClickSound,
  onFormat,
  onHeading,
  onLink,
  onEntityLink,
  onTermLink,
  onExplanation,
  onImageUpload,
  onTableOp,
  onDeleteTable,
  onInsertHr,
  onToggleColorPicker,
  onToggleTablePicker,
  actions,
}: EditorToolbarProps) {
  return (
    <Toolbar $bounded={bounded}>
      <ToolbarButton
        onMouseDown={preventMouseDown}
        onClick={() => {
          playClickSound()
          onFormat('bold')
        }}
        $active={isBold}
        title="굵게 (Ctrl+B)"
        aria-label="굵게 (Ctrl+B)"
        aria-pressed={isBold}
      >
        <FiBold />
      </ToolbarButton>
      <ToolbarButton
        onMouseDown={preventMouseDown}
        onClick={() => {
          playClickSound()
          onFormat('italic')
        }}
        $active={isItalic}
        title="기울임 (Ctrl+I)"
        aria-label="기울임 (Ctrl+I)"
        aria-pressed={isItalic}
      >
        <FiItalic />
      </ToolbarButton>
      <ToolbarButton
        onMouseDown={preventMouseDown}
        onClick={() => {
          playClickSound()
          onFormat('strikeThrough')
        }}
        $active={isStrike}
        title="취소선"
        aria-label="취소선"
        aria-pressed={isStrike}
      >
        <FiMinus />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        onMouseDown={preventMouseDown}
        onClick={() => {
          playClickSound()
          onHeading(1)
        }}
        $active={currentHeading === 1}
        title="제목 1"
        aria-label="제목 1"
        aria-pressed={currentHeading === 1}
      >
        <FiType />
        <span style={{ fontSize: '10px', marginLeft: '2px' }}>1</span>
      </ToolbarButton>
      <ToolbarButton
        onMouseDown={preventMouseDown}
        onClick={() => {
          playClickSound()
          onHeading(2)
        }}
        $active={currentHeading === 2}
        title="제목 2"
        aria-label="제목 2"
        aria-pressed={currentHeading === 2}
      >
        <FiType />
        <span style={{ fontSize: '10px', marginLeft: '2px' }}>2</span>
      </ToolbarButton>
      <ToolbarButton
        onMouseDown={preventMouseDown}
        onClick={() => {
          playClickSound()
          onHeading(3)
        }}
        $active={currentHeading === 3}
        title="제목 3"
        aria-label="제목 3"
        aria-pressed={currentHeading === 3}
      >
        <FiType />
        <span style={{ fontSize: '10px', marginLeft: '2px' }}>3</span>
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        onMouseDown={preventMouseDown}
        onClick={() => {
          playClickSound()
          onFormat('justifyLeft')
        }}
        $active={!isAlignCenter}
        title="왼쪽 정렬"
        aria-label="왼쪽 정렬"
        aria-pressed={!isAlignCenter}
      >
        <FiAlignLeft />
      </ToolbarButton>
      <ToolbarButton
        onMouseDown={preventMouseDown}
        onClick={() => {
          playClickSound()
          onFormat('justifyCenter')
        }}
        $active={isAlignCenter}
        title="가운데 정렬"
        aria-label="가운데 정렬"
        aria-pressed={isAlignCenter}
      >
        <FiAlignCenter />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        onMouseDown={preventMouseDown}
        onClick={() => {
          playClickSound()
          onFormat('insertUnorderedList')
        }}
        $active={isBulletList}
        title="순서 없는 목록"
        aria-label="순서 없는 목록"
        aria-pressed={isBulletList}
      >
        <FiList />
      </ToolbarButton>
      <ToolbarButton
        onMouseDown={preventMouseDown}
        onClick={() => {
          playClickSound()
          onFormat('insertOrderedList')
        }}
        $active={isOrderedList}
        title="순서 있는 목록"
        aria-label="순서 있는 목록"
        aria-pressed={isOrderedList}
      >
        <FiList style={{ transform: 'rotate(90deg)' }} />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        onMouseDown={preventMouseDown}
        onClick={() => {
          playClickSound()
          onLink()
        }}
        title="링크 삽입/편집"
        aria-label="링크 삽입/편집"
      >
        <FiLink />
      </ToolbarButton>
      <ToolbarButton
        onMouseDown={preventMouseDown}
        onClick={() => {
          playClickSound()
          if (selectedText.length > 0) onEntityLink()
        }}
        disabled={selectedText.length === 0 || !entityLinkUsable}
        title={
          !entityLinkUsable
            ? '엔티티 연결 불가: 서버 검색이 꺼져 있고 로컬 목록도 없습니다'
            : '엔티티 연결 (문구 선택 후 클릭)'
        }
        aria-label="엔티티 연결 (문구 선택 후 클릭)"
        style={{
          background:
            selectedText.length > 0 && entityLinkUsable
              ? 'rgba(245, 158, 11, 0.08)'
              : undefined,
          border:
            selectedText.length > 0 && entityLinkUsable
              ? '1px solid rgba(245, 158, 11, 0.25)'
              : undefined,
        }}
      >
        <FiLink style={{ transform: 'rotate(-45deg)' }} />
      </ToolbarButton>
      <ToolbarButton
        onMouseDown={preventMouseDown}
        onClick={() => {
          playClickSound()
          if (selectedText.length > 0) onTermLink()
        }}
        disabled={selectedText.length === 0}
        title="용어 연결 (문구 선택 후 클릭)"
        aria-label="용어 연결 (문구 선택 후 클릭)"
      >
        <FiType />
      </ToolbarButton>
      {hasDocumentScope ? (
        <ToolbarButton
          onMouseDown={preventMouseDown}
          onClick={() => {
            playClickSound()
            if (selectedText.length > 0) onExplanation()
          }}
          disabled={selectedText.length === 0}
          title="설명 넣기 (설명을 달 문구를 선택한 뒤 클릭)"
          aria-label="설명 넣기 (설명을 달 문구를 선택한 뒤 클릭)"
        >
          <FiMessageSquare />
        </ToolbarButton>
      ) : null}
      <ToolbarButton
        onMouseDown={preventMouseDown}
        onClick={() => {
          playClickSound()
          onImageUpload()
        }}
        disabled={!canUploadImage}
        title="이미지 삽입"
        aria-label="이미지 삽입"
      >
        <FiImage />
      </ToolbarButton>
      <ToolbarDivider />
      <div style={{ position: 'relative' }}>
        <ToolbarButton
          ref={tablePickerButtonRef}
          onMouseDown={preventMouseDown}
          onClick={(event) => {
            event.stopPropagation()
            playClickSound()
            onToggleTablePicker()
          }}
          title="표 삽입 (격자에서 크기 선택)"
          aria-label="표 삽입"
          aria-expanded={tablePickerVisible}
          aria-haspopup="grid"
          style={{
            background: tablePickerVisible
              ? 'rgba(249, 115, 22, 0.14)'
              : undefined,
          }}
        >
          <FiGrid />
        </ToolbarButton>
      </div>
      {cursorInTable ? (
        <>
          <ToolbarDivider />
          <ToolbarButton
            onMouseDown={preventMouseDown}
            onClick={() => {
              playClickSound()
              onTableOp(richTableAddRowAbove)
            }}
            title="행 위에 삽입"
            aria-label="행 위에 삽입"
          >
            <FiChevronUp />
          </ToolbarButton>
          <ToolbarButton
            onMouseDown={preventMouseDown}
            onClick={() => {
              playClickSound()
              onTableOp(richTableAddRowBelow)
            }}
            title="행 아래에 삽입"
            aria-label="행 아래에 삽입"
          >
            <FiChevronDown />
          </ToolbarButton>
          <ToolbarButton
            onMouseDown={preventMouseDown}
            onClick={() => {
              playClickSound()
              onTableOp(richTableAddColumnLeft)
            }}
            title="열 왼쪽에 삽입"
            aria-label="열 왼쪽에 삽입"
          >
            <FiChevronLeft />
          </ToolbarButton>
          <ToolbarButton
            onMouseDown={preventMouseDown}
            onClick={() => {
              playClickSound()
              onTableOp(richTableAddColumnRight)
            }}
            title="열 오른쪽에 삽입"
            aria-label="열 오른쪽에 삽입"
          >
            <FiChevronRight />
          </ToolbarButton>
          <ToolbarButton
            onMouseDown={preventMouseDown}
            onClick={() => {
              playClickSound()
              onTableOp(richTableDeleteRow)
            }}
            title="이 행 삭제"
            aria-label="이 행 삭제"
          >
            <FiMinus />
          </ToolbarButton>
          <ToolbarButton
            onMouseDown={preventMouseDown}
            onClick={() => {
              playClickSound()
              onTableOp(richTableDeleteColumn)
            }}
            title="이 열 삭제"
            aria-label="이 열 삭제"
          >
            <FiMinus style={{ transform: 'rotate(90deg)' }} />
          </ToolbarButton>
          <ToolbarButton
            onMouseDown={preventMouseDown}
            onClick={() => {
              playClickSound()
              onDeleteTable()
            }}
            title="표 전체 삭제"
            aria-label="표 전체 삭제"
          >
            <FiTrash2 />
          </ToolbarButton>
        </>
      ) : null}
      <ToolbarDivider />
      <ToolbarButton
        onMouseDown={preventMouseDown}
        onClick={() => {
          playClickSound()
          onFormat('formatCode')
        }}
        $active={isCode}
        title="인라인 코드"
        aria-label="인라인 코드"
        aria-pressed={isCode}
      >
        <FiCode />
      </ToolbarButton>
      <ToolbarDivider />
      <div style={{ position: 'relative' }}>
        <ToolbarButton
          ref={colorPickerButtonRef}
          onMouseDown={preventMouseDown}
          onClick={(event) => {
            event.stopPropagation()
            playClickSound()
            onToggleColorPicker()
          }}
          title="텍스트 색상"
          aria-label="텍스트 색상"
          aria-expanded={colorPickerVisible}
          aria-haspopup="true"
          style={{
            background: colorPickerVisible
              ? 'rgba(79, 70, 229, 0.1)'
              : undefined,
          }}
        >
          <FiDroplet style={{ color: currentColor }} />
        </ToolbarButton>
      </div>
      <ToolbarDivider />
      <ToolbarButton
        onMouseDown={preventMouseDown}
        onClick={() => onInsertHr(PROSE_HR_HTML)}
        title="수평선 삽입"
        aria-label="수평선 삽입"
      >
        <FiMoreHorizontal />
      </ToolbarButton>
      <ToolbarButton
        onMouseDown={preventMouseDown}
        onClick={() => onInsertHr(PROSE_HR_SMALL_HTML)}
        title="작은 수평선 삽입"
        aria-label="작은 수평선 삽입"
      >
        <FiMinus />
      </ToolbarButton>
      {actions && <ToolbarActions>{actions}</ToolbarActions>}
    </Toolbar>
  )
}

export const EditorToolbar = React.memo(EditorToolbarComponent)
