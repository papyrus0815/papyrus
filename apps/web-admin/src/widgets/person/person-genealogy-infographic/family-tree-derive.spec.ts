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

jest.mock('@/shared/api/upload', () => ({
  getUploadImageUrl: (url: string) => url,
}))

import {
  classifySiblingKinship,
  ftResolveParentIds,
  getAncestorBadgeLabel,
  partitionSiblingsByKinship,
  siblingKinshipBadgeLabel,
  siblingKinshipNote,
  withSiblingKinshipMeta,
} from './family-tree-derive'
import {
  birthYearOf,
  buildPersonTooltipLines,
  compareSiblingChronology,
  compareSiblingSeniority,
  compareSiblings,
  isDeceasedOf,
  lifeSpan,
  yearOf,
} from './utils'
import {
  computeKinshipMap,
  formatChildRoleBadge,
  formatDescendantRoleBadge,
} from './kinship'

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

  it('생부모가 달라도 양부모(adoptiveFatherId/adoptiveMotherId)를 공유하면 입양형제(ADOPTIVE)로 분류', () => {
    const anchor = {
      fatherId: F1,
      motherId: M1,
      adoptiveFatherId: 'adopt-f',
      adoptiveMotherId: 'adopt-m',
    }
    const adoptedBro = {
      fatherId: 'adopt-f',
      motherId: 'adopt-m',
    }
    const result = classifySiblingKinship(anchor, adoptedBro)
    expect(result).toEqual({
      kinship: 'ADOPTIVE',
      sharedAxis: 'both',
    })
    expect(siblingKinshipBadgeLabel(result)).toBe('입양형제')
    expect(siblingKinshipNote(result)).toBe('양부모 공유 — 입양(양가) 형제')
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

  it('입양형제(ADOPTIVE)가 포함되면 관계 미상이 아닌 입양(양가) 형제 전용 레인으로 분리', () => {
    const adoptedAnchor = {
      fatherId: F1,
      motherId: M1,
      adoptiveFatherId: 'adopt-f',
      adoptiveMotherId: 'adopt-m',
    }
    const lanes = partitionSiblingsByKinship(
      adoptedAnchor,
      [
        { id: 'bio-sib', fatherId: F1, motherId: M1 },
        { id: 'adopt-sib', fatherId: 'adopt-f', motherId: 'adopt-m' },
      ],
      null,
    )
    expect(lanes.map((lane) => lane.kind)).toEqual(['full', 'adoptive'])
    expect(lanes[1].title).toBe('입양(양가) 형제')
    expect(lanes[1].siblings.map((s) => s.id)).toEqual(['adopt-sib'])
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

describe('compareSiblings / lifeSpan / isDeceasedOf / buildPersonTooltipLines', () => {
  it('compareSiblings: birthOrder 1순위 → 부호 출생연도 2순위 → id 3순위', () => {
    const list = [
      { id: 'c', birthYear: 1400, birthOrder: 3 },
      { id: 'a', birthYear: 1400, birthOrder: 1 },
      { id: 'b', birthYear: 1395, birthOrder: 2 },
      { id: 'd', birthYear: 1410, birthOrder: null },
    ]
    const sorted = [...list].sort(compareSiblings)
    expect(sorted.map((x) => x.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('lifeSpan & isDeceasedOf: 사망연도 미상이어도 isAlive=false이면 1210–? 표기 및 사망자 판정', () => {
    const historicalDeceased = {
      id: 'p1',
      name: 'p1',
      birthYear: 1210,
      deathYear: null,
      isAlive: false,
    }
    expect(lifeSpan(historicalDeceased)).toBe('1210–?')
    expect(isDeceasedOf(historicalDeceased)).toBe(true)

    const living = {
      id: 'p2',
      name: 'p2',
      birthYear: 1990,
      deathYear: null,
      isAlive: true,
    }
    expect(lifeSpan(living)).toBe('1990–')
    expect(isDeceasedOf(living)).toBe(false)
  })

  it('lifeSpan: 생몰년 전면 미상 시 floruit(활동시기) 폴백', () => {
    const ancient = {
      id: 'p3',
      name: 'p3',
      birthYear: null,
      deathYear: null,
      isAlive: false,
      floruitStartYear: 350,
      floruitEndYear: 300,
      floruitEra: 'BC' as const,
    }
    expect(lifeSpan(ancient)).toBe('fl. BC 350–BC 300')
    expect(isDeceasedOf(ancient)).toBe(true)
  })

  it('buildPersonTooltipLines: 출생 서열·혼인 형태·혼인 기간·혼인 비고 포함', () => {
    const lines = buildPersonTooltipLines({
      posthumousName: '소헌왕후',
      birthOrder: 1,
      marriageRank: 'PRIMARY',
      marriageStartYear: 1408,
      marriageEndYear: 1446,
      marriageNote: '정실 왕비',
    })
    expect(lines).toEqual(
      expect.arrayContaining([
        { label: '서열', value: '1번째' },
        { label: '혼인 형태', value: '정실' },
        { label: '혼인 기간', value: '1408–1446' },
        { label: '혼인 비고', value: '정실 왕비' },
      ]),
    )
  })
})

describe('computeKinshipMap (촌수·한국어 친족 호칭 계산)', () => {
  it('직계 존비속·동복/이복형제·백부/숙부/고모/외숙부·조카·배우자(정실)·며느리를 정확히 판별한다', () => {
    const pNode = (
      p: Pick<FamilyTreePerson, 'id' | 'name'> & Partial<FamilyTreePerson>,
    ): FamilyTreePerson => ({
      isOwned: true,
      ...p,
    })
    const nodes: FamilyTreePerson[] = [
      pNode({ id: 'pgf', name: '환조', gender: 'MALE', fatherId: null, motherId: null }),
      pNode({ id: 'pgm', name: '의혜왕후', gender: 'FEMALE', fatherId: null, motherId: null }),
      pNode({ id: 'mgf', name: '한경', gender: 'MALE', fatherId: null, motherId: null }),
      pNode({
        id: 'father',
        name: '성계',
        gender: 'MALE',
        birthYear: 1335,
        fatherId: 'pgf',
        motherId: 'pgm',
      }),
      pNode({
        id: 'mother',
        name: '신의왕후',
        gender: 'FEMALE',
        fatherId: 'mgf',
        motherId: null,
      }),
      pNode({
        id: 'stepmother',
        name: '신덕왕후',
        gender: 'FEMALE',
        fatherId: null,
        motherId: null,
      }),
      pNode({
        id: 'older-uncle',
        name: '원계',
        gender: 'MALE',
        birthYear: 1330,
        fatherId: 'pgf',
        motherId: 'pgm',
      }),
      pNode({
        id: 'younger-uncle',
        name: '화',
        gender: 'MALE',
        birthYear: 1348,
        fatherId: 'pgf',
        motherId: 'pgm',
      }),
      pNode({
        id: 'paternal-aunt',
        name: '정화공주',
        gender: 'FEMALE',
        fatherId: 'pgf',
        motherId: 'pgm',
      }),
      pNode({
        id: 'maternal-uncle',
        name: '한상질',
        gender: 'MALE',
        fatherId: 'mgf',
        motherId: null,
      }),
      pNode({
        id: 'ego',
        name: '방원',
        gender: 'MALE',
        birthYear: 1367,
        fatherId: 'father',
        motherId: 'mother',
      }),
      pNode({
        id: 'full-bro',
        name: '방과',
        gender: 'MALE',
        birthYear: 1357,
        fatherId: 'father',
        motherId: 'mother',
      }),
      pNode({
        id: 'half-bro',
        name: '방석',
        gender: 'MALE',
        birthYear: 1382,
        fatherId: 'father',
        motherId: 'stepmother',
      }),
      pNode({
        id: 'nephew',
        name: '종금',
        gender: 'MALE',
        fatherId: 'full-bro',
        motherId: null,
      }),
      pNode({
        id: 'wife',
        name: '원경왕후',
        gender: 'FEMALE',
        fatherId: null,
        motherId: null,
      }),
      pNode({
        id: 'son',
        name: '도',
        gender: 'MALE',
        fatherId: 'ego',
        motherId: 'wife',
      }),
      pNode({
        id: 'daughter-in-law',
        name: '소헌왕후',
        gender: 'FEMALE',
        fatherId: null,
        motherId: null,
      }),
      pNode({
        id: 'grandson',
        name: '향',
        gender: 'MALE',
        fatherId: 'son',
        motherId: 'daughter-in-law',
      }),
    ]

    const edges = [
      { source: 'pgf', target: 'father', type: 'parent-child' as const },
      { source: 'pgm', target: 'father', type: 'parent-child' as const },
      { source: 'pgf', target: 'older-uncle', type: 'parent-child' as const },
      { source: 'pgm', target: 'older-uncle', type: 'parent-child' as const },
      { source: 'pgf', target: 'younger-uncle', type: 'parent-child' as const },
      { source: 'pgm', target: 'younger-uncle', type: 'parent-child' as const },
      { source: 'pgf', target: 'paternal-aunt', type: 'parent-child' as const },
      { source: 'pgm', target: 'paternal-aunt', type: 'parent-child' as const },
      { source: 'mgf', target: 'mother', type: 'parent-child' as const },
      { source: 'mgf', target: 'maternal-uncle', type: 'parent-child' as const },
      { source: 'father', target: 'ego', type: 'parent-child' as const },
      { source: 'mother', target: 'ego', type: 'parent-child' as const },
      { source: 'father', target: 'full-bro', type: 'parent-child' as const },
      { source: 'mother', target: 'full-bro', type: 'parent-child' as const },
      { source: 'father', target: 'half-bro', type: 'parent-child' as const },
      { source: 'stepmother', target: 'half-bro', type: 'parent-child' as const },
      { source: 'full-bro', target: 'nephew', type: 'parent-child' as const },
      { source: 'ego', target: 'son', type: 'parent-child' as const },
      { source: 'wife', target: 'son', type: 'parent-child' as const },
      { source: 'son', target: 'grandson', type: 'parent-child' as const },
      { source: 'daughter-in-law', target: 'grandson', type: 'parent-child' as const },
      {
        source: 'ego',
        target: 'wife',
        type: 'spouse' as const,
        marriageRank: 'PRIMARY',
      },
      {
        source: 'father',
        target: 'stepmother',
        type: 'spouse' as const,
        marriageRank: 'SECONDARY',
      },
      {
        source: 'son',
        target: 'daughter-in-law',
        type: 'spouse' as const,
        marriageRank: 'PRIMARY',
      },
    ]

    const map = computeKinshipMap({ egoId: 'ego', nodes, edges })
    expect(map.get('ego')?.summary).toBe('본인 (기준 인물)')
    expect(map.get('father')?.summary).toBe('아버지 (1촌)')
    expect(map.get('mother')?.summary).toBe('어머니 (1촌)')
    expect(map.get('pgf')?.summary).toBe('조부 (2대조 · 2촌)')
    expect(map.get('mgf')?.summary).toBe('외조부 (2대조 · 2촌)')
    expect(map.get('older-uncle')?.summary).toBe('백부 (큰아버지) (3촌)')
    expect(map.get('younger-uncle')?.summary).toBe('숙부 (작은아버지) (3촌)')
    expect(map.get('paternal-aunt')?.summary).toBe('고모 (3촌)')
    expect(map.get('maternal-uncle')?.summary).toBe('외숙부 (외삼촌) (3촌)')
    expect(map.get('full-bro')?.summary).toBe('친형제 (2촌)')
    expect(map.get('half-bro')?.summary).toBe('이복형제 (2촌)')
    expect(map.get('nephew')?.summary).toBe('조카 (3촌)')
    expect(map.get('wife')?.summary).toBe('배우자 · 정실')
    expect(map.get('stepmother')?.summary).toBe('부친의 배우자 (계비·후처)')
    expect(map.get('son')?.summary).toBe('아들 (1촌)')
    expect(map.get('daughter-in-law')?.summary).toBe('자부 (며느리)')
    expect(map.get('grandson')?.summary).toBe('손자 (2대손 · 2촌)')
    expect(map.get('grandson')?.pathNodeIds).toEqual(['ego', 'son', 'grandson'])
    expect(map.get('grandson')?.pathSummary).toBe('방원 → 도 → 향')
    expect(map.get('nephew')?.pathSummary).toBe('방원 → 성계 → 방과 → 종금')
  })

  it('외손·4촌 사촌(종/고종/외종/이종)·형수/제수·자녀 서열 배지를 정확히 구분한다', () => {
    const pNode = (
      p: Pick<FamilyTreePerson, 'id' | 'name'> & Partial<FamilyTreePerson>,
    ): FamilyTreePerson => ({
      isOwned: true,
      ...p,
    })
    const nodes: FamilyTreePerson[] = [
      pNode({ id: 'pgf', name: '친조부', gender: 'MALE' }),
      pNode({ id: 'mgf', name: '외조부', gender: 'MALE' }),
      pNode({ id: 'father', name: '부친', gender: 'MALE', birthYear: 1400, fatherId: 'pgf' }),
      pNode({ id: 'mother', name: '모친', gender: 'FEMALE', fatherId: 'mgf' }),
      pNode({ id: 'uncle', name: '숙부', gender: 'MALE', birthYear: 1405, fatherId: 'pgf' }),
      pNode({ id: 'aunt', name: '고모', gender: 'FEMALE', fatherId: 'pgf' }),
      pNode({ id: 'm-uncle', name: '외숙부', gender: 'MALE', fatherId: 'mgf' }),
      pNode({ id: 'm-aunt', name: '이모', gender: 'FEMALE', fatherId: 'mgf' }),
      pNode({ id: 'ego', name: '본인', gender: 'MALE', birthYear: 1425, fatherId: 'father', motherId: 'mother' }),
      pNode({ id: 'older-bro', name: '형님', gender: 'MALE', birthYear: 1420, fatherId: 'father', motherId: 'mother' }),
      pNode({ id: 'sister-in-law', name: '형수씨', gender: 'FEMALE' }),
      pNode({ id: 'p-cousin', name: '종형제A', gender: 'MALE', fatherId: 'uncle' }),
      pNode({ id: 'gojong-cousin', name: '고종사촌B', gender: 'FEMALE', fatherId: null, motherId: 'aunt' }),
      pNode({ id: 'oejong-cousin', name: '외종사촌C', gender: 'MALE', fatherId: 'm-uncle' }),
      pNode({ id: 'ijong-cousin', name: '이종사촌D', gender: 'FEMALE', motherId: 'm-aunt' }),
      pNode({ id: 'daughter', name: '장녀', gender: 'FEMALE', birthOrder: 1, fatherId: 'ego' }),
      pNode({ id: 'maternal-grandson', name: '외손자A', gender: 'MALE', motherId: 'daughter' }),
    ]
    const edges = [
      { source: 'pgf', target: 'father', type: 'parent-child' as const },
      { source: 'pgf', target: 'uncle', type: 'parent-child' as const },
      { source: 'pgf', target: 'aunt', type: 'parent-child' as const },
      { source: 'mgf', target: 'mother', type: 'parent-child' as const },
      { source: 'mgf', target: 'm-uncle', type: 'parent-child' as const },
      { source: 'mgf', target: 'm-aunt', type: 'parent-child' as const },
      { source: 'father', target: 'ego', type: 'parent-child' as const },
      { source: 'mother', target: 'ego', type: 'parent-child' as const },
      { source: 'father', target: 'older-bro', type: 'parent-child' as const },
      { source: 'mother', target: 'older-bro', type: 'parent-child' as const },
      { source: 'uncle', target: 'p-cousin', type: 'parent-child' as const },
      { source: 'aunt', target: 'gojong-cousin', type: 'parent-child' as const },
      { source: 'm-uncle', target: 'oejong-cousin', type: 'parent-child' as const },
      { source: 'm-aunt', target: 'ijong-cousin', type: 'parent-child' as const },
      { source: 'ego', target: 'daughter', type: 'parent-child' as const },
      { source: 'daughter', target: 'maternal-grandson', type: 'parent-child' as const },
      { source: 'older-bro', target: 'sister-in-law', type: 'spouse' as const },
    ]
    const map = computeKinshipMap({ egoId: 'ego', nodes, edges })
    expect(map.get('p-cousin')?.summary).toBe('종형제 (친사촌) (4촌)')
    expect(map.get('gojong-cousin')?.summary).toBe('고종사촌 (4촌)')
    expect(map.get('oejong-cousin')?.summary).toBe('외종사촌 (4촌)')
    expect(map.get('ijong-cousin')?.summary).toBe('이종사촌 (4촌)')
    expect(map.get('maternal-grandson')?.summary).toBe('외손자 (2대손 · 2촌)')
    expect(map.get('sister-in-law')?.summary).toBe('형수·올케 (손위 형제의 배우자)')

    expect(formatChildRoleBadge({ gender: 'MALE', birthOrder: 1 })).toBe('장남 (1째)')
    expect(formatChildRoleBadge({ gender: 'MALE', birthOrder: 2 })).toBe('아들 (2째)')
    expect(formatChildRoleBadge({ gender: 'FEMALE', birthOrder: 1 })).toBe('장녀 (1째)')
    // 성별 내 서열(genderBirthOrder)이 지정되면 미등재 형이 있어도 정확히 3남/2녀로 표시
    expect(formatChildRoleBadge({ gender: 'MALE', genderBirthOrder: 3 })).toBe('3남')
    expect(
      formatChildRoleBadge({ gender: 'MALE', genderBirthOrder: 3, birthOrder: 5 }),
    ).toBe('3남 (5째)')
    expect(formatChildRoleBadge({ gender: 'FEMALE', genderBirthOrder: 2 })).toBe('2녀')
    // 입양(양자·양녀) 표시
    expect(formatChildRoleBadge({ gender: 'MALE', isAdopted: true })).toBe('양자')
    expect(
      formatChildRoleBadge({ gender: 'MALE', genderBirthOrder: 2, isAdopted: true }),
    ).toBe('양자 · 2남')
    expect(formatChildRoleBadge({ gender: 'FEMALE', isAdopted: true })).toBe('양녀')
    expect(
      formatDescendantRoleBadge(
        { gender: 'MALE' },
        '손자녀',
        map.get('maternal-grandson'),
      ),
    ).toBe('외손자')
  })

  it('출계·입양(양부·양모·양자·양녀)과 비대칭 혼인 서열(rankHolderId) 관점 역전 방지를 정확히 처리한다', () => {
    const pNode = (
      p: Pick<FamilyTreePerson, 'id' | 'name'> & Partial<FamilyTreePerson>,
    ): FamilyTreePerson => ({
      isOwned: true,
      ...p,
    })
    const nodes: FamilyTreePerson[] = [
      pNode({ id: 'bio-father', name: '흥선대원군', gender: 'MALE' }),
      pNode({ id: 'bio-mother', name: '여흥부대부인', gender: 'FEMALE' }),
      pNode({ id: 'adopt-father', name: '문조(효명세자)', gender: 'MALE' }),
      pNode({ id: 'adopt-mother', name: '신정왕후', gender: 'FEMALE' }),
      pNode({
        id: 'king',
        name: '고종',
        gender: 'MALE',
        fatherId: 'bio-father',
        motherId: 'bio-mother',
        adoptiveFatherId: 'adopt-father',
        adoptiveMotherId: 'adopt-mother',
      }),
      pNode({ id: 'concubine', name: '귀인 장씨', gender: 'FEMALE' }),
      pNode({
        id: 'adopted-son',
        name: '양자군',
        gender: 'MALE',
        fatherId: null,
        motherId: null,
        adoptiveFatherId: 'king',
      }),
      pNode({
        id: 'adopted-sibling',
        name: '양형제군',
        gender: 'MALE',
        fatherId: null,
        motherId: null,
        adoptiveFatherId: 'adopt-father',
        adoptiveMotherId: 'adopt-mother',
      }),
      pNode({
        id: 'adopted-grandson',
        name: '양손자군',
        gender: 'MALE',
        fatherId: 'adopted-son',
        motherId: null,
      }),
    ]
    const edges = [
      {
        source: 'bio-father',
        target: 'king',
        type: 'parent-child' as const,
        lineage: 'biological' as const,
      },
      {
        source: 'bio-mother',
        target: 'king',
        type: 'parent-child' as const,
        lineage: 'biological' as const,
      },
      {
        source: 'adopt-father',
        target: 'king',
        type: 'parent-child' as const,
        lineage: 'adoptive' as const,
      },
      {
        source: 'adopt-mother',
        target: 'king',
        type: 'parent-child' as const,
        lineage: 'adoptive' as const,
      },
      {
        source: 'king',
        target: 'adopted-son',
        type: 'parent-child' as const,
        lineage: 'adoptive' as const,
      },
      {
        source: 'concubine',
        target: 'king',
        type: 'spouse' as const,
        marriageRank: 'CONCUBINE',
        rankHolderId: 'concubine',
      },
    ]

    // 1) 왕(고종) 기준 친족 호칭: 생부/생모 + 양부/양모 + 입양형제 + 양자 + 양손자 + 후궁·측실
    const kingMap = computeKinshipMap({ egoId: 'king', nodes, edges })
    expect(kingMap.get('bio-father')?.summary).toBe('아버지 (1촌)')
    expect(kingMap.get('bio-mother')?.summary).toBe('어머니 (1촌)')
    expect(kingMap.get('adopt-father')?.summary).toBe('양부 (입양·출계 · 1촌)')
    expect(kingMap.get('adopt-mother')?.summary).toBe('양모 (입양·출계 · 1촌)')
    expect(kingMap.get('adopted-sibling')?.summary).toBe('입양형제 (입양·출계 · 2촌)')
    expect(kingMap.get('adopted-son')?.summary).toBe('양자 (입양·출계 · 1촌)')
    expect(kingMap.get('adopted-grandson')?.summary).toBe('양손자 (입양 2대손 · 2촌)')
    expect(kingMap.get('concubine')?.summary).toBe('배우자 · 후궁·측실')

    // 1-b) 입양된 아들(adopted-son: fatherId=null, motherId=null) 기준:
    // 친부('아버지')로 오분류되지 않고 순수하게 '양부' 및 '양조부'/'양조모'(2대조)로만 표시됨
    const adoptedSonMap = computeKinshipMap({ egoId: 'adopted-son', nodes, edges })
    expect(adoptedSonMap.get('king')?.summary).toBe('양부 (입양·출계 · 1촌)')
    expect(adoptedSonMap.get('adopt-father')?.summary).toBe('양조부 (입양 2대조 · 2촌)')
    expect(adoptedSonMap.get('adopt-mother')?.summary).toBe('양조모 (입양 2대조 · 2촌)')

    // 2) 후궁(귀인 장씨) 기준 친족 호칭: 남편(고종)이 '후궁·측실'로 역전되지 않고 '부군 (남편)'으로 표시됨
    const concubineMap = computeKinshipMap({ egoId: 'concubine', nodes, edges }, 'concubine')
    expect(concubineMap.get('king')?.summary).toBe('배우자 · 부군 (남편)')

    // 3) ftResolveParentIds의 preferAdoptive 옵션 및 부부 단위(couple-coherent) 혈통/양통 분리 검증
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))
    expect(ftResolveParentIds('king', new Map(), nodeMap)).toEqual({
      fatherId: 'bio-father',
      motherId: 'bio-mother',
    })
    expect(
      ftResolveParentIds('king', new Map(), nodeMap, { preferAdoptive: true }),
    ).toEqual({
      fatherId: 'adopt-father',
      motherId: 'adopt-mother',
    })
    // 생부만 있고 생모가 미상(null)인 인물에게 양부·양모가 모두 있을 때 생가 모드에서 생부+양모가 이종 교배되지 않음
    nodeMap.set(
      'partial-bio',
      pNode({
        id: 'partial-bio',
        name: '부분생가',
        fatherId: 'bio-father',
        motherId: null,
        adoptiveFatherId: 'adopt-father',
        adoptiveMotherId: 'adopt-mother',
      }),
    )
    expect(ftResolveParentIds('partial-bio', new Map(), nodeMap)).toEqual({
      fatherId: 'bio-father',
      motherId: undefined,
    })
    expect(
      ftResolveParentIds('partial-bio', new Map(), nodeMap, { preferAdoptive: true }),
    ).toEqual({
      fatherId: 'adopt-father',
      motherId: 'adopt-mother',
    })
  })

  it('숙질(삼촌-조카) 간 입양 시 본생 호칭과 양계 호칭을 병합(양부 · 백부 / 양자 · 조카)하고 다세대 양계(양증손·양증조) 및 양자녀 배우자(자부·손자부)를 정확히 판별한다', () => {
    const pNode = (
      p: Pick<FamilyTreePerson, 'id' | 'name'> & Partial<FamilyTreePerson>,
    ): FamilyTreePerson => ({
      isOwned: true,
      ...p,
    })
    const nodes: FamilyTreePerson[] = [
      pNode({ id: 'pgf', name: '조부', gender: 'MALE' }),
      pNode({
        id: 'older-uncle',
        name: '큰아버지(양부)',
        gender: 'MALE',
        birthYear: 1500,
        fatherId: 'pgf',
      }),
      pNode({
        id: 'bio-father',
        name: '친아버지',
        gender: 'MALE',
        birthYear: 1505,
        fatherId: 'pgf',
      }),
      pNode({
        id: 'nephew-son',
        name: '조카(양자)',
        gender: 'MALE',
        birthYear: 1530,
        fatherId: 'bio-father',
        adoptiveFatherId: 'older-uncle',
      }),
      pNode({
        id: 'adopted-son-wife',
        name: '양자며느리',
        gender: 'FEMALE',
      }),
      pNode({
        id: 'adopted-grandson',
        name: '양손자',
        gender: 'MALE',
        fatherId: 'nephew-son',
        motherId: 'adopted-son-wife',
      }),
      pNode({
        id: 'adopted-grandson-wife',
        name: '양손자며느리',
        gender: 'FEMALE',
      }),
      pNode({
        id: 'adopted-great-grandson',
        name: '양증손자',
        gender: 'MALE',
        fatherId: 'adopted-grandson',
        motherId: 'adopted-grandson-wife',
      }),
    ]
    const edges = [
      { source: 'pgf', target: 'older-uncle', type: 'parent-child' as const },
      { source: 'pgf', target: 'bio-father', type: 'parent-child' as const },
      {
        source: 'bio-father',
        target: 'nephew-son',
        type: 'parent-child' as const,
        lineage: 'biological' as const,
      },
      {
        source: 'older-uncle',
        target: 'nephew-son',
        type: 'parent-child' as const,
        lineage: 'adoptive' as const,
      },
      {
        source: 'nephew-son',
        target: 'adopted-son-wife',
        type: 'spouse' as const,
        marriageRank: 'PRIMARY',
      },
      {
        source: 'nephew-son',
        target: 'adopted-grandson',
        type: 'parent-child' as const,
      },
      {
        source: 'adopted-son-wife',
        target: 'adopted-grandson',
        type: 'parent-child' as const,
      },
      {
        source: 'adopted-grandson',
        target: 'adopted-grandson-wife',
        type: 'spouse' as const,
        marriageRank: 'PRIMARY',
      },
      {
        source: 'adopted-grandson',
        target: 'adopted-great-grandson',
        type: 'parent-child' as const,
      },
      {
        source: 'adopted-grandson-wife',
        target: 'adopted-great-grandson',
        type: 'parent-child' as const,
      },
    ]

    // 1) 조카(양자) 기준: 큰아버지이자 양부 → '양부 · 백부 (큰아버지)' 병합
    const nephewMap = computeKinshipMap({ egoId: 'nephew-son', nodes, edges }, 'nephew-son')
    expect(nephewMap.get('older-uncle')?.title).toBe('양부 · 백부 (큰아버지)')
    expect(nephewMap.get('older-uncle')?.summary).toBe(
      '양부 · 백부 (큰아버지) (입양 1촌 · 본생 3촌)',
    )

    // 2) 큰아버지(양부) 기준: 조카이자 양자 → '양자 · 조카' 병합 + 배우자는 '자부 (며느리)' + 손자·증손자 및 손자며느리
    const uncleMap = computeKinshipMap({ egoId: 'older-uncle', nodes, edges }, 'older-uncle')
    expect(uncleMap.get('nephew-son')?.title).toBe('양자 · 조카')
    expect(uncleMap.get('nephew-son')?.summary).toBe('양자 · 조카 (입양 1촌 · 본생 3촌)')
    expect(uncleMap.get('adopted-son-wife')?.summary).toBe('자부 (며느리)')
    expect(uncleMap.get('adopted-grandson')?.title).toBe('양손자 · 종손 (조카손자)')
    expect(uncleMap.get('adopted-grandson-wife')?.summary).toBe('손자부 (손자며느리)')
    expect(uncleMap.get('adopted-great-grandson')?.summary).toContain('양증손자')

    // 3) 양증손자 기준: 양증조부(older-uncle) 3대조 판별
    const ggsMap = computeKinshipMap(
      { egoId: 'adopted-great-grandson', nodes, edges },
      'adopted-great-grandson',
    )
    expect(ggsMap.get('older-uncle')?.title).toContain('양증조부')

    // 4) getAncestorBadgeLabel 양계 모드(isAdoptive) 배지 라벨 검증
    expect(getAncestorBadgeLabel('FF', 'MALE', { isAdoptive: true })).toBe('양조부')
    expect(getAncestorBadgeLabel('FM', 'FEMALE', { isAdoptive: true })).toBe('양조모')
    expect(getAncestorBadgeLabel('MF', 'MALE', { isAdoptive: true })).toBe('양외조부')
    expect(getAncestorBadgeLabel('FFF', 'MALE', { isAdoptive: true })).toBe('양증조부')
    expect(getAncestorBadgeLabel('FFFF', 'MALE', { isAdoptive: true })).toBe('양고조부')
  })

  it('입양형제의 공유 부모 경로(pathNodeIds)와 양가 방계 친족(양백부·양고모·양조카·양사촌) 및 배우자 호칭을 정확히 산출한다', () => {
    const pNode = (
      p: Pick<FamilyTreePerson, 'id' | 'name'> & Partial<FamilyTreePerson>,
    ): FamilyTreePerson => ({
      isOwned: true,
      ...p,
    })
    const nodes: FamilyTreePerson[] = [
      pNode({ id: 'adopt-gp', name: '양조부', gender: 'MALE', birthYear: 1400 }),
      pNode({
        id: 'adopt-uncle',
        name: '양큰아버지',
        gender: 'MALE',
        fatherId: 'adopt-gp',
        birthYear: 1425,
        birthOrder: 1,
      }),
      pNode({
        id: 'adopt-uncle-wife',
        name: '양큰어머니',
        gender: 'FEMALE',
        birthYear: 1427,
      }),
      pNode({
        id: 'adopt-father',
        name: '양부',
        gender: 'MALE',
        fatherId: 'adopt-gp',
        birthYear: 1430,
        birthOrder: 2,
      }),
      pNode({
        id: 'adopt-father-2nd-wife',
        name: '양부계배',
        gender: 'FEMALE',
        birthYear: 1435,
      }),
      pNode({
        id: 'adopt-aunt',
        name: '양고모',
        gender: 'FEMALE',
        fatherId: 'adopt-gp',
        birthYear: 1433,
        birthOrder: 3,
      }),
      pNode({
        id: 'adopt-cousin',
        name: '양사촌',
        gender: 'MALE',
        fatherId: 'adopt-uncle',
        birthYear: 1455,
      }),
      pNode({
        id: 'ego',
        name: '본인',
        gender: 'MALE',
        adoptiveFatherId: 'adopt-father',
        birthYear: 1458,
      }),
      pNode({
        id: 'adopt-bro',
        name: '입양형제',
        gender: 'MALE',
        fatherId: 'adopt-father',
        birthYear: 1460,
      }),
      pNode({
        id: 'adopt-nephew',
        name: '양조카',
        gender: 'MALE',
        fatherId: 'adopt-bro',
        birthYear: 1485,
      }),
    ]
    const edges = [
      { source: 'adopt-gp', target: 'adopt-uncle', type: 'parent-child' as const },
      { source: 'adopt-gp', target: 'adopt-father', type: 'parent-child' as const },
      { source: 'adopt-gp', target: 'adopt-aunt', type: 'parent-child' as const },
      { source: 'adopt-uncle', target: 'adopt-uncle-wife', type: 'spouse' as const },
      { source: 'adopt-uncle', target: 'adopt-cousin', type: 'parent-child' as const },
      {
        source: 'adopt-father',
        target: 'adopt-father-2nd-wife',
        type: 'spouse' as const,
        marriageRank: 'SECONDARY',
      },
      {
        source: 'adopt-father',
        target: 'ego',
        type: 'parent-child' as const,
        lineage: 'adoptive' as const,
      },
      { source: 'adopt-father', target: 'adopt-bro', type: 'parent-child' as const },
      { source: 'adopt-bro', target: 'adopt-nephew', type: 'parent-child' as const },
    ]

    const kinMap = computeKinshipMap({ egoId: 'ego', nodes, edges }, 'ego')

    // 입양형제 경로에 공유 부모(adopt-father)가 포함되어 엣지 하이라이트가 연결됨
    expect(kinMap.get('adopt-bro')?.title).toBe('입양형제')
    expect(kinMap.get('adopt-bro')?.pathNodeIds).toEqual(['ego', 'adopt-father', 'adopt-bro'])

    // 입양형제의 자녀 → 양조카 (3촌)
    expect(kinMap.get('adopt-nephew')?.title).toBe('양조카')
    expect(kinMap.get('adopt-nephew')?.chon).toBe(3)
    expect(kinMap.get('adopt-nephew')?.pathNodeIds).toEqual([
      'ego',
      'adopt-father',
      'adopt-bro',
      'adopt-nephew',
    ])

    // 양부의 형제자매 → 양백부 / 양고모 (3촌) 및 배우자 양백모
    expect(kinMap.get('adopt-uncle')?.title).toBe('양백부 (큰아버지)')
    expect(kinMap.get('adopt-uncle')?.chon).toBe(3)
    expect(kinMap.get('adopt-uncle-wife')?.title).toBe('양백모 (큰어머니)')
    expect(kinMap.get('adopt-aunt')?.title).toBe('양고모')

    // 양백부의 자녀 → 양종형제 (양친사촌, 4촌)
    expect(kinMap.get('adopt-cousin')?.title).toBe('양종형제 (양친사촌)')
    expect(kinMap.get('adopt-cousin')?.chon).toBe(4)

    // 양부의 다른 배우자 → 양부의 배우자
    expect(kinMap.get('adopt-father-2nd-wife')?.title).toContain('양부의 배우자')
  })

  it('Round 8: compareSiblings·compareSiblingSeniority 이종 키 왜곡 방지 및 툴팁·후손 입양 배지 정합성', () => {
    // 1. 한쪽만 birthOrder가 있고 양쪽 모두 birthYear가 있을 때 확정 출생연도가 역전되지 않는다
    const mixedSibs = [
      { id: 'younger-with-order', birthYear: 1405, birthOrder: 5 },
      { id: 'older-no-order', birthYear: 1394, birthOrder: null },
    ]
    expect([...mixedSibs].sort(compareSiblings).map((s) => s.id)).toEqual([
      'older-no-order',
      'younger-with-order',
    ])

    // 2. 통합 birthOrder·출생연도 미상인 동성 형제는 genderBirthOrder(장남 vs 3남)로 정렬·서열 판정된다
    const genderOrderSibs = [
      { id: 'son-3', gender: 'MALE', genderBirthOrder: 3 },
      { id: 'son-1', gender: 'MALE', genderBirthOrder: 1 },
    ]
    expect([...genderOrderSibs].sort(compareSiblings).map((s) => s.id)).toEqual([
      'son-1',
      'son-3',
    ])
    expect(compareSiblingSeniority(genderOrderSibs[1], genderOrderSibs[0])).toBeLessThan(0)

    // 3. 아버지는 출생연도(1400)만 있고 삼촌은 birthOrder(4)만 있을 때 백부로 오판하지 않고 중립('백부·숙부 (삼촌)')을 반환한다
    const pNode = (
      p: Pick<FamilyTreePerson, 'id' | 'name'> & Partial<FamilyTreePerson>,
    ): FamilyTreePerson => ({
      isOwned: true,
      ...p,
    })
    const nodes: FamilyTreePerson[] = [
      pNode({ id: 'gp', name: '조부', gender: 'MALE' }),
      pNode({ id: 'father', name: '아버지', gender: 'MALE', fatherId: 'gp', birthYear: 1400 }),
      pNode({
        id: 'uncle-incomparable',
        name: '삼촌',
        gender: 'MALE',
        fatherId: 'gp',
        birthOrder: 4,
      }),
      pNode({ id: 'ego', name: '본인', gender: 'MALE', fatherId: 'father', birthYear: 1425 }),
    ]
    const edges = [
      { source: 'gp', target: 'father', type: 'parent-child' as const },
      { source: 'gp', target: 'uncle-incomparable', type: 'parent-child' as const },
      { source: 'father', target: 'ego', type: 'parent-child' as const },
    ]
    const kinMap = computeKinshipMap({ egoId: 'ego', nodes, edges }, 'ego')
    expect(kinMap.get('uncle-incomparable')?.title).toBe('백부·숙부 (삼촌)')

    // 4. 후궁 프로필에서 남편(왕) 배우자 카드의 툴팁 혼인 형태가 '후궁·측실'로 역전되지 않고 '부군 (남편)'으로 표시된다
    const kingSpouseTooltip = buildPersonTooltipLines({
      id: 'king-id',
      gender: 'MALE',
      marriageRank: 'CONCUBINE',
      rankHolderId: 'concubine-ego-id',
    })
    expect(kingSpouseTooltip).toContainEqual({
      label: '혼인 형태',
      value: '부군 (남편)',
    })

    // 5. 형제간 출계 입양된 손자가 양부 슬롯 아래에 렌더될 때 입양 후손 배지('양손자')로 표시된다
    expect(
      formatDescendantRoleBadge(
        { gender: 'MALE' },
        '손자녀',
        { title: '손자', chon: 2, summary: '손자 (2촌)' },
        { isAdoptedUnderParent: true },
      ),
    ).toBe('양손자')
  })

  it('Round 11: 종친(백숙부) 입양 시 공유 친조부모 호칭 오염 방지, 형제간 출계 손자의 생가/양가 슬롯별 배지 분기, 엣지 기반 양부모 인식 및 compareSiblingChronology', () => {
    const pNode = (
      p: Pick<FamilyTreePerson, 'id' | 'name'> & Partial<FamilyTreePerson>,
    ): FamilyTreePerson => ({
      isOwned: true,
      ...p,
    })

    // 1. 백부에게 입양된 조카(ego) 기준: 친조부이자 양조부인 'pgf'는 '양조부 · 조부'로 중복 오염되지 않고 '조부 (2촌)'으로 유지된다
    const uncleAdoptNodes: FamilyTreePerson[] = [
      pNode({ id: 'pgf', name: '공유할아버지', gender: 'MALE', birthYear: 1450 }),
      pNode({ id: 'pgm', name: '공유할머니', gender: 'FEMALE', birthYear: 1452 }),
      pNode({
        id: 'older-uncle',
        name: '큰아버지(양부)',
        gender: 'MALE',
        fatherId: 'pgf',
        motherId: 'pgm',
        birthYear: 1475,
      }),
      pNode({
        id: 'bio-father',
        name: '친아버지',
        gender: 'MALE',
        fatherId: 'pgf',
        motherId: 'pgm',
        birthYear: 1480,
      }),
      pNode({
        id: 'ego',
        name: '출계조카',
        gender: 'MALE',
        fatherId: 'bio-father',
        adoptiveFatherId: 'older-uncle',
        birthYear: 1505,
      }),
    ]
    const uncleAdoptEdges = [
      { source: 'pgf', target: 'older-uncle', type: 'parent-child' as const },
      { source: 'pgm', target: 'older-uncle', type: 'parent-child' as const },
      { source: 'pgf', target: 'bio-father', type: 'parent-child' as const },
      { source: 'pgm', target: 'bio-father', type: 'parent-child' as const },
      {
        source: 'bio-father',
        target: 'ego',
        type: 'parent-child' as const,
        lineage: 'biological' as const,
      },
      {
        source: 'older-uncle',
        target: 'ego',
        type: 'parent-child' as const,
        lineage: 'adoptive' as const,
      },
    ]
    const egoMap = computeKinshipMap(
      { egoId: 'ego', nodes: uncleAdoptNodes, edges: uncleAdoptEdges },
      'ego',
    )
    expect(egoMap.get('pgf')?.title).toBe('조부')
    expect(egoMap.get('pgf')?.summary).toBe('조부 (2대조 · 2촌)')
    expect(egoMap.get('pgm')?.title).toBe('조모')
    expect(egoMap.get('pgm')?.summary).toBe('조모 (2대조 · 2촌)')

    // 2. 조부('pgf') 기준: 차남('bio-father')의 친아들이자 장남('older-uncle')의 양자인 손자('ego')는
    //    kinship 타이틀이 '손자 · 양손자'이며, 생부 슬롯 아래에서는 '손자', 양부 슬롯 아래에서는 '양손자 · 손자' 배지로 분기된다
    const pgfMap = computeKinshipMap(
      { egoId: 'pgf', nodes: uncleAdoptNodes, edges: uncleAdoptEdges },
      'pgf',
    )
    const grandsonKin = pgfMap.get('ego')
    expect(grandsonKin?.title).toBe('손자 · 양손자')
    expect(grandsonKin?.summary).toBe('손자 · 양손자 (2촌)')
    expect(
      formatDescendantRoleBadge({ gender: 'MALE' }, '손자녀', grandsonKin, {
        isAdoptedUnderParent: false,
      }),
    ).toBe('손자')
    expect(
      formatDescendantRoleBadge({ gender: 'MALE' }, '손자녀', grandsonKin, {
        isAdoptedUnderParent: true,
      }),
    ).toBe('양손자 · 손자')

    // 3. 노드에 adoptiveFatherId 스칼라가 없어도 lineage === 'adoptive' 엣지만으로 양부·양조부를 판별한다
    const edgeOnlyNodes: FamilyTreePerson[] = [
      pNode({ id: 'agp', name: '양조부', gender: 'MALE' }),
      pNode({ id: 'af', name: '양부', gender: 'MALE', fatherId: 'agp' }),
      pNode({ id: 'child', name: '양자', gender: 'MALE' }),
    ]
    const edgeOnlyEdges = [
      { source: 'agp', target: 'af', type: 'parent-child' as const },
      {
        source: 'af',
        target: 'child',
        type: 'parent-child' as const,
        lineage: 'adoptive' as const,
      },
    ]
    const edgeOnlyMap = computeKinshipMap(
      { egoId: 'child', nodes: edgeOnlyNodes, edges: edgeOnlyEdges },
      'child',
    )
    expect(edgeOnlyMap.get('af')?.title).toBe('양부')
    expect(edgeOnlyMap.get('agp')?.title).toBe('양조부')

    // 4. compareSiblingChronology는 연대·출생순서 정보가 모두 없을 때 0을 반환하여 배우자 위계 타이브레이크를 허용하고,
    //    출생연도가 있으면 id나 배우자 위계보다 먼저 연대순으로 정렬한다
    expect(
      compareSiblingChronology(
        { id: 'z-child-of-primary' },
        { id: 'a-child-of-concubine' },
      ),
    ).toBe(0)
    expect(
      compareSiblingChronology(
        { id: 'z-older-concubine-son', birthYear: 1400 },
        { id: 'a-younger-primary-son', birthYear: 1405 },
      ),
    ).toBeLessThan(0)
  })

  it('yearOf·birthYearOf·lifeSpan은 4자리 음수 ISO(-0221-01-01) BC 날짜도 NaN 없이 파싱한다', () => {
    expect(yearOf('-0259-01-01')).toBe(-259)
    expect(yearOf('-0210-09-10T00:00:00.000Z')).toBe(-210)
    expect(birthYearOf({ birthDate: '-0259-01-01', birthEra: 'BC' })).toBe(-259)
    expect(birthYearOf({ birthDate: '-0259-01-01', birthEra: null })).toBe(-259)
    expect(
      lifeSpan({
        id: 'qin',
        name: '영정',
        birthDate: '-0259-01-01',
        deathDate: '-0210-09-10',
        isAlive: false,
      }),
    ).toBe('BC 259–BC 210')
  })
})
