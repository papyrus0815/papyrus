/**
 * 그래프 기반 교전 세력 유틸리티 함수
 */

import type {
  EventBelligerentsGraph,
  CountryRelation,
  BelligerentCountry,
  RelationType,
  RelationshipAnalysis,
  RelationshipGraphNode,
  RelationshipGraphEdge,
} from '../types/belligerents-graph.types'

// ============================================
// 1. 자동 진영 분류 알고리즘
// ============================================

/**
 * 국가 간 관계를 분석하여 자동으로 진영을 분류
 * Union-Find 알고리즘 기반
 */
export function autoClassifySides(
  countries: BelligerentCountry[],
  relations: CountryRelation[],
): Array<{
  name: string
  memberCountryIds: string[]
  confidence: number
  reasoning: string
}> {
  if (countries.length === 0) return []

  // Union-Find 초기화
  const parent: Record<string, string> = {}
  const rank: Record<string, number> = {}

  countries.forEach((country) => {
    parent[country.countryId] = country.countryId
    rank[country.countryId] = 0
  })

  // Find 함수
  const find = (x: string): string => {
    if (parent[x] !== x) {
      parent[x] = find(parent[x])
    }
    return parent[x]
  }

  // Union 함수
  const union = (x: string, y: string) => {
    const rootX = find(x)
    const rootY = find(y)

    if (rootX === rootY) return

    if (rank[rootX] < rank[rootY]) {
      parent[rootX] = rootY
    } else if (rank[rootX] > rank[rootY]) {
      parent[rootY] = rootX
    } else {
      parent[rootY] = rootX
      rank[rootX]++
    }
  }

  // 동맹/협력 관계로 연결
  relations.forEach((rel) => {
    if (
      rel.relationType === 'allied' ||
      rel.relationType === 'cooperation' ||
      rel.relationType === 'puppet'
    ) {
      union(rel.fromCountry, rel.toCountry)
    }
  })

  // 진영별로 그룹화
  const clusters: Record<string, string[]> = {}
  countries.forEach((country) => {
    const root = find(country.countryId)
    if (!clusters[root]) {
      clusters[root] = []
    }
    clusters[root].push(country.countryId)
  })

  // 결과 생성
  const sides = Object.entries(clusters).map(([rootId, memberIds], index) => {
    const rootCountry = countries.find((c) => c.countryId === rootId)
    const sideName = rootCountry?.countryName
      ? `${rootCountry.countryName} 진영`
      : `진영 ${index + 1}`

    // 신뢰도 계산 (내부 연결 / 전체 연결)
    const internalConnections = relations.filter(
      (rel) =>
        memberIds.includes(rel.fromCountry) && memberIds.includes(rel.toCountry),
    ).length

    const totalPossibleConnections = (memberIds.length * (memberIds.length - 1)) / 2
    const confidence =
      totalPossibleConnections > 0
        ? Math.min(internalConnections / totalPossibleConnections, 1)
        : 1

    // 이유 생성
    const allyRelations = relations.filter(
      (rel) =>
        memberIds.includes(rel.fromCountry) &&
        memberIds.includes(rel.toCountry) &&
        rel.relationType === 'allied',
    ).length

    const reasoning =
      allyRelations > 0
        ? `${allyRelations}개의 동맹 관계로 연결됨`
        : '협력 관계 기반'

    return {
      name: sideName,
      memberCountryIds: memberIds,
      confidence,
      reasoning,
    }
  })

  return sides.sort((a, b) => b.memberCountryIds.length - a.memberCountryIds.length)
}

// ============================================
// 2. 관계 강도 계산
// ============================================

/**
 * 두 국가 간 관계 강도 반환 (-100 ~ 100)
 */
export function getRelationStrength(
  countryId1: string,
  countryId2: string,
  relations: CountryRelation[],
): number {
  const relation = relations.find(
    (r) =>
      (r.fromCountry === countryId1 && r.toCountry === countryId2) ||
      (r.fromCountry === countryId2 && r.toCountry === countryId1),
  )

  return relation?.strength ?? 0
}

/**
 * 관계 타입을 강도로 변환
 */
