/**
 * 측정값 표기 — 한 곳에서만 만든다(상세 모듈·사실 장부·비교 차트가 같은 문자열을 쓴다).
 *
 * 역사 수치는 대개 '약'·범위·'이상'·단서가 붙는다. 그 정보를 숫자 하나로 뭉개지 않는다:
 *   value 44700, approx            → '약 4.47만명'
 *   low 18000, high 20000, approx  → '약 1.8만~2만명'
 *   low 1000, atLeast              → '1,000명 이상'
 * 큰 수는 만·억으로 읽는다(원문 시드가 '약 14만', '약 63만 7천'처럼 적었다). 정확한 값은 exact로.
 */
import type { Observation } from '@/shared/api/evidence'

const UNIT_SUFFIX: Record<string, string> = {
  person: '명',
  vessel: '척',
  aircraft: '대',
  gun: '문',
  munition: '발',
  drone: '기',
  sortie: '회',
  percent: '%',
  point: 'pt',
  km2: 'km²',
  day: '일',
}

function trimDecimal(value: number, digits: number): string {
  return Number(value.toFixed(digits)).toLocaleString('ko-KR', { maximumFractionDigits: digits })
}

/** 만·억 단위로 읽는다. 1만 미만은 천 단위 쉼표 */
export function compactKoreanNumber(raw: string): string {
  const value = Number(raw)
  if (!Number.isFinite(value)) return raw
  const abs = Math.abs(value)
  if (abs >= 1e8) return `${trimDecimal(value / 1e8, 2)}억`
  if (abs >= 1e4) return `${trimDecimal(value / 1e4, 2)}만`
  return Number(raw).toLocaleString('ko-KR', { maximumFractionDigits: 6 })
}

function exactNumber(raw: string): string {
  return Number(raw).toLocaleString('ko-KR', { maximumFractionDigits: 6 })
}

function unitOf(observation: Pick<Observation, 'metric' | 'currency'>): { prefix: string; suffix: string } {
  if (observation.metric.valueKind === 'MONEY' && observation.currency) {
    return { prefix: '', suffix: ` ${observation.currency.name}` }
  }
  const unit = observation.metric.unit ?? ''
  return { prefix: '', suffix: UNIT_SUFFIX[unit] ?? (unit ? ` ${unit}` : '') }
}

type Formattable = Pick<Observation, 'value' | 'low' | 'high' | 'approx' | 'atLeast' | 'metric' | 'currency'>

function build(observation: Formattable, render: (raw: string) => string): string {
  const { suffix } = unitOf(observation)
  const approx = observation.approx ? '약 ' : ''
  const { value, low, high } = observation
  if (observation.atLeast) {
    const base = value ?? low
    return base ? `${approx}${render(base)}${suffix} 이상` : ''
  }
  if (low != null && high != null) {
    const range = `${render(low)}~${render(high)}${suffix}`
    return value != null ? `${approx}${render(value)}${suffix} (${range})` : `${approx}${range}`
  }
  const single = value ?? low ?? high
  if (single == null) return ''
  const bound = value == null && low != null ? ' 이상' : value == null && high != null ? ' 이하' : ''
  return `${approx}${render(single)}${suffix}${bound}`
}

/** 화면용 — 만·억으로 줄인 표기 */
export function formatObservationValue(observation: Formattable): string {
  return build(observation, compactKoreanNumber)
}

/** 정확한 표기 — 툴팁·접근성 이름용 */
export function formatObservationExact(observation: Formattable): string {
  return build(observation, exactNumber)
}

/**
 * 차트에 놓을 대표값과 범위. 점 추정이 없으면 범위의 가운데, '이상'이면 하한을 쓴다.
 * 범위가 없으면 low = high = 대표값.
 */
export function observationExtent(observation: Pick<Observation, 'value' | 'low' | 'high' | 'atLeast'>): {
  center: number
  low: number
  high: number
  openEnded: boolean
} | null {
  const toNumber = (raw: string | null) => (raw == null ? null : Number(raw))
  const value = toNumber(observation.value)
  const low = toNumber(observation.low)
  const high = toNumber(observation.high)
  const center = value ?? (low != null && high != null ? (low + high) / 2 : (low ?? high))
  if (center == null || !Number.isFinite(center)) return null
  return {
    center,
    low: low ?? center,
    high: high ?? center,
    openEnded: observation.atLeast,
  }
}

/** 출처가 검증되지 않은 측정값인가 — 화면이 숨기지 않고 표시해야 한다 */
export function isUnverified(observation: Pick<Observation, 'citations'>): boolean {
  return (
    observation.citations.length === 0 ||
    observation.citations.every((citation) => citation.source.kind === 'LEGACY_UNVERIFIED')
  )
}
