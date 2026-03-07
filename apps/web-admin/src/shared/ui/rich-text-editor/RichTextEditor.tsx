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
import {
  createGlossaryTerm,
  getGlossaryTermById,
  getGlossaryTerms,
  updateGlossaryTerm,
  type GlossaryTermDto,
} from '@/shared/api/glossary'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'

// 멘션 엔티티 props 타입
export interface MentionExtensionProps {
  persons?: unknown[]
  events?: unknown[]
  countries?: unknown[]
  historicalCountries?: unknown[]
  militaryUnits?: unknown[]
  dynasties?: unknown[]
}

/* 행정조직 폼 스타일: 테두리 #e5e7eb, 포커스 인디고 */
const EditorContainer = styled.div`
  position: relative;
  border-radius: 20px;
  overflow: visible;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background: #fff;
  width: 100%;

  &:focus-within {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
`

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 12px 16px;
  background: #f1f5f9;
  border-bottom: 1px solid #e5e7eb;
  border-radius: 20px 20px 0 0;
  overflow: visible;
  width: 100%;
`

const ToolbarButton = styled.button.attrs({ type: 'button' })<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border: none;
  border-radius: 10px;
  background: ${({ $active }) => ($active ? '#4f46e5' : 'transparent')};
  color: ${({ $active }) => ($active ? '#fff' : '#64748b')};
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  position: relative;
  user-select: none;

  &:hover {
    background: ${({ $active }) => ($active ? '#4338ca' : 'rgba(79, 70, 229, 0.1)')};
    color: ${({ $active }) => ($active ? '#fff' : '#4f46e5')};
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
  background: #e2e8f0;
  margin: 5px 4px;
  align-self: center;
`

const EditorWrapper = styled.div`
  background: #fff;
  position: relative;
  border-radius: 0 0 20px 20px;
  overflow: visible;
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
  background: #e5e7eb;
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
    color: #4f46e5;
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
    color: #4f46e5;
    text-decoration: none;
    border-bottom: 1px solid rgba(79, 70, 229, 0.3);
    cursor: pointer;
    transition: color 0.2s ease, border-color 0.2s ease;
    font-weight: 500;

    &:hover {
      color: #4338ca;
      border-bottom-color: #4f46e5;
      background: rgba(79, 70, 229, 0.04);
    }
  }

  blockquote {
    border-left: 4px solid #4f46e5;
    padding: 16px 24px;
    margin: 20px 0;
    background: rgba(79, 70, 229, 0.04);
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
      color: rgba(79, 70, 229, 0.12);
      font-family: Georgia, serif;
      line-height: 1;
    }
  }

  code {
    background: rgba(79, 70, 229, 0.08);
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 13px;
    font-family:
      'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Courier New', monospace;
    color: #4f46e5;
    font-weight: 500;
    border: 1px solid rgba(79, 70, 229, 0.15);
  }

  pre {
    background: #f8fafc;
    padding: 16px;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    overflow-x: auto;
    margin: 16px 0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

    code {
      background: transparent;
      padding: 0;
      color: #0f172a;
      border: none;
    }
  }

  hr {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 24px 0;
    height: 1px;
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
      background: #4f46e5;
      border: 2px solid #fff;
      border-radius: 50%;
      cursor: nwse-resize;
      z-index: 10;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
      transition: transform 0.2s ease;
      opacity: 0;
      pointer-events: none;

      &:hover {
        transform: scale(1.2);
        box-shadow: 0 2px 8px rgba(79, 70, 229, 0.35);
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

  /* 멘션 스타일 - 타입별 색상 팔레트 */
  .mention {
    padding: 2px 10px;
    border-radius: 6px;
    font-weight: 500;
    font-size: 13px;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: rgba(99, 102, 241, 0.1);
    color: #4338ca !important;

    &:hover {
      background: rgba(99, 102, 241, 0.18);
    }

    &[data-type='person'] {
      background: rgba(99, 102, 241, 0.1);
      color: #4338ca !important;
      &:hover { background: rgba(99, 102, 241, 0.18); }
    }
    &[data-type='dynasty'] {
      background: rgba(124, 58, 237, 0.1);
      color: #6d28d9 !important;
      &:hover { background: rgba(124, 58, 237, 0.18); }
    }
    &[data-type='event'] {
      background: rgba(217, 119, 6, 0.1);
      color: #b45309 !important;
      &:hover { background: rgba(217, 119, 6, 0.18); }
    }
    &[data-type='country'] {
      background: rgba(34, 197, 94, 0.1);
      color: #15803d !important;
      &:hover { background: rgba(34, 197, 94, 0.18); }
    }
    &[data-type='historicalCountry'] {
      background: rgba(139, 92, 246, 0.1);
      color: #6d28d9 !important;
      &:hover { background: rgba(139, 92, 246, 0.18); }
    }
    &[data-type='militaryUnit'] {
      background: rgba(239, 68, 68, 0.1);
      color: #b91c1c !important;
      &:hover { background: rgba(239, 68, 68, 0.18); }
    }
  }

  /* 엔티티 링크 스타일 */
  /* 용어(문구·관직 설명) 스타일 */
  .term {
    color: #0d9488;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: help;
    padding: 0 2px;
    border-radius: 4px;
    background: rgba(13, 148, 136, 0.06);
    &:hover {
      background: rgba(13, 148, 136, 0.12);
    }
  }

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
  background: #fff;
  border-radius: 20px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
  width: 90%;
  max-width: 480px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`

const ImageCaptionModalHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const ImageCaptionModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
`

const ImageCaptionModalClose = styled.button`
  border: none;
  background: transparent;
  padding: 6px;
  cursor: pointer;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  transition: background 0.2s ease, color 0.2s ease;

  &:hover {
    background: #f1f5f9;
    color: #4f46e5;
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
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  font-size: 14px;
  color: #111827;
  background: #fff;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }

  &::placeholder {
    color: #9ca3af;
  }
`

const ImageCaptionModalFooter = styled.div`
  padding: 16px 24px;
  border-top: 1px solid #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
`

const ImageCaptionButton = styled.button<{ $primary?: boolean }>`
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;

  ${({ $primary }) =>
    $primary
      ? `
    background: #6366f1;
    color: #fff;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
    &:hover {
      background: #4f46e5;
    }
  `
      : `
    background: #fff;
    color: #64748b;
    border: 1px solid #e5e7eb;
    &:hover {
      background: #f1f5f9;
      color: #475569;
    }
  `}
`

// 색상 선택기 스타일
const ColorPickerDropdown = styled.div`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
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
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  border: 2px solid ${({ $selected }) => ($selected ? '#4f46e5' : 'rgba(0, 0, 0, 0.1)')};
  box-shadow: ${({ $selected }) =>
    $selected ? '0 0 0 2px rgba(79, 70, 229, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.08)'};

  &:hover {
    border-color: rgba(79, 70, 229, 0.5);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`

const ColorPickerInputWrapper = styled.div`
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
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
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
  padding: 8px;
  z-index: 1000;
  display: ${({ $visible }) => ($visible ? 'block' : 'none')};
  min-width: 180px;
`

const ContextMenuItem = styled.button.attrs({ type: 'button' })`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: transparent;
  color: #111827;
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  border-radius: 10px;
  transition: background 0.2s ease, color 0.2s ease;

  &:hover {
    background: rgba(79, 70, 229, 0.08);
    color: #4f46e5;
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
  background: #fff;
  border-radius: 20px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`

const EntityLinkModalHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const EntityLinkModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
`

const EntityLinkModalClose = styled.button`
  border: none;
  background: transparent;
  padding: 6px;
  cursor: pointer;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  transition: background 0.2s ease, color 0.2s ease;

  &:hover {
    background: #f1f5f9;
    color: #4f46e5;
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
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  font-size: 14px;
  color: #111827;
  background: #fff;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }

  &::placeholder {
    color: #9ca3af;
  }
`

const EntityLinkSelectedText = styled.div`
  padding: 12px 16px;
  background: rgba(245, 158, 11, 0.06);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 12px;
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

/* 용어 연결 모달 (문구·관직 설명) */
const TermLinkModalOverlay = styled.div<{ $visible: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: ${({ $visible }) => ($visible ? 'flex' : 'none')};
  align-items: center;
  justify-content: center;
`
const TermLinkModal = styled.div`
  background: #fff;
  border-radius: 20px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  width: 90%;
  max-width: 440px;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`
const TermLinkModalHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
`
const TermLinkModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
`
const TermLinkModalClose = styled.button`
  padding: 8px;
  border: none;
  background: none;
  cursor: pointer;
  color: #64748b;
  border-radius: 10px;
  &:hover {
    background: #f1f5f9;
    color: #0f172a;
  }
`
const TermLinkModalContent = styled.div`
  padding: 20px 24px 24px;
  overflow-y: auto;
  flex: 1;
`
const TermLinkSearchInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  font-size: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  margin-bottom: 14px;
  box-sizing: border-box;
  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`
const TermLinkResultsList = styled.div`
  max-height: 280px;
  overflow-y: auto;
  margin-bottom: 16px;
`
const TermLinkNewSection = styled.div`
  padding-top: 14px;
  border-top: 1px solid #f1f5f9;
`
const TermLinkNewLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 8px;
`
const TermLinkNewInput = styled.input`
  width: 100%;
  padding: 10px 14px;
  font-size: 13px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  margin-bottom: 8px;
  box-sizing: border-box;
`
const TermLinkNewTextarea = styled.textarea`
  width: 100%;
  min-height: 72px;
  padding: 10px 14px;
  font-size: 13px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  resize: vertical;
  box-sizing: border-box;
`
const TermLinkNewButton = styled.button<{ $primary?: boolean }>`
  margin-top: 10px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px;
  border: 1px solid ${(p) => (p.$primary ? '#6366f1' : '#e5e7eb')};
  background: ${(p) => (p.$primary ? '#6366f1' : '#fff')};
  color: ${(p) => (p.$primary ? '#fff' : '#475569')};
  cursor: pointer;
  &:hover {
    background: ${(p) => (p.$primary ? '#4f46e5' : '#f8fafc')};
  }
`

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onImageUpload?: (file: File) => Promise<string>
  mentionEntities?: MentionExtensionProps
  /** 엔티티 연결 모달을 열 때 호출 (부모에서 엔티티 목록을 서버에서 다시 불러올 때 사용) */
  onEntityModalOpen?: () => void
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
  onEntityModalOpen,
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

  // 용어 연결 모달 상태
  const [termLinkModalVisible, setTermLinkModalVisible] = useState(false)
  const [termLinkQuery, setTermLinkQuery] = useState('')
  const [termLinkResults, setTermLinkResults] = useState<GlossaryTermDto[]>([])
  const [termLinkSelectedIndex, setTermLinkSelectedIndex] = useState(0)
  const [termLinkNewName, setTermLinkNewName] = useState('')
  const [termLinkNewDesc, setTermLinkNewDesc] = useState('')

  // 용어 수정 모달 (에디터에서 .term 클릭 시)
  const [termEditModalVisible, setTermEditModalVisible] = useState(false)
  const [termEditId, setTermEditId] = useState<string | null>(null)
  const [termEditName, setTermEditName] = useState('')
  const [termEditDesc, setTermEditDesc] = useState('')
  const [termEditLoading, setTermEditLoading] = useState(false)

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

  // 키 입력 핸들러
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
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
    [applyFormat],
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
      } catch {
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
      } catch {
        // Range가 유효하지 않으면 에디터 끝에 추가
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
        dynasties: mentionEntities.dynasties as never[],
      })

      setEntityLinkResults(results.slice(0, 30))
      setEntityLinkSelectedIndex(0)
    },
    [mentionEntities],
  )

  // 엔티티 링크 모달 열기 (열 때 부모에 알려 서버에서 엔티티 다시 불러오기)
  const handleOpenEntityLinkModal = useCallback(() => {
    setContextMenuVisible(false)
    onEntityModalOpen?.()
    setEntityLinkModalVisible(true)
    setEntityLinkQuery('')
    searchEntityLinks('')
  }, [searchEntityLinks, onEntityModalOpen])

  // 모달이 열린 상태에서 mentionEntities가 갱신되면(예: 부모 refetch 완료) 검색 결과 다시 표시
  useEffect(() => {
    if (entityLinkModalVisible) {
      searchEntityLinks(entityLinkQuery)
    }
  }, [entityLinkModalVisible, entityLinkQuery, mentionEntities, searchEntityLinks])

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

  // 용어 연결: 검색
  const searchTermLinks = useCallback(async (query: string) => {
    try {
      const list = await getGlossaryTerms({ q: query || undefined })
      setTermLinkResults(list)
      setTermLinkSelectedIndex(0)
    } catch {
      setTermLinkResults([])
    }
  }, [])

  const handleOpenTermLinkModal = useCallback(() => {
    setContextMenuVisible(false)
    setTermLinkModalVisible(true)
    setTermLinkNewName(selectedText)
    setTermLinkNewDesc('')
    setTermLinkQuery('')
    setTermLinkResults([])
  }, [selectedText])

  const handleCloseTermLinkModal = useCallback(() => {
    setTermLinkModalVisible(false)
    setTermLinkQuery('')
    setTermLinkResults([])
    setTermLinkNewName('')
    setTermLinkNewDesc('')
  }, [])

  const insertTermLink = useCallback(
    (term: GlossaryTermDto) => {
      if (!selectedTextRange || !editorRef.current) return

      const range = selectedTextRange.cloneRange()
      const termSpan = document.createElement('span')
      termSpan.className = 'term'
      termSpan.setAttribute('data-term-id', term.id)
      termSpan.setAttribute('data-term-name', term.name)
      termSpan.setAttribute('contenteditable', 'false')
      const fragment = range.extractContents()
      termSpan.appendChild(fragment)
      range.insertNode(termSpan)

      const parent = termSpan.parentNode
      if (parent) {
        const spaceText = document.createTextNode('\u00A0')
        parent.insertBefore(spaceText, termSpan.nextSibling)
        const newRange = document.createRange()
        newRange.setStart(spaceText, 1)
        newRange.collapse(true)
        const selection = window.getSelection()
        if (selection) {
          selection.removeAllRanges()
          selection.addRange(newRange)
        }
      }

      updateFormatState()
      handleContentChange()
      handleCloseTermLinkModal()
      setSelectedText('')
      setSelectedTextRange(null)
    },
    [
      selectedTextRange,
      handleContentChange,
      handleCloseTermLinkModal,
      updateFormatState,
    ],
  )

  const handleCreateAndLinkTerm = useCallback(async () => {
    const name = termLinkNewName.trim()
    if (!name) return
    if (!selectedTextRange) return

    try {
      const term = await createGlossaryTerm({
        name,
        description: termLinkNewDesc.trim() || null,
      })
      insertTermLink(term)
    } catch (err) {
      console.error('용어 등록 실패:', err)
    }
  }, [
    termLinkNewName,
    termLinkNewDesc,
    selectedTextRange,
    insertTermLink,
  ])

  // 에디터 내 .term 클릭 → 수정 모달
  const handleEditorContentClick = useCallback(
    (e: React.MouseEvent) => {
      const el = (e.target as HTMLElement).closest('.term')
      if (!el) return
      const id = el.getAttribute('data-term-id')
      if (!id) return
      e.preventDefault()
      e.stopPropagation()
      setTermEditId(id)
      setTermEditName(el.getAttribute('data-term-name') || el.textContent || '')
      setTermEditDesc('')
      setTermEditModalVisible(true)
      setTermEditLoading(true)
      getGlossaryTermById(id)
        .then((t) => {
          setTermEditName(t.name)
          setTermEditDesc(t.description ?? '')
        })
        .catch(() => {
          setTermEditModalVisible(false)
        })
        .finally(() => setTermEditLoading(false))
    },
    [],
  )

  const handleCloseTermEditModal = useCallback(() => {
    setTermEditModalVisible(false)
    setTermEditId(null)
    setTermEditName('')
    setTermEditDesc('')
  }, [])

  const handleSaveTermEdit = useCallback(async () => {
    if (!termEditId || !termEditName.trim()) return
    setTermEditLoading(true)
    try {
      await updateGlossaryTerm(termEditId, {
        name: termEditName.trim(),
        description: termEditDesc.trim() || null,
      })
      if (editorRef.current) {
        const span = editorRef.current.querySelector(
          `.term[data-term-id="${termEditId}"]`,
        ) as HTMLElement | null
        if (span) {
          span.setAttribute('data-term-name', termEditName.trim())
        }
      }
      handleCloseTermEditModal()
    } catch (err) {
      console.error('용어 수정 실패:', err)
    } finally {
      setTermEditLoading(false)
    }
  }, [termEditId, termEditName, termEditDesc, handleCloseTermEditModal])

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
            background: selectedText.length > 0 ? 'rgba(245, 158, 11, 0.08)' : undefined,
            border: selectedText.length > 0 ? '1px solid rgba(245, 158, 11, 0.25)' : undefined,
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
              background: colorPickerVisible ? 'rgba(79, 70, 229, 0.1)' : undefined,
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
          onClick={handleEditorContentClick}
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
                        border: '1px solid #e5e7eb',
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
        <ContextMenuItem
          onClick={() => {
            playClickSound()
            handleOpenTermLinkModal()
          }}
        >
          <FiType />
          용어 연결
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
                            background: 'rgba(79, 70, 229, 0.06)',
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
                                    ? 'rgba(245, 158, 11, 0.08)'
                                    : 'transparent',
                                borderRadius: '10px',
                                marginBottom: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                border:
                                  currentIndex === entityLinkSelectedIndex
                                    ? '1px solid rgba(245, 158, 11, 0.25)'
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

      {/* 용어 연결 모달 */}
      <TermLinkModalOverlay
        $visible={termLinkModalVisible}
        onClick={handleCloseTermLinkModal}
      >
        <TermLinkModal onClick={(e) => e.stopPropagation()}>
          <TermLinkModalHeader>
            <TermLinkModalTitle>용어 연결</TermLinkModalTitle>
            <TermLinkModalClose onClick={handleCloseTermLinkModal}>
              <FiX size={20} />
            </TermLinkModalClose>
          </TermLinkModalHeader>
          <TermLinkModalContent>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
              <strong>선택한 텍스트</strong> &quot;{selectedText}&quot;
            </div>
            <TermLinkSearchInput
              type="text"
              placeholder="용어 검색 (이름)..."
              value={termLinkQuery}
              onChange={(e) => {
                const q = e.target.value
                setTermLinkQuery(q)
                searchTermLinks(q)
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setTermLinkSelectedIndex((i) =>
                    i < termLinkResults.length - 1 ? i + 1 : 0,
                  )
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setTermLinkSelectedIndex((i) =>
                    i > 0 ? i - 1 : termLinkResults.length - 1,
                  )
                } else if (e.key === 'Enter') {
                  e.preventDefault()
                  if (termLinkResults[termLinkSelectedIndex]) {
                    insertTermLink(termLinkResults[termLinkSelectedIndex])
                  }
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  handleCloseTermLinkModal()
                }
              }}
              autoFocus
            />
            <TermLinkResultsList>
              {termLinkResults.length === 0 ? (
                <div
                  style={{
                    padding: 20,
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontSize: 13,
                  }}
                >
                  {termLinkQuery.trim()
                    ? '검색 결과가 없습니다. 아래에서 새 용어를 등록할 수 있습니다.'
                    : '검색어를 입력하거나 아래에서 새 용어를 등록하세요.'}
                </div>
              ) : (
                termLinkResults.map((term, idx) => (
                  <div
                    key={term.id}
                    style={{
                      padding: '12px 14px',
                      cursor: 'pointer',
                      background:
                        idx === termLinkSelectedIndex
                          ? 'rgba(13, 148, 136, 0.08)'
                          : 'transparent',
                      borderRadius: 10,
                      marginBottom: 4,
                      border:
                        idx === termLinkSelectedIndex
                          ? '1px solid rgba(13, 148, 136, 0.25)'
                          : '1px solid transparent',
                    }}
                    onMouseEnter={() => setTermLinkSelectedIndex(idx)}
                    onClick={() => {
                      playClickSound()
                      insertTermLink(term)
                    }}
                  >
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>
                      {term.name}
                    </span>
                    {term.description && (
                      <div
                        style={{
                          fontSize: 12,
                          color: '#64748b',
                          marginTop: 4,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {term.description}
                      </div>
                    )}
                  </div>
                ))
              )}
            </TermLinkResultsList>
            <TermLinkNewSection>
              <TermLinkNewLabel>새 용어로 등록 후 연결</TermLinkNewLabel>
              <TermLinkNewInput
                placeholder="용어명 (필수)"
                value={termLinkNewName}
                onChange={(e) => setTermLinkNewName(e.target.value)}
              />
              <TermLinkNewTextarea
                placeholder="설명 (선택)"
                value={termLinkNewDesc}
                onChange={(e) => setTermLinkNewDesc(e.target.value)}
              />
              <TermLinkNewButton
                $primary
                type="button"
                onClick={() => {
                  playClickSound()
                  handleCreateAndLinkTerm()
                }}
                disabled={!termLinkNewName.trim()}
              >
                등록 후 연결
              </TermLinkNewButton>
            </TermLinkNewSection>
          </TermLinkModalContent>
        </TermLinkModal>
      </TermLinkModalOverlay>

      {/* 용어 수정 모달 (에디터에서 .term 클릭 시) */}
      <TermLinkModalOverlay
        $visible={termEditModalVisible}
        onClick={handleCloseTermEditModal}
      >
        <TermLinkModal onClick={(e) => e.stopPropagation()}>
          <TermLinkModalHeader>
            <TermLinkModalTitle>용어 수정</TermLinkModalTitle>
            <TermLinkModalClose type="button" onClick={handleCloseTermEditModal}>
              <FiX size={20} />
            </TermLinkModalClose>
          </TermLinkModalHeader>
          <TermLinkModalContent>
            {termEditLoading ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                불러오는 중…
              </div>
            ) : (
              <>
                <TermLinkNewLabel>용어명</TermLinkNewLabel>
                <TermLinkNewInput
                  placeholder="용어명 (필수)"
                  value={termEditName}
                  onChange={(e) => setTermEditName(e.target.value)}
                />
                <TermLinkNewLabel style={{ marginTop: 12 }}>설명</TermLinkNewLabel>
                <TermLinkNewTextarea
                  placeholder="설명 (선택)"
                  value={termEditDesc}
                  onChange={(e) => setTermEditDesc(e.target.value)}
                  style={{ minHeight: 200 }}
                />
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <TermLinkNewButton
                    type="button"
                    onClick={() => {
                      playClickSound()
                      handleCloseTermEditModal()
                    }}
                  >
                    취소
                  </TermLinkNewButton>
                  <TermLinkNewButton
                    $primary
                    type="button"
                    onClick={() => {
                      playClickSound()
                      handleSaveTermEdit()
                    }}
                    disabled={!termEditName.trim() || termEditLoading}
                  >
                    저장
                  </TermLinkNewButton>
                </div>
              </>
            )}
          </TermLinkModalContent>
        </TermLinkModal>
      </TermLinkModalOverlay>
    </EditorContainer>
  )
}
