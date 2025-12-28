import React, { useEffect, useState } from 'react'

import { motion, AnimatePresence } from 'framer-motion'
import {
  FiAlertCircle,
  FiArrowLeft,
  FiBriefcase,
  FiCheck,
  FiFileText,
  FiGlobe,
  FiInfo,
  FiSave,
  FiX,
  FiShield,
  FiBookOpen,
  FiEdit3,
  FiUsers,
  FiPlus,
  FiTrash2,
  FiCalendar,
  FiClock,
} from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

import type { CountryResponseDto } from '@/shared/api/countries'
import { getAllCountries } from '@/shared/api/countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import type { PersonResponseDto } from '@/shared/api/persons'
import { getAllPersons } from '@/shared/api/persons'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { CountrySelectModal } from '@/shared/ui/country-select-modal/CountrySelectModal'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/PersonSelectModal'
import { DatePickerModal } from '@/shared/ui/date-picker/DatePickerModal'

import {
  HistoryLayout,
  HistoryHeader,
  HistoryCount,
  CountText,
  HistoryFormCard,
  HistoryFormHeader,
  HistoryFormBody,
  HistoryFormActions,
  HistoryTimeline,
  TimelineItem,
  TimelineDot,
  TimelineContent,
  TimelineHeader,
  TimelineDate,
  TimelineType,
  TimelineTitle,
  TimelineDescription,
  TimelineActions,
  HistoryTypeOption,
  HistoryTypeIcon,
} from './history-styles'

type CategoryType = 'basic' | 'leaders' | 'history' | 'detail'

interface Minister {
  personId: string
  personName: string
  order: number
  position: string // 장관, 차관, 장 등
  startDate: string
  endDate: string
  isCurrent: boolean
}

interface HistoryEvent {
  id: string
  date: string
  title: string
  description: string
  type: 'establishment' | 'reorganization' | 'achievement' | 'policy' | 'other'
}

export const AdministrationDepartmentFormPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const playClickSound = useClickSound()
  const isEditMode = id && id !== 'new'

  const [activeCategory, setActiveCategory] = useState<CategoryType>('basic')

  const [formData, setFormData] = useState({
    name: '',
    countryId: '',
    countryName: '',
    countryFlag: '',
    parentId: '',
    parentName: '',
    description: '',
    hasMilitaryUnits: false,
  })

  // 역대 장관 관리
  const [ministers, setMinisters] = useState<Minister[]>([])
  const [ministerFormVisible, setMinisterFormVisible] = useState(false)
  const [editingMinisterIndex, setEditingMinisterIndex] = useState<number | null>(null)
  
  const [ministerPersonId, setMinisterPersonId] = useState('')
  const [ministerPersonName, setMinisterPersonName] = useState('')
  const [ministerOrder, setMinisterOrder] = useState(1)
  const [ministerPosition, setMinisterPosition] = useState('')
  const [ministerStartDate, setMinisterStartDate] = useState('')
  const [ministerEndDate, setMinisterEndDate] = useState('')
  const [ministerIsCurrent, setMinisterIsCurrent] = useState(false)

  // 연혁 관리
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([])
  const [historyFormVisible, setHistoryFormVisible] = useState(false)
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null)
  
  const [historyDate, setHistoryDate] = useState('')
  const [historyTitle, setHistoryTitle] = useState('')
  const [historyDescription, setHistoryDescription] = useState('')
  const [historyType, setHistoryType] = useState<HistoryEvent['type']>('other')

  const [modernCountries, setModernCountries] = useState<CountryResponseDto[]>([])
  const [historicalCountries, setHistoricalCountries] = useState<
    HistoricalCountryResponseDto[]
  >([])
  const [persons, setPersons] = useState<PersonResponseDto[]>([])
  
  const [countryModalOpen, setCountryModalOpen] = useState(false)
  const [parentDeptModalOpen, setParentDeptModalOpen] = useState(false)
  const [personSelectModalOpen, setPersonSelectModalOpen] = useState(false)
  const [positionModalOpen, setPositionModalOpen] = useState(false)
  const [ministerStartDateModalOpen, setMinisterStartDateModalOpen] = useState(false)
  const [ministerEndDateModalOpen, setMinisterEndDateModalOpen] = useState(false)
  const [historyDateModalOpen, setHistoryDateModalOpen] = useState(false)
  const [historyTypeModalOpen, setHistoryTypeModalOpen] = useState(false)

  // TODO: 부처 목록 로드
  const [departments] = useState<Array<{ id: string; name: string }>>([
    { id: '1', name: '국무총리실' },
    { id: '2', name: '기획재정부' },
    { id: '3', name: '교육부' },
    { id: '4', name: '과학기술정보통신부' },
    { id: '5', name: '외교부' },
    { id: '6', name: '통일부' },
    { id: '7', name: '법무부' },
    { id: '8', name: '국방부' },
  ])

  // 직위 목록
  const positions = [
    { id: 'minister', name: '장관', category: '장관급' },
    { id: 'vice-minister', name: '차관', category: '차관급' },
    { id: 'secretary', name: '장', category: '실국장급' },
    { id: 'director', name: '국장', category: '실국장급' },
    { id: 'deputy-director', name: '과장', category: '과장급' },
  ]

  // 연혁 유형
  const historyTypes = [
    { id: 'establishment', name: '설립/개청', icon: '🏛️', color: '#10b981' },
    { id: 'reorganization', name: '조직개편', icon: '🔄', color: '#3b82f6' },
    { id: 'achievement', name: '주요 성과', icon: '🏆', color: '#f59e0b' },
    { id: 'policy', name: '정책 시행', icon: '📋', color: '#8b5cf6' },
    { id: 'other', name: '기타', icon: '📌', color: '#64748b' },
  ]

  // 카테고리 설정
  const categories = [
    {
      id: 'basic' as CategoryType,
      icon: <FiInfo size={18} />,
      label: '기본 정보',
      description: '부처의 기본 정보',
    },
    {
      id: 'leaders' as CategoryType,
      icon: <FiUsers size={18} />,
      label: '역대 장관',
      description: '역대 장관 정보',
    },
    {
      id: 'history' as CategoryType,
      icon: <FiClock size={18} />,
      label: '연혁',
      description: '부처 역사 기록',
    },
    {
      id: 'detail' as CategoryType,
      icon: <FiFileText size={18} />,
      label: '상세 정보',
      description: '추가 정보 입력',
    },
  ]

  // 국가 목록 로드
  useEffect(() => {
    loadCountries()
    loadPersons()
  }, [])

  const loadCountries = async () => {
    try {
      const [modern, historical] = await Promise.all([
        getAllCountries(),
        getAllHistoricalCountries(),
      ])
      setModernCountries(modern)
      setHistoricalCountries(historical)
    } catch (error) {
      console.error('국가 목록 로드 실패:', error)
    }
  }

  const loadPersons = async () => {
    try {
      const data = await getAllPersons()
      setPersons(data)
    } catch (error) {
      console.error('인물 목록 로드 실패:', error)
    }
  }

  // 장관 추가/수정 함수
  const handleNewMinister = () => {
    playClickSound()
    setEditingMinisterIndex(null)
    resetMinisterForm()
    
    // 자동 차수 제안
    const maxOrder = ministers.length > 0 
      ? Math.max(...ministers.map(m => m.order))
      : 0
    setMinisterOrder(maxOrder + 1)
    
    setMinisterFormVisible(true)
  }

  const handleEditMinister = (index: number) => {
    playClickSound()
    const minister = ministers[index]
    setEditingMinisterIndex(index)
    setMinisterPersonId(minister.personId)
    setMinisterPersonName(minister.personName)
    setMinisterOrder(minister.order)
    setMinisterPosition(minister.position)
    setMinisterStartDate(minister.startDate)
    setMinisterEndDate(minister.endDate)
    setMinisterIsCurrent(minister.isCurrent)
    setMinisterFormVisible(true)
  }

  const handleDeleteMinister = (index: number) => {
    playClickSound()
    if (confirm('이 장관을 삭제하시겠습니까?')) {
      setMinisters(ministers.filter((_, idx) => idx !== index))
    }
  }

  const handleSaveMinister = () => {
    playClickSound()

    if (!ministerPersonId) {
      alert('인물을 선택해주세요.')
      return
    }
    if (!ministerPosition) {
      alert('직위를 선택해주세요.')
      return
    }
    if (!ministerStartDate) {
      alert('취임일을 입력해주세요.')
      return
    }
    if (!ministerIsCurrent && !ministerEndDate) {
      alert('퇴임일을 입력하거나 현재 재임 중을 체크해주세요.')
      return
    }

    const newMinister: Minister = {
      personId: ministerPersonId,
      personName: ministerPersonName,
      order: ministerOrder,
      position: ministerPosition,
      startDate: ministerStartDate,
      endDate: ministerIsCurrent ? '' : ministerEndDate,
      isCurrent: ministerIsCurrent,
    }

    if (editingMinisterIndex !== null) {
      // 수정
      setMinisters(
        ministers.map((m, idx) =>
          idx === editingMinisterIndex ? newMinister : m
        )
      )
    } else {
      // 추가
      setMinisters([...ministers, newMinister])
    }

    resetMinisterForm()
    setMinisterFormVisible(false)
  }

  const resetMinisterForm = () => {
    setMinisterPersonId('')
    setMinisterPersonName('')
    setMinisterOrder(1)
    setMinisterPosition('')
    setMinisterStartDate('')
    setMinisterEndDate('')
    setMinisterIsCurrent(false)
  }

  // 연혁 추가/수정 함수
  const handleNewHistory = () => {
    playClickSound()
    setEditingHistoryId(null)
    resetHistoryForm()
    setHistoryFormVisible(true)
  }

  const handleEditHistory = (id: string) => {
    playClickSound()
    const history = historyEvents.find(h => h.id === id)
    if (!history) return

    setEditingHistoryId(id)
    setHistoryDate(history.date)
    setHistoryTitle(history.title)
    setHistoryDescription(history.description)
    setHistoryType(history.type)
    setHistoryFormVisible(true)
  }

  const handleDeleteHistory = (id: string) => {
    playClickSound()
    if (confirm('이 연혁을 삭제하시겠습니까?')) {
      setHistoryEvents(historyEvents.filter(h => h.id !== id))
    }
  }

  const handleSaveHistory = () => {
    playClickSound()

    if (!historyDate) {
      alert('날짜를 선택해주세요.')
      return
    }
    if (!historyTitle.trim()) {
      alert('제목을 입력해주세요.')
      return
    }

    const newHistory: HistoryEvent = {
      id: editingHistoryId || `history-${Date.now()}`,
      date: historyDate,
      title: historyTitle,
      description: historyDescription,
      type: historyType,
    }

    if (editingHistoryId) {
      // 수정
      setHistoryEvents(
        historyEvents.map(h =>
          h.id === editingHistoryId ? newHistory : h
        )
      )
    } else {
      // 추가
      setHistoryEvents([...historyEvents, newHistory])
    }

    resetHistoryForm()
    setHistoryFormVisible(false)
  }

  const resetHistoryForm = () => {
    setHistoryDate('')
    setHistoryTitle('')
    setHistoryDescription('')
    setHistoryType('other')
  }

  const getHistoryTypeInfo = (type: HistoryEvent['type']) => {
    return historyTypes.find(t => t.id === type) || historyTypes[historyTypes.length - 1]
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    playClickSound()

    if (!formData.name.trim()) {
      alert('부처명을 입력해주세요.')
      return
    }

    if (!formData.countryId) {
      alert('국가를 선택해주세요.')
      return
    }

    console.log('Submit:', formData)
    // TODO: API 연동

    navigate('/administration-departments')
  }

  const handleCancel = () => {
    playClickSound()
    navigate('/administration-departments')
  }

  return (
    <PageWrapper>
      {/* 헤더 */}
      <PageHeader
        as={motion.div}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <HeaderLeft>
          <BackButton onClick={handleCancel}>
            <FiArrowLeft size={20} />
            <span>목록으로</span>
          </BackButton>
        </HeaderLeft>

        <HeaderCenter>
          <HeaderIconWrapper>
            <FiBriefcase size={28} />
          </HeaderIconWrapper>
          <HeaderTitleSection>
            <HeaderTitle>{isEditMode ? '행정부처 수정' : '새 행정부처 등록'}</HeaderTitle>
            <HeaderSubtitle>
              {isEditMode
                ? '행정부처 정보를 수정합니다'
                : '새로운 행정부처를 등록합니다'}
            </HeaderSubtitle>
          </HeaderTitleSection>
        </HeaderCenter>

        <HeaderRight />
      </PageHeader>

      {/* 메인 컨텐츠 */}
      <ContentLayout>
        {/* 좌측: 카테고리 사이드바 */}
        <CategorySidebar>
          <CategoryHeader>
            <FiBookOpen size={16} />
            <span>입력 항목</span>
          </CategoryHeader>
          
          {categories.map((category) => (
            <CategoryItem
              key={category.id}
              $active={activeCategory === category.id}
              onClick={() => {
                playClickSound()
                setActiveCategory(category.id)
              }}
            >
              <CategoryIcon $active={activeCategory === category.id}>
                {category.icon}
              </CategoryIcon>
              <CategoryContent>
                <CategoryLabel>{category.label}</CategoryLabel>
                <CategoryDescription>{category.description}</CategoryDescription>
              </CategoryContent>
              {activeCategory === category.id && <ActiveIndicator />}
            </CategoryItem>
          ))}
        </CategorySidebar>

        {/* 우측: 폼 영역 */}
        <FormArea>
          <Form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {activeCategory === 'basic' && (
                <FormContent
                  key="basic"
                  as={motion.div}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <SectionTitle>
                    <FiInfo size={20} />
                    <div>
                      <h2>기본 정보</h2>
                      <p>행정부처의 기본 정보를 입력합니다</p>
                    </div>
                  </SectionTitle>

                  <FormGrid>
                    <FormGroup>
                      <Label>
                        부처명 <Required>*</Required>
                      </Label>
                      <InputWrapper>
                        <InputIcon>
                          <FiEdit3 size={16} />
                        </InputIcon>
                        <Input
                          type="text"
                          placeholder="예: 외교부, 국방부"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                        />
                      </InputWrapper>
                      <Hint>정식 부처명을 입력해주세요</Hint>
                    </FormGroup>

                    <FormGroup>
                      <Label>
                        소속 국가 <Required>*</Required>
                      </Label>
                      {formData.countryId ? (
                        <SelectedCountryCard>
                          <CountryFlag>{formData.countryFlag || '🌏'}</CountryFlag>
                          <CountryInfo>
                            <CountryName>{formData.countryName}</CountryName>
                            <CountryLabel>소속 국가</CountryLabel>
                          </CountryInfo>
                          <ClearIconButton
                            type="button"
                            onClick={() => {
                              playClickSound()
                              setFormData({
                                ...formData,
                                countryId: '',
                                countryName: '',
                                countryFlag: '',
                              })
                            }}
                          >
                            <FiX size={16} />
                          </ClearIconButton>
                        </SelectedCountryCard>
                      ) : (
                        <SelectButton
                          type="button"
                          onClick={() => {
                            playClickSound()
                            setCountryModalOpen(true)
                          }}
                        >
                          <FiGlobe size={18} />
                          <span>국가를 선택하세요</span>
                        </SelectButton>
                      )}
                    </FormGroup>

                    <FormGroup>
                      <Label>상위 부처</Label>
                      {formData.parentId ? (
                        <SelectedParentCard>
                          <ParentIcon>
                            <FiBriefcase size={18} />
                          </ParentIcon>
                          <ParentInfo>
                            <ParentName>{formData.parentName}</ParentName>
                            <ParentLabel>상위 부처</ParentLabel>
                          </ParentInfo>
                          <ClearIconButton
                            type="button"
                            onClick={() => {
                              playClickSound()
                              setFormData({
                                ...formData,
                                parentId: '',
                                parentName: '',
                              })
                            }}
                          >
                            <FiX size={16} />
                          </ClearIconButton>
                        </SelectedParentCard>
                      ) : (
                        <SelectButton
                          type="button"
                          onClick={() => {
                            playClickSound()
                            setParentDeptModalOpen(true)
                          }}
                        >
                          <FiBriefcase size={18} />
                          <span>없음 (최상위 부처)</span>
                        </SelectButton>
                      )}
                      <Hint>이 부처의 상위 부처를 선택하세요 (선택사항)</Hint>
                    </FormGroup>

                    <FormGroup>
                      <CheckboxCard>
                        <CheckboxIcon $checked={formData.hasMilitaryUnits}>
                          {formData.hasMilitaryUnits ? (
                            <FiCheck size={20} />
                          ) : (
                            <FiShield size={20} />
                          )}
                        </CheckboxIcon>
                        <CheckboxContent>
                          <CheckboxLabel>
                            <input
                              type="checkbox"
                              checked={formData.hasMilitaryUnits}
                              onChange={(e) => {
                                playClickSound()
                                setFormData({
                                  ...formData,
                                  hasMilitaryUnits: e.target.checked,
                                })
                              }}
                            />
                            <span>군부대 관할 부처</span>
                          </CheckboxLabel>
                          <CheckboxHint>
                            이 부처가 군부대를 관할하는 경우 체크하세요
                          </CheckboxHint>
                        </CheckboxContent>
                      </CheckboxCard>
                    </FormGroup>
                  </FormGrid>
                </FormContent>
              )}

              {activeCategory === 'leaders' && (
                <FormContent
                  key="leaders"
                  as={motion.div}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <SectionTitle>
                    <FiUsers size={20} />
                    <div>
                      <h2>역대 장관</h2>
                      <p>부처를 이끈 역대 장관들의 정보를 관리합니다</p>
                    </div>
                  </SectionTitle>

                  <MinisterSplitLayout>
                    {/* 좌측: 장관 목록 */}
                    <MinisterListPanel>
                      <MinisterListHeader>
                        <MinisterListTitle>
                          장관 목록 <CountBadge>{ministers.length}</CountBadge>
                        </MinisterListTitle>
                        <AddButton type="button" onClick={handleNewMinister}>
                          <FiPlus size={14} />
                          추가
                        </AddButton>
                      </MinisterListHeader>

                      {ministers.length === 0 ? (
                        <EmptyState>
                          <FiUsers size={28} style={{ opacity: 0.3 }} />
                          <p>등록된 장관이 없습니다</p>
                        </EmptyState>
                      ) : (
                        <MinistersList>
                          {ministers
                            .sort((minA, minB) => {
                              if (minA.isCurrent && !minB.isCurrent) return -1
                              if (!minA.isCurrent && minB.isCurrent) return 1
                              return minB.order - minA.order
                            })
                            .map((minister, index) => (
                              <MinisterCard
                                key={index}
                                $current={minister.isCurrent}
                                $selected={editingMinisterIndex === ministers.indexOf(minister)}
                                onClick={() => handleEditMinister(ministers.indexOf(minister))}
                              >
                                <MinisterOrderBadge $current={minister.isCurrent}>
                                  제{minister.order}대
                                </MinisterOrderBadge>
                                <MinisterInfo>
                                  <MinisterNameRow>
                                    <MinisterName>
                                      {minister.personName}
                                      {minister.isCurrent && (
                                        <CurrentBadge>현직</CurrentBadge>
                                      )}
                                    </MinisterName>
                                    <PositionBadge>{minister.position}</PositionBadge>
                                  </MinisterNameRow>
                                  {minister.startDate && (
                                    <MinisterPeriod>
                                      📅 {minister.startDate}
                                      {minister.endDate
                                        ? ` ~ ${minister.endDate}`
                                        : ' ~ 현재'}
                                    </MinisterPeriod>
                                  )}
                                </MinisterInfo>
                                <MinisterActions
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <IconButton
                                    type="button"
                                    onClick={() =>
                                      handleDeleteMinister(ministers.indexOf(minister))
                                    }
                                    title="삭제"
                                    $danger
                                  >
                                    <FiTrash2 size={14} />
                                  </IconButton>
                                </MinisterActions>
                              </MinisterCard>
                            ))}
                        </MinistersList>
                      )}
                    </MinisterListPanel>

                    {/* 우측: 장관 추가/수정 폼 */}
                    <MinisterFormPanel $visible={ministerFormVisible}>
                      {ministerFormVisible ? (
                        <>
                          <MinisterFormHeader>
                            {editingMinisterIndex !== null
                              ? '장관 정보 수정'
                              : '장관 추가'}
                          </MinisterFormHeader>

                          <MinisterFormContent>
                            {/* 인물 선택 */}
                            <FormField>
                              <FieldLabel>
                                인물 선택 <Required>*</Required>
                              </FieldLabel>

                              {ministerPersonId ? (
                                <SelectedPersonCard>
                                  <PersonAvatar>👤</PersonAvatar>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '14px' }}>
                                      {ministerPersonName}
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
                                      setMinisterPersonId('')
                                      setMinisterPersonName('')
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
                                  <FiUsers size={18} />
                                  <span>인물 선택</span>
                                </SelectButton>
                              )}
                            </FormField>

                            {/* 직위 및 차수 */}
                            <FormField>
                              <FieldLabel>
                                직위 정보 <Required>*</Required>
                              </FieldLabel>

                              <FormRow style={{ marginBottom: '12px' }}>
                                <FormGroup style={{ marginBottom: 0 }}>
                                  <Label>
                                    직위 <Required>*</Required>
                                  </Label>
                                  <SelectButton
                                    type="button"
                                    onClick={() => {
                                      playClickSound()
                                      setPositionModalOpen(true)
                                    }}
                                  >
                                    {ministerPosition || (
                                      <>
                                        <FiBriefcase size={16} />
                                        <Placeholder>직위 선택</Placeholder>
                                      </>
                                    )}
                                    {ministerPosition && <span>{ministerPosition}</span>}
                                  </SelectButton>
                                </FormGroup>

                                <FormGroup style={{ marginBottom: 0 }}>
                                  <Label>
                                    차수 <Required>*</Required>
                                  </Label>
                                  <OrderInputWrapper>
                                    <OrderLabel>제</OrderLabel>
                                    <OrderInput
                                      type="number"
                                      min="1"
                                      value={ministerOrder}
                                      onChange={(e) =>
                                        setMinisterOrder(Number(e.target.value))
                                      }
                                    />
                                    <OrderLabel>대</OrderLabel>
                                  </OrderInputWrapper>
                                </FormGroup>
                              </FormRow>
                            </FormField>

                            {/* 재임 기간 */}
                            <FormField>
                              <FieldLabel>재임 기간</FieldLabel>

                              <FormRow style={{ marginBottom: '12px' }}>
                                <FormGroup style={{ marginBottom: 0 }}>
                                  <Label>취임일</Label>
                                  <SelectButton
                                    type="button"
                                    onClick={() => {
                                      playClickSound()
                                      setMinisterStartDateModalOpen(true)
                                    }}
                                  >
                                    {ministerStartDate || (
                                      <>
                                        <FiCalendar size={16} />
                                        <Placeholder>날짜 선택</Placeholder>
                                      </>
                                    )}
                                    {ministerStartDate && <span>{ministerStartDate}</span>}
                                  </SelectButton>
                                  {ministerStartDate && (
                                    <ClearButton
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        playClickSound()
                                        setMinisterStartDate('')
                                      }}
                                    >
                                      <FiX size={14} />
                                    </ClearButton>
                                  )}
                                </FormGroup>

                                <FormGroup style={{ marginBottom: 0 }}>
                                  <Label>퇴임일</Label>
                                  <SelectButton
                                    type="button"
                                    onClick={() => {
                                      playClickSound()
                                      if (!ministerIsCurrent) {
                                        setMinisterEndDateModalOpen(true)
                                      }
                                    }}
                                    disabled={ministerIsCurrent}
                                  >
                                    {ministerIsCurrent ? (
                                      <Placeholder>현재 재임 중</Placeholder>
                                    ) : ministerEndDate ? (
                                      <span>{ministerEndDate}</span>
                                    ) : (
                                      <>
                                        <FiCalendar size={16} />
                                        <Placeholder>날짜 선택</Placeholder>
                                      </>
                                    )}
                                  </SelectButton>
                                  {ministerEndDate && !ministerIsCurrent && (
                                    <ClearButton
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        playClickSound()
                                        setMinisterEndDate('')
                                      }}
                                    >
                                      <FiX size={14} />
                                    </ClearButton>
                                  )}
                                </FormGroup>
                              </FormRow>

                              <FormGroup style={{ marginTop: '12px' }}>
                                <CheckboxLabel>
                                  <Checkbox
                                    type="checkbox"
                                    checked={ministerIsCurrent}
                                    onChange={(e) =>
                                      setMinisterIsCurrent(e.target.checked)
                                    }
                                  />
                                  <span>현재 재임 중</span>
                                </CheckboxLabel>
                                {ministerIsCurrent && (
                                  <Hint style={{ marginTop: '8px' }}>
                                    현재 장관은 퇴임일을 입력할 수 없습니다
                                  </Hint>
                                )}
                              </FormGroup>
                            </FormField>

                            {/* 액션 버튼 */}
                            <MinisterFormActions>
                              <CancelButton
                                type="button"
                                onClick={() => {
                                  playClickSound()
                                  setMinisterFormVisible(false)
                                  resetMinisterForm()
                                }}
                              >
                                <FiX size={16} />
                                취소
                              </CancelButton>
                              <SubmitButton
                                type="button"
                                onClick={handleSaveMinister}
                              >
                                <FiCheck size={16} />
                                저장
                              </SubmitButton>
                            </MinisterFormActions>
                          </MinisterFormContent>
                        </>
                      ) : (
                        <EmptyFormState>
                          <FiUsers size={48} style={{ opacity: 0.2 }} />
                          <p>장관을 추가하려면 '추가' 버튼을 클릭하세요</p>
                        </EmptyFormState>
                      )}
                    </MinisterFormPanel>
                  </MinisterSplitLayout>
                </FormContent>
              )}

              {activeCategory === 'history' && (
                <FormContent
                  key="history"
                  as={motion.div}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <SectionTitle>
                    <FiClock size={20} />
                    <div>
                      <h2>연혁</h2>
                      <p>부처의 주요 역사적 사건과 변천사를 기록합니다</p>
                    </div>
                  </SectionTitle>

                  <HistoryLayout>
                    {/* 상단: 연혁 추가 버튼 */}
                    <HistoryHeader>
                      <HistoryCount>
                        총 <CountText>{historyEvents.length}</CountText>개의 연혁
                      </HistoryCount>
                      <AddButton type="button" onClick={handleNewHistory}>
                        <FiPlus size={14} />
                        연혁 추가
                      </AddButton>
                    </HistoryHeader>

                    {/* 연혁 폼 (추가/수정 시 표시) */}
                    {historyFormVisible && (
                      <HistoryFormCard
                        as={motion.div}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <HistoryFormHeader>
                          <h3>
                            {editingHistoryId ? '연혁 수정' : '새 연혁 추가'}
                          </h3>
                          <IconButton
                            type="button"
                            onClick={() => {
                              playClickSound()
                              setHistoryFormVisible(false)
                              resetHistoryForm()
                            }}
                          >
                            <FiX size={16} />
                          </IconButton>
                        </HistoryFormHeader>

                        <HistoryFormBody>
                          <FormRow>
                            <FormGroup>
                              <Label>
                                날짜 <Required>*</Required>
                              </Label>
                              <SelectButton
                                type="button"
                                onClick={() => {
                                  playClickSound()
                                  setHistoryDateModalOpen(true)
                                }}
                              >
                                {historyDate || (
                                  <>
                                    <FiCalendar size={16} />
                                    <Placeholder>날짜 선택</Placeholder>
                                  </>
                                )}
                                {historyDate && <span>{historyDate}</span>}
                              </SelectButton>
                            </FormGroup>

                            <FormGroup>
                              <Label>
                                유형 <Required>*</Required>
                              </Label>
                              <SelectButton
                                type="button"
                                onClick={() => {
                                  playClickSound()
                                  setHistoryTypeModalOpen(true)
                                }}
                              >
                                {historyType ? (
                                  <>
                                    <span>{getHistoryTypeInfo(historyType).icon}</span>
                                    <span>{getHistoryTypeInfo(historyType).name}</span>
                                  </>
                                ) : (
                                  <Placeholder>유형 선택</Placeholder>
                                )}
                              </SelectButton>
                            </FormGroup>
                          </FormRow>

                          <FormGroup style={{ gridColumn: '1 / -1' }}>
                            <Label>
                              제목 <Required>*</Required>
                            </Label>
                            <Input
                              type="text"
                              placeholder="예: 외교부 개청"
                              value={historyTitle}
                              onChange={(e) => setHistoryTitle(e.target.value)}
                            />
                          </FormGroup>

                          <FormGroup style={{ gridColumn: '1 / -1' }}>
                            <Label>상세 설명</Label>
                            <Textarea
                              rows={4}
                              placeholder="연혁에 대한 상세한 설명을 입력하세요"
                              value={historyDescription}
                              onChange={(e) => setHistoryDescription(e.target.value)}
                            />
                          </FormGroup>

                          <HistoryFormActions>
                            <CancelButton
                              type="button"
                              onClick={() => {
                                playClickSound()
                                setHistoryFormVisible(false)
                                resetHistoryForm()
                              }}
                            >
                              <FiX size={16} />
                              취소
                            </CancelButton>
                            <SubmitButton
                              type="button"
                              onClick={handleSaveHistory}
                            >
                              <FiCheck size={16} />
                              저장
                            </SubmitButton>
                          </HistoryFormActions>
                        </HistoryFormBody>
                      </HistoryFormCard>
                    )}

                    {/* 연혁 타임라인 */}
                    {historyEvents.length === 0 ? (
                      <EmptyState>
                        <FiClock size={28} style={{ opacity: 0.3 }} />
                        <p>등록된 연혁이 없습니다</p>
                      </EmptyState>
                    ) : (
                      <HistoryTimeline>
                        {historyEvents
                          .sort((eventA, eventB) => eventB.date.localeCompare(eventA.date))
                          .map((event, index) => {
                            const typeInfo = getHistoryTypeInfo(event.type)
                            return (
                              <TimelineItem
                                key={event.id}
                                as={motion.div}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                              >
                                <TimelineDot $color={typeInfo.color}>
                                  <span>{typeInfo.icon}</span>
                                </TimelineDot>
                                <TimelineContent>
                                  <TimelineHeader>
                                    <TimelineDate>{event.date}</TimelineDate>
                                    <TimelineType $color={typeInfo.color}>
                                      {typeInfo.name}
                                    </TimelineType>
                                  </TimelineHeader>
                                  <TimelineTitle>{event.title}</TimelineTitle>
                                  {event.description && (
                                    <TimelineDescription>
                                      {event.description}
                                    </TimelineDescription>
                                  )}
                                  <TimelineActions>
                                    <IconButton
                                      type="button"
                                      onClick={() => handleEditHistory(event.id)}
                                      title="수정"
                                    >
                                      <FiEdit3 size={14} />
                                    </IconButton>
                                    <IconButton
                                      type="button"
                                      onClick={() => handleDeleteHistory(event.id)}
                                      title="삭제"
                                      $danger
                                    >
                                      <FiTrash2 size={14} />
                                    </IconButton>
                                  </TimelineActions>
                                </TimelineContent>
                              </TimelineItem>
                            )
                          })}
                      </HistoryTimeline>
                    )}
                  </HistoryLayout>
                </FormContent>
              )}

              {activeCategory === 'detail' && (
                <FormContent
                  key="detail"
                  as={motion.div}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <SectionTitle>
                    <FiFileText size={20} />
                    <div>
                      <h2>상세 정보</h2>
                      <p>부처에 대한 추가 정보를 입력합니다</p>
                    </div>
                  </SectionTitle>

                  <FormGrid>
                    <FormGroup style={{ gridColumn: '1 / -1' }}>
                      <Label>부처 설명</Label>
                      <Textarea
                        rows={8}
                        placeholder="부처의 역할과 주요 업무를 설명해주세요"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                      />
                      <Hint>
                        부처의 역할, 주요 업무, 소관 사항 등을 자유롭게 작성해주세요
                      </Hint>
                    </FormGroup>

                    <InfoBox style={{ gridColumn: '1 / -1' }}>
                      <InfoIconWrapper>
                        <FiAlertCircle size={20} />
                      </InfoIconWrapper>
                      <InfoContent>
                        <InfoTitle>추가 정보 입력</InfoTitle>
                        <InfoText>
                          부처 등록 후 상세 페이지에서 조직도, 연혁, 위치 등의 추가
                          정보를 입력할 수 있습니다.
                        </InfoText>
                      </InfoContent>
                    </InfoBox>
                  </FormGrid>
                </FormContent>
              )}
            </AnimatePresence>

            <FormActions>
              <ActionButton
                type="button"
                $variant="secondary"
                onClick={handleCancel}
              >
                <FiX size={18} />
                취소
              </ActionButton>
              <ActionButton type="submit" $variant="primary">
                <FiSave size={18} />
                {isEditMode ? '수정하기' : '등록하기'}
              </ActionButton>
            </FormActions>
          </Form>
        </FormArea>
      </ContentLayout>

      {/* 국가 선택 모달 */}
      {countryModalOpen && (
        <CountrySelectModal
          isOpen={countryModalOpen}
          onClose={() => setCountryModalOpen(false)}
          onSelectCountry={(country) => {
            const flag = 'flagEmoji' in country ? country.flagEmoji : '🌏'
            setFormData({
              ...formData,
              countryId: country.id,
              countryName: country.name,
              countryFlag: flag || '🌏',
            })
            setCountryModalOpen(false)
          }}
          modernCountries={modernCountries}
          historicalCountries={historicalCountries}
        />
      )}

      {/* 상위 부처 선택 모달 */}
      <AnimatePresence>
        {parentDeptModalOpen && (
          <ModalOverlay
            as={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setParentDeptModalOpen(false)}
          >
            <ModalBox
              as={motion.div}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader>
                <ModalTitle>상위 부처 선택</ModalTitle>
                <ModalCloseButton onClick={() => setParentDeptModalOpen(false)}>
                  <FiX size={20} />
                </ModalCloseButton>
              </ModalHeader>
              <ModalContent>
                {departments.map((dept) => (
                  <DeptOption
                    key={dept.id}
                    onClick={() => {
                      playClickSound()
                      setFormData({
                        ...formData,
                        parentId: dept.id,
                        parentName: dept.name,
                      })
                      setParentDeptModalOpen(false)
                    }}
                  >
                    <FiBriefcase size={16} />
                    <span>{dept.name}</span>
                  </DeptOption>
                ))}
              </ModalContent>
            </ModalBox>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* 인물 선택 모달 */}
      {personSelectModalOpen && (
        <PersonSelectModal
          persons={persons}
          selectedPersonId={ministerPersonId}
          onSelect={(personId, personName) => {
            setMinisterPersonId(personId)
            setMinisterPersonName(personName)
          }}
          onClose={() => setPersonSelectModalOpen(false)}
        />
      )}

      {/* 직위 선택 모달 */}
      <AnimatePresence>
        {positionModalOpen && (
          <ModalOverlay
            as={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPositionModalOpen(false)}
          >
            <ModalBox
              as={motion.div}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader>
                <ModalTitle>직위 선택</ModalTitle>
                <ModalCloseButton onClick={() => setPositionModalOpen(false)}>
                  <FiX size={20} />
                </ModalCloseButton>
              </ModalHeader>
              <ModalContent>
                {(() => {
                  const grouped: Record<string, typeof positions> = {}
                  positions.forEach((pos) => {
                    if (!grouped[pos.category]) {
                      grouped[pos.category] = []
                    }
                    grouped[pos.category].push(pos)
                  })

                  return Object.entries(grouped).map(([category, items]) => (
                    <div key={category}>
                      <CategoryHeader style={{ padding: '12px 0 8px' }}>
                        {category}
                      </CategoryHeader>
                      {items.map((pos) => (
                        <DeptOption
                          key={pos.id}
                          onClick={() => {
                            playClickSound()
                            setMinisterPosition(pos.name)
                            setPositionModalOpen(false)
                          }}
                        >
                          <FiBriefcase size={16} />
                          <span>{pos.name}</span>
                        </DeptOption>
                      ))}
                    </div>
                  ))
                })()}
              </ModalContent>
            </ModalBox>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* 취임일 선택 모달 */}
      {ministerStartDateModalOpen && (
        <DatePickerModal
          isOpen={ministerStartDateModalOpen}
          onClose={() => setMinisterStartDateModalOpen(false)}
          onSelect={(date) => {
            setMinisterStartDate(date)
            setMinisterStartDateModalOpen(false)
          }}
          selectedDate={ministerStartDate}
        />
      )}

      {/* 퇴임일 선택 모달 */}
      {ministerEndDateModalOpen && (
        <DatePickerModal
          isOpen={ministerEndDateModalOpen}
          onClose={() => setMinisterEndDateModalOpen(false)}
          onSelect={(date) => {
            setMinisterEndDate(date)
            setMinisterEndDateModalOpen(false)
          }}
          selectedDate={ministerEndDate}
        />
      )}

      {/* 연혁 날짜 선택 모달 */}
      {historyDateModalOpen && (
        <DatePickerModal
          isOpen={historyDateModalOpen}
          onClose={() => setHistoryDateModalOpen(false)}
          onSelect={(date) => {
            setHistoryDate(date)
            setHistoryDateModalOpen(false)
          }}
          selectedDate={historyDate}
        />
      )}

      {/* 연혁 유형 선택 모달 */}
      <AnimatePresence>
        {historyTypeModalOpen && (
          <ModalOverlay
            as={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setHistoryTypeModalOpen(false)}
          >
            <ModalBox
              as={motion.div}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader>
                <ModalTitle>연혁 유형 선택</ModalTitle>
                <ModalCloseButton onClick={() => setHistoryTypeModalOpen(false)}>
                  <FiX size={20} />
                </ModalCloseButton>
              </ModalHeader>
              <ModalContent>
                {historyTypes.map((type) => (
                  <HistoryTypeOption
                    key={type.id}
                    $color={type.color}
                    onClick={() => {
                      playClickSound()
                      setHistoryType(type.id as HistoryEvent['type'])
                      setHistoryTypeModalOpen(false)
                    }}
                  >
                    <HistoryTypeIcon $color={type.color}>
                      {type.icon}
                    </HistoryTypeIcon>
                    <span>{type.name}</span>
                  </HistoryTypeOption>
                ))}
              </ModalContent>
            </ModalBox>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </PageWrapper>
  )
}

// Styled Components
const PageWrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  padding-top: var(--header-height, 64px);
`

const PageHeader = styled.div`
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.05));
  border-bottom: 2px solid rgba(226, 232, 240, 1);
  padding: 24px 40px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 24px;
  position: sticky;
  top: var(--header-height, 64px);
  z-index: 100;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    padding: 20px 24px;
    gap: 16px;
  }
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;

  @media (max-width: 1024px) {
    order: 1;
  }
