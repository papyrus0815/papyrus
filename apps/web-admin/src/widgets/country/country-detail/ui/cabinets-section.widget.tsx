/**
 * 행정부(역대 내각) — 행정조직 탭 내 "행정부" 서브탭에서 표시.
 * 수반 재임별 행정부 등록·조회, 각료 추가.
 * 정권 선택 시 아래에 중앙부처 스타일 그리드로 해당 정권의 부처별 각료 표시(전자: 카테고리만, 사용자 등록 부처).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { createPortal } from 'react-dom'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { toast } from 'react-hot-toast'
import { FiChevronLeft, FiEdit2, FiChevronDown, FiChevronRight, FiInfo, FiPlus, FiSearch, FiTrash2, FiUser, FiUsers, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { administrationDepartmentApi } from '@/shared/api/administration-department'
import { personCareerApi } from '@/shared/api/person-career'
import { getAllPersons } from '@/shared/api/persons'
import { getUploadImageUrl } from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { Z_INDEX } from '@/shared/styles/z-index'
import { DatePickerModal } from '@/shared/ui/date-picker'
import { PersonSelectModal } from '@/shared/ui/person-select-modal'
import { DateRangeField } from '@/shared/ui/form-fields'
import {
  DateFieldsRow,
  FieldControl,
  FieldLabel,
  FieldRow,
  FormRows,
  Input as RegisterInput,
  Required,
  SubmitButton,
  TabButton,
  TabNavigation,
} from '@/shared/ui/register-form-layout'
import { TenureRegisterPanel } from '@/shared/ui/tenure-register-panel'

const MAIN = '#6366f1'
const MAIN_HOVER = '#4f46e5'
const BORDER = '#e5e7eb'
const BORDER_LIGHT = '#f3f4f6'
const BG_MUTED = '#f8fafc'
const TEXT = '#0f172a'
const TEXT_MUTED = '#64748b'
const HEAD_POSITION_TYPES = new Set(['HEAD_OF_STATE', 'HEAD_OF_GOVERNMENT'])
/** 각료 등록 시 선택 가능한 직위 타입 (수반·의원 등 제외) */
const MINISTER_POSITION_TYPES = new Set([
  'CABINET_MINISTER',
  'VICE_MINISTER',
  'OTHER',
])

