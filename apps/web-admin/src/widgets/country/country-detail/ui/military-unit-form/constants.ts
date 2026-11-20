import type { IconType } from 'react-icons'
import {
  FiAnchor,
  FiCompass,
  FiCpu,
  FiCrosshair,
  FiLayers,
  FiRadio,
  FiShield,
  FiWind,
} from 'react-icons/fi'

import type {
  MilitaryUnit,
  MilitaryUnitDatePartsDto,
  MilitaryUnitType,
} from '@/shared/api/military-unit'

export const LAYOUT_STORAGE_KEY = 'papyrus:military-unit-register-layout-v2'

export function readInitialLayoutMode(): 'split' | 'single' {
  if (typeof window === 'undefined') return 'split'
  try {
    const saved = window.localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (saved === 'split' || saved === 'single') return saved
  } catch {
    // ignore storage errors
  }
  return 'split'
}

export const CREATE_LEAVE_MESSAGE =
  '작성 중인 군사 사령부·부대 정보가 있습니다. 저장하지 않고 닫으시겠습니까?'
export const EDIT_LEAVE_MESSAGE =
  '변경된 내용이 있습니다. 저장하지 않고 닫으시겠습니까?'
export const RESET_CONFIRM_MESSAGE =
  '작성 중인 내용을 모두 지우고 처음 상태로 되돌리시겠습니까?'

export interface UnitTypeOptionDef {
  value: MilitaryUnitType
  label: string
  shortLabel: string
  group: string
  keywords: string
  primaryForBranches: string[]
}

