/**
 * 좌측 패널 접기/펼치기 상태 — localStorage로 세션 간 유지.
 *
 * 뷰마다 storageKey를 다르게 주면 각자 독립 상태를 갖는다.
 * defaultCollapsed로 처음 진입 시 기본값을 정한다(저장값이 없을 때만 적용).
 *
 * ⚠️ storageKey는 **런타임에 바뀔 수 있다**. 셸이 ContentLayout으로 올라가 지면 간에
 * 살아남게 되면서, 같은 훅 인스턴스가 국가→가문→사건으로 키를 갈아탄다. 마운트 때 한 번만
 * 읽으면 이전 지면의 접힘 상태가 그대로 끌려오고, 사건의 `defaultCollapsed`도 먹지 않는다.
 * 그래서 키가 바뀌면 렌더 중에 다시 읽는다(React가 권장하는 'props로부터 파생된 state'
 * 갱신 — effect로 미루면 한 프레임 잘못된 폭으로 그려진다).
 */
import { useCallback, useState } from 'react'

const DEFAULT_STORAGE_KEY = 'country-list-collapsed'

function readCollapsed(storageKey: string, defaultCollapsed: boolean): boolean {
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved === null) return defaultCollapsed
    return JSON.parse(saved) === true
  } catch {
    return defaultCollapsed
  }
}

export interface UseListCollapsedOptions {
  storageKey?: string
  defaultCollapsed?: boolean
}

export function useListCollapsed(options: UseListCollapsedOptions = {}): {
  collapsed: boolean
  toggle: () => void
  set: (value: boolean) => void
} {
  const { storageKey = DEFAULT_STORAGE_KEY, defaultCollapsed = false } = options

  const [state, setState] = useState<{ key: string; collapsed: boolean }>(() => ({
    key: storageKey,
    collapsed: readCollapsed(storageKey, defaultCollapsed),
  }))

  // 키가 바뀌었으면(=다른 지면으로 이동) 그 지면의 저장값으로 즉시 교체
  if (state.key !== storageKey) {
    setState({
      key: storageKey,
      collapsed: readCollapsed(storageKey, defaultCollapsed),
    })
  }
  const collapsed =
    state.key === storageKey
      ? state.collapsed
      : readCollapsed(storageKey, defaultCollapsed)
  const setCollapsed = useCallback(
    (updater: boolean | ((previous: boolean) => boolean)) => {
      setState((previous) => ({
        key: previous.key,
        collapsed:
          typeof updater === 'function' ? updater(previous.collapsed) : updater,
      }))
    },
    [],
  )

  const persist = useCallback(
    (next: boolean) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        // localStorage 쓰기 실패 시 무시 (Safari 프라이빗 모드 등)
      }
    },
    [storageKey],
  )

  const toggle = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous
      persist(next)
      return next
    })
  }, [persist, setCollapsed])

  const set = useCallback(
    (value: boolean) => {
      setCollapsed(value)
      persist(value)
    },
    [persist, setCollapsed],
  )

  return { collapsed, toggle, set }
}
