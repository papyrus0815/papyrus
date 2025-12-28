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
import React, { useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import type { Era } from '@/entities/person/api'
import { ActionMenu, type ActionMenuItem } from '@/shared/ui/action-menu'
import { FormInput } from '@/shared/ui/form-input'
import { FormSidePanel } from '@/shared/ui/form-side-panel'
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
    showSidebar,
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
    handleOpenCreate,
    handleCloseSidebar,
  } = usePersonPage()

  // Era 옵션
  const eraOptions = [
    { value: 'BC', label: '기원전' },
    { value: 'AD', label: '기원후' },
  ]

  const hasData = persons && persons.length > 0
  const hasFilteredData = paginatedPersons && paginatedPersons.length > 0

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
        {/* 검색 및 필터 영역 */}
        <FilterSection
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <FilterLeft>
            <FilterIconButton
              type="button"
              onClick={() => setShowCountryFilterModal(true)}
              $active={countryFilter.length > 0}
              title="국가 필터"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"
                  fill="currentColor"
                />
              </svg>
              {countryFilter.length > 0 && (
                <FilterBadge>{countryFilter.length}</FilterBadge>
              )}
            </FilterIconButton>

            <SortByText>Sort By:</SortByText>
            <SortButton
              type="button"
              onClick={() => setShowSortModal(true)}
              $active={sortBy !== 'birthYear'}
            >
              {sortBy === 'birthYear' ? 'Bestseller' : 'Country Name'}
            </SortButton>
          </FilterLeft>

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
              placeholder="Search..."
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
            <EmptyDesc>다른 검색어나 필터를 사용해보세요</EmptyDesc>
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

                // 국가 정보 가져오기
                const personCountry = person.countryId
                  ? countries?.find(
                      (country) => country.id === person.countryId,
                    )
                  : null

                // 표시할 이미지 우선순위: 프로필 이미지 > 국가 썸네일 이미지
                const displayImage =
                  person.profileImageUrl || personCountry?.thumbnailUrl

                const menuItems: ActionMenuItem[] = [
                  {
                    id: 'edit',
                    label: '수정',
                    icon: '✏️',
                    onClick: () => handleEdit(person),
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
                        <PersonName>{fullName}</PersonName>
                        {personCountry && (
                          <PersonMeta>
                            <MetaBadge $type="country">
                              {personCountry.name}
                            </MetaBadge>
                          </PersonMeta>
                        )}
                        <PersonPrice>
                          ${Math.floor(Math.random() * 100) + 20}
                        </PersonPrice>
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

      {/* 플로팅 + 버튼 (모바일용) */}
      <FloatingButton
        as={motion.button}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleOpenCreate}
      >
        +
      </FloatingButton>
      <FormSidePanel
        isOpen={showSidebar}
        onClose={handleCloseSidebar}
        title={editingPerson ? '인물 수정' : '새 인물 등록'}
        submitLabel={editingPerson ? '수정 완료' : '인물 등록'}
        formId="person-form"
        submitDisabled={!formData.name?.trim()}
        headerExtra={
          <RequiredFieldsNotice>
            <RequiredFieldsIcon>⚠️</RequiredFieldsIcon>
            <RequiredFieldsText>
              <RequiredFieldsTitle>필수 항목:</RequiredFieldsTitle>
              <RequiredFieldsList>
                <RequiredFieldItem $completed={!!formData.name?.trim()}>
                  이름
                </RequiredFieldItem>
              </RequiredFieldsList>
            </RequiredFieldsText>
          </RequiredFieldsNotice>
        }
      >
        <Form
          id="person-form"
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit()
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
                  onClick={() => setFormData({ ...formData, jobId: undefined })}
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
                  setFormData({ ...formData, profileImageUrl: e.target.value })
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
      </FormSidePanel>

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

      {/* 필터: 국가 다중 선택 모달 */}
      <CountryMultiSelectModal
        isOpen={showCountryFilterModal}
        onClose={() => setShowCountryFilterModal(false)}
        title="국가 필터"
        countries={countries || []}
        continents={continents || []}
        selectedCountryIds={countryFilter}
        onConfirm={(selectedIds) => {
          setCountryFilter(selectedIds)
          setShowCountryFilterModal(false)
        }}
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

// Styled Components
const Wrap = styled.div`
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%);
  padding-top: var(--header-height, 64px);
  padding-bottom: 60px;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 400px;
    background: linear-gradient(
      135deg,
      rgba(102, 126, 234, 0.05) 0%,
      rgba(118, 75, 162, 0.05) 100%
    );
    pointer-events: none;
  }
`

const Container = styled.div`
  max-width: 100%;
  width: 100%;
  margin: 0;
  padding: 28px 40px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  position: relative;
  z-index: 1;

  @media (max-width: 1024px) {
    padding: 24px 24px;
    gap: 24px;
  }

  @media (max-width: 768px) {
    padding: 20px 16px;
    gap: 20px;
  }
`

const LoadingMessage = styled.div`
  text-align: center;
  padding: 120px 48px;
  font-size: 15px;
  color: #6b7280;
  font-weight: 600;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;

  &::before {
    content: '';
    width: 52px;
    height: 52px;
    border: 4px solid #dbeafe;
    border-top-color: #667eea;
    border-right-color: #764ba2;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
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
  padding: 100px 32px;
  text-align: center;
  background: white;
  border-radius: 16px;
  border: 2px solid #fee2e2;
  box-shadow: 0 4px 20px rgba(239, 68, 68, 0.08);
`

const ErrorIcon = styled.div`
  font-size: 64px;
  margin-bottom: 24px;
  filter: grayscale(0.2);
`

const ErrorTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 22px;
  font-weight: 700;
  color: #dc2626;
  letter-spacing: -0.4px;
`

const ErrorDesc = styled.p`
  margin: 0 0 32px 0;
  font-size: 15px;
  color: #6b7280;
  font-weight: 500;
  max-width: 420px;
  line-height: 1.7;
`

const RetryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 32px;
  font-size: 15px;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.35);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(102, 126, 234, 0.45);
  }

  &:active {
    transform: translateY(0);
  }
`

const FloatingButton = styled.button`
  position: fixed;
  right: 2rem;
  bottom: 2rem;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 2.2rem;
  border: none;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
  z-index: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &::before {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    opacity: 0;
    filter: blur(8px);
    transition: opacity 0.3s;
  }

  &:hover {
    transform: translateY(-4px) scale(1.08);
    box-shadow: 0 12px 32px rgba(102, 126, 234, 0.5);
  }

  &:hover::before {
    opacity: 0.6;
  }

  &:active {
    transform: translateY(-2px) scale(1.04);
  }

  @media (max-width: 1024px) {
    right: 1.5rem;
    bottom: 5rem;
    width: 60px;
    height: 60px;
  }
`

// 검색 및 필터 스타일
const FilterSection = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0;
  margin-bottom: 24px;

  @media (max-width: 1024px) {
    flex-direction: column;
    align-items: stretch;
  }
`

const FilterLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const FilterIconButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 44px;
  height: 44px;
  border: 2px solid ${({ $active }) => ($active ? '#667eea' : '#e5e7eb')};
  background: ${({ $active }) =>
    $active ? 'linear-gradient(135deg, #f3e8ff 0%, #efe9ff 100%)' : '#ffffff'};
  color: ${({ $active }) => ($active ? '#667eea' : '#6b7280')};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${({ $active }) =>
    $active
      ? '0 4px 12px rgba(102, 126, 234, 0.2)'
      : '0 2px 4px rgba(0, 0, 0, 0.05)'};

  &:hover {
    border-color: #667eea;
    background: linear-gradient(135deg, #f3e8ff 0%, #efe9ff 100%);
    color: #667eea;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(102, 126, 234, 0.25);
  }

  &:active {
    transform: translateY(0);
  }
`

const FilterBadge = styled.span`
  position: absolute;
  top: -8px;
  right: -8px;
  min-width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
  border: 2px solid white;
`

const SortByText = styled.span`
  font-size: 14px;
  color: #6b7280;
  margin-left: 8px;
`

const SortButton = styled.button<{ $active?: boolean }>`
  padding: 10px 20px;
  border: 2px solid ${({ $active }) => ($active ? '#667eea' : '#e5e7eb')};
  background: ${({ $active }) =>
    $active ? 'linear-gradient(135deg, #f3e8ff 0%, #efe9ff 100%)' : '#ffffff'};
  color: ${({ $active }) => ($active ? '#667eea' : '#111827')};
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

  &:hover {
    border-color: #667eea;
    background: linear-gradient(135deg, #f3e8ff 0%, #efe9ff 100%);
    color: #667eea;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
  }

  &:active {
    transform: translateY(0);
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
  padding: 12px 40px 12px 40px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 14px;
  background: #ffffff;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: #111827;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

  &:hover {
    border-color: #d1d5db;
  }

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
    transform: translateY(-1px);
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
  padding: 0;
  z-index: 1;

  &:hover {
    background: #d1d5db;
    color: #111827;
  }

  &:active {
    background: #9ca3af;
  }

  svg {
    display: block;
  }
`

const ResultCount = styled.span`
  font-size: 14px;
  color: #6b7280;
  white-space: nowrap;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 28px;
  margin-top: 8px;

  @media (max-width: 1400px) {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 24px;
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 20px;
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`

const Card = styled.div`
  background: white;
  border-radius: 16px;
  padding: 0;
  border: 2px solid #e5e7eb;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  cursor: pointer;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  &:hover {
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
    transform: translateY(-4px);
    border-color: #667eea;
  }
`

const CardImageWrapper = styled.div`
  width: 100%;
  height: 320px;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      transparent 0%,
      rgba(0, 0, 0, 0.1) 100%
    );
    opacity: 0;
    transition: opacity 0.3s;
  }

  ${Card}:hover &::after {
    opacity: 1;
  }
`

const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);

  ${Card}:hover & {
    transform: scale(1.08);
  }