/* 행정부 등록 모달 — 인물 등록 모달(PersonRegisterModal) 폼과 동일 스타일 */
const CabinetModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: cabinetOverlayIn 0.2s ease;
  @keyframes cabinetOverlayIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`
const CabinetModalBox = styled.div`
  width: 100%;
  max-width: 920px;
  min-height: 520px;
  max-height: 90vh;
  background: #fff;
  border-radius: 20px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.04);
  z-index: ${Z_INDEX.MODAL_CONTENT};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: cabinetModalUp 0.2s ease;
  @keyframes cabinetModalUp {
    from { transform: translateY(12px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`
const CabinetModalHeader = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f3f4f6;
`
const CabinetModalTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111;
`
const CabinetCloseBtn = styled.button`
  padding: 8px;
  background: none;
  border: none;
  border-radius: 8px;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover {
    background: #f3f4f6;
    color: #111;
  }
`
const CabinetModalBody = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 24px 28px 28px;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: #f3f4f6; border-radius: 3px; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
  &::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
`
const CabinetFormDesc = styled.div`
  margin: 0 0 20px;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  svg { flex-shrink: 0; color: #888; margin-top: 2px; }
  strong { font-weight: 600; color: #374151; }
`
/** 탭: register-form-layout과 동일 (pill 20px, 배경 #f1f5f9, 활성 흰색+인디고) */
const CabinetTabWrap = styled.div`
  margin-bottom: 24px;
  /* 탭이 전체 너비로 늘어나지 않도록 fit-content 유지 */
  & > div {
    width: fit-content;
  }
`
/** 기존 수반 선택: 카드형 섹션 */
const CabinetSelectSection = styled.div`
  flex: 1;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 16px;
  padding: 20px 24px 0;
  margin-bottom: 4px;
`
const CabinetSelectSectionTitle = styled.h3`
  margin: 0 0 14px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  letter-spacing: -0.01em;
`
const CabinetSearchWrap = styled.div`
  position: relative;
  margin-bottom: 16px;
  flex-shrink: 0;
`
const CabinetSearchIcon = styled.span`
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  display: flex;
  pointer-events: none;
`
const CabinetList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0 10px 0 0;
  flex: 1;
  min-height: 200px;
  max-height: 480px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 3px; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
`
const CabinetHeadTenureCard = styled.button`
  width: 100%;
  text-align: left;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  gap: 0;
  align-items: center;
  min-height: 76px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  &:hover:not(:disabled) {
    border-color: #a5b4fc;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
    background: #fafbff;
  }
  &:focus-visible {
    outline: none;
    border-color: ${MAIN};
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`
const CabinetHeadTenureCardMain = styled.div`
  grid-column: 1;
  grid-row: 1 / -1;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
  min-width: 0;
`
const CabinetHeadTenureCardBadge = styled.span`
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  color: #4f46e5;
  background: #eef2ff;
  padding: 4px 10px;
  border-radius: 8px;
  letter-spacing: 0.02em;
`
const CabinetHeadTenureCardName = styled.span`
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  line-height: 1.35;
`
const CabinetHeadTenureCardMeta = styled.span`
  font-size: 13px;
  color: #64748b;
  line-height: 1.4;
`
const CabinetHeadTenureCardAction = styled.span`
  grid-column: 2;
  grid-row: 1 / -1;
  padding: 18px 20px 18px 16px;
  display: flex;
  align-items: center;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  flex-shrink: 0;
  svg {
    margin-left: 4px;
    flex-shrink: 0;
  }
`
const CabinetActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #f3f4f6;
  flex-wrap: wrap;
`
const CabinetEmptyHint = styled.div`
  margin: 0;
  padding: 40px 28px;
  font-size: 14px;
  color: ${TEXT_MUTED};
  text-align: center;
  background: #fff;
  border-radius: 16px;
  border: 1px dashed #cbd5e1;
  line-height: 1.6;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  strong { font-weight: 600; color: ${TEXT}; }
  svg {
    color: #94a3b8;
    flex-shrink: 0;
    opacity: 0.9;
  }
`
/** 인물 등록 폼과 동일: 선택 트리거 버튼 (DateFieldBtn 스타일) */
const CabinetSelectTrigger = styled.button<{ $hasValue?: boolean }>`
  width: 100%;
  max-width: 360px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 16px;
  font-size: 14px;
  color: ${(p) => (p.$hasValue ? '#111827' : '#9ca3af')};
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  outline: none;
  &:hover {
    border-color: #4f46e5;
    background: #faf5ff;
    color: #111827;
  }
  &:focus-visible {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
  span { flex: 1; }
  svg { flex-shrink: 0; color: #64748b; }
`

/** register-form-layout Input과 동일 스타일의 select */
const CabinetSelectNative = styled.select`
  width: 100%;
  max-width: 360px;
  padding: 12px 16px;
  font-size: 14px;
  color: #111827;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  outline: none;
  box-sizing: border-box;
  &:focus {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
`

/** 인물 등록 모달과 동일: 날짜 선택 버튼 (SelectBtn 스타일 — 8px radius, 12px 14px, 15px) */
const CabinetDateTrigger = styled.button<{ $hasValue?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  font-size: 15px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: ${(p) => (p.$hasValue ? '#111' : '#888')};
  cursor: pointer;
  text-align: left;
  outline: none;
  &:focus {
    outline: none;
    border-color: #6366f1;
  }
  span { flex: 1; }
  svg { flex-shrink: 0; color: #64748b; }
`

/** 대수 입력용 작은 너비 */
const CabinetTermNumberWrap = styled.div`
  max-width: 120px;
  width: 100%;
`

/** 인물 선택·날짜 선택 모달이 행정부 모달 앞에 뜨도록 */
const CabinetSubModalLayer = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${Z_INDEX.MODAL_CONTENT + 2};
  pointer-events: none;
  & > * {
    pointer-events: auto;
  }
`

const CabinetCancelBtn = styled.button`
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  &:hover {
    background: #f9fafb;
  }
`

function getPersonName(p: any): string {
  if (!p) return '—'
  return getPersonDisplayName(
    {
      name: p.name ?? '',
      surname: p.surname ?? null,
      middleName: p.middleName ?? null,
      nameDisplayOrder:
        (p.nameDisplayOrder as 'korean' | 'western') ?? 'korean',
    },
    true,
  )
}

/** 인물 카드용 생몰년 표시 (각료 선택 모달 등) */
function formatPersonLifespan(p: any): string {
  if (!p) return '생몰년 미상'
  const by = p.birthYear != null ? p.birthYear : null
  const dy = p.deathYear != null ? p.deathYear : null
  const be = p.birthEra === 'BC' ? 'BC ' : ''
  const de = p.deathEra === 'BC' ? 'BC ' : ''
  if (by != null && dy != null) return `${be}${by} ~ ${de}${dy}`
  if (by != null) return `${be}${by} ~`
  if (dy != null) return `~ ${de}${dy}`
  return '생몰년 미상'
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export interface CabinetsSectionProps {
  country: UnifiedCountry
  /** 부처 등록 시 중앙부처 탭으로 전환하고 해당 카테고리로 폼 열기 */
  onOpenMinistriesTab?: (categoryId?: string) => void
}

export function CabinetsSection({
  country,
  onOpenMinistriesTab,
}: CabinetsSectionProps) {
  const queryClient = useQueryClient()
  const isHistorical = country.type === 'historical'
  const countryId = !isHistorical ? country.id : undefined
  const historicalCountryId = isHistorical ? country.id : undefined

  /** 선택한 정권 — 위에 행정부처(중앙부처) 그리드로 해당 정권의 부처별 각료 표시 */
  const [selectedCabinetId, setSelectedCabinetId] = useState<string | null>(
    null,
  )
  const selectedCabinetSectionRef = useRef<HTMLElement | null>(null)
  const [addMinisterCabinet, setAddMinisterCabinet] = useState<any | null>(null)
  const [personSelectOpen, setPersonSelectOpen] = useState(false)
  const [ministerFormPositionDefId, setMinisterFormPositionDefId] = useState<
    string | null
  >(null)
  const [ministerFormTitle, setMinisterFormTitle] = useState('')
  const [ministerFormStartDate, setMinisterFormStartDate] = useState('')
  const [ministerFormEndDate, setMinisterFormEndDate] = useState('')
  const [ministerFormTermNumber, setMinisterFormTermNumber] = useState('')
  const [ministerFormSubmitting, setMinisterFormSubmitting] = useState(false)
  const [personPickerOpen, setPersonPickerOpen] = useState(false)
  const [selectedPersonIdForAdd, setSelectedPersonIdForAdd] = useState<
    string | null
  >(null)
  const [tenurePanelOpen, setTenurePanelOpen] = useState(false)
  const [registerCabinetModalOpen, setRegisterCabinetModalOpen] =
    useState(false)
  const [registerCabinetSubmitting, setRegisterCabinetSubmitting] =
    useState(false)
  /** 'select' = 기존 수반 재임 선택, 'new' = 새 수반 등록(재임+행정부 한 번에) */
  const [registerFlow, setRegisterFlow] = useState<'select' | 'new'>('select')
  const [newHeadPersonId, setNewHeadPersonId] = useState<string | null>(null)
  const [newHeadPositionDefId, setNewHeadPositionDefId] = useState<
    string | null
  >(null)
  const [newHeadStartDate, setNewHeadStartDate] = useState('')
  const [newHeadEndDate, setNewHeadEndDate] = useState('')
  /** 새 수반 등록 시 대수(제 N대). 빈 값이면 미전송, 숫자면 termNumber로 전송. 중간 등록 가능. */
  const [newHeadTermNumber, setNewHeadTermNumber] = useState('')
  const [deletingCabinetId, setDeletingCabinetId] = useState<string | null>(
    null,
  )
  /** 행정부 수정 모달 (이름 + 수반 재임 대수/직위/취임·퇴임) */
  const [editingCabinet, setEditingCabinet] = useState<any | null>(null)
  const [editingCabinetName, setEditingCabinetName] = useState('')
  const [editingTermNumber, setEditingTermNumber] = useState('')
  const [editingPositionDefId, setEditingPositionDefId] = useState<string | null>(null)
  const [editingStartDate, setEditingStartDate] = useState('')
  const [editingEndDate, setEditingEndDate] = useState('')
  const [editStartDatePickerOpen, setEditStartDatePickerOpen] = useState(false)
  const [editEndDatePickerOpen, setEditEndDatePickerOpen] = useState(false)
  const [updatingCabinetId, setUpdatingCabinetId] = useState<string | null>(null)
  /** 부처 카드 클릭 시 상세 패널 */
  const [selectedDeptDetail, setSelectedDeptDetail] = useState<
    | { type: 'dept'; category: any; dept: any }
    | { type: 'others' }
    | null
  >(null)

  const { data: cabinets = [], isLoading: loadingCabinets } = useQuery({
    queryKey: ['cabinets-by-country', countryId, historicalCountryId],
    queryFn: () =>
      personCareerApi.getCabinets({
        countryId: countryId || undefined,
        historicalCountryId: historicalCountryId || undefined,
      }),
    enabled: !!countryId || !!historicalCountryId,
  })

  /** 행정부 리스트: 수반 취임일 기준 시간순(과거→현재) 정렬 */
  const sortedCabinets = useMemo(() => {
    const list = [...(cabinets as any[])]
    return list.sort((a, b) => {
      const dateA = a.headTenure?.startDate
        ? new Date(a.headTenure.startDate).getTime()
        : 0
      const dateB = b.headTenure?.startDate
        ? new Date(b.headTenure.startDate).getTime()
        : 0
      return dateA - dateB
    })
  }, [cabinets])

  /** 각료 선택 모달: 인물 테이블 전체에서 선택 (재임 여부 무관) */
  const { data: personsForMinisterSelect = [] } = useQuery({
    queryKey: ['persons', 'all-for-minister'],
    queryFn: () => getAllPersons(),
    enabled: personSelectOpen,
  })

  /** 선택한 정권의 각료 — 부처 그리드에 채우기 위함 */
  const effectiveCountryIdForDept =
    country.type === 'historical' ? undefined : country.id
  const { data: selectedCabinetMinisters = [] } = useQuery({
    queryKey: ['cabinet-tenures', selectedCabinetId],
    queryFn: () =>
      selectedCabinetId
        ? personCareerApi.getTenuresByCabinetId(selectedCabinetId)
        : Promise.resolve([]),
    enabled: !!selectedCabinetId,
  })
  /** 카테고리·부처는 탭 진입 시 미리 로드 — 정권 클릭 시 곧바로 중앙부처 그리드 표시 */
  const { data: categoriesForCabinet = [], isLoading: loadingCategories } =
    useQuery({
      queryKey: ['administration-department-categories'],
      queryFn: () => administrationDepartmentApi.getCategories(),
      enabled: !!(countryId || historicalCountryId),
    })
  const {
    data: ministriesForCabinet = [],
    isLoading: loadingMinistriesForCabinet,
  } = useQuery({
    queryKey: [
      'administration-departments-by-country',
      effectiveCountryIdForDept,
    ],
    queryFn: () =>
      effectiveCountryIdForDept
        ? administrationDepartmentApi.getByCountryId(effectiveCountryIdForDept)
        : Promise.resolve([]),
    enabled: !!effectiveCountryIdForDept,
  })

  const selectedDeptId =
    selectedDeptDetail?.type === 'dept'
      ? selectedDeptDetail.dept?.id
      : null
  const { data: selectedDeptDetailData = null } = useQuery({
    queryKey: ['administration-department', selectedDeptId],
    queryFn: () =>
      selectedDeptId
        ? administrationDepartmentApi.getById(selectedDeptId)
        : Promise.resolve(null),
    enabled: !!selectedDeptId,
  })
  const { data: selectedDeptEvents = [] } = useQuery({
    queryKey: ['administration-department-events', selectedDeptId],
    queryFn: () =>
      selectedDeptId
        ? administrationDepartmentApi.getDepartmentEvents(selectedDeptId)
        : Promise.resolve([]),
    enabled: !!selectedDeptId,
  })

  const { data: countryTenures = [] } = useQuery({
    queryKey: [
      'tenures-by-country-for-cabinet',
      countryId,
      historicalCountryId,
    ],
    queryFn: () =>
      personCareerApi.getTenuresByCountry({
        countryId: countryId || undefined,
        historicalCountryId: historicalCountryId || undefined,
      }),
    enabled: (!!countryId || !!historicalCountryId) && registerCabinetModalOpen,
  })

  const { data: positionDefinitions = [] } = useQuery({
    queryKey: ['position-definitions-cabinet', countryId, historicalCountryId],
    queryFn: () =>
      personCareerApi.getPositionDefinitions({
        countryId: countryId || undefined,
        historicalCountryId: historicalCountryId || undefined,
      }),
    enabled:
      (!!countryId || !!historicalCountryId) &&
      (registerCabinetModalOpen || !!editingCabinet || personSelectOpen),
  })

  const { data: allPersons = [] } = useQuery({
    queryKey: ['persons', 'all'],
    queryFn: () => getAllPersons(),
    enabled: registerCabinetModalOpen && registerFlow === 'new',
  })

  const headPositionOptions = (positionDefinitions as any[]).filter((d: any) =>
    HEAD_POSITION_TYPES.has(d.positionType),
  )

  /** 각료 등록 모달용 직위 옵션 (각료/차관/기타만) */
  const ministerPositionOptions = useMemo(
    () =>
      (positionDefinitions as any[]).filter(
        (d: any) => d.positionType && MINISTER_POSITION_TYPES.has(d.positionType),
      ),
    [positionDefinitions],
  )

  /** 각료 등록 모달에서 선택한 인물 (썸네일·이름 표시용) */
  const selectedMinisterPerson = useMemo(
    () =>
      (personsForMinisterSelect as any[]).find(
        (p: any) => p.id === selectedPersonIdForAdd,
      ),
    [personsForMinisterSelect, selectedPersonIdForAdd],
  )

  const handleAddMinister = (cabinet: any) => {
    setAddMinisterCabinet(cabinet)
    setPersonSelectOpen(true)
  }

  /** 인물 선택 시 같은 모달 안에서 직위·날짜 입력 단계로 (사이드바 없음) */
  const handleSelectPersonForMinister = (personId: string) => {
    setSelectedPersonIdForAdd(personId)
  }

  const handleChangePersonForMinister = () => {
    setSelectedPersonIdForAdd(null)
    setMinisterFormPositionDefId(null)
    setMinisterFormTitle('')
    setMinisterFormStartDate('')
    setMinisterFormEndDate('')
    setMinisterFormTermNumber('')
  }

  const handleSubmitMinister = async () => {
    if (!addMinisterCabinet || !selectedPersonIdForAdd) return
    const isOther =
      ministerFormPositionDefId === '__OTHER__' || !ministerFormPositionDefId
    const def = !isOther
      ? (positionDefinitions as any[]).find(
          (d: any) => d.id === ministerFormPositionDefId,
        )
      : null
    const titleValue = def?.title ?? ministerFormTitle.trim()
    if (!titleValue) {
      toast.error('직위를 선택하거나 직접 입력해 주세요.')
      return
    }
    if (!ministerFormStartDate.trim()) {
      toast.error('취임일을 입력해 주세요.')
      return
    }
    setMinisterFormSubmitting(true)
    try {
      const termNumParsed = ministerFormTermNumber.trim()
        ? parseInt(ministerFormTermNumber.trim(), 10)
        : undefined
      const termNumber =
        termNumParsed != null &&
        !Number.isNaN(termNumParsed) &&
        termNumParsed >= 1
          ? termNumParsed
          : undefined

      await personCareerApi.addGovernmentPositionTenure({
        personId: selectedPersonIdForAdd,
        positionType: (def as any)?.positionType ?? 'OTHER',
        positionDefinitionId:
          def?.id && ministerFormPositionDefId !== '__OTHER__'
            ? ministerFormPositionDefId ?? undefined
            : undefined,
        title: titleValue,
        countryId: addMinisterCabinet.countryId ?? undefined,
        historicalCountryId: addMinisterCabinet.historicalCountryId ?? undefined,
        cabinetId: addMinisterCabinet.id,
        startDate: ministerFormStartDate,
        endDate: ministerFormEndDate || undefined,
        termNumber,
      })
      toast.success('각료가 등록되었습니다.')
      setPersonSelectOpen(false)
      setAddMinisterCabinet(null)
      queryClient.invalidateQueries({
        queryKey: ['cabinets-by-country', countryId, historicalCountryId],
      })
      queryClient.invalidateQueries({ queryKey: ['cabinet-tenures'] })
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message ?? '등록에 실패했습니다.')
    } finally {
      setMinisterFormSubmitting(false)
    }
  }

  const handleCloseMinisterModal = () => {
    setPersonSelectOpen(false)
    setAddMinisterCabinet(null)
  }

  const headTenureIdsWithCabinet = new Set(
    (cabinets as any[]).map((c: any) => c.headTenureId),
  )
  const headTenuresForRegister = (countryTenures as any[]).filter(
    (t: any) =>
      (t.positionType === 'HEAD_OF_STATE' ||
        t.positionType === 'HEAD_OF_GOVERNMENT') &&
      !headTenureIdsWithCabinet.has(t.id),
  )

  const handleRegisterCabinet = async (tenure: any) => {
    setRegisterCabinetSubmitting(true)
    try {
      await personCareerApi.createCabinet({ headTenureId: tenure.id })
      toast.success('행정부가 등록되었습니다.')
      setRegisterCabinetModalOpen(false)
      setRegisterFlow('select')
      queryClient.invalidateQueries({
        queryKey: ['cabinets-by-country', countryId, historicalCountryId],
      })
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ?? e?.message ?? '등록에 실패했습니다.'
      toast.error(msg)
    } finally {
      setRegisterCabinetSubmitting(false)
    }
  }

  /** 새 수반 재임 생성 후 행정부까지 한 번에 등록 */
  const handleRegisterNewHeadAndCabinet = async () => {
    if (!newHeadPersonId || !newHeadPositionDefId || !newHeadStartDate.trim()) {
      toast.error('인물, 직위, 취임일을 입력해주세요.')
      return
    }
    const def = headPositionOptions.find(
      (d: any) => d.id === newHeadPositionDefId,
    )
    if (!def) {
      toast.error('직위를 선택해주세요.')
      return
    }
    const termNumParsed = newHeadTermNumber.trim()
      ? parseInt(newHeadTermNumber.trim(), 10)
      : undefined
    const termNumber =
      termNumParsed != null &&
      !Number.isNaN(termNumParsed) &&
      termNumParsed >= 1
        ? termNumParsed
        : undefined

    setRegisterCabinetSubmitting(true)
    try {
      const tenure = await personCareerApi.addGovernmentPositionTenure({
        personId: newHeadPersonId,
        positionType: def.positionType,
        title: def.title,
        positionDefinitionId: def.id,
        countryId: countryId ?? undefined,
        historicalCountryId: historicalCountryId ?? undefined,
        termNumber,
        startDate: newHeadStartDate.trim(),
        endDate: newHeadEndDate.trim() || undefined,
      })
      const created = tenure as { id: string }
      await personCareerApi.createCabinet({ headTenureId: created.id })
      toast.success('수반 재임과 행정부가 등록되었습니다.')
      setRegisterCabinetModalOpen(false)
      setRegisterFlow('select')
      setNewHeadPersonId(null)
      setNewHeadPositionDefId(null)
      setNewHeadStartDate('')
      setNewHeadEndDate('')
      setNewHeadTermNumber('')
      queryClient.invalidateQueries({
        queryKey: ['cabinets-by-country', countryId, historicalCountryId],
      })
      queryClient.invalidateQueries({
        queryKey: [
          'tenures-by-country-for-cabinet',
          countryId,
          historicalCountryId,
        ],
      })
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ?? e?.message ?? '등록에 실패했습니다.'
      toast.error(msg)
    } finally {
      setRegisterCabinetSubmitting(false)
    }
  }

  const handleDeleteCabinet = async (
    cabinetId: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation()
    if (
      !window.confirm(
        '이 행정부와 수반 재임, 소속 각료 재임을 모두 삭제합니다. 계속할까요?',
      )
    )
      return
    setDeletingCabinetId(cabinetId)
    try {
      await personCareerApi.deleteCabinet(cabinetId)
      toast.success('행정부가 삭제되었습니다.')
      if (selectedCabinetId === cabinetId) setSelectedCabinetId(null)
      queryClient.invalidateQueries({
        queryKey: ['cabinets-by-country', countryId, historicalCountryId],
      })
      queryClient.invalidateQueries({
        queryKey: [
          'tenures-by-country-for-cabinet',
          countryId,
          historicalCountryId,
        ],
      })
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ?? err?.message ?? '삭제에 실패했습니다.',
      )
    } finally {
      setDeletingCabinetId(null)
    }
  }

  const handleOpenEditCabinet = (c: any, e: React.MouseEvent) => {
    e.stopPropagation()
    const head = c.headTenure
    setEditingCabinet(c)
    setEditingCabinetName(c.name ?? '')
    setEditingTermNumber(
      head?.termNumber != null ? String(head.termNumber) : '',
    )
    setEditingPositionDefId(
      head?.positionDefinitionId ?? head?.positionDefinition?.id ?? null,
    )
    setEditingStartDate(
      head?.startDate
        ? typeof head.startDate === 'string'
          ? head.startDate.slice(0, 10)
          : new Date(head.startDate).toISOString().slice(0, 10)
        : '',
    )
    setEditingEndDate(
      head?.endDate
        ? typeof head.endDate === 'string'
          ? head.endDate.slice(0, 10)
          : new Date(head.endDate).toISOString().slice(0, 10)
        : '',
    )
  }

  const closeEditCabinetModal = () => {
    setEditingCabinet(null)
    setEditingCabinetName('')
    setEditingTermNumber('')
    setEditingPositionDefId(null)
    setEditingStartDate('')
    setEditingEndDate('')
  }

  const handleUpdateCabinet = async () => {
    if (!editingCabinet) return
    const cabinetId = editingCabinet.id
    const headTenureId = editingCabinet.headTenure?.id
    if (!headTenureId) {
      toast.error('수반 재임 정보가 없습니다.')
      return
    }
    setUpdatingCabinetId(cabinetId)
    try {
      const termNumParsed = editingTermNumber.trim()
        ? parseInt(editingTermNumber.trim(), 10)
        : undefined
      const termNumber =
        termNumParsed != null &&
        !Number.isNaN(termNumParsed) &&
        termNumParsed >= 1
          ? termNumParsed
          : undefined

      await personCareerApi.updateCabinet(cabinetId, {
        name: editingCabinetName.trim() || null,
      })
      await personCareerApi.updateGovernmentPositionTenure(headTenureId, {
        termNumber,
        positionDefinitionId: editingPositionDefId || undefined,
        startDate: editingStartDate.trim() || undefined,
        endDate: editingEndDate.trim() || undefined,
      })
      toast.success('행정부가 수정되었습니다.')
      closeEditCabinetModal()
      queryClient.invalidateQueries({
        queryKey: ['cabinets-by-country', countryId, historicalCountryId],
      })
      queryClient.invalidateQueries({
        queryKey: [
          'tenures-by-country-for-cabinet',
          countryId,
          historicalCountryId,
        ],
      })
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ?? err?.message ?? '수정에 실패했습니다.',
      )
    } finally {
      setUpdatingCabinetId(null)
    }
  }

  useEffect(() => {
    if (selectedCabinetId && selectedCabinetSectionRef.current) {
      selectedCabinetSectionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }, [selectedCabinetId])

  useEffect(() => {
    if (!personSelectOpen) {
      setSelectedPersonIdForAdd(null)
      setMinisterFormPositionDefId(null)
      setMinisterFormTitle('')
      setMinisterFormStartDate('')
      setMinisterFormEndDate('')
      setMinisterFormTermNumber('')
      setPersonPickerOpen(false)
    }
  }, [personSelectOpen])

  if (loadingCabinets) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 280,
          color: '#64748b',
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            background: 'rgba(99, 102, 241, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: MAIN,
            marginBottom: 16,
          }}
        >
          <FiChevronDown
            size={24}
            style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
          />
        </div>
        행정부 목록을 불러오는 중…
      </div>
    )
  }

  if ((cabinets as any[]).length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div
          style={{
            padding: '48px 32px',
            background: '#fff',
            borderRadius: 20,
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              margin: '0 auto 20px',
              borderRadius: 20,
              background:
                'linear-gradient(145deg, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0.06) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: MAIN,
            }}
          >
            <FiPlus size={28} strokeWidth={2.5} />
          </div>
          <h3
            style={{
              margin: '0 0 8px',
              fontSize: 20,
              fontWeight: 700,
              color: '#0f172a',
              letterSpacing: '-0.02em',
            }}
          >
            등록된 행정부가 없습니다
          </h3>
          <p
            style={{
              margin: '0 0 24px',
              fontSize: 14,
              color: '#64748b',
              lineHeight: 1.5,
              maxWidth: 400,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            수반(대통령·수상 등) 재임을 선택해 행정부를 등록하면, 해당 내각의
            각료를 관리할 수 있습니다.
          </p>
          <button
            type="button"
            onClick={() => {
              setRegisterFlow('new')
              setRegisterCabinetModalOpen(true)
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '14px 24px',
              fontSize: 15,
              fontWeight: 600,
              color: '#fff',
              background: MAIN,
              border: 'none',
              borderRadius: 14,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
            }}
          >
            <FiPlus size={18} />
            행정부 등록
          </button>
        </div>

        {registerCabinetModalOpen && (
          <RegisterCabinetModal
            registerFlow={registerFlow}
            setRegisterFlow={setRegisterFlow}
            headTenuresForRegister={headTenuresForRegister}
            handleRegisterCabinet={handleRegisterCabinet}
            handleRegisterNewHeadAndCabinet={handleRegisterNewHeadAndCabinet}
            registerCabinetSubmitting={registerCabinetSubmitting}
            setRegisterCabinetModalOpen={setRegisterCabinetModalOpen}
            getPersonName={getPersonName}
            formatDate={formatDate}
            allPersons={allPersons}
            headPositionOptions={headPositionOptions}
            newHeadPersonId={newHeadPersonId}
            setNewHeadPersonId={setNewHeadPersonId}
            newHeadPositionDefId={newHeadPositionDefId}
            setNewHeadPositionDefId={setNewHeadPositionDefId}
            newHeadTermNumber={newHeadTermNumber}
            setNewHeadTermNumber={setNewHeadTermNumber}
            newHeadStartDate={newHeadStartDate}
            setNewHeadStartDate={setNewHeadStartDate}
            newHeadEndDate={newHeadEndDate}
            setNewHeadEndDate={setNewHeadEndDate}
          />
        )}
      </div>
    )
  }

  const selectedCabinet = (cabinets as any[]).find(
    (c: any) => c.id === selectedCabinetId,
  )
  const hasSelectedCabinet = Boolean(selectedCabinetId && selectedCabinet)

  return (
    <CabinetsSectionRoot>
      <CabinetsSectionLayout>
        {/* 좌: 행정부 리스트 — 선택 시 우측에 각료 표시 */}
        <CabinetListColumn>
          <section aria-label="행정부 리스트">
            <SectionTitle>행정부 리스트</SectionTitle>
            <SectionDescription>
              수반 취임일 순입니다. 선택하면 오른쪽 영역에 해당 정권의 행정부
              상세가 표시됩니다.
            </SectionDescription>
          </section>
          <CabinetListStack>
            {sortedCabinets.map((c: any) => {
              const head = c.headTenure
              const personName = head?.person
                ? getPersonName(head.person)
                : '이름 없음'
              const posTitle =
                head?.positionDefinition?.title ?? head?.title ?? c.name ?? '행정부'
              const termNum = head?.termNumber ?? head?.regnalNumber
              const termLabel = termNum != null ? `제${termNum}대` : '정권'
              const start = head?.startDate
                ? new Date(head.startDate).getFullYear()
                : ''
              const end = head?.endDate
                ? new Date(head.endDate).getFullYear()
                : '현재'
              const rangeLabel = start && end ? `${start}~${end}` : start || '—'
              const isSelected = selectedCabinetId === c.id
              const isDeleting = deletingCabinetId === c.id
              return (
                <CabinetListCard
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  $selected={isSelected}
                  $deleting={isDeleting}
                  onClick={() => !isDeleting && setSelectedCabinetId(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      if (!isDeleting) setSelectedCabinetId(c.id)
                    }
                  }}
                >
                  <CabinetListCardHeader>
                    <span>
                      {termLabel} · {rangeLabel}
                    </span>
                    <CabinetListCardActions>
                      <CardIconButton
                        type="button"
                        title="행정부 수정"
                        disabled={isDeleting}
                        onClick={(e) => handleOpenEditCabinet(c, e)}
                      >
                        <FiEdit2 size={14} />
                      </CardIconButton>
                      <CardIconButton
                        type="button"
                        title="행정부 삭제"
                        disabled={isDeleting}
                        $danger
                        onClick={(e) => handleDeleteCabinet(c.id, e)}
                      >
                        <FiTrash2 size={14} />
                      </CardIconButton>
                    </CabinetListCardActions>
                  </CabinetListCardHeader>
                  <CabinetListCardBody>
                    <CabinetListCardTitle>
                      {personName} · {posTitle}
                    </CabinetListCardTitle>
                  </CabinetListCardBody>
                </CabinetListCard>
              )
            })}
            <AddCabinetCard
              type="button"
              onClick={() => {
                setRegisterFlow('new')
                setRegisterCabinetModalOpen(true)
              }}
            >
              <FiPlus size={28} style={{ color: '#94a3b8' }} />
              <span style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}>
                행정부 등록
              </span>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>
                클릭하여 새 정권 등록
              </span>
            </AddCabinetCard>
          </CabinetListStack>
        </CabinetListColumn>

        {/* 우: 선택한 정권의 각료 또는 안내 */}
        <CabinetDetailColumn>
          {hasSelectedCabinet ? (
            <SelectedCabinetSection
              ref={selectedCabinetSectionRef}
              aria-label="선택한 정권의 행정부"
            >
              <SelectedCabinetTitle>선택한 정권의 행정부</SelectedCabinetTitle>
              <SelectedCabinetDescription>
                중앙부처(카테고리)별로 이 정권의 각료가 표시됩니다. 부처는
                행정조직 → 중앙부처 탭에서 등록할 수 있습니다.
              </SelectedCabinetDescription>
              {!effectiveCountryIdForDept ? (
                <EmptyStateBox>
                  역사적 국가는 중앙부처가 현대 국가 기준으로 등록됩니다. 이
                  정권의 각료만 목록으로 표시합니다.
                  <EmptyStateList>
                    {(selectedCabinetMinisters as any[]).map((t: any) => (
                      <EmptyStateListItem key={t.id}>
                        <strong>
                          {t.positionDefinition?.title ?? t.title ?? '—'}
                        </strong>{' '}
                        · {getPersonName(t.person)}
                        <MinisterListMeta style={{ marginLeft: 8 }}>
                          {formatDate(t.startDate)}–{formatDate(t.endDate)}
                        </MinisterListMeta>
                      </EmptyStateListItem>
                    ))}
                  </EmptyStateList>
                </EmptyStateBox>
              ) : loadingCategories || loadingMinistriesForCabinet ? (
                <LoadingStateBox>중앙부처 목록을 불러오는 중…</LoadingStateBox>
              ) : categoriesForCabinet.length === 0 ? (
                <EmptyStateBox>
                  부처 카테고리가 없습니다. 행정조직 → 중앙부처 탭에서
                  카테고리를 추가한 뒤 부처를 등록하면 여기에서 부처별 각료를 볼
                  수 있습니다.
                  <EmptyStateList>
                    {(selectedCabinetMinisters as any[]).map((t: any) => (
                      <EmptyStateListItem key={t.id}>
                        <strong>
                          {t.positionDefinition?.title ?? t.title ?? '—'}
                        </strong>{' '}
                        · {getPersonName(t.person)}
                        <MinisterListMeta style={{ marginLeft: 8 }}>
                          {formatDate(t.startDate)}–{formatDate(t.endDate)}
                        </MinisterListMeta>
                      </EmptyStateListItem>
                    ))}
                  </EmptyStateList>
                </EmptyStateBox>
              ) : selectedDeptDetail ? (
                /* 부처 상세 패널: 무슨 일을 했고, 직책·담당자 */
                (() => {
                  const isOthers = selectedDeptDetail.type === 'others'
                  const dept =
                    selectedDeptDetail.type === 'dept'
                      ? selectedDeptDetail.dept
                      : null
                  const category =
                    selectedDeptDetail.type === 'dept'
                      ? selectedDeptDetail.category
                      : null
                  const detailDeptData = selectedDeptDetailData as any
                  const detailEvents = (selectedDeptEvents as any[]) || []
                  const panelMinisters = isOthers
                    ? (() => {
                        const assignedDeptIds = new Set(
                          ministriesForCabinet.map((d: any) => d.id),
                        )
                        return (selectedCabinetMinisters as any[]).filter(
                          (t: any) => {
                            const depId =
                              t.positionDefinition?.administrationDepartmentId
                            return !depId || !assignedDeptIds.has(depId)
                          },
                        )
                      })()
                    : (selectedCabinetMinisters as any[]).filter(
                        (t: any) =>
                          t.positionDefinition?.administrationDepartmentId ===
                          dept?.id,
                      )
                  const EVENT_TYPE_LABEL: Record<string, string> = {
                    PLAN: '계획',
                    COORDINATION: '조율',
                    POLICY: '정책',
                    RESTRUCTURE: '개편',
                    OTHER: '기타',
                  }
                  return (
                    <DeptDetailPanel>
                      <DeptDetailHeader>
                        <DeptDetailTitle>
                          {isOthers
                            ? '기타 (부처 미연결)'
                            : dept?.name ?? category?.name ?? '부처'}
                        </DeptDetailTitle>
                        <DeptDetailBackBtn
                          type="button"
                          onClick={() => setSelectedDeptDetail(null)}
                        >
                          <FiChevronLeft size={18} />
                          목록으로
                        </DeptDetailBackBtn>
                      </DeptDetailHeader>
                      <DeptDetailBody>
                        {!isOthers && dept && (
                          <>
                            {(detailDeptData?.description ||
                              (detailEvents.length > 0)) && (
                              <DeptDetailSection
                                aria-label="무슨 일을 했고"
                              >
                                <DeptDetailSectionTitle>
                                  무슨 일을 했고
                                </DeptDetailSectionTitle>
                                {detailDeptData?.description && (
                                  <DeptDetailDescription>
                                    {detailDeptData.description}
                                  </DeptDetailDescription>
                                )}
                                {detailEvents.length > 0 && (
                                  <DeptEventList>
                                    {detailEvents.map((ev: any) => (
                                      <DeptEventItem key={ev.id}>
                                        <DeptEventItemTitle>
                                          {ev.title}
                                        </DeptEventItemTitle>
                                        <DeptEventItemMeta>
                                          {EVENT_TYPE_LABEL[ev.eventType] ??
                                            ev.eventType}{' '}
                                          ·{' '}
                                          {ev.startDate || ev.endDate
                                            ? `${ev.startDate ?? '—'} ~ ${ev.endDate ?? '현재'}`
                                            : '—'}
                                        </DeptEventItemMeta>
                                        {ev.description && (
                                          <DeptEventItemDesc>
                                            {ev.description}
                                          </DeptEventItemDesc>
                                        )}
                                      </DeptEventItem>
                                    ))}
                                  </DeptEventList>
                                )}
                              </DeptDetailSection>
                            )}
                          </>
                        )}
                        <DeptDetailSection aria-label="직책·담당자">
                          <DeptDetailSectionHead>
                            <DeptDetailSectionTitle>
                              직책 · 담당자
                            </DeptDetailSectionTitle>
                            {selectedCabinet && (
                              <MinisterAddButton
                                type="button"
                                onClick={() =>
                                  handleAddMinister(selectedCabinet)
                                }
                              >
                                <FiPlus size={14} />
                                각료 추가
                              </MinisterAddButton>
                            )}
                          </DeptDetailSectionHead>
                          {panelMinisters.length === 0 ? (
                            <span
                              style={{
                                fontSize: 14,
                                color: '#94a3b8',
                                display: 'block',
                                marginTop: 4,
                              }}
                            >
                              {isOthers
                                ? '부처에 연결되지 않은 각료가 여기 표시됩니다.'
                                : '이 정권에서 등록된 장관이 없습니다.'}
                            </span>
                          ) : (
                            <MinisterList style={{ marginTop: 4 }}>
                              {panelMinisters.map((t: any) => (
                                <MinisterListItem key={t.id}>
                                  <MinisterListName>
                                    {getPersonName(t.person)}
                                  </MinisterListName>
                                  <MinisterListTitle>
                                    {t.positionDefinition?.title ??
                                      t.title ??
                                      ''}
                                  </MinisterListTitle>
                                  <MinisterListMeta>
                                    {formatDate(t.startDate)}–
                                    {t.endDate
                                      ? formatDate(t.endDate)
                                      : '현재'}
                                  </MinisterListMeta>
                                </MinisterListItem>
                              ))}
                            </MinisterList>
                          )}
                        </DeptDetailSection>
                      </DeptDetailBody>
                    </DeptDetailPanel>
                  )
                })()
              ) : (
                <MinisterDeptGrid>
                  {categoriesForCabinet.map((cat: any) => {
                    const dept = ministriesForCabinet.find(
                      (d: any) => d.categoryId === cat.id,
                    )
                    const deptMinisters = (
                      selectedCabinetMinisters as any[]
                    ).filter(
                      (t: any) =>
                        t.positionDefinition?.administrationDepartmentId ===
                        dept?.id,
                    )
                    return (
                      <MinisterDeptCard
                        key={cat.id}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          setSelectedDeptDetail({ type: 'dept', category: cat, dept })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSelectedDeptDetail({ type: 'dept', category: cat, dept })
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <MinisterDeptCardHeader>
                          <MinisterDeptHeaderTitle>
                            {cat.name}
                            {cat.nameEn && (
                              <span
                                style={{
                                  fontWeight: 500,
                                  color: '#94a3b8',
                                  letterSpacing: 0,
                                }}
                              >
                                {cat.nameEn}
                              </span>
                            )}
                          </MinisterDeptHeaderTitle>
                          <MinisterDeptHeaderCount>
                            {deptMinisters.length}명
                          </MinisterDeptHeaderCount>
                        </MinisterDeptCardHeader>
                        <MinisterDeptCardBody>
                          {dept && (
                            <MinisterDeptName>{dept.name}</MinisterDeptName>
                          )}
                          {deptMinisters.length === 0 ? (
                            <MinisterEmptyText>
                              {dept
                                ? '이 정권에서 등록된 장관 없음'
                                : '부처 미등록'}
                            </MinisterEmptyText>
                          ) : (
                            <MinisterList>
                              {deptMinisters.map((t: any) => (
                                <MinisterListItem key={t.id}>
                                  <MinisterListName>
                                    {getPersonName(t.person)}
                                  </MinisterListName>
                                  <MinisterListTitle>
                                    {t.positionDefinition?.title ??
                                      t.title ??
                                      ''}
                                  </MinisterListTitle>
                                  <MinisterListMeta>
                                    {formatDate(t.startDate)}–
                                    {t.endDate
                                      ? formatDate(t.endDate)
                                      : '현재'}
                                  </MinisterListMeta>
                                </MinisterListItem>
                              ))}
                            </MinisterList>
                          )}
                          <MinisterCardActions onClick={(e) => e.stopPropagation()}>
                            {!dept && onOpenMinistriesTab && (
                              <button
                                type="button"
                                onClick={() => onOpenMinistriesTab(cat.id)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '8px 14px',
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: '#64748b',
                                  background: '#f1f5f9',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: 10,
                                  cursor: 'pointer',
                                }}
                              >
                                부처 등록
                              </button>
                            )}
                            {selectedCabinet && (
                              <MinisterAddButton
                                type="button"
                                onClick={() =>
                                  handleAddMinister(selectedCabinet)
                                }
                              >
                                <FiPlus size={14} />
                                각료 추가
                              </MinisterAddButton>
                            )}
                          </MinisterCardActions>
                        </MinisterDeptCardBody>
                      </MinisterDeptCard>
                    )
                  })}
                  {/* 기타: 부처 미연결 각료 */}
                  {(() => {
                    return (
                      <MinisterDeptCard
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          setSelectedDeptDetail({ type: 'others' })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSelectedDeptDetail({ type: 'others' })
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <MinisterDeptCardHeaderAlt>
                          <MinisterDeptHeaderTitle>
                            기타 (부처 미연결)
                          </MinisterDeptHeaderTitle>
                          <MinisterDeptHeaderCount>
                            {(() => {
                              const assignedDeptIds = new Set(
                                ministriesForCabinet.map((d: any) => d.id),
                              )
                              const others = (selectedCabinetMinisters as any[]).filter(
                                (t: any) => {
                                  const depId =
                                    t.positionDefinition?.administrationDepartmentId
                                  return !depId || !assignedDeptIds.has(depId)
                                },
                              )
                              return `${others.length}명`
                            })()}
                          </MinisterDeptHeaderCount>
                        </MinisterDeptCardHeaderAlt>
                        <MinisterDeptCardBody>
                          {(() => {
                            const assignedDeptIds = new Set(
                              ministriesForCabinet.map((d: any) => d.id),
                            )
                            const others = (
                              selectedCabinetMinisters as any[]
                            ).filter((t: any) => {
                              const depId =
                                t.positionDefinition?.administrationDepartmentId
                              return !depId || !assignedDeptIds.has(depId)
                            })
                            return others.length === 0 ? (
                              <MinisterEmptyText>
                                부처에 연결되지 않은 각료가 여기 표시됩니다.
                              </MinisterEmptyText>
                            ) : (
                              <MinisterList>
                                {others.map((t: any) => (
                                  <MinisterListItem key={t.id}>
                                    <MinisterListName>
                                      {getPersonName(t.person)}
                                    </MinisterListName>
                                    <MinisterListTitle>
                                      {t.positionDefinition?.title ??
                                        t.title ??
                                        ''}
                                    </MinisterListTitle>
                                    <MinisterListMeta>
                                      {formatDate(t.startDate)}–
                                      {t.endDate
                                        ? formatDate(t.endDate)
                                        : '현재'}
                                    </MinisterListMeta>
                                  </MinisterListItem>
                                ))}
                              </MinisterList>
                            )
                          })()}
                          {selectedCabinet && (
                            <MinisterCardActions onClick={(e) => e.stopPropagation()}>
                              <MinisterAddButton
                                type="button"
                                onClick={() =>
                                  handleAddMinister(selectedCabinet)
                                }
                              >
                                <FiPlus size={14} />
                                각료 추가
                              </MinisterAddButton>
                            </MinisterCardActions>
                          )}
                        </MinisterDeptCardBody>
                      </MinisterDeptCard>
                    )
                  })()}
                </MinisterDeptGrid>
              )}
            </SelectedCabinetSection>
          ) : (
            <CabinetDetailPlaceholder>
              행정부를 선택하면 해당 정권의 각료를 오른쪽에서 바로 볼 수
              있습니다.
            </CabinetDetailPlaceholder>
          )}
        </CabinetDetailColumn>
      </CabinetsSectionLayout>

      {registerCabinetModalOpen && (
        <RegisterCabinetModal
          registerFlow={registerFlow}
          setRegisterFlow={setRegisterFlow}
          headTenuresForRegister={headTenuresForRegister}
          handleRegisterCabinet={handleRegisterCabinet}
          handleRegisterNewHeadAndCabinet={handleRegisterNewHeadAndCabinet}
          registerCabinetSubmitting={registerCabinetSubmitting}
          setRegisterCabinetModalOpen={setRegisterCabinetModalOpen}
          getPersonName={getPersonName}
          formatDate={formatDate}
          allPersons={allPersons}
          headPositionOptions={headPositionOptions}
          newHeadPersonId={newHeadPersonId}
          setNewHeadPersonId={setNewHeadPersonId}
          newHeadPositionDefId={newHeadPositionDefId}
          setNewHeadPositionDefId={setNewHeadPositionDefId}
          newHeadTermNumber={newHeadTermNumber}
          setNewHeadTermNumber={setNewHeadTermNumber}
          newHeadStartDate={newHeadStartDate}
          setNewHeadStartDate={setNewHeadStartDate}
          newHeadEndDate={newHeadEndDate}
          setNewHeadEndDate={setNewHeadEndDate}
        />
      )}

      {editingCabinet && (
        <CabinetModalOverlay
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-cabinet-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEditCabinetModal()
          }}
        >
          <CabinetModalBox onClick={(e) => e.stopPropagation()}>
            <CabinetModalHeader>
              <CabinetModalTitle id="edit-cabinet-title">행정부 수정</CabinetModalTitle>
              <CabinetCloseBtn
                type="button"
                onClick={closeEditCabinetModal}
                aria-label="닫기"
              >
                <FiX size={22} strokeWidth={2} />
              </CabinetCloseBtn>
            </CabinetModalHeader>
            <CabinetModalBody>
              <CabinetFormDesc>
                <FiInfo size={20} />
                <span>행정부 이름과 수반 재임 정보(대수·직위·취임·퇴임)를 수정할 수 있습니다.</span>
              </CabinetFormDesc>
              <FormRows>
                <FieldRow>
                  <FieldLabel>대수 (선택)</FieldLabel>
                  <FieldControl>
                    <CabinetTermNumberWrap>
                      <RegisterInput
                        type="number"
                        min={1}
                        placeholder="제 N대"
                        value={editingTermNumber}
                        onChange={(e) => setEditingTermNumber(e.target.value)}
                        aria-label="대수"
                      />
                    </CabinetTermNumberWrap>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>인물</FieldLabel>
                  <FieldControl>
                    <div
                      style={{
                        padding: '12px 14px',
                        fontSize: 15,
                        color: '#374151',
                        background: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                      }}
                    >
                      {editingCabinet.headTenure?.person
                        ? getPersonName(editingCabinet.headTenure.person)
                        : '—'}
                    </div>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>직위 (수반)</FieldLabel>
                  <FieldControl>
                    <CabinetSelectNative
                      value={editingPositionDefId ?? ''}
                      onChange={(e) =>
                        setEditingPositionDefId(e.target.value || null)
                      }
                      aria-label="직위 선택"
                    >
                      <option value="">선택</option>
                      {headPositionOptions.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {d.title}
                        </option>
                      ))}
                    </CabinetSelectNative>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>취임일 / 퇴임일</FieldLabel>
                  <FieldControl $variant="datePair">
                    <DateFieldsRow>
                      <CabinetDateTrigger
                        type="button"
                        $hasValue={!!editingStartDate}
                        onClick={() => setEditStartDatePickerOpen(true)}
                        aria-label="취임일 선택"
                      >
                        <span>
                          {editingStartDate
                            ? formatDate(editingStartDate)
                            : '취임일 선택'}
                        </span>
                        <FiChevronDown size={18} />
                      </CabinetDateTrigger>
                      <CabinetDateTrigger
                        type="button"
                        $hasValue={!!editingEndDate}
                        onClick={() => setEditEndDatePickerOpen(true)}
                        aria-label="퇴임일 선택"
                      >
                        <span>
                          {editingEndDate
                            ? formatDate(editingEndDate)
                            : '퇴임일 선택'}
                        </span>
                        <FiChevronDown size={18} />
                      </CabinetDateTrigger>
                    </DateFieldsRow>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>행정부 이름 (선택)</FieldLabel>
                  <FieldControl>
                    <RegisterInput
                      type="text"
                      placeholder="예: 루즈벨트 제1기"
                      value={editingCabinetName}
                      onChange={(e) => setEditingCabinetName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateCabinet()
                      }}
                    />
                  </FieldControl>
                </FieldRow>
              </FormRows>
              <CabinetActions>
                <CabinetCancelBtn type="button" onClick={closeEditCabinetModal}>
                  취소
                </CabinetCancelBtn>
                <SubmitButton
                  type="button"
                  disabled={
                    updatingCabinetId !== null || !editingStartDate.trim()
                  }
                  onClick={handleUpdateCabinet}
                >
                  {updatingCabinetId ? '저장 중…' : '저장'}
                </SubmitButton>
              </CabinetActions>
            </CabinetModalBody>
          </CabinetModalBox>
          {(editStartDatePickerOpen || editEndDatePickerOpen) && (
            <CabinetSubModalLayer>
              <DatePickerModal
                isOpen={editStartDatePickerOpen}
                onClose={() => setEditStartDatePickerOpen(false)}
                onSelect={(date) => {
                  setEditingStartDate(date.slice(0, 10))
                  setEditStartDatePickerOpen(false)
                }}
                initialDate={editingStartDate || undefined}
                title="취임일 선택"
              />
              <DatePickerModal
                isOpen={editEndDatePickerOpen}
                onClose={() => setEditEndDatePickerOpen(false)}
                onSelect={(date) => {
                  setEditingEndDate(date.slice(0, 10))
                  setEditEndDatePickerOpen(false)
                }}
                initialDate={editingEndDate || undefined}
                title="퇴임일 선택"
              />
            </CabinetSubModalLayer>
          )}
        </CabinetModalOverlay>
      )}

      {personSelectOpen && addMinisterCabinet && (
        <>
        <MinisterSelectOverlay
          role="dialog"
          aria-modal="true"
          aria-labelledby="minister-select-title"
          onClick={handleCloseMinisterModal}
        >
          <MinisterSelectBox onClick={(e) => e.stopPropagation()}>
            <MinisterSelectHeader>
              <MinisterSelectTitle id="minister-select-title">
                각료 등록
              </MinisterSelectTitle>
              <CabinetCloseBtn
                type="button"
                onClick={handleCloseMinisterModal}
                aria-label="닫기"
              >
                <FiX size={22} strokeWidth={2} />
              </CabinetCloseBtn>
            </MinisterSelectHeader>
            <MinisterSelectBody>
              <FormRows>
                <FieldRow>
                  <FieldLabel>
                    인물 <Required aria-label="필수" />
                  </FieldLabel>
                  <FieldControl>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <MinisterPersonTrigger
                        type="button"
                        onClick={() => setPersonPickerOpen(true)}
                      >
                        <MinisterPersonThumb
                          $hasImage={!!selectedMinisterPerson?.profileImageUrl}
                        >
                          {selectedMinisterPerson?.profileImageUrl ? (
                            <img
                              src={
                                getUploadImageUrl(
                                  selectedMinisterPerson.profileImageUrl,
                                ) || selectedMinisterPerson.profileImageUrl
                              }
                              alt=""
                            />
                          ) : (
                            <FiUser size={24} strokeWidth={2} />
                          )}
                        </MinisterPersonThumb>
                        <MinisterPersonLabel
                          className={selectedPersonIdForAdd ? '' : 'placeholder'}
                        >
                          {selectedMinisterPerson
                            ? getPersonName(selectedMinisterPerson)
                            : '인물 선택'}
                        </MinisterPersonLabel>
                        <FiChevronDown size={18} style={{ flexShrink: 0, color: '#94a3b8' }} />
                      </MinisterPersonTrigger>
                      {selectedPersonIdForAdd && (
                        <button
                          type="button"
                          onClick={handleChangePersonForMinister}
                          style={{
                            padding: '6px 12px',
                            fontSize: 13,
                            fontWeight: 500,
                            color: MAIN,
                            background: 'transparent',
                            border: `1px solid ${BORDER}`,
                            borderRadius: 8,
                            cursor: 'pointer',
                          }}
                        >
                          변경
                        </button>
                      )}
                    </div>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>
                    직위 <Required aria-label="필수" />
                  </FieldLabel>
                  <FieldControl>
                    <select
                      value={ministerFormPositionDefId ?? ''}
                      onChange={(e) => {
                        const v = e.target.value
                        setMinisterFormPositionDefId(v === '' ? null : v)
                        if (!v || v === '__OTHER__') {
                          if (v !== '__OTHER__') setMinisterFormTitle('')
                        } else {
                          const d = ministerPositionOptions.find(
                            (o: any) => o.id === v,
                          )
                          if (d) setMinisterFormTitle('')
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: 14,
                        border: `1px solid ${BORDER}`,
                        borderRadius: 10,
                        background: '#fff',
                      }}
                    >
                      <option value="">직위 선택</option>
                      {ministerPositionOptions.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {d.title ?? d.name ?? d.id}
                        </option>
                      ))}
                      <option value="__OTHER__">기타 (직접 입력)</option>
                    </select>
                    {ministerFormPositionDefId === '__OTHER__' && (
                      <RegisterInput
                        type="text"
                        placeholder="예: 국방장관"
                        value={ministerFormTitle}
                        onChange={(e) => setMinisterFormTitle(e.target.value)}
                        style={{ marginTop: 8, maxWidth: 320 }}
                      />
                    )}
                    <p style={{ margin: '8px 0 0', fontSize: 12, color: TEXT_MUTED }}>
                      교육부 장관·외무대신 등 직위는 행정조직 <strong>직위 정의</strong> 탭에서
                      등록한 뒤 목록에서 선택할 수 있습니다. 없으면 기타(직접 입력)을 사용하세요.
                    </p>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>대수 (선택)</FieldLabel>
                  <FieldControl>
                    <RegisterInput
                      type="number"
                      min={1}
                      placeholder="예: 1"
                      value={ministerFormTermNumber}
                      onChange={(e) => setMinisterFormTermNumber(e.target.value)}
                      aria-label="대수"
                      style={{ width: '100%', maxWidth: 96 }}
                    />
                  </FieldControl>
                </FieldRow>
                <DateRangeField
                  label="취임일 · 퇴임일"
                  required
                  startValue={ministerFormStartDate}
                  endValue={ministerFormEndDate}
                  onStartChange={setMinisterFormStartDate}
                  onEndChange={setMinisterFormEndDate}
                  startPlaceholder="취임일"
                  endPlaceholder="퇴임일 (선택)"
                  openEndAfterStart
                />
              </FormRows>
              <MinisterSelectActions>
                <CabinetCancelBtn
                  type="button"
                  onClick={handleCloseMinisterModal}
                >
                  취소
                </CabinetCancelBtn>
                <SubmitButton
                  type="button"
                  disabled={
                    ministerFormSubmitting ||
                    !selectedPersonIdForAdd ||
                    !ministerFormStartDate.trim() ||
                    (!(ministerFormPositionDefId && ministerFormPositionDefId !== '__OTHER__') &&
                      !ministerFormTitle.trim())
                  }
                  onClick={handleSubmitMinister}
                >
                  {ministerFormSubmitting ? '처리 중…' : '각료 등록'}
                </SubmitButton>
              </MinisterSelectActions>
            </MinisterSelectBody>
          </MinisterSelectBox>
        </MinisterSelectOverlay>

        {personPickerOpen && (
          <PersonSelectModal
            persons={personsForMinisterSelect as any[]}
            selectedPersonId={selectedPersonIdForAdd ?? ''}
            onSelect={(personId) => {
              handleSelectPersonForMinister(personId)
              setPersonPickerOpen(false)
            }}
            onClose={() => setPersonPickerOpen(false)}
          />
        )}
        </>
      )}
    </CabinetsSectionRoot>
  )
}

