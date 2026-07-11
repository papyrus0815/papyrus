/**
 * 형제 친/이복/이부 판별(classifySiblingKinship) 단위 테스트.
 *
 * 핵심 불변식 (검토서 docs/genealogy-half-sibling-display-review.md §3):
 *  - «기록 부재 ≠ 상이» — 비공유 축 FK가 어느 한쪽이라도 NULL이면 UNDETERMINED.
 *  - 확정(양쪽 기록·상이)일 때만 이복/이부. 라벨은 확정 이탈만 분화, 나머지 무수식 '형제'.
 *  - 데이터 이상(중복 FK·크로스슬롯)은 확정하지 않음.
 *  - ftResolveParentIds는 노드 FK 스칼라를 1차로 직독(gender·삽입순서 휴리스틱은 구 응답 폴백).
 */
import type { FamilyTreePerson } from '@/shared/api/persons-family-tree'
import {
  classifySiblingKinship,
  ftResolveParentIds,
  partitionSiblingsByKinship,
  siblingKinshipBadgeLabel,
  siblingKinshipNote,
  withSiblingKinshipMeta,
} from './family-tree-derive'

const F1 = 'father-1'
const F2 = 'father-2'
const M1 = 'mother-1'
const M2 = 'mother-2'

describe('classifySiblingKinship', () => {
  it('부모 모두 동일 → 친형제(FULL) — 무표기 배지 + 근거 요약 노트', () => {
    const result = classifySiblingKinship(
      { fatherId: F1, motherId: M1 },
      { fatherId: F1, motherId: M1 },
    )
    expect(result).toEqual({ kinship: 'FULL', sharedAxis: 'both' })
    expect(siblingKinshipBadgeLabel(result)).toBe('형제')
    // REST-only 지면(부모 이름 라인 부재)에서도 범례의 '사유 표시' 약속을 지키는 라인
    expect(siblingKinshipNote(result)).toBe('부모 모두 공유 — 친형제')
  })

  it('아버지 동일 + 어머니 양쪽 기록·상이 → 이복(PATERNAL_HALF)', () => {
    const result = classifySiblingKinship(
      { fatherId: F1, motherId: M1 },
      { fatherId: F1, motherId: M2 },
    )
    expect(result.kinship).toBe('PATERNAL_HALF')
    expect(siblingKinshipBadgeLabel(result)).toBe('이복형제')
  })

  it('어머니 동일 + 아버지 양쪽 기록·상이 → 이부(MATERNAL_HALF)', () => {
    const result = classifySiblingKinship(
      { fatherId: F1, motherId: M1 },
      { fatherId: F2, motherId: M1 },
    )
    expect(result.kinship).toBe('MATERNAL_HALF')
    expect(siblingKinshipBadgeLabel(result)).toBe('이부형제')
  })

  it('아버지 동일 + 형제의 어머니 미상 → 판별불가 (기록 부재 ≠ 상이)', () => {
    const result = classifySiblingKinship(
      { fatherId: F1, motherId: M1 },
      { fatherId: F1, motherId: null },
    )
    expect(result).toEqual({ kinship: 'UNDETERMINED', sharedAxis: 'father', cause: 'sibling-gap' })
    expect(siblingKinshipBadgeLabel(result)).toBe('형제')
    expect(siblingKinshipNote(result)).toBe('어머니 기록 미상 — 친형제/이복 여부 미확정')
  })

  it('아버지 동일 + anchor의 어머니 미상 → 판별불가, 결손 주체를 기준 인물로 명시', () => {
    const result = classifySiblingKinship(
      { fatherId: F1, motherId: null },
      { fatherId: F1, motherId: M2 },
    )
    expect(result).toEqual({ kinship: 'UNDETERMINED', sharedAxis: 'father', cause: 'anchor-gap' })
    // 형제 카드에 '어머니 — M2 실명'이 함께 뜨므로, 미상 주체가 기준 인물임을 명시해야 모순 없음
    expect(siblingKinshipNote(result)).toBe('기준 인물의 어머니 기록 미상 — 친형제/이복 여부 미확정')
  })

  it('어머니 동일 + 아버지 한쪽 미상 → 판별불가 + 이부 미확정 고지', () => {
    const result = classifySiblingKinship(
      { fatherId: null, motherId: M1 },
      { fatherId: F2, motherId: M1 },
    )
    expect(result).toEqual({ kinship: 'UNDETERMINED', sharedAxis: 'mother', cause: 'anchor-gap' })
    expect(siblingKinshipNote(result)).toContain('아버지 기록 미상')
  })

  it('undefined도 NULL과 동일하게 공백으로 취급', () => {
    const result = classifySiblingKinship(
      { fatherId: F1 },
      { fatherId: F1, motherId: M2 },
    )
    expect(result.kinship).toBe('UNDETERMINED')
  })

  it('공유 부모 없음(양쪽 다 기록·전부 상이) → 판별불가·sharedAxis none, 기록 불충분 단정 금지', () => {
    const result = classifySiblingKinship(
      { fatherId: F1, motherId: M1 },
      { fatherId: F2, motherId: M2 },
    )
    expect(result).toEqual({ kinship: 'UNDETERMINED', sharedAxis: 'none', cause: 'both-gap' })
    // 기록은 완비인데 공유 부모가 없는 드리프트 케이스 — '기록 미상/불충분' 거짓 진술 금지
    expect(siblingKinshipNote(result)).toBe('공유 부모 기록을 확인할 수 없음 — 관계 미확정')
  })

  it('중복 FK(아버지=어머니) 축퇴 데이터 → 친형제 확정하지 않음 + 모순 사유', () => {
    const result = classifySiblingKinship(
      { fatherId: F1, motherId: F1 },
      { fatherId: F1, motherId: F1 },
    )
    expect(result.kinship).toBe('UNDETERMINED')
    expect(result.cause).toBe('data-anomaly')
    expect(siblingKinshipNote(result)).toBe('부모 기록이 서로 모순 — 관계 미확정')
  })

  it('크로스슬롯 공유(A의 아버지 = B의 어머니) → 확정하지 않음 + 모순 사유(기록 미상 아님)', () => {
    const result = classifySiblingKinship(
      { fatherId: F1, motherId: M1 },
      { fatherId: F2, motherId: F1 },
    )
    expect(result.kinship).toBe('UNDETERMINED')
    expect(result.cause).toBe('data-anomaly')
    expect(siblingKinshipNote(result)).toBe('부모 기록이 서로 모순 — 관계 미확정')
  })

  it('parentMarriageId는 판정에 영향 없음 (금칙 — 입력에서 제외)', () => {
    const anchor = { fatherId: F1, motherId: M1, parentMarriageId: 'marriage-1' }
    const sibling = { fatherId: F1, motherId: M2, parentMarriageId: 'marriage-1' }
    // 같은 혼인 id여도 FK가 이복이면 이복 — 혼인 id는 읽지 않는다
    expect(classifySiblingKinship(anchor, sibling).kinship).toBe('PATERNAL_HALF')
  })
})