`

const HeaderCenter = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: center;

  @media (max-width: 1024px) {
    order: 2;
    justify-content: flex-start;
  }
`

const HeaderRight = styled.div`
  @media (max-width: 1024px) {
    display: none;
  }
`

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: #ffffff;
  border: 2px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  color: #6366f1;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);

  span {
    @media (max-width: 640px) {
      display: none;
    }
  }

  &:hover {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.05));
    border-color: rgba(99, 102, 241, 0.4);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.2);
  }

  &:active {
    transform: translateY(0);
  }
`

const HeaderIconWrapper = styled.div`
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 16px;
  color: #ffffff;
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
  flex-shrink: 0;

  @media (max-width: 640px) {
    width: 48px;
    height: 48px;
    
    svg {
      width: 22px;
      height: 22px;
    }
  }
`

const HeaderTitleSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const HeaderTitle = styled.h1`
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.5px;

  @media (max-width: 640px) {
    font-size: 20px;
  }
`

const HeaderSubtitle = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;

  @media (max-width: 640px) {
    font-size: 13px;
  }
`

const ContentLayout = styled.div`
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 24px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    padding: 24px 20px;
  }
`

const CategorySidebar = styled.div`
  background: #ffffff;
  border-radius: 16px;
  border: 2px solid rgba(226, 232, 240, 1);
  padding: 16px;
  height: fit-content;
  position: sticky;
  top: calc(var(--header-height, 64px) + 120px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);

  @media (max-width: 1024px) {
    position: static;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    padding: 12px;
  }
`

const CategoryHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  svg {
    color: #6366f1;
  }

  @media (max-width: 1024px) {
    display: none;
  }
`

const CategoryItem = styled.button<{ $active: boolean }>`
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: ${({ $active }) =>
    $active
      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(139, 92, 246, 0.08))'
      : 'transparent'};
  border: 2px solid
    ${({ $active }) =>
      $active ? 'rgba(99, 102, 241, 0.3)' : 'rgba(226, 232, 240, 0.5)'};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  text-align: left;
  margin-bottom: 8px;

  &:hover {
    background: ${({ $active }) =>
      $active
        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1))'
        : 'rgba(99, 102, 241, 0.05)'};
    border-color: rgba(99, 102, 241, 0.4);
    transform: translateX(4px);
  }

  &:last-child {
    margin-bottom: 0;
  }

  @media (max-width: 1024px) {
    margin-bottom: 0;
  }
`

const CategoryIcon = styled.div<{ $active: boolean }>`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $active }) =>
    $active
      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
      : 'rgba(226, 232, 240, 0.5)'};
  color: ${({ $active }) => ($active ? '#ffffff' : '#64748b')};
  border-radius: 10px;
  flex-shrink: 0;
  transition: all 0.3s ease;
`

const CategoryContent = styled.div`
  flex: 1;
  min-width: 0;
