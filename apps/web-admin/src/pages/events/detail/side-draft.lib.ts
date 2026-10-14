/**
 * 진영 초안 — 참여국 역할(주도·대상…)로 두 진영을 미리 나눈다.
 *
 * 전쟁/군사 113건 중 진영이 있는 사건은 5건뿐이었다. '진영 1·진영 2' 빈 껍데기를 만든 뒤 나라를
 * 한 곳씩 옮겨 넣어야 해서 쓰지 않았다. 그런데 참여국 역할은 이미 꽤 채워져 있다(주도국 47 ·
 * 대상국 6 · 동맹 13 · 적대 12 · 피해 17행) — 그 역할로 편을 미리 갈라 둔다
 * (docs/event-category-features-review.md §3 전쟁/군사).
 *
 * 규칙(보수적):
 *  - 진영 A = 주도국(INITIATOR) + 동맹국(ALLY)
 *  - 진영 B = 대상국(TARGET) + 적대국(ADVERSARY) + 피해국(VICTIM)
 *  - 중재·관찰·수혜·참여·건국·멸망·기타는 **어느 편에도 넣지 않는다** — 역할만으로 편을 알 수 없다.
 *  - 양쪽에 한 곳 이상씩 있어야 초안을 낸다. 한쪽만 있으면 편을 가른 것이 아니다.
 *  - 이미 진영에 든 나라는 건드리지 않는다(초안은 진영이 없는 사건에서만 쓰인다).
 *
 * ALLY·ADVERSARY는 '누구의' 동맹·적인지 담지 못해 deprecated(country-participant.ts)다. 그래서
 * 이 초안이 곧 그 두 역할을 진영으로 옮기는 길이기도 하다 — 단, 기준은 주도국 쪽이라고 가정한다.
 */
import { participantKey } from '@/entities/event/model/country-participant'

interface DraftCountry {
  id: string
  name: string
  role?: string | null
  sideId?: string | null
}

export interface SideDraft {
  sides: [DraftSide, DraftSide]
  /** 어느 편에도 넣지 않은 참여국 이름(중재·관찰 등) */
  unassigned: string[]
}

export interface DraftSide {
  name: string
  color: string
  /** participantKey 목록 — 참여국 줄의 sideId를 채울 대상 */
  memberKeys: string[]
  memberNames: string[]
}

const SIDE_A_ROLES = new Set(['INITIATOR', 'ALLY'])
const SIDE_B_ROLES = new Set(['TARGET', 'ADVERSARY', 'VICTIM'])

/** 기존 '진영 시작'과 같은 색 — 진영 모듈의 첫 두 색 관례 */
const SIDE_COLORS: [string, string] = ['#1d4ed8', '#b91c1c']

export function draftSidesFromRoles(
  modern: ReadonlyArray<DraftCountry> = [],
  historical: ReadonlyArray<DraftCountry> = [],
): SideDraft | null {
  const rows = [
    ...modern.map((country) => ({ ...country, key: participantKey({ countryId: country.id }) })),
    ...historical.map((country) => ({ ...country, key: participantKey({ historicalCountryId: country.id }) })),
  ].filter((row) => !row.sideId)

  const sideA = rows.filter((row) => SIDE_A_ROLES.has(row.role ?? ''))
  const sideB = rows.filter((row) => SIDE_B_ROLES.has(row.role ?? ''))
  if (sideA.length === 0 || sideB.length === 0) return null

  /* 진영 이름은 각 편의 첫 나라(주도국·대상국이 있으면 그 나라) — '진영 1'보다 바로 읽힌다 */
  const lead = (members: typeof rows, preferred: string) =>
    (members.find((row) => row.role === preferred) ?? members[0]).name
  const toSide = (members: typeof rows, preferred: string, color: string): DraftSide => ({
    name: `${lead(members, preferred)} 측`,
    color,
    memberKeys: members.map((row) => row.key),
    memberNames: members.map((row) => row.name),
  })

  return {
    sides: [toSide(sideA, 'INITIATOR', SIDE_COLORS[0]), toSide(sideB, 'TARGET', SIDE_COLORS[1])],
    unassigned: rows
      .filter((row) => !SIDE_A_ROLES.has(row.role ?? '') && !SIDE_B_ROLES.has(row.role ?? ''))
      .map((row) => row.name),
  }
}
