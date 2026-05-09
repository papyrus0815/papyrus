import { useCallback, useState, type ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { Image, type ImageContentFit, type ImageStyle } from 'expo-image'

type Props = {
  /** 이미지 URI. null/undefined면 즉시 fallback 렌더 */
  uri?: string | null
  /** 컨테이너에 적용할 스타일 (보통 width/height/borderRadius) */
  style?: StyleProp<ViewStyle>
  /** 실제 Image 요소에 적용할 스타일 (style보다 우선) */
  imageStyle?: StyleProp<ImageStyle>
  /** 로드 실패·이미지 없음일 때 보여줄 컨텐츠 (아이콘 등) */
  fallback?: ReactNode
  /** expo-image contentFit (default: cover) */
  contentFit?: ImageContentFit
  /** transition ms */
  transition?: number
  /** 접근성 라벨 */
  accessibilityLabel?: string
}

/**
 * expo-image 래퍼 — uri 없거나 로드 실패 시 fallback을 보여줌.
 * 사용처: 인물 아바타, 사건 hero, 국가 thumb 등.
 */
export function AppImage({
  uri,
  style,
  imageStyle,
  fallback,
  contentFit = 'cover',
  transition = 120,
  accessibilityLabel,
}: Props) {
  const [errored, setErrored] = useState(false)
  const showFallback = !uri || errored

  const onError = useCallback(() => {
    setErrored(true)
  }, [])

  if (showFallback) {
    return <View style={[styles.fallbackBox, style]}>{fallback}</View>
  }

  return (
    <Image
      source={{ uri: uri! }}
      style={[style as StyleProp<ImageStyle>, imageStyle]}
      contentFit={contentFit}
      transition={transition}
      cachePolicy="memory-disk"
      onError={onError}
      accessibilityLabel={accessibilityLabel}
    />
  )
}

const styles = StyleSheet.create({
  fallbackBox: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
})
