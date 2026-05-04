import { useMemo, useState } from 'react'
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Tokens } from '@/constants/theme'

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
            <Ionicons name="close" size={22} color={Tokens.text.primary} />
          </Pressable>
        </View>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={Tokens.text.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor={Tokens.text.soft}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={6}>
              <Ionicons name="close-circle" size={16} color={Tokens.text.soft} />
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
            {selectedId === null && <Ionicons name="checkmark" size={18} color={Tokens.accent.blue} />}
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
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, sel && styles.rowLabelSelected]}>
                    {item.flagEmoji ? `${item.flagEmoji} ` : ''}
                    {item.label}
                  </Text>
                  {item.sublabel ? <Text style={styles.rowSub}>{item.sublabel}</Text> : null}
                </View>
                {sel && <Ionicons name="checkmark" size={18} color={Tokens.accent.blue} />}
              </Pressable>
            )
          }}
        />
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Tokens.surface.raised },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Tokens.border.subtle,
  },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: Tokens.text.primary },
  closeBtn: { padding: 4 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Tokens.border.subtle,
  },
  searchInput: { flex: 1, fontSize: 14, color: Tokens.text.primary, paddingVertical: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Tokens.border.soft,
  },
  rowPressed: { backgroundColor: Tokens.surface.canvas },
  rowSelected: { backgroundColor: '#dbeafe' },
  rowLabel: { fontSize: 15, color: Tokens.text.primary, fontWeight: '500' },
  rowLabelSelected: { fontWeight: '700', color: Tokens.accent.blue },
  rowSub: { fontSize: 12, color: Tokens.text.muted, marginTop: 2 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: Tokens.text.soft, fontSize: 14 },
})
