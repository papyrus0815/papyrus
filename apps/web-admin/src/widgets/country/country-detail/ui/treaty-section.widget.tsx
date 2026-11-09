import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  FiChevronLeft,
  FiEdit2,
  FiExternalLink,
  FiFileText,
  FiGlobe,
  FiImage,
  FiMapPin,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled, { ThemeProvider, keyframes, useTheme } from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import type { CountryResponseDto } from '@/shared/api/countries'
import { getAllCountries } from '@/shared/api/countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import {
  type CabinetListItemDto,
  personCareerApi,
} from '@/shared/api/person-career'
import { getAllPersons } from '@/shared/api/persons'
import {
  type AddTreatyImageDto,
  type CreateTreatyDto,
  type CreateTreatyTermDto,
  TREATY_EVENT_LINK_LABELS,
  TREATY_PARTICIPATION_LABELS,
  TREATY_TYPE_LABELS,
  type TreatyDto,
  type TreatyEventLinkType,
  type TreatyEventLinkWithEventDto,
  type TreatyParticipationType,
  type TreatySignatoryDto,
  type TreatyType,
  treatyApi,
  treatyTypeTone,
} from '@/shared/api/treaty'
import { uploadImage } from '@/shared/api/upload'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import { parseIsoDateParts } from '@/shared/lib/iso-date'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import { getTreatySectionPalette } from '@/shared/styles/country-detail-palette'
import { useThemeStore } from '@/shared/styles/theme.store'
import { confirm } from '@/shared/ui/confirm-dialog'
import { CountryPicker } from '@/shared/ui/country-picker'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import { AddButton, SectionTabHeader } from '@/shared/ui/section-page-layout'
import { notify } from '@/shared/ui/toast'

import {
  CountryInlineModal,
  type CountryInlineModalTarget,
  shouldInterceptEntityClick,
} from '@/widgets/country/country-inline-modal'

import * as DashboardStyles from './country-detail-dashboard.styles'
import * as TD from './treaty-detail.styles'

const fadeIn = keyframes`from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; }`

// ──────────────────────────────────────────────
// Styled Components
// ──────────────────────────────────────────────

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 28px 32px 48px;
  min-height: 400px;
  animation: ${fadeIn} 0.18s ease;

  @media (max-width: 768px) {
    padding: 20px 16px 36px;
  }
`

const TreatyHeaderActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const TreatySecondaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.hover};
  }
`

const Empty = styled.div`
  padding: 28px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 13px;
`

const TreatyEmptySpecGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const TreatyEmptySpecCell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 20px 22px;

  &:first-child {
    border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  }

  @media (max-width: 768px) {
    &:first-child {
      border-right: none;
      border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
    }
  }
`

const TreatyEmptySpecTitle = styled.div`
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const TreatyEmptySpecDesc = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const TreatyEmptySpecAction = styled.button`
  margin-top: 4px;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.hover};
  }
`

const TreatyToolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

const TreatyFilterGroup = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

const TreatyFilterChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border.light};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const TreatyFilterCount = styled.span`
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  opacity: 0.8;
`

const TreatyToolbarRight = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const TreatyResultSummary = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const TreatyResetBtn = styled.button`
  padding: 4px 8px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const TreatySearchBox = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  width: 240px;
  max-width: 100%;
  padding: 6px 10px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const TreatySearchInput = styled.input`
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const TreatyViewToggle = styled.div`
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const TreatyViewBtn = styled.button<{ $active: boolean }>`
  padding: 4px 9px;
  border: none;
  border-radius: 5px;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.tertiary};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.background.primary : 'transparent'};
`

const TreatyLedgerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const TreatyLedgerRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  cursor: pointer;
  transition: background 0.14s ease;

  &:nth-child(odd) {
    border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  }

  &:last-child:nth-child(odd) {
    grid-column: 1 / -1;
    border-right: none;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }

  @media (max-width: 900px) {
    &:nth-child(odd) {
      border-right: none;
    }
  }
`

const TreatyLedgerMain = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1;
`

const TreatyTitleLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

const TreatyLedgerName = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const TreatyLedgerTypeBadge = styled.span`
  padding: 1px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.activeLight};
`

const TreatyViolationBadge = styled.span`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #dc2626;
  background: rgba(220, 38, 38, 0.1);
`

const TreatyMetaLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const TreatyDetailBtn = styled.button`
  padding: 4px 8px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
`

const Card = styled.div`
  background: ${({ theme }) => theme.ts!.card};
  border: 1px solid ${({ theme }) => theme.ts!.border};
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition:
    box-shadow 0.15s,
    transform 0.15s;
  &:hover {
    box-shadow: ${({ theme }) => theme.ts!.cardHoverShadow};
    transform: translateY(-2px);
  }
`

const CardThumb = styled.div<{ $url?: string | null }>`
  width: 100%;
  height: 140px;
  background: ${({ $url }) =>
    $url
      ? `url(${$url}) center/cover no-repeat`
      : `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`};
  position: relative;
`

const CardTypeBadge = styled.span`
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  backdrop-filter: blur(4px);
`

const CardBody = styled.div`
  padding: 14px 16px;
`

const CardName = styled.h3`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.ts!.text};
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const CardAlias = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.ts!.textMuted};
  margin: 0 0 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const CardMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
`

const MetaChip = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.ts!.textSub};
  background: ${({ theme }) => theme.ts!.bg};
  border: 1px solid ${({ theme }) => theme.ts!.border};
  border-radius: 6px;
  padding: 2px 7px;
`

const SignatoryList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`

const SignatoryChip = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  background: ${({ theme }) => theme.ts!.mainLight};
  border: 1px solid ${({ theme }) => theme.ts!.signatoryChipBorder};
  border-radius: 20px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.ts!.main};
`

// ─── 상세 뷰 ─── 스타일은 ./treaty-detail.styles (사건 상세 문법)

// ─── 모달 ───

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`

const Modal = styled.div`
  background: ${({ theme }) => theme.ts!.card};
  border-radius: 18px;
  width: 100%;
  max-width: 640px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: ${({ theme }) => theme.ts!.modalShadow};
`

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 0;
  position: sticky;
  top: 0;
  background: ${({ theme }) => theme.ts!.card};
  z-index: 1;
`

const ModalTitle = styled.h3`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.ts!.text};
  margin: 0;
`

const CloseBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.ts!.textMuted};
  padding: 4px;
  &:hover {
    color: ${({ theme }) => theme.ts!.text};
  }
`

const ModalBody = styled.div`
  padding: 16px 20px 20px;
`

const FormRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const Field = styled.div``
const FieldLabel = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.ts!.textSub};
  margin-bottom: 5px;
`

const FieldHint = styled.p`
  margin: 6px 0 0;
  font-size: 11.5px;
  color: ${({ theme }) => theme.ts!.textMuted};
  line-height: 1.45;
`

const PickCountryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => theme.ts!.borderMid};
  background: ${({ theme }) => theme.ts!.card};
  color: ${({ theme }) => theme.ts!.text};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    border-color: ${({ theme }) => theme.ts!.main};
    color: ${({ theme }) => theme.ts!.main};
  }
`

const Input = styled.input`
  width: 100%;
  padding: 9px 12px;
  border: 1px solid ${({ theme }) => theme.ts!.borderMid};
  border-radius: 9px;
  font-size: 13px;
  color: ${({ theme }) => theme.ts!.text};
  background: ${({ theme }) => theme.ts!.inputBg};
  box-sizing: border-box;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ts!.main};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.ts!.mainLight};
  }
`

const Textarea = styled.textarea`
  width: 100%;
  padding: 9px 12px;
  border: 1px solid ${({ theme }) => theme.ts!.borderMid};
  border-radius: 9px;
  font-size: 13px;
  color: ${({ theme }) => theme.ts!.text};
  background: ${({ theme }) => theme.ts!.inputBg};
  resize: vertical;
  min-height: 80px;
  box-sizing: border-box;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ts!.main};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.ts!.mainLight};
  }
`

const Select = styled.select`
  width: 100%;
  padding: 9px 12px;
  border: 1px solid ${({ theme }) => theme.ts!.borderMid};
  border-radius: 9px;
  font-size: 13px;
  color: ${({ theme }) => theme.ts!.text};
  background: ${({ theme }) => theme.ts!.inputBg};
  box-sizing: border-box;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ts!.main};
  }
`

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 20px 20px;
`

const CancelBtn = styled.button`
  padding: 9px 18px;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => theme.ts!.border};
  background: ${({ theme }) => theme.ts!.card};
  color: ${({ theme }) => theme.ts!.textSub};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
`

const SubmitBtn = styled.button`
  padding: 9px 18px;
  border-radius: 9px;
  border: none;
  background: ${({ theme }) => theme.ts!.main};
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.ts!.mainHover};
  }
`

const Row2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`

const Required = styled.span`
  color: ${({ theme }) => theme.ts!.danger};
`

// ──────────────────────────────────────────────
// 날짜 포맷 헬퍼
// ──────────────────────────────────────────────

/**
 * 조약 날짜 표시.
 *
 * ⚠️ `new Date(iso).toLocaleDateString()`를 쓰면 안 된다 — API가 자정 UTC로 내려주는
 * 날짜가 뷰어의 시간대에 따라 하루 밀린다(UTC-N 지역에서 1939-08-23이 8월 22일로 보였다).
 * 조약 날짜는 시각이 아니라 달력상의 날이므로 ISO 문자열을 그대로 읽는다.
 */
/** 연도 — 기원전은 '기원전 N'(목록·상세·장부 공통 표기) */
function formatYear(year: number): string {
  return year < 0 ? `기원전 ${-year}` : String(year)
}

/** 사건 연도 — 구조화 연도(BC 포함)가 정본, 없으면 startDate */
function eventYearLabel(
  event: NonNullable<TreatyEventLinkWithEventDto['event']>,
): string | null {
  if (event.startYear !== null && event.startYear !== undefined) {
    return formatYear(
      event.startEra === 'BC' ? -event.startYear : event.startYear,
    )
  }
  const parts = parseIsoDateParts(event.startDate)
  return parts ? formatYear(parts.year) : null
}

/* 체결 → 비준 → 파기 → 관련 — 조약의 일생 순서 */
const EVENT_LINK_ORDER: Record<TreatyEventLinkType, number> = {
  SIGNING: 0,
  RATIFICATION: 1,
  VIOLATION: 2,
  RELATED: 3,
}

/**
 * 서명국 비고 — 3줄에서 접고, 실제로 넘칠 때만 '더 보기'를 단다.
 * 글자 수로 어림하면 카드 폭(3열 245px ↔ 모바일 2열 170px)마다 틀려서 실측한다.
 */
function SignatoryNote({ note }: { note: string }) {
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    const element = textRef.current
    if (!element || expanded) return undefined
    const measure = () =>
      setOverflowing(element.scrollHeight > element.clientHeight + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [note, expanded])

  return (
    <TD.PartyNote>
      <TD.PartyNoteText ref={textRef} $expanded={expanded}>
        {note}
      </TD.PartyNoteText>
      {(overflowing || expanded) && (
        <TD.NoteToggle
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((previous) => !previous)}
        >
          {expanded ? '접기' : '더 보기'}
        </TD.NoteToggle>
      )}
    </TD.PartyNote>
  )
}

function fmtDate(value: string | null | undefined) {
  if (!value) return '—'
  const parts = parseIsoDateParts(value)
  if (!parts) return value
  const year =
    parts.year < 0 ? `기원전 ${-parts.year}년` : `${parts.year}년`
  return `${year} ${parts.month}월 ${parts.day}일`
}

/** `<input type="date">` 값 — 위와 같은 이유로 로컬 Date를 거치지 않는다 */
function toInputDate(value: string | null | undefined) {
  if (!value) return ''
  const parts = parseIsoDateParts(value)
  if (!parts) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${String(parts.year).padStart(4, '0')}-${pad(parts.month)}-${pad(parts.day)}`
}

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────

