/**
 * 행정부(역대 내각) — 행정조직 탭 내 "행정부" 서브탭에서 표시.
 * 수반 재임별 행정부 등록·조회, 각료 추가.
 * 정권 선택 시 아래에 중앙부처 스타일 그리드로 해당 정권의 부처별 각료 표시(전자: 카테고리만, 사용자 등록 부처).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { createPortal } from 'react-dom'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import {
  FiCalendar,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiEdit2,
  FiFileText,
  FiGlobe,
  FiInfo,
  FiLayers,
  FiLink,
  FiMapPin,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { administrationDepartmentApi } from '@/shared/api/administration-department'
import { type AdministrativeDivision, cityApi } from '@/shared/api/city'
import { getAllCountries } from '@/shared/api/countries'
import type { CountryResponseDto } from '@/shared/api/countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { personCareerApi } from '@/shared/api/person-career'
import { type PersonResponseDto, getAllPersons } from '@/shared/api/persons'
import { getPersonDetailById } from '@/shared/api/persons-detail'
import {
  TREATY_PARTICIPATION_LABELS,
  TREATY_TYPE_LABELS,
  type TreatyDto,
  type TreatyParticipationType,
  type TreatyType,
  treatyApi,
} from '@/shared/api/treaty'
import { getUploadImageUrl, uploadImage } from '@/shared/api/upload'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import {
  calcAgeAtTenure,
  formatPersonLifespan,
} from '@/shared/lib/tenure-person-utils'
import { glassCardMixin, scrollbarMixin } from '@/shared/styles/mixins'
import { useThemeStore } from '@/shared/styles/theme.store'
import { Z_INDEX } from '@/shared/styles/z-index'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog/confirm-dialog'
import { CountrySelectModal } from '@/shared/ui/country-select-modal/country-select-modal'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import { DateRangeField } from '@/shared/ui/form-fields/date-range-field'
import { PersonSelectField } from '@/shared/ui/form-fields/person-select-field'
import {
  ModalBody,
  ModalBox,
  ModalCloseButton,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
} from '@/shared/ui/modal/modal.styles'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import {
  DateFieldBtn,
  DateFieldsRow,
  FieldControl,
  FieldHint,
  FieldLabel,
  FieldRow,
  FormRows,
  FormSectionInner,
  Input as RegisterInput,
  Required,
  SubmitButton,
  TabButton,
  TabNavigation,
  Textarea,
} from '@/shared/ui/register-form-layout'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'
import { SelectModal } from '@/shared/ui/select-modal/select-modal'
import { SidePanel } from '@/shared/ui/side-panel'
import { PersonDetailPanel } from '@/widgets/person/person-detail-panel/person-detail-panel'

const MAIN = '#6366f1'
const MAIN_HOVER = '#4f46e5'
const HEAD_POSITION_TYPES = new Set(['HEAD_OF_STATE', 'HEAD_OF_GOVERNMENT'])
/** 각료 등록 시 선택 가능한 직위 타입 (수반·의원 등 제외) */
const MINISTER_POSITION_TYPES = new Set([
  'CABINET_MINISTER',
  'VICE_MINISTER',
  'OTHER',
])

/* 행정부 등록 모달 */
const CabinetModalBox = styled(ModalBox)`
  max-width: 920px;
  min-height: 520px;
  max-height: 90vh;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: cabinetModalUp 0.2s ease;
  @keyframes cabinetModalUp {
    from {
      transform: translateY(12px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`
const CabinetModalBody = styled(ModalBody)`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 24px 28px 28px;
`
const CabinetFormDesc = styled.div`
  margin: 0 0 20px;
  font-size: 14px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#666')};
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  svg {
    flex-shrink: 0;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#888')};
    margin-top: 2px;
  }
  strong {
    font-weight: 600;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#cbd5e1' : '#374151')};
  }
`
/** 탭: register-form-layout과 동일 (pill 20px, 배경 #f1f5f9, 활성 흰색+인디고) */
const CabinetTabWrap = styled.div`
  margin-bottom: 24px;
  & > div {
    width: fit-content;
  }
`
/** 기존 수반 선택: 카드형 섹션 */
const CabinetSelectSection = styled.div`
  flex: 1;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff'};
  border-radius: 16px;
  padding: 20px 24px 0;
  margin-bottom: 4px;
`
const CabinetSelectSectionTitle = styled.h3`
  margin: 0 0 14px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#cbd5e1' : '#374151')};
  letter-spacing: -0.01em;
`
const CabinetSearchWrap = styled.div`
  position: relative;
  margin-bottom: 16px;
  flex-shrink: 0;
`
const CabinetSearchIcon = styled.span`
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  display: flex;
  pointer-events: none;
`
const CabinetList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0 10px 0 0;
  flex: 1;
  min-height: 200px;
  max-height: 480px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f1f5f9'};
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.15)' : '#cbd5e1'};
    border-radius: 3px;
  }
`
const CabinetHeadTenureCard = styled.button`
  width: 100%;
  text-align: left;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  border-radius: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff'};
  cursor: pointer;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  gap: 0;
  align-items: center;
  min-height: 76px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
  &:hover:not(:disabled) {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#94a3b8'};
    box-shadow: ${({ theme }) =>
      theme.mode === 'dark'
        ? '0 2px 10px rgba(0,0,0,0.3)'
        : '0 2px 6px rgba(15,23,42,0.06)'};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#fafafa'};
  }
  &:focus-visible {
    outline: none;
    border-color: #64748b;
    box-shadow: 0 0 0 3px rgba(100, 116, 139, 0.15);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`
const CabinetHeadTenureCardMain = styled.div`
  grid-column: 1;
  grid-row: 1 / -1;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
  min-width: 0;
`
const CabinetHeadTenureCardBadge = styled.span`
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  padding: 4px 10px;
  border-radius: 8px;
  letter-spacing: 0.01em;
`
const CabinetHeadTenureCardName = styled.span`
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#111827')};
  line-height: 1.35;
`
const CabinetHeadTenureCardMeta = styled.span`
  font-size: 13px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#64748b')};
  line-height: 1.4;
`
const CabinetHeadTenureCardAction = styled.span`
  grid-column: 2;
  grid-row: 1 / -1;
  padding: 18px 20px 18px 16px;
  display: flex;
  align-items: center;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#64748b')};
  font-size: 13px;
  font-weight: 500;
  flex-shrink: 0;
  svg {
    margin-left: 4px;
    flex-shrink: 0;
  }
`
const CabinetActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f3f4f6'};
  flex-wrap: wrap;
`
const CabinetEmptyHint = styled.div`
  margin: 0;
  padding: 40px 28px;
  font-size: 14px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#64748b')};
  text-align: center;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff'};
  border-radius: 16px;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#cbd5e1'};
  line-height: 1.6;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  strong {
    font-weight: 600;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#e2e8f0' : '#0f172a')};
  }
  svg {
    color: #94a3b8;
    flex-shrink: 0;
    opacity: 0.9;
  }
`
/** 인물 등록 폼과 동일: 선택 트리거 버튼 (DateFieldBtn 스타일) */
const CabinetSelectTrigger = styled.button<{ $hasValue?: boolean }>`
  width: 100%;
  max-width: 360px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 16px;
  font-size: 14px;
  color: ${(p) =>
    p.$hasValue
      ? p.theme.mode === 'dark'
        ? '#f1f5f9'
        : '#111827'
      : p.theme.mode === 'dark'
        ? '#475569'
        : '#9ca3af'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  outline: none;
  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#64748b'};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#faf5ff'};
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#111827')};
  }
  &:focus-visible {
    border-color: #64748b;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
  span {
    flex: 1;
  }
  svg {
    flex-shrink: 0;
    color: #64748b;
  }
`

/** register-form-layout Input과 동일 스타일의 select */
const CabinetSelectNative = styled.select`
  width: 100%;
  max-width: 360px;
  padding: 12px 16px;
  font-size: 14px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#111827')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  border-radius: 12px;
  outline: none;
  box-sizing: border-box;
  &:focus {
    border-color: #64748b;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
  option {
    background: ${({ theme }) => (theme.mode === 'dark' ? '#1a1a1a' : '#fff')};
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#111827')};
  }
`

/** 인물 등록 모달과 동일: 날짜 선택 버튼 (SelectBtn 스타일 — 8px radius, 12px 14px, 15px) */
const CabinetDateTrigger = styled.button<{ $hasValue?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  font-size: 15px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  border-radius: 8px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
  color: ${(p) =>
    p.$hasValue
      ? p.theme.mode === 'dark'
        ? '#f1f5f9'
        : '#111'
      : p.theme.mode === 'dark'
        ? '#475569'
        : '#888'};
  cursor: pointer;
  text-align: left;
  outline: none;
  &:focus {
    outline: none;
    border-color: #64748b;
  }
  span {
    flex: 1;
  }
  svg {
    flex-shrink: 0;
    color: #64748b;
  }
`

/** 대수 입력용 작은 너비 */
const CabinetTermNumberWrap = styled.div`
  max-width: 120px;
  width: 100%;
`

/** 인물 선택·날짜 선택 모달이 행정부 모달 앞에 뜨도록 */
const CabinetSubModalLayer = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${Z_INDEX.MODAL_CONTENT + 2};
  pointer-events: none;
  & > * {
    pointer-events: auto;
  }
`

const EditingTextarea = styled.textarea`
  width: 100%;
  min-height: 80px;
  border: 1.5px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
  outline: none;
  resize: vertical;
  font-family: inherit;
  line-height: 1.6;
  transition: border-color 0.14s;
  box-sizing: border-box;
  &::placeholder {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#475569' : '#b0bac9')};
  }
  &:focus {
    border-color: #64748b;
  }
`

const CabinetCancelBtn = styled.button`
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#64748b')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  border-radius: 12px;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f9fafb'};
  }
`

// ─── 인포그래픽 타임라인 ───────────────────────────────────────────────────────
const TL_ROWS = [
  { line: '#6366f1', textColor: '#3730a3' },
  { line: '#f59e0b', textColor: '#78350f' },
  { line: '#10b981', textColor: '#065f46' },
  { line: '#e11d48', textColor: '#881337' },
]
const TL_ROW_SIZE = 4
const TL_ROW_H = 340 // 행 높이 고정
const TL_BUBBLE_W = 84 // 연도 버블 너비
const TL_THUMB = 72 // 썸네일 지름

function TlItem({
  thumbUrl,
  personName,
  posTitle,
  range,
  ageAtStart,
  birthPlace,
  lineColor,
  isDark,
}: {
  thumbUrl: string | null
  personName: string
  posTitle: string
  range: string
  ageAtStart: number | null
  birthPlace: string | null
  lineColor: string
  isDark: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {/* 원형 썸네일 */}
      <div
        style={{
          flexShrink: 0,
          width: TL_THUMB,
          height: TL_THUMB,
          borderRadius: '50%',
          overflow: 'hidden',
          background: `${lineColor}18`,
          border: `3px solid ${lineColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 3px 10px ${lineColor}44`,
        }}
      >
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={personName}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top',
            }}
          />
        ) : (
          <FiUser size={26} color={lineColor} style={{ opacity: 0.3 }} />
        )}
      </div>
      {/* 우측 텍스트 */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 14.5,
            fontWeight: 800,
            color: isDark ? '#f1f5f9' : '#0f172a',
            letterSpacing: '-0.02em',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {personName}
        </div>
        <div
          style={{
            fontSize: 12,
            color: lineColor,
            fontWeight: 600,
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {posTitle}
        </div>
        <div
          style={{
            marginTop: 5,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '3px 8px',
          }}
        >
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: lineColor,
              background: `${lineColor}12`,
              borderRadius: 5,
              padding: '2px 9px',
              whiteSpace: 'nowrap',
            }}
          >
            {range}
          </span>
          {ageAtStart != null && (
            <span
              style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8' }}
            >
              취임 {ageAtStart}세
            </span>
          )}
        </div>
        {birthPlace && (
          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              color: isDark ? '#475569' : '#b0bac9',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <span
              style={{ fontSize: 9.5, color: isDark ? '#475569' : '#c8d0da' }}
            >
              출신
            </span>
            {birthPlace}
          </div>
        )}
      </div>
    </div>
  )
}

function getPersonName(p: any): string {
  if (!p) return '—'
  return getPersonDisplayName(
    {
      name: p.name ?? '',
      surname: p.surname ?? null,
      middleName: p.middleName ?? null,
      nameDisplayOrder:
        (p.nameDisplayOrder as 'korean' | 'western') ?? 'korean',
    },
    true,
  )
}

