/**
 * 회담/외교 이벤트 전용 폼 컴포넌트
 */
import React, { useState } from 'react'

import {
  FiCalendar,
  FiClock,
  FiEdit2,
  FiFileText,
  FiGlobe,
  FiInfo,
  FiMapPin,
  FiPlus,
  FiTrash2,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { CountryResponseDto } from '@/shared/api/countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import type { PersonResponseDto } from '@/shared/api/persons'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { CountrySelectModal } from '@/shared/ui/country-select-modal/country-select-modal'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import {
  FormInput as Input,
  FormTextarea as TextArea,
} from '@/shared/ui/form-input/form-input'
import { TimePickerModal } from '@/shared/ui/time-picker-modal/time-picker-modal'

import type {
  ConferenceEvent,
  ConferenceParticipant,
  CountryTreatyTerm,
  TreatyInfo,
} from '../types/conference-event.types'
import {
  FORM_FIELD_MAX_WIDTH,
  FormField,
  FormLabel,
  FormRow,
} from './event-create.styles'

interface ConferenceEventFormProps {
  conferenceEvent: ConferenceEvent
  setConferenceEvent: (value: ConferenceEvent) => void
  availableCountries: CountryResponseDto[]
  availableHistoricalCountries: HistoricalCountryResponseDto[]
  availablePersons: PersonResponseDto[]
}

