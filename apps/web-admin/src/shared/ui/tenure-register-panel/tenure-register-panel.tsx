/**
 * 수반(재임) 등록/수정 — 우측 사이드 패널.
 * 역대 수반 섹션과 동일: 국가/직책은 트리거 버튼 → 모달 선택.
 */
import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiChevronDown, FiLink, FiUser, FiX } from 'react-icons/fi'
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
  EventPickerLinkBtn,
  EventPickerLinkClearBtn,
  EventPickerLinkedChip,
  type EventPickerSelection,
} from '@/shared/ui/event-picker-modal/event-picker-modal'
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
import { CountrySearchModal } from '@/shared/ui/country-search-modal/country-search-modal'
import { SelectModal, type SelectOption } from '@/shared/ui/select-modal/select-modal'
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
import {
  FormRows,
  FieldRow,
  FieldLabel,
  FieldControl,
  FieldHint,
  Required,
  Input,
  Textarea,
  LabeledRowsWrap,
  OptionalTag,
  SubFieldPair,
  SubField,
  SubFieldLabel,
  ChoiceChips,
  ChoiceChip,
  PersonChip,
  PersonChipThumb,
  FooterMissingHint,
  objectParticle,
} from '@/shared/ui/register-form-layout'

/** 폼 행 — 사건 등록 모달과 같은 문법(공용 LabeledRowsWrap) */
const SidebarFormWrap = LabeledRowsWrap

