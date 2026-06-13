import { queryClient } from '@/shared/queryClient'
import { notify } from '@/shared/ui/toast'

import { invalidateGamification } from './gamification.api'

/** 완성도 보너스 신호당 점수 (백엔드 point.policy.COMPLETENESS_SIGNAL_POINTS와 일치) */
export const COMPLETENESS_SIGNAL_POINTS = 5

/**
 * 콘텐츠 등록 직후 호출 — 게이미피케이션 쿼리를 갱신하고, 완성도 보너스를 받았으면
 * 구분된 토스트로 즉시 피드백한다. (등록 경로가 훅/직접호출로 흩어져 있어 공용 singleton
 * queryClient를 사용 — 어디서든 호출 가능)
 *
 * @param completenessSignals 채워진 완성도 신호 개수(사진·설명 등). 0이면 보너스 토스트 생략.
 */
export function onContentRegistered(completenessSignals: number): void {
  invalidateGamification(queryClient)
  if (completenessSignals > 0) {
    const pts = completenessSignals * COMPLETENESS_SIGNAL_POINTS
    notify.show(`✨ 알차게 채워 +${pts} 완성도 보너스!`, { icon: '📝', duration: 4000 })
  }
}
