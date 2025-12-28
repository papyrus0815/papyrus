import React, { useEffect, useMemo, useRef, useState } from 'react'

import { createPortal } from 'react-dom'

import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import {
  FiCheck,
  FiChevronDown,
  FiFileText,
  FiGlobe,
  FiLayers,
  FiMapPin,
  FiPlus,
  FiSave,
  FiSearch,
  FiShield,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'

// FSD: features/event-create
import {
  FORM_STEPS,
  buildEventSubmitData,
  buildMilitaryEventData,
  categoryNameMap,
  extractMentions,
  fromCombatTypeDto,
  fromConflictTypeDto,
  getFormSteps,
  getStepTitle,
  isDiplomaticCategory,
  isMilitaryCategory,
  validateBasicInfo,
} from '@/features/event-create/lib'
import { type EventSection, type FormStep } from '@/features/event-create/model'
import {
  type CountryResponseDto,
  getAllCountries,
} from '@/shared/api/countries'
import {
  type EventCategoryDto,
  getAllEventCategories,
} from '@/shared/api/event-categories'
import {
  type EventResponseDto,
  createEvent,
  getAllEvents,
  getEventById,
  getEventsByParentId,
  updateEvent,
} from '@/shared/api/events'
import {
  type HistoricalCountryResponseDto,
  getAllHistoricalCountries,
} from '@/shared/api/historical-countries'
import { type MilitaryUnit, militaryUnitApi } from '@/shared/api/military-unit'
import { type PersonResponseDto, getAllPersons } from '@/shared/api/persons'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { pathKeys } from '@/shared/router'
import {
  type CountryInSide,
  type MilitaryEvent,
} from '@/shared/types/military-event.types'
import {
  BasicInfoSection,
  DetailsSection,
  LocationSection,
  StepNavigation,
} from '@/widgets/event-form/ui'

import type { EventBelligerentsGraph } from '../types/belligerents-graph.types'
import type { ConferenceEvent } from '../types/conference-event.types'
import { formatDateRange } from '../utils/events.utils'
import { ConferenceEventForm } from './conference-event-form'
import * as S from './event-create.styles'
import { CATEGORY_ICON_MAP } from './events.constants'
import { HistoricalEvent, HistoricalEventCategory } from './events.types'
import { searchMentionEntities } from './mention-system'
import {
  type BelligerentSide,
  type CasualtyData,
  type MilitaryConflictDetails,
  MilitaryEventForm,
} from './military-event-form'

export const EventCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const routerLocation = useLocation()
  const playClickSound = useClickSound()

  // 편집 모드 감지
  const editEventId = routerLocation.state?.editEventId as string | undefined
  const isEditMode = Boolean(editEventId)

  // ===== 상태 관리 (기존 방식 유지, 점진적 마이그레이션 가능) =====
  const [currentStep, setCurrentStep] = useState<FormStep>(FORM_STEPS.BASIC)
  const [isLoadingEvent, setIsLoadingEvent] = useState(false)
  const [dbCategories, setDbCategories] = useState<EventCategoryDto[]>([])

  // 기본 정보
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [category, setCategory] = useState<HistoricalEventCategory | ''>('')
  const [thumbnail, setThumbnail] = useState<string>('')
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)

  // 군사 카테고리 전용 필드 - 정규화된 구조
  const [militaryEvent, setMilitaryEvent] = useState<MilitaryEvent>({
    belligerentSides: [],
    relations: [],
    militaryDetails: {
      conflictType: undefined,
      combatTypes: [],
    },
    casualties: [],
    warCost: '',
  })

  // 레거시 구조 (하위 호환성 - 기존 데이터 로드용)
  const [belligerents, setBelligerents] = useState<BelligerentSide[]>([])
  const setBelligerentsWithLog = (value: BelligerentSide[]) => {
    console.log('🔥🔥🔥 [setBelligerents 호출]:', value)
    setBelligerents(value)
  }
  const [belligerentsGraph, setBelligerentsGraph] =
    useState<EventBelligerentsGraph>({
      countries: [],
      relations: [],
    })
  const [casualties, setCasualties] = useState<{
    [sideId: string]: CasualtyData
  }>({})
  const [militaryDetails, setMilitaryDetails] =
    useState<MilitaryConflictDetails>({
      type: 'battle',
      combatType: ['land'],
      outcome: '',
    })
  const [warCost, setWarCost] = useState('')

  // 회담/외교 카테고리 전용 필드
  const [conferenceEvent, setConferenceEvent] = useState<ConferenceEvent>({
    participants: [],
    treaties: [],
    countryTerms: [],
  })

  // 섹션 기반 내용 작성
  const [sections, setSections] = useState<EventSection[]>([
    { id: '1', title: 'Part 1', content: '', mentions: [] },
  ])

  // 위치 정보
  const [location, setLocation] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')

  // 관계 정보
  const [parentEventId, setParentEventId] = useState('')
  const [parentEventSearch, setParentEventSearch] = useState('')
  const [showParentEventList, setShowParentEventList] = useState(false)
  const [parentEventData, setParentEventData] =
    useState<EventResponseDto | null>(null)
  const parentEventSelectorRef = useRef<HTMLDivElement>(null)

  // 하위 사건들의 관계 데이터
  const [childEventsRelations, setChildEventsRelations] = useState<
    Array<{
      relation: EventBelligerentsGraph
      sourceName: string
    }>
  >([])

  // 관련 인물
  const [relatedPersons, setRelatedPersons] = useState<
    Array<{ personId: string; role: string; note: string }>
  >([])
  const [personSearch, setPersonSearch] = useState('')
  const [showPersonList, setShowPersonList] = useState(false)
  const [availablePersons, setAvailablePersons] = useState<PersonResponseDto[]>(
    [],
  )
  const personSelectorRef = useRef<HTMLDivElement>(null)

  // 멘션 시스템용 엔티티 데이터
  const [availableCountries, setAvailableCountries] = useState<
    CountryResponseDto[]
  >([])
  const [availableHistoricalCountries, setAvailableHistoricalCountries] =
    useState<HistoricalCountryResponseDto[]>([])
  const [availableMilitaryUnits, setAvailableMilitaryUnits] = useState<
    MilitaryUnit[]
  >([])

  // 관련 사건
  const [relatedEventIds, setRelatedEventIds] = useState<string[]>([])
  const [relatedEventSearch, setRelatedEventSearch] = useState('')
  const [showRelatedEventList, setShowRelatedEventList] = useState(false)
  const relatedEventSelectorRef = useRef<HTMLDivElement>(null)
  const [availableEvents, setAvailableEvents] = useState<EventResponseDto[]>([])

  // 태그
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  // 관련 국가 (간소화)
  const [relatedCountryIds, setRelatedCountryIds] = useState<string[]>([])
  const [relatedHistoricalCountryIds, setRelatedHistoricalCountryIds] =
    useState<string[]>([])
  const [showCountryModal, setShowCountryModal] = useState(false)
  const [countrySearchTerm, setCountrySearchTerm] = useState('')

  // 멘션 자동완성
  const [mentionState, setMentionState] = useState<{
    sectionId: string
    cursorPosition: number
    searchTerm: string
    type: 'person' | 'event' | null
  } | null>(null)
  const mentionInputRef = useRef<HTMLTextAreaElement>(null)

  // 모든 엔티티 데이터 로드
  useEffect(() => {
    Promise.all([
      getAllPersons()
        .then((persons) => {
          console.log('✅ 인물 목록 로드 성공:', persons.length, '명')
          setAvailablePersons(persons)
          return persons
        })
        .catch((error) => {
          console.error('❌ 인물 목록 로드 실패:', error)
          setAvailablePersons([])
          return []
        }),
      getAllCountries()
        .then((countries) => {
          setAvailableCountries(countries)
          return countries
        })
        .catch((error) => {
          console.error('국가 목록 로드 실패:', error)
          return []
        }),
      getAllHistoricalCountries()
        .then((hc) => {
          setAvailableHistoricalCountries(hc)
          return hc
        })
        .catch((error) => {
          console.error('역사적 국가 목록 로드 실패:', error)
          return []
        }),
      getAllEventCategories()
        .then((categories) => {
          console.log('✅ 카테고리 목록 로드 성공:', categories)
          setDbCategories(categories)
          return categories
        })
        .catch((error) => {
          console.error('❌ 카테고리 목록 로드 실패:', error)
          setDbCategories([])
          return []
        }),
      militaryUnitApi
        .getAll()
        .then((units) => {
          setAvailableMilitaryUnits(units)
          return units
        })
        .catch((error) => {
          console.error('군부대 목록 로드 실패:', error)
          return []
        }),
      getAllEvents()
        .then((events) => {
          console.log('✅ 사건 목록 로드 성공:', events.length, '건')
          setAvailableEvents(events)
          return events
        })
        .catch((error) => {
          console.error('❌ 사건 목록 로드 실패:', error)
          setAvailableEvents([])
          return []
        }),
    ])
  }, [])

  // 편집 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (!isEditMode || !editEventId) return

    const loadEvent = async () => {
      setIsLoadingEvent(true)
      try {
        const event = await getEventById(editEventId)

        // 기본 정보 설정
        setTitle(event.title)
        setDescription(event.description || '')
        setStartDate(event.startDate || '')
        setEndDate(event.endDate || '')

        // 시간 정보 추출 (ISO 형식인 경우)
        if (event.startDate) {
          try {
            const startDateTime = new Date(event.startDate)
            if (!isNaN(startDateTime.getTime())) {
              const hours = startDateTime.getHours().toString().padStart(2, '0')
              const minutes = startDateTime
                .getMinutes()
                .toString()
                .padStart(2, '0')
              if (hours !== '00' || minutes !== '00') {
                setStartTime(`${hours}:${minutes}`)
              }
              // 날짜만 설정 (시간 제외)
              setStartDate(event.startDate.split('T')[0])
            }
          } catch (e) {
            // 파싱 실패 시 그대로 사용
          }
        }

        if (event.endDate) {
          try {
            const endDateTime = new Date(event.endDate)
            if (!isNaN(endDateTime.getTime())) {
              const hours = endDateTime.getHours().toString().padStart(2, '0')
              const minutes = endDateTime
                .getMinutes()
                .toString()
                .padStart(2, '0')
              if (hours !== '00' || minutes !== '00') {
                setEndTime(`${hours}:${minutes}`)
              }
              // 날짜만 설정 (시간 제외)
              setEndDate(event.endDate.split('T')[0])
            }
          } catch (e) {
            // 파싱 실패 시 그대로 사용
          }
        }
        setLocation(event.location || '')
        setThumbnail(event.thumbnail || '')

        // 카테고리 설정 (서버에서 받은 이름을 그대로 사용)
        if (event.category?.name) {
          const mappedCategory = event.category.name
          setCategory(mappedCategory)
          console.log(
            '✅ 카테고리 로드:',
            event.category.name,
            '→',
            mappedCategory,
          )
        }

        // 섹션 데이터 설정
        if (event.sections) {
          // 객체 형태 { items: [...] }인 경우
          if (
            typeof event.sections === 'object' &&
            !Array.isArray(event.sections)
          ) {
            if (event.sections.items && Array.isArray(event.sections.items)) {
              setSections(event.sections.items)
            }
          }
          // 배열 형태 (레거시)인 경우
          else if (Array.isArray(event.sections)) {
            setSections(event.sections)
          }
        }

        // 군사 정보 설정
        // 1. 정규화된 구조 먼저 확인
        if ('militaryEvent' in event && event.militaryEvent) {
          console.log('📥 정규화된 군사 정보 로드:', event.militaryEvent)
          const militaryEventData: MilitaryEvent = event.militaryEvent
          setMilitaryEvent(militaryEventData)

          // 📌 belligerentSides를 belligerents로 역변환
          if (
            militaryEventData.belligerentSides &&
            militaryEventData.belligerentSides.length > 0
          ) {
            const sideLevelMap: Record<
              string,
              'coalition' | 'country' | 'force'
            > = {
              COALITION: 'coalition',
              COUNTRY: 'country',
              FORCE: 'force',
            }

            const participationMap: Record<
              string,
              'full' | 'limited' | 'indirect' | 'non-combatant'
            > = {
              MAIN: 'full',
              SUPPORT: 'indirect',
              LIMITED: 'limited',
              OCCUPIED: 'non-combatant',
            }

            const reversedBelligerents = militaryEventData.belligerentSides.map(
              (side, index: number) => ({
                id: `side-${index}`,
                name: side.name,
                sideName: side.name,
                level:
                  side.level && side.level in sideLevelMap
                    ? sideLevelMap[side.level as keyof typeof sideLevelMap]
                    : 'country',
                commander: side.commander || '',
                commanderPersonId: side.commanderPersonId,
                forces: side.forces || '',
                description: side.description,
                countries: (side.countries || []).map((country) => {
                  // ✅ 국가 이름 조회
                  const countryInfo = country.countryId
                    ? availableCountries.find(
                        (ct) => ct.id === country.countryId,
                      )
                    : availableHistoricalCountries.find(
                        (ct) => ct.id === country.historicalCountryId,
                      )

                  return {
                    countryId: country.countryId || country.historicalCountryId,
                    countryName: countryInfo?.name || 'Unknown', // ✅ 국가 이름 설정
                    isHistorical: !!country.historicalCountryId,
                    commander: country.commander,
                    commanderPersonId: country.commanderPersonId,
                    forces: country.forces,
                    participation:
                      country.participationType &&
                      participationMap[country.participationType]
                        ? participationMap[country.participationType]
                        : 'full',
                    joinDate: country.joinDate,
                    withdrawDate: country.withdrawDate,
                    description: country.description,
                  }
                }),
              }),
            )

            setBelligerents(reversedBelligerents as BelligerentSide[])

            console.log(
              '✅ belligerentSides → belligerents 역변환 완료:',
              reversedBelligerents.length,
            )

            // 📌 belligerents를 belligerentsGraph로 변환 (화면 표시용)
            const graphCountries = reversedBelligerents.flatMap((side) =>
              (side.countries || []).map((country: CountryInSide) => {
                const countryId =
                  country.countryId || country.historicalCountryId || ''
                const countryName =
                  (country as { countryName?: string }).countryName || side.name
                return {
                  countryId,
                  countryName,
                  isHistorical: !!country.historicalCountryId,
                  participation: 'full' as const,
                  role: side.name, // ✅ 진영 이름을 role로 저장
                  joinDate: country.joinDate, // ✅ 참전 날짜 저장
                  withdrawDate: country.withdrawDate, // ✅ 철수 날짜 저장
                  forces: country.forces, // ✅ 병력 규모 저장
                  commander: country.commander, // ✅ 지휘관 저장
                }
              }),
            )

            // manualSides 생성 (진영 정보)
            const manualSides = reversedBelligerents.map((side) => ({
              id: side.id,
              name: side.name,
              color: undefined, // 색상은 UI에서 자동 지정
              memberCountryIds: (side.countries || [])
                .map((country) => country.countryId || '')
                .filter(Boolean),
            }))

            // relations 역변환 (DTO → 프론트엔드 형식)
            const graphRelations = (militaryEventData.relations || [])
              .map((relation) => {
                const fromCountry =
                  relation.fromCountryId || relation.fromHistoricalCountryId
                const toCountry =
                  relation.toCountryId || relation.toHistoricalCountryId
                if (!fromCountry || !toCountry) return null
                return {
                  id: `relation-${Date.now()}-${Math.random()}`,
                  fromCountry,
                  toCountry,
                  relationType: relation.relationType.toLowerCase() as
                    | 'allied'
                    | 'enemy'
                    | 'neutral'
                    | 'puppet'
                    | 'occupied'
                    | 'cooperation'
                    | 'non-aggression',
                  startDate: relation.startDate || '',
                  endDate: relation.endDate || '',
                  strength: relation.strength || 0,
                  description: relation.description || '',
                }
              })
              .filter(
                (relation): relation is NonNullable<typeof relation> =>
                  relation !== null,
              )

            setBelligerentsGraph({
              countries: graphCountries,
              relations: graphRelations,
              manualSides: manualSides,
            })

            console.log(
              '✅ belligerentsGraph 생성 완료:',
              graphCountries.length,
              '개 국가,',
              manualSides.length,
              '개 진영,',
              graphRelations.length,
              '개 관계',
            )
          }

          // ===== FSD: 역변환 함수 사용 =====
          if (militaryEventData.militaryDetails) {
            const md = militaryEventData.militaryDetails

            setMilitaryDetails({
              type: md.conflictType
                ? fromConflictTypeDto(md.conflictType)
                : 'battle',
              combatType: (md.combatTypes || []).map((ct) =>
                ct ? fromCombatTypeDto(ct) : 'land',
              ),
              objective: md.objective,
              tactics: md.tactics,
              strategy: md.strategy,
              outcome: md.outcome || '',
              territoryChanges: md.territoryChanges,
              treaty: md.treaty,
              strategicImpact: md.strategicImpact,
            })

            console.log('✅ militaryDetails 역변환 완료 (FSD 함수 사용)')
          }

          // 전쟁 비용 설정
          if (militaryEventData.warCost) {
            setWarCost(militaryEventData.warCost)
          }
        }
        // 2. 레거시 구조 (하위 호환성)
        else if (event.belligerents) {
          console.log('📥 레거시 belligerents 로드:', event.belligerents)

          // 레거시 구조를 그대로 로드 (기존 UI 유지)
          if ('sides' in event.belligerents) {
            const sidesArray = event.belligerents.sides || []
            const sidesWithIds = sidesArray.map(
              (side: {
                id?: string
                name?: string
                countries?: unknown[]
                commander?: string
                forces?: string
                [key: string]: unknown
              }) => ({
                id: side.id || `side-${Date.now()}-${Math.random()}`,
                name: side.name || '',
                countries: (
                  (side.countries || []) as Array<{
                    countryId?: string
                    countryName?: string
                    isHistorical?: boolean
                    participation?: string
                    [key: string]: unknown
                  }>
                ).map((countryItem) => ({
                  countryId: countryItem.countryId || '',
                  countryName: countryItem.countryName || '',
                  isHistorical: countryItem.isHistorical || false,
                  participation: countryItem.participation || 'full',
                })),
                commander: side.commander || '',
                forces: side.forces || '',
                description: side.description as string | undefined,
              }),
            )
            setBelligerents(
              Array.isArray(sidesWithIds)
                ? (sidesWithIds as BelligerentSide[])
                : [],
            )

            // 고급 관계 메타데이터 로드
            if (
              'metadata' in event.belligerents &&
              event.belligerents.metadata
            ) {
              const metadata = event.belligerents.metadata

              const countries = sidesArray.flatMap(
                (side: {
                  countries?: Array<{
                    countryId?: string
                    countryName?: string
                    isHistorical?: boolean
                  }>
                }) =>
                  (side.countries || []).map((country) => ({
                    countryId: country.countryId || '',
                    countryName: country.countryName || '',
                    isHistorical: country.isHistorical || false,
                    participation: 'full' as const,
                  })),
              )

              setBelligerentsGraph({
                countries,
                relations: metadata.countryRelations || [],
                treaties: metadata.treaties
                  ? metadata.treaties.map((treaty) => ({
                      id: treaty.id,
                      name: treaty.name,
                      signDate: treaty.signDate,
                      expiryDate: treaty.expiryDate,
                      violationDate: treaty.violationDate,
                      signatories: treaty.signatories,
                      type:
                        treaty.type === 'other'
                          ? 'alliance'
                          : (treaty.type as
                              | 'alliance'
                              | 'non-aggression'
                              | 'trade'
                              | 'territorial'),
                      terms: treaty.terms,
                      description: treaty.description,
                    }))
                  : undefined,
                alliances: metadata.alliances
                  ? metadata.alliances.map((alliance) => ({
                      id: alliance.id,
                      name: alliance.name,
                      formationDate: alliance.formationDate,
                      dissolutionDate: alliance.dissolutionDate,
                      type: 'military' as const,
                      members: alliance.members.map((member) => ({
                        countryId: member.countryId,
                        countryName: member.countryId, // 기본값으로 countryId 사용
                        joinDate: member.joinDate,
                        leaveDate: member.leaveDate,
                        status: member.status,
                      })),
                      description: alliance.description,
                    }))
                  : undefined,
              })
            }
          }
        }

        // 레거시 피해 정보 & 군사 상세 정보
        if (event.casualties) {
          setCasualties(event.casualties)
        }
        if (event.militaryDetails) {
          setMilitaryDetails(event.militaryDetails)
        }
        if (event.warCost) {
          setWarCost(event.warCost)
        }

        // 회담 정보 로드
        if ('conferenceEvent' in event && event.conferenceEvent) {
          console.log('📥 회담 정보 로드:', event.conferenceEvent)
          setConferenceEvent(event.conferenceEvent)
        }

        toast.success('사건 정보를 불러왔습니다')
      } catch (error) {
        console.error('사건 정보 로드 실패:', error)
        toast.error('사건 정보를 불러오는데 실패했습니다')
      } finally {
        setIsLoadingEvent(false)
      }
    }

    loadEvent()
  }, [isEditMode, editEventId])

  // 외부 클릭 시 리스트 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        parentEventSelectorRef.current &&
        !parentEventSelectorRef.current.contains(event.target as Node)
      ) {
        setShowParentEventList(false)
      }
      if (
        personSelectorRef.current &&
        !personSelectorRef.current.contains(event.target as Node)
      ) {
        setShowPersonList(false)
      }
      if (
        relatedEventSelectorRef.current &&
        !relatedEventSelectorRef.current.contains(event.target as Node)
      ) {
        setShowRelatedEventList(false)
      }
    }

    if (showParentEventList || showPersonList || showRelatedEventList) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showParentEventList, showPersonList, showRelatedEventList])

  // ===== FSD: 폼 단계 설정 =====
  const steps = useMemo(() => {
    const formSteps = getFormSteps(category)
    console.log('📋 폼 단계 생성:', {
      category,
      isMilitary: isMilitaryCategory(category),
      isDiplomatic: isDiplomaticCategory(category),
      steps: formSteps.map((step) => step.label),
    })
    return formSteps
  }, [category])

  const handleSubmit = async () => {
    try {
      // ===== FSD: 유효성 검증 =====
      if (!validateBasicInfo({ title, startDate })) {
        return
      }

      // ===== FSD: 멘션 추출 =====
      const { mentionedPersons, mentionedEvents } = extractMentions(sections)

      console.log(
        '📌 선택된 카테고리:',
        category,
        '→',
        category ? categoryNameMap[category] : 'undefined',
      )

      // ===== FSD: 군사 이벤트 데이터 생성 =====
      const finalMilitaryEvent = isMilitaryCategory(category)
        ? buildMilitaryEventData(category, {
            belligerents,
            belligerentsGraph,
            militaryDetails,
            casualties,
            warCost,
          })
        : undefined

      if (finalMilitaryEvent) {
        console.log('✅ 군사 이벤트 데이터 생성 완료:', {
          belligerentSides: finalMilitaryEvent.belligerentSides?.length || 0,
          relations: finalMilitaryEvent.relations?.length || 0,
          hasMilitaryDetails: !!finalMilitaryEvent.militaryDetails,
          casualties: finalMilitaryEvent.casualties?.length || 0,
        })
      }

      // ===== FSD: buildEventSubmitData 사용 =====
      const eventData = buildEventSubmitData({
        title: title.trim(),
        description: description.trim(),
        startDate,
        startTime,
        endDate,
        endTime,
        category,
        location,
        thumbnail,
        parentEventId,
        tags,
        relatedCountryIds,
        relatedHistoricalCountryIds,
        relatedPersons,
        relatedEventIds,
        sections,
        militaryEvent: finalMilitaryEvent,
        conferenceEvent,
        belligerentsGraph,
        warCost,
        mentionedPersons,
        mentionedEvents,
      })

      console.log('📤 사건 데이터 전송:', eventData)

      // API 호출
      if (isEditMode && editEventId) {
        // 수정 모드
        await updateEvent(
          editEventId,
          eventData as Parameters<typeof updateEvent>[1],
        )
        toast.success('사건이 성공적으로 수정되었습니다!')
      } else {
        // 등록 모드
        await createEvent(eventData as Parameters<typeof createEvent>[0])
        toast.success('사건이 성공적으로 등록되었습니다!')
      }

      // 성공 시 목록 페이지로 이동
      navigate(pathKeys.history.events())
    } catch (error) {
      console.error('사건 등록 실패:', error)
      toast.error(
        `사건 등록에 실패했습니다: ${
          error instanceof Error ? error.message : '알 수 없는 오류'
        }`,
      )
    }
  }

  // =====  단계 유효성 검증 =====
  const isStepValid = (step: FormStep): boolean => {
    switch (step) {
      case 'basic':
        const hasTitle = title.trim().length > 0
        const hasStartDate = startDate.length > 0
        const isDateValid =
          !endDate || !startDate || new Date(endDate) >= new Date(startDate)
        return hasTitle && hasStartDate && isDateValid
      case 'details':
        return true // 선택사항
      case 'location':
        return true // 선택사항
      case 'relationships':
        return true // 선택사항
      default:
        return false
    }
  }

  // =====  날짜 유효성 검증 =====
  const getDateError = (): string | null => {
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      return '종료일은 시작일보다 이후여야 합니다'
    }
    return null
  }

  // =====  날짜 차이 계산 =====
  const calculateDaysDifference = (): number | null => {
    if (!startDate || !endDate) return null

    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return diffDays
  }

  // 날짜 포맷팅 함수 (YYYY-MM-DD → YYYY년 MM월 DD일)
  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const day = date.getDate()
      return `${year}년 ${month}월 ${day}일`
    } catch {
      return dateString
    }
  }

  // =====  부모 사건 필터링 =====
  const filteredParentEvents = useMemo(() => {
    const searchTerm = parentEventSearch.toLowerCase().trim()
    if (!searchTerm) {
      return availableEvents.slice(0, 10) // 검색어가 없으면 최대 10개만 표시
    }

    return availableEvents.filter(
      (event) =>
        event.title.toLowerCase().includes(searchTerm) ||
        (event.description &&
          event.description.toLowerCase().includes(searchTerm)),
    )
  }, [parentEventSearch, availableEvents])

  // =====  인물 필터링 =====
  const filteredPersons = useMemo(() => {
    const searchTerm = personSearch.toLowerCase().trim()
    if (!searchTerm) {
      return availablePersons.slice(0, 10)
    }

    return availablePersons.filter((person) =>
      person.name?.toLowerCase().includes(searchTerm),
    )
  }, [personSearch, availablePersons])

  // =====  관련 사건 필터링 =====
  const filteredRelatedEvents = useMemo(() => {
    const searchTerm = relatedEventSearch.toLowerCase().trim()
    const excludeIds = [parentEventId, ...relatedEventIds].filter(Boolean)
    let events = availableEvents.filter(
      (event) => !excludeIds.includes(event.id),
    )

    if (!searchTerm) {
      return events.slice(0, 10)
    }

    return events.filter(
      (event) =>
        event.title.toLowerCase().includes(searchTerm) ||
        (event.description &&
          event.description.toLowerCase().includes(searchTerm)),
    )
  }, [relatedEventSearch, parentEventId, relatedEventIds, availableEvents])

  // 통합 멘션 자동완성 (모든 타입 검색)
  const mentionSuggestions = useMemo(() => {
    if (!mentionState) return []

    const searchTerm = mentionState.searchTerm.trim()

    // 모든 엔티티에서 검색
    const results = searchMentionEntities(searchTerm, {
      persons: availablePersons,
      events: availableEvents as (EventResponseDto | HistoricalEvent)[],
      countries: availableCountries,
      historicalCountries: availableHistoricalCountries,
      militaryUnits: availableMilitaryUnits,
    })

    // 타입별로 그룹화하여 반환 (최대 20개)
    return results.slice(0, 20)
  }, [
    mentionState,
    availablePersons,
    availableCountries,
    availableHistoricalCountries,
    availableMilitaryUnits,
  ])

  // 선택된 사건이 변경되면 검색어 업데이트
  useEffect(() => {
    if (parentEventId) {
      const selectedEvent = availableEvents.find((e) => e.id === parentEventId)
      if (selectedEvent && parentEventSearch !== selectedEvent.title) {
        setParentEventSearch(selectedEvent.title)
      }
      // 부모 사건의 전체 정보 로드 (belligerents 포함)
      getEventById(parentEventId)
        .then((event) => {
          console.log('📥 부모 사건 로드:', event)
          console.log('📥 부모 사건 belligerents:', event.belligerents)
          console.log(
            '📥 부모 사건 belligerents type:',
            typeof event.belligerents,
          )
          if (event.belligerents) {
            console.log(
              '📥 부모 사건 belligerents.sides:',
              event.belligerents.sides,
            )
            console.log(
              '📥 부모 사건 belligerents.sides is array:',
              Array.isArray(event.belligerents.sides),
            )
          }
          setParentEventData(event)
        })
        .catch((error) => {
          console.error('부모 사건 정보 로드 실패:', error)
          setParentEventData(null)
        })
    } else if (!parentEventId && parentEventSearch) {
      setParentEventData(null)
      // 선택이 해제되면 검색어도 초기화하지 않음 (사용자가 검색 중일 수 있음)
    }
  }, [parentEventId])

  // 수정 모드일 때 하위 사건들의 관계 로드
  useEffect(() => {
    if (isEditMode && editEventId) {
      getEventsByParentId(editEventId)
        .then((childEvents) => {
          const allChildRelations: Array<{
            relation: EventBelligerentsGraph
            sourceName: string
          }> = []

          childEvents.forEach((childEvent) => {
            if (
              childEvent.belligerents &&
              typeof childEvent.belligerents === 'object' &&
              'metadata' in childEvent.belligerents &&
              childEvent.belligerents.metadata &&
              'countryRelations' in childEvent.belligerents.metadata &&
              Array.isArray(childEvent.belligerents.metadata.countryRelations)
            ) {
              const relations = childEvent.belligerents.metadata
                .countryRelations as Array<{
                fromCountry?: string
                toCountry?: string
                [key: string]: unknown
              }>
              const countries: EventBelligerentsGraph['countries'] = []
              const graphRelations = relations.map((relationItem) => {
                const relationTypeStr =
                  (relationItem.relationType as string)?.toLowerCase() ||
                  'neutral'
                const validRelationTypes: Array<
                  | 'allied'
                  | 'enemy'
                  | 'neutral'
                  | 'puppet'
                  | 'occupied'
                  | 'cooperation'
                  | 'non-aggression'
                > = [
                  'allied',
                  'enemy',
                  'neutral',
                  'puppet',
                  'occupied',
                  'cooperation',
                  'non-aggression',
                ]
                const relationType = validRelationTypes.includes(
                  relationTypeStr as (typeof validRelationTypes)[number],
                )
                  ? (relationTypeStr as (typeof validRelationTypes)[number])
                  : 'neutral'
                return {
                  id: `relation-${Date.now()}-${Math.random()}`,
                  fromCountry: relationItem.fromCountry || '',
                  toCountry: relationItem.toCountry || '',
                  relationType: relationType as
                    | 'allied'
                    | 'enemy'
                    | 'neutral'
                    | 'puppet'
                    | 'occupied'
                    | 'cooperation'
                    | 'non-aggression',
                  startDate: (relationItem.startDate as string) || '',
                  endDate: (relationItem.endDate as string) || undefined,
                  strength: (relationItem.strength as number) || 0,
                  description:
                    (relationItem.description as string) || undefined,
                }
              }) as EventBelligerentsGraph['relations']
              allChildRelations.push({
                relation: {
                  countries,
                  relations: graphRelations,
                },
                sourceName: childEvent.title,
              })
            }
          })

          setChildEventsRelations(
            allChildRelations as Array<{
              relation: EventBelligerentsGraph
              sourceName: string
            }>,
          )
          console.log('📥 하위 사건 관계 로드:', allChildRelations)
        })
        .catch((error) => {
          console.error('하위 사건 관계 로드 실패:', error)
          setChildEventsRelations([])
        })
    } else {
      setChildEventsRelations([])
    }
  }, [isEditMode, editEventId])

  return (
    <S.PageWrapper>
      <S.ContentWrapper>
        {/* ===== FSD Widget: StepNavigation ===== */}
        <StepNavigation
          steps={steps}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          playClickSound={playClickSound}
          onBack={() => navigate(pathKeys.history.events())}
        />

        {/* 우측: 폼 */}
        <S.FormArea>
          {/* 폼 헤더 */}
          <S.FormAreaHeader>
            <S.FormAreaTitle>
              {getStepTitle(currentStep, category)}
            </S.FormAreaTitle>
            <div style={{ display: 'flex', gap: '8px' }}>
              <S.ActionButton
                type="button"
                $variant="primary"
                onClick={() => {
                  playClickSound()
                  handleSubmit()
                }}
                disabled={!isStepValid('basic')}
              >
                <FiSave size={16} />
                {isEditMode ? '수정 완료' : '사건 등록'}
              </S.ActionButton>
            </div>
          </S.FormAreaHeader>
          {/* ===== 기본 정보 section ===== */}
          {currentStep === FORM_STEPS.BASIC && (
            <BasicInfoSection
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              startDate={startDate}
              setStartDate={setStartDate}
              startTime={startTime}
              setStartTime={setStartTime}
              endDate={endDate}
              setEndDate={setEndDate}
              endTime={endTime}
              setEndTime={setEndTime}
              category={category}
              setCategory={setCategory}
              thumbnail={thumbnail}
              setThumbnail={setThumbnail}
              setThumbnailFile={setThumbnailFile}
              dbCategories={dbCategories}
              tags={tags}
              setTags={setTags}
              relatedCountryIds={relatedCountryIds}
              setRelatedCountryIds={setRelatedCountryIds}
              relatedHistoricalCountryIds={relatedHistoricalCountryIds}
              setRelatedHistoricalCountryIds={setRelatedHistoricalCountryIds}
              setShowCountryModal={setShowCountryModal}
              availableCountries={availableCountries}
              availableHistoricalCountries={availableHistoricalCountries}
              playClickSound={playClickSound}
              getDateError={getDateError}
              calculateDaysDifference={calculateDaysDifference}
            />
          )}

          {currentStep === FORM_STEPS.MILITARY &&
            isMilitaryCategory(category) && (
              <S.FormSection
                as={motion.div}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* 합진영 정보 (관계 그래프 포함) */}
                <MilitaryEventForm
                  // 규격화된 구조 (로직 방식)
                  militaryEvent={militaryEvent}
                  setMilitaryEvent={setMilitaryEvent}
                  // 레거시 (하위 호환성)
                  belligerents={belligerents}
                  setBelligerents={setBelligerents}
                  casualties={casualties}
                  setCasualties={setCasualties}
                  militaryDetails={militaryDetails}
                  setMilitaryDetails={setMilitaryDetails}
                  warCost={warCost}
                  setWarCost={setWarCost}
                  availableCountries={availableCountries}
                  availableHistoricalCountries={availableHistoricalCountries}
                  availableMilitaryUnits={availableMilitaryUnits}
                  availablePersons={availablePersons}
                  parentEvent={
                    parentEventData
                      ? {
                          id: parentEventData.id,
                          title: parentEventData.title,
                          belligerents:
                            parentEventData.belligerents &&
                            typeof parentEventData.belligerents === 'object' &&
                            'sides' in parentEventData.belligerents &&
                            Array.isArray(parentEventData.belligerents.sides)
                              ? {
                                  sides: parentEventData.belligerents.sides.map(
                                    (side: {
                                      name?: string
                                      id?: string
                                      countries?: unknown[]
                                      commander?: string
                                      forces?: string
                                      description?: string
                                      [key: string]: unknown
                                    }) => ({
                                      id:
                                        side.id ||
                                        `side-${Date.now()}-${Math.random()}`,
                                      name: side.name || '',
                                      countries: (
                                        (side.countries as Array<{
                                          countryId?: string
                                          countryName?: string
                                          isHistorical?: boolean
                                          participation?: string
                                          [key: string]: unknown
                                        }>) || []
                                      ).map((countryItem) => ({
                                        countryId: countryItem.countryId || '',
                                        countryName:
                                          countryItem.countryName || '',
                                        isHistorical:
                                          countryItem.isHistorical || false,
                                        participation:
                                          countryItem.participation || 'full',
                                      })),
                                      commander: side.commander || '',
                                      forces: side.forces || '',
                                      description: side.description,
                                    }),
                                  ) as BelligerentSide[],
                                }
                              : undefined,
                        }
                      : undefined
                  }
                  // 관계 그래프 설정
                  belligerentsGraph={belligerentsGraph}
                  setBelligerentsGraph={setBelligerentsGraph}
                  // 하위 사건들의 관계
                  childEventsRelations={childEventsRelations}
                />
              </S.FormSection>
            )}

          {currentStep === FORM_STEPS.MILITARY &&
            isDiplomaticCategory(category) && (
              <S.FormSection
                as={motion.div}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ConferenceEventForm
                  conferenceEvent={conferenceEvent}
                  setConferenceEvent={setConferenceEvent}
                  availableCountries={availableCountries}
                  availableHistoricalCountries={availableHistoricalCountries}
                  availablePersons={availablePersons}
                />
              </S.FormSection>
            )}

          {/* ===== FSD Widget: DetailsSection ===== */}
          {currentStep === FORM_STEPS.DETAILS && (
            <DetailsSection
              sections={sections}
              setSections={setSections}
              availablePersons={availablePersons}
              availableEvents={availableEvents}
              availableCountries={availableCountries}
              availableHistoricalCountries={availableHistoricalCountries}
              availableMilitaryUnits={availableMilitaryUnits}
              playClickSound={playClickSound}
            />
          )}

          {/* ===== FSD Widget: LocationSection ===== */}
          {currentStep === FORM_STEPS.LOCATION && (
            <LocationSection
              location={location}
              setLocation={setLocation}
              latitude={latitude}
              setLatitude={setLatitude}
              longitude={longitude}
              setLongitude={setLongitude}
            />
          )}

          {currentStep === FORM_STEPS.BASIC && (
            <S.FormSection>
              {/* 상위 사건 */}
              <S.FormRow>
                <S.FormLabel>상위 사건</S.FormLabel>
                <S.FormField>
                  <S.ParentEventSelector ref={parentEventSelectorRef}>
                    <S.ParentEventInputWrapper>
                      <FiSearch size={16} />
                      <S.ParentEventInput
                        type="text"
                        placeholder="상위 사건 검색..."
                        value={parentEventSearch}
                        onChange={(e) => {
                          setParentEventSearch(e.target.value)
                          setShowParentEventList(true)
                        }}
                        onFocus={() => setShowParentEventList(true)}
                      />
                      {parentEventId && (
                        <S.ClearButton
                          type="button"
                          onClick={() => {
                            playClickSound()
                            setParentEventId('')
                            setParentEventSearch('')
                          }}
                        >
                          <FiX size={14} />
                        </S.ClearButton>
                      )}
                      <S.ToggleButton
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setShowParentEventList(!showParentEventList)
                        }}
                      >
                        <FiChevronDown
                          size={16}
                          style={{
                            transform: showParentEventList
                              ? 'rotate(180deg)'
                              : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                          }}
                        />
                      </S.ToggleButton>
                    </S.ParentEventInputWrapper>
                    {showParentEventList && (
                      <S.ParentEventList>
                        {filteredParentEvents.length > 0 ? (
                          filteredParentEvents.map((event) => (
                            <S.ParentEventItem
                              key={event.id}
                              $selected={parentEventId === event.id}
                              onClick={() => {
                                playClickSound()
                                setParentEventId(event.id)
                                setParentEventSearch(event.title)
                                setShowParentEventList(false)
                              }}
                            >
                              <S.ParentEventIcon
                                $category={event.category?.name || 'other'}
                              >
                                {React.createElement(
                                  event.category?.name
                                    ? CATEGORY_ICON_MAP[event.category.name] ||
                                        FiFileText
                                    : FiFileText,
                                  {
                                    size: 16,
                                  },
                                )}
                              </S.ParentEventIcon>
                              <S.ParentEventInfo>
                                <S.ParentEventTitle>
                                  {event.title}
                                </S.ParentEventTitle>
                                <S.ParentEventMeta>
                                  {event.category?.name || '카테고리 없음'} ·{' '}
                                  {event.startDate
                                    ? formatDateRange(
                                        event.startDate,
                                        event.endDate || undefined,
                                      )
                                    : '날짜 없음'}
                                </S.ParentEventMeta>
                              </S.ParentEventInfo>
                              {parentEventId === event.id && (
                                <FiCheck size={16} color="#22c55e" />
                              )}
                            </S.ParentEventItem>
                          ))
                        ) : (
                          <S.EmptyState>
                            <FiSearch size={24} />
                            <p>검색 결과가 없습니다</p>
                          </S.EmptyState>
                        )}
                      </S.ParentEventList>
                    )}
                  </S.ParentEventSelector>
                  {parentEventId && (
                    <S.SelectedEventInfo>
                      <FiCheck size={14} />
                      <span>
                        ?�택??{' '}
                        {
                          availableEvents.find((e) => e.id === parentEventId)
                            ?.title
                        }
                      </span>
                    </S.SelectedEventInfo>
                  )}
                  <S.Hint>
                    이 사건이 다른 사건의 하위 사건인 경우 상위 사건을
                    선택하세요 (예: 노르망디 상륙작전 → 제2차 세계 대전)
                  </S.Hint>
                </S.FormField>
              </S.FormRow>

              <S.FormRow>
                <S.FormLabel>관련 인물</S.FormLabel>
                <S.FormField>
                  <S.PersonSelector ref={personSelectorRef}>
                    <S.ParentEventInputWrapper>
                      <FiSearch size={16} />
                      <S.ParentEventInput
                        type="text"
                        placeholder="인물 검색..."
                        value={personSearch}
                        onChange={(e) => {
                          setPersonSearch(e.target.value)
                          setShowPersonList(true)
                        }}
                        onFocus={() => setShowPersonList(true)}
                      />
                      <S.ToggleButton
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setShowPersonList(!showPersonList)
                        }}
                      >
                        <FiChevronDown
                          size={16}
                          style={{
                            transform: showPersonList
                              ? 'rotate(180deg)'
                              : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                          }}
                        />
                      </S.ToggleButton>
                    </S.ParentEventInputWrapper>
                    {showPersonList && (
                      <S.ParentEventList>
                        {filteredPersons.length > 0 ? (
                          filteredPersons.map((person) => {
                            const isSelected = relatedPersons.some(
                              (p) => p.personId === person.id,
                            )
                            return (
                              <S.ParentEventItem
                                key={person.id}
                                $selected={isSelected}
                                onClick={() => {
                                  playClickSound()
                                  if (isSelected) {
                                    setRelatedPersons((prev) =>
                                      prev.filter(
                                        (p) => p.personId !== person.id,
                                      ),
                                    )
                                  } else {
                                    setRelatedPersons((prev) => [
                                      ...prev,
                                      {
                                        personId: person.id,
                                        role: '',
                                        note: '',
                                      },
                                    ])
                                  }
                                  setShowPersonList(false)
                                  setPersonSearch('')
                                }}
                              >
                                <S.ParentEventIcon $category="political">
                                  <FiUsers size={16} />
                                </S.ParentEventIcon>
                                <S.ParentEventInfo>
                                  <S.ParentEventTitle>
                                    {person.name || '이름 없음'}
                                  </S.ParentEventTitle>
                                  <S.ParentEventMeta>
                                    {person.birthYear
                                      ? `${person.birthYear}년`
                                      : '정보 없음'}
                                  </S.ParentEventMeta>
                                </S.ParentEventInfo>
                                {isSelected && (
                                  <FiCheck size={16} color="#22c55e" />
                                )}
                              </S.ParentEventItem>
                            )
                          })
                        ) : (
                          <S.EmptyState>
                            <FiSearch size={24} />
                            <p>검색 결과가 없습니다</p>
                          </S.EmptyState>
                        )}
                      </S.ParentEventList>
                    )}
                  </S.PersonSelector>
                  {relatedPersons.length > 0 && (
                    <S.SelectedPersonsList>
                      {relatedPersons.map((person) => {
                        const personData = availablePersons.find(
                          (p) => p.id === person.personId,
                        )
                        return (
                          <S.SelectedPersonItem key={person.personId}>
                            <div>
                              <strong>{personData?.name || '이름 없음'}</strong>
                              <S.Input
                                type="text"
                                placeholder="역할 (예: 총사령관, 외교관)"
                                value={person.role}
                                onChange={(e) => {
                                  setRelatedPersons((prev) =>
                                    prev.map((p) =>
                                      p.personId === person.personId
                                        ? { ...p, role: e.target.value }
                                        : p,
                                    ),
                                  )
                                }}
                                style={{ marginTop: '8px', fontSize: '12px' }}
                              />
                            </div>
                            <S.ClearButton
                              type="button"
                              onClick={() => {
                                playClickSound()
                                setRelatedPersons((prev) =>
                                  prev.filter(
                                    (p) => p.personId !== person.personId,
                                  ),
                                )
                              }}
                            >
                              <FiX size={14} />
                            </S.ClearButton>
                          </S.SelectedPersonItem>
                        )
                      })}
                    </S.SelectedPersonsList>
                  )}
                  <S.Hint>이 사건과 관련된 주요 인물을 추가하세요</S.Hint>
                </S.FormField>
              </S.FormRow>

              <S.FormRow>
                <S.FormLabel>관련 사건</S.FormLabel>
                <S.FormField>
                  <S.ParentEventSelector ref={relatedEventSelectorRef}>
                    <S.ParentEventInputWrapper>
                      <FiSearch size={16} />
                      <S.ParentEventInput
                        type="text"
                        placeholder="관련 사건 검색..."
                        value={relatedEventSearch}
                        onChange={(e) => {
                          setRelatedEventSearch(e.target.value)
                          setShowRelatedEventList(true)
                        }}
                        onFocus={() => setShowRelatedEventList(true)}
                      />
                      <S.ToggleButton
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setShowRelatedEventList(!showRelatedEventList)
                        }}
                      >
                        <FiChevronDown
                          size={16}
                          style={{
                            transform: showRelatedEventList
                              ? 'rotate(180deg)'
                              : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                          }}
                        />
                      </S.ToggleButton>
                    </S.ParentEventInputWrapper>
                    {showRelatedEventList && (
                      <S.ParentEventList>
                        {filteredRelatedEvents.length > 0 ? (
                          filteredRelatedEvents.map((event) => {
                            const isSelected = relatedEventIds.includes(
                              event.id,
                            )
                            return (
                              <S.ParentEventItem
                                key={event.id}
                                $selected={isSelected}
                                onClick={() => {
                                  playClickSound()
                                  if (isSelected) {
                                    setRelatedEventIds((prev) =>
                                      prev.filter((id) => id !== event.id),
                                    )
                                  } else {
                                    setRelatedEventIds((prev) => [
                                      ...prev,
                                      event.id,
                                    ])
                                  }
                                  setShowRelatedEventList(false)
                                  setRelatedEventSearch('')
                                }}
                              >
                                <S.ParentEventIcon
                                  $category={event.category?.name || 'other'}
                                >
                                  {React.createElement(
                                    event.category?.name
                                      ? CATEGORY_ICON_MAP[
                                          event.category.name
                                        ] || FiFileText
                                      : FiFileText,
                                    {
                                      size: 16,
                                    },
                                  )}
                                </S.ParentEventIcon>
                                <S.ParentEventInfo>
                                  <S.ParentEventTitle>
                                    {event.title}
                                  </S.ParentEventTitle>
                                  <S.ParentEventMeta>
                                    {event.category?.name || '카테고리 없음'} ·{' '}
                                    {event.startDate
                                      ? formatDateRange(
                                          event.startDate,
                                          event.endDate || undefined,
                                        )
                                      : '날짜 없음'}
                                  </S.ParentEventMeta>
                                </S.ParentEventInfo>
                                {isSelected && (
                                  <FiCheck size={16} color="#22c55e" />
                                )}
                              </S.ParentEventItem>
                            )
                          })
                        ) : (
                          <S.EmptyState>
                            <FiSearch size={24} />
                            <p>검색 결과가 없습니다</p>
                          </S.EmptyState>
                        )}
                      </S.ParentEventList>
                    )}
                  </S.ParentEventSelector>
                  {relatedEventIds.length > 0 && (
                    <S.SelectedEventsList>
                      {relatedEventIds.map((eventId) => {
                        const event = availableEvents.find(
                          (e) => e.id === eventId,
                        )
                        return (
                          <S.SelectedEventInfo key={eventId}>
                            <FiCheck size={14} />
                            <span>{event?.title || '알 수 없음'}</span>
                            <S.ClearButton
                              type="button"
                              onClick={() => {
                                playClickSound()
                                setRelatedEventIds((prev) =>
                                  prev.filter((id) => id !== eventId),
                                )
                              }}
                              style={{ marginLeft: '8px' }}
                            >
                              <FiX size={12} />
                            </S.ClearButton>
                          </S.SelectedEventInfo>
                        )
                      })}
                    </S.SelectedEventsList>
                  )}
                  <S.Hint>
                    상위 사건 외에 연관된 다른 사건들을 추가하세요
                  </S.Hint>
                </S.FormField>
              </S.FormRow>
            </S.FormSection>
          )}
        </S.FormArea>
      </S.ContentWrapper>

      {/* 국가 선택 모달 */}
      {showCountryModal &&
        createPortal(
          <>
            <S.ModalOverlay
              onClick={() => setShowCountryModal(false)}
              as={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
            <S.Modal
              as={motion.div}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <S.ModalHeader>
                <h3>국가 선택</h3>
                <button
                  type="button"
                  onClick={() => setShowCountryModal(false)}
                >
                  <FiX size={20} />
                </button>
              </S.ModalHeader>
              <S.ModalContent>
                <S.Input
                  type="text"
                  placeholder="국가명 검색..."
                  value={countrySearchTerm}
                  onChange={(e) => setCountrySearchTerm(e.target.value)}
                  autoFocus
                />
                <S.CountryModalSection>
                  <S.CountryModalTitle>현대 국가</S.CountryModalTitle>
                  <S.CountryModalList>
                    {availableCountries
                      .filter((country) =>
                        country.name
                          .toLowerCase()
                          .includes(countrySearchTerm.toLowerCase()),
                      )
                      .map((country) => {
                        const isSelected = relatedCountryIds.includes(
                          country.id,
                        )
                        return (
                          <S.CountryModalItem
                            key={country.id}
                            $selected={isSelected}
                            onClick={() => {
                              playClickSound()
                              if (isSelected) {
                                setRelatedCountryIds((prev) =>
                                  prev.filter((id) => id !== country.id),
                                )
                              } else {
                                setRelatedCountryIds([
                                  ...relatedCountryIds,
                                  country.id,
                                ])
                              }
                            }}
                          >
                            <FiGlobe size={16} />
                            <span>{country.name}</span>
                            {isSelected && (
                              <FiCheck size={16} color="#22c55e" />
                            )}
                          </S.CountryModalItem>
                        )
                      })}
                  </S.CountryModalList>
                </S.CountryModalSection>
                <S.CountryModalSection>
                  <S.CountryModalTitle>역사적 국가</S.CountryModalTitle>
                  <S.CountryModalList>
                    {availableHistoricalCountries
                      .filter((country) =>
                        country.name
                          .toLowerCase()
                          .includes(countrySearchTerm.toLowerCase()),
                      )
                      .map((country) => {
                        const isSelected = relatedHistoricalCountryIds.includes(
                          country.id,
                        )
                        return (
                          <S.CountryModalItem
                            key={country.id}
                            $selected={isSelected}
                            onClick={() => {
                              playClickSound()
                              if (isSelected) {
                                setRelatedHistoricalCountryIds((prev) =>
                                  prev.filter((id) => id !== country.id),
                                )
                              } else {
                                setRelatedHistoricalCountryIds([
                                  ...relatedHistoricalCountryIds,
                                  country.id,
                                ])
                              }
                            }}
                          >
                            <FiGlobe size={16} />
                            <span>{country.name}</span>
                            {isSelected && (
                              <FiCheck size={16} color="#22c55e" />
                            )}
                          </S.CountryModalItem>
                        )
                      })}
                  </S.CountryModalList>
                </S.CountryModalSection>
              </S.ModalContent>
            </S.Modal>
          </>,
          document.body,
        )}
    </S.PageWrapper>
  )
}

export default EventCreatePage
