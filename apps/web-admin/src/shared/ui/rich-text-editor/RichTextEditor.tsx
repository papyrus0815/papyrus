/**
 * 리치 텍스트 에디터 컴포넌트
 * 라이브러리 없이 ContentEditable 기반으로 직접 구현
 * 프로젝트 디자인 시스템에 맞춘 커스텀 스타일
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'

import {
  FiBold,
  FiCode,
  FiDroplet,
  FiImage,
  FiItalic,
  FiLink,
  FiList,
  FiMinus,
  FiMoreHorizontal,
  FiType,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { MentionItem } from '@/pages/events/create/mention-system'
import {
  MENTION_TYPE_CONFIG,
  searchMentionEntities,
} from '@/pages/events/create/mention-system'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'

// 멘션 엔티티 props 타입
export interface MentionExtensionProps {
  persons?: unknown[]
  events?: unknown[]
  countries?: unknown[]
  historicalCountries?: unknown[]
  militaryUnits?: unknown[]
}

const EditorContainer = styled.div`
  position: relative;
  border-radius: 16px;
  overflow: visible;
  box-shadow:
    0 1px 3px rgba(15, 23, 42, 0.04),
    0 0 0 1px rgba(139, 92, 246, 0.08);
  transition: all 0.3s ease;
  background: #ffffff;
  width: 100%;

  &:focus-within {
    box-shadow:
      0 4px 16px rgba(139, 92, 246, 0.12),
      0 0 0 2px rgba(139, 92, 246, 0.2);
  }
`

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 14px 18px;
  background: linear-gradient(
    135deg,
    rgba(139, 92, 246, 0.02),
    rgba(168, 85, 247, 0.01)
  );
  border-bottom: 1px solid rgba(139, 92, 246, 0.08);
  backdrop-filter: blur(8px);
  border-radius: 16px 16px 0 0;
  overflow: visible;
  width: 100%;
`

const ToolbarButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 34px;
  padding: 0 8px;
  border: none;
  border-radius: 8px;
  background: ${({ $active }) =>
    $active ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'transparent'};
  color: ${({ $active }) => ($active ? '#ffffff' : '#64748b')};
  cursor: pointer;
  transition: all 0.1s ease;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  position: relative;
  user-select: none;

  &:hover {
    background: ${({ $active }) =>
      $active
        ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
        : 'rgba(139, 92, 246, 0.08)'};
    color: ${({ $active }) => ($active ? '#ffffff' : '#8b5cf6')};
    transform: translateY(-1px);
  }

  &:hover::after {
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
    z-index: 100000;
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

  &:active {
    transform: translateY(0);
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
  height: 24px;
  background: rgba(139, 92, 246, 0.12);
  margin: 5px 4px;
  align-self: center;
`

const EditorWrapper = styled.div`
  background: #ffffff;
  transition: all 0.2s ease;
  position: relative;
  border-radius: 0 0 16px 16px;
  overflow: visible;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      rgba(139, 92, 246, 0.01),
      rgba(168, 85, 247, 0.005)
    );
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
    border-radius: 0 0 16px 16px;
  }

  &:focus-within::before {
    opacity: 1;
  }
`

const TitleInput = styled.input`
  width: 100%;
  padding: 28px 28px 16px 28px;
  border: none;
  outline: none;
  background: transparent;
  font-size: 36px;
  font-weight: 700;
  line-height: 1.2;
  color: #0f172a;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
    Arial, sans-serif;
  letter-spacing: -0.02em;

  &::placeholder {
    color: #cbd5e1;
    font-weight: 600;
  }

  &:focus::placeholder {
    color: #e2e8f0;
  }
`

const TitleDivider = styled.div`
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(139, 92, 246, 0.15) 20%,
    rgba(139, 92, 246, 0.15) 80%,
    transparent
  );
  margin: 0 28px 8px 28px;
`

const EditorContent = styled.div<{ $hasTitle?: boolean }>`
  outline: none;
  min-height: ${({ $hasTitle }) => ($hasTitle ? '280px' : '320px')};
  padding: ${({ $hasTitle }) =>
    $hasTitle ? '16px 28px 24px 28px' : '24px 28px'};
  font-size: 15px;
  line-height: 1.75;
  color: #1e293b;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
    Arial, sans-serif;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  cursor: text;
  position: relative;
  overflow: visible;

  &[contenteditable='true']:empty:before {
    content: attr(data-placeholder);
    color: #94a3b8;
    pointer-events: none;
    font-style: italic;
  }

  p {
    margin: 0 0 16px 0;

    &:last-child {
      margin-bottom: 0;
    }
  }

  h1,
  h2,
  h3 {
    margin: 28px 0 16px 0;
    font-weight: 700;
    line-height: 1.3;
    color: #0f172a;
    letter-spacing: -0.02em;

    &:first-child {
      margin-top: 0;
    }
  }

  h1 {
    font-size: 32px;
    background: linear-gradient(135deg, #8b5cf6, #6366f1);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  h2 {
    font-size: 24px;
    color: #1e293b;
  }

  h3 {
    font-size: 20px;
    color: #334155;
  }

  ul,
  ol {
    margin: 12px 0;
    padding-left: 28px;
  }

  li {
    margin: 6px 0;
    line-height: 1.6;
  }

  img {
    max-width: 100%;
    height: auto;
    border-radius: 12px;
    margin: 16px 0;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
    display: block;
    transition: opacity 0.2s ease;

    &[data-resizable='true'] {
      cursor: pointer;

      &:hover {
        opacity: 0.9;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
      }
    }
  }

  a {
    color: #8b5cf6;
    text-decoration: none;
    border-bottom: 2px solid rgba(139, 92, 246, 0.3);
    cursor: pointer;
    transition: all 0.2s ease;
    font-weight: 500;

    &:hover {
      color: #7c3aed;
      border-bottom-color: #8b5cf6;
      background: rgba(139, 92, 246, 0.05);
    }
  }

  blockquote {
    border-left: 4px solid #8b5cf6;
    padding: 16px 24px;
    margin: 20px 0;
    background: linear-gradient(
      90deg,
      rgba(139, 92, 246, 0.08),
      rgba(168, 85, 247, 0.04)
    );
    border-radius: 0 12px 12px 0;
    color: #475569;
    font-style: italic;
    position: relative;

    &::before {
      content: '"';
      position: absolute;
      top: 8px;
      left: 12px;
      font-size: 48px;
      color: rgba(139, 92, 246, 0.15);
      font-family: Georgia, serif;
      line-height: 1;
    }
  }

  code {
    background: linear-gradient(
      135deg,
      rgba(139, 92, 246, 0.12),
      rgba(99, 102, 241, 0.08)
    );
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 13px;
    font-family:
      'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Courier New', monospace;
    color: #7c3aed;
    font-weight: 500;
    border: 1px solid rgba(139, 92, 246, 0.15);
  }

  pre {
    background: linear-gradient(180deg, #fafbff, #ffffff);
    padding: 16px;
    border-radius: 12px;
    border: 1px solid rgba(99, 102, 241, 0.12);
    overflow-x: auto;
    margin: 16px 0;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);

    code {
      background: transparent;
      padding: 0;
      color: #0f172a;
    }
  }

  hr {
    border: none;
    border-top: 2px solid rgba(99, 102, 241, 0.2);
    margin: 24px 0;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(99, 102, 241, 0.3),
      transparent
    );
    height: 2px;
    display: block;
  }

  figure {
    margin: 16px 0;
    text-align: center;
    position: relative;
    display: inline-block;
    max-width: 100%;

    img {
      margin: 0 auto;
    }

    figcaption {
      margin-top: 8px;
      font-size: 13px;
      color: #64748b;
      font-style: italic;
      text-align: center;
    }

    /* 리사이즈 핸들 스타일 */
    .resize-handle {
      position: absolute;
      width: 12px;
      height: 12px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border: 2px solid #ffffff;
      border-radius: 50%;
      cursor: nwse-resize;
      z-index: 10;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      transition: all 0.2s ease;
      opacity: 0;
      pointer-events: none;

      &:hover {
        transform: scale(1.2);
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
      }

      &.bottom-right {
        bottom: -6px;
        right: -6px;
        cursor: nwse-resize;
      }
    }

    &:hover .resize-handle {
      opacity: 1;
      pointer-events: all;
    }

    &.resizing .resize-handle {
      opacity: 1;
      pointer-events: all;
    }
  }

  /* 멘션 스타일 */
  .mention {
    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
    color: #ffffff !important;
    padding: 3px 12px;
    border-radius: 20px;
    font-weight: 600;
    font-size: 13px;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    box-shadow: 0 2px 8px rgba(139, 92, 246, 0.2);

    &:hover {
      background: linear-gradient(135deg, #7c3aed, #6d28d9);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
    }

    &:active {
      transform: translateY(0);
    }
  }

  /* 엔티티 링크 스타일 */
  .entity-link {
    background: linear-gradient(
      135deg,
      rgba(245, 158, 11, 0.15),
      rgba(251, 191, 36, 0.1)
    );
    color: #d97706 !important;
    padding: 2px 8px;
    border-radius: 6px;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s ease;
    border-bottom: 2px solid rgba(245, 158, 11, 0.4);
    position: relative;
    display: inline-block;
    user-select: none;
    -webkit-user-select: none;
    white-space: nowrap;
    box-shadow: 0 1px 3px rgba(245, 158, 11, 0.1);

    &:hover {
      background: linear-gradient(
        135deg,
        rgba(245, 158, 11, 0.25),
        rgba(251, 191, 36, 0.15)
      );
      border-bottom-color: rgba(245, 158, 11, 0.6);
      color: #b45309 !important;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.2);
    }

    &:active {
      transform: translateY(0);
    }

    &::after {
      content: '🔗';
      font-size: 9px;
      margin-left: 4px;
      opacity: 0.5;
      transition: opacity 0.2s ease;
    }

    &:hover::after {
      opacity: 1;
    }
  }
`

const MentionPopup = styled.div<{
  $visible: boolean
  $top: number
  $left: number
}>`
  position: fixed;
  top: ${({ $top }) => $top}px;
  left: ${({ $left }) => $left}px;
  background: #ffffff;
  border: 1px solid rgba(139, 92, 246, 0.15);
  border-radius: 16px;
  box-shadow:
    0 8px 24px rgba(15, 23, 42, 0.12),
    0 20px 48px rgba(139, 92, 246, 0.15);
  padding: 12px;
  max-height: 380px;
  overflow-y: auto;
  min-width: 340px;
  z-index: 1000;
  display: ${({ $visible }) => ($visible ? 'block' : 'none')};
  backdrop-filter: blur(12px);
`

// 이미지 설명 입력 모달 스타일
const ImageCaptionModalOverlay = styled.div<{ $visible: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: ${({ $visible }) => ($visible ? 'flex' : 'none')};
  align-items: center;
  justify-content: center;
`

const ImageCaptionModal = styled.div`
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 480px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`

const ImageCaptionModalHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid rgba(99, 102, 241, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const ImageCaptionModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
`

const ImageCaptionModalClose = styled.button`
  border: none;
  background: transparent;
  padding: 4px;
  cursor: pointer;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.08);
    color: #6366f1;
  }
