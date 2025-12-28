import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  getGlobalBgmMutedState,
  registerBgmAudio,
  setGlobalBgmMutedState,
} from './use-click-sound.hook'

// 전역 플레이리스트 컨트롤 함수들 (헤더에서 접근하기 위해)
let globalPlaylistControls: {
  togglePlayPause: () => Promise<void>
  playNext: () => Promise<void>
  playPrevious: () => Promise<void>
  isPlaying: boolean
  currentTrack: string | (() => string)
  currentTime: number | (() => number)
  duration: number | (() => number)
} | null = null

/**
 * 전역 플레이리스트 컨트롤을 등록하는 함수
 */
export function registerPlaylistControls(
  controls: {
    togglePlayPause: () => Promise<void>
    playNext: () => Promise<void>
    playPrevious: () => Promise<void>
    isPlaying: boolean
    currentTrack: string | (() => string)
    currentTime: number | (() => number)
    duration: number | (() => number)
  } | null,
) {
  globalPlaylistControls = controls
}

/**
 * 전역 플레이리스트 컨트롤을 가져오는 함수
 */
export function getPlaylistControls() {
  return globalPlaylistControls
}

interface UseBgmPlaylistOptions {
  /** BGM 파일 경로 배열 */
  playlist: string[]
  /** 초기 볼륨 (0.0 ~ 1.0, 기본값: 0.1) */
  initialVolume?: number
  /** 자동 재생 시도 여부 (기본값: true) */
  autoPlay?: boolean
  /** 랜덤 재생 여부 (기본값: true) */
  shuffle?: boolean
}

interface UseBgmPlaylistReturn {
  /** 현재 볼륨 (0.0 ~ 1.0) */
  volume: number
  /** 음소거 여부 */
  isMuted: boolean
  /** 재생 중 여부 */
  isPlaying: boolean
  /** 현재 재생 중인 트랙 인덱스 */
  currentTrackIndex: number
  /** 현재 재생 중인 트랙 소스 */
  currentTrack: string
  /** 현재 재생 시간 (초) */
  currentTime: number
  /** 총 재생 시간 (초) */
  duration: number
  /** 볼륨 변경 핸들러 */
  handleVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  /** 음소거 토글 핸들러 */
  handleMuteToggle: () => void
  /** 재생/일시정지 토글 */
  togglePlayPause: () => Promise<void>
  /** 다음 트랙 재생 */
  playNext: () => Promise<void>
  /** 이전 트랙 재생 */
  playPrevious: () => Promise<void>
  /** 특정 트랙 재생 */
  playTrack: (index: number) => Promise<void>
}

/**
 * BGM 플레이리스트를 재생하고 관리하는 커스텀 훅
 *
 * @param options - 플레이리스트 옵션
 * @param options.playlist - BGM 파일 경로 배열
 * @param options.initialVolume - 초기 볼륨 (기본값: 0.1)
 * @param options.autoPlay - 자동 재생 시도 여부 (기본값: true)
 * @param options.shuffle - 랜덤 재생 여부 (기본값: true)
 * @returns 플레이리스트 제어 함수 및 상태
 */