`

const CategoryLabel = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 2px;
`

const CategoryDescription = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: #64748b;
`

const ActiveIndicator = styled.div`
  position: absolute;
  left: -2px;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 60%;
  background: linear-gradient(180deg, #6366f1, #8b5cf6);
  border-radius: 0 4px 4px 0;
`

const FormArea = styled.div`
  background: #ffffff;
  border-radius: 20px;
  border: 2px solid rgba(226, 232, 240, 1);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
  overflow: hidden;
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
`

const FormContent = styled.div`
  padding: 40px;

  @media (max-width: 768px) {
    padding: 24px 20px;
  }
`

const SectionTitle = styled.div`
  display: flex;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 2px solid rgba(99, 102, 241, 0.1);

  svg {
    color: #6366f1;
    margin-top: 2px;
    flex-shrink: 0;
  }

  h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.5px;
  }

  p {
    margin: 4px 0 0;
    font-size: 14px;
    color: #64748b;
  }
`

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 28px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 24px;
  }
`

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const Label = styled.label`
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 4px;
`

const Required = styled.span`
  color: #ef4444;
  font-size: 16px;
`

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`

const InputIcon = styled.div`
  position: absolute;
  left: 14px;
  color: #6366f1;
  display: flex;
  align-items: center;
  pointer-events: none;
