import { Suspense, lazy, useMemo, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { FiPlus } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {
  RADIUS,
  ledgerAccent,
  ledgerAccentSubtle,
  ledgerHairline,
  ledgerHairlineStrong,
  resolveCategory,
} from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { formatDateRange } from '@/pages/events/utils/events.utils'
import { type UpdateEventDto } from '@/shared/api/events'
import { invalidateEventQueries } from '@/shared/api/invalidate-events'
import { pathKeys } from '@/shared/router'

import * as S from '../styles'
import { type EventDetail, usePrefetchEventDetail } from '../use-event-detail'
import { compareEventStart } from './detail-network.lib'

const LazyEventRegisterModal = lazy(() =>
  import('@/widgets/event-form/ui/event-register-modal').then((module) => ({
    default: module.EventRegisterModal,
  })),
)

interface CollectionDevelopmentProps {
  event: EventDetail
  onPatch: (patch: UpdateEventDto, opts?: { savedLabel?: string }) => void
  /** 기존 사건을 하위로 모으기 — 연관 탭의 '하위 사건 모으기'로 보낸다 */
  onGatherExisting: () => void
}

/**
 * 묶음 사건의 전개 — **하위 사건이 곧 전개다.**
 *
 * 묶음 사건은 전개를 글로 쓰지 않는다(서버가 전개 단락을 거부한다). 전쟁의 경과는 전투·회담·
 * 조약 같은 하위 사건이 차례로 쌓여 드러나고, 이 섹션은 그 차례를 읽는 자리다. 배경과 여파
 * 사이, 단일 사건이라면 전개 단락이 놓였을 바로 그 자리에 선다.
 *
 * 하위가 하나도 없으면 첫 하위 등록을 권하고, 그때만 '단일 사건으로' 되돌릴 수 있다
 * (하위가 남은 묶음은 서버가 단일 전환을 거부한다).
 */
export function CollectionDevelopment({ event, onPatch, onGatherExisting }: CollectionDevelopmentProps) {
  const queryClient = useQueryClient()
  const prefetchEvent = usePrefetchEventDetail()
  const [createOpen, setCreateOpen] = useState(false)

  const children = useMemo(
    () =>
      [
        ...(event.childEvents ?? []).map((child) => ({
          id: child.id,
          title: child.title,
          description: child.description ?? null,
          startDate: child.startDate ?? null,
          startDatePrecision: child.startDatePrecision ?? null,
          endDate: child.endDate ?? null,
          endDatePrecision: child.endDatePrecision ?? null,
          categoryName: child.category?.name ?? null,
          isCollection: child.kind === 'COLLECTION',
          viaExtraLink: false,
        })),
        ...(event.extraChildren ?? []).map((child) => ({
          id: child.id,
          title: child.title,
          description: null,
          startDate: child.startDate ?? null,
          startDatePrecision: child.startDatePrecision ?? null,
          endDate: child.endDate ?? null,
          endDatePrecision: child.endDatePrecision ?? null,
          categoryName: null,
          isCollection: false,
          viaExtraLink: true,
        })),
      ].sort((first, second) => compareEventStart(first.startDate, second.startDate)),
    [event.childEvents, event.extraChildren],
  )

  const becomeSingle = () =>
    onPatch({ kind: 'SINGLE' } as UpdateEventDto, {
      savedLabel: `'${event.title}'을(를) 단일 사건으로 바꿈`,
    })

  return (
    <S.Section id="narrative">
      <S.SectionHeader>
        <S.SectionTitle>전개</S.SectionTitle>
        <S.SectionSubtitle>
          {children.length > 0 ? `하위 사건 ${children.length}건` : '하위 사건으로 기록'}
        </S.SectionSubtitle>
        <S.SectionActions>
          <HeaderButton type="button" onClick={onGatherExisting}>
            기존 사건 모으기
          </HeaderButton>
          <HeaderButton type="button" $primary onClick={() => setCreateOpen(true)}>
            <FiPlus aria-hidden />
            하위 사건 추가
          </HeaderButton>
        </S.SectionActions>
      </S.SectionHeader>

      {children.length === 0 ? (
        <Empty>
          <EmptyText>
            아직 하위 사건이 없습니다. 묶음 사건의 전개는 전투·회담·조약 같은 국면을 하위 사건으로
            등록해 차례로 쌓습니다.
          </EmptyText>
          <EmptyActions>
            <S.TabEmptyAction type="button" onClick={() => setCreateOpen(true)}>
              <FiPlus aria-hidden />첫 하위 사건 등록
            </S.TabEmptyAction>
            <TextButton type="button" onClick={becomeSingle}>
              하위 없이 쓸 사건이면 단일 사건으로
            </TextButton>
          </EmptyActions>
        </Empty>
      ) : (
        <Steps>
          {children.map((child, index) => {
            const dateLabel = child.startDate
              ? formatDateRange(
                  child.startDate,
                  child.endDate ?? undefined,
                  child.startDatePrecision,
                  child.endDatePrecision,
                )
              : null
            const category = resolveCategory(child.categoryName)
            return (
              <Step key={child.id}>
                <StepIndex aria-hidden>{index + 1}</StepIndex>
                <StepBody>
                  <StepMeta>
                    <span>{dateLabel ?? '날짜 미상'}</span>
                    {child.categoryName && (
                      <span>
                        <span aria-hidden>{category.icon} </span>
                        {child.categoryName}
                      </span>
                    )}
                    {child.isCollection && <KindTag>묶음</KindTag>}
                    {child.viaExtraLink && <span>추가 상위로 연결</span>}
                  </StepMeta>
                  <StepTitle
                    to={pathKeys.events.detail(child.id)}
                    viewTransition
                    onMouseEnter={() => prefetchEvent(child.id)}
                    onFocus={() => prefetchEvent(child.id)}
                  >
                    {child.title}
                  </StepTitle>
                  {child.description?.trim() && <StepText>{child.description}</StepText>}
                </StepBody>
              </Step>
            )
          })}
        </Steps>
      )}

      {createOpen && (
        <Suspense fallback={null}>
          <LazyEventRegisterModal
            isOpen
            onClose={() => setCreateOpen(false)}
            initialParent={{ id: event.id, title: event.title }}
            onSaved={() => invalidateEventQueries(queryClient, { eventId: event.id })}
          />
        </Suspense>
      )}
    </S.Section>
  )
}

const HeaderButton = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: ${RADIUS.SM};
  border: 1px solid
    ${({ theme, $primary }) => ($primary ? 'transparent' : ledgerHairlineStrong(theme.mode))};
  background: ${({ theme, $primary }) => ($primary ? ledgerAccentSubtle(theme.mode) : 'transparent')};
  color: ${({ theme, $primary }) => ($primary ? ledgerAccent(theme.mode) : theme.colors.text.secondary)};
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;

  svg {
    width: 13px;
    height: 13px;
  }
  &:hover {
    color: ${({ theme, $primary }) => ($primary ? ledgerAccent(theme.mode) : theme.colors.text.primary)};
    border-color: ${({ theme, $primary }) => ($primary ? ledgerAccent(theme.mode) : theme.colors.text.tertiary)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

const Empty = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: ${S.PROSE_WIDTH}px;
`

const EmptyText = styled.p`
  margin: 0;
  font-size: 15px;
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EmptyActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
`

const TextButton = styled.button`
  padding: 4px 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 12.5px;
  color: ${metaText};
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

/** 하위 사건 차례 — 번호 열 + 본문. 행 사이 머리카락선으로만 가른다(카드·색띠 없음). */
const Steps = styled.ol`
  display: flex;
  flex-direction: column;
  max-width: ${S.PROSE_WIDTH}px;
  margin: 0;
  padding: 0;
  list-style: none;
`

const Step = styled.li`
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 12px;
  padding: 14px 0;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  &:last-child {
    border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  }
`

const StepIndex = styled.span`
  padding-top: 1px;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: ${metaText};
`

const StepBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const StepMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: ${metaText};
`

const KindTag = styled.span`
  padding: 0 6px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  font-size: 11px;
  font-weight: 600;
`

const StepTitle = styled(Link)`
  align-self: flex-start;
  font-size: 15.5px;
  font-weight: 700;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  overflow-wrap: anywhere;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: 2px;
  }
`

const StepText = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.65;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`
