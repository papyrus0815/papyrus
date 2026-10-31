/**
 * 국가·시대·정권(Cabinet)별 중앙부처 필터링 및 부처↔각료 재임 매칭 유틸리티
 *
 * 1) 시대·역사국가 필터링:
 *    - 같은 국가 안에서도 시대(일본 제국 vs 현대 일본, 조선 vs 대한민국, 미국 전쟁부 vs 국방부)에 따라
 *      부처 구성이 달라진다.
 *    - 부처의 `historicalCountryId`, `establishedDate`, `abolishedDate`와 정권(수반 재임)의
 *      `historicalCountryId`, `startDate`, `endDate`를 대조해 그 정권 시기에 존재했던 부처만 추린다.
 *
 * 2) 부처↔각료 매칭:
 *    - 1순위: 재임(`administrationDepartmentId`) 또는 직위 정의(`positionDefinition.administrationDepartmentId`)의 직접 FK 일치
 *    - 2순위: 다른 부처 ID가 명시적으로 박혀 있으면 불일치 처리(오매칭 방지)
 *    - 3순위: 부처명 어간(부/성/처/청/원/국/실/조 제거) 및 국가·시대별 이칭(국무부↔국무장관/외무, 대장성↔대장대신/재무, 6조↔판서, 6부↔상서 등) 매칭
 *    - 4순위: 동일 정권 내 활성 부처 중 해당 카테고리(`categoryId`)의 유일한 부처일 때 카테고리 일치
 */

import type { AdministrationDepartment } from '@/shared/api/administration-department'
import type { PoliticalSystem } from '@/shared/api/political-system'

import { DEPARTMENT_NAME_FRAMES } from './department-name-frames'

export type CabinetScopeForDepartment = {
  countryId?: string | null
  historicalCountryId?: string | null
  startDate?: string | null
  endDate?: string | null
}

export type MatchableCabinetMember = {
  title?: string | null
  titleEn?: string | null
  administrationDepartmentId?: string | null
  administrationDepartment?: {
    id: string
    name?: string | null
    categoryId?: string | null
  } | null
  positionDefinition?: {
    id?: string
    title?: string | null
    titleEn?: string | null
    categoryId?: string | null
    administrationDepartmentId?: string | null
  } | null
}

function toIsoDateSlice(dateStr: string | null | undefined): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null
  const trimmed = dateStr.trim()
  if (!trimmed || trimmed.startsWith('-')) return null
  const matched = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(trimmed)
  if (!matched) return null
  const y = matched[1]
  const m = matched[2] ?? '01'
  const d = matched[3] ?? '01'
  return `${y}-${m}-${d}`
}

function toIsoEndDateSlice(dateStr: string | null | undefined): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null
  const trimmed = dateStr.trim()
  if (!trimmed || trimmed.startsWith('-')) return null
  const matched = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(trimmed)
  if (!matched) return null
  const y = matched[1]
  const m = matched[2] ?? '12'
  const d = matched[3] ?? '31'
  return `${y}-${m}-${d}`
}

function extractSignedYear(dateStr: string | null | undefined): number | null {
  if (!dateStr || typeof dateStr !== 'string') return null
  const trimmed = dateStr.trim()
  const bcMatch = /^-(\d{1,6})/.exec(trimmed)
  if (bcMatch) return -Number(bcMatch[1])
  const adMatch = /^(\d{4})/.exec(trimmed)
  if (adMatch) return Number(adMatch[1])
  return null
}

/**
 * 두 날짜 구간 [startA, endA] 와 [startB, endB] 가 겹치는지 판정.
 * 양쪽 끝이 null이면 열린 구간(제한 없음)으로 본다.
 */
export function dateRangesOverlapIso(
  startA: string | null | undefined,
  endA: string | null | undefined,
  startB: string | null | undefined,
  endB: string | null | undefined,
): boolean {
  const sA = toIsoDateSlice(startA)
  const eA = toIsoEndDateSlice(endA)
  const sB = toIsoDateSlice(startB)
  const eB = toIsoEndDateSlice(endB)

  if (sA && eB && sA > eB) return false
  if (sB && eA && sB > eA) return false
  return true
}

