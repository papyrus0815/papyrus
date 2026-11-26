import { type RefObject, useRef, useState } from 'react'

import { FiLink2, FiPlus, FiX } from 'react-icons/fi'

import { eventDomainDef } from '@/entities/event/model/event-domain'
import { type UpdateEventDto } from '@/shared/api/events'
import { formatDateRange } from '@/pages/events/utils/events.utils'
import { pathKeys } from '@/shared/router'
import { InlineText } from '@/shared/ui/inline-edit'

import * as S from '../styles'
import { type EventDetail, usePrefetchEventDetail } from '../use-event-detail'
import { REASON_MAX, focusNextRemovalTarget } from './detail-network.lib'
import * as NetStyles from './detail-network.styles'

/**
 * 하위 사건 표시 상한 — 초과분은 '더 보기'로 펼침. 같은 하위 목록이 개요 › 전개와 조망에도 있어
 * 연관에서는 연결 사유 관리에 필요한 만큼만 먼저 보인다(1차대전 18행이 1,387px였다).
 */
const CHILD_CARD_CAP = 6

/** 추가 하위(역방향 엣지) 칩 표시 상한 — 카드보다 밀도 높은 칩이라 별도 상한. */
const EXTRA_CHILD_CAP = 12

interface ChildrenBlockProps {
  /** 시간순 정렬된 하위 사건 목록 — 컨테이너가 patch 조립(childIdsRef)과 같은 원본을 내려준다. */
  childEvents: EventDetail[]
  /** 추가 하위(역방향 엣지) — 읽기전용 표시. 편집은 자식 사건 쪽에서만. */
  extraChildren: NonNullable<EventDetail['extraChildren']>
  onPatch: (patch: UpdateEventDto) => void
  /** 마지막 하위 사건 제거 시 포커스를 넘길 구역 헤더 버튼 ref */
  addButtonRef?: RefObject<HTMLButtonElement | null>
  /** 빈 상태에서 바로 새 하위 등록 모달 열기 */
  onOpenCreateChild?: () => void
  /** 빈 상태에서 바로 기존 사건 모으기 모달 열기 */
  onOpenGather?: () => void
}

/**
 * 하위 사건 블록 — 시간순 플랫 리스트 행(+연결 사유) + 추가 하위(역방향 엣지) 읽기전용 칩 행.
 * 주요 추가 실행 버튼은 NetworkZone 헤더 우측 슬롯이 맡는다.
 */
