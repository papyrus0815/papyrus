/**
 * 군사 이벤트 전용 폼 컴포넌트
 */
import React, { useState } from 'react'

import {
  FiCalendar,
  FiChevronDown,
  FiClock,
  FiEdit2,
  FiGlobe,
  FiHelpCircle,
  FiInfo,
  FiPlus,
  FiSettings,
  FiShield,
  FiTarget,
  FiTrash2,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { CountryResponseDto } from '@/shared/api/countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import type { MilitaryUnit } from '@/shared/api/military-unit'
import type { PersonResponseDto } from '@/shared/api/persons'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { type MilitaryEvent } from '@/shared/types/military-event.types'
import { CountrySelectModal } from '@/shared/ui/country-select-modal'
import { DatePickerModal } from '@/shared/ui/date-picker'
import { TimePickerModal } from '@/shared/ui/time-picker-modal/TimePickerModal'

import { BelligerentsGraphForm } from '../components/belligerents-graph-form'
import { BelligerentsGraphVisualization } from '../components/belligerents-graph-visualization'
import type { EventBelligerentsGraph } from '../types/belligerents-graph.types'
import { FORM_FIELD_MAX_WIDTH } from './event-create.styles'

// 타입 정의

// ============================================
// 새로운 구조: 국가 정보 공유 시스템
// ============================================

/**
 * 국가별 상세 정보 (공통 데이터 풀)
 * 진영과 그래프 모두 이 데이터를 참조합니다
 */
export interface CountryDetailData {
  countryId: string
  countryName: string
  isHistorical: boolean

  // 군사 정보
  commander?: string
  commanderPersonId?: string
  forces?: string // 병력 규모
  deployedUnits?: string[] // 투입 부대 ID
  weaponsUsed?: string[] // 사용 무기/장비

  // 참전 정보
  joinDate?: string
  joinReason?: string
  withdrawDate?: string
  withdrawReason?: string
  role?: string // 역할 (예: 주도국, 지원국)
  participation?: 'full' | 'limited' | 'indirect' | 'non-combatant'

  // 피해 규모
  casualties?: {
    military: {
      killed: string
      wounded: string
      missing: string
      captured: string
    }
    civilian?: {
      killed: string
      wounded: string
      displaced: string
    }
    total: string
  }

  description?: string
}

/**
 * 단순화된 진영 구조 (국가 ID만 참조)
 */
export interface SimplifiedBelligerentSide {
  id: string
  name: string
  countryIds: string[] // 국가 ID만 저장 (실제 데이터는 countryData에서 참조)
  description?: string

  // 계층 구조
  parentSideId?: string
  level?: 'coalition' | 'country' | 'force'
}

// ============================================
// 레거시 타입 (하위 호환성)
// ============================================
export interface CountryParticipation {
  countryId: string
  countryName: string
  isHistorical: boolean
  joinDate?: string
  joinReason?: string
  withdrawDate?: string
  withdrawReason?: string

  // 상세 정보 (통합)
  commander?: string
  commanderPersonId?: string
  forces?: string // 병력 규모
  participation?: 'full' | 'limited' | 'indirect' | 'non-combatant'
  role?: string // 역할
  description?: string // 설명
  deployedUnits?: string[] // 투입 부대
  weaponsUsed?: string[] // 사용 무기
}

export interface BelligerentSide {
  id: string
  name: string
  countries: CountryParticipation[]
  commander: string
  commanderPersonId?: string
  forces: string
  deployedUnits?: string[]
  weaponsUsed?: string[]
  description?: string
  parentSideId?: string
  level?: 'coalition' | 'country' | 'force'
}

export interface CasualtyData {
  military: {
    killed: string
    wounded: string
    missing: string
    captured: string
  }
  civilian?: {
    killed: string
    wounded: string
    displaced: string
  }
  total: string
}

export interface MilitaryConflictDetails {
  type: 'battle' | 'war' | 'siege' | 'campaign' | 'skirmish'
  combatType: ('land' | 'naval' | 'air')[]
  objective?: string
  tactics?: string // 전술 설명
  strategy?: string // 전략 설명
  outcome: string
  territoryChanges?: string
  treaty?: string
  strategicImpact?: string
}

interface MilitaryEventFormProps {
  // 정규화된 구조 (새로운 방식)
  militaryEvent?: MilitaryEvent
  setMilitaryEvent?: (value: MilitaryEvent) => void

  // 레거시 지원 (하위 호환성)
  belligerents?: BelligerentSide[]
  setBelligerents?: (value: BelligerentSide[]) => void
  casualties?: { [sideId: string]: CasualtyData }
  setCasualties?: (value: { [sideId: string]: CasualtyData }) => void

  militaryDetails: MilitaryConflictDetails
  setMilitaryDetails: (value: MilitaryConflictDetails) => void
  warCost: string
  setWarCost: (value: string) => void
  availableCountries: CountryResponseDto[]
  availableHistoricalCountries: HistoricalCountryResponseDto[]
  availableMilitaryUnits: MilitaryUnit[]
  availablePersons: PersonResponseDto[]

  // 부모 사건 정보
  parentEvent?: {
    id: string
    title: string
    belligerents?: {
      sides: BelligerentSide[]
    }
  }

  // 관계 그래프 (고급 설정)
  belligerentsGraph?: EventBelligerentsGraph
  setBelligerentsGraph?: (value: EventBelligerentsGraph) => void

  // 하위 사건들의 관계 (조회용)
  childEventsRelations?: Array<{
    relation: EventBelligerentsGraph
    sourceName: string
  }>
}

// 툴팁 컴포넌트
const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({
  text,
  children,
}) => {
  const [show, setShow] = useState(false)

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px',
            padding: '8px 12px',
            background: '#1e293b',
            color: 'white',
            fontSize: '12px',
            borderRadius: '6px',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {text}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #1e293b',
            }}
          />
        </div>
      )}
    </div>
  )
}

const COLORS = {
  primary: '#6366f1', // 인디고
  primaryLight: 'rgba(99, 102, 241, 0.08)',
  primaryBorder: 'rgba(99, 102, 241, 0.2)',
  primaryDark: '#4f46e5',
  danger: '#ef4444', // 빨강
  dangerLight: 'rgba(239, 68, 68, 0.08)',
  success: '#10b981', // 초록
  successLight: 'rgba(16, 185, 129, 0.08)',
  warning: '#f59e0b', // 주황
  warningLight: 'rgba(245, 158, 11, 0.08)',
  info: '#3b82f6', // 파랑
  infoLight: 'rgba(59, 130, 246, 0.08)',
  text: '#1e293b',
  textLight: '#64748b',
  bg: '#f8fafc',
  border: 'rgba(148, 163, 184, 0.2)',
}

