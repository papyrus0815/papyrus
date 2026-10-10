/**
 * 개요 탭 보강 — 설립 배경 · 관련 사건 · 최근 연혁.
 *
 * 개요 탭은 소개 한 단락뿐이라 다른 탭을 열어 봐야 이 기업이 '무슨 일을 겪었는지' 알 수 있었다.
 * - 설립 배경: 누가·왜·어떤 시대 조건에서 세웠는가(소개와 별개 서술, company.founding_background).
 *   '이 사건으로 설립됨'(FOUNDED)으로 걸린 사건이 있으면 그 사건을 바로 잇는다.
 * - 관련 사건: 사건 쪽에서 이 기업을 걸어 둔 기록(EventOrganizationRelation)의 역방향.
 *   예전엔 사건 상세에서만 보였고 기업에서는 닿을 길이 없었다.
 * - 최근 연혁: 사업 탭의 연혁 중 최신 3건 — 탭을 열지 않고도 근황을 본다.
 */
import { useMemo } from 'react'

import { FiArrowRight, FiFlag } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import type {
  CompanyEventRole,
  CompanyHistoryItem,
  CompanyRelatedEvent,
} from '@/shared/api/company'
import { dateSortKey, formatDateWithPrecision } from '@/shared/lib/iso-date'
import { isVisuallyEmptyRichText } from '@/shared/lib/rich-text-read-view'
import { pathKeys } from '@/shared/router'
import { InlineRichText } from '@/shared/ui/inline-edit'

import * as S from './company-detail.styles'
import { HISTORY_TYPE_LABELS } from './company-history-section'

const ROLE_META: Record<CompanyEventRole, { label: string; tone: string }> = {
  FOUNDED: { label: '설립', tone: '#16a34a' },
  PRINCIPAL: { label: '주체', tone: '#2563eb' },
  ACQUIRER: { label: '인수', tone: '#7c3aed' },
  ACQUIRED: { label: '피인수', tone: '#9333ea' },
  PARTICIPANT: { label: '참여', tone: '#0891b2' },
  CONTRACTOR: { label: '시공', tone: '#0d9488' },
  BENEFICIARY: { label: '수혜', tone: '#65a30d' },
  VICTIM: { label: '피해', tone: '#dc2626' },
  DISSOLVED: { label: '해산', tone: '#64748b' },
  OTHER: { label: '기타', tone: '#64748b' },
}

/** 부호 연도·월·일 → '1989년 8월 8일' / '기원전 44년' */
export function relatedEventDateLabel(event: CompanyRelatedEvent): string | null {
  if (event.startYear == null) return null
  const year =
    event.startYear < 0 ? `기원전 ${-event.startYear}년` : `${event.startYear}년`
  if (event.startMonth == null) return year
  if (event.startDay == null) return `${year} ${event.startMonth}월`
  return `${year} ${event.startMonth}월 ${event.startDay}일`
}

/* ───────────────────────── 설립 배경 ───────────────────────── */

interface FoundingProps {
  value: string | null
  onSave: (next: string | null) => void
  onPersonClick: (personId: string) => void
  /** FOUNDED 역할로 걸린 사건 */
  foundingEvents: CompanyRelatedEvent[]
}

export function CompanyFoundingSection({
  value,
  onSave,
  onPersonClick,
  foundingEvents,
}: FoundingProps) {
  return (
    <S.Section id="company-founding">
      <S.SectionHeader>
        <S.SectionTitle>설립 배경</S.SectionTitle>
      </S.SectionHeader>
      {foundingEvents.length > 0 && (
        <FoundingEvents aria-label="설립 사건">
          {foundingEvents.map((event) => (
            <FoundingEventLink
              key={event.relationId}
              to={pathKeys.events.detail(event.eventId)}
            >
              <FiFlag aria-hidden />
              <span>
                <FoundingEventKicker>설립 사건</FoundingEventKicker>
                <FoundingEventTitle>{event.title}</FoundingEventTitle>
              </span>
              {relatedEventDateLabel(event) && (
                <FoundingEventDate>{relatedEventDateLabel(event)}</FoundingEventDate>
              )}
              <FiArrowRight aria-hidden className="arrow" />
            </FoundingEventLink>
          ))}
        </FoundingEvents>
      )}
      <S.SectionBody>
        <InlineRichText
          value={value ?? ''}
          onSave={(next) => onSave(isVisuallyEmptyRichText(next) ? null : next)}
          placeholder="누가·왜·어떤 시대 조건에서 세웠는지 적어 보세요 — 창업자의 동기, 당시 시장·정책, 모태가 된 조직 등. 인물·사건을 인라인으로 링크할 수 있습니다."
          onPersonClick={onPersonClick}
          label="설립 배경"
        />
      </S.SectionBody>
    </S.Section>
  )
}

/* ───────────────────────── 관련 사건 ───────────────────────── */

