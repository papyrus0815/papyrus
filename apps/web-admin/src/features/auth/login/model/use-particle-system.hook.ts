import { useState, useEffect } from 'react'

// 반응형 설정
const RESPONSIVE_SETTINGS = {
  BREAKPOINTS: {
    MOBILE: 640,
    TABLET: 768,
    DESKTOP: 1024,
    DESKTOP_LARGE: 1280,
  },
  PARTICLE_COUNT: {
    MOBILE: 20,
    TABLET: 30,
    DESKTOP: 40,
    DESKTOP_LARGE: 50,
  },
} as const

// 애니메이션 설정
const ANIMATION_SETTINGS = {
  RESIZE_THROTTLE_DELAY: 300,
} as const

export interface UseParticleSystemReturn {
  currentParticles: number[]
}

/**
 * 반응형 파티클 시스템을 관리하는 커스텀 훅
 * FSD: Features/Model - 로그인 기능의 파티클 상태 관리
 */
export function useParticleSystem(): UseParticleSystemReturn {
  const [currentParticles, setCurrentParticles] = useState<number[]>([])

  useEffect(() => {
    const calcParticleCount = (): number => {
      const width = window.innerWidth
      const { BREAKPOINTS, PARTICLE_COUNT } = RESPONSIVE_SETTINGS

      if (width >= BREAKPOINTS.DESKTOP_LARGE)
        return PARTICLE_COUNT.DESKTOP_LARGE
      if (width >= BREAKPOINTS.DESKTOP) return PARTICLE_COUNT.DESKTOP
      if (width >= BREAKPOINTS.TABLET) return PARTICLE_COUNT.TABLET
      return PARTICLE_COUNT.MOBILE
    }

    const updateParticles = () => {
      const count = calcParticleCount()
      setCurrentParticles(Array.from({ length: count }, (_, i) => i))
    }

    // 초기 파티클 설정
    updateParticles()

    // 리사이즈 이벤트 throttling
    let resizeTimer: NodeJS.Timeout
    const handleResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(
        updateParticles,
        ANIMATION_SETTINGS.RESIZE_THROTTLE_DELAY,
      )
    }

    window.addEventListener('resize', handleResize)

    return () => {
      clearTimeout(resizeTimer)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return {
    currentParticles,
  }
}