/**
 * 선택된 정권(또는 수반 재임)의 시대·소속 국가에 맞는 부처만 추린다.
 *
 * - 정권이 특정 역사국가(`historicalCountryId`) 소속일 때:
 *   1) 부처에 `historicalCountryId`가 있으면 같은 역사국가인 부처만 통과.
 *   2) 부처에 `historicalCountryId`가 없고(현대국가 부처) `establishedDate`가 있으면
 *      정권 기간과 겹칠 때만 통과.
 *   3) 부처에 `historicalCountryId`도 없고 `establishedDate`도 없는 경우:
 *      해당 역사국가 전용 부처가 하나라도 등록돼 있으면 미지정 현대 부처는 제외하고,
 *      하나도 없으면(아직 구분 전) 날짜 조건으로만 통과시킨다.
 * - 정권이 현대국가(`historicalCountryId == null`) 소속일 때:
 *   1) 부처에 `historicalCountryId`가 박혀 있으면(과거 역사국가 부처) 제외하되,
 *      폐지일이 없고 설립일이 정권 기간과 겹치는 특수 케이스만 예외.
 *   2) 설립일·폐지일이 정권 임기와 어긋나면(폐지일 < 정권 시작일, 설립일 > 정권 종료일) 제외.
 */
export function filterDepartmentsForCabinet<
  T extends Pick<
    AdministrationDepartment,
    'id' | 'name' | 'countryId' | 'historicalCountryId' | 'establishedDate' | 'abolishedDate'
  >,
>(
  departments: readonly T[],
  cabinetScope?: CabinetScopeForDepartment | null,
): T[] {
  if (!cabinetScope) return [...departments]
  const cabHistId = cabinetScope.historicalCountryId || null
  const cabStart = cabinetScope.startDate ?? null
  const cabEnd = cabinetScope.endDate ?? null

  const hasExplicitHistDeptsForCab =
    cabHistId != null &&
    departments.some((d) => d.historicalCountryId === cabHistId)

  const filtered = departments.filter((dept) => {
    const deptHistId = dept.historicalCountryId || null
    const deptEst = dept.establishedDate ?? null
    const deptAbo = dept.abolishedDate ?? null

    // 1. 설립일·폐지일과 정권 임기 교차 검사
    if (
      (deptEst || deptAbo) &&
      (cabStart || cabEnd) &&
      !dateRangesOverlapIso(deptEst, deptAbo, cabStart, cabEnd)
    ) {
      return false
    }

    // 2. 역사국가 소속 정권일 때
    if (cabHistId) {
      if (deptHistId) {
        return deptHistId === cabHistId
      }
      // 현대국가 소속으로만 등록된 부처인데 설립일이 정권 기간과 겹치면 허용
      if (deptEst && (cabStart || cabEnd)) {
        return dateRangesOverlapIso(deptEst, deptAbo, cabStart, cabEnd)
      }
      // 해당 역사국가 전용 부처가 이미 있으면, 날짜 없는 현대 부처는 섞이지 않게 제외
      if (hasExplicitHistDeptsForCab) {
        return false
      }
      return true
    }

    // 3. 현대국가 소속 정권일 때: 역사국가 전용 부처(예: 조선 6조, 일본 제국 육군성)는 제외
    if (deptHistId) {
      return false
    }

    return true
  })

  return filtered
}

const stripSpace = (value: string) => value.replace(/\s+/g, '')

/**
 * 부처명에서 핵심 어간과 동의어·직함 키워드 목록을 뽑아낸다.
 * 예:
 * - '국무부' → ['국무부', '국무', '국무장관', 'secretaryofstate']
 * - '대장성' → ['대장성', '대장', '대장대신']
 * - '이조'   → ['이조', '이조판서']
 * - '기획재정부' → ['기획재정부', '기획재정', '기재부', '재무', '경제부총리']
 */
