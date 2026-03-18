import React, { useEffect, useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import {
  FiAlertCircle,
  FiBriefcase,
  FiCalendar,
  FiEdit2,
  FiFileText,
  FiFilter,
  FiGitBranch,
  FiGlobe,
  FiInfo,
  FiMapPin,
  FiPlus,
  FiSearch,
  FiShield,
  FiTrash2,
  FiUsers,
  FiX,
  FiAward,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import type { AdministrationDepartment } from '@/shared/api/administration-department'
import { administrationDepartmentApi } from '@/shared/api/administration-department'
import type { CountryResponseDto } from '@/shared/api/countries'
import { getAllCountries } from '@/shared/api/countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { CountrySelectModal } from '@/shared/ui/country-select-modal/country-select-modal'
import { PositionDefinitionsSection } from '@/widgets/country/country-detail/ui/position-definitions-section.widget'

type DetailTab = 'basic' | 'organization' | 'history' | 'location' | 'positions'

type DepartmentWithCountryName = AdministrationDepartment & {
  countryName: string
}

export const AdministrationDepartmentsListPage: React.FC = () => {
  const navigate = useNavigate()
  const playClickSound = useClickSound()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [filterCountryName, setFilterCountryName] = useState('')
  const [countryModalOpen, setCountryModalOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'country' | 'date'>('name')
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(
    null,
  )
  const [activeTab, setActiveTab] = useState<DetailTab>('basic')

  const [modernCountries, setModernCountries] = useState<CountryResponseDto[]>(
    [],
  )
  const [historicalCountries, setHistoricalCountries] = useState<
    HistoricalCountryResponseDto[]
  >([])
  const [departments, setDepartments] = useState<AdministrationDepartment[]>([])
  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [departmentsError, setDepartmentsError] = useState<string | null>(null)

  // 국가 목록 로드
  useEffect(() => {
    loadCountries()
  }, [])

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

  // 행정부처 목록 로드 (전체 또는 국가별)
  const loadDepartments = async () => {
    setDepartmentsLoading(true)
    setDepartmentsError(null)
    try {
      const list = filterCountry
        ? await administrationDepartmentApi.getByCountryId(filterCountry)
        : await administrationDepartmentApi.getAll()
      setDepartments(list)
    } catch (e) {
      setDepartmentsError(e instanceof Error ? e.message : '목록을 불러오지 못했습니다')
      setDepartments([])
    } finally {
      setDepartmentsLoading(false)
    }
  }

  useEffect(() => {
    loadDepartments()
  }, [filterCountry])

  // 부처 목록 + 국가명 매핑 (표시용)
  const departmentsWithCountryName: DepartmentWithCountryName[] = React.useMemo(() => {
    const byCountryId: Record<string, string> = {}
    modernCountries.forEach((c) => {
      byCountryId[c.id] = c.name
    })
    historicalCountries.forEach((c) => {
      byCountryId[c.id] = c.name
    })
    return departments.map((d) => ({
      ...d,
      countryName: byCountryId[d.countryId] ?? d.countryId,
    }))
  }, [departments, modernCountries, historicalCountries])

  // 국방부 산하 군부대 목록 (임시 데이터)
  const militaryUnits = [
    {
      id: 'mu-1',
      name: '육군본부',
      type: 'army',
      commander: '김육군 대장',
      established: '1948.08.15',
      personnel: '약 50만명',
    },
    {
      id: 'mu-2',
      name: '해군본부',
      type: 'navy',
      commander: '이해군 대장',
      established: '1945.11.11',
      personnel: '약 7만명',
    },
    {
      id: 'mu-3',
      name: '공군본부',
      type: 'air-force',
      commander: '박공군 대장',
      established: '1949.10.01',
      personnel: '약 6.5만명',
    },
    {
      id: 'mu-4',
      name: '해병대사령부',
      type: 'marines',
      commander: '최해병 중장',
      established: '1949.04.15',
      personnel: '약 2.9만명',
    },
  ]

  const uniqueCountries = Array.from(
    new Set(
      departmentsWithCountryName
        .map((d) => ({ id: d.countryId, name: d.countryName }))
        .map((c) => JSON.stringify(c)),
    ),
  ).map((c) => JSON.parse(c))

  const activeFilterCount = [filterCountry, searchQuery].filter(Boolean).length

  // 국가별 통계
  const departmentsByCountry = departmentsWithCountryName.reduce(
    (acc, dept) => {
      acc[dept.countryId] = (acc[dept.countryId] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const handleCreate = () => {
    playClickSound()
    navigate('/administration-departments/new')
  }

  const handleEdit = (id: string) => {
    playClickSound()
    navigate(`/administration-departments/${id}/edit`)
  }

  const handleDelete = async (id: string, name: string) => {
    playClickSound()
    if (!confirm(`'${name}' 부처를 삭제하시겠습니까?`)) return
    try {
      await administrationDepartmentApi.delete(id)
      if (selectedDepartment === id) setSelectedDepartment(null)
      await loadDepartments()
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제에 실패했습니다')
    }
  }

  const handleSelectDepartment = (id: string) => {
    playClickSound()
    setSelectedDepartment(id)
  }

  const sortedDepartments = React.useMemo(() => {
    let list = departmentsWithCountryName
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter((d) => d.name.toLowerCase().includes(q))
    }
    if (sortBy === 'name') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === 'country') {
      list = [...list].sort((a, b) =>
        a.countryName.localeCompare(b.countryName),
      )
    } else {
      list = [...list].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    }
    return list
  }, [departmentsWithCountryName, searchQuery, sortBy])

  const selectedDept = sortedDepartments.find(
    (d) => d.id === selectedDepartment,
  )

  return (
    <PageWrapper>
      <PageContainer>
        <PageHeader
          as={motion.div}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <HeaderLeft>
            <HeaderIcon>
              <FiBriefcase size={28} />
            </HeaderIcon>
            <HeaderText>
              <h1>행정부처 관리</h1>
              <p>행정부처 정보를 관리합니다</p>
            </HeaderText>
          </HeaderLeft>
          <CreateButton onClick={handleCreate}>
            <FiPlus size={18} />
            행정부처 추가
          </CreateButton>
        </PageHeader>

        <SplitLayout>
          {/* 좌측: 필터 + 리스트 */}
          <LeftPanel
            as={motion.div}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {/* 필터 영역 */}
            <FilterBar>
              <FilterHeader>
                <FiFilter size={16} />
                <span>검색 및 필터</span>
              </FilterHeader>

              <SearchWrapper>
                <FiSearch size={16} />
                <SearchInput
                  type="text"
                  placeholder="부처명 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <ClearSearchButton
                    onClick={() => {
                      playClickSound()
                      setSearchQuery('')
                    }}
                  >
                    <FiX size={14} />
                  </ClearSearchButton>
                )}
              </SearchWrapper>

              <FilterRow>
                <FilterButton
                  onClick={() => {
                    playClickSound()
                    setCountryModalOpen(true)
                  }}
                  $active={!!filterCountry}
                >
                  <FiGlobe size={14} />
                  {filterCountryName || '국가'}
                  {filterCountry && (
                    <RemoveFilterButton
                      onClick={(e) => {
                        e.stopPropagation()
                        playClickSound()
                        setFilterCountry('')
                        setFilterCountryName('')
                      }}
                    >
                      <FiX size={12} />
                    </RemoveFilterButton>
                  )}
                </FilterButton>

                <SortSelect
                  value={sortBy}
                  onChange={(e) => {
                    playClickSound()
                    setSortBy(e.target.value as 'name' | 'country' | 'date')
                  }}
                >
                  <option value="name">이름순</option>
                  <option value="country">국가순</option>
                  <option value="date">최신순</option>
                </SortSelect>
              </FilterRow>

              <ResultCount>
                총 <strong>{sortedDepartments.length}</strong>개의 부처
                {activeFilterCount > 0 && (
                  <FilterCountBadge>
                    {activeFilterCount}개 필터 적용
                  </FilterCountBadge>
                )}
              </ResultCount>
            </FilterBar>

            {/* 리스트 영역 */}
            <DepartmentList>
              <AnimatePresence mode="popLayout">
                {departmentsLoading ? (
                  <EmptyListState
                    as={motion.div}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    style={{ padding: '48px 24px' }}
                  >
                    <p>불러오는 중...</p>
                  </EmptyListState>
                ) : departmentsError ? (
                  <EmptyListState
                    as={motion.div}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    style={{ padding: '48px 24px', color: '#b91c1c' }}
                  >
                    <p>{departmentsError}</p>
                  </EmptyListState>
                ) : sortedDepartments.length === 0 ? (
                  <EmptyListState
                    as={motion.div}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FiBriefcase size={48} style={{ opacity: 0.2 }} />
                    <p>
                      {searchQuery || filterCountry
                        ? '검색 결과가 없습니다'
                        : '등록된 행정부처가 없습니다'}
                    </p>
                    {(searchQuery || filterCountry) && (
                      <HintText>필터를 제거하고 다시 시도해보세요</HintText>
                    )}
                  </EmptyListState>
                ) : (
                  sortedDepartments.map((dept, index) => (
                    <DepartmentListItem
                      key={dept.id}
                      $selected={selectedDepartment === dept.id}
                      onClick={() => handleSelectDepartment(dept.id)}
                      as={motion.button}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      layout
                    >
                      <ListItemIcon>
                        <FiBriefcase size={20} />
                      </ListItemIcon>
                      <ListItemContent>
                        <ListItemTitle>{dept.name}</ListItemTitle>
                        <ListItemMeta>
                          <CountryTag>{dept.countryName}</CountryTag>
                          {dept.parentId && (
                            <ParentTag>
                              <FiGitBranch size={10} />
                              하위 부처
                            </ParentTag>
                          )}
                        </ListItemMeta>
                      </ListItemContent>
                    </DepartmentListItem>
                  ))
                )}
              </AnimatePresence>
            </DepartmentList>
          </LeftPanel>

          {/* 우측: 상세 정보 */}
          <RightPanel
            as={motion.div}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <AnimatePresence mode="wait">
              {selectedDept ? (
                <motion.div
                  key={selectedDept.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  {/* 헤더 카드 */}
                  <DetailCard>
                    <DetailCardHeader>
                      <DetailIcon>
                        <FiBriefcase size={28} />
                      </DetailIcon>
                      <DetailHeaderText>
                        <DetailTitle>{selectedDept.name}</DetailTitle>
                        <DetailSubtitle>
                          <FiGlobe size={14} />
                          {selectedDept.countryName}
                        </DetailSubtitle>
                      </DetailHeaderText>
                      <HeaderActions>
                        <IconActionButton
                          onClick={() => handleEdit(selectedDept.id)}
                          title="수정"
                        >
                          <FiEdit2 size={16} />
                        </IconActionButton>
                        <IconActionButton
                          $danger
                          onClick={() =>
                            handleDelete(selectedDept.id, selectedDept.name)
                          }
                          title="삭제"
                        >
                          <FiTrash2 size={16} />
                        </IconActionButton>
                      </HeaderActions>
                    </DetailCardHeader>
                  </DetailCard>

                  {/* 탭 네비게이션 */}
                  <TabNavigation>
                    <TabButton
                      $active={activeTab === 'basic'}
                      onClick={() => {
                        playClickSound()
                        setActiveTab('basic')
                      }}
                    >
                      <FiInfo size={16} />
                      기본 정보
                    </TabButton>
                    <TabButton
                      $active={activeTab === 'organization'}
                      onClick={() => {
                        playClickSound()
                        setActiveTab('organization')
                      }}
                    >
                      <FiUsers size={16} />
                      조직
                    </TabButton>
                    <TabButton
                      $active={activeTab === 'history'}
                      onClick={() => {
                        playClickSound()
                        setActiveTab('history')
                      }}
                    >
                      <FiCalendar size={16} />
                      연혁
                    </TabButton>
                    <TabButton
                      $active={activeTab === 'location'}
                      onClick={() => {
                        playClickSound()
                        setActiveTab('location')
                      }}
                    >
                      <FiMapPin size={16} />
                      위치
                    </TabButton>
                    <TabButton
                      $active={activeTab === 'positions'}
                      onClick={() => {
                        playClickSound()
                        setActiveTab('positions')
                      }}
                    >
                      <FiAward size={16} />
                      직위 정의
                    </TabButton>
                  </TabNavigation>

                  {/* 탭 콘텐츠 */}
                  <AnimatePresence mode="wait">
                    {activeTab === 'basic' && (
                      <motion.div
                        key="basic"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px',
                        }}
                      >
                        {/* 기본 정보 카드 */}
                        <DetailCard>
                          <CardSectionTitle>
                            <FiInfo size={16} />
                            기본 정보
                          </CardSectionTitle>
                          <InfoGrid>
                            <InfoCard>
                              <InfoCardLabel>부처명</InfoCardLabel>
                              <InfoCardValue>{selectedDept.name}</InfoCardValue>
                            </InfoCard>
                            <InfoCard>
                              <InfoCardLabel>국가</InfoCardLabel>
                              <InfoCardValue>
                                <CountryBadge>
                                  {selectedDept.countryName}
                                </CountryBadge>
                              </InfoCardValue>
                            </InfoCard>
                            {selectedDept.parentId && (
                              <InfoCard>
                                <InfoCardLabel>상위 부처</InfoCardLabel>
                                <InfoCardValue>국무총리실</InfoCardValue>
                              </InfoCard>
                            )}
                            <InfoCard>
                              <InfoCardLabel>생성일</InfoCardLabel>
                              <InfoCardValue>
                                {new Date(
                                  selectedDept.createdAt,
                                ).toLocaleDateString('ko-KR', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </InfoCardValue>
                            </InfoCard>
                          </InfoGrid>
                        </DetailCard>

                        {/* 설명 카드 */}
                        {selectedDept.description && (
                          <DetailCard>
                            <CardSectionTitle>
                              <FiFileText size={16} />
                              설명
                            </CardSectionTitle>
                            <DescriptionBox>
                              {selectedDept.description}
                            </DescriptionBox>
                          </DetailCard>
                        )}

                        {/* 안내 메시지 */}
                        <InfoBox>
                          <FiAlertCircle size={16} />
                          <InfoBoxContent>
                            <InfoBoxTitle>추가 정보 입력</InfoBoxTitle>
                            <InfoBoxText>
                              상세 페이지에서 조직 구조, 연혁, 위치 등의 추가
                              정보를 입력할 수 있습니다.
                            </InfoBoxText>
                          </InfoBoxContent>
                        </InfoBox>
                      </motion.div>
                    )}

                    {activeTab === 'organization' && (
                      <motion.div
                        key="organization"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px',
                        }}
                      >
                        {/* 조직 통계 카드 */}
                        <DetailCard>
                          <CardSectionTitle>
                            <FiUsers size={16} />
                            조직 현황
                          </CardSectionTitle>
                          <InfoGrid>
                            <InfoCard>
                              <InfoCardLabel>총 인원</InfoCardLabel>
                              <InfoCardValue>1,234명</InfoCardValue>
                            </InfoCard>
                            <InfoCard>
                              <InfoCardLabel>하위 부처 수</InfoCardLabel>
                              <InfoCardValue>12개</InfoCardValue>
                            </InfoCard>
                            <InfoCard>
                              <InfoCardLabel>주요 부서</InfoCardLabel>
                              <InfoCardValue>기획조정실, 정책국</InfoCardValue>
                            </InfoCard>
                            <InfoCard>
                              <InfoCardLabel>예산 규모</InfoCardLabel>
                              <InfoCardValue>5조 원</InfoCardValue>
                            </InfoCard>
                          </InfoGrid>
                        </DetailCard>

                        {/* 조직도 카드 */}
                        <DetailCard>
                          <CardSectionTitle>
                            <FiGitBranch size={16} />
                            조직도
                          </CardSectionTitle>
                          <OrganizationChart>
                            {/* 최고 직급 (장관) */}
                            <OrgLevel>
                              <OrgLevelTitle>
                                <FiBriefcase size={14} />
                                장관
                              </OrgLevelTitle>
                              <OrgMemberCard $isHead>
                                <OrgMemberAvatar>
                                  <FiUsers size={20} />
                                </OrgMemberAvatar>
                                <OrgMemberInfo>
                                  <OrgMemberName>홍길동</OrgMemberName>
                                  <OrgMemberPosition>
                                    외교부 장관
                                  </OrgMemberPosition>
                                  <OrgMemberPeriod>
                                    2022.01 ~ 현재
                                  </OrgMemberPeriod>
                                </OrgMemberInfo>
                              </OrgMemberCard>
                            </OrgLevel>

                            <OrgDivider />

                            {/* 차관급 */}
                            <OrgLevel>
                              <OrgLevelTitle>
                                <FiBriefcase size={14} />
                                차관 (2명)
                              </OrgLevelTitle>
                              <OrgMemberGrid>
                                <OrgMemberCard>
                                  <OrgMemberAvatar>
                                    <FiUsers size={18} />
                                  </OrgMemberAvatar>
                                  <OrgMemberInfo>
                                    <OrgMemberName>김철수</OrgMemberName>
                                    <OrgMemberPosition>
                                      제1차관
                                    </OrgMemberPosition>
                                    <OrgMemberPeriod>
                                      2023.03 ~ 현재
                                    </OrgMemberPeriod>
                                  </OrgMemberInfo>
                                </OrgMemberCard>
                                <OrgMemberCard>
                                  <OrgMemberAvatar>
                                    <FiUsers size={18} />
                                  </OrgMemberAvatar>
                                  <OrgMemberInfo>
                                    <OrgMemberName>이영희</OrgMemberName>
                                    <OrgMemberPosition>
                                      제2차관
                                    </OrgMemberPosition>
                                    <OrgMemberPeriod>
                                      2023.05 ~ 현재
                                    </OrgMemberPeriod>
                                  </OrgMemberInfo>
                                </OrgMemberCard>
                              </OrgMemberGrid>
                            </OrgLevel>

                            <OrgDivider />

                            {/* 실장급 */}
                            <OrgLevel>
                              <OrgLevelTitle>
                                <FiBriefcase size={14} />
                                실장 (3명)
                              </OrgLevelTitle>
                              <OrgMemberGrid>
                                <OrgMemberCard>
                                  <OrgMemberAvatar>
                                    <FiUsers size={18} />
                                  </OrgMemberAvatar>
                                  <OrgMemberInfo>
                                    <OrgMemberName>박민수</OrgMemberName>
                                    <OrgMemberPosition>
                                      기획조정실장
                                    </OrgMemberPosition>
                                    <OrgMemberPeriod>
                                      2023.06 ~ 현재
                                    </OrgMemberPeriod>
                                  </OrgMemberInfo>
                                </OrgMemberCard>
                                <OrgMemberCard>
                                  <OrgMemberAvatar>
                                    <FiUsers size={18} />
                                  </OrgMemberAvatar>
                                  <OrgMemberInfo>
                                    <OrgMemberName>정수진</OrgMemberName>
                                    <OrgMemberPosition>
                                      정책실장
                                    </OrgMemberPosition>
                                    <OrgMemberPeriod>
                                      2023.07 ~ 현재
                                    </OrgMemberPeriod>
                                  </OrgMemberInfo>
                                </OrgMemberCard>
                                <OrgMemberCard>
                                  <OrgMemberAvatar>
                                    <FiUsers size={18} />
                                  </OrgMemberAvatar>
                                  <OrgMemberInfo>
                                    <OrgMemberName>최동욱</OrgMemberName>
                                    <OrgMemberPosition>
                                      대외협력실장
                                    </OrgMemberPosition>
                                    <OrgMemberPeriod>
                                      2023.08 ~ 현재
                                    </OrgMemberPeriod>
                                  </OrgMemberInfo>
                                </OrgMemberCard>
                              </OrgMemberGrid>
                            </OrgLevel>

                            <OrgDivider />

                            {/* 국장급 */}
                            <OrgLevel>
                              <OrgLevelTitle>
                                <FiBriefcase size={14} />
                                국장 (5명)
                              </OrgLevelTitle>
                              <OrgMemberGrid>
                                <OrgMemberCard $compact>
                                  <OrgMemberAvatar $small>
                                    <FiUsers size={16} />
                                  </OrgMemberAvatar>
                                  <OrgMemberInfo>
                                    <OrgMemberName>강지훈</OrgMemberName>
                                    <OrgMemberPosition>
                                      국제기구국장
                                    </OrgMemberPosition>
                                  </OrgMemberInfo>
                                </OrgMemberCard>
                                <OrgMemberCard $compact>
                                  <OrgMemberAvatar $small>
                                    <FiUsers size={16} />
                                  </OrgMemberAvatar>
                                  <OrgMemberInfo>
                                    <OrgMemberName>윤서연</OrgMemberName>
                                    <OrgMemberPosition>
                                      다자외교국장
                                    </OrgMemberPosition>
                                  </OrgMemberInfo>
                                </OrgMemberCard>
                                <OrgMemberCard $compact>
                                  <OrgMemberAvatar $small>
                                    <FiUsers size={16} />
                                  </OrgMemberAvatar>
                                  <OrgMemberInfo>
                                    <OrgMemberName>임현우</OrgMemberName>
                                    <OrgMemberPosition>
                                      조약국장
                                    </OrgMemberPosition>
                                  </OrgMemberInfo>
                                </OrgMemberCard>
                                <MoreMembersCard>
                                  <FiUsers size={16} />
                                  <span>+2명 더보기</span>
                                </MoreMembersCard>
                              </OrgMemberGrid>
                            </OrgLevel>
                          </OrganizationChart>
                        </DetailCard>

                        {/* 상하위 부처 */}
                        <DetailCard>
                          <CardSectionTitle>
                            <FiGitBranch size={16} />
                            상하위 부처
                          </CardSectionTitle>
                          <HierarchySection>
                            {selectedDept.parentId && (
                              <HierarchyItem>
                                <HierarchyLabel>상위 부처</HierarchyLabel>
                                <HierarchyValue>
                                  <FiBriefcase size={16} />
                                  국무총리실
                                </HierarchyValue>
                              </HierarchyItem>
                            )}
                            <HierarchyItem>
                              <HierarchyLabel>하위 부처 (3개)</HierarchyLabel>
                              <HierarchyList>
                                <HierarchyListItem>
                                  <FiBriefcase size={14} />
                                  외교정책실
                                </HierarchyListItem>
                                <HierarchyListItem>
                                  <FiBriefcase size={14} />
                                  통상교섭본부
                                </HierarchyListItem>
                                <HierarchyListItem>
                                  <FiBriefcase size={14} />
                                  영사서비스국
                                </HierarchyListItem>
                              </HierarchyList>
                            </HierarchyItem>
                          </HierarchySection>
                        </DetailCard>

                        {/* 관할 군부대 (국방부인 경우에만 표시) */}
                        {selectedDept.hasMilitaryUnits && (
                          <DetailCard>
                            <CardSectionTitle>
                              <FiShield size={16} />
                              관할 군부대 ({militaryUnits.length}개)
                            </CardSectionTitle>
                            <MilitaryUnitsSection>
                              <MilitaryUnitsGrid>
                                {militaryUnits.map((unit) => (
                                  <MilitaryUnitCard key={unit.id}>
                                    <MilitaryUnitHeader>
                                      <MilitaryUnitIcon $type={unit.type}>
                                        <FiShield size={20} />
                                      </MilitaryUnitIcon>
                                      <MilitaryUnitInfo>
                                        <MilitaryUnitName>
                                          {unit.name}
                                        </MilitaryUnitName>
                                        <MilitaryUnitMeta>
                                          {unit.type === 'army' && '육군'}
                                          {unit.type === 'navy' && '해군'}
                                          {unit.type === 'air-force' && '공군'}
                                          {unit.type === 'marines' && '해병대'}
                                        </MilitaryUnitMeta>
                                      </MilitaryUnitInfo>
                                    </MilitaryUnitHeader>
                                    <MilitaryUnitDetails>
                                      <MilitaryUnitDetailRow>
                                        <MilitaryUnitDetailLabel>
                                          지휘관
                                        </MilitaryUnitDetailLabel>
                                        <MilitaryUnitDetailValue>
                                          {unit.commander}
                                        </MilitaryUnitDetailValue>
                                      </MilitaryUnitDetailRow>
                                      <MilitaryUnitDetailRow>
                                        <MilitaryUnitDetailLabel>
                                          창설일
                                        </MilitaryUnitDetailLabel>
                                        <MilitaryUnitDetailValue>
                                          {unit.established}
                                        </MilitaryUnitDetailValue>
                                      </MilitaryUnitDetailRow>
                                      <MilitaryUnitDetailRow>
                                        <MilitaryUnitDetailLabel>
                                          병력
                                        </MilitaryUnitDetailLabel>
                                        <MilitaryUnitDetailValue>
                                          {unit.personnel}
                                        </MilitaryUnitDetailValue>
                                      </MilitaryUnitDetailRow>
                                    </MilitaryUnitDetails>
                                  </MilitaryUnitCard>
                                ))}
                              </MilitaryUnitsGrid>
                              <InfoBox>
                                <FiAlertCircle size={16} />
                                <InfoBoxContent>
                                  <InfoBoxTitle>군부대 연결</InfoBoxTitle>
                                  <InfoBoxText>
                                    이 부처는 군부대를 관할합니다. 각 군부대
                                    카드를 클릭하면 상세 정보를 확인할 수
                                    있습니다.
                                  </InfoBoxText>
                                </InfoBoxContent>
                              </InfoBox>
                            </MilitaryUnitsSection>
                          </DetailCard>
                        )}

                        {/* 안내 메시지 */}
                        <InfoBox>
                          <FiAlertCircle size={16} />
                          <InfoBoxContent>
                            <InfoBoxTitle>조직도 관리</InfoBoxTitle>
                            <InfoBoxText>
                              각 직급별 인물을 클릭하여 상세 정보를 확인하거나,
                              수정 버튼을 통해 조직도를 업데이트할 수 있습니다.
                            </InfoBoxText>
                          </InfoBoxContent>
                        </InfoBox>
                      </motion.div>
                    )}

                    {activeTab === 'history' && (
                      <motion.div
                        key="history"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <DetailCard>
                          <CardSectionTitle>
                            <FiCalendar size={16} />
                            주요 연혁
                          </CardSectionTitle>
                          <HistorySection>
                            <HistoryItem>
                              <HistoryYear>2024</HistoryYear>
                              <HistoryContent>
                                조직 개편 및 신규 부서 신설
                              </HistoryContent>
                            </HistoryItem>
                            <HistoryItem>
                              <HistoryYear>2020</HistoryYear>
                              <HistoryContent>
                                청사 이전 (서울 → 세종)
                              </HistoryContent>
                            </HistoryItem>
                            <HistoryItem>
                              <HistoryYear>2010</HistoryYear>
                              <HistoryContent>부처 명칭 변경</HistoryContent>
                            </HistoryItem>
                            <HistoryItem>
                              <HistoryYear>1998</HistoryYear>
                              <HistoryContent>부처 설립</HistoryContent>
                            </HistoryItem>
                          </HistorySection>
                        </DetailCard>
                      </motion.div>
                    )}

                    {activeTab === 'location' && (
                      <motion.div
                        key="location"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px',
                        }}
                      >
                        {/* 위치 정보 카드 */}
                        <DetailCard>
                          <CardSectionTitle>
                            <FiMapPin size={16} />
                            위치 정보
                          </CardSectionTitle>
                          <InfoGrid>
                            <InfoCard style={{ gridColumn: '1 / -1' }}>
                              <InfoCardLabel>주소</InfoCardLabel>
                              <InfoCardValue>
                                서울특별시 종로구 세종대로 209
                              </InfoCardValue>
                            </InfoCard>
                            <InfoCard>
                              <InfoCardLabel>지역</InfoCardLabel>
                              <InfoCardValue>서울 중심부</InfoCardValue>
                            </InfoCard>
                            <InfoCard>
                              <InfoCardLabel>우편번호</InfoCardLabel>
                              <InfoCardValue>03171</InfoCardValue>
                            </InfoCard>
                          </InfoGrid>
                        </DetailCard>

                        {/* 지도 카드 */}
                        <DetailCard>
                          <CardSectionTitle>
                            <FiGlobe size={16} />
                            위치 지도
                          </CardSectionTitle>
                          <MapPlaceholder>
                            <FiMapPin size={48} style={{ opacity: 0.2 }} />
                            <p>지도 표시 예정</p>
                            <MapNote>
                              Google Maps API 또는 Kakao Maps API 연동 필요
                            </MapNote>
                          </MapPlaceholder>
                        </DetailCard>
                      </motion.div>
                    )}
                    {activeTab === 'positions' && (
                      <motion.div
                        key="positions"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <DetailCard>
                          <div style={{ padding: '24px' }}>
                            <PositionDefinitionsSection
                              fixedOrganizationId={selectedDept?.id}
                              fixedOrganizationName={selectedDept?.name}
                            />
                          </div>
                        </DetailCard>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <EmptyDetailState
                  as={motion.div}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <FiBriefcase size={64} style={{ opacity: 0.1 }} />
                  <p>좌측 목록에서 행정부처를 선택하세요</p>
                  <HintText>
                    부처를 선택하면 상세 정보를 확인할 수 있습니다
                  </HintText>
                </EmptyDetailState>
              )}
            </AnimatePresence>
          </RightPanel>
        </SplitLayout>
      </PageContainer>

      {/* 국가 선택 모달 */}
      {countryModalOpen && (
        <CountrySelectModal
          isOpen={countryModalOpen}
          onClose={() => setCountryModalOpen(false)}
          onSelectCountry={(country) => {
            setFilterCountry(country.id)
            setFilterCountryName(country.name)
            setCountryModalOpen(false)
          }}
          modernCountries={modernCountries}
          historicalCountries={historicalCountries}
        />
      )}
    </PageWrapper>
  )
}

// Styled Components
const PageWrapper = styled.div`
  position: fixed;
  top: var(--header-height);
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: calc(100vh - var(--header-height));
  padding: 24px;
  overflow-y: auto;
  background: #f8fafc;

  @media (max-width: 768px) {
    padding: 16px;
  }
`

const PageContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`

const PageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`

const HeaderIcon = styled.div`
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 16px;
  color: #ffffff;
  box-shadow: 0 8px 16px rgba(99, 102, 241, 0.25);
`

const HeaderText = styled.div`
  h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
    color: #0f172a;
  }

  p {
    margin: 4px 0 0;
    font-size: 14px;
    color: #64748b;
  }
`

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
`

const MainLayout = styled.div`
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`

// 새로운 좌우 분할 레이아웃
const SplitLayout = styled.div`
  display: grid;
  grid-template-columns: 420px 1fr;
  gap: 24px;
  align-items: start;

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`

// 좌측 패널 (필터 + 리스트)
const LeftPanel = styled.div`
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid rgba(20, 19, 34, 0.08);
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
  overflow: hidden;
  max-height: calc(100vh - 200px);

  @media (max-width: 968px) {
    max-height: 600px;
  }
`

// 필터 바 (상단)
const FilterBar = styled.div`
  padding: 20px;
  border-bottom: 1.5px solid rgba(99, 102, 241, 0.1);
  background: linear-gradient(135deg, #fafbfc 0%, #f8fafc 100%);
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const FilterHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #6366f1;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  svg {
    color: #6366f1;
  }
`

const FilterRow = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`

const SearchWrapper = styled.div`
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: #ffffff;
  border: 1.5px solid rgba(99, 102, 241, 0.12);
  border-radius: 10px;
  transition: all 0.2s ease;

  svg {
    color: #6366f1;
    flex-shrink: 0;
  }

  &:focus-within {
    border-color: rgba(99, 102, 241, 0.4);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`

const SearchInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: #0f172a;
  background: transparent;

  &::placeholder {
    color: #94a3b8;
  }
`

const ClearSearchButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #6366f1;
  flex-shrink: 0;

  &:hover {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
    transform: scale(1.1);
  }
`

const FilterButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ $active }) => ($active ? '#ffffff' : '#64748b')};
  background: ${({ $active }) =>
    $active ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#ffffff'};
  border: 1.5px solid
    ${({ $active }) =>
      $active ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.12)'};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  svg {
    flex-shrink: 0;
  }

  &:hover {
    border-color: rgba(99, 102, 241, 0.4);
    background: ${({ $active }) =>
      $active
        ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
        : 'rgba(99, 102, 241, 0.05)'};
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
  }
