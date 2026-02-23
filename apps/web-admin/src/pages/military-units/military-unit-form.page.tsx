/**
 * 군부대 생성/수정 페이지 - 최종 개선 버전
 * - 소속 국가 강조 디자인
 * - 역대 지휘관 관리 (좌우 분할 레이아웃)
 * - 계급/역할 선택 방식
 */
import React, { useEffect, useState } from 'react'

import {
  FiArrowLeft,
  FiAward,
  FiCalendar,
  FiCheck,
  FiEdit2,
  FiFileText,
  FiImage,
  FiInfo,
  FiPlus,
  FiSave,
  FiShield,
  FiTrash2,
  FiX,
} from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

import type { CountryResponseDto } from '@/shared/api/countries'
import { getAllCountries } from '@/shared/api/countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import type {
  CreateMilitaryUnitInput,
  MilitaryUnit,
  MilitaryUnitType,
} from '@/shared/api/military-unit'
import { militaryUnitApi } from '@/shared/api/military-unit'
import type { PersonResponseDto } from '@/shared/api/persons'
import { getAllPersons } from '@/shared/api/persons'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { CountrySelectModal } from '@/shared/ui/country-select-modal/CountrySelectModal'
import { DatePickerModal } from '@/shared/ui/date-picker/DatePickerModal'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/PersonSelectModal'

const UNIT_TYPES: { value: MilitaryUnitType; label: string }[] = [
  { value: 'FIELD_ARMY', label: '야전군' },
  { value: 'CORPS', label: '군단' },
  { value: 'DIVISION', label: '사단' },
  { value: 'BRIGADE', label: '여단' },
  { value: 'REGIMENT', label: '연대' },
  { value: 'BATTALION', label: '대대' },
  { value: 'COMPANY', label: '중대' },
  { value: 'PLATOON', label: '소대' },
  { value: 'SQUAD', label: '분대' },
  { value: 'FLEET', label: '함대' },
  { value: 'SQUADRON', label: '전대' },
  { value: 'WING', label: '비행단' },
  { value: 'SPECIAL_FORCES', label: '특수부대' },
  { value: 'DETACHMENT', label: '파견대' },
  { value: 'OTHER', label: '기타' },
]

const MILITARY_BRANCHES = [
  { value: 'ARMY', label: '육군' },
  { value: 'NAVY', label: '해군' },
  { value: 'AIR_FORCE', label: '공군' },
  { value: 'MARINE_CORPS', label: '해병대' },
  { value: 'COAST_GUARD', label: '해안경비대' },
  { value: 'SPACE_FORCE', label: '우주군' },
  { value: 'JOINT', label: '합동' },
  { value: 'OTHER', label: '기타' },
]

// 계급 목록 (데이터화)
const MILITARY_RANKS = [
  // 장성급
  { value: '대장', label: '대장', category: '장성급' },
  { value: '중장', label: '중장', category: '장성급' },
  { value: '소장', label: '소장', category: '장성급' },
  { value: '준장', label: '준장', category: '장성급' },
  // 영관급
  { value: '대령', label: '대령', category: '영관급' },
  { value: '중령', label: '중령', category: '영관급' },
  { value: '소령', label: '소령', category: '영관급' },
  // 위관급
  { value: '대위', label: '대위', category: '위관급' },
  { value: '중위', label: '중위', category: '위관급' },
  { value: '소위', label: '소위', category: '위관급' },
  // 해군
  { value: '제독', label: '제독', category: '해군' },
  { value: '부제독', label: '부제독', category: '해군' },
  { value: '함장', label: '함장', category: '해군' },
]

// 역할 목록 (데이터화) - 직책별 분류
const COMMANDER_ROLES = [
  // 지휘관
  { value: '사령관', label: '사령관', category: '지휘관' },
  { value: '군단장', label: '군단장', category: '지휘관' },
  { value: '사단장', label: '사단장', category: '지휘관' },
  { value: '여단장', label: '여단장', category: '지휘관' },
  { value: '연대장', label: '연대장', category: '지휘관' },
  { value: '대대장', label: '대대장', category: '지휘관' },
  { value: '중대장', label: '중대장', category: '지휘관' },
  { value: '소대장', label: '소대장', category: '지휘관' },
  { value: '분대장', label: '분대장', category: '지휘관' },
  // 참모
  { value: '참모장', label: '참모장', category: '참모' },
  { value: '부참모장', label: '부참모장', category: '참모' },
  { value: '작전과장', label: '작전과장 (G3/S3)', category: '참모' },
  { value: '정보과장', label: '정보과장 (G2/S2)', category: '참모' },
  { value: '인사과장', label: '인사과장 (G1/S1)', category: '참모' },
  { value: '군수과장', label: '군수과장 (G4/S4)', category: '참모' },
  { value: '민사과장', label: '민사과장 (G5/S5)', category: '참모' },
  { value: '통신과장', label: '통신과장 (G6/S6)', category: '참모' },
  // 해군/공군
  { value: '함대사령관', label: '함대사령관', category: '해군/공군' },
  { value: '함장', label: '함장', category: '해군/공군' },
  { value: '비행단장', label: '비행단장', category: '해군/공군' },
  { value: '편대장', label: '편대장', category: '해군/공군' },
  // 기타
  { value: '부관', label: '부관', category: '기타' },
  { value: '부사관', label: '부사관', category: '기타' },
  { value: '기타', label: '기타', category: '기타' },
]

type TabType = 'basic' | 'history' | 'military' | 'description'

interface Commander {
  id?: string
  personId: string
  personName: string
  rank: string
  role: string
  order: number // 차수 (제1대, 제2대...)
  startDate: string
  endDate?: string
  isCurrent: boolean
}

