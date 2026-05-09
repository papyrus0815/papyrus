import { useMemo } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useAuth } from '@/lib/auth-context'
import { AppPressable } from '@/components/app-pressable'
import { PageHeader } from '@/components/page-header'
import { getApiBaseURL } from '@/lib/api'
import { useBookmarks } from '@/lib/bookmarks'
import { goBookmarks } from '@/lib/routes'
import { Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'

export default function SettingsScreen() {
  const { signOut } = useAuth()
  const router = useRouter()
  const { count: bookmarkCount } = useBookmarks('persons')
  const t = useTokens()
  const styles = useMemo(() => makeStyles(t), [t])

  function handleLogout() {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    Alert.alert('로그아웃', '정말 로그아웃하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
    ])
  }

  return (
    <View style={styles.root}>
      <PageHeader title="설정" />
      <View style={styles.body}>
        <AppPressable
          style={styles.row}
          onPress={() => goBookmarks(router)}
          accessibilityRole="button"
          accessibilityLabel="즐겨찾기 보기"
        >
          <View style={styles.rowIcon}>
            <Ionicons name="heart" size={20} color={t.text.primary} />
          </View>
          <Text style={styles.rowLabel}>즐겨찾기</Text>
          <Text style={styles.rowMeta}>{bookmarkCount}</Text>
          <Ionicons name="chevron-forward" size={18} color={t.text.soft} />
        </AppPressable>

        <View style={styles.section}>
          <Text style={styles.label}>API 서버</Text>
          <Text style={styles.value}>{getApiBaseURL() ?? '(미설정)'}</Text>
        </View>

        <AppPressable style={styles.logoutBtn} onPress={handleLogout} accessibilityRole="button" accessibilityLabel="로그아웃">
          <Text style={styles.logoutText}>로그아웃</Text>
        </AppPressable>
      </View>
    </View>
  )
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.surface.canvas },
    body: { padding: Spacing.base, gap: Spacing.base },
    section: {
      backgroundColor: t.surface.raised,
      borderRadius: Radius.md,
      padding: Spacing.base,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border.subtle,
      gap: Spacing.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: t.surface.raised,
      borderRadius: Radius.md,
      padding: Spacing.base,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border.subtle,
    },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: t.surface.pressed,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: { ...Type.titleMd, flex: 1, fontWeight: '600', color: t.text.primary },
    rowMeta: { ...Type.bodySm, color: t.text.muted, fontWeight: '600' },
    label: { ...Type.captionSm, fontSize: 12, color: t.text.muted },
    value: { ...Type.bodySm, color: t.text.primary, fontFamily: 'monospace' },
    logoutBtn: {
      backgroundColor: t.surface.raised,
      borderRadius: Radius.sm,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: t.state.negative.fg,
      minHeight: 48,
      justifyContent: 'center',
    },
    logoutText: { ...Type.buttonSm, color: t.state.negative.fg, fontWeight: '600' },
  })
}