`

const RemoveFilterButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-left: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  color: #ffffff;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.5);
    transform: scale(1.15);
  }
`

const SortSelect = styled.select`
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  background: #ffffff;
  border: 1.5px solid rgba(99, 102, 241, 0.12);
  border-radius: 10px;
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

const ResultCount = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  padding: 0 2px;

  strong {
    color: #6366f1;
    font-weight: 700;
  }
`

const FilterCountBadge = styled.span`
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
`

// 리스트 영역
const DepartmentList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.2);
    border-radius: 4px;

    &:hover {
      background: rgba(99, 102, 241, 0.3);
    }
  }
`

const EmptyListState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #cbd5e1;

  p {
    margin: 16px 0 0;
    font-size: 15px;
    font-weight: 600;
    color: #94a3b8;
  }
`

const HintText = styled.span`
  margin-top: 8px;
  font-size: 13px;
  color: #cbd5e1;
  text-align: center;
  max-width: 280px;
  line-height: 1.5;
`

const DepartmentListItem = styled.button<{ $selected: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  margin-bottom: 8px;
  background: ${({ $selected }) =>
    $selected
      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.08))'
      : 'transparent'};
  border: 1.5px solid
    ${({ $selected }) =>
      $selected ? 'rgba(99, 102, 241, 0.4)' : 'transparent'};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;

  &:hover {
    background: ${({ $selected }) =>
      $selected
        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.1))'
        : 'rgba(99, 102, 241, 0.05)'};
    border-color: ${({ $selected }) =>
      $selected ? 'rgba(99, 102, 241, 0.5)' : 'rgba(99, 102, 241, 0.2)'};
    transform: translateX(2px);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
  }
