import { useRef, useState } from 'react'

import { FiPlus, FiX } from 'react-icons/fi'

import { resolveCategory } from '@/pages/events/ledger/styles/ledger-tokens'
import { type UpdateEventDto } from '@/shared/api/events'
import { formatDateRange } from '@/pages/events/utils/events.utils'
import { pathKeys } from '@/shared/router'
import { InlineText } from '@/shared/ui/inline-edit'

import * as S from '../styles'
import { type EventDetail, usePrefetchEventDetail } from '../use-event-detail'
import { REASON_MAX, focusNextRemovalTarget } from './detail-network.lib'
import * as NetStyles from './detail-network.styles'

/** 하위 사건 카드 표시 상한 — 초과분은 '더 보기'로 펼침. */
const CHILD_CARD_CAP = 24

/** 추가 하위(역방향 엣지) 칩 표시 상한 — 카드보다 밀도 높은 칩이라 별도 상한. */
const EXTRA_CHILD_CAP = 12

interface ChildrenBlockProps {
  /** 시간순 정렬된 하위 사건 목록 — 컨테이너가 patch 조립(childIdsRef)과 같은 원본을 내려준다. */
  childEvents: EventDetail[]
  /** 추가 하위(역방향 엣지) — 읽기전용 표시. 편집은 자식 사건 쪽에서만. */
  extraChildren: NonNullable<EventDetail['extraChildren']>
  onPatch: (patch: UpdateEventDto) => void
  onOpenChildModal: () => void
  onOpenCreateChild: () => void
}

/**
 * 하위 사건 블록 — 시간순 카드 그리드(+연결 사유) + 추가/새로 만들기 버튼 행 +
 * 추가 하위(역방향 엣지) 읽기전용 칩 행.
 *
 * 하위 연결/이동의 confirm 연쇄(SelectModal 경유)는 컨테이너 몫 — 이 블록은
 * 카드 표시·직접 제거(X)·사유 편집만 가진다.
 */
