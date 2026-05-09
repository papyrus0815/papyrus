import { Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'
import { Tokens } from '@/constants/theme'

type Props = {
  active: boolean
  onToggle: () => void
  /** 흰 hero 위에 떠 있을 때 'overlay', 일반 표면에 있을 때 'flat' */
  variant?: 'overlay' | 'flat'
  size?: number
  accessibilityLabel?: string
}

/**
 * Airbnb 위시리스트 하트 패턴.
 * - active: 빨간 채워진 하트
 * - inactive: 흰 외곽선 하트 (overlay variant) 또는 회색 외곽선 (flat)
 */
export function BookmarkHeart({
  active,
  onToggle,
  variant = 'overlay',
  size = 22,
  accessibilityLabel = '즐겨찾기',
}: Props) {
  const handlePress = () => {
    if (Platform.OS === 'ios') {
      void Haptics.impactAsync(
        active ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
      )
    }
    onToggle()
  }
  const inactiveColor = variant === 'overlay' ? '#fff' : Tokens.text.muted
  return (
    <Pressable
      onPress={handlePress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active }}
    >
      <View
        style={[
          styles.wrap,
          variant === 'overlay' && styles.wrapOverlay,
          { width: size + 16, height: size + 16, borderRadius: (size + 16) / 2 },
        ]}
      >
        <Ionicons
          name={active ? 'heart' : 'heart-outline'}
          size={size}
          color={active ? Tokens.accent.red : inactiveColor}
        />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  // overlay: hero 사진 위에 떠 있을 때 살짝 어두운 동그라미 백드롭으로 가독성 확보
  wrapOverlay: {
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
})
