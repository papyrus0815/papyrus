/**
 * 인물 리스트 UI — 국가 상세·인물 페이지 공용
 * 국가 선택 시 인물 탭과 동일한 기능·디자인
 */
import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { FiPlus, FiSearch } from 'react-icons/fi'
import styled from 'styled-components'

import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { PersonDetailPanel } from '@/pages/persons/PersonDetailPanel'
import { PersonRegisterView } from '@/shared/ui/person-register-modal'
import { BORDER_COLOR, FOCUS_COLOR } from '@/shared/ui/register-form-layout'
import { GovernmentPositionType } from '@/shared/api/government-positions'

type PersonLike = {
  id: string
  name: string
  surname?: string | null
  biography?: string | null
  profileImageUrl?: string | null
  gender?: string | null
  birthYear?: number | null
  deathYear?: number | null
  birthEra?: string | null
  deathEra?: string | null
  birth_year?: number | null
  death_year?: number | null
  birth_era?: string | null
  death_era?: string | null
  dynastyId?: string | null
  dynasty?: { id: string; name: string } | null
  countryId?: string | null
  country?: { id: string; name: string; flagEmoji?: string | null } | null
  /** 관직 재임 기록 (필터용, positionType 포함) */
  governmentTenures?: Array<{ id: string; positionType: string }> | null
}

interface DynastyItem {
  id: string
  name: string
}

export interface PersonListContentProps {
  persons: PersonLike[]
  dynasties: DynastyItem[]
  /** 인물 등록 시 기본 국가 (미지정 시 국가 선택 없음) */
  initialCountryId?: string | null
  /** 캐시 무효화 시 쿼리 키 (예: ['persons-by-country', countryId]) */
  invalidateKeys?: unknown[]
  /** 제목 */
  title?: string
  /** 빈 목록 메시지 */
  emptyMessage?: string
  /** 검색·필터 빈 결과 메시지 */
  emptyFilterMessage?: string
}

function formatLifespan(person: PersonLike): string {
  const birthYear = person.birthYear ?? person.birth_year
  const deathYear = person.deathYear ?? person.death_year
  const formatYear = (y: number) => y.toLocaleString('ko-KR', { useGrouping: true })
  const era = (e: string | undefined) => (e === 'BC' ? 'BC' : 'AD')
  const isAlive = birthYear != null && deathYear == null
  const currentYear = new Date().getFullYear()
  const currentAge = isAlive && birthYear != null && person.birthEra !== 'BC' ? currentYear - birthYear : null
  const ageAtDeath =
    birthYear != null && deathYear != null && person.birthEra !== 'BC' && person.deathEra !== 'BC'
      ? deathYear - birthYear
      : null
  if (birthYear != null && deathYear != null) {
    const base = `${era(person.birthEra ?? person.birth_era)} ${formatYear(birthYear)} ~ ${era(person.deathEra ?? person.death_era)} ${formatYear(deathYear)}`
    return ageAtDeath != null ? `${base} · 사망 · ${ageAtDeath}세` : `${base} · 사망`
  }
  if (birthYear != null) {
    return isAlive && currentAge != null && currentAge >= 0
      ? `AD ${formatYear(birthYear)} ~ 생존 (${currentAge}세)`
      : `${era(person.birthEra ?? person.birth_era)} ${formatYear(birthYear)} ~`
  }
  return '생몰년 미상'
}

function getCentury(year: number | undefined, era: string | undefined): number | null {
  if (year == null || year <= 0) return null
  if (era === 'BC') return -Math.ceil(year / 100)
  return Math.ceil(year / 100)
}

const CENTURY_UNKNOWN = 999

