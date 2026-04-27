/**
 * 사건 등록/수정 폼 zod 스키마.
 *
 * - 서버 DTO(`CreateEventDto`)를 그대로 1:1 매핑하지 않고,
 *   폼 입력에 자연스러운 형태(빈 문자열 허용·내부 nanoid 등)로 잡고
 *   submit 시 `api-mapper.ts`에서 DTO로 변환한다.
 * - 카테고리별로 분기되는 영역(군사·회담)은 항상 optional —
 *   선택된 카테고리에 따라 노출만 토글하고, 미사용 시 페이로드에 포함시키지 않는다.
 */
import { z } from 'zod'

// ─── primitives ────────────────────────────────────────────────────────────

const datePrecision = z.enum(['year', 'month', 'day'])

const dateField = z
  .object({
    value: z.string(), // 'YYYY' | 'YYYY-MM' | 'YYYY-MM-DD' | ''
    precision: datePrecision.optional(),
  })
  .refine(
    (d) => !d.value || /^\d{4}(-\d{2}(-\d{2})?)?$/.test(d.value),
    { message: '날짜 형식이 올바르지 않습니다 (YYYY · YYYY-MM · YYYY-MM-DD).' }
  )

// ─── relations ─────────────────────────────────────────────────────────────

const relatedPersonItem = z.object({
  rowId: z.string(), // 폼 내부 key (nanoid)
  personId: z.string().min(1),
  personName: z.string().optional(), // 표시용 캐시
  role: z.string().optional(),
  note: z.string().optional(),
})

const eventSectionItem = z.object({
  rowId: z.string(),
  title: z.string().min(1, '섹션 제목을 입력해주세요.'),
  content: z.string().default(''),
  sectionType: z.string().optional(),
})

const eventImageItem = z.object({
  rowId: z.string(),
  imageUrl: z.string().url('이미지 URL이 올바르지 않습니다.'),
  caption: z.string().optional(),
  source: z.string().optional(),
  isPrimary: z.boolean().default(false),
})

// ─── military (정규화된 신구조) ────────────────────────────────────────────

const sideLevel = z.enum(['COALITION', 'COUNTRY', 'FORCE'])
const participationType = z.enum(['MAIN', 'SUPPORT', 'LIMITED', 'OCCUPIED'])
const conflictType = z.enum(['BATTLE', 'WAR', 'SIEGE', 'CAMPAIGN', 'SKIRMISH'])
const combatType = z.enum(['LAND', 'NAVAL', 'AIR', 'AMPHIBIOUS', 'COMBINED'])

const militaryCountrySchema = z.object({
  rowId: z.string(),
  countryId: z.string().optional(),
  historicalCountryId: z.string().optional(),
  countryDisplayName: z.string().optional(), // 표시용
  commander: z.string().optional(),
  commanderPersonId: z.string().optional(),
  forces: z.string().optional(),
  participationType: participationType.optional(),
  joinDate: z.string().optional(),
  withdrawDate: z.string().optional(),
  description: z.string().optional(),
})

const belligerentSideSchema = z.object({
  rowId: z.string(),
  name: z.string().min(1, '세력 이름을 입력해주세요.'),
  level: sideLevel.optional(),
  commander: z.string().optional(),
  commanderPersonId: z.string().optional(),
  forces: z.string().optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  countries: z.array(militaryCountrySchema).default([]),
})

const countryCasualtiesSchema = z.object({
  rowId: z.string(),
  countryId: z.string().optional(),
  historicalCountryId: z.string().optional(),
  countryDisplayName: z.string().optional(),
  killed: z.string().optional(),
  wounded: z.string().optional(),
  missing: z.string().optional(),
  captured: z.string().optional(),
  civilianDeaths: z.string().optional(),
  total: z.string().optional(),
})

const casualtiesGroupSchema = z.object({
  rowId: z.string(),
  sideName: z.string().optional(),
  totalKilled: z.string().optional(),
  totalWounded: z.string().optional(),
  countryCasualties: z.array(countryCasualtiesSchema).default([]),
})

