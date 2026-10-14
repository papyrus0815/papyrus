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
import { useMemo, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { FiArrowRight, FiFlag, FiLink, FiX } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {
  type CompanyEventRole,
  type CompanyHistoryItem,
  type CompanyRelatedEvent,
  companyApi,
} from '@/shared/api/company'
import { dateSortKey, formatDateWithPrecision } from '@/shared/lib/iso-date'
import { isVisuallyEmptyRichText } from '@/shared/lib/rich-text-read-view'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import {
  EventPickerModal,
  type EventPickerSelection,
} from '@/shared/ui/event-picker-modal/event-picker-modal'
import { InlineRichText } from '@/shared/ui/inline-edit'
import { notify } from '@/shared/ui/toast'

import * as S from './company-detail.styles'
import { HISTORY_TYPE_LABELS } from './company-history-section'
import {
  COMPANY_EVENT_ROLE_META,
  COMPANY_EVENT_ROLE_ORDER,
  relatedEventDateLabel,
} from './company-related-events.lib'
import { companyKeys } from './use-company-detail'

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
  companyId: string
  events: CompanyRelatedEvent[] | undefined
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

/**
 * 관련 사건 — 보기 + 기업 쪽에서 직접 연결·해제(검토 F6).
 * 예전엔 사건 상세의 '관련 조직'으로 가야만 걸 수 있었고, 빈 상태 안내가 다른 화면으로 내보냈다.
 * 흐름: '사건 연결' → 사건 검색(공용 EventPickerModal) → 이 자리에서 역할·설명 고르고 확정.
 */
export function CompanyRelatedEventsSection({
  companyId,
  events,
  isLoading,
  isError,
  onRetry,
}: RelatedEventsProps) {
  const queryClient = useQueryClient()
  const [pickerOpen, setPickerOpen] = useState(false)
  /** 고른 뒤 역할을 정하는 중인 사건 */
  const [pending, setPending] = useState<EventPickerSelection | null>(null)
  const [role, setRole] = useState<CompanyEventRole>('PRINCIPAL')
  const [roleDescription, setRoleDescription] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: companyKeys.events(companyId) })

  const resetPending = () => {
    setPending(null)
    setRole('PRINCIPAL')
    setRoleDescription('')
  }

  const handleLink = async () => {
    if (!pending || busy) return
    setBusy(true)
    try {
      await companyApi.linkEvent(companyId, {
        eventId: pending.id,
        role,
        roleDescription: roleDescription.trim() || null,
      })
      notify.success(`'${pending.title}'에 연결했습니다.`)
      resetPending()
      await refresh()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '연결에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const handleUnlink = async (event: CompanyRelatedEvent) => {
    const ok = await confirm({
      title: '연결 해제',
      message: `'${event.title}'과(와)의 연결을 풉니다. 사건과 기업은 그대로 남습니다.`,
      confirmLabel: '해제',
      danger: true,
    })
    if (!ok) return
    try {
      await companyApi.unlinkEvent(companyId, event.relationId)
      await refresh()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '해제에 실패했습니다.')
    }
  }

  return (
    <S.Section id="company-related-events">
      <S.SectionHeader>
        <S.SectionTitle>관련 사건</S.SectionTitle>
        {events && events.length > 0 && (
          <S.SectionSubtitle>{events.length}건</S.SectionSubtitle>
        )}
        <S.SectionActions>
          <S.ManageToggle type="button" onClick={() => setPickerOpen(true)}>
            <FiLink /> 사건 연결
          </S.ManageToggle>
        </S.SectionActions>
      </S.SectionHeader>

      {pending && (
        <LinkPanel aria-label="사건 연결 — 역할 선택">
          <LinkTarget>
            <LinkKicker>연결할 사건</LinkKicker>
            <strong>{pending.title}</strong>
          </LinkTarget>
          <RoleChips role="radiogroup" aria-label="이 기업의 역할">
            {COMPANY_EVENT_ROLE_ORDER.map((value) => (
              <RoleChip
                key={value}
                type="button"
                role="radio"
                aria-checked={role === value}
                $active={role === value}
                $tone={COMPANY_EVENT_ROLE_META[value].tone}
                onClick={() => setRole(value)}
              >
                {COMPANY_EVENT_ROLE_META[value].label}
              </RoleChip>
            ))}
          </RoleChips>
          <RoleInput
            value={roleDescription}
            onChange={(event) => setRoleDescription(event.target.value)}
            placeholder="역할 설명 (선택) — 예: 가스관 운영 주체"
            aria-label="역할 설명"
            maxLength={200}
          />
          <LinkActions>
            <S.ManageToggle type="button" onClick={resetPending} disabled={busy}>
              취소
            </S.ManageToggle>
            <PrimarySmall type="button" onClick={() => void handleLink()} disabled={busy}>
              {busy ? '연결 중…' : '연결'}
            </PrimarySmall>
          </LinkActions>
        </LinkPanel>
      )}

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
        !pending && (
          <S.EmptyState>
            이 기업이 등장한 사건이 없습니다. <strong>사건 연결</strong>로 설립·인수·참여
            같은 역할과 함께 걸어 두면 여기와 연혁 탭에 모입니다.
          </S.EmptyState>
        )
      ) : (
        <EventList>
          {events.map((event) => {
            const meta = COMPANY_EVENT_ROLE_META[event.role] ?? COMPANY_EVENT_ROLE_META.OTHER
            const date = relatedEventDateLabel(event)
            return (
              <EventItem key={event.relationId}>
                <EventRow to={pathKeys.events.detail(event.eventId)}>
                  <EventDate>{date ?? '연도 미상'}</EventDate>
                  <EventMain>
                    <EventTitle>{event.title}</EventTitle>
                    {event.roleDescription && (
                      <EventRoleNote>{event.roleDescription}</EventRoleNote>
                    )}
                  </EventMain>
                  <RoleBadge $tone={meta.tone}>{meta.label}</RoleBadge>
                </EventRow>
                <UnlinkButton
                  type="button"
                  onClick={() => void handleUnlink(event)}
                  aria-label={`'${event.title}' 연결 해제`}
                  title="연결 해제"
                >
                  <FiX aria-hidden />
                </UnlinkButton>
              </EventItem>
            )
          })}
        </EventList>
      )}

      <EventPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="연결할 사건 찾기"
        onSelect={(picked) => {
          setPickerOpen(false)
          setPending(picked)
        }}
      />
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

