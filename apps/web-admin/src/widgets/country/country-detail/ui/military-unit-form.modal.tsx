/**
 * 군사 사령부·부대 등록/수정 — 우측 SidePanel 유지 + 사건 등록 모달(EventRegisterModal) 플랫 폼 규격
 * - 136px 좌측 라벨 · 우측 컨트롤 1px 헤어라인 행(`FlatFormRow`) 단일 스크롤 레이아웃
 * - 헤더 컨텍스트 배지 + 섹션 점프 내비게이션(`SectionJumpNav`)
 * - 하단 고정 검증 힌트 / 등록 준비 완료 + ⌘↵ 단축키 푸터(`EventStyleFooterBar`)
 * - 휘장 업로드, 시대 전환 칩, 구조화 날짜, 통합 지휘관 재임(`GovernmentPositionTenure`), 전신·후신 계보 지원
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useQueryClient } from '@tanstack/react-query'
import {
  FiCalendar,
  FiEdit2,
  FiPlus,
  FiShield,
  FiTrash2,
  FiUpload,
  FiUser,
  FiX,
} from 'react-icons/fi'

import { useHistoricalCountriesByModernCountry } from '@/features/country/api/use-historical-countries-by-modern-country.hook'
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
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { confirm } from '@/shared/ui/confirm-dialog'
import { CountryPicker } from '@/shared/ui/country-picker'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import {
  InstitutionAppointmentModal,
  type EditableInstitutionTenure,
} from '@/shared/ui/institution-appointment-modal'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import {
  PlaceSelect,
  type PlaceResult,
} from '@/shared/ui/place-autocomplete/place-autocomplete'
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/shared/ui/searchable-select'
import { SidePanel } from '@/shared/ui/side-panel'
import {
  CompactUploadStrip,
  CompactUploadThumb,
  EventStyleFooterBar,
  FlatFieldControl,
  FlatFormLabel,
  FlatFormRow,
  FlatFormSection,
  FlatFormStack,
  FlatHint,
  FlatInput,
  FlatNameAbbrGrid,
  FlatRequired,
  FlatSectionHeader,
  FlatSectionHint,
  FlatSectionTitle,
  FlatSelect,
  FlatTextarea,
  FlatTwoColGrid,
  FooterActionGroup,
  FooterCancelButton,
  FooterHintArea,
  FooterJumpBtn,
  FooterKbd,
  FooterReadyBadge,
  FooterReadyDot,
  FooterReadyGroup,
  FooterShortcutText,
  FooterSubmitButton,
  InlineDateRow,
  InlineIconBtn,
  LinkedRecordRow,
  MobileSectionStrip,
  OutlineAddBtn,
  PanelHeaderActionsBar,
  PanelHeaderContextBadge,
  PillChoiceChip,
  PillChoiceIcon,
  PillChoiceRow,
  QuickPresetChip,
  SectionJumpBadge,
  SectionJumpBtn,
  SectionJumpDone,
  SectionJumpNav,
} from '@/shared/ui/side-panel-form'
import { notify } from '@/shared/ui/toast'

const UNIT_TYPES: Array<{
  value: MilitaryUnitType
  label: string
  group: string
  keywords: string
}> = [
  {
    value: 'SUPREME_COMMAND',
    label: '최고사령부 (OKW · STAVKA · 대본영 등)',
    group: '최고·상급 지휘기구',
    keywords: 'SUPREME_COMMAND OKW STAVKA 대본영 국방군 최고사령부 총사령부',
  },
  {
    value: 'GENERAL_STAFF',
    label: '참모본부 · 합동참모본부',
    group: '최고·상급 지휘기구',
    keywords: 'GENERAL_STAFF JCS 합참 총참모부 참모본부 육군참모본부',
  },
  {
    value: 'SERVICE_HQ',
    label: '각군 총사령부 (OKH · OKM · OKL · 육본 등)',
    group: '최고·상급 지휘기구',
    keywords: 'SERVICE_HQ OKH OKM OKL 육군본부 해군본부 공군본부 총사령부',
  },
  {
    value: 'THEATER',
    label: '전구·총사령부',
    group: '전략·작전 제대',
    keywords: 'THEATER SHAEF 전구사령부 방면총사령부',
  },
  {
    value: 'ARMY_GROUP',
    label: '집단군',
    group: '전략·작전 제대',
    keywords: 'ARMY_GROUP Heeresgruppe 집단군 총군',
  },
  {
    value: 'FRONT',
    label: '전선군·방면군',
    group: '전략·작전 제대',
    keywords: 'FRONT 전선군 방면군 프론트',
  },
  {
    value: 'MILITARY_DISTRICT',
    label: '군관구',
    group: '전략·작전 제대',
    keywords: 'MILITARY_DISTRICT Wehrkreis 군관구 관구 진수부',
  },
  {
    value: 'FIELD_ARMY',
    label: '야전군',
    group: '전략·작전 제대',
    keywords: 'FIELD_ARMY Armee 야전군 기갑군 군사령부',
  },
  {
    value: 'CORPS',
    label: '군단',
    group: '전략·작전 제대',
    keywords: 'CORPS Korps 군단 기갑군단',
  },
  {
    value: 'DIVISION',
    label: '사단',
    group: '전술 제대',
    keywords: 'DIVISION 보병사단 기갑사단 기계화사단 공수사단 사단',
  },
  {
    value: 'BRIGADE',
    label: '여단',
    group: '전술 제대',
    keywords: 'BRIGADE 여단 독립여단',
  },
  {
    value: 'REGIMENT',
    label: '연대',
    group: '전술 제대',
    keywords: 'REGIMENT 연대 보병연대 기갑연대',
  },
  {
    value: 'BATTALION',
    label: '대대',
    group: '전술 제대',
    keywords: 'BATTALION 대대 중전차대대',
  },
  {
    value: 'COMPANY',
    label: '중대',
    group: '전술 제대',
    keywords: 'COMPANY 중대',
  },
  {
    value: 'PLATOON',
    label: '소대',
    group: '전술 제대',
    keywords: 'PLATOON 소대',
  },
  {
    value: 'SQUAD',
    label: '분대',
    group: '전술 제대',
    keywords: 'SQUAD 분대',
  },
  {
    value: 'FLEET',
    label: '함대',
    group: '해군·공군·특수·기타',
    keywords: 'FLEET 연합함대 기동함대 함대 해군',
  },
  {
    value: 'AIR_FLEET',
    label: '항공함대',
    group: '해군·공군·특수·기타',
    keywords: 'AIR_FLEET Luftflotte 항공함대 공군',
  },
  {
    value: 'AIR_CORPS',
    label: '항공군단',
    group: '해군·공군·특수·기타',
    keywords: 'AIR_CORPS Fliegerkorps 항공군단 비행군단',
  },
  {
    value: 'SQUADRON',
    label: '전대',
    group: '해군·공군·특수·기타',
    keywords: 'SQUADRON 전대 비행전대 전단',
  },
  {
    value: 'WING',
    label: '비행단',
    group: '해군·공군·특수·기타',
    keywords: 'WING Geschwader 전투비행단 비행단',
  },
  {
    value: 'SPECIAL_FORCES',
    label: '특수부대',
    group: '해군·공군·특수·기타',
    keywords: 'SPECIAL_FORCES 특전사 특수부대 코만도 SAS',
  },
  {
    value: 'DETACHMENT',
    label: '파견대 · 분견대',
    group: '해군·공군·특수·기타',
    keywords: 'DETACHMENT Armeeabteilung 분견군 파견대 지대',
  },
  {
    value: 'OTHER',
    label: '기타 편제',
    group: '해군·공군·특수·기타',
    keywords: 'OTHER 기타 사관학교 기지',
  },
]

const HIGH_COMMAND_PRESETS: Array<{
  label: string
  name: string
  abbreviation: string
  nameLocal?: string
  nameEn?: string
  unitType: MilitaryUnitType
  branch: string
}> = [
  {
    label: 'OKW (국방군 최고사령부)',
    name: '국방군 최고사령부',
    abbreviation: 'OKW',
    nameLocal: 'Oberkommando der Wehrmacht',
    nameEn: 'Armed Forces High Command',
    unitType: 'SUPREME_COMMAND',
    branch: 'JOINT',
  },
  {
    label: 'OKH (육군 총사령부)',
    name: '육군 총사령부',
    abbreviation: 'OKH',
    nameLocal: 'Oberkommando des Heeres',
    nameEn: 'Army High Command',
    unitType: 'SERVICE_HQ',
    branch: 'ARMY',
  },
  {
    label: 'OKM (해군 총사령부)',
    name: '해군 총사령부',
    abbreviation: 'OKM',
    nameLocal: 'Oberkommando der Marine',
    nameEn: 'Navy High Command',
    unitType: 'SERVICE_HQ',
    branch: 'NAVY',
  },
  {
    label: 'OKL (공군 총사령부)',
    name: '공군 총사령부',
    abbreviation: 'OKL',
    nameLocal: 'Oberkommando der Luftwaffe',
    nameEn: 'Air Force High Command',
    unitType: 'SERVICE_HQ',
    branch: 'AIR_FORCE',
  },
  {
    label: 'STAVKA (소련 최고사령부)',
    name: '최고사령부 스타프카',
    abbreviation: 'STAVKA',
    nameLocal: 'Ставка Верховного Главнокомандования',
    nameEn: 'Stavka of the Supreme High Command',
    unitType: 'SUPREME_COMMAND',
    branch: 'JOINT',
  },
  {
    label: '대본영 (일본 제국)',
    name: '대본영',
    abbreviation: '대본영',
    nameLocal: '大本営',
    nameEn: 'Imperial General Headquarters',
    unitType: 'SUPREME_COMMAND',
    branch: 'JOINT',
  },
  {
    label: '합동참모본부 (합참)',
    name: '합동참모본부',
    abbreviation: '합참',
    nameEn: 'Joint Chiefs of Staff',
    unitType: 'GENERAL_STAFF',
    branch: 'JOINT',
  },
]

const TRANSITION_KIND_OPTIONS: Array<{
  value: MilitaryUnitTransitionKind
  label: string
}> = [
  { value: 'REORGANIZE', label: '개편 · 승계' },
  { value: 'RENAME', label: '개칭' },
  { value: 'SPLIT', label: '분리 · 창설' },
  { value: 'MERGE', label: '통합' },
  { value: 'ABSORBED', label: '흡수' },
]

const MILITARY_BRANCHES: Array<{
  value: string
  icon: string
  label: string
  keywords: string
}> = [
  { value: 'JOINT', icon: '⚔️', label: '합동·통합군', keywords: 'JOINT Wehrmacht 합동군 통합군 국방군' },
  { value: 'ARMY', icon: '🪖', label: '육군', keywords: 'ARMY Heer 지상군 육군' },
  { value: 'NAVY', icon: '⚓', label: '해군', keywords: 'NAVY Kriegsmarine 함대 해군' },
  {
    value: 'AIR_FORCE',
    icon: '✈️',
    label: '공군',
    keywords: 'AIR_FORCE Luftwaffe 항공군 공군',
  },
  {
    value: 'MARINE_CORPS',
    icon: '🔱',
    label: '해병대',
    keywords: 'MARINE_CORPS Marines 상륙군 해병대',
  },
  {
    value: 'COAST_GUARD',
    icon: '🛟',
    label: '해안경비대',
    keywords: 'COAST_GUARD 해안경비대 해양경찰',
  },
  {
    value: 'SPACE_FORCE',
    icon: '🛰️',
    label: '우주군',
    keywords: 'SPACE_FORCE 전략로켓군 우주군',
  },
  {
    value: 'OTHER',
    icon: '🛡️',
    label: '기타·독립군종',
    keywords: 'OTHER 친위대 SS 헌병 방공군 기타',
  },
]

type FormSectionKey = 'basic' | 'military' | 'lineage' | 'description'

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
  const isEdit = Boolean(editingUnitId)

  const [loading, setLoading] = useState(false)
  const [insigniaUploading, setInsigniaUploading] = useState(false)
  const [activeSection, setActiveSection] = useState<FormSectionKey>('basic')
  const [modernCountries, setModernCountries] = useState<CountryResponseDto[]>(
    [],
  )
  const [historicalCountries, setHistoricalCountries] = useState<
    HistoricalCountryResponseDto[]
  >([])
  const [allUnits, setAllUnits] = useState<MilitaryUnit[]>([])
  const [allPersons, setAllPersons] = useState<PersonResponseDto[]>([])
  const [personsLoading, setPersonsLoading] = useState(false)

  const formRootRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const insigniaInputRef = useRef<HTMLInputElement>(null)

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

  const scrollToSection = useCallback((sectionKey: FormSectionKey) => {
    setActiveSection(sectionKey)
    const targetNode = formRootRef.current?.querySelector<HTMLElement>(
      `[data-form-section="${sectionKey}"]`,
    )
    targetNode?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const modernAnchorCountryId = countryId || defaultCountryId || ''
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
        ? modernCountries.find((item) => item.id === modernAnchorCountryId) ??
          null
        : null,
    [modernAnchorCountryId, modernCountries],
  )

  useEffect(() => {
    void loadCountries()
    void loadAllUnits()
  }, [])

  useEffect(() => {
    if (!isOpen) return
    void loadAllUnits()
  }, [isOpen])

  useEffect(() => {
    if (!commanderPersonModalOpen || allPersons.length > 0) return
    setPersonsLoading(true)
    getAllPersons()
      .then((list) => setAllPersons(Array.isArray(list) ? list : []))
      .catch(() => setAllPersons([]))
      .finally(() => setPersonsLoading(false))
  }, [commanderPersonModalOpen, allPersons.length])

  useEffect(() => {
    if (!isOpen || !editingUnitId) return
    setActiveSection('basic')
    void loadMilitaryUnit(editingUnitId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingUnitId])

  /** 신규: 모달을 열 때 폼·기본 국가·중앙부처·상위 부대 연결 */
  useEffect(() => {
    if (!isOpen || editingUnitId) return
    setName('')
    setAbbreviation('')
    setNameLocal('')
    setNameEn('')
    setUnitType('')
    const resolvedBranch = defaultBranch ?? ''
    setBranch(resolvedBranch)
    setParentUnitId(defaultParentUnitId ?? '')
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
    setActiveSection('basic')
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
  }, [
    isOpen,
    editingUnitId,
    defaultCountryId,
    defaultHistoricalCountryId,
    defaultAdministrationDepartmentId,
    defaultParentUnitId,
    defaultBranch,
  ])

  /** 신규 생성 시 상위 부대(defaultParentUnitId)가 있으면 이름·군종·소속 국가·중앙부처 자동 상속 */
  useEffect(() => {
    if (!isOpen || editingUnitId || !parentUnitId || allUnits.length === 0)
      return
    const matchedParent = allUnits.find((unitItem) => unitItem.id === parentUnitId)
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

      setUnitTenures(
        Array.isArray(unit.tenures)
          ? (unit.tenures as MilitaryUnitTenureItem[])
          : [],
      )
      setCommanderRows([])
    } catch (loadError) {
      notify.error(
        getApiErrorMessage(loadError, '군부대 정보를 불러오는데 실패했습니다.'),
      )
      onClose()
    } finally {
      setLoading(false)
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

  const handleAddTransition = async () => {
    if (!newTransitionTargetId || transitionBusy) return
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
                (deptItem) => deptItem.id === newTransitionTargetId,
              )
              return foundDept
                ? `🏛️ ${foundDept.name}${foundDept.abbreviation ? ` (${foundDept.abbreviation})` : ''}`
                : newTransitionTargetId
            })()
          : (() => {
              const foundUnit = lineageCandidateUnits.find(
                (unitCandidate) => unitCandidate.id === newTransitionTargetId,
              )
              return foundUnit
                ? `🛡️ ${foundUnit.name}${foundUnit.abbreviation ? ` (${foundUnit.abbreviation})` : ''}`
                : newTransitionTargetId
            })()

      setPendingTransitions((prev) => [
        ...prev,
        {
          localKey: `${Date.now()}-${Math.random()}`,
          direction: newTransitionDirection,
          targetId: newTransitionTargetId,
          targetLabel,
          kind: newTransitionKind,
          era: newTransitionEra,
          year: newTransitionYear.trim(),
          month: newTransitionMonth.trim(),
          note: newTransitionNote.trim(),
        },
      ])
      setNewTransitionTargetId('')
      setNewTransitionYear('')
      setNewTransitionMonth('')
      setNewTransitionNote('')
      return
    }

    const transitionPayload = {
      kind: newTransitionKind,
      era: timeFields.era,
      year: timeFields.year,
      month: timeFields.month,
      note: newTransitionNote.trim() || null,
      ...(newTransitionDirection === 'PREDECESSOR_DEPARTMENT'
        ? { predecessorDepartmentId: newTransitionTargetId }
        : newTransitionDirection === 'PREDECESSOR_UNIT'
          ? { predecessorUnitId: newTransitionTargetId }
          : { successorUnitId: newTransitionTargetId }),
    }
    try {
      setTransitionBusy(true)
      await militaryUnitApi.addTransition(editingUnitId, transitionPayload)
      await refreshUnitTenuresAndLineage(editingUnitId)
      setNewTransitionTargetId('')
      setNewTransitionYear('')
      setNewTransitionMonth('')
      setNewTransitionNote('')
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

  const submitUnitForm = async () => {
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

    // 신규 생성 시 함께 입력한 지휘관 초안 사전 검증
    if (!isEdit && commanderRows.length > 0) {
      for (const cmdRow of commanderRows) {
        if (!cmdRow.roleTitle.trim()) {
          notify.error(
            `지휘관 ${cmdRow.personName}의 직책·보직명을 입력해주세요.`,
          )
          scrollToSection('military')
          return
        }
        const parsedStartYear = Number.parseInt(cmdRow.startYear.trim(), 10)
        if (!Number.isInteger(parsedStartYear) || parsedStartYear < 1) {
          notify.error(
            `지휘관 ${cmdRow.personName}의 부임 연도를 자연수로 입력해주세요.`,
          )
          scrollToSection('military')
          return
        }
        if (cmdRow.endYear.trim()) {
          const parsedEndYear = Number.parseInt(cmdRow.endYear.trim(), 10)
          if (!Number.isInteger(parsedEndYear) || parsedEndYear < 1) {
            notify.error(
              `지휘관 ${cmdRow.personName}의 이임 연도가 올바르지 않습니다.`,
            )
            scrollToSection('military')
            return
          }
        }
      }
    }

    // 신규 생성 시 미추가 상태로 입력란에만 남아있는 계보도 검증 후 함께 처리
    const queuedTransitions = [...pendingTransitions]
    if (!isEdit && newTransitionTargetId) {
      const draftTime = parseTransitionTimeFields(
        newTransitionEra,
        newTransitionYear,
        newTransitionMonth,
      )
      if (!draftTime) {
        scrollToSection('lineage')
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
        notify.success('군부대가 수정되었습니다.')
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

        notify.success('군부대가 생성되었습니다.')
      }
      void queryClient.invalidateQueries({ queryKey: ['military-units'] })
      void queryClient.invalidateQueries({ queryKey: ['military-unit'] })
      void queryClient.invalidateQueries({
        queryKey: ['administration-departments'],
      })
      onSaved?.()
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
    void submitUnitForm()
  }

  const submitUnitFormRef = useRef(submitUnitForm)
  submitUnitFormRef.current = submitUnitForm

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (
        (keyEvent.metaKey || keyEvent.ctrlKey) &&
        keyEvent.key === 'Enter' &&
        !loading &&
        !insigniaUploading &&
        name.trim() &&
        (countryId || historicalCountryId)
      ) {
        keyEvent.preventDefault()
        void submitUnitFormRef.current()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [countryId, historicalCountryId, insigniaUploading, isOpen, loading, name])

  const unitTypeSelectOptions = useMemo<SearchableSelectOption[]>(
    () =>
      UNIT_TYPES.map((typeItem) => ({
        value: typeItem.value,
        label: typeItem.label,
        group: typeItem.group,
        keywords: typeItem.keywords,
      })),
    [],
  )

  const parentUnitSelectOptions = useMemo<SearchableSelectOption[]>(
    () =>
      availableParentUnits.map((unitItem) => {
        const unitTypeLabel = unitItem.unitType
          ? UNIT_TYPES.find((typeOpt) => typeOpt.value === unitItem.unitType)
              ?.label
          : undefined
        const eraOrCountry = unitItem.historicalCountry?.name
          ? `🏛️ ${unitItem.historicalCountry.name}`
          : unitItem.country?.name
            ? `${unitItem.country.flagEmoji ?? '🏳️'} ${unitItem.country.name}`
            : undefined
        return {
          value: unitItem.id,
          label: `${unitItem.name}${unitItem.abbreviation ? ` (${unitItem.abbreviation})` : ''}`,
          meta: eraOrCountry,
          description: unitTypeLabel,
          keywords: [
            unitItem.abbreviation,
            unitItem.nameEn,
            unitItem.nameLocal,
            unitTypeLabel,
          ]
            .filter(Boolean)
            .join(' '),
        }
      }),
    [availableParentUnits],
  )

  const adminDeptSelectOptions = useMemo<SearchableSelectOption[]>(
    () =>
      adminDepartments.map((deptItem) => ({
        value: deptItem.id,
        label: `${deptItem.name}${deptItem.abbreviation ? ` (${deptItem.abbreviation})` : ''}`,
        meta:
          deptItem.historicalCountry?.name && !historicalCountryId
            ? `🏛️ ${deptItem.historicalCountry.name}`
            : undefined,
        keywords: [deptItem.abbreviation, deptItem.nameEn, deptItem.nameLocal]
          .filter(Boolean)
          .join(' '),
      })),
    [adminDepartments, historicalCountryId],
  )

  const lineageTargetSelectOptions = useMemo<SearchableSelectOption[]>(() => {
    if (newTransitionDirection === 'PREDECESSOR_DEPARTMENT') {
      return lineageDepartments.map((deptItem) => ({
        value: deptItem.id,
        label: `${deptItem.name}${deptItem.abbreviation ? ` (${deptItem.abbreviation})` : ''}`,
        icon: '🏛️',
        meta: deptItem.historicalCountry?.name
          ? deptItem.historicalCountry.name
          : undefined,
        keywords: [deptItem.abbreviation, deptItem.nameEn, deptItem.nameLocal]
          .filter(Boolean)
          .join(' '),
      }))
    }
    return lineageCandidateUnits.map((unitCandidate) => ({
      value: unitCandidate.id,
      label: `${unitCandidate.name}${unitCandidate.abbreviation ? ` (${unitCandidate.abbreviation})` : ''}`,
      icon: '🛡️',
      meta: unitCandidate.historicalCountry?.name
        ? unitCandidate.historicalCountry.name
        : undefined,
      keywords: [
        unitCandidate.abbreviation,
        unitCandidate.nameEn,
        unitCandidate.nameLocal,
      ]
        .filter(Boolean)
        .join(' '),
    }))
  }, [newTransitionDirection, lineageDepartments, lineageCandidateUnits])

  const selectedParentUnit = useMemo(
    () =>
      parentUnitId
        ? (allUnits.find((unitItem) => unitItem.id === parentUnitId) ?? null)
        : null,
    [allUnits, parentUnitId],
  )

  const commanderRolePresets = useMemo(
    () => buildCommanderRolePresets(unitType),
    [unitType],
  )

  const totalLineageCount = isEdit
    ? predecessors.length + successors.length
    : pendingTransitions.length

  const totalCommanderCount = isEdit
    ? unitTenures.length
    : commanderRows.length

  const hasDetailContent = Boolean(
    description.trim() || notableBattles.trim() || honors.trim(),
  )

  const renderLineageRow = (
    lineageItem: MilitaryUnitLineageDto,
    directionKind: 'PREDECESSOR' | 'SUCCESSOR',
  ) => {
    const isRowEditing = editingTransitionId === lineageItem.transitionId
    const targetLabel =
      directionKind === 'PREDECESSOR'
        ? lineageItem.targetType === 'DEPARTMENT'
          ? `🏛️ [전신 부처] ${lineageItem.department?.name ?? ''}`
          : `🛡️ [전신 부대] ${lineageItem.unit?.name ?? ''}`
        : `🛡️ [후신 부대] ${lineageItem.unit?.name ?? ''}`
    const kindLabel =
      TRANSITION_KIND_OPTIONS.find((optItem) => optItem.value === lineageItem.kind)
        ?.label ?? lineageItem.kind

    if (isRowEditing) {
      return (
        <LinkedRecordRow key={lineageItem.transitionId}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{targetLabel}</div>
          <FlatTwoColGrid>
            <FlatSelect
              aria-label="변동 유형"
              value={editTransKind}
              onChange={(changeEvent) =>
                setEditTransKind(
                  changeEvent.target.value as MilitaryUnitTransitionKind,
                )
              }
            >
              {TRANSITION_KIND_OPTIONS.map((optItem) => (
                <option key={optItem.value} value={optItem.value}>
                  {optItem.label}
                </option>
              ))}
            </FlatSelect>
            <InlineDateRow>
              <FlatSelect
                aria-label="개편 기원"
                value={editTransEra}
                onChange={(changeEvent) =>
                  setEditTransEra(changeEvent.target.value as 'AD' | 'BC')
                }
                style={{ width: 72 }}
              >
                <option value="AD">서기</option>
                <option value="BC">BC</option>
              </FlatSelect>
              <FlatInput
                type="number"
                min={1}
                placeholder="연도"
                value={editTransYear}
                onChange={(changeEvent) =>
                  setEditTransYear(changeEvent.target.value)
                }
                style={{ flex: '1 1 92px' }}
              />
              <FlatInput
                type="number"
                min={1}
                max={12}
                placeholder="월"
                value={editTransMonth}
                onChange={(changeEvent) =>
                  setEditTransMonth(changeEvent.target.value)
                }
                style={{ width: 68 }}
              />
            </InlineDateRow>
          </FlatTwoColGrid>
          <FlatInput
            type="text"
            placeholder="개편 비고 (선택)"
            value={editTransNote}
            onChange={(changeEvent) =>
              setEditTransNote(changeEvent.target.value)
            }
          />
          <InlineDateRow style={{ justifyContent: 'flex-end' }}>
            <InlineIconBtn
              type="button"
              onClick={() => setEditingTransitionId(null)}
            >
              취소
            </InlineIconBtn>
            <InlineIconBtn
              type="button"
              disabled={transitionBusy}
              onClick={() =>
                void handleSaveInlineTransition(lineageItem.transitionId)
              }
            >
              저장
            </InlineIconBtn>
          </InlineDateRow>
        </LinkedRecordRow>
      )
    }

    const timeText = lineageItem.year
      ? ` · ${lineageItem.era === 'BC' ? 'BC ' : ''}${lineageItem.year}년${lineageItem.month ? ` ${lineageItem.month}월` : ''}`
      : ''

    return (
      <LinkedRecordRow key={lineageItem.transitionId}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 13, minWidth: 0 }}>
            {directionKind === 'PREDECESSOR' ? (
              <>
                <strong>{targetLabel}</strong>{' '}
                <span style={{ opacity: 0.72 }}>
                  → 현재 부대 ({kindLabel}
                  {timeText})
                </span>
              </>
            ) : (
              <>
                <span style={{ opacity: 0.72 }}>현재 부대 → </span>
                <strong>{targetLabel}</strong>{' '}
                <span style={{ opacity: 0.72 }}>
                  ({kindLabel}
                  {timeText})
                </span>
              </>
            )}
            {lineageItem.note && (
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                {lineageItem.note}
              </div>
            )}
          </div>
          <InlineDateRow>
            <InlineIconBtn
              type="button"
              disabled={transitionBusy}
              onClick={() => startInlineEditTransition(lineageItem)}
              title="계보 연도·유형 수정"
            >
              <FiEdit2 size={13} />
            </InlineIconBtn>
            <InlineIconBtn
              type="button"
              $danger
              disabled={transitionBusy}
              onClick={() =>
                void handleDeleteTransition(lineageItem.transitionId)
              }
              title="계보 연결 해제"
            >
              <FiTrash2 size={13} />
            </InlineIconBtn>
          </InlineDateRow>
        </div>
      </LinkedRecordRow>
    )
  }

  if (!isOpen) return null

  const hasCountry = Boolean(countryId || historicalCountryId)
  const isFormValid = Boolean(name.trim() && hasCountry)

  const anyChildModalOpen =
    countryModalOpen ||
    establishedDateModalOpen ||
    disbandedDateModalOpen ||
    commanderPersonModalOpen ||
    appointmentModalOpen

  const renderSectionJumpButtons = () => (
    <>
      <SectionJumpBtn
        type="button"
        $active={activeSection === 'basic'}
        onClick={() => scrollToSection('basic')}
      >
        기본 편제
        {isFormValid ? <SectionJumpDone>✓</SectionJumpDone> : null}
      </SectionJumpBtn>
      <SectionJumpBtn
        type="button"
        $active={activeSection === 'military'}
        onClick={() => scrollToSection('military')}
      >
        지휘관 · 임무
        {totalCommanderCount > 0 ? (
          <SectionJumpBadge>{totalCommanderCount}</SectionJumpBadge>
        ) : null}
      </SectionJumpBtn>
      <SectionJumpBtn
        type="button"
        $active={activeSection === 'lineage'}
        onClick={() => scrollToSection('lineage')}
      >
        계보
        {totalLineageCount > 0 ? (
          <SectionJumpBadge>{totalLineageCount}</SectionJumpBadge>
        ) : null}
      </SectionJumpBtn>
      <SectionJumpBtn
        type="button"
        $active={activeSection === 'description'}
        onClick={() => scrollToSection('description')}
      >
        상세 기록
        {hasDetailContent ? <SectionJumpDone>✓</SectionJumpDone> : null}
      </SectionJumpBtn>
    </>
  )

  return (
    <>
      <SidePanel
        isOpen={isOpen}
        onClose={() => {
          playClickSound()
          onClose()
        }}
        width="min(900px, 100vw)"
        closeOnEscape={!anyChildModalOpen}
        title={isEdit ? '군사 사령부 · 부대 수정' : '군사 사령부 · 부대 등록'}
        headerActions={
          <PanelHeaderActionsBar>
            {selectedParentUnit ? (
              <PanelHeaderContextBadge
                title={`상위 부대: ${selectedParentUnit.name}`}
              >
                ↳ 상위: {selectedParentUnit.name}
              </PanelHeaderContextBadge>
            ) : countryName ? (
              <PanelHeaderContextBadge title={`소속 국가: ${countryName}`}>
                {countryFlagEmoji || '🏳️'} {countryName}
              </PanelHeaderContextBadge>
            ) : null}
            <SectionJumpNav aria-label="군부대 등록 섹션 이동">
              {renderSectionJumpButtons()}
            </SectionJumpNav>
          </PanelHeaderActionsBar>
        }
        footer={
          <EventStyleFooterBar>
            <FooterHintArea>
              {!name.trim() ? (
                <FooterJumpBtn
                  type="button"
                  onClick={() => {
                    scrollToSection('basic')
                    window.setTimeout(() => nameInputRef.current?.focus(), 120)
                  }}
                >
                  필수 입력: 군부대·사령부명 →
                </FooterJumpBtn>
              ) : !hasCountry ? (
                <FooterJumpBtn
                  type="button"
                  onClick={() => {
                    scrollToSection('basic')
                    if (!lockCountryAndDepartment) {
                      setCountryModalOpen(true)
                    }
                  }}
                >
                  필수 선택: 소속 국가 →
                </FooterJumpBtn>
              ) : (
                <FooterReadyGroup>
                  <FooterReadyBadge>
                    <FooterReadyDot />
                    {isEdit ? '수정 준비 완료' : '등록 준비 완료'}
                  </FooterReadyBadge>
                  <FooterShortcutText>
                    <FooterKbd>⌘↵</FooterKbd> 저장
                  </FooterShortcutText>
                </FooterReadyGroup>
              )}
            </FooterHintArea>

            <FooterActionGroup>
              <FooterCancelButton
                type="button"
                onClick={() => {
                  playClickSound()
                  onClose()
                }}
              >
                취소
              </FooterCancelButton>
              <FooterSubmitButton
                type="submit"
                form="military-unit-form"
                disabled={loading || insigniaUploading || !isFormValid}
                aria-busy={loading}
              >
                {loading
                  ? '저장 중…'
                  : isEdit
                    ? '변경사항 저장'
                    : '부대 등록'}
              </FooterSubmitButton>
            </FooterActionGroup>
          </EventStyleFooterBar>
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
            try {
              validateImageFile(selectedFile)
              setInsigniaUploading(true)
              const uploaded = await uploadImage(selectedFile, 'military-units')
              setInsigniaUrl(toUploadStoragePath(uploaded.url) || uploaded.url)
            } catch (uploadError) {
              notify.error(
                uploadError instanceof Error
                  ? uploadError.message
                  : '이미지 업로드에 실패했습니다.',
              )
            } finally {
              setInsigniaUploading(false)
            }
          }}
        />

        <MobileSectionStrip>{renderSectionJumpButtons()}</MobileSectionStrip>

        <form id="military-unit-form" onSubmit={handleSubmit}>
          <FlatFormStack ref={formRootRef}>
            {/* 1. 기본 편제 · 소속 · 시기 */}
            <FlatFormSection
              data-form-section="basic"
              onFocusCapture={() => setActiveSection('basic')}
            >
              <FlatSectionHeader>
                <FlatSectionTitle>기본 편제 · 소속 · 시기</FlatSectionTitle>
                <FlatSectionHint>
                  최고사령부(OKW·STAVKA)부터 야전군·사단·함대까지 편제 기록
                </FlatSectionHint>
              </FlatSectionHeader>

              {!isEdit && (
                <FlatFormRow>
                  <FlatFormLabel>사령부 프리셋</FlatFormLabel>
                  <FlatFieldControl>
                    <InlineDateRow>
                      {HIGH_COMMAND_PRESETS.map((presetItem) => (
                        <QuickPresetChip
                          key={presetItem.abbreviation}
                          type="button"
                          $active={
                            name === presetItem.name &&
                            abbreviation === presetItem.abbreviation
                          }
                          onClick={() => {
                            playClickSound()
                            setName(presetItem.name)
                            setAbbreviation(presetItem.abbreviation)
                            setNameLocal(presetItem.nameLocal ?? '')
                            setNameEn(presetItem.nameEn ?? '')
                            setUnitType(presetItem.unitType)
                            setBranch(presetItem.branch)
                          }}
                        >
                          ⚡ {presetItem.label}
                        </QuickPresetChip>
                      ))}
                    </InlineDateRow>
                  </FlatFieldControl>
                </FlatFormRow>
              )}

              <FlatFormRow>
                <FlatFormLabel htmlFor="military-unit-name">
                  군부대·사령부명
                  <FlatRequired>*</FlatRequired>
                </FlatFormLabel>
                <FlatFieldControl>
                  <FlatNameAbbrGrid>
                    <FlatInput
                      ref={nameInputRef}
                      id="military-unit-name"
                      type="text"
                      placeholder="예: 국방군 최고사령부, 중부집단군, 제1보병사단"
                      value={name}
                      onChange={(changeEvent) =>
                        setName(changeEvent.target.value)
                      }
                      required
                    />
                    <FlatInput
                      id="military-unit-abbr"
                      type="text"
                      aria-label="약칭·부호"
                      placeholder="약칭 (예: OKW, 합참)"
                      value={abbreviation}
                      onChange={(changeEvent) =>
                        setAbbreviation(changeEvent.target.value)
                      }
                    />
                  </FlatNameAbbrGrid>
                </FlatFieldControl>
              </FlatFormRow>

              <FlatFormRow>
                <FlatFormLabel>원어 · 영문 표기</FlatFormLabel>
                <FlatFieldControl>
                  <FlatTwoColGrid>
                    <FlatInput
                      type="text"
                      aria-label="원어 표기"
                      placeholder="원어명 (예: Oberkommando der Wehrmacht)"
                      value={nameLocal}
                      onChange={(changeEvent) =>
                        setNameLocal(changeEvent.target.value)
                      }
                    />
                    <FlatInput
                      type="text"
                      aria-label="영문 표기"
                      placeholder="영문명 (예: Armed Forces High Command)"
                      value={nameEn}
                      onChange={(changeEvent) =>
                        setNameEn(changeEvent.target.value)
                      }
                    />
                  </FlatTwoColGrid>
                </FlatFieldControl>
              </FlatFormRow>

              <FlatFormRow>
                <FlatFormLabel>부대 마크 · 휘장</FlatFormLabel>
                <FlatFieldControl>
                  <CompactUploadStrip>
                    <CompactUploadThumb>
                      {insigniaUrl ? (
                        <img
                          src={getUploadImageUrl(insigniaUrl)}
                          alt="부대 휘장"
                          onError={(imgEvent) => {
                            imgEvent.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <FiShield size={16} />
                      )}
                    </CompactUploadThumb>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <FlatHint>
                        {insigniaUploading
                          ? '휘장 이미지를 업로드하는 중입니다…'
                          : insigniaUrl
                            ? '등록된 부대 마크·휘장 이미지가 적용되어 있습니다.'
                            : '사령부·부대의 공식 마크나 휘장 이미지를 업로드합니다 (선택)'}
                      </FlatHint>
                    </div>
                    <InlineDateRow>
                      <InlineIconBtn
                        type="button"
                        disabled={insigniaUploading}
                        onClick={() => insigniaInputRef.current?.click()}
                      >
                        <FiUpload size={13} />
                        {insigniaUrl ? '변경' : '업로드'}
                      </InlineIconBtn>
                      {insigniaUrl ? (
                        <InlineIconBtn
                          type="button"
                          $danger
                          disabled={insigniaUploading}
                          onClick={() => {
                            playClickSound()
                            setInsigniaUrl('')
                          }}
                        >
                          <FiTrash2 size={13} />
                          제거
                        </InlineIconBtn>
                      ) : null}
                    </InlineDateRow>
                  </CompactUploadStrip>
                </FlatFieldControl>
              </FlatFormRow>

              <FlatFormRow>
                <FlatFormLabel>
                  소속 국가 · 시대
                  <FlatRequired>*</FlatRequired>
                </FlatFormLabel>
                <FlatFieldControl>
                  <InlineDateRow>
                    {hasCountry ? (
                      <>
                        <PillChoiceChip
                          type="button"
                          $selected
                          onClick={() => {
                            if (!lockCountryAndDepartment) {
                              playClickSound()
                              setCountryModalOpen(true)
                            }
                          }}
                        >
                          <PillChoiceIcon $selected>
                            {countryFlagEmoji || '🏳️'}
                          </PillChoiceIcon>
                          <span>
                            {countryName}
                            {countryEnglishName
                              ? ` (${countryEnglishName})`
                              : ''}
                          </span>
                        </PillChoiceChip>
                        {!lockCountryAndDepartment && (
                          <>
                            <InlineIconBtn
                              type="button"
                              onClick={() => {
                                playClickSound()
                                setCountryModalOpen(true)
                              }}
                            >
                              변경
                            </InlineIconBtn>
                            <InlineIconBtn
                              type="button"
                              $danger
                              onClick={() => {
                                playClickSound()
                                setCountryId('')
                                setHistoricalCountryId('')
                                setCountryName('')
                                setCountryFlagEmoji('')
                                setCountryEnglishName('')
                                setAdministrationDepartmentId('')
                              }}
                            >
                              <FiX size={14} />
                            </InlineIconBtn>
                          </>
                        )}
                      </>
                    ) : (
                      <OutlineAddBtn
                        type="button"
                        disabled={lockCountryAndDepartment}
                        onClick={() => {
                          playClickSound()
                          if (!lockCountryAndDepartment) {
                            setCountryModalOpen(true)
                          }
                        }}
                      >
                        🏳️ 소속 국가 선택…
                      </OutlineAddBtn>
                    )}
                  </InlineDateRow>

                  {!lockCountryAndDepartment &&
                    modernAnchorCountry &&
                    linkedHistoricalCountries.length > 0 && (
                      <InlineDateRow>
                        <FlatHint>시대 전환:</FlatHint>
                        <QuickPresetChip
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
                          }}
                        >
                          {modernAnchorCountry.flagEmoji || '🏳️'}{' '}
                          {modernAnchorCountry.name} (현대)
                        </QuickPresetChip>
                        {linkedHistoricalCountries.map((histEra) => (
                          <QuickPresetChip
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
                            }}
                          >
                            🏛️ {histEra.name}
                          </QuickPresetChip>
                        ))}
                      </InlineDateRow>
                    )}
                </FlatFieldControl>
              </FlatFormRow>

              <FlatFormRow>
                <FlatFormLabel>군종</FlatFormLabel>
                <FlatFieldControl>
                  <PillChoiceRow role="group" aria-label="군종 선택">
                    {MILITARY_BRANCHES.map((branchItem) => {
                      const isSelected = branch === branchItem.value
                      return (
                        <PillChoiceChip
                          key={branchItem.value}
                          type="button"
                          $selected={isSelected}
                          onClick={() => {
                            playClickSound()
                            setBranch(isSelected ? '' : branchItem.value)
                          }}
                        >
                          <PillChoiceIcon $selected={isSelected}>
                            {branchItem.icon}
                          </PillChoiceIcon>
                          <span>{branchItem.label}</span>
                        </PillChoiceChip>
                      )
                    })}
                  </PillChoiceRow>
                </FlatFieldControl>
              </FlatFormRow>

              <FlatFormRow>
                <FlatFormLabel>부대 유형 · 제대</FlatFormLabel>
                <FlatFieldControl>
                  <SearchableSelect
                    options={unitTypeSelectOptions}
                    value={unitType}
                    onChange={(nextVal) => {
                      playClickSound()
                      setUnitType(nextVal as MilitaryUnitType | '')
                    }}
                    placeholder="부대 유형 · 제대 검색 · 선택"
                    searchPlaceholder="최고사령부, 집단군, 야전군, 사단, 함대 등 검색…"
                    ariaLabel="부대 유형 · 제대"
                  />
                </FlatFieldControl>
              </FlatFormRow>

              <FlatFormRow>
                <FlatFormLabel>상위 부대 · 사령부</FlatFormLabel>
                <FlatFieldControl>
                  <SearchableSelect
                    options={parentUnitSelectOptions}
                    value={parentUnitId}
                    onChange={(nextVal) => {
                      playClickSound()
                      setParentUnitId(nextVal)
                    }}
                    placeholder="최상위 독립 편제 (상위 부대·사령부 없음)"
                    searchPlaceholder="상위 사령부·부대명, 약칭(OKW 등) 검색…"
                    ariaLabel="상위 부대·사령부"
                    emptyMessage="선택 가능한 상위 부대가 없습니다"
                  />
                </FlatFieldControl>
              </FlatFormRow>

              <FlatFormRow>
                <FlatFormLabel>소관 군정 부처</FlatFormLabel>
                <FlatFieldControl>
                  <SearchableSelect
                    options={adminDeptSelectOptions}
                    value={administrationDepartmentId}
                    onChange={(nextDeptId) => {
                      playClickSound()
                      setAdministrationDepartmentId(nextDeptId)
                      const nextDept = adminDepartments.find(
                        (deptItem) => deptItem.id === nextDeptId,
                      )
                      if (nextDept) {
                        if (nextDept.historicalCountryId) {
                          setHistoricalCountryId(nextDept.historicalCountryId)
                        } else if (
                          nextDept.countryId &&
                          !defaultHistoricalCountryId
                        ) {
                          setHistoricalCountryId('')
                        }
                      }
                    }}
                    disabled={!hasCountry || lockCountryAndDepartment}
                    placeholder="없음 (독립 최고사령부 등)"
                    searchPlaceholder="국방부, 전쟁성, 병조 등 부처 검색…"
                    ariaLabel="소관 국방·군정 부처"
                    emptyMessage="이 국가에 등록된 행정부처가 없습니다"
                  />
                  <FlatHint>
                    민간 국방부·병조 등 군정 부처 산하일 때 선택합니다. (전쟁성
                    폐지 → OKW 개편처럼 전신 부처에서 이어진 경우는 아래 「계보」
                    섹션에서 연결하세요.)
                  </FlatHint>
                </FlatFieldControl>
              </FlatFormRow>

              <FlatFormRow>
                <FlatFormLabel>창설 시점</FlatFormLabel>
                <FlatFieldControl>
                  <InlineDateRow>
                    <FlatSelect
                      aria-label="창설 기원"
                      value={establishedEra}
                      onChange={(changeEvent) =>
                        setEstablishedEra(
                          changeEvent.target.value as 'AD' | 'BC',
                        )
                      }
                      style={{ width: 74 }}
                    >
                      <option value="AD">서기</option>
                      <option value="BC">BC</option>
                    </FlatSelect>
                    <FlatInput
                      type="number"
                      min={1}
                      placeholder="연도 (예: 1938)"
                      value={establishedYear}
                      onChange={(changeEvent) =>
                        setEstablishedYear(changeEvent.target.value)
                      }
                      style={{ width: 136 }}
                    />
                    <FlatInput
                      type="number"
                      min={1}
                      max={12}
                      placeholder="월"
                      value={establishedMonth}
                      onChange={(changeEvent) =>
                        setEstablishedMonth(changeEvent.target.value)
                      }
                      style={{ width: 72 }}
                    />
                    <FlatInput
                      type="number"
                      min={1}
                      max={31}
                      placeholder="일"
                      value={establishedDay}
                      onChange={(changeEvent) =>
                        setEstablishedDay(changeEvent.target.value)
                      }
                      style={{ width: 72 }}
                    />
                    <InlineIconBtn
                      type="button"
                      title="달력에서 날짜 선택"
                      onClick={() => {
                        playClickSound()
                        setEstablishedDateModalOpen(true)
                      }}
                    >
                      <FiCalendar size={14} />
                      달력
                    </InlineIconBtn>
                    {(establishedYear || establishedMonth || establishedDay) && (
                      <InlineIconBtn
                        type="button"
                        title="창설 시점 비우기"
                        onClick={() => {
                          playClickSound()
                          setEstablishedEra('AD')
                          setEstablishedYear('')
                          setEstablishedMonth('')
                          setEstablishedDay('')
                        }}
                      >
                        <FiX size={14} />
                      </InlineIconBtn>
                    )}
                  </InlineDateRow>
                </FlatFieldControl>
              </FlatFormRow>

              <FlatFormRow>
                <FlatFormLabel>해산 시점 · 상태</FlatFormLabel>
                <FlatFieldControl>
                  <InlineDateRow>
                    <FlatSelect
                      aria-label="해산 기원"
                      value={disbandedEra}
                      onChange={(changeEvent) =>
                        setDisbandedEra(
                          changeEvent.target.value as 'AD' | 'BC',
                        )
                      }
                      style={{ width: 74 }}
                    >
                      <option value="AD">서기</option>
                      <option value="BC">BC</option>
                    </FlatSelect>
                    <FlatInput
                      type="number"
                      min={1}
                      placeholder="해산 연도 (예: 1945)"
                      value={disbandedYear}
                      onChange={(changeEvent) => {
                        const nextVal = changeEvent.target.value
                        setDisbandedYear(nextVal)
                        if (nextVal.trim()) {
                          setIsActive(false)
                        }
                      }}
                      style={{ width: 146 }}
                    />
                    <FlatInput
                      type="number"
                      min={1}
                      max={12}
                      placeholder="월"
                      value={disbandedMonth}
                      onChange={(changeEvent) => {
                        const nextVal = changeEvent.target.value
                        setDisbandedMonth(nextVal)
                        if (nextVal.trim()) {
                          setIsActive(false)
                        }
                      }}
                      style={{ width: 72 }}
                    />
                    <FlatInput
                      type="number"
                      min={1}
                      max={31}
                      placeholder="일"
                      value={disbandedDay}
                      onChange={(changeEvent) => {
                        const nextVal = changeEvent.target.value
                        setDisbandedDay(nextVal)
                        if (nextVal.trim()) {
                          setIsActive(false)
                        }
                      }}
                      style={{ width: 72 }}
                    />
                    <InlineIconBtn
                      type="button"
                      title="달력에서 날짜 선택"
                      onClick={() => {
                        playClickSound()
                        setDisbandedDateModalOpen(true)
                      }}
                    >
                      <FiCalendar size={14} />
                      달력
                    </InlineIconBtn>
                    {(disbandedYear || disbandedMonth || disbandedDay) && (
                      <InlineIconBtn
                        type="button"
                        title="해산 시점 비우기"
                        onClick={() => {
                          playClickSound()
                          setDisbandedEra('AD')
                          setDisbandedYear('')
                          setDisbandedMonth('')
                          setDisbandedDay('')
                        }}
                      >
                        <FiX size={14} />
                      </InlineIconBtn>
                    )}
                    <QuickPresetChip
                      type="button"
                      $active={isActive}
                      onClick={() => {
                        playClickSound()
                        const nextActive = !isActive
                        setIsActive(nextActive)
                        if (nextActive) {
                          setDisbandedYear('')
                          setDisbandedMonth('')
                          setDisbandedDay('')
                        }
                      }}
                    >
                      {isActive ? '● 현역 운용 중' : '○ 해산·비운용'}
                    </QuickPresetChip>
                  </InlineDateRow>
                  <FlatHint>
                    연도만 입력해도 저장되며, 해산 연도를 입력하면 자동으로
                    해산·비운용 상태로 전환됩니다.
                  </FlatHint>
                </FlatFieldControl>
              </FlatFormRow>
            </FlatFormSection>

            {/* 2. 지휘관 · 주둔지 · 임무 */}
            <FlatFormSection
              data-form-section="military"
              onFocusCapture={() => setActiveSection('military')}
            >
              <FlatSectionHeader>
                <FlatSectionTitle>
                  역대 지휘관 · 주둔지 · 작전 임무
                </FlatSectionTitle>
                <FlatSectionHint>
                  인물 상세 경력과 자동 동기화 ({totalCommanderCount}명)
                </FlatSectionHint>
              </FlatSectionHeader>

              <FlatFormRow>
                <FlatFormLabel>역대 지휘관·참모</FlatFormLabel>
                <FlatFieldControl>
                  {isEdit && editingUnitId ? (
                    <>
                      {unitTenures.map((tenureItem) => {
                        const personDisplay = tenureItem.person
                          ? getPersonDisplayName(tenureItem.person)
                          : '인물 미상'
                        return (
                          <LinkedRecordRow key={tenureItem.id}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 10,
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    flexWrap: 'wrap',
                                    fontSize: 13.5,
                                  }}
                                >
                                  {tenureItem.ordinal != null && (
                                    <span
                                      style={{
                                        fontSize: 11.5,
                                        fontWeight: 700,
                                        color: '#2563eb',
                                      }}
                                    >
                                      제{tenureItem.ordinal}대
                                    </span>
                                  )}
                                  {tenureItem.rankTitle && (
                                    <span
                                      style={{
                                        fontSize: 11.5,
                                        padding: '1px 7px',
                                        borderRadius: 6,
                                        background: 'rgba(37, 99, 235, 0.1)',
                                        color: '#2563eb',
                                        fontWeight: 600,
                                      }}
                                    >
                                      {tenureItem.rankTitle}
                                    </span>
                                  )}
                                  <strong>{personDisplay}</strong>
                                  {tenureItem.title && (
                                    <span style={{ opacity: 0.76 }}>
                                      · {tenureItem.title}
                                    </span>
                                  )}
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    opacity: 0.7,
                                    marginTop: 2,
                                  }}
                                >
                                  {formatTenureDateSpan(tenureItem)}
                                </div>
                              </div>
                              <InlineDateRow>
                                <InlineIconBtn
                                  type="button"
                                  title="지휘관 재임 수정"
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
                                        tenureItem.positionDefinition
                                          ?.positionType ??
                                        'MILITARY_COMMANDER',
                                      positionDefinitionId:
                                        tenureItem.positionDefinition?.id ??
                                        null,
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
                                  <FiEdit2 size={13} />
                                </InlineIconBtn>
                                <InlineIconBtn
                                  type="button"
                                  $danger
                                  title="지휘관 재임 삭제"
                                  onClick={() =>
                                    void handleDeleteUnitTenure(tenureItem)
                                  }
                                >
                                  <FiTrash2 size={13} />
                                </InlineIconBtn>
                              </InlineDateRow>
                            </div>
                          </LinkedRecordRow>
                        )
                      })}
                      <OutlineAddBtn
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setEditingAppointmentTenure(null)
                          setAppointmentModalOpen(true)
                        }}
                      >
                        <FiPlus size={14} />
                        지휘관 · 참모 임명 추가
                      </OutlineAddBtn>
                    </>
                  ) : (
                    <>
                      {commanderRows.map((rowItem, rowIndex) => (
                        <LinkedRecordRow
                          key={`${rowItem.personId}-${rowIndex}`}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                fontWeight: 700,
                                fontSize: 13.5,
                              }}
                            >
                              <FiUser size={14} color="#2563eb" />
                              {rowItem.personName}
                            </div>
                            <InlineIconBtn
                              type="button"
                              $danger
                              onClick={() => {
                                playClickSound()
                                setCommanderRows((prev) =>
                                  prev.filter((_, idx) => idx !== rowIndex),
                                )
                              }}
                            >
                              <FiTrash2 size={13} />
                            </InlineIconBtn>
                          </div>

                          <InlineDateRow>
                            {commanderRolePresets.map((presetRole) => (
                              <QuickPresetChip
                                key={presetRole}
                                type="button"
                                $active={rowItem.roleTitle === presetRole}
                                onClick={() =>
                                  setCommanderRows((prev) =>
                                    prev.map((item, idx) =>
                                      idx === rowIndex
                                        ? { ...item, roleTitle: presetRole }
                                        : item,
                                    ),
                                  )
                                }
                              >
                                {presetRole}
                              </QuickPresetChip>
                            ))}
                          </InlineDateRow>

                          <FlatTwoColGrid>
                            <FlatInput
                              type="text"
                              placeholder="직책·보직명 * (예: 사령관, 총장, 참모장)"
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
                              }}
                            />
                            <InlineDateRow>
                              <FlatInput
                                type="text"
                                placeholder="계급 (예: 원수, 중장)"
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
                                }}
                                style={{ flex: '1 1 110px' }}
                              />
                              <FlatInput
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
                                }}
                                style={{ width: 76 }}
                              />
                            </InlineDateRow>
                          </FlatTwoColGrid>

                          <FlatTwoColGrid>
                            <InlineDateRow>
                              <FlatSelect
                                aria-label="부임 기원"
                                value={rowItem.startEra}
                                onChange={(changeEvent) => {
                                  const nextEra = changeEvent.target.value as
                                    | 'AD'
                                    | 'BC'
                                  setCommanderRows((prev) =>
                                    prev.map((item, idx) =>
                                      idx === rowIndex
                                        ? { ...item, startEra: nextEra }
                                        : item,
                                    ),
                                  )
                                }}
                                style={{ width: 68 }}
                              >
                                <option value="AD">서기</option>
                                <option value="BC">BC</option>
                              </FlatSelect>
                              <FlatInput
                                type="number"
                                min={1}
                                placeholder="부임 연도 *"
                                value={rowItem.startYear}
                                onChange={(changeEvent) => {
                                  const nextYear = changeEvent.target.value
                                  setCommanderRows((prev) =>
                                    prev.map((item, idx) =>
                                      idx === rowIndex
                                        ? { ...item, startYear: nextYear }
                                        : item,
                                    ),
                                  )
                                }}
                                style={{ flex: '1 1 92px' }}
                              />
                              <FlatInput
                                type="number"
                                min={1}
                                max={12}
                                placeholder="월"
                                value={rowItem.startMonth}
                                onChange={(changeEvent) => {
                                  const nextMonth = changeEvent.target.value
                                  setCommanderRows((prev) =>
                                    prev.map((item, idx) =>
                                      idx === rowIndex
                                        ? { ...item, startMonth: nextMonth }
                                        : item,
                                    ),
                                  )
                                }}
                                style={{ width: 58 }}
                              />
                              <FlatInput
                                type="number"
                                min={1}
                                max={31}
                                placeholder="일"
                                value={rowItem.startDay}
                                onChange={(changeEvent) => {
                                  const nextDay = changeEvent.target.value
                                  setCommanderRows((prev) =>
                                    prev.map((item, idx) =>
                                      idx === rowIndex
                                        ? { ...item, startDay: nextDay }
                                        : item,
                                    ),
                                  )
                                }}
                                style={{ width: 58 }}
                              />
                            </InlineDateRow>

                            <InlineDateRow>
                              <FlatSelect
                                aria-label="이임 기원"
                                value={rowItem.endEra}
                                onChange={(changeEvent) => {
                                  const nextEra = changeEvent.target.value as
                                    | 'AD'
                                    | 'BC'
                                  setCommanderRows((prev) =>
                                    prev.map((item, idx) =>
                                      idx === rowIndex
                                        ? { ...item, endEra: nextEra }
                                        : item,
                                    ),
                                  )
                                }}
                                style={{ width: 68 }}
                              >
                                <option value="AD">서기</option>
                                <option value="BC">BC</option>
                              </FlatSelect>
                              <FlatInput
                                type="number"
                                min={1}
                                placeholder="이임 연도(선택)"
                                value={rowItem.endYear}
                                onChange={(changeEvent) => {
                                  const nextYear = changeEvent.target.value
                                  setCommanderRows((prev) =>
                                    prev.map((item, idx) =>
                                      idx === rowIndex
                                        ? { ...item, endYear: nextYear }
                                        : item,
                                    ),
                                  )
                                }}
                                style={{ flex: '1 1 92px' }}
                              />
                              <FlatInput
                                type="number"
                                min={1}
                                max={12}
                                placeholder="월"
                                value={rowItem.endMonth}
                                onChange={(changeEvent) => {
                                  const nextMonth = changeEvent.target.value
                                  setCommanderRows((prev) =>
                                    prev.map((item, idx) =>
                                      idx === rowIndex
                                        ? { ...item, endMonth: nextMonth }
                                        : item,
                                    ),
                                  )
                                }}
                                style={{ width: 58 }}
                              />
                              <FlatInput
                                type="number"
                                min={1}
                                max={31}
                                placeholder="일"
                                value={rowItem.endDay}
                                onChange={(changeEvent) => {
                                  const nextDay = changeEvent.target.value
                                  setCommanderRows((prev) =>
                                    prev.map((item, idx) =>
                                      idx === rowIndex
                                        ? { ...item, endDay: nextDay }
                                        : item,
                                    ),
                                  )
                                }}
                                style={{ width: 58 }}
                              />
                            </InlineDateRow>
                          </FlatTwoColGrid>
                        </LinkedRecordRow>
                      ))}
                      <OutlineAddBtn
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setCommanderPersonModalOpen(true)
                        }}
                      >
                        <FiPlus size={14} />
                        지휘관 인물 추가 (생성 시 자동 임명)
                      </OutlineAddBtn>
                    </>
                  )}
                </FlatFieldControl>
              </FlatFormRow>

              <FlatFormRow>
                <FlatFormLabel>주둔지 · 본부</FlatFormLabel>
                <FlatFieldControl>
                  <PlaceSelect
                    countryId={countryId || defaultCountryId || undefined}
                    disabled={!hasCountry}
                    value={garrisonPlace}
                    onChange={(placeVal) => setGarrisonPlace(placeVal)}
                  />
                  <FlatHint>
                    소속 국가 선택 후 본부 소재지·주둔지를 입력합니다 (예: 베를린
                    벤들러블로크, 츠카 Zossen, 도쿄 미야케자카 등 자유 입력 가능).
                  </FlatHint>
                </FlatFieldControl>
              </FlatFormRow>

              <FlatFormRow>
                <FlatFormLabel>별칭 · 표어</FlatFormLabel>
                <FlatFieldControl>
                  <FlatTwoColGrid>
                    <FlatInput
                      type="text"
                      aria-label="별명·통칭"
                      placeholder="별칭·통칭 (예: 맹호부대, 불사조 사단)"
                      value={nickname}
                      onChange={(changeEvent) =>
                        setNickname(changeEvent.target.value)
                      }
                    />
                    <FlatInput
                      type="text"
                      aria-label="부대 표어"
                      placeholder="부대 표어·모토 (예: 필승, 충성)"
                      value={motto}
                      onChange={(changeEvent) =>
                        setMotto(changeEvent.target.value)
                      }
                    />
                  </FlatTwoColGrid>
                </FlatFieldControl>
              </FlatFormRow>

              <FlatFormRow>
                <FlatFormLabel>병력 규모</FlatFormLabel>
                <FlatFieldControl>
                  <FlatInput
                    type="text"
                    placeholder="예: 약 10,000명 / 3개 군단 9개 사단"
                    value={strength}
                    onChange={(changeEvent) =>
                      setStrength(changeEvent.target.value)
                    }
                  />
                </FlatFieldControl>
              </FlatFormRow>

              <FlatFormRow>
                <FlatFormLabel>주요 임무</FlatFormLabel>
                <FlatFieldControl>
                  <FlatTextarea
                    rows={2}
                    placeholder="예: 국방군 작전 총괄 지휘, 기동 타격, 해상 호위 등"
                    value={primaryMission}
                    onChange={(changeEvent) =>
                      setPrimaryMission(changeEvent.target.value)
                    }
                  />
                </FlatFieldControl>
              </FlatFormRow>

              <FlatFormRow>
                <FlatFormLabel>관할 · 작전구역</FlatFormLabel>
                <FlatFieldControl>
                  <FlatTextarea
                    rows={2}
                    placeholder="예: 서부·북아프리카·발칸 전구, 동부전선 중부 작전구역 등"
                    value={jurisdiction}
                    onChange={(changeEvent) =>
                      setJurisdiction(changeEvent.target.value)
                    }
                  />
                </FlatFieldControl>
              </FlatFormRow>
            </FlatFormSection>

            {/* 3. 전신 · 후신 계보 */}
            <FlatFormSection
              data-form-section="lineage"
              onFocusCapture={() => setActiveSection('lineage')}
            >
              <FlatSectionHeader>
                <FlatSectionTitle>
                  전신 · 후신 계보 (부처 → 사령부 포함)
                </FlatSectionTitle>
                <FlatSectionHint>
                  개칭 · 분리 · 통합 · 부처 이관 ({totalLineageCount}건)
                </FlatSectionHint>
              </FlatSectionHeader>

              <FlatFormRow>
                <FlatFormLabel>계보 연결</FlatFormLabel>
                <FlatFieldControl>
                  {isEdit &&
                    (predecessors.length > 0 || successors.length > 0) && (
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
                        ? ` · ${draftItem.era === 'BC' ? 'BC ' : ''}${draftItem.year}년${draftItem.month ? ` ${draftItem.month}월` : ''}`
                        : ''
                      return (
                        <LinkedRecordRow key={draftItem.localKey}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 10,
                            }}
                          >
                            <div style={{ fontSize: 13 }}>
                              {draftItem.direction === 'SUCCESSOR_UNIT' ? (
                                <>
                                  <span style={{ opacity: 0.72 }}>
                                    신규 부대 →{' '}
                                  </span>
                                  <strong>{draftItem.targetLabel}</strong>{' '}
                                  <span style={{ opacity: 0.72 }}>
                                    ({kindLabel}
                                    {timeLabel})
                                  </span>
                                </>
                              ) : (
                                <>
                                  <strong>{draftItem.targetLabel}</strong>{' '}
                                  <span style={{ opacity: 0.72 }}>
                                    → 신규 부대 ({kindLabel}
                                    {timeLabel})
                                  </span>
                                </>
                              )}
                              {draftItem.note && (
                                <div
                                  style={{
                                    fontSize: 12,
                                    opacity: 0.7,
                                    marginTop: 2,
                                  }}
                                >
                                  {draftItem.note}
                                </div>
                              )}
                            </div>
                            <InlineIconBtn
                              type="button"
                              $danger
                              onClick={() =>
                                setPendingTransitions((prev) =>
                                  prev.filter(
                                    (item) =>
                                      item.localKey !== draftItem.localKey,
                                  ),
                                )
                              }
                            >
                              <FiTrash2 size={13} />
                            </InlineIconBtn>
                          </div>
                        </LinkedRecordRow>
                      )
                    })}

                  <LinkedRecordRow>
                    <FlatTwoColGrid>
                      <FlatSelect
                        aria-label="계보 연결 방향"
                        value={newTransitionDirection}
                        onChange={(changeEvent) => {
                          setNewTransitionDirection(
                            changeEvent.target.value as TransitionDirection,
                          )
                          setNewTransitionTargetId('')
                        }}
                      >
                        <option value="PREDECESSOR_DEPARTMENT">
                          전신 행정부처 → 이 사령부·부대 (예: 전쟁성 → OKW)
                        </option>
                        <option value="PREDECESSOR_UNIT">
                          전신 군부대 → 이 부대
                        </option>
                        <option value="SUCCESSOR_UNIT">
                          이 부대 → 후신 군부대
                        </option>
                      </FlatSelect>

                      <FlatSelect
                        aria-label="변동 유형"
                        value={newTransitionKind}
                        onChange={(changeEvent) =>
                          setNewTransitionKind(
                            changeEvent.target
                              .value as MilitaryUnitTransitionKind,
                          )
                        }
                      >
                        {TRANSITION_KIND_OPTIONS.map((optItem) => (
                          <option key={optItem.value} value={optItem.value}>
                            {optItem.label}
                          </option>
                        ))}
                      </FlatSelect>
                    </FlatTwoColGrid>

                    <FlatTwoColGrid>
                      <SearchableSelect
                        options={lineageTargetSelectOptions}
                        value={newTransitionTargetId}
                        onChange={(nextTargetId) =>
                          setNewTransitionTargetId(nextTargetId)
                        }
                        placeholder={
                          newTransitionDirection === 'PREDECESSOR_DEPARTMENT'
                            ? '전신 행정부처 검색 · 선택…'
                            : '대상 군부대 검색 · 선택…'
                        }
                        searchPlaceholder="기관·부대명, 약칭, 시대명 검색…"
                        ariaLabel="계보 연결 대상 기관·부대"
                        emptyMessage="선택 가능한 대상이 없습니다"
                      />

                      <InlineDateRow>
                        <FlatSelect
                          aria-label="개편 기원"
                          value={newTransitionEra}
                          onChange={(changeEvent) =>
                            setNewTransitionEra(
                              changeEvent.target.value as 'AD' | 'BC',
                            )
                          }
                          style={{ width: 72 }}
                        >
                          <option value="AD">서기</option>
                          <option value="BC">BC</option>
                        </FlatSelect>
                        <FlatInput
                          type="number"
                          min={1}
                          placeholder="연도 (예: 1938)"
                          value={newTransitionYear}
                          onChange={(changeEvent) =>
                            setNewTransitionYear(changeEvent.target.value)
                          }
                          style={{ flex: '1 1 104px' }}
                        />
                        <FlatInput
                          type="number"
                          min={1}
                          max={12}
                          placeholder="월"
                          value={newTransitionMonth}
                          onChange={(changeEvent) =>
                            setNewTransitionMonth(changeEvent.target.value)
                          }
                          style={{ width: 68 }}
                        />
                      </InlineDateRow>
                    </FlatTwoColGrid>

                    <InlineDateRow>
                      <FlatInput
                        type="text"
                        placeholder="비고 (선택 — 예: 블롬베르크-프리치 사건으로 전쟁성 폐지 후 총통 직할 최고사령부로 개편)"
                        value={newTransitionNote}
                        onChange={(changeEvent) =>
                          setNewTransitionNote(changeEvent.target.value)
                        }
                        style={{ flex: '1 1 240px' }}
                      />
                      <OutlineAddBtn
                        type="button"
                        disabled={!newTransitionTargetId || transitionBusy}
                        onClick={() => void handleAddTransition()}
                      >
                        <FiPlus size={14} />
                        {transitionBusy
                          ? '연결 중…'
                          : isEdit
                            ? '계보 연결 추가'
                            : '계보 목록에 추가'}
                      </OutlineAddBtn>
                    </InlineDateRow>
                  </LinkedRecordRow>
                </FlatFieldControl>
              </FlatFormRow>
            </FlatFormSection>

            {/* 4. 주요 전투 · 표창 · 상세 설명 */}
            <FlatFormSection
              data-form-section="description"
              onFocusCapture={() => setActiveSection('description')}
            >
              <FlatSectionHeader>
                <FlatSectionTitle>
                  주요 전투 · 표창 · 상세 설명
                </FlatSectionTitle>
                <FlatSectionHint>선택 입력</FlatSectionHint>
              </FlatSectionHeader>

              <FlatFormRow>
                <FlatFormLabel>주요 전투 · 작전</FlatFormLabel>
                <FlatFieldControl>
                  <FlatTextarea
                    rows={3}
                    placeholder="예: 바르바로사 작전, 타이푼 작전, 인천상륙작전 등"
                    value={notableBattles}
                    onChange={(changeEvent) =>
                      setNotableBattles(changeEvent.target.value)
                    }
                  />
                </FlatFieldControl>
              </FlatFormRow>

              <FlatFormRow>
                <FlatFormLabel>훈장 · 표창</FlatFormLabel>
                <FlatFieldControl>
                  <FlatTextarea
                    rows={2}
                    placeholder="예: 대통령부대표창(2020), 국방부장관표창(2018)"
                    value={honors}
                    onChange={(changeEvent) =>
                      setHonors(changeEvent.target.value)
                    }
                  />
                </FlatFieldControl>
              </FlatFormRow>

              <FlatFormRow>
                <FlatFormLabel>부대 상세 설명</FlatFormLabel>
                <FlatFieldControl>
                  <FlatTextarea
                    rows={5}
                    placeholder="부대·사령부의 창설 배경, 지휘 구조, 작전사적 의의 등을 입력하세요."
                    value={description}
                    onChange={(changeEvent) =>
                      setDescription(changeEvent.target.value)
                    }
                  />
                </FlatFieldControl>
              </FlatFormRow>
            </FlatFormSection>
          </FlatFormStack>
        </form>
      </SidePanel>

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
            setCountryId('')
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
          setCountryModalOpen(false)
        }}
        modernCountries={modernCountries}
        historicalCountries={historicalCountries}
        selectedIds={[historicalCountryId || countryId].filter(Boolean)}
      />

      <DatePickerModal
        isOpen={establishedDateModalOpen}
        onClose={() => setEstablishedDateModalOpen(false)}
        onSelect={(selectedIso) => {
          const parsedParts = parseIsoPartsFallback(selectedIso)
          if (parsedParts.year) {
            setEstablishedEra(parsedParts.era)
            setEstablishedYear(parsedParts.year)
            setEstablishedMonth(parsedParts.month)
            setEstablishedDay(parsedParts.day)
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
        onSelect={(selectedIso) => {
          const parsedParts = parseIsoPartsFallback(selectedIso)
          if (parsedParts.year) {
            setDisbandedEra(parsedParts.era)
            setDisbandedYear(parsedParts.year)
            setDisbandedMonth(parsedParts.month)
            setDisbandedDay(parsedParts.day)
            setIsActive(false)
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