const DEPARTMENT_SYNONYM_MAP: Record<string, string[]> = {
  국무부: ['국무장관', '국무부', 'secretaryofstate', 'departmentofstate'],
  외무부: ['외무장관', '외무대신', '외무부', '외교장관', 'foreignsecretary', 'foreignminister'],
  외교부: ['외교장관', '외교부장관', '외교부장', '외무장관'],
  외무성: ['외무대신', '외무성', '외무장관'],
  외부: ['외부대신', '외무대신'],
  예조: ['예조판서', '예조'],
  예부: ['예부상서', '예부'],
  재무부: ['재무장관', '재무대신', '재무부', 'chancellorMin', 'chancelloroftheexchequer', 'secretaryofthetreasury'],
  재무성: ['재무대신', '재무성', '재무장관'],
  대장성: ['대장대신', '대장성', '재무대신'],
  기획재정부: ['기획재정부장관', '기획재정장관', '경제부총리', '재경부장관'],
  재정부: ['재정부장', '재무장관'],
  탁지부: ['탁지부대신', '탁지대신'],
  호조: ['호조판서', '호조'],
  호부: ['호부상서', '호부'],
  국방부: ['국방장관', '국방부장관', '국방부장', 'secretaryofdefense', 'ministryofdefence'],
  방위성: ['방위대신', '방위성', '방위청장관'],
  전쟁부: ['전쟁장관', '전쟁부장관', '육군장관', 'secretaryofwar', 'waroffice'],
  육군성: ['육군대신', '육군성', '육군장관'],
  해군성: ['해군대신', '해군성', '해군장관', 'firstlordoftheadmiralty'],
  해군부: ['해군장관', '해군부장관', '해군대신', 'secretaryofthenavy'],
  군부: ['군부대신'],
  병조: ['병조판서', '병조'],
  병부: ['병부상서', '병부'],
  내무부: ['내무장관', '내무부장관', '내무대신', 'homesecretary', 'secretaryoftheinterior'],
  내무성: ['내무대신', '내무성', '내무장관'],
  총무성: ['총무대신', '총무성'],
  행정안전부: ['행정안전부장관', '행안부장관', '행정자치부장관', '내무장관'],
  공안부: ['공안부장', '공안부'],
  내부: ['내부대신'],
  이조: ['이조판서', '이조'],
  이부: ['이부상서', '이부'],
  법무부: ['법무장관', '법무부장관', '법무대신', '검찰총장', 'attorneygeneral', 'lordchancellor'],
  법무성: ['법무대신', '법무성'],
  사법성: ['사법대신', '사법성', '법무대신'],
  사법부: ['사법부장', '법무장관'],
  법부: ['법부대신'],
  형조: ['형조판서', '형조'],
  형부: ['형부상서', '형부'],
  교육부: ['교육장관', '교육부장관', '교육부장', '사회부총리'],
  문부성: ['문부대신', '문부성', '교육장관'],
  문부과학성: ['문부과학대신', '문부과학성'],
  학부: ['학부대신'],
  상무부: ['상무장관', '상무부장관', '통상산업장관', 'secretaryofcommerce'],
  농상무성: ['농상무대신', '농상무성'],
  농상공부: ['농상공부대신'],
  경제산업성: ['경제산업대신', '통상산업대신'],
  산업통상자원부: ['산업통상자원부장관', '산자부장관', '상공부장관', '산업부장관'],
  농무부: ['농무장관', '농무부장관', '농업장관', 'secretaryofagriculture'],
  농림수산성: ['농림수산대신', '농림대신'],
  농림축산식품부: ['농림축산식품부장관', '농림부장관', '농식품부장관'],
  후생노동성: ['후생노동대신', '후생대신', '노동대신'],
  보건복지부: ['보건복지부장관', '보건복지장관', '보건장관'],
  고용노동부: ['고용노동부장관', '노동부장관', '노동장관'],
  국토교통부: ['국토교통부장관', '국토부장관', '건설교통부장관', '교통장관'],
  국토교통성: ['국토교통대신', '운수대신', '건설대신'],
  체신성: ['체신대신', '우정대신'],
  척무성: ['척무대신'],
  궁내성: ['궁내대신'],
  궁내부: ['궁내부대신'],
  공조: ['공조판서', '공조'],
  공부: ['공부상서', '공부'],
}

function getDepartmentMatchTokens(deptName: string): string[] {
  const clean = stripSpace(deptName)
  if (!clean) return []
  const tokens = new Set<string>([clean.toLowerCase()])

  // 프리셋 프레임에 정의된 headPositionTitle 연결
  for (const frame of DEPARTMENT_NAME_FRAMES) {
    for (const item of frame.items) {
      if (stripSpace(item.name) === clean && item.headPositionTitle) {
        tokens.add(stripSpace(item.headPositionTitle).toLowerCase())
      }
    }
  }

  // 동의어 사전 연결
  const synonyms = DEPARTMENT_SYNONYM_MAP[clean]
  if (synonyms) {
    for (const syn of synonyms) {
      tokens.add(stripSpace(syn).toLowerCase())
    }
  }

  // 접미사 제거 어간 (2글자 이상이거나 6조/6부 등)
  const stem = clean.replace(/(부|성|처|청|원|국|실|조)$/, '').trim()
  if (stem.length >= 2) {
    tokens.add(stem.toLowerCase())
  } else if (stem.length === 1 && /(조|부|성)$/.test(clean)) {
    // 이조, 호조, 예조, 병조, 형조, 공조 / 이부, 호부, 내부, 외부, 군부, 법부, 학부 등 2글자 부처는 전체 이름이나 직함 접미사 결합으로만 매칭
    tokens.add(`${stem}조판서`)
    tokens.add(`${stem}부상서`)
    tokens.add(`${clean}대신`)
    tokens.add(`${clean}장관`)
  }

  return [...tokens]
}

