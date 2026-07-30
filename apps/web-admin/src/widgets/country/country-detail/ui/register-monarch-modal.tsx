import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'

import { FiChevronDown, FiInfo, FiLink, FiSave, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { useHistoricalCountriesByModernCountry } from '@/features/country/api'
import {
  type CreateRegnalEraDto,
  type CreateSovereignReignDto,
  personCareerApi,
} from '@/shared/api/person-career'
import { getAllPersons } from '@/shared/api/persons'
import {
  APPOINTMENT_METHOD_OPTIONS,
  TENURE_END_REASON_OPTIONS,
} from '@/shared/lib/tenure-labels'
import { CountrySearchModal } from '@/shared/ui/country-search-modal/country-search-modal'
import {
  EventPickerModal,
  EventPickerLinkBtn,
  EventPickerLinkClearBtn,
  EventPickerLinkedChip,
  type EventPickerSelection,
} from '@/shared/ui/event-picker-modal/event-picker-modal'
import { DateRangeField } from '@/shared/ui/form-fields/date-range-field'
import { PersonSelectField } from '@/shared/ui/form-fields/person-select-field'
import { FormInput, FormTextarea } from '@/shared/ui/form-input/form-input'
import { FormSelectNative } from '@/shared/ui/form-select-native/form-select-native'
import {
  FieldControl,
  FieldHint,
  FieldLabel,
  FieldRow,
  FormRows,
  Required,
} from '@/shared/ui/register-form-layout'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import {
  PersonRegisterModalCancelBtn,
  PersonRegisterModalField,
  PersonRegisterModalFormDesc,
  PersonRegisterModalFormScroll,
  PersonRegisterModalLabel,
  PersonRegisterModalPrimaryBtn,
  PersonRegisterModalStickyFooter,
} from '@/shared/ui/register-modal-shell/register-modal-shell'
import {
  SelectModal,
  type SelectOption,
} from '@/shared/ui/select-modal/select-modal'
import { notify } from '@/shared/ui/toast'

/** 인물 등록 모달 `SelectBtn`과 동일 스펙 */
const ModalSelectBtn = styled.button<{ $hasValue?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  font-size: 15px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  color: ${({ $hasValue, theme }) =>
    $hasValue ? theme.colors.text.primary : theme.colors.text.tertiary};
  cursor: pointer;
  text-align: left;
  outline: none;
  &:focus {
    border-color: #6366f1;
  }
`

const StyledFormInput = styled(FormInput)`
  padding: 12px 14px;
  font-size: 15px;
  border-radius: 8px;
`

const StyledFormTextarea = styled(FormTextarea)`
  padding: 12px 14px;
  font-size: 15px;
  border-radius: 8px;
`

const WarningBox = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 20px;
  padding: 12px 14px;
  font-size: 14px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(251, 191, 36, 0.12)' : '#fffbeb'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(251, 191, 36, 0.35)' : '#fde68a'};
  border-radius: 8px;
  svg {
    flex-shrink: 0;
    margin-top: 2px;
    color: #d97706;
  }
  strong {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const EraYmdRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  max-width: 100%;

  input {
    width: 96px;
    min-width: 0;
    padding: 10px 12px;
    font-size: 14px;
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    border-radius: 8px;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
    color: ${({ theme }) => theme.colors.text.primary};
    box-sizing: border-box;
  }
  input:first-of-type {
    width: 112px;
  }
  input:focus {
    outline: none;
    border-color: #6366f1;
  }
`

const CheckboxRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  input[type='checkbox'] {
    width: 18px;
    height: 18px;
    accent-color: #6366f1;
    cursor: pointer;
  }
  label {
    font-size: 14px;
    color: ${({ theme }) => theme.colors.text.primary};
    cursor: pointer;
    user-select: none;
  }
`

function parseOptionalInt(raw: string): number | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const parsed = parseInt(trimmed, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function RegisterMonarchModal({
  isOpen,
  country,
  isHistorical,
  countryId,
  historicalCountryId,
  headOfStatePositionOptions,
  onClose,
  onSuccess,
}: {
  isOpen: boolean
  country: UnifiedCountry
  isHistorical: boolean
  countryId: string | undefined
  historicalCountryId: string | undefined
  headOfStatePositionOptions: {
    id: string
    title: string
    titleEn?: string | null
  }[]
  onClose: () => void
  onSuccess?: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [selectedAffinityHistoricalId, setSelectedAffinityHistoricalId] =
    useState<string | null>(null)
  const [personSelectModalOpen, setPersonSelectModalOpen] = useState(false)
  const [positionTitleModalOpen, setPositionTitleModalOpen] = useState(false)
  const [affinityCountryModalOpen, setAffinityCountryModalOpen] =
    useState(false)

  const [selectedPersonId, setSelectedPersonId] = useState('')
  const [selectedPositionDefinitionId, setSelectedPositionDefinitionId] =
    useState<string | null>(null)
  const [regnalName, setRegnalName] = useState('')
  const [startDate, setStartDate] = useState('')
  /** 즉위일 정밀도 'year' — 연도만 앎(월일은 01-01 관행 채움) */
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
  const [showOnEventsPage, setShowOnEventsPage] = useState(true)
  /** 즉위·대관식 사건 링크 — id는 payload, title은 칩 표시용 */
  const [linkedAccessionEvent, setLinkedAccessionEvent] =
    useState<EventPickerSelection | null>(null)
  const [accessionEventPickerOpen, setAccessionEventPickerOpen] =
    useState(false)

  const [includeRegnalEra, setIncludeRegnalEra] = useState(false)
  const [eraName, setEraName] = useState('')
  const [eraNameEn, setEraNameEn] = useState('')
  const [eraStartYear, setEraStartYear] = useState('')
  const [eraStartMonth, setEraStartMonth] = useState('')
  const [eraStartDay, setEraStartDay] = useState('')
  const [eraEndYear, setEraEndYear] = useState('')
  const [eraEndMonth, setEraEndMonth] = useState('')
  const [eraEndDay, setEraEndDay] = useState('')
  const [eraChangeReason, setEraChangeReason] = useState('')

  const { data: subordinateHistoricalFromApi = [] } =
    useHistoricalCountriesByModernCountry(countryId ?? '')
  const subordinateHistorical =
    ((country as { historicalCountries?: { id: string; name: string }[] })
      .historicalCountries?.length ?? 0) > 0
      ? (country as { historicalCountries: { id: string; name: string }[] })
          .historicalCountries
      : subordinateHistoricalFromApi
  const hasSubordinateHistorical =
    Array.isArray(subordinateHistorical) && subordinateHistorical.length > 0

  const { data: allPersonsForModal = [] } = useQuery({
    queryKey: ['persons', 'all'],
    queryFn: () => getAllPersons(),
    enabled: isOpen && (personSelectModalOpen || !!selectedPersonId),
  })

  useEffect(() => {
    if (!isOpen) {
      setPositionTitleModalOpen(false)
      setAffinityCountryModalOpen(false)
      setPersonSelectModalOpen(false)
      setAccessionEventPickerOpen(false)
    }
  }, [isOpen])

  const positionTitleOptions: SelectOption<string>[] = useMemo(
    () =>
      headOfStatePositionOptions.map((posDef) => ({
        value: posDef.id,
        label: posDef.title,
      })),
    [headOfStatePositionOptions],
  )

  const selectedPositionDefinition = selectedPositionDefinitionId
    ? headOfStatePositionOptions.find(
        (posDef) => posDef.id === selectedPositionDefinitionId,
      )
    : null

  const positionTitleLabel = selectedPositionDefinition
    ? selectedPositionDefinition.title
    : '직책 선택'

  const selectedPerson = useMemo(() => {
    if (!selectedPersonId) return null
    return (
      allPersonsForModal.find(
        (personRow) => personRow.id === selectedPersonId,
      ) ?? null
    )
  }, [allPersonsForModal, selectedPersonId])

  const resetForm = useCallback(() => {
    setSelectedAffinityHistoricalId(null)
    setSelectedPersonId('')
    setSelectedPositionDefinitionId(null)
    setRegnalName('')
    setStartDate('')
    setStartDateYearOnly(false)
    setEndDate('')
    setRegnalNumber('')
    setSubTermNumber('')
    setDynastyOrdinal('')
    setAppointmentMethod('')
    setAppointmentDetail('')
    setEndReason('')
    setEndReasonDetail('')
    setNotes('')
    setShowOnEventsPage(true)
    setLinkedAccessionEvent(null)
    setIncludeRegnalEra(false)
    setEraName('')
    setEraNameEn('')
    setEraStartYear('')
    setEraStartMonth('')
    setEraStartDay('')
    setEraEndYear('')
    setEraEndMonth('')
    setEraEndDay('')
    setEraChangeReason('')
  }, [])

  const close = () => {
    if (!submitting) {
      resetForm()
      onClose()
    }
  }

  const handlePositionTitleSelect = (value: string) => {
    setPositionTitleModalOpen(false)
    const posDef = headOfStatePositionOptions.find(
      (option) => option.id === value,
    )
    if (posDef) setSelectedPositionDefinitionId(posDef.id)
  }

  const buildRegnalEraDto = (): CreateRegnalEraDto | null => {
    if (!includeRegnalEra) return null
    if (!eraName.trim() || !eraStartYear.trim()) return null
    const sy = parseInt(eraStartYear.trim(), 10)
    if (!Number.isFinite(sy) || sy < 1) return null
    const sm = parseOptionalInt(eraStartMonth)
    const sd = parseOptionalInt(eraStartDay)
    const ey = parseOptionalInt(eraEndYear)
    const em = parseOptionalInt(eraEndMonth)
    const ed = parseOptionalInt(eraEndDay)
    if (eraStartMonth.trim() !== '' && sm === undefined) return null
    if (eraStartDay.trim() !== '' && sd === undefined) return null
    if (eraEndYear.trim() !== '' && ey === undefined) return null
    if (eraEndMonth.trim() !== '' && em === undefined) return null
    if (eraEndDay.trim() !== '' && ed === undefined) return null
    if (sm != null && (sm < 1 || sm > 12)) return null
    if (sd != null && (sd < 1 || sd > 31)) return null
    if (em != null && (em < 1 || em > 12)) return null
    if (ed != null && (ed < 1 || ed > 31)) return null
    return {
      eraName: eraName.trim(),
      eraNameEn: eraNameEn.trim() || null,
      startYear: sy,
      startMonth: eraStartMonth.trim() === '' ? null : (sm ?? null),
      startDay: eraStartDay.trim() === '' ? null : (sd ?? null),
      endYear: eraEndYear.trim() === '' ? null : (ey ?? null),
      endMonth: eraEndMonth.trim() === '' ? null : (em ?? null),
      endDay: eraEndDay.trim() === '' ? null : (ed ?? null),
      changeReason: eraChangeReason.trim() || null,
    }
  }

  const handleSave = async () => {
    if (
      !selectedPersonId ||
      !selectedPositionDefinitionId ||
      !startDate.trim() ||
      !selectedPositionDefinition
    ) {
      notify.error('인물, 직책명, 취임일을 입력해 주세요.')
      return
    }
    const defOk = headOfStatePositionOptions.some(
      (posDef) => posDef.id === selectedPositionDefinitionId,
    )
    if (!defOk) {
      notify.error('국가 원수 직위 정의만 등록할 수 있습니다.')
      return
    }

    if (includeRegnalEra) {
      if (!eraName.trim() || !eraStartYear.trim()) {
        notify.error('연호를 쓰려면 연호명과 시작 연도를 입력하세요.')
        return
      }
      const dto = buildRegnalEraDto()
      if (!dto) {
        notify.error('연호 날짜(연·월·일)를 올바르게 입력하세요.')
        return
      }
    }

    const num =
      regnalNumber.trim() === ''
        ? undefined
        : parseInt(regnalNumber.trim(), 10) || undefined
    // 서버 CreateSovereignReignDto에는 regnalName이 있으나 래퍼 타입(person-career.ts)에 누락 — 교차 타입으로 보강
    const payload: CreateSovereignReignDto & { regnalName?: string } = {
      personId: selectedPersonId,
      positionDefinitionId: selectedPositionDefinition.id,
      countryId: selectedAffinityHistoricalId
        ? undefined
        : (countryId ?? undefined),
      historicalCountryId:
        selectedAffinityHistoricalId ?? historicalCountryId ?? undefined,
      startDate: startDate.trim(),
      // 'year'=연도만 앎(월일은 01-01 관행 채움) — 생성 전용 모달이라 미체크는 undefined
      startDatePrecision: startDateYearOnly ? 'year' : undefined,
      endDate: endDate.trim() || undefined,
      // 재위(SovereignReign)의 통산 즉위 순서는 regnalNumber 축이 정본
      // (표시 ordinalOf·@@unique 모두 regnalNumber 기준). termNumber 이중기록 안 함.
      regnalNumber: num,
      subTermNumber: parseOptionalInt(subTermNumber),
      dynastyOrdinal: parseOptionalInt(dynastyOrdinal),
      appointmentMethod: (appointmentMethod ||
        undefined) as CreateSovereignReignDto['appointmentMethod'],
      appointmentDetail: appointmentDetail.trim() || undefined,
      accessionEventId: linkedAccessionEvent?.id || undefined,
      endReason: (endReason ||
        undefined) as CreateSovereignReignDto['endReason'],
      endReasonDetail: endReasonDetail.trim() || undefined,
      regnalName: regnalName.trim() || undefined,
      notes: notes.trim() || undefined,
      showPositionInfo: showOnEventsPage,
    }

    setSubmitting(true)
    try {
      const result = await personCareerApi.addSovereignReign(payload)
      const sovereignId =
        result && typeof result === 'object' && 'id' in result
          ? String((result as { id: string }).id)
          : null
      if (!sovereignId) {
        throw new Error('재위 ID를 받지 못했습니다.')
      }

      const eraDto = buildRegnalEraDto()
      if (includeRegnalEra && eraDto) {
        await personCareerApi.createRegnalEraForSovereignReign(
          sovereignId,
          eraDto,
        )
      }

      notify.success(
        includeRegnalEra && eraDto
          ? '군주 재위와 연호가 등록되었습니다.'
          : '군주(국가 원수) 재임이 등록되었습니다.',
      )
      onSuccess?.()
      resetForm()
      onClose()
    } catch (caught: unknown) {
      const msg =
        caught &&
        typeof caught === 'object' &&
        'response' in caught &&
        caught.response &&
        typeof caught.response === 'object' &&
        'data' in caught.response &&
        caught.response.data &&
        typeof caught.response.data === 'object' &&
        'message' in caught.response.data
          ? String((caught.response.data as { message: string }).message)
          : caught instanceof Error
            ? caught.message
            : '등록에 실패했습니다.'
      notify.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const canSave =
    !!selectedPersonId &&
    !!selectedPositionDefinitionId &&
    !!startDate.trim() &&
    headOfStatePositionOptions.length > 0

  return (
    <>
      <RegisterModal
        isOpen={isOpen}
        onClose={close}
        title="군주 등록"
        maxWidth="min(880px, 96vw)"
        minHeight="auto"
      >
        <PersonRegisterModalFormScroll>
          <PersonRegisterModalFormDesc>
            행정부(내각)를 만들지 않습니다. 국가 원수 재위 기간만 등록합니다.
          </PersonRegisterModalFormDesc>

          {headOfStatePositionOptions.length === 0 && (
            <WarningBox>
              <FiInfo size={20} />
              <span>
                이 국가 범위에 <strong>국가 원수</strong> 직위 정의가 없습니다.
                국가 상세의 직위 정의에서 먼저 추가해 주세요.
              </span>
            </WarningBox>
          )}

          <FormRows>
            {!isHistorical && hasSubordinateHistorical && (
              <FieldRow>
                <FieldLabel>소속 국가</FieldLabel>
                <FieldControl>
                  <ModalSelectBtn
                    type="button"
                    onClick={() => setAffinityCountryModalOpen(true)}
                    $hasValue
                  >
                    <span>
                      {selectedAffinityHistoricalId
                        ? ((
                            subordinateHistorical as {
                              id: string
                              name: string
                            }[]
                          ).find(
                            (hist) => hist.id === selectedAffinityHistoricalId,
                          )?.name ?? '역사적 국가')
                        : `현대 국가 (현재: ${country.name})`}
                    </span>
                    <FiChevronDown size={20} />
                  </ModalSelectBtn>
                  <FieldHint>
                    현대 국가 또는 연결된 하위 역사적 국가 중 하나를 선택하세요.
                    아래 <strong>즉위 순서(제N대)</strong>는 여기서 고른 대상
                    기준으로 셉니다 — 정체별로 세려면(예: 프랑스 제3공화국) 하위
                    역사적 국가를, 국가 통산으로 세려면 현대 국가를 고르세요.
                  </FieldHint>
                </FieldControl>
              </FieldRow>
            )}

            <PersonSelectField
              label="인물"
              required
              hint="재임 기록에 연결할 인물을 선택하세요."
              value={selectedPersonId}
              selectedPerson={selectedPerson}
              persons={allPersonsForModal}
              isModalOpen={personSelectModalOpen}
              onModalOpenChange={setPersonSelectModalOpen}
              onSelect={setSelectedPersonId}
              placeholder="인물 선택"
            />

            <FieldRow>
              <FieldLabel>
                직책명 <Required aria-label="필수" />
              </FieldLabel>
              <FieldControl>
                <ModalSelectBtn
                  type="button"
                  onClick={() => setPositionTitleModalOpen(true)}
                  $hasValue={selectedPositionDefinitionId != null}
                  disabled={headOfStatePositionOptions.length === 0}
                >
                  <span>{positionTitleLabel}</span>
                  <FiChevronDown size={20} />
                </ModalSelectBtn>
              </FieldControl>
            </FieldRow>

            <FieldRow>
              <FieldLabel>왕명</FieldLabel>
              <FieldControl>
                <StyledFormInput
                  value={regnalName}
                  onChange={(e) => setRegnalName(e.target.value)}
                  placeholder="예: 세종, 루이 14세, 강희"
                />
              </FieldControl>
            </FieldRow>

            <DateRangeField
              label="취임일 · 퇴임일"
              required
              startValue={startDate}
              endValue={endDate}
              onStartChange={setStartDate}
              onEndChange={setEndDate}
              startPlaceholder="취임일"
              endPlaceholder="퇴임일 (선택)"
            />

            <FieldRow>
              <FieldLabel>즉위일 정밀도</FieldLabel>
              <FieldControl>
                <CheckboxRow style={{ marginBottom: 0 }}>
                  <input
                    type="checkbox"
                    id="monarch-start-year-only"
                    checked={startDateYearOnly}
                    onChange={(event) =>
                      setStartDateYearOnly(event.target.checked)
                    }
                  />
                  <label htmlFor="monarch-start-year-only">
                    즉위 연도만 앎
                  </label>
                </CheckboxRow>
                <FieldHint>
                  날짜는 관행상 1월 1일로 입력 — 표시는 연도만
                </FieldHint>
              </FieldControl>
            </FieldRow>

            <FieldRow>
              <FieldLabel>즉위 순서 (제N대)</FieldLabel>
              <FieldControl>
                <StyledFormInput
                  type="number"
                  min={1}
                  value={regnalNumber}
                  onChange={(e) => setRegnalNumber(e.target.value)}
                  placeholder="예: 4 (조선 제4대 세종), 266 (제266대 교황)"
                  title="선택한 국가/정체 기준 통산 즉위 순서"
                />
                <FieldHint>
                  위에서 고른 국가/정체 기준의 통산 순번(제N대) — 한 대상에 같은
                  대수는 한 명뿐. <strong>루이 14세·이반 6세</strong>식 이름별
                  번호는 위 <strong>왕명</strong>에 적으세요(숫자 축 아님).
                </FieldHint>
              </FieldControl>
            </FieldRow>

            <FieldRow>
              <FieldLabel>기수</FieldLabel>
              <FieldControl>
                <StyledFormInput
                  type="number"
                  min={1}
                  value={subTermNumber}
                  onChange={(e) => setSubTermNumber(e.target.value)}
                  placeholder="선택 — 같은 대 안에서 재위가 나뉠 때 (예: 복위)"
                />
              </FieldControl>
            </FieldRow>

            <FieldRow>
              <FieldLabel>왕조 서수</FieldLabel>
              <FieldControl>
                <StyledFormInput
                  type="number"
                  min={1}
                  value={dynastyOrdinal}
                  onChange={(event) => setDynastyOrdinal(event.target.value)}
                  placeholder="선택 — 소속 왕조 내 순번 (예: 5 → 부르봉 왕조 5대 국왕)"
                />
                <FieldHint>
                  유럽식 &ldquo;왕조 N대 국왕&rdquo; 표기용. 국가 통산 대수·재위번호와 별개 축입니다.
                </FieldHint>
              </FieldControl>
            </FieldRow>

            <FieldRow>
              <FieldLabel>즉위 방식</FieldLabel>
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
              <FieldLabel htmlFor="monarch-appointment-detail">
                즉위 상세
              </FieldLabel>
              <FieldControl>
                <StyledFormTextarea
                  id="monarch-appointment-detail"
                  value={appointmentDetail}
                  onChange={(event) => setAppointmentDetail(event.target.value)}
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

            <FieldRow>
              <FieldLabel>퇴위 사유</FieldLabel>
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
              <FieldLabel>퇴위 사유 상세</FieldLabel>
              <FieldControl>
                <StyledFormInput
                  value={endReasonDetail}
                  onChange={(e) => setEndReasonDetail(e.target.value)}
                  placeholder="선택 (예: 명예혁명으로 폐위)"
                />
              </FieldControl>
            </FieldRow>

            <FieldRow>
              <FieldLabel>비고</FieldLabel>
              <FieldControl>
                <StyledFormTextarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="선택 — 재위 관련 특이사항"
                  rows={2}
                />
              </FieldControl>
            </FieldRow>

            <FieldRow>
              <FieldLabel>사건 페이지 노출</FieldLabel>
              <FieldControl>
                <CheckboxRow style={{ marginBottom: 0 }}>
                  <input
                    type="checkbox"
                    id="monarch-register-show-on-events"
                    checked={showOnEventsPage}
                    onChange={(e) => setShowOnEventsPage(e.target.checked)}
                  />
                  <label htmlFor="monarch-register-show-on-events">
                    연대표·사건 목록에 표시
                  </label>
                </CheckboxRow>
                <FieldHint>역대 수반 토글 시 목록에 포함됩니다.</FieldHint>
              </FieldControl>
            </FieldRow>

            <PersonRegisterModalField style={{ marginTop: 8 }}>
              <CheckboxRow>
                <input
                  type="checkbox"
                  id="monarch-include-era"
                  checked={includeRegnalEra}
                  onChange={(e) => setIncludeRegnalEra(e.target.checked)}
                />
                <label htmlFor="monarch-include-era">
                  연호 함께 등록 (元号·일본 연호 등)
                </label>
              </CheckboxRow>
              <PersonRegisterModalFormDesc style={{ marginBottom: 16 }}>
                체크 후 연호명·시작 연도를 입력하면 재위 저장 직후 같은 재위에
                연호가 붙습니다.
              </PersonRegisterModalFormDesc>

              {includeRegnalEra && (
                <>
                  <PersonRegisterModalLabel>
                    연호명 (필수)
                  </PersonRegisterModalLabel>
                  <StyledFormInput
                    value={eraName}
                    onChange={(e) => setEraName(e.target.value)}
                    placeholder="예: 昭和, 康熙"
                    style={{ marginBottom: 16 }}
                  />
                  <PersonRegisterModalLabel>
                    영문·로마자 (선택)
                  </PersonRegisterModalLabel>
                  <StyledFormInput
                    value={eraNameEn}
                    onChange={(e) => setEraNameEn(e.target.value)}
                    placeholder="예: Shōwa, Kangxi"
                    style={{ marginBottom: 16 }}
                  />
                  <PersonRegisterModalLabel>
                    시작: 연도(필수) · 월 · 일
                  </PersonRegisterModalLabel>
                  <EraYmdRow style={{ marginBottom: 16 }}>
                    <input
                      type="number"
                      min={1}
                      value={eraStartYear}
                      onChange={(e) => setEraStartYear(e.target.value)}
                      placeholder="연도"
                    />
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={eraStartMonth}
                      onChange={(e) => setEraStartMonth(e.target.value)}
                      placeholder="월"
                    />
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={eraStartDay}
                      onChange={(e) => setEraStartDay(e.target.value)}
                      placeholder="일"
                    />
                  </EraYmdRow>
                  <PersonRegisterModalLabel>
                    종료: 연도 · 월 · 일 (선택)
                  </PersonRegisterModalLabel>
                  <EraYmdRow style={{ marginBottom: 8 }}>
                    <input
                      type="number"
                      min={1}
                      value={eraEndYear}
                      onChange={(e) => setEraEndYear(e.target.value)}
                      placeholder="연도"
                    />
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={eraEndMonth}
                      onChange={(e) => setEraEndMonth(e.target.value)}
                      placeholder="월"
                    />
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={eraEndDay}
                      onChange={(e) => setEraEndDay(e.target.value)}
                      placeholder="일"
                    />
                  </EraYmdRow>
                  <FieldHint style={{ marginBottom: 16 }}>
                    종료를 비우면 재위 종료까지로 해석해 표시할 수 있습니다.
                  </FieldHint>
                  <PersonRegisterModalLabel>
                    변경 사유 (선택)
                  </PersonRegisterModalLabel>
                  <StyledFormInput
                    value={eraChangeReason}
                    onChange={(e) => setEraChangeReason(e.target.value)}
                    placeholder="예: 즉위, 개원"
                  />
                </>
              )}
            </PersonRegisterModalField>
          </FormRows>
        </PersonRegisterModalFormScroll>

        <PersonRegisterModalStickyFooter>
          <PersonRegisterModalCancelBtn
            type="button"
            onClick={resetForm}
            disabled={submitting}
          >
            초기화
          </PersonRegisterModalCancelBtn>
          <PersonRegisterModalPrimaryBtn
            type="button"
            disabled={submitting || !canSave}
            onClick={() => handleSave()}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <FiSave size={16} />
              {submitting ? '저장 중…' : '저장'}
            </span>
          </PersonRegisterModalPrimaryBtn>
        </PersonRegisterModalStickyFooter>
      </RegisterModal>
      <SelectModal
        isOpen={isOpen && positionTitleModalOpen}
        onClose={() => setPositionTitleModalOpen(false)}
        title="직책명 선택"
        options={positionTitleOptions}
        selectedValue={selectedPositionDefinitionId ?? ''}
        onSelect={handlePositionTitleSelect}
      />

      {/* 즉위·대관식 사건 선택 모달 */}
      <EventPickerModal
        isOpen={isOpen && accessionEventPickerOpen}
        onClose={() => setAccessionEventPickerOpen(false)}
        onSelect={(picked) => {
          setLinkedAccessionEvent(picked)
          setAccessionEventPickerOpen(false)
        }}
        title="즉위·대관식 사건 연결"
      />

      {!isHistorical && hasSubordinateHistorical && (
        <CountrySearchModal
          isOpen={isOpen && affinityCountryModalOpen}
          onClose={() => setAffinityCountryModalOpen(false)}
          title="소속 국가 선택"
          placeholder="국가명으로 검색..."
          modernCountries={[
            {
              id: '',
              name: `현대 국가 (현재: ${country.name})`,
              flagEmoji:
                (country as { flagEmoji?: string | null }).flagEmoji ?? null,
            },
          ]}
          historicalCountries={(
            subordinateHistorical as {
              id: string
              name: string
              flagEmoji?: string | null
              enName?: string
              startYear?: number
              endYear?: number
            }[]
          ).map((hist) => ({
            id: hist.id,
            name: hist.name,
            flagEmoji: hist.flagEmoji ?? null,
            enName: hist.enName,
            startYear: hist.startYear,
            endYear: hist.endYear,
          }))}
          selectedCountryId={selectedAffinityHistoricalId ?? ''}
          onSelect={({ id }) => setSelectedAffinityHistoricalId(id || null)}
        />
      )}
    </>
  )
}