export function relationTypeToStrength(type: RelationType): number {
  const strengthMap: Record<RelationType, number> = {
    allied: 100,
    cooperation: 60,
    'non-aggression': 30,
    neutral: 0,
    puppet: 80,
    occupied: -50,
    enemy: -100,
  }
  return strengthMap[type]
}

// ============================================
// 3. 관계 분석
// ============================================

/**
 * 관계 그래프 분석
 */
export function analyzeRelationships(
  graph: EventBelligerentsGraph,
): RelationshipAnalysis {
  const { countries, relations } = graph

  // 자동 클러스터링
  const autoSides = autoClassifySides(countries, relations)
  const clusters = autoSides.map((side, index) => ({
    id: `cluster-${index}`,
    memberCountryIds: side.memberCountryIds,
    cohesion: side.confidence,
    centralCountry: side.memberCountryIds[0], // 첫 번째를 중심으로 (간단히)
  }))

  // 핵심 국가 분석
  const connectionCounts: Record<string, number> = {}
  countries.forEach((country) => {
    connectionCounts[country.countryId] = relations.filter(
      (r) => r.fromCountry === country.countryId || r.toCountry === country.countryId,
    ).length
  })

  const maxConnections = Math.max(...Object.values(connectionCounts), 1)

  const keyPlayers = countries
    .map((country) => ({
      countryId: country.countryId,
      importance: connectionCounts[country.countryId] / maxConnections,
      connections: connectionCounts[country.countryId],
      influence: connectionCounts[country.countryId] / maxConnections,
    }))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 5) // 상위 5개

  // 복잡도 계산
  const conflictingRelations = relations.filter((rel) => {
    // A-B가 동맹인데, A-C가 적대이고, B-C도 동맹인 경우
    const relatedRelations = relations.filter(
      (r) =>
        r.fromCountry === rel.toCountry || r.toCountry === rel.fromCountry,
    )
    return relatedRelations.some(
      (r) =>
        (rel.relationType === 'allied' && r.relationType === 'enemy') ||
        (rel.relationType === 'enemy' && r.relationType === 'allied'),
    )
  }).length

  return {
    clusters,
    keyPlayers,
    complexity: {
      totalRelations: relations.length,
      conflictingRelations,
      allianceChanges: 0, // TODO: 시간 기반으로 계산
    },
  }
}

// ============================================
// 4. 그래프 시각화 데이터 생성
// ============================================

/**
 * D3.js나 vis.js용 그래프 데이터 생성
 */
export function toVisualizationGraph(
  graph: EventBelligerentsGraph,
): {
  nodes: RelationshipGraphNode[]
  edges: RelationshipGraphEdge[]
} {
  const nodes: RelationshipGraphNode[] = graph.countries.map((country) => ({
    countryId: country.countryId,
    countryName: country.countryName,
  }))

  const edges: RelationshipGraphEdge[] = graph.relations.map((rel) => ({
    source: rel.fromCountry,
    target: rel.toCountry,
    type: rel.relationType,
    strength: rel.strength,
    label: rel.description,
  }))

  return { nodes, edges }
}

// ============================================
// 5. 관계 추가/수정/삭제
// ============================================

/**
 * 새 관계 추가
 */
export function addRelation(
  graph: EventBelligerentsGraph,
  relation: CountryRelation,
): EventBelligerentsGraph {
  return {
    ...graph,
    relations: [...graph.relations, relation],
  }
}

/**
 * 관계 업데이트
 */
export function updateRelation(
  graph: EventBelligerentsGraph,
  relationId: string,
  updates: Partial<CountryRelation>,
): EventBelligerentsGraph {
  return {
    ...graph,
    relations: graph.relations.map((rel) =>
      rel.id === relationId ? { ...rel, ...updates } : rel,
    ),
  }
}

/**
 * 관계 삭제
 */
export function removeRelation(
  graph: EventBelligerentsGraph,
  relationId: string,
): EventBelligerentsGraph {
  return {
    ...graph,
    relations: graph.relations.filter((rel) => rel.id !== relationId),
  }
}

// ============================================
// 6. 국가 추가/수정/삭제
// ============================================

/**
 * 새 국가 추가
 */