describe('withSiblingKinshipMeta — 노트/이름 주입 게이트', () => {
  it('FK 계약 미도달(구 캐시 — 두 키 모두 undefined)이면 kinshipNote를 생략', () => {
    const sibling: { id: string; fatherId?: string | null; motherId?: string | null } = { id: 'sib-1' }
    const result = classifySiblingKinship({}, sibling)
    const enriched = withSiblingKinshipMeta(sibling, result, null)
    expect(enriched.kinshipNote).toBeNull()
  })

  it('FK 도달(null=기록 미상)이면 노트 주입 — 미상과 계약 미도달을 구분', () => {
    const sibling = { id: 'sib-1', fatherId: F1, motherId: null }
    const result = classifySiblingKinship({ fatherId: F1, motherId: M1 }, sibling)
    const enriched = withSiblingKinshipMeta(sibling, result, null)
    expect(enriched.kinshipNote).toBe('어머니 기록 미상 — 친형제/이복 여부 미확정')
    // nodeMap 없음(REST 폴백) — 이름 라인은 생략
    expect(enriched.fatherName).toBeNull()
  })
})

describe('partitionSiblingsByKinship — 형제 레인 파티션', () => {
  const anchor = { fatherId: F1, motherId: M1 }

  it('친형제 → 이복(어머니별, 첫 등장 순) → 이부 → 관계 미상 순서로 파티션', () => {
    const siblings = [
      { id: 'full-1', fatherId: F1, motherId: M1 },
      { id: 'half-m2', fatherId: F1, motherId: M2 },
      { id: 'unknown', fatherId: F1, motherId: null },
      { id: 'half-m3', fatherId: F1, motherId: 'mother-3' },
      { id: 'half-m2-2', fatherId: F1, motherId: M2 },
      { id: 'maternal', fatherId: F2, motherId: M1 },
    ]
    const lanes = partitionSiblingsByKinship(anchor, siblings, null)
    expect(lanes.map((lane) => lane.kind)).toEqual([
      'full', 'paternal-half', 'paternal-half', 'maternal-half', 'undetermined',
    ])
    // 같은 어머니(M2) 소생은 한 레인에 — 그룹 키는 공동부모 FK
    expect(lanes[1].siblings.map((sib) => sib.id)).toEqual(['half-m2', 'half-m2-2'])
    expect(lanes[2].siblings.map((sib) => sib.id)).toEqual(['half-m3'])
    expect(lanes[3].siblings.map((sib) => sib.id)).toEqual(['maternal'])
    expect(lanes[4].siblings.map((sib) => sib.id)).toEqual(['unknown'])
  })

  it('레인 내 순서는 입력 배열 순서 유지 (재정렬 금지)', () => {
    const siblings = [
      { id: 'b', fatherId: F1, motherId: M1 },
      { id: 'a', fatherId: F1, motherId: M1 },
    ]
    const lanes = partitionSiblingsByKinship(anchor, siblings, null)
    expect(lanes[0].siblings.map((sib) => sib.id)).toEqual(['b', 'a'])
  })

  it('어머니 이름 미해소(nodeMap 부재)면 순번+비단정 문구 — 미등재 단정 금지, 레인 간 구분 유지', () => {
    const lanes = partitionSiblingsByKinship(anchor, [
      { id: 'sib-a', fatherId: F1, motherId: M2 },
      { id: 'sib-b', fatherId: F1, motherId: 'mother-3' },
    ], null)
    // 이름이 전부 미해소여도 순번으로 레인이 서로 구분돼야 함(동일 헤더 중복 금지)
    expect(lanes[0].title).toBe('이복 — 어머니 ① (기록 있음)')
    expect(lanes[1].title).toBe('이복 — 어머니 ② (기록 있음)')
  })

  it('관계 미상 레인 제목은 사유를 단정하지 않음 — data-anomaly도 담기므로', () => {
    const lanes = partitionSiblingsByKinship(anchor, [
      { id: 'full', fatherId: F1, motherId: M1 },
      { id: 'anomaly', fatherId: F1, motherId: F1 },
    ], null)
    const undetermined = lanes.find((lane) => lane.kind === 'undetermined')
    // 카드 노트('부모 기록이 서로 모순')와 모순되는 '기록 불충분' 단정 금지
    expect(undetermined?.title).toBe('관계 미상 — 개별 사유는 카드 참조')
    expect(undetermined?.siblings.map((sib) => sib.id)).toEqual(['anomaly'])
  })

  it('전원 친형제면 레인 1개 — 호출부가 flat 렌더로 폴백할 수 있는 형태', () => {
    const lanes = partitionSiblingsByKinship(anchor, [
      { id: 'x', fatherId: F1, motherId: M1 },
      { id: 'y', fatherId: F1, motherId: M1 },
    ], null)
    expect(lanes).toHaveLength(1)
    expect(lanes[0].kind).toBe('full')
  })
})

