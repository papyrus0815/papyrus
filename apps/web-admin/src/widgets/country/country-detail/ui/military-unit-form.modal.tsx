/**
 * 군부대 생성/수정 — 공용 SidePanel + `@/shared/ui/register-form-layout`
 * (FieldRow / FormRows / SelectBtn / DateFieldBtn — 조약·인물 등록과 동일 패턴)
 */
import React, { useEffect, useState } from 'react'

import {
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiPlus,
  FiTrash2,
  FiUser,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import { glassCardMixin } from '@/shared/styles/mixins'
import { OVERLAY_STYLES, Z_INDEX } from '@/shared/styles/z-index'
import {
  type PlaceResult,
  PlaceSelect,
} from '@/shared/ui/place-autocomplete/place-autocomplete'

import {
  administrationDepartmentApi,
  type AdministrationDepartment,
} from '@/shared/api/administration-department'
import type { CountryResponseDto } from '@/shared/api/countries'
import { getAllCountries } from '@/shared/api/countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import type {
  CreateMilitaryUnitInput,
  MilitaryUnit,
  MilitaryUnitLineageDto,
  MilitaryUnitTransitionKind,
  MilitaryUnitType,
} from '@/shared/api/military-unit'
import { militaryUnitApi } from '@/shared/api/military-unit'
import { personCareerApi } from '@/shared/api/person-career'
import { getAllPersons, type PersonResponseDto } from '@/shared/api/persons'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { CountryPicker } from '@/shared/ui/country-picker'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import {
  DateFieldBtn,
  FieldControl,
  FieldHint,
  FieldLabel,
  FieldRow,
  FormRows,
  FormSectionInner,
  Input,
  Required,
  SelectBtn,
  Textarea,
} from '@/shared/ui/register-form-layout'
import {
  SidePanelFormSectionCard,
  SidePanelFormTab,
  SidePanelFormTabBar,
  SidePanelFormTabBarWrap,
} from '@/shared/ui/side-panel-form'
import { SidePanel } from '@/shared/ui/side-panel'
import { notify } from '@/shared/ui/toast'

const MAIN = '#6366f1'
const MAIN_HOVER = '#4f46e5'

/** 조약/행정부 폼과 동일: 넓은 필드(지휘관 패널 등) */
const FullWidthFieldControl = styled(FieldControl)`
  max-width: 100% !important;
  width: 100%;
`

const SelectClearRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 380px;
`

const ClearFieldBtn = styled.button`
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
  &:hover {
    border-color: #6366f1;
    color: #6366f1;
  }
`

const CommanderMiniGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`

const CommanderFormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const CommanderMicroLabel = styled.span`
  display: block;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/** 탭 라벨 옆 필수 미입력 표시(조약 폼 Required 톤) */
const TabRequiredDot = styled.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #dc2626;
  flex-shrink: 0;
`

const TextGhostBtn = styled.button<{ $danger?: boolean }>`
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: ${({ $danger, theme }) =>
    $danger ? '#dc2626' : theme.colors.text.secondary};
  cursor: pointer;
  transition: background 0.15s ease;
  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ $danger, theme }) =>
      $danger ? '#b91c1c' : theme.colors.text.primary};
  }
`

/** 국가 등록 모달(CountryFormModal)과 동일: 원형 96px 썸네일 */
const InsigniaThumbnailRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`

const InsigniaThumbnailCircle = styled.label<{ $hasImage: boolean }>`
  width: 96px;
  height: 96px;
  min-width: 96px;
  min-height: 96px;
  max-width: 96px;
  max-height: 96px;
  border-radius: 50%;
  overflow: hidden;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.06)'
      : 'linear-gradient(145deg, #f8fafc 0%, #f1f5f9 100%)'};
  border: 2px dashed
    ${({ theme, $hasImage }) =>
      $hasImage
        ? theme.colors.border.default
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.2)'
          : '#cbd5e1'};
  border-style: ${({ $hasImage }) => ($hasImage ? 'solid' : 'dashed')};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    border-color 0.2s,
    background 0.2s,
    box-shadow 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

  &:hover {
    border-color: #6366f1;
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99,102,241,0.1)'
        : 'linear-gradient(145deg, #eef2ff 0%, #e0e7ff 100%)'};
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  svg {
    color: ${({ theme }) => theme.colors.text.secondary};
    width: 36px;
    height: 36px;
  }
`

const InsigniaThumbnailHint = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.4;
`

