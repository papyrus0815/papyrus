/**
 * 리치 텍스트 에디터 컴포넌트
 * 라이브러리 없이 ContentEditable 기반으로 직접 구현
 * 프로젝트 디자인 시스템에 맞춘 커스텀 스타일
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { createPortal } from 'react-dom'

import { toast } from 'react-hot-toast'
import styled, { css } from 'styled-components'

import {
  type GlossaryTermDto,
  createGlossaryTerm,
  deleteGlossaryTerm,
  getGlossaryTermById,
  updateGlossaryTerm,
} from '@/shared/api/glossary'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import type { MentionItem } from '@/shared/lib/mention/mention-system'
import { MENTION_TYPE_CONFIG } from '@/shared/lib/mention/mention-system'
import {
  resolveRichTextImageSrcsForDisplay,
} from '@/shared/lib/rich-text-read-view'
import { sanitizeRichTextHtml } from '@/shared/lib/sanitize-rich-text-html'
import { getUploadImageUrl, validateImageFile } from '@/shared/api/upload'
import { confirm } from '@/shared/ui/confirm-dialog'
import {
  PROSE_HR_HTML,
  proseHrSmallStyles,
  proseHrStyles,
} from '@/shared/styles/prose-hr'
import {
  richTextBlockAlignCss,
  richTextEntityLinkStyles,
  richTextProseListCss,
} from '@/shared/styles/rich-text-readonly-content'
import { Z_INDEX } from '@/shared/styles/z-index'

import { ColorPickerPopover } from './components/color-picker-popover'
import { EditorContextMenu } from './components/editor-context-menu'
import { EditorToolbar } from './components/editor-toolbar'
import { EntityLinkModal } from './components/entity-link-modal'
import { ImageCaptionModal } from './components/image-caption-modal'
import { ImageFloatToolbar } from './components/image-float-toolbar'
import { ShortcutsHelpModal } from './components/shortcuts-help-modal'
import { TablePickerPopover } from './components/table-picker-popover'
import { TermEditModal, TermLinkModal } from './components/term-modals'
import { useEntityLinkSearch } from './hooks/use-entity-link-search'
import { useImageResize } from './hooks/use-image-resize'
import { useTermLinkSearch } from './hooks/use-term-link-search'
import {
  caretRangeFromCharOffset,
  isEmptyRichBlock,
  removeEmptyBlocksBefore,
} from './utils/caret-helpers'
import {
  detectMarkdownBlock,
  detectTrailingUrl,
} from './utils/keyboard-shortcuts'
import {
  TABLE_GRID_MAX,
  focusTableCell,
  getOrderedTableCells,
  getTableCellFromSelection,
  insertRichTableAtSelection,
  richTableAddRowBelow,
} from './utils/table-helpers'

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
    /**
     * 기본 정렬 = 중앙. 읽기 뷰(richTextReadonlyMediaAndTablesCss)의 figure 기본도
     * block+중앙이라 이에 맞춘다. 과거 inline-block 기본은 부모 text-align(좌측)을
     * 따라 좌측에 붙어, 툴바의 기본 표시('center')·읽기 뷰와 어긋났다(이미지를
     * 넣으면 "중앙정렬"인데 에디터에선 좌측에 보이는 문제). width:fit-content로
     * 이미지 폭만큼만 차지해 리사이즈 핸들이 이미지에 밀착하도록 유지.
     */
    margin: 10px auto;
    text-align: center;
    position: relative;
    display: block;
    width: fit-content;
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

  /* 멘션·용어·엔티티 링크 — 읽기 뷰와 공유(richTextEntityLinkStyles) */
  ${richTextEntityLinkStyles}

  /* 🔗 표식은 *편집 중 어포던스* — 에디터에서만 표시(읽기 뷰엔 없음). */
  .entity-link::after {
    content: '🔗';
    font-size: 9px;
    margin-left: 4px;
    opacity: 0.5;
    transition: opacity 0.2s ease;
  }
  .entity-link:hover::after {
    opacity: 1;
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

`

/** 포스트/사건 편집 시 해당 문서에만 쓰는 용어(문서 전용) 지원 */
export type DocumentScope =
  | { type: 'event'; id: string }

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
  /**
   * 본문에 엔티티 링크를 *삽입한 직후* 호출. 사건 상세에서 인물을 링크하면
   * 참여 행위자로 자동 등록하는 등, 링크 행위를 부가 사이드이펙트로 잇기 위한 훅.
   * 본문 저장(commit)과 독립적으로 즉시 발생 — 호출 측에서 타입(person 등) 필터.
   */
  onEntityLink?: (item: MentionItem) => void
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
  /**
   * >0이면 `onChange`(무거운 sanitize 포함)를 이 ms로 디바운스해 긴 본문 입력
   * 지연을 줄인다. 0(기본)이면 매 입력마다 즉시 emit(기존 동작 — 다른 사용처 영향 없음).
   * 디바운스를 켜는 사용처는 저장 직전 `flushRef.current?.()`로 마지막 입력을 반영해야 한다.
   */
  debounceMs?: number
  /**
   * 부모가 대기 중 변경을 즉시 flush하도록 함수를 주입받는 ref(저장 직전 호출).
   * 반환값 = 최신 sanitized html.
   */
  flushRef?: React.MutableRefObject<(() => string | null) | null>
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
  onEntityLink,
  title = '',
  onTitleChange,
  titlePlaceholder = '제목 없음',
  showTitle = false,
  documentScope,
  maxHeight,
  minHeight,
  autoFocus = false,
  actions,
  debounceMs = 0,
  flushRef,
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
   *
   * `preventScroll: true` — 기본 focus()는 focused element를 viewport에
   * 보이게 자동 스크롤한다. 사용자가 페이지 중간에서 ✎을 누른 경우 viewport가
   * RichTextEditor 위치로 점프해 "위로 올라가는" 회귀가 났다. preventScroll로
   * 차단해 사용자의 현재 스크롤 위치를 유지한다.
   */
  useEffect(() => {
    if (!autoFocus) return
    const node = editorRef.current
    if (!node) return
    // 다음 프레임에 focus — initial DOM hydration이 끝난 후
    const t = window.setTimeout(() => {
      node.focus({ preventScroll: true })
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
  const {
    results: entityLinkResults,
    loading: entityLinkRemoteLoading,
    selectedIndex: entityLinkSelectedIndex,
    setSelectedIndex: setEntityLinkSelectedIndex,
    setResults: setEntityLinkResults,
  } = useEntityLinkSearch({
    active: entityLinkModalVisible,
    query: entityLinkQuery,
    remote: entityLinkRemote,
    countryId: entityLinkCountryId,
    mentionEntities,
  })
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
  const {
    results: termLinkResults,
    selectedIndex: termLinkSelectedIndex,
    setSelectedIndex: setTermLinkSelectedIndex,
    setResults: setTermLinkResults,
    search: searchTermLinks,
  } = useTermLinkSearch(documentScope)
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
  /** debounceMs>0일 때 대기 중인 emit 타이머 id. */
  const emitTimerRef = useRef<number | null>(null)

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

    const editor = editorRef.current
    const selection = window.getSelection()
    /**
     * innerHTML을 통째로 교체하면 기존 노드가 detach되어, 교체 전 노드 참조로
     * setStart하면 throw → 커서 유실됐다. 에디터에 *포커스가 있을 때만* caret의
     * 문자 오프셋을 기억해 두고, 교체 후 텍스트 길이로 재계산해 복원한다.
     */
    const focused =
      document.activeElement === editor ||
      editor.contains(document.activeElement)
    let caretOffset: number | null = null
    if (
      focused &&
      selection &&
      selection.rangeCount > 0 &&
      editor.contains(selection.getRangeAt(0).startContainer)
    ) {
      const r = selection.getRangeAt(0)
      const probe = document.createRange()
      probe.selectNodeContents(editor)
      probe.setEnd(r.startContainer, r.startOffset)
      caretOffset = probe.toString().length
    }

    editor.innerHTML = newContent

    if (caretOffset != null && selection) {
      const restored = caretRangeFromCharOffset(editor, caretOffset)
      if (restored) {
        selection.removeAllRanges()
        selection.addRange(restored)
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

  // 이미지 리사이즈 — 4코너 핸들/터치/펜 + rAF 스로틀 (hooks/use-image-resize)
  useImageResize(editorRef)

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

  /**
   * 대기 중인 변경을 *즉시* emit. 부모(InlineRichText 등)가 저장 직전 호출해
   * 디바운스로 지연된 마지막 입력까지 반영한다. 반환값 = 최신 sanitized html.
   */
  const flushPendingChange = useCallback((): string | null => {
    if (!editorRef.current) return null
    if (emitTimerRef.current != null) {
      window.clearTimeout(emitTimerRef.current)
      emitTimerRef.current = null
    }
    const html = sanitizeRichTextHtml(editorRef.current.innerHTML)
    // value-sync effect가 자기가 만든 변경에 반응하지 않도록 — 부모로 흘러간 값과
    // 같으면 DOM 리셋 안 함.
    lastEmittedValueRef.current = html
    onChange(html)
    return html
  }, [onChange])

  // 내용 변경 핸들러
  const handleContentChange = useCallback(() => {
    if (!editorRef.current) return
    // 토글 상태·커서 스크롤은 즉시(가벼움). 무거운 sanitize+onChange만 debounceMs>0이면 디바운스.
    updateFormatState()
    requestAnimationFrame(scrollCursorIntoView)
    if (debounceMs > 0) {
      if (emitTimerRef.current != null) window.clearTimeout(emitTimerRef.current)
      emitTimerRef.current = window.setTimeout(() => {
        emitTimerRef.current = null
        flushPendingChange()
      }, debounceMs)
    } else {
      flushPendingChange()
    }
  }, [updateFormatState, scrollCursorIntoView, debounceMs, flushPendingChange])

  // 부모가 저장 직전 등 즉시 flush할 수 있도록 핸들 노출.
  useEffect(() => {
    if (flushRef) flushRef.current = flushPendingChange
    return () => {
      if (flushRef) flushRef.current = null
    }
  }, [flushRef, flushPendingChange])

  // 언마운트 시에만 대기 중 emit 타이머 정리 — 취소된(예: Esc) 편집이 뒤늦게
  // emit되지 않도록. (deps []라 리렌더로 인한 타이머 조기 해제 없음.)
  useEffect(() => {
    return () => {
      if (emitTimerRef.current != null) window.clearTimeout(emitTimerRef.current)
    }
  }, [])

  // 색상 적용 — 스와치 클릭/네이티브 입력 공통. close=true면 선택기 닫음(스와치만).
  const handleApplyColor = useCallback(
    (color: string, { close }: { close: boolean }) => {
      playClickSound()
      if (!editorRef.current) return
      editorRef.current.focus()
      document.execCommand('foreColor', false, color)
      setCurrentColor(color)
      if (close) setColorPickerVisible(false)
      updateFormatState()
      handleContentChange()
    },
    [playClickSound, updateFormatState, handleContentChange],
  )
  const closeColorPicker = useCallback(() => setColorPickerVisible(false), [])
  const closeTablePicker = useCallback(() => setTablePickerVisible(false), [])
  // 툴바 색/표 피커 토글 — 한쪽을 열면 다른 쪽은 닫는다(교차 닫힘).
  const toggleColorPicker = useCallback(() => {
    setTablePickerVisible(false)
    setColorPickerVisible((wasOpen) => !wasOpen)
  }, [])
  const toggleTablePicker = useCallback(() => {
    setColorPickerVisible(false)
    setTablePickerHover({ row: 0, col: 0 })
    setTablePickerVisible((wasOpen) => !wasOpen)
  }, [])

  const insertProseHrBlock = useCallback(
    (hrHtml: string) => {
      playClickSound()
      setTablePickerVisible(false)
      if (!editorRef.current) return
      editorRef.current.focus()
      const hrCountBefore = editorRef.current.querySelectorAll(
        'hr, .prose-hr',
      ).length
      document.execCommand('insertHTML', false, `${hrHtml}<p><br></p>`)
      // 삽입된 구분선 앞에 분할로 남은 빈 <p> 제거 — 이미지 삽입과 동일한 빈 줄 문제.
      const newHr = editorRef.current.querySelectorAll('hr, .prose-hr')[
        hrCountBefore
      ]
      if (newHr) removeEmptyBlocksBefore(newHr)
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
      // 기본 가운데 정렬 — 인라인 margin auto(좌우)로 확정. 과거 '10px 0'은 좌우 0이라
      // CSS·data-align의 가운데 정렬을 덮어써 좌측에 붙던 문제가 있었음(인라인 우선).
      imageContainer.style.margin = '10px auto'
      imageContainer.style.textAlign = 'center'
      imageContainer.dataset.align = 'center'

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
        const fig = node as HTMLElement

        // \uBCF8\uBB38 \uB4A4 Enter\uB85C \uB9CC\uB4E0 \uBE48 \uC904\uC5D0 \uC774\uBBF8\uC9C0\uB97C \uB123\uC73C\uBA74 execCommand insertHTML\uC774 \uCE90\uB7FF
        // \uC704\uCE58\uC5D0\uC11C \uB2E8\uB77D\uC744 \uBD84\uD560\uD558\uBA70 figure *\uC55E*\uC5D0 \uBE48 <p>\uB97C \uB0A8\uAE34\uB2E4 \u2192 \uBCF8\uBB38\uACFC \uC774\uBBF8\uC9C0 \uC0AC\uC774\uAC00
        // \uBE48 \uC904\uB85C \uBCF4\uC600\uB2E4. figure \uBC14\uB85C \uC55E\uC758 \uBE48 \uBE14\uB85D(\uC5F0\uC18D\uBD84 \uD3EC\uD568)\uC744 \uC81C\uAC70\uD574 \uADF8 \uACF5\uBC31\uC744 \uC5C6\uC564\uB2E4.
        removeEmptyBlocksBefore(fig)

        // \uC774\uC5B4\uC11C \uC785\uB825\uD560 \uB2E8\uB77D\uC744 \uCE90\uB7FF \uBAA9\uC801\uC9C0\uB85C. \uB4A4\uC5D0 \uBE48 \uB2E8\uB77D\uC774 \uC788\uC73C\uBA74 \uC7AC\uC0AC\uC6A9\uD558\uACE0(\uC5F0\uC18D\uBD84\uC740
        // 1\uAC1C\uB85C \uCD95\uC18C), \uB0B4\uC6A9 \uC788\uB294 \uBE14\uB85D\uC774\uBA74 \uADF8 \uC2DC\uC791\uC5D0 \uCE90\uB7FF\uC744 \uB46C \uC774\uBBF8\uC9C0 \uC544\uB798\uC5D0 \uBD88\uD544\uC694\uD55C \uBE48
        // \uC904\uC744 \uB9CC\uB4E4\uC9C0 \uC54A\uB294\uB2E4. \uB4A4\uAC00 \uBE44\uC5C8\uC73C\uBA74(\uC774\uBBF8\uC9C0\uAC00 \uBB38\uC11C \uB05D) \uC774\uC5B4\uC4F8 \uBE48 \uB2E8\uB77D 1\uAC1C\uB97C \uB9CC\uB4E0\uB2E4.
        let trailing = fig.nextElementSibling
        if (!trailing) {
          const p = document.createElement('p')
          p.innerHTML = '<br>'
          fig.after(p)
          trailing = p
        } else if (isEmptyRichBlock(trailing)) {
          while (isEmptyRichBlock(trailing.nextElementSibling)) {
            trailing.nextElementSibling?.remove()
          }
        }

        const newRange = document.createRange()
        if (trailing.firstChild && !isEmptyRichBlock(trailing)) {
          newRange.setStart(trailing.firstChild, 0)
        } else {
          newRange.setStart(trailing, 0)
        }
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
      // IME(한글 등) 조합 중에는 단축키·마크다운 변환을 전부 건너뛴다.
      // 조합 완료용 Space/Enter가 마크다운("# " 등)이나 목록 탈출로 오발화하는 것을 막는다.
      // isComposing을 세팅하지 않는 일부 브라우저 대비 keyCode 229도 함께 가드.
      const nativeKey = e.nativeEvent as KeyboardEvent
      if (nativeKey.isComposing || nativeKey.keyCode === 229) return
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
            const blockTransform = detectMarkdownBlock(textBefore)

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
            const urlInfo = detectTrailingUrl(textBefore)
            if (urlInfo) {
              const { href, startIdx: urlStartIdx } = urlInfo
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
      /**
       * 정렬을 *인라인 스타일로 확정*한다. figure에 과거 박힌 인라인 margin(예 '10px 0')이
       * CSS data-align(margin:auto)을 덮어써 가운데 정렬이 안 먹던 문제가 있었으므로,
       * 인라인을 직접 덮어써 정렬을 결정한다(인라인이 CSS보다 우선 → 항상 적용).
       */
      const img = selectedFigure.querySelector('img') as HTMLImageElement | null
      if (align === 'center') {
        selectedFigure.style.margin = '10px auto'
        selectedFigure.style.textAlign = 'center'
        if (img) img.style.margin = '0 auto'
      } else if (align === 'left') {
        selectedFigure.style.margin = '10px auto 10px 0'
        selectedFigure.style.textAlign = 'left'
        if (img) img.style.margin = '0'
      } else {
        selectedFigure.style.margin = '10px 0 10px auto'
        selectedFigure.style.textAlign = 'right'
        if (img) img.style.margin = '0 0 0 auto'
      }
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

      // 링크 삽입을 부가 사이드이펙트(예: 참여 행위자 자동 등록)로 통지.
      // 본문 commit과 무관하게 즉시 발생 — 타입 필터는 호출 측 책임.
      onEntityLink?.(item)

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
      onEntityLink,
    ],
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
        setTermEditIsDocumentScoped(!!t.eventId)
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
      !(await confirm({
        title: '삭제 확인',
        message: '이 설명을 삭제할까요? 문구는 본문에 남고, 설명(툴팁)만 제거됩니다.',
        danger: true,
      }))
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

  /**
   * 팝오버/모달이 열려 있을 때의 Esc는 *그 팝오버만* 닫는다.
   *
   * capture 단계 단일 핸들러로, 열린 오버레이를 우선순위대로 하나 닫고
   * stopImmediatePropagation으로 이벤트를 멈춘다. 그러면:
   *  - 흩어진 개별 Esc 핸들러가 중복 발화하지 않고,
   *  - 부모(InlineRichText 등)의 window Esc(편집 취소)도 발화하지 않아 에디터가
   *    통째로 닫히며 입력이 날아가는 문제가 사라진다.
   * 열린 오버레이가 없으면 그냥 통과시켜 부모의 Esc(편집 취소)가 처리한다.
   */
  const handleOverlayEscapeCapture = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (shortcutsHelpVisible) setShortcutsHelpVisible(false)
      else if (imageCaptionModalVisible) handleImageCaptionCancel()
      else if (entityLinkModalVisible) setEntityLinkModalVisible(false)
      else if (termEditModalVisible) setTermEditModalVisible(false)
      else if (termLinkModalVisible) setTermLinkModalVisible(false)
      else if (colorPickerVisible) setColorPickerVisible(false)
      else if (tablePickerVisible) setTablePickerVisible(false)
      else if (contextMenuVisible) setContextMenuVisible(false)
      else if (selectedFigure) {
        setSelectedFigure(null)
        setImageMenuPos(null)
      } else return // 열린 오버레이 없음 — 부모 Esc(편집 취소)가 처리하도록 통과.
      e.preventDefault()
      e.stopImmediatePropagation()
    },
    [
      shortcutsHelpVisible,
      imageCaptionModalVisible,
      handleImageCaptionCancel,
      entityLinkModalVisible,
      termEditModalVisible,
      termLinkModalVisible,
      colorPickerVisible,
      tablePickerVisible,
      contextMenuVisible,
      selectedFigure,
    ],
  )
  useEffect(() => {
    window.addEventListener('keydown', handleOverlayEscapeCapture, true)
    return () =>
      window.removeEventListener('keydown', handleOverlayEscapeCapture, true)
  }, [handleOverlayEscapeCapture])

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

  const handleDeleteRichTable = useCallback(async () => {
    if (!editorRef.current) return
    const cell = getTableCellFromSelection(editorRef.current)
    if (!cell) return
    if (!(await confirm({ title: '삭제 확인', message: '표를 삭제할까요?', danger: true })))
      return
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
      <EditorToolbar
        bounded={bounded}
        isBold={isBold}
        isItalic={isItalic}
        isStrike={isStrike}
        currentHeading={currentHeading}
        isAlignCenter={isAlignCenter}
        isBulletList={isBulletList}
        isOrderedList={isOrderedList}
        isCode={isCode}
        currentColor={currentColor}
        cursorInTable={cursorInTable}
        selectedText={selectedText}
        entityLinkUsable={entityLinkUsable}
        hasDocumentScope={Boolean(documentScope)}
        canUploadImage={Boolean(onImageUpload)}
        colorPickerVisible={colorPickerVisible}
        tablePickerVisible={tablePickerVisible}
        colorPickerButtonRef={colorPickerButtonRef}
        tablePickerButtonRef={tablePickerButtonRef}
        playClickSound={playClickSound}
        onFormat={applyFormat}
        onHeading={applyHeading}
        onLink={handleSetLink}
        onEntityLink={handleOpenEntityLinkModal}
        onTermLink={handleOpenTermLinkModal}
        onExplanation={handleOpenExplanationModal}
        onImageUpload={handleImageUpload}
        onTableOp={runTableOp}
        onDeleteTable={handleDeleteRichTable}
        onInsertHr={insertProseHrBlock}
        onToggleColorPicker={toggleColorPicker}
        onToggleTablePicker={toggleTablePicker}
        actions={actions}
      />
      {/* 색상 선택기 — body 포털 (EditorContainer backdrop-filter가 fixed 기준을 바꿔 뷰포트 좌표와 불일치하는 것 방지) */}
      <ColorPickerPopover
        visible={colorPickerVisible}
        anchorRef={colorPickerButtonRef}
        currentColor={currentColor}
        onApplyColor={handleApplyColor}
        onClose={closeColorPicker}
      />
      {/* 표 삽입 격자 — body 포털 (색상 선택기와 동일 이유) */}
      <TablePickerPopover
        visible={tablePickerVisible}
        anchorRef={tablePickerButtonRef}
        hover={tablePickerHover}
        onHover={setTablePickerHover}
        onConfirm={confirmInsertTable}
        onClose={closeTablePicker}
      />
      {/* 컨텍스트 메뉴 — 모달(overflow:auto) 밖으로 포털해 잘림·가림 방지 */}
      <EditorContextMenu
        visible={contextMenuVisible}
        top={contextMenuPosition.top}
        left={contextMenuPosition.left}
        selectedText={selectedText}
        entityLinkUsable={entityLinkUsable}
        hasDocumentScope={Boolean(documentScope)}
        playClickSound={playClickSound}
        onEntityLink={handleOpenEntityLinkModal}
        onTermLink={handleOpenTermLinkModal}
        onExplanation={handleOpenExplanationModal}
      />

      {/* 이미지 부유 툴바 — 선택된 figure 위에 표시 */}
      <ImageFloatToolbar
        selectedFigure={selectedFigure}
        menuPos={imageMenuPos}
        onAlign={handleImageAlign}
        onWidthPreset={handleImageWidthPreset}
        onResetSize={handleImageResetSize}
        onEditCaption={handleImageEditCaption}
        onDelete={handleImageDelete}
      />

      {/* 단축키 도움말 모달 — Ctrl+/ 토글 */}
      <ShortcutsHelpModal
        visible={shortcutsHelpVisible}
        onClose={() => setShortcutsHelpVisible(false)}
      />

      {/* 이미지 설명 입력 모달 — body 포털 (에디터 글래스 박스가 fixed 뷰포트를 깨뜨리는 것 방지) */}
      <ImageCaptionModal
        visible={imageCaptionModalVisible}
        value={imageCaptionInput}
        isEditing={Boolean(editingCaptionFigureRef.current)}
        inputRef={imageCaptionInputRef}
        onValueChange={setImageCaptionInput}
        onConfirm={handleImageCaptionConfirm}
        onCancel={handleImageCaptionCancel}
        playClickSound={playClickSound}
      />

      {/* 엔티티 링크 모달 */}
      <EntityLinkModal
        visible={entityLinkModalVisible}
        selectedText={selectedText}
        query={entityLinkQuery}
        results={entityLinkResults}
        selectedIndex={entityLinkSelectedIndex}
        loading={mentionEntitiesLoading || entityLinkRemoteLoading}
        remote={entityLinkRemote}
        hasMentionEntities={Boolean(mentionEntities)}
        countryId={entityLinkCountryId}
        playClickSound={playClickSound}
        onQueryChange={setEntityLinkQuery}
        onSelectedIndexChange={setEntityLinkSelectedIndex}
        onInsert={insertEntityLink}
        onClose={handleCloseEntityLinkModal}
      />

      {/* 용어 연결 / 설명 넣기 모달 */}
      <TermLinkModal
        visible={termLinkModalVisible}
        explanationOnly={termLinkExplanationOnly}
        selectedText={selectedText}
        query={termLinkQuery}
        onQueryChange={(value) => {
          setTermLinkQuery(value)
          searchTermLinks(value)
        }}
        results={termLinkResults}
        selectedIndex={termLinkSelectedIndex}
        onSelectedIndexChange={setTermLinkSelectedIndex}
        onInsert={insertTermLink}
        newName={termLinkNewName}
        onNewNameChange={setTermLinkNewName}
        newDesc={termLinkNewDesc}
        onNewDescChange={setTermLinkNewDesc}
        documentOnly={termLinkDocumentOnly}
        onDocumentOnlyChange={setTermLinkDocumentOnly}
        hasDocumentScope={Boolean(documentScope)}
        onCreateAndLink={handleCreateAndLinkTerm}
        onClose={handleCloseTermLinkModal}
        playClickSound={playClickSound}
      />

      {/* 용어 수정 / 설명 수정 모달 (에디터에서 .term 클릭 시) */}
      <TermEditModal
        visible={termEditModalVisible}
        loading={termEditLoading}
        isDocumentScoped={termEditIsDocumentScoped}
        name={termEditName}
        onNameChange={setTermEditName}
        desc={termEditDesc}
        onDescChange={setTermEditDesc}
        onSave={handleSaveTermEdit}
        onDelete={handleDeleteTermEdit}
        onClose={handleCloseTermEditModal}
        playClickSound={playClickSound}
      />
    </EditorContainer>
  )
}