function RegisterCabinetModal({
  registerFlow,
  setRegisterFlow,
  headTenuresForRegister,
  handleRegisterCabinet,
  handleRegisterNewHeadAndCabinet,
  registerCabinetSubmitting,
  setRegisterCabinetModalOpen,
  getPersonName,
  formatDate,
  allPersons,
  headPositionOptions,
  newHeadPersonId,
  setNewHeadPersonId,
  newHeadPositionDefId,
  setNewHeadPositionDefId,
  newHeadTermNumber,
  setNewHeadTermNumber,
  newHeadStartDate,
  setNewHeadStartDate,
  newHeadEndDate,
  setNewHeadEndDate,
}: {
  registerFlow: 'select' | 'new'
  setRegisterFlow: (f: 'select' | 'new') => void
  headTenuresForRegister: any[]
  handleRegisterCabinet: (t: any) => Promise<void>
  handleRegisterNewHeadAndCabinet: () => Promise<void>
  registerCabinetSubmitting: boolean
  setRegisterCabinetModalOpen: (v: boolean) => void
  getPersonName: (p: any) => string
  formatDate: (d: any) => string
  allPersons: any[]
  headPositionOptions: any[]
  newHeadPersonId: string | null
  setNewHeadPersonId: (v: string | null) => void
  newHeadPositionDefId: string | null
  setNewHeadPositionDefId: (v: string | null) => void
  newHeadTermNumber: string
  setNewHeadTermNumber: (v: string) => void
  newHeadStartDate: string
  setNewHeadStartDate: (v: string) => void
  newHeadEndDate: string
  setNewHeadEndDate: (v: string) => void
}) {
  const [headTenureFilter, setHeadTenureFilter] = useState('')
  const [personSelectOpen, setPersonSelectOpen] = useState(false)
  const [startDatePickerOpen, setStartDatePickerOpen] = useState(false)
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false)
  const filteredHeadTenures = useMemo(() => {
    const q = headTenureFilter.trim().toLowerCase()
    if (!q) return headTenuresForRegister
    return headTenuresForRegister.filter((t: any) => {
      const name = getPersonName(t.person)
      const title = t.positionDefinition?.title ?? t.title ?? '수반'
      const startStr = formatDate(t.startDate)
      const endStr = t.endDate ? formatDate(t.endDate) : '현재'
      return `${name} ${title} ${startStr} ${endStr}`.toLowerCase().includes(q)
    })
  }, [headTenuresForRegister, headTenureFilter, getPersonName, formatDate])

  const close = () => {
    if (!registerCabinetSubmitting) {
      setRegisterCabinetModalOpen(false)
      setRegisterFlow('select')
    }
  }

  const content = (
    <CabinetModalOverlay
      role="dialog"
      aria-modal="true"
      aria-labelledby="cabinet-modal-title"
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <CabinetModalBox onClick={(e) => e.stopPropagation()}>
        <CabinetModalHeader>
          <CabinetModalTitle id="cabinet-modal-title">
            행정부 등록
          </CabinetModalTitle>
          <CabinetCloseBtn type="button" onClick={close} aria-label="닫기">
            <FiX size={22} strokeWidth={2} />
          </CabinetCloseBtn>
        </CabinetModalHeader>
        <CabinetModalBody>
          <CabinetTabWrap>
            <TabNavigation>
              <TabButton
                type="button"
                $active={registerFlow === 'select'}
                onClick={() => setRegisterFlow('select')}
              >
                기존 수반 선택
              </TabButton>
              <TabButton
                type="button"
                $active={registerFlow === 'new'}
                onClick={() => setRegisterFlow('new')}
              >
                새 수반 등록
              </TabButton>
            </TabNavigation>
          </CabinetTabWrap>

          {registerFlow === 'select' ? (
            <>
              <CabinetFormDesc>
                <FiInfo size={20} />
                <span>
                  이 국가의 <strong>수반(국가원수·정부수반) 재임</strong> 중, 아직 행정부가 연결되지 않은 재임만 표시됩니다. 항목을 선택하면 해당 재임으로 행정부가 생성됩니다.
                </span>
              </CabinetFormDesc>
              {headTenuresForRegister.length === 0 ? (
                <CabinetSelectSection style={{ minHeight: 200, justifyContent: 'center' }}>
                  <CabinetEmptyHint>
                    <FiUsers size={44} strokeWidth={1.5} />
                    <span>등록된 수반 재임이 없습니다.</span>
                    <span><strong>새 수반 등록</strong> 탭에서 먼저 수반을 등록하세요.</span>
                  </CabinetEmptyHint>
                </CabinetSelectSection>
              ) : (
                <CabinetSelectSection>
                  <CabinetSelectSectionTitle>수반 재임 목록</CabinetSelectSectionTitle>
                  <CabinetSearchWrap>
                    <CabinetSearchIcon>
                      <FiSearch size={16} />
                    </CabinetSearchIcon>
                    <RegisterInput
                      type="search"
                      placeholder="이름, 직위, 기간 검색"
                      value={headTenureFilter}
                      onChange={(e) => setHeadTenureFilter(e.target.value)}
                      style={{ paddingLeft: 44 }}
                    />
                  </CabinetSearchWrap>
                  <CabinetList>
                    {filteredHeadTenures.length === 0 ? (
                      <li>
                        <CabinetEmptyHint style={{ margin: 0, padding: '36px 24px' }}>
                          <span>{headTenureFilter.trim() ? '검색 결과가 없습니다.' : '목록이 비어 있습니다.'}</span>
                        </CabinetEmptyHint>
                      </li>
                    ) : (
                      filteredHeadTenures.map((t: any) => {
                        const termNum = t.termNumber ?? t.regnalNumber
                        const termLabel =
                          termNum != null ? `제${termNum}대 ` : ''
                        const positionTitle =
                          t.positionDefinition?.title ?? t.title ?? '수반'
                        const roleLabel =
                          t.positionType === 'HEAD_OF_STATE'
                            ? '국가원수'
                            : t.positionType === 'HEAD_OF_GOVERNMENT'
                              ? '정부수반'
                              : '수반'
                        return (
                          <li key={t.id}>
                            <CabinetHeadTenureCard
                              type="button"
                              disabled={registerCabinetSubmitting}
                              onClick={() => handleRegisterCabinet(t)}
                            >
                              <CabinetHeadTenureCardMain>
                                <CabinetHeadTenureCardBadge>
                                  {roleLabel}
                                </CabinetHeadTenureCardBadge>
                                <CabinetHeadTenureCardName>
                                  {getPersonName(t.person)} · {termLabel}
                                  {positionTitle}
                                </CabinetHeadTenureCardName>
                                <CabinetHeadTenureCardMeta>
                                  {formatDate(t.startDate)} ~{' '}
                                  {t.endDate ? formatDate(t.endDate) : '현재'}
                                </CabinetHeadTenureCardMeta>
                              </CabinetHeadTenureCardMain>
                              <CabinetHeadTenureCardAction>
                                선택
                                <FiChevronRight size={18} />
                              </CabinetHeadTenureCardAction>
                            </CabinetHeadTenureCard>
                          </li>
                        )
                      })
                    )}
                  </CabinetList>
                </CabinetSelectSection>
              )}
              <CabinetActions style={{ flexShrink: 0 }}>
                <CabinetCancelBtn type="button" onClick={close}>
                  취소
                </CabinetCancelBtn>
              </CabinetActions>
            </>
          ) : (
            <>
              <CabinetFormDesc>
                <FiInfo size={20} />
                <span>수반 인물·직위·기간을 입력하면 재임과 행정부가 함께 등록됩니다.</span>
              </CabinetFormDesc>
              <FormRows>
                <FieldRow>
                  <FieldLabel>대수 (선택)</FieldLabel>
                  <FieldControl>
                    <CabinetTermNumberWrap>
                      <RegisterInput
                        type="number"
                        min={1}
                        placeholder="제 N대"
                        value={newHeadTermNumber}
                        onChange={(e) => setNewHeadTermNumber(e.target.value)}
                        aria-label="대수"
                      />
                    </CabinetTermNumberWrap>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>
                    인물 <Required />
                  </FieldLabel>
                  <FieldControl>
                    <CabinetSelectTrigger
                      type="button"
                      $hasValue={!!newHeadPersonId}
                      onClick={() => setPersonSelectOpen(true)}
                      aria-label="수반 인물 선택"
                    >
                      <span>
                        {newHeadPersonId
                          ? getPersonName(
                              allPersons.find((p: any) => p.id === newHeadPersonId),
                            )
                          : '인물 선택'}
                      </span>
                      <FiChevronDown size={18} />
                    </CabinetSelectTrigger>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>
                    직위 (수반) <Required />
                  </FieldLabel>
                  <FieldControl>
                    <CabinetSelectNative
                      value={newHeadPositionDefId ?? ''}
                      onChange={(e) =>
                        setNewHeadPositionDefId(e.target.value || null)
                      }
                      aria-label="직위 선택"
                    >
                      <option value="">선택</option>
                      {headPositionOptions.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {d.title}
                        </option>
                      ))}
                    </CabinetSelectNative>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>
                    취임일 <Required /> / 퇴임일
                  </FieldLabel>
                  <FieldControl $variant="datePair">
                    <DateFieldsRow>
                      <CabinetDateTrigger
                        type="button"
                        $hasValue={!!newHeadStartDate}
                        onClick={() => setStartDatePickerOpen(true)}
                        aria-label="취임일 선택"
                      >
                        <span>
                          {newHeadStartDate
                            ? formatDate(newHeadStartDate)
                            : '취임일 선택'}
                        </span>
                        <FiChevronDown size={18} />
                      </CabinetDateTrigger>
                      <CabinetDateTrigger
                        type="button"
                        $hasValue={!!newHeadEndDate}
                        onClick={() => setEndDatePickerOpen(true)}
                        aria-label="퇴임일 선택"
                      >
                        <span>
                          {newHeadEndDate
                            ? formatDate(newHeadEndDate)
                            : '퇴임일 선택'}
                        </span>
                        <FiChevronDown size={18} />
                      </CabinetDateTrigger>
                    </DateFieldsRow>
                  </FieldControl>
                </FieldRow>
              </FormRows>
              <CabinetActions>
                <CabinetCancelBtn type="button" onClick={close}>
                  취소
                </CabinetCancelBtn>
                <SubmitButton
                  type="button"
                  disabled={
                    registerCabinetSubmitting ||
                    !newHeadPersonId ||
                    !newHeadPositionDefId ||
                    !newHeadStartDate.trim()
                  }
                  onClick={() => handleRegisterNewHeadAndCabinet()}
                >
                  {registerCabinetSubmitting ? '등록 중…' : '등록'}
                </SubmitButton>
              </CabinetActions>
            </>
          )}
        </CabinetModalBody>
      </CabinetModalBox>
      {(personSelectOpen || startDatePickerOpen || endDatePickerOpen) && (
        <CabinetSubModalLayer>
          {personSelectOpen && (
            <PersonSelectModal
              persons={allPersons}
              selectedPersonId={newHeadPersonId ?? ''}
              onSelect={(personId, _personName) => {
                setNewHeadPersonId(personId)
                setPersonSelectOpen(false)
              }}
              onClose={() => setPersonSelectOpen(false)}
            />
          )}
          <DatePickerModal
            isOpen={startDatePickerOpen}
            onClose={() => setStartDatePickerOpen(false)}
            onSelect={(date) => {
              setNewHeadStartDate(date)
              setStartDatePickerOpen(false)
            }}
            initialDate={newHeadStartDate || undefined}
            title="취임일 선택"
          />
          <DatePickerModal
            isOpen={endDatePickerOpen}
            onClose={() => setEndDatePickerOpen(false)}
            onSelect={(date) => {
              setNewHeadEndDate(date)
              setEndDatePickerOpen(false)
            }}
            initialDate={newHeadEndDate || undefined}
            title="퇴임일 선택"
          />
        </CabinetSubModalLayer>
      )}
    </CabinetModalOverlay>
  )

  return createPortal(content, document.body)
}

