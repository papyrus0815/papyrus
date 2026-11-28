/**
 * 임명 모달의 직책(보직) 선택지 — **DB 직위 정의만** 고르게 한다.
 *
 * 예전엔 '보직·직책명'이 자유 입력 칸이었고, 위에 기관 종류별 하드코딩 프리셋(도승지·비서실장…)이 붙었다.
 * 자유 입력은 서버에서 '각료(일반)' 같은 빈 일반 정의(isGeneric)에 묶이고 이름만 문자열로 남는다
 * (실DB 123행). 그러면 역대 목록·직위 통계·다른 지면의 직책 피커 어디에도 그 직책이 서지 않는다.
 *
 * 선택지는 세 묶음:
 * 1. 이 기관의 직책 / 이 부대의 보직 — 그 부처·부대에 묶인 정의(전용 직책)
 * 2. 이 나라에서 쓰인 직책 — 국가 스코프 피커에서 사용 실적이 있는 공직
 * 3. 관직 카탈로그 — 나머지 공직 정의
 * 일반 정의(isGeneric)·군주직·작위·왕위계승·섭정은 빼고, 다른 기관에 묶인 전용 직책도 뺀다.
 */
import type { PickerPositionDefinition } from '@/shared/api/person-career'
import type { SearchOption } from '@/shared/ui/person-register-modal/sections/inline-search-select'

export type AppointmentContextType = 'DEPARTMENT' | 'MILITARY_UNIT' | 'CABINET'

export type PositionDefinitionLike = PickerPositionDefinition & {
  isGeneric?: boolean | null
}

export const POSITION_TYPE_LABEL: Record<string, string> = {
  HEAD_OF_STATE: '국가원수',
  HEAD_OF_GOVERNMENT: '정부수반',
  DEPUTY_HEAD_OF_STATE: '부원수',
  HEIR_APPARENT: '왕위 계승자',
  REGENT: '섭정',
  CABINET_MINISTER: '장관·각료',
  VICE_MINISTER: '차관',
  LEGISLATOR: '의원',
  JUDICIARY: '사법',
  LOCAL_GOVERNMENT: '지방·총독',
  SPECIAL_POSITION: '기관장·특별직',
  DIPLOMATIC_POST: '외교직',
  MILITARY_COMMANDER: '군 지휘',
  ROYAL_NOBLE_TITLE: '작위',
  OTHER: '기타',
}

/** 새 직책을 DB에 등록할 때 고르는 유형 — 군 맥락은 군 지휘 하나뿐 */
export const CREATABLE_POSITION_TYPES: ReadonlyArray<string> = [
  'CABINET_MINISTER',
  'VICE_MINISTER',
  'SPECIAL_POSITION',
  'HEAD_OF_GOVERNMENT',
  'DIPLOMATIC_POST',
  'JUDICIARY',
  'LEGISLATOR',
  'LOCAL_GOVERNMENT',
  'OTHER',
]

/** 임명 모달에서 고를 수 없는 유형 — 군주·왕실 축은 재위 등록이 따로 맡는다 */
const NON_APPOINTMENT_TYPES = new Set(['HEAD_OF_STATE', 'HEIR_APPARENT', 'REGENT', 'ROYAL_NOBLE_TITLE'])

const TYPE_ORDER = [
  'HEAD_OF_GOVERNMENT',
  'DEPUTY_HEAD_OF_STATE',
  'CABINET_MINISTER',
  'VICE_MINISTER',
  'SPECIAL_POSITION',
  'DIPLOMATIC_POST',
  'JUDICIARY',
  'LEGISLATOR',
  'LOCAL_GOVERNMENT',
  'MILITARY_COMMANDER',
  'OTHER',
]

export function isGenericDefinition(definition: PositionDefinitionLike | null | undefined): boolean {
  return definition?.isGeneric === true
}

function hasTitle(definition: PositionDefinitionLike): boolean {
  return Boolean(definition.title?.trim())
}

/** 이 맥락(기관·부대)에 묶인 전용 정의인가 */
function isOwnDefinition(
  definition: PositionDefinitionLike,
  contextType: AppointmentContextType,
  departmentId: string | null | undefined,
  militaryUnitId: string | null | undefined,
): boolean {
  if (contextType === 'MILITARY_UNIT') {
    return Boolean(militaryUnitId) && definition.militaryUnitId === militaryUnitId
  }
  return Boolean(departmentId) && definition.administrationDepartmentId === departmentId
}

/** 2·3 묶음에 설 수 있는 공직 정의인가 */
export function isAppointableDefinition(
  definition: PositionDefinitionLike,
  contextType: AppointmentContextType,
): boolean {
  if (!hasTitle(definition)) return false
  if (definition.isMonarchical) return false
  if (isGenericDefinition(definition)) return false
  const positionType = definition.positionType ?? 'OTHER'
  if (NON_APPOINTMENT_TYPES.has(positionType)) return false
  /* 다른 기관·부대에 묶인 전용 직책은 그 기관 것 — 여기서 고르면 소속이 어긋난다 */
  if (definition.administrationDepartmentId || definition.militaryUnitId) return false
  if (contextType === 'MILITARY_UNIT') return positionType === 'MILITARY_COMMANDER'
  return positionType !== 'MILITARY_COMMANDER'
}

function typeOrder(positionType: string | null | undefined): number {
  const index = TYPE_ORDER.indexOf(positionType ?? 'OTHER')
  return index === -1 ? TYPE_ORDER.length : index
}

function compareByRankThenTitle(left: PositionDefinitionLike, right: PositionDefinitionLike): number {
  return (
    (left.rank ?? 999) - (right.rank ?? 999) ||
    (left.title ?? '').localeCompare(right.title ?? '', 'ko')
  )
}

