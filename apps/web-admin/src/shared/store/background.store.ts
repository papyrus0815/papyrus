import { create } from 'zustand'

interface BackgroundState {
  isEnabled: boolean
  toggleBackground: () => void
  setEnabled: (flag: boolean) => void
}

export const useBackgroundStore = create<BackgroundState>()((set) => ({
  isEnabled: false,
  toggleBackground: () => set((state) => ({ isEnabled: !state.isEnabled })),
  setEnabled: (flag: boolean) => set({ isEnabled: flag }),
}))
