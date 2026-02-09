/**
 * 인물 상세 페이지
 *
 * @description
 * 인물의 모든 정보를 섹션별 카드로 표시
 * - 기본 정보 (이름, 생몰년, 성별, 전기)
 * - 프로필 이미지 갤러리
 * - 소속 정보 (국가, 가문, 종교, 직업)
 * - 가계도 (가문 + 가족 관계 통합)
 * - 주요 활동 (창업 조직, 군 경력, 조직 활동, 정치 활동, 저서, 사건 참여)
 */
import React, { useEffect, useState } from 'react'

import { useQuery } from '@tanstack/react-query'

import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

import { getPersonDetailById } from '@/shared/api/persons-detail'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'

type TabType = 'overview' | 'genealogy' | 'activities' | 'events' | 'works'

// 가족 구성원 타입
interface FamilyMember {
  id: string
  name: string
  surname?: string
  birthYear?: number
  deathYear?: number
  profileImageUrl?: string
  job?: { title: string }
  relation?: string // 관계
}

// 목업 데이터 - 부르봉 왕가
const MOCK_PERSON = {
  id: 'mock-1',
  name: '루이 14세',
  surname: '부르봉',
  gender: '남성',
  birthEra: 'AD',
  birthYear: 1638,
  birthMonth: 9,
  birthDay: 5,
  deathEra: 'AD',
  deathYear: 1715,
  deathMonth: 9,
  deathDay: 1,
  biography:
    '프랑스의 제72대 국왕으로, "태양왕(Le Roi Soleil)"으로 불린다. 72년간 재위하여 유럽 역사상 가장 긴 재위 기간을 기록했다. 베르사유 궁전을 건설하고 절대왕정의 전성기를 이루었으며, "짐이 곧 국가다(L\'État, c\'est moi)"라는 명언으로 유명하다.',
  profileImageUrl: null,
  country: { id: '1', name: '프랑스', flagEmoji: '🇫🇷' },
  dynasty: { id: '1', name: '부르봉 왕가' },
  religion: { id: '1', name: '가톨릭' },
  denomination: { id: '1', name: '로마 가톨릭' },
  job: { id: '1', title: '프랑스 국왕' },
  father: {
    id: 'f1',
    name: '루이 13세',
    surname: '부르봉',
    birthYear: 1601,
    deathYear: 1643,
  },
  mother: {
    id: 'm1',
    name: '안 도트리슈',
    surname: '합스부르크',
    birthYear: 1601,
    deathYear: 1666,
  },
  children: [
    {
      id: 'c1',
      name: '루이',
      surname: '부르봉',
      birthYear: 1661,
      deathYear: 1711,
    },
    {
      id: 'c2',
      name: '필리프 샤를',
      surname: '부르봉',
      birthYear: 1668,
      deathYear: 1671,
    },
  ],
  companies: [],
  foundedCompanies: [],
  books: [{ id: 'b1', title: '왕의 회고록', publishedYear: 1670 }],
  organizationRoles: [
    {
      id: 'o1',
      organization: {
        name: '프랑스 왕립 아카데미',
        shortName: '왕립 아카데미',
      },
      roleTitle: '후원자',
      startDate: '1666-01-01',
      endDate: null,
    },
  ],
  partyLeaderships: [],
  militaryCommands: [
    {
      id: 'm1',
      unit: { name: '프랑스 왕립군' },
      rank: '총사령관',
      role: '최고 지휘관',
      startDate: '1643-05-14',
      endDate: '1715-09-01',
    },
  ],
  events: [
    {
      id: 'e1',
      event: { title: '베르사유 궁전 건설', startDate: '1661-01-01' },
      role: '주도',
    },
    {
      id: 'e2',
      event: { title: '낭트 칙령 폐지', startDate: '1685-10-22' },
      role: '결정',
    },
    {
      id: 'e3',
      event: { title: '스페인 왕위 계승 전쟁', startDate: '1701-01-01' },
      role: '주도',
    },
  ],
  eventTimelines: [],
}

/**
 * HeroImageGallery - 자동 슬라이드쇼 이미지 갤러리 컴포넌트
 */
