/**
 * 리더보드 페이지 (게이미피케이션 허브) — 전체 폭 레이아웃
 * - 상단 KPI(내 점수·순위·등록·뱃지)
 * - 좌: 명예의 전당(Top3 시상대 + 랭킹 표 + 내 순위 핀)
 * - 우: 내 등급/뱃지/점수 올리는 법 (데스크탑 사이드바, 스크롤 고정)
 */
import React, { useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiAward, FiEdit3, FiTrendingUp, FiZap } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'

import {
  ActivityList,
  BadgeCollection,
  GradeChip,
  GradeProgressCard,
  ScoreGuide,
  fmtNum,
  gamificationActivityQueryOptions,
  gamificationBadgesQueryOptions,
  gamificationCenturiesQueryOptions,
  gamificationLeaderboardQueryOptions,
  gamificationSummaryQueryOptions,
  type CenturyFilter,
  type LeaderboardEntry,
  type LeaderboardPeriod,
} from '@/entities/gamification'
import { sessionQueryOptions } from '@/entities/session'
import { pathKeys } from '@/shared/router'

const PERIODS: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'week', label: '이번 주' },
  { key: 'month', label: '이번 달' },
]

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

function LeaderAvatar({
  src,
  name,
  size = 32,
}: {
  src: string | null
  name: string
  size?: number
}) {
  const [errored, setErrored] = useState(false)
  if (!src || errored) {
    return <AvatarFallback style={{ width: size, height: size, fontSize: size * 0.42 }}>{(name || '?').charAt(0).toUpperCase()}</AvatarFallback>
  }
  return <Avatar style={{ width: size, height: size }} src={src} alt="" onError={() => setErrored(true)} />
}

