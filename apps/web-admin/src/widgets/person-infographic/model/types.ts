export interface AdaptedPerson {
  id: string
  name: string
  born: number
  died: number
  activityYear: number
  age: number | null
  region: string
  country: string
  field: string
  faction: string
  influence: number
  profileImageUrl: string | null
  isMonarch: boolean
  isHeadOfState: boolean
  primaryTitle: string | null
  biography: string | null
  isAlive: boolean
}

export interface Scope {
  type: 'all' | 'era' | 'region' | 'field' | 'country'
  val: string | null
}