const militaryDetailsSchema = z.object({
  conflictType: conflictType.optional(),
  combatTypes: z.array(combatType).default([]),
  objective: z.string().optional(),
  tactics: z.string().optional(),
  strategy: z.string().optional(),
  outcome: z.string().optional(),
  territoryChanges: z.string().optional(),
  treaty: z.string().optional(),
  strategicImpact: z.string().optional(),
})

const militaryEventSchema = z.object({
  belligerentSides: z.array(belligerentSideSchema).default([]),
  details: militaryDetailsSchema.default({ combatTypes: [] }),
  casualties: z.array(casualtiesGroupSchema).default([]),
  warCost: z.string().optional(),
})

// ─── conference (서버에는 JSON 으로 저장됨) ──────────────────────────────

const conferenceParticipant = z.object({
  rowId: z.string(),
  countryId: z.string().optional(),
  historicalCountryId: z.string().optional(),
  countryDisplayName: z.string().optional(),
  representative: z.string().optional(),
  representativePersonId: z.string().optional(),
  role: z.string().optional(),
  note: z.string().optional(),
})

const treatyTerm = z.object({
  rowId: z.string(),
  title: z.string().optional(),
  content: z.string().optional(),
})

const conferenceTreaty = z.object({
  rowId: z.string(),
  name: z.string().optional(),
  treatyType: z.string().optional(),
  signedDate: z.string().optional(),
  effectiveDate: z.string().optional(),
  expiryDate: z.string().optional(),
  summary: z.string().optional(),
  terms: z.array(treatyTerm).default([]),
})

const conferenceEventSchema = z.object({
  conferenceType: z.string().optional(),
  hostCountry: z.string().optional(),
  venue: z.string().optional(),
  agenda: z.string().optional(),
  outcome: z.string().optional(),
  participants: z.array(conferenceParticipant).default([]),
  treaties: z.array(conferenceTreaty).default([]),
})

// ─── root ──────────────────────────────────────────────────────────────────

export const eventEditorSchema = z.object({
  // 기본 정보
  title: z.string().min(1, '사건명을 입력해주세요.'),
  description: z.string().optional(),
  startDate: dateField.default({ value: '' }),
  endDate: dateField.default({ value: '' }),
  location: z.string().optional(),
  categoryId: z.string().optional(),
  categoryName: z.string().optional(),
  keywords: z.array(z.string()).default([]),
  parentEventId: z.string().optional(),

  // 본문
  background: z.string().optional(),
  aftermath: z.string().optional(),
  eventSections: z.array(eventSectionItem).default([]),

  // 이미지
  eventImages: z.array(eventImageItem).default([]),

  // 위치
  cityId: z.string().optional(),
  administrativeDivisionId: z.string().optional(),
  historicalCountryId: z.string().optional(),

  // 관계
  relatedPersons: z.array(relatedPersonItem).default([]),
  relatedCountryIds: z.array(z.string()).default([]),
  relatedHistoricalCountryIds: z.array(z.string()).default([]),
  childEventIds: z.array(z.string()).default([]),

  // 카테고리별 (둘 다 항상 정의해두고, 사용 안하면 mapper에서 drop)
  militaryEvent: militaryEventSchema.optional(),
  conferenceEvent: conferenceEventSchema.optional(),
})

export type EventEditorFormValues = z.infer<typeof eventEditorSchema>
export type EventEditorBelligerentSide = z.infer<typeof belligerentSideSchema>
export type EventEditorMilitaryCountry = z.infer<typeof militaryCountrySchema>
export type EventEditorMilitaryEvent = z.infer<typeof militaryEventSchema>
export type EventEditorConferenceEvent = z.infer<typeof conferenceEventSchema>

/** 빈 폼 초기값 — 새 사건 생성 시 사용. */
export const emptyEventEditorValues: EventEditorFormValues = {
  title: '',
  description: '',
  startDate: { value: '' },
  endDate: { value: '' },
  location: '',
  categoryId: undefined,
  categoryName: undefined,
  keywords: [],
  parentEventId: undefined,
  background: '',
  aftermath: '',
  eventSections: [],
  eventImages: [],
  cityId: undefined,
  administrativeDivisionId: undefined,
  historicalCountryId: undefined,
  relatedPersons: [],
  relatedCountryIds: [],
  relatedHistoricalCountryIds: [],
  childEventIds: [],
  militaryEvent: undefined,
  conferenceEvent: undefined,
}
