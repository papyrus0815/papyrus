/**
 * 수반(재임) 등록/수정 — 우측 사이드 패널.
 * 역대 수반 섹션과 동일: 국가/직책은 트리거 버튼 → 모달 선택.
 */
import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiChevronDown, FiLink, FiUser } from 'react-icons/fi'
import { CabinetEventAttachModal } from '@/widgets/country/country-detail/ui/cabinet-event-attach-modal'
import styled from 'styled-components'

import * as S from '@/shared/ui/form-styles'

import { useCountries } from '@/features/country/api'
import { useHistoricalCountriesByModernCountry } from '@/features/country/api'
import { useHistoricalCountries } from '@/features/historical-country/use-historical-countries.hook'
import {
  personCareerApi,
  type CreateGovernmentPositionTenureDto,
} from '@/shared/api/person-career'
import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import { getPersonDetailById } from '@/shared/api/persons-detail'
import { parseIsoDateParts } from '@/shared/lib/iso-date'
import { getUploadImageUrl } from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { FormSidePanel } from '@/shared/ui/form-side-panel/form-side-panel'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog/confirm-dialog'
import { notify } from '@/shared/ui/toast'
import { DateRangeField } from '@/shared/ui/form-fields/date-range-field'
import { CountrySearchModal } from '@/shared/ui/country-search-modal/country-search-modal'
import { SelectModal, type SelectOption } from '@/shared/ui/select-modal/select-modal'
import { FormSelectNative } from '@/shared/ui/form-select-native/form-select-native'
import {
  APPOINTMENT_METHOD_OPTIONS,
  TENURE_END_REASON_OPTIONS,
} from '@/shared/lib/tenure-labels'
import {
  FormRows,
  FieldRow,
  FieldLabel,
  FieldControl,
  FieldHint,
  DateFieldsRow,
  Required,
  Input,
  Textarea,
} from '@/shared/ui/register-form-layout'

/** 폼 필드: 세로 배치, 넉넉한 여백 */
const SidebarFormWrap = styled.div`
  width: 100%;
  min-width: 0;

  ${FieldRow} {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px 0;
    align-items: stretch;
    border: none;
    border-bottom: none;
  }
  ${FieldLabel} {
    padding-top: 0;
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
    letter-spacing: -0.01em;
  }
  ${FieldControl} {
    max-width: none;
    width: 100%;
  }
  ${DateFieldsRow} {
    max-width: none;
  }
`

/** 선택 버튼 — 깔끔한 호버/포커스 */
const SelectTriggerButton = styled.button<{ $hasValue?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  padding: 13px 16px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fafafa'};
  color: ${({ $hasValue, theme }) =>
    $hasValue ? theme.colors.text.primary : theme.colors.text.tertiary};
  font-size: 14px;
  line-height: 1.45;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;

  span {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.tertiary};
    transition: color 0.2s, transform 0.2s;
  }
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f4f4f5'};
    border-color: ${({ theme }) => theme.colors.border.medium};
    svg {
      color: ${({ theme }) => theme.colors.text.secondary};
      transform: translateY(1px);
    }
  }
  &:focus {
    background: ${({ theme }) => theme.colors.background.primary};
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px
      ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(99, 106, 242, 0.22)'
          : 'rgba(99, 102, 241, 0.12)'};
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

/** 각료 등록 플로우에서 선택 가능한 직위 타입 (수반·의원·군인 등 제외) */
const MINISTER_POSITION_TYPES = new Set([
  'DEPUTY_HEAD_OF_STATE',
  'CABINET_MINISTER',
  'VICE_MINISTER',
  'OTHER',
])

/**
 * 레거시 notes 인코딩("왕명: X") 분리 — 역대 수반·계보·행정부 위젯이 이 줄을
 * 정규식으로 파싱해 왕명을 표시하므로(cabinets-section.helpers 등), 비고 자유 편집으로
 * 깨지지 않게 읽기 전용으로 떼어내고 저장 시 재결합한다.
 */
const LEGACY_REGNAL_NOTE_RE = /^[ \t]*왕명[ \t]*:[ \t]*\S.*$/m

function splitLegacyRegnalNote(raw: string): { regnalLine: string; rest: string } {
  const m = raw.match(LEGACY_REGNAL_NOTE_RE)
  if (!m || m.index == null) return { regnalLine: '', rest: raw }
  const rest = (raw.slice(0, m.index) + raw.slice(m.index + m[0].length))
    .replace(/\n{2,}/g, '\n')
    .replace(/^\n+|\n+$/g, '')
  return { regnalLine: m[0].trim(), rest }
}

/** 필수 항목 안내 래퍼 — 깔끔한 톤 */
const RequiredNoticeWrap = styled.div`
  margin: 0 26px 0;
  padding: 12px 18px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border-radius: 12px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};

  .required-title {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
    margin-right: 6px;
  }
  .required-list {
    font-weight: 500;
  }
  .required-item {
    transition: color 0.2s, opacity 0.2s;
  }
  .required-item.completed {
    color: ${({ theme }) => theme.colors.success};
    text-decoration: line-through;
    opacity: 0.85;
  }
`

