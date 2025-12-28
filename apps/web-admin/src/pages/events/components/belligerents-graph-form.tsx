/**
 * 그래프 기반 교전 세력 관리 컴포넌트 (개선 버전)
 */
import React, { useMemo, useState } from 'react'

import {
  FiAlertCircle,
  FiAlertTriangle,
  FiAward,
  FiCalendar,
  FiClock,
  FiEye,
  FiGlobe,
  FiHeart,
  FiLink,
  FiMinus,
  FiPlus,
  FiShield,
  FiTarget,
  FiTrash2,
  FiUsers,
  FiX,
  FiZap,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { CountryResponseDto } from '@/shared/api/countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { CountrySelectModal } from '@/shared/ui/country-select-modal/CountrySelectModal'
import { DatePickerModal } from '@/shared/ui/date-picker'
import { TimePickerModal } from '@/shared/ui/time-picker-modal/TimePickerModal'

import type {
  BelligerentCountry,
  CountryRelation,
  EventBelligerentsGraph,
  RelationType,
} from '../types/belligerents-graph.types'
import {
  addCountry,
  addRelation,
  removeCountry,
  removeRelation,
  updateCountry,
  validateGraph,
} from '../utils/belligerents-graph.utils'

interface BelligerentsGraphFormProps {
  value: EventBelligerentsGraph
  onChange: (graph: EventBelligerentsGraph) => void
  availableCountries: Array<{ id: string; name: string; isHistorical: boolean }>
  availableHistoricalCountries: Array<{
    id: string
    name: string
    isHistorical: boolean
  }>
  // 진영 목록
  sides?: Array<{ id: string; name: string; color?: string }>
  // 상위 사건의 관계 (상속용)
  parentRelations?: CountryRelation[]
  // 하위 사건들의 관계 (조회용)
  childRelations?: Array<{
    relation: CountryRelation
    sourceName: string // 어느 하위 사건에서 온 관계인지
  }>
}

export const BelligerentsGraphForm: React.FC<BelligerentsGraphFormProps> = ({
  value,
  onChange,
  availableCountries,
  availableHistoricalCountries,
  sides = [],
  parentRelations = [],
  childRelations = [],
}) => {
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(
    null,
  )
  const [editingRelation, setEditingRelation] =
    useState<CountryRelation | null>(null)
  const [countryModalOpen, setCountryModalOpen] = useState(false)
  const [selectingCountryFor, setSelectingCountryFor] = useState<string | null>(
    null,
  )

  // 진영 선택 모달 상태
  const [factionModalState, setFactionModalState] = useState<{
    isOpen: boolean
    countryId: string | null
  }>({
    isOpen: false,
    countryId: null,
  })

  // 날짜/시간 모달 상태
  const [dateModalState, setDateModalState] = useState<{
    isOpen: boolean
    type: 'join' | 'withdraw'
    countryId: string | null
  }>({
    isOpen: false,
    type: 'join',
    countryId: null,
  })

  const [timeModalState, setTimeModalState] = useState<{
    isOpen: boolean
    type: 'join' | 'withdraw'
    countryId: string | null
  }>({
    isOpen: false,
    type: 'join',
    countryId: null,
  })

  // 날짜/시간 헬퍼 함수
  const getDateFromISO = (isoString?: string): string => {
    if (!isoString) return ''
    try {
      const date = new Date(isoString)
      if (isNaN(date.getTime())) return ''
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch {
      return ''
    }
  }

  const getTimeFromISO = (isoString?: string): string => {
    if (!isoString) return ''
    try {
      const date = new Date(isoString)
      if (isNaN(date.getTime())) return ''
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      if (hours === '00' && minutes === '00') return ''
      return `${hours}:${minutes}`
    } catch {
      return ''
    }
  }

  const combineDateTime = (
    date: string,
    time: string,
    oldValue?: string,
  ): string => {
    if (!date) return oldValue || ''
    if (!time) return `${date}T00:00:00.000Z`
    return `${date}T${time}:00.000Z`
  }

  // 검증
  const validation = useMemo(() => validateGraph(value), [value])

  // CountryResponseDto 형식으로 변환
  const modernCountries = useMemo<CountryResponseDto[]>(() => {
    return availableCountries.map((c) => ({
      id: c.id,
      name: c.name,
      alpha2Code: '',
      alpha3Code: '',
      callingCode: '',
      capital: null,
      region: null,
      subregion: null,
      population: null,
      area: null,
      flag: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as CountryResponseDto[]
  }, [availableCountries])

  const historicalCountries = useMemo<HistoricalCountryResponseDto[]>(() => {
    return availableHistoricalCountries.map((c) => ({
      id: c.id,
      name: c.name,
      startYear: null,
      endYear: null,
      continent: null,
      description: null,
      flag: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as HistoricalCountryResponseDto[]
  }, [availableHistoricalCountries])

  // 국가 추가 (모달에서 선택)
  const handleAddCountry = () => {
    setSelectingCountryFor('new')
    setCountryModalOpen(true)
  }

  // 국가 선택 (모달에서)
  const handleCountrySelect = (country: {
    id: string
    name: string
    isHistorical: boolean
  }) => {
    if (selectingCountryFor === 'new') {
      // 새 국가 추가 (자동 선택하지 않음)
      const newCountry: BelligerentCountry = {
        countryId: country.id,
        countryName: country.name,
        isHistorical: country.isHistorical,
        participation: 'full',
      }
      onChange(addCountry(value, newCountry))
      // 자동 선택 제거: setSelectedCountryId(country.id) 호출 안 함
    } else if (selectingCountryFor) {
      // 기존 국가 변경
      onChange(
        updateCountry(value, selectingCountryFor, {
          countryId: country.id,
          countryName: country.name,
          isHistorical: country.isHistorical,
        }),
      )
    }
    setCountryModalOpen(false)
    setSelectingCountryFor(null)
  }

  // 국가 변경 (모달 열기)
  const handleChangeCountry = (countryId: string) => {
    setSelectingCountryFor(countryId)
    setCountryModalOpen(true)
  }

  // 국가 삭제
  const handleRemoveCountry = (countryId: string) => {
    onChange(removeCountry(value, countryId))
    if (selectedCountryId === countryId) {
      setSelectedCountryId(null)
    }
  }

  // 국가 업데이트
  const handleUpdateCountry = (
    countryId: string,
    updates: Partial<BelligerentCountry>,
  ) => {
    onChange(updateCountry(value, countryId, updates))
  }

  // 관계 추가 시작
  const handleStartAddRelation = (fromCountryId: string) => {
    setEditingRelation({
      id: `relation-${Date.now()}`,
      fromCountry: fromCountryId,
      toCountry: '',
      relationType: 'allied',
      startDate: '',
      strength: 0,
    })
  }

  // 관계 추가 완료
  const handleFinishAddRelation = () => {
    if (editingRelation && editingRelation.toCountry) {
      onChange(addRelation(value, editingRelation))
      setEditingRelation(null)
    }
  }

  // 관계 삭제
  const handleRemoveRelation = (relationId: string) => {
    onChange(removeRelation(value, relationId))
  }

  return (
    <Container>
      {!validation.valid && (
        <ErrorBox>
          <FiAlertCircle size={16} />
          <div>
            {validation.errors.map((error, index) => (
              <div key={index}>{error}</div>
            ))}
          </div>
        </ErrorBox>
      )}

      {/* 통계 및 액션 바 */}
      <StatsBar>
        <StatsGroup>
          <StatItem>
            <StatIcon>
              <FiGlobe size={24} />
            </StatIcon>
            <StatContent>
              <StatLabel>참전 국가</StatLabel>
              <StatValue>{value.countries.length}</StatValue>
            </StatContent>
          </StatItem>
          <StatDivider />
          <StatItem>
            <StatIcon>
              <FiLink size={24} />
            </StatIcon>
            <StatContent>
              <StatLabel>관계</StatLabel>
              <StatValue>{value.relations.length}</StatValue>
            </StatContent>
          </StatItem>
        </StatsGroup>
        <AddButton type="button" onClick={handleAddCountry}>
          <FiPlus size={16} />
          <span>국가 추가</span>
        </AddButton>
      </StatsBar>

      {/* 국가 목록 */}
      <CountriesSection>
        {value.countries.length === 0 ? (
          <EmptyState>
            <EmptyIcon>
              <FiGlobe size={48} />
            </EmptyIcon>
            <EmptyText>
              <EmptyTitle>참전 국가가 없습니다</EmptyTitle>
              <EmptyDescription>
                국가를 추가하여 교전 세력을 구성하세요
              </EmptyDescription>
            </EmptyText>
            <EmptyButton type="button" onClick={handleAddCountry}>
              <FiPlus size={16} />
              <span>첫 번째 국가 추가</span>
            </EmptyButton>
          </EmptyState>
        ) : (
          <TwoColumnLayout>
            {/* 왼쪽: 국가 목록 */}
            <CountryListColumn>
              <ColumnHeader>
                <FiGlobe size={18} />
                <h3>참전 국가 목록</h3>
                <CountBadge>{value.countries.length}</CountBadge>
              </ColumnHeader>
              <CountryList>
                {value.countries.map((country) => {
                  const isSelected = selectedCountryId === country.countryId
                  const relationsCount = value.relations.filter(
                    (rel) =>
                      rel.fromCountry === country.countryId ||
                      rel.toCountry === country.countryId,
                  ).length

                  return (
                    <CountryListItem
                      key={country.countryId}
                      $selected={isSelected}
                      onClick={() => setSelectedCountryId(country.countryId)}
                    >
                      <CountryListInfo>
                        <CountryListName>
                          {country.flagEmoji && (
                            <span>{country.flagEmoji}</span>
                          )}
                          {country.countryName || '국가를 선택하세요'}
                        </CountryListName>
                        {country.role && (
                          <CountryListRole>{country.role}</CountryListRole>
                        )}
                        {relationsCount > 0 && (
                          <RelationsBadge>
                            {relationsCount}개 관계
                          </RelationsBadge>
                        )}
                      </CountryListInfo>
                      <CountryListActions onClick={(e) => e.stopPropagation()}>
                        <IconButton
                          type="button"
                          onClick={() =>
                            handleStartAddRelation(country.countryId)
                          }
                          title="관계 추가"
                        >
                          <FiLink size={14} />
                        </IconButton>
                        <DeleteButton
                          type="button"
                          onClick={() => handleRemoveCountry(country.countryId)}
                        >
                          <FiTrash2 size={14} />
                        </DeleteButton>
                      </CountryListActions>
                    </CountryListItem>
                  )
                })}
              </CountryList>
            </CountryListColumn>

            {/* 오른쪽: 선택된 국가 상세 정보 */}
            <CountryDetailColumn>
              {selectedCountryId ? (
                (() => {
                  const country = value.countries.find(
                    (c) => c.countryId === selectedCountryId,
                  )
                  if (!country) return null

                  return (
                    <>
                      <ColumnHeader>
                        <FiUsers size={18} />
                        <h3>국가 상세 정보</h3>
                      </ColumnHeader>
                      <CountryDetails>
                        {/* 기존 상세 정보 폼들 */}
                        {/* 진영 선택 - 모달 방식 */}
                        {sides.length > 0 && (
                          <FormGroup>
                            <Label>
                              <FiShield size={14} style={{ marginRight: '4px' }} />
                              진영
                            </Label>
                            <FactionSelectButton
                              type="button"
                              onClick={() => {
                                setFactionModalState({
                                  isOpen: true,
                                  countryId: country.countryId,
                                })
                              }}
                              $hasValue={!!country.role}
                            >
                              <FactionSelectContent>
                                <FactionIcon>
                                  {country.role ? '🛡️' : '⚪'}
                                </FactionIcon>
                                <span>{country.role || '진영을 선택하세요'}</span>
                              </FactionSelectContent>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M7 10l5 5 5-5H7z" fill="currentColor" />
                              </svg>
                            </FactionSelectButton>
                            {country.role && (
                              <ClearFactionButton
                                type="button"
                                onClick={() => {
                                handleUpdateCountry(country.countryId, {
                                    role: '',
                                })
                                }}
                            >
                                <FiX size={14} />
                                <span>진영 해제</span>
                              </ClearFactionButton>
                            )}
                          </FormGroup>
                        )}

                        <FormGroup>
                          <Label>국가 선택</Label>
                          <SelectButton
                            type="button"
                            onClick={() =>
                              handleChangeCountry(country.countryId)
                            }
                          >
                            {country.countryName || '국가를 선택하세요'}
                          </SelectButton>
                        </FormGroup>

                        {/* 참전 날짜 */}
                        <DateTimeGroup>
                          <DateTimeLabel>참전 날짜</DateTimeLabel>
                          <DateTimeInputs>
                            <DateInputButton
                              type="button"
                              onClick={() => {
                                setDateModalState({
                                  isOpen: true,
                                  type: 'join',
                                  countryId: country.countryId,
                                })
                              }}
                            >
                              <FiCalendar size={14} />
                              <span>
                                {(country as any).joinDate
                                  ? getDateFromISO((country as any).joinDate)
                                  : '날짜 선택'}
                              </span>
                            </DateInputButton>
                            <TimeInputButton
                              type="button"
                              onClick={() => {
                                setTimeModalState({
                                  isOpen: true,
                                  type: 'join',
                                  countryId: country.countryId,
                                })
                              }}
                            >
                              <FiClock size={14} />
                              <span>
                                {getTimeFromISO((country as any).joinDate) ||
                                  '시간'}
                              </span>
                            </TimeInputButton>
                          </DateTimeInputs>
                        </DateTimeGroup>

                        {/* 철수 날짜 */}
                        <DateTimeGroup>
                          <DateTimeLabel>철수 날짜 (선택)</DateTimeLabel>
                          <DateTimeInputs>
                            <DateInputButton
                              type="button"
                              onClick={() => {
                                setDateModalState({
                                  isOpen: true,
                                  type: 'withdraw',
                                  countryId: country.countryId,
                                })
                              }}
                            >
                              <FiCalendar size={14} />
                              <span>
                                {(country as any).withdrawDate
                                  ? getDateFromISO(
                                      (country as any).withdrawDate,
                                    )
                                  : '날짜 선택'}
                              </span>
                            </DateInputButton>
                            <TimeInputButton
                              type="button"
                              onClick={() => {
                                setTimeModalState({
                                  isOpen: true,
                                  type: 'withdraw',
                                  countryId: country.countryId,
                                })
                              }}
                            >
                              <FiClock size={14} />
                              <span>
                                {getTimeFromISO(
                                  (country as any).withdrawDate,
                                ) || '시간'}
                              </span>
                            </TimeInputButton>
                          </DateTimeInputs>
                        </DateTimeGroup>

                        <FormGroup>
                          <Label>지휘관</Label>
                          <Input
                            type="text"
                            value={country.commander || ''}
                            onChange={(e) =>
                              handleUpdateCountry(country.countryId, {
                                commander: e.target.value,
                              })
                            }
                            placeholder="예: 아돌프 히틀러"
                          />
                        </FormGroup>

                        {/* 군사 정보 섹션 */}
                        <div
                          style={{
                            background:
                              'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(220, 38, 38, 0.05) 100%)',
                            border: '1.5px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '12px',
                            padding: '16px',
                            marginTop: '16px',
                            marginBottom: '16px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              marginBottom: '12px',
                            }}
                          >
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                background:
                                  'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <FiShield size={16} color="#ef4444" />
                            </div>
                            <h4
                              style={{
                                margin: 0,
                                fontSize: '14px',
                                fontWeight: 600,
                                color: '#dc2626',
                              }}
                            >
                              군사 정보
                            </h4>
                          </div>

                          <FormGroup>
                            <Label>병력 규모</Label>
                            <Input
                              type="text"
                              value={country.forces || ''}
                              onChange={(e) =>
                                handleUpdateCountry(country.countryId, {
                                  forces: e.target.value,
                                })
                              }
                              placeholder="예: 1,500,000명"
                            />
                          </FormGroup>

                          <FormGroup>
                            <Label>참여도</Label>
                            <Select
                              value={country.participation}
                              onChange={(e) =>
                                handleUpdateCountry(country.countryId, {
                                  participation: e.target.value as any,
                                })
                              }
                            >
                              <option value="full">전면 참전</option>
                              <option value="limited">제한적 참전</option>
                              <option value="indirect">간접 참전</option>
                              <option value="non-combatant">비전투 지원</option>
                            </Select>
                          </FormGroup>
                        </div>

                        <FormGroup>
                          <Label>역할/설명</Label>
                          <TextArea
                            value={country.description || ''}
                            onChange={(e) =>
                              handleUpdateCountry(country.countryId, {
                                description: e.target.value,
                              })
                            }
                            placeholder="이 국가의 역할, 목표, 특징 등"
                            rows={3}
                          />
                        </FormGroup>

                        {/* 이 국가와 관련된 관계들 */}
                        {(parentRelations.filter(
                          (rel) =>
                            rel.fromCountry === country.countryId ||
                            rel.toCountry === country.countryId,
                        ).length > 0 ||
                          value.relations.filter(
                            (rel) =>
                              rel.fromCountry === country.countryId ||
                              rel.toCountry === country.countryId,
                          ).length > 0 ||
                          childRelations.filter(
                            (item) =>
                              item.relation.fromCountry === country.countryId ||
                              item.relation.toCountry === country.countryId,
                          ).length > 0) && (
                          <RelationsSection>
                            <RelationsHeader>
                              <FiLink size={16} />이 국가의 관계
                            </RelationsHeader>

                            {/* 상위 사건에서 상속된 관계 */}
                            {parentRelations.filter(
                              (rel) =>
                                rel.fromCountry === country.countryId ||
                                rel.toCountry === country.countryId,
                            ).length > 0 && (
                              <>
                                <InheritedRelationsLabel>
                                  <FiAlertCircle size={12} />
                                  상위 사건에서 상속
                                </InheritedRelationsLabel>
                                {parentRelations
                                  .filter(
                                    (rel) =>
                                      rel.fromCountry === country.countryId ||
                                      rel.toCountry === country.countryId,
                                  )
                                  .map((rel, idx) => {
                                    const otherCountryId =
                                      rel.fromCountry === country.countryId
                                        ? rel.toCountry
                                        : rel.fromCountry
                                    const otherCountry = value.countries.find(
                                      (c) => c.countryId === otherCountryId,
                                    )
                                    return (
                                      <InheritedRelationItem
                                        key={`inherited-${idx}`}
                                        $type={rel.relationType}
                                      >
                                        <RelationIcon $type={rel.relationType}>
                                          {getRelationIcon(rel.relationType)}
                                        </RelationIcon>
                                        <RelationInfo>
                                          <RelationTarget>
                                            {otherCountry?.countryName ||
                                              otherCountryId}
                                          </RelationTarget>
                                          <RelationType>
                                            {getRelationLabel(rel.relationType)}
                                          </RelationType>
                                        </RelationInfo>
                                        <InheritedBadge>상속</InheritedBadge>
                                      </InheritedRelationItem>
                                    )
                                  })}
                              </>
                            )}

                            {/* 현재 사건의 관계 */}
                            {value.relations.filter(
                              (rel) =>
                                rel.fromCountry === country.countryId ||
                                rel.toCountry === country.countryId,
                            ).length > 0 && (
                              <>
                                {parentRelations.length > 0 && (
                                  <CurrentRelationsLabel>
                                    현재 사건의 관계
                                  </CurrentRelationsLabel>
                                )}
                                {value.relations
                                  .filter(
                                    (rel) =>
                                      rel.fromCountry === country.countryId ||
                                      rel.toCountry === country.countryId,
                                  )
                                  .map((rel) => {
                                    const otherCountryId =
                                      rel.fromCountry === country.countryId
                                        ? rel.toCountry
                                        : rel.fromCountry
                                    const otherCountry = value.countries.find(
                                      (c) => c.countryId === otherCountryId,
                                    )
                                    return (
                                      <RelationItem
                                        key={rel.id}
                                        $type={rel.relationType}
                                      >
                                        <RelationIcon $type={rel.relationType}>
                                          {getRelationIcon(rel.relationType)}
                                        </RelationIcon>
                                        <RelationInfo>
                                          <RelationTarget>
                                            {otherCountry?.countryName ||
                                              otherCountryId}
                                          </RelationTarget>
                                          <RelationType>
                                            {getRelationLabel(rel.relationType)}
                                          </RelationType>
                                        </RelationInfo>
                                        <DeleteButton
                                          type="button"
                                          onClick={() =>
                                            handleRemoveRelation(rel.id)
                                          }
                                        >
                                          <FiX size={12} />
                                        </DeleteButton>
                                      </RelationItem>
                                    )
                                  })}
                              </>
                            )}

                            {/* 하위 사건들의 관계 */}
                            {childRelations.filter(
                              (item) =>
                                item.relation.fromCountry ===
                                  country.countryId ||
                                item.relation.toCountry === country.countryId,
                            ).length > 0 && (
                              <>
                                <ChildRelationsLabel>
                                  <FiAlertCircle size={12} />
                                  하위 사건의 관계
                                </ChildRelationsLabel>
                                {childRelations
                                  .filter(
                                    (item) =>
                                      item.relation.fromCountry ===
                                        country.countryId ||
                                      item.relation.toCountry ===
                                        country.countryId,
                                  )
                                  .map((item, idx) => {
                                    const rel = item.relation
                                    const otherCountryId =
                                      rel.fromCountry === country.countryId
                                        ? rel.toCountry
                                        : rel.fromCountry
                                    const otherCountry = value.countries.find(
                                      (c) => c.countryId === otherCountryId,
                                    )
                                    return (
                                      <ChildRelationItem
                                        key={`child-${idx}`}
                                        $type={rel.relationType}
                                      >
                                        <RelationIcon $type={rel.relationType}>
                                          {getRelationIcon(rel.relationType)}
                                        </RelationIcon>
                                        <RelationInfo>
                                          <RelationTarget>
                                            {otherCountry?.countryName ||
                                              otherCountryId}
                                          </RelationTarget>
                                          <RelationType>
                                            {getRelationLabel(rel.relationType)}
                                          </RelationType>
                                        </RelationInfo>
                                        <ChildEventBadge>
                                          {item.sourceName}
                                        </ChildEventBadge>
                                      </ChildRelationItem>
                                    )
                                  })}
                              </>
                            )}
                          </RelationsSection>
                        )}
                      </CountryDetails>
                    </>
                  )
                })()
              ) : (
                <EmptyDetailState>
                  <FiUsers size={48} color="#cbd5e1" />
                  <p>왼쪽에서 국가를 선택하면</p>
                  <p>상세 정보를 입력할 수 있습니다</p>
                </EmptyDetailState>
              )}
            </CountryDetailColumn>
          </TwoColumnLayout>
        )}
      </CountriesSection>

      {/* 국가 선택 모달 (공용 컴포넌트 사용) */}
      <CountrySelectModal
        isOpen={countryModalOpen}
        onClose={() => {
          setCountryModalOpen(false)
          setSelectingCountryFor(null)
        }}
        onSelect={handleCountrySelect}
        modernCountries={modernCountries}
        historicalCountries={historicalCountries}
        title="국가 선택"
      />

      {/* 날짜 선택 모달 */}
      <DatePickerModal
        isOpen={dateModalState.isOpen}
        onClose={() =>
          setDateModalState({
            isOpen: false,
            type: 'join',
            countryId: null,
          })
        }
        onSelect={(date) => {
          const { type, countryId } = dateModalState
          if (!countryId) return

          const country = value.countries.find((c) => c.countryId === countryId)
          if (!country) return

          const oldValue =
            type === 'join'
              ? (country as any).joinDate
              : (country as any).withdrawDate
          const time = getTimeFromISO(oldValue)
          const newValue = combineDateTime(date, time, oldValue)

          handleUpdateCountry(countryId, {
            ...(country as any),
            [type === 'join' ? 'joinDate' : 'withdrawDate']: newValue,
          })

          setDateModalState({
            isOpen: false,
            type: 'join',
            countryId: null,
          })
        }}
        initialDate={
          dateModalState.countryId
            ? getDateFromISO(
                (
                  value.countries.find(
                    (c) => c.countryId === dateModalState.countryId,
                  ) as any
                )?.[
                  dateModalState.type === 'join' ? 'joinDate' : 'withdrawDate'
                ],
              )
            : ''
        }
        title={
          dateModalState.type === 'join' ? '참전 날짜 선택' : '철수 날짜 선택'
        }
      />

      {/* 시간 선택 모달 */}
      <TimePickerModal
        isOpen={timeModalState.isOpen}
        onClose={() =>
          setTimeModalState({
            isOpen: false,
            type: 'join',
            countryId: null,
          })
        }
        onSelect={(time) => {
          const { type, countryId } = timeModalState
          if (!countryId) return

          const country = value.countries.find((c) => c.countryId === countryId)
          if (!country) return

          const oldValue =
            type === 'join'
              ? (country as any).joinDate
              : (country as any).withdrawDate
          const date = getDateFromISO(oldValue)
          const newValue = combineDateTime(date, time, oldValue)

          handleUpdateCountry(countryId, {
            ...(country as any),
            [type === 'join' ? 'joinDate' : 'withdrawDate']: newValue,
          })

          setTimeModalState({
            isOpen: false,
            type: 'join',
            countryId: null,
          })
        }}
        initialTime={
          timeModalState.countryId
            ? getTimeFromISO(
                (
                  value.countries.find(
                    (c) => c.countryId === timeModalState.countryId,
                  ) as any
                )?.[
                  timeModalState.type === 'join' ? 'joinDate' : 'withdrawDate'
                ],
              )
            : ''
        }
        title={
          timeModalState.type === 'join' ? '참전 시간 선택' : '철수 시간 선택'
        }
      />

      {/* 진영 선택 모달 */}
      {factionModalState.isOpen && factionModalState.countryId && (
        <Modal>
          <ModalOverlay onClick={() => setFactionModalState({ isOpen: false, countryId: null })} />
          <ModalContent>
            <ModalHeader>
              <ModalHeaderLeft>
                <ModalIconWrapper>
                  <FiShield size={20} />
                </ModalIconWrapper>
                <div>
                  <ModalTitle>진영 선택</ModalTitle>
                  <ModalSubtitle>국가가 속할 진영을 선택하세요</ModalSubtitle>
                </div>
              </ModalHeaderLeft>
              <CloseButton
                type="button"
                onClick={() => setFactionModalState({ isOpen: false, countryId: null })}
              >
                <FiX size={20} />
              </CloseButton>
            </ModalHeader>

            <ModalBody>
              <FactionGrid>
                <FactionOption
                  type="button"
                  $selected={!value.countries.find(c => c.countryId === factionModalState.countryId)?.role}
                  onClick={() => {
                    if (factionModalState.countryId) {
                      handleUpdateCountry(factionModalState.countryId, { role: '' })
                      setFactionModalState({ isOpen: false, countryId: null })
                    }
                  }}
                >
                  <FactionOptionLabel>진영 없음</FactionOptionLabel>
                  <FactionOptionDesc>중립 또는 미지정</FactionOptionDesc>
                </FactionOption>
                {sides.map((side) => (
                  <FactionOption
                    key={side.id}
                    type="button"
                    $selected={value.countries.find(c => c.countryId === factionModalState.countryId)?.role === side.name}
                    $color={side.color}
                    onClick={() => {
                      if (factionModalState.countryId) {
                        handleUpdateCountry(factionModalState.countryId, { role: side.name })
                        setFactionModalState({ isOpen: false, countryId: null })
                      }
                    }}
                  >
                    <FactionOptionLabel>{side.name}</FactionOptionLabel>
                    <FactionOptionDesc>진영 선택</FactionOptionDesc>
                  </FactionOption>
                ))}
              </FactionGrid>
            </ModalBody>
          </ModalContent>
        </Modal>
      )}

      {/* 관계 추가 모달 */}
      {editingRelation && (
        <Modal>
          <ModalOverlay onClick={() => setEditingRelation(null)} />
          <ModalContent>
            <ModalHeader>
              <ModalHeaderLeft>
                <ModalIconWrapper>
                  <FiLink size={20} />
                </ModalIconWrapper>
                <div>
                  <ModalTitle>국가 간 관계 추가</ModalTitle>
                  <ModalSubtitle>
                    두 국가 사이의 관계를 설정하세요
                  </ModalSubtitle>
                </div>
              </ModalHeaderLeft>
              <CloseButton
                type="button"
                onClick={() => setEditingRelation(null)}
              >
                <FiX size={20} />
              </CloseButton>
            </ModalHeader>

            <ModalBody>
              {/* 국가 관계 흐름도 */}
              <RelationFlowBox>
                <RelationCountryBox>
                  <CountryLabel>출발 국가</CountryLabel>
                  <RelationCountryName>
                    {value.countries.find(
                      (c) => c.countryId === editingRelation.fromCountry,
                    )?.countryName || ''}
                  </RelationCountryName>
                </RelationCountryBox>
                <RelationArrow>
                  <FiLink size={24} color="#6366f1" />
                </RelationArrow>
                <RelationCountryBox>
                  <CountryLabel>대상 국가</CountryLabel>
                  <Select
                    value={editingRelation.toCountry}
                    onChange={(e) =>
                      setEditingRelation({
                        ...editingRelation,
                        toCountry: e.target.value,
                      })
                    }
                  >
                    <option value="">선택하세요</option>
                    {value.countries
                      .filter(
                        (c) => c.countryId !== editingRelation.fromCountry,
                      )
                      .map((c) => (
                        <option key={c.countryId} value={c.countryId}>
                          {c.countryName}
                        </option>
                      ))}
                  </Select>
                </RelationCountryBox>
              </RelationFlowBox>

              <FormGroup>
                <Label>
                  <FiShield size={16} />
                  관계 타입
                </Label>
                <RelationTypeGrid>
                  {[
                    {
                      value: 'allied',
                      label: '동맹',
                      icon: FiHeart,
                      color: '#3b82f6',
                    },
                    {
                      value: 'cooperation',
                      label: '협력',
                      icon: FiZap,
                      color: '#6366f1',
                    },
                    {
                      value: 'non-aggression',
                      label: '불가침',
                      icon: FiShield,
                      color: '#8b5cf6',
                    },
                    {
                      value: 'neutral',
                      label: '중립',
                      icon: FiMinus,
                      color: '#64748b',
                    },
                    {
                      value: 'enemy',
                      label: '적대',
                      icon: FiTarget,
                      color: '#ef4444',
                    },
                    {
                      value: 'puppet',
                      label: '괴뢰',
                      icon: FiEye,
                      color: '#f59e0b',
                    },
                    {
                      value: 'occupied',
                      label: '점령',
                      icon: FiAlertTriangle,
                      color: '#dc2626',
                    },
                  ].map((type) => (
                    <RelationTypeButton
                      key={type.value}
                      type="button"
                      $selected={editingRelation.relationType === type.value}
                      $color={type.color}
                      onClick={() =>
                        setEditingRelation({
                          ...editingRelation,
                          relationType: type.value as RelationType,
                        })
                      }
                    >
                      <type.icon size={20} />
                      <span>{type.label}</span>
                    </RelationTypeButton>
                  ))}
                </RelationTypeGrid>
              </FormGroup>

              <FormGroup>
                <Label>설명 (선택)</Label>
                <TextArea
                  value={editingRelation.description || ''}
                  onChange={(e) =>
                    setEditingRelation({
                      ...editingRelation,
                      description: e.target.value,
                    })
                  }
                  placeholder="예: 독소 불가침 조약에 따라..."
                  rows={3}
                />
              </FormGroup>
            </ModalBody>

            <ModalFooter>
              <CancelButton
                type="button"
                onClick={() => setEditingRelation(null)}
              >
                취소
              </CancelButton>
              <ConfirmButton
                type="button"
                onClick={handleFinishAddRelation}
                disabled={!editingRelation.toCountry}
              >
                <FiLink size={16} />
                관계 추가
              </ConfirmButton>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </Container>
  )
}

// ============================================
// 헬퍼 함수
// ============================================

function getRelationIcon(type: RelationType): string {
  const icons: Record<RelationType, string> = {
    allied: '🤝',
    cooperation: '🔗',
    'non-aggression': '✋',
    neutral: '⚖️',
    enemy: '⚔️',
    puppet: '🎭',
    occupied: '🏴',
  }
  return icons[type]
}

function getRelationLabel(type: RelationType): string {
  const labels: Record<RelationType, string> = {
    allied: '동맹',
    cooperation: '협력',
    'non-aggression': '불가침',
    neutral: '중립',
    enemy: '적대',
    puppet: '괴뢰',
    occupied: '점령',
  }
  return labels[type]
}

// ============================================
// 스타일 컴포넌트 (event-create.page.tsx와 동일한 디자인)
// ============================================

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const ErrorBox = styled.div`
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background: #fef2f2;
  border: 1.5px solid #fecaca;
  border-radius: 10px;
  color: #dc2626;
  font-size: 13px;
`

const StatsBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: white;
  border: 1.5px solid rgba(99, 102, 241, 0.12);
  border-radius: 12px;
`

const StatsGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
`

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const StatIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: rgba(99, 102, 241, 0.08);
  border-radius: 10px;
  color: #6366f1;
`

const StatContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const StatLabel = styled.div`
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
`

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1;
`

const StatDivider = styled.div`
  width: 1px;
  height: 32px;
  background: rgba(99, 102, 241, 0.12);
`

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 24px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    transform: translate(-50%, -50%);
    transition:
      width 0.4s ease,
      height 0.4s ease;
  }

  svg {
    transition: transform 0.3s ease;
    position: relative;
    z-index: 1;
  }

  span {
    position: relative;
    z-index: 1;
  }

  &:hover {
    background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);

    &::before {
      width: 300px;
      height: 300px;
    }

    svg {
      transform: rotate(90deg) scale(1.1);
    }
  }

  &:active {
    transform: translateY(0);
  }
`

const CountriesSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

// 2단 레이아웃
const TwoColumnLayout = styled.div`
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 20px;
  min-height: 500px;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`

const CountryListColumn = styled.div`
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
`

const CountryDetailColumn = styled.div`
  display: flex;
  flex-direction: column;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
`

const ColumnHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  background: white;
  border-bottom: 1px solid #e2e8f0;

  h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: #1e293b;
    flex: 1;
  }

  svg {
    color: #6366f1;
  }
`

const CountBadge = styled.div`
  padding: 4px 10px;
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  font-size: 12px;
  font-weight: 600;
  border-radius: 12px;
`

const CountryList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f5f9;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;

    &:hover {
      background: #94a3b8;
    }
  }
`

const CountryListItem = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  margin-bottom: 6px;
  background: ${(props) => (props.$selected ? '#ffffff' : 'transparent')};
  border: 1px solid ${(props) => (props.$selected ? '#6366f1' : 'transparent')};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: ${(props) =>
    props.$selected ? '0 2px 8px rgba(99, 102, 241, 0.15)' : 'none'};

  &:hover {
    background: #ffffff;
    border-color: ${(props) => (props.$selected ? '#6366f1' : '#e2e8f0')};
  }
`

const CountryListInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const CountryListName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  span {
    font-size: 16px;
  }
`

const CountryListRole = styled.div`
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const CountryListActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`

const EmptyDetailState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #94a3b8;
  padding: 40px;
  text-align: center;

  p {
    margin: 0;
    font-size: 14px;
    color: #64748b;
  }
`

const CountriesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  background: white;
  border: 1.5px dashed rgba(99, 102, 241, 0.2);
  border-radius: 12px;
`

const EmptyIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: rgba(99, 102, 241, 0.06);
  border-radius: 50%;
  color: #6366f1;
  margin-bottom: 20px;
`

const EmptyText = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
  text-align: center;
`

const EmptyTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
`

const EmptyDescription = styled.div`
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
`

const EmptyButton = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  font-size: 15px;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    transform: translate(-50%, -50%);
    transition:
      width 0.5s ease,
      height 0.5s ease;
  }

  svg {
    transition: transform 0.3s ease;
    position: relative;
    z-index: 1;
  }

  span {
    position: relative;
    z-index: 1;
  }

  &:hover {
    background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);

    &::before {
      width: 400px;
      height: 400px;
    }

    svg {
      transform: rotate(180deg) scale(1.2);
    }
  }

  &:active {
    transform: translateY(-1px) scale(1);
  }
`

const CountryCard = styled.div<{ $selected: boolean }>`
  padding: 16px;
  background: white;
  border: 1.5px solid
    ${(props) =>
      props.$selected ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.12)'};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.25);
  }
`

const CountryCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const CountryName = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;

  span {
    font-size: 20px;
  }
`

const RelationsBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 600;
  color: #6366f1;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(79, 70, 229, 0.08) 100%);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 8px;
  white-space: nowrap;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(99, 102, 241, 0.1);

  &::before {
    content: '🔗';
    font-size: 12px;
  }

  &:hover {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.18) 0%, rgba(79, 70, 229, 0.12) 100%);
    border-color: rgba(99, 102, 241, 0.3);
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(99, 102, 241, 0.15);
  }
`

const CardActions = styled.div`
  display: flex;
  gap: 4px;
`

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(99, 102, 241, 0.2);
  }
`

const DeleteButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
  }
`

const CountryDetails = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f5f9;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;

    &:hover {
      background: #94a3b8;
    }
  }
`

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const Label = styled.label`
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
`

const Input = styled.input`
  border: 1.5px solid rgba(99, 102, 241, 0.12);
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 14px;
  color: #0f172a;
  transition: all 0.2s ease;

  &::placeholder {
    color: #94a3b8;
  }

  &:hover {
    border-color: rgba(99, 102, 241, 0.25);
  }

  &:focus {
    outline: none;
    border-color: rgba(99, 102, 241, 0.4);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  &:disabled {
    background: #f1f5f9;
    cursor: not-allowed;
  }
`

const Select = styled.select`
  border: 1.5px solid rgba(99, 102, 241, 0.12);
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 14px;
  color: #0f172a;
  transition: all 0.2s ease;
  background: white;
  cursor: pointer;

  &:hover {
    border-color: rgba(99, 102, 241, 0.25);
  }

  &:focus {
    outline: none;
    border-color: rgba(99, 102, 241, 0.4);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`

const SelectButton = styled.button`
  border: 1.5px solid rgba(99, 102, 241, 0.12);
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 14px;
  color: #0f172a;
  background: white;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.25);
  }

  &:focus {
    outline: none;
    border-color: rgba(99, 102, 241, 0.4);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`

const TextArea = styled.textarea`
  border: 1.5px solid rgba(99, 102, 241, 0.12);
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 14px;
  color: #0f172a;
  resize: vertical;
  transition: all 0.2s ease;
  font-family: inherit;

  &::placeholder {
    color: #94a3b8;
  }

  &:hover {
    border-color: rgba(99, 102, 241, 0.25);
  }

  &:focus {
    outline: none;
    border-color: rgba(99, 102, 241, 0.4);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`

const RelationsSection = styled.div`
  margin-top: 8px;
`

const RelationsHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 12px;
`

const InheritedRelationsLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #6366f1;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 12px;
  margin-bottom: 6px;
  padding-left: 4px;
`

const CurrentRelationsLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 16px;
  margin-bottom: 6px;
  padding-left: 4px;
`

const ChildRelationsLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #10b981;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 16px;
  margin-bottom: 6px;
  padding-left: 4px;
`

const RelationItem = styled.div<{ $type: RelationType }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 6px;
  background: ${(props) => {
    const colors: Record<RelationType, string> = {
      allied: '#dbeafe',
      cooperation: '#e0e7ff',
      'non-aggression': '#f3f4f6',
      neutral: '#f3f4f6',
      enemy: '#fee2e2',
      puppet: '#fef3c7',
      occupied: '#fecaca',
    }
    return colors[props.$type]
  }};
  border-radius: 8px;
`

// 상속된 관계 아이템 (읽기전용)
const InheritedRelationItem = styled(RelationItem)`
  opacity: 0.7;
  border: 1.5px dashed #6366f1;
  background: ${(props) => {
    const colors: Record<RelationType, string> = {
      allied: '#eef2ff',
      cooperation: '#f5f3ff',
      'non-aggression': '#fafafa',
      neutral: '#fafafa',
      enemy: '#fef2f2',
      puppet: '#fffbeb',
      occupied: '#fef2f2',
    }
    return colors[props.$type]
  }};
`

// 하위 사건의 관계 아이템 (읽기전용)
const ChildRelationItem = styled(RelationItem)`
  opacity: 0.8;
  border: 1.5px dashed #10b981;
  background: ${(props) => {
    const colors: Record<RelationType, string> = {
      allied: '#f0fdf4',
      cooperation: '#f0fdf4',
      'non-aggression': '#fafafa',
      neutral: '#fafafa',
      enemy: '#fef2f2',
      puppet: '#fffbeb',
      occupied: '#fef2f2',
    }
    return colors[props.$type]
  }};
`

const InheritedBadge = styled.div`
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 600;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const ChildEventBadge = styled.div`
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 600;
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 4px;
  max-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const RelationIcon = styled.div<{ $type: RelationType }>`
  font-size: 16px;
`

const RelationInfo = styled.div`
  flex: 1;
`

const RelationTarget = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
`

const RelationType = styled.div`
  font-size: 11px;
  color: #64748b;
`

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
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
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
  background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%);
  border-bottom: 1px solid #e2e8f0;
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
  color: #1e293b;
