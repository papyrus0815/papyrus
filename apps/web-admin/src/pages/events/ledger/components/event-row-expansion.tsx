/**
 * EventRowExpansion — 행 클릭 시 그 자리에서 펼쳐지는 정독 영역.
 *
 * 보여주는 것:
 *  - 본문 요약 (description)
 *  - 위치 + 키워드
 *  - 참여 국가 (역할 배지)
 *  - 자식 사건 미니 트리 (1단계, 더 깊으면 상세 페이지로)
 *  - 액션: 상세 페이지로 이동
 */
import React from 'react'

import { FiArrowRight, FiExternalLink, FiMapPin, FiTag } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'

import { parseIsoDateParts } from '@/shared/lib/iso-date'
import { pathKeys } from '@/shared/router'
import { usePrefetchEventDetail } from '@/pages/events/detail/use-event-detail'

import {
  DIGIT_DISPLAY,
  MOTION,
  durationInDays,
  fontTier,
  formatDuration,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentHover,
  ledgerAccentSubtle,
  ledgerExpandedFill,
  ledgerHairline,
  ledgerHoverFill,
  ledgerSubtleFill,
  ledgerSurface,
  resolveCategory,
} from '../styles/ledger-tokens'
import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '@/entities/event/model'

interface Props {
  event: HistoricalEvent
  onSelectChild: (id: string) => void
}

const KEYWORD_LIMIT = 5
const CHILD_LIMIT = 8

const startYear = (start?: string | null): number | null => {
  if (!start) return null
  return parseIsoDateParts(start)?.year ?? null
}

export const EventRowExpansion: React.FC<Props> = ({ event, onSelectChild }) => {
  const navigate = useNavigate()
  const prefetchEvent = usePrefetchEventDetail()
  const category = resolveCategory(event.category)
  const countries = [
    ...(event.relatedHistoricalCountries ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      flagEmoji: undefined as string | undefined,
    })),
    ...(event.relatedCountries ?? []),
  ]
  const allChildren: EventHierarchyNode[] = event.hierarchy?.children ?? []
  const visibleChildren = allChildren.slice(0, CHILD_LIMIT)
  const overflowChildren = Math.max(0, allChildren.length - visibleChildren.length)
  const goDetail = () =>
    navigate(pathKeys.events.detail(event.id), { viewTransition: true })

  return (
    <Wrap $color={category.color}>
      <Inner>
        {event.description && <Desc>{event.description}</Desc>}

        <MetaRow>
          {event.location && (
            <MetaItem>
              <FiMapPin size={11} />
              <span>{event.location}</span>
            </MetaItem>
          )}
          {(event.keywords?.length ?? 0) > 0 && (
            <MetaItem>
              <FiTag size={11} />
              <KeywordList>
                {(event.keywords ?? []).slice(0, KEYWORD_LIMIT).map((keyword, idx) => (
                  <Keyword key={`${keyword}-${idx}`}>{keyword}</Keyword>
                ))}
                {(event.keywords?.length ?? 0) > KEYWORD_LIMIT && (
                  <Keyword>+{(event.keywords?.length ?? 0) - KEYWORD_LIMIT}</Keyword>
                )}
              </KeywordList>
            </MetaItem>
          )}
        </MetaRow>

        {countries.length > 0 && (
          <Section>
            <SectionTitle>참여 국가 ({countries.length})</SectionTitle>
            <CountryGrid>
              {countries.map((item) => (
                <CountryPill key={item.id}>
                  {item.flagEmoji && <span aria-hidden="true">{item.flagEmoji}</span>}
                  <span>{item.name}</span>
                </CountryPill>
              ))}
            </CountryGrid>
          </Section>
        )}

        {allChildren.length > 0 && (
          <Section>
            <SectionTitle>자식 사건 ({allChildren.length})</SectionTitle>
            <ChildList>
              {visibleChildren.map((child) => (
                <ChildRow
                  key={child.id}
                  type="button"
                  onClick={(evt) => {
                    evt.stopPropagation()
                    onSelectChild(child.id)
                  }}
                >
                  <ChildYear>{startYear(child.period?.start) ?? '—'}</ChildYear>
                  <ChildTitle>{child.title}</ChildTitle>
                  <ChildDuration>
                    {formatDuration(
                      durationInDays(child.period?.start, child.period?.end ?? null),
                    )}
                  </ChildDuration>
                  <FiArrowRight size={12} />
                </ChildRow>
              ))}
              {overflowChildren > 0 && (
                <ChildMore
                  type="button"
                  onClick={(evt) => {
                    evt.stopPropagation()
                    goDetail()
                  }}
                >
                  +{overflowChildren}건 더 — 상세에서 전체 보기
                </ChildMore>
              )}
            </ChildList>
          </Section>
        )}

        <Actions>
          <DetailBtn
            type="button"
            onMouseEnter={() => prefetchEvent(event.id)}
            onFocus={() => prefetchEvent(event.id)}
            onClick={(evt) => {
              evt.stopPropagation()
              goDetail()
            }}
          >
            <FiExternalLink size={12} />
            <span>상세 페이지</span>
          </DetailBtn>
        </Actions>
      </Inner>
    </Wrap>
  )
}

