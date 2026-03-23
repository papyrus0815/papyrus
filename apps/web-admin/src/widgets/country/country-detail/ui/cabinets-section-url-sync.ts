import { useCallback, useRef } from 'react'

import { useSearchParams } from 'react-router-dom'

/** 행정부 상세 딥링크 — `/government?cabinet=<uuid>&minister=<tenureId>` */
export const CABINET_QS = 'cabinet' as const
export const MINISTER_QS = 'minister' as const

export function buildCabinetSearchParams(
  prev: URLSearchParams,
  cabinetId: string | null,
  ministerId: string | null,
): URLSearchParams {
  const next = new URLSearchParams(prev)
  if (!cabinetId) {
    next.delete(CABINET_QS)
    next.delete(MINISTER_QS)
  } else {
    next.set(CABINET_QS, cabinetId)
    if (ministerId) {
      next.set(MINISTER_QS, ministerId)
    } else {
      next.delete(MINISTER_QS)
    }
  }
  return next
}

/** 탭 내 선택 상태와 브라우저 검색 파라미터를 맞춤 (Router 하위에서만 사용) */
export function useCabinetSectionUrlSync() {
  const [searchParams, setSearchParams] = useSearchParams()
  const lastPushedKeyRef = useRef<string | null>(null)

  const pushCabinetParams = useCallback(
    (
      cabinetId: string | null,
      ministerId: string | null,
      options?: { replace?: boolean },
    ) => {
      const key = `${cabinetId ?? ''}\t${ministerId ?? ''}`
      lastPushedKeyRef.current = key
      setSearchParams(
        (prev) => buildCabinetSearchParams(prev, cabinetId, ministerId),
        { replace: options?.replace ?? true },
      )
    },
    [setSearchParams],
  )

  return { searchParams, pushCabinetParams, lastPushedKeyRef }
}
