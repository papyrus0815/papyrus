/**
 * 학력 등록 모달 — 인물 상세에서 직접 등록.
 *
 * 학력(PersonEducation)은 organizationId(학교·교육기관)가 서버 DTO 필수라
 * 경력 모달과 동일한 검색형 조직 선택기를 사용한다. 이 모달이 없던 동안
 * 사용자가 학력을 연보(EDUCATION 카테고리)에 적어 이중 정본이 생기던 공백을 메운다.
 *
 * 생성 전용 — 수정/삭제는 기존 인물 상세 카드의 삭제 버튼으로 처리(수상·경력 모달과 동일).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { createPortal } from 'react-dom'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { FiChevronDown, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { getApiConnection } from '@/shared/api/client'
import {
  type OrganizationType,
  getOrganizations,
} from '@/shared/api/organizations'
import { personCareerApi } from '@/shared/api/person-career'
import { Z_INDEX } from '@/shared/styles/z-index'
import { Modal, ModalBody, ModalFooter } from '@/shared/ui/modal'
import { notify } from '@/shared/ui/toast'

const ORGANIZATION_TYPE_LABEL: Record<OrganizationType, string> = {
  POLITICAL_PARTY: '정당',
  INTERGOVERNMENTAL_ORG: '국제기구',
  NGO: 'NGO',
  TRADE_UNION: '노동조합',
  GOVERNMENT_AGENCY: '정부기관/행정기구',
  MILITARY_ALLIANCE: '군사동맹',
  RELIGIOUS_ORG: '종교단체',
  BUSINESS_ASSOCIATION: '업계단체',
  EDUCATION: '교육기관',
  MILITARY_ACADEMY: '군사교육기관',
  COMPANY: '기업',
  OTHER: '기타',
}

/** 교육기관성 조직 타입을 목록 앞에 정렬 (필터링은 하지 않음 — 경력 모달과 동일 정책) */
const ORG_TYPE_PRIORITY: OrganizationType[] = ['EDUCATION', 'MILITARY_ACADEMY']

export interface EducationRegisterModalProps {
  open: boolean
  personId: string
  onClose: () => void
  /** 저장 성공 시 호출 (모달은 onClose로 상위에서 닫음) */
  onSuccess?: () => void
}

