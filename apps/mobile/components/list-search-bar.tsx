import { useMemo } from 'react'
import { StyleSheet, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Elevation, FontFamily, Radius, Spacing, useTokens, type TokenSet } from '@/constants/theme'

export function ListSearchBar({
  value,
  onChange,
  placeholder = '검색',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const tokens = useTokens()
  const styles = useMemo(() => makeStyles(tokens), [tokens])
  return (
    <View style={styles.wrap}>
      <Ionicons name="search" size={16} color={tokens.text.soft} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={tokens.text.soft}
        selectionColor={tokens.brand.primary}
        cursorColor={tokens.brand.primary}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
    </View>
  )
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.surface.raised,
      borderRadius: Radius.full,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border.subtle,
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.md,
      gap: Spacing.sm,
      marginHorizontal: Spacing.md,
      marginVertical: Spacing.sm,
      ...Elevation.card,
    },
    // TextInput은 lineHeight 적용 시 높이 동작이 일그러지므로 fontFamily/Size만 토큰화
    input: { fontFamily: FontFamily.regular, flex: 1, fontSize: 15, color: t.text.primary, paddingVertical: 0 },
  })
}
