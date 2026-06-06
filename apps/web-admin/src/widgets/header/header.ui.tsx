import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  FiAward,
  FiBell,
  FiBriefcase,
  FiGlobe,
  FiLayers,
  FiLogOut,
  FiMap,
  FiMenu,
  FiMoon,
  FiPause,
  FiPlay,
  FiSearch,
  FiSkipBack,
  FiSkipForward,
  FiSun,
  FiUser,
  FiVolume2,
  FiVolumeX,
  FiX,
} from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import {
  getNotificationTargetPath,
  type NotificationMessage,
  useNotificationStore,
} from '@/entities/notification'
import {
  BadgeList,
  GradeChip,
  GradeProgressCard,
  formatGamiTime,
  gamificationBadgesQueryOptions,
  gamificationSummaryQueryOptions,
  useGamiNotificationStore,
  useGamificationToasts,
} from '@/entities/gamification'
import { sessionQueryOptions, useSessionStore } from '@/entities/session'
import { getPlaylistControls } from '@/shared/hooks/use-bgm-playlist.hook'
import {
  getBgmAudio,
  setGlobalBgmMutedState,
  subscribeBgmAudio,
  useClickSound,
} from '@/shared/hooks/use-click-sound.hook'
import { pathKeys } from '@/shared/router'
import { useThemeStore } from '@/shared/styles/theme.store'
import { OVERLAY_STYLES, Z_INDEX } from '@/shared/styles/z-index'
import { useCommandPaletteStore } from '@/widgets/command-palette'
import { DASHBOARD_MENU_ITEMS } from '@/widgets/content-shell/model/dashboard-menu-items'

import { NotificationPanelBody } from './notification-panel.ui'
import { TopNavBar, type TopNavItemSpec } from './top-nav.ui'

// 재생 시간 포맷 (mm:ss)
const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const HeaderGradeSlot = styled.div`
  display: inline-flex;
  align-items: center;

  @media (max-width: 768px) {
    display: none;
  }
`

const BadgeSection = styled.div`
  padding: 8px 14px 2px;
`

const BadgeSectionHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 6px;
`

const BadgeEmpty = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1.5;
`