export default function LeaderboardPage() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState<LeaderboardPeriod>('all')
  const [century, setCentury] = useState<CenturyFilter>(null)
  const { data: summary, isError: summaryError } = useQuery(gamificationSummaryQueryOptions)
  const { data: badges, isError: badgesError } = useQuery(gamificationBadgesQueryOptions)
  const { data: centuries } = useQuery(gamificationCenturiesQueryOptions)
  const {
    data: leaderboard,
    isLoading,
    isError,
  } = useQuery(gamificationLeaderboardQueryOptions(100, period, century))
  const { data: account } = useQuery(sessionQueryOptions)
  const { data: activity } = useQuery(gamificationActivityQueryOptions(8))

  const openProfile = (accountId: string) => navigate(pathKeys.publicProfile(accountId))

  const meInList = !!leaderboard?.some((r) => r.isMe)
  // all-time 전체(기간·세기 미적용)에서만 글로벌 순위 핀 사용. 기간/세기 슬라이스는
  // 백엔드가 해당 조건의 실제 순위로 내 행을 목록에 덧붙여주므로 글로벌 rank를 쓰면 안 됨.
  const showMyRank = period === 'all' && century == null && !!summary?.rank && !meInList
  const earnedCount = badges?.filter((b) => b.earned).length ?? 0
  const podium = leaderboard?.slice(0, 3) ?? []
  const rest = leaderboard?.slice(3) ?? []

  return (
    <Wrap>
      <Head>
        <PageTitle>리더보드</PageTitle>
        <Subtitle>콘텐츠를 등록할수록 점수가 쌓이고 등급·뱃지가 올라갑니다.</Subtitle>
      </Head>

      {/* 상단 KPI */}
      <KpiStrip>
        <KpiCard>
          <KpiIcon $c="#6366f1"><FiZap size={18} /></KpiIcon>
          <KpiBody>
            <KpiLabel>내 점수</KpiLabel>
            <KpiValue>{summary ? `${fmtNum(summary.totalPoints)}P` : '—'}</KpiValue>
          </KpiBody>
        </KpiCard>
        <KpiCard>
          <KpiIcon $c="#D4AF37"><FiTrendingUp size={18} /></KpiIcon>
          <KpiBody>
            <KpiLabel>전체 순위</KpiLabel>
            <KpiValue>{summary?.rank ? `${fmtNum(summary.rank)}위` : '미랭크'}</KpiValue>
          </KpiBody>
        </KpiCard>
        <KpiCard>
          <KpiIcon $c="#0EA5E9"><FiEdit3 size={18} /></KpiIcon>
          <KpiBody>
            <KpiLabel>등록 수</KpiLabel>
            <KpiValue>{summary ? `${fmtNum(summary.contributionCount)}건` : '—'}</KpiValue>
          </KpiBody>
        </KpiCard>
        <KpiCard>
          <KpiIcon $c="#22C55E"><FiAward size={18} /></KpiIcon>
          <KpiBody>
            <KpiLabel>획득 뱃지</KpiLabel>
            <KpiValue>{badges ? `${earnedCount}/${badges.length}` : '—'}</KpiValue>
          </KpiBody>
        </KpiCard>
        <KpiCard>
          <KpiIcon $c="#F97316">🔥</KpiIcon>
          <KpiBody>
            <KpiLabel>연속 등록</KpiLabel>
            <KpiValue>{summary ? `${summary.streakDays}일` : '—'}</KpiValue>
          </KpiBody>
        </KpiCard>
      </KpiStrip>

      {/* 내 뱃지 컬렉션 — 전체 폭 쇼케이스 */}
      <Panel>
        <PanelTitle>
          내 뱃지 컬렉션{' '}
          {badges && <Count>{earnedCount}/{badges.length}</Count>}
        </PanelTitle>
        {badges ? (
          <BadgeCollection badges={badges} />
        ) : badgesError ? (
          <Muted>뱃지 정보를 불러오지 못했습니다.</Muted>
        ) : (
          <SkeletonCard />
        )}
      </Panel>

      <ContentGrid>
        {/* 좌: 명예의 전당 */}
        <Main>
          <Panel>
            <PanelHeader>
              <PanelTitle>명예의 전당</PanelTitle>
              <Controls>
                {centuries && centuries.length > 0 && (
                  <CenturySelect
                    value={century == null ? 'all' : String(century)}
                    onChange={(e) => {
                      const v = e.target.value
                      setCentury(v === 'all' ? null : v === 'unknown' ? 'unknown' : parseInt(v, 10))
                    }}
                    aria-label="세기 슬라이스"
                  >
                    <option value="all">🌐 전체 세기</option>
                    {centuries.map((c) => (
                      <option key={c.century ?? 'unknown'} value={c.century == null ? 'unknown' : String(c.century)}>
                        {c.label} ({fmtNum(c.entryCount)})
                      </option>
                    ))}
                  </CenturySelect>
                )}
                <Tabs>
                  {PERIODS.map((p) => (
                    <Tab key={p.key} $active={period === p.key} onClick={() => setPeriod(p.key)}>
                      {p.label}
                    </Tab>
                  ))}
                </Tabs>
              </Controls>
            </PanelHeader>
            {century != null && (
              <CenturyHint>
                {century === 'unknown'
                  ? '세기를 매길 수 없는 콘텐츠(현대 국가·연도 미상) 기준 순위입니다.'
                  : `${centuries?.find((c) => c.century === century)?.label ?? `${century}세기`} 콘텐츠 기여 기준 순위입니다.`}
              </CenturyHint>
            )}

            {isLoading && (
              <Table>
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </Table>
            )}
            {isError && <Muted>랭킹을 불러오지 못했습니다.</Muted>}
            {leaderboard && leaderboard.length === 0 && (
              <Muted>
                {century != null
                  ? '이 세기에 기여한 사용자가 아직 없습니다. 관련 콘텐츠를 등록하면 첫 주인공이 됩니다!'
                  : '아직 점수를 획득한 사용자가 없습니다. 첫 등록의 주인공이 되어보세요!'}
              </Muted>
            )}

            {podium.length > 0 && (
              <Podium>
                {podium.map((row) => (
                  <PodiumCard
                    key={row.accountId}
                    $rank={row.rank}
                    $me={row.isMe}
                    onClick={() => openProfile(row.accountId)}
                  >
                    <Medal>{MEDALS[row.rank]}</Medal>
                    <LeaderAvatar src={row.heroThumbnail} name={row.username} size={row.rank === 1 ? 64 : 52} />
                    <PodiumName>
                      {row.username}
                      {row.isMe && <MeTag>나</MeTag>}
                    </PodiumName>
                    <GradeChip gradeCode={row.gradeCode} />
                    <PodiumPoints>{fmtNum(row.totalPoints)}P</PodiumPoints>
                    <PodiumSub>등록 {fmtNum(row.contributionCount)}건</PodiumSub>
                  </PodiumCard>
                ))}
              </Podium>
            )}

            {rest.length > 0 && (
              <Table>
                {rest.map((row, i) => {
                  const prev = rest[i - 1]
                  const gap = !!prev && row.rank > prev.rank + 1
                  return (
                    <React.Fragment key={row.accountId}>
                      {gap && <RankGap>⋯</RankGap>}
                      <RankingRow row={row} onOpen={openProfile} />
                    </React.Fragment>
                  )
                })}
              </Table>
            )}

            {showMyRank && summary && (
              <>
                <RankGap>⋯</RankGap>
                <Table>
                  <Row $me>
                    <Rank $rank={summary.rank ?? 0}>{summary.rank}</Rank>
                    <AvatarCell>
                      <LeaderAvatar src={null} name={account?.account ?? '나'} />
                    </AvatarCell>
                    <NameCell>
                      <UserName>
                        {account?.account ?? '나'}
                        <MeTag>나</MeTag>
                      </UserName>
                      <MobileGrade>
                        <GradeChip gradeCode={summary.gradeCode} />
                      </MobileGrade>
                    </NameCell>
                    <GradeCell>
                      <GradeChip gradeCode={summary.gradeCode} />
                    </GradeCell>
                    <Contrib>{fmtNum(summary.contributionCount)}건</Contrib>
                    <Points>{fmtNum(summary.totalPoints)}P</Points>
                  </Row>
                </Table>
              </>
            )}
          </Panel>
        </Main>

        {/* 우: 내 상태 사이드바 */}
        <Sidebar>
          <Panel>
            <PanelTitle>내 등급</PanelTitle>
            {summary ? (
              <GradeProgressCard summary={summary} />
            ) : summaryError ? (
              <Muted>점수 정보를 불러오지 못했습니다.</Muted>
            ) : (
              <SkeletonCard />
            )}
          </Panel>
          <Panel>
            <PanelTitle>최근 활동</PanelTitle>
            {activity ? <ActivityList items={activity} /> : <SkeletonCard />}
          </Panel>
          <Panel>
            <PanelTitle>점수 올리는 법</PanelTitle>
            <ScoreGuide />
          </Panel>
        </Sidebar>
      </ContentGrid>
    </Wrap>
  )
}

