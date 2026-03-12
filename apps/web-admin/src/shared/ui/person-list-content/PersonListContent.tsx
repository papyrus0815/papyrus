/**
 * 인물 리스트 UI — 국가 상세·인물 페이지 공용
 * 국가 선택 시 인물 탭과 동일한 기능·디자인
 */
import { useEffect, useMemo, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { AnimatePresence, motion } from 'framer-motion'
import { FiGlobe, FiPlus, FiSearch } from 'react-icons/fi'
import styled from 'styled-components'

import { useHistoricalCountries } from '@/entities/historical-country/api'
import { useCountries } from '@/features/country/api'
import { PersonDetailPanel } from '@/pages/persons/PersonDetailPanel'
import { GovernmentPositionType } from '@/shared/api/government-positions'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { CountrySelectModal } from '@/shared/ui/country-select-modal'
import { PersonRegisterView } from '@/shared/ui/person-register-modal'
import { BORDER_COLOR, FOCUS_COLOR } from '@/shared/ui/register-form-layout'

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

function isRegisteredWithin24h(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false
  const created = new Date(createdAt).getTime()
  return Number.isFinite(created) && Date.now() - created < TWENTY_FOUR_HOURS_MS
}

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
  /** 등록일 (24시간 이내면 NEW 뱃지 표시) */
  createdAt?: string | null
  /** 관직 재임 기록 (필터용 positionType, 표시용 직책명) */
  governmentTenures?: Array<{
    id: string
    positionType: string
    title?: string | null
    positionDefinition?: {
      id: string
      title?: string | null
      positionType?: string
    } | null
  }> | null
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
  /** 리스트 ↔ 인물 상세 전환 시 호출 (상단 공통 헤더 문구 변경용) */
  onViewChange?: (view: 'list' | 'detail') => void
  /** true면 타이틀·설명 행 숨김 (국가 상세 인물 탭에서 공통 헤더 사용) */
  hideMainHeader?: boolean
  /** true면 리스트 내 '인물 등록' 버튼 숨김 (헤더 우측에 배치된 경우) */
  hideCreateButton?: boolean
  /** 값이 바뀔 때마다 등록 폼 열기 (헤더 버튼에서 사용) */
  registerTrigger?: number
  /** false면 국가 필터 버튼·모달 숨김 (예: 국가 상세 인물 탭) */
  enableCountryFilter?: boolean
}

function formatLifespan(person: PersonLike): string {
  const birthYear = person.birthYear ?? person.birth_year
  const deathYear = person.deathYear ?? person.death_year
  const formatYear = (y: number) =>
    y.toLocaleString('ko-KR', { useGrouping: true })
  const era = (e: string | null | undefined) => (e === 'BC' ? 'BC' : 'AD')
  const isAlive = birthYear != null && deathYear == null
  const currentYear = new Date().getFullYear()
  const currentAge =
    isAlive && birthYear != null && person.birthEra !== 'BC'
      ? currentYear - birthYear
      : null
  const ageAtDeath =
    birthYear != null &&
    deathYear != null &&
    person.birthEra !== 'BC' &&
    person.deathEra !== 'BC'
      ? deathYear - birthYear
      : null
  if (birthYear != null && deathYear != null) {
    const base = `${era(person.birthEra ?? person.birth_era)} ${formatYear(birthYear)} ~ ${era(person.deathEra ?? person.death_era)} ${formatYear(deathYear)}`
    return ageAtDeath != null
      ? `${base} · 사망 · ${ageAtDeath}세`
      : `${base} · 사망`
  }
  if (birthYear != null) {
    return isAlive && currentAge != null && currentAge >= 0
      ? `AD ${formatYear(birthYear)} ~ 생존 (${currentAge}세)`
      : `${era(person.birthEra ?? person.birth_era)} ${formatYear(birthYear)} ~`
  }
  return '생몰년 미상'
}

function getCentury(
  year: number | undefined,
  era: string | undefined,
): number | null {
  if (year == null || year <= 0) return null
  if (era === 'BC') return -Math.ceil(year / 100)
  return Math.ceil(year / 100)
}

const CENTURY_UNKNOWN = 999

