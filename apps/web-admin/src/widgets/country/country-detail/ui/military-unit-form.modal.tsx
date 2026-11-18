/**
 * 군사 사령부·부대 등록/수정 모달 — 사건 등록 모달(EventRegisterModal · BasicInfoSection · EventTypeField) 디자인·UX 정본 적용
 * - 중앙 모달(`RegisterModal`) + 좌우 2단 분할(`split`) / 1단 세로(`single`) 전환 및 분할 비율 조절
 * - 사건 등록 모달과 동일한 3대 섹션(`기본 정보` · `소속 · 지휘 · 계보` · `맥락 · 상세 기록`) 및 헤더 컨텍스트 배지
 * - 소속 국가·시대: 선택 카드(`ParentEventCard`) + 인라인 빠른 검색(`CountryQuickSearchInput`) + 시대 일치 우선 2개 칩 + `+N개 시대 더보기` 접기/펼치기 + 존속기간 불일치 소프트 경고(`AlertBox`)
 * - 창설·해산 시기: `InlineDateField`(`appearance="field"`) + `DatePickerModal` + `SegmentControl` 운용 상태 전환
 * - 군종(`S.CategoryGrid` + `S.CategoryCard`) · 부대 유형(`KitChipGroup` + `KitChoiceChip` + `+ 다른 제대 더 보기` + 빠른 검색)
 * - 부대 마크·휘장: `KitUploadStrip` / `KitUploadFilled` (`register-form-kit`)
 * - 상위 부대 · 소관 부처 · 지휘관 · 계보: `ParentEventCard` · `ParticipantRow` · `ModalCausalFlowBoard`
 */
import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useQueryClient } from '@tanstack/react-query'
import type { IconType } from 'react-icons'
import {
  FiAnchor,
  FiCheck,
  FiColumns,
  FiCompass,
  FiCpu,
  FiCrosshair,
  FiEdit2,
  FiImage,
  FiLayers,
  FiPlus,
  FiRadio,
  FiShield,
  FiWind,
  FiX,
} from 'react-icons/fi'
import styled, { type DefaultTheme, useTheme } from 'styled-components'

import { useHistoricalCountriesByModernCountry } from '@/features/country/api/use-historical-countries-by-modern-country.hook'
import * as S from '@/pages/events/create/event-create.styles'
import {
  administrationDepartmentApi,
  type AdministrationDepartment,
} from '@/shared/api/administration-department'
import { getAllCountries, type CountryResponseDto } from '@/shared/api/countries'
import {
  getAllHistoricalCountries,
  type HistoricalCountryResponseDto,
} from '@/shared/api/historical-countries'
import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import {
  militaryUnitApi,
  type CreateMilitaryUnitInput,
  type MilitaryUnit,
  type MilitaryUnitDatePartsDto,
  type MilitaryUnitLineageDto,
  type MilitaryUnitTenureItem,
  type MilitaryUnitTransitionKind,
  type MilitaryUnitType,
} from '@/shared/api/military-unit'
import { personCareerApi } from '@/shared/api/person-career'
import { getAllPersons, type PersonResponseDto } from '@/shared/api/persons'
import {
  getUploadImageUrl,
  toUploadStoragePath,
  uploadImage,
  validateImageFile,
} from '@/shared/api/upload'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import {
  describeLifespanMismatch,
  formatCountryPeriod,
} from '@/shared/lib/country-period'
import {
  filterCountriesByQuery,
  matchesHintYearRange,
  type CountryHintYearRange,
} from '@/shared/lib/country-picker-filter'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import { isDefenseRelatedCategory } from '@/shared/lib/ministry-department/ministry-department-utils'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { AlertBox } from '@/shared/ui/alert-box/alert-box'
import { confirm } from '@/shared/ui/confirm-dialog'
import { CountryPicker } from '@/shared/ui/country-picker'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import {
  InstitutionAppointmentModal,
  type EditableInstitutionTenure,
} from '@/shared/ui/institution-appointment-modal'
import { InlineDateField } from '@/shared/ui/person-register-modal/sections/inline-date-field'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import {
  PlaceSelect,
  type PlaceResult,
} from '@/shared/ui/place-autocomplete/place-autocomplete'
import {
  KitBusyBar,
  KitChipGroup,
  KitChoiceChip,
  KitFormLoading,
  KitGroupLabel,
  KitRemoveButton,
  KitUploadActions,
  KitUploadFilled,
  KitUploadRemove,
  KitUploadStrip,
  KitUploadText,
  KitUploadThumb,
} from '@/shared/ui/register-form-kit/register-form-kit'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import {
  FooterHint,
  FooterJumpArrow,
  FooterJumpButton,
  FooterKbd,
  FooterMissingCount,
  FooterReadyBadge,
  FooterReadyGroup,
  FooterShortcutItem,
  HeaderActionsBar,
  HeaderResetBtn,
  SectionJumpBtn,
  SectionJumpNav,
} from '@/shared/ui/register-modal-shell/register-modal-chrome'
import {
  PersonRegisterModalCancelBtn,
  PersonRegisterModalFormScroll,
  PersonRegisterModalPrimaryBtn,
  PersonRegisterModalStickyFooter,
} from '@/shared/ui/register-modal-shell/register-modal-shell'
import { SegmentControl } from '@/shared/ui/segment-control/segment-control'
import { MobileSectionStrip } from '@/shared/ui/side-panel-form'
import { notify } from '@/shared/ui/toast'

const LAYOUT_STORAGE_KEY = 'papyrus:military-unit-register-layout'

function readInitialLayoutMode(): 'split' | 'single' {
  if (typeof window === 'undefined') return 'split'
  try {
    const saved = window.localStorage.getItem(LAYOUT_STORAGE_KEY)
    return saved === 'single' ? 'single' : 'split'
  } catch {
    return 'split'
  }
}

const CREATE_LEAVE_MESSAGE =
  '작성 중인 군사 사령부·부대 내용이 있습니다. 저장하지 않고 창을 닫으시겠습니까?'
const EDIT_LEAVE_MESSAGE =
  '저장하지 않은 변경 사항이 있습니다. 창을 닫으시겠습니까?'
const RESET_CONFIRM_MESSAGE =
  '작성 중인 내용을 모두 지우고 처음 상태로 되돌리시겠습니까?'

interface UnitTypeOptionDef {
  value: MilitaryUnitType
  label: string
  shortLabel: string
  group: string
  keywords: string
  primaryForBranches: string[]
}

