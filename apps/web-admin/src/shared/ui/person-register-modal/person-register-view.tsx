/**
 * 인물 등록·수정 뷰.
 * - 역대 수반 폼과 같은 공용 레이아웃을 쓰되 인물 폼 전용 인터랙션을 가진다:
 *   인라인 세그먼트(성별·사망유형), 박스로 묶인 출생/사망, 고급 정보 접기,
 *   탭 카운트 배지·완료 인디케이터, 이름 미리보기·향년, 가족 카드,
 *   썸네일 drag&drop·paste, sticky 저장 푸터, localStorage draft.
 */
import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'

import { toast } from 'react-hot-toast'
import {
  FiAlertCircle,
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiGlobe,
  FiInfo,
  FiTrash2,
  FiUsers,
} from 'react-icons/fi'
import styled, { css } from 'styled-components'

import { getAllCountries } from '@/shared/api/countries'
import type { CountryResponseDto } from '@/shared/api/countries'
import { dynastyApi } from '@/shared/api/dynasty'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import {
  type CreatePersonDto as CreatePersonInput,
  type Era,
  createPerson,
  updatePerson,
} from '@/shared/api/persons'
import { type PersonResponseDto, getAllPersons } from '@/shared/api/persons'
import { getPersonDetailById } from '@/shared/api/persons-detail'
import { getAllReligions } from '@/shared/api/religions'
import {
  getUploadImageUrl,
  uploadImage,
  validateImageFile,
} from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { CountrySelectModal } from '@/shared/ui/country-select-modal/country-select-modal'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import { FormInput } from '@/shared/ui/form-input/form-input'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import {
  PlaceSelect as PlaceAutocomplete,
  type PlaceResult,
} from '@/shared/ui/place-autocomplete/place-autocomplete'
import {
  BackButton,
  DateFieldBtn,
  DateFieldsRow,
  FOCUS_COLOR,
  FieldControl,
  FieldLabel,
  FieldRow,
  FormCardWrapper,
  FormHeader,
  FormRows,
  FormSectionInner,
  Required,
  SubmitButton,
  TabButton,
  TabNavigation,
  Textarea,
} from '@/shared/ui/register-form-layout/register-form-layout.styles'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'

import { FamilyMemberCard } from './family-member-card'
import { usePersonDraft } from './use-person-draft.hook'

// ─── Styled — Thumbnail ───────────────────────────────────────────────────────

const ThumbnailWrap = styled.div`
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 32px;
  align-items: start;
  padding: 20px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`

const ThumbnailPreview = styled.label<{ $hasImage?: boolean; $dragOver?: boolean }>`
  width: 88px;
  height: 88px;
  border-radius: 50%;
  overflow: hidden;
  background: ${(p) =>
    p.$dragOver
      ? p.theme.mode === 'dark'
        ? 'rgba(99,102,241,0.18)'
        : '#eef2ff'
      : p.$hasImage
        ? 'transparent'
        : p.theme.mode === 'dark'
          ? 'rgba(255,255,255,0.06)'
          : 'rgba(226, 232, 240, 0.6)'};
  border: 2px
    ${(p) => (p.$hasImage && !p.$dragOver ? 'solid' : 'dashed')}
    ${(p) =>
      p.$dragOver
        ? '#6366f1'
        : p.$hasImage
          ? 'transparent'
          : 'rgba(99, 102, 241, 0.35)'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  transition:
    border-color 0.2s,
    background 0.2s,
    transform 0.15s;
  transform: ${(p) => (p.$dragOver ? 'scale(1.04)' : 'none')};
  &:hover {
    border-color: rgba(99, 102, 241, 0.6);
    background: ${(p) =>
      p.$hasImage
        ? 'transparent'
        : p.theme.mode === 'dark'
          ? 'rgba(99,102,241,0.1)'
          : 'rgba(226, 232, 240, 0.9)'};
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  svg {
    color: ${({ theme }) => theme.colors.text.secondary};
    width: 32px;
    height: 32px;
  }
`

const ThumbnailUploadInput = styled.input`
  display: none;
`

const ThumbnailRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
`

const ThumbnailHint = styled.span`
  font-size: 12px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#94a3b8' : '#64748b'};
  max-width: 240px;
  line-height: 1.45;
`

const ThumbnailRemoveBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  font-size: 12px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f87171' : '#b91c1c')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(248,113,113,0.12)' : '#fef2f2'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(248,113,113,0.35)' : '#fecaca'};
  border-radius: 8px;
  cursor: pointer;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

// ─── Styled — Inline grouping ────────────────────────────────────────────────

const OriginalNameInputWrap = styled.div`
  max-width: 480px;
  width: 100%;
`

const FieldRowMulti = styled.div`
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 24px;
  align-items: start;
  padding: 20px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const InlineFields = styled.div<{ $cols?: number }>`
  display: grid;
  grid-template-columns: ${(p) => `repeat(${p.$cols ?? 3}, 1fr)`};
  gap: 12px;
  max-width: ${(p) => (p.$cols === 2 ? '400px' : '560px')};

  & > div {
    min-width: 0;
  }
  input,
  select,
  button {
    max-width: 100%;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const PlaceAutocompleteWrap = styled.div`
  max-width: 480px;
  width: 100%;
`

// ─── Styled — Boxed birth/death sections ─────────────────────────────────────

const LifeSectionGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 20px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const LifeBox = styled.section<{ $tone?: 'birth' | 'death' }>`
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 14px;
  padding: 16px 18px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.025)' : '#fafbff'};
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const LifeBoxTitle = styled.h3`
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  gap: 6px;
`

const LifespanText = styled.span`
  display: inline-block;
  margin-top: 6px;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.12)' : '#eef2ff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.25)' : '#c7d2fe'};
  padding: 3px 10px;
  border-radius: 999px;
`

// ─── Styled — Segmented control (성별·사망유형) ──────────────────────────────

const SegmentRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const SegmentBtn = styled.button<{ $active?: boolean; $error?: boolean }>`
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ $active, theme }) =>
    $active ? '#fff' : theme.colors.text.secondary};
  background: ${({ $active, $error, theme }) => {
    if ($active) return '#6366f1'
    if ($error)
      return theme.mode === 'dark' ? 'rgba(220,38,38,0.12)' : '#fef2f2'
    return theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'
  }};
  border: 1px solid
    ${({ $active, $error, theme }) => {
      if ($active) return '#6366f1'
      if ($error) return '#dc2626'
      return theme.colors.border.default
    }};
  border-radius: 999px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;
  &:hover:not(:disabled) {
    border-color: ${({ $active }) => ($active ? '#4f46e5' : '#a5b4fc')};
    color: ${({ $active, theme }) =>
      $active ? '#fff' : theme.colors.text.primary};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

// ─── Styled — Native select (가문·종교) ──────────────────────────────────────

const NativeSelect = styled.select`
  width: 100%;
  max-width: 380px;
  padding: 12px 14px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  outline: none;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
  &:hover {
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
  &:focus-visible {
    border-color: ${FOCUS_COLOR};
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
`

// ─── Styled — Country/family select trigger button ───────────────────────────

const SelectBtn = styled.button<{ $hasValue?: boolean; $error?: boolean }>`
  width: 100%;
  max-width: 380px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  font-size: 14px;
  color: ${({ $hasValue, theme }) =>
    $hasValue ? theme.colors.text.primary : theme.colors.text.tertiary};
  background: ${({ $error, theme }) =>
    $error
      ? theme.mode === 'dark'
        ? 'rgba(234,67,53,0.15)'
        : '#fef2f2'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : '#fff'};
  border: 1px solid
    ${({ $error, theme }) =>
      $error ? '#ea4335' : theme.colors.border.default};
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  outline: none;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;
  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.border.medium};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.09)' : '#f9fafb'};
  }
  &:focus-visible {
    border-color: ${FOCUS_COLOR};
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  span {
    flex: 1;
  }
`

// ─── Styled — Layout wrapper, embed/standalone shared ────────────────────────

const PersonFormLayoutWrap = styled.div`
  /* 인물 폼은 한 화면에 정보가 많아 라벨을 살짝 좁혀 가용 폭 확보 */
  ${FieldRow} {
    grid-template-columns: minmax(180px, 220px) 1fr;
    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }
  ${FieldRowMulti} {
    grid-template-columns: minmax(180px, 220px) 1fr;
    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }
  ${FieldControl} {
    max-width: 540px;
  }
  ${DateFieldsRow} {
    max-width: 540px;
  }
  ${DateFieldBtn} {
    max-width: 100%;
  }
  ${InlineFields} {
    max-width: 600px;
  }
  ${OriginalNameInputWrap} {
    max-width: 540px;
  }
  ${SelectBtn} {
    max-width: 460px;
  }
  ${NativeSelect} {
    max-width: 460px;
  }
  [data-bio-editor-wrap] ${FieldControl} {
    max-width: 720px;
  }
`

// ─── Styled — Tab badges/check marks ─────────────────────────────────────────

const TabLabelInner = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const TabBadge = styled.span<{ $tone: 'required' | 'filled' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  ${({ $tone }) =>
    $tone === 'required'
      ? css`
          color: #fff;
          background: #dc2626;
        `
      : css`
          color: #16a34a;
          background: rgba(22, 163, 74, 0.15);
          padding: 0;
          width: 16px;
        `}
`

// ─── Styled — Advanced collapsible section ───────────────────────────────────

const AdvancedSection = styled.section`
  padding: 16px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const AdvancedToggle = styled.button<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  margin-bottom: ${({ $open }) => ($open ? '12px' : '0')};
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 8px;
  cursor: pointer;
  transition:
    color 0.15s ease,
    background 0.15s ease,
    border-color 0.15s ease;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.medium};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc'};
  }
  svg {
    transition: transform 0.2s ease;
    transform: rotate(${({ $open }) => ($open ? '90deg' : '0deg')});
  }
`

const AdvancedHint = styled.span`
  margin-left: 10px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

// ─── Styled — Sticky save footer ─────────────────────────────────────────────

const StickyFooter = styled.div`
  position: sticky;
  bottom: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 28px;
  margin-top: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(15,15,20,0.92)'
      : 'rgba(255,255,255,0.94)'};
  backdrop-filter: blur(8px);
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-wrap: wrap;
`

const FooterStatus = styled.span<{ $tone?: 'info' | 'warn' }>`
  font-size: 12px;
  color: ${({ $tone, theme }) =>
    $tone === 'warn'
      ? '#dc2626'
      : theme.colors.text.secondary};
