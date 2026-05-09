import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet'
import { displayName } from '@/lib/format'
import { Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'
import type { PersonListItem } from '@/lib/dto'

type Props = {
  target: PersonListItem | null
  onClose: () => void
  onEdit: (p: PersonListItem) => void
  onShare: (p: PersonListItem) => void
  onDelete: (p: PersonListItem) => void
}

export function PersonActionMenu({ target, onClose, onEdit, onShare, onDelete }: Props) {
  const t = useTokens()
  const styles = useMemo(() => makeStyles(t), [t])
  const ref = useRef<BottomSheetModal>(null)

  useEffect(() => {
    if (target) ref.current?.present()
    else ref.current?.dismiss()
  }, [target])

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    [],
  )

  return (
    <BottomSheetModal
      ref={ref}
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      enableDynamicSizing
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.sheetBg}
    >
      <BottomSheetView style={styles.content}>
        {target && (
          <Text style={styles.title} numberOfLines={1}>
            {displayName(target)}
          </Text>
        )}
        <ActionRow
          icon="create-outline"
          label="수정"
          styles={styles}
          color={t.text.primary}
          onPress={() => {
            if (target) onEdit(target)
            ref.current?.dismiss()
          }}
        />
        <ActionRow
          icon="share-outline"
          label="공유"
          styles={styles}
          color={t.text.primary}
          onPress={() => {
            if (target) onShare(target)
            ref.current?.dismiss()
          }}
        />
        <ActionRow
          icon="trash-outline"
          label="삭제"
          destructive
          styles={styles}
          color={t.state.negative.fg}
          onPress={() => {
            if (target) onDelete(target)
            ref.current?.dismiss()
          }}
        />
        <View style={styles.safeBottom} />
      </BottomSheetView>
    </BottomSheetModal>
  )
}

function ActionRow({
  icon,
  label,
  destructive,
  color,
  styles,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  destructive?: boolean
  color: string
  styles: ReturnType<typeof makeStyles>
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.label, destructive && { color }]}>{label}</Text>
    </Pressable>
  )
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    sheetBg: { backgroundColor: t.surface.raised },
    handle: { backgroundColor: t.border.subtle, width: 36, height: 4 },
    content: { paddingHorizontal: Spacing.sm },
    title: { ...Type.sectionLabel, fontSize: 13, color: t.text.muted, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      borderRadius: Radius.sm,
    },
    rowPressed: { backgroundColor: t.surface.pressed },
    label: { ...Type.bodySm, fontSize: 15, color: t.text.primary, fontWeight: '500' },
    safeBottom: { height: Spacing.lg },
  })
}
