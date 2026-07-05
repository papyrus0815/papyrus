import { getUploadImageUrl } from '@/shared/api/upload'
import {
  type PersonNameFields,
  getPersonDisplayName,
} from '@/shared/lib/person-display-name'
import type { NodePerson, PersonMetaSource, PersonTooltipLine } from './types'

// 레이아웃 기하는 순수 모듈(geometry.ts)로 분리 — API 의존이 없어 단위 테스트 가능.
// 기존 import 경로(`./utils`) 호환을 위해 재노출.
export {
  isLeft,
  isRight,
  isChildOnLeftInPair,
  descendantsRowWidth,
  ancestorColumnWidth,
  computeChildLayouts,
  childrenCenterShift,
  type ChildLayout,
} from './geometry'

export function yearOf(value?: string | Date | null): number | null {
  if (!value) return null
  const date = typeof value === 'string' ? new Date(value) : value
  const time = date.getTime?.()
  // birthDate는 UTC 자정 저장 — UTC 기준으로 읽어야 연초 경계에서 -1년이 안 된다(백엔드와 동일).
  return time != null && !Number.isNaN(time) ? date.getUTCFullYear() : null
}

/** 표시용 최소 타입 — FamilyTreePerson·NodePerson 모두 구조적으로 만족 */
type YearParts = {
  birthYear?: number | null
  deathYear?: number | null
  birthEra?: string | null
  deathEra?: string | null
  birthDate?: string | Date | null
  deathDate?: string | Date | null
}

/** 크기값 연도 + era → 부호 있는 연도(BC=음수). 연대순 정렬·비교·표시에 일관 사용. */
export function signedYearFromParts(mag: number | null, era?: string | null): number | null {
  if (mag == null) return null
  return era === 'BC' ? -Math.abs(mag) : mag
}

/** birthYear(BFS) → birthDate(REST) 폴백 + era 부호. BC는 음수라 오름차순 정렬 시 연장자 우선. */
export function birthYearOf(person: YearParts): number | null {
  return signedYearFromParts(person.birthYear ?? yearOf(person.birthDate), person.birthEra)
}

export function deathYearOf(person: YearParts): number | null {
  return signedYearFromParts(person.deathYear ?? yearOf(person.deathDate), person.deathEra)
}

/** 부호 있는 연도 → 'BC n' / 'n' 표시 (음수 그대로 노출 방지). */
export function formatYear(signed: number | null): string | null {
  if (signed == null) return null
  return signed < 0 ? `BC ${-signed}` : String(signed)
}

export function isDeceasedOf(p: NodePerson): boolean {
  return Boolean(p.deathDate) || p.deathYear != null
}

export function lifeSpan(person: NodePerson): string | null {
  const birth = birthYearOf(person)
  const death = deathYearOf(person)
  if (birth == null && death == null) return null
  if (birth != null && death == null) return `${formatYear(birth)}–`
  if (birth == null && death != null) return `?–${formatYear(death)}`
  return `${formatYear(birth)}–${formatYear(death)}`
}

export function resolvePersonThumbnailSrc(p: {
  profileImageUrl?: string | null
  profileImages?: { url?: string | null }[] | null
}): string | null {
  const primary = p.profileImageUrl?.trim()
  if (primary) return getUploadImageUrl(primary) || primary
  const gallery = p.profileImages?.[0]?.url?.trim()
  if (gallery) return getUploadImageUrl(gallery) || gallery
  return null
}

/**
 * 아바타 placeholder 이니셜.
 * 가계도에선 같은 가문 인물이 모여 있어 표시 이름의 첫 글자가 모두 성(姓)으로 동일해지는
 * 문제가 있다("합스부르크 루돌프"·"합스부르크 마티아스" 모두 "합"). 따라서 given name(p.name)을
 * 우선 사용해 인물별로 다른 이니셜이 나오게 한다("루"·"마"). given이 비어 있으면
 * 표시 이름 첫 글자로 폴백.
 */
export function displayInitial(p: PersonNameFields): string {
  const given = p.name?.trim()
  if (given) return [...given][0] ?? '?'
  const full = getPersonDisplayName(p, true).trim()
  if (!full) return '?'
  return [...full][0] ?? '?'
}

/** 카드 hover/포커스 시 노출할 부가 정보 라인. 데이터가 없으면 빈 배열. */
export function buildPersonTooltipLines(person: PersonMetaSource): PersonTooltipLine[] {
  const lines: PersonTooltipLine[] = []
  if (person.originalName) lines.push({ label: '원어', value: person.originalName })
  if (person.preEnthronementTitle) lines.push({ label: '작호', value: person.preEnthronementTitle })
  if (person.templeName) lines.push({ label: '묘호', value: person.templeName })
  if (person.posthumousName) lines.push({ label: '시호', value: person.posthumousName })
  if (person.birthPlace) lines.push({ label: '출생', value: person.birthPlace })
  if (person.deathPlace) lines.push({ label: '사망', value: person.deathPlace })
  return lines
}

/** 접근성·기본 OS 툴팁용 — 시각적 hover 카드와 별개로 title 속성에 넣을 텍스트 */
export function buildPersonTooltip(person: PersonMetaSource): string | undefined {
  const lines = buildPersonTooltipLines(person)
  if (lines.length === 0) return undefined
  return lines.map((l) => `${l.label} — ${l.value}`).join('\n')
}
