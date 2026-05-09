import { useMemo, useState } from 'react'
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { FontFamily, Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'

export type PickerOption = {
  id: string
  label: string
  sublabel?: string | null
  flagEmoji?: string | null
}

export function PickerModal({
  visible,
  title,
  options,
  selectedId,
  onSelect,
  onClose,
  allowClear = true,
  searchPlaceholder = '검색',
}: {
  visible: boolean
  title: string
  options: PickerOption[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onClose: () => void
  allowClear?: boolean
  searchPlaceholder?: string
}) {
  const t = useTokens()
  const styles = useMemo(() => makeStyles(t), [t])
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.sublabel ?? '').toLowerCase().includes(q),
    )
  }, [options, query])

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" visible={visible} onRequestClose={onClose}>
      <SafeAreaView edges={['top']} style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={t.text.primary} />
          </Pressable>
        </View>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={t.text.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor={t.text.soft}
            selectionColor={t.brand.primary}
            cursorColor={t.brand.primary}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={6}>
              <Ionicons name="close-circle" size={16} color={t.text.soft} />
            </Pressable>
          ) : null}
        </View>
        {allowClear && (
          <Pressable
            onPress={() => {
              onSelect(null)
              onClose()
            }}
            style={({ pressed }) => [styles.row, selectedId === null && styles.rowSelected, pressed && styles.rowPressed]}
          >
            <Text style={[styles.rowLabel, selectedId === null && styles.rowLabelSelected]}>(선택 안 함)</Text>
            {selectedId === null && <Ionicons name="checkmark" size={18} color={t.text.primary} />}
          </Pressable>
        )}
        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>일치하는 항목이 없습니다</Text>
            </View>
          }
          renderItem={({ item }) => {
            const sel = selectedId === item.id
            return (
              <Pressable
                onPress={() => {
                  onSelect(item.id)
                  onClose()
                }}
                style={({ pressed }) => [styles.row, sel && styles.rowSelected, pressed && styles.rowPressed]}
              >
                <View style={styles.rowBody}>
                  <Text style={[styles.rowLabel, sel && styles.rowLabelSelected]}>
                    {item.flagEmoji ? `${item.flagEmoji} ` : ''}
                    {item.label}
                  </Text>
                  {item.sublabel ? <Text style={styles.rowSub}>{item.sublabel}</Text> : null}
                </View>
                {sel && <Ionicons name="checkmark" size={18} color={t.text.primary} />}
              </Pressable>
            )
          }}
        />
      </SafeAreaView>
    </Modal>
  )
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.surface.raised },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.base,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border.subtle,
    },
    title: { flex: 1, ...Type.displaySm, color: t.text.primary },
    closeBtn: { padding: Spacing.xs },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.base,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border.subtle,
    },
    // TextInput은 lineHeight 적용 시 동작 일그러지므로 fontFamily/fontSize만
    searchInput: { fontFamily: FontFamily.regular, flex: 1, fontSize: 14, color: t.text.primary, paddingVertical: 0 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border.soft,
    },
    rowPressed: { backgroundColor: t.surface.canvas },
    rowSelected: { backgroundColor: t.surface.pressed },
    rowBody: { flex: 1 },
    rowLabel: { ...Type.bodySm, fontSize: 15, color: t.text.primary, fontWeight: '500' },
    rowLabelSelected: { fontWeight: '700' },
    rowSub: { ...Type.captionSm, color: t.text.muted, marginTop: 2 },
    empty: { padding: Spacing.xl, alignItems: 'center' },
    emptyText: { ...Type.bodySm, color: t.text.soft },
  })
}