export const ConferenceEventForm: React.FC<ConferenceEventFormProps> = ({
  conferenceEvent,
  setConferenceEvent,
  availableCountries,
  availableHistoricalCountries,
  availablePersons,
}) => {
  const playClickSound = useClickSound()

  // 선택된 국가/조약 인덱스
  const [selectedParticipantIndex, setSelectedParticipantIndex] = useState<
    number | null
  >(null)
  const [selectedTreatyIndex, setSelectedTreatyIndex] = useState<number | null>(
    null,
  )
  const [selectedCountryTermIndex, setSelectedCountryTermIndex] = useState<
    number | null
  >(null)

  // 모달 상태
  const [countryModalOpen, setCountryModalOpen] = useState(false)
  const [selectingFor, setSelectingFor] = useState<{
    type: 'participant' | 'treaty-term'
    index?: number
  } | null>(null)

  const [dateModalState, setDateModalState] = useState<{
    isOpen: boolean
    type: 'signed' | 'effective' | 'expiry'
    treatyIndex: number | null
  }>({
    isOpen: false,
    type: 'signed',
    treatyIndex: null,
  })

  // 역할 선택 모달
  const [roleModalState, setRoleModalState] = useState<{
    isOpen: boolean
    participantIndex: number | null
  }>({
    isOpen: false,
    participantIndex: null,
  })

  // 조약 타입 선택 모달
  const [treatyTypeModalState, setTreatyTypeModalState] = useState<{
    isOpen: boolean
    treatyIndex: number | null
  }>({
    isOpen: false,
    treatyIndex: null,
  })

  // 참가국 추가
  const addParticipant = (country: {
    id: string
    name: string
    isHistorical: boolean
  }) => {
    const newParticipant: ConferenceParticipant = {
      countryId: country.id,
      countryName: country.name,
      isHistorical: country.isHistorical,
      role: 'participant',
    }

    setConferenceEvent({
      ...conferenceEvent,
      participants: [...(conferenceEvent.participants || []), newParticipant],
    })
    setCountryModalOpen(false)
    setSelectingFor(null)
  }

  // 참가국 제거
  const removeParticipant = (index: number) => {
    const updated = [...(conferenceEvent.participants || [])]
    updated.splice(index, 1)
    setConferenceEvent({
      ...conferenceEvent,
      participants: updated,
    })
  }

  // 참가국 업데이트
  const updateParticipant = (
    index: number,
    updates: Partial<ConferenceParticipant>,
  ) => {
    const updated = [...(conferenceEvent.participants || [])]
    updated[index] = { ...updated[index], ...updates }
    setConferenceEvent({
      ...conferenceEvent,
      participants: updated,
    })
  }

  // 조약 추가
  const addTreaty = () => {
    const newTreaty: TreatyInfo = {
      name: '',
      type: 'peace',
    }

    setConferenceEvent({
      ...conferenceEvent,
      treaties: [...(conferenceEvent.treaties || []), newTreaty],
    })
  }

  // 조약 제거
  const removeTreaty = (index: number) => {
    const updated = [...(conferenceEvent.treaties || [])]
    updated.splice(index, 1)
    setConferenceEvent({
      ...conferenceEvent,
      treaties: updated,
    })
  }

  // 조약 업데이트
  const updateTreaty = (index: number, updates: Partial<TreatyInfo>) => {
    const updated = [...(conferenceEvent.treaties || [])]
    updated[index] = { ...updated[index], ...updates }
    setConferenceEvent({
      ...conferenceEvent,
      treaties: updated,
    })
  }

  // 국가별 조약 적용 사항 추가
  const addCountryTerm = (country: {
    id: string
    name: string
    isHistorical: boolean
  }) => {
    const newTerm: CountryTreatyTerm = {
      countryId: country.id,
      countryName: country.name,
      isHistorical: country.isHistorical,
      signed: true,
    }

    setConferenceEvent({
      ...conferenceEvent,
      countryTerms: [...(conferenceEvent.countryTerms || []), newTerm],
    })
    setCountryModalOpen(false)
    setSelectingFor(null)
  }

  // 국가별 조약 적용 사항 제거
  const removeCountryTerm = (index: number) => {
    const updated = [...(conferenceEvent.countryTerms || [])]
    updated.splice(index, 1)
    setConferenceEvent({
      ...conferenceEvent,
      countryTerms: updated,
    })
  }

  // 국가별 조약 적용 사항 업데이트
  const updateCountryTerm = (
    index: number,
    updates: Partial<CountryTreatyTerm>,
  ) => {
    const updated = [...(conferenceEvent.countryTerms || [])]
    updated[index] = { ...updated[index], ...updates }
    setConferenceEvent({
      ...conferenceEvent,
      countryTerms: updated,
    })
  }

  // 국가 선택 핸들러
  const handleCountrySelect = (country: {
    id: string
    name: string
    isHistorical: boolean
  }) => {
    if (selectingFor?.type === 'participant') {
      addParticipant(country)
    } else if (selectingFor?.type === 'treaty-term') {
      addCountryTerm(country)
    }
  }

  return (
    <>
      {/* 회담 기본 정보 */}
      <FormRow>
        <FormLabel>회담 목적</FormLabel>
        <FormField>
          <TextArea
            rows={4}
            placeholder="예: 제1차 세계대전 이후 국제 해군 군비 경쟁을 제한하고 평화를 유지하기 위해..."
            value={conferenceEvent.conferenceDetails?.purpose || ''}
            onChange={(e) =>
              setConferenceEvent({
                ...conferenceEvent,
                conferenceDetails: {
                  ...conferenceEvent.conferenceDetails,
                  purpose: e.target.value,
                },
              })
            }
          />
          <Hint>
            이 회담이 개최된 역사적 배경과 주요 목적을 상세히 기록하세요
          </Hint>
        </FormField>
      </FormRow>

      <FormRow>
        <FormLabel>회담 결과</FormLabel>
        <FormField>
          <TextArea
            rows={4}
            placeholder="예: 주요 해군국 간 전함 비율 합의 (미국:영국:일본 = 5:5:3), 태평양 지역 현상 유지 협정 체결..."
            value={conferenceEvent.conferenceDetails?.outcome || ''}
            onChange={(e) =>
              setConferenceEvent({
                ...conferenceEvent,
                conferenceDetails: {
                  ...conferenceEvent.conferenceDetails,
                  outcome: e.target.value,
                },
              })
            }
          />
          <Hint>회담을 통해 도출된 구체적인 합의사항과 성과를 기록하세요</Hint>
        </FormField>
      </FormRow>

      <FormRow>
        <FormLabel>참고사항</FormLabel>
        <FormField>
          <TextArea
            rows={3}
            placeholder="예: 회담 과정에서의 특별한 사건, 주요 논쟁점, 역사적 의의 등"
            value={conferenceEvent.conferenceDetails?.notes || ''}
            onChange={(e) =>
              setConferenceEvent({
                ...conferenceEvent,
                conferenceDetails: {
                  ...conferenceEvent.conferenceDetails,
                  notes: e.target.value,
                },
              })
            }
          />
          <Hint>
            추가로 기록할 만한 흥미로운 사실이나 역사적 맥락을 입력하세요
          </Hint>
        </FormField>
      </FormRow>

      {/* 참가국 설정 */}
      <FormRow>
        <FormLabel>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <span>참가국</span>
            <AddButton
              type="button"
              onClick={() => {
                playClickSound()
                setSelectingFor({ type: 'participant' })
                setCountryModalOpen(true)
              }}
            >
              <FiPlus size={14} />
              <span>추가</span>
            </AddButton>
          </div>
        </FormLabel>
        <FormField>
          {(conferenceEvent.participants || []).length === 0 ? (
            <EmptyState>
              <FiUsers size={32} color="#cbd5e1" />
              <p>참가국을 추가하세요</p>
            </EmptyState>
          ) : (
            <TwoColumnLayout>
              {/* 좌측: 참가국 리스트 */}
              <CountryListColumn>
                <ColumnHeader>
                  <FiUsers size={16} />
                  <h3>참가국 목록</h3>
                  <CountBadge>
                    {(conferenceEvent.participants || []).length}
                  </CountBadge>
                </ColumnHeader>
                <CountryList>
                  {(conferenceEvent.participants || []).map(
                    (participant, index) => (
                      <CountryListItem
                        key={index}
                        $selected={selectedParticipantIndex === index}
                        onClick={() => setSelectedParticipantIndex(index)}
                      >
                        <CountryListInfo>
                          <CountryListName>
                            <FiGlobe size={14} />
                            {participant.countryName}
                          </CountryListName>
                          {participant.role && (
                            <RoleBadge $role={participant.role}>
                              {participant.role === 'host'
                                ? '주최국'
                                : participant.role === 'mediator'
                                  ? '중재국'
                                  : participant.role === 'observer'
                                    ? '참관국'
                                    : '참가국'}
                            </RoleBadge>
                          )}
                        </CountryListInfo>
                        <DeleteIconButton
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            playClickSound()
                            removeParticipant(index)
                            if (selectedParticipantIndex === index) {
                              setSelectedParticipantIndex(null)
                            }
                          }}
                        >
                          <FiTrash2 size={14} />
                        </DeleteIconButton>
                      </CountryListItem>
                    ),
                  )}
                </CountryList>
              </CountryListColumn>

              {/* 우측: 선택된 참가국 상세 폼 */}
              <DetailColumn>
                {selectedParticipantIndex !== null ? (
                  (() => {
                    const participant =
                      conferenceEvent.participants![selectedParticipantIndex]
                    return (
                      <>
                        <ColumnHeader>
                          <FiFileText size={16} />
                          <h3>참가국 상세 정보</h3>
                        </ColumnHeader>
                        <DetailContent>
                          <FormGroup>
                            <Label>역할</Label>
                            <SelectButton
                              type="button"
                              $hasValue={!!participant.role}
                              onClick={() => {
                                playClickSound()
                                setRoleModalState({
                                  isOpen: true,
                                  participantIndex: selectedParticipantIndex,
                                })
                              }}
                            >
                              <span>
                                {participant.role === 'host'
                                  ? '주최국'
                                  : participant.role === 'mediator'
                                    ? '중재국'
                                    : participant.role === 'observer'
                                      ? '참관국'
                                      : '참가국'}
                              </span>
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                              >
                                <path
                                  d="M7 10l5 5 5-5H7z"
                                  fill="currentColor"
                                />
                              </svg>
                            </SelectButton>
                          </FormGroup>

                          <FormGroup>
                            <Label>대표자/대표단</Label>
                            <Input
                              type="text"
                              placeholder="예: 윈스턴 처칠, 프랭클린 루즈벨트"
                              value={(participant.delegates || []).join(', ')}
                              onChange={(e) =>
                                updateParticipant(selectedParticipantIndex, {
                                  delegates: e.target.value
                                    .split(',')
                                    .map((delegate) => delegate.trim())
                                    .filter((delegate) => delegate),
                                })
                              }
                            />
                          </FormGroup>

                          <FormGroup>
                            <Label>참여 설명</Label>
                            <TextArea
                              rows={3}
                              placeholder="이 국가의 회담 참여 목적, 입장 등"
                              value={participant.description || ''}
                              onChange={(e) =>
                                updateParticipant(selectedParticipantIndex, {
                                  description: e.target.value,
                                })
                              }
                            />
                          </FormGroup>
                        </DetailContent>
                      </>
                    )
                  })()
                ) : (
                  <EmptyDetailState>
                    <FiUsers size={48} color="#cbd5e1" />
                    <p>왼쪽에서 참가국을 선택하면</p>
                    <p>상세 정보를 입력할 수 있습니다</p>
                  </EmptyDetailState>
                )}
              </DetailColumn>
            </TwoColumnLayout>
          )}
        </FormField>
      </FormRow>

      {/* 조약/협정 */}
      <FormRow>
        <FormLabel>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <span>조약/협정</span>
            <AddButton
              type="button"
              onClick={() => {
                playClickSound()
                addTreaty()
              }}
            >
              <FiPlus size={14} />
              <span>추가</span>
            </AddButton>
          </div>
        </FormLabel>
        <FormField>
          {(conferenceEvent.treaties || []).length === 0 ? (
            <EmptyState>
              <FiFileText size={32} color="#cbd5e1" />
              <p>체결된 조약을 추가하세요</p>
            </EmptyState>
          ) : (
            <TwoColumnLayout>
              {/* 좌측: 조약 리스트 */}
              <CountryListColumn>
                <ColumnHeader>
                  <FiFileText size={16} />
                  <h3>조약 목록</h3>
                  <CountBadge>
                    {(conferenceEvent.treaties || []).length}
                  </CountBadge>
                </ColumnHeader>
                <CountryList>
                  {(conferenceEvent.treaties || []).map((treaty, index) => (
                    <CountryListItem
                      key={index}
                      $selected={selectedTreatyIndex === index}
                      onClick={() => setSelectedTreatyIndex(index)}
                    >
                      <CountryListInfo>
                        <CountryListName>
                          <FiFileText size={14} />
                          {treaty.name || '조약명 미입력'}
                        </CountryListName>
                        {treaty.type && (
                          <RoleBadge $role={treaty.type}>
                            {treaty.type === 'peace'
                              ? '평화'
                              : treaty.type === 'armistice'
                                ? '휴전'
                                : treaty.type === 'alliance'
                                  ? '동맹'
                                  : treaty.type === 'arms-control'
                                    ? '군축'
                                    : treaty.type}
                          </RoleBadge>
                        )}
                      </CountryListInfo>
                      <DeleteIconButton
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          playClickSound()
                          removeTreaty(index)
                          if (selectedTreatyIndex === index) {
                            setSelectedTreatyIndex(null)
                          }
                        }}
                      >
                        <FiTrash2 size={14} />
                      </DeleteIconButton>
                    </CountryListItem>
                  ))}
                </CountryList>
              </CountryListColumn>

              {/* 우측: 선택된 조약 상세 폼 */}
              <DetailColumn>
                {selectedTreatyIndex !== null ? (
                  (() => {
                    const treaty =
                      conferenceEvent.treaties![selectedTreatyIndex]
                    return (
                      <>
                        <ColumnHeader>
                          <FiFileText size={16} />
                          <h3>조약 상세 정보</h3>
                        </ColumnHeader>
                        <TreatyContent>
                          <FormGroup>
                            <Label>조약명</Label>
                            <Input
                              type="text"
                              placeholder="예: 런던 해군 군축 조약"
                              value={treaty.name}
                              onChange={(e) =>
                                updateTreaty(selectedTreatyIndex, {
                                  name: e.target.value,
                                })
                              }
                            />
                          </FormGroup>

                          <FormGroup>
                            <Label>조약 타입</Label>
                            <SelectButton
                              type="button"
                              $hasValue={!!treaty.type}
                              onClick={() => {
                                playClickSound()
                                setTreatyTypeModalState({
                                  isOpen: true,
                                  treatyIndex: selectedTreatyIndex,
                                })
                              }}
                            >
                              <span>
                                {treaty.type === 'peace'
                                  ? '평화 조약'
                                  : treaty.type === 'armistice'
                                    ? '휴전 협정'
                                    : treaty.type === 'alliance'
                                      ? '동맹 조약'
                                      : treaty.type === 'non-aggression'
                                        ? '불가침 조약'
                                        : treaty.type === 'trade'
                                          ? '무역 협정'
                                          : treaty.type === 'arms-control'
                                            ? '군축 조약'
                                            : treaty.type === 'territory'
                                              ? '영토 조약'
                                              : '기타'}
                              </span>
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                              >
                                <path
                                  d="M7 10l5 5 5-5H7z"
                                  fill="currentColor"
                                />
                              </svg>
                            </SelectButton>
                          </FormGroup>

                          <FormGroup>
                            <Label>서명 장소</Label>
                            <Input
                              type="text"
                              placeholder="예: 런던"
                              value={treaty.location || ''}
                              onChange={(e) =>
                                updateTreaty(selectedTreatyIndex, {
                                  location: e.target.value,
                                })
                              }
                            />
                          </FormGroup>

                          <FormGroup>
                            <Label>조약 날짜</Label>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 1fr',
                                gap: '8px',
                              }}
                            >
                              <DateButton
                                type="button"
                                onClick={() => {
                                  playClickSound()
                                  setDateModalState({
                                    isOpen: true,
                                    type: 'signed',
                                    treatyIndex: selectedTreatyIndex,
                                  })
                                }}
                              >
                                <FiCalendar size={14} />
                                <span>{treaty.signedDate || '서명일'}</span>
                              </DateButton>
                              <DateButton
                                type="button"
                                onClick={() => {
                                  playClickSound()
                                  setDateModalState({
                                    isOpen: true,
                                    type: 'effective',
                                    treatyIndex: selectedTreatyIndex,
                                  })
                                }}
                              >
                                <FiCalendar size={14} />
                                <span>{treaty.effectiveDate || '발효일'}</span>
                              </DateButton>
                              <DateButton
                                type="button"
                                onClick={() => {
                                  playClickSound()
                                  setDateModalState({
                                    isOpen: true,
                                    type: 'expiry',
                                    treatyIndex: selectedTreatyIndex,
                                  })
                                }}
                              >
                                <FiCalendar size={14} />
                                <span>{treaty.expiryDate || '종료일'}</span>
                              </DateButton>
                            </div>
                          </FormGroup>

                          <FormGroup>
                            <Label>조약 내용</Label>
                            <TextArea
                              rows={3}
                              placeholder="조약의 주요 내용을 입력하세요"
                              value={treaty.content || ''}
                              onChange={(e) =>
                                updateTreaty(selectedTreatyIndex, {
                                  content: e.target.value,
                                })
                              }
                            />
                          </FormGroup>

                          <FormGroup>
                            <Label>조약 영향</Label>
                            <TextArea
                              rows={2}
                              placeholder="조약이 미친 영향"
                              value={treaty.outcome || ''}
                              onChange={(e) =>
                                updateTreaty(selectedTreatyIndex, {
                                  outcome: e.target.value,
                                })
                              }
                            />
                          </FormGroup>
                        </TreatyContent>
                      </>
                    )
                  })()
                ) : (
                  <EmptyDetailState>
                    <FiFileText size={48} color="#cbd5e1" />
                    <p>왼쪽에서 조약을 선택하면</p>
                    <p>상세 정보를 입력할 수 있습니다</p>
                  </EmptyDetailState>
                )}
              </DetailColumn>
            </TwoColumnLayout>
          )}
        </FormField>
      </FormRow>

      {/* 국가별 조약 적용 사항 */}
      <FormRow>
        <FormLabel>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <span>국가별 조약 적용</span>
            <AddButton
              type="button"
              onClick={() => {
                playClickSound()
                setSelectingFor({ type: 'treaty-term' })
                setCountryModalOpen(true)
              }}
            >
              <FiPlus size={14} />
              <span>추가</span>
            </AddButton>
          </div>
        </FormLabel>
        <FormField>
          {(conferenceEvent.countryTerms || []).length === 0 ? (
            <EmptyState>
              <FiGlobe size={32} color="#cbd5e1" />
              <p>조약 적용 대상 국가를 추가하세요</p>
            </EmptyState>
          ) : (
            <TwoColumnLayout>
              {/* 좌측: 국가 리스트 */}
              <CountryListColumn>
                <ColumnHeader>
                  <FiGlobe size={16} />
                  <h3>적용 대상 국가</h3>
                  <CountBadge>
                    {(conferenceEvent.countryTerms || []).length}
                  </CountBadge>
                </ColumnHeader>
                <CountryList>
                  {(conferenceEvent.countryTerms || []).map((term, index) => (
                    <CountryListItem
                      key={index}
                      $selected={selectedCountryTermIndex === index}
                      onClick={() => setSelectedCountryTermIndex(index)}
                    >
                      <CountryListInfo>
                        <CountryListName>
                          <FiGlobe size={14} />
                          {term.countryName}
                        </CountryListName>
                        {term.signed && <SignedBadge>서명 완료</SignedBadge>}
                      </CountryListInfo>
                      <DeleteIconButton
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          playClickSound()
                          removeCountryTerm(index)
                          if (selectedCountryTermIndex === index) {
                            setSelectedCountryTermIndex(null)
                          }
                        }}
                      >
                        <FiTrash2 size={14} />
                      </DeleteIconButton>
                    </CountryListItem>
                  ))}
                </CountryList>
              </CountryListColumn>

              {/* 우측: 선택된 국가의 조약 적용 사항 폼 */}
              <DetailColumn>
                {selectedCountryTermIndex !== null ? (
                  (() => {
                    const term =
                      conferenceEvent.countryTerms![selectedCountryTermIndex]
                    return (
                      <>
                        <ColumnHeader>
                          <FiFileText size={16} />
                          <h3>조약 적용 사항</h3>
                        </ColumnHeader>
                        <DetailContent>
                          {/* 영토 변경 */}
                          <TermSection>
                            <TermSectionTitle>🗺️ 영토 변경</TermSectionTitle>
                            <FormGroup>
                              <Label>획득 영토</Label>
                              <Input
                                type="text"
                                placeholder="예: 알자스-로렌, 수데텐란트"
                                value={
                                  term.territorialChanges?.gained?.join(', ') ||
                                  ''
                                }
                                onChange={(e) =>
                                  updateCountryTerm(selectedCountryTermIndex, {
                                    territorialChanges: {
                                      ...term.territorialChanges,
                                      gained: e.target.value
                                        .split(',')
                                        .map((territory) => territory.trim())
                                        .filter((territory) => territory),
                                    },
                                  })
                                }
                              />
                            </FormGroup>
                            <FormGroup>
                              <Label>상실 영토</Label>
                              <Input
                                type="text"
                                placeholder="예: 단치히, 폴란드 회랑"
                                value={
                                  term.territorialChanges?.lost?.join(', ') ||
                                  ''
                                }
                                onChange={(e) =>
                                  updateCountryTerm(selectedCountryTermIndex, {
                                    territorialChanges: {
                                      ...term.territorialChanges,
                                      lost: e.target.value
                                        .split(',')
                                        .map((territory) => territory.trim())
                                        .filter((territory) => territory),
                                    },
                                  })
                                }
                              />
                            </FormGroup>
                          </TermSection>

                          {/* 군사 제한 */}
                          <TermSection>
                            <TermSectionTitle>⚔️ 군사 제한</TermSectionTitle>
                            <FormGrid>
                              <FormGroup>
                                <Label>해군 톤수 제한</Label>
                                <Input
                                  type="text"
                                  placeholder="예: 35,000톤"
                                  value={
                                    term.militaryLimitations?.navalTonnage || ''
                                  }
                                  onChange={(e) =>
                                    updateCountryTerm(
                                      selectedCountryTermIndex,
                                      {
                                        militaryLimitations: {
                                          ...term.militaryLimitations,
                                          navalTonnage: e.target.value,
                                        },
                                      },
                                    )
                                  }
                                />
                              </FormGroup>
                              <FormGroup>
                                <Label>육군 병력 제한</Label>
                                <Input
                                  type="text"
                                  placeholder="예: 100,000명"
                                  value={
                                    term.militaryLimitations?.armySize || ''
                                  }
                                  onChange={(e) =>
                                    updateCountryTerm(
                                      selectedCountryTermIndex,
                                      {
                                        militaryLimitations: {
                                          ...term.militaryLimitations,
                                          armySize: e.target.value,
                                        },
                                      },
                                    )
                                  }
                                />
                              </FormGroup>
                            </FormGrid>
                            <FormGroup>
                              <Label>무기 제한 사항</Label>
                              <Input
                                type="text"
                                placeholder="쉼표로 구분 (예: 잠수함 금지, 항공모함 제한)"
                                value={
                                  term.militaryLimitations?.weaponRestrictions?.join(
                                    ', ',
                                  ) || ''
                                }
                                onChange={(e) =>
                                  updateCountryTerm(selectedCountryTermIndex, {
                                    militaryLimitations: {
                                      ...term.militaryLimitations,
                                      weaponRestrictions: e.target.value
                                        .split(',')
                                        .map((restriction) =>
                                          restriction.trim(),
                                        )
                                        .filter((restriction) => restriction),
                                    },
                                  })
                                }
                              />
                            </FormGroup>
                          </TermSection>

                          {/* 배상 */}
                          <TermSection>
                            <TermSectionTitle>💰 배상</TermSectionTitle>
                            <FormGrid>
                              <FormGroup>
                                <Label>배상 금액</Label>
                                <Input
                                  type="text"
                                  placeholder="예: 1,320억 금 마르크"
                                  value={term.reparations?.amount || ''}
                                  onChange={(e) =>
                                    updateCountryTerm(
                                      selectedCountryTermIndex,
                                      {
                                        reparations: {
                                          ...term.reparations,
                                          amount: e.target.value,
                                        },
                                      },
                                    )
                                  }
                                />
                              </FormGroup>
                              <FormGroup>
                                <Label>지불 조건</Label>
                                <Input
                                  type="text"
                                  placeholder="예: 30년 분할 지불"
                                  value={term.reparations?.terms || ''}
                                  onChange={(e) =>
                                    updateCountryTerm(
                                      selectedCountryTermIndex,
                                      {
                                        reparations: {
                                          amount:
                                            term.reparations?.amount || '',
                                          ...term.reparations,
                                          terms: e.target.value,
                                        },
                                      },
                                    )
                                  }
                                />
                              </FormGroup>
                            </FormGrid>
                          </TermSection>

                          {/* 권리 및 의무 */}
                          <TermSection>
                            <TermSectionTitle>📜 권리 및 의무</TermSectionTitle>
                            <FormGroup>
                              <Label>획득한 권리</Label>
                              <Input
                                type="text"
                                placeholder="쉼표로 구분 (예: 식민지 통치권, 무역 우선권)"
                                value={
                                  term.rightsAndObligations?.gainedRights?.join(
                                    ', ',
                                  ) || ''
                                }
                                onChange={(e) =>
                                  updateCountryTerm(selectedCountryTermIndex, {
                                    rightsAndObligations: {
                                      ...term.rightsAndObligations,
                                      gainedRights: e.target.value
                                        .split(',')
                                        .map((right) => right.trim())
                                        .filter((right) => right),
                                    },
                                  })
                                }
                              />
                            </FormGroup>
                            <FormGroup>
                              <Label>새로 부여된 의무</Label>
                              <Input
                                type="text"
                                placeholder="쉼표로 구분 (예: 비무장화, 군비 축소)"
                                value={
                                  term.rightsAndObligations?.obligations?.join(
                                    ', ',
                                  ) || ''
                                }
                                onChange={(e) =>
                                  updateCountryTerm(selectedCountryTermIndex, {
                                    rightsAndObligations: {
                                      ...term.rightsAndObligations,
                                      obligations: e.target.value
                                        .split(',')
                                        .map((obligation) => obligation.trim())
                                        .filter((obligation) => obligation),
                                    },
                                  })
                                }
                              />
                            </FormGroup>
                          </TermSection>

                          {/* 특별 조항 */}
                          <FormGroup>
                            <Label>특별 조항</Label>
                            <TextArea
                              rows={2}
                              placeholder="기타 특별한 조건이나 조항"
                              value={term.specialTerms || ''}
                              onChange={(e) =>
                                updateCountryTerm(selectedCountryTermIndex, {
                                  specialTerms: e.target.value,
                                })
                              }
                            />
                          </FormGroup>

                          {/* 요약 */}
                          <FormGroup>
                            <Label>전체 요약</Label>
                            <TextArea
                              rows={3}
                              placeholder="이 국가에 대한 조약 내용 전체 요약"
                              value={term.summary || ''}
                              onChange={(e) =>
                                updateCountryTerm(selectedCountryTermIndex, {
                                  summary: e.target.value,
                                })
                              }
                            />
                          </FormGroup>
                        </DetailContent>
                      </>
                    )
                  })()
                ) : (
                  <EmptyDetailState>
                    <FiGlobe size={48} color="#cbd5e1" />
                    <p>왼쪽에서 국가를 선택하면</p>
                    <p>조약 적용 사항을 입력할 수 있습니다</p>
                  </EmptyDetailState>
                )}
              </DetailColumn>
            </TwoColumnLayout>
          )}
        </FormField>
      </FormRow>

      {/* 국가 선택 모달 */}
      <CountrySelectModal
        isOpen={countryModalOpen}
        onClose={() => {
          setCountryModalOpen(false)
          setSelectingFor(null)
        }}
        onSelect={handleCountrySelect}
        modernCountries={availableCountries}
        historicalCountries={availableHistoricalCountries}
        title="국가 선택"
      />

      {/* 역할 선택 모달 */}
      {roleModalState.isOpen && roleModalState.participantIndex !== null && (
        <Modal>
          <ModalOverlay
            onClick={() =>
              setRoleModalState({ isOpen: false, participantIndex: null })
            }
          />
          <ModalContent>
            <ModalHeader>
              <ModalHeaderLeft>
                <ModalIconWrapper>
                  <FiUsers size={20} />
                </ModalIconWrapper>
                <div>
                  <ModalTitle>참가국 역할 선택</ModalTitle>
                  <ModalSubtitle>
                    회담에서의 국가 역할을 선택하세요
                  </ModalSubtitle>
                </div>
              </ModalHeaderLeft>
              <CloseButton
                type="button"
                onClick={() =>
                  setRoleModalState({ isOpen: false, participantIndex: null })
                }
              >
                <FiX size={20} />
              </CloseButton>
            </ModalHeader>
            <ModalBody>
              <RoleGrid>
                {[
                  {
                    value: 'host',
                    label: '주최국',
                    desc: '회담을 주최하고 의제를 주도',
                    icon: '🏛️',
                    color: '#6366f1',
                  },
                  {
                    value: 'mediator',
                    label: '중재국',
                    desc: '중립적 입장에서 조정',
                    icon: '⚖️',
                    color: '#10b981',
                  },
                  {
                    value: 'participant',
                    label: '참가국',
                    desc: '회담에 참여하여 협상',
                    icon: '🤝',
                    color: '#64748b',
                  },
                  {
                    value: 'observer',
                    label: '참관국',
                    desc: '참관만 하며 발언권 제한',
                    icon: '👁️',
                    color: '#94a3b8',
                  },
                ].map((role) => (
                  <RoleOption
                    key={role.value}
                    type="button"
                    $selected={
                      conferenceEvent.participants?.[
                        roleModalState.participantIndex!
                      ]?.role === role.value
                    }
                    $color={role.color}
                    onClick={() => {
                      if (roleModalState.participantIndex !== null) {
                        updateParticipant(roleModalState.participantIndex, {
                          role: role.value as ConferenceParticipant['role'],
                        })
                        setRoleModalState({
                          isOpen: false,
                          participantIndex: null,
                        })
                      }
                    }}
                  >
                    <RoleIcon>{role.icon}</RoleIcon>
                    <RoleLabel>{role.label}</RoleLabel>
                    <RoleDesc>{role.desc}</RoleDesc>
                  </RoleOption>
                ))}
              </RoleGrid>
            </ModalBody>
          </ModalContent>
        </Modal>
      )}

      {/* 조약 타입 선택 모달 */}
      {treatyTypeModalState.isOpen &&
        treatyTypeModalState.treatyIndex !== null && (
          <Modal>
            <ModalOverlay
              onClick={() =>
                setTreatyTypeModalState({ isOpen: false, treatyIndex: null })
              }
            />
            <ModalContent>
              <ModalHeader>
                <ModalHeaderLeft>
                  <ModalIconWrapper>
                    <FiFileText size={20} />
                  </ModalIconWrapper>
                  <div>
                    <ModalTitle>조약 타입 선택</ModalTitle>
                    <ModalSubtitle>조약의 유형을 선택하세요</ModalSubtitle>
                  </div>
                </ModalHeaderLeft>
                <CloseButton
                  type="button"
                  onClick={() =>
                    setTreatyTypeModalState({
                      isOpen: false,
                      treatyIndex: null,
                    })
                  }
                >
                  <FiX size={20} />
                </CloseButton>
              </ModalHeader>
              <ModalBody>
                <TreatyTypeGrid>
                  {[
                    {
                      value: 'peace',
                      label: '평화 조약',
                      desc: '전쟁 종결 및 평화 수립',
                      icon: '🕊️',
                      color: '#10b981',
                    },
                    {
                      value: 'armistice',
                      label: '휴전 협정',
                      desc: '일시적 전투 중단',
                      icon: '🛑',
                      color: '#f59e0b',
                    },
                    {
                      value: 'alliance',
                      label: '동맹 조약',
                      desc: '군사·경제 협력 동맹',
                      icon: '🤝',
                      color: '#3b82f6',
                    },
                    {
                      value: 'non-aggression',
                      label: '불가침 조약',
                      desc: '상호 공격 금지 합의',
                      icon: '✋',
                      color: '#8b5cf6',
                    },
                    {
                      value: 'trade',
                      label: '무역 협정',
                      desc: '경제·통상 협력',
                      icon: '💼',
                      color: '#06b6d4',
                    },
                    {
                      value: 'arms-control',
                      label: '군축 조약',
                      desc: '군비 제한 및 축소',
                      icon: '🛡️',
                      color: '#6366f1',
                    },
                    {
                      value: 'territory',
                      label: '영토 조약',
                      desc: '영토 및 국경 획정',
                      icon: '🗺️',
                      color: '#14b8a6',
                    },
                    {
                      value: 'other',
                      label: '기타',
                      desc: '기타 조약',
                      icon: '📋',
                      color: '#64748b',
                    },
                  ].map((type) => (
                    <TreatyTypeOption
                      key={type.value}
                      type="button"
                      $selected={
                        conferenceEvent.treaties?.[
                          treatyTypeModalState.treatyIndex!
                        ]?.type === type.value
                      }
                      $color={type.color}
                      onClick={() => {
                        if (treatyTypeModalState.treatyIndex !== null) {
                          updateTreaty(treatyTypeModalState.treatyIndex, {
                            type: type.value as TreatyInfo['type'],
                          })
                          setTreatyTypeModalState({
                            isOpen: false,
                            treatyIndex: null,
                          })
                        }
                      }}
                    >
                      <TreatyTypeIcon>{type.icon}</TreatyTypeIcon>
                      <div>
                        <TreatyTypeLabel>{type.label}</TreatyTypeLabel>
                        <TreatyTypeDesc>{type.desc}</TreatyTypeDesc>
                      </div>
                    </TreatyTypeOption>
                  ))}
                </TreatyTypeGrid>
              </ModalBody>
            </ModalContent>
          </Modal>
        )}

      {/* 날짜 선택 모달 */}
      <DatePickerModal
        isOpen={dateModalState.isOpen}
        onClose={() =>
          setDateModalState({
            isOpen: false,
            type: 'signed',
            treatyIndex: null,
          })
        }
        onSelect={(date) => {
          if (dateModalState.treatyIndex !== null) {
            const fieldName =
              dateModalState.type === 'signed'
                ? 'signedDate'
                : dateModalState.type === 'effective'
                  ? 'effectiveDate'
                  : 'expiryDate'
            updateTreaty(dateModalState.treatyIndex, { [fieldName]: date })
            setDateModalState({
              isOpen: false,
              type: 'signed',
              treatyIndex: null,
            })
          }
        }}
        initialDate={
          dateModalState.treatyIndex !== null
            ? conferenceEvent.treaties?.[dateModalState.treatyIndex]?.[
                dateModalState.type === 'signed'
                  ? 'signedDate'
                  : dateModalState.type === 'effective'
                    ? 'effectiveDate'
                    : 'expiryDate'
              ] || ''
            : ''
        }
        title={
          dateModalState.type === 'signed'
            ? '서명일 선택'
            : dateModalState.type === 'effective'
              ? '발효일 선택'
              : '종료일 선택'
        }
      />
    </>
  )
}

