import {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated'

/**
 * 디테일 화면 hero parallax용 공통 훅.
 * - 위로 스크롤 시 hero가 절반 속도로 위로 이동 + 페이드
 * - 아래로 당김(overscroll) 시 hero가 살짝 줌 (Apple Photos 패턴)
 */
export function useHeroParallax() {
  const scrollY = useSharedValue(0)
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y
    },
  })
  return { scrollY, onScroll }
}

/** scrollY를 받아 hero 영역에 적용할 transform/opacity 스타일을 반환. */
export function useHeroAnimatedStyle(scrollY: SharedValue<number>) {
  return useAnimatedStyle(() => {
    const y = scrollY.value
    const scale = y < 0 ? 1 + Math.min(0.4, -y / 240) : 1
    const translateY = y > 0 ? -y * 0.4 : 0
    const opacity = y > 0 ? Math.max(0.4, 1 - y / 280) : 1
    return {
      transform: [{ translateY }, { scale }],
      opacity,
    }
  })
}
