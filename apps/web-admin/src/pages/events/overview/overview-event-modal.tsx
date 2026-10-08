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
import { Link } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'

import { durationLabel } from '@/pages/events/detail/components/event-facts.lib'
import {
  categoryAccent,
  ledgerAccent,
  ledgerHoverFill,
  ledgerSubtleFill,
  resolveCategory,
} from '@/entities/event/ui/ledger-tokens'
import type { EventOverviewNode } from '@/shared/api/event-overview'
import { eventDateLabel } from '@/shared/lib/event-date-label'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import { InlineText } from '@/shared/ui/inline-edit/inline-text'
import { Modal } from '@/shared/ui/modal'
import { ModalBody, ModalCloseButton, ModalFooter } from '@/shared/ui/modal/modal.styles'

import {
  CHECK_COLUMNS,
  checkNode,
  checkScore,
  metricRows,
  roleLabel,
  roleTone,
} from './event-overview.lib'
import * as S from './overview.styles'

interface OverviewEventModalProps {
  /** 열린 사건 — null이면 닫힘 */
  event: EventOverviewNode | null
  /** 전개·점검표와 같은 번호(전체 순서) */
  number: number
  /** 지금 넘기는 순서(거르기 반영) 안의 위치 */
  position: number
  total: number
  /** 나라·갈래로 걸러 둔 상태인가 — 그때는 두 번호가 다르다 */
  filtered: boolean
  /** 최상위 사건 제목 — 머리의 경로 첫 칸 */
  rootTitle: string
  /** 바로 위 사건 제목 — 손자 이하일 때만 */
  parentTitle: string | null
  /** 이 사건 바로 아래 하위(조망 범위 안) */
  children: EventOverviewNode[]
  numberById: Map<string, number>
  onClose: () => void
  onPrev: (() => void) | null
  onNext: (() => void) | null
  onOpenEvent: (eventId: string) => void
  /** 개요 저장 — 점검표에서 가장 자주 비는 칸 중 문서 없이 채울 수 있는 것 */
  onSaveDescription: (eventId: string, next: string) => void
}

/** 입력 중인 칸에서는 화살표를 가로채지 않는다 */
const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

