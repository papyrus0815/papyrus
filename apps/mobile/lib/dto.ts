// API 응답 타입 (DTO 미러) — 화면에서 공유

export type EraStr = 'AD' | 'BC' | 'BCE' | 'CE' | string

export type EventListItem = {
  id: string
  title: string
  description?: string | null
  startDate?: string | null
  startDatePrecision?: string | null
  endDate?: string | null
  endDatePrecision?: string | null
  location?: string | null
  categoryId?: string | null
  category?: { id: string; name: string } | null
  thumbnail?: string | null
  thumbnailUrl?: string | null
  keywords?: string[] | null
}

export type EventDetail = EventListItem & {
  background?: string | null
  aftermath?: string | null
  parentEventId?: string | null
  parentEvent?: EventListItem | null
  childEvents?: EventListItem[]
  cityId?: string | null
  administrativeDivisionId?: string | null
  historicalCountryId?: string | null
  eventSections?: Array<{
    id: string
    title: string
    content: string
    order: number
    sectionType?: string
  }>
  eventImages?: Array<{
    id: string
    imageUrl: string
    caption?: string
    source?: string
    order: number
    isPrimary: boolean
  }>
  relatedCountries?: Array<{ id: string; name: string; flagEmoji?: string }>
  relatedHistoricalCountries?: Array<{ id: string; name: string }>
  relatedPersons?: Array<{
    id: string
    personId: string
    role?: string | null
    note?: string | null
    person?: { id: string; name: string; surname?: string | null }
  }>
}

export type PersonListItem = {
  id: string
  name: string
  surname?: string | null
  nameDisplayOrder?: string | null
  profileImageUrl?: string | null
  birthEra?: EraStr | null
  birthYear?: number | null
  birthMonth?: number | null
  birthDay?: number | null
  deathEra?: EraStr | null
  deathYear?: number | null
  deathMonth?: number | null
  deathDay?: number | null
  isAlive?: boolean | null
  isDeathDateUnknown?: boolean | null
  gender?: string | null
  country?: { id: string; name: string; flagEmoji?: string | null } | null
  dynasty?: { id: string; name: string } | null
  influence?: number | null
}

export type FamilyMember = {
  id: string
  name: string
  surname?: string | null
  nameDisplayOrder?: string | null
  regnalName?: string | null
  gender?: string | null
  dynasty?: { id: string; name: string } | null
  birthEra?: EraStr | null
  birthYear?: number | null
  birthMonth?: number | null
  birthDay?: number | null
  deathEra?: EraStr | null
  deathYear?: number | null
  deathMonth?: number | null
  deathDay?: number | null
}

export type SovereignReign = {
  id?: string
  startDate?: string | null
  endDate?: string | null
  regnalName?: string | null
  regnalNumber?: number | null
  notes?: string | null
  country?: { id: string; name: string } | null
  historicalCountry?: { id: string; name: string } | null
  historicalCountryId?: string | null
}

export type GovernmentPosition = {
  id?: string
  startDate?: string | null
  endDate?: string | null
  startDatePrecision?: string | null
  endDatePrecision?: string | null
  notes?: string | null
  positionType?: string | null
  title?: string | null
  positionName?: string | null
  positionDefinition?: {
    id?: string
    title?: string | null
    titleEn?: string | null
    name?: string | null
  } | null
  position?: { name?: string | null } | null
  country?: { id: string; name: string } | null
  historicalCountry?: { id: string; name: string } | null
}

export type SpouseRelation = {
  id: string
  spouseId?: string | null
  marriageStartDate?: string | null
  marriageEndDate?: string | null
  note?: string | null
  spouse?: { id: string; name: string; surname?: string | null } | null
}

export type PersonDetail = PersonListItem & {
  middleName?: string | null
  originalName?: string | null
  surnameMeaning?: string | null
  nameMeaning?: string | null
  middleNameMeaning?: string | null
  regnalName?: string | null
  templeName?: string | null
  posthumousName?: string | null
  biography?: string | null
  religion?: { id: string; name: string } | null
  denomination?: { id: string; name: string } | null
  birthCity?: { id: string; name: string } | null
  deathCity?: { id: string; name: string } | null
  birthAdminDivision?: { id: string; name: string } | null
  deathAdminDivision?: { id: string; name: string } | null
  birthPlaceText?: string | null
  deathPlaceText?: string | null
  deathType?: string | null
  deathCause?: string | null
  deathNote?: string | null
  nicknames?: Array<{ id: string; nickname: string; type?: string | null }>
  father?: FamilyMember | null
  mother?: FamilyMember | null
  spouse?: FamilyMember | null
  children?: FamilyMember[]
  siblings?: FamilyMember[]
  governmentPositions?: GovernmentPosition[]
  sovereignReigns?: SovereignReign[]
  spouseRelations?: SpouseRelation[]
  events?: unknown[]
  humanRelationships?: unknown[]
}

export type CountryListItem = {
  id: string
  name: string
  enName?: string | null
  stateType?: string | null
  entityKind?: string | null
  thumbnailUrl?: string | null
  startEra?: EraStr | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  endEra?: EraStr | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
}

export type CountryDetail = CountryListItem & {
  nameOrigin?: string | null
  description?: string | null
  history?: string | null
  parentModernCountryIds?: string[]
  parentHistoricalCountryIds?: string[]
  transitionEventType?: string | null
}
