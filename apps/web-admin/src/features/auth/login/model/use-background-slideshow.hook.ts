import { useState, useEffect } from 'react'
import { useReducedMotion } from 'framer-motion'
import {
  BACKGROUND_IMAGES,
  BACKGROUND_CHANGE_INTERVAL,
} from '@/shared/constants/background-images'

export interface UseBackgroundSlideshowReturn {
  bgIndex: number
  backgroundImages: readonly string[]
}

/**
 * 배경 슬라이드쇼를 관리하는 커스텀 훅
 * FSD: Features/Model - 로그인 기능의 배경 상태 관리
 */
export function useBackgroundSlideshow(): UseBackgroundSlideshowReturn {
  const prefersReducedMotion = useReducedMotion()

  const [bgIndex, setBgIndex] = useState(() =>
    Math.floor(Math.random() * BACKGROUND_IMAGES.length),
  )

  // 배경 이미지 프리로드
  useEffect(() => {
    const preloadImages = BACKGROUND_IMAGES.slice(bgIndex, bgIndex + 2)
    preloadImages.forEach((src) => {
      const img = new Image()
      img.src = src
    })
  }, [bgIndex])

  // 배경 이미지 자동 변경
  useEffect(() => {
    if (prefersReducedMotion) return

    const timer = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length)
    }, BACKGROUND_CHANGE_INTERVAL)

    return () => clearInterval(timer)
  }, [prefersReducedMotion])

  return {
    bgIndex,
    backgroundImages: BACKGROUND_IMAGES,
  }
}