export const MilitaryUnitFormPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const playClickSound = useClickSound()
  const isEdit = !!id

  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('basic')
  const [modernCountries, setModernCountries] = useState<CountryResponseDto[]>(
    [],
  )
  const [historicalCountries, setHistoricalCountries] = useState<
    HistoricalCountryResponseDto[]
  >([])
  const [allUnits, setAllUnits] = useState<MilitaryUnit[]>([])
  const [allPersons, setAllPersons] = useState<PersonResponseDto[]>([])

  // Modals
  const [countryModalOpen, setCountryModalOpen] = useState(false)
  const [unitTypeModalOpen, setUnitTypeModalOpen] = useState(false)
  const [branchModalOpen, setBranchModalOpen] = useState(false)
  const [parentUnitModalOpen, setParentUnitModalOpen] = useState(false)
  const [establishedDateModalOpen, setEstablishedDateModalOpen] =
    useState(false)
  const [disbandedDateModalOpen, setDisbandedDateModalOpen] = useState(false)
  const [rankModalOpen, setRankModalOpen] = useState(false)
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [commanderStartDateModalOpen, setCommanderStartDateModalOpen] =
    useState(false)
  const [commanderEndDateModalOpen, setCommanderEndDateModalOpen] =
    useState(false)
  const [personSelectModalOpen, setPersonSelectModalOpen] = useState(false)

  // Form fields - 기본 정보
  const [name, setName] = useState('')
  const [unitType, setUnitType] = useState<MilitaryUnitType | ''>('')
  const [unitTypeName, setUnitTypeName] = useState('')
  const [branch, setBranch] = useState('')
  const [branchName, setBranchName] = useState('')
  const [countryId, setCountryId] = useState('')
  const [countryName, setCountryName] = useState('')
  const [countryFlagEmoji, setCountryFlagEmoji] = useState('')
  const [countryEnglishName, setCountryEnglishName] = useState('')
  const [parentUnitId, setParentUnitId] = useState('')
  const [parentUnitName, setParentUnitName] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [establishedDate, setEstablishedDate] = useState('')
  const [disbandedDate, setDisbandedDate] = useState('')
  const [description, setDescription] = useState('')

  // Form fields - 추가 군정보
  const [nickname, setNickname] = useState('')
  const [motto, setMotto] = useState('')
  const [garrison, setGarrison] = useState('')
  const [strength, setStrength] = useState('')
  const [insigniaUrl, setInsigniaUrl] = useState('')
  const [notableBattles, setNotableBattles] = useState('')
  const [honors, setHonors] = useState('')

  // 지휘관 관리 (좌우 분할)
  const [commanders, setCommanders] = useState<Commander[]>([])
  const [editingCommanderIndex, setEditingCommanderIndex] = useState<
    number | null
  >(null)
  const [commanderFormVisible, setCommanderFormVisible] = useState(false)

  // 지휘관 폼 필드
  const [selectedPersonId, setSelectedPersonId] = useState('')
  const [selectedPersonName, setSelectedPersonName] = useState('')
  const [commanderRank, setCommanderRank] = useState('')
  const [commanderRole, setCommanderRole] = useState('')
  const [commanderOrder, setCommanderOrder] = useState(1) // 차수
  const [commanderStartDate, setCommanderStartDate] = useState('')
  const [commanderEndDate, setCommanderEndDate] = useState('')
  const [commanderIsCurrent, setCommanderIsCurrent] = useState(false)

  useEffect(() => {
    loadCountries()
    loadAllUnits()
    loadAllPersons()
  }, [])

  useEffect(() => {
    if (isEdit && id) {
      loadMilitaryUnit(id)
    }
  }, [isEdit, id])

  const loadCountries = async () => {
    try {
      const [modern, historical] = await Promise.all([
        getAllCountries(),
        getAllHistoricalCountries(),
      ])
      setModernCountries(modern)
      setHistoricalCountries(historical)
    } catch {
      // ignore
    }
  }

  const loadAllUnits = async () => {
    try {
      const units = await militaryUnitApi.getAll()
      setAllUnits(units)
    } catch {
      // ignore
    }
  }

  const loadAllPersons = async () => {
    try {
      const persons = await getAllPersons()
      setAllPersons(persons)
    } catch {
      // ignore
    }
  }

  const loadMilitaryUnit = async (unitId: string) => {
    try {
      setLoading(true)
      const unit = await militaryUnitApi.getById(unitId)
      setName(unit.name)
      setUnitType(unit.unitType || '')
      setUnitTypeName(
        unit.unitType
          ? UNIT_TYPES.find((t) => t.value === unit.unitType)?.label || ''
          : '',
      )
      setCountryId(unit.countryId || '')
      if (unit.country) {
        setCountryName(unit.country.name)
        setCountryFlagEmoji(unit.country.flagEmoji || '🏳️')
        setCountryEnglishName('')
      }
      setParentUnitId(unit.parentUnitId || '')
      if (unit.parentUnit) {
        setParentUnitName(unit.parentUnit.name)
      }
      setIsActive(unit.isActive ?? true)
      setEstablishedDate(unit.establishedDate || '')
      setDisbandedDate(unit.disbandedDate || '')
      setDescription(unit.description || '')

      if (unit.commanders) {
        const loadedCommanders = unit.commanders.map((cmd) => ({
          id: cmd.id,
          personId: cmd.personId,
          personName: cmd.person
            ? `${cmd.person.name}${cmd.person.surname ? ' ' + cmd.person.surname : ''}`
            : '',
          rank: cmd.rank || '',
          role: cmd.role || '',
          startDate: '',
          endDate: '',
          isCurrent: cmd.isCurrent ?? false,
        }))
        setCommanders(loadedCommanders)
      }
    } catch {
      alert('군부대 정보를 불러오는데 실패했습니다.')
      navigate('/military-units')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      alert('군부대명을 입력해주세요.')
      setActiveTab('basic')
      return
    }

    const data: CreateMilitaryUnitInput = {
      name: name.trim(),
      unitType: unitType || null,
      countryId: countryId || null,
      parentUnitId: parentUnitId || null,
      isActive,
      establishedDate: establishedDate || null,
      disbandedDate: disbandedDate || null,
      description: description.trim() || null,
    }

    try {
      setLoading(true)
      if (isEdit && id) {
        await militaryUnitApi.update(id, data)
        alert('군부대가 수정되었습니다.')
      } else {
        await militaryUnitApi.create(data)
        alert('군부대가 생성되었습니다.')
      }
      navigate('/military-units')
    } catch {
      alert('군부대 저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 지휘관 폼 초기화
  const resetCommanderForm = () => {
    setSelectedPersonId('')
    setSelectedPersonName('')
    setCommanderRank('')
    setCommanderRole('')
    setCommanderOrder(commanders.length + 1) // 다음 차수 자동 설정
    setCommanderStartDate('')
    setCommanderEndDate('')
    setCommanderIsCurrent(false)
    setEditingCommanderIndex(null)
  }

  // 새 지휘관 추가 버튼
  const handleNewCommander = () => {
    playClickSound()
    resetCommanderForm()
    setCommanderFormVisible(true)
  }

  // 지휘관 수정
  const handleEditCommander = (index: number) => {
    playClickSound()
    const commander = commanders[index]
    setSelectedPersonId(commander.personId)
    setSelectedPersonName(commander.personName)
    setCommanderRank(commander.rank)
    setCommanderRole(commander.role)
    setCommanderOrder(commander.order)
    setCommanderStartDate(commander.startDate)
    setCommanderEndDate(commander.endDate || '')
    setCommanderIsCurrent(commander.isCurrent)
    setEditingCommanderIndex(index)
    setCommanderFormVisible(true)
  }

  // 지휘관 삭제
  const handleDeleteCommander = (index: number) => {
    playClickSound()
    if (confirm('이 지휘관 정보를 삭제하시겠습니까?')) {
      setCommanders((prev) => prev.filter((_, i) => i !== index))
      if (editingCommanderIndex === index) {
        resetCommanderForm()
        setCommanderFormVisible(false)
      }
    }
  }

  // 지휘관 저장
  const handleSaveCommander = () => {
    if (!selectedPersonId) {
      alert('지휘관을 선택해주세요.')
      return
    }
    if (!commanderRank.trim()) {
      alert('계급을 선택해주세요.')
      return
    }
    if (!commanderRole.trim()) {
      alert('역할을 선택해주세요.')
      return
    }
    if (!commanderOrder || commanderOrder < 1) {
      alert('차수를 입력해주세요.')
      return
    }

    const newCommander: Commander = {
      personId: selectedPersonId,
      personName: selectedPersonName,
      rank: commanderRank,
      role: commanderRole,
      order: commanderOrder,
      startDate: commanderStartDate,
      endDate: commanderIsCurrent ? '' : commanderEndDate,
      isCurrent: commanderIsCurrent,
    }

    if (editingCommanderIndex !== null) {
      setCommanders((prev) =>
        prev.map((c, i) => (i === editingCommanderIndex ? newCommander : c)),
      )
    } else {
      setCommanders((prev) => [...prev, newCommander])
    }

    resetCommanderForm()
    setCommanderFormVisible(false)
  }

  // 지휘관 폼 취소
  const handleCancelCommander = () => {
    playClickSound()
    resetCommanderForm()
    setCommanderFormVisible(false)
  }

  const availableParentUnits = allUnits.filter((unit) => unit.id !== id)

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return (
          <TabContent>
            <FormGroup>
              <Label>
                군부대명 <Required>*</Required>
              </Label>
              <Input
                type="text"
                placeholder="예: 제1보병사단"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </FormGroup>

            {/* 소속 국가 - 강조 디자인 */}
            <FormGroup>
              <Label>
                소속 국가 <Required>*</Required>
              </Label>
              {countryId ? (
                <CountryCard>
                  <CountryCardContent>
                    <CountryFlag>{countryFlagEmoji}</CountryFlag>
                    <CountryInfo>
                      <CountryNameKo>{countryName}</CountryNameKo>
                      {countryEnglishName && (
                        <CountryNameEn>{countryEnglishName}</CountryNameEn>
                      )}
                    </CountryInfo>
                  </CountryCardContent>
                  <CountryCardActions>
                    <IconButton
                      type="button"
                      onClick={() => {
                        playClickSound()
                        setCountryModalOpen(true)
                      }}
                      title="변경"
                    >
                      <FiEdit2 size={16} />
                    </IconButton>
                    <IconButton
                      type="button"
                      onClick={() => {
                        playClickSound()
                        setCountryId('')
                        setCountryName('')
                        setCountryFlagEmoji('')
                        setCountryEnglishName('')
                      }}
                      title="제거"
                      $danger
                    >
                      <FiTrash2 size={16} />
                    </IconButton>
                  </CountryCardActions>
                </CountryCard>
              ) : (
                <SelectButton
                  type="button"
                  onClick={() => {
                    playClickSound()
                    setCountryModalOpen(true)
                  }}
                >
                  <Placeholder>국가를 선택하세요</Placeholder>
                </SelectButton>
              )}
              <Hint>부대의 정체성을 나타내는 중요한 정보입니다</Hint>
            </FormGroup>

            <FormRow>
              <FormGroup>
                <Label>부대 유형</Label>
                <SelectButton
                  type="button"
                  onClick={() => {
                    playClickSound()
                    setUnitTypeModalOpen(true)
                  }}
                >
                  {unitTypeName || <Placeholder>부대 유형 선택</Placeholder>}
                </SelectButton>
                {unitType && (
                  <ClearButton
                    type="button"
                    onClick={() => {
                      playClickSound()
                      setUnitType('')
                      setUnitTypeName('')
                    }}
                  >
                    <FiX size={14} />
                  </ClearButton>
                )}
              </FormGroup>

              <FormGroup>
                <Label>군종</Label>
                <SelectButton
                  type="button"
                  onClick={() => {
                    playClickSound()
                    setBranchModalOpen(true)
                  }}
                >
                  {branchName || <Placeholder>군종 선택</Placeholder>}
                </SelectButton>
                {branch && (
                  <ClearButton
                    type="button"
                    onClick={() => {
                      playClickSound()
                      setBranch('')
                      setBranchName('')
                    }}
                  >
                    <FiX size={14} />
                  </ClearButton>
                )}
                <Hint>육군, 해군, 공군, 해병대 등</Hint>
              </FormGroup>
            </FormRow>

            <FormGroup>
              <Label>상위 부대</Label>
              <SelectButton
                type="button"
                onClick={() => {
                  playClickSound()
                  setParentUnitModalOpen(true)
                }}
              >
                {parentUnitName || <Placeholder>상위 부대 선택</Placeholder>}
              </SelectButton>
              {parentUnitId && (
                <ClearButton
                  type="button"
                  onClick={() => {
                    playClickSound()
                    setParentUnitId('')
                    setParentUnitName('')
                  }}
                >
                  <FiX size={14} />
                </ClearButton>
              )}
              <Hint>예: 제1군단 소속 제1사단의 경우, 제1군단을 선택</Hint>
            </FormGroup>

            <FormGroup>
              <ToggleContainer>
                <ToggleLabel>현재 활동 중인 부대</ToggleLabel>
                <ToggleButton
                  type="button"
                  $active={isActive}
                  onClick={() => {
                    playClickSound()
                    setIsActive(!isActive)
                  }}
                >
                  <ToggleSlider $active={isActive} />
                </ToggleButton>
              </ToggleContainer>
            </FormGroup>
          </TabContent>
        )

      case 'history':
        return (
          <TabContent>
            <FormRow>
              <FormGroup>
                <Label>창설일</Label>
                <SelectButton
                  type="button"
                  onClick={() => {
                    playClickSound()
                    setEstablishedDateModalOpen(true)
                  }}
                >
                  {establishedDate || <Placeholder>날짜 선택</Placeholder>}
                </SelectButton>
                {establishedDate && (
                  <ClearButton
                    type="button"
                    onClick={() => {
                      playClickSound()
                      setEstablishedDate('')
                    }}
                  >
                    <FiX size={14} />
                  </ClearButton>
                )}
              </FormGroup>

              <FormGroup>
                <Label>해산일</Label>
                <SelectButton
                  type="button"
                  onClick={() => {
                    playClickSound()
                    if (!isActive) {
                      setDisbandedDateModalOpen(true)
                    }
                  }}
                  disabled={isActive}
                >
                  {disbandedDate || <Placeholder>날짜 선택</Placeholder>}
                </SelectButton>
                {disbandedDate && !isActive && (
                  <ClearButton
                    type="button"
                    onClick={() => {
                      playClickSound()
                      setDisbandedDate('')
                    }}
                  >
                    <FiX size={14} />
                  </ClearButton>
                )}
                {isActive && (
                  <Hint>활동 중인 부대는 해산일을 입력할 수 없습니다</Hint>
                )}
              </FormGroup>
            </FormRow>

            {/* 역대 지휘관 - 좌우 분할 레이아웃 */}
            <FormGroup>
              <Label>역대 지휘관</Label>

              <CommanderSplitLayout>
                {/* 좌측: 지휘관 목록 */}
                <CommanderListPanel>
                  <CommanderListHeader>
                    <CommanderListTitle>
                      지휘관 목록 <CountBadge>{commanders.length}</CountBadge>
                    </CommanderListTitle>
                    <AddButton type="button" onClick={handleNewCommander}>
                      <FiPlus size={14} />
                      추가
                    </AddButton>
                  </CommanderListHeader>

                  {commanders.length === 0 ? (
                    <EmptyState>
                      <FiShield size={28} opacity={0.3} />
                      <p>등록된 지휘관이 없습니다</p>
                    </EmptyState>
                  ) : (
                    <CommandersList>
                      {commanders
                        .sort((a, b) => {
                          // 현재 지휘관 우선, 그 다음 차수 역순
                          if (a.isCurrent && !b.isCurrent) return -1
                          if (!a.isCurrent && b.isCurrent) return 1
                          return b.order - a.order
                        })
                        .map((commander, index) => {
                          const roleCategory =
                            COMMANDER_ROLES.find(
                              (r) => r.value === commander.role,
                            )?.category || '기타'
                          return (
                            <CommanderCard
                              key={index}
                              $current={commander.isCurrent}
                              $selected={
                                editingCommanderIndex ===
                                commanders.indexOf(commander)
                              }
                              onClick={() =>
                                handleEditCommander(
                                  commanders.indexOf(commander),
                                )
                              }
                            >
                              <CommanderOrderBadge
                                $current={commander.isCurrent}
                              >
                                제{commander.order}대
                              </CommanderOrderBadge>
                              <CommanderInfo>
                                <CommanderNameRow>
                                  <CommanderName>
                                    {commander.personName}
                                    {commander.isCurrent && (
                                      <CurrentBadge>현재</CurrentBadge>
                                    )}
                                  </CommanderName>
                                  <RoleCategoryBadge $category={roleCategory}>
                                    {roleCategory}
                                  </RoleCategoryBadge>
                                </CommanderNameRow>
                                <CommanderDetails>
                                  <RankText>{commander.rank}</RankText>
                                  {commander.role && (
                                    <>
                                      <Separator>•</Separator>
                                      <RoleText>{commander.role}</RoleText>
                                    </>
                                  )}
                                </CommanderDetails>
                                {commander.startDate && (
                                  <CommanderPeriod>
                                    📅 {commander.startDate}
                                    {commander.endDate
                                      ? ` ~ ${commander.endDate}`
                                      : ' ~ 현재'}
                                  </CommanderPeriod>
                                )}
                              </CommanderInfo>
                              <CommanderActions
                                onClick={(e) => e.stopPropagation()}
                              >
                                <IconButton
                                  type="button"
                                  onClick={() =>
                                    handleDeleteCommander(
                                      commanders.indexOf(commander),
                                    )
                                  }
                                  title="삭제"
                                  $danger
                                >
                                  <FiTrash2 size={14} />
                                </IconButton>
                              </CommanderActions>
                            </CommanderCard>
                          )
                        })}
                    </CommandersList>
                  )}
                </CommanderListPanel>

                {/* 우측: 지휘관 추가/수정 폼 */}
                <CommanderFormPanel $visible={commanderFormVisible}>
                  {commanderFormVisible ? (
                    <>
                      <CommanderFormHeader>
                        {editingCommanderIndex !== null
                          ? '지휘관 수정'
                          : '지휘관 추가'}
                      </CommanderFormHeader>

                      <CommanderFormContent>
                        {/* 인물 선택 */}
                        <FormField>
                          <FieldLabel>
                            지휘관 선택 <Required>*</Required>
                          </FieldLabel>

                          {selectedPersonId ? (
                            <SelectedPersonCard>
                              <PersonAvatar>👤</PersonAvatar>
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{ fontWeight: 600, fontSize: '14px' }}
                                >
                                  {selectedPersonName}
                                </div>
                                <div
                                  style={{
                                    fontSize: '11px',
                                    color: '#64748b',
                                    marginTop: '2px',
                                  }}
                                >
                                  선택됨
                                </div>
                              </div>
                              <IconButton
                                type="button"
                                onClick={() => {
                                  playClickSound()
                                  setSelectedPersonId('')
                                  setSelectedPersonName('')
                                }}
                                $danger
                              >
                                <FiX size={14} />
                              </IconButton>
                            </SelectedPersonCard>
                          ) : (
                            <SelectButton
                              type="button"
                              onClick={() => {
                                playClickSound()
                                setPersonSelectModalOpen(true)
                              }}
                            >
                              <Placeholder>👤 인물 선택</Placeholder>
                            </SelectButton>
                          )}
                        </FormField>

                        {/* 직책 정보 */}
                        <FormField>
                          <FieldLabel>
                            직책 정보 <Required>*</Required>
                          </FieldLabel>

                          <FormRow style={{ marginBottom: '12px' }}>
                            <FormGroup style={{ marginBottom: 0 }}>
                              <Label>
                                계급 <Required>*</Required>
                              </Label>
                              <SelectButton
                                type="button"
                                onClick={() => {
                                  playClickSound()
                                  setRankModalOpen(true)
                                }}
                              >
                                {commanderRank || (
                                  <Placeholder>계급 선택</Placeholder>
                                )}
                              </SelectButton>
                            </FormGroup>

                            <FormGroup style={{ marginBottom: 0 }}>
                              <Label>
                                역할 <Required>*</Required>
                              </Label>
                              <SelectButton
                                type="button"
                                onClick={() => {
                                  playClickSound()
                                  setRoleModalOpen(true)
                                }}
                              >
                                {commanderRole || (
                                  <Placeholder>역할 선택</Placeholder>
                                )}
                              </SelectButton>
                            </FormGroup>
                          </FormRow>

                          {/* 차수 입력 */}
                          <FormGroup
                            style={{ marginTop: '16px', marginBottom: '0' }}
                          >
                            <Label>
                              차수 <Required>*</Required>
                            </Label>
                            <OrderInputWrapper>
                              <OrderLabel>제</OrderLabel>
                              <OrderInput
                                type="number"
                                min="1"
                                value={commanderOrder}
                                onChange={(e) =>
                                  setCommanderOrder(
                                    parseInt(e.target.value) || 1,
                                  )
                                }
                              />
                              <OrderLabel>대</OrderLabel>
                            </OrderInputWrapper>
                            <Hint>지휘관 순서 (제1대, 제2대...)</Hint>
                          </FormGroup>
                        </FormField>

                        {/* 재임 기간 */}
                        <FormField>
                          <FieldLabel>재임 기간</FieldLabel>

                          <FormRow style={{ marginBottom: '12px' }}>
                            <FormGroup style={{ marginBottom: 0 }}>
                              <Label>시작일</Label>
                              <SelectButton
                                type="button"
                                onClick={() => {
                                  playClickSound()
                                  setCommanderStartDateModalOpen(true)
                                }}
                              >
                                {commanderStartDate || (
                                  <Placeholder>📅 날짜 선택</Placeholder>
                                )}
                              </SelectButton>
                              {commanderStartDate && (
                                <ClearButton
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    playClickSound()
                                    setCommanderStartDate('')
                                  }}
                                >
                                  <FiX size={14} />
                                </ClearButton>
                              )}
                            </FormGroup>

                            <FormGroup style={{ marginBottom: 0 }}>
                              <Label>종료일</Label>
                              <SelectButton
                                type="button"
                                onClick={() => {
                                  playClickSound()
                                  if (!commanderIsCurrent) {
                                    setCommanderEndDateModalOpen(true)
                                  }
                                }}
                                disabled={commanderIsCurrent}
                              >
                                {commanderEndDate || (
                                  <Placeholder>📅 날짜 선택</Placeholder>
                                )}
                              </SelectButton>
                              {commanderEndDate && !commanderIsCurrent && (
                                <ClearButton
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    playClickSound()
                                    setCommanderEndDate('')
                                  }}
                                >
                                  <FiX size={14} />
                                </ClearButton>
                              )}
                            </FormGroup>
                          </FormRow>

                          <FormGroup style={{ marginTop: '12px' }}>
                            <ToggleContainer>
                              <ToggleLabel>현재 재임 중</ToggleLabel>
                              <ToggleButton
                                type="button"
                                $active={commanderIsCurrent}
                                onClick={() => {
                                  playClickSound()
                                  setCommanderIsCurrent(!commanderIsCurrent)
                                }}
                              >
                                <ToggleSlider $active={commanderIsCurrent} />
                              </ToggleButton>
                            </ToggleContainer>
                            {commanderIsCurrent && (
                              <Hint>
                                현재 지휘관은 종료일을 입력할 수 없습니다
                              </Hint>
                            )}
                          </FormGroup>
                        </FormField>

                        {/* 액션 버튼 */}
                        <CommanderFormActions>
                          <CancelButton
                            type="button"
                            onClick={handleCancelCommander}
                          >
                            취소
                          </CancelButton>
                          <SubmitButton
                            type="button"
                            onClick={handleSaveCommander}
                          >
                            <FiCheck size={16} />
                            저장
                          </SubmitButton>
                        </CommanderFormActions>
                      </CommanderFormContent>
                    </>
                  ) : (
                    <EmptyFormState>
                      <FiPlus size={48} opacity={0.2} />
                      <p>지휘관을 추가하거나 선택하세요</p>
                    </EmptyFormState>
                  )}
                </CommanderFormPanel>
              </CommanderSplitLayout>
              <Hint>
                부대의 역대 지휘관을 기록합니다. 좌측 목록을 클릭하여 수정할 수
                있습니다.
              </Hint>
            </FormGroup>
          </TabContent>
        )

      case 'military':
        return (
          <TabContent>
            <FormRow>
              <FormGroup>
                <Label>별명/통칭</Label>
                <Input
                  type="text"
                  placeholder="예: 맹호부대, 불사조 사단"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />
                <Hint>부대의 별명이나 통칭</Hint>
              </FormGroup>

              <FormGroup>
                <Label>부대 표어</Label>
                <Input
                  type="text"
                  placeholder="예: 필승, 충성, 용맹"
                  value={motto}
                  onChange={(e) => setMotto(e.target.value)}
                />
                <Hint>부대의 모토나 슬로건</Hint>
              </FormGroup>
            </FormRow>

            <FormRow>
              <FormGroup>
                <Label>주둔지</Label>
                <Input
                  type="text"
                  placeholder="예: 경기도 평택시"
                  value={garrison}
                  onChange={(e) => setGarrison(e.target.value)}
                />
                <Hint>부대가 주둔하는 지역</Hint>
              </FormGroup>

              <FormGroup>
                <Label>병력 규모</Label>
                <Input
                  type="text"
                  placeholder="예: 약 10,000명"
                  value={strength}
                  onChange={(e) => setStrength(e.target.value)}
                />
                <Hint>부대의 총 병력 수</Hint>
              </FormGroup>
            </FormRow>

            <FormGroup>
              <Label>부대 마크/휘장</Label>
              <InsigniaUploadArea>
                {insigniaUrl ? (
                  <InsigniaPreview>
                    <img src={insigniaUrl} alt="부대 휘장" />
                    <RemoveInsigniaButton
                      type="button"
                      onClick={() => {
                        playClickSound()
                        setInsigniaUrl('')
                      }}
                    >
                      <FiX size={16} />
                    </RemoveInsigniaButton>
                  </InsigniaPreview>
                ) : (
                  <UploadPlaceholder>
                    <FiImage size={32} />
                    <p>부대 마크/휘장 이미지를 업로드하세요</p>
                    <UploadButton
                      type="button"
                      onClick={() => {
                        playClickSound()
                        document.getElementById('insignia-upload')?.click()
                      }}
                    >
                      이미지 업로드
                    </UploadButton>
                    <input
                      id="insignia-upload"
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          // TODO: 실제 업로드 API 연동
                          const url = URL.createObjectURL(file)
                          setInsigniaUrl(url)
                        }
                      }}
                    />
                  </UploadPlaceholder>
                )}
              </InsigniaUploadArea>
              <Hint>부대의 공식 마크나 휘장 이미지</Hint>
            </FormGroup>

            <FormGroup>
              <Label>주요 전투 참여</Label>
              <Textarea
                rows={4}
                placeholder="예: 6.25전쟁 인천상륙작전, 베트남전 등"
                value={notableBattles}
                onChange={(e) => setNotableBattles(e.target.value)}
              />
              <Hint>부대가 참여한 주요 전투나 작전 (각 줄마다 하나씩)</Hint>
            </FormGroup>

            <FormGroup>
              <Label>훈장/표창</Label>
              <Textarea
                rows={4}
                placeholder="예: 대통령부대표창(2020), 국방부장관표창(2018)"
                value={honors}
                onChange={(e) => setHonors(e.target.value)}
              />
              <Hint>부대가 받은 훈장이나 표창 (각 줄마다 하나씩)</Hint>
            </FormGroup>
          </TabContent>
        )

      case 'description':
        return (
          <TabContent>
            <FormGroup>
              <Label>부대 설명</Label>
              <Textarea
                rows={12}
                placeholder="부대에 대한 전반적인 설명을 입력하세요"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormGroup>
          </TabContent>
        )

      default:
        return null
    }
  }

  return (
    <PageWrapper>
      <PageHeader>
        <HeaderTop>
          <BackButton
            onClick={() => {
              playClickSound()
              navigate('/military-units')
            }}
          >
            <FiArrowLeft size={18} />
            목록으로
          </BackButton>
        </HeaderTop>
        <HeaderTitle>
          <TitleIcon>
            <FiShield size={28} />
          </TitleIcon>
          <TitleContent>
            <h1>{isEdit ? '군부대 수정' : '군부대 추가'}</h1>
            <p>군부대의 상세 정보를 입력하세요</p>
          </TitleContent>
        </HeaderTitle>
      </PageHeader>

      <FormWrapper onSubmit={handleSubmit}>
        <FormContentWrapper>
          {/* 좌측 탭 네비게이션 */}
          <LeftSidebar>
            <SidebarTab
              type="button"
              $active={activeTab === 'basic'}
              onClick={() => {
                playClickSound()
                setActiveTab('basic')
              }}
            >
              <FiInfo size={20} />
              <SidebarTabContent>
                <SidebarTabTitle>기본 정보</SidebarTabTitle>
                <SidebarTabDesc>부대명, 소속국가</SidebarTabDesc>
              </SidebarTabContent>
              {!name && <RequiredDot />}
            </SidebarTab>

            <SidebarTab
              type="button"
              $active={activeTab === 'history'}
              onClick={() => {
                playClickSound()
                setActiveTab('history')
              }}
            >
              <FiCalendar size={20} />
              <SidebarTabContent>
                <SidebarTabTitle>연혁</SidebarTabTitle>
                <SidebarTabDesc>창설일, 지휘관</SidebarTabDesc>
              </SidebarTabContent>
            </SidebarTab>

            <SidebarTab
              type="button"
              $active={activeTab === 'military'}
              onClick={() => {
                playClickSound()
                setActiveTab('military')
              }}
            >
              <FiAward size={20} />
              <SidebarTabContent>
                <SidebarTabTitle>군정보</SidebarTabTitle>
                <SidebarTabDesc>병력, 주요전투</SidebarTabDesc>
              </SidebarTabContent>
            </SidebarTab>

            <SidebarTab
              type="button"
              $active={activeTab === 'description'}
              onClick={() => {
                playClickSound()
                setActiveTab('description')
              }}
            >
              <FiFileText size={20} />
              <SidebarTabContent>
                <SidebarTabTitle>상세 설명</SidebarTabTitle>
                <SidebarTabDesc>부대 개요</SidebarTabDesc>
              </SidebarTabContent>
            </SidebarTab>
          </LeftSidebar>

          {/* 우측 폼 컨텐츠 */}
          <FormSection>{renderTabContent()}</FormSection>
        </FormContentWrapper>

        <FormActions>
          <CancelButton
            type="button"
            onClick={() => {
              playClickSound()
              navigate('/military-units')
            }}
          >
            취소
          </CancelButton>
          <SubmitButton type="submit" disabled={loading}>
            <FiSave size={18} />
            {loading ? '저장 중...' : isEdit ? '수정하기' : '추가하기'}
          </SubmitButton>
        </FormActions>
      </FormWrapper>

      {/* 국가 선택 모달 */}
      <CountrySelectModal
        isOpen={countryModalOpen}
        onClose={() => setCountryModalOpen(false)}
        onSelect={(country) => {
          const modernCountry = modernCountries.find((c) => c.id === country.id)
          const historicalCountry = historicalCountries.find(
            (c) => c.id === country.id,
          )
          const flagEmoji =
            modernCountry?.flagEmoji || historicalCountry?.flagEmoji || '🏳️'

          setCountryId(country.id)
          setCountryName(country.name)
          setCountryFlagEmoji(flagEmoji)
          setCountryEnglishName('')
          setCountryModalOpen(false)
        }}
        modernCountries={modernCountries}
        historicalCountries={historicalCountries}
      />

      {/* 부대 유형 선택 모달 */}
      {unitTypeModalOpen && (
        <SimpleSelectModal
          title="부대 유형 선택"
          options={UNIT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          selectedValue={unitType}
          onSelect={(value, label) => {
            setUnitType(value as MilitaryUnitType)
            setUnitTypeName(label)
            setUnitTypeModalOpen(false)
          }}
          onClose={() => setUnitTypeModalOpen(false)}
        />
      )}

      {/* 군종 선택 모달 */}
      {branchModalOpen && (
        <SimpleSelectModal
          title="군종 선택"
          options={MILITARY_BRANCHES}
          selectedValue={branch}
          onSelect={(value, label) => {
            setBranch(value)
            setBranchName(label)
            setBranchModalOpen(false)
          }}
          onClose={() => setBranchModalOpen(false)}
        />
      )}

      {/* 상위 부대 선택 모달 */}
      {parentUnitModalOpen && (
        <UnitSelectModal
          title="상위 부대 선택"
          units={availableParentUnits}
          selectedId={parentUnitId}
          onSelect={(unit) => {
            setParentUnitId(unit.id)
            setParentUnitName(unit.name)
            setParentUnitModalOpen(false)
          }}
          onClose={() => setParentUnitModalOpen(false)}
        />
      )}

      {/* 계급 선택 모달 */}
      {rankModalOpen && (
        <GroupedSelectModal
          title="계급 선택"
          options={MILITARY_RANKS}
          selectedValue={commanderRank}
          onSelect={(value) => {
            setCommanderRank(value)
            setRankModalOpen(false)
          }}
          onClose={() => setRankModalOpen(false)}
        />
      )}

      {/* 역할 선택 모달 */}
      {roleModalOpen && (
        <GroupedSelectModal
          title="역할 선택"
          options={COMMANDER_ROLES}
          selectedValue={commanderRole}
          onSelect={(value) => {
            setCommanderRole(value)
            setRoleModalOpen(false)
          }}
          onClose={() => setRoleModalOpen(false)}
        />
      )}

      {/* 지휘관 재임 시작일 선택 모달 */}
      <DatePickerModal
        isOpen={commanderStartDateModalOpen}
        onClose={() => setCommanderStartDateModalOpen(false)}
        onSelect={(date) => {
          setCommanderStartDate(date)
          setCommanderStartDateModalOpen(false)
        }}
        initialDate={commanderStartDate}
        title="재임 시작일 선택"
      />

      {/* 지휘관 재임 종료일 선택 모달 */}
      <DatePickerModal
        isOpen={commanderEndDateModalOpen}
        onClose={() => setCommanderEndDateModalOpen(false)}
        onSelect={(date) => {
          setCommanderEndDate(date)
          setCommanderEndDateModalOpen(false)
        }}
        initialDate={commanderEndDate}
        title="재임 종료일 선택"
      />

      {/* 창설일 선택 모달 */}
      <DatePickerModal
        isOpen={establishedDateModalOpen}
        onClose={() => setEstablishedDateModalOpen(false)}
        onSelect={(date) => {
          setEstablishedDate(date)
          setEstablishedDateModalOpen(false)
        }}
        initialDate={establishedDate}
        title="창설일 선택"
      />

      {/* 해산일 선택 모달 */}
      <DatePickerModal
        isOpen={disbandedDateModalOpen}
        onClose={() => setDisbandedDateModalOpen(false)}
        onSelect={(date) => {
          setDisbandedDate(date)
          setDisbandedDateModalOpen(false)
        }}
        initialDate={disbandedDate}
        title="해산일 선택"
      />

      {/* 인물 선택 모달 */}
      {personSelectModalOpen && (
        <PersonSelectModal
          persons={allPersons}
          selectedPersonId={selectedPersonId}
          onSelect={(personId, personName) => {
            setSelectedPersonId(personId)
            setSelectedPersonName(personName)
          }}
          onClose={() => setPersonSelectModalOpen(false)}
        />
      )}
    </PageWrapper>
  )
}

