/**
 * 분야별 경력 등록 모달 — 인물 상세에서 직접 등록.
 *
 * 9개 분야(군사·기업·학계·종교·예술·체육·언론·법조·의료)의 Career를 하나의 모달로
 * 등록한다. 공통 골격(조직 + 직급(Job) + 기간 + 비고)에 분야별 추가 필드만
 * KIND_CONFIG로 분기 — 군사만 positionId 대신 rankId(역시 Job FK)를 쓴다.
 *
 * 조직은 Organization FK라서 회사(Company)에 경력을 달려면 해당 Company에 1:1
 * 연결된 Organization이 먼저 있어야 한다(기업 폼의 "연결 조직" 참고).
 *
 * 생성 전용 — 수정/삭제는 기존 인물 상세 카드의 삭제 버튼으로 처리(수상 모달과 동일).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { createPortal } from 'react-dom'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { FiChevronDown, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { getApiConnection } from '@/shared/api/client'
import { type Job, jobApi } from '@/shared/api/job'
import {
  type OrganizationType,
  getOrganizations,
} from '@/shared/api/organizations'
import { personCareerApi } from '@/shared/api/person-career'
import { Z_INDEX } from '@/shared/styles/z-index'
import { Modal, ModalBody, ModalFooter } from '@/shared/ui/modal'
import { notify } from '@/shared/ui/toast'

export type CareerKind =
  | 'military'
  | 'business'
  | 'academic'
  | 'religious'
  | 'artist'
  | 'athlete'
  | 'media'
  | 'legal'
  | 'medical'

interface ExtraField {
  key: string
  label: string
  placeholder: string
  type?: 'number'
}

interface KindConfig {
  label: string
  /** Job 선택기 라벨 — 군사만 '계급' */
  positionLabel: string
  positionPlaceholder: string
  orgLabel: string
  /** 서버 DTO에서 organizationId가 필수인 분야 (military/business/academic) */
  orgRequired: boolean
  extras: ExtraField[]
  submit: (payload: Record<string, unknown>) => Promise<unknown>
}

const KIND_CONFIG: Record<CareerKind, KindConfig> = {
  business: {
    label: '기업',
    positionLabel: '직급',
    positionPlaceholder: '예: CEO, 회장, 이사',
    orgLabel: '회사·조직',
    orgRequired: true,
    extras: [
      { key: 'title', label: '직함', placeholder: '예: 최고경영자(CEO)' },
      { key: 'level', label: '직급 레벨', placeholder: '예: C-LEVEL' },
    ],
    submit: (dto) => personCareerApi.addBusinessCareer(dto as never),
  },
  military: {
    label: '군사',
    positionLabel: '계급',
    positionPlaceholder: '예: 대장, 중장',
    orgLabel: '소속 부대·조직',
    orgRequired: true,
    extras: [
      { key: 'branch', label: '군종', placeholder: '예: 육군, 해군, 공군' },
      { key: 'position', label: '보직', placeholder: '예: 사령관, 참모장' },
      {
        key: 'termNumber',
        label: '대수',
        placeholder: '예: 32',
        type: 'number',
      },
    ],
    submit: (dto) => personCareerApi.addMilitaryCareer(dto as never),
  },
  academic: {
    label: '학계',
    positionLabel: '직급',
    positionPlaceholder: '예: 교수, 연구원',
    orgLabel: '대학·연구소',
    orgRequired: true,
    extras: [
      { key: 'department', label: '학과·부서', placeholder: '예: 물리학과' },
      {
        key: 'researchField',
        label: '연구 분야',
        placeholder: '예: 입자물리학',
      },
    ],
    submit: (dto) => personCareerApi.addAcademicCareer(dto as never),
  },
  religious: {
    label: '종교',
    positionLabel: '직급',
    positionPlaceholder: '예: 성직자, 수도자',
    orgLabel: '종교 조직',
    orgRequired: false,
    extras: [
      { key: 'religion', label: '종교', placeholder: '예: 천주교' },
      { key: 'denomination', label: '종파', placeholder: '예: 예수회' },
      { key: 'rank', label: '지위', placeholder: '예: 추기경' },
    ],
    submit: (dto) => personCareerApi.addReligiousCareer(dto as never),
  },
  artist: {
    label: '예술',
    positionLabel: '직급',
    positionPlaceholder: '예: 화가, 조각가',
    orgLabel: '소속 조직',
    orgRequired: false,
    extras: [
      { key: 'artForm', label: '예술 분야', placeholder: '예: 회화, 조각' },
      { key: 'style', label: '스타일·장르', placeholder: '예: 인상주의' },
    ],
    submit: (dto) => personCareerApi.addArtistCareer(dto as never),
  },
  athlete: {
    label: '체육',
    positionLabel: '직급',
    positionPlaceholder: '예: 선수, 코치',
    orgLabel: '소속 팀',
    orgRequired: false,
    extras: [
      { key: 'sport', label: '종목', placeholder: '예: 축구' },
      { key: 'position', label: '포지션', placeholder: '예: 공격수' },
      {
        key: 'jerseyNumber',
        label: '등번호',
        placeholder: '예: 7',
        type: 'number',
      },
    ],
    submit: (dto) => personCareerApi.addAthleteCareer(dto as never),
  },
  media: {
    label: '언론',
    positionLabel: '직급',
    positionPlaceholder: '예: 기자, 앵커',
    orgLabel: '언론사',
    orgRequired: false,
    extras: [
      { key: 'mediaType', label: '매체 유형', placeholder: '예: 신문, 방송' },
      { key: 'role', label: '역할', placeholder: '예: 편집국장' },
    ],
    submit: (dto) => personCareerApi.addMediaCareer(dto as never),
  },
  legal: {
    label: '법조',
    positionLabel: '직급',
    positionPlaceholder: '예: 판사, 검사, 변호사',
    orgLabel: '법원·검찰청·로펌',
    orgRequired: false,
    extras: [
      { key: 'specialization', label: '전문 분야', placeholder: '예: 형사' },
      { key: 'courtLevel', label: '법원 등급', placeholder: '예: 대법원' },
    ],
    submit: (dto) => personCareerApi.addLegalCareer(dto as never),
  },
  medical: {
    label: '의료',
    positionLabel: '직급',
    positionPlaceholder: '예: 의사, 간호사',
    orgLabel: '병원·기관',
    orgRequired: false,
    extras: [
      {
        key: 'specialization',
        label: '전문 분야',
        placeholder: '예: 심장외과',
      },
      { key: 'department', label: '진료과', placeholder: '예: 외과' },
    ],
    submit: (dto) => personCareerApi.addMedicalCareer(dto as never),
  },
}