export function ChildrenBlock({
  childEvents,
  extraChildren,
  onPatch,
  onOpenChildModal,
  onOpenCreateChild,
}: ChildrenBlockProps) {
  const prefetchEvent = usePrefetchEventDetail()

  // 하위 카드는 상한까지만 렌더(그 이상은 '더 보기'로 펼침) — 하위가 수십~수백인 상위
  // 사건에서 카드 그리드·hover prefetch가 무한 확장되지 않게(히어로의 참여자/국가 캡과 대칭).
  const [showAllChildren, setShowAllChildren] = useState(false)
  const visibleChildren = showAllChildren
    ? childEvents
    : childEvents.slice(0, CHILD_CARD_CAP)
  const hiddenChildCount = childEvents.length - visibleChildren.length

  /* 추가 하위(역방향 엣지) — 읽기전용 표시. 상한 초과분은 '더 보기'로 펼침. */
  const [showAllExtraChildren, setShowAllExtraChildren] = useState(false)
  const visibleExtraChildren = showAllExtraChildren
    ? extraChildren
    : extraChildren.slice(0, EXTRA_CHILD_CAP)
  const hiddenExtraChildCount = extraChildren.length - visibleExtraChildren.length

  /* 제거 버튼 포커스 이양용 ref — 카드를 지우면 포커스가 body로 낙하해 키보드
   * 흐름이 끊기므로, 제거 직전 다음 형제의 제거 버튼(없으면 '추가' 버튼)으로 옮긴다. */
  const childRemoveRefs = useRef(new Map<string, HTMLButtonElement>())
  const childAddRef = useRef<HTMLButtonElement | null>(null)

  const childIds = childEvents.map((child) => child.id)

  const removeChild = (childId: string) => {
    focusNextRemovalTarget(
      childRemoveRefs.current,
      childIds,
      childId,
      childAddRef.current,
    )
    onPatch({ childEventIds: childIds.filter((id) => id !== childId) })
  }

  /**
   * 연결 사유 저장 — 부분 업서트. 빈 문자열은 서버가 삭제로 정규화(행 제거).
   * childLinkReasons: 이 사건이 부모인 쌍(하위). 링크가 실제로 있는 쌍에만 유효.
   */
  const saveChildReason = (childId: string, next: string) => {
    onPatch({
      childLinkReasons: [{ childEventId: childId, reason: next }],
    } as UpdateEventDto)
  }

  return (
    <>
      {/* 하위 사건 — 카드 그리드 + 추가/제거 */}
      <NetStyles.HierBlock role="group" aria-labelledby="network-children-label">
        <NetStyles.KeywordsLabel id="network-children-label">하위 사건</NetStyles.KeywordsLabel>
        {childEvents.length > 0 && (
          <S.CardGrid $cols={2}>
            {visibleChildren.map((child) => {
              const category = resolveCategory(child.category?.name)
              const dateLabel =
                child.startDate &&
                formatDateRange(
                  child.startDate,
                  child.endDate ?? undefined,
                  child.startDatePrecision,
                  child.endDatePrecision,
                )
              return (
                <NetStyles.ChildCardWrap key={child.id}>
                  <NetStyles.ChildCard
                    to={pathKeys.events.detail(child.id)}
                    viewTransition
                    onMouseEnter={() => prefetchEvent(child.id)}
                    onFocus={() => prefetchEvent(child.id)}
                  >
                    <NetStyles.ChildBar style={{ background: category.color }} />
                    <NetStyles.ChildBody>
                      <NetStyles.ChildTitle>{child.title}</NetStyles.ChildTitle>
                      {dateLabel && <NetStyles.ChildMeta>{dateLabel}</NetStyles.ChildMeta>}
                      {child.description && (
                        <NetStyles.ChildDesc>{child.description}</NetStyles.ChildDesc>
                      )}
                    </NetStyles.ChildBody>
                  </NetStyles.ChildCard>
                  <NetStyles.RemoveChildBtn
                    type="button"
                    ref={(node) => {
                      if (node) childRemoveRefs.current.set(child.id, node)
                      else childRemoveRefs.current.delete(child.id)
                    }}
                    onClick={() => removeChild(child.id)}
                    aria-label={`${child.title} 하위 연결 해제`}
                  >
                    <FiX />
                  </NetStyles.RemoveChildBtn>
                  {/* 연결 사유 — 카드(Link) 바깥 형제로 배치(a 안에 button/textarea 중첩 금지).
                      onPatch({ childLinkReasons })는 자기 사건 채널이라 undo 토스트 탑승. */}
                  <NetStyles.ChildReasonRow>
                    <InlineText
                      value={child.reason ?? ''}
                      onSave={(next) => saveChildReason(child.id, next)}
                      placeholder="연결 사유 추가"
                      label={`'${child.title}' 연결 사유`}
                      multiline
                      maxLength={REASON_MAX}
                      showCount
                      style={{ flex: 1 }}
                    />
                  </NetStyles.ChildReasonRow>
                </NetStyles.ChildCardWrap>
              )
            })}
          </S.CardGrid>
        )}
        {hiddenChildCount > 0 && (
          <NetStyles.TextBtn
            type="button"
            onClick={() => setShowAllChildren(true)}
            aria-label={`하위 사건 ${hiddenChildCount}개 더 보기`}
          >
            외 {hiddenChildCount}개 더 보기
          </NetStyles.TextBtn>
        )}
        <NetStyles.HierRow>
          <NetStyles.AddBtn type="button" ref={childAddRef} onClick={onOpenChildModal}>
            <FiPlus /> 하위 사건 추가
          </NetStyles.AddBtn>
          <NetStyles.AddBtn type="button" onClick={onOpenCreateChild}>
            <FiPlus /> 새 하위 사건 만들기
          </NetStyles.AddBtn>
        </NetStyles.HierRow>
      </NetStyles.HierBlock>

      {/* 추가 하위(역방향 엣지) — 이 사건을 '추가 상위'로 갖는 사건들. 읽기전용 —
          엣지 편집은 자식 사건 쪽으로 단일화(양방향 쓰기 지면은 계약 혼선·경합 유발). */}
      {extraChildren.length > 0 && (
        <NetStyles.HierBlock role="group" aria-labelledby="network-extra-children-label">
          <NetStyles.KeywordsLabel id="network-extra-children-label">
            추가 하위
          </NetStyles.KeywordsLabel>
          <NetStyles.KeywordsRow>
            {visibleExtraChildren.map((extraChild) => (
              <NetStyles.ExtraChip key={extraChild.id}>
                <NetStyles.ExtraChipLink
                  to={pathKeys.events.detail(extraChild.id)}
                  viewTransition
                  onMouseEnter={() => prefetchEvent(extraChild.id)}
                  onFocus={() => prefetchEvent(extraChild.id)}
                  title={extraChild.reason ?? undefined}
                  aria-describedby={
                    extraChild.reason
                      ? `extra-child-reason-${extraChild.id}`
                      : undefined
                  }
                >
                  {extraChild.title}
                </NetStyles.ExtraChipLink>
                {extraChild.reason && (
                  <NetStyles.VisuallyHidden id={`extra-child-reason-${extraChild.id}`}>
                    연결 사유: {extraChild.reason}
                  </NetStyles.VisuallyHidden>
                )}
              </NetStyles.ExtraChip>
            ))}
            {hiddenExtraChildCount > 0 && (
              <NetStyles.TextBtn
                type="button"
                onClick={() => setShowAllExtraChildren(true)}
                aria-label={`추가 하위 ${hiddenExtraChildCount}개 더 보기`}
              >
                외 {hiddenExtraChildCount}개 더 보기
              </NetStyles.TextBtn>
            )}
          </NetStyles.KeywordsRow>
          <NetStyles.HelperNote>연결 편집은 해당 사건의 &lsquo;추가 상위&rsquo;에서</NetStyles.HelperNote>
        </NetStyles.HierBlock>
      )}
    </>
  )
}
