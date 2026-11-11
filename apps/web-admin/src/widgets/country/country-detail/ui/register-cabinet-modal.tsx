import React, { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import {
  FiChevronDown,
  FiChevronRight,
  FiInfo,
  FiSearch,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import { getUploadImageUrl, uploadImage } from '@/shared/api/upload'
import {
  ModalCloseButton,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
} from '@/shared/ui/modal/modal.styles'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import {
  DateFieldsRow,
  FieldControl,
  FieldLabel,
  FieldRow,
  FormRows,
  Input as RegisterInput,
  Required,
  SubmitButton,
  TabButton,
  TabNavigation,
} from '@/shared/ui/register-form-layout'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'
import { formatDate, getPersonName } from './cabinets-section.helpers'
import * as CabS from './cabinets-section.styled'

export type RegisterCabinetFlow = 'select' | 'new' | 'collective'

export function RegisterCabinetModal({
  registerFlow,
  setRegisterFlow,
  headTenuresForRegister,
  handleRegisterCabinet,
  handleRegisterCollectiveCabinet,
  handleRegisterNewHeadAndCabinet,
  registerCabinetSubmitting,
  setRegisterCabinetModalOpen,
  allPersons,
  headPositionOptions,
  newHeadPersonId,
  setNewHeadPersonId,
  newHeadPositionDefId,
  setNewHeadPositionDefId,
  newHeadTermNumber,
  setNewHeadTermNumber,
  newHeadSubTermNumber,
  setNewHeadSubTermNumber,
  newCabinetName,
  setNewCabinetName,
  newHeadAppointmentMethod,
  setNewHeadAppointmentMethod,
  newHeadEndReason,
  setNewHeadEndReason,
  newHeadEndReasonDetail,
  setNewHeadEndReasonDetail,
  newHeadNotes,
  setNewHeadNotes,
  newHeadStartDate,
  setNewHeadStartDate,
  newHeadEndDate,
  setNewHeadEndDate,
  country,
  registerTargetHistoricalCountryId,
  setRegisterTargetHistoricalCountryId,
  resetNewHeadForm,
}: {
  registerFlow: RegisterCabinetFlow
  setRegisterFlow: (flow: RegisterCabinetFlow) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headTenuresForRegister: any[]
  handleRegisterCabinet: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tenure: any,
    options?: { name?: string; startDate?: string; endDate?: string },
  ) => Promise<void>
  handleRegisterCollectiveCabinet: (payload: {
    name: string
    startDate: string
    endDate?: string
    historicalCountryId?: string | null
  }) => Promise<void>
  handleRegisterNewHeadAndCabinet: () => Promise<void>
  registerCabinetSubmitting: boolean
  setRegisterCabinetModalOpen: (open: boolean) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allPersons: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headPositionOptions: any[]
  newHeadPersonId: string | null
  setNewHeadPersonId: (personId: string | null) => void
  newHeadPositionDefId: string | null
  setNewHeadPositionDefId: (defId: string | null) => void
  newHeadTermNumber: string
  setNewHeadTermNumber: (value: string) => void
  newHeadSubTermNumber: string
  setNewHeadSubTermNumber: (value: string) => void
  newCabinetName: string
  setNewCabinetName: (value: string) => void
  newHeadAppointmentMethod: string
  setNewHeadAppointmentMethod: (value: string) => void
  newHeadEndReason: string
  setNewHeadEndReason: (value: string) => void
  newHeadEndReasonDetail: string
  setNewHeadEndReasonDetail: (value: string) => void
  newHeadNotes: string
  setNewHeadNotes: (value: string) => void
  newHeadStartDate: string
  setNewHeadStartDate: (value: string) => void
  newHeadEndDate: string
  setNewHeadEndDate: (value: string) => void
  country: UnifiedCountry
  registerTargetHistoricalCountryId: string | null
  setRegisterTargetHistoricalCountryId: (hcId: string | null) => void
  resetNewHeadForm: () => void
}) {
  const [headTenureFilter, setHeadTenureFilter] = useState('')
  const [selectCabinetName, setSelectCabinetName] = useState('')
  const [selectCabinetStartDate, setSelectCabinetStartDate] = useState('')
  const [selectCabinetEndDate, setSelectCabinetEndDate] = useState('')
  const [collectiveName, setCollectiveName] = useState('')
  const [collectiveStartDate, setCollectiveStartDate] = useState('')
  const [collectiveEndDate, setCollectiveEndDate] = useState('')
  const [personSelectOpen, setPersonSelectOpen] = useState(false)
  const [datePickerTarget, setDatePickerTarget] = useState<
    | 'newStart'
    | 'newEnd'
    | 'selectStart'
    | 'selectEnd'
    | 'collectiveStart'
    | 'collectiveEnd'
    | null
  >(null)

  const filteredHeadTenures = useMemo(() => {
    const query = headTenureFilter.trim().toLowerCase()
    if (!query) return headTenuresForRegister
    return headTenuresForRegister.filter((tenureItem) => {
      const name = getPersonName(tenureItem.person)
      const regnal = tenureItem.regnalName ?? ''
      const title =
        tenureItem.title ?? tenureItem.positionDefinition?.title ?? '수반'
      const startStr = formatDate(tenureItem.startDate)
      const endStr = tenureItem.endDate ? formatDate(tenureItem.endDate) : '현재'
      return `${name} ${regnal} ${title} ${startStr} ${endStr}`
        .toLowerCase()
        .includes(query)
    })
  }, [headTenuresForRegister, headTenureFilter])

  const close = () => {
    if (!registerCabinetSubmitting) {
      setRegisterCabinetModalOpen(false)
      setRegisterFlow('select')
      resetNewHeadForm()
    }
  }

  const activePickerDate =
    datePickerTarget === 'newStart'
      ? newHeadStartDate
      : datePickerTarget === 'newEnd'
        ? newHeadEndDate
        : datePickerTarget === 'selectStart'
          ? selectCabinetStartDate
          : datePickerTarget === 'selectEnd'
            ? selectCabinetEndDate
            : datePickerTarget === 'collectiveStart'
              ? collectiveStartDate
              : datePickerTarget === 'collectiveEnd'
                ? collectiveEndDate
                : ''

  const content = (
    <ModalOverlay
      role="dialog"
      aria-modal="true"
      aria-labelledby="cabinet-modal-title"
      onClick={(clickEvent) =>
        clickEvent.target === clickEvent.currentTarget && close()
      }
    >
      <CabS.CabinetModalBox
        onClick={(clickEvent) => clickEvent.stopPropagation()}
      >
        <ModalHeader>
          <ModalTitle id="cabinet-modal-title">
            행정부 · 내각 개설
          </ModalTitle>
          <ModalCloseButton type="button" onClick={close} aria-label="닫기">
            <FiX size={22} strokeWidth={2} />
          </ModalCloseButton>
        </ModalHeader>
        <CabS.CabinetModalBody>
          <CabS.CabinetTabWrap>
            <TabNavigation>
              <TabButton
                type="button"
                $active={registerFlow === 'select'}
                onClick={() => setRegisterFlow('select')}
              >
                기존 수반 · 군주에서 개설 (개각)
              </TabButton>
              <TabButton
                type="button"
                $active={registerFlow === 'new'}
                onClick={() => setRegisterFlow('new')}
              >
                새 수반 + 내각 동시 등록
              </TabButton>
              <TabButton
                type="button"
                $active={registerFlow === 'collective'}
                onClick={() => setRegisterFlow('collective')}
              >
                집단지도 · 과도정부
              </TabButton>
            </TabNavigation>
          </CabS.CabinetTabWrap>

          {registerFlow === 'select' ? (
            <>
              <CabS.CabinetFormDesc>
                <FiInfo size={20} />
                <span>
                  등록된 <strong>대통령·총리·군주(전제군주 친정 포함) 재임</strong>을
                  선택해 내각을 개설합니다. 이미 내각이 있는 수반도{' '}
                  <strong>개각(제2차·전시내각 등)</strong>으로 추가 내각을 만들 수
                  있습니다.
                </span>
              </CabS.CabinetFormDesc>
              <FormRows style={{ marginBottom: 14 }}>
                <FieldRow>
                  <FieldLabel>내각 명칭 (선택)</FieldLabel>
                  <FieldControl>
                    <RegisterInput
                      type="text"
                      placeholder="예: 루즈벨트 제2기 내각, 처칠 전시연립내각, 세종 의정부"
                      value={selectCabinetName}
                      onChange={(changeEvent) =>
                        setSelectCabinetName(changeEvent.target.value)
                      }
                    />
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>개각 기간 (선택)</FieldLabel>
                  <FieldControl $variant="datePair">
                    <DateFieldsRow>
                      <CabS.CabinetDateTrigger
                        type="button"
                        $hasValue={!!selectCabinetStartDate}
                        onClick={() => setDatePickerTarget('selectStart')}
                      >
                        <span>
                          {selectCabinetStartDate
                            ? formatDate(selectCabinetStartDate)
                            : '수반 취임일과 동일 (직접 지정)'}
                        </span>
                        <FiChevronDown size={18} />
                      </CabS.CabinetDateTrigger>
                      <CabS.CabinetDateTrigger
                        type="button"
                        $hasValue={!!selectCabinetEndDate}
                        onClick={() => setDatePickerTarget('selectEnd')}
                      >
                        <span>
                          {selectCabinetEndDate
                            ? formatDate(selectCabinetEndDate)
                            : '수반 퇴임일과 동일 (직접 지정)'}
                        </span>
                        <FiChevronDown size={18} />
                      </CabS.CabinetDateTrigger>
                    </DateFieldsRow>
                  </FieldControl>
                </FieldRow>
              </FormRows>
              {headTenuresForRegister.length === 0 ? (
                <CabS.CabinetSelectSection
                  style={{ minHeight: 200, justifyContent: 'center' }}
                >
                  <CabS.CabinetEmptyHint>
                    <FiUsers size={44} strokeWidth={1.5} />
                    <span>등록된 수반·군주 재임이 없습니다.</span>
                    <span>
                      <strong>새 수반 + 내각 동시 등록</strong> 또는{' '}
                      <strong>집단지도 · 과도정부</strong> 탭을 이용하세요.
                    </span>
                  </CabS.CabinetEmptyHint>
                </CabS.CabinetSelectSection>
              ) : (
                <CabS.CabinetSelectSection>
                  <CabS.CabinetSelectSectionTitle>
                    수반 · 군주 재임 목록 ({filteredHeadTenures.length}건)
                  </CabS.CabinetSelectSectionTitle>
                  <CabS.CabinetSearchWrap>
                    <CabS.CabinetSearchIcon>
                      <FiSearch size={16} />
                    </CabS.CabinetSearchIcon>
                    <RegisterInput
                      type="text"
                      placeholder="이름, 왕호, 직위, 기간 검색"
                      value={headTenureFilter}
                      onChange={(changeEvent) =>
                        setHeadTenureFilter(changeEvent.target.value)
                      }
                      style={{ paddingLeft: 44 }}
                    />
                  </CabS.CabinetSearchWrap>
                  <CabS.CabinetList>
                    {filteredHeadTenures.length === 0 ? (
                      <li>
                        <CabS.CabinetEmptyHint
                          style={{ margin: 0, padding: '36px 24px' }}
                        >
                          <span>
                            {headTenureFilter.trim()
                              ? '검색 결과가 없습니다.'
                              : '목록이 비어 있습니다.'}
                          </span>
                        </CabS.CabinetEmptyHint>
                      </li>
                    ) : (
                      filteredHeadTenures.map((tenureItem) => {
                        const termNum = tenureItem.ordinal
                        const termLabel =
                          termNum != null
                            ? tenureItem.subTermNumber != null
                              ? `제${termNum}대 ${tenureItem.subTermNumber}기 `
                              : `제${termNum}대 `
                            : ''
                        const positionTitle =
                          tenureItem.title ??
                          tenureItem.positionDefinition?.title ??
                          '수반'
                        const existingCount =
                          Number(tenureItem._existingCabinetCount ?? 0) || 0
                        const roleLabel =
                          tenureItem.isMonarchical === true
                            ? '군주 친정'
                            : tenureItem.positionType === 'HEAD_OF_STATE'
                              ? '국가원수'
                              : tenureItem.positionType === 'HEAD_OF_GOVERNMENT'
                                ? '정부수반'
                                : '수반'
                        const displayPerson =
                          tenureItem.regnalName?.trim() ||
                          getPersonName(tenureItem.person)
                        return (
                          <li key={tenureItem.id}>
                            <CabS.CabinetHeadTenureCard
                              type="button"
                              disabled={registerCabinetSubmitting}
                              onClick={() =>
                                handleRegisterCabinet(tenureItem, {
                                  name: selectCabinetName.trim() || undefined,
                                  startDate:
                                    selectCabinetStartDate.trim() || undefined,
                                  endDate:
                                    selectCabinetEndDate.trim() || undefined,
                                })
                              }
                            >
                              <CabS.CabinetHeadTenureCardMain>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  <CabS.CabinetHeadTenureCardBadge>
                                    {roleLabel}
                                  </CabS.CabinetHeadTenureCardBadge>
                                  {existingCount > 0 && (
                                    <CabS.CabinetHeadTenureCardBadge
                                      style={{ opacity: 0.8 }}
                                    >
                                      기존 내각 {existingCount}개 · 개각 추가
                                    </CabS.CabinetHeadTenureCardBadge>
                                  )}
                                </div>
                                <CabS.CabinetHeadTenureCardName>
                                  {displayPerson} · {termLabel}
                                  {positionTitle}
                                </CabS.CabinetHeadTenureCardName>
                                <CabS.CabinetHeadTenureCardMeta>
                                  {formatDate(tenureItem.startDate)} ~{' '}
                                  {tenureItem.endDate
                                    ? formatDate(tenureItem.endDate)
                                    : '현재'}
                                </CabS.CabinetHeadTenureCardMeta>
                              </CabS.CabinetHeadTenureCardMain>
                              <CabS.CabinetHeadTenureCardAction>
                                {existingCount > 0 ? '개각 개설' : '내각 개설'}
                                <FiChevronRight size={18} />
                              </CabS.CabinetHeadTenureCardAction>
                            </CabS.CabinetHeadTenureCard>
                          </li>
                        )
                      })
                    )}
                  </CabS.CabinetList>
                </CabS.CabinetSelectSection>
              )}
              <CabS.CabinetActions style={{ flexShrink: 0 }}>
                <CabS.CabinetCancelBtn type="button" onClick={close}>
                  취소
                </CabS.CabinetCancelBtn>
              </CabS.CabinetActions>
            </>
          ) : registerFlow === 'collective' ? (
            <>
              <CabS.CabinetFormDesc>
                <FiInfo size={20} />
                <span>
                  1인 수반이 없는{' '}
                  <strong>
                    집단지도체제 · 혁명위원회 · 과도정부 · 군정위원회
                  </strong>
                  (예: 스위스 연방평의회, 프랑스 공안위원회, 러시아 임시정부)를
                  개설하고 구성원을 각료로 배속합니다.
                </span>
              </CabS.CabinetFormDesc>
              <FormRows>
                {country.type === 'modern' &&
                  Array.isArray(country.historicalCountries) &&
                  country.historicalCountries.length > 0 && (
                    <FieldRow>
                      <FieldLabel>등록 대상 국가</FieldLabel>
                      <FieldControl>
                        <CabS.CabinetSelectNative
                          value={registerTargetHistoricalCountryId ?? ''}
                          onChange={(changeEvent) =>
                            setRegisterTargetHistoricalCountryId(
                              changeEvent.target.value || null,
                            )
                          }
                        >
                          <option value="">{country.name} (현대국가)</option>
                          {country.historicalCountries.map((histCountry) => (
                            <option key={histCountry.id} value={histCountry.id}>
                              {histCountry.name}
                            </option>
                          ))}
                        </CabS.CabinetSelectNative>
                      </FieldControl>
                    </FieldRow>
                  )}
                <FieldRow>
                  <FieldLabel>
                    행정부 · 위원회 명칭 <Required />
                  </FieldLabel>
                  <FieldControl>
                    <RegisterInput
                      type="text"
                      placeholder="예: 공안위원회, 스위스 연방평의회, 대한민국 임시정부 국무원"
                      value={collectiveName}
                      onChange={(changeEvent) =>
                        setCollectiveName(changeEvent.target.value)
                      }
                    />
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>
                    출범일 <Required /> / 종료일
                  </FieldLabel>
                  <FieldControl $variant="datePair">
                    <DateFieldsRow>
                      <CabS.CabinetDateTrigger
                        type="button"
                        $hasValue={!!collectiveStartDate}
                        onClick={() => setDatePickerTarget('collectiveStart')}
                      >
                        <span>
                          {collectiveStartDate
                            ? formatDate(collectiveStartDate)
                            : '출범일 선택'}
                        </span>
                        <FiChevronDown size={18} />
                      </CabS.CabinetDateTrigger>
                      <CabS.CabinetDateTrigger
                        type="button"
                        $hasValue={!!collectiveEndDate}
                        onClick={() => setDatePickerTarget('collectiveEnd')}
                      >
                        <span>
                          {collectiveEndDate
                            ? formatDate(collectiveEndDate)
                            : '종료일 선택 (선택)'}
                        </span>
                        <FiChevronDown size={18} />
                      </CabS.CabinetDateTrigger>
                    </DateFieldsRow>
                  </FieldControl>
                </FieldRow>
              </FormRows>
              <CabS.CabinetActions>
                <CabS.CabinetCancelBtn type="button" onClick={close}>
                  취소
                </CabS.CabinetCancelBtn>
                <SubmitButton
                  type="button"
                  disabled={
                    registerCabinetSubmitting ||
                    !collectiveName.trim() ||
                    !collectiveStartDate.trim()
                  }
                  onClick={() =>
                    handleRegisterCollectiveCabinet({
                      name: collectiveName.trim(),
                      startDate: collectiveStartDate.trim(),
                      endDate: collectiveEndDate.trim() || undefined,
                      historicalCountryId: registerTargetHistoricalCountryId,
                    })
                  }
                >
                  {registerCabinetSubmitting ? '등록 중…' : '등록'}
                </SubmitButton>
              </CabS.CabinetActions>
            </>
          ) : (
            <>
              <CabS.CabinetFormDesc>
                <FiInfo size={20} />
                <span>
                  핵심 재임 정보와 행정부 정보를 함께 입력하면 동일한 구조로
                  수반 재임과 행정부가 등록됩니다.
                </span>
              </CabS.CabinetFormDesc>
              <FormRows>
                {country.type === 'modern' &&
                  Array.isArray(country.historicalCountries) &&
                  country.historicalCountries.length > 0 && (
                    <FieldRow>
                      <FieldLabel>등록 대상 국가</FieldLabel>
                      <FieldControl>
                        <CabS.CabinetSelectNative
                          value={registerTargetHistoricalCountryId ?? ''}
                          onChange={(changeEvent) =>
                            setRegisterTargetHistoricalCountryId(
                              changeEvent.target.value || null,
                            )
                          }
                        >
                          <option value="">{country.name} (현대국가)</option>
                          {country.historicalCountries.map((histCountry) => (
                            <option key={histCountry.id} value={histCountry.id}>
                              {histCountry.name}
                            </option>
                          ))}
                        </CabS.CabinetSelectNative>
                      </FieldControl>
                    </FieldRow>
                  )}
                {country.type === 'historical' && (
                  <FieldRow>
                    <FieldLabel>등록 대상 국가</FieldLabel>
                    <FieldControl>
                      <CabS.CabinetSelectTrigger
                        type="button"
                        $hasValue
                        disabled
                        aria-label="등록 대상 국가"
                        style={{ cursor: 'default' }}
                      >
                        <span>{country.name}</span>
                      </CabS.CabinetSelectTrigger>
                    </FieldControl>
                  </FieldRow>
                )}
                <FieldRow>
                  <FieldLabel>대수 (선택)</FieldLabel>
                  <FieldControl>
                    <CabS.CabinetTermNumberWrap>
                      <RegisterInput
                        type="number"
                        min={1}
                        placeholder="제 N대"
                        value={newHeadTermNumber}
                        onChange={(changeEvent) =>
                          setNewHeadTermNumber(changeEvent.target.value)
                        }
                        aria-label="대수"
                      />
                    </CabS.CabinetTermNumberWrap>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>기수 (선택)</FieldLabel>
                  <FieldControl>
                    <CabS.CabinetTermNumberWrap>
                      <RegisterInput
                        type="number"
                        min={1}
                        placeholder="N기 (예: 1, 2)"
                        value={newHeadSubTermNumber}
                        onChange={(changeEvent) =>
                          setNewHeadSubTermNumber(changeEvent.target.value)
                        }
                        aria-label="기수"
                        title="같은 대수 내 복수 임기 구분 (예: 클린턴 42대 1기/2기)"
                      />
                    </CabS.CabinetTermNumberWrap>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>
                    인물 <Required />
                  </FieldLabel>
                  <FieldControl>
                    <CabS.CabinetSelectTrigger
                      type="button"
                      $hasValue={!!newHeadPersonId}
                      onClick={() => setPersonSelectOpen(true)}
                      aria-label="수반 인물 선택"
                    >
                      <span>
                        {newHeadPersonId
                          ? getPersonName(
                              allPersons.find(
                                (personItem) => personItem.id === newHeadPersonId,
                              ),
                            )
                          : '인물 선택'}
                      </span>
                      <FiChevronDown size={18} />
                    </CabS.CabinetSelectTrigger>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>
                    직위 (수반) <Required />
                  </FieldLabel>
                  <FieldControl>
                    <CabS.CabinetSelectNative
                      value={newHeadPositionDefId ?? ''}
                      onChange={(changeEvent) =>
                        setNewHeadPositionDefId(changeEvent.target.value || null)
                      }
                      aria-label="직위 선택"
                    >
                      <option value="">선택</option>
                      {headPositionOptions.map((defItem) => (
                        <option key={defItem.id} value={defItem.id}>
                          {defItem.title}
                        </option>
                      ))}
                    </CabS.CabinetSelectNative>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>
                    취임일 <Required /> / 퇴임일
                  </FieldLabel>
                  <FieldControl $variant="datePair">
                    <DateFieldsRow>
                      <CabS.CabinetDateTrigger
                        type="button"
                        $hasValue={!!newHeadStartDate}
                        onClick={() => setDatePickerTarget('newStart')}
                        aria-label="취임일 선택"
                      >
                        <span>
                          {newHeadStartDate
                            ? formatDate(newHeadStartDate)
                            : '취임일 선택'}
                        </span>
                        <FiChevronDown size={18} />
                      </CabS.CabinetDateTrigger>
                      <CabS.CabinetDateTrigger
                        type="button"
                        $hasValue={!!newHeadEndDate}
                        onClick={() => setDatePickerTarget('newEnd')}
                        aria-label="퇴임일 선택"
                      >
                        <span>
                          {newHeadEndDate
                            ? formatDate(newHeadEndDate)
                            : '퇴임일 선택'}
                        </span>
                        <FiChevronDown size={18} />
                      </CabS.CabinetDateTrigger>
                    </DateFieldsRow>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>행정부 이름 (선택)</FieldLabel>
                  <FieldControl>
                    <RegisterInput
                      type="text"
                      placeholder="예: 루즈벨트 제1기"
                      value={newCabinetName}
                      onChange={(changeEvent) =>
                        setNewCabinetName(changeEvent.target.value)
                      }
                      onKeyDown={(keyEvent) => {
                        if (keyEvent.key === 'Enter') {
                          void handleRegisterNewHeadAndCabinet()
                        }
                      }}
                    />
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>임명 방식 (선택)</FieldLabel>
                  <FieldControl>
                    <CabS.CabinetSelectNative
                      value={newHeadAppointmentMethod}
                      onChange={(changeEvent) =>
                        setNewHeadAppointmentMethod(changeEvent.target.value)
                      }
                    >
                      <option value="">선택 안 함</option>
                      <option value="DIRECT_ELECTION">직접 선거</option>
                      <option value="INDIRECT_ELECTION">간접 선거</option>
                      <option value="PARLIAMENTARY_ELECTION">의회 선출</option>
                      <option value="APPOINTMENT">임명</option>
                      <option value="HEREDITARY">세습</option>
                      <option value="COUP">쿠데타 / 혁명</option>
                      <option value="OTHER">기타</option>
                    </CabS.CabinetSelectNative>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>퇴임 사유 (선택)</FieldLabel>
                  <FieldControl>
                    <CabS.CabinetSelectNative
                      value={newHeadEndReason}
                      onChange={(changeEvent) =>
                        setNewHeadEndReason(changeEvent.target.value)
                      }
                    >
                      <option value="">선택 안 함</option>
                      <option value="TERM_COMPLETED">임기 만료</option>
                      <option value="RESIGNATION">사임 / 사퇴</option>
                      <option value="ABDICATION">자진 퇴위</option>
                      <option value="SUCCESSION_TRANSFER">양위 / 선위</option>
                      <option value="REMOVAL">폐위 / 해임</option>
                      <option value="IMPEACHMENT">탄핵</option>
                      <option value="DEATH_IN_OFFICE">재임 중 사망</option>
                      <option value="OVERTHROWN">쿠데타 / 혁명으로 축출</option>
                      <option value="WAR_DEFEAT">전쟁 패배</option>
                      <option value="STATE_DISSOLVED">국가 멸망</option>
                      <option value="OTHER">기타</option>
                    </CabS.CabinetSelectNative>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>퇴임 사유 상세</FieldLabel>
                  <FieldControl>
                    <CabS.HeadTenureInfoEditorWrap>
                      <RichTextEditor
                        value={newHeadEndReasonDetail}
                        onChange={setNewHeadEndReasonDetail}
                        showTitle={false}
                        placeholder="퇴임 배경, 상세 사유 등을 자유롭게 기술하세요."
                        onImageUpload={async (file) => {
                          const result = await uploadImage(file, 'persons')
                          return (
                            getUploadImageUrl(result.url) || (result.url ?? '')
                          )
                        }}
                      />
                    </CabS.HeadTenureInfoEditorWrap>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>취임 배경 / 비고</FieldLabel>
                  <FieldControl>
                    <CabS.HeadTenureInfoEditorWrap>
                      <RichTextEditor
                        value={newHeadNotes}
                        onChange={setNewHeadNotes}
                        showTitle={false}
                        placeholder="취임 배경, 임명 경위 등 특이사항을 기술하세요."
                        onImageUpload={async (file) => {
                          const result = await uploadImage(file, 'persons')
                          return (
                            getUploadImageUrl(result.url) || (result.url ?? '')
                          )
                        }}
                      />
                    </CabS.HeadTenureInfoEditorWrap>
                  </FieldControl>
                </FieldRow>
              </FormRows>
              <CabS.CabinetActions>
                <CabS.CabinetCancelBtn type="button" onClick={close}>
                  취소
                </CabS.CabinetCancelBtn>
                <SubmitButton
                  type="button"
                  disabled={
                    registerCabinetSubmitting ||
                    !newHeadPersonId ||
                    !newHeadPositionDefId ||
                    !newHeadStartDate.trim()
                  }
                  onClick={() => void handleRegisterNewHeadAndCabinet()}
                >
                  {registerCabinetSubmitting ? '등록 중…' : '등록'}
                </SubmitButton>
              </CabS.CabinetActions>
            </>
          )}
        </CabS.CabinetModalBody>
      </CabS.CabinetModalBox>
      {(personSelectOpen || datePickerTarget !== null) && (
        <CabS.CabinetSubModalLayer>
          {personSelectOpen && (
            <PersonSelectModal
              persons={allPersons}
              selectedPersonId={newHeadPersonId ?? ''}
              onSelect={(personId) => {
                setNewHeadPersonId(personId)
                setPersonSelectOpen(false)
              }}
              onClose={() => setPersonSelectOpen(false)}
            />
          )}
          <DatePickerModal
            isOpen={datePickerTarget !== null}
            onClose={() => setDatePickerTarget(null)}
            onSelect={(selectedDate) => {
              if (datePickerTarget === 'newStart') {
                setNewHeadStartDate(selectedDate)
              } else if (datePickerTarget === 'newEnd') {
                setNewHeadEndDate(selectedDate)
              } else if (datePickerTarget === 'selectStart') {
                setSelectCabinetStartDate(selectedDate)
              } else if (datePickerTarget === 'selectEnd') {
                setSelectCabinetEndDate(selectedDate)
              } else if (datePickerTarget === 'collectiveStart') {
                setCollectiveStartDate(selectedDate)
              } else if (datePickerTarget === 'collectiveEnd') {
                setCollectiveEndDate(selectedDate)
              }
              setDatePickerTarget(null)
            }}
            initialDate={activePickerDate || undefined}
            title="날짜 선택"
          />
        </CabS.CabinetSubModalLayer>
      )}
    </ModalOverlay>
  )

  return createPortal(content, document.body)
}
