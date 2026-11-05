import { getUploadImageUrl } from '@/shared/api/upload'
import { formatLifespan as formatLifespanText } from '@/shared/lib/lifespan-text'
import {
  MARRIAGE_END_REASON_LABELS,
  MARRIAGE_RANK_LABELS,
  resolvePerspectiveMarriageRankLabel,
} from '@/shared/lib/marriage-rank-labels'
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

/**
 * 형제·자녀·후손 공통 정렬:
 * 1) 양쪽 모두 통합 출생 서열(birthOrder)이 있으면 birthOrder 오름차순
 * 2) 동일 성별(gender)이며 양쪽 모두 동성 서열(genderBirthOrder)이 있으면 genderBirthOrder 오름차순
 * 3) 양쪽 모두 출생연도(birthYearOf)가 있으면 출생연도 오름차순 (한쪽만 birthOrder가 있을 때 확정 출생연도가 역전되지 않게 보장)
 * 4) 한쪽만 있는 birthOrder → 출생연도 → 활동연대(floruitStartYear) → genderBirthOrder → id 순 폴백
 */
export type SiblingSortComparable = YearParts & {
  id?: string
  gender?: string | null
  birthOrder?: number | null
  genderBirthOrder?: number | null
  floruitStartYear?: number | null
  floruitEra?: string | null
}

export function compareSiblingChronology(
  a: SiblingSortComparable,
  b: SiblingSortComparable,
): number {
  if (a.birthOrder != null && b.birthOrder != null && a.birthOrder !== b.birthOrder) {
    return a.birthOrder - b.birthOrder
  }
  const ga = (a.gender ?? '').toUpperCase()
  const gb = (b.gender ?? '').toUpperCase()
  if (
    ga &&
    gb &&
    ga === gb &&
    a.genderBirthOrder != null &&
    b.genderBirthOrder != null &&
    a.genderBirthOrder !== b.genderBirthOrder
  ) {
    return a.genderBirthOrder - b.genderBirthOrder
  }
  const ay = birthYearOf(a)
  const by = birthYearOf(b)
  if (ay != null && by != null && ay !== by) return ay - by

  const ao = a.birthOrder ?? Number.POSITIVE_INFINITY
  const bo = b.birthOrder ?? Number.POSITIVE_INFINITY
  if (ao !== bo) return ao - bo

  const ayInf = ay ?? Number.POSITIVE_INFINITY
  const byInf = by ?? Number.POSITIVE_INFINITY
  if (ayInf !== byInf) return ayInf - byInf

  const af = signedYearFromParts(a.floruitStartYear ?? null, a.floruitEra) ?? Number.POSITIVE_INFINITY
  const bf = signedYearFromParts(b.floruitStartYear ?? null, b.floruitEra) ?? Number.POSITIVE_INFINITY
  if (af !== bf) return af - bf

  const ago = a.genderBirthOrder ?? Number.POSITIVE_INFINITY
  const bgo = b.genderBirthOrder ?? Number.POSITIVE_INFINITY
  if (ago !== bgo) return ago - bgo

  return 0
}

export function compareSiblings(
  a: SiblingSortComparable,
  b: SiblingSortComparable,
): number {
  const chrono = compareSiblingChronology(a, b)
  if (chrono !== 0) return chrono
  return String(a.id ?? '').localeCompare(String(b.id ?? ''))
}

/**
 * 친족 호칭(백부 vs 숙부, 양백부 vs 양숙부, 형수 vs 제수) 전용 연장자 확정 비교.
 * - 음수(<0): a가 확실히 손위(연장자)
 * - 양수(>0): a가 확실히 손아래(연하자)
 * - null: 한쪽은 출생연도만 있고 다른 쪽은 2순위 이하 서열만 있는 등 직접 비교가 불가능해 단정할 수 없음
 */
export function compareSiblingSeniority(
  a: SiblingSortComparable,
  b: SiblingSortComparable,
): number | null {
  if (a.birthOrder != null && b.birthOrder != null && a.birthOrder !== b.birthOrder) {
    return a.birthOrder - b.birthOrder
  }
  const ga = (a.gender ?? '').toUpperCase()
  const gb = (b.gender ?? '').toUpperCase()
  const sameGender = Boolean(ga && gb && ga === gb)
  if (
    sameGender &&
    a.genderBirthOrder != null &&
    b.genderBirthOrder != null &&
    a.genderBirthOrder !== b.genderBirthOrder
  ) {
    return a.genderBirthOrder - b.genderBirthOrder
  }
  const ay = birthYearOf(a)
  const by = birthYearOf(b)
  if (ay != null && by != null && ay !== by) {
    return ay - by
  }
  if (a.birthOrder === 1 && (b.birthOrder == null || b.birthOrder > 1)) {
    return -1
  }
  if (b.birthOrder === 1 && (a.birthOrder == null || a.birthOrder > 1)) {
    return 1
  }
  if (sameGender) {
    if (a.genderBirthOrder === 1 && (b.genderBirthOrder == null || b.genderBirthOrder > 1)) {
      return -1
    }
    if (b.genderBirthOrder === 1 && (a.genderBirthOrder == null || a.genderBirthOrder > 1)) {
      return 1
    }
  }
  const af = signedYearFromParts(a.floruitStartYear ?? null, a.floruitEra)
  const bf = signedYearFromParts(b.floruitStartYear ?? null, b.floruitEra)
  if (ay == null && by == null && af != null && bf != null && af !== bf) {
    return af - bf
  }
  return null
}

