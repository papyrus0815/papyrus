import type { FamilyTreePerson } from '@/shared/api/persons-family-tree'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
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
    // 의도적으로 ?? null 정규화하지 않음 — undefined(구 응답 캐시, FK 계약 미도달)와
    // null(기록 미상)의 구분이 withSiblingKinshipMeta의 노트 생략 게이트에 필요하다.
    fatherId: p.fatherId,
    motherId: p.motherId,
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
 * FamilyTreeData의 노드/엣지에서 부/모 ID를 추출.
 *
 * 1차 — 노드 FK 스칼라 직독(계약): BFS 노드가 fatherId/motherId를 노출하므로
 * 부/모 슬롯을 서버 컬럼 값 그대로 읽는다. 렌더 목적이므로 그래프에 실재하는
 * (nodeMap에 있는) 노드만 채택 — FK가 있어도 미페치면 그 축은 비운다.
 *
 * 2차 — 휴리스틱 폴백(FK 스칼라가 없는 구 응답 캐시 전용):
 *  1. 명시 gender가 있는 인물만 먼저 슬롯 — male→father, female→mother
 *  2. 남은 미배치 인물을 빈 슬롯에 parents 배열 순서대로 채움
 *     → parents 순서가 서버 엣지 삽입순(fatherId→motherId)을 반영한다는 구현 세부에
 *       의존하는 취약 결합이라, FK 스칼라가 있으면 절대 이 경로로 오지 않는다.
 */