interface TreatySectionProps {
  country: UnifiedCountry
}

// ──────────────────────────────────────────────
// Main Widget
// ──────────────────────────────────────────────

export const TreatySectionWidget: React.FC<TreatySectionProps> = ({
  country,
}) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const countryId = country.type === 'modern' ? country.id : undefined
  const historicalCountryId =
    country.type === 'historical' ? country.id : undefined

  const { data: treaties = [], isLoading } = useQuery({
    queryKey: ['treaties', countryId, historicalCountryId],
    queryFn: async () => {
      const response = await treatyApi.getAll({
        countryId,
        historicalCountryId,
      })
      return response.items
    },
    enabled: !!(countryId || historicalCountryId),
  })

  const [detailId, setDetailId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TreatyType | 'ALL'>('ALL')
  const [viewMode, setViewMode] = useState<'ledger' | 'cards'>('ledger')

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ['treaties'],
    })
    void queryClient.invalidateQueries({
      queryKey: ['treaties-by-country'],
    })
    if (detailId) {
      void queryClient.invalidateQueries({ queryKey: ['treaty', detailId] })
    }
  }, [queryClient, detailId])

  const distinctTypeCount = useMemo(() => {
    const typeSet = new Set<string>()
    for (const treatyItem of treaties) {
      if (treatyItem.type) typeSet.add(treatyItem.type)
    }
    return typeSet.size
  }, [treaties])

  const violatedList = useMemo(
    () => treaties.filter((treatyItem) => Boolean(treatyItem.violationDate)),
    [treaties],
  )
  const validCount = treaties.length - violatedList.length

  const typeChipItems = useMemo(() => {
    const counts = new Map<TreatyType, number>()
    for (const treatyItem of treaties) {
      counts.set(treatyItem.type, (counts.get(treatyItem.type) ?? 0) + 1)
    }
    return [...counts.entries()].map(([typeKey, count]) => ({
      typeKey,
      label: TREATY_TYPE_LABELS[typeKey] ?? typeKey,
      count,
    }))
  }, [treaties])

  const filteredTreaties = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase()
    return treaties.filter((treatyItem) => {
      if (typeFilter !== 'ALL' && treatyItem.type !== typeFilter) return false
      if (!keyword) return true
      const signatoryNames = treatyItem.signatories
        .map(
          (signatory) =>
            signatory.country?.name ?? signatory.historicalCountry?.name ?? '',
        )
        .join(' ')
      return [
        treatyItem.name,
        treatyItem.alias,
        treatyItem.location,
        TREATY_TYPE_LABELS[treatyItem.type],
        signatoryNames,
      ].some((field) => field?.toLowerCase().includes(keyword))
    })
  }, [treaties, typeFilter, searchQuery])

  const hasActiveFilter =
    typeFilter !== 'ALL' || searchQuery.trim().length > 0

  const parentTheme = useTheme()
  const { mode } = useThemeStore()
  const treatyPalette = getTreatySectionPalette(mode === 'dark')
  const treatyTheme = useMemo(
    () => ({ ...parentTheme, ts: treatyPalette }),
    [parentTheme, treatyPalette],
  )

  const inner = detailId ? (
    <TreatyDetail
      treatyId={detailId}
      onBack={() => setDetailId(null)}
      onInvalidate={invalidate}
    />
  ) : (
    <Wrap>
      <SectionTabHeader
        variant="plain"
        title="조약 · 협정"
        description={`${country.name}이(가) 서명·참여한 조약과 협정의 체결일, 발효·만료·파기 이력 및 당사국을 관리합니다.`}
        rightSlot={
          <TreatyHeaderActions>
            <TreatySecondaryBtn
              type="button"
              onClick={() => navigate(pathKeys.treaties.list())}
            >
              <FiExternalLink size={14} />
              조약 카탈로그
            </TreatySecondaryBtn>
            <AddButton type="button" onClick={() => setCreateOpen(true)}>
              <FiPlus size={14} /> 조약 등록
            </AddButton>
          </TreatyHeaderActions>
        }
      />

      <DashboardStyles.SectionHeadlineStrip aria-label="조약 요약 지표">
        <DashboardStyles.SectionHeadlineCell>
          <DashboardStyles.SectionHeadlineLabel>
            전체 참여 조약
          </DashboardStyles.SectionHeadlineLabel>
          <DashboardStyles.SectionHeadlineValue $muted={treaties.length === 0}>
            {treaties.length > 0 ? (
              <>
                {treaties.length.toLocaleString('ko-KR')}
                <DashboardStyles.SectionHeadlineUnit>
                  건
                </DashboardStyles.SectionHeadlineUnit>
              </>
            ) : (
              '미등록'
            )}
          </DashboardStyles.SectionHeadlineValue>
          <DashboardStyles.SectionHeadlineSub>
            {treaties.length > 0
              ? '서명 · 비준 · 가입 조약 및 협정'
              : '등록된 참여 조약 없음'}
          </DashboardStyles.SectionHeadlineSub>
        </DashboardStyles.SectionHeadlineCell>

        <DashboardStyles.SectionHeadlineCell>
          <DashboardStyles.SectionHeadlineLabel>
            체결 조약 유형
          </DashboardStyles.SectionHeadlineLabel>
          <DashboardStyles.SectionHeadlineValue
            $muted={distinctTypeCount === 0}
          >
            {distinctTypeCount > 0 ? (
              <>
                {distinctTypeCount.toLocaleString('ko-KR')}
                <DashboardStyles.SectionHeadlineUnit>
                  종
                </DashboardStyles.SectionHeadlineUnit>
              </>
            ) : (
              '없음'
            )}
          </DashboardStyles.SectionHeadlineValue>
          <DashboardStyles.SectionHeadlineSub>
            {treaties.length > 0
              ? '불가침 · 평화 · 동맹 · 통상 등 분류'
              : '조약 유형 데이터 대기'}
          </DashboardStyles.SectionHeadlineSub>
        </DashboardStyles.SectionHeadlineCell>

        <DashboardStyles.SectionHeadlineCell>
          <DashboardStyles.SectionHeadlineLabel>
            유효 · 이행 기록
          </DashboardStyles.SectionHeadlineLabel>
          <DashboardStyles.SectionHeadlineValue $muted={validCount === 0}>
            {validCount > 0 ? (
              <>
                {validCount.toLocaleString('ko-KR')}
                <DashboardStyles.SectionHeadlineUnit>
                  건
                </DashboardStyles.SectionHeadlineUnit>
              </>
            ) : (
              '없음'
            )}
          </DashboardStyles.SectionHeadlineValue>
          <DashboardStyles.SectionHeadlineSub>
            {treaties.length > 0
              ? '파기 기록 없는 체결·발효 조약'
              : '유효·이행 조약 없음'}
          </DashboardStyles.SectionHeadlineSub>
        </DashboardStyles.SectionHeadlineCell>

        <DashboardStyles.SectionHeadlineCell>
          <DashboardStyles.SectionHeadlineLabel>
            파기 · 위반 기록
          </DashboardStyles.SectionHeadlineLabel>
          <DashboardStyles.SectionHeadlineValue
            $muted={violatedList.length === 0}
          >
            {violatedList.length > 0 ? (
              <>
                {violatedList.length.toLocaleString('ko-KR')}
                <DashboardStyles.SectionHeadlineUnit>
                  건
                </DashboardStyles.SectionHeadlineUnit>
              </>
            ) : (
              '없음'
            )}
          </DashboardStyles.SectionHeadlineValue>
          <DashboardStyles.SectionHeadlineSub>
            {violatedList.length > 0
              ? '파기일 또는 위반 사유 명시 조약'
              : '파기·위반 기록 없음'}
          </DashboardStyles.SectionHeadlineSub>
        </DashboardStyles.SectionHeadlineCell>
      </DashboardStyles.SectionHeadlineStrip>

      {isLoading ? (
        <Empty>불러오는 중…</Empty>
      ) : treaties.length === 0 ? (
        <TreatyEmptySpecGrid>
          <TreatyEmptySpecCell>
            <TreatyEmptySpecTitle>
              1. 신규 조약 · 협정 직접 등록
            </TreatyEmptySpecTitle>
            <TreatyEmptySpecDesc>
              강화도조약, 베르사유 조약, 상호방위조약 등 {country.name}이(가) 서명·참여한 조약의 체결일, 조항, 서명국을 등록합니다.
            </TreatyEmptySpecDesc>
            <TreatyEmptySpecAction
              type="button"
              onClick={() => setCreateOpen(true)}
            >
              + 첫 조약 등록 →
            </TreatyEmptySpecAction>
          </TreatyEmptySpecCell>

          <TreatyEmptySpecCell>
            <TreatyEmptySpecTitle>
              2. 전역 조약 카탈로그에서 당사국 연결
            </TreatyEmptySpecTitle>
            <TreatyEmptySpecDesc>
              전체 조약 카탈로그에 이미 등록된 다자·양자 조약에서 이 국가를 서명국·비준국으로 추가하면 이 탭과 대시보드에 자동 집계됩니다.
            </TreatyEmptySpecDesc>
            <TreatyEmptySpecAction
              type="button"
              onClick={() => navigate(pathKeys.treaties.list())}
            >
              조약 카탈로그로 이동 →
            </TreatyEmptySpecAction>
          </TreatyEmptySpecCell>
        </TreatyEmptySpecGrid>
      ) : (
        <>
          <TreatyToolbar>
            <TreatyFilterGroup role="tablist" aria-label="조약 유형 필터">
              <TreatyFilterChip
                type="button"
                role="tab"
                aria-selected={typeFilter === 'ALL'}
                $active={typeFilter === 'ALL'}
                onClick={() => setTypeFilter('ALL')}
              >
                전체 <TreatyFilterCount>{treaties.length}</TreatyFilterCount>
              </TreatyFilterChip>
              {typeChipItems.map((chip) => (
                <TreatyFilterChip
                  key={chip.typeKey}
                  type="button"
                  role="tab"
                  aria-selected={typeFilter === chip.typeKey}
                  $active={typeFilter === chip.typeKey}
                  onClick={() => setTypeFilter(chip.typeKey)}
                >
                  {chip.label}{' '}
                  <TreatyFilterCount>{chip.count}</TreatyFilterCount>
                </TreatyFilterChip>
              ))}
            </TreatyFilterGroup>

            <TreatyToolbarRight>
              {hasActiveFilter && (
                <>
                  <TreatyResultSummary>
                    검색 결과 {filteredTreaties.length}건
                  </TreatyResultSummary>
                  <TreatyResetBtn
                    type="button"
                    onClick={() => {
                      setTypeFilter('ALL')
                      setSearchQuery('')
                    }}
                  >
                    필터 초기화
                  </TreatyResetBtn>
                </>
              )}
              <TreatySearchBox>
                <FiSearch size={13} />
                <TreatySearchInput
                  type="search"
                  value={searchQuery}
                  onChange={(changeEvent) =>
                    setSearchQuery(changeEvent.target.value)
                  }
                  placeholder="조약명 · 별칭 · 체결지 · 당사국 검색…"
                  aria-label="조약 검색"
                />
              </TreatySearchBox>
              <TreatyViewToggle role="group" aria-label="조약 보기 방식">
                <TreatyViewBtn
                  type="button"
                  $active={viewMode === 'ledger'}
                  onClick={() => setViewMode('ledger')}
                >
                  2열 원장
                </TreatyViewBtn>
                <TreatyViewBtn
                  type="button"
                  $active={viewMode === 'cards'}
                  onClick={() => setViewMode('cards')}
                >
                  카드
                </TreatyViewBtn>
              </TreatyViewToggle>
            </TreatyToolbarRight>
          </TreatyToolbar>

          {filteredTreaties.length === 0 ? (
            <Empty>선택한 유형이나 검색어와 일치하는 조약이 없습니다.</Empty>
          ) : viewMode === 'ledger' ? (
            <TreatyLedgerGrid>
              {filteredTreaties.map((treatyItem) => (
                <TreatyLedgerRow
                  key={treatyItem.id}
                  onClick={() => setDetailId(treatyItem.id)}
                >
                  <TreatyLedgerMain>
                    <TreatyTitleLine>
                      <TreatyLedgerName>{treatyItem.name}</TreatyLedgerName>
                      <TreatyLedgerTypeBadge>
                        {TREATY_TYPE_LABELS[treatyItem.type]}
                      </TreatyLedgerTypeBadge>
                      {treatyItem.violationDate && (
                        <TreatyViolationBadge>
                          파기 {fmtDate(treatyItem.violationDate)}
                        </TreatyViolationBadge>
                      )}
                    </TreatyTitleLine>
                    <TreatyMetaLine>
                      <span>서명 {fmtDate(treatyItem.signDate)}</span>
                      {treatyItem.location && (
                        <span>· {treatyItem.location}</span>
                      )}
                      {treatyItem.alias && <span>· {treatyItem.alias}</span>}
                    </TreatyMetaLine>
                    {treatyItem.signatories.length > 0 && (
                      <SignatoryList>
                        {treatyItem.signatories.map((signatory) => {
                          const signatoryName =
                            signatory.country?.name ??
                            signatory.historicalCountry?.name ??
                            '?'
                          const flag = signatory.country?.flagEmoji ?? ''
                          return (
                            <SignatoryChip key={signatory.id}>
                              {flag && <span>{flag}</span>}
                              {signatoryName}
                            </SignatoryChip>
                          )
                        })}
                      </SignatoryList>
                    )}
                  </TreatyLedgerMain>
                  <TreatyDetailBtn
                    type="button"
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation()
                      setDetailId(treatyItem.id)
                    }}
                  >
                    상세 →
                  </TreatyDetailBtn>
                </TreatyLedgerRow>
              ))}
            </TreatyLedgerGrid>
          ) : (
            <Grid>
              {filteredTreaties.map((treatyItem) => {
                const thumb =
                  treatyItem.images.find((imageItem) => imageItem.isPrimary)
                    ?.imageUrl ?? treatyItem.images[0]?.imageUrl
                return (
                  <Card
                    key={treatyItem.id}
                    onClick={() => setDetailId(treatyItem.id)}
                  >
                    <CardThumb $url={thumb}>
                      <CardTypeBadge>
                        {TREATY_TYPE_LABELS[treatyItem.type]}
                      </CardTypeBadge>
                    </CardThumb>
                    <CardBody>
                      <CardName>{treatyItem.name}</CardName>
                      {treatyItem.alias && (
                        <CardAlias>{treatyItem.alias}</CardAlias>
                      )}
                      <CardMeta>
                        <MetaChip>서명 {fmtDate(treatyItem.signDate)}</MetaChip>
                        {treatyItem.violationDate && (
                          <MetaChip style={{ color: treatyPalette.danger }}>
                            파기 {fmtDate(treatyItem.violationDate)}
                          </MetaChip>
                        )}
                        {treatyItem.location && (
                          <MetaChip>{treatyItem.location}</MetaChip>
                        )}
                      </CardMeta>
                      <SignatoryList>
                        {treatyItem.signatories.map((signatory) => {
                          const signatoryName =
                            signatory.country?.name ??
                            signatory.historicalCountry?.name ??
                            '?'
                          const flag = signatory.country?.flagEmoji ?? ''
                          return (
                            <SignatoryChip key={signatory.id}>
                              {flag && <span>{flag}</span>}
                              {signatoryName}
                            </SignatoryChip>
                          )
                        })}
                      </SignatoryList>
                    </CardBody>
                  </Card>
                )
              })}
            </Grid>
          )}
        </>
      )}

      {createOpen && (
        <TreatyCreateModal
          country={country}
          onClose={() => setCreateOpen(false)}
          onCreated={(createdId) => {
            setCreateOpen(false)
            invalidate()
            setDetailId(createdId)
          }}
        />
      )}
    </Wrap>
  )

  return <ThemeProvider theme={treatyTheme}>{inner}</ThemeProvider>
}

