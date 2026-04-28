/**
 * Lens Chip — 사용자가 *지금* 보고 있는 맥락의 단위.
 *
 * 여러 lens 칩을 동시에 활성화할 수 있고, **모두 AND**로 결합한다
 * (예: [프로이센]+[1860년대]+[전쟁] → 세 조건 모두 만족하는 사건).
 *
 * 칩 종류는 백엔드 데이터의 *축*과 일치하도록 함:
 *  - country  : 국가(현대) — relatedCountries (value=id)
 *  - hcountry : 역사 국가 — relatedHistoricalCountries (value=id)
 *  - category : 사건 카테고리 — value=EventCategory.id (안정 매칭)
 *  - decade   : 십년대 (1860 → 1860년대)
 *  - century  : 세기 (19 → 19세기)
 *  - quality  : 데이터 품질 (예: 'missing-description', 'no-countries')
 *
 * URL에는 `lens=country:c-id;decade:1860;category:cat-war-001` 식으로 직렬화.
 */

export type LensKind =
  | 'country'
  | 'hcountry'
  | 'category'
  | 'decade'
  | 'century'
  | 'quality'

export type QualityIssue = 'missing-description' | 'no-countries' | 'no-keywords'

const LENS_KINDS: readonly LensKind[] = [
  'country',
  'hcountry',
  'category',
  'decade',
  'century',
  'quality',
]

const isLensKind = (kind: string): kind is LensKind =>
  (LENS_KINDS as readonly string[]).includes(kind)

export interface LensChip {
  kind: LensKind
  /** 식별자 — 국가/카테고리는 id, decade는 연도 문자열, quality는 issue key */
  value: string
  /** 표시용 라벨 — 칩에 보여줄 한국어 텍스트. 미설정 시 페이지에서 resolve. */
  label?: string
}

export const lensKey = (chip: Pick<LensChip, 'kind' | 'value'>): string =>
  `${chip.kind}:${chip.value}`

export const stringifyLens = (chips: LensChip[]): string =>
  chips.map(lensKey).join(';')

/**
 * URL → 칩 배열 복원. label은 비워두고 호출부의 resolveLabel 단계가 채운다.
 */
export const parseLens = (raw: string | null): LensChip[] => {
  if (!raw) return []
  return raw
    .split(';')
    .map((part) => {
      const [kind, ...rest] = part.split(':')
      const value = rest.join(':')
      if (!kind || !value) return null
      if (!isLensKind(kind)) return null
      return { kind, value }
    })
    .filter((chip): chip is LensChip => chip !== null)
}