// 그룹화된 선택 모달 (계급용)
interface GroupedSelectModalProps {
  title: string
  options: Array<{ value: string; label: string; category: string }>
  selectedValue?: string
  onSelect: (value: string) => void
  onClose: () => void
}

const GroupedSelectModal: React.FC<GroupedSelectModalProps> = ({
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}) => {
  const playClickSound = useClickSound()
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  // 카테고리별로 그룹화
  const groupedOptions = options.reduce(
    (acc, option) => {
      if (!acc[option.category]) {
        acc[option.category] = []
      }
      acc[option.category].push(option)
      return acc
    },
    {} as Record<string, typeof options>,
  )

  const categories = Object.keys(groupedOptions)

  // 첫 번째 카테고리를 기본 선택
  React.useEffect(() => {
    if (!selectedCategory && categories.length > 0) {
      setSelectedCategory(categories[0])
    }
  }, [categories])

  // 카테고리별 아이콘과 색상
  const getCategoryStyle = (category: string) => {
    switch (category) {
      case '지휘관':
        return {
          icon: '⚔️',
          color: '#dc2626',
          bgColor: 'rgba(239, 68, 68, 0.1)',
        }
      case '참모':
        return {
          icon: '📋',
          color: '#16a34a',
          bgColor: 'rgba(34, 197, 94, 0.1)',
        }
      case '해군/공군':
        return {
          icon: '✈️',
          color: '#2563eb',
          bgColor: 'rgba(59, 130, 246, 0.1)',
        }
      case '장성급':
        return {
          icon: '⭐',
          color: '#f59e0b',
          bgColor: 'rgba(245, 158, 11, 0.1)',
        }
      case '영관급':
        return {
          icon: '🎖️',
          color: '#8b5cf6',
          bgColor: 'rgba(139, 92, 246, 0.1)',
        }
      case '위관급':
        return {
          icon: '🎗️',
          color: '#06b6d4',
          bgColor: 'rgba(6, 182, 212, 0.1)',
        }
      default:
        return {
          icon: '📌',
          color: '#64748b',
          bgColor: 'rgba(148, 163, 184, 0.1)',
        }
    }
  }

  const currentItems = selectedCategory ? groupedOptions[selectedCategory] : []

  return (
    <ModalOverlay onClick={onClose}>
      <LargeModalBox onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          <ModalCloseButton onClick={onClose}>
            <FiX size={20} />
          </ModalCloseButton>
        </ModalHeader>
        <SplitModalBody>
          {/* 좌측: 카테고리 목록 */}
          <CategorySidebar>
            {categories.map((category) => {
              const style = getCategoryStyle(category)
              const isSelected = selectedCategory === category
              return (
                <CategoryTab
                  key={category}
                  $selected={isSelected}
                  $color={style.color}
                  onClick={() => {
                    playClickSound()
                    setSelectedCategory(category)
                  }}
                >
                  <CategoryTabIcon>{style.icon}</CategoryTabIcon>
                  <CategoryTabContent>
                    <CategoryTabTitle>{category}</CategoryTabTitle>
                    <CategoryTabCount>
                      {groupedOptions[category].length}개
                    </CategoryTabCount>
                  </CategoryTabContent>
                </CategoryTab>
              )
            })}
          </CategorySidebar>

          {/* 우측: 선택된 카테고리의 항목들 */}
          <CategoryItemsArea>
            {currentItems.map((option) => (
              <ModalOption
                key={option.value}
                $selected={selectedValue === option.value}
                onClick={() => {
                  playClickSound()
                  onSelect(option.value)
                }}
              >
                <span>{option.label}</span>
                {selectedValue === option.value && <FiCheck size={16} />}
              </ModalOption>
            ))}
          </CategoryItemsArea>
        </SplitModalBody>
      </LargeModalBox>
    </ModalOverlay>
  )
}

