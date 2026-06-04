/**
 * body 스크롤 락 훅 (참조 카운트 방식).
 *
 * 여러 모달이 동시에 떠 있어도 안전하도록 모듈 레벨 카운터로 활성 락 수를 추적한다.
 * - 처음 락이 걸릴 때(0 → 1) `document.body.style.overflow`를 'hidden'으로 바꾸고
 *   이전 값을 보관한다.
 * - 마지막 락이 풀릴 때(1 → 0)만 보관해 둔 원래 값으로 복원한다.
 *
 * 훅은 조건부로 호출할 수 없으므로(React 규칙) `enabled` 인자를 받아
 * enabled일 때만 실제로 락을 건다.
 */
import { useEffect } from 'react'

/** 현재 활성화된 스크롤 락 수 (동시 다중 모달 안전 처리용) */
let lockCount = 0
/** 첫 락 직전의 body overflow 값 (마지막 락 해제 시 복원) */
let previousOverflow = ''

/**
 * @param enabled true일 때만 body 스크롤을 잠근다. false면 아무 동작도 하지 않음.
 */
export const useBodyScrollLock = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) return
    if (typeof document === 'undefined') return

    if (lockCount === 0) {
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    lockCount += 1

    return () => {
      lockCount -= 1
      if (lockCount <= 0) {
        lockCount = 0
        document.body.style.overflow = previousOverflow
      }
    }
  }, [enabled])
}
