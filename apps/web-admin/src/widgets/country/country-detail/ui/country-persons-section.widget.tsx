/**
 * 국가 상세 "인물" 탭 — 이 국가의 현대 인물과 **연결된 과거 국가별** 인물을 함께 보여준다.
 *
 * - 무컨테이너 헤어라인 4칸 KPI 요약 바 + 분류/시대 필터 칩 + 2열 원장/초상 카드 뷰 토글 + PersonInlineModal 미리보기 통합
 * - 데이터는 서버가 한 번에 나눠 준다(GET /persons/by-country/:id/grouped):
 *   현대 축 3원 합집합(본체 FK·재임/재위·소속)과, 브리지된 과거 국가별 같은 3원 합집합.
 */
import { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiChevronDown } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { personApi } from '@/shared/api/person'
import type { PersonResponseDto as Person } from '@/shared/api/persons'
import { getUploadImageUrl } from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import { PersonInlineModal } from '@/widgets/person/person-inline-modal/person-inline-modal'

import * as DashboardStyles from './country-detail-dashboard.styles'
import { ChartSkeleton } from './dashboard-panels/chart-skeleton'
import { PersonCard } from './person/person-card'

interface CountryPersonsSectionProps {
  country: UnifiedCountry
}

interface PersonGroup {
  key: string
  label: string
  /** 과거 국가 묶음이면 그 id — 현대 묶음은 null */
  historicalCountryId: string | null
  persons: Person[]
}

type CategoryFilterKey =
  | 'all'
  | 'modern'
  | 'historical'
  | 'tenured'
  | 'lifespan'
  | 'portrait'

function hasPersonTenure(person: Person): boolean {
  const extended = person as Person & {
    jobTitle?: string | null
    governmentTenures?: Array<{
      title?: string | null
      positionDefinition?: { name?: string | null } | null
    }>
  }
  return Boolean(
    (extended.governmentTenures && extended.governmentTenures.length > 0) ||
      extended.jobTitle,
  )
}

function getPrimaryRoleLabel(person: Person): string | null {
  const extended = person as Person & {
    jobTitle?: string | null
    governmentTenures?: Array<{
      title?: string | null
      positionDefinition?: { name?: string | null } | null
    }>
  }
  const firstTenure = extended.governmentTenures?.[0]
  return (
    firstTenure?.title?.trim() ||
    firstTenure?.positionDefinition?.name?.trim() ||
    extended.jobTitle?.trim() ||
    null
  )
}

function formatPersonLifespan(person: Person): string {
  const birthText =
    person.birthYear != null
      ? `${person.birthEra === 'BC' ? 'BC ' : ''}${Math.abs(person.birthYear)}`
      : null
  const deathText =
    person.deathYear != null
      ? `${person.deathEra === 'BC' ? 'BC ' : ''}${Math.abs(person.deathYear)}`
      : null
  if (!birthText && !deathText) return '생몰년 미상'
  if (birthText && deathText) return `${birthText} ~ ${deathText}년`
  if (birthText) return `${birthText}년생`
  return `~ ${deathText}년 몰`
}

