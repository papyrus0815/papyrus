/* eslint-disable no-restricted-syntax -- 짧은 루프·콜백 변수(o, d, c 등) 유지(레거시 호환) */
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
  _defense?: DefenseDeptFormExtension | null,
  _isDefenseCategory?: boolean,
): string {
  return cleanDescription.trim()
}

/** 전체 부처·국가기관을 한눈에 보는 통합 탭 ID */
export const ALL_DEPARTMENTS_CATEGORY_ID = '__all__'

/** 카테고리가 미지정(`categoryId == null`)인 부처를 표시하기 위한 가상 카테고리 탭 ID */
export const UNCATEGORIZED_CATEGORY_ID = '__uncategorized__'

/** 카테고리가 국방·군사 계열인지 (등록 폼·상세 톤 분기; 레거시 문자열 kind도 안전 허용) */
export function isDefenseRelatedCategory(
  category: AdministrationDepartmentCategory | null | undefined,
  kind?: string | null,
): boolean {
  if (kind === 'MILITARY_COMMAND') return true
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
 * 국가 전체 부처 목록에서 rootId 아래(직·간접) 자식 ID 집합 반환 (본인 미포함)
 */
export function collectDescendantDepartmentIds(
  rootId: string,
  allDepartments: AdministrationDepartment[],
): Set<string> {
  const result = new Set<string>()
  const queue = [rootId]
  while (queue.length > 0) {
    const curId = queue.shift()!
    for (const deptItem of allDepartments) {
      if (deptItem.parentId === curId && !result.has(deptItem.id)) {
        result.add(deptItem.id)
        queue.push(deptItem.id)
      }
    }
  }
  return result
}

/**
 * 국가 전체 부처 목록에서 rootId 아래(직·간접) 자식 수 (본인 제외)
 */
export function countDescendantsInDepartmentTree(
  rootId: string,
  allDepartments: AdministrationDepartment[],
): number {
  return collectDescendantDepartmentIds(rootId, allDepartments).size
}

const emptyDefenseFields = (): DefenseDeptFormExtension => ({
  officialNameEn: '',
  missionScope: '',
  headquarters: '',
  orgStructure: '',
  budgetOrForcesNote: '',
})

function parseIsoOrStructuredDate(
  parts: AdministrationDepartment['established'] | null | undefined,
  isoStr: string | null | undefined,
): {
  era: 'AD' | 'BC'
  year: number | null
  month: number | null
  day: number | null
  isoInput: string
} {
  if (parts && typeof parts.year === 'number' && parts.year > 0) {
    const era = parts.era === 'BC' ? 'BC' : 'AD'
    const year = parts.year
    const month = parts.month ?? null
    const day = parts.day ?? null
    const isoInput =
      era === 'AD' && month != null && day != null
        ? `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        : ''
    return { era, year, month, day, isoInput }
  }
  const raw = (isoStr ?? '').trim().split('T')[0]
  if (!raw) {
    return { era: 'AD', year: null, month: null, day: null, isoInput: '' }
  }
  if (raw.startsWith('-')) {
    const bcMatch = raw.match(/^-(\d{1,6})-(\d{2})-(\d{2})$/)
    if (bcMatch) {
      return {
        era: 'BC',
        year: Number.parseInt(bcMatch[1], 10),
        month: Number.parseInt(bcMatch[2], 10),
        day: Number.parseInt(bcMatch[3], 10),
        isoInput: '',
      }
    }
  }
  const adMatch = raw.match(/^(\d{1,4})-(\d{2})-(\d{2})$/)
  if (adMatch) {
    return {
      era: 'AD',
      year: Number.parseInt(adMatch[1], 10),
      month: Number.parseInt(adMatch[2], 10),
      day: Number.parseInt(adMatch[3], 10),
      isoInput: raw,
    }
  }
  return { era: 'AD', year: null, month: null, day: null, isoInput: raw }
}

export function ministryFormFieldsFromDepartment(
  dept: AdministrationDepartment,
) {
  const { cleanDescription, defense } = parseDepartmentDescription(
    dept.description,
  )
  const d = defense ?? emptyDefenseFields()
  const estParsed = parseIsoOrStructuredDate(
    dept.established,
    dept.establishedDate,
  )
  const abolParsed = parseIsoOrStructuredDate(
    dept.abolished,
    dept.abolishedDate,
  )
  return {
    name: dept.name,
    nameLocal: dept.nameLocal ?? '',
    nameEn: dept.nameEn ?? d.officialNameEn ?? '',
    abbreviation: dept.abbreviation ?? '',
    kind: dept.kind ?? 'MINISTRY',
    historicalCountryId: dept.historicalCountryId ?? '',
    parentId: dept.parentId ?? '',
    categoryId: dept.categoryId ?? '',
    thumbnailUrl: dept.thumbnailUrl ?? '',
    description: cleanDescription,
    establishedDate: estParsed.isoInput,
    establishedEra: estParsed.era,
    establishedYear: estParsed.year,
    establishedMonth: estParsed.month,
    establishedDay: estParsed.day,
    abolishedDate: abolParsed.isoInput,
    abolishedEra: abolParsed.era,
    abolishedYear: abolParsed.year,
    abolishedMonth: abolParsed.month,
    abolishedDay: abolParsed.day,
    successorId: dept.successors?.[0]?.department.id ?? '',
    predecessorTransitions: (dept.predecessors ?? []).map((item) => ({
      predecessorId: item.department.id,
      kind: ((item.kind as string) === 'ABSORB'
        ? 'ABSORBED'
        : (item.kind ?? 'REORGANIZE')) as AdministrationDepartment['successors'][number]['kind'],
      era: item.era ?? null,
      year: item.year ?? null,
      month: item.month ?? null,
      note: item.note ?? null,
    })),
    successorTransitions: (dept.successors ?? []).map((item) => ({
      successorId: item.department.id,
      kind: ((item.kind as string) === 'ABSORB'
        ? 'ABSORBED'
        : (item.kind ?? 'REORGANIZE')) as AdministrationDepartment['successors'][number]['kind'],
      era: item.era ?? null,
      year: item.year ?? null,
      month: item.month ?? null,
      note: item.note ?? null,
    })),
    militaryUnitSuccessorTransitions: (dept.militaryUnitSuccessors ?? [])
      .filter((item) => Boolean(item.militaryUnit?.id))
      .map((item) => ({
        unitId: item.militaryUnit.id,
        kind: ((item.kind as string) === 'ABSORB'
          ? 'ABSORBED'
          : (item.kind ?? 'REORGANIZE')) as AdministrationDepartment['successors'][number]['kind'],
        era: item.era ?? null,
        year: item.year ?? null,
        month: item.month ?? null,
        note: item.note ?? null,
      })),
    linkedMilitaryUnitIds: (dept.militaryUnits ?? []).map((unit) => unit.id),
    defenseOfficialNameEn: dept.nameEn ?? d.officialNameEn,
    defenseMissionScope: dept.primaryMission ?? d.missionScope ?? '',
    defenseHeadquarters: dept.headquarters ?? d.headquarters ?? '',
    defenseOrgStructure: dept.orgStructure ?? d.orgStructure ?? '',
    defenseBudgetOrForcesNote: dept.budgetNote ?? d.budgetOrForcesNote ?? '',
  }
}

export function emptyMinistryFormFields(
  categoryId: string,
  parentId = '',
  historicalCountryId = '',
  defaultKind: NonNullable<AdministrationDepartment['kind']> = 'MINISTRY',
) {
  return {
    name: '',
    nameLocal: '',
    nameEn: '',
    abbreviation: '',
    kind: defaultKind,
    historicalCountryId,
    parentId,
    categoryId:
      categoryId === UNCATEGORIZED_CATEGORY_ID ||
      categoryId === ALL_DEPARTMENTS_CATEGORY_ID
        ? ''
        : categoryId,
    thumbnailUrl: '',
    description: '',
    establishedDate: '',
    establishedEra: 'AD' as const,
    establishedYear: null as number | null,
    establishedMonth: null as number | null,
    establishedDay: null as number | null,
    abolishedDate: '',
    abolishedEra: 'AD' as const,
    abolishedYear: null as number | null,
    abolishedMonth: null as number | null,
    abolishedDay: null as number | null,
    successorId: '',
    predecessorTransitions: [],
    successorTransitions: [],
    militaryUnitSuccessorTransitions: [],
    linkedMilitaryUnitIds: [],
    defenseOfficialNameEn: '',
    defenseMissionScope: '',
    defenseHeadquarters: '',
    defenseOrgStructure: '',
    defenseBudgetOrForcesNote: '',
  }
}

/** 부처 이름·원어명·영문명·약칭·주요 임무·청사·소속 카테고리·역사국가 표기(한/영)로 검색 */
export function filterDepartmentsBySearchQuery(
  departments: AdministrationDepartment[],
  query: string,
): AdministrationDepartment[] {
  const q = query.trim().toLowerCase()
  if (!q) return departments
  return departments.filter((d) => {
    if (d.name.toLowerCase().includes(q)) return true
    if (d.nameLocal && d.nameLocal.toLowerCase().includes(q)) return true
    if (d.nameEn && d.nameEn.toLowerCase().includes(q)) return true
    if (d.abbreviation && d.abbreviation.toLowerCase().includes(q)) return true
    if (d.primaryMission && d.primaryMission.toLowerCase().includes(q))
      return true
    if (d.headquarters && d.headquarters.toLowerCase().includes(q)) return true
    if (
      d.historicalCountry?.name &&
      d.historicalCountry.name.toLowerCase().includes(q)
    )
      return true
    const c = d.category
    if (c?.name && c.name.toLowerCase().includes(q)) return true
    if (c?.nameEn && c.nameEn.toLowerCase().includes(q)) return true
    return false
  })
}

/** 국가 부처 목록으로 카테고리별 개수 (탭 배지용, 전체·미분류 포함) */
export function countDepartmentsByCategoryId(
  departments: AdministrationDepartment[],
): Map<string, number> {
  const m = new Map<string, number>()
  m.set(ALL_DEPARTMENTS_CATEGORY_ID, departments.length)
  for (const d of departments) {
    const cid = d.categoryId || UNCATEGORIZED_CATEGORY_ID
    m.set(cid, (m.get(cid) ?? 0) + 1)
  }
  return m
}
