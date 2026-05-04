import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Tokens } from '@/constants/theme'

export type OptionItem<T extends string> = {
  value: T
  label: string
  description?: string
  icon?: keyof typeof Ionicons.glyphMap
}

/**
 * 라디오 선택용 바텀시트. 정렬 옵션 등 한 번에 한 개만 선택.
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
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          {options.map((opt) => {
            const active = opt.value === selected
            return (
              <Pressable
                key={opt.value}
                onPress={() => {
                  onSelect(opt.value)
                  onClose()
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
                    color={active ? Tokens.accent.blue : Tokens.text.muted}
                  />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
                  {opt.description && <Text style={styles.desc}>{opt.description}</Text>}
                </View>
                {active && <Ionicons name="checkmark" size={20} color={Tokens.accent.blue} />}
              </Pressable>
            )
          })}
        </SafeAreaView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Tokens.surface.raised,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Tokens.border.subtle,
    alignSelf: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: Tokens.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  rowActive: { backgroundColor: '#dbeafe' },
  rowPressed: { backgroundColor: Tokens.surface.canvas },
  label: { fontSize: 15, color: Tokens.text.primary, fontWeight: '500' },
  labelActive: { fontWeight: '700', color: Tokens.accent.blue },
  desc: { fontSize: 12, color: Tokens.text.muted, marginTop: 2 },
})