export function CountryPersonsSection({ country }: CountryPersonsSectionProps) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilterKey>('all')
  const [viewMode, setViewMode] = useState<'ledger' | 'cards'>('ledger')
  const [previewPersonId, setPreviewPersonId] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['persons', 'by-country-grouped', country.id],
    queryFn: () => personApi.getByCountryIdGrouped(country.id),
    staleTime: 60_000,
  })

  const summaryStats = useMemo(() => {
    const modernList = data?.modern ?? []
    const historicalGroups = data?.historical ?? []
    const uniqueById = new Map<string, Person>()
    for (const person of modernList) {
      uniqueById.set(person.id, person)
    }
    const historicalUniqueIds = new Set<string>()
    for (const group of historicalGroups) {
      for (const person of group.persons) {
        uniqueById.set(person.id, person)
        historicalUniqueIds.add(person.id)
      }
    }
    const allUnique = Array.from(uniqueById.values())
    const tenuredCount = allUnique.filter(hasPersonTenure).length
    const lifespanCount = allUnique.filter(
      (person) => person.birthYear != null || person.deathYear != null,
    ).length
    const portraitCount = allUnique.filter((person) =>
      Boolean(person.profileImageUrl),
    ).length
    const totalCount = allUnique.length
    return {
      totalCount,
      modernCount: modernList.length,
      historicalCount: historicalUniqueIds.size,
      historicalGroupCount: historicalGroups.filter(
        (group) => group.persons.length > 0,
      ).length,
      tenuredCount,
      lifespanCount,
      portraitCount,
      lifespanRate:
        totalCount > 0 ? Math.round((lifespanCount / totalCount) * 100) : 0,
      portraitRate:
        totalCount > 0 ? Math.round((portraitCount / totalCount) * 100) : 0,
    }
  }, [data])

  const groups = useMemo<PersonGroup[]>(() => {
    if (!data) return []
    const lowered = query.trim().toLowerCase()
    const matchesPerson = (person: Person, groupLabel: string) => {
      if (categoryFilter === 'tenured' && !hasPersonTenure(person)) return false
      if (
        categoryFilter === 'lifespan' &&
        person.birthYear == null &&
        person.deathYear == null
      ) {
        return false
      }
      if (categoryFilter === 'portrait' && !person.profileImageUrl) {
        return false
      }
      if (!lowered) return true
      const searchable = [
        getPersonDisplayName(person, true),
        person.name,
        person.surname,
        person.regnalName,
        getPrimaryRoleLabel(person),
        groupLabel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return searchable.includes(lowered)
    }

    const result: PersonGroup[] = []
    if (categoryFilter !== 'historical') {
      const modern = data.modern.filter((person) =>
        matchesPerson(person, country.name),
      )
      if (modern.length > 0) {
        result.push({
          key: '__modern__',
          label: country.name,
          historicalCountryId: null,
          persons: modern,
        })
      }
    }

    if (categoryFilter !== 'modern') {
      for (const group of data.historical) {
        const persons = group.persons.filter((person) =>
          matchesPerson(person, group.historicalCountryName),
        )
        if (persons.length === 0) continue
        result.push({
          key: group.historicalCountryId,
          label: group.historicalCountryName,
          historicalCountryId: group.historicalCountryId,
          persons,
        })
      }
    }

    return result
  }, [data, query, categoryFilter, country.name])

  const filteredUniqueCount = useMemo(
    () =>
      new Set(
        groups.flatMap((group) => group.persons.map((person) => person.id)),
      ).size,
    [groups],
  )
  const isFilterActive =
    categoryFilter !== 'all' || query.trim().length > 0

  const toggle = (key: string) =>
    setCollapsed((previous) => {
      const next = new Set(previous)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const hasAny = summaryStats.totalCount > 0

  return (
    <DashboardStyles.DashboardRoot>
      <SectionWrap>
        <HeadRow>
          <HeadText>
            <Title>소속 인물 · 역사 인물 원장</Title>
            <Description>
              {country.name} 현대 국가 축(주 국적·재임·소속)과 연결된 과거 국가별 인물을 함께 확인합니다.
            </Description>
          </HeadText>

          <HeadActions>
            <HeadActionBtn
              type="button"
              onClick={() => navigate(pathKeys.countryHeadsOfState(country.id))}
            >
              역대 수반 관리
            </HeadActionBtn>
            <HeadActionBtn
              type="button"
              onClick={() => navigate(pathKeys.personsTimeline())}
            >
              인물 타임라인 →
            </HeadActionBtn>
          </HeadActions>
        </HeadRow>

        <DashboardStyles.SectionHeadlineStrip aria-label="소속 인물 요약 지표">
          <DashboardStyles.SectionHeadlineCell>
            <DashboardStyles.SectionHeadlineLabel>
              전체 소속 인물
            </DashboardStyles.SectionHeadlineLabel>
            <DashboardStyles.SectionHeadlineValue $muted={!hasAny}>
              {hasAny ? (
                <>
                  {summaryStats.totalCount.toLocaleString('ko-KR')}
                  <DashboardStyles.SectionHeadlineUnit>명</DashboardStyles.SectionHeadlineUnit>
                </>
              ) : (
                '미등록'
              )}
            </DashboardStyles.SectionHeadlineValue>
            <DashboardStyles.SectionHeadlineSub>
              {hasAny
                ? `현대 축 ${summaryStats.modernCount}명 · 과거 국가 ${summaryStats.historicalGroupCount}개국`
                : '주 국적 · 재임 · 소속 3원 합집합'}
            </DashboardStyles.SectionHeadlineSub>
          </DashboardStyles.SectionHeadlineCell>

          <DashboardStyles.SectionHeadlineCell>
            <DashboardStyles.SectionHeadlineLabel>
              현대 국가 소속
            </DashboardStyles.SectionHeadlineLabel>
            <DashboardStyles.SectionHeadlineValue
              $muted={summaryStats.modernCount === 0}
            >
              {summaryStats.modernCount > 0 ? (
                <>
                  {summaryStats.modernCount.toLocaleString('ko-KR')}
                  <DashboardStyles.SectionHeadlineUnit>명</DashboardStyles.SectionHeadlineUnit>
                </>
              ) : (
                '없음'
              )}
            </DashboardStyles.SectionHeadlineValue>
            <DashboardStyles.SectionHeadlineSub>
              {country.name} 직접 소속·재임 인물
            </DashboardStyles.SectionHeadlineSub>
          </DashboardStyles.SectionHeadlineCell>

          <DashboardStyles.SectionHeadlineCell>
            <DashboardStyles.SectionHeadlineLabel>
              과거 국가 소속
            </DashboardStyles.SectionHeadlineLabel>
            <DashboardStyles.SectionHeadlineValue
              $muted={summaryStats.historicalCount === 0}
            >
              {summaryStats.historicalCount > 0 ? (
                <>
                  {summaryStats.historicalCount.toLocaleString('ko-KR')}
                  <DashboardStyles.SectionHeadlineUnit>명</DashboardStyles.SectionHeadlineUnit>
                </>
              ) : (
                '없음'
              )}
            </DashboardStyles.SectionHeadlineValue>
            <DashboardStyles.SectionHeadlineSub>
              {summaryStats.historicalGroupCount > 0
                ? `연결된 과거 국가 ${summaryStats.historicalGroupCount}개국 합산`
                : '과거 국가 소속 인물 미집계'}
            </DashboardStyles.SectionHeadlineSub>
          </DashboardStyles.SectionHeadlineCell>

          <DashboardStyles.SectionHeadlineCell>
            <DashboardStyles.SectionHeadlineLabel>
              관직·재임 · 초상 보유
            </DashboardStyles.SectionHeadlineLabel>
            <DashboardStyles.SectionHeadlineValue
              $muted={summaryStats.tenuredCount === 0}
            >
              {summaryStats.tenuredCount > 0 ? (
                <>
                  {summaryStats.tenuredCount.toLocaleString('ko-KR')}
                  <DashboardStyles.SectionHeadlineUnit>명</DashboardStyles.SectionHeadlineUnit>
                </>
              ) : (
                '없음'
              )}
            </DashboardStyles.SectionHeadlineValue>
            <DashboardStyles.SectionHeadlineSub>
              {hasAny
                ? `초상 ${summaryStats.portraitRate}% (${summaryStats.portraitCount}명) · 생몰년 ${summaryStats.lifespanRate}%`
                : '재위·관직 재임 및 초상 보유 현황'}
            </DashboardStyles.SectionHeadlineSub>
          </DashboardStyles.SectionHeadlineCell>
        </DashboardStyles.SectionHeadlineStrip>

        {isLoading ? (
          <ChartSkeleton variant="bars" rows={5} />
        ) : isError ? (
          <ErrorRow role="alert">
            <span>인물 목록을 불러오지 못했습니다.</span>
            <RetryButton type="button" onClick={() => void refetch()}>
              다시 시도
            </RetryButton>
          </ErrorRow>
        ) : !hasAny ? (
          <EmptySpecGrid>
            <EmptySpecCell>
              <EmptySpecTitle>
                1. 주 국적 · 시대별 소속 국가 지정
              </EmptySpecTitle>
              <EmptySpecDesc>
                인물 등록·수정 화면에서 주 국적을 {country.name} 또는 연결된 과거 국가로 지정하면 이 탭에 자동 집계됩니다.
              </EmptySpecDesc>
              <EmptyActionBtn
                type="button"
                onClick={() => navigate(pathKeys.personsTimelineCreate())}
              >
                + 인물 등록하기
              </EmptyActionBtn>
            </EmptySpecCell>
            <EmptySpecCell>
              <EmptySpecTitle>
                2. 역대 수반 · 내각 · 관직 재임 등록
              </EmptySpecTitle>
              <EmptySpecDesc>
                행정조직 탭이나 역대 수반 관리에서 국가원수·정부수반·장관 재임 기록을 연결하면 별도 국적 설정 없이도 함께 묶입니다.
              </EmptySpecDesc>
              <EmptyActionBtn
                type="button"
                onClick={() => navigate(pathKeys.countryHeadsOfState(country.id))}
              >
                역대 수반 관리로 이동 →
              </EmptyActionBtn>
            </EmptySpecCell>
          </EmptySpecGrid>
        ) : (
          <>
            <FilterToolbar>
              <FilterChipGroup role="tablist" aria-label="인물 분류 필터">
                <FilterChip
                  type="button"
                  role="tab"
                  aria-selected={categoryFilter === 'all'}
                  $active={categoryFilter === 'all'}
                  onClick={() => setCategoryFilter('all')}
                >
                  전체{' '}
                  <FilterChipCount>{summaryStats.totalCount}</FilterChipCount>
                </FilterChip>
                <FilterChip
                  type="button"
                  role="tab"
                  aria-selected={categoryFilter === 'modern'}
                  $active={categoryFilter === 'modern'}
                  onClick={() => setCategoryFilter('modern')}
                >
                  현대 국가{' '}
                  <FilterChipCount>{summaryStats.modernCount}</FilterChipCount>
                </FilterChip>
                {summaryStats.historicalCount > 0 && (
                  <FilterChip
                    type="button"
                    role="tab"
                    aria-selected={categoryFilter === 'historical'}
                    $active={categoryFilter === 'historical'}
                    onClick={() => setCategoryFilter('historical')}
                  >
                    과거 국가{' '}
                    <FilterChipCount>
                      {summaryStats.historicalCount}
                    </FilterChipCount>
                  </FilterChip>
                )}
                {summaryStats.tenuredCount > 0 && (
                  <FilterChip
                    type="button"
                    role="tab"
                    aria-selected={categoryFilter === 'tenured'}
                    $active={categoryFilter === 'tenured'}
                    onClick={() => setCategoryFilter('tenured')}
                  >
                    관직·재임{' '}
                    <FilterChipCount>{summaryStats.tenuredCount}</FilterChipCount>
                  </FilterChip>
                )}
                {summaryStats.lifespanCount > 0 && (
                  <FilterChip
                    type="button"
                    role="tab"
                    aria-selected={categoryFilter === 'lifespan'}
                    $active={categoryFilter === 'lifespan'}
                    onClick={() => setCategoryFilter('lifespan')}
                  >
                    생몰년 확인{' '}
                    <FilterChipCount>
                      {summaryStats.lifespanCount}
                    </FilterChipCount>
                  </FilterChip>
                )}
                {summaryStats.portraitCount > 0 && (
                  <FilterChip
                    type="button"
                    role="tab"
                    aria-selected={categoryFilter === 'portrait'}
                    $active={categoryFilter === 'portrait'}
                    onClick={() => setCategoryFilter('portrait')}
                  >
                    초상 보유{' '}
                    <FilterChipCount>
                      {summaryStats.portraitCount}
                    </FilterChipCount>
                  </FilterChip>
                )}
              </FilterChipGroup>

              <ToolbarRight>
                {isFilterActive && (
                  <FilterStatusWrap>
                    <FilterResultText>
                      결과 {filteredUniqueCount.toLocaleString('ko-KR')}명
                    </FilterResultText>
                    <FilterResetBtn
                      type="button"
                      onClick={() => {
                        setCategoryFilter('all')
                        setQuery('')
                      }}
                    >
                      초기화
                    </FilterResetBtn>
                  </FilterStatusWrap>
                )}
                <SearchInput
                  type="search"
                  value={query}
                  onChange={(changeEvent) =>
                    setQuery(changeEvent.target.value)
                  }
                  placeholder="이름 · 시호 · 직책 · 국가 검색…"
                  aria-label="인물 이름 검색"
                />
                <ViewToggle role="group" aria-label="인물 보기 방식">
                  <ViewBtn
                    type="button"
                    $active={viewMode === 'ledger'}
                    onClick={() => setViewMode('ledger')}
                  >
                    2열 원장
                  </ViewBtn>
                  <ViewBtn
                    type="button"
                    $active={viewMode === 'cards'}
                    onClick={() => setViewMode('cards')}
                  >
                    초상 카드
                  </ViewBtn>
                </ViewToggle>
              </ToolbarRight>
            </FilterToolbar>

            {groups.length === 0 ? (
              <NoMatchRow>
                선택한 필터나 검색어와 일치하는 소속 인물이 없습니다.
              </NoMatchRow>
            ) : (
              groups.map((group) => {
                const isCollapsed = collapsed.has(group.key)
                const historicalTargetId = group.historicalCountryId
                return (
                  <Group key={group.key}>
                    <GroupHeadRow>
                      <GroupToggleBtn
                        type="button"
                        onClick={() => toggle(group.key)}
                        aria-expanded={!isCollapsed}
                      >
                        <Caret $collapsed={isCollapsed} aria-hidden>
                          <FiChevronDown size={14} />
                        </Caret>
                        <GroupLabel>{group.label}</GroupLabel>
                        {historicalTargetId ? (
                          <PastBadge>과거 국가</PastBadge>
                        ) : (
                          <ModernBadge>현대 국가</ModernBadge>
                        )}
                        <GroupCount>{group.persons.length}명</GroupCount>
                      </GroupToggleBtn>

                      {historicalTargetId && (
                        <GroupCountryLinkBtn
                          type="button"
                          onClick={() =>
                            navigate(pathKeys.countryDetail(historicalTargetId))
                          }
                        >
                          국가 상세 →
                        </GroupCountryLinkBtn>
                      )}
                    </GroupHeadRow>

                    {!isCollapsed &&
                      (viewMode === 'ledger' ? (
                        <PersonLedgerGrid>
                          {group.persons.map((person) => {
                            const displayName =
                              getPersonDisplayName(person, true) || person.name
                            const roleLabel = getPrimaryRoleLabel(person)
                            const lifespanLabel = formatPersonLifespan(person)
                            return (
                              <PersonLedgerCell
                                key={`${group.key}-${person.id}`}
                              >
                                <PersonLedgerMainBtn
                                  type="button"
                                  onClick={() => setPreviewPersonId(person.id)}
                                >
                                  <PersonAvatar>
                                    {person.profileImageUrl ? (
                                      <img
                                        src={getUploadImageUrl(
                                          person.profileImageUrl,
                                        )}
                                        alt=""
                                        loading="lazy"
                                      />
                                    ) : (
                                      <span>{displayName.slice(0, 1)}</span>
                                    )}
                                  </PersonAvatar>

                                  <PersonMetaCol>
                                    <PersonNameRow>
                                      <PersonNameText>
                                        {displayName}
                                      </PersonNameText>
                                      {roleLabel && (
                                        <PersonRoleBadge>
                                          {roleLabel}
                                        </PersonRoleBadge>
                                      )}
                                    </PersonNameRow>
                                    <PersonLifespanText>
                                      {lifespanLabel}
                                    </PersonLifespanText>
                                  </PersonMetaCol>
                                </PersonLedgerMainBtn>

                                <PersonDetailBtn
                                  type="button"
                                  onClick={() =>
                                    navigate(
                                      pathKeys.personsTimelineDetail(person.id),
                                    )
                                  }
                                >
                                  상세 →
                                </PersonDetailBtn>
                              </PersonLedgerCell>
                            )
                          })}
                        </PersonLedgerGrid>
                      ) : (
                        <CardGrid>
                          {group.persons.map((person, index) => (
                            <PersonCard
                              key={`${group.key}-${person.id}`}
                              person={person}
                              index={index}
                              onClick={() =>
                                navigate(
                                  pathKeys.personsTimelineDetail(person.id),
                                )
                              }
                            />
                          ))}
                        </CardGrid>
                      ))}
                  </Group>
                )
              })
            )}
          </>
        )}

        <PersonInlineModal
          personId={previewPersonId}
          onClose={() => setPreviewPersonId(null)}
        />
      </SectionWrap>
    </DashboardStyles.DashboardRoot>
  )
}

const SectionWrap = styled.section`
  display: flex;
  flex-direction: column;
  width: 100%;
`

const HeadRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 14px;
`

const HeadText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const Title = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Description = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeadActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const HeadActionBtn = styled.button`
  padding: 5px 11px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 6px;
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.active};
    color: ${({ theme }) => theme.colors.active};
  }
