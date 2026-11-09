/**
 * 인물 묶음 허브/목록 페이지 (/person-groups).
 * 유형 칩 필터 + 이름·인물·설명 검색 + 카드 그리드(멤버 아바타 스택·미리보기) → 상세 페이지.
 * URL ?type=&countryId=&historicalCountryId= 로 딥링크 (국가 상세 "집단 전체 보기" 진입 등).
 */
import { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FiPlus, FiSearch, FiUsers, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import {
  GROUP_TONE,
  PERSON_GROUP_TYPE_META,
  PERSON_GROUP_TYPE_ORDER,
  listPersonGroups,
  type GroupTone,
  type PersonGroup,
  type PersonGroupType,
} from '@/shared/api/person-groups'
import { getAllCountries } from '@/shared/api/countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import { PersonGroupCreateModal } from '@/widgets/person/person-group-create-modal/person-group-create-modal'
import {
  GroupTypeBadge,
  sortGroupMembers,
} from '@/widgets/person/person-group-ui/group-type-ui'

const isDark = (mode: 'light' | 'dark') => mode === 'dark'

function groupMatchesModernCountry(g: PersonGroup, cid: string): boolean {
  if (g.countryId === cid) return true
  return (g.members ?? []).some((m) => {
    const c = m.person.country
    if (c?.modernCountryId) return c.modernCountryId === cid
    if (!c?.isHistorical && m.person.countryId === cid) return true
    return false
  })
}

function groupMatchesHistoricalCountry(g: PersonGroup, hcid: string): boolean {
  if (g.historicalCountryId === hcid) return true
  return (g.members ?? []).some((m) => {
    if (m.person.historicalCountryId === hcid) return true
    if (m.person.country?.isHistorical && m.person.countryId === hcid) {
      return true
    }
    return false
  })
}

function groupMatchesQuery(g: PersonGroup, q: string): boolean {
  if (!q) return true
  if (g.name.toLowerCase().includes(q)) return true
  if (g.description?.toLowerCase().includes(q)) return true
  if (g.countryName?.toLowerCase().includes(q)) return true
  if (g.historicalCountryName?.toLowerCase().includes(q)) return true
  if (
    g.center &&
    getPersonDisplayName(g.center, true).toLowerCase().includes(q)
  ) {
    return true
  }
  return (g.members ?? []).some((m) => {
    const disp = getPersonDisplayName(m.person, true).toLowerCase()
    if (disp.includes(q)) return true
    if (m.person.name?.toLowerCase().includes(q)) return true
    if (m.person.surname?.toLowerCase().includes(q)) return true
    if (m.roleLabel?.toLowerCase().includes(q)) return true
    if (m.note?.toLowerCase().includes(q)) return true
    return false
  })
}

function deriveGroupCountryBadge(g: PersonGroup): string | null {
  if (g.historicalCountryName || g.countryName) {
    return [g.historicalCountryName, g.countryName].filter(Boolean).join(' · ')
  }
  const names = Array.from(
    new Set(
      (g.members ?? [])
        .map((m) => m.person.country?.name)
        .filter((n): n is string => Boolean(n)),
    ),
  )
  if (names.length === 0) return null
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} · ${names[1]}`
  return `다국적 (${names.slice(0, 2).join('·')} 외 ${names.length - 2}개국)`
}

export default function PersonGroupsListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const typeParam = (searchParams.get('type') as PersonGroupType | null) ?? null
  const countryId = searchParams.get('countryId') ?? undefined
  const historicalCountryId =
    searchParams.get('historicalCountryId') ?? undefined

  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const { data: allGroups = [], isLoading } = useQuery({
    queryKey: ['person-groups-all'],
    queryFn: () => listPersonGroups(),
    staleTime: 30_000,
  })

  const { data: countries = [] } = useQuery({
    queryKey: ['all-countries'],
    queryFn: () => getAllCountries(),
    staleTime: 5 * 60_000,
  })

  const { data: historicalCountries = [] } = useQuery({
    queryKey: ['all-historical-countries'],
    queryFn: () => getAllHistoricalCountries(),
    staleTime: 5 * 60_000,
  })

  /** 실제 집단(또는 소속 인물)이 존재하는 국가 옵션만 건수와 함께 노출 */
  const availableHistoricalCountries = useMemo(() => {
    const counts = new Map<string, number>()
    for (const hc of historicalCountries) {
      const cnt = allGroups.filter((g) =>
        groupMatchesHistoricalCountry(g, hc.id),
      ).length
      if (cnt > 0 || hc.id === historicalCountryId) {
        counts.set(hc.id, cnt)
      }
    }
    return historicalCountries
      .filter((hc) => counts.has(hc.id))
      .map((hc) => ({ ...hc, count: counts.get(hc.id) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'))
  }, [allGroups, historicalCountries, historicalCountryId])

  const availableModernCountries = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of countries) {
      const cnt = allGroups.filter((g) =>
        groupMatchesModernCountry(g, c.id),
      ).length
      if (cnt > 0 || c.id === countryId) {
        counts.set(c.id, cnt)
      }
    }
    return countries
      .filter((c) => counts.has(c.id))
      .map((c) => ({ ...c, count: counts.get(c.id) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'))
  }, [allGroups, countries, countryId])

  /** 국가 + 검색어까지 반영된 기본 집합 (유형 칩 건수 계산 기준) */
  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allGroups
      .filter((g) => !countryId || groupMatchesModernCountry(g, countryId))
      .filter(
        (g) =>
          !historicalCountryId ||
          groupMatchesHistoricalCountry(g, historicalCountryId),
      )
      .filter((g) => groupMatchesQuery(g, q))
  }, [allGroups, countryId, historicalCountryId, search])

  const typeCounts = useMemo(() => {
    const map = new Map<PersonGroupType, number>()
    for (const g of baseFiltered) {
      map.set(g.type, (map.get(g.type) ?? 0) + 1)
    }
    return map
  }, [baseFiltered])

  const filtered = useMemo(
    () =>
      baseFiltered.filter((g) => !typeParam || g.type === typeParam),
    [baseFiltered, typeParam],
  )

  const setType = (t: PersonGroupType | null) => {
    const next = new URLSearchParams(searchParams)
    if (t) next.set('type', t)
    else next.delete('type')
    setSearchParams(next)
  }

  const setCountry = (id: string) => {
    const next = new URLSearchParams(searchParams)
    if (id) next.set('countryId', id)
    else next.delete('countryId')
    setSearchParams(next)
  }

  const setHistoricalCountry = (id: string) => {
    const next = new URLSearchParams(searchParams)
    if (id) next.set('historicalCountryId', id)
    else next.delete('historicalCountryId')
    setSearchParams(next)
  }

  const hasActiveFilter = Boolean(
    typeParam || countryId || historicalCountryId || search.trim(),
  )

  const clearAllFilters = () => {
    setSearch('')
    setSearchParams(new URLSearchParams())
  }

  return (
    <Page>
      <HeaderRow>
        <div>
          <PageTitle>
            <FiUsers size={22} />
            집단
            <TotalBadge>{allGroups.length}</TotalBadge>
          </PageTitle>
          <PageDesc>
            세대·기수·계파·학파·사단·진영 등 공유 정체성을 갖는 인물 묶음
          </PageDesc>
        </div>
        <CreateBtn type="button" onClick={() => setShowCreate(true)}>
          <FiPlus size={17} />새 묶음
        </CreateBtn>
      </HeaderRow>

      <Toolbar>
        <TopRow>
          <SearchBox>
            <FiSearch size={15} />
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="묶음 이름·소속 인물·역할·설명 검색…"
            />
            {search && (
              <ClearInputBtn
                type="button"
                onClick={() => setSearch('')}
                aria-label="검색어 지우기"
              >
                <FiX size={14} />
              </ClearInputBtn>
            )}
          </SearchBox>
          <CountrySelect
            value={historicalCountryId ?? ''}
            onChange={(e) => setHistoricalCountry(e.target.value)}
          >
            <option value="">
              역사 국가 전체 ({availableHistoricalCountries.length})
            </option>
            {availableHistoricalCountries.map((hc) => (
              <option key={hc.id} value={hc.id}>
                {hc.name} ({hc.count})
              </option>
            ))}
          </CountrySelect>
          <CountrySelect
            value={countryId ?? ''}
            onChange={(e) => setCountry(e.target.value)}
          >
            <option value="">
              현대 국가 전체 ({availableModernCountries.length})
            </option>
            {availableModernCountries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.count})
              </option>
            ))}
          </CountrySelect>
          {hasActiveFilter && (
            <ResetBtn type="button" onClick={clearAllFilters}>
              필터 초기화
            </ResetBtn>
          )}
        </TopRow>
        <Filters>
          <FilterChip $active={!typeParam} onClick={() => setType(null)}>
            전체 <ChipCount>{baseFiltered.length}</ChipCount>
          </FilterChip>
          {PERSON_GROUP_TYPE_ORDER.map((t) => {
            const meta = PERSON_GROUP_TYPE_META[t]
            const cnt = typeCounts.get(t) ?? 0
            return (
              <FilterChip
                key={t}
                $active={typeParam === t}
                $tone={meta.tone}
                $dim={cnt === 0 && typeParam !== t}
                onClick={() => setType(typeParam === t ? null : t)}
              >
                {meta.label} <ChipCount>{cnt}</ChipCount>
              </FilterChip>
            )
          })}
        </Filters>
      </Toolbar>

      {isLoading ? (
        <Grid>
          {Array.from({ length: 8 }, (_, i) => (
            <SkCard key={i} />
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        <Empty>
          {allGroups.length === 0
            ? '아직 만들어진 묶음이 없습니다. ‘새 묶음’으로 시작해 보세요.'
            : '조건에 맞는 묶음이 없습니다.'}
        </Empty>
      ) : (
        <Grid>
          {filtered.map((g) => {
            const sortedMembers = sortGroupMembers(
              g.members ?? [],
              g.center?.id,
            )
            const previewMembers = sortedMembers.slice(0, 4)
            const extraCount = Math.max(
              0,
              (g.memberCount || sortedMembers.length) - previewMembers.length,
            )
            const countryBadge = deriveGroupCountryBadge(g)

            return (
              <Card
                key={g.id}
                type="button"
                onClick={() => navigate(pathKeys.personGroupDetail(g.id))}
              >
                <CardTop>
                  <CardBadges>
                    <GroupTypeBadge type={g.type} />
                    {g.type === 'GENERATION' && g.generationOrder != null && (
                      <OrdinalTag>{g.generationOrder}세대</OrdinalTag>
                    )}
                  </CardBadges>
                  {countryBadge && <CountryPill>{countryBadge}</CountryPill>}
                </CardTop>

                <CardName>{g.name}</CardName>

                <CardMeta>
                  <MemberCountStrong>{g.memberCount}명</MemberCountStrong>
                  {Boolean(g.eventSideCount) && (
                    <span>· 사건 {g.eventSideCount}건</span>
                  )}
                  {g.center && (
                    <CenterText>
                      · ★ {getPersonDisplayName(g.center, true)}
                    </CenterText>
                  )}
                </CardMeta>

                {g.description?.trim() && (
                  <CardDesc>{g.description}</CardDesc>
                )}

                {sortedMembers.length > 0 && (
                  <MemberPreviewRow>
                    <AvatarStack>
                      {sortedMembers.slice(0, 5).map((m) => (
                        <MiniAvatar key={m.membershipId}>
                          {m.person.profileImageUrl ? (
                            <img
                              src={m.person.profileImageUrl}
                              alt={m.person.name}
                            />
                          ) : (
                            <span>{m.person.name.slice(0, 1)}</span>
                          )}
                        </MiniAvatar>
                      ))}
                    </AvatarStack>
                    <MemberNamesText>
                      {previewMembers
                        .map((m) => getPersonDisplayName(m.person, true))
                        .join(' · ')}
                      {extraCount > 0 ? ` 외 ${extraCount}명` : ''}
                    </MemberNamesText>
                  </MemberPreviewRow>
                )}
              </Card>
            )
          })}
        </Grid>
      )}

      {showCreate && (
        <PersonGroupCreateModal
          defaultCountryId={countryId}
          defaultHistoricalCountryId={historicalCountryId}
          defaultType={typeParam ?? 'FACTION'}
          onClose={() => setShowCreate(false)}
          onCreated={(group) => {
            setShowCreate(false)
            navigate(pathKeys.personGroupDetail(group.id))
          }}
        />
      )}
    </Page>
  )
}

/* ─── styles ───────────────────────────────────────────────────────────── */

const Page = styled.div`
  padding: 28px 24px 60px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const HeaderRow = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`

const PageTitle = styled.h1`
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
  svg {
    color: ${({ theme }) => theme.colors.primary};
  }
`

const TotalBadge = styled.span`
  padding: 2px 9px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const PageDesc = styled.p`
  margin: 6px 0 0;
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CreateBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 11px 18px;
  font-size: 14px;
  font-weight: 700;
  border-radius: 10px;
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  cursor: pointer;
`

const Toolbar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const TopRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
`

const CountrySelect = styled.select`
  padding: 10px 14px;
  font-size: 13.5px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const ResetBtn = styled.button`
  padding: 9px 13px;
  font-size: 12.5px;
  font-weight: 600;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 240px;
  max-width: 400px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SearchInput = styled.input`
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  &:focus {
    outline: none;
  }
`

const ClearInputBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Filters = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const FilterChip = styled.button<{
  $active: boolean
  $tone?: GroupTone
  $dim?: boolean
}>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.13s ease;
  opacity: ${({ $dim }) => ($dim ? 0.45 : 1)};
  border: 1.5px solid
    ${({ $active, $tone, theme }) =>
      $active
        ? $tone
          ? isDark(theme.mode)
            ? GROUP_TONE[$tone].fgDark
            : GROUP_TONE[$tone].fgLight
          : theme.colors.primary
        : theme.colors.border.default};
  background: ${({ $active, $tone, theme }) =>
    $active
      ? $tone
        ? isDark(theme.mode)
          ? GROUP_TONE[$tone].bgDark
          : GROUP_TONE[$tone].bgLight
        : isDark(theme.mode)
          ? 'rgba(99,106,242,0.16)'
          : 'rgba(99,102,241,0.10)'
      : theme.colors.background.primary};
  color: ${({ $active, $tone, theme }) =>
    $active
      ? $tone
        ? isDark(theme.mode)
          ? GROUP_TONE[$tone].fgDark
          : GROUP_TONE[$tone].fgLight
        : theme.colors.primary
      : theme.colors.text.secondary};
`

const ChipCount = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  opacity: 0.78;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
`

const Card = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 9px;
  padding: 18px;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  cursor: pointer;
  text-align: left;
  transition: transform 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease;
  &:hover {
    transform: translateY(-2px);
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 8px 20px ${({ theme }) => theme.colors.shadow.sm};
  }
`

const CardTop = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
`

const CardBadges = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
`

const CountryPill = styled.span`
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const OrdinalTag = styled.span`
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  background: ${({ theme }) =>
    isDark(theme.mode) ? 'rgba(255,214,10,0.18)' : 'rgba(245,158,11,0.14)'};
  color: ${({ theme }) => (isDark(theme.mode) ? '#ffd60a' : '#b45309')};
`

const CardName = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  word-break: keep-all;
  line-height: 1.35;
`

const CardMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MemberCountStrong = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CenterText = styled.span`
  color: ${({ theme }) => (isDark(theme.mode) ? '#ffd60a' : '#b45309')};
  font-weight: 600;
`

const CardDesc = styled.p`
  margin: 2px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const MemberPreviewRow = styled.div`
  margin-top: auto;
  padding-top: 10px;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const AvatarStack = styled.div`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
`

const MiniAvatar = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid ${({ theme }) => theme.colors.background.primary};
  background: ${({ theme }) => theme.colors.background.secondary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-left: -6px;
  &:first-child {
    margin-left: 0;
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const MemberNamesText = styled.div`
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Empty = styled.div`
  padding: 60px 20px;
  text-align: center;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border: 1px dashed ${({ theme }) => theme.colors.border.medium};
  border-radius: 14px;
`

const SkCard = styled.div`
  height: 170px;
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`