export const MilitaryEventForm: React.FC<MilitaryEventFormProps> = ({
  // 새로운 구조
  militaryEvent,
  setMilitaryEvent,

  // 레거시 (하위 호환성)
  belligerents,
  setBelligerents,
  casualties,
  setCasualties,

  militaryDetails,
  setMilitaryDetails,
  warCost,
  setWarCost,
  availableCountries,
  availableHistoricalCountries,
  availableMilitaryUnits,
  availablePersons,
  parentEvent,
  belligerentsGraph,
  setBelligerentsGraph,
  childEventsRelations = [],
}) => {
  const playClickSound = useClickSound()

  // 탭 상태
  const [activeTab, setActiveTab] = useState<'belligerents' | 'details'>(
    'belligerents',
  )

  // 진영 추가 모달
  const [showAddSideModal, setShowAddSideModal] = useState(false)
  const [newSideName, setNewSideName] = useState('')
  const [newSideDescription, setNewSideDescription] = useState('')

  // 진영 수정 모달 (그래프 방식)
  const [showEditSideModal, setShowEditSideModal] = useState(false)
  const [editingSideId, setEditingSideId] = useState<string | null>(null)
  const [editSideName, setEditSideName] = useState('')
  const [editSideColor, setEditSideColor] = useState('')
  const [editSideDescription, setEditSideDescription] = useState('')
  const [isGraphMode, setIsGraphMode] = useState(false) // 그래프 모드 vs 레거시 모드

  const [expandedSides, setExpandedSides] = useState<Set<string>>(new Set())
  const [countryModalOpen, setCountryModalOpen] = useState(false)
  const [selectedSideForCountry, setSelectedSideForCountry] = useState<
    string | null
  >(null)
  const [selectedCountryIndex, setSelectedCountryIndex] = useState<
    number | null
  >(null)

  // 고급 설정 (관계 그래프) 펼치기/접기
  const [advancedExpanded, setAdvancedExpanded] = useState(false)

  // 국가 상세 정보 펼치기/접기
  const [countryDetailsExpanded, setCountryDetailsExpanded] = useState(false)

  // 현재 편집 중인 국가 ID
  const [editingCountryId, setEditingCountryId] = useState<string | null>(null)

  // 날짜/시간 선택 모달 상태
  const [dateModalState, setDateModalState] = useState<{
    isOpen: boolean
    type: 'join' | 'withdraw'
    sideId: string | null
    countryIndex: number | null
  }>({
    isOpen: false,
    type: 'join',
    sideId: null,
    countryIndex: null,
  })

  const [timeModalState, setTimeModalState] = useState<{
    isOpen: boolean
    type: 'join' | 'withdraw'
    sideId: string | null
    countryIndex: number | null
  }>({
    isOpen: false,
    type: 'join',
    sideId: null,
    countryIndex: null,
  })

  // ============================================
  // 레거시 데이터를 사용 (현재는 레거시 방식으로만 작동)
  // ============================================
  const actualSides: SimplifiedBelligerentSide[] =
    belligerents?.map((side) => ({
      id: side.id,
      name: side.name,
      level: side.level,
      countryIds: side.countries.map((country) => country.countryId),
    })) || []

  const actualCountryData: Record<string, CountryDetailData> = {}
  belligerents?.forEach((side) => {
    side.countries.forEach((country) => {
      actualCountryData[country.countryId] = {
        countryId: country.countryId,
        countryName: country.countryName,
        isHistorical: country.isHistorical,
        commander: side.commander,
        commanderPersonId: side.commanderPersonId,
        forces: side.forces,
        joinDate: country.joinDate,
        withdrawDate: country.withdrawDate,
        participation: country.participation,
      }
    })
  })

  // 레거시 데이터를 정규화된 구조로 변환하여 militaryEvent 업데이트
  React.useEffect(() => {
    if (!setMilitaryEvent) return

    // SideLevel 매핑 함수
    const mapToSideLevel = (
      level?: 'coalition' | 'country' | 'force',
    ): string | undefined => {
      if (!level) return undefined
      const levelMap: Record<string, string> = {
        coalition: 'COALITION',
        country: 'COUNTRY',
        force: 'FORCE',
      }
      return levelMap[level]
    }

    // ParticipationType 매핑 함수
    const mapToParticipationType = (
      participation?: 'full' | 'limited' | 'indirect' | 'non-combatant',
    ): string | undefined => {
      if (!participation) return undefined
      const participationMap: Record<string, string> = {
        full: 'FULL',
        limited: 'LIMITED',
        indirect: 'INDIRECT',
        'non-combatant': 'NON_COMBATANT',
      }
      return participationMap[participation]
    }

    // MilitaryRelationType 매핑 함수
    const mapToRelationType = (relationType: string): string => {
      const relationMap: Record<string, string> = {
        allied: 'ALLIED',
        enemy: 'ENEMY',
        neutral: 'NEUTRAL',
        puppet: 'PUPPET',
        occupied: 'OCCUPIED',
        cooperation: 'COOPERATION',
        'non-aggression': 'NON_AGGRESSION',
      }
      return relationMap[relationType] || 'NEUTRAL'
    }

    // ConflictType 매핑 함수
    const mapToConflictType = (
      type?: 'battle' | 'war' | 'siege' | 'campaign' | 'skirmish',
    ): string | undefined => {
      if (!type) return undefined
      const conflictMap: Record<string, string> = {
        battle: 'BATTLE',
        war: 'WAR',
        siege: 'SIEGE',
        campaign: 'CAMPAIGN',
        skirmish: 'SKIRMISH',
      }
      return conflictMap[type]
    }

    // CombatType 매핑 함수
    const mapToCombatTypes = (
      types: ('land' | 'naval' | 'air')[],
    ): string[] => {
      const combatMap: Record<string, string> = {
        land: 'LAND',
        naval: 'NAVAL',
        air: 'AIR',
      }
      return types.map((type) => combatMap[type] || 'LAND')
    }

    const updatedMilitaryEvent: Partial<MilitaryEvent> = {
      // 교전 세력 변환 (실제 데이터가 있을 때만)
      belligerentSides:
        belligerents && belligerents.length > 0
          ? belligerents.map((side) => ({
              name: side.name,
              level: mapToSideLevel(side.level) as never,
              commander: side.commander,
              commanderPersonId: side.commanderPersonId,
              forces: side.forces,
              description: side.description,
              countries: side.countries.map((country) => ({
                countryId: country.isHistorical ? undefined : country.countryId,
                historicalCountryId: country.isHistorical
                  ? country.countryId
                  : undefined,
                commander: country.commander,
                commanderPersonId: country.commanderPersonId,
                forces: country.forces,
                participationType: mapToParticipationType(
                  country.participation,
                ) as never,
                joinDate: country.joinDate,
                withdrawDate: country.withdrawDate,
                description: country.description,
              })),
            }))
          : undefined,

      // 국가 관계 변환 (실제 데이터가 있을 때만)
      relations:
        belligerentsGraph?.relations && belligerentsGraph.relations.length > 0
          ? belligerentsGraph.relations.map((relation) => {
              const fromCountryInfo = belligerentsGraph.countries.find(
                (country) => country.countryId === relation.fromCountry,
              )
              const toCountryInfo = belligerentsGraph.countries.find(
                (country) => country.countryId === relation.toCountry,
              )

              return {
                fromCountryId:
                  fromCountryInfo && !fromCountryInfo.isHistorical
                    ? relation.fromCountry
                    : undefined,
                fromHistoricalCountryId: fromCountryInfo?.isHistorical
                  ? relation.fromCountry
                  : undefined,
                toCountryId:
                  toCountryInfo && !toCountryInfo.isHistorical
                    ? relation.toCountry
                    : undefined,
                toHistoricalCountryId: toCountryInfo?.isHistorical
                  ? relation.toCountry
                  : undefined,
                relationType: mapToRelationType(relation.relationType) as never,
                startDate: relation.startDate,
                endDate: relation.endDate,
                strength: relation.strength,
                description: relation.description,
              }
            })
          : undefined,

      // 군사 상세 정보 변환 (실제 데이터가 있을 때만)
      militaryDetails:
        militaryDetails &&
        (militaryDetails.type ||
          militaryDetails.combatType?.length ||
          militaryDetails.objective ||
          militaryDetails.tactics ||
          militaryDetails.strategy ||
          militaryDetails.outcome ||
          militaryDetails.territoryChanges ||
          militaryDetails.treaty ||
          militaryDetails.strategicImpact)
          ? {
              conflictType: mapToConflictType(militaryDetails.type) as never,
              combatTypes: mapToCombatTypes(
                militaryDetails.combatType || [],
              ) as never[],
              objective: militaryDetails.objective || undefined,
              tactics: militaryDetails.tactics || undefined,
              strategy: militaryDetails.strategy || undefined,
              outcome: militaryDetails.outcome || undefined,
              territoryChanges: militaryDetails.territoryChanges || undefined,
              treaty: militaryDetails.treaty || undefined,
              strategicImpact: militaryDetails.strategicImpact || undefined,
            }
          : undefined,

      // 피해 규모 변환 (실제 데이터가 있을 때만)
      casualties:
        casualties && Object.keys(casualties).length > 0
          ? Object.entries(casualties).map(([sideName, casualty]) => ({
              sideName,
              totalKilled: casualty.total,
              totalWounded: casualty.military?.wounded || '0',
              countries: [],
            }))
          : undefined,

      // 전쟁 비용 (실제 데이터가 있을 때만)
      warCost: warCost || undefined,
    }

    setMilitaryEvent(updatedMilitaryEvent as MilitaryEvent)
  }, [
    belligerents,
    belligerentsGraph,
    militaryDetails,
    casualties,
    warCost,
    setMilitaryEvent,
  ])

  // 레거시 belligerents 업데이트 헬퍼 함수
  const updateBelligerents = (
    newSides: SimplifiedBelligerentSide[],
    newCountryData: Record<string, CountryDetailData>,
  ) => {
    if (!setBelligerents) return

    const updated: BelligerentSide[] = newSides.map((side) => ({
      id: side.id,
      name: side.name,
      level: side.level,
      commander: '',
      commanderPersonId: undefined,
      forces: '',
      countries: side.countryIds
        .map((countryId) => {
          const country = newCountryData[countryId]
          if (!country) return null
          return {
            countryId: country.countryId,
            countryName: country.countryName,
            isHistorical: country.isHistorical,
            joinDate: country.joinDate,
            withdrawDate: country.withdrawDate,
            participation: country.participation,
          }
        })
        .filter((country): country is CountryParticipation => country !== null),
    }))

    setBelligerents(updated)
  }

  // ============================================
  // 헬퍼 함수들
  // ============================================

  // 진영 추가
  const addSide = () => {
    playClickSound()
    const newId = Date.now().toString()
    const newSides = [
      ...actualSides,
      {
        id: newId,
        name: newSideName || '새 진영',
        countryIds: [],
        level: (parentEvent ? undefined : 'coalition') as
          | 'coalition'
          | 'country'
          | 'force'
          | undefined,
      },
    ]
    updateBelligerents(newSides, actualCountryData)
    setExpandedSides(new Set([...expandedSides, newId]))
    setNewSideName('')
    setShowAddSideModal(false)
  }

  // 진영 수정 시작 (레거시 모드)
  const startEditSide = (sideId: string) => {
    const side = belligerents?.find((s) => s.id === sideId)
    if (side) {
      setEditingSideId(sideId)
      setEditSideName(side.name)
      setEditSideColor((side as any).color || '')
      setEditSideDescription((side as any).description || '')
      setIsGraphMode(false)
      setShowEditSideModal(true)
    }
  }

  // 진영 수정 시작 (그래프 모드)
  const startEditSideGraph = (sideId: string) => {
    if (!belligerentsGraph || !setBelligerentsGraph) return
    const side = belligerentsGraph.manualSides?.find((s) => s.id === sideId)
    if (side) {
      setEditingSideId(sideId)
      setEditSideName(side.name)
      setEditSideColor((side as any).color || '')
      setEditSideDescription((side as any).description || '')
      setIsGraphMode(true)
      setShowEditSideModal(true)
    }
  }

  // 진영 수정 완료
  const updateSide = () => {
    if (!editingSideId) return
    playClickSound()

    if (isGraphMode && belligerentsGraph && setBelligerentsGraph) {
      // 그래프 모드
      const updatedSides = (belligerentsGraph.manualSides || []).map((s) =>
        s.id === editingSideId
          ? {
              ...s,
              name: editSideName,
              color: editSideColor,
              description: editSideDescription,
            }
          : s,
      )
      setBelligerentsGraph({
        ...belligerentsGraph,
        manualSides: updatedSides,
      })
    } else if (!isGraphMode && setBelligerents) {
      // 레거시 모드
      const updated = belligerents.map((s) =>
        s.id === editingSideId
          ? {
              ...s,
              name: editSideName,
              color: editSideColor,
              description: editSideDescription,
            }
          : s,
      )
      setBelligerents(updated)
    }

    setShowEditSideModal(false)
    setEditingSideId(null)
    setEditSideName('')
    setEditSideColor('')
    setEditSideDescription('')
    setIsGraphMode(false)
  }

  // 진영 제거
  const removeSide = (sideId: string) => {
    const newSides = actualSides.filter((side) => side.id !== sideId)
    updateBelligerents(newSides, actualCountryData)
    const newExpanded = new Set(expandedSides)
    newExpanded.delete(sideId)
    setExpandedSides(newExpanded)
  }

  // 진영에 국가 추가
  const addCountryToSide = (
    sideId: string,
    countryId: string,
    countryName: string,
    isHistorical: boolean,
  ) => {
    // 진영에 국가 ID 추가
    const newSides = actualSides.map((side) =>
      side.id === sideId
        ? { ...side, countryIds: [...side.countryIds, countryId] }
        : side,
    )

    // 국가 데이터에 추가 (아직 없으면)
    const newCountryData = { ...actualCountryData }
    if (!newCountryData[countryId]) {
      newCountryData[countryId] = {
        countryId,
        countryName,
        isHistorical,
      }
    }

    updateBelligerents(newSides, newCountryData)
  }

  // 진영에서 국가 제거
  const removeCountryFromSide = (sideId: string, countryId: string) => {
    const newSides = actualSides.map((side) =>
      side.id === sideId
        ? {
            ...side,
            countryIds: side.countryIds.filter((id) => id !== countryId),
          }
        : side,
    )

    // 다른 진영에서도 사용하지 않으면 국가 데이터 제거
    const isUsedInOtherSides = newSides.some(
      (side) => side.id !== sideId && side.countryIds.includes(countryId),
    )

    const newCountryData = { ...actualCountryData }
    if (!isUsedInOtherSides) {
      delete newCountryData[countryId]
    }

    updateBelligerents(newSides, newCountryData)
  }

  // 국가 정보 업데이트
  const updateCountryData = (
    countryId: string,
    updates: Partial<CountryDetailData>,
  ) => {
    const newCountryData = {
      ...actualCountryData,
      [countryId]: {
        ...actualCountryData[countryId],
        ...updates,
      },
    }
    updateBelligerents(actualSides, newCountryData)
  }

  // 특정 진영의 국가 목록 가져오기
  const getCountriesForSide = (sideId: string): CountryDetailData[] => {
    const side = actualSides.find((s) => s.id === sideId)
    if (!side) return []

    return side.countryIds
      .map((countryId) => actualCountryData[countryId])
      .filter((country): country is CountryDetailData => country !== undefined)
  }

  // 모든 참전 국가 목록 가져오기 (중복 제거)
  const getAllParticipatingCountries = (): CountryDetailData[] => {
    const allCountryIds = new Set<string>()
    actualSides.forEach((side) => {
      side.countryIds.forEach((countryId) => allCountryIds.add(countryId))
    })

    return Array.from(allCountryIds)
      .map((countryId) => actualCountryData[countryId])
      .filter((country): country is CountryDetailData => country !== undefined)
  }

  // ============================================
  // 레거시 헬퍼 함수들 (하위 호환성)
  // ============================================

  // 실제 사용할 belligerents (fallback)
  const actualBelligerents = belligerents || []
  const actualSetBelligerents = setBelligerents || (() => {})
  const actualCasualties = casualties || {}
  const actualSetCasualties = setCasualties || (() => {})

  // 부대 선택 모달
  const [unitSelectionOpen, setUnitSelectionOpen] = useState<{
    sideId: string | null
    open: boolean
  }>({ sideId: null, open: false })
  const [unitSearchQuery, setUnitSearchQuery] = useState('')

  // 지휘관 선택 모달
  const [commanderSelectionOpen, setCommanderSelectionOpen] = useState<{
    sideId: string | null
    open: boolean
  }>({ sideId: null, open: false })
  const [commanderSearchQuery, setCommanderSearchQuery] = useState('')

  // 세력 추가
  const addBelligerent = () => {
    playClickSound()
    if (!setBelligerents) return

    const newId = Date.now().toString()
    actualSetBelligerents([
      ...actualBelligerents,
      {
        id: newId,
        name: '',
        countries: [],
        commander: '',
        forces: '',
        level: (parentEvent ? undefined : 'coalition') as
          | 'coalition'
          | 'country'
          | 'force'
          | undefined,
      },
    ])
    setExpandedSides(new Set([...expandedSides, newId]))
  }

  // 하위 세력 추가 (부모 진영에 속하는)
  const addSubForce = (parentSideId: string, parentSideName: string) => {
    playClickSound()
    if (!setBelligerents) return

    const newId = Date.now().toString()
    actualSetBelligerents([
      ...actualBelligerents,
      {
        id: newId,
        name: '',
        countries: [],
        commander: '',
        forces: '',
        parentSideId,
        level: 'country',
      },
    ])
    setExpandedSides(new Set([...expandedSides, newId]))
  }

  // 진영 색상 가져오기
  const getSideColor = (sideName: string): string => {
    const lowerName = sideName.toLowerCase()
    if (lowerName.includes('연합') || lowerName.includes('allies')) {
      return '#3b82f6' // 파란색
    }
    if (lowerName.includes('추축') || lowerName.includes('axis')) {
      return '#ef4444' // 빨간색
    }
    if (lowerName.includes('동맹') || lowerName.includes('coalition')) {
      return '#10b981' // 초록색
    }
    return '#6366f1' // 기본 보라색
  }

  // 하위 세력 필드 렌더링 (공통 로직)
  const renderSubForceFields = (side: BelligerentSide) => {
    return (
      <>
        {/* 지휘관 */}
        <InputGroup>
          <InputLabel>지휘관</InputLabel>
          <CommanderSelectButton
            type="button"
            onClick={() => {
              playClickSound()
              setCommanderSelectionOpen({ sideId: side.id, open: true })
            }}
          >
            {side.commander || '지휘관 선택'}
          </CommanderSelectButton>
        </InputGroup>

        {/* 병력 규모 */}
        <InputGroup>
          <InputLabel>병력 규모</InputLabel>
          <Input
            type="text"
            placeholder="예: 1,000,000명"
            value={side.forces}
            onChange={(event) => {
              if (!belligerents || !setBelligerents) return
              const updated = belligerents.map((currentSide) =>
                currentSide.id === side.id
                  ? { ...currentSide, forces: event.target.value }
                  : currentSide,
              )
              setBelligerents(updated)
            }}
          />
        </InputGroup>

        {/* 투입 부대 */}
        <InputGroup>
          <InputLabel>투입 부대</InputLabel>
          <UnitSelectButton
            type="button"
            onClick={() => {
              playClickSound()
              setUnitSelectionOpen({ sideId: side.id, open: true })
            }}
          >
            {side.deployedUnits && side.deployedUnits.length > 0
              ? `${side.deployedUnits.length}개 부대 선택됨`
              : '부대 선택'}
          </UnitSelectButton>
        </InputGroup>

        {/* 사용 무기/장비 */}
        <InputGroup>
          <InputLabel>사용 무기/장비</InputLabel>
          <Input
            type="text"
            placeholder="예: 7TP 탱크, PZL P.11 전투기 (쉼표로 구분)"
            value={side.weaponsUsed?.join(', ') || ''}
            onChange={(event) => {
              if (!belligerents || !setBelligerents) return
              const weapons = event.target.value
                .split(',')
                .map((weapon) => weapon.trim())
                .filter((weapon) => weapon)
              const updated = belligerents.map((currentSide) =>
                currentSide.id === side.id
                  ? { ...currentSide, weaponsUsed: weapons }
                  : currentSide,
              )
              setBelligerents(updated)
            }}
          />
        </InputGroup>

        {/* 세력 설명 */}
        <InputGroup>
          <InputLabel>세력 설명</InputLabel>
          <TextArea
            rows={2}
            placeholder="이 세력의 역할, 목표, 특징 등"
            value={side.description || ''}
            onChange={(event) => {
              if (!belligerents || !setBelligerents) return
              const updated = belligerents.map((currentSide) =>
                currentSide.id === side.id
                  ? { ...currentSide, description: event.target.value }
                  : currentSide,
              )
              setBelligerents(updated)
            }}
          />
        </InputGroup>

        {/* 피해 규모 */}
        {casualties && setCasualties && (
          <>
            <CasualtyLabel>피해 규모</CasualtyLabel>
            <CasualtyGrid>
              <CasualtyInputField
                label="전사"
                value={casualties[side.id]?.military.killed || ''}
                onChange={(value) => {
                  const newCasualties = {
                    ...casualties,
                    [side.id]: {
                      ...(casualties[side.id] || {
                        military: {
                          killed: '',
                          wounded: '',
                          missing: '',
                          captured: '',
                        },
                        total: '',
                      }),
                      military: {
                        ...(casualties[side.id]?.military || {
                          killed: '',
                          wounded: '',
                          missing: '',
                          captured: '',
                        }),
                        killed: value,
                      },
                    },
                  }
                  setCasualties(newCasualties)
                }}
              />
              <CasualtyInputField
                label="부상"
                value={casualties[side.id]?.military.wounded || ''}
                onChange={(value) => {
                  const newCasualties = {
                    ...casualties,
                    [side.id]: {
                      ...(casualties[side.id] || {
                        military: {
                          killed: '',
                          wounded: '',
                          missing: '',
                          captured: '',
                        },
                        total: '',
                      }),
                      military: {
                        ...(casualties[side.id]?.military || {
                          killed: '',
                          wounded: '',
                          missing: '',
                          captured: '',
                        }),
                        wounded: value,
                      },
                    },
                  }
                  setCasualties(newCasualties)
                }}
              />
              <CasualtyInputField
                label="실종"
                value={casualties[side.id]?.military.missing || ''}
                onChange={(value) => {
                  const newCasualties = {
                    ...casualties,
                    [side.id]: {
                      ...(casualties[side.id] || {
                        military: {
                          killed: '',
                          wounded: '',
                          missing: '',
                          captured: '',
                        },
                        total: '',
                      }),
                      military: {
                        ...(casualties[side.id]?.military || {
                          killed: '',
                          wounded: '',
                          missing: '',
                          captured: '',
                        }),
                        missing: value,
                      },
                    },
                  }
                  setCasualties(newCasualties)
                }}
              />
              <CasualtyInputField
                label="포로"
                value={casualties[side.id]?.military.captured || ''}
                onChange={(value) => {
                  const newCasualties = {
                    ...casualties,
                    [side.id]: {
                      ...(casualties[side.id] || {
                        military: {
                          killed: '',
                          wounded: '',
                          missing: '',
                          captured: '',
                        },
                        total: '',
                      }),
                      military: {
                        ...(casualties[side.id]?.military || {
                          killed: '',
                          wounded: '',
                          missing: '',
                          captured: '',
                        }),
                        captured: value,
                      },
                    },
                  }
                  setCasualties(newCasualties)
                }}
              />
            </CasualtyGrid>
          </>
        )}
      </>
    )
  }

  // 간단한 피해 입력 필드 컴포넌트
  const CasualtyInputField: React.FC<{
    label: string
    value: string
    onChange: (value: string) => void
  }> = ({ label, value, onChange }) => (
    <div>
      <CasualtyLabel>{label}</CasualtyLabel>
      <CasualtyInput
        type="text"
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )

  // 세력 삭제
  const removeBelligerent = (id: string) => {
    playClickSound()
    if (!belligerents || !setBelligerents || !casualties || !setCasualties)
      return
    setBelligerents(belligerents.filter((side) => side.id !== id))
    const newCasualties = { ...casualties }
    delete newCasualties[id]
    setCasualties(newCasualties)
    const newExpanded = new Set(expandedSides)
    newExpanded.delete(id)
    setExpandedSides(newExpanded)
  }

  // 참전 국가 추가 (레거시 - 모달 열기용)
  const openCountryModal = (sideId: string) => {
    if (!sideId) return

    playClickSound()
    setSelectedSideForCountry(sideId)
    setSelectedCountryIndex(null)
    setTimeout(() => setCountryModalOpen(true), 0)
  }

  // 참전 국가 선택 (모달에서)
  const handleCountrySelect = (country: {
    id: string
    name: string
    isHistorical: boolean
  }) => {
    if (!selectedSideForCountry) return

    if (belligerents && setBelligerents) {
      const updated = belligerents.map((side) => {
        if (side.id === selectedSideForCountry) {
          if (selectedCountryIndex !== null) {
            const newCountries = [...side.countries]
            newCountries[selectedCountryIndex] = {
              ...newCountries[selectedCountryIndex],
              countryId: country.id,
              countryName: country.name,
              isHistorical: country.isHistorical,
            }
            return { ...side, countries: newCountries }
          } else {
            return {
              ...side,
              countries: [
                ...side.countries,
                {
                  countryId: country.id,
                  countryName: country.name,
                  isHistorical: country.isHistorical,
                  joinDate: '',
                  joinReason: '',
                },
              ],
            }
          }
        }
        return side
      })
      setBelligerents(updated)
    } else {
      addCountryToSide(
        selectedSideForCountry,
        country.id,
        country.name,
        country.isHistorical,
      )
    }

    // 모달 닫기
    setCountryModalOpen(false)
    setSelectedSideForCountry(null)
    setSelectedCountryIndex(null)
  }

  // 참전 국가 변경 (기존 국가 클릭 시)
  const changeCountry = (sideId: string, countryIndex: number) => {
    playClickSound()
    setSelectedSideForCountry(sideId)
    setSelectedCountryIndex(countryIndex)
    setCountryModalOpen(true)
  }

  // 날짜/시간 헬퍼 함수
  const getDateFromISO = (isoString?: string): string => {
    if (!isoString) return ''
    try {
      const date = new Date(isoString)
      if (isNaN(date.getTime())) return ''
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch {
      return ''
    }
  }

  const getTimeFromISO = (isoString?: string): string => {
    if (!isoString) return ''
    try {
      const date = new Date(isoString)
      if (isNaN(date.getTime())) return ''
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      if (hours === '00' && minutes === '00') return ''
      return `${hours}:${minutes}`
    } catch {
      return ''
    }
  }

  const combineDateTime = (
    date: string,
    time: string,
    oldValue?: string,
  ): string => {
    if (!date) return oldValue || ''
    if (!time) return `${date}T00:00:00.000Z`
    return `${date}T${time}:00.000Z`
  }

  // 참전 국가 제거 (레거시)
  const removeCountryFromSideLegacy = (
    sideId: string,
    countryIndex: number,
  ) => {
    playClickSound()
    if (!belligerents || !setBelligerents) return

    const updated = belligerents.map((side) => {
      if (side.id === sideId) {
        return {
          ...side,
          countries: side.countries.filter((_, idx) => idx !== countryIndex),
        }
      }
      return side
    })
    setBelligerents(updated)
  }

  // 세력 확장/축소 토글
  const toggleExpand = (sideId: string) => {
    const newExpanded = new Set(expandedSides)
    if (newExpanded.has(sideId)) {
      newExpanded.delete(sideId)
    } else {
      newExpanded.add(sideId)
    }
    setExpandedSides(newExpanded)
  }

  return (
    <>
      {/* 탭 네비게이션 */}
      <div style={{ marginBottom: '24px' }}>
        <TabsContainer>
          <TabButton
            type="button"
            $active={activeTab === 'belligerents'}
            onClick={() => {
              playClickSound()
              setActiveTab('belligerents')
            }}
          >
            <TabIcon $active={activeTab === 'belligerents'}>
              <FiShield size={18} />
            </TabIcon>
            <TabLabel $active={activeTab === 'belligerents'}>
              교전 세력 & 관계도
            </TabLabel>
          </TabButton>

          <TabButton
            type="button"
            $active={activeTab === 'details'}
            onClick={() => {
              playClickSound()
              setActiveTab('details')
            }}
          >
            <TabIcon $active={activeTab === 'details'}>
              <FiInfo size={18} />
            </TabIcon>
            <TabLabel $active={activeTab === 'details'}>상세 정보</TabLabel>
          </TabButton>
        </TabsContainer>
      </div>

      {/* 탭 컨텐츠 */}
      {/* 교전 세력 탭 */}
      {activeTab === 'belligerents' && (
        <>
          {/* 안내 메시지 */}
          <InfoBox>
            <InfoIconWrapper>
              <FiShield size={20} />
            </InfoIconWrapper>
            <InfoContent>
              <InfoTitle>교전 세력 및 관계도 입력 가이드</InfoTitle>
              <InfoDescription>
                전투에 참여한 진영과 국가를 등록하고, 그들 간의 관계를
                설정하세요.
              </InfoDescription>
              <InfoExamples>
                <InfoExample>
                  <strong>1단계:</strong> 진영 추가 버튼을 눌러 교전 진영을
                  생성하세요 (예: 연합군, 추축국)
                </InfoExample>
                <InfoExample>
                  <strong>2단계:</strong> 국가 추가 버튼을 눌러 참전 국가를
                  등록하고 진영을 선택하세요
                </InfoExample>
                <InfoExample>
                  <strong>3단계:</strong> 각 국가를 클릭하여 지휘관, 병력 규모,
                  참전/철수 날짜를 입력하세요
                </InfoExample>
                <InfoExample>
                  <strong>4단계:</strong> 국가 간 관계 설정에서 동맹, 적대 등의
                  관계를 연결하세요
                </InfoExample>
              </InfoExamples>
            </InfoContent>
          </InfoBox>

          {/* 교전 세력 (통합 - 그래프 기반) */}
          {belligerentsGraph && setBelligerentsGraph ? (
            <FormGroup>
              <SectionHeaderWithActions>
                <div>
                  <Label>
                    <FiShield size={18} color={COLORS.primary} />
                    교전 세력 및 관계도
                    <RequiredBadge>필수</RequiredBadge>
                    <Tooltip text="전투에 참여한 진영과 국가, 그리고 그들 간의 관계를 입력하세요">
                      <FiHelpCircle
                        size={14}
                        color={COLORS.textLight}
                        style={{ cursor: 'help' }}
                      />
                    </Tooltip>
                  </Label>
                  <Hint>
                    ① 진영 추가 → ② 국가 등록 (진영 선택) → ③ 세부 정보 입력
                  </Hint>
                </div>
              </SectionHeaderWithActions>

              {/* 전체 섹션을 하나의 컨테이너로 */}
              <div
                style={{
                  background: 'transparent',
                  borderRadius: '12px',
                  padding: '0',
                }}
              >
                {/* 1단계: 진영 설정 */}
                <div style={{ marginBottom: '32px' }}>
                  {/* 섹션 헤더 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '20px 24px',
                      background: '#fafbfc',
                      border: '1px solid #e5e7eb',
                      borderBottom: 'none',
                      borderRadius: '12px 12px 0 0',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '40px',
                          height: '40px',
                          background: '#8b5cf6',
                          borderRadius: '10px',
                        }}
                      >
                        <FiShield size={20} color="white" strokeWidth={2} />
                      </div>
                      <div>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: '16px',
                            fontWeight: 600,
                            color: '#0f172a',
                          }}
                        >
                          교전 진영 설정
                        </h3>
                        <p
                          style={{
                            margin: '4px 0 0 0',
                            fontSize: '13px',
                            color: '#64748b',
                          }}
                        >
                          참전 진영을 등록하고 국가를 분류하세요
                        </p>
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '8px 16px',
                        background: 'white',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#64748b',
                          fontWeight: 500,
                          marginBottom: '2px',
                        }}
                      >
                        진영 수
                      </div>
                      <div
                        style={{
                          fontSize: '20px',
                          fontWeight: 700,
                          color: '#0f172a',
                          lineHeight: 1,
                        }}
                      >
                        {(belligerentsGraph.manualSides || []).length}
                      </div>
                    </div>
                  </div>

                  {/* 진영 카드 컨테이너 */}
                  <div
                    style={{
                      background: 'white',
                      padding: '24px',
                      border: '1px solid #e5e7eb',
                      borderTop: 'none',
                      borderRadius: '0 0 12px 12px',
                    }}
                  >
                    {(belligerentsGraph.manualSides || []).length === 0 ? (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '48px 20px',
                          background: '#fafbfc',
                          borderRadius: '8px',
                          border: '1px dashed #cbd5e1',
                        }}
                      >
                        <div
                          style={{
                            width: '64px',
                            height: '64px',
                            margin: '0 auto 16px',
                            background: '#f1f5f9',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <FiShield size={28} color="#6366f1" />
                        </div>
                        <h4
                          style={{
                            margin: '0 0 6px 0',
                            fontSize: '15px',
                            fontWeight: 600,
                            color: '#0f172a',
                          }}
                        >
                          진영을 추가하여 시작하세요
                        </h4>
                        <p
                          style={{
                            margin: '0 0 20px 0',
                            fontSize: '13px',
                            color: '#64748b',
                            lineHeight: 1.5,
                          }}
                        >
                          연합군, 추축국 등 교전 진영을 등록하세요
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            playClickSound()
                            setShowAddSideModal(true)
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 24px',
                            background: '#8b5cf6',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 600,
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#7c3aed'
                            e.currentTarget.style.transform = 'translateY(-1px)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#8b5cf6'
                            e.currentTarget.style.transform = 'translateY(0)'
                          }}
                        >
                          <FiPlus size={16} />
                          <span>진영 추가</span>
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            'repeat(auto-fill, minmax(300px, 1fr))',
                          gap: '16px',
                        }}
                      >
                        {(belligerentsGraph.manualSides || []).map(
                          (side, index) => {
                            const sideColor = (side as any).color
                            const countriesInSide =
                              belligerentsGraph.countries.filter(
                                (c) => c.role === side.name,
                              ).length

                            return (
                              <div
                                key={side.id}
                                style={{
                                  background: 'white',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '10px',
                                  overflow: 'hidden',
                                  transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor = '#cbd5e1'
                                  e.currentTarget.style.transform =
                                    'translateY(-2px)'
                                  e.currentTarget.style.boxShadow =
                                    '0 4px 12px rgba(0,0,0,0.08)'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor = '#e5e7eb'
                                  e.currentTarget.style.transform =
                                    'translateY(0)'
                                  e.currentTarget.style.boxShadow = 'none'
                                }}
                              >
                                {/* 상단 색상 바 */}
                                {sideColor && (
                                  <div
                                    style={{
                                      height: '4px',
                                      background: sideColor,
                                    }}
                                  />
                                )}

                                {/* 헤더 */}
                                <div style={{ padding: '20px' }}>
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: '12px',
                                      marginBottom: '12px',
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: '44px',
                                        height: '44px',
                                        background: sideColor
                                          ? `${sideColor}15`
                                          : '#f1f5f9',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                      }}
                                    >
                                      <FiShield
                                        size={22}
                                        color={sideColor || '#6366f1'}
                                      />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div
                                        style={{
                                          fontSize: '16px',
                                          fontWeight: 600,
                                          color: '#0f172a',
                                          marginBottom: '6px',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        {side.name}
                                      </div>
                                      <div
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '4px 8px',
                                          background: '#f1f5f9',
                                          borderRadius: '6px',
                                          fontSize: '12px',
                                          fontWeight: 500,
                                          color: '#64748b',
                                        }}
                                      >
                                        <FiUsers size={12} />
                                        <span>{countriesInSide}개 국가</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* 색상 정보 */}
                                  {sideColor && (
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '10px 12px',
                                        background: '#fafbfc',
                                        borderRadius: '8px',
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: '28px',
                                          height: '28px',
                                          background: sideColor,
                                          borderRadius: '6px',
                                          border: '1px solid rgba(0,0,0,0.1)',
                                          flexShrink: 0,
                                        }}
                                      />
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                          style={{
                                            fontSize: '12px',
                                            color: '#64748b',
                                            fontWeight: 500,
                                          }}
                                        >
                                          진영 색상
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* 진영 설명 */}
                                  {(side as any).description && (
                                    <div
                                      style={{
                                        marginTop: '12px',
                                        padding: '12px',
                                        background: '#fafbfc',
                                        borderRadius: '8px',
                                        border: '1px solid #f1f5f9',
                                      }}
                                    >
                                      <div
                                        style={{
                                          fontSize: '11px',
                                          color: '#64748b',
                                          fontWeight: 500,
                                          marginBottom: '6px',
                                        }}
                                      >
                                        설명
                                      </div>
                                      <div
                                        style={{
                                          fontSize: '13px',
                                          color: '#475569',
                                          lineHeight: 1.5,
                                        }}
                                      >
                                        {(side as any).description}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* 액션 버튼 */}
                                <div
                                  style={{
                                    padding: '12px 20px',
                                    background: '#fafbfc',
                                    borderTop: '1px solid #f1f5f9',
                                    display: 'flex',
                                    gap: '8px',
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      playClickSound()
                                      startEditSideGraph(side.id)
                                    }}
                                    style={{
                                      flex: 1,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '6px',
                                      padding: '10px 16px',
                                      background: 'white',
                                      border: '1px solid #e5e7eb',
                                      borderRadius: '8px',
                                      color: '#0f172a',
                                      fontSize: '13px',
                                      fontWeight: 500,
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background =
                                        '#8b5cf6'
                                      e.currentTarget.style.color = 'white'
                                      e.currentTarget.style.borderColor =
                                        '#8b5cf6'
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = 'white'
                                      e.currentTarget.style.color = '#0f172a'
                                      e.currentTarget.style.borderColor =
                                        '#e5e7eb'
                                    }}
                                  >
                                    <FiEdit2 size={14} />
                                    <span>수정</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      playClickSound()
                                      const newSides = (
                                        belligerentsGraph.manualSides || []
                                      ).filter((s) => s.id !== side.id)
                                      setBelligerentsGraph({
                                        ...belligerentsGraph,
                                        manualSides: newSides,
                                      })
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      padding: '10px',
                                      background: 'white',
                                      border: '1px solid #e5e7eb',
                                      borderRadius: '8px',
                                      color: '#64748b',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                    }}
                                    title="삭제"
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background =
                                        '#fee2e2'
                                      e.currentTarget.style.color = '#ef4444'
                                      e.currentTarget.style.borderColor =
                                        '#fecaca'
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = 'white'
                                      e.currentTarget.style.color = '#64748b'
                                      e.currentTarget.style.borderColor =
                                        '#e5e7eb'
                                    }}
                                  >
                                    <FiTrash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            )
                          },
                        )}
                        {/* 진영 추가 카드 */}
                        <div
                          style={{
                            background: '#fafbfc',
                            border: '1px dashed #cbd5e1',
                            borderRadius: '10px',
                            padding: '32px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            minHeight: '200px',
                          }}
                          onClick={() => {
                            playClickSound()
                            setShowAddSideModal(true)
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'white'
                            e.currentTarget.style.borderColor = '#8b5cf6'
                            e.currentTarget.style.borderStyle = 'solid'
                            e.currentTarget.style.transform = 'translateY(-2px)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#fafbfc'
                            e.currentTarget.style.borderColor = '#cbd5e1'
                            e.currentTarget.style.borderStyle = 'dashed'
                            e.currentTarget.style.transform = 'translateY(0)'
                          }}
                        >
                          <div
                            style={{
                              width: '48px',
                              height: '48px',
                              background: '#f1f5f9',
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <FiPlus size={24} color="#8b5cf6" />
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div
                              style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: '#0f172a',
                                marginBottom: '4px',
                              }}
                            >
                              진영 추가
                            </div>
                            <div
                              style={{
                                fontSize: '12px',
                                color: '#64748b',
                              }}
                            >
                              새 진영 등록
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 구분선 */}
                <div
                  style={{
                    height: '1px',
                    background: COLORS.border,
                    margin: '24px 0',
                  }}
                />

                {/* 2단계: 관계도 그래프 */}
                {belligerentsGraph.countries.length > 0 && (
                  <>
                    <div style={{ marginBottom: '32px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '16px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            background: COLORS.successLight,
                            borderRadius: '50%',
                          }}
                        >
                          <FiGlobe size={14} color={COLORS.success} />
                        </div>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: '15px',
                            fontWeight: 600,
                            color: COLORS.text,
                          }}
                        >
                          관계도 그래프
                        </h3>
                        <Tooltip text="국가 간 관계를 시각적으로 보여줍니다. 노드를 드래그하여 위치를 조정할 수 있습니다.">
                          <FiHelpCircle
                            size={14}
                            color={COLORS.textLight}
                            style={{ cursor: 'help' }}
                          />
                        </Tooltip>
                      </div>
                      <BelligerentsGraphVisualization
                        graph={belligerentsGraph}
                        width={800}
                        height={500}
                      />
                    </div>

                    {/* 구분선 */}
                    <div
                      style={{
                        height: '1px',
                        background: COLORS.border,
                        margin: '24px 0',
                      }}
                    />
                  </>
                )}

                {/* 3단계: 국가 입력 */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '16px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        background: COLORS.infoLight,
                        borderRadius: '50%',
                      }}
                    >
                      <FiUsers size={14} color={COLORS.info} />
                    </div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '15px',
                        fontWeight: 600,
                        color: COLORS.text,
                      }}
                    >
                      ② 참전 국가 등록
                    </h3>
                    <Tooltip text="각 국가를 추가하고, 진영을 선택한 후 병력, 지휘관 등의 세부 정보를 입력하세요">
                      <FiHelpCircle
                        size={14}
                        color={COLORS.textLight}
                        style={{ cursor: 'help' }}
                      />
                    </Tooltip>
                  </div>

                  {/* 국가 입력 폼 */}
                  <BelligerentsGraphForm
                    value={belligerentsGraph}
                    onChange={setBelligerentsGraph}
                    sides={belligerentsGraph.manualSides || []}
                    availableCountries={availableCountries.map((country) => ({
                      ...country,
                      isHistorical: false,
                    }))}
                    availableHistoricalCountries={availableHistoricalCountries.map(
                      (historicalCountry) => ({
                        ...historicalCountry,
                        isHistorical: true,
                      }),
                    )}
                    // 상위 사건의 관계 상속
                    parentRelations={
                      parentEvent?.belligerents &&
                      'relations' in parentEvent.belligerents
                        ? (parentEvent.belligerents as any).relations || []
                        : []
                    }
                    // 하위 사건들의 관계
                    childRelations={childEventsRelations}
                  />
                </div>
              </div>
            </FormGroup>
          ) : (
            /* 레거시 호환용 (기존 진영 시스템) */
            <FormGroup>
              <SectionHeaderWithActions>
                <div>
                  <Label>
                    교전 세력 <RequiredBadge>최소 2개 진영</RequiredBadge>
                  </Label>
                  <Hint>
                    {parentEvent
                      ? '상위 사건의 진영을 기반으로 구체적인 참전 세력을 입력하세요'
                      : '진영을 추가하고, 참전 국가 정보를 입력하세요'}
                  </Hint>
                </div>
                {!parentEvent && actualBelligerents.length === 0 && (
                  <QuickTemplateButton
                    type="button"
                    onClick={() => {
                      playClickSound()
                      if (!setBelligerents) return
                      const side1Id = `side-${Date.now()}`
                      const side2Id = `side-${Date.now() + 1}`

                      const newSides = [
                        {
                          id: side1Id,
                          name: '진영 1',
                          countries: [],
                          commander: '',
                          forces: '',
                          level: 'coalition' as const,
                        },
                        {
                          id: side2Id,
                          name: '진영 2',
                          countries: [],
                          commander: '',
                          forces: '',
                          level: 'coalition' as const,
                        },
                      ]

                      actualSetBelligerents(newSides)
                      setExpandedSides(new Set([side1Id, side2Id]))
                    }}
                  >
                    <FiPlus size={16} />
                    2진영 빠른 시작
                  </QuickTemplateButton>
                )}
              </SectionHeaderWithActions>

              {/* 부모 사건이 있는 경우: 부모 진영 표시 */}
              {parentEvent && parentEvent.belligerents?.sides && (
                <ParentEventInfo>
                  <InfoIcon>
                    <FiInfo size={14} />
                  </InfoIcon>
                  <InfoText>
                    상위 사건 <strong>"{parentEvent.title}"</strong>의 교전
                    진영을 기반으로 합니다
                  </InfoText>
                </ParentEventInfo>
              )}

              {parentEvent && parentEvent.belligerents?.sides ? (
                // 부모 사건이 있는 경우: 부모 진영별로 하위 세력 입력
                <>
                  {Array.isArray(parentEvent.belligerents.sides) &&
                    parentEvent.belligerents.sides.map((parentSide) => (
                      <ParentSideSection key={parentSide.id}>
                        <ParentSideHeader>
                          <SideName>
                            <SideIcon $color={getSideColor(parentSide.name)} />
                            {parentSide.name}
                          </SideName>
                          <InheritedBadge>
                            <FiTarget size={10} /> 상위 진영
                          </InheritedBadge>
                        </ParentSideHeader>

                        {parentSide.countries &&
                          parentSide.countries.length > 0 && (
                            <ParentCountries>
                              {parentSide.countries
                                .map((country) => country.countryName)
                                .join(', ')}
                            </ParentCountries>
                          )}

                        <SubForcesContainer>
                          <SubForcesLabel>
                            이 진영에서 참여한 세력
                          </SubForcesLabel>

                          {belligerents
                            .filter(
                              (side) => side.parentSideId === parentSide.id,
                            )
                            .map((side, index) => (
                              <SubForceCard key={side.id}>
                                <SubForceHeader>
                                  <SubForceNumber>
                                    세력 {index + 1}
                                  </SubForceNumber>
                                  <DeleteButton
                                    type="button"
                                    onClick={() => removeBelligerent(side.id)}
                                  >
                                    <FiTrash2 size={14} />
                                  </DeleteButton>
                                </SubForceHeader>

                                <InputGroup>
                                  <InputLabel>세력/국가 이름</InputLabel>
                                  <Input
                                    type="text"
                                    placeholder="예: 폴란드, 독일, 소련"
                                    value={side.name}
                                    onChange={(e) => {
                                      const updated = belligerents.map((s) =>
                                        s.id === side.id
                                          ? { ...s, name: e.target.value }
                                          : s,
                                      )
                                      setBelligerents(updated)
                                    }}
                                  />
                                </InputGroup>

                                {/* 참전 국가 선택 (간소화) */}
                                <InputGroup>
                                  <InputLabel>국가</InputLabel>
                                  <CountrySelectButtonSimple
                                    type="button"
                                    onClick={() => {
                                      playClickSound()
                                      setSelectedSideForCountry(side.id)
                                      setSelectedCountryIndex(null)
                                      setTimeout(() => {
                                        setCountryModalOpen(true)
                                      }, 0)
                                    }}
                                  >
                                    {side.countries.length > 0
                                      ? side.countries[0].countryName
                                      : '국가 선택'}
                                  </CountrySelectButtonSimple>
                                </InputGroup>

                                {/* 나머지 입력 필드는 기존과 동일하게 유지 */}
                                {renderSubForceFields(side)}
                              </SubForceCard>
                            ))}

                          <AddSubForceButton
                            type="button"
                            onClick={() =>
                              addSubForce(parentSide.id, parentSide.name)
                            }
                          >
                            <FiPlus size={14} />
                            세력 추가
                          </AddSubForceButton>
                        </SubForcesContainer>
                      </ParentSideSection>
                    ))}
                </>
              ) : (
                // 부모 사건이 없는 경우: 기존 방식 (최상위 진영 입력)
                <>
                  {actualBelligerents.map((side, index) => (
                    <BelligerentCard key={side.id}>
                      <BelligerentHeader
                        onClick={() => toggleExpand(side.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <SideNumber>세력 {index + 1}</SideNumber>
                        <SideName>
                          <SideColorIndicator $color={(side as any).color} />
                          {side.name || '세력 이름 미입력'}
                          {side.countries.length > 0 && (
                            <CountryCount>
                              {side.countries.length}개국 참전
                            </CountryCount>
                          )}
                        </SideName>
                        <SideActions>
                          <EditButton
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              playClickSound()
                              startEditSide(side.id)
                            }}
                            title="진영 수정"
                          >
                            <FiEdit2 size={14} />
                          </EditButton>
                          <DeleteButton
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeBelligerent(side.id)
                            }}
                            title="진영 삭제"
                          >
                            <FiTrash2 size={14} />
                          </DeleteButton>
                        </SideActions>
                      </BelligerentHeader>

                      {expandedSides.has(side.id) && (
                        <BelligerentBody>
                          {/* 기본 정보 */}
                          <InputGroup>
                            <InputLabel>세력 이름</InputLabel>
                            <Input
                              type="text"
                              placeholder="예: 연합군, 추축국, 프랑스 제국"
                              value={side.name}
                              onChange={(e) => {
                                const updated = belligerents.map((s) =>
                                  s.id === side.id
                                    ? { ...s, name: e.target.value }
                                    : s,
                                )
                                setBelligerents(updated)
                              }}
                            />
                          </InputGroup>

                          {/* 참전 국가 목록 */}
                          <SectionDivider>
                            <FiGlobe size={14} />
                            <span>참전 국가</span>
                          </SectionDivider>

                          {side.countries.map((country, countryIdx) => (
                            <CountryCard key={countryIdx}>
                              <CountryCardHeader>
                                <CountryTypeToggle>
                                  <ToggleButton
                                    type="button"
                                    $active={!country.isHistorical}
                                    onClick={() => {
                                      const updated = belligerents.map((s) => {
                                        if (s.id === side.id) {
                                          const newCountries = [...s.countries]
                                          newCountries[countryIdx] = {
                                            ...newCountries[countryIdx],
                                            isHistorical: false,
                                            countryId: '',
                                            countryName: '',
                                          }
                                          return {
                                            ...s,
                                            countries: newCountries,
                                          }
                                        }
                                        return s
                                      })
                                      setBelligerents(updated)
                                    }}
                                  >
                                    현대
                                  </ToggleButton>
                                  <ToggleButton
                                    type="button"
                                    $active={country.isHistorical}
                                    onClick={() => {
                                      const updated = belligerents.map((s) => {
                                        if (s.id === side.id) {
                                          const newCountries = [...s.countries]
                                          newCountries[countryIdx] = {
                                            ...newCountries[countryIdx],
                                            isHistorical: true,
                                            countryId: '',
                                            countryName: '',
                                          }
                                          return {
                                            ...s,
                                            countries: newCountries,
                                          }
                                        }
                                        return s
                                      })
                                      setBelligerents(updated)
                                    }}
                                  >
                                    과거
                                  </ToggleButton>
                                </CountryTypeToggle>
                                <SmallDeleteButton
                                  type="button"
                                  onClick={() =>
                                    removeCountryFromSideLegacy(
                                      side.id,
                                      countryIdx,
                                    )
                                  }
                                >
                                  <FiTrash2 size={14} />
                                </SmallDeleteButton>
                              </CountryCardHeader>

                              <CountrySelectButton
                                type="button"
                                $selected={!!country.countryId}
                                onClick={() =>
                                  changeCountry(side.id, countryIdx)
                                }
                              >
                                <FiGlobe size={16} />
                                {country.countryName ||
                                  (country.isHistorical
                                    ? '역사적 국가 선택'
                                    : '현대 국가 선택')}
                              </CountrySelectButton>

                              {/* 참전 날짜 */}
                              <DateTimeGroup>
                                <DateTimeLabel>참전 날짜</DateTimeLabel>
                                <DateTimeInputs>
                                  <DateInputButton
                                    type="button"
                                    onClick={() => {
                                      playClickSound()
                                      setDateModalState({
                                        isOpen: true,
                                        type: 'join',
                                        sideId: side.id,
                                        countryIndex: countryIdx,
                                      })
                                    }}
                                  >
                                    <FiCalendar size={14} />
                                    <span>
                                      {country.joinDate
                                        ? getDateFromISO(country.joinDate)
                                        : '날짜 선택'}
                                    </span>
                                  </DateInputButton>
                                  <TimeInputButton
                                    type="button"
                                    onClick={() => {
                                      playClickSound()
                                      setTimeModalState({
                                        isOpen: true,
                                        type: 'join',
                                        sideId: side.id,
                                        countryIndex: countryIdx,
                                      })
                                    }}
                                  >
                                    <FiClock size={14} />
                                    <span>
                                      {getTimeFromISO(country.joinDate) ||
                                        '시간'}
                                    </span>
                                  </TimeInputButton>
                                </DateTimeInputs>
                              </DateTimeGroup>

                              {/* 철수 날짜 */}
                              <DateTimeGroup>
                                <DateTimeLabel>철수 날짜 (선택)</DateTimeLabel>
                                <DateTimeInputs>
                                  <DateInputButton
                                    type="button"
                                    onClick={() => {
                                      playClickSound()
                                      setDateModalState({
                                        isOpen: true,
                                        type: 'withdraw',
                                        sideId: side.id,
                                        countryIndex: countryIdx,
                                      })
                                    }}
                                  >
                                    <FiCalendar size={14} />
                                    <span>
                                      {country.withdrawDate
                                        ? getDateFromISO(country.withdrawDate)
                                        : '날짜 선택'}
                                    </span>
                                  </DateInputButton>
                                  <TimeInputButton
                                    type="button"
                                    onClick={() => {
                                      playClickSound()
                                      setTimeModalState({
                                        isOpen: true,
                                        type: 'withdraw',
                                        sideId: side.id,
                                        countryIndex: countryIdx,
                                      })
                                    }}
                                  >
                                    <FiClock size={14} />
                                    <span>
                                      {getTimeFromISO(country.withdrawDate) ||
                                        '시간'}
                                    </span>
                                  </TimeInputButton>
                                </DateTimeInputs>
                              </DateTimeGroup>

                              <SmallInput
                                type="text"
                                placeholder="참전 사유/경위 (예: 독일의 폴란드 침공 대응)"
                                value={country.joinReason || ''}
                                onChange={(e) => {
                                  const updated = belligerents.map((s) => {
                                    if (s.id === side.id) {
                                      const newCountries = [...s.countries]
                                      newCountries[countryIdx] = {
                                        ...newCountries[countryIdx],
                                        joinReason: e.target.value,
                                      }
                                      return { ...s, countries: newCountries }
                                    }
                                    return s
                                  })
                                  setBelligerents(updated)
                                }}
                              />

                              {/* 상세 정보 구분선 */}
                              <SectionDivider style={{ margin: '12px 0' }}>
                                <FiInfo size={12} />
                                <span>상세 정보</span>
                              </SectionDivider>

                              <SmallInputGrid>
                                {/* 지휘관 */}
                                <SmallInput
                                  type="text"
                                  placeholder="지휘관 (예: 더글러스 맥아더)"
                                  value={country.commander || ''}
                                  onChange={(e) => {
                                    const updated = belligerents.map((s) => {
                                      if (s.id === side.id) {
                                        const newCountries = [...s.countries]
                                        newCountries[countryIdx] = {
                                          ...newCountries[countryIdx],
                                          commander: e.target.value,
                                        }
                                        return { ...s, countries: newCountries }
                                      }
                                      return s
                                    })
                                    setBelligerents(updated)
                                  }}
                                />

                                {/* 병력 규모 */}
                                <SmallInput
                                  type="text"
                                  placeholder="병력 규모 (예: 50,000명)"
                                  value={country.forces || ''}
                                  onChange={(e) => {
                                    const updated = belligerents.map((s) => {
                                      if (s.id === side.id) {
                                        const newCountries = [...s.countries]
                                        newCountries[countryIdx] = {
                                          ...newCountries[countryIdx],
                                          forces: e.target.value,
                                        }
                                        return { ...s, countries: newCountries }
                                      }
                                      return s
                                    })
                                    setBelligerents(updated)
                                  }}
                                />

                                {/* 참여도 */}
                                <Select
                                  value={country.participation || 'full'}
                                  onChange={(e) => {
                                    const updated = belligerents.map((s) => {
                                      if (s.id === side.id) {
                                        const newCountries = [...s.countries]
                                        newCountries[countryIdx] = {
                                          ...newCountries[countryIdx],
                                          participation: e.target.value as any,
                                        }
                                        return { ...s, countries: newCountries }
                                      }
                                      return s
                                    })
                                    setBelligerents(updated)
                                  }}
                                  style={{
                                    fontSize: '13px',
                                    padding: '6px 8px',
                                  }}
                                >
                                  <option value="full">전면 참전</option>
                                  <option value="limited">제한적 참전</option>
                                  <option value="indirect">간접 참전</option>
                                  <option value="non-combatant">
                                    비전투 지원
                                  </option>
                                </Select>

                                {/* 역할/설명 */}
                                <TextArea
                                  placeholder="역할 및 설명 (예: 주도국, 공격 주체)"
                                  value={country.description || ''}
                                  onChange={(e) => {
                                    const updated = belligerents.map((s) => {
                                      if (s.id === side.id) {
                                        const newCountries = [...s.countries]
                                        newCountries[countryIdx] = {
                                          ...newCountries[countryIdx],
                                          description: e.target.value,
                                        }
                                        return { ...s, countries: newCountries }
                                      }
                                      return s
                                    })
                                    setBelligerents(updated)
                                  }}
                                  rows={2}
                                  style={{
                                    fontSize: '13px',
                                    padding: '6px 8px',
                                  }}
                                />
                              </SmallInputGrid>
                            </CountryCard>
                          ))}

                          <AddCountryButton
                            type="button"
                            onClick={() => openCountryModal(side.id)}
                          >
                            <FiPlus size={16} />
                            참전 국가 추가
                          </AddCountryButton>

                          {/* 지휘관 및 병력 */}
                          <InputGroup>
                            <InputLabel>총사령관</InputLabel>
                            {side.commanderPersonId ? (
                              <CommanderSelectedBox>
                                <CommanderInfo>
                                  {availablePersons.find(
                                    (p) => p.id === side.commanderPersonId,
                                  )?.name || side.commander}
                                </CommanderInfo>
                                <RemoveCommanderButton
                                  type="button"
                                  onClick={() => {
                                    playClickSound()
                                    const updated = belligerents.map((s) =>
                                      s.id === side.id
                                        ? {
                                            ...s,
                                            commander: '',
                                            commanderPersonId: undefined,
                                          }
                                        : s,
                                    )
                                    setBelligerents(updated)
                                  }}
                                >
                                  <FiTrash2 size={14} />
                                </RemoveCommanderButton>
                              </CommanderSelectedBox>
                            ) : (
                              <CommanderSelectButton
                                type="button"
                                onClick={() => {
                                  playClickSound()
                                  setCommanderSelectionOpen({
                                    sideId: side.id,
                                    open: true,
                                  })
                                }}
                              >
                                <FiPlus size={16} />
                                지휘관 선택
                              </CommanderSelectButton>
                            )}
                          </InputGroup>

                          <InputGroup>
                            <InputLabel>병력 규모</InputLabel>
                            <Input
                              type="text"
                              placeholder="예: 약 73,000명 (보병 50,000, 기병 15,000, 포병 8,000)"
                              value={side.forces}
                              onChange={(e) => {
                                const updated = belligerents.map((s) =>
                                  s.id === side.id
                                    ? { ...s, forces: e.target.value }
                                    : s,
                                )
                                setBelligerents(updated)
                              }}
                            />
                          </InputGroup>

                          {/* 투입 부대 */}
                          <SectionDivider>
                            <FiShield size={14} />
                            <span>투입 군부대</span>
                          </SectionDivider>

                          <DeployedUnitsContainer>
                            {side.deployedUnits &&
                            side.deployedUnits.length > 0 ? (
                              <DeployedUnitsList>
                                {side.deployedUnits.map((unitId) => {
                                  const unit = availableMilitaryUnits.find(
                                    (u) => u.id === unitId,
                                  )
                                  if (!unit) return null
                                  return (
                                    <DeployedUnitChip key={unitId}>
                                      <FiShield size={14} />
                                      <span>{unit.name}</span>
                                      <RemoveUnitButton
                                        type="button"
                                        onClick={() => {
                                          const updated = belligerents.map(
                                            (s) =>
                                              s.id === side.id
                                                ? {
                                                    ...s,
                                                    deployedUnits: (
                                                      s.deployedUnits || []
                                                    ).filter(
                                                      (id) => id !== unitId,
                                                    ),
                                                  }
                                                : s,
                                          )
                                          setBelligerents(updated)
                                        }}
                                      >
                                        <FiTrash2 size={12} />
                                      </RemoveUnitButton>
                                    </DeployedUnitChip>
                                  )
                                })}
                              </DeployedUnitsList>
                            ) : (
                              <EmptyHint>투입된 부대가 없습니다</EmptyHint>
                            )}

                            <UnitSelectButton
                              type="button"
                              onClick={() => {
                                setUnitSelectionOpen({
                                  sideId: side.id,
                                  open: true,
                                })
                              }}
                            >
                              <FiPlus size={16} />
                              부대 추가
                            </UnitSelectButton>
                          </DeployedUnitsContainer>

                          {/* 사용된 무기/장비 */}
                          <SectionDivider>
                            <FiTarget size={14} />
                            <span>사용된 무기/장비</span>
                          </SectionDivider>

                          <WeaponsContainer>
                            {side.weaponsUsed && side.weaponsUsed.length > 0 ? (
                              <WeaponsList>
                                {side.weaponsUsed.map((weapon, idx) => (
                                  <WeaponChip key={idx}>
                                    <FiTarget size={14} />
                                    <span>{weapon}</span>
                                    <RemoveUnitButton
                                      type="button"
                                      onClick={() => {
                                        const updated = belligerents.map((s) =>
                                          s.id === side.id
                                            ? {
                                                ...s,
                                                weaponsUsed: (
                                                  s.weaponsUsed || []
                                                ).filter((_, i) => i !== idx),
                                              }
                                            : s,
                                        )
                                        setBelligerents(updated)
                                      }}
                                    >
                                      <FiTrash2 size={12} />
                                    </RemoveUnitButton>
                                  </WeaponChip>
                                ))}
                              </WeaponsList>
                            ) : (
                              <EmptyHint>사용된 무기/장비가 없습니다</EmptyHint>
                            )}

                            <WeaponInputGroup>
                              <WeaponInput
                                type="text"
                                placeholder="무기/장비명 입력 (예: M1 Garand, T-34, 슈투카)"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    const value = e.currentTarget.value.trim()
                                    if (value) {
                                      const updated = belligerents.map((s) =>
                                        s.id === side.id
                                          ? {
                                              ...s,
                                              weaponsUsed: [
                                                ...(s.weaponsUsed || []),
                                                value,
                                              ],
                                            }
                                          : s,
                                      )
                                      setBelligerents(updated)
                                      e.currentTarget.value = ''
                                    }
                                  }
                                }}
                              />
                              <WeaponAddButton
                                type="button"
                                onClick={(e) => {
                                  playClickSound()
                                  const input = e.currentTarget
                                    .previousElementSibling as HTMLInputElement
                                  const value = input?.value.trim()
                                  if (value) {
                                    const updated = belligerents.map((s) =>
                                      s.id === side.id
                                        ? {
                                            ...s,
                                            weaponsUsed: [
                                              ...(s.weaponsUsed || []),
                                              value,
                                            ],
                                          }
                                        : s,
                                    )
                                    setBelligerents(updated)
                                    input.value = ''
                                  }
                                }}
                              >
                                <FiPlus size={16} />
                              </WeaponAddButton>
                            </WeaponInputGroup>
                          </WeaponsContainer>

                          {/* 피해 규모 */}
                          <SectionDivider>
                            <FiInfo size={14} />
                            <span>피해 규모</span>
                          </SectionDivider>

                          <CasualtyGroup>
                            <CasualtyLabel>군사 피해</CasualtyLabel>
                            <CasualtyGrid>
                              <CasualtyInput
                                type="text"
                                placeholder="전사"
                                value={
                                  casualties[side.id]?.military.killed || ''
                                }
                                onChange={(e) => {
                                  setCasualties({
                                    ...casualties,
                                    [side.id]: {
                                      ...(casualties[side.id] || {
                                        military: {
                                          killed: '',
                                          wounded: '',
                                          missing: '',
                                          captured: '',
                                        },
                                        total: '',
                                      }),
                                      military: {
                                        ...(casualties[side.id]?.military || {
                                          killed: '',
                                          wounded: '',
                                          missing: '',
                                          captured: '',
                                        }),
                                        killed: e.target.value,
                                      },
                                    },
                                  })
                                }}
                              />
                              <CasualtyInput
                                type="text"
                                placeholder="부상"
                                value={
                                  casualties[side.id]?.military.wounded || ''
                                }
                                onChange={(e) => {
                                  setCasualties({
                                    ...casualties,
                                    [side.id]: {
                                      ...(casualties[side.id] || {
                                        military: {
                                          killed: '',
                                          wounded: '',
                                          missing: '',
                                          captured: '',
                                        },
                                        total: '',
                                      }),
                                      military: {
                                        ...(casualties[side.id]?.military || {
                                          killed: '',
                                          wounded: '',
                                          missing: '',
                                          captured: '',
                                        }),
                                        wounded: e.target.value,
                                      },
                                    },
                                  })
                                }}
                              />
                              <CasualtyInput
                                type="text"
                                placeholder="실종"
                                value={
                                  casualties[side.id]?.military.missing || ''
                                }
                                onChange={(e) => {
                                  setCasualties({
                                    ...casualties,
                                    [side.id]: {
                                      ...(casualties[side.id] || {
                                        military: {
                                          killed: '',
                                          wounded: '',
                                          missing: '',
                                          captured: '',
                                        },
                                        total: '',
                                      }),
                                      military: {
                                        ...(casualties[side.id]?.military || {
                                          killed: '',
                                          wounded: '',
                                          missing: '',
                                          captured: '',
                                        }),
                                        missing: e.target.value,
                                      },
                                    },
                                  })
                                }}
                              />
                              <CasualtyInput
                                type="text"
                                placeholder="포로"
                                value={
                                  casualties[side.id]?.military.captured || ''
                                }
                                onChange={(e) => {
                                  setCasualties({
                                    ...casualties,
                                    [side.id]: {
                                      ...(casualties[side.id] || {
                                        military: {
                                          killed: '',
                                          wounded: '',
                                          missing: '',
                                          captured: '',
                                        },
                                        total: '',
                                      }),
                                      military: {
                                        ...(casualties[side.id]?.military || {
                                          killed: '',
                                          wounded: '',
                                          missing: '',
                                          captured: '',
                                        }),
                                        captured: e.target.value,
                                      },
                                    },
                                  })
                                }}
                              />
                            </CasualtyGrid>
                          </CasualtyGroup>

                          <CasualtyGroup>
                            <CasualtyLabel>민간인 피해 (선택)</CasualtyLabel>
                            <CasualtyGrid>
                              <CasualtyInput
                                type="text"
                                placeholder="사망"
                                value={
                                  casualties[side.id]?.civilian?.killed || ''
                                }
                                onChange={(e) => {
                                  setCasualties({
                                    ...casualties,
                                    [side.id]: {
                                      ...(casualties[side.id] || {
                                        military: {
                                          killed: '',
                                          wounded: '',
                                          missing: '',
                                          captured: '',
                                        },
                                        total: '',
                                      }),
                                      civilian: {
                                        ...(casualties[side.id]?.civilian || {
                                          killed: '',
                                          wounded: '',
                                          displaced: '',
                                        }),
                                        killed: e.target.value,
                                      },
                                    },
                                  })
                                }}
                              />
                              <CasualtyInput
                                type="text"
                                placeholder="부상"
                                value={
                                  casualties[side.id]?.civilian?.wounded || ''
                                }
                                onChange={(e) => {
                                  setCasualties({
                                    ...casualties,
                                    [side.id]: {
                                      ...(casualties[side.id] || {
                                        military: {
                                          killed: '',
                                          wounded: '',
                                          missing: '',
                                          captured: '',
                                        },
                                        total: '',
                                      }),
                                      civilian: {
                                        ...(casualties[side.id]?.civilian || {
                                          killed: '',
                                          wounded: '',
                                          displaced: '',
                                        }),
                                        wounded: e.target.value,
                                      },
                                    },
                                  })
                                }}
                              />
                              <CasualtyInput
                                type="text"
                                placeholder="난민/이재민"
                                value={
                                  casualties[side.id]?.civilian?.displaced || ''
                                }
                                onChange={(e) => {
                                  setCasualties({
                                    ...casualties,
                                    [side.id]: {
                                      ...(casualties[side.id] || {
                                        military: {
                                          killed: '',
                                          wounded: '',
                                          missing: '',
                                          captured: '',
                                        },
                                        total: '',
                                      }),
                                      civilian: {
                                        ...(casualties[side.id]?.civilian || {
                                          killed: '',
                                          wounded: '',
                                          displaced: '',
                                        }),
                                        displaced: e.target.value,
                                      },
                                    },
                                  })
                                }}
                              />
                            </CasualtyGrid>
                          </CasualtyGroup>

                          <FullWidthInput
                            type="text"
                            placeholder="총 피해 요약 (예: 약 27,000명 - 전사 9,000, 부상 16,000, 포로 2,000)"
                            value={casualties[side.id]?.total || ''}
                            onChange={(e) => {
                              setCasualties({
                                ...casualties,
                                [side.id]: {
                                  ...(casualties[side.id] || {
                                    military: {
                                      killed: '',
                                      wounded: '',
                                      missing: '',
                                      captured: '',
                                    },
                                    total: '',
                                  }),
                                  total: e.target.value,
                                },
                              })
                            }}
                          />
                        </BelligerentBody>
                      )}
                    </BelligerentCard>
                  ))}

                  <AddBelligerentButton type="button" onClick={addBelligerent}>
                    <FiPlus size={18} />
                    {parentEvent ? '교전 진영 추가' : '교전 세력 추가'}
                  </AddBelligerentButton>
                </>
              )}
            </FormGroup>
          )}
        </>
      )}

      {/* 상세 정보 탭 */}
      {activeTab === 'details' && (
        <>
          {/* 전술 및 전략 */}
          <FormGroup>
            <Label>
              사용된 전술 <OptionalBadge>선택</OptionalBadge>
            </Label>
            <TextArea
              rows={3}
              placeholder="전투에서 사용된 구체적인 전술을 설명하세요 (예: 측면 포위 공격, 중앙 돌파, 게릴라 전술, 매복 작전 등)"
              value={militaryDetails.tactics || ''}
              onChange={(e) =>
                setMilitaryDetails({
                  ...militaryDetails,
                  tactics: e.target.value,
                })
              }
            />
          </FormGroup>

          <FormGroup>
            <Label>
              전략적 배경 <OptionalBadge>선택</OptionalBadge>
            </Label>
            <TextArea
              rows={3}
              placeholder="전체적인 전쟁/전역의 전략적 맥락을 설명하세요 (예: 적의 수도 점령을 위한 공세, 보급로 차단 전략, 소모전 전략 등)"
              value={militaryDetails.strategy || ''}
              onChange={(e) =>
                setMilitaryDetails({
                  ...militaryDetails,
                  strategy: e.target.value,
                })
              }
            />
          </FormGroup>

          {/* 전투 결과 및 영향 */}
          <FormGroup>
            <Label>
              전투 결과 <RequiredBadge>필수</RequiredBadge>
            </Label>
            <TextArea
              rows={3}
              placeholder="전투의 승패 및 결과를 입력하세요 (예: 프랑스군의 결정적 승리, 오스트리아-러시아 연합군 패배)"
              value={militaryDetails.outcome}
              onChange={(e) =>
                setMilitaryDetails({
                  ...militaryDetails,
                  outcome: e.target.value,
                })
              }
            />
          </FormGroup>

          <FormGroup>
            <Label>
              영토 변화 <OptionalBadge>있을 경우 입력</OptionalBadge>
            </Label>
            <TextArea
              rows={2}
              placeholder="전투로 인한 영토 변화 (예: 알자스-로렌 지역을 독일에 할양)"
              value={militaryDetails.territoryChanges || ''}
              onChange={(e) => {
                setMilitaryDetails({
                  ...militaryDetails,
                  territoryChanges: e.target.value,
                })
              }}
            />
          </FormGroup>

          <FormGroup>
            <Label>
              관련 조약/협정 <OptionalBadge>있을 경우 입력</OptionalBadge>
            </Label>
            <Input
              type="text"
              placeholder="전투 이후 체결된 조약 (예: 프레스부르크 조약)"
              value={militaryDetails.treaty || ''}
              onChange={(e) => {
                setMilitaryDetails({
                  ...militaryDetails,
                  treaty: e.target.value,
                })
              }}
            />
          </FormGroup>

          <FormGroup>
            <Label>
              전략적 영향 <OptionalBadge>선택</OptionalBadge>
            </Label>
            <TextArea
              rows={3}
              placeholder="전투가 전쟁의 흐름이나 역사에 미친 영향 (예: 제3차 대불동맹의 붕괴, 신성로마제국 해체의 계기)"
              value={militaryDetails.strategicImpact || ''}
              onChange={(e) => {
                setMilitaryDetails({
                  ...militaryDetails,
                  strategicImpact: e.target.value,
                })
              }}
            />
          </FormGroup>

          <FormGroup>
            <Label>
              전쟁 비용 <OptionalBadge>경제적 비용</OptionalBadge>
            </Label>
            <Input
              type="text"
              placeholder="예: 약 50억 프랑 (당시 기준), 현재 가치로 약 1조 달러"
              value={warCost}
              onChange={(e) => setWarCost(e.target.value)}
            />
          </FormGroup>

          {/* 국가 선택 모달 */}
          <CountrySelectModal
            isOpen={countryModalOpen}
            onClose={() => setCountryModalOpen(false)}
            onSelect={handleCountrySelect}
            modernCountries={availableCountries}
            historicalCountries={availableHistoricalCountries}
            selectedCountryId={
              selectedSideForCountry && selectedCountryIndex !== null
                ? belligerents.find(
                    (side) => side.id === selectedSideForCountry,
                  )?.countries[selectedCountryIndex]?.countryId
                : undefined
            }
          />

          {/* 날짜 선택 모달 */}
          <DatePickerModal
            isOpen={dateModalState.isOpen}
            onClose={() =>
              setDateModalState({
                isOpen: false,
                type: 'join',
                sideId: null,
                countryIndex: null,
              })
            }
            onSelect={(date) => {
              const { type, sideId, countryIndex } = dateModalState
              if (sideId === null || countryIndex === null) return

              const updated = belligerents.map((s) => {
                if (s.id === sideId) {
                  const newCountries = [...s.countries]
                  const country = newCountries[countryIndex]
                  const oldValue =
                    type === 'join' ? country.joinDate : country.withdrawDate
                  const time = getTimeFromISO(oldValue)
                  const newValue = combineDateTime(date, time, oldValue)

                  newCountries[countryIndex] = {
                    ...country,
                    [type === 'join' ? 'joinDate' : 'withdrawDate']: newValue,
                  }
                  return { ...s, countries: newCountries }
                }
                return s
              })
              setBelligerents(updated)
              setDateModalState({
                isOpen: false,
                type: 'join',
                sideId: null,
                countryIndex: null,
              })
            }}
            initialDate={
              dateModalState.sideId && dateModalState.countryIndex !== null
                ? getDateFromISO(
                    belligerents.find((s) => s.id === dateModalState.sideId)
                      ?.countries[dateModalState.countryIndex]?.[
                      dateModalState.type === 'join'
                        ? 'joinDate'
                        : 'withdrawDate'
                    ],
                  )
                : ''
            }
            title={
              dateModalState.type === 'join'
                ? '참전 날짜 선택'
                : '철수 날짜 선택'
            }
          />

          {/* 시간 선택 모달 */}
          <TimePickerModal
            isOpen={timeModalState.isOpen}
            onClose={() =>
              setTimeModalState({
                isOpen: false,
                type: 'join',
                sideId: null,
                countryIndex: null,
              })
            }
            onSelect={(time) => {
              const { type, sideId, countryIndex } = timeModalState
              if (sideId === null || countryIndex === null) return

              const updated = belligerents.map((s) => {
                if (s.id === sideId) {
                  const newCountries = [...s.countries]
                  const country = newCountries[countryIndex]
                  const oldValue =
                    type === 'join' ? country.joinDate : country.withdrawDate
                  const date = getDateFromISO(oldValue)
                  const newValue = combineDateTime(date, time, oldValue)

                  newCountries[countryIndex] = {
                    ...country,
                    [type === 'join' ? 'joinDate' : 'withdrawDate']: newValue,
                  }
                  return { ...s, countries: newCountries }
                }
                return s
              })
              setBelligerents(updated)
              setTimeModalState({
                isOpen: false,
                type: 'join',
                sideId: null,
                countryIndex: null,
              })
            }}
            initialTime={
              timeModalState.sideId && timeModalState.countryIndex !== null
                ? getTimeFromISO(
                    belligerents.find((s) => s.id === timeModalState.sideId)
                      ?.countries[timeModalState.countryIndex]?.[
                      timeModalState.type === 'join'
                        ? 'joinDate'
                        : 'withdrawDate'
                    ],
                  )
                : ''
            }
            title={
              timeModalState.type === 'join'
                ? '참전 시간 선택'
                : '철수 시간 선택'
            }
          />

          {/* 부대 선택 모달 */}
          {unitSelectionOpen.open && unitSelectionOpen.sideId && (
            <UnitSelectModal
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setUnitSelectionOpen({ sideId: null, open: false })
                  setUnitSearchQuery('')
                }
              }}
            >
              <UnitSelectContent onClick={(e) => e.stopPropagation()}>
                <UnitSelectHeader>
                  <UnitSelectTitle>군부대 선택</UnitSelectTitle>
                  <UnitSelectClose
                    type="button"
                    onClick={() => {
                      playClickSound()
                      setUnitSelectionOpen({ sideId: null, open: false })
                      setUnitSearchQuery('')
                    }}
                  >
                    <FiTrash2 size={18} />
                  </UnitSelectClose>
                </UnitSelectHeader>

                <UnitSelectSearch
                  type="text"
                  placeholder="부대명 검색..."
                  value={unitSearchQuery}
                  onChange={(e) => setUnitSearchQuery(e.target.value)}
                />

                <UnitSelectList>
                  {(() => {
                    const currentSide = belligerents.find(
                      (s) => s.id === unitSelectionOpen.sideId,
                    )
                    // 해당 세력의 참전국 ID 목록 추출
                    const participatingCountryIds =
                      currentSide?.countries.map((c) => c.countryId) || []

                    // 참전국의 군부대만 필터링
                    const filteredUnits = availableMilitaryUnits.filter(
                      (unit) => {
                        const matchesSearch = unit.name
                          .toLowerCase()
                          .includes(unitSearchQuery.toLowerCase())
                        const belongsToParticipatingCountry = unit.countryId
                          ? participatingCountryIds.includes(unit.countryId)
                          : false
                        return matchesSearch && belongsToParticipatingCountry
                      },
                    )

                    if (filteredUnits.length === 0) {
                      return (
                        <EmptyHint style={{ marginTop: '20px' }}>
                          {participatingCountryIds.length === 0
                            ? '먼저 참전 국가를 추가해주세요'
                            : unitSearchQuery
                              ? '검색 결과가 없습니다'
                              : '해당 국가의 군부대가 없습니다'}
                        </EmptyHint>
                      )
                    }

                    return (
                      <>
                        {filteredUnits.map((unit) => {
                          const isSelected =
                            currentSide?.deployedUnits?.includes(unit.id) ||
                            false

                          return (
                            <UnitSelectItem
                              key={unit.id}
                              type="button"
                              $selected={isSelected}
                              onClick={() => {
                                playClickSound()
                                const updated = belligerents.map((side) => {
                                  if (side.id === unitSelectionOpen.sideId) {
                                    const currentUnits =
                                      side.deployedUnits || []
                                    if (currentUnits.includes(unit.id)) {
                                      // 이미 선택된 경우 제거
                                      return {
                                        ...side,
                                        deployedUnits: currentUnits.filter(
                                          (id) => id !== unit.id,
                                        ),
                                      }
                                    } else {
                                      // 선택되지 않은 경우 추가
                                      return {
                                        ...side,
                                        deployedUnits: [
                                          ...currentUnits,
                                          unit.id,
                                        ],
                                      }
                                    }
                                  }
                                  return side
                                })
                                setBelligerents(updated)
                              }}
                            >
                              <FiShield size={18} />
                              <UnitItemInfo>
                                <UnitItemName>{unit.name}</UnitItemName>
                                {(unit.country?.name || unit.unitType) && (
                                  <UnitItemMeta>
                                    {unit.country?.name && unit.country.name}
                                    {unit.country?.name &&
                                      unit.unitType &&
                                      ' • '}
                                    {unit.unitType && unit.unitType}
                                  </UnitItemMeta>
                                )}
                              </UnitItemInfo>
                            </UnitSelectItem>
                          )
                        })}
                      </>
                    )
                  })()}
                </UnitSelectList>
              </UnitSelectContent>
            </UnitSelectModal>
          )}

          {/* 지휘관 선택 모달 */}
          {commanderSelectionOpen.open && commanderSelectionOpen.sideId && (
            <UnitSelectModal
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setCommanderSelectionOpen({ sideId: null, open: false })
                  setCommanderSearchQuery('')
                }
              }}
            >
              <UnitSelectContent onClick={(e) => e.stopPropagation()}>
                <UnitSelectHeader>
                  <UnitSelectTitle>지휘관 선택</UnitSelectTitle>
                  <UnitSelectClose
                    type="button"
                    onClick={() => {
                      playClickSound()
                      setCommanderSelectionOpen({ sideId: null, open: false })
                      setCommanderSearchQuery('')
                    }}
                  >
                    <FiTrash2 size={18} />
                  </UnitSelectClose>
                </UnitSelectHeader>

                <UnitSelectSearch
                  type="text"
                  placeholder="인물명 검색..."
                  value={commanderSearchQuery}
                  onChange={(e) => setCommanderSearchQuery(e.target.value)}
                />

                <UnitSelectList>
                  {(() => {
                    const currentSide = belligerents.find(
                      (s) => s.id === commanderSelectionOpen.sideId,
                    )
                    // 해당 세력의 참전국 ID 목록 추출
                    const participatingCountryIds =
                      currentSide?.countries.map((c) => c.countryId) || []

                    // 참전국의 인물 우선 표시, 그 외 인물도 표시 (국적 미상)
                    const filteredPersons = availablePersons.filter((person) =>
                      person.name
                        .toLowerCase()
                        .includes(commanderSearchQuery.toLowerCase()),
                    )

                    // 참전국 인물과 기타 인물로 분리 (nationalityId 필드가 있다고 가정)
                    const participatingPersons = filteredPersons.filter(
                      (person) =>
                        (person as any).nationalityId
                          ? participatingCountryIds.includes(
                              (person as any).nationalityId,
                            )
                          : false,
                    )
                    const otherPersons = filteredPersons.filter(
                      (person) =>
                        !(person as any).nationalityId ||
                        !participatingCountryIds.includes(
                          (person as any).nationalityId,
                        ),
                    )

                    if (filteredPersons.length === 0) {
                      return (
                        <EmptyHint style={{ marginTop: '20px' }}>
                          검색 결과가 없습니다
                        </EmptyHint>
                      )
                    }

                    return (
                      <>
                        {participatingCountryIds.length > 0 &&
                          participatingPersons.length > 0 && (
                            <>
                              <SectionDivider
                                style={{ fontSize: '11px', marginTop: '10px' }}
                              >
                                <span>참전국 인물</span>
                              </SectionDivider>
                              {participatingPersons.map((person) => {
                                const isSelected =
                                  currentSide?.commanderPersonId === person.id
                                return (
                                  <UnitSelectItem
                                    key={person.id}
                                    type="button"
                                    $selected={isSelected}
                                    onClick={() => {
                                      playClickSound()
                                      const updated = belligerents.map(
                                        (side) => {
                                          if (
                                            side.id ===
                                            commanderSelectionOpen.sideId
                                          ) {
                                            return {
                                              ...side,
                                              commander: person.name,
                                              commanderPersonId: person.id,
                                            }
                                          }
                                          return side
                                        },
                                      )
                                      setBelligerents(updated)
                                      setCommanderSelectionOpen({
                                        sideId: null,
                                        open: false,
                                      })
                                      setCommanderSearchQuery('')
                                    }}
                                  >
                                    <FiUsers size={18} />
                                    <UnitItemInfo>
                                      <UnitItemName>{person.name}</UnitItemName>
                                      {((person as any).birthDay ||
                                        (person as any).deathDay) && (
                                        <UnitItemMeta>
                                          {(person as any).birthDay &&
                                            (person as any).birthDay}
                                          {(person as any).birthDay &&
                                            (person as any).deathDay &&
                                            ' - '}
                                          {(person as any).deathDay &&
                                            (person as any).deathDay}
                                        </UnitItemMeta>
                                      )}
                                    </UnitItemInfo>
                                  </UnitSelectItem>
                                )
                              })}
                            </>
                          )}

                        {otherPersons.length > 0 && (
                          <>
                            {participatingCountryIds.length > 0 &&
                              participatingPersons.length > 0 && (
                                <SectionDivider
                                  style={{
                                    fontSize: '11px',
                                    marginTop: '16px',
                                  }}
                                >
                                  <span>기타 인물</span>
                                </SectionDivider>
                              )}
                            {otherPersons.map((person) => {
                              const isSelected =
                                currentSide?.commanderPersonId === person.id

                              return (
                                <UnitSelectItem
                                  key={person.id}
                                  type="button"
                                  $selected={isSelected}
                                  onClick={() => {
                                    playClickSound()
                                    const updated = belligerents.map((side) => {
                                      if (
                                        side.id ===
                                        commanderSelectionOpen.sideId
                                      ) {
                                        return {
                                          ...side,
                                          commander: person.name,
                                          commanderPersonId: person.id,
                                        }
                                      }
                                      return side
                                    })
                                    setBelligerents(updated)
                                    setCommanderSelectionOpen({
                                      sideId: null,
                                      open: false,
                                    })
                                    setCommanderSearchQuery('')
                                  }}
                                >
                                  <FiUsers size={18} />
                                  <UnitItemInfo>
                                    <UnitItemName>{person.name}</UnitItemName>
                                    {((person as any).birthDay ||
                                      (person as any).deathDay) && (
                                      <UnitItemMeta>
                                        {(person as any).birthDay &&
                                          (person as any).birthDay}
                                        {(person as any).birthDay &&
                                          (person as any).deathDay &&
                                          ' - '}
                                        {(person as any).deathDay &&
                                          (person as any).deathDay}
                                      </UnitItemMeta>
                                    )}
                                  </UnitItemInfo>
                                </UnitSelectItem>
                              )
                            })}
                          </>
                        )}
                      </>
                    )
                  })()}
                </UnitSelectList>
              </UnitSelectContent>
            </UnitSelectModal>
          )}
        </>
      )}

      {/* 진영 추가 모달 */}
      {showAddSideModal && belligerentsGraph && setBelligerentsGraph && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => {
            setShowAddSideModal(false)
            setNewSideName('')
            setNewSideDescription('')
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '0',
              width: '440px',
              maxWidth: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              animation: 'slideUp 0.3s ease-out',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div
              style={{
                background: '#fafbfc',
                padding: '24px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  background: '#6366f1',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FiShield size={20} color="white" />
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#0f172a',
                  }}
                >
                  진영 추가
                </h3>
                <p
                  style={{
                    margin: '4px 0 0 0',
                    fontSize: '13px',
                    color: '#64748b',
                  }}
                >
                  교전 진영을 등록하세요
                </p>
              </div>
            </div>

            {/* 본문 */}
            <div style={{ padding: '24px' }}>
              <div
                style={{
                  background: COLORS.bg,
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px',
                  }}
                >
                  <FiInfo size={16} color={COLORS.info} />
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: COLORS.text,
                    }}
                  >
                    진영이란?
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '12px',
                    color: COLORS.textLight,
                    lineHeight: '1.6',
                  }}
                >
                  진영은 여러 국가가 속할 수 있는 그룹입니다.
                  <br />
                  <strong>예시:</strong> 연합군, 추축국, 중립국, 동맹군
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: COLORS.text,
                    marginBottom: '8px',
                  }}
                >
                  진영 이름
                </label>
                <div style={{ position: 'relative' }}>
                  <FiShield
                    size={18}
                    color={COLORS.textLight}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="예: 연합군, 추축국"
                    value={newSideName}
                    onChange={(e) => setNewSideName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newSideName.trim()) {
                        const newSideId = `side-${Date.now()}`
                        const newSides = [
                          ...(belligerentsGraph.manualSides || []),
                          {
                            id: newSideId,
                            name: newSideName.trim(),
                            description: newSideDescription.trim() || undefined,
                            memberCountryIds: [],
                          },
                        ]
                        setBelligerentsGraph({
                          ...belligerentsGraph,
                          manualSides: newSides,
                        })
                        setShowAddSideModal(false)
                        setNewSideName('')
                        setNewSideDescription('')
                        playClickSound()
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 42px',
                      border: `2px solid ${COLORS.border}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = COLORS.primary
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${COLORS.primaryLight}`
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = COLORS.border
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                    autoFocus
                  />
                </div>
              </div>

              {/* 진영 설명 */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: COLORS.text,
                    marginBottom: '8px',
                  }}
                >
                  설명 (선택)
                </label>
                <textarea
                  placeholder="진영에 대한 설명을 입력하세요"
                  value={newSideDescription}
                  onChange={(e) => setNewSideDescription(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = COLORS.primary
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${COLORS.primaryLight}`
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = COLORS.border
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSideModal(false)
                    setNewSideName('')
                    setNewSideDescription('')
                    playClickSound()
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '11px 20px',
                    border: `1.5px solid ${COLORS.border}`,
                    borderRadius: '8px',
                    background: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: COLORS.text,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = COLORS.bg
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white'
                  }}
                >
                  <FiX size={16} />
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (newSideName.trim()) {
                      const newSideId = `side-${Date.now()}`
                      const newSides = [
                        ...(belligerentsGraph.manualSides || []),
                        {
                          id: newSideId,
                          name: newSideName.trim(),
                          description: newSideDescription.trim() || undefined,
                          memberCountryIds: [],
                        },
                      ]
                      setBelligerentsGraph({
                        ...belligerentsGraph,
                        manualSides: newSides,
                      })
                      setShowAddSideModal(false)
                      setNewSideName('')
                      setNewSideDescription('')
                      playClickSound()
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '11px 24px',
                    border: 'none',
                    borderRadius: '8px',
                    background: newSideName.trim()
                      ? `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark || '#4f46e5'} 100%)`
                      : COLORS.border,
                    color: 'white',
                    cursor: newSideName.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    boxShadow: newSideName.trim()
                      ? '0 4px 12px rgba(99, 102, 241, 0.3)'
                      : 'none',
                  }}
                  disabled={!newSideName.trim()}
                  onMouseEnter={(e) => {
                    if (newSideName.trim()) {
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow =
                        '0 6px 16px rgba(99, 102, 241, 0.4)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = newSideName.trim()
                      ? '0 4px 12px rgba(99, 102, 241, 0.3)'
                      : 'none'
                  }}
                >
                  <FiPlus size={16} />
                  추가하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 진영 수정 모달 */}
      {showEditSideModal && editingSideId && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => {
            setShowEditSideModal(false)
            setEditingSideId(null)
            setEditSideName('')
            setEditSideColor('')
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '0',
              width: '500px',
              maxWidth: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              animation: 'slideUp 0.3s ease-out',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div
              style={{
                background: '#fafbfc',
                padding: '24px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  background: '#6366f1',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FiEdit2 size={20} color="white" />
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#0f172a',
                  }}
                >
                  진영 수정
                </h3>
                <p
                  style={{
                    margin: '4px 0 0 0',
                    fontSize: '13px',
                    color: '#64748b',
                  }}
                >
                  진영 정보를 변경하세요
                </p>
              </div>
            </div>

            {/* 본문 */}
            <div style={{ padding: '24px' }}>
              {/* 진영 이름 */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: COLORS.text,
                    marginBottom: '8px',
                  }}
                >
                  진영 이름
                </label>
                <div style={{ position: 'relative' }}>
                  <FiShield
                    size={18}
                    color={COLORS.textLight}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="예: 연합군, 추축국"
                    value={editSideName}
                    onChange={(e) => setEditSideName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && editSideName.trim()) {
                        updateSide()
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 42px',
                      fontSize: '14px',
                      border: `1.5px solid ${COLORS.border}`,
                      borderRadius: '8px',
                      outline: 'none',
                      transition: 'all 0.2s',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = COLORS.primary
                      e.target.style.boxShadow = `0 0 0 3px ${COLORS.primary}20`
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = COLORS.border
                      e.target.style.boxShadow = 'none'
                    }}
                    autoFocus
                  />
                </div>
              </div>

              {/* 진영 색상 선택 */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: COLORS.text,
                    marginBottom: '12px',
                  }}
                >
                  진영 색상 (선택)
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: '8px',
                  }}
                >
                  {[
                    { name: '파란색', value: '#3b82f6' },
                    { name: '빨간색', value: '#ef4444' },
                    { name: '초록색', value: '#10b981' },
                    { name: '보라색', value: '#8b5cf6' },
                    { name: '주황색', value: '#f59e0b' },
                    { name: '분홍색', value: '#ec4899' },
                    { name: '청록색', value: '#14b8a6' },
                    { name: '회색', value: '#6b7280' },
                    { name: '남색', value: '#6366f1' },
                    { name: '라임', value: '#84cc16' },
                    { name: '자주색', value: '#a855f7' },
                    { name: '호박색', value: '#f97316' },
                  ].map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setEditSideColor(color.value)}
                      title={color.name}
                      style={{
                        width: '100%',
                        aspectRatio: '1',
                        background: color.value,
                        border:
                          editSideColor === color.value
                            ? '3px solid #1e293b'
                            : '2px solid #e5e7eb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow:
                          editSideColor === color.value
                            ? `0 0 0 4px ${color.value}30`
                            : 'none',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)'
                      }}
                    />
                  ))}
                </div>
                {editSideColor && (
                  <button
                    type="button"
                    onClick={() => setEditSideColor('')}
                    style={{
                      marginTop: '8px',
                      padding: '6px 12px',
                      background: 'transparent',
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: COLORS.textLight,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = COLORS.bg
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <FiX size={12} />
                    색상 초기화
                  </button>
                )}
              </div>

              {/* 진영 설명 */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: COLORS.text,
                    marginBottom: '8px',
                  }}
                >
                  설명 (선택)
                </label>
                <textarea
                  placeholder="진영에 대한 설명을 입력하세요"
                  value={editSideDescription}
                  onChange={(e) => setEditSideDescription(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = COLORS.primary
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${COLORS.primary}20`
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = COLORS.border
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>

              {/* 버튼 영역 */}
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  paddingTop: '16px',
                  borderTop: `1px solid ${COLORS.border}`,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowEditSideModal(false)
                    setEditingSideId(null)
                    setEditSideName('')
                    setEditSideColor('')
                    setEditSideDescription('')
                  }}
                  style={{
                    flex: 1,
                    padding: '11px 20px',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '8px',
                    background: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: COLORS.text,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = COLORS.bg
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white'
                  }}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={updateSide}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '11px 24px',
                    border: 'none',
                    borderRadius: '8px',
                    background: editSideName.trim()
                      ? `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark || '#4f46e5'} 100%)`
                      : COLORS.border,
                    color: 'white',
                    cursor: editSideName.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    boxShadow: editSideName.trim()
                      ? '0 4px 12px rgba(99, 102, 241, 0.3)'
                      : 'none',
                  }}
                  disabled={!editSideName.trim()}
                  onMouseEnter={(e) => {
                    if (editSideName.trim()) {
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow =
                        '0 6px 16px rgba(99, 102, 241, 0.4)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = editSideName.trim()
                      ? '0 4px 12px rgba(99, 102, 241, 0.3)'
                      : 'none'
                  }}
                >
                  <FiEdit2 size={16} />
                  수정 완료
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Styled Components

const FormGroup = styled.div`
  margin-bottom: 28px;
  max-width: ${FORM_FIELD_MAX_WIDTH};
`

const Label = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 10px;
`

const RequiredBadge = styled.span`
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 600;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 4px;
`

const OptionalBadge = styled.span`
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
  background: rgba(148, 163, 184, 0.1);
  border-radius: 4px;
`

const Hint = styled.div`
  font-size: 12px;
  color: #64748b;
  margin-bottom: 12px;
  line-height: 1.5;
`

const TypeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 10px;
  max-width: ${FORM_FIELD_MAX_WIDTH};
`

const TypeButton = styled.button<{ $selected: boolean }>`
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ $selected }) => ($selected ? '#ffffff' : '#64748b')};
  background: ${({ $selected }) =>
    $selected
      ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
      : 'rgba(148, 163, 184, 0.08)'};
  border: 1.5px solid
    ${({ $selected }) => ($selected ? '#8b5cf6' : 'rgba(148, 163, 184, 0.15)')};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 100px;
  white-space: nowrap;
  text-align: center;

  &:hover {
    background: ${({ $selected }) =>
      $selected
        ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
        : 'rgba(139, 92, 246, 0.08)'};
    border-color: ${({ $selected }) =>
      $selected ? '#7c3aed' : 'rgba(139, 92, 246, 0.3)'};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`

const BelligerentCard = styled.div`
  margin-bottom: 20px;
  background: white;
  border: 1.5px solid rgba(99, 102, 241, 0.12);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.25);
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.08);
  }
`

const BelligerentHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: rgba(99, 102, 241, 0.03);
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.06);
  }
