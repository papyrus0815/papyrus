/**
 * 사운드 설정 위젯 — 트리거 버튼 + 데스크톱 드롭다운 + 모바일 모달.
 * BGM 재생/볼륨/음소거 컨트롤을 데스크톱·모바일 모두에서 제공한다.
 * (이전엔 드롭다운이 모바일에서 display:none이라 모바일에서 접근 불가였음)
 */
import { useEffect, useRef } from 'react'

import { AnimatePresence } from 'framer-motion'
import {
  FiPause,
  FiPlay,
  FiSkipBack,
  FiSkipForward,
  FiVolume2,
  FiVolumeX,
} from 'react-icons/fi'
import styled from 'styled-components'

import { useOnClickOutside } from '@/shared/hooks/use-on-click-outside.hook'

import {
  Divider,
  DROPDOWN_MOTION,
  DropdownPanel,
  IconButton,
  MobileModalShell,
} from './header-shared.ui'
import { useBgmController } from './use-bgm-controller.hook'

// 재생 시간 포맷 (mm:ss)
const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

interface SoundSettingsProps {
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  playClickSound: () => void
}

export function SoundSettings({
  isOpen,
  onToggle,
  onClose,
  playClickSound,
}: SoundSettingsProps) {
  const bgm = useBgmController()
  const containerRef = useRef<HTMLDivElement | null>(null)

  useOnClickOutside(containerRef, () => {
    if (isOpen) onClose()
  })

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  const content = (
    <SoundSettingsContent bgm={bgm} playClickSound={playClickSound} />
  )

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <IconButton
        aria-label="사운드 설정"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => {
          playClickSound()
          onToggle()
        }}
      >
        {bgm.muted ? <FiVolumeX size={18} /> : <FiVolume2 size={18} />}
      </IconButton>

      <AnimatePresence>
        {isOpen && (
          <SettingsPanel {...DROPDOWN_MOTION}>
            <SettingsHeader>
              <SettingsTitle>사운드 설정</SettingsTitle>
            </SettingsHeader>
            <Divider />
            {content}
          </SettingsPanel>
        )}
      </AnimatePresence>

      <MobileModalShell
        isOpen={isOpen}
        title="사운드 설정"
        onClose={onClose}
        playClickSound={playClickSound}
      >
        {content}
      </MobileModalShell>
    </div>
  )
}

function SoundSettingsContent({
  bgm,
  playClickSound,
}: {
  bgm: ReturnType<typeof useBgmController>
  playClickSound: () => void
}) {
  return (
    <SettingsContent>
      {bgm.trackName && (
        <TrackInfo>
          <TrackName>{bgm.trackName}</TrackName>
          <TrackProgress>
            <ProgressBar>
              <ProgressFill
                $progress={
                  bgm.duration > 0 ? (bgm.currentTime / bgm.duration) * 100 : 0
                }
              />
            </ProgressBar>
            <TimeDisplay>
              <span>{formatTime(bgm.currentTime)}</span>
              <span>/</span>
              <span>{formatTime(bgm.duration)}</span>
            </TimeDisplay>
          </TrackProgress>
        </TrackInfo>
      )}

      <PlaybackControls>
        <PlaybackButton
          onClick={() => {
            playClickSound()
            void bgm.playPrevious()
          }}
          type="button"
          aria-label="이전 트랙"
        >
          <FiSkipBack size={16} />
        </PlaybackButton>
        <PlaybackButton
          onClick={() => {
            playClickSound()
            void bgm.togglePlayPause()
          }}
          type="button"
          aria-label={bgm.isPlaying ? '일시정지' : '재생'}
        >
          {bgm.isPlaying ? <FiPause size={18} /> : <FiPlay size={18} />}
        </PlaybackButton>
        <PlaybackButton
          onClick={() => {
            playClickSound()
            void bgm.playNext()
          }}
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
            {bgm.muted ? <FiVolumeX size={18} /> : <FiVolume2 size={18} />}
          </SoundControlIcon>
          <div>
            <SoundControlTitle>배경음악</SoundControlTitle>
            <SoundControlSubtitle>
              {bgm.muted ? '음소거됨' : `${Math.round(bgm.volume * 100)}%`}
            </SoundControlSubtitle>
          </div>
        </SoundControlLabel>
        <SoundControlActions>
          <SoundToggleButton
            onClick={() => {
              playClickSound()
              bgm.toggleMute()
            }}
            type="button"
            aria-label={bgm.muted ? '음소거 해제' : '음소거'}
          >
            {bgm.muted ? <FiVolumeX size={16} /> : <FiVolume2 size={16} />}
          </SoundToggleButton>
          <SettingsVolumeSlider
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={bgm.volume}
            onChange={(event) => bgm.changeVolume(parseFloat(event.target.value))}
            aria-label="BGM 볼륨 조절"
          />
        </SoundControlActions>
      </SoundControlSection>
    </SettingsContent>
  )
}

const SettingsPanel = styled(DropdownPanel)`
  width: 300px;
  padding: 20px;
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
