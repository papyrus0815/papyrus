/**
 * 리치 텍스트 에디터 컴포넌트
 * 라이브러리 없이 ContentEditable 기반으로 직접 구현
 * 프로젝트 디자인 시스템에 맞춘 커스텀 스타일
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { createPortal } from 'react-dom'

import { toast } from 'react-hot-toast'
import {
  FiAlignCenter,
  FiAlignLeft,
  FiAlignRight,
  FiBold,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiChevronUp,
  FiCode,
  FiDroplet,
  FiEdit2,
  FiGrid,
  FiImage,
  FiItalic,
  FiLink,
  FiList,
  FiMaximize2,
  FiMessageSquare,
  FiMinus,
  FiMoreHorizontal,
  FiTrash2,
  FiType,
  FiX,
} from 'react-icons/fi'
import styled, { css } from 'styled-components'

import {
  fetchEntityLinkSearch,
  mapEntityLinkRowsToMentionItems,
} from '@/shared/api/entity-link-search'
import {
  type GlossaryTermDto,
  createGlossaryTerm,
  deleteGlossaryTerm,
  getGlossaryTermById,
  getGlossaryTerms,
  updateGlossaryTerm,
} from '@/shared/api/glossary'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import type { MentionItem } from '@/shared/lib/mention/mention-system'
import {
  MENTION_TYPE_CONFIG,
  searchMentionEntities,
} from '@/shared/lib/mention/mention-system'
import {
  resolveRichTextImageSrcsForDisplay,
} from '@/shared/lib/rich-text-read-view'
import { sanitizeRichTextHtml } from '@/shared/lib/sanitize-rich-text-html'
import { getUploadImageUrl, validateImageFile } from '@/shared/api/upload'
import { scrollbarMixin } from '@/shared/styles/mixins'
import {
  PROSE_HR_HTML,
  PROSE_HR_SMALL_HTML,
  proseHrSmallStyles,
  proseHrStyles,
} from '@/shared/styles/prose-hr'
import {
  richTextBlockAlignCss,
  richTextProseListCss,
} from '@/shared/styles/rich-text-readonly-content'
import { Z_INDEX } from '@/shared/styles/z-index'

// 멘션 엔티티 props 타입
export interface MentionExtensionProps {
  persons?: unknown[]
  events?: unknown[]
  countries?: unknown[]
  historicalCountries?: unknown[]
  militaryUnits?: unknown[]
  dynasties?: unknown[]
  /** 정당 (선거·투표 등록 정당) — 국가 상세 정당 상세로 이동 시 `countryId` 필요 */
  politicalParties?: unknown[]
}

/* 행정조직 폼 스타일: 테두리 #e5e7eb, 포커스 인디고 */
/**
 * $maxHeight 지정 시 — 에디터 전체가 지정 높이에서 flex-column으로 고정되고
 * 본문 영역(EditorWrapper)이 내부 스크롤, Toolbar는 Container 하단에 flex 아이템으로 고정.
 * 모달 등 bounded 컨테이너에서 Toolbar가 부모 스크롤에 밀려 안 보이는 현상 방지.
 */
const EditorContainer = styled.div<{ $maxHeight?: string }>`
  position: relative;
  border-radius: 20px;
  overflow: ${({ $maxHeight }) => ($maxHeight ? 'hidden' : 'visible')};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)'
      : '0 1px 3px rgba(0, 0, 0, 0.04)'};
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff'};
  backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(12px)' : 'none'};
  -webkit-backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(12px)' : 'none'};
  width: 100%;
  ${({ $maxHeight }) =>
    $maxHeight &&
    css`
      display: flex;
      flex-direction: column;
      max-height: ${$maxHeight};
    `}

  &:focus-within {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
`

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

/**
 * Toolbar 우측 슬롯 — `actions` prop을 받아 저장/취소 같은 명시 액션을
 * 서식 버튼들과 같은 줄에 둔다. `margin-left: auto`로 우측 정렬.
 * 좁은 폭에서는 flex-wrap이 받아내 다음 줄로 자연스럽게 넘어감.
 */
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

const EditorWrapper = styled.div<{ $bounded?: boolean }>`
  background: transparent;
  position: relative;
  border-radius: 20px 20px 0 0;
  ${({ $bounded }) =>
    $bounded
      ? css`
          flex: 1;
          min-height: 0;
          overflow-y: auto;
        `
      : css`
          overflow: visible;
        `}
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
  color: ${({ theme }) => theme.colors.text.primary};
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
    Arial, sans-serif;
  letter-spacing: -0.02em;

  &::placeholder {
    color: ${({ theme }) => theme.colors.border.medium};
    font-weight: 600;
  }

  &:focus::placeholder {
    color: ${({ theme }) => theme.colors.border.default};
  }
`

const TitleDivider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.colors.border.default};
  margin: 0 28px 8px 28px;
`

const EditorContent = styled.div<{ $hasTitle?: boolean; $minHeight?: string }>`
  outline: none;
  /**
   * minHeight prop이 전달되면 그 값으로 override. InlineRichText처럼 본문
   * 길이만큼 자라는 인라인 편집에서는 짧은 값(예: 120px)을 주고, 폼·모달
   * 사용처는 기본값 그대로(280/320)로 둔다.
   */
  min-height: ${({ $hasTitle, $minHeight }) =>
    $minHeight ?? ($hasTitle ? '280px' : '320px')};
  padding: ${({ $hasTitle }) =>
    $hasTitle ? '12px 28px 16px 28px' : '16px 28px'};
  font-size: 15px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.primary};
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
    color: ${({ theme }) => theme.colors.text.tertiary};
    pointer-events: none;
    font-style: italic;
  }

  p {
    margin: 0 0 8px 0;

    &:last-child {
      margin-bottom: 0;
    }
  }

  h1,
  h2,
  h3 {
    margin: 18px 0 8px 0;
    font-weight: 700;
    line-height: 1.3;
    color: ${({ theme }) => theme.colors.text.primary};
    letter-spacing: -0.02em;

    &:first-child {
      margin-top: 0;
    }
  }

  h1 {
    font-size: 32px;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#818cf8' : '#4f46e5')};
  }

  h2 {
    font-size: 24px;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  h3 {
    font-size: 20px;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  ${richTextProseListCss}
  ${richTextBlockAlignCss}

  img {
    max-width: 100%;
    height: auto;
    border-radius: 12px;
    margin: 10px 0;
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
    color: ${({ theme }) => (theme.mode === 'dark' ? '#818cf8' : '#4f46e5')};
    text-decoration: none;
    border-bottom: 1px solid rgba(79, 70, 229, 0.3);
    cursor: pointer;
    transition:
      color 0.2s ease,
      border-color 0.2s ease;
    font-weight: 500;

    &:hover {
      color: #4338ca;
      border-bottom-color: #4f46e5;
      background: rgba(79, 70, 229, 0.04);
    }
  }

  blockquote {
    border-left: 4px solid #4f46e5;
    padding: 12px 20px;
    margin: 12px 0;
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(79,70,229,0.1)'
        : 'rgba(79, 70, 229, 0.04)'};
    border-radius: 0 12px 12px 0;
    color: ${({ theme }) => theme.colors.text.secondary};
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
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99,102,241,0.15)'
        : 'rgba(79, 70, 229, 0.08)'};
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 13px;
    font-family:
      'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Courier New', monospace;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#818cf8' : '#4f46e5')};
    font-weight: 500;
    border: 1px solid rgba(79, 70, 229, 0.15);
  }

  pre {
    background: ${({ theme }) => theme.colors.background.secondary};
    padding: 12px;
    border-radius: 12px;
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    overflow-x: auto;
    margin: 10px 0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

    code {
      background: transparent;
      padding: 0;
      color: ${({ theme }) => theme.colors.text.primary};
      border: none;
    }
  }

  /* 포스트 상세와 동일 (공통 proseHrStyles) */
  hr,
  .prose-hr {
    ${proseHrStyles}
  }
  .prose-hr.prose-hr--small {
    ${proseHrSmallStyles}
  }

  figure {
    margin: 10px 0;
    text-align: center;
    position: relative;
    display: inline-block;
    max-width: 100%;

    img {
      margin: 0 auto;
    }

    /* 레거시: figure에 aspect-ratio가 박힌 경우 — 읽기 뷰와 동일하게 무력화.
       figure는 콘텐츠 폭으로 따라가고, 비율은 img가 직접 책임짐. */
    &[data-aspect-ratio] {
      aspect-ratio: auto !important;
    }
    &[data-aspect-ratio] img,
    img[data-aspect-ratio] {
      height: auto !important;
    }

    /* 정렬 — 좌/중/우 */
    &[data-align='left'] {
      display: block;
      margin-left: 0;
      margin-right: auto;
      text-align: left;
      img {
        margin: 0;
      }
    }
    &[data-align='right'] {
      display: block;
      margin-left: auto;
      margin-right: 0;
      text-align: right;
      img {
        margin: 0 0 0 auto;
      }
    }
    &[data-align='center'] {
      display: block;
      margin-left: auto;
      margin-right: auto;
      text-align: center;
      img {
        margin: 0 auto;
      }
    }

    figcaption {
      margin-top: 8px;
      font-size: 13px;
      color: ${({ theme }) => theme.colors.text.secondary};
      font-style: italic;
      text-align: center;
    }

    /* 리사이즈 핸들 — 4코너 */
    .resize-handle {
      position: absolute;
      width: 12px;
      height: 12px;
      background: #4f46e5;
      border: 2px solid #fff;
      border-radius: 50%;
      z-index: 10;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
      transition: transform 0.15s ease;
      opacity: 0;
      pointer-events: none;
      touch-action: none;

      &:hover {
        transform: scale(1.2);
        box-shadow: 0 2px 8px rgba(79, 70, 229, 0.35);
      }

      &.tl {
        top: -6px;
        left: -6px;
        cursor: nwse-resize;
      }
      &.tr {
        top: -6px;
        right: -6px;
        cursor: nesw-resize;
      }
      &.bl {
        bottom: -6px;
        left: -6px;
        cursor: nesw-resize;
      }
      &.br {
        bottom: -6px;
        right: -6px;
        cursor: nwse-resize;
      }
    }

    &:hover .resize-handle,
    &.is-selected .resize-handle,
    &.resizing .resize-handle {
      opacity: 1;
      pointer-events: all;
    }

    &.is-selected,
    &:focus-visible {
      outline: 2px solid #4f46e5;
      outline-offset: 4px;
      border-radius: 16px;
    }

    /* tabindex로 인한 기본 outline 제거 — 위 :focus-visible로 일관 처리 */
    &:focus {
      outline: none;
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
    color: ${({ theme }) =>
      theme.mode === 'dark' ? '#a5b4fc' : '#4338ca'} !important;

    &:hover {
      background: rgba(99, 102, 241, 0.18);
    }

    &[data-type='person'] {
      background: rgba(99, 102, 241, 0.1);
      color: ${({ theme }) =>
        theme.mode === 'dark' ? '#a5b4fc' : '#4338ca'} !important;
      &:hover {
        background: rgba(99, 102, 241, 0.18);
      }
    }
    &[data-type='dynasty'] {
      background: rgba(124, 58, 237, 0.1);
      color: ${({ theme }) =>
        theme.mode === 'dark' ? '#c4b5fd' : '#6d28d9'} !important;
      &:hover {
        background: rgba(124, 58, 237, 0.18);
      }
    }
    &[data-type='event'] {
      background: rgba(217, 119, 6, 0.1);
      color: #b45309 !important;
      &:hover {
        background: rgba(217, 119, 6, 0.18);
      }
    }
    &[data-type='country'] {
      background: rgba(34, 197, 94, 0.1);
      color: #15803d !important;
      &:hover {
        background: rgba(34, 197, 94, 0.18);
      }
    }
    &[data-type='historicalCountry'] {
      background: rgba(139, 92, 246, 0.1);
      color: ${({ theme }) =>
        theme.mode === 'dark' ? '#c4b5fd' : '#6d28d9'} !important;
      &:hover {
        background: rgba(139, 92, 246, 0.18);
      }
    }
    &[data-type='militaryUnit'] {
      background: rgba(239, 68, 68, 0.1);
      color: #b91c1c !important;
      &:hover {
        background: rgba(239, 68, 68, 0.18);
      }
    }
  }

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

  /* iOS 메모 스타일 표 */
  table.rich-table {
    border-collapse: collapse;
    width: 100%;
    margin: 12px 0;
    font-size: 14px;
    line-height: 1.45;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255,255,255,0.14)' : '#e5e7eb'};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff'};
    box-shadow: ${({ theme }) =>
      theme.mode === 'dark'
        ? '0 1px 0 rgba(255,255,255,0.06) inset'
        : '0 1px 2px rgba(15, 23, 42, 0.04)'};
  }

  table.rich-table td,
  table.rich-table th {
    border: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e8e8ed'};
    padding: 8px 10px;
    min-width: 40px;
    min-height: 36px;
    vertical-align: top;
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

/* 단축키 도움말 모달 — body 포털 */
const ShortcutsHelpOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  z-index: ${Z_INDEX.RICH_TEXT_EDITOR_OVERLAY};
  display: flex;
  align-items: center;
  justify-content: center;
`

const ShortcutsHelpModal = styled.div`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(30,30,30,0.95)' : '#fff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  border-radius: 20px;
  width: 92%;
  max-width: 560px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18);
`

const ShortcutsHelpHeader = styled.div`
  padding: 18px 22px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const ShortcutsHelpTitle = styled.h3`
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ShortcutsHelpClose = styled.button`
  background: transparent;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.secondary};
  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
  }
`

const ShortcutsHelpContent = styled.div`
  overflow-y: auto;
  padding: 16px 22px 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  ${scrollbarMixin}
