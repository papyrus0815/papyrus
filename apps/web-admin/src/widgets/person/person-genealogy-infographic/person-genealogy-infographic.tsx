/**
 * 인물 상세 가계도 — 고조부모까지 n세대 + 부모 → 본인(+배우자+형제자매) → 자녀
 *
 * 모듈 구성:
 * - constants.ts        — 레이아웃 상수, scope→한국어 라벨
 * - types.ts            — NodePerson, ChildPerson, AvatarRole, FlagSource 등
 * - context.ts          — FamilyTreeLookupContext (BFS 응답 룩업)
 * - utils.ts            — yearOf/lifeSpan/isLeft 등 순수 유틸
 * - family-tree-derive.ts — BFS 응답 가공 (부모 슬롯, 라벨, NodePerson 변환)
 * - forks.tsx           — Fork* SVG 컴포넌트 모음
 * - card.tsx            — 모든 카드 컴포넌트 + 공용 styled (GeoNode, NodeBadge 등)
 * - ancestor-column.tsx — 조상 재귀 컬럼
 * - descendant-subtree.tsx — 손자녀+ 재귀 서브트리
 * - modals.tsx          — 형제자매 전체 보기 모달 2종
 *
 * 본 파일은 메인 컴포넌트와 ego 행/자녀 행/조상 fallback 등 오케스트레이션만 담당.
 */
import { useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { FiHeart, FiUsers } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import type { FamilyTreeData, FamilyTreePerson } from '@/shared/api/persons-family-tree'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

import { AncestorColumn } from './ancestor-column'
import {
  CardHoverInfo,
  ConsortMark,
  GeoNode,
  GeoThumbnail,
  NodeBadge,
  NodeNameBlock,
  NodePersonCompactCard,
  SiblingCompactNode,
} from './card'
import {
  ANC_PARENTS_GAP,
  CHILD_GAP,
  DESCENDANT_MAX_DEPTH,
  FT_MAX_DEPTH,
  GP_PAIR_GAP,
  GP_PAIR_W,
  NODE_H,
  NODE_W,
  SPOUSE_JOIN_MARGIN,
  SPOUSE_JOIN_W,
  SPOUSE_STACK_GAP,
  TRUNCATION_SCOPE_LABEL,
} from './constants'
import { FamilyTreeLookupContext } from './context'
import { DescendantSubtree } from './descendant-subtree'
import {
  classifySiblingKinship,
  ftPersonToNodePerson,
  ftResolveParentIds,
  siblingKinshipAriaLabel,
  siblingKinshipBadgeLabel,
  withParentNames,
  withSiblingKinshipMeta,
  type SiblingParentFks,
} from './family-tree-derive'
import {
  ForkFromOneParent,
  ForkFromTwoGrandparents,
  ForkFromTwoParents,
  ForkFromTwoParentsMeasured,
  ForkToChildren,
  SpouseStackJoin,
} from './forks'
import { AncestorSiblingsModal, SiblingsListModal } from './modals'
import type { ChildPerson, NodePerson } from './types'
import {
  ancestorColumnWidth,
  birthYearOf,
  childrenCenterShift,
  computeChildLayouts,
  isChildOnLeftInPair,
  isLeft,
  isRight,
} from './utils'

export interface PersonGenealogyInfographicProps {
  ego: NodePerson
  paternalGrandfather?: NodePerson | null
  paternalGrandmother?: NodePerson | null
  maternalGrandfather?: NodePerson | null
  maternalGrandmother?: NodePerson | null
  father?: NodePerson | null
  mother?: NodePerson | null
  spouses?: NodePerson[] | null
  /** @deprecated legacy 단수 배우자 — spouses 배열로 대체됨. 死코드지만 호스트 커밋 전까지 유지(G24 후속). */
  spouse?: NodePerson | null
  children?: ChildPerson[] | null
  siblings?: NodePerson[] | null
  /** FamilyTreeData를 주면 조부모 이상을 동적으로 표시 (n세대 재귀) */
  familyTreeData?: FamilyTreeData | null
  onPersonClick?: (personId: string) => void
  /**
   * 내부 '가계도' 헤더 표시 여부(기본 true). 호스트가 이미 자체 섹션 라벨을 그리는 경우
   * false로 꺼서 이중 헤더를 피한다(person-detail-panel의 '가족 관계' 라벨).
   */
  showHeader?: boolean
}

/** spouse 엣지에서 뽑은 배우자 노드 + provenance 메타 (inferred·혼인연도) */
type SpouseEdgeEntry = {
  node: FamilyTreePerson
  inferred: boolean
  marriageStartYear: number | null
  marriageEndYear: number | null
}

/**
 * 임베드 위젯이 렌더하지 않는 BFS scope — truncation 배너에서 제외한다.
 * 'spouse-children'(배우자의 다른 결혼 자녀)은 페치되지만 임베드는 그리지 않으므로,
 * 화면에 없는 그룹의 "일부만 표시" 유령 배너를 막는다.
 * 'sibling-other-parents'는 형제 툴팁의 부모 이름 해소용 보조 페치 — 카드 그룹이 아니다.
 */
const EMBED_UNRENDERED_SCOPES = new Set<string>(['spouse-children', 'sibling-other-parents'])

export function PersonGenealogyInfographic({
  ego,
  paternalGrandfather, paternalGrandmother,
  maternalGrandfather, maternalGrandmother,
  father, mother,
  spouses: spousesProp,
  spouse: spouseLegacy,
  children,
  siblings,
  familyTreeData,
  onPersonClick,
  showHeader = true,
}: PersonGenealogyInfographicProps) {
  // ── FamilyTreeData 기반 동적 조상 렌더링 준비 ──────────────────
  const ftNodeMap = useMemo(() => {
    if (!familyTreeData) return new Map<string, FamilyTreePerson>()
    const m = new Map<string, FamilyTreePerson>()
    for (const n of familyTreeData.nodes) m.set(n.id, n)
    return m
  }, [familyTreeData])

  const ftParentsOf = useMemo(() => {
    if (!familyTreeData) return new Map<string, string[]>()
    const m = new Map<string, string[]>()
    for (const e of familyTreeData.edges) {
      if (e.type === 'parent-child') {
        const arr = m.get(e.target) ?? []
        arr.push(e.source)
        m.set(e.target, arr)
      }
    }
    return m
  }, [familyTreeData])

  const { fatherId: ftFatherId, motherId: ftMotherId } = useMemo(
    () => familyTreeData
      ? ftResolveParentIds(familyTreeData.egoId, ftParentsOf, ftNodeMap)
      : {},
    [familyTreeData, ftParentsOf, ftNodeMap],
  )

  // ego 부/모 조상 컬럼의 실측 폭 — ParentsRow 레이아웃과 부모→ego fork 끝점 계산에 사용.
  // (부모는 depth 1: path 'F'/'M' 길이 1)
  const { ancFatherW, ancMotherW } = useMemo(
    () => ({
      ancFatherW: ftFatherId
        ? ancestorColumnWidth(ftFatherId, ftParentsOf, ftNodeMap, 1, FT_MAX_DEPTH, new Set())
        : 0,
      ancMotherW: ftMotherId
        ? ancestorColumnWidth(ftMotherId, ftParentsOf, ftNodeMap, 1, FT_MAX_DEPTH, new Set())
        : 0,
    }),
    [ftFatherId, ftMotherId, ftParentsOf, ftNodeMap],
  )

  // childrenOf 맵: parentId → grandchild ids (familyTreeData 기반)
  const ftChildrenOf = useMemo(() => {
    const m = new Map<string, string[]>()
    if (!familyTreeData) return m
    for (const e of familyTreeData.edges) {
      if (e.type === 'parent-child') {
        const arr = m.get(e.source) ?? []
        arr.push(e.target)
        m.set(e.source, arr)
      }
    }
    return m
  }, [familyTreeData])

  /**
   * 가계도 안 모든 인물 → 형제자매 노드 배열 (출생연도 오름차순).
   * 부모 한쪽이라도 공유하면 형제로 인정 (이복 형제 포함).
   * ego 본인은 결과에서 제외 (ego의 형제는 별도 SiblingsStack로 표시).
   */
  const siblingsByPersonId = useMemo(() => {
    const out = new Map<string, FamilyTreePerson[]>()
    if (!familyTreeData) return out
    for (const node of familyTreeData.nodes) {
      const parents = ftParentsOf.get(node.id) ?? []
      if (parents.length === 0) continue
      const siblingIds = new Set<string>()
      for (const pid of parents) {
        for (const cid of ftChildrenOf.get(pid) ?? []) {
          if (cid !== node.id && cid !== ego.id) siblingIds.add(cid)
        }
      }
      if (siblingIds.size === 0) continue
      const siblingNodes = [...siblingIds]
        .map((sid) => ftNodeMap.get(sid))
        .filter((n): n is FamilyTreePerson => Boolean(n))
        .sort((a, b) => {
          const ay = birthYearOf(a) ?? Number.POSITIVE_INFINITY
          const by = birthYearOf(b) ?? Number.POSITIVE_INFINITY
          return ay - by
        })
      if (siblingNodes.length > 0) out.set(node.id, siblingNodes)
    }
    return out
  }, [familyTreeData, ftChildrenOf, ftParentsOf, ftNodeMap, ego.id])

  /**
   * BFS 응답이 도착했을 때 ego의 형제/배우자/자녀를 BFS 단일 출처에서 도출.
   * REST props(`siblings`/`spouses`/`children`)는 BFS 로드 전 초기 렌더와 폴백 용도로만 사용 —
   * 데이터 출처 이중화로 인한 drift를 방지한다.
   *
   * 동일 인물의 country·sovereignCountry·illegitimate·연도 등이 두 응답에서 다르게 올 수
   * 있어 BFS를 정본으로 삼는다. BFS는 inferred 배우자(자녀의 다른 친부모로 추론된 사람)도
   * 포함하므로 ego 카드 옆에 더 풍부한 가족이 노출된다.
   */
  const ftDerivedEgoFamily = useMemo(() => {
    if (!familyTreeData || !ego.id) return null
    const egoId = ego.id

    // 형제 — siblingsByPersonId에서 추출
    const sibs = (siblingsByPersonId.get(egoId) ?? []).map(ftPersonToNodePerson)

    // 배우자 — spouse 엣지에서 ego가 끼인 것. 엣지 provenance(inferred)·혼인연도를 함께 보존해
    // '배우자(추정)' 구분에 사용(임베드가 추론 배우자를 확정처럼 그리던 오정보 방지).
    const sps: NodePerson[] = []
    const spouseEdgesByPersonId = new Map<string, SpouseEdgeEntry[]>()
    for (const e of familyTreeData.edges) {
      if (e.type !== 'spouse') continue
      const meta = {
        inferred: Boolean(e.inferred),
        marriageStartYear: e.marriageStartYear ?? null,
        marriageEndYear: e.marriageEndYear ?? null,
      }
      const a = ftNodeMap.get(e.source)
      const b = ftNodeMap.get(e.target)
      if (a) {
        const list = spouseEdgesByPersonId.get(e.target) ?? []
        list.push({ node: a, ...meta })
        spouseEdgesByPersonId.set(e.target, list)
      }
      if (b) {
        const list = spouseEdgesByPersonId.get(e.source) ?? []
        list.push({ node: b, ...meta })
        spouseEdgesByPersonId.set(e.source, list)
      }
    }
    const toSpouseNode = (entry: SpouseEdgeEntry): NodePerson => ({
      ...ftPersonToNodePerson(entry.node),
      inferred: entry.inferred,
      marriageStartYear: entry.marriageStartYear,
      marriageEndYear: entry.marriageEndYear,
    })
    for (const entry of spouseEdgesByPersonId.get(egoId) ?? []) {
      sps.push(toSpouseNode(entry))
    }

    // 자녀 — ftChildrenOf[ego.id], 각 자녀의 spouse를 spouse 엣지에서 찾아 join.
    // 툴팁에 반대편 부모 이름 주입(ego 본인 라인은 자명하므로 생략) — 다중 혼인에서
    // 어느 배우자 소생인지 hover로 확인 가능(칩은 반대편 부모가 갈릴 때만).
    const childIds = ftChildrenOf.get(egoId) ?? []
    const childs: ChildPerson[] = childIds
      .map((cid) => ftNodeMap.get(cid))
      .filter((c): c is FamilyTreePerson => Boolean(c))
      .sort((a, b) => {
        const ay = birthYearOf(a) ?? Number.POSITIVE_INFINITY
        const by = birthYearOf(b) ?? Number.POSITIVE_INFINITY
        return ay - by
      })
      .map((c) => {
        const spouseCandidates = spouseEdgesByPersonId.get(c.id) ?? []
        const sp = spouseCandidates[0] ?? null
        return {
          ...withParentNames(ftPersonToNodePerson(c), ftNodeMap, { omitParentId: egoId }),
          spouse: sp ? toSpouseNode(sp) : null,
        }
      })

    return { siblings: sibs, spouses: sps, children: childs }
  }, [familyTreeData, siblingsByPersonId, ftChildrenOf, ftNodeMap, ego.id])

  // useMemo로 참조 안정화 — 매 렌더 새 배열이면 이를 deps로 갖는 하위 memo
  // (descendantsByParentId·childLayouts·childrenShift)가 전부 무효화된다.
  const childList = useMemo(
    () => (ftDerivedEgoFamily?.children ?? children ?? []).filter(Boolean),
    [ftDerivedEgoFamily, children],
  )

  /**
   * 각 부모(=ego의 자녀, 손자녀, …) → 다음 세대 노드 배열 (출생연도 오름차순).
   *
   * **사촌결혼 dedupe (H1)**: BFS 순서로 인물별 첫 부모에게만 할당 — 동일 인물이
   * 양쪽 부모 분기에서 두 번 그려지는 문제 방지.
   *
   * **결혼 마커 (M1)**: 각 후손에 대해 dedupe 후 미할당된 다른 부모가
   * 가계도 안 다른 후손이면 "내부 결혼"으로 표시. 한 인물이 가계도 안 여러 친척과
   * 결혼한 경우(왕가 재혼 케이스) 모두 표시되도록 배열로 관리한다.
   */
  const { descendantsByParentId, inMarriageByPersonId } = useMemo(() => {
    const out = new Map<string, FamilyTreePerson[]>()
    const inMarriage = new Map<string, FamilyTreePerson[]>()
    if (!familyTreeData) {
      return { descendantsByParentId: out, inMarriageByPersonId: inMarriage }
    }
    const childIds = new Set(childList.map((c) => c.id).filter(Boolean) as string[])
    const excludeIds = new Set<string>([ego.id, ...childIds].filter(Boolean) as string[])

    // Phase 1: 후손별 첫 부모 결정 (BFS 출생연도 정렬 순)
    const primaryParent = new Map<string, string>()
    const queue: string[] = [...childIds]
    const seen = new Set<string>(childIds)
    while (queue.length > 0) {
      const pid = queue.shift()!
      const childIdsOfP = ftChildrenOf.get(pid) ?? []
      const childNodes = childIdsOfP
        .map((cid) => ftNodeMap.get(cid))
        .filter((n): n is FamilyTreePerson => Boolean(n))
        .filter((n) => !excludeIds.has(n.id))
        .sort((a, b) => {
          const ay = birthYearOf(a) ?? Number.POSITIVE_INFINITY
          const by = birthYearOf(b) ?? Number.POSITIVE_INFINITY
          return ay - by
        })
      for (const cn of childNodes) {
        if (!primaryParent.has(cn.id)) {
          primaryParent.set(cn.id, pid)
          if (!seen.has(cn.id)) {
            seen.add(cn.id)
            queue.push(cn.id)
          }
        }
      }
    }

    // Phase 2: descendantsByParentId 빌드 — primary parent 한 명에게만 자녀 할당
    for (const [descId, primaryPid] of primaryParent) {
      const node = ftNodeMap.get(descId)
      if (!node) continue
      const list = out.get(primaryPid) ?? []
      list.push(node)
      out.set(primaryPid, list)
    }
    for (const list of out.values()) {
      list.sort((a, b) => {
        const ay = birthYearOf(a) ?? Number.POSITIVE_INFINITY
        const by = birthYearOf(b) ?? Number.POSITIVE_INFINITY
        return ay - by
      })
    }

    // Phase 3: 내부 결혼 마커 — 다중 in-tree 결혼은 모두 누적
    const pushInMarriage = (key: string, partner: FamilyTreePerson) => {
      const list = inMarriage.get(key) ?? []
      if (!list.some((p) => p.id === partner.id)) list.push(partner)
      inMarriage.set(key, list)
    }
    for (const [descId, primaryPid] of primaryParent) {
      const allParents = ftParentsOf.get(descId) ?? []
      for (const otherPid of allParents) {
        if (otherPid === primaryPid) continue
        if (primaryParent.has(otherPid) || childIds.has(otherPid)) {
          const other = ftNodeMap.get(otherPid)
          const primary = ftNodeMap.get(primaryPid)
          if (other && primary) {
            pushInMarriage(primaryPid, other)
            pushInMarriage(otherPid, primary)
          }
        }
      }
    }

    return { descendantsByParentId: out, inMarriageByPersonId: inMarriage }
  }, [familyTreeData, ftChildrenOf, ftNodeMap, ftParentsOf, childList, ego.id])

  const siblingList = useMemo(
    () =>
      (ftDerivedEgoFamily?.siblings ?? siblings ?? [])
        .filter(Boolean)
        .slice()
        .sort((a, b) => {
          const ay = birthYearOf(a)
          const by = birthYearOf(b)
          if (ay == null && by == null) return 0
          if (ay == null) return 1
          if (by == null) return -1
          return ay - by
        }),
    [ftDerivedEgoFamily, siblings],
  )
  const spouseList: NodePerson[] = useMemo(
    () =>
      ftDerivedEgoFamily?.spouses ??
      (spousesProp != null
        ? (spousesProp.filter(Boolean) as NodePerson[])
        : spouseLegacy
          ? [spouseLegacy]
          : []),
    [ftDerivedEgoFamily, spousesProp, spouseLegacy],
  )

  /**
   * 형제 판별 기준(anchor=ego)의 부모 FK — BFS 노드 스칼라(정본) 우선, REST 폴백은
   * ego.fatherId 또는 father/mother prop의 id. 폴백도 동일한 FK 사실이라 판정 규칙이 같아
   * BFS 도착 시 라벨이 강등되지 않는다(동일 입력 → 동일 판정).
   */
  const egoParentFks = useMemo<SiblingParentFks>(() => {
    const bfsEgo = ego.id ? ftNodeMap.get(ego.id) : undefined
    if (bfsEgo && bfsEgo.fatherId !== undefined && bfsEgo.motherId !== undefined) {
      return { fatherId: bfsEgo.fatherId ?? null, motherId: bfsEgo.motherId ?? null }
    }
    return {
      fatherId: ego.fatherId ?? father?.id ?? null,
      motherId: ego.motherId ?? mother?.id ?? null,
    }
  }, [ftNodeMap, ego, father, mother])

  const clickableProps = (id?: string) => {
    // BFS 응답에 isOwned=false로 온 노드는 상세를 열 수 없음(다른 계정 등록) → 클릭 비활성 + dim.
    const openable = !id || ftNodeMap.get(id)?.isOwned !== false
    if (!openable)
      return { $dimmed: true, title: '다른 계정이 등록한 인물이라 상세를 열 수 없습니다' }
    return id && onPersonClick
      ? {
          role: 'button' as const,
          tabIndex: 0,
          onClick: () => onPersonClick(id),
          onKeyDown: (e: ReactKeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPersonClick(id) }
          },
          $clickable: true,
        }
      : {}
  }

  const hasPaternalGp = Boolean(paternalGrandfather || paternalGrandmother)
  const hasMaternalGp = Boolean(maternalGrandfather || maternalGrandmother)
  const hasParents = Boolean(father || mother)
  const twoParents = Boolean(father && mother)
  const hasSpouses = spouseList.length > 0
  const hasChildren = childList.length > 0
  const hasSiblings = siblingList.length > 0

  const hasFatherSide = Boolean(father || paternalGrandfather || paternalGrandmother)
  const hasMotherSide = Boolean(mother || maternalGrandfather || maternalGrandmother)
  const twoSides = hasFatherSide && hasMotherSide

  const hasFtAncestors = Boolean(ftFatherId || ftMotherId)
  // 여기서 조기 return하면 아래 useState/useMemo(6개)가 조건부로 실행돼 Rules of Hooks 위반.
  // 듀얼 소스(REST props + family-tree BFS) refetch 레이스로 마운트 중 조건이 뒤집히면
  // 렌더 간 훅 수가 달라져 React가 throw한다. 실제 반환은 모든 훅을 지난 렌더 직전에서.
  const isEmptyTree =
    !hasFatherSide && !hasMotherSide && !hasFtAncestors && !hasSpouses && !hasChildren && !hasSiblings

  const firstSpouse = spouseList[0] ?? null
  // 형제자매가 있으면 왼쪽을 차지하므로, 배우자는 항상 오른쪽
  const spouseSide: 'left' | 'right' | null = hasSpouses
    ? hasSiblings || (!isRight(ego) && !isLeft(firstSpouse)) ? 'right' : 'left'
    : null

  // ── 형제자매: 컴팩트 카드 + 인접 출생순 N명만 기본 표시, 나머지는 모달 ─────
  const SIBLINGS_DEFAULT_LIMIT = 3
  const [siblingsModalOpen, setSiblingsModalOpen] = useState(false)
  const [ancestorSiblingsOf, setAncestorSiblingsOf] = useState<{
    person: FamilyTreePerson
    siblings: FamilyTreePerson[]
  } | null>(null)
  const visibleSiblings = useMemo(() => {
    if (siblingList.length <= SIBLINGS_DEFAULT_LIMIT) return siblingList
    const egoY = birthYearOf(ego)
    if (egoY == null) return siblingList.slice(0, SIBLINGS_DEFAULT_LIMIT)
    // ego와 출생연도 차이 절대값 기준으로 상위 N명을 출생순으로 다시 정렬
    return siblingList
      .map((s, idx) => ({ s, idx, dy: Math.abs((birthYearOf(s) ?? Number.POSITIVE_INFINITY) - egoY) }))
      .sort((a, b) => a.dy - b.dy)
      .slice(0, SIBLINGS_DEFAULT_LIMIT)
      .sort((a, b) => {
        const ay = birthYearOf(a.s)
        const by = birthYearOf(b.s)
        if (ay == null && by == null) return 0
        if (ay == null) return 1
        if (by == null) return -1
        return ay - by
      })
      .map((x) => x.s)
  }, [siblingList, ego])
  const hiddenSiblingCount = siblingList.length - visibleSiblings.length

  /**
   * 근접-3 선별이 '확정 반형제'를 숨길 때만 더보기 버튼에 요약 병기 —
   * 보이는 3명이 전부 동복이면 스트립만 본 사용자가 이복 존재를 모르는 은폐 방지.
   * 판별불가는 세지 않는다(과잉 주장 금지 — 사유는 모달·툴팁 담당).
   */
  const hiddenHalfSummary = useMemo(() => {
    if (hiddenSiblingCount <= 0) return null
    const visibleIds = new Set(visibleSiblings.map((sib) => sib.id))
    let paternalCount = 0
    let maternalCount = 0
    for (const sib of siblingList) {
      if (sib.id && visibleIds.has(sib.id)) continue
      const { kinship } = classifySiblingKinship(egoParentFks, sib)
      if (kinship === 'PATERNAL_HALF') paternalCount += 1
      else if (kinship === 'MATERNAL_HALF') maternalCount += 1
    }
    const parts: string[] = []
    if (paternalCount > 0) parts.push(`이복 ${paternalCount}`)
    if (maternalCount > 0) parts.push(`이부 ${maternalCount}`)
    return parts.length > 0 ? parts.join(' · ') : null
  }, [hiddenSiblingCount, visibleSiblings, siblingList, egoParentFks])

  /** BFS take 절단 여부 — 모달 레인 카운트의 '표시분 기준' 한정 고지용 (scope별) */
  const siblingsTruncated = Boolean(
    familyTreeData?.truncations?.some((t) => t.scope === 'siblings'),
  )
  // 'siblings'(=ego 형제 scope)는 제외 — 조상 형제 모달 구성원은 방계 scope에서만 오므로
  // ego 형제 절단만으로 조상 모달에 거짓 '일부만 표시' 고지가 뜨지 않게.
  const collateralsTruncated = Boolean(
    familyTreeData?.truncations?.some((t) =>
      ['aunts-uncles', 'grand-aunts-uncles', 'great-grand-aunts-uncles'].includes(t.scope),
    ),
  )

  /**
   * 다중 혼인 자녀의 생모 귀속 칩(«○○○ 소생») 노출 조건 — ego 자녀들의 반대편 부모가
   * 2명 이상으로 갈릴 때만(1차 리뷰 #1 consort 인디케이터 최소안). 반대편 부모가
   * 하나뿐이면 배우자 카드가 이미 문맥을 제공하므로 칩은 노이즈다.
   */
  const childOtherParentIds = useMemo(() => {
    const ids = new Set<string>()
    if (!ego.id) return ids
    for (const child of childList) {
      const otherId =
        child.fatherId && child.fatherId !== ego.id ? child.fatherId
        : child.motherId && child.motherId !== ego.id ? child.motherId
        : null
      if (otherId) ids.add(otherId)
    }
    return ids
  }, [childList, ego.id])
  const showConsortMarks = childOtherParentIds.size >= 2
  const consortMarkFor = (child: NodePerson) => {
    if (!showConsortMarks || !ego.id) return null
    const otherId =
      child.fatherId && child.fatherId !== ego.id ? child.fatherId
      : child.motherId && child.motherId !== ego.id ? child.motherId
      : null
    if (!otherId) return null
    const node = ftNodeMap.get(otherId)
    if (!node) return null // 그래프 밖 — 이름 없는 칩은 노이즈, 툴팁(카드 hover)이 담당
    const name = getPersonDisplayName(node, true)
    // title 없음 — pointer-events:none 칩이라 네이티브 툴팁은 어차피 사문(死文)
    return <ConsortMark aria-label={`${name} 소생`}>{name} 소생</ConsortMark>
  }

  /**
   * 자녀 행의 시각 중심을 ego 수직선 아래로 정렬하기 위한 px 시프트.
   * 자녀 1명 또는 모든 자녀가 배우자 없을 땐 0(자연 대칭).
   * 양수면 자녀 mean이 ChildrenGrid 컨테이너 중심보다 오른쪽에 있어서, 컨테이너를
   * 그만큼 왼쪽으로 transform 시켜야 ego와 정렬됨.
   * ForkToChildren의 xMid도 자녀 mean을 쓰도록 짝지어 있어 시프트와 함께 작동.
   */
  /**
   * 자녀 페어별 렌더 기하(폭·자녀 중심 오프셋) — 손자녀 서브트리로 팽창한 실측값.
   * fork SVG·ChildPair::before·center-shift가 이 단일 출처를 공유해 선 어긋남을 방지.
   */
  const childLayouts = useMemo(
    () => computeChildLayouts(childList, descendantsByParentId, ego.id),
    [childList, descendantsByParentId, ego.id],
  )
  const childrenShift = useMemo(() => childrenCenterShift(childLayouts), [childLayouts])
  // shift를 transform이 아닌 래퍼 padding으로 반영 — 레이아웃에 참여해야 GenerationsInner
  // max-content 폭에 포함되고, 좌측으로 밀린 자녀·손자녀 카드가 LTR 스크롤로 도달 불가하게
  // 잘리지 않는다(G7). 래퍼 중심 = childMean이 되어 ego 드롭 정렬도 유지된다.
  const childrenShiftPadding =
    childrenShift > 0
      ? { paddingRight: 2 * childrenShift }
      : childrenShift < 0
        ? { paddingLeft: -2 * childrenShift }
        : undefined

  /**
   * BFS take 한도로 절단된 그룹 — scope별로 dedupe해 헤더 아래 알림 배너로 노출.
   * "자녀 80명까지만 표시" 같이 사용자가 '왜 안 보이지?' 의문을 갖지 않도록 한다.
   */
  const truncationBanner = useMemo(() => {
    const trs = familyTreeData?.truncations
    if (!trs || trs.length === 0) return null
    const byScope = new Map<string, number>()
    for (const t of trs) {
      // 임베드가 렌더하지 않는 scope(배우자의 다른 결혼 자녀 등)는 배너에서 제외 —
      // 화면에 없는 그룹의 "일부만 표시" 유령 배너를 막는다.
      if (EMBED_UNRENDERED_SCOPES.has(t.scope)) continue
      if (!byScope.has(t.scope) || byScope.get(t.scope)! < t.took) {
        byScope.set(t.scope, t.took)
      }
    }
    if (byScope.size === 0) return null
    const labels: Array<{ scope: string; label: string; took: number }> = []
    for (const [scope, took] of byScope) {
      labels.push({ scope, label: TRUNCATION_SCOPE_LABEL[scope] ?? scope, took })
    }
    return labels
  }, [familyTreeData])

  // 모든 훅을 지난 뒤 빈 트리 반환 (위 isEmptyTree 주석 참고 — Rules of Hooks).
  if (isEmptyTree) return null

  return (
    <FamilyTreeLookupContext.Provider value={ftNodeMap}>
      <Root>
        {showHeader && (
          <InfographicHeader>
            <HeaderIcon aria-hidden>
              <FiUsers size={18} strokeWidth={1.75} />
            </HeaderIcon>
            <HeaderText>
              <HeaderTitle>가계도</HeaderTitle>
              <HeaderDesc>
                위·아래가 세대입니다. 가로로 이어진 선은 부부, 아래로 꺾인 선은 자녀·후손 방향입니다.
              </HeaderDesc>
            </HeaderText>
          </InfographicHeader>
        )}

        {truncationBanner && truncationBanner.length > 0 && (
          <TruncationBanner role="status">
            <TruncationBannerIcon aria-hidden>!</TruncationBannerIcon>
            <TruncationBannerText>
              인원이 많아 일부만 표시 —{' '}
              {truncationBanner.map((t, i) => (
                <span key={t.scope}>
                  {i > 0 && ', '}
                  <TruncationBannerScope>{t.label}</TruncationBannerScope> 최대 {t.took}명
                </span>
              ))}
            </TruncationBannerText>
          </TruncationBanner>
        )}

        {/* 접이식 표기 범례 — 이복/이부 배지·서출 마커·추정 배우자 정의 (닫힘 기본) */}
        <LegendDetails>
          <LegendSummary>표기 안내</LegendSummary>
          <LegendBody>
            <LegendTerm>이복형제</LegendTerm> 아버지 같고 어머니 다름 ·{' '}
            <LegendTerm>이부형제</LegendTerm> 어머니 같고 아버지 다름 ·{' '}
            <LegendTerm>형제</LegendTerm>(무표기) 친형제 또는 부모 기록 미상 — 카드에 마우스를
            올리면 사유가 표시됩니다 · <LegendTerm>*</LegendTerm> 서출(이복 여부와 별개) ·{' '}
            <LegendTerm>(추정)</LegendTerm> 자녀 관계로 추정된 배우자 ·{' '}
            <LegendTerm>○○○ 소생</LegendTerm> 다중 혼인에서 자녀의 반대편 부모(생모·생부)
          </LegendBody>
        </LegendDetails>

        <TreeCanvas
          role="tree"
          aria-label={`${getPersonDisplayName(ego, true)} 가계도`}
        >
          <GenerationsInner>
            {/* ── 조상 세대 (동적 n세대) ── */}
            {familyTreeData && (ftFatherId || ftMotherId) ? (
              // FamilyTreeData가 있으면 AncestorColumn으로 재귀 렌더링 (고조부모까지)
              <GenerationBlock>
                <ParentsRow $twoSides={!!(ftFatherId && ftMotherId)}>
                  {ftFatherId && (
                    <AncestorColumn
                      personId={ftFatherId}
                      path="F"
                      nodeMap={ftNodeMap}
                      parentsOf={ftParentsOf}
                      maxDepth={FT_MAX_DEPTH}
                      visited={new Set<string>()}
                      siblingsByPersonId={siblingsByPersonId}
                      onPersonClick={onPersonClick}
                      onOpenSiblings={(person, sibs) => setAncestorSiblingsOf({ person, siblings: sibs })}
                    />
                  )}
                  {ftMotherId && (
                    <AncestorColumn
                      personId={ftMotherId}
                      path="M"
                      nodeMap={ftNodeMap}
                      parentsOf={ftParentsOf}
                      maxDepth={FT_MAX_DEPTH}
                      visited={new Set<string>()}
                      siblingsByPersonId={siblingsByPersonId}
                      onPersonClick={onPersonClick}
                      onOpenSiblings={(person, sibs) => setAncestorSiblingsOf({ person, siblings: sibs })}
                    />
                  )}
                </ParentsRow>
                <ForkTrack
                  style={
                    ftFatherId && ftMotherId
                      ? { width: ancFatherW + ANC_PARENTS_GAP + ancMotherW }
                      : undefined
                  }
                >
                  {ftFatherId && ftMotherId ? (
                    <ForkFromTwoParentsMeasured
                      leftW={ancFatherW}
                      gap={ANC_PARENTS_GAP}
                      rightW={ancMotherW}
                    />
                  ) : (
                    <ForkFromOneParent />
                  )}
                </ForkTrack>
              </GenerationBlock>
            ) : (hasFatherSide || hasMotherSide) ? (
              // fallback: 조부모까지만 표시하는 기존 렌더링
              <GenerationBlock>
                <ParentsRow $twoSides={twoSides}>
                  {hasFatherSide && (
                    <FamilyColumn $hasParent={Boolean(father)}>
                      {hasPaternalGp && (
                        <>
                          <GrandparentPair>
                            {paternalGrandfather && (
                              <GeoNode $role="grandparent" {...clickableProps(paternalGrandfather.id)}>
                                <GeoThumbnail person={paternalGrandfather} role="grandparent" />
                                <NodeNameBlock person={paternalGrandfather} />
                                <NodeBadge $role="grandparent">친조부</NodeBadge>
                                <CardHoverInfo person={paternalGrandfather} />
                              </GeoNode>
                            )}
                            {paternalGrandmother && (
                              <GeoNode $role="grandparentAlt" {...clickableProps(paternalGrandmother.id)}>
                                <GeoThumbnail person={paternalGrandmother} role="grandparentAlt" />
                                <NodeNameBlock person={paternalGrandmother} />
                                <NodeBadge $role="grandparentAlt">친조모</NodeBadge>
                                <CardHoverInfo person={paternalGrandmother} />
                              </GeoNode>
                            )}
                          </GrandparentPair>
                          {father && (
                            <GrandparentForkTrack $twoGp={Boolean(paternalGrandfather && paternalGrandmother)}>
                              {paternalGrandfather && paternalGrandmother
                                ? <ForkFromTwoGrandparents />
                                : <ForkFromOneParent />
                              }
                            </GrandparentForkTrack>
                          )}
                        </>
                      )}
                      {father && (
                        <GeoNode $role="parent" {...clickableProps(father.id)}>
                          <GeoThumbnail person={father} role="parent" />
                          <NodeNameBlock person={father} />
                          <NodeBadge $role="parent">아버지</NodeBadge>
                          <CardHoverInfo person={father} />
                        </GeoNode>
                      )}
                    </FamilyColumn>
                  )}
                  {hasMotherSide && (
                    <FamilyColumn $hasParent={Boolean(mother)}>
                      {hasMaternalGp && (
                        <>
                          <GrandparentPair>
                            {maternalGrandfather && (
                              <GeoNode $role="grandparent" {...clickableProps(maternalGrandfather.id)}>
                                <GeoThumbnail person={maternalGrandfather} role="grandparent" />
                                <NodeNameBlock person={maternalGrandfather} />
                                <NodeBadge $role="grandparent">외조부</NodeBadge>
                                <CardHoverInfo person={maternalGrandfather} />
                              </GeoNode>
                            )}
                            {maternalGrandmother && (
                              <GeoNode $role="grandparentAlt" {...clickableProps(maternalGrandmother.id)}>
                                <GeoThumbnail person={maternalGrandmother} role="grandparentAlt" />
                                <NodeNameBlock person={maternalGrandmother} />
                                <NodeBadge $role="grandparentAlt">외조모</NodeBadge>
                                <CardHoverInfo person={maternalGrandmother} />
                              </GeoNode>
                            )}
                          </GrandparentPair>
                          {mother && (
                            <GrandparentForkTrack $twoGp={Boolean(maternalGrandfather && maternalGrandmother)}>
                              {maternalGrandfather && maternalGrandmother
                                ? <ForkFromTwoGrandparents />
                                : <ForkFromOneParent />
                              }
                            </GrandparentForkTrack>
                          )}
                        </>
                      )}
                      {mother && (
                        <GeoNode $role="parentAlt" {...clickableProps(mother.id)}>
                          <GeoThumbnail person={mother} role="parentAlt" />
                          <NodeNameBlock person={mother} />
                          <NodeBadge $role="parentAlt">어머니</NodeBadge>
                          <CardHoverInfo person={mother} />
                        </GeoNode>
                      )}
                    </FamilyColumn>
                  )}
                </ParentsRow>
                {hasParents && (
                  <ForkTrack>
                    {twoParents ? <ForkFromTwoParents /> : <ForkFromOneParent />}
                  </ForkTrack>
                )}
              </GenerationBlock>
            ) : null}

            {/* ── 본인 세대 ── */}
            <GenerationBlock>
              <EgoRow>
                {/* 좌측: 형제자매 (있으면 우선) 또는 배우자 좌측 */}
                {hasSiblings ? (
                  <SiblingSlot>
                    <SiblingsStack>
                      {visibleSiblings.map((sib, idx) => {
                        const kinship = classifySiblingKinship(egoParentFks, sib)
                        return (
                          <SiblingCompactNode
                            key={sib.id ?? `sib-${idx}`}
                            person={withSiblingKinshipMeta(sib, kinship, familyTreeData ? ftNodeMap : null)}
                            badge={siblingKinshipBadgeLabel(kinship)}
                            badgeAriaLabel={siblingKinshipAriaLabel(kinship)}
                            onPersonClick={onPersonClick}
                          />
                        )
                      })}
                      {hiddenSiblingCount > 0 && (
                        <SiblingMoreToggle
                          type="button"
                          onClick={() => setSiblingsModalOpen(true)}
                          aria-label={`형제자매 ${hiddenSiblingCount}명 더 보기 (전체 ${siblingList.length}명${hiddenHalfSummary ? `, 숨겨진 형제 중 ${hiddenHalfSummary}` : ''})`}
                        >
                          외 {hiddenSiblingCount}명 더 보기
                          {hiddenHalfSummary && ` · ${hiddenHalfSummary}`}
                        </SiblingMoreToggle>
                      )}
                    </SiblingsStack>
                    <SiblingJoin aria-hidden>
                      <svg width="36" height="20" viewBox="0 0 36 20" xmlns="http://www.w3.org/2000/svg">
                        <path d="M 0 10 L 36 10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                      </svg>
                      <SiblingIcon><FiUsers size={12} strokeWidth={2.2} /></SiblingIcon>
                    </SiblingJoin>
                  </SiblingSlot>
                ) : hasSpouses && spouseSide === 'left' ? (
                  <SpouseSlot $side="left">
                    <SpouseStack>
                      {spouseList.map((sp, i) => (
                        <GeoNode key={sp.id ?? `sp-${i}`} $role="spouse" {...clickableProps(sp.id)}>
                          <GeoThumbnail person={sp} role="spouse" />
                          <NodeNameBlock person={sp} />
                          <NodeBadge $role="spouse">{(spouseList.length > 1 ? `배우자 ${i + 1}` : '배우자') + (sp.inferred ? ' (추정)' : '')}</NodeBadge>
                          <CardHoverInfo person={sp} />
                        </GeoNode>
                      ))}
                    </SpouseStack>
                    <SpouseJoin aria-hidden>
                      <SpouseStackJoin count={spouseList.length} side="left" />
                      <SpouseHeart><FiHeart size={13} strokeWidth={2.2} /></SpouseHeart>
                    </SpouseJoin>
                  </SpouseSlot>
                ) : null}
                <EgoSlot>
                  <GeoNode $role="ego" $emphasis>
                    <GeoThumbnail person={ego} role="ego" />
                    <NodeNameBlock person={ego} />
                    <NodeBadge $role="ego">본인</NodeBadge>
                    <CardHoverInfo person={ego} />
                  </GeoNode>
                </EgoSlot>
                {/* 배우자 우측 */}
                {hasSpouses && spouseSide === 'right' && (
                  <SpouseSlot $side="right">
                    <SpouseJoin aria-hidden>
                      <SpouseStackJoin count={spouseList.length} side="right" />
                      <SpouseHeart><FiHeart size={13} strokeWidth={2.2} /></SpouseHeart>
                    </SpouseJoin>
                    <SpouseStack>
                      {spouseList.map((sp, i) => (
                        <GeoNode key={sp.id ?? `sp-${i}`} $role="spouse" {...clickableProps(sp.id)}>
                          <GeoThumbnail person={sp} role="spouse" />
                          <NodeNameBlock person={sp} />
                          <NodeBadge $role="spouse">{(spouseList.length > 1 ? `배우자 ${i + 1}` : '배우자') + (sp.inferred ? ' (추정)' : '')}</NodeBadge>
                          <CardHoverInfo person={sp} />
                        </GeoNode>
                      ))}
                    </SpouseStack>
                  </SpouseSlot>
                )}
              </EgoRow>
            </GenerationBlock>

            {/* ── 자녀 세대 ── */}
            {hasChildren && (
              <GenerationBlock>
                {childList.length === 1 ? (
                  // 자녀 1명: ego-row 패턴과 동일하게 자녀 카드를 정중앙(auto 컬럼)에 고정
                  // → fork 수직선(50%)이 자녀 카드 중심과 정확히 일치. shift 없음.
                  <>
                    <ForkTrack $compact>
                      <ForkFromOneParent />
                    </ForkTrack>
                  <SingleChildRow>
                    {/* col 1 (1fr) — 왼쪽 배우자 or 빈 균형 공간 */}
                    {(() => {
                      const child = childList[0]
                      if (!child.spouse) return <div />
                      if (isChildOnLeftInPair(child)) return <div />
                      const spouseNode = (
                        <NodePersonCompactCard
                          person={child.spouse}
                          role="spouse"
                          badge="배우자"
                          onPersonClick={onPersonClick}
                        />
                      )
                      const join = (
                        <SpouseJoin aria-hidden>
                          <svg width="28" height="20" viewBox="0 0 28 20" xmlns="http://www.w3.org/2000/svg">
                            <path d="M 0 10 L 28 10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                          </svg>
                          <SpouseHeart><FiHeart size={12} strokeWidth={2.2} /></SpouseHeart>
                        </SpouseJoin>
                      )
                      return <ChildSpouseSlot $reverse>{spouseNode}{join}</ChildSpouseSlot>
                    })()}
                    {/* col 2 (auto) — 자녀 카드 + 손자녀 서브트리 */}
                    <ChildNodeColumn>
                      <GeoNode $role="child" {...clickableProps(childList[0].id)}>
                        <GeoThumbnail person={childList[0]} role="child" />
                        <NodeNameBlock person={childList[0]} />
                        <NodeBadge $role="child">자녀</NodeBadge>
                        <CardHoverInfo person={childList[0]} />
                      </GeoNode>
                      {childList[0].id && descendantsByParentId.has(childList[0].id) && (
                        <DescendantSubtree
                          descendants={descendantsByParentId.get(childList[0].id) ?? []}
                          childrenOf={descendantsByParentId}
                          depth={0}
                          maxDepth={DESCENDANT_MAX_DEPTH}
                          visited={new Set([ego.id, childList[0].id].filter(Boolean) as string[])}
                          inMarriageByPersonId={inMarriageByPersonId}
                          onPersonClick={onPersonClick}
                        />
                      )}
                    </ChildNodeColumn>
                    {/* col 3 (1fr) — 오른쪽 배우자 or 빈 균형 공간 */}
                    {(() => {
                      const child = childList[0]
                      if (!child.spouse) return <div />
                      if (!isChildOnLeftInPair(child)) return <div />
                      const spouseNode = (
                        <NodePersonCompactCard
                          person={child.spouse}
                          role="spouse"
                          badge="배우자"
                          onPersonClick={onPersonClick}
                        />
                      )
                      const join = (
                        <SpouseJoin aria-hidden>
                          <svg width="28" height="20" viewBox="0 0 28 20" xmlns="http://www.w3.org/2000/svg">
                            <path d="M 0 10 L 28 10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                          </svg>
                          <SpouseHeart><FiHeart size={12} strokeWidth={2.2} /></SpouseHeart>
                        </SpouseJoin>
                      )
                      return <ChildSpouseSlot>{join}{spouseNode}</ChildSpouseSlot>
                    })()}
                  </SingleChildRow>
                  </>
                ) : (
                  // 다자녀: shift를 transform 대신 래퍼 padding으로 반영(G7).
                  // ForkTrack(가로 바)·ChildrenGrid(카드)가 같은 래퍼 안에서 함께 밀려
                  // 정렬을 유지하고, 밀린 폭이 레이아웃에 포함돼 스크롤로 전부 도달 가능.
                  <ChildrenShiftWrap style={childrenShiftPadding}>
                    <ForkTrack $compact $multiChild>
                      <ForkToChildren layouts={childLayouts} />
                    </ForkTrack>
                    <ChildrenGrid>
                    {childList.map((child, idx) => {
                      const pairKey = child.id ?? `child-${idx}`
                      const grands = child.id
                        ? descendantsByParentId.get(child.id)
                        : undefined
                      const grandSubtree = grands && grands.length > 0 ? (
                        <DescendantSubtree
                          descendants={grands}
                          childrenOf={descendantsByParentId}
                          depth={0}
                          maxDepth={DESCENDANT_MAX_DEPTH}
                          visited={new Set([ego.id, child.id].filter(Boolean) as string[])}
                          inMarriageByPersonId={inMarriageByPersonId}
                          onPersonClick={onPersonClick}
                        />
                      ) : null
                      const childNode = (
                        <GeoNode key={`${pairKey}-self`} $role="child" {...clickableProps(child.id)}>
                          <GeoThumbnail person={child} role="child" />
                          <NodeNameBlock person={child} />
                          <NodeBadge $role="child">자녀</NodeBadge>
                          <CardHoverInfo person={child} />
                          {consortMarkFor(child)}
                        </GeoNode>
                      )
                      if (!child.spouse) {
                        // 배우자 없음: 자녀 카드 중심 = ChildNodeColumn(서브트리 포함) 폭의 중앙
                        return (
                          <ChildPair key={pairKey} $childOffset={childLayouts[idx].childOffset}>
                            <ChildNodeColumn>
                              {childNode}
                              {grandSubtree}
                            </ChildNodeColumn>
                          </ChildPair>
                        )
                      }
                      const spouseNode = (
                        <NodePersonCompactCard
                          key={`${pairKey}-sp-${child.spouse.id ?? 'u'}`}
                          person={child.spouse}
                          role="spouse"
                          badge={child.spouse.inferred ? '배우자(추정)' : '배우자'}
                          onPersonClick={onPersonClick}
                        />
                      )
                      const join = (
                        // $card: 자녀 카드 높이(NODE_H)에 맞춰 하트를 카드 세로 중앙에 고정.
                        // 서브트리로 행이 길어져도 하트가 빈 공간에 뜨지 않게 함(align-self:center 회피).
                        <SpouseJoin key={`${pairKey}-join`} $card aria-hidden>
                          <svg width="28" height="20" viewBox="0 0 28 20" xmlns="http://www.w3.org/2000/svg">
                            <path d="M 0 10 L 28 10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                          </svg>
                          <SpouseHeart><FiHeart size={12} strokeWidth={2.2} /></SpouseHeart>
                        </SpouseJoin>
                      )
                      const childIsLeft = isChildOnLeftInPair(child)
                      // 손자녀 서브트리는 자녀 카드 바로 아래에만 위치 (배우자 옆에 정렬)
                      const childWithGrand = (
                        <ChildNodeColumn>
                          {childNode}
                          {grandSubtree}
                        </ChildNodeColumn>
                      )
                      return (
                        <ChildPair key={pairKey} $childOffset={childLayouts[idx].childOffset}>
                          <ChildPairRow>
                            {childIsLeft
                              ? <>{childWithGrand}{join}{spouseNode}</>
                              : <>{spouseNode}{join}{childWithGrand}</>}
                          </ChildPairRow>
                        </ChildPair>
                      )
                    })}
                  </ChildrenGrid>
                  </ChildrenShiftWrap>
                )}
              </GenerationBlock>
            )}
          </GenerationsInner>
        </TreeCanvas>

        {siblingsModalOpen && (
          <SiblingsListModal
            siblings={siblingList}
            anchorParents={egoParentFks}
            truncated={siblingsTruncated}
            onClose={() => setSiblingsModalOpen(false)}
            onPersonClick={onPersonClick}
          />
        )}
        {ancestorSiblingsOf && (
          <AncestorSiblingsModal
            person={ancestorSiblingsOf.person}
            siblings={ancestorSiblingsOf.siblings}
            truncated={collateralsTruncated}
            onClose={() => setAncestorSiblingsOf(null)}
            onPersonClick={onPersonClick}
          />
        )}
      </Root>
    </FamilyTreeLookupContext.Provider>
  )
}

