// src/pages/dashboard/DashboardPage.tsx
import React, { useEffect, useState } from 'react'

import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import { useSessionStore } from '@/entities/session'
import { pathKeys } from '@/shared/router'

// --- 메인 컨테이너 ---
const DashboardContainer = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  padding: 0;
  margin: 0;
  background: ${({ theme }) => theme.colors.background.primary};
  box-sizing: border-box;
  transition: background 0.25s ease;
`

const CentralContent = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: grid;
  grid-auto-flow: row;
  justify-items: center;
  align-items: center;
  text-align: center;
  width: max-content;
`

// --- 상단 아이콘 내비게이션 ---
const TopNav = styled.nav`
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: 0;
`

const TopNavItem = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background-color 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const TopIcon = styled.span`
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 100%;
    height: 100%;
  }
`

const TopLabel = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
`

// 시계 컨테이너
const ClockContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
`

const Time = styled.div`
  font-size: 28px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
  letter-spacing: -0.01em;
  line-height: 1.1;
`

const DateText = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
`

// 버튼 컨테이너
const ButtonContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 24px;
  margin-bottom: 8px;
`

const ButtonWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
`

const CircleButton = styled.button<{ $primary?: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: ${({ $primary, theme }) =>
    $primary ? 'none' : `1px solid ${theme.colors.border.default}`};
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background: ${({ $primary, theme }) =>
    $primary ? theme.colors.primary : theme.colors.background.primary};
  color: ${({ $primary, theme }) =>
    $primary ? '#ffffff' : theme.colors.text.primary};
  box-shadow: none;

  &:hover {
    background: ${({ $primary, theme }) =>
      $primary ? theme.colors.button.hover : theme.colors.background.secondary};
    border-color: ${({ $primary, theme }) =>
      $primary ? 'transparent' : theme.colors.border.medium};
    box-shadow: 0 1px 3px ${({ theme }) => theme.colors.shadow.sm};
  }

  &:active {
    background: ${({ $primary, theme }) =>
      $primary ? theme.colors.button.hover : theme.colors.background.tertiary};
  }

  svg {
    width: 16px;
    height: 16px;
  }
`

const ButtonLabel = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
`

const TextButton = styled.button`
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 24px;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
  color: ${({ theme }) => theme.colors.text.primary};

  &:hover {
    background: ${({ theme }) => theme.colors.background.secondary};
    border-color: ${({ theme }) => theme.colors.border.medium};
  }

  svg {
    width: 12px;
    height: 12px;
    fill: ${({ theme }) => theme.colors.text.secondary};
  }
`

// --- 하단 스케줄 컨테이너 (전체 폭 고정 + 내부 중앙 래퍼) ---
const BottomScheduleContainer = styled.div`
  position: fixed;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  left: 0;
  right: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 0;
  background: transparent;
  z-index: 20;
`

const BottomInner = styled.div`
  width: min(820px, calc(100% - 64px));
  display: flex;
  flex-direction: column;
  gap: 10px;
`

// 하단 미팅 정보 (항상 2열)
const MeetingInfo = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`

const MeetingCard = styled.div`
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  padding: 12px 14px 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
  width: 100%;
  min-width: 0;
  position: relative;
  min-height: 128px;

  &:hover {
    background: ${({ theme }) => theme.colors.background.secondary};
    border-color: ${({ theme }) => theme.colors.border.medium};
    box-shadow: 0 1px 2px ${({ theme }) => theme.colors.shadow.sm};
  }

  /* 왼쪽 얇은 상태 바 */
  &::before {
    content: '';
    position: absolute;
    left: 16px;
    top: 16px;
    width: 2px;
    height: 20px;
    background: ${({ theme }) => theme.colors.border.medium};
    border-radius: 2px;
  }
`

const MeetingTime = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
  white-space: nowrap;
`

const MeetingDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const MeetingTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
`

const MeetingSubtitle = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
  margin-top: 2px;
`

// 메타 행
const CardMetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
`

const MetaDot = styled.span`
  display: inline-block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.text.tertiary};
`

const HostLine = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0;
`

const StartChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.active};
  background: ${({ theme }) => theme.colors.activeLight};
  color: ${({ theme }) => theme.colors.active};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  svg {
    width: 14px;
    height: 14px;
    fill: ${({ theme }) => theme.colors.active};
  }
`

const MoreBtn = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }

  svg {
    width: 18px;
    height: 18px;
  }
`

// --- 스케줄 헤더 ---
const ScheduleHeader = styled.div`
  padding: 0 0 4px 0;
`

const ScheduleNav = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const DatePill = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 10px;
  padding: 8px 10px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  font-weight: 500;
  background: ${({ theme }) => theme.colors.background.primary};
`

const NavButton = styled.button`
  background: none;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  font-size: 0;
  transition: background-color 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }

  &.add-btn {
    font-size: 0;
  }
`

const TodayButton = styled.button`
  background: none;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 20px;
  padding: 6px 16px;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
`

