import { useMemo, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'

export type EmptyStateTone = 'default' | 'soft' | 'info' | 'warning'

type Props = {
  /** 메인 메시지 */
  title: string
  /** 보조 설명 */
  subtitle?: string
  /** 큰 아이콘 (Ionicons glyph) */
  icon?: keyof typeof Ionicons.glyphMap
  /** 톤 — 기본은 brand 잉크. soft/info/warning은 상황별 보조 톤 */
  tone?: EmptyStateTone
  /** 직접 그라데이션 색 두 가지 (tone 무시) */
  gradient?: readonly [string, string]
  /** CTA 버튼 라벨 */
  actionLabel?: string
  onAction?: () => void
  /** 추가 노드 (보조 액션 등) */
  children?: ReactNode
}

/**
 * 풍부한 빈 상태 — 큰 그라데이션 원 + 아이콘 + 메시지 + CTA.
 * 검색 결과 없음·즐겨찾기 비었음·필터 결과 없음 등 상황별로 tone을 달리해 표현.
 */
export function EmptyState({
  title,
  subtitle,
  icon = 'sparkles-outline',
  tone = 'default',
  gradient,
  actionLabel,
  onAction,
  children,
}: Props) {
  const tokens = useTokens()
  const styles = useMemo(() => makeStyles(tokens), [tokens])
  const toneGradient = useMemo<readonly [string, string]>(() => {
    if (gradient) return gradient
    switch (tone) {
      case 'soft':
        return [tokens.accent.purple, tokens.accent.pink] as const
      case 'info':
        return [tokens.state.info.fg, tokens.accent.blue] as const
      case 'warning':
        return [tokens.accent.amber, tokens.accent.orange] as const
      default:
        return [tokens.brand.primary, tokens.brand.primaryActive] as const
    }
  }, [tone, gradient, tokens])

  return (
    <View style={styles.root}>
      <View style={styles.iconWrap}>
        <LinearGradient
          colors={toneGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons name={icon} size={40} color={tokens.brand.onPrimary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.ctaText}>{actionLabel}</Text>
        </Pressable>
      )}
      {children}
    </View>
  )
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    root: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xl,
      gap: Spacing.md,
    },
    iconWrap: {
      width: 88,
      height: 88,
      borderRadius: 44,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.sm,
    },
    title: { ...Type.titleMd, fontSize: 18, lineHeight: 24, color: t.text.primary, textAlign: 'center' },
    subtitle: {
      ...Type.bodySm,
      color: t.text.muted,
      textAlign: 'center',
      maxWidth: 280,
    },
    cta: {
      marginTop: Spacing.md,
      paddingHorizontal: Spacing.lg,
      paddingVertical: 12,
      borderRadius: Radius.sm,
      backgroundColor: t.brand.primary,
      minHeight: 48,
      justifyContent: 'center',
    },
    ctaPressed: { opacity: 0.85 },
    ctaText: { ...Type.buttonSm, color: t.brand.onPrimary, fontWeight: '700', fontSize: 15 },
  })
}
