/**
 * 조망 속 사건 모달 — 하위 사건을 페이지 이동 없이 펼쳐 보고, 이전·다음으로 넘기며 전부 점검한다.
 *
 * 공용 EventInlineModal을 쓰지 않는 이유: 그 모달은 날짜·장소·설명만 보여 주고(참여국·인물·
 * 기록 상태 없음), 날짜를 `new Date()`로 만들어 기원전 사건은 빈칸, 연도만 아는 사건은
 * '1월 1일'로 표기한다. 조망은 이미 하위 전부의 사실을 갖고 있으니 **추가 요청 없이** 그 데이터를
 * 그대로 그린다. 서술·편집은 '사건 문서 열기'로 간다.
 */
import { useEffect, useRef } from 'react'

import { FiArrowLeft, FiArrowRight, FiExternalLink, FiX } from 'react-icons/fi'
import styled, { useTheme } from 'styled-components'

import { durationLabel } from '@/pages/events/detail/components/event-facts.lib'
import {
  categoryAccent,
  ledgerAccent,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerSubtleFill,
  resolveCategory,
} from '@/entities/event/ui/ledger-tokens'
import type { EventOverviewNode } from '@/shared/api/event-overview'
import { eventDateLabel } from '@/shared/lib/event-date-label'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { Modal } from '@/shared/ui/modal'
import { ModalBody, ModalCloseButton, ModalFooter } from '@/shared/ui/modal/modal.styles'

import { CHECK_COLUMNS, checkNode, metricRows, roleLabel, roleTone } from './event-overview.lib'
import * as S from './overview.styles'

interface OverviewEventModalProps {
  /** 열린 사건 — null이면 닫힘 */
  event: EventOverviewNode | null
  /** 지금 화면 순서(거르기 반영)에서의 위치 */
  position: number
  total: number
  parentTitle: string | null
  /** 이 사건 바로 아래 하위(조망 범위 안) */
  children: EventOverviewNode[]
  numberById: Map<string, number>
  onClose: () => void
  onPrev: (() => void) | null
  onNext: (() => void) | null
  onOpenEvent: (eventId: string) => void
  onOpenDocument: (eventId: string) => void
}

/** 입력 중인 칸에서는 화살표를 가로채지 않는다 */
const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

