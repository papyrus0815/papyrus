/**
 * 분류 색을 **11px 본문 텍스트로 쓸 때의 잉크**로 보정한다.
 *
 * LEDGER 팔레트는 카탈로그의 점·막대·칩(배경 틴트 위)을 위해 고른 색이라, 그대로 작은
 * 글자에 쓰면 사이드바 지면색에서 대비가 무너진다 — 라이트 지면 기준으로 외교·사회·문화가
 * WCAG 본문 기준(4.5:1)에 못 미친다. 다크는 dark 쌍이 이미 6.6:1 이상이라 손대지 않는다.
 * ⚠️ 지면색이 바뀌면 이 계산의 기준도 같이 바뀐다 — 그래서 SIDEBAR_SURFACE 한 곳에서만
 * 정의하고 styles가 그 값을 패널에 내려보낸다.
 *
 * 팔레트 값을 고쳐 카탈로그까지 바꾸지 않고, **글자에 쓸 때만** 기준을 넘을 때까지
 * 검정(라이트)/흰색(다크) 쪽으로 섞는다. 색상(hue)은 유지되므로 '외교=하늘'이라는 인상은
 * 남는다. 색이 유일한 단서가 아니라는 점도 전제다 — 행에는 분류 '이름'이 함께 있다.
 */
import { SIDEBAR_SURFACE } from '@/shared/ui/sidebar-list/surface'

/**
 * 사이드바 지면색 — 대비 계산 기준. 공용 sidebar-list가 전 지면에 쓰는 지면색 그대로다
 * (정의가 둘이면 어느 한쪽만 바뀔 때 대비 계산이 조용히 어긋난다).
 */
export { SIDEBAR_SURFACE }

/** WCAG 2.1 본문(<18.66px) 최소 대비 */
const MIN_CONTRAST = 4.5

function channels(hex: string): [number, number, number] | null {
  const normalized =
    /^#[0-9a-fA-F]{3}$/.test(hex)
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex
  if (!/^#[0-9a-fA-F]{6}$/.test(normalized)) return null
  return [
    parseInt(normalized.slice(1, 3), 16),
    parseInt(normalized.slice(3, 5), 16),
    parseInt(normalized.slice(5, 7), 16),
  ]
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [red, green, blue] = rgb.map((value) => {
    const channel = value / 255
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

export function contrastRatio(foreground: string, background: string): number {
  const fore = channels(foreground)
  const back = channels(background)
  if (!fore || !back) return 1
  const lighter = Math.max(relativeLuminance(fore), relativeLuminance(back))
  const darker = Math.min(relativeLuminance(fore), relativeLuminance(back))
  return (lighter + 0.05) / (darker + 0.05)
}

function mixToward(hex: string, target: [number, number, number], ratio: number) {
  const base = channels(hex)
  if (!base) return hex
  const merged = base.map((value, index) =>
    Math.round(value + (target[index] - value) * ratio),
  )
  return `#${merged.map((value) => value.toString(16).padStart(2, '0')).join('')}`
}

const cache = new Map<string, string>()

/**
 * 지면색에서 4.5:1을 넘는 가장 **덜 섞은** 색을 돌려준다(5%씩 20단계).
 * 이미 기준을 넘으면 원색 그대로 — 대부분의 분류는 여기서 끝난다.
 */
export function categoryInk(accent: string, mode: 'light' | 'dark'): string {
  const key = `${accent}|${mode}`
  const cached = cache.get(key)
  if (cached) return cached

  const surface = SIDEBAR_SURFACE[mode]
  let result = accent
  if (channels(accent) && contrastRatio(accent, surface) < MIN_CONTRAST) {
    const target: [number, number, number] =
      mode === 'dark' ? [255, 255, 255] : [0, 0, 0]
    result = mode === 'dark' ? '#ffffff' : '#000000'
    for (let step = 1; step <= 20; step += 1) {
      const candidate = mixToward(accent, target, step / 20)
      if (contrastRatio(candidate, surface) >= MIN_CONTRAST) {
        result = candidate
        break
      }
    }
  }
  cache.set(key, result)
  return result
}
