import { useEffect, useMemo, useState, type RefObject } from 'react'

import { FiChevronLeft, FiChevronRight, FiPlus, FiX } from 'react-icons/fi'
import { useQuery } from '@tanstack/react-query'

import { type UpdateEventDto, getEventsByParentId } from '@/shared/api/events'
import { pathKeys } from '@/shared/router'
import { InlineText } from '@/shared/ui/inline-edit'

import { type EventDetail, usePrefetchEventDetail } from '../use-event-detail'
import { REASON_MAX, compareEventStart } from './detail-network.lib'
import * as NetStyles from './detail-network.styles'

const REASON_PLACEHOLDER =
  '이 사건이 상위와 어떻게 이어지는지 한두 문장 (예: 병합을 서두르게 만든 직접적 계기)'

interface ParentBlockProps {
  event: EventDetail
  /** 추가 상위 목록 — 컨테이너의 patch 조립(extraIdsRef)과 같은 원본을 공유. */
  extraParents: NonNullable<EventDetail['extraParents']>
  onOpenParentModal: () => void
  onOpenExtrasModal: () => void
  onReleaseParent: () => void
  onPromoteExtraParent: (targetId: string) => void
  onRemoveExtraParent: (targetId: string) => void
  onPatch: (patch: UpdateEventDto) => void
  /** 추가 상위 칩 제거 버튼 ref 맵 — 컨테이너 removeExtraParent의 포커스 이양이 참조. */
  extraRemoveRefs: RefObject<Map<string, HTMLButtonElement>>
  /** 추가 상위 '추가' 버튼 ref — 마지막 칩 제거 시 포커스 폴백. */
  extrasAddRef: RefObject<HTMLButtonElement | null>
}

/**
 * 상위 사건 블록 — 주 상위 행(지정/변경/해제) + 연결 사유 + 추가 상위 칩 행
 * (사유 편집·승격·해제) + 형제(같은 상위) 네비.
 *
 * 상위 지정/해제의 confirm 연쇄·patch 조립은 컨테이너(detail-network) 몫 —
 * 이 블록은 표시와 로컬 UI 상태(사유 편집 펼침·형제 조회)만 가진다.
 */
