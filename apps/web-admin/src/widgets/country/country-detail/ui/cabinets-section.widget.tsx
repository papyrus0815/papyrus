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
  FiInfo,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { PersonDetailPanel } from '@/pages/persons/PersonDetailPanel'
import { administrationDepartmentApi } from '@/shared/api/administration-department'
import { personCareerApi } from '@/shared/api/person-career'
import { getAllPersons } from '@/shared/api/persons'
import { getPersonDetailById } from '@/shared/api/persons-detail'
import { getUploadImageUrl, uploadImage } from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import {
  calcAgeAtTenure,
  formatPersonLifespan,
} from '@/shared/lib/tenure-person-utils'
import { Z_INDEX } from '@/shared/styles/z-index'
import { DatePickerModal } from '@/shared/ui/date-picker'
import { DateRangeField } from '@/shared/ui/form-fields'
import { PersonSelectModal } from '@/shared/ui/person-select-modal'
import {
  DateFieldsRow,
  FieldControl,
  FieldLabel,
  FieldRow,
  FormRows,
  Input as RegisterInput,
  Required,
  SubmitButton,
  TabButton,
  TabNavigation,
} from '@/shared/ui/register-form-layout'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/RichTextEditor'

const MAIN = '#6366f1'
const MAIN_HOVER = '#4f46e5'
const BORDER = '#e5e7eb'
const BORDER_LIGHT = '#f3f4f6'
const BG_MUTED = '#f8fafc'
const TEXT = '#0f172a'
const TEXT_MUTED = '#64748b'
const HEAD_POSITION_TYPES = new Set(['HEAD_OF_STATE', 'HEAD_OF_GOVERNMENT'])
/** 각료 등록 시 선택 가능한 직위 타입 (수반·의원 등 제외) */
const MINISTER_POSITION_TYPES = new Set([
  'CABINET_MINISTER',
  'VICE_MINISTER',
  'OTHER',
])

/* 행정부 등록 모달 — 인물 등록 모달(PersonRegisterModal) 폼과 동일 스타일 */
const CabinetModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: cabinetOverlayIn 0.2s ease;
  @keyframes cabinetOverlayIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`
const CabinetModalBox = styled.div`
  width: 100%;
  max-width: 920px;
  min-height: 520px;
  max-height: 90vh;
  background: #fff;
  border-radius: 20px;
  border: 1px solid #e5e7eb;
  box-shadow:
    0 10px 40px rgba(0, 0, 0, 0.12),
    0 1px 3px rgba(0, 0, 0, 0.04);
  z-index: ${Z_INDEX.MODAL_CONTENT};
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
const CabinetModalHeader = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f3f4f6;
`
const CabinetModalTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111;
`
const CabinetCloseBtn = styled.button`
  padding: 8px;
  background: none;
  border: none;
  border-radius: 8px;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover {
    background: #f3f4f6;
    color: #111;
  }
`
const CabinetModalBody = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 24px 28px 28px;
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: #f3f4f6;
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`
const CabinetFormDesc = styled.div`
  margin: 0 0 20px;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  svg {
    flex-shrink: 0;
    color: #888;
    margin-top: 2px;
  }
  strong {
    font-weight: 600;
    color: #374151;
  }
`
/** 탭: register-form-layout과 동일 (pill 20px, 배경 #f1f5f9, 활성 흰색+인디고) */
const CabinetTabWrap = styled.div`
  margin-bottom: 24px;
  /* 탭이 전체 너비로 늘어나지 않도록 fit-content 유지 */
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
  background: #fff;
  border-radius: 16px;
  padding: 20px 24px 0;
  margin-bottom: 4px;
`
const CabinetSelectSectionTitle = styled.h3`
  margin: 0 0 14px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
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
    background: #f1f5f9;
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
`
const CabinetHeadTenureCard = styled.button`
  width: 100%;
  text-align: left;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
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
    border-color: #94a3b8;
    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.06);
    background: #fafafa;
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
  color: #475569;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 4px 10px;
  border-radius: 8px;
  letter-spacing: 0.01em;
`
const CabinetHeadTenureCardName = styled.span`
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  line-height: 1.35;
`
const CabinetHeadTenureCardMeta = styled.span`
  font-size: 13px;
  color: #64748b;
  line-height: 1.4;
`
const CabinetHeadTenureCardAction = styled.span`
  grid-column: 2;
  grid-row: 1 / -1;
  padding: 18px 20px 18px 16px;
  display: flex;
  align-items: center;
  color: #64748b;
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
  border-top: 1px solid #f3f4f6;
  flex-wrap: wrap;