export function addCountry(
  graph: EventBelligerentsGraph,
  country: BelligerentCountry,
): EventBelligerentsGraph {
  return {
    ...graph,
    countries: [...graph.countries, country],
  }
}

/**
 * 국가 업데이트
 */
export function updateCountry(
  graph: EventBelligerentsGraph,
  countryId: string,
  updates: Partial<BelligerentCountry>,
): EventBelligerentsGraph {
  return {
    ...graph,
    countries: graph.countries.map((country) =>
      country.countryId === countryId ? { ...country, ...updates } : country,
    ),
  }
}

/**
 * 국가 삭제 (관련 관계도 함께 삭제)
 */
export function removeCountry(
  graph: EventBelligerentsGraph,
  countryId: string,
): EventBelligerentsGraph {
  return {
    ...graph,
    countries: graph.countries.filter((c) => c.countryId !== countryId),
    relations: graph.relations.filter(
      (r) => r.fromCountry !== countryId && r.toCountry !== countryId,
    ),
  }
}

// ============================================
// 7. 검증
// ============================================

/**
 * 그래프 유효성 검사
 */
export function validateGraph(
  graph: EventBelligerentsGraph,
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const countryIds = new Set(graph.countries.map((c) => c.countryId))

  // 중복 국가 ID 확인
  if (countryIds.size !== graph.countries.length) {
    errors.push('중복된 국가 ID가 존재합니다')
  }

  // 관계의 국가 ID가 존재하는지 확인
  graph.relations.forEach((rel, index) => {
    if (!countryIds.has(rel.fromCountry)) {
      errors.push(
        `관계 ${index + 1}: fromCountry(${rel.fromCountry})가 존재하지 않습니다`,
      )
    }
    if (!countryIds.has(rel.toCountry)) {
      errors.push(
        `관계 ${index + 1}: toCountry(${rel.toCountry})가 존재하지 않습니다`,
      )
    }
  })

  // 자기 자신과의 관계 확인
  graph.relations.forEach((rel, index) => {
    if (rel.fromCountry === rel.toCountry) {
      errors.push(`관계 ${index + 1}: 자기 자신과의 관계는 불가능합니다`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

// ============================================
// 8. 레거시 변환
// ============================================

/**
 * 기존 BelligerentSide 형식을 그래프로 변환
 */
export function legacyToGraph(legacySides: any[]): EventBelligerentsGraph {
  const countries: BelligerentCountry[] = []
  const relations: CountryRelation[] = []

  legacySides.forEach((side, sideIndex) => {
    // 각 진영의 국가들을 추가
    if (side.countries && Array.isArray(side.countries)) {
      side.countries.forEach((country: any) => {
        countries.push({
          countryId: country.countryId,
          countryName: country.countryName,
          isHistorical: country.isHistorical ?? false,
          commander: side.commander,
          forces: side.forces,
          deployedUnits: side.deployedUnits,
          weaponsUsed: side.weaponsUsed,
          participation: 'full',
          description: country.joinReason || side.description,
        })
      })
    }

    // 같은 진영 내 국가들끼리는 allied 관계
    if (side.countries && side.countries.length > 1) {
      for (let i = 0; i < side.countries.length; i++) {
        for (let j = i + 1; j < side.countries.length; j++) {
          relations.push({
            id: `legacy-${sideIndex}-${i}-${j}`,
            fromCountry: side.countries[i].countryId,
            toCountry: side.countries[j].countryId,
            relationType: 'allied',
            startDate: '',
            strength: 100,
            description: `${side.name} 진영`,
          })
        }
      }
    }
  })

  // 다른 진영끼리는 enemy 관계
  for (let i = 0; i < legacySides.length; i++) {
    for (let j = i + 1; j < legacySides.length; j++) {
      const side1Countries = legacySides[i].countries || []
      const side2Countries = legacySides[j].countries || []

      side1Countries.forEach((c1: any) => {
        side2Countries.forEach((c2: any) => {
          relations.push({
            id: `legacy-enemy-${i}-${j}-${c1.countryId}-${c2.countryId}`,
            fromCountry: c1.countryId,
            toCountry: c2.countryId,
            relationType: 'enemy',
            startDate: '',
            strength: -100,
          })
        })
      })
    }
  }

  return {
    countries,
    relations,
  }
}