`

const FilterToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 8px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const FilterChipGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
`

const FilterChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  font-family: inherit;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.active : theme.colors.text.secondary};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  cursor: pointer;

  &:hover {
    color: ${({ theme, $active }) =>
      $active ? theme.colors.active : theme.colors.text.primary};
  }
`

const FilterChipCount = styled.span`
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  opacity: 0.85;
`

const ToolbarRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const FilterStatusWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const FilterResultText = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const FilterResetBtn = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.active};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const SearchInput = styled.input`
  width: min(240px, 100%);
  height: 30px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  font-family: inherit;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12.5px;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.active};
  }
`

const ViewToggle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 6px;
`

const ViewBtn = styled.button<{ $active: boolean }>`
  padding: 4px 9px;
  border: none;
  border-radius: 4px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.active : theme.colors.text.secondary};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  cursor: pointer;
`

const Group = styled.section`
  display: flex;
  flex-direction: column;
  padding-top: 8px;
`

const GroupHeadRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.medium};
`

const GroupToggleBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  padding: 10px 0;
  border: none;
  background: transparent;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
`

const GroupCountryLinkBtn = styled.button`
  padding: 4px 6px;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.colors.active};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const Caret = styled.span<{ $collapsed: boolean }>`
  display: inline-flex;
  color: ${({ theme }) => theme.colors.text.tertiary};
  transition: transform 0.15s ease;
  transform: rotate(${({ $collapsed }) => ($collapsed ? '-90deg' : '0deg')});
