import { useCallback, useMemo, useRef, type ReactNode } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'
import { RectButton, Swipeable } from 'react-native-gesture-handler'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'

type Props = {
  children: ReactNode
  onDelete: () => void
  label?: string
  /** 너비 (default 80) */
  actionWidth?: number
}

/**
 * 좌측으로 swipe → 우측에 삭제 액션 노출.
 * iOS Mail/Notes 표준 패턴. swipe full-open 시 close하고 onDelete 호출.
 */
export function SwipeToDelete({ children, onDelete, label = '삭제', actionWidth = 80 }: Props) {
  const tokens = useTokens()
  const styles = useMemo(() => makeStyles(tokens, actionWidth), [tokens, actionWidth])
  const ref = useRef<Swipeable>(null)

  const renderRightActions = useCallback(() => {
    return (
      <View style={styles.actionContainer}>
        <RectButton
          style={styles.action}
          onPress={() => {
            ref.current?.close()
            onDelete()
          }}
        >
          <Ionicons name="trash-outline" size={22} color={tokens.brand.onPrimary} />
          <Text style={styles.actionLabel}>{label}</Text>
        </RectButton>
      </View>
    )
  }, [styles, label, onDelete, tokens])

  const onSwipeableOpen = useCallback(() => {
    if (Platform.OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }
  }, [])

  return (
    <Swipeable
      ref={ref}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
      enableTrackpadTwoFingerGesture
      onSwipeableOpen={onSwipeableOpen}
    >
      {children}
    </Swipeable>
  )
}

function makeStyles(t: TokenSet, actionWidth: number) {
  return StyleSheet.create({
    actionContainer: {
      width: actionWidth,
      flexDirection: 'row',
    },
    action: {
      flex: 1,
      backgroundColor: t.state.negative.fg,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingHorizontal: Spacing.sm,
    },
    actionLabel: { ...Type.badge, color: t.brand.onPrimary },
  })
}