const KIND_ORDER: CareerKind[] = [
  'business',
  'military',
  'academic',
  'religious',
  'artist',
  'athlete',
  'media',
  'legal',
  'medical',
]

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

/** 분야별로 관련 높은 조직 타입을 목록 앞에 정렬 (필터링은 하지 않음) */
const ORG_TYPE_PRIORITY: Partial<Record<CareerKind, OrganizationType[]>> = {
  business: ['COMPANY', 'BUSINESS_ASSOCIATION'],
  military: ['MILITARY_ALLIANCE', 'MILITARY_ACADEMY', 'GOVERNMENT_AGENCY'],
  academic: ['EDUCATION', 'MILITARY_ACADEMY'],
  religious: ['RELIGIOUS_ORG'],
  media: ['COMPANY'],
  legal: ['GOVERNMENT_AGENCY'],
}

/** 분야와 Job 카테고리명을 잇는 휴리스틱 — 일치하는 직급을 목록 앞에 정렬 */
const JOB_CATEGORY_KEYWORDS: Record<CareerKind, string[]> = {
  business: ['기업', '경영'],
  military: ['군'],
  academic: ['학계', '교육', '학술'],
  religious: ['종교'],
  artist: ['예술'],
  athlete: ['체육', '스포츠'],
  media: ['언론', '방송'],
  legal: ['법'],
  medical: ['의료', '의학'],
}

export interface CareerRegisterModalProps {
  open: boolean
  personId: string
  onClose: () => void
  /** 저장 성공 시 호출 (모달은 onClose로 상위에서 닫음) */
  onSuccess?: () => void
}

