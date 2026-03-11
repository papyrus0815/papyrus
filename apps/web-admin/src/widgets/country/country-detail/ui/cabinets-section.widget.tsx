/**
 * 행정부(역대 내각) — 행정조직 탭 내 "행정부" 서브탭에서 표시.
 * 수반 재임별 행정부 등록·조회, 각료 추가.
 * 정권 선택 시 아래에 중앙부처 스타일 그리드로 해당 정권의 부처별 각료 표시(전자: 카테고리만, 사용자 등록 부처).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiChevronDown, FiPlus, FiSearch, FiTrash2, FiX } from 'react-icons/fi'
import { toast } from 'react-hot-toast'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { getAllPersons, getPersonsByTenureCountry } from '@/shared/api/persons'
import { personCareerApi } from '@/shared/api/person-career'
import { administrationDepartmentApi } from '@/shared/api/administration-department'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { Z_INDEX } from '@/shared/styles/z-index'
import { DatePickerModal } from '@/shared/ui/date-picker'
import { PersonSelectModal } from '@/shared/ui/person-select-modal'
import { TenureRegisterPanel } from '@/shared/ui/tenure-register-panel'

const MAIN = '#6366f1'
const MAIN_HOVER = '#4f46e5'
const BORDER = '#e5e7eb'
const BORDER_LIGHT = '#f3f4f6'
const BG_MUTED = '#f8fafc'
const TEXT = '#0f172a'
const TEXT_MUTED = '#64748b'
const HEAD_POSITION_TYPES = new Set(['HEAD_OF_STATE', 'HEAD_OF_GOVERNMENT'])

/* 행정부 등록 모달 — CountrySelectModal·events modal.styles 동일 톤 (깔끔·트렌디) */
const CabinetModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: cabinetOverlayIn 0.2s ease;
  @keyframes cabinetOverlayIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`
const CabinetModalBox = styled.div`
  width: min(640px, calc(100% - 40px));
  max-height: 88vh;
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04);
  z-index: ${Z_INDEX.MODAL_CONTENT};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: cabinetModalUp 0.25s ease;
  @keyframes cabinetModalUp {
    from { transform: translateY(16px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`
const CabinetModalHeader = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26px 30px;
  border-bottom: 1px solid ${BORDER_LIGHT};
`
const CabinetModalTitle = styled.h2`
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: ${TEXT};
  letter-spacing: -0.025em;
`
const CabinetCloseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  background: ${BG_MUTED};
  color: ${TEXT_MUTED};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover {
    background: rgba(99, 102, 241, 0.1);
    color: ${MAIN};
  }
`
const CabinetModalBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 26px 30px 30px;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: ${BORDER_LIGHT}; border-radius: 3px; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
  &::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
`
const CabinetFormDesc = styled.p`
  margin: 0 0 20px;
  font-size: 13px;
  color: ${TEXT_MUTED};
  line-height: 1.5;
`
const CabinetField = styled.div`
  margin-bottom: 20px;
`
const CabinetLabel = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: ${TEXT};
  margin-bottom: 8px;
`
const CabinetInput = styled.input`
  width: 100%;
  padding: 14px 16px;
  font-size: 15px;
  color: ${TEXT};
  border: 1px solid ${BORDER};
  border-radius: 12px;
  box-sizing: border-box;
  background: #fff;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  &::placeholder { color: #94a3b8; }
  &:focus {
    border-color: ${MAIN};
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }
`
const CabinetSelect = styled.select`
  width: 100%;
  padding: 14px 16px;
  font-size: 15px;
  color: ${TEXT};
  border: 1px solid ${BORDER};
  border-radius: 12px;
  background: #fff;
  outline: none;
  transition: border-color 0.2s ease;
  &:focus { border-color: ${MAIN}; }
`
const CabinetSelectBtn = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  font-size: 15px;
  color: ${TEXT};
  border: 1px solid ${BORDER};
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  &:focus {
    border-color: ${MAIN};
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }
  &:hover { border-color: rgba(99, 102, 241, 0.4); }
`
const CabinetSearchWrap = styled.div`
  position: relative;
  margin-bottom: 16px;
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
  padding: 0;
  max-height: 380px;
  overflow-y: auto;
`
const CabinetListItemBtn = styled.button`
  width: 100%;
  padding: 14px 16px;
  text-align: left;
  border: 1.5px solid rgba(20, 19, 34, 0.08);
  border-radius: 14px;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: ${TEXT};
  margin-bottom: 8px;
  transition: all 0.2s ease;
  &:hover:not(:disabled) {
    border-color: rgba(99, 102, 241, 0.25);
    background: #f8fafc;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
  }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`
const CabinetStepTabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
`
const CabinetStepTab = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 600;
  color: ${(p) => (p.$active ? '#fff' : TEXT_MUTED)};
  background: ${(p) => (p.$active ? MAIN : 'transparent')};
  border: 1px solid ${(p) => (p.$active ? MAIN : BORDER)};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover:not(:disabled) {
    background: ${(p) => (p.$active ? MAIN_HOVER : 'rgba(99, 102, 241, 0.08)')};
    border-color: ${MAIN};
    color: ${(p) => (p.$active ? '#fff' : MAIN)};
  }
`
const CabinetPrimaryBtn = styled.button`
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: ${MAIN};
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s ease;
  &:hover:not(:disabled) { background: ${MAIN_HOVER}; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`
const CabinetSecondaryBtn = styled.button`
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
  color: ${TEXT_MUTED};
  background: #fff;
  border: 1px solid ${BORDER};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover { background: ${BG_MUTED}; }
`
const CabinetActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid ${BORDER_LIGHT};
  flex-wrap: wrap;
`
const CabinetEmptyHint = styled.p`
  margin: 0;
  padding: 40px 24px;
  font-size: 14px;
  color: ${TEXT_MUTED};
  text-align: center;
  background: ${BG_MUTED};
  border-radius: 14px;
  border: 1px dashed ${BORDER};
  line-height: 1.5;
`
const CabinetDateRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`

function getPersonName(p: any): string {
  if (!p) return '—'
  return getPersonDisplayName({
    name: p.name ?? '',
    surname: p.surname ?? null,
    middleName: p.middleName ?? null,
    nameDisplayOrder: (p.nameDisplayOrder as 'korean' | 'western') ?? 'korean',
  }, true)
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
}

export interface CabinetsSectionProps {
  country: UnifiedCountry
  /** 부처 등록 시 중앙부처 탭으로 전환하고 해당 카테고리로 폼 열기 */
  onOpenMinistriesTab?: (categoryId?: string) => void
}

export function CabinetsSection({ country, onOpenMinistriesTab }: CabinetsSectionProps) {
  const queryClient = useQueryClient()
  const isHistorical = country.type === 'historical'
  const countryId = !isHistorical ? country.id : undefined
  const historicalCountryId = isHistorical ? country.id : undefined

  /** 선택한 정권 — 위에 행정부처(중앙부처) 그리드로 해당 정권의 부처별 각료 표시 */
  const [selectedCabinetId, setSelectedCabinetId] = useState<string | null>(null)
  const selectedCabinetSectionRef = useRef<HTMLElement | null>(null)
  const [addMinisterCabinet, setAddMinisterCabinet] = useState<any | null>(null)
  const [personSelectOpen, setPersonSelectOpen] = useState(false)
  const [selectedPersonIdForAdd, setSelectedPersonIdForAdd] = useState<string | null>(null)
  const [tenurePanelOpen, setTenurePanelOpen] = useState(false)
  const [registerCabinetModalOpen, setRegisterCabinetModalOpen] = useState(false)
  const [registerCabinetSubmitting, setRegisterCabinetSubmitting] = useState(false)
  /** 'select' = 기존 수반 재임 선택, 'new' = 새 수반 등록(재임+행정부 한 번에) */
  const [registerFlow, setRegisterFlow] = useState<'select' | 'new'>('select')
  const [newHeadPersonId, setNewHeadPersonId] = useState<string | null>(null)
  const [newHeadPositionDefId, setNewHeadPositionDefId] = useState<string | null>(null)
  const [newHeadStartDate, setNewHeadStartDate] = useState('')
  const [newHeadEndDate, setNewHeadEndDate] = useState('')
  /** 새 수반 등록 시 대수(제 N대). 빈 값이면 미전송, 숫자면 termNumber로 전송. 중간 등록 가능. */
  const [newHeadTermNumber, setNewHeadTermNumber] = useState('')
  const [deletingCabinetId, setDeletingCabinetId] = useState<string | null>(null)

  const { data: cabinets = [], isLoading: loadingCabinets } = useQuery({
    queryKey: ['cabinets-by-country', countryId, historicalCountryId],
    queryFn: () =>
      personCareerApi.getCabinets({
        countryId: countryId || undefined,
        historicalCountryId: historicalCountryId || undefined,
      }),
    enabled: !!countryId || !!historicalCountryId,
  })

  const { data: personsForCountry = [] } = useQuery({
    queryKey: ['persons-by-tenure-country-cabinets', countryId, historicalCountryId],
    queryFn: () =>
      getPersonsByTenureCountry({ countryId, historicalCountryId }),
    enabled: (!!countryId || !!historicalCountryId) && personSelectOpen,
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
  const { data: categoriesForCabinet = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['administration-department-categories'],
    queryFn: () => administrationDepartmentApi.getCategories(),
    enabled: !!(countryId || historicalCountryId),
  })
  const { data: ministriesForCabinet = [], isLoading: loadingMinistriesForCabinet } = useQuery({
    queryKey: ['administration-departments-by-country', effectiveCountryIdForDept],
    queryFn: () =>
      effectiveCountryIdForDept
        ? administrationDepartmentApi.getByCountryId(effectiveCountryIdForDept)
        : Promise.resolve([]),
    enabled: !!effectiveCountryIdForDept,
  })

  const { data: countryTenures = [] } = useQuery({
    queryKey: ['tenures-by-country-for-cabinet', countryId, historicalCountryId],
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
    enabled: (!!countryId || !!historicalCountryId) && registerCabinetModalOpen,
  })

  const { data: allPersons = [] } = useQuery({
    queryKey: ['persons', 'all'],
    queryFn: () => getAllPersons(),
    enabled: registerCabinetModalOpen && registerFlow === 'new',
  })

  const headPositionOptions = (positionDefinitions as any[]).filter((d: any) =>
    HEAD_POSITION_TYPES.has(d.positionType),
  )

  const handleAddMinister = (cabinet: any) => {
    setAddMinisterCabinet(cabinet)
    setPersonSelectOpen(true)
  }

  const handleSelectPerson = (personId: string) => {
    setSelectedPersonIdForAdd(personId)
    setPersonSelectOpen(false)
    setTenurePanelOpen(true)
  }

  const handleCloseTenurePanel = () => {
    setTenurePanelOpen(false)
    setSelectedPersonIdForAdd(null)
    setAddMinisterCabinet(null)
    queryClient.invalidateQueries({ queryKey: ['cabinets-by-country', countryId, historicalCountryId] })
    queryClient.invalidateQueries({ queryKey: ['cabinet-tenures'] })
  }

  const headTenureIdsWithCabinet = new Set((cabinets as any[]).map((c: any) => c.headTenureId))
  const headTenuresForRegister = (countryTenures as any[]).filter(
    (t: any) =>
      (t.positionType === 'HEAD_OF_STATE' || t.positionType === 'HEAD_OF_GOVERNMENT') &&
      !headTenureIdsWithCabinet.has(t.id),
  )

  const handleRegisterCabinet = async (tenure: any) => {
    setRegisterCabinetSubmitting(true)
    try {
      await personCareerApi.createCabinet({ headTenureId: tenure.id })
      toast.success('행정부가 등록되었습니다.')
      setRegisterCabinetModalOpen(false)
      setRegisterFlow('select')
      queryClient.invalidateQueries({ queryKey: ['cabinets-by-country', countryId, historicalCountryId] })
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? '등록에 실패했습니다.'
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
    const def = headPositionOptions.find((d: any) => d.id === newHeadPositionDefId)
    if (!def) {
      toast.error('직위를 선택해주세요.')
      return
    }
    const termNumParsed = newHeadTermNumber.trim() ? parseInt(newHeadTermNumber.trim(), 10) : undefined
    const termNumber = termNumParsed != null && !Number.isNaN(termNumParsed) && termNumParsed >= 1 ? termNumParsed : undefined

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
      queryClient.invalidateQueries({ queryKey: ['cabinets-by-country', countryId, historicalCountryId] })
      queryClient.invalidateQueries({ queryKey: ['tenures-by-country-for-cabinet', countryId, historicalCountryId] })
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? '등록에 실패했습니다.'
      toast.error(msg)
    } finally {
      setRegisterCabinetSubmitting(false)
    }
  }

  const handleDeleteCabinet = async (cabinetId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('이 행정부와 수반 재임, 소속 각료 재임을 모두 삭제합니다. 계속할까요?')) return
    setDeletingCabinetId(cabinetId)
    try {
      await personCareerApi.deleteCabinet(cabinetId)
      toast.success('행정부가 삭제되었습니다.')
      if (selectedCabinetId === cabinetId) setSelectedCabinetId(null)
      queryClient.invalidateQueries({ queryKey: ['cabinets-by-country', countryId, historicalCountryId] })
      queryClient.invalidateQueries({ queryKey: ['tenures-by-country-for-cabinet', countryId, historicalCountryId] })
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? '삭제에 실패했습니다.')
    } finally {
      setDeletingCabinetId(null)
    }
  }

  useEffect(() => {
    if (selectedCabinetId && selectedCabinetSectionRef.current) {
      selectedCabinetSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedCabinetId])

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
          <FiChevronDown size={24} style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
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
              background: 'linear-gradient(145deg, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0.06) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: MAIN,
            }}
          >
            <FiPlus size={28} strokeWidth={2.5} />
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
            등록된 행정부가 없습니다
          </h3>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: '#64748b', lineHeight: 1.5, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
            수반(대통령·수상 등) 재임을 선택해 행정부를 등록하면, 해당 내각의 각료를 관리할 수 있습니다.
          </p>
          <button
            type="button"
            onClick={() => { setRegisterFlow('select'); setRegisterCabinetModalOpen(true) }}
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

  const cardStyle = {
    background: '#fff',
    borderRadius: 16,
    overflow: 'hidden' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    border: '1px solid #e5e7eb',
    minHeight: 160,
  }
  const cardHeaderStyle = {
    padding: '14px 20px',
    fontSize: 11,
    fontWeight: 600,
    color: '#6b7280',
    letterSpacing: '0.05em' as const,
    textTransform: 'uppercase' as const,
    borderBottom: '1px solid #f3f4f6',
    background: '#fafafa',
  }
  const cardContentStyle = {
    flex: 1,
    padding: 20,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* 1. 선택한 정권의 행정부(행정부처) — 카드 클릭 시 위에 표시 */}
      {selectedCabinetId && (
        <section ref={selectedCabinetSectionRef} aria-label="선택한 정권의 행정부">
          {(cabinets as any[]).find((c: any) => c.id === selectedCabinetId) && (
            <>
              <h3
                style={{
                  margin: '0 0 20px',
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#0f172a',
                  letterSpacing: '-0.02em',
                }}
              >
                선택한 정권의 행정부
              </h3>
              <p
                style={{
                  margin: '0 0 24px',
                  fontSize: 14,
                  color: '#64748b',
                  lineHeight: 1.5,
                }}
              >
                중앙부처(카테고리)별로 이 정권의 각료가 표시됩니다. 부처는 행정조직 → 중앙부처 탭에서 등록할 수 있습니다.
              </p>
              {!effectiveCountryIdForDept ? (
                <div
                  style={{
                    padding: 32,
                    background: '#f8fafc',
                    borderRadius: 16,
                    border: '1px solid #e2e8f0',
                    fontSize: 14,
                    color: '#64748b',
                  }}
                >
                  역사적 국가는 중앙부처가 현대 국가 기준으로 등록됩니다. 이 정권의 각료만 목록으로 표시합니다.
                  <ul style={{ margin: '16px 0 0', paddingLeft: 20 }}>
                    {(selectedCabinetMinisters as any[]).map((t: any) => (
                      <li key={t.id} style={{ marginBottom: 6 }}>
                        <strong>{t.positionDefinition?.title ?? t.title ?? '—'}</strong> · {getPersonName(t.person)}
                        <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 8 }}>
                          {formatDate(t.startDate)}–{formatDate(t.endDate)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : loadingCategories || loadingMinistriesForCabinet ? (
                <div
                  style={{
                    padding: 48,
                    background: '#f8fafc',
                    borderRadius: 16,
                    border: '1px solid #e2e8f0',
                    textAlign: 'center',
                    fontSize: 14,
                    color: '#64748b',
                  }}
                >
                  중앙부처 목록을 불러오는 중…
                </div>
              ) : categoriesForCabinet.length === 0 ? (
                <div
                  style={{
                    padding: 32,
                    background: '#f8fafc',
                    borderRadius: 16,
                    border: '1px solid #e2e8f0',
                    fontSize: 14,
                    color: '#64748b',
                  }}
                >
                  부처 카테고리가 없습니다. 행정조직 → 중앙부처 탭에서 카테고리를 추가한 뒤 부처를 등록하면 여기에서 부처별 각료를 볼 수 있습니다.
                  <ul style={{ margin: '16px 0 0', paddingLeft: 20 }}>
                    {(selectedCabinetMinisters as any[]).map((t: any) => (
                      <li key={t.id} style={{ marginBottom: 6 }}>
                        <strong>{t.positionDefinition?.title ?? t.title ?? '—'}</strong> · {getPersonName(t.person)}
                        <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 8 }}>
                          {formatDate(t.startDate)}–{formatDate(t.endDate)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: 20,
                  }}
                >
                  {categoriesForCabinet.map((cat: any) => {
                    const dept = ministriesForCabinet.find(
                      (d: any) => d.categoryId === cat.id,
                    )
                    const deptMinisters = (selectedCabinetMinisters as any[]).filter(
                      (t: any) =>
                        t.positionDefinition?.administrationDepartmentId ===
                        dept?.id,
                    )
                    const selectedCabinet = (cabinets as any[]).find(
                      (cab: any) => cab.id === selectedCabinetId,
                    )
                    return (
                      <div
                        key={cat.id}
                        style={{
                          background: '#fff',
                          borderRadius: 16,
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          border: '1px solid #e5e7eb',
                          minHeight: 160,
                        }}
                      >
                        <div
                          style={{
                            padding: '14px 20px',
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#6b7280',
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            borderBottom: '1px solid #f3f4f6',
                            background: '#fafafa',
                          }}
                        >
                          {cat.name}
                          {cat.nameEn && (
                            <span
                              style={{
                                fontWeight: 500,
                                color: '#94a3b8',
                                textTransform: 'none',
                                letterSpacing: '0',
                                marginLeft: 6,
                              }}
                            >
                              · {cat.nameEn}
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            flex: 1,
                            padding: 20,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                          }}
                        >
                          {dept && (
                            <div
                              style={{
                                fontSize: 16,
                                fontWeight: 700,
                                color: '#0f172a',
                                letterSpacing: '-0.02em',
                              }}
                            >
                              {dept.name}
                            </div>
                          )}
                          {deptMinisters.length === 0 ? (
                            <span
                              style={{
                                fontSize: 13,
                                color: '#94a3b8',
                              }}
                            >
                              {dept
                                ? '이 정권에서 등록된 장관 없음'
                                : '부처 미등록'}
                            </span>
                          ) : (
                            <ul
                              style={{
                                margin: 0,
                                padding: 0,
                                listStyle: 'none',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                              }}
                            >
                              {deptMinisters.map((t: any) => (
                                <li
                                  key={t.id}
                                  style={{
                                    fontSize: 13,
                                    color: '#374151',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    alignItems: 'baseline',
                                    gap: 6,
                                  }}
                                >
                                  <span style={{ fontWeight: 600 }}>
                                    {getPersonName(t.person)}
                                  </span>
                                  <span style={{ color: '#94a3b8' }}>
                                    {t.positionDefinition?.title ?? t.title ?? ''}
                                  </span>
                                  <span
                                    style={{
                                      color: '#94a3b8',
                                      fontSize: 12,
                                    }}
                                  >
                                    {formatDate(t.startDate)}–
                                    {t.endDate
                                      ? formatDate(t.endDate)
                                      : '현재'}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                          <div
                            style={{
                              display: 'flex',
                              gap: 8,
                              marginTop: 'auto',
                              paddingTop: 12,
                              flexWrap: 'wrap',
                            }}
                          >
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
                              <button
                                type="button"
                                onClick={() => handleAddMinister(selectedCabinet)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '8px 14px',
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: MAIN,
                                  background: 'rgba(99, 102, 241, 0.08)',
                                  border: '1px solid rgba(99, 102, 241, 0.25)',
                                  borderRadius: 10,
                                  cursor: 'pointer',
                                }}
                              >
                                <FiPlus size={14} />
                                각료 추가
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {/* 기타: 부처 미연결 각료 */}
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
                    const selectedCabinetForOthers = (cabinets as any[]).find(
                      (cab: any) => cab.id === selectedCabinetId,
                    )
                    return (
                      <div
                        style={{
                          background: '#fff',
                          borderRadius: 16,
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          border: '1px solid #e5e7eb',
                          minHeight: 160,
                        }}
                      >
                        <div
                          style={{
                            padding: '14px 20px',
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#6b7280',
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            borderBottom: '1px solid #f3f4f6',
                            background: '#f8fafc',
                          }}
                        >
                          기타 (부처 미연결)
                        </div>
                        <div
                          style={{
                            flex: 1,
                            padding: 20,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                          }}
                        >
                          {others.length === 0 ? (
                            <span style={{ fontSize: 13, color: '#94a3b8' }}>
                              부처에 연결되지 않은 각료가 여기 표시됩니다.
                            </span>
                          ) : (
                            <ul
                              style={{
                                margin: 0,
                                padding: 0,
                                listStyle: 'none',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                              }}
                            >
                              {others.map((t: any) => (
                                <li
                                  key={t.id}
                                  style={{
                                    fontSize: 13,
                                    color: '#374151',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    alignItems: 'baseline',
                                    gap: 6,
                                  }}
                                >
                                  <span style={{ fontWeight: 600 }}>
                                    {getPersonName(t.person)}
                                  </span>
                                  <span style={{ color: '#94a3b8' }}>
                                    {t.positionDefinition?.title ?? t.title ?? ''}
                                  </span>
                                  <span
                                    style={{
                                      color: '#94a3b8',
                                      fontSize: 12,
                                    }}
                                  >
                                    {formatDate(t.startDate)}–
                                    {t.endDate
                                      ? formatDate(t.endDate)
                                      : '현재'}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {selectedCabinetForOthers && (
                            <div style={{ marginTop: 'auto', paddingTop: 12 }}>
                              <button
                                type="button"
                                onClick={() =>
                                  handleAddMinister(selectedCabinetForOthers)
                                }
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '8px 14px',
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: MAIN,
                                  background: 'rgba(99, 102, 241, 0.08)',
                                  border: '1px solid rgba(99, 102, 241, 0.25)',
                                  borderRadius: 10,
                                  cursor: 'pointer',
                                }}
                              >
                                <FiPlus size={14} />
                                각료 추가
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </>
          )}
        </section>
      )}

      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
        행정부 리스트
      </h3>

      {/* 3. 행정부 리스트 — 선택한 정권의 행정부와 동일 카드 디자인 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 20,
        }}
      >
        {(cabinets as any[]).map((c: any) => {
          const head = c.headTenure
          const personName = head?.person ? getPersonName(head.person) : '이름 없음'
          const posTitle = head?.positionDefinition?.title ?? head?.title ?? c.name ?? '행정부'
          const termNum = head?.termNumber ?? head?.regnalNumber
          const termLabel = termNum != null ? `제${termNum}대` : '정권'
          const start = head?.startDate ? new Date(head.startDate).getFullYear() : ''
          const end = head?.endDate ? new Date(head.endDate).getFullYear() : '현재'
          const rangeLabel = start && end ? `${start}~${end}` : start || '—'
          const isSelected = selectedCabinetId === c.id
          const isDeleting = deletingCabinetId === c.id
          return (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => !isDeleting && setSelectedCabinetId(c.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  if (!isDeleting) setSelectedCabinetId(c.id)
                }
              }}
              style={{
                ...cardStyle,
                borderColor: isSelected ? MAIN : undefined,
                boxShadow: isSelected ? '0 0 0 2px rgba(99, 102, 241, 0.25)' : undefined,
                cursor: isDeleting ? 'wait' : 'pointer',
              }}
            >
              <div style={{ ...cardHeaderStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span>{termLabel} · {rangeLabel}</span>
                <button
                  type="button"
                  title="행정부 삭제"
                  disabled={isDeleting}
                  onClick={(e) => handleDeleteCabinet(c.id, e)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    padding: 0,
                    border: 'none',
                    borderRadius: 8,
                    background: 'transparent',
                    color: '#94a3b8',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    opacity: isDeleting ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isDeleting) {
                      e.currentTarget.style.background = '#fef2f2'
                      e.currentTarget.style.color = '#dc2626'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#94a3b8'
                  }}
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
              <div style={cardContentStyle}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#0f172a',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.4,
                  }}
                >
                  {personName} · {posTitle}
                </div>
              </div>
            </div>
          )
        })}
        {/* 행정부 등록 카드 — 클릭 시 바로 등록 모달 */}
        <button
          type="button"
          onClick={() => { setRegisterFlow('select'); setRegisterCabinetModalOpen(true) }}
          style={{
            ...cardStyle,
            minHeight: 160,
            cursor: 'pointer',
            borderStyle: 'dashed',
            borderColor: '#cbd5e1',
            background: '#f8fafc',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          <div style={{ ...cardHeaderStyle, background: 'transparent' }}>추가</div>
          <div style={{ ...cardContentStyle, flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <FiPlus size={32} style={{ color: '#94a3b8' }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}>행정부 등록</span>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>클릭하여 새 정권 등록</span>
          </div>
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

      {personSelectOpen && (
        <ModalOverlay onClick={() => setPersonSelectOpen(false)}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
              각료로 등록할 인물 선택
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
              이 국가에 재임 기록이 있는 인물만 표시됩니다.
            </p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 320, overflowY: 'auto' }}>
              {(personsForCountry as any[]).map((p: any) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectPerson(p.id)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      textAlign: 'left',
                      border: 'none',
                      borderBottom: '1px solid #f1f5f9',
                      background: 'none',
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 500,
                      color: '#0f172a',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                  >
                    {getPersonName(p)}
                  </button>
                </li>
              ))}
            </ul>
            {(personsForCountry as any[]).length === 0 && (
              <p style={{ fontSize: 14, color: '#64748b', marginTop: 16, marginBottom: 0 }}>
                이 국가에 재임 기록이 있는 인물이 없습니다. 인물 상세에서 재임을 먼저 등록하세요.
              </p>
            )}
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setPersonSelectOpen(false)}
                style={{
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#64748b',
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
            </div>
          </ModalCard>
        </ModalOverlay>
      )}

      {selectedPersonIdForAdd && addMinisterCabinet && (
        <TenureRegisterPanel
          personId={selectedPersonIdForAdd}
          open={tenurePanelOpen}
          onClose={handleCloseTenurePanel}
          onSuccess={handleCloseTenurePanel}
          initialCountryId={addMinisterCabinet.countryId ?? undefined}
          initialHistoricalCountryId={addMinisterCabinet.historicalCountryId ?? null}
          initialCabinetId={addMinisterCabinet.id}
        />
      )}
    </div>
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
    <CabinetModalOverlay role="dialog" aria-modal="true" aria-labelledby="cabinet-modal-title" onClick={(e) => e.target === e.currentTarget && close()}>
      <CabinetModalBox onClick={(e) => e.stopPropagation()}>
        <CabinetModalHeader>
          <CabinetModalTitle id="cabinet-modal-title">행정부 등록</CabinetModalTitle>
          <CabinetCloseBtn type="button" onClick={close} aria-label="닫기">
            <FiX size={22} strokeWidth={2} />
          </CabinetCloseBtn>
        </CabinetModalHeader>
        <CabinetModalBody>
          <CabinetStepTabs>
            <CabinetStepTab type="button" $active={registerFlow === 'select'} onClick={() => setRegisterFlow('select')}>
              기존 수반 선택
            </CabinetStepTab>
            <CabinetStepTab type="button" $active={registerFlow === 'new'} onClick={() => setRegisterFlow('new')}>
              새 수반 등록
            </CabinetStepTab>
          </CabinetStepTabs>

          {registerFlow === 'select' ? (
            <>
              <CabinetFormDesc>
                등록된 수반 재임을 선택하면 해당 재임으로 행정부가 생성됩니다.
              </CabinetFormDesc>
              {headTenuresForRegister.length === 0 ? (
                <CabinetEmptyHint>
                  등록된 수반 재임이 없습니다. <strong>새 수반 등록</strong> 탭에서 등록하세요.
                </CabinetEmptyHint>
              ) : (
                <>
                  <CabinetSearchWrap>
                    <CabinetSearchIcon><FiSearch size={16} /></CabinetSearchIcon>
                    <CabinetInput
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
                        <CabinetEmptyHint style={{ margin: 0 }}>
                          {headTenureFilter.trim() ? '검색 결과가 없습니다.' : '목록이 비어 있습니다.'}
                        </CabinetEmptyHint>
                      </li>
                    ) : (
                      filteredHeadTenures.map((t: any) => {
                        const termNum = t.termNumber ?? t.regnalNumber
                        const termLabel = termNum != null ? `제${termNum}대 ` : ''
                        const positionTitle = t.positionDefinition?.title ?? t.title ?? '수반'
                        return (
                          <li key={t.id}>
                            <CabinetListItemBtn
                              type="button"
                              disabled={registerCabinetSubmitting}
                              onClick={() => handleRegisterCabinet(t)}
                            >
                              <span style={{ display: 'block', fontWeight: 600 }}>
                                {getPersonName(t.person)} · {termLabel}{positionTitle}
                              </span>
                              <span style={{ fontSize: 12, color: '#64748b', marginTop: 4, display: 'block' }}>
                                {formatDate(t.startDate)} ~ {t.endDate ? formatDate(t.endDate) : '현재'}
                              </span>
                            </CabinetListItemBtn>
                          </li>
                        )
                      })
                    )}
                  </CabinetList>
                </>
              )}
              <CabinetActions>
                <CabinetSecondaryBtn type="button" onClick={close}>취소</CabinetSecondaryBtn>
              </CabinetActions>
            </>
          ) : (
            <>
              <CabinetFormDesc>
                수반 인물·직위·기간을 입력하면 재임과 행정부가 함께 등록됩니다.
              </CabinetFormDesc>
              <CabinetField>
                <CabinetLabel>대수 (선택)</CabinetLabel>
                <CabinetInput
                  type="number"
                  min={1}
                  placeholder="제 N대 (비우면 미지정, 중간 등록 시 숫자 입력)"
                  value={newHeadTermNumber}
                  onChange={(e) => setNewHeadTermNumber(e.target.value)}
                  aria-label="대수"
                />
              </CabinetField>
              <CabinetField>
                <CabinetLabel>인물 <span style={{ color: '#dc2626' }}>*</span></CabinetLabel>
                <CabinetSelectBtn
                  type="button"
                  onClick={() => setPersonSelectOpen(true)}
                  aria-label="수반 인물 선택"
                >
                  <span style={{ color: newHeadPersonId ? '#111' : '#64748b' }}>
                    {newHeadPersonId
                      ? getPersonName(allPersons.find((p: any) => p.id === newHeadPersonId))
                      : '인물 선택'}
                  </span>
                  <FiChevronDown size={18} color="#64748b" />
                </CabinetSelectBtn>
              </CabinetField>
              <CabinetField>
                <CabinetLabel>직위 (수반) <span style={{ color: '#dc2626' }}>*</span></CabinetLabel>
                <CabinetSelect
                  value={newHeadPositionDefId ?? ''}
                  onChange={(e) => setNewHeadPositionDefId(e.target.value || null)}
                  aria-label="직위 선택"
                >
                  <option value="">선택</option>
                  {headPositionOptions.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </CabinetSelect>
              </CabinetField>
              <CabinetField>
                <CabinetLabel>취임일 <span style={{ color: '#dc2626' }}>*</span> / 퇴임일</CabinetLabel>
                <CabinetDateRow>
                  <CabinetSelectBtn
                    type="button"
                    onClick={() => setStartDatePickerOpen(true)}
                    aria-label="취임일 선택"
                  >
                    <span style={{ color: newHeadStartDate ? '#111' : '#64748b' }}>
                      {newHeadStartDate ? formatDate(newHeadStartDate) : '취임일 선택'}
                    </span>
                    <FiChevronDown size={18} color="#64748b" />
                  </CabinetSelectBtn>
                  <CabinetSelectBtn
                    type="button"
                    onClick={() => setEndDatePickerOpen(true)}
                    aria-label="퇴임일 선택"
                  >
                    <span style={{ color: newHeadEndDate ? '#111' : '#64748b' }}>
                      {newHeadEndDate ? formatDate(newHeadEndDate) : '퇴임일 선택'}
                    </span>
                    <FiChevronDown size={18} color="#64748b" />
                  </CabinetSelectBtn>
                </CabinetDateRow>
              </CabinetField>
              <CabinetActions>
                <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                  <CabinetSecondaryBtn type="button" onClick={close}>취소</CabinetSecondaryBtn>
                  <CabinetPrimaryBtn
                    type="button"
                    disabled={registerCabinetSubmitting || !newHeadPersonId || !newHeadPositionDefId || !newHeadStartDate.trim()}
                    onClick={() => handleRegisterNewHeadAndCabinet()}
                  >
                    {registerCabinetSubmitting ? '등록 중…' : '등록'}
                  </CabinetPrimaryBtn>
                </div>
              </CabinetActions>
            </>
          )}
        </CabinetModalBody>
      </CabinetModalBox>
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

function ModalCard({ children, onClick }: { children: React.ReactNode; onClick: (e: React.MouseEvent) => void }) {
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
