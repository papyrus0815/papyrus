/**
 * 공개 프로필 (/profile/:accountId) — 타 사용자의 등급·뱃지 컬렉션 열람(자랑 보기).
 */
import React, { useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiArrowLeft, FiEdit2 } from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

import {
  BadgeList,
  GradeChip,
  fmtNum,
  gamificationProfileQueryOptions,
} from '@/entities/gamification'
import {
  avatarFrameStyle,
  nicknameColor,
  profileBackground,
  useEquippedCosmetics,
} from '@/entities/wallet'
import {
  linkedEntityPath,
  rarityMeta,
  visitedCollectionQueryOptions,
} from '@/entities/artifact'
import { visitedPersonsQueryOptions } from '@/entities/person/api'
import { visitedEventsQueryOptions } from '@/entities/event/model'
import { CommentModal } from '@/entities/comment'
import { sessionQueryOptions } from '@/entities/session'
import type { VisitedEventCard } from '@/shared/api/events'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { formatPersonLifespan } from '@/shared/lib/tenure-person-utils'
import { useThemeStore } from '@/shared/styles/theme.store'
import { pathKeys } from '@/shared/router'

/** 사건 카드 연도 라벨 — 구조화 필드(startYear/startEra) 우선, BC는 "기원전". 없으면 빈 문자열. */
function eventYearLabel(event: {
  startEra: string | null
  startYear: number | null
  startDate: string | null
}): string {
  if (event.startYear != null) {
    return event.startEra === 'BC' ? `기원전 ${event.startYear}년` : `${event.startYear}년`
  }
  if (event.startDate) {
    const year = new Date(event.startDate).getUTCFullYear()
    if (!Number.isNaN(year)) return `${year}년`
  }
  return ''
}

export default function PublicProfilePage() {
  const { accountId = '' } = useParams()
  const navigate = useNavigate()
  const isDark = useThemeStore((state) => state.mode === 'dark')

  const { data: profile, isLoading, isError } = useQuery(gamificationProfileQueryOptions(accountId))
  const { data: me } = useQuery(sessionQueryOptions)
  // 방 주인 기준 외형·진열·등록 인물 (모두 읽기전용 방문 read)
  const cosmetics = useEquippedCosmetics(accountId)
  const { data: visitedArtifacts } = useQuery(visitedCollectionQueryOptions(accountId))
  const { data: visitedPersons } = useQuery(visitedPersonsQueryOptions(accountId))
  const { data: visitedEvents } = useQuery(visitedEventsQueryOptions(accountId))

  const viewerIsOwner = !!me?.id && me.id === accountId
  const heroBg = profileBackground(cosmetics.profileTheme)
  const nameColor = nicknameColor(cosmetics.nicknameColor, isDark)
  const artifacts = visitedArtifacts ?? []
  const persons = visitedPersons ?? []
  const events = visitedEvents ?? []
  const [openEvent, setOpenEvent] = useState<VisitedEventCard | null>(null)

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
          <Hero style={heroBg ? { background: heroBg, padding: 16, borderRadius: 16 } : undefined}>
            {profile.heroThumbnail ? (
              <Avatar src={profile.heroThumbnail} alt="" style={avatarFrameStyle(cosmetics.avatarFrame)} />
            ) : (
              <AvatarFallback style={avatarFrameStyle(cosmetics.avatarFrame)}>
                {profile.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            )}
            <HeroInfo>
              <Name style={nameColor ? { color: nameColor } : undefined}>{profile.username}</Name>
              <HeroMeta>
                <GradeChip gradeCode={profile.gradeCode} points={profile.totalPoints} />
                {profile.heroName && <HeroName>{profile.heroName}</HeroName>}
              </HeroMeta>
            </HeroInfo>
            {viewerIsOwner && (
              <OwnerCta type="button" onClick={() => navigate(pathKeys.profile.root())}>
                <FiEdit2 size={13} /> 내 방 꾸미기
              </OwnerCta>
            )}
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
                {profile.centuryBreakdown.map((century) => (
                  <CenturyChip key={century.century ?? 'unknown'}>
                    {century.label}
                    <ChipCount>{fmtNum(century.entryCount)}</ChipCount>
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

          <Panel>
            <PanelTitle>유물 진열장 ({artifacts.length})</PanelTitle>
            {artifacts.length > 0 ? (
              <Shelf>
                {artifacts.map((item) => {
                  const rarity = rarityMeta(item.rarity)
                  const linkPath = linkedEntityPath(item.linkedType, item.linkedId)
                  return (
                    <ShelfItem
                      key={item.id}
                      style={{ background: `${rarity.color}1a` }}
                      title={item.name}
                      $clickable={!!linkPath}
                      onClick={() => linkPath && navigate(linkPath)}
                    >
                      {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span>🏺</span>}
                    </ShelfItem>
                  )
                })}
              </Shelf>
            ) : (
              <Muted>진열한 유물이 없습니다.</Muted>
            )}
          </Panel>

          <Panel>
            <PanelTitle>등록 인물관 ({persons.length})</PanelTitle>
            {persons.length > 0 ? (
              <PersonGrid>
                {persons.map((person) => (
                  <PersonCard key={person.id} title={getPersonDisplayName(person)}>
                    {person.profileImageUrl ? (
                      <PersonAvatar src={person.profileImageUrl} alt="" />
                    ) : (
                      <PersonAvatarFallback>
                        {getPersonDisplayName(person, true).charAt(0) || '?'}
                      </PersonAvatarFallback>
                    )}
                    <PersonName>{getPersonDisplayName(person, true)}</PersonName>
                    {(person.birthYear != null || person.deathYear != null) && (
                      <PersonLifespan>{formatPersonLifespan(person)}</PersonLifespan>
                    )}
                  </PersonCard>
                ))}
              </PersonGrid>
            ) : (
              <Muted>등록한 인물이 없습니다.</Muted>
            )}
          </Panel>

          <Panel>
            <PanelTitle>등록 사건관 ({events.length})</PanelTitle>
            {events.length > 0 ? (
              <EventList>
                {events.map((event) => (
                  <EventRow
                    key={event.id}
                    title={`${event.title} — 댓글 보기`}
                    onClick={() => setOpenEvent(event)}
                  >
                    <EventTitle>{event.title}</EventTitle>
                    <EventDate>{eventYearLabel(event)}</EventDate>
                  </EventRow>
                ))}
              </EventList>
            ) : (
              <Muted>등록한 사건이 없습니다.</Muted>
            )}
          </Panel>
        </>
      )}

      {openEvent && (
        <CommentModal
          ownerType="EVENT"
          recordId={openEvent.id}
          title={openEvent.title}
          subtitle={eventYearLabel(openEvent)}
          onClose={() => setOpenEvent(null)}
        />
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

const OwnerCta = styled.button`
  margin-left: auto;
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border ?? 'rgba(0,0,0,0.08)'};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
`

const Shelf = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
  gap: 8px;
`

const ShelfItem = styled.div<{ $clickable: boolean }>`
  aspect-ratio: 1;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  overflow: hidden;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const PersonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 12px;
`

const PersonCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

const PersonAvatar = styled.img`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
`

const PersonAvatarFallback = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 800;
  color: #fff;
  background: ${({ theme }) => theme.colors.primary ?? '#6366f1'};
`

const PersonName = styled.span`
  max-width: 100%;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const PersonLifespan = styled.span`
  margin-top: 2px;
  font-size: 10.5px;
  font-weight: 500;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`

const EventList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const EventRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.background.tertiary};
  cursor: pointer;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.82;
  }
`

const EventTitle = styled.span`
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const EventDate = styled.span`
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`