`

const SideNumber = styled.div`
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
`

const SideName = styled.div`
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 12px;
`

const SideColorIndicator = styled.div<{ $color?: string }>`
  width: 4px;
  height: 20px;
  border-radius: 2px;
  background: ${(props) => props.$color || 'transparent'};
  flex-shrink: 0;
  box-shadow: ${(props) =>
    props.$color ? `0 0 8px ${props.$color}60` : 'none'};
`

const CountryCount = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #6366f1;
  padding: 4px 12px;
  background: rgba(99, 102, 241, 0.08);
  border-radius: 8px;
`

const SideActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const EditButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(99, 102, 241, 0.08);
  color: #6366f1;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: rgba(99, 102, 241, 0.15);
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`

const DeleteButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: rgba(239, 68, 68, 0.15);
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`

const BelligerentBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  background: #fafafa;
`

const SectionDivider = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 20px 0 12px;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(
      to right,
      rgba(148, 163, 184, 0.2),
      transparent
    );
  }

  svg {
    flex-shrink: 0;
  }
`

const InputGroup = styled.div`
  margin-bottom: 16px;
`

const InputLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 8px;
`

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  font-size: 14px;
  color: #0f172a;
  border: 1.5px solid rgba(226, 232, 240, 1);
  border-radius: 10px;
  outline: none;
  transition: all 0.2s ease;

  &::placeholder {
    color: #94a3b8;
  }

  &:focus {
    border-color: #8b5cf6;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  }
`