// ─── 메인 컴포넌트 전용 styled (헤더·캔버스·레이아웃) ─────────────────
const LegendDetails = styled.details`
  align-self: flex-start;
  max-width: 100%;
  font-size: 12px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const LegendSummary = styled.summary`
  width: fit-content;
  cursor: pointer;
  user-select: none;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const LegendBody = styled.p`
  margin: 4px 0 0;
`

const LegendTerm = styled.strong`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  /* 상단 안전 마진 — 부모 컨테이너의 잠재적 클립이나 sticky 헤더에 가려지지 않도록 */
  padding: 4px 0 0;
`

const InfographicHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 20px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);`
      : css`background: ${theme.colors.background.secondary}; border: 1px solid ${theme.colors.border.light};`}
`

const HeaderIcon = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
`

const HeaderText = styled.div`min-width: 0;`

const HeaderTitle = styled.h3`
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.3;
  color: ${({ theme }) => theme.colors.text.primary};
`

const HeaderDesc = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/**
 * BFS take 한도로 잘린 그룹을 알려주는 배너.
 * 사용자가 화면에 안 보이는 인원의 존재를 인지할 수 있도록 헤더 바로 아래에 배치.
 */
const TruncationBanner = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 12px;
  line-height: 1.5;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(245, 158, 11, 0.10)' : 'rgba(245, 158, 11, 0.08)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(245, 158, 11, 0.28)' : 'rgba(245, 158, 11, 0.22)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#92400e')};
`