const UNIT_TYPES: { value: MilitaryUnitType; label: string }[] = [
  { value: 'SUPREME_COMMAND', label: '최고사령부 (OKW · STAVKA · 대본영 등)' },
  { value: 'GENERAL_STAFF', label: '참모본부 · 합동참모본부' },
  { value: 'SERVICE_HQ', label: '각군 총사령부 (OKH · OKM · OKL · 육본 등)' },
  { value: 'THEATER', label: '전구·총사령부' },
  { value: 'ARMY_GROUP', label: '집단군' },
  { value: 'FRONT', label: '전선군·방면군' },
  { value: 'MILITARY_DISTRICT', label: '군관구' },
  { value: 'FIELD_ARMY', label: '야전군' },
  { value: 'CORPS', label: '군단' },
  { value: 'DIVISION', label: '사단' },
  { value: 'BRIGADE', label: '여단' },
  { value: 'REGIMENT', label: '연대' },
  { value: 'BATTALION', label: '대대' },
  { value: 'COMPANY', label: '중대' },
  { value: 'PLATOON', label: '소대' },
  { value: 'SQUAD', label: '분대' },
  { value: 'FLEET', label: '함대' },
  { value: 'AIR_FLEET', label: '항공함대' },
  { value: 'AIR_CORPS', label: '항공군단' },
  { value: 'SQUADRON', label: '전대' },
  { value: 'WING', label: '비행단' },
  { value: 'SPECIAL_FORCES', label: '특수부대' },
  { value: 'DETACHMENT', label: '파견대' },
  { value: 'OTHER', label: '기타' },
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

const MILITARY_BRANCHES = [
  { value: 'ARMY', label: '육군' },
  { value: 'NAVY', label: '해군' },
  { value: 'AIR_FORCE', label: '공군' },
  { value: 'MARINE_CORPS', label: '해병대' },
  { value: 'COAST_GUARD', label: '해안경비대' },
  { value: 'SPACE_FORCE', label: '우주군' },
  { value: 'JOINT', label: '합동' },
  { value: 'OTHER', label: '기타' },
]

/**
 * 소속 국가는 현대(countryId)·역사(historicalCountryId) 듀얼 FK다.
 * 스키마·DTO 모두 두 축을 동시에 담을 수 있지만(부처와 동일 규약), 이 폼은 부처 폼과 같이
 * **상호배타**로 다룬다 — 고른 축만 채우고 반대편은 비운다. 표시·도출은 역사 우선.
 * 독일 제국 제1군처럼 과거 정치체 소속 부대는 역사 축에 저장된다.
 */

type TabType = 'basic' | 'military' | 'lineage' | 'description'

export type CommanderDraftRow = {
  personId: string
  personName: string
  rank: string
  role: string
  termNumber: string
  startDate: string
  endDate: string
  isCurrent: boolean
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
  const playClickSound = useClickSound()
  const isEdit = Boolean(editingUnitId)

  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('basic')
  const [modernCountries, setModernCountries] = useState<CountryResponseDto[]>(
    [],
  )
  const [historicalCountries, setHistoricalCountries] = useState<
    HistoricalCountryResponseDto[]
  >([])
  const [allUnits, setAllUnits] = useState<MilitaryUnit[]>([])
  const [allPersons, setAllPersons] = useState<PersonResponseDto[]>([])
  const [personsLoading, setPersonsLoading] = useState(false)

  // Modals
  const [countryModalOpen, setCountryModalOpen] = useState(false)
  const [unitTypeModalOpen, setUnitTypeModalOpen] = useState(false)
  const [branchModalOpen, setBranchModalOpen] = useState(false)
  const [parentUnitModalOpen, setParentUnitModalOpen] = useState(false)
  const [establishedDateModalOpen, setEstablishedDateModalOpen] =
    useState(false)
  const [disbandedDateModalOpen, setDisbandedDateModalOpen] = useState(false)
  const [commanderPersonModalOpen, setCommanderPersonModalOpen] =
    useState(false)

  // Form fields - 기본 정보
  const [name, setName] = useState('')
  const [abbreviation, setAbbreviation] = useState('')
  const [nameLocal, setNameLocal] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [unitType, setUnitType] = useState<MilitaryUnitType | ''>('')
  const [unitTypeName, setUnitTypeName] = useState('')
  const [branch, setBranch] = useState('')
  const [branchName, setBranchName] = useState('')
  const [countryId, setCountryId] = useState('')
  const [historicalCountryId, setHistoricalCountryId] = useState('')
  const [countryName, setCountryName] = useState('')
  const [countryFlagEmoji, setCountryFlagEmoji] = useState('')
  const [countryEnglishName, setCountryEnglishName] = useState('')
  const [parentUnitId, setParentUnitId] = useState('')
  const [parentUnitName, setParentUnitName] = useState('')
  const [administrationDepartmentId, setAdministrationDepartmentId] =
    useState('')
  const [adminDepartments, setAdminDepartments] = useState<
    AdministrationDepartment[]
  >([])
  const [isActive, setIsActive] = useState(true)
  const [establishedEra, setEstablishedEra] = useState<'AD' | 'BC'>('AD')
  const [establishedYear, setEstablishedYear] = useState('')
  const [establishedDate, setEstablishedDate] = useState('')
  const [disbandedEra, setDisbandedEra] = useState<'AD' | 'BC'>('AD')
  const [disbandedYear, setDisbandedYear] = useState('')
  const [disbandedDate, setDisbandedDate] = useState('')
  const [description, setDescription] = useState('')

  // Form fields - 추가 군정보
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
  const [commanderTouched, setCommanderTouched] = useState(false)
  const [existingTenureCount, setExistingTenureCount] = useState(0)

  // Form fields - 전신·후신 계보
  const [predecessors, setPredecessors] = useState<MilitaryUnitLineageDto[]>([])
  const [successors, setSuccessors] = useState<MilitaryUnitLineageDto[]>([])
  const [newTransitionDirection, setNewTransitionDirection] = useState<
    'PREDECESSOR_DEPARTMENT' | 'PREDECESSOR_UNIT' | 'SUCCESSOR_UNIT'
  >('PREDECESSOR_DEPARTMENT')
  const [newTransitionTargetId, setNewTransitionTargetId] = useState('')
  const [newTransitionKind, setNewTransitionKind] =
    useState<MilitaryUnitTransitionKind>('REORGANIZE')
  const [newTransitionEra, setNewTransitionEra] = useState<'AD' | 'BC'>('AD')
  const [newTransitionYear, setNewTransitionYear] = useState('')
  const [newTransitionNote, setNewTransitionNote] = useState('')
  const [transitionBusy, setTransitionBusy] = useState(false)

  useEffect(() => {
    loadCountries()
    loadAllUnits()
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
    void loadMilitaryUnit(editingUnitId)
  }, [isOpen, editingUnitId])

  /** 신규: 모달을 열 때 폼·기본 국가·중앙부처·상위 부대 연결 */
  useEffect(() => {
    if (!isOpen || editingUnitId) return
    setName('')
    setAbbreviation('')
    setNameLocal('')
    setNameEn('')
    setUnitType('')
    setUnitTypeName('')
    const resolvedBranch = defaultBranch ?? ''
    setBranch(resolvedBranch)
    setBranchName(
      resolvedBranch
        ? MILITARY_BRANCHES.find((item) => item.value === resolvedBranch)
            ?.label || ''
        : '',
    )
    setParentUnitId(defaultParentUnitId ?? '')
    setParentUnitName('')
    setIsActive(true)
    setEstablishedEra('AD')
    setEstablishedYear('')
    setEstablishedDate('')
    setDisbandedEra('AD')
    setDisbandedYear('')
    setDisbandedDate('')
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
    setCommanderTouched(false)
    setExistingTenureCount(0)
    setPredecessors([])
    setSuccessors([])
    setNewTransitionDirection('PREDECESSOR_DEPARTMENT')
    setNewTransitionTargetId('')
    setNewTransitionKind('REORGANIZE')
    setNewTransitionEra('AD')
    setNewTransitionYear('')
    setNewTransitionNote('')
    setActiveTab('basic')
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
    const matchedParent = allUnits.find((unit) => unit.id === parentUnitId)
    if (!matchedParent) return
    setParentUnitName(matchedParent.name)
    const parentExtended = matchedParent as MilitaryUnit & {
      branch?: string | null
      administrationDepartmentId?: string | null
      administrationDepartment?: { id: string; name: string } | null
    }
    if (!branch && parentExtended.branch) {
      setBranch(parentExtended.branch)
      setBranchName(
        MILITARY_BRANCHES.find((item) => item.value === parentExtended.branch)
          ?.label || '',
      )
    }
    const parentDeptId =
      parentExtended.administrationDepartmentId ??
      parentExtended.administrationDepartment?.id ??
      ''
    if (!administrationDepartmentId && parentDeptId) {
      setAdministrationDepartmentId(parentDeptId)
    }
    if (matchedParent.historicalCountryId) {
      setHistoricalCountryId(matchedParent.historicalCountryId)
      setCountryId(matchedParent.countryId ?? '')
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
    // 부처 목록도 선택된 축을 따라간다 — 역사 국가 소속 부대는 그 역사 국가의 부처만 후보
    if (!countryId && !historicalCountryId) {
      setAdminDepartments([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const list = historicalCountryId
          ? await administrationDepartmentApi.getByHistoricalCountryId(
              historicalCountryId,
            )
          : await administrationDepartmentApi.getByCountryId(countryId)
        if (!cancelled) {
          const validList = Array.isArray(list) ? list : []
          setAdminDepartments(validList)
          if (administrationDepartmentId) {
            const matchedDept = validList.find(
              (dept) => dept.id === administrationDepartmentId,
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
        if (!cancelled) setAdminDepartments([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [countryId, historicalCountryId, administrationDepartmentId])

  useEffect(() => {
    if (!countryId && !historicalCountryId) setGarrisonPlace(null)
  }, [countryId, historicalCountryId])

  const loadCountries = async () => {
    try {
      // 두 축을 모두 로드 — 부대는 현대·역사 국가 어느 쪽에도 소속될 수 있다
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
      setUnitTypeName(
        unit.unitType
          ? UNIT_TYPES.find((typeItem) => typeItem.value === unit.unitType)
              ?.label || ''
          : '',
      )
      setCountryId(unit.countryId || '')
      const hydratedHistoricalCountryId = unit.historicalCountryId || ''
      setHistoricalCountryId(hydratedHistoricalCountryId)
      // 표시는 역사 우선 — 두 축이 다 채워진 부대는 역사 국가를 정체성으로 본다
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
      if (unit.parentUnit) {
        setParentUnitName(unit.parentUnit.name)
      } else {
        setParentUnitName('')
      }
      const admId = (unit as { administrationDepartmentId?: string | null })
        .administrationDepartmentId
      setAdministrationDepartmentId(admId ?? '')
      setIsActive(unit.isActive ?? true)
      setEstablishedEra(unit.established?.era === 'BC' ? 'BC' : 'AD')
      setEstablishedYear(
        unit.established?.year ? String(unit.established.year) : '',
      )
      setEstablishedDate(unit.establishedDate ? unit.establishedDate.slice(0, 10) : '')
      setDisbandedEra(unit.disbanded?.era === 'BC' ? 'BC' : 'AD')
      setDisbandedYear(unit.disbanded?.year ? String(unit.disbanded.year) : '')
      setDisbandedDate(unit.disbandedDate ? unit.disbandedDate.slice(0, 10) : '')
      setDescription(unit.description || '')
      setPredecessors(Array.isArray(unit.predecessors) ? unit.predecessors : [])
      setSuccessors(Array.isArray(unit.successors) ? unit.successors : [])

      const unitExtended = unit as typeof unit & {
        branch?: string | null
        nickname?: string | null
        motto?: string | null
        garrison?: string | null
        strength?: string | null
        insigniaUrl?: string | null
        primaryMission?: string | null
        jurisdiction?: string | null
        notableBattles?: string | null
        honors?: string | null
      }
      if (unitExtended.branch) {
        setBranch(unitExtended.branch)
        setBranchName(
          MILITARY_BRANCHES.find(
            (branchOpt) => branchOpt.value === unitExtended.branch,
          )?.label || '',
        )
      } else {
        setBranch('')
        setBranchName('')
      }
      setNickname(unitExtended.nickname || '')
      setMotto(unitExtended.motto || '')
      setGarrisonPlace(
        unitExtended.garrison
          ? {
              displayName: unitExtended.garrison,
              shortName: unitExtended.garrison,
              isManual: true,
            }
          : null,
      )
      setStrength(unitExtended.strength || '')
      setInsigniaUrl(unitExtended.insigniaUrl || '')
      setPrimaryMission(unitExtended.primaryMission || '')
      setJurisdiction(unitExtended.jurisdiction || '')
      setNotableBattles(unitExtended.notableBattles || '')
      setHonors(unitExtended.honors || '')

      const existingCommanders = Array.isArray(unit.commanders)
        ? unit.commanders
        : []
      const unifiedCount = existingCommanders.filter((cmdItem) =>
        Boolean(cmdItem.tenureId),
      ).length
      setExistingTenureCount(
        Math.max(unifiedCount, Array.isArray(unit.tenures) ? unit.tenures.length : 0),
      )
      const legacyCommanders = existingCommanders.filter(
        (cmdItem) => !cmdItem.tenureId,
      )
      setCommanderTouched(false)
      setCommanderRows(
        legacyCommanders.map((cmdItem) => {
          const personRecord = cmdItem.person
          const resolvedPersonName = personRecord
            ? getPersonDisplayName({
                name: personRecord.name ?? '',
                surname: personRecord.surname ?? undefined,
              }) || personRecord.name
            : cmdItem.personId
          return {
            personId: cmdItem.personId,
            personName: resolvedPersonName,
            rank: cmdItem.rank ?? '',
            role: cmdItem.role ?? '',
            termNumber:
              cmdItem.termNumber != null ? String(cmdItem.termNumber) : '',
            startDate: cmdItem.startDate ? cmdItem.startDate.slice(0, 10) : '',
            endDate: cmdItem.endDate ? cmdItem.endDate.slice(0, 10) : '',
            isCurrent: Boolean(cmdItem.isCurrent),
          }
        }),
      )
    } catch {
      notify.error('군부대 정보를 불러오는데 실패했습니다.')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleAddTransition = async () => {
    if (!editingUnitId || !newTransitionTargetId || transitionBusy) return
    const parsedYear = Number.parseInt(newTransitionYear.trim(), 10)
    const transitionPayload = {
      kind: newTransitionKind,
      era: Number.isFinite(parsedYear) ? newTransitionEra : null,
      year: Number.isFinite(parsedYear) && parsedYear > 0 ? parsedYear : null,
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
      const refreshed = await militaryUnitApi.getById(editingUnitId)
      setPredecessors(
        Array.isArray(refreshed.predecessors) ? refreshed.predecessors : [],
      )
      setSuccessors(
        Array.isArray(refreshed.successors) ? refreshed.successors : [],
      )
      setNewTransitionTargetId('')
      setNewTransitionYear('')
      setNewTransitionNote('')
      notify.success('전신·후신 계보가 연결되었습니다.')
      onSaved?.()
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : '계보 연결에 실패했습니다.',
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
      const refreshed = await militaryUnitApi.getById(editingUnitId)
      setPredecessors(
        Array.isArray(refreshed.predecessors) ? refreshed.predecessors : [],
      )
      setSuccessors(
        Array.isArray(refreshed.successors) ? refreshed.successors : [],
      )
      notify.success('계보 연결이 해제되었습니다.')
      onSaved?.()
    } catch {
      notify.error('계보 연결 해제에 실패했습니다.')
    } finally {
      setTransitionBusy(false)
    }
  }

  const buildDatePayload = (
    eraVal: 'AD' | 'BC',
    yearStr: string,
    isoStr: string,
  ) => {
    const trimmedIso = isoStr.trim()
    if (trimmedIso) {
      return {
        date: trimmedIso,
        info: undefined,
      }
    }
    const parsedYear = Number.parseInt(yearStr.trim(), 10)
    if (Number.isFinite(parsedYear) && parsedYear > 0) {
      return {
        date: null,
        info: {
          era: eraVal,
          year: parsedYear,
          month: null,
          day: null,
          precision: 'YEAR',
        },
      }
    }
    return {
      date: null,
      info: null,
    }
  }

  const handleSubmit = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault()

    if (!name.trim()) {
      notify.error('군부대명을 입력해주세요.')
      setActiveTab('basic')
      return
    }

    const validCommanders = commanderRows
      .filter((row) => row.personId.trim().length > 0)
      .map((row) => {
        const parsedTerm = Number.parseInt(row.termNumber.trim(), 10)
        return {
          personId: row.personId.trim(),
          rank: row.rank.trim() || null,
          role: row.role.trim() || null,
          termNumber: Number.isFinite(parsedTerm) ? parsedTerm : null,
          startDate: row.startDate.trim() || null,
          endDate: row.endDate.trim() || null,
          isCurrent: row.isCurrent,
        }
      })

    const establishedPayload = buildDatePayload(
      establishedEra,
      establishedYear,
      establishedDate,
    )
    const disbandedPayload = isActive
      ? { date: null, info: null }
      : buildDatePayload(disbandedEra, disbandedYear, disbandedDate)

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
      isActive,
      establishedDate: establishedPayload.date,
      ...(establishedPayload.info !== undefined
        ? { establishedInfo: establishedPayload.info }
        : {}),
      disbandedDate: disbandedPayload.date,
      ...(disbandedPayload.info !== undefined
        ? { disbandedInfo: disbandedPayload.info }
        : {}),
      nickname: nickname.trim() || null,
      motto: motto.trim() || null,
      garrison: garrisonPlace?.displayName?.trim() || null,
      strength: strength.trim() || null,
      insigniaUrl: insigniaUrl.trim() || null,
      primaryMission: primaryMission.trim() || null,
      jurisdiction: jurisdiction.trim() || null,
      notableBattles: notableBattles.trim() || null,
      honors: honors.trim() || null,
      description: description.trim() || null,
    }

    try {
      setLoading(true)
      if (isEdit && editingUnitId) {
        await militaryUnitApi.update(editingUnitId, {
          ...baseData,
          ...(commanderTouched ? { commanders: validCommanders } : {}),
        } as CreateMilitaryUnitInput)
        notify.success('군부대가 수정되었습니다.')
      } else {
        const createdUnit = await militaryUnitApi.create(
          baseData as CreateMilitaryUnitInput,
        )
        // 신규 생성 시 함께 입력한 지휘관은 통합 GovernmentPositionTenure로 직결 등록
        for (const cmdRow of validCommanders) {
          const parsedStartYear = cmdRow.startDate
            ? Number.parseInt(cmdRow.startDate.slice(0, 4), 10)
            : Number.NaN
          if (Number.isFinite(parsedStartYear) && parsedStartYear > 0) {
            try {
              await personCareerApi.createTenure({
                personId: cmdRow.personId,
                countryId: countryId || null,
                historicalCountryId: historicalCountryId || null,
                positionType: 'MILITARY_COMMANDER',
                militaryUnitId: createdUnit.id,
                administrationDepartmentId: administrationDepartmentId || null,
                title: cmdRow.role || '사령관',
                rankTitle: cmdRow.rank || null,
                ordinal: cmdRow.termNumber ?? null,
                startDate: cmdRow.startDate,
                endDate: cmdRow.endDate || null,
              })
            } catch {
              // 날짜 파싱 실패 시 부대 생성은 유지
            }
          }
        }
        // 신규 생성 시 계보 연결이 함께 지정되어 있으면 자동 생성
        if (newTransitionTargetId) {
          const parsedTransYear = Number.parseInt(
            newTransitionYear.trim(),
            10,
          )
          try {
            await militaryUnitApi.addTransition(createdUnit.id, {
              kind: newTransitionKind,
              era: Number.isFinite(parsedTransYear) ? newTransitionEra : null,
              year:
                Number.isFinite(parsedTransYear) && parsedTransYear > 0
                  ? parsedTransYear
                  : null,
              note: newTransitionNote.trim() || null,
              ...(newTransitionDirection === 'PREDECESSOR_DEPARTMENT'
                ? { predecessorDepartmentId: newTransitionTargetId }
                : newTransitionDirection === 'PREDECESSOR_UNIT'
                  ? { predecessorUnitId: newTransitionTargetId }
                  : { successorUnitId: newTransitionTargetId }),
            })
          } catch {
            // 계보 연결 실패 시 부대 본체는 유지
          }
        }
        notify.success('군부대가 생성되었습니다.')
      }
      onSaved?.()
      onClose()
    } catch {
      notify.error('군부대 저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const availableParentUnits = allUnits.filter((candidateUnit) => {
    if (candidateUnit.id === editingUnitId) return false
    if (candidateUnit.id === parentUnitId) return true
    if (historicalCountryId) {
      return candidateUnit.historicalCountryId === historicalCountryId
    }
    if (countryId) {
      return (
        candidateUnit.countryId === countryId &&
        !candidateUnit.historicalCountryId
      )
    }
    return true
  })

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return (
          <FormSectionInner>
            <FormRows>
              {!isEdit && (
                <FieldRow>
                  <FieldLabel>최고사령부·본부 빠른 프리셋</FieldLabel>
                  <FullWidthFieldControl>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 6,
                      }}
                    >
                      {HIGH_COMMAND_PRESETS.map((preset) => (
                        <button
                          key={preset.abbreviation}
                          type="button"
                          onClick={() => {
                            playClickSound()
                            setName(preset.name)
                            setAbbreviation(preset.abbreviation)
                            setNameLocal(preset.nameLocal ?? '')
                            setNameEn(preset.nameEn ?? '')
                            setUnitType(preset.unitType)
                            setUnitTypeName(
                              UNIT_TYPES.find(
                                (typeItem) =>
                                  typeItem.value === preset.unitType,
                              )?.label || '',
                            )
                            setBranch(preset.branch)
                            setBranchName(
                              MILITARY_BRANCHES.find(
                                (branchItem) =>
                                  branchItem.value === preset.branch,
                              )?.label || '',
                            )
                          }}
                          style={{
                            padding: '5px 11px',
                            borderRadius: 999,
                            border: '1px solid rgba(99, 102, 241, 0.35)',
                            background: 'rgba(99, 102, 241, 0.08)',
                            color: '#6366f1',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          ⚡ {preset.label}
                        </button>
                      ))}
                    </div>
                    <FieldHint>
                      OKW·OKH·OKM·OKL·STAVKA·대본영·합참 등 군사 최고사령부·참모본부는 행정부처가 아닌 군사 조직 최상위 편제로 등록합니다.
                    </FieldHint>
                  </FullWidthFieldControl>
                </FieldRow>
              )}

              <FieldRow>
                <FieldLabel htmlFor="insignia-upload-basic">
                  부대 마크/휘장
                </FieldLabel>
                <FieldControl>
                  <InsigniaThumbnailRow>
                    <InsigniaThumbnailCircle
                      htmlFor="insignia-upload-basic"
                      $hasImage={!!insigniaUrl}
                    >
                      {insigniaUrl ? (
                        <img
                          src={insigniaUrl}
                          alt="부대 마크 미리보기"
                          onError={(imgEvent) => {
                            imgEvent.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                          />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                      )}
                    </InsigniaThumbnailCircle>
                    {insigniaUrl ? (
                      <TextGhostBtn
                        type="button"
                        $danger
                        onClick={() => {
                          playClickSound()
                          setInsigniaUrl('')
                        }}
                      >
                        제거
                      </TextGhostBtn>
                    ) : null}
                  </InsigniaThumbnailRow>
                  <InsigniaThumbnailHint
                    style={{ marginTop: 8, display: 'block' }}
                  >
                    {insigniaUrl
                      ? '클릭하면 이미지를 변경할 수 있습니다'
                      : '클릭하여 부대 마크·휘장 이미지를 넣어주세요 (선택)'}
                  </InsigniaThumbnailHint>
                  <input
                    id="insignia-upload-basic"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(fileEvent) => {
                      const file = fileEvent.target.files?.[0]
                      if (file) {
                        const url = URL.createObjectURL(file)
                        setInsigniaUrl(url)
                      }
                      fileEvent.target.value = ''
                    }}
                  />
                  <FieldHint>부대의 공식 마크나 휘장 (선택)</FieldHint>
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel htmlFor="military-unit-name">
                  군부대·사령부명 <Required title="필수" />
                </FieldLabel>
                <FieldControl>
                  <Input
                    id="military-unit-name"
                    type="text"
                    placeholder="예: 국방군 최고사령부, 중부집단군, 제1보병사단"
                    value={name}
                    onChange={(changeEvent) =>
                      setName(changeEvent.target.value)
                    }
                    required
                  />
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel htmlFor="military-unit-abbr">약칭 · 부호</FieldLabel>
                <FieldControl>
                  <Input
                    id="military-unit-abbr"
                    type="text"
                    placeholder="예: OKW, OKH, STAVKA, 합참, HG Mitte"
                    value={abbreviation}
                    onChange={(changeEvent) =>
                      setAbbreviation(changeEvent.target.value)
                    }
                  />
                  <FieldHint>
                    트리·사건 지령 보드·배지에 함께 표시될 약칭 (선택)
                  </FieldHint>
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>원어명 · 영문명</FieldLabel>
                <FullWidthFieldControl>
                  <CommanderMiniGrid>
                    <div>
                      <CommanderMicroLabel>원어명 (선택)</CommanderMicroLabel>
                      <Input
                        type="text"
                        placeholder="예: Oberkommando der Wehrmacht"
                        value={nameLocal}
                        onChange={(changeEvent) =>
                          setNameLocal(changeEvent.target.value)
                        }
                      />
                    </div>
                    <div>
                      <CommanderMicroLabel>영문명 (선택)</CommanderMicroLabel>
                      <Input
                        type="text"
                        placeholder="예: Armed Forces High Command"
                        value={nameEn}
                        onChange={(changeEvent) =>
                          setNameEn(changeEvent.target.value)
                        }
                      />
                    </div>
                  </CommanderMiniGrid>
                </FullWidthFieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>
                  소속 국가 <Required title="필수" />
                </FieldLabel>
                <FieldControl>
                  {countryId || historicalCountryId ? (
                    <SidePanelFormSectionCard
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 600,
                            color: 'inherit',
                          }}
                        >
                          {countryFlagEmoji} {countryName}
                        </div>
                        {countryEnglishName ? (
                          <div
                            style={{
                              fontSize: 13,
                              marginTop: 4,
                              opacity: 0.75,
                            }}
                          >
                            {countryEnglishName}
                          </div>
                        ) : null}
                      </div>
                      {!lockCountryAndDepartment ? (
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <TextGhostBtn
                            type="button"
                            onClick={() => {
                              playClickSound()
                              setCountryModalOpen(true)
                            }}
                          >
                            변경
                          </TextGhostBtn>
                          <TextGhostBtn
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
                            제거
                          </TextGhostBtn>
                        </div>
                      ) : null}
                    </SidePanelFormSectionCard>
                  ) : (
                    <SelectBtn
                      type="button"
                      disabled={lockCountryAndDepartment}
                      $hasValue={false}
                      onClick={() => {
                        playClickSound()
                        if (!lockCountryAndDepartment) setCountryModalOpen(true)
                      }}
                    >
                      <span>국가를 선택하세요</span>
                      <FiChevronDown size={18} />
                    </SelectBtn>
                  )}
                  <FieldHint>
                    부대의 정체성을 나타내는 중요한 정보입니다
                  </FieldHint>
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>부대 유형 · 제대</FieldLabel>
                <FieldControl>
                  <SelectClearRow>
                    <SelectBtn
                      type="button"
                      $hasValue={!!unitTypeName}
                      onClick={() => {
                        playClickSound()
                        setUnitTypeModalOpen(true)
                      }}
                    >
                      <span>{unitTypeName || '부대 유형 선택'}</span>
                      <FiChevronDown size={18} />
                    </SelectBtn>
                    {unitType ? (
                      <ClearFieldBtn
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setUnitType('')
                          setUnitTypeName('')
                        }}
                        aria-label="부대 유형 지우기"
                      >
                        <FiX size={16} />
                      </ClearFieldBtn>
                    ) : null}
                  </SelectClearRow>
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>군종</FieldLabel>
                <FieldControl>
                  <SelectClearRow>
                    <SelectBtn
                      type="button"
                      $hasValue={!!branchName}
                      onClick={() => {
                        playClickSound()
                        setBranchModalOpen(true)
                      }}
                    >
                      <span>{branchName || '군종 선택'}</span>
                      <FiChevronDown size={18} />
                    </SelectBtn>
                    {branch ? (
                      <ClearFieldBtn
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setBranch('')
                          setBranchName('')
                        }}
                        aria-label="군종 지우기"
                      >
                        <FiX size={16} />
                      </ClearFieldBtn>
                    ) : null}
                  </SelectClearRow>
                  <FieldHint>육군, 해군, 공군, 해병대, 합동 등</FieldHint>
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>상위 부대·사령부</FieldLabel>
                <FieldControl>
                  <SelectClearRow>
                    <SelectBtn
                      type="button"
                      $hasValue={!!parentUnitName}
                      onClick={() => {
                        playClickSound()
                        setParentUnitModalOpen(true)
                      }}
                    >
                      <span>{parentUnitName || '상위 부대 선택'}</span>
                      <FiChevronDown size={18} />
                    </SelectBtn>
                    {parentUnitId ? (
                      <ClearFieldBtn
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setParentUnitId('')
                          setParentUnitName('')
                        }}
                        aria-label="상위 부대 지우기"
                      >
                        <FiX size={16} />
                      </ClearFieldBtn>
                    ) : null}
                  </SelectClearRow>
                  <FieldHint>
                    예: OKW 산하 OKH, 중부집단군 산하 제2기갑집단 등
                  </FieldHint>
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>소관 국방·군정 부처 (선택)</FieldLabel>
                <FieldControl>
                  <AdminDeptSelect
                    value={administrationDepartmentId}
                    onChange={(event) => {
                      playClickSound()
                      const nextDeptId = event.target.value
                      setAdministrationDepartmentId(nextDeptId)
                      const nextDept = adminDepartments.find(
                        (dept) => dept.id === nextDeptId,
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
                    disabled={
                      (!countryId && !historicalCountryId) ||
                      lockCountryAndDepartment
                    }
                  >
                    <option value="">— 없음 (독립 최고사령부 등) —</option>
                    {adminDepartments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.historicalCountry?.name && !historicalCountryId
                          ? `${dept.name} [${dept.historicalCountry.name}]`
                          : dept.name}
                      </option>
                    ))}
                  </AdminDeptSelect>
                  <FieldHint>
                    민간 국방부·병조 등 군정 부처 산하일 때 선택합니다. (예: 전쟁부가 폐지되고 OKW로 개편된 경우는 &lsquo;전신·후신 계보&rsquo; 탭에서 전신 부처로 연결하세요.)
                  </FieldHint>
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>활동 상태</FieldLabel>
                <FieldControl>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 10,
                      cursor: 'pointer',
                      fontSize: 14,
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(changeEvent) => {
                        playClickSound()
                        setIsActive(changeEvent.target.checked)
                      }}
                      style={{
                        width: 18,
                        height: 18,
                        accentColor: '#6366f1',
                        cursor: 'pointer',
                      }}
                    />
                    현재 운용 중인 부대·사령부
                  </label>
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>창설·해산</FieldLabel>
                <FullWidthFieldControl>
                  <CommanderMiniGrid>
                    <div>
                      <CommanderMicroLabel>창설 시기 (연도 / 달력)</CommanderMicroLabel>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                        <AdminDeptSelect
                          value={establishedEra}
                          onChange={(changeEvent) =>
                            setEstablishedEra(
                              changeEvent.target.value as 'AD' | 'BC',
                            )
                          }
                          style={{ maxWidth: 88, padding: '8px 10px' }}
                        >
                          <option value="AD">서기</option>
                          <option value="BC">BC</option>
                        </AdminDeptSelect>
                        <Input
                          type="number"
                          min={1}
                          placeholder="창설 연도 (예: 1938)"
                          value={establishedYear}
                          onChange={(changeEvent) => {
                            setEstablishedYear(changeEvent.target.value)
                            if (establishedDate) setEstablishedDate('')
                          }}
                        />
                      </div>
                      <SelectClearRow style={{ maxWidth: '100%' }}>
                        <DateFieldBtn
                          type="button"
                          $hasValue={!!establishedDate}
                          onClick={() => {
                            playClickSound()
                            setEstablishedDateModalOpen(true)
                          }}
                        >
                          <FiCalendar size={16} />
                          <span>
                            {establishedDate || '정확한 창설 연월일 선택'}
                          </span>
                          <FiChevronDown size={20} />
                        </DateFieldBtn>
                        {establishedDate ? (
                          <ClearFieldBtn
                            type="button"
                            onClick={() => {
                              playClickSound()
                              setEstablishedDate('')
                            }}
                            aria-label="창설일 지우기"
                          >
                            <FiX size={16} />
                          </ClearFieldBtn>
                        ) : null}
                      </SelectClearRow>
                    </div>

                    <div>
                      <CommanderMicroLabel>해산 시기 (연도 / 달력)</CommanderMicroLabel>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                        <AdminDeptSelect
                          value={disbandedEra}
                          disabled={isActive}
                          onChange={(changeEvent) =>
                            setDisbandedEra(
                              changeEvent.target.value as 'AD' | 'BC',
                            )
                          }
                          style={{ maxWidth: 88, padding: '8px 10px' }}
                        >
                          <option value="AD">서기</option>
                          <option value="BC">BC</option>
                        </AdminDeptSelect>
                        <Input
                          type="number"
                          min={1}
                          disabled={isActive}
                          placeholder="해산 연도 (예: 1945)"
                          value={disbandedYear}
                          onChange={(changeEvent) => {
                            setDisbandedYear(changeEvent.target.value)
                            if (disbandedDate) setDisbandedDate('')
                          }}
                        />
                      </div>
                      <SelectClearRow style={{ maxWidth: '100%' }}>
                        <DateFieldBtn
                          type="button"
                          disabled={isActive}
                          $hasValue={!!disbandedDate}
                          onClick={() => {
                            playClickSound()
                            if (!isActive) setDisbandedDateModalOpen(true)
                          }}
                        >
                          <FiCalendar size={16} />
                          <span>
                            {disbandedDate || '정확한 해산 연월일 선택'}
                          </span>
                          <FiChevronDown size={20} />
                        </DateFieldBtn>
                        {disbandedDate && !isActive ? (
                          <ClearFieldBtn
                            type="button"
                            onClick={() => {
                              playClickSound()
                              setDisbandedDate('')
                            }}
                            aria-label="해산일 지우기"
                          >
                            <FiX size={16} />
                          </ClearFieldBtn>
                        ) : null}
                      </SelectClearRow>
                    </div>
                  </CommanderMiniGrid>
                  {isActive ? (
                    <FieldHint>
                      운용 중인 부대는 해산 시기를 비워둡니다 (해체된 과거 부대·사령부는 위 체크박스를 해제하세요)
                    </FieldHint>
                  ) : null}
                </FullWidthFieldControl>
              </FieldRow>
            </FormRows>
          </FormSectionInner>
        )

      case 'military':
        return (
          <FormSectionInner>
            <FormRows>
              <FieldRow>
                <FieldLabel>별명/통칭</FieldLabel>
                <FieldControl>
                  <Input
                    type="text"
                    placeholder="예: 맹호부대, 불사조 사단"
                    value={nickname}
                    onChange={(changeEvent) =>
                      setNickname(changeEvent.target.value)
                    }
                  />
                  <FieldHint>부대의 별명이나 통칭</FieldHint>
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>부대 표어</FieldLabel>
                <FieldControl>
                  <Input
                    type="text"
                    placeholder="예: 필승, 충성, 용맹"
                    value={motto}
                    onChange={(changeEvent) =>
                      setMotto(changeEvent.target.value)
                    }
                  />
                  <FieldHint>부대의 모토나 슬로건</FieldHint>
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>주둔지·본부</FieldLabel>
                <FullWidthFieldControl>
                  <PlaceSelect
                    countryId={countryId || undefined}
                    disabled={!countryId}
                    value={garrisonPlace}
                    onChange={(placeVal) => setGarrisonPlace(placeVal)}
                  />
                  <FieldHint>
                    소속 국가를 먼저 선택한 뒤 지명을 입력하세요. 등록된 행정구역·도시는
                    제안에서 고를 수 있고, 없으면 입력한 그대로 저장됩니다.
                  </FieldHint>
                </FullWidthFieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>병력 규모</FieldLabel>
                <FieldControl>
                  <Input
                    type="text"
                    placeholder="예: 약 10,000명"
                    value={strength}
                    onChange={(changeEvent) =>
                      setStrength(changeEvent.target.value)
                    }
                  />
                  <FieldHint>부대의 총 병력 수</FieldHint>
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>주요 임무</FieldLabel>
                <FieldControl>
                  <Textarea
                    rows={3}
                    placeholder="예: 국방군 작전 총괄 지휘, 기동 타격, 해상 호위 등"
                    value={primaryMission}
                    onChange={(changeEvent) =>
                      setPrimaryMission(changeEvent.target.value)
                    }
                  />
                  <FieldHint>부대의 핵심 임무·역할</FieldHint>
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>관할</FieldLabel>
                <FieldControl>
                  <Textarea
                    rows={3}
                    placeholder="예: 서부·북아프리카·발칸 전구, 동부전선 작전구역 등"
                    value={jurisdiction}
                    onChange={(changeEvent) =>
                      setJurisdiction(changeEvent.target.value)
                    }
                  />
                  <FieldHint>작전·행정 관할 구역 또는 책임 범위</FieldHint>
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>역대 지휘관</FieldLabel>
                <FullWidthFieldControl>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    {existingTenureCount > 0 && (
                      <SidePanelFormSectionCard
                        style={{
                          padding: '10px 14px',
                          fontSize: 12.5,
                          color: '#6366f1',
                          fontWeight: 600,
                        }}
                      >
                        🎖️ 통합 인사·재임 시스템으로 연결된 지휘관·참모{' '}
                        {existingTenureCount}명이 등록되어 있습니다. 부대 상세 화면의
                        &lsquo;+ 지휘관·참모 임명&rsquo; 또는 인물 상세에서 편집할 수 있습니다.
                      </SidePanelFormSectionCard>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12.5,
                          color: '#64748b',
                        }}
                      >
                        사령관·군단장·사단장·참모장 등 지휘관 인물과 재임 기간을
                        연결합니다 ({commanderRows.length}명)
                      </span>
                      <MilitaryPanelPrimaryBtn
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setCommanderPersonModalOpen(true)
                        }}
                        style={{ padding: '6px 12px', fontSize: 12.5 }}
                      >
                        <FiPlus size={14} />
                        지휘관 인물 추가
                      </MilitaryPanelPrimaryBtn>
                    </div>

                    {commanderRows.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        {commanderRows.map((rowItem, rowIndex) => (
                          <SidePanelFormSectionCard
                            key={`${rowItem.personId}-${rowIndex}`}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 10,
                              padding: '12px 14px',
                            }}
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
                                  fontSize: 14,
                                }}
                              >
                                <FiUser size={14} color="#6366f1" />
                                {rowItem.personName}
                              </div>
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 10,
                                }}
                              >
                                <label
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    fontSize: 12,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={rowItem.isCurrent}
                                    onChange={(event) => {
                                      const checked = event.target.checked
                                      setCommanderTouched(true)
                                      setCommanderRows((prev) =>
                                        prev.map((item, idx) =>
                                          idx === rowIndex
                                            ? { ...item, isCurrent: checked }
                                            : item,
                                        ),
                                      )
                                    }}
                                  />
                                  현임/대표 지휘관
                                </label>
                                <TextGhostBtn
                                  type="button"
                                  $danger
                                  onClick={() => {
                                    playClickSound()
                                    setCommanderTouched(true)
                                    setCommanderRows((prev) =>
                                      prev.filter((_, idx) => idx !== rowIndex),
                                    )
                                  }}
                                  style={{ padding: '4px 8px', fontSize: 12 }}
                                >
                                  <FiTrash2 size={13} />
                                </TextGhostBtn>
                              </div>
                            </div>

                            <CommanderMiniGrid>
                              <CommanderFormField>
                                <CommanderMicroLabel>
                                  계급 (예: 원수, 상급대장, 중장)
                                </CommanderMicroLabel>
                                <Input
                                  type="text"
                                  placeholder="계급 입력"
                                  value={rowItem.rank}
                                  onChange={(event) => {
                                    const nextRank = event.target.value
                                    setCommanderTouched(true)
                                    setCommanderRows((prev) =>
                                      prev.map((item, idx) =>
                                        idx === rowIndex
                                          ? { ...item, rank: nextRank }
                                          : item,
                                      ),
                                    )
                                  }}
                                />
                              </CommanderFormField>

                              <CommanderFormField>
                                <CommanderMicroLabel>
                                  직책 (예: 총장, 사령관, 참모장)
                                </CommanderMicroLabel>
                                <Input
                                  type="text"
                                  placeholder="사령관 / 참모장 등"
                                  value={rowItem.role}
                                  onChange={(event) => {
                                    const nextRole = event.target.value
                                    setCommanderTouched(true)
                                    setCommanderRows((prev) =>
                                      prev.map((item, idx) =>
                                        idx === rowIndex
                                          ? { ...item, role: nextRole }
                                          : item,
                                      ),
                                    )
                                  }}
                                />
                              </CommanderFormField>

                              <CommanderFormField>
                                <CommanderMicroLabel>
                                  부임일 (YYYY-MM-DD)
                                </CommanderMicroLabel>
                                <Input
                                  type="text"
                                  placeholder="예: 1941-06-22"
                                  value={rowItem.startDate}
                                  onChange={(event) => {
                                    const nextStart = event.target.value
                                    setCommanderTouched(true)
                                    setCommanderRows((prev) =>
                                      prev.map((item, idx) =>
                                        idx === rowIndex
                                          ? { ...item, startDate: nextStart }
                                          : item,
                                      ),
                                    )
                                  }}
                                />
                              </CommanderFormField>

                              <CommanderFormField>
                                <CommanderMicroLabel>
                                  이임일 (YYYY-MM-DD)
                                </CommanderMicroLabel>
                                <Input
                                  type="text"
                                  placeholder="예: 1941-12-19"
                                  value={rowItem.endDate}
                                  onChange={(event) => {
                                    const nextEnd = event.target.value
                                    setCommanderTouched(true)
                                    setCommanderRows((prev) =>
                                      prev.map((item, idx) =>
                                        idx === rowIndex
                                          ? { ...item, endDate: nextEnd }
                                          : item,
                                      ),
                                    )
                                  }}
                                />
                              </CommanderFormField>
                            </CommanderMiniGrid>
                          </SidePanelFormSectionCard>
                        ))}
                      </div>
                    )}
                  </div>
                </FullWidthFieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>주요 전투 참여</FieldLabel>
                <FieldControl>
                  <Textarea
                    rows={4}
                    placeholder="예: 6.25전쟁 인천상륙작전, 베트남전 등"
                    value={notableBattles}
                    onChange={(changeEvent) =>
                      setNotableBattles(changeEvent.target.value)
                    }
                  />
                  <FieldHint>
                    부대가 참여한 주요 전투나 작전 (각 줄마다 하나씩)
                  </FieldHint>
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>훈장/표창</FieldLabel>
                <FieldControl>
                  <Textarea
                    rows={4}
                    placeholder="예: 대통령부대표창(2020), 국방부장관표창(2018)"
                    value={honors}
                    onChange={(changeEvent) =>
                      setHonors(changeEvent.target.value)
                    }
                  />
                  <FieldHint>
                    부대가 받은 훈장이나 표창 (각 줄마다 하나씩)
                  </FieldHint>
                </FieldControl>
              </FieldRow>
            </FormRows>
          </FormSectionInner>
        )

      case 'lineage':
        return (
          <FormSectionInner>
            <FormRows>
              <FieldRow>
                <FieldLabel>전신·후신 계보</FieldLabel>
                <FullWidthFieldControl>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <FieldHint style={{ marginTop: 0 }}>
                      부대 개칭·분리·통합 계보는 물론, 민간 국방부처가 군사 최고사령부로 개편된 역사(예: <strong>전쟁부 → 국방군 최고사령부 OKW</strong>)까지 기록합니다.
                    </FieldHint>

                    {isEdit && (predecessors.length > 0 || successors.length > 0) && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        {predecessors.map((predItem) => {
                          const targetLabel =
                            predItem.targetType === 'DEPARTMENT'
                              ? `🏛️ [전신 부처] ${predItem.department?.name ?? ''}`
                              : `🛡️ [전신 부대] ${predItem.unit?.name ?? ''}`
                          const kindLabel =
                            TRANSITION_KIND_OPTIONS.find(
                              (opt) => opt.value === predItem.kind,
                            )?.label ?? predItem.kind
                          return (
                            <SidePanelFormSectionCard
                              key={predItem.transitionId}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 10,
                                padding: '10px 14px',
                              }}
                            >
                              <div style={{ fontSize: 13 }}>
                                <strong>{targetLabel}</strong>{' '}
                                <span style={{ opacity: 0.75 }}>
                                  → 현재 부대 ({kindLabel}
                                  {predItem.year
                                    ? ` · ${predItem.era === 'BC' ? 'BC ' : ''}${predItem.year}년`
                                    : ''}
                                  )
                                </span>
                                {predItem.note && (
                                  <div
                                    style={{
                                      fontSize: 12,
                                      opacity: 0.7,
                                      marginTop: 2,
                                    }}
                                  >
                                    {predItem.note}
                                  </div>
                                )}
                              </div>
                              <TextGhostBtn
                                type="button"
                                $danger
                                disabled={transitionBusy}
                                onClick={() =>
                                  void handleDeleteTransition(
                                    predItem.transitionId,
                                  )
                                }
                              >
                                <FiTrash2 size={13} />
                              </TextGhostBtn>
                            </SidePanelFormSectionCard>
                          )
                        })}

                        {successors.map((succItem) => {
                          const kindLabel =
                            TRANSITION_KIND_OPTIONS.find(
                              (opt) => opt.value === succItem.kind,
                            )?.label ?? succItem.kind
                          return (
                            <SidePanelFormSectionCard
                              key={succItem.transitionId}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 10,
                                padding: '10px 14px',
                              }}
                            >
                              <div style={{ fontSize: 13 }}>
                                <span style={{ opacity: 0.75 }}>현재 부대 → </span>
                                <strong>
                                  🛡️ [후신 부대] {succItem.unit?.name ?? ''}
                                </strong>{' '}
                                <span style={{ opacity: 0.75 }}>
                                  ({kindLabel}
                                  {succItem.year
                                    ? ` · ${succItem.era === 'BC' ? 'BC ' : ''}${succItem.year}년`
                                    : ''}
                                  )
                                </span>
                                {succItem.note && (
                                  <div
                                    style={{
                                      fontSize: 12,
                                      opacity: 0.7,
                                      marginTop: 2,
                                    }}
                                  >
                                    {succItem.note}
                                  </div>
                                )}
                              </div>
                              <TextGhostBtn
                                type="button"
                                $danger
                                disabled={transitionBusy}
                                onClick={() =>
                                  void handleDeleteTransition(
                                    succItem.transitionId,
                                  )
                                }
                              >
                                <FiTrash2 size={13} />
                              </TextGhostBtn>
                            </SidePanelFormSectionCard>
                          )
                        })}
                      </div>
                    )}

                    <SidePanelFormSectionCard
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        padding: 14,
                      }}
                    >
                      <CommanderMicroLabel style={{ marginBottom: 0 }}>
                        {isEdit
                          ? '새 계보 연결 추가'
                          : '생성 시 함께 연결할 계보 (선택)'}
                      </CommanderMicroLabel>

                      <CommanderMiniGrid>
                        <CommanderFormField>
                          <CommanderMicroLabel>연결 방향</CommanderMicroLabel>
                          <AdminDeptSelect
                            value={newTransitionDirection}
                            onChange={(changeEvent) => {
                              setNewTransitionDirection(
                                changeEvent.target.value as
                                  | 'PREDECESSOR_DEPARTMENT'
                                  | 'PREDECESSOR_UNIT'
                                  | 'SUCCESSOR_UNIT',
                              )
                              setNewTransitionTargetId('')
                            }}
                            style={{ maxWidth: '100%' }}
                          >
                            <option value="PREDECESSOR_DEPARTMENT">
                              전신 행정부처 → 이 사령부·부대 (예: 전쟁부 → OKW)
                            </option>
                            <option value="PREDECESSOR_UNIT">
                              전신 군부대 → 이 부대
                            </option>
                            <option value="SUCCESSOR_UNIT">
                              이 부대 → 후신 군부대
                            </option>
                          </AdminDeptSelect>
                        </CommanderFormField>

                        <CommanderFormField>
                          <CommanderMicroLabel>변동 유형</CommanderMicroLabel>
                          <AdminDeptSelect
                            value={newTransitionKind}
                            onChange={(changeEvent) =>
                              setNewTransitionKind(
                                changeEvent.target.value as MilitaryUnitTransitionKind,
                              )
                            }
                            style={{ maxWidth: '100%' }}
                          >
                            {TRANSITION_KIND_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </AdminDeptSelect>
                        </CommanderFormField>

                        <CommanderFormField>
                          <CommanderMicroLabel>대상 기관·부대</CommanderMicroLabel>
                          <AdminDeptSelect
                            value={newTransitionTargetId}
                            onChange={(changeEvent) =>
                              setNewTransitionTargetId(changeEvent.target.value)
                            }
                            style={{ maxWidth: '100%' }}
                          >
                            <option value="">— 대상 선택 —</option>
                            {newTransitionDirection === 'PREDECESSOR_DEPARTMENT'
                              ? adminDepartments.map((deptItem) => (
                                  <option key={deptItem.id} value={deptItem.id}>
                                    🏛️ {deptItem.name}
                                    {deptItem.abbreviation
                                      ? ` (${deptItem.abbreviation})`
                                      : ''}
                                  </option>
                                ))
                              : availableParentUnits.map((unitCandidate) => (
                                  <option
                                    key={unitCandidate.id}
                                    value={unitCandidate.id}
                                  >
                                    🛡️ {unitCandidate.name}
                                    {unitCandidate.abbreviation
                                      ? ` (${unitCandidate.abbreviation})`
                                      : ''}
                                  </option>
                                ))}
                          </AdminDeptSelect>
                        </CommanderFormField>

                        <CommanderFormField>
                          <CommanderMicroLabel>개편 연도 (선택)</CommanderMicroLabel>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <AdminDeptSelect
                              value={newTransitionEra}
                              onChange={(changeEvent) =>
                                setNewTransitionEra(
                                  changeEvent.target.value as 'AD' | 'BC',
                                )
                              }
                              style={{ maxWidth: 88 }}
                            >
                              <option value="AD">서기</option>
                              <option value="BC">BC</option>
                            </AdminDeptSelect>
                            <Input
                              type="number"
                              min={1}
                              placeholder="예: 1938"
                              value={newTransitionYear}
                              onChange={(changeEvent) =>
                                setNewTransitionYear(changeEvent.target.value)
                              }
                            />
                          </div>
                        </CommanderFormField>
                      </CommanderMiniGrid>

                      <Input
                        type="text"
                        placeholder="비고 (선택 — 예: 블롬베르크-프리치 사건으로 전쟁부 폐지 후 직할 최고사령부로 개편)"
                        value={newTransitionNote}
                        onChange={(changeEvent) =>
                          setNewTransitionNote(changeEvent.target.value)
                        }
                      />

                      {isEdit && (
                        <div>
                          <MilitaryPanelPrimaryBtn
                            type="button"
                            disabled={!newTransitionTargetId || transitionBusy}
                            onClick={() => void handleAddTransition()}
                          >
                            <FiPlus size={14} />
                            {transitionBusy ? '연결 중…' : '계보 연결 추가'}
                          </MilitaryPanelPrimaryBtn>
                        </div>
                      )}
                    </SidePanelFormSectionCard>
                  </div>
                </FullWidthFieldControl>
              </FieldRow>
            </FormRows>
          </FormSectionInner>
        )

      case 'description':
        return (
          <FormSectionInner>
            <FormRows>
              <FieldRow>
                <FieldLabel>부대 설명</FieldLabel>
                <FullWidthFieldControl>
                  <Textarea
                    rows={12}
                    placeholder="부대에 대한 전반적인 설명을 입력하세요"
                    value={description}
                    onChange={(changeEvent) =>
                      setDescription(changeEvent.target.value)
                    }
                  />
                </FullWidthFieldControl>
              </FieldRow>
            </FormRows>
          </FormSectionInner>
        )

      default:
        return null
    }
  }

  if (!isOpen) return null

  return (
    <>
      <SidePanel
        isOpen={isOpen}
        onClose={() => {
          playClickSound()
          onClose()
        }}
        title={
          <span id="military-unit-form-title">
            {isEdit ? '군사 사령부·부대 수정' : '군사 사령부·부대 등록'}
          </span>
        }
        subtitle="최고사령부(OKW·STAVKA)·각군 총사령부·야전군·사단 편제와 전신·후신 계보를 관리합니다."
        footer={
          <MilitaryPanelPrimaryBtn
            type="submit"
            form="military-unit-form"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? '저장 중…' : isEdit ? '수정하기' : '추가하기'}
          </MilitaryPanelPrimaryBtn>
        }
        width="min(1180px, 100vw)"
      >
        <SidePanelFormTabBarWrap>
          <SidePanelFormTabBar role="tablist" aria-label="군부대 입력 구간">
            <SidePanelFormTab
              type="button"
              role="tab"
              aria-selected={activeTab === 'basic'}
              $active={activeTab === 'basic'}
              onClick={() => {
                playClickSound()
                setActiveTab('basic')
              }}
            >
              기본 정보
              {!name.trim() ? <TabRequiredDot title="부대명 미입력" /> : null}
            </SidePanelFormTab>
            <SidePanelFormTab
              type="button"
              role="tab"
              aria-selected={activeTab === 'military'}
              $active={activeTab === 'military'}
              onClick={() => {
                playClickSound()
                setActiveTab('military')
              }}
            >
              군정보·지휘관
            </SidePanelFormTab>
            <SidePanelFormTab
              type="button"
              role="tab"
              aria-selected={activeTab === 'lineage'}
              $active={activeTab === 'lineage'}
              onClick={() => {
                playClickSound()
                setActiveTab('lineage')
              }}
            >
              전신·후신 계보
              {predecessors.length + successors.length > 0
                ? ` (${predecessors.length + successors.length})`
                : ''}
            </SidePanelFormTab>
            <SidePanelFormTab
              type="button"
              role="tab"
              aria-selected={activeTab === 'description'}
              $active={activeTab === 'description'}
              onClick={() => {
                playClickSound()
                setActiveTab('description')
              }}
            >
              상세 설명
            </SidePanelFormTab>
          </SidePanelFormTabBar>
        </SidePanelFormTabBarWrap>

        <form id="military-unit-form" onSubmit={handleSubmit}>
          {renderTabContent()}
        </form>
      </SidePanel>

      {/* 국가 선택 모달 */}
      <CountryPicker
        mode="single"
        isOpen={countryModalOpen}
        onClose={() => setCountryModalOpen(false)}
        onSelect={(country) => {
          // 상호배타 — 고른 축만 채우고 반대편은 비운다(부처 폼과 동일 규약)
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
          // 축이 바뀌면 이전 축의 부처 연결은 무효 — FK가 다른 국가를 가리키게 된다
          setAdministrationDepartmentId('')
          setCountryModalOpen(false)
        }}
        modernCountries={modernCountries}
        historicalCountries={historicalCountries}
        selectedIds={[historicalCountryId || countryId].filter(Boolean)}
      />

      {/* 부대 유형 선택 모달 */}
      {unitTypeModalOpen && (
        <SimpleSelectModal
          title="부대 유형 선택"
          options={UNIT_TYPES.map((typeItem) => ({
            value: typeItem.value,
            label: typeItem.label,
          }))}
          selectedValue={unitType}
          onSelect={(value, label) => {
            setUnitType(value as MilitaryUnitType)
            setUnitTypeName(label)
            setUnitTypeModalOpen(false)
          }}
          onClose={() => setUnitTypeModalOpen(false)}
        />
      )}

      {/* 군종 선택 모달 */}
      {branchModalOpen && (
        <SimpleSelectModal
          title="군종 선택"
          options={MILITARY_BRANCHES}
          selectedValue={branch}
          onSelect={(value, label) => {
            setBranch(value)
            setBranchName(label)
            setBranchModalOpen(false)
          }}
          onClose={() => setBranchModalOpen(false)}
        />
      )}

      {/* 상위 부대 선택 모달 */}
      {parentUnitModalOpen && (
        <UnitSelectModal
          title="상위 부대 선택"
          units={availableParentUnits}
          selectedId={parentUnitId}
          onSelect={(unit) => {
            setParentUnitId(unit.id)
            setParentUnitName(unit.name)
            setParentUnitModalOpen(false)
          }}
          onClose={() => setParentUnitModalOpen(false)}
        />
      )}

      <DatePickerModal
        isOpen={establishedDateModalOpen}
        onClose={() => setEstablishedDateModalOpen(false)}
        onSelect={(date) => {
          setEstablishedDate(date)
          const yearPrefix = Number.parseInt(date.slice(0, 4), 10)
          if (Number.isFinite(yearPrefix) && yearPrefix > 0) {
            setEstablishedEra('AD')
            setEstablishedYear(String(yearPrefix))
          }
          setEstablishedDateModalOpen(false)
        }}
        initialDate={establishedDate}
        title="창설일 선택"
      />

      <DatePickerModal
        isOpen={disbandedDateModalOpen}
        onClose={() => setDisbandedDateModalOpen(false)}
        onSelect={(date) => {
          setDisbandedDate(date)
          const yearPrefix = Number.parseInt(date.slice(0, 4), 10)
          if (Number.isFinite(yearPrefix) && yearPrefix > 0) {
            setDisbandedEra('AD')
            setDisbandedYear(String(yearPrefix))
          }
          setDisbandedDateModalOpen(false)
        }}
        initialDate={disbandedDate}
        title="해산일 선택"
      />

      {commanderPersonModalOpen && (
        <PersonSelectModal
          persons={allPersons}
          selectedPersonId=""
          loading={personsLoading}
          title={`${name.trim() || '부대'} 지휘관 인물 선택`}
          searchPlaceholder="지휘관으로 등록할 인물을 검색..."
          defaultCountryId={countryId || undefined}
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
            setCommanderTouched(true)
            setCommanderRows((prev) => [
              ...prev,
              {
                personId: selectedPersonId,
                personName: displayPersonName,
                rank: '',
                role: '사령관',
                termNumber: String(prev.length + 1),
                startDate: '',
                endDate: '',
                isCurrent: prev.length === 0,
              },
            ])
            setCommanderPersonModalOpen(false)
          }}
          onClose={() => setCommanderPersonModalOpen(false)}
        />
      )}
    </>
  )
}

