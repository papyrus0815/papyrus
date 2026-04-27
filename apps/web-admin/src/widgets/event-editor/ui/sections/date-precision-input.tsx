/**
 * 정밀도(year/month/day) 토글 + 날짜 텍스트 입력.
 *
 * 폼 값 형태: { value: string; precision?: 'year'|'month'|'day' }
 * - precision='year' → 'YYYY' 입력
 * - precision='month' → 'YYYY-MM' 입력
 * - precision='day' → 'YYYY-MM-DD' 입력 (HTML date input)
 */
import { useCallback } from 'react'
import * as S from '../styles'
import styled from 'styled-components'

const isDark = (mode: 'light' | 'dark') => mode === 'dark'

const PrecisionGroup = styled.div`
  display: inline-flex;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  border-radius: 8px;
  padding: 2px;
`

const PrecisionBtn = styled.button<{ $active?: boolean }>`
  padding: 5px 10px;
  border: none;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.background.primary : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.tertiary};
  font-size: 11.5px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  box-shadow: ${({ $active, theme }) =>
    $active
      ? isDark(theme.mode)
        ? '0 1px 2px rgba(0,0,0,0.3)'
        : '0 1px 2px rgba(0,0,0,0.06)'
      : 'none'};
  transition: background 0.15s ease, color 0.15s ease;
`

const InputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

type Precision = 'year' | 'month' | 'day'

interface Props {
  value: { value: string; precision?: Precision }
  onChange: (next: { value: string; precision: Precision }) => void
  /** placeholder 힌트 */
  hint?: string
}

const PRECISIONS: { id: Precision; label: string; placeholder: string }[] = [
  { id: 'day', label: '년·월·일', placeholder: 'YYYY-MM-DD' },
  { id: 'month', label: '년·월', placeholder: 'YYYY-MM' },
  { id: 'year', label: '년', placeholder: 'YYYY' },
]

/** 정밀도 변경 시 기존 value 를 잘라 맞춰주는 헬퍼 */
function coerceToPrecision(value: string, p: Precision): string {
  if (!value) return ''
  // YYYY-MM-DD 또는 YYYY-MM 또는 YYYY 형태 가정
  const parts = value.split('-')
  if (p === 'year') return parts[0] ?? ''
  if (p === 'month') return parts.slice(0, 2).join('-')
  return value
}

export function DatePrecisionInput({ value, onChange, hint }: Props) {
  const precision: Precision = value.precision ?? 'day'

  const handleValueChange = useCallback(
    (raw: string) => {
      onChange({ value: raw, precision })
    },
    [onChange, precision],
  )

  const handlePrecisionChange = useCallback(
    (p: Precision) => {
      onChange({ value: coerceToPrecision(value.value, p), precision: p })
    },
    [onChange, value.value],
  )

  const placeholder =
    PRECISIONS.find((p) => p.id === precision)?.placeholder ?? 'YYYY-MM-DD'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <InputRow>
        {precision === 'day' ? (
          <S.TextInput
            type="date"
            value={value.value}
            onChange={(e) => handleValueChange(e.target.value)}
          />
        ) : (
          <S.TextInput
            type="text"
            value={value.value}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={placeholder}
            inputMode="numeric"
          />
        )}
        <PrecisionGroup>
          {PRECISIONS.map((p) => (
            <PrecisionBtn
              key={p.id}
              type="button"
              $active={precision === p.id}
              onClick={() => handlePrecisionChange(p.id)}
            >
              {p.label}
            </PrecisionBtn>
          ))}
        </PrecisionGroup>
      </InputRow>
      {hint && <S.HelpText>{hint}</S.HelpText>}
    </div>
  )
}
