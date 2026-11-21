/**
 * 국가 상세 탭의 빈 상태 — 선 없는 한 덩어리(처음 정당·선거 탭에서 정했다, 2026-11-21).
 *
 * 예전엔 탭마다 '1. … / 2. …' 칸 표(칸마다 선)를 두어, 탭 하위 메뉴 밑선과 겹쳐 빈 화면에 선이
 * 여러 줄 그어졌고 칸 안 버튼이 하위 메뉴 버튼과 같은 일을 또 했다. 이제 가운데 아이콘·제목·설명·
 * 주 버튼 하나(+ 필요하면 보조 버튼), 그 아래 '등록하면 생기는 것'을 선 없이 아이콘 목록으로 둔다.
 * 주 버튼은 여기 하나뿐 — 목록이 비어 있을 땐 하위 메뉴의 같은 버튼을 숨긴다.
 */
import React from 'react'

import type { IconType } from 'react-icons'
import { FiPlus } from 'react-icons/fi'
import styled from 'styled-components'

export interface CountryTabEmptyFeature {
  Icon: IconType
  title: string
  description: string
}

export function CountryTabEmptyState({
  Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryAction,
  features = [],
}: {
  Icon: IconType
  title: string
  description: string
  /** 주 버튼 — 비우면 버튼 없이(등록이 다른 탭에서 일어나는 경우) */
  actionLabel?: string
  onAction?: () => void
  /** 보조 버튼 — 카탈로그·다른 지면으로 가기 */
  secondaryAction?: { label: string; onClick: () => void; Icon?: IconType }
  features?: ReadonlyArray<CountryTabEmptyFeature>
}) {
  const SecondaryIcon = secondaryAction?.Icon
  return (
    <EmptyRoot role="region" aria-label={title}>
      <EmptyHero>
        <EmptyIcon aria-hidden="true">
          <Icon size={22} strokeWidth={1.75} />
        </EmptyIcon>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
        {(actionLabel && onAction) || secondaryAction ? (
          <EmptyActions>
            {actionLabel && onAction ? (
              <EmptyAction type="button" onClick={onAction}>
                <FiPlus size={15} strokeWidth={2.25} aria-hidden="true" />
                {actionLabel}
              </EmptyAction>
            ) : null}
            {secondaryAction ? (
              <EmptySecondaryAction type="button" onClick={secondaryAction.onClick}>
                {SecondaryIcon ? <SecondaryIcon size={14} aria-hidden="true" /> : null}
                {secondaryAction.label}
              </EmptySecondaryAction>
            ) : null}
          </EmptyActions>
        ) : null}
      </EmptyHero>
      {features.length > 0 ? (
      <FeatureList aria-label="등록하면 기록할 수 있는 것">
        {features.map((feature) => {
          const FeatureIcon = feature.Icon
          return (
            <FeatureItem key={feature.title}>
              <FeatureIconBox aria-hidden="true">
                <FeatureIcon size={14} />
              </FeatureIconBox>
              <FeatureText>
                <strong>{feature.title}</strong>
                <span>{feature.description}</span>
              </FeatureText>
            </FeatureItem>
          )
        })}
      </FeatureList>
      ) : null}
    </EmptyRoot>
  )
}

const EmptyRoot = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  width: 100%;
  padding: 48px 16px 40px;
`

const EmptyHero = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  max-width: 520px;
  text-align: center;
`

const EmptyIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  margin-bottom: 6px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.16)' : 'rgba(99, 102, 241, 0.08)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : theme.colors.primary)};
`

const EmptyTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EmptyDescription = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
  word-break: keep-all;
`

const EmptyActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 10px;
`

const EmptySecondaryAction = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

const EmptyAction = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  border: none;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition:
    filter 0.15s ease,
    box-shadow 0.15s ease;

  &:hover {
    filter: brightness(1.06);
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px
      ${({ theme }) => (theme.mode === 'dark' ? 'rgba(99, 106, 242, 0.35)' : 'rgba(99, 102, 241, 0.25)')};
  }
`

const FeatureList = styled.ul`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 32px;
  width: 100%;
  max-width: 760px;
  margin: 0;
  padding: 0;
  list-style: none;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`

const FeatureItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
`

const FeatureIconBox = styled.span`
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.04)'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const FeatureText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  strong {
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  span {
    font-size: 12px;
    line-height: 1.55;
    color: ${({ theme }) => theme.colors.text.tertiary};
    word-break: keep-all;
  }
`
