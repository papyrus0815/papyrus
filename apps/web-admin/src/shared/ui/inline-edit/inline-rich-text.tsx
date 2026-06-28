import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

import { createPortal } from 'react-dom'
import { FiEdit2 } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled, { css } from 'styled-components'

import {
  type RichTextDynastyTooltipState,
  type RichTextTermTooltipState,
  useRichTextTooltipEscape,
} from '@/shared/hooks/use-rich-text-prose-click'
import { type MentionItem } from '@/shared/lib/mention/mention-system'
import { isVisuallyEmptyRichText } from '@/shared/lib/rich-text-read-view'
import { createRichTextImageUploader } from '@/shared/api/upload'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'
import { RichTextProseWithEntityClicks } from '@/shared/ui/rich-text-read-view'

import {
  useInlineEditCoordinator,
  useInlineImageCategory,
} from './inline-edit-context'
import * as S from './inline.styles'

interface InlineRichTextProps {
  /** HTML 문자열(rich text) */
  value: string
  onSave: (next: string) => void
  /** 비어 있을 때 hint */
  placeholder?: string
  /**
   * RichTextEditor maxHeight. 상세 본문에서는 기본적으로 *미지정*이어야
   * 본문 길이만큼 자라고 toolbar는 sticky bottom으로 viewport 하단에 붙음.
   * 모달 등 부모 스크롤이 제한된 사용처에서만 명시적으로 값을 넘김.
   */
  maxHeight?: string
  /**
   * 읽기 모드 본문의 인물 멘션/엔티티 링크 클릭 핸들러. 생략 시 인물 상세
   * 페이지로 navigate.
   */
  onPersonClick?: (personId: string) => void
  /**
   * 본문에 엔티티 링크를 삽입한 직후 호출. 타입 필터는 호출 측에서 처리.
   */
  onEntityLink?: (item: MentionItem) => void
  /**
   * 읽기 모드 ✎ 버튼을 sticky로 둘지(기본 true). 페이지 단위 긴 본문(개요)에서는
   * 스크롤을 따라오게 하고, 행에 박힌 짧은 서술(제품·시설·연혁 행)에서는 false로 두어
   * 버튼이 행 블록을 벗어나 다음 행 위로 떠다니지 않게 한다.
   */
  stickyEditButton?: boolean
  /** 스크린리더용 필드명 — 편집 트리거가 "{label} 편집"으로 읽힌다. 미지정 시 "편집". */
  label?: string
}

/**
 * 본문(rich text) 편집 — 명시 ✎ 버튼으로 진입.
 *
 * - 페이지 안에서 *동시에 열린 에디터는 1개*. coordinator가 다른 에디터로의 전환
 *   시 본 에디터를 닫고, 닫힐 때 useEffect가 draft를 server value로 되돌린다(폐기).
 *   사용자가 commit하려면 반드시 *저장* 버튼을 눌러야 함.
 * - 읽기: hover 효과 없는 plain HTML. 옆에 작은 ✎ 버튼만 상시 노출.
 * - 편집: 겉을 감싸는 컨테이너 없이 RichTextEditor 자체만 그 자리에 등장.
 */