export const UNIT_TYPES: ReadonlyArray<UnitTypeOptionDef> = [
  {
    value: 'SUPREME_COMMAND',
    label: '최고사령부 (합동·통합 최고지휘기구)',
    shortLabel: '최고사령부',
    group: '최고 · 상급 지휘기구',
    keywords: 'SUPREME_COMMAND STAVKA SHAEF 대본영 최고사령부 총사령부',
    primaryForBranches: ['JOINT', 'OTHER', ''],
  },
  {
    value: 'GENERAL_STAFF',
    label: '참모본부 · 합동참모본부',
    shortLabel: '참모본부 · 합참',
    group: '최고 · 상급 지휘기구',
    keywords: 'GENERAL_STAFF JCS 합참 총참모부 참모본부 육군참모본부',
    primaryForBranches: ['JOINT', 'ARMY', ''],
  },
  {
    value: 'SERVICE_HQ',
    label: '각군 총사령부 · 군종 본부',
    shortLabel: '각군 총사령부 · 본부',
    group: '최고 · 상급 지휘기구',
    keywords: 'SERVICE_HQ 육군본부 해군본부 공군본부 총사령부',
    primaryForBranches: ['JOINT', 'ARMY', 'NAVY', 'AIR_FORCE', 'MARINE_CORPS', ''],
  },
  {
    value: 'THEATER',
    label: '전구 · 방면 총사령부',
    shortLabel: '전구 · 방면사령부',
    group: '전략 · 작전 제대',
    keywords: 'THEATER SHAEF 전구사령부 방면총사령부',
    primaryForBranches: ['JOINT'],
  },
  {
    value: 'ARMY_GROUP',
    label: '집단군 · 총군',
    shortLabel: '집단군',
    group: '전략 · 작전 제대',
    keywords: 'ARMY_GROUP 집단군 총군',
    primaryForBranches: ['ARMY', 'JOINT', ''],
  },
  {
    value: 'FRONT',
    label: '전선군 · 방면군',
    shortLabel: '전선군 · 방면군',
    group: '전략 · 작전 제대',
    keywords: 'FRONT 전선군 방면군 프론트',
    primaryForBranches: ['ARMY'],
  },
  {
    value: 'MILITARY_DISTRICT',
    label: '군관구 · 진수부',
    shortLabel: '군관구',
    group: '전략 · 작전 제대',
    keywords: 'MILITARY_DISTRICT 군관구 관구 진수부',
    primaryForBranches: ['ARMY', 'JOINT'],
  },
  {
    value: 'FIELD_ARMY',
    label: '야전군 · 기갑군',
    shortLabel: '야전군',
    group: '전략 · 작전 제대',
    keywords: 'FIELD_ARMY 야전군 기갑군 군사령부',
    primaryForBranches: ['ARMY', ''],
  },
  {
    value: 'CORPS',
    label: '군단 (Corps)',
    shortLabel: '군단',
    group: '전략 · 작전 제대',
    keywords: 'CORPS 군단 기갑군단',
    primaryForBranches: ['ARMY', 'MARINE_CORPS', ''],
  },
  {
    value: 'DIVISION',
    label: '사단 (Division)',
    shortLabel: '사단',
    group: '전술 제대',
    keywords: 'DIVISION 보병사단 기갑사단 기계화사단 공수사단 사단',
    primaryForBranches: ['ARMY', 'MARINE_CORPS', 'OTHER', ''],
  },
  {
    value: 'BRIGADE',
    label: '여단 (Brigade)',
    shortLabel: '여단',
    group: '전술 제대',
    keywords: 'BRIGADE 여단 독립여단',
    primaryForBranches: ['ARMY', 'MARINE_CORPS'],
  },
  {
    value: 'REGIMENT',
    label: '연대 (Regiment)',
    shortLabel: '연대',
    group: '전술 제대',
    keywords: 'REGIMENT 연대 보병연대 기갑연대',
    primaryForBranches: ['ARMY'],
  },
  {
    value: 'BATTALION',
    label: '대대 (Battalion)',
    shortLabel: '대대',
    group: '전술 제대',
    keywords: 'BATTALION 대대',
    primaryForBranches: [],
  },
  {
    value: 'COMPANY',
    label: '중대 (Company)',
    shortLabel: '중대',
    group: '전술 제대',
    keywords: 'COMPANY 중대',
    primaryForBranches: [],
  },
  {
    value: 'PLATOON',
    label: '소대 (Platoon)',
    shortLabel: '소대',
    group: '전술 제대',
    keywords: 'PLATOON 소대',
    primaryForBranches: [],
  },
  {
    value: 'SQUAD',
    label: '분대 (Squad)',
    shortLabel: '분대',
    group: '전술 제대',
    keywords: 'SQUAD 분대',
    primaryForBranches: [],
  },
  {
    value: 'FLEET',
    label: '함대 (Fleet · 연합함대)',
    shortLabel: '함대',
    group: '해군 · 공군 · 특수 · 기타',
    keywords: 'FLEET 연합함대 기동함대 함대 해군',
    primaryForBranches: ['NAVY', 'COAST_GUARD', ''],
  },
  {
    value: 'AIR_FLEET',
    label: '항공함대',
    shortLabel: '항공함대',
    group: '해군 · 공군 · 특수 · 기타',
    keywords: 'AIR_FLEET 항공함대 공군',
    primaryForBranches: ['AIR_FORCE'],
  },
  {
    value: 'AIR_CORPS',
    label: '항공군단 · 비행군단',
    shortLabel: '항공군단',
    group: '해군 · 공군 · 특수 · 기타',
    keywords: 'AIR_CORPS 항공군단 비행군단',
    primaryForBranches: ['AIR_FORCE'],
  },
  {
    value: 'WING',
    label: '비행단 (Wing)',
    shortLabel: '비행단',
    group: '해군 · 공군 · 특수 · 기타',
    keywords: 'WING 전투비행단 비행단',
    primaryForBranches: ['AIR_FORCE', 'SPACE_FORCE'],
  },
  {
    value: 'SQUADRON',
    label: '전대 · 비행전대 (Squadron)',
    shortLabel: '전대 · 비행전대',
    group: '해군 · 공군 · 특수 · 기타',
    keywords: 'SQUADRON 전대 비행전대 전단 해군전대',
    primaryForBranches: ['NAVY', 'AIR_FORCE', 'COAST_GUARD', 'SPACE_FORCE'],
  },
  {
    value: 'SPECIAL_FORCES',
    label: '특수부대 · 특전사',
    shortLabel: '특수부대',
    group: '해군 · 공군 · 특수 · 기타',
    keywords: 'SPECIAL_FORCES 특전사 특수부대 코만도 SAS',
    primaryForBranches: ['OTHER', 'MARINE_CORPS'],
  },
  {
    value: 'DETACHMENT',
    label: '파견대 · 분견군',
    shortLabel: '파견대 · 분견군',
    group: '해군 · 공군 · 특수 · 기타',
    keywords: 'DETACHMENT 분견군 파견대 지대',
    primaryForBranches: ['OTHER', 'COAST_GUARD'],
  },
  {
    value: 'OTHER',
    label: '기타 편제 · 군사학교 · 기지',
    shortLabel: '기타 편제',
    group: '해군 · 공군 · 특수 · 기타',
    keywords: 'OTHER 기타 사관학교 기지',
    primaryForBranches: ['SPACE_FORCE', 'COAST_GUARD', 'OTHER'],
  },
]

