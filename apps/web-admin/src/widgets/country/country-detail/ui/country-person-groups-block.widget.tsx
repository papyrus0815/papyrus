/**
 * 국가 상세 인물 탭 — "이 나라의 집단" 블록.
 * countryId로 연결된 세대·계파·사단 등을 칩으로 보여주고, 묶음 상세/허브로 이동.
 */
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FiChevronRight, FiUsers } from 'react-icons/fi'
import styled from 'styled-components'

import {
  GROUP_TONE,
  PERSON_GROUP_TYPE_META,
  listPersonGroups,
  type GroupTone,
} from '@/shared/api/person-groups'
import { pathKeys } from '@/shared/router'

const isDark = (mode: 'light' | 'dark') => mode === 'dark'

interface Props {
  countryId: string
}

export function CountryPersonGroupsBlock({ countryId }: Props) {
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['person-groups-all', countryId],
    queryFn: () => listPersonGroups({ countryId }),
    enabled: Boolean(countryId),
    staleTime: 30_000,
  })

  if (isLoading || groups.length === 0) return null

  return (
    <Wrap>
      <Head>
        <Title>
          <FiUsers size={14} />
          이 나라의 집단
          <Count>{groups.length}</Count>
        </Title>
        <AllLink to={pathKeys.personGroups({ countryId })}>
          전체 보기 <FiChevronRight size={13} />
        </AllLink>
      </Head>
      <Chips>
        {groups.slice(0, 12).map((g) => {
          const meta = PERSON_GROUP_TYPE_META[g.type]
          return (
            <GroupChip key={g.id} to={pathKeys.personGroupDetail(g.id)}>
              <Dot $tone={meta.tone} />
              <ChipName>{g.name}</ChipName>
              {g.type === 'GENERATION' && g.generationOrder != null && (
                <ChipOrd>{g.generationOrder}세대</ChipOrd>
              )}
              <ChipCount>{g.memberCount}</ChipCount>
            </GroupChip>
          )
        })}
      </Chips>
    </Wrap>
  )
}

const Wrap = styled.div`
  margin-bottom: 18px;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`

const Title = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  svg {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const Count = styled.span`
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.background.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const AllLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-decoration: none;
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const GroupChip = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  text-decoration: none;
  transition: border-color 0.13s ease, transform 0.13s ease;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    transform: translateY(-1px);
  }
`

const Dot = styled.span<{ $tone: GroupTone }>`
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: ${({ $tone, theme }) =>
    isDark(theme.mode) ? GROUP_TONE[$tone].fgDark : GROUP_TONE[$tone].fgLight};
`

const ChipName = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ChipOrd = styled.span`
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => (isDark(theme.mode) ? '#ffd60a' : '#b45309')};
`

const ChipCount = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