`

const ListItemIcon = styled.div`
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 12px;
  color: #ffffff;
  flex-shrink: 0;
  box-shadow: 0 4px 8px rgba(99, 102, 241, 0.2);
`

const ListItemContent = styled.div`
  flex: 1;
  min-width: 0;
`

const ListItemTitle = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ListItemMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

const CountryTag = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  color: #6366f1;
  padding: 3px 8px;
  background: rgba(99, 102, 241, 0.12);
  border-radius: 6px;
`

const ParentTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  padding: 3px 8px;
  background: rgba(100, 116, 139, 0.1);
  border-radius: 6px;

  svg {
    flex-shrink: 0;
  }
`

// 우측 패널 (상세 정보)
const RightPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  padding-right: 4px;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.2);
    border-radius: 4px;

    &:hover {
      background: rgba(99, 102, 241, 0.3);
    }
  }

  @media (max-width: 968px) {
    max-height: none;
  }
`

// 개별 카드 컨테이너
const DetailCard = styled.div`
  background: #ffffff;
  border: 1px solid rgba(20, 19, 34, 0.08);
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
  overflow: hidden;
`

const DetailCardHeader = styled.div`
  padding: 24px;
  background: linear-gradient(135deg, #fafbfc, #f8fafc);
  border-bottom: 1.5px solid rgba(99, 102, 241, 0.1);
  display: flex;
  align-items: center;
  gap: 16px;
`