// ──────────────────────────────────────────────
// 조약 생성 모달
// ──────────────────────────────────────────────

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const s = String(iso).trim()
  if (s.length >= 10) return s.slice(0, 10)
  return s
}

function cabinetListLabel(c: CabinetListItemDto): string {
  const head = c?.headTenure
  const tn = head?.ordinal
  const sub = head?.subTermNumber
  const term =
    tn != null ? (sub != null ? `제${tn}대 ${sub}기` : `제${tn}대`) : ''
  const p = head?.person
  const pn = p
    ? getPersonDisplayName({
        name: p.name ?? '',
        surname: p.surname,
        middleName: (p as { middleName?: string | null }).middleName,
        nameDisplayOrder: (p as { nameDisplayOrder?: string | null })
          .nameDisplayOrder,
        country: (
          p as {
            country?: { defaultNameDisplayOrder?: string | null } | null
          }
        ).country,
      })
    : ''
  const nm = c?.name?.trim()
  return [nm, term, pn].filter(Boolean).join(' · ') || '행정부'
}

/**
 * 조약 등록 — 국가 상세 조약 탭(그 나라가 첫 서명국으로 미리 채워짐)과 조약 카탈로그
 * (`/treaties`, 국가 없이 시작)가 함께 쓴다. ⚠️ {@link TreatySectionThemeProvider} 안에서 렌더할 것.
 */
