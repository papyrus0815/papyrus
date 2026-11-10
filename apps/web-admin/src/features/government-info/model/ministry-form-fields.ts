import type { AdministrationDepartment } from '@/shared/api/administration-department'

export type AdministrationDepartmentKind = AdministrationDepartment['kind']

/** 부처 등록·수정 모달 폼 상태 (`useMinistriesTab`과 동일 구조) */
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
  abolishedDate: string
  successorId: string
  defenseOfficialNameEn: string
  defenseMissionScope: string
  defenseHeadquarters: string
  defenseOrgStructure: string
  defenseBudgetOrForcesNote: string
}