const Header: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { username, reset } = useSessionStore()
  const { data: pointSummary } = useQuery(gamificationSummaryQueryOptions)
  const { data: badges } = useQuery(gamificationBadgesQueryOptions)
  const { data: account } = useQuery(sessionQueryOptions)
  const accountId = account?.id ?? null
  // 화면 표시명: 닉네임(displayName) 우선, 없으면 로그인 ID(store username)로 폴백
  const shownName = account?.displayName || username || ''
  const earnedBadges = useMemo(() => (badges ?? []).filter((b) => b.earned), [badges])
  const gamiItems = useGamiNotificationStore((s) => s.items)
  const gamiMarkAllRead = useGamiNotificationStore((s) => s.markAllRead)
  const gamiMarkRead = useGamiNotificationStore((s) => s.markRead)
  useGamificationToasts()
  const { messages, markAllRead, markOneRead, fetchNotifications, isLoading } =
    useNotificationStore()
  const { mode, toggleTheme } = useThemeStore()
  const openCommandPalette = useCommandPaletteStore((s) => s.openPalette)
  const isMac =
    typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)

  const [isBellOpen, setIsBellOpen] = useState(false)

  // 마운트 시 1회 로드 + 탭이 다시 보이거나 포커스될 때 갱신 —
  // 벨을 열기 전에도 읽지 않음 배지가 최신으로 유지되도록.
  useEffect(() => {
    fetchNotifications()
    const refetchIfVisible = () => {
      if (document.visibilityState === 'visible') fetchNotifications()
    }
    window.addEventListener('focus', refetchIfVisible)
    document.addEventListener('visibilitychange', refetchIfVisible)
    return () => {
      window.removeEventListener('focus', refetchIfVisible)
      document.removeEventListener('visibilitychange', refetchIfVisible)
    }
  }, [fetchNotifications])

  // 드롭다운을 열 때마다 최신 상태로 갱신.
  useEffect(() => {
    if (isBellOpen) fetchNotifications()
  }, [isBellOpen, fetchNotifications])
  const [isUserOpen, setIsUserOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [bgmVolume, setBgmVolume] = useState(0.1)
  const [isBgmMuted, setIsBgmMuted] = useState(false)
  const [isBgmPlaying, setIsBgmPlaying] = useState(false)
  const [currentTrackName, setCurrentTrackName] = useState('')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const bellMenuRef = useRef<HTMLDivElement | null>(null)
  const userMenuRef = useRef<HTMLDivElement | null>(null)
  const settingsMenuRef = useRef<HTMLDivElement | null>(null)
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null)

  // 클릭 효과음 재생 함수
  const playClickSound = useClickSound()

  // BGM 오디오 상태 동기화 — 100ms 폴링 대신 오디오 엘리먼트 이벤트를 구독한다.
  // 트랙마다 new Audio()로 인스턴스가 교체되므로 subscribeBgmAudio로 교체를 감지해
  // 매번 리스너를 재바인딩한다.
  useEffect(() => {
    let current: HTMLAudioElement | null = null

    const deriveTrackName = (src: string): string => {
      if (!src) return ''
      let path = src
      try {
        path = decodeURIComponent(src)
      } catch {
        /* 디코딩 실패 시 원본 사용 */
      }
      const fileName = path.split('/').pop() || ''
      return fileName.replace(/\.mp3$/i, '') || '알 수 없음'
    }

    const syncPlaying = () => setIsBgmPlaying(!!current && !current.paused)
    const syncTime = () => {
      if (current) setCurrentTime(current.currentTime || 0)
    }
    const syncDuration = () => {
      if (current)
        setDuration(Number.isFinite(current.duration) ? current.duration : 0)
    }
    const syncTrack = () => {
      if (current) setCurrentTrackName(deriveTrackName(current.currentSrc))
    }

    const detach = () => {
      if (!current) return
      current.removeEventListener('play', syncPlaying)
      current.removeEventListener('pause', syncPlaying)
      current.removeEventListener('ended', syncPlaying)
      current.removeEventListener('timeupdate', syncTime)
      current.removeEventListener('durationchange', syncDuration)
      current.removeEventListener('loadedmetadata', syncDuration)
      current.removeEventListener('loadeddata', syncTrack)
      current.removeEventListener('emptied', syncTrack)
      current = null
    }

    const attach = (el: HTMLAudioElement) => {
      if (el === current) {
        syncPlaying()
        return
      }
      detach()
      current = el
      bgmAudioRef.current = el
      // 초기 상태 1회 동기화 (볼륨/음소거는 이후 사용자 조작이 관리)
      setBgmVolume(el.volume)
      setIsBgmMuted(el.volume === 0)
      syncPlaying()
      syncDuration()
      syncTime()
      syncTrack()
      el.addEventListener('play', syncPlaying)
      el.addEventListener('pause', syncPlaying)
      el.addEventListener('ended', syncPlaying)
      el.addEventListener('timeupdate', syncTime)
      el.addEventListener('durationchange', syncDuration)
      el.addEventListener('loadedmetadata', syncDuration)
      el.addEventListener('loadeddata', syncTrack)
      el.addEventListener('emptied', syncTrack)
    }

    const existing = getBgmAudio()
    if (existing) attach(existing)

    const unsubscribe = subscribeBgmAudio((el) => {
      if (el) attach(el)
      else detach()
    })

    return () => {
      unsubscribe()
      detach()
    }
  }, [])

  // 플레이리스트 컨트롤 핸들러
  const handlePlayPause = async () => {
    const controls = getPlaylistControls()
    if (controls) {
      playClickSound()
      await controls.togglePlayPause()
      setIsBgmPlaying(controls.isPlaying)
    }
  }

  const handleNext = async () => {
    const controls = getPlaylistControls()
    if (controls) {
      playClickSound()
      await controls.playNext()
      setIsBgmPlaying(controls.isPlaying)
    }
  }

  const handlePrevious = async () => {
    const controls = getPlaylistControls()
    if (controls) {
      playClickSound()
      await controls.playPrevious()
      setIsBgmPlaying(controls.isPlaying)
    }
  }

  // BGM 볼륨 변경 핸들러
  const handleBgmVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setBgmVolume(newVolume)
    // 최신 BGM 오디오 인스턴스를 직접 가져옴
    const bgmAudio = getBgmAudio()
    if (bgmAudio) {
      bgmAudio.volume = newVolume
      bgmAudioRef.current = bgmAudio // ref도 업데이트
      if (isBgmMuted && newVolume > 0) {
        setIsBgmMuted(false)
      } else if (newVolume === 0) {
        setIsBgmMuted(true)
      }
    }
  }

  // BGM 음소거 토글 핸들러
  const handleBgmMuteToggle = () => {
    // 최신 BGM 오디오 인스턴스를 직접 가져옴
    const bgmAudio = getBgmAudio()

    if (bgmAudio) {
      bgmAudioRef.current = bgmAudio // ref도 업데이트
      if (isBgmMuted) {
        // 음소거 해제: 이전 볼륨 복원 또는 기본값 사용
        const restoreVolume = bgmVolume > 0 ? bgmVolume : 0.1
        bgmAudio.volume = restoreVolume
        setGlobalBgmMutedState(false) // 전역 음소거 상태 해제
        setBgmVolume(restoreVolume)
        setIsBgmMuted(false)
      } else {
        // 음소거: 볼륨을 0으로 설정
        // 현재 볼륨을 저장 (음소거 해제 시 복원용)
        const currentVolume = bgmAudio.volume > 0 ? bgmAudio.volume : bgmVolume
        if (currentVolume > 0) {
          setBgmVolume(currentVolume) // 상태에 현재 볼륨 저장
        }
        bgmAudio.volume = 0
        setIsBgmMuted(true)
      }
    }
  }

  useOnClickOutside(bellMenuRef, () => setIsBellOpen(false))
  useOnClickOutside(userMenuRef, () => setIsUserOpen(false))
  useOnClickOutside(settingsMenuRef, () => setIsSettingsOpen(false))

  // Escape로 열린 드롭다운 닫기 (데스크톱 메뉴는 모달이 아니므로 포커스 트랩 대신
  // Escape + 클릭아웃 패턴을 사용)
  useEffect(() => {
    const anyOpen = isBellOpen || isUserOpen || isSettingsOpen
    if (!anyOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setIsBellOpen(false)
      setIsUserOpen(false)
      setIsSettingsOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isBellOpen, isUserOpen, isSettingsOpen])

  // 국가 브라우즈(/country)와 국가 상세(/country/:id/*) 모두 "국가" 메뉴를 활성 상태로 표시
  const isCountryBrowseActive = /^\/country(\/|$)/.test(location.pathname)

  const dashboardItemToSpec = (
    item: (typeof DASHBOARD_MENU_ITEMS)[number],
  ): TopNavItemSpec => {
    const Icon = item.icon
    return {
      key: `dashboard-${item.id}`,
      label: item.label,
      icon: (
        <span style={{ width: 16, height: 16, display: 'inline-flex' }}>
          <Icon />
        </span>
      ),
      onClick: () => {
        playClickSound()
        navigate(item.path)
      },
      active: item.matchPath(location.pathname),
    }
  }

  const personItem = DASHBOARD_MENU_ITEMS.find((i) => i.id === 'person')
  const restDashboardItems = DASHBOARD_MENU_ITEMS.filter(
    (i) => i.id !== 'person',
  )

  const menuItems: TopNavItemSpec[] = [
    {
      key: 'countries',
      label: '국가',
      icon: <FiMap size={16} />,
      onClick: () => {
        playClickSound()
        navigate(pathKeys.country())
      },
      active: isCountryBrowseActive,
    },
    {
      key: 'events',
      label: '사건',
      icon: <FiLayers size={16} />,
      onClick: () => {
        playClickSound()
        navigate('/events')
      },
      active: location.pathname.startsWith('/events'),
    },
    ...(personItem ? [dashboardItemToSpec(personItem)] : []),
    ...restDashboardItems.map(dashboardItemToSpec),
    {
      key: 'continents',
      label: '대륙',
      icon: <FiGlobe size={16} />,
      onClick: () => {
        playClickSound()
        navigate(pathKeys.continents())
      },
      active: location.pathname.startsWith('/continents'),
    },
    {
      key: 'heads-of-state',
      label: '수장 비교',
      icon: <FiAward size={16} />,
      onClick: () => {
        playClickSound()
        navigate(pathKeys.headsOfState())
      },
      active: location.pathname.startsWith('/heads-of-state'),
    },
    {
      key: 'companies',
      label: '기업',
      icon: <FiBriefcase size={16} />,
      onClick: () => {
        playClickSound()
        navigate('/companies')
      },
      active: location.pathname.startsWith('/companies'),
    },
  ]

  // 알림 클릭: 읽음 처리 후 관련 목록으로 이동하고 항상 패널을 닫는다.
  // 게이미피케이션 개인 알림(등급/뱃지)을 서버 알림과 합쳐 벨에 표시. 최신 성취가 위로.
  // 현재 계정 소유 항목만(공유 브라우저 격리).
  const gamiMessages = useMemo<NotificationMessage[]>(
    () =>
      gamiItems
        .filter((n) => n.accountId === accountId)
        .map((n) => ({
          id: n.id,
          title: n.title,
          time: formatGamiTime(n.createdAt),
          unread: !n.read,
        })),
    [gamiItems, accountId],
  )
  const mergedMessages = useMemo<NotificationMessage[]>(
    () => [...gamiMessages, ...messages],
    [gamiMessages, messages],
  )

  const isGamiId = (id: string) => id.startsWith('grade:') || id.startsWith('badge:')

  const handleSelectNotification = useCallback(
    (msg: NotificationMessage) => {
      playClickSound()
      if (isGamiId(msg.id)) {
        if (accountId) gamiMarkRead(accountId, msg.id)
        navigate(pathKeys.leaderboard())
        setIsBellOpen(false)
        return
      }
      markOneRead(msg.id)
      const targetPath = getNotificationTargetPath(msg.ownerType, msg.recordId)
      if (targetPath) navigate(targetPath)
      setIsBellOpen(false)
    },
    [playClickSound, markOneRead, gamiMarkRead, accountId, navigate],
  )

  const handleMarkAllRead = useCallback(() => {
    playClickSound()
    markAllRead()
    if (accountId) gamiMarkAllRead(accountId)
  }, [playClickSound, markAllRead, gamiMarkAllRead, accountId])

  const unreadCount = mergedMessages.filter((item) => item.unread).length

  return (
    <>
      <HeaderBar>
        <LeftZone>
          <MobileMenuButton
            onClick={() => {
              playClickSound()
              setIsMobileMenuOpen(true)
            }}
            aria-label="메뉴 열기"
          >
            <FiMenu size={20} />
          </MobileMenuButton>
          <LogoButton
            onClick={() => {
              playClickSound()
              navigate('/')
            }}
            aria-label="홈으로 이동"
          >
            Papyrus
          </LogoButton>
        </LeftZone>

        <CenterZone>
          <TopNavBar items={menuItems} />
        </CenterZone>

        <RightZone>
          {/* 국가 검색 팔레트 열기 */}
          <SearchTrigger
            type="button"
            onClick={() => {
              playClickSound()
              openCommandPalette()
            }}
            aria-label="국가 검색"
          >
            <FiSearch size={14} />
            <SearchTriggerLabel>국가 검색</SearchTriggerLabel>
            <SearchTriggerKbd>{isMac ? '⌘' : 'Ctrl'}K</SearchTriggerKbd>
          </SearchTrigger>

          {/* 다크모드 토글 버튼 */}
          <ThemeToggleButton
            aria-label={
              mode === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'
            }
            $isDark={mode === 'dark'}
            onClick={() => {
              playClickSound()
              toggleTheme()
            }}
          >
            {mode === 'dark' ? <FiSun size={16} /> : <FiMoon size={16} />}
          </ThemeToggleButton>

          {/* 설정 버튼 */}
          <div ref={settingsMenuRef} style={{ position: 'relative' }}>
            <IconButton
              aria-label="설정"
              onClick={() => {
                playClickSound()
                setIsSettingsOpen((prev) => !prev)
              }}
            >
              <FiVolume2 size={18} />
            </IconButton>
            <SettingsDropdown
              $isOpen={isSettingsOpen}
              style={{ right: 0, width: 280 }}
            >
              <SettingsHeader>
                <SettingsTitle>사운드 설정</SettingsTitle>
              </SettingsHeader>
              <Divider />
              <SettingsContent>
                {/* 현재 재생 중인 트랙 정보 */}
                {currentTrackName && (
                  <TrackInfo>
                    <TrackName>{currentTrackName}</TrackName>
                    <TrackProgress>
                      <ProgressBar>
                        <ProgressFill
                          $progress={
                            duration > 0 ? (currentTime / duration) * 100 : 0
                          }
                        />
                      </ProgressBar>
                      <TimeDisplay>
                        <span>{formatTime(currentTime)}</span>
                        <span>/</span>
                        <span>{formatTime(duration)}</span>
                      </TimeDisplay>
                    </TrackProgress>
                  </TrackInfo>
                )}

                {/* 재생 컨트롤 */}
                <PlaybackControls>
                  <PlaybackButton
                    onClick={handlePrevious}
                    type="button"
                    aria-label="이전 트랙"
                  >
                    <FiSkipBack size={16} />
                  </PlaybackButton>
                  <PlaybackButton
                    onClick={handlePlayPause}
                    type="button"
                    aria-label={isBgmPlaying ? '일시정지' : '재생'}
                  >
                    {isBgmPlaying ? (
                      <FiPause size={18} />
                    ) : (
                      <FiPlay size={18} />
                    )}
                  </PlaybackButton>
                  <PlaybackButton
                    onClick={handleNext}
                    type="button"
                    aria-label="다음 트랙"
                  >
                    <FiSkipForward size={16} />
                  </PlaybackButton>
                </PlaybackControls>

                <Divider />

                <SoundControlSection>
                  <SoundControlLabel>
                    <SoundControlIcon>
                      {isBgmMuted ? (
                        <FiVolumeX size={18} />
                      ) : (
                        <FiVolume2 size={18} />
                      )}
                    </SoundControlIcon>
                    <div>
                      <SoundControlTitle>배경음악</SoundControlTitle>
                      <SoundControlSubtitle>
                        {isBgmMuted
                          ? '음소거됨'
                          : `${Math.round(bgmVolume * 100)}%`}
                      </SoundControlSubtitle>
                    </div>
                  </SoundControlLabel>
                  <SoundControlActions>
                    <SoundToggleButton
                      onClick={() => {
                        playClickSound()
                        handleBgmMuteToggle()
                      }}
                      type="button"
                      aria-label={isBgmMuted ? '음소거 해제' : '음소거'}
                    >
                      {isBgmMuted ? (
                        <FiVolumeX size={16} />
                      ) : (
                        <FiVolume2 size={16} />
                      )}
                    </SoundToggleButton>
                    <SettingsVolumeSlider
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={bgmVolume}
                      onChange={handleBgmVolumeChange}
                      aria-label="BGM 볼륨 조절"
                    />
                  </SoundControlActions>
                </SoundControlSection>
              </SettingsContent>
            </SettingsDropdown>
          </div>

          <div ref={bellMenuRef} style={{ position: 'relative' }}>
            <IconButton
              aria-label={
                unreadCount > 0
                  ? `알림, 읽지 않음 ${unreadCount}개`
                  : '알림'
              }
              aria-haspopup="menu"
              aria-expanded={isBellOpen}
              onClick={() => {
                playClickSound()
                setIsBellOpen((prev) => !prev)
              }}
            >
              <FiBell size={18} />
              {unreadCount > 0 && (
                <Badge>{unreadCount > 99 ? '99+' : unreadCount}</Badge>
              )}
            </IconButton>
            <AnimatePresence>
              {isBellOpen && (
                <BellDropdown
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                >
                  <NotificationPanelBody
                    messages={mergedMessages}
                    showTitle
                    isLoading={isLoading}
                    onMarkAllRead={handleMarkAllRead}
                    onSelect={handleSelectNotification}
                  />
                </BellDropdown>
              )}
            </AnimatePresence>
          </div>

          {pointSummary && (
            <HeaderGradeSlot>
              <GradeChip
                gradeCode={pointSummary.gradeCode}
                points={pointSummary.totalPoints}
              />
            </HeaderGradeSlot>
          )}

          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <UserButton
              onClick={() => {
                playClickSound()
                setIsUserOpen((prev) => !prev)
              }}
            >
              <Avatar>{(shownName || 'G').charAt(0).toUpperCase()}</Avatar>
            </UserButton>
            <DropdownMenu $isOpen={isUserOpen} style={{ right: 0, width: 240 }}>
              <ProfileHeader>
                <AvatarLg>{(shownName || 'G').charAt(0).toUpperCase()}</AvatarLg>
                <div>
                  <ProfileName>{shownName || '게스트'}</ProfileName>
                  <ProfileRole>
                    <GradeChip
                      gradeCode={pointSummary?.gradeCode}
                      points={pointSummary?.totalPoints}
                    />
                  </ProfileRole>
                </div>
              </ProfileHeader>
              {pointSummary && (
                <div style={{ padding: '0 14px' }}>
                  <GradeProgressCard summary={pointSummary} />
                </div>
              )}
              {badges && badges.length > 0 && (
                <BadgeSection>
                  <BadgeSectionHead>
                    <span>뱃지</span>
                    <span>
                      {earnedBadges.length}/{badges.length}
                    </span>
                  </BadgeSectionHead>
                  {earnedBadges.length > 0 ? (
                    <BadgeList badges={earnedBadges} compact />
                  ) : (
                    <BadgeEmpty>콘텐츠를 등록하고 첫 뱃지를 획득해보세요!</BadgeEmpty>
                  )}
                </BadgeSection>
              )}
              <Divider />
              <MenuItem
                onClick={() => {
                  playClickSound()
                  setIsUserOpen(false)
                  navigate(pathKeys.leaderboard())
                }}
              >
                <FiAward size={14} /> 리더보드
              </MenuItem>
              <MenuItem
                onClick={() => {
                  playClickSound()
                  setIsUserOpen(false)
                  navigate(pathKeys.profile.root())
                }}
              >
                <FiUser size={14} /> 내 프로필
              </MenuItem>
              <MenuItem
                onClick={() => {
                  playClickSound()
                  setIsUserOpen(false)
                  setIsSettingsOpen(true)
                }}
              >
                설정
              </MenuItem>
              <Divider />
              <MenuItem
                onClick={() => {
                  reset()
                  navigate('/login', { replace: true })
                }}
              >
                <FiLogOut size={14} /> 로그아웃
              </MenuItem>
            </DropdownMenu>
          </div>
        </RightZone>
      </HeaderBar>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <MobileOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <MobileMenuModal
              initial={{
                opacity: 0,
                scale: 0.9,
                x: '-50%',
                y: 'calc(-50% + 20px)',
              }}
              animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              exit={{
                opacity: 0,
                scale: 0.9,
                x: '-50%',
                y: 'calc(-50% + 20px)',
              }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <ModalHeader>
                <ModalTitle>메뉴</ModalTitle>
                <MobileCloseButton
                  onClick={() => {
                    playClickSound()
                    setIsMobileMenuOpen(false)
                  }}
                  aria-label="메뉴 닫기"
                >
                  <FiX size={24} />
                </MobileCloseButton>
              </ModalHeader>
              <MobileMenuContent>
                {menuItems.map((item) => (
                  <MobileNavItem
                    key={item.key}
                    $active={item.active}
                    onClick={() => {
                      playClickSound()
                      item.onClick?.()
                      setIsMobileMenuOpen(false)
                    }}
                  >
                    <MobileNavIcon>{item.icon}</MobileNavIcon>
                    <MobileNavLabel>{item.label}</MobileNavLabel>
                  </MobileNavItem>
                ))}
              </MobileMenuContent>
            </MobileMenuModal>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isBellOpen && (
          <>
            <ModalOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBellOpen(false)}
            />
            <MobileModal
              initial={{
                opacity: 0,
                scale: 0.9,
                x: '-50%',
                y: 'calc(-50% + 20px)',
              }}
              animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              exit={{
                opacity: 0,
                scale: 0.9,
                x: '-50%',
                y: 'calc(-50% + 20px)',
              }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <ModalHeader>
                <ModalTitle>메시지</ModalTitle>
                <MobileCloseButton
                  onClick={() => {
                    playClickSound()
                    setIsBellOpen(false)
                  }}
                  aria-label="닫기"
                >
                  <FiX size={24} />
                </MobileCloseButton>
              </ModalHeader>
              <ModalContent>
                <NotificationPanelBody
                  messages={mergedMessages}
                  isLoading={isLoading}
                  onMarkAllRead={handleMarkAllRead}
                  onSelect={handleSelectNotification}
                />
              </ModalContent>
            </MobileModal>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isUserOpen && (
          <>
            <ModalOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUserOpen(false)}
            />
            <MobileModal
              initial={{
                opacity: 0,
                scale: 0.9,
                x: '-50%',
                y: 'calc(-50% + 20px)',
              }}
              animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              exit={{
                opacity: 0,
                scale: 0.9,
                x: '-50%',
                y: 'calc(-50% + 20px)',
              }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <ModalHeader>
                <ModalTitle>프로필</ModalTitle>
                <MobileCloseButton
                  onClick={() => {
                    playClickSound()
                    setIsUserOpen(false)
                  }}
                  aria-label="닫기"
                >
                  <FiX size={24} />
                </MobileCloseButton>
              </ModalHeader>
              <ModalContent>
                <ProfileHeader>
                  <AvatarLg>
                    {(shownName || 'G').charAt(0).toUpperCase()}
                  </AvatarLg>
                  <div>
                    <ProfileName>{shownName || '게스트'}</ProfileName>
                    <ProfileRole>관리자</ProfileRole>
                  </div>
                </ProfileHeader>
                <Divider />
                <MenuItem
                  onClick={() => {
                    playClickSound()
                    setIsUserOpen(false)
                    navigate(pathKeys.profile.root())
                  }}
                >
                  <FiUser size={14} /> 내 프로필
                </MenuItem>
                <Divider />
                <MenuItem
                  onClick={() => {
                    playClickSound()
                    reset()
                    navigate('/login', { replace: true })
                    setIsUserOpen(false)
                  }}
                >
                  <FiLogOut size={14} /> 로그아웃
                </MenuItem>
              </ModalContent>
            </MobileModal>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default Header

function useOnClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  handler: (event: MouseEvent) => void,
) {
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return
      }
      handler(event)
    }
    document.addEventListener('mousedown', listener)

    return () => {
      document.removeEventListener('mousedown', listener)
    }
  }, [ref, handler])
}