const TruncationBannerIcon = styled.span`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.18)'};
`

const TruncationBannerText = styled.div`
  min-width: 0;
  flex: 1;
`

const TruncationBannerScope = styled.span`
  font-weight: 700;
`

const TreeCanvas = styled.div`
  /*
   * 외곽 스크롤 컨테이너. 내부 GenerationsInner 가 자연 너비(max-content)를 가지므로
   * 패널 폭이 좁아져도 카드끼리 겹치지 않고 가로 스크롤로만 처리됨.
   * 상단 padding은 InMarriageMark·AncestorSiblingChip 등 카드 모서리 마커가
   * 잘리지 않도록 하기 위함.
   *
   * overflow-y: clip + overflow-clip-margin — 카드 hover 버블이 캔버스 세로 경계를
   * 넘어가도 일정 범위까지 보이도록. clip은 hidden과 달리 스크롤 컨테이너를 만들지
   * 않아 overflow-clip-margin이 그리기 영역을 확장한다. clip 미지원 브라우저는
   * 첫 번째 hidden 선언으로 폴백.
   */
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  overflow-y: clip;
  overflow-clip-margin: 220px;
  padding: 8px 4px 12px;
`

/**
 * 실제 가계도 콘텐츠. width: max-content 로 자연 너비를 가져
 * 외부 패널 폭이 좁을 때 TreeCanvas의 가로 스크롤이 작동.
 * 부모 너비에 맞춰 가운데 정렬은 margin: auto.
 */
