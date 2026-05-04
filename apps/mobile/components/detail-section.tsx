import { StyleSheet, Text, View } from 'react-native'

export function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  )
}

export function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{String(value)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12, gap: 6 },
  title: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 4 },
  label: { width: 90, fontSize: 13, color: '#64748b' },
  value: { flex: 1, fontSize: 14, color: '#0f172a', lineHeight: 20 },
})
