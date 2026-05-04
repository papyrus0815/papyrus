import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

export type TabItem = { key: string; label: string; badge?: number | null }

export function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: TabItem[]
  active: string
  onChange: (key: string) => void
}) {
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {tabs.map((t) => {
          const isActive = active === t.key
          return (
            <Pressable
              key={t.key}
              style={({ pressed }) => [styles.tab, isActive && styles.tabActive, pressed && styles.tabPressed]}
              onPress={() => onChange(t.key)}
            >
              <Text style={[styles.label, isActive && styles.labelActive]}>{t.label}</Text>
              {t.badge != null && t.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{t.badge}</Text>
                </View>
              )}
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0' },
  scroll: { paddingHorizontal: 8, gap: 4 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#0f172a' },
  tabPressed: { backgroundColor: '#f8fafc' },
  label: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  labelActive: { color: '#0f172a', fontWeight: '700' },
  badge: { backgroundColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  badgeText: { fontSize: 11, color: '#475569', fontWeight: '600' },
})