const HeaderActions = styled.div`
  display: flex;
  gap: 8px;
  margin-left: auto;
`

const IconActionButton = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1.5px solid
    ${({ $danger }) =>
      $danger ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)'};
  background: #ffffff;
  color: ${({ $danger }) => ($danger ? '#ef4444' : '#6366f1')};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ $danger }) =>
      $danger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)'};
    border-color: ${({ $danger }) => ($danger ? '#ef4444' : '#6366f1')};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px
      ${({ $danger }) =>
        $danger ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)'};
  }

  &:active {
    transform: translateY(0);
  }
`

// 탭 네비게이션
const TabNavigation = styled.div`
  display: flex;
  gap: 8px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid rgba(20, 19, 34, 0.08);
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
`

const TabButton = styled.button<{ $active: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ $active }) => ($active ? '#ffffff' : '#64748b')};
  background: ${({ $active }) =>
    $active ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent'};
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  svg {
    flex-shrink: 0;
  }

  &:hover {
    background: ${({ $active }) =>
      $active
        ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
        : 'rgba(99, 102, 241, 0.08)'};
    color: ${({ $active }) => ($active ? '#ffffff' : '#6366f1')};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    padding: 10px 12px;
    font-size: 12px;

    svg {
      width: 14px;
      height: 14px;
    }
  }
`

