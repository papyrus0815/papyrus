import type { FamilyTreePerson } from '@/shared/api/persons-family-tree'
import type { PersonNameFields } from '@/shared/lib/person-display-name'

/**
 * 인포그래픽 내부 카드 데이터 모델.
 * REST(`getPersonDetailById`)에서 오면 birthDate/deathDate가 채워지고,
 * BFS(`getPersonFamilyTree`) → ftPersonToNodePerson 변환을 거치면 birthYear/deathYear가 채워진다.
 * 두 경로의 카드를 동일 컴포넌트로 그릴 수 있도록 두 셋 모두 optional로 둔다.
 */
export type NodePerson = PersonNameFields & {
  id?: string
  gender?: string | null
  profileImageUrl?: string | null
  profileImages?: { url?: string | null }[] | null
  dynasty?: { id?: string; name?: string | null } | null
  birthDate?: string | Date | null
  deathDate?: string | Date | null
  /** BFS 응답에서만 채워지는 연도 폴백 — birthDate/deathDate가 없을 때 lifeSpan 계산용 */
  birthYear?: number | null
  deathYear?: number | null
  /** BC/AD — birthYear/deathYear는 크기값(양수)이라 era 없이는 BC가 AD로 둔갑한다.
   *  REST(PersonDetailData) 소스는 birthEra가 느슨한 string이라 넓게 받는다. */
  birthEra?: string | null
  deathEra?: string | null
  originalName?: string | null
  posthumousName?: string | null
  templeName?: string | null
  preEnthronementTitle?: string | null
  birthPlace?: string | null
  deathPlace?: string | null
  illegitimate?: boolean | null
  parentMarriageId?: string | null
  /**
   * 부모 FK 스칼라 — 형제 친/이복/이부 판별(classifySiblingKinship) 입력.
   * BFS(ftPersonToNodePerson)와 REST 상세 siblings 투영 양쪽에서 채워진다.
   */
  fatherId?: string | null
  motherId?: string | null
  /**
   * BFS spouse 엣지 provenance — true면 PersonSpouse 미등록(자녀의 다른 친부모로 추론된
   * 배우자). 확정 배우자와 구분해 '배우자(추정)'로 표시(오정보 방지).
   */
  inferred?: boolean | null
  marriageStartYear?: number | null
  marriageEndYear?: number | null
  country?: {
    id?: string
    name?: string | null
    flagEmoji?: string | null
    isoCode?: string | null
    thumbnailUrl?: string | null
  } | null
  /** BFS 응답에서만 — 군주 카드 즉위국·재위 번호 */
  sovereignCountry?: FamilyTreePerson['sovereignCountry']
}

export type ChildPerson = NodePerson & { spouse?: NodePerson | null }

export type AvatarRole =
  | 'grandparent'
  | 'grandparentAlt'
  | 'parent'
  | 'parentAlt'
  | 'ego'
  | 'spouse'
  | 'child'
  | 'descendant'
  | 'sibling'
  | 'ancestor'

/** 국기 표시용 source — emoji > thumbnailUrl > flagcdn(isoCode) 우선순위 */
export type FlagSource =
  | {
      flagEmoji?: string | null
      isoCode?: string | null
      thumbnailUrl?: string | null
    }
  | null
  | undefined

export type PersonMetaSource = {
  originalName?: string | null
  posthumousName?: string | null
  templeName?: string | null
  preEnthronementTitle?: string | null
  birthPlace?: string | null
  deathPlace?: string | null
  /** 형제 카드 전용(withSiblingKinshipMeta 주입) — 부모 이름·판별불가 고지 */
  fatherName?: string | null
  motherName?: string | null
  kinshipNote?: string | null
}

export type PersonTooltipLine = { label: string; value: string }
