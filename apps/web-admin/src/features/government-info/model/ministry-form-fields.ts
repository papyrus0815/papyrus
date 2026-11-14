import type { AdministrationDepartment } from '@/shared/api/administration-department'
import type { MilitaryUnitTransitionKind } from '@/shared/api/military-unit'

export type AdministrationDepartmentKind = AdministrationDepartment['kind']

export type DepartmentTransitionKind =
  AdministrationDepartment['successors'][number]['kind']

export const DEPARTMENT_TRANSITION_KIND_OPTIONS: ReadonlyArray<{
  value: DepartmentTransitionKind
  label: string
}> = [
  { value: 'REORGANIZE', label: '개편' },
  { value: 'RENAME', label: '명칭변경' },
  { value: 'SPLIT', label: '분할' },
  { value: 'MERGE', label: '통합' },
  { value: 'ABSORBED', label: '흡수' },
]

export type MinistryPredecessorDraft = {
  predecessorId: string
  kind: DepartmentTransitionKind
  era?: 'BC' | 'AD' | null
  year?: number | null
  month?: number | null
  note?: string | null
}

export type MinistrySuccessorDraft = {
  successorId: string
  kind: DepartmentTransitionKind
  era?: 'BC' | 'AD' | null
  year?: number | null
  month?: number | null
  note?: string | null
}

export type MinistryMilitarySuccessorDraft = {
  unitId: string
  kind: MilitaryUnitTransitionKind
  era?: 'BC' | 'AD' | null
  year?: number | null
  month?: number | null
  note?: string | null
}

/** 부처 등록·수정 사이드패널 폼 상태 (`useMinistriesTab`과 동일 구조) */
export type MinistryFormFields = {
  name: string
  nameLocal: string
  nameEn: string
  abbreviation: string
  kind: AdministrationDepartmentKind
  historicalCountryId: string
  parentId: string
  categoryId: string
  thumbnailUrl: string
  description: string
  establishedDate: string
  establishedEra: 'AD' | 'BC'
  establishedYear: number | null
  establishedMonth: number | null
  establishedDay: number | null
  abolishedDate: string
  abolishedEra: 'AD' | 'BC'
  abolishedYear: number | null
  abolishedMonth: number | null
  abolishedDay: number | null
  successorId: string
  predecessorTransitions: MinistryPredecessorDraft[]
  successorTransitions: MinistrySuccessorDraft[]
  militaryUnitSuccessorTransitions: MinistryMilitarySuccessorDraft[]
  linkedMilitaryUnitIds: string[]
  defenseOfficialNameEn: string
  defenseMissionScope: string
  defenseHeadquarters: string
  defenseOrgStructure: string
  defenseBudgetOrForcesNote: string
}
