/**
 * 인물 관리 페이지
 *
 * @description
 * 인물 데이터의 CRUD 기능을 제공하는 페이지
 * - 인물 목록 조회 + 상세 정보 표시 (통합 레이아웃)
 * - 인물 등록/수정/삭제
 * - 검색 및 필터링
 * - 데스크톱/모바일 반응형 UI
 */
import React, { useMemo, useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { FiChevronRight, FiGlobe, FiUsers } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import { useHistoricalCountries } from '@/entities/historical-country/api'
import type { Era } from '@/entities/person/api'
import { ActionMenu, type ActionMenuItem } from '@/shared/ui/action-menu'
import { CountrySelectModal } from '@/shared/ui/country-select-modal'
import { SelectModal } from '@/shared/ui/select-modal'

import { type PersonFormData, usePersonPage } from './use-person-page.hook'

/**
 * PersonPage - 인물 관리 페이지
 * - 리스트 + 상세 정보 통합 레이아웃
 * - SPA 방식의 상세 정보 표시 (페이지 리로드 없음)
 */
export default function PersonPage() {
  const navigate = useNavigate()

  const {
    // Data
    persons,
    countries,
    continents,
    religions,
    dynasties,
    jobs,
    filteredPersons,
    paginatedPersons,
    totalPages,
    isLoading,
    isError,
    error,

    // State
    editingPerson,
    isMobileListOpen,
    setIsMobileListOpen,
    searchTerm,
    setSearchTerm,
    genderFilter,
    setGenderFilter,
    countryFilter,
    setCountryFilter,
    continentFilter,
    setContinentFilter,
    sortBy,
    setSortBy,
    currentPage,
    setCurrentPage,

    // Form State
    formData,
    setFormData,
    profilePreview,
    handleProfileImageChange,

    // Modal State
    showCountryModal,
    setShowCountryModal,
    showFatherModal,
    setShowFatherModal,
    showMotherModal,
    setShowMotherModal,
    showReligionModal,
    setShowReligionModal,
    showDynastyModal,
    setShowDynastyModal,
    showJobModal,
    setShowJobModal,
    showBirthEraModal,
    setShowBirthEraModal,
    showDeathEraModal,
    setShowDeathEraModal,
    showGenderFilterModal,
    setShowGenderFilterModal,
    showCountryFilterModal,
    setShowCountryFilterModal,
    showContinentFilterModal,
    setShowContinentFilterModal,
    showSortModal,
    setShowSortModal,

    // Mutations
    deleteMutation,

    // Handlers
    handleEdit,
    handleDelete,
    handleSubmit,
  } = usePersonPage()

  const { data: historicalCountries } = useHistoricalCountries()

  // Era 옵션
  const eraOptions = [
    { value: 'BC', label: '기원전' },
    { value: 'AD', label: '기원후' },
  ]

  const hasData = persons && persons.length > 0
  const hasFilteredData = paginatedPersons && paginatedPersons.length > 0

  const dashboardStats = useMemo(() => {
    if (!persons?.length) {
      return { total: 0, male: 0, female: 0, countries: 0 }
    }
    const male = persons.filter((p) => p.gender === 'MALE').length
    const female = persons.filter((p) => p.gender === 'FEMALE').length
    const countryIds = new Set(
      persons.map((p) => p.countryId).filter(Boolean),
    ) as Set<string>
    return {
      total: persons.length,
      male,
      female,
      countries: countryIds.size,
    }
  }, [persons])

  if (isLoading) {
    return (
      <Wrap>
        <Container>
          <LoadingMessage>인물 데이터를 불러오는 중...</LoadingMessage>
        </Container>
      </Wrap>
    )
  }

  if (isError) {
    return (
      <Wrap>
        <Container>
          <ErrorState>
            <ErrorIcon>⚠️</ErrorIcon>
            <ErrorTitle>데이터를 불러올 수 없습니다</ErrorTitle>
            <ErrorDesc>
              {(error as Error)?.message || '알 수 없는 오류가 발생했습니다'}
            </ErrorDesc>
            <RetryButton onClick={() => window.location.reload()}>
              다시 시도
            </RetryButton>
          </ErrorState>
        </Container>
      </Wrap>
    )
  }

  return (
    <Wrap>
      {/* 메인 컨텐츠 */}
      <Container
        as={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* 대시보드 요약 카드 (사건 페이지 스타일) */}
        <DashboardGrid
          as={motion.div}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DashboardCard>
            <DashboardCardIcon $variant="primary">
              <FiUsers size={22} />
            </DashboardCardIcon>
            <DashboardCardContent>
              <DashboardCardTitle>총 인물</DashboardCardTitle>
              <DashboardCardCount>
                {dashboardStats.total.toLocaleString('ko-KR')}명
              </DashboardCardCount>
            </DashboardCardContent>
          </DashboardCard>
          <DashboardCard>
            <DashboardCardIcon $variant="male">
              <FiUsers size={20} />
            </DashboardCardIcon>
            <DashboardCardContent>
              <DashboardCardTitle>남성</DashboardCardTitle>
              <DashboardCardCount>
                {dashboardStats.male.toLocaleString('ko-KR')}명
              </DashboardCardCount>
            </DashboardCardContent>
          </DashboardCard>
          <DashboardCard>
            <DashboardCardIcon $variant="female">
              <FiUsers size={20} />
            </DashboardCardIcon>
            <DashboardCardContent>
              <DashboardCardTitle>여성</DashboardCardTitle>
              <DashboardCardCount>
                {dashboardStats.female.toLocaleString('ko-KR')}명
              </DashboardCardCount>
            </DashboardCardContent>
          </DashboardCard>
          <DashboardCard>
            <DashboardCardIcon $variant="country">
              <FiGlobe size={22} />
            </DashboardCardIcon>
            <DashboardCardContent>
              <DashboardCardTitle>등록 국가</DashboardCardTitle>
              <DashboardCardCount>
                {dashboardStats.countries.toLocaleString('ko-KR')}개국
              </DashboardCardCount>
            </DashboardCardContent>
          </DashboardCard>
        </DashboardGrid>

        {/* 필터 영역 (사건 페이지 스타일) */}
        <FilterSection
          as={motion.div}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <FilterSearchInput
            type="search"
            placeholder="이름 또는 약력으로 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <FilterTriggerButton
            type="button"
            onClick={() => setShowGenderFilterModal(true)}
          >
            <span>
              {genderFilter === 'ALL'
                ? '전체 성별'
                : genderFilter === 'MALE'
                  ? '남성'
                  : '여성'}
            </span>
            <FiChevronRight size={14} />
          </FilterTriggerButton>
          <FilterTriggerButton
            type="button"
            onClick={() => setShowCountryFilterModal(true)}
          >
            <span>
              {countryFilter.length === 0
                ? '전체 국가'
                : `${countryFilter.length}개국 선택`}
            </span>
            <FiChevronRight size={14} />
          </FilterTriggerButton>
          <FilterTriggerButton
            type="button"
            onClick={() => setShowContinentFilterModal(true)}
          >
            <span>
              {continentFilter === 'ALL'
                ? '전체 대륙'
                : continents?.find((c) => c.id === continentFilter)?.name ||
                  '대륙'}
            </span>
            <FiChevronRight size={14} />
          </FilterTriggerButton>
          <FilterTriggerButton
            type="button"
            onClick={() => setShowSortModal(true)}
          >
            <span>{sortBy === 'birthYear' ? '연생순' : '국가순'}</span>
            <FiChevronRight size={14} />
          </FilterTriggerButton>
          {(countryFilter.length > 0 ||
            genderFilter !== 'ALL' ||
            continentFilter !== 'ALL') && (
            <FilterResetButton
              type="button"
              onClick={() => {
                setCountryFilter([])
                setGenderFilter('ALL')
                setContinentFilter('ALL')
                setCurrentPage(1)
              }}
            >
              필터 초기화
            </FilterResetButton>
          )}
          <FilterChipsWrap>
            {genderFilter !== 'ALL' && (
              <ActiveFilterChip>
                <span>성별 · {genderFilter === 'MALE' ? '남성' : '여성'}</span>
                <button
                  type="button"
                  onClick={() => setGenderFilter('ALL')}
                  aria-label="성별 필터 해제"
                >
                  ×
                </button>
              </ActiveFilterChip>
            )}
            {countryFilter.length > 0 && (
              <ActiveFilterChip>
                <span>국가 · {countryFilter.length}개</span>
                <button
                  type="button"
                  onClick={() => setCountryFilter([])}
                  aria-label="국가 필터 해제"
                >
                  ×
                </button>
              </ActiveFilterChip>
            )}
            {continentFilter !== 'ALL' && (
              <ActiveFilterChip>
                <span>
                  대륙 ·{' '}
                  {continents?.find((c) => c.id === continentFilter)?.name ||
                    continentFilter}
                </span>
                <button
                  type="button"
                  onClick={() => setContinentFilter('ALL')}
                  aria-label="대륙 필터 해제"
                >
                  ×
                </button>
              </ActiveFilterChip>
            )}
          </FilterChipsWrap>
          <ResultCount>{filteredPersons.length}명</ResultCount>
        </FilterSection>

        <ListArea>
          {filteredPersons.length === 0 ? (
            <EmptyState
              as={motion.div}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <EmptyIcon>👤</EmptyIcon>
              <EmptyTitle>검색 결과가 없습니다</EmptyTitle>
              <EmptyDesc>
                검색어를 바꾸거나 국가·성별 필터를 해제해 보세요
              </EmptyDesc>
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

                  const birthYear = (person as { birthYear?: number }).birthYear
                  const deathYear = (person as { deathYear?: number }).deathYear

                  const formatYear = (y: number) =>
                    y.toLocaleString('ko-KR', { useGrouping: true })
                  const era = (e: string | undefined) =>
                    e === 'BC' ? 'BC' : 'AD'

                  const isAlive = birthYear != null && deathYear == null
                  const currentYear = new Date().getFullYear()
                  const currentAge =
                    isAlive && birthYear != null && person.birthEra !== 'BC'
                      ? currentYear - birthYear
                      : null

                  const isDeceased = deathYear != null
                  const lifespan =
                    birthYear != null && deathYear != null
                      ? `${era(person.birthEra)} ${formatYear(birthYear)} ~ ${era(person.deathEra)} ${formatYear(deathYear)}`
                      : birthYear != null
                        ? isAlive && currentAge != null && currentAge >= 0
                          ? `AD ${formatYear(birthYear)} ~ 생존 (${currentAge}세)`
                          : `${era(person.birthEra)} ${formatYear(birthYear)} ~`
                        : '생몰년 미상'

                  // 국가 정보
                  const personCountry = person.countryId
                    ? countries?.find(
                        (country) => country.id === person.countryId,
                      )
                    : null

                  // 직업·종교·왕조 (API 확장 필드)
                  const personJob = (person as { jobId?: string }).jobId
                    ? jobs?.find(
                        (j) => j.id === (person as { jobId?: string }).jobId,
                      )
                    : null
                  const personReligion = (person as { religionId?: string })
                    .religionId
                    ? religions?.find(
                        (r) =>
                          r.id ===
                          (person as { religionId?: string }).religionId,
                      )
                    : null
                  const personDynasty = (person as { dynastyId?: string })
                    .dynastyId
                    ? dynasties?.find(
                        (d) =>
                          d.id === (person as { dynastyId?: string }).dynastyId,
                      )
                    : null
                  const roleParts = [
                    personJob?.name,
                    personReligion?.name,
                    personDynasty?.name,
                  ].filter(Boolean) as string[]
                  const roleLabel =
                    roleParts.length > 0 ? roleParts.join(' · ') : null

                  const genderLabel =
                    person.gender === 'MALE'
                      ? '남'
                      : person.gender === 'FEMALE'
                        ? '여'
                        : null

                  // 약력 요약 (최대 3줄 분량)
                  const bioText =
                    person.biography?.replace(/\s+/g, ' ').trim() || ''
                  const bioExcerpt =
                    bioText.length > 120
                      ? `${bioText.slice(0, 120)}…`
                      : bioText || null

                  // 표시할 이미지
                  const displayImage =
                    person.profileImageUrl || personCountry?.thumbnailUrl

                  const menuItems: ActionMenuItem[] = [
                    {
                      id: 'edit',
                      label: '수정',
                      icon: '✏️',
                      onClick: () => navigate(`/persons/${person.id}/edit`),
                    },
                    {
                      id: 'delete',
                      label: '삭제',
                      icon: '🗑️',
                      onClick: () => handleDelete(person.id, fullName),
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
                        // ActionMenu 클릭은 무시
                        const actionMenu = (e.target as HTMLElement).closest(
                          '[data-action-menu]',
                        )
                        if (actionMenu) {
                          return
                        }

                        // react-router navigate로 상세 페이지 이동 (SPA 방식)
                        navigate(`/persons/${person.id}`)
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
                          <CardTitleRow>
                            <PersonName>{fullName}</PersonName>
                            {genderLabel && (
                              <CardGender>{genderLabel}</CardGender>
                            )}
                          </CardTitleRow>
                          <PersonLifespan>
                            {isDeceased && (
                              <TombstoneIcon aria-hidden>🪦</TombstoneIcon>
                            )}
                            {lifespan}
                          </PersonLifespan>
                          {personCountry && (
                            <CardMetaRow>
                              <MetaBadge $type="country">
                                {'flagEmoji' in personCountry &&
                                personCountry.flagEmoji
                                  ? `${personCountry.flagEmoji} `
                                  : ''}
                                {personCountry.name}
                              </MetaBadge>
                            </CardMetaRow>
                          )}
                          {roleLabel && <CardRole>{roleLabel}</CardRole>}
                          {bioExcerpt && <CardBio>{bioExcerpt}</CardBio>}
                        </PersonInfo>
                      </CardContent>

                      {/* ActionMenu - 이벤트 전파 중지 */}
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
                    이전
                  </PaginationButton>

                  <PaginationInfo>
                    {currentPage} / {totalPages}페이지
                  </PaginationInfo>

                  <PaginationButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    다음
                  </PaginationButton>
                </Pagination>
              )}
            </>
          )}
        </ListArea>
      </Container>

      {/* 플로팅 + 버튼 (등록 페이지로 이동) */}
      <FloatingButton
        as={motion.button}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/persons/create')}
        title="인물 등록"
      >
        +
      </FloatingButton>

      {/* 사이드바 제거됨 - 이제 /persons/create 페이지 사용 */}
      {false && (
        <>
          <Form
            id="person-form-deprecated"
            onSubmit={(e) => {
              e.preventDefault()
            }}
          >
            {/* 프로필 이미지 */}
            <ProfileImageSection>
              <ProfileImagePreviewArea>
                {profilePreview ? (
                  <ProfileImagePreview
                    src={profilePreview}
                    alt="프로필 미리보기"
                  />
                ) : (
                  <ProfileImagePlaceholder>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                        fill="currentColor"
                      />
                    </svg>
                  </ProfileImagePlaceholder>
                )}
              </ProfileImagePreviewArea>
              <ProfileImageUploadLabel htmlFor="profile-image-upload">
                <ProfileImageUploadIcon>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
                      fill="currentColor"
                    />
                  </svg>
                </ProfileImageUploadIcon>
                <ProfileImageUploadText>
                  프로필 이미지 선택
                </ProfileImageUploadText>
              </ProfileImageUploadLabel>
              <ProfileImageFileInput
                id="profile-image-upload"
                type="file"
                accept="image/*"
                onChange={handleProfileImageChange}
              />
            </ProfileImageSection>

            {/* 기본 정보 */}
            <FormSection>
              <FormSectionHeader>
                <FormSectionIcon>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
                      fill="currentColor"
                    />
                  </svg>
                </FormSectionIcon>
                <div>
                  <FormSectionTitle>기본 정보</FormSectionTitle>
                  <FormSectionDescription>
                    인물의 이름, 성별을 입력하세요
                  </FormSectionDescription>
                </div>
              </FormSectionHeader>
              <FormRow>
                <FormField>
                  <FormLabel>
                    이름 <RequiredStar>*</RequiredStar>
                  </FormLabel>
                  <FormInput
                    value={formData.name || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="예: 홍길동"
                  />
                </FormField>
                <FormField>
                  <FormLabel>성(姓)</FormLabel>
                  <FormInput
                    value={formData.surname || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, surname: e.target.value })
                    }
                    placeholder="예: 김"
                  />
                </FormField>
              </FormRow>
              <FormRow>
                <FormField>
                  <FormLabel>성별</FormLabel>
                  <Select
                    value={formData.gender || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gender: e.target.value || undefined,
                      })
                    }
                  >
                    <option value="">선택 안함</option>
                    <option value="MALE">남성</option>
                    <option value="FEMALE">여성</option>
                    <option value="OTHER">기타</option>
                  </Select>
                </FormField>
              </FormRow>

              {/* 생애 정보 */}
              <FormSection style={{ marginTop: '24px' }}>
                <FormSectionHeader>
                  <FormSectionIcon>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V6c0-1.1-.89-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5z"
                        fill="currentColor"
                      />
                    </svg>
                  </FormSectionIcon>
                  <div>
                    <FormSectionTitle>생애 정보</FormSectionTitle>
                    <FormSectionDescription>
                      출생과 사망 시점을 입력하세요 (선택사항)
                    </FormSectionDescription>
                  </div>
                </FormSectionHeader>

                {/* 출생 시점 */}
                <div
                  style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '16px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '16px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#111827',
                      }}
                    >
                      📅 출생 시점
                    </span>
                    <span
                      style={{
                        fontSize: '13px',
                        color: '#6b7280',
                        fontWeight: '400',
                      }}
                    >
                      (선택)
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '100px 1fr',
                      gap: '12px',
                    }}
                  >
                    {/* 기원 선택 */}
                    <div>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#6b7280',
                          marginBottom: '6px',
                          height: '18px',
                        }}
                      >
                        기원
                      </div>
                      <EraSelectButton
                        type="button"
                        onClick={() => setShowBirthEraModal(true)}
                        $hasValue={!!formData.birthEra}
                        style={{
                          width: '100%',
                          fontSize: '15px',
                          fontWeight: '600',
                          height: '44px',
                        }}
                      >
                        <span>
                          {formData.birthEra === 'BC' ? '기원전' : '기원후'}
                        </span>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path d="M7 10l5 5 5-5H7z" fill="currentColor" />
                        </svg>
                      </EraSelectButton>
                    </div>

                    {/* 년월일 입력 */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 80px 80px',
                        gap: '8px',
                      }}
                    >
                      {/* 년 */}
                      <div>
                        <div
                          style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#6b7280',
                            marginBottom: '6px',
                            height: '18px',
                          }}
                        >
                          년
                        </div>
                        <FormInput
                          type="number"
                          value={formData.birthYear || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              birthYear: e.target.value
                                ? parseInt(e.target.value)
                                : undefined,
                            })
                          }
                          placeholder="1392"
                          style={{
                            width: '100%',
                            fontSize: '15px',
                            height: '44px',
                            borderRadius: '8px',
                            fontWeight: '500',
                          }}
                        />
                      </div>

                      {/* 월 */}
                      <div>
                        <div
                          style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#6b7280',
                            marginBottom: '6px',
                            height: '18px',
                          }}
                        >
                          월
                        </div>
                        <FormInput
                          type="number"
                          value={formData.birthMonth || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              birthMonth: e.target.value
                                ? parseInt(e.target.value)
                                : undefined,
                            })
                          }
                          placeholder="7"
                          min="1"
                          max="12"
                          style={{
                            width: '100%',
                            fontSize: '15px',
                            height: '44px',
                            borderRadius: '8px',
                            textAlign: 'center',
                            fontWeight: '500',
                          }}
                        />
                      </div>

                      {/* 일 */}
                      <div>
                        <div
                          style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#6b7280',
                            marginBottom: '6px',
                            height: '18px',
                          }}
                        >
                          일
                        </div>
                        <FormInput
                          type="number"
                          value={formData.birthDay || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              birthDay: e.target.value
                                ? parseInt(e.target.value)
                                : undefined,
                            })
                          }
                          placeholder="17"
                          min="1"
                          max="31"
                          style={{
                            width: '100%',
                            fontSize: '15px',
                            height: '44px',
                            borderRadius: '8px',
                            textAlign: 'center',
                            fontWeight: '500',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 사망 시점 */}
                <div
                  style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '20px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '16px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#111827',
                      }}
                    >
                      🏁 사망 시점
                    </span>
                    <span
                      style={{
                        fontSize: '13px',
                        color: '#6b7280',
                        fontWeight: '400',
                      }}
                    >
                      (선택)
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '100px 1fr',
                      gap: '12px',
                    }}
                  >
                    {/* 기원 선택 */}
                    <div>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#6b7280',
                          marginBottom: '6px',
                          height: '18px',
                        }}
                      >
                        기원
                      </div>
                      <EraSelectButton
                        type="button"
                        onClick={() => setShowDeathEraModal(true)}
                        $hasValue={!!formData.deathEra}
                        style={{
                          width: '100%',
                          fontSize: '15px',
                          fontWeight: '600',
                          height: '44px',
                        }}
                      >
                        <span>
                          {formData.deathEra === 'BC' ? '기원전' : '기원후'}
                        </span>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path d="M7 10l5 5 5-5H7z" fill="currentColor" />
                        </svg>
                      </EraSelectButton>
                    </div>

                    {/* 년월일 입력 */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 80px 80px',
                        gap: '8px',
                      }}
                    >
                      {/* 년 */}
                      <div>
                        <div
                          style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#6b7280',
                            marginBottom: '6px',
                            height: '18px',
                          }}
                        >
                          년
                        </div>
                        <FormInput
                          type="number"
                          value={formData.deathYear || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              deathYear: e.target.value
                                ? parseInt(e.target.value)
                                : undefined,
                            })
                          }
                          placeholder="1897"
                          style={{
                            width: '100%',
                            fontSize: '15px',
                            height: '44px',
                            borderRadius: '8px',
                            fontWeight: '500',
                          }}
                        />
                      </div>

                      {/* 월 */}
                      <div>
                        <div
                          style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#6b7280',
                            marginBottom: '6px',
                            height: '18px',
                          }}
                        >
                          월
                        </div>
                        <FormInput
                          type="number"
                          value={formData.deathMonth || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              deathMonth: e.target.value
                                ? parseInt(e.target.value)
                                : undefined,
                            })
                          }
                          placeholder="10"
                          min="1"
                          max="12"
                          style={{
                            width: '100%',
                            fontSize: '15px',
                            height: '44px',
                            borderRadius: '8px',
                            textAlign: 'center',
                            fontWeight: '500',
                          }}
                        />
                      </div>

                      {/* 일 */}
                      <div>
                        <div
                          style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#6b7280',
                            marginBottom: '6px',
                            height: '18px',
                          }}
                        >
                          일
                        </div>
                        <FormInput
                          type="number"
                          value={formData.deathDay || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              deathDay: e.target.value
                                ? parseInt(e.target.value)
                                : undefined,
                            })
                          }
                          placeholder="12"
                          min="1"
                          max="31"
                          style={{
                            width: '100%',
                            fontSize: '15px',
                            height: '44px',
                            borderRadius: '8px',
                            textAlign: 'center',
                            fontWeight: '500',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </FormSection>
            </FormSection>

            {/* 소속 정보 */}
            <FormSection>
              <SectionTitle>소속 정보</SectionTitle>
              <FormGroup>
                <Label>가문</Label>
                <SelectButton
                  type="button"
                  onClick={() => setShowDynastyModal(true)}
                  $hasValue={!!formData.dynastyId}
                >
                  {formData.dynastyId
                    ? dynasties?.find(
                        (dynasty: unknown) =>
                          (dynasty as { id: string; name: string }).id ===
                          formData.dynastyId,
                      )?.name || '선택된 가문'
                    : '가문 선택'}
                </SelectButton>
                {formData.dynastyId && (
                  <SelectClearButton
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, dynastyId: undefined })
                    }
                  >
                    ✕ 선택 해제
                  </SelectClearButton>
                )}
              </FormGroup>
              <FormGroup>
                <Label>종교</Label>
                <SelectButton
                  type="button"
                  onClick={() => setShowReligionModal(true)}
                  $hasValue={!!formData.religionId}
                >
                  {formData.religionId
                    ? religions?.find(
                        (religion) => religion.id === formData.religionId,
                      )?.name || '선택된 종교'
                    : '종교 선택'}
                </SelectButton>
                {formData.religionId && (
                  <SelectClearButton
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, religionId: undefined })
                    }
                  >
                    ✕ 선택 해제
                  </SelectClearButton>
                )}
              </FormGroup>
              <FormGroup>
                <Label>직업</Label>
                <SelectButton
                  type="button"
                  onClick={() => setShowJobModal(true)}
                  $hasValue={!!formData.jobId}
                >
                  {formData.jobId
                    ? jobs?.find(
                        (jobItem: unknown) =>
                          (jobItem as { id: string; title: string }).id ===
                          formData.jobId,
                      )?.title || '선택된 직업'
                    : '직업 선택'}
                </SelectButton>
                {formData.jobId && (
                  <SelectClearButton
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, jobId: undefined })
                    }
                  >
                    ✕ 선택 해제
                  </SelectClearButton>
                )}
              </FormGroup>
              <FormGroup>
                <Label>국가</Label>
                <SelectButton
                  type="button"
                  onClick={() => setShowCountryModal(true)}
                  $hasValue={!!formData.countryId}
                >
                  {formData.countryId
                    ? countries?.find(
                        (country) => country.id === formData.countryId,
                      )?.name || '선택된 국가'
                    : '국가 선택'}
                </SelectButton>
                {formData.countryId && (
                  <SelectClearButton
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, countryId: undefined })
                    }
                  >
                    ✕ 선택 해제
                  </SelectClearButton>
                )}
              </FormGroup>
            </FormSection>

            {/* 가족 관계 */}
            <FormSection>
              <SectionTitle>가족 관계</SectionTitle>
              <FormGroup>
                <Label>부친</Label>
                <SelectButton
                  type="button"
                  onClick={() => setShowFatherModal(true)}
                  $hasValue={!!formData.fatherId}
                >
                  {formData.fatherId
                    ? (() => {
                        const father = persons?.find(
                          (p) => p.id === formData.fatherId,
                        )
                        return father
                          ? father.surname
                            ? `${father.surname} ${father.name}`
                            : father.name
                          : '선택된 부친'
                      })()
                    : '부친 선택'}
                </SelectButton>
                {formData.fatherId && (
                  <SelectClearButton
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, fatherId: undefined })
                    }
                  >
                    ✕ 선택 해제
                  </SelectClearButton>
                )}
              </FormGroup>
              <FormGroup>
                <Label>모친</Label>
                <SelectButton
                  type="button"
                  onClick={() => setShowMotherModal(true)}
                  $hasValue={!!formData.motherId}
                >
                  {formData.motherId
                    ? (() => {
                        const mother = persons?.find(
                          (p) => p.id === formData.motherId,
                        )
                        return mother
                          ? mother.surname
                            ? `${mother.surname} ${mother.name}`
                            : mother.name
                          : '선택된 모친'
                      })()
                    : '모친 선택'}
                </SelectButton>
                {formData.motherId && (
                  <SelectClearButton
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, motherId: undefined })
                    }
                  >
                    ✕ 선택 해제
                  </SelectClearButton>
                )}
              </FormGroup>
            </FormSection>

            {/* 추가 정보 */}
            <FormSection>
              <SectionTitle>추가 정보</SectionTitle>
              <FormGroup>
                <Label>프로필 이미지 URL</Label>
                <FormInput
                  value={formData.profileImageUrl || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      profileImageUrl: e.target.value,
                    })
                  }
                  placeholder="https://example.com/image.jpg"
                />
              </FormGroup>
              <FormGroup>
                <Label>약력</Label>
                <Textarea
                  value={formData.biography || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, biography: e.target.value })
                  }
                  placeholder="인물에 대한 설명을 입력하세요"
                  rows={5}
                />
              </FormGroup>
            </FormSection>
          </Form>
        </>
      )}

      {/* 국가 선택 모달 */}
      <SelectModal
        isOpen={showCountryModal}
        onClose={() => setShowCountryModal(false)}
        title="국가 선택"
        options={
          countries?.map((country) => ({
            value: country.id,
            label: country.name,
          })) || []
        }
        selectedValue={formData.countryId}
        onSelect={(id) => {
          setFormData({ ...formData, countryId: id })
          setShowCountryModal(false)
        }}
      />

      {/* 부친 선택 모달 */}
      <SelectModal
        isOpen={showFatherModal}
        onClose={() => setShowFatherModal(false)}
        title="부친 선택"
        options={
          persons
            ?.filter((person) => person.id !== editingPerson?.id)
            .map((person) => ({
              value: person.id,
              label: person.surname
                ? `${person.surname} ${person.name}`
                : person.name,
            })) || []
        }
        selectedValue={formData.fatherId}
        onSelect={(id) => {
          setFormData({ ...formData, fatherId: id })
          setShowFatherModal(false)
        }}
      />

      {/* 모친 선택 모달 */}
      <SelectModal
        isOpen={showMotherModal}
        onClose={() => setShowMotherModal(false)}
        title="모친 선택"
        options={
          persons
            ?.filter((person) => person.id !== editingPerson?.id)
            .map((person) => ({
              value: person.id,
              label: person.surname
                ? `${person.surname} ${person.name}`
                : person.name,
            })) || []
        }
        selectedValue={formData.motherId}
        onSelect={(id) => {
          setFormData({ ...formData, motherId: id })
          setShowMotherModal(false)
        }}
      />

      {/* 종교 선택 모달 */}
      <SelectModal
        isOpen={showReligionModal}
        onClose={() => setShowReligionModal(false)}
        title="종교 선택"
        options={
          religions?.map((religion) => ({
            value: religion.id,
            label: religion.name,
          })) || []
        }
        selectedValue={formData.religionId}
        onSelect={(id) => {
          setFormData({ ...formData, religionId: id })
          setShowReligionModal(false)
        }}
      />

      {/* 가문 선택 모달 */}
      <SelectModal
        isOpen={showDynastyModal}
        onClose={() => setShowDynastyModal(false)}
        title="가문 선택"
        options={
          dynasties?.map((dynasty: unknown) => {
            const dynastyItem = dynasty as { id: string; name: string }
            return {
              value: dynastyItem.id,
              label: dynastyItem.name,
            }
          }) || []
        }
        selectedValue={formData.dynastyId}
        onSelect={(id) => {
          setFormData({ ...formData, dynastyId: id })
          setShowDynastyModal(false)
        }}
      />

      {/* 직업 선택 모달 */}
      <SelectModal
        isOpen={showJobModal}
        onClose={() => setShowJobModal(false)}
        title="직업 선택"
        options={
          jobs?.map((job: unknown) => {
            const jobItem = job as { id: string; title: string }
            return {
              value: jobItem.id,
              label: jobItem.title,
            }
          }) || []
        }
        selectedValue={formData.jobId}
        onSelect={(id) => {
          setFormData({ ...formData, jobId: id })
          setShowJobModal(false)
        }}
      />

      {/* 필터: 성별 선택 모달 */}
      <SelectModal
        isOpen={showGenderFilterModal}
        onClose={() => setShowGenderFilterModal(false)}
        title="성별 필터"
        options={[
          { value: 'ALL', label: '전체' },
          { value: 'MALE', label: '남성' },
          { value: 'FEMALE', label: '여성' },
        ]}
        selectedValue={genderFilter}
        onSelect={(value) => {
          setGenderFilter(value)
          setShowGenderFilterModal(false)
        }}
      />

      {/* 필터: 정렬 선택 모달 */}
      <SelectModal
        isOpen={showSortModal}
        onClose={() => setShowSortModal(false)}
        title="정렬 기준"
        options={[
          { value: 'birthYear', label: '연생순' },
          { value: 'countryName', label: '국가 이름순' },
        ]}
        selectedValue={sortBy}
        onSelect={(value: 'birthYear' | 'countryName') => {
          setSortBy(value)
          setShowSortModal(false)
        }}
      />

      {/* 필터: 대륙 선택 모달 */}
      <SelectModal
        isOpen={showContinentFilterModal}
        onClose={() => setShowContinentFilterModal(false)}
        title="대륙 필터"
        options={[
          { value: 'ALL', label: '전체' },
          ...(continents?.map((continent) => ({
            value: continent.id,
            label: continent.name,
          })) || []),
        ]}
        selectedValue={continentFilter}
        onSelect={(value) => {
          setContinentFilter(value)
          setShowContinentFilterModal(false)
        }}
      />

      {/* 필터: 국가 선택 모달 (사건 등록 페이지와 동일) */}
      <CountrySelectModal
        isOpen={showCountryFilterModal}
        onClose={() => setShowCountryFilterModal(false)}
        title="국가 필터"
        multiSelect
        selectedCountryIds={countryFilter}
        onSelect={({ id }) => {
          setCountryFilter((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
          )
        }}
        modernCountries={countries || []}
        historicalCountries={historicalCountries || []}
      />

      {/* 출생 기원 선택 모달 */}
      <SelectModal
        isOpen={showBirthEraModal}
        onClose={() => setShowBirthEraModal(false)}
        title="출생 기원 선택"
        options={eraOptions}
        selectedValue={formData.birthEra}
        onSelect={(era) => {
          setFormData({ ...formData, birthEra: era as Era })
          setShowBirthEraModal(false)
        }}
      />

      {/* 사망 기원 선택 모달 */}
      <SelectModal
        isOpen={showDeathEraModal}
        onClose={() => setShowDeathEraModal(false)}
        title="사망 기원 선택"
        options={eraOptions}
        selectedValue={formData.deathEra}
        onSelect={(era) => {
          setFormData({ ...formData, deathEra: era as Era })
          setShowDeathEraModal(false)
        }}
      />
    </Wrap>
  )
}