export function EducationRegisterModal({
  open,
  personId,
  onClose,
  onSuccess,
}: EducationRegisterModalProps) {
  const queryClient = useQueryClient()
  const [organizationId, setOrganizationId] = useState('')
  const [degree, setDegree] = useState('')
  const [major, setMajor] = useState('')
  const [department, setDepartment] = useState('')
  const [status, setStatus] = useState('')
  const [educationType, setEducationType] = useState('')
  const [classNumber, setClassNumber] = useState('')
  const [studentNumber, setStudentNumber] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { data: organizations = [], isLoading: orgsLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => getOrganizations(getApiConnection()),
    enabled: open,
  })

  const orgOptions = useMemo(() => {
    const rankOf = (type: OrganizationType) => {
      const index = ORG_TYPE_PRIORITY.indexOf(type)
      return index === -1 ? ORG_TYPE_PRIORITY.length : index
    }
    return [...organizations]
      .sort((first, second) => rankOf(first.type) - rankOf(second.type))
      .map((org) => ({
        id: org.id,
        name: org.name,
        sub: [ORGANIZATION_TYPE_LABEL[org.type] ?? org.type, org.shortName]
          .filter(Boolean)
          .join(' · '),
      }))
  }, [organizations])

  const resetFields = useCallback(() => {
    setOrganizationId('')
    setDegree('')
    setMajor('')
    setDepartment('')
    setStatus('')
    setEducationType('')
    setClassNumber('')
    setStudentNumber('')
    setStartDate('')
    setEndDate('')
    setNotes('')
  }, [])

  /** 모달 열릴 때마다 초기화 */
  useEffect(() => {
    if (!open) return
    resetFields()
    setSubmitting(false)
  }, [open, resetFields])

  const dateRangeInvalid =
    startDate.length > 0 && endDate.length > 0 && endDate < startDate

  const canSubmit =
    !submitting && organizationId.length > 0 && !dateRangeInvalid

  const submitEducation = async (keepOpen: boolean) => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const classNumberValue = classNumber.trim()
      await personCareerApi.addEducation({
        personId,
        organizationId,
        degree: degree.trim() || undefined,
        major: major.trim() || undefined,
        department: department.trim() || undefined,
        status: status.trim() || undefined,
        educationType: educationType.trim() || undefined,
        classNumber: classNumberValue ? Number(classNumberValue) : undefined,
        studentNumber: studentNumber.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        notes: notes.trim() || undefined,
      })
      queryClient.invalidateQueries({ queryKey: ['person-detail', personId] })
      notify.success('학력이 등록되었습니다.')
      onSuccess?.()
      if (keepOpen) {
        // 연속 등록 — 입력값만 비움
        resetFields()
      } else {
        onClose()
      }
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : '저장에 실패했습니다.'
      notify.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    void submitEducation(false)
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="학력 등록"
      subtitle="학교·교육기관을 선택하세요. 기관이 목록에 없으면 조직 관리에서 먼저 등록해야 합니다."
      maxWidth="600px"
    >
      <form onSubmit={handleSubmit}>
        <ModalBody>
          <Field>
            <Label>
              학교·교육기관 <Required>*</Required>
            </Label>
            <SearchPicker
              value={organizationId}
              onChange={setOrganizationId}
              options={orgOptions}
              loading={orgsLoading}
              placeholder="기관명으로 검색"
            />
          </Field>

          <TwoCol>
            <Field>
              <Label>학위</Label>
              <TextInput
                type="text"
                value={degree}
                onChange={(event) => setDegree(event.target.value)}
                placeholder="예: 학사, 석사, 박사"
                maxLength={50}
              />
            </Field>
            <Field>
              <Label>상태</Label>
              <TextInput
                type="text"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                placeholder="예: 졸업, 수료, 중퇴, 재학중"
                maxLength={50}
              />
            </Field>
          </TwoCol>

          <TwoCol>
            <Field>
              <Label>전공</Label>
              <TextInput
                type="text"
                value={major}
                onChange={(event) => setMajor(event.target.value)}
                placeholder="예: 물리학"
                maxLength={200}
              />
            </Field>
            <Field>
              <Label>학과</Label>
              <TextInput
                type="text"
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                placeholder="예: 물리학과"
                maxLength={200}
              />
            </Field>
          </TwoCol>

          <TwoCol>
            <Field>
              <Label>교육 유형</Label>
              <TextInput
                type="text"
                value={educationType}
                onChange={(event) => setEducationType(event.target.value)}
                placeholder="예: 정규교육, 단기과정"
                maxLength={50}
              />
            </Field>
            <Field>
              <Label>기수</Label>
              <TextInput
                type="number"
                value={classNumber}
                onChange={(event) => setClassNumber(event.target.value)}
                placeholder="예: 50 (육사 50기)"
              />
            </Field>
          </TwoCol>

          <TwoCol>
            <Field>
              <Label>입학일</Label>
              <TextInput
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </Field>
            <Field>
              <Label>졸업일·수료일</Label>
              <TextInput
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </Field>
          </TwoCol>

          {dateRangeInvalid && (
            <FieldErrorText role="alert">
              졸업일이 입학일보다 빠릅니다.
            </FieldErrorText>
          )}

          <Field>
            <Label>학번</Label>
            <TextInput
              type="text"
              value={studentNumber}
              onChange={(event) => setStudentNumber(event.target.value)}
              placeholder="예: 2001-12345 (선택)"
              maxLength={50}
            />
          </Field>

          <Field>
            <Label>비고</Label>
            <TextArea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="학력 관련 메모 (선택)"
              rows={3}
            />
          </Field>
        </ModalBody>

        <ModalFooter>
          <Spacer />
          <CancelBtn type="button" onClick={onClose} disabled={submitting}>
            취소
          </CancelBtn>
          <ContinueBtn
            type="button"
            onClick={() => void submitEducation(true)}
            disabled={!canSubmit}
          >
            등록 후 계속
          </ContinueBtn>
          <SaveBtn type="submit" disabled={!canSubmit}>
            {submitting ? '저장 중…' : '등록'}
          </SaveBtn>
        </ModalFooter>
      </form>
    </Modal>
  )
}

