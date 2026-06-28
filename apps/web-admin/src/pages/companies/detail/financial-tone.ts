/**
 * 재무 의미색 단일 출처 — 호재/악재·등락·투자의견·전망 방향이 모듈마다 같은 hex를
 * 복붙하던 것을 하나로. positive(초록)/negative(빨강)/neutral(회색)/warning(앰버),
 * light·dark 각 1쌍. 색 변경은 여기 한 곳만.
 */
import type {
  AnalystRating,
  DriverImpact,
  OutlookStance,
} from '@/shared/api/company'

export type Tone = 'positive' | 'negative' | 'neutral' | 'warning'

const PALETTE: Record<Tone, { light: string; dark: string }> = {
  positive: { light: '#16a34a', dark: '#4ade80' },
  negative: { light: '#dc2626', dark: '#f87171' },
  neutral: { light: '#64748b', dark: '#a1a1aa' },
  warning: { light: '#d97706', dark: '#fbbf24' },
}

/** 전경색(fg). */
export const toneColor = (tone: Tone, dark: boolean): string =>
  dark ? PALETTE[tone].dark : PALETTE[tone].light

/** 전경색 + 12% 배경(soft) — pill/badge 배경용. palette가 hex라 알파 접미(1f≈12%) 안전. */
export const toneSoftBg = (tone: Tone, dark: boolean): string =>
  `${toneColor(tone, dark)}1f`

//--- 도메인 값 → tone 매핑(색 외 의미 부여를 한 곳에) ---

export const ratingTone = (rating: AnalystRating | '' | null): Tone =>
  rating === 'STRONG_BUY' || rating === 'BUY'
    ? 'positive'
    : rating === 'SELL' || rating === 'STRONG_SELL'
      ? 'negative'
      : 'neutral'

export const stanceTone = (stance: OutlookStance | '' | null): Tone =>
  stance === 'BULLISH'
    ? 'positive'
    : stance === 'BEARISH'
      ? 'negative'
      : 'neutral'

export const impactTone = (impact: DriverImpact | '' | null): Tone =>
  impact === 'POSITIVE'
    ? 'positive'
    : impact === 'NEGATIVE'
      ? 'negative'
      : 'neutral'

/** 등락(증감)의 tone — 0 이상이면 positive. */
export const changeTone = (delta: number): Tone =>
  delta >= 0 ? 'positive' : 'negative'