// 사건 페이지와 동일한 테마 색상
const THEME = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  primaryLight: 'rgba(99, 102, 241, 0.12)',
  border: 'rgba(20, 19, 34, 0.08)',
  borderLight: 'rgba(99, 102, 241, 0.12)',
  background: {
    white: '#ffffff',
    light: '#f8fafc',
    gradient: 'linear-gradient(180deg, #fafbff 0%, #ffffff 100%)',
  },
} as const

// Styled Components
const Wrap = styled.div`
  width: 100%;
  min-height: 100vh;
  background: ${THEME.background.gradient};
  padding-top: var(--header-height, 64px);
  padding-bottom: 60px;
  position: relative;
`

const Container = styled.div`
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 20px 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: relative;
  z-index: 1;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 16px;
    gap: 20px;
  }
`

const LoadingMessage = styled.div`
  text-align: center;
  padding: 80px 32px;
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;

  &::before {
    content: '';
    width: 40px;
    height: 40px;
    border: 3px solid #e2e8f0;
    border-top-color: #64748b;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`

const ErrorState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 32px;
  text-align: center;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #fecaca;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
`

const ErrorIcon = styled.div`
  font-size: 40px;
  margin-bottom: 16px;
`

const ErrorTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #b91c1c;
  letter-spacing: -0.02em;
`