const UNIT_TYPES: ReadonlyArray<UnitTypeOptionDef> = [
  {
    value: 'SUPREME_COMMAND',
    label: '최고사령부 (OKW · STAVKA · 대본영 등)',
    shortLabel: '최고사령부',
    group: '최고 · 상급 지휘기구',
    keywords: 'SUPREME_COMMAND OKW STAVKA 대본영 국방군 최고사령부 총사령부',
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
    label: '각군 총사령부 (OKH · OKM · OKL · 육본 등)',
    shortLabel: '각군 총사령부 · 본부',
    group: '최고 · 상급 지휘기구',
    keywords: 'SERVICE_HQ OKH OKM OKL 육군본부 해군본부 공군본부 총사령부',
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
    label: '집단군 (Heeresgruppe · 총군)',
    shortLabel: '집단군',
    group: '전략 · 작전 제대',
    keywords: 'ARMY_GROUP Heeresgruppe 집단군 총군',
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
    keywords: 'MILITARY_DISTRICT Wehrkreis 군관구 관구 진수부',
    primaryForBranches: ['ARMY', 'JOINT'],
  },
  {
    value: 'FIELD_ARMY',
    label: '야전군 · 기갑군',
    shortLabel: '야전군',
    group: '전략 · 작전 제대',
    keywords: 'FIELD_ARMY Armee 야전군 기갑군 군사령부',
    primaryForBranches: ['ARMY', ''],
  },
  {
    value: 'CORPS',
    label: '군단 (Korps)',
    shortLabel: '군단',
    group: '전략 · 작전 제대',
    keywords: 'CORPS Korps 군단 기갑군단',
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
    keywords: 'BATTALION 대대 중전차대대',
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
    label: '항공함대 (Luftflotte)',
    shortLabel: '항공함대',
    group: '해군 · 공군 · 특수 · 기타',
    keywords: 'AIR_FLEET Luftflotte 항공함대 공군',
    primaryForBranches: ['AIR_FORCE'],
  },
  {
    value: 'AIR_CORPS',
    label: '항공군단 · 비행군단',
    shortLabel: '항공군단',
    group: '해군 · 공군 · 특수 · 기타',
    keywords: 'AIR_CORPS Fliegerkorps 항공군단 비행군단',
    primaryForBranches: ['AIR_FORCE'],
  },
  {
    value: 'WING',
    label: '비행단 (Wing · Geschwader)',
    shortLabel: '비행단',
    group: '해군 · 공군 · 특수 · 기타',
    keywords: 'WING Geschwader 전투비행단 비행단',
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
    keywords: 'DETACHMENT Armeeabteilung 분견군 파견대 지대',
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

const UNIT_TYPE_GROUPS = [
  '최고 · 상급 지휘기구',
  '전략 · 작전 제대',
  '전술 제대',
  '해군 · 공군 · 특수 · 기타',
] as const

const HIGH_COMMAND_PRESETS: ReadonlyArray<{
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
    label: '해군본부 · 연합함대',
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

const TRANSITION_KIND_OPTIONS: ReadonlyArray<{
  value: MilitaryUnitTransitionKind
  label: string
}> = [
  { value: 'REORGANIZE', label: '개편 · 승계' },
  { value: 'RENAME', label: '개칭' },
  { value: 'SPLIT', label: '분리 · 창설' },
  { value: 'MERGE', label: '통합' },
  { value: 'ABSORBED', label: '흡수' },
]

/**
 * 사건 등록 모달(`S.CategoryGrid` + `S.CategoryCard`)과 동일한 톤 토큰을 갖는 군종 정의
 */
const MILITARY_BRANCHES: ReadonlyArray<{
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

type FormSectionKey = 'basic' | 'command' | 'context'

const FORM_SECTION_META: ReadonlyArray<{
  key: FormSectionKey
  id: string
  label: string
}> = [
  { key: 'basic', id: 'military-unit-section-basic', label: '기본 정보' },
  {
    key: 'command',
    id: 'military-unit-section-command',
    label: '소속 · 지휘 · 계보',
  },
  {
    key: 'context',
    id: 'military-unit-section-context',
    label: '맥락 · 상세 기록',
  },
]

type TransitionDirection =
  | 'PREDECESSOR_DEPARTMENT'
  | 'PREDECESSOR_UNIT'
  | 'SUCCESSOR_UNIT'

interface PendingTransitionDraft {
  localKey: string
  direction: TransitionDirection
  targetId: string
  targetLabel: string
  kind: MilitaryUnitTransitionKind
  era: 'AD' | 'BC'
  year: string
  month: string
  note: string
}

export type CommanderDraftRow = {
  personId: string
  personName: string
  rankTitle: string
  roleTitle: string
  ordinal: string
  startEra: 'AD' | 'BC'
  startYear: string
  startMonth: string
  startDay: string
  endEra: 'AD' | 'BC'
  endYear: string
  endMonth: string
  endDay: string
}

function inferMilitaryUnitMetaFromName(
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
  if (/최고사령부|대본영|스타프카|\bOKW\b|\bSTAVKA\b/i.test(combined)) {
    inferredUnitType = 'SUPREME_COMMAND'
  } else if (
    /합동참모본부|참모본부|총참모부|\bJCS\b|\b합참\b/i.test(combined)
  ) {
    inferredUnitType = 'GENERAL_STAFF'
  } else if (
    /육군\s*총사령부|해군\s*총사령부|공군\s*총사령부|육군본부|해군본부|공군본부|\bOKH\b|\bOKM\b|\bOKL\b/i.test(
      combined,
    )
  ) {
    inferredUnitType = 'SERVICE_HQ'
  } else if (
    /전구사령부|방면총사령부|연합군\s*최고사령부|\bSHAEF\b/i.test(combined)
  ) {
    inferredUnitType = 'THEATER'
  } else if (/집단군|총군|Heeresgruppe/i.test(combined)) {
    inferredUnitType = 'ARMY_GROUP'
  } else if (/전선군|방면군/i.test(combined)) {
    inferredUnitType = 'FRONT'
  } else if (/군관구|진수부|Wehrkreis/i.test(combined)) {
    inferredUnitType = 'MILITARY_DISTRICT'
  } else if (/항공함대|Luftflotte/i.test(combined)) {
    inferredUnitType = 'AIR_FLEET'
  } else if (/함대|연합함대|기동함대/i.test(combined)) {
    inferredUnitType = 'FLEET'
  } else if (/항공군단|비행군단|Fliegerkorps/i.test(combined)) {
    inferredUnitType = 'AIR_CORPS'
  } else if (/비행단|전투비행단|폭격비행단|Geschwader/i.test(combined)) {
    inferredUnitType = 'WING'
  } else if (/비행전대|전대|전단/i.test(combined)) {
    inferredUnitType = 'SQUADRON'
  } else if (
    /특수전|특전사|특수부대|코만도|\bSAS\b|\bSEAL/i.test(combined)
  ) {
    inferredUnitType = 'SPECIAL_FORCES'
  } else if (/분견군|분견대|파견대|지대|Armeeabteilung/i.test(combined)) {
    inferredUnitType = 'DETACHMENT'
  } else if (
    /야전군|기갑군|제\d+\s*군(?!단|관구)|군사령부/i.test(combined)
  ) {
    inferredUnitType = 'FIELD_ARMY'
  } else if (/군단|기갑군단|\bKorps\b/i.test(combined)) {
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
  } else if (
    /공군|항공함대|항공군단|비행단|비행전대|전투비행단|\bOKL\b|\bLuftwaffe\b|\bLuftflotte\b/i.test(
      combined,
    )
  ) {
    inferredBranch = 'AIR_FORCE'
  } else if (
    /해군|함대|연합함대|기동함대|진수부|\bOKM\b|\bKriegsmarine\b/i.test(
      combined,
    )
  ) {
    inferredBranch = 'NAVY'
  } else if (
    /국방군\s*최고사령부|합동참모본부|대본영|스타프카|\bOKW\b|\bSTAVKA\b|\b합참\b|통합군|합동군/i.test(
      combined,
    )
  ) {
    inferredBranch = 'JOINT'
  } else if (/친위대|\bWaffen-SS\b|\bSS\b/i.test(combined)) {
    inferredBranch = 'OTHER'
  } else if (
    /육군|집단군|전선군|야전군|기갑군|군단|보병|기갑|기계화|포병|기병|공수|\bOKH\b|\bHeer\b/i.test(
      combined,
    )
  ) {
    inferredBranch = 'ARMY'
  }

  return { inferredUnitType, inferredBranch, inferredYear }
}

function buildCommanderRolePresets(
  unitTypeValue: MilitaryUnitType | '',
): string[] {
  switch (unitTypeValue) {
    case 'SUPREME_COMMAND':
      return ['최고사령관', '총장', '작전부장', '참모장']
    case 'GENERAL_STAFF':
      return ['참모총장', '합참의장', '작전부장', '참모차장']
    case 'SERVICE_HQ':
      return ['총사령관', '참모총장', '참모장']
    case 'ARMY_GROUP':
    case 'FRONT':
    case 'THEATER':
      return ['사령관', '총사령관', '참모장']
    case 'FIELD_ARMY':
      return ['사령관', '군사령관', '참모장']
    case 'CORPS':
    case 'AIR_CORPS':
      return ['군단장', '참모장']
    case 'DIVISION':
      return ['사단장', '참모장']
    case 'FLEET':
    case 'AIR_FLEET':
      return ['함대사령관', '사령관', '참모장']
    default:
      return ['사령관', '지휘관', '참모장']
  }
}

function parseIsoPartsFallback(isoDate: string | null | undefined): {
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

function hydrateStructuredParts(
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

function toCalendarInitialIso(
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

function toSignedComparableYear(
  eraVal: 'AD' | 'BC',
  yearStr: string,
): number | null {
  const trimmed = yearStr.trim()
  if (!trimmed) return null
  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isInteger(parsed) || parsed < 1) return null
  return eraVal === 'BC' ? -parsed : parsed
}

function collectDescendantUnitIds(
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

function formatTenureDateSpan(tenureItem: MilitaryUnitTenureItem): string {
  const formatSide = (
    eraVal?: string | null,
    yearVal?: number | null,
    monthVal?: number | null,
    dayVal?: number | null,
    isoVal?: string | null,
  ) => {
    if (yearVal != null && yearVal > 0) {
      const prefix = eraVal === 'BC' ? 'BC ' : ''
      const monthPart =
        monthVal != null ? `.${String(monthVal).padStart(2, '0')}` : ''
      const dayPart =
        monthVal != null && dayVal != null
          ? `.${String(dayVal).padStart(2, '0')}`
          : ''
      return `${prefix}${yearVal}${monthPart}${dayPart}`
    }
    if (isoVal) return isoVal.slice(0, 10).replace(/-/g, '.')
    return ''
  }
  const startLabel = formatSide(
    tenureItem.startEra,
    tenureItem.startYear,
    tenureItem.startMonth,
    tenureItem.startDay,
    tenureItem.startDate,
  )
  const endLabel = formatSide(
    tenureItem.endEra,
    tenureItem.endYear,
    tenureItem.endMonth,
    tenureItem.endDay,
    tenureItem.endDate,
  )
  if (!startLabel && !endLabel) return '재임 시기 미상'
  return `${startLabel || '?'} ~ ${endLabel || '현직·미상'}`
}

export type MilitaryUnitFormModalProps = {
  isOpen: boolean
  onClose: () => void
  /** 저장 성공 시 (목록 갱신 등) */
  onSaved?: () => void
  /** 신규 등록 시 기본 소속 국가 */
  defaultCountryId?: string | null
  /** 신규 시 기본 역사적 국가 ID (역사 국가 페이지 또는 역사 부처에서 열 때) */
  defaultHistoricalCountryId?: string | null
  /** 신규 시 연결할 중앙부처 ID (행정조직에서 열 때) */
  defaultAdministrationDepartmentId?: string | null
  /** 신규 시 기본 상위 부대 ID (편제 트리에서 '+ 예하 부대 추가'로 열 때) */
  defaultParentUnitId?: string | null
  /** 신규 시 기본 군종 */
  defaultBranch?: string | null
  /** 수정할 부대 ID — 있으면 수정 모드 */
  editingUnitId?: string | null
  /** 국가·연결 부처 변경 불가 (국가 상세 → 중앙부처 컨텍스트) */
  lockCountryAndDepartment?: boolean
}

export const MilitaryUnitFormModal: React.FC<MilitaryUnitFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  defaultCountryId = null,
  defaultHistoricalCountryId = null,
  defaultAdministrationDepartmentId = null,
  defaultParentUnitId = null,
  defaultBranch = null,
  editingUnitId = null,
  lockCountryAndDepartment = false,
}) => {
  const queryClient = useQueryClient()
  const playClickSound = useClickSound()
  const theme = useTheme()
  const isDarkMode = theme.mode === 'dark'
  const isEdit = Boolean(editingUnitId)

  const estCalendarAnchorId = useId()
  const disbCalendarAnchorId = useId()

  const [loading, setLoading] = useState(false)
  const [hydratingUnit, setHydratingUnit] = useState(false)
  const [insigniaUploading, setInsigniaUploading] = useState(false)
  const [insigniaDragOver, setInsigniaDragOver] = useState(false)
  const [activeSection, setActiveSection] = useState<FormSectionKey>('basic')
  const [layoutMode, setLayoutMode] = useState<'split' | 'single'>(
    readInitialLayoutMode,
  )
  const [isDirty, setIsDirty] = useState(false)
  const isDirtyRef = useRef(false)
  isDirtyRef.current = isDirty

  const [modernCountries, setModernCountries] = useState<CountryResponseDto[]>(
    [],
  )
  const [historicalCountries, setHistoricalCountries] = useState<
    HistoricalCountryResponseDto[]
  >([])
  const [allUnits, setAllUnits] = useState<MilitaryUnit[]>([])
  const [allPersons, setAllPersons] = useState<PersonResponseDto[]>([])
  const [personsLoading, setPersonsLoading] = useState(false)

  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const formRootRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const insigniaInputRef = useRef<HTMLInputElement>(null)
  const continueAfterSaveRef = useRef(false)

  // Modals
  const [countryModalOpen, setCountryModalOpen] = useState(false)
  const [establishedDateModalOpen, setEstablishedDateModalOpen] =
    useState(false)
  const [disbandedDateModalOpen, setDisbandedDateModalOpen] = useState(false)
  const [commanderPersonModalOpen, setCommanderPersonModalOpen] =
    useState(false)
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false)
  const [editingAppointmentTenure, setEditingAppointmentTenure] =
    useState<EditableInstitutionTenure | null>(null)

  // Compact UI toggles & inline quick search states (BasicInfoSection · EventTypeField 규격)
  const [showHighCommandPresets, setShowHighCommandPresets] = useState(false)
  const [showForeignAndMottoFields, setShowForeignAndMottoFields] =
    useState(false)
  const [showNewLineageForm, setShowNewLineageForm] = useState(false)
  const [showDetailedSpecs, setShowDetailedSpecs] = useState(false)
  const [showAllLinkedEras, setShowAllLinkedEras] = useState(false)
  const [eraFilterQuery, setEraFilterQuery] = useState('')
  const [isInlineCountryChangeOpen, setIsInlineCountryChangeOpen] =
    useState(false)
  const [countryQuickQuery, setCountryQuickQuery] = useState('')
  const [countryQuickFocused, setCountryQuickFocused] = useState(false)
  const countryQuickInputRef = useRef<HTMLInputElement>(null)

  const [showAllUnitTypes, setShowAllUnitTypes] = useState(false)

  const [parentUnitQuickQuery, setParentUnitQuickQuery] = useState('')
  const [parentUnitQuickFocused, setParentUnitQuickFocused] = useState(false)
  const [showAllParentUnitCandidates, setShowAllParentUnitCandidates] =
    useState(false)

  const [adminDeptQuickQuery, setAdminDeptQuickQuery] = useState('')
  const [adminDeptQuickFocused, setAdminDeptQuickFocused] = useState(false)
  const [showAllAdminDeptCandidates, setShowAllAdminDeptCandidates] =
    useState(false)

  const [commanderQuickQuery, setCommanderQuickQuery] = useState('')
  const [commanderQuickFocused, setCommanderQuickFocused] = useState(false)

  const [lineageQuickQuery, setLineageQuickQuery] = useState('')
  const [lineageQuickFocused, setLineageQuickFocused] = useState(false)

  // Form fields - 기본 정보
  const [name, setName] = useState('')
  const [abbreviation, setAbbreviation] = useState('')
  const [nameLocal, setNameLocal] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [unitType, setUnitType] = useState<MilitaryUnitType | ''>('')
  const [branch, setBranch] = useState('')
  const [countryId, setCountryId] = useState('')
  const [historicalCountryId, setHistoricalCountryId] = useState('')
  const [countryName, setCountryName] = useState('')
  const [countryFlagEmoji, setCountryFlagEmoji] = useState('')
  const [countryEnglishName, setCountryEnglishName] = useState('')
  const [parentUnitId, setParentUnitId] = useState('')
  const [administrationDepartmentId, setAdministrationDepartmentId] =
    useState('')
  const [adminDepartments, setAdminDepartments] = useState<
    AdministrationDepartment[]
  >([])
  const [lineageDepartments, setLineageDepartments] = useState<
    AdministrationDepartment[]
  >([])
  const [isActive, setIsActive] = useState(true)

  // 구조화 날짜 (창설·해산)
  const [establishedEra, setEstablishedEra] = useState<'AD' | 'BC'>('AD')
  const [establishedYear, setEstablishedYear] = useState('')
  const [establishedMonth, setEstablishedMonth] = useState('')
  const [establishedDay, setEstablishedDay] = useState('')
  const [disbandedEra, setDisbandedEra] = useState<'AD' | 'BC'>('AD')
  const [disbandedYear, setDisbandedYear] = useState('')
  const [disbandedMonth, setDisbandedMonth] = useState('')
  const [disbandedDay, setDisbandedDay] = useState('')

  const [description, setDescription] = useState('')

  // Form fields - 추가 군정보 & 지휘관
  const [nickname, setNickname] = useState('')
  const [motto, setMotto] = useState('')
  const [garrisonPlace, setGarrisonPlace] = useState<PlaceResult | null>(null)
  const [strength, setStrength] = useState('')
  const [insigniaUrl, setInsigniaUrl] = useState('')
  const [notableBattles, setNotableBattles] = useState('')
  const [honors, setHonors] = useState('')
  const [primaryMission, setPrimaryMission] = useState('')
  const [jurisdiction, setJurisdiction] = useState('')
  const [commanderRows, setCommanderRows] = useState<CommanderDraftRow[]>([])
  const [unitTenures, setUnitTenures] = useState<MilitaryUnitTenureItem[]>([])

  // Form fields - 전신·후신 계보
  const [predecessors, setPredecessors] = useState<MilitaryUnitLineageDto[]>([])
  const [successors, setSuccessors] = useState<MilitaryUnitLineageDto[]>([])
  const [pendingTransitions, setPendingTransitions] = useState<
    PendingTransitionDraft[]
  >([])
  const [newTransitionDirection, setNewTransitionDirection] =
    useState<TransitionDirection>('PREDECESSOR_DEPARTMENT')
  const [newTransitionTargetId, setNewTransitionTargetId] = useState('')
  const [newTransitionKind, setNewTransitionKind] =
    useState<MilitaryUnitTransitionKind>('REORGANIZE')
  const [newTransitionEra, setNewTransitionEra] = useState<'AD' | 'BC'>('AD')
  const [newTransitionYear, setNewTransitionYear] = useState('')
  const [newTransitionMonth, setNewTransitionMonth] = useState('')
  const [newTransitionNote, setNewTransitionNote] = useState('')
  const [transitionBusy, setTransitionBusy] = useState(false)

  // 계보 인라인 수정 상태 (수정 모드)
  const [editingTransitionId, setEditingTransitionId] = useState<string | null>(
    null,
  )
  const [editTransKind, setEditTransKind] =
    useState<MilitaryUnitTransitionKind>('REORGANIZE')
  const [editTransEra, setEditTransEra] = useState<'AD' | 'BC'>('AD')
  const [editTransYear, setEditTransYear] = useState('')
  const [editTransMonth, setEditTransMonth] = useState('')
  const [editTransNote, setEditTransNote] = useState('')
  const [lastCreatedUnit, setLastCreatedUnit] = useState<{
    id: string
    name: string
    abbreviation: string | null
  } | null>(null)

  const markDirty = useCallback((nextDirty = true) => {
    isDirtyRef.current = nextDirty
    setIsDirty(nextDirty)
  }, [])

  const toggleLayoutMode = useCallback(() => {
    playClickSound()
    setLayoutMode((prev) => {
      const next = prev === 'split' ? 'single' : 'split'
      try {
        window.localStorage.setItem(LAYOUT_STORAGE_KEY, next)
      } catch {
        // ignore storage errors
      }
      return next
    })
  }, [playClickSound])

  const scrollToSection = useCallback((sectionKey: FormSectionKey) => {
    setActiveSection(sectionKey)
    const sectionMeta = FORM_SECTION_META.find((item) => item.key === sectionKey)
    const targetNode =
      (sectionMeta ? document.getElementById(sectionMeta.id) : null) ??
      formRootRef.current?.querySelector<HTMLElement>(
        `[data-form-section="${sectionKey}"]`,
      )
    const leftPane = document.getElementById('military-unit-form-split-left')
    const rightPane = document.getElementById('military-unit-form-split-right')
    if (sectionKey === 'basic' && leftPane) {
      leftPane.scrollTo?.({ top: 0, behavior: 'smooth' })
      leftPane.scrollTop = 0
      return
    }
    if (sectionKey === 'command' && rightPane) {
      rightPane.scrollTo?.({ top: 0, behavior: 'smooth' })
      rightPane.scrollTop = 0
      return
    }
    targetNode?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleFormScroll = useCallback(
    (scrollEvent: React.UIEvent<HTMLDivElement>) => {
      const target = scrollEvent.target as HTMLElement | null
      if (target?.id === 'military-unit-form-split-right') {
        const rightRect = target.getBoundingClientRect()
        const contextEl = document.getElementById(
          'military-unit-section-context',
        )
        const nextKey: FormSectionKey =
          contextEl &&
          contextEl.getBoundingClientRect().top <= rightRect.top + 110
            ? 'context'
            : 'command'
        setActiveSection((prev) => (prev === nextKey ? prev : nextKey))
        return
      }
      if (target?.id === 'military-unit-form-split-left') {
        setActiveSection((prev) => (prev === 'basic' ? prev : 'basic'))
        return
      }
      const container = scrollEvent.currentTarget
      const containerRect = container.getBoundingClientRect()
      const threshold = containerRect.top + 110
      let currentKey: FormSectionKey = 'basic'
      for (const item of FORM_SECTION_META) {
        const sectionEl = document.getElementById(item.id)
        if (!sectionEl) continue
        if (sectionEl.getBoundingClientRect().top <= threshold) {
          currentKey = item.key
        }
      }
      setActiveSection((prev) => (prev === currentKey ? prev : currentKey))
    },
    [],
  )

  const selectedHistoricalCountry = useMemo(
    () =>
      historicalCountryId
        ? (historicalCountries.find(
            (item) => item.id === historicalCountryId,
          ) ?? null)
        : null,
    [historicalCountries, historicalCountryId],
  )

  const modernAnchorCountryId = useMemo(() => {
    if (countryId) return countryId
    if (defaultCountryId) return defaultCountryId
    if (selectedHistoricalCountry?.countries?.length) {
      return selectedHistoricalCountry.countries[0]?.id ?? ''
    }
    return ''
  }, [countryId, defaultCountryId, selectedHistoricalCountry])

  const { data: linkedHistoricalCountries = [] } =
    useHistoricalCountriesByModernCountry(modernAnchorCountryId)

  const linkedHistoricalIdSet = useMemo(() => {
    const idSet = new Set<string>()
    for (const histItem of linkedHistoricalCountries) {
      if (histItem.id) idSet.add(histItem.id)
    }
    return idSet
  }, [linkedHistoricalCountries])

  const modernAnchorCountry = useMemo(
    () =>
      modernAnchorCountryId
        ? (modernCountries.find((item) => item.id === modernAnchorCountryId) ??
          null)
        : null,
    [modernAnchorCountryId, modernCountries],
  )

  const resolvedSelectedHistorical = useMemo(
    () =>
      selectedHistoricalCountry ??
      (historicalCountryId
        ? (linkedHistoricalCountries.find(
            (item) => item.id === historicalCountryId,
          ) ?? null)
        : null),
    [
      historicalCountryId,
      linkedHistoricalCountries,
      selectedHistoricalCountry,
    ],
  )

  const selectedHistoricalSpan = useMemo(() => {
    if (!resolvedSelectedHistorical) return null
    if ('startYear' in resolvedSelectedHistorical) {
      const startParts = resolvedSelectedHistorical.startYear
        ? {
            era: (resolvedSelectedHistorical.startEra === 'BC'
              ? 'BC'
              : 'AD') as 'AD' | 'BC',
            year: String(Math.abs(resolvedSelectedHistorical.startYear)),
          }
        : null
      const endParts = resolvedSelectedHistorical.endYear
        ? {
            era: (resolvedSelectedHistorical.endEra === 'BC' ? 'BC' : 'AD') as
              | 'AD'
              | 'BC',
            year: String(Math.abs(resolvedSelectedHistorical.endYear)),
          }
        : null
      return {
        name: resolvedSelectedHistorical.name,
        start: startParts,
        end: endParts,
      }
    }
    const startParts = parseIsoPartsFallback(
      resolvedSelectedHistorical.startDate,
    )
    const endParts = parseIsoPartsFallback(resolvedSelectedHistorical.endDate)
    return {
      name: resolvedSelectedHistorical.name,
      start: startParts.year ? startParts : null,
      end: endParts.year ? endParts : null,
    }
  }, [resolvedSelectedHistorical])

  // 창설·해산 부호 연도 힌트 (시대 일치 배지 및 역사국가 존속기간 대조용)
  const unitHintYearRange = useMemo<CountryHintYearRange | null>(() => {
    const startSigned = toSignedComparableYear(establishedEra, establishedYear)
    const endSigned = isActive
      ? null
      : toSignedComparableYear(disbandedEra, disbandedYear)
    if (startSigned == null && endSigned == null) return null
    return {
      startYear: startSigned,
      endYear: endSigned ?? startSigned,
    }
  }, [
    disbandedEra,
    disbandedYear,
    establishedEra,
    establishedYear,
    isActive,
  ])

  // 연결된 시대 목록 정렬: 입력된 창설·해산 연도와 시대 일치하는 역사국가를 최우선 배치
  const prioritizedLinkedEras = useMemo(() => {
    if (linkedHistoricalCountries.length === 0) return []
    const matched: typeof linkedHistoricalCountries = []
    const unmatched: typeof linkedHistoricalCountries = []
    for (const eraItem of linkedHistoricalCountries) {
      if (unitHintYearRange && matchesHintYearRange(eraItem, unitHintYearRange)) {
        matched.push(eraItem)
      } else {
        unmatched.push(eraItem)
      }
    }
    return [...matched, ...unmatched]
  }, [linkedHistoricalCountries, unitHintYearRange])

  // 역사국가 존속기간 vs 창설 연도 불일치 소프트 경고 + 대안 시대 추천 (BasicInfoSection F33 규격)
  const historicalLifespanWarning = useMemo(() => {
    if (!resolvedSelectedHistorical) return null
    const startSigned = toSignedComparableYear(establishedEra, establishedYear)
    if (startSigned == null) return null
    const mismatchMessage = describeLifespanMismatch(
      resolvedSelectedHistorical,
      startSigned,
      { recordSupportsBc: true },
    )
    if (!mismatchMessage) return null

    const replacementEra = linkedHistoricalCountries.find(
      (candidate) =>
        candidate.id !== resolvedSelectedHistorical.id &&
        matchesHintYearRange(candidate, {
          startYear: startSigned,
          endYear: startSigned,
        }),
    )

    return {
      countryName: resolvedSelectedHistorical.name,
      message: mismatchMessage,
      replacementEra: replacementEra ?? null,
    }
  }, [
    establishedEra,
    establishedYear,
    linkedHistoricalCountries,
    resolvedSelectedHistorical,
  ])

  // 국가·시대 인라인 빠른 검색 후보 (BasicInfoSection CountryQuickSearchInput 규격)
  const countryQuickCandidates = useMemo(() => {
    const trimmed = countryQuickQuery.trim()
    if (!trimmed) return []
    const matchedModern = filterCountriesByQuery(modernCountries, trimmed)
      .slice(0, 4)
      .map((item) => ({
        id: item.id,
        name: item.name,
        flagEmoji: item.flagEmoji || '🏳️',
        isHistorical: false as const,
        periodLabel: '',
        eraMatch: false,
      }))
    const matchedHistorical = filterCountriesByQuery(
      historicalCountries,
      trimmed,
    )
      .sort((left, right) => {
        const leftMatch = Boolean(
          unitHintYearRange && matchesHintYearRange(left, unitHintYearRange),
        )
        const rightMatch = Boolean(
          unitHintYearRange && matchesHintYearRange(right, unitHintYearRange),
        )
        if (leftMatch !== rightMatch) return leftMatch ? -1 : 1
        return 0
      })
      .slice(0, 6)
      .map((item) => ({
        id: item.id,
        name: item.name,
        flagEmoji: '🏛️',
        isHistorical: true as const,
        periodLabel: formatCountryPeriod(item, { variant: 'short' }),
        eraMatch: Boolean(
          unitHintYearRange && matchesHintYearRange(item, unitHintYearRange),
        ),
        enName: item.enName ?? '',
        parentModernCountryId: item.countries?.[0]?.id ?? '',
      }))
    return [...matchedHistorical, ...matchedModern].slice(0, 8)
  }, [
    countryQuickQuery,
    historicalCountries,
    modernCountries,
    unitHintYearRange,
  ])

  const ensurePersonsLoaded = useCallback(() => {
    if (allPersons.length > 0 || personsLoading) return
    setPersonsLoading(true)
    getAllPersons()
      .then((list) => setAllPersons(Array.isArray(list) ? list : []))
      .catch(() => setAllPersons([]))
      .finally(() => setPersonsLoading(false))
  }, [allPersons.length, personsLoading])

  useEffect(() => {
    void loadCountries()
    void loadAllUnits()
  }, [])

  useEffect(() => {
    if (!isOpen) return
    void loadAllUnits()
  }, [isOpen])

  useEffect(() => {
    if (commanderPersonModalOpen) {
      ensurePersonsLoaded()
    }
  }, [commanderPersonModalOpen, ensurePersonsLoaded])

  useEffect(() => {
    if (!isOpen || !editingUnitId) return
    setActiveSection('basic')
    markDirty(false)
    void loadMilitaryUnit(editingUnitId)
  }, [isOpen, editingUnitId, markDirty])

  const resetCreateFields = useCallback(
    (options?: { keepContext?: boolean }) => {
      setName('')
      setAbbreviation('')
      setNameLocal('')
      setNameEn('')
      setUnitType('')
      setIsActive(true)
      setEstablishedEra('AD')
      setEstablishedYear('')
      setEstablishedMonth('')
      setEstablishedDay('')
      setDisbandedEra('AD')
      setDisbandedYear('')
      setDisbandedMonth('')
      setDisbandedDay('')
      setDescription('')
      setNickname('')
      setMotto('')
      setGarrisonPlace(null)
      setStrength('')
      setInsigniaUrl('')
      setNotableBattles('')
      setHonors('')
      setPrimaryMission('')
      setJurisdiction('')
      setCommanderRows([])
      setUnitTenures([])
      setPredecessors([])
      setSuccessors([])
      setPendingTransitions([])
      setEditingTransitionId(null)
      setNewTransitionDirection('PREDECESSOR_DEPARTMENT')
      setNewTransitionTargetId('')
      setNewTransitionKind('REORGANIZE')
      setNewTransitionEra('AD')
      setNewTransitionYear('')
      setNewTransitionMonth('')
      setNewTransitionNote('')
      setCountryQuickQuery('')
      setIsInlineCountryChangeOpen(false)
      setEraFilterQuery('')
      setParentUnitQuickQuery('')
      setAdminDeptQuickQuery('')
      setCommanderQuickQuery('')
      setLineageQuickQuery('')
      setShowAllLinkedEras(false)
      setShowAllUnitTypes(false)
      setShowForeignAndMottoFields(false)
      setShowNewLineageForm(false)
      setShowDetailedSpecs(false)
      setActiveSection('basic')
      markDirty(false)

      if (!options?.keepContext) {
        setBranch(defaultBranch ?? '')
        setParentUnitId(defaultParentUnitId ?? '')
        setAdministrationDepartmentId(defaultAdministrationDepartmentId ?? '')
        if (defaultHistoricalCountryId) {
          setHistoricalCountryId(defaultHistoricalCountryId)
          setCountryId(defaultCountryId ?? '')
        } else {
          setHistoricalCountryId('')
          if (defaultCountryId) {
            setCountryId(defaultCountryId)
          } else {
            setCountryId('')
            setCountryName('')
            setCountryFlagEmoji('')
            setCountryEnglishName('')
          }
        }
      }
    },
    [
      defaultAdministrationDepartmentId,
      defaultBranch,
      defaultCountryId,
      defaultHistoricalCountryId,
      defaultParentUnitId,
      markDirty,
    ],
  )

  /** 신규: 모달을 열 때 폼·기본 국가·중앙부처·상위 부대 연결 */
  useEffect(() => {
    if (!isOpen || editingUnitId) return
    setLastCreatedUnit(null)
    resetCreateFields({ keepContext: false })
  }, [isOpen, editingUnitId, resetCreateFields])

  /** 신규 생성 시 상위 부대(defaultParentUnitId)가 있으면 이름·군종·소속 국가·중앙부처 자동 상속 */
  useEffect(() => {
    if (!isOpen || editingUnitId || !parentUnitId || allUnits.length === 0)
      return
    const matchedParent = allUnits.find(
      (unitItem) => unitItem.id === parentUnitId,
    )
    if (!matchedParent) return
    if (!branch && matchedParent.branch) {
      setBranch(matchedParent.branch)
    }
    const parentDeptId =
      matchedParent.administrationDepartmentId ??
      matchedParent.administrationDepartment?.id ??
      ''
    if (!administrationDepartmentId && parentDeptId) {
      setAdministrationDepartmentId(parentDeptId)
    }
    if (matchedParent.historicalCountryId) {
      setHistoricalCountryId(matchedParent.historicalCountryId)
      setCountryId(matchedParent.countryId ?? defaultCountryId ?? '')
    } else if (matchedParent.countryId) {
      setHistoricalCountryId('')
      setCountryId(matchedParent.countryId)
    }
  }, [
    isOpen,
    editingUnitId,
    parentUnitId,
    allUnits,
    branch,
    administrationDepartmentId,
    defaultCountryId,
  ])

  useEffect(() => {
    if (
      !isOpen ||
      editingUnitId ||
      historicalCountryId ||
      !countryId ||
      modernCountries.length === 0
    )
      return
    const foundModern = modernCountries.find((item) => item.id === countryId)
    if (foundModern) {
      setCountryName(foundModern.name)
      setCountryFlagEmoji(foundModern.flagEmoji || '🏳️')
      setCountryEnglishName('')
    }
  }, [isOpen, editingUnitId, countryId, historicalCountryId, modernCountries])

  useEffect(() => {
    if (
      !isOpen ||
      editingUnitId ||
      !historicalCountryId ||
      historicalCountries.length === 0
    )
      return
    const foundHist = historicalCountries.find(
      (item) => item.id === historicalCountryId,
    )
    if (foundHist) {
      setCountryName(foundHist.name)
      setCountryFlagEmoji('🏛️')
      setCountryEnglishName(foundHist.enName || '')
    }
  }, [isOpen, editingUnitId, historicalCountryId, historicalCountries])

  useEffect(() => {
    if (!countryId && !historicalCountryId) {
      setAdminDepartments([])
      setLineageDepartments([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const directPromise = historicalCountryId
          ? administrationDepartmentApi.getByHistoricalCountryId(
              historicalCountryId,
            )
          : administrationDepartmentApi.getByCountryId(countryId)

        const modernFamilyPromise =
          historicalCountryId && modernAnchorCountryId
            ? administrationDepartmentApi.getByCountryId(modernAnchorCountryId)
            : Promise.resolve([] as AdministrationDepartment[])

        const [directList, modernFamilyList] = await Promise.all([
          directPromise,
          modernFamilyPromise,
        ])

        if (!cancelled) {
          const validDirect = Array.isArray(directList) ? directList : []
          setAdminDepartments(validDirect)

          const mergedMap = new Map<string, AdministrationDepartment>()
          for (const deptItem of validDirect) {
            mergedMap.set(deptItem.id, deptItem)
          }
          for (const deptItem of Array.isArray(modernFamilyList)
            ? modernFamilyList
            : []) {
            if (!mergedMap.has(deptItem.id)) {
              mergedMap.set(deptItem.id, deptItem)
            }
          }
          setLineageDepartments([...mergedMap.values()])

          if (administrationDepartmentId) {
            const matchedDept = validDirect.find(
              (deptItem) => deptItem.id === administrationDepartmentId,
            )
            if (
              matchedDept?.historicalCountryId &&
              matchedDept.historicalCountryId !== historicalCountryId
            ) {
              setHistoricalCountryId(matchedDept.historicalCountryId)
            }
          }
        }
      } catch {
        if (!cancelled) {
          setAdminDepartments([])
          setLineageDepartments([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    countryId,
    historicalCountryId,
    modernAnchorCountryId,
    administrationDepartmentId,
  ])

  useEffect(() => {
    if (!countryId && !historicalCountryId) setGarrisonPlace(null)
  }, [countryId, historicalCountryId])

  const loadCountries = async () => {
    try {
      const [modern, historical] = await Promise.all([
        getAllCountries(),
        getAllHistoricalCountries(),
      ])
      setModernCountries(modern)
      setHistoricalCountries(Array.isArray(historical) ? historical : [])
    } catch {
      // ignore
    }
  }

  const loadAllUnits = async () => {
    try {
      const units = await militaryUnitApi.getAll()
      setAllUnits(units)
    } catch {
      // ignore
    }
  }

  const loadMilitaryUnit = async (unitId: string) => {
    try {
      setLoading(true)
      setHydratingUnit(true)
      const unit = await militaryUnitApi.getById(unitId)
      setName(unit.name)
      setAbbreviation(unit.abbreviation || '')
      setNameLocal(unit.nameLocal || '')
      setNameEn(unit.nameEn || '')
      setUnitType(unit.unitType || '')
      setCountryId(unit.countryId || '')
      const hydratedHistoricalCountryId = unit.historicalCountryId || ''
      setHistoricalCountryId(hydratedHistoricalCountryId)
      if (unit.historicalCountry) {
        setCountryName(unit.historicalCountry.name)
        setCountryFlagEmoji('🏛️')
        setCountryEnglishName(unit.historicalCountry.enName || '')
      } else if (unit.country) {
        setCountryName(unit.country.name)
        setCountryFlagEmoji(unit.country.flagEmoji || '🏳️')
        setCountryEnglishName('')
      }
      setParentUnitId(unit.parentUnitId || '')
      setAdministrationDepartmentId(unit.administrationDepartmentId ?? '')
      setIsActive(unit.isActive ?? true)

      const hydratedEst = hydrateStructuredParts(
        unit.established,
        unit.establishedDate,
      )
      setEstablishedEra(hydratedEst.era)
      setEstablishedYear(hydratedEst.year)
      setEstablishedMonth(hydratedEst.month)
      setEstablishedDay(hydratedEst.day)

      const hydratedDisb = hydrateStructuredParts(
        unit.disbanded,
        unit.disbandedDate,
      )
      setDisbandedEra(hydratedDisb.era)
      setDisbandedYear(hydratedDisb.year)
      setDisbandedMonth(hydratedDisb.month)
      setDisbandedDay(hydratedDisb.day)

      setDescription(unit.description || '')
      setPredecessors(Array.isArray(unit.predecessors) ? unit.predecessors : [])
      setSuccessors(Array.isArray(unit.successors) ? unit.successors : [])
      setEditingTransitionId(null)

      setBranch(unit.branch || '')
      setNickname(unit.nickname || '')
      setMotto(unit.motto || '')
      setGarrisonPlace(
        unit.garrison
          ? {
              displayName: unit.garrison,
              shortName: unit.garrison,
              isManual: true,
            }
          : null,
      )
      setStrength(unit.strength || '')
      setInsigniaUrl(unit.insigniaUrl || '')
      setPrimaryMission(unit.primaryMission || '')
      setJurisdiction(unit.jurisdiction || '')
      setNotableBattles(unit.notableBattles || '')
      setHonors(unit.honors || '')

      setShowForeignAndMottoFields(
        Boolean(
          unit.nameLocal?.trim() ||
            unit.nameEn?.trim() ||
            unit.nickname?.trim() ||
            unit.motto?.trim(),
        ),
      )
      setShowDetailedSpecs(
        Boolean(
          unit.strength?.trim() ||
            unit.jurisdiction?.trim() ||
            unit.primaryMission?.trim() ||
            unit.notableBattles?.trim() ||
            unit.honors?.trim(),
        ),
      )
      setShowNewLineageForm(false)

      setUnitTenures(
        Array.isArray(unit.tenures)
          ? (unit.tenures as MilitaryUnitTenureItem[])
          : [],
      )
      setCommanderRows([])
      markDirty(false)
    } catch (loadError) {
      notify.error(
        getApiErrorMessage(loadError, '군부대 정보를 불러오는데 실패했습니다.'),
      )
      onClose()
    } finally {
      setLoading(false)
      setHydratingUnit(false)
    }
  }

  const refreshUnitTenuresAndLineage = async (unitId: string) => {
    try {
      const refreshed = await militaryUnitApi.getById(unitId)
      setUnitTenures(
        Array.isArray(refreshed.tenures)
          ? (refreshed.tenures as MilitaryUnitTenureItem[])
          : [],
      )
      setPredecessors(
        Array.isArray(refreshed.predecessors) ? refreshed.predecessors : [],
      )
      setSuccessors(
        Array.isArray(refreshed.successors) ? refreshed.successors : [],
      )
    } catch {
      // ignore background refresh error
    }
  }

  const handleInsigniaFileUpload = useCallback(
    async (selectedFile: File) => {
      try {
        validateImageFile(selectedFile)
        setInsigniaUploading(true)
        const uploaded = await uploadImage(selectedFile, 'military-units')
        setInsigniaUrl(toUploadStoragePath(uploaded.url) || uploaded.url)
        markDirty(true)
      } catch (uploadError) {
        notify.error(
          uploadError instanceof Error
            ? uploadError.message
            : '이미지 업로드에 실패했습니다.',
        )
      } finally {
        setInsigniaUploading(false)
      }
    },
    [markDirty],
  )

  const handleDeleteUnitTenure = async (tenureItem: MilitaryUnitTenureItem) => {
    const personLabel = tenureItem.person
      ? getPersonDisplayName(tenureItem.person)
      : '지휘관'
    const accepted = await confirm({
      title: '지휘관·참모 재임 삭제',
      message: `${personLabel} (${tenureItem.title || '지휘관'}) 임명 기록을 삭제하시겠습니까?`,
      confirmLabel: '삭제',
      danger: true,
    })
    if (!accepted) return
    try {
      await personCareerApi.deleteGovernmentPositionTenure(tenureItem.id)
      invalidateTenureQueries(queryClient, {
        personId: tenureItem.personId ?? tenureItem.person?.id ?? null,
        countryId: countryId || defaultCountryId || null,
        historicalCountryId: historicalCountryId || null,
      })
      void queryClient.invalidateQueries({ queryKey: ['military-units'] })
      void queryClient.invalidateQueries({ queryKey: ['military-unit'] })
      if (editingUnitId) {
        await refreshUnitTenuresAndLineage(editingUnitId)
      }
      notify.success('지휘관·참모 재임 기록이 삭제되었습니다.')
      onSaved?.()
    } catch (deleteError) {
      notify.error(
        getApiErrorMessage(deleteError, '재임 기록 삭제에 실패했습니다.'),
      )
    }
  }

  const parseTransitionTimeFields = (
    eraVal: 'AD' | 'BC',
    yearStr: string,
    monthStr: string,
  ): {
    era: 'AD' | 'BC' | null
    year: number | null
    month: number | null
  } | null => {
    const trimmedYear = yearStr.trim()
    const trimmedMonth = monthStr.trim()
    if (!trimmedYear && trimmedMonth) {
      notify.error('개편 연도 없이 월만 입력할 수 없습니다.')
      return null
    }
    if (!trimmedYear) {
      return { era: null, year: null, month: null }
    }
    const parsedYear = Number.parseInt(trimmedYear, 10)
    if (!Number.isInteger(parsedYear) || parsedYear < 1) {
      notify.error('개편 연도는 1 이상의 자연수로 입력해주세요.')
      return null
    }
    let parsedMonth: number | null = null
    if (trimmedMonth) {
      const monthNum = Number.parseInt(trimmedMonth, 10)
      if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
        notify.error('개편 월은 1~12 사이로 입력해주세요.')
        return null
      }
      parsedMonth = monthNum
    }
    return {
      era: eraVal,
      year: parsedYear,
      month: parsedMonth,
    }
  }

  const descendantUnitIds = useMemo(
    () => collectDescendantUnitIds(editingUnitId, allUnits),
    [editingUnitId, allUnits],
  )

  const availableParentUnits = useMemo(() => {
    return allUnits.filter((candidateUnit) => {
      if (candidateUnit.id === editingUnitId) return false
      if (descendantUnitIds.has(candidateUnit.id)) return false
      if (candidateUnit.id === parentUnitId) return true

      if (historicalCountryId) {
        if (candidateUnit.historicalCountryId) {
          return candidateUnit.historicalCountryId === historicalCountryId
        }
        return Boolean(
          modernAnchorCountryId &&
            candidateUnit.countryId === modernAnchorCountryId,
        )
      }
      if (countryId) {
        if (!candidateUnit.historicalCountryId) {
          return candidateUnit.countryId === countryId
        }
        return linkedHistoricalIdSet.has(candidateUnit.historicalCountryId)
      }
      return true
    })
  }, [
    allUnits,
    editingUnitId,
    descendantUnitIds,
    parentUnitId,
    historicalCountryId,
    modernAnchorCountryId,
    countryId,
    linkedHistoricalIdSet,
  ])

  const lineageCandidateUnits = useMemo(() => {
    return allUnits.filter((candidateUnit) => {
      if (candidateUnit.id === editingUnitId) return false
      if (
        historicalCountryId &&
        candidateUnit.historicalCountryId === historicalCountryId
      ) {
        return true
      }
      if (modernAnchorCountryId) {
        if (candidateUnit.countryId === modernAnchorCountryId) return true
        if (
          candidateUnit.historicalCountryId &&
          linkedHistoricalIdSet.has(candidateUnit.historicalCountryId)
        ) {
          return true
        }
      }
      if (!historicalCountryId && !modernAnchorCountryId) return true
      return false
    })
  }, [
    allUnits,
    editingUnitId,
    historicalCountryId,
    modernAnchorCountryId,
    linkedHistoricalIdSet,
  ])

  const handleAddTransition = async (overrideTargetId?: string) => {
    const targetIdToUse = overrideTargetId ?? newTransitionTargetId
    if (!targetIdToUse || transitionBusy) return
    const timeFields = parseTransitionTimeFields(
      newTransitionEra,
      newTransitionYear,
      newTransitionMonth,
    )
    if (!timeFields) return

    if (!isEdit || !editingUnitId) {
      const targetLabel =
        newTransitionDirection === 'PREDECESSOR_DEPARTMENT'
          ? (() => {
              const foundDept = lineageDepartments.find(
                (deptItem) => deptItem.id === targetIdToUse,
              )
              return foundDept
                ? `🏛️ ${foundDept.name}${foundDept.abbreviation ? ` (${foundDept.abbreviation})` : ''}`
                : targetIdToUse
            })()
          : (() => {
              const foundUnit = lineageCandidateUnits.find(
                (unitCandidate) => unitCandidate.id === targetIdToUse,
              )
              return foundUnit
                ? `🛡️ ${foundUnit.name}${foundUnit.abbreviation ? ` (${foundUnit.abbreviation})` : ''}`
                : targetIdToUse
            })()

      setPendingTransitions((prev) => [
        ...prev,
        {
          localKey: `${Date.now()}-${Math.random()}`,
          direction: newTransitionDirection,
          targetId: targetIdToUse,
          targetLabel,
          kind: newTransitionKind,
          era: newTransitionEra,
          year: newTransitionYear.trim(),
          month: newTransitionMonth.trim(),
          note: newTransitionNote.trim(),
        },
      ])
      setNewTransitionTargetId('')
      setLineageQuickQuery('')
      setNewTransitionYear('')
      setNewTransitionMonth('')
      setNewTransitionNote('')
      setShowNewLineageForm(false)
      markDirty(true)
      return
    }

    const transitionPayload = {
      kind: newTransitionKind,
      era: timeFields.era,
      year: timeFields.year,
      month: timeFields.month,
      note: newTransitionNote.trim() || null,
      ...(newTransitionDirection === 'PREDECESSOR_DEPARTMENT'
        ? { predecessorDepartmentId: targetIdToUse }
        : newTransitionDirection === 'PREDECESSOR_UNIT'
          ? { predecessorUnitId: targetIdToUse }
          : { successorUnitId: targetIdToUse }),
    }
    try {
      setTransitionBusy(true)
      await militaryUnitApi.addTransition(editingUnitId, transitionPayload)
      await refreshUnitTenuresAndLineage(editingUnitId)
      setNewTransitionTargetId('')
      setLineageQuickQuery('')
      setNewTransitionYear('')
      setNewTransitionMonth('')
      setNewTransitionNote('')
      setShowNewLineageForm(false)
      notify.success('전신·후신 계보가 연결되었습니다.')
      onSaved?.()
    } catch (transError) {
      notify.error(
        getApiErrorMessage(transError, '계보 연결에 실패했습니다.'),
      )
    } finally {
      setTransitionBusy(false)
    }
  }

  const startInlineEditTransition = (lineageItem: MilitaryUnitLineageDto) => {
    setEditingTransitionId(lineageItem.transitionId)
    setEditTransKind(lineageItem.kind)
    setEditTransEra(lineageItem.era === 'BC' ? 'BC' : 'AD')
    setEditTransYear(lineageItem.year != null ? String(lineageItem.year) : '')
    setEditTransMonth(
      lineageItem.month != null ? String(lineageItem.month) : '',
    )
    setEditTransNote(lineageItem.note ?? '')
  }

  const handleSaveInlineTransition = async (transitionId: string) => {
    if (!editingUnitId || transitionBusy) return
    const timeFields = parseTransitionTimeFields(
      editTransEra,
      editTransYear,
      editTransMonth,
    )
    if (!timeFields) return
    try {
      setTransitionBusy(true)
      await militaryUnitApi.updateTransition(transitionId, {
        kind: editTransKind,
        era: timeFields.era,
        year: timeFields.year,
        month: timeFields.month,
        note: editTransNote.trim() || null,
      })
      await refreshUnitTenuresAndLineage(editingUnitId)
      setEditingTransitionId(null)
      notify.success('계보 연결 정보가 수정되었습니다.')
      onSaved?.()
    } catch (updateError) {
      notify.error(
        getApiErrorMessage(updateError, '계보 수정에 실패했습니다.'),
      )
    } finally {
      setTransitionBusy(false)
    }
  }

  const handleDeleteTransition = async (transitionId: string) => {
    if (!editingUnitId || transitionBusy) return
    try {
      setTransitionBusy(true)
      await militaryUnitApi.deleteTransition(transitionId)
      await refreshUnitTenuresAndLineage(editingUnitId)
      if (editingTransitionId === transitionId) {
        setEditingTransitionId(null)
      }
      notify.success('계보 연결이 해제되었습니다.')
      onSaved?.()
    } catch (deleteError) {
      notify.error(
        getApiErrorMessage(deleteError, '계보 연결 해제에 실패했습니다.'),
      )
    } finally {
      setTransitionBusy(false)
    }
  }

  const buildStructuredDatePayload = (
    eraVal: 'AD' | 'BC',
    yearStr: string,
    monthStr: string,
    dayStr: string,
    fieldLabel: string,
  ):
    | {
        ok: true
        date: null
        info: {
          era: 'AD' | 'BC'
          year: number
          month: number | null
          day: number | null
        } | null
      }
    | { ok: false } => {
    const trimmedYear = yearStr.trim()
    const trimmedMonth = monthStr.trim()
    const trimmedDay = dayStr.trim()

    if (!trimmedYear) {
      if (trimmedMonth || trimmedDay) {
        notify.error(`${fieldLabel} 연도를 먼저 입력해주세요.`)
        return { ok: false }
      }
      return { ok: true, date: null, info: null }
    }

    const parsedYear = Number.parseInt(trimmedYear, 10)
    if (!Number.isInteger(parsedYear) || parsedYear < 1) {
      notify.error(`${fieldLabel} 연도는 1 이상의 자연수로 입력해주세요.`)
      return { ok: false }
    }

    let parsedMonth: number | null = null
    if (trimmedMonth) {
      const monthNum = Number.parseInt(trimmedMonth, 10)
      if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
        notify.error(`${fieldLabel} 월은 1~12 사이로 입력해주세요.`)
        return { ok: false }
      }
      parsedMonth = monthNum
    }

    let parsedDay: number | null = null
    if (trimmedDay) {
      if (parsedMonth == null) {
        notify.error(`${fieldLabel} 일을 입력하려면 월도 함께 입력해주세요.`)
        return { ok: false }
      }
      const dayNum = Number.parseInt(trimmedDay, 10)
      if (!Number.isInteger(dayNum) || dayNum < 1 || dayNum > 31) {
        notify.error(`${fieldLabel} 일은 1~31 사이로 입력해주세요.`)
        return { ok: false }
      }
      parsedDay = dayNum
    }

    return {
      ok: true,
      date: null,
      info: {
        era: eraVal,
        year: parsedYear,
        month: parsedMonth,
        day: parsedDay,
      },
    }
  }

  // 날짜 역전 및 존속기간 배지 계산
  const { isDateOrderInverted, lifespanBadgeLabel } = useMemo(() => {
    const startSigned = toSignedComparableYear(establishedEra, establishedYear)
    const effectiveDisbandedYear = isActive ? '' : disbandedYear
    const endSigned = toSignedComparableYear(
      disbandedEra,
      effectiveDisbandedYear,
    )

    if (startSigned != null && endSigned != null) {
      if (endSigned < startSigned) {
        return { isDateOrderInverted: true, lifespanBadgeLabel: null }
      }
      const spanYears = endSigned - startSigned
      return {
        isDateOrderInverted: false,
        lifespanBadgeLabel:
          spanYears === 0 ? '당해 해산 (1년 미만)' : `약 ${spanYears}년 존속`,
      }
    }
    if (startSigned != null) {
      return {
        isDateOrderInverted: false,
        lifespanBadgeLabel: isActive ? '현역 운용 중' : '창설 연도 기록됨',
      }
    }
    if (endSigned != null) {
      return {
        isDateOrderInverted: false,
        lifespanBadgeLabel: '해산·비운용',
      }
    }
    return {
      isDateOrderInverted: false,
      lifespanBadgeLabel: isActive ? '운용 중' : '해산·비운용',
    }
  }, [
    disbandedEra,
    disbandedYear,
    establishedEra,
    establishedYear,
    isActive,
  ])

  const hasCountry = Boolean(countryId || historicalCountryId)

  // 필수 입력/검증 누락 목록 계산 (사건 등록 모달 푸터 규격)
  const validationIssues = useMemo(() => {
    const issues: Array<{
      key: 'name' | 'country' | 'date-order' | 'commander'
      label: string
    }> = []
    if (!name.trim()) {
      issues.push({ key: 'name', label: '군부대·사령부명' })
    }
    if (!hasCountry) {
      issues.push({ key: 'country', label: '소속 국가 · 시대' })
    }
    if (isDateOrderInverted) {
      issues.push({
        key: 'date-order',
        label: '해산 시점이 창설 시점보다 앞설 수 없습니다',
      })
    }
    if (!isEdit && commanderRows.length > 0) {
      for (const cmdRow of commanderRows) {
        if (!cmdRow.roleTitle.trim() || !cmdRow.startYear.trim()) {
          issues.push({
            key: 'commander',
            label: `지휘관 ${cmdRow.personName} 직책·부임연도`,
          })
          break
        }
      }
    }
    return issues
  }, [commanderRows, hasCountry, isDateOrderInverted, isEdit, name])

  const isFormValid = validationIssues.length === 0
  const firstValidationIssue = validationIssues[0] ?? null

  const focusFirstMissingField = useCallback(() => {
    if (!firstValidationIssue) return
    if (firstValidationIssue.key === 'name') {
      scrollToSection('basic')
      window.setTimeout(() => nameInputRef.current?.focus(), 100)
      return
    }
    if (firstValidationIssue.key === 'country') {
      scrollToSection('basic')
      if (!lockCountryAndDepartment) {
        setCountryModalOpen(true)
      }
      return
    }
    if (firstValidationIssue.key === 'date-order') {
      scrollToSection('basic')
      return
    }
    if (firstValidationIssue.key === 'commander') {
      scrollToSection('command')
    }
  }, [firstValidationIssue, lockCountryAndDepartment, scrollToSection])

  const requestClose = useCallback(async () => {
    if (loading || insigniaUploading) return
    const leaveMsg = isEdit ? EDIT_LEAVE_MESSAGE : CREATE_LEAVE_MESSAGE
    if (
      isDirtyRef.current &&
      !(await confirm({ title: '확인', message: leaveMsg }))
    ) {
      return
    }
    markDirty(false)
    onClose()
  }, [insigniaUploading, isEdit, loading, markDirty, onClose])

  const handleResetForm = useCallback(async () => {
    if (loading || insigniaUploading) return
    if (
      isDirtyRef.current &&
      !(await confirm({ title: '초기화 확인', message: RESET_CONFIRM_MESSAGE }))
    ) {
      return
    }
    playClickSound()
    resetCreateFields({ keepContext: false })
    scrollToSection('basic')
    window.setTimeout(() => nameInputRef.current?.focus(), 80)
  }, [
    insigniaUploading,
    loading,
    playClickSound,
    resetCreateFields,
    scrollToSection,
  ])

  const submitUnitForm = async (options?: { continueAfterSave?: boolean }) => {
    const shouldContinue = Boolean(options?.continueAfterSave && !isEdit)
    if (loading || insigniaUploading) return

    if (!name.trim()) {
      notify.error('군부대명을 입력해주세요.')
      scrollToSection('basic')
      window.setTimeout(() => nameInputRef.current?.focus(), 120)
      return
    }

    if (!countryId && !historicalCountryId) {
      notify.error('소속 국가를 선택해주세요.')
      scrollToSection('basic')
      return
    }

    if (isDateOrderInverted) {
      notify.error('해산 시점이 창설 시점보다 앞설 수 없습니다.')
      scrollToSection('basic')
      return
    }

    const establishedPayload = buildStructuredDatePayload(
      establishedEra,
      establishedYear,
      establishedMonth,
      establishedDay,
      '창설 시기',
    )
    if (!establishedPayload.ok) {
      scrollToSection('basic')
      return
    }

    const effectiveIsActive = disbandedYear.trim() ? false : isActive
    const disbandedPayload = effectiveIsActive
      ? { ok: true as const, date: null, info: null }
      : buildStructuredDatePayload(
          disbandedEra,
          disbandedYear,
          disbandedMonth,
          disbandedDay,
          '해산 시기',
        )
    if (!disbandedPayload.ok) {
      scrollToSection('basic')
      return
    }

    if (!isEdit && commanderRows.length > 0) {
      for (const cmdRow of commanderRows) {
        if (!cmdRow.roleTitle.trim()) {
          notify.error(
            `지휘관 ${cmdRow.personName}의 직책·보직명을 입력해주세요.`,
          )
          scrollToSection('command')
          return
        }
        const parsedStartYear = Number.parseInt(cmdRow.startYear.trim(), 10)
        if (!Number.isInteger(parsedStartYear) || parsedStartYear < 1) {
          notify.error(
            `지휘관 ${cmdRow.personName}의 부임 연도를 자연수로 입력해주세요.`,
          )
          scrollToSection('command')
          return
        }
        if (cmdRow.endYear.trim()) {
          const parsedEndYear = Number.parseInt(cmdRow.endYear.trim(), 10)
          if (!Number.isInteger(parsedEndYear) || parsedEndYear < 1) {
            notify.error(
              `지휘관 ${cmdRow.personName}의 이임 연도가 올바르지 않습니다.`,
            )
            scrollToSection('command')
            return
          }
        }
      }
    }

    const queuedTransitions = [...pendingTransitions]
    if (!isEdit && newTransitionTargetId) {
      const draftTime = parseTransitionTimeFields(
        newTransitionEra,
        newTransitionYear,
        newTransitionMonth,
      )
      if (!draftTime) {
        scrollToSection('command')
        return
      }
      queuedTransitions.push({
        localKey: 'inline-submit',
        direction: newTransitionDirection,
        targetId: newTransitionTargetId,
        targetLabel: '',
        kind: newTransitionKind,
        era: newTransitionEra,
        year: newTransitionYear.trim(),
        month: newTransitionMonth.trim(),
        note: newTransitionNote.trim(),
      })
    }

    const baseData = {
      name: name.trim(),
      abbreviation: abbreviation.trim() || null,
      nameLocal: nameLocal.trim() || null,
      nameEn: nameEn.trim() || null,
      unitType: unitType || null,
      branch: branch
        ? (branch as NonNullable<CreateMilitaryUnitInput['branch']>)
        : null,
      countryId: countryId || null,
      historicalCountryId: historicalCountryId || null,
      parentUnitId: parentUnitId || null,
      administrationDepartmentId: administrationDepartmentId || null,
      isActive: effectiveIsActive,
      establishedDate: establishedPayload.date,
      establishedInfo: establishedPayload.info,
      disbandedDate: disbandedPayload.date,
      disbandedInfo: disbandedPayload.info,
      nickname: nickname.trim() || null,
      motto: motto.trim() || null,
      garrison: garrisonPlace?.displayName?.trim() || null,
      strength: strength.trim() || null,
      insigniaUrl: toUploadStoragePath(insigniaUrl) || null,
      primaryMission: primaryMission.trim() || null,
      jurisdiction: jurisdiction.trim() || null,
      notableBattles: notableBattles.trim() || null,
      honors: honors.trim() || null,
      description: description.trim() || null,
    }

    try {
      setLoading(true)
      if (isEdit && editingUnitId) {
        await militaryUnitApi.update(
          editingUnitId,
          baseData as CreateMilitaryUnitInput,
        )
        notify.success('군사 사령부·부대가 수정되었습니다.')
      } else {
        const createdUnit = await militaryUnitApi.create(
          baseData as CreateMilitaryUnitInput,
        )

        for (const cmdRow of commanderRows) {
          const parsedStartYear = Number.parseInt(cmdRow.startYear.trim(), 10)
          const parsedStartMonth = cmdRow.startMonth.trim()
            ? Number.parseInt(cmdRow.startMonth.trim(), 10)
            : undefined
          const parsedStartDay = cmdRow.startDay.trim()
            ? Number.parseInt(cmdRow.startDay.trim(), 10)
            : undefined
          const parsedEndYear = cmdRow.endYear.trim()
            ? Number.parseInt(cmdRow.endYear.trim(), 10)
            : undefined
          const parsedEndMonth = cmdRow.endMonth.trim()
            ? Number.parseInt(cmdRow.endMonth.trim(), 10)
            : undefined
          const parsedEndDay = cmdRow.endDay.trim()
            ? Number.parseInt(cmdRow.endDay.trim(), 10)
            : undefined
          const parsedOrdinal = cmdRow.ordinal.trim()
            ? Number.parseInt(cmdRow.ordinal.trim(), 10)
            : undefined

          try {
            await personCareerApi.addGovernmentPositionTenure({
              personId: cmdRow.personId,
              positionType: 'MILITARY_COMMANDER',
              title: cmdRow.roleTitle.trim(),
              ...(cmdRow.rankTitle.trim()
                ? { rankTitle: cmdRow.rankTitle.trim() }
                : {}),
              ...(parsedOrdinal != null && Number.isFinite(parsedOrdinal)
                ? { ordinal: parsedOrdinal }
                : {}),
              ...(createdUnit.countryId
                ? { countryId: createdUnit.countryId }
                : countryId
                  ? { countryId }
                  : {}),
              ...(createdUnit.historicalCountryId
                ? { historicalCountryId: createdUnit.historicalCountryId }
                : historicalCountryId
                  ? { historicalCountryId }
                  : {}),
              militaryUnitId: createdUnit.id,
              startDateInfo: {
                era: cmdRow.startEra,
                year: parsedStartYear,
                ...(parsedStartMonth ? { month: parsedStartMonth } : {}),
                ...(parsedStartDay ? { day: parsedStartDay } : {}),
              },
              ...(parsedEndYear
                ? {
                    endDateInfo: {
                      era: cmdRow.endEra,
                      year: parsedEndYear,
                      ...(parsedEndMonth ? { month: parsedEndMonth } : {}),
                      ...(parsedEndDay ? { day: parsedEndDay } : {}),
                    },
                  }
                : {}),
            })
            invalidateTenureQueries(queryClient, {
              personId: cmdRow.personId,
              countryId: createdUnit.countryId ?? (countryId || null),
              historicalCountryId:
                createdUnit.historicalCountryId ??
                (historicalCountryId || null),
            })
          } catch (tenureErr) {
            notify.error(
              `지휘관 ${cmdRow.personName} 임명 등록 중 오류: ${getApiErrorMessage(tenureErr)}`,
            )
          }
        }

        for (const transRow of queuedTransitions) {
          const parsedYear = transRow.year
            ? Number.parseInt(transRow.year, 10)
            : null
          const parsedMonth = transRow.month
            ? Number.parseInt(transRow.month, 10)
            : null
          try {
            await militaryUnitApi.addTransition(createdUnit.id, {
              kind: transRow.kind,
              era:
                parsedYear != null && Number.isFinite(parsedYear)
                  ? transRow.era
                  : null,
              year:
                parsedYear != null && Number.isFinite(parsedYear)
                  ? parsedYear
                  : null,
              month:
                parsedMonth != null && Number.isFinite(parsedMonth)
                  ? parsedMonth
                  : null,
              note: transRow.note || null,
              ...(transRow.direction === 'PREDECESSOR_DEPARTMENT'
                ? { predecessorDepartmentId: transRow.targetId }
                : transRow.direction === 'PREDECESSOR_UNIT'
                  ? { predecessorUnitId: transRow.targetId }
                  : { successorUnitId: transRow.targetId }),
            })
          } catch (transErr) {
            notify.error(
              `계보 연결 중 일부 실패: ${getApiErrorMessage(transErr)}`,
            )
          }
        }

        if (shouldContinue) {
          setLastCreatedUnit({
            id: createdUnit.id,
            name: createdUnit.name,
            abbreviation: createdUnit.abbreviation ?? null,
          })
        }

        notify.success(
          shouldContinue
            ? `'${createdUnit.name}' 등록 완료 — 같은 소속으로 다음 부대를 이어서 등록합니다.`
            : '군사 사령부·부대가 등록되었습니다.',
        )
      }

      void queryClient.invalidateQueries({ queryKey: ['military-units'] })
      void queryClient.invalidateQueries({ queryKey: ['military-unit'] })
      void queryClient.invalidateQueries({
        queryKey: ['administration-departments'],
      })
      void loadAllUnits()
      markDirty(false)
      onSaved?.()

      if (shouldContinue) {
        continueAfterSaveRef.current = false
        resetCreateFields({ keepContext: true })
        scrollToSection('basic')
        window.setTimeout(() => nameInputRef.current?.focus(), 80)
        return
      }

      onClose()
    } catch (submitError) {
      notify.error(
        getApiErrorMessage(submitError, '군부대 저장에 실패했습니다.'),
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (formEvent: React.FormEvent) => {
    formEvent.preventDefault()
    void submitUnitForm({ continueAfterSave: continueAfterSaveRef.current })
  }

  const submitUnitFormRef = useRef(submitUnitForm)
  submitUnitFormRef.current = submitUnitForm

  const anyChildModalOpen =
    countryModalOpen ||
    establishedDateModalOpen ||
    disbandedDateModalOpen ||
    commanderPersonModalOpen ||
    appointmentModalOpen

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (
        (keyEvent.metaKey || keyEvent.ctrlKey) &&
        keyEvent.key === 'Enter' &&
        !loading &&
        !insigniaUploading &&
        !anyChildModalOpen &&
        isFormValid
      ) {
        keyEvent.preventDefault()
        const shouldContinue = Boolean(keyEvent.shiftKey && !isEdit)
        continueAfterSaveRef.current = shouldContinue
        void submitUnitFormRef.current({ continueAfterSave: shouldContinue })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    anyChildModalOpen,
    insigniaUploading,
    isEdit,
    isFormValid,
    isOpen,
    loading,
  ])

  // 클립보드 이미지 붙여넣기(⌘V / Ctrl+V)로 부대 마크·휘장 업로드
  useEffect(() => {
    if (!isOpen || anyChildModalOpen || insigniaUploading) return
    const handlePaste = (pasteEvent: ClipboardEvent) => {
      const items = pasteEvent.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const imageFile = item.getAsFile()
          if (imageFile) {
            pasteEvent.preventDefault()
            void handleInsigniaFileUpload(imageFile)
            break
          }
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [anyChildModalOpen, handleInsigniaFileUpload, insigniaUploading, isOpen])

  // 군종에 맞춘 추천 제대 칩 목록 & 추가 그룹 (EventTypeField 규격)
  const { primaryUnitTypes, extraUnitTypeCount } = useMemo(() => {
    const primary = UNIT_TYPES.filter(
      (item) =>
        item.primaryForBranches.includes(branch) || item.value === unitType,
    )
    const fallbackPrimary =
      primary.length > 0 ? primary : UNIT_TYPES.slice(0, 7)
    return {
      primaryUnitTypes: fallbackPrimary,
      extraUnitTypeCount: Math.max(
        0,
        UNIT_TYPES.length - fallbackPrimary.length,
      ),
    }
  }, [branch, unitType])

  // 상위 부대 빠른 검색 및 상급 사령부 추천 칩
  const prioritizedParentUnits = useMemo(() => {
    const highCommandSet = new Set<MilitaryUnitType>([
      'SUPREME_COMMAND',
      'GENERAL_STAFF',
      'SERVICE_HQ',
      'THEATER',
      'ARMY_GROUP',
      'FRONT',
      'MILITARY_DISTRICT',
      'FIELD_ARMY',
      'CORPS',
      'FLEET',
      'AIR_FLEET',
    ])
    return [...availableParentUnits].sort((left, right) => {
      const leftHigh =
        left.unitType && highCommandSet.has(left.unitType) ? 0 : 1
      const rightHigh =
        right.unitType && highCommandSet.has(right.unitType) ? 0 : 1
      if (leftHigh !== rightHigh) return leftHigh - rightHigh
      return left.name.localeCompare(right.name, 'ko')
    })
  }, [availableParentUnits])

  const parentUnitQuickMatches = useMemo(() => {
    const queryText = parentUnitQuickQuery.trim().toLowerCase()
    if (!queryText) return []
    return prioritizedParentUnits
      .filter((item) => {
        const hay =
          `${item.name} ${item.abbreviation ?? ''} ${item.nameEn ?? ''} ${item.nameLocal ?? ''}`.toLowerCase()
        return hay.includes(queryText)
      })
      .slice(0, 8)
  }, [parentUnitQuickQuery, prioritizedParentUnits])

  // 소관 군정 부처 정렬(국방·전쟁성 우선) 및 빠른 검색
  const prioritizedAdminDepts = useMemo(() => {
    const isDefenseLikeDept = (deptItem: AdministrationDepartment): boolean =>
      isDefenseRelatedCategory(deptItem.category, deptItem.kind) ||
      deptItem.kind === 'COLONIAL_GOVERNMENT' ||
      /국방|전쟁|군사|육군|해군|공군|방위|병조|병부|군부|안보|참모|방위사업|원수부/i.test(
        `${deptItem.name} ${deptItem.nameEn ?? ''}`,
      )

    return [...adminDepartments].sort((leftDept, rightDept) => {
      const leftDefense = isDefenseLikeDept(leftDept) ? 0 : 1
      const rightDefense = isDefenseLikeDept(rightDept) ? 0 : 1
      if (leftDefense !== rightDefense) return leftDefense - rightDefense
      return leftDept.name.localeCompare(rightDept.name, 'ko')
    })
  }, [adminDepartments])

  const adminDeptQuickMatches = useMemo(() => {
    const queryText = adminDeptQuickQuery.trim().toLowerCase()
    if (!queryText) return []
    return prioritizedAdminDepts
      .filter((deptItem) => {
        const hay =
          `${deptItem.name} ${deptItem.abbreviation ?? ''} ${deptItem.nameEn ?? ''} ${deptItem.nameLocal ?? ''}`.toLowerCase()
        return hay.includes(queryText)
      })
      .slice(0, 8)
  }, [adminDeptQuickQuery, prioritizedAdminDepts])

  // 계보 대상 빠른 검색 후보
  const lineageQuickMatches = useMemo(() => {
    const queryText = lineageQuickQuery.trim().toLowerCase()
    if (newTransitionDirection === 'PREDECESSOR_DEPARTMENT') {
      const pool = queryText
        ? lineageDepartments.filter((deptItem) =>
            `${deptItem.name} ${deptItem.abbreviation ?? ''} ${deptItem.nameEn ?? ''}`
              .toLowerCase()
              .includes(queryText),
          )
        : lineageDepartments
      return pool.slice(0, 8).map((deptItem) => ({
        id: deptItem.id,
        label: `${deptItem.name}${deptItem.abbreviation ? ` (${deptItem.abbreviation})` : ''}`,
        meta: deptItem.historicalCountry?.name ?? '행정부처',
        badge: '전신 부처',
      }))
    }
    const pool = queryText
      ? lineageCandidateUnits.filter((unitItem) =>
          `${unitItem.name} ${unitItem.abbreviation ?? ''} ${unitItem.nameEn ?? ''}`
            .toLowerCase()
            .includes(queryText),
        )
      : lineageCandidateUnits
    return pool.slice(0, 8).map((unitItem) => ({
      id: unitItem.id,
      label: `${unitItem.name}${unitItem.abbreviation ? ` (${unitItem.abbreviation})` : ''}`,
      meta: unitItem.historicalCountry?.name ?? unitItem.country?.name ?? '군부대',
      badge:
        newTransitionDirection === 'PREDECESSOR_UNIT' ? '전신 부대' : '후신 부대',
    }))
  }, [
    lineageCandidateUnits,
    lineageDepartments,
    lineageQuickQuery,
    newTransitionDirection,
  ])

  const selectedParentUnit = useMemo(
    () =>
      parentUnitId
        ? (allUnits.find((unitItem) => unitItem.id === parentUnitId) ?? null)
        : null,
    [allUnits, parentUnitId],
  )

  const selectedAdminDept = useMemo(
    () =>
      administrationDepartmentId
        ? (adminDepartments.find(
            (deptItem) => deptItem.id === administrationDepartmentId,
          ) ?? null)
        : null,
    [adminDepartments, administrationDepartmentId],
  )

  const commanderRolePresets = useMemo(
    () => buildCommanderRolePresets(unitType),
    [unitType],
  )

  const commanderQuickMatches = useMemo(() => {
    const queryText = commanderQuickQuery.trim().toLowerCase()
    if (!queryText) return []
    const existingIds = new Set(
      isEdit
        ? unitTenures
            .map((tenureItem) => tenureItem.personId ?? tenureItem.person?.id)
            .filter(Boolean)
        : commanderRows.map((rowItem) => rowItem.personId),
    )
    return allPersons
      .filter((personItem) => {
        if (existingIds.has(personItem.id)) return false
        const display = getPersonDisplayName({
          name: personItem.name ?? '',
          surname: personItem.surname ?? undefined,
          middleName: personItem.middleName ?? undefined,
          nameDisplayOrder: personItem.nameDisplayOrder ?? null,
          country: personItem.country ?? undefined,
        })
        const hay =
          `${display} ${personItem.name ?? ''} ${personItem.surname ?? ''} ${personItem.enName ?? ''}`.toLowerCase()
        return hay.includes(queryText)
      })
      .sort((leftPerson, rightPerson) => {
        const leftSameCountry = Boolean(
          (historicalCountryId &&
            leftPerson.historicalCountryId === historicalCountryId) ||
            (countryId && leftPerson.countryId === countryId),
        )
        const rightSameCountry = Boolean(
          (historicalCountryId &&
            rightPerson.historicalCountryId === historicalCountryId) ||
            (countryId && rightPerson.countryId === countryId),
        )
        if (leftSameCountry !== rightSameCountry) {
          return leftSameCountry ? -1 : 1
        }
        return (leftPerson.name ?? '').localeCompare(
          rightPerson.name ?? '',
          'ko',
        )
      })
      .slice(0, 8)
  }, [
    allPersons,
    commanderQuickQuery,
    commanderRows,
    countryId,
    historicalCountryId,
    isEdit,
    unitTenures,
  ])

  const handleQuickSelectCommander = useCallback(
    (personItem: PersonResponseDto) => {
      playClickSound()
      const displayPersonName =
        getPersonDisplayName({
          name: personItem.name ?? '',
          surname: personItem.surname ?? undefined,
          middleName: personItem.middleName ?? undefined,
          nameDisplayOrder: personItem.nameDisplayOrder ?? null,
          country: personItem.country ?? undefined,
        }) || personItem.name

      setCommanderQuickQuery('')
      setCommanderQuickFocused(false)

      if (isEdit && editingUnitId) {
        setEditingAppointmentTenure({
          personId: personItem.id,
          personName: displayPersonName,
          positionType: 'MILITARY_COMMANDER',
          title: commanderRolePresets[0] ?? '사령관',
          militaryUnitId: editingUnitId,
          startEra: establishedEra,
          startYear: establishedYear ? Number(establishedYear) : null,
        })
        setAppointmentModalOpen(true)
        return
      }

      setCommanderRows((prev) => [
        ...prev,
        {
          personId: personItem.id,
          personName: displayPersonName,
          rankTitle: '',
          roleTitle: commanderRolePresets[0] ?? '사령관',
          ordinal: String(prev.length + 1),
          startEra: establishedEra,
          startYear: establishedYear,
          startMonth: '',
          startDay: '',
          endEra: 'AD',
          endYear: '',
          endMonth: '',
          endDay: '',
        },
      ])
      markDirty(true)
    },
    [
      commanderRolePresets,
      editingUnitId,
      establishedEra,
      establishedYear,
      isEdit,
      markDirty,
      playClickSound,
    ],
  )

  const activeBranchStyle = useMemo<React.CSSProperties>(() => {
    const foundBranch = MILITARY_BRANCHES.find(
      (branchItem) => branchItem.value === branch,
    )
    const rgbVal = foundBranch ? foundBranch.rgb : '37, 99, 235'
    const lightText = foundBranch ? foundBranch.text : '#1d4ed8'
    const darkText = foundBranch ? foundBranch.textDark : '#93c5fd'
    const accentColor = foundBranch ? foundBranch.accent : '#2563eb'
    return {
      '--active-domain-rgb': rgbVal,
      '--active-domain-text': isDarkMode ? darkText : lightText,
      '--active-domain-accent': accentColor,
      '--chip-rgb': rgbVal,
      '--chip-text': lightText,
      '--chip-text-dark': darkText,
    } as React.CSSProperties
  }, [branch, isDarkMode])

  const inferredNameMeta = useMemo(
    () => inferMilitaryUnitMetaFromName(name, abbreviation),
    [name, abbreviation],
  )

  const inferredUnitTypeOption = useMemo(
    () =>
      inferredNameMeta.inferredUnitType
        ? (UNIT_TYPES.find(
            (typeItem) => typeItem.value === inferredNameMeta.inferredUnitType,
          ) ?? null)
        : null,
    [inferredNameMeta.inferredUnitType],
  )

  const inferredBranchOption = useMemo(
    () =>
      inferredNameMeta.inferredBranch
        ? (MILITARY_BRANCHES.find(
            (branchItem) =>
              branchItem.value === inferredNameMeta.inferredBranch,
          ) ?? null)
        : null,
    [inferredNameMeta.inferredBranch],
  )

  const canSuggestUnitType = Boolean(
    inferredUnitTypeOption && unitType !== inferredUnitTypeOption.value,
  )
  const canSuggestBranch = Boolean(
    inferredBranchOption && branch !== inferredBranchOption.value,
  )
  const canSuggestYear = Boolean(
    inferredNameMeta.inferredYear &&
      (establishedYear !== inferredNameMeta.inferredYear.year ||
        establishedEra !== inferredNameMeta.inferredYear.era),
  )
  const suggestionCount =
    (canSuggestBranch ? 1 : 0) +
    (canSuggestUnitType ? 1 : 0) +
    (canSuggestYear ? 1 : 0)

  const similarExistingUnits = useMemo(() => {
    const trimmedName = name.trim().toLowerCase()
    const trimmedAbbr = abbreviation.trim().toLowerCase()
    if (trimmedName.length < 2 && trimmedAbbr.length < 2) return []

    return allUnits
      .filter((candidateUnit) => {
        if (candidateUnit.id === editingUnitId) return false
        if (historicalCountryId) {
          if (candidateUnit.historicalCountryId !== historicalCountryId) {
            return false
          }
        } else if (countryId) {
          if (candidateUnit.countryId !== countryId) return false
        }
        const candName = candidateUnit.name.trim().toLowerCase()
        const candAbbr = (candidateUnit.abbreviation ?? '').trim().toLowerCase()
        const nameMatch =
          trimmedName.length >= 2 &&
          (candName === trimmedName ||
            candName.includes(trimmedName) ||
            trimmedName.includes(candName))
        const abbrMatch =
          trimmedAbbr.length >= 2 &&
          candAbbr.length >= 2 &&
          candAbbr === trimmedAbbr
        return nameMatch || abbrMatch
      })
      .slice(0, 3)
  }, [
    abbreviation,
    allUnits,
    countryId,
    editingUnitId,
    historicalCountryId,
    name,
  ])

  const parentInheritedEstParts = useMemo(() => {
    if (!selectedParentUnit) return null
    const hydrated = hydrateStructuredParts(
      selectedParentUnit.established,
      selectedParentUnit.establishedDate,
    )
    return hydrated.year ? hydrated : null
  }, [selectedParentUnit])

  const totalLineageCount = isEdit
    ? predecessors.length + successors.length
    : pendingTransitions.length

  const totalCommanderCount = isEdit
    ? unitTenures.length
    : commanderRows.length

  const totalCommandGroupCount =
    (parentUnitId ? 1 : 0) +
    (administrationDepartmentId ? 1 : 0) +
    totalCommanderCount +
    totalLineageCount

  const hasContextContent = Boolean(
    garrisonPlace?.displayName?.trim() ||
      strength.trim() ||
      primaryMission.trim() ||
      jurisdiction.trim() ||
      description.trim() ||
      notableBattles.trim() ||
      honors.trim(),
  )

  // 계보 3단 시각 보드용 데이터 (전신 ──▶ ★ 현재 부대 ──▶ 후신)
  const lineageBoardData = useMemo(() => {
    if (isEdit) {
      return {
        predecessorLabels: predecessors.map((item) =>
          item.targetType === 'DEPARTMENT'
            ? `🏛️ ${item.department?.name ?? '전신 부처'}`
            : `🛡️ ${item.unit?.name ?? '전신 부대'}`,
        ),
        successorLabels: successors.map(
          (item) => `🛡️ ${item.unit?.name ?? '후신 부대'}`,
        ),
      }
    }
    return {
      predecessorLabels: pendingTransitions
        .filter((item) => item.direction !== 'SUCCESSOR_UNIT')
        .map((item) => item.targetLabel),
      successorLabels: pendingTransitions
        .filter((item) => item.direction === 'SUCCESSOR_UNIT')
        .map((item) => item.targetLabel),
    }
  }, [isEdit, pendingTransitions, predecessors, successors])

  const renderLineageRow = (
    lineageItem: MilitaryUnitLineageDto,
    directionKind: 'PREDECESSOR' | 'SUCCESSOR',
  ) => {
    const isRowEditing = editingTransitionId === lineageItem.transitionId
    const badgeLabel =
      directionKind === 'PREDECESSOR'
        ? lineageItem.targetType === 'DEPARTMENT'
          ? '전신 부처'
          : '전신 부대'
        : '후신 부대'
    const targetName =
      lineageItem.targetType === 'DEPARTMENT'
        ? (lineageItem.department?.name ?? '부처 미상')
        : (lineageItem.unit?.name ?? '부대 미상')
    const kindLabel =
      TRANSITION_KIND_OPTIONS.find(
        (optItem) => optItem.value === lineageItem.kind,
      )?.label ?? lineageItem.kind
    const timeText = lineageItem.year
      ? `${lineageItem.era === 'BC' ? 'BC ' : ''}${lineageItem.year}년${lineageItem.month ? ` ${lineageItem.month}월` : ''}`
      : ''

    return (
      <ParticipantRow key={lineageItem.transitionId}>
        <ParticipantHeaderRow>
          <ParentEventBadge>{badgeLabel}</ParentEventBadge>
          <ParentEventTitle>{targetName}</ParentEventTitle>
          <RelatedEventDateMeta>
            {kindLabel}
            {timeText ? ` · ${timeText}` : ''}
          </RelatedEventDateMeta>
          <ParticipantActionCluster>
            <S.AddButton
              type="button"
              disabled={transitionBusy}
              onClick={() =>
                isRowEditing
                  ? setEditingTransitionId(null)
                  : startInlineEditTransition(lineageItem)
              }
            >
              <FiEdit2 size={12} />
              {isRowEditing ? '접기' : '편집'}
            </S.AddButton>
            <ParticipantRemove
              type="button"
              disabled={transitionBusy}
              aria-label="계보 연결 해제"
              title="계보 연결 해제"
              onClick={() =>
                void handleDeleteTransition(lineageItem.transitionId)
              }
            >
              <FiX size={15} />
            </ParticipantRemove>
          </ParticipantActionCluster>
        </ParticipantHeaderRow>

        {lineageItem.note && !isRowEditing && (
          <ParticipantSubNote>{lineageItem.note}</ParticipantSubNote>
        )}

        {isRowEditing && (
          <ParticipantRoleBar>
            <ParticipantRoleChipGroup
              role="radiogroup"
              aria-label="계보 변동 유형"
            >
              {TRANSITION_KIND_OPTIONS.map((optItem) => (
                <ParticipantRoleChipBtn
                  key={optItem.value}
                  type="button"
                  $selected={editTransKind === optItem.value}
                  onClick={() => setEditTransKind(optItem.value)}
                >
                  {optItem.label}
                </ParticipantRoleChipBtn>
              ))}
            </ParticipantRoleChipGroup>
            <CompactInlineFieldsRow>
              <CompactEraSelect
                aria-label="개편 기원"
                value={editTransEra}
                onChange={(changeEvent) =>
                  setEditTransEra(changeEvent.target.value as 'AD' | 'BC')
                }
              >
                <option value="AD">서기</option>
                <option value="BC">BC</option>
              </CompactEraSelect>
              <ParticipantNoteInput
                type="number"
                min={1}
                placeholder="연도"
                value={editTransYear}
                onChange={(changeEvent) => setEditTransYear(changeEvent.target.value)}
                style={{ maxWidth: 88 }}
              />
              <ParticipantNoteInput
                type="number"
                min={1}
                max={12}
                placeholder="월"
                value={editTransMonth}
                onChange={(changeEvent) => setEditTransMonth(changeEvent.target.value)}
                style={{ maxWidth: 64 }}
              />
              <ParticipantNoteInput
                type="text"
                placeholder="개편 비고 (선택)"
                value={editTransNote}
                onChange={(changeEvent) => setEditTransNote(changeEvent.target.value)}
              />
              <S.AddButton
                type="button"
                disabled={transitionBusy}
                onClick={() =>
                  void handleSaveInlineTransition(lineageItem.transitionId)
                }
              >
                <FiCheck size={13} />
                저장
              </S.AddButton>
            </CompactInlineFieldsRow>
          </ParticipantRoleBar>
        )}
      </ParticipantRow>
    )
  }

  if (!isOpen) return null

  const renderSectionJumpButtons = () =>
    FORM_SECTION_META.map((secItem) => {
      const isActiveSec = activeSection === secItem.key
      let badgeNode: React.ReactNode = null
      if (secItem.key === 'basic' && isFormValid && !hydratingUnit) {
        badgeNode = <SectionBadge $done>✓</SectionBadge>
      } else if (secItem.key === 'command' && totalCommandGroupCount > 0) {
        badgeNode = <SectionBadge>{totalCommandGroupCount}</SectionBadge>
      } else if (secItem.key === 'context' && hasContextContent) {
        badgeNode = <SectionBadge $done>✓</SectionBadge>
      }

      return (
        <SectionJumpBtn
          key={secItem.key}
          type="button"
          $active={isActiveSec}
          aria-current={isActiveSec ? 'location' : undefined}
          onClick={() => scrollToSection(secItem.key)}
        >
          <span>{secItem.label}</span>
          {badgeNode}
        </SectionJumpBtn>
      )
    })

  // 선택된 국가/시대의 존속기간 라벨
  const selectedCountryPeriodLabel = resolvedSelectedHistorical
    ? formatCountryPeriod(resolvedSelectedHistorical, { variant: 'short' })
    : ''

  // 시대 전환 칩 표시 개수 제한 (최대 2개 노출 + 더보기 토글 + 시대 필터)
  const filteredPrioritizedLinkedEras = eraFilterQuery.trim()
    ? prioritizedLinkedEras.filter((eraItem) => {
        const queryLower = eraFilterQuery.trim().toLowerCase()
        const spanLabel = formatCountryPeriod(eraItem, { variant: 'short' })
        return `${eraItem.name} ${eraItem.enName ?? ''} ${spanLabel}`
          .toLowerCase()
          .includes(queryLower)
      })
    : prioritizedLinkedEras

  const visibleLinkedEras = showAllLinkedEras
    ? filteredPrioritizedLinkedEras
    : prioritizedLinkedEras.slice(0, 2)
  const hiddenLinkedEraCount = Math.max(
    0,
    prioritizedLinkedEras.length - 2,
  )

  const handleSelectQuickCountryCandidate = (
    cand: (typeof countryQuickCandidates)[number],
  ) => {
    playClickSound()
    if (cand.isHistorical) {
      setCountryId(cand.parentModernCountryId || '')
      setHistoricalCountryId(cand.id)
      setCountryFlagEmoji('🏛️')
      setCountryEnglishName(cand.enName || '')
    } else {
      setHistoricalCountryId('')
      setCountryId(cand.id)
      setCountryFlagEmoji(cand.flagEmoji)
      setCountryEnglishName('')
    }
    setCountryName(cand.name)
    setAdministrationDepartmentId('')
    setCountryQuickQuery('')
    setCountryQuickFocused(false)
    setIsInlineCountryChangeOpen(false)
    markDirty(true)
  }

  // ==========================================================================
  // 1. 기본 정보 섹션 (사건 등록 모달 BasicInfoSection 정본 규격)
  // ==========================================================================
  const hasAnyForeignOrMotto = Boolean(
    nameLocal.trim() || nameEn.trim() || nickname.trim() || motto.trim(),
  )
  const hasAnyDetailedSpecs = Boolean(
    strength.trim() ||
      jurisdiction.trim() ||
      primaryMission.trim() ||
      notableBattles.trim() ||
      honors.trim(),
  )

  const basicSectionNode = (
    <FormGroupSection
      id="military-unit-section-basic"
      data-form-section="basic"
      onFocusCapture={() => setActiveSection('basic')}
    >
      <FormGroupHeader>
        <FormGroupTitle>기본 정보</FormGroupTitle>
      </FormGroupHeader>

      {/* 군부대·사령부명 + 약칭 + 선택적 원어/영문/별칭/표어 토글 */}
      <S.FormRow>
        <S.FormLabel htmlFor="military-unit-name">
          군부대·사령부명 <S.Required>*</S.Required>
        </S.FormLabel>
        <S.FormField>
          <NameAbbrGrid>
            <TitleInput
              ref={nameInputRef}
              id="military-unit-name"
              data-autofocus=""
              type="text"
              placeholder="예: 합동참모본부, 연합군 최고사령부, 중부집단군, 제1보병사단, 연합함대"
              value={name}
              onChange={(changeEvent) => {
                setName(changeEvent.target.value)
                markDirty(true)
              }}
              required
            />
            <AbbrInput
              id="military-unit-abbr"
              type="text"
              aria-label="약칭·부호"
              placeholder="약칭 (예: 합참, SHAEF)"
              value={abbreviation}
              onChange={(changeEvent) => {
                setAbbreviation(changeEvent.target.value)
                markDirty(true)
              }}
            />
          </NameAbbrGrid>

          {/* 신규 등록 시 이름을 아직 입력하지 않았고 상위부대 미지정일 때만 예시 노출 */}
          {!isEdit && !name.trim() && !parentUnitId && (
            <RecentParticipantBar>
              <RecentParticipantLabel>사령부 예시</RecentParticipantLabel>
              {(showHighCommandPresets
                ? HIGH_COMMAND_PRESETS
                : HIGH_COMMAND_PRESETS.slice(0, 4)
              ).map((presetItem) => (
                <RecentParticipantChip
                  key={presetItem.abbreviation}
                  type="button"
                  onClick={() => {
                    playClickSound()
                    setName(presetItem.name)
                    setAbbreviation(presetItem.abbreviation)
                    setNameLocal(presetItem.nameLocal ?? '')
                    setNameEn(presetItem.nameEn ?? '')
                    if (presetItem.nameLocal || presetItem.nameEn) {
                      setShowForeignAndMottoFields(true)
                    }
                    setUnitType(presetItem.unitType)
                    setBranch(presetItem.branch)
                    markDirty(true)
                  }}
                >
                  <span>+</span>
                  <span>{presetItem.label}</span>
                </RecentParticipantChip>
              ))}
              {HIGH_COMMAND_PRESETS.length > 4 && (
                <RecentMoreChip
                  type="button"
                  onClick={() => setShowHighCommandPresets((prev) => !prev)}
                >
                  {showHighCommandPresets
                    ? '접기'
                    : `+${HIGH_COMMAND_PRESETS.length - 4} 더보기`}
                </RecentMoreChip>
              )}
            </RecentParticipantBar>
          )}

          {/* 부대명 기반 자동 추론 제안 (BasicInfoSection TitleSuggestionRow 규격) */}
          {(canSuggestUnitType || canSuggestBranch || canSuggestYear) && (
            <TitleSuggestionRow>
              <TitleSuggestionLabel>부대명에서 찾음</TitleSuggestionLabel>
              {canSuggestBranch && inferredBranchOption && (
                <TitleSuggestionButton
                  type="button"
                  onClick={() => {
                    playClickSound()
                    setBranch(inferredBranchOption.value)
                    markDirty(true)
                  }}
                >
                  + 군종 {inferredBranchOption.label}
                </TitleSuggestionButton>
              )}
              {canSuggestUnitType && inferredUnitTypeOption && (
                <TitleSuggestionButton
                  type="button"
                  onClick={() => {
                    playClickSound()
                    setUnitType(inferredUnitTypeOption.value)
                    markDirty(true)
                  }}
                >
                  + 제대 {inferredUnitTypeOption.shortLabel}
                </TitleSuggestionButton>
              )}
              {canSuggestYear && inferredNameMeta.inferredYear && (
                <TitleSuggestionButton
                  type="button"
                  onClick={() => {
                    const yrHint = inferredNameMeta.inferredYear!
                    playClickSound()
                    setEstablishedEra(yrHint.era)
                    setEstablishedYear(yrHint.year)
                    markDirty(true)
                  }}
                >
                  + 창설연도{' '}
                  {inferredNameMeta.inferredYear.era === 'BC' ? 'BC ' : ''}
                  {inferredNameMeta.inferredYear.year}년
                </TitleSuggestionButton>
              )}
              {suggestionCount >= 2 && (
                <TitleApplyAllButton
                  type="button"
                  onClick={() => {
                    playClickSound()
                    if (canSuggestBranch && inferredBranchOption) {
                      setBranch(inferredBranchOption.value)
                    }
                    if (canSuggestUnitType && inferredUnitTypeOption) {
                      setUnitType(inferredUnitTypeOption.value)
                    }
                    if (canSuggestYear && inferredNameMeta.inferredYear) {
                      setEstablishedEra(inferredNameMeta.inferredYear.era)
                      setEstablishedYear(inferredNameMeta.inferredYear.year)
                    }
                    markDirty(true)
                  }}
                >
                  한 번에 채우기
                </TitleApplyAllButton>
              )}
            </TitleSuggestionRow>
          )}

          {/* 동일·유사 부대 탐지 및 원클릭 상위/전신 연결 */}
          {similarExistingUnits.length > 0 && (
            <SimilarEventsBar role="status" aria-live="polite">
              <SimilarEventsLabel>
                유사 부대 {similarExistingUnits.length}건
              </SimilarEventsLabel>
              <SimilarEventsList>
                {similarExistingUnits.map((dupUnit) => (
                  <SimilarEventItem key={dupUnit.id}>
                    <SimilarEventTitle>
                      {dupUnit.name}
                      {dupUnit.abbreviation ? ` (${dupUnit.abbreviation})` : ''}
                    </SimilarEventTitle>
                    {dupUnit.historicalCountry?.name && (
                      <SimilarEventMeta>
                        ({dupUnit.historicalCountry.name})
                      </SimilarEventMeta>
                    )}
                    {parentUnitId !== dupUnit.id && (
                      <SimilarEventActionBtn
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setParentUnitId(dupUnit.id)
                          markDirty(true)
                        }}
                      >
                        상위 부대로 지정
                      </SimilarEventActionBtn>
                    )}
                    {!isEdit &&
                      !pendingTransitions.some(
                        (item) => item.targetId === dupUnit.id,
                      ) && (
                        <SimilarEventActionBtn
                          type="button"
                          onClick={() => {
                            playClickSound()
                            setPendingTransitions((prev) => [
                              ...prev,
                              {
                                localKey: `${Date.now()}-${Math.random()}`,
                                direction: 'PREDECESSOR_UNIT',
                                targetId: dupUnit.id,
                                targetLabel: `${dupUnit.name}${dupUnit.abbreviation ? ` (${dupUnit.abbreviation})` : ''}`,
                                kind: 'REORGANIZE',
                                era: establishedEra,
                                year: establishedYear.trim(),
                                month: establishedMonth.trim(),
                                note: '',
                              },
                            ])
                            markDirty(true)
                          }}
                        >
                          전신 부대로 연결
                        </SimilarEventActionBtn>
                      )}
                  </SimilarEventItem>
                ))}
              </SimilarEventsList>
            </SimilarEventsBar>
          )}

          {/* 원어 · 영문 · 별칭 · 표어 (선택적 펼침) */}
          {showForeignAndMottoFields || hasAnyForeignOrMotto ? (
            <CollapsibleSubBox>
              <CollapsibleSubHeader>
                <span>원어 · 영문 표기 · 별칭 · 표어 (선택)</span>
                {!hasAnyForeignOrMotto && (
                  <DateQuickActionBtn
                    type="button"
                    onClick={() => setShowForeignAndMottoFields(false)}
                  >
                    접기
                  </DateQuickActionBtn>
                )}
              </CollapsibleSubHeader>
              <SubTitleGrid>
                <SubTitleField>
                  <SubTitleLabel>원어 표기</SubTitleLabel>
                  <S.Input
                    type="text"
                    aria-label="원어 표기"
                    placeholder="예: Grand Quartier Général, Ставка"
                    value={nameLocal}
                    onChange={(changeEvent) => {
                      setNameLocal(changeEvent.target.value)
                      markDirty(true)
                    }}
                  />
                </SubTitleField>
                <SubTitleField>
                  <SubTitleLabel>영문 표기</SubTitleLabel>
                  <S.Input
                    type="text"
                    aria-label="영문 표기"
                    placeholder="예: Armed Forces High Command"
                    value={nameEn}
                    onChange={(changeEvent) => {
                      setNameEn(changeEvent.target.value)
                      markDirty(true)
                    }}
                  />
                </SubTitleField>
                <SubTitleField>
                  <SubTitleLabel>별칭 · 통칭</SubTitleLabel>
                  <S.Input
                    type="text"
                    aria-label="별명·통칭"
                    placeholder="예: 맹호부대, 백골부대, 아프리카 군단"
                    value={nickname}
                    onChange={(changeEvent) => {
                      setNickname(changeEvent.target.value)
                      markDirty(true)
                    }}
                  />
                </SubTitleField>
                <SubTitleField>
                  <SubTitleLabel>부대 표어 · 모토</SubTitleLabel>
                  <S.Input
                    type="text"
                    aria-label="부대 표어"
                    placeholder="예: 필승, 충성, Semper Fidelis"
                    value={motto}
                    onChange={(changeEvent) => {
                      setMotto(changeEvent.target.value)
                      markDirty(true)
                    }}
                  />
                </SubTitleField>
              </SubTitleGrid>
            </CollapsibleSubBox>
          ) : (
            <OptionalExpandToggleBtn
              type="button"
              onClick={() => setShowForeignAndMottoFields(true)}
            >
              + 원어 · 영문 표기 · 별칭 · 표어 입력 (선택)
            </OptionalExpandToggleBtn>
          )}
        </S.FormField>
      </S.FormRow>

      {/* 창설 · 해산 시기 (EventRegisterModal InlineDateField + DateRangeGrid 규격) */}
      <S.FormRow>
        <S.FormLabel as="div">
          창설 · 해산 시기<OptionalTag>(선택)</OptionalTag>
          {lifespanBadgeLabel && (
            <S.PeriodBadge>{lifespanBadgeLabel}</S.PeriodBadge>
          )}
        </S.FormLabel>
        <S.FormField>
          <DateRangeHeaderBar>
            <SegmentControl
              ariaLabel="부대 운용 상태"
              size="sm"
              value={isActive ? 'active' : 'disbanded'}
              onChange={(nextMode) => {
                playClickSound()
                const nextActive = nextMode === 'active'
                setIsActive(nextActive)
                if (nextActive) {
                  setDisbandedYear('')
                  setDisbandedMonth('')
                  setDisbandedDay('')
                }
                markDirty(true)
              }}
              options={[
                { value: 'active', label: '현역 운용 중' },
                { value: 'disbanded', label: '해산 · 비운용' },
              ]}
            />
            {selectedHistoricalSpan?.start && (
              <DateQuickActionBtn
                type="button"
                title={`선택한 시대(${selectedHistoricalSpan.name})의 존속 시작·종료 연도를 채웁니다`}
                onClick={() => {
                  playClickSound()
                  if (selectedHistoricalSpan.start) {
                    setEstablishedEra(selectedHistoricalSpan.start.era)
                    setEstablishedYear(selectedHistoricalSpan.start.year)
                  }
                  if (selectedHistoricalSpan.end) {
                    setDisbandedEra(selectedHistoricalSpan.end.era)
                    setDisbandedYear(selectedHistoricalSpan.end.year)
                    setIsActive(false)
                  }
                  markDirty(true)
                }}
              >
                시대 존속기간 맞춤
              </DateQuickActionBtn>
            )}
          </DateRangeHeaderBar>

          <DateRangeGrid $singleColumn={isActive && !disbandedYear}>
            <S.DateRangeColumn>
              <DateColumnHeaderRow>
                <S.DateRangeLabel>창설일</S.DateRangeLabel>
                <DateQuickActions>
                  {(establishedYear || establishedMonth || establishedDay) && (
                    <DateQuickActionBtn
                      type="button"
                      onClick={() => {
                        playClickSound()
                        setEstablishedEra('AD')
                        setEstablishedYear('')
                        setEstablishedMonth('')
                        setEstablishedDay('')
                        markDirty(true)
                      }}
                    >
                      비우기
                    </DateQuickActionBtn>
                  )}
                </DateQuickActions>
              </DateColumnHeaderRow>
              <InlineDateField
                appearance="field"
                ariaLabelPrefix="창설일"
                era={establishedEra}
                year={establishedYear}
                month={establishedMonth}
                day={establishedDay}
                yearPlaceholder="연도"
                calendarAnchorId={estCalendarAnchorId}
                onOpenCalendar={() => {
                  playClickSound()
                  setEstablishedDateModalOpen(true)
                }}
                onChange={(patch) => {
                  if (patch.era !== undefined) setEstablishedEra(patch.era)
                  if (patch.year !== undefined) setEstablishedYear(patch.year)
                  if (patch.month !== undefined)
                    setEstablishedMonth(patch.month)
                  if (patch.day !== undefined) setEstablishedDay(patch.day)
                  markDirty(true)
                }}
              />
            </S.DateRangeColumn>

            {(!isActive || Boolean(disbandedYear)) && (
              <S.DateRangeColumn>
                <DateColumnHeaderRow>
                  <S.DateRangeLabel>해산일</S.DateRangeLabel>
                  <DateQuickActions>
                    {establishedYear &&
                      (!disbandedYear ||
                        disbandedYear !== establishedYear ||
                        disbandedEra !== establishedEra) && (
                        <DateQuickActionBtn
                          type="button"
                          onClick={() => {
                            playClickSound()
                            setDisbandedEra(establishedEra)
                            setDisbandedYear(establishedYear)
                            setDisbandedMonth(establishedMonth)
                            setDisbandedDay(establishedDay)
                            setIsActive(false)
                            markDirty(true)
                          }}
                        >
                          창설일과 같음
                        </DateQuickActionBtn>
                      )}
                    {(disbandedYear || disbandedMonth || disbandedDay) && (
                      <DateQuickActionBtn
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setDisbandedEra('AD')
                          setDisbandedYear('')
                          setDisbandedMonth('')
                          setDisbandedDay('')
                          markDirty(true)
                        }}
                      >
                        비우기
                      </DateQuickActionBtn>
                    )}
                  </DateQuickActions>
                </DateColumnHeaderRow>
                <InlineDateField
                  appearance="field"
                  ariaLabelPrefix="해산일"
                  era={disbandedEra}
                  year={disbandedYear}
                  month={disbandedMonth}
                  day={disbandedDay}
                  yearPlaceholder="연도"
                  calendarAnchorId={disbCalendarAnchorId}
                  onOpenCalendar={() => {
                    playClickSound()
                    setDisbandedDateModalOpen(true)
                  }}
                  onChange={(patch) => {
                    if (patch.era !== undefined) setDisbandedEra(patch.era)
                    if (patch.year !== undefined) {
                      setDisbandedYear(patch.year)
                      if (patch.year.trim()) setIsActive(false)
                    }
                    if (patch.month !== undefined) {
                      setDisbandedMonth(patch.month)
                      if (patch.month.trim()) setIsActive(false)
                    }
                    if (patch.day !== undefined) {
                      setDisbandedDay(patch.day)
                      if (patch.day.trim()) setIsActive(false)
                    }
                    markDirty(true)
                  }}
                />
              </S.DateRangeColumn>
            )}
          </DateRangeGrid>

          {isDateOrderInverted && (
            <S.ErrorMessage role="alert">
              해산일이 창설일보다 앞설 수 없습니다. 연도·기원(BC/서기)을
              확인해주세요.
            </S.ErrorMessage>
          )}
        </S.FormField>
      </S.FormRow>

      {/* 소속 국가 · 시대 (사건 등록 모달 BasicInfoSection 컴팩트 카드 + 빠른 검색 + 2칩 접기/펼치기 규격) */}
      <S.FormRow>
        <S.FormLabel as="div">
          소속 국가 · 시대 <S.Required>*</S.Required>
        </S.FormLabel>
        <S.FormField>
          {hasCountry ? (
            <ParentEventCard>
              <ParentEventHeaderRow>
                <ParentEventBadge>
                  {historicalCountryId ? '역사 국가' : '현대 국가'}
                </ParentEventBadge>
                <ParentEventTitle>
                  {countryFlagEmoji || '🏳️'} {countryName}
                  {countryEnglishName ? ` (${countryEnglishName})` : ''}
                </ParentEventTitle>
                {selectedCountryPeriodLabel && (
                  <RelatedEventDateMeta>
                    {selectedCountryPeriodLabel}
                  </RelatedEventDateMeta>
                )}
                {!lockCountryAndDepartment && (
                  <ParticipantActionCluster>
                    <S.AddButton
                      type="button"
                      onClick={() => {
                        playClickSound()
                        setIsInlineCountryChangeOpen((prev) => {
                          const nextOpen = !prev
                          if (nextOpen) {
                            window.setTimeout(
                              () => countryQuickInputRef.current?.focus(),
                              50,
                            )
                          }
                          return nextOpen
                        })
                      }}
                    >
                      {isInlineCountryChangeOpen ? '닫기' : '변경'}
                    </S.AddButton>
                    <ParticipantRemove
                      type="button"
                      aria-label="소속 국가 선택 해제"
                      title="소속 국가 선택 해제"
                      onClick={() => {
                        playClickSound()
                        setCountryId('')
                        setHistoricalCountryId('')
                        setCountryName('')
                        setCountryFlagEmoji('')
                        setCountryEnglishName('')
                        setAdministrationDepartmentId('')
                        setIsInlineCountryChangeOpen(false)
                        markDirty(true)
                      }}
                    >
                      <FiX size={15} />
                    </ParticipantRemove>
                  </ParticipantActionCluster>
                )}
              </ParentEventHeaderRow>

              {isInlineCountryChangeOpen && !lockCountryAndDepartment && (
                <CountryQuickSearchRow>
                  <CountryQuickSearchWrap>
                    <CountryQuickSearchInput
                      ref={countryQuickInputRef}
                      type="text"
                      value={countryQuickQuery}
                      placeholder="교체할 국가·시대 이름 입력 후 Enter…"
                      aria-label="교체할 소속 국가·시대 빠른 검색"
                      onFocus={() => setCountryQuickFocused(true)}
                      onBlur={() => {
                        window.setTimeout(
                          () => setCountryQuickFocused(false),
                          160,
                        )
                      }}
                      onKeyDown={(keyEvent) => {
                        if (keyEvent.key === 'Escape') {
                          keyEvent.stopPropagation()
                          setCountryQuickFocused(false)
                          setIsInlineCountryChangeOpen(false)
                          return
                        }
                        if (
                          keyEvent.key === 'Enter' &&
                          countryQuickCandidates.length > 0
                        ) {
                          keyEvent.preventDefault()
                          handleSelectQuickCountryCandidate(
                            countryQuickCandidates[0]!,
                          )
                        }
                      }}
                      onChange={(changeEvent) =>
                        setCountryQuickQuery(changeEvent.target.value)
                      }
                    />
                    {countryQuickFocused &&
                      countryQuickQuery.trim().length > 0 && (
                        <CountryQuickResultBox
                          role="listbox"
                          aria-label="국가 빠른 검색 결과"
                        >
                          {countryQuickCandidates.length > 0 ? (
                            countryQuickCandidates.map((cand) => (
                              <CountryQuickResultItem
                                key={`${cand.isHistorical ? 'H' : 'M'}-${cand.id}`}
                                type="button"
                                onMouseDown={(mouseEvent) =>
                                  mouseEvent.preventDefault()
                                }
                                onClick={() =>
                                  handleSelectQuickCountryCandidate(cand)
                                }
                              >
                                <CountryQuickResultFlag>
                                  {cand.flagEmoji}
                                </CountryQuickResultFlag>
                                <CountryQuickResultName>
                                  {cand.name}
                                </CountryQuickResultName>
                                {cand.eraMatch && (
                                  <CountryEraBadge>시대 일치</CountryEraBadge>
                                )}
                                <CountryQuickResultMeta>
                                  {cand.isHistorical
                                    ? cand.periodLabel
                                      ? `역사 · ${cand.periodLabel}`
                                      : '역사 국가'
                                    : '현대 국가'}
                                </CountryQuickResultMeta>
                              </CountryQuickResultItem>
                            ))
                          ) : (
                            <CountryQuickEmpty>
                              일치하는 국가가 없습니다. 우측 「전체 목록」에서
                              선택하세요.
                            </CountryQuickEmpty>
                          )}
                        </CountryQuickResultBox>
                      )}
                  </CountryQuickSearchWrap>
                  <S.AddButton
                    type="button"
                    onClick={() => {
                      playClickSound()
                      setCountryModalOpen(true)
                    }}
                  >
                    전체 목록
                  </S.AddButton>
                </CountryQuickSearchRow>
              )}

              {/* 연결된 역사국가가 있을 때: 최대 2개(시대 일치 우선) + +N개 시대 더보기 토글로 깔끔하게 표시 */}
              {!lockCountryAndDepartment &&
                modernAnchorCountry &&
                prioritizedLinkedEras.length > 0 && (
                  <ParticipantRoleBar>
                    {showAllLinkedEras && prioritizedLinkedEras.length > 4 && (
                      <CompactInlineFieldsRow>
                        <ParticipantNoteInput
                          type="text"
                          value={eraFilterQuery}
                          placeholder={`시대 이름·존속연도 필터 (총 ${prioritizedLinkedEras.length}개 시대)…`}
                          aria-label="연결된 역사 시대 필터"
                          onKeyDown={(keyEvent) => {
                            if (keyEvent.key === 'Escape') {
                              keyEvent.stopPropagation()
                              setEraFilterQuery('')
                            } else if (
                              keyEvent.key === 'Enter' &&
                              visibleLinkedEras.length > 0
                            ) {
                              keyEvent.preventDefault()
                              const topEra = visibleLinkedEras[0]!
                              playClickSound()
                              setCountryId(modernAnchorCountry.id)
                              setHistoricalCountryId(topEra.id)
                              setCountryName(topEra.name)
                              setCountryFlagEmoji('🏛️')
                              setCountryEnglishName(topEra.enName || '')
                              setAdministrationDepartmentId('')
                              setEraFilterQuery('')
                              markDirty(true)
                            }
                          }}
                          onChange={(changeEvent) =>
                            setEraFilterQuery(changeEvent.target.value)
                          }
                        />
                        {eraFilterQuery && (
                          <DateQuickActionBtn
                            type="button"
                            onClick={() => setEraFilterQuery('')}
                          >
                            필터 지우기
                          </DateQuickActionBtn>
                        )}
                      </CompactInlineFieldsRow>
                    )}

                    <RecentParticipantBar>
                      <RecentParticipantLabel>시대 전환</RecentParticipantLabel>
                      <RecentParticipantChip
                        type="button"
                        $active={
                          !historicalCountryId &&
                          countryId === modernAnchorCountry.id
                        }
                        onClick={() => {
                          playClickSound()
                          setHistoricalCountryId('')
                          setCountryId(modernAnchorCountry.id)
                          setCountryName(modernAnchorCountry.name)
                          setCountryFlagEmoji(
                            modernAnchorCountry.flagEmoji || '🏳️',
                          )
                          setCountryEnglishName('')
                          setAdministrationDepartmentId('')
                          markDirty(true)
                        }}
                      >
                        <span>{modernAnchorCountry.flagEmoji || '🏳️'}</span>
                        <span>{modernAnchorCountry.name} (현대)</span>
                      </RecentParticipantChip>

                      {visibleLinkedEras.map((histEra) => {
                        const isEraMatched = Boolean(
                          unitHintYearRange &&
                            matchesHintYearRange(histEra, unitHintYearRange),
                        )
                        const shortSpan = formatCountryPeriod(histEra, {
                          variant: 'short',
                        })
                        return (
                          <RecentParticipantChip
                            key={histEra.id}
                            type="button"
                            $active={historicalCountryId === histEra.id}
                            onClick={() => {
                              playClickSound()
                              setCountryId(modernAnchorCountry.id)
                              setHistoricalCountryId(histEra.id)
                              setCountryName(histEra.name)
                              setCountryFlagEmoji('🏛️')
                              setCountryEnglishName(histEra.enName || '')
                              setAdministrationDepartmentId('')
                              markDirty(true)
                            }}
                          >
                            <span>🏛️</span>
                            <span>{histEra.name}</span>
                            {shortSpan && (
                              <EraSpanMuted>({shortSpan})</EraSpanMuted>
                            )}
                            {isEraMatched && (
                              <CountryEraBadge>시대 일치</CountryEraBadge>
                            )}
                          </RecentParticipantChip>
                        )
                      })}

                      {prioritizedLinkedEras.length > 2 && (
                        <RecentMoreChip
                          type="button"
                          onClick={() => {
                            setShowAllLinkedEras((prev) => {
                              if (prev) setEraFilterQuery('')
                              return !prev
                            })
                          }}
                        >
                          {showAllLinkedEras
                            ? '접기'
                            : `+${hiddenLinkedEraCount}개 시대 더보기`}
                        </RecentMoreChip>
                      )}
                    </RecentParticipantBar>
                  </ParticipantRoleBar>
                )}
            </ParentEventCard>
          ) : (
            <CountryQuickSearchRow>
              <CountryQuickSearchWrap>
                <CountryQuickSearchInput
                  ref={countryQuickInputRef}
                  type="text"
                  disabled={lockCountryAndDepartment}
                  value={countryQuickQuery}
                  placeholder="국가·시대 빠른 검색 후 Enter (예: 한국, 고구려, 미합중국, 영국…)"
                  aria-label="소속 국가·시대 빠른 검색"
                  onFocus={() => setCountryQuickFocused(true)}
                  onBlur={() => {
                    window.setTimeout(() => setCountryQuickFocused(false), 160)
                  }}
                  onKeyDown={(keyEvent) => {
                    if (keyEvent.key === 'Escape') {
                      keyEvent.stopPropagation()
                      setCountryQuickFocused(false)
                      return
                    }
                    if (
                      keyEvent.key === 'Enter' &&
                      countryQuickCandidates.length > 0
                    ) {
                      keyEvent.preventDefault()
                      handleSelectQuickCountryCandidate(
                        countryQuickCandidates[0]!,
                      )
                    }
                  }}
                  onChange={(changeEvent) =>
                    setCountryQuickQuery(changeEvent.target.value)
                  }
                />
                {countryQuickFocused && countryQuickQuery.trim().length > 0 && (
                  <CountryQuickResultBox
                    role="listbox"
                    aria-label="국가 빠른 검색 결과"
                  >
                    {countryQuickCandidates.length > 0 ? (
                      countryQuickCandidates.map((cand) => (
                        <CountryQuickResultItem
                          key={`${cand.isHistorical ? 'H' : 'M'}-${cand.id}`}
                          type="button"
                          onMouseDown={(mouseEvent) =>
                            mouseEvent.preventDefault()
                          }
                          onClick={() =>
                            handleSelectQuickCountryCandidate(cand)
                          }
                        >
                          <CountryQuickResultFlag>
                            {cand.flagEmoji}
                          </CountryQuickResultFlag>
                          <CountryQuickResultName>
                            {cand.name}
                          </CountryQuickResultName>
                          {cand.eraMatch && (
                            <CountryEraBadge>시대 일치</CountryEraBadge>
                          )}
                          <CountryQuickResultMeta>
                            {cand.isHistorical
                              ? cand.periodLabel
                                ? `역사 · ${cand.periodLabel}`
                                : '역사 국가'
                              : '현대 국가'}
                          </CountryQuickResultMeta>
                        </CountryQuickResultItem>
                      ))
                    ) : (
                      <CountryQuickEmpty>
                        일치하는 국가가 없습니다. 우측 「국가 · 시대 선택」에서
                        전체 목록을 확인하세요.
                      </CountryQuickEmpty>
                    )}
                  </CountryQuickResultBox>
                )}
              </CountryQuickSearchWrap>

              <S.AddButton
                type="button"
                disabled={lockCountryAndDepartment}
                onClick={() => {
                  playClickSound()
                  setCountryModalOpen(true)
                }}
              >
                <FiPlus size={15} />
                국가 · 시대 선택
              </S.AddButton>
            </CountryQuickSearchRow>
          )}

          {/* 역사국가 존속기간 불일치 소프트 경고 + 원클릭 시대 교체 (BasicInfoSection F33 규격) */}
          {historicalLifespanWarning && (
            <AlertBox variant="warning">
              <LifespanWarnRow>
                <span>
                  <strong>{historicalLifespanWarning.countryName}</strong> —{' '}
                  {historicalLifespanWarning.message}.
                </span>
                {!lockCountryAndDepartment &&
                  historicalLifespanWarning.replacementEra && (
                    <LifespanReplaceBtn
                      type="button"
                      onClick={() => {
                        const rep = historicalLifespanWarning.replacementEra!
                        playClickSound()
                        setHistoricalCountryId(rep.id)
                        setCountryName(rep.name)
                        setCountryFlagEmoji('🏛️')
                        setCountryEnglishName(rep.enName || '')
                        setAdministrationDepartmentId('')
                        markDirty(true)
                      }}
                    >
                      {historicalLifespanWarning.replacementEra.name}(
                      {formatCountryPeriod(
                        historicalLifespanWarning.replacementEra,
                        { variant: 'short' },
                      )}
                      )으로 바꾸기
                    </LifespanReplaceBtn>
                  )}
              </LifespanWarnRow>
            </AlertBox>
          )}
        </S.FormField>
      </S.FormRow>

      {/* 군종 (EventRegisterModal S.CategoryGrid + S.CategoryCard 규격) */}
      <S.FormRow>
        <S.FormLabel as="div">
          군종<OptionalTag>(선택)</OptionalTag>
        </S.FormLabel>
        <S.FormField>
          <S.CategoryGrid role="radiogroup" aria-label="군종 선택">
            {MILITARY_BRANCHES.map((branchItem) => {
              const isSelected = branch === branchItem.value
              const Icon = branchItem.Icon
              const catCssVars = {
                '--cat-rgb': branchItem.rgb,
                '--cat-text': isDarkMode
                  ? branchItem.textDark
                  : branchItem.text,
                '--cat-accent': branchItem.accent,
              } as React.CSSProperties

              return (
                <S.CategoryCard
                  key={branchItem.value}
                  type="button"
                  $selected={isSelected}
                  style={catCssVars}
                  aria-pressed={isSelected}
                  onClick={() => {
                    playClickSound()
                    setBranch(isSelected ? '' : branchItem.value)
                    markDirty(true)
                  }}
                >
                  <S.CategoryIcon $selected={isSelected}>
                    <Icon size={13} strokeWidth={2.2} />
                  </S.CategoryIcon>
                  <S.CategoryLabel>{branchItem.label}</S.CategoryLabel>
                </S.CategoryCard>
              )
            })}
          </S.CategoryGrid>
        </S.FormField>
      </S.FormRow>

      {/* 부대 유형 · 제대 (군종 맞춤형 추천 칩 + 다른 제대 더보기) */}
      <S.FormRow $noBorder>
        <S.FormLabel as="div">
          부대 유형 · 제대<OptionalTag>(선택)</OptionalTag>
        </S.FormLabel>
        <S.FormField>
          <UnitTypeContainer>
            <KitChipGroup role="radiogroup" aria-label="주요 부대 유형">
              <KitChoiceChip
                type="button"
                $selected={!unitType}
                aria-pressed={!unitType}
                onClick={() => {
                  playClickSound()
                  setUnitType('')
                  markDirty(true)
                }}
              >
                선택 안 함
              </KitChoiceChip>
              {primaryUnitTypes.map((item) => {
                const selected = unitType === item.value
                return (
                  <KitChoiceChip
                    key={item.value}
                    type="button"
                    $selected={selected}
                    aria-pressed={selected}
                    title={item.label}
                    onClick={() => {
                      playClickSound()
                      setUnitType(selected ? '' : item.value)
                      markDirty(true)
                    }}
                  >
                    {item.shortLabel}
                  </KitChoiceChip>
                )
              })}
              {extraUnitTypeCount > 0 && (
                <MoreToggleChip
                  type="button"
                  aria-expanded={showAllUnitTypes}
                  onClick={() => setShowAllUnitTypes((prev) => !prev)}
                >
                  {showAllUnitTypes
                    ? '접기'
                    : `+ 다른 제대 더 보기 (${extraUnitTypeCount})`}
                </MoreToggleChip>
              )}
            </KitChipGroup>

            {showAllUnitTypes && (
              <ExtraGroupsStack>
                {UNIT_TYPE_GROUPS.map((groupLabel) => {
                  const groupItems = UNIT_TYPES.filter(
                    (item) => item.group === groupLabel,
                  )
                  return (
                    <ExtraGroupBlock key={groupLabel}>
                      <KitGroupLabel>{groupLabel}</KitGroupLabel>
                      <KitChipGroup>
                        {groupItems.map((item) => {
                          const selected = unitType === item.value
                          return (
                            <KitChoiceChip
                              key={item.value}
                              type="button"
                              $selected={selected}
                              aria-pressed={selected}
                              title={item.label}
                              onClick={() => {
                                playClickSound()
                                setUnitType(selected ? '' : item.value)
                                markDirty(true)
                              }}
                            >
                              {item.shortLabel}
                            </KitChoiceChip>
                          )
                        })}
                      </KitChipGroup>
                    </ExtraGroupBlock>
                  )
                })}
              </ExtraGroupsStack>
            )}
          </UnitTypeContainer>
        </S.FormField>
      </S.FormRow>
    </FormGroupSection>
  )

  // ==========================================================================
  // 2. 소속 · 지휘 · 계보 섹션 (BasicInfoSection ParentEventCard + ParticipantRow 규격)
  // ==========================================================================
  const commandSectionNode = (
    <FormGroupSection
      id="military-unit-section-command"
      data-form-section="command"
      onFocusCapture={() => setActiveSection('command')}
    >
      <FormGroupHeader>
        <FormGroupTitle>소속 · 지휘 · 계보</FormGroupTitle>
        {(totalCommanderCount > 0 || totalLineageCount > 0) && (
          <FormGroupRightCluster>
            <FormGroupSummaryBadge>
              지휘관 {totalCommanderCount}명 · 계보 {totalLineageCount}건
            </FormGroupSummaryBadge>
          </FormGroupRightCluster>
        )}
      </FormGroupHeader>

      {/* 상위 부대 · 사령부 (BasicInfoSection ParentEventCard + 빠른 검색 + 상급부대 칩 규격) */}
      <S.FormRow>
        <S.FormLabel as="div">
          상위 부대 · 사령부<OptionalTag>(선택)</OptionalTag>
        </S.FormLabel>
        <S.FormField>
          {selectedParentUnit ? (
            <ParentEventCard>
              <ParentEventHeaderRow>
                <ParentEventBadge>상위 편제</ParentEventBadge>
                <ParentEventTitle>
                  🛡️ {selectedParentUnit.name}
                  {selectedParentUnit.abbreviation
                    ? ` (${selectedParentUnit.abbreviation})`
                    : ''}
                </ParentEventTitle>
                {selectedParentUnit.unitType && (
                  <RelatedEventDateMeta>
                    {UNIT_TYPES.find(
                      (typeOpt) => typeOpt.value === selectedParentUnit.unitType,
                    )?.shortLabel ?? selectedParentUnit.unitType}
                  </RelatedEventDateMeta>
                )}
                <ParticipantRemove
                  type="button"
                  aria-label="상위 부대 연결 해제"
                  title="상위 부대 연결 해제 (독립 편제로 전환)"
                  onClick={() => {
                    playClickSound()
                    setParentUnitId('')
                    markDirty(true)
                  }}
                >
                  <FiX size={15} />
                </ParticipantRemove>
              </ParentEventHeaderRow>

              {((parentInheritedEstParts &&
                (establishedYear !== parentInheritedEstParts.year ||
                  establishedEra !== parentInheritedEstParts.era)) ||
                (selectedParentUnit.garrison &&
                  garrisonPlace?.displayName !== selectedParentUnit.garrison) ||
                (!lockCountryAndDepartment &&
                  selectedParentUnit.administrationDepartmentId &&
                  administrationDepartmentId !==
                    selectedParentUnit.administrationDepartmentId) ||
                (selectedParentUnit.branch &&
                  branch !== selectedParentUnit.branch)) && (
                <ParticipantRoleBar>
                  <RecentParticipantBar>
                    <RecentParticipantLabel>이어받기</RecentParticipantLabel>
                    {parentInheritedEstParts &&
                      (establishedYear !== parentInheritedEstParts.year ||
                        establishedEra !== parentInheritedEstParts.era) && (
                        <RecentParticipantChip
                          type="button"
                          onClick={() => {
                            playClickSound()
                            setEstablishedEra(parentInheritedEstParts.era)
                            setEstablishedYear(parentInheritedEstParts.year)
                            markDirty(true)
                          }}
                        >
                          <span>+</span>
                          <span>
                            창설 연도 맞춤 (
                            {parentInheritedEstParts.era === 'BC' ? 'BC ' : ''}
                            {parentInheritedEstParts.year}년)
                          </span>
                        </RecentParticipantChip>
                      )}
                    {selectedParentUnit.garrison &&
                      garrisonPlace?.displayName !==
                        selectedParentUnit.garrison && (
                        <RecentParticipantChip
                          type="button"
                          onClick={() => {
                            playClickSound()
                            const parentGarrison = selectedParentUnit.garrison!
                            setGarrisonPlace({
                              displayName: parentGarrison,
                              shortName: parentGarrison,
                              isManual: true,
                            })
                            markDirty(true)
                          }}
                        >
                          <span>+</span>
                          <span>
                            주둔지 불러오기 ({selectedParentUnit.garrison})
                          </span>
                        </RecentParticipantChip>
                      )}
                    {!lockCountryAndDepartment &&
                      selectedParentUnit.administrationDepartmentId &&
                      administrationDepartmentId !==
                        selectedParentUnit.administrationDepartmentId && (
                        <RecentParticipantChip
                          type="button"
                          onClick={() => {
                            playClickSound()
                            setAdministrationDepartmentId(
                              selectedParentUnit.administrationDepartmentId!,
                            )
                            markDirty(true)
                          }}
                        >
                          <span>+</span>
                          <span>소관 부처 맞춤</span>
                        </RecentParticipantChip>
                      )}
                    {selectedParentUnit.branch &&
                      branch !== selectedParentUnit.branch && (
                        <RecentParticipantChip
                          type="button"
                          onClick={() => {
                            playClickSound()
                            setBranch(selectedParentUnit.branch!)
                            markDirty(true)
                          }}
                        >
                          <span>+</span>
                          <span>군종 맞춤</span>
                        </RecentParticipantChip>
                      )}
                  </RecentParticipantBar>
                </ParticipantRoleBar>
              )}
            </ParentEventCard>
          ) : (
            <>
              <CountryQuickSearchRow>
                <CountryQuickSearchWrap>
                  <CountryQuickSearchInput
                    type="text"
                    value={parentUnitQuickQuery}
                    placeholder="상위 부대·사령부 빠른 검색 후 Enter (비워두면 최상위 독립 편제)"
                    aria-label="상위 부대·사령부 빠른 검색"
                    onFocus={() => setParentUnitQuickFocused(true)}
                    onBlur={() => {
                      window.setTimeout(
                        () => setParentUnitQuickFocused(false),
                        160,
                      )
                    }}
                    onKeyDown={(keyEvent) => {
                      if (keyEvent.key === 'Escape') {
                        keyEvent.stopPropagation()
                        setParentUnitQuickFocused(false)
                        return
                      }
                      if (
                        keyEvent.key === 'Enter' &&
                        parentUnitQuickMatches.length > 0
                      ) {
                        keyEvent.preventDefault()
                        const topUnit = parentUnitQuickMatches[0]!
                        playClickSound()
                        setParentUnitId(topUnit.id)
                        setParentUnitQuickQuery('')
                        setParentUnitQuickFocused(false)
                        markDirty(true)
                      }
                    }}
                    onChange={(changeEvent) =>
                      setParentUnitQuickQuery(changeEvent.target.value)
                    }
                  />
                  {parentUnitQuickFocused &&
                    parentUnitQuickQuery.trim().length > 0 && (
                      <CountryQuickResultBox
                        role="listbox"
                        aria-label="상위 부대 검색 결과"
                      >
                        {parentUnitQuickMatches.length > 0 ? (
                          parentUnitQuickMatches.map((candUnit) => (
                            <CountryQuickResultItem
                              key={candUnit.id}
                              type="button"
                              onMouseDown={(mouseEvent) =>
                                mouseEvent.preventDefault()
                              }
                              onClick={() => {
                                playClickSound()
                                setParentUnitId(candUnit.id)
                                setParentUnitQuickQuery('')
                                setParentUnitQuickFocused(false)
                                markDirty(true)
                              }}
                            >
                              <CountryQuickResultFlag>🛡️</CountryQuickResultFlag>
                              <CountryQuickResultName>
                                {candUnit.name}
                                {candUnit.abbreviation
                                  ? ` (${candUnit.abbreviation})`
                                  : ''}
                              </CountryQuickResultName>
                              <CountryQuickResultMeta>
                                {candUnit.historicalCountry?.name ??
                                  candUnit.country?.name ??
                                  ''}
                              </CountryQuickResultMeta>
                            </CountryQuickResultItem>
                          ))
                        ) : (
                          <CountryQuickEmpty>
                            일치하는 상위 부대가 없습니다
                          </CountryQuickEmpty>
                        )}
                      </CountryQuickResultBox>
                    )}
                </CountryQuickSearchWrap>
              </CountryQuickSearchRow>

              {(!isEdit && lastCreatedUnit) ||
              prioritizedParentUnits.length > 0 ? (
                <RecentParticipantBar>
                  <RecentParticipantLabel>상급 사령부</RecentParticipantLabel>
                  {!isEdit && lastCreatedUnit && (
                    <RecentParticipantChip
                      type="button"
                      onClick={() => {
                        playClickSound()
                        setParentUnitId(lastCreatedUnit.id)
                        markDirty(true)
                      }}
                    >
                      <span>↳</span>
                      <span>방금 등록: {lastCreatedUnit.name}</span>
                    </RecentParticipantChip>
                  )}
                  {(showAllParentUnitCandidates
                    ? prioritizedParentUnits.slice(0, 8)
                    : prioritizedParentUnits.slice(0, 3)
                  ).map((candUnit) => (
                    <RecentParticipantChip
                      key={candUnit.id}
                      type="button"
                      onClick={() => {
                        playClickSound()
                        setParentUnitId(candUnit.id)
                        markDirty(true)
                      }}
                    >
                      <span>+</span>
                      <span>
                        {candUnit.name}
                        {candUnit.abbreviation
                          ? ` (${candUnit.abbreviation})`
                          : ''}
                      </span>
                    </RecentParticipantChip>
                  ))}
                  {prioritizedParentUnits.length > 3 && (
                    <RecentMoreChip
                      type="button"
                      onClick={() =>
                        setShowAllParentUnitCandidates((prev) => !prev)
                      }
                    >
                      {showAllParentUnitCandidates
                        ? '접기'
                        : `+${Math.min(5, prioritizedParentUnits.length - 3)} 더보기`}
                    </RecentMoreChip>
                  )}
                </RecentParticipantBar>
              ) : null}
            </>
          )}
        </S.FormField>
      </S.FormRow>

      {/* 소관 군정 부처 (ParentEventCard + 빠른 검색 + 국방·군정 추천 칩 규격) */}
      <S.FormRow>
        <S.FormLabel as="div">
          소관 군정 부처<OptionalTag>(선택)</OptionalTag>
        </S.FormLabel>
        <S.FormField>
          {selectedAdminDept ? (
            <ParentEventCard>
              <ParentEventHeaderRow>
                <ParentEventBadge>소관 부처</ParentEventBadge>
                <ParentEventTitle>
                  🏛️ {selectedAdminDept.name}
                  {selectedAdminDept.abbreviation
                    ? ` (${selectedAdminDept.abbreviation})`
                    : ''}
                </ParentEventTitle>
                {selectedAdminDept.historicalCountry?.name && (
                  <RelatedEventDateMeta>
                    {selectedAdminDept.historicalCountry.name}
                  </RelatedEventDateMeta>
                )}
                {!lockCountryAndDepartment && (
                  <ParticipantRemove
                    type="button"
                    aria-label="소관 부처 연결 해제"
                    title="소관 부처 연결 해제 (독립 최고사령부 등)"
                    onClick={() => {
                      playClickSound()
                      setAdministrationDepartmentId('')
                      markDirty(true)
                    }}
                  >
                    <FiX size={15} />
                  </ParticipantRemove>
                )}
              </ParentEventHeaderRow>
            </ParentEventCard>
          ) : (
            <>
              <CountryQuickSearchRow>
                <CountryQuickSearchWrap>
                  <CountryQuickSearchInput
                    type="text"
                    disabled={!hasCountry || lockCountryAndDepartment}
                    value={adminDeptQuickQuery}
                    placeholder={
                      hasCountry
                        ? '국방부·전쟁성·병조 등 소관 부처 검색 후 Enter (독립 사령부는 비워둠)'
                        : '먼저 소속 국가 · 시대를 선택하세요'
                    }
                    aria-label="소관 국방·군정 부처 빠른 검색"
                    onFocus={() => setAdminDeptQuickFocused(true)}
                    onBlur={() => {
                      window.setTimeout(
                        () => setAdminDeptQuickFocused(false),
                        160,
                      )
                    }}
                    onKeyDown={(keyEvent) => {
                      if (keyEvent.key === 'Escape') {
                        keyEvent.stopPropagation()
                        setAdminDeptQuickFocused(false)
                        return
                      }
                      if (
                        keyEvent.key === 'Enter' &&
                        adminDeptQuickMatches.length > 0
                      ) {
                        keyEvent.preventDefault()
                        const topDept = adminDeptQuickMatches[0]!
                        playClickSound()
                        setAdministrationDepartmentId(topDept.id)
                        setAdminDeptQuickQuery('')
                        setAdminDeptQuickFocused(false)
                        markDirty(true)
                      }
                    }}
                    onChange={(changeEvent) =>
                      setAdminDeptQuickQuery(changeEvent.target.value)
                    }
                  />
                  {adminDeptQuickFocused &&
                    adminDeptQuickQuery.trim().length > 0 && (
                      <CountryQuickResultBox
                        role="listbox"
                        aria-label="소관 부처 검색 결과"
                      >
                        {adminDeptQuickMatches.length > 0 ? (
                          adminDeptQuickMatches.map((deptItem) => (
                            <CountryQuickResultItem
                              key={deptItem.id}
                              type="button"
                              onMouseDown={(mouseEvent) =>
                                mouseEvent.preventDefault()
                              }
                              onClick={() => {
                                playClickSound()
                                setAdministrationDepartmentId(deptItem.id)
                                setAdminDeptQuickQuery('')
                                setAdminDeptQuickFocused(false)
                                markDirty(true)
                              }}
                            >
                              <CountryQuickResultFlag>🏛️</CountryQuickResultFlag>
                              <CountryQuickResultName>
                                {deptItem.name}
                                {deptItem.abbreviation
                                  ? ` (${deptItem.abbreviation})`
                                  : ''}
                              </CountryQuickResultName>
                              <CountryQuickResultMeta>
                                {deptItem.historicalCountry?.name ?? '중앙부처'}
                              </CountryQuickResultMeta>
                            </CountryQuickResultItem>
                          ))
                        ) : (
                          <CountryQuickEmpty>
                            일치하는 행정부처가 없습니다
                          </CountryQuickEmpty>
                        )}
                      </CountryQuickResultBox>
                    )}
                </CountryQuickSearchWrap>
              </CountryQuickSearchRow>

              {!lockCountryAndDepartment && prioritizedAdminDepts.length > 0 && (
                <RecentParticipantBar>
                  <RecentParticipantLabel>군정 · 부처</RecentParticipantLabel>
                  {(showAllAdminDeptCandidates
                    ? prioritizedAdminDepts.slice(0, 8)
                    : prioritizedAdminDepts.slice(0, 3)
                  ).map((deptItem) => (
                    <RecentParticipantChip
                      key={deptItem.id}
                      type="button"
                      onClick={() => {
                        playClickSound()
                        setAdministrationDepartmentId(deptItem.id)
                        markDirty(true)
                      }}
                    >
                      <span>+</span>
                      <span>
                        🏛️ {deptItem.name}
                        {deptItem.abbreviation
                          ? ` (${deptItem.abbreviation})`
                          : ''}
                      </span>
                    </RecentParticipantChip>
                  ))}
                  {prioritizedAdminDepts.length > 3 && (
                    <RecentMoreChip
                      type="button"
                      onClick={() =>
                        setShowAllAdminDeptCandidates((prev) => !prev)
                      }
                    >
                      {showAllAdminDeptCandidates
                        ? '접기'
                        : `+${Math.min(5, prioritizedAdminDepts.length - 3)} 더보기`}
                    </RecentMoreChip>
                  )}
                </RecentParticipantBar>
              )}
            </>
          )}
        </S.FormField>
      </S.FormRow>

      {/* 역대 지휘관 · 참모 (ParticipantRow 카드 + 인라인 인물 빠른 검색 + InlineDateField 규격) */}
      <S.FormRow>
        <S.FormLabel as="div">
          역대 지휘관 · 참모<OptionalTag>(선택)</OptionalTag>
        </S.FormLabel>
        <S.FormField>
          <ParticipantList>
            {isEdit && editingUnitId ? (
              <>
                {unitTenures.map((tenureItem) => {
                  const personDisplay = tenureItem.person
                    ? getPersonDisplayName(tenureItem.person)
                    : '인물 미상'
                  return (
                    <ParticipantRow key={tenureItem.id}>
                      <ParticipantHeaderRow>
                        <ParentEventBadge>
                          {tenureItem.ordinal != null
                            ? `제${tenureItem.ordinal}대`
                            : '지휘관'}
                        </ParentEventBadge>
                        {tenureItem.rankTitle && (
                          <CommanderRankBadge>
                            {tenureItem.rankTitle}
                          </CommanderRankBadge>
                        )}
                        <ParentEventTitle>{personDisplay}</ParentEventTitle>
                        {tenureItem.title && (
                          <RelatedEventDateMeta>
                            {tenureItem.title}
                          </RelatedEventDateMeta>
                        )}
                        <RelatedEventDateMeta>
                          {formatTenureDateSpan(tenureItem)}
                        </RelatedEventDateMeta>
                        <ParticipantActionCluster>
                          <S.AddButton
                            type="button"
                            onClick={() => {
                              playClickSound()
                              setEditingAppointmentTenure({
                                id: tenureItem.id,
                                personId:
                                  tenureItem.personId ??
                                  tenureItem.person?.id ??
                                  null,
                                personName: personDisplay,
                                positionType:
                                  tenureItem.positionDefinition?.positionType ??
                                  'MILITARY_COMMANDER',
                                positionDefinitionId:
                                  tenureItem.positionDefinition?.id ?? null,
                                title:
                                  tenureItem.title ??
                                  tenureItem.positionDefinition?.title ??
                                  null,
                                rankTitle: tenureItem.rankTitle ?? null,
                                ordinal: tenureItem.ordinal ?? null,
                                partyId: tenureItem.partyId ?? null,
                                militaryUnitId: editingUnitId,
                                startDate: tenureItem.startDate,
                                endDate: tenureItem.endDate,
                                startEra: tenureItem.startEra,
                                startYear: tenureItem.startYear,
                                startMonth: tenureItem.startMonth,
                                startDay: tenureItem.startDay,
                                endEra: tenureItem.endEra,
                                endYear: tenureItem.endYear,
                                endMonth: tenureItem.endMonth,
                                endDay: tenureItem.endDay,
                              })
                              setAppointmentModalOpen(true)
                            }}
                          >
                            <FiEdit2 size={12} />
                            편집
                          </S.AddButton>
                          <KitRemoveButton
                            type="button"
                            aria-label="지휘관 재임 삭제"
                            title="지휘관 재임 삭제"
                            onClick={() =>
                              void handleDeleteUnitTenure(tenureItem)
                            }
                          >
                            <FiX size={15} />
                          </KitRemoveButton>
                        </ParticipantActionCluster>
                      </ParticipantHeaderRow>
                    </ParticipantRow>
                  )
                })}
                <CountryQuickSearchRow>
                  <CountryQuickSearchWrap>
                    <CountryQuickSearchInput
                      type="text"
                      value={commanderQuickQuery}
                      placeholder="인물 이름 빠른 검색 후 Enter (또는 우측 임명 추가 클릭)…"
                      aria-label="지휘관 인물 빠른 검색"
                      onFocus={() => {
                        setCommanderQuickFocused(true)
                        ensurePersonsLoaded()
                      }}
                      onBlur={() => {
                        window.setTimeout(
                          () => setCommanderQuickFocused(false),
                          160,
                        )
                      }}
                      onKeyDown={(keyEvent) => {
                        if (keyEvent.key === 'Escape') {
                          keyEvent.stopPropagation()
                          setCommanderQuickFocused(false)
                          return
                        }
                        if (
                          keyEvent.key === 'Enter' &&
                          commanderQuickMatches.length > 0
                        ) {
                          keyEvent.preventDefault()
                          handleQuickSelectCommander(commanderQuickMatches[0]!)
                        }
                      }}
                      onChange={(changeEvent) =>
                        setCommanderQuickQuery(changeEvent.target.value)
                      }
                    />
                    {commanderQuickFocused &&
                      commanderQuickQuery.trim().length > 0 && (
                        <CountryQuickResultBox
                          role="listbox"
                          aria-label="지휘관 인물 검색 결과"
                        >
                          {personsLoading ? (
                            <CountryQuickEmpty>
                              인물 목록을 불러오는 중…
                            </CountryQuickEmpty>
                          ) : commanderQuickMatches.length > 0 ? (
                            commanderQuickMatches.map((personItem) => {
                              const display =
                                getPersonDisplayName({
                                  name: personItem.name ?? '',
                                  surname: personItem.surname ?? undefined,
                                  middleName:
                                    personItem.middleName ?? undefined,
                                  nameDisplayOrder:
                                    personItem.nameDisplayOrder ?? null,
                                  country: personItem.country ?? undefined,
                                }) || personItem.name
                              return (
                                <CountryQuickResultItem
                                  key={personItem.id}
                                  type="button"
                                  onMouseDown={(mouseEvent) =>
                                    mouseEvent.preventDefault()
                                  }
                                  onClick={() =>
                                    handleQuickSelectCommander(personItem)
                                  }
                                >
                                  <CountryQuickResultFlag>
                                    👤
                                  </CountryQuickResultFlag>
                                  <CountryQuickResultName>
                                    {display}
                                  </CountryQuickResultName>
                                  <CountryQuickResultMeta>
                                    {personItem.historicalCountry?.name ??
                                      personItem.country?.name ??
                                      ''}
                                  </CountryQuickResultMeta>
                                </CountryQuickResultItem>
                              )
                            })
                          ) : (
                            <CountryQuickEmpty>
                              일치하는 인물이 없습니다
                            </CountryQuickEmpty>
                          )}
                        </CountryQuickResultBox>
                      )}
                  </CountryQuickSearchWrap>
                  <S.AddButton
                    type="button"
                    onClick={() => {
                      playClickSound()
                      setEditingAppointmentTenure(null)
                      setAppointmentModalOpen(true)
                    }}
                  >
                    <FiPlus size={15} />
                    지휘관 · 참모 임명 추가
                  </S.AddButton>
                </CountryQuickSearchRow>
              </>
            ) : (
              <>
                {commanderRows.map((rowItem, rowIndex) => (
                  <ParticipantRow key={`${rowItem.personId}-${rowIndex}`}>
                    <ParticipantHeaderRow>
                      <ParentEventBadge>
                        {rowItem.ordinal
                          ? `제${rowItem.ordinal}대`
                          : `지휘관 ${rowIndex + 1}`}
                      </ParentEventBadge>
                      <ParentEventTitle>{rowItem.personName}</ParentEventTitle>
                      <ParticipantRemove
                        type="button"
                        aria-label={`${rowItem.personName} 제거`}
                        onClick={() => {
                          playClickSound()
                          setCommanderRows((prev) =>
                            prev.filter((_, idx) => idx !== rowIndex),
                          )
                          markDirty(true)
                        }}
                      >
                        <FiX size={15} />
                      </ParticipantRemove>
                    </ParticipantHeaderRow>

                    <ParticipantRoleBar>
                      <ParticipantRoleChipGroup
                        role="radiogroup"
                        aria-label="지휘관 보직 빠른 선택"
                      >
                        {commanderRolePresets.map((presetRole) => (
                          <ParticipantRoleChipBtn
                            key={presetRole}
                            type="button"
                            $selected={rowItem.roleTitle === presetRole}
                            onClick={() => {
                              setCommanderRows((prev) =>
                                prev.map((item, idx) =>
                                  idx === rowIndex
                                    ? { ...item, roleTitle: presetRole }
                                    : item,
                                ),
                              )
                              markDirty(true)
                            }}
                          >
                            {presetRole}
                          </ParticipantRoleChipBtn>
                        ))}
                      </ParticipantRoleChipGroup>

                      <CompactInlineFieldsRow>
                        <ParticipantNoteInput
                          type="text"
                          placeholder="직책·보직명 * (예: 사령관, 참모장)"
                          value={rowItem.roleTitle}
                          onChange={(changeEvent) => {
                            const nextRole = changeEvent.target.value
                            setCommanderRows((prev) =>
                              prev.map((item, idx) =>
                                idx === rowIndex
                                  ? { ...item, roleTitle: nextRole }
                                  : item,
                              ),
                            )
                            markDirty(true)
                          }}
                        />
                        <ParticipantNoteInput
                          type="text"
                          placeholder="계급 (예: 원수, 상장, 중장)"
                          value={rowItem.rankTitle}
                          onChange={(changeEvent) => {
                            const nextRank = changeEvent.target.value
                            setCommanderRows((prev) =>
                              prev.map((item, idx) =>
                                idx === rowIndex
                                  ? { ...item, rankTitle: nextRank }
                                  : item,
                              ),
                            )
                            markDirty(true)
                          }}
                          style={{ maxWidth: 150 }}
                        />
                        <ParticipantNoteInput
                          type="number"
                          min={1}
                          placeholder="대수"
                          value={rowItem.ordinal}
                          onChange={(changeEvent) => {
                            const nextOrd = changeEvent.target.value
                            setCommanderRows((prev) =>
                              prev.map((item, idx) =>
                                idx === rowIndex
                                  ? { ...item, ordinal: nextOrd }
                                  : item,
                              ),
                            )
                            markDirty(true)
                          }}
                          style={{ maxWidth: 74 }}
                        />
                      </CompactInlineFieldsRow>

                      <DateRangeGrid>
                        <S.DateRangeColumn>
                          <DateColumnHeaderRow>
                            <S.DateRangeLabel>부임일 *</S.DateRangeLabel>
                            <DateQuickActions>
                              {establishedYear &&
                                (rowItem.startYear !== establishedYear ||
                                  rowItem.startEra !== establishedEra) && (
                                  <DateQuickActionBtn
                                    type="button"
                                    onClick={() => {
                                      playClickSound()
                                      setCommanderRows((prev) =>
                                        prev.map((item, idx) =>
                                          idx === rowIndex
                                            ? {
                                                ...item,
                                                startEra: establishedEra,
                                                startYear: establishedYear,
                                                startMonth:
                                                  establishedMonth ||
                                                  item.startMonth,
                                                startDay:
                                                  establishedDay ||
                                                  item.startDay,
                                              }
                                            : item,
                                        ),
                                      )
                                      markDirty(true)
                                    }}
                                  >
                                    창설일 맞춤
                                  </DateQuickActionBtn>
                                )}
                            </DateQuickActions>
                          </DateColumnHeaderRow>
                          <InlineDateField
                            appearance="field"
                            ariaLabelPrefix={`${rowItem.personName} 부임일`}
                            era={rowItem.startEra}
                            year={rowItem.startYear}
                            month={rowItem.startMonth}
                            day={rowItem.startDay}
                            yearPlaceholder="부임 연도 *"
                            onChange={(patch) => {
                              setCommanderRows((prev) =>
                                prev.map((item, idx) =>
                                  idx === rowIndex
                                    ? {
                                        ...item,
                                        ...(patch.era !== undefined
                                          ? { startEra: patch.era }
                                          : {}),
                                        ...(patch.year !== undefined
                                          ? { startYear: patch.year }
                                          : {}),
                                        ...(patch.month !== undefined
                                          ? { startMonth: patch.month }
                                          : {}),
                                        ...(patch.day !== undefined
                                          ? { startDay: patch.day }
                                          : {}),
                                      }
                                    : item,
                                ),
                              )
                              markDirty(true)
                            }}
                          />
                        </S.DateRangeColumn>
                        <S.DateRangeColumn>
                          <DateColumnHeaderRow>
                            <S.DateRangeLabel>이임일 (선택)</S.DateRangeLabel>
                            <DateQuickActions>
                              {!isActive &&
                                disbandedYear &&
                                (rowItem.endYear !== disbandedYear ||
                                  rowItem.endEra !== disbandedEra) && (
                                  <DateQuickActionBtn
                                    type="button"
                                    onClick={() => {
                                      playClickSound()
                                      setCommanderRows((prev) =>
                                        prev.map((item, idx) =>
                                          idx === rowIndex
                                            ? {
                                                ...item,
                                                endEra: disbandedEra,
                                                endYear: disbandedYear,
                                                endMonth:
                                                  disbandedMonth ||
                                                  item.endMonth,
                                                endDay:
                                                  disbandedDay || item.endDay,
                                              }
                                            : item,
                                        ),
                                      )
                                      markDirty(true)
                                    }}
                                  >
                                    해산일 맞춤
                                  </DateQuickActionBtn>
                                )}
                            </DateQuickActions>
                          </DateColumnHeaderRow>
                          <InlineDateField
                            appearance="field"
                            ariaLabelPrefix={`${rowItem.personName} 이임일`}
                            era={rowItem.endEra}
                            year={rowItem.endYear}
                            month={rowItem.endMonth}
                            day={rowItem.endDay}
                            yearPlaceholder="이임 연도"
                            onChange={(patch) => {
                              setCommanderRows((prev) =>
                                prev.map((item, idx) =>
                                  idx === rowIndex
                                    ? {
                                        ...item,
                                        ...(patch.era !== undefined
                                          ? { endEra: patch.era }
                                          : {}),
                                        ...(patch.year !== undefined
                                          ? { endYear: patch.year }
                                          : {}),
                                        ...(patch.month !== undefined
                                          ? { endMonth: patch.month }
                                          : {}),
                                        ...(patch.day !== undefined
                                          ? { endDay: patch.day }
                                          : {}),
                                      }
                                    : item,
                                ),
                              )
                              markDirty(true)
                            }}
                          />
                        </S.DateRangeColumn>
                      </DateRangeGrid>
                    </ParticipantRoleBar>
                  </ParticipantRow>
                ))}
                <CountryQuickSearchRow>
                  <CountryQuickSearchWrap>
                    <CountryQuickSearchInput
                      type="text"
                      value={commanderQuickQuery}
                      placeholder="인물 이름 빠른 검색 후 Enter (또는 우측 인물 선택)…"
                      aria-label="지휘관 인물 빠른 검색"
                      onFocus={() => {
                        setCommanderQuickFocused(true)
                        ensurePersonsLoaded()
                      }}
                      onBlur={() => {
                        window.setTimeout(
                          () => setCommanderQuickFocused(false),
                          160,
                        )
                      }}
                      onKeyDown={(keyEvent) => {
                        if (keyEvent.key === 'Escape') {
                          keyEvent.stopPropagation()
                          setCommanderQuickFocused(false)
                          return
                        }
                        if (
                          keyEvent.key === 'Enter' &&
                          commanderQuickMatches.length > 0
                        ) {
                          keyEvent.preventDefault()
                          handleQuickSelectCommander(commanderQuickMatches[0]!)
                        }
                      }}
                      onChange={(changeEvent) =>
                        setCommanderQuickQuery(changeEvent.target.value)
                      }
                    />
                    {commanderQuickFocused &&
                      commanderQuickQuery.trim().length > 0 && (
                        <CountryQuickResultBox
                          role="listbox"
                          aria-label="지휘관 인물 검색 결과"
                        >
                          {personsLoading ? (
                            <CountryQuickEmpty>
                              인물 목록을 불러오는 중…
                            </CountryQuickEmpty>
                          ) : commanderQuickMatches.length > 0 ? (
                            commanderQuickMatches.map((personItem) => {
                              const display =
                                getPersonDisplayName({
                                  name: personItem.name ?? '',
                                  surname: personItem.surname ?? undefined,
                                  middleName:
                                    personItem.middleName ?? undefined,
                                  nameDisplayOrder:
                                    personItem.nameDisplayOrder ?? null,
                                  country: personItem.country ?? undefined,
                                }) || personItem.name
                              return (
                                <CountryQuickResultItem
                                  key={personItem.id}
                                  type="button"
                                  onMouseDown={(mouseEvent) =>
                                    mouseEvent.preventDefault()
                                  }
                                  onClick={() =>
                                    handleQuickSelectCommander(personItem)
                                  }
                                >
                                  <CountryQuickResultFlag>
                                    👤
                                  </CountryQuickResultFlag>
                                  <CountryQuickResultName>
                                    {display}
                                  </CountryQuickResultName>
                                  <CountryQuickResultMeta>
                                    {personItem.historicalCountry?.name ??
                                      personItem.country?.name ??
                                      ''}
                                  </CountryQuickResultMeta>
                                </CountryQuickResultItem>
                              )
                            })
                          ) : (
                            <CountryQuickEmpty>
                              일치하는 인물이 없습니다. 우측 「인물 목록에서
                              선택」을 이용하세요.
                            </CountryQuickEmpty>
                          )}
                        </CountryQuickResultBox>
                      )}
                  </CountryQuickSearchWrap>
                  <S.AddButton
                    type="button"
                    onClick={() => {
                      playClickSound()
                      setCommanderPersonModalOpen(true)
                    }}
                  >
                    <FiPlus size={15} />
                    인물 목록에서 선택
                  </S.AddButton>
                </CountryQuickSearchRow>
              </>
            )}
          </ParticipantList>
        </S.FormField>
      </S.FormRow>

      {/* 전신 · 후신 계보 (BasicInfoSection ModalCausalFlowBoard + ParticipantRow 규격) */}
      <S.FormRow $noBorder>
        <S.FormLabel as="div">
          전신 · 후신 계보<OptionalTag>(선택)</OptionalTag>
        </S.FormLabel>
        <S.FormField>
          {/* 3단 시각적 계보 흐름 보드 (전신 ──▶ ★ 현재 부대 ──▶ 후신) */}
          {(lineageBoardData.predecessorLabels.length > 0 ||
            lineageBoardData.successorLabels.length > 0) && (
            <ModalCausalFlowBoard aria-label="전신·후신 계보 흐름 요약">
              <ModalCausalLane>
                <ModalCausalLaneHeader $tone="cause">
                  ← 전신 ({lineageBoardData.predecessorLabels.length})
                </ModalCausalLaneHeader>
                {lineageBoardData.predecessorLabels.length > 0 ? (
                  lineageBoardData.predecessorLabels.map((lbl, idx) => (
                    <ModalCausalMiniChip key={`${lbl}-${idx}`}>
                      {lbl}
                    </ModalCausalMiniChip>
                  ))
                ) : (
                  <ModalCausalEmptyHint>없음</ModalCausalEmptyHint>
                )}
              </ModalCausalLane>
              <ModalCausalCenterNode>
                <ModalCausalCenterTag>현재 부대</ModalCausalCenterTag>
                <ModalCausalCenterTitle>
                  {name.trim() || '(부대명 입력 중)'}
                </ModalCausalCenterTitle>
              </ModalCausalCenterNode>
              <ModalCausalLane>
                <ModalCausalLaneHeader $tone="effect">
                  후신 ({lineageBoardData.successorLabels.length}) →
                </ModalCausalLaneHeader>
                {lineageBoardData.successorLabels.length > 0 ? (
                  lineageBoardData.successorLabels.map((lbl, idx) => (
                    <ModalCausalMiniChip key={`${lbl}-${idx}`}>
                      {lbl}
                    </ModalCausalMiniChip>
                  ))
                ) : (
                  <ModalCausalEmptyHint>없음</ModalCausalEmptyHint>
                )}
              </ModalCausalLane>
            </ModalCausalFlowBoard>
          )}

          {/* 연결된 계보 목록 */}
          <ParticipantList>
            {isEdit && (predecessors.length > 0 || successors.length > 0) && (
              <>
                {predecessors.map((predItem) =>
                  renderLineageRow(predItem, 'PREDECESSOR'),
                )}
                {successors.map((succItem) =>
                  renderLineageRow(succItem, 'SUCCESSOR'),
                )}
              </>
            )}

            {!isEdit &&
              pendingTransitions.map((draftItem) => {
                const kindLabel =
                  TRANSITION_KIND_OPTIONS.find(
                    (optItem) => optItem.value === draftItem.kind,
                  )?.label ?? draftItem.kind
                const timeLabel = draftItem.year
                  ? `${draftItem.era === 'BC' ? 'BC ' : ''}${draftItem.year}년${draftItem.month ? ` ${draftItem.month}월` : ''}`
                  : ''
                const badgeText =
                  draftItem.direction === 'PREDECESSOR_DEPARTMENT'
                    ? '전신 부처'
                    : draftItem.direction === 'PREDECESSOR_UNIT'
                      ? '전신 부대'
                      : '후신 부대'
                return (
                  <ParticipantRow key={draftItem.localKey}>
                    <ParticipantHeaderRow>
                      <ParentEventBadge>{badgeText}</ParentEventBadge>
                      <ParentEventTitle>
                        {draftItem.targetLabel}
                      </ParentEventTitle>
                      <RelatedEventDateMeta>
                        {kindLabel}
                        {timeLabel ? ` · ${timeLabel}` : ''}
                      </RelatedEventDateMeta>
                      <ParticipantRemove
                        type="button"
                        aria-label="계보 항목 삭제"
                        onClick={() => {
                          setPendingTransitions((prev) =>
                            prev.filter(
                              (item) => item.localKey !== draftItem.localKey,
                            ),
                          )
                          markDirty(true)
                        }}
                      >
                        <FiX size={15} />
                      </ParticipantRemove>
                    </ParticipantHeaderRow>
                    {draftItem.note && (
                      <ParticipantSubNote>{draftItem.note}</ParticipantSubNote>
                    )}
                  </ParticipantRow>
                )
              })}

            {/* 새 계보 연결 카드 (클릭 시 펼침) */}
            {showNewLineageForm ? (
              <ParticipantRow>
                <ParticipantRoleBar style={{ borderTop: 'none', paddingTop: 0 }}>
                  <CollapsibleSubHeader>
                    <SubTitleLabel>전신 · 후신 계보 연결</SubTitleLabel>
                    <DateQuickActionBtn
                      type="button"
                      onClick={() => {
                        setShowNewLineageForm(false)
                        setNewTransitionTargetId('')
                        setLineageQuickQuery('')
                      }}
                    >
                      닫기
                    </DateQuickActionBtn>
                  </CollapsibleSubHeader>

                  <ParticipantRoleChipGroup
                    role="radiogroup"
                    aria-label="계보 연결 방향"
                  >
                    <ParticipantRoleChipBtn
                      type="button"
                      $selected={
                        newTransitionDirection === 'PREDECESSOR_DEPARTMENT'
                      }
                      onClick={() => {
                        setNewTransitionDirection('PREDECESSOR_DEPARTMENT')
                        setNewTransitionTargetId('')
                        setLineageQuickQuery('')
                      }}
                    >
                      🏛️ 전신 부처 → 이 부대
                    </ParticipantRoleChipBtn>
                    <ParticipantRoleChipBtn
                      type="button"
                      $selected={newTransitionDirection === 'PREDECESSOR_UNIT'}
                      onClick={() => {
                        setNewTransitionDirection('PREDECESSOR_UNIT')
                        setNewTransitionTargetId('')
                        setLineageQuickQuery('')
                      }}
                    >
                      🛡️ 전신 부대 → 이 부대
                    </ParticipantRoleChipBtn>
                    <ParticipantRoleChipBtn
                      type="button"
                      $selected={newTransitionDirection === 'SUCCESSOR_UNIT'}
                      onClick={() => {
                        setNewTransitionDirection('SUCCESSOR_UNIT')
                        setNewTransitionTargetId('')
                        setLineageQuickQuery('')
                      }}
                    >
                      이 부대 → 후신 부대 🛡️
                    </ParticipantRoleChipBtn>
                  </ParticipantRoleChipGroup>

                  <ParticipantRoleChipGroup
                    role="radiogroup"
                    aria-label="변동 유형"
                  >
                    {TRANSITION_KIND_OPTIONS.map((optItem) => (
                      <ParticipantRoleChipBtn
                        key={optItem.value}
                        type="button"
                        $selected={newTransitionKind === optItem.value}
                        onClick={() => setNewTransitionKind(optItem.value)}
                      >
                        {optItem.label}
                      </ParticipantRoleChipBtn>
                    ))}
                  </ParticipantRoleChipGroup>

                  <CountryQuickSearchRow>
                    <CountryQuickSearchWrap>
                      <CountryQuickSearchInput
                        type="text"
                        value={lineageQuickQuery}
                        placeholder={
                          newTransitionDirection === 'PREDECESSOR_DEPARTMENT'
                            ? '전신 행정부처 검색·선택 후 Enter (예: 전쟁성, 국방성, 병조…)'
                            : '전신·후신 군부대 검색·선택 후 Enter…'
                        }
                        aria-label="계보 연결 대상 검색"
                        onFocus={() => setLineageQuickFocused(true)}
                        onBlur={() => {
                          window.setTimeout(
                            () => setLineageQuickFocused(false),
                            160,
                          )
                        }}
                        onKeyDown={(keyEvent) => {
                          if (keyEvent.key === 'Escape') {
                            keyEvent.stopPropagation()
                            setLineageQuickFocused(false)
                            return
                          }
                          if (
                            keyEvent.key === 'Enter' &&
                            lineageQuickMatches.length > 0
                          ) {
                            keyEvent.preventDefault()
                            const topCand = lineageQuickMatches[0]!
                            playClickSound()
                            setNewTransitionTargetId(topCand.id)
                            setLineageQuickQuery(topCand.label)
                            setLineageQuickFocused(false)
                          }
                        }}
                        onChange={(changeEvent) => {
                          setLineageQuickQuery(changeEvent.target.value)
                          setNewTransitionTargetId('')
                        }}
                      />
                      {lineageQuickFocused && (
                        <CountryQuickResultBox
                          role="listbox"
                          aria-label="계보 연결 후보"
                        >
                          {lineageQuickMatches.length > 0 ? (
                            lineageQuickMatches.map((cand) => (
                              <CountryQuickResultItem
                                key={cand.id}
                                type="button"
                                onMouseDown={(mouseEvent) =>
                                  mouseEvent.preventDefault()
                                }
                                onClick={() => {
                                  playClickSound()
                                  setNewTransitionTargetId(cand.id)
                                  setLineageQuickQuery(cand.label)
                                  setLineageQuickFocused(false)
                                }}
                              >
                                <ParentEventBadge>{cand.badge}</ParentEventBadge>
                                <CountryQuickResultName>
                                  {cand.label}
                                </CountryQuickResultName>
                                <CountryQuickResultMeta>
                                  {cand.meta}
                                </CountryQuickResultMeta>
                              </CountryQuickResultItem>
                            ))
                          ) : (
                            <CountryQuickEmpty>
                              연결 가능한 기관·부대가 없습니다
                            </CountryQuickEmpty>
                          )}
                        </CountryQuickResultBox>
                      )}
                    </CountryQuickSearchWrap>
                  </CountryQuickSearchRow>

                  <CompactInlineFieldsRow>
                    <CompactEraSelect
                      aria-label="개편 기원"
                      value={newTransitionEra}
                      onChange={(changeEvent) =>
                        setNewTransitionEra(
                          changeEvent.target.value as 'AD' | 'BC',
                        )
                      }
                    >
                      <option value="AD">서기</option>
                      <option value="BC">BC</option>
                    </CompactEraSelect>
                    <ParticipantNoteInput
                      type="number"
                      min={1}
                      placeholder="개편 연도 (예: 1948)"
                      value={newTransitionYear}
                      onChange={(changeEvent) =>
                        setNewTransitionYear(changeEvent.target.value)
                      }
                      style={{ maxWidth: 132 }}
                    />
                    <ParticipantNoteInput
                      type="number"
                      min={1}
                      max={12}
                      placeholder="월"
                      value={newTransitionMonth}
                      onChange={(changeEvent) =>
                        setNewTransitionMonth(changeEvent.target.value)
                      }
                      style={{ maxWidth: 68 }}
                    />
                    <ParticipantNoteInput
                      type="text"
                      placeholder="개편 비고 (선택 — 예: 국방경비대 개편 후 창설)"
                      value={newTransitionNote}
                      onChange={(changeEvent) =>
                        setNewTransitionNote(changeEvent.target.value)
                      }
                    />
                    <S.AddButton
                      type="button"
                      disabled={!newTransitionTargetId || transitionBusy}
                      onClick={() => void handleAddTransition()}
                    >
                      <FiPlus size={14} />
                      {transitionBusy ? '추가 중…' : '계보 추가'}
                    </S.AddButton>
                  </CompactInlineFieldsRow>
                </ParticipantRoleBar>
              </ParticipantRow>
            ) : (
              <OptionalExpandToggleBtn
                type="button"
                onClick={() => setShowNewLineageForm(true)}
              >
                + 전신 · 후신 계보 연결 추가 (선택)
              </OptionalExpandToggleBtn>
            )}
          </ParticipantList>
        </S.FormField>
      </S.FormRow>
    </FormGroupSection>
  )

  // ==========================================================================
  // 3. 맥락 · 상세 기록 섹션
  // ==========================================================================
  const contextSectionNode = (
    <FormGroupSection
      id="military-unit-section-context"
      data-form-section="context"
      onFocusCapture={() => setActiveSection('context')}
    >
      <FormGroupHeader>
        <FormGroupTitle>맥락 · 상세 기록</FormGroupTitle>
      </FormGroupHeader>

      <S.FormRow>
        <S.FormLabel as="div">
          주둔지 · 본부<OptionalTag>(선택)</OptionalTag>
        </S.FormLabel>
        <S.FormField>
          <PlaceSelect
            countryId={countryId || defaultCountryId || undefined}
            disabled={!hasCountry}
            value={garrisonPlace}
            onChange={(placeVal) => {
              setGarrisonPlace(placeVal)
              markDirty(true)
            }}
          />
        </S.FormField>
      </S.FormRow>

      <S.FormRow>
        <S.FormLabel as="div">
          부대 설명 · 상세<OptionalTag>(선택)</OptionalTag>
        </S.FormLabel>
        <S.FormField>
          <S.Textarea
            rows={3}
            placeholder="부대·사령부의 창설 배경, 지휘 구조, 편제 변천사 및 작전사적 의의를 기록하세요."
            value={description}
            onChange={(changeEvent) => {
              setDescription(changeEvent.target.value)
              markDirty(true)
            }}
          />

          {/* 병력 규모 · 관할구역 · 임무 · 참전 전투 · 수훈 내역 (선택 사항 접기/펼치기) */}
          {showDetailedSpecs || hasAnyDetailedSpecs ? (
            <CollapsibleSubBox>
              <CollapsibleSubHeader>
                <SubTitleLabel>
                  병력 규모 · 관할구역 · 임무 · 전투 · 수훈 (선택)
                </SubTitleLabel>
                {!hasAnyDetailedSpecs && (
                  <DateQuickActionBtn
                    type="button"
                    onClick={() => setShowDetailedSpecs(false)}
                  >
                    접기
                  </DateQuickActionBtn>
                )}
              </CollapsibleSubHeader>
              <SubTitleGrid>
                <SubTitleField>
                  <SubTitleLabel>병력 · 편제 규모</SubTitleLabel>
                  <S.Input
                    type="text"
                    placeholder="예: 약 15,000명 / 3개 군단 9개 사단"
                    value={strength}
                    onChange={(changeEvent) => {
                      setStrength(changeEvent.target.value)
                      markDirty(true)
                    }}
                  />
                </SubTitleField>
                <SubTitleField>
                  <SubTitleLabel>관할 · 작전구역</SubTitleLabel>
                  <S.Input
                    type="text"
                    placeholder="예: 서부·북아프리카 전구, 중부전선"
                    value={jurisdiction}
                    onChange={(changeEvent) => {
                      setJurisdiction(changeEvent.target.value)
                      markDirty(true)
                    }}
                  />
                </SubTitleField>
              </SubTitleGrid>
              <SubTitleGrid>
                <SubTitleField>
                  <SubTitleLabel>주요 임무 · 역할</SubTitleLabel>
                  <S.Textarea
                    rows={2}
                    placeholder="예: 합동 작전 총괄 지휘, 기동 타격, 해상 호위"
                    value={primaryMission}
                    onChange={(changeEvent) => {
                      setPrimaryMission(changeEvent.target.value)
                      markDirty(true)
                    }}
                  />
                </SubTitleField>
                <SubTitleField>
                  <SubTitleLabel>주요 전투 · 작전</SubTitleLabel>
                  <S.Textarea
                    rows={2}
                    placeholder="예: 노르망디 상륙작전, 인천상륙작전, 다부동 전투"
                    value={notableBattles}
                    onChange={(changeEvent) => {
                      setNotableBattles(changeEvent.target.value)
                      markDirty(true)
                    }}
                  />
                </SubTitleField>
              </SubTitleGrid>
              <SubTitleField>
                <SubTitleLabel>훈장 · 표창 내역</SubTitleLabel>
                <S.Input
                  type="text"
                  aria-label="훈장·표창 내역"
                  placeholder="예: 대통령 부대표창 5회, 미 대통령 부대표창(PUC)"
                  value={honors}
                  onChange={(changeEvent) => {
                    setHonors(changeEvent.target.value)
                    markDirty(true)
                  }}
                />
              </SubTitleField>
            </CollapsibleSubBox>
          ) : (
            <OptionalExpandToggleBtn
              type="button"
              onClick={() => setShowDetailedSpecs(true)}
            >
              + 병력 규모 · 관할구역 · 주요 임무 · 참전 전투 · 수훈 입력 (선택)
            </OptionalExpandToggleBtn>
          )}
        </S.FormField>
      </S.FormRow>

      {/* 부대 마크 · 휘장 (register-form-kit KitUploadStrip / KitUploadFilled 정본 규격) */}
      <S.FormRow $noBorder>
        <S.FormLabel as="div">
          부대 마크 · 휘장<OptionalTag>(선택)</OptionalTag>
        </S.FormLabel>
        <S.FormField>
          {insigniaUrl ? (
            <KitUploadFilled
              $dragging={insigniaDragOver}
              onDragOver={(dragEvent) => {
                dragEvent.preventDefault()
                if (!insigniaUploading) setInsigniaDragOver(true)
              }}
              onDragLeave={() => setInsigniaDragOver(false)}
              onDrop={(dropEvent) => {
                dropEvent.preventDefault()
                setInsigniaDragOver(false)
                const droppedFile = dropEvent.dataTransfer.files?.[0]
                if (droppedFile) void handleInsigniaFileUpload(droppedFile)
              }}
            >
              <KitUploadThumb
                src={getUploadImageUrl(insigniaUrl)}
                alt="부대 휘장 미리보기"
                onClick={() => {
                  if (!insigniaUploading) insigniaInputRef.current?.click()
                }}
              />
              <KitUploadText>
                <strong>부대 마크 · 휘장이 등록되었습니다</strong>
                <span>
                  드래그 · 클립보드 붙여넣기(⌘V) 또는 변경 버튼으로 교체할 수
                  있습니다
                </span>
              </KitUploadText>
              <KitUploadActions>
                <S.UploadButton
                  type="button"
                  disabled={insigniaUploading}
                  onClick={() => insigniaInputRef.current?.click()}
                >
                  {insigniaUploading ? '업로드 중…' : '변경'}
                </S.UploadButton>
                <KitUploadRemove
                  type="button"
                  disabled={insigniaUploading}
                  aria-label="부대 휘장 제거"
                  title="부대 휘장 제거"
                  onClick={() => {
                    playClickSound()
                    setInsigniaUrl('')
                    markDirty(true)
                  }}
                >
                  <FiX size={16} />
                </KitUploadRemove>
              </KitUploadActions>
            </KitUploadFilled>
          ) : (
            <KitUploadStrip
              type="button"
              $dragging={insigniaDragOver}
              disabled={insigniaUploading}
              onClick={() => insigniaInputRef.current?.click()}
              onDragOver={(dragEvent) => {
                dragEvent.preventDefault()
                if (!insigniaUploading) setInsigniaDragOver(true)
              }}
              onDragLeave={() => setInsigniaDragOver(false)}
              onDrop={(dropEvent) => {
                dropEvent.preventDefault()
                setInsigniaDragOver(false)
                const droppedFile = dropEvent.dataTransfer.files?.[0]
                if (droppedFile) void handleInsigniaFileUpload(droppedFile)
              }}
            >
              <FiImage size={16} />
              <span>
                {insigniaUploading
                  ? '휘장 업로드 중…'
                  : '클릭하거나 이미지를 드래그 · 붙여넣기(⌘V)하여 휘장 추가'}
              </span>
              <small>PNG, JPG, WEBP, SVG · 최대 10MB</small>
            </KitUploadStrip>
          )}
        </S.FormField>
      </S.FormRow>
    </FormGroupSection>
  )

  return (
    <>
      <RegisterModal
        isOpen={isOpen}
        onClose={() => {
          void requestClose()
        }}
        title={isEdit ? '군사 사령부 · 부대 수정' : '군사 사령부 · 부대 등록'}
        maxWidth={
          layoutMode === 'split' ? 'min(1440px, 96vw)' : 'min(1040px, 96vw)'
        }
        minHeight="90vh"
        height={layoutMode === 'split' ? '90vh' : undefined}
        fullBleedOnMobile
        closeOnEsc={!loading && !insigniaUploading && !anyChildModalOpen}
        closeOnOverlayClick={
          !loading && !insigniaUploading && !anyChildModalOpen
        }
        headerActions={
          <HeaderActionsBar>
            {selectedParentUnit && (
              <HeaderContextBadge
                type="button"
                title={`상위 부대: ${selectedParentUnit.name} (소속·지휘·계보 섹션으로 이동)`}
                onClick={() => scrollToSection('command')}
              >
                <span>↳</span>
                <HeaderContextBadgeText>
                  상위: {selectedParentUnit.name}
                </HeaderContextBadgeText>
              </HeaderContextBadge>
            )}

            <SectionJumpNav aria-label="군부대 등록 섹션 이동">
              {renderSectionJumpButtons()}
            </SectionJumpNav>

            <LayoutModeToggleBtn
              type="button"
              $active={layoutMode === 'split'}
              aria-pressed={layoutMode === 'split'}
              aria-label={
                layoutMode === 'split'
                  ? '1단 세로 보기로 전환'
                  : '2단 좌우 분할 보기로 전환'
              }
              title={
                layoutMode === 'split'
                  ? '좌우 2단 분할 보기 중 (클릭 시 1단 세로 보기로 전환)'
                  : '1단 세로 보기 중 (클릭 시 좌우 2단 분할 보기로 전환)'
              }
              onClick={toggleLayoutMode}
            >
              <FiColumns size={13} />
              <span>{layoutMode === 'split' ? '2단 분할' : '1단 보기'}</span>
            </LayoutModeToggleBtn>

            {!isEdit && isDirty && !loading && !insigniaUploading && (
              <HeaderResetBtn
                type="button"
                aria-label="작성 내용 초기화"
                title="입력한 내용을 모두 비우고 처음 상태로 되돌립니다"
                onClick={() => {
                  void handleResetForm()
                }}
              >
                초기화
              </HeaderResetBtn>
            )}
          </HeaderActionsBar>
        }
      >
        <input
          ref={insigniaInputRef}
          type="file"
          accept="image/*"
          disabled={insigniaUploading}
          style={{ display: 'none' }}
          onChange={async (fileEvent) => {
            const selectedFile = fileEvent.target.files?.[0]
            fileEvent.target.value = ''
            if (!selectedFile) return
            await handleInsigniaFileUpload(selectedFile)
          }}
        />

        <MilitaryModalFormScroll
          ref={scrollContainerRef}
          $layoutMode={layoutMode}
          onScroll={handleFormScroll}
          onScrollCapture={handleFormScroll}
        >
          {(loading || insigniaUploading) && !hydratingUnit && (
            <KitBusyBar role="status" aria-live="polite">
              {insigniaUploading
                ? '부대 마크·휘장 이미지를 업로드하는 중...'
                : isEdit
                  ? '수정 사항을 저장하는 중...'
                  : '군사 사령부·부대를 등록하는 중...'}
            </KitBusyBar>
          )}

          <MobileSectionStrip>{renderSectionJumpButtons()}</MobileSectionStrip>

          {hydratingUnit ? (
            <KitFormLoading role="status" aria-live="polite">
              군사 사령부·부대 정보를 불러오는 중...
            </KitFormLoading>
          ) : (
            <form id="military-unit-form" onSubmit={handleSubmit}>
              <S.FormSection ref={formRootRef} style={activeBranchStyle}>
                {layoutMode === 'split' ? (
                  <SplitColumnsGrid>
                    <SplitColumnLeft id="military-unit-form-split-left">
                      {basicSectionNode}
                    </SplitColumnLeft>
                    <SplitColumnRight id="military-unit-form-split-right">
                      {commandSectionNode}
                      {contextSectionNode}
                    </SplitColumnRight>
                  </SplitColumnsGrid>
                ) : (
                  <SingleColumnStack>
                    {basicSectionNode}
                    {commandSectionNode}
                    {contextSectionNode}
                  </SingleColumnStack>
                )}
              </S.FormSection>
            </form>
          )}
        </MilitaryModalFormScroll>

        <PersonRegisterModalStickyFooter>
          <FooterHint $warning={!isFormValid && Boolean(firstValidationIssue)}>
            {!isFormValid && firstValidationIssue ? (
              <FooterJumpButton
                type="button"
                onClick={focusFirstMissingField}
                title="클릭하면 해당 필수 입력 칸으로 이동합니다"
              >
                <span>필수 입력: {firstValidationIssue.label}</span>
                {validationIssues.length > 1 && (
                  <FooterMissingCount>
                    외 {validationIssues.length - 1}건
                  </FooterMissingCount>
                )}
                <FooterJumpArrow aria-hidden="true">→</FooterJumpArrow>
              </FooterJumpButton>
            ) : isEdit ? (
              <FooterReadyGroup>
                <FooterReadyBadge>수정 준비 완료</FooterReadyBadge>
                <FooterShortcutItem>
                  <FooterKbd>⌘↵</FooterKbd>
                  <span>바로 저장</span>
                </FooterShortcutItem>
              </FooterReadyGroup>
            ) : (
              <FooterReadyGroup>
                <FooterReadyBadge>등록 준비 완료</FooterReadyBadge>
                <FooterShortcutItem>
                  <FooterKbd>⌘↵</FooterKbd>
                  <span>저장</span>
                </FooterShortcutItem>
                <FooterShortcutItem>
                  <FooterKbd>⇧⌘↵</FooterKbd>
                  <span>등록 후 계속</span>
                </FooterShortcutItem>
              </FooterReadyGroup>
            )}
          </FooterHint>

          <FooterActions>
            <PersonRegisterModalCancelBtn
              type="button"
              disabled={loading || insigniaUploading}
              onClick={() => {
                playClickSound()
                void requestClose()
              }}
            >
              취소
            </PersonRegisterModalCancelBtn>
            {!isEdit && (
              <PersonRegisterModalCancelBtn
                type="button"
                disabled={loading || insigniaUploading || !isFormValid}
                title="저장 후 창을 닫지 않고 같은 국가·소속 맥락으로 다음 사령부·부대를 바로 이어 등록합니다 (단축키: ⌘/Ctrl + Shift + Enter)"
                onClick={() => {
                  playClickSound()
                  continueAfterSaveRef.current = true
                  void submitUnitForm({ continueAfterSave: true })
                }}
              >
                등록 후 계속
              </PersonRegisterModalCancelBtn>
            )}
            <ModalPrimarySubmitBtn
              type="submit"
              form="military-unit-form"
              disabled={loading || insigniaUploading || !isFormValid}
              aria-busy={loading}
              onClick={() => {
                continueAfterSaveRef.current = false
              }}
              title={
                loading
                  ? '저장 중...'
                  : !isFormValid
                    ? (firstValidationIssue?.label ??
                      '필수 항목을 입력해야 저장할 수 있습니다')
                    : '단축키: ⌘/Ctrl + Enter'
              }
            >
              {loading
                ? isEdit
                  ? '수정 중…'
                  : '등록 중…'
                : isEdit
                  ? '수정 완료'
                  : '사령부·부대 등록'}
            </ModalPrimarySubmitBtn>
          </FooterActions>
        </PersonRegisterModalStickyFooter>
      </RegisterModal>

      {/* 국가 선택 모달 */}
      <CountryPicker
        mode="single"
        isOpen={countryModalOpen}
        onClose={() => setCountryModalOpen(false)}
        onSelect={(country) => {
          if (country.isHistorical) {
            const historical = historicalCountries.find(
              (candidate) => candidate.id === country.id,
            )
            setCountryId(historical?.countries?.[0]?.id ?? '')
            setHistoricalCountryId(country.id)
            setCountryFlagEmoji('🏛️')
            setCountryEnglishName(historical?.enName || '')
          } else {
            const modernCountry = modernCountries.find(
              (candidate) => candidate.id === country.id,
            )
            setHistoricalCountryId('')
            setCountryId(country.id)
            setCountryFlagEmoji(modernCountry?.flagEmoji || '🏳️')
            setCountryEnglishName('')
          }
          setCountryName(country.name)
          setAdministrationDepartmentId('')
          markDirty(true)
          setCountryModalOpen(false)
        }}
        modernCountries={modernCountries}
        historicalCountries={historicalCountries}
        selectedIds={[historicalCountryId || countryId].filter(Boolean)}
      />

      <DatePickerModal
        isOpen={establishedDateModalOpen}
        onClose={() => setEstablishedDateModalOpen(false)}
        anchorEl={
          typeof document !== 'undefined'
            ? document.getElementById(estCalendarAnchorId)
            : null
        }
        onSelect={(selectedIso) => {
          const parsedParts = parseIsoPartsFallback(selectedIso)
          if (parsedParts.year) {
            setEstablishedEra(parsedParts.era)
            setEstablishedYear(parsedParts.year)
            setEstablishedMonth(parsedParts.month)
            setEstablishedDay(parsedParts.day)
            markDirty(true)
          }
          setEstablishedDateModalOpen(false)
        }}
        initialDate={toCalendarInitialIso(
          establishedEra,
          establishedYear,
          establishedMonth,
          establishedDay,
        )}
        title="창설일 선택"
      />

      <DatePickerModal
        isOpen={disbandedDateModalOpen}
        onClose={() => setDisbandedDateModalOpen(false)}
        anchorEl={
          typeof document !== 'undefined'
            ? document.getElementById(disbCalendarAnchorId)
            : null
        }
        onSelect={(selectedIso) => {
          const parsedParts = parseIsoPartsFallback(selectedIso)
          if (parsedParts.year) {
            setDisbandedEra(parsedParts.era)
            setDisbandedYear(parsedParts.year)
            setDisbandedMonth(parsedParts.month)
            setDisbandedDay(parsedParts.day)
            setIsActive(false)
            markDirty(true)
          }
          setDisbandedDateModalOpen(false)
        }}
        initialDate={toCalendarInitialIso(
          disbandedEra,
          disbandedYear,
          disbandedMonth,
          disbandedDay,
        )}
        title="해산일 선택"
      />

      {commanderPersonModalOpen && (
        <PersonSelectModal
          persons={allPersons}
          selectedPersonId=""
          loading={personsLoading}
          title={`${name.trim() || '부대'} 지휘관 인물 선택`}
          searchPlaceholder="지휘관으로 등록할 인물을 검색..."
          defaultCountryId={countryId || defaultCountryId || undefined}
          onSelect={(selectedPersonId) => {
            const matchedPerson = allPersons.find(
              (personItem) => personItem.id === selectedPersonId,
            )
            const displayPersonName = matchedPerson
              ? getPersonDisplayName({
                  name: matchedPerson.name ?? '',
                  surname: matchedPerson.surname ?? undefined,
                  middleName: matchedPerson.middleName ?? undefined,
                  nameDisplayOrder: matchedPerson.nameDisplayOrder ?? null,
                  country: matchedPerson.country ?? undefined,
                }) || matchedPerson.name
              : selectedPersonId
            setCommanderRows((prev) => [
              ...prev,
              {
                personId: selectedPersonId,
                personName: displayPersonName,
                rankTitle: '',
                roleTitle: commanderRolePresets[0] ?? '사령관',
                ordinal: String(prev.length + 1),
                startEra: establishedEra,
                startYear: establishedYear,
                startMonth: '',
                startDay: '',
                endEra: 'AD',
                endYear: '',
                endMonth: '',
                endDay: '',
              },
            ])
            markDirty(true)
            setCommanderPersonModalOpen(false)
          }}
          onClose={() => setCommanderPersonModalOpen(false)}
        />
      )}

      {isEdit && editingUnitId && (
        <InstitutionAppointmentModal
          isOpen={appointmentModalOpen}
          onClose={() => {
            setAppointmentModalOpen(false)
            setEditingAppointmentTenure(null)
          }}
          contextType="MILITARY_UNIT"
          countryId={countryId || defaultCountryId || null}
          historicalCountryId={historicalCountryId || null}
          countryName={countryName || null}
          militaryUnitId={editingUnitId}
          militaryUnitName={name.trim() || '군부대'}
          militaryUnitType={unitType || null}
          editingTenure={editingAppointmentTenure}
          onSaved={() => {
            void queryClient.invalidateQueries({ queryKey: ['military-units'] })
            void queryClient.invalidateQueries({ queryKey: ['military-unit'] })
            void refreshUnitTenuresAndLineage(editingUnitId)
            onSaved?.()
          }}
        />
      )}
    </>
  )
}

// ============================================================================
// Styled Components (사건 등록 모달 EventRegisterModal + BasicInfoSection + EventTypeField 정본)
// ============================================================================

const MilitaryModalFormScroll = styled(PersonRegisterModalFormScroll)<{
  $layoutMode: 'split' | 'single'
}>`
  overflow-x: hidden;

  ${({ $layoutMode }) =>
    $layoutMode === 'split'
      ? `
    @media (min-width: 1180px) {
      overflow-y: hidden;
      padding: 22px 28px;
    }
  `
      : ''}
`

const ModalPrimarySubmitBtn = styled(PersonRegisterModalPrimaryBtn)`
  background: ${({ theme }) => (theme.mode === 'dark' ? '#2563eb' : '#1d4ed8')};
  box-shadow: 0 1px 2px rgba(29, 78, 216, 0.2);

  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? '#3b82f6' : '#1e40af'};
  }
`

const HeaderContextBadge = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 210px;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(148, 163, 184, 0.24)'
        : 'rgba(15, 23, 42, 0.12)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc'};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.14s ease, border-color 0.14s ease;

  &:hover,
  &:focus-visible {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#f1f5f9'};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(148, 163, 184, 0.45)' : '#94a3b8'};
    outline: none;
  }
`

const HeaderContextBadgeText = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const SectionBadge = styled.span<{ $done?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 15px;
  height: 15px;
  padding: 0 4px;
  margin-left: 4px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  background: ${({ $done, theme }) =>
    $done
      ? theme.mode === 'dark'
        ? 'rgba(16, 185, 129, 0.2)'
        : 'rgba(16, 185, 129, 0.14)'
      : theme.mode === 'dark'
        ? 'rgba(59, 130, 246, 0.2)'
        : 'rgba(37, 99, 235, 0.1)'};
  color: ${({ $done, theme }) =>
    $done
      ? theme.mode === 'dark'
        ? '#6ee7b7'
        : '#047857'
      : theme.mode === 'dark'
        ? '#93c5fd'
        : '#1d4ed8'};
`

const LayoutModeToggleBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(148, 163, 184, 0.32)'
          : '#cbd5e1'
        : theme.colors.border.light};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : '#f1f5f9'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition:
    color 0.14s ease,
    border-color 0.14s ease,
    background-color 0.14s ease;

  @media (max-width: 1180px) {
    display: none;
  }

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(148, 163, 184, 0.45)' : '#94a3b8'};
    outline: none;
  }
`

const FooterActions = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto;
`

const SingleColumnStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
`

const FormGroupSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 0 8px;

  & + & {
    margin-top: 20px;
    padding-top: 4px;
  }

  > ${S.FormRow} {
    padding: 10px 0;
    border-bottom: none;
  }
`

const FormGroupHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
  margin: 0 0 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid ${({ theme }) => S.getC(theme).border.light};
`

const FormGroupTitle = styled.h3`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.35;
  color: ${({ theme }) => theme.colors.text.primary};

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: var(--active-domain-accent, #2563eb);
    transition: background-color 0.16s ease;
  }
`

const FormGroupRightCluster = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const FormGroupSummaryBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) =>
    `var(--active-domain-text, ${theme.mode === 'dark' ? '#93c5fd' : '#1d4ed8'})`};
  background: ${({ theme }) =>
    `rgba(var(--active-domain-rgb, 37, 99, 235), ${
      theme.mode === 'dark' ? 0.14 : 0.07
    })`};
  border: 1px solid rgba(var(--active-domain-rgb, 37, 99, 235), 0.22);
  transition:
    color 0.16s ease,
    background-color 0.16s ease,
    border-color 0.16s ease;
`

const SplitColumnsGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 0;
  align-items: start;
  width: 100%;
  min-width: 0;
  overflow-x: hidden;

  @media (min-width: 1180px) {
    ${S.FormRow} {
      grid-template-columns: 104px minmax(0, 1fr);
      gap: 14px;
    }
  }

  @media (max-width: 1179px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
  }
`

const splitPaneScrollStyles = ({ theme }: { theme: DefaultTheme }) => `
  min-width: 0;
  overflow-x: hidden;

  @media (min-width: 1180px) {
    max-height: calc(90vh - 172px);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-bottom: 56px;

    &::-webkit-scrollbar {
      width: 4px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    &::-webkit-scrollbar-thumb {
      background: ${theme.colors.border.default};
      border-radius: 2px;
    }
  }
`

const SplitColumnLeft = styled.div`
  ${splitPaneScrollStyles}

  @media (min-width: 1180px) {
    padding-left: 3px;
    padding-right: 26px;
  }
`

const SplitColumnRight = styled.div`
  ${splitPaneScrollStyles}

  @media (min-width: 1180px) {
    padding-left: 26px;
    padding-right: 3px;
    border-left: 1px solid ${({ theme }) => S.getC(theme).border.light};
  }
`

const OptionalTag = styled.span`
  margin-left: 4px;
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => S.getC(theme).text.muted};
`

const NameAbbrGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 172px;
  gap: 10px;
  width: 100%;

  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const TitleInput = styled(S.Input)`
  height: 40px;
  padding: 0 13px;
  font-size: 14.5px;
  font-weight: 600;
`

const AbbrInput = styled(S.Input)`
  height: 40px;
  padding: 0 12px;
  font-size: 13.5px;
  font-weight: 600;
`

const SubTitleGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  min-width: 0;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const SubTitleField = styled.label`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const SubTitleLabel = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => S.getC(theme).text.secondary};
`

const TitleSuggestionRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
`

const TitleSuggestionLabel = styled.span`
  color: ${({ theme }) => S.getC(theme).text.muted};
`

const TitleSuggestionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 9px;
  border-radius: 999px;
  border: 1px solid rgba(var(--active-domain-rgb, 37, 99, 235), 0.35);
  background: ${({ theme }) =>
    `rgba(var(--active-domain-rgb, 37, 99, 235), ${theme.mode === 'dark' ? 0.16 : 0.08})`};
  color: ${({ theme }) =>
    `var(--active-domain-text, ${theme.mode === 'dark' ? '#93c5fd' : '#1d4ed8'})`};
  font: inherit;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) =>
      `rgba(var(--active-domain-rgb, 37, 99, 235), ${theme.mode === 'dark' ? 0.24 : 0.14})`};
  }
`

const TitleApplyAllButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 999px;
  border: 1px solid rgba(var(--active-domain-rgb, 37, 99, 235), 0.45);
  background: ${({ theme }) =>
    `rgba(var(--active-domain-rgb, 37, 99, 235), ${theme.mode === 'dark' ? 0.22 : 0.12})`};
  color: ${({ theme }) =>
    `var(--active-domain-text, ${theme.mode === 'dark' ? '#93c5fd' : '#1d4ed8'})`};
  font: inherit;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.14s ease;

  &:hover {
    background: ${({ theme }) =>
      `rgba(var(--active-domain-rgb, 37, 99, 235), ${theme.mode === 'dark' ? 0.3 : 0.18})`};
  }
`

const SimilarEventsBar = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 7px 11px;
  border-radius: 8px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(245, 158, 11, 0.28)'
        : 'rgba(245, 158, 11, 0.3)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(245, 158, 11, 0.08)'
      : 'rgba(254, 243, 199, 0.45)'};
  font-size: 12px;
`

const SimilarEventsLabel = styled.span`
  flex-shrink: 0;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#b45309')};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(245, 158, 11, 0.18)'
      : 'rgba(245, 158, 11, 0.16)'};
`

const SimilarEventsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  min-width: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SimilarEventItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
`

const SimilarEventTitle = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SimilarEventMeta = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SimilarEventActionBtn = styled.button`
  padding: 1px 6px;
  border-radius: 5px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(245, 158, 11, 0.35)'
        : 'rgba(180, 83, 9, 0.28)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(245, 158, 11, 0.14)'
      : 'rgba(255, 255, 255, 0.75)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fcd34d' : '#92400e')};
  font: inherit;
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? '#fbbf24' : '#b45309'};
  }
`

const DateRangeHeaderBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
`

const DateRangeGrid = styled(S.DateRangeRow)<{ $singleColumn?: boolean }>`
  grid-template-columns: ${({ $singleColumn }) =>
    $singleColumn ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) minmax(0, 1fr)'};

  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
`

const DateColumnHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 20px;
`

const DateQuickActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const DateQuickActionBtn = styled.button`
  padding: 1px 7px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.default};
  background: transparent;
  color: ${({ theme }) => S.getC(theme).text.muted};
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.14s ease, border-color 0.14s ease,
    background-color 0.14s ease;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) =>
      `var(--active-domain-text, ${theme.mode === 'dark' ? '#93c5fd' : '#1d4ed8'})`};
    border-color: rgba(var(--active-domain-rgb, 37, 99, 235), 0.45);
    background: ${({ theme }) =>
      `rgba(var(--active-domain-rgb, 37, 99, 235), ${theme.mode === 'dark' ? 0.14 : 0.07})`};
    outline: none;
  }
`

const ParentEventCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.default};
  border-radius: 12px;
  background: ${({ theme }) => S.getC(theme).background.subtle};
