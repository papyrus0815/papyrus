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
  FiAlertTriangle,
  FiArrowLeft,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiClock,
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
import { SelectModal } from '@/shared/ui/select-modal/select-modal'
import { type PlaceResult } from '@/shared/ui/place-autocomplete/place-autocomplete'
import {
  BackButton,
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
} from '@/shared/ui/register-form-layout/register-form-layout.styles'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'

import {
  EXTRA_DEATH_TYPES,
  GENDER_OPTIONS,
  type PersonDraftSnapshot,
  buildInitialDate,
  calcLifespan,
  formatRelativeTime,
  parseDateString,
} from './person-register-view.helpers'
import { AffiliationSection } from './sections/affiliation-section'
import { FamilySection } from './sections/family-section'
import { LifeSection } from './sections/life-section'
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
    background 0.2s;
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

const ThumbnailHint = styled.span<{ $accent?: boolean }>`
  font-size: 13px;
  color: ${({ $accent, theme }) =>
    $accent
      ? '#4f46e5'
      : theme.mode === 'dark'
        ? '#94a3b8'
        : '#64748b'};
  font-weight: ${({ $accent }) => ($accent ? 600 : 400)};
  max-width: 260px;
  line-height: 1.5;
  transition: color 0.15s ease;
`

const ThumbnailRemoveBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  cursor: pointer;
  transition:
    color 0.15s ease,
    background 0.15s ease,
    border-color 0.15s ease;
  &:hover:not(:disabled) {
    color: #dc2626;
    border-color: #fecaca;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(248,113,113,0.1)' : '#fef2f2'};
  }
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

// ─── Styled — Segmented control (성별·사망유형) ──────────────────────────────

const SegmentRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

/**
 * 칩 컨트롤 — variant로 시각 위계 차별화.
 * - 'solid' (default): 라디오성 선택 (성별·사망상태·사망유형). 활성 시 indigo solid.
 * - 'ghost': 보조 토글 (출생일 미상). 활성 시 회색 outline.
 */
const SegmentBtn = styled.button<{
  $active?: boolean
  $error?: boolean
  $variant?: 'solid' | 'ghost'
}>`
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 999px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;
  ${({ $variant = 'solid', $active, $error, theme }) => {
    if ($variant === 'ghost') {
      return `
        color: ${
          $active
            ? theme.colors.text.primary
            : theme.colors.text.tertiary
        };
        background: ${
          $active
            ? theme.mode === 'dark'
              ? 'rgba(255,255,255,0.08)'
              : '#f1f5f9'
            : 'transparent'
        };
        border: 1px solid ${
          $active
            ? theme.colors.border.medium
            : theme.colors.border.default
        };
        &:hover:not(:disabled) {
          color: ${theme.colors.text.primary};
          border-color: ${theme.colors.border.medium};
        }
      `
    }
    // solid (default)
    return `
      color: ${$active ? '#fff' : theme.colors.text.secondary};
      background: ${
        $active
          ? '#6366f1'
          : $error
            ? theme.mode === 'dark'
              ? 'rgba(220,38,38,0.12)'
              : '#fef2f2'
            : theme.mode === 'dark'
              ? 'rgba(255,255,255,0.05)'
              : '#fff'
      };
      border: 1px solid ${
        $active
          ? '#6366f1'
          : $error
            ? '#dc2626'
            : theme.colors.border.default
      };
      &:hover:not(:disabled) {
        border-color: ${$active ? '#4f46e5' : '#a5b4fc'};
        color: ${$active ? '#fff' : theme.colors.text.primary};
      }
    `
  }}
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
  ${InlineFields} {
    max-width: 600px;
  }
  ${OriginalNameInputWrap} {
    max-width: 540px;
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
  ${({ $tone, theme }) =>
    $tone === 'required'
      ? css`
          color: #fff;
          background: #dc2626;
        `
      : css`
          /* ✓ — 입력 완료 인디케이터. 회색에서 indigo로 격상해 가시성 ↑ */
          color: #fff;
          background: #6366f1;
          padding: 0;
          width: 16px;
          box-shadow: ${theme.mode === 'dark'
            ? '0 0 0 2px rgba(99,102,241,0.18)'
            : '0 0 0 2px rgba(99,102,241,0.12)'};
        `}
`

// ─── Styled — Advanced collapsible section ───────────────────────────────────

const AdvancedSection = styled.section`
  padding: 16px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

/* 박스 테두리 제거 — disclosure 스타일 텍스트 토글로 단순화. */
const AdvancedToggle = styled.button<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  margin-bottom: ${({ $open }) => ($open ? '12px' : '0')};
  font-size: 13px;
  font-weight: 600;
  color: #4f46e5;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.15s ease;
  &:hover {
    color: #4338ca;
  }
  &:focus-visible {
    outline: 2px solid rgba(79, 70, 229, 0.35);
    outline-offset: 2px;
    border-radius: 4px;
  }
  svg {
    transition: transform 0.2s ease;
    transform: rotate(${({ $open }) => ($open ? '90deg' : '0deg')});
  }
`