/* 확장 영역 등장 모션 — opacity 페이드 + 미세 slideDown(translateY).
 * max-height 전환은 가상 스크롤 row 높이 계산과 충돌하므로 사용하지 않음. */
const expandFadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

const Wrap = styled.div<{ $color: string }>`
  position: relative;
  background: ${({ theme }) => ledgerExpandedFill(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-left: 3px solid ${({ $color }) => $color};
  animation: ${expandFadeIn} ${MOTION.normal} ease-out;
`

const Inner = styled.div`
  padding: 16px 20px 16px 36px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (max-width: 720px) {
    padding: 12px 16px 16px 20px;
  }
`

const Desc = styled.p`
  margin: 0;
  ${fontTier('TITLE')}
  font-weight: 500;
  line-height: 1.65;
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 880px;
`

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  align-items: center;
`

const MetaItem = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  ${fontTier('LABEL')}
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const KeywordList = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-wrap: wrap;
`

const Keyword = styled.span`
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 8px;
  border-radius: 3px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  ${fontTier('META')}
`

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const SectionTitle = styled.h4`
  margin: 0;
  ${fontTier('META')}
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CountryGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`

const CountryPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 10px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  ${fontTier('LABEL')}
`

const ChildList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 720px;
`

const ChildRow = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  color: ${({ theme }) => theme.colors.text.secondary};
  transition: background 0.12s;

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const ChildYear = styled.span`
  ${DIGIT_DISPLAY}
  width: 44px;
  ${fontTier('LABEL')}
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ChildTitle = styled.span`
  flex: 1;
  ${fontTier('BODY')}
`

const ChildDuration = styled.span`
  ${DIGIT_DISPLAY}
  ${fontTier('META')}
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ChildMore = styled.button`
  margin-top: 2px;
  padding: 6px 10px;
  border: 1px dashed ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: transparent;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  border-radius: 6px;
  ${fontTier('LABEL')}
  cursor: pointer;
  text-align: left;
  transition: background 0.12s, border-color 0.12s, color 0.12s;

  &:hover {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
    border-color: ${({ theme }) => ledgerAccentHover(theme.mode)};
    color: ${({ theme }) => ledgerAccentHover(theme.mode)};
  }
`

const Actions = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 4px;
`

const DetailBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 12px;
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  border-radius: 6px;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  ${fontTier('LABEL')}
  cursor: pointer;
  transition: background 0.12s, color 0.12s;

  &:hover {
    color: ${({ theme }) => ledgerAccentHover(theme.mode)};
    filter: brightness(0.95);
  }
`
