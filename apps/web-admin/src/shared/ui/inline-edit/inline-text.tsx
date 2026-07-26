import {
  type CSSProperties,
  type JSX,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'

import { FiEdit2 } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import * as S from './inline.styles'

interface InlineTextProps {
  /** 현재 값(server side) */
  value: string
  /** 저장 콜백 — blur/Enter 시 호출. 동일 값이면 호출 안 됨. */
  onSave: (next: string) => void
  /** 비어있을 때 보여줄 hint(italic·tertiary 색). */
  placeholder?: string
  /**
   * 스크린리더용 필드명. 지정 시 편집 트리거는 "{label} 편집", 편집 input은 이
   * 이름으로 읽힌다. 미지정 시 input은 placeholder로, 트리거는 일반 "편집"으로 폴백.
   */
  label?: string
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
  /**
   * 읽기 모드 표시 포맷터(예: 천단위 콤마·억/조). *표시만* 바꾸고 편집 진입 시엔 raw
   * value를 그대로 편집한다. 빈 값엔 적용 안 함.
   */
  formatRead?: (value: string) => string
  /** 숫자 정렬용 tabular-nums(주가·목표가 등 수치 필드). */
  numeric?: boolean
  /** 입력 최대 글자 수 — input/textarea maxLength로 하드 제한(초과 입력 차단). */
  maxLength?: number
  /** 편집 중 "n/max" 카운터 표시(maxLength와 함께 쓸 때 의미). */
  showCount?: boolean
}

/**
 * 명시 ✎ 트리거 텍스트 편집.
 *
 * - 텍스트 자체는 read-only — 클릭해도 아무 일 없음.
 * - 옆 ✎ 버튼은 평소 숨김, 호스트 hover/focus-within 시 노출(터치 환경은 상시 옅게).
 * - ✎ 클릭 → input/textarea로 swap. blur/Enter → onSave, Esc → 취소.
 */
export function InlineText({
  value,
  onSave,
  placeholder = '입력',
  label,
  multiline,
  multilineEnter,
  as = 'span',
  className,
  style,
  prefix,
  validate,
  formatRead,
  numeric,
  maxLength,
  showCount,
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

  const commit = (viaBlur = false) => {
    const validation = validate?.(draft) ?? null
    if (validation) {
      if (viaBlur) {
        // blur 경로에서 강제 re-focus하면 잘못된 값(빈 제목 등)을 둔 채 다른 곳을
        // 클릭/Tab할 때 포커스가 input으로 되돌아와 필드를 영영 못 떠나는 트랩이 된다.
        // blur 시엔 변경을 폐기하고 읽기 모드로 복귀 — 키보드 사용자도 빠져나갈 수 있다.
        cancel()
        return
      }
      setError(validation)
      // 명시 저장(Enter) 경로에서만 input에 다시 focus 유지
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

  const nearLimit = maxLength != null && draft.length >= maxLength * 0.9

  if (editing) {
    return (
      <EditHost>
        {multiline ? (
          <S.InlineTextArea
            ref={(node) => {
              inputRef.current = node
            }}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              if (error) setError(null)
            }}
            onBlur={() => commit(true)}
            onKeyDown={onKey}
            rows={3}
            maxLength={maxLength}
            aria-label={label ?? placeholder}
            aria-invalid={error ? true : undefined}
            data-invalid={error ? 'true' : undefined}
          />
        ) : (
          <S.InlineInput
            ref={(node) => {
              inputRef.current = node
            }}
            type="text"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              if (error) setError(null)
            }}
            onBlur={() => commit(true)}
            onKeyDown={onKey}
            maxLength={maxLength}
            aria-label={label ?? placeholder}
            aria-invalid={error ? true : undefined}
            data-invalid={error ? 'true' : undefined}
          />
        )}
        <EditFootRow>
          {error ? <ErrorHint role="alert">{error}</ErrorHint> : <span />}
          {showCount && maxLength != null && (
            <CharCount $warn={nearLimit} aria-hidden>
              {draft.length}/{maxLength}
            </CharCount>
          )}
        </EditFootRow>
      </EditHost>
    )
  }

  const isEmpty = !value.trim()
  return (
    <ReadHost className={className} style={style} data-edit-host>
      <ReadValue
        as={as}
        $multiline={multiline}
        $numeric={numeric}
        data-empty={isEmpty || undefined}
      >
        {prefix}
        {isEmpty ? placeholder : formatRead ? formatRead(value) : value}
      </ReadValue>
      <S.InlineEditButton
        type="button"
        onClick={() => setEditing(true)}
        aria-label={label ? `${label} 편집` : '편집'}
      >
        <FiEdit2 />
      </S.InlineEditButton>
    </ReadHost>
  )
}

const ReadHost = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 0;
`

const ReadValue = styled.span<{ $multiline?: boolean; $numeric?: boolean }>`
  ${S.editableSurface}
  ${({ $numeric }) =>
    $numeric &&
    css`
      font-variant-numeric: tabular-nums;
    `}
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

const EditFootRow = styled.span`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 0;
`

const CharCount = styled.span<{ $warn?: boolean }>`
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $warn }) =>
    $warn ? theme.colors.error ?? '#dc2626' : theme.colors.text.tertiary};
`
