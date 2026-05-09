import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet'
import { Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'

export type OptionItem<T extends string> = {
  value: T
  label: string
  description?: string
  icon?: keyof typeof Ionicons.glyphMap
}

/**
 * 라디오 선택용 바텀시트.
 * - @gorhom/bottom-sheet 기반: 드래그-down dismiss + spring 모션
 * - dynamic content sizing: 옵션 개수에 맞춰 높이 자동 결정
 */
export function OptionSheet<T extends string>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean
  title: string
  options: OptionItem<T>[]
  selected: T
  onSelect: (value: T) => void
  onClose: () => void
}) {
  const t = useTokens()
  const styles = useMemo(() => makeStyles(t), [t])
  const ref = useRef<BottomSheetModal>(null)

  // visible prop과 시트 상태 동기화
  useEffect(() => {
    if (visible) ref.current?.present()
    else ref.current?.dismiss()
  }, [visible])

  const handleDismiss = useCallback(() => {
    onClose()
  }, [onClose])

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
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      enableDynamicSizing
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.sheetBg}
    >
      <BottomSheetView style={styles.sheetContent}>
        <Text style={styles.title}>{title}</Text>
        {options.map((opt) => {
          const active = opt.value === selected
          return (
            <Pressable
              key={opt.value}
              onPress={() => {
                onSelect(opt.value)
                ref.current?.dismiss()
              }}
              style={({ pressed }) => [
                styles.row,
                active && styles.rowActive,
                pressed && styles.rowPressed,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              {opt.icon && (
                <Ionicons
                  name={opt.icon}
                  size={18}
                  color={active ? t.text.primary : t.text.muted}
                />
              )}
              <View style={styles.rowBody}>
                <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
                {opt.description && <Text style={styles.desc}>{opt.description}</Text>}
              </View>
              {active && <Ionicons name="checkmark" size={20} color={t.text.primary} />}
            </Pressable>
          )
        })}
        {/* SafeArea bottom inset 충분히 — 시트가 indicator 아래에서 끝나도록 */}
        <View style={styles.safeBottom} />
      </BottomSheetView>
    </BottomSheetModal>
  )
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    sheetBg: { backgroundColor: t.surface.raised },
    handle: { backgroundColor: t.border.subtle, width: 36, height: 4 },
    sheetContent: { paddingHorizontal: Spacing.sm, paddingTop: 0, paddingBottom: 0 },
    title: { ...Type.sectionLabel, fontSize: 13, color: t.text.muted, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      borderRadius: Radius.sm,
    },
    rowActive: { backgroundColor: t.surface.pressed },
    rowPressed: { backgroundColor: t.surface.pressed },
    rowBody: { flex: 1 },
    label: { ...Type.bodySm, fontSize: 15, color: t.text.primary, fontWeight: '500' },
    labelActive: { fontWeight: '700', color: t.text.primary },
    desc: { ...Type.captionSm, color: t.text.muted, marginTop: 2 },
    safeBottom: { height: Spacing.lg },
  })
}
