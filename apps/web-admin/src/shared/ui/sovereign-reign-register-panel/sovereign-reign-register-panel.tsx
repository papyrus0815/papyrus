/**
 * 군주 재위 등록/수정 패널
 * - 인물 상세 패널에서 "군주 등록" 버튼으로 열림
 * - SovereignReign 테이블 전용 (GovernmentPositionTenure와 별도)
 */
import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { FiChevronDown } from 'react-icons/fi'
import styled from 'styled-components'

import { useHistoricalCountriesByModernCountry, useCountries } from '@/features/country/api'
import { personCareerApi } from '@/shared/api/person-career'
import { CountrySearchModal } from '@/shared/ui/country-search-modal/country-search-modal'
import { DateRangeField } from '@/shared/ui/form-fields/date-range-field'
import { FormSidePanel } from '@/shared/ui/form-side-panel/form-side-panel'
import {
  FormRows,
  FieldRow,
  FieldLabel,
  FieldControl,
  FieldHint,
  Input,
} from '@/shared/ui/register-form-layout'
import { SelectModal } from '@/shared/ui/select-modal/select-modal'

const FORM_ID = 'sovereign-reign-register-form'

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
    color: #475569;
    letter-spacing: -0.01em;
  }
  ${FieldControl} {
    max-width: none;
    width: 100%;
  }
`

const SelectTriggerButton = styled.button<{ $hasValue?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 13px 16px;
  background: #fafafa;
  color: ${({ $hasValue }) => ($hasValue ? '#0f172a' : '#94a3b8')};
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
    color: #94a3b8;
  }
  &:hover {
    background: #f4f4f5;
    border-color: #e4e4e7;
  }
  &:focus {
    background: #fff;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`


const DeleteBtn = styled.button`
  margin-top: 24px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #dc2626;
  background: transparent;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
  &:hover:not(:disabled) {
    background: #fef2f2;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export interface SovereignReignRegisterPanelProps {
  personId: string
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  /** 수정 시 재위 ID */
  reignId?: string | null
}

export function SovereignReignRegisterPanel({
  personId,
  open,
  onClose,
  onSuccess,
  reignId,
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
    // notes에서 "왕명: <name>" 파싱 (RegisterMonarchModal과 동일 형식)
    const m = (r.notes ?? '').match(/왕명\s*:\s*(.+?)(?:\n|$)/i) || (r.notes ?? '').match(/왕명\s*:\s*(.+)/i)
    setRegnalName(m ? m[1].trim() : '')
    setStartDate(r.startDate ? r.startDate.slice(0, 10) : '')
    setEndDate(r.endDate ? r.endDate.slice(0, 10) : '')
    setRegnalNumber(r.regnalNumber != null ? String(r.regnalNumber) : '')
  }, [open, existingReign])

  const selectedCountry = (countries as any[]).find((c: any) => c.id === countryId)
  const selectedHistorical = (historicalCountries as any[]).find(
    (c: any) => c.id === historicalCountryId,
  )
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
      const notesValue = regnalName.trim() ? `왕명: ${regnalName.trim()}` : undefined
      const dto = {
        personId,
        countryId: countryId || undefined,
        historicalCountryId: historicalCountryId || undefined,
        positionDefinitionId: positionDefinitionId || undefined,
        startDate,
        endDate: endDate || undefined,
        regnalNumber: regnalNumber ? Number(regnalNumber) : undefined,
        notes: notesValue,
      }
      if (isEdit && reignId) {
        await personCareerApi.updateSovereignReign(reignId, dto)
        toast.success('군주 재위가 수정되었습니다.')
      } else {
        await personCareerApi.addSovereignReign(dto)
        toast.success('군주 재위가 등록되었습니다.')
      }
      queryClient.invalidateQueries({ queryKey: ['person-detail', personId] })
      onSuccess?.()
      onClose()
    } catch {
      toast.error('저장에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!reignId || deleting) return
    if (!window.confirm('이 재위 기록을 삭제하시겠습니까?')) return
    setDeleting(true)
    try {
      await personCareerApi.deleteSovereignReign(reignId)
      toast.success('재위 기록이 삭제되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['person-detail', personId] })
      onSuccess?.()
      onClose()
    } catch {
      toast.error('삭제에 실패했습니다.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <FormSidePanel
        isOpen={open}
        title={isEdit ? '군주 재위 수정' : '군주 재위 등록'}
        onClose={onClose}
        submitLabel={submitting ? '저장 중…' : isEdit ? '수정 저장' : '등록'}
        formId={FORM_ID}
        submitDisabled={!canSubmit || submitting || deleting}
      >
        <SidebarFormWrap>
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
                  재위 기간 <span style={{ color: '#ef4444' }}>*</span>
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
                  />
                </FieldControl>
              </FieldRow>

              {/* 대수 */}
              <FieldRow>
                <FieldLabel>재위 대수 (예: 1, 2…)</FieldLabel>
                <FieldControl>
                  <Input
                    type="number"
                    min={1}
                    value={regnalNumber}
                    onChange={(e) => setRegnalNumber(e.target.value)}
                    placeholder="대수 (선택)"
                  />
                </FieldControl>
              </FieldRow>

            </FormRows>

            {isEdit && (
              <DeleteBtn
                type="button"
                onClick={handleDelete}
                disabled={deleting || submitting}
              >
                {deleting ? '삭제 중…' : '이 재위 기록 삭제'}
              </DeleteBtn>
            )}
          </form>
        </SidebarFormWrap>
      </FormSidePanel>

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