// 간단한 선택 모달
interface SimpleSelectModalProps {
  title: string
  options: Array<{ value: string; label: string }>
  selectedValue?: string
  onSelect: (value: string, label: string) => void
  onClose: () => void
}

const SimpleSelectModal: React.FC<SimpleSelectModalProps> = ({
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}) => {
  const playClickSound = useClickSound()

  return (
    <ModalOverlay onClick={onClose}>
      <ModalBox onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          <ModalCloseButton onClick={onClose}>
            <FiX size={20} />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          {options.map((option) => (
            <ModalOption
              key={option.value}
              $selected={selectedValue === option.value}
              onClick={() => {
                playClickSound()
                onSelect(option.value, option.label)
              }}
            >
              <span>{option.label}</span>
              {selectedValue === option.value && <FiShield size={16} />}
            </ModalOption>
          ))}
        </ModalBody>
      </ModalBox>
    </ModalOverlay>
  )
}

// 군부대 선택 모달
interface UnitSelectModalProps {
  title: string
  units: MilitaryUnit[]
  selectedId?: string
  onSelect: (unit: MilitaryUnit) => void
  onClose: () => void
}

const UnitSelectModal: React.FC<UnitSelectModalProps> = ({
  title,
  units,
  selectedId,
  onSelect,
  onClose,
}) => {
  const playClickSound = useClickSound()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredUnits = units.filter((unit) =>
    unit.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <ModalOverlay onClick={onClose}>
      <ModalBox onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          <ModalCloseButton onClick={onClose}>
            <FiX size={20} />
          </ModalCloseButton>
        </ModalHeader>
        <SearchSection>
          <SearchInput
            type="text"
            placeholder="부대명 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </SearchSection>
        <ModalBody>
          {filteredUnits.length === 0 ? (
            <EmptyText>검색 결과가 없습니다</EmptyText>
          ) : (
            filteredUnits.map((unit) => (
              <ModalOption
                key={unit.id}
                $selected={selectedId === unit.id}
                onClick={() => {
                  playClickSound()
                  onSelect(unit)
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{unit.name}</div>
                  {unit.country && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#64748b',
                        marginTop: '2px',
                      }}
                    >
                      {unit.country.flagEmoji} {unit.country.name}
                    </div>
                  )}
                </div>
                {selectedId === unit.id && <FiShield size={16} />}
              </ModalOption>
            ))
          )}
        </ModalBody>
      </ModalBox>
    </ModalOverlay>
  )
}

