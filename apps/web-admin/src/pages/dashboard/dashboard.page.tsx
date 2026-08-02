// src/pages/dashboard/dashboard.page.tsx
import { useEffect, useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'

import { sessionQueryOptions } from '@/entities/session'
import { getAllEvents, getEventsOnThisDay } from '@/shared/api/events'
import type { EventResponseDto } from '@/shared/api/events'
import { pathKeys, returnTo } from '@/shared/router'

import * as S from './dashboard.styles'

/** startDate(ISO 문자열)에서 "N세기" / "기원전 N세기" 라벨을 만든다. 불명확하면 null. */
function eraLabel(startDate?: string | null): string | null {
  if (!startDate) return null
  const year = new Date(startDate).getFullYear()
  if (Number.isNaN(year)) return null
  if (year <= 0) return `기원전 ${Math.floor(Math.abs(year) / 100) + 1}세기`
  return `${Math.floor((year - 1) / 100) + 1}세기`
}

/**
 * 시계 — 매초 갱신되는 유일한 부분이라 별도 컴포넌트로 분리한다.
 * (대시보드 전체가 1초마다 리렌더되던 것을 시계 영역으로 한정)
 */
function Clock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const timeString = now.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const dateString = now.toLocaleDateString('ko-KR', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <S.ClockContainer>
      <S.Time>{timeString}</S.Time>
      <S.DateText>{dateString}</S.DateText>
    </S.ClockContainer>
  )
}

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path d="M10 16.5l6-4.5-6-4.5v9z" />
  </svg>
)

/** 사건 카드 1개 — 클릭 시 상세로 이동. 두 섹션이 공용. */
function EventCardItem({ event }: { event: EventResponseDto }) {
  const navigate = useNavigate()
  const era = eraLabel(event.startDate)
  const category = event.category?.name

  return (
    <S.EventCard
      type="button"
      onClick={() => navigate(pathKeys.events.detail(event.id))}
    >
      <S.EventTitle>{event.title}</S.EventTitle>
      {(era || category) && (
        <S.CardMetaRow>
          {era && <span>{era}</span>}
          {era && category && <S.MetaDot />}
          {category && <span>{category}</span>}
        </S.CardMetaRow>
      )}
      {event.description && <S.DescLine>{event.description}</S.DescLine>}
      <S.CardFooter>
        <S.OpenChip>
          <PlayIcon />
          자세히 보기
        </S.OpenChip>
      </S.CardFooter>
    </S.EventCard>
  )
}

/** 최근 등록 사건 — 항상 노출되는 주력 섹션. */
function RecentEventsSection() {
  const navigate = useNavigate()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-recent-events'],
    // createdSinceDays를 크게 주면 서버가 createdAt desc(최근 등록순)로 정렬한다.
    // 하단 영역이 가운데 화면과 겹치지 않도록 2개(한 줄)만 노출한다.
    queryFn: () => getAllEvents({ limit: 2, createdSinceDays: 36500 }),
    staleTime: 1000 * 60,
  })

  const events = data ?? []

  return (
    <S.Section>
      <S.SectionHeader>
        <S.SectionTitle>최근 사건</S.SectionTitle>
        <S.ViewAllButton
          type="button"
          onClick={() => navigate(pathKeys.events.root())}
        >
          전체 보기
        </S.ViewAllButton>
      </S.SectionHeader>

      <S.EventGrid>
        {isLoading ? (
          <S.EmptyState>불러오는 중…</S.EmptyState>
        ) : isError ? (
          <S.EmptyState>최근 사건을 불러오지 못했습니다.</S.EmptyState>
        ) : events.length === 0 ? (
          <S.EmptyState>아직 등록된 사건이 없습니다.</S.EmptyState>
        ) : (
          events.map((event) => <EventCardItem key={event.id} event={event} />)
        )}
      </S.EventGrid>
    </S.Section>
  )
}

/**
 * 역사 속 오늘 — 오늘 월·일에 해당하는 사건. 보조 섹션이라 결과가 있을 때만 노출하고,
 * 로딩·에러·빈 결과에서는 아무것도 그리지 않는다(빈 화면 리스크 제거).
 * month·day는 사용자 로컬 기준으로 넘긴다(서버 TZ 어긋남 방지).
 */
function OnThisDaySection() {
  const today = useMemo(() => {
    const now = new Date()
    return { month: now.getMonth() + 1, day: now.getDate() }
  }, [])

  const { data } = useQuery({
    queryKey: ['dashboard-on-this-day', today.month, today.day],
    queryFn: () =>
      getEventsOnThisDay({ month: today.month, day: today.day, limit: 2 }),
    staleTime: 1000 * 60 * 30,
  })

  const events = data ?? []
  if (events.length === 0) return null

  return (
    <S.Section>
      <S.SectionHeader>
        <S.SectionTitle>
          역사 속 오늘 · {today.month}월 {today.day}일
        </S.SectionTitle>
      </S.SectionHeader>
      <S.EventGrid>
        {events.map((event) => (
          <EventCardItem key={event.id} event={event} />
        ))}
      </S.EventGrid>
    </S.Section>
  )
}