function ModalOverlay({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

function ModalCard({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: (e: React.MouseEvent) => void
}) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 22,
        padding: 28,
        maxWidth: 460,
        width: '100%',
        maxHeight: '85vh',
        overflow: 'auto',
        boxShadow: '0 24px 48px rgba(0,0,0,0.18)',
      }}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

/** 각료로 등록할 인물 선택 모달 — 검색·리스트 UX */
const MinisterSelectOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`
const MinisterSelectBox = styled.div`
  width: 100%;
  max-width: 920px;
  max-height: 88vh;
  background: #fff;
  border-radius: 20px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
  z-index: ${Z_INDEX.MODAL_CONTENT};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`
const MinisterSelectHeader = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f3f4f6;
`
const MinisterSelectTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111;
`
const MinisterSelectBody = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 20px 24px 24px;
`
/** 인물 등록 모달 썸네일과 동일: 88px 원형, 점선 테두리, 배경·호버 색 */
const MinisterPersonTrigger = styled.button`
  display: flex;
  align-items: center;
  gap: 20px;
  width: 100%;
  padding: 14px 0;
  text-align: left;
  background: transparent;
  border: none;
  border-bottom: 1px solid #f3f4f6;
  border-radius: 0;
  cursor: pointer;

  &:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px rgba(99, 102, 241, 0.35);
  }
`
const MinisterPersonThumb = styled.div<{ $hasImage?: boolean }>`
  width: 88px;
  height: 88px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: ${(p) => (p.$hasImage ? 'transparent' : 'rgba(226, 232, 240, 0.6)')};
  border: 2px dashed ${(p) => (p.$hasImage ? 'transparent' : 'rgba(99, 102, 241, 0.35)')};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s, background 0.2s;

  ${MinisterPersonTrigger}:hover & {
    border-color: ${(p) => (p.$hasImage ? 'transparent' : 'rgba(99, 102, 241, 0.6)')};
    background: ${(p) => (p.$hasImage ? 'transparent' : 'rgba(226, 232, 240, 0.9)')};
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  svg {
    color: #94a3b8;
    width: 32px;
    height: 32px;
  }
`
const MinisterPersonLabel = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 500;
  color: #0f172a;
  &.placeholder {
    color: #64748b;
  }
