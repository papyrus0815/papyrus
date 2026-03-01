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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { AnimatePresence, motion } from 'framer-motion'
import { FiChevronLeft, FiChevronRight, FiEdit2, FiExternalLink, FiGlobe, FiLayers, FiSettings, FiUsers, FiX } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import { useHistoricalCountries } from '@/entities/historical-country/api'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import type { Era } from '@/entities/person/api'
import { Z_INDEX } from '@/shared/styles/z-index'
import { CountrySelectModal } from '@/shared/ui/country-select-modal'
import { PersonRegisterView } from '@/shared/ui/person-register-modal'
import { SelectModal } from '@/shared/ui/select-modal'

import { PositionCategoryCrudModal } from './PositionCategoryCrudModal'
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
    sortOrder,
    setSortOrder,
    currentPage,
    setCurrentPage,
    centuryRange,
    centuryStart,
    centuryEnd,
    setCenturyStart,
    setCenturyEnd,
    getCentury,
    centuryCounts,

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
    showSettingsModal,
    setShowSettingsModal,

    // Mutations
    deleteMutation,

    // Handlers
    handleEdit,
    handleDelete,
    handleSubmit,
  } = usePersonPage()

  const { data: historicalCountries } = useHistoricalCountries()

  /** countryId로 현대 국가 또는 역사적 국가 객체 반환 (리스트/상세 국가 표시용) */
  const resolveCountryById = useCallback(
    (id: string | null | undefined): { id: string; name: string; flagEmoji?: string } | null => {
      if (!id) return null
      const fromModern = countries?.find((c) => c.id === id)
      if (fromModern) return fromModern
      const fromHistorical = (historicalCountries ?? []).find((c) => c.id === id)
      return fromHistorical ?? null
    },
    [countries, historicalCountries],
  )

  // Era 옵션
  const eraOptions = [
    { value: 'BC', label: '기원전' },
    { value: 'AD', label: '기원후' },
  ]

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [showRegisterForm, setShowRegisterForm] = useState(false)
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null)
  const [showCategoryCrudModal, setShowCategoryCrudModal] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const prevDetailIdRef = useRef<string | null>(null)
  const centuryTrackRef = useRef<HTMLDivElement>(null)
  const [draggingHandle, setDraggingHandle] = useState<'start' | 'end' | null>(null)

  /** 가로 세기 트랙에서 clientX → 세기(0~21) */
  const getCenturyFromClientX = useCallback((clientX: number) => {
    const el = centuryTrackRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const ratio = (clientX - rect.left) / rect.width
    return Math.max(0, Math.min(21, Math.round(ratio * 21)))
  }, [])

  useEffect(() => {
    if (draggingHandle === null) return
    const onMove = (e: MouseEvent) => {
      const c = getCenturyFromClientX(e.clientX)
      if (draggingHandle === 'start') setCenturyStart(c)
      else setCenturyEnd(c)
    }
    const onUp = () => setDraggingHandle(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [draggingHandle, getCenturyFromClientX, setCenturyStart, setCenturyEnd])

  /** 인물 선택 시 로딩을 먼저 보여주고 ID 변경 (바뀐 정보가 잠깐 노출되지 않도록) */
  const handleSelectPerson = (id: string) => {
    if (id !== selectedPersonId) setIsDetailLoading(true)
    setSelectedPersonId(id)
  }

  /** 닫는 동안은 2열 유지해 카드가 커졌다 작아지는 현상 방지 */
  const hasDetailLayout = !!selectedPersonId || isClosing

  /** 현재 페이지 인물을 세기별로 그룹 (최신 세기 먼저: 21 → 0) */
  const personsByCentury = useMemo(() => {
    const map = new Map<number, (typeof paginatedPersons)[number][]>()
    paginatedPersons.forEach((p) => {
      const c = getCentury((p as { birthYear?: number }).birthYear, p.birthEra)
      if (c != null) {
        if (!map.has(c)) map.set(c, [])
        map.get(c)!.push(p)
      }
    })
    return Array.from(map.entries()).sort(([a], [b]) => b - a)
  }, [paginatedPersons, getCentury])

  useEffect(() => {
    if (selectedPersonId && selectedPersonId !== prevDetailIdRef.current) {
      prevDetailIdRef.current = selectedPersonId
      setIsDetailLoading(true)
      const t = setTimeout(() => setIsDetailLoading(false), 120)
      return () => clearTimeout(t)
    }
    if (!selectedPersonId) prevDetailIdRef.current = null
  }, [selectedPersonId])

  const hasData = persons && persons.length > 0
  const hasFilteredData = paginatedPersons && paginatedPersons.length > 0

  const selectedPerson = useMemo(
    () => persons?.find((p) => p.id === selectedPersonId) ?? null,
    [persons, selectedPersonId],
  )

  /** 좌측 상세 패널에 표시할 인물 정보 */
  function DetailContent({
    person,
    countries,
    jobs,
    religions,
    dynasties,
  }: {
    person: (typeof persons)[number]
    countries: Array<{ id: string; name: string; thumbnailUrl?: string; flagEmoji?: string }> | undefined
    jobs: Array<{ id: string; name: string }> | undefined
    religions: Array<{ id: string; name: string }> | undefined
    dynasties: Array<{ id: string; name: string }> | undefined
  }) {
    const fullName = getPersonDisplayName(person)
    const birthYear = (person as { birthYear?: number }).birthYear
    const deathYear = (person as { deathYear?: number }).deathYear
    const formatYear = (y: number) => y.toLocaleString('ko-KR', { useGrouping: true })
    const era = (e: string | undefined) => (e === 'BC' ? 'BC' : 'AD')
    const isAlive = birthYear != null && deathYear == null
    const currentYear = new Date().getFullYear()
    const currentAge =
      isAlive && birthYear != null && person.birthEra !== 'BC'
        ? currentYear - birthYear
        : null
    const isDeceased = deathYear != null
    const ageAtDeath =
      birthYear != null && deathYear != null
        ? person.birthEra === 'BC' && person.deathEra === 'BC'
          ? birthYear - deathYear
          : person.birthEra === 'AD' && person.deathEra === 'AD'
            ? deathYear - birthYear
            : (person.birthEra === 'BC' ? birthYear : deathYear) + (person.deathEra === 'AD' ? deathYear : birthYear)
        : null
    const lifespan =
      birthYear != null && deathYear != null
        ? `${era(person.birthEra)} ${formatYear(birthYear)} ~ ${era(person.deathEra)} ${formatYear(deathYear)}`
        : birthYear != null
          ? isAlive && currentAge != null && currentAge >= 0
            ? `AD ${formatYear(birthYear)} ~ 생존 (${currentAge}세)`
            : `${era(person.birthEra)} ${formatYear(birthYear)} ~`
          : '생몰년 미상'
    const personCountry = resolveCountryById(person.countryId)
    const personJob = (person as { jobId?: string }).jobId
      ? jobs?.find((j) => j.id === (person as { jobId?: string }).jobId)
      : null
    const personReligion = (person as { religionId?: string }).religionId
      ? religions?.find((r) => r.id === (person as { religionId?: string }).religionId)
      : null
    const personDynasty = (person as { dynastyId?: string }).dynastyId
      ? dynasties?.find((d) => d.id === (person as { dynastyId?: string }).dynastyId)
      : null
    const roleParts = [personJob?.name, personReligion?.name, personDynasty?.name].filter(
      Boolean,
    ) as string[]
    const displayImage =
      person.profileImageUrl ||
      (personCountry && 'thumbnailUrl' in personCountry
        ? (personCountry as { thumbnailUrl?: string }).thumbnailUrl
        : null)

    const unregisteredText = '등록되지 않았습니다'

    return (
      <DetailContentWrap>
        <DetailHeader>
          <DetailThumbCol>
            <DetailImageWrap>
              {displayImage ? (
                <DetailImage src={displayImage} alt={fullName} />
              ) : (
                <DetailImagePlaceholder>
                  <FiUsers size={48} />
                </DetailImagePlaceholder>
              )}
            </DetailImageWrap>
            <DetailThumbActions>
              <DetailActionBtn
                type="button"
                $edit
                onClick={() => {
                  setEditingPersonId(person.id)
                  setShowRegisterForm(true)
                }}
              >
                <FiEdit2 size={14} />
                수정
              </DetailActionBtn>
              <DetailActionBtn type="button" $detail onClick={() => navigate(pathKeys.persons.detail(person.id))}>
                <FiExternalLink size={14} />
                상세 이동
              </DetailActionBtn>
            </DetailThumbActions>
          </DetailThumbCol>
          <DetailHeaderRight>
            <DetailTitleBlock>
              <DetailName>{fullName}</DetailName>
              {person.originalName && (
                <DetailOriginalName>{person.originalName}</DetailOriginalName>
              )}
              {(person.surnameMeaning || person.nameMeaning || person.middleNameMeaning) && (
                <DetailNameMeaning>
                  {[person.surnameMeaning, person.nameMeaning, person.middleNameMeaning]
                    .filter(Boolean)
                    .join(' · ')}
                </DetailNameMeaning>
              )}
            </DetailTitleBlock>
            <DetailField>
              <DetailFieldLabel>생몰</DetailFieldLabel>
              <DetailFieldValue>
                {isDeceased && <span aria-hidden>🪦</span>}
                {lifespan}
                {isDeceased && ageAtDeath != null && ageAtDeath >= 0 && (
                  <DetailHyangnyeon>향년 {ageAtDeath}세</DetailHyangnyeon>
                )}
              </DetailFieldValue>
            </DetailField>
            <DetailField>
              <DetailFieldLabel>국가</DetailFieldLabel>
              <DetailFieldValue>
                {personCountry ? (
                  <>
                    {'flagEmoji' in personCountry && personCountry.flagEmoji
                      ? `${personCountry.flagEmoji} `
                      : ''}
                    {personCountry.name}
                  </>
                ) : (
                  <DetailUnregistered>{unregisteredText}</DetailUnregistered>
                )}
              </DetailFieldValue>
            </DetailField>
          </DetailHeaderRight>
        </DetailHeader>

        <DetailField>
          <DetailFieldLabel>직업 · 종교 · 왕조</DetailFieldLabel>
          <DetailFieldValue>
            {roleParts.length > 0 ? (
              <DetailMetaRow>
                {roleParts.map((part) => (
                  <DetailMetaChip key={part}>{part}</DetailMetaChip>
                ))}
              </DetailMetaRow>
            ) : (
              <DetailUnregistered>{unregisteredText}</DetailUnregistered>
            )}
          </DetailFieldValue>
        </DetailField>

        <DetailBioSection>
          <DetailBioLabel>약력</DetailBioLabel>
          <DetailBio>
            {person.biography ? (
              person.biography
            ) : (
              <DetailUnregistered>{unregisteredText}</DetailUnregistered>
            )}
          </DetailBio>
        </DetailBioSection>
      </DetailContentWrap>
    )
  }

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
      {/* 메인 컨텐츠: 등록 폼 표시 시 리스트 대신 폼만 표시 */}
      <Container
        as={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {showRegisterForm ? (
          <RegisterFormWrap>
            <PersonRegisterView
              editPersonId={editingPersonId}
              onCancel={() => {
                setShowRegisterForm(false)
                setEditingPersonId(null)
              }}
              onSuccess={(personId) => {
                setShowRegisterForm(false)
                setEditingPersonId(null)
                setSelectedPersonId(personId)
              }}
            />
          </RegisterFormWrap>
        ) : (
          <>
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
          <SortOrderGroup>
            <SortOrderButton
              type="button"
              $active={sortOrder === 'asc'}
              onClick={() => setSortOrder('asc')}
              aria-pressed={sortOrder === 'asc'}
            >
              오름차순
            </SortOrderButton>
            <SortOrderButton
              type="button"
              $active={sortOrder === 'desc'}
              onClick={() => setSortOrder('desc')}
              aria-pressed={sortOrder === 'desc'}
            >
              내림차순
            </SortOrderButton>
          </SortOrderGroup>
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
          <FilterSettingsButton
            type="button"
            onClick={() => setShowCategoryCrudModal(true)}
            aria-label="관직 카테고리 관리"
            title="관직 카테고리 관리"
          >
            <FiLayers size={18} />
          </FilterSettingsButton>
          <FilterSettingsButton
            type="button"
            onClick={() => setShowSettingsModal(true)}
            aria-label="설정"
            title="설정"
          >
            <FiSettings size={18} />
          </FilterSettingsButton>
        </FilterSection>

        {/* 대시보드·필터 밑: 리스트 */}
        <ListRow>
        <ListArea $hasDetail={hasDetailLayout}>
          <AnimatePresence initial={false} onExitComplete={() => setIsClosing(false)}>
            {selectedPersonId && selectedPerson && (
              <DetailPanel
                as={motion.div}
                key="detail-panel"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{
                  flex: '0 0 0px',
                  minWidth: 0,
                  maxWidth: 0,
                  opacity: 0,
                  overflow: 'hidden',
                  transition: { duration: 0.3, ease: 'easeOut' },
                }}
                transition={{ duration: 0.15 }}
                style={{ overflow: 'hidden' }}
              >
                <DetailCloseButton
                  type="button"
                  onClick={() => {
                    setIsClosing(true)
                    setSelectedPersonId(null)
                  }}
                  aria-label="상세 닫기"
                >
                  <FiX size={20} />
                </DetailCloseButton>
                <AnimatePresence mode="wait">
                  {isDetailLoading ? (
                    <DetailLoadingCute
                      key="loading"
                      as={motion.div}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <DetailLoadingEmoji>✨</DetailLoadingEmoji>
                      <DetailLoadingDots>
                        <span /><span /><span />
                      </DetailLoadingDots>
                      <DetailLoadingText>인물 정보를 불러오는 중이에요</DetailLoadingText>
                      <DetailLoadingSkeleton>
                        <DetailSkeletonLine $w="70%" />
                        <DetailSkeletonLine $w="50%" />
                        <DetailSkeletonLine $w="60%" />
                      </DetailLoadingSkeleton>
                    </DetailLoadingCute>
                  ) : (
                    <motion.div
                      key="content"
                      initial={false}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <DetailContent
                        person={selectedPerson}
                        countries={countries}
                        jobs={jobs}
                        religions={religions}
                        dynasties={dynasties}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </DetailPanel>
            )}
          </AnimatePresence>
          <ListColumn
            as={motion.div}
            $twoRows={hasDetailLayout}
            $expandWhenClosing={!selectedPersonId}
            initial={false}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
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
              <ListScrollArea>
                {personsByCentury.map(([century, list]) => (
                    <CenturySection key={century}>
                      <CenturyHeading>
                        {century < 0 ? `기원전 ${-century}세기` : `${century}세기`}
                      </CenturyHeading>
                      <AdaptiveGrid $twoRows={hasDetailLayout}>
                        {list.map((person) => {
                          const fullName = getPersonDisplayName(person, true)
                          const birthYear = (person as { birthYear?: number }).birthYear
                          const deathYear = (person as { deathYear?: number }).deathYear
                          const formatYear = (y: number) => y.toLocaleString('ko-KR', { useGrouping: true })
                          const era = (e: string | undefined) => (e === 'BC' ? 'BC' : 'AD')
                          const isAlive = birthYear != null && deathYear == null
                          const currentYear = new Date().getFullYear()
                          const currentAge = isAlive && birthYear != null && person.birthEra !== 'BC' ? currentYear - birthYear : null
                          const isDeceased = deathYear != null
                          const lifespan =
                            birthYear != null && deathYear != null
                              ? `${era(person.birthEra)} ${formatYear(birthYear)} ~ ${era(person.deathEra)} ${formatYear(deathYear)}`
                              : birthYear != null
                                ? isAlive && currentAge != null && currentAge >= 0
                                  ? `AD ${formatYear(birthYear)} ~ 생존 (${currentAge}세)`
                                  : `${era(person.birthEra)} ${formatYear(birthYear)} ~`
                                : '생몰년 미상'
                          const personCountry = resolveCountryById(person.countryId)
                          const personJob = (person as { jobId?: string }).jobId ? jobs?.find((j) => j.id === (person as { jobId?: string }).jobId) : null
                          const personReligion = (person as { religionId?: string }).religionId ? religions?.find((r) => r.id === (person as { religionId?: string }).religionId) : null
                          const personDynasty = (person as { dynastyId?: string }).dynastyId ? dynasties?.find((d) => d.id === (person as { dynastyId?: string }).dynastyId) : null
                          const roleParts = [personJob?.name, personReligion?.name, personDynasty?.name].filter(Boolean) as string[]
                          const roleLabel = roleParts.length > 0 ? roleParts.join(' · ') : null
                          const genderLabel = person.gender === 'MALE' ? '남' : person.gender === 'FEMALE' ? '여' : null
                          const bioText = person.biography?.replace(/\s+/g, ' ').trim() || ''
                          const bioExcerpt = bioText.length > 120 ? `${bioText.slice(0, 120)}…` : bioText || null
                          const displayImage = person.profileImageUrl || personCountry?.thumbnailUrl
                          return (
                            <Card
                              key={person.id}
                              $active={person.id === selectedPersonId}
                              onClick={() => handleSelectPerson(person.id)}
                              style={{ cursor: 'pointer' }}
                            >
                              <CardImageWrapper>
                                {displayImage ? (
                                  <CardImage src={displayImage} alt={fullName} />
                                ) : (
                                  <CardImagePlaceholder>
                                    <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                    </svg>
                                  </CardImagePlaceholder>
                                )}
                              </CardImageWrapper>
                              <CardContent>
                                <PersonInfo>
                                  <CardTitleRow>
                                    <PersonName>{fullName}</PersonName>
                                    {genderLabel && <CardGender>{genderLabel}</CardGender>}
                                  </CardTitleRow>
                                  <PersonLifespan>
                                    {isDeceased && <TombstoneIcon aria-hidden>🪦</TombstoneIcon>}
                                    {lifespan}
                                  </PersonLifespan>
                                  {personCountry && (
                                    <CardMetaRow>
                                      <MetaBadge $type="country">
                                        {'flagEmoji' in personCountry && personCountry.flagEmoji ? `${personCountry.flagEmoji} ` : ''}
                                        {personCountry.name}
                                      </MetaBadge>
                                    </CardMetaRow>
                                  )}
                                  {roleLabel && <CardRole>{roleLabel}</CardRole>}
                                  {bioExcerpt && <CardBio>{bioExcerpt}</CardBio>}
                                </PersonInfo>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </AdaptiveGrid>
                    </CenturySection>
                ))}
              </ListScrollArea>

              {totalPages > 1 && (
                <Pagination
                  as={motion.div}
                  initial={false}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                >
                  <PaginationButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    이전
                  </PaginationButton>
                  <PaginationInfo>{currentPage} / {totalPages}페이지</PaginationInfo>
                  <PaginationButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    다음
                  </PaginationButton>
                </Pagination>
              )}
            </>
          )}
          </ListColumn>
        </ListArea>
        </ListRow>
          </>
        )}
      </Container>

      {/* 플로팅 + 버튼: 클릭 시 리스트 영역이 등록 폼으로 전환 (페이지 이동 없음) */}
      {!showRegisterForm && (
        <FloatingButton
          as={motion.button}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setEditingPersonId(null)
            setShowRegisterForm(true)
          }}
          title="인물 등록"
        >
          +
        </FloatingButton>
      )}

      {/* 구 사이드바 폼 (미사용) */}
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
              label: getPersonDisplayName(person),
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
              label: getPersonDisplayName(person),
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

      {/* 설정 모달 — 세기 범위 */}
      {showSettingsModal &&
        createPortal(
          <>
            <SettingsModalOverlay
              as={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettingsModal(false)}
            />
            <SettingsModalBox
              as={motion.div}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <SettingsModalHeader>
                <SettingsModalTitle>설정</SettingsModalTitle>
                <SettingsModalClose
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  aria-label="닫기"
                >
                  <FiX size={20} />
                </SettingsModalClose>
              </SettingsModalHeader>
              <SettingsModalContent>
                <SettingsCenturyBlock>
                  <SettingsCenturyLabel>출생 세기 범위</SettingsCenturyLabel>
                  <SettingsCenturyDesc>표시할 세기 범위를 드래그하여 선택하세요.</SettingsCenturyDesc>
                  <SettingsCenturyTrackWrap ref={centuryTrackRef}>
                    <SettingsCenturyTrackLine />
                    <SettingsCenturyHistogramWrap>
                      {centuryCounts.map((count, c) => {
                        const maxCount = Math.max(1, ...centuryCounts)
                        const heightPct = (count / maxCount) * 100
                        return (
                          <SettingsCenturyHistogramBar key={c} $height={heightPct} title={`${c}세기: ${count}명`} />
                        )
                      })}
                    </SettingsCenturyHistogramWrap>
                    <SettingsCenturyHandle
                      $left={(centuryStart / 21) * 100}
                      onMouseDown={(e) => { e.preventDefault(); setDraggingHandle('start') }}
                      aria-label={`시작 세기 ${centuryStart}`}
                    />
                    <SettingsCenturyHandle
                      $left={(centuryEnd / 21) * 100}
                      onMouseDown={(e) => { e.preventDefault(); setDraggingHandle('end') }}
                      aria-label={`끝 세기 ${centuryEnd}`}
                    />
                  </SettingsCenturyTrackWrap>
                  <SettingsCenturyTickRow>
                    {Array.from({ length: 22 }, (_, c) => (
                      <SettingsCenturyTickLabel key={c} $left={(c / 21) * 100}>
                        {c}
                      </SettingsCenturyTickLabel>
                    ))}
                  </SettingsCenturyTickRow>
                  <SettingsCenturyRangeValue>
                    {centuryStart}세기 ~ {centuryEnd}세기
                  </SettingsCenturyRangeValue>
                </SettingsCenturyBlock>
              </SettingsModalContent>
            </SettingsModalBox>
          </>,
          document.body,
        )}

      {/* 관직 카테고리(1차·2차) CRUD 모달 */}
      <PositionCategoryCrudModal
        isOpen={showCategoryCrudModal}
        onClose={() => setShowCategoryCrudModal(false)}
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
  display: flex;
  flex-direction: column;
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
  flex: 1;
  min-height: 0;

  @media (max-width: 768px) {
    padding: 16px;
    gap: 20px;
  }
`

const RegisterFormWrap = styled.div`
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
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

const SortOrderGroup = styled.div`
  display: inline-flex;
  border: 1.5px solid rgba(203, 213, 225, 0.6);
  border-radius: 10px;
  overflow: hidden;
  background: #f8fafc;
`

const SortOrderButton = styled.button<{ $active?: boolean }>`
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  border-right: 1px solid rgba(203, 213, 225, 0.6);
  background: ${({ $active }) => ($active ? 'rgba(99, 102, 241, 0.15)' : 'transparent')};
  color: ${({ $active }) => ($active ? '#4f46e5' : '#64748b')};

  &:last-child {
    border-right: none;
  }

  &:hover {
    background: ${({ $active }) => ($active ? 'rgba(99, 102, 241, 0.2)' : 'rgba(203, 213, 225, 0.3)')};
    color: #1e293b;
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

const FilterSettingsButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1.5px solid rgba(203, 213, 225, 0.6);
  border-radius: 10px;
  background: #f8fafc;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    border-color: rgba(99, 102, 241, 0.3);
    background: #fff;
    color: #6366f1;
  }
  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
  }
`

const ListArea = styled.div<{ $hasDetail?: boolean }>`
  width: 100%;
  min-width: 0;
  padding: 0 16px;
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  gap: 24px;
  align-items: stretch;
  flex: 1;
  min-height: 0;

  @media (min-width: 1200px) {
    max-width: ${({ $hasDetail }) => ($hasDetail ? '100%' : '1400px')};
    margin: 0 auto;
    padding: 0 32px;
  }

  @media (max-width: 768px) {
    padding: 0 12px;
    flex-direction: column;
  }
`

/* 좌측: 인물 상세 — 카드 우측 이동 시 남은 영역 전부 상세로 */
const DetailPanel = styled.div`
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding: 24px 28px 28px 0;
  margin-right: 24px;
  position: relative;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  background: transparent;
  border-right: 1px solid rgba(203, 213, 225, 0.4);
  border-radius: 0;

  @media (max-width: 768px) {
    margin-right: 0;
    padding: 20px 0;
    border-right: none;
  }
`

const DetailCloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  width: 42px;
  height: 42px;
  border: none;
  background: rgba(255, 240, 245, 0.9);
  color: #c08497;
  border-radius: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;

  &:hover {
    background: rgba(252, 231, 243, 0.95);
    color: #be185d;
    transform: scale(1.05);
  }
`

/* 인물 전환 시 로딩 — 패널 가운데 */
const DetailLoadingCute = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 40px 24px;
  gap: 16px;
`

const DetailLoadingEmoji = styled.span`
  font-size: 48px;
  animation: detailLoadingBounce 0.8s ease-in-out infinite;
  @keyframes detailLoadingBounce {
    0%, 100% { transform: scale(1) translateY(0); }
    50% { transform: scale(1.1) translateY(-6px); }
  }
`

const DetailLoadingDots = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: linear-gradient(135deg, #f9a8d4 0%, #f472b6 100%);
    animation: detailLoadingDot 0.9s ease-in-out infinite;
    &:nth-child(1) { animation-delay: 0s; }
    &:nth-child(2) { animation-delay: 0.15s; }
    &:nth-child(3) { animation-delay: 0.3s; }
  }
  @keyframes detailLoadingDot {
    0%, 100% { transform: scale(0.85); opacity: 0.6; }
    50% { transform: scale(1.2); opacity: 1; }
  }
`

const DetailLoadingText = styled.p`
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #64748b;
  letter-spacing: -0.01em;
`

const DetailLoadingSkeleton = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 240px;
  margin-top: 12px;
`

const DetailSkeletonLine = styled.div<{ $w?: string }>`
  height: 12px;
  width: ${({ $w }) => $w ?? '100%'};
  border-radius: 10px;
  background: linear-gradient(90deg, rgba(251, 207, 232, 0.4) 0%, rgba(253, 224, 239, 0.6) 50%, rgba(251, 207, 232, 0.4) 100%);
  background-size: 200% 100%;
  animation: detailSkeletonShine 1.2s ease-in-out infinite;
  @keyframes detailSkeletonShine {
    0% { background-position: 100% 0; }
    100% { background-position: -100% 0; }
  }
`

const DetailContentWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const DetailHeader = styled.div`
  display: flex;
  flex-direction: row;
  gap: 24px;
  align-items: flex-start;

  @media (max-width: 600px) {
    flex-direction: column;
  }
`

const DetailThumbCol = styled.div`
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
`

const DetailImageWrap = styled.div`
  width: 200px;
  aspect-ratio: 3/4;
  min-height: 200px;
  border-radius: 12px;
  overflow: hidden;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (min-width: 700px) {
    width: 240px;
    min-height: 260px;
  }
`

const DetailThumbActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 10px;
`

const DetailImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: top center;
`

const DetailHeaderRight = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const DetailImagePlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
`

const DetailTitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const DetailName = styled.h2`
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.03em;
  line-height: 1.3;
`

const DetailOriginalName = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  font-style: italic;
`

const DetailNameMeaning = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: #94a3b8;
`

const DetailField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const DetailFieldLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`

const DetailFieldValue = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`

const DetailHyangnyeon = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  padding: 2px 8px;
  background: #f1f5f9;
  border-radius: 6px;
`

const DetailUnregistered = styled.span`
  font-size: 13px;
  color: #94a3b8;
  font-weight: 500;
  font-style: italic;
`

const DetailMetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
`

const DetailMetaChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  background: #f1f5f9;
  border: 1px solid rgba(203, 213, 225, 0.6);
  border-radius: 8px;
`

const DetailBioSection = styled.section`
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
`

const DetailBioLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 10px;
`

const DetailBio = styled.div`
  font-size: 14px;
  color: #334155;
  line-height: 1.7;
  white-space: pre-wrap;
  max-height: 220px;
  overflow-y: auto;
`

/* 수정 / 상세 이동 — 작은 버튼 */
const DetailActionBtn = styled.button<{ $edit?: boolean; $detail?: boolean }>`
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: #fff;
  color: #374151;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;
  flex: 1;

  ${({ $edit }) =>
    $edit &&
    `
    &:hover {
      border-color: #9ca3af;
      background: #f9fafb;
    }
  `}

  ${({ $detail }) =>
    $detail &&
    `
    border-color: #0f172a;
    background: #0f172a;
    color: #fff;
    &:hover {
      background: #1e293b;
      border-color: #1e293b;
    }
  `}
`

/* 우측: 리스트 영역 — 상세 열림 시 카드만 맨 우측, 닫을 때는 패널이 줄어들며 리스트가 스르륵 채움 */
const ListColumn = styled.div<{ $twoRows?: boolean; $expandWhenClosing?: boolean }>`
  flex: ${({ $twoRows, $expandWhenClosing }) =>
    $expandWhenClosing ? '1' : $twoRows ? '0 0 auto' : '1'};
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: ${({ $twoRows }) => ($twoRows ? 'flex-end' : 'stretch')};
  min-height: 0;
  align-self: stretch;
  overflow-y: ${({ $twoRows }) => ($twoRows ? 'auto' : 'visible')};

  @media (max-width: 768px) {
    flex: 1;
    align-items: stretch;
    overflow-y: visible;
  }
`

const ListScrollArea = styled.div`
  flex: 1;
  min-width: 0;
  overflow-y: auto;
`

const CenturySection = styled.section`
  margin-bottom: 28px;

  &:last-child {
    margin-bottom: 0;
  }
`

const CenturyHeading = styled.h3`
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 700;
  color: #6366f1;
  letter-spacing: -0.02em;
`

/* 대시보드·필터 밑: 리스트 */
const ListRow = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 0;
`

/* 설정 모달 */
const SettingsModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  backdrop-filter: blur(4px);
`

const SettingsModalBox = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(420px, calc(100% - 32px));
  max-height: 85vh;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.12);
  z-index: ${Z_INDEX.MODAL_CONTENT};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #e5e7eb;
`

const SettingsModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #fafbfc;
`

const SettingsModalTitle = styled.h2`
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #1e293b;
`

const SettingsModalClose = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f1f5f9;
    color: #334155;
  }
`

const SettingsModalContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
`

/* 설정 모달 — 세기 범위 (개선된 디자인) */
const SettingsCenturyBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const SettingsCenturyLabel = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #334155;
`

const SettingsCenturyDesc = styled.p`
  margin: 0;
  font-size: 12px;
  color: #64748b;
  line-height: 1.45;
`

const SettingsCenturyTrackWrap = styled.div`
  position: relative;
  width: 100%;
  height: 52px;
  display: flex;
  align-items: flex-end;
`

const SettingsCenturyTrackLine = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: linear-gradient(90deg, #c7d2fe 0%, #6366f1 50%, #c7d2fe 100%);
  border-radius: 2px;
  pointer-events: none;
`

const SettingsCenturyHistogramWrap = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 3px;
  height: 38px;
  display: flex;
  align-items: flex-end;
  justify-content: stretch;
  gap: 2px;
  padding: 0 2px;
  pointer-events: none;
`

const SettingsCenturyHistogramBar = styled.div<{ $height: number }>`
  flex: 1;
  min-width: 3px;
  background: rgba(99, 102, 241, 0.4);
  border-radius: 2px 2px 0 0;
  height: ${({ $height }) => $height}%;
  min-height: ${({ $height }) => ($height > 0 ? 3 : 0)}px;
`

const SettingsCenturyHandle = styled.div<{ $left: number }>`
  position: absolute;
  left: ${({ $left }) => $left}%;
  bottom: 0;
  transform: translate(-50%, 50%);
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #6366f1;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
  cursor: grab;
  z-index: 2;

  &:active {
    cursor: grabbing;
  }
`

const SettingsCenturyTickRow = styled.div`
  position: relative;
  width: 100%;
  height: 18px;
  margin-top: 6px;
`

const SettingsCenturyTickLabel = styled.span<{ $left: number }>`
  position: absolute;
  left: ${({ $left }) => $left}%;
  transform: translateX(-50%);
  font-size: 11px;
  color: #64748b;
  line-height: 1;
  pointer-events: none;
  font-weight: 500;
`

const SettingsCenturyRangeValue = styled.div`
  margin-top: 4px;
  padding: 10px 14px;
  background: #f1f5f9;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  text-align: center;
`

/* 상세 열림 시: 기존 카드 사이즈 유지, 한 줄 두 개, 우측으로 이동 */
const TwoColGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 260px);
  gap: 24px;
  width: max-content;
  min-width: 0;
  margin-top: 4px;
  padding-right: 8px;

  @media (min-width: 900px) {
    gap: 28px;
    grid-template-columns: repeat(2, 280px);
  }

  @media (min-width: 1200px) {
    grid-template-columns: repeat(2, 300px);
  }

  @media (max-width: 640px) {
    gap: 16px;
    grid-template-columns: repeat(2, 140px);
  }
`

/* 기본: 여러 열 그리드 (상세 닫혀 있을 때) */
const Grid = styled.div`
  display: grid;
  width: 100%;
  min-width: 0;
  gap: 24px;
  margin-top: 4px;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));

  @media (min-width: 900px) {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }

  @media (min-width: 1200px) {
    gap: 28px;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`

/* 상세 열림/닫힘에 따라 한 그리드로 전환 — 리마운트 없이 스르륵 전환 */
const AdaptiveGrid = styled.div<{ $twoRows?: boolean }>`
  display: grid;
  gap: 24px;
  margin-top: 4px;
  min-width: 0;
  ${({ $twoRows }) =>
    $twoRows
      ? `
    grid-template-columns: repeat(2, 260px);
    width: max-content;
    padding-right: 8px;
    @media (min-width: 900px) { gap: 28px; grid-template-columns: repeat(2, 280px); }
    @media (min-width: 1200px) { grid-template-columns: repeat(2, 300px); }
    @media (max-width: 640px) { gap: 16px; grid-template-columns: repeat(2, 140px); }
  `
      : `
    width: 100%;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    @media (min-width: 900px) { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
    @media (min-width: 1200px) { gap: 28px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
    @media (max-width: 640px) { grid-template-columns: 1fr; gap: 20px; }
  `}
`

/* active 시 메인 퍼플(#6366f1) 사용 */
const Card = styled.div<{ $active?: boolean }>`
  background: ${({ $active }) => ($active ? THEME.primaryLight : '#fff')};
  border-radius: 12px;
  padding: 0;
  border: 1.5px solid ${({ $active }) => ($active ? THEME.primary : THEME.border)};
  transition:
    box-shadow 0.3s ease,
    border-color 0.3s ease,
    background 0.3s ease,
    transform 0.2s ease;
  position: relative;
  cursor: pointer;
  overflow: hidden;
  ${({ $active }) =>
    $active &&
    `
    box-shadow: 0 0 0 2px ${THEME.primary}, 0 4px 16px rgba(99, 102, 241, 0.18);
    border-color: ${THEME.primary};
  `}
  &:hover {
    border-color: ${({ $active }) => ($active ? THEME.primaryDark : THEME.borderLight)};
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
