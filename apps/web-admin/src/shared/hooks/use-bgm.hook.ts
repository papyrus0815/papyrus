import { useEffect, useRef, useState } from 'react'

import {
  getGlobalBgmMutedState,
  registerBgmAudio,
  setGlobalBgmMutedState,
} from './use-click-sound.hook'

interface UseBgmOptions {
  /** BGM 파일 경로 */
  src: string
  /** 초기 볼륨 (0.0 ~ 1.0, 기본값: 0.35) */
  initialVolume?: number
  /** 자동 재생 시도 여부 (기본값: true) */
  autoPlay?: boolean
}

interface UseBgmReturn {
  /** 현재 볼륨 (0.0 ~ 1.0) */
  volume: number
  /** 음소거 여부 */
  isMuted: boolean
  /** 재생 중 여부 */
  isPlaying: boolean
  /** 볼륨 변경 핸들러 */
  handleVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  /** 음소거 토글 핸들러 */
  handleMuteToggle: () => void
  /** 수동 재생 함수 */
  play: () => Promise<void>
  /** 수동 일시정지 함수 */
  pause: () => void
}

/**
 * BGM을 재생하고 관리하는 커스텀 훅
 *
 * @param options - BGM 옵션
 * @param options.src - BGM 파일 경로
 * @param options.initialVolume - 초기 볼륨 (기본값: 0.5)
 * @param options.autoPlay - 자동 재생 시도 여부 (기본값: true)
 * @returns BGM 제어 함수 및 상태
 *
 * @example
 * ```tsx
 * const {
 *   volume,
 *   isMuted,
 *   isPlaying,
 *   handleVolumeChange,
 *   handleMuteToggle,
 * } = useBgm({
 *   src: dashboardBgm,
 *   initialVolume: 0.5,
 * })
 * ```
 */
export function useBgm(options: UseBgmOptions): UseBgmReturn {
  const { src, initialVolume = 0.35, autoPlay = true } = options // 기본 볼륨을 0.35로 낮춤 (클릭 사운드가 잘 들리도록)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [volume, setVolume] = useState(initialVolume)
  const [isMuted, setIsMuted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  // 오디오 재생 함수
  const playAudio = async () => {
    if (!audioRef.current) return

    try {
      await audioRef.current.play()
      setIsPlaying(true)
      console.log('✅ BGM 재생 성공')
    } catch (error) {
      console.error('❌ BGM 재생 실패:', error)
      setIsPlaying(false)
    }
  }

  // 볼륨 변경 핸들러
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
      // 슬라이더를 움직이면 음소거 해제
      if (isMuted && newVolume > 0) {
        setIsMuted(false)
      } else if (newVolume === 0) {
        setIsMuted(true)
      }
    }
  }

  // 음소거 토글 핸들러
  const handleMuteToggle = async () => {
    if (audioRef.current) {
      if (isMuted) {
        // 음소거 해제: 이전 볼륨 값으로 복원 (없으면 initialVolume)
        const restoreVolume = volume > 0 ? volume : initialVolume
        audioRef.current.volume = restoreVolume
        setVolume(restoreVolume)
        setIsMuted(false)
        setGlobalBgmMutedState(false) // 전역 음소거 상태 해제
        // 재생 중이 아니면 재생 시도
        if (audioRef.current.paused) {
          await playAudio()
        }
      } else {
        // 음소거: 볼륨만 0으로 설정 (volume state는 유지)
        audioRef.current.volume = 0
        setIsMuted(true)
        setGlobalBgmMutedState(true) // 전역 음소거 상태 설정
      }
    }
  }

  // BGM 초기화 및 재생
  useEffect(() => {
    // 오디오 객체 생성
    const audio = new Audio(src)
    audio.loop = true
    audio.volume = volume
    audio.preload = 'auto'

    // 오디오 로드 완료 이벤트
    audio.addEventListener('loadeddata', () => {
      console.log('✅ 오디오 파일 로드 완료')
      audioRef.current = audio
      // 전역 BGM 오디오 인스턴스 등록 (클릭 사운드 ducking 효과를 위해)
      registerBgmAudio(audio)
    })

    // 오디오 에러 이벤트
    audio.addEventListener('error', (e) => {
      console.error('❌ 오디오 로드 에러:', e)
    })

    // 오디오 재생 이벤트
    audio.addEventListener('play', () => {
      setIsPlaying(true)
    })

    // 오디오 일시정지 이벤트
    audio.addEventListener('pause', () => {
      setIsPlaying(false)
    })

    audioRef.current = audio

    // 오디오 인스턴스를 즉시 등록 (loadeddata 이벤트가 발생하지 않을 수 있음)
    registerBgmAudio(audio)
    console.log('✅ BGM 오디오 인스턴스 등록:', audio.readyState)

    // 오디오가 이미 로드된 경우에도 확인
    if (audio.readyState >= 2) {
      // HAVE_CURRENT_DATA 이상이면 이미 로드됨
      console.log('✅ 오디오가 이미 로드됨')
    }

    // 자동 재생이 활성화된 경우에만 재생 시도
    if (autoPlay) {
      // 사용자 상호작용 감지 (클릭, 키보드, 터치 등)
      const handleUserInteraction = async () => {
        if (audioRef.current && audioRef.current.paused) {
          await playAudio()
        }
      }

      // 다양한 이벤트로 재생 시도
      document.addEventListener('click', handleUserInteraction, { once: true })
      document.addEventListener('keydown', handleUserInteraction, {
        once: true,
      })
      document.addEventListener('touchstart', handleUserInteraction, {
        once: true,
      })

      // 페이지 로드 시 재생 시도 (실패할 수 있음)
      playAudio().catch(() => {
        console.log('⏳ 사용자 상호작용 대기 중...')
      })

      // 컴포넌트 언마운트 시 이벤트 리스너 제거
      return () => {
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.currentTime = 0
          audioRef.current.src = ''
          audioRef.current = null
          // 전역 참조도 제거
          registerBgmAudio(null)
        }
        document.removeEventListener('click', handleUserInteraction)
        document.removeEventListener('keydown', handleUserInteraction)
        document.removeEventListener('touchstart', handleUserInteraction)
      }
    } else {
      // 자동 재생이 비활성화된 경우 정리만 수행
      return () => {
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.currentTime = 0
          audioRef.current.src = ''
          audioRef.current = null
          // 전역 참조도 제거
          registerBgmAudio(null)
        }
      }
    }
  }, [src, autoPlay]) // volume은 의존성에서 제외 (별도 effect에서 처리)

  // 볼륨 변경 시 오디오 볼륨 업데이트
  useEffect(() => {
    if (audioRef.current) {
      // 전역 음소거 상태 확인
      const globalMuted = getGlobalBgmMutedState()

      // 음소거 상태가 아닐 때만 볼륨 업데이트
      if (!isMuted && !globalMuted) {
        audioRef.current.volume = volume
        // 전역 참조도 동기화
        registerBgmAudio(audioRef.current)
      } else if (globalMuted && audioRef.current.volume !== 0) {
        // 전역 음소거 상태가 활성화되어 있으면 볼륨을 0으로 유지
        audioRef.current.volume = 0
      }
    }
  }, [volume, isMuted])

  return {
    volume,
    isMuted,
    isPlaying,
    handleVolumeChange,
    handleMuteToggle,
    play: playAudio,
    pause: () => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
    },
  }
}

export default useBgm
