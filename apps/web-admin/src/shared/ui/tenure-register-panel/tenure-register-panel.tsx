/**
 * 수반(재임) 등록/수정 — 우측 사이드 패널.
 * 역대 수반 섹션과 동일: 국가/직책은 트리거 버튼 → 모달 선택.
 */
import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiCheck, FiChevronDown, FiClock, FiPlus, FiSearch, FiUser, FiX } from 'react-icons/fi'
import { CabinetEventAttachModal } from '@/widgets/country/country-detail/ui/cabinet-event-attach-modal'
import styled from 'styled-components'

import * as S from '@/shared/ui/form-styles'

import { useCountries } from '@/features/country/api'
import { useHistoricalCountryScope } from '@/shared/lib/use-historical-country-scope'
import { useHistoricalCountries } from '@/features/historical-country/use-historical-countries.hook'
import {
  personCareerApi,
  type CreateGovernmentPositionTenureDto,
} from '@/shared/api/person-career'
import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import { getPersonDetailById } from '@/shared/api/persons-detail'
import { parseIsoDateParts } from '@/shared/lib/iso-date'
import {
  describeLifespanMismatch,
  formatCountryPeriod,
  toSignedYear,
} from '@/shared/lib/country-period'
import { AlertBox } from '@/shared/ui/alert-box/alert-box'
import { getUploadImageUrl } from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import {
  PersonRegisterModalFormScroll,
  PersonRegisterModalStickyFooter,
  PersonRegisterModalPrimaryBtn,
  PersonRegisterModalCancelBtn,
} from '@/shared/ui/register-modal-shell/register-modal-shell'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog/confirm-dialog'
import { notify } from '@/shared/ui/toast'
import { InlineDateField } from '@/shared/ui/person-register-modal/sections/inline-date-field'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import {
  EventPickerModal,
  type EventPickerSelection,
} from '@/shared/ui/event-picker-modal/event-picker-modal'
import {
  KitAddButton,
  KitBusyBar,
  KitFormLoading,
  KitRemoveButton,
  KitSelectedItem,
  KitSelectedItems,
  kitC,
  kitSelectTriggerCss,
} from '@/shared/ui/register-form-kit/register-form-kit'
import {
  type PartialDateParts,
  emptyPartialDateParts,
  partialDateFromStructured,
  partialDateFromResponse,
  partialPartsToDateInfo,
  buildPartialDateString,
  parsePartialDateString,
  isPartialRangeInverted,
} from '@/shared/lib/partial-date-string'
import { CountryPicker } from '@/shared/ui/country-picker'
import { type SelectOption } from '@/shared/ui/select-modal/select-modal'
import {
  buildPositionOptions,
  buildReignPositionOptions,
  DEFAULT_COLLAPSED_POSITION_GROUPS,
  DEFAULT_COLLAPSED_REIGN_GROUPS,
  parseRecentTitleValue,
  recentTitleValue,
  type PositionDefinitionLike,
} from './group-position-options'
import {
  deriveCountryScopedPositionDefinition,
  ScopedDefinitionError,
} from '@/shared/lib/government-position/derive-scoped-definition'
import {
  APPOINTMENT_METHOD_OPTIONS,
  TENURE_END_REASON_OPTIONS,
} from '@/shared/lib/tenure-labels'
import { SegmentControl } from '@/shared/ui/segment-control/segment-control'
import {
  FieldRow,
  FieldLabel,
  FieldControl,
  FieldHint,
  FormGroup,
  FormGroupTitle,
  LabeledRowsWrap,
  Required,
  Input as BaseInput,
  Textarea as BaseTextarea,
  OptionalTag,
  SubFieldPair,
  SubField,
  SubFieldLabel,
  PersonChip,
  PersonChipThumb,
  FooterMissingHint,
  objectParticle,
} from '@/shared/ui/register-form-layout'

const Input = styled(BaseInput)`
  height: 41px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  background: ${({ theme }) => kitC(theme).content};
  color: ${({ theme }) => kitC(theme).textPrimary};
  font-size: 13px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &::placeholder {
    color: ${({ theme }) => kitC(theme).textMuted};
  }
  &:hover:not(:focus) {
    border-color: ${({ theme }) => kitC(theme).borderHover};
  }
  &:focus {
    border-color: ${({ theme }) => kitC(theme).focus};
    box-shadow: 0 0 0 3px ${({ theme }) => kitC(theme).focusHalo};
  }
`

const Textarea = styled(BaseTextarea)`
  min-height: 88px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  background: ${({ theme }) => kitC(theme).content};
  color: ${({ theme }) => kitC(theme).textPrimary};
  font-size: 13px;
  line-height: 1.55;
  resize: vertical;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &::placeholder {
    color: ${({ theme }) => kitC(theme).textMuted};
  }
  &:hover:not(:focus) {
    border-color: ${({ theme }) => kitC(theme).borderHover};
  }
  &:focus {
    border-color: ${({ theme }) => kitC(theme).focus};
    box-shadow: 0 0 0 3px ${({ theme }) => kitC(theme).focusHalo};
  }
`

/** 사건 등록 모달 FormReveal과 동일한 페이드인 */
const FormReveal = styled.div`
  @media (prefers-reduced-motion: no-preference) {
    animation: tenureFormReveal 0.2s ease;
  }
  @keyframes tenureFormReveal {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`

const PersonContextCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  background: ${({ theme }) => kitC(theme).section};
`

const PersonMetaRight = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
`

const PersonLifespanBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 6px;
  background: ${({ theme }) => kitC(theme).content};
  border: 1px solid ${({ theme }) => kitC(theme).border};
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => kitC(theme).textSecondary};
`

const DepartmentBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  background: ${({ theme }) => kitC(theme).section};
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => kitC(theme).textSecondary};
`

/** 사건 등록 폼 PeriodBadge(event-create.styles.ts)와 동일한 좌측 라벨 하단 기간 요약 배지 */
const PeriodBadge = styled.div`
  width: fit-content;
  margin-top: 8px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#c4b5fd' : '#6d28d9')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(167, 139, 250, 0.14)' : '#f3effe'};
  border-radius: 6px;
  padding: 3px 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;

  span {
    color: ${({ theme }) => kitC(theme).textMuted};
    font-size: 10px;
  }
`

/** 선택 트리거 + 인라인 해제(×) 버튼 래퍼 */
const TriggerWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
`

/** 선택 버튼 — 사건·인물·국가 폼 kitSelectTriggerCss(41px·r8·kitC)와 동일 규격 */
const SelectTriggerButton = styled.button<{ $hasValue?: boolean; $clearable?: boolean }>`
  ${kitSelectTriggerCss}
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding-right: ${({ $clearable }) => ($clearable ? '34px' : '12px')};
  border: 1px solid ${({ theme }) => kitC(theme).border};
  background: ${({ theme }) => kitC(theme).content};
  color: ${({ $hasValue, theme }) =>
    $hasValue ? kitC(theme).textPrimary : kitC(theme).textMuted};
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  > span:first-of-type {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  svg {
    flex-shrink: 0;
    color: ${({ theme }) => kitC(theme).textMuted};
    transition: color 0.15s ease;
  }
  &:hover {
    border-color: ${({ theme }) => kitC(theme).borderHover};
    svg {
      color: ${({ theme }) => kitC(theme).textSecondary};
    }
  }
  &:focus,
  &:focus-visible {
    border-color: ${({ theme }) => kitC(theme).focus};
    box-shadow: 0 0 0 3px ${({ theme }) => kitC(theme).focusHalo};
  }
`

const TriggerClearBtn = styled.button`
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => kitC(theme).textMuted};
  cursor: pointer;
  transition: color 0.14s, background 0.14s;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.error};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)'};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => kitC(theme).focus};
    outline-offset: 1px;
  }
`

const OTHER_POSITION_VALUE = 'OTHER'

/**
 * 내장 직책 — 직책 정의(GovernmentPositionDefinition)를 미리 만들지 않아도
 * 재임 등록에서 바로 고를 수 있는 항목. positionType이 자동 지정된다.
 * (예: 부통령은 어느 나라든 공통이라 정의 없이 선택 가능하게 둔다.)
 */
const BUILTIN_POSITIONS = [
  {
    value: '__BUILTIN_DEPUTY_HEAD_OF_STATE__',
    label: '부통령',
    positionType: 'DEPUTY_HEAD_OF_STATE',
    title: '부통령',
    titleEn: 'Vice President',
  },
] as const

/** 인물 바 — 미니멀 카드 */
const PersonPrimaryLabel = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 400;
`

/** 사건 등록 폼 PeriodBadge 계산 — 일 단위 정밀도면 일수(+약 N년), 연/월 단위면 약 N년/개월 */
function computeTenurePeriodBadge(
  start: PartialDateParts,
  end: PartialDateParts,
  inverted: boolean,
): { text: string; sub?: string } | null {
  if (inverted) return null
  const sY = Number(start.year)
  const eY = Number(end.year)
  if (!Number.isFinite(sY) || sY <= 0 || !Number.isFinite(eY) || eY <= 0) return null

  const sM = Number(start.month)
  const sD = Number(start.day)
  const eM = Number(end.month)
  const eD = Number(end.day)
  if (
    start.era === 'AD' &&
    end.era === 'AD' &&
    sM >= 1 &&
    sM <= 12 &&
    sD >= 1 &&
    sD <= 31 &&
    eM >= 1 &&
    eM <= 12 &&
    eD >= 1 &&
    eD <= 31
  ) {
    const startUtc = new Date(Date.UTC(2000, sM - 1, sD))
    startUtc.setUTCFullYear(sY)
    const endUtc = new Date(Date.UTC(2000, eM - 1, eD))
    endUtc.setUTCFullYear(eY)
    const diffDays = Math.round((endUtc.getTime() - startUtc.getTime()) / 86_400_000)
    if (diffDays >= 0) {
      return {
        text: `${diffDays.toLocaleString()}일`,
        sub: diffDays > 365 ? `(약 ${Math.floor(diffDays / 365)}년)` : undefined,
      }
    }
  }

  const signedStart = start.era === 'BC' ? -sY : sY
  const signedEnd = end.era === 'BC' ? -eY : eY
  const yearDiff =
    start.era !== end.era ? Math.abs(signedEnd - signedStart) - 1 : signedEnd - signedStart
  if (yearDiff > 0) {
    return { text: `약 ${yearDiff}년` }
  }
  if (yearDiff === 0 && sM >= 1 && eM >= 1 && eM > sM) {
    return { text: `약 ${eM - sM}개월` }
  }
  return null
}

/** 직책 "직접 입력" — 선택 트리거에 시각적으로 종속되는 중첩 그룹 */
const ManualEntryGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 10px;
  padding: 4px 0 4px 14px;
  border-left: 2px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
`
const ManualEntryCaption = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  letter-spacing: -0.01em;
`
const ManualEntryField = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/** 「명칭 바꾸기」 — 힌트 문장 안에 들어가는 텍스트 버튼 */
const LocalTitleLink = styled.button`
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const LocalTitleActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const LocalTitleSubmit = styled.button`
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  background: #6366f1;
  color: #fff;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const LocalTitleCancel = styled.button`
  padding: 8px 10px;
  border-radius: 8px;
  border: none;
  background: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const CheckboxLabelRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  margin-top: 2px;
  padding: 2px 0;
  user-select: none;
  input[type='checkbox'] {
    width: 16px;
    height: 16px;
    accent-color: #6366f1;
    cursor: pointer;
  }
  label {
    font-size: 13px;
    color: ${({ theme }) => theme.colors.text.secondary};
    font-weight: 500;
    cursor: pointer;
  }
`

/** 스티키 푸터 좌측 삭제 — margin-right:auto로 취소·저장을 우측에 모음(재위 모달과 동일 패턴) */
const FooterDeleteBtn = styled.button`
  margin-right: auto;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.error};
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 69, 58, 0.16)'
        : 'rgba(239, 68, 68, 0.08)'};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const InlineMessage = styled.div<{ $variant?: 'loading' | 'error' }>`
  padding: 14px 18px;
  border-radius: 14px;
  font-size: 13px;
  margin-bottom: 20px;
  font-weight: 500;
  background: ${({ $variant, theme }) =>
    $variant === 'error'
      ? theme.mode === 'dark'
        ? 'rgba(255, 69, 58, 0.12)'
        : '#fef2f2'
      : theme.colors.background.tertiary};
  color: ${({ $variant, theme }) =>
    $variant === 'error' ? theme.colors.error : theme.colors.text.secondary};
`

/** 단일 국가 트리거·참여국 카드에 현대/역사 구분을 표시하는 미니 태그 (이모지 없이 타이포·톤으로 구분) */
const TriggerKindTag = styled.em<{ $historical?: boolean }>`
  font-style: normal;
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${({ $historical, theme }) =>
    $historical
      ? theme.mode === 'dark'
        ? '#c4b5fd'
        : '#5b21b6'
      : kitC(theme).textSecondary};
  background: ${({ $historical, theme }) =>
    $historical
      ? theme.mode === 'dark'
        ? 'rgba(139, 92, 246, 0.16)'
        : '#f5f3ff'
      : kitC(theme).content};
  border: 1px solid
    ${({ $historical, theme }) =>
      $historical
        ? theme.mode === 'dark'
          ? 'rgba(167, 139, 250, 0.32)'
          : '#ddd6fe'
        : kitC(theme).border};
`