export function InlineRichText({
  value,
  onSave,
  placeholder = '본문 작성',
  maxHeight,
  onPersonClick,
  onEntityLink,
  stickyEditButton = true,
  label,
}: InlineRichTextProps) {
  const editorId = useId()
  const { editing, open, close } = useInlineEditCoordinator(editorId)
  const imageCategory = useInlineImageCategory()
  const [draft, setDraft] = useState(value)
  /** RichTextEditor의 flush 함수 — 저장 직전 디바운스 대기분을 즉시 반영. */
  const editorFlushRef = useRef<(() => string | null) | null>(null)

  /* 읽기 모드 .term / 가문 엔티티 클릭 시 뜨는 정의 툴팁(포털). */
  const [termTooltip, setTermTooltip] =
    useState<RichTextTermTooltipState | null>(null)
  const [dynastyTooltip, setDynastyTooltip] =
    useState<RichTextDynastyTooltipState | null>(null)
  useRichTextTooltipEscape(
    Boolean(termTooltip),
    Boolean(dynastyTooltip),
    () => setTermTooltip(null),
    () => setDynastyTooltip(null),
  )

  const navigate = useNavigate()
  const handlePersonClick = useCallback(
    (personId: string) => {
      if (onPersonClick) onPersonClick(personId)
      else navigate(pathKeys.persons.detail(personId))
    },
    [onPersonClick, navigate],
  )

  /**
   * editing 상태 *전이* 시(만) draft를 server value로 동기화.
   *  - false → true: 새 편집 세션 시작 — 현재 server value로 초기화.
   *  - true → false: 종료(다른 에디터로의 전환·cancel 등) — 미저장 변경 폐기.
   *
   * 과거엔 deps에 `value`도 두어, 편집 도중 부모 refetch로 value가 바뀌면 사용자
   * 입력이 server 값으로 덮여 사라지는 회귀가 있었다. ref로 *전이*만 감지.
   * 편집 중이 아닐 때는 value 변경에 맞춰 draft를 따라가 read-view와 일치 보장.
   */
  const wasEditingRef = useRef(editing)
  useEffect(() => {
    if (editing !== wasEditingRef.current) {
      setDraft(value)
    } else if (!editing) {
      setDraft(value)
    }
    wasEditingRef.current = editing
  }, [editing, value])

  const commit = () => {
    // 디바운스로 아직 emit되지 않은 마지막 입력까지 즉시 반영(반환값 = 최신 html).
    const flushed = editorFlushRef.current ? editorFlushRef.current() : null
    const latest = flushed ?? draft
    if (latest !== value) onSave(latest)
    close()
  }

  /**
   * 편집 중 전역 키:
   *  - Esc: 취소(미저장 변경 폐기 후 닫기)
   *  - Cmd/Ctrl + Enter: 저장 후 닫기 — 키보드 사용자 진입점.
   */
  useEffect(() => {
    if (!editing) return
    const onKey = async (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        // 미저장 변경이 있을 때만 확인 — Esc 한 번에 긴 편집이 사고성으로 날아가는 것
        // 방지. 변경이 없으면 즉시 닫아 기존 빠른 취소 흐름 유지.
        if (
          draft !== value &&
          !(await confirm({
            title: '확인',
            message: '저장하지 않은 변경을 버릴까요?',
          }))
        ) {
          return
        }
        close()
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        commit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editing, close, draft, value])

  /**
   * 본문 이미지 업로드 — 저장 폴더(category)는 provider에서 주입(상세 문서별).
   * RichTextEditor는 onImageUpload prop이 없으면 이미지 삽입을 비활성화하므로
   * 반드시 forward해야 한다.
   */
  const handleImageUpload = useMemo(
    () => createRichTextImageUploader(imageCategory),
    [imageCategory],
  )

  /* 읽기 모드 placeholder 분기용 — 무거운 sanitize를 value 변경 시에만. 훅이므로
     editing 조기 반환 *위*에 두어 매 렌더 동일 순서로 호출되게 한다(Rules of Hooks). */
  const isEmpty = useMemo(() => isVisuallyEmptyRichText(value), [value])

  if (editing) {
    return (
      <EditHost>
        <RichTextEditor
          value={draft}
          onChange={(next) => {
            if (next !== draft) setDraft(next)
          }}
          /* 긴 본문 입력 지연 완화: onChange(무거운 sanitize)를 디바운스.
             저장 직전 commit()이 editorFlushRef로 마지막 입력을 즉시 반영한다. */
          debounceMs={200}
          flushRef={editorFlushRef}
          placeholder={placeholder}
          maxHeight={maxHeight}
          minHeight="120px"
          onImageUpload={handleImageUpload}
          onEntityLink={onEntityLink}
          autoFocus
          actions={
            <>
              <S.InlineCancelBtn type="button" onClick={close}>
                취소
              </S.InlineCancelBtn>
              <S.InlineSaveBtn type="button" onClick={commit}>
                저장
              </S.InlineSaveBtn>
            </>
          }
        />
      </EditHost>
    )
  }

  return (
    <ReadHost data-edit-host $sticky={stickyEditButton}>
      <ReadBody data-empty={isEmpty || undefined}>
        {isEmpty ? (
          <Placeholder>{placeholder}</Placeholder>
        ) : (
          <RichTextProseWithEntityClicks
            html={value}
            onPersonClick={handlePersonClick}
            setTermTooltip={setTermTooltip}
            setDynastyTooltip={setDynastyTooltip}
          />
        )}
      </ReadBody>
      <S.InlineEditButton
        type="button"
        onClick={open}
        aria-label={label ? `${label} 편집` : '편집'}
      >
        <FiEdit2 />
      </S.InlineEditButton>

      {termTooltip &&
        typeof document !== 'undefined' &&
        createPortal(
          <TipOverlay onClick={() => setTermTooltip(null)}>
            <TipCard
              $x={termTooltip.x}
              $y={termTooltip.y}
              onClick={(e) => e.stopPropagation()}
              role="tooltip"
            >
              <strong>{termTooltip.name}</strong>
              <p>
                {termTooltip.description === null
                  ? '불러오는 중…'
                  : termTooltip.description || '(설명 없음)'}
              </p>
            </TipCard>
          </TipOverlay>,
          document.body,
        )}

      {dynastyTooltip &&
        typeof document !== 'undefined' &&
        createPortal(
          <TipOverlay onClick={() => setDynastyTooltip(null)}>
            <TipCard
              $x={dynastyTooltip.x}
              $y={dynastyTooltip.y}
              onClick={(e) => e.stopPropagation()}
              role="tooltip"
            >
              <strong>가문 · {dynastyTooltip.name}</strong>
              <p>
                {dynastyTooltip.description === null
                  ? '불러오는 중…'
                  : dynastyTooltip.description || '(설명 없음)'}
              </p>
            </TipCard>
          </TipOverlay>,
          document.body,
        )}
    </ReadHost>
  )
}

/**
 * ReadHost — 본문(rich text) 읽기 컨테이너.
 * hover/focus-within에서 미세한 fill로 "이 영역은 클릭해 편집 가능"을 시그널.
 * 본문이 길어지면 우측 ✎ 버튼을 sticky로 — 페이지 스크롤 컨테이너 안에서 viewport
 * 상단에 따라온다.
 */
const ReadHost = styled.div<{ $sticky?: boolean }>`
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 4px;
  border-radius: 6px;
  padding: 4px 6px;
  margin: -4px -6px;
  transition: background 0.16s;

  &:hover,
  &:focus-within {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(15,23,42,0.025)'};
  }

  ${S.InlineEditButton} {
    align-self: flex-start;
    ${({ $sticky }) =>
      $sticky &&
      css`
        position: sticky;
        /* 헤더 높이(64) + 16px 여유. CSS var fallback 안전. */
        top: calc(var(--header-height, 64px) + 16px);
      `}
  }
`

/**
 * ReadBody — RichTextReadView를 감싸는 컨테이너.
 * 읽기 뷰의 본문 typography를 edit 모드 EditorContent와 동일하게 정렬해 클릭 전후
 * 줄간격·단락 간격이 같게 보이도록 한다.
 */
const ReadBody = styled.div`
  flex: 1;
  min-width: 0;

  & [role='region'] {
    line-height: 1.6;
    p {
      margin: 0 0 8px 0;
    }
    p:last-child {
      margin-bottom: 0;
    }
    h1,
    h2,
    h3 {
      font-weight: 700;
      line-height: 1.4;
      margin: 12px 0 6px;
      letter-spacing: -0.01em;
    }
    h1 {
      font-size: 16.5px;
    }
    h2 {
      font-size: 15.5px;
    }
    h3 {
      font-size: 14.5px;
    }
  }
`

const EditHost = styled.div`
  [role='textbox'] {
    padding-left: 12px;
    padding-right: 12px;
  }
`

const Placeholder = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-style: italic;
`

/* 용어·가문 정의 툴팁 — body 포털. 바깥 클릭/ESC로 닫힘. */
const TipOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9998;
`

const TipCard = styled.div<{ $x: number; $y: number }>`
  position: fixed;
  top: ${({ $y }) => $y + 14}px;
  left: ${({ $x }) => $x}px;
  transform: translateX(-50%);
  z-index: 9999;
  max-width: min(320px, calc(100vw - 24px));
  padding: 12px 14px;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)'
      : '0 12px 32px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.06)'};

  strong {
    display: block;
    font-size: 13px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  p {
    margin: 6px 0 0;
    font-size: 13px;
    line-height: 1.55;
    color: ${({ theme }) => theme.colors.text.secondary};
    white-space: pre-wrap;
    word-break: break-word;
  }
`
