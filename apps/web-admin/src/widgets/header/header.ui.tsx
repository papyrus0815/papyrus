import React, { useEffect, useRef, useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import {
  FiBell,
  FiFileText,
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
  getNotificationEntityTypeLabel,
  getNotificationListPath,
  useNotificationStore,
} from '@/entities/notification'
import { useSessionStore } from '@/entities/session'
import { getPlaylistControls } from '@/shared/hooks/use-bgm-playlist.hook'
import {
  getBgmAudio,
  setGlobalBgmMutedState,
  useClickSound,
} from '@/shared/hooks/use-click-sound.hook'
import { pathKeys } from '@/shared/router'
import { useThemeStore } from '@/shared/styles/theme.store'
import { OVERLAY_STYLES, Z_INDEX } from '@/shared/styles/z-index'
import { useCommandPaletteStore } from '@/widgets/command-palette'
import { DASHBOARD_MENU_ITEMS } from '@/widgets/history-shell/model/dashboard-menu-items'

import { TopNavBar, type TopNavItemSpec } from './top-nav.ui'

// 재생 시간 포맷 (mm:ss)
const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 메시지 시간 포맷 (ISO 또는 임의 문자열 → 읽기 쉬운 형식)
function formatMessageTime(isoOrText: string): string {
  if (!isoOrText || typeof isoOrText !== 'string') return ''
  const s = isoOrText.trim()
  if (!s) return ''
  const parsed = new Date(s)
  if (Number.isNaN(parsed.getTime()))
    return s.length > 20 ? s.slice(0, 16) + '…' : s
  const now = new Date()
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime()
  const yesterday = today - 86400000
  const t = parsed.getTime()
  const dateOnly = new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
  ).getTime()
  if (dateOnly === today) {
    const h = parsed.getHours()
    const m = parsed.getMinutes()
    if (h < 12) return `오전 ${h}:${m.toString().padStart(2, '0')}`
    if (h === 12) return `오후 12:${m.toString().padStart(2, '0')}`
    return `오후 ${h - 12}:${m.toString().padStart(2, '0')}`
  }
  if (dateOnly === yesterday) return '어제'
  if (parsed.getFullYear() === now.getFullYear()) {
    return `${parsed.getMonth() + 1}월 ${parsed.getDate()}일`
  }
  return `${parsed.getFullYear()}. ${parsed.getMonth() + 1}. ${parsed.getDate()}`
}

