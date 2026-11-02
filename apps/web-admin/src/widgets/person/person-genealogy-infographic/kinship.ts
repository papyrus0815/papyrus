import type { FamilyTreeData, FamilyTreePerson } from '@/shared/api/persons-family-tree'
import { MARRIAGE_RANK_LABELS } from '@/shared/lib/marriage-rank-labels'

import { classifySiblingKinship, ftResolveParentIds } from './family-tree-derive'
import { compareSiblings } from './utils'

export interface KinshipInfo {
  /** 한국어 친족 호칭 (예: '아버지', '조부', '백부 (큰아버지)', '이복형제', '조카') */
  title: string
  /** 혈족 촌수 (본인=0, 직계·방계 혈족=1 이상 정수, 배우자·인척=null) */
  chon: number | null
  /** 직계 세대 라벨 (예: '2대조', '3대손') */
  generationLabel?: string | null
  /** 카드·툴팁·상세 패널에 표시할 통합 문자열 */
  summary: string
}

/**
 * FamilyTreeData 그래프에서 기준 인물(egoId) 대비 모든 노드의 한국어 친족 호칭·촌수를 계산한다.
 * - 직계 존속 (부모·조부모·증조부모·고조부모·N대조)
 * - 직계 비속 (자녀·손자녀·증손·고손·N대손)
 * - 방계 혈족 (동복/이복/이부형제 2촌, 백부/숙부/고모/외숙부/이모/조카 3촌, 종조부/대고모/사촌 4촌 등 LCA 기반 촌수)
 * - 인척 (본인 배우자 및 정실/후궁 구분, 계모/서모, 며느리/사위, 장인/장모·시부모 등)
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

  const pcEdges = (familyTreeData.edges ?? []).filter((e) => e.type === 'parent-child')
  const spouseEdges = (familyTreeData.edges ?? []).filter((e) => e.type === 'spouse')

  const rawParentsOf = new Map<string, string[]>()
  for (const e of pcEdges) {
    const list = rawParentsOf.get(e.target) ?? []
    if (!list.includes(e.source)) list.push(e.source)
    rawParentsOf.set(e.target, list)
  }

  const parentsOf = new Map<string, { fatherId: string | null; motherId: string | null }>()
  const childrenOf = new Map<string, string[]>()
  for (const n of familyTreeData.nodes) {
    const resolved = ftResolveParentIds(n.id, rawParentsOf, nodeMap)
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
  }

  const spousesOf = new Map<
    string,
    Array<{ partnerId: string; marriageRank: string | null }>
  >()
  for (const e of spouseEdges) {
    const listA = spousesOf.get(e.source) ?? []
    listA.push({ partnerId: e.target, marriageRank: e.marriageRank ?? null })
    spousesOf.set(e.source, listA)

    const listB = spousesOf.get(e.target) ?? []
    listB.push({ partnerId: e.source, marriageRank: e.marriageRank ?? null })
    spousesOf.set(e.target, listB)
  }

  // 1. 본인
  result.set(egoId, {
    title: '본인',
    chon: 0,
    summary: '본인 (기준 인물)',
  })

  // 2. ego의 모든 직계 조상 탐색 (upSteps, side: 'paternal' | 'maternal')
  type AncestorTrace = {
    steps: number
    side: 'paternal' | 'maternal'
  }
  const egoAncestors = new Map<string, AncestorTrace>()
  const egoParents = parentsOf.get(egoId) ?? { fatherId: null, motherId: null }

  const ancQueue: Array<{ id: string; steps: number; side: 'paternal' | 'maternal' }> = []
  if (egoParents.fatherId && nodeMap.has(egoParents.fatherId)) {
    ancQueue.push({ id: egoParents.fatherId, steps: 1, side: 'paternal' })
  }
  if (egoParents.motherId && nodeMap.has(egoParents.motherId)) {
    ancQueue.push({ id: egoParents.motherId, steps: 1, side: 'maternal' })
  }

  while (ancQueue.length > 0) {
    const curr = ancQueue.shift()!
    const existing = egoAncestors.get(curr.id)
    if (existing && existing.steps <= curr.steps) continue
    egoAncestors.set(curr.id, { steps: curr.steps, side: curr.side })

    const p = parentsOf.get(curr.id)
    if (p?.fatherId && nodeMap.has(p.fatherId)) {
      ancQueue.push({ id: p.fatherId, steps: curr.steps + 1, side: curr.side })
    }
    if (p?.motherId && nodeMap.has(p.motherId)) {
      ancQueue.push({ id: p.motherId, steps: curr.steps + 1, side: curr.side })
    }
  }

  for (const [ancId, trace] of egoAncestors) {
    const person = nodeMap.get(ancId)
    if (!person) continue
    const g = (person.gender ?? '').toUpperCase()
    const { steps, side } = trace
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
    })
  }

  // 3. ego의 모든 직계 후손 탐색 (downSteps)
  const descQueue: Array<{ id: string; steps: number }> = []
  for (const cid of childrenOf.get(egoId) ?? []) {
    if (nodeMap.has(cid)) descQueue.push({ id: cid, steps: 1 })
  }
  while (descQueue.length > 0) {
    const curr = descQueue.shift()!
    if (result.has(curr.id)) continue
    const person = nodeMap.get(curr.id)
    if (!person) continue
    const g = (person.gender ?? '').toUpperCase()
    const { steps } = curr
    let title = ''
    let genLabel: string | null = null

    if (steps === 1) {
      title = g === 'MALE' ? '아들' : g === 'FEMALE' ? '딸' : '자녀'
    } else if (steps === 2) {
      title = g === 'MALE' ? '손자' : g === 'FEMALE' ? '손녀' : '손자녀'
      genLabel = '2대손'
    } else if (steps === 3) {
      title = g === 'MALE' ? '증손자' : g === 'FEMALE' ? '증손녀' : '증손'
      genLabel = '3대손'
    } else if (steps === 4) {
      title = g === 'MALE' ? '고손자' : g === 'FEMALE' ? '고손녀' : '고손'
      genLabel = '4대손'
    } else {
      title = `${steps}대손`
      genLabel = `${steps}대손`
    }

    result.set(curr.id, {
      title,
      chon: steps,
      generationLabel: genLabel,
      summary: genLabel ? `${title} (${genLabel} · ${steps}촌)` : `${title} (${steps}촌)`,
    })

    for (const cid of childrenOf.get(curr.id) ?? []) {
      if (nodeMap.has(cid)) descQueue.push({ id: cid, steps: curr.steps + 1 })
    }
  }

  // 4. 임의 노드의 조상 거리 맵 헬퍼 (본인=0 포함)
  const getAncestorsWithSelf = (startId: string): Map<string, number> => {
    const map = new Map<string, number>([[startId, 0]])
    const q: Array<{ id: string; d: number }> = [{ id: startId, d: 0 }]
    while (q.length > 0) {
      const { id, d } = q.shift()!
      if (d >= 8) continue
      const p = parentsOf.get(id)
      for (const pid of [p?.fatherId, p?.motherId]) {
        if (pid && !map.has(pid)) {
          map.set(pid, d + 1)
          q.push({ id: pid, d: d + 1 })
        }
      }
    }
    return map
  }

  // egoAncestors에는 nodeMap 밖의 부모 ID가 빠질 수 있으므로 부모 ID 자체도 포함
  const egoAncAll = getAncestorsWithSelf(egoId)

  // 5. 방계 혈족 (LCA 탐색)
  for (const person of familyTreeData.nodes) {
    if (result.has(person.id)) continue
    const targetAnc = getAncestorsWithSelf(person.id)
    let bestU = Infinity
    let bestD = Infinity
    let bestLcaId: string | null = null

    for (const [ancId, dFromTarget] of targetAnc) {
      const uFromEgo = egoAncAll.get(ancId)
      if (uFromEgo !== undefined && uFromEgo > 0 && dFromTarget > 0) {
        if (uFromEgo + dFromTarget < bestU + bestD) {
          bestU = uFromEgo
          bestD = dFromTarget
          bestLcaId = ancId
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
            if (
              fatherNode &&
              (fatherNode.birthOrder != null || fatherNode.birthYear != null) &&
              (person.birthOrder != null || person.birthYear != null)
            ) {
              title =
                compareSiblings(person, fatherNode) < 0
                  ? '백부 (큰아버지)'
                  : '숙부 (작은아버지)'
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
        title = side === 'paternal' ? '종형제 (친사촌)' : '외사촌·이종사촌'
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
      })
    }
  }

  // 6. 인척 (배우자·처가·시가·혈족의 배우자)
  // 6a. 본인 배우자
  for (const sp of spousesOf.get(egoId) ?? []) {
    if (result.has(sp.partnerId)) continue
    const rankLabel = sp.marriageRank ? MARRIAGE_RANK_LABELS[sp.marriageRank] : null
    const title = rankLabel ? `배우자 · ${rankLabel}` : '배우자'
    result.set(sp.partnerId, {
      title,
      chon: null,
      summary: title,
    })
  }

  // 6b. 아버지/어머니의 다른 배우자 (서모·계모 / 계부)
  if (egoParents.fatherId) {
    for (const sp of spousesOf.get(egoParents.fatherId) ?? []) {
      if (result.has(sp.partnerId)) continue
      const rankLabel = sp.marriageRank ? MARRIAGE_RANK_LABELS[sp.marriageRank] : null
      const title = rankLabel ? `부친의 배우자 (${rankLabel})` : '계모·서모 (부친의 배우자)'
      result.set(sp.partnerId, { title, chon: null, summary: title })
    }
  }
  if (egoParents.motherId) {
    for (const sp of spousesOf.get(egoParents.motherId) ?? []) {
      if (result.has(sp.partnerId)) continue
      const title = '계부 (모친의 배우자)'
      result.set(sp.partnerId, { title, chon: null, summary: title })
    }
  }

  // 6c. 본인 배우자의 부모 (장인·장모 / 시부모)
  for (const sp of spousesOf.get(egoId) ?? []) {
    const spParents = parentsOf.get(sp.partnerId)
    for (const [slot, pid] of [
      ['father', spParents?.fatherId],
      ['mother', spParents?.motherId],
    ] as const) {
      if (!pid || result.has(pid) || !nodeMap.has(pid)) continue
      const title =
        slot === 'father' ? '배우자의 아버지 (장인·시부)' : '배우자의 어머니 (장모·시모)'
      result.set(pid, { title, chon: null, summary: title })
    }
  }

  // 6d. 기타 이미 분류된 혈족의 배우자 (며느리·사위·형수·제수·숙모 등)
  for (const person of familyTreeData.nodes) {
    if (result.has(person.id)) continue
    const g = (person.gender ?? '').toUpperCase()
    const partners = spousesOf.get(person.id) ?? []
    for (const sp of partners) {
      const partnerKin = result.get(sp.partnerId)
      if (!partnerKin || partnerKin.chon == null) continue
      let title = `${partnerKin.title}의 배우자`
      if (partnerKin.chon === 1 && (partnerKin.title === '아들' || partnerKin.title === '딸' || partnerKin.title === '자녀')) {
        title = g === 'FEMALE' ? '자부 (며느리)' : g === 'MALE' ? '사위 (부마)' : '자녀의 배우자'
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
      }
      result.set(person.id, { title, chon: null, summary: title })
      break
    }
  }

  return result
}