export default function DashboardPage() {
  const { username } = useSessionStore()
  const [currentTime, setCurrentTime] = useState(new Date())
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 대시보드 마운트 시 전역 배경 숨기기
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

  const timeString = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  // 날짜 형식: "Friday, July 18" (연도 없음)
  const dateString = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  // 스케줄 날짜: "Thursday, 9 October 2025"
  const scheduleDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <DashboardContainer
      as={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <CentralContent>
        <ClockContainer>
          <Time>{timeString}</Time>
          <DateText>{dateString}</DateText>
        </ClockContainer>

        <ButtonContainer>
          <ButtonWrapper>
            <CircleButton title="국가" onClick={() => navigate('/countries')}>
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2c1.7 0 3.25.62 4.45 1.64-.53.18-1.12.36-1.45.36-1 0-2-.5-3.5-.5-.86 0-1.6.17-2.22.44C9.73 4.67 10.83 4 12 4zm-7.32 6c.24-1.02.7-1.96 1.33-2.77.43.29.92.77 1.49 1.37.73.78 1.63 1.4 2.5 1.4.71 0 1.48-.31 2.17-.62.52-.24 1.02-.46 1.49-.55.5-.1.98-.04 1.43.18.53.25 1.02.68 1.46 1.29.41.58.73 1.25.94 1.98H4.68zM12 20c-2.56 0-4.83-1.2-6.27-3.06.37-.54.83-1.05 1.3-1.36.58-.38 1.15-.5 1.69-.36.5.13.98.46 1.45.96.5.54 1.02.86 1.56.96.7.13 1.46-.07 2.25-.47.7-.36 1.3-.49 1.83-.39.64.12 1.28.58 1.92 1.32C16.49 19.23 14.35 20 12 20z" />
              </svg>
            </CircleButton>
            <ButtonLabel>국가</ButtonLabel>
          </ButtonWrapper>

          <ButtonWrapper>
            <CircleButton $primary title="새 사건">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M20.24 4.56c-2.34-2.34-6.14-2.34-8.48 0L3 13.32V21h7.68l8.56-8.56c2.34-2.34 2.34-6.14 0-8.48zM9.1 19H5v-4.1l6.34-6.34 4.1 4.1L9.1 19zm8.49-8.49-1.41 1.41-4.1-4.1 1.41-1.41c1.56-1.56 4.09-1.56 5.66 0 1.56 1.57 1.56 4.1 0 5.66z" />
              </svg>
            </CircleButton>
            <ButtonLabel>새 사건</ButtonLabel>
          </ButtonWrapper>

          <ButtonWrapper>
            <CircleButton title="왕조">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M5 16h14l1-8-4 3-3-5-3 5-4-3 1 8zm-1 2h16v2H4v-2z" />
              </svg>
            </CircleButton>
            <ButtonLabel>왕조</ButtonLabel>
          </ButtonWrapper>

          <ButtonWrapper>
            <CircleButton
              title="역대 수장 비교"
              onClick={() => navigate(pathKeys.headsOfState())}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2l2.39 6.95H22l-6 4.36 2.3 7.04L12 16l-6.3 4.35L8 13.31 2 8.95h7.61L12 2z" />
              </svg>
            </CircleButton>
            <ButtonLabel>수장 비교</ButtonLabel>
          </ButtonWrapper>

          <ButtonWrapper>
            <CircleButton
              title="집단 (세대·계파·사단)"
              onClick={() => navigate(pathKeys.personGroups())}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM5 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm14 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM12 11c-1.6 0-3 .7-3.9 1.8l1.5 1.2c.5-.6 1.4-1 2.4-1s1.9.4 2.4 1l1.5-1.2C15 11.7 13.6 11 12 11z" />
              </svg>
            </CircleButton>
            <ButtonLabel>집단</ButtonLabel>
          </ButtonWrapper>
        </ButtonContainer>

        <TextButton>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12v-2H6V4h12v16l2-1V3.5A1.5 1.5 0 0 0 18.5 2H18z" />
          </svg>
          아카이브 열기
        </TextButton>
      </CentralContent>

      <BottomScheduleContainer
        as={motion.div}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <BottomInner>
          <ScheduleHeader>
            <DatePill>
              <div>{scheduleDate}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <NavButton aria-label="prev">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                  </svg>
                </NavButton>
                <TodayButton>오늘</TodayButton>
                <NavButton aria-label="next">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="m8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
                  </svg>
                </NavButton>
                <NavButton className="add-btn" aria-label="add">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
                  </svg>
                </NavButton>
              </div>
            </DatePill>
          </ScheduleHeader>

          <MeetingInfo>
            <MeetingCard>
              <MeetingTitle>조선 왕조 개혁</MeetingTitle>
              <CardMetaRow>
                <span>15세기</span>
                <MetaDot />
                <span>성종 시대</span>
              </CardMetaRow>
              <HostLine>큐레이터: 김 박사</HostLine>
              <CardFooter>
                <StartChip>
                  <svg viewBox="0 0 24 24">
                    <path d="M10 16.5l6-4.5-6-4.5v9z" />
                  </svg>
                  탐험하기
                </StartChip>
                <MoreBtn aria-label="more">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </MoreBtn>
              </CardFooter>
            </MeetingCard>

            <MeetingCard>
              <MeetingTitle>유럽 르네상스</MeetingTitle>
              <CardMetaRow>
                <span>16세기</span>
                <MetaDot />
                <span>피렌체</span>
              </CardMetaRow>
              <HostLine>큐레이터: 로시 교수</HostLine>
              <CardFooter>
                <StartChip>
                  <svg viewBox="0 0 24 24">
                    <path d="M10 16.5l6-4.5-6-4.5v9z" />
                  </svg>
                  탐험하기
                </StartChip>
                <MoreBtn aria-label="more">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </MoreBtn>
              </CardFooter>
            </MeetingCard>
          </MeetingInfo>
        </BottomInner>
      </BottomScheduleContainer>
    </DashboardContainer>
  )
}