// 간단한 선택 모달
interface SimpleSelectModalProps {
  title: string
  options: Array<{ value: string; label: string }>
  selectedValue?: string
  onSelect: (value: string, label: string) => void
  onClose: () => void
}

const SimpleSelectModal: React.FC<SimpleSelectModalProps> = ({
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}) => {
  const playClickSound = useClickSound()

  return (
    <InnerModalOverlay onClick={onClose}>
      <InnerModalBox onClick={(clickEvent) => clickEvent.stopPropagation()}>
        <InnerModalHeader>
          <InnerModalTitle>{title}</InnerModalTitle>
          <InnerModalCloseButton onClick={onClose}>
            <FiX size={20} />
          </InnerModalCloseButton>
        </InnerModalHeader>
        <InnerModalBody>
          {options.map((option) => (
            <ModalOption
              key={option.value}
              $selected={selectedValue === option.value}
              onClick={() => {
                playClickSound()
                onSelect(option.value, option.label)
              }}
            >
              <span>{option.label}</span>
              {selectedValue === option.value && <FiCheck size={16} />}
            </ModalOption>
          ))}
        </InnerModalBody>
      </InnerModalBox>
    </InnerModalOverlay>
  )
}

// 군부대 선택 모달
interface UnitSelectModalProps {
  title: string
  units: MilitaryUnit[]
  selectedId?: string
  onSelect: (unit: MilitaryUnit) => void
  onClose: () => void
}

