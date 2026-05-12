import { getUploadImageUrl } from '@/shared/api/upload'
import {
  type PersonNameFields,
  getPersonDisplayName,
} from '@/shared/lib/person-display-name'
import { CHILD_GAP, NODE_W, SPOUSE_JOIN_W } from './constants'
import type { ChildPerson, NodePerson, PersonMetaSource, PersonTooltipLine } from './types'

export function yearOf(d?: string | Date | null): number | null {
  if (!d) return null
  const dt = typeof d === 'string' ? new Date(d) : d
  const t = dt.getTime?.()
  return t && !isNaN(t) ? dt.getFullYear() : null
}

/** birthYear(BFS) → birthDate(REST) 순으로 폴백 */
export function birthYearOf(p: NodePerson): number | null {
  return p.birthYear ?? yearOf(p.birthDate)
}

export function deathYearOf(p: NodePerson): number | null {
  return p.deathYear ?? yearOf(p.deathDate)
}

export function isDeceasedOf(p: NodePerson): boolean {
  return Boolean(p.deathDate) || p.deathYear != null
}

export function lifeSpan(p: NodePerson): string | null {
  const b = birthYearOf(p)
  const d = deathYearOf(p)
  if (b == null && d == null) return null
  if (b != null && d == null) return `${b}–`
  if (b == null && d != null) return `?–${d}`
  return `${b}–${d}`
}

export function isLeft(p?: NodePerson | null): boolean {
  const g = (p?.gender ?? '').toUpperCase()
  return g === 'MALE' || g === 'M'
}

export function isRight(p?: NodePerson | null): boolean {
  const g = (p?.gender ?? '').toUpperCase()
  return g === 'FEMALE' || g === 'F'
}

/**
 * ChildPair 안에서 자녀가 좌/우 어느 쪽에 놓이는지 결정.
 *  - 명시 gender 우선: child=M 또는 spouse=F → 자녀 왼쪽
 *  - 그 다음 spouse=M 또는 child=F → 자녀 오른쪽
 *  - 둘 다 미지정 → 기본 왼쪽
 *
 * 동일 휴리스틱이 ChildPair $childOffset 계산과 ForkToChildren 가로 바 끝점 계산
 * 양쪽에서 필요하므로 단일 출처로 추출. 두 곳이 어긋나면 fork 선이 자녀 카드를
 * 벗어나 배우자까지 침범하는 정렬 문제 발생.
 */
export function isChildOnLeftInPair(c: ChildPerson): boolean {
  if (!c.spouse) return true
  if (isLeft(c) || isRight(c.spouse)) return true
  if (isLeft(c.spouse) || isRight(c)) return false
  return true
}

/**
 * ChildPair 안에서 자녀 카드 중심 x좌표(페어 좌측 기준 px).
 * fork 가로 바 끝점과 ChildPair::before 수직 세그먼트 위치가 정확히 일치해야 함.
 */
export function childCenterOffsetInPair(c: ChildPerson): number {
  if (!c.spouse) return NODE_W / 2
  return isChildOnLeftInPair(c) ? NODE_W / 2 : NODE_W + SPOUSE_JOIN_W + NODE_W / 2
}

/** ChildPair 전체 폭(자녀 단독: NODE_W, 배우자 동반: NODE_W*2 + SPOUSE_JOIN_W) */
export function childPairWidth(c: ChildPerson): number {
  return c.spouse ? NODE_W + SPOUSE_JOIN_W + NODE_W : NODE_W
}

/**
 * 자녀들의 시각 중심(첫 자녀와 마지막 자녀의 평균)이 ChildrenGrid 컨테이너 중심에서
 * 얼마나 벗어나 있는지 (px). 양수면 children mean이 컨테이너 중심보다 오른쪽.
 *
 * ChildrenGrid + ForkTrack을 -shift만큼 translateX 하면 자녀 mean이 컨테이너 중심
 * (= ego 수직 드롭 위치)으로 정렬됨. ForkToChildren의 xMid도 자녀 mean을 쓰도록
 * 짝지어 두면 가로 바·수직선 정렬도 함께 유지.
 *
 * 자녀 1명이거나 모두 배우자 없을 땐 자연 대칭이라 0 반환.
 *
 * `import { CHILD_GAP } from './constants'` 의존성을 피하려고 인자로 받지 않고 직접 import.
 */
export function childrenCenterShift(childList: ChildPerson[]): number {
  if (childList.length <= 1) return 0
  const pairWidths = childList.map(childPairWidth)
  const totalW =
    pairWidths.reduce((s, w) => s + w, 0) + (childList.length - 1) * CHILD_GAP
  const pairStarts: number[] = []
  let acc = 0
  for (let i = 0; i < childList.length; i++) {
    pairStarts.push(acc)
    acc += pairWidths[i] + (i < childList.length - 1 ? CHILD_GAP : 0)
  }
  const xStart = pairStarts[0] + childCenterOffsetInPair(childList[0])
  const xEnd =
    pairStarts[childList.length - 1] +
    childCenterOffsetInPair(childList[childList.length - 1])
  const childMean = (xStart + xEnd) / 2
  return childMean - totalW / 2
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