export function ChildrenBlock({
  childEvents,
  extraChildren,
  onPatch,
  addButtonRef,
  onOpenCreateChild,
  onOpenGather,
}: ChildrenBlockProps) {
  const prefetchEvent = usePrefetchEventDetail()

  const [showAllChildren, setShowAllChildren] = useState(false)
  const visibleChildren = showAllChildren
    ? childEvents
    : childEvents.slice(0, CHILD_CARD_CAP)
  const hiddenChildCount = childEvents.length - visibleChildren.length

  const [showAllExtraChildren, setShowAllExtraChildren] = useState(false)
  const visibleExtraChildren = showAllExtraChildren
    ? extraChildren
    : extraChildren.slice(0, EXTRA_CHILD_CAP)
  const hiddenExtraChildCount = extraChildren.length - visibleExtraChildren.length

  const childRemoveRefs = useRef(new Map<string, HTMLButtonElement>())

  const childIds = childEvents.map((child) => child.id)

  const [reasonDraftId, setReasonDraftId] = useState<string | null>(null)

  const removeChild = (childId: string) => {
    focusNextRemovalTarget(
      childRemoveRefs.current,
      childIds,
      childId,
      addButtonRef?.current ?? null,
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
      {/* 하위 사건 — 시간순 플랫 리스트 행 + 추가/제거 */}
      <NetStyles.HierBlock role="group" aria-labelledby="network-children-label">
        {/* 칸 머리(하위 사건)가 이미 말한다 — 화면엔 한 번, 읽기 도구엔 묶음 이름으로 */}
        <NetStyles.VisuallyHidden id="network-children-label">하위 사건</NetStyles.VisuallyHidden>
        {childEvents.length > 0 && (
          <NetStyles.ChildList>
            {visibleChildren.map((child) => {
              const category = eventDomainDef(child.domain)
              const dateLabel =
                child.startDate &&
                formatDateRange(
                  child.startDate,
                  child.endDate ?? undefined,
                  child.startDatePrecision,
                  child.endDatePrecision,
                )
              const hasReason = Boolean(child.reason?.trim())
              return (
                <NetStyles.ChildRow key={child.id}>
                  <NetStyles.ChildCard
                    to={pathKeys.events.detail(child.id)}
                    viewTransition
                    onMouseEnter={() => prefetchEvent(child.id)}
                    onFocus={() => prefetchEvent(child.id)}
                  >
                    {/* 킥커 — 글리프 소프트 디스크 + 날짜(없으면 분야명 폴백). */}
                    <NetStyles.ChildEyebrow $cat={category}>
                      <span aria-hidden><category.Icon /></span>
                      {dateLabel || category.label}
                    </NetStyles.ChildEyebrow>
                    {/* 요약은 내지 않는다 — 같은 하위 사건을 개요 '전개'가 요약과 함께 읽히고, 여기는
                        연결을 관리하는 자리(사유·해제)다. 같은 글이 두 탭에 두 줄씩 서 있었다. */}
                    <NetStyles.ChildBody>
                      <NetStyles.ChildTitle>{child.title}</NetStyles.ChildTitle>
                    </NetStyles.ChildBody>
                  </NetStyles.ChildCard>
                  {/* ✕보다 먼저 — 화면에서 왼쪽에 서므로 Tab 순서도 앞. */}
                  {!hasReason && reasonDraftId !== child.id && (
                    <NetStyles.AddReasonBtn
                      type="button"
                      data-reason-add
                      onClick={() => setReasonDraftId(child.id)}
                      aria-label={`'${child.title}' 연결 사유 추가`}
                    >
                      <FiPlus aria-hidden /> 사유
                    </NetStyles.AddReasonBtn>
                  )}
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
                  {/* 연결 사유 — 링크(a) 바깥 형제로 배치(a 안에 button/textarea 중첩 금지).
                      onPatch({ childLinkReasons })는 자기 사건 채널이라 undo 토스트 탑승. */}
                  {(hasReason || reasonDraftId === child.id) && (
                    <NetStyles.ChildReasonRow
                      onBlur={(blurEvent) => {
                        const next = blurEvent.relatedTarget as Node | null
                        if (next && blurEvent.currentTarget.contains(next)) return
                        if (reasonDraftId === child.id) setReasonDraftId(null)
                      }}
                      onKeyDown={(keyEvent) => {
                        /*
                         * Esc 취소는 입력칸을 **떼어 내므로** blur가 오지 않는다 — 빈 '연결 사유
                         * 추가' 줄이 남았다. 직접 닫고, 되살아난 '사유' 버튼으로 포커스를 돌린다.
                         */
                        if (keyEvent.key !== 'Escape' || reasonDraftId !== child.id) return
                        const rowNode = keyEvent.currentTarget.closest('li')
                        setReasonDraftId(null)
                        requestAnimationFrame(() =>
                          rowNode
                            ?.querySelector<HTMLButtonElement>('[data-reason-add]')
                            ?.focus(),
                        )
                      }}
                    >
                      <InlineText
                        value={child.reason ?? ''}
                        onSave={(next) => saveChildReason(child.id, next)}
                        placeholder="연결 사유 추가"
                        label={`'${child.title}' 연결 사유`}
                        multiline
                        maxLength={REASON_MAX}
                        showCount
                        style={{ flex: 1 }}
                        autoEdit={!hasReason}
                      />
                    </NetStyles.ChildReasonRow>
                  )}
                </NetStyles.ChildRow>
              )
            })}
          </NetStyles.ChildList>
        )}
        {hiddenChildCount > 0 && (
          <NetStyles.MoreBtn
            type="button"
            onClick={() => setShowAllChildren(true)}
            aria-label={`하위 사건 ${hiddenChildCount}개 더 보기`}
          >
            외 {hiddenChildCount}개 더 보기 · 시간 흐름은 개요의 전개에서
          </NetStyles.MoreBtn>
        )}
        {showAllChildren && childEvents.length > CHILD_CARD_CAP && (
          <NetStyles.MoreBtn
            type="button"
            onClick={() => setShowAllChildren(false)}
            aria-label="하위 사건 목록 접기"
          >
            접기 ({CHILD_CARD_CAP}개만 표시)
          </NetStyles.MoreBtn>
        )}
        {childEvents.length === 0 && (
          <S.EmptyGuide>
            <S.EmptyGuideBody>
              <S.EmptyGuideTitle>아직 연결된 하위 사건이 없습니다</S.EmptyGuideTitle>
              <S.EmptyGuideDesc>
                전투·회담·협정 같은 하위 사건을 새로 등록하거나 이미 등록된 사건들을 모아 연결할 수 있습니다.
              </S.EmptyGuideDesc>
            </S.EmptyGuideBody>
            {(onOpenCreateChild || onOpenGather) && (
              <S.EmptyGuideActions>
                {onOpenCreateChild && (
                  <S.EmptyPrimaryAction type="button" onClick={onOpenCreateChild}>
                    <FiPlus aria-hidden />
                    새 하위 사건 등록
                  </S.EmptyPrimaryAction>
                )}
                {onOpenGather && (
                  <S.EmptySecondaryAction type="button" onClick={onOpenGather}>
                    <FiLink2 aria-hidden />
                    기존 사건 모으기
                  </S.EmptySecondaryAction>
                )}
              </S.EmptyGuideActions>
            )}
          </S.EmptyGuide>
        )}
      </NetStyles.HierBlock>

      {/* 추가 하위(역방향 엣지) — 이 사건을 '추가 상위'로 갖는 사건들. 읽기전용 —
          엣지 편집은 자식 사건 쪽으로 단일화(양방향 쓰기 지면은 계약 혼선·경합 유발). */}
      {extraChildren.length > 0 && (
        <NetStyles.HierBlock role="group" aria-labelledby="network-extra-children-label">
          <NetStyles.BlockLabel id="network-extra-children-label">
            추가 하위
          </NetStyles.BlockLabel>
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
              <NetStyles.MoreBtn
                type="button"
                onClick={() => setShowAllExtraChildren(true)}
                aria-label={`추가 하위 ${hiddenExtraChildCount}개 더 보기`}
              >
                외 {hiddenExtraChildCount}개 더 보기
              </NetStyles.MoreBtn>
            )}
            {showAllExtraChildren && extraChildren.length > EXTRA_CHILD_CAP && (
              <NetStyles.MoreBtn
                type="button"
                onClick={() => setShowAllExtraChildren(false)}
                aria-label="추가 하위 목록 접기"
              >
                접기
              </NetStyles.MoreBtn>
            )}
          </NetStyles.KeywordsRow>
          <NetStyles.HelperNote>연결 편집은 해당 사건의 &lsquo;추가 상위&rsquo;에서</NetStyles.HelperNote>
        </NetStyles.HierBlock>
      )}
    </>
  )
}
