import { motion } from 'framer-motion'

import * as S from './country-detail.styles'

interface KPICardProps {
  label: string
  rank: string
  value: string
  percentageChange: string
  year: string
  sparklinePoints: string
  isPositive?: boolean
  variant?: 'population' | 'gdp'
  delay?: number
  onClick?: () => void
}

/**
 * KPI 카드 UI 컴포넌트
 */
export function KPICard({
  label,
  rank,
  value,
  percentageChange,
  year,
  sparklinePoints,
  isPositive = true,
  variant = 'population',
  delay = 0,
  onClick,
}: KPICardProps) {
  // 스파크라인 그래디언트 색상
  const sparklineGradientId = `sparkline-gradient-${variant}-${Math.random()}`
  const sparklineColor = variant === 'gdp' ? '#10b981' : '#8b5cf6'
  const sparklineColorDark = variant === 'gdp' ? '#059669' : '#7c3aed'

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      whileTap={
        onClick
          ? {
              scale: 0.99,
            }
          : undefined
      }
      onClick={onClick}
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '24px',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '170px',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.borderColor = '#cbd5e1'
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.1)'
        const beforeEl = e.currentTarget.querySelector(
          '.hover-gradient',
        ) as HTMLElement
        if (beforeEl) beforeEl.style.opacity = '1'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.borderColor = '#e2e8f0'
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)'
        const beforeEl = e.currentTarget.querySelector(
          '.hover-gradient',
        ) as HTMLElement
        if (beforeEl) beforeEl.style.opacity = '0'
      }}
    >
      {/* 상단 그라데이션 라인 */}
      <div
        className="hover-gradient"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background:
            'linear-gradient(90deg, #4285f4 0%, #34a853 25%, #fbbc04 50%, #ea4335 75%, #4285f4 100%)',
          opacity: 0,
          transition: 'opacity 0.3s ease',
          zIndex: 10,
        }}
      />

      <S.PremiumCardHeader>
        <S.PremiumCardLeft>
          {/* 타이틀 + 랭킹 */}
          <S.PremiumCardLabelRow>
            <S.PremiumCardLabel>{label}</S.PremiumCardLabel>
            <S.PremiumCardRank>{rank}</S.PremiumCardRank>
          </S.PremiumCardLabelRow>

          {/* 데이터 값 */}
          <S.PremiumCardValueRow>
            <S.PremiumCardValue>{value}</S.PremiumCardValue>
          </S.PremiumCardValueRow>

          {/* 변화율 + 연도 */}
          <S.PremiumCardBottomRow>
            <S.PremiumPercentageBadge positive={isPositive}>
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path
                  d={
                    isPositive
                      ? 'M7 17L17 7M17 7H7M17 7V17'
                      : 'M7 7L17 17M17 17H7M17 17V7'
                  }
                />
              </svg>
              {percentageChange}
            </S.PremiumPercentageBadge>
            <S.PremiumCardYear>{year}</S.PremiumCardYear>
          </S.PremiumCardBottomRow>
        </S.PremiumCardLeft>

        {/* 스파크라인 */}
        <S.PremiumCardSparkline>
          <svg viewBox="0 0 100 40" preserveAspectRatio="none">
            <defs>
              <linearGradient
                id={sparklineGradientId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop
                  offset="0%"
                  stopColor={sparklineColor}
                  stopOpacity="0.6"
                />
                <stop
                  offset="50%"
                  stopColor={sparklineColorDark}
                  stopOpacity="1"
                />
                <stop
                  offset="100%"
                  stopColor={sparklineColor}
                  stopOpacity="0.6"
                />
              </linearGradient>

              {/* 글로우 효과를 위한 필터 */}
              <filter id={`glow-${variant}`}>
                <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* 배경 영역 (그래디언트 채우기) */}
            <path
              d={`M 0,40 L ${sparklinePoints} L 100,40 Z`}
              fill={`url(#${sparklineGradientId})`}
              opacity={0.08}
            />

            {/* 메인 라인 */}
            <polyline
              points={sparklinePoints}
              fill="none"
              stroke={`url(#${sparklineGradientId})`}
              opacity={0.9}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </S.PremiumCardSparkline>
      </S.PremiumCardHeader>
    </motion.div>
  )
}