/**
 * 사건 등록 모달 '참여국(ParticipantRow)'과 동일한 국가 정보 카드 (이모지 제거, 깔끔한 타이포 중심).
 * 한 장의 카드 안에서 [국가명 + 존속기간 | 현대/역사 배지 · 부가정보 | 변경 · 삭제]를 한눈에 보여준다.
 */
const CountryParticipantCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px 8px 14px;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  border-radius: 10px;
  background: ${({ theme }) => kitC(theme).section};
  transition: border-color 0.14s ease, background 0.14s ease;

  &:hover,
  &:focus-within {
    border-color: ${({ theme }) => kitC(theme).borderHover};
  }
`

const CountryCardMain = styled.button`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 10px;
  padding: 2px 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  color: ${({ theme }) => kitC(theme).textPrimary};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => kitC(theme).focus};
    outline-offset: 2px;
    border-radius: 6px;
  }
`

const CountryCardName = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => kitC(theme).textPrimary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const CountryCardMeta = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => kitC(theme).textSecondary};
`

const CountryCardSubText = styled.span`
  font-size: 12px;
  color: ${({ theme }) => kitC(theme).textMuted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
`

const CountryCardActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`

const CountryCardChangeBtn = styled.button`
  height: 28px;
  padding: 0 10px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  background: ${({ theme }) => kitC(theme).content};
  color: ${({ theme }) => kitC(theme).textSecondary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.14s ease, color 0.14s ease, background 0.14s ease;

  &:hover {
    border-color: ${({ theme }) => kitC(theme).borderHover};
    color: ${({ theme }) => kitC(theme).textPrimary};
  }
`

const CountryCardRemoveBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => kitC(theme).textMuted};
  cursor: pointer;
  transition: color 0.14s ease, background-color 0.14s ease;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.error};
    background-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)'};
  }
`

/** 인물 소속 국가 빠른 선택 미니 카드 띠 */
const AffiliatedPolityBar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
`

const AffiliatedPolityLabel = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => kitC(theme).textMuted};
  margin-right: 2px;
`

const AffiliatedPolityChip = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid
    ${({ $active, theme }) => ($active ? kitC(theme).focus : kitC(theme).border)};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(139, 92, 246, 0.16)'
        : '#f5f3ff'
      : kitC(theme).section};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#c4b5fd'
        : '#5b21b6'
      : kitC(theme).textPrimary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.14s ease, background 0.14s ease;

  &:hover {
    border-color: ${({ $active, theme }) =>
      $active ? kitC(theme).focus : kitC(theme).borderHover};
  }
`

/** 직책 검색형 Selectbox (트리거 아래 인라인 드롭다운) */
const PositionSelectWrap = styled.div`
  position: relative;
  width: 100%;
`

const PositionSelectDropdown = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => kitC(theme).borderHover};
  background: ${({ theme }) => kitC(theme).content};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 14px 34px rgba(0, 0, 0, 0.55)'
      : '0 12px 28px rgba(15, 23, 42, 0.14)'};
  overflow: hidden;
`

const PositionSearchHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid ${({ theme }) => kitC(theme).border};
  background: ${({ theme }) => kitC(theme).section};

  svg {
    flex-shrink: 0;
    color: ${({ theme }) => kitC(theme).textMuted};
  }
`

const PositionSearchInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 26px;
  border: none;
  background: transparent;
  color: ${({ theme }) => kitC(theme).textPrimary};
  font-size: 13px;
  font-family: inherit;
  outline: none;

  &::placeholder {
    color: ${({ theme }) => kitC(theme).textMuted};
  }
`

const PositionOptionList = styled.div`
  max-height: 256px;
  overflow-y: auto;
  padding: 4px;
`

const PositionGroupHeader = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  margin-top: 2px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => kitC(theme).textMuted};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => kitC(theme).section};
    color: ${({ theme }) => kitC(theme).textSecondary};
  }
`

const PositionGroupCount = styled.span`
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => kitC(theme).textMuted};
`

const PositionOptionItemBtn = styled.button<{ $active?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border: none;
  border-radius: 7px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(139, 92, 246, 0.18)'
        : '#f5f3ff'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#ddd6fe'
        : '#5b21b6'
      : kitC(theme).textPrimary};
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(139, 92, 246, 0.24)'
          : '#ede9fe'
        : kitC(theme).section};
  }
`

const PositionOptionBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const PositionOptionDesc = styled.span`
  font-size: 11px;
  font-weight: 400;
  color: ${({ theme }) => kitC(theme).textMuted};
`

const PositionEmptyBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  text-align: center;
  font-size: 12.5px;
  color: ${({ theme }) => kitC(theme).textMuted};
