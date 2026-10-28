import { Suspense, lazy, useMemo, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { FiLayers, FiLink2, FiPlus } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {
  RADIUS,
  ledgerAccent,
  ledgerAccentSubtle,
  ledgerBackground,
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
import { ExpandToggle, KindSwitch, NestedChildren, RegroupBar } from './collection-regroup'
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
  /** 펼친 묶음 하위 — 그 아래 하위를 이 자리에서 본다 */
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() => new Set())
  /** 골라서 묶기 — 켜면 번호 자리가 고르기 칸이 되고 아래에 묶기 막대가 붙는다 */
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set())
  /** 하위 사건 등록 모달의 상위 — 기본은 이 사건, 묶음 하위의 '이 묶음에 하위 추가'면 그 묶음 */
  const [createUnder, setCreateUnder] = useState<{ id: string; title: string } | null>(null)

  const toggleIn = (set: ReadonlySet<string>, id: string) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  }
  const stopSelecting = () => {
    setSelecting(false)
    setSelectedIds(new Set())
  }

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
            <TextButton type="button" onClick={onGatherExisting}>
              이미 있는 사건을 모으기
            </TextButton>
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
                  /* 추가 상위로만 이어진 하위는 이 묶음의 소유가 아니다 — 고르기·종류 바꾸기를 열지 않는다 */
                  const owned = !child.viaExtraLink
                  const expanded = expandedIds.has(child.id)
                  const checked = selectedIds.has(child.id)
                  return (
                    <Step key={child.id} data-selected={checked || undefined}>
                      {selecting && owned ? (
                        <StepCheck>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setSelectedIds((prev) => toggleIn(prev, child.id))}
                            aria-label={`${child.title} 고르기`}
                          />
                        </StepCheck>
                      ) : (
                        <StepIndex aria-hidden>{index + 1}</StepIndex>
                      )}
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
                              <DomainMeta>
                                <domain.Icon aria-hidden />
                                {domain.label}
                              </DomainMeta>
                            )}
                            {child.isCollection && (
                              <ExpandToggle
                                expanded={expanded}
                                title={child.title}
                                onToggle={() => setExpandedIds((prev) => toggleIn(prev, child.id))}
                              />
                            )}
                            {child.viaExtraLink && <span>추가 상위로 연결</span>}
                          </StepMeta>
                          {owned && !selecting && (
                            <StepTools>
                              <KindSwitch parentId={event.id} child={child} />
                            </StepTools>
                          )}
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
                        {child.isCollection && expanded && (
                          <NestedChildren
                            parentId={event.id}
                            collectionId={child.id}
                            collectionTitle={child.title}
                            onAddUnder={() => setCreateUnder({ id: child.id, title: child.title })}
                          />
                        )}
                      </StepBody>
                    </Step>
                  )
                })}
              </Steps>
            </PhaseGroup>
          ))}
          {/*
           * 다음 차례 — 추가는 목록 **끝**에 선다. 머리 오른쪽 버튼이던 시절엔 18건을 다 읽고 내려온 자리에서
           * 다시 위로 올라가야 했고, 새 하위가 어디에 붙는지(차례의 끝)도 말하지 못했다.
           * 번호 열에 '+' 노드를 세워 목록의 다음 줄처럼 읽히게 한다.
           */}
          {selecting ? (
            <RegroupBar
              parent={{ id: event.id, domain: event.domain }}
              selected={children.filter((child) => selectedIds.has(child.id))}
              candidates={children.filter((child) => child.isCollection && !child.viaExtraLink)}
              onDone={stopSelecting}
              onCancel={stopSelecting}
            />
          ) : (
          <NextStep>
            <AddChildRow type="button" onClick={() => setCreateOpen(true)}>
              <NextStepNode aria-hidden>
                <FiPlus />
              </NextStepNode>
              <AddChildText>
                <AddChildTitle>하위 사건 추가</AddChildTitle>
                <AddChildHint>{children.length + 1}번째 국면 — 전투·회담·조약을 차례 끝에</AddChildHint>
              </AddChildText>
            </AddChildRow>
            <NextStepTools>
              {children.some((child) => !child.viaExtraLink) && (
                <GatherButton type="button" onClick={() => setSelecting(true)}>
                  <FiLayers aria-hidden />
                  골라서 묶기
                </GatherButton>
              )}
              <GatherButton type="button" onClick={onGatherExisting}>
                <FiLink2 aria-hidden />
                기존 사건 모으기
              </GatherButton>
            </NextStepTools>
          </NextStep>
          )}
        </Phases>
      )}

      {(createOpen || createUnder) && (
        <Suspense fallback={null}>
          <LazyEventRegisterModal
            isOpen
            onClose={() => {
              setCreateOpen(false)
              setCreateUnder(null)
            }}
            initialParent={createUnder ?? { id: event.id, title: event.title }}
            onSaved={() => {
              invalidateEventQueries(queryClient, { eventId: event.id })
              if (createUnder) invalidateEventQueries(queryClient, { eventId: createUnder.id })
            }}
          />
        </Suspense>
      )}
    </S.Section>
  )
}

