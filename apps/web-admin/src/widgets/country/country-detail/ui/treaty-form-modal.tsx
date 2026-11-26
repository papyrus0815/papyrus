/**
 * 조약 등록 · 수정 · 사건 연결 · 서명국 · 조항 모달.
 *
 * 정본(Single Source of Truth) 원칙:
 * - 역사적 서사(배경·전개·결과/여파)·시공간 맥락은 **Event(사건)**가 정본이다.
 * - 조약 유형·약정 요지(summary)·조항 전문(TreatyTerm)·서명 당사국/대표(TreatySignatory)·효력 수명은 **Treaty(조약)**가 정본이다.
 * - 따라서 조약 폼에서는 `배경`·`결과·여파` 중복 입력을 걷어내고, **체결·비준·파기 사건 연결**을 통해
 *   서명일·장소·당사국·파기일/사유를 자동으로 불러와 이중 입력을 방지한다.
 */
import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useQuery } from '@tanstack/react-query'
import type { IconType } from 'react-icons'
import {
  FiCheckCircle,
  FiColumns,
  FiCompass,
  FiGlobe,
  FiHeart,
  FiLink,
  FiLock,
  FiMap,
  FiMoreHorizontal,
  FiPlus,
  FiSearch,
  FiShield,
  FiSliders,
  FiTrendingUp,
  FiUmbrella,
  FiUser,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import {
  guessTreatyType,
  participationTypeFromRole,
  treatyNameFromEventTitle,
} from '@/features/event-facets/model/treaty-from-event'
import * as EventFormS from '@/pages/events/create/event-create.styles'
import type { CountryResponseDto } from '@/shared/api/countries'
import { getAllCountries } from '@/shared/api/countries'
import {
  type EventLinkCandidate,
  getEventById,
  getEventLinkCandidates,
} from '@/shared/api/events'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import {
  type CabinetListItemDto,
  personCareerApi,
} from '@/shared/api/person-career'
import { type Era, getAllPersons } from '@/shared/api/persons'
import {
  type CreateTreatyDto,
  type CreateTreatySignatoryNested,
  TREATY_EVENT_LINK_LABELS,
  TREATY_PARTICIPATION_LABELS,
  TREATY_TYPE_LABELS,
  type TreatyDto,
  type TreatyEventLinkType,
  type TreatyParticipationType,
  type TreatySignatoryDto,
  type TreatyType,
  treatyApi,
} from '@/shared/api/treaty'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import { parseIsoDateParts } from '@/shared/lib/iso-date'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { richTextToMultilineText } from '@/shared/lib/rich-text-plain'
import { confirm } from '@/shared/ui/confirm-dialog'
import { CountryPicker } from '@/shared/ui/country-picker'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import { FormSelectNative } from '@/shared/ui/form-select-native'
import { InlineDateField } from '@/shared/ui/person-register-modal/sections/inline-date-field'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import {
  activeSectionAt,
  FooterActions,
  HeaderActionsBar,
  HeaderResetBtn,
  RegisterFooterStatus,
  RegisterSectionJumpNav,
  useModalSubmitShortcut,
} from '@/shared/ui/register-modal-shell/register-modal-chrome'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import {
  PersonRegisterModalCancelBtn,
  PersonRegisterModalFormScroll,
  PersonRegisterModalStickyFooter,
} from '@/shared/ui/register-modal-shell/register-modal-shell'
import { notify } from '@/shared/ui/toast'

import * as FormS from './military-unit-form/styles'
import {
  ToneChipGroup,
  type ToneChipOption,
  useSplitLayoutMode,
} from './politics-form/politics-form-parts'

// ─── 조약 유형 칩 스펙 ─────────────────────────────────────────────────────

const TREATY_TYPE_ORDER: ReadonlyArray<TreatyType> = [
  'PEACE',
  'ALLIANCE',
  'NON_AGGRESSION',
  'TRADE',
  'TERRITORIAL',
  'BORDER',
  'FRIENDSHIP',
  'DISARMAMENT',
  'MULTILATERAL',
  'SECRET',
  'OTHER',
]

const TREATY_TYPE_TONE_SPEC: Record<
  TreatyType,
  {
    Icon: IconType
    rgb: string
    text: string
    textDark: string
    accent: string
  }
> = {
  PEACE: {
    Icon: FiCheckCircle,
    rgb: '22, 163, 74',
    text: '#15803d',
    textDark: '#86efac',
    accent: '#16a34a',
  },
  ALLIANCE: {
    Icon: FiShield,
    rgb: '37, 99, 235',
    text: '#1d4ed8',
    textDark: '#93c5fd',
    accent: '#2563eb',
  },
  NON_AGGRESSION: {
    Icon: FiUmbrella,
    rgb: '13, 148, 136',
    text: '#0f766e',
    textDark: '#5eead4',
    accent: '#0d9488',
  },
  TRADE: {
    Icon: FiTrendingUp,
    rgb: '217, 119, 6',
    text: '#b45309',
    textDark: '#fcd34d',
    accent: '#d97706',
  },
  TERRITORIAL: {
    Icon: FiMap,
    rgb: '124, 58, 237',
    text: '#6d28d9',
    textDark: '#c4b5fd',
    accent: '#7c3aed',
  },
  BORDER: {
    Icon: FiCompass,
    rgb: '67, 56, 202',
    text: '#4338ca',
    textDark: '#a5b4fc',
    accent: '#4f46e5',
  },
  FRIENDSHIP: {
    Icon: FiHeart,
    rgb: '225, 29, 72',
    text: '#be185d',
    textDark: '#f9a8d4',
    accent: '#db2777',
  },
  DISARMAMENT: {
    Icon: FiSliders,
    rgb: '71, 85, 105',
    text: '#475569',
    textDark: '#cbd5e1',
    accent: '#64748b',
  },
  MULTILATERAL: {
    Icon: FiGlobe,
    rgb: '14, 116, 144',
    text: '#0e7490',
    textDark: '#67e8f9',
    accent: '#0891b2',
  },
  SECRET: {
    Icon: FiLock,
    rgb: '220, 38, 38',
    text: '#b91c1c',
    textDark: '#fca5a5',
    accent: '#dc2626',
  },
  OTHER: {
    Icon: FiMoreHorizontal,
    rgb: '107, 114, 128',
    text: '#6b7280',
    textDark: '#a1a1aa',
    accent: '#6b7280',
  },
}

const TREATY_TYPE_CHIP_OPTIONS: ReadonlyArray<ToneChipOption<TreatyType>> =
  TREATY_TYPE_ORDER.map((typeKey) => ({
    value: typeKey,
    label: TREATY_TYPE_LABELS[typeKey],
    ...TREATY_TYPE_TONE_SPEC[typeKey],
  }))

const EVENT_LINK_ROLE_SHORT: Record<TreatyEventLinkType, string> = {
  SIGNING: '체결 사건',
  RATIFICATION: '비준 사건',
  VIOLATION: '파기 사건',
  RELATED: '관련 사건',
}

// ─── 조약 날짜 칸 (BC · 1000년 이전 날짜 지원) ─────────────────────────────

interface TreatyDateParts {
  era: Era
  year: string
  month: string
  day: string
}

const EMPTY_DATE_PARTS: TreatyDateParts = {
  era: 'AD',
  year: '',
  month: '',
  day: '',
}

export function toTreatyDateIso(raw: string | null | undefined): string {
  if (!raw) return ''
  const parts = parseIsoDateParts(raw)
  if (!parts) return ''
  const pad2 = (num: number) => String(num).padStart(2, '0')
  if (parts.year < 0) {
    return `-${String(-parts.year).padStart(6, '0')}-${pad2(parts.month)}-${pad2(parts.day)}`
  }
  return `${String(parts.year).padStart(4, '0')}-${pad2(parts.month)}-${pad2(parts.day)}`
}

function toTreatyDateIsoFromEventFields(evtData: {
  startDate?: string | null
  startEra?: string | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
}): string {
  const fromIso = toTreatyDateIso(evtData.startDate)
  if (fromIso) return fromIso
  if (evtData.startYear != null && evtData.startYear > 0) {
    const pad2 = (num: number) => String(num).padStart(2, '0')
    const monthVal = evtData.startMonth ?? 1
    const dayVal = evtData.startDay ?? 1
    if (evtData.startEra === 'BC') {
      return `-${String(evtData.startYear).padStart(6, '0')}-${pad2(monthVal)}-${pad2(dayVal)}`
    }
    return `${String(evtData.startYear).padStart(4, '0')}-${pad2(monthVal)}-${pad2(dayVal)}`
  }
  return ''
}

function formatCandidateYearLabel(cand: EventLinkCandidate): string {
  if (cand.startYear != null && cand.startYear > 0) {
    return cand.startEra === 'BC'
      ? `BC ${cand.startYear}`
      : `${cand.startYear}`
  }
  const parts = parseIsoDateParts(cand.startDate)
  if (!parts) return '연도 미상'
  return parts.year < 0 ? `BC ${-parts.year}` : `${parts.year}`
}

function partsFromTreatyIso(iso: string): TreatyDateParts {
  if (!iso) return EMPTY_DATE_PARTS
  const parsed = parseIsoDateParts(iso)
  if (!parsed) return EMPTY_DATE_PARTS
  const pad2 = (num: number) => String(num).padStart(2, '0')
  return {
    era: parsed.year < 0 ? 'BC' : 'AD',
    year: String(Math.abs(parsed.year)),
    month: pad2(parsed.month),
    day: pad2(parsed.day),
  }
}

function isoFromTreatyParts(parts: TreatyDateParts): {
  iso: string
  error: string | null
} {
  const { era, year, month, day } = parts
  if (!year && !month && !day) return { iso: '', error: null }
  if (!year || !month || !day) {
    return { iso: '', error: '연·월·일을 모두 입력하세요.' }
  }
  const yearNum = Number(year)
  const monthNum = Number(month)
  const dayNum = Number(day)
  if (!Number.isFinite(yearNum) || yearNum < 1 || yearNum > 9999) {
    return { iso: '', error: '유효한 연도(1~9999)를 입력하세요.' }
  }
  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
    return { iso: '', error: '없는 날짜입니다.' }
  }
  const signedYear = era === 'BC' ? -yearNum : yearNum
  const probe = new Date(0)
  probe.setUTCFullYear(signedYear, monthNum - 1, dayNum)
  probe.setUTCHours(0, 0, 0, 0)
  if (
    probe.getUTCFullYear() !== signedYear ||
    probe.getUTCMonth() !== monthNum - 1 ||
    probe.getUTCDate() !== dayNum
  ) {
    return { iso: '', error: '없는 날짜입니다.' }
  }
  const pad2 = (num: number) => String(num).padStart(2, '0')
  const iso =
    era === 'BC'
      ? `-${String(yearNum).padStart(6, '0')}-${pad2(monthNum)}-${pad2(dayNum)}`
      : `${String(yearNum).padStart(4, '0')}-${pad2(monthNum)}-${pad2(dayNum)}`
  return { iso, error: null }
}

function compareTreatyIsoDates(leftIso: string, rightIso: string): number {
  const leftParts = parseIsoDateParts(leftIso)
  const rightParts = parseIsoDateParts(rightIso)
  if (!leftParts || !rightParts) return 0
  const leftKey =
    leftParts.year * 10000 + leftParts.month * 100 + leftParts.day
  const rightKey =
    rightParts.year * 10000 + rightParts.month * 100 + rightParts.day
  return leftKey - rightKey
}

function TreatyDateField({
  value,
  onChange,
  onErrorChange,
  ariaLabel,
  pickerTitle,
  error,
  minDate,
  anchorId: anchorIdProp,
}: {
  value: string
  onChange: (iso: string) => void
  onErrorChange?: (message: string | null) => void
  ariaLabel: string
  pickerTitle: string
  error?: boolean
  minDate?: string
  anchorId?: string
}) {
  const generatedId = useId()
  const anchorId = anchorIdProp ?? generatedId
  const [pickerOpen, setPickerOpen] = useState(false)
  const [parts, setParts] = useState<TreatyDateParts>(() =>
    partsFromTreatyIso(value),
  )
  const [inputError, setInputError] = useState<string | null>(null)
  const lastEmittedRef = useRef(value)

  useEffect(() => {
    if (value === lastEmittedRef.current) return
    lastEmittedRef.current = value
    setParts(partsFromTreatyIso(value))
    setInputError(null)
    onErrorChange?.(null)
  }, [value, onErrorChange])

  const applyParts = (next: TreatyDateParts) => {
    setParts(next)
    const result = isoFromTreatyParts(next)
    setInputError(result.error)
    onErrorChange?.(result.error)
    lastEmittedRef.current = result.iso
    if (result.iso !== value) onChange(result.iso)
  }

  return (
    <>
      <InlineDateField
        appearance="field"
        anchorId={anchorId}
        pickerOpen={pickerOpen}
        ariaLabel={ariaLabel}
        error={error || Boolean(inputError)}
        era={parts.era}
        year={parts.year}
        month={parts.month}
        day={parts.day}
        onEra={(nextEra) => applyParts({ ...parts, era: nextEra })}
        onYear={(nextYear) => applyParts({ ...parts, year: nextYear })}
        onMonth={(nextMonth) => applyParts({ ...parts, month: nextMonth })}
        onDay={(nextDay) => applyParts({ ...parts, day: nextDay })}
        onOpenPicker={() => setPickerOpen(true)}
      />
      {inputError ? (
        <EventFormS.ErrorMessage role="alert">
          {inputError}
        </EventFormS.ErrorMessage>
      ) : null}
      {pickerOpen ? (
        <DatePickerModal
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(selectedDate) => {
            applyParts(partsFromTreatyIso(selectedDate.slice(0, 10)))
            setPickerOpen(false)
          }}
          initialDate={
            value && !value.startsWith('-')
              ? value
              : minDate && !minDate.startsWith('-')
                ? minDate
                : undefined
          }
          minDate={minDate && !minDate.startsWith('-') ? minDate : undefined}
          title={pickerTitle}
          anchorEl={document.getElementById(anchorId)}
        />
      ) : null}
    </>
  )
}

