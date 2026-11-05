import {
  type CountryPeriodShape,
  describeLifespanMismatch,
} from '@/shared/lib/country-period'
import {
  type CountryHintYearRange,
  type CountrySearchShape,
  filterCountriesByQuery,
  matchesHintYearRange,
} from '@/shared/lib/country-picker-filter'

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
  /**
   * 진영(D1) — 어느 편이었나. **생략=유지**(3상)라, 역할·순서만 바꾸는 저장이 소속을 건드리지 않는다.
   * '동맹국·적대국' 역할 대신 이걸 쓴다.
   */
  sideId?: string | null
  participation?: 'FULL' | 'LIMITED' | 'INDIRECT' | 'NON_COMBATANT' | null
  join?: { era: 'BC' | 'AD'; year: number; month?: number | null; day?: number | null } | null
  joinReason?: string | null
  withdraw?: { era: 'BC' | 'AD'; year: number; month?: number | null; day?: number | null } | null
  withdrawReason?: string | null
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
  /** 새로 고르지 않는 역할 — 현재 값일 때만 선택지에 보인다 */
  deprecated?: boolean
}> = [
  { value: 'PARTICIPANT', label: '참여국', hint: '사건에 관여한 일반 당사국' },
  { value: 'INITIATOR', label: '주도국', hint: '사건을 일으키거나 이끈 쪽' },
  { value: 'TARGET', label: '대상국', hint: '행위가 겨냥한 쪽' },
  /* 동맹국·적대국은 '누구의' 동맹·적인지 담지 못해 진영(D1)으로 대체됐다 — 새로 고르지 않는다.
     기존 값을 읽을 수 있게 목록에는 남기고 deprecated로 표시한다. */
  { value: 'ALLY', label: '동맹국', hint: '진영으로 대체됨 — 진영 모듈에서 편을 나누세요', deprecated: true },
  { value: 'ADVERSARY', label: '적대국', hint: '진영으로 대체됨 — 진영 모듈에서 편을 나누세요', deprecated: true },
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

const ROLE_HINT_BY_VALUE = new Map(
  EVENT_COUNTRY_ROLE_OPTIONS.map((option) => [option.value, option.hint]),
)

export function eventCountryRoleLabel(
  role: string | null | undefined,
): string | null {
  if (!role) return null
  return ROLE_LABEL_BY_VALUE.get(role as EventCountryRole) ?? null
}

export function eventCountryRoleHint(
  role: string | null | undefined,
): string | null {
  if (!role) return null
  return ROLE_HINT_BY_VALUE.get(role as EventCountryRole) ?? null
}

/**
 * 고른 세부 분야에 맞춘 참여국 '한 일(roleDescription)' 입력칸 placeholder.
 */
export function roleDescriptionPlaceholderForType(
  eventType?: string | null,
): string {
  switch (eventType) {
    case 'TREATY':
      return '비준·할양·배상 등 이 나라의 조약 내용 (선택)'
    case 'WAR':
    case 'BATTLE':
    case 'TERROR':
    case 'UPRISING':
      return '참전 규모·주력 부대·전과 등 (선택)'
    case 'STATEHOOD':
      return '독립 선포·병합·해체 경위 등 (선택)'
    case 'TERRITORY':
      return '내준·받은 땅과 그 경위 — 면적·인구는 영토 이전 줄에 (선택)'
    case 'SUMMIT':
    case 'ALLIANCE_BREAK':
      return '대표단 입장·합의·외교 조치 등 (선택)'
    case 'TRADE':
    case 'SANCTION':
    case 'AID':
      return '교역 품목·제재·원조 내역 등 (선택)'
    default:
      return '이 나라가 한 일 (선택)'
  }
}

/**
 * 참여국 순서 이동 — 위(up)/아래(down)로 한 칸 옮긴 새 배열을 돌려준다.
 * 경계 밖이면 원본 배열을 그대로 돌려준다.
 */
export function moveParticipant(
  participants: ReadonlyArray<EventCountryParticipant>,
  index: number,
  direction: 'up' | 'down',
): EventCountryParticipant[] {
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (
    index < 0 ||
    index >= participants.length ||
    targetIndex < 0 ||
    targetIndex >= participants.length
  ) {
    return [...participants]
  }
  const next = [...participants]
  const [moved] = next.splice(index, 1)
  next.splice(targetIndex, 0, moved)
  return next
}

const RECENT_PARTICIPANTS_STORAGE_KEY = 'papyrus.eventForm.recentParticipants'
const MAX_RECENT_PARTICIPANTS = 5

export interface RecentParticipantRef {
  countryId?: string | null
  historicalCountryId?: string | null
}

export function readRecentParticipants(): RecentParticipantRef[] {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = window.localStorage.getItem(RECENT_PARTICIPANTS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const result: RecentParticipantRef[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const candidate = item as Record<string, unknown>
      if (typeof candidate.countryId === 'string' && candidate.countryId) {
        result.push({ countryId: candidate.countryId })
      } else if (
        typeof candidate.historicalCountryId === 'string' &&
        candidate.historicalCountryId
      ) {
        result.push({ historicalCountryId: candidate.historicalCountryId })
      }
      if (result.length >= MAX_RECENT_PARTICIPANTS) break
    }
    return result
  } catch {
    return []
  }
}

export function recordRecentParticipants(
  participants: ReadonlyArray<{
    countryId?: string | null
    historicalCountryId?: string | null
  }>,
): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  if (participants.length === 0) return
  try {
    const fresh: RecentParticipantRef[] = []
    for (const row of participants) {
      if (row.countryId) fresh.push({ countryId: row.countryId })
      else if (row.historicalCountryId) {
        fresh.push({ historicalCountryId: row.historicalCountryId })
      }
    }
    if (fresh.length === 0) return
    const previous = readRecentParticipants()
    const merged: RecentParticipantRef[] = []
    const seen = new Set<string>()
    for (const item of [...fresh, ...previous]) {
      const key = participantKey(item)
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(item)
      if (merged.length >= MAX_RECENT_PARTICIPANTS) break
    }
    window.localStorage.setItem(
      RECENT_PARTICIPANTS_STORAGE_KEY,
      JSON.stringify(merged),
    )
  } catch {
    // ignore storage quota / privacy mode errors
  }
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

export interface SuggestedCountryCandidate {
  key: string
  countryId?: string
  historicalCountryId?: string
  name: string
  label: string
}

const TITLE_SHORTHAND_GROUPS: ReadonlyArray<{
  pattern: RegExp
  groups: ReadonlyArray<ReadonlyArray<string>>
}> = [
  {
    pattern: /청일/,
    groups: [
      ['청나라', '청'],
      ['일본 제국', '대일본제국', '일본'],
    ],
  },
  {
    pattern: /러일|노일/,
    groups: [
      ['러시아 제국', '러시아'],
      ['일본 제국', '대일본제국', '일본'],
    ],
  },
  {
    pattern: /보불/,
    groups: [
      ['프로이센', '프로이센 왕국'],
      ['프랑스 제2제국', '프랑스'],
    ],
  },
  {
    pattern: /보오/,
    groups: [
      ['프로이센', '프로이센 왕국'],
      ['오스트리아 제국', '오스트리아'],
    ],
  },
  {
    pattern: /독소/,
    groups: [
      ['나치 독일', '독일 제국', '독일'],
      ['소련', '소비에트 연방', '러시아'],
    ],
  },
  {
    pattern: /미소/,
    groups: [
      ['미국'],
      ['소련', '소비에트 연방'],
    ],
  },
  {
    pattern: /미중/,
    groups: [
      ['미국'],
      ['중국', '중화인민공화국', '청나라'],
    ],
  },
  {
    pattern: /영프|영불/,
    groups: [
      ['영국', '대영제국'],
      ['프랑스', '프랑스 왕국'],
    ],
  },
  {
    pattern: /영일/,
    groups: [
      ['영국', '대영제국'],
      ['일본 제국', '일본'],
    ],
  },
  {
    pattern: /미일/,
    groups: [
      ['미국'],
      ['일본 제국', '일본'],
    ],
  },
  {
    pattern: /한일|조일/,
    groups: [
      ['대한민국', '대한제국', '조선'],
      ['일본', '일본 제국'],
    ],
  },
  {
    pattern: /조미/,
    groups: [
      ['조선', '대한제국'],
      ['미국'],
    ],
  },
  {
    pattern: /조청/,
    groups: [
      ['조선'],
      ['청나라', '청'],
    ],
  },
  {
    pattern: /중일/,
    groups: [
      ['중화민국', '중국', '청나라'],
      ['일본 제국', '일본'],
    ],
  },
  {
    pattern: /임진왜란|정유재란/,
    groups: [
      ['조선'],
      ['일본'],
    ],
  },
  {
    pattern: /병자호란|정묘호란/,
    groups: [
      ['조선'],
      ['청나라', '청', '후금'],
    ],
  },
  {
    pattern: /병인양요/,
    groups: [
      ['조선'],
      ['프랑스 제2제국', '프랑스'],
    ],
  },
  {
    pattern: /신미양요/,
    groups: [
      ['조선'],
      ['미국'],
    ],
  },
]

const COUNTRY_LINEAGE_FAMILIES: ReadonlyArray<ReadonlyArray<string>> = [
  ['고조선', '고구려', '백제', '신라', '고려', '조선', '대한제국', '대한민국', '한국'],
  ['한나라', '당나라', '송나라', '원나라', '명나라', '후금', '청나라', '청', '중화민국', '중화인민공화국', '중국'],
  ['프로이센', '프로이센 왕국', '독일 제국', '바이마르 공화국', '나치 독일', '서독', '동독', '독일'],
  ['프랑스 왕국', '프랑스 제1공화국', '프랑스 제1제국', '프랑스 제2제국', '프랑스 제3공화국', '프랑스'],
  ['러시아 제국', '소련', '소비에트 연방', '러시아'],
  ['오스만 제국', '튀르키예', '터키'],
  ['대영제국', '잉글랜드 왕국', '영국'],
  ['에도 막부', '일본 제국', '대일본제국', '일본'],
  ['로마 왕정', '로마 공화정', '로마 공화국', '로마 제국', '서로마 제국', '이탈리아 왕국', '이탈리아'],
  ['오스트리아 제국', '오스트리아-헝가리 제국', '오스트리아'],
]

function pickBestCandidateForAliases(
  aliases: ReadonlyArray<string>,
  modernCountries: ReadonlyArray<{ id: string; name: string; flagEmoji?: string | null }>,
  historicalCountries: ReadonlyArray<{ id: string; name: string } & CountryPeriodShape>,
  hintYearRange?: CountryHintYearRange | null,
): SuggestedCountryCandidate | null {
  const refYear = hintYearRange?.startYear ?? hintYearRange?.endYear ?? null
  let bestScore = Number.NEGATIVE_INFINITY
  let best: SuggestedCountryCandidate | null = null

  aliases.forEach((alias, aliasIdx) => {
    const aliasPriority = Math.max(0, 20 - aliasIdx * 4)
    const lowerAlias = alias.toLowerCase()

    for (const hist of historicalCountries) {
      const lowerName = hist.name.toLowerCase()
      if (lowerName !== lowerAlias && !lowerName.startsWith(lowerAlias)) continue
      let score = aliasPriority + (lowerName === lowerAlias ? 30 : 10)
      if (hintYearRange && matchesHintYearRange(hist, hintYearRange)) {
        score += 100
      } else if (
        refYear != null &&
        describeLifespanMismatch(hist, refYear, { recordSupportsBc: true })
      ) {
        score -= 120
      } else if (refYear != null && refYear < 1945) {
        score += 35
      }
      if (score > bestScore) {
        bestScore = score
        best = {
          key: `h:${hist.id}`,
          historicalCountryId: hist.id,
          name: hist.name,
          label: hist.name,
        }
      }
    }

    for (const mod of modernCountries) {
      const lowerName = mod.name.toLowerCase()
      if (lowerName !== lowerAlias) continue
      let score = aliasPriority + 25
      if (refYear == null || refYear >= 1945) {
        score += 45
      } else {
        score += 10
      }
      if (score > bestScore) {
        bestScore = score
        best = {
          key: `m:${mod.id}`,
          countryId: mod.id,
          name: mod.name,
          label: mod.name,
        }
      }
    }
  })

  return best
}

/**
 * 사건명(`title`)에서 한자어 약칭('청일', '러일', '보불', '독소', '미소' 등) 및 직접 언급된
 * 국가명을 감지해 시대에 맞는 참여국 후보를 최대 5개 추천한다.
 */
export function suggestCountriesFromTitle(
  title: string | null | undefined,
  modernCountries: ReadonlyArray<{ id: string; name: string; flagEmoji?: string | null }>,
  historicalCountries: ReadonlyArray<{ id: string; name: string } & CountryPeriodShape>,
  hintYearRange?: CountryHintYearRange | null,
  existingKeys?: ReadonlySet<string>,
): SuggestedCountryCandidate[] {
  const trimmed = title?.trim() ?? ''
  if (trimmed.length < 2) return []

  const results: SuggestedCountryCandidate[] = []
  const seenKeys = new Set<string>(existingKeys)
  const seenNames = new Set<string>()

  const pushCandidate = (candidate: SuggestedCountryCandidate | null) => {
    if (!candidate) return
    if (seenKeys.has(candidate.key) || seenNames.has(candidate.name)) return
    seenKeys.add(candidate.key)
    seenNames.add(candidate.name)
    results.push(candidate)
  }

  for (const rule of TITLE_SHORTHAND_GROUPS) {
    if (rule.pattern.test(trimmed)) {
      for (const aliasGroup of rule.groups) {
        pushCandidate(
          pickBestCandidateForAliases(
            aliasGroup,
            modernCountries,
            historicalCountries,
            hintYearRange,
          ),
        )
      }
    }
  }

  // 사건명에 직접 국가 이름이 들어간 경우 (긴 이름부터 매칭해 '로마 제국'이 있을 때 '로마' 중복 방지)
  const directMatches: Array<{ name: string; aliases: string[] }> = []
  const allNames = new Set<string>()
  for (const hist of historicalCountries) {
    if (hist.name.trim().length >= 2 && trimmed.includes(hist.name.trim())) {
      allNames.add(hist.name.trim())
    }
  }
  for (const mod of modernCountries) {
    if (mod.name.trim().length >= 2 && trimmed.includes(mod.name.trim())) {
      allNames.add(mod.name.trim())
    }
  }
  const sortedNames = [...allNames].sort(
    (left, right) => right.length - left.length,
  )
  for (const matchedName of sortedNames) {
    if (
      directMatches.some(
        (existing) =>
          existing.name !== matchedName && existing.name.includes(matchedName),
      )
    ) {
      continue
    }
    const lineage = COUNTRY_LINEAGE_FAMILIES.find((family) =>
      family.includes(matchedName),
    )
    directMatches.push({
      name: matchedName,
      aliases: lineage ? [matchedName, ...lineage] : [matchedName],
    })
  }

  for (const item of directMatches) {
    pushCandidate(
      pickBestCandidateForAliases(
        item.aliases,
        modernCountries,
        historicalCountries,
        hintYearRange,
      ),
    )
    if (results.length >= 5) break
  }

  return results.slice(0, 5)
}

/**
 * 선택한 역사국가가 사건 연도(`eventSignedYear`)와 존속기간이 어긋날 때,
 * 같은 계보·이름군에서 해당 연도에 부합하는 대체 국가(역사국가 또는 현대국가)를 찾는다.
 */
export function findReplacementForMismatchedCountry(
  mismatchedCountry: { id: string; name: string },
  eventSignedYear: number | null | undefined,
  modernCountries: ReadonlyArray<{ id: string; name: string; flagEmoji?: string | null }>,
  historicalCountries: ReadonlyArray<{ id: string; name: string } & CountryPeriodShape>,
  existingKeys?: ReadonlySet<string>,
): SuggestedCountryCandidate | null {
  if (eventSignedYear == null) return null
  const name = mismatchedCountry.name.trim()
  const lineage = COUNTRY_LINEAGE_FAMILIES.find((family) =>
    family.some((member) => member === name || name.includes(member) || member.includes(name)),
  )
  const hint: CountryHintYearRange = {
    startYear: eventSignedYear,
    endYear: eventSignedYear,
  }

  // 1) 해당 연도에 존속기간이 일치하는 역사국가 우선 탐색
  for (const hist of historicalCountries) {
    if (hist.id === mismatchedCountry.id) continue
    if (existingKeys?.has(`h:${hist.id}`)) continue
    const inSameFamily = lineage
      ? lineage.some((member) => hist.name === member || hist.name.includes(member))
      : hist.name.slice(0, 2) === name.slice(0, 2)
    if (!inSameFamily) continue
    if (
      matchesHintYearRange(hist, hint) &&
      !describeLifespanMismatch(hist, eventSignedYear, { recordSupportsBc: true })
    ) {
      return {
        key: `h:${hist.id}`,
        historicalCountryId: hist.id,
        name: hist.name,
        label: hist.name,
      }
    }
  }

  // 2) 근현대(1945년 이후) 사건이면 같은 계보의 현대국가 제안
  if (eventSignedYear >= 1945) {
    for (const mod of modernCountries) {
      if (existingKeys?.has(`m:${mod.id}`)) continue
      const inSameFamily = lineage
        ? lineage.some((member) => mod.name === member || mod.name.includes(member))
        : mod.name.slice(0, 2) === name.slice(0, 2)
      if (!inSameFamily) continue
      return {
        key: `m:${mod.id}`,
        countryId: mod.id,
        name: mod.name,
        label: mod.name,
      }
    }
  }

  return null
}

/**
 * 빠른 검색창에 쉼표(,)·슬래시(/)·가운뎃점(·)으로 여러 국가명을 한꺼번에 입력했거나
 * 양자 약칭('청일', '러일', '영프', '독소', '한일' 등)을 입력했을 때
 * 각 국가 후보들을 일괄 반환한다. (매칭된 후보가 2개 미만이면 빈 배열 반환)
 */
export function resolveBatchCountryQuery(
  rawQuery: string,
  modernCountries: ReadonlyArray<{ id: string; name: string; flagEmoji?: string | null } & CountrySearchShape>,
  historicalCountries: ReadonlyArray<{ id: string; name: string } & CountrySearchShape>,
  hintYearRange?: CountryHintYearRange | null,
  existingKeys?: ReadonlySet<string>,
): SuggestedCountryCandidate[] {
  const trimmed = rawQuery.trim()
  if (!trimmed) return []

  const tokens = trimmed
    .split(/[,，/·]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)

  if (tokens.length < 2) {
    // 단일 토큰이라도 양자 사건 약칭('청일', '러일', '영프', '독소' 등)이면 두 국가를 한 번에 풀어준다
    const shorthandMatches: SuggestedCountryCandidate[] = []
    const seenKeys = new Set<string>(existingKeys)
    for (const rule of TITLE_SHORTHAND_GROUPS) {
      if (rule.pattern.test(trimmed)) {
        for (const aliasGroup of rule.groups) {
          const picked = pickBestCandidateForAliases(
            aliasGroup,
            modernCountries,
            historicalCountries,
            hintYearRange,
          )
          if (picked && !seenKeys.has(picked.key)) {
            seenKeys.add(picked.key)
            shorthandMatches.push(picked)
          }
        }
      }
    }
    return shorthandMatches.length >= 2 ? shorthandMatches : []
  }

  const results: SuggestedCountryCandidate[] = []
  const seen = new Set<string>(existingKeys)
  const refYear = hintYearRange?.startYear ?? hintYearRange?.endYear ?? null

  for (const token of tokens) {
    const lower = token.toLowerCase()
    const modMatches = filterCountriesByQuery([...modernCountries], token).filter(
      (country) => !seen.has(`m:${country.id}`),
    )
    const histMatches = filterCountriesByQuery(
      [...historicalCountries],
      token,
    ).filter((country) => !seen.has(`h:${country.id}`))

    const candidates: Array<{ score: number; item: SuggestedCountryCandidate }> = []
    for (const mod of modMatches) {
      let score = mod.name.toLowerCase() === lower ? 100 : mod.name.toLowerCase().startsWith(lower) ? 60 : 30
      if (refYear == null || refYear >= 1945) score += 25
      candidates.push({
        score,
        item: {
          key: `m:${mod.id}`,
          countryId: mod.id,
          name: mod.name,
          label: mod.name,
        },
      })
    }
    for (const hist of histMatches) {
      let score = hist.name.toLowerCase() === lower ? 100 : hist.name.toLowerCase().startsWith(lower) ? 60 : 30
      if (hintYearRange && matchesHintYearRange(hist, hintYearRange)) score += 50
      else if (refYear != null && refYear < 1945) score += 20
      candidates.push({
        score,
        item: {
          key: `h:${hist.id}`,
          historicalCountryId: hist.id,
          name: hist.name,
          label: hist.name,
        },
      })
    }
    candidates.sort((left, right) => right.score - left.score)
    if (candidates.length > 0) {
      const winner = candidates[0].item
      seen.add(winner.key)
      results.push(winner)
    }
  }

  return results
}

const ERA_MAJOR_HISTORICAL_NAMES = [
  '조선',
  '대한제국',
  '고려',
  '청나라',
  '명나라',
  '일본 제국',
  '에도 막부',
  '대영제국',
  '프랑스 왕국',
  '프랑스 제1공화국',
  '프랑스 제1제국',
  '프랑스 제3공화국',
  '프로이센 왕국',
  '독일 제국',
  '나치 독일',
  '러시아 제국',
  '소련',
  '오스만 제국',
  '오스트리아 제국',
  '오스트리아-헝가리 제국',
  '로마 제국',
  '로마 공화정',
]

const MAJOR_MODERN_NAMES = [
  '대한민국',
  '미국',
  '영국',
  '프랑스',
  '중국',
  '일본',
  '러시아',
  '독일',
  '이탈리아',
]

/**
 * 사건 연도(`hintYearRange`)가 있으면 해당 시대에 존속했던 주요 역사·현대 국가를,
 * 연도가 없으면 빈출 주요 국가를 골라 항상 눈에 보이는 빠른 추가 후보를 돌려준다.
 */
export function suggestCountriesForEra(
  modernCountries: ReadonlyArray<{ id: string; name: string; flagEmoji?: string | null }>,
  historicalCountries: ReadonlyArray<{ id: string; name: string } & CountryPeriodShape>,
  hintYearRange?: CountryHintYearRange | null,
  existingKeys?: ReadonlySet<string>,
  limit = 6,
): SuggestedCountryCandidate[] {
  const results: SuggestedCountryCandidate[] = []
  const seen = new Set<string>(existingKeys)
  const refYear = hintYearRange?.startYear ?? hintYearRange?.endYear ?? null

  const push = (candidate: SuggestedCountryCandidate) => {
    if (results.length >= limit) return
    if (seen.has(candidate.key)) return
    seen.add(candidate.key)
    results.push(candidate)
  }

  if (refYear != null && refYear < 1945 && hintYearRange) {
    // 1) 사건 연도에 존속기간이 일치하는 역사국가 중 주요국 우선
    const matchedHistorical = historicalCountries.filter(
      (hist) => !seen.has(`h:${hist.id}`) && matchesHintYearRange(hist, hintYearRange),
    )
    matchedHistorical.sort((left, right) => {
      const aMajor = ERA_MAJOR_HISTORICAL_NAMES.indexOf(left.name)
      const bMajor = ERA_MAJOR_HISTORICAL_NAMES.indexOf(right.name)
      if (aMajor !== -1 && bMajor !== -1) return aMajor - bMajor
      if (aMajor !== -1) return -1
      if (bMajor !== -1) return 1
      return left.name.localeCompare(right.name, 'ko')
    })
    for (const hist of matchedHistorical) {
      push({
        key: `h:${hist.id}`,
        historicalCountryId: hist.id,
        name: hist.name,
        label: hist.name,
      })
    }
  }

  // 2) 주요 현대국가 우선 배치
  const sortedModern = [...modernCountries].sort((left, right) => {
    const aMajor = MAJOR_MODERN_NAMES.indexOf(left.name)
    const bMajor = MAJOR_MODERN_NAMES.indexOf(right.name)
    if (aMajor !== -1 && bMajor !== -1) return aMajor - bMajor
    if (aMajor !== -1) return -1
    if (bMajor !== -1) return 1
    return left.name.localeCompare(right.name, 'ko')
  })
  for (const mod of sortedModern) {
    push({
      key: `m:${mod.id}`,
      countryId: mod.id,
      name: mod.name,
      label: mod.name,
    })
  }

  // 3) 여전히 남으면 역사국가로 채움
  for (const hist of historicalCountries) {
    push({
      key: `h:${hist.id}`,
      historicalCountryId: hist.id,
      name: hist.name,
      label: hist.name,
    })
  }

  return results
}

const ROLE_SORT_WEIGHT: Record<string, number> = {
  INITIATOR: 0,
  TARGET: 1,
  FOUNDED: 2,
  DISSOLVED: 3,
  MEDIATOR: 4,
  PARTICIPANT: 5,
  VICTIM: 6,
  BENEFICIARY: 7,
  OBSERVER: 8,
  ALLY: 9,
  ADVERSARY: 10,
  OTHER: 11,
}

/**
 * 참여국 목록을 역할 중요도(주도국 → 대상국 → 성립/소멸 → 조정/참여국 순)로 정렬한다.
 */
export function sortParticipantsByRolePriority<T extends EventCountryParticipant>(
  list: readonly T[],
): T[] {
  return [...list].sort((left, right) => {
    const leftWeight = ROLE_SORT_WEIGHT[left.role ?? 'PARTICIPANT'] ?? 5
    const rightWeight = ROLE_SORT_WEIGHT[right.role ?? 'PARTICIPANT'] ?? 5
    return leftWeight - rightWeight
  })
}

/**
 * 역할과 세부 분야 안내 문구에 맞춘 '이 나라가 한 일' 원클릭 빠른 서술 프리셋.
 */
export function quickRoleDescriptionPresets(
  role?: EventCountryRole,
  placeholder?: string,
): string[] {
  const hint = placeholder ?? ''
  if (hint.includes('조약')) {
    if (role === 'MEDIATOR') return ['협상 중재', '조약 주선']
    return ['조약 체결', '비준·서명', '협상 대표']
  }
  if (hint.includes('참전')) {
    if (role === 'INITIATOR') return ['선제 공격', '작전 주도', '침공']
    if (role === 'TARGET') return ['방어·항전', '피침', '반격']
    return ['참전', '병력 지원', '연합 작전']
  }
  if (hint.includes('독립')) {
    if (role === 'FOUNDED') return ['건국·독립 선포', '정부 수립']
    if (role === 'DISSOLVED') return ['국권 상실·해체', '멸망·병합']
    return ['승인·지원', '관여']
  }
  if (role === 'INITIATOR') return ['사건 주도', '발의·개최']
  if (role === 'TARGET') return ['대상·대응', '방어·수용']
  if (role === 'MEDIATOR') return ['중재·조정', '회담 주선']
  return ['핵심 참여', '공동 참여']
}

/**
 * 2개국 양자 사건에서 두 참여국의 순서와 역할(주도국↔대상국 등)을 한 번에 맞바꾼다.
 * 두 나라가 모두 기본값('PARTICIPANT')이면 새 1순위를 'INITIATOR'(주도국), 2순위를 'TARGET'(대상국)으로 자동 배정한다.
 */
export function swapTwoParticipants(
  participants: ReadonlyArray<EventCountryParticipant>,
): EventCountryParticipant[] {
  if (participants.length !== 2) return [...participants]
  const [first, second] = participants
  const firstRole = first.role ?? 'PARTICIPANT'
  const secondRole = second.role ?? 'PARTICIPANT'

  const nextFirstRole: EventCountryRole =
    firstRole === secondRole && firstRole === 'PARTICIPANT'
      ? 'INITIATOR'
      : firstRole
  const nextSecondRole: EventCountryRole =
    firstRole === secondRole && firstRole === 'PARTICIPANT'
      ? 'TARGET'
      : secondRole

  return [
    { ...second, role: nextFirstRole },
    { ...first, role: nextSecondRole },
  ]
}

export interface TitleYearSuggestion {
  startIso: string
  endIso: string
  label: string
  precision?: 'year' | 'month' | 'day'
}

function formatYearIso(year: number, isBc: boolean, month = 1, day = 1): string {
  const padded = String(year).padStart(4, '0')
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return isBc ? `-${padded}-${mm}-${dd}` : `${padded}-${mm}-${dd}`
}

/**
 * 사건명(`title`)에 포함된 연·월·일, 연·월, 연도 또는 연도 범위(예: '1919년 3월 1일 3·1 운동', '1830년 7월 혁명',
 * '1894년 청일 전쟁', '임진왜란 (1592~1598)', '기원전 202년 해하 전투')를 감지해 시작·종료 ISO와 정밀도 추천값을 돌려준다.
 */
export function extractYearSuggestionFromTitle(
  title: string | null | undefined,
): TitleYearSuggestion | null {
  const trimmed = title?.trim() ?? ''
  if (!trimmed) return null

  // 1) 연·월·일 (예: 1919년 3월 1일, 기원전 44년 3월 15일, 1950. 6. 25.)
  const korFullDateMatch = trimmed.match(
    /(기원전|BC|B\.C\.)?\s*(\d{1,4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/i,
  )
  if (korFullDateMatch) {
    const isBc = Boolean(korFullDateMatch[1])
    const year = Number(korFullDateMatch[2])
    const month = Number(korFullDateMatch[3])
    const day = Number(korFullDateMatch[4])
    if (
      year >= (isBc ? 1 : 100) &&
      year <= (isBc ? 9999 : 2100) &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      const iso = formatYearIso(year, isBc, month, day)
      return {
        startIso: iso,
        endIso: iso,
        label: `${isBc ? '기원전 ' : ''}${year}년 ${month}월 ${day}일`,
        precision: 'day',
      }
    }
  }

  const dotFullDateMatch = trimmed.match(
    /(?:^|[^\d])(\d{3,4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?/,
  )
  if (dotFullDateMatch) {
    const year = Number(dotFullDateMatch[1])
    const month = Number(dotFullDateMatch[2])
    const day = Number(dotFullDateMatch[3])
    if (
      year >= 100 &&
      year <= 2100 &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      const iso = formatYearIso(year, false, month, day)
      return {
        startIso: iso,
        endIso: iso,
        label: `${year}년 ${month}월 ${day}일`,
        precision: 'day',
      }
    }
  }

  // 2) 연·월 (예: 1830년 7월 혁명, 1917년 10월 혁명)
  const yearMonthMatch = trimmed.match(
    /(기원전|BC|B\.C\.)?\s*(\d{1,4})\s*년\s*(\d{1,2})\s*월(?!\s*\d)/i,
  )
  if (yearMonthMatch) {
    const isBc = Boolean(yearMonthMatch[1])
    const year = Number(yearMonthMatch[2])
    const month = Number(yearMonthMatch[3])
    if (
      year >= (isBc ? 1 : 100) &&
      year <= (isBc ? 9999 : 2100) &&
      month >= 1 &&
      month <= 12
    ) {
      const iso = formatYearIso(year, isBc, month, 1)
      return {
        startIso: iso,
        endIso: iso,
        label: `${isBc ? '기원전 ' : ''}${year}년 ${month}월`,
        precision: 'month',
      }
    }
  }

  // 3) 연도 구간 (예: 1592~1598, 1950년~1953년, 1914-1918)
  const rangeMatch = trimmed.match(
    /(기원전|BC|B\.C\.)?\s*(\d{3,4})\s*년?\s*[~～\-–—]\s*(기원전|BC|B\.C\.)?\s*(\d{3,4})\s*년?/i,
  )
  if (rangeMatch) {
    const startBc = Boolean(rangeMatch[1])
    const startYear = Number(rangeMatch[2])
    const endBc = Boolean(rangeMatch[3]) || startBc
    const endYear = Number(rangeMatch[4])
    if (startYear >= 100 && endYear >= 100) {
      return {
        startIso: formatYearIso(startYear, startBc),
        endIso: formatYearIso(endYear, endBc),
        label: `${startBc ? '기원전 ' : ''}${startYear}년 ~ ${endBc ? '기원전 ' : ''}${endYear}년`,
      }
    }
  }

  // 2) 기원전 단일 연도 (예: 기원전 202년, BC 44년)
  const bcSingleMatch = trimmed.match(/(?:기원전|BC|B\.C\.)\s*(\d{1,4})\s*년?/i)
  if (bcSingleMatch) {
    const year = Number(bcSingleMatch[1])
    if (year >= 1 && year <= 9999) {
      const iso = formatYearIso(year, true)
      return {
        startIso: iso,
        endIso: iso,
        label: `기원전 ${year}년`,
      }
    }
  }

  // 3) 서기 단일 연도 (예: 1894년 갑오개혁, 워털루 전투 (1815))
  const adSingleMatch =
    trimmed.match(/(?:^|[^\d])(\d{3,4})\s*년/) ??
    trimmed.match(/\((\d{3,4})\)/)
  if (adSingleMatch) {
    const year = Number(adSingleMatch[1])
    if (year >= 100 && year <= 2100) {
      const iso = formatYearIso(year, false)
      return {
        startIso: iso,
        endIso: iso,
        label: `${year}년`,
      }
    }
  }

  return null
}
