/**
 * 국가 상세 인물 탭 — "이 나라의 역사 집단 · 계파 · 세대" 블록.
 * countryId / historicalCountryId로 연결된 세대·계파·학파·사단 등을 플랫 인포그래픽 스트립으로 표시.
 */
import { useQuery } from '@tanstack/react-query'
import { FiArrowUpRight, FiUsers } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerBackground,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerSubtleFill,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import {
  GROUP_TONE,
  type GroupTone,
  listPersonGroups,
  PERSON_GROUP_TYPE_META,
} from '@/shared/api/person-groups'
import { pathKeys } from '@/shared/router'

const isDark = (mode: 'light' | 'dark') => mode === 'dark'

interface Props {
  countryId?: string
  historicalCountryId?: string
}

export function CountryPersonGroupsBlock({
  countryId,
  historicalCountryId,
}: Props) {
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['person-groups-by-country', countryId, historicalCountryId],
    queryFn: () => listPersonGroups({ countryId, historicalCountryId }),
    enabled: Boolean(countryId || historicalCountryId),
    staleTime: 30_000,
  })

  if (isLoading || groups.length === 0) return null

  const maxMembers = Math.max(...groups.map((grp) => grp.memberCount || 0), 1)

  return (
    <Wrap aria-label="소속 인물 집단 및 계파">
      <Head>
        <Title>
          <FiUsers size={13} />
          <span>소속 집단 · 계파 · 세대</span>
          <Count>{groups.length}</Count>
        </Title>
        <AllLink
          to={pathKeys.personGroups({ countryId, historicalCountryId })}
        >
          <span>집단 전체 보기</span>
          <FiArrowUpRight size={12} />
        </AllLink>
      </Head>
      <Chips>
        {groups.slice(0, 12).map((grp) => {
          const meta = PERSON_GROUP_TYPE_META[grp.type]
          const barPct =
            grp.memberCount > 0
              ? Math.max(12, Math.round((grp.memberCount / maxMembers) * 100))
              : 0
          return (
            <GroupChip key={grp.id} to={pathKeys.personGroupDetail(grp.id)}>
              <ChipTop>
                <Dot $tone={meta.tone} />
                <ChipTypeBadge $tone={meta.tone}>{meta.label}</ChipTypeBadge>
                <ChipName>{grp.name}</ChipName>
                {grp.type === 'GENERATION' && grp.generationOrder != null && (
                  <ChipOrd>{grp.generationOrder}세대</ChipOrd>
                )}
                <ChipCount>{grp.memberCount}명</ChipCount>
              </ChipTop>
              {barPct > 0 && (
                <MiniMemberBar>
                  <MiniMemberFill $tone={meta.tone} $pct={barPct} />
                </MiniMemberBar>
              )}
            </GroupChip>
          )
        })}
      </Chips>
    </Wrap>
  )
}

const Wrap = styled.div`
  margin-bottom: 18px;
  padding: 18px 0 22px;
  border: none;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-radius: 0;
  background: transparent;
  box-shadow: none;
`

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
`

const Title = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  font-weight: 780;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
  svg {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const Count = styled.span`
  padding: 0;
  font-size: 12px;
  font-weight: 650;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const AllLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-decoration: none;
  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const Chips = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 10px;
`

const GroupChip = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
  text-decoration: none;
  transition:
    border-color 0.14s ease,
    background 0.14s ease;
  &:hover {
    border-color: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const ChipTop = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

const Dot = styled.span<{ $tone: GroupTone }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $tone, theme }) =>
    isDark(theme.mode) ? GROUP_TONE[$tone].fgDark : GROUP_TONE[$tone].fgLight};
`

const ChipTypeBadge = styled.span<{ $tone: GroupTone }>`
  padding: 0 5px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
  color: ${({ $tone, theme }) =>
    isDark(theme.mode) ? GROUP_TONE[$tone].fgDark : GROUP_TONE[$tone].fgLight};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

const ChipName = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
`

const ChipOrd = styled.span`
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
  color: ${({ theme }) => (isDark(theme.mode) ? '#fcd34d' : '#b45309')};
  ${DIGIT_DISPLAY}
`

const ChipCount = styled.span`
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const MiniMemberBar = styled.div`
  width: 100%;
  height: 3px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  overflow: hidden;
`

const MiniMemberFill = styled.div<{ $tone: GroupTone; $pct: number }>`
  width: ${({ $pct }) => `${$pct}%`};
  height: 100%;
  border-radius: 999px;
  opacity: 0.78;
  background: ${({ $tone, theme }) =>
    isDark(theme.mode) ? GROUP_TONE[$tone].fgDark : GROUP_TONE[$tone].fgLight};
`
