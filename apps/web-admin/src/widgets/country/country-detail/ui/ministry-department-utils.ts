/**
 * 중앙부처 계층(parentId) 공통 유틸
 */
import type {
  AdministrationDepartment,
  AdministrationDepartmentCategory,
} from '@/shared/api/administration-department'

/** 국방·군사 기관 전용 확장 필드 — 본문 `description` 끝에 마커로 직렬화 */
export type DefenseDeptFormExtension = {
  officialNameEn: string
  missionScope: string
  headquarters: string
  orgStructure: string
  budgetOrForcesNote: string
}

const DEFENSE_MARKER_START = '<!--papyrus-dept-defense:'
const DEFENSE_MARKER_END = '-->'

function encodeDefenseExt(ext: DefenseDeptFormExtension): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(ext))))
}

function decodeDefenseExt(encoded: string): DefenseDeptFormExtension | null {
  try {
    const json = decodeURIComponent(escape(atob(encoded)))
    const o = JSON.parse(json) as Record<string, unknown>
    if (!o || typeof o !== 'object') return null
    return {
      officialNameEn: String(o.officialNameEn ?? ''),
      missionScope: String(o.missionScope ?? ''),
      headquarters: String(o.headquarters ?? ''),
      orgStructure: String(o.orgStructure ?? ''),
      budgetOrForcesNote: String(o.budgetOrForcesNote ?? ''),
    }
  } catch {
    return null
  }
}

export function hasDefenseExtensionContent(
  ext: DefenseDeptFormExtension | null | undefined,
): boolean {
  if (!ext) return false
  return [
    ext.officialNameEn,
    ext.missionScope,
    ext.headquarters,
    ext.orgStructure,
    ext.budgetOrForcesNote,
  ].some((s) => String(s).trim().length > 0)
}

/** 부처 설명에서 국방 확장 블록 분리 */
export function parseDepartmentDescription(raw: string | null | undefined): {
  cleanDescription: string
  defense: DefenseDeptFormExtension | null
} {
  const s = raw ?? ''
  const idx = s.lastIndexOf(DEFENSE_MARKER_START)
  if (idx === -1) return { cleanDescription: s.trim(), defense: null }
  const end = s.indexOf(DEFENSE_MARKER_END, idx)
  if (end === -1) return { cleanDescription: s.trim(), defense: null }
  const encoded = s.slice(idx + DEFENSE_MARKER_START.length, end).trim()
  const cleanDescription = s.slice(0, idx).trim()
  const defense = decodeDefenseExt(encoded)
  return { cleanDescription, defense }
}

export function buildDepartmentDescription(
  cleanDescription: string,
  defense: DefenseDeptFormExtension | null,
  isDefenseCategory: boolean,
): string {
  let out = cleanDescription.trim()
  if (isDefenseCategory && defense && hasDefenseExtensionContent(defense)) {
    const encoded = encodeDefenseExt(defense)
    out += `\n\n${DEFENSE_MARKER_START}${encoded}${DEFENSE_MARKER_END}`
  }
  return out
}

/** 카테고리가 국방·군사 계열인지 (등록 폼·상세 톤 분기) */
export function isDefenseRelatedCategory(
  category: AdministrationDepartmentCategory | null | undefined,
): boolean {
  if (!category) return false
  const ko = category.name ?? ''
  const en = category.nameEn ?? ''
  return (
    /국방|군사|국군|전쟁|합참|군/i.test(ko) ||
    /defense|military|armed|forces|war|jcs|joint\s*chiefs/i.test(en)
  )
}

/** 목록 내에서 루트(부모가 없거나 부모가 목록 밖) */
export function buildForest(
  deptList: AdministrationDepartment[],
): AdministrationDepartment[] {
  const ids = new Set(deptList.map((d) => d.id))
  return deptList.filter((d) => !d.parentId || !ids.has(d.parentId))
}

