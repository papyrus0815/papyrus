import { memo, useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { displayName, lifespan } from '@/lib/format'
import { imageUrl } from '@/lib/image-url'
import { isRecentlyRegistered } from '@/lib/persons-filter'
import { AppImage } from '@/components/app-image'
import { AppPressable } from '@/components/app-pressable'
import { BookmarkHeart } from '@/components/bookmark-heart'
import { HighlightedText } from '@/components/highlighted-text'
import { InfluenceTierBadge } from '@/components/influence-tier-badge'
import { InitialAvatar } from '@/components/initial-avatar'
import { Elevation, Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'
import type { PersonListItem } from '@/lib/dto'

type RowProps = {
  item: PersonListItem
  query: string
  onPress: (item: PersonListItem) => void
  onLongPress: (item: PersonListItem) => void
  bookmarked?: boolean
  onToggleBookmark?: (item: PersonListItem) => void
}

type CardProps = RowProps & { statsAvg: number | null }

/**
 * 사진-우선 인물 카드 (Airbnb property card 패턴).
 * 상단 4:3 hero 사진 + 우상단 영향력 배지 + 우상단 NEW 배지 + 하단 메타 스택.
 *
 * 텍스트 위계: 왕호=eyebrow caption, 이름=titleMd primary, 생몰=bodySm muted, tag=badge secondary, 바이오=captionSm soft.
 */
export const PersonCardRow = memo(function PersonCardRow({
  item,
  query,
  statsAvg,
  onPress,
  onLongPress,
  bookmarked,
  onToggleBookmark,
}: CardProps) {
  const t = useTokens()
  const styles = useMemo(() => makeStyles(t), [t])
  const ls = lifespan(item)
  const img = imageUrl(item.profileImageUrl)
  const name = displayName(item)
  const isNew = isRecentlyRegistered(item.createdAt)
  const bioExcerpt = useMemo(() => {
    if (!item.biography) return null
    return item.biography
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80)
  }, [item.biography])

  return (
    <AppPressable
      style={styles.card}
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item)}
      delayLongPress={350}
      accessibilityLabel={`${name} ${ls}`}
      accessibilityRole="button"
    >
      <View style={styles.heroWrap}>
        <AppImage
          uri={img}
          style={styles.hero}
          fallback={
            <InitialAvatar seed={item.id} initial={name.slice(0, 1)} fontSize={72} style={styles.hero} />
          }
        />
        {/* 사진 위 bottom 그라데이션 — 영향력/NEW 배지 가독성 + 깊이감 */}
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.35)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 0, y: 1 }}
          style={styles.heroGradient}
          pointerEvents="none"
        />
        {/* 우상단 즐겨찾기 하트 */}
        {onToggleBookmark && (
          <View style={styles.heroHeart}>
            <BookmarkHeart
              active={!!bookmarked}
              onToggle={() => onToggleBookmark(item)}
              variant="overlay"
              accessibilityLabel={`${name} 즐겨찾기`}
            />
          </View>
        )}
        {/* 좌상단: 군주 chip (왕호가 있는 경우만) — 카드의 유일한 액센트 */}
        {item.regnalName ? (
          <View style={styles.heroCategoryChip}>
            <Ionicons name="ribbon" size={11} color={t.text.primary} />
            <Text style={styles.heroCategoryText}>군주</Text>
          </View>
        ) : isNew ? (
          <View style={styles.heroNewBadge}>
            <Text style={styles.heroNewText}>NEW</Text>
          </View>
        ) : null}
        {/* 좌하단 영향력 배지 */}
        {item.influence != null && (
          <View style={styles.heroInfluence}>
            <InfluenceTierBadge influence={item.influence} size="sm" showNumber />
          </View>
        )}
      </View>
      <View style={styles.body}>
        {/* 왕호: 본 이름 위에 작게 (eyebrow) */}
        {item.regnalName ? (
          <HighlightedText
            text={item.regnalName}
            query={query}
            style={styles.cardRegnal}
            numberOfLines={1}
          />
        ) : null}
        <View style={styles.titleNameWrap}>
          <HighlightedText text={name} query={query} style={styles.cardTitle} numberOfLines={1} />
          {item.country?.flagEmoji ? (
            <Text style={styles.flag}>{item.country.flagEmoji}</Text>
          ) : null}
        </View>
        {!!ls && <Text style={styles.cardMeta}>{ls}</Text>}
        <View style={styles.tagRow}>
          {item.dynasty?.name && (
            <HighlightedText text={item.dynasty.name} query={query} style={styles.tag} />
          )}
          {item.country?.name && (
            <HighlightedText text={item.country.name} query={query} style={styles.tagSubtle} />
          )}
          {statsAvg != null && (
            <Text style={styles.statsBadge}>⌀ {statsAvg.toFixed(0)}</Text>
          )}
        </View>
        {bioExcerpt && (
          <Text style={styles.cardBio} numberOfLines={2}>
            {bioExcerpt}
            {bioExcerpt.length === 80 ? '…' : ''}
          </Text>
        )}
      </View>
    </AppPressable>
  )
})

