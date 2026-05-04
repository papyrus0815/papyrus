import { StyleSheet, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

export function ListSearchBar({
  value,
  onChange,
  placeholder = '검색',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="search" size={16} color="#94a3b8" />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    margin: 12,
  },
  input: { flex: 1, fontSize: 15, color: '#0f172a', paddingVertical: 0 },
})