`

const ShortcutsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const ShortcutsSectionTitle = styled.div`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-bottom: 2px;
`

const ShortcutRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};

  & > span:last-child {
    margin-left: auto;
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 500;
  }

  & kbd {
    display: inline-flex;
    align-items: center;
    height: 22px;
    padding: 0 7px;
    border-radius: 6px;
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f8fafc'};
    color: ${({ theme }) => theme.colors.text.primary};
    font: 600 11.5px/1
      ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  }
`

// 이미지 설명 입력 모달 스타일 (body 포털 — EditorContainer의 backdrop-filter가 fixed 기준을 바꾸는 것 방지)
const ImageCaptionModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: ${Z_INDEX.RICH_TEXT_EDITOR_OVERLAY};
  display: flex;
  align-items: center;
  justify-content: center;
`

const ImageCaptionModal = styled.div`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(30,30,30,0.9)' : '#fff'};
  backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(20px)' : 'none'};
  -webkit-backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(20px)' : 'none'};
  border-radius: 20px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.08),
    0 1px 3px rgba(0, 0, 0, 0.04);
  width: 90%;
  max-width: 480px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`

const ImageCaptionModalHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const ImageCaptionModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ImageCaptionModalClose = styled.button`
  border: none;
  background: transparent;
  padding: 6px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  transition:
    background 0.2s ease,
    color 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
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
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:focus {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const ImageCaptionModalFooter = styled.div`
  padding: 16px 24px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
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
  transition:
    background 0.2s ease,
    color 0.2s ease;

  ${({ $primary, theme }) =>
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
    background: ${theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#fff'};
    color: ${theme.colors.text.secondary};
    border: 1px solid ${theme.colors.border.default};
    &:hover {
      background: ${theme.colors.background.tertiary};
      color: ${theme.colors.text.primary};
    }
  `}
`

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

const TableInsertPopover = styled.div`
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

const TableInsertGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(8, 12px);
  grid-template-rows: repeat(8, 12px);
  gap: 3px;
  margin-bottom: 8px;
`

const TableInsertCell = styled.button.attrs({ type: 'button' })<{
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

const TableInsertHint = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-align: center;
  letter-spacing: 0.02em;
`

const ContextMenu = styled.div<{
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

const ContextMenuItem = styled.button.attrs({ type: 'button' })`
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

/* 이미지 클릭 시 뜨는 부유 툴바 — 이미지 위쪽에 위치 */
const ImageToolbar = styled.div<{ $top: number; $left: number }>`
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

const ImageToolbarButton = styled.button.attrs({ type: 'button' })<{
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
    $danger
      ? '#dc2626'
      : $active
        ? '#4f46e5'
        : theme.colors.text.secondary};
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

const ImageToolbarDivider = styled.span`
  width: 1px;
  height: 18px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  margin: 0 2px;
`

const EntityLinkModal = styled.div`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(25,25,25,0.92)' : '#fff'};
  backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(24px)' : 'none'};
  -webkit-backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(24px)' : 'none'};
  border-radius: 20px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.08),
    0 1px 3px rgba(0, 0, 0, 0.04);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`

const EntityLinkModalHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const EntityLinkModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EntityLinkModalClose = styled.button`
  border: none;
  background: transparent;
  padding: 6px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  transition:
    background 0.2s ease,
    color 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
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
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:focus {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const EntityLinkSelectedText = styled.div`
  padding: 12px 16px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(245,158,11,0.08)'
      : 'rgba(245, 158, 11, 0.06)'};
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 12px;
  font-size: 13px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#78350f')};
  font-weight: 500;

  strong {
    display: block;
    margin-bottom: 4px;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f59e0b' : '#92400e')};
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

const EntityLinkModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: ${Z_INDEX.RICH_TEXT_EDITOR_OVERLAY};
  display: flex;
  align-items: center;
  justify-content: center;
`

/* 용어 연결 모달 (문구·관직 설명) */
const TermLinkModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: ${Z_INDEX.RICH_TEXT_EDITOR_OVERLAY};
  display: flex;
  align-items: center;
  justify-content: center;
`
const TermLinkModal = styled.div`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(25,25,25,0.92)' : '#fff'};
  backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(24px)' : 'none'};
  -webkit-backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(24px)' : 'none'};
  border-radius: 20px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
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
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  display: flex;
  align-items: center;
  justify-content: space-between;
`
const TermLinkModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`
const TermLinkModalClose = styled.button`
  padding: 8px;
  border: none;
  background: none;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.secondary};
  border-radius: 10px;
  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
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
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  margin-bottom: 14px;
  box-sizing: border-box;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  outline: none;
  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`
const TermLinkResultsList = styled.div`
  max-height: 280px;
  overflow-y: auto;
  margin-bottom: 16px;
