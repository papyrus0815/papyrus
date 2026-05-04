import { useState } from 'react'
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useAuth } from '@/lib/auth-context'

export default function LoginScreen() {
  const { signIn } = useAuth()
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!account.trim() || !password) {
      Alert.alert('입력 필요', '계정과 비밀번호를 입력하세요.')
      return
    }
    setSubmitting(true)
    try {
      await signIn(account.trim(), password)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? '로그인 실패'
      Alert.alert('로그인 실패', String(msg))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Papyrus</Text>
        <Text style={styles.subtitle}>역사 어드민 모바일</Text>

        <Text style={styles.label}>계정</Text>
        <TextInput
          style={styles.input}
          value={account}
          onChangeText={setAccount}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="account"
          editable={!submitting}
        />

        <Text style={styles.label}>비밀번호</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="password"
          editable={!submitting}
        />

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>로그인</Text>
          )}
        </Pressable>

        <Text style={styles.hint}>
          API: {process.env.EXPO_PUBLIC_API_BASE_URL ?? '(미설정)'}
        </Text>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 16, padding: 24, gap: 8 },
  title: { fontSize: 28, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginBottom: 16 },
  label: { fontSize: 13, color: '#334155', marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  button: { marginTop: 16, backgroundColor: '#0f172a', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  hint: { marginTop: 12, fontSize: 11, color: '#94a3b8', textAlign: 'center' },
})