// ─── Styled (국가 상세 person-list-section과 동일) ───
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
  &::placeholder { color: #9ca3af; }
  &:hover { border-color: #d1d5db; }
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
  &:hover { border-color: #d1d5db; }
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
  &:hover:not(:disabled) { background: #4f46e5; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`

/** 관직 카테고리 필터 버튼 (주요 유형만) */
const POSITION_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '전체' },
  { value: GovernmentPositionType.HEAD_OF_STATE, label: '국가 원수' },
  { value: GovernmentPositionType.HEAD_OF_GOVERNMENT, label: '정부 수반' },
  { value: 'HEIR_APPARENT', label: '왕세자·세자' },
  { value: 'REGENT', label: '섭정' },
  { value: GovernmentPositionType.CABINET_MINISTER, label: '각료/장관' },
  { value: GovernmentPositionType.LEGISLATOR, label: '의회의원' },
  { value: GovernmentPositionType.JUDICIARY, label: '사법부' },
  { value: GovernmentPositionType.MILITARY_COMMANDER, label: '군 지휘관' },
  { value: GovernmentPositionType.OTHER, label: '기타' },
]

const CategoryBtn = styled.button<{ $active?: boolean }>`
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  color: ${(p) => (p.$active ? '#fff' : '#64748b')};
  background: ${(p) => (p.$active ? '#6366f1' : '#f1f5f9')};
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  &:hover {
    background: ${(p) => (p.$active ? '#4f46e5' : '#e2e8f0')};
    color: ${(p) => (p.$active ? '#fff' : '#475569')};
  }
`

const CategoryBtnGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
`

const ListSectionWrap = styled.div`
  width: 100%;
  min-width: 0;
  padding: 0 32px 32px;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  max-height: calc(100vh - 220px);
  overflow: hidden;
`

const ListScrollArea = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
  &::-webkit-scrollbar { width: 8px; }
  &::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
  &::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
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
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  @media (min-width: 1200px) { gap: 24px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
  @media (max-width: 640px) { grid-template-columns: 1fr; gap: 16px; }
`

const CenturySection = styled.section`
  margin-bottom: 28px;
  &:last-child { margin-bottom: 0; }
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
  ${Card}:hover & { transform: scale(1.02); }
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
  svg { width: 40px; height: 40px; }
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

export function PersonListContent({
  persons,
  dynasties,
  initialCountryId = null,
  invalidateKeys = [],
  title = '인물 리스트',
  emptyMessage = '등록된 인물이 없습니다.',
  emptyFilterMessage = '검색·필터 조건에 맞는 인물이 없습니다.',
}: PersonListContentProps) {
  const queryClient = useQueryClient()
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [showRegisterForm, setShowRegisterForm] = useState(false)
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterGender, setFilterGender] = useState<string>('')
  const [filterPositionType, setFilterPositionType] = useState<string>('')

  const filteredPersons = useMemo(() => {
    return persons.filter((person) => {
      const name = getPersonDisplayName(person, true)
      const bio = person.biography?.replace(/\s+/g, ' ').trim() || ''
      const dynastyName =
        person.dynasty?.name ??
        (person.dynastyId != null ? dynasties.find((d) => d.id === person.dynastyId)?.name : '')
      const matchSearch =
        !searchQuery.trim() ||
        name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        bio.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        dynastyName.toLowerCase().includes(searchQuery.trim().toLowerCase())
      const matchGender =
        !filterGender ||
        (filterGender === 'MALE' && person.gender === 'MALE') ||
        (filterGender === 'FEMALE' && person.gender === 'FEMALE')
      const matchPosition =
        !filterPositionType ||
        (person.governmentTenures?.some((t) => t.positionType === filterPositionType) ?? false)
      return matchSearch && matchGender && matchPosition
    })
  }, [persons, dynasties, searchQuery, filterGender, filterPositionType])

  const personsByCentury = useMemo(() => {
    const map = new Map<number, PersonLike[]>()
    filteredPersons.forEach((p) => {
      const year = p.birthYear ?? p.birth_year
      const era = p.birthEra ?? p.birth_era
      const key = getCentury(year, era) ?? CENTURY_UNKNOWN
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    })
    return Array.from(map.entries()).sort(([a], [b]) =>
      a === CENTURY_UNKNOWN ? 1 : b === CENTURY_UNKNOWN ? -1 : b - a,
    )
  }, [filteredPersons])

  const handleSuccess = () => {
    if (invalidateKeys.length > 0) {
      queryClient.invalidateQueries({ queryKey: invalidateKeys as string[] })
    }
    setShowRegisterForm(false)
    setEditingPersonId(null)
    setSelectedPersonId(null)
  }

  if (showRegisterForm) {
    return (
      <RegisterFormWrap>
        <PersonRegisterView
          initialCountryId={initialCountryId ?? undefined}
          editPersonId={editingPersonId ?? undefined}
          onCancel={() => {
            setShowRegisterForm(false)
            setEditingPersonId(null)
          }}
          onSuccess={handleSuccess}
        />
      </RegisterFormWrap>
    )
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {selectedPersonId ? (
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
          <ListSectionWrap key="list">
            <ListHeader>
              <ListHeaderRow>
                <ListHeaderTitle>
                  {title}
                  <ListHeaderDot>·</ListHeaderDot>
                  <ListHeaderCount>
                    {filteredPersons.length}명
                    {(searchQuery.trim() || filterGender || filterPositionType) && ` / 전체 ${persons.length}명`}
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
                  <SearchIcon><FiSearch size={16} /></SearchIcon>
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
              <ToolbarRow style={{ marginTop: 4 }}>
                <CategoryBtnGroup role="group" aria-label="관직 카테고리 필터">
                  {POSITION_CATEGORY_OPTIONS.map((opt) => (
                    <CategoryBtn
                      key={opt.value || 'all'}
                      type="button"
                      $active={filterPositionType === opt.value}
                      onClick={() => setFilterPositionType(opt.value)}
                    >
                      {opt.label}
                    </CategoryBtn>
                  ))}
                </CategoryBtnGroup>
              </ToolbarRow>
            </ListHeader>
            {persons.length === 0 ? (
              <EmptyState>{emptyMessage}</EmptyState>
            ) : filteredPersons.length === 0 ? (
              <EmptyState>{emptyFilterMessage}</EmptyState>
            ) : (
              <ListScrollArea>
                {personsByCentury.map(([century, list]) => (
                  <CenturySection key={century}>
                    <CenturyHeading>
                      {century === CENTURY_UNKNOWN ? '세기 미상' : century < 0 ? `기원전 ${-century}세기` : `${century}세기`}
                    </CenturyHeading>
                    <AdaptiveGrid as={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
                      {list.map((person) => {
                        const fullName = getPersonDisplayName(person, true)
                        const lifespan = formatLifespan(person)
                        const isDeceased = person.deathYear != null || person.death_year != null
                        const genderLabel = person.gender === 'MALE' ? '남' : person.gender === 'FEMALE' ? '여' : null
                        const bioText = person.biography?.replace(/\s+/g, ' ').trim() || ''
                        const bioExcerpt = bioText.length > 120 ? `${bioText.slice(0, 120)}…` : bioText || null
                        const displayImage = person.profileImageUrl
                        const dynastyName = person.dynasty?.name ?? (person.dynastyId != null ? dynasties.find((d) => d.id === person.dynastyId)?.name : undefined)
                        return (
                          <Card key={person.id} onClick={() => setSelectedPersonId(person.id)}>
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
                                  <PersonName>{fullName || '(이름 없음)'}</PersonName>
                                  {genderLabel && <CardGender>{genderLabel}</CardGender>}
                                </CardTitleRow>
                                <PersonLifespan>
                                  {isDeceased && <TombstoneIcon aria-hidden>🪦</TombstoneIcon>}
                                  {lifespan}
                                </PersonLifespan>
                                {person.country && (
                                  <CardDynasty title="국가">
                                    {person.country.flagEmoji && `${person.country.flagEmoji} `}
                                    {person.country.name}
                                  </CardDynasty>
                                )}
                                {dynastyName && <CardDynasty title="가문">가문: {dynastyName}</CardDynasty>}
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
            )}
          </ListSectionWrap>
        )}
      </AnimatePresence>
    </>
  )
}
