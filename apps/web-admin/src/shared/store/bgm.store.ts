import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface BgmState {
  volume: number
  isMuted: boolean
  setVolume: (volume: number) => void
  setIsMuted: (isMuted: boolean) => void
  toggleMute: () => void
}

export const useBgmStore = create<BgmState>()(
  persist(
    (set) => ({
      volume: 0.5,
      isMuted: false,
      setVolume: (volume) => set({ volume }),
      setIsMuted: (isMuted) => set({ isMuted }),
      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
    }),
    {
      name: 'bgm-storage',
    },
  ),
)
