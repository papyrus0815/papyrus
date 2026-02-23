/**
 * PersonTabContent - CountryDetail의 인물 탭
 * 리스트 <-> 상세 전환 기능
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styled from 'styled-components'
import { ActionMenu, type ActionMenuItem } from '@/shared/ui/action-menu'
import { personApi, type Person } from '@/shared/api/person'
import { getPersonDetailById } from '@/shared/api/persons-detail'

interface PersonTabContentProps {
  countryId: string
}

export function PersonTabContent({ countryId }: PersonTabContentProps) {
  const [persons, setPersons] = useState<Person[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [personDetail, setPersonDetail] = useState<any>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [genderFilter, setGenderFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('name')
  const itemsPerPage = 12

  useEffect(() => {
    const fetchPersons = async () => {
      setIsLoading(true)
      try {
        const data = await personApi.getByCountryId(countryId)
        setPersons(data)
      } catch {
        setPersons([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchPersons()
  }, [countryId])

  // 상세 정보 가져오기
  useEffect(() => {
    if (selectedPersonId) {
      const fetchDetail = async () => {
        setIsLoadingDetail(true)
        try {
          const detail = await getPersonDetailById(selectedPersonId)
          setPersonDetail(detail)
        } catch {
          // ignore
        } finally {
          setIsLoadingDetail(false)
        }
      }
      fetchDetail()
    }
  }, [selectedPersonId])

  // 뒤로가기
  const handleBack = () => {
    setSelectedPersonId(null)
    setPersonDetail(null)
  }

  // 상세 화면 렌더링
  if (selectedPersonId) {
    return (
      <DetailSection
        as={motion.div}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
      >
        {/* 플로팅 뒤로가기 버튼 */}
        <FloatingBackButton
          onClick={handleBack}
          as={motion.button}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M19 12H5M12 19l-7-7 7-7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </FloatingBackButton>

        {isLoadingDetail ? (
          <LoadingMessage>
            <Spinner />
            상세 정보를 불러오는 중...
          </LoadingMessage>
        ) : personDetail ? (
          <PersonDetailContent person={personDetail} />
        ) : (
          <ErrorMessage>상세 정보를 불러올 수 없습니다</ErrorMessage>
        )}
      </DetailSection>
    )
  }

  // 검색 및 필터링
  const filteredPersons = persons
    .filter((person) => {
      // 검색어 필터
      const searchLower = searchTerm.toLowerCase()
      const fullName = person.surname
        ? `${person.surname} ${person.name}`
        : person.name
      const matchesSearch = fullName.toLowerCase().includes(searchLower)

      // 성별 필터
      const matchesGender =
        genderFilter === 'all' || person.gender === genderFilter

      // 생존 상태 필터
      let matchesStatus = true
      if (statusFilter === 'alive') {
        matchesStatus = !person.deathYear
      } else if (statusFilter === 'deceased') {
        matchesStatus = !!person.deathYear
      }

      return matchesSearch && matchesGender && matchesStatus
    })
    .sort((a, b) => {
      // 정렬
      if (sortBy === 'name') {
        const nameA = a.surname ? `${a.surname} ${a.name}` : a.name
        const nameB = b.surname ? `${b.surname} ${b.name}` : b.name
        return nameA.localeCompare(nameB)
      } else if (sortBy === 'birthYear') {
        return (b.birthYear || 0) - (a.birthYear || 0)
      } else if (sortBy === 'deathYear') {
        return (b.deathYear || 0) - (a.deathYear || 0)
      }
      return 0
    })

  // 페이지네이션
  const totalPages = Math.ceil(filteredPersons.length / itemsPerPage)
  const paginatedPersons = filteredPersons.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  )

  if (isLoading) {
    return (
      <Wrap>
        <LoadingMessage>
          <Spinner />
          인물 데이터를 불러오는 중...
        </LoadingMessage>
      </Wrap>
    )
  }

  return (
    <Wrap>
      <Container
        as={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* 검색 및 필터 영역 */}
        <FilterSection
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <TopRow>
            <SearchWrapper>
              <SearchIconStyled>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                    fill="currentColor"
                  />
                </svg>
              </SearchIconStyled>
              <SearchInputStyled
                type="text"
                placeholder="이름으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <ClearButtonStyled onClick={() => setSearchTerm('')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                      fill="currentColor"
                    />
                  </svg>
                </ClearButtonStyled>
              )}
            </SearchWrapper>

            <ResultCount>{filteredPersons.length} Items</ResultCount>
          </TopRow>

          <BottomRow>
            <FilterLabel>필터</FilterLabel>
            <FilterGroup>
              {/* 성별 필터 */}
              <FilterButton
                $active={genderFilter !== 'all'}
                onClick={() => {
                  if (genderFilter === 'all') setGenderFilter('남성')
                  else if (genderFilter === '남성') setGenderFilter('여성')
                  else setGenderFilter('all')
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                <span>
                  {genderFilter === 'all'
                    ? '성별'
                    : genderFilter === '남성'
                      ? '남성'
                      : '여성'}
                </span>
                {genderFilter !== 'all' && (
                  <FilterBadge
                    onClick={(e) => {
                      e.stopPropagation()
                      setGenderFilter('all')
                    }}
                  >
                    ✕
                  </FilterBadge>
                )}
              </FilterButton>

              {/* 생존 상태 필터 */}
              <FilterButton
                $active={statusFilter !== 'all'}
                onClick={() => {
                  if (statusFilter === 'all') setStatusFilter('alive')
                  else if (statusFilter === 'alive') setStatusFilter('deceased')
                  else setStatusFilter('all')
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <span>
                  {statusFilter === 'all'
                    ? '상태'
                    : statusFilter === 'alive'
                      ? '생존'
                      : '사망'}
                </span>
                {statusFilter !== 'all' && (
                  <FilterBadge
                    onClick={(e) => {
                      e.stopPropagation()
                      setStatusFilter('all')
                    }}
                  >
                    ✕
                  </FilterBadge>
                )}
              </FilterButton>
            </FilterGroup>

            <SortGroup>
              <FilterLabel>정렬</FilterLabel>
              <SortButton
                $active={sortBy === 'name'}
                onClick={() => setSortBy('name')}
              >
                이름
              </SortButton>
              <SortButton
                $active={sortBy === 'birthYear'}
                onClick={() => setSortBy('birthYear')}
              >
                출생년도
              </SortButton>
              <SortButton
                $active={sortBy === 'deathYear'}
                onClick={() => setSortBy('deathYear')}
              >
                사망년도
              </SortButton>
            </SortGroup>
          </BottomRow>
        </FilterSection>

        {filteredPersons.length === 0 ? (
          <EmptyState
            as={motion.div}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <EmptyIcon>🔍</EmptyIcon>
            <EmptyTitle>검색 결과가 없습니다</EmptyTitle>
            <EmptyDesc>다른 검색어를 사용해보세요</EmptyDesc>
          </EmptyState>
        ) : (
          <>
            <Grid
              as={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {paginatedPersons.map((person, index) => {
                const fullName = person.surname
                  ? `${person.surname} ${person.name}`
                  : person.name

                const birthYear = person.birthYear
                const deathYear = person.deathYear

                const lifespan =
                  birthYear && deathYear
                    ? `${birthYear} - ${deathYear}`
                    : birthYear
                      ? `${birthYear} - `
                      : '미상'

                const displayImage = person.profileImageUrl

                const menuItems: ActionMenuItem[] = [
                  {
                    id: 'edit',
                    label: '수정',
                    icon: '✏️',
                    onClick: () => {},
                  },
                  {
                    id: 'delete',
                    label: '삭제',
                    icon: '🗑️',
                    onClick: () => {},
                  },
                ]

                return (
                  <Card
                    key={person.id}
                    as={motion.div}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    onClick={(e) => {
                      const actionMenu = (e.target as HTMLElement).closest(
                        '[data-action-menu]',
                      )
                      if (actionMenu) {
                        return
                      }
                      // 상세 화면으로 전환
                      setSelectedPersonId(person.id)
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <CardImageWrapper>
                      {displayImage ? (
                        <CardImage src={displayImage} alt={fullName} />
                      ) : (
                        <CardImagePlaceholder>
                          <svg
                            width="80"
                            height="80"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        </CardImagePlaceholder>
                      )}
                    </CardImageWrapper>

                    <CardContent>
                      <PersonInfo>
                        <PersonName>{fullName}</PersonName>
                        <PersonMeta>
                          <MetaBadge $type="lifespan">{lifespan}</MetaBadge>
                        </PersonMeta>
                        <PersonPrice>
                          ${Math.floor(Math.random() * 100) + 20}
                        </PersonPrice>
                      </PersonInfo>
                    </CardContent>

                    <ActionMenuWrapper
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation()
                      }}
                    >
                      <ActionMenu items={menuItems} />
                    </ActionMenuWrapper>
                  </Card>
                )
              })}
            </Grid>

            {/* 페이징 컨트롤 */}
            {totalPages > 1 && (
              <Pagination
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <PaginationButton
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                >
                  ‹ 이전
                </PaginationButton>

                <PaginationInfo>
                  {currentPage} / {totalPages}
                </PaginationInfo>

                <PaginationButton
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  다음 ›
                </PaginationButton>
              </Pagination>
            )}
          </>
        )}
      </Container>
    </Wrap>
  )
}

// 상세 정보 컴포넌트
function PersonDetailContent({ person }: { person: any }) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'genealogy' | 'activities' | 'works'
  >('overview')

  const fullName = person.surname
    ? `${person.surname} ${person.name}`
    : person.name

  const birthYearText = person.birthYear
    ? `${person.birthYear}${person.birthEra === 'BC' ? ' BC' : ''}`
    : '?'
  const deathYearText = person.deathYear
    ? `${person.deathYear}${person.deathEra === 'BC' ? ' BC' : ''}`
    : '?'
  const lifespanText = `${birthYearText} ~ ${deathYearText}`

  return (
    <DetailContent>
      {/* 히어로 이미지 */}
      <DetailHero>
        {person.profileImageUrl ? (
          <HeroImage src={person.profileImageUrl} alt={fullName} />
        ) : (
          <HeroPlaceholder>
            <svg
              width="120"
              height="120"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </HeroPlaceholder>
        )}
        <HeroOverlay>
          <HeroTitle>{fullName}</HeroTitle>
          {person.job && <HeroSubtitle>{person.job.title}</HeroSubtitle>}
        </HeroOverlay>
      </DetailHero>

      {/* 탭 메뉴 */}
      <TabMenu>
        <TabButton
          $active={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
          </svg>
          <span>개요</span>
        </TabButton>
        <TabButton
          $active={activeTab === 'genealogy'}
          onClick={() => setActiveTab('genealogy')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM7.07 18.28c.43-.9 3.05-1.78 4.93-1.78s4.51.88 4.93 1.78C15.57 19.36 13.86 20 12 20s-3.57-.64-4.93-1.72zm11.29-1.45c-1.43-1.74-4.9-2.33-6.36-2.33s-4.93.59-6.36 2.33C4.62 15.49 4 13.82 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 1.82-.62 3.49-1.64 4.83zM12 6c-1.94 0-3.5 1.56-3.5 3.5S10.06 13 12 13s3.5-1.56 3.5-3.5S13.94 6 12 6zm0 5c-.83 0-1.5-.67-1.5-1.5S11.17 8 12 8s1.5.67 1.5 1.5S12.83 11 12 11z" />
          </svg>
          <span>가계도</span>
        </TabButton>
        <TabButton
          $active={activeTab === 'activities'}
          onClick={() => setActiveTab('activities')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
          </svg>
          <span>활동</span>
        </TabButton>
        <TabButton
          $active={activeTab === 'works'}
          onClick={() => setActiveTab('works')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
          </svg>
          <span>저작</span>
        </TabButton>
      </TabMenu>

      {/* 탭 컨텐츠 */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <TabContent
            key="overview"
            as={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* 통계 카드 */}
            <StatsGrid>
              <StatCard>
                <StatLabel>생애 기간</StatLabel>
                <StatValue>
                  {person.birthYear && person.deathYear
                    ? `${person.deathYear - person.birthYear}년`
                    : '?'}
                </StatValue>
                <StatSubtext>{lifespanText}</StatSubtext>
              </StatCard>
              <StatCard>
                <StatLabel>저작 활동</StatLabel>
                <StatValue>{person.books?.length || 0}건</StatValue>
                <StatSubtext>출간 저서</StatSubtext>
              </StatCard>
              <StatCard>
                <StatLabel>주요 사건</StatLabel>
                <StatValue>{person.events?.length || 0}건</StatValue>
                <StatSubtext>참여 사건</StatSubtext>
              </StatCard>
              <StatCard>
                <StatLabel>조직 활동</StatLabel>
                <StatValue>{person.organizationRoles?.length || 0}건</StatValue>
                <StatSubtext>소속 조직</StatSubtext>
              </StatCard>
            </StatsGrid>

            {/* 기본 정보 카드 */}
            <InfoGrid>
              {person.birthYear && (
                <InfoCard>
                  <InfoCardIcon>📅</InfoCardIcon>
                  <InfoCardLabel>생애</InfoCardLabel>
                  <InfoCardValue>{lifespanText}</InfoCardValue>
                </InfoCard>
              )}
              {person.country && (
                <InfoCard>
                  <InfoCardIcon>
                    {person.country.flagEmoji || '🏳️'}
                  </InfoCardIcon>
                  <InfoCardLabel>국가</InfoCardLabel>
                  <InfoCardValue>{person.country.name}</InfoCardValue>
                </InfoCard>
              )}
              {person.gender && (
                <InfoCard>
                  <InfoCardIcon>
                    {person.gender === '남성' ? '👨' : '👩'}
                  </InfoCardIcon>
                  <InfoCardLabel>성별</InfoCardLabel>
                  <InfoCardValue>{person.gender}</InfoCardValue>
                </InfoCard>
              )}
              {person.dynasty && (
                <InfoCard>
                  <InfoCardIcon>👑</InfoCardIcon>
                  <InfoCardLabel>가문</InfoCardLabel>
                  <InfoCardValue>{person.dynasty.name}</InfoCardValue>
                </InfoCard>
              )}
            </InfoGrid>

            {/* 전기 */}
            {person.biography && (
              <BiographyCard>
                <BiographyTitle>전기</BiographyTitle>
                <BiographyText>{person.biography}</BiographyText>
              </BiographyCard>
            )}
          </TabContent>
        )}

        {activeTab === 'genealogy' && (
          <TabContent
            key="genealogy"
            as={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {!person.father &&
            !person.mother &&
            (!person.children || person.children.length === 0) ? (
              <EmptyTabState>
                <EmptyTabIcon>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
                      fill="currentColor"
                    />
                  </svg>
                </EmptyTabIcon>
                <EmptyTabTitle>가족 정보가 없습니다</EmptyTabTitle>
                <EmptyTabDesc>
                  이 인물의 가족 관계 정보가 등록되지 않았습니다
                </EmptyTabDesc>
              </EmptyTabState>
            ) : (
              <GenealogySection>
                <SectionTitle>가족 관계</SectionTitle>

                {/* 부모 */}
                {(person.father || person.mother) && (
                  <FamilyGroup>
                    <FamilyGroupTitle>부모</FamilyGroupTitle>
                    <FamilyGrid>
                      {person.father && (
                        <FamilyCard>
                          <FamilyIcon>부</FamilyIcon>
                          <FamilyName>
                            {person.father.surname} {person.father.name}
                          </FamilyName>
                          <FamilyMeta>아버지</FamilyMeta>
                          {person.father.birthYear && (
                            <FamilyYear>
                              {person.father.birthYear} -{' '}
                              {person.father.deathYear || '?'}
                            </FamilyYear>
                          )}
                        </FamilyCard>
                      )}
                      {person.mother && (
                        <FamilyCard>
                          <FamilyIcon>모</FamilyIcon>
                          <FamilyName>
                            {person.mother.surname} {person.mother.name}
                          </FamilyName>
                          <FamilyMeta>어머니</FamilyMeta>
                          {person.mother.birthYear && (
                            <FamilyYear>
                              {person.mother.birthYear} -{' '}
                              {person.mother.deathYear || '?'}
                            </FamilyYear>
                          )}
                        </FamilyCard>
                      )}
                    </FamilyGrid>
                  </FamilyGroup>
                )}

                {/* 자녀 */}
                {person.children && person.children.length > 0 && (
                  <FamilyGroup>
                    <FamilyGroupTitle>
                      자녀 ({person.children.length}명)
                    </FamilyGroupTitle>
                    <FamilyGrid>
                      {person.children.map((child: any) => (
                        <FamilyCard key={child.id}>
                          <FamilyIcon>자</FamilyIcon>
                          <FamilyName>
                            {child.surname} {child.name}
                          </FamilyName>
                          <FamilyMeta>자녀</FamilyMeta>
                          {child.birthYear && (
                            <FamilyYear>
                              {child.birthYear} - {child.deathYear || '?'}
                            </FamilyYear>
                          )}
                        </FamilyCard>
                      ))}
                    </FamilyGrid>
                  </FamilyGroup>
                )}
              </GenealogySection>
            )}
          </TabContent>
        )}

        {activeTab === 'activities' && (
          <TabContent
            key="activities"
            as={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {(!person.militaryCommands ||
              person.militaryCommands.length === 0) &&
            (!person.organizationRoles ||
              person.organizationRoles.length === 0) &&
            (!person.events || person.events.length === 0) ? (
              <EmptyTabState>
                <EmptyTabIcon>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"
                      fill="currentColor"
                    />
                  </svg>
                </EmptyTabIcon>
                <EmptyTabTitle>활동 정보가 없습니다</EmptyTabTitle>
                <EmptyTabDesc>
                  이 인물의 주요 활동 정보가 등록되지 않았습니다
                </EmptyTabDesc>
              </EmptyTabState>
            ) : (
              <ActivitiesSection>
                <SectionTitle>주요 활동</SectionTitle>
                <ActivitiesGrid>
                  {person.militaryCommands &&
                    person.militaryCommands.length > 0 && (
                      <ActivityCard>
                        <ActivityCardTitle>군 경력</ActivityCardTitle>
                        <ActivityList>
                          {person.militaryCommands.map((cmd: any) => (
                            <ActivityItem key={cmd.id}>
                              <ActivityDot />
                              <ActivityName>{cmd.unit.name}</ActivityName>
                              <ActivityMeta>
                                {cmd.rank} · {cmd.role}
                              </ActivityMeta>
                            </ActivityItem>
                          ))}
                        </ActivityList>
                      </ActivityCard>
                    )}

                  {person.organizationRoles &&
                    person.organizationRoles.length > 0 && (
                      <ActivityCard>
                        <ActivityCardTitle>조직 활동</ActivityCardTitle>
                        <ActivityList>
                          {person.organizationRoles.map((role: any) => (
                            <ActivityItem key={role.id}>
                              <ActivityDot />
                              <ActivityName>
                                {role.organization.name}
                              </ActivityName>
                              <ActivityMeta>{role.roleTitle}</ActivityMeta>
                            </ActivityItem>
                          ))}
                        </ActivityList>
                      </ActivityCard>
                    )}

                  {person.events && person.events.length > 0 && (
                    <ActivityCard>
                      <ActivityCardTitle>주요 사건</ActivityCardTitle>
                      <ActivityList>
                        {person.events.map((evt: any) => (
                          <ActivityItem key={evt.id}>
                            <ActivityDot />
                            <ActivityName>{evt.event.title}</ActivityName>
                            {evt.event.startDate && (
                              <ActivityMeta>
                                {new Date(evt.event.startDate).getFullYear()}년
                              </ActivityMeta>
                            )}
                          </ActivityItem>
                        ))}
                      </ActivityList>
                    </ActivityCard>
                  )}
                </ActivitiesGrid>
              </ActivitiesSection>
            )}
          </TabContent>
        )}

        {activeTab === 'works' && (
          <TabContent
            key="works"
            as={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <WorksSection>
              <SectionTitle>저작물</SectionTitle>
              {person.books && person.books.length > 0 ? (
                <WorksGrid>
                  {person.books.map((book: any) => (
                    <WorkCard key={book.id}>
                      <WorkTitle>{book.title}</WorkTitle>
                      {book.publishedYear && (
                        <WorkYear>{book.publishedYear}년 출판</WorkYear>
                      )}
                    </WorkCard>
                  ))}
                </WorksGrid>
              ) : (
                <EmptyWorkState>저작물 정보가 없습니다</EmptyWorkState>
              )}
            </WorksSection>
          </TabContent>
        )}
      </AnimatePresence>
    </DetailContent>
  )
}

// Styled Components
const Wrap = styled.div`
  width: 100%;
  min-height: 400px;
`

const Container = styled.div`
  max-width: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 28px;
`

const LoadingMessage = styled.div`
  text-align: center;
  padding: 80px 48px;
  font-size: 15px;
  color: #6b7280;
  font-weight: 600;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
`

const Spinner = styled.div`
  width: 52px;
  height: 52px;
  border: 4px solid #f3e8ff;
  border-top-color: #ad46ff;
  border-right-color: #ad46ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`

const FilterSection = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  margin-bottom: 24px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
`

const TopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`

const BottomRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
`

const FilterLabel = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const FilterGroup = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`

const FilterButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border: 1px solid ${({ $active }) => ($active ? '#000' : '#e5e5e5')};
  border-radius: 8px;
  background: ${({ $active }) => ($active ? '#000' : '#fff')};
  color: ${({ $active }) => ($active ? '#fff' : '#666')};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #000;
    background: ${({ $active }) => ($active ? '#000' : '#fafafa')};
  }

  svg {
    opacity: ${({ $active }) => ($active ? 1 : 0.6)};
  }
`

const FilterBadge = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-left: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  font-size: 10px;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`

const SortGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;

  @media (max-width: 768px) {
    margin-left: 0;
    width: 100%;
  }
`

const SortButton = styled.button<{ $active?: boolean }>`
  padding: 8px 16px;
  border: 1px solid ${({ $active }) => ($active ? '#000' : '#e5e5e5')};
  border-radius: 8px;
  background: ${({ $active }) => ($active ? '#000' : '#fff')};
  color: ${({ $active }) => ($active ? '#fff' : '#666')};
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #000;
    background: ${({ $active }) => ($active ? '#000' : '#fafafa')};
  }
`

const SearchWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  max-width: 400px;

  @media (max-width: 1024px) {
    max-width: 100%;
  }
`

const SearchIconStyled = styled.div`
  position: absolute;
  left: 12px;
  display: flex;
  align-items: center;
  color: #9ca3af;
  pointer-events: none;
  z-index: 1;
`

const SearchInputStyled = styled.input`
  width: 100%;
  padding: 10px 40px 10px 40px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  background: #ffffff;
  transition: all 0.2s ease;
  color: #111827;

  &:hover {
    border-color: #d1d5db;
  }

  &:focus {
    outline: none;
    border-color: #ad46ff;
    box-shadow: 0 0 0 3px rgba(173, 70, 255, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`

const ClearButtonStyled = styled.button`
  position: absolute;
  right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: #e5e7eb;
  border-radius: 50%;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #d1d5db;
    color: #111827;
  }
`

const ResultCount = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  padding: 10px 20px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }
`

const Card = styled.div`
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(173, 70, 255, 0.15);
  }
`

const CardImageWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 240px;
  overflow: hidden;
  background: #2d3748;
`

const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const CardImagePlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.4);
`

const CardContent = styled.div`
  padding: 16px 16px 20px;
  position: relative;
`

const ActionMenuWrapper = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
`

const PersonInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const PersonName = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #111827;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const PersonMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
`

const MetaBadge = styled.span<{ $type?: string }>`
  display: inline-block;
  padding: 4px 10px;
  background: #f3f4f6;
  color: #6b7280;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
`

const PersonPrice = styled.div`
  margin-top: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
`

const EmptyState = styled.div`
  text-align: center;
  padding: 100px 40px;
  background: white;
  border-radius: 20px;
  border: 2px solid #f3e8ff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
`

const EmptyIcon = styled.div`
  font-size: 72px;
  margin-bottom: 24px;
  opacity: 0.5;
`

const EmptyTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: #ad46ff;
  margin-bottom: 8px;
`

const EmptyDesc = styled.p`
  color: #9ca3af;
  font-size: 15px;
  font-weight: 500;
`

const Pagination = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 40px;
  padding: 24px;
`

const PaginationButton = styled(motion.button)<{ disabled?: boolean }>`
  padding: 12px 24px;
  border: ${({ disabled }) => (disabled ? '2px solid #f3f4f6' : 'none')};
  border-radius: 12px;
  background: ${({ disabled }) =>
    disabled ? '#fafbfc' : 'linear-gradient(135deg, #ad46ff 0%, #9146ff 100%)'};
  color: ${({ disabled }) => (disabled ? '#d1d5db' : 'white')};
  font-size: 15px;
  font-weight: 600;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${({ disabled }) =>
    disabled ? 'none' : '0 4px 12px rgba(173, 70, 255, 0.3)'};

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(173, 70, 255, 0.4);
  }
`

const PaginationInfo = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: #ad46ff;
  min-width: 100px;
  text-align: center;
  padding: 12px 20px;
  background: linear-gradient(135deg, #f3e8ff 0%, #e9d1ff 100%);
  border-radius: 12px;
  border: 2px solid rgba(173, 70, 255, 0.2);
`

// 상세 화면 스타일
const DetailSection = styled.div`
  width: 100%;
  min-height: 400px;
  position: relative;
`

const FloatingBackButton = styled.button`
  position: fixed;
  top: 100px;
  left: 20px;
  z-index: 100;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 50%;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  &:hover {
    background: #f9fafb;
    border-color: #ad46ff;
    color: #ad46ff;
    box-shadow: 0 4px 12px rgba(173, 70, 255, 0.2);
  }
`

const DetailContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

const DetailHero = styled.div`
  position: relative;
  width: 100%;
  height: 300px;
  border-radius: 16px;
  overflow: hidden;
  background: #2d3748;
`

const HeroImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const HeroPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.3);
`

const HeroOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 32px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, transparent 100%);
`

const HeroTitle = styled.h1`
  margin: 0;
  font-size: 32px;
  font-weight: 700;
  color: white;
`

const HeroSubtitle = styled.p`
  margin: 8px 0 0 0;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
`

const TabMenu = styled.div`
  display: flex;
  gap: 8px;
  border-bottom: 1px solid #f0f0f0;
  padding: 0 4px;
`

const TabButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  background: ${({ $active }) => ($active ? '#fff' : 'transparent')};
  color: ${({ $active }) => ($active ? '#111' : '#999')};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid
    ${({ $active }) => ($active ? '#000' : 'transparent')};
  transition: all 0.2s;

  &:hover {
    color: #111;
    background: #fafafa;
  }

  svg {
    opacity: ${({ $active }) => ($active ? 1 : 0.5)};
  }
`

const TabContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`

const StatCard = styled.div`
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  transition: all 0.2s;

  &:hover {
    border-color: #333;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
`

const StatLabel = styled.div`
  font-size: 13px;
  color: #666;
  font-weight: 500;
`

const StatValue = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: #111;
`

const StatSubtext = styled.div`
  font-size: 12px;
  color: #999;
  font-weight: 500;
`

const EmptyTabState = styled.div`
  text-align: center;
  padding: 80px 40px;
  background: #fafafa;
  border-radius: 16px;
  border: 1px solid #f0f0f0;
`

const EmptyTabIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  color: #ccc;
`

const EmptyTabTitle = styled.h4`
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
`

const EmptyTabDesc = styled.p`
  margin: 0;
  font-size: 14px;
  color: #999;
  font-weight: 500;
`

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`

const InfoCard = styled.div`
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const InfoCardIcon = styled.div`
  font-size: 32px;
  margin-bottom: 4px;
`

const InfoCardLabel = styled.div`
  font-size: 12px;
  color: #999;
  font-weight: 500;
`

const InfoCardValue = styled.div`
  font-size: 16px;
  color: #111;
  font-weight: 600;
`

const BiographyCard = styled.div`
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 24px;
`

const BiographyTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #111;
`

const BiographyText = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.8;
  color: #666;
`

const GenealogySection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

const FamilyGroup = styled.div`
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 24px;
`

const FamilyGroupTitle = styled.h4`
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #111;
`

const FamilyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
`

const FamilyCard = styled.div`
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const FamilyIcon = styled.div`
  width: 48px;
  height: 48px;
  background: #f5f5f5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  font-size: 20px;
  color: #666;
  font-weight: 600;
`

const FamilyName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #111;
`

const FamilyMeta = styled.div`
  font-size: 12px;
  color: #999;
  font-weight: 500;
`

const FamilyYear = styled.div`
  font-size: 12px;
  color: #666;
`

const ActivitiesSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #111;
`

const ActivitiesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
`

const ActivityCard = styled.div`
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 20px;
`

const ActivityCardTitle = styled.h4`
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #111;
`

const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const ActivityItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
`

const ActivityDot = styled.div`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ad46ff;
  flex-shrink: 0;
`

const ActivityName = styled.div`
  flex: 1;
  font-size: 14px;
  color: #333;
  font-weight: 500;
`

const ActivityMeta = styled.div`
  font-size: 12px;
  color: #999;
  font-weight: 500;
`

const WorksSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const WorksGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
`

const WorkCard = styled.div`
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const WorkIcon = styled.div`
  font-size: 32px;
  margin-bottom: 4px;
`

const WorkTitle = styled.h4`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #111;
`

const WorkYear = styled.div`
  font-size: 12px;
  color: #999;
  font-weight: 500;
`

const EmptyWorkState = styled.div`
  text-align: center;
  padding: 40px 20px;
  font-size: 14px;
  color: #999;
  background: #fafafa;
  border-radius: 12px;
`

const ErrorMessage = styled.div`
  text-align: center;
  padding: 60px 20px;
  font-size: 14px;
  color: #ef4444;
  font-weight: 500;
`