/** 퇴임일 기준 나이 계산 (birthDate/birthYear 기반) */
function calcAgeAtEndTenure(
  person: any,
  tenureEndDate: string | null | undefined,
): number | null {
  if (!person || !tenureEndDate) return null
  const endYear = new Date(tenureEndDate).getFullYear()
  const endMonth = new Date(tenureEndDate).getMonth() + 1
  const endDay = new Date(tenureEndDate).getDate()

  if (person.birthDate) {
    const bd = new Date(person.birthDate)
    let age = endYear - bd.getFullYear()
    if (
      endMonth < bd.getMonth() + 1 ||
      (endMonth === bd.getMonth() + 1 && endDay < bd.getDate())
    )
      age -= 1
    return age >= 0 ? age : null
  }
  if (person.birthYear != null) {
    const age = endYear - person.birthYear
    return age >= 0 ? age : null
  }
  return null
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const APPOINTMENT_METHOD_LABEL: Record<string, string> = {
  DIRECT_ELECTION: '직접 선거',
  INDIRECT_ELECTION: '간접 선거',
  PARLIAMENTARY_ELECTION: '의회 선출',
  APPOINTMENT: '임명',
  HEREDITARY: '세습',
  COUP: '쿠데타 / 혁명',
  OTHER: '기타',
}

const END_REASON_LABEL: Record<string, string> = {
  TERM_COMPLETED: '임기 만료',
  RESIGNATION: '사임 / 사퇴',
  ABDICATION: '자진 퇴위',
  SUCCESSION_TRANSFER: '양위 / 선위',
  REMOVAL: '폐위 / 해임',
  IMPEACHMENT: '탄핵',
  DEATH_IN_OFFICE: '재임 중 사망',
  OVERTHROWN: '쿠데타 / 혁명으로 축출',
  WAR_DEFEAT: '전쟁 패배',
  STATE_DISSOLVED: '국가 멸망',
  OTHER: '기타',
}

/** 두 날짜 사이 재임기간을 "N년 M개월 D일" 형태로 반환 */
function calcTenureDuration(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string | null {
  if (!startDate) return null
  const s = new Date(startDate)
  const e = endDate ? new Date(endDate) : new Date()

  let years = e.getFullYear() - s.getFullYear()
  let months = e.getMonth() - s.getMonth()
  let days = e.getDate() - s.getDate()

  if (days < 0) {
    months -= 1
    const prevMonth = new Date(e.getFullYear(), e.getMonth(), 0)
    days += prevMonth.getDate()
  }
  if (months < 0) {
    years -= 1
    months += 12
  }

  const parts: string[] = []
  if (years > 0) parts.push(`${years}년`)
  if (months > 0) parts.push(`${months}개월`)
  if (days > 0 || parts.length === 0) parts.push(`${days}일`)
  return parts.join(' ')
}

export interface CabinetsSectionProps {
  country: UnifiedCountry
  /** 부처 등록 시 중앙부처 탭으로 전환하고 해당 카테고리로 폼 열기 */
  onOpenMinistriesTab?: (categoryId?: string) => void
}

export function CabinetsSection({
  country,
  onOpenMinistriesTab,
}: CabinetsSectionProps) {
  const queryClient = useQueryClient()
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'

  const C = {
    bg: isDark ? 'rgba(18,18,28,0.6)' : '#fff',
    bgSubtle: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
    bgMuted: isDark ? 'rgba(255,255,255,0.03)' : '#fafbfc',
    border: isDark ? 'rgba(255,255,255,0.08)' : '#f0f2f5',
    borderMid: isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb',
    text: isDark ? '#f1f5f9' : '#0f172a',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    textFaint: isDark ? '#475569' : '#94a3b8',
    accent: '#6366f1',
    accentBg: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff',
    accentBorder: isDark ? 'rgba(99,102,241,0.3)' : '#c7d2fe',
    btnBg: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
    btnHover: isDark ? 'rgba(255,255,255,0.08)' : '#f9fafb',
    avatarBg: isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9',
    avatarBorder: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
    badge: isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9',
    badgeBorder: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
    cardBg: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
    cardBgSelected: isDark ? 'rgba(99,102,241,0.12)' : '#eef2ff',
    cardBgHover: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
    divider: isDark ? 'rgba(255,255,255,0.06)' : '#f0f2f5',
    inputBg: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
    inputBorder: isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb',
    placeholderText: isDark ? '#475569' : '#b0bac9',
    iconColor: isDark ? '#64748b' : '#94a3b8',
    danger: '#e11d48',
    dangerBg: isDark ? 'rgba(225,29,72,0.15)' : '#fff0f3',
  } as const

  const isHistorical = country.type === 'historical'
  const countryId = !isHistorical ? country.id : undefined
  const historicalCountryId = isHistorical ? country.id : undefined

  /** 선택한 정권 — 위에 행정부처(중앙부처) 그리드로 해당 정권의 부처별 각료 표시 */
  const [selectedCabinetId, setSelectedCabinetId] = useState<string | null>(
    null,
  )
  /** 뷰 전환: list(행정부 그리드) / detail(행정부 상세) */
  const [cabinetView, setCabinetView] = useState<'list' | 'detail'>('list')
  const [addMinisterCabinet, setAddMinisterCabinet] = useState<any | null>(null)
  const [personSelectOpen, setPersonSelectOpen] = useState(false)
  const [ministerFormPositionDefId, setMinisterFormPositionDefId] = useState<
    string | null
  >(null)
  const [ministerFormTitle, setMinisterFormTitle] = useState('')
  const [ministerFormStartDate, setMinisterFormStartDate] = useState('')
  const [ministerFormEndDate, setMinisterFormEndDate] = useState('')
  const [ministerFormTermNumber, setMinisterFormTermNumber] = useState('')
  const [ministerFormDeptId, setMinisterFormDeptId] = useState<string | null>(
    null,
  )
  const [ministerFormSubmitting, setMinisterFormSubmitting] = useState(false)
  const [personPickerOpen, setPersonPickerOpen] = useState(false)
  const [selectedPersonIdForAdd, setSelectedPersonIdForAdd] = useState<
    string | null
  >(null)
  const [registerCabinetModalOpen, setRegisterCabinetModalOpen] =
    useState(false)
  const [registerCabinetSubmitting, setRegisterCabinetSubmitting] =
    useState(false)
  /** 'select' = 기존 수반 재임 선택, 'new' = 새 수반 등록(재임+행정부 한 번에) */
  const [registerFlow, setRegisterFlow] = useState<'select' | 'new'>('select')
  /** 현대국가에서 등록 시 하위 역사국가 선택 (null = 현대국가 자신에 등록) */
  const [
    registerTargetHistoricalCountryId,
    setRegisterTargetHistoricalCountryId,
  ] = useState<string | null>(null)
  const [newHeadPersonId, setNewHeadPersonId] = useState<string | null>(null)
  const [newHeadPositionDefId, setNewHeadPositionDefId] = useState<
    string | null
  >(null)
  const [newHeadStartDate, setNewHeadStartDate] = useState('')
  const [newHeadEndDate, setNewHeadEndDate] = useState('')
  /** 새 수반 등록 시 대수(제 N대). 빈 값이면 미전송, 숫자면 termNumber로 전송. 중간 등록 가능. */
  const [newHeadTermNumber, setNewHeadTermNumber] = useState('')
  /** 새 수반 등록 시 기수(1기, 2기). 같은 대수 내 복수 임기 구분. */
  const [newHeadSubTermNumber, setNewHeadSubTermNumber] = useState('')
  const [newCabinetName, setNewCabinetName] = useState('')
  const [newHeadAppointmentMethod, setNewHeadAppointmentMethod] =
    useState<string>('')
  const [newHeadEndReason, setNewHeadEndReason] = useState<string>('')
  const [newHeadEndReasonDetail, setNewHeadEndReasonDetail] = useState('')
  const [newHeadNotes, setNewHeadNotes] = useState('')
  const [deletingCabinetId, setDeletingCabinetId] = useState<string | null>(
    null,
  )
  /** 각료/수반 썸네일 클릭 시 인물 상세 모달 (포스트 상세와 동일한 mentionPersonId 패턴) */
  const [mentionPersonId, setMentionPersonId] = useState<string | null>(null)
  const { data: mentionPerson } = useQuery({
    queryKey: ['person-detail', mentionPersonId],
    queryFn: () => getPersonDetailById(mentionPersonId!),
    enabled: !!mentionPersonId,
  })
  const mentionPersonName = mentionPerson
    ? getPersonDisplayName(mentionPerson)
    : ''

  /** 히스토리 본문 클릭 — .mention/.entity-link 인물 클릭 시 인물 모달 표시 */
  const handleHistoryProseClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const personMentionEl = target.closest('.mention[data-type="person"]')
    const personLinkEl = target.closest(
      '.entity-link[data-entity-type="person"]',
    )
    const personEl = personMentionEl ?? personLinkEl
    if (personEl) {
      const id =
        personEl.getAttribute('data-id') ??
        personEl.getAttribute('data-entity-id')
      if (id) {
        e.preventDefault()
        setMentionPersonId(id)
      }
    }
  }, [])
  /** 행정부 수정 모달 (이름 + 수반 재임 대수/직위/취임·퇴임) */
  const [editingCabinet, setEditingCabinet] = useState<any | null>(null)
  const [editingCabinetName, setEditingCabinetName] = useState('')
  const [editingTermNumber, setEditingTermNumber] = useState('')
  const [editingSubTermNumber, setEditingSubTermNumber] = useState('')
  const [editingPositionDefId, setEditingPositionDefId] = useState<
    string | null
  >(null)
  const [editingStartDate, setEditingStartDate] = useState('')
  const [editingEndDate, setEditingEndDate] = useState('')
  const [editingAppointmentMethod, setEditingAppointmentMethod] =
    useState<string>('')
  const [editingEndReason, setEditingEndReason] = useState<string>('')
  const [editingEndReasonDetail, setEditingEndReasonDetail] = useState('')
  const [editingNotes, setEditingNotes] = useState('')
  /** 취임/퇴임 인라인 편집 모드 (수반 상세 뷰에서 그자리 수정) */
  const [editingTenureInfo, setEditingTenureInfo] = useState<{
    cabinetId: string
    mode: 'appointment' | 'end'
  } | null>(null)
  const [tenureInfoSubmitting, setTenureInfoSubmitting] = useState(false)
  /** 행정부 수정: 수반 재임의 소속 국가 변경 (현대국가인 경우 하위 역사국가 선택 가능) */
  const [
    editingTargetHistoricalCountryId,
    setEditingTargetHistoricalCountryId,
  ] = useState<string | null>(null)
  /** editingTargetHistoricalCountryId가 '현대국가 자신'인지 '역사국가'인지 — 'modern' | 'historical' */
  const [editingTargetType, setEditingTargetType] = useState<
    'modern' | 'historical'
  >('modern')
  const [editStartDatePickerOpen, setEditStartDatePickerOpen] = useState(false)
  const [editEndDatePickerOpen, setEditEndDatePickerOpen] = useState(false)
  const [updatingCabinetId, setUpdatingCabinetId] = useState<string | null>(
    null,
  )
  const [historyTargetTenureId, setHistoryTargetTenureId] = useState<
    string | null
  >(null)
  const [historyTitle, setHistoryTitle] = useState('')
  const [historyDescription, setHistoryDescription] = useState('')
  const [historyStartDate, setHistoryStartDate] = useState('')
  const [historyEndDate, setHistoryEndDate] = useState('')
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null)
  const [historySubmitting, setHistorySubmitting] = useState(false)
  const [cabinetSearchQuery, setCabinetSearchQuery] = useState('')
  /** 국가 필터: '' = 전체, countryId = 현대국가, historicalCountryId = 하위 역사국가 */
  const [cabinetCountryFilter, setCabinetCountryFilter] = useState<string>('')
  const [ministerSearchQuery, setMinisterSearchQuery] = useState('')
  const [selectedMinisterId, setSelectedMinisterId] = useState<string | null>(
    null,
  )
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(
    null,
  )
  const [editingHistoryContent, setEditingHistoryContent] = useState(false)
  const [historyDraftContent, setHistoryDraftContent] = useState('')
  const [historyContentSaving, setHistoryContentSaving] = useState(false)
  const [editingHistoryMeta, setEditingHistoryMeta] = useState(false)
  const [historyMetaTitle, setHistoryMetaTitle] = useState('')
  const [historyMetaStartDate, setHistoryMetaStartDate] = useState('')
  const [historyMetaEndDate, setHistoryMetaEndDate] = useState('')
  const [historyMetaSaving, setHistoryMetaSaving] = useState(false)

  // ── 조약 섹션 state ──
  const [cabinetTreaties, setCabinetTreaties] = useState<TreatyDto[]>([])
  const [loadingCabinetTreaties, setLoadingCabinetTreaties] = useState(false)
  const [selectedTreatyId, setSelectedTreatyId] = useState<string | null>(null)
  const [showTreatyLinkModal, setShowTreatyLinkModal] = useState(false)

  const { data: cabinets = [], isLoading: loadingCabinets } = useQuery({
    queryKey: ['cabinets-by-country', countryId, historicalCountryId],
    queryFn: () =>
      personCareerApi.getCabinets({
        countryId: countryId || undefined,
        historicalCountryId: historicalCountryId || undefined,
      }),
    enabled: !!countryId || !!historicalCountryId,
  })

  /** 행정부 리스트: 수반 취임일 기준 시간순(과거→현재) 정렬 */
  const sortedCabinets = useMemo(() => {
    const list = [...(cabinets as any[])]
    return list.sort((a, b) => {
      const dateA = a.headTenure?.startDate
        ? new Date(a.headTenure.startDate).getTime()
        : 0
      const dateB = b.headTenure?.startDate
        ? new Date(b.headTenure.startDate).getTime()
        : 0
      return dateA - dateB
    })
  }, [cabinets])

  const filteredCabinets = useMemo(() => {
    let list = sortedCabinets

    // 국가 필터
    if (cabinetCountryFilter) {
      list = list.filter((c: any) => {
        const head = c.headTenure
        if (cabinetCountryFilter === countryId) {
          return head?.countryId === countryId && !head?.historicalCountryId
        }
        return head?.historicalCountryId === cabinetCountryFilter
      })
    }

    const q = cabinetSearchQuery.trim().toLowerCase()
    if (!q) return list
    return list.filter((c: any) => {
      const head = c.headTenure
      const personName = head?.person ? getPersonName(head.person) : ''
      const posTitle =
        head?.positionDefinition?.title ?? head?.title ?? c.name ?? ''
      const start = head?.startDate
        ? new Date(head.startDate).getFullYear().toString()
        : ''
      const end = head?.endDate
        ? new Date(head.endDate).getFullYear().toString()
        : '현재'
      return [personName, posTitle, start, end].some((v) =>
        String(v).toLowerCase().includes(q),
      )
    })
  }, [sortedCabinets, cabinetSearchQuery, cabinetCountryFilter, countryId])

  const isMinisterMatched = (t: any) => {
    const q = ministerSearchQuery.trim().toLowerCase()
    if (!q) return true
    const personName = getPersonName(t.person)
    const title = t.positionDefinition?.title ?? t.title ?? ''
    const start = t.startDate ? formatDate(t.startDate) : ''
    const end = t.endDate ? formatDate(t.endDate) : '현재'
    return [personName, title, start, end].some((v) =>
      String(v).toLowerCase().includes(q),
    )
  }

  /** 각료 선택 모달: 인물 테이블 전체에서 선택 (재임 여부 무관) */
  const { data: personsForMinisterSelect = [] } = useQuery({
    queryKey: ['persons', 'all-for-minister'],
    queryFn: () => getAllPersons(),
    enabled: personSelectOpen,
  })

  /** 선택한 정권의 각료 — 부처 그리드에 채우기 위함 */
  const effectiveCountryIdForDept =
    country.type === 'historical' ? undefined : country.id
  const { data: selectedCabinetMinisters = [] } = useQuery({
    queryKey: ['cabinet-tenures', selectedCabinetId],
    queryFn: () =>
      selectedCabinetId
        ? personCareerApi.getTenuresByCabinetId(selectedCabinetId)
        : Promise.resolve([]),
    enabled: !!selectedCabinetId,
  })
  /** 카테고리·부처는 탭 진입 시 미리 로드 — 정권 클릭 시 곧바로 중앙부처 그리드 표시 */
  const { data: ministriesForCabinet = [] } = useQuery({
    queryKey: [
      'administration-departments-by-country',
      effectiveCountryIdForDept,
    ],
    queryFn: () =>
      effectiveCountryIdForDept
        ? administrationDepartmentApi.getByCountryId(effectiveCountryIdForDept)
        : Promise.resolve([]),
    enabled: !!effectiveCountryIdForDept,
  })

  const { data: countryTenures = [] } = useQuery({
    queryKey: [
      'tenures-by-country-for-cabinet',
      countryId,
      historicalCountryId,
    ],
    queryFn: () =>
      personCareerApi.getTenuresByCountry({
        countryId: countryId || undefined,
        historicalCountryId: historicalCountryId || undefined,
      }),
    enabled: (!!countryId || !!historicalCountryId) && registerCabinetModalOpen,
  })

  const { data: positionDefinitions = [] } = useQuery({
    queryKey: ['position-definitions-cabinet', countryId, historicalCountryId],
    queryFn: () =>
      personCareerApi.getPositionDefinitions({
        countryId: countryId || undefined,
        historicalCountryId: historicalCountryId || undefined,
      }),
    enabled:
      (!!countryId || !!historicalCountryId) &&
      (registerCabinetModalOpen ||
        !!editingCabinet ||
        personSelectOpen ||
        !!addMinisterCabinet),
  })

  const { data: allPersons = [] } = useQuery({
    queryKey: ['persons', 'all'],
    queryFn: () => getAllPersons(),
    enabled: registerCabinetModalOpen && registerFlow === 'new',
  })

  const headPositionOptions = (positionDefinitions as any[]).filter((d: any) =>
    HEAD_POSITION_TYPES.has(d.positionType),
  )

  /** 각료 등록 모달용 직위 옵션 (각료/차관/기타만) */
  const ministerPositionOptions = useMemo(
    () =>
      (positionDefinitions as any[]).filter(
        (d: any) =>
          d.positionType && MINISTER_POSITION_TYPES.has(d.positionType),
      ),
    [positionDefinitions],
  )

  /** 부처 선택 시 해당 부처 카테고리의 직위만 필터링, 미선택 시 전체 */
  const filteredMinisterPositionOptions = useMemo(() => {
    if (!ministerFormDeptId) return ministerPositionOptions
    const dept = (ministriesForCabinet as any[]).find(
      (d: any) => d.id === ministerFormDeptId,
    )
    const catId = dept?.categoryId ?? null
    if (!catId) return ministerPositionOptions
    return ministerPositionOptions.filter((d: any) => d.categoryId === catId)
  }, [ministerPositionOptions, ministerFormDeptId, ministriesForCabinet])

  /** 각료 등록 모달에서 선택한 인물 (썸네일·이름 표시용) */
  const selectedMinisterPerson = useMemo(
    () =>
      (personsForMinisterSelect as any[]).find(
        (p: any) => p.id === selectedPersonIdForAdd,
      ),
    [personsForMinisterSelect, selectedPersonIdForAdd],
  )

  const resetHistoryForm = () => {
    setHistoryTitle('')
    setHistoryDescription('')
    setHistoryStartDate('')
    setHistoryEndDate('')
    setEditingHistoryId(null)
  }

  const closeHistoryModal = () => {
    setHistoryTargetTenureId(null)
    resetHistoryForm()
  }

  const openMinisterHistoryModal = (tenure: any, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setHistoryTargetTenureId(tenure.id)
    resetHistoryForm()
  }

  const startEditHistory = (achievement: any) => {
    setEditingHistoryId(achievement.id)
    setHistoryTitle(achievement.title ?? '')
    setHistoryDescription(achievement.description ?? '')
    setHistoryStartDate(
      achievement.startDate ? String(achievement.startDate).slice(0, 10) : '',
    )
    setHistoryEndDate(
      achievement.endDate ? String(achievement.endDate).slice(0, 10) : '',
    )
  }

  const saveHistoryDescription = async (
    tenureId: string,
    achievementId: string,
    description: string,
  ) => {
    setHistoryContentSaving(true)
    try {
      await personCareerApi.updateTenureAchievement(tenureId, achievementId, {
        description: description.trim() || undefined,
      })
      queryClient.invalidateQueries({
        queryKey: ['cabinets-by-country', countryId, historicalCountryId],
      })
      queryClient.invalidateQueries({
        queryKey: ['cabinet-tenures', selectedCabinetId],
      })
      setEditingHistoryContent(false)
      setHistoryDraftContent('')
      toast.success('저장되었습니다.')
    } catch {
      toast.error('저장에 실패했습니다.')
    } finally {
      setHistoryContentSaving(false)
    }
  }

  const saveHistoryMeta = async (tenureId: string, achievementId: string) => {
    if (!historyMetaTitle.trim()) {
      toast.error('제목을 입력해 주세요.')
      return
    }
    setHistoryMetaSaving(true)
    try {
      await personCareerApi.updateTenureAchievement(tenureId, achievementId, {
        title: historyMetaTitle.trim(),
        startDate: historyMetaStartDate || undefined,
        endDate: historyMetaEndDate || undefined,
      })
      queryClient.invalidateQueries({
        queryKey: ['cabinets-by-country', countryId, historicalCountryId],
      })
      queryClient.invalidateQueries({
        queryKey: ['cabinet-tenures', selectedCabinetId],
      })
      setEditingHistoryMeta(false)
      toast.success('저장되었습니다.')
    } catch {
      toast.error('저장에 실패했습니다.')
    } finally {
      setHistoryMetaSaving(false)
    }
  }

  const submitMinisterHistory = async () => {
    if (!historyTargetTenure) return
    if (!historyTitle.trim()) {
      toast.error('히스토리 제목을 입력해 주세요.')
      return
    }

    setHistorySubmitting(true)
    try {
      const payload = {
        title: historyTitle.trim(),
        description: historyDescription.trim() || undefined,
        startDate: historyStartDate || undefined,
        endDate: historyEndDate || undefined,
        showOnEventsPage: false,
      }

      if (editingHistoryId) {
        await personCareerApi.updateTenureAchievement(
          historyTargetTenure.id,
          editingHistoryId,
          payload,
        )
        toast.success('히스토리가 수정되었습니다.')
      } else {
        await personCareerApi.createTenureAchievement(
          historyTargetTenure.id,
          payload,
        )
        toast.success('히스토리가 등록되었습니다.')
      }

      queryClient.invalidateQueries({
        queryKey: ['cabinet-tenures', selectedCabinetId],
      })
      queryClient.invalidateQueries({
        queryKey: ['cabinets-by-country', countryId, historicalCountryId],
      })
      resetHistoryForm()
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ??
          e?.message ??
          '히스토리 저장에 실패했습니다.',
      )
    } finally {
      setHistorySubmitting(false)
    }
  }

  const deleteMinisterHistory = async (achievementId: string) => {
    if (!historyTargetTenure) return
    if (!window.confirm('이 히스토리를 삭제하시겠습니까?')) return

    setHistorySubmitting(true)
    try {
      await personCareerApi.deleteTenureAchievement(
        historyTargetTenure.id,
        achievementId,
      )
      if (editingHistoryId === achievementId) resetHistoryForm()
      queryClient.invalidateQueries({
        queryKey: ['cabinet-tenures', selectedCabinetId],
      })
      toast.success('히스토리가 삭제되었습니다.')
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ??
          e?.message ??
          '히스토리 삭제에 실패했습니다.',
      )
    } finally {
      setHistorySubmitting(false)
    }
  }

  const handleAddMinister = (cabinet: any) => {
    setAddMinisterCabinet(cabinet)
    setPersonSelectOpen(true)
  }

  /** 각료 상세 뷰에서 직접 히스토리 삭제 */
  const deleteMinisterHistoryDirect = async (
    tenureId: string,
    achievementId: string,
  ) => {
    if (!window.confirm('이 히스토리를 삭제하시겠습니까?')) return
    try {
      await personCareerApi.deleteTenureAchievement(tenureId, achievementId)
      if (selectedHistoryId === achievementId) {
        setSelectedHistoryId(null)
        setEditingHistoryContent(false)
      }
      queryClient.invalidateQueries({
        queryKey: ['cabinet-tenures', selectedCabinetId],
      })
      toast.success('히스토리가 삭제되었습니다.')
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ??
          e?.message ??
          '히스토리 삭제에 실패했습니다.',
      )
    }
  }

  /** 인물 선택 시 같은 모달 안에서 직위·날짜 입력 단계로 (사이드바 없음) */
  const handleSelectPersonForMinister = (personId: string) => {
    setSelectedPersonIdForAdd(personId)
  }

  const handleChangePersonForMinister = () => {
    setSelectedPersonIdForAdd(null)
    setMinisterFormPositionDefId(null)
    setMinisterFormTitle('')
    setMinisterFormStartDate('')
    setMinisterFormEndDate('')
    setMinisterFormTermNumber('')
    setMinisterFormDeptId(null)
  }

  const handleSubmitMinister = async () => {
    if (!addMinisterCabinet || !selectedPersonIdForAdd) return
    const isOther =
      ministerFormPositionDefId === '__OTHER__' || !ministerFormPositionDefId
    const def = !isOther
      ? (positionDefinitions as any[]).find(
          (d: any) => d.id === ministerFormPositionDefId,
        )
      : null
    const titleValue = def?.title ?? ministerFormTitle.trim()
    if (!titleValue) {
      toast.error('직위를 선택하거나 직접 입력해 주세요.')
      return
    }
    if (!ministerFormStartDate.trim()) {
      toast.error('취임일을 입력해 주세요.')
      return
    }
    setMinisterFormSubmitting(true)
    try {
      const termNumParsed = ministerFormTermNumber.trim()
        ? parseInt(ministerFormTermNumber.trim(), 10)
        : undefined
      const termNumber =
        termNumParsed != null &&
        !Number.isNaN(termNumParsed) &&
        termNumParsed >= 1
          ? termNumParsed
          : undefined

      await personCareerApi.addGovernmentPositionTenure({
        personId: selectedPersonIdForAdd,
        positionType: (def as any)?.positionType ?? 'OTHER',
        positionDefinitionId:
          def?.id && ministerFormPositionDefId !== '__OTHER__'
            ? (ministerFormPositionDefId ?? undefined)
            : undefined,
        title: titleValue,
        countryId: addMinisterCabinet.countryId ?? undefined,
        historicalCountryId:
          addMinisterCabinet.historicalCountryId ?? undefined,
        cabinetId: addMinisterCabinet.id,
        startDate: ministerFormStartDate,
        endDate: ministerFormEndDate || undefined,
        termNumber,
      })
      toast.success('각료가 등록되었습니다.')
      setPersonSelectOpen(false)
      setAddMinisterCabinet(null)
      queryClient.invalidateQueries({
        queryKey: ['cabinets-by-country', countryId, historicalCountryId],
      })
      queryClient.invalidateQueries({ queryKey: ['cabinet-tenures'] })
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ?? e?.message ?? '등록에 실패했습니다.',
      )
    } finally {
      setMinisterFormSubmitting(false)
    }
  }

  const handleCloseMinisterModal = () => {
    setPersonSelectOpen(false)
    setAddMinisterCabinet(null)
    setMinisterFormPositionDefId(null)
    setMinisterFormTitle('')
    setMinisterFormStartDate('')
    setMinisterFormEndDate('')
    setMinisterFormTermNumber('')
    setMinisterFormDeptId(null)
    setSelectedPersonIdForAdd(null)
  }

  const headTenureIdsWithCabinet = new Set(
    (cabinets as any[]).map((c: any) => c.headTenureId),
  )
  const headTenuresForRegister = (countryTenures as any[]).filter(
    (t: any) =>
      (t.positionType === 'HEAD_OF_STATE' ||
        t.positionType === 'HEAD_OF_GOVERNMENT') &&
      !headTenureIdsWithCabinet.has(t.id),
  )

  const handleRegisterCabinet = async (tenure: any) => {
    setRegisterCabinetSubmitting(true)
    try {
      await personCareerApi.createCabinet({ headTenureId: tenure.id })
      toast.success('행정부가 등록되었습니다.')
      setRegisterCabinetModalOpen(false)
      setRegisterFlow('select')
      queryClient.invalidateQueries({
        queryKey: ['cabinets-by-country', countryId, historicalCountryId],
      })
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ?? e?.message ?? '등록에 실패했습니다.'
      toast.error(msg)
    } finally {
      setRegisterCabinetSubmitting(false)
    }
  }

  const resetNewHeadForm = useCallback(() => {
    setRegisterTargetHistoricalCountryId(null)
    setNewHeadPersonId(null)
    setNewHeadPositionDefId(null)
    setNewHeadStartDate('')
    setNewHeadEndDate('')
    setNewHeadTermNumber('')
    setNewHeadSubTermNumber('')
    setNewCabinetName('')
    setNewHeadAppointmentMethod('')
    setNewHeadEndReason('')
    setNewHeadEndReasonDetail('')
    setNewHeadNotes('')
  }, [])

  /** 새 수반 재임 생성 후 행정부까지 한 번에 등록 */
  const handleRegisterNewHeadAndCabinet = async () => {
    if (!newHeadPersonId || !newHeadPositionDefId || !newHeadStartDate.trim()) {
      toast.error('인물, 직위, 취임일을 입력해주세요.')
      return
    }
    const def = headPositionOptions.find(
      (d: any) => d.id === newHeadPositionDefId,
    )
    if (!def) {
      toast.error('직위를 선택해주세요.')
      return
    }
    const termNumParsed = newHeadTermNumber.trim()
      ? parseInt(newHeadTermNumber.trim(), 10)
      : undefined
    const termNumber =
      termNumParsed != null &&
      !Number.isNaN(termNumParsed) &&
      termNumParsed >= 1
        ? termNumParsed
        : undefined
    const subTermNumParsed = newHeadSubTermNumber.trim()
      ? parseInt(newHeadSubTermNumber.trim(), 10)
      : undefined
    const subTermNumber =
      subTermNumParsed != null &&
      !Number.isNaN(subTermNumParsed) &&
      subTermNumParsed >= 1
        ? subTermNumParsed
        : undefined

    setRegisterCabinetSubmitting(true)
    try {
      // 현대국가에서 하위 역사국가를 선택한 경우 해당 historicalCountryId로 등록
      const effectiveCountryId =
        !isHistorical && !registerTargetHistoricalCountryId
          ? countryId
          : undefined
      const effectiveHistoricalCountryId =
        registerTargetHistoricalCountryId ?? historicalCountryId ?? undefined
      const tenure = await personCareerApi.addGovernmentPositionTenure({
        personId: newHeadPersonId,
        positionType: def.positionType,
        title: def.title,
        positionDefinitionId: def.id,
        countryId: effectiveCountryId,
        historicalCountryId: effectiveHistoricalCountryId,
        termNumber,
        subTermNumber,
        startDate: newHeadStartDate.trim(),
        endDate: newHeadEndDate.trim() || undefined,
        appointmentMethod: (newHeadAppointmentMethod || undefined) as any,
        endReason: (newHeadEndReason || undefined) as any,
        endReasonDetail: newHeadEndReasonDetail.trim() || undefined,
        notes: newHeadNotes.trim() || undefined,
      })
      const created = tenure as { id: string }
      await personCareerApi.createCabinet({
        headTenureId: created.id,
        name: newCabinetName.trim() || null,
      })
      toast.success('수반 재임과 행정부가 등록되었습니다.')
      setRegisterCabinetModalOpen(false)
      setRegisterFlow('select')
      resetNewHeadForm()
      queryClient.invalidateQueries({
        queryKey: ['cabinets-by-country', countryId, historicalCountryId],
      })
      queryClient.invalidateQueries({
        queryKey: [
          'tenures-by-country-for-cabinet',
          countryId,
          historicalCountryId,
        ],
      })
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ?? e?.message ?? '등록에 실패했습니다.'
      toast.error(msg)
    } finally {
      setRegisterCabinetSubmitting(false)
    }
  }

  const handleDeleteCabinet = async (
    cabinetId: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation()
    if (
      !window.confirm(
        '이 행정부와 수반 재임, 소속 각료 재임을 모두 삭제합니다. 계속할까요?',
      )
    )
      return
    setDeletingCabinetId(cabinetId)
    try {
      await personCareerApi.deleteCabinet(cabinetId)
      toast.success('행정부가 삭제되었습니다.')
      if (selectedCabinetId === cabinetId) {
        setSelectedCabinetId(null)
        setCabinetView('list')
      }
      queryClient.invalidateQueries({
        queryKey: ['cabinets-by-country', countryId, historicalCountryId],
      })
      queryClient.invalidateQueries({
        queryKey: [
          'tenures-by-country-for-cabinet',
          countryId,
          historicalCountryId,
        ],
      })
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ?? err?.message ?? '삭제에 실패했습니다.',
      )
    } finally {
      setDeletingCabinetId(null)
    }
  }

  const handleOpenEditCabinet = (c: any, e: React.MouseEvent) => {
    e.stopPropagation()
    const head = c.headTenure
    setEditingCabinet(c)
    setEditingCabinetName(c.name ?? '')
    setEditingTermNumber(
      head?.termNumber != null ? String(head.termNumber) : '',
    )
    setEditingSubTermNumber(
      head?.subTermNumber != null ? String(head.subTermNumber) : '',
    )
    setEditingPositionDefId(
      head?.positionDefinitionId ?? head?.positionDefinition?.id ?? null,
    )
    setEditingStartDate(
      head?.startDate
        ? typeof head.startDate === 'string'
          ? head.startDate.slice(0, 10)
          : new Date(head.startDate).toISOString().slice(0, 10)
        : '',
    )
    setEditingEndDate(
      head?.endDate
        ? typeof head.endDate === 'string'
          ? head.endDate.slice(0, 10)
          : new Date(head.endDate).toISOString().slice(0, 10)
        : '',
    )
    setEditingAppointmentMethod(head?.appointmentMethod ?? '')
    setEditingEndReason(head?.endReason ?? '')
    setEditingEndReasonDetail(head?.endReasonDetail ?? '')
    setEditingNotes(head?.notes ?? '')
    // 수반 재임의 현재 소속 국가 초기화
    if (head?.historicalCountryId) {
      setEditingTargetType('historical')
      setEditingTargetHistoricalCountryId(head.historicalCountryId)
    } else {
      setEditingTargetType('modern')
      setEditingTargetHistoricalCountryId(null)
    }
  }

  const closeEditCabinetModal = () => {
    setEditingCabinet(null)
    setEditingCabinetName('')
    setEditingTermNumber('')
    setEditingSubTermNumber('')
    setEditingStartDate('')
    setEditingEndDate('')
    setEditingAppointmentMethod('')
    setEditingEndReason('')
    setEditingEndReasonDetail('')
    setEditingNotes('')
    setEditingTargetType('modern')
    setEditingTargetHistoricalCountryId(null)
  }

  const handleSaveTenureInfoInline = async (
    cabinetId: string,
    headTenureId: string,
  ) => {
    setTenureInfoSubmitting(true)
    const mode = editingTenureInfo?.mode
    try {
      await personCareerApi.updateGovernmentPositionTenure(headTenureId, {
        ...(mode === 'appointment'
          ? {
              appointmentMethod: (editingAppointmentMethod || undefined) as any,
              notes: editingNotes.trim() || undefined,
            }
          : {
              endReason: (editingEndReason || undefined) as any,
              endReasonDetail: editingEndReasonDetail.trim() || undefined,
            }),
      })
      toast.success('저장되었습니다.')
      setEditingTenureInfo(null)
      queryClient.invalidateQueries({
        queryKey: ['cabinets-by-country', countryId, historicalCountryId],
      })
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ?? err?.message ?? '저장에 실패했습니다.',
      )
    } finally {
      setTenureInfoSubmitting(false)
    }
  }

  const handleUpdateCabinet = async () => {
    if (!editingCabinet) return
    const cabinetId = editingCabinet.id
    const headTenureId = editingCabinet.headTenure?.id
    if (!headTenureId) {
      toast.error('수반 재임 정보가 없습니다.')
      return
    }
    setUpdatingCabinetId(cabinetId)
    try {
      const termNumParsed = editingTermNumber.trim()
        ? parseInt(editingTermNumber.trim(), 10)
        : undefined
      const termNumber =
        termNumParsed != null &&
        !Number.isNaN(termNumParsed) &&
        termNumParsed >= 1
          ? termNumParsed
          : undefined
      const subTermNumParsed = editingSubTermNumber.trim()
        ? parseInt(editingSubTermNumber.trim(), 10)
        : undefined
      const subTermNumber =
        subTermNumParsed != null &&
        !Number.isNaN(subTermNumParsed) &&
        subTermNumParsed >= 1
          ? subTermNumParsed
          : undefined

      await personCareerApi.updateCabinet(cabinetId, {
        name: editingCabinetName.trim() || null,
      })
      // 현대국가에서 하위 역사국가로/현대국가로 소속 변경
      const newCountryId =
        editingTargetType === 'modern' && !isHistorical ? countryId : null
      const newHistoricalCountryId =
        editingTargetType === 'historical'
          ? (editingTargetHistoricalCountryId ??
            historicalCountryId ??
            undefined)
          : isHistorical
            ? historicalCountryId
            : undefined
      await personCareerApi.updateGovernmentPositionTenure(headTenureId, {
        termNumber,
        subTermNumber,
        positionDefinitionId: editingPositionDefId || undefined,
        startDate: editingStartDate.trim() || undefined,
        endDate: editingEndDate.trim() || undefined,
        appointmentMethod: (editingAppointmentMethod || undefined) as any,
        endReason: (editingEndReason || undefined) as any,
        endReasonDetail: editingEndReasonDetail.trim() || undefined,
        notes: editingNotes.trim() || undefined,
        countryId: newCountryId ?? undefined,
        historicalCountryId: newHistoricalCountryId ?? undefined,
      })
      toast.success('행정부가 수정되었습니다.')
      closeEditCabinetModal()
      queryClient.invalidateQueries({
        queryKey: ['cabinets-by-country', countryId, historicalCountryId],
      })
      queryClient.invalidateQueries({
        queryKey: [
          'tenures-by-country-for-cabinet',
          countryId,
          historicalCountryId,
        ],
      })
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ?? err?.message ?? '수정에 실패했습니다.',
      )
    } finally {
      setUpdatingCabinetId(null)
    }
  }

  useEffect(() => {
    if (!personSelectOpen) {
      setSelectedPersonIdForAdd(null)
      setMinisterFormPositionDefId(null)
      setMinisterFormTitle('')
      setMinisterFormStartDate('')
      setMinisterFormEndDate('')
      setMinisterFormTermNumber('')
      setPersonPickerOpen(false)
    }
  }, [personSelectOpen])

  useEffect(() => {
    setMinisterSearchQuery('')
    setSelectedMinisterId(null)
    setSelectedHistoryId(null)
    setSelectedTreatyId(null)
  }, [selectedCabinetId])

  // 행정부 선택 시 조약 로드
  useEffect(() => {
    if (!selectedCabinetId) {
      setCabinetTreaties([])
      return
    }
    setLoadingCabinetTreaties(true)
    treatyApi
      .getAll({ cabinetId: selectedCabinetId })
      .then((r) => setCabinetTreaties(r.items))
      .catch(() => setCabinetTreaties([]))
      .finally(() => setLoadingCabinetTreaties(false))
  }, [selectedCabinetId])

  const selectedCabinet = (cabinets as any[]).find(
    (c: any) => c.id === selectedCabinetId,
  )
  const hasSelectedCabinet = Boolean(selectedCabinetId && selectedCabinet)

  const historyTargetTenure = useMemo(() => {
    if (!historyTargetTenureId) return null
    const fromMinisters = (selectedCabinetMinisters as any[]).find(
      (t: any) => t.id === historyTargetTenureId,
    )
    if (fromMinisters) return fromMinisters
    const head = selectedCabinet?.headTenure
    if (head?.id === historyTargetTenureId) return head
    return null
  }, [selectedCabinetMinisters, selectedCabinet, historyTargetTenureId])

  useEffect(() => {
    if (historyTargetTenureId && !historyTargetTenure) {
      closeHistoryModal()
    }
  }, [historyTargetTenureId, historyTargetTenure])

  const visibleSelectedCabinetMinisters = (
    selectedCabinetMinisters as any[]
  ).filter((t: any) => isMinisterMatched(t))
  const sortedVisibleMinisters = useMemo(
    () =>
      [...visibleSelectedCabinetMinisters].sort((a: any, b: any) => {
        const aTime = a?.startDate ? new Date(a.startDate).getTime() : 0
        const bTime = b?.startDate ? new Date(b.startDate).getTime() : 0
        return bTime - aTime
      }),
    [visibleSelectedCabinetMinisters],
  )
  const getMinisterDepartmentName = (t: any) => {
    const depId = t?.positionDefinition?.administrationDepartmentId
    if (!depId) return '미연결'
    const dep = (ministriesForCabinet as any[]).find((d: any) => d.id === depId)
    return dep?.name ?? '미연결'
  }
  if (loadingCabinets) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 200,
          color: '#64748b',
          fontSize: 14,
        }}
      >
        불러오는 중…
      </div>
    )
  }

  return (
    <CabinetsSectionRoot>
      {/* ── 포스트 상세 패턴: list view(카드 그리드) / detail view(행정부 상세) ── */}
      <AnimatePresence mode="wait" initial={false}>
        {cabinetView === 'list' ? (
          <motion.div
            key="cab-list-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ padding: '0' }}
          >
            {/* ── 툴바: 국가 필터 + 검색 + 등록 ── */}
            <div
              style={{
                padding: '14px 20px 0',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {/* 국가 필터 탭 */}
              {country.type === 'modern' &&
                Array.isArray(country.historicalCountries) &&
                country.historicalCountries.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      flexWrap: 'wrap',
                    }}
                  >
                    {[
                      { id: '', label: '전체' },
                      { id: countryId ?? '', label: country.name },
                      ...country.historicalCountries.map((hc) => ({
                        id: hc.id,
                        label: hc.name,
                      })),
                    ].map((tab) => {
                      const active = cabinetCountryFilter === tab.id
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setCabinetCountryFilter(tab.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 14px',
                            fontSize: 12.5,
                            fontWeight: active ? 700 : 500,
                            color: active
                              ? '#fff'
                              : isDark
                                ? '#94a3b8'
                                : '#64748b',
                            background: active
                              ? '#6366f1'
                              : isDark
                                ? 'rgba(255,255,255,0.06)'
                                : '#f8fafc',
                            border: `1.5px solid ${active ? '#6366f1' : isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'}`,
                            borderRadius: 20,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.13s',
                            boxShadow: active ? '0 2px 8px #6366f144' : 'none',
                          }}
                          onMouseEnter={(e) => {
                            if (!active) {
                              ;(
                                e.currentTarget as HTMLButtonElement
                              ).style.borderColor = isDark
                                ? 'rgba(165,180,252,0.4)'
                                : '#a5b4fc'
                              ;(
                                e.currentTarget as HTMLButtonElement
                              ).style.color = isDark ? '#a5b4fc' : '#4f46e5'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!active) {
                              ;(
                                e.currentTarget as HTMLButtonElement
                              ).style.borderColor = isDark
                                ? 'rgba(255,255,255,0.12)'
                                : '#e2e8f0'
                              ;(
                                e.currentTarget as HTMLButtonElement
                              ).style.color = isDark ? '#94a3b8' : '#64748b'
                            }
                          }}
                        >
                          {tab.label}
                        </button>
                      )
                    })}
                  </div>
                )}

              {/* 검색창 + 등록 버튼 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  paddingBottom: 14,
                  borderBottom: '1px solid #f0f2f7',
                }}
              >
                {/* 검색창 */}
                <div style={{ position: 'relative', flex: 1 }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#b0bac9',
                      display: 'flex',
                      pointerEvents: 'none',
                    }}
                  >
                    <FiSearch size={15} />
                  </span>
                  <input
                    type="text"
                    placeholder="수반명, 직위, 연도 검색"
                    value={cabinetSearchQuery}
                    onChange={(e) => setCabinetSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      height: 40,
                      border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`,
                      borderRadius: 10,
                      padding: '0 36px 0 38px',
                      fontSize: 13,
                      color: C.text,
                      background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.14s, background 0.14s',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = isDark
                        ? 'rgba(99,102,241,0.6)'
                        : '#a5b4fc'
                      e.currentTarget.style.background = isDark
                        ? 'rgba(255,255,255,0.08)'
                        : '#fff'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = isDark
                        ? 'rgba(255,255,255,0.12)'
                        : '#e5e7eb'
                      e.currentTarget.style.background = isDark
                        ? 'rgba(255,255,255,0.06)'
                        : '#f8fafc'
                    }}
                  />
                  {/* 건수 or 클리어 */}
                  {cabinetSearchQuery.trim() ? (
                    <button
                      type="button"
                      onClick={() => setCabinetSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 22,
                        height: 22,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: '#b0bac9',
                        borderRadius: 5,
                      }}
                      onMouseEnter={(e) => {
                        ;(
                          e.currentTarget as HTMLButtonElement
                        ).style.background = isDark
                          ? 'rgba(255,255,255,0.08)'
                          : '#f1f5f9'
                        ;(e.currentTarget as HTMLButtonElement).style.color =
                          isDark ? '#e2e8f0' : '#475569'
                      }}
                      onMouseLeave={(e) => {
                        ;(
                          e.currentTarget as HTMLButtonElement
                        ).style.background = 'transparent'
                        ;(e.currentTarget as HTMLButtonElement).style.color =
                          '#b0bac9'
                      }}
                    >
                      <FiX size={13} />
                    </button>
                  ) : (
                    <span
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: '#c8d0da',
                        pointerEvents: 'none',
                      }}
                    >
                      {filteredCabinets.length > 0
                        ? `${filteredCabinets.length}개`
                        : ''}
                    </span>
                  )}
                </div>

                {/* 정렬 표시 (간단) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11.5,
                    color: '#94a3b8',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  <FiClock size={13} />
                  최신순
                </div>

                {/* 등록 버튼 */}
                <button
                  type="button"
                  onClick={() => {
                    setRegisterFlow('new')
                    setRegisterCabinetModalOpen(true)
                  }}
                  style={{
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '0 16px',
                    height: 40,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#fff',
                    background: MAIN,
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px #6366f133',
                    transition: 'background 0.13s, box-shadow 0.13s',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.background =
                      '#4f46e5'
                    ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                      '0 4px 12px #6366f155'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.background =
                      '#6366f1'
                    ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                      '0 2px 8px #6366f133'
                  }}
                >
                  <FiPlus size={14} />
                  행정부 등록
                </button>
              </div>
            </div>
            {filteredCabinets.length === 0 ? (
              <CabinetEmptyState>
                {cabinetSearchQuery.trim() || cabinetCountryFilter ? (
                  <>
                    <CabinetEmptyIconWrap>
                      <FiSearch size={28} />
                    </CabinetEmptyIconWrap>
                    <CabinetEmptyTitle>검색 결과가 없습니다</CabinetEmptyTitle>
                    <CabinetEmptyDesc>
                      다른 검색어나 필터를 사용해 보세요.
                    </CabinetEmptyDesc>
                    <CabRegisterBtn
                      type="button"
                      onClick={() => {
                        setCabinetSearchQuery('')
                        setCabinetCountryFilter('')
                      }}
                    >
                      <FiX size={14} />
                      필터 초기화
                    </CabRegisterBtn>
                  </>
                ) : (
                  <>
                    <CabinetEmptyIconWrap>
                      <FiUsers size={28} />
                    </CabinetEmptyIconWrap>
                    <CabinetEmptyTitle>
                      등록된 행정부가 없습니다
                    </CabinetEmptyTitle>
                    <CabinetEmptyDesc>
                      행정부는 수반(국가원수·정부수반)의 재임 기록을 기반으로
                      생성됩니다.
                    </CabinetEmptyDesc>
                    <CabinetEmptyDesc
                      style={{
                        marginTop: -4,
                        fontSize: 12.5,
                        color: isDark ? '#64748b' : '#94a3b8',
                      }}
                    >
                      역대 수반이 이미 등록돼 있다면{' '}
                      <strong style={{ color: MAIN }}>기존 수반 선택</strong>{' '}
                      으로, 처음이라면{' '}
                      <strong style={{ color: MAIN }}>새 수반 등록</strong>
                      으로 행정부를 만드세요.
                    </CabinetEmptyDesc>
                    <div
                      style={{
                        display: 'flex',
                        gap: 10,
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        marginTop: 4,
                      }}
                    >
                      <CabRegisterBtn
                        type="button"
                        onClick={() => {
                          setRegisterFlow('select')
                          setRegisterCabinetModalOpen(true)
                        }}
                      >
                        <FiUsers size={14} />
                        기존 수반으로 등록
                      </CabRegisterBtn>
                      <CabRegisterBtn
                        type="button"
                        onClick={() => {
                          setRegisterFlow('new')
                          setRegisterCabinetModalOpen(true)
                        }}
                        style={{
                          background: isDark
                            ? 'rgba(99,102,241,0.18)'
                            : '#eef2ff',
                          borderColor: isDark
                            ? 'rgba(99,102,241,0.4)'
                            : '#c7d2fe',
                        }}
                      >
                        <FiPlus size={14} />새 수반과 함께 등록
                      </CabRegisterBtn>
                    </div>
                  </>
                )}
              </CabinetEmptyState>
            ) : (
              <div style={{ padding: '0 0 32px' }}>
                {/* 타임라인 요약 헤더 */}
                {(() => {
                  const items = filteredCabinets as any[]
                  const years = items.flatMap((c) => {
                    const s = c.headTenure?.startDate
                      ? new Date(c.headTenure.startDate).getFullYear()
                      : null
                    return s ? [s] : []
                  })
                  const minY = years.length ? Math.min(...years) : null
                  const maxY = years.length ? Math.max(...years) : null
                  return (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '36px 24px',
                        borderBottom: `1px solid ${C.border}`,
                        background: 'transparent',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <FiUsers size={13} color="#94a3b8" />
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: C.text,
                          }}
                        >
                          {items.length}개 행정부
                        </span>
                      </div>
                      {minY && (
                        <>
                          <div
                            style={{
                              width: 1,
                              height: 12,
                              background: C.borderMid,
                            }}
                          />
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <FiCalendar size={12} color="#94a3b8" />
                            <span style={{ fontSize: 12, color: C.textMuted }}>
                              {minY} – {maxY ?? '현재'}
                            </span>
                          </div>
                        </>
                      )}
                      <div style={{ flex: 1 }} />
                      <div style={{ display: 'flex', gap: 4 }}>
                        {TL_ROWS.map((r, i) => (
                          <div
                            key={i}
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: r.line,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })()}
                {(() => {
                  const items = filteredCabinets as any[]
                  const rows: any[][] = []
                  for (let i = 0; i < items.length; i += TL_ROW_SIZE) {
                    rows.push(items.slice(i, i + TL_ROW_SIZE))
                  }

                  return rows.map((rowItems, rowIdx) => {
                    const p = TL_ROWS[rowIdx % TL_ROWS.length]
                    const isReversed = rowIdx % 2 === 1
                    const displayItems = isReversed
                      ? [...rowItems].reverse()
                      : rowItems
                    // 노드 중앙 X = 패딩(20) + 버블너비/2
                    const NODE_X = 20 + TL_BUBBLE_W / 2

                    return (
                      <div
                        key={rowIdx}
                        style={{
                          background: 'transparent',
                          borderBottom:
                            rowIdx < rows.length - 1
                              ? `1px solid ${C.border}`
                              : 'none',
                        }}
                      >
                        {/* 행 레이블 */}
                        {(() => {
                          const firstHead = rowItems[0]?.headTenure
                          const lastHead =
                            rowItems[rowItems.length - 1]?.headTenure
                          const firstTerm =
                            firstHead?.termNumber ?? firstHead?.regnalNumber
                          const lastTerm =
                            lastHead?.termNumber ?? lastHead?.regnalNumber
                          // 기수 포함 레이블 생성
                          const termLabel = (t: number, sub?: number | null) =>
                            sub != null ? `제${t}대 ${sub}기` : `제${t}대`
                          const rangeLabel =
                            firstTerm != null && lastTerm != null
                              ? firstTerm === lastTerm
                                ? termLabel(firstTerm, firstHead?.subTermNumber)
                                : `제${firstTerm}–${lastTerm}대`
                              : `${rowIdx * TL_ROW_SIZE + 1}번째 행`
                          return (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '10px 24px 0',
                              }}
                            >
                              <div
                                style={{
                                  width: 4,
                                  height: 16,
                                  borderRadius: 2,
                                  background: p.line,
                                  flexShrink: 0,
                                }}
                              />
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: p.line,
                                  letterSpacing: '0.04em',
                                }}
                              >
                                {rangeLabel}
                              </span>
                              <div
                                style={{
                                  flex: 1,
                                  height: 1,
                                  background: `linear-gradient(90deg, ${p.line}33, transparent)`,
                                }}
                              />
                              <span
                                style={{ fontSize: 10.5, color: '#c8d0da' }}
                              >
                                {rowItems.length}명
                              </span>
                            </div>
                          )
                        })()}
                        <div
                          style={{
                            position: 'relative',
                            height: TL_ROW_H,
                            padding: '0 20px',
                          }}
                        >
                          {/* 수평선 — 노드 X 기준으로 좌측 시작 */}
                          <div
                            style={{
                              position: 'absolute',
                              left: NODE_X,
                              right: 0,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              height: 3,
                              background: `linear-gradient(90deg, ${p.line}cc, ${p.line}33)`,
                              zIndex: 0,
                            }}
                          />

                          {/* 아이템 그리드 */}
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: `repeat(${TL_ROW_SIZE}, 1fr)`,
                              height: '100%',
                              gap: '0 8px',
                              position: 'relative',
                              zIndex: 1,
                            }}
                          >
                            {Array.from({ length: TL_ROW_SIZE }).map(
                              (_, colIdx) => {
                                const item = displayItems[colIdx]
                                if (!item) return <div key={`e-${colIdx}`} />

                                const head = item.headTenure
                                const personName = head?.person
                                  ? getPersonName(head.person)
                                  : '이름 없음'
                                const posTitle =
                                  head?.positionDefinition?.title ??
                                  head?.title ??
                                  '—'
                                const termNum =
                                  head?.termNumber ?? head?.regnalNumber
                                const thumbUrl =
                                  head?.person?.profileImageUrl ?? null
                                const startYear = head?.startDate
                                  ? new Date(head.startDate).getFullYear()
                                  : null
                                const endYear = head?.endDate
                                  ? new Date(head.endDate).getFullYear()
                                  : null
                                const range = startYear
                                  ? `${startYear}–${endYear ?? '현재'}`
                                  : '—'
                                const ageAtStart =
                                  head?.person && head?.startDate
                                    ? calcAgeAtTenure(
                                        head.person,
                                        head.startDate,
                                      )
                                    : null
                                const birthPlace = head?.person
                                  ? ((head.person as any).birthCity?.name ??
                                    (head.person as any).birthAdminDivision
                                      ?.name ??
                                    (head.person as any).birthPlaceText ??
                                    null)
                                  : null
                                const isDeleting = deletingCabinetId === item.id
                                // 짝수: 아이템 위 / 버블 아래, 홀수: 버블 위 / 아이템 아래
                                const itemOnTop = colIdx % 2 === 0

                                return (
                                  <div
                                    key={item.id}
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'flex-start',
                                      height: '100%',
                                      cursor: isDeleting ? 'wait' : 'pointer',
                                      padding: '0 4px',
                                    }}
                                    onClick={() => {
                                      if (!isDeleting) {
                                        setSelectedCabinetId(item.id)
                                        setCabinetView('detail')
                                      }
                                    }}
                                  >
                                    {/* 위쪽 영역 */}
                                    <div
                                      style={{
                                        flex: 1,
                                        width: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        justifyContent: 'flex-end',
                                        paddingBottom: 8,
                                      }}
                                    >
                                      {itemOnTop ? (
                                        /* 아이템 (위) */
                                        <div
                                          style={{
                                            width: '100%',
                                            transition:
                                              'transform 0.18s ease, opacity 0.15s',
                                          }}
                                          onMouseEnter={(e) => {
                                            ;(
                                              e.currentTarget as HTMLDivElement
                                            ).style.transform =
                                              'translateY(-3px)'
                                            ;(
                                              e.currentTarget as HTMLDivElement
                                            ).style.opacity = '0.92'
                                          }}
                                          onMouseLeave={(e) => {
                                            ;(
                                              e.currentTarget as HTMLDivElement
                                            ).style.transform = 'translateY(0)'
                                            ;(
                                              e.currentTarget as HTMLDivElement
                                            ).style.opacity = '1'
                                          }}
                                        >
                                          <TlItem
                                            thumbUrl={thumbUrl}
                                            personName={personName}
                                            posTitle={posTitle}
                                            range={range}
                                            ageAtStart={ageAtStart}
                                            birthPlace={birthPlace}
                                            lineColor={p.line}
                                            isDark={isDark}
                                          />
                                        </div>
                                      ) : (
                                        /* 연도 버블 (위) */
                                        <div
                                          style={{
                                            display: 'inline-flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            background: C.bg,
                                            border: `2.5px solid ${p.line}`,
                                            borderRadius: 28,
                                            padding: '6px 14px',
                                            minWidth: TL_BUBBLE_W,
                                            boxShadow: `0 2px 10px ${p.line}44`,
                                            textAlign: 'center',
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontSize: 17,
                                              fontWeight: 900,
                                              color: p.textColor,
                                              letterSpacing: '-0.03em',
                                              lineHeight: 1.2,
                                            }}
                                          >
                                            {startYear ?? '—'}
                                          </span>
                                          {termNum != null && (
                                            <span
                                              style={{
                                                fontSize: 10,
                                                fontWeight: 700,
                                                color: p.line,
                                                marginTop: 1,
                                              }}
                                            >
                                              제{termNum}대
                                              {head?.subTermNumber != null
                                                ? ` ${head.subTermNumber}기`
                                                : ''}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* 수직선 + 노드 — 왼쪽 정렬 */}
                                    <div
                                      style={{
                                        width: 2,
                                        height: 10,
                                        background: p.line,
                                        opacity: 0.6,
                                        marginLeft: TL_BUBBLE_W / 2 - 1,
                                        flexShrink: 0,
                                      }}
                                    />
                                    <div
                                      style={{
                                        width: 14,
                                        height: 14,
                                        borderRadius: '50%',
                                        background: C.bg,
                                        border: `3px solid ${p.line}`,
                                        boxShadow: `0 0 0 3px ${C.bg}`,
                                        marginLeft: TL_BUBBLE_W / 2 - 7,
                                        flexShrink: 0,
                                        zIndex: 2,
                                      }}
                                    />
                                    <div
                                      style={{
                                        width: 2,
                                        height: 10,
                                        background: p.line,
                                        opacity: 0.6,
                                        marginLeft: TL_BUBBLE_W / 2 - 1,
                                        flexShrink: 0,
                                      }}
                                    />

                                    {/* 아래쪽 영역 */}
                                    <div
                                      style={{
                                        flex: 1,
                                        width: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        justifyContent: 'flex-start',
                                        paddingTop: 8,
                                      }}
                                    >
                                      {!itemOnTop ? (
                                        /* 아이템 (아래) */
                                        <div
                                          style={{
                                            width: '100%',
                                            transition:
                                              'transform 0.18s ease, opacity 0.15s',
                                          }}
                                          onMouseEnter={(e) => {
                                            ;(
                                              e.currentTarget as HTMLDivElement
                                            ).style.transform =
                                              'translateY(3px)'
                                            ;(
                                              e.currentTarget as HTMLDivElement
                                            ).style.opacity = '0.92'
                                          }}
                                          onMouseLeave={(e) => {
                                            ;(
                                              e.currentTarget as HTMLDivElement
                                            ).style.transform = 'translateY(0)'
                                            ;(
                                              e.currentTarget as HTMLDivElement
                                            ).style.opacity = '1'
                                          }}
                                        >
                                          <TlItem
                                            thumbUrl={thumbUrl}
                                            personName={personName}
                                            posTitle={posTitle}
                                            range={range}
                                            ageAtStart={ageAtStart}
                                            birthPlace={birthPlace}
                                            lineColor={p.line}
                                            isDark={isDark}
                                          />
                                        </div>
                                      ) : (
                                        /* 연도 버블 (아래) */
                                        <div
                                          style={{
                                            display: 'inline-flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            background: C.bg,
                                            border: `2.5px solid ${p.line}`,
                                            borderRadius: 28,
                                            padding: '6px 14px',
                                            minWidth: TL_BUBBLE_W,
                                            boxShadow: `0 2px 10px ${p.line}44`,
                                            textAlign: 'center',
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontSize: 17,
                                              fontWeight: 900,
                                              color: p.textColor,
                                              letterSpacing: '-0.03em',
                                              lineHeight: 1.2,
                                            }}
                                          >
                                            {startYear ?? '—'}
                                          </span>
                                          {termNum != null && (
                                            <span
                                              style={{
                                                fontSize: 10,
                                                fontWeight: 700,
                                                color: p.line,
                                                marginTop: 1,
                                              }}
                                            >
                                              제{termNum}대
                                              {head?.subTermNumber != null
                                                ? ` ${head.subTermNumber}기`
                                                : ''}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )
                              },
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </motion.div>
        ) : (
          /* ── 상세 뷰: 선택한 행정부 내용 ── */
          <motion.div
            key="cab-detail-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ padding: '20px 20px 40px' }}
          >
            {hasSelectedCabinet && selectedCabinet && (
              <>
                <CabDetailTopBar>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <CabDetailBackBtn
                      type="button"
                      onClick={() => {
                        setCabinetView('list')
                        setSelectedCabinetId(null)
                        setSelectedMinisterId(null)
                      }}
                    >
                      <FiChevronLeft size={14} />
                      행정부 목록
                    </CabDetailBackBtn>
                    {/* 현재 선택된 행정부명 (브레드크럼) */}
                    {selectedCabinet && (
                      <>
                        <CabBreadcrumbSep>/</CabBreadcrumbSep>
                        {selectedMinisterId ? (
                          <CabDetailBackBtn
                            type="button"
                            onClick={() => {
                              setSelectedMinisterId(null)
                              setSelectedHistoryId(null)
                              setEditingHistoryContent(false)
                            }}
                          >
                            {(() => {
                              const h = selectedCabinet.headTenure
                              const n = h?.person
                                ? getPersonName(h.person)
                                : null
                              const t = h?.termNumber ?? h?.regnalNumber
                              return n
                                ? t != null
                                  ? `제${t}대${h?.subTermNumber != null ? ` ${h.subTermNumber}기` : ''} ${n}`
                                  : n
                                : '행정부 상세'
                            })()}
                          </CabDetailBackBtn>
                        ) : (
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#1e293b',
                              padding: '6px 4px',
                            }}
                          >
                            {(() => {
                              const h = selectedCabinet.headTenure
                              const n = h?.person
                                ? getPersonName(h.person)
                                : null
                              const t = h?.termNumber ?? h?.regnalNumber
                              return n
                                ? t != null
                                  ? `제${t}대${h?.subTermNumber != null ? ` ${h.subTermNumber}기` : ''} ${n}`
                                  : n
                                : '행정부 상세'
                            })()}
                          </span>
                        )}
                      </>
                    )}
                    {/* 각료 선택 시 각료명 표시 */}
                    {selectedMinisterId &&
                      (() => {
                        const m = sortedVisibleMinisters.find(
                          (t: any) => t.id === selectedMinisterId,
                        )
                        const mn = m?.person ? getPersonName(m.person) : null
                        if (!mn) return null
                        return (
                          <>
                            <CabBreadcrumbSep>/</CabBreadcrumbSep>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: '#1e293b',
                                padding: '6px 4px',
                              }}
                            >
                              {mn}
                            </span>
                          </>
                        )
                      })()}
                  </div>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    {/* 각료 상세에서 편집/삭제 버튼 */}
                    {selectedMinisterId &&
                      (() => {
                        const minister = sortedVisibleMinisters.find(
                          (t: any) => t.id === selectedMinisterId,
                        )
                        if (!minister) return null
                        return (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                // 각료 수정: 기존 각료 정보로 폼 초기화 후 등록 모달 오픈
                                setMinisterFormPositionDefId(
                                  minister.positionDefinition?.id ?? null,
                                )
                                setMinisterFormTitle(minister.title ?? '')
                                setMinisterFormStartDate(
                                  minister.startDate
                                    ? minister.startDate.slice(0, 10)
                                    : '',
                                )
                                setMinisterFormEndDate(
                                  minister.endDate
                                    ? minister.endDate.slice(0, 10)
                                    : '',
                                )
                                setMinisterFormTermNumber(
                                  minister.termNumber != null
                                    ? String(minister.termNumber)
                                    : '',
                                )
                                setMinisterFormDeptId(
                                  minister.administrationDepartmentId ?? null,
                                )
                                setAddMinisterCabinet({
                                  ...selectedCabinet,
                                  _editingTenureId: minister.id,
                                })
                                setPersonSelectOpen(true)
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '6px 12px',
                                fontSize: 12,
                                fontWeight: 600,
                                color: C.textMuted,
                                background: C.btnBg,
                                border: `1px solid ${C.badgeBorder}`,
                                borderRadius: 8,
                                cursor: 'pointer',
                              }}
                            >
                              <FiEdit2 size={12} />
                              수정
                            </button>
                          </>
                        )
                      })()}
                    {/* 행정부 삭제 버튼 (행정부 상세일 때) */}
                    {!selectedMinisterId && selectedCabinet && (
                      <button
                        type="button"
                        onClick={(e) =>
                          handleDeleteCabinet(selectedCabinet.id, e)
                        }
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#ef4444',
                          background: 'transparent',
                          border: `1px solid ${isDark ? 'rgba(220,38,38,0.35)' : '#fecaca'}`,
                          borderRadius: 8,
                          cursor: 'pointer',
                          transition: 'all 0.14s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = isDark
                            ? 'rgba(220,38,38,0.15)'
                            : '#fff1f1'
                          e.currentTarget.style.borderColor = isDark
                            ? 'rgba(220,38,38,0.5)'
                            : '#f87171'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.borderColor = isDark
                            ? 'rgba(220,38,38,0.35)'
                            : '#fecaca'
                        }}
                      >
                        <FiTrash2 size={12} />
                        행정부 삭제
                      </button>
                    )}
                  </div>
                </CabDetailTopBar>
                {selectedMinisterId
                  ? /* ── 각료 상세 뷰 ── */
                    (() => {
                      const minister = sortedVisibleMinisters.find(
                        (t: any) => t.id === selectedMinisterId,
                      )
                      if (!minister) return null
                      const achievementCount = Array.isArray(
                        minister.achievements,
                      )
                        ? minister.achievements.length
                        : 0
                      const thumbUrl = minister.person?.profileImageUrl ?? null
                      const personName = getPersonName(minister.person)
                      const posTitle =
                        minister.positionDefinition?.title ??
                        minister.title ??
                        '—'
                      const deptName = getMinisterDepartmentName(minister)
                      const start = minister.startDate
                        ? formatDate(minister.startDate)
                        : '—'
                      const end = minister.endDate
                        ? formatDate(minister.endDate)
                        : '현재'
                      const tenureDuration = calcTenureDuration(
                        minister.startDate,
                        minister.endDate,
                      )
                      const ageAtStart = calcAgeAtTenure(
                        minister.person,
                        minister.startDate,
                      )
                      const ageAtEnd = minister.endDate
                        ? calcAgeAtEndTenure(minister.person, minister.endDate)
                        : null
                      return (
                        <>
                          {/* 각료 프로필 — compact horizontal 카드 */}
                          <MinisterProfileBlock>
                            <MinisterProfileAvatar
                              onClick={() =>
                                minister.person?.id &&
                                setMentionPersonId(minister.person.id)
                              }
                              style={{
                                cursor: minister.person?.id
                                  ? 'pointer'
                                  : 'default',
                              }}
                              title={
                                minister.person?.id
                                  ? `${personName} 인물 정보 보기`
                                  : undefined
                              }
                            >
                              {thumbUrl ? (
                                <img
                                  src={thumbUrl}
                                  alt={personName}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    objectPosition: 'top center',
                                    borderRadius: '50%',
                                  }}
                                />
                              ) : (
                                <FiUser size={28} color="#c0cad8" />
                              )}
                            </MinisterProfileAvatar>
                            <MinisterProfileMeta>
                              <MinisterProfileName>
                                {personName}
                              </MinisterProfileName>
                              <MinisterProfileBadges>
                                <MinisterPosBadge>{posTitle}</MinisterPosBadge>
                                {deptName !== '—' && deptName !== '미연결' && (
                                  <MinisterDeptTag>{deptName}</MinisterDeptTag>
                                )}
                              </MinisterProfileBadges>
                              <MinisterProfileStats>
                                <MinisterStatItem>
                                  <FiCalendar size={10} />
                                  {start} – {end}
                                </MinisterStatItem>
                                {tenureDuration && (
                                  <MinisterStatAge>
                                    재임 {tenureDuration}
                                  </MinisterStatAge>
                                )}
                                {ageAtStart != null && (
                                  <MinisterStatAge>
                                    {ageAtEnd != null
                                      ? `${ageAtStart}세 ~ ${ageAtEnd}세`
                                      : `취임 ${ageAtStart}세`}
                                  </MinisterStatAge>
                                )}
                              </MinisterProfileStats>
                              {minister.person && (
                                <MinisterProfileLifespan>
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      color: '#94a3b8',
                                      marginRight: 4,
                                      fontSize: 10,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.04em',
                                    }}
                                  >
                                    생몰년
                                  </span>
                                  {formatPersonLifespan(minister.person)}
                                </MinisterProfileLifespan>
                              )}
                              {(() => {
                                const p = minister.person as any
                                const birthPlace =
                                  p?.birthCity?.name ??
                                  p?.birthAdminDivision?.name ??
                                  p?.birthPlaceText
                                return birthPlace ? (
                                  <MinisterProfileLifespan>
                                    <span
                                      style={{
                                        fontWeight: 700,
                                        color: '#94a3b8',
                                        marginRight: 4,
                                        fontSize: 10,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.04em',
                                      }}
                                    >
                                      출신
                                    </span>
                                    {birthPlace}
                                  </MinisterProfileLifespan>
                                ) : null
                              })()}
                            </MinisterProfileMeta>
                            <MinisterProfileAction></MinisterProfileAction>
                          </MinisterProfileBlock>

                          {/* 히스토리 섹션: 선택 시 NYT 상세, 미선택 시 목록 */}
                          {selectedHistoryId ? (
                            (() => {
                              const selAch = Array.isArray(
                                minister.achievements,
                              )
                                ? minister.achievements.find(
                                    (a: any) => a.id === selectedHistoryId,
                                  )
                                : null
                              if (!selAch) return null
                              const achStartDate = selAch.startDate
                                ? formatDate(selAch.startDate)
                                : null
                              const achEndDate = selAch.endDate
                                ? formatDate(selAch.endDate)
                                : null
                              const hasContent = !!selAch.description?.trim()
                              return (
                                <HistoryArticleWrap>
                                  <HistoryArticleTopBar>
                                    <HistoryArticleBackBtn
                                      type="button"
                                      onClick={() => {
                                        setSelectedHistoryId(null)
                                        setEditingHistoryContent(false)
                                        setEditingHistoryMeta(false)
                                      }}
                                    >
                                      <FiChevronLeft size={13} />
                                      재임 히스토리 목록
                                    </HistoryArticleBackBtn>
                                    <HistoryArticleDeleteBtn
                                      type="button"
                                      onClick={() =>
                                        deleteMinisterHistoryDirect(
                                          minister.id,
                                          selAch.id,
                                        )
                                      }
                                    >
                                      <FiTrash2 size={13} />
                                      삭제
                                    </HistoryArticleDeleteBtn>
                                  </HistoryArticleTopBar>

                                  {/* 제목/날짜 영역: 100% width, 별도 수정 버튼 */}
                                  <HistoryArticleMetaSection>
                                    {editingHistoryMeta ? (
                                      <>
                                        <HistoryMetaForm>
                                          <HistoryMetaInput
                                            type="text"
                                            value={historyMetaTitle}
                                            onChange={(e) =>
                                              setHistoryMetaTitle(
                                                e.target.value,
                                              )
                                            }
                                            placeholder="히스토리 제목"
                                          />
                                          <HistoryMetaDateRow>
                                            <HistoryMetaDateInput
                                              type="date"
                                              value={historyMetaStartDate}
                                              onChange={(e) =>
                                                setHistoryMetaStartDate(
                                                  e.target.value,
                                                )
                                              }
                                            />
                                            <span
                                              style={{
                                                color: '#c0cad8',
                                                fontSize: 13,
                                              }}
                                            >
                                              –
                                            </span>
                                            <HistoryMetaDateInput
                                              type="date"
                                              value={historyMetaEndDate}
                                              onChange={(e) =>
                                                setHistoryMetaEndDate(
                                                  e.target.value,
                                                )
                                              }
                                            />
                                          </HistoryMetaDateRow>
                                        </HistoryMetaForm>
                                        <HistoryArticleEditActions
                                          style={{ marginTop: 12 }}
                                        >
                                          <HistoryArticleCancelBtn
                                            type="button"
                                            onClick={() =>
                                              setEditingHistoryMeta(false)
                                            }
                                            disabled={historyMetaSaving}
                                          >
                                            취소
                                          </HistoryArticleCancelBtn>
                                          <HistoryArticleSaveBtn
                                            type="button"
                                            onClick={() =>
                                              saveHistoryMeta(
                                                minister.id,
                                                selAch.id,
                                              )
                                            }
                                            disabled={
                                              historyMetaSaving ||
                                              !historyMetaTitle.trim()
                                            }
                                            $isRegister={false}
                                          >
                                            {historyMetaSaving
                                              ? '저장 중…'
                                              : '저장'}
                                          </HistoryArticleSaveBtn>
                                        </HistoryArticleEditActions>
                                      </>
                                    ) : (
                                      <>
                                        <HistoryHeadlineRow>
                                          <HistoryArticleHeadline>
                                            {selAch.title}
                                          </HistoryArticleHeadline>
                                          <HistoryMetaEditBtn
                                            type="button"
                                            onClick={() => {
                                              setHistoryMetaTitle(
                                                selAch.title ?? '',
                                              )
                                              setHistoryMetaStartDate(
                                                selAch.startDate
                                                  ? String(
                                                      selAch.startDate,
                                                    ).slice(0, 10)
                                                  : '',
                                              )
                                              setHistoryMetaEndDate(
                                                selAch.endDate
                                                  ? String(
                                                      selAch.endDate,
                                                    ).slice(0, 10)
                                                  : '',
                                              )
                                              setEditingHistoryMeta(true)
                                            }}
                                          >
                                            <FiEdit2 size={11} />
                                          </HistoryMetaEditBtn>
                                        </HistoryHeadlineRow>
                                        {(achStartDate || achEndDate) && (
                                          <HistoryArticleByline>
                                            {achStartDate && (
                                              <span>{achStartDate}</span>
                                            )}
                                            {achStartDate && achEndDate && (
                                              <span> – </span>
                                            )}
                                            {achEndDate && (
                                              <span>{achEndDate}</span>
                                            )}
                                          </HistoryArticleByline>
                                        )}
                                      </>
                                    )}
                                  </HistoryArticleMetaSection>

                                  <HistoryArticleDivider />

                                  {/* 본문 영역: max-width 680px 가운데 */}
                                  <HistoryArticleInner>
                                    <HistoryArticleContentBar>
                                      {!editingHistoryContent && (
                                        <HistoryArticleEditBtn
                                          type="button"
                                          style={{ marginLeft: 'auto' }}
                                          onClick={() => {
                                            setHistoryDraftContent(
                                              selAch.description ?? '',
                                            )
                                            setEditingHistoryContent(true)
                                          }}
                                        >
                                          <FiEdit2 size={13} />
                                          {hasContent ? '수정' : '추가'}
                                        </HistoryArticleEditBtn>
                                      )}
                                    </HistoryArticleContentBar>

                                    {editingHistoryContent ? (
                                      <>
                                        <HistoryArticleEditorWrap>
                                          <RichTextEditor
                                            value={historyDraftContent}
                                            onChange={setHistoryDraftContent}
                                            showTitle={false}
                                            placeholder={
                                              hasContent
                                                ? '본문을 수정하세요.'
                                                : '본문 내용을 입력하세요.'
                                            }
                                            onImageUpload={async (file) => {
                                              const result = await uploadImage(
                                                file,
                                                'persons',
                                              )
                                              return (
                                                getUploadImageUrl(result.url) ||
                                                (result.url ?? '')
                                              )
                                            }}
                                          />
                                        </HistoryArticleEditorWrap>
                                        <HistoryArticleEditActions>
                                          <HistoryArticleCancelBtn
                                            type="button"
                                            onClick={() => {
                                              setEditingHistoryContent(false)
                                              setHistoryDraftContent('')
                                            }}
                                            disabled={historyContentSaving}
                                          >
                                            취소
                                          </HistoryArticleCancelBtn>
                                          <HistoryArticleSaveBtn
                                            type="button"
                                            onClick={() =>
                                              saveHistoryDescription(
                                                minister.id,
                                                selAch.id,
                                                historyDraftContent,
                                              )
                                            }
                                            disabled={historyContentSaving}
                                            $isRegister={!hasContent}
                                          >
                                            {historyContentSaving
                                              ? hasContent
                                                ? '저장 중…'
                                                : '등록 중…'
                                              : hasContent
                                                ? '저장'
                                                : '등록'}
                                          </HistoryArticleSaveBtn>
                                        </HistoryArticleEditActions>
                                      </>
                                    ) : hasContent ? (
                                      <div
                                        onClick={handleHistoryProseClick}
                                        role="presentation"
                                      >
                                        <HistoryArticleProse
                                          dangerouslySetInnerHTML={{
                                            __html: selAch.description,
                                          }}
                                        />
                                      </div>
                                    ) : (
                                      <HistoryArticleEmpty>
                                        본문 내용이 없습니다.
                                      </HistoryArticleEmpty>
                                    )}
                                  </HistoryArticleInner>
                                </HistoryArticleWrap>
                              )
                            })()
                          ) : (
                            <ProfileSection>
                              <ProfileSectionLabel>
                                재임 히스토리
                                {achievementCount > 0 && (
                                  <ProfileSectionCount>
                                    {achievementCount}
                                  </ProfileSectionCount>
                                )}
                              </ProfileSectionLabel>
                              {achievementCount === 0 ? (
                                <ProfileEmptyNote>
                                  등록된 히스토리가 없습니다.
                                  <button
                                    type="button"
                                    onClick={(e) =>
                                      openMinisterHistoryModal(minister, e)
                                    }
                                    style={{
                                      marginLeft: 10,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      padding: '4px 10px',
                                      fontSize: 11.5,
                                      fontWeight: 600,
                                      color: isDark ? '#94a3b8' : '#475569',
                                      background: isDark
                                        ? 'rgba(255,255,255,0.06)'
                                        : '#f8fafc',
                                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                                      borderRadius: 7,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <FiPlus size={11} />
                                    등록
                                  </button>
                                </ProfileEmptyNote>
                              ) : (
                                <HistoryCardList>
                                  {minister.achievements.map((ach: any) => (
                                    <HistoryCard
                                      key={ach.id}
                                      onClick={() =>
                                        setSelectedHistoryId(ach.id)
                                      }
                                    >
                                      <HistoryCardTitle>
                                        {ach.title}
                                      </HistoryCardTitle>
                                      {(ach.startDate || ach.endDate) && (
                                        <HistoryCardMeta>
                                          {ach.startDate
                                            ? formatDate(ach.startDate)
                                            : '—'}
                                          {' – '}
                                          {ach.endDate
                                            ? formatDate(ach.endDate)
                                            : '현재'}
                                        </HistoryCardMeta>
                                      )}
                                      {ach.description && (
                                        <HistoryCardExcerpt>
                                          {ach.description
                                            .replace(/<[^>]+>/g, '')
                                            .trim()
                                            .slice(0, 80)}
                                          {ach.description
                                            .replace(/<[^>]+>/g, '')
                                            .trim().length > 80
                                            ? '…'
                                            : ''}
                                        </HistoryCardExcerpt>
                                      )}
                                      <HistoryCardChevron>
                                        <FiChevronRight size={13} />
                                      </HistoryCardChevron>
                                      <HistoryCardDeleteBtn
                                        type="button"
                                        title="삭제"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          deleteMinisterHistoryDirect(
                                            minister.id,
                                            ach.id,
                                          )
                                        }}
                                      >
                                        <FiTrash2 size={12} />
                                      </HistoryCardDeleteBtn>
                                    </HistoryCard>
                                  ))}
                                </HistoryCardList>
                              )}
                            </ProfileSection>
                          )}
                        </>
                      )
                    })()
                  : /* ── 행정부 상세 뷰 (수반 정보 + 각료 목록) ── */
                    (() => {
                      const head = selectedCabinet.headTenure
                      const thumbUrl = head?.person?.profileImageUrl ?? null
                      const personName = head?.person
                        ? getPersonName(head.person)
                        : '이름 없음'
                      const posTitle =
                        head?.positionDefinition?.title ?? head?.title ?? '—'
                      const termNum = head?.termNumber ?? head?.regnalNumber
                      const startFull = head?.startDate
                        ? formatDate(head.startDate)
                        : '—'
                      const endFull = head?.endDate
                        ? formatDate(head.endDate)
                        : '현재'
                      const duration = calcTenureDuration(
                        head?.startDate,
                        head?.endDate,
                      )
                      const ageAtStart = calcAgeAtTenure(
                        head?.person,
                        head?.startDate,
                      )
                      const ageAtEnd = head?.endDate
                        ? calcAgeAtEndTenure(head?.person, head?.endDate)
                        : null
                      return (
                        <>
                          {/* 수반 compact 프로필 */}
                          <HeadProfileBlock>
                            <HeadProfileAvatar
                              onClick={() =>
                                head?.person?.id &&
                                setMentionPersonId(head.person.id)
                              }
                              style={{
                                cursor: head?.person?.id
                                  ? 'pointer'
                                  : 'default',
                              }}
                              title={
                                head?.person?.id
                                  ? `${personName} 인물 정보 보기`
                                  : undefined
                              }
                            >
                              {thumbUrl ? (
                                <img
                                  src={thumbUrl}
                                  alt={personName}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    objectPosition: 'top center',
                                    borderRadius: '50%',
                                  }}
                                />
                              ) : (
                                <FiUser size={28} color="#c0cad8" />
                              )}
                            </HeadProfileAvatar>
                            <HeadProfileMeta>
                              <HeadProfileNameRow>
                                {termNum != null && (
                                  <HeadTermBadge>
                                    제{termNum}대
                                    {head?.subTermNumber != null
                                      ? ` ${head.subTermNumber}기`
                                      : ''}
                                  </HeadTermBadge>
                                )}
                                <HeadProfileName>{personName}</HeadProfileName>
                              </HeadProfileNameRow>
                              <HeadPosBadge>{posTitle}</HeadPosBadge>
                              <HeadTenureRow>
                                <HeadTenureDates>
                                  <FiCalendar size={10} />
                                  {startFull} – {endFull}
                                </HeadTenureDates>
                                {duration && (
                                  <HeadTenureDuration>
                                    재임 {duration}
                                  </HeadTenureDuration>
                                )}
                                {ageAtStart != null && (
                                  <HeadTenureAge>
                                    {ageAtEnd != null
                                      ? `${ageAtStart}세 ~ ${ageAtEnd}세`
                                      : `취임 ${ageAtStart}세`}
                                  </HeadTenureAge>
                                )}
                              </HeadTenureRow>
                              {head?.person && (
                                <HeadLifespan>
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      color: '#94a3b8',
                                      marginRight: 4,
                                      fontSize: 10,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.04em',
                                    }}
                                  >
                                    생몰년
                                  </span>
                                  {formatPersonLifespan(head.person)}
                                </HeadLifespan>
                              )}
                              {(() => {
                                const p = head?.person as any
                                const birthPlace =
                                  p?.birthCity?.name ??
                                  p?.birthAdminDivision?.name ??
                                  p?.birthPlaceText
                                return birthPlace ? (
                                  <HeadLifespan>
                                    <span
                                      style={{
                                        fontWeight: 700,
                                        color: '#94a3b8',
                                        marginRight: 4,
                                        fontSize: 10,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.04em',
                                      }}
                                    >
                                      출신
                                    </span>
                                    {birthPlace}
                                  </HeadLifespan>
                                ) : null
                              })()}
                            </HeadProfileMeta>
                            <HeadProfileActions>
                              <HeadActionBtn
                                type="button"
                                onClick={() =>
                                  handleOpenEditCabinet(selectedCabinet, {
                                    stopPropagation: () => {},
                                    preventDefault: () => {},
                                  } as any)
                                }
                              >
                                <FiEdit2 size={12} />
                                수정
                              </HeadActionBtn>
                            </HeadProfileActions>
                          </HeadProfileBlock>

                          {/* 취임/퇴임 정보 섹션 — 항상 표시 */}
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 2,
                              padding: '16px 0 8px',
                            }}
                          >
                            {/* ── 취임 정보 ── */}
                            <HeadTenureInfoSection
                              style={{
                                borderRadius: '12px 12px 0 0',
                                borderLeft: '3px solid #6ee7b7',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  marginBottom:
                                    !!editingTenureInfo &&
                                    editingTenureInfo.cabinetId ===
                                      selectedCabinet.id &&
                                    editingTenureInfo.mode === 'appointment'
                                      ? 10
                                      : 0,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: isDark ? '#cbd5e1' : '#374151',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: '50%',
                                      background: '#6ee7b7',
                                      flexShrink: 0,
                                      display: 'inline-block',
                                    }}
                                  />
                                  취임 정보
                                </span>
                                {!!editingTenureInfo &&
                                editingTenureInfo.cabinetId ===
                                  selectedCabinet.id &&
                                editingTenureInfo.mode === 'appointment' ? (
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button
                                      type="button"
                                      disabled={tenureInfoSubmitting}
                                      onClick={() =>
                                        handleSaveTenureInfoInline(
                                          selectedCabinet.id,
                                          head.id,
                                        )
                                      }
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        padding: '4px 12px',
                                        fontSize: 11.5,
                                        fontWeight: 700,
                                        color: '#fff',
                                        background: '#6366f1',
                                        border: 'none',
                                        borderRadius: 7,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {tenureInfoSubmitting
                                        ? '저장 중…'
                                        : '저장'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingTenureInfo(null)}
                                      style={{
                                        padding: '4px 10px',
                                        fontSize: 11.5,
                                        fontWeight: 600,
                                        color: '#94a3b8',
                                        background: 'transparent',
                                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'}`,
                                        borderRadius: 7,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      취소
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingAppointmentMethod(
                                        head?.appointmentMethod ?? '',
                                      )
                                      setEditingNotes(head?.notes ?? '')
                                      setEditingTenureInfo({
                                        cabinetId: selectedCabinet.id,
                                        mode: 'appointment',
                                      })
                                    }}
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 600,
                                      color: isDark ? '#94a3b8' : '#475569',
                                      background: 'transparent',
                                      border: 'none',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      padding: '4px 8px',
                                      borderRadius: 6,
                                    }}
                                  >
                                    <FiPlus size={12} />
                                    {head?.appointmentMethod || head?.notes
                                      ? '수정'
                                      : '등록'}
                                  </button>
                                )}
                              </div>
                              {!!editingTenureInfo &&
                              editingTenureInfo.cabinetId ===
                                selectedCabinet.id &&
                              editingTenureInfo.mode === 'appointment' ? (
                                <div
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 10,
                                  }}
                                >
                                  <div>
                                    <label
                                      style={{
                                        display: 'block',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: '#94a3b8',
                                        marginBottom: 4,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                      }}
                                    >
                                      임명 방식
                                    </label>
                                    <select
                                      value={editingAppointmentMethod}
                                      onChange={(e) =>
                                        setEditingAppointmentMethod(
                                          e.target.value,
                                        )
                                      }
                                      style={{
                                        maxWidth: 280,
                                        width: '100%',
                                        padding: '8px 10px',
                                        fontSize: 13,
                                        border: `1.5px solid ${C.badgeBorder}`,
                                        borderRadius: 8,
                                        background: C.inputBg,
                                        color: C.text,
                                        outline: 'none',
                                      }}
                                    >
                                      <option value="">선택 안 함</option>
                                      {Object.entries(
                                        APPOINTMENT_METHOD_LABEL,
                                      ).map(([k, v]) => (
                                        <option key={k} value={k}>
                                          {v}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label
                                      style={{
                                        display: 'block',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: '#94a3b8',
                                        marginBottom: 4,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                      }}
                                    >
                                      취임 배경 / 비고
                                    </label>
                                    <textarea
                                      value={editingNotes}
                                      onChange={(e) =>
                                        setEditingNotes(e.target.value)
                                      }
                                      rows={3}
                                      placeholder="취임 배경, 특이 사항 등"
                                      style={{
                                        maxWidth: 500,
                                        height: 200,
                                        width: '100%',
                                        padding: '8px 10px',
                                        fontSize: 13,
                                        resize: 'vertical',
                                        border: `1.5px solid ${C.badgeBorder}`,
                                        borderRadius: 8,
                                        background: C.inputBg,
                                        color: C.text,
                                        outline: 'none',
                                        fontFamily: 'inherit',
                                        lineHeight: 1.6,
                                        boxSizing: 'border-box',
                                        display: 'block',
                                      }}
                                    />
                                  </div>
                                </div>
                              ) : head?.appointmentMethod || head?.notes ? (
                                <>
                                  <HeadTenureInfoBadge
                                    $type="appointment"
                                    style={{ width: 'fit-content' }}
                                  >
                                    <HeadTenureInfoBadgeLabel>
                                      임명
                                    </HeadTenureInfoBadgeLabel>
                                    {APPOINTMENT_METHOD_LABEL[
                                      head.appointmentMethod
                                    ] ?? head.appointmentMethod}
                                  </HeadTenureInfoBadge>
                                  {head.notes && (
                                    <HeadTenureInfoRow $block>
                                      <HeadTenureInfoLabel>
                                        취임 배경 / 비고
                                      </HeadTenureInfoLabel>
                                      <HeadTenureInfoText>
                                        {head.notes}
                                      </HeadTenureInfoText>
                                    </HeadTenureInfoRow>
                                  )}
                                </>
                              ) : (
                                <p
                                  style={{
                                    margin: '2px 0 0',
                                    fontSize: 12,
                                    color: '#c0cad8',
                                  }}
                                >
                                  — 등록된 정보 없음
                                </p>
                              )}
                            </HeadTenureInfoSection>

                            {/* 구분선 */}

                            {/* ── 퇴임 정보 ── */}
                            <HeadTenureInfoSection
                              style={{
                                borderRadius: '0 0 12px 12px',
                                borderLeft: '3px solid #fca5a5',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  marginBottom:
                                    !!editingTenureInfo &&
                                    editingTenureInfo.cabinetId ===
                                      selectedCabinet.id &&
                                    editingTenureInfo.mode === 'end'
                                      ? 10
                                      : 0,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: isDark ? '#cbd5e1' : '#374151',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: '50%',
                                      background: '#fca5a5',
                                      flexShrink: 0,
                                      display: 'inline-block',
                                    }}
                                  />
                                  퇴임 정보
                                </span>
                                {!!editingTenureInfo &&
                                editingTenureInfo.cabinetId ===
                                  selectedCabinet.id &&
                                editingTenureInfo.mode === 'end' ? (
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button
                                      type="button"
                                      disabled={tenureInfoSubmitting}
                                      onClick={() =>
                                        handleSaveTenureInfoInline(
                                          selectedCabinet.id,
                                          head.id,
                                        )
                                      }
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        padding: '4px 12px',
                                        fontSize: 11.5,
                                        fontWeight: 700,
                                        color: '#fff',
                                        background: '#6366f1',
                                        border: 'none',
                                        borderRadius: 7,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {tenureInfoSubmitting
                                        ? '저장 중…'
                                        : '저장'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingTenureInfo(null)}
                                      style={{
                                        padding: '4px 10px',
                                        fontSize: 11.5,
                                        fontWeight: 600,
                                        color: '#94a3b8',
                                        background: 'transparent',
                                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'}`,
                                        borderRadius: 7,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      취소
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingEndReason(head?.endReason ?? '')
                                      setEditingEndReasonDetail(
                                        head?.endReasonDetail ?? '',
                                      )
                                      setEditingTenureInfo({
                                        cabinetId: selectedCabinet.id,
                                        mode: 'end',
                                      })
                                    }}
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 600,
                                      color: isDark ? '#94a3b8' : '#475569',
                                      background: 'transparent',
                                      border: 'none',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      padding: '4px 8px',
                                      borderRadius: 6,
                                    }}
                                  >
                                    <FiPlus size={12} />
                                    {head?.endReason || head?.endReasonDetail
                                      ? '수정'
                                      : '등록'}
                                  </button>
                                )}
                              </div>
                              {!!editingTenureInfo &&
                              editingTenureInfo.cabinetId ===
                                selectedCabinet.id &&
                              editingTenureInfo.mode === 'end' ? (
                                <div
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 10,
                                  }}
                                >
                                  <div>
                                    <label
                                      style={{
                                        display: 'block',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: '#94a3b8',
                                        marginBottom: 4,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                      }}
                                    >
                                      퇴임 사유
                                    </label>
                                    <select
                                      value={editingEndReason}
                                      onChange={(e) =>
                                        setEditingEndReason(e.target.value)
                                      }
                                      style={{
                                        maxWidth: 280,
                                        width: '100%',
                                        padding: '8px 10px',
                                        fontSize: 13,
                                        border: `1.5px solid ${C.badgeBorder}`,
                                        borderRadius: 8,
                                        background: C.inputBg,
                                        color: C.text,
                                        outline: 'none',
                                      }}
                                    >
                                      <option value="">선택 안 함</option>
                                      {Object.entries(END_REASON_LABEL).map(
                                        ([k, v]) => (
                                          <option key={k} value={k}>
                                            {v}
                                          </option>
                                        ),
                                      )}
                                    </select>
                                  </div>
                                  <div>
                                    <label
                                      style={{
                                        display: 'block',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: '#94a3b8',
                                        marginBottom: 4,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                      }}
                                    >
                                      퇴임 상세
                                    </label>
                                    <textarea
                                      value={editingEndReasonDetail}
                                      onChange={(e) =>
                                        setEditingEndReasonDetail(
                                          e.target.value,
                                        )
                                      }
                                      rows={3}
                                      placeholder="퇴임 경위, 상세 내용 등"
                                      style={{
                                        maxWidth: 500,
                                        height: 200,
                                        width: '100%',
                                        padding: '8px 10px',
                                        fontSize: 13,
                                        resize: 'vertical',
                                        border: `1.5px solid ${C.badgeBorder}`,
                                        borderRadius: 8,
                                        background: C.inputBg,
                                        color: C.text,
                                        outline: 'none',
                                        fontFamily: 'inherit',
                                        lineHeight: 1.6,
                                        boxSizing: 'border-box',
                                        display: 'block',
                                      }}
                                    />
                                  </div>
                                </div>
                              ) : head?.endReason || head?.endReasonDetail ? (
                                <>
                                  <HeadTenureInfoBadge
                                    $type="end"
                                    style={{ width: 'fit-content' }}
                                  >
                                    <HeadTenureInfoBadgeLabel>
                                      퇴임
                                    </HeadTenureInfoBadgeLabel>
                                    {END_REASON_LABEL[head.endReason] ??
                                      head.endReason}
                                  </HeadTenureInfoBadge>
                                  {head.endReasonDetail && (
                                    <HeadTenureInfoRow $block>
                                      <HeadTenureInfoLabel>
                                        퇴임 상세
                                      </HeadTenureInfoLabel>
                                      <HeadTenureInfoText>
                                        {head.endReasonDetail}
                                      </HeadTenureInfoText>
                                    </HeadTenureInfoRow>
                                  )}
                                </>
                              ) : (
                                <p
                                  style={{
                                    margin: '2px 0 0',
                                    fontSize: 12,
                                    color: '#c0cad8',
                                  }}
                                >
                                  — 등록된 정보 없음
                                </p>
                              )}
                            </HeadTenureInfoSection>
                          </div>
                          {/* end tenure info container */}

                          {/* 수반 재임 히스토리 목록 */}
                          <HeadTenureInfoSection>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: isDark ? '#e2e8f0' : '#374151',
                                }}
                              >
                                재임 히스토리
                                {Array.isArray(head?.achievements) &&
                                head.achievements.length > 0
                                  ? ` (${head.achievements.length})`
                                  : ''}
                              </span>
                              {Array.isArray(head?.achievements) &&
                                head.achievements.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openMinisterHistoryModal(head)
                                    }
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 600,
                                      color: isDark ? '#94a3b8' : '#475569',
                                      background: 'transparent',
                                      border: 'none',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      padding: '4px 8px',
                                      borderRadius: 6,
                                    }}
                                  >
                                    <FiPlus size={12} />
                                    추가
                                  </button>
                                )}
                            </div>
                            {Array.isArray(head?.achievements) &&
                            head.achievements.length > 0 ? (
                              <HistoryCardList>
                                {head.achievements.map((ach: any) => (
                                  <HistoryCard
                                    key={ach.id}
                                    onClick={() =>
                                      openMinisterHistoryModal(head)
                                    }
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <HistoryCardTitle>
                                      {ach.title}
                                    </HistoryCardTitle>
                                    {(ach.startDate || ach.endDate) && (
                                      <HistoryCardMeta>
                                        {ach.startDate
                                          ? formatDate(ach.startDate)
                                          : '—'}
                                        {' ~ '}
                                        {ach.endDate
                                          ? formatDate(ach.endDate)
                                          : '현재'}
                                      </HistoryCardMeta>
                                    )}
                                    {ach.description && (
                                      <HistoryCardExcerpt>
                                        {ach.description.length > 80
                                          ? ach.description.slice(0, 80) + '…'
                                          : ach.description}
                                      </HistoryCardExcerpt>
                                    )}
                                  </HistoryCard>
                                ))}
                              </HistoryCardList>
                            ) : (
                              <div
                                style={{
                                  padding: '20px 0',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: 10,
                                }}
                              >
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: 12,
                                    color: '#cbd5e1',
                                    fontStyle: 'italic',
                                  }}
                                >
                                  등록된 재임 히스토리가 없습니다.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => openMinisterHistoryModal(head)}
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: isDark ? '#94a3b8' : '#475569',
                                    background: isDark
                                      ? 'rgba(255,255,255,0.06)'
                                      : '#f8fafc',
                                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '6px 14px',
                                  }}
                                >
                                  <FiPlus size={12} />
                                  등록
                                </button>
                              </div>
                            )}
                          </HeadTenureInfoSection>

                          {/* 각료 목록 */}
                          <CabDetailMinistersSection>
                            <CabDetailMinistersSectionHeader>
                              <CabDetailMinistersSectionTitle>
                                각료
                              </CabDetailMinistersSectionTitle>
                              <CabResultCount style={{ marginLeft: 6 }}>
                                {sortedVisibleMinisters.length}명
                              </CabResultCount>
                              <div style={{ flex: 1 }} />
                              {/* 검색창 — 6명 초과일 때만 표시, 추가 버튼 왼쪽 */}
                              {sortedVisibleMinisters.length > 5 && (
                                <CabSearchWrap
                                  style={{ maxWidth: 180, margin: '0 8px 0 0' }}
                                >
                                  <CabSearchIcon>
                                    <FiSearch size={14} />
                                  </CabSearchIcon>
                                  <CabSearchInput
                                    type="text"
                                    placeholder="각료명, 직위..."
                                    value={ministerSearchQuery}
                                    onChange={(e) =>
                                      setMinisterSearchQuery(e.target.value)
                                    }
                                    style={{ height: 32, fontSize: 12 }}
                                  />
                                  {ministerSearchQuery.trim() && (
                                    <CabSearchClear
                                      type="button"
                                      onClick={() => setMinisterSearchQuery('')}
                                    >
                                      <FiX size={12} />
                                    </CabSearchClear>
                                  )}
                                </CabSearchWrap>
                              )}
                              {sortedVisibleMinisters.length > 0 && (
                                <HeadActionBtnPrimary
                                  type="button"
                                  onClick={() =>
                                    handleAddMinister(selectedCabinet)
                                  }
                                >
                                  <FiPlus size={13} />
                                  각료 추가
                                </HeadActionBtnPrimary>
                              )}
                            </CabDetailMinistersSectionHeader>

                            {sortedVisibleMinisters.length === 0 ? (
                              ministerSearchQuery.trim() ? (
                                <EmptyStateBox>
                                  검색 결과가 없습니다.
                                </EmptyStateBox>
                              ) : (
                                <div
                                  style={{
                                    padding: '32px 0',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 12,
                                  }}
                                >
                                  <p
                                    style={{
                                      margin: 0,
                                      fontSize: 13,
                                      color: '#b0bac9',
                                      fontStyle: 'italic',
                                    }}
                                  >
                                    등록된 각료가 없습니다.
                                  </p>
                                  <HeadActionBtnPrimary
                                    type="button"
                                    onClick={() =>
                                      handleAddMinister(selectedCabinet)
                                    }
                                  >
                                    <FiPlus size={13} />
                                    각료 추가
                                  </HeadActionBtnPrimary>
                                </div>
                              )
                            ) : (
                              <MinisterCardGrid>
                                {sortedVisibleMinisters.map((t: any) => {
                                  const mThumb =
                                    t.person?.profileImageUrl ?? null
                                  const mName = getPersonName(t.person)
                                  const mPos =
                                    t.positionDefinition?.title ??
                                    t.title ??
                                    '—'
                                  const mStartFull = t.startDate
                                    ? formatDate(t.startDate)
                                    : '—'
                                  const mEndFull = t.endDate
                                    ? formatDate(t.endDate)
                                    : '현재'
                                  const mDuration = calcTenureDuration(
                                    t.startDate,
                                    t.endDate,
                                  )
                                  const mAge = calcAgeAtTenure(
                                    t.person,
                                    t.startDate,
                                  )
                                  const mAchCount = Array.isArray(
                                    t.achievements,
                                  )
                                    ? t.achievements.length
                                    : 0
                                  return (
                                    <MinisterCard
                                      key={t.id}
                                      $selected={selectedMinisterId === t.id}
                                      onClick={() =>
                                        setSelectedMinisterId(t.id)
                                      }
                                    >
                                      <MinisterCardThumb
                                        onClick={(e) => {
                                          if (t.person?.id) {
                                            e.stopPropagation()
                                            setMentionPersonId(t.person.id)
                                          }
                                        }}
                                        style={{
                                          cursor: t.person?.id
                                            ? 'pointer'
                                            : 'default',
                                        }}
                                        title={
                                          t.person?.id
                                            ? `${mName} 인물 정보 보기`
                                            : undefined
                                        }
                                      >
                                        {mThumb ? (
                                          <MinisterCardThumbImg
                                            src={mThumb}
                                            alt={mName}
                                          />
                                        ) : (
                                          <MinisterCardThumbPlaceholder>
                                            <FiUser size={18} />
                                          </MinisterCardThumbPlaceholder>
                                        )}
                                        {mAchCount > 0 && (
                                          <MinisterCardBadge>
                                            {mAchCount}
                                          </MinisterCardBadge>
                                        )}
                                      </MinisterCardThumb>
                                      <MinisterCardInfo>
                                        <MinisterCardName>
                                          {mName}
                                        </MinisterCardName>
                                        <MinisterCardPos>
                                          {mPos}
                                        </MinisterCardPos>
                                        <MinisterCardRange>
                                          {mStartFull} – {mEndFull}
                                          {mDuration && (
                                            <span
                                              style={{
                                                color: '#b0bac9',
                                                fontSize: 10.5,
                                              }}
                                            >
                                              ({mDuration})
                                            </span>
                                          )}
                                          {mAge != null && (
                                            <MinisterCardAge>
                                              취임 {mAge}세
                                            </MinisterCardAge>
                                          )}
                                        </MinisterCardRange>
                                      </MinisterCardInfo>
                                      <MinisterCardChevron>
                                        <FiChevronRight size={14} />
                                      </MinisterCardChevron>
                                    </MinisterCard>
                                  )
                                })}
                              </MinisterCardGrid>
                            )}
                          </CabDetailMinistersSection>

                          {/* 조약 섹션 */}
                          <CabDetailMinistersSection style={{ marginTop: 24 }}>
                            <CabDetailMinistersSectionHeader>
                              <FiFileText size={15} style={{ color: MAIN }} />
                              <CabDetailMinistersSectionTitle>
                                체결 조약
                              </CabDetailMinistersSectionTitle>
                              <CabResultCount style={{ marginLeft: 6 }}>
                                {cabinetTreaties.length}건
                              </CabResultCount>
                              <div style={{ flex: 1 }} />
                              <HeadActionBtnPrimary
                                type="button"
                                onClick={() => setShowTreatyLinkModal(true)}
                              >
                                <FiLink size={13} />
                                조약 연결
                              </HeadActionBtnPrimary>
                            </CabDetailMinistersSectionHeader>

                            {loadingCabinetTreaties ? (
                              <EmptyStateBox>불러오는 중…</EmptyStateBox>
                            ) : cabinetTreaties.length === 0 ? (
                              <div
                                style={{
                                  padding: '28px 0',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: 10,
                                }}
                              >
                                <FiFileText
                                  size={32}
                                  style={{ color: '#b0bac9' }}
                                />
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: 13,
                                    color: '#b0bac9',
                                    fontStyle: 'italic',
                                  }}
                                >
                                  연결된 조약이 없습니다.
                                </p>
                                <HeadActionBtnPrimary
                                  type="button"
                                  onClick={() => setShowTreatyLinkModal(true)}
                                >
                                  <FiLink size={13} />
                                  조약 연결
                                </HeadActionBtnPrimary>
                              </div>
                            ) : (
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 8,
                                  marginTop: 10,
                                }}
                              >
                                {cabinetTreaties.map((treaty) => {
                                  const signatory = treaty.signatories?.find(
                                    (s) => s.cabinetId === selectedCabinetId,
                                  )
                                  const isExpanded =
                                    selectedTreatyId === treaty.id
                                  return (
                                    <div
                                      key={treaty.id}
                                      style={{
                                        border: `1.5px solid ${isExpanded ? MAIN : isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                                        borderRadius: 10,
                                        overflow: 'hidden',
                                        background: isDark
                                          ? 'rgba(255,255,255,0.04)'
                                          : '#fafbff',
                                        transition: 'border-color 0.15s',
                                      }}
                                    >
                                      <button
                                        type="button"
                                        style={{
                                          width: '100%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 10,
                                          padding: '10px 14px',
                                          background: 'transparent',
                                          border: 'none',
                                          cursor: 'pointer',
                                          textAlign: 'left',
                                        }}
                                        onClick={() =>
                                          setSelectedTreatyId(
                                            isExpanded ? null : treaty.id,
                                          )
                                        }
                                      >
                                        <span
                                          style={{
                                            fontSize: 10,
                                            fontWeight: 700,
                                            color: '#fff',
                                            background: MAIN,
                                            borderRadius: 4,
                                            padding: '2px 7px',
                                            whiteSpace: 'nowrap',
                                            flexShrink: 0,
                                          }}
                                        >
                                          {TREATY_TYPE_LABELS[treaty.type] ??
                                            treaty.type}
                                        </span>
                                        <span
                                          style={{
                                            flex: 1,
                                            fontSize: 13.5,
                                            fontWeight: 600,
                                            color: isDark
                                              ? '#e2e8f0'
                                              : '#1e293b',
                                          }}
                                        >
                                          {treaty.name}
                                          {treaty.alias && (
                                            <span
                                              style={{
                                                fontSize: 11.5,
                                                fontWeight: 400,
                                                color: '#94a3b8',
                                                marginLeft: 6,
                                              }}
                                            >
                                              ({treaty.alias})
                                            </span>
                                          )}
                                        </span>
                                        <span
                                          style={{
                                            fontSize: 11.5,
                                            color: '#94a3b8',
                                            whiteSpace: 'nowrap',
                                          }}
                                        >
                                          {treaty.signDate
                                            ? new Date(
                                                treaty.signDate,
                                              ).getFullYear()
                                            : '—'}
                                        </span>
                                        <FiChevronDown
                                          size={14}
                                          style={{
                                            color: '#94a3b8',
                                            transform: isExpanded
                                              ? 'rotate(180deg)'
                                              : 'none',
                                            transition: 'transform 0.2s',
                                          }}
                                        />
                                      </button>

                                      {isExpanded && (
                                        <div
                                          style={{
                                            padding: '0 14px 12px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 6,
                                          }}
                                        >
                                          {/* 참여 정보 */}
                                          {signatory && (
                                            <div
                                              style={{
                                                display: 'flex',
                                                gap: 8,
                                                flexWrap: 'wrap',
                                              }}
                                            >
                                              {signatory.person && (
                                                <span
                                                  style={{
                                                    fontSize: 12,
                                                    color: isDark
                                                      ? '#94a3b8'
                                                      : '#64748b',
                                                  }}
                                                >
                                                  서명자:{' '}
                                                  <strong>
                                                    {[
                                                      signatory.person.name,
                                                      signatory.person.surname,
                                                    ]
                                                      .filter(Boolean)
                                                      .join(' ')}
                                                  </strong>
                                                </span>
                                              )}
                                              {signatory.role && (
                                                <span
                                                  style={{
                                                    fontSize: 12,
                                                    color: isDark
                                                      ? '#94a3b8'
                                                      : '#64748b',
                                                  }}
                                                >
                                                  직책:{' '}
                                                  <strong>
                                                    {signatory.role}
                                                  </strong>
                                                </span>
                                              )}
                                              <span
                                                style={{
                                                  fontSize: 12,
                                                  color: isDark
                                                    ? '#94a3b8'
                                                    : '#64748b',
                                                }}
                                              >
                                                참여유형:{' '}
                                                <strong>
                                                  {TREATY_PARTICIPATION_LABELS[
                                                    signatory.participationType
                                                  ] ??
                                                    signatory.participationType}
                                                </strong>
                                              </span>
                                            </div>
                                          )}
                                          {treaty.summary && (
                                            <p
                                              style={{
                                                margin: 0,
                                                fontSize: 12.5,
                                                color: isDark
                                                  ? '#94a3b8'
                                                  : '#64748b',
                                                lineHeight: 1.6,
                                              }}
                                            >
                                              {treaty.summary}
                                            </p>
                                          )}
                                          {/* 참여국 목록 */}
                                          {treaty.signatories &&
                                            treaty.signatories.length > 0 && (
                                              <div
                                                style={{
                                                  display: 'flex',
                                                  gap: 6,
                                                  flexWrap: 'wrap',
                                                  marginTop: 4,
                                                }}
                                              >
                                                {treaty.signatories.map((s) => (
                                                  <span
                                                    key={s.id}
                                                    style={{
                                                      fontSize: 11,
                                                      padding: '2px 8px',
                                                      borderRadius: 12,
                                                      background: isDark
                                                        ? 'rgba(255,255,255,0.08)'
                                                        : '#f1f5f9',
                                                      color: isDark
                                                        ? '#cbd5e1'
                                                        : '#475569',
                                                    }}
                                                  >
                                                    {s.country?.name ??
                                                      s.historicalCountry
                                                        ?.name ??
                                                      '미상'}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </CabDetailMinistersSection>
                        </>
                      )
                    })()}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {historyTargetTenure && (
        <ModalOverlay
          role="dialog"
          aria-modal="true"
          aria-labelledby="minister-history-title"
          onClick={closeHistoryModal}
        >
          <MinisterHistoryModalBox onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle id="minister-history-title">
                각료 재임 히스토리
              </ModalTitle>
              <ModalCloseButton
                type="button"
                onClick={closeHistoryModal}
                aria-label="닫기"
              >
                <FiX size={22} strokeWidth={2} />
              </ModalCloseButton>
            </ModalHeader>
            <MinisterHistoryModalBody>
              <MinisterHistoryTarget>
                <strong>{getPersonName(historyTargetTenure.person)}</strong> ·{' '}
                {historyTargetTenure.positionDefinition?.title ??
                  historyTargetTenure.title ??
                  '직위 미상'}
              </MinisterHistoryTarget>

              <MinisterHistorySection>
                <MinisterHistorySectionTitle>
                  등록된 히스토리
                </MinisterHistorySectionTitle>
                {Array.isArray(historyTargetTenure.achievements) &&
                historyTargetTenure.achievements.length > 0 ? (
                  <HistoryItemList>
                    {historyTargetTenure.achievements.map((a: any) => (
                      <HistoryItem key={a.id}>
                        <HistoryItemTop>
                          <HistoryItemTitle>{a.title}</HistoryItemTitle>
                          <HistoryItemActions>
                            <CardIconButton
                              type="button"
                              title="히스토리 수정"
                              onClick={() => startEditHistory(a)}
                            >
                              <FiEdit2 size={14} />
                            </CardIconButton>
                            <CardIconButton
                              type="button"
                              title="히스토리 삭제"
                              $danger
                              onClick={() => deleteMinisterHistory(a.id)}
                              disabled={historySubmitting}
                            >
                              <FiTrash2 size={14} />
                            </CardIconButton>
                          </HistoryItemActions>
                        </HistoryItemTop>
                        <HistoryItemMeta>
                          {a.startDate
                            ? formatDate(a.startDate)
                            : '시작일 미지정'}{' '}
                          ~{' '}
                          {a.endDate ? formatDate(a.endDate) : '종료일 미지정'}
                        </HistoryItemMeta>
                      </HistoryItem>
                    ))}
                  </HistoryItemList>
                ) : (
                  <MinisterEmptyText>
                    등록된 히스토리가 없습니다.
                  </MinisterEmptyText>
                )}
              </MinisterHistorySection>

              <MinisterHistorySection>
                <MinisterHistorySectionTitle>
                  {editingHistoryId ? '히스토리 수정' : '히스토리 등록'}
                </MinisterHistorySectionTitle>
                <FormRows>
                  <FieldRow>
                    <FieldLabel>
                      제목 <Required aria-label="필수" />
                    </FieldLabel>
                    <FieldControl>
                      <RegisterInput
                        type="text"
                        value={historyTitle}
                        onChange={(e) => setHistoryTitle(e.target.value)}
                        placeholder="예: 국방개혁 기본계획 수립"
                      />
                    </FieldControl>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>시작일 / 종료일 (선택)</FieldLabel>
                    <FieldControl>
                      <DateFieldsRow>
                        <RegisterInput
                          type="date"
                          value={historyStartDate}
                          onChange={(e) => setHistoryStartDate(e.target.value)}
                        />
                        <RegisterInput
                          type="date"
                          value={historyEndDate}
                          onChange={(e) => setHistoryEndDate(e.target.value)}
                        />
                      </DateFieldsRow>
                    </FieldControl>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>내용 (선택)</FieldLabel>
                    <FieldControl style={{ maxWidth: 'none' }}>
                      <RichTextEditor
                        value={historyDescription}
                        onChange={setHistoryDescription}
                        showTitle={false}
                        placeholder="재임 중 활동 내용을 입력하세요. 서식/이미지 입력이 가능합니다."
                        onImageUpload={async (file) => {
                          const result = await uploadImage(file, 'persons')
                          return result.url ?? ''
                        }}
                      />
                    </FieldControl>
                  </FieldRow>
                </FormRows>
                <MinisterHistoryActions>
                  {editingHistoryId && (
                    <HistorySecondaryButton
                      type="button"
                      onClick={resetHistoryForm}
                      disabled={historySubmitting}
                    >
                      수정 취소
                    </HistorySecondaryButton>
                  )}
                  <SubmitButton
                    type="button"
                    onClick={submitMinisterHistory}
                    disabled={historySubmitting || !historyTitle.trim()}
                  >
                    {historySubmitting
                      ? editingHistoryId
                        ? '수정 중…'
                        : '등록 중…'
                      : editingHistoryId
                        ? '수정 완료'
                        : '히스토리 등록'}
                  </SubmitButton>
                </MinisterHistoryActions>
              </MinisterHistorySection>
            </MinisterHistoryModalBody>
          </MinisterHistoryModalBox>{' '}
        </ModalOverlay>
      )}

      {registerCabinetModalOpen && (
        <RegisterCabinetModal
          registerFlow={registerFlow}
          setRegisterFlow={setRegisterFlow}
          headTenuresForRegister={headTenuresForRegister}
          handleRegisterCabinet={handleRegisterCabinet}
          handleRegisterNewHeadAndCabinet={handleRegisterNewHeadAndCabinet}
          registerCabinetSubmitting={registerCabinetSubmitting}
          setRegisterCabinetModalOpen={setRegisterCabinetModalOpen}
          getPersonName={getPersonName}
          formatDate={formatDate}
          allPersons={allPersons}
          headPositionOptions={headPositionOptions}
          newHeadPersonId={newHeadPersonId}
          setNewHeadPersonId={setNewHeadPersonId}
          newHeadPositionDefId={newHeadPositionDefId}
          setNewHeadPositionDefId={setNewHeadPositionDefId}
          newHeadTermNumber={newHeadTermNumber}
          setNewHeadTermNumber={setNewHeadTermNumber}
          newHeadSubTermNumber={newHeadSubTermNumber}
          setNewHeadSubTermNumber={setNewHeadSubTermNumber}
          newCabinetName={newCabinetName}
          setNewCabinetName={setNewCabinetName}
          newHeadAppointmentMethod={newHeadAppointmentMethod}
          setNewHeadAppointmentMethod={setNewHeadAppointmentMethod}
          newHeadEndReason={newHeadEndReason}
          setNewHeadEndReason={setNewHeadEndReason}
          newHeadEndReasonDetail={newHeadEndReasonDetail}
          setNewHeadEndReasonDetail={setNewHeadEndReasonDetail}
          newHeadNotes={newHeadNotes}
          setNewHeadNotes={setNewHeadNotes}
          newHeadStartDate={newHeadStartDate}
          setNewHeadStartDate={setNewHeadStartDate}
          newHeadEndDate={newHeadEndDate}
          setNewHeadEndDate={setNewHeadEndDate}
          country={country}
          registerTargetHistoricalCountryId={registerTargetHistoricalCountryId}
          setRegisterTargetHistoricalCountryId={
            setRegisterTargetHistoricalCountryId
          }
          resetNewHeadForm={resetNewHeadForm}
        />
      )}

      {editingCabinet && (
        <ModalOverlay
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-cabinet-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEditCabinetModal()
          }}
        >
          <CabinetModalBox onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle id="edit-cabinet-title">행정부 수정</ModalTitle>
              <ModalCloseButton
                type="button"
                onClick={closeEditCabinetModal}
                aria-label="닫기"
              >
                <FiX size={22} strokeWidth={2} />
              </ModalCloseButton>
            </ModalHeader>
            <CabinetModalBody>
              <CabinetFormDesc>
                <FiInfo size={20} />
                <span>
                  수반 재임의 핵심 정보(국가·인물·직위·취임/퇴임)는 등록 폼과
                  동일한 구성으로 수정할 수 있습니다.
                </span>
              </CabinetFormDesc>
              <FormRows>
                {/* 현대국가인 경우: 소속 국가 변경 (하위 역사국가 포함) */}
                {country.type === 'modern' &&
                  Array.isArray(country.historicalCountries) &&
                  country.historicalCountries.length > 0 && (
                    <FieldRow>
                      <FieldLabel>등록 대상 국가</FieldLabel>
                      <FieldControl>
                        <CabinetSelectNative
                          value={
                            editingTargetType === 'historical'
                              ? (editingTargetHistoricalCountryId ?? '')
                              : ''
                          }
                          onChange={(e) => {
                            if (e.target.value === '') {
                              setEditingTargetType('modern')
                              setEditingTargetHistoricalCountryId(null)
                            } else {
                              setEditingTargetType('historical')
                              setEditingTargetHistoricalCountryId(
                                e.target.value,
                              )
                            }
                          }}
                        >
                          <option value="">{country.name} (현대국가)</option>
                          {country.historicalCountries.map((hc) => (
                            <option key={hc.id} value={hc.id}>
                              {hc.name}
                            </option>
                          ))}
                        </CabinetSelectNative>
                      </FieldControl>
                    </FieldRow>
                  )}
                {/* 역사국가인 경우: 소속 국가 읽기 전용 표시 */}
                {country.type === 'historical' && (
                  <FieldRow>
                    <FieldLabel>등록 대상 국가</FieldLabel>
                    <FieldControl>
                      <CabinetSelectTrigger
                        type="button"
                        $hasValue
                        disabled
                        aria-label="등록 대상 국가"
                        style={{ cursor: 'default' }}
                      >
                        <span>{country.name}</span>
                      </CabinetSelectTrigger>
                    </FieldControl>
                  </FieldRow>
                )}
                <FieldRow>
                  <FieldLabel>대수 (선택)</FieldLabel>
                  <FieldControl>
                    <CabinetTermNumberWrap>
                      <RegisterInput
                        type="number"
                        min={1}
                        placeholder="제 N대"
                        value={editingTermNumber}
                        onChange={(e) => setEditingTermNumber(e.target.value)}
                        aria-label="대수"
                      />
                    </CabinetTermNumberWrap>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>기수 (선택)</FieldLabel>
                  <FieldControl>
                    <CabinetTermNumberWrap>
                      <RegisterInput
                        type="number"
                        min={1}
                        placeholder="N기 (예: 1, 2)"
                        value={editingSubTermNumber}
                        onChange={(e) =>
                          setEditingSubTermNumber(e.target.value)
                        }
                        aria-label="기수"
                        title="같은 대수 내 복수 임기 구분 (예: 클린턴 42대 1기/2기)"
                      />
                    </CabinetTermNumberWrap>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>
                    인물 <Required />
                  </FieldLabel>
                  <FieldControl>
                    <CabinetSelectTrigger
                      type="button"
                      $hasValue
                      disabled
                      aria-label="수반 인물"
                      style={{ cursor: 'default' }}
                    >
                      <span>
                        {editingCabinet.headTenure?.person
                          ? getPersonName(editingCabinet.headTenure.person)
                          : '—'}
                      </span>
                    </CabinetSelectTrigger>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>
                    직위 (수반) <Required />
                  </FieldLabel>
                  <FieldControl>
                    <CabinetSelectNative
                      value={editingPositionDefId ?? ''}
                      onChange={(e) =>
                        setEditingPositionDefId(e.target.value || null)
                      }
                      aria-label="직위 선택"
                    >
                      <option value="">선택</option>
                      {headPositionOptions.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {d.title}
                        </option>
                      ))}
                    </CabinetSelectNative>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>
                    취임일 <Required /> / 퇴임일
                  </FieldLabel>
                  <FieldControl $variant="datePair">
                    <DateFieldsRow>
                      <CabinetDateTrigger
                        type="button"
                        $hasValue={!!editingStartDate}
                        onClick={() => setEditStartDatePickerOpen(true)}
                        aria-label="취임일 선택"
                      >
                        <span>
                          {editingStartDate
                            ? formatDate(editingStartDate)
                            : '취임일 선택'}
                        </span>
                        <FiChevronDown size={18} />
                      </CabinetDateTrigger>
                      <CabinetDateTrigger
                        type="button"
                        $hasValue={!!editingEndDate}
                        onClick={() => setEditEndDatePickerOpen(true)}
                        aria-label="퇴임일 선택"
                      >
                        <span>
                          {editingEndDate
                            ? formatDate(editingEndDate)
                            : '퇴임일 선택'}
                        </span>
                        <FiChevronDown size={18} />
                      </CabinetDateTrigger>
                    </DateFieldsRow>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>행정부 이름 (선택)</FieldLabel>
                  <FieldControl>
                    <RegisterInput
                      type="text"
                      placeholder="예: 루즈벨트 제1기"
                      value={editingCabinetName}
                      onChange={(e) => setEditingCabinetName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateCabinet()
                      }}
                    />
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>임명 방식 (선택)</FieldLabel>
                  <FieldControl>
                    <CabinetSelectNative
                      value={editingAppointmentMethod}
                      onChange={(e) =>
                        setEditingAppointmentMethod(e.target.value)
                      }
                    >
                      <option value="">선택 안 함</option>
                      <option value="DIRECT_ELECTION">직접 선거</option>
                      <option value="INDIRECT_ELECTION">간접 선거</option>
                      <option value="PARLIAMENTARY_ELECTION">의회 선출</option>
                      <option value="APPOINTMENT">임명</option>
                      <option value="HEREDITARY">세습</option>
                      <option value="COUP">쿠데타 / 혁명</option>
                      <option value="OTHER">기타</option>
                    </CabinetSelectNative>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>퇴임 사유 (선택)</FieldLabel>
                  <FieldControl>
                    <CabinetSelectNative
                      value={editingEndReason}
                      onChange={(e) => setEditingEndReason(e.target.value)}
                    >
                      <option value="">선택 안 함</option>
                      <option value="TERM_COMPLETED">임기 만료</option>
                      <option value="RESIGNATION">사임 / 사퇴</option>
                      <option value="ABDICATION">자진 퇴위</option>
                      <option value="SUCCESSION_TRANSFER">양위 / 선위</option>
                      <option value="REMOVAL">폐위 / 해임</option>
                      <option value="IMPEACHMENT">탄핵</option>
                      <option value="DEATH_IN_OFFICE">재임 중 사망</option>
                      <option value="OVERTHROWN">쿠데타 / 혁명으로 축출</option>
                      <option value="WAR_DEFEAT">전쟁 패배</option>
                      <option value="STATE_DISSOLVED">국가 멸망</option>
                      <option value="OTHER">기타</option>
                    </CabinetSelectNative>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>퇴임 사유 상세</FieldLabel>
                  <FieldControl>
                    <EditingTextarea
                      placeholder="퇴임 배경, 상세 사유 등을 자유롭게 기술하세요."
                      value={editingEndReasonDetail}
                      onChange={(e) =>
                        setEditingEndReasonDetail(e.target.value)
                      }
                      rows={4}
                    />
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>취임 배경 / 비고</FieldLabel>
                  <FieldControl>
                    <EditingTextarea
                      placeholder="취임 배경, 임명 경위 등 특이사항을 기술하세요."
                      value={editingNotes}
                      onChange={(e) => setEditingNotes(e.target.value)}
                      rows={3}
                    />
                  </FieldControl>
                </FieldRow>
              </FormRows>
              <CabinetActions>
                <CabinetCancelBtn type="button" onClick={closeEditCabinetModal}>
                  취소
                </CabinetCancelBtn>
                <SubmitButton
                  type="button"
                  disabled={
                    updatingCabinetId !== null || !editingStartDate.trim()
                  }
                  onClick={handleUpdateCabinet}
                >
                  {updatingCabinetId ? '저장 중…' : '저장'}
                </SubmitButton>
              </CabinetActions>
            </CabinetModalBody>
          </CabinetModalBox>
          {(editStartDatePickerOpen || editEndDatePickerOpen) && (
            <CabinetSubModalLayer>
              <DatePickerModal
                isOpen={editStartDatePickerOpen}
                onClose={() => setEditStartDatePickerOpen(false)}
                onSelect={(date) => {
                  setEditingStartDate(date.slice(0, 10))
                  setEditStartDatePickerOpen(false)
                }}
                initialDate={editingStartDate || undefined}
                title="취임일 선택"
              />
              <DatePickerModal
                isOpen={editEndDatePickerOpen}
                onClose={() => setEditEndDatePickerOpen(false)}
                onSelect={(date) => {
                  setEditingEndDate(date.slice(0, 10))
                  setEditEndDatePickerOpen(false)
                }}
                initialDate={editingEndDate || undefined}
                title="퇴임일 선택"
              />
            </CabinetSubModalLayer>
          )}
        </ModalOverlay>
      )}

      {personSelectOpen && addMinisterCabinet && (
        <>
          <ModalOverlay
            role="dialog"
            aria-modal="true"
            aria-labelledby="minister-select-title"
            onClick={handleCloseMinisterModal}
          >
            <MinisterSelectModalBox onClick={(e) => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle id="minister-select-title">각료 등록</ModalTitle>
                <ModalCloseButton
                  type="button"
                  onClick={handleCloseMinisterModal}
                  aria-label="닫기"
                >
                  <FiX size={22} strokeWidth={2} />
                </ModalCloseButton>
              </ModalHeader>
              <MinisterSelectModalBody>
                <FormRows>
                  <FieldRow>
                    <FieldLabel>
                      인물 <Required aria-label="필수" />
                    </FieldLabel>
                    <FieldControl>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          flexWrap: 'wrap',
                        }}
                      >
                        <MinisterPersonTrigger
                          type="button"
                          onClick={() => setPersonPickerOpen(true)}
                        >
                          <MinisterPersonThumb
                            $hasImage={
                              !!selectedMinisterPerson?.profileImageUrl
                            }
                          >
                            {selectedMinisterPerson?.profileImageUrl ? (
                              <img
                                src={
                                  getUploadImageUrl(
                                    selectedMinisterPerson.profileImageUrl,
                                  ) || selectedMinisterPerson.profileImageUrl
                                }
                                alt=""
                              />
                            ) : (
                              <FiUser size={24} strokeWidth={2} />
                            )}
                          </MinisterPersonThumb>
                          <MinisterPersonLabel
                            className={
                              selectedPersonIdForAdd ? '' : 'placeholder'
                            }
                          >
                            {selectedMinisterPerson
                              ? getPersonName(selectedMinisterPerson)
                              : '인물 선택'}
                          </MinisterPersonLabel>
                          <FiChevronDown
                            size={18}
                            style={{ flexShrink: 0, color: '#94a3b8' }}
                          />
                        </MinisterPersonTrigger>
                        {selectedPersonIdForAdd && (
                          <button
                            type="button"
                            onClick={handleChangePersonForMinister}
                            style={{
                              padding: '6px 12px',
                              fontSize: 13,
                              fontWeight: 500,
                              color: MAIN,
                              background: 'transparent',
                              border: `1px solid ${C.borderMid}`,
                              borderRadius: 8,
                              cursor: 'pointer',
                            }}
                          >
                            변경
                          </button>
                        )}
                      </div>
                    </FieldControl>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>부처 · 행정기구 (선택)</FieldLabel>
                    <FieldControl>
                      <select
                        value={ministerFormDeptId ?? ''}
                        onChange={(e) => {
                          const v = e.target.value
                          setMinisterFormDeptId(v === '' ? null : v)
                          setMinisterFormPositionDefId(null)
                          setMinisterFormTitle('')
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: 14,
                          border: `1px solid ${C.borderMid}`,
                          borderRadius: 10,
                          background: C.inputBg,
                          color: C.text,
                        }}
                      >
                        <option value="">전체 (부처 미지정)</option>
                        {(ministriesForCabinet as any[]).map((dept: any) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                      <p
                        style={{
                          margin: '6px 0 0',
                          fontSize: 12,
                          color: C.textMuted,
                        }}
                      >
                        부처를 선택하면 해당 부처의 직위만 표시됩니다.
                      </p>
                    </FieldControl>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>
                      직위 <Required aria-label="필수" />
                    </FieldLabel>
                    <FieldControl>
                      <select
                        value={ministerFormPositionDefId ?? ''}
                        onChange={(e) => {
                          const v = e.target.value
                          setMinisterFormPositionDefId(v === '' ? null : v)
                          if (!v || v === '__OTHER__') {
                            if (v !== '__OTHER__') setMinisterFormTitle('')
                          } else {
                            const d = ministerPositionOptions.find(
                              (o: any) => o.id === v,
                            )
                            if (d) setMinisterFormTitle('')
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: 14,
                          border: `1px solid ${C.borderMid}`,
                          borderRadius: 10,
                          background: C.inputBg,
                          color: C.text,
                        }}
                      >
                        <option value="">직위 선택</option>
                        {filteredMinisterPositionOptions.map((d: any) => (
                          <option key={d.id} value={d.id}>
                            {d.title ?? d.name ?? d.id}
                          </option>
                        ))}
                        <option value="__OTHER__">기타 (직접 입력)</option>
                      </select>
                      {ministerFormPositionDefId === '__OTHER__' && (
                        <RegisterInput
                          type="text"
                          placeholder="예: 국방장관"
                          value={ministerFormTitle}
                          onChange={(e) => setMinisterFormTitle(e.target.value)}
                          style={{ marginTop: 8, maxWidth: 320 }}
                        />
                      )}
                      <p
                        style={{
                          margin: '8px 0 0',
                          fontSize: 12,
                          color: C.textMuted,
                        }}
                      >
                        교육부 장관·외무대신 등 직위는 행정조직{' '}
                        <strong>직위 정의</strong> 탭에서 등록한 뒤 목록에서
                        선택할 수 있습니다. 없으면 기타(직접 입력)을 사용하세요.
                      </p>
                    </FieldControl>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>대수 (선택)</FieldLabel>
                    <FieldControl>
                      <RegisterInput
                        type="number"
                        min={1}
                        placeholder="예: 1"
                        value={ministerFormTermNumber}
                        onChange={(e) =>
                          setMinisterFormTermNumber(e.target.value)
                        }
                        aria-label="대수"
                        style={{ width: '100%', maxWidth: 96 }}
                      />
                    </FieldControl>
                  </FieldRow>
                  <DateRangeField
                    label="취임일 · 퇴임일"
                    required
                    startValue={ministerFormStartDate}
                    endValue={ministerFormEndDate}
                    onStartChange={setMinisterFormStartDate}
                    onEndChange={setMinisterFormEndDate}
                    startPlaceholder="취임일"
                    endPlaceholder="퇴임일 (선택)"
                    openEndAfterStart
                  />
                </FormRows>
                <MinisterSelectActions>
                  <CabinetCancelBtn
                    type="button"
                    onClick={handleCloseMinisterModal}
                  >
                    취소
                  </CabinetCancelBtn>
                  <SubmitButton
                    type="button"
                    disabled={
                      ministerFormSubmitting ||
                      !selectedPersonIdForAdd ||
                      !ministerFormStartDate.trim() ||
                      (!(
                        ministerFormPositionDefId &&
                        ministerFormPositionDefId !== '__OTHER__'
                      ) &&
                        !ministerFormTitle.trim())
                    }
                    onClick={handleSubmitMinister}
                  >
                    {ministerFormSubmitting ? '처리 중…' : '각료 등록'}
                  </SubmitButton>
                </MinisterSelectActions>
              </MinisterSelectModalBody>
            </MinisterSelectModalBox>
          </ModalOverlay>

          {personPickerOpen && (
            <PersonSelectModal
              persons={personsForMinisterSelect as any[]}
              selectedPersonId={selectedPersonIdForAdd ?? ''}
              onSelect={(personId) => {
                handleSelectPersonForMinister(personId)
                setPersonPickerOpen(false)
              }}
              onClose={() => setPersonPickerOpen(false)}
            />
          )}
        </>
      )}

      {/* 인물 상세 모달 (썸네일/엔티티 클릭 시) — 포스트 상세와 동일한 mentionPersonId 패턴 */}
      <AnimatePresence>
        {mentionPersonId && (
          <PersonViewOverlay
            key="mention-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setMentionPersonId(null)}
            role="presentation"
          >
            <PersonViewModalBox
              key="mention-modal-panel"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader>
                <ModalTitle title={mentionPersonName}>
                  {mentionPersonName || '인물'}
                </ModalTitle>
                <ModalCloseButton
                  type="button"
                  onClick={() => setMentionPersonId(null)}
                  aria-label="닫기"
                >
                  <FiX size={20} strokeWidth={2.5} />
                </ModalCloseButton>
              </ModalHeader>
              <PersonViewModalBody>
                <PersonDetailPanel
                  personId={mentionPersonId}
                  onClose={() => setMentionPersonId(null)}
                  onEdit={() => setMentionPersonId(null)}
                  hideHeaderActions
                  embedInModal
                />
              </PersonViewModalBody>
            </PersonViewModalBox>
          </PersonViewOverlay>
        )}
      </AnimatePresence>

      {/* ── 조약 연결 모달 ── */}
      {showTreatyLinkModal && selectedCabinetId && (
        <TreatyLinkModal
          cabinetId={selectedCabinetId}
          country={country}
          countryId={countryId}
          historicalCountryId={historicalCountryId}
          cabinets={sortedCabinets as any[]}
          allPersons={allPersons as PersonResponseDto[]}
          currentTreaties={cabinetTreaties}
          isDark={isDark}
          onClose={() => setShowTreatyLinkModal(false)}
          onLinked={async () => {
            const updated = await treatyApi.getAll({
              cabinetId: selectedCabinetId,
            })
            setCabinetTreaties(updated.items)
            setShowTreatyLinkModal(false)
          }}
        />
      )}
    </CabinetsSectionRoot>
  )
}

function RegisterCabinetModal({
  registerFlow,
  setRegisterFlow,
  headTenuresForRegister,
  handleRegisterCabinet,
  handleRegisterNewHeadAndCabinet,
  registerCabinetSubmitting,
  setRegisterCabinetModalOpen,
  getPersonName,
  formatDate,
  allPersons,
  headPositionOptions,
  newHeadPersonId,
  setNewHeadPersonId,
  newHeadPositionDefId,
  setNewHeadPositionDefId,
  newHeadTermNumber,
  setNewHeadTermNumber,
  newHeadSubTermNumber,
  setNewHeadSubTermNumber,
  newCabinetName,
  setNewCabinetName,
  newHeadAppointmentMethod,
  setNewHeadAppointmentMethod,
  newHeadEndReason,
  setNewHeadEndReason,
  newHeadEndReasonDetail,
  setNewHeadEndReasonDetail,
  newHeadNotes,
  setNewHeadNotes,
  newHeadStartDate,
  setNewHeadStartDate,
  newHeadEndDate,
  setNewHeadEndDate,
  country,
  registerTargetHistoricalCountryId,
  setRegisterTargetHistoricalCountryId,
  resetNewHeadForm,
}: {
  registerFlow: 'select' | 'new'
  setRegisterFlow: (f: 'select' | 'new') => void
  headTenuresForRegister: any[]
  handleRegisterCabinet: (t: any) => Promise<void>
  handleRegisterNewHeadAndCabinet: () => Promise<void>
  registerCabinetSubmitting: boolean
  setRegisterCabinetModalOpen: (v: boolean) => void
  getPersonName: (p: any) => string
  formatDate: (d: any) => string
  allPersons: any[]
  headPositionOptions: any[]
  newHeadPersonId: string | null
  setNewHeadPersonId: (v: string | null) => void
  newHeadPositionDefId: string | null
  setNewHeadPositionDefId: (v: string | null) => void
  newHeadTermNumber: string
  setNewHeadTermNumber: (v: string) => void
  newHeadSubTermNumber: string
  setNewHeadSubTermNumber: (v: string) => void
  newCabinetName: string
  setNewCabinetName: (v: string) => void
  newHeadAppointmentMethod: string
  setNewHeadAppointmentMethod: (v: string) => void
  newHeadEndReason: string
  setNewHeadEndReason: (v: string) => void
  newHeadEndReasonDetail: string
  setNewHeadEndReasonDetail: (v: string) => void
  newHeadNotes: string
  setNewHeadNotes: (v: string) => void
  newHeadStartDate: string
  setNewHeadStartDate: (v: string) => void
  newHeadEndDate: string
  setNewHeadEndDate: (v: string) => void
  country: UnifiedCountry
  registerTargetHistoricalCountryId: string | null
  setRegisterTargetHistoricalCountryId: (v: string | null) => void
  resetNewHeadForm: () => void
}) {
  const [headTenureFilter, setHeadTenureFilter] = useState('')
  const [personSelectOpen, setPersonSelectOpen] = useState(false)
  const [startDatePickerOpen, setStartDatePickerOpen] = useState(false)
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false)
  const filteredHeadTenures = useMemo(() => {
    const q = headTenureFilter.trim().toLowerCase()
    if (!q) return headTenuresForRegister
    return headTenuresForRegister.filter((t: any) => {
      const name = getPersonName(t.person)
      const title = t.positionDefinition?.title ?? t.title ?? '수반'
      const startStr = formatDate(t.startDate)
      const endStr = t.endDate ? formatDate(t.endDate) : '현재'
      return `${name} ${title} ${startStr} ${endStr}`.toLowerCase().includes(q)
    })
  }, [headTenuresForRegister, headTenureFilter, getPersonName, formatDate])

  const close = () => {
    if (!registerCabinetSubmitting) {
      setRegisterCabinetModalOpen(false)
      setRegisterFlow('select')
      resetNewHeadForm()
    }
  }

  const content = (
    <ModalOverlay
      role="dialog"
      aria-modal="true"
      aria-labelledby="cabinet-modal-title"
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <CabinetModalBox onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle id="cabinet-modal-title">행정부 등록</ModalTitle>
          <ModalCloseButton type="button" onClick={close} aria-label="닫기">
            <FiX size={22} strokeWidth={2} />
          </ModalCloseButton>
        </ModalHeader>
        <CabinetModalBody>
          <CabinetTabWrap>
            <TabNavigation>
              <TabButton
                type="button"
                $active={registerFlow === 'select'}
                onClick={() => setRegisterFlow('select')}
              >
                기존 수반 선택
              </TabButton>
              <TabButton
                type="button"
                $active={registerFlow === 'new'}
                onClick={() => setRegisterFlow('new')}
              >
                새 수반 등록
              </TabButton>
            </TabNavigation>
          </CabinetTabWrap>

          {registerFlow === 'select' ? (
            <>
              <CabinetFormDesc>
                <FiInfo size={20} />
                <span>
                  이 국가의 <strong>수반(국가원수·정부수반) 재임</strong> 중,
                  아직 행정부가 연결되지 않은 재임만 표시됩니다. 항목을 선택하면
                  해당 재임으로 행정부가 생성됩니다.
                </span>
              </CabinetFormDesc>
              {headTenuresForRegister.length === 0 ? (
                <CabinetSelectSection
                  style={{ minHeight: 200, justifyContent: 'center' }}
                >
                  <CabinetEmptyHint>
                    <FiUsers size={44} strokeWidth={1.5} />
                    <span>등록된 수반 재임이 없습니다.</span>
                    <span>
                      <strong>새 수반 등록</strong> 탭에서 먼저 수반을
                      등록하세요.
                    </span>
                  </CabinetEmptyHint>
                </CabinetSelectSection>
              ) : (
                <CabinetSelectSection>
                  <CabinetSelectSectionTitle>
                    수반 재임 목록
                  </CabinetSelectSectionTitle>
                  <CabinetSearchWrap>
                    <CabinetSearchIcon>
                      <FiSearch size={16} />
                    </CabinetSearchIcon>
                    <RegisterInput
                      type="text"
                      placeholder="이름, 직위, 기간 검색"
                      value={headTenureFilter}
                      onChange={(e) => setHeadTenureFilter(e.target.value)}
                      style={{ paddingLeft: 44 }}
                    />
                  </CabinetSearchWrap>
                  <CabinetList>
                    {filteredHeadTenures.length === 0 ? (
                      <li>
                        <CabinetEmptyHint
                          style={{ margin: 0, padding: '36px 24px' }}
                        >
                          <span>
                            {headTenureFilter.trim()
                              ? '검색 결과가 없습니다.'
                              : '목록이 비어 있습니다.'}
                          </span>
                        </CabinetEmptyHint>
                      </li>
                    ) : (
                      filteredHeadTenures.map((t: any) => {
                        const termNum = t.termNumber ?? t.regnalNumber
                        const termLabel =
                          termNum != null
                            ? t.subTermNumber != null
                              ? `제${termNum}대 ${t.subTermNumber}기 `
                              : `제${termNum}대 `
                            : ''
                        const positionTitle =
                          t.positionDefinition?.title ?? t.title ?? '수반'
                        const roleLabel =
                          t.positionType === 'HEAD_OF_STATE'
                            ? '국가원수'
                            : t.positionType === 'HEAD_OF_GOVERNMENT'
                              ? '정부수반'
                              : '수반'
                        return (
                          <li key={t.id}>
                            <CabinetHeadTenureCard
                              type="button"
                              disabled={registerCabinetSubmitting}
                              onClick={() => handleRegisterCabinet(t)}
                            >
                              <CabinetHeadTenureCardMain>
                                <CabinetHeadTenureCardBadge>
                                  {roleLabel}
                                </CabinetHeadTenureCardBadge>
                                <CabinetHeadTenureCardName>
                                  {getPersonName(t.person)} · {termLabel}
                                  {positionTitle}
                                </CabinetHeadTenureCardName>
                                <CabinetHeadTenureCardMeta>
                                  {formatDate(t.startDate)} ~{' '}
                                  {t.endDate ? formatDate(t.endDate) : '현재'}
                                </CabinetHeadTenureCardMeta>
                              </CabinetHeadTenureCardMain>
                              <CabinetHeadTenureCardAction>
                                선택
                                <FiChevronRight size={18} />
                              </CabinetHeadTenureCardAction>
                            </CabinetHeadTenureCard>
                          </li>
                        )
                      })
                    )}
                  </CabinetList>
                </CabinetSelectSection>
              )}
              <CabinetActions style={{ flexShrink: 0 }}>
                <CabinetCancelBtn type="button" onClick={close}>
                  취소
                </CabinetCancelBtn>
              </CabinetActions>
            </>
          ) : (
            <>
              <CabinetFormDesc>
                <FiInfo size={20} />
                <span>
                  핵심 재임 정보와 행정부 정보를 함께 입력하면 동일한 구조로
                  수반 재임과 행정부가 등록됩니다.
                </span>
              </CabinetFormDesc>
              <FormRows>
                {/* 현대국가인 경우: 어느 국가(하위 역사국가 포함)로 등록할지 선택 */}
                {country.type === 'modern' &&
                  Array.isArray(country.historicalCountries) &&
                  country.historicalCountries.length > 0 && (
                    <FieldRow>
                      <FieldLabel>등록 대상 국가</FieldLabel>
                      <FieldControl>
                        <CabinetSelectNative
                          value={registerTargetHistoricalCountryId ?? ''}
                          onChange={(e) =>
                            setRegisterTargetHistoricalCountryId(
                              e.target.value || null,
                            )
                          }
                        >
                          <option value="">{country.name} (현대국가)</option>
                          {country.historicalCountries.map((hc) => (
                            <option key={hc.id} value={hc.id}>
                              {hc.name}
                            </option>
                          ))}
                        </CabinetSelectNative>
                      </FieldControl>
                    </FieldRow>
                  )}
                {/* 역사국가인 경우: 소속 국가 읽기 전용 표시 */}
                {country.type === 'historical' && (
                  <FieldRow>
                    <FieldLabel>등록 대상 국가</FieldLabel>
                    <FieldControl>
                      <CabinetSelectTrigger
                        type="button"
                        $hasValue
                        disabled
                        aria-label="등록 대상 국가"
                        style={{ cursor: 'default' }}
                      >
                        <span>{country.name}</span>
                      </CabinetSelectTrigger>
                    </FieldControl>
                  </FieldRow>
                )}
                <FieldRow>
                  <FieldLabel>대수 (선택)</FieldLabel>
                  <FieldControl>
                    <CabinetTermNumberWrap>
                      <RegisterInput
                        type="number"
                        min={1}
                        placeholder="제 N대"
                        value={newHeadTermNumber}
                        onChange={(e) => setNewHeadTermNumber(e.target.value)}
                        aria-label="대수"
                      />
                    </CabinetTermNumberWrap>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>기수 (선택)</FieldLabel>
                  <FieldControl>
                    <CabinetTermNumberWrap>
                      <RegisterInput
                        type="number"
                        min={1}
                        placeholder="N기 (예: 1, 2)"
                        value={newHeadSubTermNumber}
                        onChange={(e) =>
                          setNewHeadSubTermNumber(e.target.value)
                        }
                        aria-label="기수"
                        title="같은 대수 내 복수 임기 구분 (예: 클린턴 42대 1기/2기)"
                      />
                    </CabinetTermNumberWrap>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>
                    인물 <Required />
                  </FieldLabel>
                  <FieldControl>
                    <CabinetSelectTrigger
                      type="button"
                      $hasValue={!!newHeadPersonId}
                      onClick={() => setPersonSelectOpen(true)}
                      aria-label="수반 인물 선택"
                    >
                      <span>
                        {newHeadPersonId
                          ? getPersonName(
                              allPersons.find(
                                (p: any) => p.id === newHeadPersonId,
                              ),
                            )
                          : '인물 선택'}
                      </span>
                      <FiChevronDown size={18} />
                    </CabinetSelectTrigger>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>
                    직위 (수반) <Required />
                  </FieldLabel>
                  <FieldControl>
                    <CabinetSelectNative
                      value={newHeadPositionDefId ?? ''}
                      onChange={(e) =>
                        setNewHeadPositionDefId(e.target.value || null)
                      }
                      aria-label="직위 선택"
                    >
                      <option value="">선택</option>
                      {headPositionOptions.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {d.title}
                        </option>
                      ))}
                    </CabinetSelectNative>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>
                    취임일 <Required /> / 퇴임일
                  </FieldLabel>
                  <FieldControl $variant="datePair">
                    <DateFieldsRow>
                      <CabinetDateTrigger
                        type="button"
                        $hasValue={!!newHeadStartDate}
                        onClick={() => setStartDatePickerOpen(true)}
                        aria-label="취임일 선택"
                      >
                        <span>
                          {newHeadStartDate
                            ? formatDate(newHeadStartDate)
                            : '취임일 선택'}
                        </span>
                        <FiChevronDown size={18} />
                      </CabinetDateTrigger>
                      <CabinetDateTrigger
                        type="button"
                        $hasValue={!!newHeadEndDate}
                        onClick={() => setEndDatePickerOpen(true)}
                        aria-label="퇴임일 선택"
                      >
                        <span>
                          {newHeadEndDate
                            ? formatDate(newHeadEndDate)
                            : '퇴임일 선택'}
                        </span>
                        <FiChevronDown size={18} />
                      </CabinetDateTrigger>
                    </DateFieldsRow>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>행정부 이름 (선택)</FieldLabel>
                  <FieldControl>
                    <RegisterInput
                      type="text"
                      placeholder="예: 루즈벨트 제1기"
                      value={newCabinetName}
                      onChange={(e) => setNewCabinetName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRegisterNewHeadAndCabinet()
                      }}
                    />
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>임명 방식 (선택)</FieldLabel>
                  <FieldControl>
                    <CabinetSelectNative
                      value={newHeadAppointmentMethod}
                      onChange={(e) =>
                        setNewHeadAppointmentMethod(e.target.value)
                      }
                    >
                      <option value="">선택 안 함</option>
                      <option value="DIRECT_ELECTION">직접 선거</option>
                      <option value="INDIRECT_ELECTION">간접 선거</option>
                      <option value="PARLIAMENTARY_ELECTION">의회 선출</option>
                      <option value="APPOINTMENT">임명</option>
                      <option value="HEREDITARY">세습</option>
                      <option value="COUP">쿠데타 / 혁명</option>
                      <option value="OTHER">기타</option>
                    </CabinetSelectNative>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>퇴임 사유 (선택)</FieldLabel>
                  <FieldControl>
                    <CabinetSelectNative
                      value={newHeadEndReason}
                      onChange={(e) => setNewHeadEndReason(e.target.value)}
                    >
                      <option value="">선택 안 함</option>
                      <option value="TERM_COMPLETED">임기 만료</option>
                      <option value="RESIGNATION">사임 / 사퇴</option>
                      <option value="ABDICATION">자진 퇴위</option>
                      <option value="SUCCESSION_TRANSFER">양위 / 선위</option>
                      <option value="REMOVAL">폐위 / 해임</option>
                      <option value="IMPEACHMENT">탄핵</option>
                      <option value="DEATH_IN_OFFICE">재임 중 사망</option>
                      <option value="OVERTHROWN">쿠데타 / 혁명으로 축출</option>
                      <option value="WAR_DEFEAT">전쟁 패배</option>
                      <option value="STATE_DISSOLVED">국가 멸망</option>
                      <option value="OTHER">기타</option>
                    </CabinetSelectNative>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>퇴임 사유 상세</FieldLabel>
                  <FieldControl>
                    <EditingTextarea
                      placeholder="퇴임 배경, 상세 사유 등을 자유롭게 기술하세요."
                      value={newHeadEndReasonDetail}
                      onChange={(e) =>
                        setNewHeadEndReasonDetail(e.target.value)
                      }
                      rows={4}
                    />
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>취임 배경 / 비고</FieldLabel>
                  <FieldControl>
                    <EditingTextarea
                      placeholder="취임 배경, 임명 경위 등 특이사항을 기술하세요."
                      value={newHeadNotes}
                      onChange={(e) => setNewHeadNotes(e.target.value)}
                      rows={3}
                    />
                  </FieldControl>
                </FieldRow>
              </FormRows>
              <CabinetActions>
                <CabinetCancelBtn type="button" onClick={close}>
                  취소
                </CabinetCancelBtn>
                <SubmitButton
                  type="button"
                  disabled={
                    registerCabinetSubmitting ||
                    !newHeadPersonId ||
                    !newHeadPositionDefId ||
                    !newHeadStartDate.trim()
                  }
                  onClick={() => handleRegisterNewHeadAndCabinet()}
                >
                  {registerCabinetSubmitting ? '등록 중…' : '등록'}
                </SubmitButton>
              </CabinetActions>
            </>
          )}
        </CabinetModalBody>
      </CabinetModalBox>
      {(personSelectOpen || startDatePickerOpen || endDatePickerOpen) && (
        <CabinetSubModalLayer>
          {personSelectOpen && (
            <PersonSelectModal
              persons={allPersons}
              selectedPersonId={newHeadPersonId ?? ''}
              onSelect={(personId, _personName) => {
                setNewHeadPersonId(personId)
                setPersonSelectOpen(false)
              }}
              onClose={() => setPersonSelectOpen(false)}
            />
          )}
          <DatePickerModal
            isOpen={startDatePickerOpen}
            onClose={() => setStartDatePickerOpen(false)}
            onSelect={(date) => {
              setNewHeadStartDate(date)
              setStartDatePickerOpen(false)
            }}
            initialDate={newHeadStartDate || undefined}
            title="취임일 선택"
          />
          <DatePickerModal
            isOpen={endDatePickerOpen}
            onClose={() => setEndDatePickerOpen(false)}
            onSelect={(date) => {
              setNewHeadEndDate(date)
              setEndDatePickerOpen(false)
            }}
            initialDate={newHeadEndDate || undefined}
            title="퇴임일 선택"
          />
        </CabinetSubModalLayer>
      )}
    </ModalOverlay>
  )

  return createPortal(content, document.body)
}

/** 각료로 등록할 인물 선택 모달 — 검색·리스트 UX */
/* 각료 선택 모달 */
const MinisterSelectModalBox = styled(ModalBox)`
  max-width: 920px;
  max-height: 88vh;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`
const MinisterSelectModalBody = styled(ModalBody)`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 20px 24px 24px;
`
/** 인물 등록 모달 썸네일과 동일: 88px 원형, 점선 테두리, 배경·호버 색 */
const MinisterPersonTrigger = styled.button`
  display: flex;
  align-items: center;
  gap: 20px;
  width: 100%;
  padding: 14px 0;
  text-align: left;
  background: transparent;
  border: none;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f3f4f6'};
  border-radius: 0;
  cursor: pointer;

  &:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px rgba(99, 102, 241, 0.35);
  }
`
const MinisterPersonThumb = styled.div<{ $hasImage?: boolean }>`
  width: 88px;
  height: 88px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: ${(p) =>
    p.$hasImage
      ? 'transparent'
      : p.theme.mode === 'dark'
        ? 'rgba(255,255,255,0.07)'
        : 'rgba(226, 232, 240, 0.6)'};
  border: 2px dashed
    ${(p) => (p.$hasImage ? 'transparent' : 'rgba(99, 102, 241, 0.35)')};
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    border-color 0.2s,
    background 0.2s;

  ${MinisterPersonTrigger}:hover & {
    border-color: ${(p) =>
      p.$hasImage ? 'transparent' : 'rgba(99, 102, 241, 0.6)'};
    background: ${(p) =>
      p.$hasImage
        ? 'transparent'
        : p.theme.mode === 'dark'
          ? 'rgba(255,255,255,0.12)'
          : 'rgba(226, 232, 240, 0.9)'};
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  svg {
    color: #94a3b8;
    width: 32px;
    height: 32px;
  }
`
const MinisterPersonLabel = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 500;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
  &.placeholder {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#475569' : '#64748b')};
  }
`
const MinisterSelectActions = styled.div`
  flex-shrink: 0;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f3f4f6'};
  display: flex;
  justify-content: flex-end;
`

/** 행정부 리스트 카드 — 호버·선택 시 시각적 피드백, 가독성 개선 */

/* ── 레이아웃 ── */
const CabinetsSectionRoot = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 0;
`

/* ── 툴바 ── */
const CabSearchWrap = styled.div`
  position: relative;
  flex: 1;
  min-width: 160px;
`
const CabSearchIcon = styled.span`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #b0bac9;
  pointer-events: none;
  display: flex;
  align-items: center;
`
const CabSearchInput = styled.input`
  width: 100%;
  height: 36px;
  border: 1.5px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  border-radius: 10px;
  padding: 0 10px 0 36px;
  font-size: 13px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
  outline: none;
  transition: border-color 0.14s;
  &::placeholder {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#475569' : '#b0bac9')};
  }
  &:focus {
    border-color: #94a3b8;
  }
`
const CabSearchClear = styled.button`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #b0bac9;
  border-radius: 5px;
  &:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f1f5f9'};
  }
`
const CabResultCount = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #b0bac9;
  white-space: nowrap;
`

/* ── 2열 레이아웃 ── */
/* ══════════════════════════════════════════════
   인물 리스트 동일 패턴 레이아웃
   ══════════════════════════════════════════════ */

/* ListRow: flex row, 상세+카드그리드 나란히 */
/* 좌: 상세 패널 — 인물의 DetailPanel */

/* 닫기 버튼 — 상단 bar에 인라인 배치 */

const CabDetailTopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 14px;
  border-bottom: 1.5px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f0f2f7'};
  margin-bottom: 8px;
  flex-shrink: 0;
`

/* 우: 카드 열 — 상세 열리면 고정 너비 2열 그리드, 닫히면 자동채움 */

/* 행정부 등록 버튼 — 우측 고정, accent 스타일 */
const CabRegisterBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: #6366f1;
  border: none;
  border-radius: 9px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition:
    background 0.15s,
    box-shadow 0.15s;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.22);
  &:hover {
    background: #4f46e5;
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.32);
  }
`

/* 카드 그리드 — 상세 열리면 2열 고정, 닫히면 auto-fill */
const CabCardGrid = styled.div<{ $hasDetail?: boolean }>`
  display: grid;
  gap: 16px;
  ${(p) =>
    p.$hasDetail
      ? `
    grid-template-columns: repeat(2, 220px);
    width: max-content;
    padding-right: 4px;
    @media (min-width: 1000px) { grid-template-columns: repeat(2, 240px); }
    @media (max-width: 640px) { grid-template-columns: repeat(2, 140px); gap: 10px; }
  `
      : `
    width: 100%;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    @media (min-width: 900px) { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
    @media (max-width: 640px) { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  `}
`

/* ── 행정부 카드 — 인물 Card 패턴 ── */
const CabCard = styled.div<{ $selected?: boolean; $deleting?: boolean }>`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff'};
  border-radius: 14px;
  padding: 0;
  border: 1px solid
    ${(p) =>
      p.$selected
        ? p.theme.mode === 'dark'
          ? 'rgba(255,255,255,0.25)'
          : '#94a3b8'
        : p.theme.mode === 'dark'
          ? 'rgba(255,255,255,0.08)'
          : '#e8ecf0'};
  box-shadow: ${(p) =>
    p.$selected
      ? '0 0 0 2px rgba(148,163,184,0.2), 0 4px 16px rgba(15,23,42,0.08)'
      : '0 1px 4px rgba(15,23,42,0.04)'};
  transition:
    box-shadow 0.2s ease,
    border-color 0.2s ease;
  position: relative;
  cursor: ${(p) => (p.$deleting ? 'wait' : 'pointer')};
  overflow: hidden;
  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#94a3b8'};
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
  }
`

/* ── 상세 패널 내 각료 섹션 ── */
const CabDetailMinistersSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px 0 32px;
`
const CabDetailMinistersSectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 0;
`
const CabDetailMinistersSectionTitle = styled.h4`
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#374151')};
  letter-spacing: -0.01em;
`

/* ── 각료 테이블 ── */

/* ── 행정부 상세 헤더: 수반 요약 카드 ── */

/* ── 각료 목록 + 각료 상세 영역 ── */

/* ── 각료 상세: 뒤로가기 버튼 ── */
const CabDetailBackBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 4px;
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.14s;
  &:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#cbd5e1' : '#475569')};
  }
`
const CabBreadcrumbSep = styled.span`
  font-size: 11px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#cbd5e1'};
  padding: 12px 0 8px;
  user-select: none;
`

/* ── 각료 상세 패널 (뷰 전환 방식) ── */

/* ── 각료 카드 그리드 ── */
const MinisterCardGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f0f2f7'};
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f0f2f7'};
`
const MinisterCard = styled.div<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: ${(p) =>
    p.$selected
      ? p.theme.mode === 'dark'
        ? 'rgba(99,102,241,0.15)'
        : '#eef2ff'
      : p.theme.mode === 'dark'
        ? 'rgba(255,255,255,0.03)'
        : '#fff'};
  cursor: pointer;
  transition: background 0.12s;
  border-left: ${(p) =>
    p.$selected ? '3px solid #6366f1' : '3px solid transparent'};
  &:first-child {
    border-radius: 12px 12px 0 0;
  }
  &:last-child {
    border-radius: 0 0 12px 12px;
  }
  &:only-child {
    border-radius: 12px;
  }
  &:hover {
    background: ${(p) =>
      p.$selected
        ? p.theme.mode === 'dark'
          ? 'rgba(99,102,241,0.2)'
          : '#e0e7ff'
        : p.theme.mode === 'dark'
          ? 'rgba(255,255,255,0.06)'
          : '#f8fafc'};
  }
`
const MinisterCardThumb = styled.div`
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 1px;
`
const MinisterCardThumbImg = styled.img`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  object-fit: cover;
  object-position: top center;
  display: block;
`
const MinisterCardThumbPlaceholder = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9'};
  border: 1.5px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e9edf5'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#475569' : '#c0cad8')};
`
const MinisterCardInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`
const MinisterCardName = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`
const MinisterCardPos = styled.span`
  font-size: 11px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#64748b')};
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`
const MinisterCardRange = styled.div`
  font-size: 11px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
`
const MinisterCardAge = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  background: #6366f1;
  border-radius: 4px;
  padding: 1px 5px;
`
const MinisterCardLifespan = styled.div`
  font-size: 10.5px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#475569' : '#b0bac9')};
`
const MinisterCardBadge = styled.span`
  position: absolute;
  top: -3px;
  right: -3px;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  background: #334155;
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
  border: 1.5px solid
    ${({ theme }) => (theme.mode === 'dark' ? '#1e293b' : '#fff')};
  line-height: 1;
`
const MinisterCardChevron = styled.span`
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#dde1ea'};
  flex-shrink: 0;
`

/* ── 수반 상세 compact 프로필 블록 ── */
const HeadProfileBlock = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 18px;
  padding: 18px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e8ecf0'};
  border-radius: 14px;
  margin-bottom: 4px;
`
const HeadProfileAvatar = styled.div`
  flex-shrink: 0;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9'};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s;
  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.25)' : '#94a3b8'};
  }
`
const HeadProfileMeta = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`
const HeadProfileNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
`
const HeadTermBadge = styled.span`
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#64748b')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  border-radius: 5px;
  padding: 2px 7px;
  letter-spacing: 0.01em;
  flex-shrink: 0;
`
const HeadProfileName = styled.h3`
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
  letter-spacing: -0.03em;
  line-height: 1.2;
`
const HeadPosBadge = styled.span`
  display: inline-block;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  border-radius: 6px;
  padding: 2px 10px;
  width: fit-content;
`
const HeadTenureRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 2px;
`
const HeadTenureDates = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#64748b')};
  font-weight: 500;
`
const HeadTenureDuration = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#94a3b8')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9'};
  border-radius: 5px;
  padding: 1px 7px;
`
const HeadTenureAge = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#94a3b8')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9'};
  border-radius: 5px;
  padding: 1px 7px;
`
const HeadLifespan = styled.div`
  font-size: 11px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#475569' : '#b0bac9')};
  margin-top: 1px;
`
const HeadProfileActions = styled.div`
  flex-shrink: 0;
  display: flex;
  flex-direction: row;
  gap: 6px;
  align-items: flex-start;
  flex-wrap: wrap;
  justify-content: flex-end;
`
const HeadActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 14px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  border-radius: 9px;
  cursor: pointer;
  transition:
    border-color 0.14s,
    background 0.14s;
  white-space: nowrap;
  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#94a3b8'};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f8fafc'};
  }
`
const HeadActionBtnPrimary = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 14px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  border: none;
  border-radius: 9px;
  cursor: pointer;
  white-space: nowrap;
  transition:
    opacity 0.14s,
    box-shadow 0.14s;
  &:hover {
    opacity: 0.88;
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
  }
`

/* ── 구 배너 스타일 (미사용, 참조용) ── */
const ProfileSection = styled.div`
  padding: 20px 0 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`
const ProfileSectionLabel = styled.div`
  font-size: 10.5px;
  font-weight: 700;
  color: #b0bac9;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  display: flex;
  align-items: center;
  gap: 7px;
`
const ProfileSectionCount = styled.span`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f0f2f7'};
  color: #94a3b8;
  font-size: 10px;
  font-weight: 700;
  border-radius: 10px;
  padding: 1px 7px;
`
const ProfileEmptyNote = styled.div`
  font-size: 13px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#475569' : '#c0cad8')};
  padding: 20px 0;
  text-align: center;
  line-height: 1.7;
`

const MinisterEmptyText = styled.span`
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.5;
`
const EmptyStateBox = styled.div`
  padding: 40px 24px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc'};
  border-radius: 14px;
  border: 1.5px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.6;
  text-align: center;
`
const CabinetEmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 52px 32px;
  margin: 12px 16px;
  text-align: center;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc'};
  border: 1.5px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  border-radius: 16px;
`
const CabinetEmptyIconWrap = styled.div`
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.12)' : '#eef2ff'};
  border: 1.5px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.25)' : '#c7d2fe'};
  color: #6366f1;
  margin-bottom: 4px;
`
const CabinetEmptyTitle = styled.p`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#e2e8f0' : '#1e293b')};
`
const CabinetEmptyDesc = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#94a3b8')};
  max-width: 340px;
  line-height: 1.6;
`
const CardIconButton = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  border-radius: 7px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff'};
  color: #94a3b8;
  cursor: pointer;
  transition:
    background 0.14s,
    color 0.14s,
    border-color 0.14s;
  &:hover:not(:disabled) {
    background: ${(p) =>
      p.$danger
        ? p.theme.mode === 'dark'
          ? 'rgba(220,38,38,0.15)'
          : '#fef2f2'
        : p.theme.mode === 'dark'
          ? 'rgba(255,255,255,0.08)'
          : '#f8fafc'};
    color: ${(p) =>
      p.$danger ? '#dc2626' : p.theme.mode === 'dark' ? '#cbd5e1' : '#475569'};
    border-color: ${(p) =>
      p.$danger
        ? p.theme.mode === 'dark'
          ? 'rgba(220,38,38,0.3)'
          : '#fecaca'
        : p.theme.mode === 'dark'
          ? 'rgba(255,255,255,0.2)'
          : '#94a3b8'};
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`
/* 재임 히스토리 모달 */
const MinisterHistoryModalBox = styled(ModalBox)`
  max-width: min(1080px, 100%);
  max-height: 90vh;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`
const MinisterHistoryModalBody = styled(ModalBody)`
  padding: 20px 24px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
`
const MinisterHistoryTarget = styled.div`
  font-size: 14px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};
  strong {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
  }
`
const MinisterHistorySection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
`
const MinisterHistorySectionTitle = styled.h4`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};
`
const HistoryItemList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
`
const HistoryItem = styled.li`
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc'};
  padding: 10px 12px;
`
const HistoryItemTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
`
const HistoryItemTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
`
const HistoryItemMeta = styled.div`
  margin-top: 4px;
  font-size: 12px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#64748b')};
`
const HistoryItemActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`
const MinisterHistoryActions = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
`
const HistorySecondaryButton = styled.button`
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#64748b')};
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f8fafc'};
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#334155')};
  }
`

/* ——— 부처 상세 패널 (무슨 일을 했고, 직책·담당자) ——— */

/* ── 히스토리 목록 카드 ── */
const HistoryCardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  border-radius: 10px;
  overflow: hidden;
`
const HistoryCardDeleteBtn = styled.button`
  position: absolute;
  right: 34px;
  top: 50%;
  transform: translateY(-50%);
  display: none;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  color: #e11d48;
  cursor: pointer;
  border-radius: 6px;
  padding: 0;
  transition:
    background 0.12s,
    color 0.12s;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(225,29,72,0.15)' : '#fff0f3'};
    color: #be123c;
  }
`
const HistoryCard = styled.div`
  position: relative;
  padding: 12px 58px 12px 14px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff'};
  cursor: pointer;
  transition: background 0.12s;
  &:first-child {
    border-radius: 10px 10px 0 0;
  }
  &:last-child {
    border-radius: 0 0 10px 10px;
  }
  &:only-child {
    border-radius: 10px;
  }
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f8fafc'};
  }
  &:hover ${HistoryCardDeleteBtn} {
    display: flex;
  }
`
const HistoryCardTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
  line-height: 1.35;
  margin-bottom: 3px;
`
const HistoryCardMeta = styled.div`
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
  margin-bottom: 2px;
`
const HistoryCardExcerpt = styled.div`
  font-size: 12px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#64748b')};
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
`
const HistoryCardChevron = styled.span`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#c8d0db'};
  display: flex;
  align-items: center;
`

/* ── 각료 프로필 compact block ── */
const MinisterProfileBlock = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 20px 0 16px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f1f5f9'};
`
const MinisterProfileAvatar = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9'};
  border: 2px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e9edf5'};
  display: flex;
  align-items: center;
  justify-content: center;
`
const MinisterProfileMeta = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`
const MinisterProfileName = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
  letter-spacing: -0.02em;
  line-height: 1.25;
`
const MinisterProfileBadges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-items: center;
`
const MinisterPosBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  border-radius: 5px;
  padding: 2px 7px;
`
const MinisterDeptTag = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#64748b')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9'};
  border-radius: 5px;
  padding: 2px 7px;
`
const MinisterProfileStats = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
`
const MinisterStatItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
`
const MinisterStatAge = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9'};
  border-radius: 4px;
  padding: 1px 6px;
`
const MinisterProfileAction = styled.div`
  flex-shrink: 0;
  align-self: flex-start;
  padding-top: 2px;
`
const MinisterProfileLifespan = styled.div`
  font-size: 11px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#475569' : '#b0bac9')};
  margin-top: 2px;
`
const MinisterEditHistoryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  min-width: max-content;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition:
    background 0.14s,
    border-color 0.14s;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f1f5f9'};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#94a3b8'};
  }
`

/* ── 히스토리 NYT 상세 아티클 ── */
const NYT_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"

const HistoryArticleWrap = styled.div`
  padding: 0 0 48px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'transparent' : '#fff'};
  font-family: ${NYT_FONT};
  display: flex;
  flex-direction: column;
`
const HistoryArticleTopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0 10px;
`
const HistoryArticleBackBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: none;
  font-family: ${NYT_FONT};
  font-size: 12px;
  color: #94a3b8;
  cursor: pointer;
  transition: color 0.15s;
  &:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#cbd5e1' : '#475569')};
  }
`
const HistoryArticleDeleteBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: none;
  background: none;
  font-size: 12px;
  color: #e11d48;
  cursor: pointer;
  border-radius: 6px;
  transition:
    background 0.12s,
    color 0.12s;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(225,29,72,0.15)' : '#fff0f3'};
    color: #be123c;
  }
`
const HistoryArticleEditBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#6b7280')};
  background: none;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s;
  &:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#111827')};
    text-decoration: underline;
  }
`
/* 제목/날짜 영역: 100% width */
const HistoryArticleMetaSection = styled.div`
  padding: 4px 0 12px;
  width: 100%;
  box-sizing: border-box;
`
const HistoryHeadlineRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
`
const HistoryMetaEditBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#6b7280')};
  background: none;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: color 0.15s;
  &:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#111827')};
    text-decoration: underline;
  }
`
const HistoryMetaForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
`
const HistoryMetaInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  font-size: 17px;
  font-weight: 700;
  font-family: ${NYT_FONT};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
  border: 1.5px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  border-radius: 8px;
  outline: none;
  transition: border-color 0.15s;
  &:focus {
    border-color: #64748b;
  }
`
const HistoryMetaDateRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`
const HistoryMetaDateInput = styled.input`
  padding: 7px 10px;
  font-size: 13px;
  font-family: ${NYT_FONT};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
  border: 1.5px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  border-radius: 8px;
  outline: none;
  transition: border-color 0.15s;
  &:focus {
    border-color: #64748b;
  }
`
/* 본문 영역: 가운데 정렬, max-width 680px */
const HistoryArticleInner = styled.div`
  max-width: 720px;
  width: 100%;
  margin: 0 auto;
  padding: 0;
  box-sizing: border-box;
`
const HistoryArticleContentBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
`
const HistoryArticleHeadline = styled.h2`
  font-family: ${NYT_FONT};
  font-size: clamp(18px, 3vw, 24px);
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.02em;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
  margin: 0;
  flex: 1;
  min-width: 0;
`
const HistoryArticleByline = styled.p`
  font-family: ${NYT_FONT};
  font-size: 12px;
  color: #94a3b8;
  margin: 6px 0 0;
  line-height: 1.5;
  font-weight: 500;
`
const HistoryArticleDivider = styled.hr`
  border: none;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f1f5f9'};
  margin: 14px 20px 18px;
`
const HistoryArticleEditorWrap = styled.div`
  width: 100%;
  min-height: 240px;
  margin-bottom: 12px;
`
const HistoryArticleEditActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`
const HistoryArticleCancelBtn = styled.button`
  font-family: ${NYT_FONT};
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#64748b')};
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;
  &:hover:not(:disabled) {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
    text-decoration: underline;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`
const HistoryArticleSaveBtn = styled.button<{ $isRegister?: boolean }>`
  font-family: ${NYT_FONT};
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: ${(p) => (p.$isRegister ? '#059669' : '#6366f1')};
  border: none;
  border-radius: 8px;
  padding: ${(p) => (p.$isRegister ? '9px 18px' : '7px 14px')};
  cursor: pointer;
  transition: background 0.15s;
  &:hover:not(:disabled) {
    background: ${(p) => (p.$isRegister ? '#047857' : '#4f46e5')};
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`
const HistoryArticleProse = styled.div`
  font-family: ${NYT_FONT};
  font-size: 15px;
  line-height: 1.75;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#cbd5e1' : '#1e293b')};
  word-break: break-word;

  p {
    margin: 0 0 1.1em;
  }
  p:last-child {
    margin-bottom: 0;
  }
  strong {
    font-weight: 700;
  }
  em {
    font-style: italic;
  }
  ul,
  ol {
    margin: 10px 0;
    padding-left: 24px;
  }
  li {
    margin-bottom: 5px;
  }
  h1,
  h2,
  h3 {
    font-weight: 700;
    letter-spacing: -0.02em;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
    margin: 1.3em 0 0.45em;
  }
  blockquote {
    margin: 18px 0;
    padding: 10px 18px;
    border-left: 3px solid
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255,255,255,0.15)' : '#e5e7eb'};
    color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};
    font-style: italic;
  }
  hr {
    border: none;
    border-top: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e5e7eb'};
    margin: 20px 0;
  }
  img {
    max-width: 100%;
    border-radius: 8px;
    margin: 14px 0;
  }

  .mention,
  .entity-link {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#818cf8' : '#2563eb')};
    text-decoration: none;
    cursor: pointer;
    border-radius: 2px;
    transition: color 0.15s ease;
  }
  .mention:hover,
  .entity-link:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#1d4ed8')};
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .term {
    color: #0f766e;
    cursor: pointer;
    padding: 0 2px;
    border-radius: 3px;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .term:hover {
    background: rgba(15, 118, 110, 0.08);
  }
`
const HistoryArticleEmpty = styled.p`
  font-family: ${NYT_FONT};
  font-size: 14px;
  color: #94a3b8;
  margin: 0;
  padding: 6px 0 16px;
`

/* ── 인물 상세 모달 ── */
/* 인물 상세 뷰 모달 */
const PersonViewOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 32px 16px;
  overflow-y: auto;
`
const PersonViewModalBox = styled(motion.div)`
  ${({ theme }) => glassCardMixin(theme)}
  max-width: 900px;
  width: 100%;
  max-height: 88vh;
  border-radius: 20px;
  z-index: ${Z_INDEX.MODAL_CONTENT};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`
const PersonViewModalHeader = styled(ModalHeader)`
  padding: 16px 20px;
  flex-shrink: 0;
`
const PersonViewModalTitle = styled(ModalTitle)`
  font-size: 15px;
`
const PersonViewModalBody = styled(ModalBody)`
  overflow-y: auto;
  flex: 1;
`

/* ── 수반 재임 부가정보 (임명방식·퇴임사유·비고) ── */
const HeadTenureInfoSection = styled.div`
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff'};
  border: 1.5px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f0f2f7'};
  border-radius: 12px;
  margin-bottom: 0;
`
const HeadTenureInfoBadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`
const HeadTenureInfoBadge = styled.div<{ $type?: 'appointment' | 'end' }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
`
const HeadTenureInfoBadgeLabel = styled.span`
  font-size: 10px;
  font-weight: 700;
  opacity: 0.6;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`
const HeadTenureInfoRow = styled.div<{ $block?: boolean }>`
  display: ${(p) => (p.$block ? 'block' : 'flex')};
  align-items: ${(p) => (p.$block ? 'unset' : 'flex-start')};
  gap: 8px;
`
const HeadTenureInfoLabel = styled.span`
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  color: #b0bac9;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  min-width: 72px;
  display: block;
  margin-bottom: 2px;
`
const HeadTenureInfoValue = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#cbd5e1' : '#374151')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9'};
  border-radius: 5px;
  padding: 2px 8px;
`
const HeadTenureInfoText = styled.p`
  margin: 0;
  font-size: 12.5px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
`

/** SidePanel 본문 상단: 모드 탭을 스크롤 영역 맨 위에 고정(헤더 바로 아래) */
const TreatySidePanelTabBarWrap = styled.div`
  position: sticky;
  top: 0;
  z-index: 3;
  margin: -22px -28px 14px -28px;
  width: calc(100% + 56px);
  box-sizing: border-box;
`

/** 조약 패널 하단(또는 헤더) 주요 버튼 — 등록·연결·수정 */
const TreatyPanelPrimaryBtn = styled.button`
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 10px;
  cursor: pointer;
  border: none;
  background: ${MAIN};
  color: #fff;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(99, 102, 241, 0.35);
  transition: background 0.15s ease;

  &:hover:not(:disabled) {
    background: ${MAIN_HOVER};
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

const TreatyPanelFooterBar = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin: 0 -24px -16px;
  padding: 16px 24px calc(16px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(15, 15, 18, 0.88)'
      : 'rgba(248, 250, 252, 0.97)'};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  box-shadow: 0 -10px 32px rgba(15, 23, 42, 0.08);
`

const TreatyListSkeletonPulse = styled.div`
  height: 52px;
  border-radius: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#e2e8f0'};
  animation: treatySk 1.1s ease-in-out infinite;
  @keyframes treatySk {
    0%,
    100% {
      opacity: 0.55;
    }
    50% {
      opacity: 1;
    }
  }
`

/** 조약 폼: 직접 입력 ↔ DB 등 한쪽만 보일 때 모드 전환 */
const TreatyFieldModeRow = styled.div`
  display: flex;
  gap: 0;
  margin-bottom: 12px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  width: fit-content;
  max-width: 100%;
  flex-wrap: wrap;
`
const TreatyFieldModeBtn = styled.button<{ $active?: boolean }>`
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  background: ${(p) =>
    p.$active
      ? p.theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.22)'
        : '#eef2ff'
      : 'transparent'};
  color: ${(p) =>
    p.$active ? '#4f46e5' : p.theme.colors.text.secondary};
  transition:
    background 0.15s ease,
    color 0.15s ease;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const TreatySubSectionTitle = styled.h3`
  margin: 0;
  padding: 4px 0 0;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
  &:not(:first-of-type) {
    margin-top: 8px;
    padding-top: 20px;
    border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  }
`

const TreatyFormSelect = styled.select`
  width: 100%;
  max-width: 360px;
  padding: 12px 14px;
  font-size: 14px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  color: ${({ theme }) => theme.colors.text.primary};
  outline: none;
  cursor: pointer;
  &:focus {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
`

const TreatyListRow = styled.button<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  text-align: left;
  border-radius: 12px;
  border: 1.5px solid
    ${({ $selected, theme }) =>
      $selected
        ? '#6366f1'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.1)'
          : theme.colors.border.light};
  background: ${({ $selected, theme }) =>
    $selected
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.12)'
        : '#eef2ff'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : '#fafbff'};
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
  &:hover {
    border-color: #a5b4fc;
  }
