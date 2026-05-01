import { useEffect, useId, useState } from 'react'

import { FiEdit2 } from 'react-icons/fi'
import styled from 'styled-components'

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
  /** RichTextEditor maxHeight */
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
  maxHeight = '560px',
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

  if (editing) {
    return (
      <>
        <RichTextEditor
          value={draft}
          onChange={(v) => {
            if (v !== draft) setDraft(v)
          }}
          placeholder={placeholder}
          maxHeight={maxHeight}
        />
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

  const isEmpty = !value || !value.replace(/<[^>]*>/g, '').trim()

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

const ReadHost = styled.div`
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 4px;
`

const ReadBody = styled.div`
  flex: 1;
  min-width: 0;
`

const Placeholder = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-style: italic;
`
