import React, { useState } from 'react'
import { FiPlus, FiCalendar, FiChevronRight, FiChevronDown, FiArrowLeft, FiSave, FiTrash2, FiInfo } from 'react-icons/fi'
import styled, { css } from 'styled-components'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'

import { personCareerApi } from '@/shared/api/person-career'
import { getAllPersons } from '@/shared/api/persons'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import {
  BackButton as SharedBackButton,
  DateFieldsRow,
  DateFieldBtn,
  FieldControl,
  FieldHint,
  FieldLabel,
  FieldRow as SharedFieldRow,
  FormCardWrapper,
  FormHeader,
  FormHeaderTitle,
  FormRows,
  Input as RegisterInput,
  Required,
  SubmitButton as SharedSubmitButton,
} from '@/shared/ui/register-form-layout'
import { PersonSelectField } from '@/shared/ui/form-fields/person-select-field'
import { SelectModal, type SelectOption } from '@/shared/ui/select-modal/select-modal'
import {
  DEFAULT_COLLAPSED_POSITION_GROUPS,
  groupHeadsPositionOptions,
} from '@/shared/ui/tenure-register-panel/group-position-options'
import { GLOBAL_POSITION_DEFINITION_IDS } from '@/features/event-list/lib'

/** 전역 수반 등록 시 표시할 관직 유형 (수반 관련 전체 — 교황, 국왕, 대통령 등) */
const HEADS_POSITION_TYPES = new Set([
  'HEAD_OF_STATE',
  'HEAD_OF_GOVERNMENT',
  // 부통령은 정의상 DEPUTY_HEAD_OF_STATE — 이 집합에 없으면 재분류 후 피커에서 통째로 사라진다
  'DEPUTY_HEAD_OF_STATE',
  'REGENT',
  'HEIR_APPARENT',
  'ROYAL_NOBLE_TITLE',
])

const OTHER_POSITION_VALUE = 'OTHER'

/**
 * 레거시 notes 인코딩("왕명: X") 분리 — 저장 시 '왕명:' 줄만 갈아끼우고 다른 지면
 * (재위 등록 패널 '비고')에서 적은 나머지 서술을 보존한다.
 * tenure-register-panel의 splitLegacyRegnalNote와 동일 로직(파일 로컬이라 import 불가).
 */
const LEGACY_REGNAL_NOTE_RE = /^[ \t]*왕명[ \t]*:[ \t]*\S.*$/m

function splitLegacyRegnalNote(raw: string): { regnalLine: string; rest: string } {
  const matched = raw.match(LEGACY_REGNAL_NOTE_RE)
  if (!matched || matched.index == null) return { regnalLine: '', rest: raw }
  const rest = (raw.slice(0, matched.index) + raw.slice(matched.index + matched[0].length))
    .replace(/\n{2,}/g, '\n')
    .replace(/^\n+|\n+$/g, '')
  return { regnalLine: matched[0].trim(), rest }
}

const MAIN = '#6366f1'

const CheckboxLabelRow = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  user-select: none;
  input { width: 18px; height: 18px; accent-color: #6366f1; }
`

const EventsPageCheckWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const Wrapper = styled(motion.div)<{ $embedded?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${(p) => (p.$embedded ? 0 : 32)}px;
  padding: ${(p) => (p.$embedded ? 0 : '36px 32px 48px')};
  background: ${({ theme }) => theme.colors.background.primary};
  ${(p) =>
    p.$embedded
      ? `
    flex: 1;
    min-height: 0;
  `
      : 'min-height: calc(100vh - 200px);'}
  position: relative;
`

const Header = styled.header`
  padding-bottom: 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
`

const HeaderTitle = styled.h2`
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.04em;
  line-height: 1.25;
`

const HeaderDesc = styled.p`
  margin: 10px 0 0;
  font-size: 15px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.55;
  max-width: 540px;
  font-weight: 500;
`

const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.18s ease;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          color: ${theme.colors.text.primary};
          &:hover {
            background: rgba(99, 106, 242, 0.15);
            border-color: rgba(99, 106, 242, 0.4);
            color: #ffffff;
          }
        `
      : css`
          border: 1px solid #e5e7eb;
          background: #fff;
          color: #374151;
          &:hover {
            border-color: #c7d2fe;
            background: rgba(99, 102, 241, 0.04);
          }
        `}
`

const KpiCard = styled.div`
  display: flex;
  align-items: center;
  gap: 28px;
  flex-wrap: wrap;
  padding: 20px 28px;
  border-radius: 16px;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(99, 106, 242, 0.18);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        `
      : css`
          background: ${theme.colors.background.primary};
          border: 1px solid #e5e7eb;
        `}