const Select = styled.select`
  width: 100%;
  padding: 12px 16px;
  font-size: 14px;
  color: #0f172a;
  border: 1.5px solid rgba(226, 232, 240, 1);
  border-radius: 10px;
  outline: none;
  transition: all 0.2s ease;
  background: #ffffff;
  cursor: pointer;
  margin-bottom: 12px;

  &:focus {
    border-color: #8b5cf6;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  }
`

const CountrySelectButton = styled.button<{ $selected: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: ${({ $selected }) => ($selected ? '600' : '500')};
  color: ${({ $selected }) => ($selected ? '#0f172a' : '#64748b')};
  background: #ffffff;
  border: 1.5px solid
    ${({ $selected }) =>
      $selected ? 'rgba(139, 92, 246, 0.3)' : 'rgba(226, 232, 240, 1)'};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  margin-bottom: 12px;

  svg {
    flex-shrink: 0;
    color: ${({ $selected }) => ($selected ? '#8b5cf6' : '#94a3b8')};
  }

  &:hover {
    border-color: ${({ $selected }) =>
      $selected ? 'rgba(139, 92, 246, 0.5)' : 'rgba(139, 92, 246, 0.3)'};
    background: rgba(139, 92, 246, 0.03);
  }

  &:active {
    transform: scale(0.99);
  }
`

const TextArea = styled.textarea`
  width: 100%;
  padding: 14px 16px;
  font-size: 14px;
  color: #0f172a;
  border: 1.5px solid rgba(226, 232, 240, 1);
  border-radius: 10px;
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition: all 0.2s ease;
  line-height: 1.6;

  &::placeholder {
    color: #94a3b8;
  }

  &:focus {
    border-color: #8b5cf6;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  }
`

const CountryCard = styled.div`
  padding: 16px;
  margin-bottom: 12px;
  background: white;
  border: 1.5px solid rgba(226, 232, 240, 0.8);
  border-radius: 10px;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.3);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.06);
  }