`

const ModalSubtitle = styled.p`
  margin: 4px 0 0 0;
  font-size: 13px;
  color: #64748b;
`

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;

  &:hover {
    background: #f1f5f9;
    color: #0f172a;
  }
`

const ModalBody = styled.div`
  padding: 20px;
  overflow-y: auto;
  flex: 1;
`

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  border-radius: 0 0 16px 16px;
`

const CancelButton = styled.button`
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f1f5f9;
    border-color: #94a3b8;
  }
`

const ConfirmButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`

// 관계 흐름도 스타일
const RelationFlowBox = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #f0f9ff 100%);
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  margin-bottom: 20px;
`

const RelationCountryBox = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const CountryLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const RelationCountryName = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  padding: 10px 14px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
`

const RelationArrow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 24px;
`

const RelationTypeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
`

const RelationTypeButton = styled.button<{
  $selected: boolean
  $color: string
}>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: ${(props) => (props.$selected ? `${props.$color}15` : 'white')};
  border: 2px solid ${(props) => (props.$selected ? props.$color : '#e2e8f0')};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;

  svg {
    color: ${(props) => (props.$selected ? props.$color : '#94a3b8')};
    transition: all 0.2s;
  }

  span {
    font-size: 13px;
    font-weight: 600;
    color: ${(props) => (props.$selected ? props.$color : '#64748b')};
  }

  &:hover {
    border-color: ${(props) => props.$color};
    background: ${(props) => `${props.$color}10`};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${(props) => `${props.$color}30`};

    svg {
      color: ${(props) => props.$color};
      transform: scale(1.1);
    }
  }

  &:active {
    transform: translateY(0);
  }