// Styled Components (계속...)
const PageWrapper = styled.div`
  min-height: 100vh;
  background: #f8fafc;
  padding: calc(var(--header-height, 64px) + 24px) 24px 24px;
`

const PageHeader = styled.div`
  max-width: 1200px;
  margin: 0 auto 24px;
`

const HeaderTop = styled.div`
  margin-bottom: 16px;
`

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  color: #6366f1;
  background: #ffffff;
  border: 2px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.08);
    border-color: #6366f1;
    transform: translateX(-2px);
  }

  &:active {
    transform: translateX(-2px) scale(0.98);
  }

  svg {
    transition: transform 0.2s ease;
  }

  &:hover svg {
    transform: translateX(-2px);
  }
`

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 28px;
  background: linear-gradient(135deg, #ffffff, #faf5ff);
  border: 2px solid rgba(99, 102, 241, 0.15);
  border-radius: 20px;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.1);
`

const TitleIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 16px;
  color: #ffffff;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
`

const TitleContent = styled.div`
  flex: 1;

  h1 {
    margin: 0 0 6px 0;
    font-size: 26px;
    font-weight: 800;
    background: linear-gradient(135deg, #0f172a, #6366f1);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  p {
    margin: 0;
    font-size: 13px;
    color: #64748b;
    font-weight: 500;
  }
`

const FormWrapper = styled.form`
  max-width: 1200px;
  margin: 0 auto;
`

const FormContentWrapper = styled.div`
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 16px;

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`

const LeftSidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #ffffff;
  border: 1.5px solid rgba(226, 232, 240, 1);
  border-radius: 16px;
  padding: 16px;
  height: fit-content;

  @media (max-width: 968px) {
    position: static;
    flex-direction: row;
    overflow-x: auto;

    &::-webkit-scrollbar {
      height: 4px;
    }
  }
`

const SidebarTab = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: ${({ $active }) =>
    $active
      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.05))'
      : 'transparent'};
  border: 2px solid ${({ $active }) => ($active ? '#6366f1' : 'transparent')};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  position: relative;

  &:hover {
    background: ${({ $active }) =>
      $active
        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.08))'
        : 'rgba(99, 102, 241, 0.05)'};
    border-color: ${({ $active }) =>
      $active ? '#6366f1' : 'rgba(99, 102, 241, 0.3)'};
  }

  ${({ $active }) =>
    $active &&
    `
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
  `}

  svg {
    flex-shrink: 0;
    color: ${({ $active }) => ($active ? '#6366f1' : '#64748b')};
    margin-top: 2px;
  }

  @media (max-width: 968px) {
    min-width: 180px;
  }