export function ftResolveParentIds(
  personId: string,
  parentsOf: Map<string, string[]>,
  nodeMap: Map<string, FamilyTreePerson>,
): { fatherId?: string; motherId?: string } {
  // Pass 0: 노드 FK 스칼라 직독 — 신 계약이면 항상 두 키가 존재(null 포함).
  // 손상 FK 방어: 자기부모(fk===personId)는 기각(서버 엣지 억제와 동일 정책),
  // 축퇴(아버지=어머니)는 엣지 Set dedup과 동일하게 카드 1장만 채택.
  const self = nodeMap.get(personId)
  if (self && self.fatherId !== undefined && self.motherId !== undefined) {
    const resolveFk = (value: string | null | undefined): string | undefined =>
      value && value !== personId && nodeMap.has(value) ? value : undefined
    const fatherFk = resolveFk(self.fatherId)
    const motherFk = resolveFk(self.motherId)
    if (fatherFk && fatherFk === motherFk) return { fatherId: fatherFk, motherId: undefined }
    return { fatherId: fatherFk, motherId: motherFk }
  }
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

// ─── 형제 친/이복/이부 판별 ─────────────────────────────────────────

/** 판별 입력 — 부모 FK 스칼라만 사용 (FamilyTreePerson·NodePerson 모두 구조적으로 만족) */
export type SiblingParentFks = {
  fatherId?: string | null
  motherId?: string | null
}

export type SiblingKinship = 'FULL' | 'PATERNAL_HALF' | 'MATERNAL_HALF' | 'UNDETERMINED'

export type SiblingKinshipResult = {
  kinship: SiblingKinship
  /** 공유가 확인된 축(사실 진술용) — 판별불가여도 '아버지만 공유' 같은 문구에 사용 */
  sharedAxis: 'father' | 'mother' | 'both' | 'none'
  /**
   * UNDETERMINED 사유 — 툴팁 문구가 거짓 사유를 진술하지 않도록 원인을 구분.
   * anchor-gap=기준 인물 쪽 기록 결손, sibling-gap=형제 쪽 결손, both-gap=양쪽 결손,
   * data-anomaly=중복 FK·크로스슬롯 등 기록 모순. 확정 판별이면 undefined.
   */
  cause?: 'anchor-gap' | 'sibling-gap' | 'both-gap' | 'data-anomaly'
}

/**
 * 형제 친/이복/이부 4상 판별 — 부모 FK 스칼라 직접 비교만 사용.
 * (검토서 docs/genealogy-half-sibling-display-review.md §3)
 *
 * 원칙 «기록 부재 ≠ 상이»: NULL은 증거가 아니라 공백이다. 비공유 축의 FK가 어느
 * 한쪽이라도 NULL이면 UNDETERMINED — 무수식 '형제'로 표기하고 이복/이부를 단정하지
 * 않는다('이복(추정)' 같은 추정 접미사도 금지 — 추정할 근거 자체가 없다).
 *
 * 금칙 3종 (오정보 방지):
 *  1. parent-child 엣지 존재를 증거로 쓰지 말 것 — 엣지는 양끝이 그래프에 있을 때만
 *     방출되므로 '부모 미상(NULL)'과 '미페치(그래프 밖)'를 구분하지 못한다.
 *  2. gender·엣지 삽입순서를 증거로 쓰지 말 것 (서버 구현 세부일 뿐 계약이 아님).
 *  3. parentMarriageId를 판정 입력으로 쓰지 말 것 — write UI가 없어 데이터가 완전
 *     공백(실측 0행)이며, FK relation 도입(G22 잔여)+저작 UI 이후에만 '같은 혼인이면
 *     친형제' 양성 승격 신호로 활성화한다. 상이/NULL을 이복 근거로 쓰는 것은 영구
 *     금지(혼인 미링크·혼외 출생 존재).
 *
 * 집합 의미론 방어: 공유 부모가 양측에서 다른 슬롯이거나(크로스슬롯 — A의 아버지가
 * B의 어머니) 한쪽의 fatherId===motherId(동일인 중복 FK)면 데이터 이상으로 보고
 * 확정하지 않는다(쓰기 가드는 서버 assertNoParentCycle에 별도).
 *
 * 입양 게이트: #2 PersonParentLink(입양/양친) 도입 시 이 함수의 입력을 생물학적
 * 부모 행으로 한정할 것 — 입양 형제가 이복/친형제로 오분류되는 것을 막는 전제다.
 */
export function classifySiblingKinship(
  anchor: SiblingParentFks,
  sibling: SiblingParentFks,
): SiblingKinshipResult {
  const anchorFather = anchor.fatherId ?? null
  const anchorMother = anchor.motherId ?? null
  const sibFather = sibling.fatherId ?? null
  const sibMother = sibling.motherId ?? null

  const fatherShared = anchorFather != null && anchorFather === sibFather
  const motherShared = anchorMother != null && anchorMother === sibMother
  const sharedAxis: SiblingKinshipResult['sharedAxis'] =
    fatherShared && motherShared ? 'both'
    : fatherShared ? 'father'
    : motherShared ? 'mother'
    : 'none'

  // 데이터 이상 방어 — 중복 FK(아버지=어머니)·크로스슬롯 공유는 확정하지 않음
  const degenerate =
    (anchorFather != null && anchorFather === anchorMother) ||
    (sibFather != null && sibFather === sibMother)
  const crossSlot =
    (anchorFather != null && anchorFather === sibMother) ||
    (anchorMother != null && anchorMother === sibFather)
  if (degenerate || crossSlot)
    return { kinship: 'UNDETERMINED', sharedAxis, cause: 'data-anomaly' }

  if (fatherShared && motherShared) return { kinship: 'FULL', sharedAxis }
  if (fatherShared && anchorMother != null && sibMother != null)
    return { kinship: 'PATERNAL_HALF', sharedAxis }
  if (motherShared && anchorFather != null && sibFather != null)
    return { kinship: 'MATERNAL_HALF', sharedAxis }

  // 기록 결손으로 인한 판별불가 — 비공유 축에서 어느 쪽 기록이 비었는지 구분(문구용)
  const anchorGap = sharedAxis === 'father' ? anchorMother == null : anchorFather == null
  const siblingGap = sharedAxis === 'father' ? sibMother == null : sibFather == null
  const cause: SiblingKinshipResult['cause'] =
    sharedAxis === 'none' ? 'both-gap'
    : anchorGap && siblingGap ? 'both-gap'
    : anchorGap ? 'anchor-gap'
    : 'sibling-gap'
  return { kinship: 'UNDETERMINED', sharedAxis, cause }
}

/**
 * 배지 라벨 — 확정된 이탈만 라벨링. 친형제·판별불가 모두 무수식 '형제'
 * (판별불가에 무수식이 학술적으로 정확한 비주장 표기 — 툴팁이 사유를 설명).
 */
export function siblingKinshipBadgeLabel(result: SiblingKinshipResult): string {
  switch (result.kinship) {
    case 'PATERNAL_HALF': return '이복형제'
    case 'MATERNAL_HALF': return '이부형제'
    default: return '형제'
  }
}

/** 배지 aria-label — 확정 판별에만 전체 문장 제공 (무수식 '형제'는 그대로 낭독) */
export function siblingKinshipAriaLabel(result: SiblingKinshipResult): string | undefined {
  switch (result.kinship) {
    case 'PATERNAL_HALF': return '이복형제 — 아버지는 같고 어머니가 다릅니다'
    case 'MATERNAL_HALF': return '이부형제 — 어머니는 같고 아버지가 다릅니다'
    default: return undefined
  }
}

/**
 * 툴팁 '형제 관계' 라인 문구 — 판정 사유를 항상 설명한다.
 * 확정 판별은 근거 요약(무표기 '형제'가 친형제인지 미상인지 구분할 유일한 지면 —
 * REST-only 임베드처럼 부모 이름 라인이 없는 곳에서도 범례의 '사유 표시' 약속을 지킨다),
 * 판별불가는 cause 기준으로 거짓 사유 없이 결손/모순 지점을 진술한다.
 */
export function siblingKinshipNote(result: SiblingKinshipResult): string | null {
  switch (result.kinship) {
    case 'FULL': return '부모 모두 공유 — 친형제'
    case 'PATERNAL_HALF': return '아버지 공유 · 어머니 다름 — 이복형제'
    case 'MATERNAL_HALF': return '어머니 공유 · 아버지 다름 — 이부형제'
    default: break
  }
  if (result.cause === 'data-anomaly') return '부모 기록이 서로 모순 — 관계 미확정'
  if (result.sharedAxis === 'father') {
    switch (result.cause) {
      case 'anchor-gap': return '기준 인물의 어머니 기록 미상 — 친형제/이복 여부 미확정'
      case 'both-gap': return '양쪽 어머니 기록 미상 — 친형제/이복 여부 미확정'
      default: return '어머니 기록 미상 — 친형제/이복 여부 미확정'
    }
  }
  if (result.sharedAxis === 'mother') {
    switch (result.cause) {
      case 'anchor-gap': return '기준 인물의 아버지 기록 미상 — 친형제/이부 여부 미확정'
      case 'both-gap': return '양쪽 아버지 기록 미상 — 친형제/이부 여부 미확정'
      default: return '아버지 기록 미상 — 친형제/이부 여부 미확정'
    }
  }
  // sharedAxis 'none' — 기록 완비인데 공유 부모가 없는 드리프트 케이스도 포함되므로
  // '기록 불충분'으로 단정하지 않는다.
  return '공유 부모 기록을 확인할 수 없음 — 관계 미확정'
}

/**
 * 그래프 노드에서 부모 이름 해소 — FK가 있는데 노드가 미페치면 «이 가계도에 미표시»
 * ('미등재'로 단정하지 않는다: BFS는 계정 무스코프라 미표시 ≠ 미등재).
 * nodeMap이 null이면(REST 폴백 — 그래프 부재) null.
 */
function resolveParentName(
  parentId: string | null | undefined,
  nodeMap: Map<string, FamilyTreePerson> | null,
): string | null {
  if (parentId == null || nodeMap == null) return null
  const node = nodeMap.get(parentId)
  return node ? getPersonDisplayName(node, true) : '이 가계도에 미표시'
}

/**
 * 카드 툴팁용 부모 이름 라인 주입 (형제·자녀 공용).
 * omitParentId: 문맥상 자명한 쪽 생략 — ego의 자녀 카드에서 ego 본인 라인은 노이즈.
 */
export function withParentNames<T extends SiblingParentFks>(
  person: T,
  nodeMap: Map<string, FamilyTreePerson> | null,
  opts?: { omitParentId?: string | null },
): T & { fatherName?: string | null; motherName?: string | null } {
  const omit = opts?.omitParentId ?? null
  return {
    ...person,
    fatherName:
      omit != null && person.fatherId === omit ? null : resolveParentName(person.fatherId, nodeMap),
    motherName:
      omit != null && person.motherId === omit ? null : resolveParentName(person.motherId, nodeMap),
  }
}

/** 형제 카드 툴팁용 부모 이름 + 판별 고지 주입. */
export function withSiblingKinshipMeta<T extends SiblingParentFks>(
  sibling: T,
  result: SiblingKinshipResult,
  nodeMap: Map<string, FamilyTreePerson> | null,
): T & { fatherName?: string | null; motherName?: string | null; kinshipNote?: string | null } {
  // FK 계약 미도달(구 응답 캐시 — 두 키 모두 부재)이면 '기록 미상' 계열 문구가
  // 거짓 사유가 되므로 노트를 생략(패널 헤더의 FK-undefined 생략과 대칭).
  const contractReached = sibling.fatherId !== undefined || sibling.motherId !== undefined
  return {
    ...withParentNames(sibling, nodeMap),
    kinshipNote: contractReached ? siblingKinshipNote(result) : null,
  }
}

// ─── 형제 레인 파티션 (밀집 왕가 가독성 — 모달 그룹핑) ────────────────

export type SiblingLaneKind = 'full' | 'paternal-half' | 'maternal-half' | 'undetermined'

export type SiblingLane<T> = {
  /** React key용 안정 식별자 (미상 부모는 ID별 별도 레인) */
  key: string
  kind: SiblingLaneKind
  /** 레인 헤더 문구 — '이복 — 어머니 ○○○' 등 */
  title: string
  siblings: T[]
}

/**
 * 형제 목록을 판별 결과로 레인 파티션 — 형제 모달의 그룹 표시용.
 *
 * - 그룹 키는 공동부모 FK(이복→어머니 ID, 이부→아버지 ID). parentMarriageId가 아니다
 *   (writer 0 공백·FK relation 미도입 — G22 의존 회피).
 * - 레인 내 순서는 입력 배열 순서 그대로(재정렬 금지 — 기존 comparator 위임).
 * - 레인 순서: 친형제 → 이복(첫 등장 순 = 최연장자 출생 asc) → 이부 → 관계 미상 최후순.
 * - 부모 이름 미해소(그래프 밖)여도 ID별 별도 레인 — «이 가계도에 미표시» 비단정 문구.
 */
/** ①②③… 원형 숫자 (20 초과는 괄호 폴백) — 이름 미해소 레인의 안정 구분자 */
function circledNumber(seq: number): string {
  return seq >= 1 && seq <= 20 ? String.fromCharCode(0x2460 + seq - 1) : `(${seq})`
}

export function partitionSiblingsByKinship<T extends SiblingParentFks>(
  anchor: SiblingParentFks,
  siblings: T[],
  nodeMap: Map<string, FamilyTreePerson> | null,
): SiblingLane<T>[] {
  const fullLane: SiblingLane<T> = { key: 'full', kind: 'full', title: '친형제', siblings: [] }
  // 사유를 단정하지 않는 중립 제목 — 이 레인은 기록 결손뿐 아니라 기록 모순(data-anomaly)도
  // 담으므로 '기록 불충분' 단정은 카드 노트('부모 기록이 서로 모순')와 자기모순이 된다.
  const undeterminedLane: SiblingLane<T> = {
    key: 'undetermined',
    kind: 'undetermined',
    title: '관계 미상 — 개별 사유는 카드 참조',
    siblings: [],
  }
  const paternalLanes = new Map<string, SiblingLane<T>>()
  const maternalLanes = new Map<string, SiblingLane<T>>()

  /**
   * 레인 제목 — 이름 해소 실패 시(그래프 밖·REST 폴백) 같은 문구가 여러 레인에 반복되면
   * ID별 분리의 표시 의미가 소멸하므로 안정 순번(첫 등장 순)을 병기해 구분한다.
   * «이 가계도에 미표시»는 이름 자리에 그대로 넣으면 사람 이름처럼 읽혀 괄호로 감싼다.
   */
  const laneTitle = (
    prefix: string,
    parentLabel: string,
    parentId: string,
    unresolvedSeq: number,
  ): string => {
    const name = resolveParentName(parentId, nodeMap)
    if (name != null && name !== '이 가계도에 미표시') return `${prefix} — ${parentLabel} ${name}`
    const marker = circledNumber(unresolvedSeq)
    const note = name == null ? '(기록 있음)' : '(이 가계도에 미표시)'
    return `${prefix} — ${parentLabel} ${marker} ${note}`
  }

  for (const sibling of siblings) {
    const { kinship } = classifySiblingKinship(anchor, sibling)
    // truthy 가드 유지 — classify가 HALF ⇒ 반대편 FK 비-null을 보장하므로 도달하는 falsy는
    // ''(빈 문자열) 손상값뿐이고, 그 경우 미상 레인이 안전한 착지점이다.
    if (kinship === 'FULL') {
      fullLane.siblings.push(sibling)
    } else if (kinship === 'PATERNAL_HALF' && sibling.motherId) {
      const motherId = sibling.motherId
      let lane = paternalLanes.get(motherId)
      if (!lane) {
        lane = {
          key: `paternal-half-${motherId}`,
          kind: 'paternal-half',
          title: laneTitle('이복', '어머니', motherId, paternalLanes.size + 1),
          siblings: [],
        }
        paternalLanes.set(motherId, lane)
      }
      lane.siblings.push(sibling)
    } else if (kinship === 'MATERNAL_HALF' && sibling.fatherId) {
      const fatherId = sibling.fatherId
      let lane = maternalLanes.get(fatherId)
      if (!lane) {
        lane = {
          key: `maternal-half-${fatherId}`,
          kind: 'maternal-half',
          title: laneTitle('이부', '아버지', fatherId, maternalLanes.size + 1),
          siblings: [],
        }
        maternalLanes.set(fatherId, lane)
      }
      lane.siblings.push(sibling)
    } else {
      undeterminedLane.siblings.push(sibling)
    }
  }

  const lanes: SiblingLane<T>[] = []
  if (fullLane.siblings.length > 0) lanes.push(fullLane)
  lanes.push(...paternalLanes.values())
  lanes.push(...maternalLanes.values())
  if (undeterminedLane.siblings.length > 0) lanes.push(undeterminedLane)
  return lanes
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
