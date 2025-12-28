import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useParticleSystem } from '../model/use-particle-system.hook'
import * as S from './particle-system.styles'

/**
 * 파티클 시스템 컴포넌트
 * FSD: Features/UI - 로그인 기능의 파티클 애니메이션 UI
 */
export const ParticleSystem: React.FC = React.memo(() => {
  const prefersReducedMotion = useReducedMotion()
  const { currentParticles } = useParticleSystem()

  if (prefersReducedMotion) {
    return null
  }

  return (
    <S.ParticleContainer>
      {currentParticles.map((particle) => (
        <motion.div
          key={particle}
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '50%',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: 0.3,
          }}
          animate={{
            y: [-20, -40],
            opacity: [0.3, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            delay: particle * 0.5,
          }}
        />
      ))}
    </S.ParticleContainer>
  )
})

ParticleSystem.displayName = 'ParticleSystem'
