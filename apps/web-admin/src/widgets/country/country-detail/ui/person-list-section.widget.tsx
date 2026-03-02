/**
 * 국가별 인물 리스트 섹션
 * - 현대 국가: 해당 국가(countryId) 소속 인물 전체 조회
 * - 인물 페이지와 동일한 카드 UI
 * - 카드 클릭 시 컨텐츠 영역에 상세 패널 표시, 인물 등록 버튼으로 등록 폼 표시
 */
import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { FiPlus, FiSearch } from 'react-icons/fi'
import styled from 'styled-components'
import { dynastyApi } from '@/shared/api/dynasty'
import { personApi } from '@/shared/api/person'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { PersonDetailPanel } from '@/pages/persons/PersonDetailPanel'
import { PersonRegisterView } from '@/shared/ui/person-register-modal'
import { BORDER_COLOR, FOCUS_COLOR } from '@/shared/ui/register-form-layout'
import type { Person } from '@/entities/person/api'

function formatLifespan(person: Person & { birthYear?: number; deathYear?: number }): string {
  const birthYear = person.birthYear ?? (person as { birth_year?: number }).birth_year
  const deathYear = person.deathYear ?? (person as { death_year?: number }).death_year
  const formatYear = (y: number) => y.toLocaleString('ko-KR', { useGrouping: true })
  const era = (e: string | undefined) => (e === 'BC' ? 'BC' : 'AD')
  const isAlive = birthYear != null && deathYear == null
  const currentYear = new Date().getFullYear()
  const currentAge =
    isAlive && birthYear != null && person.birthEra !== 'BC' ? currentYear - birthYear : null
  const ageAtDeath =
    birthYear != null && deathYear != null && person.birthEra !== 'BC' && person.deathEra !== 'BC'
      ? deathYear - birthYear
      : null
  if (birthYear != null && deathYear != null) {
    const base = `${era(person.birthEra)} ${formatYear(birthYear)} ~ ${era(person.deathEra)} ${formatYear(deathYear)}`
    return ageAtDeath != null ? `${base} · 사망 · ${ageAtDeath}세` : `${base} · 사망`
  }
  if (birthYear != null) {
    return isAlive && currentAge != null && currentAge >= 0
      ? `AD ${formatYear(birthYear)} ~ 생존 (${currentAge}세)`
      : `${era(person.birthEra)} ${formatYear(birthYear)} ~`
  }
  return '생몰년 미상'
}

/** 출생년도·기원으로 세기 계산. AD: 1~100→1 / BC: 1~100→-1. /persons와 동일 */
function getCentury(year: number | undefined, era: string | undefined): number | null {
  if (year == null || year <= 0) return null
  if (era === 'BC') return -Math.ceil(year / 100)
  return Math.ceil(year / 100)
}

const CENTURY_UNKNOWN = 999

interface PersonListSectionProps {
  countryId: string
}

const LIST_PADDING = 32

const ListHeader = styled.header`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 24px;
  margin-bottom: 28px;
  border-bottom: 1px solid #f3f4f6;
`

const ListHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`

const ListHeaderTitle = styled.h1`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #0f172a;
  letter-spacing: -0.02em;
  line-height: 1.4;
  display: flex;
  align-items: baseline;
  gap: 8px;
`

const ListHeaderDot = styled.span`
  color: #cbd5e1;
  font-weight: 400;
`

const ListHeaderCount = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
`

const ToolbarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`

const SearchWrap = styled.div`
  flex: 1;
  min-width: 200px;
  max-width: 280px;
  position: relative;
`

const SearchIcon = styled.span`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
  display: flex;
`

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px 12px 38px;
  font-size: 14px;
  color: #111827;
  background: #fff;
  border: 1px solid ${BORDER_COLOR};
  border-radius: 12px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;

  &::placeholder {
    color: #9ca3af;
  }
  &:hover {
    border-color: #d1d5db;
  }
  &:focus {
    border-color: ${FOCUS_COLOR};
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
`

const FilterSelect = styled.select`
  padding: 12px 32px 12px 16px;
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  background-color: #fff;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  border: 1px solid ${BORDER_COLOR};
  border-radius: 12px;
  outline: none;
  cursor: pointer;
  appearance: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    border-color: #d1d5db;
  }
  &:focus {
    border-color: ${FOCUS_COLOR};
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
`

const CreateButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  background: #6366f1;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);

  &:hover:not(:disabled) {
    background: #4f46e5;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const ListSectionWrap = styled.div`
  width: 100%;
  min-width: 0;
  padding: 0 ${LIST_PADDING}px ${LIST_PADDING}px;
  display: flex;
  flex-direction: column;
  background: #ffffff;
`

const DetailViewWrap = styled.div`
  width: 100%;
  min-width: 0;
  min-height: 60vh;
  background: #ffffff;
`

const RegisterFormWrap = styled.div`
  width: 100%;
  min-width: 0;
`

const AdaptiveGrid = styled.div`
  display: grid;
  gap: 20px;
  padding: 0;
  min-width: 0;
  width: 100%;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  @media (min-width: 1200px) {
    gap: 24px;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
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

const Card = styled.div`
  background: #ffffff;
  border-radius: 12px;
  padding: 0;
  border: 1px solid ${BORDER_COLOR};
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  cursor: pointer;
  overflow: hidden;

  &:hover {
    border-color: #d1d5db;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }
`

const CardImageWrapper = styled.div`
  width: 100%;
  aspect-ratio: 3 / 4;
  max-height: 320px;
  min-height: 200px;
  position: relative;
  overflow: hidden;
  background: #ffffff;
`

const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  transition: transform 0.3s ease;
  ${Card}:hover & {
    transform: scale(1.02);
  }
`

const CardImagePlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border-bottom: 1px solid ${BORDER_COLOR};
  color: #e2e8f0;
  svg {
    width: 40px;
    height: 40px;
  }
`

const CardContent = styled.div`
  padding: 18px 20px 20px;
`

const PersonInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
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
  letter-spacing: -0.01em;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const CardGender = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
  flex-shrink: 0;
`

const PersonLifespan = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  line-height: 1.4;
  display: flex;
  align-items: center;
  gap: 6px;
`

const CardDynasty = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  line-height: 1.4;
`

const TombstoneIcon = styled.span`
  font-size: 12px;
  line-height: 1;
  flex-shrink: 0;
`

const CardBio = styled.p`
  margin: 6px 0 0 0;
  font-size: 13px;
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
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  background: #ffffff;
  border: 1px dashed ${BORDER_COLOR};
  border-radius: 12px;
`

const LoadingWrap = styled.div`
  padding: 32px;
  text-align: center;
  color: #64748b;
`

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(99, 102, 241, 0.2);
  border-top-color: #6366f1;
  border-radius: 50%;
  margin: 0 auto 16px;
  animation: spin 0.8s linear infinite;
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
  const queryClient = useQueryClient()
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [showRegisterForm, setShowRegisterForm] = useState(false)
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterGender, setFilterGender] = useState<string>('')

  const { data: persons = [], isLoading, error } = useQuery({
    queryKey: ['persons-by-country', countryId],
    queryFn: () => personApi.getByCountryId(countryId),
    staleTime: 1000 * 60 * 2,
  })
  const { data: dynasties = [] } = useQuery({
    queryKey: ['dynasties'],
    queryFn: () => dynastyApi.getAll(),
    staleTime: 1000 * 60 * 5,
  })

  const filteredPersons = useMemo(() => {
    return persons.filter((person) => {
      const name = getPersonDisplayName(person, true)
      const bio = person.biography?.replace(/\s+/g, ' ').trim() || ''
      const dynastyId = (person as { dynastyId?: string | null }).dynastyId
      const dynastyName =
        (person as { dynasty?: { name: string } | null }).dynasty?.name ??
        (dynastyId != null ? dynasties.find((d) => d.id === dynastyId)?.name : '')
      const matchSearch =
        !searchQuery.trim() ||
        name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        bio.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        dynastyName.toLowerCase().includes(searchQuery.trim().toLowerCase())
      const matchGender =
        !filterGender ||
        (filterGender === 'MALE' && person.gender === 'MALE') ||
        (filterGender === 'FEMALE' && person.gender === 'FEMALE')
      return matchSearch && matchGender
    })
  }, [persons, dynasties, searchQuery, filterGender])

  /** 세기별 그룹 (최신 세기 먼저, 세기 미상은 마지막) — /persons와 동일 */
  const personsByCentury = useMemo(() => {
    const map = new Map<number, (typeof filteredPersons)[number][]>()
    filteredPersons.forEach((p) => {
      const year = (p as { birthYear?: number }).birthYear ?? (p as { birth_year?: number }).birth_year
      const era = (p as { birthEra?: string }).birthEra ?? (p as { birth_era?: string }).birth_era
      const key = getCentury(year, era) ?? CENTURY_UNKNOWN
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    })
    return Array.from(map.entries()).sort(([a], [b]) =>
      a === CENTURY_UNKNOWN ? 1 : b === CENTURY_UNKNOWN ? -1 : b - a,
    )
  }, [filteredPersons])

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

  if (showRegisterForm) {
    return (
      <RegisterFormWrap>
        <PersonRegisterView
          initialCountryId={countryId}
          editPersonId={editingPersonId}
          onCancel={() => {
            setShowRegisterForm(false)
            setEditingPersonId(null)
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['persons-by-country', countryId] })
            setShowRegisterForm(false)
            setEditingPersonId(null)
            setSelectedPersonId(null)
          }}
        />
      </RegisterFormWrap>
    )
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {selectedPersonId ? (
          /* 카드 클릭 시 리스트 비표시, 상세만 전체 영역에 표시 (행정조직 상세와 동일 카드·탭 스타일) */
          <DetailViewWrap
            key="detail"
            as={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <PersonDetailPanel
              personId={selectedPersonId}
              onClose={() => setSelectedPersonId(null)}
              onEdit={(id) => {
                setEditingPersonId(id)
                setShowRegisterForm(true)
              }}
              closeLabel="목록으로"
            />
          </DetailViewWrap>
        ) : (
          <ListSectionWrap>
            <ListHeader>
              <ListHeaderRow>
                <ListHeaderTitle>
                  인물 리스트
                  <ListHeaderDot>·</ListHeaderDot>
                  <ListHeaderCount>
                    {filteredPersons.length}명
                    {(searchQuery.trim() || filterGender) && ` / 전체 ${persons.length}명`}
                  </ListHeaderCount>
                </ListHeaderTitle>
                <CreateButton
                  type="button"
                  onClick={() => {
                    setEditingPersonId(null)
                    setShowRegisterForm(true)
                  }}
                >
                  <FiPlus size={18} />
                  인물 등록
                </CreateButton>
              </ListHeaderRow>
              <ToolbarRow>
                <SearchWrap>
                  <SearchIcon>
                    <FiSearch size={16} />
                  </SearchIcon>
                  <SearchInput
                    type="search"
                    placeholder="이름, 약력, 가문 검색"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="인물 검색"
                  />
                </SearchWrap>
                <FilterSelect
                  value={filterGender}
                  onChange={(e) => setFilterGender(e.target.value)}
                  aria-label="성별 필터"
                >
                  <option value="">성별 전체</option>
                  <option value="MALE">남</option>
                  <option value="FEMALE">여</option>
                </FilterSelect>
              </ToolbarRow>
            </ListHeader>
            {persons.length === 0 ? (
              <EmptyState>이 국가에 등록된 인물이 없습니다.</EmptyState>
            ) : filteredPersons.length === 0 ? (
              <EmptyState>검색·필터 조건에 맞는 인물이 없습니다.</EmptyState>
            ) : (
              <>
                {personsByCentury.map(([century, list]) => (
                  <CenturySection key={century}>
                    <CenturyHeading>
                      {century === CENTURY_UNKNOWN
                        ? '세기 미상'
                        : century < 0
                          ? `기원전 ${-century}세기`
                          : `${century}세기`}
                    </CenturyHeading>
                    <AdaptiveGrid
                      as={motion.div}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.25 }}
                    >
                      {list.map((person) => {
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
                        const dynastyId = (person as { dynastyId?: string | null }).dynastyId
                        const dynastyFromApi = (person as { dynasty?: { name: string } | null }).dynasty
                        const dynastyName =
                          dynastyFromApi?.name ??
                          (dynastyId != null ? dynasties.find((d) => d.id === dynastyId)?.name : undefined)
                        return (
                          <Card
                            key={person.id}
                            onClick={() => setSelectedPersonId(person.id)}
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
                                {dynastyName && (
                                  <CardDynasty title="가문">가문: {dynastyName}</CardDynasty>
                                )}
                                {bioExcerpt && <CardBio>{bioExcerpt}</CardBio>}
                              </PersonInfo>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </AdaptiveGrid>
                  </CenturySection>
                ))}
              </>
            )}
          </ListSectionWrap>
        )}
      </AnimatePresence>
    </>
  )
}