`

const CardImagePlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  color: #9ca3af;

  svg {
    width: 80px;
    height: 80px;
    opacity: 0.4;
  }
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
  font-size: 17px;
  font-weight: 600;
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

const MetaBadge = styled.span<{ $type?: 'country' }>`
  display: inline-block;
  padding: 6px 12px;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  color: #6b7280;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid #e5e7eb;
  transition: all 0.2s;

  ${Card}:hover & {
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    color: #667eea;
    border-color: #667eea;
  }
`

const PersonPrice = styled.div`
  margin-top: 8px;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

const EmptyState = styled.div`
  text-align: center;
  padding: 100px 40px;
  background: white;
  border-radius: 24px;
  border: 2px solid #e5e7eb;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  }
`

const EmptyIcon = styled.div`
  font-size: 72px;
  margin-bottom: 24px;
  opacity: 0.5;
  filter: grayscale(0.2);
`

const EmptyTitle = styled.h3`
  font-size: 22px;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 8px;
  letter-spacing: -0.3px;
`

const EmptyDesc = styled.p`
  color: #9ca3af;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.6;
`

// 페이징 스타일
const Pagination = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 40px;
  padding: 24px;
`

const PaginationButton = styled(motion.button)<{ disabled?: boolean }>`
  padding: 14px 28px;
  border: ${({ disabled }) => (disabled ? '2px solid #f3f4f6' : 'none')};
  border-radius: 14px;
  background: ${({ disabled }) =>
    disabled ? '#fafbfc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
  color: ${({ disabled }) => (disabled ? '#d1d5db' : 'white')};
  font-size: 15px;
  font-weight: 600;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${({ disabled }) =>
    disabled ? 'none' : '0 4px 16px rgba(102, 126, 234, 0.35)'};

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(102, 126, 234, 0.45);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`

const PaginationInfo = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: #667eea;
  min-width: 100px;
  text-align: center;
  padding: 14px 24px;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-radius: 14px;
  border: 2px solid rgba(102, 126, 234, 0.25);
  box-shadow: 0 2px 12px rgba(102, 126, 234, 0.15);
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

// 국가 다중 선택 모달 컴포넌트
interface CountryMultiSelectModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  countries: Array<{ id: string; name: string; continentId?: string | null }>
  continents: Array<{ id: string; name: string }>
  selectedCountryIds: string[]
  onConfirm: (selectedIds: string[]) => void
}

function CountryMultiSelectModal({
  isOpen,
  onClose,
  title,
  countries,
  continents,
  selectedCountryIds,
  onConfirm,
}: CountryMultiSelectModalProps) {
  const [selectedIds, setSelectedIds] =
    React.useState<string[]>(selectedCountryIds)
  const [continentFilter, setContinentFilter] = React.useState<string>('ALL')
  const [searchTerm, setSearchTerm] = React.useState('')

  React.useEffect(() => {
    if (isOpen) {
      setSelectedIds(selectedCountryIds)
      setContinentFilter('ALL')
      setSearchTerm('')
    }
  }, [isOpen, selectedCountryIds])

  if (!isOpen) return null

  const filteredCountries = countries.filter((country) => {
    const matchesContinent =
      continentFilter === 'ALL' ||
      (country.continentId && country.continentId === continentFilter)
    const matchesSearch =
      searchTerm === '' ||
      country.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesContinent && matchesSearch
  })

  const toggleCountry = (countryId: string) => {
    if (selectedIds.includes(countryId)) {
      setSelectedIds(selectedIds.filter((id) => id !== countryId))
    } else {
      setSelectedIds([...selectedIds, countryId])
    }
  }

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          <ModalCloseButton onClick={onClose}>×</ModalCloseButton>
        </ModalHeader>

        <ModalBody>
          {/* 대륙 필터 */}
          <MultiSelectSection>
            <MultiSelectLabel>대륙으로 검색</MultiSelectLabel>
            <MultiSelectButtons>
              <MultiSelectFilterButton
                $isActive={continentFilter === 'ALL'}
                onClick={() => setContinentFilter('ALL')}
              >
                전체
              </MultiSelectFilterButton>
              {continents.map((continent) => (
                <MultiSelectFilterButton
                  key={continent.id}
                  $isActive={continentFilter === continent.id}
                  onClick={() => setContinentFilter(continent.id)}
                >
                  {continent.name}
                </MultiSelectFilterButton>
              ))}
            </MultiSelectButtons>
          </MultiSelectSection>

          {/* 검색 */}
          <MultiSelectSection>
            <MultiSelectSearchInput
              type="text"
              placeholder="국가명 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </MultiSelectSection>

          {/* 국가 목록 */}
          <MultiSelectList>
            {filteredCountries.map((country) => (
              <MultiSelectItem
                key={country.id}
                $isSelected={selectedIds.includes(country.id)}
                onClick={() => toggleCountry(country.id)}
              >
                <MultiSelectCheckbox
                  $isChecked={selectedIds.includes(country.id)}
                >
                  {selectedIds.includes(country.id) && '✓'}
                </MultiSelectCheckbox>
                <span>{country.name}</span>
              </MultiSelectItem>
            ))}
          </MultiSelectList>

          {/* 선택된 개수 */}
          <MultiSelectInfo>{selectedIds.length}개 선택됨</MultiSelectInfo>
        </ModalBody>

        <ModalFooter>
          <ModalButtonSecondary onClick={onClose}>취소</ModalButtonSecondary>
          <ModalButtonPrimary onClick={() => onConfirm(selectedIds)}>
            확인
          </ModalButtonPrimary>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  )
}

// 다중 선택 모달 스타일
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
  z-index: 10000;
  backdrop-filter: blur(4px);
`

const ModalContent = styled.div`
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 640px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  border: 1px solid #e5e7eb;
`

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #fafbfc;
`

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
`

const ModalCloseButton = styled.button`
  width: 32px;
  height: 32px;
  border: none;
  background: #f3f4f6;
  color: #6b7280;
  font-size: 24px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: #e5e7eb;
    color: #374151;
  }
`

const ModalBody = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
`

const MultiSelectSection = styled.div`
  margin-bottom: 20px;
`

const MultiSelectLabel = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
`

const MultiSelectButtons = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`

const MultiSelectFilterButton = styled.button<{ $isActive?: boolean }>`
  padding: 8px 16px;
  border: 2px solid ${({ $isActive }) => ($isActive ? '#667eea' : '#e5e7eb')};
  background: ${({ $isActive }) => ($isActive ? '#eff6ff' : 'white')};
  color: ${({ $isActive }) => ($isActive ? '#667eea' : '#6b7280')};
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ $isActive }) => ($isActive ? '#dbeafe' : '#f9fafb')};
    border-color: #667eea;
  }