`

const ParentEventHeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`

const ParentEventBadge = styled.span`
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) =>
    `var(--active-domain-text, ${theme.mode === 'dark' ? '#93c5fd' : '#1d4ed8'})`};
  background: ${({ theme }) =>
    `rgba(var(--active-domain-rgb, 37, 99, 235), ${theme.mode === 'dark' ? 0.16 : 0.08})`};
  border: 1px solid rgba(var(--active-domain-rgb, 37, 99, 235), 0.22);
`

const CommanderRankBadge = styled.span`
  flex-shrink: 0;
  padding: 2px 7px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => S.getC(theme).text.secondary};
  background: ${({ theme }) => S.getC(theme).background.content};
  border: 1px solid ${({ theme }) => S.getC(theme).border.light};
`

const ParentEventTitle = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => S.getC(theme).text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const RelatedEventDateMeta = styled.span`
  flex-shrink: 0;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => S.getC(theme).text.muted};
  background: ${({ theme }) => S.getC(theme).background.content};
  border: 1px solid ${({ theme }) => S.getC(theme).border.light};
`

const ParticipantActionCluster = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  margin-left: auto;
`

const ParticipantList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const ParticipantRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.default};
  border-radius: 12px;
  background: ${({ theme }) => S.getC(theme).background.subtle};
  transition: border-color 0.15s ease, background 0.15s ease;

  &:focus-within {
    border-color: rgba(var(--active-domain-rgb, 37, 99, 235), 0.5);
    background: ${({ theme }) => S.getC(theme).background.content};
  }
`

const ParticipantHeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
`

const ParticipantSubNote = styled.div`
  font-size: 12px;
  color: ${({ theme }) => S.getC(theme).text.secondary};
  padding-left: 4px;
`

const ParticipantRoleBar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 6px;
  border-top: 1px dashed ${({ theme }) => S.getC(theme).border.light};
`

const ParticipantRoleChipGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
`

const ParticipantRoleChipBtn = styled.button<{ $selected: boolean }>`
  height: 25px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid
    ${({ $selected, theme }) =>
      $selected
        ? 'rgba(var(--active-domain-rgb, 37, 99, 235), 0.45)'
        : S.getC(theme).border.default};
  background: ${({ $selected, theme }) =>
    $selected
      ? `rgba(var(--active-domain-rgb, 37, 99, 235), ${theme.mode === 'dark' ? 0.18 : 0.09})`
      : S.getC(theme).background.content};
  color: ${({ $selected, theme }) =>
    $selected
      ? `var(--active-domain-text, ${theme.mode === 'dark' ? '#93c5fd' : '#1d4ed8'})`
      : S.getC(theme).text.secondary};
  font: inherit;
  font-size: 11.5px;
  font-weight: ${({ $selected }) => ($selected ? 700 : 500)};
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.14s ease;

  &:hover {
    border-color: rgba(var(--active-domain-rgb, 37, 99, 235), 0.55);
    color: ${({ theme }) =>
      `var(--active-domain-text, ${theme.mode === 'dark' ? '#93c5fd' : '#1d4ed8'})`};
  }