// ============================================
// 스타일 컴포넌트
// ============================================

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
`

const SectionDesc = styled.p`
  margin: 6px 0 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
`

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);

  &:hover {
    background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.03)'
      : 'linear-gradient(to bottom, #fafbfc, #f8fafc)'};
  border: 2px dashed ${({ theme }) => theme.colors.border.default};
  border-radius: 16px;
  gap: 12px;
  max-width: ${FORM_FIELD_MAX_WIDTH};

  svg {
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  p {
    margin: 0;
    font-size: 13px;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const FormContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`

const Hint = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1.5;
  font-weight: 400;
`

// 2단 레이아웃 (기본 정보와 동일한 max-width 적용)
const TwoColumnLayout = styled.div`
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 0;
  min-height: 400px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'white'};
  border: 1.5px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  overflow: hidden;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`

const CountryListColumn = styled.div`
  display: flex;
  flex-direction: column;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.02)'
      : 'linear-gradient(to bottom, #fafbfc, #f8fafc)'};
  border-right: 1.5px solid ${({ theme }) => theme.colors.border.light};

  @media (max-width: 1024px) {
    border-right: none;
    border-bottom: 1.5px solid ${({ theme }) => theme.colors.border.light};
  }
`

const DetailColumn = styled.div`
  display: flex;
  flex-direction: column;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'transparent' : 'white'};
  width: 100%;
  max-width: ${FORM_FIELD_MAX_WIDTH};