function optionMeta(definition: PositionDefinitionLike): string {
  const typeLabel = POSITION_TYPE_LABEL[definition.positionType ?? 'OTHER'] ?? '기타'
  const used = definition.usedCount && definition.usedCount > 0 ? ` · ${definition.usedCount}회` : ''
  return `${typeLabel}${used}`
}

function toOption(definition: PositionDefinitionLike, group: string): SearchOption {
  return {
    value: definition.id,
    label: (definition.title ?? '').trim(),
    meta: optionMeta(definition),
    group,
    keywords: [definition.titleEn, POSITION_TYPE_LABEL[definition.positionType ?? 'OTHER']]
      .filter(Boolean)
      .join(' '),
  }
}

export interface BuildPositionOptionsParams {
  /** 전체 정의 목록(기관·부대 전용 정의 포함) */
  all: ReadonlyArray<PositionDefinitionLike>
  /** 국가 스코프 피커 결과(사용 실적 포함) */
  picker: ReadonlyArray<PositionDefinitionLike>
  contextType: AppointmentContextType
  departmentId?: string | null
  departmentCategoryId?: string | null
  militaryUnitId?: string | null
  /** 지금 고른 정의 — 어느 묶음에도 없으면 '현재 직책'으로 맨 앞에 붙인다 */
  selectedId?: string | null
}

export interface BuildPositionOptionsResult {
  options: SearchOption[]
  /** 이 기관·부대의 전용 정의(빠른 선택 칩) */
  ownDefinitions: PositionDefinitionLike[]
  /** 이 부처의 표준 기능 분류(외교·국방·재정 등)에 매핑된 추천 직책 */
  categoryDefinitions: PositionDefinitionLike[]
  byId: Map<string, PositionDefinitionLike>
}

export function ownGroupLabel(contextType: AppointmentContextType): string {
  return contextType === 'MILITARY_UNIT' ? '이 부대의 보직' : '이 기관의 직책'
}

export function buildPositionDefinitionOptions({
  all,
  picker,
  contextType,
  departmentId,
  departmentCategoryId,
  militaryUnitId,
  selectedId,
}: BuildPositionOptionsParams): BuildPositionOptionsResult {
  const byId = new Map<string, PositionDefinitionLike>()
  for (const definition of all) byId.set(definition.id, definition)
  /* 피커 쪽이 사용 실적을 들고 있으니 덮어쓴다 */
  for (const definition of picker) byId.set(definition.id, { ...byId.get(definition.id), ...definition })

  const ownDefinitions = [...byId.values()]
    .filter(
      (definition) =>
        hasTitle(definition) &&
        !definition.isMonarchical &&
        !isGenericDefinition(definition) &&
        isOwnDefinition(definition, contextType, departmentId, militaryUnitId),
    )
    .sort(compareByRankThenTitle)
  const ownIds = new Set(ownDefinitions.map((definition) => definition.id))

  const pickerAppointable = picker
    .map((definition) => byId.get(definition.id) ?? definition)
    .filter((definition) => !ownIds.has(definition.id) && isAppointableDefinition(definition, contextType))

  const categoryDefinitions =
    contextType !== 'MILITARY_UNIT' && departmentCategoryId
      ? pickerAppointable
          .filter((definition) => definition.categoryId === departmentCategoryId)
          .sort(
            (left, right) =>
              (right.usedCount ?? 0) - (left.usedCount ?? 0) ||
              compareByRankThenTitle(left, right),
          )
      : []
  const categoryIds = new Set(categoryDefinitions.map((definition) => definition.id))

  const usedHere = pickerAppointable
    .filter((definition) => !categoryIds.has(definition.id) && definition.usedInThisCountry)
    .sort(
      (left, right) =>
        (right.usedCount ?? 0) - (left.usedCount ?? 0) || compareByRankThenTitle(left, right),
    )
  const usedIds = new Set(usedHere.map((definition) => definition.id))
  const catalog = pickerAppointable
    .filter((definition) => !categoryIds.has(definition.id) && !usedIds.has(definition.id))
    .sort(
      (left, right) =>
        typeOrder(left.positionType) - typeOrder(right.positionType) || compareByRankThenTitle(left, right),
    )

  const options: SearchOption[] = []
  if (
    selectedId &&
    !ownIds.has(selectedId) &&
    !categoryIds.has(selectedId) &&
    !usedIds.has(selectedId)
  ) {
    const selected = byId.get(selectedId)
    const inCatalog = catalog.some((definition) => definition.id === selectedId)
    if (selected && !inCatalog && !isGenericDefinition(selected) && hasTitle(selected)) {
      options.push(toOption(selected, '현재 직책'))
    }
  }
  for (const definition of ownDefinitions) options.push(toOption(definition, ownGroupLabel(contextType)))
  for (const definition of categoryDefinitions) options.push(toOption(definition, '이 분야 표준 직책'))
  for (const definition of usedHere) options.push(toOption(definition, '이 나라에서 쓰인 직책'))
  for (const definition of catalog) options.push(toOption(definition, '관직 카탈로그'))

  return { options, ownDefinitions, categoryDefinitions, byId }
}

/** 같은 이름(공백 무시)의 정의를 찾는다 — 새로 등록하기 전에 중복을 막는다 */
export function findDefinitionByTitle(
  candidates: Iterable<PositionDefinitionLike>,
  title: string,
): PositionDefinitionLike | null {
  const wanted = title.replace(/\s+/g, '')
  if (!wanted) return null
  for (const definition of candidates) {
    if ((definition.title ?? '').replace(/\s+/g, '') === wanted && !isGenericDefinition(definition)) {
      return definition
    }
  }
  return null
}