`

// 날짜/시간 입력 스타일
const DateTimeGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
`

const DateTimeLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #475569;
`

const DateTimeInputs = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 8px;
`

const DateInputButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #cbd5e1;
    background: #f8fafc;
  }

  span {
    flex: 1;
    text-align: left;
  }

  svg {
    flex-shrink: 0;
    color: #64748b;
  }
`

const TimeInputButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #cbd5e1;
    background: #f8fafc;
  }

  svg {
    flex-shrink: 0;
  }
`

// 진영 선택 버튼 스타일
const FactionSelectButton = styled.button<{ $hasValue?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 14px;
  background: ${(props) => (props.$hasValue ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(79, 70, 229, 0.05) 100%)' : 'white')};
  border: 1.5px solid ${(props) => (props.$hasValue ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.12)')};
  border-radius: 10px;
  font-size: 14px;
  color: ${(props) => (props.$hasValue ? '#1e293b' : '#94a3b8')};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.35);
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(79, 70, 229, 0.08) 100%);
  }

  &:focus {
    outline: none;
    border-color: rgba(99, 102, 241, 0.4);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  svg {
    color: #6366f1;
    transition: transform 0.2s ease;
  }

  &:hover svg {
    transform: translateY(2px);
  }
`

const FactionSelectContent = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  text-align: left;
`

const FactionIcon = styled.span`
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
`

const ClearFactionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  margin-top: 8px;
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #ef4444;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
  }

  span {
    flex: 1;
  }
`

const FactionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
`

const FactionOption = styled.button<{ $selected?: boolean; $color?: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 16px;
  background: ${(props) => 
    props.$selected 
      ? props.$color 
        ? `linear-gradient(135deg, ${props.$color}20 0%, ${props.$color}10 100%)`
        : 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(79, 70, 229, 0.1) 100%)'
      : 'white'
  };
  border: 2px solid ${(props) => 
    props.$selected 
      ? props.$color || '#6366f1'
      : '#e2e8f0'
  };
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${(props) => props.$color || '#6366f1'};
    background: ${(props) => 
      props.$color 
        ? `linear-gradient(135deg, ${props.$color}15 0%, ${props.$color}08 100%)`
        : 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(79, 70, 229, 0.05) 100%)'
    };
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${(props) => props.$color ? `${props.$color}30` : 'rgba(99, 102, 241, 0.2)'};
  }

  &:active {
    transform: translateY(0);
  }
`

const FactionOptionIcon = styled.div`
  font-size: 32px;
  margin-bottom: 4px;
`

const FactionOptionLabel = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
`

const FactionOptionDesc = styled.div`
  font-size: 12px;
  color: #64748b;
`