/** 행 + 행 밖 해제 버튼 — 링크 안에 버튼을 넣지 않으려고 형제로 둔다 */
const EventItem = styled.li`
  position: relative;
`

const EventRow = styled(Link)`
  display: grid;
  grid-template-columns: 128px minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 4px 16px;
  /* 오른쪽 40px은 행 밖에 떠 있는 해제 버튼 자리 */
  padding: 11px 40px 11px 6px;
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

const UnlinkButton = styled.button`
  position: absolute;
  top: 50%;
  right: 4px;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s, color 0.12s, background 0.12s;

  ${EventItem}:hover &,
  &:focus-visible {
    opacity: 1;
  }
  @media (hover: none) {
    opacity: 1;
  }
  &:hover {
    color: ${({ theme }) => theme.colors.error ?? '#dc2626'};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(248,113,113,0.12)' : 'rgba(239,68,68,0.06)'};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
  }
  svg {
    width: 14px;
    height: 14px;
  }
`

const LinkPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 760px;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.primary}55;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.04)'};
`

const LinkTarget = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 14.5px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const LinkKicker = styled.span`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RoleChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const RoleChip = styled.button<{ $active: boolean; $tone: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid
    ${({ theme, $active, $tone }) => ($active ? $tone : theme.colors.border.default)};
  background: ${({ $active, $tone }) => ($active ? `${$tone}1a` : 'transparent')};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ $tone }) => $tone};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

const RoleInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 7px 10px;
  border-radius: 8px;
  font: inherit;
  font-size: 13px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const LinkActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 6px;
`

const PrimarySmall = styled.button`
  height: 28px;
  padding: 0 14px;
  border: 0;
  border-radius: 6px;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: #fff;
  background: ${({ theme }) => theme.colors.primary};
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
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