// ─── 행정부 라벨 헬퍼 ──────────────────────────────────────────────────────

export function formatCabinetListLabel(cabinet: CabinetListItemDto): string {
  const head = cabinet?.headTenure
  const ordinal = head?.ordinal
  const subTerm = head?.subTermNumber
  const termText =
    ordinal != null
      ? subTerm != null
        ? `제${ordinal}대 ${subTerm}기`
        : `제${ordinal}대`
      : ''
  const person = head?.person
  const personName = person
    ? getPersonDisplayName({
        name: person.name ?? '',
        surname: person.surname,
        middleName: (person as { middleName?: string | null }).middleName,
        nameDisplayOrder: (person as { nameDisplayOrder?: string | null })
          .nameDisplayOrder,
        country: (
          person as {
            country?: { defaultNameDisplayOrder?: string | null } | null
          }
        ).country,
      })
    : ''
  const customName = cabinet?.name?.trim()
  return (
    [customName, termText, personName].filter(Boolean).join(' · ') || '행정부'
  )
}

// ─── 당사국 · 사건 연결 초안 타입 ───────────────────────────────────────────

interface DraftSignatoryItem {
  localKey: string
  countryId: string | null
  historicalCountryId: string | null
  countryName: string
  flagEmoji: string | null
  isHistorical: boolean
  participationType: TreatyParticipationType
  cabinetId: string
  role: string
  note: string
}

interface DraftEventLinkItem {
  existingLinkId?: string
  eventId: string
  title: string
  yearLabel: string
  linkType: TreatyEventLinkType
  note: string
}

function makeDraftSignatoryFromUnified(
  country: UnifiedCountry,
): DraftSignatoryItem {
  const isHist = country.type === 'historical'
  return {
    localKey: `${country.type}:${country.id}`,
    countryId: isHist ? null : country.id,
    historicalCountryId: isHist ? country.id : null,
    countryName: country.name,
    flagEmoji: country.flagEmoji ?? null,
    isHistorical: isHist,
    participationType: 'SIGNATORY',
    cabinetId: '',
    role: '',
    note: '',
  }
}

function extractDraftEventLinksFromTreaty(
  treaty: TreatyDto | null | undefined,
): DraftEventLinkItem[] {
  if (!treaty?.eventLinks) return []
  return treaty.eventLinks
    .filter((item) => Boolean(item.event))
    .map((item) => {
      const ev = item.event!
      let yearText = '연도 미상'
      if (ev.startYear != null && ev.startYear > 0) {
        yearText =
          ev.startEra === 'BC' ? `BC ${ev.startYear}` : `${ev.startYear}`
      } else {
        const parts = parseIsoDateParts(ev.startDate)
        if (parts) {
          yearText = parts.year < 0 ? `BC ${-parts.year}` : `${parts.year}`
        }
      }
      return {
        existingLinkId: item.id,
        eventId: item.eventId,
        title: ev.title,
        yearLabel: yearText,
        linkType: item.linkType,
        note: item.note ?? '',
      }
    })
}

const DraftPartyCabinetSelect: React.FC<{
  countryId: string | null
  historicalCountryId: string | null
  value: string
  onChange: (nextCabinetId: string) => void
}> = ({ countryId, historicalCountryId, value, onChange }) => {
  const { data: cabinets = [] } = useQuery({
    queryKey: ['cabinets-for-treaty-draft', countryId, historicalCountryId],
    queryFn: () =>
      personCareerApi.getCabinets({
        countryId: countryId ?? undefined,
        historicalCountryId: historicalCountryId ?? undefined,
      }),
    enabled: Boolean(countryId || historicalCountryId),
    staleTime: 60_000,
  })

  if (cabinets.length === 0) return null

  return (
    <PartySubSelect
      aria-label="체결 당시 행정부 연결 (선택)"
      value={value}
      onChange={(evt) => onChange(evt.target.value)}
    >
      <option value="">행정부 연결 안 함 (선택)</option>
      {cabinets.map((cabinet) => (
        <option key={cabinet.id} value={cabinet.id}>
          {formatCabinetListLabel(cabinet)}
        </option>
      ))}
    </PartySubSelect>
  )
}

// ─── 조약 등록 · 수정 공용 폼 모달 ──────────────────────────────────────────

const TREATY_SECTION_ID = {
  basic: 'treaty-form-section-basic',
  timing: 'treaty-form-section-timing',
  events: 'treaty-form-section-events',
  parties: 'treaty-form-section-parties',
  narrative: 'treaty-form-section-narrative',
} as const

const TREATY_SPLIT_LEFT_ID = 'treaty-form-split-left'
const TREATY_SPLIT_RIGHT_ID = 'treaty-form-split-right'
const SIGN_DATE_ANCHOR_ID = 'treaty-form-sign-date'

export interface TreatyCreateModalProps {
  country?: UnifiedCountry | null
  onClose: () => void
  onCreated: (id: string) => void
  onCreatedAndContinue?: (id: string) => void
}

export const TreatyCreateModal: React.FC<TreatyCreateModalProps> = ({
  country = null,
  onClose,
  onCreated,
  onCreatedAndContinue,
}) => {
  return (
    <TreatyFormModal
      isOpen
      mode="create"
      initialCountry={country}
      onClose={onClose}
      onCreated={onCreated}
      onCreatedAndContinue={onCreatedAndContinue}
    />
  )
}

export interface TreatyEditModalProps {
  treaty: TreatyDto
  onClose: () => void
  onSaved: () => void
}

export const TreatyEditModal: React.FC<TreatyEditModalProps> = ({
  treaty,
  onClose,
  onSaved,
}) => {
  return (
    <TreatyFormModal
      isOpen
      mode="edit"
      treaty={treaty}
      onClose={onClose}
      onEdited={onSaved}
    />
  )
}

interface TreatyFormModalInternalProps {
  isOpen: boolean
  mode: 'create' | 'edit'
  initialCountry?: UnifiedCountry | null
  treaty?: TreatyDto | null
  onClose: () => void
  onCreated?: (id: string) => void
  onCreatedAndContinue?: (id: string) => void
  onEdited?: () => void
}

