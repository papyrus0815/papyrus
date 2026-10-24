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
} from '@/entities/event/ui/ledger-tokens'
import { eventDomainDef } from '@/entities/event/model/event-domain'
import { metaText } from '@/pages/events/styles/theme'
import { formatDateRange } from '@/pages/events/utils/events.utils'
import { type UpdateEventDto, updateEvent } from '@/shared/api/events'
import { invalidateEventQueries } from '@/shared/api/invalidate-events'
import { pathKeys } from '@/shared/router'
import { InlineText } from '@/shared/ui/inline-edit'
import { notify } from '@/shared/ui/toast'

import * as S from '../styles'
import { type EventDetail, usePrefetchEventDetail } from '../use-event-detail'
import { PHASE_LABEL, groupByPhase } from './collection-development.lib'
import { compareEventStart, crossPatchErrorMessage } from './detail-network.lib'

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
  /** 요약을 쓰는 중인 하위 — 공용 인라인 칸은 연필 버튼(호버)으로만 열려, 빈 안내문을 눌러도 아무 일이 없었다 */
  const [writingSummaryId, setWritingSummaryId] = useState<string | null>(null)

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
          domain: (child.domain as string | undefined) ?? null,
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
          domain: null,
          isCollection: false,
          viaExtraLink: true,
        })),
      ].sort((first, second) => compareEventStart(first.startDate, second.startDate)),
    [event.childEvents, event.extraChildren],
  )

  /** 상위 기간에 비춘 구획 — 하나뿐이면(보통 전부 '기간 중') 구획 머리를 그리지 않는다 */
  const groups = useMemo(() => groupByPhase(children, event), [children, event])
  const showPhaseHeads = groups.length > 1

  /**
   * 하위 사건의 한 줄 요약을 여기서 바로 — 나누기로 만든 하위는 개요가 비어 제목만 남았다(13건).
   * 하위 사건 자신의 PUT이라 상위 캐시와 그 하위 상세를 함께 무효화한다.
   */
  const saveChildDescription = async (childId: string, next: string) => {
    try {
      await updateEvent(childId, { description: next })
      setWritingSummaryId(null)
      invalidateEventQueries(queryClient, { eventId: event.id })
      invalidateEventQueries(queryClient, { eventId: childId })
    } catch (error) {
      notify.error(`요약을 저장하지 못했습니다 — ${crossPatchErrorMessage(error)}`)
    }
  }

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
        <Phases>
          {groups.map((group) => (
            <PhaseGroup key={group.phase} aria-label={showPhaseHeads ? PHASE_LABEL[group.phase] : undefined}>
              {showPhaseHeads && (
                <PhaseHead>
                  {PHASE_LABEL[group.phase]}
                  <PhaseCount>{group.items.length}</PhaseCount>
                </PhaseHead>
              )}
              <Steps>
                {group.items.map((child) => {
                  const index = children.indexOf(child)
                  const dateLabel = child.startDate
                    ? formatDateRange(
                        child.startDate,
                        child.endDate ?? undefined,
                        child.startDatePrecision,
                        child.endDatePrecision,
                      )
                    : null
                  const domain = child.domain ? eventDomainDef(child.domain) : null
                  return (
                    <Step key={child.id}>
                      <StepIndex aria-hidden>{index + 1}</StepIndex>
                      <StepBody>
                        {/* 한 줄 머리 — 제목 뒤에 날짜·분야를 잇는다(예전엔 날짜 줄 → 제목 줄 → 요약 두 줄로
                            한 항목이 120px, 18건이 화면 2.5장이었다) */}
                        <StepHead>
                          <StepTitle
                            to={pathKeys.events.detail(child.id)}
                            viewTransition
                            onMouseEnter={() => prefetchEvent(child.id)}
                            onFocus={() => prefetchEvent(child.id)}
                          >
                            {child.title}
                          </StepTitle>
                          <StepMeta>
                            <span>{dateLabel ?? '날짜 미상'}</span>
                            {domain && (
                              <span>
                                <span aria-hidden>{domain.glyph} </span>
                                {domain.label}
                              </span>
                            )}
                            {child.isCollection && <KindTag>묶음</KindTag>}
                            {child.viaExtraLink && <span>추가 상위로 연결</span>}
                          </StepMeta>
                        </StepHead>
                        {/* 있는 요약은 한 줄로 읽기만(전문·고치기는 하위 상세에서) — 비어 있을 때만 여기서 쓴다.
                            추가 상위로만 이어진 하위는 이 묶음의 소유가 아니라 쓰기를 열지 않는다 */}
                        {child.description?.trim() ? (
                          <StepText>{child.description}</StepText>
                        ) : child.viaExtraLink ? null : writingSummaryId === child.id ? (
                          <StepSummary>
                            <InlineText
                              value=""
                              autoEdit
                              onSave={(next) => void saveChildDescription(child.id, next)}
                              placeholder="한 줄 요약 — 무슨 일이었나"
                              label={`${child.title} 요약`}
                              multiline
                              minRows={2}
                            />
                          </StepSummary>
                        ) : (
                          <SummaryPrompt type="button" onClick={() => setWritingSummaryId(child.id)}>
                            + 한 줄 요약 쓰기
                          </SummaryPrompt>
                        )}
                      </StepBody>
                    </Step>
                  )
                })}
              </Steps>
            </PhaseGroup>
          ))}
        </Phases>
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
  padding: 9px 0;
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
  gap: 2px;
  min-width: 0;