/**
 * 고정(fixed) 헤더 — 반투명 글래스 배경 + 블러로 스크롤 콘텐츠가
 * 비쳐 보이는 문제를 막고 트렌디한 frosted-glass 룩을 준다.
 */
const HeaderBar = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--header-height, 64px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: ${Z_INDEX.HEADER};
  background: ${({ theme }) => theme.colors.header.primary};
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  box-shadow: 0 1px 2px ${({ theme }) => theme.colors.shadow.sm};
  transition:
    background 0.25s ease,
    border-color 0.25s ease;
`

const LeftZone = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
`

const CenterZone = styled.div`
  flex: 1;
  /* flex 아이템 기본 min-width:auto면 내부 nav가 컨텐츠 크기 미만으로 못 줄어
     좌우 영역을 밀어낸다. 0으로 풀어 nav가 자체 overflow-x로 처리하게 한다. */
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 768px) {
    display: none;
  }
`

const RightZone = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`

const SearchTrigger = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 10px 0 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition:
    background 0.18s ease,
    color 0.18s ease,
    border-color 0.18s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.medium};
  }

  @media (max-width: 640px) {
    padding: 0;
    width: 34px;
    justify-content: center;
  }
`

const SearchTriggerLabel = styled.span`
  font-size: 12px;
  font-weight: 500;
  letter-spacing: -0.01em;

  @media (max-width: 640px) {
    display: none;
  }
`