`

// ─── Styled — Draft restore banner ───────────────────────────────────────────

const DraftBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  margin: 0 0 16px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.12)' : '#eef2ff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.3)' : '#c7d2fe'};
  border-radius: 12px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
  flex-wrap: wrap;
`

const DraftBannerActions = styled.div`
  display: flex;
  gap: 6px;
  flex-shrink: 0;
`

const DraftBtn = styled.button<{ $primary?: boolean }>`
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;
  ${({ $primary, theme }) =>
    $primary
      ? css`
          color: #fff;
          background: #6366f1;
          border: 1px solid #6366f1;
          &:hover {
            background: #4f46e5;
          }
        `
      : css`
          color: ${theme.colors.text.secondary};
          background: transparent;
          border: 1px solid ${theme.colors.border.default};
          &:hover {
            color: ${theme.colors.text.primary};
            background: ${theme.mode === 'dark'
              ? 'rgba(255,255,255,0.05)'
              : '#f8fafc'};
          }
        `}
`

// ─── Styled — Name preview chip & lifespan ───────────────────────────────────

const NamePreview = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 4px 10px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.1)' : '#eef2ff'};
  border-radius: 999px;
`

const NamePreviewLabel = styled.span`
  font-weight: 700;
  color: #4f46e5;
`

// ─── Styled — Field error ────────────────────────────────────────────────────

const FieldError = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #dc2626;
  margin-top: 6px;
  line-height: 1.4;
  svg {
    flex-shrink: 0;
  }
`

const ErrorText = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  color: #dc2626;
  margin-top: 12px;
  svg {
    flex-shrink: 0;
  }
`

// ─── Styled — Loading ────────────────────────────────────────────────────────

const LoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.6)'};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  backdrop-filter: blur(2px);
  border-radius: 12px;
`

const LoadingHost = styled.div`
  position: relative;
`

const SpouseNoteTextarea = styled(Textarea)`
  max-width: 540px;
`

// ─── Options ──────────────────────────────────────────────────────────────────

interface SegOption<T extends string> {
  value: T
  label: string
}

const GENDER_OPTIONS: SegOption<string>[] = [
  { value: 'MALE', label: '남성' },
  { value: 'FEMALE', label: '여성' },
]