export function childrenOf(
  parentId: string,
  deptList: AdministrationDepartment[],
): AdministrationDepartment[] {
  return deptList
    .filter((d) => d.parentId === parentId)
    .sort((a, b) =>
      a.name.localeCompare(b.name, 'ko', { sensitivity: 'base' }),
    )
}

/**
 * parentId 체인을 따라가며 목록 안에서 순환이 있는지 검사
 */
export function hasParentCycleInList(
  list: AdministrationDepartment[],
): boolean {
  const ids = new Set(list.map((d) => d.id))
  const byId = new Map(list.map((d) => [d.id, d] as const))
  for (const start of list) {
    const path = new Set<string>()
    let cur: string | undefined = start.id
    for (let i = 0; i <= list.length + 1; i++) {
      if (!cur || !ids.has(cur)) break
      if (path.has(cur)) return true
      path.add(cur)
      cur = byId.get(cur)?.parentId ?? undefined
    }
  }
  return false
}

/**
 * 국가 전체 부처 목록에서 rootId 아래(직·간접) 자식 수 (본인 제외)
 */
export function countDescendantsInDepartmentTree(
  rootId: string,
  allDepartments: AdministrationDepartment[],
): number {
  const direct = allDepartments.filter((d) => d.parentId === rootId)
  let n = direct.length
  for (const c of direct) {
    n += countDescendantsInDepartmentTree(c.id, allDepartments)
  }
  return n
}

const emptyDefenseFields = (): DefenseDeptFormExtension => ({
  officialNameEn: '',
  missionScope: '',
  headquarters: '',
  orgStructure: '',
  budgetOrForcesNote: '',
})

export function ministryFormFieldsFromDepartment(
  dept: AdministrationDepartment,
) {
  const { cleanDescription, defense } = parseDepartmentDescription(
    dept.description,
  )
  const d = defense ?? emptyDefenseFields()
  return {
    name: dept.name,
    parentId: dept.parentId ?? '',
    categoryId: dept.categoryId ?? '',
    thumbnailUrl: dept.thumbnailUrl ?? '',
    description: cleanDescription,
    establishedDate: dept.establishedDate
      ? dept.establishedDate.slice(0, 10)
      : '',
    abolishedDate: dept.abolishedDate ? dept.abolishedDate.slice(0, 10) : '',
    successorId: dept.successorId ?? '',
    defenseOfficialNameEn: d.officialNameEn,
    defenseMissionScope: d.missionScope,
    defenseHeadquarters: d.headquarters,
    defenseOrgStructure: d.orgStructure,
    defenseBudgetOrForcesNote: d.budgetOrForcesNote,
  }
}

export function emptyMinistryFormFields(categoryId: string, parentId = '') {
  return {
    name: '',
    parentId,
    categoryId,
    thumbnailUrl: '',
    description: '',
    establishedDate: '',
    abolishedDate: '',
    successorId: '',
    defenseOfficialNameEn: '',
    defenseMissionScope: '',
    defenseHeadquarters: '',
    defenseOrgStructure: '',
    defenseBudgetOrForcesNote: '',
  }
}

/** 부처 이름·소속 카테고리 표기(한/영)로 검색 */
export function filterDepartmentsBySearchQuery(
  departments: AdministrationDepartment[],
  query: string,
): AdministrationDepartment[] {
  const q = query.trim().toLowerCase()
  if (!q) return departments
  return departments.filter((d) => {
    if (d.name.toLowerCase().includes(q)) return true
    const c = d.category
    if (c?.name && c.name.toLowerCase().includes(q)) return true
    if (c?.nameEn && c.nameEn.toLowerCase().includes(q)) return true
    return false
  })
}

/** 국가 부처 목록으로 카테고리별 개수 (탭 배지용) */
export function countDepartmentsByCategoryId(
  departments: AdministrationDepartment[],
): Map<string, number> {
  const m = new Map<string, number>()
  for (const d of departments) {
    const cid = d.categoryId
    if (!cid) continue
    m.set(cid, (m.get(cid) ?? 0) + 1)
  }
  return m
}