`

/** 조약 모달 상단: 새 조약 / 기존 연결 — Pill 탭과 구분되는 언더라인 탭 */
const TreatyModeTabBar = styled.div`
  display: flex;
  gap: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  padding: 0 8px 0 24px;
  flex-shrink: 0;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc'};
`

const TreatyModeTab = styled.button<{ $active?: boolean }>`
  padding: 14px 22px;
  font-size: 14px;
  font-weight: ${(p) => (p.$active ? 700 : 500)};
  color: ${(p) =>
    p.$active ? '#4f46e5' : p.theme.mode === 'dark' ? '#94a3b8' : '#64748b'};
  background: none;
  border: none;
  border-bottom: 3px solid ${(p) => (p.$active ? '#6366f1' : 'transparent')};
  margin-bottom: -1px;
  cursor: pointer;
  transition:
    color 0.15s ease,
    border-color 0.15s ease;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

/** 다자 조약 서명국 한 행 */
const SignatoryRowCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 14px;
  padding: 16px 18px 8px;
  margin-bottom: 16px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fafbff'};
`

const SignatoryRowHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 4px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

/** 서명·참여 탭: 다자 조약 입력 예시 (접이식) */
const TreatyExampleSummary = styled.summary`
  cursor: pointer;
  list-style: none;
  padding: 12px 14px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 10px;
  user-select: none;

  &::-webkit-details-marker {
    display: none;
  }

  &:hover {
    filter: brightness(1.04);
  }

  svg {
    flex-shrink: 0;
    color: #6366f1;
    transition: transform 0.2s ease;
  }
