import { getApiConnection } from './client'

export interface FamilyTreePerson {
  id: string
  name: string
  surname?: string | null
  middleName?: string | null
  nameDisplayOrder?: string | null
  gender?: string | null
  regnalName?: string | null
  profileImageUrl?: string | null
  birthYear?: number | null
  deathYear?: number | null
  dynasty?: { id: string; name: string } | null
}

export interface FamilyTreeEdge {
  source: string
  target: string
  type: 'parent-child' | 'spouse'
}

export interface FamilyTreeData {
  egoId: string
  nodes: FamilyTreePerson[]
  edges: FamilyTreeEdge[]
}

export async function getPersonFamilyTree(personId: string): Promise<FamilyTreeData> {
  const conn = getApiConnection()
  const res = await fetch(`${conn.host}/persons/${personId}/family-tree`, {
    headers: conn.headers as Record<string, string>,
  })
  if (!res.ok) throw new Error(`Family tree fetch failed: ${res.status}`)
  return res.json()
}
