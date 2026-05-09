export type SortMode =
  | 'recent'
  | 'influence-desc'
  | 'statsAvg-desc'
  | 'name-asc'
  | 'birth-asc'
  | 'birth-desc'

export type GenderKey = 'MALE' | 'FEMALE'
export type EvalFilter = 'all' | 'evaluated' | 'unevaluated'
export type ViewMode = 'cards' | 'compact'

export type CountryFacet = {
  id: string
  name: string
  flagEmoji?: string | null
  count: number
}

export type DynastyFacet = { id: string; name: string; count: number }
export type CenturyFacet = { century: number | null; count: number }