`

const SidebarTabContent = styled.div`
  flex: 1;
  min-width: 0;
`

const SidebarTabTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 2px;
`

const SidebarTabDesc = styled.div`
  font-size: 11px;
  color: #64748b;
  line-height: 1.4;
`

const RequiredDot = styled.span`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  background: #ef4444;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
`

const FormSection = styled.div`
  background: #ffffff;
  border: 1.5px solid rgba(226, 232, 240, 1);
  border-radius: 16px;
  padding: 32px;

  @media (max-width: 768px) {
    padding: 24px;
  }
`

const TabContent = styled.div`
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`

const FormGroup = styled.div`
  margin-bottom: 24px;
  position: relative;

  &:last-child {
    margin-bottom: 0;
  }
`

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0;
  }
`

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
`

const Required = styled.span`
  color: #6366f1;
  margin-left: 4px;
`

// 소속 국가 강조 카드
const CountryCard = styled.div`
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.05),
    rgba(139, 92, 246, 0.05)
  );
  border: 2px solid rgba(99, 102, 241, 0.3);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);

  &:hover {
    border-color: rgba(99, 102, 241, 0.5);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.15);
    transform: translateY(-2px);
  }
`

const CountryCardContent = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  flex: 1;
`

const CountryFlag = styled.div`
  font-size: 56px;
  line-height: 1;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`

const CountryInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const CountryNameKo = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
`

