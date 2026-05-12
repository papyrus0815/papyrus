import { useEffect, useId, useMemo, useState } from 'react'

import { FiEdit2 } from 'react-icons/fi'
import styled from 'styled-components'

import { isVisuallyEmptyRichText } from '@/shared/lib/rich-text-read-view'
import { createRichTextImageUploader } from '@/shared/api/upload'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'
import { RichTextReadView } from '@/shared/ui/rich-text-read-view'

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
}: InlineRichTextProps) {
  const editorId = useId()
  const { editing, open, close } = useInlineEditCoordinator(editorId)
  const [draft, setDraft] = useState(value)

  /* 편집 진입/종료 모두에서 draft를 server value로 동기화.
     종료 시(다른 에디터가 가로채거나 취소 시) 미저장 변경을 자동 폐기. */
  useEffect(() => {
    setDraft(value)
  }, [editing, value])

  /* Esc — 편집 중 전역 키. */
  useEffect(() => {
    if (!editing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editing, close])

  const commit = () => {
    if (draft !== value) onSave(draft)
    close()
  }

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
      <>
        <EditHost>
          <RichTextEditor
            value={draft}
            onChange={(v) => {
              if (v !== draft) setDraft(v)
            }}
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
          />
        </EditHost>
        <I.InlineActionRow>
          <I.InlineCancelBtn type="button" onClick={close}>
            취소
          </I.InlineCancelBtn>
          <I.InlineSaveBtn type="button" onClick={commit}>
            저장
          </I.InlineSaveBtn>
        </I.InlineActionRow>
      </>
    )
  }

  const isEmpty = isVisuallyEmptyRichText(value)

  return (
    <ReadHost data-edit-host>
      <ReadBody data-empty={isEmpty || undefined}>
        {isEmpty ? <Placeholder>{placeholder}</Placeholder> : <RichTextReadView html={value} />}
      </ReadBody>
      <I.InlineEditButton type="button" onClick={open} aria-label="편집">
        <FiEdit2 />
      </I.InlineEditButton>
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
  & > [role='region'] {
    line-height: 1.6;
    p {
      margin: 0 0 8px 0;
    }
    p:last-child {
      margin-bottom: 0;
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
