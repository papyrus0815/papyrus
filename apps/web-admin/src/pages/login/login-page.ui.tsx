import { useEffect } from 'react'

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
import { useBgm } from '@/shared/hooks/use-bgm.hook'
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
  const setBackgroundEnabled = useBackgroundStore((state) => state.setEnabled)

  // BGM 재생/볼륨/음소거는 공유 훅으로 위임 (대시보드 등과 동일 구현 재사용)
  const { volume, isMuted, handleVolumeChange, handleMuteToggle } = useBgm({
    src: loginBgm,
    initialVolume: 0.1,
  })

  const handleLoginError = (error: string) => {
    showError(error)
  }

  useEffect(() => {
    setBackgroundEnabled(true)
    return () => setBackgroundEnabled(false)
  }, [setBackgroundEnabled])

  return (
    <S.LoginContainer>
      {/* 파티클 시스템 */}
      <ParticleSystem />

      {/* 사운드 컨트롤러 */}
      <S.SoundController>
        <S.SoundButton
          onClick={handleMuteToggle}
          type="button"
          aria-label={isMuted ? '소리 켜기' : '소리 끄기'}
          aria-pressed={isMuted}
        >
          {isMuted ? <FiVolumeX size={20} /> : <FiVolume2 size={20} />}
        </S.SoundButton>
        <S.VolumeSlider
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          aria-label="배경음악 볼륨"
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
