import { type ComponentType, useCallback, useEffect, useRef } from 'react'

import { useNavigate } from 'react-router-dom'

import {
  useRichTextProseClick,
  type UseRichTextProseClickOptions,
} from '@/shared/hooks/use-rich-text-prose-click'

import { RichTextReadView, type RichTextReadViewProps } from './rich-text-read-view'

/** 클릭·키보드로 활성화되는 본문 인라인 요소(용어/멘션/엔티티 링크). */
const INTERACTIVE_SELECTOR = '.term, .mention, .entity-link'

export type RichTextProseWithEntityClicksProps = RichTextReadViewProps &
  Pick<
    UseRichTextProseClickOptions,
    | 'onPersonClick'
    | 'samePersonId'
    | 'setTermTooltip'
    | 'setDynastyTooltip'
    | 'onPoliticalPartyClick'
    | 'samePoliticalPartyId'
  > & {
    /**
     * 기본은 `RichTextReadView`. 국가 상세 등에서는 `styled(RichTextReadView)`(예: HistoryArticleProse)를 넘김.
     */
    readViewAs?: ComponentType<RichTextReadViewProps>
  }

/**
 * 리치텍스트 **읽기 전용** + 엔티티·멘션 클릭을 한 번에 묶은 공용 뷰.
 *
 * - 표시: `RichTextReadView` / `formatRichTextForReadView`와 동일
 * - 클릭: `useRichTextProseClick` — 인물은 `onPersonClick`, 그 외 타입은 훅 내부에서 라우팅
 *
 * `RichTextReadView`만 쓰면 클릭 핸들러가 없음(의도적으로 dumb 컴포넌트). 이 컴포넌트가 그 연결을 담당.
 */
export function RichTextProseWithEntityClicks({
  readViewAs: ReadView = RichTextReadView,
  onPersonClick,
  samePersonId,
  setTermTooltip,
  setDynastyTooltip,
  onPoliticalPartyClick,
  samePoliticalPartyId,
  ...readViewProps
}: RichTextProseWithEntityClicksProps) {
  const navigate = useNavigate()
  const { handleProseClick } = useRichTextProseClick({
    navigate,
    onPersonClick,
    samePersonId,
    setTermTooltip,
    setDynastyTooltip,
    onPoliticalPartyClick,
    samePoliticalPartyId,
  })
  const hostRef = useRef<HTMLDivElement>(null)

  // dangerouslySetInnerHTML로 들어온 인라인 트리거 span은 기본적으로 포커스 불가라
  // 키보드·SR에서 도달할 수 없다(C1). 렌더 후 tabindex/role을 부여해 활성화 가능하게 만든다.
  // html이 바뀌면 새 span에 다시 부여.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    host.querySelectorAll(INTERACTIVE_SELECTOR).forEach((node) => {
      // 식별자 있는(실제 활성화 가능한) 트리거만 포커스 대상으로 — 식별자 없는 잔여
      // span을 role=button으로 만들면 '눌러도 아무 일 없는 버튼'이라 오히려 SR에 해롭다.
      const actionable =
        node.hasAttribute('data-term-id') ||
        node.hasAttribute('data-id') ||
        node.hasAttribute('data-entity-id')
      if (!actionable) return
      if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '0')
      if (!node.hasAttribute('role')) node.setAttribute('role', 'button')
    })
  }, [readViewProps.html])

  // Enter/Space로 포커스된 트리거를 활성화 — 트리거 rect 좌표로 실제 클릭을 합성해
  // 기존 onClickCapture 경로(라우팅·툴팁)를 그대로 재사용한다.
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar')
      return
    const raw = event.target
    const interactive =
      raw instanceof Element ? raw.closest(INTERACTIVE_SELECTOR) : null
    if (!interactive) return
    event.preventDefault() // Space 페이지 스크롤 방지
    const rect = interactive.getBoundingClientRect()
    interactive.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: Math.round(rect.left + Math.min(rect.width, 24) / 2),
        clientY: Math.round(rect.bottom),
      }),
    )
  }, [])

  return (
    <div
      ref={hostRef}
      role="presentation"
      onClickCapture={handleProseClick}
      onKeyDown={handleKeyDown}
    >
      <ReadView {...readViewProps} />
    </div>
  )
}
