import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SessionState {
  token: string | null
  username: string | null
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
        console.log('💾 세션 설정 시작:', {
          token: state.token ? '***' : null,
          username: state.username,
        })

        set({ token: state.token, username: state.username })

        // 설정 후 즉시 확인
        setTimeout(() => {
          const currentState = useSessionStore.getState()
          console.log('🔍 세션 설정 후 상태 확인:', {
            token: currentState.token ? '***' : null,
            username: currentState.username,
          })
        }, 0)
      },
      reset: () => set({ token: null, username: null }),
    }),
    {
      name: 'session-storage',
      // 토큰만 localStorage에 저장
      partialize: (state) => ({ token: state.token }),
    },
  ),
)
