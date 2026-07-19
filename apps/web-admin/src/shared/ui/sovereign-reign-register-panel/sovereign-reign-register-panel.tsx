/**
 * 군주 재위 등록/수정 모달
 * - 인물 상세 패널에서 "군주 등록" 버튼으로 열림
 * - SovereignReign 테이블 전용 (GovernmentPositionTenure와 별도)
 */
import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiChevronDown, FiLink, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { useHistoricalCountriesByModernCountry, useCountries } from '@/features/country/api'
import { useHistoricalCountries } from '@/features/historical-country/use-historical-countries.hook'
import { personCareerApi } from '@/shared/api/person-career'
import type { CreateSovereignReignDto } from '@/shared/api/person-career'
import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import { confirm } from '@/shared/ui/confirm-dialog'
import { CountrySearchModal } from '@/shared/ui/country-search-modal/country-search-modal'
import {
  EventPickerModal,
  EventPickerLinkBtn,
  EventPickerLinkClearBtn,
  EventPickerLinkedChip,
  type EventPickerSelection,
} from '@/shared/ui/event-picker-modal/event-picker-modal'
import { DateRangeField } from '@/shared/ui/form-fields/date-range-field'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import {
  PersonRegisterModalFormScroll,
  PersonRegisterModalStickyFooter,
  PersonRegisterModalPrimaryBtn,
  PersonRegisterModalCancelBtn,
} from '@/shared/ui/register-modal-shell/register-modal-shell'
import {
  FormRows,
  FieldRow,
  FieldLabel,
  FieldControl,
  FieldHint,
  Input,
  Textarea,
} from '@/shared/ui/register-form-layout'
import { FormSelectNative } from '@/shared/ui/form-select-native/form-select-native'
import {
  APPOINTMENT_METHOD_OPTIONS,
  TENURE_END_REASON_OPTIONS,
} from '@/shared/lib/tenure-labels'
import { SelectModal } from '@/shared/ui/select-modal/select-modal'
import { notify } from '@/shared/ui/toast'

const FORM_ID = 'sovereign-reign-register-form'

const ModalFormWrap = styled.div`
  width: 100%;
  min-width: 0;

  ${FieldRow} {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 0;
    align-items: stretch;
    border: none;
    border-bottom: none;
  }
  ${FieldRow}:first-child {
    padding-top: 0;
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
`

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
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.04)'
      : '#fafafa'};
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
  }
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f4f4f5'};
    border-color: ${({ theme }) => theme.colors.border.medium};
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
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`


const RequiredMark = styled.span`
  color: ${({ theme }) => theme.colors.error};
`

/** '즉위 연도만 앎' 정밀도 체크 행 — 이 파일 유일 체크박스라 최소형 label+input */
const CheckboxRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  input[type='checkbox'] {
    width: 18px;
    height: 18px;
    accent-color: #6366f1;
    cursor: pointer;
  }
  label {
    font-size: 13.5px;
    color: ${({ theme }) => theme.colors.text.primary};
    cursor: pointer;
    user-select: none;
  }
`

/**
 * 재위 레코드 → 폼 필드 정규화.
 * 수정 hydrate와 닫기 confirm의 dirty 기준선이 반드시 같은 정규화를 공유해야
 * 하므로 한 곳에 둔다 (키 순서도 dirty 비교(JSON.stringify)에 쓰이므로 유지).
 */