/* 펼친 본문에 좌측 indigo accent로 시각 그룹화 */
const AdvancedBody = styled.div`
  padding-left: 12px;
  border-left: 2px solid
    ${({ theme }) =>
      theme.colors.alert.info.border};
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

/** 푸터 상태 — 진행도 바 + 라벨. 라이브 입력으로 채워짐을 시각화. */
const FooterProgress = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 160px;
`

const FooterProgressMeta = styled.div<{ $tone?: 'info' | 'warn' | 'done' }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ $tone, theme }) =>
    $tone === 'warn'
      ? '#dc2626'
      : $tone === 'done'
        ? '#4f46e5'
        : theme.colors.text.secondary};
  letter-spacing: 0.01em;
`

const FooterProgressMetaLabel = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const FooterProgressMetaCount = styled.span`
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
`

const FooterProgressTrack = styled.div`
  position: relative;
  height: 4px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#eef2ff'};
  overflow: hidden;
`

const FooterProgressFill = styled.div<{ $pct: number; $complete: boolean }>`
  position: absolute;
  inset: 0 auto 0 0;
  width: ${({ $pct }) => $pct}%;
  border-radius: 999px;
  background: ${({ $complete }) =>
    $complete
      ? 'linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)'
      : 'linear-gradient(90deg, #818cf8 0%, #6366f1 100%)'};
  transition:
    width 0.25s ease,
    background 0.2s ease;
`

const FooterActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`

// ─── Styled — Draft restore banner ───────────────────────────────────────────

const DraftBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  margin: 0 0 8px;
  background: ${({ theme }) =>
    theme.colors.alert.info.bg};
  border: 1px solid
    ${({ theme }) =>
      theme.colors.alert.info.border};
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.primary};
  flex-wrap: wrap;

  /* TopAlert와 인접 시 시각 일관성 */
  & + div[role='alert'] {
    margin-top: 0;
  }
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

// ─── Styled — Name preview chip ──────────────────────────────────────────────
// 정보 칩(회색 톤). InlineActionBtn(indigo)과 시각 위계 차별화.
const NamePreview = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  border-radius: 999px;
`

const NamePreviewLabel = styled.span`
  font-weight: 700;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.04em;
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

// ─── Styled — Header secondary submit button ─────────────────────────────────
const HeaderSecondarySubmit = styled(SubmitButton)`
  background: transparent;
  color: #4f46e5;
  border: 1px solid #c7d2fe;
  box-shadow: none;
  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.colors.alert.info.bg};
    color: #4338ca;
  }
`

// ─── Styled — Undo toast (국가 변경 시 출생/사망지 자동 정리) ────────────────
const UndoToastBody = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const UndoToastButton = styled.button`
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #4f46e5;
  background: transparent;
  border: 1px solid #c7d2fe;
  border-radius: 999px;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
  &:hover {
    color: #fff;
    background: #6366f1;
    border-color: #6366f1;
  }
`

// ─── Styled — Top-of-form alert (form-wide error, country stale) ─────────────
const TopAlert = styled.div<{ $tone?: 'error' | 'warn' }>`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0 0 16px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid;
  font-size: 13px;
  line-height: 1.45;
  background: ${({ $tone, theme }) =>
    $tone === 'warn'
      ? theme.mode === 'dark'
        ? 'rgba(234,179,8,0.12)'
        : '#fffbeb'
      : theme.mode === 'dark'
        ? 'rgba(220,38,38,0.12)'
        : '#fef2f2'};
  border-color: ${({ $tone }) =>
    $tone === 'warn' ? '#fcd34d' : '#fecaca'};
  color: ${({ $tone, theme }) =>
    $tone === 'warn'
      ? theme.mode === 'dark'
        ? '#fde68a'
        : '#a16207'
      : '#dc2626'};
  svg {
    flex-shrink: 0;
    margin-top: 1px;
  }
`

// ─── Styled — Register-another toggle ────────────────────────────────────────
const RegisterAnotherLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  user-select: none;
  input {
    width: 14px;
    height: 14px;
    accent-color: #6366f1;
    cursor: pointer;
  }
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

// ─── Styled — Person-not-found panel ─────────────────────────────────────────
const NotFoundPanel = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 64px 24px;
  text-align: center;
`

const NotFoundIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) =>
    theme.colors.alert.warning.bg};
  color: #ca8a04;
`

const NotFoundTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const NotFoundDesc = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 320px;
  line-height: 1.5;
