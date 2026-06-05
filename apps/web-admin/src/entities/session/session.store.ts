import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface SessionState {
  token: string | null
  username: string | null
}

/**
 * 로그인 상태 유지(rememberMe) 여부에 따라 저장소를 선택.
 * - true  → localStorage (브라우저 종료 후에도 유지)
 * - false → sessionStorage (탭/브라우저 종료 시 만료)
 * 로그인 직전 setSessionPersistMode(rememberMe)로 모드를 지정한다.
 */
// 초기값은 토큰이 실제로 어디 저장돼 있는지로 결정한다.
// (모듈 재로드 시 무조건 true로 떨어지면, sessionStorage 전용 토큰이
//  재수화 후 상태 변경 시점에 localStorage로 옮겨가는 누수가 생김)
let persistToLocal = !(
  typeof window !== 'undefined' &&
  window.sessionStorage.getItem('session-storage') !== null
)
export function setSessionPersistMode(rememberMe: boolean) {
  persistToLocal = rememberMe
}

// 두 저장소 어디에 있든 읽고, 쓸 때는 선택된 한 곳에만 두어 중복을 방지
const hybridStorage = {
  getItem: (name: string) =>
    localStorage.getItem(name) ?? sessionStorage.getItem(name),
  setItem: (name: string, value: string) => {
    if (persistToLocal) {
      localStorage.setItem(name, value)
      sessionStorage.removeItem(name)
    } else {
      sessionStorage.setItem(name, value)
      localStorage.removeItem(name)
    }
  },
  removeItem: (name: string) => {
    localStorage.removeItem(name)
    sessionStorage.removeItem(name)
  },
}

interface SessionActions {
  setSession: (state: SessionState) => void
  reset: () => void
}

type SessionStore = SessionState & SessionActions

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      token: null,
      username: null,
      setSession: (state) => {
        set({ token: state.token, username: state.username })
      },
      reset: () => set({ token: null, username: null }),
    }),
    {
      name: 'session-storage',
      storage: createJSONStorage(() => hybridStorage),
      // 토큰만 저장 (저장소는 rememberMe에 따라 결정)
      partialize: (state) => ({ token: state.token }),
    },
  ),
)
