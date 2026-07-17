/**
 * 군주 재위 등록/수정 모달
 * - 인물 상세 패널에서 "군주 등록" 버튼으로 열림
 * - SovereignReign 테이블 전용 (GovernmentPositionTenure와 별도)
 */
import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiChevronDown, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { useHistoricalCountriesByModernCountry, useCountries } from '@/features/country/api'
import { personCareerApi } from '@/shared/api/person-career'
import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import { confirm } from '@/shared/ui/confirm-dialog'
import { CountrySearchModal } from '@/shared/ui/country-search-modal/country-search-modal'
import { DateRangeField } from '@/shared/ui/form-fields/date-range-field'
import {
  PersonRegisterModalBox,
  PersonRegisterModalCloseBtn,
  PersonRegisterModalFormScroll,
  PersonRegisterModalHeader,
  PersonRegisterModalOverlay,
  PersonRegisterModalStickyFooter,
  PersonRegisterModalTitle,
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
  const [endDate, setEndDate] = useState('')
  const [regnalNumber, setRegnalNumber] = useState('')
  const [subTermNumber, setSubTermNumber] = useState('')
  const [dynastyOrdinal, setDynastyOrdinal] = useState('')
  const [appointmentMethod, setAppointmentMethod] = useState('')
  const [endReason, setEndReason] = useState('')
  const [endReasonDetail, setEndReasonDetail] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [countryModalOpen, setCountryModalOpen] = useState(false)
  const [historicalCountryModalOpen, setHistoricalCountryModalOpen] = useState(false)
  const [positionModalOpen, setPositionModalOpen] = useState(false)

  const { data: countries = [] } = useCountries()
  const { data: historicalCountries = [] } = useHistoricalCountriesByModernCountry(
    open ? countryId : '',
  )
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
    setEndDate('')
    setRegnalNumber('')
    setSubTermNumber('')
    setDynastyOrdinal('')
    setAppointmentMethod('')
    setEndReason('')
    setEndReasonDetail('')
    setNotes('')
  }

  useEffect(() => {
    if (!open) resetForm()
  }, [open])

  useEffect(() => {
    if (!open || !existingReign) return
    const r = existingReign as any
    setCountryId(r.countryId ?? r.country?.id ?? '')
    setHistoricalCountryId(r.historicalCountryId ?? r.historicalCountry?.id ?? null)
    setPositionDefinitionId(r.positionDefinitionId ?? r.positionDefinition?.id ?? null)
    // regnalName 필드 우선, 없으면 legacy notes에서 "왕명: X" 파싱
    const legacyMatch =
      (r.notes ?? '').match(/왕명\s*:\s*(.+?)(?:\n|$)/i) ||
      (r.notes ?? '').match(/왕명\s*:\s*(.+)/i)
    setRegnalName(r.regnalName ?? (legacyMatch ? legacyMatch[1].trim() : ''))
    setStartDate(r.startDate ? r.startDate.slice(0, 10) : '')
    setEndDate(r.endDate ? r.endDate.slice(0, 10) : '')
    setRegnalNumber(r.regnalNumber != null ? String(r.regnalNumber) : '')
    setSubTermNumber(r.subTermNumber != null ? String(r.subTermNumber) : '')
    setDynastyOrdinal(r.dynastyOrdinal != null ? String(r.dynastyOrdinal) : '')
    setAppointmentMethod(r.appointmentMethod ?? '')
    setEndReason(r.endReason ?? '')
    setEndReasonDetail(r.endReasonDetail ?? '')
    setNotes(r.notes ?? '')
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
  const selectedHistorical =
    (historicalCountries as any[]).find((c: any) => c.id === historicalCountryId) ??
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setSubmitting(true)
    try {
      const dto = {
        personId,
        countryId: countryId || undefined,
        historicalCountryId: historicalCountryId || undefined,
        positionDefinitionId: positionDefinitionId || undefined,
        startDate,
        endDate: endDate || undefined,
        regnalNumber: regnalNumber ? Number(regnalNumber) : undefined,
        subTermNumber: subTermNumber ? Number(subTermNumber) : undefined,
        dynastyOrdinal: dynastyOrdinal ? Number(dynastyOrdinal) : undefined,
        appointmentMethod: (appointmentMethod || undefined) as any,
        endReason: (endReason || undefined) as any,
        endReasonDetail: endReasonDetail.trim() || undefined,
        notes: notes.trim() || undefined,
        regnalName: regnalName.trim() || undefined,
      }
      if (isEdit && reignId) {
        await personCareerApi.updateSovereignReign(reignId, dto)
        notify.success('군주 재위가 수정되었습니다.')
      } else {
        await personCareerApi.addSovereignReign(dto)
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
      {createPortal(
        <AnimatePresence>
          {open && (
            <PersonRegisterModalOverlay
              key="sovereign-reign-modal-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="sovereign-reign-modal-title"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            >
              <PersonRegisterModalBox
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                $maxWidth="min(560px, 94vw)"
                $minHeight="auto"
                onClick={(event) => event.stopPropagation()}
              >
                <PersonRegisterModalHeader>
                  <PersonRegisterModalTitle id="sovereign-reign-modal-title">
                    {isEdit ? '군주 재위 수정' : '군주 재위 등록'}
                  </PersonRegisterModalTitle>
                  <PersonRegisterModalCloseBtn
                    type="button"
                    aria-label="닫기"
                    onClick={onClose}
                  >
                    <FiX size={20} />
                  </PersonRegisterModalCloseBtn>
                </PersonRegisterModalHeader>
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
                              disabled={!countryId}
                            >
                              <span>
                                {historicalCountryId
                                  ? (selectedHistorical?.name ?? '역사적 국가')
                                  : countryId
                                    ? '역사적 국가 선택 (선택)'
                                    : '현대 국가를 먼저 선택하세요'}
                              </span>
                              <FiChevronDown size={16} />
                            </SelectTriggerButton>
                            <FieldHint>역사적 국가가 있으면 현대 국가보다 우선 표시됩니다.</FieldHint>
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
                              {APPOINTMENT_METHOD_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </FormSelectNative>
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
                              {TENURE_END_REASON_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
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
                    onClick={onClose}
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
              </PersonRegisterModalBox>
            </PersonRegisterModalOverlay>
          )}
        </AnimatePresence>,
        document.body,
      )}

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

      {/* 역사적 국가 선택 모달 */}
      {countryId && (
        <CountrySearchModal
          isOpen={historicalCountryModalOpen}
          onClose={() => setHistoricalCountryModalOpen(false)}
          title="역사적 국가 선택"
          historicalOnly
          modernCountries={[]}
          historicalCountries={[
            { id: '', name: '현대 국가 기준' },
            ...(historicalCountries as any[]).map((h: any) => ({
              id: h.id,
              name: h.name ?? h.id,
              flagEmoji: (h as any).flagEmoji ?? null,
            })),
          ]}
          selectedCountryId={historicalCountryId ?? ''}
          onSelect={({ id }) => {
            setHistoricalCountryId(id || null)
            setPositionDefinitionId(null)
            setHistoricalCountryModalOpen(false)
          }}
        />
      )}

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
    </>
  )
}
