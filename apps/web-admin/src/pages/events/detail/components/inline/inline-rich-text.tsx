import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

import { createPortal } from 'react-dom'
import { FiEdit2 } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import {
  type RichTextDynastyTooltipState,
  type RichTextTermTooltipState,
  useRichTextTooltipEscape,
} from '@/shared/hooks/use-rich-text-prose-click'
import { isVisuallyEmptyRichText } from '@/shared/lib/rich-text-read-view'
import { createRichTextImageUploader } from '@/shared/api/upload'
import { pathKeys } from '@/shared/router'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'
import { RichTextProseWithEntityClicks } from '@/shared/ui/rich-text-read-view'

import { useInlineEditCoordinator } from './inline-edit-context'
import * as I from './inline.styles'

interface InlineRichTextProps {
  /** HTML 문자열(rich text) */
  value: string
  onSave: (next: string) => void
  /** 비어 있을 때 hint */
  placeholder?: string
  /**
   * RichTextEditor maxHeight. 사건 상세 본문에서는 기본적으로 *미지정*이어야
   * 본문 길이만큼 자라고 toolbar는 sticky bottom으로 viewport 하단에 붙음.
   * 모달 등 부모 스크롤이 제한된 사용처에서만 명시적으로 값을 넘김.
   */
  maxHeight?: string
  /**
   * 읽기 모드 본문의 인물 멘션/엔티티 링크 클릭 핸들러. 생략 시 인물 상세
   * 페이지로 navigate. 사건 상세에서는 페이지 레벨 인물 모달을 연결해 동일 UX.
   */
  onPersonClick?: (personId: string) => void
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
}: InlineRichTextProps) {
  const editorId = useId()
  const { editing, open, close } = useInlineEditCoordinator(editorId)
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
   *    contenteditable의 Enter(줄바꿈)와 충돌하지 않도록 modifier 키와 함께만.
   */
  useEffect(() => {
    if (!editing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        commit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, close, draft, value])

  /**
   * 본문 이미지 업로드 — 사건 상세 전용 위젯이라 카테고리는 'events' 고정.
   * RichTextEditor는 onImageUpload prop이 없으면 이미지 삽입을 비활성화하므로
   * 반드시 forward해야 한다. 공용 헬퍼로 try/catch·URL 정규화는 한 곳에 모음.
   */
  const handleImageUpload = useMemo(
    () => createRichTextImageUploader('events'),
    [],
  )

  if (editing) {
    return (
      <EditHost>
        <RichTextEditor
          value={draft}
          onChange={(v) => {
            if (v !== draft) setDraft(v)
          }}
          /* 긴 본문 입력 지연 완화: onChange(무거운 sanitize)를 디바운스.
             저장 직전 commit()이 editorFlushRef로 마지막 입력을 즉시 반영한다. */
          debounceMs={200}
          flushRef={editorFlushRef}
          placeholder={placeholder}
          maxHeight={maxHeight}
          /**
           * 본문 길이만큼 자라기 — 짧은 콘텐츠도 큰 빈 카드가 아니라
           * 본문 한 두 줄+toolbar 정도로 작게. 긴 콘텐츠는 자연스럽게
           * 자라고 toolbar는 sticky bottom으로 항상 노출.
           */
          minHeight="120px"
          onImageUpload={handleImageUpload}
          autoFocus
          /**
           * 저장/취소를 Toolbar 우측 슬롯에 통합. 이전엔 RichTextEditor 외부에
           * 별도 InlineActionRow로 두었는데 본문이 길어지면 사용자가 끝까지
           * 스크롤해야 닿을 수 있었다. Toolbar는 sticky bottom으로 viewport
           * 하단에 따라오므로 본문 길이와 무관하게 항상 접근 가능.
           */
          actions={
            <>
              <I.InlineCancelBtn type="button" onClick={close}>
                취소
              </I.InlineCancelBtn>
              <I.InlineSaveBtn type="button" onClick={commit}>
                저장
              </I.InlineSaveBtn>
            </>
          }
        />
      </EditHost>
    )
  }

  const isEmpty = isVisuallyEmptyRichText(value)

  return (
    <ReadHost data-edit-host>
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
      <I.InlineEditButton type="button" onClick={open} aria-label="편집">
        <FiEdit2 />
      </I.InlineEditButton>

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
 * pre-hover 시그널은 여기서 padding/margin을 음수로 상쇄해 background tint를
 * 본문 흐름과 어긋나지 않게 띄워준다(본문 좌·우 정렬은 그대로 유지).
 * hover/focus-within에서 미세한 fill로 "이 영역은 클릭해 편집 가능"을 시그널.
 *
 * 본문이 길어지면 우측 ✎ 버튼이 ReadHost 상단 한 곳에만 있어 사용자가 위로
 * 스크롤해서 찾아야 했다. 자손 selector로 ✎ 버튼만 sticky로 — 페이지(`S.Page`)
 * 스크롤 컨테이너 안에서 viewport 상단에 따라온다. 다른 inline 사용처는 영향 X.
 */
const ReadHost = styled.div`
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

  ${I.InlineEditButton} {
    position: sticky;
    /* 헤더 높이(64) + 16px 여유. CSS var fallback 안전. */
    top: calc(var(--header-height, 64px) + 16px);
    align-self: flex-start;
  }
`

/**
 * ReadBody — RichTextReadView를 감싸는 컨테이너.
 *
 * 사건 상세 전용 정렬: 읽기 뷰의 본문 typography를 edit 모드 EditorContent와
 * 동일하게 정렬해 클릭 전후 줄간격·단락 간격이 같게 보이도록 한다.
 * 공용 RichTextReadView 자체는 신문 톤(1.7/1em)을 유지하고, 이 위젯에 한해
 * 자손 selector로 덮어쓴다.
 */
const ReadBody = styled.div`
  flex: 1;
  min-width: 0;
  /**
   * RichTextProseWithEntityClicks가 본문 region을 <div role="presentation"> 래퍼로
   * 한 겹 감싸므로 직계 자식(>)이 아닌 후손 selector로 매칭한다(엔티티 클릭 연결
   * 전엔 RichTextReadView가 직계라 > 였음).
   */
  & [role='region'] {
    line-height: 1.6;
    p {
      margin: 0 0 8px 0;
    }
    p:last-child {
      margin-bottom: 0;
    }
    /**
     * 본문에서 제목 서식(글자 크기)을 써도 섹션 제목(18px)을 넘지 않도록 캡.
     * 읽기뷰엔 heading 크기 규칙이 없어 UA 기본값(h1≈30px)이 적용돼, 본문 소제목이
     * 섹션 제목보다 커지며 경계가 흐려지던 문제를 막는다. 굵기·여백으로만 위계 구분.
     */
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

/**
 * EditHost — edit 모드의 RichTextEditor 외곽 wrapper.
 *
 * 초기 디자인에선 RichTextEditor의 큰 카드(border + shadow)가 read 모드와의
 * 시각 점프를 만든다고 보고 외곽을 평탄화했었는데, 그 결과 edit 모드에서
 * 영역 경계가 사라져 "어디까지가 에디터인지" 분간이 안 되는 회귀가 났다.
 *
 * 정책: 외곽 카드를 *그대로 노출* — 편집 모드 시그널을 시각적으로 명확히.
 * 시각 점프는 ReadBody typography 정렬(line-height 1.6, p margin 8px)과
 * autoGrow(min-height 120)로 이미 흡수되어 큰 부담 없음.
 */
const EditHost = styled.div``

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
