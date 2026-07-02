import { createContext, useContext } from 'react'
import type { FamilyTreePerson } from '@/shared/api/persons-family-tree'

/**
 * familyTreeData.nodes 의 id→FamilyTreePerson 룩업.
 * 주 사용처: NodePerson 카드(부모·형제·배우자·자녀)가 country 필드를 갖지 않을 때
 * 같은 ID로 BFS 응답에서 country/sovereignCountry 정보를 보완.
 */
export const FamilyTreeLookupContext = createContext<Map<string, FamilyTreePerson>>(
  new Map(),
)

/**
 * 이 노드의 상세를 현재 계정이 열 수 있는지 (서버 isOwned 기반).
 * BFS 응답(lookup)에 있고 isOwned=false면 클릭 비활성(열면 404) → false 반환.
 * lookup에 없으면(로딩중·직접prop 전용 노드) 정보가 없으므로 제한하지 않음(true).
 */
export function useNodeOpenable(id?: string | null): boolean {
  const lookup = useContext(FamilyTreeLookupContext)
  if (!id) return true
  return lookup.get(id)?.isOwned !== false
}
