/**
 * 수반(재임) 등록/수정 — 우측 사이드 패널.
 * 역대 수반 섹션과 동일: 국가/직책은 트리거 버튼 → 모달 선택.
 */
import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiChevronDown, FiUser } from 'react-icons/fi'
import styled from 'styled-components'

import * as S from '@/pages/history/country/country.styles'
import { toast } from 'react-hot-toast'

import { useCountries } from '@/features/country/api'
import { useHistoricalCountriesByModernCountry } from '@/features/country/api'
import { personCareerApi } from '@/shared/api/person-career'
import { getPersonDetailById } from '@/shared/api/persons-detail'
import { getUploadImageUrl } from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { FormSidePanel } from '@/shared/ui/form-side-panel'
import { DateRangeField } from '@/shared/ui/form-fields'
import { CountrySearchModal } from '@/shared/ui/country-search-modal'
import { SelectModal, type SelectOption } from '@/shared/ui/select-modal'
import {
  FormRows,
  FieldRow,
  FieldLabel,
  FieldControl,
  FieldHint,
  DateFieldsRow,
  Required,
  Input,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
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
    color: #475569;
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
    transition: color 0.2s, transform 0.2s;
  }
  &:hover {
    background: #f4f4f5;
    border-color: #e4e4e7;
    svg {
      color: #64748b;
      transform: translateY(1px);
    }
  }
  &:focus {
    background: #fff;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }
`

const OTHER_POSITION_VALUE = 'OTHER'

/** 필수 항목 안내 래퍼 — 깔끔한 톤 */
const RequiredNoticeWrap = styled.div`
  margin: 0 26px 0;
  padding: 12px 18px;
  background: #f8fafc;
  border-radius: 12px;
  font-size: 13px;
  color: #475569;

  .required-title {
    font-weight: 600;
    color: #334155;
    margin-right: 6px;
  }
  .required-list {
    font-weight: 500;
  }
  .required-item {
    transition: color 0.2s, opacity 0.2s;
  }
  .required-item.completed {
    color: #059669;
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
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 14px;
  font-size: 15px;
  color: ${TEXT_PRIMARY};
  font-weight: 500;
`
const PersonThumbnail = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 14px;
  flex-shrink: 0;
  overflow: hidden;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
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
    color: ${TEXT_PRIMARY};
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
  color: #dc2626;
  background: transparent;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;

  &:hover:not(:disabled) {
    background: #fef2f2;
    color: #b91c1c;
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
  background: ${(p) => (p.$variant === 'error' ? '#fef2f2' : '#f1f5f9')};
  color: ${(p) => (p.$variant === 'error' ? '#b91c1c' : '#475569')};
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
  const [title, setTitle] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [regnalNumber, setRegnalNumber] = useState('')
  const [showOnEvents, setShowOnEvents] = useState(true)
  const [cabinetId, setCabinetId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [countryModalOpen, setCountryModalOpen] = useState(false)
  const [historicalCountryModalOpen, setHistoricalCountryModalOpen] = useState(false)
  const [positionModalOpen, setPositionModalOpen] = useState(false)
  const [cabinetModalOpen, setCabinetModalOpen] = useState(false)
  const [personImageError, setPersonImageError] = useState(false)

  const { data: countries = [] } = useCountries()
  const { data: historicalCountries = [] } = useHistoricalCountriesByModernCountry(
    open ? countryId : '',
  )
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
      const start = head?.startDate ? new Date(head.startDate).getFullYear() : ''
      const end = head?.endDate ? new Date(head.endDate).getFullYear() : '현재'
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

  const selectedDef = positionDefinitionId
    ? (positionDefinitions as any[]).find((d: any) => d.id === positionDefinitionId)
    : null
  const positionType = selectedDef?.positionType ?? editingTenure?.positionType ?? 'OTHER'

  const positionTitleOptions: SelectOption<string>[] = useMemo(() => {
    const defs = positionDefinitions as any[]
    const byDef = defs.map((d: any) => ({
      value: d.id,
      label: d.title ?? d.name ?? d.id ?? '직책',
    }))
    return [...byDef, { value: OTHER_POSITION_VALUE, label: '기타 (직접 입력)' }]
  }, [positionDefinitions])

  const positionTitleLabel =
    positionDefinitionId == null
      ? (title.trim() ? `기타: ${title}` : '직책 선택')
      : (selectedDef?.title ?? selectedDef?.name ?? (title || '직책 선택'))

  const handlePositionSelect = (value: string) => {
    setPositionModalOpen(false)
    if (value === OTHER_POSITION_VALUE) {
      setPositionDefinitionId(null)
      setTitle('')
      setTitleEn('')
    } else {
      const def = (positionDefinitions as any[]).find((d: any) => d.id === value)
      if (def) {
        setPositionDefinitionId(def.id)
        setTitle(def.title ?? def.name ?? '')
        setTitleEn(def.titleEn ?? def.title_en ?? '')
      }
    }
  }

  const resetForm = () => {
    setCountryId('')
    setHistoricalCountryId(null)
    setPositionDefinitionId(null)
    setTitle('')
    setTitleEn('')
    setStartDate('')
    setEndDate('')
    setRegnalNumber('')
    setShowOnEvents(true)
    setCabinetId(null)
  }

  useEffect(() => {
    if (!open) {
      resetForm()
      setPersonImageError(false)
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

  useEffect(() => {
    if (!open || !editingTenure) return
    const t = editingTenure as any
    setCountryId(t.countryId ?? t.country?.id ?? '')
    setHistoricalCountryId(t.historicalCountryId ?? t.historicalCountry?.id ?? null)
    setPositionDefinitionId(t.positionDefinitionId ?? t.positionDefinition?.id ?? null)
    setTitle(t.title ?? t.positionDefinition?.title ?? '')
    setTitleEn(t.titleEn ?? '')
    setStartDate(t.startDate ? (typeof t.startDate === 'string' ? t.startDate.split('T')[0] : '') : '')
    setEndDate(t.endDate ? (typeof t.endDate === 'string' ? t.endDate.split('T')[0] : '') : '')
    const num = t.regnalNumber ?? t.termNumber
    setRegnalNumber(num != null ? String(num) : '')
    setShowOnEvents(t.showPositionInfo !== false)
    setCabinetId(t.cabinetId ?? t.cabinet?.id ?? null)
  }, [open, editingTenure])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!personId || !startDate.trim()) {
      toast.error('국가·직책·취임일을 입력해 주세요.')
      return
    }
    const def = selectedDef as any
    const titleValue = def?.title ?? title.trim()
    if (!titleValue) {
      toast.error('직책을 선택하거나 직접 입력해 주세요.')
      return
    }
    const payload = {
      positionType: (positionType as any) ?? 'OTHER',
      positionDefinitionId: positionDefinitionId || undefined,
      title: titleValue,
      titleEn: titleEn.trim() || undefined,
      countryId: historicalCountryId ? undefined : (countryId || undefined),
      historicalCountryId: historicalCountryId || undefined,
      startDate,
      endDate: endDate || undefined,
      termNumber: regnalNumber.trim() ? parseInt(regnalNumber, 10) || undefined : undefined,
      regnalNumber: regnalNumber.trim() ? parseInt(regnalNumber, 10) || undefined : undefined,
      showPositionInfo: showOnEvents,
      cabinetId: cabinetId || undefined,
    }
    setSubmitting(true)
    try {
      if (isEdit && tenureId) {
        await personCareerApi.updateGovernmentPositionTenure(tenureId, payload)
        toast.success('재임 기록이 수정되었습니다.')
      } else {
        await personCareerApi.addGovernmentPositionTenure({
          ...payload,
          personId,
        })
        toast.success('재임 기록이 추가되었습니다.')
      }
      onClose()
      queryClient.invalidateQueries({ queryKey: ['person-detail', personId] })
      queryClient.invalidateQueries({ queryKey: ['person-tenures', personId] })
      onSuccess?.()
    } catch (err: any) {
      toast.error(err?.message || '저장에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!tenureId) return
    if (!window.confirm('이 재임 기록을 삭제하시겠습니까?')) return
    setSubmitting(true)
    try {
      await personCareerApi.deleteGovernmentPositionTenure(tenureId)
      toast.success('재임 기록이 삭제되었습니다.')
      onClose()
      queryClient.invalidateQueries({ queryKey: ['person-detail', personId] })
      queryClient.invalidateQueries({ queryKey: ['person-tenures', personId] })
      onSuccess?.()
    } catch (err: any) {
      toast.error(err?.message || '삭제에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const submitDisabled =
    submitting ||
    (isEdit && !!tenureId && !editingTenure) ||
    !personId ||
    !countryId ||
    (!(selectedDef as any)?.title && !title.trim()) ||
    !startDate.trim()

  const hasCountry = !!countryId
  const hasPosition = !!(selectedDef as any)?.title || !!title.trim()
  const hasStartDate = !!startDate.trim()

  return (
    <FormSidePanel
      isOpen={open}
      title={isEdit ? '수반 수정' : '수반 등록'}
      onClose={onClose}
      panelWidth={640}
      submitLabel={submitting ? '처리 중…' : isEdit ? '수정 완료' : '수반 등록'}
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
                <span style={{ color: TEXT_SECONDARY, fontWeight: 400 }}> · {personDetail.primaryLabel}</span>
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
                재임한 국가, 직책, 취임·퇴임일을 입력하세요
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

            {countryId && historicalCountries.length > 0 && (
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
                        ? (historicalCountries as any[]).find((h: any) => h.id === historicalCountryId)?.name ?? '역사적 국가'
                        : '현대 국가 기준'}
                    </span>
                    <FiChevronDown size={20} />
                  </SelectTriggerButton>
                </FieldControl>
              </FieldRow>
            )}

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
              </FieldControl>
            </FieldRow>

            {(countryId || historicalCountryId) && cabinetOptions.length > 0 && (
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

            {(!positionDefinitionId || (positionDefinitions as any[]).length === 0) && (
              <>
                <FieldRow>
                  <FieldLabel>직책명 (직접 입력)</FieldLabel>
                  <FieldControl>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="예: 최고지도자"
                    />
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>직책명 (영문)</FieldLabel>
                  <FieldControl>
                    <Input
                      value={titleEn}
                      onChange={(e) => setTitleEn(e.target.value)}
                      placeholder="예: Supreme Leader"
                    />
                  </FieldControl>
                </FieldRow>
              </>
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
            />

            <FieldRow>
              <FieldLabel>대수/재위번호</FieldLabel>
              <FieldControl>
                <Input
                  type="number"
                  min={1}
                  value={regnalNumber}
                  onChange={(e) => setRegnalNumber(e.target.value)}
                  placeholder="선택"
                  title="역대 순번"
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
            <DeleteButton type="button" onClick={handleDelete} disabled={submitting}>
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
          setHistoricalCountryId(null)
          setPositionDefinitionId(null)
          setCountryModalOpen(false)
        }}
      />

      {countryId && historicalCountries.length > 0 && (
        <CountrySearchModal
          isOpen={historicalCountryModalOpen}
          onClose={() => setHistoricalCountryModalOpen(false)}
          title="역사적 국가 선택"
          placeholder="국가명으로 검색..."
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

      <SelectModal
        isOpen={positionModalOpen}
        onClose={() => setPositionModalOpen(false)}
        title="직책명 선택"
        options={positionTitleOptions}
        selectedValue={positionDefinitionId ?? OTHER_POSITION_VALUE}
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
    </FormSidePanel>
  )
}
