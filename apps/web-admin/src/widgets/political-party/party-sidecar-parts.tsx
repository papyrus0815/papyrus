/**
 * 정당 곁가지(이름·법적 지위·이념·조직·당원) 지면이 함께 쓰는 부품 — 기간 두 칸, 모달 하단, 사실 목록 행.
 * 정당 지면(국가 상세)과 인물 지면(정당·선거)이 같은 모달을 쓰게 되면서 widgets/political-party로 올렸다.
 */
import React from 'react'

import styled from 'styled-components'

import { ledgerHairline } from '@/entities/event/ui/ledger-tokens'
import * as EventFormS from '@/pages/events/create/event-create.styles'
import type { PeriodDateFormValue } from '@/shared/lib/party-dates'
import { PeriodDateField } from '@/shared/ui/period-date-field/period-date-field'
import {
  PersonRegisterModalCancelBtn,
  PersonRegisterModalPrimaryBtn,
  PersonRegisterModalStickyFooter,
} from '@/shared/ui/register-modal-shell/register-modal-shell'
import * as FormS from '@/widgets/country/country-detail/ui/military-unit-form/styles'

export function PeriodPair({
  start,
  end,
  onStart,
  onEnd,
  startError,
  endError,
  inverted,
  startLabel,
  endLabel,
  endDisabled = false,
}: {
  start: PeriodDateFormValue
  end: PeriodDateFormValue
  onStart: (next: PeriodDateFormValue) => void
  onEnd: (next: PeriodDateFormValue) => void
  startError: string | null
  endError: string | null
  inverted: boolean
  startLabel: string
  endLabel: string
  endDisabled?: boolean
}) {
  return (
    <EventFormS.FormRow>
      <EventFormS.FormLabel as="div">
        기간<FormS.OptionalTag>(선택)</FormS.OptionalTag>
      </EventFormS.FormLabel>
      <EventFormS.FormField>
        <FormS.DateRangeGrid>
          <FormS.DateColumn>
            <FormS.SubTitleLabel>{startLabel}</FormS.SubTitleLabel>
            <PeriodDateField {...start} ariaLabel={startLabel} pickerTitle={`${startLabel} 선택`} error={Boolean(startError)} onChange={onStart} />
            {startError ? <EventFormS.ErrorMessage role="alert">{startError}</EventFormS.ErrorMessage> : null}
          </FormS.DateColumn>
          <FormS.DateColumn style={endDisabled ? { opacity: 0.45, pointerEvents: 'none' } : undefined} aria-disabled={endDisabled || undefined}>
            <FormS.SubTitleLabel>{endLabel}</FormS.SubTitleLabel>
            <PeriodDateField
              {...end}
              ariaLabel={endLabel}
              pickerTitle={`${endLabel} 선택`}
              error={Boolean(endError) || inverted}
              onChange={onEnd}
            />
            {endError ? <EventFormS.ErrorMessage role="alert">{endError}</EventFormS.ErrorMessage> : null}
          </FormS.DateColumn>
        </FormS.DateRangeGrid>
        <EventFormS.Hint>연도만 알면 연도만. 기원전은 칸 끝의 서기를 눌러 바꿉니다.</EventFormS.Hint>
        {inverted ? <EventFormS.ErrorMessage role="alert">끝이 시작보다 앞설 수 없습니다.</EventFormS.ErrorMessage> : null}
      </EventFormS.FormField>
    </EventFormS.FormRow>
  )
}

export function ModalFooter({
  problem,
  saving,
  onClose,
  onSubmit,
}: {
  problem: string | null
  saving: boolean
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <PersonRegisterModalStickyFooter>
      <FooterRow>
        <FooterStatus $error={Boolean(problem && !problem.startsWith('필수'))}>{problem ?? '저장 준비 완료'}</FooterStatus>
        <PersonRegisterModalCancelBtn type="button" onClick={onClose} disabled={saving}>
          취소
        </PersonRegisterModalCancelBtn>
        <PersonRegisterModalPrimaryBtn type="button" disabled={Boolean(problem) || saving} onClick={onSubmit}>
          {saving ? '저장 중…' : '저장'}
        </PersonRegisterModalPrimaryBtn>
      </FooterRow>
    </PersonRegisterModalStickyFooter>
  )
}

export const FactList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const FactGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const FactGroupLabel = styled.div`
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const FactRow = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 64px 6px 0;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  &:last-child {
    border-bottom: none;
  }
`

export const FactMain = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;

  .title {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 14px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .primary {
    color: ${({ theme }) => theme.colors.warning};
  }
  .period {
    font-size: 12.5px;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  .period.strong {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const FactBadge = styled.span`
  padding: 0 6px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const FactNote = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  white-space: pre-wrap;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const FactActions = styled.div`
  position: absolute;
  top: 4px;
  right: 0;
  display: inline-flex;
  gap: 2px;
`

export const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)')};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`

export const CheckRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
`

const FooterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
`

const FooterStatus = styled.span<{ $error: boolean }>`
  margin-right: auto;
  font-size: 12.5px;
  color: ${({ theme, $error }) => ($error ? theme.colors.error : theme.colors.text.tertiary)};
`
