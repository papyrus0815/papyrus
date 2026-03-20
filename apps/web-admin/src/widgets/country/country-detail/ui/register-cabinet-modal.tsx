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
import { formatDate, getPersonName } from './cabinets-section.helpers'
import * as CabS from './cabinets-section.styled'

export function RegisterCabinetModal({
  registerFlow,
  setRegisterFlow,
  headTenuresForRegister,
  handleRegisterCabinet,
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
  registerFlow: 'select' | 'new'
  setRegisterFlow: (f: 'select' | 'new') => void
  headTenuresForRegister: any[]
  handleRegisterCabinet: (t: any) => Promise<void>
  handleRegisterNewHeadAndCabinet: () => Promise<void>
  registerCabinetSubmitting: boolean
  setRegisterCabinetModalOpen: (v: boolean) => void
  allPersons: any[]
  headPositionOptions: any[]
  newHeadPersonId: string | null
  setNewHeadPersonId: (v: string | null) => void
  newHeadPositionDefId: string | null
  setNewHeadPositionDefId: (v: string | null) => void
  newHeadTermNumber: string
  setNewHeadTermNumber: (v: string) => void
  newHeadSubTermNumber: string
  setNewHeadSubTermNumber: (v: string) => void
  newCabinetName: string
  setNewCabinetName: (v: string) => void
  newHeadAppointmentMethod: string
  setNewHeadAppointmentMethod: (v: string) => void
  newHeadEndReason: string
  setNewHeadEndReason: (v: string) => void
  newHeadEndReasonDetail: string
  setNewHeadEndReasonDetail: (v: string) => void
  newHeadNotes: string
  setNewHeadNotes: (v: string) => void
  newHeadStartDate: string
  setNewHeadStartDate: (v: string) => void
  newHeadEndDate: string
  setNewHeadEndDate: (v: string) => void
  country: UnifiedCountry
  registerTargetHistoricalCountryId: string | null
  setRegisterTargetHistoricalCountryId: (v: string | null) => void
  resetNewHeadForm: () => void
}) {
  const [headTenureFilter, setHeadTenureFilter] = useState('')
  const [personSelectOpen, setPersonSelectOpen] = useState(false)
  const [startDatePickerOpen, setStartDatePickerOpen] = useState(false)
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false)
  const filteredHeadTenures = useMemo(() => {
    const q = headTenureFilter.trim().toLowerCase()
    if (!q) return headTenuresForRegister
    return headTenuresForRegister.filter((t: any) => {
      const name = getPersonName(t.person)
      const title = t.positionDefinition?.title ?? t.title ?? '수반'
      const startStr = formatDate(t.startDate)
      const endStr = t.endDate ? formatDate(t.endDate) : '현재'
      return `${name} ${title} ${startStr} ${endStr}`.toLowerCase().includes(q)
    })
  }, [headTenuresForRegister, headTenureFilter])

  const close = () => {
    if (!registerCabinetSubmitting) {
      setRegisterCabinetModalOpen(false)
      setRegisterFlow('select')
      resetNewHeadForm()
    }
  }

  const content = (
    <ModalOverlay
      role="dialog"
      aria-modal="true"
      aria-labelledby="cabinet-modal-title"
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <CabS.CabinetModalBox onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle id="cabinet-modal-title">행정부 등록</ModalTitle>
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
                기존 수반 선택
              </TabButton>
              <TabButton
                type="button"
                $active={registerFlow === 'new'}
                onClick={() => setRegisterFlow('new')}
              >
                새 수반 등록
              </TabButton>
            </TabNavigation>
          </CabS.CabinetTabWrap>

          {registerFlow === 'select' ? (
            <>
              <CabS.CabinetFormDesc>
                <FiInfo size={20} />
                <span>
                  이 국가의 <strong>수반(국가원수·정부수반) 재임</strong> 중,
                  아직 행정부가 연결되지 않은 재임만 표시됩니다. 항목을 선택하면
                  해당 재임으로 행정부가 생성됩니다.
                </span>
              </CabS.CabinetFormDesc>
              {headTenuresForRegister.length === 0 ? (
                <CabS.CabinetSelectSection
                  style={{ minHeight: 200, justifyContent: 'center' }}
                >
                  <CabS.CabinetEmptyHint>
                    <FiUsers size={44} strokeWidth={1.5} />
                    <span>등록된 수반 재임이 없습니다.</span>
                    <span>
                      <strong>새 수반 등록</strong> 탭에서 먼저 수반을
                      등록하세요.
                    </span>
                  </CabS.CabinetEmptyHint>
                </CabS.CabinetSelectSection>
              ) : (
                <CabS.CabinetSelectSection>
                  <CabS.CabinetSelectSectionTitle>
                    수반 재임 목록
                  </CabS.CabinetSelectSectionTitle>
                  <CabS.CabinetSearchWrap>
                    <CabS.CabinetSearchIcon>
                      <FiSearch size={16} />
                    </CabS.CabinetSearchIcon>
                    <RegisterInput
                      type="text"
                      placeholder="이름, 직위, 기간 검색"
                      value={headTenureFilter}
                      onChange={(e) => setHeadTenureFilter(e.target.value)}
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
                      filteredHeadTenures.map((t: any) => {
                        const termNum = t.termNumber ?? t.regnalNumber
                        const termLabel =
                          termNum != null
                            ? t.subTermNumber != null
                              ? `제${termNum}대 ${t.subTermNumber}기 `
                              : `제${termNum}대 `
                            : ''
                        const positionTitle =
                          t.positionDefinition?.title ?? t.title ?? '수반'
                        const roleLabel =
                          t.positionType === 'HEAD_OF_STATE'
                            ? '국가원수'
                            : t.positionType === 'HEAD_OF_GOVERNMENT'
                              ? '정부수반'
                              : '수반'
                        return (
                          <li key={t.id}>
                            <CabS.CabinetHeadTenureCard
                              type="button"
                              disabled={registerCabinetSubmitting}
                              onClick={() => handleRegisterCabinet(t)}
                            >
                              <CabS.CabinetHeadTenureCardMain>
                                <CabS.CabinetHeadTenureCardBadge>
                                  {roleLabel}
                                </CabS.CabinetHeadTenureCardBadge>
                                <CabS.CabinetHeadTenureCardName>
                                  {getPersonName(t.person)} · {termLabel}
                                  {positionTitle}
                                </CabS.CabinetHeadTenureCardName>
                                <CabS.CabinetHeadTenureCardMeta>
                                  {formatDate(t.startDate)} ~{' '}
                                  {t.endDate ? formatDate(t.endDate) : '현재'}
                                </CabS.CabinetHeadTenureCardMeta>
                              </CabS.CabinetHeadTenureCardMain>
                              <CabS.CabinetHeadTenureCardAction>
                                선택
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
                {/* 현대국가인 경우: 어느 국가(하위 역사국가 포함)로 등록할지 선택 */}
                {country.type === 'modern' &&
                  Array.isArray(country.historicalCountries) &&
                  country.historicalCountries.length > 0 && (
                    <FieldRow>
                      <FieldLabel>등록 대상 국가</FieldLabel>
                      <FieldControl>
                        <CabS.CabinetSelectNative
                          value={registerTargetHistoricalCountryId ?? ''}
                          onChange={(e) =>
                            setRegisterTargetHistoricalCountryId(
                              e.target.value || null,
                            )
                          }
                        >
                          <option value="">{country.name} (현대국가)</option>
                          {country.historicalCountries.map((hc) => (
                            <option key={hc.id} value={hc.id}>
                              {hc.name}
                            </option>
                          ))}
                        </CabS.CabinetSelectNative>
                      </FieldControl>
                    </FieldRow>
                  )}
                {/* 역사국가인 경우: 소속 국가 읽기 전용 표시 */}
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
                        onChange={(e) => setNewHeadTermNumber(e.target.value)}
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
                        onChange={(e) =>
                          setNewHeadSubTermNumber(e.target.value)
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
                                (p: any) => p.id === newHeadPersonId,
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
                      onChange={(e) =>
                        setNewHeadPositionDefId(e.target.value || null)
                      }
                      aria-label="직위 선택"
                    >
                      <option value="">선택</option>
                      {headPositionOptions.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {d.title}
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
                        onClick={() => setStartDatePickerOpen(true)}
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
                        onClick={() => setEndDatePickerOpen(true)}
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
                      onChange={(e) => setNewCabinetName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRegisterNewHeadAndCabinet()
                      }}
                    />
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>임명 방식 (선택)</FieldLabel>
                  <FieldControl>
                    <CabS.CabinetSelectNative
                      value={newHeadAppointmentMethod}
                      onChange={(e) =>
                        setNewHeadAppointmentMethod(e.target.value)
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
                      onChange={(e) => setNewHeadEndReason(e.target.value)}
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
                    <CabS.EditingTextarea
                      placeholder="퇴임 배경, 상세 사유 등을 자유롭게 기술하세요."
                      value={newHeadEndReasonDetail}
                      onChange={(e) =>
                        setNewHeadEndReasonDetail(e.target.value)
                      }
                      rows={4}
                    />
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>취임 배경 / 비고</FieldLabel>
                  <FieldControl>
                    <CabS.EditingTextarea
                      placeholder="취임 배경, 임명 경위 등 특이사항을 기술하세요."
                      value={newHeadNotes}
                      onChange={(e) => setNewHeadNotes(e.target.value)}
                      rows={3}
                    />
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
                  onClick={() => handleRegisterNewHeadAndCabinet()}
                >
                  {registerCabinetSubmitting ? '등록 중…' : '등록'}
                </SubmitButton>
              </CabS.CabinetActions>
            </>
          )}
        </CabS.CabinetModalBody>
      </CabS.CabinetModalBox>
      {(personSelectOpen || startDatePickerOpen || endDatePickerOpen) && (
        <CabS.CabinetSubModalLayer>
          {personSelectOpen && (
            <PersonSelectModal
              persons={allPersons}
              selectedPersonId={newHeadPersonId ?? ''}
              onSelect={(personId, _personName) => {
                setNewHeadPersonId(personId)
                setPersonSelectOpen(false)
              }}
              onClose={() => setPersonSelectOpen(false)}
            />
          )}
          <DatePickerModal
            isOpen={startDatePickerOpen}
            onClose={() => setStartDatePickerOpen(false)}
            onSelect={(date) => {
              setNewHeadStartDate(date)
              setStartDatePickerOpen(false)
            }}
            initialDate={newHeadStartDate || undefined}
            title="취임일 선택"
          />
          <DatePickerModal
            isOpen={endDatePickerOpen}
            onClose={() => setEndDatePickerOpen(false)}
            onSelect={(date) => {
              setNewHeadEndDate(date)
              setEndDatePickerOpen(false)
            }}
            initialDate={newHeadEndDate || undefined}
            title="퇴임일 선택"
          />
        </CabS.CabinetSubModalLayer>
      )}
    </ModalOverlay>
  )

  return createPortal(content, document.body)
}