function RankingRow({ row, onOpen }: { row: LeaderboardEntry; onOpen: (id: string) => void }) {
  return (
    <Row $me={row.isMe} $clickable onClick={() => onOpen(row.accountId)}>
      <Rank $rank={row.rank}>{row.rank}</Rank>
      <AvatarCell>
        <LeaderAvatar src={row.heroThumbnail} name={row.username} />
      </AvatarCell>
      <NameCell>
        <UserName>
          {row.username}
          {row.isMe && <MeTag>나</MeTag>}
        </UserName>
        <MobileGrade>
          <GradeChip gradeCode={row.gradeCode} />
        </MobileGrade>
      </NameCell>
      <GradeCell>
        <GradeChip gradeCode={row.gradeCode} />
      </GradeCell>
      <Contrib>{fmtNum(row.contributionCount)}건</Contrib>
      <Points>{fmtNum(row.totalPoints)}P</Points>
    </Row>
  )
}

/* ─────────── styles ─────────── */

const Wrap = styled.div`
  /* #root가 height:100vh; overflow:hidden 이고 헤더는 position:fixed(64px) — 페이지가
     자체 스크롤 컨테이너가 되고 고정 헤더 높이만큼 위를 비워야 한다. */
  height: 100vh;
  overflow-y: auto;
  padding: calc(var(--header-height, 64px) + 20px) 28px 64px;
  display: flex;
  flex-direction: column;
  gap: 18px;

  @media (max-width: 640px) {
    padding: calc(var(--header-height, 64px) + 16px) 14px 56px;
  }
`

const Head = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const PageTitle = styled.h1`
  font-size: 24px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`

const Subtitle = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
`

const KpiStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;

  @media (max-width: 920px) {
    grid-template-columns: repeat(3, 1fr);
  }
  @media (max-width: 560px) {
    grid-template-columns: repeat(2, 1fr);
  }
`

const KpiCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border ?? 'rgba(0,0,0,0.06)'};
`

const KpiIcon = styled.div<{ $c: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  border-radius: 10px;
  color: ${({ $c }) => $c};
  background: ${({ $c }) => `${$c}1f`};
`

const KpiBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const KpiLabel = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const KpiValue = styled.span`
  font-size: 19px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 18px;
  align-items: start;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`

const Main = styled.div`
  min-width: 0;
`

const Sidebar = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 18px;
  position: sticky;
  /* 스크롤 시 고정 헤더 아래에 멈추도록 헤더 높이 + 여백만큼 오프셋 */
  top: calc(var(--header-height, 64px) + 16px);

  @media (max-width: 1024px) {
    position: static;
    order: -1;
  }
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
  display: flex;
  align-items: center;
  gap: 8px;
`

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;

  ${PanelTitle} {
    margin: 0;
  }
`

const Controls = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const CenturySelect = styled.select`
  appearance: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 28px 6px 12px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border?.primary ?? 'rgba(0,0,0,0.12)'};
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background.primary}
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23888' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E")
    no-repeat right 10px center;
`

