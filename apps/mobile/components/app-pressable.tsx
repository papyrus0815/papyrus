import { forwardRef, useCallback, useRef } from 'react'
import {
  Animated,
  Platform,
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type View,
  type ViewStyle,
} from 'react-native'
import * as Haptics from 'expo-haptics'

type Props = Omit<PressableProps, 'style' | 'children'> & {
  /** 정적 스타일 (Pressable의 함수형 콜백 미지원 — scale로 press 표현) */
  style?: StyleProp<ViewStyle>
  /** 누름 시 scale 비율 (default 0.97) */
  scaleTo?: number
  /** iOS에서 selection 햅틱 발생 (default true) */
  haptic?: boolean
  /** 햅틱 강도 — 기본 selection. 'medium'은 강한 long-press용 */
  hapticStyle?: 'selection' | 'light' | 'medium'
  children?: React.ReactNode
}

/**
 * 진짜 앱 느낌의 Pressable.
 *  - 누르면 spring scale 0.97 → 1
 *  - iOS: selection haptic (10ms 미만, 가볍고 거슬리지 않음)
 *  - 기존 Pressable의 onPress/onLongPress/etc. 그대로 동작
 *  - 스타일은 정적만 (animation은 scale로 처리)
 *
 * 사용처: 카드, primary CTA, 큰 터치 타겟. 미세한 chip/icon button은 굳이 X.
 */
export const AppPressable = forwardRef<View, Props>(function AppPressable(
  {
    style,
    scaleTo = 0.97,
    haptic = true,
    hapticStyle = 'selection',
    onPressIn,
    onPressOut,
    onLongPress,
    children,
    ...rest
  },
  ref,
) {
  const scale = useRef(new Animated.Value(1)).current

  const handlePressIn = useCallback(
    (e: GestureResponderEvent) => {
      Animated.spring(scale, {
        toValue: scaleTo,
        useNativeDriver: true,
        speed: 50,
        bounciness: 0,
      }).start()
      if (haptic && Platform.OS === 'ios') {
        if (hapticStyle === 'selection') Haptics.selectionAsync()
        else if (hapticStyle === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      }
      onPressIn?.(e)
    },
    [scale, scaleTo, haptic, hapticStyle, onPressIn],
  )

  const handlePressOut = useCallback(
    (e: GestureResponderEvent) => {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 40,
        bounciness: 4,
      }).start()
      onPressOut?.(e)
    },
    [scale, onPressOut],
  )

  const handleLongPress = useCallback(
    (e: GestureResponderEvent) => {
      // long press 시 medium 햅틱 한 번 (열림 신호)
      if (haptic && Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      }
      onLongPress?.(e)
    },
    [haptic, onLongPress],
  )

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        ref={ref}
        {...rest}
        style={style}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={onLongPress ? handleLongPress : undefined}
      >
        {children}
      </Pressable>
    </Animated.View>
  )
})