export function OverviewEventModal({
  event,
  position,
  total,
  parentTitle,
  children,
  numberById,
  onClose,
  onPrev,
  onNext,
  onOpenEvent,
  onOpenDocument,
}: OverviewEventModalProps) {
  const theme = useTheme()
  /** 첫 포커스는 제목 — 기본(첫 버튼)이면 열자마자 하위 사건·'이전'에 링이 떴다 */
  const titleRef = useRef<HTMLHeadingElement>(null)

  // ←/→로 이전·다음 — 전부 훑어 점검하는 흐름의 주 동작
  useEffect(() => {
    if (!event) return
    const onKey = (keyEvent: KeyboardEvent) => {
      if (keyEvent.altKey || keyEvent.metaKey || keyEvent.ctrlKey || isTyping(keyEvent.target)) return
      if (keyEvent.key === 'ArrowLeft' && onPrev) {
        keyEvent.preventDefault()
        onPrev()
      } else if (keyEvent.key === 'ArrowRight' && onNext) {
        keyEvent.preventDefault()
        onNext()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [event, onPrev, onNext])

  if (!event) return null

  const category = resolveCategory(event.category?.name)
  const accent = categoryAccent(category, theme.mode)
  const dateLabel = eventDateLabel(event)
  const duration = durationLabel(
    event.startDate,
    event.endDate,
    event.startDatePrecision,
    event.endDatePrecision,
  )
  const checks = checkNode(event)
  const filled = CHECK_COLUMNS.reduce(
    (sum, column) =>
      sum + (checks[column.key] === 'full' ? 1 : checks[column.key] === 'partial' ? 0.5 : 0),
    0,
  )
  const fillPct = Math.round((filled / CHECK_COLUMNS.length) * 100)
  const metrics = metricRows([event])
  const titleId = `overview-event-modal-${event.id}`

  return (
    <Modal
      isOpen
      onClose={onClose}
      ariaLabelledBy={titleId}
      initialFocusRef={titleRef}
      maxWidth="720px"
      header={
        <Head $accent={accent}>
          <HeadTop>
            <Position>
              {position} / {total}
            </Position>
            {event.category && (
              <CategoryChip $color={accent}>
                <span aria-hidden="true">{category.icon}</span>
                {event.category.name}
              </CategoryChip>
            )}
            {parentTitle && <ParentLine>↳ {parentTitle}의 하위</ParentLine>}
            <ModalCloseButton type="button" onClick={onClose} aria-label="닫기" style={{ marginLeft: 'auto' }}>
              <FiX />
            </ModalCloseButton>
          </HeadTop>
          <Title id={titleId} ref={titleRef} tabIndex={-1}>
            {event.title}
          </Title>
          {(dateLabel || duration || event.location) && (
            <Meta>
              {dateLabel && <span>{dateLabel}</span>}
              {duration && <span>{duration}</span>}
              {event.location && <span>{event.location}</span>}
            </Meta>
          )}
        </Head>
      }
    >
      <Body>
        {event.description?.trim() ? (
          <Lead>{event.description}</Lead>
        ) : (
          <Missing>개요가 아직 없습니다.</Missing>
        )}

        <Block aria-labelledby={`${titleId}-countries`}>
          <BlockTitle id={`${titleId}-countries`}>
            참여국 <Count>{event.countries.length}</Count>
          </BlockTitle>
          {event.countries.length === 0 ? (
            <Missing>참여국이 없습니다.</Missing>
          ) : (
            <ChipRow>
              {event.countries.map((country) => {
                const tone = roleTone(country.role)
                return (
                  <CountryChip key={country.key}>
                    <S.RoleMark
                      $color={S.toneColor(tone, theme.mode)}
                      $hollow={tone === 'neutral'}
                      aria-hidden="true"
                      style={{ width: 12, height: 12, borderRadius: 3 }}
                    />
                    <span>
                      {country.flagEmoji ? `${country.flagEmoji} ` : ''}
                      {country.name}
                    </span>
                    {/* 평범한 참여는 블록 제목('참여국')과 같은 말이라 생략 */}
                    {country.role && country.role !== 'PARTICIPANT' && (
                      <RoleText>{roleLabel(country.role)}</RoleText>
                    )}
                  </CountryChip>
                )
              })}
            </ChipRow>
          )}
        </Block>

        {event.persons.length > 0 && (
          <Block aria-labelledby={`${titleId}-persons`}>
            <BlockTitle id={`${titleId}-persons`}>
              인물 <Count>{event.persons.length}</Count>
            </BlockTitle>
            <List>
              {event.persons.map((person) => (
                <li key={person.personId}>
                  <strong>
                    {getPersonDisplayName({
                      name: person.name ?? '',
                      surname: person.surname,
                      middleName: person.middleName,
                      nameDisplayOrder: person.nameDisplayOrder,
                      country: { defaultNameDisplayOrder: person.defaultNameDisplayOrder },
                    })}
                  </strong>
                  {person.role && <RoleText> — {person.role}</RoleText>}
                </li>
              ))}
            </List>
          </Block>
        )}

        {(event.sides.length > 0 || metrics.length > 0) && (
          <Block aria-labelledby={`${titleId}-sides`}>
            <BlockTitle id={`${titleId}-sides`}>진영 · 수치</BlockTitle>
            {event.sides.length > 0 && (
              <p style={{ margin: 0 }}>{event.sides.map((side) => side.name).join(' ↔ ')}</p>
            )}
            {metrics.length > 0 && (
              <List>
                {metrics.map((row, index) => (
                  <li key={`${row.metricName}-${index}`}>
                    {row.metricName} <strong>{row.display}</strong>
                    {row.unit && ` ${row.unit}`}
                  </li>
                ))}
              </List>
            )}
          </Block>
        )}

        {children.length > 0 && (
          <Block aria-labelledby={`${titleId}-children`}>
            <BlockTitle id={`${titleId}-children`}>
              하위 사건 <Count>{children.length}</Count>
            </BlockTitle>
            <List>
              {children.map((child) => (
                <li key={child.id}>
                  <LinkButton type="button" onClick={() => onOpenEvent(child.id)}>
                    <Muted>{numberById.get(child.id)}.</Muted> {child.title}
                  </LinkButton>
                  {eventDateLabel(child) && <Muted> · {eventDateLabel(child)}</Muted>}
                </li>
              ))}
            </List>
          </Block>
        )}

        <Block aria-labelledby={`${titleId}-checks`}>
          <BlockTitle id={`${titleId}-checks`}>
            기록 점검 <Count>{fillPct}%</Count>
          </BlockTitle>
          <CheckGrid>
            {CHECK_COLUMNS.map((column) => {
              const state = checks[column.key]
              return (
                <CheckItem key={column.key} $state={state} title={column.hint}>
                  <span aria-hidden="true">{state === 'full' ? '●' : state === 'partial' ? '◐' : '○'}</span>
                  {column.label}
                  <S.VisuallyHidden>
                    {state === 'full' ? ' 채움' : state === 'partial' ? ' 일부' : ' 비어 있음'}
                  </S.VisuallyHidden>
                </CheckItem>
              )
            })}
          </CheckGrid>
        </Block>
      </Body>

      <Foot>
        <NavGroup>
          <NavButton type="button" onClick={onPrev ?? undefined} disabled={!onPrev} aria-label="이전 사건">
            <FiArrowLeft size={14} aria-hidden="true" />
            이전
          </NavButton>
          <NavButton type="button" onClick={onNext ?? undefined} disabled={!onNext} aria-label="다음 사건">
            다음
            <FiArrowRight size={14} aria-hidden="true" />
          </NavButton>
          <KeyHint aria-hidden="true">← → 로 넘기기</KeyHint>
        </NavGroup>
        <PrimaryButton type="button" onClick={() => onOpenDocument(event.id)}>
          사건 문서 열기
          <FiExternalLink size={14} aria-hidden="true" />
        </PrimaryButton>
      </Foot>
    </Modal>
  )
}

// ─── 조판 ──────────────────────────────────────────────────────────────────

/** 머리 — 왼쪽 갈래색 띠가 이 사건의 정체를 먼저 말한다 */
const Head = styled.div<{ $accent: string }>`
  padding: 16px 20px 16px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  box-shadow: inset 4px 0 0 ${({ $accent }) => $accent};
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
`

const HeadTop = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  min-height: 32px;
`

const Position = styled.span`
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CategoryChip = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ $color }) => $color};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