function HeroImageGallery({
  person,
  fullName,
}: {
  person: any
  fullName: string
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  // 인물 관련 다양한 이미지들 (프로필, 활동 사진 등)
  const images = [
    {
      url: person.profileImageUrl,
      title: fullName,
      subtitle: '공식 초상화',
      type: 'portrait',
    },
    {
      url: person.profileImageUrl, // 실제로는 다른 이미지들이 들어갈 예정
      title: fullName,
      subtitle: '재위 중 모습',
      type: 'activity',
    },
    {
      url: person.profileImageUrl,
      title: fullName,
      subtitle: '역사적 순간',
      type: 'historic',
    },
  ]

  // 자동 슬라이드쇼
  useEffect(() => {
    if (isPaused) return

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length)
    }, 5000) // 5초마다 변경

    return () => clearInterval(interval)
  }, [images.length, isPaused])

  const goToPrevious = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const goToNext = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const currentImage = images[currentImageIndex]

  // 기본 정보
  const lifespan = person.birthDate
    ? `${person.birthDate.split('-')[0]}${person.deathDate ? ` - ${person.deathDate.split('-')[0]}` : ' - 현재'}`
    : '미상'

  return (
    <MagazineLayout
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 좌측: 이미지 영역 */}
      <ImageSection>
        <MainImageContainer>
          <AnimatePresence mode="wait">
            <HeroImageWrapper
              key={currentImageIndex}
              as={motion.div}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            >
              <img src={currentImage.url} alt={currentImage.title} />
            </HeroImageWrapper>
          </AnimatePresence>

          {/* 이미지 네비게이션 */}
          <ImageNavButton $position="left" onClick={goToPrevious}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <polyline
                points="15 18 9 12 15 6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </ImageNavButton>
          <ImageNavButton $position="right" onClick={goToNext}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <polyline
                points="9 18 15 12 9 6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </ImageNavButton>

          {/* 프로그레스 인디케이터 */}
          <ImageProgressDots>
            {images.map((_, index) => (
              <ProgressDot
                key={index}
                $active={index === currentImageIndex}
                onClick={() => setCurrentImageIndex(index)}
              />
            ))}
          </ImageProgressDots>
        </MainImageContainer>

        {/* 좌측 하단: 이미지 정보 */}
        <ImageInfoPanel
          as={motion.div}
          key={`info-${currentImageIndex}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ImageTypeBadge $type={currentImage.type}>
            {currentImage.type === 'portrait' && '📸 초상화'}
            {currentImage.type === 'activity' && '⚡ 활동'}
            {currentImage.type === 'historic' && '🏛️ 역사'}
          </ImageTypeBadge>
          <ImageInfoTitle>{currentImage.subtitle}</ImageInfoTitle>
          <ImageInfoDescription>
            {currentImageIndex + 1} / {images.length}
          </ImageInfoDescription>
        </ImageInfoPanel>
      </ImageSection>

      {/* 우측: 정보 영역 */}
      <InfoSection>
        <InfoHeader>
          <InfoTitle>{fullName}</InfoTitle>
          {person.job && <InfoSubtitle>{person.job.title}</InfoSubtitle>}
        </InfoHeader>

        <InfoCards>
          {/* 기본 정보 */}
          <InfoCardItem>
            <InfoCardIcon>👤</InfoCardIcon>
            <InfoCardContent>
              <InfoCardLabel>생애</InfoCardLabel>
              <InfoCardValue>{lifespan}</InfoCardValue>
            </InfoCardContent>
          </InfoCardItem>

          {person.country && (
            <InfoCardItem>
              <InfoCardIcon>{person.country.flagEmoji || '🏳️'}</InfoCardIcon>
              <InfoCardContent>
                <InfoCardLabel>국가</InfoCardLabel>
                <InfoCardValue>{person.country.name}</InfoCardValue>
              </InfoCardContent>
            </InfoCardItem>
          )}

          {person.gender && (
            <InfoCardItem>
              <InfoCardIcon>
                {person.gender === '남성' ? '👨' : '👩'}
              </InfoCardIcon>
              <InfoCardContent>
                <InfoCardLabel>성별</InfoCardLabel>
                <InfoCardValue>{person.gender}</InfoCardValue>
              </InfoCardContent>
            </InfoCardItem>
          )}

          {person.dynasty && (
            <InfoCardItem>
              <InfoCardIcon>👑</InfoCardIcon>
              <InfoCardContent>
                <InfoCardLabel>가문</InfoCardLabel>
                <InfoCardValue>{person.dynasty.name}</InfoCardValue>
              </InfoCardContent>
            </InfoCardItem>
          )}

          {person.religion && (
            <InfoCardItem>
              <InfoCardIcon>⛪</InfoCardIcon>
              <InfoCardContent>
                <InfoCardLabel>종교</InfoCardLabel>
                <InfoCardValue>{person.religion.name}</InfoCardValue>
              </InfoCardContent>
            </InfoCardItem>
          )}

          {person.denomination && (
            <InfoCardItem>
              <InfoCardIcon>✝️</InfoCardIcon>
              <InfoCardContent>
                <InfoCardLabel>교파</InfoCardLabel>
                <InfoCardValue>{person.denomination.name}</InfoCardValue>
              </InfoCardContent>
            </InfoCardItem>
          )}
        </InfoCards>

        {/* 전기 */}
        {person.biography && (
          <BiographySection>
            <BiographySectionTitle>📖 전기</BiographySectionTitle>
            <BiographyText>{person.biography}</BiographyText>
          </BiographySection>
        )}
      </InfoSection>
    </MagazineLayout>
  )
}

/**
 * PersonDetailPage - 인물 상세 정보 페이지
 */
export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const playClickSound = useClickSound()
  const [useMockData, setUseMockData] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [selectedFamilyMember, setSelectedFamilyMember] =
    useState<FamilyMember | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // API로 인물 상세 정보 가져오기 (관계 데이터 포함)
  const {
    data: apiPerson,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['person-detail', id],
    queryFn: () => getPersonDetailById(id!),
    enabled: !!id && !useMockData,
  })

  // 토글에 따라 목업 데이터 또는 API 데이터 사용
  const person = useMockData ? MOCK_PERSON : apiPerson

  // 이미지 슬라이드쇼 - 5초마다 자동 변경
  useEffect(() => {
    const images = [
      person?.profileImageUrl,
      // 향후 추가 이미지들
    ].filter(Boolean)

    if (images.length <= 1) return

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [person])

  if (isLoading && !useMockData) {
    return (
      <Wrap>
        {/* 토글 버튼 - 항상 표시 */}
        <MockToggle onClick={() => setUseMockData(true)}>
          🎭 목업 데이터 보기
        </MockToggle>
        <Container>
          <LoadingMessage>
            <Spinner />
            <span>인물 정보를 불러오는 중...</span>
          </LoadingMessage>
        </Container>
      </Wrap>
    )
  }

  if ((isError || !person) && !useMockData) {
    return (
      <Wrap>
        {/* 토글 버튼 - 항상 표시 */}
        <MockToggle onClick={() => setUseMockData(true)}>
          🎭 목업 데이터 보기
        </MockToggle>
        <Container>
          <ErrorMessage>
            <ErrorIcon>⚠️</ErrorIcon>
            <ErrorTitle>인물을 찾을 수 없습니다.</ErrorTitle>
            <ErrorDescription>
              요청하신 인물 정보를 불러올 수 없습니다.
              <br />
              목록에서 다시 선택하거나 상단 버튼으로 목업 데이터를 확인하세요.
            </ErrorDescription>
          </ErrorMessage>
          <BackButtonFloating onClick={() => navigate('/persons')}>
            ← 목록으로 돌아가기
          </BackButtonFloating>
        </Container>
      </Wrap>
    )
  }

  // 생몰년 계산 (기원전/후 포함)
  const birthYearText = person.birthYear
    ? `${person.birthYear}${person.birthEra === 'BC' ? ' BC' : ''}`
    : '?'
  const deathYearText = person.deathYear
    ? `${person.deathYear}${person.deathEra === 'BC' ? ' BC' : ''}`
    : '?'
  const lifespanText = `${birthYearText} ~ ${deathYearText}`

  // 전체 이름
  const fullName = person.surname
    ? `${person.surname} ${person.name}`
    : person.name

  return (
    <ModernWrap>
      {/* 토글 버튼 */}
      <MockToggle onClick={() => setUseMockData(!useMockData)}>
        {useMockData ? '실제 데이터' : '목업 데이터'}
      </MockToggle>

      {/* 페이지 헤더 */}
      <PageHeader>
        <BackButton
          onClick={() => {
            playClickSound()
            navigate('/persons')
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              d="M19 12H5M12 19l-7-7 7-7"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          목록으로
        </BackButton>
        <PageTitle>
          <PageTitleIcon>👤</PageTitleIcon>
          <PageTitleText>인물 상세</PageTitleText>
        </PageTitle>
      </PageHeader>

      {/* 탭 내비게이션 */}
      <TabNav>
        <TabNavInner>
          <TabButton
            $active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <polyline
                points="9 22 9 12 15 12 15 22"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            개요
          </TabButton>
          <TabButton
            $active={activeTab === 'genealogy'}
            onClick={() => setActiveTab('genealogy')}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="9" cy="7" r="4" strokeWidth="2" />
              <path
                d="M23 21v-2a4 4 0 0 0-3-3.87"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M16 3.13a4 4 0 0 1 0 7.75"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            가계도
          </TabButton>
          <TabButton
            $active={activeTab === 'activities'}
            onClick={() => setActiveTab('activities')}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <polyline
                points="12 6 12 12 16 14"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            활동
          </TabButton>
          <TabButton
            $active={activeTab === 'events'}
            onClick={() => setActiveTab('events')}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"
                strokeWidth="2"
                strokeLinecap="round"
                fill="currentColor"
              />
            </svg>
            주요 사건
          </TabButton>
          <TabButton
            $active={activeTab === 'works'}
            onClick={() => setActiveTab('works')}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            저작
          </TabButton>
        </TabNavInner>
      </TabNav>

      {/* 개요 탭 - 전체 너비 대시보드 */}
      {activeTab === 'overview' && (
        <OverviewDashboard>
          {/* 히어로 섹션 with 이미지 슬라이드쇼 */}
          <DashboardHero>
            <HeroImageSlideshow>
              <AnimatePresence mode="wait">
                <HeroSlideImage
                  key={currentImageIndex}
                  as={motion.div}
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 1 }}
                >
                  {person.profileImageUrl ? (
                    <img
                      src={person.profileImageUrl}
                      alt={fullName}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <EmptyImagePlaceholder>
                      <svg
                        width="96"
                        height="96"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                          fill="currentColor"
                        />
                      </svg>
                    </EmptyImagePlaceholder>
                  )}
                </HeroSlideImage>
              </AnimatePresence>
              <HeroOverlay />
              <HeroContent>
                <HeroIcon>👤</HeroIcon>
                <HeroTextGroup>
                  <HeroTitle>{fullName}</HeroTitle>
                  <HeroSubtitle>
                    {person.job?.title || '인물 상세정보'}
                  </HeroSubtitle>
                </HeroTextGroup>
              </HeroContent>
            </HeroImageSlideshow>
          </DashboardHero>

          {/* 주요 메트릭 카드 */}
          <DashboardMetricsGrid>
            <DashboardMetricCard
              as={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <MetricIcon>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"
                    fill="currentColor"
                  />
                </svg>
              </MetricIcon>
              <MetricContent>
                <MetricLabel>생애 기간</MetricLabel>
                <MetricValue>
                  {person.birthYear && person.deathYear
                    ? `${person.deathYear - person.birthYear}년`
                    : '미상'}
                </MetricValue>
                <MetricSubtext>{lifespanText}</MetricSubtext>
              </MetricContent>
            </DashboardMetricCard>

            <DashboardMetricCard
              as={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <MetricIcon>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"
                    fill="currentColor"
                  />
                </svg>
              </MetricIcon>
              <MetricContent>
                <MetricLabel>저작 활동</MetricLabel>
                <MetricValue>
                  {person.books ? person.books.length : 0}건
                </MetricValue>
                <MetricSubtext>출간 저서</MetricSubtext>
              </MetricContent>
            </DashboardMetricCard>

            <DashboardMetricCard
              as={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <MetricIcon>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"
                    fill="currentColor"
                  />
                </svg>
              </MetricIcon>
              <MetricContent>
                <MetricLabel>정부 직위</MetricLabel>
                <MetricValue>
                  {person.governmentPositions?.length || 0}건
                </MetricValue>
                <MetricSubtext>역임 직위</MetricSubtext>
              </MetricContent>
            </DashboardMetricCard>

            <DashboardMetricCard
              as={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <MetricIcon>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"
                    fill="currentColor"
                  />
                </svg>
              </MetricIcon>
              <MetricContent>
                <MetricLabel>주요 사건</MetricLabel>
                <MetricValue>
                  {person.events ? person.events.length : 0}건
                </MetricValue>
                <MetricSubtext>참여 사건</MetricSubtext>
              </MetricContent>
            </DashboardMetricCard>

            <DashboardMetricCard
              as={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              <MetricIcon>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2l-5.5 9h11L12 2zm0 3.84L13.93 9h-3.87L12 5.84zM17.5 13c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zM3 21.5h8v-8H3v8zm2-6h4v4H5v-4z"
                    fill="currentColor"
                  />
                </svg>
              </MetricIcon>
              <MetricContent>
                <MetricLabel>조직 활동</MetricLabel>
                <MetricValue>
                  {(person.organizationRoles?.length || 0) +
                    (person.militaryCommands?.length || 0) +
                    (person.partyLeaderships?.length || 0)}
                  건
                </MetricValue>
                <MetricSubtext>총 활동 수</MetricSubtext>
              </MetricContent>
            </DashboardMetricCard>
          </DashboardMetricsGrid>

          {/* 개요 탭 */}
          <DashboardSectionTitle>
            <SectionTitleIcon>📖</SectionTitleIcon>
            <SectionTitleText>인물 정보</SectionTitleText>
          </DashboardSectionTitle>

          {/* 2단 그리드 레이아웃 */}
          <DashboardTwoColumnGrid>
            {/* 전기 */}
            {person.biography && (
              <DashboardWidget
                as={motion.div}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <WidgetHeader>
                  <WidgetIcon>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"
                        fill="currentColor"
                      />
                    </svg>
                  </WidgetIcon>
                  <WidgetTitle>전기</WidgetTitle>
                </WidgetHeader>
                <WidgetContent>
                  <BiographyText>{person.biography}</BiographyText>
                </WidgetContent>
              </DashboardWidget>
            )}

            {/* 소속 정보 */}
            <DashboardWidget
              as={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <WidgetHeader>
                <WidgetIcon>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2c1.7 0 3.25.62 4.45 1.64-.53.18-1.12.36-1.45.36-1 0-2-.5-3.5-.5-.86 0-1.6.17-2.22.44C9.73 4.67 10.83 4 12 4z"
                      fill="currentColor"
                    />
                  </svg>
                </WidgetIcon>
                <WidgetTitle>소속 정보</WidgetTitle>
              </WidgetHeader>
              <WidgetContent>
                {person.dynasty ||
                person.religion ||
                person.denomination ||
                person.job ? (
                  <InfoList>
                    {person.country && (
                      <InfoListItem>
                        <InfoItemIcon>
                          {person.country.flagEmoji || '🏳️'}
                        </InfoItemIcon>
                        <InfoItemContent>
                          <InfoItemLabel>국가</InfoItemLabel>
                          <InfoItemValue>{person.country.name}</InfoItemValue>
                        </InfoItemContent>
                      </InfoListItem>
                    )}
                    {person.dynasty && (
                      <InfoListItem>
                        <InfoItemIcon>👑</InfoItemIcon>
                        <InfoItemContent>
                          <InfoItemLabel>가문</InfoItemLabel>
                          <InfoItemValue>{person.dynasty.name}</InfoItemValue>
                        </InfoItemContent>
                      </InfoListItem>
                    )}
                    {person.religion && (
                      <InfoListItem>
                        <InfoItemIcon>⛪</InfoItemIcon>
                        <InfoItemContent>
                          <InfoItemLabel>종교</InfoItemLabel>
                          <InfoItemValue>{person.religion.name}</InfoItemValue>
                        </InfoItemContent>
                      </InfoListItem>
                    )}
                    {person.denomination && (
                      <InfoListItem>
                        <InfoItemIcon>✝️</InfoItemIcon>
                        <InfoItemContent>
                          <InfoItemLabel>교파</InfoItemLabel>
                          <InfoItemValue>
                            {person.denomination.name}
                          </InfoItemValue>
                        </InfoItemContent>
                      </InfoListItem>
                    )}
                    {person.job && (
                      <InfoListItem>
                        <InfoItemIcon>💼</InfoItemIcon>
                        <InfoItemContent>
                          <InfoItemLabel>직업</InfoItemLabel>
                          <InfoItemValue>{person.job.title}</InfoItemValue>
                        </InfoItemContent>
                      </InfoListItem>
                    )}
                  </InfoList>
                ) : (
                  <EmptyStateCard>
                    <EmptyStateIcon>
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
                        <path d="M12 8v4m0 4h.01" strokeWidth="2" />
                      </svg>
                    </EmptyStateIcon>
                    <EmptyStateText>소속 정보가 없습니다</EmptyStateText>
                  </EmptyStateCard>
                )}
              </WidgetContent>
            </DashboardWidget>
          </DashboardTwoColumnGrid>

          <DashboardSectionTitle style={{ marginTop: '48px' }}>
            <SectionTitleIcon>⚡</SectionTitleIcon>
            <SectionTitleText>주요 활동</SectionTitleText>
          </DashboardSectionTitle>

          {/* 활동 카드 그리드 */}
          <DashboardActivityGrid>
            {/* 저서 */}
            <DashboardWidget
              as={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <WidgetHeader>
                <WidgetIcon>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"
                      fill="currentColor"
                    />
                  </svg>
                </WidgetIcon>
                <WidgetTitle>저서</WidgetTitle>
              </WidgetHeader>
              <WidgetContent>
                {person.books && person.books.length > 0 ? (
                  <ActivityList>
                    {person.books.map(
                      (book: {
                        id: string
                        title: string
                        publishedYear?: number
                      }) => (
                        <ActivityItem key={book.id}>
                          <ActivityDot />
                          <ActivityName>{book.title}</ActivityName>
                          {book.publishedYear && (
                            <ActivityValue>
                              {book.publishedYear}년
                            </ActivityValue>
                          )}
                        </ActivityItem>
                      ),
                    )}
                  </ActivityList>
                ) : (
                  <EmptyStateCard>
                    <EmptyStateText>등록된 저서가 없습니다</EmptyStateText>
                  </EmptyStateCard>
                )}
              </WidgetContent>
            </DashboardWidget>

            {/* 창업 조직 */}
            <DashboardWidget
              as={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
            >
              <WidgetHeader>
                <WidgetIcon>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"
                      fill="currentColor"
                    />
                  </svg>
                </WidgetIcon>
                <WidgetTitle>창업 조직</WidgetTitle>
              </WidgetHeader>
              <WidgetContent>
                {person.foundedCompanies &&
                person.foundedCompanies.length > 0 ? (
                  <ActivityList>
                    {person.foundedCompanies.map(
                      (company: {
                        id: string
                        name: string
                        foundedAt?: string
                      }) => (
                        <ActivityItem key={company.id}>
                          <ActivityDot />
                          <ActivityName>{company.name}</ActivityName>
                          {company.foundedAt && (
                            <ActivityValue>
                              {new Date(company.foundedAt).getFullYear()}년
                            </ActivityValue>
                          )}
                        </ActivityItem>
                      ),
                    )}
                  </ActivityList>
                ) : (
                  <EmptyStateCard>
                    <EmptyStateText>등록된 창업 조직이 없습니다</EmptyStateText>
                  </EmptyStateCard>
                )}
              </WidgetContent>
            </DashboardWidget>

            {/* 군 경력 */}
            <DashboardWidget
              as={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <WidgetHeader>
                <WidgetIcon>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M17 10.43V2H7v8.43c0 .35.18.68.49.86l4.18 2.51-.99 2.34-3.41.29 2.59 2.24L9.07 22 12 20.23 14.93 22l-.78-3.33 2.59-2.24-3.41-.29-.99-2.34 4.18-2.51c.3-.18.48-.5.48-.86z"
                      fill="currentColor"
                    />
                  </svg>
                </WidgetIcon>
                <WidgetTitle>군 경력</WidgetTitle>
              </WidgetHeader>
              <WidgetContent>
                {person.militaryCommands &&
                person.militaryCommands.length > 0 ? (
                  <ActivityList>
                    {person.militaryCommands.map(
                      (command: {
                        id: string
                        unit: { name: string }
                        rank: string
                        role: string
                      }) => (
                        <ActivityItem key={command.id}>
                          <ActivityDot />
                          <ActivityName>{command.unit.name}</ActivityName>
                          <ActivityValue>
                            {command.rank} · {command.role}
                          </ActivityValue>
                        </ActivityItem>
                      ),
                    )}
                  </ActivityList>
                ) : (
                  <EmptyStateCard>
                    <EmptyStateText>등록된 군 경력이 없습니다</EmptyStateText>
                  </EmptyStateCard>
                )}
              </WidgetContent>
            </DashboardWidget>

            {/* 정부 직위 */}
            <DashboardWidget
              as={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.125 }}
            >
              <WidgetHeader>
                <WidgetIcon>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"
                      fill="currentColor"
                    />
                  </svg>
                </WidgetIcon>
                <WidgetTitle>정부 직위</WidgetTitle>
              </WidgetHeader>
              <WidgetContent>
                {person.governmentPositions &&
                person.governmentPositions.length > 0 ? (
                  <ActivityList>
                    {person.governmentPositions.map(
                      (tenure: {
                        id: string
                        title: string
                        termNumber?: number
                        regnalNumber?: number
                        startDate?: string
                        endDate?: string
                      }) => (
                        <ActivityItem key={tenure.id}>
                          <ActivityDot />
                          <ActivityName>
                            {tenure.termNumber && `제${tenure.termNumber}대 `}
                            {tenure.title}
                            {tenure.regnalNumber && ` ${tenure.regnalNumber}세`}
                          </ActivityName>
                          {tenure.startDate && (
                            <ActivityValue>
                              {new Date(tenure.startDate).getFullYear()}
                              {tenure.endDate
                                ? ` ~ ${new Date(tenure.endDate).getFullYear()}`
                                : ' ~ 현재'}
                            </ActivityValue>
                          )}
                        </ActivityItem>
                      ),
                    )}
                  </ActivityList>
                ) : (
                  <EmptyStateCard>
                    <EmptyStateText>등록된 정부 직위가 없습니다</EmptyStateText>
                  </EmptyStateCard>
                )}
              </WidgetContent>
            </DashboardWidget>
          </DashboardActivityGrid>
        </OverviewDashboard>
      )}

      {/* 주요 사건 탭 */}
      {activeTab === 'events' && (
        <OverviewDashboard>
          <DashboardSectionTitle>
            <SectionTitleIcon>📅</SectionTitleIcon>
            <SectionTitleText>주요 사건</SectionTitleText>
          </DashboardSectionTitle>

          {person.events && person.events.length > 0 ? (
            <EventDetailList>
              {person.events.map(
                (personEvent: {
                  id: string
                  event: {
                    title: string
                    startDate?: string
                    description?: string
                    category?: any
                    countryRelations?: any[]
                    timelines?: any[]
                  }
                  role?: string
                  note?: string
                }) => (
                  <EventDetailCard key={personEvent.id}>
                    <EventDetailHeader>
                      <EventDetailTitle>
                        {personEvent.event.title}
                      </EventDetailTitle>
                      {personEvent.event.startDate && (
                        <EventDetailDate>
                          {new Date(
                            personEvent.event.startDate,
                          ).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </EventDetailDate>
                      )}
                    </EventDetailHeader>

                    {personEvent.event.category && (
                      <EventDetailMeta>
                        📂 카테고리:{' '}
                        {typeof personEvent.event.category === 'string'
                          ? personEvent.event.category
                          : personEvent.event.category.name}
                      </EventDetailMeta>
                    )}

                    {personEvent.role && (
                      <EventDetailRole>
                        <EventRoleBadge>{personEvent.role}</EventRoleBadge>
                      </EventDetailRole>
                    )}

                    {personEvent.event.description && (
                      <EventDetailDescription>
                        {personEvent.event.description}
                      </EventDetailDescription>
                    )}

                    {personEvent.note && (
                      <EventDetailNote>
                        <strong>참고:</strong> {personEvent.note}
                      </EventDetailNote>
                    )}

                    {personEvent.event.countryRelations &&
                      personEvent.event.countryRelations.length > 0 && (
                        <EventDetailSection>
                          <EventDetailSectionTitle>
                            🌍 관련 국가
                          </EventDetailSectionTitle>
                          {personEvent.event.countryRelations.map(
                            (rel: any) => (
                              <EventDetailItem key={rel.id}>
                                <EventDetailItemTitle>
                                  {rel.country
                                    ? `${rel.country.name}`
                                    : rel.historicalCountry
                                      ? `${rel.historicalCountry.name}`
                                      : '알 수 없음'}
                                </EventDetailItemTitle>
                                <EventRoleBadge>{rel.role}</EventRoleBadge>
                                {rel.roleDescription && (
                                  <EventDetailItemDesc>
                                    {rel.roleDescription}
                                  </EventDetailItemDesc>
                                )}
                              </EventDetailItem>
                            ),
                          )}
                        </EventDetailSection>
                      )}

                    {personEvent.event.timelines &&
                      personEvent.event.timelines.length > 0 && (
                        <EventDetailSection>
                          <EventDetailSectionTitle>
                            🗺️ 타임라인
                          </EventDetailSectionTitle>
                          {personEvent.event.timelines.map((timeline: any) => (
                            <EventDetailItem key={timeline.id}>
                              <EventDetailItemHeader>
                                <EventDetailItemTitle>
                                  📍 {timeline.locationName || '위치 미상'}
                                </EventDetailItemTitle>
                                {timeline.occurredAt && (
                                  <EventDetailItemDate>
                                    {new Date(
                                      timeline.occurredAt,
                                    ).toLocaleDateString('ko-KR', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                    })}
                                  </EventDetailItemDate>
                                )}
                              </EventDetailItemHeader>
                              <EventDetailItemSubtitle>
                                {timeline.title}
                              </EventDetailItemSubtitle>
                              {timeline.description && (
                                <EventDetailItemDesc>
                                  {timeline.description}
                                </EventDetailItemDesc>
                              )}
                              {timeline.facility && (
                                <EventDetailItemDesc>
                                  🏭 {timeline.facility.name} (
                                  {timeline.facility.facilityType})
                                </EventDetailItemDesc>
                              )}
                            </EventDetailItem>
                          ))}
                        </EventDetailSection>
                      )}
                  </EventDetailCard>
                ),
              )}
            </EventDetailList>
          ) : (
            <EmptyStateCard>
              <EmptyStateText>등록된 주요 사건이 없습니다</EmptyStateText>
            </EmptyStateCard>
          )}
        </OverviewDashboard>
      )}

      {/* 기존 가계도 탭 - 전체 너비 대시보드 */}
      {activeTab === 'genealogy' && (
        <GenealogyDashboard>
          {/* 가문 히어로 섹션 */}
          {person.dynasty && (
            <DynastyHero
              as={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <DynastyHeroContent>
                <DynastyHeroIcon>👑</DynastyHeroIcon>
                <DynastyHeroText>
                  <DynastyHeroTitle>{person.dynasty.name}</DynastyHeroTitle>
                  <DynastyHeroSubtitle>가계도</DynastyHeroSubtitle>
                </DynastyHeroText>
              </DynastyHeroContent>
            </DynastyHero>
          )}

          <GenealogyContainer>
            {person.dynasty ? (
              <>
                {/* 가계도 시각화 */}
                <GenealogyTreeModern>
                  {/* 조부모 세대 */}
                  {(person.father?.father || person.mother?.father) && (
                    <GenerationRow
                      as={motion.div}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <GenerationMembersRow>
                        {person.father?.father && (
                          <FamilyMemberCardModern
                            as={motion.div}
                            whileHover={{ scale: 1.03, y: -4 }}
                            onClick={() =>
                              setSelectedFamilyMember({
                                ...person.father!.father!,
                                relation: '조부 (父父)',
                              })
                            }
                          >
                            <MemberAvatar $size="large">
                              {person.father.father.profileImageUrl ? (
                                <img
                                  src={person.father.father.profileImageUrl}
                                  alt={person.father.father.name}
                                />
                              ) : (
                                <DefaultAvatarIcon>
                                  <svg
                                    width="40"
                                    height="40"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                  </svg>
                                </DefaultAvatarIcon>
                              )}
                            </MemberAvatar>
                            <MemberInfo>
                              <MemberName>
                                {person.father.father.surname}{' '}
                                {person.father.father.name}
                              </MemberName>
                              <MemberRelation>조부</MemberRelation>
                              {person.father.father.birthYear && (
                                <MemberLifespan>
                                  {person.father.father.birthYear}
                                  {person.father.father.deathYear &&
                                    ` - ${person.father.father.deathYear}`}
                                </MemberLifespan>
                              )}
                              {person.father.father.country && (
                                <MemberCountry>
                                  🌍 {person.father.father.country.name}
                                </MemberCountry>
                              )}
                            </MemberInfo>
                          </FamilyMemberCardModern>
                        )}
                        {person.mother?.father && (
                          <FamilyMemberCardModern
                            as={motion.div}
                            whileHover={{ scale: 1.03, y: -4 }}
                            onClick={() =>
                              setSelectedFamilyMember({
                                ...person.mother!.father!,
                                relation: '외조부 (母父)',
                              })
                            }
                          >
                            <MemberAvatar $size="large">
                              {person.mother.father.profileImageUrl ? (
                                <img
                                  src={person.mother.father.profileImageUrl}
                                  alt={person.mother.father.name}
                                />
                              ) : (
                                <DefaultAvatarIcon>
                                  <svg
                                    width="40"
                                    height="40"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                  </svg>
                                </DefaultAvatarIcon>
                              )}
                            </MemberAvatar>
                            <MemberInfo>
                              <MemberName>
                                {person.mother.father.surname}{' '}
                                {person.mother.father.name}
                              </MemberName>
                              <MemberRelation>외조부</MemberRelation>
                              {person.mother.father.birthYear && (
                                <MemberLifespan>
                                  {person.mother.father.birthYear}
                                  {person.mother.father.deathYear &&
                                    ` - ${person.mother.father.deathYear}`}
                                </MemberLifespan>
                              )}
                              {person.mother.father.country && (
                                <MemberCountry>
                                  🌍 {person.mother.father.country.name}
                                </MemberCountry>
                              )}
                            </MemberInfo>
                          </FamilyMemberCardModern>
                        )}
                      </GenerationMembersRow>
                    </GenerationRow>
                  )}

                  {/* 부모 세대 */}
                  {(person.father || person.mother) && (
                    <>
                      <GenerationRow
                        as={motion.div}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                      >
                        <GenerationMembersRow>
                          {person.father && (
                            <FamilyMemberCardModern
                              as={motion.div}
                              whileHover={{ scale: 1.03, y: -4 }}
                              onClick={() =>
                                setSelectedFamilyMember({
                                  ...person.father!,
                                  relation: '부 (父)',
                                })
                              }
                            >
                              <MemberAvatar $size="large">
                                {person.father.profileImageUrl ? (
                                  <img
                                    src={person.father.profileImageUrl}
                                    alt={person.father.name}
                                  />
                                ) : (
                                  <DefaultAvatarIcon>
                                    <svg
                                      width="40"
                                      height="40"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                      <circle cx="12" cy="7" r="4" />
                                    </svg>
                                  </DefaultAvatarIcon>
                                )}
                              </MemberAvatar>
                              <MemberInfo>
                                <MemberName>
                                  {person.father.surname} {person.father.name}
                                </MemberName>
                                <MemberRelation>父</MemberRelation>
                                {person.father.birthYear && (
                                  <MemberLifespan>
                                    {person.father.birthYear}
                                    {person.father.deathYear &&
                                      ` - ${person.father.deathYear}`}
                                  </MemberLifespan>
                                )}
                                {person.father.country && (
                                  <MemberCountry>
                                    🌍 {person.father.country.name}
                                  </MemberCountry>
                                )}
                              </MemberInfo>
                            </FamilyMemberCardModern>
                          )}
                          {person.mother && (
                            <FamilyMemberCardModern
                              as={motion.div}
                              whileHover={{ scale: 1.03, y: -4 }}
                              onClick={() =>
                                setSelectedFamilyMember({
                                  ...person.mother!,
                                  relation: '모 (母)',
                                })
                              }
                            >
                              <MemberAvatar $size="large">
                                {person.mother.profileImageUrl ? (
                                  <img
                                    src={person.mother.profileImageUrl}
                                    alt={person.mother.name}
                                  />
                                ) : (
                                  <DefaultAvatarIcon>
                                    <svg
                                      width="40"
                                      height="40"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                      <circle cx="12" cy="7" r="4" />
                                    </svg>
                                  </DefaultAvatarIcon>
                                )}
                              </MemberAvatar>
                              <MemberInfo>
                                <MemberName>
                                  {person.mother.surname} {person.mother.name}
                                </MemberName>
                                <MemberRelation>母</MemberRelation>
                                {person.mother.birthYear && (
                                  <MemberLifespan>
                                    {person.mother.birthYear}
                                    {person.mother.deathYear &&
                                      ` - ${person.mother.deathYear}`}
                                  </MemberLifespan>
                                )}
                                {person.mother.country && (
                                  <MemberCountry>
                                    🌍 {person.mother.country.name}
                                  </MemberCountry>
                                )}
                              </MemberInfo>
                            </FamilyMemberCardModern>
                          )}
                        </GenerationMembersRow>
                      </GenerationRow>
                    </>
                  )}

                  {/* 본인 */}
                  <GenerationRow
                    as={motion.div}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                  >
                    <GenerationMembersRow>
                      <FamilyMemberCardModern $current>
                        <MemberAvatar $size="xlarge" $current>
                          {person.profileImageUrl ? (
                            <img src={person.profileImageUrl} alt={fullName} />
                          ) : (
                            <DefaultAvatarIcon>
                              <svg
                                width="48"
                                height="48"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                              </svg>
                            </DefaultAvatarIcon>
                          )}
                        </MemberAvatar>
                        <MemberInfo>
                          <MemberName style={{ color: 'white' }}>
                            {fullName}
                          </MemberName>
                          <MemberRelation
                            style={{
                              background: 'rgba(255, 255, 255, 0.25)',
                              color: 'white',
                            }}
                          >
                            本人
                          </MemberRelation>
                          <MemberLifespan
                            style={{ color: 'rgba(255, 255, 255, 0.9)' }}
                          >
                            {lifespanText}
                          </MemberLifespan>
                          {person.country && (
                            <MemberCountry
                              style={{ color: 'rgba(255, 255, 255, 0.9)' }}
                            >
                              🌍 {person.country.name}
                            </MemberCountry>
                          )}
                        </MemberInfo>
                      </FamilyMemberCardModern>
                    </GenerationMembersRow>
                  </GenerationRow>

                  {/* 자녀 세대 */}
                  {person.children && person.children.length > 0 && (
                    <>
                      <GenerationRow
                        as={motion.div}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.3 }}
                      >
                        <GenerationMembersRow>
                          {person.children.map((child: any, index: number) => (
                            <FamilyMemberCardModern
                              key={child.id}
                              as={motion.div}
                              whileHover={{ scale: 1.03, y: -4 }}
                              onClick={() =>
                                setSelectedFamilyMember({
                                  ...child,
                                  relation: '자 (子)',
                                })
                              }
                            >
                              <MemberAvatar $size="large">
                                {child.profileImageUrl ? (
                                  <img
                                    src={child.profileImageUrl}
                                    alt={child.name}
                                  />
                                ) : (
                                  <DefaultAvatarIcon>
                                    <svg
                                      width="40"
                                      height="40"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                      <circle cx="12" cy="7" r="4" />
                                    </svg>
                                  </DefaultAvatarIcon>
                                )}
                              </MemberAvatar>
                              <MemberInfo>
                                <MemberName>
                                  {child.surname} {child.name}
                                </MemberName>
                                <MemberRelation>子</MemberRelation>
                                {child.birthYear && (
                                  <MemberLifespan>
                                    {child.birthYear}
                                    {child.deathYear && ` - ${child.deathYear}`}
                                  </MemberLifespan>
                                )}
                                {child.country && (
                                  <MemberCountry>
                                    🌍 {child.country.name}
                                  </MemberCountry>
                                )}
                              </MemberInfo>
                            </FamilyMemberCardModern>
                          ))}
                        </GenerationMembersRow>
                      </GenerationRow>
                    </>
                  )}
                </GenealogyTreeModern>
              </>
            ) : (
              <EmptyStateModern
                as={motion.div}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <EmptyStateIconModern>
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </EmptyStateIconModern>
                <EmptyStateTitleModern>
                  가계도 정보가 없습니다
                </EmptyStateTitleModern>
                <EmptyStateDescriptionModern>
                  현재 등록된 가문 정보가 없습니다
                </EmptyStateDescriptionModern>
              </EmptyStateModern>
            )}
          </GenealogyContainer>
        </GenealogyDashboard>
      )}

      <Container>
        {activeTab === 'activities' && (
          <ActivitiesTabContent>
            <ActivitySection>
              {/* 조직 활동 */}
              <OrganizationCard
                as={motion.div}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              >
                <CardHeader>
                  <CardHeaderIcon>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 2l-5.5 9h11L12 2zm0 3.84L13.93 9h-3.87L12 5.84zM17.5 13c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zM3 21.5h8v-8H3v8zm2-6h4v4H5v-4z"
                        fill="currentColor"
                      />
                    </svg>
                  </CardHeaderIcon>
                  <CardTitle>조직 활동</CardTitle>
                </CardHeader>
                {person.organizationRoles &&
                person.organizationRoles.length > 0 ? (
                  <BadgeList>
                    {person.organizationRoles.map(
                      (role: {
                        id: string
                        organization: { name?: string; shortName?: string }
                        roleTitle: string
                        startDate?: string
                        endDate?: string
                      }) => (
                        <BadgeItem key={role.id} $color="#ad46ff">
                          <BadgeName>
                            {role.organization.name ||
                              role.organization.shortName}
                          </BadgeName>
                          <BadgeRole>{role.roleTitle}</BadgeRole>
                          {role.startDate && (
                            <BadgePeriod>
                              {new Date(role.startDate).getFullYear()}
                              {role.endDate
                                ? ` ~ ${new Date(role.endDate).getFullYear()}`
                                : ' ~ 현재'}
                            </BadgePeriod>
                          )}
                        </BadgeItem>
                      ),
                    )}
                  </BadgeList>
                ) : (
                  <EmptyStateCard>
                    <EmptyStateIcon>
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm14 0a6 6 0 1 1-12 0 6 6 0 0 1 12 0z"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </EmptyStateIcon>
                    <EmptyStateText>등록된 조직 활동이 없습니다</EmptyStateText>
                  </EmptyStateCard>
                )}
              </OrganizationCard>

              {/* 정당 활동 */}
              <PartyCard
                as={motion.div}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.25,
                  delay: 0.05,
                  ease: [0.4, 0, 0.2, 1],
                }}
              >
                <CardHeader>
                  <CardHeaderIcon>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zm-2 10H6V7h12v12zm-9-6c-.83 0-1.5-.67-1.5-1.5S8.17 10 9 10s1.5.67 1.5 1.5S9.83 13 9 13zm7.5-1.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5 1.5.67 1.5 1.5zM8 15h8v2H8v-2z"
                        fill="currentColor"
                      />
                    </svg>
                  </CardHeaderIcon>
                  <CardTitle>정당 활동</CardTitle>
                </CardHeader>
                {person.partyLeaderships &&
                person.partyLeaderships.length > 0 ? (
                  <BadgeList>
                    {person.partyLeaderships.map(
                      (leadership: {
                        id: string
                        party: { name?: string; shortName?: string }
                        roleTitle: string
                        startDate?: string
                        endDate?: string
                      }) => (
                        <BadgeItem key={leadership.id} $color="#ad46ff">
                          <BadgeName>
                            {leadership.party.name ||
                              leadership.party.shortName}
                          </BadgeName>
                          <BadgeRole>{leadership.roleTitle}</BadgeRole>
                          {leadership.startDate && (
                            <BadgePeriod>
                              {new Date(leadership.startDate).getFullYear()}
                              {leadership.endDate
                                ? ` ~ ${new Date(leadership.endDate).getFullYear()}`
                                : ' ~ 현재'}
                            </BadgePeriod>
                          )}
                        </BadgeItem>
                      ),
                    )}
                  </BadgeList>
                ) : (
                  <EmptyStateCard>
                    <EmptyStateIcon>
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          d="M3 21h18M5 21V7l8-4v18M19 21V10l-6-3"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </EmptyStateIcon>
                    <EmptyStateText>등록된 정당 활동이 없습니다</EmptyStateText>
                  </EmptyStateCard>
                )}
              </PartyCard>

              {/* 군 경력 */}
              <MilitaryCard
                as={motion.div}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.25,
                  delay: 0.1,
                  ease: [0.4, 0, 0.2, 1],
                }}
              >
                <CardHeader>
                  <CardHeaderIcon>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M17 10.43V2H7v8.43c0 .35.18.68.49.86l4.18 2.51-.99 2.34-3.41.29 2.59 2.24L9.07 22 12 20.23 14.93 22l-.78-3.33 2.59-2.24-3.41-.29-.99-2.34 4.18-2.51c.3-.18.48-.5.48-.86z"
                        fill="currentColor"
                      />
                    </svg>
                  </CardHeaderIcon>
                  <CardTitle>군 경력</CardTitle>
                </CardHeader>
                {person.militaryCommands &&
                person.militaryCommands.length > 0 ? (
                  <BadgeList>
                    {person.militaryCommands.map(
                      (command: {
                        id: string
                        unit: { name: string }
                        rank: string
                        role: string
                        startDate?: string
                        endDate?: string
                      }) => (
                        <BadgeItem key={command.id} $color="#ad46ff">
                          <BadgeName>{command.unit.name}</BadgeName>
                          <BadgeRole>
                            {command.rank} · {command.role}
                          </BadgeRole>
                          {command.startDate && (
                            <BadgePeriod>
                              {new Date(command.startDate).getFullYear()}
                              {command.endDate
                                ? ` ~ ${new Date(command.endDate).getFullYear()}`
                                : ' ~ 현재'}
                            </BadgePeriod>
                          )}
                        </BadgeItem>
                      ),
                    )}
                  </BadgeList>
                ) : (
                  <EmptyStateCard>
                    <EmptyStateIcon>
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </EmptyStateIcon>
                    <EmptyStateText>등록된 군 경력이 없습니다</EmptyStateText>
                  </EmptyStateCard>
                )}
              </MilitaryCard>

              {/* 주요 사건 */}
              <EventCard
                as={motion.div}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.25,
                  delay: 0.15,
                  ease: [0.4, 0, 0.2, 1],
                }}
              >
                <CardHeader>
                  <CardHeaderIcon>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"
                        fill="currentColor"
                      />
                    </svg>
                  </CardHeaderIcon>
                  <CardTitle>주요 사건</CardTitle>
                </CardHeader>
                {person.events && person.events.length > 0 ? (
                  <BadgeList>
                    {person.events.map(
                      (personEvent: {
                        id: string
                        event: { title: string; startDate?: string }
                        role?: string
                      }) => (
                        <BadgeItem key={personEvent.id} $color="#ad46ff">
                          <BadgeName>{personEvent.event.title}</BadgeName>
                          {personEvent.role && (
                            <BadgeRole>{personEvent.role}</BadgeRole>
                          )}
                          {personEvent.event.startDate && (
                            <BadgePeriod>
                              {new Date(
                                personEvent.event.startDate,
                              ).getFullYear()}
                            </BadgePeriod>
                          )}
                        </BadgeItem>
                      ),
                    )}
                  </BadgeList>
                ) : (
                  <EmptyStateCard>
                    <EmptyStateIcon>
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <rect
                          x="3"
                          y="4"
                          width="18"
                          height="18"
                          rx="2"
                          strokeWidth="1.5"
                        />
                        <path d="M16 2v4M8 2v4m-5 4h18" strokeWidth="1.5" />
                      </svg>
                    </EmptyStateIcon>
                    <EmptyStateText>등록된 주요 사건이 없습니다</EmptyStateText>
                  </EmptyStateCard>
                )}
              </EventCard>
            </ActivitySection>
          </ActivitiesTabContent>
        )}

        {/* 저작 탭 */}
        {activeTab === 'works' && (
          <WorksTabContent>
            <WorksSection>
              {/* 저서 */}
              <BookCard
                as={motion.div}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              >
                <CardHeader>
                  <CardHeaderIcon>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"
                        fill="currentColor"
                      />
                    </svg>
                  </CardHeaderIcon>
                  <CardTitle>저서</CardTitle>
                </CardHeader>
                {person.books && person.books.length > 0 ? (
                  <BookShelf>
                    {person.books.map(
                      (book: {
                        id: string
                        title: string
                        publishedYear?: number
                      }) => (
                        <BookItem key={book.id}>
                          <BookIcon>📖</BookIcon>
                          <BookInfo>
                            <BookTitle>{book.title}</BookTitle>
                            {book.publishedYear && (
                              <BookYear>{book.publishedYear}년 출간</BookYear>
                            )}
                          </BookInfo>
                        </BookItem>
                      ),
                    )}
                  </BookShelf>
                ) : (
                  <EmptyStateCard>
                    <EmptyStateIcon>
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20M4 19.5V6.5A2.5 2.5 0 0 1 6.5 4H20v18"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </EmptyStateIcon>
                    <EmptyStateText>등록된 저서가 없습니다</EmptyStateText>
                  </EmptyStateCard>
                )}
              </BookCard>

              {/* 창업 조직 */}
              <CompanyCard
                as={motion.div}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.25,
                  delay: 0.05,
                  ease: [0.4, 0, 0.2, 1],
                }}
              >
                <CardHeader>
                  <CardHeaderIcon>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"
                        fill="currentColor"
                      />
                    </svg>
                  </CardHeaderIcon>
                  <CardTitle>창업 조직</CardTitle>
                </CardHeader>
                {person.foundedCompanies &&
                person.foundedCompanies.length > 0 ? (
                  <TimelineList>
                    {person.foundedCompanies.map(
                      (company: {
                        id: string
                        name: string
                        foundedAt?: string
                      }) => (
                        <TimelineItem key={company.id}>
                          <TimelineDot $color="#ad46ff" />
                          <TimelineContent>
                            <TimelineName>{company.name}</TimelineName>
                            {company.foundedAt && (
                              <TimelineDate>
                                {new Date(company.foundedAt).getFullYear()}년
                                설립
                              </TimelineDate>
                            )}
                          </TimelineContent>
                        </TimelineItem>
                      ),
                    )}
                  </TimelineList>
                ) : (
                  <EmptyStateCard>
                    <EmptyStateIcon>
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <rect
                          x="3"
                          y="3"
                          width="18"
                          height="18"
                          rx="2"
                          strokeWidth="1.5"
                        />
                        <path d="M9 11h6m-6 4h6" strokeWidth="1.5" />
                      </svg>
                    </EmptyStateIcon>
                    <EmptyStateText>등록된 창업 조직가 없습니다</EmptyStateText>
                  </EmptyStateCard>
                )}
              </CompanyCard>

              {/* 관련 조직 */}
              <CompanyCard
                as={motion.div}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.25,
                  delay: 0.1,
                  ease: [0.4, 0, 0.2, 1],
                }}
              >
                <CardHeader>
                  <CardHeaderIcon>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"
                        fill="currentColor"
                      />
                    </svg>
                  </CardHeaderIcon>
                  <CardTitle>관련 조직</CardTitle>
                </CardHeader>
                {person.companies && person.companies.length > 0 ? (
                  <BadgeList>
                    {person.companies.map(
                      (company: {
                        id: string
                        name: string
                        foundedAt?: string
                      }) => (
                        <BadgeItem
                          key={company.id}
                          $color="var(--color-primary)"
                        >
                          <BadgeName>{company.name}</BadgeName>
                          {company.foundedAt && (
                            <BadgePeriod>
                              {new Date(company.foundedAt).getFullYear()}년
                            </BadgePeriod>
                          )}
                        </BadgeItem>
                      ),
                    )}
                  </BadgeList>
                ) : (
                  <EmptyStateCard>
                    <EmptyStateIcon>
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <rect
                          x="3"
                          y="3"
                          width="18"
                          height="18"
                          rx="2"
                          strokeWidth="1.5"
                        />
                        <path d="M9 11h6m-6 4h6" strokeWidth="1.5" />
                      </svg>
                    </EmptyStateIcon>
                    <EmptyStateText>등록된 관련 조직가 없습니다</EmptyStateText>
                  </EmptyStateCard>
                )}
              </CompanyCard>
            </WorksSection>
          </WorksTabContent>
        )}
      </Container>

      {/* 가족 구성원 모달 */}
      <AnimatePresence>
        {selectedFamilyMember && (
          <>
            <ModalOverlay
              as={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedFamilyMember(null)}
            />
            <ModalContent
              as={motion.div}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.2 }}
            >
              <ModalHeader>
                <ModalTitle>가족 정보</ModalTitle>
                <ModalClose onClick={() => setSelectedFamilyMember(null)}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M18 6L6 18M6 6l12 12"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </ModalClose>
              </ModalHeader>
              <ModalBody>
                <ModalProfileSection>
                  <ModalAvatar>
                    {selectedFamilyMember.profileImageUrl ? (
                      <img
                        src={selectedFamilyMember.profileImageUrl}
                        alt={selectedFamilyMember.name}
                      />
                    ) : (
                      '👤'
                    )}
                  </ModalAvatar>
                  <ModalProfileInfo>
                    <ModalProfileName>
                      {selectedFamilyMember.surname} {selectedFamilyMember.name}
                    </ModalProfileName>
                    <ModalProfileRelation>
                      {selectedFamilyMember.relation}
                    </ModalProfileRelation>
                  </ModalProfileInfo>
                </ModalProfileSection>

                {selectedFamilyMember.job && (
                  <ModalInfoRow>
                    <ModalInfoLabel>직업</ModalInfoLabel>
                    <ModalInfoValue>
                      {selectedFamilyMember.job.title}
                    </ModalInfoValue>
                  </ModalInfoRow>
                )}

                {(selectedFamilyMember.birthYear ||
                  selectedFamilyMember.deathYear) && (
                  <ModalInfoRow>
                    <ModalInfoLabel>생몰년</ModalInfoLabel>
                    <ModalInfoValue>
                      {selectedFamilyMember.birthYear || '?'} ~{' '}
                      {selectedFamilyMember.deathYear || '생존'}
                    </ModalInfoValue>
                  </ModalInfoRow>
                )}

                <ModalFooter>
                  <ModalButton
                    onClick={() => {
                      navigate(`/history/persons/${selectedFamilyMember.id}`)
                      setSelectedFamilyMember(null)
                    }}
                  >
                    상세 정보 보기
                  </ModalButton>
                </ModalFooter>
              </ModalBody>
            </ModalContent>
          </>
        )}
      </AnimatePresence>
    </ModernWrap>
  )
}

// ==================== Styled Components ====================

// 디자인 시스템 변수
const colors = {
  primary: '#2563eb',
  primaryLight: '#3b82f6',
  primaryDark: '#1d4ed8',
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    tertiary: '#94a3b8',
  },
  border: {
    light: '#f1f5f9',
    default: '#e2e8f0',
    dark: '#cbd5e1',
  },
  background: {
    white: '#ffffff',
    gray: '#f8fafc',
    hover: '#f1f5f9',
  },
  danger: '#dc2626',
}

const ModernWrap = styled.div`
  min-height: 100vh;
  background: #fafafa;
  padding-top: var(--header-height, 64px);
`

const PageHeader = styled.div`
  background: white;
  border-bottom: 1px solid ${colors.border.default};
  padding: 20px 48px;
  display: flex;
  align-items: center;
  gap: 24px;
  position: sticky;
  top: var(--header-height, 64px);
  z-index: 200;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  @media (max-width: 768px) {
    padding: 16px 24px;
    gap: 16px;
  }
`

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    stroke-width: 2.5;
  }

  @media (max-width: 768px) {
    padding: 8px 16px;
    font-size: 13px;
  }
`

const PageTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
`

const PageTitleIcon = styled.div`
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #f3e8ff, #e9d5ff);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  border: 2px solid rgba(99, 102, 241, 0.2);

  @media (max-width: 768px) {
    width: 36px;
    height: 36px;
    font-size: 18px;
  }
`

const PageTitleText = styled.h1`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #0f172a, #6366f1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.5px;

  @media (max-width: 768px) {
    font-size: 18px;
  }
`

const Header = styled.header`
  background: white;
  border-bottom: 1px solid ${colors.border.default};
  position: sticky;
  top: 0;
  z-index: 1000;
`

const HeaderContent = styled.div`
  width: 100%;
  padding: 40px 48px;
  display: flex;
  flex-direction: column;
  gap: 0;

  @media (max-width: 768px) {
    padding: 28px 24px;
  }
`

const ProfileHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 32px;

  @media (max-width: 1200px) {
    flex-wrap: wrap;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
  }
`

const ProfileLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 32px;
  flex: 0 0 auto;
`

const ProfileCenter = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 250px;
`

const InfoCompact = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
`

const InfoCompactItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: ${colors.background.gray};
  border: 1px solid ${colors.border.light};
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: ${colors.text.secondary};
  transition: all 0.2s ease;

  span {
    font-size: 16px;
  }

  &:hover {
    background: white;
    border-color: ${colors.primary};
  }
`

const ProfileBasic = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const QuickInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 8px;
`

const QuickInfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: ${colors.text.secondary};
  font-weight: 500;

  span {
    font-size: 16px;
  }
`

const ProfileRight = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  flex: 0 0 auto;
`

const DetailCards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid ${colors.border.light};
`

const DetailCard = styled.div`
  background: white;
  border: 1px solid ${colors.border.light};
  border-radius: 12px;
  padding: 16px 20px;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${colors.primary};
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.08);
  }
`

const CardTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 12px;
`

const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const DetailItem = styled.div`
  display: grid;
  grid-template-columns: 24px 70px 1fr;
  align-items: center;
  gap: 12px;
`

const DetailIcon = styled.span`
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
`

const DetailLabel = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${colors.text.secondary};
`

const DetailValue = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${colors.text.primary};
`

const HeaderStats = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 24px;
  background: white;
  border: 1px solid ${colors.border.default};
  border-radius: 12px;

  @media (max-width: 1200px) {
    gap: 16px;
    padding: 12px 20px;
  }

  @media (max-width: 768px) {
    flex-wrap: wrap;
    gap: 12px;
  }
`

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0 16px;
  position: relative;

  &:not(:last-child)::after {
    content: '';
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 1px;
    height: 32px;
    background: ${colors.border.light};
  }

  &:first-child {
    padding-left: 0;
  }

  &:last-child {
    padding-right: 0;
  }
`

const StatValue = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: ${colors.primary};
  line-height: 1;
  background: linear-gradient(
    135deg,
    ${colors.primary} 0%,
    ${colors.primaryLight} 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

const StatLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const IconButton = styled.button<{ $variant?: 'danger' }>`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 1px solid ${colors.border.default};
  border-radius: 10px;
  color: ${(props) =>
    props.$variant === 'danger' ? colors.danger : colors.text.secondary};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) =>
      props.$variant === 'danger'
        ? 'rgba(220, 38, 38, 0.05)'
        : colors.background.hover};
    border-color: ${(props) =>
      props.$variant === 'danger' ? colors.danger : colors.primary};
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    stroke-width: 2;
  }
