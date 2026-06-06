import React, { useMemo } from 'react'

import * as S from './welcome-section.styles'

/** 환경변수 미설정 시 사용할 기본 앱 표시명 */
const DEFAULT_APP_TITLE = 'PAPYRUS'
const APP_TITLE = import.meta.env.VITE_APP_TITLE?.trim() || DEFAULT_APP_TITLE

/**
 * 환영 섹션 컴포넌트
 * FSD: Features/UI - 로그인 기능의 환영 메시지 UI
 */
export const WelcomeSection: React.FC = React.memo(() => {
  const welcomeTitle = useMemo(
    () => (
      <span
        style={{
          background:
            'linear-gradient(90deg, #7c6cff 0%, #48bb78 50%, #ed8936 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        {APP_TITLE}
      </span>
    ),
    [],
  )

  return (
    <S.WelcomeContainer>
      <S.WelcomeTitle>{welcomeTitle}</S.WelcomeTitle>
      <S.WelcomeSubtitle>
        관리 콘솔에 로그인하여
        <br />
        강력한 도구들을 사용해보세요
      </S.WelcomeSubtitle>
    </S.WelcomeContainer>
  )
})

WelcomeSection.displayName = 'WelcomeSection'