const DEATH_TYPE_OPTIONS: SegOption<string>[] = [
  { value: 'NATURAL', label: '자연사' },
  { value: 'ILLNESS', label: '병사' },
  { value: 'ASSASSINATION', label: '암살' },
  { value: 'EXECUTION', label: '처형' },
  { value: 'BATTLE', label: '전사' },
  { value: 'ACCIDENT', label: '사고사' },
  { value: 'SUICIDE', label: '자살' },
  { value: 'UNKNOWN', label: '불명' },
  { value: 'OTHER', label: '기타' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseDateString = (date: string) => {
  const isBC = date.startsWith('-')
  const normalized = isBC ? date.slice(1) : date
  const [yearStr, monthStr, dayStr] = normalized.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)
  const day = parseInt(dayStr, 10)
  return { era: (isBC ? 'BC' : 'AD') as Era, year, month, day }
}

const buildInitialDate = (
  era: Era,
  year?: string,
  month?: string,
  day?: string,
) => {
  if (!year) return undefined
  const y = parseInt(year, 10)
  if (isNaN(y)) return undefined
  const m = month ? parseInt(month, 10) : 1
  const d = day ? parseInt(day, 10) : 1
  const yearStr = Math.abs(y).toString().padStart(4, '0')
  const monthStr = String(m).padStart(2, '0')
  const dayStr = String(d).padStart(2, '0')
  return `${era === 'BC' ? '-' : ''}${yearStr}-${monthStr}-${dayStr}`
}

const formatDateDisplay = (era: Era, y: string, m: string, d: string) => {
  if (!y.trim()) return '날짜 선택'
  const year = parseInt(y, 10)
  if (isNaN(year)) return '날짜 선택'
  const prefix = era === 'BC' ? `BC ${year}` : `${year}년`
  const month = m ? parseInt(m, 10) : null
  const day = d ? parseInt(d, 10) : null
  if (month && day) return `${prefix} ${month}월 ${day}일`
  if (month) return `${prefix} ${month}월`
  return prefix
}

/**
 * 출생/사망 날짜로 향년 계산.
 * - BC↔AD 경계는 0년이 없는 역사 통념을 따라 1년 빼서 처리(BC 1 → AD 1 = 만 1세).
 * - 월·일이 있으면 사망 시점이 생일 전인지 비교해 만 나이로 보정.
 * - 둘 중 하나라도 미상이거나 미입력이면 null.
 */
function calcLifespan(
  birth: { era: Era; year: number; month?: number; day?: number } | null,
  death: { era: Era; year: number; month?: number; day?: number } | null,
): number | null {
  if (!birth || !death) return null
  const by = birth.era === 'BC' ? -birth.year : birth.year
  const dy = death.era === 'BC' ? -death.year : death.year
  let age = dy - by
  // BC↔AD 경계 보정: 0년이 없으므로 부호가 다르면 1을 빼지 않고, 둘 다 BC면 그대로,
  // 둘 다 AD면 그대로. 이미 dy-by 차이로 충분.
  // 단, 실제 생일 전이면 만 나이 -1
  const bm = birth.month
  const dm = death.month
  if (bm && dm) {
    if (dm < bm) age -= 1
    else if (dm === bm) {
      const bd = birth.day
      const dd = death.day
      if (bd && dd && dd < bd) age -= 1
    }
  }
  if (age < 0) return null
  return age
}

// ─── Draft 직렬화 타입 ────────────────────────────────────────────────────────

interface PersonDraftSnapshot extends Record<string, unknown> {
  name: string
  surname: string
  middleName: string
  nameFormat: 'korean' | 'western'
  originalName: string
  surnameMeaning: string
  nameMeaning: string
  middleNameMeaning: string
  gender: string
  isBirthDateUnknown: boolean
  birthEra: Era
  birthYear: string
  birthMonth: string
  birthDay: string
  isDeathDateUnknown: boolean
  isAlive: boolean
  deathEra: Era
  deathType: string
  deathCause: string
  deathNote: string
  deathYear: string
  deathMonth: string
  deathDay: string
  countryId: string
  birthCityId: string
  deathCityId: string
  birthPlace: PlaceResult | null
  deathPlace: PlaceResult | null
  dynastyId: string
  religionId: string
  fatherId: string
  motherId: string
  spouseId: string
  spouseNote: string
  biography: string
  profileImageUrl: string
  regnalName: string
  templeName: string
  posthumousName: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface PersonRegisterViewProps {
  initialCountryId?: string | null
  onCancel: () => void
  onSuccess?: (personId: string) => void
  /** false면 FormCardWrapper 없이 헤더+폼만 렌더 (외부에서 카드로 감쌀 때) */
  embedInCard?: boolean
  /** 있으면 수정 모드: 해당 인물 로드 후 폼에 채우고 저장 시 update 호출 */
  editPersonId?: string | null
  /** 제출 중 상태 변경 시 부모에게 알림 (외부 하단 버튼 disabled용) */
  onSubmittingChange?: (v: boolean) => void
  /** 폼에 미저장 변경이 있는지 부모에게 알림 (닫기 시 경고용) */
  onDirtyChange?: (dirty: boolean) => void
}

export function PersonRegisterView({
  initialCountryId,
  onCancel,
  onSuccess,
  embedInCard = true,
  editPersonId,
  onSubmittingChange,
  onDirtyChange,
}: PersonRegisterViewProps) {
  const isEditMode = Boolean(editPersonId)
  // 기본 정보
  const [name, setName] = useState('')
  const [surname, setSurname] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [nameFormat, setNameFormat] = useState<'korean' | 'western'>('korean')
  const [originalName, setOriginalName] = useState('')
  const [surnameMeaning, setSurnameMeaning] = useState('')
  const [nameMeaning, setNameMeaning] = useState('')
  const [middleNameMeaning, setMiddleNameMeaning] = useState('')
  const [gender, setGender] = useState('')
  // 생몰
  const [isBirthDateUnknown, setIsBirthDateUnknown] = useState(false)
  const [birthEra, setBirthEra] = useState<Era>('AD')
  const [birthYear, setBirthYear] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const [isDeathDateUnknown, setIsDeathDateUnknown] = useState(false)
  const [isAlive, setIsAlive] = useState(false)
  const [deathEra, setDeathEra] = useState<Era>('AD')
  const [deathType, setDeathType] = useState<string>('')
  const [deathCause, setDeathCause] = useState<string>('')
  const [deathNote, setDeathNote] = useState<string>('')
  const [deathYear, setDeathYear] = useState('')
  const [deathMonth, setDeathMonth] = useState('')
  const [deathDay, setDeathDay] = useState('')
  // 소속
  const [countryId, setCountryId] = useState<string>(initialCountryId ?? '')
  const [countryName, setCountryName] = useState<string>('')
  const [birthCityId, setBirthCityId] = useState('')
  const [deathCityId, setDeathCityId] = useState('')
  const [birthPlace, setBirthPlace] = useState<PlaceResult | null>(null)
  const [deathPlace, setDeathPlace] = useState<PlaceResult | null>(null)
  const [dynastyId, setDynastyId] = useState('')
  const [religionId, setReligionId] = useState('')
  // 가족
  const [fatherId, setFatherId] = useState('')
  const [motherId, setMotherId] = useState('')
  const [spouseId, setSpouseId] = useState('')
  const [spouseNote, setSpouseNote] = useState('')
  // 기타
  const [biography, setBiography] = useState('')
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [regnalName, setRegnalName] = useState('')
  const [templeName, setTempleName] = useState('')
  const [posthumousName, setPosthumousName] = useState('')

  const [showCountryModal, setShowCountryModal] = useState(false)
  const [showBirthDateModal, setShowBirthDateModal] = useState(false)
  const [showDeathDateModal, setShowDeathDateModal] = useState(false)
  const [showFatherModal, setShowFatherModal] = useState(false)
  const [showMotherModal, setShowMotherModal] = useState(false)
  const [showSpouseModal, setShowSpouseModal] = useState(false)
  const [activeTab, setActiveTab] = useState<
    'basic' | 'affiliation' | 'family'
  >('basic')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  /** 썸네일 파일은 등록·저장 시에만 업로드. 미리보기용 blob URL */
  const [pendingThumbnailFile, setPendingThumbnailFile] = useState<File | null>(
    null,
  )
  const [thumbnailObjectUrl, setThumbnailObjectUrl] = useState<string | null>(
    null,
  )
  const [thumbnailDragOver, setThumbnailDragOver] = useState(false)
  /** 수정 시 서버에 있던 썸네일을 저장 시 제거 */
  const [thumbnailMarkedForRemoval, setThumbnailMarkedForRemoval] =
    useState(false)
  /** 제출 중 이미지 업로드 단계(버튼 문구용) */
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  /** 편집 모드에서 서버 데이터 로딩 중 여부 */
  const [isLoadingEdit, setIsLoadingEdit] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const trackDirtyRef = useRef(false)
  const uidPrefix = useId()
  const fid = useCallback((k: string) => `${uidPrefix}-${k}`, [uidPrefix])

  /** draft 복원 배너 — 진입 시 1회만 평가, 사용자 응답 후 사라짐. */
  const [pendingDraftSavedAt, setPendingDraftSavedAt] = useState<number | null>(
    null,
  )
  const draftScopeId = editPersonId ?? 'new'

  const markDirty = useCallback(() => {
    if (trackDirtyRef.current) setIsDirty(true)
  }, [])

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const [modernCountries, setModernCountries] = useState<CountryResponseDto[]>(
    [],
  )
  const [historicalCountries, setHistoricalCountries] = useState<
    HistoricalCountryResponseDto[]
  >([])
  const [dynasties, setDynasties] = useState<
    Array<{ id: string; name: string }>
  >([])
  const [religions, setReligions] = useState<
    Array<{ id: string; name: string }>
  >([])
  const [persons, setPersons] = useState<PersonResponseDto[]>([])

  /** id → 인물 — 가족 카드 렌더용 */
  const personById = useMemo(() => {
    const m = new Map<string, PersonResponseDto>()
    persons.forEach((p) => m.set(p.id, p))
    return m
  }, [persons])

  /** countryId → defaultNameDisplayOrder. 이름 미리보기 순서 결정용. */
  const countryNameOrderById = useMemo(() => {
    const m = new Map<string, 'korean' | 'western'>()
    modernCountries.forEach((c) => {
      const order = (c as { defaultNameDisplayOrder?: string | null })
        .defaultNameDisplayOrder
      m.set(c.id, order === 'western' ? 'western' : 'korean')
    })
    historicalCountries.forEach((c) => {
      const order = (c as { defaultNameDisplayOrder?: string | null })
        .defaultNameDisplayOrder
      m.set(c.id, order === 'western' ? 'western' : 'korean')
    })
    return m
  }, [modernCountries, historicalCountries])

  /** 폼이 표시할 이름 미리보기 — 국가의 표시 순서 기준. */
  const namePreview = useMemo(() => {
    if (!name.trim() && !surname.trim() && !middleName.trim()) return ''
    const order =
      countryNameOrderById.get(countryId) ??
      (nameFormat === 'western' ? 'western' : 'korean')
    return getPersonDisplayName(
      {
        name,
        surname,
        middleName,
        country: { defaultNameDisplayOrder: order },
      },
      false,
    )
  }, [name, surname, middleName, countryId, countryNameOrderById, nameFormat])

  /** 향년 계산 — 둘 다 정상값일 때만. */
  const lifespanText = useMemo(() => {
    if (
      isBirthDateUnknown ||
      isAlive ||
      isDeathDateUnknown ||
      !birthYear.trim() ||
      !deathYear.trim()
    ) {
      return null
    }
    const by = parseInt(birthYear, 10)
    const dy = parseInt(deathYear, 10)
    if (isNaN(by) || isNaN(dy)) return null
    const age = calcLifespan(
      {
        era: birthEra,
        year: by,
        month: birthMonth ? parseInt(birthMonth, 10) : undefined,
        day: birthDay ? parseInt(birthDay, 10) : undefined,
      },
      {
        era: deathEra,
        year: dy,
        month: deathMonth ? parseInt(deathMonth, 10) : undefined,
        day: deathDay ? parseInt(deathDay, 10) : undefined,
      },
    )
    if (age == null) return null
    return `향년 ${age}세`
  }, [
    isBirthDateUnknown,
    isAlive,
    isDeathDateUnknown,
    birthEra,
    birthYear,
    birthMonth,
    birthDay,
    deathEra,
    deathYear,
    deathMonth,
    deathDay,
  ])

  /** 탭별 필수 미입력 카운트 (라이브 — 입력하면 즉시 줄어듦) */
  const requiredMissingByTab = useMemo(() => {
    const basic =
      (name.trim() ? 0 : 1) +
      (surname.trim() ? 0 : 1) +
      (gender ? 0 : 1)
    const affiliation = countryId ? 0 : 1
    const family = 0
    return { basic, affiliation, family }
  }, [name, surname, gender, countryId])

  /** 탭별 선택 입력 채워짐 인디케이터(✓) — 필수 외 정보가 들어 있는지 */
  const filledByTab = useMemo(() => {
    const basic = !!(
      birthYear.trim() ||
      deathYear.trim() ||
      isBirthDateUnknown ||
      isDeathDateUnknown ||
      isAlive ||
      regnalName.trim() ||
      templeName.trim() ||
      posthumousName.trim() ||
      surnameMeaning.trim() ||
      nameMeaning.trim() ||
      middleNameMeaning.trim()
    )
    const affiliation = !!(
      birthPlace ||
      deathPlace ||
      dynastyId ||
      religionId ||
      biography.trim()
    )
    const family = !!(fatherId || motherId || spouseId)
    return { basic, affiliation, family }
  }, [
    birthYear,
    deathYear,
    isBirthDateUnknown,
    isDeathDateUnknown,
    isAlive,
    regnalName,
    templeName,
    posthumousName,
    surnameMeaning,
    nameMeaning,
    middleNameMeaning,
    birthPlace,
    deathPlace,
    dynastyId,
    religionId,
    biography,
    fatherId,
    motherId,
    spouseId,
  ])

  const dynastyOptions = useMemo(() => dynasties, [dynasties])
  const religionOptions = useMemo(() => religions, [religions])

  // ─── 데이터 로드 ────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      getAllCountries(),
      getAllHistoricalCountries(),
      dynastyApi.getAll(),
      getAllReligions(),
      getAllPersons(),
    ])
      .then(([modern, historical, dyn, rel, pers]) => {
        setModernCountries(modern)
        setHistoricalCountries(historical)
        setDynasties(Array.isArray(dyn) ? dyn : [])
        setReligions(Array.isArray(rel) ? rel : [])
        setPersons(Array.isArray(pers) ? pers : [])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    // 수정 모드에서는 인물 데이터가 권위 — 부모가 흘려보낸 initialCountryId가 덮어쓰지 않게.
    if (editPersonId) return
    setCountryId(initialCountryId ?? '')
    setCountryName('')
  }, [initialCountryId, editPersonId])

  useEffect(() => {
    return () => {
      if (thumbnailObjectUrl) URL.revokeObjectURL(thumbnailObjectUrl)
    }
  }, [thumbnailObjectUrl])

  // ─── 신규/수정 진입 시 폼 초기화 또는 서버 로드 ───────────────────────────
  useEffect(() => {
    setActiveTab('basic')
    trackDirtyRef.current = false
    setIsDirty(false)
    setErrors({})

    if (!editPersonId) {
      // 등록 모드 전환 시 폼 초기화
      setName('')
      setSurname('')
      setMiddleName('')
      setNameFormat('korean')
      setOriginalName('')
      setSurnameMeaning('')
      setNameMeaning('')
      setMiddleNameMeaning('')
      setGender('')
      setBiography('')
      setProfileImageUrl('')
      setRegnalName('')
      setTempleName('')
      setPosthumousName('')
      setCountryId(initialCountryId ?? '')
      setCountryName('')
      setBirthCityId('')
      setDeathCityId('')
      setBirthPlace(null)
      setDeathPlace(null)
      setDynastyId('')
      setReligionId('')
      setFatherId('')
      setMotherId('')
      setSpouseId('')
      setSpouseNote('')
      setBirthEra('AD')
      setBirthYear('')
      setBirthMonth('')
      setBirthDay('')
      setIsBirthDateUnknown(false)
      setDeathEra('AD')
      setDeathYear('')
      setDeathMonth('')
      setDeathDay('')
      setIsDeathDateUnknown(false)
      setIsAlive(false)
      setDeathType('')
      setDeathCause('')
      setDeathNote('')
      setPendingThumbnailFile(null)
      setThumbnailObjectUrl(null)
      setThumbnailMarkedForRemoval(false)
      setIsLoadingEdit(false)
      requestAnimationFrame(() => {
        trackDirtyRef.current = true
      })
      return
    }

    let cancelled = false
    setIsLoadingEdit(true)
    setPendingThumbnailFile(null)
    setThumbnailObjectUrl(null)
    setThumbnailMarkedForRemoval(false)
    getPersonDetailById(editPersonId)
      .then((p: any) => {
        if (cancelled || !p) return
        setName(p.name ?? '')
        setSurname(p.surname ?? '')
        setMiddleName(p.middleName ?? '')
        setNameFormat(
          (p.nameDisplayOrder === 'western' ? 'western' : 'korean') as
            | 'korean'
            | 'western',
        )
        setOriginalName(p.originalName ?? '')
        setSurnameMeaning(p.surnameMeaning ?? '')
        setNameMeaning(p.nameMeaning ?? '')
        setMiddleNameMeaning(p.middleNameMeaning ?? '')
        setGender(p.gender ?? '')
        setBiography(p.biography ?? '')
        setProfileImageUrl(p.profileImageUrl ?? '')
        setRegnalName(p.regnalName ?? '')
        setTempleName(p.templeName ?? '')
        setPosthumousName(p.posthumousName ?? '')
        setCountryId(p.countryId ?? '')
        setBirthCityId(p.birthCityId ?? '')
        setDeathCityId(p.deathCityId ?? '')
        if ((p as any).birthCity?.name) {
          setBirthPlace({
            cityId: p.birthCityId ?? undefined,
            adminDivisionId: (p as any).birthAdminDivisionId ?? undefined,
            displayName: (p as any).birthCity.name,
            shortName: (p as any).birthCity.name,
            region: (p as any).birthAdminDivision?.name ?? undefined,
          })
        } else if ((p as any).birthAdminDivision?.name) {
          setBirthPlace({
            adminDivisionId: (p as any).birthAdminDivisionId ?? undefined,
            displayName: (p as any).birthAdminDivision.name,
            shortName: (p as any).birthAdminDivision.name,
          })
        } else if ((p as any).birthPlaceText) {
          setBirthPlace({
            displayName: (p as any).birthPlaceText,
            shortName: (p as any).birthPlaceText,
            isManual: true,
          })
        }
        if ((p as any).deathCity?.name) {
          setDeathPlace({
            cityId: p.deathCityId ?? undefined,
            adminDivisionId: (p as any).deathAdminDivisionId ?? undefined,
            displayName: (p as any).deathCity.name,
            shortName: (p as any).deathCity.name,
            region: (p as any).deathAdminDivision?.name ?? undefined,
          })
        } else if ((p as any).deathAdminDivision?.name) {
          setDeathPlace({
            adminDivisionId: (p as any).deathAdminDivisionId ?? undefined,
            displayName: (p as any).deathAdminDivision.name,
            shortName: (p as any).deathAdminDivision.name,
          })
        } else if ((p as any).deathPlaceText) {
          setDeathPlace({
            displayName: (p as any).deathPlaceText,
            shortName: (p as any).deathPlaceText,
            isManual: true,
          })
        }
        setDynastyId(p.dynastyId ?? p.dynasty?.id ?? '')
        setReligionId(p.religionId ?? '')
        setFatherId(p.fatherId ?? p.father?.id ?? '')
        setMotherId(p.motherId ?? p.mother?.id ?? '')
        setSpouseId(p.spouseRelations?.[0]?.spouse?.id ?? p.spouseId ?? '')
        setSpouseNote(p.spouseRelations?.[0]?.note ?? '')
        if (p.birthYear != null || p.birthDate) {
          if (p.birthYear != null) {
            setBirthEra((p.birthEra as Era) ?? 'AD')
            setBirthYear(String(p.birthYear))
            setBirthMonth(p.birthMonth != null ? String(p.birthMonth) : '')
            setBirthDay(p.birthDay != null ? String(p.birthDay) : '')
          } else if (p.birthDate) {
            const b = parseDateString(p.birthDate)
            setBirthEra(b.era)
            setBirthYear(String(b.year))
            setBirthMonth(b.month != null ? String(b.month) : '')
            setBirthDay(b.day != null ? String(b.day) : '')
          }
          setIsBirthDateUnknown(false)
        } else setIsBirthDateUnknown(true)
        if (p.deathYear != null || p.deathDate) {
          if (p.deathYear != null) {
            setDeathEra((p.deathEra as Era) ?? 'AD')
            setDeathYear(String(p.deathYear))
            setDeathMonth(p.deathMonth != null ? String(p.deathMonth) : '')
            setDeathDay(p.deathDay != null ? String(p.deathDay) : '')
          } else if (p.deathDate) {
            const d = parseDateString(p.deathDate)
            setDeathEra(d.era)
            setDeathYear(String(d.year))
            setDeathMonth(d.month != null ? String(d.month) : '')
            setDeathDay(d.day != null ? String(d.day) : '')
          }
          setIsDeathDateUnknown(false)
          setIsAlive(false)
        } else {
          const alive = (p as any).isAlive === true
          const deathUnknown = (p as any).isDeathDateUnknown === true
          setIsAlive(alive)
          setIsDeathDateUnknown(!alive && deathUnknown)
        }
        setDeathType((p as any).deathType ?? '')
        setDeathCause((p as any).deathCause ?? '')
        setDeathNote((p as any).deathNote ?? '')
      })
      .catch(() => toast.error('인물 정보를 불러오지 못했습니다.'))
      .finally(() => {
        if (cancelled) return
        setIsLoadingEdit(false)
        requestAnimationFrame(() => {
          trackDirtyRef.current = true
        })
      })
    return () => {
      cancelled = true
    }
  }, [editPersonId, initialCountryId])

  useEffect(() => {
    if (!countryId || (!modernCountries.length && !historicalCountries.length))
      return
    const modern = modernCountries.find((c) => c.id === countryId)
    const historical = historicalCountries.find((c) => c.id === countryId)
    if (modern) setCountryName(modern.name)
    else if (historical) setCountryName(historical.name ?? '')
  }, [countryId, modernCountries, historicalCountries])

  // ─── Draft (localStorage) ──────────────────────────────────────────────────
  const buildDraftSnapshot = useCallback((): PersonDraftSnapshot => {
    return {
      name,
      surname,
      middleName,
      nameFormat,
      originalName,
      surnameMeaning,
      nameMeaning,
      middleNameMeaning,
      gender,
      isBirthDateUnknown,
      birthEra,
      birthYear,
      birthMonth,
      birthDay,
      isDeathDateUnknown,
      isAlive,
      deathEra,
      deathType,
      deathCause,
      deathNote,
      deathYear,
      deathMonth,
      deathDay,
      countryId,
      birthCityId,
      deathCityId,
      birthPlace,
      deathPlace,
      dynastyId,
      religionId,
      fatherId,
      motherId,
      spouseId,
      spouseNote,
      biography,
      profileImageUrl,
      regnalName,
      templeName,
      posthumousName,
    }
  }, [
    name,
    surname,
    middleName,
    nameFormat,
    originalName,
    surnameMeaning,
    nameMeaning,
    middleNameMeaning,
    gender,
    isBirthDateUnknown,
    birthEra,
    birthYear,
    birthMonth,
    birthDay,
    isDeathDateUnknown,
    isAlive,
    deathEra,
    deathType,
    deathCause,
    deathNote,
    deathYear,
    deathMonth,
    deathDay,
    countryId,
    birthCityId,
    deathCityId,
    birthPlace,
    deathPlace,
    dynastyId,
    religionId,
    fatherId,
    motherId,
    spouseId,
    spouseNote,
    biography,
    profileImageUrl,
    regnalName,
    templeName,
    posthumousName,
  ])

  const draft = usePersonDraft<PersonDraftSnapshot>({
    scopeId: draftScopeId,
    getSnapshot: buildDraftSnapshot,
    enabled: isDirty && !isSubmitting,
  })

  // dirty 변경 시 throttled save 트리거
  useEffect(() => {
    if (isDirty) draft.scheduleSave()
  }, [isDirty, draft])

  // 진입 시(또는 수정 데이터 로딩 후) 저장된 draft 발견되면 배너 표시
  const draftPeekedRef = useRef<string | null>(null)
  useEffect(() => {
    if (isLoadingEdit) return
    if (draftPeekedRef.current === draftScopeId) return
    draftPeekedRef.current = draftScopeId
    const env = draft.peekDraft()
    if (env && env.savedAt) {
      setPendingDraftSavedAt(env.savedAt)
    }
  }, [draftScopeId, isLoadingEdit, draft])

  const restoreDraft = () => {
    const env = draft.peekDraft()
    if (!env) {
      setPendingDraftSavedAt(null)
      return
    }
    const d = env.data
    // dirty 추적 일시 정지 — 한 번에 setState 채우는 동안.
    trackDirtyRef.current = false
    setName(d.name ?? '')
    setSurname(d.surname ?? '')
    setMiddleName(d.middleName ?? '')
    setNameFormat(d.nameFormat ?? 'korean')
    setOriginalName(d.originalName ?? '')
    setSurnameMeaning(d.surnameMeaning ?? '')
    setNameMeaning(d.nameMeaning ?? '')
    setMiddleNameMeaning(d.middleNameMeaning ?? '')
    setGender(d.gender ?? '')
    setIsBirthDateUnknown(d.isBirthDateUnknown ?? false)
    setBirthEra(d.birthEra ?? 'AD')
    setBirthYear(d.birthYear ?? '')
    setBirthMonth(d.birthMonth ?? '')
    setBirthDay(d.birthDay ?? '')
    setIsDeathDateUnknown(d.isDeathDateUnknown ?? false)
    setIsAlive(d.isAlive ?? false)
    setDeathEra(d.deathEra ?? 'AD')
    setDeathType(d.deathType ?? '')
    setDeathCause(d.deathCause ?? '')
    setDeathNote(d.deathNote ?? '')
    setDeathYear(d.deathYear ?? '')
    setDeathMonth(d.deathMonth ?? '')
    setDeathDay(d.deathDay ?? '')
    setCountryId(d.countryId ?? '')
    setBirthCityId(d.birthCityId ?? '')
    setDeathCityId(d.deathCityId ?? '')
    setBirthPlace(d.birthPlace ?? null)
    setDeathPlace(d.deathPlace ?? null)
    setDynastyId(d.dynastyId ?? '')
    setReligionId(d.religionId ?? '')
    setFatherId(d.fatherId ?? '')
    setMotherId(d.motherId ?? '')
    setSpouseId(d.spouseId ?? '')
    setSpouseNote(d.spouseNote ?? '')
    setBiography(d.biography ?? '')
    setProfileImageUrl(d.profileImageUrl ?? '')
    setRegnalName(d.regnalName ?? '')
    setTempleName(d.templeName ?? '')
    setPosthumousName(d.posthumousName ?? '')
    setPendingDraftSavedAt(null)
    requestAnimationFrame(() => {
      trackDirtyRef.current = true
      setIsDirty(true)
    })
    toast.success('임시 저장된 내용을 복원했습니다.')
  }

  const dismissDraft = () => {
    draft.discardDraft()
    setPendingDraftSavedAt(null)
  }

  // ─── 핸들러 ────────────────────────────────────────────────────────────────
  const handleCountrySelect = (c: { id: string; name: string }) => {
    setCountryId(c.id)
    setCountryName(c.name)
    setShowCountryModal(false)
    clearFieldError('countryId')
    markDirty()
  }

  const handleBirthDateSelect = (date: string) => {
    const { era, year, month, day } = parseDateString(date)
    setBirthEra(era)
    setBirthYear(year.toString())
    setBirthMonth(month.toString())
    setBirthDay(day.toString())
    setShowBirthDateModal(false)
    clearFieldError('birth')
    markDirty()
    // 신규 등록 시에만 사망일 모달을 자동으로 띄움.
    if (!isDeathDateUnknown && !isAlive && !isEditMode && !deathYear.trim()) {
      setTimeout(() => setShowDeathDateModal(true), 200)
    }
  }

  const handleDeathDateSelect = (date: string) => {
    const { era, year, month, day } = parseDateString(date)
    setDeathEra(era)
    setDeathYear(year.toString())
    setDeathMonth(month.toString())
    setDeathDay(day.toString())
    setShowDeathDateModal(false)
    clearFieldError('death')
    markDirty()
  }

  const acceptThumbnailFile = (file: File) => {
    try {
      validateImageFile(file)
      setThumbnailObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(file)
      })
      setPendingThumbnailFile(file)
      setThumbnailMarkedForRemoval(false)
      markDirty()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : '이미지를 선택할 수 없습니다.',
      )
    }
  }

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    acceptThumbnailFile(file)
  }

  const handleThumbnailDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setThumbnailDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) acceptThumbnailFile(file)
  }

  // 폼 어디서든 이미지 paste 가능 — 사용자가 클립보드 이미지를 빠르게 붙이도록.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      // RichTextEditor 내부 paste는 그쪽이 처리 — input/textarea/contenteditable 안이면 무시.
      const target = e.target as HTMLElement | null
      if (!target) return
      const tag = target.tagName?.toLowerCase()
      if (
        tag === 'input' ||
        tag === 'textarea' ||
        target.isContentEditable ||
        target.closest?.('[data-bio-editor-wrap]')
      ) {
        return
      }
      const items = e.clipboardData?.items
      if (!items) return
      for (let i = 0; i < items.length; i++) {
        const it = items[i]
        if (it.kind === 'file' && it.type.startsWith('image/')) {
          const file = it.getAsFile()
          if (file) {
            acceptThumbnailFile(file)
            e.preventDefault()
            break
          }
        }
      }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRemoveThumbnail = () => {
    if (pendingThumbnailFile) {
      setThumbnailObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      setPendingThumbnailFile(null)
      setThumbnailMarkedForRemoval(false)
      return
    }
    if (profileImageUrl.trim()) {
      setProfileImageUrl('')
      if (isEditMode) setThumbnailMarkedForRemoval(true)
    }
  }

  // ─── 검증 ──────────────────────────────────────────────────────────────────
  const isValidYear = (y: string): boolean => {
    if (!y.trim()) return true
    const n = Number(y)
    return Number.isInteger(n) && n >= 1 && n <= 9999
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = '이름을 입력해주세요.'
    if (!surname.trim()) e.surname = '성을 입력해주세요.'
    if (!gender) e.gender = '성별을 선택해주세요.'
    if (!countryId) e.countryId = '소속(출생) 국가를 선택해주세요.'
    if (!isBirthDateUnknown && birthYear.trim() && !isValidYear(birthYear)) {
      e.birth = '출생 연도는 1~9999 범위의 정수여야 합니다.'
    }
    if (
      !isAlive &&
      !isDeathDateUnknown &&
      deathYear.trim() &&
      !isValidYear(deathYear)
    ) {
      e.death = '사망 연도는 1~9999 범위의 정수여야 합니다.'
    }
    if (
      !e.birth &&
      !e.death &&
      !isBirthDateUnknown &&
      !isDeathDateUnknown &&
      !isAlive &&
      birthYear.trim() &&
      deathYear.trim()
    ) {
      const by = parseInt(birthYear, 10)
      const bm = birthMonth ? parseInt(birthMonth, 10) : 1
      const bd = birthDay ? parseInt(birthDay, 10) : 1
      const dy = parseInt(deathYear, 10)
      const dm = deathMonth ? parseInt(deathMonth, 10) : 1
      const dd = deathDay ? parseInt(deathDay, 10) : 1
      const birthSign = birthEra === 'BC' ? -1 : 1
      const deathSign = deathEra === 'BC' ? -1 : 1
      const birthVal = birthSign * (by * 10000 + bm * 100 + bd)
      const deathVal = deathSign * (dy * 10000 + dm * 100 + dd)
      if (deathVal < birthVal) {
        e.death = '사망일은 출생일 이후여야 합니다.'
      }
    }
    const today = new Date()
    const todayVal =
      today.getFullYear() * 10000 +
      (today.getMonth() + 1) * 100 +
      today.getDate()
    if (
      !e.birth &&
      !isBirthDateUnknown &&
      birthEra === 'AD' &&
      birthYear.trim()
    ) {
      const by = parseInt(birthYear, 10)
      const bm = birthMonth ? parseInt(birthMonth, 10) : 1
      const bd = birthDay ? parseInt(birthDay, 10) : 1
      if (by * 10000 + bm * 100 + bd > todayVal) {
        e.birth = '출생일은 오늘 이후일 수 없습니다.'
      }
    }
    if (
      !e.death &&
      !isAlive &&
      !isDeathDateUnknown &&
      deathEra === 'AD' &&
      deathYear.trim()
    ) {
      const dy = parseInt(deathYear, 10)
      const dm = deathMonth ? parseInt(deathMonth, 10) : 1
      const dd = deathDay ? parseInt(deathDay, 10) : 1
      if (dy * 10000 + dm * 100 + dd > todayVal) {
        e.death = '사망일은 오늘 이후일 수 없습니다.'
      }
    }
    setErrors(e)
    if (Object.keys(e).length > 0) {
      const basicFields = [
        'name',
        'surname',
        'gender',
        'birth',
        'death',
      ] as const
      if (basicFields.some((k) => e[k])) setActiveTab('basic')
      else if (e.countryId) setActiveTab('affiliation')
      return false
    }
    return true
  }

  const clearFieldError = useCallback((key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  // ─── Payload ───────────────────────────────────────────────────────────────
  const buildPayload = (
    uploadedProfileUrl?: string,
    options?: { clearProfileImage?: boolean },
  ): CreatePersonInput => {
    let profileImageField: string | null | undefined
    if (uploadedProfileUrl !== undefined) {
      profileImageField = uploadedProfileUrl.trim() || undefined
    } else if (options?.clearProfileImage && isEditMode) {
      profileImageField = null
    } else {
      profileImageField = profileImageUrl.trim() || undefined
    }
    const input: CreatePersonInput = {
      name: name.trim(),
      surname: surname.trim() || null,
      middleName: middleName.trim() || null,
      nameDisplayOrder: nameFormat,
      originalName: originalName.trim() || null,
      surnameMeaning: surnameMeaning.trim() || null,
      nameMeaning: nameMeaning.trim() || null,
      middleNameMeaning: middleNameMeaning.trim() || null,
      gender: gender || null,
      biography: biography.trim() || null,
      profileImageUrl:
        profileImageField === null
          ? (null as unknown as CreatePersonInput['profileImageUrl'])
          : profileImageField || null,
      regnalName: regnalName.trim() || null,
      templeName: templeName.trim() || null,
      posthumousName: posthumousName.trim() || null,
      countryId: countryId || undefined,
      birthCityId: birthCityId || undefined,
      deathCityId: deathCityId || undefined,
      birthAdminDivisionId: birthPlace?.adminDivisionId || undefined,
      deathAdminDivisionId: deathPlace?.adminDivisionId || undefined,
      birthPlaceText: birthPlace?.isManual ? birthPlace.shortName : null,
      deathPlaceText: deathPlace?.isManual ? deathPlace.shortName : null,
      dynastyId: dynastyId || undefined,
      religionId: religionId || undefined,
      fatherId: fatherId || undefined,
      motherId: motherId || undefined,
      // 수정 모드에서 배우자를 비웠을 때는 빈 배열로 보내 명시적 제거. 신규는 undefined.
      spouseRelations: spouseId
        ? [{ spouseId, note: spouseNote.trim() || null }]
        : isEditMode
          ? []
          : undefined,
      isBirthDateUnknown,
      isDeathDateUnknown,
      isAlive,
      deathType: deathType || null,
      deathCause: deathCause.trim() || null,
      deathNote: deathNote.trim() || null,
    }
    if (!isBirthDateUnknown && birthYear.trim()) {
      const y = parseInt(birthYear, 10)
      if (!isNaN(y)) {
        input.birth = {
          era: birthEra,
          year: y,
          month: birthMonth ? parseInt(birthMonth, 10) : undefined,
          day: birthDay ? parseInt(birthDay, 10) : undefined,
        }
      }
    }
    if (!isDeathDateUnknown && deathYear.trim()) {
      const y = parseInt(deathYear, 10)
      if (!isNaN(y)) {
        input.death = {
          era: deathEra,
          year: y,
          month: deathMonth ? parseInt(deathMonth, 10) : undefined,
          day: deathDay ? parseInt(deathDay, 10) : undefined,
        }
      }
    }
    return input
  }

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    onSubmittingChange?.(true)
    let profileImageUploadedThisSubmit = false
    try {
      let uploadedProfileUrl: string | undefined
      if (pendingThumbnailFile) {
        setUploadingThumbnail(true)
        try {
          const res = await uploadImage(pendingThumbnailFile, 'persons')
          uploadedProfileUrl = res.url
          profileImageUploadedThisSubmit = true
          setProfileImageUrl(res.url)
          setThumbnailObjectUrl(null)
          setPendingThumbnailFile(null)
          setThumbnailMarkedForRemoval(false)
        } finally {
          setUploadingThumbnail(false)
        }
      }
      const clearProfileImage =
        isEditMode &&
        thumbnailMarkedForRemoval &&
        uploadedProfileUrl === undefined
      const payload = buildPayload(uploadedProfileUrl, {
        clearProfileImage,
      })
      const createPayload =
        payload.profileImageUrl === null
          ? { ...payload, profileImageUrl: undefined }
          : payload
      if (isEditMode && editPersonId) {
        await updatePerson(editPersonId, payload)
        toast.success('인물 정보가 수정되었습니다.')
        setIsDirty(false)
        draft.discardDraft()
        onSuccess?.(editPersonId)
        onCancel()
      } else {
        const created = await createPerson(createPayload)
        toast.success('인물이 등록되었습니다.')
        setIsDirty(false)
        draft.discardDraft()
        onSuccess?.(created.id)
        onCancel()
      }
    } catch (err: any) {
      const base =
        err?.message ??
        (isEditMode ? '수정에 실패했습니다.' : '등록에 실패했습니다.')
      const extra =
        profileImageUploadedThisSubmit
          ? isEditMode
            ? ' 이미지는 업로드되었습니다. 저장을 다시 시도해 주세요.'
            : ' 이미지는 업로드되었습니다. 등록을 다시 시도해 주세요.'
          : ''
      setErrors((prev) => ({ ...prev, _form: base + extra }))
      toast.error(base + extra)
    } finally {
      setIsSubmitting(false)
      onSubmittingChange?.(false)
      setUploadingThumbnail(false)
    }
  }

  // ─── Render helpers ────────────────────────────────────────────────────────
  const tabLabel = (
    icon: React.ReactNode,
    label: string,
    key: 'basic' | 'affiliation' | 'family',
  ) => {
    const missing = requiredMissingByTab[key]
    const filled = filledByTab[key]
    return (
      <TabLabelInner>
        {icon}
        {label}
        {missing > 0 ? (
          <TabBadge $tone="required" aria-label={`미입력 ${missing}건`}>
            {missing}
          </TabBadge>
        ) : filled ? (
          <TabBadge $tone="filled" aria-label="입력됨">
            <FiCheck size={11} strokeWidth={3} />
          </TabBadge>
        ) : null}
      </TabLabelInner>
    )
  }

  const fatherPerson = fatherId ? personById.get(fatherId) : undefined
  const motherPerson = motherId ? personById.get(motherId) : undefined
  const spousePerson = spouseId ? personById.get(spouseId) : undefined

  const submitButtonLabel = uploadingThumbnail
    ? '이미지 업로드 중…'
    : isSubmitting
      ? isEditMode
        ? '저장 중…'
        : '등록 중…'
      : isEditMode
        ? '저장'
        : '등록'

  // ─── Render ────────────────────────────────────────────────────────────────
  const formContent = (
    <>
      {embedInCard && (
        <FormHeader>
          <BackButton type="button" onClick={onCancel}>
            <FiArrowLeft size={18} />
            목록 보기
          </BackButton>
          <SubmitButton
            type="submit"
            form="person-register-form"
            disabled={isSubmitting}
          >
            {submitButtonLabel}
          </SubmitButton>
        </FormHeader>
      )}
      {pendingDraftSavedAt && (
        <DraftBanner role="status">
          <span>
            임시 저장된 내용이 있습니다 ·{' '}
            {new Date(pendingDraftSavedAt).toLocaleString('ko-KR')}
          </span>
          <DraftBannerActions>
            <DraftBtn type="button" $primary onClick={restoreDraft}>
              복원
            </DraftBtn>
            <DraftBtn type="button" onClick={dismissDraft}>
              버리기
            </DraftBtn>
          </DraftBannerActions>
        </DraftBanner>
      )}
      <form
        id="person-register-form"
        onSubmit={handleSubmit}
        onChange={markDirty}
        onInput={markDirty}
      >
        <LoadingHost>
          {isLoadingEdit && (
            <LoadingOverlay aria-live="polite">
              인물 정보를 불러오는 중…
            </LoadingOverlay>
          )}
          <FormSectionInner aria-busy={isLoadingEdit}>
            <TabNavigation $hugContent>
              <TabButton
                type="button"
                $active={activeTab === 'basic'}
                onClick={() => setActiveTab('basic')}
              >
                {tabLabel(<FiInfo size={16} />, '기본 정보', 'basic')}
              </TabButton>
              <TabButton
                type="button"
                $active={activeTab === 'affiliation'}
                onClick={() => setActiveTab('affiliation')}
              >
                {tabLabel(
                  <FiGlobe size={16} />,
                  '소속 · 가문',
                  'affiliation',
                )}
              </TabButton>
              <TabButton
                type="button"
                $active={activeTab === 'family'}
                onClick={() => setActiveTab('family')}
              >
                {tabLabel(<FiUsers size={16} />, '가족', 'family')}
              </TabButton>
            </TabNavigation>

            {activeTab === 'basic' && (
              <FormRows>
                <ThumbnailWrap>
                  <FieldLabel htmlFor="person-thumbnail-upload">
                    썸네일
                  </FieldLabel>
                  <FieldControl>
                    <ThumbnailRow>
                      <ThumbnailPreview
                        htmlFor="person-thumbnail-upload"
                        $hasImage={!!(thumbnailObjectUrl || profileImageUrl)}
                        $dragOver={thumbnailDragOver}
                        onDragEnter={(e) => {
                          e.preventDefault()
                          setThumbnailDragOver(true)
                        }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          setThumbnailDragOver(true)
                        }}
                        onDragLeave={() => setThumbnailDragOver(false)}
                        onDrop={handleThumbnailDrop}
                      >
                        {thumbnailObjectUrl || profileImageUrl ? (
                          <img
                            src={
                              thumbnailObjectUrl ||
                              getUploadImageUrl(profileImageUrl) ||
                              profileImageUrl
                            }
                            alt="프로필"
                          />
                        ) : (
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        )}
                      </ThumbnailPreview>
                      <ThumbnailHint id="person-thumbnail-hint">
                        클릭하거나 이미지를 끌어 놓아 업로드. 클립보드 붙여넣기(Cmd/Ctrl+V)도 지원.
                        {pendingThumbnailFile
                          ? ' 저장 시 서버에 업로드됩니다.'
                          : ''}
                      </ThumbnailHint>
                      {(thumbnailObjectUrl || profileImageUrl.trim()) && (
                        <ThumbnailRemoveBtn
                          type="button"
                          onClick={() => {
                            handleRemoveThumbnail()
                            markDirty()
                          }}
                          disabled={isSubmitting}
                          aria-label={
                            pendingThumbnailFile
                              ? '선택한 이미지 취소'
                              : '썸네일 제거'
                          }
                        >
                          <FiTrash2 size={14} />
                          {pendingThumbnailFile ? '선택 취소' : '썸네일 제거'}
                        </ThumbnailRemoveBtn>
                      )}
                      <ThumbnailUploadInput
                        id="person-thumbnail-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailChange}
                        disabled={isSubmitting}
                        aria-describedby="person-thumbnail-hint"
                      />
                    </ThumbnailRow>
                  </FieldControl>
                </ThumbnailWrap>

                <FieldRow>
                  <FieldLabel htmlFor={fid('surname')}>
                    성 · 이름 <Required>*</Required> · 중간이름
                  </FieldLabel>
                  <FieldControl>
                    <InlineFields $cols={3}>
                      <FormInput
                        id={fid('surname')}
                        value={surname}
                        onChange={(e) => {
                          setSurname(e.target.value)
                          clearFieldError('surname')
                        }}
                        placeholder="성 (예: 김)"
                        $error={!!errors.surname}
                        aria-invalid={!!errors.surname}
                        aria-describedby={
                          errors.surname ? fid('surname-err') : undefined
                        }
                      />
                      <FormInput
                        id={fid('name')}
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value)
                          clearFieldError('name')
                        }}
                        placeholder="이름 (예: 홍길동)"
                        $error={!!errors.name}
                        aria-invalid={!!errors.name}
                        aria-describedby={
                          errors.name ? fid('name-err') : undefined
                        }
                      />
                      <FormInput
                        id={fid('middleName')}
                        value={middleName}
                        onChange={(e) => setMiddleName(e.target.value)}
                        placeholder="중간이름"
                      />
                    </InlineFields>
                    {namePreview && (
                      <NamePreview>
                        <NamePreviewLabel>표시</NamePreviewLabel>
                        {namePreview}
                      </NamePreview>
                    )}
                    {(errors.surname || errors.name) && (
                      <FieldError
                        id={errors.surname ? fid('surname-err') : fid('name-err')}
                        role="alert"
                      >
                        <FiAlertCircle size={13} />
                        {errors.surname || errors.name}
                      </FieldError>
                    )}
                  </FieldControl>
                </FieldRow>

                <FieldRow>
                  <FieldLabel htmlFor={fid('originalName')}>이름 원어</FieldLabel>
                  <FieldControl>
                    <OriginalNameInputWrap>
                      <FormInput
                        id={fid('originalName')}
                        value={originalName}
                        onChange={(e) => setOriginalName(e.target.value)}
                        placeholder="예: Franklin D. Roosevelt"
                      />
                    </OriginalNameInputWrap>
                  </FieldControl>
                </FieldRow>

                <FieldRow>
                  <FieldLabel htmlFor={fid('gender')}>
                    성별 <Required>*</Required>
                  </FieldLabel>
                  <FieldControl>
                    <SegmentRow role="radiogroup" aria-label="성별">
                      {GENDER_OPTIONS.map((opt) => (
                        <SegmentBtn
                          key={opt.value}
                          type="button"
                          role="radio"
                          aria-checked={gender === opt.value}
                          $active={gender === opt.value}
                          $error={!!errors.gender}
                          onClick={() => {
                            setGender(opt.value)
                            clearFieldError('gender')
                            markDirty()
                          }}
                        >
                          {opt.label}
                        </SegmentBtn>
                      ))}
                    </SegmentRow>
                    {errors.gender && (
                      <FieldError id={fid('gender-err')} role="alert">
                        <FiAlertCircle size={13} />
                        {errors.gender}
                      </FieldError>
                    )}
                  </FieldControl>
                </FieldRow>

                {/* 출생/사망 영역 박스 */}
                <LifeSectionGrid>
                  <LifeBox $tone="birth">
                    <LifeBoxTitle>출생</LifeBoxTitle>
                    <SegmentRow>
                      <SegmentBtn
                        type="button"
                        $active={isBirthDateUnknown}
                        onClick={() => {
                          setIsBirthDateUnknown((v) => !v)
                          markDirty()
                        }}
                      >
                        출생일 미상
                      </SegmentBtn>
                    </SegmentRow>
                    <DateFieldBtn
                      type="button"
                      $hasValue={!!birthYear.trim() && !isBirthDateUnknown}
                      onClick={() => setShowBirthDateModal(true)}
                      aria-invalid={!!errors.birth}
                      disabled={isBirthDateUnknown}
                      style={
                        isBirthDateUnknown
                          ? { opacity: 0.5, cursor: 'not-allowed' }
                          : undefined
                      }
                    >
                      <FiCalendar size={18} />
                      <span>
                        {isBirthDateUnknown
                          ? '미상'
                          : formatDateDisplay(
                              birthEra,
                              birthYear,
                              birthMonth,
                              birthDay,
                            )}
                      </span>
                      <FiChevronDown size={16} />
                    </DateFieldBtn>
                    {errors.birth && (
                      <FieldError role="alert">
                        <FiAlertCircle size={13} />
                        {errors.birth}
                      </FieldError>
                    )}
                  </LifeBox>

                  <LifeBox $tone="death">
                    <LifeBoxTitle>사망</LifeBoxTitle>
                    <SegmentRow role="radiogroup" aria-label="사망 상태">
                      <SegmentBtn
                        type="button"
                        role="radio"
                        aria-checked={!isAlive && !isDeathDateUnknown}
                        $active={!isAlive && !isDeathDateUnknown}
                        onClick={() => {
                          setIsAlive(false)
                          setIsDeathDateUnknown(false)
                          markDirty()
                        }}
                      >
                        사망함
                      </SegmentBtn>
                      <SegmentBtn
                        type="button"
                        role="radio"
                        aria-checked={isAlive}
                        $active={isAlive}
                        onClick={() => {
                          setIsAlive(true)
                          setIsDeathDateUnknown(false)
                          setDeathYear('')
                          setDeathMonth('')
                          setDeathDay('')
                          clearFieldError('death')
                          markDirty()
                        }}
                      >
                        생존 중
                      </SegmentBtn>
                      <SegmentBtn
                        type="button"
                        role="radio"
                        aria-checked={!isAlive && isDeathDateUnknown}
                        $active={!isAlive && isDeathDateUnknown}
                        onClick={() => {
                          setIsAlive(false)
                          setIsDeathDateUnknown(true)
                          markDirty()
                        }}
                      >
                        사망일 미상
                      </SegmentBtn>
                    </SegmentRow>
                    <DateFieldBtn
                      type="button"
                      $hasValue={
                        !!deathYear.trim() && !isAlive && !isDeathDateUnknown
                      }
                      onClick={() =>
                        !isAlive &&
                        !isDeathDateUnknown &&
                        setShowDeathDateModal(true)
                      }
                      disabled={isAlive || isDeathDateUnknown}
                      aria-invalid={!!errors.death}
                      style={
                        isAlive || isDeathDateUnknown
                          ? { opacity: 0.5, cursor: 'not-allowed' }
                          : undefined
                      }
                    >
                      <FiCalendar size={18} />
                      <span>
                        {isAlive
                          ? '생존 중'
                          : isDeathDateUnknown
                            ? '미상'
                            : formatDateDisplay(
                                deathEra,
                                deathYear,
                                deathMonth,
                                deathDay,
                              )}
                      </span>
                      <FiChevronDown size={16} />
                    </DateFieldBtn>
                    {lifespanText && (
                      <LifespanText aria-live="polite">{lifespanText}</LifespanText>
                    )}
                    {errors.death && (
                      <FieldError role="alert">
                        <FiAlertCircle size={13} />
                        {errors.death}
                      </FieldError>
                    )}
                    {/* 사망 유형 (인라인 칩) */}
                    <SegmentRow role="radiogroup" aria-label="사망 유형">
                      {DEATH_TYPE_OPTIONS.map((opt) => (
                        <SegmentBtn
                          key={opt.value}
                          type="button"
                          role="radio"
                          aria-checked={deathType === opt.value}
                          $active={deathType === opt.value}
                          disabled={isAlive}
                          onClick={() => {
                            setDeathType(deathType === opt.value ? '' : opt.value)
                            markDirty()
                          }}
                        >
                          {opt.label}
                        </SegmentBtn>
                      ))}
                    </SegmentRow>
                    <FormInput
                      value={deathCause}
                      onChange={(e) => setDeathCause(e.target.value)}
                      placeholder="사망 원인 상세 (예: 폐렴 합병증)"
                      disabled={isAlive}
                    />
                    <Textarea
                      value={deathNote}
                      onChange={(e) => setDeathNote(e.target.value)}
                      placeholder="사망 메모 (논란·맥락·비고)"
                      rows={2}
                      disabled={isAlive}
                    />
                  </LifeBox>
                </LifeSectionGrid>

                {/* 고급 정보 — 군주 필드 + 이름의 뜻 */}
                <AdvancedSection>
                  <AdvancedToggle
                    type="button"
                    $open={advancedOpen}
                    onClick={() => setAdvancedOpen((v) => !v)}
                    aria-expanded={advancedOpen}
                  >
                    <FiChevronRight size={14} />
                    고급 정보 (군주명·시호·이름의 뜻)
                  </AdvancedToggle>
                  {!advancedOpen && (
                    <AdvancedHint>
                      필요한 인물(왕·제왕·동아시아 인물 등)에만 노출하세요.
                    </AdvancedHint>
                  )}
                  {advancedOpen && (
                    <FormRows>
                      <FieldRowMulti>
                        <FieldLabel htmlFor={fid('regnalName')}>
                          군주명 · 묘호 · 시호
                        </FieldLabel>
                        <FieldControl>
                          <InlineFields $cols={3}>
                            <FormInput
                              id={fid('regnalName')}
                              value={regnalName}
                              onChange={(e) => setRegnalName(e.target.value)}
                              placeholder="군주명/재위명 (예: 세종)"
                            />
                            <FormInput
                              id={fid('templeName')}
                              value={templeName}
                              onChange={(e) => setTempleName(e.target.value)}
                              placeholder="묘호 (예: 세종)"
                            />
                            <FormInput
                              id={fid('posthumousName')}
                              value={posthumousName}
                              onChange={(e) =>
                                setPosthumousName(e.target.value)
                              }
                              placeholder="시호"
                            />
                          </InlineFields>
                        </FieldControl>
                      </FieldRowMulti>
                      <FieldRowMulti>
                        <FieldLabel htmlFor={fid('surnameMeaning')}>
                          성·이름·중간이름의 뜻
                        </FieldLabel>
                        <FieldControl>
                          <InlineFields $cols={3}>
                            <FormInput
                              id={fid('surnameMeaning')}
                              value={surnameMeaning}
                              onChange={(e) =>
                                setSurnameMeaning(e.target.value)
                              }
                              placeholder="성의 뜻"
                            />
                            <FormInput
                              id={fid('nameMeaning')}
                              value={nameMeaning}
                              onChange={(e) => setNameMeaning(e.target.value)}
                              placeholder="이름의 뜻"
                            />
                            <FormInput
                              id={fid('middleNameMeaning')}
                              value={middleNameMeaning}
                              onChange={(e) =>
                                setMiddleNameMeaning(e.target.value)
                              }
                              placeholder="중간이름의 뜻"
                            />
                          </InlineFields>
                        </FieldControl>
                      </FieldRowMulti>
                    </FormRows>
                  )}
                </AdvancedSection>
              </FormRows>
            )}

            {activeTab === 'affiliation' && (
              <FormRows>
                <FieldRow>
                  <FieldLabel htmlFor={fid('countryId')}>
                    소속(출생) 국가 <Required>*</Required>
                  </FieldLabel>
                  <FieldControl>
                    <SelectBtn
                      id={fid('countryId')}
                      type="button"
                      $hasValue={!!countryName}
                      $error={!!errors.countryId}
                      aria-invalid={!!errors.countryId}
                      aria-describedby={
                        errors.countryId ? fid('countryId-err') : undefined
                      }
                      onClick={() => setShowCountryModal(true)}
                    >
                      <span>{countryName || '국가 선택'}</span>
                      <FiChevronDown size={18} />
                    </SelectBtn>
                    {errors.countryId && (
                      <FieldError id={fid('countryId-err')} role="alert">
                        <FiAlertCircle size={13} />
                        {errors.countryId}
                      </FieldError>
                    )}
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>출생지</FieldLabel>
                  <FieldControl>
                    <PlaceAutocompleteWrap>
                      <PlaceAutocomplete
                        value={birthPlace}
                        onChange={(place) => {
                          setBirthPlace(place)
                          setBirthCityId(place?.cityId ?? '')
                          markDirty()
                        }}
                        countryId={countryId || undefined}
                      />
                    </PlaceAutocompleteWrap>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>사망지</FieldLabel>
                  <FieldControl>
                    <PlaceAutocompleteWrap>
                      <PlaceAutocomplete
                        value={deathPlace}
                        onChange={(place) => {
                          setDeathPlace(place)
                          setDeathCityId(place?.cityId ?? '')
                          markDirty()
                        }}
                        countryId={countryId || undefined}
                      />
                    </PlaceAutocompleteWrap>
                  </FieldControl>
                </FieldRow>
                <FieldRowMulti>
                  <FieldLabel htmlFor={fid('dynasty')}>가문 · 종교</FieldLabel>
                  <FieldControl>
                    <InlineFields $cols={2}>
                      <NativeSelect
                        id={fid('dynasty')}
                        value={dynastyId}
                        onChange={(e) => {
                          setDynastyId(e.target.value)
                          markDirty()
                        }}
                      >
                        <option value="">가문 — 선택 안 함</option>
                        {dynastyOptions.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </NativeSelect>
                      <NativeSelect
                        id={fid('religion')}
                        value={religionId}
                        onChange={(e) => {
                          setReligionId(e.target.value)
                          markDirty()
                        }}
                      >
                        <option value="">종교 — 선택 안 함</option>
                        {religionOptions.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </NativeSelect>
                    </InlineFields>
                  </FieldControl>
                </FieldRowMulti>
                <FieldRow data-bio-editor-wrap>
                  <FieldLabel>약력</FieldLabel>
                  <FieldControl>
                    <RichTextEditor
                      value={biography}
                      onChange={(v) => {
                        setBiography(v)
                        markDirty()
                      }}
                      showTitle={false}
                      placeholder="인물의 일생을 설명하는 글 (선택). 서식·이미지를 넣을 수 있습니다."
                      onImageUpload={async (file) => {
                        const result = await uploadImage(file, 'persons')
                        return result.url
                      }}
                    />
                  </FieldControl>
                </FieldRow>
              </FormRows>
            )}

            {activeTab === 'family' && (
              <FormRows>
                <FieldRow>
                  <FieldLabel htmlFor={fid('father')}>아버지</FieldLabel>
                  <FieldControl>
                    <FamilyMemberCard
                      person={fatherPerson}
                      placeholder="아버지 선택"
                      onChange={() => setShowFatherModal(true)}
                      onClear={() => {
                        setFatherId('')
                        markDirty()
                      }}
                    />
                    {showFatherModal && (
                      <PersonSelectModal
                        persons={persons}
                        selectedPersonId={fatherId}
                        onSelect={(id) => {
                          setFatherId(id)
                          setShowFatherModal(false)
                          markDirty()
                        }}
                        onClose={() => setShowFatherModal(false)}
                        excludeIds={[
                          editPersonId ?? '',
                          motherId,
                          spouseId,
                        ].filter(Boolean)}
                        excludeReason="자기 자신, 어머니·배우자로 지정한 인물은 아버지로 선택할 수 없습니다."
                      />
                    )}
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel htmlFor={fid('mother')}>어머니</FieldLabel>
                  <FieldControl>
                    <FamilyMemberCard
                      person={motherPerson}
                      placeholder="어머니 선택"
                      onChange={() => setShowMotherModal(true)}
                      onClear={() => {
                        setMotherId('')
                        markDirty()
                      }}
                    />
                    {showMotherModal && (
                      <PersonSelectModal
                        persons={persons}
                        selectedPersonId={motherId}
                        onSelect={(id) => {
                          setMotherId(id)
                          setShowMotherModal(false)
                          markDirty()
                        }}
                        onClose={() => setShowMotherModal(false)}
                        excludeIds={[
                          editPersonId ?? '',
                          fatherId,
                          spouseId,
                        ].filter(Boolean)}
                        excludeReason="자기 자신, 아버지·배우자로 지정한 인물은 어머니로 선택할 수 없습니다."
                      />
                    )}
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel htmlFor={fid('spouse')}>배우자</FieldLabel>
                  <FieldControl>
                    <FamilyMemberCard
                      person={spousePerson}
                      placeholder="배우자 선택 (대표 1명)"
                      onChange={() => setShowSpouseModal(true)}
                      onClear={() => {
                        setSpouseId('')
                        markDirty()
                      }}
                    />
                    {showSpouseModal && (
                      <PersonSelectModal
                        persons={persons}
                        selectedPersonId={spouseId}
                        onSelect={(id) => {
                          setSpouseId(id)
                          setShowSpouseModal(false)
                          markDirty()
                        }}
                        onClose={() => setShowSpouseModal(false)}
                        excludeIds={[
                          editPersonId ?? '',
                          fatherId,
                          motherId,
                        ].filter(Boolean)}
                        excludeReason="자기 자신, 아버지·어머니로 지정한 인물은 배우자로 선택할 수 없습니다."
                      />
                    )}
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel htmlFor={fid('spouseNote')}>배우자 설명</FieldLabel>
                  <FieldControl>
                    <SpouseNoteTextarea
                      id={fid('spouseNote')}
                      value={spouseNote}
                      onChange={(e) => setSpouseNote(e.target.value)}
                      placeholder="예: 1대 왕비, 재위 기간 중 사망"
                      disabled={!spouseId}
                      rows={3}
                    />
                  </FieldControl>
                </FieldRow>
              </FormRows>
            )}

            {errors._form && (
              <ErrorText role="alert">
                <FiAlertCircle size={14} />
                {errors._form}
              </ErrorText>
            )}
          </FormSectionInner>
        </LoadingHost>
      </form>

      {/* sticky footer — 긴 폼 끝에서도 저장 가능 */}
      <StickyFooter>
        {draft.savedAt ? (
          <FooterStatus>
            임시 저장됨 · {new Date(draft.savedAt).toLocaleTimeString('ko-KR')}
          </FooterStatus>
        ) : (
          <FooterStatus $tone={isDirty ? 'warn' : 'info'}>
            {isDirty ? '저장되지 않은 변경 사항이 있습니다.' : ''}
          </FooterStatus>
        )}
        <SubmitButton
          type="submit"
          form="person-register-form"
          disabled={isSubmitting}
        >
          {submitButtonLabel}
        </SubmitButton>
      </StickyFooter>

      <CountrySelectModal
        isOpen={showCountryModal}
        onClose={() => setShowCountryModal(false)}
        onSelect={handleCountrySelect}
        modernCountries={modernCountries}
        historicalCountries={historicalCountries}
        title="소속 국가 선택"
        selectedCountryId={countryId || undefined}
      />
      {showBirthDateModal && (
        <DatePickerModal
          isOpen={showBirthDateModal}
          onClose={() => setShowBirthDateModal(false)}
          onSelect={handleBirthDateSelect}
          initialDate={buildInitialDate(
            birthEra,
            birthYear,
            birthMonth,
            birthDay,
          )}
          title="출생일 선택"
        />
      )}
      {showDeathDateModal && (
        <DatePickerModal
          isOpen={showDeathDateModal}
          onClose={() => setShowDeathDateModal(false)}
          onSelect={handleDeathDateSelect}
          initialDate={buildInitialDate(
            deathEra,
            deathYear,
            deathMonth,
            deathDay,
          )}
          title="사망일 선택"
        />
      )}
    </>
  )

  return (
    <PersonFormLayoutWrap>
      {embedInCard ? <FormCardWrapper>{formContent}</FormCardWrapper> : formContent}
    </PersonFormLayoutWrap>
  )
}