export default function DashboardPage() {
  // 로그인 시점 username은 영속화되지 않아 새로고침 시 사라진다.
  // account.me 쿼리에서 표시명을 받아 새로고침 후에도 안정적으로 인사한다.
  const { data: user } = useQuery(sessionQueryOptions)
  const displayName = user?.account ?? null
  const navigate = useNavigate()
  // 사건 등록 폼에 복귀 목적지(현재 URL의 필터·정렬 포함)를 넘기기 위함
  const location = useLocation()

  // 대시보드 마운트 시 전역 배경 숨기기
  // (스토어의 enabled=false는 검은 오버레이 모드라, 흰 배경 대시보드에는 직접 제어가 필요)
  useEffect(() => {
    document.body.setAttribute('data-dashboard', 'true')
    const globalBg = document.getElementById('global-bg')
    if (globalBg) globalBg.style.display = 'none'

    return () => {
      document.body.removeAttribute('data-dashboard')
      const gb = document.getElementById('global-bg')
      if (gb) gb.style.display = ''
    }
  }, [])

  return (
    <S.DashboardContainer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <S.CentralContent>
        {displayName && (
          <S.Greeting>{displayName}님, 환영합니다</S.Greeting>
        )}

        <Clock />

        <S.ButtonContainer>
          <S.ButtonWrapper>
            <S.CircleButton
              type="button"
              title="국가"
              aria-label="국가"
              onClick={() => navigate(pathKeys.country())}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2c1.7 0 3.25.62 4.45 1.64-.53.18-1.12.36-1.45.36-1 0-2-.5-3.5-.5-.86 0-1.6.17-2.22.44C9.73 4.67 10.83 4 12 4zm-7.32 6c.24-1.02.7-1.96 1.33-2.77.43.29.92.77 1.49 1.37.73.78 1.63 1.4 2.5 1.4.71 0 1.48-.31 2.17-.62.52-.24 1.02-.46 1.49-.55.5-.1.98-.04 1.43.18.53.25 1.02.68 1.46 1.29.41.58.73 1.25.94 1.98H4.68zM12 20c-2.56 0-4.83-1.2-6.27-3.06.37-.54.83-1.05 1.3-1.36.58-.38 1.15-.5 1.69-.36.5.13.98.46 1.45.96.5.54 1.02.86 1.56.96.7.13 1.46-.07 2.25-.47.7-.36 1.3-.49 1.83-.39.64.12 1.28.58 1.92 1.32C16.49 19.23 14.35 20 12 20z" />
              </svg>
            </S.CircleButton>
            <S.ButtonLabel>국가</S.ButtonLabel>
          </S.ButtonWrapper>

          <S.ButtonWrapper>
            <S.CircleButton
              type="button"
              $primary
              title="새 사건"
              aria-label="새 사건 등록"
              onClick={() => navigate(pathKeys.events.create(), returnTo(location))}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M20.24 4.56c-2.34-2.34-6.14-2.34-8.48 0L3 13.32V21h7.68l8.56-8.56c2.34-2.34 2.34-6.14 0-8.48zM9.1 19H5v-4.1l6.34-6.34 4.1 4.1L9.1 19zm8.49-8.49-1.41 1.41-4.1-4.1 1.41-1.41c1.56-1.56 4.09-1.56 5.66 0 1.56 1.57 1.56 4.1 0 5.66z" />
              </svg>
            </S.CircleButton>
            <S.ButtonLabel>새 사건</S.ButtonLabel>
          </S.ButtonWrapper>

          <S.ButtonWrapper>
            <S.CircleButton
              type="button"
              title="왕조"
              aria-label="왕조"
              onClick={() => navigate(pathKeys.dynasty())}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M5 16h14l1-8-4 3-3-5-3 5-4-3 1 8zm-1 2h16v2H4v-2z" />
              </svg>
            </S.CircleButton>
            <S.ButtonLabel>왕조</S.ButtonLabel>
          </S.ButtonWrapper>

          <S.ButtonWrapper>
            <S.CircleButton
              type="button"
              title="역대 수장 비교"
              aria-label="역대 수장 비교"
              onClick={() => navigate(pathKeys.headsOfState())}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2l2.39 6.95H22l-6 4.36 2.3 7.04L12 16l-6.3 4.35L8 13.31 2 8.95h7.61L12 2z" />
              </svg>
            </S.CircleButton>
            <S.ButtonLabel>수장 비교</S.ButtonLabel>
          </S.ButtonWrapper>

          <S.ButtonWrapper>
            <S.CircleButton
              type="button"
              title="집단 (세대·계파·사단)"
              aria-label="집단 (세대·계파·사단)"
              onClick={() => navigate(pathKeys.personGroups())}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM5 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm14 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM12 11c-1.6 0-3 .7-3.9 1.8l1.5 1.2c.5-.6 1.4-1 2.4-1s1.9.4 2.4 1l1.5-1.2C15 11.7 13.6 11 12 11z" />
              </svg>
            </S.CircleButton>
            <S.ButtonLabel>집단</S.ButtonLabel>
          </S.ButtonWrapper>
        </S.ButtonContainer>

        <S.TextButton type="button" onClick={() => navigate(pathKeys.events.root())}>
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12v-2H6V4h12v16l2-1V3.5A1.5 1.5 0 0 0 18.5 2H18z" />
          </svg>
          아카이브 열기
        </S.TextButton>
      </S.CentralContent>

      <S.BottomContainer
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <S.BottomInner>
          {/* 보조: 결과 있을 때만 노출 */}
          <OnThisDaySection />
          {/* 주력: 항상 노출 */}
          <RecentEventsSection />
        </S.BottomInner>
      </S.BottomContainer>
    </S.DashboardContainer>
  )
}