`

const ImageCaptionModalContent = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const ImageCaptionInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1.5px solid rgba(99, 102, 241, 0.2);
  border-radius: 10px;
  font-size: 14px;
  color: #0f172a;
  background: #ffffff;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: rgba(99, 102, 241, 0.5);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  &::placeholder {
    color: #94a3b8;
  }
`

const ImageCaptionModalFooter = styled.div`
  padding: 16px 24px;
  border-top: 1px solid rgba(99, 102, 241, 0.1);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
`

const ImageCaptionButton = styled.button<{ $primary?: boolean }>`
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  ${({ $primary }) =>
    $primary
      ? `
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: #ffffff;
    
    &:hover {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }
  `
      : `
    background: #f1f5f9;
    color: #64748b;
    
    &:hover {
      background: #e2e8f0;
      color: #475569;
    }
  `}
`

// 색상 선택기 스타일
const ColorPickerDropdown = styled.div`
  background: #ffffff;
  border: 1px solid rgba(139, 92, 246, 0.15);
  border-radius: 14px;
  box-shadow:
    0 8px 24px rgba(15, 23, 42, 0.12),
    0 20px 48px rgba(139, 92, 246, 0.15);
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
  transition: all 0.2s ease;
  border: 2px solid
    ${({ $selected }) =>
      $selected ? 'rgba(99, 102, 241, 0.6)' : 'rgba(0, 0, 0, 0.1)'};
  box-shadow: ${({ $selected }) =>
    $selected
      ? '0 0 0 2px rgba(99, 102, 241, 0.2)'
      : '0 1px 3px rgba(0, 0, 0, 0.1)'};

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    border-color: rgba(99, 102, 241, 0.4);
  }
`

const ColorPickerInputWrapper = styled.div`
  padding-top: 8px;
  border-top: 1px solid rgba(99, 102, 241, 0.1);
`

// 컨텍스트 메뉴 스타일
const ContextMenu = styled.div<{
  $visible: boolean
  $top: number
  $left: number
}>`
  position: fixed;
  top: ${({ $top }) => $top}px;
  left: ${({ $left }) => $left}px;
  background: linear-gradient(180deg, #fafbff, #ffffff);
  border: 1.5px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 16px 32px rgba(99, 102, 241, 0.12);
  padding: 8px;
  z-index: 1000;
  display: ${({ $visible }) => ($visible ? 'block' : 'none')};
  min-width: 180px;
`

const ContextMenuItem = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: transparent;
  color: #0f172a;
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: linear-gradient(
      135deg,
      rgba(99, 102, 241, 0.12),
      rgba(168, 85, 247, 0.08)
    );
    color: #6366f1;
  }

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
`

// 엔티티 링크 모달 스타일
const EntityLinkModalOverlay = styled.div<{ $visible: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: ${({ $visible }) => ($visible ? 'flex' : 'none')};
  align-items: center;
  justify-content: center;
`

const EntityLinkModal = styled.div`
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`

const EntityLinkModalHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid rgba(99, 102, 241, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const EntityLinkModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
`

const EntityLinkModalClose = styled.button`
  border: none;
  background: transparent;
  padding: 4px;
  cursor: pointer;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.08);
    color: #6366f1;
  }
`

const EntityLinkModalContent = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  overflow-y: auto;
`

const EntityLinkSearchInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1.5px solid rgba(99, 102, 241, 0.2);
  border-radius: 10px;
  font-size: 14px;
  color: #0f172a;
  background: #ffffff;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: rgba(99, 102, 241, 0.5);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  &::placeholder {
    color: #94a3b8;
  }