const Header: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { username, reset } = useSessionStore()
  const { messages, markAllRead, markOneRead, fetchNotifications } =
    useNotificationStore()
  const { mode, toggleTheme } = useThemeStore()
  const openCommandPalette = useCommandPaletteStore((s) => s.openPalette)
  const isMac =
    typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)

  const [isBellOpen, setIsBellOpen] = useState(false)

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

  // 전역 BGM 오디오 인스턴스 가져오기
  useEffect(() => {
    const checkBgmAudio = () => {
      const bgmAudio = getBgmAudio()
      if (bgmAudio && bgmAudio !== bgmAudioRef.current) {
        bgmAudioRef.current = bgmAudio
        setBgmVolume(bgmAudio.volume)
        setIsBgmMuted(bgmAudio.volume === 0)
        setIsBgmPlaying(!bgmAudio.paused)
      } else if (bgmAudio) {
        // 재생 상태 동기화
        setIsBgmPlaying(!bgmAudio.paused)
      }
    }

    // 주기적으로 확인 (BGM이 나중에 로드될 수 있음)
    const interval = setInterval(checkBgmAudio, 100)
    checkBgmAudio() // 즉시 한 번 확인

    return () => clearInterval(interval)
  }, [])

  // 플레이리스트 정보 동기화 (ref를 사용하여 불필요한 리렌더링 방지)
  const prevIsPlayingRef = useRef(false)
  const prevCurrentTimeRef = useRef(0)
  const prevDurationRef = useRef(0)
  const prevTrackNameRef = useRef('')

  useEffect(() => {
    const updatePlaylistInfo = () => {
      const controls = getPlaylistControls()
      if (!controls) return

      const newIsPlaying = controls.isPlaying
      const newCurrentTime =
        typeof controls.currentTime === 'function'
          ? controls.currentTime()
          : controls.currentTime
      const newDuration =
        typeof controls.duration === 'function'
          ? controls.duration()
          : controls.duration
      const newCurrentTrack =
        typeof controls.currentTrack === 'function'
          ? controls.currentTrack()
          : controls.currentTrack

      // 상태가 실제로 변경된 경우에만 업데이트 (ref 비교)
      if (prevIsPlayingRef.current !== newIsPlaying) {
        prevIsPlayingRef.current = newIsPlaying
        setIsBgmPlaying(newIsPlaying)
      }

      if (Math.abs(prevCurrentTimeRef.current - newCurrentTime) > 0.1) {
        prevCurrentTimeRef.current = newCurrentTime
        setCurrentTime(newCurrentTime)
      }

      if (Math.abs(prevDurationRef.current - newDuration) > 0.1) {
        prevDurationRef.current = newDuration
        setDuration(newDuration)
      }

      // 트랙 이름 추출 (파일명에서 확장자 제거 및 디코딩)
      if (newCurrentTrack) {
        try {
          // URL 디코딩 (인코딩된 문자 처리)
          const decodedTrack = decodeURIComponent(newCurrentTrack)
          // 파일명 추출 및 확장자 제거
          const fileName = decodedTrack.split('/').pop() || ''
          const trackName = fileName.replace(/\.mp3$/i, '') || '알 수 없음'

          if (prevTrackNameRef.current !== trackName) {
            prevTrackNameRef.current = trackName
            setCurrentTrackName(trackName)
          }
        } catch (error) {
          // 디코딩 실패 시 원본 사용
          const fileName = newCurrentTrack.split('/').pop() || ''
          const trackName = fileName.replace(/\.mp3$/i, '') || '알 수 없음'
          if (prevTrackNameRef.current !== trackName) {
            prevTrackNameRef.current = trackName
            setCurrentTrackName(trackName)
          }
        }
      }
    }

    const interval = setInterval(updatePlaylistInfo, 100)
    updatePlaylistInfo() // 즉시 한 번 확인

    return () => clearInterval(interval)
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

  // 국가 브라우즈(/history/country)와 국가 상세(/history/country/:id/*)
  // 모두 "국가" 메뉴를 활성 상태로 표시
  const isCountryBrowseActive =
    /^\/history\/country(\/|$)/.test(location.pathname)

  const menuItems: TopNavItemSpec[] = [
    {
      key: 'countries',
      label: '국가',
      icon: <FiMap size={16} />,
      onClick: () => {
        playClickSound()
        navigate(pathKeys.history.country())
      },
      active: isCountryBrowseActive,
    },
    ...DASHBOARD_MENU_ITEMS.map((item) => {
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
      } satisfies TopNavItemSpec
    }),
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
    {
      key: 'continents',
      label: '대륙',
      icon: <FiGlobe size={16} />,
      onClick: () => {
        playClickSound()
        navigate(pathKeys.history.continents())
      },
      active: location.pathname.startsWith('/history/continents'),
    },
    {
      key: 'post',
      label: '포스트',
      icon: <FiFileText size={16} />,
      onClick: () => {
        playClickSound()
        navigate(pathKeys.history.post())
      },
      active: location.pathname.startsWith('/history/post'),
    },
  ]

  const unreadCount = messages.filter((item) => item.unread).length

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
              aria-label="알림"
              onClick={() => {
                playClickSound()
                setIsBellOpen((prev) => !prev)
              }}
            >
              <FiBell size={18} />
              {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
            </IconButton>
            <DropdownMenu $isOpen={isBellOpen} style={{ right: 0, width: 320 }}>
              <DropdownHeaderRow>
                <DropdownTitle>메시지</DropdownTitle>
                <SmallButton
                  type="button"
                  onClick={() => {
                    playClickSound()
                    markAllRead()
                  }}
                >
                  모두 읽음
                </SmallButton>
              </DropdownHeaderRow>
              <MessageList>
                {messages.length === 0 && (
                  <EmptyNotice>메시지가 없습니다</EmptyNotice>
                )}
                {messages.map((msg) => (
                  <MessageRow
                    key={msg.id}
                    $unread={!!msg.unread}
                    onClick={() => {
                      playClickSound()
                      markOneRead(msg.id)
                      const listPath = getNotificationListPath(msg.ownerType)
                      if (listPath) {
                        navigate(listPath)
                        setIsBellOpen(false)
                      }
                    }}
                  >
                    <UnreadDot $visible={!!msg.unread} />
                    <MessageBody>
                      <MessageTitleRow>
                        {getNotificationEntityTypeLabel(msg.ownerType) && (
                          <EntityTypeChip>
                            {getNotificationEntityTypeLabel(msg.ownerType)}
                          </EntityTypeChip>
                        )}
                        <MessageTitle>{msg.title}</MessageTitle>
                      </MessageTitleRow>
                      {msg.preview && (
                        <MessagePreview>{msg.preview}</MessagePreview>
                      )}
                      <MessageMeta>{formatMessageTime(msg.time)}</MessageMeta>
                    </MessageBody>
                  </MessageRow>
                ))}
              </MessageList>
            </DropdownMenu>
          </div>

          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <UserButton
              onClick={() => {
                playClickSound()
                setIsUserOpen((prev) => !prev)
              }}
            >
              <Avatar>{(username || 'G').charAt(0).toUpperCase()}</Avatar>
            </UserButton>
            <DropdownMenu $isOpen={isUserOpen} style={{ right: 0, width: 220 }}>
              <ProfileHeader>
                <AvatarLg>{(username || 'G').charAt(0).toUpperCase()}</AvatarLg>
                <div>
                  <ProfileName>{username || '게스트'}</ProfileName>
                  <ProfileRole>관리자</ProfileRole>
                </div>
              </ProfileHeader>
              <Divider />
              <MenuItem onClick={() => {}}>
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
                <DropdownHeaderRow>
                  <SmallButton
                    type="button"
                    onClick={() => {
                      playClickSound()
                      markAllRead()
                    }}
                  >
                    모두 읽음
                  </SmallButton>
                </DropdownHeaderRow>
                <MessageList>
                  {messages.length === 0 && (
                    <EmptyNotice>메시지가 없습니다</EmptyNotice>
                  )}
                  {messages.map((msg) => (
                    <MessageRow
                      key={msg.id}
                      $unread={!!msg.unread}
                      onClick={() => {
                        playClickSound()
                        markOneRead(msg.id)
                        const listPath = getNotificationListPath(msg.ownerType)
                        if (listPath) {
                          navigate(listPath)
                          setIsBellOpen(false)
                        }
                      }}
                    >
                      <UnreadDot $visible={!!msg.unread} />
                      <MessageBody>
                        <MessageTitleRow>
                          {getNotificationEntityTypeLabel(msg.ownerType) && (
                            <EntityTypeChip>
                              {getNotificationEntityTypeLabel(msg.ownerType)}
                            </EntityTypeChip>
                          )}
                          <MessageTitle>{msg.title}</MessageTitle>
                        </MessageTitleRow>
                        {msg.preview && (
                          <MessagePreview>{msg.preview}</MessagePreview>
                        )}
                        <MessageMeta>{formatMessageTime(msg.time)}</MessageMeta>
                      </MessageBody>
                    </MessageRow>
                  ))}
                </MessageList>
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
                    {(username || 'G').charAt(0).toUpperCase()}
                  </AvatarLg>
                  <div>
                    <ProfileName>{username || '게스트'}</ProfileName>
                    <ProfileRole>관리자</ProfileRole>
                  </div>
                </ProfileHeader>
                <Divider />
                <MenuItem
                  onClick={() => {
                    playClickSound()
                  }}
                >
                  <FiUser size={14} /> 내 프로필
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    playClickSound()
                  }}
                >
                  설정
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
 * 백그라운드 색 넣지마라. 전체 컨테이너에서 적용한다.
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
  box-shadow: 0 1px 3px ${({ theme }) => theme.colors.shadow.sm};
  transition:
    background 0.25s ease,
    border-color 0.25s ease;
