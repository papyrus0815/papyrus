import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'

import { FiEdit2 } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import * as I from './inline.styles'

interface InlineTextProps {
  /** 현재 값(server side) */
  value: string
  /** 저장 콜백 — blur/Enter 시 호출. 동일 값이면 호출 안 됨. */
  onSave: (next: string) => void
  /** 비어있을 때 보여줄 hint(italic·tertiary 색). */
  placeholder?: string
  /** 긴 본문에는 textarea — Shift+Enter 줄바꿈, Enter 저장(`multilineEnter` false 기본). */
  multiline?: boolean
  /** Enter가 줄바꿈으로 동작하길 원하면 true(textarea 기본 동작). 저장은 blur로만. */
  multilineEnter?: boolean
  /** read 모드 텍스트 element — h1/h2 등 큰 타이포에 쓸 때 */
  as?: keyof JSX.IntrinsicElements
  className?: string
  style?: CSSProperties
  /** read 모드 좌측 prefix(아이콘 등) — edit 모드에선 숨김. */
  prefix?: ReactNode
  /**
   * commit 직전 검증 — 에러 메시지 반환 시 commit 막고 input outline 빨갛게.
   * null/undefined 반환은 통과.
   */
  validate?: (next: string) => string | null | undefined
}

/**
 * 명시 ✎ 트리거 텍스트 편집.
 *
 * - 텍스트 자체는 read-only — 클릭해도 아무 일 없음.
 * - 옆에 ✎ 버튼이 항상 노출(opacity 0.45). hover/focus 시 또렷.
 * - 클릭 → input/textarea로 swap. blur/Enter → onSave, Esc → 취소.
 */
export function InlineText({
  value,
  onSave,
  placeholder = '입력',
  multiline,
  multilineEnter,
  as = 'span',
  className,
  style,
  prefix,
  validate,
}: InlineTextProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  /**
   * edit *진입* 시(만) draft를 현재 server 값으로 동기화.
   *
   * 과거엔 deps에 `value`도 있어, 편집 도중 부모가 refetch로 value를 갱신하면
   * 사용자가 친 draft를 즉시 server 값으로 덮어써 입력 손실이 발생했음.
   * `wasEditingRef`로 *false → true 전이*만 잡아 진입 시점에만 초기화.
   */
  const wasEditingRef = useRef(editing)
  useEffect(() => {
    if (editing && !wasEditingRef.current) {
      setDraft(value)
      setError(null)
    }
    wasEditingRef.current = editing
  }, [editing, value])

  /* edit 진입 시 자동 focus + 끝 커서. */
  useEffect(() => {
    if (!editing) return
    const node = inputRef.current
    if (!node) return
    node.focus()
    const len = node.value.length
    try {
      node.setSelectionRange(len, len)
    } catch {
      /* 일부 input type은 selection API 미지원 — 무시. */
    }
  }, [editing])

  const commit = () => {
    const validation = validate?.(draft) ?? null
    if (validation) {
      setError(validation)
      // input에 다시 focus 유지
      inputRef.current?.focus()
      return
    }
    setEditing(false)
    setError(null)
    if (draft !== value) onSave(draft)
  }
  const cancel = () => {
    setEditing(false)
    setError(null)
    setDraft(value)
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    } else if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
      commit()
    } else if (e.key === 'Enter' && multiline && !multilineEnter && !e.shiftKey) {
      e.preventDefault()
      commit()
    }
  }

  if (editing) {
    return (
      <EditHost>
        {multiline ? (
          <I.InlineTextArea
            ref={(node) => {
              inputRef.current = node
            }}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              if (error) setError(null)
            }}
            onBlur={commit}
            onKeyDown={onKey}
            rows={3}
            data-invalid={error ? 'true' : undefined}
          />
        ) : (
          <I.InlineInput
            ref={(node) => {
              inputRef.current = node
            }}
            type="text"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              if (error) setError(null)
            }}
            onBlur={commit}
            onKeyDown={onKey}
            data-invalid={error ? 'true' : undefined}
          />
        )}
        {error && <ErrorHint role="alert">{error}</ErrorHint>}
      </EditHost>
    )
  }

  const isEmpty = !value.trim()
  return (
    <ReadHost className={className} style={style} data-edit-host>
      <ReadValue
        as={as}
        $multiline={multiline}
        data-empty={isEmpty || undefined}
      >
        {prefix}
        {isEmpty ? placeholder : value}
      </ReadValue>
      <I.InlineEditButton
        type="button"
        onClick={() => setEditing(true)}
        aria-label="편집"
      >
        <FiEdit2 />
      </I.InlineEditButton>
    </ReadHost>
  )
}

const ReadHost = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 0;
`

const ReadValue = styled.span<{ $multiline?: boolean }>`
  ${I.editableSurface}
  /**
   * multiline 모드는 textarea로 편집되어 값에 개행 문자가 포함될 수 있다.
   * 기본 inline span은 개행을 공백 1개로 접어 표시 — read 모드에서도 개행을
   * 보존하려면 pre-wrap 필요(이 옵션은 줄바꿈 보존 + wrap 정상 동작).
   */
  ${({ $multiline }) =>
    $multiline &&
    css`
      white-space: pre-wrap;
    `}
`

const EditHost = styled.span`
  display: inline-flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  width: 100%;
`

const ErrorHint = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.error ?? '#dc2626'};
`