`
const MinisterSelectActions = styled.div`
  flex-shrink: 0;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #f3f4f6;
  display: flex;
  justify-content: flex-end;
`

/** 행정부 리스트 카드 — 호버·선택 시 시각적 피드백, 가독성 개선 */
const CabinetListCard = styled.div<{ $selected?: boolean; $deleting?: boolean }>`
  position: relative;
  background: #ffffff;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  border: 1px solid ${(p) => (p.$selected ? '#c7d2fe' : 'transparent')};
  min-height: 106px;
  cursor: ${(p) => (p.$deleting ? 'wait' : 'pointer')};
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    border-color: ${(p) =>
      p.$deleting ? '#e5eaf1' : p.$selected ? MAIN : '#c7d2fe'};
    background: ${(p) => (p.$deleting ? '#ffffff' : '#f8fafc')};
    box-shadow: ${(p) =>
      p.$deleting ? 'none' : '0 1px 2px rgba(15, 23, 42, 0.05)'};
  }
  &:focus-visible {
    outline: none;
    border-color: ${MAIN};
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.16);
  }
  ${(p) =>
    p.$selected &&
    `background: #f8faff; box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.24);`}
`
const CabinetListCardHeader = styled.div`
  padding: 7px 12px 2px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  letter-spacing: 0.02em;
  border-bottom: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`
const CabinetListCardBody = styled.div`
  flex: 1;
  padding: 0 12px 9px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 4px;