`

const ProfileSection = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 28px;
  flex: 1;
  min-width: 0;
`

const AvatarContainer = styled.div`
  position: relative;
`

const Avatar = styled.div`
  width: 180px;
  height: 180px;
  border-radius: 28px;
  overflow: hidden;
  background: ${colors.background.gray};
  border: 4px solid white;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.05),
    0 10px 30px rgba(0, 0, 0, 0.1);
  position: relative;
  flex-shrink: 0;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 28px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    pointer-events: none;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  @media (max-width: 768px) {
    width: 140px;
    height: 140px;
  }
`

const ProfileInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
`

const PersonName = styled.h1`
  margin: 0;
  font-size: 52px;
  font-weight: 700;
  color: ${colors.text.primary};
  letter-spacing: -1.5px;
  line-height: 1.1;

  @media (max-width: 768px) {
    font-size: 40px;
    letter-spacing: -1px;
  }
`

const JobTitle = styled.div`
  font-size: 20px;
  font-weight: 500;
  color: ${colors.text.secondary};
  line-height: 1.4;

  @media (max-width: 768px) {
    font-size: 18px;
  }
`

const PersonMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
`

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  width: 100%;
  max-width: 100%;
`

const MetaColumn = styled.div`
  display: flex;
  flex-direction: column;