interface RelatedEventsProps {
  events: CompanyRelatedEvent[] | undefined
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

export function CompanyRelatedEventsSection({
  events,
  isLoading,
  isError,
  onRetry,
}: RelatedEventsProps) {
  return (
    <S.Section id="company-related-events">
      <S.SectionHeader>
        <S.SectionTitle>관련 사건</S.SectionTitle>
        {events && events.length > 0 && (
          <S.SectionSubtitle>{events.length}건</S.SectionSubtitle>
        )}
      </S.SectionHeader>
      {isLoading ? (
        <S.HelperText>사건을 불러오는 중…</S.HelperText>
      ) : isError ? (
        <S.EmptyState>
          사건을 불러오지 못했습니다.{' '}
          <RetryButton type="button" onClick={onRetry}>
            다시 시도
          </RetryButton>
        </S.EmptyState>
      ) : !events || events.length === 0 ? (
        <S.EmptyState>
          이 기업이 등장한 사건이 없습니다. 사건 상세의 <strong>관련 조직</strong>에서 이
          기업을 연결하면 여기에 모입니다(설립·인수·참여 등 역할 포함).
        </S.EmptyState>
      ) : (
        <EventList>
          {events.map((event) => {
            const role = ROLE_META[event.role] ?? ROLE_META.OTHER
            const date = relatedEventDateLabel(event)
            return (
              <li key={event.relationId}>
                <EventRow to={pathKeys.events.detail(event.eventId)}>
                  <EventDate>{date ?? '연도 미상'}</EventDate>
                  <EventMain>
                    <EventTitle>{event.title}</EventTitle>
                    {event.roleDescription && (
                      <EventRoleNote>{event.roleDescription}</EventRoleNote>
                    )}
                  </EventMain>
                  <RoleBadge $tone={role.tone}>{role.label}</RoleBadge>
                </EventRow>
              </li>
            )
          })}
        </EventList>
      )}
    </S.Section>
  )
}

/* ───────────────────────── 최근 연혁 ───────────────────────── */

interface RecentHistoryProps {
  histories: CompanyHistoryItem[]
  onShowAll: () => void
}

const RECENT_COUNT = 3

export function CompanyRecentHistory({ histories, onShowAll }: RecentHistoryProps) {
  const recent = useMemo(
    () =>
      [...histories]
        .filter((item) => item.title.trim())
        .sort(
          (left, right) =>
            (dateSortKey(right.occurredAt) ?? Number.NEGATIVE_INFINITY) -
            (dateSortKey(left.occurredAt) ?? Number.NEGATIVE_INFINITY),
        )
        .slice(0, RECENT_COUNT),
    [histories],
  )

  if (recent.length === 0) return null

  return (
    <S.Section id="company-recent-history">
      <S.SectionHeader>
        <S.SectionTitle>최근 연혁</S.SectionTitle>
        <S.SectionActions>
          <ShowAllButton type="button" onClick={onShowAll}>
            연혁 전체 {histories.length}건 <FiArrowRight aria-hidden />
          </ShowAllButton>
        </S.SectionActions>
      </S.SectionHeader>
      <HistoryList>
        {recent.map((item) => (
          <li key={item.id}>
            <EventDate>
              {item.occurredAt
                ? formatDateWithPrecision(item.occurredAt, item.occurredAtPrecision ?? 'day')
                : '날짜 미상'}
            </EventDate>
            <EventMain>
              <EventTitle as="span">{item.title}</EventTitle>
              {/* '일반'은 분류가 없다는 뜻이라 굳이 적지 않는다 */}
              {item.type && item.type !== 'GENERAL' && (
                <EventRoleNote>{HISTORY_TYPE_LABELS[item.type]}</EventRoleNote>
              )}
            </EventMain>
          </li>
        ))}
      </HistoryList>
    </S.Section>
  )
}

/* ───────────────────────── Styled ───────────────────────── */

const FoundingEvents = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 720px;
`

const FoundingEventLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(22,163,74,0.35)' : 'rgba(22,163,74,0.28)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(22,163,74,0.08)' : 'rgba(22,163,74,0.05)'};
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  transition: border-color 0.14s, background 0.14s;

  > svg:first-child {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    color: #16a34a;
  }
  .arrow {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.tertiary};
    transition: transform 0.14s;
  }
  > span {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  &:hover {
    border-color: #16a34a;
    .arrow {
      transform: translateX(2px);
      color: #16a34a;
    }
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

const FoundingEventKicker = styled.span`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #16a34a;
`

const FoundingEventTitle = styled.span`
  font-size: 14.5px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const FoundingEventDate = styled.span`
  flex-shrink: 0;
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EventList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  max-width: 760px;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
`

const EventRow = styled(Link)`
  display: grid;
  grid-template-columns: 128px minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 4px 16px;
  padding: 11px 6px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
  color: inherit;
  text-decoration: none;
  transition: background 0.12s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)'};
  }
  &:hover h4 {
    color: ${({ theme }) => theme.colors.primary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
  }

  @media (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr) auto;
    > :first-child {
      grid-column: 1 / -1;
    }
  }
`

const EventDate = styled.span`
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`

const EventMain = styled.span`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const EventTitle = styled.h4`
  margin: 0;
  font-size: 14.5px;
  font-weight: 600;
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.text.primary};
  transition: color 0.12s;
`

const EventRoleNote = styled.span`
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const RoleBadge = styled.span<{ $tone: string }>`
  justify-self: end;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ $tone }) => `${$tone}1a`};

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ $tone }) => $tone};
  }
`

const HistoryList = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  max-width: 760px;

  li {
    display: grid;
    grid-template-columns: 128px minmax(0, 1fr);
    align-items: baseline;
    gap: 4px 16px;
    padding: 10px 6px;
    border-bottom: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
  }
  li:first-child {
    border-top: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
  }
`

const ShowAllButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
  svg {
    width: 13px;
    height: 13px;
  }
`

const RetryButton = styled.button`
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
  text-decoration: underline;
`
