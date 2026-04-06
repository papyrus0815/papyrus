import React, { useCallback, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { useQuery } from '@tanstack/react-query'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { useHistoricalCountriesByModernCountry } from '@/features/country/api'
import { toast } from 'react-hot-toast'
import { FiChevronDown, FiInfo, FiSave, FiX } from 'react-icons/fi'
import type { CreateGovernmentPositionTenureDto } from '@/shared/api/person-career'
import { getAllPersons } from '@/shared/api/persons'
import { CountrySearchModal } from '@/shared/ui/country-search-modal/country-search-modal'
import { DateRangeField } from '@/shared/ui/form-fields/date-range-field'
import { PersonSelectField } from '@/shared/ui/form-fields/person-select-field'
import {
  ModalCloseButton,
  ModalOverlay,
  ModalSubtitle,
  ModalTitle,
} from '@/shared/ui/modal/modal.styles'
import {
  FieldControl,
  FieldHint,
  FieldLabel,
  FieldRow,
  FormRows,
  FormSectionInner,
  Input,
  Required,
} from '@/shared/ui/register-form-layout'
import {
  SelectModal,
  type SelectOption,
} from '@/shared/ui/select-modal/select-modal'

import * as CabS from './cabinets-section.styled'
import * as Ms from './register-monarch-modal.styles'

export function RegisterMonarchModal({
  country,
  isHistorical,
  countryId,
  historicalCountryId,
  headOfStatePositionOptions,
  submitting,
  onClose,
  onSubmit,
}: {
  country: UnifiedCountry
  isHistorical: boolean
  countryId: string | undefined
  historicalCountryId: string | undefined
  headOfStatePositionOptions: { id: string; title: string; titleEn?: string | null }[]
  submitting: boolean
  onClose: () => void
  onSubmit: (dto: CreateGovernmentPositionTenureDto) => void | Promise<void>
}) {
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
  const [endDate, setEndDate] = useState('')
  const [regnalNumber, setRegnalNumber] = useState('')
  const [showOnEventsPage, setShowOnEventsPage] = useState(true)

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
    enabled: personSelectModalOpen || !!selectedPersonId,
  })

  const positionTitleOptions: SelectOption<string>[] = useMemo(
    () =>
      headOfStatePositionOptions.map((d) => ({
        value: d.id,
        label: d.title,
      })),
    [headOfStatePositionOptions],
  )

  const selectedPositionDefinition = selectedPositionDefinitionId
    ? headOfStatePositionOptions.find((d) => d.id === selectedPositionDefinitionId)
    : null

  const positionTitleLabel = selectedPositionDefinition
    ? selectedPositionDefinition.title
    : '직책 선택'

  const selectedPerson = useMemo(() => {
    if (!selectedPersonId) return null
    return (
      (allPersonsForModal as { id: string }[]).find(
        (p) => p.id === selectedPersonId,
      ) ?? null
    )
  }, [allPersonsForModal, selectedPersonId])

  const resetForm = useCallback(() => {
    setSelectedAffinityHistoricalId(null)
    setSelectedPersonId('')
    setSelectedPositionDefinitionId(null)
    setRegnalName('')
    setStartDate('')
    setEndDate('')
    setRegnalNumber('')
    setShowOnEventsPage(true)
  }, [])

  const close = () => {
    if (!submitting) {
      resetForm()
      onClose()
    }
  }

  const handlePositionTitleSelect = (value: string) => {
    setPositionTitleModalOpen(false)
    const def = headOfStatePositionOptions.find((d) => d.id === value)
    if (def) setSelectedPositionDefinitionId(def.id)
  }

  const handleSave = async () => {
    if (
      !selectedPersonId ||
      !selectedPositionDefinitionId ||
      !startDate.trim() ||
      !selectedPositionDefinition
    ) {
      toast.error('인물, 직책명, 취임일을 입력해 주세요.')
      return
    }
    const notesValue = regnalName.trim()
      ? `왕명: ${regnalName.trim()}`
      : undefined
    const num =
      regnalNumber.trim() === ''
        ? undefined
        : parseInt(regnalNumber.trim(), 10) || undefined
    const payload: CreateGovernmentPositionTenureDto = {
      personId: selectedPersonId,
      positionType: 'HEAD_OF_STATE',
      positionDefinitionId: selectedPositionDefinition.id,
      countryId: selectedAffinityHistoricalId
        ? undefined
        : (countryId ?? undefined),
      historicalCountryId:
        selectedAffinityHistoricalId ?? historicalCountryId ?? undefined,
      startDate: startDate.trim(),
      endDate: endDate.trim() || undefined,
      termNumber: num,
      regnalNumber: num,
      notes: notesValue,
      showPositionInfo: showOnEventsPage,
      /** 군주 재위는 행정부(내각)가 아님 — Cabinet(행정부) 레코드를 만들지 않음 */
      sovereignReignOnly: true,
    }
    await onSubmit(payload)
  }

  const canSave =
    !!selectedPersonId &&
    !!selectedPositionDefinitionId &&
    !!startDate.trim() &&
    headOfStatePositionOptions.length > 0

  const content = (
    <ModalOverlay
      role="dialog"
      aria-modal="true"
      aria-labelledby="monarch-modal-title"
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <CabS.MonarchModalBox onClick={(e) => e.stopPropagation()}>
        <CabS.MonarchModalHeader>
          <CabS.MonarchModalHeaderText>
            <ModalTitle id="monarch-modal-title">군주 등록</ModalTitle>
            <ModalSubtitle>
              행정부(내각)를 만들지 않습니다. 국가 원수 재위 기간만 등록합니다.
            </ModalSubtitle>
          </CabS.MonarchModalHeaderText>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexShrink: 0,
            }}
          >
            <Ms.MonarchSaveButton
              type="button"
              disabled={submitting || !canSave}
              onClick={() => handleSave()}
            >
              <FiSave size={16} />
              {submitting ? '저장 중…' : '저장'}
            </Ms.MonarchSaveButton>
            <ModalCloseButton type="button" onClick={close} aria-label="닫기">
              <FiX size={22} strokeWidth={2} />
            </ModalCloseButton>
          </div>
        </CabS.MonarchModalHeader>
        <CabS.MonarchModalBody>
          <FormSectionInner>
            {headOfStatePositionOptions.length === 0 && (
              <CabS.MonarchFormDescWarning>
                <FiInfo size={20} />
                <span>
                  이 국가 범위에 <strong>국가 원수</strong> 직위 정의가 없습니다.
                  국가 상세의 직위 정의에서 먼저 추가해 주세요.
                </span>
              </CabS.MonarchFormDescWarning>
            )}
            <Ms.MonarchSubSectionTitle>기본정보</Ms.MonarchSubSectionTitle>
            <Ms.MonarchSectionHint>
              재임 기간·직책·인물 등 기본 정보를 입력합니다.
            </Ms.MonarchSectionHint>
            <FormRows>
              {!isHistorical && hasSubordinateHistorical && (
                <FieldRow>
                  <FieldLabel>소속 국가</FieldLabel>
                  <FieldControl>
                    <Ms.MonarchSelectTriggerButton
                      type="button"
                      onClick={() => setAffinityCountryModalOpen(true)}
                      $hasValue
                    >
                      <span>
                        {selectedAffinityHistoricalId
                          ? ((subordinateHistorical as { id: string; name: string }[]).find(
                              (h) => h.id === selectedAffinityHistoricalId,
                            )?.name ?? '역사적 국가')
                          : `현대 국가 (현재: ${country.name})`}
                      </span>
                      <FiChevronDown size={20} />
                    </Ms.MonarchSelectTriggerButton>
                    <FieldHint>
                      현대 국가 또는 연결된 하위 역사적 국가 중 하나를 선택하세요.
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
                persons={allPersonsForModal as any}
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
                  <Ms.MonarchSelectTriggerButton
                    type="button"
                    onClick={() => setPositionTitleModalOpen(true)}
                    $hasValue={selectedPositionDefinitionId != null}
                    disabled={headOfStatePositionOptions.length === 0}
                  >
                    <span>{positionTitleLabel}</span>
                    <FiChevronDown size={20} />
                  </Ms.MonarchSelectTriggerButton>
                </FieldControl>
              </FieldRow>
              <FieldRow>
                <FieldLabel>왕명</FieldLabel>
                <FieldControl>
                  <Input
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
                    placeholder="예: 4 (세종), 14 (루이 14세), 266 (프란치스코)"
                    title="역대 순번"
                  />
                  <FieldHint>
                    역대 순번. 동아시아(제4대)·서양 군주(14세)·교황(266대) 등
                    숫자만 입력
                  </FieldHint>
                </FieldControl>
              </FieldRow>
              <FieldRow>
                <FieldLabel>사건 페이지 노출</FieldLabel>
                <FieldControl>
                  <Ms.MonarchEventsPageCheckWrap>
                    <Ms.MonarchCheckboxLabelRow>
                      <input
                        type="checkbox"
                        id="monarch-register-show-on-events"
                        checked={showOnEventsPage}
                        onChange={(e) =>
                          setShowOnEventsPage(e.target.checked)
                        }
                      />
                      <label htmlFor="monarch-register-show-on-events">
                        연대표·사건 목록에 표시
                      </label>
                    </Ms.MonarchCheckboxLabelRow>
                    <FieldHint>
                      역대 수반 토글 시 목록에 포함됩니다.
                    </FieldHint>
                  </Ms.MonarchEventsPageCheckWrap>
                </FieldControl>
              </FieldRow>
            </FormRows>
            <Ms.MonarchFormActions>
              <Ms.MonarchResetButton
                type="button"
                onClick={resetForm}
                disabled={submitting}
              >
                초기화
              </Ms.MonarchResetButton>
            </Ms.MonarchFormActions>
          </FormSectionInner>
        </CabS.MonarchModalBody>
      </CabS.MonarchModalBox>

      <SelectModal
        isOpen={positionTitleModalOpen}
        onClose={() => setPositionTitleModalOpen(false)}
        title="직책명 선택"
        options={positionTitleOptions}
        selectedValue={selectedPositionDefinitionId ?? ''}
        onSelect={handlePositionTitleSelect}
      />

      {!isHistorical && hasSubordinateHistorical && (
        <CountrySearchModal
          isOpen={affinityCountryModalOpen}
          onClose={() => setAffinityCountryModalOpen(false)}
          title="소속 국가 선택"
          placeholder="국가명으로 검색..."
          modernCountries={[
            {
              id: '',
              name: `현대 국가 (현재: ${country.name})`,
              flagEmoji: (country as { flagEmoji?: string | null }).flagEmoji ?? null,
            },
          ]}
          historicalCountries={(subordinateHistorical as any[]).map((h: any) => ({
            id: h.id,
            name: h.name,
            flagEmoji: h.flagEmoji ?? null,
            enName: h.enName,
            startYear: h.startYear,
            endYear: h.endYear,
          }))}
          selectedCountryId={selectedAffinityHistoricalId ?? ''}
          onSelect={({ id }) => setSelectedAffinityHistoricalId(id || null)}
        />
      )}
    </ModalOverlay>
  )

  return createPortal(content, document.body)
}
