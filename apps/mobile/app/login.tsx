import { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { useAuth } from '@/lib/auth-context'
import { errorMessage } from '@/lib/error'
import { AppTextInput } from '@/components/app-text-input'
import { Elevation, Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'

export default function LoginScreen() {
  const { signIn } = useAuth()
  const tokens = useTokens()
  const styles = useMemo(() => makeStyles(tokens), [tokens])
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!account.trim() || !password) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      Alert.alert('입력 필요', '계정과 비밀번호를 입력하세요.')
      return
    }
    setSubmitting(true)
    try {
      await signIn(account.trim(), password)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      Alert.alert('로그인 실패', errorMessage(err, '로그인 실패'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.card}>
        <Text style={styles.title}>Papyrus</Text>
        <Text style={styles.subtitle}>역사 어드민 모바일</Text>

        <AppTextInput
          label="계정"
          containerStyle={styles.field}
          value={account}
          onChangeText={setAccount}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="account"
          editable={!submitting}
          returnKeyType="next"
        />

        <AppTextInput
          label="비밀번호"
          containerStyle={styles.field}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="password"
          editable={!submitting}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel="로그인"
          accessibilityState={{ disabled: submitting, busy: submitting }}
        >
          {submitting ? (
            <ActivityIndicator color={tokens.brand.onPrimary} />
          ) : (
            <Text style={styles.buttonText}>로그인</Text>
          )}
        </Pressable>

          <Text style={styles.hint}>
            API: {process.env.EXPO_PUBLIC_API_BASE_URL ?? '(미설정)'}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.surface.canvas },
    root: {
      flex: 1,
      backgroundColor: t.surface.canvas,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.lg,
    },
    card: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: t.surface.raised,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      gap: Spacing.sm,
      ...Elevation.card,
    },
    title: { ...Type.displayXl, color: t.text.primary },
    subtitle: { ...Type.captionSm, color: t.text.muted, marginBottom: Spacing.base },
    field: { marginTop: Spacing.sm },
    button: {
      marginTop: Spacing.base,
      backgroundColor: t.brand.primary,
      borderRadius: Radius.sm,
      paddingVertical: 14,
      alignItems: 'center',
      minHeight: 48,
      justifyContent: 'center',
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { ...Type.buttonSm, color: t.brand.onPrimary, fontWeight: '600', fontSize: 15 },
    hint: { ...Type.badge, fontWeight: '400', marginTop: Spacing.md, color: t.text.soft, textAlign: 'center' },
  })
}