`

const MetaSection = styled.div`
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid ${colors.border.light};
  border-radius: 12px;
  padding: 16px;
  height: 100%;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${colors.primary};
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
    transform: translateY(-2px);
  }
`

const MetaSectionTitle = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid ${colors.border.default};
`

const MetaList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const MetaItem = styled.div`
  display: grid;
  grid-template-columns: 24px 60px 1fr;
  align-items: center;
  gap: 8px;
`

const MetaLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${colors.text.secondary};
`

const MetaValue = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${colors.text.primary};
`

const MetaChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  background: white;
  border: 1px solid ${colors.border.default};
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  color: ${colors.text.secondary};
  transition: all 0.2s ease;

  &:hover {
    border-color: ${colors.primary};
  }
`

const CountryFlag = styled.img`
  width: 24px;
  height: 18px;
  object-fit: cover;
  border-radius: 3px;
`

const MetaIcon = styled.span`
  font-size: 18px;
  line-height: 1;
  display: flex;
  align-items: center;
`

const MetaText = styled.span``

const TabNav = styled.nav`
  background: white;
  border-bottom: 1px solid ${colors.border.default};
  position: sticky;
  top: calc(var(--header-height, 64px) + 80px);
  z-index: 100;

  @media (max-width: 768px) {
    top: calc(var(--header-height, 64px) + 68px);
  }
