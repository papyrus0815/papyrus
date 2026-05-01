import type { ReactNode } from 'react'

import * as S from '../country-detail-dashboard.styles'
import { Sparkline, type SparkAccent } from './sparkline'

export interface ClickableStatCardProps {
  accent: SparkAccent
  label: string
  unit: string
  value: number
  delta: number
  isLoading: boolean
  icon: ReactNode
  onClick: (() => void) | null
  /** 비활성 카드 우상단 캡션 */
  badge?: string
  /** 12 길이 monthly count */
  sparkline?: number[]
  /** sparkline sr-only용 카테고리 라벨 */
  sparklineSrLabel?: string
}

export function ClickableStatCard({
  accent,
  label,
  unit,
  value,
  delta,
  isLoading,
  icon,
  onClick,
  badge,
  sparkline,
  sparklineSrLabel,
}: ClickableStatCardProps) {
  const interactive = onClick != null
  const card = (
    <S.StatCard
      $interactive={interactive}
      $dim={!interactive && !!badge}
      $accent={accent}
    >
      <S.StatHeader>
        <S.StatLabelRow>
          <S.StatIcon $accent={accent}>{icon}</S.StatIcon>
          <S.StatLabel>{label}</S.StatLabel>
        </S.StatLabelRow>
        {!interactive && badge ? <S.StatBadge>{badge}</S.StatBadge> : null}
      </S.StatHeader>
      <S.StatValueRow>
        <S.StatValue>
          {isLoading ? '—' : value.toLocaleString('ko-KR')}
          <S.StatUnit>{unit}</S.StatUnit>
        </S.StatValue>
        {!isLoading && delta > 0 && (
          <S.DeltaChip
            $accent={accent}
            aria-label={`최근 7일 ${delta}건 추가`}
          >
            +{delta}
          </S.DeltaChip>
        )}
      </S.StatValueRow>
      {sparkline && sparkline.length > 0 && (
        <Sparkline
          values={sparkline}
          accent={accent}
          srLabel={sparklineSrLabel ?? label}
        />
      )}
    </S.StatCard>
  )
  if (!interactive) return card
  return (
    <S.StatCardButton
      type="button"
      onClick={onClick!}
      aria-label={`${label} 탭으로 이동`}
    >
      {card}
    </S.StatCardButton>
  )
}