/**
 * 각료 재임 1건이 특정 부처(`dept`)에 해당하는지 판정한다.
 */
export function doesMemberMatchDepartment(
  member: MatchableCabinetMember,
  dept: Pick<AdministrationDepartment, 'id' | 'name' | 'categoryId'>,
  allActiveDepartments?: readonly Pick<
    AdministrationDepartment,
    'id' | 'name' | 'categoryId'
  >[],
): boolean {
  const explicitDeptId =
    member.administrationDepartmentId ??
    member.administrationDepartment?.id ??
    member.positionDefinition?.administrationDepartmentId ??
    null

  // 1. 명시적 부처 ID가 일치하면 무조건 매칭
  if (explicitDeptId && explicitDeptId === dept.id) {
    return true
  }

  // 2. 다른 부처 ID가 명시적으로 지정돼 있으면 이 부처가 아님
  if (explicitDeptId && explicitDeptId !== dept.id) {
    return false
  }

  // 3. 직함·부처명 어간·이칭 대조
  const rawTitle = [
    member.title,
    member.titleEn,
    member.positionDefinition?.title,
    member.positionDefinition?.titleEn,
    member.administrationDepartment?.name,
  ]
    .filter(Boolean)
    .join(' ')
  const normalizedTitle = stripSpace(rawTitle).toLowerCase()

  if (normalizedTitle) {
    const tokens = getDepartmentMatchTokens(dept.name)
    if (tokens.some((token) => token.length >= 2 && normalizedTitle.includes(token))) {
      return true
    }
  }

  // 4. 카테고리 기반 매칭 (직위 정의에 categoryId가 있고, 활성 부처 중 해당 카테고리 부처가 이 부처뿐일 때)
  const memberCatId =
    member.positionDefinition?.categoryId ??
    member.administrationDepartment?.categoryId ??
    null
  if (memberCatId && dept.categoryId && memberCatId === dept.categoryId) {
    if (!allActiveDepartments) return true
    const sameCategoryDepts = allActiveDepartments.filter(
      (d) => d.categoryId === dept.categoryId,
    )
    if (sameCategoryDepts.length === 1) {
      return true
    }
  }

  return false
}

/**
 * 각료 재임 1건에 매칭되는 부처를 목록에서 찾는다.
 */
export function findDepartmentForMember<
  T extends Pick<AdministrationDepartment, 'id' | 'name' | 'categoryId'>,
>(
  member: MatchableCabinetMember,
  departments: readonly T[],
): T | null {
  // 1순위: 직접 FK
  const explicitDeptId =
    member.administrationDepartmentId ??
    member.administrationDepartment?.id ??
    member.positionDefinition?.administrationDepartmentId ??
    null
  if (explicitDeptId) {
    const exact = departments.find((d) => d.id === explicitDeptId)
    if (exact) return exact
  }

  // 2순위: 어간/동의어/카테고리 매칭
  for (const dept of departments) {
    if (doesMemberMatchDepartment(member, dept, departments)) {
      return dept
    }
  }
  return null
}

/**
 * 정체(GovernmentForm)별 메타데이터 — 행정부 화면에서 체제 특성과 수반 구성을 설명한다.
 */
export type GovernmentFormMeta = {
  label: string
  /** 국가원수·정부수반 관계 요약 */
  executiveSummary: string
  /** 기본 수반 역할명 (빈 상태에서 표시) */
  defaultHeadRoleLabel: string
  /** 국가원수와 정부수반이 분리된 이원적 집행부 체제인지 */
  isDualExecutive: boolean
  /** 군주제 계열 여부 */
  isMonarchy: boolean
}