export function CareerRegisterModal({
  open,
  personId,
  onClose,
  onSuccess,
}: CareerRegisterModalProps) {
  const queryClient = useQueryClient()
  const [kind, setKind] = useState<CareerKind>('business')
  const [organizationId, setOrganizationId] = useState('')
  const [positionId, setPositionId] = useState('')
  const [extras, setExtras] = useState<Record<string, string>>({})
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const cfg = KIND_CONFIG[kind]

  const { data: organizations = [], isLoading: orgsLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => getOrganizations(getApiConnection()),
    enabled: open,
  })

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ['jobs'],
    queryFn: jobApi.getAll,
    enabled: open,
  })

  const orgOptions = useMemo(() => {
    const priority = ORG_TYPE_PRIORITY[kind] ?? []
    const rankOf = (type: OrganizationType) => {
      const index = priority.indexOf(type)
      return index === -1 ? priority.length : index
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
  }, [organizations, kind])

  const jobOptions = useMemo(() => {
    const keywords = JOB_CATEGORY_KEYWORDS[kind] ?? []
    const matchesKind = (categoryName: string) =>
      keywords.some((keyword) => categoryName.includes(keyword))
    return [...jobs]
      .sort(
        (first, second) =>
          Number(matchesKind(second.category?.name ?? '')) -
          Number(matchesKind(first.category?.name ?? '')),
      )
      .map((job) => ({
        id: job.id,
        name: job.title,
        sub: job.category?.name ?? '',
      }))
  }, [jobs, kind])

  /** 모달 열릴 때마다 초기화 */
  useEffect(() => {
    if (!open) return
    setKind('business')
    setOrganizationId('')
    setPositionId('')
    setExtras({})
    setStartDate('')
    setEndDate('')
    setNotes('')
    setSubmitting(false)
  }, [open])

  const dateRangeInvalid =
    startDate.length > 0 && endDate.length > 0 && endDate < startDate

  const canSubmit =
    !submitting &&
    positionId.length > 0 &&
    (!cfg.orgRequired || organizationId.length > 0) &&
    !dateRangeInvalid

  const handleKindChange = (next: CareerKind) => {
    setKind(next)
    setExtras({})
  }

  const submitCareer = async (keepOpen: boolean) => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        personId,
        organizationId: organizationId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        notes: notes.trim() || undefined,
      }
      // 군사만 Job FK 필드명이 rankId — 나머지는 positionId
      if (kind === 'military') payload.rankId = positionId
      else payload.positionId = positionId
      for (const field of cfg.extras) {
        const raw = (extras[field.key] ?? '').trim()
        if (!raw) continue
        payload[field.key] = field.type === 'number' ? Number(raw) : raw
      }
      await cfg.submit(payload)
      queryClient.invalidateQueries({ queryKey: ['person-detail', personId] })
      notify.success('경력이 등록되었습니다.')
      onSuccess?.()
      if (keepOpen) {
        // 연속 등록 — 분야는 유지하고 입력값만 비움
        setOrganizationId('')
        setPositionId('')
        setExtras({})
        setStartDate('')
        setEndDate('')
        setNotes('')
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
    void submitCareer(false)
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="경력 등록"
      subtitle="분야를 고르고 조직·직급을 선택하세요. 조직이 목록에 없으면 조직 관리에서 먼저 등록해야 합니다."
      maxWidth="600px"
    >
      <form onSubmit={handleSubmit}>
        <ModalBody>
          <Field>
            <Label>
              분야 <Required>*</Required>
            </Label>
            <KindGrid role="radiogroup" aria-label="경력 분야">
              {KIND_ORDER.map((kindValue) => (
                <KindChip
                  key={kindValue}
                  type="button"
                  role="radio"
                  aria-checked={kind === kindValue}
                  $active={kind === kindValue}
                  onClick={() => handleKindChange(kindValue)}
                >
                  {KIND_CONFIG[kindValue].label}
                </KindChip>
              ))}
            </KindGrid>
          </Field>

          <Field>
            <Label>
              {cfg.orgLabel} {cfg.orgRequired && <Required>*</Required>}
            </Label>
            <SearchPicker
              value={organizationId}
              onChange={setOrganizationId}
              options={orgOptions}
              loading={orgsLoading}
              placeholder="조직명으로 검색"
            />
          </Field>

          <Field>
            <Label>
              {cfg.positionLabel} <Required>*</Required>
            </Label>
            <SearchPicker
              value={positionId}
              onChange={setPositionId}
              options={jobOptions}
              loading={jobsLoading}
              placeholder={cfg.positionPlaceholder}
            />
          </Field>

          {cfg.extras.length > 0 && (
            <TwoCol>
              {cfg.extras.map((field) => (
                <Field key={`${kind}-${field.key}`}>
                  <Label>{field.label}</Label>
                  <TextInput
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={extras[field.key] ?? ''}
                    onChange={(event) =>
                      setExtras((prev) => ({
                        ...prev,
                        [field.key]: event.target.value,
                      }))
                    }
                    placeholder={field.placeholder}
                    maxLength={200}
                  />
                </Field>
              ))}
            </TwoCol>
          )}

          <TwoCol>
            <Field>
              <Label>시작일</Label>
              <TextInput
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </Field>
            <Field>
              <Label>종료일</Label>
              <TextInput
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </Field>
          </TwoCol>

          {dateRangeInvalid && (
            <FieldErrorText role="alert">
              종료일이 시작일보다 빠릅니다.
            </FieldErrorText>
          )}

          <Field>
            <Label>비고</Label>
            <TextArea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="경력 관련 메모 (선택)"
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
            onClick={() => void submitCareer(true)}
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

// ────── 검색형 선택기 ──────

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

const KindGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const KindChip = styled.button<{ $active: boolean }>`
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 999px;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? '#6366f1'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.12)'
          : '#e2e8f0'};
  background: ${({ $active, theme }) =>
    $active
      ? 'rgba(99,102,241,0.14)'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : '#fff'};
  color: ${({ $active, theme }) =>
    $active
      ? '#6366f1'
      : theme.mode === 'dark'
        ? theme.colors.text.secondary
        : '#475569'};
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