function TreatyFormModal({
  isOpen,
  mode,
  initialCountry = null,
  treaty = null,
  onClose,
  onCreated,
  onCreatedAndContinue,
  onEdited,
}: TreatyFormModalInternalProps) {
  const [name, setName] = useState(() =>
    mode === 'edit' ? (treaty?.name ?? '') : '',
  )
  const [alias, setAlias] = useState(() =>
    mode === 'edit' ? (treaty?.alias ?? '') : '',
  )
  const [type, setType] = useState<TreatyType>(() =>
    mode === 'edit' ? (treaty?.type ?? 'PEACE') : 'PEACE',
  )
  const [location, setLocation] = useState(() =>
    mode === 'edit' ? (treaty?.location ?? '') : '',
  )
  const [signDate, setSignDate] = useState(() =>
    mode === 'edit' ? toTreatyDateIso(treaty?.signDate) : '',
  )
  const [effectiveDate, setEffectiveDate] = useState(() =>
    mode === 'edit' ? toTreatyDateIso(treaty?.effectiveDate) : '',
  )
  const [expiryDate, setExpiryDate] = useState(() =>
    mode === 'edit' ? toTreatyDateIso(treaty?.expiryDate) : '',
  )
  const [violationDate, setViolationDate] = useState(() =>
    mode === 'edit' ? toTreatyDateIso(treaty?.violationDate) : '',
  )
  const [violationReason, setViolationReason] = useState(() =>
    mode === 'edit' ? richTextToMultilineText(treaty?.violationReason) : '',
  )
  const [summary, setSummary] = useState(() =>
    mode === 'edit' ? richTextToMultilineText(treaty?.summary) : '',
  )
  // 레거시 호환: 과거 조약 행에 직접 적혀 있던 background/aftermath가 있을 때만 보존/정리 가능
  const [legacyBackground, setLegacyBackground] = useState(() =>
    mode === 'edit' ? richTextToMultilineText(treaty?.background) : '',
  )
  const [legacyAftermath, setLegacyAftermath] = useState(() =>
    mode === 'edit' ? richTextToMultilineText(treaty?.aftermath) : '',
  )
  const [legacyNarrativeOpen, setLegacyNarrativeOpen] = useState(false)

  const [draftEventLinks, setDraftEventLinks] = useState<DraftEventLinkItem[]>(
    () => (mode === 'edit' ? extractDraftEventLinksFromTreaty(treaty) : []),
  )
  const [pendingEventRole, setPendingEventRole] =
    useState<TreatyEventLinkType>('SIGNING')
  const [eventSearchQuery, setEventSearchQuery] = useState('')
  const debouncedEventQuery = useDebouncedValue(eventSearchQuery, 180)
  const [eventDropdownOpen, setEventDropdownOpen] = useState(false)

  const [draftParties, setDraftParties] = useState<DraftSignatoryItem[]>(() =>
    mode === 'create' && initialCountry
      ? [makeDraftSignatoryFromUnified(initialCountry)]
      : [],
  )
  const [quickCountryQuery, setQuickCountryQuery] = useState('')
  const [quickDropdownOpen, setQuickDropdownOpen] = useState(false)
  const [countryPickerOpen, setCountryPickerOpen] = useState(false)
  const [dateInputKey, setDateInputKey] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const [dateErrors, setDateErrors] = useState<Record<string, string | null>>(
    {},
  )
  const setDateError = useCallback(
    (fieldKey: string) => (message: string | null) =>
      setDateErrors((prev) =>
        prev[fieldKey] === message ? prev : { ...prev, [fieldKey]: message },
      ),
    [],
  )

  const { layoutMode, toggleLayoutMode } = useSplitLayoutMode(
    'papyrus:treaty-register-layout',
  )
  const formScrollRef = useRef<HTMLDivElement | null>(null)
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const quickSearchInputRef = useRef<HTMLInputElement | null>(null)
  const [activeSectionId, setActiveSectionId] = useState<string>(
    TREATY_SECTION_ID.basic,
  )

  const { data: modernCountries = [] } = useQuery({
    queryKey: ['treaty-modal-countries'],
    queryFn: () => getAllCountries(),
    enabled: mode === 'create',
    staleTime: 60_000,
  })
  const { data: historicalCountries = [] } = useQuery({
    queryKey: ['treaty-modal-hist-countries'],
    queryFn: () => getAllHistoricalCountries(),
    enabled: mode === 'create',
    staleTime: 60_000,
  })

  const { data: eventCandidates = [], isFetching: eventsSearching } = useQuery({
    queryKey: ['treaty-event-link-candidates', debouncedEventQuery.trim()],
    queryFn: () =>
      getEventLinkCandidates({
        query: debouncedEventQuery.trim() || undefined,
        limit: 16,
      }),
    enabled: eventDropdownOpen || debouncedEventQuery.trim().length > 0,
    staleTime: 30_000,
  })

  const filteredEventCandidates = useMemo(() => {
    const linkedKeys = new Set(
      draftEventLinks.map((item) => `${item.eventId}:${item.linkType}`),
    )
    return eventCandidates.filter(
      (cand) => !linkedKeys.has(`${cand.id}:${pendingEventRole}`),
    )
  }, [eventCandidates, draftEventLinks, pendingEventRole])

  const sectionIds = useMemo(
    () =>
      mode === 'create'
        ? [
            TREATY_SECTION_ID.basic,
            TREATY_SECTION_ID.timing,
            TREATY_SECTION_ID.events,
            TREATY_SECTION_ID.parties,
            TREATY_SECTION_ID.narrative,
          ]
        : [
            TREATY_SECTION_ID.basic,
            TREATY_SECTION_ID.timing,
            TREATY_SECTION_ID.events,
            TREATY_SECTION_ID.narrative,
          ],
    [mode],
  )

  const applyInitialState = useCallback(() => {
    if (mode === 'edit' && treaty) {
      setName(treaty.name ?? '')
      setAlias(treaty.alias ?? '')
      setType(treaty.type ?? 'PEACE')
      setLocation(treaty.location ?? '')
      setSignDate(toTreatyDateIso(treaty.signDate))
      setEffectiveDate(toTreatyDateIso(treaty.effectiveDate))
      setExpiryDate(toTreatyDateIso(treaty.expiryDate))
      setViolationDate(toTreatyDateIso(treaty.violationDate))
      setViolationReason(richTextToMultilineText(treaty.violationReason))
      setSummary(richTextToMultilineText(treaty.summary))
      setLegacyBackground(richTextToMultilineText(treaty.background))
      setLegacyAftermath(richTextToMultilineText(treaty.aftermath))
      setDraftEventLinks(extractDraftEventLinksFromTreaty(treaty))
    } else {
      setName('')
      setAlias('')
      setType('PEACE')
      setLocation('')
      setSignDate('')
      setEffectiveDate('')
      setExpiryDate('')
      setViolationDate('')
      setViolationReason('')
      setSummary('')
      setLegacyBackground('')
      setLegacyAftermath('')
      setDraftEventLinks([])
      setDraftParties(
        initialCountry ? [makeDraftSignatoryFromUnified(initialCountry)] : [],
      )
    }
    setEventSearchQuery('')
    setQuickCountryQuery('')
    setDateErrors({})
    setDateInputKey((prev) => prev + 1)
    setActiveSectionId(TREATY_SECTION_ID.basic)
  }, [mode, treaty, initialCountry])

  /**
   * 연결된 사건 정본에서 중복 필드(조약명 후보·서명일·장소·당사국·파기일/사유·발효일)를 자동 주입한다.
   * 이미 사용자가 직접 입력한 칸은 덮어쓰지 않고 비어 있는 칸만 채운다.
   */
  const hydrateFromLinkedEvent = useCallback(
    async (cand: EventLinkCandidate, linkRole: TreatyEventLinkType) => {
      try {
        const fullEvent = (await getEventById(cand.id)) as unknown as {
          id: string
          title: string
          startDate?: string | null
          startEra?: string | null
          startYear?: number | null
          startMonth?: number | null
          startDay?: number | null
          location?: string | null
          relatedCountries?: Array<{
            id: string
            name: string
            flagEmoji?: string | null
            role?: string | null
            roleDescription?: string | null
          }>
          relatedHistoricalCountries?: Array<{
            id: string
            name: string
            role?: string | null
            roleDescription?: string | null
          }>
        }

        const eventDateIso = toTreatyDateIsoFromEventFields(fullEvent)
        const filledLabels: string[] = []

        if (linkRole === 'SIGNING') {
          setName((prevName) => {
            if (prevName.trim()) return prevName
            const suggestedName = treatyNameFromEventTitle(fullEvent.title)
            setType(guessTreatyType(fullEvent.title))
            filledLabels.push('조약명·유형')
            return suggestedName
          })
          if (eventDateIso) {
            setSignDate((prevDate) => {
              if (prevDate.trim()) return prevDate
              filledLabels.push('서명일')
              return eventDateIso
            })
          }
          if (fullEvent.location?.trim()) {
            const locText = fullEvent.location.trim()
            setLocation((prevLoc) => {
              if (prevLoc.trim()) return prevLoc
              filledLabels.push('체결 장소')
              return locText
            })
          }
          if (mode === 'create') {
            const incomingModern = fullEvent.relatedCountries ?? []
            const incomingHist = fullEvent.relatedHistoricalCountries ?? []
            if (incomingModern.length + incomingHist.length > 0) {
              setDraftParties((prevParties) => {
                const seen = new Set(prevParties.map((item) => item.localKey))
                const nextList = [...prevParties]
                let addedCount = 0
                for (const mod of incomingModern) {
                  const localKey = `modern:${mod.id}`
                  if (seen.has(localKey)) continue
                  seen.add(localKey)
                  addedCount += 1
                  nextList.push({
                    localKey,
                    countryId: mod.id,
                    historicalCountryId: null,
                    countryName: mod.name,
                    flagEmoji: mod.flagEmoji ?? null,
                    isHistorical: false,
                    participationType:
                      participationTypeFromRole(mod.role) ?? 'SIGNATORY',
                    cabinetId: '',
                    role: '',
                    note: mod.roleDescription?.trim() ?? '',
                  })
                }
                for (const hist of incomingHist) {
                  const localKey = `historical:${hist.id}`
                  if (seen.has(localKey)) continue
                  seen.add(localKey)
                  addedCount += 1
                  nextList.push({
                    localKey,
                    countryId: null,
                    historicalCountryId: hist.id,
                    countryName: hist.name,
                    flagEmoji: null,
                    isHistorical: true,
                    participationType:
                      participationTypeFromRole(hist.role) ?? 'SIGNATORY',
                    cabinetId: '',
                    role: '',
                    note: hist.roleDescription?.trim() ?? '',
                  })
                }
                if (addedCount > 0) filledLabels.push(`당사국 ${addedCount}개국`)
                return nextList
              })
            }
          }
        } else if (linkRole === 'VIOLATION') {
          if (eventDateIso) {
            setViolationDate((prevDate) => {
              if (prevDate.trim()) return prevDate
              filledLabels.push('파기일')
              return eventDateIso
            })
          }
          setViolationReason((prevReason) => {
            if (prevReason.trim()) return prevReason
            filledLabels.push('파기 사유')
            return fullEvent.title
          })
        } else if (linkRole === 'RATIFICATION') {
          if (eventDateIso) {
            setEffectiveDate((prevDate) => {
              if (prevDate.trim()) return prevDate
              filledLabels.push('발효일')
              return eventDateIso
            })
          }
        }

        if (filledLabels.length > 0) {
          setDateInputKey((prev) => prev + 1)
          notify.success(
            `사건 「${fullEvent.title}」에서 ${filledLabels.join(' · ')} 정보를 자동으로 채웠습니다.`,
          )
        }
      } catch {
        // 단건 상세 로드 실패 시 연결 자체만 유지
      }
    },
    [mode],
  )

  const handleSelectEventCandidate = useCallback(
    (cand: EventLinkCandidate) => {
      const roleToUse = pendingEventRole
      setDraftEventLinks((prev) => {
        if (
          prev.some(
            (item) =>
              item.eventId === cand.id && item.linkType === roleToUse,
          )
        ) {
          return prev
        }
        return [
          ...prev,
          {
            eventId: cand.id,
            title: cand.title,
            yearLabel: formatCandidateYearLabel(cand),
            linkType: roleToUse,
            note: '',
          },
        ]
      })
      setEventSearchQuery('')
      setEventDropdownOpen(false)
      void hydrateFromLinkedEvent(cand, roleToUse)
    },
    [pendingEventRole, hydrateFromLinkedEvent],
  )

  const quickCountryMatches = useMemo(() => {
    const trimmed = quickCountryQuery.trim().toLowerCase()
    if (!trimmed) return []
    const existingKeys = new Set(draftParties.map((item) => item.localKey))
    const results: Array<{
      localKey: string
      countryId: string | null
      historicalCountryId: string | null
      name: string
      flagEmoji: string | null
      isHistorical: boolean
      meta: string
    }> = []

    for (const mod of modernCountries as CountryResponseDto[]) {
      const localKey = `modern:${mod.id}`
      if (existingKeys.has(localKey)) continue
      if (
        mod.name.toLowerCase().includes(trimmed) ||
        mod.code?.toLowerCase().includes(trimmed)
      ) {
        results.push({
          localKey,
          countryId: mod.id,
          historicalCountryId: null,
          name: mod.name,
          flagEmoji: mod.flagEmoji ?? null,
          isHistorical: false,
          meta: '현대 국가',
        })
      }
      if (results.length >= 8) break
    }

    if (results.length < 8) {
      for (const hist of historicalCountries as HistoricalCountryResponseDto[]) {
        const localKey = `historical:${hist.id}`
        if (existingKeys.has(localKey)) continue
        if (hist.name.toLowerCase().includes(trimmed)) {
          results.push({
            localKey,
            countryId: null,
            historicalCountryId: hist.id,
            name: hist.name,
            flagEmoji: null,
            isHistorical: true,
            meta: '역사 국가',
          })
        }
        if (results.length >= 8) break
      }
    }
    return results
  }, [quickCountryQuery, draftParties, modernCountries, historicalCountries])

  const addDraftParty = useCallback(
    (entry: {
      countryId: string | null
      historicalCountryId: string | null
      name: string
      flagEmoji?: string | null
      isHistorical: boolean
    }) => {
      const localKey = entry.isHistorical
        ? `historical:${entry.historicalCountryId}`
        : `modern:${entry.countryId}`
      setDraftParties((prev) => {
        if (prev.some((existing) => existing.localKey === localKey)) {
          notify.info(`${entry.name}은(는) 이미 당사국 목록에 있습니다.`)
          return prev
        }
        return [
          ...prev,
          {
            localKey,
            countryId: entry.countryId,
            historicalCountryId: entry.historicalCountryId,
            countryName: entry.name,
            flagEmoji: entry.flagEmoji ?? null,
            isHistorical: entry.isHistorical,
            participationType: 'SIGNATORY',
            cabinetId: '',
            role: '',
            note: '',
          },
        ]
      })
      setQuickCountryQuery('')
      setQuickDropdownOpen(false)
    },
    [],
  )

  const currentSnapshot = JSON.stringify([
    name,
    alias,
    type,
    location,
    signDate,
    effectiveDate,
    expiryDate,
    violationDate,
    violationReason,
    summary,
    legacyBackground,
    legacyAftermath,
    draftEventLinks.map((link) => [link.eventId, link.linkType, link.note]),
    mode === 'create'
      ? draftParties.map((party) => [
          party.localKey,
          party.participationType,
          party.cabinetId,
          party.role,
          party.note,
        ])
      : [],
  ])

  const baselineSnapshot = useMemo(() => {
    const initialParties =
      mode === 'create' && initialCountry
        ? [makeDraftSignatoryFromUnified(initialCountry)]
        : []
    const initialEvents =
      mode === 'edit' ? extractDraftEventLinksFromTreaty(treaty) : []
    return JSON.stringify([
      mode === 'edit' ? (treaty?.name ?? '') : '',
      mode === 'edit' ? (treaty?.alias ?? '') : '',
      mode === 'edit' ? (treaty?.type ?? 'PEACE') : 'PEACE',
      mode === 'edit' ? (treaty?.location ?? '') : '',
      mode === 'edit' ? toTreatyDateIso(treaty?.signDate) : '',
      mode === 'edit' ? toTreatyDateIso(treaty?.effectiveDate) : '',
      mode === 'edit' ? toTreatyDateIso(treaty?.expiryDate) : '',
      mode === 'edit' ? toTreatyDateIso(treaty?.violationDate) : '',
      mode === 'edit' ? richTextToMultilineText(treaty?.violationReason) : '',
      mode === 'edit' ? richTextToMultilineText(treaty?.summary) : '',
      mode === 'edit' ? richTextToMultilineText(treaty?.background) : '',
      mode === 'edit' ? richTextToMultilineText(treaty?.aftermath) : '',
      initialEvents.map((link) => [link.eventId, link.linkType, link.note]),
      mode === 'create'
        ? initialParties.map((party) => [
            party.localKey,
            party.participationType,
            party.cabinetId,
            party.role,
            party.note,
          ])
        : [],
    ])
  }, [mode, treaty, initialCountry])

  const isDirty = currentSnapshot !== baselineSnapshot

  const missingRequired = useMemo(() => {
    const list: string[] = []
    if (!name.trim()) list.push('조약명')
    if (!signDate.trim()) list.push('서명일')
    if (mode === 'create' && draftParties.length === 0) {
      list.push('서명·참여 당사국')
    }
    return list
  }, [name, signDate, mode, draftParties.length])

  const firstDateInputError =
    Object.values(dateErrors).find((msg) => Boolean(msg)) ?? null

  const dateOrderProblem = useMemo(() => {
    if (!signDate) return null
    if (
      effectiveDate &&
      compareTreatyIsoDates(effectiveDate, signDate) < 0
    ) {
      return '조약 발효일이 서명일보다 앞설 수 없습니다.'
    }
    if (expiryDate && compareTreatyIsoDates(expiryDate, signDate) < 0) {
      return '조약 만료일이 서명일보다 앞설 수 없습니다.'
    }
    if (
      effectiveDate &&
      expiryDate &&
      compareTreatyIsoDates(expiryDate, effectiveDate) < 0
    ) {
      return '조약 만료일이 발효일보다 앞설 수 없습니다.'
    }
    if (
      violationDate &&
      compareTreatyIsoDates(violationDate, signDate) < 0
    ) {
      return '조약 파기·위반일이 서명일보다 앞설 수 없습니다.'
    }
    return null
  }, [signDate, effectiveDate, expiryDate, violationDate])

  const validationProblem = firstDateInputError ?? dateOrderProblem
  const canSubmit =
    !submitting && missingRequired.length === 0 && !validationProblem

  const timingFilledCount = useMemo(
    () =>
      [
        signDate,
        effectiveDate,
        expiryDate,
        violationDate,
        violationReason.trim(),
      ].filter(Boolean).length,
    [signDate, effectiveDate, expiryDate, violationDate, violationReason],
  )

  const hasLegacyNarrative = Boolean(
    mode === 'edit' && (treaty?.background?.trim() || treaty?.aftermath?.trim()),
  )

  const splitActive = () =>
    layoutMode === 'split' &&
    typeof window !== 'undefined' &&
    window.matchMedia?.(`(min-width: ${FormS.SPLIT_MIN_WIDTH}px)`).matches ===
      true

  const scrollToTopAndFocusName = useCallback(() => {
    setActiveSectionId(TREATY_SECTION_ID.basic)
    formScrollRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' })
    document
      .getElementById(TREATY_SPLIT_LEFT_ID)
      ?.scrollTo?.({ top: 0, behavior: 'smooth' })
    document
      .getElementById(TREATY_SPLIT_RIGHT_ID)
      ?.scrollTo?.({ top: 0, behavior: 'smooth' })
    nameInputRef.current?.focus()
  }, [])

  const jumpToSection = useCallback(
    (sectionId: string) => {
      setActiveSectionId(sectionId)
      if (splitActive()) {
        if (sectionId === TREATY_SECTION_ID.basic) {
          document
            .getElementById(TREATY_SPLIT_LEFT_ID)
            ?.scrollTo?.({ top: 0, behavior: 'smooth' })
          return
        }
        if (sectionId === TREATY_SECTION_ID.events) {
          document
            .getElementById(TREATY_SPLIT_RIGHT_ID)
            ?.scrollTo?.({ top: 0, behavior: 'smooth' })
          return
        }
      }
      document
        .getElementById(sectionId)
        ?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    },
    [layoutMode],
  )

  const handleFormScroll = (scrollEvent: React.UIEvent<HTMLDivElement>) => {
    const target = scrollEvent.target as HTMLElement | null
    let nextId: string
    if (target?.id === TREATY_SPLIT_LEFT_ID) {
      nextId = activeSectionAt(target, [
        TREATY_SECTION_ID.basic,
        TREATY_SECTION_ID.timing,
      ])
    } else if (target?.id === TREATY_SPLIT_RIGHT_ID) {
      nextId = activeSectionAt(
        target,
        mode === 'create'
          ? [
              TREATY_SECTION_ID.events,
              TREATY_SECTION_ID.parties,
              TREATY_SECTION_ID.narrative,
            ]
          : [TREATY_SECTION_ID.events, TREATY_SECTION_ID.narrative],
      )
    } else {
      nextId = activeSectionAt(scrollEvent.currentTarget, sectionIds)
    }
    setActiveSectionId((prev) => (prev === nextId ? prev : nextId))
  }

  const focusFirstMissing = useCallback(() => {
    if (!name.trim()) {
      jumpToSection(TREATY_SECTION_ID.basic)
      nameInputRef.current?.focus()
      return
    }
    if (!signDate.trim()) {
      jumpToSection(TREATY_SECTION_ID.timing)
      const signNode = document.querySelector<HTMLInputElement>(
        `#${SIGN_DATE_ANCHOR_ID} input`,
      )
      signNode?.focus()
      return
    }
    if (mode === 'create' && draftParties.length === 0) {
      jumpToSection(TREATY_SECTION_ID.parties)
      quickSearchInputRef.current?.focus()
    }
  }, [name, signDate, mode, draftParties.length, jumpToSection])

  const requestClose = useCallback(async () => {
    if (submitting) return
    if (
      isDirty &&
      !(await confirm({
        title: '확인',
        message:
          mode === 'create'
            ? '작성 중인 조약 정보가 사라집니다. 창을 닫으시겠습니까?'
            : '저장하지 않은 변경 사항이 있습니다. 닫으시겠습니까?',
      }))
    ) {
      return
    }
    onClose()
  }, [submitting, isDirty, mode, onClose])

  const handleReset = async () => {
    if (submitting) return
    if (
      !(await confirm({
        title: '작성 내용 초기화',
        message: '작성 중인 내용을 모두 지우고 처음 상태로 되돌리시겠습니까?',
      }))
    ) {
      return
    }
    applyInitialState()
    requestAnimationFrame(() => scrollToTopAndFocusName())
  }

  const handleSubmit = useCallback(
    async (options?: { continueAfterSave?: boolean }) => {
      if (!canSubmit) {
        if (missingRequired.length > 0) {
          notify.error(`${missingRequired[0]} 항목을 먼저 입력하세요.`)
          focusFirstMissing()
        } else if (validationProblem) {
          notify.error(validationProblem)
        }
        return
      }

      const continueAfterSave = Boolean(
        mode === 'create' && options?.continueAfterSave,
      )

      setSubmitting(true)
      try {
        if (mode === 'create') {
          const signatoriesPayload: CreateTreatySignatoryNested[] =
            draftParties.map((party) => ({
              countryId: party.countryId,
              historicalCountryId: party.historicalCountryId,
              participationType: party.participationType,
              ...(party.cabinetId.trim()
                ? { cabinetId: party.cabinetId.trim() }
                : {}),
              ...(party.role.trim() ? { role: party.role.trim() } : {}),
              ...(party.note.trim() ? { note: party.note.trim() } : {}),
            }))

          const dto: CreateTreatyDto = {
            name: name.trim(),
            alias: alias.trim() || null,
            type,
            signDate,
            effectiveDate: effectiveDate || null,
            expiryDate: expiryDate || null,
            violationDate: violationDate || null,
            violationReason:
              violationDate && violationReason.trim()
                ? violationReason.trim()
                : null,
            location: location.trim() || null,
            summary: summary.trim() || null,
            signatories: signatoriesPayload,
          }
          const created = await treatyApi.create(dto)

          for (const linkItem of draftEventLinks) {
            try {
              await treatyApi.linkEvent(created.id, {
                eventId: linkItem.eventId,
                linkType: linkItem.linkType,
                note: linkItem.note.trim() || null,
              })
            } catch {
              // 개별 링크 충돌 시 조약 생성 자체는 유지
            }
          }

          notify.success('조약이 등록되었습니다.')

          if (continueAfterSave) {
            onCreatedAndContinue?.(created.id)
            setName('')
            setAlias('')
            setLocation('')
            setSignDate('')
            setEffectiveDate('')
            setExpiryDate('')
            setViolationDate('')
            setViolationReason('')
            setSummary('')
            setDraftEventLinks([])
            setDraftParties(
              initialCountry
                ? [makeDraftSignatoryFromUnified(initialCountry)]
                : [],
            )
            setDateErrors({})
            setDateInputKey((prev) => prev + 1)
            requestAnimationFrame(() => scrollToTopAndFocusName())
          } else {
            onCreated?.(created.id)
          }
        } else if (treaty) {
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
            ...(hasLegacyNarrative
              ? {
                  background: legacyBackground.trim() || null,
                  aftermath: legacyAftermath.trim() || null,
                }
              : {}),
          })

          // 사건 연결 증분 동기화
          const origLinks = extractDraftEventLinksFromTreaty(treaty)
          const nextKeySet = new Set(
            draftEventLinks.map((item) => `${item.eventId}:${item.linkType}`),
          )
          const origKeyMap = new Map(
            origLinks.map((item) => [
              `${item.eventId}:${item.linkType}`,
              item.existingLinkId,
            ]),
          )

          for (const orig of origLinks) {
            const key = `${orig.eventId}:${orig.linkType}`
            if (!nextKeySet.has(key) && orig.existingLinkId) {
              await treatyApi.unlinkEvent(orig.existingLinkId)
            }
          }
          for (const nextLink of draftEventLinks) {
            const key = `${nextLink.eventId}:${nextLink.linkType}`
            if (!origKeyMap.has(key)) {
              await treatyApi.linkEvent(treaty.id, {
                eventId: nextLink.eventId,
                linkType: nextLink.linkType,
                note: nextLink.note.trim() || null,
              })
            }
          }

          notify.success('조약 정보가 수정되었습니다.')
          onEdited?.()
        }
      } catch (err) {
        notify.error(
          getApiErrorMessage(
            err,
            mode === 'create'
              ? '조약 등록 중 오류가 발생했습니다.'
              : '조약 수정 중 오류가 발생했습니다.',
          ),
        )
      } finally {
        setSubmitting(false)
      }
    },
    [
      canSubmit,
      missingRequired,
      focusFirstMissing,
      validationProblem,
      mode,
      draftParties,
      draftEventLinks,
      name,
      alias,
      type,
      signDate,
      effectiveDate,
      expiryDate,
      violationDate,
      violationReason,
      location,
      summary,
      hasLegacyNarrative,
      legacyBackground,
      legacyAftermath,
      onCreatedAndContinue,
      initialCountry,
      scrollToTopAndFocusName,
      onCreated,
      treaty,
      onEdited,
    ],
  )

  useModalSubmitShortcut({
    enabled: isOpen && canSubmit,
    scrollContainerRef: formScrollRef,
    onSubmit: ({ continueAfterSave }) => {
      void handleSubmit({ continueAfterSave })
    },
  })

  const navSections = useMemo(
    () => [
      {
        id: TREATY_SECTION_ID.basic,
        label: '기본 정보',
        badge: name.trim() ? '✓' : null,
      },
      {
        id: TREATY_SECTION_ID.timing,
        label: '체결·효력',
        badge: signDate
          ? timingFilledCount > 1
            ? String(timingFilledCount)
            : '✓'
          : null,
      },
      {
        id: TREATY_SECTION_ID.events,
        label: '사건 연결',
        badge:
          draftEventLinks.length > 0 ? `${draftEventLinks.length}` : null,
      },
      ...(mode === 'create'
        ? [
            {
              id: TREATY_SECTION_ID.parties,
              label: '당사국',
              badge:
                draftParties.length > 0 ? `${draftParties.length}` : null,
            },
          ]
        : []),
      {
        id: TREATY_SECTION_ID.narrative,
        label: '약정 요지',
        badge: summary.trim() ? '✓' : null,
      },
    ],
    [
      name,
      signDate,
      timingFilledCount,
      draftEventLinks.length,
      mode,
      draftParties.length,
      summary,
    ],
  )

  const basicSectionNode = (
    <FormS.FormGroupSection
      id={TREATY_SECTION_ID.basic}
      aria-labelledby={`${TREATY_SECTION_ID.basic}-title`}
    >
      <FormS.FormGroupTitle id={`${TREATY_SECTION_ID.basic}-title`}>
        기본 정보
      </FormS.FormGroupTitle>

      <EventFormS.FormRow>
        <EventFormS.FormLabel htmlFor="treaty-form-name">
          조약명 <EventFormS.Required>*</EventFormS.Required>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <FormS.TitleInput
            ref={nameInputRef}
            id="treaty-form-name"
            value={name}
            onChange={(evt) => setName(evt.target.value)}
            autoComplete="off"
            aria-required
            placeholder="예: 베르사유 조약, 독소 불가침 조약, 조일수호조규"
          />
        </EventFormS.FormField>
      </EventFormS.FormRow>

      <EventFormS.FormRow>
        <EventFormS.FormLabel htmlFor="treaty-form-alias">
          별칭·통칭<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <EventFormS.Input
            id="treaty-form-alias"
            value={alias}
            onChange={(evt) => setAlias(evt.target.value)}
            autoComplete="off"
            placeholder="예: 몰로토프-리벤트로프 조약, 강화도 조약, 5개국 조약"
          />
        </EventFormS.FormField>
      </EventFormS.FormRow>

      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div" id="treaty-form-type-label">
          조약 유형 <EventFormS.Required>*</EventFormS.Required>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <ToneChipGroup
            ariaLabelledBy="treaty-form-type-label"
            value={type}
            onChange={(nextType) => {
              if (nextType) setType(nextType)
            }}
            options={TREATY_TYPE_CHIP_OPTIONS}
          />
        </EventFormS.FormField>
      </EventFormS.FormRow>

      <EventFormS.FormRow>
        <EventFormS.FormLabel htmlFor="treaty-form-location">
          체결 장소<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <EventFormS.Input
            id="treaty-form-location"
            value={location}
            onChange={(evt) => setLocation(evt.target.value)}
            autoComplete="off"
            placeholder="비워 두면 연결된 체결 사건의 장소를 자동으로 참조합니다"
          />
        </EventFormS.FormField>
      </EventFormS.FormRow>
    </FormS.FormGroupSection>
  )

  const timingSectionNode = (
    <FormS.FormGroupSection
      id={TREATY_SECTION_ID.timing}
      aria-labelledby={`${TREATY_SECTION_ID.timing}-title`}
    >
      <FormS.FormGroupTitle id={`${TREATY_SECTION_ID.timing}-title`}>
        체결 · 효력 일자
        {timingFilledCount > 0 ? (
          <FormS.FormGroupSummaryBadge>
            {timingFilledCount}칸
          </FormS.FormGroupSummaryBadge>
        ) : null}
      </FormS.FormGroupTitle>

      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div">
          서명·발효일 <EventFormS.Required>*</EventFormS.Required>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <FormS.DateRangeGrid key={`sign-eff-${dateInputKey}`}>
            <FormS.DateColumn>
              <FormS.SubTitleLabel>서명일 (필수)</FormS.SubTitleLabel>
              <TreatyDateField
                anchorId={SIGN_DATE_ANCHOR_ID}
                ariaLabel="서명일"
                pickerTitle="서명일 선택"
                value={signDate}
                onChange={setSignDate}
                onErrorChange={setDateError('signDate')}
              />
            </FormS.DateColumn>
            <FormS.DateColumn>
              <FormS.SubTitleLabel>발효일 (선택)</FormS.SubTitleLabel>
              <TreatyDateField
                ariaLabel="발효일"
                pickerTitle="발효일 선택"
                value={effectiveDate}
                onChange={setEffectiveDate}
                onErrorChange={setDateError('effectiveDate')}
                minDate={signDate || undefined}
                error={Boolean(
                  signDate &&
                    effectiveDate &&
                    compareTreatyIsoDates(effectiveDate, signDate) < 0,
                )}
              />
            </FormS.DateColumn>
          </FormS.DateRangeGrid>
          <EventFormS.Hint>
            우측 ‘사건 연결’에서 체결 사건을 고르면 서명일·장소·당사국이 자동으로 채워집니다.
          </EventFormS.Hint>
        </EventFormS.FormField>
      </EventFormS.FormRow>

      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div">
          만료·파기일<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <FormS.DateRangeGrid key={`exp-viol-${dateInputKey}`}>
            <FormS.DateColumn>
              <FormS.SubTitleLabel>만료일 (선택)</FormS.SubTitleLabel>
              <TreatyDateField
                ariaLabel="만료일"
                pickerTitle="만료일 선택"
                value={expiryDate}
                onChange={setExpiryDate}
                onErrorChange={setDateError('expiryDate')}
                minDate={effectiveDate || signDate || undefined}
                error={Boolean(
                  (signDate &&
                    expiryDate &&
                    compareTreatyIsoDates(expiryDate, signDate) < 0) ||
                    (effectiveDate &&
                      expiryDate &&
                      compareTreatyIsoDates(expiryDate, effectiveDate) < 0),
                )}
              />
            </FormS.DateColumn>
            <FormS.DateColumn>
              <FormS.SubTitleLabel>파기·위반일 (선택)</FormS.SubTitleLabel>
              <TreatyDateField
                ariaLabel="파기·위반일"
                pickerTitle="파기·위반일 선택"
                value={violationDate}
                onChange={setViolationDate}
                onErrorChange={setDateError('violationDate')}
                minDate={signDate || undefined}
                error={Boolean(
                  signDate &&
                    violationDate &&
                    compareTreatyIsoDates(violationDate, signDate) < 0,
                )}
              />
            </FormS.DateColumn>
          </FormS.DateRangeGrid>

          {dateOrderProblem ? (
            <EventFormS.ErrorMessage role="alert">
              {dateOrderProblem}
            </EventFormS.ErrorMessage>
          ) : null}

          {violationDate || violationReason.trim() ? (
            <ViolationReasonWrap>
              <FormS.SubTitleLabel htmlFor="treaty-form-violation-reason">
                파기·위반 사유 (선택 · 파기 사건 연결 시 자동 입력)
              </FormS.SubTitleLabel>
              <EventFormS.Input
                id="treaty-form-violation-reason"
                value={violationReason}
                onChange={(evt) => setViolationReason(evt.target.value)}
                placeholder="예: 바르바로사 작전 개시로 일방 파기"
              />
            </ViolationReasonWrap>
          ) : null}
        </EventFormS.FormField>
      </EventFormS.FormRow>
    </FormS.FormGroupSection>
  )

  const eventsSectionNode = (
    <FormS.FormGroupSection
      id={TREATY_SECTION_ID.events}
      aria-labelledby={`${TREATY_SECTION_ID.events}-title`}
    >
      <FormS.FormGroupTitle id={`${TREATY_SECTION_ID.events}-title`}>
        연결 사건 (체결 · 비준 · 파기)
        {draftEventLinks.length > 0 ? (
          <FormS.FormGroupSummaryBadge>
            {draftEventLinks.length}건
          </FormS.FormGroupSummaryBadge>
        ) : null}
      </FormS.FormGroupTitle>

      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div">
          관련 사건<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          {draftEventLinks.length > 0 ? (
            <DraftPartyList>
              {draftEventLinks.map((linkItem) => (
                <DraftEventCard
                  key={`${linkItem.eventId}:${linkItem.linkType}`}
                  $tone={linkItem.linkType}
                >
                  <DraftPartyTopRow>
                    <DraftPartyIdentity>
                      <FiLink size={12} aria-hidden />
                      <EventYearBadge>{linkItem.yearLabel}</EventYearBadge>
                      <DraftPartyName>{linkItem.title}</DraftPartyName>
                    </DraftPartyIdentity>

                    <DraftPartyRightControls>
                      <PartyParticipationSelect
                        aria-label={`${linkItem.title} 연결 자격`}
                        value={linkItem.linkType}
                        onChange={(evt) => {
                          const nextRole = evt.target
                            .value as TreatyEventLinkType
                          setDraftEventLinks((prev) =>
                            prev.map((item) =>
                              item.eventId === linkItem.eventId &&
                              item.linkType === linkItem.linkType
                                ? { ...item, linkType: nextRole }
                                : item,
                            ),
                          )
                        }}
                      >
                        {(
                          Object.entries(EVENT_LINK_ROLE_SHORT) as [
                            TreatyEventLinkType,
                            string,
                          ][]
                        ).map(([roleKey, roleLabel]) => (
                          <option key={roleKey} value={roleKey}>
                            {roleLabel}
                          </option>
                        ))}
                      </PartyParticipationSelect>

                      <DraftPartyRemoveBtn
                        type="button"
                        title="사건 연결 해제"
                        aria-label={`${linkItem.title} 연결 해제`}
                        onClick={() =>
                          setDraftEventLinks((prev) =>
                            prev.filter(
                              (item) =>
                                !(
                                  item.eventId === linkItem.eventId &&
                                  item.linkType === linkItem.linkType
                                ),
                            ),
                          )
                        }
                      >
                        <FiX size={14} />
                      </DraftPartyRemoveBtn>
                    </DraftPartyRightControls>
                  </DraftPartyTopRow>
                </DraftEventCard>
              ))}
            </DraftPartyList>
          ) : null}

          <PartyQuickAddRow>
            <EventRolePreSelect
              aria-label="추가할 사건의 연결 성격"
              value={pendingEventRole}
              onChange={(evt) =>
                setPendingEventRole(evt.target.value as TreatyEventLinkType)
              }
            >
              <option value="SIGNING">체결 사건</option>
              <option value="RATIFICATION">비준 사건</option>
              <option value="VIOLATION">파기 사건</option>
              <option value="RELATED">관련 사건</option>
            </EventRolePreSelect>

            <PartyQuickSearchAnchor
              onBlur={(blurEvent) => {
                if (
                  !blurEvent.currentTarget.contains(
                    blurEvent.relatedTarget as Node | null,
                  )
                ) {
                  setEventDropdownOpen(false)
                }
              }}
            >
              <PartyQuickSearchBox>
                <FiSearch size={13} aria-hidden />
                <input
                  type="search"
                  value={eventSearchQuery}
                  onFocus={() => setEventDropdownOpen(true)}
                  onChange={(evt) => {
                    setEventSearchQuery(evt.target.value)
                    setEventDropdownOpen(true)
                  }}
                  placeholder="사건명 검색 시 일시·장소·당사국 자동 채움…"
                  aria-label="연결할 사건 검색"
                />
              </PartyQuickSearchBox>

              {eventDropdownOpen ? (
                <QuickSuggestMenu role="listbox">
                  {eventsSearching && filteredEventCandidates.length === 0 ? (
                    <QuickSuggestEmpty>사건 목록을 찾는 중…</QuickSuggestEmpty>
                  ) : filteredEventCandidates.length > 0 ? (
                    filteredEventCandidates.slice(0, 10).map((cand) => (
                      <QuickSuggestItem
                        key={cand.id}
                        type="button"
                        onClick={() => handleSelectEventCandidate(cand)}
                      >
                        <span className="name">{cand.title}</span>
                        <span className="meta">
                          {formatCandidateYearLabel(cand)}
                        </span>
                      </QuickSuggestItem>
                    ))
                  ) : (
                    <QuickSuggestEmpty>
                      일치하는 사건이 없습니다. 사건명을 입력해 검색하세요.
                    </QuickSuggestEmpty>
                  )}
                </QuickSuggestMenu>
              ) : null}
            </PartyQuickSearchAnchor>
          </PartyQuickAddRow>

          <EventFormS.Hint>
            체결 사건을 먼저 연결하면 <strong>서명일 · 장소 · 당사국</strong>이 자동 반영되고, 배경·여파도 해당 사건을 정본으로 참조해 두 번 적지 않습니다.
          </EventFormS.Hint>
        </EventFormS.FormField>
      </EventFormS.FormRow>
    </FormS.FormGroupSection>
  )

  const partiesSectionNode =
    mode === 'create' ? (
      <FormS.FormGroupSection
        id={TREATY_SECTION_ID.parties}
        aria-labelledby={`${TREATY_SECTION_ID.parties}-title`}
      >
        <FormS.FormGroupTitle id={`${TREATY_SECTION_ID.parties}-title`}>
          서명 · 참여 당사국
          <FormS.FormGroupSummaryBadge>
            {draftParties.length}개국
          </FormS.FormGroupSummaryBadge>
        </FormS.FormGroupTitle>

        <EventFormS.FormRow>
          <EventFormS.FormLabel as="div">
            참여 국가 <EventFormS.Required>*</EventFormS.Required>
          </EventFormS.FormLabel>
          <EventFormS.FormField>
            {draftParties.length > 0 ? (
              <DraftPartyList>
                {draftParties.map((party, idx) => (
                  <DraftPartyCard key={party.localKey}>
                    <DraftPartyTopRow>
                      <DraftPartyIdentity>
                        <DraftPartyIndex>#{idx + 1}</DraftPartyIndex>
                        {party.flagEmoji ? (
                          <DraftPartyFlag aria-hidden>
                            {party.flagEmoji}
                          </DraftPartyFlag>
                        ) : null}
                        <DraftPartyName>{party.countryName}</DraftPartyName>
                        <DraftPartyKindTag $historical={party.isHistorical}>
                          {party.isHistorical ? '역사 국가' : '현대 국가'}
                        </DraftPartyKindTag>
                      </DraftPartyIdentity>

                      <DraftPartyRightControls>
                        <PartyParticipationSelect
                          aria-label={`${party.countryName} 참여 유형`}
                          value={party.participationType}
                          onChange={(evt) => {
                            const nextRole = evt.target
                              .value as TreatyParticipationType
                            setDraftParties((prev) =>
                              prev.map((item) =>
                                item.localKey === party.localKey
                                  ? { ...item, participationType: nextRole }
                                  : item,
                              ),
                            )
                          }}
                        >
                          {(
                            Object.entries(TREATY_PARTICIPATION_LABELS) as [
                              TreatyParticipationType,
                              string,
                            ][]
                          ).map(([roleKey, roleLabel]) => (
                            <option key={roleKey} value={roleKey}>
                              {roleLabel}
                            </option>
                          ))}
                        </PartyParticipationSelect>

                        <DraftPartyRemoveBtn
                          type="button"
                          title={`${party.countryName} 제외`}
                          aria-label={`${party.countryName} 제외`}
                          onClick={() =>
                            setDraftParties((prev) =>
                              prev.filter(
                                (item) => item.localKey !== party.localKey,
                              ),
                            )
                          }
                        >
                          <FiX size={14} />
                        </DraftPartyRemoveBtn>
                      </DraftPartyRightControls>
                    </DraftPartyTopRow>

                    <DraftPartyMetaRow>
                      <DraftPartyCabinetSelect
                        countryId={party.countryId}
                        historicalCountryId={party.historicalCountryId}
                        value={party.cabinetId}
                        onChange={(nextCabinetId) =>
                          setDraftParties((prev) =>
                            prev.map((item) =>
                              item.localKey === party.localKey
                                ? { ...item, cabinetId: nextCabinetId }
                                : item,
                            ),
                          )
                        }
                      />
                      <PartyRoleNoteInput
                        value={party.note}
                        onChange={(evt) => {
                          const nextNote = evt.target.value
                          setDraftParties((prev) =>
                            prev.map((item) =>
                              item.localKey === party.localKey
                                ? { ...item, note: nextNote }
                                : item,
                            ),
                          )
                        }}
                        placeholder="이 국가의 비준·할양·배상 등 처지 비고 (선택)"
                      />
                    </DraftPartyMetaRow>
                  </DraftPartyCard>
                ))}
              </DraftPartyList>
            ) : null}

            <PartyQuickAddRow>
              <PartyQuickSearchAnchor
                onBlur={(blurEvent) => {
                  if (
                    !blurEvent.currentTarget.contains(
                      blurEvent.relatedTarget as Node | null,
                    )
                  ) {
                    setQuickDropdownOpen(false)
                  }
                }}
              >
                <PartyQuickSearchBox>
                  <FiSearch size={13} aria-hidden />
                  <input
                    ref={quickSearchInputRef}
                    type="search"
                    value={quickCountryQuery}
                    onFocus={() => setQuickDropdownOpen(true)}
                    onChange={(evt) => {
                      setQuickCountryQuery(evt.target.value)
                      setQuickDropdownOpen(true)
                    }}
                    placeholder="상대 서명국·참여국 이름으로 빠른 검색하여 추가…"
                    aria-label="참여 국가 빠른 검색"
                  />
                </PartyQuickSearchBox>

                {quickDropdownOpen && quickCountryQuery.trim().length > 0 ? (
                  <QuickSuggestMenu role="listbox">
                    {quickCountryMatches.length > 0 ? (
                      quickCountryMatches.map((cand) => (
                        <QuickSuggestItem
                          key={cand.localKey}
                          type="button"
                          onClick={() => addDraftParty(cand)}
                        >
                          <span className="name">
                            {cand.flagEmoji ? `${cand.flagEmoji} ` : ''}
                            {cand.name}
                          </span>
                          <span className="meta">{cand.meta}</span>
                        </QuickSuggestItem>
                      ))
                    ) : (
                      <QuickSuggestEmpty>
                        일치하는 미추가 국가가 없습니다. 우측 ‘목록에서 선택’을 이용해 보세요.
                      </QuickSuggestEmpty>
                    )}
                  </QuickSuggestMenu>
                ) : null}
              </PartyQuickSearchAnchor>

              <OpenCountryPickerBtn
                type="button"
                onClick={() => setCountryPickerOpen(true)}
              >
                <FiPlus size={13} aria-hidden />
                목록에서 선택
              </OpenCountryPickerBtn>
            </PartyQuickAddRow>
          </EventFormS.FormField>
        </EventFormS.FormRow>
      </FormS.FormGroupSection>
    ) : null

  const narrativeSectionNode = (
    <FormS.FormGroupSection
      id={TREATY_SECTION_ID.narrative}
      aria-labelledby={`${TREATY_SECTION_ID.narrative}-title`}
    >
      <FormS.FormGroupTitle id={`${TREATY_SECTION_ID.narrative}-title`}>
        약정 요지
      </FormS.FormGroupTitle>

      <EventFormS.FormRow>
        <EventFormS.FormLabel htmlFor="treaty-form-summary">
          핵심 약정<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <EventFormS.Textarea
            id="treaty-form-summary"
            value={summary}
            onChange={(evt) => setSummary(evt.target.value)}
            placeholder="누가 무엇을 할양·배상·보장하기로 약속했는지 법적 핵심 골자만 2~3문장으로 적습니다 (선택)"
            rows={4}
          />
          <EventFormS.Hint>
            역사적 체결 배경과 결과·여파는 연결된 <strong>사건(Event)</strong>을 정본으로 사용합니다. 개별 조문(제1조, 비밀의정서 등)은 등록 후 상세 화면의 ‘조항’에 기록합니다.
          </EventFormS.Hint>

          {hasLegacyNarrative ? (
            <LegacyNarrativeBox>
              <FormS.OptionalRevealBtn
                type="button"
                $open={legacyNarrativeOpen}
                aria-expanded={legacyNarrativeOpen}
                onClick={() => setLegacyNarrativeOpen((prev) => !prev)}
              >
                <span>
                  기존 조약에 직접 저장된 배경·여파 텍스트 정리 (사건 이관 권장)
                </span>
              </FormS.OptionalRevealBtn>
              {legacyNarrativeOpen ? (
                <LegacyFieldsStack>
                  <div>
                    <FormS.SubTitleLabel htmlFor="treaty-legacy-bg">
                      기존 조약 배경 (비우면 연결 사건의 배경을 자동 표시)
                    </FormS.SubTitleLabel>
                    <EventFormS.Textarea
                      id="treaty-legacy-bg"
                      value={legacyBackground}
                      onChange={(evt) => setLegacyBackground(evt.target.value)}
                      rows={3}
                    />
                  </div>
                  <div>
                    <FormS.SubTitleLabel htmlFor="treaty-legacy-after">
                      기존 조약 결과·여파 (비우면 연결 사건의 여파를 자동 표시)
                    </FormS.SubTitleLabel>
                    <EventFormS.Textarea
                      id="treaty-legacy-after"
                      value={legacyAftermath}
                      onChange={(evt) => setLegacyAftermath(evt.target.value)}
                      rows={3}
                    />
                  </div>
                </LegacyFieldsStack>
              ) : null}
            </LegacyNarrativeBox>
          ) : null}
        </EventFormS.FormField>
      </EventFormS.FormRow>
    </FormS.FormGroupSection>
  )

  return (
    <>
      <RegisterModal
        isOpen={isOpen}
        onClose={() => {
          void requestClose()
        }}
        closeOnEsc={!submitting}
        closeOnOverlayClick={!submitting}
        trapFocus={false}
        initialFocusRef={mode === 'create' ? nameInputRef : undefined}
        title={mode === 'create' ? '조약 등록' : '조약 수정'}
        headerActions={
          <HeaderActionsBar>
            <RegisterSectionJumpNav
              sections={navSections}
              activeId={activeSectionId}
              onJump={jumpToSection}
            />
            {mode === 'create' && isDirty ? (
              <HeaderResetBtn
                type="button"
                disabled={submitting}
                onClick={() => {
                  void handleReset()
                }}
              >
                초기화
              </HeaderResetBtn>
            ) : null}
            <FormS.LayoutModeToggleBtn
              type="button"
              $active={layoutMode === 'split'}
              aria-pressed={layoutMode === 'split'}
              aria-label={
                layoutMode === 'split'
                  ? '1단 세로 보기로 전환'
                  : '2단 좌우 분할 보기로 전환'
              }
              title={
                layoutMode === 'split'
                  ? '좌우 2단 분할 보기 중 (클릭 시 1단 세로 보기로 전환)'
                  : '1단 세로 보기 중 (클릭 시 좌우 2단 분할 보기로 전환)'
              }
              onClick={toggleLayoutMode}
            >
              <FiColumns size={13} aria-hidden="true" />
              <span>{layoutMode === 'split' ? '2단 분할' : '1단 보기'}</span>
            </FormS.LayoutModeToggleBtn>
          </HeaderActionsBar>
        }
        maxWidth={
          layoutMode === 'split' ? 'min(1380px, 96vw)' : 'min(1000px, 96vw)'
        }
        minHeight="84vh"
        height={layoutMode === 'split' ? '86vh' : undefined}
        fullBleedOnMobile
      >
        <FormS.MilitaryModalFormScroll
          ref={formScrollRef}
          $layoutMode={layoutMode}
          onScroll={handleFormScroll}
          onScrollCapture={handleFormScroll}
        >
          {submitting ? (
            <FormS.BusyBar role="status" aria-live="polite">
              {mode === 'create'
                ? '조약을 등록하는 중...'
                : '수정 사항을 저장하는 중...'}
            </FormS.BusyBar>
          ) : null}

          <EventFormS.FormSection>
            {layoutMode === 'split' ? (
              <TreatyHalfSplitGrid>
                <FormS.SplitColumnLeft id={TREATY_SPLIT_LEFT_ID}>
                  {basicSectionNode}
                  {timingSectionNode}
                </FormS.SplitColumnLeft>
                <FormS.SplitColumnRight id={TREATY_SPLIT_RIGHT_ID}>
                  {eventsSectionNode}
                  {partiesSectionNode}
                  {narrativeSectionNode}
                </FormS.SplitColumnRight>
              </TreatyHalfSplitGrid>
            ) : (
              <>
                {basicSectionNode}
                {timingSectionNode}
                {eventsSectionNode}
                {partiesSectionNode}
                {narrativeSectionNode}
              </>
            )}
          </EventFormS.FormSection>
        </FormS.MilitaryModalFormScroll>

        <PersonRegisterModalStickyFooter>
          <RegisterFooterStatus
            missing={missingRequired}
            onJumpToMissing={focusFirstMissing}
            problem={validationProblem}
            readyLabel={
              mode === 'create' ? '등록 준비 완료' : '수정 준비 완료'
            }
            shortcuts={
              mode === 'create'
                ? [
                    { keys: '⌘↵', label: '저장' },
                    { keys: '⌘⇧↵', label: '등록 후 계속' },
                  ]
                : [{ keys: '⌘↵', label: '저장' }]
            }
          />
          <FooterActions>
            <PersonRegisterModalCancelBtn
              type="button"
              onClick={() => {
                void requestClose()
              }}
              disabled={submitting}
            >
              취소
            </PersonRegisterModalCancelBtn>
            {mode === 'create' ? (
              <PersonRegisterModalCancelBtn
                type="button"
                disabled={!canSubmit}
                title="저장 후 창을 닫지 않고 다음 조약을 이어서 등록합니다 (⌘/Ctrl + Shift + Enter)"
                onClick={() => {
                  void handleSubmit({ continueAfterSave: true })
                }}
              >
                등록 후 계속
              </PersonRegisterModalCancelBtn>
            ) : null}
            <FormS.ModalPrimarySubmitBtn
              type="button"
              disabled={!canSubmit}
              title={
                missingRequired.length > 0
                  ? `필수 입력: ${missingRequired.join(', ')}`
                  : (validationProblem ?? '단축키: ⌘/Ctrl + Enter')
              }
              onClick={() => {
                void handleSubmit({ continueAfterSave: false })
              }}
            >
              {submitting
                ? mode === 'create'
                  ? '등록 중...'
                  : '저장 중...'
                : mode === 'create'
                  ? '조약 등록'
                  : '저장'}
            </FormS.ModalPrimarySubmitBtn>
          </FooterActions>
        </PersonRegisterModalStickyFooter>
      </RegisterModal>

      {mode === 'create' ? (
        <CountryPicker
          mode="single"
          isOpen={countryPickerOpen}
          onClose={() => setCountryPickerOpen(false)}
          title="서명 · 참여 당사국 추가"
          modernCountries={modernCountries as CountryResponseDto[]}
          historicalCountries={
            historicalCountries as HistoricalCountryResponseDto[]
          }
          onSelect={(picked) => {
            const matchedModern = !picked.isHistorical
              ? (modernCountries as CountryResponseDto[]).find(
                  (cand) => cand.id === picked.id,
                )
              : undefined
            addDraftParty({
              countryId: picked.isHistorical ? null : picked.id,
              historicalCountryId: picked.isHistorical ? picked.id : null,
              name: picked.name,
              flagEmoji: matchedModern?.flagEmoji ?? null,
              isHistorical: picked.isHistorical,
            })
            setCountryPickerOpen(false)
          }}
        />
      ) : null}
    </>
  )
}