const ParentLine = styled.span`
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Title = styled.h2`
  margin: 0;
  font-size: clamp(19px, 2.2vw, 24px);
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: -0.01em;
  word-break: keep-all;
  color: ${({ theme }) => theme.colors.text.primary};
  &:focus {
    outline: none;
  }
`

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 2px 12px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Body = styled(ModalBody)`
  gap: 20px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Lead = styled.p`
  margin: 0;
  font-size: 14.5px;
  line-height: 1.7;
  white-space: pre-line;
`

const Missing = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Block = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 14px;
  border-top: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  font-size: 13.5px;
`

const BlockTitle = styled.h3`
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Count = styled.span`
  margin-left: 4px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const CountryChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  font-size: 13px;
`

const RoleText = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const List = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const Muted = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

const LinkButton = styled.button`
  padding: 0;
  border: none;
  background: none;
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  text-align: left;
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: 3px;
  }
`

const CheckGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  gap: 6px;
`

const CheckItem = styled.span<{ $state: 'full' | 'partial' | 'empty' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 600;
  background: ${({ $state, theme }) => ($state === 'empty' ? 'transparent' : ledgerSubtleFill(theme.mode))};
  border: 1px ${({ $state }) => ($state === 'empty' ? 'dashed' : 'solid')}
    ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  color: ${({ $state, theme }) =>
    $state === 'empty' ? theme.colors.text.tertiary : theme.colors.text.primary};
  span[aria-hidden] {
    color: ${({ $state, theme }) =>
      $state === 'full'
        ? theme.mode === 'dark' ? '#4ade80' : '#16a34a'
        : $state === 'partial'
          ? theme.mode === 'dark' ? '#fbbf24' : '#d97706'
          : theme.colors.text.tertiary};
  }
`

const Foot = styled(ModalFooter)`
  justify-content: space-between;
`

const NavGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const NavButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  &:hover:not(:disabled) {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

const KeyHint = styled.span`
  margin-left: 4px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  @media (max-width: 640px) {
    display: none;
  }
`

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  border: none;
  border-radius: 8px;
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#111827' : '#fff')};
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  &:hover {
    filter: brightness(1.08);
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`
