/**
 * 군부대 생성/수정 — 공용 SidePanel + `@/shared/ui/register-form-layout`
 * (FieldRow / FormRows / SelectBtn / DateFieldBtn — 조약·인물 등록과 동일 패턴)
 */
import React, { useEffect, useState } from 'react'

import {
  FiAward,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiFileText,
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
  MilitaryUnitType,
} from '@/shared/api/military-unit'
import { militaryUnitApi } from '@/shared/api/military-unit'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { CountrySelectModal } from '@/shared/ui/country-select-modal/country-select-modal'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import {
  DateFieldBtn,
  DateFieldsRow,
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

const CommanderFormLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 4px;
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
  { value: 'SQUADRON', label: '전대' },
  { value: 'WING', label: '비행단' },
  { value: 'SPECIAL_FORCES', label: '특수부대' },
  { value: 'DETACHMENT', label: '파견대' },
  { value: 'OTHER', label: '기타' },
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

type TabType = 'basic' | 'military' | 'description'

export type MilitaryUnitFormModalProps = {
  isOpen: boolean
  onClose: () => void
  /** 저장 성공 시 (목록 갱신 등) */
  onSaved?: () => void
  /** 신규 등록 시 기본 소속 국가 */
  defaultCountryId?: string | null
  /** 신규 시 연결할 중앙부처 ID (행정조직에서 열 때) */
  defaultAdministrationDepartmentId?: string | null
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
  defaultAdministrationDepartmentId = null,
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

  // Modals
  const [countryModalOpen, setCountryModalOpen] = useState(false)
  const [unitTypeModalOpen, setUnitTypeModalOpen] = useState(false)
  const [branchModalOpen, setBranchModalOpen] = useState(false)
  const [parentUnitModalOpen, setParentUnitModalOpen] = useState(false)
  const [establishedDateModalOpen, setEstablishedDateModalOpen] =
    useState(false)
  const [disbandedDateModalOpen, setDisbandedDateModalOpen] = useState(false)

  // Form fields - 기본 정보
  const [name, setName] = useState('')
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
  const [establishedDate, setEstablishedDate] = useState('')
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

  useEffect(() => {
    loadCountries()
    loadAllUnits()
  }, [])

  useEffect(() => {
    if (!isOpen || !editingUnitId) return
    void loadMilitaryUnit(editingUnitId)
  }, [isOpen, editingUnitId])

  /** 신규: 모달을 열 때 폼·기본 국가·중앙부처 연결 */
  useEffect(() => {
    if (!isOpen || editingUnitId) return
    setName('')
    setUnitType('')
    setUnitTypeName('')
    setBranch('')
    setBranchName('')
    setParentUnitId('')
    setParentUnitName('')
    setIsActive(true)
    setEstablishedDate('')
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
    setActiveTab('basic')
    setAdministrationDepartmentId(defaultAdministrationDepartmentId ?? '')
    // 신규 등록의 기본 국가는 현대 축뿐 — 역사 축은 항상 비운 채 시작한다
    setHistoricalCountryId('')
    if (defaultCountryId) {
      setCountryId(defaultCountryId)
    } else {
      setCountryId('')
      setCountryName('')
      setCountryFlagEmoji('')
      setCountryEnglishName('')
    }
  }, [isOpen, editingUnitId, defaultCountryId, defaultAdministrationDepartmentId])

  useEffect(() => {
    if (!isOpen || editingUnitId || !countryId || modernCountries.length === 0)
      return
    const c = modernCountries.find((x) => x.id === countryId)
    if (c) {
      setCountryName(c.name)
      setCountryFlagEmoji(c.flagEmoji || '🏳️')
    }
  }, [isOpen, editingUnitId, countryId, modernCountries])

  useEffect(() => {
    // 부처 목록도 선택된 축을 따라간다 — 역사 국가 소속 부대는 그 역사 국가의 부처만 후보
    if (!countryId && !historicalCountryId) {
      setAdminDepartments([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const list = countryId
          ? await administrationDepartmentApi.getByCountryId(countryId)
          : await administrationDepartmentApi.getByHistoricalCountryId(
              historicalCountryId,
            )
        if (!cancelled) setAdminDepartments(Array.isArray(list) ? list : [])
      } catch {
        if (!cancelled) setAdminDepartments([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [countryId, historicalCountryId])

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
      setUnitType(unit.unitType || '')
      setUnitTypeName(
        unit.unitType
          ? UNIT_TYPES.find((t) => t.value === unit.unitType)?.label || ''
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
      }
      const admId = (unit as { administrationDepartmentId?: string | null })
        .administrationDepartmentId
      setAdministrationDepartmentId(admId ?? '')
      setIsActive(unit.isActive ?? true)
      setEstablishedDate(unit.establishedDate || '')
      setDisbandedDate(unit.disbandedDate || '')
      setDescription(unit.description || '')

      const u = unit as typeof unit & {
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
      if (u.branch) {
        setBranch(u.branch)
        setBranchName(
          MILITARY_BRANCHES.find((b) => b.value === u.branch)?.label || '',
        )
      } else {
        setBranch('')
        setBranchName('')
      }
      setNickname(u.nickname || '')
      setMotto(u.motto || '')
      setGarrisonPlace(
        u.garrison
          ? {
              displayName: u.garrison,
              shortName: u.garrison,
              isManual: true,
            }
          : null,
      )
      setStrength(u.strength || '')
      setInsigniaUrl(u.insigniaUrl || '')
      setPrimaryMission(u.primaryMission || '')
      setJurisdiction(u.jurisdiction || '')
      setNotableBattles(u.notableBattles || '')
      setHonors(u.honors || '')
    } catch {
      notify.error('군부대 정보를 불러오는데 실패했습니다.')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      notify.error('군부대명을 입력해주세요.')
      setActiveTab('basic')
      return
    }

    const data = {
      name: name.trim(),
      unitType: unitType || null,
      branch: branch
        ? (branch as NonNullable<CreateMilitaryUnitInput['branch']>)
        : null,
      countryId: countryId || null,
      historicalCountryId: historicalCountryId || null,
      parentUnitId: parentUnitId || null,
      administrationDepartmentId: administrationDepartmentId || null,
      isActive,
      establishedDate: establishedDate || null,
      disbandedDate: disbandedDate || null,
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
    } as CreateMilitaryUnitInput

    try {
      setLoading(true)
      if (isEdit && editingUnitId) {
        await militaryUnitApi.update(editingUnitId, data)
        notify.success('군부대가 수정되었습니다.')
      } else {
        await militaryUnitApi.create(data)
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

  const availableParentUnits = allUnits.filter(
    (unit) => unit.id !== editingUnitId,
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return (
          <FormSectionInner>
            <FormRows>
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
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
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
                  <InsigniaThumbnailHint style={{ marginTop: 8, display: 'block' }}>
                    {insigniaUrl
                      ? '클릭하면 이미지를 변경할 수 있습니다'
                      : '클릭하여 부대 마크·휘장 이미지를 넣어주세요 (선택)'}
                  </InsigniaThumbnailHint>
                  <input
                    id="insignia-upload-basic"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const url = URL.createObjectURL(file)
                        setInsigniaUrl(url)
                      }
                      e.target.value = ''
                    }}
                  />
                  <FieldHint>부대의 공식 마크나 휘장 (선택)</FieldHint>
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel htmlFor="military-unit-name">
                  군부대명 <Required title="필수" />
                </FieldLabel>
                <FieldControl>
                  <Input
                    id="military-unit-name"
                    type="text"
                    placeholder="예: 제1보병사단"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </FieldControl>
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
                <FieldLabel>부대 유형</FieldLabel>
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
                  <FieldHint>육군, 해군, 공군, 해병대 등</FieldHint>
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>상위 부대</FieldLabel>
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
                    예: 제1군단 소속 제1사단의 경우, 제1군단을 선택
                  </FieldHint>
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>연결 행정 부처 (선택)</FieldLabel>
                <FieldControl>
                  <AdminDeptSelect
                    value={administrationDepartmentId}
                    onChange={(e) => {
                      playClickSound()
                      setAdministrationDepartmentId(e.target.value)
                    }}
                    disabled={
                      (!countryId && !historicalCountryId) ||
                      lockCountryAndDepartment
                    }
                  >
                    <option value="">— 없음 —</option>
                    {adminDepartments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </AdminDeptSelect>
                  <FieldHint>
                    중앙부처(예: 국방부)와 동일 기관으로 묶을 때 선택합니다.
                    소속 국가를 먼저 지정하세요.
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
                      onChange={(e) => {
                        playClickSound()
                        setIsActive(e.target.checked)
                      }}
                      style={{
                        width: 18,
                        height: 18,
                        accentColor: '#6366f1',
                        cursor: 'pointer',
                      }}
                    />
                    현재 활동 중인 부대
                  </label>
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>창설·해산</FieldLabel>
                <FieldControl $variant="datePair">
                  <DateFieldsRow style={{ maxWidth: '100%' }}>
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
                          {establishedDate || '창설일 (달력)'}
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
                          {disbandedDate || '해산일 (달력)'}
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
                  </DateFieldsRow>
                  {isActive ? (
                    <FieldHint>
                      활동 중인 부대는 해산일을 입력할 수 없습니다
                    </FieldHint>
                  ) : null}
                </FieldControl>
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
                    onChange={(e) => setNickname(e.target.value)}
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
                    onChange={(e) => setMotto(e.target.value)}
                  />
                  <FieldHint>부대의 모토나 슬로건</FieldHint>
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>주둔지</FieldLabel>
                <FullWidthFieldControl>
                  <PlaceSelect
                    countryId={countryId || undefined}
                    disabled={!countryId}
                    value={garrisonPlace}
                    onChange={(p) => setGarrisonPlace(p)}
                  />
                  <FieldHint>
                    소속 국가를 먼저 선택한 뒤, 등록된 행정구역·도시에서 고르거나
                    「직접 입력」으로 적을 수 있습니다.
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
                    onChange={(e) => setStrength(e.target.value)}
                  />
                  <FieldHint>부대의 총 병력 수</FieldHint>
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>주요 임무</FieldLabel>
                <FieldControl>
                  <Textarea
                    rows={3}
                    placeholder="예: 기동 타격, 국경 경계, 해상 호위 등"
                    value={primaryMission}
                    onChange={(e) => setPrimaryMission(e.target.value)}
                  />
                  <FieldHint>부대의 핵심 임무·역할</FieldHint>
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>관할</FieldLabel>
                <FieldControl>
                  <Textarea
                    rows={3}
                    placeholder="예: 제3함대 작전구역, OO지역 방어 등"
                    value={jurisdiction}
                    onChange={(e) => setJurisdiction(e.target.value)}
                  />
                  <FieldHint>작전·행정 관할 구역 또는 책임 범위</FieldHint>
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>주요 전투 참여</FieldLabel>
                <FieldControl>
                  <Textarea
                    rows={4}
                    placeholder="예: 6.25전쟁 인천상륙작전, 베트남전 등"
                    value={notableBattles}
                    onChange={(e) => setNotableBattles(e.target.value)}
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
                    onChange={(e) => setHonors(e.target.value)}
                  />
                  <FieldHint>
                    부대가 받은 훈장이나 표창 (각 줄마다 하나씩)
                  </FieldHint>
                </FieldControl>
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
                    onChange={(e) => setDescription(e.target.value)}
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
            {isEdit ? '군부대 수정' : '군부대 등록'}
          </span>
        }
        subtitle="부대명·소속·군정보·설명을 입력합니다. 보조 선택·날짜 모달은 패널 위 레이어에 표시됩니다."
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
              군정보
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
      <CountrySelectModal
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
        selectedCountryId={historicalCountryId || countryId || undefined}
      />

      {/* 부대 유형 선택 모달 */}
      {unitTypeModalOpen && (
        <SimpleSelectModal
          title="부대 유형 선택"
          options={UNIT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
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
          setDisbandedDateModalOpen(false)
        }}
        initialDate={disbandedDate}
        title="해산일 선택"
      />
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
      <InnerModalBox onClick={(e) => e.stopPropagation()}>
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
      <InnerModalBox onClick={(e) => e.stopPropagation()}>
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
            onChange={(e) => setSearchQuery(e.target.value)}
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
                  <div style={{ fontWeight: 600 }}>{unit.name}</div>
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

const LargeModalBox = styled(InnerModalBox)`
  max-width: 700px;
  max-height: 80vh;
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