// ─── 조약 상세용 사건 연결 모달 ─────────────────────────────────────────────

export const TreatyEventLinkModal: React.FC<{
  treatyId: string
  existingLinks?: Array<{ eventId: string; linkType: TreatyEventLinkType }>
  onClose: () => void
  onLinked: () => void
}> = ({ treatyId, existingLinks = [], onClose, onLinked }) => {
  const [linkType, setLinkType] = useState<TreatyEventLinkType>('SIGNING')
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 180)
  const [selectedEvent, setSelectedEvent] =
    useState<EventLinkCandidate | null>(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const { data: candidates = [], isFetching } = useQuery({
    queryKey: ['treaty-detail-event-candidates', debouncedQuery.trim()],
    queryFn: () =>
      getEventLinkCandidates({
        query: debouncedQuery.trim() || undefined,
        limit: 20,
      }),
    staleTime: 30_000,
  })

  const existingSet = useMemo(
    () =>
      new Set(existingLinks.map((item) => `${item.eventId}:${item.linkType}`)),
    [existingLinks],
  )

  const visibleCandidates = useMemo(
    () =>
      candidates.filter(
        (cand) => !existingSet.has(`${cand.id}:${linkType}`),
      ),
    [candidates, existingSet, linkType],
  )

  const missing = selectedEvent ? [] : ['연결할 사건']
  const canSubmit = !submitting && Boolean(selectedEvent)

  const handleSubmit = useCallback(async () => {
    if (!selectedEvent) return
    setSubmitting(true)
    try {
      await treatyApi.linkEvent(treatyId, {
        eventId: selectedEvent.id,
        linkType,
        note: note.trim() || null,
      })
      notify.success(
        `사건 「${selectedEvent.title}」을(를) ${EVENT_LINK_ROLE_SHORT[linkType]}으로 연결했습니다.`,
      )
      onLinked()
    } catch (err) {
      notify.error(
        getApiErrorMessage(err, '사건 연결 중 오류가 발생했습니다.'),
      )
    } finally {
      setSubmitting(false)
    }
  }, [selectedEvent, treatyId, linkType, note, onLinked])

  useModalSubmitShortcut({
    enabled: canSubmit,
    scrollContainerRef: scrollRef,
    onSubmit: () => {
      void handleSubmit()
    },
  })

  return (
    <RegisterModal
      isOpen
      onClose={onClose}
      closeOnEsc={!submitting}
      closeOnOverlayClick={!submitting}
      trapFocus={false}
      title="조약에 사건 연결"
      maxWidth="min(740px, 96vw)"
      minHeight="auto"
      fullBleedOnMobile
    >
      <PersonRegisterModalFormScroll ref={scrollRef}>
        <EventFormS.FormSection>
          <FormS.FormGroupSection>
            <FormS.FormGroupTitle>연결 자격 · 사건 선택</FormS.FormGroupTitle>

            <EventFormS.FormRow>
              <EventFormS.FormLabel htmlFor="treaty-link-event-role">
                연결 성격
              </EventFormS.FormLabel>
              <EventFormS.FormField>
                <FormSelectNative
                  id="treaty-link-event-role"
                  value={linkType}
                  onChange={(evt) =>
                    setLinkType(evt.target.value as TreatyEventLinkType)
                  }
                >
                  {(
                    Object.entries(TREATY_EVENT_LINK_LABELS) as [
                      TreatyEventLinkType,
                      string,
                    ][]
                  ).map(([roleKey, roleLabel]) => (
                    <option key={roleKey} value={roleKey}>
                      {roleLabel}
                    </option>
                  ))}
                </FormSelectNative>
                <EventFormS.Hint>
                  체결 사건을 연결하면 그 사건의 배경·여파·장소를 조약 상세에서 자동으로 참조하며, 파기·비준 사건을 연결하면 비어 있는 파기일·발효일도 자동 반영됩니다.
                </EventFormS.Hint>
              </EventFormS.FormField>
            </EventFormS.FormRow>

            <EventFormS.FormRow>
              <EventFormS.FormLabel as="div">
                사건 검색 <EventFormS.Required>*</EventFormS.Required>
              </EventFormS.FormLabel>
              <EventFormS.FormField>
                {selectedEvent ? (
                  <DraftEventCard $tone={linkType}>
                    <DraftPartyTopRow>
                      <DraftPartyIdentity>
                        <FiLink size={12} aria-hidden />
                        <EventYearBadge>
                          {formatCandidateYearLabel(selectedEvent)}
                        </EventYearBadge>
                        <DraftPartyName>{selectedEvent.title}</DraftPartyName>
                      </DraftPartyIdentity>
                      <SubtleClearBtn
                        type="button"
                        onClick={() => setSelectedEvent(null)}
                      >
                        다시 선택
                      </SubtleClearBtn>
                    </DraftPartyTopRow>
                  </DraftEventCard>
                ) : (
                  <>
                    <PartyQuickSearchBox>
                      <FiSearch size={13} aria-hidden />
                      <input
                        type="search"
                        autoFocus
                        value={query}
                        onChange={(evt) => setQuery(evt.target.value)}
                        placeholder="사건명으로 검색 (예: 베르사유, 바르바로사, 강화도)…"
                        aria-label="연결할 사건 검색"
                      />
                    </PartyQuickSearchBox>
                    <InlineEventCandidateList role="listbox">
                      {isFetching && visibleCandidates.length === 0 ? (
                        <QuickSuggestEmpty>
                          사건 목록을 불러오는 중…
                        </QuickSuggestEmpty>
                      ) : visibleCandidates.length > 0 ? (
                        visibleCandidates.slice(0, 10).map((cand) => (
                          <QuickSuggestItem
                            key={cand.id}
                            type="button"
                            onClick={() => setSelectedEvent(cand)}
                          >
                            <span className="name">{cand.title}</span>
                            <span className="meta">
                              {formatCandidateYearLabel(cand)}
                            </span>
                          </QuickSuggestItem>
                        ))
                      ) : (
                        <QuickSuggestEmpty>
                          검색 결과가 없습니다.
                        </QuickSuggestEmpty>
                      )}
                    </InlineEventCandidateList>
                  </>
                )}
              </EventFormS.FormField>
            </EventFormS.FormRow>

            <EventFormS.FormRow>
              <EventFormS.FormLabel htmlFor="treaty-link-event-note">
                연결 메모<FormS.OptionalTag>(선택)</FormS.OptionalTag>
              </EventFormS.FormLabel>
              <EventFormS.FormField>
                <EventFormS.Input
                  id="treaty-link-event-note"
                  value={note}
                  onChange={(evt) => setNote(evt.target.value)}
                  placeholder="예: 조약 제2조 위반으로 전쟁 발발 (선택)"
                />
              </EventFormS.FormField>
            </EventFormS.FormRow>
          </FormS.FormGroupSection>
        </EventFormS.FormSection>
      </PersonRegisterModalFormScroll>

      <PersonRegisterModalStickyFooter>
        <RegisterFooterStatus
          missing={missing}
          readyLabel="연결 준비 완료"
          shortcuts={[{ keys: '⌘↵', label: '연결' }]}
        />
        <FooterActions>
          <PersonRegisterModalCancelBtn
            type="button"
            onClick={onClose}
            disabled={submitting}
          >
            취소
          </PersonRegisterModalCancelBtn>
          <FormS.ModalPrimarySubmitBtn
            type="button"
            disabled={!canSubmit}
            onClick={() => {
              void handleSubmit()
            }}
          >
            {submitting ? '연결 중...' : '사건 연결'}
          </FormS.ModalPrimarySubmitBtn>
        </FooterActions>
      </PersonRegisterModalStickyFooter>
    </RegisterModal>
  )
}