/**
 * 목록 끝 '다음 차례' 줄 — **비어 있는 다음 행**처럼 생겼다.
 *
 * 하위 사건 행(Step)과 같은 격자(번호 28px + 본문)·같은 세로 리듬이라, 번호 자리엔 강조색 '+' 노드,
 * 제목 자리엔 '하위 사건 추가'와 몇 번째 국면이 될지가 선다. 줄 전체가 누르는 자리(hover 면)이고,
 * 이미 있는 사건을 끌어오는 '모으기'는 같은 줄 오른쪽 끝의 보조 버튼이다.
 * 위 머리카락선은 마지막 행의 아래선이 맡고, 이 줄은 점선 아래선으로 '아직 비어 있는 자리'를 말한다.
 */
const NextStep = styled.div`
  display: flex;
  align-items: center;
  gap: 8px 12px;
  max-width: ${S.PROSE_WIDTH}px;
  /* Phases의 구획 간격(20px)을 되돌려 마지막 행에 붙인다 — 떨어져 있으면 목록 밖의 별도 버튼으로 읽힌다 */
  margin-top: -20px;
  border-bottom: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};

  /* 좁은 지면 — 추가 줄은 한 줄을 다 쓰고, 모으기는 그 아래 제목 열에서 시작(나란히 두면 설명이 낱말 중간에 꺾였다) */
  @container eventdetail (max-width: 639px) {
    flex-wrap: wrap;
  }
`

/** 줄 오른쪽 보조 동작 묶음 — 좁은 지면에선 아래 줄 제목 열에서 시작 */
const NextStepTools = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;

  @container eventdetail (max-width: 639px) {
    margin: -4px 0 10px 40px;
  }
`

const AddChildRow = styled.button`
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  /* 노드는 제목 첫 줄에 — 설명이 둘째 줄로 내려가도 '+'가 가운데로 끌려 내려가지 않게 */
  align-items: start;
  gap: 12px;
  /* 좌우 8px 안쪽 여백만큼 바깥으로 — 번호 열·제목 열이 위 행들과 같은 x에 선다 */
  margin: 0 0 0 -8px;
  padding: 10px 8px;
  border: none;
  border-radius: ${RADIUS.SM};
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.14s;

  @container eventdetail (max-width: 639px) {
    flex-basis: 100%;
  }

  &:hover {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
  }
`

/** 번호 자리의 '+' — 번호(우측 정렬)와 같은 오른쪽 끝, 강조색 면 원. hover에 채워진다 */
const NextStepNode = styled.span`
  justify-self: end;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  /* 제목 줄 상자(15px × 1.45 ≈ 22px)와 같은 높이 — 첫 줄 가운데에 선다 */
  margin-top: 0;
  border-radius: 50%;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  transition:
    background 0.14s,
    color 0.14s;

  svg {
    width: 13px;
    height: 13px;
    stroke-width: 2.5;
  }

  ${AddChildRow}:hover & {
    background: ${({ theme }) => ledgerAccent(theme.mode)};
    /* 채운 면의 전경은 지면색 — 다크 강조색은 밝은 인디고라 흰 글자가 묻힌다(ledger 규약) */
    color: ${({ theme }) => ledgerBackground(theme.mode)};
  }
