import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '@/lib/auth-context'

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
      <View style={styles.section}>
        <Text style={styles.label}>API 서버</Text>
        <Text style={styles.value}>{process.env.EXPO_PUBLIC_API_BASE_URL ?? '(미설정)'}</Text>
      </View>

      <Pressable style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, gap: 16 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 4 },
  label: { fontSize: 12, color: '#64748b' },
  value: { fontSize: 14, color: '#0f172a', fontFamily: 'monospace' },
  logoutBtn: { backgroundColor: '#dc2626', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  logoutText: { color: '#fff', fontWeight: '600' },
})
