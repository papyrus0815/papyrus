import { useEffect } from 'react'

import { useCommandPaletteStore } from './command-palette.store'

/** ⌘K (Mac) / Ctrl+K (Win/Linux)로 국가 검색 팔레트 토글. */
export function useCommandPaletteShortcut() {
  const togglePalette = useCommandPaletteStore((s) => s.togglePalette)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isModK =
        (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')
      if (!isModK) return
      e.preventDefault()
      togglePalette()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePalette])
}
