/** GET /persons/:id/family-tree 응답 형태. genealogy-svg 등에서 공통 사용. */
export type FamilyTreePerson = {
  id: string
  name: string
  surname?: string | null
  gender?: string | null
  regnalName?: string | null
  birthYear?: number | null
  deathYear?: number | null
  dynasty?: { id: string; name: string } | null
}

export type FamilyTreeEdge = {
  source: string
  target: string
  type: 'parent-child' | 'spouse'
}

export type FamilyTreeData = {
  egoId: string
  nodes: FamilyTreePerson[]
  edges: FamilyTreeEdge[]
}
