/**
 * 진영 결과 — 사건이 그 진영에게 어떻게 끝났나. 승패만이 아니다: 철수·결론 없음도 역사에선 흔한 끝이다.
 */
import type { SideOutcome } from '@/shared/api/event-sides'

export const SIDE_OUTCOME_LABEL: Record<SideOutcome, string> = {
  VICTORY: '승리',
  DEFEAT: '패배',
  DRAW: '무승부',
  WITHDRAWAL: '철수',
  INCONCLUSIVE: '결론 없음',
}

export const SIDE_OUTCOME_OPTIONS = (Object.keys(SIDE_OUTCOME_LABEL) as SideOutcome[]).map((value) => ({
  value,
  label: SIDE_OUTCOME_LABEL[value],
}))