`

const TabNavInner = styled.div`
  max-width: 1920px;
  margin: 0 auto;
  padding: 0 48px;
  display: flex;
  gap: 4px;

  @media (max-width: 768px) {
    padding: 0 24px;
  }
`

const TabButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid
    ${(props) => (props.$active ? colors.primary : 'transparent')};
  color: ${(props) => (props.$active ? colors.primary : colors.text.tertiary)};
  font-size: 14px;
  font-weight: ${(props) => (props.$active ? '600' : '500')};
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    color: ${(props) =>
      props.$active ? colors.primary : colors.text.secondary};
  }

  svg {
    stroke-width: 2;
  }
`

const Wrap = styled.div`
  min-height: 100vh;
  background: #fafafa;
`

const MockToggle = styled.button`
  position: fixed;
  top: 16px;
  right: 16px;
  padding: 8px 16px;
  background: white;
  color: ${colors.text.secondary};
  border: 1px solid ${colors.border.default};
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  z-index: 2000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.15s ease;

  &:hover {
    background: ${colors.background.hover};
    border-color: ${colors.border.dark};
  }
`

const Container = styled.div`
  max-width: 1280px;
  margin: 0 auto;
  padding: 32px 40px 80px;

  @media (max-width: 768px) {
    padding: 24px 24px 60px;
  }
`

