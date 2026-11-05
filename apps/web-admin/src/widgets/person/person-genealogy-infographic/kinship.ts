import type { FamilyTreeData, FamilyTreePerson } from '@/shared/api/persons-family-tree'
import { resolvePerspectiveMarriageRankLabel } from '@/shared/lib/marriage-rank-labels'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

import { classifySiblingKinship, ftResolveParentIds } from './family-tree-derive'
import { compareSiblingSeniority } from './utils'

export interface KinshipInfo {
  /** 한국어 친족 호칭 (예: '아버지', '조부', '백부 (큰아버지)', '이복형제', '조카') */
  title: string
  /** 혈족 촌수 (본인=0, 직계·방계 혈족=1 이상 정수, 배우자·인척=null) */
  chon: number | null
  /** 직계 세대 라벨 (예: '2대조', '3대손') */
  generationLabel?: string | null
  /** 카드·툴팁·상세 패널에 표시할 통합 문자열 */
  summary: string
  /** 기준 인물(egoId)에서 대상 인물까지 이어지는 최단 계보 경로 노드 ID 배열 */
  pathNodeIds?: string[]
  /** 기준 인물 → 경유 인물 → 대상 인물 경로 요약 문자열 */
  pathSummary?: string | null
}

/**
 * 자녀 카드 배지 라벨 생성 — 성별·성별 내 출생 서열(genderBirthOrder)·통합 출생 서열(birthOrder)·입양 여부를 반영해
 * '장남', '3남', '장녀 (2째)', '양자 · 2남', '아들 · 2째', '아들', '딸', '자녀'로 구체화한다.
 */
export function formatChildRoleBadge(child: {
  gender?: string | null
  birthOrder?: number | null
  genderBirthOrder?: number | null
  isAdopted?: boolean
}): string {
  const g = (child.gender ?? '').toUpperCase()
  const order = child.birthOrder
  const gOrder = child.genderBirthOrder
  const adoptPrefix = child.isAdopted
    ? g === 'MALE' || g === 'M'
      ? '양자 · '
      : g === 'FEMALE' || g === 'F'
        ? '양녀 · '
        : '입양 · '
    : ''

  if (g === 'MALE' || g === 'M') {
    if (gOrder != null && gOrder >= 1) {
      const gLabel = gOrder === 1 ? '장남' : `${gOrder}남`
      return order != null && order >= 1
        ? `${adoptPrefix}${gLabel} (${order}째)`
        : `${adoptPrefix}${gLabel}`
    }
    if (order === 1) return `${adoptPrefix}장남 (1째)`
    if (order != null && order > 1) return `${adoptPrefix}아들 (${order}째)`
    return child.isAdopted ? '양자' : '아들'
  }
  if (g === 'FEMALE' || g === 'F') {
    if (gOrder != null && gOrder >= 1) {
      const gLabel = gOrder === 1 ? '장녀' : `${gOrder}녀`
      return order != null && order >= 1
        ? `${adoptPrefix}${gLabel} (${order}째)`
        : `${adoptPrefix}${gLabel}`
    }
    if (order === 1) return `${adoptPrefix}장녀 (1째)`
    if (order != null && order > 1) return `${adoptPrefix}딸 (${order}째)`
    return child.isAdopted ? '양녀' : '딸'
  }
  if (order != null && order >= 1) return `${adoptPrefix}자녀 (${order}째)`
  return child.isAdopted ? '양자녀' : '자녀'
}

/**
 * 손자녀·증손자녀 등 후손 카드 배지 라벨 생성 —
 * KinshipInfo(친손/외손 및 성별 반영)가 있으면 우선 사용하고, 없으면 성별+세대 기본값으로 폴백.
 * 현재 부모 슬롯 기준 입양 자녀(opts.isAdoptedUnderParent)이면 '양손자·양손녀' 등 입양 후손 라벨로 표시한다.
 */
export function formatDescendantRoleBadge(
  person: { gender?: string | null },
  defaultBadge: string,
  kinship?: KinshipInfo | null,
  opts?: { isAdoptedUnderParent?: boolean },
): string {
  const g = (person.gender ?? '').toUpperCase()
  const isAdopted = Boolean(opts?.isAdoptedUnderParent)
  if (kinship?.title) {
    if (kinship.title.includes(' · ')) {
      const parts = kinship.title.split(' · ').map((s) => s.trim()).filter(Boolean)
      const adoptPart = parts.find((p) => p.startsWith('양'))
      const bioPart = parts.find((p) => !p.startsWith('양'))
      if (!isAdopted && bioPart) {
        return bioPart
      }
      if (isAdopted && adoptPart && bioPart) {
        return `${adoptPart} · ${bioPart}`
      }
    }
    if (isAdopted && !kinship.title.startsWith('양')) {
      return `양${kinship.title.replace(/^친/, '')}`
    }
    return kinship.title
  }
  const prefix = isAdopted ? '양' : ''
  if (defaultBadge === '손자녀') {
    if (g === 'MALE' || g === 'M') return `${prefix}손자`
    if (g === 'FEMALE' || g === 'F') return `${prefix}손녀`
  } else if (defaultBadge === '증손자녀') {
    if (g === 'MALE' || g === 'M') return `${prefix}증손자`
    if (g === 'FEMALE' || g === 'F') return `${prefix}증손녀`
  } else if (defaultBadge === '고손자녀') {
    if (g === 'MALE' || g === 'M') return `${prefix}고손자`
    if (g === 'FEMALE' || g === 'F') return `${prefix}고손녀`
  }
  return isAdopted ? `${prefix}${defaultBadge}` : defaultBadge
}

/**
 * FamilyTreeData 그래프에서 기준 인물(egoId) 대비 모든 노드의 한국어 친족 호칭·촌수·계보 경로를 계산한다.
 * - 직계 존속 (부모·조부모·증조부모·고조부모·N대조)
 * - 직계 비속 (아들·딸·친손/외손·친증손/외증손·고손·N대손)
 * - 방계 혈족 (동복/이복/이부형제 2촌, 백부/숙부/고모/외숙부/이모/조카 3촌, 종형제/고종/외종/이종사촌·종조부/대고모 4촌 등)
 * - 인척 (본인 배우자 및 정실/후궁 구분, 계모/서모, 며느리/사위, 손자부/손서, 형수/제수/매부, 장인/장모·시부모 등)
 */