const GenerationsInner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: max-content;
  min-width: 100%;
  margin: 0 auto;
`

const SiblingMoreToggle = styled.button`
  align-self: center;
  padding: 6px 12px;
  font-size: 11.5px;
  font-weight: 700;
  border-radius: 999px;
  cursor: pointer;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.10)' : 'rgba(99, 102, 241, 0.07)'};
  color: #6366f1;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.26)' : 'rgba(99, 102, 241, 0.18)'};
  transition: background 0.15s ease;
  white-space: nowrap;
  &:hover, &:focus-within, &:active {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.18)' : 'rgba(99, 102, 241, 0.12)'};
  }
  &:focus-visible {
    outline: 2px solid #6366f1;
    outline-offset: 2px;
  }
`

const GenerationBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
`

/**
 * ParentsRow: ego의 부/모 AncestorColumn을 실측 폭으로 나란히 배치.
 * 균등분할(1fr 1fr) 대신 콘텐츠 shrink-wrap + gap — 부/모 서브트리가 비대칭이어도
 * 각 컬럼이 실제 폭을 가져 부모→ego fork(ForkFromTwoParentsMeasured)가 카드 중심에 정확히 닿는다.
 *
 * align-items: flex-end — 두 컬럼을 아래로 정렬해 부/모 카드가 같은 y에 놓이게.
 * (한쪽 컬럼에만 조부모가 있을 때 반대쪽 부모가 조부모 행에 붙어버리는 문제 방지)
 */
