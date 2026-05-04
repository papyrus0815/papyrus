import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

type Kind = 'person' | 'event' | 'country'

export function RelatedLink({
  kind,
  id,
  label,
  sublabel,
}: {
  kind: Kind
  id: string
  label: string
  sublabel?: string | null
}) {
  const router = useRouter()
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => router.push(`/${kind}/${id}` as any)}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {!!sublabel && (
          <Text style={styles.sub} numberOfLines={1}>
            {sublabel}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  rowPressed: { backgroundColor: '#f8fafc' },
  label: { fontSize: 14, color: '#0f172a', fontWeight: '500' },
  sub: { fontSize: 12, color: '#64748b', marginTop: 2 },
})