`

const CountryCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 8px;
`

const CountryTypeToggle = styled.div`
  display: flex;
  gap: 4px;
  background: rgba(99, 102, 241, 0.06);
  padding: 3px;
  border-radius: 8px;
`

const ToggleButton = styled.button<{ $active: boolean }>`
  padding: 6px 14px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ $active }) => ($active ? '#ffffff' : '#64748b')};
  background: ${({ $active }) =>
    $active ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent'};
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: ${({ $active }) =>
    $active ? '0 2px 4px rgba(99, 102, 241, 0.2)' : 'none'};

  &:hover {
    color: ${({ $active }) => ($active ? '#ffffff' : '#6366f1')};
  }
`

const SmallDeleteButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
  }
`

const SmallInputGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
`

const SmallInput = styled.input`
  padding: 10px 14px;
  font-size: 13px;
  color: #0f172a;
  border: 1.5px solid rgba(226, 232, 240, 1);
  border-radius: 8px;
  outline: none;
  transition: all 0.2s ease;

  &::placeholder {
    color: #cbd5e1;
    font-size: 12px;
  }

  &:focus {
    border-color: #8b5cf6;
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.08);
  }
`

const AddCountryButton = styled.button`
  width: 100%;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #8b5cf6;
  background: rgba(139, 92, 246, 0.05);
  border: 1.5px dashed rgba(139, 92, 246, 0.25);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(139, 92, 246, 0.1);
    border-color: #8b5cf6;
  }
`