const UnitSelectModal: React.FC<UnitSelectModalProps> = ({
  title,
  units,
  selectedId,
  onSelect,
  onClose,
}) => {
  const playClickSound = useClickSound()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredUnits = units.filter((unit) =>
    unit.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <InnerModalOverlay onClick={onClose}>
      <InnerModalBox onClick={(clickEvent) => clickEvent.stopPropagation()}>
        <InnerModalHeader>
          <InnerModalTitle>{title}</InnerModalTitle>
          <InnerModalCloseButton onClick={onClose}>
            <FiX size={20} />
          </InnerModalCloseButton>
        </InnerModalHeader>
        <SearchSection>
          <SearchInput
            type="text"
            placeholder="부대명 검색..."
            value={searchQuery}
            onChange={(changeEvent) =>
              setSearchQuery(changeEvent.target.value)
            }
            autoFocus
          />
        </SearchSection>
        <InnerModalBody>
          {filteredUnits.length === 0 ? (
            <EmptyText>검색 결과가 없습니다</EmptyText>
          ) : (
            filteredUnits.map((unit) => (
              <ModalOption
                key={unit.id}
                $selected={selectedId === unit.id}
                onClick={() => {
                  playClickSound()
                  onSelect(unit)
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {unit.name}
                    {unit.abbreviation ? ` (${unit.abbreviation})` : ''}
                  </div>
                  {unit.country && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#64748b',
                        marginTop: '2px',
                      }}
                    >
                      {unit.country.flagEmoji} {unit.country.name}
                    </div>
                  )}
                </div>
                {selectedId === unit.id && <FiCheck size={16} />}
              </ModalOption>
            ))
          )}
        </InnerModalBody>
      </InnerModalBox>
    </InnerModalOverlay>
  )
}


const MilitaryPanelPrimaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 10px;
  cursor: pointer;
  border: none;
  background: ${MAIN};
  color: #fff;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(99, 102, 241, 0.35);
  transition: background 0.15s ease;

  &:hover:not(:disabled) {
    background: ${MAIN_HOVER};
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

/** 조약 폼 TreatyFormSelect와 동일 토큰 */
const AdminDeptSelect = styled.select`
  width: 100%;
  max-width: 360px;
  padding: 12px 14px;
  font-size: 14px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  color: ${({ theme }) => theme.colors.text.primary};
  outline: none;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;

  &:focus {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

/** 사이드 패널(드로어)보다 위 — Z_INDEX.MODAL_* */
const InnerModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${OVERLAY_STYLES.BACKGROUND};
  backdrop-filter: ${OVERLAY_STYLES.BACKDROP_FILTER};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  animation: muModalFadeIn 0.2s ease;

  @keyframes muModalFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`

const InnerModalBox = styled.div`
  ${({ theme }) => glassCardMixin(theme)}
  border-radius: 16px;
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 24px 48px rgba(0,0,0,0.45)'
      : '0 24px 48px rgba(0, 0, 0, 0.2)'};
  width: 90%;
  max-width: 400px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  z-index: ${Z_INDEX.MODAL_CONTENT};
  animation: muModalSlideUp 0.2s ease;

  @keyframes muModalSlideUp {
    from {
      transform: translateY(12px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`

const InnerModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-shrink: 0;
`

const InnerModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const InnerModalCloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const SearchSection = styled.div`
  padding: 16px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const InnerModalBody = styled.div`
  padding: 12px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.default};
    border-radius: 4px;
  }
`

const ModalOption = styled.button<{ $selected: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: ${({ $selected }) => ($selected ? '600' : '500')};
  color: ${({ $selected, theme }) =>
    $selected ? MAIN : theme.colors.text.primary};
  background: ${({ $selected, theme }) =>
    $selected
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.14)'
        : 'rgba(99, 102, 241, 0.08)'
      : 'transparent'};
  border: 1.5px solid
    ${({ $selected, theme }) =>
      $selected
        ? 'rgba(99, 102, 241, 0.35)'
        : theme.colors.border.default};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;

  &:hover {
    background: ${({ $selected, theme }) =>
      $selected
        ? theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.2)'
          : 'rgba(99, 102, 241, 0.12)'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.06)'
          : 'rgba(99, 102, 241, 0.06)'};
    border-color: ${({ $selected }) =>
      $selected ? 'rgba(99, 102, 241, 0.45)' : 'rgba(99, 102, 241, 0.25)'};
  }

  svg {
    color: ${MAIN};
    flex-shrink: 0;
  }
`

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  border: 1.5px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  outline: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  &:focus {
    border-color: ${MAIN};
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }
`

const EmptyText = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 14px;
`