export function computeKinshipMap(
  familyTreeData: FamilyTreeData | null | undefined,
  overrideEgoId?: string,
): Map<string, KinshipInfo> {
  const result = new Map<string, KinshipInfo>()
  if (!familyTreeData || !familyTreeData.nodes?.length) return result

  const egoId = overrideEgoId || familyTreeData.egoId
  const nodeMap = new Map<string, FamilyTreePerson>()
  for (const n of familyTreeData.nodes) {
    nodeMap.set(n.id, n)
  }
  const ego = nodeMap.get(egoId)
  if (!ego) return result

  const formatPathSummary = (pathIds: string[]): string | null => {
    if (pathIds.length < 2) return null
    const names = pathIds.map((id) => {
      const node = nodeMap.get(id)
      return node ? getPersonDisplayName(node, true) : null
    })
    if (names.some((n) => !n)) return null
    return names.join(' → ')
  }

  const pcEdges = (familyTreeData.edges ?? []).filter(
    (e) => e.type === 'parent-child' && e.lineage !== 'adoptive',
  )
  const adoptPcEdges = (familyTreeData.edges ?? []).filter(
    (e) => e.type === 'parent-child' && e.lineage === 'adoptive',
  )
  const spouseEdges = (familyTreeData.edges ?? []).filter((e) => e.type === 'spouse')

  const rawParentsOf = new Map<string, string[]>()
  for (const e of pcEdges) {
    const list = rawParentsOf.get(e.target) ?? []
    if (!list.includes(e.source)) list.push(e.source)
    rawParentsOf.set(e.target, list)
  }

  const rawAdoptParentsOf = new Map<string, string[]>()
  for (const e of adoptPcEdges) {
    const list = rawAdoptParentsOf.get(e.target) ?? []
    if (!list.includes(e.source)) list.push(e.source)
    rawAdoptParentsOf.set(e.target, list)
  }

  const parentsOf = new Map<string, { fatherId: string | null; motherId: string | null }>()
  const adoptiveParentsOf = new Map<
    string,
    { adoptiveFatherId: string | null; adoptiveMotherId: string | null }
  >()
  const childrenOf = new Map<string, string[]>()
  for (const n of familyTreeData.nodes) {
    const resolved = ftResolveParentIds(n.id, rawParentsOf, nodeMap, {
      allowAdoptiveFallback: false,
    })
    const fatherId = resolved.fatherId ?? n.fatherId ?? null
    const motherId = resolved.motherId ?? n.motherId ?? null
    parentsOf.set(n.id, { fatherId, motherId })
    if (fatherId) {
      const list = childrenOf.get(fatherId) ?? []
      if (!list.includes(n.id)) list.push(n.id)
      childrenOf.set(fatherId, list)
    }
    if (motherId) {
      const list = childrenOf.get(motherId) ?? []
      if (!list.includes(n.id)) list.push(n.id)
      childrenOf.set(motherId, list)
    }

    const adoptEdgeIds = (rawAdoptParentsOf.get(n.id) ?? []).filter(
      (pid) => pid && pid !== n.id && pid !== fatherId && pid !== motherId,
    )
    let edgeAf: string | null = null
    let edgeAm: string | null = null
    for (const pid of adoptEdgeIds) {
      const pNode = nodeMap.get(pid)
      const pg = (pNode?.gender ?? '').toUpperCase()
      if ((pg === 'MALE' || pg === 'M') && !edgeAf) edgeAf = pid
      else if ((pg === 'FEMALE' || pg === 'F') && !edgeAm) edgeAm = pid
    }
    for (const pid of adoptEdgeIds) {
      if (pid === edgeAf || pid === edgeAm) continue
      if (!edgeAf) edgeAf = pid
      else if (!edgeAm) edgeAm = pid
    }
    const rawAf = n.adoptiveFatherId ?? edgeAf
    const rawAm = n.adoptiveMotherId ?? edgeAm
    adoptiveParentsOf.set(n.id, {
      adoptiveFatherId:
        rawAf && rawAf !== n.id && rawAf !== fatherId && rawAf !== motherId ? rawAf : null,
      adoptiveMotherId:
        rawAm && rawAm !== n.id && rawAm !== fatherId && rawAm !== motherId ? rawAm : null,
    })
  }

  const siblingFksOf = (id: string) => {
    const node = nodeMap.get(id)
    const bio = parentsOf.get(id)
    const adopt = adoptiveParentsOf.get(id)
    return {
      fatherId: bio?.fatherId ?? node?.fatherId ?? null,
      motherId: bio?.motherId ?? node?.motherId ?? null,
      adoptiveFatherId: adopt?.adoptiveFatherId ?? node?.adoptiveFatherId ?? null,
      adoptiveMotherId: adopt?.adoptiveMotherId ?? node?.adoptiveMotherId ?? null,
    }
  }

  const spousesOf = new Map<
    string,
    Array<{ partnerId: string; marriageRank: string | null; rankHolderId: string | null }>
  >()
  for (const e of spouseEdges) {
    const listA = spousesOf.get(e.source) ?? []
    listA.push({
      partnerId: e.target,
      marriageRank: e.marriageRank ?? null,
      rankHolderId: e.rankHolderId ?? null,
    })
    spousesOf.set(e.source, listA)

    const listB = spousesOf.get(e.target) ?? []
    listB.push({
      partnerId: e.source,
      marriageRank: e.marriageRank ?? null,
      rankHolderId: e.rankHolderId ?? null,
    })
    spousesOf.set(e.target, listB)
  }

  // 1. 본인
  result.set(egoId, {
    title: '본인',
    chon: 0,
    summary: '본인 (기준 인물)',
    pathNodeIds: [egoId],
    pathSummary: null,
  })

  // 2. ego의 모든 직계 조상 탐색 (upSteps, side: 'paternal' | 'maternal', pathIds)
  type AncestorTrace = {
    steps: number
    side: 'paternal' | 'maternal'
    pathIds: string[]
  }
  const egoAncestors = new Map<string, AncestorTrace>()
  const egoParents = parentsOf.get(egoId) ?? { fatherId: null, motherId: null }

  const ancQueue: Array<{
    id: string
    steps: number
    side: 'paternal' | 'maternal'
    pathIds: string[]
  }> = []
  if (egoParents.fatherId && nodeMap.has(egoParents.fatherId)) {
    ancQueue.push({
      id: egoParents.fatherId,
      steps: 1,
      side: 'paternal',
      pathIds: [egoId, egoParents.fatherId],
    })
  }
  if (egoParents.motherId && nodeMap.has(egoParents.motherId)) {
    ancQueue.push({
      id: egoParents.motherId,
      steps: 1,
      side: 'maternal',
      pathIds: [egoId, egoParents.motherId],
    })
  }

  while (ancQueue.length > 0) {
    const curr = ancQueue.shift()!
    const existing = egoAncestors.get(curr.id)
    if (existing && existing.steps <= curr.steps) continue
    egoAncestors.set(curr.id, {
      steps: curr.steps,
      side: curr.side,
      pathIds: curr.pathIds,
    })

    const p = parentsOf.get(curr.id)
    if (p?.fatherId && nodeMap.has(p.fatherId)) {
      ancQueue.push({
        id: p.fatherId,
        steps: curr.steps + 1,
        side: curr.side,
        pathIds: [...curr.pathIds, p.fatherId],
      })
    }
    if (p?.motherId && nodeMap.has(p.motherId)) {
      ancQueue.push({
        id: p.motherId,
        steps: curr.steps + 1,
        side: curr.side,
        pathIds: [...curr.pathIds, p.motherId],
      })
    }
  }

  for (const [ancId, trace] of egoAncestors) {
    const person = nodeMap.get(ancId)
    if (!person) continue
    const g = (person.gender ?? '').toUpperCase()
    const { steps, side, pathIds } = trace
    const prefix = side === 'maternal' ? '외' : ''
    let title = ''
    let genLabel: string | null = null

    if (steps === 1) {
      title = side === 'paternal' ? '아버지' : '어머니'
    } else if (steps === 2) {
      title =
        g === 'MALE'
          ? `${prefix}조부`
          : g === 'FEMALE'
            ? `${prefix}조모`
            : `${prefix || '친'}조부모`
      genLabel = '2대조'
    } else if (steps === 3) {
      title =
        g === 'MALE'
          ? `${prefix}증조부`
          : g === 'FEMALE'
            ? `${prefix}증조모`
            : `${prefix}증조부모`
      genLabel = '3대조'
    } else if (steps === 4) {
      title =
        g === 'MALE'
          ? `${prefix}고조부`
          : g === 'FEMALE'
            ? `${prefix}고조모`
            : `${prefix}고조부모`
      genLabel = '4대조'
    } else {
      title = `${prefix}${steps}대조`
      genLabel = `${steps}대조`
    }

    result.set(ancId, {
      title,
      chon: steps,
      generationLabel: genLabel,
      summary: genLabel ? `${title} (${genLabel} · ${steps}촌)` : `${title} (${steps}촌)`,
      pathNodeIds: pathIds,
      pathSummary: formatPathSummary(pathIds),
    })
  }

  // 3. ego의 모든 직계 후손 탐색 (downSteps, isMaternalDescendant: 딸의 후손=외손 여부)
  const descQueue: Array<{
    id: string
    steps: number
    maternalDescendant: boolean
    pathIds: string[]
  }> = []
  for (const cid of childrenOf.get(egoId) ?? []) {
    const childNode = nodeMap.get(cid)
    if (!childNode) continue
    const childGender = (childNode.gender ?? '').toUpperCase()
    descQueue.push({
      id: cid,
      steps: 1,
      maternalDescendant: childGender === 'FEMALE' || childGender === 'F',
      pathIds: [egoId, cid],
    })
  }
  while (descQueue.length > 0) {
    const curr = descQueue.shift()!
    if (result.has(curr.id)) continue
    const person = nodeMap.get(curr.id)
    if (!person) continue
    const g = (person.gender ?? '').toUpperCase()
    const { steps, maternalDescendant, pathIds } = curr
    const descPrefix = steps >= 2 && maternalDescendant ? '외' : ''
    let title = ''
    let genLabel: string | null = null

    if (steps === 1) {
      title = g === 'MALE' ? '아들' : g === 'FEMALE' ? '딸' : '자녀'
    } else if (steps === 2) {
      title =
        g === 'MALE'
          ? `${descPrefix}손자`
          : g === 'FEMALE'
            ? `${descPrefix}손녀`
            : `${descPrefix}손자녀`
      genLabel = '2대손'
    } else if (steps === 3) {
      title =
        g === 'MALE'
          ? `${descPrefix}증손자`
          : g === 'FEMALE'
            ? `${descPrefix}증손녀`
            : `${descPrefix}증손`
      genLabel = '3대손'
    } else if (steps === 4) {
      title =
        g === 'MALE'
          ? `${descPrefix}고손자`
          : g === 'FEMALE'
            ? `${descPrefix}고손녀`
            : `${descPrefix}고손`
      genLabel = '4대손'
    } else {
      title = `${descPrefix}${steps}대손`
      genLabel = `${steps}대손`
    }

    result.set(curr.id, {
      title,
      chon: steps,
      generationLabel: genLabel,
      summary: genLabel ? `${title} (${genLabel} · ${steps}촌)` : `${title} (${steps}촌)`,
      pathNodeIds: pathIds,
      pathSummary: formatPathSummary(pathIds),
    })

    for (const cid of childrenOf.get(curr.id) ?? []) {
      if (nodeMap.has(cid)) {
        descQueue.push({
          id: cid,
          steps: curr.steps + 1,
          maternalDescendant,
          pathIds: [...pathIds, cid],
        })
      }
    }
  }

  // 4. 임의 노드의 조상 거리 + 경로 맵 헬퍼 (본인=0 포함, [startId, ..., ancId])
  const getAncestorsWithPath = (
    startId: string,
  ): Map<string, { d: number; pathFromStart: string[] }> => {
    const map = new Map<string, { d: number; pathFromStart: string[] }>([
      [startId, { d: 0, pathFromStart: [startId] }],
    ])
    const q: Array<{ id: string; d: number; path: string[] }> = [
      { id: startId, d: 0, path: [startId] },
    ]
    while (q.length > 0) {
      const { id, d, path } = q.shift()!
      if (d >= 8) continue
      const p = parentsOf.get(id)
      for (const pid of [p?.fatherId, p?.motherId]) {
        if (pid && !map.has(pid)) {
          const nextPath = [...path, pid]
          map.set(pid, { d: d + 1, pathFromStart: nextPath })
          q.push({ id: pid, d: d + 1, path: nextPath })
        }
      }
    }
    return map
  }

  // egoAncestors에는 nodeMap 밖의 부모 ID가 빠질 수 있으므로 부모 ID 자체도 포함
  const egoAncAll = getAncestorsWithPath(egoId)

  // 5. 방계 혈족 (LCA 탐색)
  for (const person of familyTreeData.nodes) {
    if (result.has(person.id)) continue
    const targetAnc = getAncestorsWithPath(person.id)
    let bestU = Infinity
    let bestD = Infinity
    let bestLcaId: string | null = null
    let bestEgoToLca: string[] = []
    let bestTargetToLca: string[] = []

    for (const [ancId, targetInfo] of targetAnc) {
      const egoInfo = egoAncAll.get(ancId)
      if (egoInfo !== undefined && egoInfo.d > 0 && targetInfo.d > 0) {
        if (egoInfo.d + targetInfo.d < bestU + bestD) {
          bestU = egoInfo.d
          bestD = targetInfo.d
          bestLcaId = ancId
          bestEgoToLca = egoInfo.pathFromStart
          bestTargetToLca = targetInfo.pathFromStart
        }
      }
    }

    if (bestLcaId != null && Number.isFinite(bestU + bestD)) {
      const chon = bestU + bestD
      const g = (person.gender ?? '').toUpperCase()
      const lcaTrace = egoAncestors.get(bestLcaId)
      const side: 'paternal' | 'maternal' =
        bestLcaId === egoParents.motherId || lcaTrace?.side === 'maternal'
          ? 'maternal'
          : 'paternal'

      // ego → ... → LCA → ... → target 경로 조합
      const downFromLca = [...bestTargetToLca].reverse().slice(1)
      const pathIds = [...bestEgoToLca, ...downFromLca]

      let title = ''
      if (bestU === 1 && bestD === 1) {
        // 형제자매 (2촌)
        const targetParents = parentsOf.get(person.id) ?? { fatherId: null, motherId: null }
        const { kinship } = classifySiblingKinship(egoParents, targetParents)
        if (kinship === 'FULL') title = '친형제'
        else if (kinship === 'PATERNAL_HALF') title = '이복형제'
        else if (kinship === 'MATERNAL_HALF') title = '이부형제'
        else title = '형제자매'
      } else if (bestU === 1 && bestD === 2) {
        title = g === 'FEMALE' ? '조카 (질녀)' : '조카'
      } else if (bestU === 1 && bestD >= 3) {
        title = bestD === 3 ? '종손 (조카손자)' : '방계 후손'
      } else if (bestU === 2 && bestD === 1) {
        // 백부·숙부·고모 / 외숙부·이모 (3촌)
        if (side === 'paternal') {
          if (g === 'FEMALE') {
            title = '고모'
          } else if (g === 'MALE') {
            const fatherNode = egoParents.fatherId ? nodeMap.get(egoParents.fatherId) : null
            const seniority = fatherNode ? compareSiblingSeniority(person, fatherNode) : null
            if (seniority != null && seniority !== 0) {
              title = seniority < 0 ? '백부 (큰아버지)' : '숙부 (작은아버지)'
            } else {
              title = '백부·숙부 (삼촌)'
            }
          } else {
            title = '친가 삼촌·고모'
          }
        } else {
          if (g === 'FEMALE') title = '이모'
          else if (g === 'MALE') title = '외숙부 (외삼촌)'
          else title = '외가 삼촌·이모'
        }
      } else if (bestU === 2 && bestD === 2) {
        // 사촌 (4촌) — LCA 바로 아래의 부모(삼촌/고모/외삼촌/이모) 성별로 종/고종/외종/이종 구분
        const auntOrUncleId = downFromLca[0]
        const auntOrUncle = auntOrUncleId ? nodeMap.get(auntOrUncleId) : null
        const auGender = (auntOrUncle?.gender ?? '').toUpperCase()
        if (side === 'paternal') {
          title = auGender === 'FEMALE' ? '고종사촌' : '종형제 (친사촌)'
        } else {
          if (auGender === 'FEMALE') title = '이종사촌'
          else if (auGender === 'MALE') title = '외종사촌'
          else title = '외사촌·이종사촌'
        }
      } else if (bestU === 3 && bestD === 1) {
        if (side === 'paternal') {
          title = g === 'FEMALE' ? '대고모' : g === 'MALE' ? '종조부' : '종조부모'
        } else {
          title = '외종조부모'
        }
      } else {
        title = `${side === 'maternal' ? '외가 ' : '친가 '}방계 혈족`
      }

      result.set(person.id, {
        title,
        chon,
        summary: `${title} (${chon}촌)`,
        pathNodeIds: pathIds,
        pathSummary: formatPathSummary(pathIds),
      })
    }
  }

  // 6. 입양(양가) 계보 보강 — 양부·양모·양조부모(다세대) 및 양자·양녀·양손자·양증손자(다세대) 호칭 부여
  // 인척(Section 7) 분류 이전에 수행해야 양자녀·양손자녀의 배우자(며느리·사위·손자부·손서)도 정확히 도출되며,
  // 이미 생물학적 방계 혈족(예: 백부/숙부·조카·종손)으로 분류된 경우 양부모·양자녀 관계를 병기한다.
  const applyAdoptiveKinship = (
    targetId: string | null | undefined,
    adoptTitle: string,
    pathIds: string[],
    chon: number = 1,
    generationLabel?: string,
  ) => {
    if (!targetId || targetId === egoId || !nodeMap.has(targetId)) return
    const existing = result.get(targetId)
    if (existing) {
      // 친족 간 출계 입양(예: 백부·숙부 입양)에서 양부의 부모는 곧 본인의 친조부모(egoAncestors)이므로,
      // 이미 동일 계열의 친생 직계 존속(예: '조부' vs '양조부', '증조부' vs '양증조부')인 경우
      // '양조부 · 조부'로 중복 오염시키지 않고 본생 직계 존속 호칭을 그대로 유지한다.
      if (
        egoAncestors.has(targetId) &&
        adoptTitle.startsWith('양') &&
        existing.title === adoptTitle.slice(1)
      ) {
        return
      }
      if (!existing.title.includes(adoptTitle)) {
        const bioCloserOrEqual = existing.chon != null && existing.chon <= chon
        const mergedTitle = bioCloserOrEqual
          ? `${existing.title} · ${adoptTitle}`
          : `${adoptTitle} · ${existing.title}`
        const nextGenLabel = existing.generationLabel ?? generationLabel ?? null
        result.set(targetId, {
          ...existing,
          title: mergedTitle,
          generationLabel: nextGenLabel,
          summary:
            existing.chon != null && existing.chon !== chon
              ? bioCloserOrEqual
                ? `${mergedTitle} (본생 ${existing.chon}촌 · 입양 ${chon}촌)`
                : `${mergedTitle} (입양 ${chon}촌 · 본생 ${existing.chon}촌)`
              : existing.chon != null
                ? `${mergedTitle} (${existing.chon}촌)`
                : mergedTitle,
        })
      }
      return
    }
    const summaryLabel = generationLabel
      ? `${adoptTitle} (입양 ${generationLabel} · ${chon}촌)`
      : `${adoptTitle} (입양·출계 · ${chon}촌)`
    result.set(targetId, {
      title: adoptTitle,
      chon,
      generationLabel: generationLabel ?? null,
      summary: summaryLabel,
      pathNodeIds: pathIds,
      pathSummary: formatPathSummary(pathIds),
    })
  }

  // 6a. 다세대 양가 조상 BFS (양부·양모 → 양조부·양조모·양외조부·양외조모 → 양증조부·양고조부 등)
  const egoFks = siblingFksOf(egoId)
  const adoptAncQueue: Array<{
    id: string
    steps: number
    side: 'paternal' | 'maternal'
    slot: 'father' | 'mother'
    pathIds: string[]
  }> = []
  const visitedAdoptAnc = new Set<string>([egoId])
  if (
    egoFks.adoptiveFatherId &&
    egoFks.adoptiveFatherId !== egoFks.fatherId &&
    nodeMap.has(egoFks.adoptiveFatherId)
  ) {
    adoptAncQueue.push({
      id: egoFks.adoptiveFatherId,
      steps: 1,
      side: 'paternal',
      slot: 'father',
      pathIds: [egoId, egoFks.adoptiveFatherId],
    })
  }
  if (
    egoFks.adoptiveMotherId &&
    egoFks.adoptiveMotherId !== egoFks.motherId &&
    nodeMap.has(egoFks.adoptiveMotherId)
  ) {
    adoptAncQueue.push({
      id: egoFks.adoptiveMotherId,
      steps: 1,
      side: 'maternal',
      slot: 'mother',
      pathIds: [egoId, egoFks.adoptiveMotherId],
    })
  }
  // 친생 조상 중 입양된 조상의 양부모 가지도 탐색
  for (const [ancId, trace] of egoAncestors) {
    const ancNode = nodeMap.get(ancId)
    if (!ancNode || trace.steps >= 5) continue
    const ancFks = siblingFksOf(ancId)
    if (
      ancFks.adoptiveFatherId &&
      ancFks.adoptiveFatherId !== ancFks.fatherId &&
      nodeMap.has(ancFks.adoptiveFatherId)
    ) {
      adoptAncQueue.push({
        id: ancFks.adoptiveFatherId,
        steps: trace.steps + 1,
        side: trace.side,
        slot: 'father',
        pathIds: [...trace.pathIds, ancFks.adoptiveFatherId],
      })
    }
    if (
      ancFks.adoptiveMotherId &&
      ancFks.adoptiveMotherId !== ancFks.motherId &&
      nodeMap.has(ancFks.adoptiveMotherId)
    ) {
      adoptAncQueue.push({
        id: ancFks.adoptiveMotherId,
        steps: trace.steps + 1,
        side: trace.side,
        slot: 'mother',
        pathIds: [...trace.pathIds, ancFks.adoptiveMotherId],
      })
    }
  }
  while (adoptAncQueue.length > 0) {
    const curr = adoptAncQueue.shift()!
    if (visitedAdoptAnc.has(curr.id)) continue
    visitedAdoptAnc.add(curr.id)
    const ancPerson = nodeMap.get(curr.id)
    if (!ancPerson) continue
    const g = (ancPerson.gender ?? '').toUpperCase()
    const isMale = g === 'MALE' || (g !== 'FEMALE' && curr.slot === 'father')
    const prefix = curr.side === 'maternal' ? '양외' : '양'
    let adoptTitle = ''
    let genLabel: string | undefined
    if (curr.steps === 1) {
      adoptTitle = isMale ? '양부' : '양모'
    } else if (curr.steps === 2) {
      adoptTitle = isMale ? `${prefix}조부` : `${prefix}조모`
      genLabel = '2대조'
    } else if (curr.steps === 3) {
      adoptTitle = isMale ? `${prefix}증조부` : `${prefix}증조모`
      genLabel = '3대조'
    } else if (curr.steps === 4) {
      adoptTitle = isMale ? `${prefix}고조부` : `${prefix}고조모`
      genLabel = '4대조'
    } else {
      adoptTitle = `${prefix}${curr.steps}대조`
      genLabel = `${curr.steps}대조`
    }
    applyAdoptiveKinship(curr.id, adoptTitle, curr.pathIds, curr.steps, genLabel)

    if (curr.steps < 6) {
      const currFks = siblingFksOf(curr.id)
      for (const nextFatherId of [currFks.adoptiveFatherId, currFks.fatherId]) {
        if (nextFatherId && !visitedAdoptAnc.has(nextFatherId) && nodeMap.has(nextFatherId)) {
          adoptAncQueue.push({
            id: nextFatherId,
            steps: curr.steps + 1,
            side: curr.side,
            slot: 'father',
            pathIds: [...curr.pathIds, nextFatherId],
          })
        }
      }
      for (const nextMotherId of [currFks.adoptiveMotherId, currFks.motherId]) {
        if (nextMotherId && !visitedAdoptAnc.has(nextMotherId) && nodeMap.has(nextMotherId)) {
          adoptAncQueue.push({
            id: nextMotherId,
            steps: curr.steps + 1,
            side: curr.side,
            slot: 'mother',
            pathIds: [...curr.pathIds, nextMotherId],
          })
        }
      }
    }
  }

  // 6b. 입양(양가) 형제 및 다세대 입양 후손(양자·양녀 → 양손자·양손녀 → 양증손자·양고손자 등) BFS
  const adoptChildrenOf = new Map<string, string[]>()
  const allParentIdsOf = (p: FamilyTreePerson): string[] => {
    const fks = siblingFksOf(p.id)
    return [
      fks.adoptiveFatherId,
      fks.adoptiveMotherId,
      fks.fatherId,
      fks.motherId,
    ].filter((v): v is string => Boolean(v))
  }
  const egoAllParentIds = allParentIdsOf(ego)
  const adoptiveSiblingIds: string[] = []
  for (const n of familyTreeData.nodes) {
    const nFks = siblingFksOf(n.id)
    if (n.id !== egoId && classifySiblingKinship(egoFks, nFks).kinship === 'ADOPTIVE') {
      const nParents = allParentIdsOf(n)
      const sharedPid = egoAllParentIds.find((pid) => nParents.includes(pid))
      const sibPath =
        sharedPid && nodeMap.has(sharedPid)
          ? [egoId, sharedPid, n.id]
          : [egoId, n.id]
      applyAdoptiveKinship(n.id, '입양형제', sibPath, 2)
      adoptiveSiblingIds.push(n.id)
    }
    for (const apId of [nFks.adoptiveFatherId, nFks.adoptiveMotherId]) {
      if (!apId || apId === nFks.fatherId || apId === nFks.motherId) continue
      const list = adoptChildrenOf.get(apId) ?? []
      if (!list.includes(n.id)) list.push(n.id)
      adoptChildrenOf.set(apId, list)
    }
  }
  for (const e of familyTreeData.edges ?? []) {
    if (e.type === 'parent-child' && e.lineage === 'adoptive') {
      const list = adoptChildrenOf.get(e.source) ?? []
      if (!list.includes(e.target)) list.push(e.target)
      adoptChildrenOf.set(e.source, list)
    }
  }

  const adoptDescQueue: Array<{
    id: string
    steps: number
    hasAdoptiveStep: boolean
    pathIds: string[]
  }> = [{ id: egoId, steps: 0, hasAdoptiveStep: false, pathIds: [egoId] }]
  const visitedAdoptDesc = new Set<string>([`${egoId}:false`])

  while (adoptDescQueue.length > 0) {
    const curr = adoptDescQueue.shift()!
    if (curr.steps >= 1 && curr.hasAdoptiveStep) {
      const descPerson = nodeMap.get(curr.id)
      if (descPerson) {
        const g = (descPerson.gender ?? '').toUpperCase()
        let adoptDescTitle = ''
        let genLabel: string | undefined
        if (curr.steps === 1) {
          adoptDescTitle = g === 'MALE' ? '양자' : g === 'FEMALE' ? '양녀' : '양자녀'
        } else if (curr.steps === 2) {
          adoptDescTitle = g === 'MALE' ? '양손자' : g === 'FEMALE' ? '양손녀' : '양손자녀'
          genLabel = '2대손'
        } else if (curr.steps === 3) {
          adoptDescTitle = g === 'MALE' ? '양증손자' : g === 'FEMALE' ? '양증손녀' : '양증손'
          genLabel = '3대손'
        } else if (curr.steps === 4) {
          adoptDescTitle = g === 'MALE' ? '양고손자' : g === 'FEMALE' ? '양고손녀' : '양고손'
          genLabel = '4대손'
        } else {
          adoptDescTitle = `양${curr.steps}대손`
          genLabel = `${curr.steps}대손`
        }
        applyAdoptiveKinship(curr.id, adoptDescTitle, curr.pathIds, curr.steps, genLabel)
      }
    }
    if (curr.steps >= 6) continue

    const bioKids = childrenOf.get(curr.id) ?? []
    for (const cid of bioKids) {
      const stateKey = `${cid}:${curr.hasAdoptiveStep}`
      if (!visitedAdoptDesc.has(stateKey) && !curr.pathIds.includes(cid) && nodeMap.has(cid)) {
        visitedAdoptDesc.add(stateKey)
        adoptDescQueue.push({
          id: cid,
          steps: curr.steps + 1,
          hasAdoptiveStep: curr.hasAdoptiveStep,
          pathIds: [...curr.pathIds, cid],
        })
      }
    }
    const adoptKids = adoptChildrenOf.get(curr.id) ?? []
    for (const cid of adoptKids) {
      const stateKey = `${cid}:true`
      if (!visitedAdoptDesc.has(stateKey) && !curr.pathIds.includes(cid) && nodeMap.has(cid)) {
        visitedAdoptDesc.add(stateKey)
        adoptDescQueue.push({
          id: cid,
          steps: curr.steps + 1,
          hasAdoptiveStep: true,
          pathIds: [...curr.pathIds, cid],
        })
      }
    }
  }

  // 6c. 입양 방계 친족 (양조카 3촌, 양백부·양숙부·양고모·양외숙부·양이모 3촌, 양사촌 4촌)
  // 1) 입양형제의 자녀(친자녀·양자녀) 및 친형제의 양자녀 → 양조카 (3촌)
  for (const n of familyTreeData.nodes) {
    const sibKin = result.get(n.id)
    if (!sibKin || sibKin.chon !== 2 || sibKin.generationLabel) continue
    const isAdoptSib =
      adoptiveSiblingIds.includes(n.id) || sibKin.title.includes('입양형제')
    const bioKids = childrenOf.get(n.id) ?? []
    const adoptKids = adoptChildrenOf.get(n.id) ?? []
    const targetKids = isAdoptSib
      ? [...new Set([...bioKids, ...adoptKids])]
      : adoptKids
    for (const cid of targetKids) {
      if (cid === egoId || result.has(cid) || !nodeMap.has(cid)) continue
      const cNode = nodeMap.get(cid)
      const cg = (cNode?.gender ?? '').toUpperCase()
      const title = cg === 'FEMALE' ? '양조카 (양질녀)' : '양조카'
      const basePath = sibKin.pathNodeIds ?? [egoId, n.id]
      applyAdoptiveKinship(cid, title, [...basePath, cid], 3)
    }
  }

  // 2) 양부·양모의 형제자매(양삼촌·양고모·양외삼촌·양이모, 3촌) 및 그 자녀(양사촌, 4촌)
  for (const [side, apId] of [
    ['paternal', egoFks.adoptiveFatherId],
    ['maternal', egoFks.adoptiveMotherId],
  ] as const) {
    if (!apId || !nodeMap.has(apId)) continue
    if (side === 'paternal' && apId === egoParents.fatherId) continue
    if (side === 'maternal' && apId === egoParents.motherId) continue
    const apNode = nodeMap.get(apId)!
    const apParents = allParentIdsOf(apNode)
    const apFks = siblingFksOf(apId)

    for (const auNode of familyTreeData.nodes) {
      if (auNode.id === apId || auNode.id === egoId) continue
      const sibCheck = classifySiblingKinship(apFks, siblingFksOf(auNode.id))
      if (sibCheck.sharedAxis === 'none') continue
      const auParents = allParentIdsOf(auNode)
      const sharedGpId = apParents.find((pid) => auParents.includes(pid))
      const auPath =
        sharedGpId && nodeMap.has(sharedGpId)
          ? [egoId, apId, sharedGpId, auNode.id]
          : [egoId, apId, auNode.id]
      const aug = (auNode.gender ?? '').toUpperCase()

      if (!result.has(auNode.id)) {
        let auTitle = ''
        if (side === 'paternal') {
          if (aug === 'FEMALE') {
            auTitle = '양고모'
          } else if (aug === 'MALE') {
            const seniority = compareSiblingSeniority(auNode, apNode)
            if (seniority != null && seniority !== 0) {
              auTitle = seniority < 0 ? '양백부 (큰아버지)' : '양숙부 (작은아버지)'
            } else {
              auTitle = '양백부·숙부 (양삼촌)'
            }
          } else {
            auTitle = '양가 삼촌·고모'
          }
        } else {
          if (aug === 'FEMALE') auTitle = '양이모'
          else if (aug === 'MALE') auTitle = '양외숙부 (외삼촌)'
          else auTitle = '양외가 삼촌·이모'
        }
        applyAdoptiveKinship(auNode.id, auTitle, auPath, 3)
      }

      const cousinIds = [
        ...new Set([
          ...(childrenOf.get(auNode.id) ?? []),
          ...(adoptChildrenOf.get(auNode.id) ?? []),
        ]),
      ]
      for (const cid of cousinIds) {
        if (cid === egoId || result.has(cid) || !nodeMap.has(cid)) continue
        let cTitle = ''
        if (side === 'paternal') {
          cTitle = aug === 'FEMALE' ? '양고종사촌' : '양종형제 (양친사촌)'
        } else {
          if (aug === 'FEMALE') cTitle = '양이종사촌'
          else if (aug === 'MALE') cTitle = '양외종사촌'
          else cTitle = '양외사촌·이종사촌'
        }
        applyAdoptiveKinship(cid, cTitle, [...auPath, cid], 4)
      }
    }
  }

  // 7. 인척 (배우자·처가·시가·혈족 및 양가 친족의 배우자)
  // 7a. 본인 배우자
  for (const sp of spousesOf.get(egoId) ?? []) {
    if (result.has(sp.partnerId)) continue
    const partnerNode = nodeMap.get(sp.partnerId)
    const rankLabel = resolvePerspectiveMarriageRankLabel({
      marriageRank: sp.marriageRank,
      rankHolderId: sp.rankHolderId,
      viewerPersonId: egoId,
      viewerGender: ego.gender ?? null,
      spouseId: sp.partnerId,
      spouseGender: partnerNode?.gender ?? null,
    })
    const title = rankLabel ? `배우자 · ${rankLabel}` : '배우자'
    const pathIds = [egoId, sp.partnerId]
    result.set(sp.partnerId, {
      title,
      chon: null,
      summary: title,
      pathNodeIds: pathIds,
      pathSummary: formatPathSummary(pathIds),
    })
  }

  // 7b. 아버지/어머니의 다른 배우자 (서모·계모 / 계부)
  if (egoParents.fatherId) {
    const fatherNode = nodeMap.get(egoParents.fatherId)
    for (const sp of spousesOf.get(egoParents.fatherId) ?? []) {
      if (result.has(sp.partnerId)) continue
      const partnerNode = nodeMap.get(sp.partnerId)
      const rankLabel = resolvePerspectiveMarriageRankLabel({
        marriageRank: sp.marriageRank,
        rankHolderId: sp.rankHolderId,
        viewerPersonId: egoParents.fatherId,
        viewerGender: fatherNode?.gender ?? null,
        spouseId: sp.partnerId,
        spouseGender: partnerNode?.gender ?? null,
      })
      const title = rankLabel ? `부친의 배우자 (${rankLabel})` : '계모·서모 (부친의 배우자)'
      const pathIds = [egoId, egoParents.fatherId, sp.partnerId]
      result.set(sp.partnerId, {
        title,
        chon: null,
        summary: title,
        pathNodeIds: pathIds,
        pathSummary: formatPathSummary(pathIds),
      })
    }
  }
  if (egoParents.motherId) {
    for (const sp of spousesOf.get(egoParents.motherId) ?? []) {
      if (result.has(sp.partnerId)) continue
      const title = '계부 (모친의 배우자)'
      const pathIds = [egoId, egoParents.motherId, sp.partnerId]
      result.set(sp.partnerId, {
        title,
        chon: null,
        summary: title,
        pathNodeIds: pathIds,
        pathSummary: formatPathSummary(pathIds),
      })
    }
  }
  if (egoFks.adoptiveFatherId && egoFks.adoptiveFatherId !== egoParents.fatherId) {
    const adoptFatherNode = nodeMap.get(egoFks.adoptiveFatherId)
    for (const sp of spousesOf.get(egoFks.adoptiveFatherId) ?? []) {
      if (result.has(sp.partnerId)) continue
      const partnerNode = nodeMap.get(sp.partnerId)
      const rankLabel = resolvePerspectiveMarriageRankLabel({
        marriageRank: sp.marriageRank,
        rankHolderId: sp.rankHolderId,
        viewerPersonId: egoFks.adoptiveFatherId,
        viewerGender: adoptFatherNode?.gender ?? null,
        spouseId: sp.partnerId,
        spouseGender: partnerNode?.gender ?? null,
      })
      const title = rankLabel ? `양부의 배우자 (${rankLabel})` : '양부의 배우자'
      const pathIds = [egoId, egoFks.adoptiveFatherId, sp.partnerId]
      result.set(sp.partnerId, {
        title,
        chon: null,
        summary: title,
        pathNodeIds: pathIds,
        pathSummary: formatPathSummary(pathIds),
      })
    }
  }
  if (egoFks.adoptiveMotherId && egoFks.adoptiveMotherId !== egoParents.motherId) {
    for (const sp of spousesOf.get(egoFks.adoptiveMotherId) ?? []) {
      if (result.has(sp.partnerId)) continue
      const title = '양모의 배우자'
      const pathIds = [egoId, egoFks.adoptiveMotherId, sp.partnerId]
      result.set(sp.partnerId, {
        title,
        chon: null,
        summary: title,
        pathNodeIds: pathIds,
        pathSummary: formatPathSummary(pathIds),
      })
    }
  }

  // 7c. 본인 배우자의 부모 (장인·장모 / 시부모)
  for (const sp of spousesOf.get(egoId) ?? []) {
    const spFks = siblingFksOf(sp.partnerId)
    for (const [slot, pid] of [
      ['father', spFks.fatherId ?? spFks.adoptiveFatherId],
      ['mother', spFks.motherId ?? spFks.adoptiveMotherId],
    ] as const) {
      if (!pid || result.has(pid) || !nodeMap.has(pid)) continue
      const title =
        slot === 'father' ? '배우자의 아버지 (장인·시부)' : '배우자의 어머니 (장모·시모)'
      const pathIds = [egoId, sp.partnerId, pid]
      result.set(pid, {
        title,
        chon: null,
        summary: title,
        pathNodeIds: pathIds,
        pathSummary: formatPathSummary(pathIds),
      })
    }
  }

  // 7d. 기타 이미 분류된 혈족·양가 친족의 배우자 (며느리·사위·손자부·손서·형수·제수·매부·숙모 등)
  for (const person of familyTreeData.nodes) {
    if (result.has(person.id)) continue
    const g = (person.gender ?? '').toUpperCase()
    const partners = spousesOf.get(person.id) ?? []
    for (const sp of partners) {
      const partnerKin = result.get(sp.partnerId)
      if (!partnerKin || partnerKin.chon == null) continue
      const partnerNode = nodeMap.get(sp.partnerId)
      const partnerGender = (partnerNode?.gender ?? '').toUpperCase()
      let title = `${partnerKin.title}의 배우자`
      const isDirectOrAdoptedChild =
        (partnerKin.chon === 1 &&
          (partnerKin.title === '아들' ||
            partnerKin.title === '딸' ||
            partnerKin.title === '자녀')) ||
        partnerKin.title === '양자' ||
        partnerKin.title === '양녀' ||
        partnerKin.title === '양자녀' ||
        partnerKin.title.startsWith('양자 ·') ||
        partnerKin.title.startsWith('양녀 ·') ||
        partnerKin.title.startsWith('양자녀 ·')
      if (isDirectOrAdoptedChild) {
        title =
          g === 'FEMALE' ? '자부 (며느리)' : g === 'MALE' ? '사위 (부마)' : '자녀의 배우자'
      } else if (partnerKin.generationLabel === '2대손') {
        title =
          g === 'FEMALE'
            ? '손자부 (손자며느리)'
            : g === 'MALE'
              ? '손서 (손자사위)'
              : '손자녀의 배우자'
      } else if (partnerKin.generationLabel === '3대손') {
        title =
          g === 'FEMALE'
            ? '증손부 (증손자며느리)'
            : g === 'MALE'
              ? '증손서 (증손자사위)'
              : '증손자녀의 배우자'
      } else if (
        (partnerKin.chon === 2 && !partnerKin.generationLabel) ||
        partnerKin.title.startsWith('입양형제')
      ) {
        // 형제자매의 배우자
        if (g === 'FEMALE' && partnerGender === 'MALE') {
          const seniority = partnerNode ? compareSiblingSeniority(partnerNode, ego) : null
          if (seniority != null && seniority !== 0) {
            title =
              seniority < 0
                ? '형수·올케 (손위 형제의 배우자)'
                : '제수·올케 (아우의 배우자)'
          } else {
            title = '형수·제수 (형제의 배우자)'
          }
        } else if (g === 'MALE' && partnerGender === 'FEMALE') {
          title = '매부·제부 (자매의 배우자)'
        }
      } else if (partnerKin.chon === 3 && partnerKin.title.startsWith('백부')) {
        title = '백모 (큰어머니)'
      } else if (partnerKin.chon === 3 && partnerKin.title.startsWith('숙부')) {
        title = '숙모 (작은어머니)'
      } else if (partnerKin.chon === 3 && partnerKin.title === '고모') {
        title = '고모부'
      } else if (partnerKin.chon === 3 && partnerKin.title === '이모') {
        title = '이모부'
      } else if (partnerKin.chon === 3 && partnerKin.title.startsWith('외숙부')) {
        title = '외숙모'
      } else if (partnerKin.chon === 3 && partnerKin.title.startsWith('양백부')) {
        title = '양백모 (큰어머니)'
      } else if (partnerKin.chon === 3 && partnerKin.title.startsWith('양숙부')) {
        title = '양숙모 (작은어머니)'
      } else if (partnerKin.chon === 3 && partnerKin.title === '양고모') {
        title = '양고모부'
      } else if (partnerKin.chon === 3 && partnerKin.title === '양이모') {
        title = '양이모부'
      } else if (partnerKin.chon === 3 && partnerKin.title.startsWith('양외숙부')) {
        title = '양외숙모'
      }
      const pathIds = [...(partnerKin.pathNodeIds ?? [egoId, sp.partnerId]), person.id]
      result.set(person.id, {
        title,
        chon: null,
        summary: title,
        pathNodeIds: pathIds,
        pathSummary: formatPathSummary(pathIds),
      })
      break
    }
  }

  return result
}