const CasualtyGroup = styled.div`
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
`

const CasualtyLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 10px;
`

const CasualtyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 10px;
`

const CasualtyInput = styled.input`
  padding: 10px 14px;
  font-size: 13px;
  color: #0f172a;
  border: 1.5px solid rgba(226, 232, 240, 1);
  border-radius: 8px;
  outline: none;
  transition: all 0.2s ease;

  &::placeholder {
    color: #cbd5e1;
    font-size: 12px;
  }

  &:focus {
    border-color: #8b5cf6;
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.08);
  }
`

const FullWidthInput = styled(Input)`
  margin-top: 10px;
`

const AddBelligerentButton = styled.button`
  width: 100%;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #8b5cf6;
  background: rgba(139, 92, 246, 0.05);
  border: 1.5px dashed rgba(139, 92, 246, 0.25);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(139, 92, 246, 0.08);
    border-color: #8b5cf6;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.15);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    transition: transform 0.2s ease;
    stroke-width: 2.5;
  }

  &:hover svg {
    transform: scale(1.15);
  }
`

const DeployedUnitsContainer = styled.div`
  margin-top: 12px;
`

const DeployedUnitsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
`

const DeployedUnitChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(139, 92, 246, 0.08);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #0f172a;

  svg {
    color: #8b5cf6;
    flex-shrink: 0;
  }
`

const RemoveUnitButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin-left: 4px;
  width: 18px;
  height: 18px;
  border: none;
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.3);
  }
`

const EmptyHint = styled.div`
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
  padding: 16px;
  margin-bottom: 12px;
  background: rgba(148, 163, 184, 0.05);
  border-radius: 8px;
`

const UnitSelectButton = styled.button`
  width: 100%;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.05);
  border: 1.5px dashed rgba(99, 102, 241, 0.25);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    border-color: #6366f1;
  }
`

const UnitSelectModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`

const UnitSelectContent = styled.div`
  background: #ffffff;
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`

const UnitSelectHeader = styled.div`
  padding: 24px;
  border-bottom: 1px solid rgba(226, 232, 240, 1);
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const UnitSelectTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
`

const UnitSelectClose = styled.button`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: rgba(148, 163, 184, 0.1);
  color: #64748b;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }
`

const UnitSelectSearch = styled.input`
  width: 100%;
  padding: 12px 16px;
  font-size: 14px;
  border: 1.5px solid rgba(226, 232, 240, 1);
  border-radius: 10px;
  outline: none;
  transition: all 0.2s ease;
  margin: 16px 24px;
  width: calc(100% - 48px);

  &::placeholder {
    color: #94a3b8;
  }

  &:focus {
    border-color: #8b5cf6;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  }
`

