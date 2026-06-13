/**
 * 헤더 BGM 컨트롤러 훅 — 전역 BGM 오디오 인스턴스의 상태를 구독하고
 * 재생/볼륨/음소거 제어 핸들러를 제공한다.
 *
 * 트랙마다 new Audio()로 인스턴스가 교체되므로 subscribeBgmAudio로 교체를
 * 감지해 매번 오디오 엘리먼트 이벤트 리스너를 재바인딩한다(100ms 폴링 대신).
 * 클릭 효과음은 호출 측 UI가 담당하고, 이 훅은 순수하게 오디오만 다룬다.
 */
import { useEffect, useRef, useState } from 'react'

import { getPlaylistControls } from '@/shared/hooks/use-bgm-playlist.hook'
import {
  getBgmAudio,
  setGlobalBgmMutedState,
  subscribeBgmAudio,
} from '@/shared/hooks/use-click-sound.hook'

export interface BgmControllerState {
  isPlaying: boolean
  volume: number
  muted: boolean
  trackName: string
  currentTime: number
  duration: number
  togglePlayPause: () => Promise<void>
  playNext: () => Promise<void>
  playPrevious: () => Promise<void>
  changeVolume: (next: number) => void
  toggleMute: () => void
}

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

export function useBgmController(): BgmControllerState {
  const [volume, setVolume] = useState(0.1)
  const [muted, setMuted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [trackName, setTrackName] = useState('')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null)

  // 오디오 엘리먼트 이벤트 구독 — 인스턴스 교체 시 리스너 재바인딩.
  useEffect(() => {
    let current: HTMLAudioElement | null = null

    const syncPlaying = () => setIsPlaying(!!current && !current.paused)
    const syncTime = () => {
      if (current) setCurrentTime(current.currentTime || 0)
    }
    const syncDuration = () => {
      if (current)
        setDuration(Number.isFinite(current.duration) ? current.duration : 0)
    }
    const syncTrack = () => {
      if (current) setTrackName(deriveTrackName(current.currentSrc))
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
      setVolume(el.volume)
      setMuted(el.volume === 0)
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

  const togglePlayPause = async () => {
    const controls = getPlaylistControls()
    if (!controls) return
    await controls.togglePlayPause()
    setIsPlaying(controls.isPlaying)
  }

  const playNext = async () => {
    const controls = getPlaylistControls()
    if (!controls) return
    await controls.playNext()
    setIsPlaying(controls.isPlaying)
  }

  const playPrevious = async () => {
    const controls = getPlaylistControls()
    if (!controls) return
    await controls.playPrevious()
    setIsPlaying(controls.isPlaying)
  }

  const changeVolume = (next: number) => {
    setVolume(next)
    const bgmAudio = getBgmAudio()
    if (!bgmAudio) return
    bgmAudio.volume = next
    bgmAudioRef.current = bgmAudio
    if (muted && next > 0) setMuted(false)
    else if (next === 0) setMuted(true)
  }

  const toggleMute = () => {
    const bgmAudio = getBgmAudio()
    if (!bgmAudio) return
    bgmAudioRef.current = bgmAudio
    if (muted) {
      // 음소거 해제: 이전 볼륨 복원 또는 기본값 사용
      const restoreVolume = volume > 0 ? volume : 0.1
      bgmAudio.volume = restoreVolume
      setGlobalBgmMutedState(false)
      setVolume(restoreVolume)
      setMuted(false)
    } else {
      // 음소거: 현재 볼륨을 저장(복원용)한 뒤 0으로
      const currentVolume = bgmAudio.volume > 0 ? bgmAudio.volume : volume
      if (currentVolume > 0) setVolume(currentVolume)
      bgmAudio.volume = 0
      setMuted(true)
    }
  }

  return {
    isPlaying,
    volume,
    muted,
    trackName,
    currentTime,
    duration,
    togglePlayPause,
    playNext,
    playPrevious,
    changeVolume,
    toggleMute,
  }
}