const reignToFormFields = (reign: any) => {
  // regnalName 필드 우선, 없으면 legacy notes에서 "왕명: X" 파싱
  const legacyMatch =
    (reign.notes ?? '').match(/왕명\s*:\s*(.+?)(?:\n|$)/i) ||
    (reign.notes ?? '').match(/왕명\s*:\s*(.+)/i)
  return {
    countryId: reign.countryId ?? reign.country?.id ?? '',
    historicalCountryId:
      reign.historicalCountryId ?? reign.historicalCountry?.id ?? null,
    positionDefinitionId:
      reign.positionDefinitionId ?? reign.positionDefinition?.id ?? null,
    regnalName: reign.regnalName ?? (legacyMatch ? legacyMatch[1].trim() : ''),
    startDate: reign.startDate ? reign.startDate.slice(0, 10) : '',
    startDateYearOnly: reign.startDatePrecision === 'year',
    endDate: reign.endDate ? reign.endDate.slice(0, 10) : '',
    regnalNumber: reign.regnalNumber != null ? String(reign.regnalNumber) : '',
    subTermNumber:
      reign.subTermNumber != null ? String(reign.subTermNumber) : '',
    dynastyOrdinal:
      reign.dynastyOrdinal != null ? String(reign.dynastyOrdinal) : '',
    appointmentMethod: reign.appointmentMethod ?? '',
    appointmentDetail: reign.appointmentDetail ?? '',
    // 삭제된 사건은 hydrate와 동일하게 무시 — 기준선이 달라지면 열자마자 dirty 오탐
    accessionEventId:
      reign.accessionEventId &&
      reign.accessionEvent &&
      reign.accessionEvent.deletedAt == null
        ? (reign.accessionEventId as string)
        : null,
    endReason: reign.endReason ?? '',
    endReasonDetail: reign.endReasonDetail ?? '',
    notes: reign.notes ?? '',
  }
}

/** 생성 모드 기준선(빈 폼) — reignToFormFields와 키 순서 동일 유지 */
const EMPTY_FORM_FIELDS: ReturnType<typeof reignToFormFields> = {
  countryId: '',
  historicalCountryId: null,
  positionDefinitionId: null,
  regnalName: '',
  startDate: '',
  startDateYearOnly: false,
  endDate: '',
  regnalNumber: '',
  subTermNumber: '',
  dynastyOrdinal: '',
  appointmentMethod: '',
  appointmentDetail: '',
  accessionEventId: null,
  endReason: '',
  endReasonDetail: '',
  notes: '',
}

export interface SovereignReignRegisterPanelProps {
  personId: string
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  /** 수정 시 재위 ID */
  reignId?: string | null
  /** 생성 시 국가 prefill (수장 비교 등 in-place 등록용) */
  initialCountryId?: string
  initialHistoricalCountryId?: string | null
}