`

const AddChildText = styled.span`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 10px;
  min-width: 0;
`

/** 행 제목(15px·700)과 같은 단 — 강조색이 '아직 없는 행'임을 말한다 */
const AddChildTitle = styled.span`
  font-size: 15px;
  font-weight: 700;
  line-height: 1.45;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

/** 행의 날짜·분야 줄과 같은 단(12px·metaText) */
const AddChildHint = styled.span`
  font-size: 12px;
  color: ${metaText};
  word-break: keep-all;
`

/** 보조 동작 — 이미 있는 사건을 이 묶음으로(연관 탭의 모으기). 테두리 알약, 줄 오른쪽 끝 */
const GatherButton = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition:
    color 0.14s,
    border-color 0.14s;

  svg {
    width: 13px;
    height: 13px;
  }
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.tertiary};
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
  position: relative;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 12px;
  padding: 9px 0;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  &:last-child {
    border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  }

  /* 고른 행 — 강조색 옅은 면(고르기 중에만 생긴다) */
  &[data-selected] {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
`

/** 고르기 칸 — 번호 자리(28px)에 오른쪽 정렬 */
const StepCheck = styled.label`
  display: flex;
  justify-content: flex-end;
  padding-top: 3px;

  input {
    width: 15px;
    height: 15px;
    margin: 0;
    accent-color: ${({ theme }) => ledgerAccent(theme.mode)};
    cursor: pointer;
  }
`

/**
 * 행 도구(개별|묶음) — 머리 줄 오른쪽 끝. 손이 닿을 때만 보인다(18행 모두에 상시면 목록이 도구로 덮인다).
 * 지금 묶음인 행은 날짜 줄의 '하위' 펼침 단추가 종류를 늘 말한다.
 */
const StepTools = styled.span`
  margin-left: auto;
  align-self: center;
  opacity: 0;
  transition: opacity 0.14s;

  ${Step}:hover &,
  ${Step}:focus-within & {
    opacity: 1;
  }
  @media (hover: none) {
    opacity: 1;
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

/** 분야 — 아이콘 + 이름. 예전 글자 글리프(⚔·✚)는 12px에서 '✕'·'+'로 읽혀 지우기·추가 버튼처럼 보였다 */
const DomainMeta = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;

  svg {
    width: 11px;
    height: 11px;
  }
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
  onWriteNarrative,
  onWriteAftermath,
}: {
  /** 요약도 비었으면 — 빈 요약 자리표시를 따로 세우지 않고 여기서 쓴다 */
  onWriteSummary?: () => void
  onWriteBackground: () => void
  /**
   * 단일 사건의 '아직 글이 없다' 안내로 쓸 때 — 단일 사건은 전개도 제 글이라 전개 쓰기가 붙는다.
   * (글이 하나도 없는 단일 사건 11건은 빈 요약 기울임 한 줄 + 칩 띠 + 그보다 큰 댓글 칸이 전부였다)
   */
  onWriteNarrative?: () => void
  onWriteAftermath: () => void
}) {
  const single = Boolean(onWriteNarrative)
  return (
    <Notice role="note">
      <NoticeText>
        {single ? (
          <>
            <b>아직 글이 없습니다.</b> 요약 한 문단으로 시작하거나, 배경·전개·여파로 나눠 씁니다.
          </>
        ) : (
          <>
            <b>전체에 대한 글이 비어 있습니다.</b> 전개는 하위 사건이 맡고, 이 사건에는{' '}
            {onWriteSummary ? '요약·배경·여파' : '배경·여파'}를 씁니다.
          </>
        )}
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
        {onWriteNarrative && (
          <TextButton type="button" onClick={onWriteNarrative}>
            전개 쓰기
          </TextButton>
        )}
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
  /* 한국어는 낱말 경계에서 줄을 바꾼다 — 안 그러면 '배 / 경'처럼 낱말이 잘린다 */
  word-break: keep-all;
  font-size: 13.5px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};

  b {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const NoticeActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
`
