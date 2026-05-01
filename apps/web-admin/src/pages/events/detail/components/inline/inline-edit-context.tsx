/**
 * 페이지 안에서 *동시에 열린 InlineRichText 에디터는 1개로 제한*하기 위한 Context.
 *
 * - 각 InlineRichText는 useId로 고유 ID를 받고, 열릴 때 `setActive(id)` 호출.
 * - 다른 에디터가 열리면 `activeId`가 바뀌어 이전 에디터의 `editing`이 false가 됨.
 * - `editing`이 false로 떨어지면 컴포넌트 내부 useEffect가 draft를 server value로
 *   되돌려 *암묵적 폐기*. 사용자는 명시 저장 버튼으로만 commit.
 *
 * 짧은 inline text/select는 blur로 즉시 저장되므로 이 coordinator를 거치지 않는다.
 */
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

interface InlineEditContextValue {
  activeId: string | null
  setActive: (id: string | null) => void
}

const InlineEditContext = createContext<InlineEditContextValue>({
  activeId: null,
  setActive: () => {},
})

export function InlineEditProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const setActive = useCallback((id: string | null) => {
    setActiveId(id)
  }, [])

  const value = useMemo(
    () => ({ activeId, setActive }),
    [activeId, setActive],
  )

  return (
    <InlineEditContext.Provider value={value}>
      {children}
    </InlineEditContext.Provider>
  )
}

export function useInlineEditCoordinator(id: string) {
  const { activeId, setActive } = useContext(InlineEditContext)
  const editing = activeId === id

  const open = useCallback(() => setActive(id), [id, setActive])
  const close = useCallback(() => {
    /* 자기가 active인 경우에만 풀어준다 — 다른 에디터가 가로챈 직후 본인의
       close가 들어오더라도(예: useEffect cleanup) 새 에디터를 끄지 않도록. */
    if (activeId === id) setActive(null)
  }, [id, activeId, setActive])

  return { editing, open, close }
}