const SearchTriggerKbd = styled.kbd`
  font-family: inherit;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 5px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1;

  @media (max-width: 640px) {
    display: none;
  }
`

const SettingsHeader = styled.div`
  padding: 4px 0 14px;
`

const SettingsTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.01em;
`

const SettingsContent = styled.div`
  padding: 4px 0;
`

const TrackInfo = styled.div`
  padding: 16px 14px;
  margin-bottom: 12px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border-radius: 16px;
`

const TrackName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 8px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const TrackProgress = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: ${({ theme }) => theme.colors.background.tertiary};
  border-radius: 8px;
  overflow: hidden;
  position: relative;
`

const ProgressFill = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${({ $progress }) => `${$progress}%`};
  background: ${({ theme }) => theme.colors.gradient.primary};
  border-radius: 8px;
  transition: width 0.1s linear;
`

const TimeDisplay = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-variant-numeric: tabular-nums;
  margin-top: 8px;
`

const PlaybackControls = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px 0;
`

const PlaybackButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.primary};
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.96);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.activeLight};
  }

  &:nth-child(2) {
    width: 50px;
    height: 50px;
    background: ${({ theme }) => theme.colors.gradient.primary};
    color: ${({ theme }) => theme.colors.button.text};
    box-shadow: 0 4px 14px ${({ theme }) => theme.colors.shadow.md};

    &:hover {
      background: ${({ theme }) => theme.colors.button.hover};
      transform: scale(1.06);
    }
  }
`

const SoundControlSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const SoundControlLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const SoundControlIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.activeLight};
  color: ${({ theme }) => theme.colors.primary};
  flex-shrink: 0;
`

const SoundControlTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 2px;
`

const SoundControlSubtitle = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SoundControlActions = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding-left: 56px;
  margin-top: 12px;
`

const SoundToggleButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: ${({ theme }) => theme.colors.activeLight};
    color: ${({ theme }) => theme.colors.primary};
  }

  &:active {
    transform: scale(0.96);
  }
`

const SettingsVolumeSlider = styled.input`
  flex: 1;
  height: 8px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background.tertiary};
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.primary};
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 6px ${({ theme }) => theme.colors.shadow.md};
  }

  &::-webkit-slider-thumb:hover {
    background: ${({ theme }) => theme.colors.button.hover};
    transform: scale(1.1);
  }

  &::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.primary};
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 6px ${({ theme }) => theme.colors.shadow.md};
  }

  &::-moz-range-thumb:hover {
    background: ${({ theme }) => theme.colors.button.hover};
    transform: scale(1.1);
  }
`

const LogoButton = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 700;
  font-size: 15px;
  letter-spacing: -0.02em;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`

const IconButton = styled.button`
  position: relative;
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:active {
    transform: scale(0.96);
  }
