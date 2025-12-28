import { useCallback, useRef } from 'react'

import clickSound from '@/shared/assets/sound/click.mp3'

interface UseClickSoundOptions {
  volume?: number
}

// 전역 BGM 오디오 인스턴스 참조 (ducking 효과를 위해)
let globalBgmAudioRef: HTMLAudioElement | null = null
// 전역 음소거 상태 (ducking 효과가 음소거 상태를 유지하기 위해)
let globalBgmMutedState: boolean = false

/**
 * 전역 BGM 오디오 인스턴스를 등록하는 함수
 * useBgm 훅에서 호출하여 BGM 오디오 인스턴스를 등록합니다.
 */
export function registerBgmAudio(audio: HTMLAudioElement | null) {
  globalBgmAudioRef = audio
}

/**
 * 전역 BGM 오디오 인스턴스를 가져오는 함수
 * Header 등에서 BGM을 제어하기 위해 사용합니다.
 */
export function getBgmAudio(): HTMLAudioElement | null {
  return globalBgmAudioRef
}

/**
 * 전역 음소거 상태를 설정하는 함수
 * Header에서 음소거 상태를 변경할 때 호출합니다.
 */
export function setGlobalBgmMutedState(muted: boolean) {
  globalBgmMutedState = muted
}

/**
 * 전역 음소거 상태를 가져오는 함수
 */
export function getGlobalBgmMutedState(): boolean {
  return globalBgmMutedState
}

/**
 * 클릭 효과음을 재생하는 커스텀 훅
 *
 * @param options - 옵션 객체
 * @param options.volume - 효과음 볼륨 (0.0 ~ 1.0, 기본값: 0.7)
 * @returns 클릭 효과음을 재생하는 함수
 *
 * @example
 * ```tsx
 * const playClickSound = useClickSound()
 *
 * <button onClick={playClickSound}>클릭</button>
 * ```
 *
 * @example
 * ```tsx
 * // 볼륨 조절
 * const playClickSound = useClickSound({ volume: 0.8 })
 * ```
 */
export function useClickSound(options: UseClickSoundOptions = {}): () => void {
  const { volume = 0.7 } = options // 기본 볼륨을 0.7로 증가 (BGM에 묻히지 않도록)
  const duckingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const fadeOutIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const fadeInIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const playClickSound = useCallback(() => {
    try {
      const clickAudio = new Audio(clickSound)
      clickAudio.volume = volume

      // Ducking 효과: 클릭 사운드 재생 시 BGM을 부드럽게 낮춤
      // 음소거 상태가 아닐 때만 ducking 효과 적용
      if (
        globalBgmAudioRef &&
        !globalBgmAudioRef.paused &&
        !globalBgmMutedState
      ) {
        const originalBgmVolume = globalBgmAudioRef.volume
        const duckedBgmVolume = Math.max(0, originalBgmVolume * 0.6) // BGM을 60%로 낮춤 (30% → 60%로 완화)

        // 기존 페이드 아웃/인 인터벌 정리
        if (fadeOutIntervalRef.current) {
          clearInterval(fadeOutIntervalRef.current)
          fadeOutIntervalRef.current = null
        }
        if (fadeInIntervalRef.current) {
          clearInterval(fadeInIntervalRef.current)
          fadeInIntervalRef.current = null
        }

        // 부드러운 페이드 아웃 (50ms 동안 점진적으로 낮춤)
        const fadeOutDuration = 50
        const fadeOutSteps = 10
        const volumeStep = (originalBgmVolume - duckedBgmVolume) / fadeOutSteps
        let currentStep = 0

        fadeOutIntervalRef.current = setInterval(() => {
          if (currentStep < fadeOutSteps && globalBgmAudioRef) {
            const newVolume = originalBgmVolume - volumeStep * (currentStep + 1)
            globalBgmAudioRef.volume = Math.max(duckedBgmVolume, newVolume)
            currentStep++
          } else {
            if (fadeOutIntervalRef.current) {
              clearInterval(fadeOutIntervalRef.current)
              fadeOutIntervalRef.current = null
            }
            if (globalBgmAudioRef) {
              globalBgmAudioRef.volume = duckedBgmVolume
            }
          }
        }, fadeOutDuration / fadeOutSteps)

        // 클릭 사운드 종료 후 BGM 볼륨 부드럽게 복원
        const restoreVolume = () => {
          // 기존 페이드 인 인터벌 정리
          if (fadeInIntervalRef.current) {
            clearInterval(fadeInIntervalRef.current)
            fadeInIntervalRef.current = null
          }

          if (
            globalBgmAudioRef &&
            !globalBgmAudioRef.paused &&
            !globalBgmMutedState
          ) {
            // 부드러운 페이드 인 (100ms 동안 점진적으로 복원)
            const fadeInDuration = 100
            const fadeInSteps = 10
            const restoreVolumeStep =
              (originalBgmVolume - duckedBgmVolume) / fadeInSteps
            let restoreStep = 0

            fadeInIntervalRef.current = setInterval(() => {
              if (restoreStep < fadeInSteps && globalBgmAudioRef) {
                const newVolume =
                  duckedBgmVolume + restoreVolumeStep * (restoreStep + 1)
                globalBgmAudioRef.volume = Math.min(
                  originalBgmVolume,
                  newVolume,
                )
                restoreStep++
              } else {
                if (fadeInIntervalRef.current) {
                  clearInterval(fadeInIntervalRef.current)
                  fadeInIntervalRef.current = null
                }
                if (globalBgmAudioRef && !globalBgmMutedState) {
                  globalBgmAudioRef.volume = originalBgmVolume
                }
              }
            }, fadeInDuration / fadeInSteps)
          }
        }

        clickAudio.addEventListener('ended', restoreVolume)

        // 타임아웃으로도 복원 (안전장치, 약 200ms 후)
        if (duckingTimeoutRef.current) {
          clearTimeout(duckingTimeoutRef.current)
        }
        duckingTimeoutRef.current = setTimeout(() => {
          restoreVolume()
        }, 200)
      }

      // 클릭 사운드 재생
      clickAudio.play().catch(() => {
        // 재생 실패 시 무시 (브라우저 정책 등)
      })
    } catch {
      // 효과음 재생 실패 시 무시
    }
  }, [volume])

  return playClickSound
}

export default useClickSound
