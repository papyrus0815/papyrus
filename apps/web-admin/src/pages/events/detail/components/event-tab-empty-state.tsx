import { type DragEventHandler, Fragment } from 'react'
import { type IconType } from 'react-icons'
import { FiPlus } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import {
  ledgerAccent,
  ledgerAccentHover,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairlineStrong,
  ledgerSubtleFill,
  MOTION,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'

export interface EventEmptyAction {
  label: string
  onClick: () => void
  Icon?: IconType
  disabled?: boolean
}

export interface EventEmptyFeature {
  Icon: IconType
  title: string
  description: string
}

export interface EventEmptyQuietLink {
  label: string
  onClick: () => void
}

interface EventTabEmptyStateProps {
  id?: string
  Icon: IconType
  title: string
  description: string
  primaryAction?: EventEmptyAction
  secondaryAction?: EventEmptyAction
  /** 주·보조 버튼 외 보조 진입 경로 — 버튼 테두리 없이 조용한 텍스트 링크로 표시 */
  quietLinks?: EventEmptyQuietLink[]
  features?: EventEmptyFeature[]
  dragActive?: boolean
  onDragOver?: DragEventHandler<HTMLDivElement>
  onDragLeave?: DragEventHandler<HTMLDivElement>
  onDrop?: DragEventHandler<HTMLDivElement>
  ariaLabel?: string
}

/**
 * 사건 상세 빈 탭 표준 화면(Empty State) — 국가 상세(CountryTabEmptyState)와 동일한 문법.
 *
 * 데이터가 하나도 없는 탭에서 여러 빈 하위 섹션·가로 구분선·버튼 뭉치를 한꺼번에 늘어놓지 않고,
 * 가운데 아이콘 · '아직 … 없습니다' 제목 · 한두 줄 설명 · 대표 시작 버튼 1개(+ 필요 시 보조 버튼 1개)만 두어
 * 한눈에 '데이터가 비어 있는 화면'임을 인지하고 클릭 한 번으로 바로 작성·연결을 시작하게 한다.
 * 하단에는 기록 시 채워지는 항목을 테두리·버튼 없는 아이콘 안내 목록으로 조용히 보여준다.
 */
export function EventTabEmptyState({
  id,
  Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  quietLinks,
  features,
  dragActive = false,
  onDragOver,
  onDragLeave,
  onDrop,
  ariaLabel,
}: EventTabEmptyStateProps) {
  const PrimaryIcon = primaryAction?.Icon ?? FiPlus
  const SecondaryIcon = secondaryAction?.Icon

  return (
    <EmptyRoot
      id={id}
      role={ariaLabel ? 'region' : undefined}
      aria-label={ariaLabel}
      $droppable={Boolean(onDrop)}
      $dragActive={dragActive}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <EmptyHero>
        <EmptyIconCircle aria-hidden>
          <Icon size={24} />
        </EmptyIconCircle>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDesc>{description}</EmptyDesc>
        {(primaryAction || secondaryAction) && (
          <EmptyActions>
            {primaryAction && (
              <PrimaryBtn
                type="button"
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
              >
                <PrimaryIcon size={14} aria-hidden />
                {primaryAction.label}
              </PrimaryBtn>
            )}
            {secondaryAction && (
              <SecondaryBtn
                type="button"
                onClick={secondaryAction.onClick}
                disabled={secondaryAction.disabled}
              >
                {SecondaryIcon && <SecondaryIcon size={14} aria-hidden />}
                {secondaryAction.label}
              </SecondaryBtn>
            )}
          </EmptyActions>
        )}
        {quietLinks && quietLinks.length > 0 && (
          <QuietLinkRow>
            {quietLinks.map((item, itemIndex) => (
              <Fragment key={item.label}>
                {itemIndex > 0 && <QuietDot aria-hidden>·</QuietDot>}
                <QuietLinkBtn type="button" onClick={item.onClick}>
                  {item.label}
                </QuietLinkBtn>
              </Fragment>
            ))}
          </QuietLinkRow>
        )}
      </EmptyHero>

      {features && features.length > 0 && (
        <FeatureList aria-label="기록 시 구성되는 내용">
          {features.map((feature) => {
            const FeatureIcon = feature.Icon
            return (
              <FeatureItem key={feature.title}>
                <FeatureIconBox aria-hidden>
                  <FeatureIcon size={15} />
                </FeatureIconBox>
                <FeatureCopy>
                  <strong>{feature.title}</strong>
                  <span>{feature.description}</span>
                </FeatureCopy>
              </FeatureItem>
            )
          })}
        </FeatureList>
      )}
    </EmptyRoot>
  )
}

const EmptyRoot = styled.div<{ $droppable: boolean; $dragActive: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 44px;
  width: 100%;
  padding: 64px 24px 56px;
  border-radius: ${RADIUS.MD};
  border: 1.5px dashed transparent;
  transition:
    border-color ${MOTION.fast} ease,
    background ${MOTION.fast} ease;

  ${({ $droppable, $dragActive, theme }) =>
    $droppable &&
    $dragActive &&
    css`
      border-color: ${ledgerAccent(theme.mode)};
      background: ${ledgerAccentSubtle(theme.mode)};
    `}

  @media (max-width: 640px) {
    padding: 44px 16px 36px;
    gap: 32px;
  }
`

const EmptyHero = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 500px;
`

const EmptyIconCircle = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const EmptyTitle = styled.h2`
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: -0.015em;
  word-break: keep-all;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EmptyDesc = styled.p`
  margin: 0;
  font-size: 13.5px;
  line-height: 1.65;
  word-break: keep-all;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EmptyActions = styled.div`
  margin-top: 22px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
`

const PrimaryBtn = styled.button`
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  border: 1px solid transparent;
  border-radius: ${RADIUS.SM};
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  color: ${({ theme }) => (theme.mode === 'dark' ? ledgerBackground('dark') : '#ffffff')};
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
  cursor: pointer;
  transition: background ${MOTION.fast} ease, opacity ${MOTION.fast} ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => ledgerAccentHover(theme.mode)};
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

const SecondaryBtn = styled.button`
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.SM};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition:
    border-color ${MOTION.fast} ease,
    color ${MOTION.fast} ease,
    background ${MOTION.fast} ease;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

const QuietLinkRow = styled.div`
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px;
`

const QuietDot = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const QuietLinkBtn = styled.button`
  appearance: none;
  border: none;
  background: none;
  padding: 2px 4px;
  border-radius: ${RADIUS.XS};
  font: inherit;
  font-size: 12.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  transition: color ${MOTION.fast} ease;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

const FeatureList = styled.ul`
  width: 100%;
  max-width: 720px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px 32px;

  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
`

const FeatureItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
`

const FeatureIconBox = styled.span`
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  margin-top: 1px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const FeatureCopy = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;

  strong {
    font-size: 13px;
    font-weight: 650;
    line-height: 1.4;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  span {
    font-size: 12.5px;
    line-height: 1.55;
    word-break: keep-all;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`