const DetailIcon = styled.div`
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 16px;
  color: #ffffff;
  flex-shrink: 0;
  box-shadow: 0 8px 16px rgba(99, 102, 241, 0.25);
`

const DetailHeaderText = styled.div`
  flex: 1;
  min-width: 0;
`

const DetailTitle = styled.h2`
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const DetailSubtitle = styled.div`
  margin-top: 6px;
  font-size: 14px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;

  svg {
    color: #6366f1;
    flex-shrink: 0;
  }
`

const DetailActions = styled.div`
  display: flex;
  gap: 8px;
  padding: 0 20px 20px;
`

// 계층 구조 스타일
const HierarchySection = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
`

const HierarchyItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const HierarchyLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: #6366f1;
  text-transform: uppercase;
  letter-spacing: 0.8px;
`

const HierarchyValue = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  padding: 14px 16px;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.08),
    rgba(139, 92, 246, 0.05)
  );
  border: 1.5px solid rgba(99, 102, 241, 0.2);
  border-radius: 10px;
  transition: all 0.2s ease;

  svg {
    color: #6366f1;
    flex-shrink: 0;
  }

  &:hover {
    border-color: rgba(99, 102, 241, 0.4);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
  }
`

const HierarchyList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const HierarchyListItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #fafbfc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  transition: all 0.2s ease;

  svg {
    color: #6366f1;
    flex-shrink: 0;
  }

  &:hover {
    background: #ffffff;
    border-color: rgba(99, 102, 241, 0.3);
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.08);
  }