`
const CabinetListCardTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.01em;
  line-height: 1.28;
`
const CabinetListCardMeta = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
`

/* ——— 2열 레이아웃: 좌 행정부 리스트 / 우 선택한 정권 각료 ——— */
const CabinetsSectionRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-top: 10px;
`
const CabinetsSectionLayout = styled.div`
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 18px;
  align-items: start;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 14px;
  }
`
const CabinetListColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 24px;
  padding-right: 16px;
  border-right: 1px solid #eef2f7;

  @media (max-width: 900px) {
    position: static;
    top: auto;
    padding-right: 0;
    border-right: none;
  }
`
const CabinetDetailColumn = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-left: 6px;

  @media (max-width: 900px) {
    padding-left: 0;
  }
`
const SectionTitle = styled.h3`
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.025em;
  line-height: 1.25;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  position: relative;
  padding-left: 12px;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: 18px;
    border-radius: 999px;
    background: linear-gradient(180deg, #6366f1 0%, #4f46e5 100%);
  }
`
const SectionDescription = styled.p`
  margin: 0 0 20px;
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
  &:last-child {
    margin-bottom: 0;
  }
`
const CabinetListStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`
const AddCabinetCard = styled.button`
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 16px;
  min-height: 120px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  transition: border-color 0.2s, background 0.2s;
  &:hover {
    border-color: #94a3b8;
    background: #f1f5f9;
  }
  &:focus-visible {
    outline: none;
    border-color: ${MAIN};
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
  }
