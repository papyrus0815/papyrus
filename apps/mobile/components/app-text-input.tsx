import { forwardRef, useCallback, useMemo, useState } from 'react'
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { FontFamily, Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'

type FocusHandler = NonNullable<TextInputProps['onFocus']>
type BlurHandler = NonNullable<TextInputProps['onBlur']>
type FocusArg = Parameters<FocusHandler>[0]
type BlurArg = Parameters<BlurHandler>[0]

type Props = Omit<TextInputProps, 'style'> & {
  /** 입력 위에 띄우는 라벨 (선택) */
  label?: string
  /** 에러 텍스트 — 있으면 borderColor가 danger로 */
  error?: string | null
  /** TextInput 자체에 추가 스타일 — 폰트 크기 등 오버라이드용 */
  inputStyle?: TextStyle
  /** 외곽 컨테이너에 추가 스타일 */
  containerStyle?: ViewStyle
  /** Multi-line 입력 (height 자동 확장) */
  multiline?: boolean
  /** multiline 일 때 최소 높이 (default: 100) */
  minHeight?: number
}

/**
 * 앱 표준 TextInput.
 * - Airbnb 패턴: 평소 1px hairline, focus 시 2px ink border (글로우 X)
 * - selectionColor: brand.primary (Rausch)
 * - 다크모드 자동 대응
 * - 라벨·에러 텍스트 옵션
 */
export const AppTextInput = forwardRef<TextInput, Props>(function AppTextInput(
  {
    label,
    error,
    inputStyle,
    containerStyle,
    onFocus,
    onBlur,
    multiline,
    minHeight = 100,
    ...rest
  },
  ref,
) {
  const tokens = useTokens()
  const styles = useMemo(() => makeStyles(tokens), [tokens])
  const [focused, setFocused] = useState(false)

  const handleFocus = useCallback<FocusHandler>(
    (e: FocusArg) => {
      setFocused(true)
      onFocus?.(e)
    },
    [onFocus],
  )
  const handleBlur = useCallback<BlurHandler>(
    (e: BlurArg) => {
      setFocused(false)
      onBlur?.(e)
    },
    [onBlur],
  )

  const borderColor = error
    ? tokens.text.danger
    : focused
      ? tokens.text.primary
      : tokens.border.subtle
  const borderWidth = error || focused ? 2 : 1

  return (
    <View style={containerStyle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.box,
          { borderColor, borderWidth },
          multiline && { minHeight, paddingVertical: Spacing.md },
        ]}
      >
        <TextInput
          ref={ref}
          {...rest}
          multiline={multiline}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={tokens.text.soft}
          selectionColor={tokens.brand.primary}
          // Android에서 cursor 색 반영
          cursorColor={tokens.brand.primary}
          style={[
            styles.input,
            multiline && { textAlignVertical: 'top', minHeight: minHeight - Spacing.md * 2 },
            inputStyle,
          ]}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
})

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    label: { ...Type.captionSm, fontSize: 12, color: t.text.muted, fontWeight: '600', marginBottom: Spacing.xs },
    box: {
      backgroundColor: t.surface.canvas,
      borderRadius: Radius.sm,
      paddingHorizontal: Spacing.md,
      // border width를 1 ↔ 2로 토글하면 레이아웃이 1px 흔들림 — 외곽에 marginPad로 보정
      // 또는 padding으로 고정 height 유지: (focus 시 paddingHorizontal -1, paddingVertical -1)
      // 여기선 일단 border 토글만 — 실사용 화면 확인 후 보정 결정
      minHeight: 48,
      justifyContent: 'center',
    },
    // TextInput은 lineHeight 적용 시 한글 잘림 — fontFamily/fontSize만 토큰화
    input: { fontFamily: FontFamily.regular, fontSize: 16, color: t.text.primary, paddingVertical: Spacing.sm },
    error: { ...Type.captionSm, fontSize: 12, color: t.text.danger, marginTop: Spacing.xs, fontWeight: '500' },
  })
}
