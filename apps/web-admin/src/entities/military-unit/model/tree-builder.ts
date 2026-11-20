import { sortUnitsByEchelon } from './formatters'

export interface MinimalHierarchyUnit {
  id: string
  name: string
  abbreviation?: string | null
  unitType?: string | null
  branch?: string | null
  parentUnitId?: string | null
  parentUnit?: {
    id: string
    name: string
    abbreviation?: string | null
    unitType?: string | null
    parentUnitId?: string | null
    administrationDepartment?: {
      id: string
      name: string
      abbreviation?: string | null
    } | null
  } | null
  administrationDepartment?: {
    id: string
    name: string
    abbreviation?: string | null
  } | null
}

export function buildUnitByIdMap<T extends { id: string }>(
  units: ReadonlyArray<T>,
  extraUnit?: T | null,
): Map<string, T> {
  const map = new Map<string, T>()
  for (const unitItem of units) {
    map.set(unitItem.id, unitItem)
  }
  if (extraUnit) {
    map.set(extraUnit.id, extraUnit)
  }
  return map
}

export function buildChildrenByParentMap<
  T extends { id: string; name: string; unitType?: string | null; parentUnitId?: string | null },
>(units: ReadonlyArray<T>): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const unitItem of units) {
    if (!unitItem.parentUnitId) continue
    const bucket = map.get(unitItem.parentUnitId) ?? []
    bucket.push(unitItem)
    map.set(unitItem.parentUnitId, bucket)
  }
  for (const [parentId, bucket] of map.entries()) {
    map.set(parentId, sortUnitsByEchelon(bucket))
  }
  return map
}

export function resolveUnitAncestorsAndDepartment<
  T extends MinimalHierarchyUnit,
>(
  unit: T | null | undefined,
  unitByIdMap: Map<string, T>,
): {
  ancestorChain: Array<{
    id: string
    name: string
    abbreviation?: string | null
    unitType?: string | null
  }>
  effectiveDepartment: {
    dept: { id: string; name: string; abbreviation?: string | null } | null
    inherited: boolean
  }
} {
  if (!unit) {
    return {
      ancestorChain: [],
      effectiveDepartment: { dept: null, inherited: false },
    }
  }

  const chain: Array<{
    id: string
    name: string
    abbreviation?: string | null
    unitType?: string | null
  }> = []

  let inheritedDept: {
    id: string
    name: string
    abbreviation?: string | null
  } | null = unit.administrationDepartment ?? null
  let isInherited = false

  const visited = new Set<string>([unit.id])
  let cursorId: string | null | undefined =
    unit.parentUnitId ?? unit.parentUnit?.id ?? null

  if (!inheritedDept && unit.parentUnit?.administrationDepartment) {
    inheritedDept = unit.parentUnit.administrationDepartment
    isInherited = true
  }

  let hopCount = 0
  while (cursorId && !visited.has(cursorId) && hopCount < 16) {
    visited.add(cursorId)
    hopCount += 1
    const found = unitByIdMap.get(cursorId)
    if (found) {
      chain.unshift({
        id: found.id,
        name: found.name,
        abbreviation: found.abbreviation,
        unitType: found.unitType,
      })
      if (!inheritedDept && found.administrationDepartment) {
        inheritedDept = found.administrationDepartment
        isInherited = true
      }
      cursorId = found.parentUnitId ?? found.parentUnit?.id ?? null
    } else if (
      chain.length === 0 &&
      unit.parentUnit &&
      unit.parentUnit.id === cursorId
    ) {
      chain.unshift({
        id: unit.parentUnit.id,
        name: unit.parentUnit.name,
        abbreviation: unit.parentUnit.abbreviation,
        unitType: unit.parentUnit.unitType,
      })
      cursorId = unit.parentUnit.parentUnitId ?? null
    } else {
      break
    }
  }

  return {
    ancestorChain: chain,
    effectiveDepartment: { dept: inheritedDept, inherited: isInherited },
  }
}

export function resolveEffectiveDepartmentForUnit<
  T extends MinimalHierarchyUnit,
>(
  unitItem: T,
  unitByIdMap: Map<string, T>,
): { id: string; name: string; abbreviation?: string | null } | null {
  const visited = new Set<string>()
  let cursor: T | undefined = unitItem
  while (cursor && !visited.has(cursor.id)) {
    visited.add(cursor.id)
    if (cursor.administrationDepartment) {
      return cursor.administrationDepartment
    }
    cursor = cursor.parentUnitId
      ? unitByIdMap.get(cursor.parentUnitId)
      : undefined
  }
  return null
}
