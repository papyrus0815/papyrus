/**
 * 세기 단위 시대 내비게이션 (◀ 16세기 ▶).
 *
 * "16세기 각국 왕 비교"처럼 세기 단위로 시간축을 넘기는 공용 컨트롤.
 * 세기 경계·라벨은 shared/lib/iso-date의 getCentury 계약(16세기 = 1501~1600)을 따르고,
 * 0세기는 존재하지 않으므로 -1세기 ↔ 1세기로 건너뛴다.
 */
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import styled from 'styled-components'

import {
  centuryYearRange,
  formatCenturyLabel,
  stepCentury,
} from '@/shared/lib/iso-date'

export interface CenturySelection {
  century: number
  /** 부호 연도, 포함 */
  fromYear: number
  /** 부호 연도, 배타(exclusive) */
  toYear: number
}

interface CenturyStepperProps {
  /** 현재 세기 (BC 음수). null이면 라벨만 흐리게 — 세기 모드 비활성 상태 */
  century: number | null
  onChange: (next: CenturySelection) => void
  /** 이동 하한/상한 세기 (기본 -50 ~ 21) */
  minCentury?: number
  maxCentury?: number
  /** null 상태에서 스텝을 눌렀을 때 시작할 세기 (기본 16) */
  defaultCentury?: number
}

const Wrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
`

const StepButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  transition: background 0.12s, color 0.12s;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }
`

const Label = styled.button<{ $muted: boolean }>`
  border: none;
  background: transparent;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  min-width: 56px;
  text-align: center;
  cursor: pointer;
  color: ${({ theme, $muted }) =>
    $muted ? theme.colors.text.tertiary : theme.colors.text.primary};
  transition: background 0.12s;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }
`

function toSelection(century: number): CenturySelection {
  return { century, ...centuryYearRange(century) }
}

export function CenturyStepper({
  century,
  onChange,
  minCentury = -50,
  maxCentury = 21,
  defaultCentury = 16,
}: CenturyStepperProps) {
  const step = (delta: 1 | -1) => {
    const next =
      century == null ? defaultCentury : stepCentury(century, delta)
    const clamped = Math.max(minCentury, Math.min(maxCentury, next))
    onChange(toSelection(clamped === 0 ? defaultCentury : clamped))
  }

  return (
    <Wrap role="group" aria-label="세기 이동">
      <StepButton
        type="button"
        aria-label="이전 세기"
        disabled={century != null && century <= minCentury}
        onClick={() => step(-1)}
      >
        <FiChevronLeft size={13} />
      </StepButton>
      <Label
        type="button"
        $muted={century == null}
        title="이 세기 범위로 점프"
        onClick={() => onChange(toSelection(century ?? defaultCentury))}
      >
        {century == null ? '세기' : formatCenturyLabel(century)}
      </Label>
      <StepButton
        type="button"
        aria-label="다음 세기"
        disabled={century != null && century >= maxCentury}
        onClick={() => step(1)}
      >
        <FiChevronRight size={13} />
      </StepButton>
    </Wrap>
  )
}