export const UNIT_TYPE_GROUPS = [
  '최고 · 상급 지휘기구',
  '전략 · 작전 제대',
  '전술 제대',
  '해군 · 공군 · 특수 · 기타',
] as const

export const HIGH_COMMAND_PRESETS: ReadonlyArray<{
  label: string
  name: string
  abbreviation: string
  nameLocal?: string
  nameEn?: string
  unitType: MilitaryUnitType
  branch: string
}> = [
  {
    label: '합동참모본부 (합참)',
    name: '합동참모본부',
    abbreviation: '합참',
    nameEn: 'Joint Chiefs of Staff',
    unitType: 'GENERAL_STAFF',
    branch: 'JOINT',
  },
  {
    label: '연합군 최고사령부 (SHAEF)',
    name: '연합군 원정군 최고사령부',
    abbreviation: 'SHAEF',
    nameEn: 'Supreme Headquarters Allied Expeditionary Force',
    unitType: 'SUPREME_COMMAND',
    branch: 'JOINT',
  },
  {
    label: 'STAVKA (최고사령부)',
    name: '최고사령부 스타프카',
    abbreviation: 'STAVKA',
    nameLocal: 'Ставка Верховного Главнокомандования',
    nameEn: 'Stavka of the Supreme High Command',
    unitType: 'SUPREME_COMMAND',
    branch: 'JOINT',
  },
  {
    label: '육군본부 (육본)',
    name: '육군본부',
    abbreviation: '육본',
    nameEn: 'Army Headquarters',
    unitType: 'SERVICE_HQ',
    branch: 'ARMY',
  },
  {
    label: '해군본부 (해본)',
    name: '해군본부',
    abbreviation: '해본',
    nameEn: 'Naval Headquarters',
    unitType: 'SERVICE_HQ',
    branch: 'NAVY',
  },
  {
    label: '공군본부 (공본)',
    name: '공군본부',
    abbreviation: '공본',
    nameEn: 'Air Force Headquarters',
    unitType: 'SERVICE_HQ',
    branch: 'AIR_FORCE',
  },
  {
    label: '전략공군사령부 (SAC)',
    name: '전략공군사령부',
    abbreviation: 'SAC',
    nameEn: 'Strategic Air Command',
    unitType: 'THEATER',
    branch: 'AIR_FORCE',
  },
]

