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
          label: `🏛️ ${hist.name}`,
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
          label: `${mod.flagEmoji ?? '🌐'} ${mod.name}`,
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
  const sortedNames = [...allNames].sort((a, b) => b.length - a.length)
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
        label: `🏛️ ${hist.name}`,
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
        label: `${mod.flagEmoji ?? '🌐'} ${mod.name}`,
      }
    }
  }

  return null
}

/**
 * 빠른 검색창에 쉼표(,)·슬래시(/)·가운뎃점(·)으로 여러 국가명을 한꺼번에 입력했을 때
 * 각 토큰에 가장 잘 맞는 국가 후보들을 일괄 반환한다. (토큰이 2개 미만이면 빈 배열 반환)
 */
export function resolveBatchCountryQuery(
  rawQuery: string,
  modernCountries: ReadonlyArray<{ id: string; name: string; flagEmoji?: string | null } & CountrySearchShape>,
  historicalCountries: ReadonlyArray<{ id: string; name: string } & CountrySearchShape>,
  hintYearRange?: CountryHintYearRange | null,
  existingKeys?: ReadonlySet<string>,
): SuggestedCountryCandidate[] {
  const tokens = rawQuery
    .split(/[,，/·]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
  if (tokens.length < 2) return []

  const results: SuggestedCountryCandidate[] = []
  const seen = new Set<string>(existingKeys)
  const refYear = hintYearRange?.startYear ?? hintYearRange?.endYear ?? null

  for (const token of tokens) {
    const lower = token.toLowerCase()
    const modMatches = filterCountriesByQuery([...modernCountries], token).filter(
      (c) => !seen.has(`m:${c.id}`),
    )
    const histMatches = filterCountriesByQuery(
      [...historicalCountries],
      token,
    ).filter((c) => !seen.has(`h:${c.id}`))

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
          label: `${mod.flagEmoji ?? '🌐'} ${mod.name}`,
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
          label: `🏛️ ${hist.name}`,
        },
      })
    }
    candidates.sort((a, b) => b.score - a.score)
    if (candidates.length > 0) {
      const winner = candidates[0].item
      seen.add(winner.key)
      results.push(winner)
    }
  }

  return results
}