`

// 연혁 스타일
const HistorySection = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const HistoryItem = styled.div`
  display: flex;
  gap: 16px;
  padding: 16px 18px;
  background: #fafbfc;
  border-left: 3px solid #6366f1;
  border-radius: 10px;
  transition: all 0.2s ease;

  &:hover {
    background: #ffffff;
    border-left-width: 5px;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.12);
    transform: translateX(2px);
  }
`

const HistoryYear = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: #6366f1;
  min-width: 60px;
`

const HistoryContent = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  line-height: 1.6;
`

// 지도 플레이스홀더
const MapPlaceholder = styled.div`
  padding: 80px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fafbfc, #f8fafc);
  border: 2px dashed rgba(99, 102, 241, 0.2);
  border-radius: 16px;
  color: #cbd5e1;
  margin: 20px;

  p {
    margin: 16px 0 8px;
    font-size: 15px;
    font-weight: 600;
    color: #94a3b8;
  }
`

const MapNote = styled.div`
  font-size: 12px;
  color: #cbd5e1;
  text-align: center;
  max-width: 320px;
  line-height: 1.6;
`

const CardSectionTitle = styled.h3`
  margin: 0;
  padding: 18px 24px;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(135deg, #fafbfc, #f8fafc);
  border-bottom: 1.5px solid rgba(99, 102, 241, 0.1);

  svg {
    color: #6366f1;
    flex-shrink: 0;
  }
`

// 정보 그리드
const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  padding: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const InfoCard = styled.div`
  padding: 16px 18px;
  background: #fafbfc;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.3);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.08);
    transform: translateY(-2px);
  }
