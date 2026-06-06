/**
 * 공개 프로필 (/profile/:accountId) — 타 사용자의 등급·뱃지 컬렉션 열람(자랑 보기).
 */
import React from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiArrowLeft } from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

import {
  BadgeList,
  GradeChip,
  fmtNum,
  gamificationProfileQueryOptions,
} from '@/entities/gamification'

export default function PublicProfilePage() {
  const { accountId = '' } = useParams()
  const navigate = useNavigate()
  const { data: profile, isLoading, isError } = useQuery(gamificationProfileQueryOptions(accountId))

  return (
    <Wrap>
      <BackBtn onClick={() => navigate(-1)}>
        <FiArrowLeft size={16} /> 뒤로
      </BackBtn>

      {isLoading && <Muted>프로필을 불러오는 중...</Muted>}
      {(isError || (!isLoading && !profile)) && (
        <Muted>프로필을 찾을 수 없습니다.</Muted>
      )}

      {profile && (
        <>
          <Hero>
            {profile.heroThumbnail ? (
              <Avatar src={profile.heroThumbnail} alt="" />
            ) : (
              <AvatarFallback>{profile.username.charAt(0).toUpperCase()}</AvatarFallback>
            )}
            <HeroInfo>
              <Name>{profile.username}</Name>
              <HeroMeta>
                <GradeChip gradeCode={profile.gradeCode} points={profile.totalPoints} />
                {profile.heroName && <HeroName>{profile.heroName}</HeroName>}
              </HeroMeta>
            </HeroInfo>
          </Hero>

          <Stats>
            <Stat>
              <StatValue>{profile.rank ? `${fmtNum(profile.rank)}위` : '미랭크'}</StatValue>
              <StatLabel>전체 순위</StatLabel>
            </Stat>
            <Stat>
              <StatValue>{fmtNum(profile.totalPoints)}P</StatValue>
              <StatLabel>누적 점수</StatLabel>
            </Stat>
            <Stat>
              <StatValue>{fmtNum(profile.contributionCount)}건</StatValue>
              <StatLabel>등록</StatLabel>
            </Stat>
            <Stat>
              <StatValue>{profile.badges.length}개</StatValue>
              <StatLabel>뱃지</StatLabel>
            </Stat>
          </Stats>

          {profile.centuryBreakdown.length > 0 && (
            <Panel>
              <PanelTitle>기여한 세기 ({profile.centuryBreakdown.length})</PanelTitle>
              <CenturyChips>
                {profile.centuryBreakdown.map((c) => (
                  <CenturyChip key={c.century ?? 'unknown'}>
                    {c.label}
                    <ChipCount>{fmtNum(c.entryCount)}</ChipCount>
                  </CenturyChip>
                ))}
              </CenturyChips>
            </Panel>
          )}

          <Panel>
            <PanelTitle>획득 뱃지 ({profile.badges.length})</PanelTitle>
            {profile.badges.length > 0 ? (
              <BadgeList badges={profile.badges} />
            ) : (
              <Muted>아직 획득한 뱃지가 없습니다.</Muted>
            )}
          </Panel>
        </>
      )}
    </Wrap>
  )
}

const Wrap = styled.div`
  height: 100vh;
  overflow-y: auto;
  padding: calc(var(--header-height, 64px) + 20px) 28px 64px;
  max-width: 760px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;

  @media (max-width: 640px) {
    padding: calc(var(--header-height, 64px) + 16px) 14px 56px;
  }
`

const BackBtn = styled.button`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: 0;
`

const Muted = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: 8px 0;
`

const Hero = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`

const Avatar = styled.img`
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
`

const AvatarFallback = styled.div`
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  font-weight: 800;
  color: #fff;
  background: ${({ theme }) => theme.colors.primary ?? '#6366f1'};
`

const HeroInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`

const Name = styled.h1`
  font-size: 22px;
  font-weight: 800;
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
`

const HeroMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const HeroName = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  @media (max-width: 560px) {
    grid-template-columns: repeat(2, 1fr);
  }
`

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  padding: 14px 8px;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border ?? 'rgba(0,0,0,0.06)'};
`

const StatValue = styled.div`
  font-size: 18px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const StatLabel = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Panel = styled.section`
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border ?? 'rgba(0,0,0,0.06)'};
  border-radius: 14px;
  padding: 16px 18px;
`

const PanelTitle = styled.h2`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 12px;
`

const CenturyChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const CenturyChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background.tertiary};
`

const ChipCount = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  color: #fff;
  background: ${({ theme }) => theme.colors.primary ?? '#6366f1'};
`