export function ParentBlock({
  event,
  extraParents,
  onOpenParentModal,
  onOpenExtrasModal,
  onReleaseParent,
  onPromoteExtraParent,
  onRemoveExtraParent,
  onPatch,
  extraRemoveRefs,
  extrasAddRef,
}: ParentBlockProps) {
  const prefetchEvent = usePrefetchEventDetail()
  const parentEvent = event.parentEvent

  // 추가 상위 칩의 연결 사유 편집 라인 — 한 번에 하나만 펼침(칩 행 밀도 유지).
  const [openExtraReasonId, setOpenExtraReasonId] = useState<string | null>(null)
  const extraIds = useMemo(
    () => extraParents.map((extra) => extra.id),
    [extraParents],
  )
  // 사유 편집 open 상태가 해제된 칩 id로 잔존하면 같은 사건을 재연결할 때 편집 라인이
  // 유령처럼 재개방된다 — 현재 extras에 없는 id면 리셋.
  useEffect(() => {
    if (openExtraReasonId && !extraIds.includes(openExtraReasonId)) {
      setOpenExtraReasonId(null)
    }
  }, [extraIds, openExtraReasonId])

  /**
   * 연결 사유 저장 — 부분 업서트. 빈 문자열은 서버가 삭제로 정규화(행 제거).
   * parentLinkReasons: 이 사건이 자식인 쌍(주 상위·추가 상위). 링크가 실제로 있는
   * 쌍에만 유효 — UI는 이미 연결된 항목 옆에서만 편집을 노출한다.
   */
  const saveParentReason = (parentId: string, next: string) => {
    onPatch({
      parentLinkReasons: [{ parentEventId: parentId, reason: next }],
    } as UpdateEventDto)
  }

  /* 형제(같은 상위) 사건 — 하위 사건 상세에서 부모 왕복 없이 이전/다음으로 이동.
   * 상위가 있을 때만 조회. 부모의 하위 목록(미삭제)을 시간순 정렬해 현재 위치의 앞뒤를 잡는다. */
  const { data: siblings = [] } = useQuery({
    queryKey: ['events', 'siblings', event.parentEventId],
    queryFn: () => getEventsByParentId(event.parentEventId as string),
    enabled: Boolean(event.parentEventId),
    staleTime: 60_000,
  })
  const sortedSiblings = useMemo(
    () =>
      siblings
        .slice()
        .sort((first, second) =>
          compareEventStart(first.startDate, second.startDate),
        ),
    [siblings],
  )
  const siblingIndex = sortedSiblings.findIndex(
    (sibling) => sibling.id === event.id,
  )
  const prevSibling = siblingIndex > 0 ? sortedSiblings[siblingIndex - 1] : null
  const nextSibling =
    siblingIndex >= 0 && siblingIndex < sortedSiblings.length - 1
      ? sortedSiblings[siblingIndex + 1]
      : null

  return (
    <NetStyles.HierBlock role="group" aria-labelledby="network-parent-label">
      <NetStyles.KeywordsLabel id="network-parent-label">상위 사건</NetStyles.KeywordsLabel>
      <NetStyles.HierRow>
        {parentEvent ? (
          <>
            <NetStyles.ParentLink
              to={pathKeys.events.detail(parentEvent.id)}
              viewTransition
              onMouseEnter={() => prefetchEvent(parentEvent.id)}
            >
              {parentEvent.title}
            </NetStyles.ParentLink>
            <NetStyles.TextBtn
              type="button"
              onClick={onOpenParentModal}
              aria-label="상위 사건 변경"
            >
              변경
            </NetStyles.TextBtn>
            <NetStyles.TextBtn
              type="button"
              onClick={onReleaseParent}
              aria-label="상위 사건 해제"
            >
              해제
            </NetStyles.TextBtn>
          </>
        ) : (
          <NetStyles.AddBtn type="button" onClick={onOpenParentModal}>
            <FiPlus /> 상위 사건 지정
          </NetStyles.AddBtn>
        )}
      </NetStyles.HierRow>
      {/* 주 상위 연결 사유 — '왜 이 사건이 대표 상위와 이어지는가'. 주/부가 사용자에겐
          한 개념이라 대표 관계에도 사유를 적을 수 있게(비대칭 해소). */}
      {parentEvent && (
        <NetStyles.ReasonLine>
          <NetStyles.ReasonKicker>연결 사유</NetStyles.ReasonKicker>
          <InlineText
            value={event.parentLinkReason ?? ''}
            onSave={(next) => saveParentReason(parentEvent.id, next)}
            placeholder="연결 사유 추가"
            label={`'${parentEvent.title}' 연결 사유`}
            multiline
            maxLength={REASON_MAX}
            showCount
            style={{ flex: 1 }}
          />
        </NetStyles.ReasonLine>
      )}
      {/* 추가 상위 — 주 상위 외 다중 상위(EventParentLink). 트리·breadcrumb·형제는
          주 상위 기준이고, 이 칩 행이 다중 소속 발견성의 정본 지면. 편집(추가·해제·
          승격)은 자식인 이 사건 쪽에서만. */}
      <NetStyles.ExtraParentsRow>
        <NetStyles.ExtraInlineLabel id="network-extra-parents-label">
          추가 상위
        </NetStyles.ExtraInlineLabel>
        {extraParents.map((extra) => (
          <NetStyles.ExtraChip key={extra.id}>
            <NetStyles.ExtraChipLink
              to={pathKeys.events.detail(extra.id)}
              viewTransition
              onMouseEnter={() => prefetchEvent(extra.id)}
              onFocus={() => prefetchEvent(extra.id)}
              aria-describedby={
                extra.reason ? `extra-reason-${extra.id}` : undefined
              }
            >
              {extra.title || '(제목 동기화 중)'}
            </NetStyles.ExtraChipLink>
            {extra.reason && (
              <NetStyles.VisuallyHidden id={`extra-reason-${extra.id}`}>
                연결 사유: {extra.reason}
              </NetStyles.VisuallyHidden>
            )}
            <NetStyles.ReasonToggleBtn
              type="button"
              onClick={() =>
                setOpenExtraReasonId((cur) =>
                  cur === extra.id ? null : extra.id,
                )
              }
              aria-expanded={openExtraReasonId === extra.id}
              aria-controls={
                openExtraReasonId === extra.id
                  ? 'network-extra-reason-editor'
                  : undefined
              }
              aria-label={`추가 상위 '${extra.title}' 연결 사유 ${
                extra.reason ? '편집' : '추가'
              }`}
              $hasReason={Boolean(extra.reason)}
              title={extra.reason ?? undefined}
            >
              사유{extra.reason ? '•' : ''}
            </NetStyles.ReasonToggleBtn>
            <NetStyles.TextBtn
              type="button"
              onClick={() => onPromoteExtraParent(extra.id)}
              aria-label={`'${extra.title}'을(를) 대표 상위로 승격`}
              disabled={!parentEvent}
              title={!parentEvent ? '주 상위가 없어 승격 대신 상위 지정을 사용하세요' : undefined}
            >
              승격
            </NetStyles.TextBtn>
            <NetStyles.ChipX
              type="button"
              ref={(node) => {
                if (node) extraRemoveRefs.current.set(extra.id, node)
                else extraRemoveRefs.current.delete(extra.id)
              }}
              onClick={() => onRemoveExtraParent(extra.id)}
              aria-label={`추가 상위 '${extra.title}' 해제`}
            >
              <FiX />
            </NetStyles.ChipX>
          </NetStyles.ExtraChip>
        ))}
        <NetStyles.AddBtn
          type="button"
          ref={extrasAddRef}
          onClick={onOpenExtrasModal}
          disabled={!parentEvent}
          aria-describedby={
            !parentEvent ? 'network-extra-parents-helper' : undefined
          }
        >
          <FiPlus /> 추가
        </NetStyles.AddBtn>
        {!parentEvent && (
          <NetStyles.HelperNote id="network-extra-parents-helper">
            먼저 상위 사건을 지정하세요
          </NetStyles.HelperNote>
        )}
      </NetStyles.ExtraParentsRow>
      {/* 추가 상위 연결 사유 편집 라인 — 열린 칩 하나만. 칩 행 밀도를 지키려 별도 라인. */}
      {openExtraReasonId &&
        (() => {
          const openExtra = extraParents.find(
            (extra) => extra.id === openExtraReasonId,
          )
          if (!openExtra) return null
          return (
            <NetStyles.ReasonLine id="network-extra-reason-editor">
              <NetStyles.ReasonKicker>{openExtra.title} · 사유</NetStyles.ReasonKicker>
              <InlineText
                key={openExtra.id}
                value={openExtra.reason ?? ''}
                onSave={(next) => saveParentReason(openExtra.id, next)}
                placeholder={REASON_PLACEHOLDER}
                label={`'${openExtra.title}' 연결 사유`}
                multiline
                maxLength={REASON_MAX}
                showCount
                style={{ flex: 1 }}
              />
            </NetStyles.ReasonLine>
          )
        })()}
      {parentEvent && (prevSibling || nextSibling) && (
        <NetStyles.SiblingNav aria-label="형제 사건 이동">
          {prevSibling ? (
            <NetStyles.SiblingLink
              to={pathKeys.events.detail(prevSibling.id)}
              viewTransition
              onMouseEnter={() => prefetchEvent(prevSibling.id)}
              onFocus={() => prefetchEvent(prevSibling.id)}
              aria-label={`이전 형제 사건: ${prevSibling.title}`}
            >
              <FiChevronLeft aria-hidden />
              <NetStyles.SiblingText>{prevSibling.title}</NetStyles.SiblingText>
            </NetStyles.SiblingLink>
          ) : (
            <span />
          )}
          {nextSibling && (
            <NetStyles.SiblingLink
              to={pathKeys.events.detail(nextSibling.id)}
              viewTransition
              onMouseEnter={() => prefetchEvent(nextSibling.id)}
              onFocus={() => prefetchEvent(nextSibling.id)}
              aria-label={`다음 형제 사건: ${nextSibling.title}`}
              $alignEnd
            >
              <NetStyles.SiblingText>{nextSibling.title}</NetStyles.SiblingText>
              <FiChevronRight aria-hidden />
            </NetStyles.SiblingLink>
          )}
        </NetStyles.SiblingNav>
      )}
    </NetStyles.HierBlock>
  )
}