`

const InfoCardLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: #6366f1;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 8px;
`

const InfoCardValue = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.5;
`

// 설명 박스
const DescriptionBox = styled.div`
  padding: 24px;
  margin: 24px;
  font-size: 14px;
  line-height: 1.8;
  color: #334155;
  background: #fafbfc;
  border-left: 4px solid #6366f1;
  border-radius: 10px;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.08);
  }
`

const DetailActionButton = styled.button<{ $danger?: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ $danger }) => ($danger ? '#ef4444' : '#6366f1')};
  background: #ffffff;
  border: 1.5px solid
    ${({ $danger }) => ($danger ? '#fecaca' : 'rgba(99, 102, 241, 0.2)')};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ $danger }) =>
      $danger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)'};
    border-color: ${({ $danger }) => ($danger ? '#ef4444' : '#6366f1')};
  }
`

const EmptyDetailState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120px 20px;
  background: #ffffff;
  border: 1px solid rgba(20, 19, 34, 0.08);
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
  color: #cbd5e1;

  p {
    margin: 20px 0 0;
    font-size: 16px;
    font-weight: 600;
    color: #94a3b8;
  }
`

const CountryBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.2);
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.3);
  }
`

// InfoBox 스타일 (event-create 페이지 스타일)
const InfoBox = styled.div`
  background: rgba(99, 102, 241, 0.05);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 12px;
  padding: 16px 18px;
  display: flex;
  gap: 12px;
  align-items: flex-start;

  svg {
    color: #6366f1;
    flex-shrink: 0;
    margin-top: 2px;
  }
`