`
const CabinetDetailPlaceholder = styled.div`
  padding: 48px 32px;
  background: #f8fafc;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  text-align: center;
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
`
const SelectedCabinetSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
`
const SelectedCabinetTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.025em;
  line-height: 1.25;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  position: relative;
  padding-left: 12px;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: 18px;
    border-radius: 999px;
    background: linear-gradient(180deg, #0ea5e9 0%, #0284c7 100%);
  }
`
const SelectedCabinetDescription = styled.p`
  margin: 0;
  font-size: 14px;
  color: #64748b;
  line-height: 1.5;
`
const MinisterDeptCard = styled.div`
  background: #ffffff;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid #e5eaf1;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  min-height: 180px;
`
const MinisterDeptCardHeader = styled.div`
  padding: 14px 16px;
  font-size: 12px;
  font-weight: 700;
  color: #334155;
  letter-spacing: 0.01em;
  text-transform: none;
  border-bottom: 1px solid #eef2f7;
  background: #f9fbfd;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`
const MinisterDeptCardHeaderAlt = styled(MinisterDeptCardHeader)`
  background: #f4f7fb;
`
const MinisterDeptHeaderTitle = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #334155;
`
const MinisterDeptHeaderCount = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
`
const MinisterDeptCardBody = styled.div`
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`
const MinisterDeptName = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;
  margin-bottom: 4px;