export const MILITARY_BRANCHES: ReadonlyArray<{
  value: string
  Icon: IconType
  label: string
  rgb: string
  text: string
  textDark: string
  accent: string
}> = [
  {
    value: 'JOINT',
    Icon: FiLayers,
    label: '합동 · 통합군',
    rgb: '30, 64, 175',
    text: '#1e3a8a',
    textDark: '#93c5fd',
    accent: '#1d4ed8',
  },
  {
    value: 'ARMY',
    Icon: FiShield,
    label: '육군',
    rgb: '21, 128, 61',
    text: '#166534',
    textDark: '#86efac',
    accent: '#15803d',
  },
  {
    value: 'NAVY',
    Icon: FiAnchor,
    label: '해군',
    rgb: '2, 132, 199',
    text: '#0369a1',
    textDark: '#7dd3fc',
    accent: '#0284c7',
  },
  {
    value: 'AIR_FORCE',
    Icon: FiWind,
    label: '공군',
    rgb: '37, 99, 235',
    text: '#1d4ed8',
    textDark: '#93c5fd',
    accent: '#2563eb',
  },
  {
    value: 'MARINE_CORPS',
    Icon: FiCrosshair,
    label: '해병대',
    rgb: '220, 38, 38',
    text: '#b91c1c',
    textDark: '#fca5a5',
    accent: '#dc2626',
  },
  {
    value: 'COAST_GUARD',
    Icon: FiCompass,
    label: '해안경비대',
    rgb: '13, 148, 136',
    text: '#0f766e',
    textDark: '#5eead4',
    accent: '#0d9488',
  },
  {
    value: 'SPACE_FORCE',
    Icon: FiCpu,
    label: '우주 · 전략군',
    rgb: '14, 116, 144',
    text: '#0e7490',
    textDark: '#67e8f9',
    accent: '#0891b2',
  },
  {
    value: 'OTHER',
    Icon: FiRadio,
    label: '기타 · 독립군종',
    rgb: '71, 85, 105',
    text: '#334155',
    textDark: '#cbd5e1',
    accent: '#475569',
  },
]

export type FormSectionKey = 'basic' | 'command' | 'context'

export const FORM_SECTION_META: ReadonlyArray<{
  key: FormSectionKey
  id: string
  label: string
}> = [
  { key: 'basic', id: 'military-unit-section-basic', label: '기본 정보' },
  {
    key: 'command',
    id: 'military-unit-section-command',
    label: '소속 · 지휘 계통',
  },
  {
    key: 'context',
    id: 'military-unit-section-context',
    label: '시기 · 소재지 · 설명',
  },
]