`

const CompactInlineFieldsRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
`

const CompactEraSelect = styled.select`
  height: 30px;
  padding: 0 8px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.default};
  border-radius: 8px;
  background: ${({ theme }) => S.getC(theme).background.content};
  color: ${({ theme }) => S.getC(theme).text.primary};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
`

const ParticipantNoteInput = styled(S.Input)`
  flex: 1 1 140px;
  min-width: 0;
  height: 30px;
  padding: 0 10px;
  font-size: 12.5px;
  border-radius: 8px;
`

const ParticipantRemove = styled(KitRemoveButton)`
  margin-left: auto;
`

const CountryQuickSearchRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
`

const CountryQuickSearchWrap = styled.div`
  position: relative;
  flex: 1 1 220px;
  min-width: 0;
`

const CountryQuickSearchInput = styled(S.Input)`
  width: 100%;
  height: 38px;
  padding: 0 12px;
  font-size: 13px;
`

const CountryQuickResultBox = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 40;
  max-height: 240px;
  overflow-y: auto;
  padding: 4px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.default};
  background: ${({ theme }) => S.getC(theme).background.content};
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.14);
`

const CountryQuickResultItem = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: ${({ theme }) => S.getC(theme).text.primary};
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    background: ${({ theme }) => S.getC(theme).background.subtle};
    outline: none;
  }
