import type { ComponentType } from 'react'

import { useNavigate } from 'react-router-dom'

import {
  useRichTextProseClick,
  type UseRichTextProseClickOptions,
} from '@/shared/hooks/use-rich-text-prose-click'

import { RichTextReadView, type RichTextReadViewProps } from './rich-text-read-view'

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
  return (
    <div role="presentation" onClickCapture={handleProseClick}>
      <ReadView {...readViewProps} />
    </div>
  )
}
