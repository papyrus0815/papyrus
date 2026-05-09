import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Spacing } from '@/constants/theme'

/** 디테일 화면의 탭/섹션 로딩 indicator. */
export function PaneLoading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator />
    </View>
  )
}

const styles = StyleSheet.create({
  center: { paddingVertical: Spacing.xl, alignItems: 'center', justifyContent: 'center' },
})