const ErrorDesc = styled.p`
  margin: 0 0 24px 0;
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
  max-width: 420px;
  line-height: 1.7;
`

const RetryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.9) 0%,
    rgba(79, 70, 229, 0.9) 100%
  );
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.3);
  }
`

const FloatingButton = styled.button`
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.95) 0%,
    rgba(79, 70, 229, 0.95) 100%
  );
  color: #fff;
  font-size: 1.75rem;
  font-weight: 300;
  line-height: 1;
  border: 1.5px solid rgba(99, 102, 241, 0.3);
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.35);
  z-index: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
  }

  @media (max-width: 1024px) {
    right: 16px;
    bottom: 80px;
    width: 52px;
    height: 52px;
    font-size: 1.5rem;
  }
`

// 대시보드 카드 (깔끔한 플랫 스타일, 그림자 없음)
const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 10px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 8px;
  }
`

const DashboardCard = styled.div`
  border-radius: 12px;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  background: #ffffff;
  border: 1px solid rgba(203, 213, 225, 0.6);
  transition:
    border-color 0.2s ease,
    background 0.2s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.25);
    background: #fafbff;
  }

  @media (max-width: 768px) {
    padding: 12px 14px;
    gap: 12px;
  }
`

const DashboardCardIcon = styled.div<{
  $variant?: 'primary' | 'male' | 'female' | 'country'
}>`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: ${({ $variant }) => {
    switch ($variant) {
      case 'male':
        return 'rgba(59, 130, 246, 0.1)'
      case 'female':
        return 'rgba(236, 72, 153, 0.1)'
      case 'country':
        return 'rgba(34, 197, 94, 0.1)'
      default:
        return 'rgba(99, 102, 241, 0.1)'
    }
  }};
  color: ${({ $variant }) => {
    switch ($variant) {
      case 'male':
        return '#2563eb'
      case 'female':
        return '#db2777'
      case 'country':
        return '#16a34a'
      default:
        return '#4f46e5'
    }
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: 40px;
    height: 40px;
  }
`

const DashboardCardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
`

const DashboardCardTitle = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.03em;
  text-transform: uppercase;
`

const DashboardCardCount = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;

  @media (max-width: 768px) {
    font-size: 15px;
  }
`

// 필터 영역 (그림자 없음, 대시보드와 간격 축소)
const FilterSection = styled(motion.div)`
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background: #ffffff;
  border: 1px solid rgba(203, 213, 225, 0.6);
  border-radius: 12px;
  margin-bottom: 10px;
  flex-wrap: wrap;
  align-items: center;

  @media (max-width: 768px) {
    padding: 10px 14px;
    gap: 10px;
    margin-bottom: 8px;
  }
`

const FilterSearchInput = styled.input`
  border: 1.5px solid rgba(203, 213, 225, 0.6);
  border-radius: 10px;
  padding: 9px 14px 9px 36px;
  font-size: 13px;
  background: #f8fafc
    url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="%2364748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Ccircle cx="11" cy="11" r="8"/%3E%3Cline x1="21" y1="21" x2="16.65" y2="16.65"/%3E%3C/svg%3E')
    no-repeat 12px 50%;
  background-size: 14px;
  color: #0f172a;
  transition: all 0.2s ease;
  min-width: 200px;
  max-width: 300px;

  &::placeholder {
    color: #94a3b8;
    font-size: 12px;
  }

  &:hover {
    background-color: #ffffff;
    border-color: rgba(99, 102, 241, 0.2);
  }

  &:focus {
    outline: none;
    background-color: #ffffff;
    border-color: #6366f1;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
  }