export const GOVERNMENT_FORM_META: Record<string, GovernmentFormMeta> = {
  PRESIDENTIAL: {
    label: '대통령제',
    executiveSummary: '국가원수·정부수반 일원 (대통령 중심 행정부)',
    defaultHeadRoleLabel: '대통령 (국가원수 · 정부수반)',
    isDualExecutive: false,
    isMonarchy: false,
  },
  PARLIAMENTARY: {
    label: '의원내각제',
    executiveSummary: '국가원수(대통령 등)와 정부수반(총리·수상) 분리 · 내각 실권',
    defaultHeadRoleLabel: '총리 · 내각수반 (정부수반)',
    isDualExecutive: true,
    isMonarchy: false,
  },
  SEMI_PRESIDENTIAL: {
    label: '이원집정부제',
    executiveSummary: '국가원수(대통령)와 정부수반(총리)이 행정권을 분점',
    defaultHeadRoleLabel: '대통령 · 총리 (이원 집행부)',
    isDualExecutive: true,
    isMonarchy: false,
  },
  CONSTITUTIONAL_MONARCHY: {
    label: '입헌군주제',
    executiveSummary: '군주(국가원수) + 총리·내각(정부수반)',
    defaultHeadRoleLabel: '총리 · 내각수반 (입헌군주제)',
    isDualExecutive: true,
    isMonarchy: true,
  },
  ABSOLUTE_MONARCHY: {
    label: '절대군주제',
    executiveSummary: '군주(국왕·황제)가 주권과 행정권을 직접 행사',
    defaultHeadRoleLabel: '군주 (국왕 · 황제)',
    isDualExecutive: false,
    isMonarchy: true,
  },
  MILITARY: {
    label: '군정',
    executiveSummary: '군부·군사평의회 중심 집행부',
    defaultHeadRoleLabel: '최고회의 의장 · 국가원수',
    isDualExecutive: false,
    isMonarchy: false,
  },
  ONE_PARTY: {
    label: '일당제',
    executiveSummary: '당 최고지도자(총서기·주석) + 내각(총리)',
    defaultHeadRoleLabel: '최고지도자 · 총리',
    isDualExecutive: true,
    isMonarchy: false,
  },
  THEOCRACY: {
    label: '신정 체제',
    executiveSummary: '종교 최고지도자 중심 통치',
    defaultHeadRoleLabel: '최고지도자 · 수반',
    isDualExecutive: true,
    isMonarchy: false,
  },
  PROVISIONAL: {
    label: '임시정부',
    executiveSummary: '과도·망명·임시 행정부 체제',
    defaultHeadRoleLabel: '임시정부 수반 (주석 · 대통령 · 총리)',
    isDualExecutive: false,
    isMonarchy: false,
  },
  OTHER: {
    label: '기타 체제',
    executiveSummary: '특수 통치·집행부 체제',
    defaultHeadRoleLabel: '정부 수반',
    isDualExecutive: false,
    isMonarchy: false,
  },
}

/**
 * 정권(또는 수반 재임)의 소속 국가·연도에 부합하는 정체(`PoliticalSystem`) 1건을 찾는다.
 */
export function findActivePoliticalSystemForCabinet(
  systems: readonly PoliticalSystem[],
  cabinetScope?: CabinetScopeForDepartment | null,
): PoliticalSystem | null {
  if (!systems.length) return null
  if (!cabinetScope) {
    return systems.find((s) => s.endYear == null) ?? systems[0] ?? null
  }

  const cabHistId = cabinetScope.historicalCountryId || null
  const cabStartYear = extractSignedYear(cabinetScope.startDate)
  const cabEndYear = extractSignedYear(cabinetScope.endDate)

  const candidates = systems.filter((sys) => {
    if (cabHistId) {
      if (sys.historicalCountryId && sys.historicalCountryId !== cabHistId) {
        return false
      }
    } else if (sys.historicalCountryId) {
      // 현대국가 정권인데 역사국가 정체이면 연도가 명시적으로 겹칠 때만 허용
      if (cabStartYear == null) return false
    }

    const sysStart =
      sys.startYear != null
        ? sys.startEra === 'BC'
          ? -sys.startYear
          : sys.startYear
        : null
    const sysEnd =
      sys.endYear != null
        ? sys.endEra === 'BC'
          ? -sys.endYear
          : sys.endYear
        : null

    if (cabStartYear != null && sysEnd != null && cabStartYear > sysEnd) {
      return false
    }
    if (cabEndYear != null && sysStart != null && cabEndYear < sysStart) {
      return false
    }
    return true
  })

  if (candidates.length === 0) {
    // 같은 역사국가 정체가 있으면 그중 첫 번째, 없으면 현대 정체 폴백
    if (cabHistId) {
      return (
        systems.find((s) => s.historicalCountryId === cabHistId) ?? null
      )
    }
    return (
      systems.find((s) => !s.historicalCountryId && s.endYear == null) ??
      systems.find((s) => !s.historicalCountryId) ??
      systems[0] ??
      null
    )
  }

  // 같은 historicalCountryId 일치를 최우선, 그 다음 현재 진행 중(endYear == null) 우선
  return (
    candidates.find((s) => cabHistId && s.historicalCountryId === cabHistId) ??
    candidates.find((s) => !cabHistId && !s.historicalCountryId && s.endYear == null) ??
    candidates[0] ??
    null
  )
}
