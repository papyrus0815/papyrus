// 인물 능력치·성격 — web-admin shared/api/person-stats 미러

export const PERSON_STAT_KEYS = [
  'politics',
  'military',
  'diplomacy',
  'intellect',
  'charisma',
  'administration',
] as const

export type PersonStatKey = (typeof PERSON_STAT_KEYS)[number]

export const PERSON_STAT_META: Record<
  PersonStatKey,
  { label: string; short: string; color: string }
> = {
  politics: { label: '정치', short: 'POL', color: '#6366f1' },
  military: { label: '군사', short: 'MIL', color: '#dc2626' },
  diplomacy: { label: '외교', short: 'DIP', color: '#0891b2' },
  intellect: { label: '학식', short: 'INT', color: '#7c3aed' },
  charisma: { label: '카리스마', short: 'CHA', color: '#f59e0b' },
  administration: { label: '행정', short: 'ADM', color: '#10b981' },
}

export type PersonStats = {
  id: string
  personId: string
  accountId: string
  politics: number | null
  military: number | null
  diplomacy: number | null
  intellect: number | null
  charisma: number | null
  administration: number | null
  notes: string | null
}

export type PersonTrait = string

export const PERSON_TRAIT_META: Record<
  string,
  { label: string; tone: 'positive' | 'negative' | 'neutral' }
> = {
  AMBITIOUS: { label: '야망가', tone: 'neutral' },
  CAUTIOUS: { label: '신중함', tone: 'positive' },
  IMPULSIVE: { label: '충동적', tone: 'negative' },
  DELIBERATE: { label: '사려깊음', tone: 'positive' },
  COURAGEOUS: { label: '용감함', tone: 'positive' },
  COWARDLY: { label: '비겁함', tone: 'negative' },
  BRUTAL: { label: '잔혹함', tone: 'negative' },
  MERCIFUL: { label: '자비로움', tone: 'positive' },
  GENEROUS: { label: '관대함', tone: 'positive' },
  GREEDY: { label: '탐욕스러움', tone: 'negative' },
  LOYAL: { label: '충성스러움', tone: 'positive' },
  TREACHEROUS: { label: '배신·기만', tone: 'negative' },
  PIOUS: { label: '독실함', tone: 'neutral' },
  SECULAR: { label: '세속적', tone: 'neutral' },
  SCHOLARLY: { label: '학자적', tone: 'positive' },
  CHARISMATIC: { label: '카리스마형', tone: 'positive' },
  AUSTERE: { label: '엄격·금욕', tone: 'neutral' },
  LIBERTINE: { label: '방종', tone: 'negative' },
  JUST: { label: '정의로움', tone: 'positive' },
  VENGEFUL: { label: '복수심', tone: 'negative' },
  PATIENT: { label: '인내·끈기', tone: 'positive' },
  HOT_TEMPERED: { label: '다혈질', tone: 'negative' },
  HUMBLE: { label: '겸손', tone: 'positive' },
  ARROGANT: { label: '오만', tone: 'negative' },
  OTHER: { label: '기타', tone: 'neutral' },
}

export type PersonTraitAssignment = {
  id: string
  trait: PersonTrait
  intensity?: number | null
  note?: string | null
}