const CenturyHint = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: -4px 0 12px;
`

const Tabs = styled.div`
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.background.tertiary};
`

const Tab = styled.button<{ $active: boolean }>`
  border: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 999px;
  color: ${({ $active, theme }) => ($active ? theme.colors.text.primary : theme.colors.text.secondary)};
  background: ${({ $active, theme }) => ($active ? theme.colors.background.primary : 'transparent')};
  box-shadow: ${({ $active, theme }) => ($active ? theme.colors.shadow?.sm ?? '0 1px 2px rgba(0,0,0,0.08)' : 'none')};
`

const Count = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Muted = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: 8px 0;
`

/* 시상대 */
const Podium = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 14px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const PodiumCard = styled.div<{ $rank: number; $me: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 12px;
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid
    ${({ $rank }) =>
      $rank === 1 ? 'rgba(212,175,55,0.6)' : $rank === 2 ? 'rgba(156,163,175,0.5)' : 'rgba(205,127,50,0.5)'};
  ${({ $rank }) => $rank === 1 && 'transform: scale(1.03);'}
  outline: ${({ $me, theme }) => ($me ? `2px solid ${theme.colors.primary ?? '#6366f1'}` : 'none')};
  outline-offset: 2px;
  cursor: pointer;
  transition: filter 0.15s ease;

  &:hover {
    filter: brightness(1.04);
  }

  @media (max-width: 560px) {
    transform: none;
  }
`

const Medal = styled.div`
  font-size: 26px;
  line-height: 1;
`

const PodiumName = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const PodiumPoints = styled.div`
  font-size: 16px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const PodiumSub = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const RankGap = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 14px;
  letter-spacing: 2px;
  padding: 2px 0;
`

const Table = styled.div`
  display: flex;
  flex-direction: column;
`

const Row = styled.div<{ $me: boolean; $clickable?: boolean }>`
  display: grid;
  grid-template-columns: 40px 40px 1fr auto auto auto;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
  border-radius: 10px;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  background: ${({ $me, theme }) => ($me ? theme.colors.activeLight ?? 'rgba(59,130,246,0.08)' : 'transparent')};
  transition: background 0.12s ease;

  &:hover {
    background: ${({ $clickable, $me, theme }) =>
      $clickable && !$me ? theme.colors.hover ?? 'rgba(0,0,0,0.03)' : undefined};
  }

  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.border ?? 'rgba(0,0,0,0.05)'};
  }
`

const Rank = styled.div<{ $rank: number }>`
  font-size: 14px;
  font-weight: 800;
  text-align: center;
  color: ${({ $rank, theme }) =>
    $rank === 1 ? '#D4AF37' : $rank === 2 ? '#9CA3AF' : $rank === 3 ? '#CD7F32' : theme.colors.text.secondary};
`

const AvatarCell = styled.div`
  display: flex;
  justify-content: center;
`

const Avatar = styled.img`
  border-radius: 50%;
  object-fit: cover;
`

const AvatarFallback = styled.div`
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #fff;
  background: ${({ theme }) => theme.colors.primary ?? '#6366f1'};
`

const NameCell = styled.div`
  min-width: 0;
`

const UserName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const MeTag = styled.span`
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 999px;
  color: #fff;
  background: ${({ theme }) => theme.colors.primary ?? '#6366f1'};
`

const GradeCell = styled.div`
  @media (max-width: 520px) {
    display: none;
  }
`

const MobileGrade = styled.div`
  display: none;
  margin-top: 3px;

  @media (max-width: 520px) {
    display: flex;
  }
`

const Contrib = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-align: right;
  min-width: 52px;

  @media (max-width: 640px) {
    display: none;
  }
`

const Points = styled.div`
  font-size: 14px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  text-align: right;
  min-width: 64px;
`

const pulse = keyframes`
  0% { opacity: 0.55; }
  50% { opacity: 1; }
  100% { opacity: 0.55; }
`

const SkeletonBlock = styled.div`
  background: ${({ theme }) => theme.colors.background.tertiary};
  border-radius: 8px;
  animation: ${pulse} 1.2s ease-in-out infinite;
`

const SkeletonCard = styled(SkeletonBlock)`
  height: 64px;
  width: 100%;
`

function SkeletonRow() {
  return (
    <SkeletonRowWrap>
      <SkeletonBlock style={{ height: 16, width: 16, borderRadius: '50%' }} />
      <SkeletonBlock style={{ height: 32, width: 32, borderRadius: '50%' }} />
      <SkeletonBlock style={{ height: 14, width: '45%' }} />
      <SkeletonBlock style={{ height: 14, width: 48 }} />
    </SkeletonRowWrap>
  )
}

const SkeletonRowWrap = styled.div`
  display: grid;
  grid-template-columns: 40px 40px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 12px 8px;

  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.border ?? 'rgba(0,0,0,0.05)'};
  }
`
