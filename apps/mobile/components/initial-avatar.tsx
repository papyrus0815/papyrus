import { useMemo } from 'react'
import { StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

type Props = {
  /** 아이디 또는 안정적 시드 — 같은 시드는 같은 색 */
  seed: string
  /** 표시할 글자 (보통 이름 첫 글자) */
  initial: string
  /** 외곽 컨테이너 스타일 (보통 width/height/borderRadius) */
  style?: ViewStyle
  /** 폰트 크기 (default 28) */
  fontSize?: number
}

/**
 * 사진 없을 때 컬러풀한 그라데이션 배경 + 큰 이니셜.
 * 시드 해시로 색을 결정해 같은 인물은 항상 같은 색.
 *
 * Airbnb-spec하지는 않지만 우리 도메인(사진 부재 다수)에서
 * 회색 박스보다 훨씬 풍부한 시각 정보 제공.
 */
export function InitialAvatar({ seed, initial, style, fontSize = 28 }: Props) {
  const colors = useMemo(() => pickGradient(seed), [seed])
  return (
    <View style={style}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.center}>
        <Text style={[styles.initial, { fontSize }]}>{initial}</Text>
      </View>
    </View>
  )
}

/** id에서 안정적인 정수 해시 — 색 인덱스 계산용 */
function hashSeed(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

/**
 * 슬레이트 단색조 그라데이션 — 사진 없는 카드 hero가 한 화면에 다수 노출되어도 시각 부하 없도록.
 * 5단계 다른 밝기로 인물 식별성은 유지 (같은 인물은 항상 같은 색).
 */
const PALETTES: ReadonlyArray<readonly [string, string]> = [
  ['#475569', '#1e293b'], // slate 600 → 800
  ['#334155', '#0f172a'], // slate 700 → 900
  ['#64748b', '#334155'], // slate 500 → 700
  ['#52525b', '#27272a'], // zinc 600 → 800
  ['#3f3f46', '#18181b'], // zinc 700 → 950
]

export function pickGradient(seed: string): readonly [string, string] {
  const idx = hashSeed(seed) % PALETTES.length
  return PALETTES[idx]
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#fff', fontWeight: '700' },
})