// ─── 서명국 추가 · 수정 모달 (조약 상세용 · RegisterModal 통일) ────────────────

interface SignatoryTenureOption {
  id: string
  title?: string | null
  rankTitle?: string | null
  cabinetId?: string | null
  cabinetMemberships?: Array<{ cabinetId?: string | null }> | null
  startEra?: string | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  startDate?: string | null
  endEra?: string | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
  endDate?: string | null
  positionDefinition?: { id: string; title: string } | null
  administrationDepartment?: {
    id: string
    name: string
    abbreviation?: string | null
  } | null
  militaryUnit?: {
    id: string
    name: string
    abbreviation?: string | null
  } | null
}

function parseTargetDateKey(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const parts = parseIsoDateParts(dateStr)
  if (!parts) return null
  return parts.year * 10000 + parts.month * 100 + parts.day
}

function toTenureDateKey(
  eraVal: string | null | undefined,
  yearVal: number | null | undefined,
  monthVal: number | null | undefined,
  dayVal: number | null | undefined,
  isoVal: string | null | undefined,
  isEnd: boolean,
): number | null {
  if (yearVal != null && yearVal > 0) {
    const signedYear = eraVal === 'BC' ? -yearVal : yearVal
    const resolvedMonth = monthVal ?? (isEnd ? 12 : 1)
    const resolvedDay = dayVal ?? (isEnd ? 31 : 1)
    return signedYear * 10000 + resolvedMonth * 100 + resolvedDay
  }
  return parseTargetDateKey(isoVal)
}

