/**
 * 시각 칸 — 날짜 칸(연·월·일을 칸 안에서 바로 친다)과 같은 모양으로 시·분을 바로 친다.
 *
 * 예전엔 시각이 버튼이라 칸 → 시 24개·분 60개 격자 모달 → 적용 세 단계였다. 날짜는 '1941 . 06 . 21'을
 * 치는데 시각만 고르게 해서 한 줄 안의 입력 방식이 달랐다. 이제 '23 : 00'을 친다.
 *
 * - 값은 'HH:MM' 또는 ''(모름). 시만 치면 분은 00으로 본다.
 * - 치는 중간 상태(시 '2')는 칸이 들고, 칸을 떠날 때(또는 두 자리가 차면) 폼 값으로 보낸다.
 * - 24 이상·60 이상은 받지 않는다(빨간 테 + 값은 '').
 * - ':'·'.'·스페이스는 분으로, 분이 빈 채 Backspace는 시로.
 */
import { type FocusEvent, useEffect, useRef, useState } from 'react'

import { FiClock, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { kitC, kitDateTriggerCss } from '@/shared/ui/register-form-kit/register-form-kit'

export interface TimeSegmentFieldProps {
  /** 'HH:MM' 또는 '' */
  value: string
  onChange: (value: string) => void
  /** 칸 이름 — '시작 시각' */
  ariaLabel: string
  disabled?: boolean
  /** 칸 폭 — 기본 128px(시계 + 시 : 분 + 지우기). '100%'면 부모 칸을 채운다 */
  width?: number | string
  /** 칸 높이 — 등록 폼 38px, 좁은 인라인 편집 32px */
  height?: number
  /** 좁은 자리 — 시계 아이콘을 빼고 시 : 분 + 지우기만(날짜 칸 옆에 붙을 때 날짜가 잘리지 않게) */
  compact?: boolean
}

const digits = (raw: string) => raw.replace(/\D/g, '').slice(0, 2)
const pad = (raw: string) => (raw.length === 1 ? `0${raw}` : raw)

function split(value: string): { hour: string; minute: string } {
  const matched = /^(\d{1,2}):(\d{1,2})$/.exec(value)
  return matched ? { hour: pad(matched[1]), minute: pad(matched[2]) } : { hour: '', minute: '' }
}

/** 칸 글자 → 폼 값. 시가 없으면 ''(모름), 범위 밖이면 null(오류) */
function compose(hour: string, minute: string): string | null {
  if (!hour && !minute) return ''
  if (!hour) return null
  const hourNumber = Number(hour)
  const minuteNumber = minute ? Number(minute) : 0
  if (hourNumber > 23 || minuteNumber > 59) return null
  return `${pad(hour)}:${pad(minute || '0')}`
}

export function TimeSegmentField({
  value,
  onChange,
  ariaLabel,
  disabled = false,
  width = 128,
  height = 38,
  compact = false,
}: TimeSegmentFieldProps) {
  const [hour, setHour] = useState(() => split(value).hour)
  const [minute, setMinute] = useState(() => split(value).minute)
  const hourRef = useRef<HTMLInputElement>(null)
  const minuteRef = useRef<HTMLInputElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  /* 바깥에서 값이 바뀌면(초기화·되돌리기) 칸을 맞춘다 — 치는 중인 같은 값이면 그대로 */
  useEffect(() => {
    const current = compose(hour, minute)
    if (current === value) return
    const next = split(value)
    setHour(next.hour)
    setMinute(next.minute)
    // hour·minute은 비교용 — 바깥 값이 바뀔 때만 맞춘다
  }, [value])

  const composed = compose(hour, minute)
  const invalid = composed === null

  /** 폼으로 보낸다 — 유효할 때만, 무효면 ''(저장은 '모름') */
  const commit = (nextHour: string, nextMinute: string) => {
    const next = compose(nextHour, nextMinute)
    const outgoing = next ?? ''
    if (outgoing !== value) onChange(outgoing)
  }

  /** 칸 묶음 밖으로 나갈 때만 맞춤(한 자리 시 → 두 자리, 분 빈칸 → 00) */
  const onGroupBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (boxRef.current?.contains(event.relatedTarget as Node | null)) return
    const next = compose(hour, minute)
    if (next) {
      const parts = split(next)
      setHour(parts.hour)
      setMinute(parts.minute)
    }
    commit(hour, minute)
  }

  return (
    <Box
      ref={boxRef}
      role="group"
      aria-label={ariaLabel}
      $error={invalid}
      $disabled={disabled}
      style={{ width, height }}
      onBlur={onGroupBlur}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !disabled) {
          event.preventDefault()
          ;(hour ? minuteRef : hourRef).current?.focus()
        }
      }}
      title={invalid ? '시는 0~23, 분은 0~59' : undefined}
    >
      {!compact && <FiClock size={14} aria-hidden />}
      <BareInput
        ref={hourRef}
        inputMode="numeric"
        placeholder="시"
        aria-label={`${ariaLabel} — 시`}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        value={hour}
        onChange={(event) => {
          const next = digits(event.target.value)
          setHour(next)
          /* 3~9로 시작하면 한 자리로 끝난 시('7' = 07시) — 바로 분으로. 두 자리가 차도 분으로 */
          if (next.length === 2 || /^[3-9]$/.test(next)) minuteRef.current?.focus()
          commit(next, minute)
        }}
        onKeyDown={(event) => {
          if ((event.key === ':' || event.key === '.' || event.key === ' ') && hour) {
            event.preventDefault()
            minuteRef.current?.focus()
          }
        }}
      />
      <Sep aria-hidden>:</Sep>
      <BareInput
        ref={minuteRef}
        inputMode="numeric"
        placeholder="분"
        aria-label={`${ariaLabel} — 분`}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        value={minute}
        onChange={(event) => {
          const next = digits(event.target.value)
          setMinute(next)
          commit(hour, next)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Backspace' && minute === '') {
            event.preventDefault()
            hourRef.current?.focus()
          }
        }}
      />
      {(hour || minute) && !disabled && (
        <ClearBtn
          type="button"
          /* Tab은 칸을 떠나 다음 칸으로 — 지우기에 멈추면 칸 정리(한 자리 시 → 두 자리)가 안 된다. 키보드로는 칸을 비워 지운다 */
          tabIndex={-1}
          aria-label={`${ariaLabel} 지우기`}
          title="시각 지우기(모름)"
          onClick={() => {
            setHour('')
            setMinute('')
            commit('', '')
            hourRef.current?.focus()
          }}
        >
          <FiX size={12} />
        </ClearBtn>
      )}
    </Box>
  )
}

/* ── 날짜 칸(InlineDateField appearance='field')과 같은 칸 ── */

const Box = styled.div<{ $error: boolean; $disabled: boolean }>`
  ${kitDateTriggerCss}
  flex: 0 0 auto;
  gap: 2px;
  height: 38px;
  padding: 0 4px 0 8px;
  cursor: ${({ $disabled }) => ($disabled ? 'default' : 'text')};
  ${({ $error, theme }) => ($error ? `border-color: ${theme.colors.error ?? '#dc2626'};` : '')}

  > svg {
    flex-shrink: 0;
    margin-right: 4px;
    color: ${({ theme }) => kitC(theme).textMuted};
  }
`

const BareInput = styled.input`
  width: 26px;
  padding: 4px 0;
  text-align: center;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
  background: transparent;
  border: none;
  border-radius: 4px;
  outline: none;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:focus {
    background: ${({ theme }) => theme.colors.activeLight};
  }
  @media (max-width: 768px) {
    font-size: 16px;
  }
`

const Sep = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 14px;
`

const ClearBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-left: auto;
  padding: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    outline: none;
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.activeLight};
  }
`