`

const LeftZone = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const CenterZone = styled.div`
  flex: 1;
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

const DropdownHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 4px 14px;
  margin-bottom: 4px;
`

const DropdownTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SmallButton = styled.button`
  height: 34px;
  padding: 0 14px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.activeLight};
    color: ${({ theme }) => theme.colors.button.hover};
  }

  &:active {
    background: ${({ theme }) => theme.colors.activeLight};
  }
`

const MessageList = styled.div`
  max-height: 380px;
  overflow-y: auto;
  padding: 8px 4px;
  margin-top: 4px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.background.primary};
    border-radius: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.default};
    border-radius: 6px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.border.medium};
  }
`

const EmptyNotice = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 52px 28px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-align: center;
  gap: 14px;
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.background.secondary};

  &::before {
    content: '🔔';
    font-size: 44px;
    opacity: 0.6;
  }
`

const MessageRow = styled.button<{ $unread: boolean }>`
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 14px;
  margin-bottom: 8px;
  border: none;
  background: ${({ $unread, theme }) =>
    $unread ? theme.colors.background.secondary : 'transparent'};
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  border-left: 4px solid
    ${({ $unread, theme }) => ($unread ? theme.colors.primary : 'transparent')};

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }

  &:active {
    transform: scale(0.99);
  }
`

const UnreadDot = styled.span<{ $visible: boolean }>`
  width: 10px;
  height: 10px;
  margin-top: 6px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  box-shadow: ${({ $visible, theme }) =>
    $visible ? `0 0 0 2px ${theme.colors.activeLight}` : 'none'};
  transition: all 0.2s ease;
  flex-shrink: 0;
`

const MessageBody = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const MessageTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 2px;
`

const EntityTypeChip = styled.span`
  display: inline-block;
  padding: 5px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.activeLight};
  flex-shrink: 0;
`

const MessageTitle = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 600;
  line-height: 1.45;
  min-width: 0;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const MessagePreview = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const MessageMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 500;
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
