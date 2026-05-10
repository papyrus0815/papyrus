import React, { useMemo } from 'react'
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useAuth } from '@/lib/auth-context'
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
  const tabBarHeight = useBottomTabBarHeight()
  const bodyBottomPad = Platform.OS === 'ios' ? tabBarHeight + Spacing.lg : Spacing.lg
  const scrollY = useSharedValue(0)
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y
    },
  })

  function handleLogout() {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    Alert.alert('로그아웃', '정말 로그아웃하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
    ])
  }

  return (
    <View style={styles.root}>
      <PageHeader title="설정" scrollY={scrollY} />
      <Animated.ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: bodyBottomPad }]}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <Group>
          <NavRow
            icon="heart"
            iconBg={t.state.negative.bg}
            iconColor={t.state.negative.fg}
            label="즐겨찾기"
            meta={String(bookmarkCount)}
            onPress={() => goBookmarks(router)}
            t={t}
          />
        </Group>

        <Group header="환경" footer={`서버 주소: ${getApiBaseURL() ?? '(미설정)'}`}>
          <InfoRow
            icon="cloud-outline"
            iconBg={t.state.info.bg}
            iconColor={t.state.info.fg}
            label="API 서버"
            value={getApiBaseURL() ?? '(미설정)'}
            t={t}
          />
        </Group>

        <Group>
          <ActionRow
            label="로그아웃"
            destructive
            icon="log-out-outline"
            onPress={handleLogout}
            t={t}
          />
        </Group>
      </Animated.ScrollView>
    </View>
  )
}

// iOS Settings 그룹 컨테이너. header(uppercase eyebrow) / footer(소형 설명) 옵션.
// 행 사이에 hairline separator 자동 주입.
function Group({
  children,
  header,
  footer,
}: {
  children: React.ReactNode
  header?: string
  footer?: string
}) {
  const t = useTokens()
  const styles = useMemo(() => makeStyles(t), [t])
  const items = React.Children.toArray(children).filter(Boolean)
  return (
    <View style={styles.group}>
      {header ? <Text style={styles.groupHeader}>{header}</Text> : null}
      <View style={styles.groupBody}>
        {items.map((child, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <View style={styles.separator} /> : null}
            {child}
          </React.Fragment>
        ))}
      </View>
      {footer ? <Text style={styles.groupFooter}>{footer}</Text> : null}
    </View>
  )
}

type RowBase = {
  icon?: keyof typeof Ionicons.glyphMap
  iconBg?: string
  iconColor?: string
  label: string
  t: TokenSet
}

function NavRow({
  icon,
  iconBg,
  iconColor,
  label,
  meta,
  onPress,
  t,
}: RowBase & { meta?: string; onPress: () => void }) {
  const styles = useMemo(() => makeStyles(t), [t])
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: iconBg ?? t.surface.pressed }]}>
          <Ionicons name={icon} size={18} color={iconColor ?? t.text.primary} />
        </View>
      ) : null}
      <Text style={styles.rowLabel}>{label}</Text>
      {meta ? <Text style={styles.rowMeta}>{meta}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={t.text.soft} />
    </Pressable>
  )
}

function InfoRow({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  t,
}: RowBase & { value: string }) {
  const styles = useMemo(() => makeStyles(t), [t])
  return (
    <View style={styles.row}>
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: iconBg ?? t.surface.pressed }]}>
          <Ionicons name={icon} size={18} color={iconColor ?? t.text.primary} />
        </View>
      ) : null}
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}

function ActionRow({
  icon,
  label,
  destructive,
  onPress,
  t,
}: RowBase & { destructive?: boolean; onPress: () => void }) {
  const styles = useMemo(() => makeStyles(t), [t])
  const color = destructive ? t.state.negative.fg : t.brand.primary
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, styles.rowAction, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon ? <Ionicons name={icon} size={18} color={color} /> : null}
      <Text style={[styles.rowActionLabel, { color }]}>{label}</Text>
    </Pressable>
  )
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.surface.canvas },
    body: { paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, gap: Spacing.lg },
    group: { gap: Spacing.xs },
    groupHeader: {
      ...Type.sectionLabel,
      color: t.text.muted,
      paddingHorizontal: Spacing.sm,
      marginBottom: 2,
    },
    groupBody: {
      backgroundColor: t.surface.raised,
      borderRadius: Radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border.subtle,
      overflow: 'hidden',
    },
    groupFooter: {
      ...Type.captionSm,
      color: t.text.muted,
      paddingHorizontal: Spacing.sm,
      marginTop: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.md + 2,
      minHeight: 48,
    },
    // 행 사이 hairline. 아이콘 컬럼은 빼고 텍스트 시작 지점부터 그어 iOS 패턴 따름
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: t.border.subtle,
      marginLeft: Spacing.base + 30 + Spacing.md, // padding + iconSize + gap
    },
    rowPressed: { backgroundColor: t.surface.pressed },
    rowIcon: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: { ...Type.bodyMd, flex: 1, color: t.text.primary },
    rowMeta: { ...Type.bodySm, color: t.text.muted, fontWeight: '600' },
    rowValue: { ...Type.captionSm, color: t.text.muted, maxWidth: 200 },
    rowAction: { justifyContent: 'center', alignItems: 'center' },
    rowActionLabel: { ...Type.buttonMd, fontWeight: '600' },
  })
}