function formatSignatoryTenureLabel(tenureItem: SignatoryTenureOption): string {
  const titleText =
    tenureItem.title ?? tenureItem.positionDefinition?.title ?? '보직'
  const instText =
    tenureItem.administrationDepartment?.abbreviation ??
    tenureItem.administrationDepartment?.name ??
    tenureItem.militaryUnit?.abbreviation ??
    tenureItem.militaryUnit?.name ??
    null
  const startLabel = tenureItem.startYear
    ? `${tenureItem.startEra === 'BC' ? 'BC ' : ''}${tenureItem.startYear}`
    : tenureItem.startDate
      ? tenureItem.startDate.slice(0, 4)
      : '?'
  const endLabel = tenureItem.endYear
    ? `${tenureItem.endEra === 'BC' ? 'BC ' : ''}${tenureItem.endYear}`
    : tenureItem.endDate
      ? tenureItem.endDate.slice(0, 4)
      : '현임'
  return [
    tenureItem.rankTitle ?? null,
    titleText,
    instText ? `(${instText})` : null,
    `· ${startLabel}~${endLabel}`,
  ]
    .filter(Boolean)
    .join(' ')
}

export const TreatySignatoryFormModal: React.FC<{
  mode: 'create' | 'edit'
  treatyId?: string
  signatory?: TreatySignatoryDto | null
  treatySignDate?: string | null
  onClose: () => void
  onSaved: () => void
}> = ({
  mode,
  treatyId,
  signatory = null,
  treatySignDate,
  onClose,
  onSaved,
}) => {
  const [countryId, setCountryId] = useState<string | null>(() =>
    mode === 'edit'
      ? (signatory?.countryId ?? signatory?.country?.id ?? null)
      : null,
  )
  const [historicalCountryId, setHistoricalCountryId] = useState<string | null>(
    () =>
      mode === 'edit'
        ? (signatory?.historicalCountryId ??
          signatory?.historicalCountry?.id ??
          null)
        : null,
  )
  const [countryLabel, setCountryLabel] = useState(() =>
    mode === 'edit'
      ? (signatory?.country?.name ?? signatory?.historicalCountry?.name ?? '')
      : '',
  )
  const [countryPickerOpen, setCountryPickerOpen] = useState(false)
  const [personId, setPersonId] = useState(() =>
    mode === 'edit' ? (signatory?.personId ?? '') : '',
  )
  const [personPickerOpen, setPersonPickerOpen] = useState(false)
  const [tenureChoice, setTenureChoice] = useState(() =>
    mode === 'edit'
      ? signatory?.tenureId ?? signatory?.tenure?.id
        ? (signatory?.tenureId ?? signatory?.tenure?.id ?? '')
        : '__AUTO__'
      : '__AUTO__',
  )
  const [cabinetId, setCabinetId] = useState(() =>
    mode === 'edit' ? (signatory?.cabinetId ?? '') : '',
  )
  const [role, setRole] = useState(() =>
    mode === 'edit' ? (signatory?.role ?? '') : '',
  )
  const [participationType, setParticipationType] =
    useState<TreatyParticipationType>(() =>
      mode === 'edit'
        ? (signatory?.participationType ?? 'SIGNATORY')
        : 'SIGNATORY',
    )
  const [signedAt, setSignedAt] = useState(() =>
    mode === 'edit' ? toTreatyDateIso(signatory?.signedAt) : '',
  )
  const [signedAtError, setSignedAtError] = useState<string | null>(null)
  const [note, setNote] = useState(() =>
    mode === 'edit' ? (signatory?.note ?? '') : '',
  )
  const [submitting, setSubmitting] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)

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
  const { data: persons = [] } = useQuery({
    queryKey: ['persons', 'all'],
    queryFn: getAllPersons,
    enabled: personPickerOpen || Boolean(personId),
    staleTime: 5 * 60_000,
  })
  const { data: rawTenures = [], isLoading: tenuresLoading } = useQuery({
    queryKey: ['person-tenures-for-signatory', personId],
    queryFn: () => personCareerApi.getTenuresByPersonId(personId),
    enabled: Boolean(personId),
    staleTime: 60_000,
  })
  const { data: cabinets = [] } = useQuery({
    queryKey: ['cabinets-for-signatory', countryId, historicalCountryId],
    queryFn: () =>
      personCareerApi.getCabinets({
        countryId: countryId ?? undefined,
        historicalCountryId: historicalCountryId ?? undefined,
      }),
    enabled: Boolean(countryId || historicalCountryId),
    staleTime: 60_000,
  })

  const selectedPerson = persons.find((item) => item.id === personId)
  const selectedPersonLabel = selectedPerson
    ? getPersonDisplayName({
        name: selectedPerson.name ?? '',
        surname: selectedPerson.surname,
        middleName: selectedPerson.middleName,
        nameDisplayOrder: selectedPerson.nameDisplayOrder,
        country: selectedPerson.country,
      })
    : ''

  const targetDateKey = parseTargetDateKey(signedAt || treatySignDate)
  const sortedTenures = useMemo(() => {
    const list = rawTenures as SignatoryTenureOption[]
    return [...list].sort((left, right) => {
      if (targetDateKey != null) {
        const leftStart = toTenureDateKey(
          left.startEra,
          left.startYear,
          left.startMonth,
          left.startDay,
          left.startDate,
          false,
        )
        const leftEnd =
          toTenureDateKey(
            left.endEra,
            left.endYear,
            left.endMonth,
            left.endDay,
            left.endDate,
            true,
          ) ?? Number.MAX_SAFE_INTEGER
        const rightStart = toTenureDateKey(
          right.startEra,
          right.startYear,
          right.startMonth,
          right.startDay,
          right.startDate,
          false,
        )
        const rightEnd =
          toTenureDateKey(
            right.endEra,
            right.endYear,
            right.endMonth,
            right.endDay,
            right.endDate,
            true,
          ) ?? Number.MAX_SAFE_INTEGER
        const leftOverlap =
          leftStart != null &&
          leftStart <= targetDateKey &&
          targetDateKey <= leftEnd
            ? 1
            : 0
        const rightOverlap =
          rightStart != null &&
          rightStart <= targetDateKey &&
          targetDateKey <= rightEnd
            ? 1
            : 0
        if (leftOverlap !== rightOverlap) return rightOverlap - leftOverlap
      }
      return (right.startYear ?? 0) - (left.startYear ?? 0)
    })
  }, [rawTenures, targetDateKey])

  const hasCountry = Boolean(countryId || historicalCountryId)
  const missing = hasCountry ? [] : ['당사국']
  const canSubmit = !submitting && hasCountry && !signedAtError

  const handleSubmit = useCallback(async () => {
    if (!hasCountry) {
      notify.error('현대 국가 또는 역사 국가를 선택하세요.')
      setCountryPickerOpen(true)
      return
    }
    if (signedAtError) {
      notify.error(signedAtError)
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        countryId,
        historicalCountryId,
        personId: personId || null,
        tenureId: !personId
          ? null
          : tenureChoice === '__AUTO__'
            ? undefined
            : tenureChoice === '__NONE__'
              ? null
              : tenureChoice,
        cabinetId: cabinetId || null,
        role: role.trim() || null,
        participationType,
        signedAt: signedAt || null,
        note: note.trim() || null,
      }
      if (mode === 'create' && treatyId) {
        await treatyApi.addSignatory({
          treatyId,
          ...payload,
        })
        notify.success('서명국이 추가되었습니다.')
      } else if (mode === 'edit' && signatory) {
        await treatyApi.updateSignatory(signatory.id, payload)
        notify.success('서명국 정보가 저장되었습니다.')
      }
      onSaved()
    } catch (err) {
      notify.error(
        getApiErrorMessage(err, '서명국 저장 중 오류가 발생했습니다.'),
      )
    } finally {
      setSubmitting(false)
    }
  }, [
    hasCountry,
    signedAtError,
    countryId,
    historicalCountryId,
    personId,
    tenureChoice,
    cabinetId,
    role,
    participationType,
    signedAt,
    note,
    mode,
    treatyId,
    signatory,
    onSaved,
  ])

  useModalSubmitShortcut({
    enabled: canSubmit,
    scrollContainerRef: scrollRef,
    onSubmit: () => {
      void handleSubmit()
    },
  })

  return (
    <>
      <RegisterModal
        isOpen
        onClose={onClose}
        closeOnEsc={!submitting}
        closeOnOverlayClick={!submitting}
        trapFocus={false}
        title={mode === 'create' ? '서명국 · 참여국 추가' : '서명국 · 참여국 수정'}
        maxWidth="min(780px, 96vw)"
        minHeight="auto"
        fullBleedOnMobile
      >
        <PersonRegisterModalFormScroll ref={scrollRef}>
          <EventFormS.FormSection>
            <FormS.FormGroupSection>
              <FormS.FormGroupTitle>당사국 · 대표 정보</FormS.FormGroupTitle>

              <EventFormS.FormRow>
                <EventFormS.FormLabel as="div">
                  당사국 <EventFormS.Required>*</EventFormS.Required>
                </EventFormS.FormLabel>
                <EventFormS.FormField>
                  <PickerInlineBar>
                    <OpenCountryPickerBtn
                      type="button"
                      onClick={() => setCountryPickerOpen(true)}
                    >
                      <FiGlobe size={14} aria-hidden />
                      {countryLabel || '현대·역사 국가 선택'}
                    </OpenCountryPickerBtn>
                    {hasCountry ? (
                      <SubtleClearBtn
                        type="button"
                        onClick={() => {
                          setCountryId(null)
                          setHistoricalCountryId(null)
                          setCountryLabel('')
                          setCabinetId('')
                        }}
                      >
                        선택 해제
                      </SubtleClearBtn>
                    ) : null}
                  </PickerInlineBar>
                </EventFormS.FormField>
              </EventFormS.FormRow>

              <EventFormS.FormRow>
                <EventFormS.FormLabel htmlFor="sig-participation-type">
                  참여 유형
                </EventFormS.FormLabel>
                <EventFormS.FormField>
                  <FormS.SubTitleGrid>
                    <FormS.SubTitleField htmlFor="sig-participation-type">
                      <FormS.SubTitleLabel>지위</FormS.SubTitleLabel>
                      <FormSelectNative
                        id="sig-participation-type"
                        value={participationType}
                        onChange={(evt) =>
                          setParticipationType(
                            evt.target.value as TreatyParticipationType,
                          )
                        }
                      >
                        {(
                          Object.entries(TREATY_PARTICIPATION_LABELS) as [
                            TreatyParticipationType,
                            string,
                          ][]
                        ).map(([roleKey, roleLabel]) => (
                          <option key={roleKey} value={roleKey}>
                            {roleLabel}
                          </option>
                        ))}
                      </FormSelectNative>
                    </FormS.SubTitleField>
                    <FormS.SubTitleField htmlFor="sig-role-input">
                      <FormS.SubTitleLabel>대표 직책 (선택)</FormS.SubTitleLabel>
                      <EventFormS.Input
                        id="sig-role-input"
                        value={role}
                        onChange={(evt) => setRole(evt.target.value)}
                        placeholder="예: 외무장관, 전권대사, 외무인민위원"
                      />
                    </FormS.SubTitleField>
                  </FormS.SubTitleGrid>
                </EventFormS.FormField>
              </EventFormS.FormRow>

              <EventFormS.FormRow>
                <EventFormS.FormLabel as="div">
                  서명 인물<FormS.OptionalTag>(선택)</FormS.OptionalTag>
                </EventFormS.FormLabel>
                <EventFormS.FormField>
                  <PickerInlineBar>
                    <OpenCountryPickerBtn
                      type="button"
                      onClick={() => setPersonPickerOpen(true)}
                    >
                      <FiUser size={14} aria-hidden />
                      {personId
                        ? selectedPersonLabel || '인물 불러오는 중…'
                        : '서명 대표 인물 선택'}
                    </OpenCountryPickerBtn>
                    {personId ? (
                      <SubtleClearBtn
                        type="button"
                        onClick={() => {
                          setPersonId('')
                          setTenureChoice('__AUTO__')
                        }}
                      >
                        선택 해제
                      </SubtleClearBtn>
                    ) : null}
                  </PickerInlineBar>

                  {personId ? (
                    tenuresLoading ? (
                      <EventFormS.Hint>
                        인물의 재임·보직 목록을 불러오는 중…
                      </EventFormS.Hint>
                    ) : sortedTenures.length > 0 ? (
                      <FormSelectNative
                        aria-label="체결 당시 재임·보직 정본"
                        value={tenureChoice}
                        onChange={(evt) => {
                          const nextVal = evt.target.value
                          setTenureChoice(nextVal)
                          const pickedTenure =
                            sortedTenures.find((cand) => cand.id === nextVal) ??
                            null
                          if (pickedTenure) {
                            const suggestedRole =
                              pickedTenure.title ??
                              pickedTenure.positionDefinition?.title ??
                              ''
                            if (!role && suggestedRole) setRole(suggestedRole)
                            const suggestedCabinet =
                              pickedTenure.cabinetId ??
                              pickedTenure.cabinetMemberships?.[0]?.cabinetId ??
                              ''
                            if (!cabinetId && suggestedCabinet) {
                              setCabinetId(suggestedCabinet)
                            }
                          }
                        }}
                      >
                        <option value="__AUTO__">
                          체결일 기준 재임·보직 자동 매칭 (권장)
                        </option>
                        <option value="__NONE__">보직 정본 연결 안 함</option>
                        {sortedTenures.map((tenureItem) => {
                          const startKey = toTenureDateKey(
                            tenureItem.startEra,
                            tenureItem.startYear,
                            tenureItem.startMonth,
                            tenureItem.startDay,
                            tenureItem.startDate,
                            false,
                          )
                          const endKey =
                            toTenureDateKey(
                              tenureItem.endEra,
                              tenureItem.endYear,
                              tenureItem.endMonth,
                              tenureItem.endDay,
                              tenureItem.endDate,
                              true,
                            ) ?? Number.MAX_SAFE_INTEGER
                          const isContemporary =
                            targetDateKey != null &&
                            startKey != null &&
                            startKey <= targetDateKey &&
                            targetDateKey <= endKey
                          return (
                            <option key={tenureItem.id} value={tenureItem.id}>
                              {isContemporary ? '[체결 당시 재임] ' : ''}
                              {formatSignatoryTenureLabel(tenureItem)}
                            </option>
                          )
                        })}
                      </FormSelectNative>
                    ) : (
                      <EventFormS.Hint>
                        등록된 재임·보직이 없습니다. 위 대표 직책 칸에 직접 입력할 수 있습니다.
                      </EventFormS.Hint>
                    )
                  ) : null}
                </EventFormS.FormField>
              </EventFormS.FormRow>

              <EventFormS.FormRow>
                <EventFormS.FormLabel htmlFor="sig-cabinet-select">
                  소속 행정부<FormS.OptionalTag>(선택)</FormS.OptionalTag>
                </EventFormS.FormLabel>
                <EventFormS.FormField>
                  {hasCountry ? (
                    <FormSelectNative
                      id="sig-cabinet-select"
                      value={cabinetId}
                      onChange={(evt) => setCabinetId(evt.target.value)}
                    >
                      <option value="">선택 안 함</option>
                      {cabinets.map((cabinet) => (
                        <option key={cabinet.id} value={cabinet.id}>
                          {formatCabinetListLabel(cabinet)}
                        </option>
                      ))}
                    </FormSelectNative>
                  ) : (
                    <EventFormS.Hint>
                      당사국을 먼저 선택하면 해당 국가의 행정부 목록이 표시됩니다.
                    </EventFormS.Hint>
                  )}
                </EventFormS.FormField>
              </EventFormS.FormRow>

              <EventFormS.FormRow>
                <EventFormS.FormLabel as="div">
                  개별 서명일<FormS.OptionalTag>(선택)</FormS.OptionalTag>
                </EventFormS.FormLabel>
                <EventFormS.FormField>
                  <TreatyDateField
                    ariaLabel="개별 서명일"
                    pickerTitle="개별 서명일 선택"
                    value={signedAt}
                    onChange={setSignedAt}
                    onErrorChange={setSignedAtError}
                  />
                  <EventFormS.Hint>
                    조약 공통 서명일과 다른 날짜에 서명·가입한 경우에만 입력합니다.
                  </EventFormS.Hint>
                </EventFormS.FormField>
              </EventFormS.FormRow>

              <EventFormS.FormRow>
                <EventFormS.FormLabel htmlFor="sig-note">
                  비고<FormS.OptionalTag>(선택)</FormS.OptionalTag>
                </EventFormS.FormLabel>
                <EventFormS.FormField>
                  <EventFormS.Textarea
                    id="sig-note"
                    value={note}
                    onChange={(evt) => setNote(evt.target.value)}
                    rows={3}
                    placeholder="예: 서명했으나 상원이 비준을 거부함, 영토 할양 당사국 등"
                  />
                </EventFormS.FormField>
              </EventFormS.FormRow>
            </FormS.FormGroupSection>
          </EventFormS.FormSection>
        </PersonRegisterModalFormScroll>

        <PersonRegisterModalStickyFooter>
          <RegisterFooterStatus
            missing={missing}
            onJumpToMissing={() => setCountryPickerOpen(true)}
            problem={signedAtError}
            readyLabel={mode === 'create' ? '추가 준비 완료' : '저장 준비 완료'}
            shortcuts={[{ keys: '⌘↵', label: '저장' }]}
          />
          <FooterActions>
            <PersonRegisterModalCancelBtn
              type="button"
              onClick={onClose}
              disabled={submitting}
            >
              취소
            </PersonRegisterModalCancelBtn>
            <FormS.ModalPrimarySubmitBtn
              type="button"
              disabled={!canSubmit}
              onClick={() => {
                void handleSubmit()
              }}
            >
              {submitting
                ? mode === 'create'
                  ? '추가 중...'
                  : '저장 중...'
                : mode === 'create'
                  ? '당사국 추가'
                  : '저장'}
            </FormS.ModalPrimarySubmitBtn>
          </FooterActions>
        </PersonRegisterModalStickyFooter>
      </RegisterModal>

      <CountryPicker
        mode="single"
        isOpen={countryPickerOpen}
        onClose={() => setCountryPickerOpen(false)}
        title="서명국 · 참여국 선택"
        modernCountries={modernCountries as CountryResponseDto[]}
        historicalCountries={
          historicalCountries as HistoricalCountryResponseDto[]
        }
        onSelect={(picked) => {
          setCountryId(picked.isHistorical ? null : picked.id)
          setHistoricalCountryId(picked.isHistorical ? picked.id : null)
          setCountryLabel(picked.name)
          setCabinetId('')
          setCountryPickerOpen(false)
        }}
      />

      {personPickerOpen ? (
        <PersonSelectModal
          persons={persons}
          selectedPersonId={personId}
          onSelect={(nextId) => {
            setPersonId(nextId)
            setTenureChoice('__AUTO__')
            setPersonPickerOpen(false)
          }}
          onClose={() => setPersonPickerOpen(false)}
          title="서명 대표 인물 선택"
          searchPlaceholder="이름 또는 생몰년도로 검색..."
        />
      ) : null}
    </>
  )
}