`

const ThemeToggleButton = styled.button<{ $isDark: boolean }>`
  position: relative;
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 14px;
  background: ${({ $isDark, theme }) =>
    $isDark ? theme.colors.background.secondary : 'transparent'};
  color: ${({ $isDark, theme }) =>
    $isDark ? '#fbbf24' : theme.colors.text.secondary};
  cursor: pointer;
  transition:
    background 0.25s ease,
    color 0.25s ease,
    transform 0.2s ease;

  &:hover {
    background: ${({ $isDark, theme }) =>
      $isDark ? theme.colors.background.tertiary : theme.colors.hover};
    color: ${({ $isDark, theme }) =>
      $isDark ? '#fcd34d' : theme.colors.text.primary};
  }

  &:active {
    transform: scale(0.92);
  }
`

const Badge = styled.span`
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.button.text};
  font-size: 10px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.header.primary};
`

const UserButton = styled(IconButton)`
  width: 34px;
  height: 34px;
  padding: 0;
  gap: 0;
`

const Avatar = styled.span`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.activeLight};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
`

const DropdownMenu = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 44px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 20px;
  box-shadow:
    0 20px 50px ${({ theme }) => theme.colors.shadow.lg},
    0 4px 12px ${({ theme }) => theme.colors.shadow.sm};
  padding: 12px;
  display: ${({ $isOpen }) => ($isOpen ? 'block' : 'none')};

  @media (max-width: 768px) {
    display: none !important;
  }
`