describe('ftResolveParentIds — 노드 FK 스칼라 직독 승격', () => {
  const node = (
    id: string,
    fks: { fatherId?: string | null; motherId?: string | null },
    gender: string | null = null,
  ): FamilyTreePerson =>
    ({ id, isOwned: true, name: id, gender, ...fks }) as FamilyTreePerson

  it('FK 스칼라가 있으면 gender·엣지 순서와 무관하게 컬럼 값 그대로 슬롯', () => {
    const nodeMap = new Map<string, FamilyTreePerson>([
      ['ego', node('ego', { fatherId: F1, motherId: M1 })],
      // 아버지 gender 미지정 + parentsOf 순서를 어머니 먼저로 뒤집어도 오판 없어야 함
      [F1, node(F1, { fatherId: null, motherId: null }, null)],
      [M1, node(M1, { fatherId: null, motherId: null }, null)],
    ])
    const parentsOf = new Map<string, string[]>([['ego', [M1, F1]]])
    expect(ftResolveParentIds('ego', parentsOf, nodeMap)).toEqual({
      fatherId: F1,
      motherId: M1,
    })
  })

  it('FK가 있어도 그래프에 미페치면 그 축은 비움 (렌더 대상만 채택)', () => {
    const nodeMap = new Map<string, FamilyTreePerson>([
      ['ego', node('ego', { fatherId: F1, motherId: M1 })],
      [M1, node(M1, { fatherId: null, motherId: null }, 'FEMALE')],
    ])
    const parentsOf = new Map<string, string[]>([['ego', [M1]]])
    expect(ftResolveParentIds('ego', parentsOf, nodeMap)).toEqual({
      fatherId: undefined,
      motherId: M1,
    })
  })

  it('FK 스칼라가 없는 구 응답이면 기존 gender 휴리스틱 폴백 유지', () => {
    const nodeMap = new Map<string, FamilyTreePerson>([
      ['ego', node('ego', {})],
      [F1, node(F1, {}, 'MALE')],
      [M1, node(M1, {}, 'FEMALE')],
    ])
    const parentsOf = new Map<string, string[]>([['ego', [M1, F1]]])
    expect(ftResolveParentIds('ego', parentsOf, nodeMap)).toEqual({
      fatherId: F1,
      motherId: M1,
    })
  })

  it('자기부모 손상 FK(fatherId===자기 id)는 기각 — 유령 조상 카드 방지', () => {
    const nodeMap = new Map<string, FamilyTreePerson>([
      ['ego', node('ego', { fatherId: 'ego', motherId: M1 })],
      [M1, node(M1, { fatherId: null, motherId: null }, 'FEMALE')],
    ])
    expect(ftResolveParentIds('ego', new Map(), nodeMap)).toEqual({
      fatherId: undefined,
      motherId: M1,
    })
  })

  it('축퇴 FK(아버지=어머니 동일인)는 서버 엣지 dedup과 동일하게 카드 1장만 채택', () => {
    const nodeMap = new Map<string, FamilyTreePerson>([
      ['ego', node('ego', { fatherId: F1, motherId: F1 })],
      [F1, node(F1, { fatherId: null, motherId: null })],
    ])
    expect(ftResolveParentIds('ego', new Map(), nodeMap)).toEqual({
      fatherId: F1,
      motherId: undefined,
    })
  })
})