// ─── Styled ───────────────────────────────────────────────────────────────────
const ListHeader = styled.header<{ $compact?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 16px;
  margin-bottom: 20px;
  border-bottom: 1px solid #f1f5f9;
`

const ListHeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const ListHeaderTitle = styled.h2`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: baseline;
  gap: 6px;
`

const ListHeaderCount = styled.span`
  font-size: 13px;
  font-weight: 400;
  color: #94a3b8;
`

const ToolbarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const SearchWrap = styled.div`
  flex: 1;
  min-width: 180px;
  max-width: 240px;
  position: relative;
`

const SearchIcon = styled.span`
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
  display: flex;
`

const SearchInput = styled.input`
  width: 100%;
  padding: 8px 12px 8px 32px;
  font-size: 13px;
  color: #111827;
  background: #f8fafc;
  border: 1px solid ${BORDER_COLOR};
  border-radius: 8px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
  &::placeholder { color: #9ca3af; }
  &:hover { border-color: #d1d5db; }
  &:focus {
    border-color: ${FOCUS_COLOR};
    background: #fff;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.07);
  }
`

const FilterSelect = styled.select`
  padding: 8px 28px 8px 12px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  background-color: #f8fafc;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  border: 1px solid ${BORDER_COLOR};
  border-radius: 8px;
  outline: none;
  cursor: pointer;
  appearance: none;
  transition: border-color 0.15s;
  &:hover { border-color: #d1d5db; background-color: #fff; }
  &:focus { border-color: ${FOCUS_COLOR}; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.07); }
`

const CountryFilterBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  color: ${(p) => (p.$active ? '#4f46e5' : '#374151')};
  background: ${(p) => (p.$active ? '#eef2ff' : '#f8fafc')};
  border: 1px solid ${(p) => (p.$active ? '#c7d2fe' : BORDER_COLOR)};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { border-color: #d1d5db; background: #fff; }
`

const CreateButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  background: #6366f1;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
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
  padding: 5px 12px;
  font-size: 12px;
  font-weight: ${(p) => (p.$active ? '600' : '400')};
  color: ${(p) => (p.$active ? '#4f46e5' : '#64748b')};
  background: ${(p) => (p.$active ? '#eef2ff' : 'transparent')};
  border: 1px solid ${(p) => (p.$active ? '#c7d2fe' : 'transparent')};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;
  &:hover {
    background: ${(p) => (p.$active ? '#e0e7ff' : '#f1f5f9')};
    color: ${(p) => (p.$active ? '#4338ca' : '#334155')};
  }
`

const CategoryBtnGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  align-items: center;
`

const ListSectionWrap = styled.div`
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  padding: 20px 28px 48px;

  @media (max-width: 768px) {
    padding: 16px 16px 40px;
  }
`

const ListScrollArea = styled.div`
  width: 100%;
  min-width: 0;
`

const DetailViewWrap = styled.div`
  width: 100%;
  min-width: 0;
  min-height: 60vh;
  background: #ffffff;
  padding: 28px 36px 56px;
  max-width: 860px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 20px 16px 40px;
  }
`

const RegisterFormWrap = styled.div`
  width: 100%;
  min-width: 0;
`

const AdaptiveGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  @media (min-width: 1400px) {
    gap: 18px;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
  @media (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
`

const CenturySection = styled.section`
  margin-bottom: 32px;
  &:last-child { margin-bottom: 0; }
`

const CenturyHeading = styled.h3`
  margin: 0 0 14px 0;
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const Card = styled.div`
  background: #ffffff;
  border-radius: 10px;
  padding: 0;
  border: 1px solid ${BORDER_COLOR};
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
  cursor: pointer;
  overflow: hidden;
  &:hover {
    border-color: #c7d2fe;
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.1);
    transform: translateY(-1px);
  }
`

const CardImageWrapper = styled.div`
  width: 100%;
  aspect-ratio: 3 / 4;
  max-height: 260px;
  min-height: 160px;
  position: relative;
  overflow: hidden;
  background: #f8fafc;
`

const NewBadge = styled.span`
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: #dc2626;
  border-radius: 4px;
  letter-spacing: 0.04em;
  box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7);
  animation: newBadgePulse 2s ease-in-out infinite;

  @keyframes newBadgePulse {
    0%   { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.6); }
    60%  { box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); }
    100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
  }
`

const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  transition: transform 0.3s ease;
  ${Card}:hover & { transform: scale(1.03); }
`

const CardImagePlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border-bottom: 1px solid ${BORDER_COLOR};
  color: #e2e8f0;
  svg { width: 36px; height: 36px; }
`

const CardContent = styled.div`
  padding: 14px 16px 16px;
`

const PersonInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`

const CardTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 1px;
`

const PersonName = styled.h3`
  margin: 0;
  font-size: 14px;
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
  font-size: 11px;
  font-weight: 500;
  color: #94a3b8;
  flex-shrink: 0;
`

const PersonLifespan = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: #64748b;
  line-height: 1.4;
  display: flex;
  align-items: center;
  gap: 4px;
`

const CardDynasty = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: #94a3b8;
`

/** 카드 이름 앞 국기/국가 표시 */
const CardCountryPrefix = styled.span`
  flex-shrink: 0;
  font-size: 13px;
  line-height: 1.35;
  color: #64748b;
  font-weight: 500;
`

/** 역대 수반 단일 배지 */
const CardHeadsBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  font-size: 10px;
  font-weight: 600;
  color: #4f46e5;
  background: #eef2ff;
  border-radius: 4px;
  letter-spacing: 0.01em;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const CardBadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
`

const CardBio = styled.p`
  margin: 5px 0 0 0;
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const EmptyState = styled.div`
  padding: 60px 24px;
  text-align: center;
  font-size: 13px;
  font-weight: 400;
  color: #94a3b8;
  background: #fafafa;
  border-radius: 10px;
`

export function PersonListContent({
  persons,
  dynasties,
  initialCountryId = null,
  invalidateKeys = [],
  title = '인물 리스트',
  emptyMessage = '등록된 인물이 없습니다.',
  emptyFilterMessage = '검색·필터 조건에 맞는 인물이 없습니다.',
  onViewChange,
  hideMainHeader = false,
  hideCreateButton = false,
  registerTrigger,
  enableCountryFilter = true,
}: PersonListContentProps) {
  const queryClient = useQueryClient()
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [showRegisterForm, setShowRegisterForm] = useState(false)
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterGender, setFilterGender] = useState<string>('')
  const [filterPositionType, setFilterPositionType] = useState<string>('')
  const [filterCountryIds, setFilterCountryIds] = useState<string[]>([])
  const [showCountryModal, setShowCountryModal] = useState(false)

  const { data: modernCountries = [] } = useCountries()
  const { data: historicalCountries = [] } = useHistoricalCountries()

  const filteredPersons = useMemo(() => {
    return persons.filter((person) => {
      const name = getPersonDisplayName(person, true)
      const bio = (person.biography?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()) || ''
      const dynastyName =
        person.dynasty?.name ??
        (person.dynastyId != null
          ? dynasties.find((d) => d.id === person.dynastyId)?.name
          : '')
      const matchSearch =
        !searchQuery.trim() ||
        name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        bio.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        (dynastyName ?? '').toLowerCase().includes(searchQuery.trim().toLowerCase())
      const matchGender =
        !filterGender ||
        (filterGender === 'MALE' && person.gender === 'MALE') ||
        (filterGender === 'FEMALE' && person.gender === 'FEMALE')
      const matchPosition =
        !filterPositionType ||
        (person.governmentTenures?.some(
          (t) =>
            t.positionType === filterPositionType ||
            t.positionDefinition?.positionType === filterPositionType,
        ) ??
          false)
      const matchCountry =
        filterCountryIds.length === 0 ||
        (person.countryId != null && filterCountryIds.includes(person.countryId))
      return matchSearch && matchGender && matchPosition && matchCountry
    })
  }, [persons, dynasties, searchQuery, filterGender, filterPositionType, filterCountryIds])

  const personsByCentury = useMemo(() => {
    const map = new Map<number, PersonLike[]>()
    filteredPersons.forEach((p) => {
      const year = p.birthYear ?? p.birth_year
      const era = p.birthEra ?? p.birth_era
      const key = getCentury(year ?? undefined, era ?? undefined) ?? CENTURY_UNKNOWN
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    })
    return Array.from(map.entries()).sort(([a], [b]) =>
      a === CENTURY_UNKNOWN ? 1 : b === CENTURY_UNKNOWN ? -1 : b - a,
    )
  }, [filteredPersons])

  useEffect(() => {
    onViewChange?.(selectedPersonId ? 'detail' : 'list')
  }, [selectedPersonId, onViewChange])

  useEffect(() => {
    if (registerTrigger != null && registerTrigger > 0) {
      setEditingPersonId(null)
      setShowRegisterForm(true)
    }
  }, [registerTrigger])

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
            <ListHeader $compact={hideMainHeader}>
              <ListHeaderLeft>
                {!hideMainHeader && (
                  <ListHeaderTitle>
                    {title}
                    <ListHeaderCount>
                      {filteredPersons.length}명
                      {(searchQuery.trim() || filterGender || filterPositionType || filterCountryIds.length > 0) &&
                        ` / ${persons.length}명`}
                    </ListHeaderCount>
                  </ListHeaderTitle>
                )}
              </ListHeaderLeft>
              <ToolbarRow>
                <SearchWrap>
                  <SearchIcon><FiSearch size={14} /></SearchIcon>
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
                {enableCountryFilter && (
                  <CountryFilterBtn
                    type="button"
                    $active={filterCountryIds.length > 0}
                    onClick={() => setShowCountryModal(true)}
                    aria-label="국가 필터"
                  >
                    <FiGlobe size={13} />
                    {filterCountryIds.length > 0 ? `국가 ${filterCountryIds.length}개` : '국가'}
                  </CountryFilterBtn>
                )}
                {!hideCreateButton && (
                  <CreateButton
                    type="button"
                    onClick={() => { setEditingPersonId(null); setShowRegisterForm(true) }}
                    aria-label="인물 등록"
                  >
                    <FiPlus size={14} />
                    인물 등록
                  </CreateButton>
                )}
              </ToolbarRow>
            </ListHeader>
            <ToolbarRow style={{ marginBottom: 16 }}>
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
            {persons.length === 0 ? (
              <EmptyState>{emptyMessage}</EmptyState>
            ) : filteredPersons.length === 0 ? (
              <EmptyState>{emptyFilterMessage}</EmptyState>
            ) : (
              <ListScrollArea>
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
                          person.deathYear != null || person.death_year != null
                        const genderLabel =
                          person.gender === 'MALE'
                            ? '남'
                            : person.gender === 'FEMALE'
                              ? '여'
                              : null
                        const bioText = (() => {
                          const raw = person.biography?.trim() || ''
                          if (!raw) return ''
                          // HTML 태그 제거
                          return raw
                            .replace(/<[^>]+>/g, ' ')
                            .replace(/&nbsp;/g, ' ')
                            .replace(/&amp;/g, '&')
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/&quot;/g, '"')
                            .replace(/\s+/g, ' ')
                            .trim()
                        })()
                        const bioExcerpt =
                          bioText.length > 120
                            ? `${bioText.slice(0, 120)}…`
                            : bioText || null
                        const displayImage = person.profileImageUrl
                        const showNewBadge = isRegisteredWithin24h(
                          person.createdAt ?? (person as any).created_at,
                        )
                        const dynastyName =
                          person.dynasty?.name ??
                          (person.dynastyId != null
                            ? dynasties.find((d) => d.id === person.dynastyId)
                                ?.name
                            : undefined)
                        return (
                          <Card
                            key={person.id}
                            onClick={() => setSelectedPersonId(person.id)}
                          >
                            <CardImageWrapper>
                              {showNewBadge && <NewBadge>NEW</NewBadge>}
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
                                </CardTitleRow>
                                <PersonLifespan>
                                  {lifespan}{isDeceased ? ' · 사망' : ''}
                                </PersonLifespan>
                                {dynastyName && (
                                  <CardDynasty>{dynastyName}</CardDynasty>
                                )}
                                {(person.governmentTenures?.length ?? 0) > 0 && (
                                  <CardBadgeRow>
                                    {Array.from(
                                      new Set(
                                        person.governmentTenures!
                                          .map(t => t.positionDefinition?.title ?? t.title)
                                          .filter(Boolean)
                                      )
                                    ).slice(0, 2).map((title, i) => (
                                      <CardHeadsBadge key={i}>{title}</CardHeadsBadge>
                                    ))}
                                  </CardBadgeRow>
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
              </ListScrollArea>
            )}
          </ListSectionWrap>
        )}
      </AnimatePresence>
      {enableCountryFilter && (
        <CountrySelectModal
          isOpen={showCountryModal}
          onClose={() => setShowCountryModal(false)}
          title="국가 필터"
          multiSelect
          selectedCountryIds={filterCountryIds}
          modernCountries={modernCountries}
          historicalCountries={historicalCountries}
          onSelect={({ id }) => {
            setFilterCountryIds((prev) =>
              prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
            )
          }}
        />
      )}
    </>
  )
}
