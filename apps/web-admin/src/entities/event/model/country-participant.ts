/**
 * 사건 참여국 — **화면 전체가 공유하는 단일 개념**.
 *
 * 한 줄 = "이 사건에서 이 나라가 맡은 배역". 예전에 따로 놀던 세 가지
 *   - `relatedCountryIds` / `relatedHistoricalCountryIds` (id 배열)
 *   - `primaryCountryId` (별표 = 주도국)
 *   - `EventCountryRelation.role` (시드만 채우고 UI엔 없던 10종)
 * 는 여기로 접혔다. **주도국은 role='INITIATOR'일 뿐**이라 별표 개념은 사라졌다.
 *
 * 서버 계약(`relatedCountries`)과 같은 모양이라 폼·상세가 변환 없이 그대로 보낸다.
 */
export type EventCountryRole =
  | 'INITIATOR'
  | 'TARGET'
  | 'PARTICIPANT'
  | 'ALLY'
  | 'ADVERSARY'
  | 'MEDIATOR'
  | 'OBSERVER'
  | 'VICTIM'
  | 'BENEFICIARY'
  | 'FOUNDED'
  | 'DISSOLVED'
  | 'OTHER'

export interface EventCountryParticipant {
  /** 현대 국가 id — historicalCountryId와 배타 */
  countryId?: string | null
  historicalCountryId?: string | null
  role?: EventCountryRole
  /** "이 나라가 이 사건에서 무엇을 했나" — 조약이면 국가별 사실이 여기 */
  roleDescription?: string | null
  note?: string | null
}

/**
 * 역할 라벨. 배열 순서가 곧 선택지 순서다 — 흔한 것부터, 서로 짝이 되는 것끼리.
 * (주도↔대상, 동맹↔적대, 중재↔관찰, 피해↔수혜, 건국↔멸망)
 */
export const EVENT_COUNTRY_ROLE_OPTIONS: ReadonlyArray<{
  value: EventCountryRole
  label: string
  /** 선택 UI의 보조 설명 — 역할이 10종이라 이름만으론 고르기 어렵다 */
  hint: string
}> = [
  { value: 'PARTICIPANT', label: '참여국', hint: '사건에 관여한 일반 당사국' },
  { value: 'INITIATOR', label: '주도국', hint: '사건을 일으키거나 이끈 쪽' },
  { value: 'TARGET', label: '대상국', hint: '행위가 겨냥한 쪽' },
  { value: 'ALLY', label: '동맹국', hint: '주도국 편에서 함께한 쪽' },
  { value: 'ADVERSARY', label: '적대국', hint: '맞선 쪽' },
  { value: 'MEDIATOR', label: '중재국', hint: '조정·중개를 맡은 쪽' },
  { value: 'OBSERVER', label: '관찰국', hint: '참관·배석만 한 쪽' },
  { value: 'VICTIM', label: '피해국', hint: '손해를 입은 쪽' },
  { value: 'BENEFICIARY', label: '수혜국', hint: '이득을 본 쪽' },
  { value: 'FOUNDED', label: '건국', hint: '이 사건으로 성립·독립한 나라' },
  { value: 'DISSOLVED', label: '멸망', hint: '이 사건으로 망하거나 병합된 나라' },
  { value: 'OTHER', label: '기타', hint: '위에 없는 관계' },
]

const ROLE_LABEL_BY_VALUE = new Map(
  EVENT_COUNTRY_ROLE_OPTIONS.map((option) => [option.value, option.label]),
)

export function eventCountryRoleLabel(
  role: string | null | undefined,
): string | null {
  if (!role) return null
  return ROLE_LABEL_BY_VALUE.get(role as EventCountryRole) ?? null
}

/** 참여국 한 줄의 신원 — 현대/역사가 같은 uuid를 쓰더라도 섞이지 않는다 */
export function participantKey(participant: {
  countryId?: string | null
  historicalCountryId?: string | null
}): string {
  return participant.countryId
    ? `m:${participant.countryId}`
    : `h:${participant.historicalCountryId}`
}

/**
 * 상세 응답의 두 배열(현대·역사)을 **하나의 참여국 목록**으로 되접는다.
 * 서버는 표시상의 편의로 나눠 보내지만, 편집은 언제나 합쳐진 한 목록으로 한다 —
 * 그래야 순서(sortOrder)가 두 배열에 걸쳐 일관되게 유지된다.
 */
export function toParticipants(
  modern: ReadonlyArray<{
    id: string
    role?: string | null
    roleDescription?: string | null
    note?: string | null
    sortOrder?: number
  }> = [],
  historical: ReadonlyArray<{
    id: string
    role?: string | null
    roleDescription?: string | null
    note?: string | null
    sortOrder?: number
  }> = [],
): EventCountryParticipant[] {
  const rows = [
    ...modern.map((country, index) => ({
      sortOrder: country.sortOrder ?? index,
      participant: {
        countryId: country.id,
        role: (country.role ?? undefined) as EventCountryRole | undefined,
        roleDescription: country.roleDescription ?? null,
        note: country.note ?? null,
      } satisfies EventCountryParticipant,
    })),
    ...historical.map((country, index) => ({
      sortOrder: country.sortOrder ?? index,
      participant: {
        historicalCountryId: country.id,
        role: (country.role ?? undefined) as EventCountryRole | undefined,
        roleDescription: country.roleDescription ?? null,
        note: country.note ?? null,
      } satisfies EventCountryParticipant,
    })),
  ]
  rows.sort((left, right) => left.sortOrder - right.sortOrder)
  return rows.map((row) => row.participant)
}