`

const ColumnHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 20px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'white'};
  border-bottom: 1.5px solid ${({ theme }) => theme.colors.border.light};

  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
    flex: 1;
    letter-spacing: -0.01em;
  }

  svg {
    color: #8b5cf6;
  }
`

const CountBadge = styled.div`
  padding: 4px 10px;
  background: linear-gradient(
    135deg,
    rgba(139, 92, 246, 0.1),
    rgba(124, 58, 237, 0.08)
  );
  color: #8b5cf6;
  font-size: 11px;
  font-weight: 700;
  border-radius: 10px;
  border: 1px solid rgba(139, 92, 246, 0.15);
`

const CountryList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.background.tertiary};
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.medium};
    border-radius: 3px;

    &:hover {
      background: ${({ theme }) => theme.colors.text.tertiary};
    }
  }
`

const CountryListItem = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  margin-bottom: 4px;
  background: ${(props) =>
    props.$selected ? 'rgba(139,92,246,0.1)' : 'transparent'};
  border-left: 3px solid
    ${(props) => (props.$selected ? '#8b5cf6' : 'transparent')};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: ${(props) =>
    props.$selected ? '0 2px 8px rgba(139, 92, 246, 0.12)' : 'none'};

  &:hover {
    background: rgba(139, 92, 246, 0.08);
    border-left-color: ${(props) =>
      props.$selected ? '#8b5cf6' : props.theme.colors.border.medium};
  }
`

const CountryListInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`

const CountryListName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  svg {
    flex-shrink: 0;
    color: #6366f1;
  }
`

const RoleBadge = styled.div<{ $role: string }>`
  display: inline-flex;
  padding: 4px 8px;
  background: ${(props) =>
    props.$role === 'host'
      ? 'rgba(139, 92, 246, 0.1)'
      : props.$role === 'mediator'
        ? 'rgba(16, 185, 129, 0.1)'
        : 'rgba(100, 116, 139, 0.08)'};
  color: ${(props) =>
    props.$role === 'host'
      ? '#8b5cf6'
      : props.$role === 'mediator'
        ? '#10b981'
        : '#64748b'};
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
`

const SignedBadge = styled.div`
  display: inline-flex;
  padding: 3px 8px;
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
`

const DeleteIconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background: rgba(239, 68, 68, 0.15);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
`

const DetailContent = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.background.tertiary};
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.medium};
    border-radius: 3px;

    &:hover {
      background: ${({ theme }) => theme.colors.text.tertiary};
    }
  }
`

const EmptyDetailState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding: 40px;
  text-align: center;

  p {
    margin: 0;
    font-size: 14px;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const ParticipantsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1.5px solid ${({ theme }) => theme.colors.border.default};
  border-top: none;
  border-radius: 0 0 12px 12px;
`

const ParticipantCard = styled.div`
  padding: 20px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1.5px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(167, 139, 250, 0.3)'
        : 'rgba(99, 102, 241, 0.2)'};
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.08);
  }