// ─── 조항 추가 모달 (조약 상세용 · RegisterModal 통일) ───────────────────────

export const TreatyTermFormModal: React.FC<{
  treatyId: string
  nextOrder: number
  onClose: () => void
  onAdded: () => void
}> = ({ treatyId, nextOrder, onClose, onAdded }) => {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isSecret, setIsSecret] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLTextAreaElement | null>(null)

  const missing = content.trim() ? [] : ['조항 내용']
  const canSubmit = !submitting && missing.length === 0

  const handleSubmit = useCallback(async () => {
    if (!content.trim()) {
      notify.error('조항 내용을 입력하세요.')
      contentRef.current?.focus()
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
    } catch (err) {
      notify.error(
        getApiErrorMessage(err, '조항 추가 중 오류가 발생했습니다.'),
      )
    } finally {
      setSubmitting(false)
    }
  }, [content, treatyId, nextOrder, title, isSecret, onAdded])

  useModalSubmitShortcut({
    enabled: canSubmit,
    scrollContainerRef: scrollRef,
    onSubmit: () => {
      void handleSubmit()
    },
  })

  return (
    <RegisterModal
      isOpen
      onClose={onClose}
      closeOnEsc={!submitting}
      closeOnOverlayClick={!submitting}
      trapFocus={false}
      title="조약 조항 추가"
      maxWidth="min(720px, 96vw)"
      minHeight="auto"
      fullBleedOnMobile
    >
      <PersonRegisterModalFormScroll ref={scrollRef}>
        <EventFormS.FormSection>
          <FormS.FormGroupSection>
            <FormS.FormGroupTitle>조항 정보</FormS.FormGroupTitle>

            <EventFormS.FormRow>
              <EventFormS.FormLabel htmlFor="treaty-term-title">
                조항 표제<FormS.OptionalTag>(선택)</FormS.OptionalTag>
              </EventFormS.FormLabel>
              <EventFormS.FormField>
                <EventFormS.Input
                  id="treaty-term-title"
                  value={title}
                  onChange={(evt) => setTitle(evt.target.value)}
                  placeholder="예: 제1조 — 상호 불가침 (조약문의 실제 번호 그대로)"
                />
              </EventFormS.FormField>
            </EventFormS.FormRow>

            <EventFormS.FormRow>
              <EventFormS.FormLabel htmlFor="treaty-term-content">
                조항 본문 <EventFormS.Required>*</EventFormS.Required>
              </EventFormS.FormLabel>
              <EventFormS.FormField>
                <EventFormS.Textarea
                  ref={contentRef}
                  id="treaty-term-content"
                  value={content}
                  onChange={(evt) => setContent(evt.target.value)}
                  rows={6}
                  placeholder="조항 원문 또는 핵심 규율 내용을 입력합니다"
                />
              </EventFormS.FormField>
            </EventFormS.FormRow>

            <EventFormS.FormRow>
              <EventFormS.FormLabel as="div">
                비밀 여부<FormS.OptionalTag>(선택)</FormS.OptionalTag>
              </EventFormS.FormLabel>
              <EventFormS.FormField>
                <SecretToggleBtn
                  type="button"
                  $active={isSecret}
                  aria-pressed={isSecret}
                  onClick={() => setIsSecret((prev) => !prev)}
                >
                  <FiLock size={13} aria-hidden />
                  <span>비밀 조항 (비밀 부속 의정서·밀약 등)</span>
                </SecretToggleBtn>
              </EventFormS.FormField>
            </EventFormS.FormRow>
          </FormS.FormGroupSection>
        </EventFormS.FormSection>
      </PersonRegisterModalFormScroll>

      <PersonRegisterModalStickyFooter>
        <RegisterFooterStatus
          missing={missing}
          onJumpToMissing={() => contentRef.current?.focus()}
          readyLabel="추가 준비 완료"
          shortcuts={[{ keys: '⌘↵', label: '추가' }]}
        />
        <FooterActions>
          <PersonRegisterModalCancelBtn
            type="button"
            onClick={onClose}
            disabled={submitting}
          >
            취소
          </PersonRegisterModalCancelBtn>
          <FormS.ModalPrimarySubmitBtn
            type="button"
            disabled={!canSubmit}
            onClick={() => {
              void handleSubmit()
            }}
          >
            {submitting ? '추가 중...' : '조항 추가'}
          </FormS.ModalPrimarySubmitBtn>
        </FooterActions>
      </PersonRegisterModalStickyFooter>
    </RegisterModal>
  )
}