`

/** 제목 + 날짜·분야 한 줄 — 좁으면 날짜가 다음 줄로 내려간다 */
const StepHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 12px;
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
  font-size: 15px;
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
  font-size: 13.5px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

/** 빈 요약 자리 — 본문 위치에 놓인 '여기에 쓰세요' 한 줄(누르면 바로 입력칸) */
const SummaryPrompt = styled.button`
  align-self: flex-start;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 13.5px;
  font-style: italic;
  color: ${metaText};
  cursor: text;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: 2px;
  }
`

const StepSummary = styled.div`
  font-size: 14px;
  line-height: 1.65;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Phases = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: ${S.PROSE_WIDTH}px;
`

const PhaseGroup = styled.section`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

/** 구획 머리 — 상위 기간 기준 '시작 이전 · 기간 중 · 끝난 뒤'. 목록 행보다 작고 옅게 */
const PhaseHead = styled.h3`
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const PhaseCount = styled.span`
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${metaText};
`

/**
 * 묶음 사건의 '전체 글' 안내 — 배경·여파가 둘 다 비었을 때 개요 탭 머리에 한 줄.
 *
 * 묶음 사건은 전개를 하위 사건에 맡기므로, 이 사건 자신의 글은 '전체가 무엇이었고(개요) 왜
 * 일어나(배경) 어떻게 끝났나(여파)'뿐이다. 1차세계대전은 하위 18건을 거느리면서 이 셋이 모두 0자였다.
 */
export function CollectionWholeTextNotice({
  onWriteSummary,
  onWriteBackground,
  onWriteAftermath,
}: {
  /** 요약도 비었으면 — 빈 요약 자리표시를 따로 세우지 않고 여기서 쓴다 */
  onWriteSummary?: () => void
  onWriteBackground: () => void
  onWriteAftermath: () => void
}) {
  return (
    <Notice role="note">
      <NoticeText>
        <b>전체에 대한 글이 비어 있습니다.</b> 전개는 하위 사건이 맡으니, 이 사건에는{' '}
        {onWriteSummary ? '무슨 일이었는지(요약)와 ' : ''}왜 일어났는지(배경)와 어떻게 끝났는지(여파)를 씁니다.
      </NoticeText>
      <NoticeActions>
        {onWriteSummary && (
          <TextButton type="button" onClick={onWriteSummary}>
            요약 쓰기
          </TextButton>
        )}
        <TextButton type="button" onClick={onWriteBackground}>
          배경 쓰기
        </TextButton>
        <TextButton type="button" onClick={onWriteAftermath}>
          여파 쓰기
        </TextButton>
      </NoticeActions>
    </Notice>
  )
}

const Notice = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 16px;
  max-width: ${S.PROSE_WIDTH}px;
  padding: 10px 14px;
  border-radius: ${RADIUS.SM};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
`

const NoticeText = styled.p`
  flex: 1 1 320px;
  margin: 0;
  font-size: 13.5px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};

  b {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const NoticeActions = styled.div`
  display: flex;
  gap: 14px;
`