export function inferMilitaryUnitMetaFromName(
  nameValue: string,
  abbrValue: string,
): {
  inferredUnitType: MilitaryUnitType | null
  inferredBranch: string | null
  inferredYear: { era: 'AD' | 'BC'; year: string } | null
} {
  const combined = `${nameValue.trim()} ${abbrValue.trim()}`.trim()
  if (combined.length < 2) {
    return {
      inferredUnitType: null,
      inferredBranch: null,
      inferredYear: null,
    }
  }

  let inferredYear: { era: 'AD' | 'BC'; year: string } | null = null
  const bcYearMatch = /(?:기원전|BC|B\.C\.)\s*(\d{1,4})\s*년?/i.exec(combined)
  if (bcYearMatch?.[1]) {
    const parsedBc = Number.parseInt(bcYearMatch[1], 10)
    if (Number.isInteger(parsedBc) && parsedBc >= 1 && parsedBc <= 4000) {
      inferredYear = { era: 'BC', year: String(parsedBc) }
    }
  } else {
    const adYearMatch =
      /(?:서기\s*)?(\d{3,4})\s*년|(?:[(（[])(\d{4})(?:[)）\]~-])/.exec(
        combined,
      )
    const rawAdYear = adYearMatch?.[1] ?? adYearMatch?.[2]
    if (rawAdYear) {
      const parsedAd = Number.parseInt(rawAdYear, 10)
      if (Number.isInteger(parsedAd) && parsedAd >= 100 && parsedAd <= 2100) {
        inferredYear = { era: 'AD', year: String(parsedAd) }
      }
    }
  }

  let inferredUnitType: MilitaryUnitType | null = null
  if (/최고사령부|대본영|스타프카|\bSTAVKA\b/i.test(combined)) {
    inferredUnitType = 'SUPREME_COMMAND'
  } else if (
    /합동참모본부|참모본부|총참모부|\bJCS\b|\b합참\b/i.test(combined)
  ) {
    inferredUnitType = 'GENERAL_STAFF'
  } else if (
    /육군\s*총사령부|해군\s*총사령부|공군\s*총사령부|육군본부|해군본부|공군본부/i.test(
      combined,
    )
  ) {
    inferredUnitType = 'SERVICE_HQ'
  } else if (/전구사령부|방면총사령부|\bSHAEF\b/i.test(combined)) {
    inferredUnitType = 'THEATER'
  } else if (/집단군|총군/i.test(combined)) {
    inferredUnitType = 'ARMY_GROUP'
  } else if (/전선군|방면군/i.test(combined)) {
    inferredUnitType = 'FRONT'
  } else if (/군관구|진수부/i.test(combined)) {
    inferredUnitType = 'MILITARY_DISTRICT'
  } else if (/항공함대/i.test(combined)) {
    inferredUnitType = 'AIR_FLEET'
  } else if (/함대|연합함대|기동함대/i.test(combined)) {
    inferredUnitType = 'FLEET'
  } else if (/항공군단|비행군단/i.test(combined)) {
    inferredUnitType = 'AIR_CORPS'
  } else if (/비행단|전투비행단|폭격비행단/i.test(combined)) {
    inferredUnitType = 'WING'
  } else if (/비행전대|전대|전단/i.test(combined)) {
    inferredUnitType = 'SQUADRON'
  } else if (
    /특수전|특전사|특수부대|코만도|\bSAS\b|\bSEAL/i.test(combined)
  ) {
    inferredUnitType = 'SPECIAL_FORCES'
  } else if (/분견군|분견대|파견대|지대/i.test(combined)) {
    inferredUnitType = 'DETACHMENT'
  } else if (/야전군|기갑군|제\d+\s*군(?!단|관구)|군사령부/i.test(combined)) {
    inferredUnitType = 'FIELD_ARMY'
  } else if (/군단|기갑군단|\bCorps\b/i.test(combined)) {
    inferredUnitType = 'CORPS'
  } else if (/사단|\bDivision\b/i.test(combined)) {
    inferredUnitType = 'DIVISION'
  } else if (/여단|\bBrigade\b/i.test(combined)) {
    inferredUnitType = 'BRIGADE'
  } else if (/연대|\bRegiment\b/i.test(combined)) {
    inferredUnitType = 'REGIMENT'
  } else if (/대대|\bBattalion\b/i.test(combined)) {
    inferredUnitType = 'BATTALION'
  } else if (/중대|\bCompany\b/i.test(combined)) {
    inferredUnitType = 'COMPANY'
  } else if (/소대|\bPlatoon\b/i.test(combined)) {
    inferredUnitType = 'PLATOON'
  } else if (/분대|\bSquad\b/i.test(combined)) {
    inferredUnitType = 'SQUAD'
  }

  let inferredBranch: string | null = null
  if (/해병|상륙군|\bMarine/i.test(combined)) {
    inferredBranch = 'MARINE_CORPS'
  } else if (/해안경비대|해양경찰/i.test(combined)) {
    inferredBranch = 'COAST_GUARD'
  } else if (/우주군|전략로켓군/i.test(combined)) {
    inferredBranch = 'SPACE_FORCE'
  } else if (/공군|항공함대|항공군단|비행단|비행전대|전투비행단/i.test(combined)) {
    inferredBranch = 'AIR_FORCE'
  } else if (/해군|함대|연합함대|기동함대|진수부/i.test(combined)) {
    inferredBranch = 'NAVY'
  } else if (/합동참모본부|대본영|스타프카|\bSTAVKA\b|\b합참\b|통합군|합동군/i.test(combined)) {
    inferredBranch = 'JOINT'
  } else if (
    /육군|집단군|전선군|야전군|기갑군|군단|보병|기갑|기계화|포병|기병|공수/i.test(
      combined,
    )
  ) {
    inferredBranch = 'ARMY'
  }

  return { inferredUnitType, inferredBranch, inferredYear }
}