`
const TermLinkNewSection = styled.div`
  padding-top: 14px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`
const TermLinkNewLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 8px;
`
const TermLinkNewInput = styled.input`
  width: 100%;
  padding: 10px 14px;
  font-size: 13px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  margin-bottom: 8px;
  box-sizing: border-box;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  outline: none;
  &:focus {
    border-color: #6366f1;
  }
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`
const TermLinkNewTextarea = styled.textarea`
  width: 100%;
  min-height: 240px;
  padding: 10px 14px;
  font-size: 13px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  resize: vertical;
  box-sizing: border-box;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  outline: none;
  &:focus {
    border-color: #6366f1;
  }
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`
const TermLinkNewButton = styled.button<{ $primary?: boolean }>`
  margin-top: 10px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px;
  border: 1px solid
    ${(p) => (p.$primary ? '#6366f1' : p.theme.colors.border.default)};
  background: ${(p) =>
    p.$primary
      ? '#6366f1'
      : p.theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : '#fff'};
  color: ${(p) => (p.$primary ? '#fff' : p.theme.colors.text.secondary)};
  cursor: pointer;
  &:hover {
    background: ${(p) =>
      p.$primary ? '#4f46e5' : p.theme.colors.background.tertiary};
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

/** 포스트/사건 편집 시 해당 문서에만 쓰는 용어(문서 전용) 지원 */
export type DocumentScope =
  | { type: 'post'; id: string }
  | { type: 'event'; id: string }

const TABLE_GRID_MAX = 8

function getTableCellFromSelection(
  editor: HTMLElement,
): HTMLTableCellElement | null {
  const sel = window.getSelection()
  if (!sel?.rangeCount) return null
  const range = sel.getRangeAt(0)
  let node: Node | null = range.commonAncestorContainer
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
  while (node && node !== editor) {
    const name = node.nodeName
    if (name === 'TD' || name === 'TH') return node as HTMLTableCellElement
    node = node.parentNode
  }
  return null
}

function focusTableCell(cell: HTMLTableCellElement) {
  if (!cell.textContent?.trim() && cell.childNodes.length === 0) {
    cell.innerHTML = '<br>'
  }
  const range = document.createRange()
  const first = cell.firstChild
  if (first) {
    range.setStart(first, 0)
  } else {
    range.setStart(cell, 0)
  }
  range.collapse(true)
  const sel = window.getSelection()
  if (sel) {
    sel.removeAllRanges()
    sel.addRange(range)
  }
}

function getOrderedTableCells(table: HTMLTableElement): HTMLTableCellElement[] {
  const out: HTMLTableCellElement[] = []
  table.querySelectorAll('tr').forEach((tableRow) => {
    Array.from(tableRow.cells).forEach((tableCell) => out.push(tableCell))
  })
  return out
}

function insertRichTableAtSelection(
  editor: HTMLElement,
  rows: number,
  cols: number,
): void {
  const table = document.createElement('table')
  table.className = 'rich-table'
  const tbody = document.createElement('tbody')
  for (let rowIdx = 0; rowIdx < rows; rowIdx++) {
    const tr = document.createElement('tr')
    for (let colIdx = 0; colIdx < cols; colIdx++) {
      const td = document.createElement('td')
      td.innerHTML = '<br>'
      tr.appendChild(td)
    }
    tbody.appendChild(tr)
  }
  table.appendChild(tbody)
  const p = document.createElement('p')
  p.innerHTML = '<br>'
  const sel = window.getSelection()
  if (!sel?.rangeCount) {
    editor.appendChild(table)
    table.after(p)
    const first = table.querySelector('td')
    if (first) focusTableCell(first as HTMLTableCellElement)
    return
  }
  const range = sel.getRangeAt(0)
  if (!editor.contains(range.commonAncestorContainer)) {
    editor.appendChild(table)
    table.after(p)
    const first = table.querySelector('td')
    if (first) focusTableCell(first as HTMLTableCellElement)
    return
  }
  range.deleteContents()
  range.insertNode(table)
  table.after(p)
  const firstTd = table.querySelector('td')
  if (firstTd) focusTableCell(firstTd as HTMLTableCellElement)
}

function richTableAddRowAbove(cell: HTMLTableCellElement) {
  const tr = cell.parentElement as HTMLTableRowElement
  const colCount = tr.cells.length
  const newTr = document.createElement('tr')
  for (let colIdx = 0; colIdx < colCount; colIdx++) {
    const td = document.createElement('td')
    td.innerHTML = '<br>'
    newTr.appendChild(td)
  }
  tr.before(newTr)
}

function richTableAddRowBelow(cell: HTMLTableCellElement) {
  const tr = cell.parentElement as HTMLTableRowElement
  const colCount = tr.cells.length
  const newTr = document.createElement('tr')
  for (let colIdx = 0; colIdx < colCount; colIdx++) {
    const td = document.createElement('td')
    td.innerHTML = '<br>'
    newTr.appendChild(td)
  }
  tr.after(newTr)
}

function richTableAddColumnLeft(cell: HTMLTableCellElement) {
  const idx = cell.cellIndex
  const table = cell.closest('table')!
  table.querySelectorAll('tr').forEach((tableRow) => {
    const td = document.createElement('td')
    td.innerHTML = '<br>'
    const ref = tableRow.cells[idx]
    if (ref) ref.before(td)
  })
}

function richTableAddColumnRight(cell: HTMLTableCellElement) {
  const idx = cell.cellIndex
  const table = cell.closest('table')!
  table.querySelectorAll('tr').forEach((tableRow) => {
    const td = document.createElement('td')
    td.innerHTML = '<br>'
    const ref = tableRow.cells[idx]
    if (ref) ref.after(td)
  })
}

function richTableDeleteRow(cell: HTMLTableCellElement) {
  const tr = cell.parentElement as HTMLTableRowElement
  const tbody = tr.parentElement!
  if (tbody.querySelectorAll('tr').length <= 1) return
  tr.remove()
}

function richTableDeleteColumn(cell: HTMLTableCellElement) {
  const idx = cell.cellIndex
  const table = cell.closest('table')!
  const firstRow = table.querySelector('tr')
  if (!firstRow || firstRow.cells.length <= 1) return
  table.querySelectorAll('tr').forEach((tableRow) => {
    if (tableRow.cells[idx]) tableRow.deleteCell(idx)
  })
}

/**
 * 엔티티 링크 검색 디바운스. 키 누를 때마다 즉시 fetch하면 서버 부하·취소된
 * 응답 처리가 많아짐. 너무 길면 응답성 저하. `AbortController`로 이전 요청은
 * 항상 취소되므로 비교적 짧은 값을 둔다.
 */
const ENTITY_SEARCH_DEBOUNCE_MS = 280

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onImageUpload?: (file: File) => Promise<string>
  mentionEntities?: MentionExtensionProps
  /** 엔티티 연결 모달을 열 때 호출 (부모에서 엔티티 목록을 서버에서 다시 불러올 때 사용) */
  onEntityModalOpen?: () => void
  /** `useFormEntities` 등에서 목록 로딩 중이면 모달에 안내 표시 */
  mentionEntitiesLoading?: boolean
  /**
   * true(기본): `GET /entity-link-search`로 서버 검색(디바운스). 실패 시 `mentionEntities`로 폴백.
   * false: 예전처럼 클라이언트 목록만 사용.
   */
  entityLinkRemote?: boolean
  /** 정당 검색 한정(선거 탭 등) — 서버에 `countryId`로 전달 */
  entityLinkCountryId?: string
  title?: string
  onTitleChange?: (title: string) => void
  titlePlaceholder?: string
  showTitle?: boolean
  /** 포스트/사건 편집 시 전달 시 용어 검색·등록 시 전역+문서 전용 지원, "이 문서에만 사용" 옵션 표시 */
  documentScope?: DocumentScope
  /**
   * 에디터 전체 높이를 이 값으로 제한하고 본문만 내부 스크롤되게 함.
   * 모달 등 부모 스크롤 컨테이너에서 Toolbar가 잘리는 현상 방지.
   * 예: "60vh", "420px"
   */
  maxHeight?: string
  /**
   * 본문(EditorContent)의 최소 높이. default는 showTitle 여부에 따라
   * 280/320px. InlineRichText처럼 *본문 길이만큼 자라는* 사용처에서는
   * "120px" 같은 짧은 값을 전달해 짧은 콘텐츠에서 큰 빈 카드가 보이지
   * 않도록 한다.
   */
  minHeight?: string
  /**
   * mount 시 본문에 자동 focus + 커서를 끝으로 이동. 인라인 편집 진입 직후
   * 사용자가 별도 클릭 없이 바로 입력할 수 있게 한다(InlineRichText 사용처).
   * 폼 페이지 등 mount 시 focus 도둑질이 부담스러운 경우 false 유지.
   */
  autoFocus?: boolean
  /**
   * Toolbar 우측 끝에 렌더되는 슬롯. InlineRichText처럼 저장/취소 버튼을
   * 에디터 외부가 아닌 toolbar 안에 두고 싶을 때 사용. toolbar는 maxHeight
   * 미지정 시 sticky bottom이라 본문이 길어도 viewport 하단에서 항상 노출.
   * 미전달 시 슬롯 없음(default).
   */
  actions?: React.ReactNode
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = '내용을 입력하세요...',
  onImageUpload,
  mentionEntities,
  onEntityModalOpen,
  mentionEntitiesLoading = false,
  entityLinkRemote = true,
  entityLinkCountryId,
  title = '',
  onTitleChange,
  titlePlaceholder = '제목 없음',
  showTitle = false,
  documentScope,
  maxHeight,
  minHeight,
  autoFocus = false,
  actions,
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
  const [isAlignCenter, setIsAlignCenter] = useState(false)
  const [isCode, setIsCode] = useState(false)
  const [currentColor, setCurrentColor] = useState<string>('#000000')
  const [colorPickerVisible, setColorPickerVisible] = useState(false)
  const colorPickerButtonRef = useRef<HTMLButtonElement>(null)

  /** iOS 메모 스타일 표: 격자 삽입 + 셀 안 커서 감지 */
  const [tablePickerVisible, setTablePickerVisible] = useState(false)
  const [tablePickerHover, setTablePickerHover] = useState({ row: 0, col: 0 })
  const tablePickerButtonRef = useRef<HTMLButtonElement>(null)
  const [cursorInTable, setCursorInTable] = useState(false)

  // title prop이 변경되면 내부 상태 업데이트
  useEffect(() => {
    setInternalTitle(title)
  }, [title])

  /**
   * autoFocus가 켜진 경우 mount 직후 본문 contenteditable에 focus + 커서를
   * 본문 끝으로 이동. InlineRichText처럼 *명시 액션으로 swap된 후 곧바로
   * 입력*하는 흐름에서 별도 클릭 단계를 없앤다.
   */
  useEffect(() => {
    if (!autoFocus) return
    const node = editorRef.current
    if (!node) return
    // 다음 프레임에 focus — initial DOM hydration이 끝난 후
    const t = window.setTimeout(() => {
      node.focus()
      try {
        const range = document.createRange()
        range.selectNodeContents(node)
        range.collapse(false)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
      } catch {
        /* selection API 미지원 시 focus만 */
      }
    }, 0)
    return () => window.clearTimeout(t)
  }, [autoFocus])

  // 엔티티 링크 관련 상태
  const [entityLinkModalVisible, setEntityLinkModalVisible] = useState(false)
  const [entityLinkQuery, setEntityLinkQuery] = useState('')
  const [entityLinkResults, setEntityLinkResults] = useState<MentionItem[]>([])
  const [entityLinkRemoteLoading, setEntityLinkRemoteLoading] = useState(false)
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
  /** 새 용어 등록 시 "이 문서에만 사용" (documentScope 있을 때만 유효) */
  const [termLinkDocumentOnly, setTermLinkDocumentOnly] = useState(true)
  /** true면 "설명 넣기" 모드: 검색 없이 선택 문구에 문서 전용 설명만 입력 */
  const [termLinkExplanationOnly, setTermLinkExplanationOnly] = useState(false)

  // 용어 수정 모달 (에디터에서 .term 클릭 시)
  const [termEditModalVisible, setTermEditModalVisible] = useState(false)
  const [termEditId, setTermEditId] = useState<string | null>(null)
  const [termEditName, setTermEditName] = useState('')
  const [termEditDesc, setTermEditDesc] = useState('')
  const [termEditLoading, setTermEditLoading] = useState(false)
  /** 문서 전용(설명 넣기) 용어면 true → "설명 수정" 모달로 표시 */
  const [termEditIsDocumentScoped, setTermEditIsDocumentScoped] =
    useState(false)

  // 이미지 설명 모달 관련 상태
  const [imageCaptionModalVisible, setImageCaptionModalVisible] =
    useState(false)
  const [imageCaptionInput, setImageCaptionInput] = useState('')
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null)
  const imageCaptionInputRef = useRef<HTMLInputElement>(null)
  const savedImageInsertRangeRef = useRef<Range | null>(null)
  /** 캡션 편집 모드: 새 이미지 삽입이 아니라 기존 figure의 캡션을 수정 */
  const editingCaptionFigureRef = useRef<HTMLElement | null>(null)

  // 선택된 이미지(figure)와 부유 툴바 위치
  const [selectedFigure, setSelectedFigure] = useState<HTMLElement | null>(null)
  const [imageMenuPos, setImageMenuPos] = useState<{
    top: number
    left: number
  } | null>(null)

  // 단축키 도움말 모달
  const [shortcutsHelpVisible, setShortcutsHelpVisible] = useState(false)

  // 클릭 사운드 훅
  const playClickSound = useClickSound()

  /**
   * 마지막으로 onChange로 부모에 흘려보낸 값 — value-sync effect가 자기가 만든
   * 변경에 반응하지 않도록 비교 기준으로 사용. (이게 없으면 한 글자 입력마다
   * sanitize가 핸들·is-selected 같은 임시 마크업을 떼어 내 부모 value와 DOM
   * innerHTML이 끝없이 어긋나 매 글자마다 innerHTML 전체가 리셋됨)
   */
  const lastEmittedValueRef = useRef<string>('')

  // 에디터 내용 동기화 — 외부에서 value가 바뀐 경우(초기 로드·외부 리셋·복구)에만 DOM 갱신
  useEffect(() => {
    if (!editorRef.current) return
    const incoming = value ?? ''
    if (incoming === lastEmittedValueRef.current) return
    const newContent = resolveRichTextImageSrcsForDisplay(
      sanitizeRichTextHtml(incoming),
    )
    // 다음 user-input 이후 비교 기준으로 쓰기 위해 sanitize한 값을 기록
    lastEmittedValueRef.current = incoming

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
        /* 커서 복원 실패 시 무시 */
      }
    }
  }, [value])

  // 선택된 figure에 is-selected 클래스 토글 + 외부 클릭/ESC/스크롤로 해제
  useEffect(() => {
    if (!selectedFigure) return

    selectedFigure.classList.add('is-selected')

    const updatePosition = () => {
      const rect = selectedFigure.getBoundingClientRect()
      setImageMenuPos({
        top: Math.max(rect.top - 52, 8),
        left: rect.left + rect.width / 2,
      })
    }

    const handleOutsideClick = (e: MouseEvent) => {
      const node = e.target as Node
      if (selectedFigure.contains(node)) return
      // 부유 툴바 안의 클릭은 제외
      const toolbar = document.getElementById('rich-text-image-toolbar')
      if (toolbar && toolbar.contains(node)) return
      setSelectedFigure(null)
      setImageMenuPos(null)
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedFigure(null)
        setImageMenuPos(null)
      } else if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        document.activeElement !== editorRef.current?.parentElement &&
        !(
          document.activeElement instanceof HTMLInputElement ||
          document.activeElement instanceof HTMLTextAreaElement
        )
      ) {
        // 선택된 figure를 삭제 (에디터 내부 텍스트 입력에 영향 없도록 활성 요소 검사)
        e.preventDefault()
        selectedFigure.remove()
        setSelectedFigure(null)
        setImageMenuPos(null)
        if (editorRef.current) {
          const ev = new Event('input', { bubbles: true })
          editorRef.current.dispatchEvent(ev)
        }
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleKey)
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      selectedFigure.classList.remove('is-selected')
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [selectedFigure])

  // 텍스트 선택 감지
  useEffect(() => {
    const handleSelectionChange = () => {
      const editor = editorRef.current
      if (!editor) return
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)
      if (!editor.contains(range.commonAncestorContainer)) return

      const text = range.toString().trim()

      if (text.length > 0) {
        setSelectedText(text)
        setSelectedTextRange(range.cloneRange())
      } else {
        setSelectedText('')
        setSelectedTextRange(null)
        setContextMenuVisible(false)
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

  // 이미지 리사이즈 — 4코너 핸들 + PointerEvent(터치/펜 지원) + rAF 스로틀.
  // 저장 시 width(px)만 인라인으로 박고 height는 figure.aspect-ratio로 산출 →
  // 좁은 화면에서 max-width:100%로 줄어도 비율이 유지됨.
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    type Corner = 'tl' | 'tr' | 'bl' | 'br'
    const HANDLE_CORNERS: Corner[] = ['tl', 'tr', 'bl', 'br']

    let isResizing = false
    let resizeFigure: HTMLElement | null = null
    let resizeImg: HTMLImageElement | null = null
    let activeCorner: Corner = 'br'
    let startX = 0
    let startY = 0
    let startWidth = 0
    let aspectRatio = 1
    let pendingFrame: number | null = null
    let pendingW = 0
    let activePointerId: number | null = null
    const loadHandlers = new Map<HTMLImageElement, EventListener>()
    const dragstartHandlers = new Map<HTMLImageElement, EventListener>()

    const ensureAspectRatio = (figure: HTMLElement, img: HTMLImageElement) => {
      const w = img.naturalWidth || img.offsetWidth
      const h = img.naturalHeight || img.offsetHeight
      if (w > 0 && h > 0 && !img.dataset.aspectRatio) {
        // 비율 마커는 img에 — figure에 두면 figure 박스 자체가 비율로 강제돼
        // 컨테이너 폭이 큰 읽기 뷰에서 빈 공간이 생김.
        img.dataset.aspectRatio = `${w} / ${h}`
        img.style.aspectRatio = `${w} / ${h}`
      }
      // 레거시 데이터 마이그레이션: figure에 aspect-ratio가 박힌 경우 img로 옮기고 figure는 비움
      if (figure.dataset.aspectRatio && !img.dataset.aspectRatio) {
        const ratio = figure.dataset.aspectRatio
        img.dataset.aspectRatio = ratio
        img.style.aspectRatio = ratio
      }
      if (figure.dataset.aspectRatio) {
        delete figure.dataset.aspectRatio
        figure.style.aspectRatio = ''
      }
    }

    const ensureHandles = (figure: HTMLElement) => {
      const existing = figure.querySelectorAll('.resize-handle')
      if (existing.length === HANDLE_CORNERS.length) return
      existing.forEach((el) => el.remove())
      HANDLE_CORNERS.forEach((corner) => {
        const handle = document.createElement('span')
        handle.className = `resize-handle ${corner}`
        handle.setAttribute('contenteditable', 'false')
        handle.dataset.corner = corner
        figure.appendChild(handle)
      })
    }

    const initImage = (img: HTMLImageElement) => {
      const figure = img.closest('figure') as HTMLElement | null
      if (!figure) return

      img.setAttribute('draggable', 'false')
      if (!dragstartHandlers.has(img)) {
        const onDrag: EventListener = (e) => {
          e.preventDefault()
          e.stopPropagation()
        }
        img.addEventListener('dragstart', onDrag)
        dragstartHandlers.set(img, onDrag)
      }
      // 키보드 접근: Tab으로 figure 포커스 가능, aria-label 부여
      if (!figure.hasAttribute('tabindex')) {
        figure.setAttribute('tabindex', '0')
      }
      const captionText = figure.querySelector('figcaption')?.textContent?.trim()
      figure.setAttribute(
        'aria-label',
        captionText ? `이미지: ${captionText}` : '이미지',
      )
      ensureAspectRatio(figure, img)
      ensureHandles(figure)
    }

    const trackImage = (img: HTMLImageElement) => {
      if (img.getAttribute('data-resizable') !== 'true') return
      if (img.complete && img.naturalWidth > 0) {
        initImage(img)
        return
      }
      if (loadHandlers.has(img)) return
      const handler: EventListener = () => {
        const h = loadHandlers.get(img)
        if (h) {
          img.removeEventListener('load', h)
          loadHandlers.delete(img)
        }
        if (img.getAttribute('data-resizable') === 'true') initImage(img)
      }
      img.addEventListener('load', handler)
      loadHandlers.set(img, handler)
    }

    const applyPending = () => {
      pendingFrame = null
      if (!resizeImg || !resizeFigure) return
      const w = Math.round(pendingW)
      // width만 저장 — height는 aspect-ratio로 산출되므로 인라인 height 제거
      resizeImg.style.width = `${w}px`
      resizeImg.style.height = 'auto'
      resizeImg.style.maxWidth = 'none'
      resizeImg.style.maxHeight = ''
      resizeFigure.style.width = `${w}px`
      resizeFigure.style.height = ''
    }

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null
      if (!target?.classList.contains('resize-handle')) return
      const figure = target.closest('figure') as HTMLElement | null
      const img = figure?.querySelector('img') as HTMLImageElement | null
      if (!figure || !img) return

      e.preventDefault()
      e.stopPropagation()

      isResizing = true
      resizeFigure = figure
      resizeImg = img
      activeCorner = (target.dataset.corner as Corner) || 'br'
      startX = e.clientX
      startY = e.clientY
      startWidth = img.offsetWidth
      const startHeight = img.offsetHeight
      aspectRatio =
        startWidth > 0 && startHeight > 0
          ? startHeight / startWidth
          : img.naturalWidth > 0 && img.naturalHeight > 0
            ? img.naturalHeight / img.naturalWidth
            : 1
      activePointerId = e.pointerId
      try {
        target.setPointerCapture?.(e.pointerId)
      } catch {
        /* 무시 — 일부 브라우저에서 capture 실패 가능 */
      }

      figure.classList.add('resizing')
      document.body.style.cursor = window.getComputedStyle(target).cursor
      document.body.style.userSelect = 'none'
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!isResizing || !resizeImg) return
      if (activePointerId !== null && e.pointerId !== activePointerId) return

      const dx = e.clientX - startX
      const dy = e.clientY - startY

      // 코너에 따라 가로/세로 부호가 다름 — 원점이 반대쪽 코너라고 보면 명확
      const xSign = activeCorner === 'tr' || activeCorner === 'br' ? 1 : -1
      const ySign = activeCorner === 'bl' || activeCorner === 'br' ? 1 : -1

      // 비율 유지: x축 변화량과 y축 변화량을 width 기준으로 환산해 평균
      const widthDeltaFromX = dx * xSign
      const widthDeltaFromY = aspectRatio > 0 ? (dy * ySign) / aspectRatio : 0
      const widthDelta = (widthDeltaFromX + widthDeltaFromY) / 2

      const naturalMax = (resizeImg.naturalWidth || startWidth) * 2
      const newWidth = Math.max(
        40,
        Math.min(startWidth + widthDelta, naturalMax),
      )

      pendingW = newWidth
      if (pendingFrame == null) {
        pendingFrame = window.requestAnimationFrame(applyPending)
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      if (!isResizing) return
      if (activePointerId !== null && e.pointerId !== activePointerId) return

      if (pendingFrame != null) {
        window.cancelAnimationFrame(pendingFrame)
        pendingFrame = null
        applyPending()
      }
      if (resizeFigure) resizeFigure.classList.remove('resizing')

      // input 이벤트로 onChange 트리거
      const ev = new Event('input', { bubbles: true })
      editor.dispatchEvent(ev)

      isResizing = false
      resizeFigure = null
      resizeImg = null
      activePointerId = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    // 기존 이미지 처리
    editor
      .querySelectorAll<HTMLImageElement>('img[data-resizable="true"]')
      .forEach(trackImage)

    // 새로 추가되는 이미지 감지
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return
          const element = node as HTMLElement
          if (element.matches?.('img[data-resizable="true"]')) {
            trackImage(element as HTMLImageElement)
          }
          element
            .querySelectorAll?.('img[data-resizable="true"]')
            .forEach((img) => trackImage(img as HTMLImageElement))
        })
      })
    })
    observer.observe(editor, { childList: true, subtree: true })

    editor.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
    document.addEventListener('pointercancel', onPointerUp)

    return () => {
      if (pendingFrame != null) {
        window.cancelAnimationFrame(pendingFrame)
        pendingFrame = null
      }
      observer.disconnect()
      loadHandlers.forEach((handler, img) => {
        img.removeEventListener('load', handler)
      })
      loadHandlers.clear()
      dragstartHandlers.forEach((handler, img) => {
        img.removeEventListener('dragstart', handler)
      })
      dragstartHandlers.clear()
      editor.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
      document.removeEventListener('pointercancel', onPointerUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [])

  // 포맷 상태 업데이트
  const updateFormatState = useCallback(() => {
    if (!editorRef.current) return

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      setCursorInTable(false)
      return
    }

    const range = selection.getRangeAt(0)
    const node = range.commonAncestorContainer

    // 부모 요소 찾기
    let element: HTMLElement | null = null
    if (node.nodeType === Node.TEXT_NODE) {
      element = node.parentElement
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      element = node as HTMLElement
    }

    if (!element) {
      setCursorInTable(false)
      return
    }

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

    // 블록 가운데 정렬 (execCommand·align·computed text-align)
    let alignCenter = false
    try {
      alignCenter = document.queryCommandState('justifyCenter')
    } catch {
      /* Safari 등 */
    }
    if (!alignCenter) {
      let n: HTMLElement | null = element
      while (
        n &&
        editorRef.current.contains(n) &&
        n !== editorRef.current
      ) {
        const ac = n.getAttribute('align')?.toLowerCase()
        if (ac === 'center' || ac === 'middle') {
          alignCenter = true
          break
        }
        const ta = window.getComputedStyle(n).textAlign
        if (ta === 'center' || ta === 'webkit-center') {
          alignCenter = true
          break
        }
        n = n.parentElement
      }
    }
    setIsAlignCenter(alignCenter)

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

    setCursorInTable(
      editorRef.current.contains(element) && element.closest('td, th') !== null,
    )
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

  // 커서( caret )가 보이도록 스크롤 — block:nearest + 부모 scrollIntoView는
  // 긴 단락 하단 입력 시 단락 일부만 보여도 스크롤을 안 해서, rect 기준으로 조상 스크롤을 맞춤
  const scrollCursorIntoView = useCallback(() => {
    if (!editorRef.current) return
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    if (!editorRef.current.contains(range.startContainer)) return

    const margin = 12
    const maxIter = 8

    for (let iter = 0; iter < maxIter; iter++) {
      let rect = range.getBoundingClientRect()
      const clientRects = range.getClientRects()
      if (
        (rect.width === 0 && rect.height === 0) ||
        (rect.height === 0 && clientRects.length > 0)
      ) {
        if (clientRects.length > 0) rect = clientRects[clientRects.length - 1]!
      }
      if (rect.width === 0 && rect.height === 0) return

      let scrolled = false
      let el: HTMLElement | null = editorRef.current

      while (el && el !== document.documentElement) {
        const style = window.getComputedStyle(el)
        const oy = style.overflowY
        const canScrollY =
          el.scrollHeight > el.clientHeight + 1 &&
          (oy === 'auto' || oy === 'scroll' || oy === 'overlay')

        if (canScrollY) {
          const br = el.getBoundingClientRect()
          if (rect.bottom > br.bottom - margin) {
            el.scrollTop += rect.bottom - br.bottom + margin
            scrolled = true
            break
          }
          if (rect.top < br.top + margin) {
            el.scrollTop -= br.top + margin - rect.top
            scrolled = true
            break
          }
        }
        el = el.parentElement
      }

      if (!scrolled) {
        const vh = window.innerHeight
        const vw = window.innerWidth
        if (rect.bottom > vh - margin) {
          window.scrollBy({
            top: rect.bottom - vh + margin,
            left: 0,
            behavior: 'auto',
          })
          scrolled = true
        } else if (rect.top < margin) {
          window.scrollBy({ top: rect.top - margin, left: 0, behavior: 'auto' })
          scrolled = true
        } else if (rect.right > vw - margin) {
          window.scrollBy({
            left: rect.right - vw + margin,
            top: 0,
            behavior: 'auto',
          })
          scrolled = true
        } else if (rect.left < margin) {
          window.scrollBy({
            left: rect.left - margin,
            top: 0,
            behavior: 'auto',
          })
          scrolled = true
        }
      }

      if (!scrolled) break
    }
  }, [])

  // 내용 변경 핸들러
  const handleContentChange = useCallback(() => {
    if (!editorRef.current) return

    const html = sanitizeRichTextHtml(editorRef.current.innerHTML)
    // value-sync effect가 자기가 만든 변경에 반응하지 않도록 — 핸들·임시 클래스가
    // DOM에는 남아 있어도 부모로 흘러간 값과 비교해 같으면 DOM 리셋 안 함.
    lastEmittedValueRef.current = html
    onChange(html)
    updateFormatState()
    requestAnimationFrame(scrollCursorIntoView)
  }, [onChange, updateFormatState, scrollCursorIntoView])

  const insertProseHrBlock = useCallback(
    (hrHtml: string) => {
      playClickSound()
      setTablePickerVisible(false)
      if (!editorRef.current) return
      editorRef.current.focus()
      document.execCommand('insertHTML', false, `${hrHtml}<p><br></p>`)
      const selection = window.getSelection()
      if (selection && editorRef.current) {
        const allPs = editorRef.current.querySelectorAll('p')
        const lastP = allPs[allPs.length - 1]
        if (lastP) {
          const range = document.createRange()
          range.setStart(lastP, 0)
          range.collapse(true)
          selection.removeAllRanges()
          selection.addRange(range)
        }
      }
      handleContentChange()
    },
    [handleContentChange, playClickSound],
  )

  /** figure+img(+선택 figcaption)를 삽입. `rangeRef`는 사용 후 null로 비움. */
  const insertFigureAtCaret = useCallback(
    (
      imageUrl: string,
      caption: string,
      rangeRef: React.MutableRefObject<Range | null>,
    ) => {
      const editor = editorRef.current
      if (!editor || !imageUrl) return

      editor.focus()

      const imageContainer = document.createElement('figure')
      imageContainer.style.margin = '10px 0'
      imageContainer.style.textAlign = 'center'

      const img = document.createElement('img')
      img.src = imageUrl
      img.style.borderRadius = '12px'
      img.style.display = 'block'
      img.style.margin = '0 auto'
      img.style.cursor = 'pointer'
      img.style.userSelect = 'none'
      img.setAttribute('contenteditable', 'false')
      img.setAttribute('draggable', 'false')
      img.setAttribute('data-resizable', 'true')
      img.style.maxWidth = '100%'
      img.style.height = 'auto'
      img.style.width = 'auto'
      img.title = '클릭하여 크기 조절'

      imageContainer.appendChild(img)

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

      const holder = document.createElement('div')
      holder.appendChild(imageContainer)
      const sanitized = sanitizeRichTextHtml(holder.innerHTML)
      if (!sanitized.trim()) {
        console.warn('RichTextEditor: image HTML was removed by sanitize')
        return
      }

      let insertRange: Range | null = null
      if (rangeRef.current) {
        try {
          insertRange = rangeRef.current.cloneRange()
        } catch {
          insertRange = null
        }
      }
      if (!insertRange) {
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          try {
            insertRange = selection.getRangeAt(0).cloneRange()
          } catch {
            insertRange = null
          }
        }
      }

      rangeRef.current = null

      const moveCaretAfter = (node: Node) => {
        const spaceText = document.createTextNode('\u200B')
        node.parentNode?.insertBefore(spaceText, node.nextSibling)
        const newRange = document.createRange()
        newRange.setStart(spaceText, 0)
        newRange.collapse(true)
        const selection = window.getSelection()
        if (selection) {
          selection.removeAllRanges()
          selection.addRange(newRange)
        }
      }

      const figureCountBefore = editor.querySelectorAll('figure').length

      try {
        if (insertRange && editor.contains(insertRange.commonAncestorContainer)) {
          const selection = window.getSelection()
          if (selection) {
            selection.removeAllRanges()
            selection.addRange(insertRange)
          }
          const ok = document.execCommand('insertHTML', false, sanitized)
          if (!ok) {
            editor.insertAdjacentHTML('beforeend', sanitized)
          }
          const figuresAfter = editor.querySelectorAll('figure')
          const newFig = figuresAfter[figureCountBefore]
          if (newFig && editor.contains(newFig)) moveCaretAfter(newFig)
        } else {
          editor.insertAdjacentHTML('beforeend', sanitized)
          const figuresAfter = editor.querySelectorAll('figure')
          const newFig = figuresAfter[figureCountBefore]
          if (newFig) moveCaretAfter(newFig)
        }
      } catch (err) {
        console.warn('RichTextEditor: insertHTML failed, appending', err)
        editor.insertAdjacentHTML('beforeend', sanitized)
        const figuresAfter = editor.querySelectorAll('figure')
        const newFig = figuresAfter[figureCountBefore]
        if (newFig) moveCaretAfter(newFig)
      }

      updateFormatState()
      handleContentChange()
      editor.focus()
    },
    [handleContentChange, updateFormatState],
  )

  // 붙여넣기: 외부 웹 등에서 복사한 HTML 서식은 넣지 않고 평문만 삽입 (같은 에디터 내 복사도 동일)
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      const clipboardData = e.clipboardData
      if (clipboardData.files && clipboardData.files.length > 0) {
        const imageFile = Array.from(clipboardData.files).find((f) =>
          f.type.startsWith('image/'),
        )
        if (imageFile) {
          e.preventDefault()
          if (!onImageUpload) {
            toast.error(
              '이 필드는 이미지 업로드를 쓰지 않습니다. 이미지는 사진·썸네일 등 업로드가 있는 항목에서 넣어 주세요.',
            )
            return
          }
          // validateImageFile은 MIME·확장자·사이즈를 모두 검증한다 — 사이즈 별도 체크 X.
          try {
            validateImageFile(imageFile)
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : '이미지 파일이 아닙니다.',
            )
            return
          }
          void (async () => {
            const editor = editorRef.current
            if (!editor) return
            const selection = window.getSelection()
            if (
              selection?.rangeCount &&
              editor.contains(selection.getRangeAt(0).commonAncestorContainer)
            ) {
              savedImageInsertRangeRef.current = selection
                .getRangeAt(0)
                .cloneRange()
            } else {
              const range = document.createRange()
              range.selectNodeContents(editor)
              range.collapse(false)
              savedImageInsertRangeRef.current = range
            }
            try {
              const rawUrl = await onImageUpload(imageFile)
              const imageUrl = (getUploadImageUrl(rawUrl) || rawUrl || '').trim()
              if (!imageUrl) {
                toast.error('이미지 URL을 받지 못했습니다.')
                return
              }
              insertFigureAtCaret(
                imageUrl,
                '',
                savedImageInsertRangeRef,
              )
            } catch (err) {
              const message =
                err instanceof Error
                  ? err.message
                  : '이미지 업로드에 실패했습니다.'
              console.error('RichTextEditor paste image upload:', err)
              toast.error(message)
            }
          })()
          return
        }
        return
      }

      let text = clipboardData.getData('text/plain')
      if (text == null) text = ''
      if (!text.trim()) {
        const html = clipboardData.getData('text/html')
        if (html) {
          const temp = document.createElement('div')
          temp.innerHTML = html
          text = temp.textContent || temp.innerText || ''
        }
      }

      e.preventDefault()
      if (!text) {
        handleContentChange()
        return
      }

      // 단독 URL 페이스트 → 자동 a 태그
      const trimmed = text.trim()
      const urlOnly =
        /^(?:https?:\/\/|www\.)[^\s<>"]+$/i.test(trimmed) && trimmed === text
      if (urlOnly) {
        const href = trimmed.startsWith('www.') ? `https://${trimmed}` : trimmed
        const safeText = trimmed.replace(/[&<>"']/g, (c) =>
          c === '&'
            ? '&amp;'
            : c === '<'
              ? '&lt;'
              : c === '>'
                ? '&gt;'
                : c === '"'
                  ? '&quot;'
                  : '&#39;',
        )
        try {
          document.execCommand(
            'insertHTML',
            false,
            `<a href="${href}" target="_blank" rel="noopener noreferrer">${safeText}</a>`,
          )
        } catch {
          document.execCommand('insertText', false, text)
        }
        handleContentChange()
        return
      }

      try {
        document.execCommand('insertText', false, text)
      } catch {
        const sel = window.getSelection()
        if (sel?.rangeCount) {
          const range = sel.getRangeAt(0)
          range.deleteContents()
          const node = document.createTextNode(text)
          range.insertNode(node)
          range.setStartAfter(node)
          range.collapse(true)
          sel.removeAllRanges()
          sel.addRange(range)
        }
      }
      handleContentChange()
    },
    [handleContentChange, onImageUpload, insertFigureAtCaret],
  )

  // 키 입력 핸들러 (Tab 들여쓰기, Ctrl+B 등)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // Tab: 표 안에서는 셀 이동(마지막 셀에서 Tab → 행 추가), 목록 안에서는 들여쓰기
      if (e.key === 'Tab') {
        const native = e.nativeEvent as KeyboardEvent
        if (native.isComposing) return
        const root = editorRef.current
        if (!root) return
        const sel = window.getSelection()
        if (!sel?.rangeCount) return
        const range = sel.getRangeAt(0)
        let startNode: Node | null = range.startContainer
        if (startNode.nodeType === Node.TEXT_NODE)
          startNode = startNode.parentElement
        const cell =
          startNode instanceof Element
            ? (startNode.closest('td, th') as HTMLTableCellElement | null)
            : null

        if (cell && root.contains(cell)) {
          e.preventDefault()
          e.stopPropagation()
          const table = cell.closest('table') as HTMLTableElement | null
          if (!table) return
          const cellsOrdered = getOrderedTableCells(table)
          const idx = cellsOrdered.indexOf(cell)
          if (idx < 0) return
          if (e.shiftKey) {
            if (idx > 0) focusTableCell(cellsOrdered[idx - 1])
          } else if (idx < cellsOrdered.length - 1) {
            focusTableCell(cellsOrdered[idx + 1])
          } else {
            richTableAddRowBelow(cell)
            const newTr = cell.parentElement?.nextElementSibling as
              | HTMLTableRowElement
              | undefined
            const firstCell = newTr?.cells[0]
            if (firstCell) focusTableCell(firstCell as HTMLTableCellElement)
          }
          handleContentChange()
          updateFormatState()
          return
        }

        let listNode: Node | null = range.startContainer
        if (listNode.nodeType === Node.TEXT_NODE)
          listNode = listNode.parentElement
        const listItem =
          listNode instanceof Element ? listNode.closest('li') : null

        if (
          !listItem ||
          !root.contains(listItem) ||
          !listItem.closest('ul, ol')
        ) {
          return
        }
        e.preventDefault()
        e.stopPropagation()
        try {
          document.execCommand(e.shiftKey ? 'outdent' : 'indent', false)
        } catch {
          /* noop */
        }
        handleContentChange()
        updateFormatState()
        return
      }

      // 마크다운 단축 (줄 시작에서):
      //   "* " / "- "    → 순서없는 목록
      //   "1. "          → 순서있는 목록
      //   "# ", "## "…   → h1, h2, h3
      //   "> "           → blockquote
      //   "--- "         → 수평선
      //   URL 직후 스페이스 → a 태그 자동 변환
      // (이미 목록·표·코드블록 안이면 비활성)
      if (
        e.key === ' ' &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        const editor = editorRef.current
        const sel = window.getSelection()
        if (
          editor &&
          sel &&
          sel.rangeCount > 0 &&
          sel.isCollapsed &&
          editor.contains(sel.getRangeAt(0).startContainer)
        ) {
          const range = sel.getRangeAt(0)
          const startEl =
            range.startContainer.nodeType === Node.ELEMENT_NODE
              ? (range.startContainer as Element)
              : range.startContainer.parentElement
          const insideExcluded = startEl?.closest(
            'ul, ol, li, pre, code, table',
          )
          if (!insideExcluded) {
            const block =
              (startEl?.closest(
                'p, div, h1, h2, h3, h4, h5, h6, blockquote',
              ) as HTMLElement | null) ?? null
            const effectiveBlock =
              block && block !== editor ? block : editor
            const blockRange = document.createRange()
            blockRange.setStart(effectiveBlock, 0)
            blockRange.setEnd(range.startContainer, range.startOffset)
            const textBefore = blockRange.toString()

            // 1) 목록·헤딩·인용·수평선 트리거
            let blockTransform:
              | { kind: 'list'; cmd: 'insertUnorderedList' | 'insertOrderedList' }
              | { kind: 'heading'; level: 1 | 2 | 3 }
              | { kind: 'quote' }
              | { kind: 'hr' }
              | null = null
            if (textBefore === '*' || textBefore === '-') {
              blockTransform = { kind: 'list', cmd: 'insertUnorderedList' }
            } else if (textBefore === '1.') {
              blockTransform = { kind: 'list', cmd: 'insertOrderedList' }
            } else if (textBefore === '#') {
              blockTransform = { kind: 'heading', level: 1 }
            } else if (textBefore === '##') {
              blockTransform = { kind: 'heading', level: 2 }
            } else if (textBefore === '###') {
              blockTransform = { kind: 'heading', level: 3 }
            } else if (textBefore === '>') {
              blockTransform = { kind: 'quote' }
            } else if (textBefore === '---') {
              blockTransform = { kind: 'hr' }
            }

            if (blockTransform) {
              e.preventDefault()
              blockRange.deleteContents()
              if (blockTransform.kind === 'list') {
                document.execCommand(blockTransform.cmd, false)
              } else if (blockTransform.kind === 'heading') {
                document.execCommand(
                  'formatBlock',
                  false,
                  `H${blockTransform.level}`,
                )
              } else if (blockTransform.kind === 'quote') {
                document.execCommand('formatBlock', false, 'BLOCKQUOTE')
              } else if (blockTransform.kind === 'hr') {
                document.execCommand(
                  'insertHTML',
                  false,
                  `${PROSE_HR_HTML}<p><br></p>`,
                )
              }
              handleContentChange()
              updateFormatState()
              return
            }

            // 2) URL 자동 링크 — 캐럿 직전이 공백 없는 http(s)://… 또는 www.… 인 경우.
            //    block 안 상관없이, 단어 단위로 검사.
            const wordMatch = textBefore.match(
              /(^|\s)((?:https?:\/\/|www\.)[^\s<>"]+[^\s<>".,!?;:'"()])$/,
            )
            if (wordMatch) {
              const url = wordMatch[2]
              const href = url.startsWith('www.') ? `https://${url}` : url
              const urlStartIdx = (textBefore.length - url.length) | 0
              // urlStartIdx부터 캐럿까지를 링크로 감싸기
              const urlRange = document.createRange()
              urlRange.setStart(effectiveBlock, 0)
              urlRange.collapse(true)
              // urlStartIdx 만큼 텍스트 오프셋 이동 — TreeWalker로 텍스트 순회
              let consumed = 0
              const walker = document.createTreeWalker(
                effectiveBlock,
                NodeFilter.SHOW_TEXT,
              )
              let urlStartNode: Node | null = null
              let urlStartOffset = 0
              for (
                let n: Node | null = walker.nextNode();
                n;
                n = walker.nextNode()
              ) {
                const t = (n as Text).data
                if (consumed + t.length >= urlStartIdx) {
                  urlStartNode = n
                  urlStartOffset = urlStartIdx - consumed
                  break
                }
                consumed += t.length
              }
              if (urlStartNode) {
                e.preventDefault()
                const linkRange = document.createRange()
                linkRange.setStart(urlStartNode, urlStartOffset)
                linkRange.setEnd(range.startContainer, range.startOffset)
                const linkText = linkRange.toString()
                linkRange.deleteContents()
                const a = document.createElement('a')
                a.href = href
                a.target = '_blank'
                a.rel = 'noopener noreferrer'
                a.textContent = linkText
                linkRange.insertNode(a)
                // 링크 뒤로 캐럿 + 스페이스 한 칸
                const space = document.createTextNode(' ')
                a.parentNode?.insertBefore(space, a.nextSibling)
                const newRange = document.createRange()
                newRange.setStart(space, 1)
                newRange.collapse(true)
                sel.removeAllRanges()
                sel.addRange(newRange)
                handleContentChange()
                return
              }
            }
          }
        }
      }

      // 빈 list-item에서 Enter/Backspace → 목록 탈출
      if (
        (e.key === 'Enter' || e.key === 'Backspace') &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        const selection = window.getSelection()
        if (
          selection?.rangeCount &&
          selection.isCollapsed &&
          editorRef.current?.contains(selection.getRangeAt(0).startContainer)
        ) {
          const r = selection.getRangeAt(0)
          const startEl =
            r.startContainer.nodeType === Node.ELEMENT_NODE
              ? (r.startContainer as Element)
              : r.startContainer.parentElement
          const li = startEl?.closest('li')
          if (li && editorRef.current.contains(li)) {
            const liText = (li.textContent ?? '').replace(/​/g, '')
            const liEmpty = liText.trim() === ''
            const atStart = e.key === 'Backspace' && r.startOffset === 0
            // Enter: 빈 li → 목록 종료
            // Backspace: 빈 li 또는 li 시작에서 → 목록 종료
            if (
              (e.key === 'Enter' && liEmpty) ||
              (e.key === 'Backspace' && (liEmpty || atStart))
            ) {
              e.preventDefault()
              const list = li.closest('ul, ol')
              const p = document.createElement('p')
              p.innerHTML = '<br>'
              if (list && list.parentNode) {
                // 마지막 li면 목록 뒤에 단락; 중간 li면 목록을 분할하지 않고 단순히 li 제거 + 단락 삽입
                if (li === list.lastElementChild) {
                  list.parentNode.insertBefore(p, list.nextSibling)
                  li.remove()
                  if (!list.firstElementChild) list.remove()
                } else {
                  // 중간 li 탈출: 목록 분할 (간단히 li를 제거하고 위 목록 뒤에 p, 그 뒤에 새 목록)
                  list.parentNode.insertBefore(p, list.nextSibling)
                  // 이후 li들을 새 목록에 옮김
                  const newList = document.createElement(list.tagName)
                  let next = li.nextElementSibling
                  while (next) {
                    const n = next.nextElementSibling
                    newList.appendChild(next)
                    next = n
                  }
                  if (newList.firstElementChild) {
                    p.parentNode?.insertBefore(newList, p.nextSibling)
                  }
                  li.remove()
                }
                const newRange = document.createRange()
                newRange.setStart(p, 0)
                newRange.collapse(true)
                selection.removeAllRanges()
                selection.addRange(newRange)
                handleContentChange()
                updateFormatState()
                return
              }
            }
          }
        }
      }

      // prose-hr div 안에서 Enter 시 복제 방지: 다음 빈 단락으로 이동
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          let node: Node | null = selection.getRangeAt(0).startContainer
          while (node && node !== editorRef.current) {
            if (
              node instanceof HTMLElement &&
              node.classList.contains('prose-hr')
            ) {
              e.preventDefault()
              // prose-hr 뒤에 빈 단락 삽입 후 커서 이동
              const p = document.createElement('p')
              p.innerHTML = '<br>'
              node.after(p)
              const range = document.createRange()
              range.setStart(p, 0)
              range.collapse(true)
              selection.removeAllRanges()
              selection.addRange(range)
              handleContentChange()
              return
            }
            node = node.parentNode
          }
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
        if (e.key === '/') {
          e.preventDefault()
          setShortcutsHelpVisible((v) => !v)
          return
        }
      }
    },
    [applyFormat, handleContentChange, updateFormatState],
  )

  // 이미지 업로드 — 툴바 버튼 경로. paste 경로(handlePaste)와 동일한 검증·토스트 정책.
  const handleImageUpload = useCallback(async () => {
    if (!onImageUpload) return

    const input = document.createElement('input')
    input.setAttribute('type', 'file')
    input.setAttribute('accept', 'image/*')
    input.click()

    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return

      // validateImageFile이 MIME·확장자·사이즈를 모두 검증한다.
      try {
        validateImageFile(file)
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : '이미지 파일이 아닙니다.',
        )
        return
      }

      try {
        const rawUrl = await onImageUpload(file)
        const imageUrl = (getUploadImageUrl(rawUrl) || rawUrl || '').trim()
        if (!imageUrl) {
          toast.error('이미지 URL을 받지 못했습니다.')
          return
        }
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
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '이미지 업로드에 실패했습니다.'
        console.error('RichTextEditor button image upload:', err)
        toast.error(message)
      }
    }
  }, [onImageUpload])

  // 이미지 설명 모달에서 확인 버튼 클릭 — 새 삽입 또는 기존 figure 캡션 수정
  const handleImageCaptionConfirm = useCallback(() => {
    if (!editorRef.current) return

    const caption = imageCaptionInput.trim()
    const editingFigure = editingCaptionFigureRef.current

    if (editingFigure) {
      // 기존 figure 캡션 편집
      let figcaption = editingFigure.querySelector(':scope > figcaption')
      if (caption) {
        if (!figcaption) {
          figcaption = document.createElement('figcaption')
          editingFigure.appendChild(figcaption)
        }
        figcaption.textContent = caption
      } else if (figcaption) {
        figcaption.remove()
      }
      editingCaptionFigureRef.current = null
      const ev = new Event('input', { bubbles: true })
      editorRef.current.dispatchEvent(ev)
    } else if (pendingImageUrl) {
      insertFigureAtCaret(pendingImageUrl, caption, savedImageInsertRangeRef)
    }

    setImageCaptionModalVisible(false)
    setImageCaptionInput('')
    setPendingImageUrl(null)
  }, [pendingImageUrl, imageCaptionInput, insertFigureAtCaret])

  // 이미지 설명 모달 닫기
  const handleImageCaptionCancel = useCallback(() => {
    setImageCaptionModalVisible(false)
    setImageCaptionInput('')
    setPendingImageUrl(null)
    editingCaptionFigureRef.current = null
  }, [])

  // === 이미지 부유 툴바 액션 ===

  /** input 이벤트 트리거 — onChange 흘려보내기 */
  const dispatchEditorInput = useCallback(() => {
    if (editorRef.current) {
      const ev = new Event('input', { bubbles: true })
      editorRef.current.dispatchEvent(ev)
    }
  }, [])

  const handleImageAlign = useCallback(
    (align: 'left' | 'center' | 'right') => {
      if (!selectedFigure) return
      selectedFigure.dataset.align = align
      dispatchEditorInput()
    },
    [selectedFigure, dispatchEditorInput],
  )

  const handleImageWidthPreset = useCallback(
    (percent: number) => {
      if (!selectedFigure) return
      const img = selectedFigure.querySelector('img') as HTMLImageElement | null
      if (!img) return
      // 백분율로 저장 → 반응형
      selectedFigure.style.width = `${percent}%`
      selectedFigure.style.height = ''
      img.style.width = '100%'
      img.style.height = 'auto'
      img.style.maxWidth = 'none'
      img.style.maxHeight = ''
      dispatchEditorInput()
    },
    [selectedFigure, dispatchEditorInput],
  )

  const handleImageResetSize = useCallback(() => {
    if (!selectedFigure) return
    const img = selectedFigure.querySelector('img') as HTMLImageElement | null
    if (!img) return
    selectedFigure.style.width = ''
    selectedFigure.style.height = ''
    img.style.width = ''
    img.style.height = ''
    img.style.maxWidth = ''
    img.style.maxHeight = ''
    dispatchEditorInput()
  }, [selectedFigure, dispatchEditorInput])

  const handleImageEditCaption = useCallback(() => {
    if (!selectedFigure) return
    const fig = selectedFigure.querySelector(':scope > figcaption')
    editingCaptionFigureRef.current = selectedFigure
    setImageCaptionInput(fig?.textContent ?? '')
    setImageCaptionModalVisible(true)
  }, [selectedFigure])

  const handleImageDelete = useCallback(() => {
    if (!selectedFigure) return
    selectedFigure.remove()
    setSelectedFigure(null)
    setImageMenuPos(null)
    dispatchEditorInput()
  }, [selectedFigure, dispatchEditorInput])

  const entityLinkUsable = Boolean(mentionEntities) || entityLinkRemote

  /** 클라이언트에 넘긴 목록만으로 검색 (폴백·빈 검색어 샘플) */
  const runClientEntitySearch = useCallback(
    (query: string) => {
      if (!mentionEntities) {
        setEntityLinkResults([])
        setEntityLinkSelectedIndex(0)
        return
      }
      const results = searchMentionEntities(query, {
        persons: mentionEntities.persons as never[],
        events: mentionEntities.events as never[],
        countries: mentionEntities.countries as never[],
        historicalCountries: mentionEntities.historicalCountries as never[],
        militaryUnits: mentionEntities.militaryUnits as never[],
        dynasties: mentionEntities.dynasties as never[],
        politicalParties: mentionEntities.politicalParties as never[],
      })
      setEntityLinkResults(results.slice(0, 30))
      setEntityLinkSelectedIndex(0)
    },
    [mentionEntities],
  )

  // 엔티티 링크 모달 열기 (열 때 부모에 알려 서버에서 엔티티 다시 불러오기)
  const handleOpenEntityLinkModal = useCallback(() => {
    setContextMenuVisible(false)
    if (!entityLinkUsable) {
      toast.error(
        '이 편집기에서는 엔티티 연결을 쓸 수 없습니다. 서버 검색을 켜거나(기본) 인물·사건 목록을 넘겨 주세요.',
      )
      return
    }
    onEntityModalOpen?.()
    setEntityLinkModalVisible(true)
    setEntityLinkQuery('')
  }, [entityLinkUsable, onEntityModalOpen])

  /** 원격 검색 + 클라이언트 폴백 */
  useEffect(() => {
    if (!entityLinkModalVisible) return

    if (!entityLinkRemote) {
      runClientEntitySearch(entityLinkQuery)
      return
    }

    const q = entityLinkQuery.trim()
    if (q.length === 0) {
      if (mentionEntities) {
        runClientEntitySearch('')
      } else {
        setEntityLinkResults([])
        setEntityLinkSelectedIndex(0)
      }
      setEntityLinkRemoteLoading(false)
      return
    }

    setEntityLinkRemoteLoading(true)
    const ac = new AbortController()
    const t = window.setTimeout(() => {
      fetchEntityLinkSearch({
        q,
        countryId: entityLinkCountryId,
        signal: ac.signal,
      })
        .then((rows) => {
          setEntityLinkResults(
            mapEntityLinkRowsToMentionItems(rows).slice(0, 40),
          )
          setEntityLinkSelectedIndex(0)
        })
        .catch((err: unknown) => {
          const aborted =
            (err instanceof DOMException && err.name === 'AbortError') ||
            (typeof err === 'object' &&
              err !== null &&
              'name' in err &&
              (err as { name: string }).name === 'AbortError')
          if (aborted) return
          toast.error(
            '서버 검색에 실패했습니다. 로컬 목록으로 다시 시도합니다.',
          )
          if (mentionEntities) {
            runClientEntitySearch(entityLinkQuery)
          } else {
            setEntityLinkResults([])
            setEntityLinkSelectedIndex(0)
          }
        })
        .finally(() => setEntityLinkRemoteLoading(false))
    }, ENTITY_SEARCH_DEBOUNCE_MS)
    return () => {
      window.clearTimeout(t)
      ac.abort()
    }
  }, [
    entityLinkModalVisible,
    entityLinkRemote,
    entityLinkQuery,
    entityLinkCountryId,
    mentionEntities,
    runClientEntitySearch,
  ])

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
      const partyCountryId = (item.data as { countryId?: string | null } | null)
        ?.countryId
      if (item.type === 'politicalParty' && partyCountryId) {
        entitySpan.setAttribute(
          'data-entity-country-id',
          String(partyCountryId),
        )
      }
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
              const range = sel.getRangeAt(0)
              // 엔티티 링크 내부에 있는지 확인
              let walkNode: Node | HTMLElement | null = range.startContainer
              if (walkNode.nodeType === Node.TEXT_NODE) {
                walkNode = walkNode.parentElement || walkNode
              }
              if ((walkNode as HTMLElement).closest?.('.entity-link')) {
                // 엔티티 링크 내부에 있으면 밖으로 이동
                const entityLink = (walkNode as HTMLElement).closest(
                  '.entity-link',
                )
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

  // 용어 연결: 검색 (documentScope 있으면 전역 + 해당 문서 전용 용어 함께 조회)
  const searchTermLinks = useCallback(
    async (query: string) => {
      try {
        const params: Parameters<typeof getGlossaryTerms>[0] = {}
        if (query) params['q'] = query
        if (documentScope?.type === 'post') params.postId = documentScope.id
        if (documentScope?.type === 'event') params.eventId = documentScope.id
        const list = await getGlossaryTerms(params)
        setTermLinkResults(list)
        setTermLinkSelectedIndex(0)
      } catch {
        setTermLinkResults([])
      }
    },
    [documentScope],
  )

  const handleOpenTermLinkModal = useCallback(() => {
    setContextMenuVisible(false)
    setTermLinkExplanationOnly(false)
    setTermLinkModalVisible(true)
    setTermLinkNewName(selectedText)
    setTermLinkNewDesc('')
    setTermLinkDocumentOnly(true)
    setTermLinkQuery('')
    setTermLinkResults([])
  }, [selectedText])

  /** 설명 넣기: 이 문서에서만 쓰는 설명만 입력 (용어 검색 없음) — documentScope 있을 때만 노출 */
  const handleOpenExplanationModal = useCallback(() => {
    if (!documentScope) return
    setContextMenuVisible(false)
    setTermLinkExplanationOnly(true)
    setTermLinkModalVisible(true)
    setTermLinkNewName(selectedText)
    setTermLinkNewDesc('')
    setTermLinkDocumentOnly(true)
    setTermLinkQuery('')
    setTermLinkResults([])
  }, [selectedText, documentScope])

  const handleCloseTermLinkModal = useCallback(() => {
    setTermLinkModalVisible(false)
    setTermLinkExplanationOnly(false)
    setTermLinkQuery('')
    setTermLinkResults([])
    setTermLinkNewName('')
    setTermLinkNewDesc('')
    setTermLinkDocumentOnly(true)
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
      const dto: Parameters<typeof createGlossaryTerm>[0] = {
        name,
        description: termLinkNewDesc.trim() || null,
      }
      if (documentScope && termLinkDocumentOnly) {
        if (documentScope.type === 'post') dto.postId = documentScope.id
        if (documentScope.type === 'event') dto.eventId = documentScope.id
      }
      const term = await createGlossaryTerm(dto)
      insertTermLink(term)
    } catch (err) {
      console.error('용어 등록 실패:', err)
    }
  }, [
    termLinkNewName,
    termLinkNewDesc,
    termLinkDocumentOnly,
    documentScope,
    selectedTextRange,
    insertTermLink,
  ])

  // 에디터 내 .term 클릭 → 수정 모달
  /** figure를 선택 상태로 만들고 부유 툴바 위치 계산 — 클릭/포커스/Enter 공통 진입점 */
  const focusFigure = useCallback((figure: HTMLElement) => {
    const rect = figure.getBoundingClientRect()
    setSelectedFigure(figure)
    setImageMenuPos({
      top: Math.max(rect.top - 52, 8),
      left: rect.left + rect.width / 2,
    })
  }, [])

  const handleEditorContentClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement

    // 1) 이미지(figure>img) 클릭 → figure 선택 + 부유 툴바 표시
    const figure = target.closest('figure')
    const isResizeHandle = target.classList.contains('resize-handle')
    if (figure && !isResizeHandle) {
      const img = figure.querySelector('img[data-resizable="true"]')
      if (img) {
        e.preventDefault()
        e.stopPropagation()
        focusFigure(figure as HTMLElement)
        return
      }
    } else {
      // 이미지 외부 클릭 시 기존 선택 해제
      if (selectedFigure) {
        setSelectedFigure(null)
        setImageMenuPos(null)
      }
    }

    // 2) 용어(.term) 클릭 — 기존 동작
    const el = target.closest('.term')
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
        setTermEditIsDocumentScoped(!!(t.postId || t.eventId))
      })
      .catch(() => {
        setTermEditModalVisible(false)
      })
      .finally(() => setTermEditLoading(false))
  }, [selectedFigure, focusFigure])

  const handleCloseTermEditModal = useCallback(() => {
    setTermEditModalVisible(false)
    setTermEditId(null)
    setTermEditName('')
    setTermEditDesc('')
    setTermEditIsDocumentScoped(false)
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

  const handleDeleteTermEdit = useCallback(async () => {
    if (!termEditId || !editorRef.current) return
    if (
      !window.confirm(
        '이 설명을 삭제할까요? 문구는 본문에 남고, 설명(툴팁)만 제거됩니다.',
      )
    )
      return
    setTermEditLoading(true)
    try {
      const span = editorRef.current.querySelector(
        `.term[data-term-id="${termEditId}"]`,
      ) as HTMLElement | null
      if (span && span.parentNode) {
        const parent = span.parentNode
        while (span.firstChild) {
          parent.insertBefore(span.firstChild, span)
        }
        parent.removeChild(span)
        handleContentChange()
      }
      await deleteGlossaryTerm(termEditId)
      handleCloseTermEditModal()
    } catch (err) {
      console.error('설명 삭제 실패:', err)
    } finally {
      setTermEditLoading(false)
    }
  }, [termEditId, handleCloseTermEditModal, handleContentChange])

  // 마우스 우클릭 핸들러 (선택 없어도 메뉴 표시 → "문구 선택 후 사용" 안내)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    // 우클릭 직전 mousedown 등으로 selection이 풀리는 브라우저 대비: 이번 시점 기준으로 다시 캡처
    const sel = window.getSelection()
    if (
      sel &&
      sel.rangeCount > 0 &&
      editorRef.current?.contains(sel.anchorNode)
    ) {
      const range = sel.getRangeAt(0)
      const text = range.toString().trim()
      if (text.length > 0) {
        setSelectedText(text)
        setSelectedTextRange(range.cloneRange())
      }
    }
    setContextMenuPosition({ top: e.clientY, left: e.clientX })
    setContextMenuVisible(true)
  }, [])

  // 이미지 설명 모달이 열릴 때 입력 필드에 포커스
  useEffect(() => {
    if (imageCaptionModalVisible && imageCaptionInputRef.current) {
      setTimeout(() => {
        imageCaptionInputRef.current?.focus()
      }, 100)
    }
  }, [imageCaptionModalVisible])

  /**
   * 이미지 설명 모달이 열려 있을 때 ESC 전역 단축키.
   * input의 onKeyDown에도 ESC가 있지만, 사용자가 input에서 포커스를 잃으면
   * (예: footer 버튼으로 포커스 이동 후) ESC가 안 먹는 회귀를 막는다.
   */
  useEffect(() => {
    if (!imageCaptionModalVisible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleImageCaptionCancel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [imageCaptionModalVisible, handleImageCaptionCancel])

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

  const confirmInsertTable = useCallback(
    (rows: number, cols: number) => {
      if (!editorRef.current) return
      editorRef.current.focus()
      insertRichTableAtSelection(editorRef.current, rows, cols)
      setTablePickerVisible(false)
      setTablePickerHover({ row: 0, col: 0 })
      handleContentChange()
      updateFormatState()
    },
    [handleContentChange, updateFormatState],
  )

  const runTableOp = useCallback(
    (fn: (cell: HTMLTableCellElement) => void) => {
      if (!editorRef.current) return
      const cell = getTableCellFromSelection(editorRef.current)
      if (!cell) return
      editorRef.current.focus()
      fn(cell)
      handleContentChange()
      updateFormatState()
    },
    [handleContentChange, updateFormatState],
  )

  const handleDeleteRichTable = useCallback(() => {
    if (!editorRef.current) return
    const cell = getTableCellFromSelection(editorRef.current)
    if (!cell) return
    if (!window.confirm('표를 삭제할까요?')) return
    editorRef.current.focus()
    const table = cell.closest('table')
    if (!table?.parentNode) return
    const parent = table.parentNode
    const nextSibling = table.nextSibling
    table.remove()
    const p = document.createElement('p')
    p.innerHTML = '<br>'
    if (nextSibling) parent.insertBefore(p, nextSibling)
    else parent.appendChild(p)
    const range = document.createRange()
    range.setStart(p, 0)
    range.collapse(true)
    const sel = window.getSelection()
    if (sel) {
      sel.removeAllRanges()
      sel.addRange(range)
    }
    handleContentChange()
    updateFormatState()
  }, [handleContentChange, updateFormatState])

  useEffect(() => {
    if (!tablePickerVisible) return
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setTablePickerVisible(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tablePickerVisible])

  const bounded = Boolean(maxHeight)
  return (
    <EditorContainer $maxHeight={maxHeight}>
      <EditorWrapper $bounded={bounded}>
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
          $minHeight={minHeight}
          contentEditable
          role="textbox"
          aria-multiline="true"
          aria-label={placeholder}
          data-placeholder={placeholder}
          onInput={handleContentChange}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            // figure에 포커스된 상태에서 Enter → 부유 툴바 열기
            const t = e.target as HTMLElement
            if (
              e.key === 'Enter' &&
              !e.shiftKey &&
              !e.ctrlKey &&
              !e.metaKey &&
              t instanceof HTMLElement &&
              t.tagName === 'FIGURE'
            ) {
              e.preventDefault()
              focusFigure(t)
              return
            }
            handleKeyDown(e)
          }}
          onFocus={(e) => {
            // 키보드 Tab으로 figure에 포커스가 들어오면 자동 선택
            const t = e.target as HTMLElement
            if (t instanceof HTMLElement && t.tagName === 'FIGURE') {
              focusFigure(t)
            }
          }}
          onMouseUp={updateFormatState}
          onKeyUp={updateFormatState}
          onContextMenu={handleContextMenu}
          onClick={handleEditorContentClick}
          $hasTitle={showTitle}
        />
      </EditorWrapper>
      <Toolbar $bounded={bounded}>
        <ToolbarButton
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            playClickSound()
            applyFormat('bold')
          }}
          $active={isBold}
          title="굵게 (Ctrl+B)"
          aria-label="굵게 (Ctrl+B)"
          aria-pressed={isBold}
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
          aria-label="기울임 (Ctrl+I)"
          aria-pressed={isItalic}
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
          aria-label="취소선"
          aria-pressed={isStrike}
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
          aria-label="제목 1"
          aria-pressed={currentHeading === 1}
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
          aria-label="제목 2"
          aria-pressed={currentHeading === 2}
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
          aria-label="제목 3"
          aria-pressed={currentHeading === 3}
        >
          <FiType />
          <span style={{ fontSize: '10px', marginLeft: '2px' }}>3</span>
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            playClickSound()
            applyFormat('justifyLeft')
          }}
          $active={!isAlignCenter}
          title="왼쪽 정렬"
          aria-label="왼쪽 정렬"
          aria-pressed={!isAlignCenter}
        >
          <FiAlignLeft />
        </ToolbarButton>
        <ToolbarButton
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            playClickSound()
            applyFormat('justifyCenter')
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
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            playClickSound()
            applyFormat('insertUnorderedList')
          }}
          $active={isBulletList}
          title="순서 없는 목록"
          aria-label="순서 없는 목록"
          aria-pressed={isBulletList}
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
          aria-label="순서 있는 목록"
          aria-pressed={isOrderedList}
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
          aria-label="링크 삽입/편집"
        >
          <FiLink />
        </ToolbarButton>
        <ToolbarButton
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            playClickSound()
            if (selectedText.length > 0) handleOpenEntityLinkModal()
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
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            playClickSound()
            if (selectedText.length > 0) handleOpenTermLinkModal()
          }}
          disabled={selectedText.length === 0}
          title="용어 연결 (문구 선택 후 클릭)"
          aria-label="용어 연결 (문구 선택 후 클릭)"
        >
          <FiType />
        </ToolbarButton>
        {documentScope ? (
          <ToolbarButton
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              playClickSound()
              if (selectedText.length > 0) handleOpenExplanationModal()
            }}
            disabled={selectedText.length === 0}
            title="설명 넣기 (설명을 달 문구를 선택한 뒤 클릭)"
            aria-label="설명 넣기 (설명을 달 문구를 선택한 뒤 클릭)"
          >
            <FiMessageSquare />
          </ToolbarButton>
        ) : null}
        <ToolbarButton
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            playClickSound()
            handleImageUpload()
          }}
          disabled={!onImageUpload}
          title="이미지 삽입"
          aria-label="이미지 삽입"
        >
          <FiImage />
        </ToolbarButton>
        <ToolbarDivider />
        <div style={{ position: 'relative' }}>
          <ToolbarButton
            ref={tablePickerButtonRef}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation()
              playClickSound()
              setColorPickerVisible(false)
              setTablePickerHover({ row: 0, col: 0 })
              setTablePickerVisible((wasOpen) => !wasOpen)
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
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                playClickSound()
                runTableOp(richTableAddRowAbove)
              }}
              title="행 위에 삽입"
              aria-label="행 위에 삽입"
            >
              <FiChevronUp />
            </ToolbarButton>
            <ToolbarButton
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                playClickSound()
                runTableOp(richTableAddRowBelow)
              }}
              title="행 아래에 삽입"
              aria-label="행 아래에 삽입"
            >
              <FiChevronDown />
            </ToolbarButton>
            <ToolbarButton
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                playClickSound()
                runTableOp(richTableAddColumnLeft)
              }}
              title="열 왼쪽에 삽입"
              aria-label="열 왼쪽에 삽입"
            >
              <FiChevronLeft />
            </ToolbarButton>
            <ToolbarButton
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                playClickSound()
                runTableOp(richTableAddColumnRight)
              }}
              title="열 오른쪽에 삽입"
              aria-label="열 오른쪽에 삽입"
            >
              <FiChevronRight />
            </ToolbarButton>
            <ToolbarButton
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                playClickSound()
                runTableOp(richTableDeleteRow)
              }}
              title="이 행 삭제"
              aria-label="이 행 삭제"
            >
              <FiMinus />
            </ToolbarButton>
            <ToolbarButton
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                playClickSound()
                runTableOp(richTableDeleteColumn)
              }}
              title="이 열 삭제"
              aria-label="이 열 삭제"
            >
              <FiMinus style={{ transform: 'rotate(90deg)' }} />
            </ToolbarButton>
            <ToolbarButton
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                playClickSound()
                handleDeleteRichTable()
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
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            playClickSound()
            applyFormat('formatCode')
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
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation()
              playClickSound()
              setTablePickerVisible(false)
              setColorPickerVisible(!colorPickerVisible)
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
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => insertProseHrBlock(PROSE_HR_HTML)}
          title="수평선 삽입"
          aria-label="수평선 삽입"
        >
          <FiMoreHorizontal />
        </ToolbarButton>
        <ToolbarButton
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => insertProseHrBlock(PROSE_HR_SMALL_HTML)}
          title="작은 수평선 삽입"
          aria-label="작은 수평선 삽입"
        >
          <FiMinus />
        </ToolbarButton>
        {actions && <ToolbarActions>{actions}</ToolbarActions>}
      </Toolbar>
      {/* 색상 선택기 — body 포털 (EditorContainer backdrop-filter가 fixed 기준을 바꿔 뷰포트 좌표와 불일치하는 것 방지) */}
      {typeof document !== 'undefined' &&
        colorPickerVisible &&
        colorPickerButtonRef.current &&
        (() => {
          const rect = colorPickerButtonRef.current!.getBoundingClientRect()
          return createPortal(
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
                  /* fixed + getBoundingClientRect는 뷰포트 기준 — scrollY/X를 더하면 스크롤만큼 어긋남 */
                  top: `${rect.bottom + 8}px`,
                  left: `${rect.left}px`,
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
            </>,
            document.body,
          )
        })()}
      {/* 표 삽입 격자 — body 포털 (색상 선택기와 동일 이유) */}
      {typeof document !== 'undefined' &&
        tablePickerVisible &&
        tablePickerButtonRef.current &&
        (() => {
          const rect = tablePickerButtonRef.current!.getBoundingClientRect()
          return createPortal(
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
                  setTablePickerVisible(false)
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
                <TableInsertPopover>
                  <TableInsertGrid>
                    {Array.from(
                      { length: TABLE_GRID_MAX * TABLE_GRID_MAX },
                      (_, gridIdx) => {
                        const row = Math.floor(gridIdx / TABLE_GRID_MAX)
                        const col = gridIdx % TABLE_GRID_MAX
                        return (
                          <TableInsertCell
                            key={gridIdx}
                            $inSelection={
                              row <= tablePickerHover.row &&
                              col <= tablePickerHover.col
                            }
                            onMouseEnter={() =>
                              setTablePickerHover({ row, col })
                            }
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => confirmInsertTable(row + 1, col + 1)}
                          />
                        )
                      },
                    )}
                  </TableInsertGrid>
                  <TableInsertHint>
                    {tablePickerHover.row + 1} × {tablePickerHover.col + 1}
                  </TableInsertHint>
                </TableInsertPopover>
              </div>
            </>,
            document.body,
          )
        })()}
      {/* 컨텍스트 메뉴 — 모달(overflow:auto) 밖으로 포털해 잘림·가림 방지 */}
      {typeof document !== 'undefined' &&
        createPortal(
          <ContextMenu
            $visible={contextMenuVisible}
            $top={contextMenuPosition.top}
            $left={contextMenuPosition.left}
          >
            {selectedText.length === 0 ? (
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
            <ContextMenuItem
              onClick={() => {
                if (selectedText.length === 0) return
                playClickSound()
                handleOpenEntityLinkModal()
              }}
              disabled={selectedText.length === 0 || !entityLinkUsable}
              title={
                selectedText.length === 0
                  ? '먼저 문구를 선택하세요'
                  : !entityLinkUsable
                    ? '엔티티 연결을 쓸 수 없습니다'
                    : undefined
              }
            >
              <FiLink />
              엔티티 연결
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => {
                if (selectedText.length === 0) return
                playClickSound()
                handleOpenTermLinkModal()
              }}
              disabled={selectedText.length === 0}
              title={
                selectedText.length === 0 ? '먼저 문구를 선택하세요' : undefined
              }
            >
              <FiType />
              용어 연결
            </ContextMenuItem>
            {documentScope ? (
              <ContextMenuItem
                onClick={() => {
                  if (selectedText.length === 0) return
                  playClickSound()
                  handleOpenExplanationModal()
                }}
                disabled={selectedText.length === 0}
                title={
                  selectedText.length === 0
                    ? '먼저 문구를 선택하세요'
                    : '선택한 문구에 이 문서 전용 설명을 붙입니다'
                }
              >
                <FiMessageSquare />
                설명 넣기
              </ContextMenuItem>
            ) : null}
          </ContextMenu>,
          document.body,
        )}

      {/* 이미지 부유 툴바 — 선택된 figure 위에 표시 */}
      {typeof document !== 'undefined' &&
        selectedFigure &&
        imageMenuPos &&
        createPortal(
          <ImageToolbar
            id="rich-text-image-toolbar"
            $top={imageMenuPos.top}
            $left={imageMenuPos.left}
            onMouseDown={(e) => e.preventDefault()}
          >
            {(() => {
              const align = selectedFigure.dataset.align ?? 'center'
              const widthStyle = selectedFigure.style.width || ''
              const widthPercentMatch = /^(\d+(?:\.\d+)?)%$/.exec(widthStyle)
              const widthPercent = widthPercentMatch
                ? Number(widthPercentMatch[1])
                : null
              return (
                <>
                  <ImageToolbarButton
                    title="왼쪽 정렬"
                    aria-label="왼쪽 정렬"
                    $active={align === 'left'}
                    onClick={() => handleImageAlign('left')}
                  >
                    <FiAlignLeft />
                  </ImageToolbarButton>
                  <ImageToolbarButton
                    title="가운데 정렬"
                    aria-label="가운데 정렬"
                    $active={align === 'center'}
                    onClick={() => handleImageAlign('center')}
                  >
                    <FiAlignCenter />
                  </ImageToolbarButton>
                  <ImageToolbarButton
                    title="오른쪽 정렬"
                    aria-label="오른쪽 정렬"
                    $active={align === 'right'}
                    onClick={() => handleImageAlign('right')}
                  >
                    <FiAlignRight />
                  </ImageToolbarButton>
                  <ImageToolbarDivider />
                  {[25, 50, 75, 100].map((pct) => (
                    <ImageToolbarButton
                      key={pct}
                      title={`너비 ${pct}%`}
                      aria-label={`너비 ${pct}%`}
                      $active={widthPercent === pct}
                      onClick={() => handleImageWidthPreset(pct)}
                    >
                      {pct}%
                    </ImageToolbarButton>
                  ))}
                  <ImageToolbarButton
                    title="원본 크기로 복원"
                    aria-label="원본 크기로 복원"
                    onClick={handleImageResetSize}
                  >
                    <FiMaximize2 />
                  </ImageToolbarButton>
                  <ImageToolbarDivider />
                  <ImageToolbarButton
                    title="설명(캡션) 편집"
                    aria-label="설명(캡션) 편집"
                    onClick={handleImageEditCaption}
                  >
                    <FiEdit2 />
                  </ImageToolbarButton>
                  <ImageToolbarButton
                    title="이미지 삭제"
                    aria-label="이미지 삭제"
                    $danger
                    onClick={handleImageDelete}
                  >
                    <FiTrash2 />
                  </ImageToolbarButton>
                </>
              )
            })()}
          </ImageToolbar>,
          document.body,
        )}

      {/* 단축키 도움말 모달 — Ctrl+/ 토글 */}
      {shortcutsHelpVisible &&
        typeof document !== 'undefined' &&
        createPortal(
          <ShortcutsHelpOverlay onClick={() => setShortcutsHelpVisible(false)}>
            <ShortcutsHelpModal onClick={(e) => e.stopPropagation()}>
              <ShortcutsHelpHeader>
                <ShortcutsHelpTitle>키보드 단축키</ShortcutsHelpTitle>
                <ShortcutsHelpClose
                  type="button"
                  onClick={() => setShortcutsHelpVisible(false)}
                  aria-label="닫기"
                >
                  <FiX size={20} />
                </ShortcutsHelpClose>
              </ShortcutsHelpHeader>
              <ShortcutsHelpContent>
                <ShortcutsSection>
                  <ShortcutsSectionTitle>서식</ShortcutsSectionTitle>
                  <ShortcutRow>
                    <kbd>Ctrl/⌘</kbd> + <kbd>B</kbd>
                    <span>굵게</span>
                  </ShortcutRow>
                  <ShortcutRow>
                    <kbd>Ctrl/⌘</kbd> + <kbd>I</kbd>
                    <span>기울임</span>
                  </ShortcutRow>
                  <ShortcutRow>
                    <kbd>Ctrl/⌘</kbd> + <kbd>Z</kbd>
                    <span>실행 취소</span>
                  </ShortcutRow>
                  <ShortcutRow>
                    <kbd>Ctrl/⌘</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd>
                    <span>다시 실행</span>
                  </ShortcutRow>
                </ShortcutsSection>
                <ShortcutsSection>
                  <ShortcutsSectionTitle>마크다운(줄 시작)</ShortcutsSectionTitle>
                  <ShortcutRow>
                    <kbd>*</kbd>/<kbd>-</kbd> + <kbd>Space</kbd>
                    <span>순서 없는 목록</span>
                  </ShortcutRow>
                  <ShortcutRow>
                    <kbd>1.</kbd> + <kbd>Space</kbd>
                    <span>순서 있는 목록</span>
                  </ShortcutRow>
                  <ShortcutRow>
                    <kbd>#</kbd>/<kbd>##</kbd>/<kbd>###</kbd> + <kbd>Space</kbd>
                    <span>제목 1·2·3</span>
                  </ShortcutRow>
                  <ShortcutRow>
                    <kbd>&gt;</kbd> + <kbd>Space</kbd>
                    <span>인용</span>
                  </ShortcutRow>
                  <ShortcutRow>
                    <kbd>---</kbd> + <kbd>Space</kbd>
                    <span>수평선</span>
                  </ShortcutRow>
                  <ShortcutRow>
                    <span style={{ color: '#94a3b8' }}>http://… </span>
                    <span>+ Space → 자동 링크</span>
                  </ShortcutRow>
                </ShortcutsSection>
                <ShortcutsSection>
                  <ShortcutsSectionTitle>목록·표</ShortcutsSectionTitle>
                  <ShortcutRow>
                    <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd>
                    <span>들여쓰기 / 내어쓰기</span>
                  </ShortcutRow>
                  <ShortcutRow>
                    <kbd>Enter</kbd>
                    <span>빈 항목에서 → 목록 종료</span>
                  </ShortcutRow>
                  <ShortcutRow>
                    <kbd>Backspace</kbd>
                    <span>빈/시작 항목에서 → 목록 종료</span>
                  </ShortcutRow>
                </ShortcutsSection>
                <ShortcutsSection>
                  <ShortcutsSectionTitle>이미지</ShortcutsSectionTitle>
                  <ShortcutRow>
                    <kbd>Tab</kbd>
                    <span>이미지 포커스</span>
                  </ShortcutRow>
                  <ShortcutRow>
                    <kbd>Enter</kbd>
                    <span>이미지 툴바 열기</span>
                  </ShortcutRow>
                  <ShortcutRow>
                    <kbd>Delete</kbd>/<kbd>Backspace</kbd>
                    <span>선택한 이미지 삭제</span>
                  </ShortcutRow>
                  <ShortcutRow>
                    <kbd>Esc</kbd>
                    <span>선택 해제</span>
                  </ShortcutRow>
                </ShortcutsSection>
                <ShortcutsSection>
                  <ShortcutsSectionTitle>이 도움말</ShortcutsSectionTitle>
                  <ShortcutRow>
                    <kbd>Ctrl/⌘</kbd> + <kbd>/</kbd>
                    <span>열기/닫기</span>
                  </ShortcutRow>
                </ShortcutsSection>
              </ShortcutsHelpContent>
            </ShortcutsHelpModal>
          </ShortcutsHelpOverlay>,
          document.body,
        )}

      {/* 이미지 설명 입력 모달 — body 포털 (에디터 글래스 박스가 fixed 뷰포트를 깨뜨리는 것 방지) */}
      {imageCaptionModalVisible &&
        typeof document !== 'undefined' &&
        createPortal(
          <ImageCaptionModalOverlay onClick={handleImageCaptionCancel}>
            <ImageCaptionModal onClick={(e) => e.stopPropagation()}>
              <ImageCaptionModalHeader>
                <ImageCaptionModalTitle>
                  {editingCaptionFigureRef.current
                    ? '이미지 설명 편집'
                    : '이미지 설명 추가'}
                </ImageCaptionModalTitle>
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
          </ImageCaptionModalOverlay>,
          document.body,
        )}

      {/* 엔티티 링크 모달 */}
      {entityLinkModalVisible &&
        typeof document !== 'undefined' &&
        createPortal(
          <EntityLinkModalOverlay onClick={handleCloseEntityLinkModal}>
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
                  placeholder="연결할 엔티티 검색 (인물, 사건, 국가, 정당 등)"
                  value={entityLinkQuery}
                  onChange={(e) => {
                    setEntityLinkQuery(e.target.value)
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
                        insertEntityLink(
                          entityLinkResults[entityLinkSelectedIndex],
                        )
                      }
                    } else if (e.key === 'Escape') {
                      e.preventDefault()
                      handleCloseEntityLinkModal()
                    }
                  }}
                  autoFocus
                />

                <EntityLinkResultsList>
                  {mentionEntitiesLoading || entityLinkRemoteLoading ? (
                    <div
                      style={{
                        padding: '24px',
                        textAlign: 'center',
                        color: '#94a3b8',
                        fontSize: '13px',
                      }}
                    >
                      {entityLinkRemote && entityLinkQuery.trim().length > 0
                        ? '서버에서 검색 중입니다…'
                        : '인물·사건·국가·정당 등 목록을 불러오는 중입니다…'}
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
                      {entityLinkQuery.trim() === '' ? (
                        <>
                          {entityLinkRemote && !mentionEntities ? (
                            <>
                              검색어를 한 글자 이상 입력하면 서버에서
                              인물·사건·국가·정당 등을 찾습니다.
                              {entityLinkCountryId ? (
                                <span> (정당은 이 국가 소속만)</span>
                              ) : null}
                            </>
                          ) : (
                            <>
                              연결할 수 있는 항목이 없습니다. (등록된
                              인물·사건·국가·정당 등이 없거나, 이 편집기에 넘긴
                              목록이 비어 있습니다.)
                              <div
                                style={{
                                  fontSize: '11px',
                                  marginTop: '10px',
                                  color: '#cbd5e1',
                                }}
                              >
                                검색어를 입력하면 목록에서 좁혀 볼 수 있습니다.
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        '검색 결과가 없습니다'
                      )}
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
                                      style={{
                                        color: item.color,
                                        flexShrink: 0,
                                      }}
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
                                      style={{
                                        fontSize: '12px',
                                        color: '#64748b',
                                      }}
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
          </EntityLinkModalOverlay>,
          document.body,
        )}

      {/* 용어 연결 / 설명 넣기 모달 */}
      {termLinkModalVisible &&
        typeof document !== 'undefined' &&
        createPortal(
          <TermLinkModalOverlay onClick={handleCloseTermLinkModal}>
            <TermLinkModal onClick={(e) => e.stopPropagation()}>
              <TermLinkModalHeader>
                <TermLinkModalTitle>
                  {termLinkExplanationOnly ? '설명 넣기' : '용어 연결'}
                </TermLinkModalTitle>
                <TermLinkModalClose onClick={handleCloseTermLinkModal}>
                  <FiX size={20} />
                </TermLinkModalClose>
              </TermLinkModalHeader>
              <TermLinkModalContent>
                <div
                  style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}
                >
                  <strong>선택한 문구</strong> &quot;{selectedText}&quot;
                </div>

                {termLinkExplanationOnly ? (
                  /* 설명 넣기: 이 문서에만 쓰는 설명만 입력 */
                  <TermLinkNewSection>
                    <div
                      style={{
                        fontSize: 12,
                        color: '#64748b',
                        marginBottom: 8,
                      }}
                    >
                      읽는 사람이 아래 문구에 마우스를 올리면 이 설명이 툴팁으로
                      표시됩니다.
                    </div>
                    <TermLinkNewLabel>
                      설명 (이 문서에서만 표시)
                    </TermLinkNewLabel>
                    <TermLinkNewTextarea
                      placeholder="선택한 문구에 달 설명을 입력하세요"
                      value={termLinkNewDesc}
                      onChange={(e) => setTermLinkNewDesc(e.target.value)}
                      autoFocus
                    />
                    <TermLinkNewButton
                      $primary
                      type="button"
                      onClick={() => {
                        playClickSound()
                        handleCreateAndLinkTerm()
                      }}
                      disabled={!termLinkNewDesc.trim()}
                    >
                      설명 넣기
                    </TermLinkNewButton>
                  </TermLinkNewSection>
                ) : (
                  <>
                    <TermLinkSearchInput
                      type="text"
                      placeholder="용어 검색 (이름)..."
                      value={termLinkQuery}
                      onChange={(e) => {
                        const nextQuery = e.target.value
                        setTermLinkQuery(nextQuery)
                        searchTermLinks(nextQuery)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault()
                          setTermLinkSelectedIndex((prevIdx) =>
                            prevIdx < termLinkResults.length - 1
                              ? prevIdx + 1
                              : 0,
                          )
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault()
                          setTermLinkSelectedIndex((prevIdx) =>
                            prevIdx > 0
                              ? prevIdx - 1
                              : termLinkResults.length - 1,
                          )
                        } else if (e.key === 'Enter') {
                          e.preventDefault()
                          if (termLinkResults[termLinkSelectedIndex]) {
                            insertTermLink(
                              termLinkResults[termLinkSelectedIndex],
                            )
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
                      <TermLinkNewLabel>
                        새 용어로 등록 후 연결
                      </TermLinkNewLabel>
                      {documentScope ? (
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 10,
                            fontSize: 13,
                            color: '#475569',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={termLinkDocumentOnly}
                            onChange={(e) =>
                              setTermLinkDocumentOnly(e.target.checked)
                            }
                          />
                          이 문서에만 사용 (문서 전용 용어)
                        </label>
                      ) : null}
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
                  </>
                )}
              </TermLinkModalContent>
            </TermLinkModal>
          </TermLinkModalOverlay>,
          document.body,
        )}

      {/* 용어 수정 / 설명 수정 모달 (에디터에서 .term 클릭 시) */}
      {termEditModalVisible &&
        typeof document !== 'undefined' &&
        createPortal(
          <TermLinkModalOverlay onClick={handleCloseTermEditModal}>
            <TermLinkModal onClick={(e) => e.stopPropagation()}>
              <TermLinkModalHeader>
                <TermLinkModalTitle>
                  {termEditIsDocumentScoped ? '설명 수정' : '용어 수정'}
                </TermLinkModalTitle>
                <TermLinkModalClose
                  type="button"
                  onClick={handleCloseTermEditModal}
                >
                  <FiX size={20} />
                </TermLinkModalClose>
              </TermLinkModalHeader>
              <TermLinkModalContent>
                {termEditLoading ? (
                  <div
                    style={{
                      padding: 24,
                      textAlign: 'center',
                      color: '#64748b',
                    }}
                  >
                    불러오는 중…
                  </div>
                ) : termEditIsDocumentScoped ? (
                  /* 문서 전용(설명 넣기) → 문구는 읽기 전용, 설명만 수정 */
                  <>
                    <TermLinkNewLabel>문구</TermLinkNewLabel>
                    <div
                      style={{
                        padding: '10px 12px',
                        background: '#f1f5f9',
                        borderRadius: 8,
                        fontSize: 14,
                        color: '#334155',
                        marginBottom: 12,
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={termEditName}
                    >
                      {termEditName}
                    </div>
                    <TermLinkNewLabel>
                      설명 (이 문서에서만 표시)
                    </TermLinkNewLabel>
                    <TermLinkNewTextarea
                      placeholder="설명을 입력하세요"
                      value={termEditDesc}
                      onChange={(e) => setTermEditDesc(e.target.value)}
                      style={{ minHeight: 120 }}
                    />
                    <div
                      style={{
                        display: 'flex',
                        gap: 10,
                        marginTop: 16,
                        flexWrap: 'wrap',
                      }}
                    >
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
                        disabled={termEditLoading}
                      >
                        저장
                      </TermLinkNewButton>
                      <TermLinkNewButton
                        type="button"
                        onClick={() => {
                          playClickSound()
                          handleDeleteTermEdit()
                        }}
                        disabled={termEditLoading}
                        style={{
                          marginLeft: 'auto',
                          color: '#dc2626',
                          borderColor: '#fecaca',
                          background: '#fef2f2',
                        }}
                      >
                        설명 삭제
                      </TermLinkNewButton>
                    </div>
                  </>
                ) : (
                  <>
                    <TermLinkNewLabel>용어명</TermLinkNewLabel>
                    <TermLinkNewInput
                      placeholder="용어명 (필수)"
                      value={termEditName}
                      onChange={(e) => setTermEditName(e.target.value)}
                    />
                    <TermLinkNewLabel style={{ marginTop: 12 }}>
                      설명
                    </TermLinkNewLabel>
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
          </TermLinkModalOverlay>,
          document.body,
        )}
    </EditorContainer>
  )
}
