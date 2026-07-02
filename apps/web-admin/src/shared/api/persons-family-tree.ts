import { getApiConnection } from './client'

export interface FamilyTreePerson {
  id: string
  /**
   * 현재 계정이 이 노드 상세를 열 수 있는지 (서버 계산 — findByIdWithRelations 스코프와 동일).
   * false면 클릭 비활성(dim) 처리 — 노드는 보이나 열면 404 나는 불일치 방지.
   * 비인증 요청 시 서버가 전 노드 true로 내려줌.
   */
  isOwned: boolean
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
  /** 사생아·서출 — UI 별표(*) 마커 */
  illegitimate?: boolean
  /** 어떤 결혼에서 태어난 자녀인지 — 다중 배우자 분기용 PersonSpouse FK */
  parentMarriageId?: string | null
  // 카드 hover/확장용 메타
  originalName?: string | null
  posthumousName?: string | null
  templeName?: string | null
  preEnthronementTitle?: string | null
  birthPlace?: string | null
  deathPlace?: string | null
  /** 가장 이른 재임 — 군주 카드 즉위국·재위 번호 + 국기 */
  sovereignCountry?: {
    id: string | null
    name: string | null
    regnalNumber: number | null
    flagEmoji?: string | null
    isoCode?: string | null
    thumbnailUrl?: string | null
  } | null
  /** 일반 인물 카드 국기 — Person.countryId (legacy 주 국적) */
  country?: {
    id: string
    name: string
    flagEmoji?: string | null
    isoCode?: string | null
    thumbnailUrl?: string | null
  } | null
  /** UI 편의 — 우선순위(sovereignCountry > country) 적용 결과 */
  flag?: {
    countryId: string
    countryName: string
    flagEmoji?: string | null
    isoCode?: string | null
    thumbnailUrl?: string | null
  } | null
}

export interface FamilyTreeEdge {
  source: string
  target: string
  type: 'parent-child' | 'spouse'
  /** spouse 엣지에만: 결혼 시작/종료 연도 + 메모 */
  marriageStartYear?: number | null
  marriageEndYear?: number | null
  note?: string | null
  /** spouse 엣지에만: PersonSpouse 미등록 — 자녀의 다른 친부모로 추정된 배우자 */
  inferred?: boolean
}

export interface FamilyTreeTruncation {
  scope: string
  took: number
  limit: number
}

export interface FamilyTreeData {
  egoId: string
  nodes: FamilyTreePerson[]
  edges: FamilyTreeEdge[]
  /** BFS take 한계로 절단된 항목 — UI에 "외 N명" 표시용 */
  truncations?: FamilyTreeTruncation[]
}

export interface GetPersonFamilyTreeOptions {
  /**
   * 방계 친척(삼촌·이모·고모·조카·종조부·고종조부 등)을 BFS에 포함할지 여부.
   * 기본 true — 끄면 응답·DB 비용이 줄지만 조상 카드의 "형제 N" 칩이 사라진다.
   */
  includeCollaterals?: boolean
}

export async function getPersonFamilyTree(
  personId: string,
  opts?: GetPersonFamilyTreeOptions,
): Promise<FamilyTreeData> {
  const conn = getApiConnection()
  const qs = opts?.includeCollaterals === false ? '?includeCollaterals=false' : ''
  const res = await fetch(`${conn.host}/persons/${personId}/family-tree${qs}`, {
    headers: conn.headers as Record<string, string>,
  })
  if (!res.ok) throw new Error(`Family tree fetch failed: ${res.status}`)
  return res.json()
}
