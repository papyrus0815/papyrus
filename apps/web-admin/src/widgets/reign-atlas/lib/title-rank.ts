/**
 * 칭호 등급 — 역사국가의 국가 유형(stateType)에서 파생한다(마이그 0).
 *
 * 재위 행에는 '황제/국왕' 같은 칭호 칸이 없다. 대신 나라마다 국가 유형이 이미 채워져 있어
 * (실측: 왕국 92·제국 23·공국 91곳) "제국이면 황제, 왕국이면 국왕"으로 읽는 것이 가장 정확하다.
 * 같은 사람이 여러 칭호를 겸하면(황제 겸 국왕) 핀이 선 나라의 유형을 따른다.
 */
export type TitleRank =
  | 'EMPEROR'
  | 'SULTAN'
  | 'KING'
  | 'PRINCE'
  | 'REPUBLIC'
  | 'OTHER'

export const TITLE_RANK_ORDER: TitleRank[] = [
  'EMPEROR',
  'SULTAN',
  'KING',
  'PRINCE',
  'REPUBLIC',
  'OTHER',
]

export const TITLE_RANK_META: Record<
  TitleRank,
  { label: string; shortLabel: string; glyph: string; color: string }
> = {
  EMPEROR: {
    label: '황제·대칸',
    shortLabel: '황제',
    glyph: '👑',
    color: '#f59e0b',
  },
  SULTAN: {
    label: '술탄·칼리프·칸',
    shortLabel: '술탄',
    glyph: '🌙',
    color: '#10b981',
  },
  KING: { label: '국왕', shortLabel: '국왕', glyph: '⚔️', color: '#0ea5e9' },
  PRINCE: {
    label: '공국·선제후·쇼군',
    shortLabel: '공·쇼군',
    glyph: '🛡️',
    color: '#a855f7',
  },
  REPUBLIC: {
    label: '공화국·연방',
    shortLabel: '공화국',
    glyph: '🏛️',
    color: '#64748b',
  },
  OTHER: { label: '기타', shortLabel: '기타', glyph: '·', color: '#94a3b8' },
}

const RANK_BY_STATE_TYPE: Record<string, TitleRank> = {
  EMPIRE: 'EMPEROR',
  NOMADIC_EMPIRE: 'EMPEROR',
  SULTANATE: 'SULTAN',
  CALIPHATE: 'SULTAN',
  KHANATE: 'SULTAN',
  KINGDOM: 'KING',
  PERSONAL_UNION: 'KING',
  PRINCIPALITY: 'PRINCE',
  ELECTORATE: 'PRINCE',
  MARGRAVIATE: 'PRINCE',
  SHOGUNATE: 'PRINCE',
  REPUBLIC: 'REPUBLIC',
  FEDERATION: 'REPUBLIC',
  CONFEDERATION: 'REPUBLIC',
  CITY_STATE: 'REPUBLIC',
}

export function titleRankOf(stateType: string | null | undefined): TitleRank {
  return (stateType && RANK_BY_STATE_TYPE[stateType]) || 'OTHER'
}