export const TreatyCreateModal: React.FC<{
  country?: UnifiedCountry | null
  onClose: () => void
  onCreated: (id: string) => void
}> = ({ country = null, onClose, onCreated }) => {
  const [name, setName] = useState('')
  const [alias, setAlias] = useState('')
  const [type, setType] = useState<TreatyType>('NON_AGGRESSION')
  const [signDate, setSignDate] = useState('')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [violationDate, setViolationDate] = useState('')
  const [violationReason, setViolationReason] = useState('')
  const [location, setLocation] = useState('')
  const [summary, setSummary] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [countryPickerOpen, setCountryPickerOpen] = useState(false)
  const [sigCountryId, setSigCountryId] = useState<string | null>(() =>
    country?.type === 'modern' ? country.id : null,
  )
  const [sigHistoricalCountryId, setSigHistoricalCountryId] = useState<
    string | null
  >(() => (country?.type === 'historical' ? country.id : null))
  const [sigCountryLabel, setSigCountryLabel] = useState(
    () => country?.name ?? '',
  )
  const [linkCabinetId, setLinkCabinetId] = useState('')

  /* 행정부 후보는 **고른 첫 서명국**을 따른다 — 예전엔 진입한 국가 탭에 고정돼 있어서,
     서명국을 다른 나라로 바꿔도 원래 나라의 행정부가 그대로 후보로 남았다. */
  const countryIdForCabinets = sigCountryId ?? undefined
  const historicalCountryIdForCabinets = sigHistoricalCountryId ?? undefined

  const { data: modernCountries = [] } = useQuery({
    queryKey: ['treaty-modal-countries'],
    queryFn: () => getAllCountries(),
    staleTime: 60_000,
  })
  const { data: historicalCountries = [] } = useQuery({
    queryKey: ['treaty-modal-hist-countries'],
    queryFn: () => getAllHistoricalCountries(),
    staleTime: 60_000,
  })
  const { data: countryCabinets = [] } = useQuery({
    queryKey: [
      'cabinets-for-treaty-create',
      countryIdForCabinets,
      historicalCountryIdForCabinets,
    ],
    queryFn: () =>
      personCareerApi.getCabinets({
        countryId: countryIdForCabinets,
        historicalCountryId: historicalCountryIdForCabinets,
      }),
    enabled: Boolean(countryIdForCabinets || historicalCountryIdForCabinets),
    staleTime: 60_000,
  })

  const handleSubmit = async () => {
    if (!name.trim() || !signDate.trim()) {
      notify.error('조약명과 서명일은 필수입니다.')
      return
    }
    if (!sigCountryId && !sigHistoricalCountryId) {
      notify.error('이 조약에 포함될 국가(현대 또는 역사)를 선택하세요.')
      return
    }
    setSubmitting(true)
    try {
      const dto: CreateTreatyDto = {
        name: name.trim(),
        alias: alias.trim() || null,
        type,
        signDate,
        effectiveDate: effectiveDate || null,
        expiryDate: expiryDate || null,
        violationDate: violationDate || null,
        violationReason: violationReason.trim() || null,
        location: location.trim() || null,
        summary: summary.trim() || null,
        signatories: [
          {
            countryId: sigCountryId,
            historicalCountryId: sigHistoricalCountryId,
            participationType: 'SIGNATORY',
            ...(linkCabinetId.trim()
              ? { cabinetId: linkCabinetId.trim() }
              : {}),
          },
        ],
      }
      const created = await treatyApi.create(dto)
      notify.success('조약이 등록되었습니다.')
      onCreated(created.id)
    } catch (e) {
      notify.error(getApiErrorMessage(e, '등록 중 오류가 발생했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>조약 등록</ModalTitle>
          <CloseBtn onClick={onClose}>
            <FiX size={18} />
          </CloseBtn>
        </ModalHeader>
        <ModalBody>
          <FormRows>
            <Field>
              <FieldLabel>참여 국가 (첫 서명국)</FieldLabel>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <PickCountryBtn
                  type="button"
                  onClick={() => setCountryPickerOpen(true)}
                >
                  <FiGlobe size={14} />
                  {sigCountryLabel || '국가 선택'}
                </PickCountryBtn>
                {(sigCountryId || sigHistoricalCountryId) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSigCountryId(null)
                      setSigHistoricalCountryId(null)
                      setSigCountryLabel('')
                      setLinkCabinetId('')
                    }}
                    style={{
                      fontSize: 12,
                      color: '#64748b',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    선택 해제
                  </button>
                )}
              </div>
              <FieldHint>
                조약 등록 시 이 국가가 첫 서명국으로 들어갑니다. 목록에서 다른
                국가로 바꿀 수 있습니다.
              </FieldHint>
            </Field>
            <Field>
              <FieldLabel>행정부 연결 (선택)</FieldLabel>
              <Select
                value={linkCabinetId}
                onChange={(e) => setLinkCabinetId(e.target.value)}
              >
                <option value="">
                  연결 안 함 — 행정부 상세「체결 조약」에는 나오지 않음
                </option>
                {countryCabinets.map((c) => (
                  <option key={c.id} value={c.id}>
                    {cabinetListLabel(c)}
                  </option>
                ))}
              </Select>
              <FieldHint>
                행정부 상세의 체결 조약 목록은 서명국에 행정부 ID가 있을 때만
                표시됩니다. 여기서 고르면 국가 조약 탭에서 등록해도 해당
                행정부에 보입니다. 나중에 행정부 화면「조약 연결」로도 할 수
                있습니다.
              </FieldHint>
            </Field>
            <Field>
              <FieldLabel>
                조약명 <Required>*</Required>
              </FieldLabel>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 독소 불가침 조약"
              />
            </Field>
            <Field>
              <FieldLabel>별칭 (선택)</FieldLabel>
              <Input
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="예: 몰로토프-리벤트로프 조약"
              />
            </Field>
            <Row2>
              <Field>
                <FieldLabel>
                  조약 유형 <Required>*</Required>
                </FieldLabel>
                <Select
                  value={type}
                  onChange={(e) => setType(e.target.value as TreatyType)}
                >
                  {(
                    Object.entries(TREATY_TYPE_LABELS) as [TreatyType, string][]
                  ).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field>
                <FieldLabel>서명 장소 (선택)</FieldLabel>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="예: 모스크바"
                />
              </Field>
            </Row2>
            <Row2>
              <Field>
                <FieldLabel>
                  서명일 <Required>*</Required>
                </FieldLabel>
                <Input
                  type="date"
                  value={signDate}
                  onChange={(e) => setSignDate(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>발효일 (선택)</FieldLabel>
                <Input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                />
              </Field>
            </Row2>
            <Row2>
              <Field>
                <FieldLabel>만료일 (선택)</FieldLabel>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>파기일 (선택)</FieldLabel>
                <Input
                  type="date"
                  value={violationDate}
                  onChange={(e) => setViolationDate(e.target.value)}
                />
              </Field>
            </Row2>
            {violationDate && (
              <Field>
                <FieldLabel>파기 사유 (선택)</FieldLabel>
                <Input
                  value={violationReason}
                  onChange={(e) => setViolationReason(e.target.value)}
                  placeholder="파기 이유를 간략히 입력하세요"
                />
              </Field>
            )}
            <Field>
              <FieldLabel>개요 (선택)</FieldLabel>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="조약의 핵심 내용을 간략히 설명하세요"
                rows={3}
              />
            </Field>
          </FormRows>
        </ModalBody>
        <ModalFooter>
          <CancelBtn onClick={onClose}>취소</CancelBtn>
          <SubmitBtn onClick={handleSubmit} disabled={submitting}>
            {submitting ? '등록 중…' : '등록'}
          </SubmitBtn>
        </ModalFooter>
      </Modal>
      <CountryPicker
        mode="single"
        isOpen={countryPickerOpen}
        onClose={() => setCountryPickerOpen(false)}
        title="참여 국가 선택"
        modernCountries={modernCountries as CountryResponseDto[]}
        historicalCountries={
          historicalCountries as HistoricalCountryResponseDto[]
        }
        onSelect={(c) => {
          setSigCountryId(c.isHistorical ? null : c.id)
          setSigHistoricalCountryId(c.isHistorical ? c.id : null)
          setSigCountryLabel(c.name)
          setLinkCabinetId('')
          setCountryPickerOpen(false)
        }}
      />
    </Overlay>
  )
}

// ──────────────────────────────────────────────
// 조약 수정 모달
// ──────────────────────────────────────────────

const TreatyEditModal: React.FC<{
  treaty: TreatyDto
  onClose: () => void
  onSaved: () => void
}> = ({ treaty, onClose, onSaved }) => {
  const [name, setName] = useState(treaty.name)
  const [alias, setAlias] = useState(treaty.alias ?? '')
  const [type, setType] = useState<TreatyType>(treaty.type)
  const [signDate, setSignDate] = useState(() =>
    toDateInputValue(treaty.signDate),
  )
  const [effectiveDate, setEffectiveDate] = useState(() =>
    toDateInputValue(treaty.effectiveDate),
  )
  const [expiryDate, setExpiryDate] = useState(() =>
    toDateInputValue(treaty.expiryDate),
  )
  const [violationDate, setViolationDate] = useState(() =>
    toDateInputValue(treaty.violationDate),
  )
  const [violationReason, setViolationReason] = useState(
    treaty.violationReason ?? '',
  )
  const [location, setLocation] = useState(treaty.location ?? '')
  const [summary, setSummary] = useState(treaty.summary ?? '')
  const [background, setBackground] = useState(treaty.background ?? '')
  const [aftermath, setAftermath] = useState(treaty.aftermath ?? '')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim() || !signDate.trim()) {
      notify.error('조약명과 서명일은 필수입니다.')
      return
    }
    setSubmitting(true)
    try {
      await treatyApi.update(treaty.id, {
        name: name.trim(),
        alias: alias.trim() || null,
        type,
        signDate,
        effectiveDate: effectiveDate || null,
        expiryDate: expiryDate || null,
        violationDate: violationDate || null,
        violationReason: violationReason.trim() || null,
        location: location.trim() || null,
        summary: summary.trim() || null,
        background: background.trim() || null,
        aftermath: aftermath.trim() || null,
      })
      notify.success('조약이 수정되었습니다.')
      onSaved()
    } catch (e) {
      notify.error(getApiErrorMessage(e, '수정 중 오류가 발생했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>조약 수정</ModalTitle>
          <CloseBtn onClick={onClose}>
            <FiX size={18} />
          </CloseBtn>
        </ModalHeader>
        <ModalBody>
          <FormRows>
            <Field>
              <FieldLabel>
                조약명 <Required>*</Required>
              </FieldLabel>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="조약 정식 명칭"
              />
            </Field>
            <Field>
              <FieldLabel>별칭 (선택)</FieldLabel>
              <Input
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="통칭·약칭"
              />
            </Field>
            <Row2>
              <Field>
                <FieldLabel>
                  조약 유형 <Required>*</Required>
                </FieldLabel>
                <Select
                  value={type}
                  onChange={(e) => setType(e.target.value as TreatyType)}
                >
                  {(
                    Object.entries(TREATY_TYPE_LABELS) as [TreatyType, string][]
                  ).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field>
                <FieldLabel>서명 장소 (선택)</FieldLabel>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="예: 모스크바"
                />
              </Field>
            </Row2>
            <Row2>
              <Field>
                <FieldLabel>
                  서명일 <Required>*</Required>
                </FieldLabel>
                <Input
                  type="date"
                  value={signDate}
                  onChange={(e) => setSignDate(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>발효일 (선택)</FieldLabel>
                <Input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                />
              </Field>
            </Row2>
            <Row2>
              <Field>
                <FieldLabel>만료일 (선택)</FieldLabel>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>파기일 (선택)</FieldLabel>
                <Input
                  type="date"
                  value={violationDate}
                  onChange={(e) => setViolationDate(e.target.value)}
                />
              </Field>
            </Row2>
            {violationDate && (
              <Field>
                <FieldLabel>파기 사유 (선택)</FieldLabel>
                <Input
                  value={violationReason}
                  onChange={(e) => setViolationReason(e.target.value)}
                  placeholder="파기 이유"
                />
              </Field>
            )}
            <Field>
              <FieldLabel>개요 (선택)</FieldLabel>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
              />
            </Field>
            <Field>
              <FieldLabel>배경 (선택)</FieldLabel>
              <Textarea
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                rows={3}
              />
            </Field>
            <Field>
              <FieldLabel>결과 · 여파 (선택)</FieldLabel>
              <Textarea
                value={aftermath}
                onChange={(e) => setAftermath(e.target.value)}
                rows={3}
              />
            </Field>
          </FormRows>
        </ModalBody>
        <ModalFooter>
          <CancelBtn onClick={onClose}>취소</CancelBtn>
          <SubmitBtn onClick={handleSubmit} disabled={submitting}>
            {submitting ? '저장 중…' : '저장'}
          </SubmitBtn>
        </ModalFooter>
      </Modal>
    </Overlay>
  )
}

// ──────────────────────────────────────────────
// 조약 상세 뷰
// ──────────────────────────────────────────────

/**
 * 조약 UI 팔레트(`theme.ts`)를 주입하는 얇은 Provider.
 * `TreatySectionWidget`은 내부에서 같은 일을 하고, 카탈로그처럼 `TreatyDetail`만
 * 따로 쓰는 지면은 이걸로 감싼다.
 */
export const TreatySectionThemeProvider: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const parentTheme = useTheme()
  const { mode } = useThemeStore()
  const merged = useMemo(
    () => ({ ...parentTheme, ts: getTreatySectionPalette(mode === 'dark') }),
    [parentTheme, mode],
  )
  return <ThemeProvider theme={merged}>{children}</ThemeProvider>
}

/**
 * 조약 상세 — 국가 상세의 조약 탭과 조약 카탈로그(`/treaties/:id`)가 함께 쓴다.
 * 국가에 의존하지 않으므로 `country`는 받지 않는다(예전엔 받아놓고 쓰지 않았다).
 *
 * ⚠️ 팔레트는 `ThemeProvider`로 내려온 `theme.ts`를 요구한다 —
 * 반드시 {@link TreatySectionThemeProvider} 안에서 렌더할 것.
 */
export const TreatyDetail: React.FC<{
  treatyId: string
  onBack: () => void
  onInvalidate: () => void
}> = ({ treatyId, onBack, onInvalidate }) => {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const themeMode = useTheme().mode

  const { data: treaty, isLoading } = useQuery({
    queryKey: ['treaty', treatyId],
    queryFn: () => treatyApi.getById(treatyId),
  })

  const [addSignatoryOpen, setAddSignatoryOpen] = useState(false)
  const [editSignatory, setEditSignatory] = useState<TreatySignatoryDto | null>(
    null,
  )
  const [addTermOpen, setAddTermOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  /* 서명국 카드 → 국가 정보 창(사건 상세 참여국 카드와 같은 퀵뷰). 국가 탭 안에서도 뜨므로
     URL(?country=)이 아니라 로컬 상태 — 국가 상세의 자체 파라미터와 섞이지 않게. */
  const [countryTarget, setCountryTarget] =
    useState<CountryInlineModalTarget | null>(null)

  const invalidateTreaty = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['treaty', treatyId] })
    onInvalidate()
  }, [qc, treatyId, onInvalidate])

  const handleDeleteTreaty = async () => {
    if (
      !(await confirm({
        title: '삭제 확인',
        message:
          '이 조약을 삭제하시겠습니까? 모든 서명국, 조항, 이미지가 함께 삭제됩니다.',
        danger: true,
      }))
    )
      return
    try {
      await treatyApi.remove(treatyId)
      notify.success('조약이 삭제되었습니다.')
      onInvalidate()
      onBack()
    } catch (e) {
      notify.error(getApiErrorMessage(e, '삭제 중 오류가 발생했습니다.'))
    }
  }

  const handleDeleteSignatory = async (id: string) => {
    if (
      !(await confirm({
        title: '삭제 확인',
        message: '이 서명국 정보를 삭제하시겠습니까?',
        danger: true,
      }))
    )
      return
    try {
      await treatyApi.removeSignatory(id)
      invalidateTreaty()
      notify.success('서명국이 삭제되었습니다.')
    } catch (e) {
      notify.error(getApiErrorMessage(e, '삭제 중 오류가 발생했습니다.'))
    }
  }

  const handleDeleteTerm = async (id: string) => {
    if (
      !(await confirm({
        title: '삭제 확인',
        message: '이 조항을 삭제하시겠습니까?',
        danger: true,
      }))
    )
      return
    try {
      await treatyApi.removeTerm(id)
      invalidateTreaty()
      notify.success('조항이 삭제되었습니다.')
    } catch (e) {
      notify.error(getApiErrorMessage(e, '삭제 중 오류가 발생했습니다.'))
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !treaty) return
    setUploadingImage(true)
    try {
      const { url } = await uploadImage(file)
      const isFirst = treaty.images.length === 0
      const dto: AddTreatyImageDto = {
        treatyId: treaty.id,
        imageUrl: url,
        isPrimary: isFirst,
      }
      await treatyApi.addImage(dto)
      invalidateTreaty()
      notify.success('이미지가 추가되었습니다.')
    } catch (err) {
      notify.error(
        getApiErrorMessage(err, '이미지 업로드 중 오류가 발생했습니다.'),
      )
    } finally {
      setUploadingImage(false)
    }
  }

  const handleDeleteImage = async (id: string) => {
    if (
      !(await confirm({
        title: '삭제 확인',
        message: '이 이미지를 삭제하시겠습니까?',
        danger: true,
      }))
    )
      return
    try {
      await treatyApi.removeImage(id)
      invalidateTreaty()
      notify.success('이미지가 삭제되었습니다.')
    } catch (e) {
      notify.error(getApiErrorMessage(e, '삭제 중 오류가 발생했습니다.'))
    }
  }

  if (isLoading || !treaty)
    return (
      <Wrap>
        <Empty>불러오는 중…</Empty>
      </Wrap>
    )

  const thumb =
    treaty.images.find((i) => i.isPrimary)?.imageUrl ??
    treaty.images[0]?.imageUrl
  const typeColor = treatyTypeTone(treaty.type, themeMode)
  const signParts = parseIsoDateParts(treaty.signDate)
  const endParts = parseIsoDateParts(treaty.violationDate ?? treaty.expiryDate)
  /*
   * 효력 기간 — '서명 연도–파기(없으면 만료) 연도'로 **구간만** 적는다.
   * 예전엔 연도 차를 'N년'으로 셌는데 1939.8→1941.6이 '2년'이 되고, 파기일이 실제 효력
   * 상실이 아니라 '무효 확인' 날인 행(제2차 한일협약 1965)에선 '존속 60년'이라는 틀린
   * 사실을 지어냈다. 구간은 기록된 두 날짜만 말한다. 끝이 없으면 '유효'라고 단정하지 않고 비운다.
   */
  const periodLabel =
    signParts && endParts
      ? `${formatYear(signParts.year)}–${formatYear(endParts.year)}`
      : null
  const signLine = treaty.signDate
    ? `${fmtDate(treaty.signDate)} 서명`
    : '서명일 미상'

  const eventLinks = (treaty.eventLinks ?? [])
    .filter(
      (
        link,
      ): link is TreatyEventLinkWithEventDto & {
        event: NonNullable<TreatyEventLinkWithEventDto['event']>
      } => !!link.event,
    )
    .sort(
      (left, right) =>
        EVENT_LINK_ORDER[left.linkType] - EVENT_LINK_ORDER[right.linkType],
    )
  const signingLink = eventLinks.find((link) => link.linkType === 'SIGNING')

  const anchorId = (slug: string) => `treaty-${treaty.id}-${slug}`
  const scrollToAnchor = (slug: string) =>
    document
      .getElementById(anchorId(slug))
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  /* 사건 상세 '비어 있는 항목 N개 · 채우기'와 같은 장치 — 빈 칸은 접고, 채울 길은 한 줄로 남긴다 */
  const missing = [
    !treaty.summary && '개요',
    !treaty.background && '배경',
    !treaty.aftermath && '결과·여파',
    !treaty.location && '서명 장소',
    !treaty.effectiveDate && '발효일',
  ].filter((label): label is string => !!label)

  /* 본문에서 접힌 섹션 → 본문 끝 '더 채울 수 있는 것' 칩. 글 칸은 수정 창, 조항은 조항 추가 창. */
  const openEdit = () => setEditOpen(true)
  const fillItems = [
    !treaty.summary && { key: 'summary', label: '개요', onFill: openEdit },
    !treaty.background && {
      key: 'background',
      label: '배경',
      onFill: openEdit,
    },
    !treaty.aftermath && {
      key: 'aftermath',
      label: '결과·여파',
      onFill: openEdit,
    },
    treaty.terms.length === 0 && {
      key: 'terms',
      label: '조항',
      onFill: () => setAddTermOpen(true),
    },
  ].filter(
    (item): item is { key: string; label: string; onFill: () => void } =>
      !!item,
  )

  const signatoryTarget = (
    signatory: TreatySignatoryDto,
  ): CountryInlineModalTarget | null =>
    signatory.country
      ? {
          id: signatory.country.id,
          kind: 'modern',
          name: signatory.country.name,
        }
      : signatory.historicalCountry
        ? {
            id: signatory.historicalCountry.id,
            kind: 'historical',
            name: signatory.historicalCountry.name,
          }
        : null
  const countryPeers = treaty.signatories
    .map(signatoryTarget)
    .filter((target): target is CountryInlineModalTarget => !!target)

  const tocEntries = [
    treaty.background && { slug: 'background', label: '배경' },
    treaty.aftermath && { slug: 'aftermath', label: '결과 · 여파' },
    eventLinks.length > 0 && {
      slug: 'events',
      label: '연결된 사건',
      count: eventLinks.length,
    },
    treaty.terms.length > 0 && {
      slug: 'terms',
      label: '조항',
      count: treaty.terms.length,
    },
    treaty.images.length > 0 && {
      slug: 'images',
      label: '이미지',
      count: treaty.images.length,
    },
  ].filter(
    (entry): entry is { slug: string; label: string; count?: number } =>
      !!entry,
  )

  const personLabel = (signatory: TreatySignatoryDto) =>
    signatory.person
      ? getPersonDisplayName({
          name: signatory.person.name ?? '',
          surname: signatory.person.surname,
          middleName: (signatory.person as { middleName?: string | null })
            .middleName,
          nameDisplayOrder: (
            signatory.person as { nameDisplayOrder?: string | null }
          ).nameDisplayOrder,
          country: (
            signatory.person as {
              country?: { defaultNameDisplayOrder?: string | null } | null
            }
          ).country,
        })
      : null

  const cabinetLabelOf = (signatory: TreatySignatoryDto) => {
    if (!signatory.cabinet) return null
    if (signatory.cabinet.name) return signatory.cabinet.name
    const headTenure = signatory.cabinet.headTenure
    const headName = headTenure?.person
      ? getPersonDisplayName({
          name: headTenure.person.name ?? '',
          surname: headTenure.person.surname,
          middleName: (headTenure.person as { middleName?: string | null })
            .middleName,
          nameDisplayOrder: (
            headTenure.person as { nameDisplayOrder?: string | null }
          ).nameDisplayOrder,
          country: (
            headTenure.person as {
              country?: { defaultNameDisplayOrder?: string | null } | null
            }
          ).country,
        })
      : ''
    const term = headTenure?.ordinal ?? headTenure?.subTermNumber
    return term ? `제${term}대 ${headName} 행정부` : `${headName} 행정부`
  }

  return (
    <TD.Page>
      <TD.Layout>
        <TD.TopRow>
          <TD.Breadcrumb aria-label="위치">
            <button type="button" onClick={onBack}>
              <FiChevronLeft size={13} aria-hidden /> 목록
            </button>
            <TD.CrumbSep aria-hidden>·</TD.CrumbSep>
            {/* '목록'은 들어온 자리(필터 그대로)로, '조약'은 전체 카탈로그로, 유형은 그 유형만 —
                예전엔 앞의 둘이 같은 /treaties로 가는 중복이었다. */}
            <button
              type="button"
              onClick={() => navigate(pathKeys.treaties.list())}
            >
              조약
            </button>
            <TD.CrumbSep aria-hidden>›</TD.CrumbSep>
            <TD.TypeCrumb
              type="button"
              $color={typeColor}
              onClick={() =>
                navigate(`${pathKeys.treaties.list()}?type=${treaty.type}`)
              }
              title={`${TREATY_TYPE_LABELS[treaty.type] ?? treaty.type}만 보기`}
            >
              {TREATY_TYPE_LABELS[treaty.type] ?? treaty.type}
            </TD.TypeCrumb>
          </TD.Breadcrumb>
          <TD.TopActions>
            <TD.QuietButton type="button" onClick={() => setEditOpen(true)}>
              <FiEdit2 size={12} aria-hidden /> 수정
            </TD.QuietButton>
            <TD.QuietButton type="button" $danger onClick={handleDeleteTreaty}>
              <FiTrash2 size={12} aria-hidden /> 삭제
            </TD.QuietButton>
          </TD.TopActions>
        </TD.TopRow>

        <TD.Hero>
          {thumb ? (
            <TD.HeroImage>
              <img src={thumb} alt={`${treaty.name} 대표 이미지`} />
            </TD.HeroImage>
          ) : (
            <TD.ImagePill $busy={uploadingImage}>
              <FiImage size={12} aria-hidden />
              {uploadingImage ? '업로드 중…' : '대표 이미지 추가'}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
              />
            </TD.ImagePill>
          )}

          <TD.TitleBlock>
            <TD.Title>{treaty.name}</TD.Title>
            {treaty.alias && <TD.Alias>{treaty.alias}</TD.Alias>}
            {/* 한 칸 배치 전용 — 장부가 서명국 카드 아래로 내려가면 서명일이 첫 화면에서
                사라졌다(390px에서 카드 6장 ≈600px 아래). 두 칸에선 우측 장부가 말하므로 숨긴다. */}
            <TD.HeroDateLine>
              <span>{signLine}</span>
              {treaty.location && (
                <>
                  <span aria-hidden>·</span>
                  <span>{treaty.location}</span>
                </>
              )}
            </TD.HeroDateLine>
          </TD.TitleBlock>

          {treaty.summary && <TD.Lead>{treaty.summary}</TD.Lead>}

          {treaty.violationReason && (
            <TD.Broken>
              <b>파기 사유</b>
              <span>{treaty.violationReason}</span>
            </TD.Broken>
          )}

          <TD.PartiesHead>
            서명국 · 참여국 <b>{treaty.signatories.length}</b>
          </TD.PartiesHead>
          <TD.PartiesGrid>
            {treaty.signatories.map((signatory) => {
              const countryName =
                signatory.country?.name ??
                signatory.historicalCountry?.name ??
                '알 수 없음'
              const historical =
                !signatory.country && !!signatory.historicalCountry
              const emblemImage =
                signatory.country?.thumbnailUrl ??
                signatory.historicalCountry?.thumbnailUrl ??
                null
              const personName = personLabel(signatory)
              const cabinetLabel = cabinetLabelOf(signatory)
              const partyTarget = signatoryTarget(signatory)
              return (
                <TD.PartyCard key={signatory.id}>
                  <TD.PartyHead>
                    <TD.Emblem $historical={historical} aria-hidden>
                      {signatory.country?.flagEmoji ? (
                        signatory.country.flagEmoji
                      ) : emblemImage ? (
                        <img src={emblemImage} alt="" />
                      ) : (
                        countryName.slice(0, 1)
                      )}
                    </TD.Emblem>
                    <TD.PartyName title={countryName}>
                      {partyTarget ? (
                        <TD.PartyNameLink
                          data-party-link
                          to={pathKeys.countryDetail(partyTarget.id)}
                          onClick={(clickEvent) => {
                            if (!shouldInterceptEntityClick(clickEvent)) return
                            clickEvent.preventDefault()
                            setCountryTarget(partyTarget)
                          }}
                        >
                          {countryName}
                        </TD.PartyNameLink>
                      ) : (
                        countryName
                      )}
                    </TD.PartyName>
                  </TD.PartyHead>
                  <TD.PartyTags>
                    <TD.Tag
                      $strong={signatory.participationType === 'SIGNATORY'}
                    >
                      {TREATY_PARTICIPATION_LABELS[signatory.participationType]}
                    </TD.Tag>
                    {signatory.signedAt && (
                      <TD.Tag>{fmtDate(signatory.signedAt)} 서명</TD.Tag>
                    )}
                  </TD.PartyTags>
                  {(personName || signatory.role) && (
                    <TD.PartyLine>
                      {personName &&
                        (signatory.person ? (
                          <TD.PersonLink
                            to={pathKeys.personsTimelineDetail(
                              signatory.person.id,
                            )}
                          >
                            {personName}
                          </TD.PersonLink>
                        ) : (
                          <b>{personName}</b>
                        ))}
                      {personName && signatory.role && ' · '}
                      {signatory.role && (
                        <span className={personName ? 'meta' : undefined}>
                          {signatory.role}
                        </span>
                      )}
                    </TD.PartyLine>
                  )}
                  {cabinetLabel && (
                    <TD.PartyLine>
                      <span className="meta">{cabinetLabel}</span>
                    </TD.PartyLine>
                  )}
                  {signatory.note?.trim() && (
                    <SignatoryNote note={signatory.note.trim()} />
                  )}
                  <TD.PartyActions data-party-actions>
                    <TD.IconButton
                      type="button"
                      onClick={() => setEditSignatory(signatory)}
                      title="서명국 수정"
                      aria-label={`${countryName} 서명국 수정`}
                    >
                      <FiEdit2 size={12} />
                    </TD.IconButton>
                    <TD.IconButton
                      type="button"
                      onClick={() => handleDeleteSignatory(signatory.id)}
                      title="서명국 삭제"
                      aria-label={`${countryName} 서명국 삭제`}
                    >
                      <FiTrash2 size={12} />
                    </TD.IconButton>
                  </TD.PartyActions>
                </TD.PartyCard>
              )
            })}
            <TD.AddCard type="button" onClick={() => setAddSignatoryOpen(true)}>
              <FiPlus size={13} aria-hidden /> 서명국 추가
            </TD.AddCard>
          </TD.PartiesGrid>
        </TD.Hero>

        <TD.Aside aria-label="조약 정보">
          <TD.YearDisplay>
            {signParts ? `${formatYear(signParts.year)}년` : '연도 미상'}
          </TD.YearDisplay>
          <TD.AsideLine data-wide-only>{signLine}</TD.AsideLine>
          {treaty.location && (
            <TD.AsideLine data-wide-only>
              <FiMapPin size={13} aria-hidden />
              <span>{treaty.location}</span>
            </TD.AsideLine>
          )}

          <TD.FactRows>
            <TD.FactRow>
              <TD.FactLabel>유형</TD.FactLabel>
              <TD.FactValue $tone="type" $color={typeColor}>
                {TREATY_TYPE_LABELS[treaty.type] ?? treaty.type}
              </TD.FactValue>
            </TD.FactRow>
            {treaty.effectiveDate && (
              <TD.FactRow>
                <TD.FactLabel>발효</TD.FactLabel>
                <TD.FactValue>{fmtDate(treaty.effectiveDate)}</TD.FactValue>
              </TD.FactRow>
            )}
            {treaty.expiryDate && (
              <TD.FactRow>
                <TD.FactLabel>만료</TD.FactLabel>
                <TD.FactValue>{fmtDate(treaty.expiryDate)}</TD.FactValue>
              </TD.FactRow>
            )}
            {treaty.violationDate && (
              <TD.FactRow>
                <TD.FactLabel>파기</TD.FactLabel>
                <TD.FactValue $tone="danger">
                  {fmtDate(treaty.violationDate)}
                </TD.FactValue>
              </TD.FactRow>
            )}
            {periodLabel && (
              <TD.FactRow>
                <TD.FactLabel>효력</TD.FactLabel>
                <TD.FactValue>{periodLabel}</TD.FactValue>
              </TD.FactRow>
            )}
            {signingLink && (
              <TD.FactRow>
                <TD.FactLabel>체결 사건</TD.FactLabel>
                <TD.FactValue>
                  <TD.FactLink to={pathKeys.events.detail(signingLink.eventId)}>
                    {signingLink.event.title}
                  </TD.FactLink>
                </TD.FactValue>
              </TD.FactRow>
            )}
            <TD.FactRow>
              <TD.FactLabel>서명국</TD.FactLabel>
              <TD.FactValue>{treaty.signatories.length}개국</TD.FactValue>
            </TD.FactRow>
            <TD.FactRow>
              <TD.FactLabel>조항</TD.FactLabel>
              <TD.FactValue>{treaty.terms.length}개</TD.FactValue>
            </TD.FactRow>
          </TD.FactRows>

          {missing.length > 0 && (
            <TD.FillHint
              type="button"
              onClick={() => setEditOpen(true)}
              title={`비어 있음: ${missing.join(', ')}`}
            >
              비어 있는 항목 {missing.length}개 · <b>채우기</b>
            </TD.FillHint>
          )}

          <TD.Toc aria-label="목차">
            <TD.TocLabel>목차</TD.TocLabel>
            <TD.TocList>
              {tocEntries.map((entry) => (
                <li key={entry.slug}>
                  <TD.TocItem
                    type="button"
                    onClick={() => scrollToAnchor(entry.slug)}
                  >
                    {entry.label}
                    {entry.count !== undefined && <span>{entry.count}</span>}
                  </TD.TocItem>
                </li>
              ))}
            </TD.TocList>
          </TD.Toc>
        </TD.Aside>

        <TD.Main>
          {treaty.background && (
            <TD.Section id={anchorId('background')}>
              <TD.SectionHeader>
                <TD.SectionTitle>배경</TD.SectionTitle>
              </TD.SectionHeader>
              <TD.Prose>{treaty.background}</TD.Prose>
            </TD.Section>
          )}

          {treaty.aftermath && (
            <TD.Section id={anchorId('aftermath')}>
              <TD.SectionHeader>
                <TD.SectionTitle>결과 · 여파</TD.SectionTitle>
              </TD.SectionHeader>
              <TD.Prose>{treaty.aftermath}</TD.Prose>
            </TD.Section>
          )}

          {eventLinks.length > 0 && (
            <TD.Section id={anchorId('events')}>
              <TD.SectionHeader>
                <TD.SectionTitle>연결된 사건</TD.SectionTitle>
                <TD.SectionMeta>{eventLinks.length}건</TD.SectionMeta>
              </TD.SectionHeader>
              <TD.EventLinkList>
                {eventLinks.map((link) => (
                  <TD.EventLinkRow key={link.id}>
                    <TD.EventLinkYear data-event-year>
                      {eventYearLabel(link.event) ?? '연도 미상'}
                    </TD.EventLinkYear>
                    <TD.EventLinkTitle
                      to={pathKeys.events.detail(link.eventId)}
                    >
                      {link.event.title}
                      <FiExternalLink size={12} aria-hidden />
                    </TD.EventLinkTitle>
                    <TD.EventLinkKind>
                      {TREATY_EVENT_LINK_LABELS[link.linkType]}
                    </TD.EventLinkKind>
                    {link.note?.trim() && (
                      <TD.EventLinkNote>{link.note.trim()}</TD.EventLinkNote>
                    )}
                  </TD.EventLinkRow>
                ))}
              </TD.EventLinkList>
            </TD.Section>
          )}

          {treaty.terms.length > 0 && (
            <TD.Section id={anchorId('terms')}>
              <TD.SectionHeader>
                <TD.SectionTitle>조항</TD.SectionTitle>
                <TD.SectionMeta>{treaty.terms.length}개</TD.SectionMeta>
                <TD.SectionActions>
                  <TD.QuietButton
                    type="button"
                    onClick={() => setAddTermOpen(true)}
                  >
                    <FiPlus size={12} aria-hidden /> 조항 추가
                  </TD.QuietButton>
                </TD.SectionActions>
              </TD.SectionHeader>
              <TD.TermList>
                {treaty.terms.map((term, index) => {
                  /*
                   * 제목을 그대로 쓴다. 예전엔 앞에 '제{순번}조'를 붙였는데 제목에 이미 조약문의
                   * 실제 번호가 있어 '제1조 — 제1조', '제2조 — 제4조'(독소), '제1조 — 제1관'
                   * (조일수호조규)처럼 없는 번호를 지어냈다. 순번은 원 안 숫자가 말한다.
                   */
                  const termLabel = term.title?.trim() || `조항 ${index + 1}`
                  return (
                    <TD.TermItem key={term.id}>
                      <TD.TermIndex $secret={term.isSecret} aria-hidden>
                        {index + 1}
                      </TD.TermIndex>
                      <TD.TermBody>
                        <TD.TermTitle>
                          {termLabel}
                          {term.isSecret && (
                            <TD.SecretTag>비밀 조항</TD.SecretTag>
                          )}
                        </TD.TermTitle>
                        <TD.TermContent>{term.content}</TD.TermContent>
                      </TD.TermBody>
                      <TD.TermActions data-term-actions>
                        <TD.IconButton
                          type="button"
                          onClick={() => handleDeleteTerm(term.id)}
                          title="조항 삭제"
                          aria-label={`${termLabel} 삭제`}
                        >
                          <FiTrash2 size={12} />
                        </TD.IconButton>
                      </TD.TermActions>
                    </TD.TermItem>
                  )
                })}
              </TD.TermList>
            </TD.Section>
          )}

          {treaty.images.length > 0 && (
            <TD.Section id={anchorId('images')}>
              <TD.SectionHeader>
                <TD.SectionTitle>이미지</TD.SectionTitle>
                <TD.SectionMeta>{treaty.images.length}장</TD.SectionMeta>
                <TD.SectionActions>
                  <TD.UploadLabel $busy={uploadingImage}>
                    <FiImage size={12} aria-hidden />
                    {uploadingImage ? '업로드 중…' : '이미지 추가'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                  </TD.UploadLabel>
                </TD.SectionActions>
              </TD.SectionHeader>
              <TD.ImageGrid>
                {treaty.images.map((image) => (
                  <TD.ImageTile key={image.id}>
                    <img src={image.imageUrl} alt={image.caption ?? ''} />
                    {image.isPrimary && <span data-primary>대표</span>}
                    <TD.IconButton
                      type="button"
                      data-remove
                      onClick={() => handleDeleteImage(image.id)}
                      title="이미지 삭제"
                      aria-label="이미지 삭제"
                    >
                      <FiTrash2 size={12} />
                    </TD.IconButton>
                  </TD.ImageTile>
                ))}
              </TD.ImageGrid>
            </TD.Section>
          )}

          {fillItems.length > 0 && (
            <TD.FillStrip aria-labelledby={anchorId('fill-title')}>
              <TD.FillStripTitle id={anchorId('fill-title')}>
                더 채울 수 있는 것
              </TD.FillStripTitle>
              <TD.FillChips>
                {fillItems.map((item) => (
                  <TD.FillChip
                    key={item.key}
                    type="button"
                    onClick={item.onFill}
                  >
                    <FiPlus size={12} aria-hidden />
                    {item.label}
                  </TD.FillChip>
                ))}
              </TD.FillChips>
            </TD.FillStrip>
          )}
        </TD.Main>
      </TD.Layout>

      {/*
       * 모달은 body로 포털한다. TD.Page가 컨테이너 쿼리(container-type: inline-size)를 쓰는데,
       * 이게 position:fixed의 기준 상자가 되어 오버레이가 화면이 아니라 지면 높이에서 잘렸다
       * (실측: 1000px 창에서 어두운 막이 752px에서 끊김). 테마 context는 포털을 넘어 그대로 온다.
       */}
      {createPortal(
        <>
          {/* 서명국 추가 모달 */}
          {addSignatoryOpen && (
            <AddSignatoryModal
              treatyId={treatyId}
              onClose={() => setAddSignatoryOpen(false)}
              onAdded={() => {
                setAddSignatoryOpen(false)
                invalidateTreaty()
              }}
            />
          )}

          {editSignatory && (
            <EditSignatoryModal
              key={editSignatory.id}
              signatory={editSignatory}
              onClose={() => setEditSignatory(null)}
              onSaved={() => {
                setEditSignatory(null)
                invalidateTreaty()
              }}
            />
          )}

          {/* 조항 추가 모달 */}
          {addTermOpen && (
            <AddTermModal
              treatyId={treatyId}
              nextOrder={treaty.terms.length}
              onClose={() => setAddTermOpen(false)}
              onAdded={() => {
                setAddTermOpen(false)
                invalidateTreaty()
              }}
            />
          )}

          {editOpen && (
            <TreatyEditModal
              treaty={treaty}
              onClose={() => setEditOpen(false)}
              onSaved={() => {
                setEditOpen(false)
                invalidateTreaty()
              }}
            />
          )}

          <CountryInlineModal
            target={countryTarget}
            onClose={() => setCountryTarget(null)}
            onSwitch={setCountryTarget}
            peers={countryPeers}
            peersLabel="이 조약의 다른 서명국"
          />
        </>,
        document.body,
      )}
    </TD.Page>
  )
}

// ──────────────────────────────────────────────
// 서명자 피커 (인물 · 행정부)
//
// 여기가 UUID 생입력이던 자리다. 실측상 treaty_signatory 42행 중 person_id·cabinet_id가
// **0건**이었는데, 원인은 데이터가 없어서가 아니라 아무도 UUID를 외워 넣지 않아서였다.
// ──────────────────────────────────────────────

const SignatoryPersonPicker: React.FC<{
  personId: string
  onChange: (next: string) => void
}> = ({ personId, onChange }) => {
  const [pickerOpen, setPickerOpen] = useState(false)
  const { data: persons = [] } = useQuery({
    queryKey: ['persons', 'all'],
    queryFn: getAllPersons,
    enabled: pickerOpen || Boolean(personId),
    staleTime: 5 * 60_000,
  })

  const selected = persons.find((person) => person.id === personId)
  const label = selected
    ? getPersonDisplayName({
        name: selected.name ?? '',
        surname: selected.surname,
        middleName: selected.middleName,
        nameDisplayOrder: selected.nameDisplayOrder,
        country: selected.country,
      })
    : ''

  return (
    <>
      <PickerRow>
        <PickerValue data-empty={!personId || undefined}>
          {personId ? label || '불러오는 중…' : '선택 안 함'}
        </PickerValue>
        <PickerBtn type="button" onClick={() => setPickerOpen(true)}>
          {personId ? '변경' : '인물 선택'}
        </PickerBtn>
        {personId && (
          <PickerBtn type="button" onClick={() => onChange('')}>
            해제
          </PickerBtn>
        )}
      </PickerRow>
      {pickerOpen && (
        <PersonSelectModal
          persons={persons}
          selectedPersonId={personId}
          onSelect={(nextId) => {
            onChange(nextId)
            setPickerOpen(false)
          }}
          onClose={() => setPickerOpen(false)}
          title="서명 인물 선택"
          searchPlaceholder="이름 또는 생몰년도로 검색..."
        />
      )}
    </>
  )
}

const SignatoryCabinetPicker: React.FC<{
  cabinetId: string
  /** 선택된 서명국 — 행정부 후보를 그 나라로 좁힌다 */
  countryId: string | null
  historicalCountryId: string | null
  onChange: (next: string) => void
}> = ({ cabinetId, countryId, historicalCountryId, onChange }) => {
  const hasCountry = Boolean(countryId || historicalCountryId)
  const { data: cabinets = [] } = useQuery({
    queryKey: ['cabinets-for-signatory', countryId, historicalCountryId],
    queryFn: () =>
      personCareerApi.getCabinets({
        countryId: countryId ?? undefined,
        historicalCountryId: historicalCountryId ?? undefined,
      }),
    enabled: hasCountry,
    staleTime: 60_000,
  })

  if (!hasCountry) {
    return <FieldHint>서명국을 먼저 고르면 그 나라의 행정부가 나옵니다.</FieldHint>
  }

  return (
    <Select value={cabinetId} onChange={(e) => onChange(e.target.value)}>
      <option value="">선택 안 함</option>
      {cabinets.map((cabinet) => (
        <option key={cabinet.id} value={cabinet.id}>
          {cabinetListLabel(cabinet)}
        </option>
      ))}
    </Select>
  )
}

const PickerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const PickerValue = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;

  &[data-empty] {
    opacity: 0.6;
  }
`

const PickerBtn = styled.button`
  flex-shrink: 0;
  height: 30px;
  padding: 0 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  background-color: transparent;
  color: inherit;
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
`

// ──────────────────────────────────────────────
// 서명국 추가 모달
// ──────────────────────────────────────────────

const AddSignatoryModal: React.FC<{
  treatyId: string
  onClose: () => void
  onAdded: () => void
}> = ({ treatyId, onClose, onAdded }) => {
  const [countryId, setCountryId] = useState<string | null>(null)
  const [historicalCountryId, setHistoricalCountryId] = useState<
    string | null
  >(null)
  const [countryLabel, setCountryLabel] = useState('')
  const [countryPickerOpen, setCountryPickerOpen] = useState(false)
  const [personId, setPersonId] = useState('')
  const [cabinetId, setCabinetId] = useState('')
  const [role, setRole] = useState('')
  const [participationType, setParticipationType] =
    useState<TreatyParticipationType>('SIGNATORY')
  const [signedAt, setSignedAt] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { data: modernCountries = [] } = useQuery({
    queryKey: ['treaty-modal-countries'],
    queryFn: () => getAllCountries(),
    staleTime: 60_000,
  })
  const { data: historicalCountries = [] } = useQuery({
    queryKey: ['treaty-modal-hist-countries'],
    queryFn: () => getAllHistoricalCountries(),
    staleTime: 60_000,
  })

  const handleSubmit = async () => {
    if (!countryId && !historicalCountryId) {
      notify.error('현대 국가 또는 역사적 국가를 선택하세요.')
      return
    }
    setSubmitting(true)
    try {
      await treatyApi.addSignatory({
        treatyId,
        countryId,
        historicalCountryId,
        personId: personId || null,
        cabinetId: cabinetId || null,
        role: role || null,
        participationType,
        signedAt: signedAt || null,
        note: note || null,
      })
      notify.success('서명국이 추가되었습니다.')
      onAdded()
    } catch (e) {
      notify.error(getApiErrorMessage(e, '추가 중 오류가 발생했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>서명국 · 참여국 추가</ModalTitle>
          <CloseBtn onClick={onClose}>
            <FiX size={18} />
          </CloseBtn>
        </ModalHeader>
        <ModalBody>
          <FormRows>
            <Field>
              <FieldLabel>국가 (현대 또는 역사) *</FieldLabel>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <PickCountryBtn
                  type="button"
                  onClick={() => setCountryPickerOpen(true)}
                >
                  <FiGlobe size={14} />
                  {countryLabel || '국가 선택'}
                </PickCountryBtn>
                {(countryId || historicalCountryId) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCountryId(null)
                      setHistoricalCountryId(null)
                      setCountryLabel('')
                    }}
                    style={{
                      fontSize: 12,
                      color: '#64748b',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    선택 해제
                  </button>
                )}
              </div>
              <FieldHint>
                목록에서 현대 국가 또는 역사적 국가를 고릅니다.
              </FieldHint>
            </Field>
            <Field>
              <FieldLabel>서명 인물 (선택)</FieldLabel>
              <SignatoryPersonPicker
                personId={personId}
                onChange={setPersonId}
              />
            </Field>
            <Field>
              <FieldLabel>소속 행정부 (선택)</FieldLabel>
              <SignatoryCabinetPicker
                cabinetId={cabinetId}
                countryId={countryId}
                historicalCountryId={historicalCountryId}
                onChange={setCabinetId}
              />
            </Field>
            <Row2>
              <Field>
                <FieldLabel>역할/직책 (선택)</FieldLabel>
                <Input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="예: 외무인민위원"
                />
              </Field>
              <Field>
                <FieldLabel>참여 유형</FieldLabel>
                <Select
                  value={participationType}
                  onChange={(e) =>
                    setParticipationType(
                      e.target.value as TreatyParticipationType,
                    )
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
                </Select>
              </Field>
            </Row2>
            <Field>
              <FieldLabel>서명일 (선택)</FieldLabel>
              <Input
                type="date"
                value={signedAt}
                onChange={(e) => setSignedAt(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>비고 (선택)</FieldLabel>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="추가 메모"
              />
            </Field>
          </FormRows>
        </ModalBody>
        <ModalFooter>
          <CancelBtn onClick={onClose}>취소</CancelBtn>
          <SubmitBtn onClick={handleSubmit} disabled={submitting}>
            {submitting ? '추가 중…' : '추가'}
          </SubmitBtn>
        </ModalFooter>
      </Modal>
      <CountryPicker
        mode="single"
        isOpen={countryPickerOpen}
        onClose={() => setCountryPickerOpen(false)}
        title="서명국 · 참여국 선택"
        modernCountries={modernCountries as CountryResponseDto[]}
        historicalCountries={
          historicalCountries as HistoricalCountryResponseDto[]
        }
        onSelect={(c) => {
          setCountryId(c.isHistorical ? null : c.id)
          setHistoricalCountryId(c.isHistorical ? c.id : null)
          setCountryLabel(c.name)
          setCountryPickerOpen(false)
        }}
      />
    </Overlay>
  )
}

function signatoryFormInit(s: TreatySignatoryDto) {
  return {
    countryId: s.countryId ?? s.country?.id ?? null,
    historicalCountryId:
      s.historicalCountryId ?? s.historicalCountry?.id ?? null,
    countryLabel: s.country?.name ?? s.historicalCountry?.name ?? '',
    personId: s.personId ?? '',
    cabinetId: s.cabinetId ?? '',
    role: s.role ?? '',
    participationType: s.participationType,
    signedAt: toDateInputValue(s.signedAt),
    note: s.note ?? '',
  }
}

// ──────────────────────────────────────────────
// 서명국 수정 모달
// ──────────────────────────────────────────────

const EditSignatoryModal: React.FC<{
  signatory: TreatySignatoryDto
  onClose: () => void
  onSaved: () => void
}> = ({ signatory, onClose, onSaved }) => {
  const init = signatoryFormInit(signatory)
  const [countryId, setCountryId] = useState(init.countryId)
  const [historicalCountryId, setHistoricalCountryId] = useState<
    string | null
  >(init.historicalCountryId)
  const [countryLabel, setCountryLabel] = useState(init.countryLabel)
  const [countryPickerOpen, setCountryPickerOpen] = useState(false)
  const [personId, setPersonId] = useState(init.personId)
  const [cabinetId, setCabinetId] = useState(init.cabinetId)
  const [role, setRole] = useState(init.role)
  const [participationType, setParticipationType] =
    useState<TreatyParticipationType>(init.participationType)
  const [signedAt, setSignedAt] = useState(init.signedAt)
  const [note, setNote] = useState(init.note)
  const [submitting, setSubmitting] = useState(false)

  const { data: modernCountries = [] } = useQuery({
    queryKey: ['treaty-modal-countries'],
    queryFn: () => getAllCountries(),
    staleTime: 60_000,
  })
  const { data: historicalCountries = [] } = useQuery({
    queryKey: ['treaty-modal-hist-countries'],
    queryFn: () => getAllHistoricalCountries(),
    staleTime: 60_000,
  })

  const handleSubmit = async () => {
    if (!countryId && !historicalCountryId) {
      notify.error('현대 국가 또는 역사적 국가를 선택하세요.')
      return
    }
    setSubmitting(true)
    try {
      await treatyApi.updateSignatory(signatory.id, {
        countryId,
        historicalCountryId,
        personId: personId || null,
        cabinetId: cabinetId || null,
        role: role || null,
        participationType,
        signedAt: signedAt || null,
        note: note || null,
      })
      notify.success('서명국 정보가 저장되었습니다.')
      onSaved()
    } catch (e) {
      notify.error(getApiErrorMessage(e, '저장 중 오류가 발생했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>서명국 · 참여국 수정</ModalTitle>
          <CloseBtn onClick={onClose}>
            <FiX size={18} />
          </CloseBtn>
        </ModalHeader>
        <ModalBody>
          <FormRows>
            <Field>
              <FieldLabel>국가 (현대 또는 역사) *</FieldLabel>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <PickCountryBtn
                  type="button"
                  onClick={() => setCountryPickerOpen(true)}
                >
                  <FiGlobe size={14} />
                  {countryLabel || '국가 선택'}
                </PickCountryBtn>
                {(countryId || historicalCountryId) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCountryId(null)
                      setHistoricalCountryId(null)
                      setCountryLabel('')
                    }}
                    style={{
                      fontSize: 12,
                      color: '#64748b',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    선택 해제
                  </button>
                )}
              </div>
              <FieldHint>
                목록에서 현대 국가 또는 역사적 국가를 고릅니다.
              </FieldHint>
            </Field>
            <Field>
              <FieldLabel>서명 인물 (선택)</FieldLabel>
              <SignatoryPersonPicker
                personId={personId}
                onChange={setPersonId}
              />
            </Field>
            <Field>
              <FieldLabel>소속 행정부 (선택)</FieldLabel>
              <SignatoryCabinetPicker
                cabinetId={cabinetId}
                countryId={countryId}
                historicalCountryId={historicalCountryId}
                onChange={setCabinetId}
              />
            </Field>
            <Row2>
              <Field>
                <FieldLabel>역할/직책 (선택)</FieldLabel>
                <Input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="예: 외무인민위원"
                />
              </Field>
              <Field>
                <FieldLabel>참여 유형</FieldLabel>
                <Select
                  value={participationType}
                  onChange={(e) =>
                    setParticipationType(
                      e.target.value as TreatyParticipationType,
                    )
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
                </Select>
              </Field>
            </Row2>
            <Field>
              <FieldLabel>서명일 (선택)</FieldLabel>
              <Input
                type="date"
                value={signedAt}
                onChange={(e) => setSignedAt(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>비고 (선택)</FieldLabel>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="추가 메모"
              />
            </Field>
          </FormRows>
        </ModalBody>
        <ModalFooter>
          <CancelBtn onClick={onClose}>취소</CancelBtn>
          <SubmitBtn onClick={handleSubmit} disabled={submitting}>
            {submitting ? '저장 중…' : '저장'}
          </SubmitBtn>
        </ModalFooter>
      </Modal>
      <CountryPicker
        mode="single"
        isOpen={countryPickerOpen}
        onClose={() => setCountryPickerOpen(false)}
        title="서명국 · 참여국 선택"
        modernCountries={modernCountries as CountryResponseDto[]}
        historicalCountries={
          historicalCountries as HistoricalCountryResponseDto[]
        }
        onSelect={(c) => {
          setCountryId(c.isHistorical ? null : c.id)
          setHistoricalCountryId(c.isHistorical ? c.id : null)
          setCountryLabel(c.name)
          setCountryPickerOpen(false)
        }}
      />
    </Overlay>
  )
}

// ──────────────────────────────────────────────
// 조항 추가 모달
// ──────────────────────────────────────────────

const AddTermModal: React.FC<{
  treatyId: string
  nextOrder: number
  onClose: () => void
  onAdded: () => void
}> = ({ treatyId, nextOrder, onClose, onAdded }) => {
  const ts = useTheme().ts!
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isSecret, setIsSecret] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim()) {
      notify.error('조항 내용을 입력하세요.')
      return
    }
    setSubmitting(true)
    try {
      await treatyApi.addTerm({
        treatyId,
        order: nextOrder,
        title: title.trim() || null,
        content: content.trim(),
        isSecret,
      })
      notify.success('조항이 추가되었습니다.')
      onAdded()
    } catch (e) {
      notify.error(getApiErrorMessage(e, '추가 중 오류가 발생했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>조항 추가</ModalTitle>
          <CloseBtn onClick={onClose}>
            <FiX size={18} />
          </CloseBtn>
        </ModalHeader>
        <ModalBody>
          <FormRows>
            <Field>
              <FieldLabel>조항 제목 (선택)</FieldLabel>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 제1조 — 상호 불가침 (조약문의 번호 그대로)"
              />
            </Field>
            <Field>
              <FieldLabel>
                조항 내용 <Required>*</Required>
              </FieldLabel>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                placeholder="조항 내용을 입력하세요"
              />
            </Field>
            <Field>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  color: ts.text,
                }}
              >
                <input
                  type="checkbox"
                  checked={isSecret}
                  onChange={(e) => setIsSecret(e.target.checked)}
                />
                비밀 조항 (비밀의정서 등)
              </label>
            </Field>
          </FormRows>
        </ModalBody>
        <ModalFooter>
          <CancelBtn onClick={onClose}>취소</CancelBtn>
          <SubmitBtn onClick={handleSubmit} disabled={submitting}>
            {submitting ? '추가 중…' : '추가'}
          </SubmitBtn>
        </ModalFooter>
      </Modal>
    </Overlay>
  )
}
