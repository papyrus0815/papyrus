import React, { useEffect, useRef, useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import {
  FiBell,
  FiFileText,
  FiGlobe,
  FiHome,
  FiLayers,
  FiLogOut,
  FiMenu,
  FiPause,
  FiPlay,
  FiSkipBack,
  FiSkipForward,
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
import { OVERLAY_STYLES, Z_INDEX } from '@/shared/styles/z-index'

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
  if (Number.isNaN(parsed.getTime())) return s.length > 20 ? s.slice(0, 16) + '…' : s
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 86400000
  const t = parsed.getTime()
  const dateOnly = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime()
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

  const menuItems: TopNavItemSpec[] = [
    {
      key: 'timeline',
      label: '연대표',
      icon: <FiHome size={16} />,
      onClick: () => {
        playClickSound()
        navigate('/history/country')
      },
      active: location.pathname.startsWith('/history/country'),
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
    {
      key: 'continents',
      label: '대륙',
      icon: <FiGlobe size={16} />,
      onClick: () => {
        playClickSound()
        navigate('/history/continents')
      },
      active: location.pathname.startsWith('/history/continents'),
    },
    {
      key: 'post',
      label: '글',
      icon: <FiFileText size={16} />,
      onClick: () => {
        playClickSound()
        navigate('/history/post')
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
  background: #ffffff;
  border-bottom: 1px solid #f1f5f9;
  z-index: ${Z_INDEX.HEADER};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
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

const SoundController = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e6e8eb;
  border-radius: 20px;
  padding: 0.375rem 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 1);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  }

  @media (max-width: 768px) {
    padding: 0.25rem 0.5rem;
    gap: 0.375rem;
  }
`

const SoundButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: #5f6368;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 6px;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #202124;
  }

  &:active {
    transform: scale(0.95);
  }
`

const VolumeSlider = styled.input`
  width: 80px;
  height: 4px;
  border-radius: 2px;
  background: #e6e8eb;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #5f6368;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  &::-webkit-slider-thumb:hover {
    background: #202124;
    transform: scale(1.1);
  }

  &::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #5f6368;
    cursor: pointer;
    border: none;
    transition: all 0.2s ease;
  }

  &::-moz-range-thumb:hover {
    background: #202124;
    transform: scale(1.1);
  }

  @media (max-width: 768px) {
    width: 60px;
  }
`

const SettingsHeader = styled.div`
  padding: 4px 0 14px;
`

const SettingsTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: #334155;
  letter-spacing: -0.01em;
`

const SettingsContent = styled.div`
  padding: 4px 0;
`

const TrackInfo = styled.div`
  padding: 16px 14px;
  margin-bottom: 12px;
  background: #f8fafc;
  border-radius: 16px;
`

const TrackName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #334155;
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
  background: #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
`

const ProgressFill = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${({ $progress }) => `${$progress}%`};
  background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 8px;
  transition: width 0.1s linear;
`

const TimeDisplay = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 11px;
  color: #64748b;
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
  background: #f1f5f9;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: #e2e8f0;
    color: #4f46e5;
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.96);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px #c7d2fe;
  }

  &:nth-child(2) {
    width: 50px;
    height: 50px;
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    color: #ffffff;
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);

    &:hover {
      background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
      transform: scale(1.06);
      box-shadow: 0 6px 18px rgba(99, 102, 241, 0.4);
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
  background: #eef2ff;
  color: #6366f1;
  flex-shrink: 0;
`

const SoundControlTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 2px;
`

const SoundControlSubtitle = styled.div`
  font-size: 12px;
  color: #64748b;
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
  background: #f1f5f9;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: #eef2ff;
    color: #6366f1;
  }

  &:active {
    transform: scale(0.96);
  }
`

const SettingsVolumeSlider = styled.input`
  flex: 1;
  height: 8px;
  border-radius: 8px;
  background: #e2e8f0;
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
    background: #6366f1;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 6px rgba(99, 102, 241, 0.35);
  }

  &::-webkit-slider-thumb:hover {
    background: #4f46e5;
    transform: scale(1.1);
  }

  &::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #6366f1;
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 6px rgba(99, 102, 241, 0.35);
  }

  &::-moz-range-thumb:hover {
    background: #4f46e5;
    transform: scale(1.1);
  }
`

const LogoButton = styled.button`
  border: none;
  background: transparent;
  color: #334155;
  font-weight: 700;
  font-size: 15px;
  letter-spacing: -0.02em;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: #6366f1;
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
  color: #64748b;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;

  &:hover {
    background: #f1f5f9;
    color: #475569;
  }

  &:active {
    transform: scale(0.96);
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
  background: #6366f1;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 2px #fff;
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
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: #4f46e5;
`

const DropdownMenu = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 44px;
  background: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 20px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.03);
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
  color: #334155;
`

const SmallButton = styled.button`
  height: 34px;
  padding: 0 14px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: #6366f1;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #eef2ff;
    color: #4f46e5;
  }

  &:active {
    background: #e0e7ff;
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
    background: #f8fafc;
    border-radius: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 6px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #cbd5e1;
  }
`

const EmptyNotice = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 52px 28px;
  font-size: 14px;
  color: #94a3b8;
  text-align: center;
  gap: 14px;
  border-radius: 16px;
  background: #fafbff;

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
  background: ${({ $unread }) => ($unread ? '#f8fafc' : 'transparent')};
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  border-left: 4px solid ${({ $unread }) => ($unread ? '#6366f1' : 'transparent')};

  &:hover {
    background: ${({ $unread }) => ($unread ? '#f1f5f9' : '#f8fafc')};
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
  background: #6366f1;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  box-shadow: ${({ $visible }) =>
    $visible ? '0 0 0 2px rgba(99, 102, 241, 0.2)' : 'none'};
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
  color: #4f46e5;
  background: #eef2ff;
  flex-shrink: 0;
`

const MessageTitle = styled.div`
  font-size: 14px;
  color: #334155;
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
  color: #64748b;
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
  color: #94a3b8;
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
  color: #334155;
  font-weight: 700;
`

const ProfileRole = styled.div`
  font-size: 11px;
  color: #64748b;
`

const Divider = styled.div`
  height: 1px;
  background: #f1f5f9;
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
  color: #334155;
  border-radius: 12px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s ease;

  &:hover {
    background: #f1f5f9;
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
  color: #64748b;
  cursor: pointer;
  border-radius: 10px;
  transition: background 0.2s ease, color 0.2s ease;

  &:hover {
    background: #f1f5f9;
    color: #475569;
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
  background: rgba(0, 0, 0, 0.5);
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
    background: #fff;
    border-radius: 24px;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.1);
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
  color: #64748b;
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.2s ease;

  &:hover {
    background: #f1f5f9;
    color: #334155;
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
  background: #fff;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.15);
    border-radius: 2px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.25);
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
  background: ${({ $active }) => ($active ? '#eef2ff' : 'transparent')};
  color: ${({ $active }) => ($active ? '#4f46e5' : '#334155')};
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
    background: #6366f1;
    opacity: ${({ $active }) => ($active ? '1' : '0')};
    transition: opacity 0.2s ease;
  }

  &:hover {
    background: ${({ $active }) => ($active ? '#e0e7ff' : '#f8fafc')};
    color: ${({ $active }) => ($active ? '#4338ca' : '#1e293b')};
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
    background: #fff;
    border-radius: 24px;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.12);
    z-index: ${Z_INDEX.MODAL_CONTENT};
    overflow: hidden;
  }
`

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid #f1f5f9;
  background: #fff;
`

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #334155;
  letter-spacing: -0.02em;
`

const ModalContent = styled.div`
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  background: #fff;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.15);
    border-radius: 2px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.25);
  }
`