`

const Input = styled.input`
  width: 100%;
  padding: 14px 14px 14px 44px;
  font-size: 14px;
  font-weight: 500;
  color: #0f172a;
  background: #ffffff;
  border: 2px solid rgba(226, 232, 240, 1);
  border-radius: 12px;
  outline: none;
  transition: all 0.3s ease;

  &::placeholder {
    color: #94a3b8;
  }

  &:hover {
    border-color: rgba(99, 102, 241, 0.3);
  }

  &:focus {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.02);
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
  }
`

const SelectButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  background: #ffffff;
  border: 2px dashed rgba(99, 102, 241, 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;

  svg {
    color: #6366f1;
    flex-shrink: 0;
  }

  span {
    flex: 1;
  }

  &:hover {
    background: rgba(99, 102, 241, 0.05);
    border-color: rgba(99, 102, 241, 0.5);
    border-style: solid;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
  }

  &:focus {
    outline: none;
    border-style: solid;
    border-color: #6366f1;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
  }
`

const SelectedCountryCard = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.05));
  border: 2px solid rgba(99, 102, 241, 0.25);
  border-radius: 12px;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.4);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
  }
`

const CountryFlag = styled.div`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: #ffffff;
  border-radius: 10px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
`

const CountryInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const CountryName = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 2px;
`

const CountryLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #6366f1;
`

const SelectedParentCard = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(168, 85, 247, 0.05));
  border: 2px solid rgba(139, 92, 246, 0.25);
  border-radius: 12px;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(139, 92, 246, 0.4);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.15);
  }
`

const ParentIcon = styled.div`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  color: #ffffff;
  border-radius: 10px;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
`

const ParentInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const ParentName = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 2px;
`

const ParentLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #8b5cf6;
`

const ClearIconButton = styled.button`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: #ef4444;
    color: #ffffff;
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
`

const CheckboxCard = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px;
  background: rgba(99, 102, 241, 0.04);
  border: 2px solid rgba(99, 102, 241, 0.15);
  border-radius: 12px;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.06);
    border-color: rgba(99, 102, 241, 0.25);
  }
`

const CheckboxIcon = styled.div<{ $checked: boolean }>`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $checked }) =>
    $checked
      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
      : 'rgba(226, 232, 240, 0.5)'};
  color: ${({ $checked }) => ($checked ? '#ffffff' : '#64748b')};
  border-radius: 10px;
  flex-shrink: 0;
  transition: all 0.3s ease;
`

const CheckboxContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;

  input[type='checkbox'] {
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: #6366f1;
  }
`

const CheckboxHint = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  line-height: 1.5;
`

const Textarea = styled.textarea`
  width: 100%;
  padding: 14px 16px;
  font-size: 14px;
  font-weight: 500;
  color: #0f172a;
  font-family: inherit;
  line-height: 1.7;
  resize: vertical;
  background: #ffffff;
  border: 2px solid rgba(226, 232, 240, 1);
  border-radius: 12px;
  outline: none;
  transition: all 0.3s ease;

  &::placeholder {
    color: #94a3b8;
  }

  &:hover {
    border-color: rgba(99, 102, 241, 0.3);
  }

  &:focus {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.02);
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
  }
`

const Hint = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  line-height: 1.5;
`

const InfoBox = styled.div`
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 16px 18px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(99, 102, 241, 0.05));
  border: 2px solid rgba(99, 102, 241, 0.15);
  border-radius: 12px;
`

const InfoIconWrapper = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #ffffff;
  border-radius: 10px;
  flex-shrink: 0;
`

const InfoContent = styled.div`
  flex: 1;
`

const InfoTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 6px;
`

const InfoText = styled.p`
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  line-height: 1.6;
`

const FormActions = styled.div`
  display: flex;
  gap: 14px;
  justify-content: flex-end;
  padding: 28px 40px;
  background: rgba(248, 250, 252, 0.8);
  border-top: 2px solid rgba(226, 232, 240, 1);

  @media (max-width: 768px) {
    padding: 20px;
    flex-direction: column-reverse;
  }
`