export function useBgmPlaylist(
  options: UseBgmPlaylistOptions,
): UseBgmPlaylistReturn {
  const {
    playlist,
    initialVolume = 0.1,
    autoPlay = true,
    shuffle = true,
  } = options

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playNextRef = useRef<(() => Promise<void>) | null>(null)
  const changeTrackRef = useRef<((index: number) => Promise<void>) | null>(null)
  const currentTimeRef = useRef(0)
  const durationRef = useRef(0)
  const currentTrackRef = useRef('')
  const currentTrackIndexRef = useRef(0)
  const playOrderRef = useRef<number[]>([])
  const playlistRef = useRef<string[]>(playlist)
  const volumeRef = useRef(initialVolume)
  const isMutedRef = useRef(false)
  const isPlayingRef = useRef(false)
  const autoPlayRef = useRef(autoPlay)
  const [volume, setVolume] = useState(initialVolume)
  const [isMuted, setIsMuted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [playOrder, setPlayOrder] = useState<number[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // ref 동기화
  useEffect(() => {
    playlistRef.current = playlist
    volumeRef.current = volume
    isMutedRef.current = isMuted
    autoPlayRef.current = autoPlay
  }, [playlist, volume, isMuted, autoPlay])

  useEffect(() => {
    playOrderRef.current = playOrder
  }, [playOrder])

  // 플레이리스트가 변경되면 재생 순서 초기화
  useEffect(() => {
    if (playlist.length === 0) return

    // 랜덤 재생 순서 생성
    let order: number[]
    if (shuffle) {
      order = Array.from({ length: playlist.length }, (_, i) => i)
      // Fisher-Yates 셔플 알고리즘
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[order[i], order[j]] = [order[j], order[i]]
      }
    } else {
      order = Array.from({ length: playlist.length }, (_, i) => i)
    }

    // ref 먼저 업데이트
    currentTrackIndexRef.current = 0
    playOrderRef.current = order

    // 상태 업데이트는 다음 프레임으로 지연 (배치 처리)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPlayOrder(order)
        setCurrentTrackIndex(0)
      })
    })
  }, [playlist, shuffle])

  // 현재 트랙 소스 계산 (메모이제이션하여 불필요한 재계산 방지)
  const currentTrack = useMemo(() => {
    if (playOrder.length > 0 && currentTrackIndex < playOrder.length) {
      return playlist[playOrder[currentTrackIndex]]
    }
    return playlist[0] || ''
  }, [playlist, playOrder, currentTrackIndex])

  // 오디오 재생 함수
  const playAudio = useCallback(async () => {
    if (!audioRef.current) return

    try {
      await audioRef.current.play()
      isPlayingRef.current = true
      setIsPlaying(true)
    } catch (error) {
      console.error('❌ BGM 재생 실패:', error)
      isPlayingRef.current = false
      setIsPlaying(false)
    }
  }, [])

  // 트랙 변경 함수 (ref를 사용하여 의존성 제거)
  const changeTrack = useCallback(async (newIndex: number) => {
    const order = playOrderRef.current
    const tracks = playlistRef.current
    if (order.length === 0) return

    const actualIndex = newIndex % order.length
    const trackSrc = tracks[order[actualIndex]]

    // 기존 오디오 정리
    if (audioRef.current) {
      audioRef.current.pause()
      // 이벤트 리스너는 자동으로 정리됨 (새 오디오 객체 생성 시)
    }

    // 새 오디오 객체 생성
    const audio = new Audio(trackSrc)
    audio.loop = false // 플레이리스트 모드에서는 루프 비활성화
    audio.volume = isMutedRef.current ? 0 : volumeRef.current
    audio.preload = 'auto'

    // 재생 시간 업데이트 (throttle 적용 및 ref 우선 업데이트)
    let lastUpdateTime = 0
    const handleTimeUpdate = () => {
      const time = audio.currentTime
      // ref는 항상 최신 값으로 업데이트
      currentTimeRef.current = time
      // 상태는 100ms마다만 업데이트 (무한 루프 방지)
      const now = Date.now()
      if (now - lastUpdateTime > 100) {
        lastUpdateTime = now
        // requestAnimationFrame으로 상태 업데이트 지연
        requestAnimationFrame(() => {
          setCurrentTime(time)
        })
      }
    }
    audio.addEventListener('timeupdate', handleTimeUpdate)

    // 총 재생 시간 업데이트
    const handleLoadedMetadata = () => {
      const dur = audio.duration || 0
      durationRef.current = dur
      setDuration(dur)
    }
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)

    // 트랙 종료 시 다음 트랙 재생 (ref를 통해 접근)
    const handleTrackEnd = () => {
      if (playNextRef.current) {
        playNextRef.current()
      }
    }
    audio.addEventListener('ended', handleTrackEnd)

    // 오디오 로드 완료 이벤트
    audio.addEventListener('loadeddata', () => {
      console.log('✅ 오디오 파일 로드 완료:', trackSrc)
      audioRef.current = audio
      registerBgmAudio(audio)
      const dur = audio.duration || 0
      durationRef.current = dur
      setDuration(dur)
    })

    // 오디오 에러 이벤트
    audio.addEventListener('error', (e) => {
      console.error('❌ 오디오 로드 에러:', e)
    })

    // 오디오 재생 이벤트
    audio.addEventListener('play', () => {
      isPlayingRef.current = true
      setIsPlaying(true)
    })

    // 오디오 일시정지 이벤트
    audio.addEventListener('pause', () => {
      isPlayingRef.current = false
      setIsPlaying(false)
    })

    audioRef.current = audio
    registerBgmAudio(audio)
    currentTrackIndexRef.current = actualIndex
    currentTimeRef.current = 0
    currentTrackRef.current = trackSrc

    // 상태 업데이트는 이중 requestAnimationFrame으로 지연 (무한 루프 방지)
    // ref는 이미 업데이트되었으므로 상태는 UI 동기화용으로만 사용
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setCurrentTrackIndex(actualIndex)
        setCurrentTime(0)
      })
    })

    // 자동 재생
    if (autoPlayRef.current) {
      try {
        await audio.play()
      } catch (error) {
        console.log('⏳ 사용자 상호작용 대기 중...')
      }
    }
  }, [])

  // changeTrack ref 업데이트
  useEffect(() => {
    changeTrackRef.current = changeTrack
  }, [changeTrack])

  // 다음 트랙 재생
  const playNext = useCallback(async () => {
    const order = playOrderRef.current
    if (order.length === 0) return
    const nextIndex = (currentTrackIndexRef.current + 1) % order.length
    if (changeTrackRef.current) {
      await changeTrackRef.current(nextIndex)
    }
  }, [])

  // 이전 트랙 재생
  const playPrevious = useCallback(async () => {
    const order = playOrderRef.current
    if (order.length === 0) return
    const prevIndex =
      currentTrackIndexRef.current === 0
        ? order.length - 1
        : currentTrackIndexRef.current - 1
    if (changeTrackRef.current) {
      await changeTrackRef.current(prevIndex)
    }
  }, [])

  // 특정 트랙 재생
  const playTrack = useCallback(async (index: number) => {
    const order = playOrderRef.current
    if (order.length === 0) return
    if (changeTrackRef.current) {
      await changeTrackRef.current(index)
    }
  }, [])

  // 재생/일시정지 토글
  const togglePlayPause = useCallback(async () => {
    if (!audioRef.current) {
      // 오디오가 없으면 첫 트랙 재생
      const order = playOrderRef.current
      if (order.length > 0 && changeTrackRef.current) {
        await changeTrackRef.current(0)
      }
      return
    }

    if (audioRef.current.paused) {
      await playAudio()
    } else {
      audioRef.current.pause()
    }
  }, [playAudio])

  // 볼륨 변경 핸들러
  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(e.target.value)
      setVolume(newVolume)
      if (audioRef.current) {
        audioRef.current.volume = newVolume
        if (isMuted && newVolume > 0) {
          setIsMuted(false)
          setGlobalBgmMutedState(false)
        } else if (newVolume === 0) {
          setIsMuted(true)
          setGlobalBgmMutedState(true)
        }
      }
    },
    [isMuted],
  )

  // 음소거 토글 핸들러
  const handleMuteToggle = useCallback(async () => {
    if (audioRef.current) {
      if (isMuted) {
        const restoreVolume = volume > 0 ? volume : initialVolume
        audioRef.current.volume = restoreVolume
        setVolume(restoreVolume)
        setIsMuted(false)
        setGlobalBgmMutedState(false)
        if (audioRef.current.paused) {
          await playAudio()
        }
      } else {
        audioRef.current.volume = 0
        setIsMuted(true)
        setGlobalBgmMutedState(true)
      }
    }
  }, [isMuted, volume, initialVolume, playAudio])

  // 초기 트랙 로드 (한 번만 실행되도록 플래그 사용)
  const hasInitializedRef = useRef(false)
  useEffect(() => {
    if (
      playOrder.length > 0 &&
      changeTrackRef.current &&
      !hasInitializedRef.current
    ) {
      hasInitializedRef.current = true
      changeTrackRef.current(0).catch(() => {
        console.log('⏳ 사용자 상호작용 대기 중...')
      })
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        audioRef.current.src = ''
        audioRef.current = null
        registerBgmAudio(null)
      }
      hasInitializedRef.current = false
    }
  }, [playOrder.length]) // playOrder가 준비되면 실행

  // 볼륨 변경 시 오디오 볼륨 업데이트
  useEffect(() => {
    if (audioRef.current) {
      const globalMuted = getGlobalBgmMutedState()
      if (!isMuted && !globalMuted) {
        audioRef.current.volume = volume
        registerBgmAudio(audioRef.current)
      } else if (globalMuted && audioRef.current.volume !== 0) {
        audioRef.current.volume = 0
      }
    }
  }, [volume, isMuted])

  // 함수 ref들
  const togglePlayPauseRef = useRef(togglePlayPause)
  const playNextRefForControls = useRef(playNext)
  const playPreviousRefForControls = useRef(playPrevious)

  // 함수 ref 업데이트
  useEffect(() => {
    togglePlayPauseRef.current = togglePlayPause
  }, [togglePlayPause])

  useEffect(() => {
    playNextRef.current = playNext
    playNextRefForControls.current = playNext
  }, [playNext])

  useEffect(() => {
    playPreviousRefForControls.current = playPrevious
  }, [playPrevious])

  // 전역 컨트롤 등록 (ref 기반으로 완전히 안정화 - 한 번만 실행)
  useEffect(() => {
    const controls = {
      togglePlayPause: async () => {
        await togglePlayPauseRef.current()
      },
      playNext: async () => {
        await playNextRefForControls.current()
      },
      playPrevious: async () => {
        await playPreviousRefForControls.current()
      },
      get isPlaying() {
        return isPlayingRef.current
      },
      get currentTrack() {
        return currentTrackRef.current
      },
      get currentTime() {
        return currentTimeRef.current
      },
      get duration() {
        return durationRef.current
      },
    }

    registerPlaylistControls(controls)

    return () => {
      registerPlaylistControls(null)
    }
  }, []) // 빈 의존성 배열 - 한 번만 등록

  return {
    volume,
    isMuted,
    isPlaying,
    currentTrackIndex,
    currentTrack,
    currentTime,
    duration,
    handleVolumeChange,
    handleMuteToggle,
    togglePlayPause,
    playNext,
    playPrevious,
    playTrack,
  }
}

export default useBgmPlaylist
