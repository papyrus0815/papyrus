/**
 * 목록 스크롤 위치 복원 — 상세에서 **뒤로가기**로 돌아오면 떠날 때의 자리로.
 *
 * 스크롤 컨테이너가 window가 아니라 목록 카드(`[data-list-scroller]`)라 브라우저의
 * 기본 복원이 닿지 않는다. 라우트가 바뀌면 페이지가 언마운트되므로 돌아오면 늘 0에서
 * 시작했고, `?event=` 선택 복원은 그 행을 `nearest`로 화면 끝에 걸쳐 놓을 뿐이었다.
 *
 * - 키 = `location.key`. 같은 히스토리 항목으로 POP하면 react-router가 같은 key를
 *   돌려주므로 "그 항목에서 마지막으로 본 자리"가 된다. 새로 진입(PUSH)하면 복원하지 않는다.
 * - autoLoadAll이 페이지를 순차 소진하는 중이라 목표 높이가 아직 없을 수 있다 —
 *   행이 늘 때마다 재시도하고, 높이가 닿거나 로드가 끝나면(settled) 그 자리에서 멈춘다.
 * - 복원 대기 중 사용자가 먼저 스크롤하면(휠·터치·키) 복원을 포기한다 — 손을 이기지 않는다.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import { useLocation, useNavigationType } from 'react-router-dom'

const STORAGE_KEY = 'events-list-scroll'
/** 히스토리 항목마다 한 칸 — 오래된 항목은 잘라낸다. */
const MAX_ENTRIES = 30

type ScrollMap = Record<string, number>

function readMap(): ScrollMap {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' ? (parsed as ScrollMap) : {}
  } catch {
    return {}
  }
}

function writeEntry(historyKey: string, scrollTop: number) {
  try {
    const map = readMap()
    delete map[historyKey] // 재삽입해 '최근' 순서 끝으로
    map[historyKey] = scrollTop
    const keys = Object.keys(map)
    for (const staleKey of keys.slice(
      0,
      Math.max(0, keys.length - MAX_ENTRIES),
    )) {
      delete map[staleKey]
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // 저장 불가(사파리 프라이빗 등) — 복원만 못 할 뿐 목록은 정상
  }
}

interface ListScrollRestorationArgs {
  /** 렌더된 행 수 — 늘 때마다 복원을 재시도한다 */
  rowCount: number
  /** 더 받을 페이지가 없음(또는 실패) — 목표 높이에 못 닿아도 여기서 끝낸다 */
  settled: boolean
}

export function useListScrollRestoration({
  rowCount,
  settled,
}: ListScrollRestorationArgs) {
  const location = useLocation()
  const navigationType = useNavigationType()
  const historyKey = location.key

  // 마운트 시점에 한 번만 판정 — 이후의 replace(필터 URL 동기화)로 key가 바뀌어도 무관.
  const [initialTarget] = useState<number | null>(() => {
    if (navigationType !== 'POP') return null
    const saved = readMap()[historyKey]
    return typeof saved === 'number' && saved > 0 ? saved : null
  })
  const pendingRef = useRef<number | null>(initialTarget)

  // 복원 대기 중 사용자가 먼저 움직이면 포기
  useEffect(() => {
    if (pendingRef.current === null) return
    const cancel = () => {
      pendingRef.current = null
    }
    const options = { passive: true, capture: true } as const
    window.addEventListener('wheel', cancel, options)
    window.addEventListener('touchstart', cancel, options)
    window.addEventListener('keydown', cancel, options)
    return () => {
      window.removeEventListener('wheel', cancel, options)
      window.removeEventListener('touchstart', cancel, options)
      window.removeEventListener('keydown', cancel, options)
    }
  }, [])

  useEffect(() => {
    if (pendingRef.current === null) return
    const frame = requestAnimationFrame(() => {
      const target = pendingRef.current
      if (target === null) return
      const scroller = document.querySelector<HTMLElement>(
        '[data-list-scroller]',
      )
      if (!scroller) return
      const maxScroll = scroller.scrollHeight - scroller.clientHeight
      if (maxScroll < target && !settled) return // 아직 높이가 모자람 — 다음 페이지에서 재시도
      pendingRef.current = null
      scroller.scrollTop = Math.min(target, Math.max(0, maxScroll))
    })
    return () => cancelAnimationFrame(frame)
  }, [rowCount, settled])

  // 저장 — 스크롤 이벤트당 한 번이 아니라 프레임당 한 번
  const saveFrameRef = useRef<number | null>(null)
  const lastScrollTopRef = useRef(0)
  const historyKeyRef = useRef(historyKey)
  historyKeyRef.current = historyKey
  const saveScrollPosition = useCallback((scrollTop: number) => {
    if (pendingRef.current !== null) return // 복원 전의 0을 저장해 목표를 덮지 않는다
    lastScrollTopRef.current = scrollTop
    if (saveFrameRef.current !== null) return
    saveFrameRef.current = requestAnimationFrame(() => {
      saveFrameRef.current = null
      writeEntry(historyKeyRef.current, lastScrollTopRef.current)
    })
  }, [])
  useEffect(
    () => () => {
      // 떠나는 순간 대기 중이던 프레임이 취소되면 마지막 위치가 유실된다 — 즉시 기록
      if (saveFrameRef.current !== null) {
        cancelAnimationFrame(saveFrameRef.current)
        writeEntry(historyKeyRef.current, lastScrollTopRef.current)
      }
    },
    [],
  )

  return {
    /** 뒤로가기 복원이 예정됨 — 선택 행 scrollIntoView가 이 위치를 덮지 않게 할 때 쓴다 */
    willRestore: initialTarget !== null,
    saveScrollPosition,
  }
}
