import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '@/lib/auth-context'
import { PageHeader } from '@/components/page-header'
import { getApiBaseURL } from '@/lib/api'
import { Tokens } from '@/constants/theme'

export default function SettingsScreen() {
  const { signOut } = useAuth()

  function handleLogout() {
    Alert.alert('로그아웃', '정말 로그아웃하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
    ])
  }

  return (
    <View style={styles.root}>
      <PageHeader title="설정" />
      <View style={{ padding: 16, gap: 16 }}>
        <View style={styles.section}>
          <Text style={styles.label}>API 서버</Text>
          <Text style={styles.value}>{getApiBaseURL() ?? '(미설정)'}</Text>
        </View>

        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Tokens.surface.canvas },
  section: {
    backgroundColor: Tokens.surface.raised,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Tokens.border.subtle,
    gap: 4,
  },
  label: { fontSize: 12, color: Tokens.text.muted },
  value: { fontSize: 14, color: Tokens.text.primary, fontFamily: 'monospace' },
  logoutBtn: { backgroundColor: Tokens.accent.red, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  logoutText: { color: Tokens.text.inverse, fontWeight: '600' },
})
