import { createContext } from 'react'
import type { FamilyTreePerson } from '@/shared/api/persons-family-tree'

/**
 * familyTreeData.nodes 의 id→FamilyTreePerson 룩업.
 * 주 사용처: NodePerson 카드(부모·형제·배우자·자녀)가 country 필드를 갖지 않을 때
 * 같은 ID로 BFS 응답에서 country/sovereignCountry 정보를 보완.
 */
export const FamilyTreeLookupContext = createContext<Map<string, FamilyTreePerson>>(
  new Map(),
)