`

const ParticipantHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1.5px solid ${({ theme }) => theme.colors.border.light};
`

const CountryName = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};

  svg {
    color: #6366f1;
    flex-shrink: 0;
  }
`

const DeleteButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background: rgba(239, 68, 68, 0.15);
    transform: scale(1.08);
  }

  &:active {
    transform: scale(0.95);
  }
`

const TreatyContent = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.background.tertiary};
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.medium};
    border-radius: 3px;

    &:hover {
      background: ${({ theme }) => theme.colors.text.tertiary};
    }
  }
`

const CountryTermsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1.5px solid ${({ theme }) => theme.colors.border.default};
  border-top: none;
  border-radius: 0 0 12px 12px;
`

const TermSection = styled.div`
  padding: 16px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(167, 139, 250, 0.05)'
      : 'rgba(99, 102, 241, 0.02)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(167, 139, 250, 0.15)'
        : 'rgba(99, 102, 241, 0.08)'};
  border-radius: 10px;
  margin-bottom: 16px;
  width: 100%;
`

const TermSectionTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
`

// 공통 스타일 사용 (event-create.styles.ts에서 import)

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  max-width: ${FORM_FIELD_MAX_WIDTH};
`

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: ${FORM_FIELD_MAX_WIDTH};
`

const Label = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SelectButton = styled.button<{ $hasValue?: boolean }>`
  border: 1.5px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  padding: 14px 16px;
  font-size: 14px;
  color: ${(props) =>
    props.$hasValue
      ? props.theme.colors.text.primary
      : props.theme.colors.text.tertiary};
  background: ${({ theme }) => theme.colors.background.secondary};
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.medium};
    background: ${({ theme }) => theme.colors.background.tertiary};
  }

  &:focus {
    outline: none;
    border-color: #8b5cf6;
    background: ${({ theme }) => theme.colors.background.primary};
    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
  }

  svg {
    color: #8b5cf6;
    transition: transform 0.2s;
  }

  &:hover svg {
    transform: translateY(2px);
  }