// 개요 탭 컨테이너
const OverviewContainer = styled.div`
  width: 100%;
  min-width: 320px;
  max-width: 1920px;
  margin: 0 auto;
  padding: 0;
  background: linear-gradient(to bottom, #fafafa 0%, white 100%);
`

const Content = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
  padding: 0;

  @media (max-width: 768px) {
    gap: 24px;
  }
`

const MainSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
  width: 100%;
`

const SideSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const BiographyCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid ${colors.border.default};
`

const Biography = styled.p`
  font-size: 14px;
  line-height: 1.7;
  color: ${colors.text.secondary};
  margin: 0;
  white-space: pre-wrap;
`

const InfoCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid ${colors.border.default};
`

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
`

const CardHeaderIcon = styled.div`
  color: ${colors.primary};
  line-height: 1;
  display: flex;
  align-items: center;

  svg {
    display: block;
  }
`

const InfoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid ${colors.border.light};
  border-radius: 8px;
  overflow: hidden;
`

const InfoListItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid ${colors.border.light};
  transition: background 0.15s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${colors.background.gray};
  }
`

const InfoItemIcon = styled.div`
  font-size: 20px;
  line-height: 1;
  flex-shrink: 0;
`

const InfoItemContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const InfoItemLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const InfoItemValue = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${colors.text.primary};
`

const LoadingMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  font-size: 14px;
  font-weight: 500;
  color: ${colors.text.secondary};
  text-align: center;
  padding: 80px 24px;
`

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid ${colors.border.light};
  border-top: 3px solid ${colors.primary};
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`

const ErrorMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 80px 24px;
`

const ErrorIcon = styled.div`
  font-size: 48px;
`

const ErrorTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: ${colors.danger};
  margin: 0;
`

const ErrorDescription = styled.p`
  font-size: 14px;
  color: ${colors.text.secondary};
  text-align: center;
  line-height: 1.6;
  margin: 0;
`

const EmptyState = styled.div`
  padding: 40px 24px;
  text-align: center;
  color: ${colors.text.tertiary};
  font-size: 14px;
  font-weight: 500;
  background: white;
  border-radius: 12px;
  border: 1px solid ${colors.border.default};
`

const EmptyStateCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  gap: 12px;
  background: ${colors.background.gray};
  border-radius: 8px;
`

const EmptyStateIcon = styled.div`
  color: ${colors.border.dark};

  svg {
    display: block;
  }
`

const EmptyStateText = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${colors.text.tertiary};
`

const BackButtonFloating = styled.button`
  padding: 10px 16px;
  background: white;
  border: 1px solid ${colors.border.default};
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: ${colors.text.secondary};
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: ${colors.background.hover};
    border-color: ${colors.border.dark};
  }
`

// 소속 정보 (Affiliation) 전용 스타일
const AffiliationCard = styled(InfoCard)``

const AffiliationGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const AffiliationItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: ${colors.background.gray};
  border: 1px solid ${colors.border.light};
  border-radius: 8px;
  transition: all 0.15s ease;

  &:hover {
    background: ${colors.background.hover};
  }
`

const AffiliationIconWrapper = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: white;
  border-radius: 8px;
  flex-shrink: 0;
  color: ${colors.primary};

  svg {
    display: block;
  }
`

const AffiliationContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const AffiliationLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const AffiliationValue = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${colors.text.primary};
`

// 가족 관계 (Family) 전용 스타일
const FamilyCard = styled(InfoCard)``

const FamilyTreeContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const FamilyMemberCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: ${colors.background.gray};
  border: 1px solid ${colors.border.light};
  border-radius: 8px;
  transition: all 0.15s ease;
  cursor: pointer;

  &:hover {
    background: ${colors.background.hover};
    border-color: ${colors.border.dark};
  }
`

const FamilyRoleTag = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  background: ${colors.primary};
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
  letter-spacing: 0.3px;
  min-width: 56px;
  justify-content: center;
`

const FamilyMemberName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${colors.text.primary};
  flex: 1;
`

// 창업 조직 (Company) 전용 스타일 - 타임라인
const CompanyCard = styled(InfoCard)``

// Dynasty (가문) 전용 스타일
const DynastyCard = styled(InfoCard)``

const TimelineList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-left: 12px;
  border-left: 2px solid ${colors.border.default};
`

const TimelineItem = styled.div`
  position: relative;
  padding: 12px 0 12px 20px;

  &:not(:last-child) {
    border-bottom: 1px solid ${colors.border.light};
  }
`

const TimelineDot = styled.div<{ $color: string }>`
  position: absolute;
  left: -7px;
  top: 16px;
  width: 12px;
  height: 12px;
  background: ${(props) => props.$color};
  border: 2px solid white;
  border-radius: 50%;
`

const TimelineContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const TimelineName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${colors.text.primary};
`

const TimelineDate = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${colors.text.tertiary};
`

// 저서 (Book) 전용 스타일
const BookCard = styled(InfoCard)``

const BookShelf = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const BookItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: ${colors.background.gray};
  border: 1px solid ${colors.border.light};
  border-radius: 8px;
  transition: all 0.15s ease;

  &:hover {
    background: ${colors.background.hover};
  }
`

const BookIcon = styled.div`
  font-size: 24px;
  line-height: 1;
  flex-shrink: 0;
`

const BookInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
`

const BookTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${colors.text.primary};
`

const BookYear = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${colors.text.tertiary};
`

// 활동 카드 (조직/정당/군/사건) 전용 스타일 - 배지 형태
const OrganizationCard = styled(InfoCard)``
const PartyCard = styled(InfoCard)``
const MilitaryCard = styled(InfoCard)``
const EventCard = styled(InfoCard)``

const BadgeList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const BadgeItem = styled.div<{ $color: string }>`
  position: relative;
  padding: 12px 16px;
  background: ${colors.background.gray};
  border-left: 3px solid ${(props) => props.$color};
  border-radius: 8px;
  transition: all 0.15s ease;

  &:hover {
    background: ${colors.background.hover};
  }
`

const BadgeName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${colors.text.primary};
  margin-bottom: 4px;
`

const BadgeRole = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${colors.text.secondary};
  margin-bottom: 2px;
`

const BadgePeriod = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${colors.text.tertiary};
`

// 이미지 갤러리 스타일 - 매거진 레이아웃
const ImageGalleryCard = styled(InfoCard)`
  grid-column: 1 / -1;
  padding: 0;
  overflow: hidden;
  border: none;
  background: transparent;
  box-shadow: none;
`

const MagazineLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(400px, 600px) 1fr;
  gap: 48px;
  width: 100%;
  padding: 0 48px;

  @media (max-width: 1400px) {
    grid-template-columns: minmax(350px, 500px) 1fr;
    gap: 40px;
    padding: 0 40px;
  }

  @media (max-width: 1200px) {
    grid-template-columns: minmax(320px, 450px) 1fr;
    gap: 32px;
    padding: 0 32px;
  }

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 32px;
    padding: 0 24px;
  }

  @media (max-width: 768px) {
    padding: 0 16px;
  }
`

const ImageSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const MainImageContainer = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 3/4;
  max-height: 600px;
  border-radius: 20px;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);

  @media (max-width: 1024px) {
    max-height: 500px;
  }

  @media (max-width: 768px) {
    aspect-ratio: 4/5;
    max-height: 450px;
    border-radius: 16px;
  }
`