const SettingsDropdown = styled(DropdownMenu)`
  width: 300px;
  padding: 20px;
`

/**
 * 벨 알림 드롭다운 — 표시 여부는 AnimatePresence 조건부 마운트로 제어하므로
 * DropdownMenu의 display 토글 대신 motion 진입/퇴장 애니메이션을 사용한다.
 * (데스크톱 전용: 모바일은 별도 모달이 처리하므로 여기선 숨김)
 */
const BellDropdown = styled(motion.div)`
  position: absolute;
  top: 44px;
  right: 0;
  width: 320px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 20px;
  box-shadow:
    0 20px 50px ${({ theme }) => theme.colors.shadow.lg},
    0 4px 12px ${({ theme }) => theme.colors.shadow.sm};
  padding: 12px;
  transform-origin: top right;
  z-index: ${Z_INDEX.HEADER};

  @media (max-width: 768px) {
    display: none;
  }
`

const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px 10px;
`

const AvatarLg = styled(Avatar)`
  width: 36px;
  height: 36px;
  font-size: 14px;
`

const ProfileName = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 700;
`

const ProfileRole = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Divider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.colors.border.light};
  margin: 14px 0;
  border-radius: 1px;
`

const MenuItem = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  border-radius: 12px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const MobileMenuButton = styled.button`
  display: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  border-radius: 10px;
  transition:
    background 0.2s ease,
    color 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:active {
    transform: scale(0.96);
  }

  @media (max-width: 768px) {
    display: flex;
  }