`

const MultiSelectSearchInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
`

const MultiSelectList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
  padding: 4px;
`

const MultiSelectItem = styled.div<{ $isSelected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid
    ${({ $isSelected }) => ($isSelected ? '#667eea' : '#e5e7eb')};
  background: ${({ $isSelected }) =>
    $isSelected
      ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
      : 'white'};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ $isSelected }) =>
      $isSelected
        ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'
        : '#f9fafb'};
    border-color: #667eea;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px
      ${({ $isSelected }) =>
        $isSelected ? 'rgba(102, 126, 234, 0.2)' : 'rgba(0, 0, 0, 0.05)'};
  }
`

const MultiSelectCheckbox = styled.div<{ $isChecked?: boolean }>`
  width: 22px;
  height: 22px;
  border: 2px solid ${({ $isChecked }) => ($isChecked ? '#667eea' : '#d1d5db')};
  background: ${({ $isChecked }) =>
    $isChecked ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white'};
  color: white;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  transition: all 0.2s ease;
  flex-shrink: 0;

  ${MultiSelectItem}:hover & {
    border-color: #667eea;
    transform: scale(1.05);
  }
`

const MultiSelectInfo = styled.div`
  margin-top: 16px;
  padding: 12px;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: #667eea;
  border: 1px solid rgba(102, 126, 234, 0.25);
`

const ModalFooter = styled.div`
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
`

const ModalButtonSecondary = styled.button`
  flex: 1;
  padding: 12px 24px;
  border: 2px solid #e5e7eb;
  background: white;
  color: #6b7280;
  font-size: 15px;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f9fafb;
    border-color: #d1d5db;
  }
`

const ModalButtonPrimary = styled.button`
  flex: 1;
  padding: 12px 24px;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 15px;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
`