`

const GroupLabel = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const PastBadge = styled.span`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#92400e')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(245,158,11,0.16)' : '#fef3c7'};
`

const ModernBadge = styled.span`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.active};
  background: ${({ theme }) => theme.colors.activeLight};
`

const GroupCount = styled.span`
  margin-left: auto;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

const PersonLedgerGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);

  @media (min-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const PersonLedgerCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (min-width: 760px) {
    &:nth-child(even) {
      border-left: 1px solid ${({ theme }) => theme.colors.border.light};
    }

    &:last-child:nth-child(odd) {
      grid-column: 1 / -1;
    }
  }
`

const PersonLedgerMainBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  padding: 10px 10px;
  border: none;
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc'};
  }
`

const PersonAvatar = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9'};
  border: 1px solid ${({ theme }) => theme.colors.border.light};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const PersonMetaCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const PersonNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
`

const PersonNameText = styled.span`
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const PersonRoleBadge = styled.span`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.active};
  background: ${({ theme }) => theme.colors.activeLight};
`

const PersonLifespanText = styled.span`
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PersonDetailBtn = styled.button`
  padding: 6px 10px;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.active};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  padding-top: 10px;
`

const NoMatchRow = styled.p`
  margin: 0;
  padding: 20px 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const ErrorRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const RetryButton = styled.button`
  border: none;
  background: transparent;
  padding: 0 2px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.active};
  text-decoration: underline;
  cursor: pointer;
`

const EmptySpecGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  border-top: 1px solid ${({ theme }) => theme.colors.border.medium};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (min-width: 720px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const EmptySpecCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 14px;
  min-width: 0;

  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  }

  @media (min-width: 720px) {
    & + & {
      border-top: none;
      border-left: 1px solid ${({ theme }) => theme.colors.border.light};
    }
  }
`

const EmptySpecTitle = styled.div`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EmptySpecDesc = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EmptyActionBtn = styled.button`
  align-self: flex-start;
  margin-top: 4px;
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.active};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`
