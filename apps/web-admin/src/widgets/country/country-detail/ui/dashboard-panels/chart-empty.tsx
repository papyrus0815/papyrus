import type { ReactNode } from 'react'

import { SectionEmpty } from './section-empty'

interface Props {
  /** 하위 호환용 — 빈 차트 골격 대신 단일화된 SectionEmpty 레이아웃을 사용한다 */
  children?: ReactNode
  text: string
  actionLabel: string
  onAction: () => void
  hint?: string
}

/**
 * 차트·시각화 섹션의 빈 상태.
 *
 * 기존에는 반투명하게 잘린 빈 차트 골격 위에 부유 카드를 겹쳐 띄웠으나,
 * 차트 내부 소제목·눈금선과 안내 카드 글자가 겹쳐 시선이 분산되고 일반 빈 섹션(SectionEmpty)과
 * 높이가 3배 가까이 차이 나 그리드가 뒤틀렸다.
 * 모든 대시보드 빈 상태를 SectionEmpty 규격으로 단일화해 시각적 일관성과 정렬을 맞춘다.
 */
export function ChartEmpty({ text, actionLabel, onAction, hint }: Props) {
  return (
    <SectionEmpty
      text={text}
      actionLabel={actionLabel}
      onAction={onAction}
      hint={hint}
    />
  )
}