const UnitSelectList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 24px 24px;
`

const UnitSelectItem = styled.button<{ $selected: boolean }>`
  width: 100%;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: ${({ $selected }) =>
    $selected ? 'rgba(139, 92, 246, 0.08)' : '#ffffff'};
  border: 1.5px solid
    ${({ $selected }) =>
      $selected ? 'rgba(139, 92, 246, 0.3)' : 'rgba(226, 232, 240, 1)'};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 8px;
  text-align: left;

  &:hover {
    background: rgba(139, 92, 246, 0.05);
    border-color: rgba(139, 92, 246, 0.3);
  }

  svg {
    flex-shrink: 0;
    color: ${({ $selected }) => ($selected ? '#8b5cf6' : '#94a3b8')};
  }
`

const UnitItemInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const UnitItemName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
`

const UnitItemMeta = styled.div`
  font-size: 12px;
  color: #64748b;
`

const CommanderSelectedBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(99, 102, 241, 0.08);
  border: 1.5px solid rgba(99, 102, 241, 0.3);
  border-radius: 10px;
`

const CommanderInfo = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
`

const RemoveCommanderButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
  }
`

const CommanderSelectButton = styled.button`
  width: 100%;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #8b5cf6;
  background: rgba(139, 92, 246, 0.05);
  border: 1.5px dashed rgba(139, 92, 246, 0.25);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(139, 92, 246, 0.1);
    border-color: #8b5cf6;
  }
`

const WeaponsContainer = styled.div`
  margin-top: 12px;
`

const WeaponsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
`

const WeaponChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(220, 38, 38, 0.08);
  border: 1px solid rgba(220, 38, 38, 0.2);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #0f172a;

  svg {
    color: #dc2626;
    flex-shrink: 0;
  }
`

const WeaponInputGroup = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`

const WeaponInput = styled.input`
  flex: 1;
  padding: 10px 14px;
  font-size: 13px;
  color: #0f172a;
  border: 1.5px solid rgba(226, 232, 240, 1);
  border-radius: 8px;
  outline: none;
  transition: all 0.2s ease;

  &::placeholder {
    color: #cbd5e1;
    font-size: 12px;
  }

  &:focus {
    border-color: #dc2626;
    box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.08);
  }
`

const WeaponAddButton = styled.button`
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: #ffffff;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, #b91c1c, #991b1b);
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`
// 부�??�건 관???��???(military-event-form.tsx ?�일 ?�에 추�?)

const ParentEventInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.05),
    rgba(139, 92, 246, 0.03)
  );
  border: 1.5px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  margin-bottom: 20px;
`

const InfoIcon = styled.div`
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  border-radius: 8px;
`

const InfoText = styled.div`
  flex: 1;
  font-size: 14px;
  color: #475569;
  line-height: 1.5;

  strong {
    color: #6366f1;
    font-weight: 600;
  }
`

const ParentSideSection = styled.div`
  margin-bottom: 24px;
  padding: 20px;
  background: rgba(148, 163, 184, 0.02);
  border: 1.5px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
`

const ParentSideHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`

const SideIcon = styled.div<{ $color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  margin-right: 8px;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px ${({ $color }) => $color}22;
`

const InheritedBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

const ParentCountries = styled.div`
  padding: 12px 16px;
  background: rgba(99, 102, 241, 0.03);
  border-radius: 8px;
  font-size: 13px;
  color: #64748b;
  margin-bottom: 16px;
`

const SubForcesContainer = styled.div`
  margin-top: 16px;
`

const SubForcesLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 12px;
`

const SubForceCard = styled.div`
  padding: 16px;
  background: #ffffff;
  border: 1.5px solid rgba(226, 232, 240, 1);
  border-radius: 10px;
  margin-bottom: 12px;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.2);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.05);
  }
`

const SubForceHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`

const SubForceNumber = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: #6366f1;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

const AddSubForceButton = styled.button`
  width: 100%;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #8b5cf6;
  background: rgba(139, 92, 246, 0.05);
  border: 1.5px dashed rgba(139, 92, 246, 0.25);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(139, 92, 246, 0.1);
    border-color: #8b5cf6;
  }
`

const CountrySelectButtonSimple = styled.button`
  width: 100%;
  padding: 12px 16px;
  font-size: 14px;
  color: #0f172a;
  background: #ffffff;
  border: 1.5px solid rgba(226, 232, 240, 1);
  border-radius: 10px;
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;

  &:hover {
    border-color: #8b5cf6;
  }
`

// 고급 설정 섹션 스타일
const AdvancedSection = styled.div`
  margin-top: 40px;
  border: 1.5px solid rgba(99, 102, 241, 0.15);
  border-radius: 12px;
  overflow: hidden;
  background: white;
`

const AdvancedSectionHeader = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: rgba(99, 102, 241, 0.03);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.06);
  }
`

const AdvancedSectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;

  svg {
    color: #6366f1;
  }
`

const AdvancedBadge = styled.span`
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 6px;
`

const AdvancedToggleIcon = styled.div<{ $expanded: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  transform: ${({ $expanded }) =>
    $expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
  transition: transform 0.3s ease;
`

const AdvancedSectionContent = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  border-top: 1px solid rgba(226, 232, 240, 0.6);
`

const AdvancedSectionDescription = styled.p`
  margin: 0;
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
  padding: 16px;
  background: rgba(99, 102, 241, 0.03);
  border-left: 3px solid #6366f1;
  border-radius: 8px;
`

// 빠른 시작 버튼 추가
const SectionHeaderWithActions = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
`

const QuickTemplateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.25);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(139, 92, 246, 0.35);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    stroke-width: 2.5;
  }
`

// 탭 스타일
const TabsContainer = styled.div`
  display: flex;
  gap: 16px;
  padding: 0;
  background: transparent;
  border-radius: 0;
  border: none;
  box-shadow: none;
  max-width: ${FORM_FIELD_MAX_WIDTH};
  margin-bottom: 32px;
`

const TabButton = styled.button<{ $active: boolean }>`
  flex: 1;
  min-width: 140px;
  max-width: 200px;
  padding: 12px 18px;
  background: ${(props) =>
    props.$active
      ? 'linear-gradient(135deg, #ffffff 0%, #faf9fc 100%)'
      : '#ffffff'};
  border: 1.5px solid
    ${(props) => (props.$active ? '#8b5cf6' : 'rgba(226, 232, 240, 1)')};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 10px;
  position: relative;
  box-shadow: ${(props) =>
    props.$active
      ? '0 4px 16px rgba(139, 92, 246, 0.15), 0 1px 4px rgba(139, 92, 246, 0.1)'
      : '0 1px 3px rgba(0, 0, 0, 0.08)'};
  transform: ${(props) => (props.$active ? 'translateY(-1px)' : 'translateY(0)')};

  &::before {
    content: '';
    position: absolute;
    inset: -1.5px;
    background: ${(props) =>
      props.$active
        ? 'linear-gradient(135deg, #8b5cf6, #a78bfa, #8b5cf6)'
        : 'transparent'};
    border-radius: 12px;
    padding: 1.5px;
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: ${(props) => (props.$active ? 1 : 0)};
    transition: opacity 0.3s ease;
  }

  &:hover {
    background: ${(props) =>
      props.$active
        ? 'linear-gradient(135deg, #ffffff 0%, #faf9fc 100%)'
        : 'linear-gradient(135deg, #fafafa 0%, #f5f3ff 100%)'};
    border-color: ${(props) => (props.$active ? '#7c3aed' : '#8b5cf6')};
    transform: translateY(-2px);
    box-shadow: ${(props) =>
      props.$active
        ? '0 6px 20px rgba(139, 92, 246, 0.2), 0 2px 8px rgba(139, 92, 246, 0.12)'
        : '0 4px 12px rgba(139, 92, 246, 0.12)'};
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    min-width: 120px;
    padding: 10px 14px;
    gap: 8px;
  }
`

const TabIcon = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: ${(props) =>
    props.$active
      ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
      : 'rgba(148, 163, 184, 0.08)'};
  color: ${(props) => (props.$active ? '#ffffff' : '#64748b')};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${(props) =>
    props.$active ? '0 2px 6px rgba(139, 92, 246, 0.25)' : 'none'};

  svg {
    width: 16px;
    height: 16px;
  }

  ${TabButton}:hover & {
    background: ${(props) =>
      props.$active
        ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'
        : 'rgba(139, 92, 246, 0.15)'};
    color: ${(props) => (props.$active ? '#ffffff' : '#8b5cf6')};
    transform: scale(1.05) rotate(3deg);
  }

  @media (max-width: 768px) {
    width: 24px;
    height: 24px;

    svg {
      width: 14px;
      height: 14px;
    }
  }
`

const TabLabel = styled.span<{ $active?: boolean }>`
  font-size: 14px;
  font-weight: ${(props) => (props.$active ? '700' : '600')};
  color: ${(props) => (props.$active ? '#8b5cf6' : '#64748b')};
  letter-spacing: -0.01em;
  transition: all 0.3s ease;
  white-space: nowrap;

  ${TabButton}:hover & {
    color: #8b5cf6;
  }

  @media (max-width: 768px) {
    font-size: 12px;
  }
`

// 안내 박스 스타일
const InfoBox = styled.div`
  display: flex;
  gap: 14px;
  padding: 16px 18px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  border-left: 3px solid #8b5cf6;
  border-radius: 10px;
  margin-bottom: 20px;
  max-width: ${FORM_FIELD_MAX_WIDTH};
  box-shadow: 0 1px 3px rgba(139, 92, 246, 0.08);
  transition: all 0.2s ease;

  &:hover {
    border-left-color: #7c3aed;
    box-shadow: 0 2px 6px rgba(139, 92, 246, 0.12);
  }

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px;
  }
`

const InfoIconWrapper = styled.div`
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  color: #6366f1;

  svg {
    width: 20px;
    height: 20px;
  }

  @media (max-width: 768px) {
    svg {
      width: 18px;
      height: 18px;
    }
  }
`

const InfoContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const InfoTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  letter-spacing: -0.01em;

  @media (max-width: 768px) {
    font-size: 13px;
  }
`

const InfoDescription = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #64748b;
  font-weight: 400;

  @media (max-width: 768px) {
    font-size: 12px;
  }
`

const InfoExamples = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-left: 4px;
`

const InfoExample = styled.div`
  font-size: 12px;
  line-height: 1.6;
  color: #64748b;
  display: flex;
  align-items: baseline;
  gap: 6px;

  &::before {
    content: '•';
    color: #6366f1;
    font-weight: 700;
    flex-shrink: 0;
  }

  strong {
    font-weight: 600;
    color: #475569;
  }

  @media (max-width: 768px) {
    font-size: 11px;
  }
`

// 날짜/시간 입력 스타일
const DateTimeGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
`

const DateTimeLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #475569;
`

const DateTimeInputs = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 8px;
`

const DateInputButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #cbd5e1;
    background: #f8fafc;
  }

  span {
    flex: 1;
    text-align: left;
  }

  svg {
    flex-shrink: 0;
    color: #64748b;
  }
`

const TimeInputButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #cbd5e1;
    background: #f8fafc;
  }

  svg {
    flex-shrink: 0;
  }
`