const ActionButton = styled.button<{
  $variant: 'primary' | 'secondary'
}>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  font-size: 15px;
  font-weight: 700;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid
    ${({ $variant }) =>
      $variant === 'primary' ? '#6366f1' : 'rgba(226, 232, 240, 1)'};
  background: ${({ $variant }) =>
    $variant === 'primary'
      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
      : '#ffffff'};
  color: ${({ $variant }) => ($variant === 'primary' ? '#ffffff' : '#64748b')};
  box-shadow: ${({ $variant }) =>
    $variant === 'primary'
      ? '0 8px 20px rgba(99, 102, 241, 0.3)'
      : '0 2px 8px rgba(0, 0, 0, 0.05)'};

  &:hover:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: ${({ $variant }) =>
      $variant === 'primary'
        ? '0 12px 28px rgba(99, 102, 241, 0.4)'
        : '0 4px 12px rgba(0, 0, 0, 0.1)'};
    border-color: ${({ $variant }) =>
      $variant === 'primary' ? '#4f46e5' : 'rgba(99, 102, 241, 0.3)'};
  }

  &:active:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
  }
`

// 상위 부처 선택 모달
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
  padding: 20px;
`

const ModalBox = styled.div`
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
`

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  border-bottom: 2px solid rgba(226, 232, 240, 1);
`

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
`

const ModalCloseButton = styled.button`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(148, 163, 184, 0.08);
  color: #94a3b8;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    color: #6366f1;
  }
`

const ModalContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(226, 232, 240, 0.3);
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.4);
    border-radius: 3px;
  }
`

const DeptOption = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: transparent;
  border: 2px solid rgba(226, 232, 240, 0.6);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 8px;
  text-align: left;

  svg {
    color: #6366f1;
    flex-shrink: 0;
  }

  &:hover {
    background: rgba(99, 102, 241, 0.06);
    border-color: rgba(99, 102, 241, 0.3);
    transform: translateX(4px);
  }

  &:last-child {
    margin-bottom: 0;
  }
`

// 역대 장관 관리
const MinisterSplitLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 20px;
  min-height: 500px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`

const MinisterListPanel = styled.div`
  border: 2px solid rgba(226, 232, 240, 1);
  border-radius: 12px;
  background: #ffffff;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
`

const MinisterListHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.03));
  border-bottom: 2px solid rgba(226, 232, 240, 1);
`

const MinisterListTitle = styled.div`
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

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
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
  color: #cbd5e1;
  flex: 1;

  p {
    margin: 16px 0 0;
    font-size: 14px;
    font-weight: 600;
    color: #94a3b8;
  }
`

const MinistersList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;
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

const MinisterCard = styled.div<{ $current: boolean; $selected: boolean }>`
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  margin-bottom: 8px;
  background: ${({ $current, $selected }) =>
    $selected
      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(139, 92, 246, 0.08))'
      : $current
        ? 'rgba(99, 102, 241, 0.05)'
        : '#ffffff'};
  border: 1.5px solid
    ${({ $current, $selected }) =>
      $selected ? '#6366f1' : $current ? 'rgba(99, 102, 241, 0.3)' : 'rgba(226, 232, 240, 1)'};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ $selected }) => ($selected ? '#6366f1' : 'rgba(99, 102, 241, 0.5)')};
    background: ${({ $current, $selected }) =>
      $selected
        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1))'
        : 'rgba(99, 102, 241, 0.05)'};
    transform: translateX(2px);
  }

  &:last-child {
    margin-bottom: 0;
  }
`

const MinisterOrderBadge = styled.div<{ $current: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  height: 48px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ $current }) => ($current ? '#ffffff' : '#6366f1')};
  background: ${({ $current }) =>
    $current ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(99, 102, 241, 0.1)'};
  border-radius: 10px;
  border: 2px solid ${({ $current }) => ($current ? 'transparent' : 'rgba(99, 102, 241, 0.2)')};
  flex-shrink: 0;
  box-shadow: ${({ $current }) => ($current ? '0 2px 8px rgba(99, 102, 241, 0.3)' : 'none')};
  transition: all 0.2s ease;
`

const MinisterInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const MinisterNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const MinisterName = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 6px;
`

const CurrentBadge = styled.span`
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 700;
  color: #ffffff;
  background: linear-gradient(135deg, #10b981, #059669);
  border-radius: 6px;
`

const PositionBadge = styled.span`
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.2);
`

const MinisterPeriod = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 4px;
`

const MinisterActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
`

const IconButton = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid ${({ $danger }) => ($danger ? 'rgba(239, 68, 68, 0.3)' : 'rgba(99, 102, 241, 0.2)')};
  background: ${({ $danger }) => ($danger ? 'rgba(239, 68, 68, 0.08)' : 'rgba(99, 102, 241, 0.08)')};
  color: ${({ $danger }) => ($danger ? '#ef4444' : '#6366f1')};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: ${({ $danger }) => ($danger ? '#ef4444' : '#6366f1')};
    color: #ffffff;
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
`

const MinisterFormPanel = styled.div<{ $visible: boolean }>`
  border: 2px solid
    ${({ $visible }) => ($visible ? 'rgba(99, 102, 241, 0.3)' : 'rgba(226, 232, 240, 1)')};
  border-radius: 12px;
  background: ${({ $visible }) => ($visible ? '#ffffff' : '#f8fafc')};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  min-height: 500px;
`

const MinisterFormHeader = styled.div`
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.03));
  border-bottom: 2px solid rgba(226, 232, 240, 1);
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
`

const MinisterFormContent = styled.div`
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
    font-weight: 600;
    color: #94a3b8;
  }
`

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const FieldLabel = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #334155;
  display: flex;
  align-items: center;
  gap: 4px;
`

const MinisterFormActions = styled.div`
  display: flex;
  gap: 12px;
  padding-top: 20px;
  margin-top: auto;
  border-top: 2px solid rgba(226, 232, 240, 1);
`

const FormRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const SelectedPersonCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.05));
  border: 2px solid rgba(99, 102, 241, 0.3);
  border-radius: 12px;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.4);
  }
`

const PersonAvatar = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 10px;
  flex-shrink: 0;
`

const OrderInputWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const OrderLabel = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: #6366f1;
`

const OrderInput = styled.input`
  width: 70px;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  text-align: center;
  background: #ffffff;
  border: 2px solid rgba(99, 102, 241, 0.2);
  border-radius: 10px;
  outline: none;
  transition: all 0.2s ease;

  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`

const Placeholder = styled.span`
  color: #94a3b8;
`

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #6366f1;
`

const CancelButton = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 700;
  color: #64748b;
  background: #ffffff;
  border: 2px solid rgba(226, 232, 240, 1);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #f8fafc;
    border-color: rgba(99, 102, 241, 0.3);
  }

  &:active {
    transform: scale(0.98);
  }
`

const SubmitButton = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
`

const ClearButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: #ef4444;
    color: #ffffff;
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
`