// ─── Styled ────────────────────────────────────────────────────────────────

const TreatyHalfSplitGrid = styled(FormS.SplitColumnsGrid)`
  @media (min-width: ${FormS.SPLIT_MIN_WIDTH}px) {
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  }
`

const ViolationReasonWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
`

const DraftPartyList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const DraftPartyCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 11px 13px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.025)' : '#ffffff'};
`

const DraftEventCard = styled.div<{ $tone: TreatyEventLinkType }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-left: 3px solid
    ${({ $tone, theme }) =>
      $tone === 'VIOLATION'
        ? '#dc2626'
        : $tone === 'RATIFICATION'
          ? '#059669'
          : $tone === 'SIGNING'
            ? theme.colors.primary
            : '#64748b'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.025)' : '#ffffff'};
`

const EventYearBadge = styled.span`
  padding: 1px 6px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.06)'
      : 'rgba(15, 23, 42, 0.05)'};
`

const EventRolePreSelect = styled.select`
  height: 38px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc'};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const InlineEventCandidateList = styled.div`
  max-height: 220px;
  overflow-y: auto;
  padding: 4px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#fafbfc'};
`

const LegacyNarrativeBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
`

const LegacyFieldsStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: 10px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
`

const DraftPartyTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
`

const DraftPartyIdentity = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const DraftPartyIndex = styled.span`
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const DraftPartyFlag = styled.span`
  font-size: 15px;
  line-height: 1;
`

const DraftPartyName = styled.span`
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const DraftPartyKindTag = styled.span<{ $historical: boolean }>`
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ $historical, theme }) =>
    $historical
      ? theme.mode === 'dark'
        ? '#fcd34d'
        : '#b45309'
      : theme.colors.text.tertiary};
  background: ${({ $historical, theme }) =>
    $historical
      ? theme.mode === 'dark'
        ? 'rgba(245, 158, 11, 0.16)'
        : 'rgba(245, 158, 11, 0.1)'
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(15, 23, 42, 0.04)'};
`

const DraftPartyRightControls = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const PartyParticipationSelect = styled.select`
  height: 30px;
  padding: 0 9px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc'};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const DraftPartyRemoveBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.error};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2'};
  }
`

const DraftPartyMetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const PartySubSelect = styled.select`
  flex: 1 1 200px;
  min-width: 160px;
  height: 34px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 12px;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const PartyRoleNoteInput = styled.input`
  flex: 1.4 1 220px;
  min-width: 180px;
  height: 34px;
  padding: 0 11px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 12.5px;
  outline: none;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const PartyQuickAddRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const PartyQuickSearchAnchor = styled.div`
  position: relative;
  flex: 1 1 240px;
  min-width: 200px;
`

const PartyQuickSearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.tertiary};
  transition: border-color 0.15s ease;

  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary};
  }

  input {
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    font: inherit;
    font-size: 13px;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const QuickSuggestMenu = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 30;
  max-height: 240px;
  overflow-y: auto;
  padding: 4px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#18181b' : '#ffffff'};
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.16);
`

const QuickSuggestItem = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 7px;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;

  .name {
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .meta {
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const QuickSuggestEmpty = styled.div`
  padding: 10px 12px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const OpenCountryPickerBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: border-color 0.14s ease, color 0.14s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const PickerInlineBar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
`

const SubtleClearBtn = styled.button`
  padding: 4px 6px;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;

  &:hover {
    color: ${({ theme }) => theme.colors.error};
  }
`

const SecretToggleBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  width: fit-content;
  height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(220, 38, 38, 0.45)'
          : 'rgba(220, 38, 38, 0.35)'
        : theme.colors.border.default};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(220, 38, 38, 0.16)'
        : 'rgba(220, 38, 38, 0.08)'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#fca5a5'
        : '#b91c1c'
      : theme.colors.text.secondary};
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.14s ease;
`
