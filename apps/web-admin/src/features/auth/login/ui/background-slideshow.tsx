import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useBackgroundSlideshow } from '../model/use-background-slideshow.hook'
import * as S from './background-slideshow.styles'

interface BackgroundSlideshowProps {
  onLoaded?: () => void
}

/**
 * 배경 슬라이드쇼 컴포넌트 (로딩 후 페이드인)
 */
export const BackgroundSlideshow: React.FC<BackgroundSlideshowProps> =
  React.memo(({ onLoaded }) => {
    const { bgIndex, backgroundImages } = useBackgroundSlideshow()
    const [imagesLoaded, setImagesLoaded] = useState(false)

    // 첫 이미지만 프리로드 (나머지는 백그라운드에서)
    useEffect(() => {
      const firstImage = new Image()
      firstImage.onload = () => {
        setImagesLoaded(true)
        onLoaded?.()
      }
      firstImage.onerror = () => {
        setImagesLoaded(true)
        onLoaded?.()
      }
      firstImage.src = backgroundImages[0]

      // 나머지 이미지는 백그라운드에서 로드
      backgroundImages.slice(1).forEach((src) => {
        const img = new Image()
        img.src = src
      })
    }, [backgroundImages, onLoaded])

    return (
      <S.BackgroundContainer>
        {backgroundImages.map((image, index) => (
          <motion.div
            key={index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundImage: `url(${image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              zIndex: 1,
              filter: 'saturate(0.9) contrast(1.02)',
            }}
            initial={{ opacity: 0 }}
            animate={{
              opacity: imagesLoaded && index === bgIndex ? 1 : 0,
            }}
            transition={{
              duration: 1.5,
              ease: 'easeOut',
            }}
          />
        ))}
      </S.BackgroundContainer>
    )
  })

BackgroundSlideshow.displayName = 'BackgroundSlideshow'
