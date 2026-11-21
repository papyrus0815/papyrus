/**
 * 선거·정당 탭의 빈 상태 — 선 없는 한 덩어리.
 *
 * 예전엔 머리(위·아래 선) + 2×2 칸(칸마다 선)이라, 탭 밑줄·섹션 머리 선과 겹쳐 빈 화면에 선이
 * 일곱 줄 그어졌다. 이제 가운데 아이콘·제목·설명·등록 버튼 하나, 그 아래 '등록하면 생기는 것'을
 * 선 없이 아이콘 목록으로 둔다. 등록 버튼은 여기 하나뿐 — 목록이 비어 있을 땐 머리의 같은 버튼을 숨긴다.
 */
import React from 'react'

import type { IconType } from 'react-icons'
import { FiPlus } from 'react-icons/fi'
import styled from 'styled-components'

export interface PoliticsEmptyFeature {
  Icon: IconType
  title: string
  description: string
}

export function PoliticsEmptyState({
  Icon,
  title,
  description,
  actionLabel,
  onAction,
  features,
}: {
  Icon: IconType
  title: string
  description: string
  actionLabel: string
  onAction: () => void
  features: ReadonlyArray<PoliticsEmptyFeature>
}) {
  return (
    <EmptyRoot role="region" aria-label={title}>
      <EmptyHero>
        <EmptyIcon aria-hidden="true">
          <Icon size={22} strokeWidth={1.75} />
        </EmptyIcon>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
        <EmptyAction type="button" onClick={onAction}>
          <FiPlus size={15} strokeWidth={2.25} aria-hidden="true" />
          {actionLabel}
        </EmptyAction>
      </EmptyHero>
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

const EmptyAction = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  margin-top: 10px;
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
