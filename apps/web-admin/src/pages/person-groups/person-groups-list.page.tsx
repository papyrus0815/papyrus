/**
 * 인물 묶음 허브/목록 페이지 (/person-groups).
 * 유형 칩 필터 + 이름 검색 + 카드 그리드 → 상세 페이지. 인물 없이 새 묶음 생성.
 * URL ?type=&countryId= 로 딥링크 (국가 상세 "집단 전체 보기" 진입 등).
 */
import { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FiPlus, FiSearch, FiUsers } from 'react-icons/fi'
import styled from 'styled-components'

import {
  GROUP_TONE,
  PERSON_GROUP_TYPE_META,
  PERSON_GROUP_TYPE_ORDER,
  listPersonGroups,
  type GroupTone,
  type PersonGroupType,
} from '@/shared/api/person-groups'
import { getAllCountries } from '@/shared/api/countries'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import { PersonGroupCreateModal } from '@/widgets/person/person-group-create-modal/person-group-create-modal'
import { GroupTypeBadge } from '@/widgets/person/person-group-ui/group-type-ui'

const isDark = (mode: 'light' | 'dark') => mode === 'dark'

export default function PersonGroupsListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const typeParam = (searchParams.get('type') as PersonGroupType | null) ?? null
  const countryId = searchParams.get('countryId') ?? undefined

  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['person-groups-all', countryId],
    queryFn: () => listPersonGroups(countryId ? { countryId } : undefined),
    staleTime: 30_000,
  })

  const { data: countries = [] } = useQuery({
    queryKey: ['all-countries'],
    queryFn: () => getAllCountries(),
    staleTime: 5 * 60_000,
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return groups
      .filter((g) => !typeParam || g.type === typeParam)
      .filter((g) => !q || g.name.toLowerCase().includes(q))
  }, [groups, typeParam, search])

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

  return (
    <Page>
      <HeaderRow>
        <div>
          <PageTitle>
            <FiUsers size={22} />
            집단
          </PageTitle>
          <PageDesc>세대·기수·계파·학파·사단 등 인물 묶음</PageDesc>
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
              placeholder="묶음 이름 검색…"
            />
          </SearchBox>
          <CountrySelect
            value={countryId ?? ''}
            onChange={(e) => setCountry(e.target.value)}
          >
            <option value="">모든 국가</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </CountrySelect>
        </TopRow>
        <Filters>
          <FilterChip $active={!typeParam} onClick={() => setType(null)}>
            전체
          </FilterChip>
          {PERSON_GROUP_TYPE_ORDER.map((t) => {
            const meta = PERSON_GROUP_TYPE_META[t]
            return (
              <FilterChip
                key={t}
                $active={typeParam === t}
                $tone={meta.tone}
                onClick={() => setType(typeParam === t ? null : t)}
              >
                {meta.label}
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
          {groups.length === 0
            ? '아직 만들어진 묶음이 없습니다. ‘새 묶음’으로 시작해 보세요.'
            : '조건에 맞는 묶음이 없습니다.'}
        </Empty>
      ) : (
        <Grid>
          {filtered.map((g) => {
            return (
              <Card
                key={g.id}
                type="button"
                onClick={() => navigate(pathKeys.personGroupDetail(g.id))}
              >
                <CardTop>
                  <GroupTypeBadge type={g.type} />
                  {g.type === 'GENERATION' && g.generationOrder != null && (
                    <OrdinalTag>{g.generationOrder}세대</OrdinalTag>
                  )}
                </CardTop>
                <CardName>{g.name}</CardName>
                <CardMeta>
                  <span>{g.memberCount}명</span>
                  {g.center && (
                    <CenterText>
                      · ★ {getPersonDisplayName(g.center, true)}
                    </CenterText>
                  )}
                  {g.countryName && <span>· {g.countryName}</span>}
                </CardMeta>
                {g.description?.trim() && (
                  <CardDesc>{g.description}</CardDesc>
                )}
              </Card>
            )
          })}
        </Grid>
      )}

      {showCreate && (
        <PersonGroupCreateModal
          defaultCountryId={countryId}
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
  max-width: 1100px;
  margin: 0 auto;
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
  font-size: 14px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 220px;
  max-width: 360px;
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

const Filters = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const FilterChip = styled.button<{ $active: boolean; $tone?: GroupTone }>`
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.13s ease;
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

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
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
  display: inline-flex;
  align-items: center;
  gap: 7px;
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

const Empty = styled.div`
  padding: 60px 20px;
  text-align: center;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border: 1px dashed ${({ theme }) => theme.colors.border.medium};
  border-radius: 14px;
`

const SkCard = styled.div`
  height: 130px;
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`