export const PersonCompactRow = memo(function PersonCompactRow({
  item,
  query,
  onPress,
  onLongPress,
}: RowProps) {
  const t = useTokens()
  const styles = useMemo(() => makeStyles(t), [t])
  const ls = lifespan(item)
  const name = displayName(item)
  const titleText = item.regnalName ? `${item.regnalName} · ${name}` : name
  const isNew = isRecentlyRegistered(item.createdAt)
  return (
    <Pressable
      style={({ pressed }) => [styles.compactRow, pressed && styles.compactRowPressed]}
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item)}
      delayLongPress={350}
      accessibilityLabel={`${name}, ${ls}`}
      accessibilityRole="button"
    >
      <View style={styles.compactBody}>
        <View style={styles.compactTitleRow}>
          <HighlightedText
            text={titleText + (item.country?.flagEmoji ? ` ${item.country.flagEmoji}` : '')}
            query={query}
            style={styles.compactName}
            numberOfLines={1}
          />
          {isNew && (
            <View style={styles.newBadgeSm}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
        </View>
        <Text style={styles.compactMeta} numberOfLines={1}>
          {[ls, item.dynasty?.name, item.country?.name].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <InfluenceTierBadge influence={item.influence} size="sm" showNumber={item.influence != null} />
      <Ionicons name="chevron-forward" size={16} color={t.text.soft} />
    </Pressable>
  )
})

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    // 사진-우선 카드
    card: {
      backgroundColor: t.surface.raised,
      borderRadius: Radius.md,
      overflow: 'hidden',
      ...Elevation.card,
    },
    heroWrap: {
      position: 'relative',
      width: '100%',
      aspectRatio: 4 / 3,
      backgroundColor: t.surface.pressed,
    },
    hero: { width: '100%', height: '100%' },
    heroGradient: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: '50%',
    },
    heroNewBadge: {
      position: 'absolute',
      top: Spacing.sm,
      left: Spacing.sm,
      backgroundColor: 'rgba(255,255,255,0.92)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: Radius.full,
    },
    heroNewText: { ...Type.badge, color: '#0f172a', fontWeight: '800', letterSpacing: 0.3 },
    heroCategoryChip: {
      position: 'absolute',
      top: Spacing.sm,
      left: Spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: Radius.full,
      backgroundColor: 'rgba(255,255,255,0.92)',
    },
    heroCategoryText: { ...Type.badge, color: '#0f172a' },
    heroHeart: {
      position: 'absolute',
      top: Spacing.xs,
      right: Spacing.xs,
    },
    heroInfluence: {
      position: 'absolute',
      bottom: Spacing.sm,
      left: Spacing.sm,
      backgroundColor: t.surface.raised,
      borderRadius: Radius.full,
      paddingHorizontal: 2,
      paddingVertical: 2,
    },
    body: {
      padding: Spacing.base,
      gap: Spacing.xxs,
    },
    titleNameWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap' },
    // 왕호: 이름 위 eyebrow — 작고 muted
    cardRegnal: { ...Type.captionSm, fontWeight: '700', color: t.text.muted, letterSpacing: 0.2 },
    // 본 이름: 카드의 주 시각 앵커
    cardTitle: { ...Type.titleMd, fontWeight: '700', color: t.text.primary },
    flag: { fontSize: 16 },
    // 생몰: 본 이름 바로 아래 보조 정보
    cardMeta: { ...Type.captionSm, color: t.text.muted },
    // 바이오: 가장 약한 톤
    cardBio: { ...Type.captionSm, color: t.text.secondary, marginTop: Spacing.xs },
    tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' },
    // 부속 chip은 중성 톤 — 인플루언스 배지 외에 색 가중치 X
    tag: {
      ...Type.badge,
      color: t.text.secondary,
      backgroundColor: t.surface.pressed,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: Radius.full,
    },
    tagSubtle: {
      ...Type.badge,
      fontWeight: '500',
      color: t.text.muted,
    },
    statsBadge: {
      ...Type.badge,
      color: t.text.secondary,
      backgroundColor: t.surface.pressed,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: Radius.full,
    },
    // compact row
    newBadgeSm: {
      backgroundColor: t.brand.primary,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: Radius.xs,
    },
    newBadgeText: { fontSize: 9, fontWeight: '800', color: t.brand.onPrimary, letterSpacing: 0.4 },
    compactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.base,
      backgroundColor: t.surface.raised,
    },
    compactRowPressed: { backgroundColor: t.surface.pressed },
    compactBody: { flex: 1 },
    compactTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    compactName: { ...Type.titleSm, fontSize: 15, color: t.text.primary },
    compactMeta: { ...Type.captionSm, color: t.text.muted, marginTop: 2 },
  })
}