const InfoBoxContent = styled.div`
  flex: 1;
`

const InfoBoxTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 4px;
`

const InfoBoxText = styled.div`
  font-size: 12px;
  color: #475569;
  line-height: 1.6;
`

// 조직도 스타일
const OrganizationChart = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 0;
`

const OrgLevel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const OrgLevelTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #6366f1;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  padding: 0 4px;

  svg {
    color: #6366f1;
    flex-shrink: 0;
  }
`

const OrgDivider = styled.div`
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 0;
    bottom: 0;
    width: 2px;
    background: linear-gradient(
      180deg,
      #6366f1 0%,
      rgba(99, 102, 241, 0.3) 100%
    );
  }
`

const OrgMemberGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const OrgMemberCard = styled.div<{ $isHead?: boolean; $compact?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ $compact }) => ($compact ? '10px' : '14px')};
  padding: ${({ $isHead, $compact }) =>
    $isHead ? '20px' : $compact ? '12px 14px' : '16px'};
  background: ${({ $isHead }) =>
    $isHead
      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(139, 92, 246, 0.08))'
      : '#fafbfc'};
  border: 1.5px solid
    ${({ $isHead }) => ($isHead ? 'rgba(99, 102, 241, 0.3)' : '#e2e8f0')};
  border-radius: 12px;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    background: ${({ $isHead }) =>
      $isHead
        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1))'
        : '#ffffff'};
    border-color: rgba(99, 102, 241, 0.4);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
  }
`

const OrgMemberAvatar = styled.div<{ $small?: boolean }>`
  width: ${({ $small }) => ($small ? '40px' : '52px')};
  height: ${({ $small }) => ($small ? '40px' : '52px')};
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: ${({ $small }) => ($small ? '10px' : '12px')};
  color: #ffffff;
  flex-shrink: 0;
  box-shadow: 0 4px 8px rgba(99, 102, 241, 0.25);
`

const OrgMemberInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const OrgMemberName = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const OrgMemberPosition = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #6366f1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const OrgMemberPeriod = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: #64748b;
`

const MoreMembersCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 14px;
  background: rgba(99, 102, 241, 0.05);
  border: 1.5px dashed rgba(99, 102, 241, 0.3);
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #6366f1;
  cursor: pointer;
  transition: all 0.2s ease;

  svg {
    flex-shrink: 0;
  }

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    border-color: rgba(99, 102, 241, 0.5);
    border-style: solid;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
  }
`

// 군부대 관련 스타일
const MilitaryUnitsSection = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const MilitaryUnitsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const MilitaryUnitCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #fafbfc, #f8fafc);
  border: 1.5px solid #e2e8f0;
  border-radius: 16px;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    border-color: rgba(239, 68, 68, 0.4);
    box-shadow: 0 8px 20px rgba(239, 68, 68, 0.12);
    transform: translateY(-4px);
    background: linear-gradient(135deg, #ffffff, #fefefe);
  }
`

const MilitaryUnitHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`

const MilitaryUnitIcon = styled.div<{ $type: string }>`
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $type }) => {
    switch ($type) {
      case 'army':
        return 'linear-gradient(135deg, #059669, #047857)'
      case 'navy':
        return 'linear-gradient(135deg, #0284c7, #0369a1)'
      case 'air-force':
        return 'linear-gradient(135deg, #7c3aed, #6d28d9)'
      case 'marines':
        return 'linear-gradient(135deg, #dc2626, #b91c1c)'
      default:
        return 'linear-gradient(135deg, #ef4444, #dc2626)'
    }
  }};
  border-radius: 14px;
  color: #ffffff;
  flex-shrink: 0;
  box-shadow: 0 6px 12px rgba(239, 68, 68, 0.25);
`

const MilitaryUnitInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const MilitaryUnitName = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const MilitaryUnitMeta = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #ef4444;
  text-transform: uppercase;
  letter-spacing: 0.8px;
`

const MilitaryUnitDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
`

const MilitaryUnitDetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
`

const MilitaryUnitDetailLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const MilitaryUnitDetailValue = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  text-align: right;
`
