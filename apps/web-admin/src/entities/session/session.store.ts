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
        set({ token: state.token, username: state.username })
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