`
const MinisterList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
`
const MinisterListItem = styled.li`
  font-size: 14px;
  color: #334155;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'name meta'
    'title meta';
  column-gap: 10px;
  row-gap: 2px;
  align-items: center;
  padding: 10px 12px;
  background: #ffffff;
  border-radius: 9px;
  border: 1px solid #e8eef5;
  line-height: 1.45;
`
const MinisterListName = styled.span`
  grid-area: name;
  font-weight: 700;
  font-size: 14px;
  color: #0f172a;
`
const MinisterListTitle = styled.span`
  grid-area: title;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
`
const MinisterListMeta = styled.span`
  grid-area: meta;
  color: #94a3b8;
  font-size: 12px;
  margin-left: 0;
  white-space: nowrap;
`
const MinisterEmptyText = styled.span`
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.5;
`
const MinisterCardActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: auto;
  padding-top: 12px;
  flex-wrap: wrap;
`
const MinisterAddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: ${MAIN};
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.25);
  border-radius: 10px;
  cursor: pointer;
  &:hover {
    background: rgba(99, 102, 241, 0.12);
    border-color: rgba(99, 102, 241, 0.4);
  }
`
const EmptyStateBox = styled.div`
  padding: 32px;
  background: #f8fafc;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  font-size: 14px;
  color: #64748b;
  line-height: 1.5;
`
const EmptyStateList = styled.ul`
  margin: 16px 0 0;
  padding-left: 20px;
`
const EmptyStateListItem = styled.li`
  margin-bottom: 6px;
`
const LoadingStateBox = styled.div`
  padding: 48px;
  background: #f8fafc;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  text-align: center;
  font-size: 14px;
  color: #64748b;
`
const MinisterDeptGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
`
const CabinetListCardActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`
const CardIconButton = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  &:hover:not(:disabled) {
    background: ${(p) => (p.$danger ? '#fef2f2' : '#f1f5f9')};
    color: ${(p) => (p.$danger ? '#dc2626' : '#475569')};
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`

/* ——— 부처 상세 패널 (무슨 일을 했고, 직책·담당자) ——— */
const DeptDetailPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
`
const DeptDetailHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid #f3f4f6;
  background: #fafafa;
`
const DeptDetailTitle = styled.h3`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;
`
const DeptDetailBackBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  &:hover {
    background: #f1f5f9;
    color: #334155;
  }
`
const DeptDetailBody = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 28px;
`
const DeptDetailSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
`
const DeptDetailSectionTitle = styled.h4`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #475569;
  letter-spacing: 0.02em;
  text-transform: uppercase;
`
const DeptDetailSectionHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`
const DeptDetailDescription = styled.div`
  font-size: 15px;
  color: #334155;
  line-height: 1.7;
  white-space: pre-wrap;
`
const DeptEventList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
`
const DeptEventItem = styled.li`
  padding: 14px 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 6px;
`
const DeptEventItemTitle = styled.span`
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
`
const DeptEventItemMeta = styled.span`
  font-size: 13px;
  color: #64748b;
`
const DeptEventItemDesc = styled.p`
  margin: 0;
  font-size: 14px;
  color: #475569;
  line-height: 1.5;
`
