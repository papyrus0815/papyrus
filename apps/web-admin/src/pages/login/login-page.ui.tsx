import React, { useEffect, useRef, useState } from 'react'

import { motion } from 'framer-motion'
import { FiVolume2, FiVolumeX } from 'react-icons/fi'

import {
  LoginFormFeature,
  ParticleSystem,
  WelcomeSection,
  useErrorHandler,
} from '@/features/auth/login'
import { ErrorModal } from '@/features/auth/login/ui/error-modal'
import loginBgm from '@/shared/assets/sound/login bgm.mp3'
import { useBackgroundStore } from '@/shared/store/background.store'

import * as S from './login-page.styles'

/**
 * 로그인 페이지
 * FSD: Pages 레이어 - 라우팅과 레이아웃만 담당
 * 장식 요소, 전역 모달 등을 배치
 * (배경은 전역 App에서 관리)
 */
export default function LoginPage() {
  const { errorMessage, isErrorModalOpen, showError, closeError } =
    useErrorHandler()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [volume, setVolume] = useState(0.1)
  const [isMuted, setIsMuted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const setBackgroundEnabled = useBackgroundStore((state) => state.setEnabled)

  const handleLoginError = (error: string) => {
    showError(error)
  }

  // 오디오 재생 함수
  const playAudio = async () => {
    if (!audioRef.current) return

    try {
      await audioRef.current.play()
      setIsPlaying(true)
    } catch {
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
        // 음소거 해제: 이전 볼륨 값으로 복원 (없으면 0.1)
        const restoreVolume = volume > 0 ? volume : 0.05
        audioRef.current.volume = restoreVolume
        setVolume(restoreVolume)
        setIsMuted(false)
        // 재생 중이 아니면 재생 시도
        if (audioRef.current.paused) {
          await playAudio()
        }
      } else {
        // 음소거: 볼륨만 0으로 설정 (volume state는 유지)
        audioRef.current.volume = 0
        setIsMuted(true)
      }
    }
  }

  // BGM 초기화 및 재생
  useEffect(() => {
    // 오디오 객체 생성
    const audio = new Audio(loginBgm)
    audio.loop = true
    audio.volume = volume
    audio.preload = 'auto'

    // 오디오 로드 완료 이벤트
    audio.addEventListener('loadeddata', () => {
      audioRef.current = audio
    })

    audio.addEventListener('error', () => {})

    // 오디오 재생 이벤트
    audio.addEventListener('play', () => {
      setIsPlaying(true)
    })

    // 오디오 일시정지 이벤트
    audio.addEventListener('pause', () => {
      setIsPlaying(false)
    })

    audioRef.current = audio

    // 사용자 상호작용 감지 (클릭, 키보드, 터치 등)
    const handleUserInteraction = async () => {
      if (audioRef.current && audioRef.current.paused) {
        await playAudio()
      }
    }

    // 다양한 이벤트로 재생 시도
    document.addEventListener('click', handleUserInteraction, { once: true })
    document.addEventListener('keydown', handleUserInteraction, { once: true })
    document.addEventListener('touchstart', handleUserInteraction, {
      once: true,
    })

    // 페이지 로드 시 재생 시도 (실패할 수 있음)
    playAudio().catch(() => {})

    // 컴포넌트 언마운트 시 정리
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        audioRef.current.src = ''
        audioRef.current = null
      }
      document.removeEventListener('click', handleUserInteraction)
      document.removeEventListener('keydown', handleUserInteraction)
      document.removeEventListener('touchstart', handleUserInteraction)
    }
  }, [])

  useEffect(() => {
    setBackgroundEnabled(true)
    return () => setBackgroundEnabled(false)
  }, [setBackgroundEnabled])

  // 볼륨 변경 시 오디오 볼륨 업데이트
  useEffect(() => {
    if (audioRef.current && !isMuted) {
      audioRef.current.volume = volume
    }
  }, [volume, isMuted])

  return (
    <S.LoginContainer>
      {/* 파티클 시스템 */}
      <ParticleSystem />

      {/* 사운드 컨트롤러 */}
      <S.SoundController>
        <S.SoundButton onClick={handleMuteToggle} type="button">
          {isMuted ? <FiVolumeX size={20} /> : <FiVolume2 size={20} />}
        </S.SoundButton>
        <S.VolumeSlider
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
        />
      </S.SoundController>

      {/* 에러 모달 */}
      <ErrorModal
        isOpen={isErrorModalOpen}
        error={errorMessage}
        onClose={closeError}
      />

      <S.ContentContainer>
        <S.LoginPanel
          as={motion.div}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {/* 환영 섹션 */}
          <WelcomeSection />

          {/* 로그인 폼 (Features) */}
          <LoginFormFeature onError={handleLoginError} />
        </S.LoginPanel>
      </S.ContentContainer>
    </S.LoginContainer>
  )
}