`

// 옵션·헬퍼·Draft 타입은 person-register-view.helpers.ts에서 import.

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
  const [showDynastyModal, setShowDynastyModal] = useState(false)
  const [showReligionModal, setShowReligionModal] = useState(false)
  const [activeTab, setActiveTab] = useState<
    'basic' | 'life' | 'affiliation' | 'family'
  >('basic')
  /** 기본 탭의 "이름의 뜻" 접기 영역 */
  const [nameMeaningsOpen, setNameMeaningsOpen] = useState(false)
  /** 생애 탭의 "군주명·묘호·시호" 접기 영역 — 군주가 아닌 인물에겐 영구 무관 */
  const [monarchTitlesOpen, setMonarchTitlesOpen] = useState(false)
  const [deathTypeShowMore, setDeathTypeShowMore] = useState(false)
  /** 신규 등록 시 "또 등록" 모드 — 등록 후 폼만 리셋, onCancel 안 부름 */
  const [registerAnother, setRegisterAnother] = useState(false)
  /**
   * 연속 등록(또 등록) 모드에서 직전 회차에 등록한 인물 — 최대 5명, 최신이 앞.
   * 가족 탭에서 부/모/배우자 슬롯 위에 후보 칩으로 노출. 가계 일괄 등록을 가속.
   */
  const [recentlyRegistered, setRecentlyRegistered] = useState<
    PersonResponseDto[]
  >([])
  /** 수정 모드에서 인물 로드 실패 — 폼 대신 안내 패널 표시 */
  const [loadFailed, setLoadFailed] = useState(false)
  /** 신규 등록 모드에서 폼 강제 reset 트리거. registerAnother 흐름에서 사용. */
  const [resetCounter, setResetCounter] = useState(0)
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
  /**
   * 수정 모드에서 detail 응답에 임베드된 가족 인물 캐시.
   * 인물 풀(persons)이 lazy 로드되기 전이라도 가족 카드를 정확히 그리기 위해.
   */
  const [editFamilyCache, setEditFamilyCache] = useState<{
    father?: PersonResponseDto
    mother?: PersonResponseDto
    spouse?: PersonResponseDto
  }>({})

  /** id → 인물 — 가족 카드 렌더용. persons 풀 + 수정 모드 캐시 합집합. */
  const personById = useMemo(() => {
    const m = new Map<string, PersonResponseDto>()
    persons.forEach((p) => m.set(p.id, p))
    if (editFamilyCache.father)
      m.set(editFamilyCache.father.id, editFamilyCache.father)
    if (editFamilyCache.mother)
      m.set(editFamilyCache.mother.id, editFamilyCache.mother)
    if (editFamilyCache.spouse)
      m.set(editFamilyCache.spouse.id, editFamilyCache.spouse)
    return m
  }, [persons, editFamilyCache])

  /**
   * 가족 슬롯별 "최근 등록한 인물" 후보 — 현재 인물 + 이미 다른 슬롯에 들어간 인물을 제외.
   * 같은 인물을 두 슬롯에 동시 지정할 수 없으므로 모든 슬롯에서 동일 풀을 사용.
   */
  const recentCandidates = useMemo(() => {
    if (recentlyRegistered.length === 0) return []
    return recentlyRegistered.filter((p) => {
      if (p.id === editPersonId) return false
      if (p.id === fatherId) return false
      if (p.id === motherId) return false
      if (p.id === spouseId) return false
      return true
    })
  }, [recentlyRegistered, editPersonId, fatherId, motherId, spouseId])

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
    const life = 0
    const affiliation = countryId ? 0 : 1
    const family = 0
    return { basic, life, affiliation, family }
  }, [name, surname, gender, countryId])

  /** 진행도 — 필수 N/4. 사용자가 폼 끝까지 안 가도 진행감을 유지. */
  const requiredProgress = useMemo(() => {
    const total = 4
    const missing =
      requiredMissingByTab.basic +
      requiredMissingByTab.life +
      requiredMissingByTab.affiliation +
      requiredMissingByTab.family
    return { filled: total - missing, total }
  }, [requiredMissingByTab])

  /** 탭별 선택 입력 채워짐 인디케이터(✓) — 필수 외 정보가 들어 있는지 */
  const filledByTab = useMemo(() => {
    // 기본 — 약력·원어·이름의 뜻 (이름·성·성별은 필수, 채움 인디케이터에서 제외)
    const basic = !!(
      originalName.trim() ||
      biography.trim() ||
      surnameMeaning.trim() ||
      nameMeaning.trim() ||
      middleNameMeaning.trim() ||
      profileImageUrl.trim() ||
      pendingThumbnailFile
    )
    // 생애 — 생몰 정보 + 군주 호칭
    const life = !!(
      birthYear.trim() ||
      deathYear.trim() ||
      isBirthDateUnknown ||
      isDeathDateUnknown ||
      isAlive ||
      regnalName.trim() ||
      templeName.trim() ||
      posthumousName.trim()
    )
    const affiliation = !!(
      birthPlace ||
      deathPlace ||
      dynastyId ||
      religionId
    )
    const family = !!(fatherId || motherId || spouseId)
    return { basic, life, affiliation, family }
  }, [
    originalName,
    biography,
    surnameMeaning,
    nameMeaning,
    middleNameMeaning,
    profileImageUrl,
    pendingThumbnailFile,
    birthYear,
    deathYear,
    isBirthDateUnknown,
    isDeathDateUnknown,
    isAlive,
    regnalName,
    templeName,
    posthumousName,
    birthPlace,
    deathPlace,
    dynastyId,
    religionId,
    fatherId,
    motherId,
    spouseId,
  ])

  /** SelectModal 형식 — '선택 안 함' 옵션을 맨 위에 prepend. */
  const dynastySelectOptions = useMemo(
    () => [
      { value: '', label: '선택 안 함' },
      ...dynasties.map((d) => ({ value: d.id, label: d.name })),
    ],
    [dynasties],
  )
  const religionSelectOptions = useMemo(
    () => [
      { value: '', label: '선택 안 함' },
      ...religions.map((r) => ({ value: r.id, label: r.name })),
    ],
    [religions],
  )
  const dynastyLabel = useMemo(
    () => (dynastyId ? (dynasties.find((d) => d.id === dynastyId)?.name ?? '') : ''),
    [dynastyId, dynasties],
  )
  const religionLabel = useMemo(
    () => (religionId ? (religions.find((r) => r.id === religionId)?.name ?? '') : ''),
    [religionId, religions],
  )

  // ─── 데이터 로드 ────────────────────────────────────────────────────────────
  // 인물 풀(getAllPersons)은 가족 탭/선택 모달에서만 필요해 lazy 로드.
  // 인물 수가 늘어났을 때 모달 진입 비용을 낮춤.
  useEffect(() => {
    Promise.all([
      getAllCountries(),
      getAllHistoricalCountries(),
      dynastyApi.getAll(),
      getAllReligions(),
    ])
      .then(([modern, historical, dyn, rel]) => {
        setModernCountries(modern)
        setHistoricalCountries(historical)
        setDynasties(Array.isArray(dyn) ? dyn : [])
        setReligions(Array.isArray(rel) ? rel : [])
      })
      .catch(() => {})
  }, [])

  /** 인물 풀이 한 번이라도 로드되었는지 — 같은 모달 인스턴스 내 중복 호출 방지. */
  const personsLoadedRef = useRef(false)
  /** 가족 탭이 활성이거나 PersonSelectModal이 열려 있으면 인물 풀 로드. */
  const needsPersons =
    activeTab === 'family' ||
    showFatherModal ||
    showMotherModal ||
    showSpouseModal
  useEffect(() => {
    if (!needsPersons || personsLoadedRef.current) return
    personsLoadedRef.current = true
    getAllPersons()
      .then((pers) => {
        setPersons(Array.isArray(pers) ? pers : [])
      })
      .catch(() => {
        personsLoadedRef.current = false
      })
  }, [needsPersons])

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

    setLoadFailed(false)

    if (!editPersonId) {
      // 등록 모드 전환 시 폼 초기화
      setNameMeaningsOpen(false)
      setMonarchTitlesOpen(false)
      setDeathTypeShowMore(false)
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
      setEditFamilyCache({})
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
        // detail 응답의 임베디드 인물을 가족 캐시에 보관 — 인물 풀 lazy 로드 전에도 카드 정확.
        setEditFamilyCache({
          father: p.father ?? undefined,
          mother: p.mother ?? undefined,
          spouse: p.spouseRelations?.[0]?.spouse ?? undefined,
        })
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
        // 사망 유형이 EXTRA에 있으면 더보기 자동 펼침 (사용자가 그 칩을 볼 수 있게).
        const dt = (p as any).deathType ?? ''
        if (dt && EXTRA_DEATH_TYPES.some((o) => o.value === dt)) {
          setDeathTypeShowMore(true)
        }
        // 이름의 뜻이 있으면 기본 탭의 collapse 자동 펼침.
        const hasNameMeanings =
          (p.surnameMeaning && String(p.surnameMeaning).trim()) ||
          (p.nameMeaning && String(p.nameMeaning).trim()) ||
          (p.middleNameMeaning && String(p.middleNameMeaning).trim())
        setNameMeaningsOpen(Boolean(hasNameMeanings))
        // 군주 호칭이 있으면 생애 탭의 collapse 자동 펼침.
        const hasMonarchTitles =
          (p.regnalName && String(p.regnalName).trim()) ||
          (p.templeName && String(p.templeName).trim()) ||
          (p.posthumousName && String(p.posthumousName).trim())
        setMonarchTitlesOpen(Boolean(hasMonarchTitles))
      })
      .catch(() => {
        if (cancelled) return
        setLoadFailed(true)
        toast.error('인물 정보를 불러오지 못했습니다.')
      })
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
  }, [editPersonId, initialCountryId, resetCounter])

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
      // 복원 직후엔 dirty=false. 사용자가 복원 후 추가 입력 없이 닫으면
      // 다시 confirm을 띄울 필요 없음.
      setIsDirty(false)
    })
    toast.success('임시 저장된 내용을 복원했습니다.')
  }

  const dismissDraft = () => {
    draft.discardDraft()
    setPendingDraftSavedAt(null)
  }

  // ─── 핸들러 ────────────────────────────────────────────────────────────────
  const handleCountrySelect = (c: { id: string; name: string }) => {
    const prev = countryId
    setCountryId(c.id)
    setCountryName(c.name)
    setShowCountryModal(false)
    clearFieldError('countryId')
    markDirty()
    // 출생지/사망지는 이전 국가의 도시·행정구역 ID에 묶여 있어 국가가 바뀌면 데이터 정합이 깨짐.
    // 자동으로 비우고 "되돌리기" 액션을 제공해 실수 회복을 빠르게.
    if (prev && prev !== c.id && (birthPlace || deathPlace)) {
      const snapshot = {
        birthPlace,
        deathPlace,
        birthCityId,
        deathCityId,
      }
      setBirthPlace(null)
      setBirthCityId('')
      setDeathPlace(null)
      setDeathCityId('')
      toast(
        (t) => (
          <UndoToastBody>
            <span>출생지·사망지를 비웠습니다</span>
            <UndoToastButton
              type="button"
              onClick={() => {
                setBirthPlace(snapshot.birthPlace)
                setBirthCityId(snapshot.birthCityId)
                setDeathPlace(snapshot.deathPlace)
                setDeathCityId(snapshot.deathCityId)
                toast.dismiss(t.id)
              }}
            >
              되돌리기
            </UndoToastButton>
          </UndoToastBody>
        ),
        { duration: 6000, icon: '🔄' },
      )
    }
  }

  /**
   * 사망 상태 3-way 전환 — alive / deceased / unknown.
   * - alive: 사망일 비움. 사망 상세(유형·원인·메모) 값은 보존(취소 복구용); payload에서 nullify.
   * - deceased: 사망일 미상=false. 신규 등록 + 출생일 있음 + 사망일 비어 있으면 사망일 모달 자동.
   * - unknown: 사망일 미상=true, 입력된 사망일 비움.
   */
  const setDeathStatus = (status: 'alive' | 'deceased' | 'unknown') => {
    if (status === 'alive') {
      if (isAlive) return
      setIsAlive(true)
      setIsDeathDateUnknown(false)
      setDeathYear('')
      setDeathMonth('')
      setDeathDay('')
      clearFieldError('death')
      markDirty()
      return
    }
    if (status === 'deceased') {
      if (!isAlive && !isDeathDateUnknown) return
      setIsAlive(false)
      setIsDeathDateUnknown(false)
      markDirty()
      if (!isEditMode && birthYear.trim() && !deathYear.trim()) {
        setTimeout(() => setShowDeathDateModal(true), 200)
      }
      return
    }
    // unknown
    if (!isAlive && isDeathDateUnknown) return
    setIsAlive(false)
    setIsDeathDateUnknown(true)
    setDeathYear('')
    setDeathMonth('')
    setDeathDay('')
    clearFieldError('death')
    markDirty()
  }

  /** 사망지를 출생지와 동일하게 빠르게 채움. */
  const handleCopyBirthToDeathPlace = () => {
    if (!birthPlace) return
    setDeathPlace(birthPlace)
    setDeathCityId(birthPlace.cityId ?? '')
    markDirty()
    toast.success('출생지를 사망지로 복사했습니다.')
  }

  const handleBirthDateSelect = (date: string) => {
    const { era, year, month, day } = parseDateString(date)
    const yStr = year.toString()
    const mStr = month.toString()
    const dStr = day.toString()
    setBirthEra(era)
    setBirthYear(yStr)
    setBirthMonth(mStr)
    setBirthDay(dStr)
    setShowBirthDateModal(false)
    markDirty()
    // 인라인 검증 — 새 출생일 + 기존 사망일 조합으로 즉시 피드백.
    const errs = computeBirthDeathErrors(
      { era, year: yStr, month: mStr, day: dStr, unknown: isBirthDateUnknown },
      {
        era: deathEra,
        year: deathYear,
        month: deathMonth,
        day: deathDay,
        unknown: isDeathDateUnknown,
        alive: isAlive,
      },
    )
    setOrClearError('birth', errs.birth)
    setOrClearError('death', errs.death)
    // 신규 등록 시에만 사망일 모달을 자동으로 띄움.
    if (!isDeathDateUnknown && !isAlive && !isEditMode && !deathYear.trim()) {
      setTimeout(() => setShowDeathDateModal(true), 200)
    }
  }

  const handleDeathDateSelect = (date: string) => {
    const { era, year, month, day } = parseDateString(date)
    const yStr = year.toString()
    const mStr = month.toString()
    const dStr = day.toString()
    setDeathEra(era)
    setDeathYear(yStr)
    setDeathMonth(mStr)
    setDeathDay(dStr)
    setShowDeathDateModal(false)
    markDirty()
    const errs = computeBirthDeathErrors(
      {
        era: birthEra,
        year: birthYear,
        month: birthMonth,
        day: birthDay,
        unknown: isBirthDateUnknown,
      },
      { era, year: yStr, month: mStr, day: dStr, unknown: isDeathDateUnknown, alive: isAlive },
    )
    setOrClearError('birth', errs.birth)
    setOrClearError('death', errs.death)
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

  /**
   * 출생/사망 검증 — 범위, 미래 차단, 사망>=출생 비교를 한 곳에 모음.
   * validate() submit 경로와 인라인(date select 직후) 경로가 공유.
   * 인자로 값을 받기 때문에 state setter 직후의 stale state 문제 없음.
   */
  const computeBirthDeathErrors = (
    birth: {
      era: Era
      year: string
      month: string
      day: string
      unknown: boolean
    },
    death: {
      era: Era
      year: string
      month: string
      day: string
      unknown: boolean
      alive: boolean
    },
  ): { birth?: string; death?: string } => {
    const errs: { birth?: string; death?: string } = {}
    const today = new Date()
    const todayVal =
      today.getFullYear() * 10000 +
      (today.getMonth() + 1) * 100 +
      today.getDate()

    // 출생 — 범위 + 미래 차단
    if (!birth.unknown && birth.year.trim()) {
      if (!isValidYear(birth.year)) {
        errs.birth = '출생 연도는 1~9999 범위의 정수여야 합니다.'
      } else if (birth.era === 'AD') {
        const by = parseInt(birth.year, 10)
        const bm = birth.month ? parseInt(birth.month, 10) : 1
        const bd = birth.day ? parseInt(birth.day, 10) : 1
        if (by * 10000 + bm * 100 + bd > todayVal) {
          errs.birth = '출생일은 오늘 이후일 수 없습니다.'
        }
      }
    }

    // 사망 — 범위 + 미래 차단 + 출생일과 비교
    if (!death.alive && !death.unknown && death.year.trim()) {
      if (!isValidYear(death.year)) {
        errs.death = '사망 연도는 1~9999 범위의 정수여야 합니다.'
      } else if (death.era === 'AD') {
        const dy = parseInt(death.year, 10)
        const dm = death.month ? parseInt(death.month, 10) : 1
        const dd = death.day ? parseInt(death.day, 10) : 1
        if (dy * 10000 + dm * 100 + dd > todayVal) {
          errs.death = '사망일은 오늘 이후일 수 없습니다.'
        }
      }
      // 비교 검증 — 둘 다 정상값일 때만
      if (
        !errs.birth &&
        !errs.death &&
        !birth.unknown &&
        birth.year.trim() &&
        isValidYear(birth.year)
      ) {
        const by = parseInt(birth.year, 10)
        const bm = birth.month ? parseInt(birth.month, 10) : 1
        const bd = birth.day ? parseInt(birth.day, 10) : 1
        const dy = parseInt(death.year, 10)
        const dm = death.month ? parseInt(death.month, 10) : 1
        const dd = death.day ? parseInt(death.day, 10) : 1
        const birthSign = birth.era === 'BC' ? -1 : 1
        const deathSign = death.era === 'BC' ? -1 : 1
        const birthVal = birthSign * (by * 10000 + bm * 100 + bd)
        const deathVal = deathSign * (dy * 10000 + dm * 100 + dd)
        if (deathVal < birthVal) {
          errs.death = '사망일은 출생일 이후여야 합니다.'
        }
      }
    }
    return errs
  }

  /** 단일 키 인라인 갱신 — true면 셋, false면 클리어. */
  const setOrClearError = (key: string, msg: string | undefined) => {
    setErrors((prev) => {
      const next = { ...prev }
      if (msg) next[key] = msg
      else delete next[key]
      return next
    })
  }

  /** 필수 텍스트 필드 onBlur — 빈 값이면 에러 노출. 입력 시작 시 onChange의 clearFieldError가 클리어. */
  const handleRequiredTextBlur = (
    key: 'name' | 'surname',
    value: string,
  ) => {
    if (!value.trim()) {
      const msg =
        key === 'name' ? '이름을 입력해주세요.' : '성을 입력해주세요.'
      setOrClearError(key, msg)
    }
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = '이름을 입력해주세요.'
    if (!surname.trim()) e.surname = '성을 입력해주세요.'
    if (!gender) e.gender = '성별을 선택해주세요.'
    if (!countryId) e.countryId = '소속(출생) 국가를 선택해주세요.'
    const dateErrs = computeBirthDeathErrors(
      {
        era: birthEra,
        year: birthYear,
        month: birthMonth,
        day: birthDay,
        unknown: isBirthDateUnknown,
      },
      {
        era: deathEra,
        year: deathYear,
        month: deathMonth,
        day: deathDay,
        unknown: isDeathDateUnknown,
        alive: isAlive,
      },
    )
    if (dateErrs.birth) e.birth = dateErrs.birth
    if (dateErrs.death) e.death = dateErrs.death
    setErrors(e)
    if (Object.keys(e).length > 0) {
      const basicFields = ['name', 'surname', 'gender'] as const
      const lifeFields = ['birth', 'death'] as const
      if (basicFields.some((k) => e[k])) setActiveTab('basic')
      else if (lifeFields.some((k) => e[k])) setActiveTab('life')
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
      // 생존중일 때는 사망 상세를 강제로 비움 — UI에서 숨겨도 state에 남아 있을 수 있어 명시 nullify.
      deathType: isAlive ? null : (deathType || null),
      deathCause: isAlive ? null : (deathCause.trim() || null),
      deathNote: isAlive ? null : (deathNote.trim() || null),
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
        if (registerAnother) {
          // 폼만 리셋 — 같은 국가에서 인물을 연속 등록하는 흐름.
          // 직전 등록 인물을 다음 회차의 가족 후보 칩에 노출. 로컬 인물 풀(persons)에도 추가.
          setRecentlyRegistered((prev) => {
            const without = prev.filter((p) => p.id !== created.id)
            return [created, ...without].slice(0, 5)
          })
          setPersons((prev) => {
            if (prev.some((p) => p.id === created.id)) return prev
            return [...prev, created]
          })
          setResetCounter((n) => n + 1)
        } else {
          onCancel()
        }
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
    key: 'basic' | 'life' | 'affiliation' | 'family',
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
          <HeaderSecondarySubmit
            type="submit"
            form="person-register-form"
            disabled={isSubmitting}
          >
            {submitButtonLabel}
          </HeaderSecondarySubmit>
        </FormHeader>
      )}
      {pendingDraftSavedAt && (
        <DraftBanner role="status">
          <span>
            임시 저장된 내용이 있습니다 · {formatRelativeTime(pendingDraftSavedAt)}
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
      {errors._form && (
        <TopAlert role="alert" $tone="error">
          <FiAlertCircle size={16} />
          <span>{errors._form}</span>
        </TopAlert>
      )}
      {loadFailed && (
        <NotFoundPanel role="alert">
          <NotFoundIcon>
            <FiAlertTriangle size={28} />
          </NotFoundIcon>
          <NotFoundTitle>인물을 불러오지 못했습니다</NotFoundTitle>
          <NotFoundDesc>
            요청한 인물이 삭제되었거나 권한이 없을 수 있습니다. 잠시 후
            다시 시도하거나 목록으로 돌아가 주세요.
          </NotFoundDesc>
          <SubmitButton type="button" onClick={onCancel}>
            목록으로
          </SubmitButton>
        </NotFoundPanel>
      )}
      <form
        id="person-register-form"
        onSubmit={handleSubmit}
        onChange={markDirty}
        onInput={markDirty}
        hidden={loadFailed}
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
                $active={activeTab === 'life'}
                onClick={() => setActiveTab('life')}
              >
                {tabLabel(<FiClock size={16} />, '생애', 'life')}
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
                      <ThumbnailHint
                        id="person-thumbnail-hint"
                        $accent={thumbnailDragOver}
                      >
                        {thumbnailDragOver
                          ? '여기에 놓아 업로드'
                          : '클릭하거나 이미지를 끌어 놓아 업로드. 클립보드 붙여넣기(Cmd/Ctrl+V)도 지원.'}
                        {pendingThumbnailFile && !thumbnailDragOver
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
                        onBlur={() =>
                          handleRequiredTextBlur('surname', surname)
                        }
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
                        onBlur={() => handleRequiredTextBlur('name', name)}
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

                {/* 약력 — 인물 정체성을 설명하는 본문. 기본 탭 마지막 영역. */}
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

                {/* 이름의 뜻 — 가끔 채워지는 정보. collapse로 숨겨 잡음 ↓ */}
                <AdvancedSection>
                  <AdvancedToggle
                    type="button"
                    $open={nameMeaningsOpen}
                    onClick={() => setNameMeaningsOpen((v) => !v)}
                    aria-expanded={nameMeaningsOpen}
                  >
                    <FiChevronRight size={14} />
                    이름의 뜻
                  </AdvancedToggle>
                  {nameMeaningsOpen && (
                    <AdvancedBody>
                      <FormRows>
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
                    </AdvancedBody>
                  )}
                </AdvancedSection>
              </FormRows>
            )}

            {activeTab === 'life' && (
              <LifeSection
                fid={fid}
                birthEra={birthEra}
                birthYear={birthYear}
                birthMonth={birthMonth}
                birthDay={birthDay}
                isBirthDateUnknown={isBirthDateUnknown}
                setIsBirthDateUnknown={setIsBirthDateUnknown}
                setShowBirthDateModal={setShowBirthDateModal}
                deathEra={deathEra}
                deathYear={deathYear}
                deathMonth={deathMonth}
                deathDay={deathDay}
                isAlive={isAlive}
                isDeathDateUnknown={isDeathDateUnknown}
                setShowDeathDateModal={setShowDeathDateModal}
                setDeathStatus={setDeathStatus}
                deathType={deathType}
                deathCause={deathCause}
                deathNote={deathNote}
                deathTypeShowMore={deathTypeShowMore}
                setDeathType={setDeathType}
                setDeathCause={setDeathCause}
                setDeathNote={setDeathNote}
                setDeathTypeShowMore={setDeathTypeShowMore}
                monarchTitlesOpen={monarchTitlesOpen}
                setMonarchTitlesOpen={setMonarchTitlesOpen}
                regnalName={regnalName}
                templeName={templeName}
                posthumousName={posthumousName}
                setRegnalName={setRegnalName}
                setTempleName={setTempleName}
                setPosthumousName={setPosthumousName}
                lifespanText={lifespanText}
                errors={errors}
                markDirty={markDirty}
              />
            )}

            {activeTab === 'affiliation' && (
              <AffiliationSection
                fid={fid}
                countryId={countryId}
                countryName={countryName}
                setShowCountryModal={setShowCountryModal}
                birthPlace={birthPlace}
                deathPlace={deathPlace}
                setBirthPlace={setBirthPlace}
                setDeathPlace={setDeathPlace}
                setBirthCityId={setBirthCityId}
                setDeathCityId={setDeathCityId}
                onCopyBirthToDeathPlace={handleCopyBirthToDeathPlace}
                dynastyLabel={dynastyLabel}
                religionLabel={religionLabel}
                setShowDynastyModal={setShowDynastyModal}
                setShowReligionModal={setShowReligionModal}
                errors={errors}
                markDirty={markDirty}
              />
            )}

            {activeTab === 'family' && (
              <FamilySection
                fid={fid}
                fatherId={fatherId}
                motherId={motherId}
                spouseId={spouseId}
                spouseNote={spouseNote}
                setFatherId={setFatherId}
                setMotherId={setMotherId}
                setSpouseId={setSpouseId}
                setSpouseNote={setSpouseNote}
                fatherPerson={fatherPerson}
                motherPerson={motherPerson}
                spousePerson={spousePerson}
                showFatherModal={showFatherModal}
                showMotherModal={showMotherModal}
                showSpouseModal={showSpouseModal}
                setShowFatherModal={setShowFatherModal}
                setShowMotherModal={setShowMotherModal}
                setShowSpouseModal={setShowSpouseModal}
                persons={persons}
                setPersons={setPersons}
                recentCandidates={recentCandidates}
                editPersonId={editPersonId}
                countryId={countryId}
                markDirty={markDirty}
              />
            )}

          </FormSectionInner>
        </LoadingHost>
      </form>

      {/* sticky footer — 긴 폼 끝에서도 저장 가능. 진행도는 라이브 프로그레스 바로. */}
      {!loadFailed && (
      <StickyFooter>
        {(() => {
          const pct = Math.round(
            (requiredProgress.filled / Math.max(1, requiredProgress.total)) *
              100,
          )
          const isComplete = requiredProgress.filled >= requiredProgress.total
          const tone: 'done' | 'warn' | 'info' = isComplete
            ? 'done'
            : isDirty
              ? 'warn'
              : 'info'
          const label = isComplete
            ? '필수 입력 완료'
            : `필수 ${requiredProgress.filled} / ${requiredProgress.total} 입력`
          const tip = draft.savedAt
            ? `임시 저장됨 ${formatRelativeTime(draft.savedAt)}`
            : isDirty
              ? '저장되지 않은 변경 사항이 있습니다.'
              : '모든 변경 사항이 저장되었습니다.'
          return (
            <FooterProgress
              role="status"
              aria-label={`${label} (${pct}%)`}
              title={tip}
            >
              <FooterProgressMeta $tone={tone}>
                <FooterProgressMetaLabel>{label}</FooterProgressMetaLabel>
                <FooterProgressMetaCount>{pct}%</FooterProgressMetaCount>
              </FooterProgressMeta>
              <FooterProgressTrack>
                <FooterProgressFill $pct={pct} $complete={isComplete} />
              </FooterProgressTrack>
            </FooterProgress>
          )
        })()}
        <FooterActions>
          {!isEditMode && (
            <RegisterAnotherLabel>
              <input
                type="checkbox"
                checked={registerAnother}
                onChange={(e) => setRegisterAnother(e.target.checked)}
                disabled={isSubmitting}
              />
              등록 후 폼 유지
            </RegisterAnotherLabel>
          )}
          <SubmitButton
            type="submit"
            form="person-register-form"
            disabled={isSubmitting}
          >
            {submitButtonLabel}
          </SubmitButton>
        </FooterActions>
      </StickyFooter>
      )}

      <CountrySelectModal
        isOpen={showCountryModal}
        onClose={() => setShowCountryModal(false)}
        onSelect={handleCountrySelect}
        modernCountries={modernCountries}
        historicalCountries={historicalCountries}
        title="소속 국가 선택"
        selectedCountryId={countryId || undefined}
      />
      <SelectModal<string>
        isOpen={showDynastyModal}
        onClose={() => setShowDynastyModal(false)}
        title="가문 선택"
        options={dynastySelectOptions}
        selectedValue={dynastyId}
        onSelect={(value) => {
          setDynastyId(value)
          setShowDynastyModal(false)
          markDirty()
        }}
        searchPlaceholder="가문 이름으로 검색…"
      />
      <SelectModal<string>
        isOpen={showReligionModal}
        onClose={() => setShowReligionModal(false)}
        title="종교 선택"
        options={religionSelectOptions}
        selectedValue={religionId}
        onSelect={(value) => {
          setReligionId(value)
          setShowReligionModal(false)
          markDirty()
        }}
        searchPlaceholder="종교 이름으로 검색…"
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