export function isDeceasedOf(p: NodePerson): boolean {
  if (Boolean(p.deathDate) || p.deathYear != null) return true
  if (
    p.isAlive === false &&
    (birthYearOf(p) != null || p.floruitStartYear != null || p.floruitEndYear != null)
  ) {
    return true
  }
  return false
}

export function lifeSpan(person: NodePerson): string | null {
  const birth = birthYearOf(person)
  const death = deathYearOf(person)
  const floruitStart = signedYearFromParts(person.floruitStartYear ?? null, person.floruitEra)
  const floruitEnd = signedYearFromParts(person.floruitEndYear ?? null, person.floruitEra)
  if (birth == null && death == null && floruitStart == null && floruitEnd == null) return null
  return (
    formatLifespanText({
      birthYear: birth,
      deathYear: death,
      isAlive: person.isAlive != null ? Boolean(person.isAlive) : death == null,
      floruitStartYear: floruitStart,
      floruitEndYear: floruitEnd,
    }) || null
  )
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
  if (person.birthOrder != null || person.genderBirthOrder != null) {
    const g = (person.gender ?? '').toUpperCase()
    const genderSuffix = g === 'MALE' ? '남' : g === 'FEMALE' ? '녀' : '번째(동성)'
    const parts: string[] = []
    if (person.genderBirthOrder != null) {
      parts.push(
        person.genderBirthOrder === 1 && (g === 'MALE' || g === 'FEMALE')
          ? g === 'MALE'
            ? '장남'
            : '장녀'
          : `${person.genderBirthOrder}${genderSuffix}`,
      )
    }
    if (person.birthOrder != null) {
      parts.push(`${person.birthOrder}번째`)
    }
    lines.push({ label: '서열', value: parts.join(' · ') })
  }
  if (person.birthPlace) lines.push({ label: '출생', value: person.birthPlace })
  if (person.deathPlace) lines.push({ label: '사망', value: person.deathPlace })
  if (person.marriageRank && MARRIAGE_RANK_LABELS[person.marriageRank]) {
    const viewerPersonId =
      person.rankHolderId && person.id && person.rankHolderId !== person.id
        ? person.rankHolderId
        : null
    const rankLabel =
      resolvePerspectiveMarriageRankLabel({
        marriageRank: person.marriageRank,
        rankHolderId: person.rankHolderId,
        viewerPersonId,
        spouseId: person.id ?? null,
        spouseGender: person.gender ?? null,
      }) ?? MARRIAGE_RANK_LABELS[person.marriageRank]
    lines.push({ label: '혼인 형태', value: rankLabel })
  }
  if (
    person.marriageEndReason &&
    MARRIAGE_END_REASON_LABELS[person.marriageEndReason]
  ) {
    lines.push({
      label: '혼인 해소',
      value: MARRIAGE_END_REASON_LABELS[person.marriageEndReason],
    })
  }
  if (person.marriageStartYear != null || person.marriageEndYear != null) {
    const startLabel = formatYear(person.marriageStartYear ?? null) ?? '?'
    const endLabel = formatYear(person.marriageEndYear ?? null) ?? ''
    lines.push({ label: '혼인 기간', value: `${startLabel}–${endLabel}` })
  }
  if (person.marriageNote) lines.push({ label: '혼인 비고', value: person.marriageNote })
  // 형제·자녀 카드 전용 — withParentNames / withSiblingKinshipMeta가 주입
  if (person.fatherName) lines.push({ label: '아버지', value: person.fatherName })
  if (person.motherName) lines.push({ label: '어머니', value: person.motherName })
  if (person.adoptiveFatherName)
    lines.push({ label: '양부(입양)', value: person.adoptiveFatherName })
  if (person.adoptiveMotherName)
    lines.push({ label: '양모(입양)', value: person.adoptiveMotherName })
  if (person.kinshipNote) lines.push({ label: '형제 관계', value: person.kinshipNote })
  return lines
}

/** 접근성·기본 OS 툴팁용 — 시각적 hover 카드와 별개로 title 속성에 넣을 텍스트 */
export function buildPersonTooltip(person: PersonMetaSource): string | undefined {
  const lines = buildPersonTooltipLines(person)
  if (lines.length === 0) return undefined
  return lines.map((l) => `${l.label} — ${l.value}`).join('\n')
}
