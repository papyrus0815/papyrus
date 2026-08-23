/**
 * 국가 상세 "인물" 탭 — 이 국가의 현대 인물과 **연결된 과거 국가별** 인물을 함께 보여준다.
 *
 * 예전엔 `/country/:id/persons`가 인물 대시보드로 리다이렉트만 했다. 그러면 국가 지면에
 * 머문 채로는 그 나라 사람을 볼 수 없고, 무엇보다 **과거 국가 인물이 어느 나라 사람인지**가
 * 사라진다(대시보드는 현대 국가 축으로만 필터한다). 그래서 지면 안으로 되가져온다.
 *
 * 데이터는 서버가 한 번에 나눠 준다(GET /persons/by-country/:id/grouped):
 * 현대 축 3원 합집합(본체 FK·재임/재위·소속)과, 브리지된 과거 국가별 같은 3원 합집합.
 * 한 인물이 두 축에 걸리면 서버가 역사 그룹에만 남긴다(역사 우선).
 */
import React, { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiChevronDown, FiUsers } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { personApi } from '@/shared/api/person'
import type { PersonResponseDto as Person } from '@/shared/api/persons'
import { pathKeys } from '@/shared/router'

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

export function CountryPersonsSection({ country }: CountryPersonsSectionProps) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['persons', 'by-country-grouped', country.id],
    queryFn: () => personApi.getByCountryIdGrouped(country.id),
    staleTime: 60_000,
  })

  const groups = useMemo<PersonGroup[]>(() => {
    if (!data) return []
    const lowered = query.trim().toLowerCase()
    const match = (person: Person) =>
      !lowered ||
      [person.name, person.surname, person.regnalName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(lowered)

    const result: PersonGroup[] = []
    const modern = data.modern.filter(match)
    if (modern.length > 0) {
      result.push({
        key: '__modern__',
        // '(현재)'를 붙이지 않는다 — 이 묶음은 '현대 국가 축에 걸린 인물'이지
        // '현재 살아있는 사람'이 아니다. 실제로 중세 인물이 여기 들어온다
        // (Person.countryId가 현대 독일이거나 재임이 현대 축에 달린 경우).
        label: country.name,
        historicalCountryId: null,
        persons: modern,
      })
    }
    for (const group of data.historical) {
      const persons = group.persons.filter(match)
      if (persons.length === 0) continue
      result.push({
        key: group.historicalCountryId,
        label: group.historicalCountryName,
        historicalCountryId: group.historicalCountryId,
        persons,
      })
    }
    return result
  }, [data, query, country.name])

  const total = useMemo(
    () => groups.reduce((sum, group) => sum + group.persons.length, 0),
    [groups],
  )

  const toggle = (key: string) =>
    setCollapsed((previous) => {
      const next = new Set(previous)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  if (isLoading) {
    return <Notice aria-busy="true">인물을 불러오는 중…</Notice>
  }
  if (isError) {
    return (
      <Notice role="alert">
        인물을 불러오지 못했어요.{' '}
        <RetryButton type="button" onClick={() => void refetch()}>
          다시 시도
        </RetryButton>
      </Notice>
    )
  }

  const hasAny = (data?.modern.length ?? 0) + (data?.historical.length ?? 0) > 0

  return (
    <Root>
      <Head>
        <HeadTitle>
          <FiUsers size={16} />
          인물
          <HeadCount>{total}명</HeadCount>
        </HeadTitle>
        <HeadDesc>
          이 국가에 소속·재임·재위한 인물과, 연결된 과거 국가의 인물을 함께
          보여줍니다.
        </HeadDesc>
        {hasAny && (
          <SearchInput
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="이름으로 좁히기…"
            aria-label="인물 이름 검색"
          />
        )}
      </Head>

      {!hasAny && (
        <Notice>
          아직 이 국가에 연결된 인물이 없어요. 인물 등록에서 주 국적을 이 국가로
          지정하거나, 재임·재위 기록을 추가하면 여기에 나타납니다.
        </Notice>
      )}

      {hasAny && groups.length === 0 && (
        <Notice>&quot;{query}&quot;와 일치하는 인물이 없어요.</Notice>
      )}

      {groups.map((group) => {
        const isCollapsed = collapsed.has(group.key)
        return (
          <Group key={group.key}>
            <GroupHead
              type="button"
              onClick={() => toggle(group.key)}
              aria-expanded={!isCollapsed}
            >
              <Caret $collapsed={isCollapsed} aria-hidden>
                <FiChevronDown size={14} />
              </Caret>
              <GroupLabel>{group.label}</GroupLabel>
              {group.historicalCountryId && <PastBadge>과거</PastBadge>}
              <GroupCount>{group.persons.length}명</GroupCount>
            </GroupHead>
            {!isCollapsed && (
              <CardGrid>
                {group.persons.map((person, index) => (
                  <PersonCard
                    key={`${group.key}-${person.id}`}
                    person={person}
                    index={index}
                    onClick={() =>
                      navigate(pathKeys.personsTimelineDetail(person.id))
                    }
                  />
                ))}
              </CardGrid>
            )}
          </Group>
        )
      })}
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 24px 40px;
`

const Head = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const HeadTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const HeadCount = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

const HeadDesc = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SearchInput = styled.input`
  align-self: flex-start;
  width: min(320px, 100%);
  height: 34px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.active};
  }
`

const Group = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const GroupHead = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const Caret = styled.span<{ $collapsed: boolean }>`
  display: inline-flex;
  color: ${({ theme }) => theme.colors.text.tertiary};
  transition: transform 0.15s ease;
  transform: rotate(${({ $collapsed }) => ($collapsed ? '-90deg' : '0deg')});
`

const GroupLabel = styled.span`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

/** 과거 국가 묶음 표식 — 현대 국가 묶음과 한눈에 갈리게 */
const PastBadge = styled.span`
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#92400e')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(245,158,11,0.16)' : '#fef3c7'};
`

const GroupCount = styled.span`
  margin-left: auto;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
`

const Notice = styled.div`
  padding: 24px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const RetryButton = styled.button`
  border: none;
  background: transparent;
  padding: 0 2px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: underline;
  cursor: pointer;
`