`

const FilterTriggerButton = styled.button`
  border: 1.5px solid rgba(203, 213, 225, 0.6);
  border-radius: 10px;
  padding: 8px 12px;
  background: #f8fafc;
  color: #1e293b;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;

  svg {
    color: #6366f1;
    flex-shrink: 0;
    transition: all 0.2s ease;
  }

  &:hover {
    border-color: rgba(99, 102, 241, 0.3);
    background: linear-gradient(
      135deg,
      #ffffff 0%,
      rgba(249, 250, 251, 1) 100%
    );
    box-shadow: 0 2px 6px rgba(99, 102, 241, 0.1);

    svg {
      transform: translateX(2px);
    }
  }

  &:focus {
    outline: none;
    border-color: rgba(99, 102, 241, 0.5);
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
  }
`

const FilterResetButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1.5px solid rgba(239, 68, 68, 0.3);
  border-radius: 10px;
  padding: 9px 14px;
  background: rgba(239, 68, 68, 0.05);
  color: #ef4444;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.4);
  }
`

const FilterChipsWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
  min-width: 0;
`

const ActiveFilterChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px 5px 12px;
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
  border: 1px solid rgba(99, 102, 241, 0.25);
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  color: #4f46e5;

  span {
    white-space: nowrap;
  }

  button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    background: rgba(99, 102, 241, 0.15);
    border: none;
    border-radius: 50%;
    color: #6366f1;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 14px;
    line-height: 1;

    &:hover {
      background: rgba(99, 102, 241, 0.25);
      color: #4f46e5;
    }
  }
`