`

const CountryQuickResultFlag = styled.span`
  flex-shrink: 0;
  font-size: 14px;
`

const CountryQuickResultName = styled.span`
  flex: 1;
  min-width: 0;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const CountryQuickResultMeta = styled.span`
  flex-shrink: 0;
  font-size: 11px;
  color: ${({ theme }) => S.getC(theme).text.muted};
`

const CountryEraBadge = styled.span`
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#6ee7b7' : '#047857')};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(16, 185, 129, 0.18)'
      : 'rgba(16, 185, 129, 0.12)'};
`

const EraSpanMuted = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => S.getC(theme).text.muted};
`

const CountryQuickEmpty = styled.div`
  padding: 10px 12px;
  font-size: 12px;
  color: ${({ theme }) => S.getC(theme).text.muted};
`

const RecentParticipantBar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
`

const RecentParticipantLabel = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => S.getC(theme).text.muted};
  margin-right: 2px;
`

const RecentParticipantChip = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? 'rgba(var(--active-domain-rgb, 37, 99, 235), 0.45)'
        : S.getC(theme).border.default};
  background: ${({ $active, theme }) =>
    $active
      ? `rgba(var(--active-domain-rgb, 37, 99, 235), ${theme.mode === 'dark' ? 0.18 : 0.09})`
      : S.getC(theme).background.subtle};
  color: ${({ $active, theme }) =>
    $active
      ? `var(--active-domain-text, ${theme.mode === 'dark' ? '#93c5fd' : '#1d4ed8'})`
      : S.getC(theme).text.secondary};
  font: inherit;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  cursor: pointer;
  transition: border-color 0.14s ease, color 0.14s ease,
    background-color 0.14s ease;

  &:hover,
  &:focus-visible {
    border-color: rgba(var(--active-domain-rgb, 37, 99, 235), 0.55);
    color: ${({ theme }) =>
      `var(--active-domain-text, ${theme.mode === 'dark' ? '#93c5fd' : '#1d4ed8'})`};
    background: ${({ theme }) =>
      `rgba(var(--active-domain-rgb, 37, 99, 235), ${theme.mode === 'dark' ? 0.14 : 0.06})`};
    outline: none;
  }
`