const ParentsRow = styled.div<{ $twoSides: boolean }>`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: flex-end;
  ${({ $twoSides }) => ($twoSides ? css`gap: ${ANC_PARENTS_GAP}px;` : '')}
`

/**
 * FamilyColumn: 조부모 쌍 + fork 선 + 부모 카드를 수직으로 묶음
 */
const FamilyColumn = styled.div<{ $hasParent: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: ${({ $hasParent }) => ($hasParent ? 'flex-end' : 'center')};
`

const GrandparentPair = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: flex-start;
  gap: ${GP_PAIR_GAP}px;
`

/**
 * GrandparentForkTrack: 고정 px 너비를 통해 SVG 내 선 위치를 정확히 유지
 */
const GrandparentForkTrack = styled.div<{ $twoGp: boolean }>`
  width: ${({ $twoGp }) => ($twoGp ? GP_PAIR_W : NODE_W)}px;
  height: 52px;
  margin: 4px 0 0;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(148,163,184,0.5)' : 'rgba(120,113,108,0.55)'};
`

const ForkTrack = styled.div<{ $compact?: boolean; $multiChild?: boolean }>`
  /* 다자녀일 때는 ForkToChildren SVG의 명시적 width를 따름 (fit-content) */
  width: ${({ $multiChild }) => ($multiChild ? 'fit-content' : '100%')};
  max-width: 100%;
  height: ${({ $compact }) => ($compact ? '48px' : '52px')};
  /* 다자녀: ChildPair::before(20px)가 ForkTrack 하단부터 위로 올라오므로 margin-bottom 0 */
  margin: 4px 0 ${({ $multiChild }) => ($multiChild ? '0' : '8px')};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(148,163,184,0.5)' : 'rgba(120,113,108,0.55)'};
`

/**
 * EgoRow: 1fr auto 1fr grid — 본인 카드를 항상 중앙에 고정.
 */
const EgoRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  width: 100%;
`

const EgoSlot = styled.div`
  grid-column: 2;
  display: flex;
  justify-content: center;
`

const SpouseSlot = styled.div<{ $side: 'left' | 'right' }>`
  grid-column: ${({ $side }) => ($side === 'left' ? 1 : 3)};
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-self: ${({ $side }) => ($side === 'left' ? 'end' : 'start')};
`

const SpouseStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${SPOUSE_STACK_GAP}px;
  align-items: center;
  flex-shrink: 0;
`

const SpouseJoin = styled.div<{ $card?: boolean }>`
  position: relative;
  flex: 0 0 ${SPOUSE_JOIN_W}px;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 기본: flex 라인 세로 중앙. $card: 자녀 페어처럼 서브트리로 행이 길어지는 경우
     카드 높이(NODE_H)에 맞춰 상단 정렬 → 하트가 카드 세로 중앙에 고정(빈 공간 부유 방지). */
  ${({ $card }) =>
    $card
      ? css`
          align-self: flex-start;
          height: ${NODE_H}px;
        `
      : css`
          /* ego 배우자 스택 join은 스택 전체 높이로 늘려(SpouseStackJoin 브래킷이
             각 카드 세로 중앙에 닿도록), ♥는 relative 컨테이너 중앙(=버스 중점)에 고정. */
          align-self: stretch;
        `}
  margin: 0 ${SPOUSE_JOIN_MARGIN}px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(148,163,184,0.5)' : 'rgba(120,113,108,0.55)'};
`

const SpouseHeart = styled.span`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  padding: 2px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.mode === 'dark' ? 'rgba(251,113,133,0.95)' : '#e11d48'};
`

const SiblingSlot = styled.div`
  grid-column: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-self: end;
`

const SiblingsStack = styled.div`
  /* 형제자매 가로 스택. wrap 허용 시 SiblingJoin 선이 어색해지므로 nowrap. */
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 12px;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
`

const SiblingJoin = styled.div`
  position: relative;
  flex: 0 0 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  margin: 0 2px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(148,163,184,0.5)' : 'rgba(120,113,108,0.55)'};
`

const SiblingIcon = styled.span`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  padding: 2px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(148,163,184,0.85)' : '#64748b'};
`

/**
 * SingleChildRow: 자녀 1명일 때 ego-row와 동일한 1fr auto 1fr 그리드
 * auto 컬럼(자녀 카드)이 정중앙에 오도록 강제 → fork 수직선과 자녀 중심 일치
 */
const SingleChildRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  /* 손자녀 서브트리가 있으면 중앙 컬럼이 길어지므로 배우자는 카드 윗부분 정렬 */
  align-items: start;
  width: 100%;
`

const ChildSpouseSlot = styled.div<{ $reverse?: boolean }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: ${({ $reverse }) => ($reverse ? 'flex-end' : 'flex-start')};
`

/**
 * ChildrenShiftWrap: 다자녀 세대의 fork 바 + 자녀 그리드를 함께 감싸 center-shift를
 * padding으로 반영(G7). width 미지정 → 콘텐츠+padding에 맞춰 shrink되므로 padding이
 * 레이아웃(및 GenerationsInner max-content 폭)에 참여한다. 이 덕에 좌측으로 밀린
 * 카드가 LTR 스크롤 컨테이너에서 도달 불가하게 잘리지 않는다.
 */
const ChildrenShiftWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`

const ChildrenGrid = styled.div`
  /* 자녀 카드를 한 줄에 나란히 배치. ForkToChildren 정렬 위해 nowrap.
     gap은 CHILD_GAP 상수와 동기화 — fork 가로 바 길이 계산에 같은 값을 사용. */
  display: flex;
  flex-wrap: nowrap;
  width: max-content;
  max-width: none;
  gap: ${CHILD_GAP}px;
  justify-content: center;
  align-items: flex-start;
`

/**
 * ChildPair: 다자녀 행에서 각 자녀+배우자 묶음
 * $childOffset = 자녀 카드 중심의 x 좌표 (ChildPair 좌측 기준 px)
 * ::before → ForkToChildren 가로 바에서 자녀 카드 중심으로 내려오는 수직 세그먼트
 */
const ChildPair = styled.div<{ $childOffset: number }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  flex-shrink: 0;
  flex-grow: 0;
  &::before {
    content: '';
    position: absolute;
    left: ${({ $childOffset }) => $childOffset}px;
    top: -20px;
    width: 1.75px;
    height: 20px;
    transform: translateX(-50%);
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(148,163,184,0.5)' : 'rgba(120,113,108,0.55)'};
  }
`

const ChildPairRow = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: flex-start;
  justify-content: center;
`

const ChildNodeColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
`