const CountryNameEn = styled.div`
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
`

const CountryCardActions = styled.div`
  display: flex;
  gap: 8px;
`

const IconButton = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: ${({ $danger }) =>
    $danger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)'};
  color: ${({ $danger }) => ($danger ? '#ef4444' : '#6366f1')};
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ $danger }) =>
      $danger ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)'};
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.98);
  }
`

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  font-size: 14px;
  color: #0f172a;
  background: #ffffff;
  border: 1.5px solid rgba(226, 232, 240, 1);
  border-radius: 10px;
  outline: none;
  transition: all 0.2s ease;

  &::placeholder {
    color: #94a3b8;
  }

  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  &:disabled {
    background: #f1f5f9;
    color: #94a3b8;
    cursor: not-allowed;
  }
`

const SelectButton = styled.button<{ disabled?: boolean }>`
  width: 100%;
  padding: 12px 16px;
  font-size: 14px;
  color: #0f172a;
  background: #ffffff;
  border: 1.5px solid rgba(226, 232, 240, 1);
  border-radius: 10px;
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;

  &:hover:not(:disabled) {
    border-color: #6366f1;
  }

  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  &:disabled {
    background: #f1f5f9;
    color: #94a3b8;
    cursor: not-allowed;
  }
`

const Placeholder = styled.span`
  color: #94a3b8;
`

const ClearButton = styled.button`
  position: absolute;
  right: 10px;
  bottom: 10px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(99, 102, 241, 0.1);
  border: none;
  border-radius: 6px;
  color: #6366f1;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;

  &:hover {
    background: rgba(99, 102, 241, 0.2);
  }
`

const Textarea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  font-size: 14px;
  color: #0f172a;
  background: #ffffff;
  border: 1.5px solid rgba(226, 232, 240, 1);
  border-radius: 10px;
  outline: none;
  resize: vertical;
  font-family: inherit;
  line-height: 1.6;
  transition: all 0.2s ease;

  &::placeholder {
    color: #94a3b8;
  }

  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #0f172a;
`

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #6366f1;
`

// 토글 버튼 스타일
const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.05),
    rgba(139, 92, 246, 0.03)
  );
  border: 2px solid rgba(99, 102, 241, 0.15);
  border-radius: 12px;
  transition: all 0.2s ease;

  &:hover {
    background: linear-gradient(
      135deg,
      rgba(99, 102, 241, 0.08),
      rgba(139, 92, 246, 0.05)
    );
    border-color: rgba(99, 102, 241, 0.25);
  }
`

const ToggleLabel = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
`

const ToggleButton = styled.button<{ $active: boolean }>`
  position: relative;
  width: 48px;
  height: 26px;
  background: ${({ $active }) =>
    $active
      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
      : 'rgba(203, 213, 225, 0.6)'};
  border-radius: 13px;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
  box-shadow: ${({ $active }) =>
    $active
      ? '0 4px 12px rgba(99, 102, 241, 0.4)'
      : '0 2px 6px rgba(0, 0, 0, 0.1)'};

  &:hover {
    background: ${({ $active }) =>
      $active
        ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
        : 'rgba(203, 213, 225, 0.8)'};
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.98);
  }
`

const ToggleSlider = styled.div<{ $active: boolean }>`
  position: absolute;
  top: 3px;
  left: ${({ $active }) => ($active ? '25px' : '3px')};
  width: 20px;
  height: 20px;
  background: #ffffff;
  border-radius: 50%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
`

const Hint = styled.div`
  margin-top: 6px;
  font-size: 12px;
  color: #64748b;
`

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.15);
    border-color: #6366f1;
  }
`

// 지휘관 좌우 분할 레이아웃
const CommanderSplitLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 20px;
  min-height: 500px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`

const CommanderListPanel = styled.div`
  border: 1.5px solid rgba(226, 232, 240, 1);
  border-radius: 12px;
  background: #ffffff;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`

const CommanderListHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #ffffff;
  border-bottom: 1px solid rgba(226, 232, 240, 1);
`

const CommanderListTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
`

const CountBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
`

const CommanderFormPanel = styled.div<{ $visible: boolean }>`
  border: 1.5px solid
    ${({ $visible }) =>
      $visible ? 'rgba(99, 102, 241, 0.3)' : 'rgba(226, 232, 240, 1)'};
  border-radius: 12px;
  background: ${({ $visible }) => ($visible ? '#ffffff' : '#f8fafc')};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  min-height: 500px;
`

const CommanderFormHeader = styled.div`
  padding: 20px 24px;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.05),
    rgba(139, 92, 246, 0.03)
  );
  border-bottom: 1px solid rgba(226, 232, 240, 1);
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
`

const CommanderFormContent = styled.div`
  flex: 1;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(226, 232, 240, 0.3);
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.5);
    border-radius: 3px;
  }
`

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const FieldLabel = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #334155;
  display: flex;
  align-items: center;
  gap: 4px;
`

const CommanderFormActions = styled.div`
  display: flex;
  gap: 12px;
  padding-top: 20px;
  margin-top: auto;
  border-top: 1px solid rgba(226, 232, 240, 1);
`

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #ffffff;
  border-bottom: 1px solid rgba(226, 232, 240, 1);
`

const PanelTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  color: #94a3b8;
  text-align: center;
  flex: 1;

  p {
    margin: 12px 0 0;
    font-size: 13px;
  }
`

const EmptyFormState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: #cbd5e1;

  p {
    margin: 16px 0 0;
    font-size: 14px;
  }
`

const CommandersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  overflow-y: auto;
  max-height: 400px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(226, 232, 240, 0.3);
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.4);
    border-radius: 3px;

    &:hover {
      background: rgba(148, 163, 184, 0.6);
    }
  }
`

const CommanderCard = styled.div<{ $current: boolean; $selected: boolean }>`
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: ${({ $current, $selected }) =>
    $selected
      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(139, 92, 246, 0.08))'
      : $current
        ? 'rgba(99, 102, 241, 0.05)'
        : '#ffffff'};
  border: 1.5px solid
    ${({ $current, $selected }) =>
      $selected
        ? '#6366f1'
        : $current
          ? 'rgba(99, 102, 241, 0.3)'
          : 'rgba(226, 232, 240, 1)'};
  border-radius: 10px;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    border-color: ${({ $selected }) =>
      $selected ? '#6366f1' : 'rgba(99, 102, 241, 0.5)'};
    background: ${({ $current, $selected }) =>
      $selected
        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1))'
        : 'rgba(99, 102, 241, 0.05)'};
    transform: translateX(2px);
  }
`