const ResultCount = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #4f46e5;
  white-space: nowrap;
  margin-left: auto;
  padding: 6px 12px;
  background: rgba(99, 102, 241, 0.08);
  border-radius: 999px;
`

const ListArea = styled.div`
  width: 100%;
  min-width: 0;
  padding: 0 16px;
  box-sizing: border-box;

  @media (min-width: 1200px) {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 32px;
  }

  @media (max-width: 768px) {
    padding: 0 12px;
  }
`

const Grid = styled.div`
  display: grid;
  width: 100%;
  min-width: 0;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 24px;
  margin-top: 4px;

  @media (min-width: 900px) {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }

  @media (min-width: 1200px) {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 28px;
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`

const Card = styled.div`
  background: #fff;
  border-radius: 12px;
  padding: 0;
  border: 1.5px solid ${THEME.border};
  transition:
    box-shadow 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
  position: relative;
  cursor: pointer;
  overflow: hidden;
  &:hover {
    border-color: ${THEME.borderLight};
    transform: translateY(-2px);
  }
`

const CardImageWrapper = styled.div`
  width: 100%;
  aspect-ratio: 4 / 3;
  max-height: 240px;
  position: relative;
  overflow: hidden;
  background: #f1f5f9;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      transparent 50%,
      rgba(0, 0, 0, 0.03) 100%
    );
    pointer-events: none;
  }