// ────── 검색형 선택기 (career-register-modal SearchPicker와 동일 패턴) ──────

interface PickerOption {
  id: string
  name: string
  sub?: string
}

const PICKER_MAX_VISIBLE = 50
const PICKER_DROPDOWN_MAX_HEIGHT = 260

interface PickerPosition {
  left: number
  width: number
  top?: number
  bottom?: number
}

function SearchPicker({
  value,
  onChange,
  options,
  placeholder,
  loading,
}: {
  value: string
  onChange: (id: string) => void
  options: PickerOption[]
  placeholder: string
  loading?: boolean
}) {
  const [query, setQuery] = useState('')
  const [openList, setOpenList] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [position, setPosition] = useState<PickerPosition | null>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selected = value
    ? (options.find((option) => option.id === value) ?? null)
    : null

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return options
    return options.filter(
      (option) =>
        option.name.toLowerCase().includes(keyword) ||
        (option.sub ?? '').toLowerCase().includes(keyword),
    )
  }, [options, query])

  const visible = filtered.slice(0, PICKER_MAX_VISIBLE)
  const hiddenCount = filtered.length - visible.length

  /** 모달 본문(overflow:auto)에 잘리지 않게 포털 + fixed 좌표로 띄움. 아래 공간이 부족하면 위로 연다. */
  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const openUp =
      spaceBelow < PICKER_DROPDOWN_MAX_HEIGHT + 12 && rect.top > spaceBelow
    setPosition({
      left: rect.left,
      width: rect.width,
      top: openUp ? undefined : rect.bottom + 6,
      bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
    })
  }, [])

  useEffect(() => {
    if (!openList) return
    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [openList, updatePosition])

  useEffect(() => {
    if (!openList) return
    listRef.current
      ?.querySelector(`[data-index="${highlightIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [highlightIndex, openList])

  const openDropdown = () => {
    setQuery('')
    setHighlightIndex(0)
    updatePosition() // 재오픈 첫 프레임이 이전 좌표로 그려지지 않게 즉시 갱신
    setOpenList(true)
  }

  const commit = (option: PickerOption) => {
    onChange(option.id)
    setOpenList(false)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!openList) {
      // Enter가 폼 제출로 새지 않게 — 닫힌 상태에선 목록을 연다
      if (event.key === 'Enter' || event.key === 'ArrowDown') {
        event.preventDefault()
        openDropdown()
      }
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightIndex((prev) => Math.min(prev + 1, visible.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightIndex((prev) => Math.max(prev - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const target = visible[highlightIndex] ?? visible[0]
      if (target) commit(target)
    } else if (event.key === 'Escape') {
      // 모달 전체가 닫히지 않게 — 드롭다운만 닫는다
      event.preventDefault()
      event.stopPropagation()
      setOpenList(false)
    }
  }

  return (
    <PickerRoot>
      <PickerInputWrap ref={anchorRef}>
        <TextInput
          type="text"
          role="combobox"
          aria-expanded={openList}
          aria-autocomplete="list"
          value={openList ? query : (selected?.name ?? '')}
          onChange={(event) => {
            setQuery(event.target.value)
            setHighlightIndex(0)
          }}
          onFocus={openDropdown}
          onBlur={() => setOpenList(false)}
          onKeyDown={handleKeyDown}
          placeholder={selected ? selected.name : placeholder}
        />
        {selected && !openList && (
          <PickerClearBtn
            type="button"
            aria-label="선택 해제"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onChange('')}
          >
            <FiX size={13} />
          </PickerClearBtn>
        )}
        <PickerCaret aria-hidden>
          <FiChevronDown size={15} />
        </PickerCaret>
      </PickerInputWrap>
      {openList &&
        position &&
        createPortal(
          <PickerDropdown
            ref={listRef}
            role="listbox"
            style={{
              left: position.left,
              width: position.width,
              top: position.top,
              bottom: position.bottom,
            }}
          >
            {loading ? (
              <PickerHint>불러오는 중…</PickerHint>
            ) : visible.length === 0 ? (
              <PickerHint>검색 결과가 없습니다.</PickerHint>
            ) : (
              <>
                {visible.map((option, optionIndex) => (
                  <PickerItem
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={option.id === value}
                    data-index={optionIndex}
                    $active={option.id === value}
                    $highlighted={optionIndex === highlightIndex}
                    /* onMouseDown — blur로 목록이 닫히기 전에 선택 처리 */
                    onMouseDown={(event) => {
                      event.preventDefault()
                      commit(option)
                    }}
                    onMouseEnter={() => setHighlightIndex(optionIndex)}
                  >
                    <PickerItemName>{option.name}</PickerItemName>
                    {option.sub && <PickerItemSub>{option.sub}</PickerItemSub>}
                  </PickerItem>
                ))}
                {hiddenCount > 0 && (
                  <PickerHint>
                    외 {hiddenCount}건 — 검색어로 좁혀보세요.
                  </PickerHint>
                )}
              </>
            )}
          </PickerDropdown>,
          document.body,
        )}
    </PickerRoot>
  )
}

// ────── styled ──────
const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`

const Label = styled.label`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.01em;
  text-transform: uppercase;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.tertiary : '#64748b'};
`

const Required = styled.span`
  color: #ef4444;
  text-transform: none;
`

const fieldBase = `
  width: 100%;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 500;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
`

const TextInput = styled.input`
  ${fieldBase}
  border: 1px solid
    ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.14);
  }
  &::placeholder {
    color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.35)' : '#94a3b8'};
  }
`

const TextArea = styled.textarea`
  ${fieldBase}
  resize: vertical;
  line-height: 1.6;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.14);
  }
  &::placeholder {
    color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.35)' : '#94a3b8'};
  }
`

const PickerRoot = styled.div`
  position: relative;
  min-width: 0;
`

const PickerInputWrap = styled.div`
  position: relative;

  input {
    padding-right: 62px;
  }
`

const PickerClearBtn = styled.button`
  position: absolute;
  right: 36px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  background: transparent;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.45)' : '#94a3b8'};
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'};
  }
`

const PickerCaret = styled.span`
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  pointer-events: none;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.35)' : '#94a3b8'};
`

/* 포털(document.body)로 띄우는 fixed 드롭다운 — 좌표는 인라인 style로 주입 */
const PickerDropdown = styled.div`
  position: fixed;
  z-index: ${Z_INDEX.RICH_TEXT_EDITOR_OVERLAY};
  max-height: ${PICKER_DROPDOWN_MAX_HEIGHT}px;
  overflow-y: auto;
  border-radius: 12px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e2e8f0'};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#1e2230' : '#fff')};
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
`

const PickerItem = styled.button<{ $active: boolean; $highlighted: boolean }>`
  display: flex;
  align-items: baseline;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  text-align: left;
  cursor: pointer;
  background: ${({ $active, $highlighted, theme }) =>
    $highlighted
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.08)'
        : 'rgba(15,23,42,0.06)'
      : $active
        ? 'rgba(99,102,241,0.12)'
        : 'transparent'};
`

const PickerItemName = styled.span`
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
`

const PickerItemSub = styled.span`
  font-size: 12px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.tertiary : '#94a3b8'};
`

const PickerHint = styled.div`
  padding: 12px 14px;
  font-size: 12.5px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.tertiary : '#94a3b8'};
`

const FieldErrorText = styled.div`
  font-size: 12.5px;
  font-weight: 600;
  color: #ef4444;
`

const Spacer = styled.div`
  flex: 1;
`

const baseBtn = `
  padding: 11px 20px;
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, transform 0.1s;
`

const SaveBtn = styled.button`
  ${baseBtn}
  background: #6366f1;
  color: #fff;
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  &:hover:not(:disabled) {
    filter: brightness(0.95);
  }
`

const ContinueBtn = styled.button`
  ${baseBtn}
  background: transparent;
  color: #6366f1;
  border: 1px solid rgba(99, 102, 241, 0.55);
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  &:hover:not(:disabled) {
    background: rgba(99, 102, 241, 0.08);
  }
`

const CancelBtn = styled.button`
  ${baseBtn}
  background: transparent;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.secondary : '#475569'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e2e8f0'};
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)'};
  }
`