/** 인물 바 — 미니멀 카드 */
const PersonInfoBar = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 28px;
  padding: 16px 20px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? theme.colors.background.secondary
      : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'};
  border-radius: 14px;
  font-size: 15px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 500;
`
const PersonThumbnail = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 14px;
  flex-shrink: 0;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.background.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  box-shadow: 0 1px 2px ${({ theme }) => theme.colors.shadow.sm};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const PersonPrimaryLabel = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 400;
`

const EventAttachButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 106, 242, 0.16)' : '#eff6ff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 106, 242, 0.4)' : '#bfdbfe'};
  border-radius: 6px;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
`

/** 직책 "직접 입력" — 선택 트리거에 시각적으로 종속되는 중첩 그룹 */
const ManualEntryGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 10px;
  padding: 12px 14px;
  border-left: 2px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  border-radius: 0 10px 10px 0;
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

const CheckboxLabelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
  input[type='checkbox'] {
    width: 20px;
    height: 20px;
    accent-color: #6366f1;
    cursor: pointer;
  }
  label {
    font-size: 14px;
    color: ${({ theme }) => theme.colors.text.primary};
    cursor: pointer;
    font-weight: 500;
  }
`

const FormActions = styled.div`
  display: flex;
  align-items: center;
  margin-top: 28px;
  padding: 0;
`