`

const DateButton = styled.button`
  border: 1.5px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  padding: 14px 16px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.secondary};
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.medium};
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus {
    outline: none;
    border-color: #8b5cf6;
    background: ${({ theme }) => theme.colors.background.primary};
    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
  }

  svg {
    color: #8b5cf6;
    flex-shrink: 0;
  }

  span {
    font-weight: 500;
  }
`

// 모달 스타일 (기존 디자인 시스템과 통일)
const Modal = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
`

const ModalOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
`

const ModalContent = styled.div`
  position: relative;
  width: 90%;
  max-width: 600px;
  max-height: 85vh;
  background: ${({ theme }) => theme.colors.background.primary};
  border-radius: 16px;
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 20px 60px rgba(0, 0, 0, 0.7)'
      : '0 20px 60px rgba(0, 0, 0, 0.3)'};
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(99, 102, 241, 0.12) 100%)'
      : 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)'};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 16px 16px 0 0;
`

const ModalHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
`

const ModalIconWrapper = styled.div`
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
`

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ModalSubtitle = styled.p`
  margin: 4px 0 0 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const ModalBody = styled.div`
  padding: 20px;
  overflow-y: auto;
  flex: 1;
`

const RoleGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
`

const RoleOption = styled.button<{ $selected?: boolean; $color?: string }>`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  background: ${(props) =>
    props.$selected
      ? props.$color
        ? `${props.$color}1A`
        : 'rgba(99, 102, 241, 0.10)'
      : props.theme.colors.background.primary};
  border: 2px solid
    ${(props) =>
      props.$selected
        ? props.$color || '#6366f1'
        : props.theme.colors.border.default};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  box-shadow: ${(props) =>
    props.$selected
      ? `0 4px 12px ${props.$color || '#6366f1'}20`
      : '0 2px 6px rgba(0,0,0,0.04)'};

  &:hover {
    border-color: ${(props) => props.$color || '#6366f1'};
    background: ${(props) =>
      props.$color ? `${props.$color}08` : 'rgba(99, 102, 241, 0.05)'};
    transform: translateY(-2px);
    box-shadow: ${(props) => `0 6px 16px ${props.$color || '#6366f1'}25`};
  }

  &:active {
    transform: translateY(0);
  }
`

const RoleIcon = styled.div`
  font-size: 32px;
  line-height: 1;
  flex-shrink: 0;
`

const RoleLabel = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 4px;
`

const RoleDesc = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.4;
`

// 조약 타입 전용 스타일
const TreatyTypeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  max-width: ${FORM_FIELD_MAX_WIDTH};
`

const TreatyTypeOption = styled.button<{
  $selected?: boolean
  $color?: string
}>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: ${(props) =>
    props.$selected
      ? props.$color
        ? `${props.$color}1A`
        : 'rgba(99, 102, 241, 0.10)'
      : props.theme.colors.background.primary};
  border: 2px solid
    ${(props) =>
      props.$selected
        ? props.$color || '#6366f1'
        : props.theme.colors.border.default};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;

  &:hover {
    border-color: ${(props) => props.$color || '#6366f1'};
    background: ${(props) =>
      props.$color ? `${props.$color}08` : 'rgba(99, 102, 241, 0.05)'};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  &:active {
    transform: translateY(0);
  }
`

const TreatyTypeIcon = styled.div`
  font-size: 24px;
  line-height: 1;
  flex-shrink: 0;
`

const TreatyTypeLabel = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 2px;
`

const TreatyTypeDesc = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.3;
`