const CommanderOrderBadge = styled.div<{ $current: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  height: 48px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ $current }) => ($current ? '#ffffff' : '#6366f1')};
  background: ${({ $current }) =>
    $current
      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
      : 'rgba(99, 102, 241, 0.1)'};
  border-radius: 10px;
  border: 2px solid
    ${({ $current }) => ($current ? 'transparent' : 'rgba(99, 102, 241, 0.2)')};
  flex-shrink: 0;
  box-shadow: ${({ $current }) =>
    $current ? '0 2px 8px rgba(99, 102, 241, 0.3)' : 'none'};
`

const CommanderInfo = styled.div`
  flex: 1;
`

const CommanderNameRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
  gap: 8px;
`

const CommanderName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 6px;
`

const RoleCategoryBadge = styled.span<{ $category: string }>`
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 600;
  border-radius: 6px;
  white-space: nowrap;

  ${({ $category }) => {
    switch ($category) {
      case '지휘관':
        return `
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1));
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.3);
        `
      case '참모':
        return `
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(22, 163, 74, 0.1));
          color: #16a34a;
          border: 1px solid rgba(34, 197, 94, 0.3);
        `
      case '해군/공군':
        return `
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.1));
          color: #2563eb;
          border: 1px solid rgba(59, 130, 246, 0.3);
        `
      default:
        return `
          background: linear-gradient(135deg, rgba(148, 163, 184, 0.15), rgba(100, 116, 139, 0.1));
          color: #64748b;
          border: 1px solid rgba(148, 163, 184, 0.3);
        `
    }
  }}
`

const CurrentBadge = styled.span`
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 700;
  color: #ffffff;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 4px;
`

const CommanderDetails = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  margin-top: 2px;
`

const RankText = styled.span`
  color: #0f172a;
  font-weight: 600;
`

const Separator = styled.span`
  color: #cbd5e1;
`

const RoleText = styled.span`
  color: #6366f1;
  font-weight: 500;
`

const CommanderPeriod = styled.div`
  font-size: 11px;
  color: #6366f1;
  margin-top: 4px;
  font-weight: 500;
`

const CommanderActions = styled.div`
  display: flex;
  gap: 4px;
  margin-left: auto;
`

const SelectedPersonCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.08),
    rgba(139, 92, 246, 0.05)
  );
  border: 2px solid rgba(99, 102, 241, 0.3);
  border-radius: 12px;
  font-weight: 600;
  color: #0f172a;
`

const PersonAvatar = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 50%;
  flex-shrink: 0;
`

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  color: #0f172a;
  border: 1.5px solid rgba(226, 232, 240, 1);
  border-radius: 10px;
  outline: none;
  transition: all 0.2s ease;

  &::placeholder {
    color: #94a3b8;
  }

  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`

const InsigniaUploadArea = styled.div`
  border: 2px dashed rgba(226, 232, 240, 1);
  border-radius: 12px;
  padding: 20px;
  background: #f8fafc;
  transition: all 0.2s ease;

  &:hover {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.02);
  }
`

const InsigniaPreview = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    max-width: 200px;
    max-height: 200px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`

const RemoveInsigniaButton = styled.button`
  position: absolute;
  top: -8px;
  right: -8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ef4444;
  color: #ffffff;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
  transition: all 0.2s ease;

  &:hover {
    background: #dc2626;
    transform: scale(1.1);
  }
`

const UploadPlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #94a3b8;

  svg {
    opacity: 0.5;
  }

  p {
    margin: 0;
    font-size: 14px;
  }
`

const UploadButton = styled.button`
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.15);
    border-color: #6366f1;
  }
`

const FormActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 20px;
`

const CancelButton = styled.button`
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 600;
  color: #64748b;
  background: #ffffff;
  border: 1.5px solid rgba(226, 232, 240, 1);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f8fafc;
    border-color: #94a3b8;
  }
`

const SubmitButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #4f46e5, #4338ca);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.3);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

// Modal Styles
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`

const ModalBox = styled.div`
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 400px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;

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

const LargeModalBox = styled(ModalBox)`
  max-width: 700px;
  max-height: 80vh;
`

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
`

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
`

const ModalCloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(148, 163, 184, 0.08);
  color: #94a3b8;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    color: #6366f1;
  }
`

const SearchSection = styled.div`
  padding: 16px 24px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
`

const ModalBody = styled.div`
  padding: 12px;
  overflow-y: auto;
  flex: 1;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(226, 232, 240, 0.3);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.4);
    border-radius: 4px;

    &:hover {
      background: rgba(148, 163, 184, 0.6);
    }
  }
`

// 좌우 분할 모달 바디
const SplitModalBody = styled.div`
  display: grid;
  grid-template-columns: 200px 1fr;
  height: 500px;
  overflow: hidden;
`

// 좌측 카테고리 사이드바
const CategorySidebar = styled.div`
  background: #f8fafc;
  border-right: 1px solid rgba(226, 232, 240, 1);
  overflow-y: auto;
  padding: 12px 8px;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.3);
    border-radius: 2px;
  }
`

// 카테고리 탭
const CategoryTab = styled.button<{ $selected: boolean; $color: string }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  margin-bottom: 6px;
  background: ${({ $selected }) => ($selected ? '#ffffff' : 'transparent')};
  border: 2px solid
    ${({ $selected, $color }) => ($selected ? $color : 'transparent')};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;

  &:hover {
    background: #ffffff;
    border-color: ${({ $color }) => $color}66;
  }

  ${({ $selected, $color }) =>
    $selected &&
    `
    box-shadow: 0 2px 8px ${$color}33;
  `}
`

const CategoryTabIcon = styled.span`
  font-size: 20px;
  line-height: 1;
`

const CategoryTabContent = styled.div`
  flex: 1;
  min-width: 0;
`

const CategoryTabTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const CategoryTabCount = styled.div`
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
`

// 우측 항목 영역
const CategoryItemsArea = styled.div`
  padding: 16px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(226, 232, 240, 0.3);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.4);
    border-radius: 4px;

    &:hover {
      background: rgba(148, 163, 184, 0.6);
    }
  }
`

const CategoryLabel = styled.div`
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  background: #f8fafc;
  border-radius: 6px;
  margin-bottom: 6px;
  margin-top: 8px;

  &:first-child {
    margin-top: 0;
  }
`

const ModalOption = styled.button<{ $selected: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: ${({ $selected }) => ($selected ? '600' : '500')};
  color: ${({ $selected }) => ($selected ? '#6366f1' : '#0f172a')};
  background: ${({ $selected }) =>
    $selected ? 'rgba(99, 102, 241, 0.08)' : 'transparent'};
  border: 1.5px solid
    ${({ $selected }) =>
      $selected ? 'rgba(99, 102, 241, 0.3)' : 'rgba(226, 232, 240, 0.6)'};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;

  &:hover {
    background: ${({ $selected }) =>
      $selected ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.04)'};
    border-color: ${({ $selected }) =>
      $selected ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.2)'};
    transform: translateX(4px);
  }

  &:active {
    transform: translateX(2px);
  }

  svg {
    color: #6366f1;
    flex-shrink: 0;
  }
`

const EmptyText = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #64748b;
  font-size: 14px;
`

// 차수 입력 스타일
const OrderInputWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(99, 102, 241, 0.05);
  border: 2px solid rgba(99, 102, 241, 0.2);
  border-radius: 10px;
`

const OrderLabel = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: #6366f1;
`

const OrderInput = styled.input`
  width: 60px;
  padding: 8px 12px;
  font-size: 18px;
  font-weight: 700;
  color: #6366f1;
  text-align: center;
  background: #ffffff;
  border: 2px solid rgba(99, 102, 241, 0.3);
  border-radius: 8px;
  outline: none;
  transition: all 0.2s ease;

  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  /* 숫자 스피너 제거 (Chrome, Safari, Edge) */
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  /* 숫자 스피너 제거 (Firefox) */
  &[type='number'] {
    -moz-appearance: textfield;
  }
`