const RecentMoreChip = styled.button`
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px dashed ${({ theme }) => S.getC(theme).border.default};
  background: transparent;
  color: ${({ theme }) => S.getC(theme).text.muted};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) =>
      `var(--active-domain-text, ${theme.mode === 'dark' ? '#93c5fd' : '#1d4ed8'})`};
    border-color: rgba(var(--active-domain-rgb, 37, 99, 235), 0.5);
  }
`

const LifespanWarnRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 10px;
`

const LifespanReplaceBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid rgba(180, 83, 9, 0.45);
  background: rgba(245, 158, 11, 0.14);
  color: inherit;
  font: inherit;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;

  &:hover,
  &:focus-visible {
    background: rgba(245, 158, 11, 0.24);
    border-color: rgba(180, 83, 9, 0.7);
    outline: none;
  }
`

const UnitTypeContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const MoreToggleChip = styled.button`
  height: 32px;
  padding: 0 11px;
  border-radius: 999px;
  border: 1px dashed ${({ theme }) => S.getC(theme).border.default};
  background: transparent;
  color: ${({ theme }) => S.getC(theme).text.muted};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.14s ease, border-color 0.14s ease;

  &:hover {
    color: ${({ theme }) =>
      `var(--active-domain-text, ${theme.mode === 'dark' ? '#93c5fd' : '#1d4ed8'})`};
    border-color: rgba(var(--active-domain-rgb, 37, 99, 235), 0.5);
  }
`

const ExtraGroupsStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px dashed ${({ theme }) => S.getC(theme).border.light};
`

const ExtraGroupBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const ModalCausalFlowBoard = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(130px, 0.9fr) minmax(0, 1fr);
  gap: 8px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.light};
  background: ${({ theme }) => S.getC(theme).background.subtle};

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const ModalCausalLane = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const ModalCausalLaneHeader = styled.span<{ $tone: 'cause' | 'effect' }>`
  font-size: 11px;
  font-weight: 700;
  color: ${({ $tone, theme }) =>
    $tone === 'cause'
      ? theme.mode === 'dark'
        ? '#fcd34d'
        : '#b45309'
      : theme.mode === 'dark'
        ? '#93c5fd'
        : '#1d4ed8'};
`

const ModalCausalMiniChip = styled.span`
  display: block;
  padding: 3px 8px;
  border-radius: 6px;
  background: ${({ theme }) => S.getC(theme).background.content};
  border: 1px solid ${({ theme }) => S.getC(theme).border.light};
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => S.getC(theme).text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ModalCausalEmptyHint = styled.span`
  font-size: 11px;
  color: ${({ theme }) => S.getC(theme).text.muted};
`

const ModalCausalCenterNode = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1.5px solid rgba(var(--active-domain-rgb, 37, 99, 235), 0.45);
  background: ${({ theme }) =>
    `rgba(var(--active-domain-rgb, 37, 99, 235), ${theme.mode === 'dark' ? 0.14 : 0.07})`};
  text-align: center;
  min-width: 0;
`

const ModalCausalCenterTag = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) =>
    `var(--active-domain-text, ${theme.mode === 'dark' ? '#93c5fd' : '#1d4ed8'})`};
`

const ModalCausalCenterTitle = styled.span`
  max-width: 100%;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => S.getC(theme).text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const CollapsibleSubBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.light};
  background: ${({ theme }) => S.getC(theme).background.subtle};
`

const CollapsibleSubHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const OptionalExpandToggleBtn = styled.button`
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 5px;
  height: 30px;
  padding: 0 11px;
  border-radius: 8px;
  border: 1px dashed ${({ theme }) => S.getC(theme).border.default};
  background: transparent;
  color: ${({ theme }) => S.getC(theme).text.secondary};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    color 0.14s ease,
    border-color 0.14s ease,
    background-color 0.14s ease;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) =>
      `var(--active-domain-text, ${theme.mode === 'dark' ? '#93c5fd' : '#1d4ed8'})`};
    border-color: rgba(var(--active-domain-rgb, 37, 99, 235), 0.5);
    background: ${({ theme }) =>
      `rgba(var(--active-domain-rgb, 37, 99, 235), ${theme.mode === 'dark' ? 0.12 : 0.05})`};
    outline: none;
  }
`