const HeroImageWrapper = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const ImageNavButton = styled.button<{ $position: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  ${(props) => props.$position}: 16px;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  svg {
    color: ${colors.text.primary};
  }

  &:hover {
    background: white;
    transform: translateY(-50%) scale(1.1);
  }

  @media (max-width: 768px) {
    width: 36px;
    height: 36px;
    ${(props) => props.$position}: 12px;
  }
`

const ImageProgressDots = styled.div`
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 2;
`

const ProgressDot = styled.button<{ $active: boolean }>`
  width: ${(props) => (props.$active ? '24px' : '8px')};
  height: 8px;
  background: ${(props) =>
    props.$active ? 'white' : 'rgba(255, 255, 255, 0.5)'};
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: white;
  }
`

const ImageInfoPanel = styled.div`
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid ${colors.border.light};
`

const ImageTypeBadge = styled.div<{ $type: string }>`
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  background: ${colors.background.hover};
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: ${colors.text.secondary};
  margin-bottom: 12px;
`

const ImageInfoTitle = styled.h3`
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 700;
  color: ${colors.text.primary};
  line-height: 1.3;
`

const ImageInfoDescription = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${colors.text.tertiary};
`

const InfoSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: sticky;
  top: 80px;
  align-self: flex-start;
  max-height: calc(100vh - 100px);
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: ${colors.border.light};
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${colors.border.dark};
    border-radius: 3px;
  }

  @media (max-width: 1024px) {
    position: static;
    max-height: none;
    overflow-y: visible;
  }
`

const InfoHeader = styled.div`
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid ${colors.border.light};
`

const InfoTitle = styled.h2`
  margin: 0 0 8px;
  font-size: 32px;
  font-weight: 700;
  color: ${colors.text.primary};
  line-height: 1.2;
  letter-spacing: -0.5px;

  @media (max-width: 768px) {
    font-size: 28px;
  }
`

const InfoSubtitle = styled.p`
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: ${colors.text.secondary};
`

const InfoCards = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const InfoCardItem = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid ${colors.border.light};
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: ${colors.primary};
    transform: translateX(4px);
  }
`

const InfoCardIcon = styled.div`
  font-size: 28px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${colors.background.hover};
  border-radius: 10px;
  flex-shrink: 0;
`

const InfoCardContent = styled.div`
  flex: 1;
  min-width: 0;
`

const InfoCardLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`

const InfoCardValue = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const BiographySection = styled.div`
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid ${colors.border.light};
`

const BiographySectionTitle = styled.h3`
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 700;
  color: ${colors.text.primary};
`

const BiographyText = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: ${colors.text.secondary};
`

const ImageGallery = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const MainImage = styled.div`
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 16px;
  overflow: hidden;
  background: ${colors.background.gray};
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border: 1px solid ${colors.border.light};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  &:hover img {
    transform: scale(1.02);
  }
`

const ThumbnailList = styled.div`
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 4px 0;

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: ${colors.border.light};
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${colors.border.dark};
    border-radius: 3px;
  }
`

const ThumbnailItem = styled.div<{ $active?: boolean }>`
  width: 96px;
  height: 72px;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
  border: 3px solid
    ${(props) => (props.$active ? colors.primary : colors.border.light)};
  transition: all 0.2s ease;

  &:hover {
    border-color: ${colors.primary};
    transform: translateY(-2px);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const EmptyImagePlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  color: ${colors.border.dark};

  p {
    margin-top: 12px;
    font-size: 13px;
    font-weight: 500;
    color: ${colors.text.tertiary};
  }
`

// 가계도 스타일
const GenealogyTabContent = styled.div`
  padding: 32px 0;
`

const GenealogySection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1280px;
  margin: 0 auto;
`

const ActivitiesTabContent = styled.div`
  padding: 32px 0;
`

const ActivitySection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1280px;
  margin: 0 auto;
`

const WorksTabContent = styled.div`
  padding: 32px 0;
`

const WorksSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1280px;
  margin: 0 auto;
`

const GenealogyTree = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 24px 0;
`

const Generation = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;

  &:not(:last-child)::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -16px;
    transform: translateX(-50%);
    width: 2px;
    height: 16px;
    background: ${colors.border.default};
  }
`

const GenerationLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${colors.primary};
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 6px 16px;
  background: rgba(37, 99, 235, 0.05);
  border-radius: 16px;
  display: inline-block;
  margin: 0 auto;
  border: 1px solid rgba(37, 99, 235, 0.1);
`

const GenerationMembers = styled.div`
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
`

const FamilyMemberNode = styled.div<{ $current?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px 16px;
  background: ${(props) => (props.$current ? colors.primary : 'white')};
  border: 1px solid
    ${(props) => (props.$current ? colors.primary : colors.border.default)};
  border-radius: 12px;
  cursor: ${(props) => (props.$current ? 'default' : 'pointer')};
  transition: all 0.15s ease;
  min-width: 140px;

  &:hover {
    ${(props) =>
      !props.$current &&
      `
      border-color: ${colors.primary};
      background: ${colors.background.hover};
    `}
  }
`

const NodeAvatar = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  background: ${colors.background.gray};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  border: 2px solid transparent;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  ${FamilyMemberNode}[data-current='true'] & {
    border-color: rgba(255, 255, 255, 0.3);
  }
`

const NodeName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${colors.text.primary};
  text-align: center;
  line-height: 1.3;

  ${FamilyMemberNode}[data-current='true'] & {
    color: white;
  }
`

const NodeRelation = styled.div`
  font-size: 10px;
  font-weight: 600;
  color: ${colors.primary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 4px 10px;
  background: rgba(37, 99, 235, 0.08);
  border-radius: 8px;

  ${FamilyMemberNode}[data-current='true'] & {
    color: white;
    background: rgba(255, 255, 255, 0.15);
  }
`

// 모달 스타일
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  z-index: 9998;
`

const ModalContent = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  width: 90%;
  max-width: 480px;
  max-height: 80vh;
  overflow: auto;
`

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid ${colors.border.default};
`

const ModalTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${colors.text.primary};
  margin: 0;
`

const ModalClose = styled.button`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: ${colors.text.secondary};
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: ${colors.background.gray};
    color: ${colors.text.primary};
  }
`

const ModalBody = styled.div`
  padding: 20px;
`

const ModalProfileSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
`

const ModalAvatar = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  background: ${colors.background.gray};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const ModalProfileInfo = styled.div`
  flex: 1;
`

const ModalProfileName = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: ${colors.text.primary};
  margin-bottom: 4px;
`

const ModalProfileRelation = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${colors.primary};
`

const ModalInfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid ${colors.border.light};

  &:last-child {
    border-bottom: none;
  }
`

const ModalInfoLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const ModalInfoValue = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${colors.text.primary};
`

const ModalFooter = styled.div`
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid ${colors.border.default};
`

const ModalButton = styled.button`
  width: 100%;
  padding: 12px 20px;
  background: ${colors.primary};
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: ${colors.primaryDark};
  }

  &:active {
    transform: scale(0.98);
  }
`

// ==================== 새로운 대시보드 스타일 ====================

// 대시보드 전체 컨테이너 (여백 없음)
const OverviewDashboard = styled.div`
  width: 100%;
  background: #fafafa;
  padding-bottom: 80px;
`

// 히어로 섹션
const DashboardHero = styled.div`
  width: 100%;
  margin-bottom: 40px;
`

const HeroImageSlideshow = styled.div`
  position: relative;
  width: 100%;
  height: 400px;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

  /* 양옆 흐림 효과 */
  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 20%;
    z-index: 2;
    pointer-events: none;
  }

  &::before {
    left: 0;
    background: linear-gradient(
      to right,
      rgba(0, 0, 0, 0.5) 0%,
      rgba(0, 0, 0, 0.3) 30%,
      transparent 100%
    );
    backdrop-filter: blur(8px);
  }

  &::after {
    right: 0;
    background: linear-gradient(
      to left,
      rgba(0, 0, 0, 0.5) 0%,
      rgba(0, 0, 0, 0.3) 30%,
      transparent 100%
    );
    backdrop-filter: blur(8px);
  }

  @media (max-width: 768px) {
    height: 300px;
  }
`

const HeroSlideImage = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }
`

const HeroOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.3) 0%,
    rgba(0, 0, 0, 0.6) 100%
  );
`

const HeroContent = styled.div`
  position: absolute;
  bottom: 40px;
  left: 48px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 20px;

  @media (max-width: 768px) {
    left: 24px;
    bottom: 24px;
  }
`

const HeroIcon = styled.div`
  width: 64px;
  height: 64px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  border: 2px solid rgba(255, 255, 255, 0.2);

  @media (max-width: 768px) {
    width: 48px;
    height: 48px;
    font-size: 24px;
  }
`

const HeroTextGroup = styled.div`
  flex: 1;
`

const HeroTitle = styled.h1`
  margin: 0;
  font-size: 42px;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  letter-spacing: -1px;
  line-height: 1.2;

  @media (max-width: 768px) {
    font-size: 32px;
  }
`

const HeroSubtitle = styled.p`
  margin: 8px 0 0;
  font-size: 18px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);

  @media (max-width: 768px) {
    font-size: 16px;
  }
`

// 메트릭 그리드
const DashboardMetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  max-width: 1920px;
  margin: 0 auto;
  padding: 0 48px;
  margin-top: -60px;
  position: relative;
  z-index: 20;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    padding: 0 24px;
    margin-top: -40px;
  }
`

const DashboardMetricCard = styled.div`
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid ${colors.border.light};
  display: flex;
  align-items: center;
  gap: 20px;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    transform: translateY(-2px);
  }
`

const MetricIcon = styled.div`
  width: 56px;
  height: 56px;
  background: ${colors.background.hover};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${colors.primary};
  flex-shrink: 0;

  svg {
    display: block;
  }
`

const MetricContent = styled.div`
  flex: 1;
  min-width: 0;
`

const MetricLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
`

const MetricValue = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: ${colors.primary};
  line-height: 1;
  margin-bottom: 4px;
`

const MetricSubtext = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${colors.text.secondary};
`

// 섹션 타이틀
const DashboardSectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 1920px;
  margin: 48px auto 24px;
  padding: 0 48px;

  @media (max-width: 768px) {
    padding: 0 24px;
    margin: 36px auto 20px;
  }
`

const SectionTitleIcon = styled.div`
  font-size: 24px;
  line-height: 1;
`

const SectionTitleText = styled.h2`
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: ${colors.text.primary};
  letter-spacing: -0.5px;

  @media (max-width: 768px) {
    font-size: 20px;
  }
`

// 2단 그리드
const DashboardTwoColumnGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  max-width: 1920px;
  margin: 0 auto;
  padding: 0 48px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 768px) {
    padding: 0 24px;
  }
`

// 활동 그리드 (4단)
const DashboardActivityGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  max-width: 1920px;
  margin: 0 auto;
  padding: 0 48px;

  @media (max-width: 1400px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    padding: 0 24px;
  }
`

// 위젯 (카드)
const DashboardWidget = styled.div`
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid ${colors.border.light};
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }
`

const WidgetHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid ${colors.border.light};
`

const WidgetIcon = styled.div`
  width: 36px;
  height: 36px;
  background: ${colors.background.hover};
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${colors.primary};
  flex-shrink: 0;

  svg {
    display: block;
  }
`

const WidgetTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: ${colors.text.primary};
`

const WidgetContent = styled.div`
  /* 내용 영역 */
`

// 활동 리스트
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
  background: ${colors.background.gray};
  border-radius: 8px;
  transition: all 0.15s ease;

  &:hover {
    background: ${colors.background.hover};
  }
`

const ActivityDot = styled.div`
  width: 8px;
  height: 8px;
  background: ${colors.primary};
  border-radius: 50%;
  flex-shrink: 0;
`

const ActivityName = styled.div`
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: ${colors.text.primary};
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ActivityValue = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${colors.text.tertiary};
  flex-shrink: 0;
`

// ==================== 새로운 가계도 스타일 ====================

const GenealogyDashboard = styled.div`
  width: 100%;
  background: #fafafa;
  padding-bottom: 80px;
`

