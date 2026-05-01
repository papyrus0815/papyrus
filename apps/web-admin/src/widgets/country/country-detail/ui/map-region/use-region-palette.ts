import {
  type MapRegionSectionPalette,
  getMapRegionSectionPalette,
} from '@/shared/styles/country-detail-palette'
import { useThemeStore } from '@/shared/styles/theme.store'

export type RegionPalette = MapRegionSectionPalette & {
  isDark: boolean
}

/**
 * 행정구역/자연지리/인프라 뷰가 공유하는 토큰 + 다크모드 플래그.
 * 3개 뷰가 각자 14줄짜리 색상 변수를 복붙하던 중복을 한 곳으로.
 */
export function useRegionPalette(): RegionPalette {
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'
  return { ...getMapRegionSectionPalette(isDark), isDark }
}