/** 시작/종료 날짜 파츠 입력 2열 — 좁은 폭에선 세로로 랩 */
const PeriodRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
`
const PeriodCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
`
const PeriodLabel = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 즉위·취임 행 안 사건 연결 줄 — 버튼(또는 연결된 사건 칩) 옆에 짧은 설명 */
const AccessionEventLine = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 10px;
`

/** 선택 버튼 — 깔끔한 호버/포커스 */
const SelectTriggerButton = styled.button<{ $hasValue?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  /* 다른 입력칸(Input·네이티브 select)과 같은 높이 — 48px이던 선택 버튼만 도드라졌다 */
  padding: 9px 12px;
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

/** 인물 바 — 미니멀 카드 */
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
  /** 부처(중앙부처) 지면에서 열 때 — 그 부처 소속으로 저장한다 */
  initialAdministrationDepartmentId?: string | null
  /**
   * 재위로 연다 — '재위 추가' 진입점. 직위 피커를 군주 칭호 우선으로 놓고, 아무것도 안 고르면
   * '국왕' 정의를 미리 고른다. 재위·재임은 한 기록(직위 보유)이라 폼도 하나다 —
   * 재위 칸(왕호·왕조 내 대수)은 고른 직위가 군주직일 때 펼쳐진다.
   */
  defaultMonarchical?: boolean
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
  initialAdministrationDepartmentId,
  defaultMonarchical = false,
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
  // 현대 국가 소속 역사국가 목록 + 보수적 해제 정책(재위 패널과 동일 정책, 공용 훅)
  const { historicalCountries } = useHistoricalCountryScope({
    open,
    countryId,
    historicalCountryId,
    onClearHistoricalCountry: () => setHistoricalCountryId(null),
  })
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
      const posTitle = head?.positionDefinition?.title ?? head?.title ?? c.name ?? '행정부'
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
  const reignEntry = isEdit ? (editingTenure as any)?.isMonarchical === true : defaultMonarchical

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
  const positionType =
    selectedDef?.positionType ?? presetPositionType ?? editingTenure?.positionType ?? 'OTHER'

  /** 이 기록이 재위인가 — 고른 직위 정의가 군주직이면. 정의를 아직 안 골랐으면 진입 맥락을 따른다 */
  const isReign = selectedDef ? selectedDef.isMonarchical === true : reignEntry

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
      if (def) {
        setPositionDefinitionId(def.id)
        setTitle(def.title ?? def.name ?? '')
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
      setTitle(result.title)
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
    setManualEntryOpen(false)
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

  /** 재위로 열었는데 직위를 아직 안 골랐으면 '국왕'을 미리 고른다 — 한 번만(사용자가 비우면 다시 채우지 않음) */
  const defaultReignAppliedRef = useRef(false)
  useEffect(() => {
    if (!open) {
      defaultReignAppliedRef.current = false
      return
    }
    if (isEdit || !defaultMonarchical || defaultReignAppliedRef.current) return
    const king = (positionDefinitions as PositionDefinitionLike[]).find(
      (definition) => definition.title === '국왕' && definition.isMonarchical === true,
    )
    if (!king) return
    defaultReignAppliedRef.current = true
    if (positionDefinitionId || title.trim()) return
    setPositionDefinitionId(king.id)
    setTitle(king.title ?? '')
    setTitleEn(king.titleEn ?? '')
    setPresetPositionType(null)
  }, [open, isEdit, defaultMonarchical, positionDefinitions, positionDefinitionId, title])

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
    // 대수 — 재위·재임 공통 ordinal(= termNumber). regnalNumber는 '이름 속 서수'라 대수가 아니다
    const num = t.ordinal ?? t.termNumber
    setOrdinalNumber(num != null ? String(num) : '')
    setSubTermNumber(t.subTermNumber != null ? String(t.subTermNumber) : '')
    setDynastyOrdinal(t.dynastyOrdinal != null ? String(t.dynastyOrdinal) : '')
    setAppointmentMethod(t.appointmentMethod ?? '')
    setAppointmentDetail(t.appointmentDetail ?? '')
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
    // 역사국가 전용 행(countryId NULL)도 수정 가능해야 함 — 둘 중 하나만 있으면 통과.
    // 재위는 국가 없이도(교황 등 국가 밖 군주) 저장한다 — 옛 재위 패널과 같은 규칙
    if (!isReign && !countryId && !historicalCountryId) {
      notify.error('국가를 선택해 주세요.')
      return
    }
    const def = selectedDef as any
    /**
     * 표시명은 정의 표기를 따른다.
     * web-admin의 표시 지면 20여 곳이 `positionDefinition?.title ?? title` 순서라, 정의를 고른
     * 재임에 다른 title을 저장하면 그 값은 **어디에도 표시되지 않는다**(저장만 되고 사라짐).
     * 주재지가 붙는 직함('광저우 영국 영사')은 정의를 고르지 말고 '기타 (직접 입력)'으로 남긴다 —
     * 피커의 '이 국가에서 쓰인 직책' 그룹이 그 표기를 다음 사람에게 그대로 되살려 준다.
     */
    const titleValue = def?.title ?? title.trim()
    if (!titleValue) {
      notify.error('직책을 선택하거나 직접 입력해 주세요.')
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
    // 레거시 "왕명: X" 줄은 저장 시 비고 앞에 재결합 — 위젯들의 왕명 파싱 보존
    const combinedNotes = [legacyRegnalNote, notes.trim()].filter(Boolean).join('\n')
    const payload = {
      positionType: (positionType as any) ?? 'OTHER',
      positionDefinitionId: positionDefinitionId || undefined,
      title: titleValue,
      titleEn: titleEn.trim() || undefined,
      countryId: historicalCountryId ? undefined : (countryId || undefined),
      historicalCountryId: historicalCountryId || undefined,
      // 구조화 기간 — 서버가 정렬 키·DATETIME(AD 1000+)·정밀도를 파생한다. 수정 때 종료 비움 = 해제
      startDateInfo: startInfo,
      endDateInfo: endInfo ?? emptyAs,
      // 재위 칸 — 재위가 아니면 건드리지 않는다(undefined = 기존 값 유지)
      regnalName: isReign ? regnalName.trim() || emptyAs : undefined,
      dynastyOrdinal: isReign ? parsedDynastyOrdinal : undefined,
      // 즉위·취임 사건 — 사건 화면에서 건 연결도 수정 폼이 하이드레이트하므로 그대로 왕복된다
      accessionEventId: linkedAccessionEvent?.id ?? emptyAs,
      // 일반 재임은 termNumber(공식 통산 대수)만 기록 — regnalNumber(군주 재위번호)에 이중 기록하지 않음
      termNumber: parsedOrdinal,
      subTermNumber: parsedSubTerm,
      appointmentMethod: (appointmentMethod || emptyAs) as any,
      appointmentDetail: appointmentDetail.trim() || emptyAs,
      endReason: (endReason || emptyAs) as any,
      endReasonDetail: endReasonDetail.trim() || emptyAs,
      notes: combinedNotes || emptyAs,
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
    (!isReign && !countryId && !historicalCountryId) ||
    (!(selectedDef as any)?.title && !title.trim()) ||
    partialPartsToDateInfo(start) == null

  const hasCountry = isReign || !!countryId || !!historicalCountryId
  const hasPosition = !!(selectedDef as any)?.title || !!title.trim()
  const hasStartDate = partialPartsToDateInfo(start) != null
  /** 재위 기간 역전 — 저장은 막지 않고 경고만(추존·복위) */
  const periodInverted = isPartialRangeInverted(start, end)
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

  return (
    <>
      <RegisterModal
        isOpen={open}
        onClose={onClose}
        title={panelTitle}
        maxWidth="min(900px, 94vw)"
        minHeight="auto"
      >
        <PersonRegisterModalFormScroll>
          <S.Form id={FORM_ID} onSubmit={handleSubmit}>

        {isEdit && tenureId && !editingTenure && loadingTenures && (
          <InlineMessage $variant="loading">불러오는 중…</InlineMessage>
        )}
        {isEdit && tenureId && !editingTenure && !loadingTenures && (
          <InlineMessage $variant="error">재임 기록을 찾을 수 없습니다.</InlineMessage>
        )}

        {/* 사건 등록 모달과 같은 문법 — 섹션 머리 없이 [라벨 | 입력] 행을 가는 선으로 가른다 */}
        {isMinisterFlow && (
          <FieldHint style={{ margin: '0 0 8px' }}>
            해당 행정부에서의 직위와 취임·퇴임일을 입력하세요. 국가·행정부는 이미 선택된 상태입니다.
          </FieldHint>
        )}
          <SidebarFormWrap>
            <FormRows>
              {personDetail && (
                <FieldRow>
                  <FieldLabel as="span">인물</FieldLabel>
                  <FieldControl>
                    <PersonChip>
            <PersonChipThumb aria-hidden>
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
            </PersonChipThumb>
            <span style={{ fontWeight: 500 }}>
              {getPersonDisplayName(personDetail)}
              {personDetail.primaryLabel && (
                <PersonPrimaryLabel> · {personDetail.primaryLabel}</PersonPrimaryLabel>
              )}
            </span>
                    </PersonChip>
                  </FieldControl>
                </FieldRow>
              )}
              <FieldRow>
                <FieldLabel>
                  {/* 재위는 국가 없이도 저장된다(교황 등 국가 밖 군주) */}
                  국가 {isReign ? <OptionalTag>(선택)</OptionalTag> : <Required aria-label="필수" />}
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
                <FieldLabel>역사적 국가<OptionalTag>(선택)</OptionalTag></FieldLabel>
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
                  {/* 국가 미선택이면 전 카탈로그가 보인다는 사실을 숨기지 않고 알려 준다.
                      조용히 좁히는 대신 사용자가 좁힐 방법을 안내(보이지 않는 필터 금지). */}
                  {!countryId && !historicalCountryId && (
                    <FieldHint style={{ marginTop: 6 }}>
                      국가를 먼저 고르면 그 나라의 직책만 추려서 보여줍니다.
                    </FieldHint>
                  )}
                  {/*
                    카탈로그에 외무장관은 있는데 외무대신은 없다 — 고른 정의 위에 표기만
                    덧씌우면 표시 지면(정의 우선)에 안 나오므로, 원본은 그대로 두고 이 나라
                    전용 정의를 새로 담는다.
                  */}
                  {positionDefinitionId && !localTitleOpen && (
                    <FieldHint style={{ marginTop: 6 }}>
                      {countryId || historicalCountryId ? (
                        <>
                          이 나라에서 다르게 부르나요? (예: 외무장관 → 외무대신){' '}
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
                      ) : (
                        '국가를 고르면 그 나라에서 부르는 이름(예: 외무대신)으로 바꿀 수 있습니다.'
                      )}
                    </FieldHint>
                  )}
                  {positionDefinitionId && localTitleOpen && (
                    <ManualEntryGroup>
                      <ManualEntryCaption>이 나라에서 부르는 이름</ManualEntryCaption>
                      <ManualEntryField>
                        <Input
                          autoFocus
                          value={localTitleDraft}
                          onChange={(event) =>
                            setLocalTitleDraft(event.target.value)
                          }
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
                      <FieldHint>
                        「{selectedDef?.title ?? title}」은 그대로 두고 이 나라 전용 직책을
                        새로 만듭니다. 다른 나라 재임에는 영향이 없고, 다음부터 이 나라
                        직책 목록에 바로 나옵니다.
                      </FieldHint>
                    </ManualEntryGroup>
                  )}
                  {/* 정의를 고르지 않은 경우(기타·내장 직책·정의 없음)에만 직접 입력 — 선택 트리거에 종속.
                      정의를 고른 상태에서 다른 표기를 적어도 표시 지면(정의 우선)에 반영되지 않으므로
                      입력칸 자체를 열지 않는다. 주재지가 붙는 직함은 '기타'로 남기는 게 정직하다. */}
                  {/* 목록을 고르기 전 첫 화면에선 입력칸 대신 여는 링크만 — 목록에 없을 때의 탈출구 */}
                  {!positionDefinitionId && !manualEntryOpen && !title.trim() && (
                    <FieldHint style={{ marginTop: 6 }}>
                      목록에 없는 직책인가요?{' '}
                      <LocalTitleLink type="button" onClick={() => setManualEntryOpen(true)}>
                        직접 입력
                      </LocalTitleLink>
                    </FieldHint>
                  )}
                  {!positionDefinitionId && (manualEntryOpen || !!title.trim()) && (
                    <ManualEntryGroup>
                      <ManualEntryCaption>직접 입력</ManualEntryCaption>
                      <ManualEntryField>
                        한글 직책명
                        <Input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="예: 광저우 영국 영사"
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
                    </ManualEntryGroup>
                  )}
                </FieldControl>
              </FieldRow>

              {/* 수반 직책은 cabinetId 동시 지정 시 백엔드 400 — 필드 자체를 숨겨 사전 차단 */}
              {!isHeadPositionType && (countryId || historicalCountryId) && cabinetOptions.length > 0 && (
                <FieldRow>
                  <FieldLabel>소속 행정부<OptionalTag>(선택)</OptionalTag></FieldLabel>
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

              {isReign && (
                <FieldRow>
                  <FieldLabel htmlFor="tenure-regnal-name">
                    왕호<OptionalTag>(선택)</OptionalTag>
                  </FieldLabel>
                  <FieldControl>
                    <Input
                      id="tenure-regnal-name"
                      value={regnalName}
                      onChange={(event) => setRegnalName(event.target.value)}
                      placeholder="예: 루이 14세, 빅토리아, 인노첸시오 3세"
                    />
                  </FieldControl>
                </FieldRow>
              )}

              {/* 기간 — 구조화 파츠(기원전·연 단위까지). 월·일을 비우면 그만큼만 안다는 뜻 */}
              <FieldRow>
                <FieldLabel as="span">
                  {isReign ? '재위 기간' : '재임 기간'} <Required aria-label="필수" />
                </FieldLabel>
                <FieldControl>
                  <PeriodRow>
                    <PeriodCol>
                      <PeriodLabel>{isReign ? '즉위' : '취임'}</PeriodLabel>
                      <InlineDateField
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
                    </PeriodCol>
                    <PeriodCol>
                      <PeriodLabel>{isReign ? '퇴위 (비워두면 현재)' : '퇴임 (비워두면 재임 중)'}</PeriodLabel>
                      <InlineDateField
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
                    </PeriodCol>
                  </PeriodRow>
                  <FieldHint>
                    연도만 입력해도 됩니다(월·일은 비워도 됨). 기원전은 연도 왼쪽 BC 버튼으로, 정확한 날짜는
                    달력(📅)으로 고르세요.
                  </FieldHint>
                  {periodInverted && (
                    <div id="tenure-period-error" role="alert">
                      <AlertBox variant="warning" icon="⚠️" style={{ marginTop: 4 }}>
                        {isReign
                          ? '퇴위가 즉위보다 빠릅니다 — 추존·복위 등 정당한 경우가 아니면 확인해 주세요.'
                          : '퇴임일이 취임일보다 빠릅니다.'}
                      </AlertBox>
                    </div>
                  )}
                  {lifespanWarning && (
                    <AlertBox variant="warning" icon="⚠️" style={{ marginTop: 4 }}>
                      선택한 역사국가 {lifespanWarning} 소급·추존·망명 등 정당한 경우라면 그대로 저장하세요.
                    </AlertBox>
                  )}
                </FieldControl>
              </FieldRow>

              {/* 대수·기수 — 한 행 안에 작은 소제목 둘(사건 모달의 시작일/종료일 문법) */}
              <FieldRow>
                <FieldLabel as="span">
                  {isReign ? '즉위 순서·기수' : '대수·기수'}
                  <OptionalTag>(선택)</OptionalTag>
                </FieldLabel>
                <FieldControl>
                  <SubFieldPair>
                    <SubField>
                      <SubFieldLabel htmlFor="tenure-ordinal">
                        {isReign ? '즉위 순서 (제N대)' : '대수'}
                      </SubFieldLabel>
                      {/* 대수 — 재위·재임 공통 '선택한 국가/정체 기준 통산 제N대' */}
                      <Input
                        id="tenure-ordinal"
                        type="number"
                        min={1}
                        value={ordinalNumber}
                        onChange={(e) => setOrdinalNumber(e.target.value)}
                        placeholder={isReign ? '예: 러시아 제국 제1대 → 1' : '예: 제20대 → 20'}
                        title={
                          isReign
                            ? '선택한 국가/정체 기준 통산 즉위 순서 — 루이 14세식 이름별 번호는 재위명(왕명)에'
                            : '공식 통산 대수 — 없으면 비워두기'
                        }
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
                        placeholder="예: 1기 → 1, 2기 → 2"
                        title="같은 대수 내 복수 임기 구분 (예: 클린턴 42대 1기/2기)"
                      />
                    </SubField>
                  </SubFieldPair>
                  <FieldHint>공식 통산 대수가 없으면 비워 두세요. 기수는 같은 대수 안의 연임 구분입니다.</FieldHint>
                </FieldControl>
              </FieldRow>

              {isReign && (
                <FieldRow>
                  <FieldLabel>왕조 서수<OptionalTag>(선택)</OptionalTag></FieldLabel>
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

              {/* 취임 — 방식은 칩(사건 카테고리 문법, 다시 누르면 해제) + 서술 */}
              <FieldRow>
                <FieldLabel as="span">
                  {isReign ? '즉위' : '취임'}
                  <OptionalTag>(선택)</OptionalTag>
                </FieldLabel>
                <FieldControl>
                  <ChoiceChips role="group" aria-label={isReign ? '즉위 방식' : '취임 방식'}>
                    {APPOINTMENT_METHOD_OPTIONS.map((option) => (
                      <ChoiceChip
                        key={option.value}
                        type="button"
                        aria-pressed={appointmentMethod === option.value}
                        $selected={appointmentMethod === option.value}
                        onClick={() =>
                          setAppointmentMethod(appointmentMethod === option.value ? '' : option.value)
                        }
                      >
                        {option.label}
                      </ChoiceChip>
                    ))}
                  </ChoiceChips>
                  {/* appointmentMethod의 서사 쌍 — 재위는 '즉위 상세' */}
                  <Textarea
                    id="tenure-appointment-detail"
                    aria-label={isReign ? '즉위 상세' : '취임 상세'}
                    value={appointmentDetail}
                    onChange={(event) => setAppointmentDetail(event.target.value)}
                    placeholder={
                      isReign
                        ? '어떻게 즉위했나 — 예: 선왕 서거로 승계, 1653년 랭스 대성당에서 대관'
                        : '어떻게 취임했나 — 예: 권한대행 후 정식 취임'
                    }
                    rows={2}
                  />
                  <AccessionEventLine>
                    {linkedAccessionEvent ? (
                      <EventPickerLinkedChip title={linkedAccessionEvent.title}>
                        <FiLink size={12} />
                        <span>{linkedAccessionEvent.title}</span>
                        <EventPickerLinkClearBtn
                          type="button"
                          aria-label="사건 연결 해제"
                          onClick={() => setLinkedAccessionEvent(null)}
                        >
                          <FiX size={13} />
                        </EventPickerLinkClearBtn>
                      </EventPickerLinkedChip>
                    ) : (
                      <EventPickerLinkBtn type="button" onClick={() => setAccessionEventPickerOpen(true)}>
                        <FiLink size={12} />
                        사건 연결
                      </EventPickerLinkBtn>
                    )}
                    <FieldHint>
                      {isReign ? '대관식·즉위식을' : '취임식을'} 사건으로 등록했다면 연결합니다.
                    </FieldHint>
                  </AccessionEventLine>
                </FieldControl>
              </FieldRow>

              {/* 퇴임 — 사유 칩 + 서술(실각 경위 등 한 줄로 안 끝나는 서술이 대부분) */}
              <FieldRow>
                <FieldLabel as="span">
                  {isReign ? '퇴위' : '퇴임'}
                  <OptionalTag>(선택)</OptionalTag>
                </FieldLabel>
                <FieldControl>
                  <ChoiceChips role="group" aria-label="퇴임 사유">
                    {TENURE_END_REASON_OPTIONS.map((option) => (
                      <ChoiceChip
                        key={option.value}
                        type="button"
                        aria-pressed={endReason === option.value}
                        $selected={endReason === option.value}
                        onClick={() => setEndReason(endReason === option.value ? '' : option.value)}
                      >
                        {option.label}
                      </ChoiceChip>
                    ))}
                  </ChoiceChips>
                  <Textarea
                    id="tenure-end-reason-detail"
                    aria-label="퇴임 사유 상세"
                    value={endReasonDetail}
                    onChange={(event) => setEndReasonDetail(event.target.value)}
                    placeholder="왜 물러났나 — 예: 12·12 군사반란으로 실각, 임기 만료 후 정계 은퇴"
                    rows={2}
                  />
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>비고<OptionalTag>(선택)</OptionalTag></FieldLabel>
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
                    placeholder="재임 관련 특이사항"
                    rows={2}
                  />
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>연대표에 표시<OptionalTag>(선택)</OptionalTag></FieldLabel>
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

          </S.Form>
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
          // 아닐 때만 useHistoricalCountryScope가 해제 (역사국가 연결의 조용한 파괴 방지)
          releasePositionOnCountryChange()
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
          releasePositionOnCountryChange()
          setHistoricalCountryModalOpen(false)
        }}
      />

      <SelectModal
        isOpen={positionModalOpen}
        onClose={() => setPositionModalOpen(false)}
        title="직책명 선택"
        options={positionTitleOptions}
        collapsedGroups={reignEntry ? DEFAULT_COLLAPSED_REIGN_GROUPS : DEFAULT_COLLAPSED_POSITION_GROUPS}
        searchPlaceholder="직책명으로 검색..."
        selectedValue={selectedPositionValue}
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
