/**
 * 앱 공통 빈 상태 UI — 스타일은 `empty-state.styles`.
 */
import type { ReactNode } from 'react'

import * as S from './empty-state.styles'

export function EmptyStateFill({ children }: { children: ReactNode }) {
  return <S.FillRoot>{children}</S.FillRoot>
}

export type EmptyStateSimpleProps = {
  border?: 'dashed' | 'solid' | 'none'
  children: ReactNode
}

export function EmptyStateSimple({
  border = 'dashed',
  children,
}: EmptyStateSimpleProps) {
  return <S.SimpleBox $border={border}>{children}</S.SimpleBox>
}

export type EmptyStateFeatureCardProps = {
  icon: ReactNode
  title: string
  description: string
  primaryAction: {
    label: ReactNode
    onClick: () => void
    icon?: ReactNode
  }
  cardBorder?: boolean
  /** true면 카드·버튼 그림자 제거(행정기구 등) */
  flat?: boolean
}

export function EmptyStateFeatureCard({
  icon,
  title,
  description,
  primaryAction,
  cardBorder = true,
  flat = false,
}: EmptyStateFeatureCardProps) {
  return (
    <S.FeatureCardWrap>
      <S.FeatureCardInner $cardBorder={cardBorder} $flat={flat}>
        <S.FeatureCardIconWrap>{icon}</S.FeatureCardIconWrap>
        <S.FeatureCardTitle>{title}</S.FeatureCardTitle>
        <S.FeatureCardDesc>{description}</S.FeatureCardDesc>
        <S.PrimaryButton
          type="button"
          onClick={primaryAction.onClick}
          $flat={flat}
        >
          {primaryAction.icon}
          {primaryAction.label}
        </S.PrimaryButton>
      </S.FeatureCardInner>
    </S.FeatureCardWrap>
  )
}

export type EmptyStateSpotlightProps = {
  icon: ReactNode
  title: string
  description?: ReactNode
  extra?: ReactNode
  fill?: boolean
  /** true면 아이콘·주 버튼 그림자 제거(행정기구 등) */
  flat?: boolean
  primaryAction?: {
    label: ReactNode
    onClick: () => void
    icon?: ReactNode
  }
  secondaryAction?: {
    label: ReactNode
    onClick: () => void
    icon?: ReactNode
    tone?: 'primary' | 'secondary'
  }
  actions?: ReactNode
}

export function EmptyStateSpotlight({
  icon,
  title,
  description,
  extra,
  primaryAction,
  secondaryAction,
  actions,
  fill = true,
  flat = false,
}: EmptyStateSpotlightProps) {
  return (
    <S.SpotlightRoot $fill={fill}>
      <S.SpotlightIconWrap $flat={flat} aria-hidden>
        {icon}
      </S.SpotlightIconWrap>
      <S.SpotlightTextBlock>
        <S.SpotlightTitle>{title}</S.SpotlightTitle>
        {description != null && description !== '' ? (
          <S.SpotlightDesc>{description}</S.SpotlightDesc>
        ) : null}
        {extra}
      </S.SpotlightTextBlock>
      {actions !== undefined ? (
        actions
      ) : (primaryAction ?? secondaryAction) ? (
        <S.SpotlightActionsRow>
          {primaryAction ? (
            <S.PrimaryButton
              type="button"
              onClick={primaryAction.onClick}
              $flat={flat}
            >
              {primaryAction.icon}
              {primaryAction.label}
            </S.PrimaryButton>
          ) : null}
          {secondaryAction ? (
            secondaryAction.tone === 'primary' ? (
              <S.PrimaryButton
                type="button"
                onClick={secondaryAction.onClick}
                $flat={flat}
              >
                {secondaryAction.icon}
                {secondaryAction.label}
              </S.PrimaryButton>
            ) : (
              <S.SecondaryButton
                type="button"
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.icon}
                {secondaryAction.label}
              </S.SecondaryButton>
            )
          ) : null}
        </S.SpotlightActionsRow>
      ) : null}
    </S.SpotlightRoot>
  )
}
