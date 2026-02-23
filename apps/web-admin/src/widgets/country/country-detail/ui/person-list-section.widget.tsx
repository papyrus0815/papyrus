/**
 * 국가별 인물 리스트 섹션
 * - 현대 국가: 해당 국가(countryId) 소속 인물 전체 조회
 * - 인물 페이지와 동일한 카드 UI
 */
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import styled from 'styled-components'
import { personApi } from '@/shared/api/person'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import type { Person } from '@/entities/person/api'

const THEME = {
  primary: '#6366f1',
  border: 'rgba(20, 19, 34, 0.08)',
  borderLight: 'rgba(99, 102, 241, 0.12)',
} as const

function formatLifespan(person: Person & { birthYear?: number; deathYear?: number }): string {
  const birthYear = person.birthYear ?? (person as { birth_year?: number }).birth_year
  const deathYear = person.deathYear ?? (person as { death_year?: number }).death_year
  const formatYear = (y: number) => y.toLocaleString('ko-KR', { useGrouping: true })
  const era = (e: string | undefined) => (e === 'BC' ? 'BC' : 'AD')
  const isAlive = birthYear != null && deathYear == null
  const currentYear = new Date().getFullYear()
  const currentAge =
    isAlive && birthYear != null && person.birthEra !== 'BC' ? currentYear - birthYear : null
  if (birthYear != null && deathYear != null) {
    return `${era(person.birthEra)} ${formatYear(birthYear)} ~ ${era(person.deathEra)} ${formatYear(deathYear)}`
  }
  if (birthYear != null) {
    return isAlive && currentAge != null && currentAge >= 0
      ? `AD ${formatYear(birthYear)} ~ 생존 (${currentAge}세)`
      : `${era(person.birthEra)} ${formatYear(birthYear)} ~`
  }
  return '생몰년 미상'
}

interface PersonListSectionProps {
  countryId: string
}

const SectionHeader = styled.div`
  margin-top: 28px;
  padding: 20px 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
`

const AdaptiveGrid = styled.div`
  display: grid;
  gap: 24px;
  padding: 24px;
  min-width: 0;
  width: 100%;
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

const Card = styled.div`
  background: #fff;
  border-radius: 12px;
  padding: 0;
  border: 1.5px solid ${THEME.border};
  transition: box-shadow 0.3s ease, border-color 0.3s ease, transform 0.2s ease;
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
  padding: 48px 24px;
  text-align: center;
  color: #64748b;
  font-size: 15px;
`

const LoadingWrap = styled.div`
  padding: 32px;
  text-align: center;
  color: #64748b;
`

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #8b5cf6;
  border-radius: 50%;
  margin: 0 auto 16px;
  animation: spin 1s linear infinite;
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`

const ErrorWrap = styled.div`
  padding: 24px;
  color: #dc2626;
  text-align: center;
`

export function PersonListSection({ countryId }: PersonListSectionProps) {
  const navigate = useNavigate()
  const { data: persons = [], isLoading, error } = useQuery({
    queryKey: ['persons-by-country', countryId],
    queryFn: () => personApi.getByCountryId(countryId),
    staleTime: 1000 * 60 * 2,
  })

  if (isLoading) {
    return (
      <LoadingWrap>
        <Spinner />
        <p>인물 목록을 불러오는 중...</p>
      </LoadingWrap>
    )
  }

  if (error) {
    return (
      <ErrorWrap>
        인물 목록을 불러오지 못했습니다.
      </ErrorWrap>
    )
  }

  return (
    <>
      <SectionHeader>인물 리스트 ({persons.length}명)</SectionHeader>
      {persons.length === 0 ? (
        <EmptyState>이 국가에 등록된 인물이 없습니다.</EmptyState>
      ) : (
        <AdaptiveGrid
          as={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
          {persons.map((person) => {
            const fullName = getPersonDisplayName(person, true)
            const lifespan = formatLifespan(person)
            const isDeceased =
              (person as { deathYear?: number }).deathYear != null ||
              (person as { death_year?: number }).death_year != null
            const genderLabel =
              person.gender === 'MALE' ? '남' : person.gender === 'FEMALE' ? '여' : null
            const bioText = person.biography?.replace(/\s+/g, ' ').trim() || ''
            const bioExcerpt =
              bioText.length > 120 ? `${bioText.slice(0, 120)}…` : bioText || null
            const displayImage = person.profileImageUrl
            return (
              <Card
                key={person.id}
                onClick={() => navigate(pathKeys.persons.detail(person.id))}
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
                      <PersonName>{fullName || '(이름 없음)'}</PersonName>
                      {genderLabel && <CardGender>{genderLabel}</CardGender>}
                    </CardTitleRow>
                    <PersonLifespan>
                      {isDeceased && <TombstoneIcon aria-hidden>🪦</TombstoneIcon>}
                      {lifespan}
                    </PersonLifespan>
                    {bioExcerpt && <CardBio>{bioExcerpt}</CardBio>}
                  </PersonInfo>
                </CardContent>
              </Card>
            )
          })}
        </AdaptiveGrid>
      )}
    </>
  )
}