`

const EntityLinkSelectedText = styled.div`
  padding: 12px 16px;
  background: linear-gradient(
    135deg,
    rgba(245, 158, 11, 0.08),
    rgba(251, 191, 36, 0.05)
  );
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 10px;
  font-size: 13px;
  color: #78350f;
  font-weight: 500;

  strong {
    display: block;
    margin-bottom: 4px;
    color: #92400e;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`

const EntityLinkResultsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
`

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onImageUpload?: (file: File) => Promise<string>
  mentionEntities?: MentionExtensionProps
  title?: string
  onTitleChange?: (title: string) => void
  titlePlaceholder?: string
  showTitle?: boolean
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = '내용을 입력하세요...',
  onImageUpload,
  mentionEntities,
  title = '',
  onTitleChange,
  titlePlaceholder = '제목 없음',
  showTitle = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [internalTitle, setInternalTitle] = useState(title)
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isStrike, setIsStrike] = useState(false)
  const [currentHeading, setCurrentHeading] = useState<number | null>(null)
  const [isBulletList, setIsBulletList] = useState(false)
  const [isOrderedList, setIsOrderedList] = useState(false)
  const [isCode, setIsCode] = useState(false)
  const [currentColor, setCurrentColor] = useState<string>('#000000')
  const [colorPickerVisible, setColorPickerVisible] = useState(false)
  const colorPickerButtonRef = useRef<HTMLButtonElement>(null)

  // title prop이 변경되면 내부 상태 업데이트
  useEffect(() => {
    setInternalTitle(title)
  }, [title])

  // 멘션 관련 상태
  const [mentionPopupVisible, setMentionPopupVisible] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionResults, setMentionResults] = useState<MentionItem[]>([])
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0)
  const [mentionPopupPosition, setMentionPopupPosition] = useState({
    top: 0,
    left: 0,
  })
  const mentionRangeRef = useRef<Range | null>(null)

  // 엔티티 링크 관련 상태
  const [entityLinkModalVisible, setEntityLinkModalVisible] = useState(false)
  const [entityLinkQuery, setEntityLinkQuery] = useState('')
  const [entityLinkResults, setEntityLinkResults] = useState<MentionItem[]>([])
  const [entityLinkSelectedIndex, setEntityLinkSelectedIndex] = useState(0)
  const [selectedTextRange, setSelectedTextRange] = useState<Range | null>(null)
  const [selectedText, setSelectedText] = useState('')
  const [contextMenuVisible, setContextMenuVisible] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({
    top: 0,
    left: 0,
  })

  // 이미지 설명 모달 관련 상태
  const [imageCaptionModalVisible, setImageCaptionModalVisible] =
    useState(false)
  const [imageCaptionInput, setImageCaptionInput] = useState('')
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null)
  const imageCaptionInputRef = useRef<HTMLInputElement>(null)
  const savedImageInsertRangeRef = useRef<Range | null>(null)

  // 클릭 사운드 훅
  const playClickSound = useClickSound()

  // 에디터 내용 동기화
  useEffect(() => {
    if (editorRef.current) {
      const currentContent = editorRef.current.innerHTML
      const newContent = value || ''

      // 값이 실제로 변경되었을 때만 업데이트 (무한 루프 방지)
      if (currentContent !== newContent) {
        const selection = window.getSelection()
        const range =
          selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null
        const cursorPosition = range
          ? {
              startContainer: range.startContainer,
              startOffset: range.startOffset,
            }
          : null

        editorRef.current.innerHTML = newContent

        // 커서 위치 복원
        if (cursorPosition && selection) {
          try {
            const newRange = document.createRange()
            newRange.setStart(
              cursorPosition.startContainer,
              cursorPosition.startOffset,
            )
            newRange.collapse(true)
            selection.removeAllRanges()
            selection.addRange(newRange)
          } catch {
            // 커서 복원 실패 시 무시
          }
        }
      }
    }
  }, [value])

  // 텍스트 선택 감지
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)
      const text = range.toString().trim()

      // 에디터 내부에서 선택했는지 확인
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        if (text.length > 0) {
          setSelectedText(text)
          setSelectedTextRange(range.cloneRange())
        } else {
          setSelectedText('')
          setSelectedTextRange(null)
          setContextMenuVisible(false)
        }
      }
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [])

  // 컨텍스트 메뉴 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuVisible) {
        setContextMenuVisible(false)
      }
    }

    if (contextMenuVisible) {
      document.addEventListener('click', handleClickOutside)
      return () => {
        document.removeEventListener('click', handleClickOutside)
      }
    }
  }, [contextMenuVisible])

  // 이미지 드래그 리사이즈 기능 초기화
  useEffect(() => {
    if (!editorRef.current) return

    let isResizing = false
    let resizeTarget: HTMLImageElement | null = null
    let startX = 0
    let startY = 0
    let startWidth = 0
    let startHeight = 0
    let aspectRatio = 1

    const createResizeHandle = (img: HTMLImageElement) => {
      const figure = img.closest('figure')
      if (!figure) return

      // 이미지 드래그 방지
      img.setAttribute('draggable', 'false')
      img.addEventListener('dragstart', (e) => {
        e.preventDefault()
        e.stopPropagation()
        return false
      })

      // 이미 핸들이 있으면 제거
      const existingHandle = figure.querySelector('.resize-handle')
      if (existingHandle) return

      const handle = document.createElement('div')
      handle.className = 'resize-handle bottom-right'
      figure.appendChild(handle)

      handle.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        isResizing = true
        resizeTarget = img
        startX = e.clientX
        startY = e.clientY
        startWidth = img.offsetWidth
        startHeight = img.offsetHeight
        aspectRatio = startHeight / startWidth
        figure.classList.add('resizing')
        document.body.style.cursor = 'nwse-resize'
        document.body.style.userSelect = 'none'
      })
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !resizeTarget) return

      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY

      // 대각선 거리 계산 (비율 유지)
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      const direction = deltaX > 0 ? 1 : -1

      const newWidth = Math.max(
        50,
        Math.min(
          startWidth + distance * direction,
          resizeTarget.naturalWidth * 2,
        ),
      )
      const newHeight = newWidth * aspectRatio

      resizeTarget.style.width = `${newWidth}px`
      resizeTarget.style.height = `${newHeight}px`
      resizeTarget.style.maxWidth = 'none'
      resizeTarget.style.maxHeight = 'none'
    }

    const handleMouseUp = () => {
      if (isResizing && resizeTarget) {
        const figure = resizeTarget.closest('figure')
        if (figure) {
          figure.classList.remove('resizing')
        }

        // 내용 변경 이벤트 트리거
        if (editorRef.current) {
          const event = new Event('input', { bubbles: true })
          editorRef.current.dispatchEvent(event)
        }
      }

      isResizing = false
      resizeTarget = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    const handleImageLoad = (e: Event) => {
      const img = e.target as HTMLImageElement
      if (img.getAttribute('data-resizable') === 'true') {
        createResizeHandle(img)
      }
    }

    // 기존 이미지에 핸들 추가
    const images = editorRef.current.querySelectorAll(
      'img[data-resizable="true"]',
    )
    images.forEach((img) => {
      const imgElement = img as HTMLImageElement
      if (imgElement.complete) {
        createResizeHandle(imgElement)
      } else {
        imgElement.addEventListener('load', handleImageLoad)
      }
    })

    // 새로 추가되는 이미지 감지
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement
            const images =
              element.querySelectorAll?.('img[data-resizable="true"]') || []
            images.forEach((img) => {
              const imgElement = img as HTMLImageElement
              if (imgElement.complete) {
                createResizeHandle(imgElement)
              } else {
                imgElement.addEventListener('load', handleImageLoad)
              }
            })
          }
        })
      })
    })

    observer.observe(editorRef.current, {
      childList: true,
      subtree: true,
    })

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      observer.disconnect()
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [])

  // 포맷 상태 업데이트
  const updateFormatState = useCallback(() => {
    if (!editorRef.current) return

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const node = range.commonAncestorContainer

    // 부모 요소 찾기
    let element: HTMLElement | null = null
    if (node.nodeType === Node.TEXT_NODE) {
      element = node.parentElement
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      element = node as HTMLElement
    }

    if (!element) return

    // Bold 체크
    setIsBold(
      document.queryCommandState('bold') ||
        element.closest('strong, b') !== null,
    )

    // Italic 체크
    setIsItalic(
      document.queryCommandState('italic') || element.closest('em, i') !== null,
    )

    // Strike 체크
    setIsStrike(element.closest('s, strike, del') !== null)

    // Heading 체크
    const heading = element.closest('h1, h2, h3')
    if (heading) {
      const level = parseInt(heading.tagName.charAt(1))
      setCurrentHeading(level)
    } else {
      setCurrentHeading(null)
    }

    // List 체크
    setIsBulletList(element.closest('ul') !== null)
    setIsOrderedList(element.closest('ol') !== null)

    // Code 체크
    setIsCode(element.closest('code') !== null)

    // 색상 체크
    const computedStyle = window.getComputedStyle(element)
    const color = computedStyle.color
    if (color && color !== 'rgb(0, 0, 0)' && color !== 'rgba(0, 0, 0, 0)') {
      // RGB를 HEX로 변환
      const rgb = color.match(/\d+/g)
      if (rgb && rgb.length >= 3) {
        const hex =
          '#' +
          rgb
            .slice(0, 3)
            .map((x) => {
              const hex = parseInt(x).toString(16)
              return hex.length === 1 ? '0' + hex : hex
            })
            .join('')
        setCurrentColor(hex)
      }
    } else {
      setCurrentColor('#000000')
    }
  }, [])

  // 포맷 적용
  const applyFormat = useCallback(
    (command: string, value?: string) => {
      if (!editorRef.current) return

      editorRef.current.focus()
      document.execCommand(command, false, value)
      updateFormatState()
      handleContentChange()
    },
    [updateFormatState],
  )

  // 내용 변경 핸들러
  const handleContentChange = useCallback(() => {
    if (!editorRef.current) return

    const html = editorRef.current.innerHTML
    onChange(html)
    updateFormatState()
  }, [onChange, updateFormatState])

  // 멘션 검색
  const searchMentions = useCallback(
    (query: string) => {
      if (!mentionEntities) {
        setMentionResults([])
        return
      }

      // 검색어가 없으면 결과 표시 안 함
      if (!query || query.trim() === '') {
        setMentionResults([])
        return
      }

      // 디버깅: 엔티티 데이터 확인
      console.log('🔍 멘션 검색:', {
        query,
        personsCount: mentionEntities.persons?.length || 0,
        eventsCount: mentionEntities.events?.length || 0,
        countriesCount: mentionEntities.countries?.length || 0,
      })

      const results = searchMentionEntities(query, {
        persons: mentionEntities.persons as never[],
        events: mentionEntities.events as never[],
        countries: mentionEntities.countries as never[],
        historicalCountries: mentionEntities.historicalCountries as never[],
        militaryUnits: mentionEntities.militaryUnits as never[],
      })

      console.log('📋 멘션 검색 결과:', results.length, '개')

      // 최대 30개로 제한
      setMentionResults(results.slice(0, 30))
      setMentionSelectedIndex(0)
    },
    [mentionEntities],
  )

  // 멘션 삽입
  const insertMention = useCallback(
    (item: MentionItem) => {
      if (!editorRef.current) return

      // 먼저 팝업 닫기
      setMentionPopupVisible(false)
      setMentionQuery('')
      setMentionResults([])

      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)

      // @ 기호부터 현재 커서까지의 텍스트 찾기
      let node = range.startContainer
      let textBefore = ''
      let startOffset = 0
      let parentElement: HTMLElement | null = null

      if (node.nodeType === Node.TEXT_NODE) {
        const textNode = node as Text
        const offset = range.startOffset
        textBefore = textNode.textContent?.substring(0, offset) || ''
        startOffset = offset
        parentElement = textNode.parentElement
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        parentElement = node as HTMLElement
        // 요소 노드인 경우 이전 텍스트 찾기
        const textContent = parentElement.textContent || ''
        const offset = range.startOffset
        textBefore = textContent.substring(0, offset)
      }

      const atIndex = textBefore.lastIndexOf('@')
      if (atIndex === -1) return

      // @부터 현재 위치까지 삭제할 범위 생성
      const deleteRange = document.createRange()

      if (node.nodeType === Node.TEXT_NODE) {
        const textNode = node as Text
        deleteRange.setStart(textNode, atIndex)
        deleteRange.setEnd(textNode, startOffset)
      } else {
        // 요소 노드인 경우 - 부모 요소에서 찾기
        if (parentElement) {
          const textNodes: Text[] = []
          const walker = document.createTreeWalker(
            parentElement,
            NodeFilter.SHOW_TEXT,
            null,
          )
          let textNode: Text | null
          while ((textNode = walker.nextNode() as Text | null)) {
            textNodes.push(textNode)
          }

          // @가 포함된 텍스트 노드 찾기
          for (const tn of textNodes) {
            const text = tn.textContent || ''
            const index = text.indexOf('@')
            if (index !== -1) {
              deleteRange.setStart(tn, index)
              deleteRange.setEnd(tn, text.length)
              break
            }
          }
        } else {
          return
        }
      }

      // @와 입력된 텍스트 삭제
      deleteRange.deleteContents()

      // 멘션 요소 생성
      const mentionSpan = document.createElement('span')
      mentionSpan.className = 'mention'
      mentionSpan.setAttribute('data-type', item.type)
      mentionSpan.setAttribute('data-id', item.id)
      mentionSpan.setAttribute('data-name', item.name)
      mentionSpan.setAttribute('contenteditable', 'false') // 멘션 내부 편집 방지
      mentionSpan.textContent = `@${item.name}`

      // 멘션 삽입
      deleteRange.insertNode(mentionSpan)

      // 멘션 뒤에 공백 텍스트 노드 추가 (커서 위치용)
      const parent = mentionSpan.parentNode
      if (parent) {
        // 멘션 뒤에 공백 추가
        const spaceText = document.createTextNode(' ')
        parent.insertBefore(spaceText, mentionSpan.nextSibling)

        // 커서를 공백 뒤로 이동
        const newRange = document.createRange()
        newRange.setStartAfter(spaceText)
        newRange.collapse(true)
        selection.removeAllRanges()
        selection.addRange(newRange)

        // 에디터 포커스 유지
        if (editorRef.current) {
          editorRef.current.focus()
        }
      } else {
        // 부모가 없으면 멘션 뒤에 공백 추가 후 커서 이동
        const parent = mentionSpan.parentNode as Node | null
        if (parent && parent.nodeType === Node.ELEMENT_NODE) {
          const spaceText = document.createTextNode(' ')
          const nextSibling = mentionSpan.nextSibling
          if (nextSibling) {
            parent.insertBefore(spaceText, nextSibling)
          } else {
            parent.appendChild(spaceText)
          }

          // 커서를 공백 뒤로 이동
          const newRange = document.createRange()
          newRange.setStartAfter(spaceText)
          newRange.collapse(true)
          selection.removeAllRanges()
          selection.addRange(newRange)
        } else {
          // 부모가 정말 없으면 멘션 뒤로 커서 이동
          const newRange = document.createRange()
          newRange.setStartAfter(mentionSpan)
          newRange.collapse(true)
          selection.removeAllRanges()
          selection.addRange(newRange)
        }
      }

      // 에디터 포커스 유지
      if (editorRef.current) {
        editorRef.current.focus()
      }

      // 포맷 상태 업데이트
      updateFormatState()
      handleContentChange()
    },
    [handleContentChange],
  )

  // 키 입력 핸들러
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // 멘션 팝업이 열려있을 때
      if (mentionPopupVisible) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setMentionSelectedIndex((prev) =>
            prev < mentionResults.length - 1 ? prev + 1 : 0,
          )
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setMentionSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : mentionResults.length - 1,
          )
          return
        }
        if (e.key === 'Enter') {
          e.preventDefault()
          if (mentionResults[mentionSelectedIndex]) {
            insertMention(mentionResults[mentionSelectedIndex])
          }
          return
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          setMentionPopupVisible(false)
          setMentionQuery('')
          return
        }
      }

      // 멘션 요소 내부에서는 @ 감지하지 않음
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const container = range.commonAncestorContainer
        let element: HTMLElement | null = null

        if (container.nodeType === Node.TEXT_NODE) {
          element = container.parentElement
        } else if (container.nodeType === Node.ELEMENT_NODE) {
          element = container as HTMLElement
        }

        // 멘션 요소 내부인지 확인
        if (element && element.closest('.mention')) {
          // 멘션 요소 내부에서는 팝업 닫기
          if (mentionPopupVisible) {
            setMentionPopupVisible(false)
            setMentionQuery('')
            setMentionResults([])
          }
          return // 멘션 요소 내부에서는 @ 감지하지 않음
        }

        // 멘션 요소 바로 뒤에 커서가 있는지 확인
        if (container.nodeType === Node.TEXT_NODE) {
          const textNode = container as Text
          const prevSibling = textNode.previousSibling
          if (
            prevSibling &&
            prevSibling.nodeType === Node.ELEMENT_NODE &&
            (prevSibling as HTMLElement).classList.contains('mention')
          ) {
            // 멘션 바로 뒤에 커서가 있으면 @ 감지하지 않음
            if (mentionPopupVisible) {
              setMentionPopupVisible(false)
              setMentionQuery('')
              setMentionResults([])
            }
            // 스페이스나 @ 입력 시에도 무시
            if (e.key === ' ' || e.key === '@') {
              return
            }
          }
        }

        // 멘션 요소 바로 앞에 @가 있는지 확인 (멘션 요소 내부의 @는 무시)
        if (container.nodeType === Node.TEXT_NODE) {
          const textNode = container as Text
          const text = textNode.textContent || ''
          const offset = range.startOffset
          const textBefore = text.substring(0, offset)
          const atIndex = textBefore.lastIndexOf('@')

          if (atIndex !== -1) {
            // @ 바로 뒤에 멘션 요소가 있는지 확인
            const prevSibling = textNode.previousSibling
            if (
              prevSibling &&
              prevSibling.nodeType === Node.ELEMENT_NODE &&
              (prevSibling as HTMLElement).classList.contains('mention') &&
              atIndex === 0
            ) {
              // 멘션 요소 바로 뒤에 @가 있으면 무시
              if (mentionPopupVisible) {
                setMentionPopupVisible(false)
                setMentionQuery('')
                setMentionResults([])
              }
              return
            }
          }
        }
      }

      // @ 입력 감지 및 멘션 검색
      if (mentionEntities) {
        const selection = window.getSelection()
        if (!selection || selection.rangeCount === 0) return

        const range = selection.getRangeAt(0)
        let node = range.startContainer
        let textBefore = ''

        if (node.nodeType === Node.TEXT_NODE) {
          const textNode = node as Text
          const offset = range.startOffset
          textBefore = textNode.textContent?.substring(0, offset) || ''
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          // 요소 노드인 경우 이전 텍스트 찾기
          const element = node as HTMLElement
          // 멘션 요소 내부가 아닌지 확인
          if (element.closest('.mention')) {
            return
          }
          const textContent = element.textContent || ''
          const offset = range.startOffset
          textBefore = textContent.substring(0, offset)
        }

        // @ 찾기
        const atIndex = textBefore.lastIndexOf('@')

        if (atIndex !== -1) {
          // @와 커서 사이에 공백이나 특수문자가 있는지 확인
          const textAfterAt = textBefore.substring(atIndex + 1)
          const hasSpaceOrSpecial = /[\s\n\r<>]/.test(textAfterAt)

          // @ 바로 뒤에 멘션 요소가 있는지 확인
          let hasMentionAfter = false
          if (node.nodeType === Node.TEXT_NODE) {
            const textNode = node as Text
            const parent = textNode.parentElement
            if (parent) {
              // 현재 텍스트 노드의 이전 형제 요소들 확인
              let currentNode: Node | null = textNode
              while (currentNode && currentNode !== parent) {
                const prevSibling = currentNode.previousSibling
                if (
                  prevSibling &&
                  prevSibling.nodeType === Node.ELEMENT_NODE &&
                  (prevSibling as HTMLElement).classList.contains('mention')
                ) {
                  hasMentionAfter = true
                  break
                }
                currentNode = currentNode.parentNode
              }

              // 직접 이전 형제 확인
              if (!hasMentionAfter) {
                const directPrevSibling = textNode.previousSibling
                if (
                  directPrevSibling &&
                  directPrevSibling.nodeType === Node.ELEMENT_NODE &&
                  (directPrevSibling as HTMLElement).classList.contains(
                    'mention',
                  )
                ) {
                  hasMentionAfter = true
                }
              }
            }
          }

          if (
            !hasSpaceOrSpecial &&
            !hasMentionAfter &&
            textAfterAt.length < 50
          ) {
            // 검색어가 너무 길면 무시
            const query = textAfterAt
            mentionRangeRef.current = range.cloneRange()

            // 커서 위치 계산 (정확한 위치)
            const rect = range.getBoundingClientRect()

            // 커서가 보이지 않거나 유효하지 않으면 팝업 표시하지 않음
            if (
              (rect.width === 0 && rect.height === 0) ||
              rect.top === 0 ||
              rect.left === 0
            ) {
              return
            }

            // 에디터 컨테이너의 위치 확인
            const editorRect = editorRef.current?.getBoundingClientRect()
            if (!editorRect) return

            // 팝업 위치 계산 (커서 위치 기준)
            const popupTop = rect.bottom + window.scrollY + 8
            const popupLeft = rect.left + window.scrollX

            // 화면 밖으로 나가지 않도록 조정
            const maxLeft = window.innerWidth - 320 // 팝업 최소 너비 고려
            const adjustedLeft = Math.max(8, Math.min(popupLeft, maxLeft))

            // 유효한 위치인지 확인
            if (popupTop > 0 && adjustedLeft > 0) {
              setMentionPopupPosition({
                top: popupTop,
                left: adjustedLeft,
              })
            } else {
              // 위치가 유효하지 않으면 팝업 표시하지 않음
              return
            }

            setMentionPopupVisible(true)
            setMentionQuery(query)
            searchMentions(query)
          } else if (mentionPopupVisible) {
            setMentionPopupVisible(false)
            setMentionQuery('')
            setMentionResults([])
          }
        } else if (
          mentionPopupVisible &&
          e.key !== 'ArrowDown' &&
          e.key !== 'ArrowUp' &&
          e.key !== 'Enter' &&
          e.key !== 'Escape' &&
          e.key !== 'Tab'
        ) {
          // @가 없으면 팝업 닫기 (탭 키는 제외)
          setMentionPopupVisible(false)
          setMentionQuery('')
          setMentionResults([])
        }
      }

      // 단축키
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'b') {
          e.preventDefault()
          applyFormat('bold')
          return
        }
        if (e.key === 'i') {
          e.preventDefault()
          applyFormat('italic')
          return
        }
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault()
          applyFormat('undo')
          return
        }
        if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
          e.preventDefault()
          applyFormat('redo')
          return
        }
      }
    },
    [
      mentionPopupVisible,
      mentionResults,
      mentionSelectedIndex,
      mentionEntities,
      insertMention,
      searchMentions,
      applyFormat,
    ],
  )

  // 이미지 업로드
  const handleImageUpload = useCallback(async () => {
    if (!onImageUpload) return

    const input = document.createElement('input')
    input.setAttribute('type', 'file')
    input.setAttribute('accept', 'image/*')
    input.click()

    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return

      if (file.size > 10 * 1024 * 1024) {
        alert('이미지 크기는 10MB 이하여야 합니다.')
        return
      }

      try {
        const imageUrl = await onImageUpload(file)
        if (!editorRef.current) return

        // 현재 커서 위치 저장
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          savedImageInsertRangeRef.current = selection
            .getRangeAt(0)
            .cloneRange()
        } else {
          // 선택이 없으면 에디터 끝에 커서 위치 설정
          const range = document.createRange()
          range.selectNodeContents(editorRef.current)
          range.collapse(false) // 끝으로 이동
          savedImageInsertRangeRef.current = range
        }

        // 이미지 URL을 저장하고 모달 표시
        setPendingImageUrl(imageUrl)
        setImageCaptionInput('')
        setImageCaptionModalVisible(true)
      } catch (error) {
        console.error('이미지 업로드 실패:', error)
        alert('이미지 업로드에 실패했습니다.')
      }
    }
  }, [onImageUpload])

  // 이미지 설명 모달에서 확인 버튼 클릭
  const handleImageCaptionConfirm = useCallback(() => {
    if (!pendingImageUrl || !editorRef.current) return

    const caption = imageCaptionInput.trim()

    editorRef.current.focus()

    // 이미지 컨테이너 생성
    const imageContainer = document.createElement('figure')
    imageContainer.style.margin = '16px 0'
    imageContainer.style.textAlign = 'center'

    const img = document.createElement('img')
    img.src = pendingImageUrl
    img.style.borderRadius = '12px'
    img.style.display = 'block'
    img.style.margin = '0 auto'
    img.style.cursor = 'pointer'
    img.style.userSelect = 'none'
    img.setAttribute('contenteditable', 'false')
    img.setAttribute('draggable', 'false') // 드래그 앤 드롭 방지

    // 이미지 드래그 이벤트 방지
    img.addEventListener('dragstart', (e) => {
      e.preventDefault()
      e.stopPropagation()
      return false
    })

    // 이미지 크기 조절을 위한 속성 추가
    img.setAttribute('data-resizable', 'true')
    img.style.maxWidth = '100%'
    img.style.height = 'auto'
    img.style.width = 'auto'
    img.title = '클릭하여 크기 조절'

    imageContainer.appendChild(img)

    // 설명이 있으면 추가
    if (caption) {
      const figcaption = document.createElement('figcaption')
      figcaption.style.marginTop = '8px'
      figcaption.style.fontSize = '13px'
      figcaption.style.color = '#64748b'
      figcaption.style.fontStyle = 'italic'
      figcaption.style.textAlign = 'center'
      figcaption.textContent = caption
      imageContainer.appendChild(figcaption)
    }

    // 저장된 커서 위치에 이미지 삽입
    let insertRange: Range | null = null

    if (savedImageInsertRangeRef.current) {
      // 저장된 커서 위치 사용
      insertRange = savedImageInsertRangeRef.current
    } else {
      // 저장된 위치가 없으면 현재 커서 위치 사용
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        insertRange = selection.getRangeAt(0)
      }
    }

    if (insertRange) {
      // 저장된 또는 현재 커서 위치에 이미지 삽입
      try {
        insertRange.insertNode(imageContainer)

        // 이미지 컨테이너 뒤에 빈 텍스트 노드 추가 (커서 위치용)
        const spaceText = document.createTextNode('\u200B') // Zero-width space
        const parent = imageContainer.parentNode
        if (parent) {
          parent.insertBefore(spaceText, imageContainer.nextSibling)
        }

        // 커서를 빈 텍스트 노드로 이동
        const newRange = document.createRange()
        newRange.setStart(spaceText, 0)
        newRange.collapse(true)
        const selection = window.getSelection()
        if (selection) {
          selection.removeAllRanges()
          selection.addRange(newRange)
        }
      } catch (error) {
        // Range가 유효하지 않으면 에디터 끝에 추가
        console.warn('이미지 삽입 위치 복원 실패, 에디터 끝에 추가:', error)
        editorRef.current.appendChild(imageContainer)
        const spaceText = document.createTextNode('\u200B')
        editorRef.current.appendChild(spaceText)
        const newRange = document.createRange()
        newRange.setStart(spaceText, 0)
        newRange.collapse(true)
        const selection = window.getSelection()
        if (selection) {
          selection.removeAllRanges()
          selection.addRange(newRange)
        }
      }
    } else {
      // 선택이 없으면 에디터 끝에 추가
      editorRef.current.appendChild(imageContainer)

      // 이미지 컨테이너 뒤에 빈 텍스트 노드 추가
      const spaceText = document.createTextNode('\u200B')
      editorRef.current.appendChild(spaceText)

      // 커서를 빈 텍스트 노드로 이동
      const newRange = document.createRange()
      newRange.setStart(spaceText, 0)
      newRange.collapse(true)
      const newSelection = window.getSelection()
      if (newSelection) {
        newSelection.removeAllRanges()
        newSelection.addRange(newRange)
      }
    }

    // 저장된 커서 위치 초기화
    savedImageInsertRangeRef.current = null

    // 모든 포맷 제거 (이탤리체, 정렬 등)
    document.execCommand('removeFormat', false)

    // 포맷 상태 업데이트
    updateFormatState()
    handleContentChange()

    // 모달 닫기
    setImageCaptionModalVisible(false)
    setImageCaptionInput('')
    setPendingImageUrl(null)

    // 에디터 포커스 유지
    if (editorRef.current) {
      editorRef.current.focus()
    }
  }, [pendingImageUrl, imageCaptionInput, handleContentChange])

  // 이미지 설명 모달 닫기
  const handleImageCaptionCancel = useCallback(() => {
    setImageCaptionModalVisible(false)
    setImageCaptionInput('')
    setPendingImageUrl(null)
  }, [])

  // 엔티티 링크 검색
  const searchEntityLinks = useCallback(
    (query: string) => {
      if (!mentionEntities) {
        setEntityLinkResults([])
        return
      }

      const results = searchMentionEntities(query, {
        persons: mentionEntities.persons as never[],
        events: mentionEntities.events as never[],
        countries: mentionEntities.countries as never[],
        historicalCountries: mentionEntities.historicalCountries as never[],
        militaryUnits: mentionEntities.militaryUnits as never[],
      })

      setEntityLinkResults(results.slice(0, 30))
      setEntityLinkSelectedIndex(0)
    },
    [mentionEntities],
  )

  // 엔티티 링크 모달 열기
  const handleOpenEntityLinkModal = useCallback(() => {
    setContextMenuVisible(false)
    setEntityLinkModalVisible(true)
    setEntityLinkQuery('')
    searchEntityLinks('')
  }, [searchEntityLinks])

  // 엔티티 링크 모달 닫기
  const handleCloseEntityLinkModal = useCallback(() => {
    setEntityLinkModalVisible(false)
    setEntityLinkQuery('')
    setEntityLinkResults([])
  }, [])

  // 엔티티 링크 삽입
  const insertEntityLink = useCallback(
    (item: MentionItem) => {
      if (!selectedTextRange || !editorRef.current) return

      const range = selectedTextRange.cloneRange()

      // 선택된 텍스트를 엔티티 링크로 감싸기
      const entitySpan = document.createElement('span')
      entitySpan.className = 'entity-link'
      entitySpan.setAttribute('data-entity-type', item.type)
      entitySpan.setAttribute('data-entity-id', item.id)
      entitySpan.setAttribute('data-entity-name', item.name)
      entitySpan.setAttribute(
        'title',
        `${item.name} (${MENTION_TYPE_CONFIG[item.type]?.label || item.type})`,
      )
      entitySpan.setAttribute('contenteditable', 'false') // 엔티티 링크 내부 편집 방지

      // 선택된 텍스트의 내용을 가져오기
      const fragment = range.extractContents()
      entitySpan.appendChild(fragment)

      // 엔티티 링크 삽입
      range.insertNode(entitySpan)

      // 엔티티 링크 뒤에 공백 텍스트 노드 추가 (커서 위치용)
      const parent = entitySpan.parentNode
      if (parent) {
        // 공백 텍스트 노드 생성 (Zero-width space + 일반 공백)
        const spaceText = document.createTextNode('\u00A0') // Non-breaking space
        parent.insertBefore(spaceText, entitySpan.nextSibling)

        // 커서를 공백 텍스트 노드의 끝으로 이동
        const newRange = document.createRange()
        newRange.setStart(spaceText, 1) // 공백 뒤
        newRange.collapse(true)
        const selection = window.getSelection()
        if (selection) {
          selection.removeAllRanges()
          selection.addRange(newRange)
        }

        // 포커스를 에디터로 이동
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.focus()
            // 다시 한 번 커서 위치 확인
            const sel = window.getSelection()
            if (sel && sel.rangeCount > 0) {
              const r = sel.getRangeAt(0)
              // 엔티티 링크 내부에 있는지 확인
              let node = r.startContainer
              if (node.nodeType === Node.TEXT_NODE) {
                node = node.parentElement || node
              }
              if ((node as HTMLElement).closest?.('.entity-link')) {
                // 엔티티 링크 내부에 있으면 밖으로 이동
                const entityLink = (node as HTMLElement).closest('.entity-link')
                if (entityLink && entityLink.nextSibling) {
                  const moveRange = document.createRange()
                  if (entityLink.nextSibling.nodeType === Node.TEXT_NODE) {
                    moveRange.setStart(entityLink.nextSibling, 1)
                  } else {
                    moveRange.setStartAfter(entityLink.nextSibling)
                  }
                  moveRange.collapse(true)
                  sel.removeAllRanges()
                  sel.addRange(moveRange)
                }
              }
            }
          }
        }, 10)
      }

      // 포맷 상태 업데이트
      updateFormatState()
      handleContentChange()

      // 모달 닫기
      handleCloseEntityLinkModal()
      setSelectedText('')
      setSelectedTextRange(null)
    },
    [
      selectedTextRange,
      handleContentChange,
      handleCloseEntityLinkModal,
      updateFormatState,
    ],
  )

  // 마우스 우클릭 핸들러
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (selectedText.length > 0) {
        e.preventDefault()
        setContextMenuPosition({
          top: e.clientY,
          left: e.clientX,
        })
        setContextMenuVisible(true)
      }
    },
    [selectedText],
  )

  // 이미지 설명 모달이 열릴 때 입력 필드에 포커스
  useEffect(() => {
    if (imageCaptionModalVisible && imageCaptionInputRef.current) {
      setTimeout(() => {
        imageCaptionInputRef.current?.focus()
      }, 100)
    }
  }, [imageCaptionModalVisible])

  // 링크 삽입
  const handleSetLink = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const selectedText = range.toString()

    // 기존 링크 확인
    let existingLink: HTMLAnchorElement | null = null
    const container = range.commonAncestorContainer
    if (container.nodeType === Node.ELEMENT_NODE) {
      existingLink = (container as Element).closest('a') as HTMLAnchorElement
    } else {
      existingLink = container.parentElement?.closest('a') as HTMLAnchorElement
    }

    const previousUrl = existingLink?.href || ''
    const url = window.prompt('링크 URL을 입력하세요:', previousUrl)

    if (url === null) return

    if (!url) {
      // 링크 제거
      if (existingLink) {
        const parent = existingLink.parentNode
        if (parent) {
          while (existingLink.firstChild) {
            parent.insertBefore(existingLink.firstChild, existingLink)
          }
          parent.removeChild(existingLink)
        }
        handleContentChange()
      }
      return
    }

    // 링크 생성/수정
    if (existingLink) {
      existingLink.href = url
    } else if (selectedText) {
      const link = document.createElement('a')
      link.href = url
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      link.textContent = selectedText
      range.deleteContents()
      range.insertNode(link)
    } else {
      const link = document.createElement('a')
      link.href = url
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      link.textContent = url
      range.insertNode(link)
    }

    handleContentChange()
  }, [handleContentChange])

  // Heading 적용
  const applyHeading = useCallback(
    (level: number | null) => {
      if (!editorRef.current) return

      editorRef.current.focus()
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)
      const container = range.commonAncestorContainer

      let element: HTMLElement | null = null
      if (container.nodeType === Node.TEXT_NODE) {
        element = container.parentElement
      } else if (container.nodeType === Node.ELEMENT_NODE) {
        element = container as HTMLElement
      }

      if (!element) return

      // 기존 heading 제거
      const existingHeading = element.closest('h1, h2, h3')
      if (existingHeading) {
        const parent = existingHeading.parentNode
        if (parent) {
          const p = document.createElement('p')
          while (existingHeading.firstChild) {
            p.appendChild(existingHeading.firstChild)
          }
          parent.replaceChild(p, existingHeading)
        }
      }

      // 새 heading 적용
      if (level) {
        const heading = document.createElement(`h${level}`)
        const text = range.toString() || '제목'
        heading.textContent = text
        range.deleteContents()
        range.insertNode(heading)

        const newRange = document.createRange()
        newRange.selectNodeContents(heading)
        newRange.collapse(false)
        selection.removeAllRanges()
        selection.addRange(newRange)
      }

      handleContentChange()
      updateFormatState()
    },
    [handleContentChange, updateFormatState],
  )

  return (
    <EditorContainer>
      <Toolbar>
        <ToolbarButton
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            playClickSound()
            applyFormat('bold')
          }}
          $active={isBold}
          title="굵게 (Ctrl+B)"
        >
          <FiBold />
        </ToolbarButton>
        <ToolbarButton
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            playClickSound()
            applyFormat('italic')
          }}
          $active={isItalic}
          title="기울임 (Ctrl+I)"
        >
          <FiItalic />
        </ToolbarButton>
        <ToolbarButton
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            playClickSound()
            applyFormat('strikeThrough')
          }}
          $active={isStrike}
          title="취소선"
        >
          <FiMinus />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            playClickSound()
            applyHeading(1)
          }}
          $active={currentHeading === 1}
          title="제목 1"
        >
          <FiType />
          <span style={{ fontSize: '10px', marginLeft: '2px' }}>1</span>
        </ToolbarButton>
        <ToolbarButton
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            playClickSound()
            applyHeading(2)
          }}
          $active={currentHeading === 2}
          title="제목 2"
        >
          <FiType />
          <span style={{ fontSize: '10px', marginLeft: '2px' }}>2</span>
        </ToolbarButton>
        <ToolbarButton
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            playClickSound()
            applyHeading(3)
          }}
          $active={currentHeading === 3}
          title="제목 3"
        >
          <FiType />
          <span style={{ fontSize: '10px', marginLeft: '2px' }}>3</span>
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            playClickSound()
            applyFormat('insertUnorderedList')
          }}
          $active={isBulletList}
          title="순서 없는 목록"
        >
          <FiList />
        </ToolbarButton>
        <ToolbarButton
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            playClickSound()
            applyFormat('insertOrderedList')
          }}
          $active={isOrderedList}
          title="순서 있는 목록"
        >
          <FiList style={{ transform: 'rotate(90deg)' }} />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            playClickSound()
            handleSetLink()
          }}
          title="링크 삽입/편집"
        >
          <FiLink />
        </ToolbarButton>
        <ToolbarButton
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            playClickSound()
            if (selectedText.length > 0) {
              handleOpenEntityLinkModal()
            } else {
              alert('먼저 텍스트를 선택해주세요.')
            }
          }}
          disabled={selectedText.length === 0}
          title="엔티티 연결 (텍스트 선택 후 클릭)"
          style={{
            background:
              selectedText.length > 0
                ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(251, 191, 36, 0.08))'
                : undefined,
            borderColor:
              selectedText.length > 0 ? 'rgba(245, 158, 11, 0.3)' : undefined,
          }}
        >
          <FiLink style={{ transform: 'rotate(-45deg)' }} />
        </ToolbarButton>
        <ToolbarButton
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            playClickSound()
            handleImageUpload()
          }}
          disabled={!onImageUpload}
          title="이미지 삽입"
        >
          <FiImage />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            playClickSound()
            applyFormat('formatCode')
          }}
          $active={isCode}
          title="인라인 코드"
        >
          <FiCode />
        </ToolbarButton>
        <ToolbarDivider />
        <div style={{ position: 'relative' }}>
          <ToolbarButton
            ref={colorPickerButtonRef}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation()
              playClickSound()
              setColorPickerVisible(!colorPickerVisible)
            }}
            title="텍스트 색상"
            style={{
              background: colorPickerVisible
                ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.1))'
                : undefined,
            }}
          >
            <FiDroplet style={{ color: currentColor }} />
          </ToolbarButton>
        </div>
        <ToolbarDivider />
        <ToolbarButton
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            playClickSound()
            if (!editorRef.current) return
            editorRef.current.focus()
            document.execCommand('insertHorizontalRule', false)
            handleContentChange()
          }}
          title="수평선 삽입"
        >
          <FiMoreHorizontal />
        </ToolbarButton>
      </Toolbar>
      <EditorWrapper>
        {showTitle && (
          <>
            <TitleInput
              ref={titleInputRef}
              type="text"
              value={internalTitle}
              onChange={(e) => {
                const newValue = e.target.value
                setInternalTitle(newValue)
                if (onTitleChange) {
                  onTitleChange(newValue)
                }
              }}
              placeholder={titlePlaceholder}
            />
            <TitleDivider />
          </>
        )}
        <EditorContent
          ref={editorRef}
          contentEditable
          data-placeholder={placeholder}
          onInput={handleContentChange}
          onKeyDown={handleKeyDown}
          onMouseUp={updateFormatState}
          onKeyUp={updateFormatState}
          onContextMenu={handleContextMenu}
          $hasTitle={showTitle}
        />
      </EditorWrapper>
      {/* 색상 선택기 - Portal로 body에 렌더링 */}
      {colorPickerVisible &&
        colorPickerButtonRef.current &&
        (() => {
          const rect = colorPickerButtonRef.current!.getBoundingClientRect()
          return (
            <>
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 99998,
                  background: 'transparent',
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  setColorPickerVisible(false)
                }}
              />
              <div
                style={{
                  position: 'fixed',
                  top: `${rect.bottom + window.scrollY + 8}px`,
                  left: `${rect.left + window.scrollX}px`,
                  zIndex: 99999,
                }}
              >
                <ColorPickerDropdown>
                  <ColorPickerGrid>
                    {[
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
                    ].map((color) => (
                      <ColorPickerItem
                        key={color}
                        $color={color}
                        $selected={currentColor === color}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          playClickSound()
                          if (!editorRef.current) return
                          editorRef.current.focus()
                          document.execCommand('foreColor', false, color)
                          setCurrentColor(color)
                          setColorPickerVisible(false)
                          updateFormatState()
                          handleContentChange()
                        }}
                        title={color}
                      />
                    ))}
                  </ColorPickerGrid>
                  <ColorPickerInputWrapper>
                    <input
                      type="color"
                      value={currentColor}
                      onMouseDown={(e) => e.preventDefault()}
                      onChange={(e) => {
                        playClickSound()
                        const color = e.target.value
                        if (!editorRef.current) return
                        editorRef.current.focus()
                        document.execCommand('foreColor', false, color)
                        setCurrentColor(color)
                        updateFormatState()
                        handleContentChange()
                      }}
                      style={{
                        width: '100%',
                        height: '32px',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    />
                  </ColorPickerInputWrapper>
                </ColorPickerDropdown>
              </div>
            </>
          )
        })()}
      {mentionPopupVisible && (
        <MentionPopup
          $visible={mentionPopupVisible}
          $top={mentionPopupPosition.top}
          $left={mentionPopupPosition.left}
        >
          {mentionQuery.trim() === '' ? (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: '13px',
              }}
            >
              검색어를 입력하세요
              <div
                style={{ fontSize: '11px', marginTop: '8px', color: '#cbd5e1' }}
              >
                예: @처칠, @영국, @2차세계대전
              </div>
            </div>
          ) : mentionResults.length === 0 ? (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: '13px',
              }}
            >
              검색 결과가 없습니다
            </div>
          ) : (
            (() => {
              // 타입별로 그룹화
              const grouped: Record<string, MentionItem[]> = {}
              mentionResults.forEach((item) => {
                if (!grouped[item.type]) {
                  grouped[item.type] = []
                }
                grouped[item.type].push(item)
              })

              let globalIndex = 0
              return Object.entries(grouped).map(([type, items]) => {
                const typeConfig =
                  MENTION_TYPE_CONFIG[type as keyof typeof MENTION_TYPE_CONFIG]
                const startIndex = globalIndex
                globalIndex += items.length

                return (
                  <div key={type} style={{ marginBottom: '12px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        background:
                          'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.05))',
                        borderRadius: '8px',
                        marginBottom: '4px',
                      }}
                    >
                      {typeConfig && typeConfig.icon && (
                        <span style={{ color: typeConfig.color }}>
                          {React.createElement(typeConfig.icon, { size: 14 })}
                        </span>
                      )}
                      <span style={{ color: '#64748b' }}>
                        {typeConfig?.label || type}
                      </span>
                      <span
                        style={{
                          marginLeft: 'auto',
                          fontSize: '10px',
                          color: '#94a3b8',
                        }}
                      >
                        {items.length}
                      </span>
                    </div>
                    {items.map((item, itemIndex) => {
                      const currentIndex = startIndex + itemIndex
                      return (
                        <div
                          key={`${item.type}-${item.id}`}
                          style={{
                            padding: '12px 14px',
                            cursor: 'pointer',
                            background:
                              currentIndex === mentionSelectedIndex
                                ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.08))'
                                : 'transparent',
                            borderRadius: '10px',
                            marginBottom: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            border:
                              currentIndex === mentionSelectedIndex
                                ? '1px solid rgba(99, 102, 241, 0.3)'
                                : '1px solid transparent',
                          }}
                          onMouseEnter={() =>
                            setMentionSelectedIndex(currentIndex)
                          }
                          onClick={() => {
                            playClickSound()
                            insertMention(item)
                          }}
                        >
                          {item.icon && (
                            <span style={{ color: item.color, flexShrink: 0 }}>
                              {React.createElement(item.icon, {
                                size: 18,
                              })}
                            </span>
                          )}
                          <span
                            style={{
                              flex: 1,
                              fontWeight: 500,
                              fontSize: '14px',
                              color: '#0f172a',
                            }}
                          >
                            {item.name}
                          </span>
                          {item.subtitle && (
                            <span
                              style={{ fontSize: '12px', color: '#64748b' }}
                            >
                              {item.subtitle}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })
            })()
          )}
        </MentionPopup>
      )}

      {/* 컨텍스트 메뉴 */}
      <ContextMenu
        $visible={contextMenuVisible}
        $top={contextMenuPosition.top}
        $left={contextMenuPosition.left}
      >
        <ContextMenuItem
          onClick={() => {
            playClickSound()
            handleOpenEntityLinkModal()
          }}
        >
          <FiLink />
          엔티티 연결
        </ContextMenuItem>
      </ContextMenu>

      {/* 이미지 설명 입력 모달 */}
      <ImageCaptionModalOverlay
        $visible={imageCaptionModalVisible}
        onClick={handleImageCaptionCancel}
      >
        <ImageCaptionModal onClick={(e) => e.stopPropagation()}>
          <ImageCaptionModalHeader>
            <ImageCaptionModalTitle>이미지 설명 추가</ImageCaptionModalTitle>
            <ImageCaptionModalClose onClick={handleImageCaptionCancel}>
              <FiX size={20} />
            </ImageCaptionModalClose>
          </ImageCaptionModalHeader>
          <ImageCaptionModalContent>
            <ImageCaptionInput
              ref={imageCaptionInputRef}
              type="text"
              placeholder="이미지 설명을 입력하세요 (선택사항)"
              value={imageCaptionInput}
              onChange={(e) => setImageCaptionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleImageCaptionConfirm()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  handleImageCaptionCancel()
                }
              }}
            />
          </ImageCaptionModalContent>
          <ImageCaptionModalFooter>
            <ImageCaptionButton
              onClick={() => {
                playClickSound()
                handleImageCaptionCancel()
              }}
            >
              취소
            </ImageCaptionButton>
            <ImageCaptionButton
              $primary
              onClick={() => {
                playClickSound()
                handleImageCaptionConfirm()
              }}
            >
              확인
            </ImageCaptionButton>
          </ImageCaptionModalFooter>
        </ImageCaptionModal>
      </ImageCaptionModalOverlay>

      {/* 엔티티 링크 모달 */}
      <EntityLinkModalOverlay
        $visible={entityLinkModalVisible}
        onClick={handleCloseEntityLinkModal}
      >
        <EntityLinkModal onClick={(e) => e.stopPropagation()}>
          <EntityLinkModalHeader>
            <EntityLinkModalTitle>엔티티 연결</EntityLinkModalTitle>
            <EntityLinkModalClose onClick={handleCloseEntityLinkModal}>
              <FiX size={20} />
            </EntityLinkModalClose>
          </EntityLinkModalHeader>
          <EntityLinkModalContent>
            <EntityLinkSelectedText>
              <strong>선택한 텍스트</strong>"{selectedText}"
            </EntityLinkSelectedText>

            <EntityLinkSearchInput
              type="text"
              placeholder="연결할 엔티티 검색 (인물, 사건, 국가 등...)"
              value={entityLinkQuery}
              onChange={(e) => {
                const query = e.target.value
                setEntityLinkQuery(query)
                searchEntityLinks(query)
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setEntityLinkSelectedIndex((prev) =>
                    prev < entityLinkResults.length - 1 ? prev + 1 : 0,
                  )
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setEntityLinkSelectedIndex((prev) =>
                    prev > 0 ? prev - 1 : entityLinkResults.length - 1,
                  )
                } else if (e.key === 'Enter') {
                  e.preventDefault()
                  if (entityLinkResults[entityLinkSelectedIndex]) {
                    insertEntityLink(entityLinkResults[entityLinkSelectedIndex])
                  }
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  handleCloseEntityLinkModal()
                }
              }}
              autoFocus
            />

            <EntityLinkResultsList>
              {entityLinkQuery.trim() === '' &&
              entityLinkResults.length === 0 ? (
                <div
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontSize: '13px',
                  }}
                >
                  검색어를 입력하여 연결할 엔티티를 찾으세요
                  <div
                    style={{
                      fontSize: '11px',
                      marginTop: '8px',
                      color: '#cbd5e1',
                    }}
                  >
                    예: 처칠, 영국, 2차세계대전
                  </div>
                </div>
              ) : entityLinkResults.length === 0 ? (
                <div
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontSize: '13px',
                  }}
                >
                  검색 결과가 없습니다
                </div>
              ) : (
                (() => {
                  // 타입별로 그룹화
                  const grouped: Record<string, MentionItem[]> = {}
                  entityLinkResults.forEach((item) => {
                    if (!grouped[item.type]) {
                      grouped[item.type] = []
                    }
                    grouped[item.type].push(item)
                  })

                  let globalIndex = 0
                  return Object.entries(grouped).map(([type, items]) => {
                    const typeConfig =
                      MENTION_TYPE_CONFIG[
                        type as keyof typeof MENTION_TYPE_CONFIG
                      ]
                    const startIndex = globalIndex
                    globalIndex += items.length

                    return (
                      <div key={type} style={{ marginBottom: '12px' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#64748b',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            background:
                              'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.05))',
                            borderRadius: '8px',
                            marginBottom: '4px',
                          }}
                        >
                          {typeConfig && typeConfig.icon && (
                            <span style={{ color: typeConfig.color }}>
                              {React.createElement(typeConfig.icon, {
                                size: 14,
                              })}
                            </span>
                          )}
                          <span style={{ color: '#64748b' }}>
                            {typeConfig?.label || type}
                          </span>
                          <span
                            style={{
                              marginLeft: 'auto',
                              fontSize: '10px',
                              color: '#94a3b8',
                            }}
                          >
                            {items.length}
                          </span>
                        </div>
                        {items.map((item, itemIndex) => {
                          const currentIndex = startIndex + itemIndex
                          return (
                            <div
                              key={`${item.type}-${item.id}`}
                              style={{
                                padding: '12px 14px',
                                cursor: 'pointer',
                                background:
                                  currentIndex === entityLinkSelectedIndex
                                    ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(251, 191, 36, 0.08))'
                                    : 'transparent',
                                borderRadius: '10px',
                                marginBottom: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                border:
                                  currentIndex === entityLinkSelectedIndex
                                    ? '1px solid rgba(245, 158, 11, 0.3)'
                                    : '1px solid transparent',
                              }}
                              onMouseEnter={() =>
                                setEntityLinkSelectedIndex(currentIndex)
                              }
                              onClick={() => {
                                playClickSound()
                                insertEntityLink(item)
                              }}
                            >
                              {item.icon && (
                                <span
                                  style={{ color: item.color, flexShrink: 0 }}
                                >
                                  {React.createElement(item.icon, {
                                    size: 18,
                                  })}
                                </span>
                              )}
                              <span
                                style={{
                                  flex: 1,
                                  fontWeight: 500,
                                  fontSize: '14px',
                                  color: '#0f172a',
                                }}
                              >
                                {item.name}
                              </span>
                              {item.subtitle && (
                                <span
                                  style={{ fontSize: '12px', color: '#64748b' }}
                                >
                                  {item.subtitle}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })
                })()
              )}
            </EntityLinkResultsList>
          </EntityLinkModalContent>
        </EntityLinkModal>
      </EntityLinkModalOverlay>
    </EditorContainer>
  )
}