export function OverviewEventModal({
  event,
  number,
  position,
  total,
  filtered,
  rootTitle,
  parentTitle,
  children,
  numberById,
  onClose,
  onPrev,
  onNext,
  onOpenEvent,
  onSaveDescription,
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
  const fillPct = checkScore(checks).pct
  const metrics = metricRows([event])
  const titleId = `overview-event-modal-${event.id}`

  return (
    <Modal
      isOpen
      onClose={onClose}
      ariaLabelledBy={titleId}
      initialFocusRef={titleRef}
      maxWidth="880px"
      header={
        <Head>
          <HeadTop>
            {/* 걸러 둔 상태에선 표의 번호와 넘기는 순서가 다르다 — 둘 다 말한다 */}
            <Position title={filtered ? '전개·점검표의 번호 · 걸린 사건 중 순서' : undefined}>
              {filtered ? `${number}번 · 걸린 ${total}건 중 ${position}` : `${number} / ${total}`}
            </Position>
            <Trail>
              {rootTitle}
              {parentTitle && (
                <>
                  <TrailSep aria-hidden="true">›</TrailSep>
                  {parentTitle}
                </>
              )}
            </Trail>
            <ModalCloseButton type="button" onClick={onClose} aria-label="닫기">
              <FiX />
            </ModalCloseButton>
          </HeadTop>
          <Title id={titleId} ref={titleRef} tabIndex={-1}>
            {event.title}
          </Title>
          <Facts>
            {dateLabel && (
              <Fact>
                <FactLabel>기간</FactLabel>
                <FactValue>{dateLabel}</FactValue>
              </Fact>
            )}
            {duration && (
              <Fact>
                <FactLabel>길이</FactLabel>
                <FactValue>{duration}</FactValue>
              </Fact>
            )}
            {event.category && (
              <Fact>
                <FactLabel>갈래</FactLabel>
                <FactValue>
                  <Dot $color={accent} aria-hidden="true" />
                  {event.category.name}
                </FactValue>
              </Fact>
            )}
            {event.location && (
              <Fact>
                <FactLabel>장소</FactLabel>
                <FactValue>{event.location}</FactValue>
              </Fact>
            )}
          </Facts>
        </Head>
      }
    >
      <Body>
        <Main>
          {/* 개요는 여기서 바로 고친다 — 누르면 편집, 바깥을 누르거나 ⌘Enter로 저장.
              key로 사건마다 새 편집기(이전·다음으로 넘길 때 앞 사건의 초안이 따라오지 않게) */}
          <Lead as="div">
            <InlineText
              key={event.id}
              value={event.description ?? ''}
              onSave={(next) => onSaveDescription(event.id, next)}
              placeholder="개요가 아직 없습니다 — 눌러서 한두 문장으로 쓰기"
              label="개요"
              multiline
              maxLength={2000}
              showCount
            />
          </Lead>

          {children.length > 0 && (
            <Block aria-labelledby={`${titleId}-children`}>
              <BlockTitle id={`${titleId}-children`}>
                하위 사건 <Count>{children.length}</Count>
              </BlockTitle>
              <ChildList>
                {children.map((child) => (
                  <li key={child.id}>
                    <ChildButton type="button" onClick={() => onOpenEvent(child.id)}>
                      <ChildNumber>{numberById.get(child.id)}</ChildNumber>
                      <ChildTitle>{child.title}</ChildTitle>
                      {eventDateLabel(child) && <ChildDate>{eventDateLabel(child)}</ChildDate>}
                    </ChildButton>
                  </li>
                ))}
              </ChildList>
            </Block>
          )}
        </Main>

        <Aside aria-label="이 사건의 사실">
          <AsideBlock aria-labelledby={`${titleId}-checks`}>
            <AsideHead>
              <BlockTitle id={`${titleId}-checks`}>기록 점검</BlockTitle>
              <Percent>{fillPct}%</Percent>
            </AsideHead>
            <S.Meter aria-hidden="true" style={{ marginTop: 0, order: 0 }}>
              <S.MeterFill $pct={fillPct} />
            </S.Meter>
            <CheckGrid>
              {/* 해당 없는 칸(외교 사건의 수치 등)은 목록에서 뺀다 — 비었다고 읽히지 않게 */}
              {CHECK_COLUMNS.filter((column) => checks[column.key] !== 'na').map((column) => {
                const state = checks[column.key]
                return (
                  <CheckItem key={column.key} $state={state} title={column.hint}>
                    <CheckGlyph $state={state} aria-hidden="true" />
                    {column.label}
                    <S.VisuallyHidden>
                      {state === 'full' ? ' 채움' : state === 'partial' ? ' 일부' : ' 비어 있음'}
                    </S.VisuallyHidden>
                  </CheckItem>
                )
              })}
            </CheckGrid>
          </AsideBlock>

          <AsideBlock aria-labelledby={`${titleId}-countries`}>
            <AsideHead>
              <BlockTitle id={`${titleId}-countries`}>참여국</BlockTitle>
              <Count>{event.countries.length}</Count>
            </AsideHead>
            {event.countries.length === 0 ? (
              <Missing>참여국이 없습니다.</Missing>
            ) : (
              <FactList>
                {event.countries.map((country) => {
                  const tone = roleTone(country.role)
                  return (
                    <li key={country.key}>
                      <S.RoleMark
                        $color={S.toneColor(tone, theme.mode)}
                        $hollow={tone === 'neutral'}
                        aria-hidden="true"
                      />
                      <span>
                        {country.flagEmoji ? `${country.flagEmoji} ` : ''}
                        {country.name}
                      </span>
                      {/* 평범한 참여는 블록 제목('참여국')과 같은 말이라 생략 */}
                      {country.role && country.role !== 'PARTICIPANT' && (
                        <RoleText>{roleLabel(country.role)}</RoleText>
                      )}
                    </li>
                  )
                })}
              </FactList>
            )}
          </AsideBlock>

          {event.persons.length > 0 && (
            <AsideBlock aria-labelledby={`${titleId}-persons`}>
              <AsideHead>
                <BlockTitle id={`${titleId}-persons`}>인물</BlockTitle>
                <Count>{event.persons.length}</Count>
              </AsideHead>
              <FactList>
                {event.persons.map((person) => (
                  <li key={person.personId}>
                    <span>
                      {getPersonDisplayName({
                        name: person.name ?? '',
                        surname: person.surname,
                        middleName: person.middleName,
                        nameDisplayOrder: person.nameDisplayOrder,
                        country: { defaultNameDisplayOrder: person.defaultNameDisplayOrder },
                      })}
                    </span>
                    {person.role && <RoleText>{person.role}</RoleText>}
                  </li>
                ))}
              </FactList>
            </AsideBlock>
          )}

          {(event.sides.length > 0 || metrics.length > 0) && (
            <AsideBlock aria-labelledby={`${titleId}-sides`}>
              <AsideHead>
                <BlockTitle id={`${titleId}-sides`}>진영 · 수치</BlockTitle>
              </AsideHead>
              <FactList>
                {event.sides.length > 0 && (
                  <li>
                    <span>{event.sides.map((side) => side.name).join(' ↔ ')}</span>
                  </li>
                )}
                {metrics.map((row, index) => (
                  <li key={`${row.metricName}-${index}`}>
                    <span>{row.metricName}</span>
                    <RoleText>
                      {row.display}
                      {row.unit && ` ${row.unit}`}
                    </RoleText>
                  </li>
                ))}
              </FactList>
            </AsideBlock>
          )}
        </Aside>
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
          <KeyHint aria-hidden="true">
            <kbd>←</kbd>
            <kbd>→</kbd> 로 넘기기
          </KeyHint>
        </NavGroup>
        {/* 링크 — 가운데 클릭·⌘클릭으로 새 탭에서 열 수 있게(버튼이던 시절엔 못 했다) */}
        <PrimaryButton as={Link} to={pathKeys.events.detail(event.id)}>
          사건 문서 열기
          <FiExternalLink size={14} aria-hidden="true" />
        </PrimaryButton>
      </Foot>
    </Modal>
  )
}

// ─── 조판 ──────────────────────────────────────────────────────────────────
// 색 띠·왼쪽 테두리 강조를 쓰지 않는다 — 위계는 글자 크기·굵기·여백·옅은 바탕으로 세운다.

const Head = styled.div`
  padding: 18px 20px 18px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
`

const HeadTop = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 32px;
`

const Position = styled.span`
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

/** 경로 — 최상위 › 바로 위 */
const Trail = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const TrailSep = styled.span`
  margin: 0 6px;
`

const Title = styled.h2`
  margin: 0;
  font-size: clamp(20px, 2.4vw, 26px);
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: -0.015em;
  word-break: keep-all;
  color: ${({ theme }) => theme.colors.text.primary};
  &:focus {
    outline: none;
  }
`

/** 사실 줄 — 작은 이름표 위에 값 */
const Facts = styled.dl`
  margin: 2px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 28px;
`

const Fact = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const FactLabel = styled.dt`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const FactValue = styled.dd`
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Dot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`

/** 본문 2단 — 왼쪽 서술, 오른쪽 사실. 좁으면 한 단 */
const Body = styled(ModalBody)`
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(240px, 1fr);
  align-items: start;
  gap: 24px;
  color: ${({ theme }) => theme.colors.text.primary};
  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const Main = styled.div`
  display: flex;
  flex-direction: column;
  gap: 22px;
  min-width: 0;
`

const Lead = styled.p`
  margin: 0;
  font-size: 15px;
  line-height: 1.75;
  white-space: pre-line;
  word-break: keep-all;
`

const Missing = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Block = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const BlockTitle = styled.h3`
  margin: 0;
  font-size: 12.5px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Count = styled.span`
  margin-left: 4px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ChildList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const ChildButton = styled.button`
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  column-gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font: inherit;
  text-align: left;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 1px;
  }
`

const ChildNumber = styled.span`
  grid-row: span 2;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding-top: 1px;
`

const ChildTitle = styled.span`
  font-size: 13.5px;
  font-weight: 600;
`

const ChildDate = styled.span`
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 사실 패널 — 테두리 대신 옅은 바탕 한 장 */
const Aside = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 16px;
  border-radius: 12px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  min-width: 0;
`

const AsideBlock = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const AsideHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
`

const Percent = styled.span`
  font-size: 15px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
`

const CheckGrid = styled.ul`
  margin: 2px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px 8px;
`

const CheckItem = styled.li<{ $state: 'full' | 'partial' | 'empty' | 'na' }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ $state, theme }) =>
    $state === 'empty' ? theme.colors.text.tertiary : theme.colors.text.primary};
`

/** 채움=꽉 찬 원 · 일부=반원 · 빈 칸=테두리만 */
const CheckGlyph = styled.span<{ $state: 'full' | 'partial' | 'empty' | 'na' }>`
  flex-shrink: 0;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  box-sizing: border-box;
  ${({ $state, theme }) => {
    const full = theme.mode === 'dark' ? '#4ade80' : '#16a34a'
    const partial = theme.mode === 'dark' ? '#fbbf24' : '#d97706'
    if ($state === 'full') return `background: ${full};`
    if ($state === 'partial') return `background: linear-gradient(90deg, ${partial} 50%, transparent 50%); border: 1.5px solid ${partial};`
    return `border: 1.5px solid ${theme.colors.text.tertiary}; opacity: 0.6;`
  }}
`

const FactList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  li {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  li > span:not([aria-hidden]) {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const RoleText = styled.span`
  margin-left: auto;
  flex-shrink: 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
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
  margin-left: 6px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  kbd {
    min-width: 18px;
    padding: 1px 4px;
    border-radius: 4px;
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    font: inherit;
    font-size: 11px;
    text-align: center;
  }
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
  text-decoration: none;
  cursor: pointer;
  &:hover {
    filter: brightness(1.08);
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`
