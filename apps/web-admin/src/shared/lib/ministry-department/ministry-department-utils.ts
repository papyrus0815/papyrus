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
    headquartersLatitude:
      dept.headquartersLatitude != null && dept.headquartersLongitude != null
        ? Number(dept.headquartersLatitude)
        : null,
    headquartersLongitude:
      dept.headquartersLatitude != null && dept.headquartersLongitude != null
        ? Number(dept.headquartersLongitude)
        : null,
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
    headquartersLatitude: null as number | null,
    headquartersLongitude: null as number | null,
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

/**
 * 중앙부처·국가기관의 존속 상태 분류
 * - ACTIVE: 현재도 존속 중인 현대 국가 기관
 * - SUPERSEDED: 후신 행정기관 또는 후신 군 사령부로 개편·이관된 기관
 * - ABOLISHED: 폐지 연도가 명시된 폐지 기관
 * - HISTORICAL_ENDED: 폐지일이 미기재여도 소멸한 역사국가(제국·왕조·구체제) 소속인 역사 기관
 */
export type DepartmentLifecycleStatus =
  | 'ACTIVE'
  | 'SUPERSEDED'
  | 'ABOLISHED'
  | 'HISTORICAL_ENDED'

export const DEPARTMENT_LIFECYCLE_LABEL: Record<
  DepartmentLifecycleStatus,
  string
> = {
  ACTIVE: '현존 기관',
  SUPERSEDED: '개편·이관',
  ABOLISHED: '폐지 기관',
  HISTORICAL_ENDED: '역사 기관',
}

export type HistoricalPolityYearSpan = {
  startSignedYear?: number | null
  endSignedYear?: number | null
  startEra?: string | null
  startYear?: number | null
  endEra?: string | null
  endYear?: number | null
}

export function toSignedHistoricalYear(
  era?: string | null,
  year?: number | null,
): number | null {
  if (year == null || !Number.isFinite(year) || year <= 0) return null
  return era === 'BC' ? -Math.abs(year) : Math.abs(year)
}

function extractSignedYearFromDeptDate(
  structured:
    | {
        era?: string | null
        year?: number | null
      }
    | null
    | undefined,
  isoFallback: string | null | undefined,
): number | null {
  if (structured && structured.year != null && structured.year > 0) {
    return structured.era === 'BC'
      ? -Math.abs(structured.year)
      : structured.year
  }
  if (!isoFallback) return null
  const trimmed = isoFallback.trim()
  const bcPrefix = /^BC\s*(\d{1,6})/i.exec(trimmed)
  if (bcPrefix) return -Number.parseInt(bcPrefix[1], 10)
  const signedMatch = /^(-?\d{1,6})/.exec(trimmed)
  if (!signedMatch) return null
  const parsed = Number.parseInt(signedMatch[1], 10)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * 기관의 실제 존속 상태를 판정한다.
 * 과거 제국·왕조(`historicalCountryId != null`) 소속 기관에 폐지 연도가 비어 있거나
 * 후신 기관(`successors`)으로 이미 개편된 기관이 '현존 기관'으로 오표기되는 문제를 방지한다.
 */
export function resolveDepartmentLifecycleStatus(
  dept: Pick<
    AdministrationDepartment,
    'historicalCountryId' | 'abolished' | 'abolishedDate'
  > & {
    successors?: ReadonlyArray<unknown> | null
    militaryUnitSuccessors?: ReadonlyArray<unknown> | null
  },
  options?: {
    /** 소속 역사국가의 존속 종료 여부 (미전달 시 historicalCountryId 존재 여부로 소멸 역사국가 간주) */
    politySpan?: HistoricalPolityYearSpan | null
  },
): DepartmentLifecycleStatus {
  const hasSuccessors =
    (dept.successors?.length ?? 0) > 0 ||
    (dept.militaryUnitSuccessors?.length ?? 0) > 0
  const hasExplicitAbolished =
    Boolean(dept.abolished && dept.abolished.year != null) ||
    Boolean(dept.abolishedDate && dept.abolishedDate.trim())

  if (hasSuccessors) {
    return 'SUPERSEDED'
  }
  if (hasExplicitAbolished) {
    return 'ABOLISHED'
  }
  if (dept.historicalCountryId) {
    // 명시적으로 현존 정체(endSignedYear === null 이면서 startSignedYear가 정의된 현행 체제 예외가 아닌 한) 역사국가 소속은 역사 기관으로 분류
    const span = options?.politySpan
    if (!span || span.endSignedYear !== null) {
      return 'HISTORICAL_ENDED'
    }
    return 'HISTORICAL_ENDED'
  }
  return 'ACTIVE'
}

/**
 * 특정 기준 연도(부호 정수: 기원전 음수, 서기 양수)에 해당 기관이 존속했는지 판정한다.
 * - 설립·폐지 연도가 모두 비어 있어도 소속 역사국가의 존속 구간(`politySpan`)이 있으면 그 구간으로 보정한다.
 * - 폐지 연도가 비어 있는 역사국가 기관은 역사국가 종료 연도(`politySpan.endSignedYear`)를 상한으로 삼아
 *   현대 연도(예: 2025) 조회 시 멸망한 제국 부처가 섞여 나오지 않게 한다.
 */
export function isDepartmentActiveAtSignedYear(
  dept: Pick<
    AdministrationDepartment,
    | 'historicalCountryId'
    | 'established'
    | 'establishedDate'
    | 'abolished'
    | 'abolishedDate'
  >,
  targetSignedYear: number,
  politySpan?: HistoricalPolityYearSpan | null,
): boolean {
  if (!Number.isFinite(targetSignedYear) || targetSignedYear === 0) return true

  const estYear = extractSignedYearFromDeptDate(
    dept.established,
    dept.establishedDate,
  )
  const abolYear = extractSignedYearFromDeptDate(
    dept.abolished,
    dept.abolishedDate,
  )

  const polityStartSigned =
    politySpan?.startSignedYear !== undefined
      ? politySpan.startSignedYear
      : toSignedHistoricalYear(politySpan?.startEra, politySpan?.startYear)
  const polityEndSigned =
    politySpan?.endSignedYear !== undefined
      ? politySpan.endSignedYear
      : toSignedHistoricalYear(politySpan?.endEra, politySpan?.endYear)

  const effectiveStartYear = estYear ?? polityStartSigned ?? null
  const effectiveEndYear =
    abolYear ?? (dept.historicalCountryId ? (polityEndSigned ?? null) : null)

  if (effectiveStartYear == null && effectiveEndYear == null) {
    return false
  }
  if (effectiveStartYear != null && targetSignedYear < effectiveStartYear) {
    return false
  }
  if (effectiveEndYear != null && targetSignedYear > effectiveEndYear) {
    return false
  }
  // 역사국가 소속인데 설립 연도만 있고 폐지 연도·역사국가 종료 연도 정보가 전혀 없을 때,
  // 현대 시점(현재 연도 인근)으로 무한 연장되지 않도록 방어
  if (
    dept.historicalCountryId &&
    effectiveEndYear == null &&
    effectiveStartYear != null &&
    targetSignedYear - effectiveStartYear > 150 &&
    targetSignedYear >= 1945
  ) {
    return false
  }
  return true
}
