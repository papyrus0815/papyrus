import type { FamilyTreePerson } from '@/shared/api/persons-family-tree'
import type { NodePerson } from './types'

/**
 * FamilyTreePerson(BFS 응답) → NodePerson(인포그래픽 내부 형식) 변환.
 * 부모/배우자/자녀/형제 등 ego 주변 카드를 BFS 데이터로 일관되게 그릴 때 사용.
 * birthDate/deathDate는 BFS에 없으니 birthYear/deathYear로 lifeSpan을 폴백한다.
 */
export function ftPersonToNodePerson(p: FamilyTreePerson): NodePerson {
  return {
    id: p.id,
    name: p.name,
    surname: p.surname ?? null,
    middleName: p.middleName ?? null,
    nameDisplayOrder: p.nameDisplayOrder ?? null,
    gender: p.gender ?? null,
    regnalName: p.regnalName ?? null,
    profileImageUrl: p.profileImageUrl ?? null,
    birthYear: p.birthYear ?? null,
    deathYear: p.deathYear ?? null,
    birthEra: p.birthEra ?? null,
    deathEra: p.deathEra ?? null,
    dynasty: p.dynasty ?? null,
    illegitimate: p.illegitimate ?? false,
    parentMarriageId: p.parentMarriageId ?? null,
    originalName: p.originalName ?? null,
    posthumousName: p.posthumousName ?? null,
    templeName: p.templeName ?? null,
    preEnthronementTitle: p.preEnthronementTitle ?? null,
    birthPlace: p.birthPlace ?? null,
    deathPlace: p.deathPlace ?? null,
    country: p.country ?? null,
    sovereignCountry: p.sovereignCountry ?? null,
  }
}

/**
 * FamilyTreeData의 parentsOf 맵에서 부/모 ID를 추출.
 *
 * 슬롯팅 규칙 (두 단계):
 *  1. 명시 gender가 있는 인물만 먼저 슬롯 — male→father, female→mother
 *  2. 남은 미배치 인물을 빈 슬롯에 parents 배열 순서대로 채움
 *     → parents 순서는 BFS 페치 시 Person.fatherId → motherId 컬럼 순서를 그대로 반영하므로
 *       두 부모 모두 gender 미지정이어도 DB 슬롯 의미(F 컬럼=아버지)가 보존됨.
 *     → 결과적으로 동일 데이터에 대해 항상 같은 좌/우 배치가 보장됨.
 */
export function ftResolveParentIds(
  personId: string,
  parentsOf: Map<string, string[]>,
  nodeMap: Map<string, FamilyTreePerson>,
): { fatherId?: string; motherId?: string } {
  const parents = parentsOf.get(personId) ?? []
  let fatherId: string | undefined
  let motherId: string | undefined
  // Pass 1: 명시 gender 우선 슬롯팅
  for (const pid of parents) {
    const g = (nodeMap.get(pid)?.gender ?? '').toUpperCase()
    if ((g === 'MALE' || g === 'M') && !fatherId) fatherId = pid
    else if ((g === 'FEMALE' || g === 'F') && !motherId) motherId = pid
  }
  // Pass 2: 미배치 인원을 DB 컬럼 슬롯 순서(parents[0]=fatherId, parents[1]=motherId)대로 보충
  for (const pid of parents) {
    if (pid === fatherId || pid === motherId) continue
    if (!fatherId) fatherId = pid
    else if (!motherId) motherId = pid
  }
  return { fatherId, motherId }
}

/**
 * ego에서 조상까지의 경로 문자열('F'=부계, 'M'=모계)로 한국어 촌수 레이블 반환.
 * gender 미지정 시 path 마지막 슬롯(F=DB fatherId 컬럼, M=motherId 컬럼)을 폴백으로
 * 사용해 알려지지 않은 인물도 부/모 라벨이 일관되게 붙도록 함.
 */
export function getAncestorBadgeLabel(
  path: string,
  gender: string | null | undefined,
): string {
  const g = (gender ?? '').toUpperCase()
  const isFemale = g === 'FEMALE' || g === 'F'
  const isMale = g === 'MALE' || g === 'M'
  const lastSlot = path[path.length - 1]
  const isPaternalPerson = isMale || (!isFemale && lastSlot === 'F')
  const isPaternalSide = path[0] === 'F'
  switch (path.length) {
    case 1:
      return isPaternalPerson ? '아버지' : '어머니'
    case 2:
      return (isPaternalSide ? '친' : '외') + (isPaternalPerson ? '조부' : '조모')
    case 3:
      return isPaternalPerson ? '증조부' : '증조모'
    case 4:
      return isPaternalPerson ? '고조부' : '고조모'
    default:
      return isPaternalPerson ? `${path.length - 1}대조부` : `${path.length - 1}대조모`
  }
}