const DeleteButton = styled.button`
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.error};
  background: transparent;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;

  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 69, 58, 0.16)'
        : 'rgba(239, 68, 68, 0.08)'};
    color: ${({ theme }) => theme.colors.error};
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
}: TenureRegisterPanelProps) {
  const queryClient = useQueryClient()
  const isEdit = !!tenureId

  const [countryId, setCountryId] = useState('')
  const [historicalCountryId, setHistoricalCountryId] = useState<string | null>(null)
  const [positionDefinitionId, setPositionDefinitionId] = useState<string | null>(null)
  /** 내장 직책(부통령 등) 선택 시 positionType 강제 지정용. 정의·기타 선택 시 null */
  const [presetPositionType, setPresetPositionType] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  /** 대수(termNumber, 일반 재임) 또는 재위번호(regnalNumber, 군주 재위) — recordKind에 따라 한쪽에만 기록 */
  const [ordinalNumber, setOrdinalNumber] = useState('')
  const [subTermNumber, setSubTermNumber] = useState('')
  /** 왕조 내 서수 — 재위(SOVEREIGN_REIGN) 수정 시에만 의미, "부르봉 왕조 N대" */
  const [dynastyOrdinal, setDynastyOrdinal] = useState('')
  const [appointmentMethod, setAppointmentMethod] = useState('')
  const [endReason, setEndReason] = useState('')
  const [endReasonDetail, setEndReasonDetail] = useState('')
  const [notes, setNotes] = useState('')
  /** 레거시 notes의 "왕명: X" 줄 — 읽기 전용으로 분리 표시, 저장 시 비고와 재결합 */
  const [legacyRegnalNote, setLegacyRegnalNote] = useState('')
  const [showOnEvents, setShowOnEvents] = useState(true)
  const [cabinetId, setCabinetId] = useState<string | null>(null)
  const [eventAttachModalOpen, setEventAttachModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [countryModalOpen, setCountryModalOpen] = useState(false)
  const [historicalCountryModalOpen, setHistoricalCountryModalOpen] = useState(false)
  const [positionModalOpen, setPositionModalOpen] = useState(false)
  const [cabinetModalOpen, setCabinetModalOpen] = useState(false)
  const [personImageError, setPersonImageError] = useState(false)

  const { data: countries = [] } = useCountries()
  // isSuccess 가드 — isFetched는 fetch가 에러로 끝나도 true가 돼 기본값 []로
  // belongs 검사가 돌아 역사국가 연결이 잘못 해제된다. 성공 응답일 때만 검사.
  const { data: historicalCountries = [], isSuccess: historicalCountriesLoaded } =
    useHistoricalCountriesByModernCountry(open ? countryId : '')
  // 현대 국가를 선택하지 않아도 역사적 국가를 직접 고를 수 있도록 전체 목록도 확보한다.
  // 교황령·신성로마제국처럼 특정 현대 국가에 매이지 않는 정치체(교황·황제 등)를
  // "이탈리아를 먼저 골라야 교황령이 뜨는" 우회 없이 등록하기 위함.
  const { data: allHistoricalCountries = [] } = useHistoricalCountries()
  // 현대 국가를 골랐으면 그 소속 역사 국가로 좁히고, 안 골랐으면 전체 역사 국가에서 직접 선택.
  const historicalCountryOptions: Array<{ id: string; name: string; flagEmoji: string | null }> = (
    (countryId ? historicalCountries : allHistoricalCountries) as Array<{
      id: string
      name?: string | null
    }>
  ).map((historical) => ({
    id: historical.id,
    name: historical.name ?? historical.id,
    flagEmoji: null,
  }))
  const { data: positionDefinitions = [] } = useQuery({
    queryKey: ['position-definitions-tenure', countryId, historicalCountryId],
    queryFn: () =>
      personCareerApi.getPositionDefinitions({
        countryId: countryId || undefined,
        historicalCountryId: historicalCountryId || undefined,
      }),
    enabled: open,
  })

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
      const posTitle = head?.positionDefinition?.title ?? head?.title ?? c.name ?? '행정부'
      // 연도는 문자열에서 직접 추출(TZ 안전) — getFullYear()는 UTC 서쪽 타임존에서 1월 1일 시작 임기를 전년도로 보여준다
      const start = head?.startDate ? parseIsoDateParts(head.startDate)?.year ?? '' : ''
      const end = head?.endDate ? parseIsoDateParts(head.endDate)?.year ?? '' : '현재'
      const range = start && end ? ` (${start}~${end})` : ''
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

  const editingIsSovereign = (editingTenure as any)?.recordKind === 'SOVEREIGN_REIGN'

  const selectedDef = positionDefinitionId
    ? (positionDefinitions as any[]).find((d: any) => d.id === positionDefinitionId)
    : null
  const positionType =
    selectedDef?.positionType ?? presetPositionType ?? editingTenure?.positionType ?? 'OTHER'

  /** 수반 계열 직책 — 자신이 행정부의 수장이므로 소속 행정부(cabinetId) 동시 지정 시 백엔드가 400으로 거부 */
  const isHeadPositionType =
    positionType === 'HEAD_OF_STATE' || positionType === 'HEAD_OF_GOVERNMENT'

  /** 각료 추가로 열렸을 때는 각료/차관/기타만 표시 (수반·의원·군인 등 제외) */
  const isMinisterFlowForFilter = !tenureId && initialCabinetId != null
  const positionTitleOptions: SelectOption<string>[] = useMemo(() => {
    let defs = positionDefinitions as any[]
    if (isMinisterFlowForFilter) {
      defs = defs.filter(
        (d: any) => d.positionType && MINISTER_POSITION_TYPES.has(d.positionType),
      )
    }
    const byDef = defs.map((d: any) => ({
      value: d.id,
      label: d.title ?? d.name ?? d.id ?? '직책',
    }))
    // 이미 같은 positionType의 정의가 있으면 내장 항목은 중복 노출하지 않음
    const definedTypes = new Set(defs.map((d: any) => d.positionType))
    const builtins = BUILTIN_POSITIONS.filter(
      (b) => !definedTypes.has(b.positionType),
    ).map((b) => ({ value: b.value, label: b.label }))
    return [...byDef, ...builtins, { value: OTHER_POSITION_VALUE, label: '기타 (직접 입력)' }]
  }, [positionDefinitions, isMinisterFlowForFilter])

  const positionTitleLabel =
    positionDefinitionId == null
      ? presetPositionType
        ? title.trim() || '직책 선택'
        : title.trim()
          ? `기타: ${title}`
          : '직책 선택'
      : (selectedDef?.title ?? selectedDef?.name ?? (title || '직책 선택'))

  const handlePositionSelect = (value: string) => {
    setPositionModalOpen(false)
    const builtin = BUILTIN_POSITIONS.find((b) => b.value === value)
    if (builtin) {
      setPositionDefinitionId(null)
      setTitle(builtin.title)
      setTitleEn(builtin.titleEn)
      setPresetPositionType(builtin.positionType)
      return
    }
    if (value === OTHER_POSITION_VALUE) {
      setPositionDefinitionId(null)
      setTitle('')
      setTitleEn('')
      setPresetPositionType(null)
    } else {
      const def = (positionDefinitions as any[]).find((d: any) => d.id === value)
      if (def) {
        setPositionDefinitionId(def.id)
        setTitle(def.title ?? def.name ?? '')
        setTitleEn(def.titleEn ?? def.title_en ?? '')
        setPresetPositionType(null)
      }
    }
  }

  const resetForm = () => {
    setCountryId('')
    setHistoricalCountryId(null)
    setPositionDefinitionId(null)
    setPresetPositionType(null)
    setTitle('')
    setTitleEn('')
    setStartDate('')
    setEndDate('')
    setOrdinalNumber('')
    setSubTermNumber('')
    setDynastyOrdinal('')
    setAppointmentMethod('')
    setEndReason('')
    setEndReasonDetail('')
    setNotes('')
    setLegacyRegnalNote('')
    setShowOnEvents(true)
    setCabinetId(null)
  }

  useEffect(() => {
    if (!open) {
      resetForm()
      setPersonImageError(false)
      setDeleteConfirmOpen(false)
    }
  }, [open])

  /** 행정부 탭 등에서 열 때 국가·행정부 미리 채우기 */
  useEffect(() => {
    if (open && (initialCountryId != null || initialHistoricalCountryId != null || initialCabinetId != null)) {
      if (initialCountryId != null) setCountryId(initialCountryId)
      if (initialHistoricalCountryId !== undefined) setHistoricalCountryId(initialHistoricalCountryId ?? null)
      if (initialCabinetId !== undefined) setCabinetId(initialCabinetId ?? null)
    }
  }, [open, initialCountryId, initialHistoricalCountryId, initialCabinetId])

  useEffect(() => {
    setPersonImageError(false)
  }, [personDetail?.id])

  /**
   * 국가 재선택 시 역사적 국가를 무조건 비우지 않고, 새 국가 소속이 아닐 때만 해제.
   * (역사국가 전용 행을 수정하다 현대 국가를 골랐을 때 historicalCountryId가
   * 조용히 NULL로 덮여 연결이 파괴되던 문제 방지)
   */
  useEffect(() => {
    if (!open || !countryId || !historicalCountryId) return
    // 성공적으로 받아온 목록일 때만 해제 — 조회 에러 시(데이터 기본값 [])
    // belongs=false로 오판해 연결을 조용히 파괴하면 안 됨
    if (!historicalCountriesLoaded) return
    const belongs = (historicalCountries as any[]).some(
      (h: any) => h.id === historicalCountryId,
    )
    if (!belongs) setHistoricalCountryId(null)
  }, [open, countryId, historicalCountryId, historicalCountriesLoaded, historicalCountries])

  /** 수반 직책 선택 시 소속 행정부 지정 불가(백엔드 400) — 선택돼 있던 행정부는 자동 해제 */
  useEffect(() => {
    if (isHeadPositionType && cabinetId) setCabinetId(null)
  }, [isHeadPositionType, cabinetId])

  useEffect(() => {
    if (!open || !editingTenure) return
    const t = editingTenure as any
    setCountryId(t.countryId ?? t.country?.id ?? '')
    setHistoricalCountryId(t.historicalCountryId ?? t.historicalCountry?.id ?? null)
    const hydratedDefId = t.positionDefinitionId ?? t.positionDefinition?.id ?? null
    setPositionDefinitionId(hydratedDefId)
    // 정의 없이 내장 직책(부통령 등) 타입으로 저장된 재임이면 preset 복원 → 라벨·선택 표시 유지
    const builtinForType = BUILTIN_POSITIONS.find((b) => b.positionType === t.positionType)
    setPresetPositionType(!hydratedDefId && builtinForType ? builtinForType.positionType : null)
    setTitle(t.title ?? t.positionDefinition?.title ?? '')
    setTitleEn(t.titleEn ?? '')
    setStartDate(t.startDate ? (typeof t.startDate === 'string' ? t.startDate.split('T')[0] : '') : '')
    setEndDate(t.endDate ? (typeof t.endDate === 'string' ? t.endDate.split('T')[0] : '') : '')
    // 대수/재위번호 분리: 재위(SOVEREIGN_REIGN)는 regnalNumber, 일반 재임은 termNumber만 사용
    // (교차 폴백 금지 — 저장 시 반대편 필드로 값이 옮겨가는 오염 방지)
    const num = t.recordKind === 'SOVEREIGN_REIGN' ? t.regnalNumber : t.termNumber
    setOrdinalNumber(num != null ? String(num) : '')
    setSubTermNumber(t.subTermNumber != null ? String(t.subTermNumber) : '')
    setDynastyOrdinal(t.dynastyOrdinal != null ? String(t.dynastyOrdinal) : '')
    setAppointmentMethod(t.appointmentMethod ?? '')
    setEndReason(t.endReason ?? '')
    setEndReasonDetail(t.endReasonDetail ?? '')
    // 레거시 "왕명: X" 줄은 비고에서 분리(읽기 전용) — 실수로 지워 위젯 왕명 표시가 깨지는 것 방지
    const { regnalLine, rest } = splitLegacyRegnalNote(t.notes ?? '')
    setLegacyRegnalNote(regnalLine)
    setNotes(rest)
    setShowOnEvents(t.showPositionInfo !== false)
    setCabinetId(t.cabinetId ?? t.cabinet?.id ?? null)
  }, [open, editingTenure])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!personId) return
    // 역사국가 전용 행(countryId NULL)도 수정 가능해야 함 — 둘 중 하나만 있으면 통과
    if (!countryId && !historicalCountryId) {
      notify.error('국가를 선택해 주세요.')
      return
    }
    const def = selectedDef as any
    const titleValue = def?.title ?? title.trim()
    if (!titleValue) {
      notify.error('직책을 선택하거나 직접 입력해 주세요.')
      return
    }
    if (!startDate.trim()) {
      notify.error('취임일을 입력해 주세요.')
      return
    }
    // 기간 역전 차단 — YYYY-MM-DD 문자열 사전순 비교로 충분 (BC는 피커에서 차단됨)
    if (endDate && endDate < startDate) {
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
    // 레거시 "왕명: X" 줄은 저장 시 비고 앞에 재결합 — 위젯들의 왕명 파싱 보존
    const combinedNotes = [legacyRegnalNote, notes.trim()].filter(Boolean).join('\n')
    const payload = {
      positionType: (positionType as any) ?? 'OTHER',
      positionDefinitionId: positionDefinitionId || undefined,
      title: titleValue,
      titleEn: titleEn.trim() || undefined,
      countryId: historicalCountryId ? undefined : (countryId || undefined),
      historicalCountryId: historicalCountryId || undefined,
      startDate,
      endDate: endDate || emptyAs,
      // 일반 재임은 termNumber(공식 통산 대수)만 기록 — regnalNumber(군주 재위번호)에 이중 기록하지 않음
      termNumber: parsedOrdinal,
      subTermNumber: parsedSubTerm,
      appointmentMethod: (appointmentMethod || emptyAs) as any,
      endReason: (endReason || emptyAs) as any,
      endReasonDetail: endReasonDetail.trim() || emptyAs,
      notes: combinedNotes || emptyAs,
      showPositionInfo: showOnEvents,
      cabinetId: cabinetId || emptyAs,
    }
    setSubmitting(true)
    try {
      if (isEdit && tenureId) {
        if (editingIsSovereign) {
          await personCareerApi.updateSovereignReign(tenureId, {
            personId,
            countryId: historicalCountryId ? undefined : countryId || undefined,
            historicalCountryId: historicalCountryId || undefined,
            positionDefinitionId: positionDefinitionId || undefined,
            startDate,
            endDate: endDate || null,
            // 재위(SOVEREIGN_REIGN)는 regnalNumber(재위번호)만 기록 — termNumber(통산 대수)는 보내지 않음
            regnalNumber: parsedOrdinal ?? null,
            subTermNumber: parsedSubTerm ?? null,
            dynastyOrdinal: parsedDynastyOrdinal ?? null,
            appointmentMethod: (appointmentMethod || null) as any,
            endReason: (endReason || null) as any,
            endReasonDetail: endReasonDetail.trim() || null,
            notes: combinedNotes || null,
            showPositionInfo: showOnEvents,
          })
          notify.success('재위 기록이 수정되었습니다.')
        } else {
          await personCareerApi.updateGovernmentPositionTenure(tenureId, payload)
          notify.success('재임 기록이 수정되었습니다.')
        }
      } else {
        await personCareerApi.addGovernmentPositionTenure({
          ...payload,
          personId,
          // 생성 모드에서는 emptyAs === undefined 라 null이 실제로 들어가지 않음
        } as CreateGovernmentPositionTenureDto)
        notify.success('재임 기록이 추가되었습니다.')
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
      if (editingIsSovereign) {
        await personCareerApi.deleteSovereignReign(tenureId)
        notify.success('재위 기록이 삭제되었습니다.')
      } else {
        await personCareerApi.deleteGovernmentPositionTenure(tenureId)
        notify.success('재임 기록이 삭제되었습니다.')
      }
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
    // 역사국가 전용 행(countryId NULL) 수정 잠금 방지 — 둘 중 하나만 있으면 됨
    (!countryId && !historicalCountryId) ||
    (!(selectedDef as any)?.title && !title.trim()) ||
    !startDate.trim()

  const hasCountry = !!countryId || !!historicalCountryId
  const hasPosition = !!(selectedDef as any)?.title || !!title.trim()
  const hasStartDate = !!startDate.trim()

  /** 행정부 탭에서 "각료 추가"로 열렸을 때 → 각료 등록 문구 사용 (수반 아님) */
  const isMinisterFlow = !isEdit && initialCabinetId != null
  const panelTitle = isEdit
    ? isMinisterFlow
      ? '각료 수정'
      : '재임 수정'
    : isMinisterFlow
      ? '각료 등록'
      : '재임 등록'
  const submitLabelText = isEdit
    ? '수정 완료'
    : isMinisterFlow
      ? '각료 등록'
      : '재임 등록'

  return (
    <FormSidePanel
      isOpen={open}
      title={panelTitle}
      onClose={onClose}
      panelWidth={640}
      submitLabel={submitting ? '처리 중…' : submitLabelText}
      formId={FORM_ID}
      submitDisabled={submitDisabled}
      headerExtra={
        <RequiredNoticeWrap>
          <span className="required-title">필수 항목:</span>
          <span className="required-list">
            <span className={`required-item ${hasCountry ? 'completed' : ''}`}>국가</span>
            {', '}
            <span className={`required-item ${hasPosition ? 'completed' : ''}`}>직책</span>
            {', '}
            <span className={`required-item ${hasStartDate ? 'completed' : ''}`}>취임일</span>
          </span>
        </RequiredNoticeWrap>
      }
    >
      <S.Form id={FORM_ID} onSubmit={handleSubmit}>
        {personDetail && (
          <PersonInfoBar>
            <PersonThumbnail aria-hidden>
              {(personDetail as { profileImageUrl?: string | null }).profileImageUrl && !personImageError ? (
                <img
                  src={
                    getUploadImageUrl((personDetail as { profileImageUrl?: string }).profileImageUrl) ||
                    (personDetail as { profileImageUrl?: string }).profileImageUrl
                  }
                  alt=""
                  onError={() => setPersonImageError(true)}
                />
              ) : (
                <FiUser size={20} />
              )}
            </PersonThumbnail>
            <span style={{ fontWeight: 500 }}>
              {getPersonDisplayName(personDetail)}
              {personDetail.primaryLabel && (
                <PersonPrimaryLabel> · {personDetail.primaryLabel}</PersonPrimaryLabel>
              )}
            </span>
          </PersonInfoBar>
        )}

        {isEdit && tenureId && !editingTenure && loadingTenures && (
          <InlineMessage $variant="loading">불러오는 중…</InlineMessage>
        )}
        {isEdit && tenureId && !editingTenure && !loadingTenures && (
          <InlineMessage $variant="error">재임 기록을 찾을 수 없습니다.</InlineMessage>
        )}

        <S.FormSection>
          <S.FormSectionHeader>
            <S.FormSectionIcon>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
                  fill="currentColor"
                />
              </svg>
            </S.FormSectionIcon>
            <div>
              <S.FormSectionTitle>기본 정보</S.FormSectionTitle>
              <S.FormSectionDescription>
                {isMinisterFlow
                  ? '해당 행정부에서의 직위와 취임·퇴임일을 입력하세요. 국가·행정부는 이미 선택된 상태입니다.'
                  : '재임한 국가, 직책, 취임·퇴임일을 입력하세요'}
              </S.FormSectionDescription>
            </div>
          </S.FormSectionHeader>

          <SidebarFormWrap>
            <FormRows>
              <FieldRow>
                <FieldLabel>
                  국가 <Required aria-label="필수" />
                </FieldLabel>
                <FieldControl>
                  <SelectTriggerButton
                    type="button"
                    onClick={() => setCountryModalOpen(true)}
                    $hasValue={!!countryId}
                  >
                    <span>
                      {countryId
                        ? (countries as any[]).find((c: any) => c.id === countryId)?.name ??
                          (countries as any[]).find((c: any) => c.id === countryId)?.localName ??
                          '선택됨'
                        : '국가 선택'}
                    </span>
                    <FiChevronDown size={20} />
                  </SelectTriggerButton>
                </FieldControl>
              </FieldRow>

              {/* 현대 국가에 매이지 않는 정치체(교황령·신성로마제국 등)도 직접 고를 수 있도록 항상 렌더 */}
              <FieldRow>
                <FieldLabel>역사적 국가 (선택)</FieldLabel>
                <FieldControl>
                  <SelectTriggerButton
                    type="button"
                    onClick={() => setHistoricalCountryModalOpen(true)}
                    $hasValue={!!historicalCountryId}
                  >
                    <span>
                      {historicalCountryId
                        ? historicalCountryOptions.find((option) => option.id === historicalCountryId)?.name ??
                          (editingTenure as { historicalCountry?: { name?: string } })?.historicalCountry?.name ??
                          '역사적 국가'
                        : countryId
                          ? '현대 국가 기준'
                          : '역사적 국가 선택'}
                    </span>
                    <FiChevronDown size={20} />
                  </SelectTriggerButton>
                  <FieldHint style={{ marginTop: 6 }}>
                    교황령·신성로마제국처럼 현대 국가에 속하지 않는 정치체도 직접 선택할 수 있습니다.
                  </FieldHint>
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>
                  직책명 <Required aria-label="필수" />
                </FieldLabel>
                <FieldControl>
                  <SelectTriggerButton
                    type="button"
                    onClick={() => setPositionModalOpen(true)}
                    $hasValue={!!positionDefinitionId || !!title.trim()}
                  >
                    <span>{positionTitleLabel}</span>
                    <FiChevronDown size={20} />
                  </SelectTriggerButton>
                  {(cabinetId || initialCabinetId) && (
                    <FieldHint style={{ marginTop: 6 }}>
                      부처를 미리 등록하지 않아도 <strong>기타 (직접 입력)</strong>으로 직위명(예: 국방장관, 외무대신)을 넣을 수 있습니다.
                    </FieldHint>
                  )}
                  {/* 정의를 고르지 않은 경우(기타·내장 직책·정의 없음)에만 직접 입력 — 선택 트리거에 종속 */}
                  {!positionDefinitionId && (
                    <ManualEntryGroup>
                      <ManualEntryCaption>직접 입력</ManualEntryCaption>
                      <ManualEntryField>
                        한글 직책명
                        <Input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="예: 최고지도자"
                        />
                      </ManualEntryField>
                      <ManualEntryField>
                        영문 직책명 (선택)
                        <Input
                          value={titleEn}
                          onChange={(e) => setTitleEn(e.target.value)}
                          placeholder="예: Supreme Leader"
                        />
                      </ManualEntryField>
                    </ManualEntryGroup>
                  )}
                </FieldControl>
              </FieldRow>

              {/* 수반 직책은 cabinetId 동시 지정 시 백엔드 400 — 필드 자체를 숨겨 사전 차단 */}
              {!isHeadPositionType && (countryId || historicalCountryId) && cabinetOptions.length > 0 && (
                <FieldRow>
                  <FieldLabel>소속 행정부 (선택)</FieldLabel>
                  <FieldControl>
                    <SelectTriggerButton
                      type="button"
                      onClick={() => setCabinetModalOpen(true)}
                      $hasValue={!!cabinetId}
                    >
                      <span>
                        {cabinetId
                          ? cabinetOptions.find((o) => o.value === cabinetId)?.label ?? '선택됨'
                          : '행정부 선택 (각료인 경우)'}
                      </span>
                      <FiChevronDown size={20} />
                    </SelectTriggerButton>
                  </FieldControl>
                </FieldRow>
              )}

              {(cabinetId || initialCabinetId) && (
                <FieldRow>
                  <FieldLabel>관련 사건</FieldLabel>
                  <FieldControl>
                    <EventAttachButton
                      type="button"
                      onClick={() => setEventAttachModalOpen(true)}
                    >
                      <FiLink size={13} />
                      이 행정부에 사건 등록·연결
                    </EventAttachButton>
                    <FieldHint style={{ marginTop: 6 }}>
                      재임 중 일어난 사건을 새로 만들거나 기존 사건을 이 행정부와 연결합니다. 같은 사건을 다른 행정부에서도 다시 연결할 수 있습니다.
                    </FieldHint>
                  </FieldControl>
                </FieldRow>
              )}

              <DateRangeField
                label="취임일 · 퇴임일"
                required
                startValue={startDate}
                endValue={endDate}
                onStartChange={setStartDate}
                onEndChange={setEndDate}
                startPlaceholder="취임일"
                endPlaceholder="퇴임일 (선택)"
                openEndAfterStart
                blockBc
                clearableEnd
              />
            </FormRows>
          </SidebarFormWrap>
        </S.FormSection>

        <S.FormSection>
          <S.FormSectionHeader>
            <S.FormSectionIcon>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 5h18v2H3V5zm0 6h18v2H3v-2zm0 6h12v2H3v-2z"
                  fill="currentColor"
                />
              </svg>
            </S.FormSectionIcon>
            <div>
              <S.FormSectionTitle>임기 상세</S.FormSectionTitle>
              <S.FormSectionDescription>
                대수·취임 방식·퇴임 사유 등 부가 정보 (모두 선택)
              </S.FormSectionDescription>
            </div>
          </S.FormSectionHeader>

          <SidebarFormWrap>
            <FormRows>
              <FieldRow>
                {/* 재위(SOVEREIGN_REIGN) 수정은 재위번호(regnalNumber), 일반 재임은 대수(termNumber) — 이중 기록 금지 */}
                <FieldLabel>{editingIsSovereign ? '재위번호' : '대수'}</FieldLabel>
                <FieldControl>
                  <Input
                    type="number"
                    min={1}
                    value={ordinalNumber}
                    onChange={(e) => setOrdinalNumber(e.target.value)}
                    placeholder={editingIsSovereign ? '선택 (예: 루이 14세 → 14)' : '선택 (예: 제20대 → 20)'}
                    title={
                      editingIsSovereign
                        ? '서양 군주 재위번호'
                        : '공식 통산 대수 — 없으면 비워두기'
                    }
                  />
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>기수</FieldLabel>
                <FieldControl>
                  <Input
                    type="number"
                    min={1}
                    value={subTermNumber}
                    onChange={(e) => setSubTermNumber(e.target.value)}
                    placeholder="선택 (예: 1기→1, 2기→2)"
                    title="같은 대수 내 복수 임기 구분 (예: 클린턴 42대 1기/2기)"
                  />
                </FieldControl>
              </FieldRow>

              {editingIsSovereign && (
                <FieldRow>
                  <FieldLabel>왕조 서수</FieldLabel>
                  <FieldControl>
                    <Input
                      type="number"
                      min={1}
                      value={dynastyOrdinal}
                      onChange={(event) => setDynastyOrdinal(event.target.value)}
                      placeholder="선택 (예: 부르봉 왕조 5대 → 5)"
                      title="소속 왕조 내 계승 순번 — 재위번호·통산 대수와 별개 축"
                    />
                  </FieldControl>
                </FieldRow>
              )}

              <FieldRow>
                <FieldLabel>취임 방식</FieldLabel>
                <FieldControl>
                  <FormSelectNative
                    value={appointmentMethod}
                    onChange={(e) => setAppointmentMethod(e.target.value)}
                  >
                    <option value="">선택 안 함</option>
                    {APPOINTMENT_METHOD_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </FormSelectNative>
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>퇴임 사유</FieldLabel>
                <FieldControl>
                  <FormSelectNative
                    value={endReason}
                    onChange={(e) => setEndReason(e.target.value)}
                  >
                    <option value="">선택 안 함</option>
                    {TENURE_END_REASON_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </FormSelectNative>
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>퇴임 사유 상세</FieldLabel>
                <FieldControl>
                  <Input
                    value={endReasonDetail}
                    onChange={(e) => setEndReasonDetail(e.target.value)}
                    placeholder="선택 (예: 12·12 군사반란으로 실각)"
                  />
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>비고</FieldLabel>
                <FieldControl>
                  {legacyRegnalNote && (
                    <FieldHint style={{ marginBottom: 6 }}>
                      <strong>{legacyRegnalNote}</strong> — 왕명 표시용 자동 기록(읽기 전용, 저장 시 유지).
                      왕명 변경은 군주 등록 화면에서 하세요.
                    </FieldHint>
                  )}
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="선택 — 재임 관련 특이사항"
                    rows={2}
                  />
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>연대표에 표시</FieldLabel>
                <FieldControl>
                  <CheckboxLabelRow>
                    <input
                      type="checkbox"
                      id="tenure-show-on-events"
                      checked={showOnEvents}
                      onChange={(e) => setShowOnEvents(e.target.checked)}
                    />
                    <label htmlFor="tenure-show-on-events">사건 목록에 포함</label>
                  </CheckboxLabelRow>
                </FieldControl>
              </FieldRow>
            </FormRows>
          </SidebarFormWrap>
        </S.FormSection>

        {(isEdit && (
          <FormActions>
            <DeleteButton
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={submitting}
            >
              삭제
            </DeleteButton>
          </FormActions>
        )) || null}
      </S.Form>

      <CountrySearchModal
        isOpen={countryModalOpen}
        onClose={() => setCountryModalOpen(false)}
        title="국가 선택"
        placeholder="국가명으로 검색..."
        modernOnly
        modernCountries={(countries as any[]).map((c: any) => ({
          id: c.id,
          name: c.name ?? c.localName ?? c.id,
          flagEmoji: c.flagEmoji ?? null,
        }))}
        historicalCountries={[]}
        selectedCountryId={countryId || ''}
        onSelect={({ id }) => {
          setCountryId(id || '')
          // historicalCountryId는 여기서 무조건 null로 덮지 않음 — 새 국가 소속이
          // 아닐 때만 effect에서 해제 (역사국가 연결의 조용한 파괴 방지)
          setPositionDefinitionId(null)
          setCountryModalOpen(false)
        }}
      />

      <CountrySearchModal
        isOpen={historicalCountryModalOpen}
        onClose={() => setHistoricalCountryModalOpen(false)}
        title="역사적 국가 선택"
        placeholder="국가명으로 검색..."
        historicalOnly
        modernCountries={[]}
        historicalCountries={[
          { id: '', name: countryId ? '현대 국가 기준' : '선택 안 함' },
          ...historicalCountryOptions,
        ]}
        selectedCountryId={historicalCountryId ?? ''}
        onSelect={({ id }) => {
          setHistoricalCountryId(id || null)
          setPositionDefinitionId(null)
          setHistoricalCountryModalOpen(false)
        }}
      />

      <SelectModal
        isOpen={positionModalOpen}
        onClose={() => setPositionModalOpen(false)}
        title="직책명 선택"
        options={positionTitleOptions}
        selectedValue={
          positionDefinitionId ??
          (presetPositionType
            ? BUILTIN_POSITIONS.find((b) => b.positionType === presetPositionType)
                ?.value ?? OTHER_POSITION_VALUE
            : OTHER_POSITION_VALUE)
        }
        onSelect={handlePositionSelect}
      />

      <SelectModal
        isOpen={cabinetModalOpen}
        onClose={() => setCabinetModalOpen(false)}
        title="소속 행정부"
        options={[{ value: '', label: '없음' }, ...cabinetOptions]}
        selectedValue={cabinetId ?? ''}
        onSelect={(value) => {
          setCabinetModalOpen(false)
          setCabinetId(value || null)
        }}
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

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title={editingIsSovereign ? '재위 기록 삭제' : '재임 기록 삭제'}
        message={`이 ${editingIsSovereign ? '재위' : '재임'} 기록을 삭제하시겠습니까? 되돌릴 수 없습니다.`}
        confirmLabel={submitting ? '삭제 중…' : '삭제'}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </FormSidePanel>
  )
}