`

const KpiLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  letter-spacing: 0.04em;
  text-transform: uppercase;
`

const KpiValue = styled.span`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.03em;
`

const SectionHeading = styled.div`
  margin-bottom: 28px;
`

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
`

const SectionDesc = styled.p`
  margin: 6px 0 0;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 500;
`

const CardGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const TenantCard = styled.button`
  text-align: left;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  padding: 16px 20px;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          &:hover {
            border-color: rgba(99, 106, 242, 0.4);
            background: rgba(99, 106, 242, 0.08);
            box-shadow: 0 2px 12px rgba(99, 106, 242, 0.12);
          }
        `
      : css`
          background: ${theme.colors.background.primary};
          border: 1px solid #e8ecf1;
          &:hover {
            border-color: #c7d2fe;
            background: #fafbff;
            box-shadow: 0 2px 6px rgba(99, 102, 241, 0.06);
          }
        `}
`

const CardPersonName = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
  line-height: 1.35;
  flex: 1;
  min-width: 0;
`

const CardBadge = styled.span`
  display: inline-flex;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  flex-shrink: 0;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(99, 106, 242, 0.18);
          color: #a5b4fc;
        `
      : css`
          background: rgba(99, 102, 241, 0.1);
          color: ${MAIN};
        `}
`

const CardDate = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
`

const EmptyState = styled(motion.div)`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 40px 72px;
  border-radius: 20px;
  overflow: hidden;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        `
      : css`
          background: ${theme.colors.background.primary};
          border: 1px solid #f1f5f9;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        `}
`

const EmptyGlow = styled.div`
  position: absolute;
  left: 50%;
  top: 20%;
  width: 280px;
  height: 280px;
  margin-left: -140px;
  margin-top: -140px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.06) 0%, transparent 70%);
  filter: blur(32px);
  pointer-events: none;
`

const EmptyTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
  position: relative;
  z-index: 1;
`

const EmptyDesc = styled.p`
  margin: 10px 0 0;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 320px;
  line-height: 1.55;
  font-weight: 500;
  text-align: center;
  position: relative;
  z-index: 1;
`

const LoadingState = styled.div`
  padding: 56px;
  text-align: center;
  font-size: 14px;
  border-radius: 16px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f9fafb'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
`

/** 폼 본문: 100% 높이 채우고 내용 초과 시에만 스크롤 */
const FormBodyScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 28px 32px 32px;
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f1f5f9'};
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#cbd5e1'};
    border-radius: 4px;
  }