`

const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  transition: transform 0.4s ease;

  ${Card}:hover & {
    transform: scale(1.03);
  }
`

const CardImagePlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e2e8f0;
  color: #94a3b8;

  svg {
    width: 56px;
    height: 56px;
    opacity: 0.6;
  }
`

const CardContent = styled.div`
  padding: 18px 18px 20px;
  position: relative;
`

const ActionMenuWrapper = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
  opacity: 0.4;
  transition: opacity 0.2s ease;

  ${Card}:hover & {
    opacity: 1;
  }
`

const PersonInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`

const CardTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const PersonName = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  letter-spacing: -0.02em;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const CardGender = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  flex-shrink: 0;
`

const PersonLifespan = styled.div`
  margin: 2px 0 0 0;
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  letter-spacing: 0.02em;
  line-height: 1.4;
  display: flex;
  align-items: center;
  gap: 6px;
`

const TombstoneIcon = styled.span`
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
`

const CardMetaRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
`

const MetaBadge = styled.span<{ $type?: 'country' }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: #f1f5f9;
  color: #475569;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
`

const CardRole = styled.span`
  display: block;
  margin-top: 6px;
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
  letter-spacing: 0.01em;
`

const CardBio = styled.p`
  margin: 8px 0 0 0;
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const EmptyState = styled.div`
  text-align: center;
  padding: 80px 32px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