`

const MobileOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${({ theme }) => theme.colors.shadow.lg};
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  backdrop-filter: blur(2px);
  display: none;

  @media (max-width: 768px) {
    display: block;
  }
`

const MobileMenuModal = styled(motion.div)`
  display: none;

  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 50%;
    left: 50%;
    width: 92%;
    max-width: 420px;
    max-height: 65vh;
    background: ${({ theme }) => theme.colors.background.primary};
    border-radius: 24px;
    box-shadow: 0 24px 64px ${({ theme }) => theme.colors.shadow.lg};
    z-index: ${Z_INDEX.MODAL_CONTENT};
    overflow: hidden;
  }
`

const MobileCloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:active {
    transform: scale(0.92);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`

const MobileMenuContent = styled.div`
  flex: 1;
  padding: 8px 12px 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.background.primary};

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.default};
    border-radius: 2px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.border.medium};
  }
`

const MobileNavItem = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px 18px;
  margin-bottom: 6px;
  border: none;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.active : theme.colors.text.primary};
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 20px;
    border-radius: 0 2px 2px 0;
    background: ${({ theme }) => theme.colors.primary};
    opacity: ${({ $active }) => ($active ? '1' : '0')};
    transition: opacity 0.2s ease;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:active {
    transform: scale(0.99);
  }
`

const MobileNavIcon = styled.span`
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0.85;
  transition: all 0.2s ease;

  ${MobileNavItem}:hover & {
    opacity: 1;
    transform: scale(1.05);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`

const MobileNavLabel = styled.span`
  font-size: 15px;
  font-weight: inherit;
  color: inherit;
  line-height: 1.5;
  flex: 1;
  letter-spacing: -0.01em;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
`

const ModalOverlay = styled(motion.div)`
  display: none;

  @media (max-width: 768px) {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${OVERLAY_STYLES.BACKGROUND};
    z-index: ${Z_INDEX.MODAL_OVERLAY};
    backdrop-filter: ${OVERLAY_STYLES.BACKDROP_FILTER};
  }
`

const MobileModal = styled(motion.div)`
  display: none;

  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 50%;
    left: 50%;
    width: 90%;
    max-width: 400px;
    max-height: 80vh;
    background: ${({ theme }) => theme.colors.background.primary};
    border-radius: 24px;
    box-shadow: 0 24px 64px ${({ theme }) => theme.colors.shadow.lg};
    z-index: ${Z_INDEX.MODAL_CONTENT};
    overflow: hidden;
  }
`

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
`

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
`

const ModalContent = styled.div`
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  background: ${({ theme }) => theme.colors.background.primary};

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.default};
    border-radius: 2px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.border.medium};
  }
`