`

/** 인물 선등록 안내 — 부드러운 인포 카드 스타일 */
const FormPersonHint = styled.div`
  margin-bottom: 24px;
  padding: 16px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.6;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  .hint-icon {
    color: #6366f1;
    flex-shrink: 0;
    margin-top: 2px;
  }

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(99, 106, 242, 0.08);
          border: 1px solid rgba(99, 106, 242, 0.2);
          color: ${theme.colors.text.secondary};
          strong { color: ${theme.colors.text.primary}; font-weight: 600; }
        `
      : css`
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border: 1px solid #e2e8f0;
          color: #475569;
          strong { color: #334155; font-weight: 600; }
        `}
`

const SelectTriggerButton = styled.button<{ $hasValue?: boolean }>`
  width: 100%;
  max-width: 320px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  font-size: 14px;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s, background 0.2s;

  ${(p) =>
    p.theme.mode === 'dark'
      ? css`
          color: ${p.$hasValue ? p.theme.colors.text.primary : 'rgba(255,255,255,0.3)'};
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          &:hover { border-color: rgba(99, 106, 242, 0.5); }
        `
      : css`
          color: ${p.$hasValue ? '#111827' : '#9ca3af'};
          background: #fff;
          border: 1px solid #e5e7eb;
          &:hover { border-color: #c7d2fe; }
        `}
`

const FormActions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
`

const DeleteButton = styled.button`
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.2s, border-color 0.2s;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(220, 38, 38, 0.12);
          color: #f87171;
          border: 1px solid rgba(220, 38, 38, 0.25);
          &:hover { background: rgba(220, 38, 38, 0.2); border-color: rgba(220, 38, 38, 0.4); }
        `
      : css`
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
          &:hover { background: #fee2e2; border-color: #fca5a5; }
        `}
`

const CountryHint = styled.p`
  margin: 0 0 0;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

interface GlobalHeadsSectionProps {
  /** 상위 컨테이너에 임베드 시 헤더(타이틀·설명) 숨김 */
  embedded?: boolean
}

export function GlobalHeadsSection({ embedded }: GlobalHeadsSectionProps) {
  const queryClient = useQueryClient()
  const [view, setView] = useState<'list' | 'form'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingRecordKind, setEditingRecordKind] = useState<'TENURE' | 'SOVEREIGN_REIGN' | null>(
    null,
  )
  const [personSelectModalOpen, setPersonSelectModalOpen] = useState(false)
  const [positionModalOpen, setPositionModalOpen] = useState(false)
  const [startDateModalOpen, setStartDateModalOpen] = useState(false)
  const [endDateModalOpen, setEndDateModalOpen] = useState(false)
  const [selectedPersonId, setSelectedPersonId] = useState('')
  const [selectedPositionDefId, setSelectedPositionDefId] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [regnalNumber, setRegnalNumber] = useState('') // 대수/재위번호 통합 (제4대·루이 14세·266대 교황 등)
  const [regnalName, setRegnalName] = useState('')
  const [title, setTitle] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [showOnEventsPage, setShowOnEventsPage] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: tenures = [], isLoading } = useQuery({
    queryKey: ['global-tenures'],
    queryFn: () => personCareerApi.getGlobalTenures(),
  })
  const { data: allPersons = [] } = useQuery({
    queryKey: ['persons-for-global-heads'],
    queryFn: () => getAllPersons(),
  })
  const { data: positionDefs = [] } = useQuery({
    queryKey: ['position-definitions'],
    queryFn: () => personCareerApi.getPositionDefinitions(),
  })

  // 수반 관련 관직 전체 (교황, 국왕, 대통령 등) — 전역 직책만 제한하지 않음
  const headsPositionDefs = (positionDefs as any[]).filter((d) =>
    HEADS_POSITION_TYPES.has(d.positionType),
  )
  // 전역 직책(교황)을 상단에, 나머지를 순서대로 + 기타
  const sortedDefs = [...headsPositionDefs].sort((a, b) => {
    const aGlobal = GLOBAL_POSITION_DEFINITION_IDS.includes(a.id) ? 0 : 1
    const bGlobal = GLOBAL_POSITION_DEFINITION_IDS.includes(b.id) ? 0 : 1
    if (aGlobal !== bGlobal) return aGlobal - bGlobal
    return (a.rank ?? 999) - (b.rank ?? 999)
  })
  // 작위(공작·백작 등)는 수반 집합에 들어 있지만 공직 임기가 아니므로 접히는 별도 그룹으로 내린다.
  // 정렬(전역 직책 우선 → rank)은 그대로 보존되고, 그룹 안에서만 유지된다.
  const positionOptions: SelectOption<string>[] = [
    ...groupHeadsPositionOptions(
      sortedDefs,
      (def) => `${def.title}${def.titleEn ? ` (${def.titleEn})` : ''}`,
    ),
    { value: OTHER_POSITION_VALUE, label: '기타 (직접 입력)' },
  ]
  const selectedDef = selectedPositionDefId
    ? headsPositionDefs.find((d) => d.id === selectedPositionDefId)
    : null
  const isOtherPosition = selectedPositionDefId === null || selectedPositionDefId === OTHER_POSITION_VALUE
  const isMonarchPosition =
    selectedDef?.positionType === 'HEAD_OF_STATE' ||
    selectedDef?.positionType === 'ROYAL_NOBLE_TITLE' ||
    isOtherPosition
  const positionTitleLabel = isOtherPosition
    ? (title.trim() ? `기타: ${title.trim()}` : '기타 (직접 입력)')
    : selectedDef?.title ?? '직책 선택'
  const selectedPerson = (allPersons as any[]).find((p) => p.id === selectedPersonId)

  const resetForm = () => {
    setEditingId(null)
    setEditingRecordKind(null)
    setSelectedPersonId('')
    setSelectedPositionDefId(null)
    setStartDate('')
    setEndDate('')
    setRegnalNumber('')
    setRegnalName('')
    setTitle('')
    setTitleEn('')
    setShowOnEventsPage(true)
  }

  const handleAdd = () => {
    resetForm()
    setView('form')
  }

  /** notes에서 "왕명: xxx" 추출 */
  const getRegnalNameFromNotes = (notes: string | null | undefined) => {
    if (!notes?.trim()) return ''
    const m = notes.match(/왕명\s*:\s*(.+?)(?:\n|$)/i) || notes.match(/왕명\s*:\s*(.+)/i)
    return m ? m[1].trim() : ''
  }

  const handlePositionSelect = (v: string) => {
    if (v === OTHER_POSITION_VALUE || !v) {
      setSelectedPositionDefId(null)
      setTitle('')
      setTitleEn('')
    } else {
      const def = headsPositionDefs.find((d) => d.id === v)
      setSelectedPositionDefId(def?.id ?? null)
      if (def) {
        setTitle(def.title ?? '')
        setTitleEn(def.titleEn ?? '')
      }
    }
    setPositionModalOpen(false)
  }

  const handleEdit = (t: any) => {
    setEditingId(t.id)
    setEditingRecordKind(t.recordKind === 'SOVEREIGN_REIGN' ? 'SOVEREIGN_REIGN' : 'TENURE')
    setSelectedPersonId(t.personId)
    const defId = t.positionDefinitionId ?? t.positionDefinition?.id
    if (defId) {
      setSelectedPositionDefId(defId)
      setTitle(t.title ?? '')
      setTitleEn(t.titleEn ?? '')
    } else {
      setSelectedPositionDefId(null)
      setTitle(t.title ?? '')
      setTitleEn(t.titleEn ?? t.position?.titleEn ?? '')
    }
    setStartDate(t.startDate ? new Date(t.startDate).toISOString().slice(0, 10) : '')
    setEndDate(t.endDate ? new Date(t.endDate).toISOString().slice(0, 10) : '')
    setRegnalNumber(
      t.regnalNumber != null ? String(t.regnalNumber) : t.termNumber != null ? String(t.termNumber) : ''
    )
    setRegnalName(getRegnalNameFromNotes(t.notes))
    setShowOnEventsPage(t.showPositionInfo !== false)
    setView('form')
  }

  const handleBack = () => {
    resetForm()
    setView('list')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPersonId || !startDate) {
      notify.error('인물, 취임일을 입력해주세요.')
      return
    }
    if (!isOtherPosition && !selectedPositionDefId) {
      notify.error('직책을 선택해주세요.')
      return
    }
    if (isOtherPosition && !title.trim()) {
      notify.error('기타 선택 시 직책명을 입력해주세요.')
      return
    }
    if (headsPositionDefs.length === 0) {
      notify.error('관직 정의가 등록되어 있지 않습니다. 시드를 실행한 뒤 다시 시도해 주세요.')
      return
    }
    setIsSubmitting(true)
    try {
      const def = headsPositionDefs.find((d) => d.id === selectedPositionDefId)
      const regnalNameTrimmed = regnalName.trim()
      const editingRow = editingId
        ? (tenures.find(
            (row: { id?: string; notes?: string | null }) => row.id === editingId,
          ) ?? null)
        : null
      // 수정 시 기존 notes의 '왕명:' 줄만 갈아끼우고 나머지 서술은 보존
      const { rest: preservedNoteRest } = splitLegacyRegnalNote(
        typeof editingRow?.notes === 'string' ? editingRow.notes : ''
      )
      const composedNotes = [
        regnalNameTrimmed ? `왕명: ${regnalNameTrimmed}` : null,
        preservedNoteRest || null,
      ]
        .filter(Boolean)
        .join('\n')
      const notesValue = composedNotes || undefined
      const payload = {
        personId: selectedPersonId,
        title: isOtherPosition ? (title.trim() || '전역') : (def?.title ?? '전역'),
        titleEn: isOtherPosition ? titleEn.trim() || undefined : def?.titleEn,
        positionType: def?.positionType ?? 'HEAD_OF_STATE',
        positionDefinitionId: isOtherPosition ? undefined : selectedPositionDefId,
        startDate: startDate + 'T00:00:00.000Z',
        endDate: endDate ? endDate + 'T23:59:59.999Z' : undefined,
        termNumber: regnalNumber.trim() ? parseInt(regnalNumber, 10) || undefined : undefined,
        regnalNumber: regnalNumber.trim() ? parseInt(regnalNumber, 10) || undefined : undefined,
        notes: notesValue,
        showPositionInfo: showOnEventsPage,
      }
      if (editingId) {
        if (editingRecordKind === 'SOVEREIGN_REIGN') {
          await personCareerApi.updateSovereignReign(editingId, {
            personId: selectedPersonId,
            positionDefinitionId: isOtherPosition ? undefined : selectedPositionDefId ?? undefined,
            startDate: startDate + 'T00:00:00.000Z',
            endDate: endDate ? endDate + 'T23:59:59.999Z' : undefined,
            termNumber: regnalNumber.trim() ? parseInt(regnalNumber, 10) || undefined : undefined,
            regnalNumber: regnalNumber.trim() ? parseInt(regnalNumber, 10) || undefined : undefined,
            // 수정 계약: null=해제 — 왕명·기존 서술이 모두 비면 notes를 비운다
            notes: composedNotes || null,
            regnalName: regnalNameTrimmed || null,
            showPositionInfo: showOnEventsPage,
          })
          notify.success('수정되었습니다.')
        } else {
          await personCareerApi.updateGovernmentPositionTenure(editingId, {
            ...payload,
            notes: composedNotes || null,
          })
          notify.success('수정되었습니다.')
        }
      } else {
        await personCareerApi.addGovernmentPositionTenure(payload)
        notify.success('등록되었습니다.')
      }
      queryClient.invalidateQueries({ queryKey: ['global-tenures'] })
      handleBack()
    } catch (err: any) {
      notify.error(err?.message || '저장에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!editingId) return
    if (
      !(await confirm({
        title: '삭제 확인',
        message: '이 전역 수반 기록을 삭제하시겠습니까?',
        danger: true,
      }))
    )
      return
    try {
      if (editingRecordKind === 'SOVEREIGN_REIGN') {
        await personCareerApi.deleteSovereignReign(editingId)
      } else {
        await personCareerApi.deleteGovernmentPositionTenure(editingId)
      }
      notify.success('삭제되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['global-tenures'] })
      handleBack()
    } catch (err: any) {
      notify.error(err?.message || '삭제에 실패했습니다.')
    }
  }

  const getPersonName = (p: any) =>
    p
      ? getPersonDisplayName({
          name: p.name || '',
          surname: p.surname ?? '',
          middleName: p.middleName ?? '',
          nameDisplayOrder: p.nameDisplayOrder ?? null,
          country: p.country ?? null,
        })
      : '—'

  const formatDate = (d: string) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  /** 사건 등록 폼과 동일한 날짜 표시 (취임/퇴임일 버튼용) */
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr || !dateStr.trim()) return ''
    const d = dateStr.trim()
    const match = d.match(/^(-?\d{4})-(\d{1,2})-(\d{1,2})/)
    if (!match) return d
    const [, y, m, day] = match
    const year = parseInt(y!, 10)
    const prefix = year < 0 ? `BC ${Math.abs(year)}` : `${year}년`
    const month = parseInt(m!, 10)
    const date = parseInt(day!, 10)
    return `${prefix} ${month}월 ${date}일`
  }

  if (view === 'form') {
    return (
      <Wrapper
        $embedded={embedded}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {!embedded && (
          <Header>
            <div>
              <HeaderTitle>전역 수반 (교황 등)</HeaderTitle>
              <HeaderDesc>
                등록된 전역 수반을 확인할 수 있습니다. 아래에서 새 전역 수반을 등록하거나 목록에서 수정·삭제할 수 있습니다.
              </HeaderDesc>
            </div>
          </Header>
        )}
        <FormCardWrapper style={embedded ? { flex: 1, minHeight: 0 } : undefined}>
          <form
            onSubmit={handleSubmit}
            style={
              embedded
                ? { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }
                : undefined
            }
          >
            <FormHeader style={embedded ? { flexShrink: 0 } : undefined}>
              <SharedBackButton type="button" onClick={handleBack}>
                <FiArrowLeft size={18} />
                목록으로
              </SharedBackButton>
              <FormHeaderTitle>
                {editingId ? '전역 수반 수정' : '전역 수반 등록'}
              </FormHeaderTitle>
              <SharedSubmitButton
                type="submit"
                disabled={
                  isSubmitting ||
                  !selectedPersonId ||
                  !startDate ||
                  (isOtherPosition ? !title.trim() : !selectedPositionDefId)
                }
              >
                <FiSave size={16} />
                {isSubmitting ? '저장 중…' : '저장'}
              </SharedSubmitButton>
            </FormHeader>
            <FormBodyScroll>
              <FormPersonHint>
                <FiInfo size={18} className="hint-icon" />
                <span>
                  전역 수반을 등록하려면 먼저 해당 인물을 등록해야 합니다. 인물이 없다면 상단 <strong>+</strong> 버튼에서 <strong>인물 등록</strong>을 선택해 추가하세요.
                </span>
              </FormPersonHint>
              <FormRows>
                  <PersonSelectField
                    label="인물"
                    required
                    hint="재임 기록에 연결할 인물을 선택하세요."
                    value={selectedPersonId}
                    selectedPerson={selectedPerson}
                    persons={allPersons as any[]}
                    isModalOpen={personSelectModalOpen}
                    onModalOpenChange={setPersonSelectModalOpen}
                    onSelect={setSelectedPersonId}
                    placeholder="인물 선택"
                  />
                  <SharedFieldRow>
                    <FieldLabel>직책 <Required /></FieldLabel>
                    <FieldControl>
                      <SelectTriggerButton
                        type="button"
                        onClick={() => setPositionModalOpen(true)}
                        $hasValue={!!selectedPositionDefId || !!title.trim()}
                      >
                        <span>{positionTitleLabel}</span>
                        <FiChevronRight size={18} />
                      </SelectTriggerButton>
                    </FieldControl>
                  </SharedFieldRow>
                  {isOtherPosition && (
                    <>
                      <SharedFieldRow>
                        <FieldLabel>직책명 (직접 입력)</FieldLabel>
                        <FieldControl>
                          <RegisterInput
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="예: 칼리프, 최고지도자"
                          />
                        </FieldControl>
                      </SharedFieldRow>
                      <SharedFieldRow>
                        <FieldLabel>직책명 (영문)</FieldLabel>
                        <FieldControl>
                          <RegisterInput
                            value={titleEn}
                            onChange={(e) => setTitleEn(e.target.value)}
                            placeholder="예: Caliph, Supreme Leader"
                          />
                        </FieldControl>
                      </SharedFieldRow>
                    </>
                  )}
                  <SharedFieldRow>
                    <FieldLabel>취임일·퇴임일 <Required /></FieldLabel>
                    <FieldControl $variant="datePair">
                      <DateFieldsRow>
                        <DateFieldBtn
                          type="button"
                          onClick={() => setStartDateModalOpen(true)}
                          $hasValue={!!startDate}
                        >
                          <FiCalendar size={18} />
                          <span>{startDate ? formatDateDisplay(startDate + (startDate.startsWith('-') ? '' : 'T00:00:00Z')) : '취임일'}</span>
                          <FiChevronDown size={16} />
                        </DateFieldBtn>
                        <DateFieldBtn
                          type="button"
                          onClick={() => setEndDateModalOpen(true)}
                          $hasValue={!!endDate}
                        >
                          <FiCalendar size={18} />
                          <span>{endDate ? formatDateDisplay(endDate + (endDate.startsWith('-') ? '' : 'T00:00:00Z')) : '퇴임일'}</span>
                          <FiChevronDown size={16} />
                        </DateFieldBtn>
                      </DateFieldsRow>
                    </FieldControl>
                  </SharedFieldRow>
                  {isMonarchPosition && (
                    <>
                      <SharedFieldRow>
                        <FieldLabel>왕명</FieldLabel>
                        <FieldControl>
                          <RegisterInput
                            value={regnalName}
                            onChange={(e) => setRegnalName(e.target.value)}
                            placeholder="예: 프란치스코, 세종, 루이 14세, 강희"
                          />
                          <FieldHint>선출/즉위 시 사용한 이름 (교황명, 왕호, 묘호 등)</FieldHint>
                        </FieldControl>
                      </SharedFieldRow>
                      <SharedFieldRow>
                        <FieldLabel>대수/재위번호</FieldLabel>
                        <FieldControl>
                          <RegisterInput
                            type="number"
                            min={1}
                            value={regnalNumber}
                            onChange={(e) => setRegnalNumber(e.target.value)}
                            placeholder="예: 4 (세종), 14 (루이 14세), 266 (프란치스코)"
                          />
                          <FieldHint>
                            역대 순번. 동아시아(제4대)·서양 군주(14세)·교황(266대) 등 숫자만 입력
                          </FieldHint>
                        </FieldControl>
                      </SharedFieldRow>
                    </>
                  )}
                  <SharedFieldRow>
                    <FieldLabel>사건 페이지 노출</FieldLabel>
                    <FieldControl>
                      <EventsPageCheckWrap>
                        <CheckboxLabelRow>
                          <input
                            type="checkbox"
                            id="global-heads-show-on-events"
                            checked={showOnEventsPage}
                            onChange={(e) => setShowOnEventsPage(e.target.checked)}
                          />
                          <label htmlFor="global-heads-show-on-events">연대표·사건 목록에 표시</label>
                        </CheckboxLabelRow>
                        <FieldHint>역대 수반 토글 시 목록에 포함됩니다.</FieldHint>
                      </EventsPageCheckWrap>
                    </FieldControl>
                  </SharedFieldRow>
              </FormRows>
              {editingId && (
                <FormActions>
                  <DeleteButton type="button" onClick={handleDelete}>
                    <FiTrash2 size={16} />
                    삭제
                  </DeleteButton>
                </FormActions>
              )}
            </FormBodyScroll>
          </form>
          <SelectModal
            isOpen={positionModalOpen}
          onClose={() => setPositionModalOpen(false)}
          title="직책 선택"
          options={positionOptions}
          collapsedGroups={DEFAULT_COLLAPSED_POSITION_GROUPS}
          selectedValue={selectedPositionDefId ?? OTHER_POSITION_VALUE}
          onSelect={handlePositionSelect}
        />
        <DatePickerModal
          isOpen={startDateModalOpen}
          onClose={() => setStartDateModalOpen(false)}
          onSelect={(d) => {
            setStartDate(d)
            setStartDateModalOpen(false)
          }}
          title="취임일 선택"
          initialDate={startDate ? (startDate.startsWith('-') ? startDate : startDate + 'T00:00:00Z') : undefined}
        />
        <DatePickerModal
          isOpen={endDateModalOpen}
          onClose={() => setEndDateModalOpen(false)}
          onSelect={(d) => {
            setEndDate(d)
            setEndDateModalOpen(false)
          }}
          title="퇴임일 선택"
          initialDate={endDate ? (endDate.startsWith('-') ? endDate : endDate + 'T00:00:00Z') : undefined}
        />
        </FormCardWrapper>
      </Wrapper>
    )
  }

  return (
    <Wrapper
      $embedded={embedded}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {!embedded && (
        <Header>
          <div>
            <HeaderTitle>전역 수반 (교황 등)</HeaderTitle>
            <HeaderDesc>
              국가에 속하지 않는 직책(교황·칼리프 등)을 등록합니다. 사건 연대표에서 전역 수반 토글로 표시 여부를 바꿀 수 있습니다.
            </HeaderDesc>
            <CountryHint style={{ marginTop: 8 }}>
              국가별 수반은 좌측에서 국가를 선택한 뒤, 해당 국가 상세의 역대 수반 탭에서 등록하세요.
            </CountryHint>
          </div>
          <AddButton type="button" onClick={handleAdd} aria-label="전역 수반 등록">
            <FiPlus size={18} />
            전역 수반 등록
          </AddButton>
        </Header>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 4 }}>
        <KpiCard style={{ padding: '16px 20px', borderRadius: 12, border: '1px solid rgba(99, 102, 241, 0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <KpiLabel style={{ fontSize: 11, letterSpacing: '0.05em' }}>등록 전역 수반</KpiLabel>
            <KpiValue style={{ fontSize: 20 }}>{tenures.length}건</KpiValue>
          </div>
        </KpiCard>
      </div>

      <section aria-label="전역 수반 현황" style={{ paddingTop: 4 }}>
        <SectionHeading style={embedded ? { marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 12 } : { marginBottom: 16 }}>
          {!embedded && (
            <div>
              <SectionTitle>전역 수반 현황</SectionTitle>
              <SectionDesc>
                등록된 전역 수반 목록입니다. 카드를 클릭하면 수정·삭제할 수 있습니다.
              </SectionDesc>
            </div>
          )}
          {embedded && (
            <AddButton type="button" onClick={handleAdd} aria-label="전역 수반 등록">
              <FiPlus size={18} />
              전역 수반 등록
            </AddButton>
          )}
        </SectionHeading>

        {isLoading && tenures.length === 0 ? (
          <LoadingState>불러오는 중…</LoadingState>
        ) : tenures.length === 0 ? (
          <EmptyState
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <EmptyGlow />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <EmptyTitle>등록된 전역 수반이 없습니다</EmptyTitle>
              <EmptyDesc>
                위 <strong>전역 수반 등록</strong> 버튼을 눌러 교황 등을 추가하세요.
              </EmptyDesc>
            </div>
          </EmptyState>
        ) : (
          <CardGrid>
            <AnimatePresence initial={false}>
              {tenures.map((t: any) => {
                const regnalFromNotes = getRegnalNameFromNotes(t.notes)
                const personDisplay = regnalFromNotes ? `${regnalFromNotes} (${getPersonName(t.person)})` : getPersonName(t.person)
                const ordNum = t.regnalNumber ?? t.termNumber
                const dateLabel = `${formatDate(t.startDate)} ~ ${t.endDate ? formatDate(t.endDate) : '재임 중'}${ordNum != null ? ` · ${ordNum}대` : ''}`
                const countryLabel =
                  t?.country?.name ?? t?.historicalCountry?.name ?? (t as any)?.historical_country?.name ?? '전역'
                return (
                  <TenantCard key={t.id} type="button" onClick={() => handleEdit(t)}>
                    <CardPersonName>{personDisplay}</CardPersonName>
                    <CardBadge title="국가">국가: {countryLabel}</CardBadge>
                    <CardBadge>{t.positionDefinition?.title ?? t.title ?? '전역'}</CardBadge>
                    <CardDate>{dateLabel}</CardDate>
                  <FiChevronRight size={18} style={{ flexShrink: 0, opacity: 0.4 }} />
                  </TenantCard>
                )
              })}
            </AnimatePresence>
          </CardGrid>
        )}
      </section>
    </Wrapper>
  )
}