`

/** 검색 비교용 정규화 — 소문자 + NFKD 분해 후 결합 분음부호 제거 */
function foldForPositionSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
}

const POSITION_TYPE_SHORT_LABELS: Record<string, string> = {
  MONARCH: '군주',
  HEAD_OF_STATE: '국가원수',
  DEPUTY_HEAD_OF_STATE: '부통령·부원수',
  HEAD_OF_GOVERNMENT: '정부수반',
  CABINET_MINISTER: '각료·장관',
  VICE_MINISTER: '차관',
  LEGISLATOR: '의원·입법',
  GOVERNOR: '지방장관',
  MILITARY_COMMANDER: '군 지휘관',
  DIPLOMAT: '외교관',
  NOBLE: '작위·칭호',
}

interface CustomDropboxOption {
  value: string
  label: string
  description?: string
}

interface CustomDropboxProps {
  id?: string
  ariaLabel: string
  value: string
  placeholder: string
  options: ReadonlyArray<CustomDropboxOption>
  onChange: (value: string) => void
  clearLabel?: string
  searchable?: boolean
  searchPlaceholder?: string
}

/**
 * 네이티브 HTML <select>를 대체하는 커스텀 Dropbox 컴포넌트.
 * 직책명 드롭다운과 동일한 디자인 토큰(SelectTriggerButton + PositionSelectDropdown)을 사용한다.
 */
function CustomDropbox({
  id,
  ariaLabel,
  value,
  placeholder,
  options,
  onChange,
  clearLabel,
  searchable,
  searchPlaceholder = '검색...',
}: CustomDropboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const showSearch = searchable ?? options.length >= 10

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    if (showSearch) {
      const timer = window.setTimeout(() => {
        searchInputRef.current?.focus({ preventScroll: true })
      }, 0)
      return () => window.clearTimeout(timer)
    }
  }, [open, showSearch])

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value) ?? null,
    [options, value],
  )

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options
    const folded = foldForPositionSearch(query.trim())
    return options.filter(
      (opt) =>
        foldForPositionSearch(opt.label).includes(folded) ||
        (opt.description ? foldForPositionSearch(opt.description).includes(folded) : false),
    )
  }, [options, query])

  return (
    <PositionSelectWrap ref={wrapRef}>
      <TriggerWrap>
        <SelectTriggerButton
          id={id}
          type="button"
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          data-value={value}
          $hasValue={!!selectedOption}
          $clearable={!!selectedOption}
          onClick={() => setOpen((prev) => !prev)}
        >
          <span>{selectedOption ? selectedOption.label : placeholder}</span>
          {!selectedOption && (
            <FiChevronDown
              size={18}
              style={{
                transform: open ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s ease',
              }}
            />
          )}
        </SelectTriggerButton>
        {selectedOption && (
          <TriggerClearBtn
            type="button"
            aria-label={clearLabel ?? `${ariaLabel} 선택 해제`}
            title={clearLabel ?? `${ariaLabel} 선택 해제`}
            onClick={(event) => {
              event.stopPropagation()
              onChange('')
              setOpen(false)
            }}
          >
            <FiX size={14} />
          </TriggerClearBtn>
        )}
      </TriggerWrap>

      {open && (
        <PositionSelectDropdown role="listbox" aria-label={`${ariaLabel} 목록`}>
          {showSearch && (
            <PositionSearchHeader>
              <FiSearch size={14} />
              <PositionSearchInput
                ref={searchInputRef}
                type="text"
                aria-label={`${ariaLabel} 검색`}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
              />
              {query && (
                <CountryCardRemoveBtn
                  type="button"
                  aria-label="검색어 지우기"
                  onClick={() => setQuery('')}
                  style={{ width: 22, height: 22 }}
                >
                  <FiX size={13} />
                </CountryCardRemoveBtn>
              )}
            </PositionSearchHeader>
          )}
          <PositionOptionList>
            {filteredOptions.length === 0 ? (
              <PositionEmptyBox>일치하는 항목이 없습니다.</PositionEmptyBox>
            ) : (
              filteredOptions.map((option) => {
                const active = option.value === value
                return (
                  <PositionOptionItemBtn
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    $active={active}
                    onClick={() => {
                      onChange(active ? '' : option.value)
                      setOpen(false)
                    }}
                  >
                    <PositionOptionBody>
                      <span>{option.label}</span>
                      {option.description && (
                        <PositionOptionDesc>{option.description}</PositionOptionDesc>
                      )}
                    </PositionOptionBody>
                    {active && <FiCheck size={15} />}
                  </PositionOptionItemBtn>
                )
              })
            )}
          </PositionOptionList>
        </PositionSelectDropdown>
      )}
    </PositionSelectWrap>
  )
}

export interface TenureRegisterPanelProps {
  personId: string
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  tenureId?: string | null
  /** 행정부 탭 등에서 열 때 국가·행정부 미리 채우기 */
  initialCountryId?: string
  initialHistoricalCountryId?: string | null
  initialCabinetId?: string | null
  /** 수반·각료 겸용 진입점에서 현재 보고 있던 행정부를 기본 선택만 해 둘 때(직책 필터는 잠그지 않음) */
  defaultCabinetId?: string | null
  /** 부처(중앙부처) 지면에서 열 때 — 그 부처 소속으로 저장한다 */
  initialAdministrationDepartmentId?: string | null
  /** 부처 슬롯에서 열 때 화면에 표시할 부처 이름 */
  initialAdministrationDepartmentName?: string | null
  /**
   * 재위로 연다 — '재위 추가' 진입점. 직위 피커를 군주 칭호 우선으로 놓고, 아무것도 안 고르면
   * '국왕' 정의를 미리 고른다. 재위·재임은 한 기록(직위 보유)이라 폼도 하나다 —
   * 재위 칸(왕호·왕조 내 대수)은 고른 직위가 군주직일 때 펼쳐진다.
   */
  defaultMonarchical?: boolean
  /** 재위로 열 때 미리 고를 직위 정의 이름 — 기본 '국왕'(전역 수반 지면은 '교황') */
  defaultDefinitionTitle?: string
  /** 국가 없이도 저장 — 국가에 속하지 않는 직책(전역 수반) 지면. 재위는 원래 국가 선택 */
  countryOptional?: boolean
}

const FORM_ID = 'tenure-register-form'

export function TenureRegisterPanel({
  personId,
  open,
  onClose,
  onSuccess,
  tenureId,
  initialCountryId,
  initialHistoricalCountryId,
  initialCabinetId,
  defaultCabinetId,
  initialAdministrationDepartmentId,
  initialAdministrationDepartmentName,
  defaultMonarchical = false,
  defaultDefinitionTitle = '국왕',
  countryOptional = false,
}: TenureRegisterPanelProps) {
  const queryClient = useQueryClient()
  const isEdit = !!tenureId

  const [monarchicalMode, setMonarchicalMode] = useState(defaultMonarchical)
  const [countryId, setCountryId] = useState('')
  const [historicalCountryId, setHistoricalCountryId] = useState<string | null>(null)
  const [positionDefinitionId, setPositionDefinitionId] = useState<string | null>(null)
  /** 내장 직책(부통령 등) 선택 시 positionType 강제 지정용. 정의·기타 선택 시 null */
  const [presetPositionType, setPresetPositionType] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [titleEn, setTitleEn] = useState('')
  /**
   * 「외무장관」을 고른 뒤 이 나라에서 부르는 이름(외무대신)으로 바꾸는 입력.
   * 고른 정의 위에 다른 표기를 덧씌우는 게 아니라, 그 나라 전용 정의를 새로 담는다 —
   * 덧씌우기는 표시 지면이 정의 이름을 우선하므로 저장돼도 보이지 않는다.
   */
  const [localTitleOpen, setLocalTitleOpen] = useState(false)
  /**
   * 직책 '직접 입력' 칸을 연 상태 — '기타 (직접 입력)'을 고르거나 링크를 눌렀을 때만 연다.
   * (예전엔 '정의 미선택'이면 열려서 아무것도 고르지 않은 첫 화면부터 한글·영문 입력칸이 늘 펼쳐져 있었다)
   */
  const [manualEntryOpen, setManualEntryOpen] = useState(false)
  const [specificTitleOpen, setSpecificTitleOpen] = useState(false)
  const [localTitleDraft, setLocalTitleDraft] = useState('')
  const [localTitleSaving, setLocalTitleSaving] = useState(false)
  /** 기간 — 구조화 파츠(기원전·연 단위까지). 월·일을 비우면 그만큼만 안다는 뜻 */
  const [start, setStart] = useState<PartialDateParts>(emptyPartialDateParts())
  const [end, setEnd] = useState<PartialDateParts>(emptyPartialDateParts())
  const patchStart = (patch: Partial<PartialDateParts>) => setStart((prev) => ({ ...prev, ...patch }))
  const patchEnd = (patch: Partial<PartialDateParts>) => setEnd((prev) => ({ ...prev, ...patch }))
  /** 달력 보조 모달 대상(시작/종료) — InlineDateField의 달력 버튼이 연다 */
  const [datePickerSide, setDatePickerSide] = useState<'start' | 'end' | null>(null)
  /** 재직명(왕호·교황명) — 재위일 때 */
  const [regnalName, setRegnalName] = useState('')
  /** 즉위·취임 사건 링크 — id는 저장, title은 칩 표시용 */
  const [linkedAccessionEvent, setLinkedAccessionEvent] = useState<EventPickerSelection | null>(null)
  const [accessionEventPickerOpen, setAccessionEventPickerOpen] = useState(false)
  /** 대수 — 재위·재임 공통(국가·정체 기준 통산 제N대) */
  const [ordinalNumber, setOrdinalNumber] = useState('')
  const [subTermNumber, setSubTermNumber] = useState('')
  /** 왕조 내 서수 — 재위(군주직) 수정 시에만 의미, "부르봉 왕조 N대" */
  const [dynastyOrdinal, setDynastyOrdinal] = useState('')
  const [appointmentMethod, setAppointmentMethod] = useState('')
  /** 즉위/취임 경위 상세 서사 — appointmentMethod(enum)의 상세 쌍, endReasonDetail의 시작측 대칭 */
  const [appointmentDetail, setAppointmentDetail] = useState('')
  const [endReason, setEndReason] = useState('')
  const [endReasonDetail, setEndReasonDetail] = useState('')
  const [notes, setNotes] = useState('')
  const [showOnEvents, setShowOnEvents] = useState(true)
  const [cabinetId, setCabinetId] = useState<string | null>(null)
  const [eventAttachModalOpen, setEventAttachModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [countryModalOpen, setCountryModalOpen] = useState(false)
  const [positionModalOpen, setPositionModalOpen] = useState(false)
  const [positionQuery, setPositionQuery] = useState('')
  const [positionGroupToggles, setPositionGroupToggles] = useState<Record<string, boolean>>({})
  const positionDropdownRef = useRef<HTMLDivElement>(null)
  const positionSearchInputRef = useRef<HTMLInputElement>(null)
  const [personImageError, setPersonImageError] = useState(false)

  useEffect(() => {
    if (!positionModalOpen) {
      setPositionQuery('')
      setPositionGroupToggles({})
      return
    }
    const timer = window.setTimeout(() => {
      positionSearchInputRef.current?.focus({ preventScroll: true })
    }, 0)
    const handlePointerDown = (event: MouseEvent) => {
      if (
        positionDropdownRef.current &&
        !positionDropdownRef.current.contains(event.target as Node)
      ) {
        setPositionModalOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [positionModalOpen])

  const { data: countries = [] } = useCountries()
  // 현대 국가 소속 역사국가 목록 + 보수적 해제 정책(재위 패널과 동일 정책, 공용 훅)
  const { historicalCountries } = useHistoricalCountryScope({
    open,
    countryId,
    historicalCountryId,
    onClearHistoricalCountry: () => setHistoricalCountryId(null),
  })
  // 현대 국가를 선택하지 않아도 역사적 국가를 직접 고를 수 있도록 전체 목록도 확보한다.
  const { data: allHistoricalCountries = [] } = useHistoricalCountries()

  const allHistoricalById = useMemo(() => {
    const map = new Map<string, any>()
    for (const item of allHistoricalCountries as any[]) {
      if (item?.id) map.set(item.id, item)
    }
    return map
  }, [allHistoricalCountries])

  const modernCountryOptions = useMemo(
    () =>
      (countries as any[]).map((c: any) => ({
        id: c.id,
        name: c.name ?? c.localName ?? c.id,
        enName: c.enName ?? null,
        localName: c.localName ?? null,
        isoCode: c.isoCode ?? null,
        continentId: c.continentId ?? null,
        flagEmoji: c.flagEmoji ?? null,
        capital: c.capital ?? null,
        population: c.population != null ? String(c.population) : null,
        areaSqKm: c.areaSqKm ?? null,
      })),
    [countries],
  )

  // 통합 CountryPicker의 '역사적 국가' 탭에 넘길 전체 역사국가 옵션.
  const historicalCountryOptions = useMemo(() => {
    const source =
      (allHistoricalCountries as any[]).length > 0
        ? (allHistoricalCountries as any[])
        : (historicalCountries as any[])
    return source.map((historical: any) => {
      const full = allHistoricalById.get(historical.id) ?? historical
      return {
        id: historical.id,
        name: historical.name ?? full?.name ?? historical.id,
        enName: full?.enName ?? historical.enName ?? null,
        localName: full?.localName ?? historical.localName ?? null,
        continentId: full?.continentId ?? historical.continentId ?? null,
        startEra: full?.startEra ?? historical.startEra ?? null,
        startYear: full?.startYear ?? historical.startYear ?? null,
        endEra: full?.endEra ?? historical.endEra ?? null,
        endYear: full?.endYear ?? historical.endYear ?? null,
        stateType: full?.stateType ?? historical.stateType ?? null,
      }
    })
  }, [allHistoricalCountries, historicalCountries, allHistoricalById])

  // F33 소프트 경고 — 선택된 역사국가의 존속기간과 취임 연도를 대조.
  // 존속기간은 구조화(startEra/Year)로 100% 채워져 있는 allHistoricalCountries가 진실이라
  // 여기서 조회한다. 기간도 구조화 파츠(BC 지원)라 BC 국가·BC 취임도 대조한다. 저장은 막지 않는다.
  const lifespanWarning = useMemo(() => {
    if (!historicalCountryId) return null
    const selected = (allHistoricalCountries as Array<{
      id: string
      startEra?: string | null
      startYear?: number | null
      endEra?: string | null
      endYear?: number | null
    }>).find((historical) => historical.id === historicalCountryId)
    if (!selected) return null
    const startInfo = partialPartsToDateInfo(start)
    const signedYear = startInfo ? (startInfo.era === 'BC' ? -startInfo.year : startInfo.year) : null
    return describeLifespanMismatch(selected, signedYear, { recordSupportsBc: true })
  }, [historicalCountryId, allHistoricalCountries, start])

  /**
   * 직책 피커 데이터 — 정의(적용 범위 하드컷 통과분) + 이 국가에서의 사용 실적 + 자유입력 직책명.
   * 국가를 아직 고르지 않았으면 서버가 전량 반환한다(조용히 좁히지 않는다).
   * 쿼리키는 ['position-definitions', …] 프리픽스로 통일해 정의를 새로 만들었을 때
   * 한 번의 무효화로 재임·재위·관리 화면이 함께 갱신되게 한다.
   */
  const { data: pickerData } = useQuery({
    queryKey: [
      'position-definitions',
      'picker',
      countryId,
      historicalCountryId,
      // 현재 선택된 정의는 스코프 하드컷을 관통시킨다 — 편집 중 목록에서 빠져 연결이 유실되는 것 방지
      positionDefinitionId,
    ],
    queryFn: () =>
      personCareerApi.getPositionDefinitionsForPicker({
        countryId: countryId || undefined,
        historicalCountryId: historicalCountryId || undefined,
        includeId: positionDefinitionId,
      }),
    enabled: open,
    // 직책을 고르면 쿼리키(positionDefinitionId)가 바뀐다 — 이전 결과를 유지하지 않으면
    // 재조회 동안 목록이 빈 배열이 되어 positionType이 잠깐 'OTHER'로 떨어진다(그 창에 저장하면 오염).
    placeholderData: (previous) => previous,
  })
  const positionDefinitions = pickerData?.definitions ?? []
  const recentTitles = pickerData?.recentTitles ?? []

  const { data: cabinets = [] } = useQuery({
    queryKey: ['cabinets-by-country', countryId, historicalCountryId],
    queryFn: () =>
      personCareerApi.getCabinets({
        countryId: countryId || undefined,
        historicalCountryId: historicalCountryId || undefined,
      }),
    enabled: open && (!!countryId || !!historicalCountryId),
  })

  const cabinetOptions: SelectOption<string>[] = useMemo(() => {
    return (cabinets as any[]).map((c: any) => {
      const head = c.headTenure
      const personName = head?.person?.name ?? head?.person?.surname ?? '이름 없음'
      const posTitle = head?.title ?? head?.positionDefinition?.title ?? c.name ?? '행정부'
      // 연도는 문자열에서 직접 추출(TZ 안전) — getFullYear()는 UTC 서쪽 타임존에서 1월 1일 시작 임기를 전년도로 보여준다
      const headStartYear = head?.startDate ? parseIsoDateParts(head.startDate)?.year ?? '' : ''
      const headEndYear = head?.endDate ? parseIsoDateParts(head.endDate)?.year ?? '' : '현재'
      const range = headStartYear && headEndYear ? ` (${headStartYear}~${headEndYear})` : ''
      return {
        value: c.id,
        label: `${personName} - ${posTitle}${range}`,
      }
    })
  }, [cabinets])

  const { data: personDetail } = useQuery({
    queryKey: ['person-detail', personId],
    queryFn: () => getPersonDetailById(personId),
    enabled: open && !!personId,
  })

  const {
    data: personTenures = [],
    isLoading: loadingTenures,
  } = useQuery({
    queryKey: ['person-tenures', personId],
    queryFn: () => personCareerApi.getTenuresByPersonId(personId),
    enabled: open && !!personId && !!tenureId,
  })

  const editingTenure = tenureId
    ? (personTenures as any[]).find((t: any) => t.id === tenureId)
    : null

  /** 재위로 연 경우(재위 추가·재위 수정) — 피커를 군주 칭호 우선으로 */
  const reignEntry = isEdit ? (editingTenure as any)?.isMonarchical === true : monarchicalMode

  /**
   * 수정 중인 재임이 참조하는 정의 — 서버 목록에서 빠져도(국가 스코프·군주 제외·각료 필터)
   * 옵션 pool에 되살린다. 빠진 채로 두면 selectedDef가 null이 되어 라벨이 `기타: X`로
   * 강등되고, 그대로 저장하면 positionDefinitionId가 소리 없이 유실된다.
   * findTenuresByPersonId가 positionDefinition 객체를 통째로 내려주므로 추가 조회는 없다.
   */
  const pinnedDefinition: PositionDefinitionLike | null =
    editingTenure?.positionDefinition ?? null

  const definitionPool = useMemo(() => {
    const pool = positionDefinitions as PositionDefinitionLike[]
    if (!pinnedDefinition?.id || pool.some((def) => def.id === pinnedDefinition.id)) {
      return pool
    }
    return [...pool, pinnedDefinition]
  }, [positionDefinitions, pinnedDefinition])

  const selectedDef = positionDefinitionId
    ? definitionPool.find((def) => def.id === positionDefinitionId)
    : null
  /** 일반 정의(종류만)를 골랐나 — 구체 직함 입력이 필수다 */
  const selectedIsGeneric = selectedDef?.isGeneric === true
  const positionType =
    selectedDef?.positionType ?? presetPositionType ?? editingTenure?.positionType ?? 'OTHER'

  /** 이 기록이 재위인가 — 고른 직위 정의가 군주직이면. 정의를 아직 안 골랐으면 진입 맥락을 따른다 */
  const isReign = selectedDef ? selectedDef.isMonarchical === true : reignEntry
  /** 국가가 필수인가 — 재위(교황 등 국가 밖 군주)·전역 지면은 선택 */
  const countryRequired = !isReign && !countryOptional

  /** 수반 계열 직책 — 자신이 행정부의 수장이므로 소속 행정부(cabinetId) 동시 지정 시 백엔드가 400으로 거부 */
  const isHeadPositionType =
    positionType === 'HEAD_OF_STATE' || positionType === 'HEAD_OF_GOVERNMENT'

  /**
   * 각료 추가로 열렸을 때는 각료/차관/기타만 표시; 일반 재임은 군주·주권 칭호 제외 +
   * 작위는 접히는 별도 그룹으로 강등(공직 임기가 아니므로).
   */
  const isMinisterFlowForFilter = !tenureId && initialCabinetId != null
  const positionTitleOptions: SelectOption<string>[] = useMemo(
    () =>
      reignEntry
        ? // 재위 — 군주 칭호·작위를 위로, 그 밖의 직위는 접힌 그룹으로(쇼군처럼 관직 유형 재위도 고를 수 있게)
          [
            ...buildReignPositionOptions({
              definitions: positionDefinitions as PositionDefinitionLike[],
              pinnedDefinition,
            }),
            { value: OTHER_POSITION_VALUE, label: '기타 (직접 입력)' },
          ]
        : buildPositionOptions({
            definitions: positionDefinitions as PositionDefinitionLike[],
            isMinisterFlow: isMinisterFlowForFilter,
            builtins: BUILTIN_POSITIONS,
            pinnedDefinition,
            recentTitles,
            otherValue: OTHER_POSITION_VALUE,
          }),
    [reignEntry, positionDefinitions, isMinisterFlowForFilter, pinnedDefinition, recentTitles],
  )

  /**
   * 피커에서 체크가 찍힐 값 — 정의 → 자유입력 실적 → 내장 직책 → 기타 순으로 되짚는다.
   * 자유입력 실적을 먼저 보는 이유: 그 항목들도 presetPositionType을 세우기 때문에,
   * 내장 직책을 먼저 보면 유형만 같고 표기가 다른 항목에 체크가 잘못 찍힌다.
   */
  const selectedPositionValue = useMemo(() => {
    if (positionDefinitionId) return positionDefinitionId
    const trimmedTitle = title.trim()
    const matchedRecent = trimmedTitle
      ? (recentTitles.find(
          (row) => row.title === trimmedTitle && row.positionType === presetPositionType,
        ) ?? recentTitles.find((row) => row.title === trimmedTitle))
      : undefined
    if (matchedRecent) {
      return recentTitleValue(matchedRecent.title, matchedRecent.positionType)
    }
    if (presetPositionType) {
      const builtin = BUILTIN_POSITIONS.find(
        (candidate) => candidate.positionType === presetPositionType,
      )
      if (builtin) return builtin.value
    }
    return OTHER_POSITION_VALUE
  }, [positionDefinitionId, title, recentTitles, presetPositionType])

  const positionTitleLabel =
    positionDefinitionId == null
      ? presetPositionType
        ? title.trim() || '직책 선택'
        : title.trim()
          ? `기타: ${title}`
          : '직책 선택'
      : (selectedDef?.title ?? selectedDef?.name ?? (title || '직책 선택'))

  const collapsedPositionGroups = reignEntry
    ? DEFAULT_COLLAPSED_REIGN_GROUPS
    : DEFAULT_COLLAPSED_POSITION_GROUPS

  const filteredPositionOptions = useMemo(() => {
    if (!positionQuery.trim()) return positionTitleOptions
    const folded = foldForPositionSearch(positionQuery.trim())
    return positionTitleOptions.filter(
      (opt) =>
        foldForPositionSearch(opt.label).includes(folded) ||
        (opt.description ? foldForPositionSearch(opt.description).includes(folded) : false),
    )
  }, [positionTitleOptions, positionQuery])

  const positionGroupCounts = useMemo(() => {
    const counts = new Map<string, number>()
    filteredPositionOptions.forEach((opt) => {
      if (opt.group) counts.set(opt.group, (counts.get(opt.group) ?? 0) + 1)
    })
    return counts
  }, [filteredPositionOptions])

  const positionGroupsWithSelection = useMemo(() => {
    const found = new Set<string>()
    positionTitleOptions.forEach((opt) => {
      if (opt.group && opt.value === selectedPositionValue) found.add(opt.group)
    })
    return found
  }, [positionTitleOptions, selectedPositionValue])

  const isPositionGroupExpandedByState = (group: string): boolean => {
    const toggled = positionGroupToggles[group]
    if (toggled !== undefined) return toggled
    if (positionGroupsWithSelection.has(group)) return true
    return !(collapsedPositionGroups ?? []).includes(group)
  }

  const isPositionGroupExpanded = (group: string): boolean =>
    positionQuery.trim() ? true : isPositionGroupExpandedByState(group)

  const handlePositionSelect = (value: string) => {
    setPositionModalOpen(false)
    // 정의를 고르면 직접 입력은 닫고, '기타'를 고르면 연다(아래 분기)
    setManualEntryOpen(value === OTHER_POSITION_VALUE)
    // 다른 직책을 고르면 열어 둔 '이 나라 명칭' 입력은 원본이 바뀌므로 닫는다
    setLocalTitleOpen(false)
    setLocalTitleDraft('')
    const builtin = BUILTIN_POSITIONS.find((b) => b.value === value)
    if (builtin) {
      setPositionDefinitionId(null)
      setTitle(builtin.title)
      setTitleEn(builtin.titleEn)
      setPresetPositionType(builtin.positionType)
      return
    }
    // 자유입력 실적 선택 — 정의 연결 없이 표기와 직위 유형만 복원한다.
    // presetPositionType을 함께 세워야 positionType이 'OTHER'로 떨어지지 않는다.
    const recentTitle = parseRecentTitleValue(value)
    if (recentTitle != null) {
      setPositionDefinitionId(null)
      setTitle(recentTitle.title)
      setTitleEn('')
      setPresetPositionType(recentTitle.positionType)
      return
    }
    if (value === OTHER_POSITION_VALUE) {
      setPositionDefinitionId(null)
      setTitle('')
      setTitleEn('')
      setPresetPositionType(null)
    } else {
      const def = definitionPool.find((definition) => definition.id === value)
      if (def?.isGeneric) {
        // 일반 정의(군 지휘관·특별 직위…) — 종류만 정하고 구체 직함을 직접 입력한다
        setPositionDefinitionId(def.id)
        setTitle('')
        setTitleEn('')
        setPresetPositionType(null)
        setManualEntryOpen(true)
      } else if (def) {
        setPositionDefinitionId(def.id)
        setTitle('')
        setTitleEn(def.titleEn ?? '')
        setPresetPositionType(null)
      }
    }
  }

  /**
   * 이 나라에서 부르는 이름으로 담기 — 원본(외무장관)은 그대로 두고 국가 스코프 정의를
   * 새로 만들어 그것을 고른다. 만들어진 정의는 다음부터 이 나라 피커에 바로 뜬다.
   */
  const applyLocalTitle = async () => {
    if (!selectedDef?.id) return
    setLocalTitleSaving(true)
    try {
      const result = await deriveCountryScopedPositionDefinition({
        source: {
          id: selectedDef.id,
          title: selectedDef.title ?? (selectedDef as { name?: string }).name ?? '',
          positionType: selectedDef.positionType ?? null,
        },
        newTitle: localTitleDraft,
        countryId: countryId || null,
        historicalCountryId: historicalCountryId || null,
        pool: definitionPool,
      })
      await queryClient.invalidateQueries({ queryKey: ['position-definitions'] })
      setPositionDefinitionId(result.id)
      setTitle('')
      setPresetPositionType(null)
      setLocalTitleOpen(false)
      setLocalTitleDraft('')
      notify.success(
        result.reused
          ? `「${result.title}」 직책을 골랐습니다`
          : `이 나라 직책 「${result.title}」을(를) 담았습니다`,
      )
    } catch (error) {
      notify.error(
        error instanceof ScopedDefinitionError
          ? error.message
          : '이 나라 명칭으로 담지 못했습니다.',
      )
    } finally {
      setLocalTitleSaving(false)
    }
  }

  /**
   * 국가가 바뀌면 직책 선택을 놓는다 — 새 국가 기준으로 정의 목록이 다시 오기 때문.
   * 이때 정의·내장 직책에서 유래한 title까지 함께 비우지 않으면 '총리'가 자유입력으로 남아
   * `기타: 총리`로 저장된다(실측: 정의가 존재하는데도 positionDefinitionId가 NULL인 재임 5행).
   * 사용자가 손으로 친 텍스트는 유래가 없으므로 그대로 보존한다.
   */
  const releasePositionOnCountryChange = () => {
    const derivedFromCatalog = !!positionDefinitionId || !!presetPositionType
    setPositionDefinitionId(null)
    if (derivedFromCatalog) {
      setTitle('')
      setTitleEn('')
      setPresetPositionType(null)
    }
  }

  const resetForm = () => {
    setMonarchicalMode(defaultMonarchical)
    setManualEntryOpen(false)
    setSpecificTitleOpen(false)
    setCountryId('')
    setHistoricalCountryId(null)
    setPositionDefinitionId(null)
    setPresetPositionType(null)
    setTitle('')
    setTitleEn('')
    setStart(emptyPartialDateParts())
    setEnd(emptyPartialDateParts())
    setDatePickerSide(null)
    setRegnalName('')
    setLinkedAccessionEvent(null)
    setOrdinalNumber('')
    setSubTermNumber('')
    setDynastyOrdinal('')
    setAppointmentMethod('')
    setAppointmentDetail('')
    setEndReason('')
    setEndReasonDetail('')
    setNotes('')
    setShowOnEvents(true)
    setCabinetId(null)
  }

  useEffect(() => {
    if (!open) {
      resetForm()
      setPersonImageError(false)
      setDeleteConfirmOpen(false)
    } else if (!isEdit) {
      setMonarchicalMode(defaultMonarchical)
    }
  }, [open, isEdit, defaultMonarchical])

  /** 행정부 탭 등에서 열 때 국가·행정부 미리 채우기 (추가 모드 전용) */
  useEffect(() => {
    if (
      open &&
      !isEdit &&
      (initialCountryId != null ||
        initialHistoricalCountryId != null ||
        initialCabinetId != null ||
        defaultCabinetId != null)
    ) {
      if (initialCountryId != null) setCountryId(initialCountryId)
      if (initialHistoricalCountryId !== undefined)
        setHistoricalCountryId(initialHistoricalCountryId ?? null)
      if (initialCabinetId !== undefined) setCabinetId(initialCabinetId ?? null)
      else if (defaultCabinetId !== undefined)
        setCabinetId(defaultCabinetId ?? null)
    }
  }, [
    open,
    isEdit,
    initialCountryId,
    initialHistoricalCountryId,
    initialCabinetId,
    defaultCabinetId,
  ])

  useEffect(() => {
    setPersonImageError(false)
  }, [personDetail?.id])

  /** 재위로 열었는데 직위를 아직 안 골랐으면 기본 직위('국왕' 등)를 미리 고른다 — 한 번만(사용자가 비우면 다시 채우지 않음) */
  const defaultReignAppliedRef = useRef(false)
  useEffect(() => {
    if (!open) {
      defaultReignAppliedRef.current = false
      return
    }
    if (isEdit || !monarchicalMode || defaultReignAppliedRef.current) return
    const defaultDefinition = (positionDefinitions as PositionDefinitionLike[]).find(
      (definition) => definition.title === defaultDefinitionTitle,
    )
    if (!defaultDefinition) return
    defaultReignAppliedRef.current = true
    if (positionDefinitionId || title.trim()) return
    setPositionDefinitionId(defaultDefinition.id)
    setTitle('')
    setTitleEn(defaultDefinition.titleEn ?? '')
    setPresetPositionType(null)
  }, [open, isEdit, monarchicalMode, defaultDefinitionTitle, positionDefinitions, positionDefinitionId, title])

  /** 수반 직책 선택 시 소속 행정부 지정 불가(백엔드 400) — 선택돼 있던 행정부는 자동 해제 */
  useEffect(() => {
    if (isHeadPositionType && cabinetId) setCabinetId(null)
  }, [isHeadPositionType, cabinetId])

  useEffect(() => {
    if (!open || !editingTenure) return
    const t = editingTenure as any
    setMonarchicalMode(t.isMonarchical === true)
    setCountryId(t.countryId ?? t.country?.id ?? '')
    setHistoricalCountryId(t.historicalCountryId ?? t.historicalCountry?.id ?? null)
    const hydratedDefId = t.positionDefinitionId ?? t.positionDefinition?.id ?? null
    setPositionDefinitionId(hydratedDefId)
    // 정의 없이 내장 직책(부통령 등) 타입으로 저장된 재임이면 preset 복원 → 라벨·선택 표시 유지
    const builtinForType = BUILTIN_POSITIONS.find((b) => b.positionType === t.positionType)
    setPresetPositionType(!hydratedDefId && builtinForType ? builtinForType.positionType : null)
    // 구체 직함 — 일반 정의·정의 미선택이면 그 직함, 카탈로그 정의면 정의 이름과 다를 때만 구체 직함으로 복원
    const hydratedGeneric = t.positionDefinition?.isGeneric === true
    const defTitle = t.positionDefinition?.title ?? ''
    const specificTitle =
      !hydratedDefId || hydratedGeneric
        ? t.title ?? ''
        : t.title && t.title !== defTitle
          ? t.title
          : ''
    setTitle(specificTitle)
    setSpecificTitleOpen(Boolean(hydratedDefId && !hydratedGeneric && specificTitle))
    setManualEntryOpen(hydratedGeneric)
    setTitleEn(t.titleEn ?? '')
    // 구조화(startEra/startYear/...) 우선, 없으면 DATETIME+정밀도 폴백 → 파츠 복원
    setStart(
      parsePartialDateString(
        partialDateFromStructured(t.startYear, t.startMonth, t.startDay, t.startEra) ||
          partialDateFromResponse(t.startDate, t.startEra, t.startDatePrecision),
      ),
    )
    setEnd(
      parsePartialDateString(
        partialDateFromStructured(t.endYear, t.endMonth, t.endDay, t.endEra) ||
          partialDateFromResponse(t.endDate, t.endEra, t.endDatePrecision),
      ),
    )
    setRegnalName(t.regnalName ?? '')
    setLinkedAccessionEvent(
      t.accessionEvent?.id
        ? { id: t.accessionEvent.id, title: t.accessionEvent.title ?? '' }
        : t.accessionEventId
          ? { id: t.accessionEventId, title: '연결된 사건' }
          : null,
    )
    // 대수 — 재위·재임 공통 ordinal
    const num = t.ordinal
    setOrdinalNumber(num != null ? String(num) : '')
    setSubTermNumber(t.subTermNumber != null ? String(t.subTermNumber) : '')
    setDynastyOrdinal(t.dynastyOrdinal != null ? String(t.dynastyOrdinal) : '')
    setAppointmentMethod(t.appointmentMethod ?? '')
    setAppointmentDetail(t.appointmentDetail ?? '')
    setEndReason(t.endReason ?? '')
    setEndReasonDetail(t.endReasonDetail ?? '')
    setNotes(t.notes ?? '')
    setShowOnEvents(t.showPositionInfo !== false)
    setCabinetId(t.cabinetId ?? t.cabinet?.id ?? null)
  }, [open, editingTenure])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!personId) return
    // 역사국가 전용 행(countryId NULL)도 수정 가능해야 함 — 둘 중 하나만 있으면 통과.
    // 재위는 국가 없이도(교황 등 국가 밖 군주) 저장한다 — 옛 재위 패널과 같은 규칙
    if (countryRequired && !countryId && !historicalCountryId) {
      notify.error('국가를 선택해 주세요.')
      return
    }
    const def = selectedDef as any
    /**
     * 직함 — 모든 재임은 정의(카탈로그)를 갖고, title은 정의보다 구체적인 이름일 때만 남는다
     * ('대사' + '주러시아 대사', 일반 정의 '군 지휘관' + '제7보병연대 소위'). 표시는 title → 정의 이름.
     * 정의 이름과 같은 값은 서버가 비운다.
     */
    const isGenericChosen = def?.isGeneric === true
    const titleValue = isGenericChosen ? title.trim() : title.trim() || def?.title || ''
    if (!titleValue) {
      notify.error(isGenericChosen ? '구체 직함을 입력해 주세요.' : '직책을 선택하거나 직접 입력해 주세요.')
      return
    }
    const startInfo = partialPartsToDateInfo(start)
    const endInfo = partialPartsToDateInfo(end)
    if (!startInfo) {
      notify.error(isReign ? '즉위 연도를 입력해 주세요.' : '취임 연도를 입력해 주세요.')
      return
    }
    // 기간 역전 — 재임은 막고, 재위는 추존·복위 같은 정당한 경우가 있어 경고만(아래 화면 경고)
    if (!isReign && isPartialRangeInverted(start, end)) {
      notify.error('퇴임일이 취임일보다 빠를 수 없습니다.')
      return
    }
    /** 수정 모드: 비운 값은 명시적 null(해제) 전송 — undefined면 서버가 기존 값을 유지해 silent no-op */
    const emptyAs = isEdit && tenureId ? null : undefined
    const parsedOrdinal = ordinalNumber.trim()
      ? parseInt(ordinalNumber, 10) || emptyAs
      : emptyAs
    const parsedSubTerm = subTermNumber.trim()
      ? parseInt(subTermNumber, 10) || emptyAs
      : emptyAs
    const parsedDynastyOrdinal = dynastyOrdinal.trim()
      ? parseInt(dynastyOrdinal, 10) || emptyAs
      : emptyAs
    const payload = {
      positionType: (positionType as any) ?? 'OTHER',
      // 정의를 비우면(직접 입력) 수정 때 null — 서버가 그 종류의 일반 정의로 옮긴다
      positionDefinitionId: positionDefinitionId || emptyAs,
      title: titleValue,
      titleEn: titleEn.trim() || emptyAs,
      countryId: historicalCountryId ? emptyAs : (countryId || emptyAs),
      historicalCountryId: historicalCountryId || emptyAs,
      // 구조화 기간 — 서버가 정렬 키·DATETIME(AD 1000+)·정밀도를 파생한다. 수정 때 종료 비움 = 해제
      startDateInfo: startInfo,
      endDateInfo: endInfo ?? emptyAs,
      // 재위 칸 — 재위에서 관직으로 바꿨거나 값을 비우면 수정 시 null(해제) 전송
      regnalName: isReign ? regnalName.trim() || emptyAs : emptyAs,
      dynastyOrdinal: isReign ? parsedDynastyOrdinal : emptyAs,
      // 즉위·취임 사건 — 사건 화면에서 건 연결도 수정 폼이 하이드레이트하므로 그대로 왕복된다
      accessionEventId: linkedAccessionEvent?.id ?? emptyAs,
      ordinal: parsedOrdinal,
      subTermNumber: parsedSubTerm,
      appointmentMethod: (appointmentMethod || emptyAs) as any,
      appointmentDetail: appointmentDetail.trim() || emptyAs,
      endReason: (endReason || emptyAs) as any,
      endReasonDetail: endReasonDetail.trim() || emptyAs,
      notes: notes.trim() || emptyAs,
      showPositionInfo: showOnEvents,
      cabinetId: cabinetId || emptyAs,
      // 부처 지면에서 연 경우에만 실린다. 그 밖에는 undefined라 기존 값이 보존된다.
      administrationDepartmentId:
        initialAdministrationDepartmentId ?? undefined,
    }
    setSubmitting(true)
    try {
      if (isEdit && tenureId) {
        await personCareerApi.updateGovernmentPositionTenure(tenureId, payload as any)
        notify.success(isReign ? '재위 기록이 수정되었습니다.' : '재임 기록이 수정되었습니다.')
      } else {
        await personCareerApi.addGovernmentPositionTenure({
          ...payload,
          personId,
          // 생성 모드에서는 emptyAs === undefined 라 null이 실제로 들어가지 않음
        } as CreateGovernmentPositionTenureDto)
        notify.success(isReign ? '재위 기록이 추가되었습니다.' : '재임 기록이 추가되었습니다.')
      }
      onClose()
      invalidateTenureQueries(queryClient, { personId })
      onSuccess?.()
    } catch (err: any) {
      notify.error(err?.message || '저장에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!tenureId) return
    setDeleteConfirmOpen(false)
    setSubmitting(true)
    try {
      // 재위·재임 같은 재임 행 — 엔드포인트 하나
      await personCareerApi.deleteGovernmentPositionTenure(tenureId)
      notify.success(isReign ? '재위 기록이 삭제되었습니다.' : '재임 기록이 삭제되었습니다.')
      onClose()
      invalidateTenureQueries(queryClient, { personId })
      onSuccess?.()
    } catch (err: any) {
      notify.error(err?.message || '삭제에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const submitDisabled =
    submitting ||
    (isEdit && !!tenureId && !editingTenure) ||
    !personId ||
    // 역사국가 전용 행(countryId NULL) 수정 잠금 방지 — 둘 중 하나만 있으면 됨. 재위는 국가 선택
    (countryRequired && !countryId && !historicalCountryId) ||
    (selectedIsGeneric ? !title.trim() : !(selectedDef as any)?.title && !title.trim()) ||
    partialPartsToDateInfo(start) == null

  const hasCountry = !countryRequired || !!countryId || !!historicalCountryId
  const hasPosition = selectedIsGeneric ? !!title.trim() : !!(selectedDef as any)?.title || !!title.trim()
  const hasStartDate = partialPartsToDateInfo(start) != null
  /** 재위 기간 역전 — 저장은 막지 않고 경고만(추존·복위) */
  const periodInverted = isPartialRangeInverted(start, end)
  const periodBadge = useMemo(
    () => computeTenurePeriodBadge(start, end, periodInverted),
    [start, end, periodInverted],
  )

  const selectedModernCountry = useMemo(
    () =>
      countryId
        ? modernCountryOptions.find((country) => country.id === countryId) ?? null
        : null,
    [countryId, modernCountryOptions],
  )

  const selectedHistoricalCountry = useMemo(() => {
    if (!historicalCountryId) return null
    return (
      historicalCountryOptions.find((option) => option.id === historicalCountryId) ??
      allHistoricalById.get(historicalCountryId) ??
      ((editingTenure as { historicalCountry?: { id?: string; name?: string } } | null)
        ?.historicalCountry
        ? {
            id: historicalCountryId,
            name:
              (editingTenure as { historicalCountry?: { name?: string } })?.historicalCountry
                ?.name ?? '역사적 국가',
          }
        : null)
    )
  }, [historicalCountryId, historicalCountryOptions, allHistoricalById, editingTenure])

  const selectedHistoricalPeriodLabel = useMemo(() => {
    if (!selectedHistoricalCountry) return ''
    return formatCountryPeriod(selectedHistoricalCountry as any, { variant: 'short' })
  }, [selectedHistoricalCountry])

  /**
   * 역사적 국가 피커 시대 힌트 — 입력된 취임/퇴임 연도가 있으면 우선 사용하고,
   * 아직 입력 전이면 인물의 생몰년(birthYear/deathYear)으로 그 시대의 국가를 상단에 띄운다.
   */
  const hintYearRange = useMemo(() => {
    const startInfo = partialPartsToDateInfo(start)
    const endInfo = partialPartsToDateInfo(end)
    if (startInfo || endInfo) {
      return {
        startYear: startInfo ? toSignedYear(startInfo.era, startInfo.year) : null,
        endYear: endInfo ? toSignedYear(endInfo.era, endInfo.year) : null,
      }
    }
    const p = personDetail as
      | {
          birthYear?: number | null
          birthEra?: string | null
          deathYear?: number | null
          deathEra?: string | null
        }
      | undefined
    if (p?.birthYear != null || p?.deathYear != null) {
      return {
        startYear: toSignedYear(p.birthEra, p.birthYear),
        endYear: toSignedYear(p.deathEra, p.deathYear),
      }
    }
    return undefined
  }, [start, end, personDetail])

  /** 인물에 등록된 소속 국가(현대·역사) 인라인 바로 선택 목록 */
  const personAffiliatedPolities = useMemo(() => {
    const p = personDetail as
      | {
          countryId?: string | null
          country?: { id?: string; name?: string | null; flagEmoji?: string | null } | null
          historicalCountryId?: string | null
          historicalCountry?: { id?: string; name?: string | null } | null
          countryAffiliations?: Array<{
            countryId?: string | null
            historicalCountryId?: string | null
            country?: { id?: string; name?: string | null; flagEmoji?: string | null } | null
            historicalCountry?: { id?: string; name?: string | null } | null
          }> | null
        }
      | undefined
    if (!p) return []
    const items: Array<{
      key: string
      id: string
      name: string
      isHistorical: boolean
      flagEmoji?: string | null
      periodText?: string
    }> = []
    const seen = new Set<string>()
    const addModern = (id?: string | null, name?: string | null, flagEmoji?: string | null) => {
      if (!id) return
      const key = `m:${id}`
      if (seen.has(key)) return
      const found = modernCountryOptions.find((c) => c.id === id)
      const resolvedName = name ?? found?.name
      if (!resolvedName) return
      seen.add(key)
      items.push({
        key,
        id,
        name: resolvedName,
        isHistorical: false,
        flagEmoji: flagEmoji ?? found?.flagEmoji ?? null,
      })
    }
    const addHistorical = (id?: string | null, name?: string | null) => {
      if (!id) return
      const key = `h:${id}`
      if (seen.has(key)) return
      const found = allHistoricalById.get(id)
      const resolvedName = name ?? found?.name
      if (!resolvedName) return
      seen.add(key)
      const periodText = found ? formatCountryPeriod(found, { variant: 'short' }) : ''
      items.push({
        key,
        id,
        name: resolvedName,
        isHistorical: true,
        periodText: periodText || undefined,
      })
    }

    for (const aff of p.countryAffiliations ?? []) {
      if (aff.historicalCountryId || aff.historicalCountry?.id) {
        addHistorical(
          aff.historicalCountryId ?? aff.historicalCountry?.id,
          aff.historicalCountry?.name,
        )
      }
      if (aff.countryId || aff.country?.id) {
        addModern(
          aff.countryId ?? aff.country?.id,
          aff.country?.name,
          aff.country?.flagEmoji,
        )
      }
    }
    addHistorical(p.historicalCountryId ?? p.historicalCountry?.id, p.historicalCountry?.name)
    addModern(p.countryId ?? p.country?.id, p.country?.name, p.country?.flagEmoji)
    return items
  }, [personDetail, modernCountryOptions, allHistoricalById])

  /** 인물 생몰년 참고 및 사망일 원클릭 채우기 데이터 */
  const personLifespanRef = useMemo(() => {
    const p = personDetail as
      | {
          birthEra?: string | null
          birthYear?: number | null
          birthMonth?: number | null
          birthDay?: number | null
          deathEra?: string | null
          deathYear?: number | null
          deathMonth?: number | null
          deathDay?: number | null
        }
      | undefined
    if (!p || (p.birthYear == null && p.deathYear == null)) return null
    const formatPart = (
      era?: string | null,
      year?: number | null,
      month?: number | null,
      day?: number | null,
    ) => {
      if (year == null) return null
      const prefix = era === 'BC' ? 'BC ' : ''
      const m = month ? `.${String(month).padStart(2, '0')}` : ''
      const d = month && day ? `.${String(day).padStart(2, '0')}` : ''
      return `${prefix}${year}${m}${d}`
    }
    const birthLabel = formatPart(p.birthEra, p.birthYear, p.birthMonth, p.birthDay)
    const deathLabel = formatPart(p.deathEra, p.deathYear, p.deathMonth, p.deathDay)
    const deathParts: PartialDateParts | null =
      p.deathYear != null
        ? {
            era: p.deathEra === 'BC' ? 'BC' : 'AD',
            year: String(p.deathYear),
            month: p.deathMonth != null ? String(p.deathMonth) : '',
            day: p.deathDay != null ? String(p.deathDay) : '',
          }
        : null
    return {
      summary: `${birthLabel ? `${birthLabel} 출생` : '출생 미상'} ~ ${
        deathLabel ? `${deathLabel} 사망` : '생존·미상'
      }`,
      deathLabel,
      deathParts,
    }
  }, [personDetail])

  /** 등록 버튼이 잠긴 이유 — 상단 '필수 항목' 띠 대신 버튼 옆 한 줄로(빨간 점과 중복되던 띠 제거) */
  const missingRequired = [
    !hasCountry && '국가',
    !hasPosition && '직책',
    !hasStartDate && (isReign ? '즉위일' : '취임일'),
  ].filter(Boolean) as string[]
  const missingParticle = objectParticle(missingRequired[missingRequired.length - 1] ?? '')

  /** 행정부 탭에서 "각료 추가"로 열렸을 때 → 각료 등록 문구 사용 (수반 아님) */
  const isMinisterFlow = !isEdit && initialCabinetId != null
  const recordNoun = isReign ? '재위' : '재임'
  const panelTitle = isEdit
    ? isMinisterFlow
      ? '각료 수정'
      : `${recordNoun} 수정`
    : isMinisterFlow
      ? '각료 등록'
      : `${recordNoun} 등록`
  const submitLabelText = isEdit
    ? '수정 완료'
    : isMinisterFlow
      ? '각료 등록'
      : `${recordNoun} 등록`
  const isLoadingEdit = Boolean(isEdit && tenureId && !editingTenure && loadingTenures)

  const showCabinetField =
    (!isHeadPositionType && (countryId || historicalCountryId) && cabinetOptions.length > 0) ||
    Boolean(cabinetId || initialCabinetId)

  return (
    <>
      <RegisterModal
        isOpen={open}
        onClose={onClose}
        title={panelTitle}
        maxWidth="min(1040px, 96vw)"
        minHeight="min(680px, 86vh)"
        fullBleedOnMobile
        closeOnEsc={!submitting}
        closeOnOverlayClick={!submitting}
      >
        <PersonRegisterModalFormScroll>
          {submitting && (
            <KitBusyBar role="status" aria-live="polite">
              {isEdit
                ? '수정 사항을 저장하는 중...'
                : `${recordNoun} 기록을 등록하는 중...`}
            </KitBusyBar>
          )}
          {isLoadingEdit && (
            <KitFormLoading label={`${recordNoun} 기록을 불러오는 중`} />
          )}
          <FormReveal hidden={isLoadingEdit}>
            <S.Form id={FORM_ID} onSubmit={handleSubmit}>
              {isEdit && tenureId && !editingTenure && !loadingTenures && (
                <InlineMessage $variant="error">재임 기록을 찾을 수 없습니다.</InlineMessage>
              )}

              <LabeledRowsWrap>
                {/* ─── 묶음 1: 기본 정보 (사건 등록 모달 BasicInfoSection '기본 정보'와 동일 구조) ─── */}
                <FormGroup aria-labelledby="tenure-form-group-basic">
                  <FormGroupTitle id="tenure-form-group-basic">기본 정보</FormGroupTitle>

                  {/* 인물 — 국가 카드와 동일한 톤의 요약 카드 */}
                  {(personDetail ||
                    (initialAdministrationDepartmentId &&
                      initialAdministrationDepartmentName)) && (
                    <FieldRow>
                      <FieldLabel as="span">인물</FieldLabel>
                      <FieldControl>
                        <PersonContextCard>
                          {personDetail && (
                            <PersonChip>
                              <PersonChipThumb aria-hidden>
                                {(personDetail as { profileImageUrl?: string | null })
                                  .profileImageUrl && !personImageError ? (
                                  <img
                                    src={
                                      getUploadImageUrl(
                                        (personDetail as { profileImageUrl?: string })
                                          .profileImageUrl,
                                      ) ||
                                      (personDetail as { profileImageUrl?: string })
                                        .profileImageUrl
                                    }
                                    alt=""
                                    onError={() => setPersonImageError(true)}
                                  />
                                ) : (
                                  <FiUser size={16} />
                                )}
                              </PersonChipThumb>
                              <span style={{ fontWeight: 600 }}>
                                {getPersonDisplayName(personDetail)}
                                {personDetail.primaryLabel && (
                                  <PersonPrimaryLabel>
                                    {' '}
                                    · {personDetail.primaryLabel}
                                  </PersonPrimaryLabel>
                                )}
                              </span>
                            </PersonChip>
                          )}
                          <PersonMetaRight>
                            {personLifespanRef && (
                              <PersonLifespanBadge>
                                {personLifespanRef.summary}
                              </PersonLifespanBadge>
                            )}
                            {initialAdministrationDepartmentId &&
                              initialAdministrationDepartmentName && (
                                <DepartmentBadge title="소속 부처">
                                  {initialAdministrationDepartmentName}
                                </DepartmentBadge>
                              )}
                          </PersonMetaRight>
                        </PersonContextCard>
                      </FieldControl>
                    </FieldRow>
                  )}

                  {/* 구분 — 사건 등록 모달 '종류(단일/묶음)' 행과 동일한 SegmentControl chips */}
                  {!isMinisterFlow && !isEdit && (
                    <FieldRow>
                      <FieldLabel as="span">구분</FieldLabel>
                      <FieldControl>
                        <SegmentControl
                          appearance="chips"
                          ariaLabel="기록 구분"
                          value={monarchicalMode ? 'reign' : 'tenure'}
                          onChange={(next) => {
                            if (next === 'reign') {
                              defaultReignAppliedRef.current = false
                              setMonarchicalMode(true)
                              if (selectedDef && !selectedDef.isMonarchical) {
                                setPositionDefinitionId(null)
                                setTitle('')
                                setTitleEn('')
                              }
                            } else {
                              setMonarchicalMode(false)
                              if (selectedDef?.isMonarchical) {
                                setPositionDefinitionId(null)
                                setTitle('')
                                setTitleEn('')
                              }
                            }
                          }}
                          options={[
                            { value: 'tenure', label: '관직 재임' },
                            { value: 'reign', label: '군주 재위' },
                          ]}
                        />
                        <FieldHint>
                          {monarchicalMode
                            ? '국왕·황제·교황 등 군주의 재위 기간과 왕호·즉위 순서를 기록합니다.'
                            : '대통령·총리·장관·영의정 등 공직 임기와 대수를 기록합니다.'}
                        </FieldHint>
                      </FieldControl>
                    </FieldRow>
                  )}

                  {/* 국가·정체 — 사건 등록 모달 '참여국' 카드 형태(이모지 없이 깔끔한 정보 카드) + 소속 국가 빠른 선택 */}
                  <FieldRow>
                    <FieldLabel as="span">
                      국가·정체
                      {countryRequired ? (
                        <Required aria-label="필수" />
                      ) : (
                        <OptionalTag>(선택)</OptionalTag>
                      )}
                    </FieldLabel>
                    <FieldControl>
                      {selectedHistoricalCountry || selectedModernCountry ? (
                        <CountryParticipantCard>
                          <CountryCardMain
                            type="button"
                            onClick={() => setCountryModalOpen(true)}
                            title="클릭하여 국가 변경"
                          >
                            <CountryCardName>
                              {selectedHistoricalCountry
                                ? `${selectedHistoricalCountry.name}${
                                    selectedHistoricalPeriodLabel
                                      ? ` (${selectedHistoricalPeriodLabel})`
                                      : ''
                                  }`
                                : (selectedModernCountry?.name ?? '')}
                            </CountryCardName>
                            <CountryCardMeta>
                              <TriggerKindTag $historical={!!selectedHistoricalCountry}>
                                {selectedHistoricalCountry ? '역사적 국가' : '현대 국가'}
                              </TriggerKindTag>
                              {selectedHistoricalCountry?.enName && (
                                <CountryCardSubText>
                                  {selectedHistoricalCountry.enName}
                                </CountryCardSubText>
                              )}
                              {!selectedHistoricalCountry && selectedModernCountry && (
                                <CountryCardSubText>
                                  {[
                                    selectedModernCountry.isoCode,
                                    selectedModernCountry.enName,
                                    selectedModernCountry.capital,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </CountryCardSubText>
                              )}
                            </CountryCardMeta>
                          </CountryCardMain>
                          <CountryCardActions>
                            <CountryCardChangeBtn
                              type="button"
                              onClick={() => setCountryModalOpen(true)}
                            >
                              변경
                            </CountryCardChangeBtn>
                            <CountryCardRemoveBtn
                              type="button"
                              aria-label="국가 선택 해제"
                              title="국가 선택 해제"
                              onClick={() => {
                                setCountryId('')
                                setHistoricalCountryId(null)
                                setCabinetId(null)
                              }}
                            >
                              <FiX size={14} />
                            </CountryCardRemoveBtn>
                          </CountryCardActions>
                        </CountryParticipantCard>
                      ) : (
                        <SelectTriggerButton
                          type="button"
                          onClick={() => setCountryModalOpen(true)}
                          $hasValue={false}
                        >
                          <span>국가 선택 (현대 국가 · 역사적 국가)</span>
                          <FiChevronDown size={18} />
                        </SelectTriggerButton>
                      )}

                      {personAffiliatedPolities.length > 0 && (
                        <AffiliatedPolityBar>
                          <AffiliatedPolityLabel>인물 소속 국가:</AffiliatedPolityLabel>
                          {personAffiliatedPolities.map((polity) => {
                            const isActive = polity.isHistorical
                              ? historicalCountryId === polity.id && !countryId
                              : countryId === polity.id && !historicalCountryId
                            return (
                              <AffiliatedPolityChip
                                key={polity.key}
                                type="button"
                                aria-label={polity.name}
                                $active={isActive}
                                onClick={() => {
                                  if (polity.isHistorical) {
                                    if (historicalCountryId !== polity.id || countryId) {
                                      setCountryId('')
                                      setHistoricalCountryId(polity.id)
                                      releasePositionOnCountryChange()
                                    }
                                  } else {
                                    if (countryId !== polity.id || historicalCountryId) {
                                      setCountryId(polity.id)
                                      setHistoricalCountryId(null)
                                      releasePositionOnCountryChange()
                                    }
                                  }
                                }}
                              >
                                <span>{polity.name}</span>
                                {polity.periodText && (
                                  <CountryCardSubText style={{ fontSize: 11 }}>
                                    {polity.periodText}
                                  </CountryCardSubText>
                                )}
                              </AffiliatedPolityChip>
                            )
                          })}
                        </AffiliatedPolityBar>
                      )}
                    </FieldControl>
                  </FieldRow>

                  {/* 직책명 — 클릭 시 바로 아래에 검색 가능한 Selectbox 드롭다운 노출 */}
                  <FieldRow>
                    <FieldLabel as="span">
                      {isReign ? '직위·칭호' : '직책명'} <Required aria-label="필수" />
                    </FieldLabel>
                    <FieldControl>
                      <PositionSelectWrap ref={positionDropdownRef}>
                        <TriggerWrap>
                          <SelectTriggerButton
                            type="button"
                            aria-haspopup="listbox"
                            aria-expanded={positionModalOpen}
                            onClick={() => setPositionModalOpen((prev) => !prev)}
                            $hasValue={!!positionDefinitionId || !!title.trim()}
                            $clearable={!!positionDefinitionId || !!title.trim()}
                          >
                            <span>{positionTitleLabel}</span>
                            {(positionDefinitionId || title.trim()) &&
                              POSITION_TYPE_SHORT_LABELS[positionType] && (
                                <TriggerKindTag>
                                  {POSITION_TYPE_SHORT_LABELS[positionType]}
                                </TriggerKindTag>
                              )}
                            {!(positionDefinitionId || title.trim()) && (
                              <FiChevronDown
                                size={18}
                                style={{
                                  transform: positionModalOpen ? 'rotate(180deg)' : 'none',
                                  transition: 'transform 0.15s ease',
                                }}
                              />
                            )}
                          </SelectTriggerButton>
                          {(positionDefinitionId || title.trim()) && (
                            <TriggerClearBtn
                              type="button"
                              aria-label="직책 선택 해제"
                              title="직책 선택 해제"
                              onClick={(event) => {
                                event.stopPropagation()
                                setPositionDefinitionId(null)
                                setPresetPositionType(null)
                                setTitle('')
                                setTitleEn('')
                                setManualEntryOpen(false)
                                setSpecificTitleOpen(false)
                                setPositionModalOpen(false)
                              }}
                            >
                              <FiX size={14} />
                            </TriggerClearBtn>
                          )}
                        </TriggerWrap>

                        {positionModalOpen && (
                          <PositionSelectDropdown role="listbox" aria-label="직책명 목록">
                            <PositionSearchHeader>
                              <FiSearch size={14} />
                              <PositionSearchInput
                                ref={positionSearchInputRef}
                                type="text"
                                aria-label="직책명 검색"
                                value={positionQuery}
                                onChange={(e) => setPositionQuery(e.target.value)}
                                placeholder={
                                  isReign
                                    ? '직위·칭호 검색 (예: 국왕, 황제, 교황...)'
                                    : '직책명 검색 (예: 대통령, 영의정, 장관...)'
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    e.preventDefault()
                                    setPositionModalOpen(false)
                                  } else if (e.key === 'Enter') {
                                    e.preventDefault()
                                    if (filteredPositionOptions.length > 0) {
                                      handlePositionSelect(filteredPositionOptions[0].value)
                                    } else if (positionQuery.trim()) {
                                      setPositionDefinitionId(null)
                                      setPresetPositionType(null)
                                      setTitle(positionQuery.trim())
                                      setManualEntryOpen(true)
                                      setPositionModalOpen(false)
                                    }
                                  }
                                }}
                              />
                              {positionQuery && (
                                <CountryCardRemoveBtn
                                  type="button"
                                  aria-label="검색어 지우기"
                                  onClick={() => setPositionQuery('')}
                                  style={{ width: 22, height: 22 }}
                                >
                                  <FiX size={13} />
                                </CountryCardRemoveBtn>
                              )}
                            </PositionSearchHeader>

                            <PositionOptionList>
                              {filteredPositionOptions.length === 0 ? (
                                <PositionEmptyBox>
                                  <span>일치하는 직책이 없습니다.</span>
                                  {positionQuery.trim() && (
                                    <CountryCardChangeBtn
                                      type="button"
                                      onClick={() => {
                                        setPositionDefinitionId(null)
                                        setPresetPositionType(null)
                                        setTitle(positionQuery.trim())
                                        setManualEntryOpen(true)
                                        setPositionModalOpen(false)
                                      }}
                                    >
                                      &lsquo;{positionQuery.trim()}&rsquo; 직접 입력하기
                                    </CountryCardChangeBtn>
                                  )}
                                </PositionEmptyBox>
                              ) : (
                                (() => {
                                  const rows: React.ReactNode[] = []
                                  let currentGroup: string | undefined
                                  let boundaryPassed = false

                                  filteredPositionOptions.forEach((option) => {
                                    if (!boundaryPassed || option.group !== currentGroup) {
                                      currentGroup = option.group
                                      boundaryPassed = true
                                      if (option.group) {
                                        const group = option.group
                                        const expanded = isPositionGroupExpanded(group)
                                        rows.push(
                                          <PositionGroupHeader
                                            key={`group-${group}`}
                                            type="button"
                                            aria-expanded={expanded}
                                            onClick={() =>
                                              setPositionGroupToggles((prev) => ({
                                                ...prev,
                                                [group]: !isPositionGroupExpandedByState(group),
                                              }))
                                            }
                                          >
                                            <span>{expanded ? '▾' : '▸'}</span>
                                            <span>{group}</span>
                                            <PositionGroupCount>
                                              {positionGroupCounts.get(group) ?? 0}
                                            </PositionGroupCount>
                                          </PositionGroupHeader>,
                                        )
                                      }
                                    }
                                    if (option.group && !isPositionGroupExpanded(option.group)) {
                                      return
                                    }
                                    const active = selectedPositionValue === option.value
                                    rows.push(
                                      <PositionOptionItemBtn
                                        key={String(option.value)}
                                        type="button"
                                        role="option"
                                        aria-selected={active}
                                        $active={active}
                                        onClick={() => handlePositionSelect(option.value)}
                                      >
                                        <PositionOptionBody>
                                          <span>{option.label}</span>
                                          {option.description && (
                                            <PositionOptionDesc>
                                              {option.description}
                                            </PositionOptionDesc>
                                          )}
                                        </PositionOptionBody>
                                        {active && <FiCheck size={15} />}
                                      </PositionOptionItemBtn>,
                                    )
                                  })
                                  return rows
                                })()
                              )}
                            </PositionOptionList>
                          </PositionSelectDropdown>
                        )}
                      </PositionSelectWrap>

                      {(positionDefinitionId &&
                        !localTitleOpen &&
                        (countryId || historicalCountryId)) ||
                      (selectedDef &&
                        !selectedIsGeneric &&
                        !specificTitleOpen &&
                        !title.trim()) ||
                      (!positionDefinitionId && !manualEntryOpen && !title.trim()) ? (
                        <FieldHint>
                          {positionDefinitionId &&
                            !localTitleOpen &&
                            (countryId || historicalCountryId) && (
                              <>
                                이 나라에서 다른 명칭으로 부른다면{' '}
                                <LocalTitleLink
                                  type="button"
                                  onClick={() => {
                                    setLocalTitleDraft(
                                      selectedDef?.title ??
                                        (selectedDef as { name?: string } | null)?.name ??
                                        title,
                                    )
                                    setLocalTitleOpen(true)
                                  }}
                                >
                                  명칭 바꾸기
                                </LocalTitleLink>
                              </>
                            )}
                          {selectedDef &&
                            !selectedIsGeneric &&
                            !specificTitleOpen &&
                            !title.trim() && (
                              <>
                                {positionDefinitionId &&
                                  !localTitleOpen &&
                                  (countryId || historicalCountryId) &&
                                  ' · '}
                                대사·장관 등 부임지나 보직을 덧붙이려면{' '}
                                <LocalTitleLink
                                  type="button"
                                  onClick={() => setSpecificTitleOpen(true)}
                                >
                                  구체 직함 추가
                                </LocalTitleLink>
                              </>
                            )}
                          {!positionDefinitionId && !manualEntryOpen && !title.trim() && (
                            <>
                              목록에 찾는 직책이 없으면{' '}
                              <LocalTitleLink
                                type="button"
                                onClick={() => setManualEntryOpen(true)}
                              >
                                직접 입력
                              </LocalTitleLink>
                            </>
                          )}
                        </FieldHint>
                      ) : null}

                      {positionDefinitionId && localTitleOpen && (
                        <ManualEntryGroup>
                          <ManualEntryCaption>이 나라에서 부르는 이름</ManualEntryCaption>
                          <ManualEntryField>
                            <Input
                              autoFocus
                              value={localTitleDraft}
                              onChange={(event) => setLocalTitleDraft(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault()
                                  void applyLocalTitle()
                                }
                                if (event.key === 'Escape') {
                                  event.preventDefault()
                                  setLocalTitleOpen(false)
                                }
                              }}
                              placeholder="예: 외무대신"
                            />
                          </ManualEntryField>
                          <LocalTitleActions>
                            <LocalTitleSubmit
                              type="button"
                              disabled={localTitleSaving || !localTitleDraft.trim()}
                              onClick={() => void applyLocalTitle()}
                            >
                              {localTitleSaving ? '담는 중…' : '이 나라 직책으로 담기'}
                            </LocalTitleSubmit>
                            <LocalTitleCancel
                              type="button"
                              disabled={localTitleSaving}
                              onClick={() => setLocalTitleOpen(false)}
                            >
                              취소
                            </LocalTitleCancel>
                          </LocalTitleActions>
                        </ManualEntryGroup>
                      )}

                      {selectedDef &&
                        !selectedIsGeneric &&
                        (specificTitleOpen || !!title.trim()) && (
                          <ManualEntryGroup>
                            <ManualEntryCaption>
                              구체 직함{' '}
                              <LocalTitleLink
                                type="button"
                                style={{ marginLeft: 8 }}
                                onClick={() => {
                                  setTitle('')
                                  setSpecificTitleOpen(false)
                                }}
                              >
                                닫기
                              </LocalTitleLink>
                            </ManualEntryCaption>
                            <Input
                              value={title}
                              onChange={(event) => setTitle(event.target.value)}
                              placeholder={`예: 주러시아 ${selectedDef.title ?? ''}`}
                            />
                          </ManualEntryGroup>
                        )}

                      {(!positionDefinitionId || selectedIsGeneric) &&
                        (manualEntryOpen || !!title.trim() || selectedIsGeneric) && (
                          <ManualEntryGroup>
                            <ManualEntryCaption>
                              {selectedIsGeneric ? '구체 직함' : '직접 입력'}
                            </ManualEntryCaption>
                            <SubFieldPair>
                              <ManualEntryField>
                                한글 직책명
                                <Input
                                  value={title}
                                  onChange={(e) => setTitle(e.target.value)}
                                  placeholder={
                                    selectedIsGeneric
                                      ? '예: 제7보병연대 소위'
                                      : '예: 광저우 영국 영사'
                                  }
                                />
                              </ManualEntryField>
                              <ManualEntryField>
                                영문 직책명 (선택)
                                <Input
                                  value={titleEn}
                                  onChange={(e) => setTitleEn(e.target.value)}
                                  placeholder="예: Consul at Canton"
                                />
                              </ManualEntryField>
                            </SubFieldPair>
                          </ManualEntryGroup>
                        )}
                    </FieldControl>
                  </FieldRow>

                  {/* 기간 — 사건 등록 모달 '기간 *' 행(라벨 아래 PeriodBadge + 우측 2열 DateRangeGrid + 하단 Hint)과 100% 동일 */}
                  <FieldRow>
                    <FieldLabel as="div">
                      <div>
                        기간 <Required aria-label="필수" />
                      </div>
                      {periodBadge && (
                        <PeriodBadge>
                          <FiClock size={12} />
                          {periodBadge.text}
                          {periodBadge.sub && <span> {periodBadge.sub}</span>}
                        </PeriodBadge>
                      )}
                    </FieldLabel>
                    <FieldControl>
                      <SubFieldPair>
                        <SubField>
                          <SubFieldLabel>{isReign ? '즉위일' : '취임일'}</SubFieldLabel>
                          <InlineDateField
                            appearance="field"
                            ariaLabel={isReign ? '즉위일' : '취임일'}
                            era={start.era}
                            year={start.year}
                            month={start.month}
                            day={start.day}
                            onEra={(era) => patchStart({ era })}
                            onYear={(year) => patchStart({ year })}
                            onMonth={(month) => patchStart({ month })}
                            onDay={(day) => patchStart({ day })}
                            onOpenPicker={() => setDatePickerSide('start')}
                          />
                        </SubField>

                        <SubField>
                          <SubFieldLabel>
                            {isReign ? '퇴위일 (비우면 현재)' : '퇴임일 (비우면 재임 중)'}
                          </SubFieldLabel>
                          <InlineDateField
                            appearance="field"
                            ariaLabel={isReign ? '퇴위일' : '퇴임일'}
                            era={end.era}
                            year={end.year}
                            month={end.month}
                            day={end.day}
                            onEra={(era) => patchEnd({ era })}
                            onYear={(year) => patchEnd({ year })}
                            onMonth={(month) => patchEnd({ month })}
                            onDay={(day) => patchEnd({ day })}
                            onOpenPicker={() => setDatePickerSide('end')}
                            error={periodInverted}
                            ariaDescribedBy={periodInverted ? 'tenure-period-error' : undefined}
                          />
                        </SubField>
                      </SubFieldPair>

                      {periodInverted && (
                        <div id="tenure-period-error" role="alert">
                          <AlertBox variant="warning" icon="⚠️">
                            {isReign
                              ? '퇴위가 즉위보다 빠릅니다 — 추존·복위 등 정당한 경우가 아니면 확인해 주세요.'
                              : '퇴임일이 취임일보다 빠릅니다.'}
                          </AlertBox>
                        </div>
                      )}
                      {lifespanWarning && (
                        <AlertBox variant="warning" icon="⚠️">
                          선택한 역사국가 {lifespanWarning} 소급·추존·망명 등 정당한 경우라면 그대로 저장하세요.
                        </AlertBox>
                      )}

                      <FieldHint>
                        연도만 알면 연도만 입력해도 됩니다.
                        {personLifespanRef?.deathParts && !end.year.trim() && (
                          <>
                            {' · '}
                            <LocalTitleLink
                              type="button"
                              onClick={() => {
                                if (!personLifespanRef.deathParts) return
                                setEnd(personLifespanRef.deathParts)
                                if (!endReason) setEndReason('DEATH_IN_OFFICE')
                              }}
                            >
                              사망일({personLifespanRef.deathLabel})을{' '}
                              {isReign ? '퇴위일' : '퇴임일'}로 채우기
                            </LocalTitleLink>
                          </>
                        )}
                      </FieldHint>
                    </FieldControl>
                  </FieldRow>

                  {/* 대수·기수 (재위 시 왕호·즉위 순서·왕조 서수·기수) */}
                  <FieldRow>
                    <FieldLabel as="span">
                      {isReign ? '왕호 · 서수' : '대수 · 기수'}
                      <OptionalTag>(선택)</OptionalTag>
                    </FieldLabel>
                    <FieldControl>
                      {isReign ? (
                        <SubFieldPair $cols={4}>
                          <SubField>
                            <SubFieldLabel htmlFor="tenure-regnal-name">왕호</SubFieldLabel>
                            <Input
                              id="tenure-regnal-name"
                              value={regnalName}
                              onChange={(event) => setRegnalName(event.target.value)}
                              placeholder="예: 세종, 루이 14세"
                            />
                          </SubField>
                          <SubField>
                            <SubFieldLabel htmlFor="tenure-ordinal">
                              즉위 순서 (제N대)
                            </SubFieldLabel>
                            <Input
                              id="tenure-ordinal"
                              type="number"
                              min={1}
                              value={ordinalNumber}
                              onChange={(e) => setOrdinalNumber(e.target.value)}
                              placeholder="예: 4"
                            />
                          </SubField>
                          <SubField>
                            <SubFieldLabel htmlFor="tenure-dynasty-ordinal">
                              왕조 서수
                            </SubFieldLabel>
                            <Input
                              id="tenure-dynasty-ordinal"
                              type="number"
                              min={1}
                              value={dynastyOrdinal}
                              onChange={(event) => setDynastyOrdinal(event.target.value)}
                              placeholder="예: 4"
                            />
                          </SubField>
                          <SubField>
                            <SubFieldLabel htmlFor="tenure-subterm">기수</SubFieldLabel>
                            <Input
                              id="tenure-subterm"
                              type="number"
                              min={1}
                              value={subTermNumber}
                              onChange={(e) => setSubTermNumber(e.target.value)}
                              placeholder="예: 1"
                            />
                          </SubField>
                        </SubFieldPair>
                      ) : (
                        <SubFieldPair>
                          <SubField>
                            <SubFieldLabel htmlFor="tenure-ordinal">대수</SubFieldLabel>
                            <Input
                              id="tenure-ordinal"
                              type="number"
                              min={1}
                              value={ordinalNumber}
                              onChange={(e) => setOrdinalNumber(e.target.value)}
                              placeholder="예: 제20대 → 20"
                            />
                          </SubField>
                          <SubField>
                            <SubFieldLabel htmlFor="tenure-subterm">기수</SubFieldLabel>
                            <Input
                              id="tenure-subterm"
                              type="number"
                              min={1}
                              value={subTermNumber}
                              onChange={(e) => setSubTermNumber(e.target.value)}
                              placeholder="예: 1기 → 1"
                            />
                          </SubField>
                        </SubFieldPair>
                      )}
                    </FieldControl>
                  </FieldRow>
                </FormGroup>

                {/* ─── 묶음 2: 경위 및 연결 (사건 등록 모달 '연결' 묶음과 동일 구조) ─── */}
                <FormGroup aria-labelledby="tenure-form-group-link">
                  <FormGroupTitle id="tenure-form-group-link">경위 및 연결</FormGroupTitle>

                  {/* 즉위·취임 경위 — 커스텀 Dropbox + 넉넉한 서술형 Textarea */}
                  <FieldRow>
                    <FieldLabel as="span">
                      {isReign ? '즉위 경위' : '취임 경위'}
                      <OptionalTag>(선택)</OptionalTag>
                    </FieldLabel>
                    <FieldControl>
                      <CustomDropbox
                        id="tenure-appointment-method"
                        ariaLabel={isReign ? '즉위 방식' : '취임 방식'}
                        value={appointmentMethod}
                        placeholder={isReign ? '즉위 방식 선택' : '취임 방식 선택'}
                        options={APPOINTMENT_METHOD_OPTIONS}
                        onChange={setAppointmentMethod}
                      />
                      <Textarea
                        id="tenure-appointment-detail"
                        aria-label={isReign ? '즉위 상세' : '취임 상세'}
                        value={appointmentDetail}
                        onChange={(event) => setAppointmentDetail(event.target.value)}
                        rows={3}
                        placeholder={
                          isReign
                            ? '어떻게 즉위했는지 서술 (예: 선왕 서거 후 왕세자로서 즉위, 반정으로 추대 등)'
                            : '어떻게 취임했는지 서술 (예: 대선 승리, 의회 선출, 권한대행 후 정식 취임 등)'
                        }
                      />
                    </FieldControl>
                  </FieldRow>

                  {/* 퇴위·퇴임 경위 — 커스텀 Dropbox + 넉넉한 서술형 Textarea */}
                  <FieldRow>
                    <FieldLabel as="span">
                      {isReign ? '퇴위 경위' : '퇴임 경위'}
                      <OptionalTag>(선택)</OptionalTag>
                    </FieldLabel>
                    <FieldControl>
                      <CustomDropbox
                        id="tenure-end-reason"
                        ariaLabel="퇴임 사유"
                        value={endReason}
                        placeholder={isReign ? '퇴위 사유 선택' : '퇴임 사유 선택'}
                        options={TENURE_END_REASON_OPTIONS}
                        onChange={setEndReason}
                      />
                      <Textarea
                        id="tenure-end-reason-detail"
                        aria-label="퇴임 사유 상세"
                        value={endReasonDetail}
                        onChange={(event) => setEndReasonDetail(event.target.value)}
                        rows={3}
                        placeholder={
                          isReign
                            ? '어떻게 물러났는지 서술 (예: 재위 중 승하, 양위, 폐위 등)'
                            : '어떻게 물러났는지 서술 (예: 임기 만료 퇴임, 건강 악화로 사임, 전사·순직 등)'
                        }
                      />
                    </FieldControl>
                  </FieldRow>

                  {/* 취임식·대관식 사건 — 사건 등록 모달 '상위 사건(선택)' 행과 동일 */}
                  <FieldRow>
                    <FieldLabel as="span">
                      {isReign ? '대관식·즉위식 사건' : '취임식 사건'}
                      <OptionalTag>(선택)</OptionalTag>
                    </FieldLabel>
                    <FieldControl>
                      {linkedAccessionEvent ? (
                        <KitSelectedItems>
                          <KitSelectedItem title={linkedAccessionEvent.title}>
                            <span>{linkedAccessionEvent.title}</span>
                            <KitRemoveButton
                              type="button"
                              aria-label="사건 연결 해제"
                              onClick={() => setLinkedAccessionEvent(null)}
                            >
                              <FiX size={14} />
                            </KitRemoveButton>
                          </KitSelectedItem>
                          <KitAddButton
                            type="button"
                            onClick={() => setAccessionEventPickerOpen(true)}
                          >
                            변경
                          </KitAddButton>
                        </KitSelectedItems>
                      ) : (
                        <KitAddButton
                          type="button"
                          onClick={() => setAccessionEventPickerOpen(true)}
                        >
                          <FiPlus size={15} />
                          {isReign ? '대관식·즉위식 사건 선택' : '취임식 사건 선택'}
                        </KitAddButton>
                      )}
                      <FieldHint>
                        {isReign
                          ? '즉위·대관과 맞물린 사건을 연결하면 사건 상세에서도 함께 표시됩니다.'
                          : '취임·임명과 맞물린 사건을 연결하면 사건 상세에서도 함께 표시됩니다.'}
                      </FieldHint>
                    </FieldControl>
                  </FieldRow>

                  {/* 소속 행정부 — 커스텀 Dropbox */}
                  {showCabinetField && (
                    <FieldRow>
                      <FieldLabel as="span">
                        소속 행정부<OptionalTag>(선택)</OptionalTag>
                      </FieldLabel>
                      <FieldControl>
                        {!isHeadPositionType &&
                          (countryId || historicalCountryId) &&
                          cabinetOptions.length > 0 && (
                            <CustomDropbox
                              ariaLabel="소속 행정부"
                              value={cabinetId ?? ''}
                              placeholder="행정부 선택 (각료인 경우)"
                              options={cabinetOptions}
                              onChange={(next) => setCabinetId(next || null)}
                              searchable={cabinetOptions.length >= 6}
                              searchPlaceholder="행정부 검색..."
                            />
                          )}
                        {(cabinetId || initialCabinetId) && (
                          <KitAddButton
                            type="button"
                            onClick={() => setEventAttachModalOpen(true)}
                          >
                            <FiPlus size={15} />
                            이 행정부에 사건 등록·연결
                          </KitAddButton>
                        )}
                      </FieldControl>
                    </FieldRow>
                  )}

                  {/* 비고 */}
                  <FieldRow>
                    <FieldLabel as="span">
                      비고<OptionalTag>(선택)</OptionalTag>
                    </FieldLabel>
                    <FieldControl>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="재임 관련 특이사항을 두세 문장으로 (선택)"
                        rows={2}
                      />
                      <CheckboxLabelRow>
                        <input
                          type="checkbox"
                          id="tenure-show-on-events"
                          checked={showOnEvents}
                          onChange={(e) => setShowOnEvents(e.target.checked)}
                        />
                        <label htmlFor="tenure-show-on-events">
                          사건 목록(연대표)에 이 직함 포함
                        </label>
                      </CheckboxLabelRow>
                    </FieldControl>
                  </FieldRow>
                </FormGroup>
              </LabeledRowsWrap>
            </S.Form>
          </FormReveal>
        </PersonRegisterModalFormScroll>
        <PersonRegisterModalStickyFooter>
          {isEdit && (
            <FooterDeleteBtn
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={submitting}
            >
              삭제
            </FooterDeleteBtn>
          )}
          {missingRequired.length > 0 && !submitting && (
            <FooterMissingHint role="status">
              {missingRequired.join('·')}{missingParticle} 채우면 등록할 수 있습니다
            </FooterMissingHint>
          )}
          <PersonRegisterModalCancelBtn
            type="button"
            onClick={onClose}
            disabled={submitting}
          >
            취소
          </PersonRegisterModalCancelBtn>
          <PersonRegisterModalPrimaryBtn
            type="submit"
            form={FORM_ID}
            disabled={submitDisabled}
          >
            {submitting ? '처리 중…' : submitLabelText}
          </PersonRegisterModalPrimaryBtn>
        </PersonRegisterModalStickyFooter>
      </RegisterModal>

      <CountryPicker
        isOpen={countryModalOpen}
        onClose={() => setCountryModalOpen(false)}
        mode="single"
        title="국가·정체 선택"
        placeholder="국가명·왕조명·영문명으로 검색..."
        modernCountries={modernCountryOptions}
        historicalCountries={historicalCountryOptions}
        selectedIds={
          historicalCountryId
            ? [historicalCountryId]
            : countryId
              ? [countryId]
              : []
        }
        hintYearRange={hintYearRange}
        onSelect={(picked) => {
          if (picked.isHistorical) {
            setCountryId('')
            setHistoricalCountryId(picked.id)
          } else {
            setCountryId(picked.id || '')
            setHistoricalCountryId(null)
          }
          releasePositionOnCountryChange()
          setCountryModalOpen(false)
        }}
        onClearSelection={
          countryId || historicalCountryId
            ? () => {
                setCountryId('')
                setHistoricalCountryId(null)
                releasePositionOnCountryChange()
                setCountryModalOpen(false)
              }
            : undefined
        }
        clearSelectionLabel="선택 안 함"
      />

      {eventAttachModalOpen && (cabinetId || initialCabinetId) && (
        <CabinetEventAttachModal
          cabinetId={(cabinetId ?? initialCabinetId) as string}
          onClose={() => setEventAttachModalOpen(false)}
          onAttached={() => {
            setEventAttachModalOpen(false)
            notify.success('사건이 이 행정부에 연결되었습니다.')
          }}
        />
      )}

      {/* 즉위·취임 사건 선택 */}
      <EventPickerModal
        isOpen={accessionEventPickerOpen}
        onClose={() => setAccessionEventPickerOpen(false)}
        onSelect={(picked) => {
          setLinkedAccessionEvent(picked)
          setAccessionEventPickerOpen(false)
        }}
        title={isReign ? '즉위·대관식 사건 연결' : '취임 사건 연결'}
      />

      {/* 시작/종료 달력 보조 — 파츠 입력과 병행. 완전일자만 초기값으로 넘긴다 */}
      {datePickerSide &&
        (() => {
          const parts = datePickerSide === 'start' ? start : end
          const initialDate =
            parts.year && parts.month && parts.day ? buildPartialDateString(parts) : undefined
          const apply = datePickerSide === 'start' ? patchStart : patchEnd
          return (
            <DatePickerModal
              isOpen
              initialDate={initialDate}
              title={
                datePickerSide === 'start'
                  ? isReign
                    ? '즉위일'
                    : '취임일'
                  : isReign
                    ? '퇴위일'
                    : '퇴임일'
              }
              onSelect={(date) => {
                apply(parsePartialDateString(date))
                setDatePickerSide(null)
              }}
              onClose={() => setDatePickerSide(null)}
            />
          )
        })()}

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title={isReign ? '재위 기록 삭제' : '재임 기록 삭제'}
        message={`이 ${isReign ? '재위' : '재임'} 기록을 삭제하시겠습니까? 되돌릴 수 없습니다.`}
        confirmLabel={submitting ? '삭제 중…' : '삭제'}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </>
  )
}