`

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.4;
`

const EmptyTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #334155;
  margin: 0 0 6px 0;
  letter-spacing: -0.02em;
`

const EmptyDesc = styled.p`
  margin: 0;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
`

// 페이징 스타일
const Pagination = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 32px;
  padding: 20px;
`

const PaginationButton = styled(motion.button)<{ disabled?: boolean }>`
  padding: 10px 20px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: ${({ disabled }) => (disabled ? '#f1f5f9' : '#fff')};
  color: ${({ disabled }) => (disabled ? '#94a3b8' : '#475569')};
  font-size: 14px;
  font-weight: 600;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;

  &:hover:not(:disabled) {
    background: #f8fafc;
    border-color: #cbd5e1;
    color: #0f172a;
  }
`

const PaginationInfo = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  min-width: 80px;
  text-align: center;
`

// Form Styles (계속)
const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0;
`

const FormSection = styled.div`
  padding: 24px 0;
  border-bottom: 1px solid #f0f0f0;

  &:first-child {
    padding-top: 0;
  }

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
`

const FormSectionHeader = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  align-items: flex-start;
`

const FormSectionIcon = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25);
`

const FormSectionTitle = styled.h4`
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 700;
  color: #202124;
`

const FormSectionDescription = styled.p`
  margin: 0;
  font-size: 13px;
  color: #5f6368;
  line-height: 1.4;
`

const FormRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const FormLabel = styled.label`
  font-size: 14px;
  font-weight: 600;
  color: #202124;
  display: flex;
  align-items: center;
  gap: 4px;
`

const RequiredStar = styled.span`
  color: #d93025;
  font-weight: 700;
`

const RequiredFieldsNotice = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: #fff3e0;
  border: 1px solid #ffe0b2;
  border-radius: 8px;
  margin-top: 12px;
`

const RequiredFieldsIcon = styled.div`
  font-size: 20px;
  line-height: 1;
  flex-shrink: 0;
`

const RequiredFieldsText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #e65100;
`

const RequiredFieldsTitle = styled.div`
  font-weight: 600;
`

const RequiredFieldsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
`

const RequiredFieldItem = styled.span<{ $completed?: boolean }>`
  color: ${({ $completed }) => ($completed ? '#2e7d32' : '#d84315')};
  font-weight: ${({ $completed }) => ($completed ? '600' : '500')};
  text-decoration: ${({ $completed }) =>
    $completed ? 'line-through' : 'none'};
  opacity: ${({ $completed }) => ($completed ? 0.7 : 1)};
`

const SectionTitle = styled.h4`
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 700;
  color: #667eea;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
`

const Label = styled.label`
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
`

const Select = styled.select`
  border: 1px solid #dadce0;
  border-radius: 10px;
  padding: 14px 16px;
  background: #ffffff;
  color: #202124;
  font-size: 15px;
  line-height: 1.5;
  font-weight: 400;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(173, 70, 255, 0.1);
  }

  &:hover:not(:focus) {
    border-color: #bdc1c6;
  }
`

const DateRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`

const EraSelectButton = styled.button<{ $hasValue?: boolean }>`
  width: 110px;
  flex-shrink: 0;
  border: 1px solid #dadce0;
  border-radius: 10px;
  padding: 14px 12px;
  background: #ffffff;
  color: #202124;
  font-size: 15px;
  font-weight: 600;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(173, 70, 255, 0.1);
  }

  &:hover:not(:focus) {
    border-color: #bdc1c6;
    background: #f8f9fa;
  }
`

const ProfileImageSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px 0;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 8px;
`

const ProfileImagePreviewArea = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid #e0e0e0;
`

const ProfileImagePreview = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const ProfileImagePlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
  color: #9e9e9e;
`

const ProfileImageUploadLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  }
`

const ProfileImageUploadIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`

const ProfileImageUploadText = styled.span`
  font-size: 14px;
`

const ProfileImageFileInput = styled.input`
  display: none;
`

const Textarea = styled.textarea`
  border: 1px solid #dadce0;
  border-radius: 10px;
  padding: 14px 16px;
  background: #ffffff;
  color: #202124;
  font-size: 15px;
  line-height: 1.5;
  font-weight: 400;
  font-family: inherit;
  resize: vertical;
  min-height: 100px;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;

  &::placeholder {
    color: #9aa0a6;
  }

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(173, 70, 255, 0.1);
  }

  &:hover:not(:focus) {
    border-color: #bdc1c6;
  }
`

const SelectButton = styled.button<{ $hasValue?: boolean }>`
  width: 100%;
  padding: 14px 16px;
  background: #ffffff;
  border: 1px solid ${({ $hasValue }) => ($hasValue ? '#667eea' : '#dadce0')};
  border-radius: 10px;
  text-align: left;
  font-size: 15px;
  color: ${({ $hasValue }) => ($hasValue ? '#202124' : '#9aa0a6')};
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: ${({ $hasValue }) => ($hasValue ? '#5568d3' : '#bdc1c6')};
  }

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(173, 70, 255, 0.1);
  }
`

const SelectClearButton = styled.button`
  margin-top: 0.5rem;
  padding: 8px 12px;
  background: #f5f5f5;
  border: 1px solid #dadce0;
  border-radius: 6px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: #e8e8e8;
    border-color: #bdc1c6;
  }
`