export function SovereignReignRegisterPanel({
  personId,
  open,
  onClose,
  onSuccess,
  reignId,
  initialCountryId,
  initialHistoricalCountryId,
}: SovereignReignRegisterPanelProps) {
  const queryClient = useQueryClient()
  const isEdit = !!reignId

  const [countryId, setCountryId] = useState('')
  const [historicalCountryId, setHistoricalCountryId] = useState<string | null>(null)
  const [positionDefinitionId, setPositionDefinitionId] = useState<string | null>(null)
  const [regnalName, setRegnalName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startDateYearOnly, setStartDateYearOnly] = useState(false)
  const [endDate, setEndDate] = useState('')
  const [regnalNumber, setRegnalNumber] = useState('')
  const [subTermNumber, setSubTermNumber] = useState('')
  const [dynastyOrdinal, setDynastyOrdinal] = useState('')
  const [appointmentMethod, setAppointmentMethod] = useState('')
  const [appointmentDetail, setAppointmentDetail] = useState('')
  const [endReason, setEndReason] = useState('')
  const [endReasonDetail, setEndReasonDetail] = useState('')
  const [notes, setNotes] = useState('')
  /** 즉위·대관식 사건 링크 — id는 dirty/payload, title은 칩 표시용 */
  const [linkedAccessionEvent, setLinkedAccessionEvent] =
    useState<EventPickerSelection | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [countryModalOpen, setCountryModalOpen] = useState(false)
  const [historicalCountryModalOpen, setHistoricalCountryModalOpen] = useState(false)
  const [positionModalOpen, setPositionModalOpen] = useState(false)
  const [accessionEventPickerOpen, setAccessionEventPickerOpen] = useState(false)

  const { data: countries = [] } = useCountries()
  const { data: historicalCountries = [] } = useHistoricalCountriesByModernCountry(
    open ? countryId : '',
  )
  // 현대 국가를 선택하지 않아도 역사적 국가를 직접 고를 수 있도록 전체 목록도 확보한다.
  // 교황령·신성로마제국처럼 특정 현대 국가에 매이지 않는 정치체(교황·황제 등)를
  // "이탈리아를 먼저 골라야 교황령이 뜨는" 우회 없이 등록하기 위함.
  const { data: allHistoricalCountries = [] } = useHistoricalCountries()
  const { data: positionDefinitions = [] } = useQuery({
    queryKey: ['position-definitions-sovereign', countryId, historicalCountryId],
    queryFn: () =>
      personCareerApi.getPositionDefinitions({
        countryId: countryId || undefined,
        historicalCountryId: historicalCountryId || undefined,
      }),
    enabled: open,
  })

  const { data: existingReign } = useQuery({
    queryKey: ['sovereign-reign-detail', reignId],
    queryFn: async () => {
      const tenures = await personCareerApi.getTenuresByPersonId(personId)
      return (
        (tenures as any[]).find(
          (t: any) => t.id === reignId && t.recordKind === 'SOVEREIGN_REIGN',
        ) ?? null
      )
    },
    enabled: open && !!reignId,
  })

  const resetForm = () => {
    setCountryId('')
    setHistoricalCountryId(null)
    setPositionDefinitionId(null)
    setRegnalName('')
    setStartDate('')
    setStartDateYearOnly(false)
    setEndDate('')
    setRegnalNumber('')
    setSubTermNumber('')
    setDynastyOrdinal('')
    setAppointmentMethod('')
    setAppointmentDetail('')
    setLinkedAccessionEvent(null)
    setAccessionEventPickerOpen(false)
    setEndReason('')
    setEndReasonDetail('')
    setNotes('')
  }

  useEffect(() => {
    if (!open) resetForm()
  }, [open])

  useEffect(() => {
    if (!open || !existingReign) return
    const fields = reignToFormFields(existingReign)
    setCountryId(fields.countryId)
    setHistoricalCountryId(fields.historicalCountryId)
    setPositionDefinitionId(fields.positionDefinitionId)
    setRegnalName(fields.regnalName)
    setStartDate(fields.startDate)
    setStartDateYearOnly(fields.startDateYearOnly)
    setEndDate(fields.endDate)
    setRegnalNumber(fields.regnalNumber)
    setSubTermNumber(fields.subTermNumber)
    setDynastyOrdinal(fields.dynastyOrdinal)
    setAppointmentMethod(fields.appointmentMethod)
    setAppointmentDetail(fields.appointmentDetail)
    setLinkedAccessionEvent(
      fields.accessionEventId
        ? {
            id: fields.accessionEventId,
            title:
              (existingReign as {
                accessionEvent?: { title?: string | null } | null
              }).accessionEvent?.title ?? '연결된 사건',
          }
        : null,
    )
    setEndReason(fields.endReason)
    setEndReasonDetail(fields.endReasonDetail)
    setNotes(fields.notes)
  }, [open, existingReign])

  // 생성 모드: 열릴 때 prefill된 국가를 1회 적용 (in-place 등록)
  useEffect(() => {
    if (!open || reignId) return
    if (initialCountryId !== undefined) setCountryId(initialCountryId)
    if (initialHistoricalCountryId !== undefined) {
      setHistoricalCountryId(initialHistoricalCountryId ?? null)
    }
  }, [open, reignId, initialCountryId, initialHistoricalCountryId])

  // 수정 모드에서 모달이 열렸을 때, 저장된 historicalCountryId만 있고
  // 연결된 modern countryId가 없으면 historical 목록 쿼리가 비어 있어 lookup이 실패한다.
  // 이때 existingReign에 include된 country/historicalCountry 관계로 fallback해 이름을 그대로 표시.
  const existingReignAny = existingReign as any
  const selectedCountry =
    (countries as any[]).find((c: any) => c.id === countryId) ??
    (existingReignAny?.country?.id && existingReignAny.country.id === countryId
      ? existingReignAny.country
      : null)
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
  const selectedHistorical =
    historicalCountryOptions.find((option) => option.id === historicalCountryId) ??
    (existingReignAny?.historicalCountry?.id &&
    existingReignAny.historicalCountry.id === historicalCountryId
      ? existingReignAny.historicalCountry
      : null)
  const selectedDef = positionDefinitionId
    ? (positionDefinitions as any[]).find((d: any) => d.id === positionDefinitionId)
    : null

  const positionOptions = useMemo(
    () =>
      (positionDefinitions as any[]).map((d: any) => ({
        value: d.id,
        label: d.title ?? d.id,
      })),
    [positionDefinitions],
  )

  const canSubmit = startDate.trim().length > 0

  /**
   * 닫기 confirm용 dirty 기준선 — 생성=prefill 반영 초기값, 수정=hydrate 값.
   * 수정 모드 hydrate 대기 중(existingReign 미도착)에는 null로 판정 유보.
   */
  const baselineFields = useMemo(() => {
    if (isEdit) {
      return existingReign ? reignToFormFields(existingReign) : null
    }
    return {
      ...EMPTY_FORM_FIELDS,
      countryId: initialCountryId ?? '',
      historicalCountryId: initialHistoricalCountryId ?? null,
    }
  }, [isEdit, existingReign, initialCountryId, initialHistoricalCountryId])

  const formDirty =
    baselineFields != null &&
    JSON.stringify(baselineFields) !==
      JSON.stringify({
        countryId,
        historicalCountryId,
        positionDefinitionId,
        regnalName,
        startDate,
        startDateYearOnly,
        endDate,
        regnalNumber,
        subTermNumber,
        dynastyOrdinal,
        appointmentMethod,
        appointmentDetail,
        accessionEventId: linkedAccessionEvent?.id ?? null,
        endReason,
        endReasonDetail,
        notes,
      })

  /** 닫기 요청 — 작성 중 내용이 있으면 confirm 게이트 (오버레이 오클릭에 서사 유실 방지) */
  const requestClose = async () => {
    // in-flight 중 닫기 무시 — 요청 실패 시 입력 보존 (성공 닫힘은 handleSubmit/handleDelete가 직접 onClose)
    if (submitting || deleting) return
    if (formDirty) {
      const confirmed = await confirm({
        title: '작성 중인 내용이 있습니다',
        message: '저장하지 않고 닫으시겠습니까? 입력한 내용은 사라집니다.',
        danger: true,
      })
      if (!confirmed) return
    }
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setSubmitting(true)
    try {
      /** 수정 모드: 비운 값은 명시적 null(해제) 전송 — undefined면 서버가 기존 값을 유지해 silent no-op */
      const emptyAs = isEdit && reignId ? null : undefined
      const dto = {
        personId,
        countryId: countryId || undefined,
        historicalCountryId: historicalCountryId || undefined,
        positionDefinitionId: positionDefinitionId || undefined,
        startDate,
        // 'year'=연도만 앎(월일은 01-01 관행 채움) — 서버 계약상 undefined=유지, null=해제
        startDatePrecision: startDateYearOnly ? ('year' as const) : emptyAs,
        endDate: endDate || emptyAs,
        regnalNumber: regnalNumber ? Number(regnalNumber) : emptyAs,
        subTermNumber: subTermNumber ? Number(subTermNumber) : emptyAs,
        dynastyOrdinal: dynastyOrdinal ? Number(dynastyOrdinal) : emptyAs,
        appointmentMethod: (appointmentMethod || emptyAs) as
          | CreateSovereignReignDto['appointmentMethod']
          | null,
        appointmentDetail: appointmentDetail.trim() || emptyAs,
        accessionEventId: linkedAccessionEvent?.id ?? emptyAs,
        endReason: (endReason || emptyAs) as
          | CreateSovereignReignDto['endReason']
          | null,
        endReasonDetail: endReasonDetail.trim() || emptyAs,
        notes: notes.trim() || emptyAs,
        regnalName: regnalName.trim() || emptyAs,
      }
      if (isEdit && reignId) {
        await personCareerApi.updateSovereignReign(reignId, dto)
        notify.success('군주 재위가 수정되었습니다.')
      } else {
        // 생성 모드에서는 emptyAs === undefined 라 null이 실제로 들어가지 않음
        await personCareerApi.addSovereignReign(dto as CreateSovereignReignDto)
        notify.success('군주 재위가 등록되었습니다.')
      }
      invalidateTenureQueries(queryClient, { personId })
      onSuccess?.()
      onClose()
    } catch {
      notify.error('저장에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!reignId || deleting) return
    if (
      !(await confirm({
        title: '삭제 확인',
        message: '이 재위 기록을 삭제하시겠습니까?',
        danger: true,
      }))
    )
      return
    setDeleting(true)
    try {
      await personCareerApi.deleteSovereignReign(reignId)
      notify.success('재위 기록이 삭제되었습니다.')
      invalidateTenureQueries(queryClient, { personId })
      onSuccess?.()
      onClose()
    } catch {
      notify.error('삭제에 실패했습니다.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {/* Esc·오버레이·X 모두 requestClose 경유 — onClose 직배선 시 dirty confirm 우회됨 */}
      <RegisterModal
        isOpen={open}
        onClose={() => void requestClose()}
        title={isEdit ? '군주 재위 수정' : '군주 재위 등록'}
        maxWidth="min(560px, 94vw)"
        minHeight="auto"
      >
        <PersonRegisterModalFormScroll>
          <ModalFormWrap>
            <form id={FORM_ID} onSubmit={handleSubmit}>
              <FormRows>
                {/* 국가 */}
                <FieldRow>
                  <FieldLabel>국가</FieldLabel>
                  <FieldControl>
                    <SelectTriggerButton
                      type="button"
                      $hasValue={!!countryId}
                      onClick={() => setCountryModalOpen(true)}
                    >
                      <span>{selectedCountry?.name ?? '현대 국가 선택 (선택)'}</span>
                      <FiChevronDown size={16} />
                    </SelectTriggerButton>
                  </FieldControl>
                </FieldRow>

                {/* 역사적 국가 */}
                <FieldRow>
                  <FieldLabel>역사적 국가</FieldLabel>
                  <FieldControl>
                    <SelectTriggerButton
                      type="button"
                      $hasValue={!!historicalCountryId}
                      onClick={() => setHistoricalCountryModalOpen(true)}
                    >
                      <span>
                        {historicalCountryId
                          ? (selectedHistorical?.name ?? '역사적 국가')
                          : '역사적 국가 선택 (선택)'}
                      </span>
                      <FiChevronDown size={16} />
                    </SelectTriggerButton>
                    <FieldHint>
                      교황령·신성로마제국처럼 현대 국가에 속하지 않는 정치체도 직접 선택할 수 있습니다. 역사적 국가가 있으면 현대 국가보다 우선 표시됩니다.
                    </FieldHint>
                  </FieldControl>
                </FieldRow>

                {/* 왕명 */}
                <FieldRow>
                  <FieldLabel>왕명 (군주명)</FieldLabel>
                  <FieldControl>
                    <Input
                      type="text"
                      value={regnalName}
                      onChange={(e) => setRegnalName(e.target.value)}
                      placeholder="예: 빅토리아, 루이 14세 (선택)"
                    />
                    <FieldHint>인물 리스트·가계도에 이 이름으로 표시됩니다.</FieldHint>
                  </FieldControl>
                </FieldRow>

                {/* 직위 */}
                <FieldRow>
                  <FieldLabel>직위 (예: 국왕, 황제)</FieldLabel>
                  <FieldControl>
                    <SelectTriggerButton
                      type="button"
                      $hasValue={!!positionDefinitionId}
                      onClick={() => setPositionModalOpen(true)}
                    >
                      <span>{selectedDef?.title ?? '직위 선택 (선택)'}</span>
                      <FiChevronDown size={16} />
                    </SelectTriggerButton>
                  </FieldControl>
                </FieldRow>

                {/* 재위 기간 */}
                <FieldRow>
                  <FieldLabel>
                    재위 기간 <RequiredMark>*</RequiredMark>
                  </FieldLabel>
                  <FieldControl>
                    <DateRangeField
                      startValue={startDate}
                      endValue={endDate}
                      onStartChange={setStartDate}
                      onEndChange={setEndDate}
                      startPlaceholder="재위 시작 (필수)"
                      endPlaceholder="재위 종료 (비워두면 현재)"
                      renderControlOnly
                      startPickerTitle="재위 시작일"
                      endPickerTitle="재위 종료일"
                      blockBc
                    />
                    <CheckboxRow>
                      <input
                        type="checkbox"
                        id="sovereign-start-year-only"
                        checked={startDateYearOnly}
                        onChange={(event) =>
                          setStartDateYearOnly(event.target.checked)
                        }
                      />
                      <label htmlFor="sovereign-start-year-only">
                        즉위 연도만 앎
                      </label>
                    </CheckboxRow>
                    <FieldHint>
                      날짜는 관행상 1월 1일로 입력 — 표시는 연도만
                    </FieldHint>
                  </FieldControl>
                </FieldRow>

                {/* 대수 */}
                <FieldRow>
                  <FieldLabel>즉위 순서 (n대)</FieldLabel>
                  <FieldControl>
                    <Input
                      type="number"
                      min={1}
                      value={regnalNumber}
                      onChange={(e) => setRegnalNumber(e.target.value)}
                      placeholder="예: 1 (해당 국가의 1대 군주)"
                    />
                    <FieldHint>
                      한 국가에 같은 대수의 군주는 단 한 명입니다 (예: 표트르 대제 = 러시아 제국 1대).
                    </FieldHint>
                  </FieldControl>
                </FieldRow>

                {/* 기수 */}
                <FieldRow>
                  <FieldLabel>기수 (선택)</FieldLabel>
                  <FieldControl>
                    <Input
                      type="number"
                      min={1}
                      value={subTermNumber}
                      onChange={(e) => setSubTermNumber(e.target.value)}
                      placeholder="같은 대 안에서 재위가 나뉠 때 (예: 복위)"
                    />
                  </FieldControl>
                </FieldRow>

                {/* 왕조 서수 (유럽식 "왕조 N대 국왕") */}
                <FieldRow>
                  <FieldLabel>왕조 서수 (선택)</FieldLabel>
                  <FieldControl>
                    <Input
                      type="number"
                      min={1}
                      value={dynastyOrdinal}
                      onChange={(event) => setDynastyOrdinal(event.target.value)}
                      placeholder="예: 5 (부르봉 왕조 5대 국왕)"
                    />
                    <FieldHint>
                      인물의 소속 왕조 안에서의 계승 순번. 국가 통산 대수·재위번호와 별개입니다.
                    </FieldHint>
                  </FieldControl>
                </FieldRow>

                {/* 즉위 방식 */}
                <FieldRow>
                  <FieldLabel>즉위 방식</FieldLabel>
                  <FieldControl>
                    <FormSelectNative
                      value={appointmentMethod}
                      onChange={(e) => setAppointmentMethod(e.target.value)}
                    >
                      <option value="">선택 안 함</option>
                      {APPOINTMENT_METHOD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </FormSelectNative>
                  </FieldControl>
                </FieldRow>

                {/* 즉위 상세 — 즉위 방식(enum)의 서사 쌍: 승계 경위·대관식 언급·선왕 관계 등 */}
                <FieldRow>
                  <FieldLabel htmlFor="sovereign-appointment-detail">
                    즉위 상세
                  </FieldLabel>
                  <FieldControl>
                    <Textarea
                      id="sovereign-appointment-detail"
                      value={appointmentDetail}
                      onChange={(event) =>
                        setAppointmentDetail(event.target.value)
                      }
                      placeholder="선택 — 예: 선왕 서거로 승계, 1653년 랭스 대성당에서 대관"
                      rows={2}
                    />
                  </FieldControl>
                </FieldRow>

                {/* 즉위·대관식 사건 — 즉위 상세 서사의 구조화 쌍(Event 정본 링크) */}
                <FieldRow>
                  <FieldLabel>즉위·대관식 사건</FieldLabel>
                  <FieldControl>
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
                      <EventPickerLinkBtn
                        type="button"
                        onClick={() => setAccessionEventPickerOpen(true)}
                      >
                        <FiLink size={12} />
                        사건 연결
                      </EventPickerLinkBtn>
                    )}
                    <FieldHint>
                      대관식·즉위식을 사건으로 등록했다면 여기서 연결합니다.
                    </FieldHint>
                  </FieldControl>
                </FieldRow>

                {/* 퇴위 사유 */}
                <FieldRow>
                  <FieldLabel>퇴위 사유</FieldLabel>
                  <FieldControl>
                    <FormSelectNative
                      value={endReason}
                      onChange={(e) => setEndReason(e.target.value)}
                    >
                      <option value="">선택 안 함</option>
                      {TENURE_END_REASON_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </FormSelectNative>
                  </FieldControl>
                </FieldRow>

                {/* 퇴위 사유 상세 */}
                <FieldRow>
                  <FieldLabel>퇴위 사유 상세</FieldLabel>
                  <FieldControl>
                    <Input
                      value={endReasonDetail}
                      onChange={(e) => setEndReasonDetail(e.target.value)}
                      placeholder="선택 (예: 명예혁명으로 폐위)"
                    />
                  </FieldControl>
                </FieldRow>

                {/* 비고 */}
                <FieldRow>
                  <FieldLabel>비고</FieldLabel>
                  <FieldControl>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="선택 — 재위 관련 특이사항"
                      rows={2}
                    />
                  </FieldControl>
                </FieldRow>
              </FormRows>
            </form>
          </ModalFormWrap>
        </PersonRegisterModalFormScroll>
        <PersonRegisterModalStickyFooter>
          {isEdit && (
            <FooterDeleteBtn
              type="button"
              onClick={handleDelete}
              disabled={deleting || submitting}
            >
              {deleting ? '삭제 중…' : '삭제'}
            </FooterDeleteBtn>
          )}
          <PersonRegisterModalCancelBtn
            type="button"
            onClick={() => void requestClose()}
            disabled={submitting || deleting}
          >
            취소
          </PersonRegisterModalCancelBtn>
          <PersonRegisterModalPrimaryBtn
            type="submit"
            form={FORM_ID}
            disabled={!canSubmit || submitting || deleting}
          >
            {submitting ? '저장 중…' : isEdit ? '수정 저장' : '등록'}
          </PersonRegisterModalPrimaryBtn>
        </PersonRegisterModalStickyFooter>
      </RegisterModal>

      {/* 현대 국가 선택 모달 */}
      <CountrySearchModal
        isOpen={countryModalOpen}
        onClose={() => setCountryModalOpen(false)}
        title="국가 선택"
        modernOnly
        modernCountries={(countries as any[]).map((c: any) => ({
          id: c.id,
          name: c.name ?? c.id,
          flagEmoji: c.flagEmoji ?? null,
        }))}
        historicalCountries={[]}
        selectedCountryId={countryId || ''}
        onSelect={({ id }) => {
          setCountryId(id)
          setHistoricalCountryId(null)
          setPositionDefinitionId(null)
          setCountryModalOpen(false)
        }}
      />

      {/* 역사적 국가 선택 모달 — 현대 국가 미선택 시 전체 역사 국가에서 직접 선택 */}
      <CountrySearchModal
        isOpen={historicalCountryModalOpen}
        onClose={() => setHistoricalCountryModalOpen(false)}
        title="역사적 국가 선택"
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

      {/* 직위 선택 모달 */}
      <SelectModal
        isOpen={positionModalOpen}
        onClose={() => setPositionModalOpen(false)}
        title="직위 선택"
        options={positionOptions}
        selectedValue={positionDefinitionId ?? ''}
        onSelect={(v) => {
          setPositionDefinitionId(v || null)
          setPositionModalOpen(false)
        }}
      />

      {/* 즉위·대관식 사건 선택 모달 */}
      <EventPickerModal
        isOpen={accessionEventPickerOpen}
        onClose={() => setAccessionEventPickerOpen(false)}
        onSelect={(picked) => {
          setLinkedAccessionEvent(picked)
          setAccessionEventPickerOpen(false)
        }}
        title="즉위·대관식 사건 연결"
      />
    </>
  )
}