`

const TreatyExamplePanel = styled.details`
  margin: 0 0 16px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.1)' : '#f5f3ff'};
  overflow: hidden;

  &[open] ${TreatyExampleSummary} svg {
    transform: rotate(180deg);
  }
`

const TreatyExampleBody = styled.div`
  padding: 0 14px 14px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const TreatyExampleScrollWrap = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`

const TreatyExampleTable = styled.table`
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
  font-size: 12.5px;
  line-height: 1.45;

  th,
  td {
    padding: 8px 10px;
    text-align: left;
    vertical-align: top;
    border-bottom: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  th {
    font-weight: 600;
    font-size: 11.5px;
    text-transform: none;
    letter-spacing: 0;
    color: ${({ theme }) => theme.colors.text.secondary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc'};
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  caption {
    caption-side: bottom;
    padding-top: 10px;
    font-size: 11.5px;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.secondary};
    text-align: left;
    line-height: 1.5;
  }
`

/** 짧은 필드(유형 등) — 가로 폭 제한 */
const TreatyFieldNarrow = styled(FieldControl)`
  max-width: 280px;
`

/** 긴 한 줄 입력(장소 등) */
const TreatyFieldWide = styled(FieldControl)`
  max-width: 520px;
`

/** 서명 장소·서술 등 — 폼 열 전체 너비 */
const TreatyFullWidthFieldControl = styled(FieldControl)`
  max-width: 100%;
  width: 100%;
`

/** 조약 모달 — 관직 정의 목록 (getPositionDefinitions 응답) */
type TreatyPositionDefinitionItem = {
  id: string
  title: string
  titleEn?: string | null
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 조약 연결 모달 — 인물 등록 폼과 동일 FieldRow 레이아웃 + 조약·서명 정보 전체 입력
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface TreatyLinkModalProps {
  cabinetId: string
  country: UnifiedCountry
  countryId?: string | null
  historicalCountryId?: string | null
  cabinets: any[]
  allPersons: PersonResponseDto[]
  currentTreaties: TreatyDto[]
  isDark: boolean
  onClose: () => void
  onLinked: () => Promise<void>
}

function TreatyLinkModal({
  cabinetId,
  country,
  countryId,
  historicalCountryId,
  cabinets,
  allPersons,
  currentTreaties,
  isDark,
  onClose,
  onLinked,
}: TreatyLinkModalProps) {
  type TreatyDateField =
    | 'signDate'
    | 'effectiveDate'
    | 'expiryDate'
    | 'violationDate'
  type DatePickerCtx =
    | { kind: 'treaty'; field: TreatyDateField }
    | { kind: 'signedAt'; rowIndex: number }
    | null

  type DraftSignatoryRow = {
    id: string
    countryId: string | null
    historicalCountryId: string | null
    countryLabel: string
    cabinetId: string | null
    personId: string | null
    /** 행정부 관직 정의 (선택) */
    positionDefinitionId: string | null
    /** 직책 직접 입력 (선택, 마스터와 병행 가능) */
    role: string
    /** UI: 관직 정의 ↔ 직접 입력 — 한쪽만 표시 */
    positionInputMode: 'definition' | 'free'
    participationType: TreatyParticipationType
    signedAt: string
    note: string
  }

  const makeSignatoryRow = React.useCallback((): DraftSignatoryRow => {
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    return {
      id,
      countryId: countryId ?? null,
      historicalCountryId: historicalCountryId ?? null,
      countryLabel: country.name,
      cabinetId,
      personId: null,
      positionDefinitionId: null,
      role: '',
      positionInputMode: 'definition',
      participationType: 'SIGNATORY',
      signedAt: '',
      note: '',
    }
  }, [cabinetId, country.name, countryId, historicalCountryId])

  const [tab, setTab] = React.useState<'link' | 'new'>('new')
  const [newSubTab, setNewSubTab] = React.useState<
    'basic' | 'dates' | 'narrative' | 'signatory'
  >('basic')
  const [datePickerContext, setDatePickerContext] =
    React.useState<DatePickerCtx>(null)
  const [personPickerRowIndex, setPersonPickerRowIndex] = React.useState<
    number | null
  >(null)
  const [countryPickerRowIndex, setCountryPickerRowIndex] = React.useState<
    number | null
  >(null)
  const [positionPickerRowIndex, setPositionPickerRowIndex] = React.useState<
    number | null
  >(null)
  /** 서명 장소 행정구역 — 국가(현대) 기준 목록 */
  const [signingVenueCountryId, setSigningVenueCountryId] = React.useState('')
  const [signingAdministrativeDivisionId, setSigningAdministrativeDivisionId] =
    React.useState<string | null>(null)
  const [signingAdminDivisionLabel, setSigningAdminDivisionLabel] =
    React.useState('')
  const [signingAdminDivisions, setSigningAdminDivisions] = React.useState<
    AdministrativeDivision[]
  >([])
  const [showSigningVenueCountryModal, setShowSigningVenueCountryModal] =
    React.useState(false)
  const [showSigningDivisionModal, setShowSigningDivisionModal] =
    React.useState(false)
  /** 서명 장소: 직접 입력 ↔ 행정구역 DB — 한쪽만 표시 */
  const [signingVenueInputMode, setSigningVenueInputMode] = React.useState<
    'text' | 'division'
  >('text')

  const [signatoryRows, setSignatoryRows] = React.useState<DraftSignatoryRow[]>(
    () => [makeSignatoryRow()],
  )

  const { data: treatyModernCountries = [] } = useQuery({
    queryKey: ['treaty-modal-countries'],
    queryFn: () => getAllCountries(),
    staleTime: 60_000,
  })
  const { data: treatyHistoricalCountries = [] } = useQuery({
    queryKey: ['treaty-modal-hist-countries'],
    queryFn: () => getAllHistoricalCountries(),
    staleTime: 60_000,
  })
  const { data: treatyPositionDefinitions = [] } = useQuery<
    TreatyPositionDefinitionItem[]
  >({
    queryKey: [
      'treaty-modal-position-definitions',
      countryId,
      historicalCountryId,
    ],
    queryFn: () =>
      personCareerApi.getPositionDefinitions({
        countryId: countryId || undefined,
        historicalCountryId: historicalCountryId || undefined,
      }) as Promise<TreatyPositionDefinitionItem[]>,
    staleTime: 60_000,
  })

  const [allTreaties, setAllTreaties] = React.useState<TreatyDto[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQ, setSearchQ] = React.useState('')
  const debouncedSearchQ = useDebouncedValue(searchQ, 280)
  const [linking, setLinking] = React.useState(false)
  const [treatyCloseConfirmOpen, setTreatyCloseConfirmOpen] =
    React.useState(false)
  const [selectedTreatyForLink, setSelectedTreatyForLink] =
    React.useState<TreatyDto | null>(null)

  /** 기존 조약 연결: 현재 국가 1행만 사용 */
  React.useEffect(() => {
    if (tab !== 'link') return
    setSignatoryRows(() => [
      {
        ...makeSignatoryRow(),
        countryId: countryId ?? null,
        historicalCountryId: historicalCountryId ?? null,
        countryLabel: country.name,
        cabinetId,
      },
    ])
  }, [
    tab,
    countryId,
    historicalCountryId,
    cabinetId,
    country.name,
    makeSignatoryRow,
  ])

  React.useEffect(() => {
    setSignatoryRows((rows) => {
      if (rows.length === 0) return [makeSignatoryRow()]
      const [first, ...rest] = rows
      if (tab === 'link') return rows
      const matchesContext =
        country.type === 'modern'
          ? first.countryId === countryId && !first.historicalCountryId
          : first.historicalCountryId === historicalCountryId
      if (matchesContext && first.cabinetId !== cabinetId) {
        return [{ ...first, cabinetId }, ...rest]
      }
      return rows
    })
  }, [
    cabinetId,
    country.type,
    countryId,
    historicalCountryId,
    makeSignatoryRow,
    tab,
  ])

  const [name, setName] = React.useState('')
  const [alias, setAlias] = React.useState('')
  const [type, setType] = React.useState<TreatyType>('NON_AGGRESSION')
  const [signDate, setSignDate] = React.useState('')
  const [effectiveDate, setEffectiveDate] = React.useState('')
  const [expiryDate, setExpiryDate] = React.useState('')
  const [violationDate, setViolationDate] = React.useState('')
  const [violationReason, setViolationReason] = React.useState('')
  const [location, setLocation] = React.useState('')
  const [summary, setSummary] = React.useState('')
  const [background, setBackground] = React.useState('')
  const [aftermath, setAftermath] = React.useState('')
  const [creating, setCreating] = React.useState(false)

  React.useEffect(() => {
    if (countryId && country.type === 'modern') {
      setSigningVenueCountryId(countryId)
    }
  }, [countryId, country.type])

  React.useEffect(() => {
    if (!signingVenueCountryId) {
      setSigningAdminDivisions([])
      return
    }
    cityApi
      .getAdministrativeDivisions(signingVenueCountryId)
      .then(setSigningAdminDivisions)
      .catch(() => setSigningAdminDivisions([]))
  }, [signingVenueCountryId])

  const formatIsoDateLabel = (iso: string) => {
    if (!iso?.trim()) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  React.useEffect(() => {
    setLoading(true)
    treatyApi
      .getAll(
        countryId
          ? { countryId }
          : historicalCountryId
            ? { historicalCountryId }
            : {},
      )
      .then((r) => setAllTreaties(r.items))
      .catch(() => setAllTreaties([]))
      .finally(() => setLoading(false))
  }, [countryId, historicalCountryId])

  const linkedIds = new Set(currentTreaties.map((t) => t.id))
  const filtered = allTreaties
    .filter((t) => !linkedIds.has(t.id))
    .filter((t) => {
      const q = debouncedSearchQ.trim().toLowerCase()
      if (!q) return true
      return (
        t.name.toLowerCase().includes(q) ||
        (t.alias ?? '').toLowerCase().includes(q)
      )
    })

  /** 직위: 관직 정의(DB) ↔ 당시 호칭(직접 입력) 둘 중 하나만 전송 */
  const rowToApiPayload = (row: DraftSignatoryRow) => {
    const roleTrim = row.role.trim()
    let positionDefinitionId: string | null = null
    let role: string | null = null
    if (row.positionInputMode === 'definition') {
      positionDefinitionId = row.positionDefinitionId
      role = null
    } else if (roleTrim) {
      role = roleTrim
      positionDefinitionId = null
    }
    return {
      personId: row.personId || null,
      cabinetId: row.cabinetId || null,
      positionDefinitionId,
      role,
      participationType: row.participationType,
      signedAt: row.signedAt || null,
      note: row.note.trim() || null,
    }
  }

  const handleLink = async () => {
    if (!selectedTreatyForLink) {
      toast.error('목록에서 조약을 선택하세요.')
      return
    }
    const row = signatoryRows[0]
    if (!row || (!row.countryId && !row.historicalCountryId)) {
      toast.error('서명국 정보를 확인하세요.')
      return
    }
    setLinking(true)
    try {
      const treaty = selectedTreatyForLink
      const existing = treaty.signatories?.find(
        (s) =>
          (row.countryId && s.countryId === row.countryId) ||
          (row.historicalCountryId &&
            s.historicalCountryId === row.historicalCountryId),
      )
      const payload = rowToApiPayload(row)
      if (existing) {
        await treatyApi.updateSignatory(existing.id, payload)
      } else {
        await treatyApi.addSignatory({
          treatyId: treaty.id,
          countryId: row.countryId ?? undefined,
          historicalCountryId: row.historicalCountryId ?? undefined,
          ...payload,
        })
      }
      toast.success(`'${treaty.name}' 조약에 연결되었습니다.`)
      await onLinked()
    } catch (e) {
      toast.error(getApiErrorMessage(e, '조약 연결에 실패했습니다.'))
    } finally {
      setLinking(false)
    }
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      setNewSubTab('basic')
      toast.error('조약명을 입력하세요.')
      return
    }
    if (!signDate.trim()) {
      setNewSubTab('dates')
      toast.error('서명일을 선택하세요.')
      return
    }
    for (const row of signatoryRows) {
      if (!row.countryId && !row.historicalCountryId) {
        setNewSubTab('signatory')
        toast.error(
          '각 서명국에 국가를 선택하세요. (다자 조약은 서명국 행을 여러 개 추가하세요)',
        )
        return
      }
    }
    setCreating(true)
    try {
      const loc = location.trim()
      const divId = signingAdministrativeDivisionId
      /** 서명 장소: 직접 입력 ↔ 행정구역 DB 둘 중 하나 (직접 입력이 있으면 텍스트 우선) */
      const locationPayload = loc ? loc : null
      const signingDivPayload = loc ? null : divId || null

      await treatyApi.create({
        name: name.trim(),
        alias: alias.trim() || null,
        type,
        signDate,
        effectiveDate: effectiveDate || null,
        expiryDate: expiryDate || null,
        violationDate: violationDate || null,
        violationReason: violationReason.trim() || null,
        location: locationPayload,
        signingAdministrativeDivisionId: signingDivPayload,
        summary: summary.trim() || null,
        background: background.trim() || null,
        aftermath: aftermath.trim() || null,
        signatories: signatoryRows.map((row) => ({
          countryId: row.countryId ?? undefined,
          historicalCountryId: row.historicalCountryId ?? undefined,
          ...rowToApiPayload(row),
        })),
      })
      toast.success(
        `조약이 등록되었습니다. 서명국 ${signatoryRows.length}건이 저장되었습니다.`,
      )
      await onLinked()
    } catch (e) {
      toast.error(getApiErrorMessage(e, '등록 중 오류가 발생했습니다.'))
    } finally {
      setCreating(false)
    }
  }

  const treatyFormIsDirty = () =>
    Boolean(
      name.trim() ||
        signDate.trim() ||
        alias.trim() ||
        location.trim() ||
        summary.trim() ||
        background.trim() ||
        aftermath.trim() ||
        effectiveDate ||
        expiryDate ||
        violationDate ||
        violationReason.trim() ||
        signingAdministrativeDivisionId,
    ) ||
    signatoryRows.some(
      (r) =>
        r.personId ||
        r.role.trim() ||
        r.note.trim() ||
        r.signedAt ||
        r.positionDefinitionId,
    )

  const handleTreatyPanelClose = () => {
    if (tab === 'new' && treatyFormIsDirty()) {
      setTreatyCloseConfirmOpen(true)
      return
    }
    onClose()
  }

  /** 기존 조약 연결: 해당 국가 서명 행이 이미 있으면 서명국 수정, 없으면 추가 */
  const linkExistingSignatory = React.useMemo(() => {
    if (tab !== 'link' || !selectedTreatyForLink) return null
    const row = signatoryRows[0]
    if (!row || (!row.countryId && !row.historicalCountryId)) return null
    return (
      selectedTreatyForLink.signatories?.find(
        (s) =>
          (row.countryId && s.countryId === row.countryId) ||
          (row.historicalCountryId &&
            s.historicalCountryId === row.historicalCountryId),
      ) ?? null
    )
  }, [tab, selectedTreatyForLink, signatoryRows])

  const cabinetLabel = (c: any) => {
    const head = c?.headTenure
    const tn = head?.termNumber ?? head?.regnalNumber
    const sub = head?.subTermNumber
    const term =
      tn != null ? (sub != null ? `제${tn}대 ${sub}기` : `제${tn}대`) : ''
    const pn = head?.person ? getPersonName(head.person) : ''
    const nm = c?.name?.trim()
    return [nm, term, pn].filter(Boolean).join(' · ') || '행정부'
  }

  const pickerInitialDate = (): string | undefined => {
    if (!datePickerContext) return undefined
    if (datePickerContext.kind === 'treaty') {
      const v = {
        signDate,
        effectiveDate,
        expiryDate,
        violationDate,
      }[datePickerContext.field]
      return v?.trim() || undefined
    }
    const row = signatoryRows[datePickerContext.rowIndex]
    return row?.signedAt?.trim() || undefined
  }

  const pickerTitle = !datePickerContext
    ? '날짜 선택'
    : datePickerContext.kind === 'treaty'
      ? datePickerContext.field === 'signDate'
        ? '서명일 선택'
        : datePickerContext.field === 'effectiveDate'
          ? '발효일 선택'
          : datePickerContext.field === 'expiryDate'
            ? '만료일 선택'
            : '파기일 선택'
      : '국가별 서명일 선택'

  const applyPickerDate = (iso: string) => {
    const d = iso.slice(0, 10)
    if (!datePickerContext) return
    if (datePickerContext.kind === 'treaty') {
      switch (datePickerContext.field) {
        case 'signDate':
          setSignDate(d)
          break
        case 'effectiveDate':
          setEffectiveDate(d)
          break
        case 'expiryDate':
          setExpiryDate(d)
          break
        case 'violationDate':
          setViolationDate(d)
          break
        default:
          break
      }
    } else {
      const i = datePickerContext.rowIndex
      setSignatoryRows((rows) => {
        const next = [...rows]
        const cur = next[i]
        if (cur) next[i] = { ...cur, signedAt: d }
        return next
      })
    }
    setDatePickerContext(null)
  }

  const isRowCurrentContextCountry = (row: DraftSignatoryRow) =>
    country.type === 'modern'
      ? row.countryId === countryId && !row.historicalCountryId
      : row.historicalCountryId === historicalCountryId && !row.countryId

  const updateRow = (index: number, patch: Partial<DraftSignatoryRow>) => {
    setSignatoryRows((rows) => {
      const next = [...rows]
      const cur = next[index]
      if (!cur) return rows
      next[index] = { ...cur, ...patch }
      return next
    })
  }

  const signatoryFormRows = (
    <>
      <TreatyExamplePanel>
        <TreatyExampleSummary>
          <FiChevronDown size={18} aria-hidden />
          <span>어디서 뭘 등록하나요? (예: 독소 불가침 조약)</span>
        </TreatyExampleSummary>
        <TreatyExampleBody>
          <TreatyExampleScrollWrap>
            <TreatyExampleTable>
              <caption>
                <strong>다른 화면</strong>에서 미리 만들어 두는 것과,{' '}
                <strong>이 화면</strong>에서만 다루는 것을 구분했습니다.
              </caption>
              <thead>
                <tr>
                  <th scope="col">구분</th>
                  <th scope="col">어디서?</th>
                  <th scope="col">독소 불가침 조약 예시</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>인물(몰로토프, 리벤트로프 등)</td>
                  <td>
                    인물 등록·인물 목록 — <strong>이 조약 화면이 아님</strong>
                  </td>
                  <td>
                    인물 DB에 등록된 뒤, 아래에서 「인물 선택」으로만 연결
                  </td>
                </tr>
                <tr>
                  <td>직책 마스터(외무장관 등)</td>
                  <td>
                    직책(직업) 테이블 — <strong>이 조약 화면이 아님</strong>
                  </td>
                  <td>
                    「직책에서 선택」으로 고르거나, 옆 칸에 당시 호칭을 직접
                    적음
                  </td>
                </tr>
                <tr>
                  <td>조약 자체·서명 행</td>
                  <td>
                    <strong>이 화면</strong> (새 조약 등록 →
                    기본·일정·서명·참여)
                  </td>
                  <td>
                    조약명·서명일·모스크바 서명 등은 여기서 입력. 소련 행·독일
                    행을 각각 한 줄씩 추가
                  </td>
                </tr>
              </tbody>
            </TreatyExampleTable>
          </TreatyExampleScrollWrap>
        </TreatyExampleBody>
      </TreatyExamplePanel>

      {signatoryRows.map((row, rowIndex) => {
        const selectedPerson =
          row.personId != null
            ? (allPersons.find((p) => p.id === row.personId) ?? null)
            : null
        const showCabinetList = isRowCurrentContextCountry(row)
        const isLinkSingle = tab === 'link'
        return (
          <SignatoryRowCard key={row.id}>
            <SignatoryRowHead>
              <span>
                서명국 {rowIndex + 1}
                {row.countryLabel ? ` · ${row.countryLabel}` : ''}
              </span>
              {!isLinkSingle && signatoryRows.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setSignatoryRows((rows) =>
                      rows.filter((_, i) => i !== rowIndex),
                    )
                  }
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#b91c1c',
                    background: 'transparent',
                    border: '1px solid rgba(185,28,28,0.35)',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  <FiTrash2 size={13} />행 삭제
                </button>
              ) : null}
            </SignatoryRowHead>

            <FieldRow>
              <FieldLabel>소속 국가</FieldLabel>
              <FieldControl>
                {isLinkSingle ? (
                  <>
                    <RegisterInput readOnly value={row.countryLabel} />
                    <FieldHint>
                      기존 조약 연결은 현재 국가·행정부 맥락만 다룹니다.
                    </FieldHint>
                  </>
                ) : (
                  <>
                    <CabinetSelectTrigger
                      type="button"
                      onClick={() => setCountryPickerRowIndex(rowIndex)}
                      $hasValue={!!row.countryLabel}
                    >
                      <FiGlobe size={18} />
                      <span>{row.countryLabel || '국가 선택'}</span>
                      <FiChevronDown size={18} />
                    </CabinetSelectTrigger>
                    <FieldHint>각 참여국마다 한 행씩 추가하세요.</FieldHint>
                  </>
                )}
              </FieldControl>
            </FieldRow>

            <FieldRow>
              <FieldLabel>소속 행정부</FieldLabel>
              <FieldControl>
                {showCabinetList ? (
                  <TreatyFormSelect
                    value={row.cabinetId ?? ''}
                    onChange={(e) =>
                      updateRow(rowIndex, {
                        cabinetId: e.target.value || null,
                      })
                    }
                  >
                    <option value="">선택 안 함</option>
                    {cabinets.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {cabinetLabel(c)}
                      </option>
                    ))}
                  </TreatyFormSelect>
                ) : (
                  <RegisterInput
                    readOnly
                    value={
                      row.cabinetId
                        ? '다른 국가 행정부 — 조약 상세에서 지정 가능'
                        : '이 국가가 아니면 행정부는 비워 두거나 조약 상세에서 지정'
                    }
                  />
                )}
                <FieldHint>
                  현재 화면 국가와 일치할 때만 이 국가의 행정부 목록을
                  불러옵니다.
                </FieldHint>
              </FieldControl>
            </FieldRow>

            <PersonSelectField
              label="서명·대표 인물"
              hint="해당 국가 기준 서명·대표 인물."
              value={row.personId ?? ''}
              selectedPerson={selectedPerson}
              persons={allPersons}
              isModalOpen={personPickerRowIndex === rowIndex}
              onModalOpenChange={(open) =>
                setPersonPickerRowIndex(open ? rowIndex : null)
              }
              onSelect={(id) => updateRow(rowIndex, { personId: id || null })}
              placeholder="인물 선택"
            />

            <FieldRow>
              <FieldLabel>서명 대표 직위</FieldLabel>
              <FieldControl>
                <TreatyFieldModeRow
                  role="group"
                  aria-label="직위 입력 방식"
                >
                  <TreatyFieldModeBtn
                    type="button"
                    $active={row.positionInputMode === 'definition'}
                    onClick={() =>
                      updateRow(rowIndex, {
                        positionInputMode: 'definition',
                        role: '',
                      })
                    }
                  >
                    관직 정의 (DB)
                  </TreatyFieldModeBtn>
                  <TreatyFieldModeBtn
                    type="button"
                    $active={row.positionInputMode === 'free'}
                    onClick={() =>
                      updateRow(rowIndex, {
                        positionInputMode: 'free',
                        positionDefinitionId: null,
                      })
                    }
                  >
                    당시 직명·호칭 (직접 입력)
                  </TreatyFieldModeBtn>
                </TreatyFieldModeRow>
                {row.positionInputMode === 'definition' ? (
                  <>
                    <CabinetSelectTrigger
                      type="button"
                      onClick={() => setPositionPickerRowIndex(rowIndex)}
                      $hasValue={!!row.positionDefinitionId}
                    >
                      <FiLayers size={18} />
                      <span>
                        {row.positionDefinitionId
                          ? (treatyPositionDefinitions.find(
                              (d) => d.id === row.positionDefinitionId,
                            )?.title ?? '직위')
                          : '관직 정의에서 선택'}
                      </span>
                      <FiChevronDown size={18} />
                    </CabinetSelectTrigger>
                    <FieldHint>
                      연대표·각료와 동일한 <strong>관직 정의</strong> 목록입니다.
                      다른 표기가 필요하면 위에서 「직접 입력」을 선택하세요.
                    </FieldHint>
                  </>
                ) : (
                  <>
                    <TreatyFieldWide>
                      <RegisterInput
                        value={row.role}
                        onChange={(e) => {
                          const v = e.target.value
                          updateRow(rowIndex, {
                            role: v,
                            positionInputMode: 'free',
                            ...(v.trim() ? { positionDefinitionId: null } : {}),
                          })
                        }}
                        placeholder="예: 외무인민위원, 인민위원회 외무상 (당시 표기 그대로)"
                      />
                    </TreatyFieldWide>
                    <FieldHint>
                      관직 정의에 없는 당시 호칭만 적습니다. DB 직위를 쓰려면 위에서
                      「관직 정의」를 선택하세요.
                    </FieldHint>
                  </>
                )}
              </FieldControl>
            </FieldRow>
            <FieldRow>
              <FieldLabel>참여 유형</FieldLabel>
              <TreatyFieldNarrow>
                <TreatyFormSelect
                  value={row.participationType}
                  onChange={(e) =>
                    updateRow(rowIndex, {
                      participationType: e.target
                        .value as TreatyParticipationType,
                    })
                  }
                >
                  {(
                    Object.entries(TREATY_PARTICIPATION_LABELS) as [
                      TreatyParticipationType,
                      string,
                    ][]
                  ).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </TreatyFormSelect>
              </TreatyFieldNarrow>
            </FieldRow>
            <FieldRow>
              <FieldLabel>이 국가 기준 서명일</FieldLabel>
              <FieldControl $variant="datePair">
                <DateFieldsRow style={{ maxWidth: '100%' }}>
                  <DateFieldBtn
                    type="button"
                    onClick={() =>
                      setDatePickerContext({
                        kind: 'signedAt',
                        rowIndex,
                      })
                    }
                    $hasValue={!!row.signedAt}
                  >
                    <FiCalendar size={16} />
                    <span>
                      {row.signedAt
                        ? formatIsoDateLabel(row.signedAt)
                        : '서명일 (달력)'}
                    </span>
                    <FiChevronDown size={20} />
                  </DateFieldBtn>
                </DateFieldsRow>
                <FieldHint>조약 전체 서명일과 다를 수 있습니다.</FieldHint>
              </FieldControl>
            </FieldRow>
            <FieldRow>
              <FieldLabel>비고</FieldLabel>
              <TreatyFullWidthFieldControl>
                <Textarea
                  value={row.note}
                  onChange={(e) =>
                    updateRow(rowIndex, { note: e.target.value })
                  }
                  placeholder="추가 메모"
                  rows={6}
                />
              </TreatyFullWidthFieldControl>
            </FieldRow>
          </SignatoryRowCard>
        )
      })}

      {tab === 'new' ? (
        <div style={{ marginTop: 4, marginBottom: 8 }}>
          <SubmitButton
            type="button"
            onClick={() =>
              setSignatoryRows((rows) => [...rows, makeSignatoryRow()])
            }
            style={{
              background: 'transparent',
              color: MAIN,
              border: `1.5px dashed ${MAIN}`,
              boxShadow: 'none',
            }}
          >
            <FiPlus size={14} /> 서명국 추가
          </SubmitButton>
        </div>
      ) : null}
    </>
  )

  return (
    <>
      <SidePanel
        isOpen
        onClose={handleTreatyPanelClose}
        title="조약 등록 · 연결"
        subtitle="조약과 서명 행을 등록·연결합니다. 인물·관직·국가는 다른 메뉴에서 먼저 등록하세요. 주요 작업은 하단 버튼에서 합니다."
        footer={
          <TreatyPanelFooterBar>
            {tab === 'new' ? (
              <TreatyPanelPrimaryBtn
                type="button"
                disabled={creating}
                aria-busy={creating}
                onClick={handleCreate}
              >
                {creating ? '등록 중…' : '등록'}
              </TreatyPanelPrimaryBtn>
            ) : (
              <TreatyPanelPrimaryBtn
                type="button"
                disabled={linking || !selectedTreatyForLink}
                aria-busy={linking}
                title={
                  !selectedTreatyForLink
                    ? '목록에서 조약을 선택하세요.'
                    : linkExistingSignatory
                      ? '선택한 조약의 이 국가·정부 서명(참여) 정보를 수정합니다.'
                      : '선택한 조약을 이 국가·정부에 연결합니다.'
                }
                onClick={handleLink}
              >
                {linking
                  ? linkExistingSignatory
                    ? '수정 중…'
                    : '연결 중…'
                  : linkExistingSignatory
                    ? '수정'
                    : '연결'}
              </TreatyPanelPrimaryBtn>
            )}
          </TreatyPanelFooterBar>
        }
        width="min(1180px, 100vw)"
      >
        <TreatySidePanelTabBarWrap>
          <TreatyModeTabBar role="tablist" aria-label="조약 등록 방식">
            <TreatyModeTab
              type="button"
              role="tab"
              aria-selected={tab === 'new'}
              id="treaty-tab-new"
              aria-controls="treaty-panel-content"
              $active={tab === 'new'}
              onClick={() => setTab('new')}
            >
              새 조약 등록
            </TreatyModeTab>
            <TreatyModeTab
              type="button"
              role="tab"
              aria-selected={tab === 'link'}
              id="treaty-tab-link"
              aria-controls="treaty-panel-content"
              $active={tab === 'link'}
              onClick={() => setTab('link')}
            >
              기존 조약 연결
            </TreatyModeTab>
          </TreatyModeTabBar>
        </TreatySidePanelTabBarWrap>

        <FormSectionInner
          id="treaty-panel-content"
          role="tabpanel"
          aria-labelledby={tab === 'new' ? 'treaty-tab-new' : 'treaty-tab-link'}
          style={{ paddingTop: 4 }}
        >
          {tab === 'new' && (
            <>
              <div style={{ padding: '4px 0 16px' }}>
                <TabNavigation style={{ marginBottom: 0 }}>
                  <TabButton
                    type="button"
                    $active={newSubTab === 'basic'}
                    onClick={() => setNewSubTab('basic')}
                  >
                    기본 정보
                  </TabButton>
                  <TabButton
                    type="button"
                    $active={newSubTab === 'dates'}
                    onClick={() => setNewSubTab('dates')}
                  >
                    일정
                  </TabButton>
                  <TabButton
                    type="button"
                    $active={newSubTab === 'narrative'}
                    onClick={() => setNewSubTab('narrative')}
                  >
                    상세·서술
                  </TabButton>
                  <TabButton
                    type="button"
                    $active={newSubTab === 'signatory'}
                    onClick={() => setNewSubTab('signatory')}
                  >
                    서명·참여
                  </TabButton>
                </TabNavigation>
              </div>

              {newSubTab === 'basic' && (
                <FormRows>
                  <FieldRow>
                    <FieldLabel>
                      조약명 <Required title="필수" />
                    </FieldLabel>
                    <FieldControl>
                      <RegisterInput
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="예: 독소 불가침 조약"
                      />
                    </FieldControl>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>별칭</FieldLabel>
                    <FieldControl>
                      <RegisterInput
                        value={alias}
                        onChange={(e) => setAlias(e.target.value)}
                        placeholder="예: 몰로토프-리벤트로프 조약"
                      />
                    </FieldControl>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>
                      조약 유형 <Required title="필수" />
                    </FieldLabel>
                    <TreatyFieldNarrow>
                      <TreatyFormSelect
                        value={type}
                        onChange={(e) => setType(e.target.value as TreatyType)}
                      >
                        {(
                          Object.entries(TREATY_TYPE_LABELS) as [
                            TreatyType,
                            string,
                          ][]
                        ).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </TreatyFormSelect>
                    </TreatyFieldNarrow>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>서명 장소</FieldLabel>
                    <TreatyFullWidthFieldControl>
                      <TreatyFieldModeRow
                        role="group"
                        aria-label="서명 장소 입력 방식"
                      >
                        <TreatyFieldModeBtn
                          type="button"
                          $active={signingVenueInputMode === 'text'}
                          onClick={() => {
                            setSigningVenueInputMode('text')
                            setSigningAdministrativeDivisionId(null)
                            setSigningAdminDivisionLabel('')
                          }}
                        >
                          직접 입력
                        </TreatyFieldModeBtn>
                        <TreatyFieldModeBtn
                          type="button"
                          $active={signingVenueInputMode === 'division'}
                          onClick={() => {
                            setSigningVenueInputMode('division')
                            setLocation('')
                          }}
                        >
                          행정구역 (DB)
                        </TreatyFieldModeBtn>
                      </TreatyFieldModeRow>
                      {signingVenueInputMode === 'text' ? (
                        <>
                          <Textarea
                            value={location}
                            onChange={(e) => {
                              const v = e.target.value
                              setLocation(v)
                              setSigningVenueInputMode('text')
                              if (v.trim()) {
                                setSigningAdministrativeDivisionId(null)
                                setSigningAdminDivisionLabel('')
                              }
                            }}
                            rows={4}
                            placeholder="예: 모스크바 크렘린궁, 외무인민위원회 청사"
                          />
                          <FieldHint>
                            자유 서술로 저장됩니다. 행정구역 코드로 맞출 때는 위에서
                            「행정구역 (DB)」을 선택하세요.
                          </FieldHint>
                        </>
                      ) : (
                        <>
                          <FieldHint style={{ marginBottom: 10 }}>
                            국가를 고른 뒤 행정구역을 선택합니다. 직접 서술이
                            필요하면 「직접 입력」으로 전환하세요.
                          </FieldHint>
                          <CabinetSelectTrigger
                            type="button"
                            onClick={() => setShowSigningVenueCountryModal(true)}
                            $hasValue={!!signingVenueCountryId}
                            style={{ marginBottom: 10 }}
                          >
                            <FiGlobe size={18} />
                            <span>
                              {treatyModernCountries.find(
                                (c) => c.id === signingVenueCountryId,
                              )?.name ?? '국가 선택 (행정구역 목록 기준)'}
                            </span>
                            <FiChevronDown size={18} />
                          </CabinetSelectTrigger>
                          <CabinetSelectTrigger
                            type="button"
                            disabled={!signingVenueCountryId}
                            onClick={() => setShowSigningDivisionModal(true)}
                            $hasValue={!!signingAdministrativeDivisionId}
                          >
                            <FiMapPin size={18} />
                            <span>
                              {signingAdminDivisionLabel || '행정구역 선택'}
                            </span>
                            <FiChevronDown size={18} />
                          </CabinetSelectTrigger>
                        </>
                      )}
                    </TreatyFullWidthFieldControl>
                  </FieldRow>
                </FormRows>
              )}

              {newSubTab === 'dates' && (
                <FormRows>
                  <FieldRow>
                    <FieldLabel>
                      서명·발효 <Required title="필수: 서명일" />
                    </FieldLabel>
                    <FieldControl $variant="datePair">
                      <DateFieldsRow style={{ maxWidth: '100%' }}>
                        <DateFieldBtn
                          type="button"
                          onClick={() =>
                            setDatePickerContext({
                              kind: 'treaty',
                              field: 'signDate',
                            })
                          }
                          $hasValue={!!signDate}
                        >
                          <FiCalendar size={16} />
                          <span>
                            {signDate ? formatIsoDateLabel(signDate) : '서명일'}
                          </span>
                          <FiChevronDown size={20} />
                        </DateFieldBtn>
                        <DateFieldBtn
                          type="button"
                          onClick={() =>
                            setDatePickerContext({
                              kind: 'treaty',
                              field: 'effectiveDate',
                            })
                          }
                          $hasValue={!!effectiveDate}
                        >
                          <FiCalendar size={16} />
                          <span>
                            {effectiveDate
                              ? formatIsoDateLabel(effectiveDate)
                              : '발효일'}
                          </span>
                          <FiChevronDown size={20} />
                        </DateFieldBtn>
                      </DateFieldsRow>
                      <FieldHint>
                        서명일은 필수입니다. 공용 달력에서 선택합니다.
                      </FieldHint>
                    </FieldControl>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>만료·파기</FieldLabel>
                    <FieldControl $variant="datePair">
                      <DateFieldsRow style={{ maxWidth: '100%' }}>
                        <DateFieldBtn
                          type="button"
                          onClick={() =>
                            setDatePickerContext({
                              kind: 'treaty',
                              field: 'expiryDate',
                            })
                          }
                          $hasValue={!!expiryDate}
                        >
                          <FiCalendar size={16} />
                          <span>
                            {expiryDate
                              ? formatIsoDateLabel(expiryDate)
                              : '만료일'}
                          </span>
                          <FiChevronDown size={20} />
                        </DateFieldBtn>
                        <DateFieldBtn
                          type="button"
                          onClick={() =>
                            setDatePickerContext({
                              kind: 'treaty',
                              field: 'violationDate',
                            })
                          }
                          $hasValue={!!violationDate}
                        >
                          <FiCalendar size={16} />
                          <span>
                            {violationDate
                              ? formatIsoDateLabel(violationDate)
                              : '파기일'}
                          </span>
                          <FiChevronDown size={20} />
                        </DateFieldBtn>
                      </DateFieldsRow>
                      <FieldHint>
                        효력 종료·파기 시점을 같은 줄에서 입력합니다.
                      </FieldHint>
                    </FieldControl>
                  </FieldRow>
                  {violationDate ? (
                    <FieldRow>
                      <FieldLabel>파기 사유</FieldLabel>
                      <TreatyFieldWide>
                        <RegisterInput
                          value={violationReason}
                          onChange={(e) => setViolationReason(e.target.value)}
                          placeholder="파기 이유"
                        />
                      </TreatyFieldWide>
                    </FieldRow>
                  ) : null}
                </FormRows>
              )}

              {newSubTab === 'narrative' && (
                <FormRows>
                  <FieldRow>
                    <FieldLabel>개요</FieldLabel>
                    <TreatyFullWidthFieldControl>
                      <Textarea
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        rows={7}
                        placeholder="조약 핵심 요약"
                      />
                    </TreatyFullWidthFieldControl>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>배경</FieldLabel>
                    <TreatyFullWidthFieldControl>
                      <Textarea
                        value={background}
                        onChange={(e) => setBackground(e.target.value)}
                        rows={7}
                        placeholder="체결 배경"
                      />
                    </TreatyFullWidthFieldControl>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>이후 영향</FieldLabel>
                    <TreatyFullWidthFieldControl>
                      <Textarea
                        value={aftermath}
                        onChange={(e) => setAftermath(e.target.value)}
                        rows={7}
                        placeholder="주요 결과·여파"
                      />
                    </TreatyFullWidthFieldControl>
                  </FieldRow>
                </FormRows>
              )}

              {newSubTab === 'signatory' && (
                <FormRows>{signatoryFormRows}</FormRows>
              )}
            </>
          )}

          {tab === 'link' && (
            <>
              <TreatySubSectionTitle
                style={{ border: 'none', marginTop: 0, paddingTop: 0 }}
              >
                조약 선택
              </TreatySubSectionTitle>
              <p
                style={{
                  margin: '0 0 12px',
                  fontSize: 13,
                  color: isDark ? '#94a3b8' : '#64748b',
                  lineHeight: 1.55,
                }}
              >
                아래 목록에서 조약을 한 건 선택한 뒤, 서명·참여 정보를 확인하고
                하단의 「연결」 또는 「수정」을 누릅니다.
              </p>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <FiSearch
                  size={14}
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                  }}
                />
                <RegisterInput
                  type="text"
                  placeholder="조약명 검색…"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  style={{ paddingLeft: 40, maxWidth: 480 }}
                />
              </div>

              {loading ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    padding: '20px 0 28px',
                  }}
                >
                  <TreatyListSkeletonPulse aria-hidden />
                  <TreatyListSkeletonPulse aria-hidden />
                  <TreatyListSkeletonPulse aria-hidden />
                  <TreatyListSkeletonPulse aria-hidden />
                </div>
              ) : filtered.length === 0 ? (
                <p
                  style={{
                    textAlign: 'center',
                    color: '#94a3b8',
                    padding: '24px 0',
                    lineHeight: 1.7,
                  }}
                >
                  {allTreaties.filter((t) => !linkedIds.has(t.id)).length === 0
                    ? '연결 가능한 조약이 없습니다. 새 조약 등록 모드에서 먼저 등록하세요.'
                    : '검색 결과가 없습니다.'}
                </p>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    maxHeight: 280,
                    overflowY: 'auto',
                    marginBottom: 8,
                  }}
                >
                  {filtered.map((treaty) => (
                    <TreatyListRow
                      key={treaty.id}
                      type="button"
                      $selected={selectedTreatyForLink?.id === treaty.id}
                      onClick={() => {
                        setSelectedTreatyForLink(treaty)
                        const sig = treaty.signatories?.find(
                          (s) =>
                            (countryId && s.countryId === countryId) ||
                            (historicalCountryId &&
                              s.historicalCountryId === historicalCountryId),
                        )
                        const base = makeSignatoryRow()
                        if (!sig) {
                          setSignatoryRows([base])
                          return
                        }
                        setSignatoryRows([
                          {
                            ...base,
                            countryId: sig.countryId ?? null,
                            historicalCountryId:
                              sig.historicalCountryId ?? null,
                            countryLabel:
                              sig.country?.name ??
                              sig.historicalCountry?.name ??
                              base.countryLabel,
                            cabinetId: sig.cabinetId ?? cabinetId,
                            personId: sig.personId ?? null,
                            positionDefinitionId:
                              sig.positionDefinitionId ?? null,
                            role: sig.role ?? '',
                            positionInputMode: sig.positionDefinitionId
                              ? ('definition' as const)
                              : sig.role?.trim()
                                ? ('free' as const)
                                : 'definition',
                            participationType: sig.participationType,
                            signedAt: sig.signedAt
                              ? new Date(sig.signedAt)
                                  .toISOString()
                                  .slice(0, 10)
                              : '',
                            note: sig.note ?? '',
                          },
                        ])
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#fff',
                          background: MAIN,
                          borderRadius: 4,
                          padding: '2px 7px',
                          flexShrink: 0,
                        }}
                      >
                        {TREATY_TYPE_LABELS[treaty.type] ?? treaty.type}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: isDark ? '#e2e8f0' : '#1e293b',
                          }}
                        >
                          {treaty.name}
                        </div>
                        {treaty.alias ? (
                          <div
                            style={{
                              fontSize: 12,
                              color: '#94a3b8',
                            }}
                          >
                            {treaty.alias}
                          </div>
                        ) : null}
                      </div>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>
                        {treaty.signDate
                          ? new Date(treaty.signDate).getFullYear()
                          : '—'}
                      </span>
                    </TreatyListRow>
                  ))}
                </div>
              )}

              {selectedTreatyForLink ? (
                <>
                  <TreatySubSectionTitle>
                    서명·참여 ({selectedTreatyForLink.name})
                  </TreatySubSectionTitle>
                  <FormRows>{signatoryFormRows}</FormRows>
                </>
              ) : null}
            </>
          )}
        </FormSectionInner>
      </SidePanel>

      <ConfirmDialog
        isOpen={treatyCloseConfirmOpen}
        title="작성 중인 내용이 있습니다"
        message="저장하지 않고 닫으시겠습니까?"
        confirmLabel="닫기"
        cancelLabel="계속 작성"
        danger
        onConfirm={() => {
          setTreatyCloseConfirmOpen(false)
          onClose()
        }}
        onCancel={() => setTreatyCloseConfirmOpen(false)}
      />

      {datePickerContext ? (
        <DatePickerModal
          isOpen
          onClose={() => setDatePickerContext(null)}
          onSelect={(date) => applyPickerDate(date)}
          initialDate={pickerInitialDate()}
          title={pickerTitle}
        />
      ) : null}

      {countryPickerRowIndex !== null ? (
        <CountrySelectModal
          isOpen
          onClose={() => setCountryPickerRowIndex(null)}
          modernCountries={treatyModernCountries as CountryResponseDto[]}
          historicalCountries={
            treatyHistoricalCountries as HistoricalCountryResponseDto[]
          }
          onSelect={(c) => {
            updateRow(countryPickerRowIndex, {
              countryId: c.isHistorical ? null : c.id,
              historicalCountryId: c.isHistorical ? c.id : null,
              countryLabel: c.name,
              cabinetId: null,
            })
            setCountryPickerRowIndex(null)
          }}
          title="서명국 선택"
        />
      ) : null}

      {showSigningVenueCountryModal ? (
        <CountrySelectModal
          isOpen
          onClose={() => setShowSigningVenueCountryModal(false)}
          modernCountries={treatyModernCountries as CountryResponseDto[]}
          historicalCountries={
            treatyHistoricalCountries as HistoricalCountryResponseDto[]
          }
          onSelect={(c) => {
            setSigningVenueCountryId(c.id)
            setSigningAdministrativeDivisionId(null)
            setSigningAdminDivisionLabel('')
            setLocation('')
            setSigningVenueInputMode('division')
            setShowSigningVenueCountryModal(false)
          }}
          title="서명 지역 국가 (행정구역 목록 기준)"
          selectedCountryId={signingVenueCountryId || undefined}
        />
      ) : null}

      {showSigningDivisionModal ? (
        <SelectModal
          isOpen
          onClose={() => setShowSigningDivisionModal(false)}
          title="서명 장소 행정구역"
          options={[
            { value: '', label: '선택 안 함' },
            ...signingAdminDivisions.map((d) => ({
              value: d.id,
              label: d.localName ? `${d.name} (${d.localName})` : d.name,
            })),
          ]}
          selectedValue={signingAdministrativeDivisionId ?? ''}
          onSelect={(v) => {
            setSigningAdministrativeDivisionId(v || null)
            const d = signingAdminDivisions.find((x) => x.id === v)
            setSigningAdminDivisionLabel(
              d ? (d.localName ? `${d.name} (${d.localName})` : d.name) : '',
            )
            if (v) {
              setLocation('')
              setSigningVenueInputMode('division')
            }
            setShowSigningDivisionModal(false)
          }}
        />
      ) : null}

      {positionPickerRowIndex !== null ? (
        <SelectModal
          isOpen
          onClose={() => setPositionPickerRowIndex(null)}
          title="행정부 직위 (관직 정의)"
          options={[
            { value: '', label: '선택 안 함' },
            ...treatyPositionDefinitions.map((d) => ({
              value: d.id,
              label:
                d.titleEn && d.titleEn !== d.title
                  ? `${d.title} (${d.titleEn})`
                  : d.title,
            })),
          ]}
          selectedValue={
            signatoryRows[positionPickerRowIndex]?.positionDefinitionId ?? ''
          }
          onSelect={(v) => {
            const idx = positionPickerRowIndex
            setPositionPickerRowIndex(null)
            if (idx !== null) {
              updateRow(idx, {
                positionDefinitionId: v || null,
                ...(v ? { role: '', positionInputMode: 'definition' as const } : { positionInputMode: 'free' as const }),
              })
            }
          }}
        />
      ) : null}
    </>
  )
}