`
const CabinetEmptyHint = styled.div`
  margin: 0;
  padding: 40px 28px;
  font-size: 14px;
  color: ${TEXT_MUTED};
  text-align: center;
  background: #fff;
  border-radius: 16px;
  border: 1px dashed #cbd5e1;
  line-height: 1.6;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  strong {
    font-weight: 600;
    color: ${TEXT};
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
  color: ${(p) => (p.$hasValue ? '#111827' : '#9ca3af')};
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  outline: none;
  &:hover {
    border-color: #64748b;
    background: #faf5ff;
    color: #111827;
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
  color: #111827;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  outline: none;
  box-sizing: border-box;
  &:focus {
    border-color: #64748b;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
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
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: ${(p) => (p.$hasValue ? '#111' : '#888')};
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
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13px;
  color: #0f172a;
  background: #fff;
  outline: none;
  resize: vertical;
  font-family: inherit;
  line-height: 1.6;
  transition: border-color 0.14s;
  box-sizing: border-box;
  &::placeholder {
    color: #b0bac9;
  }
  &:focus {
    border-color: #64748b;
  }
`

const CabinetCancelBtn = styled.button`
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  &:hover {
    background: #f9fafb;
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
const TL_ROW_H = 340   // 행 높이 고정
const TL_BUBBLE_W = 84  // 연도 버블 너비
const TL_THUMB = 72     // 썸네일 지름

function TlItem({ thumbUrl, personName, posTitle, range, ageAtStart, birthPlace, lineColor }: {
  thumbUrl: string | null; personName: string; posTitle: string
  range: string; ageAtStart: number | null; birthPlace: string | null
  lineColor: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {/* 원형 썸네일 */}
      <div style={{
        flexShrink: 0,
        width: TL_THUMB, height: TL_THUMB, borderRadius: '50%',
        overflow: 'hidden',
        background: `${lineColor}18`,
        border: `3px solid ${lineColor}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 3px 10px ${lineColor}44`,
      }}>
        {thumbUrl
          ? <img src={thumbUrl} alt={personName} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
          : <FiUser size={26} color={lineColor} style={{ opacity: 0.3 }} />
        }
      </div>
      {/* 우측 텍스트 */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{personName}</div>
        <div style={{ fontSize: 12, color: lineColor, fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{posTitle}</div>
        <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '3px 8px' }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: lineColor, background: `${lineColor}12`, borderRadius: 5, padding: '2px 9px', whiteSpace: 'nowrap' }}>{range}</span>
          {ageAtStart != null && <span style={{ fontSize: 11, color: '#94a3b8' }}>취임 {ageAtStart}세</span>}
        </div>
        {birthPlace && (
          <div style={{ marginTop: 4, fontSize: 11, color: '#b0bac9', display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 9.5, color: '#c8d0da' }}>출신</span>{birthPlace}
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
      (registerCabinetModalOpen || !!editingCabinet || personSelectOpen),
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

  /** 부처 선택 시 해당 부처 직위만 필터링, 미선택 시 전체 */
  const filteredMinisterPositionOptions = useMemo(() => {
    if (!ministerFormDeptId) return ministerPositionOptions
    return ministerPositionOptions.filter(
      (d: any) => d.administrationDepartmentId === ministerFormDeptId,
    )
  }, [ministerPositionOptions, ministerFormDeptId])

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
    setEditingPositionDefId(null)
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
            <div style={{ padding: '14px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* 국가 필터 탭 */}
              {country.type === 'modern' &&
                Array.isArray(country.historicalCountries) &&
                country.historicalCountries.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      { id: '', label: '전체' },
                      { id: countryId ?? '', label: country.name },
                      ...country.historicalCountries.map((hc) => ({ id: hc.id, label: hc.name })),
                    ].map((tab) => {
                      const active = cabinetCountryFilter === tab.id
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setCabinetCountryFilter(tab.id)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '4px 14px', fontSize: 12.5, fontWeight: active ? 700 : 500,
                            color: active ? '#fff' : '#64748b',
                            background: active ? '#6366f1' : '#f8fafc',
                            border: `1.5px solid ${active ? '#6366f1' : '#e2e8f0'}`,
                            borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap',
                            transition: 'all 0.13s',
                            boxShadow: active ? '0 2px 8px #6366f144' : 'none',
                          }}
                          onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.borderColor = '#a5b4fc'; (e.currentTarget as HTMLButtonElement).style.color = '#4f46e5' } }}
                          onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLButtonElement).style.color = '#64748b' } }}
                        >
                          {tab.label}
                        </button>
                      )
                    })}
                  </div>
                )}

              {/* 검색창 + 등록 버튼 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 14, borderBottom: '1px solid #f0f2f7' }}>
                {/* 검색창 */}
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#b0bac9', display: 'flex', pointerEvents: 'none' }}>
                    <FiSearch size={15} />
                  </span>
                  <input
                    type="text"
                    placeholder="수반명, 직위, 연도 검색"
                    value={cabinetSearchQuery}
                    onChange={(e) => setCabinetSearchQuery(e.target.value)}
                    style={{
                      width: '100%', height: 40, border: '1.5px solid #e5e7eb',
                      borderRadius: 10, padding: '0 36px 0 38px',
                      fontSize: 13, color: '#0f172a', background: '#f8fafc',
                      outline: 'none', boxSizing: 'border-box',
                      transition: 'border-color 0.14s, background 0.14s',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#a5b4fc'; e.currentTarget.style.background = '#fff' }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#f8fafc' }}
                  />
                  {/* 건수 or 클리어 */}
                  {cabinetSearchQuery.trim() ? (
                    <button
                      type="button"
                      onClick={() => setCabinetSearchQuery('')}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer', color: '#b0bac9', borderRadius: 5 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9'; (e.currentTarget as HTMLButtonElement).style.color = '#475569' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#b0bac9' }}
                    >
                      <FiX size={13} />
                    </button>
                  ) : (
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11.5, fontWeight: 600, color: '#c8d0da', pointerEvents: 'none' }}>
                      {filteredCabinets.length > 0 ? `${filteredCabinets.length}개` : ''}
                    </span>
                  )}
                </div>

                {/* 정렬 표시 (간단) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <FiClock size={13} />
                  최신순
                </div>

                {/* 등록 버튼 */}
                <button
                  type="button"
                  onClick={() => { setRegisterFlow('new'); setRegisterCabinetModalOpen(true) }}
                  style={{
                    flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '0 16px', height: 40, fontSize: 13, fontWeight: 600,
                    color: '#fff', background: '#6366f1', border: 'none',
                    borderRadius: 10, cursor: 'pointer',
                    boxShadow: '0 2px 8px #6366f133',
                    transition: 'background 0.13s, box-shadow 0.13s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#4f46e5'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px #6366f155' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#6366f1'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px #6366f133' }}
                >
                  <FiPlus size={14} />
                  행정부 등록
                </button>
              </div>
            </div>
            {filteredCabinets.length === 0 ? (
              <EmptyStateBox
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 16,
                  padding: '48px 24px',
                }}
              >
                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                  {cabinetSearchQuery.trim() || cabinetCountryFilter
                    ? '검색 결과가 없습니다.'
                    : '등록된 행정부가 없습니다.'}
                </div>
                {(cabinetSearchQuery.trim() || cabinetCountryFilter) && (
                  <button
                    type="button"
                    onClick={() => { setCabinetSearchQuery(''); setCabinetCountryFilter('') }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '6px 14px', fontSize: 12.5, fontWeight: 600,
                      color: '#6366f1', background: '#eef2ff',
                      border: '1.5px solid #c7d2fe', borderRadius: 8, cursor: 'pointer',
                      transition: 'background 0.13s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#e0e7ff' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#eef2ff' }}
                  >
                    <FiX size={13} />
                    필터 초기화
                  </button>
                )}
                {!cabinetSearchQuery.trim() && !cabinetCountryFilter && (
                  <CabRegisterBtn
                    type="button"
                    onClick={() => {
                      setRegisterFlow('new')
                      setRegisterCabinetModalOpen(true)
                    }}
                    style={{ fontSize: 13 }}
                  >
                    <FiPlus size={15} />첫 번째 행정부 등록
                  </CabRegisterBtn>
                )}
              </EmptyStateBox>
) : (
              <div style={{ padding: '0 0 32px' }}>
                {/* 타임라인 요약 헤더 */}
                {(() => {
                  const items = filteredCabinets as any[]
                  const years = items.flatMap(c => {
                    const s = c.headTenure?.startDate ? new Date(c.headTenure.startDate).getFullYear() : null
                    return s ? [s] : []
                  })
                  const minY = years.length ? Math.min(...years) : null
                  const maxY = years.length ? Math.max(...years) : null
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px', borderBottom: '1px solid #f0f2f5', background: '#fafbfc' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FiUsers size={13} color="#94a3b8" />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{items.length}개 행정부</span>
                      </div>
                      {minY && (
                        <>
                          <div style={{ width: 1, height: 12, background: '#e2e8f0' }} />
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FiCalendar size={12} color="#94a3b8" />
                            <span style={{ fontSize: 12, color: '#64748b' }}>{minY} – {maxY ?? '현재'}</span>
                          </div>
                        </>
                      )}
                      <div style={{ flex: 1 }} />
                      <div style={{ display: 'flex', gap: 4 }}>
                        {TL_ROWS.map((r, i) => (
                          <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: r.line }} />
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
                    const displayItems = isReversed ? [...rowItems].reverse() : rowItems
                    // 노드 중앙 X = 패딩(20) + 버블너비/2
                    const NODE_X = 20 + TL_BUBBLE_W / 2

                    return (
                      <div key={rowIdx} style={{ background: '#fff', borderBottom: rowIdx < rows.length - 1 ? '1px solid #f0f2f5' : 'none' }}>
                        {/* 행 레이블 */}
                        {(() => {
                          const firstTerm = rowItems[0]?.headTenure?.termNumber ?? rowItems[0]?.headTenure?.regnalNumber
                          const lastTerm = rowItems[rowItems.length - 1]?.headTenure?.termNumber ?? rowItems[rowItems.length - 1]?.headTenure?.regnalNumber
                          const rangeLabel = firstTerm != null && lastTerm != null
                            ? firstTerm === lastTerm ? `제${firstTerm}대` : `제${firstTerm}–${lastTerm}대`
                            : `${rowIdx * TL_ROW_SIZE + 1}번째 행`
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px 0' }}>
                              <div style={{ width: 4, height: 16, borderRadius: 2, background: p.line, flexShrink: 0 }} />
                              <span style={{ fontSize: 11, fontWeight: 700, color: p.line, letterSpacing: '0.04em' }}>
                                {rangeLabel}
                              </span>
                              <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${p.line}33, transparent)` }} />
                              <span style={{ fontSize: 10.5, color: '#c8d0da' }}>
                                {rowItems.length}명
                              </span>
                            </div>
                          )
                        })()}
                        <div style={{ position: 'relative', height: TL_ROW_H, padding: '0 20px' }}>

                          {/* 수평선 — 노드 X 기준으로 좌측 시작 */}
                          <div style={{
                            position: 'absolute',
                            left: NODE_X,
                            right: 0,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            height: 3,
                            background: `linear-gradient(90deg, ${p.line}cc, ${p.line}33)`,
                            zIndex: 0,
                          }} />

                          {/* 아이템 그리드 */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${TL_ROW_SIZE}, 1fr)`,
                            height: '100%',
                            gap: '0 8px',
                            position: 'relative',
                            zIndex: 1,
                          }}>
                            {Array.from({ length: TL_ROW_SIZE }).map((_, colIdx) => {
                              const item = displayItems[colIdx]
                              if (!item) return <div key={`e-${colIdx}`} />

                              const head = item.headTenure
                              const personName = head?.person ? getPersonName(head.person) : '이름 없음'
                              const posTitle = head?.positionDefinition?.title ?? head?.title ?? '—'
                              const termNum = head?.termNumber ?? head?.regnalNumber
                              const thumbUrl = head?.person?.profileImageUrl ?? null
                              const startYear = head?.startDate ? new Date(head.startDate).getFullYear() : null
                              const endYear = head?.endDate ? new Date(head.endDate).getFullYear() : null
                              const range = startYear ? `${startYear}–${endYear ?? '현재'}` : '—'
                              const ageAtStart = head?.person && head?.startDate ? calcAgeAtTenure(head.person, head.startDate) : null
                              const birthPlace = head?.person
                                ? ((head.person as any).birthCity?.name ?? (head.person as any).birthAdminDivision?.name ?? (head.person as any).birthPlaceText ?? null)
                                : null
                              const isDeleting = deletingCabinetId === item.id
                              // 짝수: 아이템 위 / 버블 아래, 홀수: 버블 위 / 아이템 아래
                              const itemOnTop = colIdx % 2 === 0

                              return (
                                <div
                                  key={item.id}
                                  style={{
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    height: '100%',
                                    cursor: isDeleting ? 'wait' : 'pointer',
                                    padding: '0 4px',
                                  }}
                                  onClick={() => { if (!isDeleting) { setSelectedCabinetId(item.id); setCabinetView('detail') } }}
                                >
                                  {/* 위쪽 영역 */}
                                  <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-end', paddingBottom: 8 }}>
                                    {itemOnTop ? (
                                      /* 아이템 (위) */
                                      <div style={{ width: '100%', transition: 'transform 0.18s ease, opacity 0.15s' }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.opacity = '0.92' }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.opacity = '1' }}
                                      >
                                        <TlItem thumbUrl={thumbUrl} personName={personName} posTitle={posTitle} range={range} ageAtStart={ageAtStart} birthPlace={birthPlace} lineColor={p.line} />
                                      </div>
                                    ) : (
                                      /* 연도 버블 (위) */
                                      <div style={{
                                        display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                                        background: '#fff', border: `2.5px solid ${p.line}`, borderRadius: 28,
                                        padding: '6px 14px', minWidth: TL_BUBBLE_W,
                                        boxShadow: `0 2px 10px ${p.line}44`, textAlign: 'center',
                                      }}>
                                        <span style={{ fontSize: 17, fontWeight: 900, color: p.textColor, letterSpacing: '-0.03em', lineHeight: 1.2 }}>{startYear ?? '—'}</span>
                                        {termNum != null && <span style={{ fontSize: 10, fontWeight: 700, color: p.line, marginTop: 1 }}>제{termNum}대</span>}
                                      </div>
                                    )}
                                  </div>

                                  {/* 수직선 + 노드 — 왼쪽 정렬 */}
                                  <div style={{ width: 2, height: 10, background: p.line, opacity: 0.6, marginLeft: TL_BUBBLE_W / 2 - 1, flexShrink: 0 }} />
                                  <div style={{
                                    width: 14, height: 14, borderRadius: '50%',
                                    background: '#fff', border: `3px solid ${p.line}`,
                                    boxShadow: `0 0 0 3px #fff`,
                                    marginLeft: TL_BUBBLE_W / 2 - 7,
                                    flexShrink: 0, zIndex: 2,
                                  }} />
                                  <div style={{ width: 2, height: 10, background: p.line, opacity: 0.6, marginLeft: TL_BUBBLE_W / 2 - 1, flexShrink: 0 }} />

                                  {/* 아래쪽 영역 */}
                                  <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', paddingTop: 8 }}>
                                    {!itemOnTop ? (
                                      /* 아이템 (아래) */
                                      <div style={{ width: '100%', transition: 'transform 0.18s ease, opacity 0.15s' }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(3px)'; (e.currentTarget as HTMLDivElement).style.opacity = '0.92' }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.opacity = '1' }}
                                      >
                                        <TlItem thumbUrl={thumbUrl} personName={personName} posTitle={posTitle} range={range} ageAtStart={ageAtStart} birthPlace={birthPlace} lineColor={p.line} />
                                      </div>
                                    ) : (
                                      /* 연도 버블 (아래) */
                                      <div style={{
                                        display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                                        background: '#fff', border: `2.5px solid ${p.line}`, borderRadius: 28,
                                        padding: '6px 14px', minWidth: TL_BUBBLE_W,
                                        boxShadow: `0 2px 10px ${p.line}44`, textAlign: 'center',
                                      }}>
                                        <span style={{ fontSize: 17, fontWeight: 900, color: p.textColor, letterSpacing: '-0.03em', lineHeight: 1.2 }}>{startYear ?? '—'}</span>
                                        {termNum != null && <span style={{ fontSize: 10, fontWeight: 700, color: p.line, marginTop: 1 }}>제{termNum}대</span>}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
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
                                  ? `제${t}대 ${n}`
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
                                  ? `제${t}대 ${n}`
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
                                color: '#475569',
                                background: '#fff',
                                border: '1px solid #e2e8f0',
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
                          border: '1px solid #fecaca',
                          borderRadius: 8,
                          cursor: 'pointer',
                          transition: 'all 0.14s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#fff1f1'
                          e.currentTarget.style.borderColor = '#f87171'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.borderColor = '#fecaca'
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
                                      color: '#475569',
                                      background: '#f8fafc',
                                      border: '1px solid #e2e8f0',
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
                                  <HeadTermBadge>제{termNum}대</HeadTermBadge>
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
                                    color: '#374151',
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
                                        border: '1px solid #e2e8f0',
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
                                      color: '#475569',
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
                                        border: '1.5px solid #e2e8f0',
                                        borderRadius: 8,
                                        background: '#fff',
                                        color: '#0f172a',
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
                                        border: '1.5px solid #e2e8f0',
                                        borderRadius: 8,
                                        background: '#fff',
                                        color: '#0f172a',
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
                                    color: '#374151',
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
                                        border: '1px solid #e2e8f0',
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
                                      color: '#475569',
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
                                        border: '1.5px solid #e2e8f0',
                                        borderRadius: 8,
                                        background: '#fff',
                                        color: '#0f172a',
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
                                        border: '1.5px solid #e2e8f0',
                                        borderRadius: 8,
                                        background: '#fff',
                                        color: '#0f172a',
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
                                  color: '#374151',
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
                                      color: '#475569',
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
                                    color: '#475569',
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
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
                        </>
                      )
                    })()}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {historyTargetTenure && (
        <MinisterHistoryOverlay
          role="dialog"
          aria-modal="true"
          aria-labelledby="minister-history-title"
          onClick={closeHistoryModal}
        >
          <MinisterHistoryBox onClick={(e) => e.stopPropagation()}>
            <MinisterHistoryHeader>
              <MinisterHistoryTitle id="minister-history-title">
                각료 재임 히스토리
              </MinisterHistoryTitle>
              <CabinetCloseBtn
                type="button"
                onClick={closeHistoryModal}
                aria-label="닫기"
              >
                <FiX size={22} strokeWidth={2} />
              </CabinetCloseBtn>
            </MinisterHistoryHeader>
            <MinisterHistoryBody>
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
            </MinisterHistoryBody>
          </MinisterHistoryBox>
        </MinisterHistoryOverlay>
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
        <CabinetModalOverlay
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-cabinet-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEditCabinetModal()
          }}
        >
          <CabinetModalBox onClick={(e) => e.stopPropagation()}>
            <CabinetModalHeader>
              <CabinetModalTitle id="edit-cabinet-title">
                행정부 수정
              </CabinetModalTitle>
              <CabinetCloseBtn
                type="button"
                onClick={closeEditCabinetModal}
                aria-label="닫기"
              >
                <FiX size={22} strokeWidth={2} />
              </CabinetCloseBtn>
            </CabinetModalHeader>
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
        </CabinetModalOverlay>
      )}

      {personSelectOpen && addMinisterCabinet && (
        <>
          <MinisterSelectOverlay
            role="dialog"
            aria-modal="true"
            aria-labelledby="minister-select-title"
            onClick={handleCloseMinisterModal}
          >
            <MinisterSelectBox onClick={(e) => e.stopPropagation()}>
              <MinisterSelectHeader>
                <MinisterSelectTitle id="minister-select-title">
                  각료 등록
                </MinisterSelectTitle>
                <CabinetCloseBtn
                  type="button"
                  onClick={handleCloseMinisterModal}
                  aria-label="닫기"
                >
                  <FiX size={22} strokeWidth={2} />
                </CabinetCloseBtn>
              </MinisterSelectHeader>
              <MinisterSelectBody>
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
                              border: `1px solid ${BORDER}`,
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
                          border: `1px solid ${BORDER}`,
                          borderRadius: 10,
                          background: '#fff',
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
                          color: TEXT_MUTED,
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
                          border: `1px solid ${BORDER}`,
                          borderRadius: 10,
                          background: '#fff',
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
                          color: TEXT_MUTED,
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
              </MinisterSelectBody>
            </MinisterSelectBox>
          </MinisterSelectOverlay>

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
          <PersonViewModalOverlay
            key="mention-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setMentionPersonId(null)}
            role="presentation"
          >
            <PersonViewModalPanel
              key="mention-modal-panel"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <PersonViewModalHeader>
                <PersonViewModalTitle title={mentionPersonName}>
                  {mentionPersonName || '인물'}
                </PersonViewModalTitle>
                <CabinetCloseBtn
                  type="button"
                  onClick={() => setMentionPersonId(null)}
                  aria-label="닫기"
                >
                  <FiX size={20} strokeWidth={2.5} />
                </CabinetCloseBtn>
              </PersonViewModalHeader>
              <PersonViewModalBody>
                <PersonDetailPanel
                  personId={mentionPersonId}
                  onClose={() => setMentionPersonId(null)}
                  onEdit={() => setMentionPersonId(null)}
                  hideHeaderActions
                  embedInModal
                />
              </PersonViewModalBody>
            </PersonViewModalPanel>
          </PersonViewModalOverlay>
        )}
      </AnimatePresence>
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
    <CabinetModalOverlay
      role="dialog"
      aria-modal="true"
      aria-labelledby="cabinet-modal-title"
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <CabinetModalBox onClick={(e) => e.stopPropagation()}>
        <CabinetModalHeader>
          <CabinetModalTitle id="cabinet-modal-title">
            행정부 등록
          </CabinetModalTitle>
          <CabinetCloseBtn type="button" onClick={close} aria-label="닫기">
            <FiX size={22} strokeWidth={2} />
          </CabinetCloseBtn>
        </CabinetModalHeader>
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
                          termNum != null ? `제${termNum}대 ` : ''
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
    </CabinetModalOverlay>
  )

  return createPortal(content, document.body)
}

/** 각료로 등록할 인물 선택 모달 — 검색·리스트 UX */
const MinisterSelectOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`
const MinisterSelectBox = styled.div`
  width: 100%;
  max-width: 920px;
  max-height: 88vh;
  background: #fff;
  border-radius: 20px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
  z-index: ${Z_INDEX.MODAL_CONTENT};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`
const MinisterSelectHeader = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f3f4f6;
`
const MinisterSelectTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111;
`
const MinisterSelectBody = styled.div`
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
  border-bottom: 1px solid #f3f4f6;
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
    p.$hasImage ? 'transparent' : 'rgba(226, 232, 240, 0.6)'};
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
      p.$hasImage ? 'transparent' : 'rgba(226, 232, 240, 0.9)'};
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
  color: #0f172a;
  &.placeholder {
    color: #64748b;
  }
`
const MinisterSelectActions = styled.div`
  flex-shrink: 0;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #f3f4f6;
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
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  padding: 0 10px 0 36px;
  font-size: 13px;
  color: #0f172a;
  background: #fff;
  outline: none;
  transition: border-color 0.14s;
  &::placeholder {
    color: #b0bac9;
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
    color: #475569;
    background: #f1f5f9;
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
  border-bottom: 1.5px solid #f0f2f7;
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
  background: #fff;
  border-radius: 14px;
  padding: 0;
  border: 1px solid ${(p) => (p.$selected ? '#94a3b8' : '#e8ecf0')};
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
    border-color: #94a3b8;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
  }
`

/* ── 행정부 리스트 행 (가로형) ── */
const CabListRow = styled.div<{ $selected?: boolean; $deleting?: boolean }>`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  background: ${(p) => (p.$selected ? '#f5f7ff' : '#fff')};
  border: none;
  cursor: ${(p) => (p.$deleting ? 'wait' : 'pointer')};
  transition: background 0.15s;
  &:hover {
    background: #f8fafc;
  }
`
const CabListRowThumb = styled.div`
  flex-shrink: 0;
  width: 44px;
  height: 52px;
  border-radius: 8px;
  overflow: hidden;
  background: linear-gradient(135deg, #f0f4ff 0%, #e8ecf8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
`
const CabListRowBody = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`
const CabListRowTop = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`
const CabListTermBadge = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
  background: #f1f5f9;
  border-radius: 4px;
  padding: 1px 5px;
  flex-shrink: 0;
`
const CabListRowName = styled.span`
  font-size: 13.5px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`
const CabListRowPos = styled.span`
  font-size: 11.5px;
  font-weight: 500;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`
const CabListRowRange = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: #94a3b8;
`

/* 카드 이미지 영역 */
const CabCardImageWrap = styled.div`
  width: 100%;
  aspect-ratio: 3 / 4;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #f0f4ff 0%, #e8ecf8 100%);
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      transparent 45%,
      rgba(15, 23, 42, 0.14) 100%
    );
    pointer-events: none;
  }
`
const CabCardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  display: block;
`
const CabCardImagePlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c0cad8;
`
const CabCardBody = styled.div`
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 3px;
`
const CabCardPrimary = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
`
const CabCardTermBadge = styled.span`
  font-size: 10.5px;
  font-weight: 700;
  color: #64748b;
  background: #f1f5f9;
  border-radius: 4px;
  padding: 1px 6px;
  flex-shrink: 0;
`
const CabCardPos = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`
const CabCardName = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`
const CabCardRange = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: #b0bac9;
  margin-top: 2px;
`
const CabCardCountryBadge = styled.span`
  display: inline-flex;
  align-items: center;
  margin-top: 5px;
  padding: 2px 7px;
  font-size: 10.5px;
  font-weight: 600;
  color: #7c3aed;
  background: rgba(124, 58, 237, 0.08);
  border-radius: 10px;
  white-space: nowrap;
  width: fit-content;
`
const CabCardActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
  position: absolute;
  top: 8px;
  right: 8px;
  ${CabCard}:hover & {
    opacity: 1;
  }
`

/* ── 상세 패널 내 수반 프로필 카드 ── */

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
  color: #374151;
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
    color: #475569;
  }
`
const CabBreadcrumbSep = styled.span`
  font-size: 11px;
  color: #cbd5e1;
  padding: 12px 0 8px;
  user-select: none;
`

/* ── 각료 상세 패널 (뷰 전환 방식) ── */

/* ── 각료 카드 그리드 ── */
const MinisterCardGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: #f0f2f7;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #f0f2f7;
`
const MinisterCard = styled.div<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: ${p => p.$selected ? '#eef2ff' : '#fff'};
  cursor: pointer;
  transition: background 0.12s;
  border-left: ${p => p.$selected ? '3px solid #6366f1' : '3px solid transparent'};
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
    background: ${p => p.$selected ? '#e0e7ff' : '#f8fafc'};
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
  background: #f1f5f9;
  border: 1.5px solid #e9edf5;
  color: #c0cad8;
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
  color: #0f172a;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`
const MinisterCardPos = styled.span`
  font-size: 11px;
  color: #64748b;
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
  color: #b0bac9;
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
  border: 1.5px solid #fff;
  line-height: 1;
`
const MinisterCardChevron = styled.span`
  color: #dde1ea;
  flex-shrink: 0;
`

/* ── 수반 상세 compact 프로필 블록 ── */
const HeadProfileBlock = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 18px;
  padding: 18px;
  background: #f8fafc;
  border: 1px solid #e8ecf0;
  border-radius: 14px;
  margin-bottom: 4px;
`
const HeadProfileAvatar = styled.div`
  flex-shrink: 0;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #e2e8f0;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s;
  &:hover {
    border-color: #94a3b8;
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
  color: #64748b;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 5px;
  padding: 2px 7px;
  letter-spacing: 0.01em;
  flex-shrink: 0;
`
const HeadProfileName = styled.h3`
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.03em;
  line-height: 1.2;
`
const HeadPosBadge = styled.span`
  display: inline-block;
  font-size: 11.5px;
  font-weight: 600;
  color: #475569;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
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
  color: #64748b;
  font-weight: 500;
`
const HeadTenureDuration = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  background: #f1f5f9;
  border-radius: 5px;
  padding: 1px 7px;
`
const HeadTenureAge = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  background: #f1f5f9;
  border-radius: 5px;
  padding: 1px 7px;
`
const HeadLifespan = styled.div`
  font-size: 11px;
  color: #b0bac9;
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
  color: #475569;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  cursor: pointer;
  transition:
    border-color 0.14s,
    background 0.14s;
  white-space: nowrap;
  &:hover {
    border-color: #94a3b8;
    background: #f8fafc;
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
  background: #f0f2f7;
  color: #94a3b8;
  font-size: 10px;
  font-weight: 700;
  border-radius: 10px;
  padding: 1px 7px;
`
const ProfileEmptyNote = styled.div`
  font-size: 13px;
  color: #c0cad8;
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
  background: #f8fafc;
  border-radius: 14px;
  border: 1.5px dashed #e2e8f0;
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.6;
  text-align: center;
`
const CardIconButton = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  background: #fff;
  color: #94a3b8;
  cursor: pointer;
  transition:
    background 0.14s,
    color 0.14s,
    border-color 0.14s;
  &:hover:not(:disabled) {
    background: ${(p) => (p.$danger ? '#fef2f2' : '#f8fafc')};
    color: ${(p) => (p.$danger ? '#dc2626' : '#475569')};
    border-color: ${(p) => (p.$danger ? '#fecaca' : '#94a3b8')};
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`
const MinisterHistoryOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`
const MinisterHistoryBox = styled.div`
  width: min(1080px, 100%);
  max-height: 90vh;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  box-shadow: 0 10px 36px rgba(15, 23, 42, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: ${Z_INDEX.MODAL_CONTENT};
`
const MinisterHistoryHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 24px;
  border-bottom: 1px solid #eef2f7;
`
const MinisterHistoryTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
`
const MinisterHistoryBody = styled.div`
  padding: 20px 24px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
`
const MinisterHistoryTarget = styled.div`
  font-size: 14px;
  color: #475569;
  strong {
    color: #0f172a;
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
  color: #475569;
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
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
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
  color: #0f172a;
`
const HistoryItemMeta = styled.div`
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
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
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #64748b;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background: #f8fafc;
    color: #334155;
  }
`

/* ——— 부처 상세 패널 (무슨 일을 했고, 직책·담당자) ——— */

/* ── 히스토리 목록 카드 ── */
const HistoryCardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: #f1f5f9;
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
    background: #fff0f3;
    color: #be123c;
  }
`
const HistoryCard = styled.div`
  position: relative;
  padding: 12px 58px 12px 14px;
  background: #fff;
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
    background: #f8fafc;
  }
  &:hover ${HistoryCardDeleteBtn} {
    display: flex;
  }
`
const HistoryCardTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
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
  color: #64748b;
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
  color: #c8d0db;
  display: flex;
  align-items: center;
`

/* ── 각료 프로필 compact block ── */
const MinisterProfileBlock = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 20px 0 16px;
  border-bottom: 1px solid #f1f5f9;
`
const MinisterProfileAvatar = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: #f1f5f9;
  border: 2px solid #e9edf5;
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
  color: #0f172a;
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
  color: #475569;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 5px;
  padding: 2px 7px;
`
const MinisterDeptTag = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: #64748b;
  background: #f1f5f9;
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
  color: #475569;
  background: #f1f5f9;
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
  color: #b0bac9;
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
  color: #475569;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition:
    background 0.14s,
    border-color 0.14s;
  &:hover {
    background: #f1f5f9;
    border-color: #94a3b8;
  }
`

/* ── 히스토리 NYT 상세 아티클 ── */
const NYT_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"

const HistoryArticleWrap = styled.div`
  padding: 0 0 48px;
  background: #fff;
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
    color: #475569;
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
    background: #fff0f3;
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
  color: #6b7280;
  background: none;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s;
  &:hover {
    color: #111827;
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
  color: #6b7280;
  background: none;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: color 0.15s;
  &:hover {
    color: #111827;
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
  color: #0f172a;
  border: 1.5px solid #e5e7eb;
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
  color: #475569;
  border: 1.5px solid #e5e7eb;
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
  color: #0f172a;
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
  border-top: 1px solid #f1f5f9;
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
  color: #64748b;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;
  &:hover:not(:disabled) {
    color: #0f172a;
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
  color: #1e293b;
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
    color: #0f172a;
    margin: 1.3em 0 0.45em;
  }
  blockquote {
    margin: 18px 0;
    padding: 10px 18px;
    border-left: 3px solid #e5e7eb;
    color: #475569;
    font-style: italic;
  }
  hr {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 20px 0;
  }
  img {
    max-width: 100%;
    border-radius: 8px;
    margin: 14px 0;
  }

  /* 엔티티 연결 — 포스트 상세와 동일 */
  .mention,
  .entity-link {
    color: #2563eb;
    text-decoration: none;
    cursor: pointer;
    border-radius: 2px;
    transition: color 0.15s ease;
  }
  .mention:hover,
  .entity-link:hover {
    color: #1d4ed8;
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
const PersonViewModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.48);
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 32px 16px;
  overflow-y: auto;
`
const PersonViewModalPanel = styled(motion.div)`
  width: 100%;
  max-width: 900px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18);
  z-index: ${Z_INDEX.MODAL_CONTENT};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 88vh;
`
const PersonViewModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f2f7;
  flex-shrink: 0;
`
const PersonViewModalTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
`
const PersonViewModalBody = styled.div`
  overflow-y: auto;
  flex: 1;
`

/* ── 수반 재임 부가정보 (임명방식·퇴임사유·비고) ── */
const HeadTenureInfoSection = styled.div`
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #fff;
  border: 1.5px solid #f0f2f7;
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
  background: #f8fafc;
  color: #475569;
  border: 1px solid #e2e8f0;
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
  color: #374151;
  background: #f1f5f9;
  border-radius: 5px;
  padding: 2px 8px;
`
const HeadTenureInfoText = styled.p`
  margin: 0;
  font-size: 12.5px;
  color: #475569;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
`