const DynastyHero = styled.div`
  width: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 48px 0;

  @media (max-width: 768px) {
    padding: 32px 0;
  }
`

const DynastyHeroContent = styled.div`
  max-width: 1920px;
  margin: 0 auto;
  padding: 0 48px;
  display: flex;
  align-items: center;
  gap: 24px;

  @media (max-width: 768px) {
    padding: 0 24px;
    gap: 16px;
  }
`

const DynastyHeroIcon = styled.div`
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: 60px;
    height: 60px;
    font-size: 30px;
  }
`

const DynastyHeroText = styled.div`
  flex: 1;
`

const DynastyHeroTitle = styled.h1`
  margin: 0;
  font-size: 48px;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  letter-spacing: -1px;
  line-height: 1.2;

  @media (max-width: 768px) {
    font-size: 32px;
  }
`

const DynastyHeroSubtitle = styled.p`
  margin: 8px 0 0;
  font-size: 20px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);

  @media (max-width: 768px) {
    font-size: 16px;
  }
`

const GenealogyContainer = styled.div`
  max-width: 1920px;
  margin: 0 auto;
  padding: 48px 48px 0;

  @media (max-width: 768px) {
    padding: 32px 24px 0;
  }
`

const GenealogyTreeModern = styled.div`
  display: flex;
  flex-direction: column;
  gap: 48px;
  padding: 40px 0;

  @media (max-width: 768px) {
    gap: 32px;
    padding: 24px 0;
  }
`

const GenerationRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

const GenerationLabelModern = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: white;
  border-radius: 16px;
  border: 2px solid ${colors.border.default};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  width: fit-content;
  margin: 0 auto;
`

const GenerationLabelIcon = styled.div`
  font-size: 28px;
  line-height: 1;
`

const GenerationLabelText = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${colors.text.primary};
  letter-spacing: -0.5px;
`

const GenerationMembersRow = styled.div`
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 24px;
  flex-wrap: wrap;
  position: relative;

  @media (max-width: 768px) {
    gap: 16px;
  }
`

const FamilyMemberCardModern = styled.div<{ $current?: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 32px 24px;
  background: ${(props) =>
    props.$current
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      : 'white'};
  border: 2px solid
    ${(props) => (props.$current ? 'transparent' : colors.border.default)};
  border-radius: 20px;
  cursor: ${(props) => (props.$current ? 'default' : 'pointer')};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${(props) =>
    props.$current
      ? '0 8px 32px rgba(102, 126, 234, 0.3)'
      : '0 4px 12px rgba(0, 0, 0, 0.08)'};
  min-width: 200px;
  max-width: 240px;

  &:hover {
    ${(props) =>
      !props.$current &&
      `
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      border-color: ${colors.primary};
    `}
  }

  @media (max-width: 768px) {
    min-width: 160px;
    max-width: 200px;
    padding: 24px 16px;
  }
`

const MemberAvatar = styled.div<{
  $size?: 'large' | 'xlarge'
  $current?: boolean
}>`
  width: ${(props) =>
    props.$size === 'xlarge'
      ? '120px'
      : props.$size === 'large'
        ? '96px'
        : '80px'};
  height: ${(props) =>
    props.$size === 'xlarge'
      ? '120px'
      : props.$size === 'large'
        ? '96px'
        : '80px'};
  border-radius: 50%;
  overflow: hidden;
  background: ${(props) =>
    props.$current ? 'rgba(255, 255, 255, 0.2)' : colors.background.gray};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${(props) =>
    props.$size === 'xlarge'
      ? '48px'
      : props.$size === 'large'
        ? '40px'
        : '32px'};
  border: ${(props) =>
    props.$current
      ? '4px solid rgba(255, 255, 255, 0.5)'
      : `3px solid ${colors.border.light}`};
  flex-shrink: 0;
  box-shadow: ${(props) =>
    props.$current
      ? '0 4px 16px rgba(0, 0, 0, 0.2)'
      : '0 2px 8px rgba(0, 0, 0, 0.08)'};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  @media (max-width: 768px) {
    width: ${(props) =>
      props.$size === 'xlarge'
        ? '100px'
        : props.$size === 'large'
          ? '80px'
          : '64px'};
    height: ${(props) =>
      props.$size === 'xlarge'
        ? '100px'
        : props.$size === 'large'
          ? '80px'
          : '64px'};
  }
`

const DefaultAvatarIcon = styled.div`
  color: ${colors.text.tertiary};
  display: flex;
  align-items: center;
  justify-content: center;
`

const MemberInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
`

const MemberName = styled.div`
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;

  ${FamilyMemberCardModern} & {
    color: ${colors.text.primary};
  }

  ${FamilyMemberCardModern}:has([data-current='true']) & {
    color: white;
  }

  @media (max-width: 768px) {
    font-size: 16px;
  }
`

const MemberRelation = styled.div`
  display: inline-flex;
  padding: 4px 12px;
  background: rgba(37, 99, 235, 0.1);
  color: ${colors.primary};
  font-size: 12px;
  font-weight: 700;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const MemberLifespan = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${colors.text.tertiary};

  @media (max-width: 768px) {
    font-size: 12px;
  }
`

const MemberCountry = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${colors.text.secondary};
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;

  @media (max-width: 768px) {
    font-size: 11px;
  }
`

// 부모 연결선 컴포넌트들
const ParentConnectorWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 48px;
  margin-bottom: -24px;
  z-index: 0;

  @media (max-width: 768px) {
    height: 32px;
    margin-bottom: -16px;
  }
`

const ParentHorizontalLine = styled.div`
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 50%;
  height: 2px;
  background: ${colors.border.default};
  z-index: 0;

  @media (max-width: 768px) {
    width: 60%;
  }
`

const ParentVerticalLineDown = styled.div`
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  height: 100%;
  background: ${colors.border.default};
  z-index: 0;
`

const ParentVerticalLineUp = styled.div`
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  height: 24px;
  background: ${colors.border.default};
  z-index: 0;

  @media (max-width: 768px) {
    top: -16px;
    height: 16px;
  }
`

// 본인 연결선 컴포넌트들
const ChildVerticalLineUp = styled.div`
  position: absolute;
  top: -48px;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  height: 48px;
  background: ${colors.border.default};
  z-index: 0;

  @media (max-width: 768px) {
    top: -32px;
    height: 32px;
  }
`

const ChildVerticalLineDown = styled.div`
  position: absolute;
  bottom: -48px;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  height: 48px;
  background: ${colors.border.default};
  z-index: 0;

  @media (max-width: 768px) {
    bottom: -32px;
    height: 32px;
  }
`

// 자녀 연결선 컴포넌트들
const ChildrenConnectorWrapper = styled.div<{ $count: number }>`
  position: relative;
  width: 100%;
  height: 48px;
  margin-bottom: -24px;
  z-index: 0;

  @media (max-width: 768px) {
    height: 32px;
    margin-bottom: -16px;
  }
`

const ChildrenHorizontalLine = styled.div`
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  height: 2px;
  background: ${colors.border.default};
  z-index: 0;

  @media (max-width: 768px) {
    bottom: 16px;
    width: 90%;
  }
`

const ChildVerticalLineUpShort = styled.div`
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  height: 24px;
  background: ${colors.border.default};
  z-index: 0;

  @media (max-width: 768px) {
    top: -16px;
    height: 16px;
  }
`

// Empty 상태 컴포넌트들
const EmptyStateModern = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 48px;
  text-align: center;
  background: white;
  border-radius: 24px;
  margin: 40px 0;
  border: 2px dashed ${colors.border.light};

  @media (max-width: 768px) {
    padding: 60px 24px;
    border-radius: 20px;
  }
`

const EmptyStateIconModern = styled.div`
  width: 96px;
  height: 96px;
  background: ${colors.background.gray};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  color: ${colors.text.tertiary};

  @media (max-width: 768px) {
    width: 80px;
    height: 80px;
    margin-bottom: 20px;
  }
`

const EmptyStateTitleModern = styled.h3`
  margin: 0 0 12px;
  font-size: 22px;
  font-weight: 700;
  color: ${colors.text.primary};
  letter-spacing: -0.5px;

  @media (max-width: 768px) {
    font-size: 20px;
  }
`

const EmptyStateDescriptionModern = styled.p`
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  color: ${colors.text.secondary};
  line-height: 1.6;

  @media (max-width: 768px) {
    font-size: 14px;
  }
`

// 연결선 컴포넌트들 - 단순 버전
const SimpleBottomLine = styled.div`
  position: absolute;
  bottom: -24px;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  height: 24px;
  background: ${colors.border.default};
  z-index: 1;

  @media (max-width: 768px) {
    bottom: -16px;
    height: 16px;
  }
`

const SimpleTopLine = styled.div`
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  height: 24px;
  background: ${colors.border.default};
  z-index: 1;

  @media (max-width: 768px) {
    top: -16px;
    height: 16px;
  }
`

const SimpleVerticalLine = styled.div`
  width: 2px;
  height: 48px;
  background: ${colors.border.default};
  margin: 0 auto;

  @media (max-width: 768px) {
    height: 32px;
  }
`

const ConnectionLine = styled.div<{ $direction: 'up' | 'down' }>`
  position: absolute;
  ${(props) =>
    props.$direction === 'up'
      ? `
    top: -48px;
    height: 48px;
  `
      : `
    bottom: -48px;
    height: 48px;
  `}
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  background: linear-gradient(
    to ${(props) => (props.$direction === 'up' ? 'top' : 'bottom')},
    ${colors.border.default} 0%,
    transparent 100%
  );
  z-index: 0;

  @media (max-width: 768px) {
    ${(props) =>
      props.$direction === 'up'
        ? `
    top: -32px;
    height: 32px;
  `
        : `
    bottom: -32px;
    height: 32px;
  `}
  }
`

// 사건 상세 스타일
const EventDetailList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: calc(100vh - 300px);
  overflow-y: auto;
  padding-right: 8px;

  /* 커스텀 스크롤바 */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;

    &:hover {
      background: #a8a8a8;
    }
  }
`

const EventDetailCard = styled.div`
  padding: 20px;
  background: linear-gradient(135deg, #fafafa 0%, #f8f9fa 100%);
  border-radius: 12px;
  border: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #ad46ff;
    box-shadow: 0 2px 8px rgba(173, 70, 255, 0.1);
    transform: translateY(-2px);
  }
`

const EventDetailHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
`

const EventDetailTitle = styled.div`
  font-size: 16px;
  color: #111;
  font-weight: 700;
  line-height: 1.4;
  flex: 1;
`

const EventDetailDate = styled.div`
  font-size: 12px;
  color: #666;
  font-weight: 500;
  white-space: nowrap;
  background: #fff;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
`

const EventDetailMeta = styled.div`
  font-size: 13px;
  color: #666;
  line-height: 1.5;
`

const EventDetailRole = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const EventRoleBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  background: linear-gradient(135deg, #ad46ff 0%, #9146ff 100%);
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  width: fit-content;
`

const EventDetailDescription = styled.div`
  font-size: 14px;
  color: #555;
  line-height: 1.6;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
`

const EventDetailNote = styled.div`
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  padding: 10px 12px;
  background: #fff;
  border-left: 3px solid #ad46ff;
  border-radius: 6px;

  strong {
    font-weight: 600;
    color: #ad46ff;
    margin-right: 6px;
  }
`

const EventDetailSection = styled.div`
  margin-top: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
`

const EventDetailSectionTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #111;
  margin-bottom: 12px;
`

const EventDetailItem = styled.div`
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &:last-child {
    margin-bottom: 0;
  }
`

const EventDetailItemHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
`

const EventDetailItemTitle = styled.div`
  font-size: 13px;
  color: #374151;
  font-weight: 600;
`

const EventDetailItemDate = styled.div`
  font-size: 11px;
  color: #6b7280;
  white-space: nowrap;
`

const EventDetailItemSubtitle = styled.div`
  font-size: 14px;
  color: #111;
  font-weight: 600;
`

const EventDetailItemDesc = styled.div`
  font-size: 12px;
  color: #6b7280;
  line-height: 1.5;
`