export function parseIsoPartsFallback(isoDate: string | null | undefined): {
  era: 'AD' | 'BC'
  year: string
  month: string
  day: string
} {
  if (!isoDate) return { era: 'AD', year: '', month: '', day: '' }
  const trimmed = isoDate.trim()
  const matched = /^(-?\d{1,6})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/.exec(trimmed)
  if (!matched) return { era: 'AD', year: '', month: '', day: '' }
  const rawYear = Number(matched[1])
  if (!Number.isFinite(rawYear) || rawYear === 0) {
    return { era: 'AD', year: '', month: '', day: '' }
  }
  return {
    era: rawYear < 0 ? 'BC' : 'AD',
    year: String(Math.abs(rawYear)),
    month: matched[2] ? String(Number(matched[2])) : '',
    day: matched[3] ? String(Number(matched[3])) : '',
  }
}

export function hydrateStructuredParts(
  parts: MilitaryUnitDatePartsDto | null | undefined,
  isoFallback: string | null | undefined,
): {
  era: 'AD' | 'BC'
  year: string
  month: string
  day: string
} {
  if (parts?.year && parts.year > 0) {
    return {
      era: parts.era === 'BC' ? 'BC' : 'AD',
      year: String(parts.year),
      month: parts.month != null ? String(parts.month) : '',
      day: parts.day != null ? String(parts.day) : '',
    }
  }
  return parseIsoPartsFallback(isoFallback)
}

export function toCalendarInitialIso(
  eraVal: 'AD' | 'BC',
  yearStr: string,
  monthStr: string,
  dayStr: string,
): string {
  if (eraVal === 'BC') return ''
  const parsedYear = Number.parseInt(yearStr.trim(), 10)
  if (!Number.isFinite(parsedYear) || parsedYear < 100) return ''
  const parsedMonth = Number.parseInt(monthStr.trim(), 10)
  const parsedDay = Number.parseInt(dayStr.trim(), 10)
  const monthPadded = String(
    Number.isFinite(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
      ? parsedMonth
      : 1,
  ).padStart(2, '0')
  const dayPadded = String(
    Number.isFinite(parsedDay) && parsedDay >= 1 && parsedDay <= 31
      ? parsedDay
      : 1,
  ).padStart(2, '0')
  return `${String(parsedYear).padStart(4, '0')}-${monthPadded}-${dayPadded}`
}

export function toSignedComparableYear(
  eraVal: 'AD' | 'BC',
  yearStr: string,
): number | null {
  const trimmed = yearStr.trim()
  if (!trimmed) return null
  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isInteger(parsed) || parsed < 1) return null
  return eraVal === 'BC' ? -parsed : parsed
}

export function collectDescendantUnitIds(
  rootId: string | null | undefined,
  units: MilitaryUnit[],
): Set<string> {
  const result = new Set<string>()
  if (!rootId) return result
  const childrenMap = new Map<string, string[]>()
  for (const unitItem of units) {
    if (!unitItem.parentUnitId) continue
    const bucket = childrenMap.get(unitItem.parentUnitId) ?? []
    bucket.push(unitItem.id)
    childrenMap.set(unitItem.parentUnitId, bucket)
  }
  const queue = [...(childrenMap.get(rootId) ?? [])]
  while (queue.length > 0) {
    const currentId = queue.shift()!
    if (result.has(currentId)) continue
    result.add(currentId)
    const nextChildren = childrenMap.get(currentId)
    if (nextChildren) {
      queue.push(...nextChildren)
    }
  }
  return result
}
