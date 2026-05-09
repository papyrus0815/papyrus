import { Component, useMemo, type ErrorInfo, type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'

type Props = {
  children: ReactNode
  fallback?: (err: Error, reset: () => void) => ReactNode
}

type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) {
      console.error('[ErrorBoundary]', error, info.componentStack)
    }
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    if (this.props.fallback) return this.props.fallback(error, this.reset)
    return <DefaultFallback error={error} onReset={this.reset} />
  }
}

function DefaultFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  const tokens = useTokens()
  const styles = useMemo(() => makeStyles(tokens), [tokens])
  return (
    <View style={styles.root}>
      <Text style={styles.title}>문제가 발생했어요</Text>
      <Text style={styles.subtitle}>화면을 그리는 중 오류가 났습니다.</Text>
      <ScrollView style={styles.errBox} contentContainerStyle={{ padding: 12 }}>
        <Text style={styles.errMsg}>{error.message}</Text>
        {!!error.stack && (
          <Text style={styles.errStack}>{error.stack.split('\n').slice(0, 8).join('\n')}</Text>
        )}
      </ScrollView>
      <Pressable style={styles.button} onPress={onReset}>
        <Text style={styles.buttonText}>다시 시도</Text>
      </Pressable>
    </View>
  )
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: t.surface.canvas,
      padding: 24,
      justifyContent: 'center',
      gap: 12,
    },
    title: { ...Type.displaySm, color: t.text.primary },
    subtitle: { ...Type.captionSm, color: t.text.muted },
    errBox: {
      maxHeight: 240,
      backgroundColor: t.surface.raised,
      borderWidth: 1,
      borderColor: t.border.subtle,
      borderRadius: Radius.sm,
    },
    errMsg: { ...Type.captionSm, color: t.text.danger, fontWeight: '600', marginBottom: Spacing.sm },
    errStack: { fontSize: 11, lineHeight: 14, color: t.text.muted, fontFamily: 'monospace' },
    button: {
      alignSelf: 'flex-start',
      backgroundColor: t.brand.primary,
      paddingHorizontal: Spacing.lg,
      paddingVertical: 12,
      borderRadius: Radius.sm,
      minHeight: 48,
      justifyContent: 'center',
    },
    buttonText: { ...Type.buttonSm, color: t.brand.onPrimary, fontWeight: '600' },
  })
}
