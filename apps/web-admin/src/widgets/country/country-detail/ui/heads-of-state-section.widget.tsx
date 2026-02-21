/**
 * 역대 수반(국가원수·정부수반·군주 등) 재임 기록 목록 및 추가 섹션
 * 연대표 국가 상세에서 해당 국가의 재임 기록을 보고 추가할 수 있음
 */
import React, { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import styled from 'styled-components'
import { FiPlus, FiUser, FiCalendar, FiChevronRight, FiArrowLeft, FiChevronDown, FiSave } from 'react-icons/fi'
import { toast } from 'react-hot-toast'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { getPersonsByTenureCountry } from '@/shared/api/persons'
import { personCareerApi } from '@/shared/api/person-career'
import { DatePickerModal } from '@/shared/ui/date-picker'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/PersonSelectModal'
import { SelectModal, type SelectOption } from '@/shared/ui/select-modal'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

/**
 * 직책명 → DB 유형(positionType) 매핑.
 * UI에서는 "직책"만 선택하고, 유형은 이 매핑으로 자동 설정.
 * (유형은 DB 필터/집계용으로만 사용되므로 사용자에게 중복으로 묻지 않음)
 */
const POSITION_TITLE_TO_TYPE: Record<string, string> = {
  '대통령': 'HEAD_OF_STATE',
  '국왕': 'HEAD_OF_STATE',
  '여왕': 'HEAD_OF_STATE',
  '황제': 'HEAD_OF_STATE',
  '여제': 'HEAD_OF_STATE',
  '주석': 'HEAD_OF_STATE',
  '총통': 'HEAD_OF_STATE',
  '왕': 'HEAD_OF_STATE',
  '총리': 'HEAD_OF_GOVERNMENT',
  '국무총리': 'HEAD_OF_GOVERNMENT',
  '수상': 'HEAD_OF_GOVERNMENT',
  '대통령령': 'HEAD_OF_GOVERNMENT',
  '섭정': 'REGENT',
  '왕세자': 'HEIR_APPARENT',
  '왕세자비': 'HEIR_APPARENT',
  '공작': 'ROYAL_NOBLE_TITLE',
  '대공': 'ROYAL_NOBLE_TITLE',
  'OTHER': 'OTHER',
}

/** 직책명: 선택 목록 (대통령·국왕·총리 등). 기타 선택 시 직접 입력 가능 */
const POSITION_TITLE_OPTIONS: SelectOption<string>[] = [
  { value: '대통령', label: '대통령' },
  { value: '국왕', label: '국왕' },
  { value: '여왕', label: '여왕' },
  { value: '황제', label: '황제' },
  { value: '여제', label: '여제' },
  { value: '총리', label: '총리' },
  { value: '국무총리', label: '국무총리' },
  { value: '수상', label: '수상' },
  { value: '대통령령', label: '대통령령' },
  { value: '주석', label: '주석' },
  { value: '총통', label: '총통' },
  { value: '왕', label: '왕' },
  { value: '공작', label: '공작' },
  { value: '대공', label: '대공' },
  { value: '섭정', label: '섭정' },
  { value: '왕세자', label: '왕세자' },
  { value: '왕세자비', label: '왕세자비' },
  { value: 'OTHER', label: '기타 (직접 입력)' },
]

const POSITION_TITLE_EN_MAP: Record<string, string> = {
  '대통령': 'President',
  '국왕': 'King',
  '여왕': 'Queen',
  '황제': 'Emperor',
  '여제': 'Empress',
  '총리': 'Prime Minister',
  '국무총리': 'Prime Minister',
  '수상': 'Prime Minister',
  '대통령령': 'President',
  '주석': 'Chairman',
  '총통': 'President',
  '왕': 'King',
  '공작': 'Duke',
  '대공': 'Grand Duke',
  '섭정': 'Regent',
  '왕세자': 'Crown Prince',
  '왕세자비': 'Crown Princess',
}

interface HeadsOfStateSectionProps {
  country: UnifiedCountry
  /** 인물 탭에 통합되어 상단 여백을 부모가 줄 때 true */
  embedded?: boolean
}

const MIN_LOADING_MS = 1000
const FADE_DURATION = 0.35

export function HeadsOfStateSection({ country, embedded }: HeadsOfStateSectionProps) {
  const queryClient = useQueryClient()
  const isHistorical = country.type === 'historical'
  const [showLoading, setShowLoading] = useState(true)
  const loadStartRef = useRef<number>(Date.now())
  const minLoadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countryId = !isHistorical ? country.id : undefined
  const historicalCountryId = isHistorical ? country.id : undefined

  const [view, setView] = useState<'list' | 'register'>('list')
  /** 수정 모드: 목록에서 클릭한 재임 ID (설정되면 수정 폼 표시) */
  const [editingTenureId, setEditingTenureId] = useState<string | null>(null)
  const [personSelectModalOpen, setPersonSelectModalOpen] = useState(false)
  const [positionTitleModalOpen, setPositionTitleModalOpen] = useState(false)
  const [startDateModalOpen, setStartDateModalOpen] = useState(false)
  const [endDateModalOpen, setEndDateModalOpen] = useState(false)
  const [selectedPersonId, setSelectedPersonId] = useState('')
  /** 직책명: 목록에서 선택한 키('' | '대통령' | ... | 'OTHER'). 'OTHER'이면 아래 직접 입력 사용 */
  const [selectedPositionTitleKey, setSelectedPositionTitleKey] = useState('')
  const [title, setTitle] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [termNumber, setTermNumber] = useState('')
  const [regnalNumber, setRegnalNumber] = useState('')
  const [regnalName, setRegnalName] = useState('')
  /** 사건 페이지(역대 수반 토글)에 이 재임을 노출할지 여부 */
  const [showOnEventsPage, setShowOnEventsPage] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isMonarchPosition = ['국왕', '여왕', '황제', '여제', '왕'].includes(selectedPositionTitleKey)

  const { data: tenures = [], isLoading } = useQuery({
    queryKey: ['tenures-by-country', countryId, historicalCountryId],
    queryFn: () =>
      personCareerApi.getTenuresByCountry({
        countryId,
        historicalCountryId,
      }),
    enabled: !!countryId || !!historicalCountryId,
  })

  // 최소 1초 로딩 표시 후 부드럽게 전환
  useEffect(() => {
    if (isLoading) {
      loadStartRef.current = Date.now()
      setShowLoading(true)
    } else {
      const elapsed = Date.now() - loadStartRef.current
      const remaining = Math.max(0, MIN_LOADING_MS - elapsed)
      minLoadTimeoutRef.current = setTimeout(() => {
        setShowLoading(false)
        minLoadTimeoutRef.current = null
      }, remaining)
    }
    return () => {
      if (minLoadTimeoutRef.current) {
        clearTimeout(minLoadTimeoutRef.current)
        minLoadTimeoutRef.current = null
      }
    }
  }, [isLoading])

  const { data: persons = [] } = useQuery({
    queryKey: ['persons-by-tenure-country', countryId, historicalCountryId],
    queryFn: () =>
      getPersonsByTenureCountry({ countryId, historicalCountryId }),
    enabled: !!countryId || !!historicalCountryId,
  })

  const refetch = () => {
    queryClient.invalidateQueries({
      queryKey: ['tenures-by-country', countryId, historicalCountryId],
    })
  }

  /** 목록에서 재임 클릭 시 수정 폼으로 전환 + 데이터 채우기 */
  const editingTenure = editingTenureId
    ? tenures.find((t: any) => t.id === editingTenureId)
    : null

  React.useEffect(() => {
    if (!editingTenureId || !editingTenure) return
    const t = editingTenure as any
    setSelectedPersonId(t.personId || '')
    const titleVal = t.title || t.position?.title || ''
    const key =
      POSITION_TITLE_OPTIONS.find((o) => o.label === titleVal)?.value ||
      (titleVal ? 'OTHER' : '')
    setSelectedPositionTitleKey(key)
    if (key === 'OTHER') {
      setTitle(titleVal)
      setTitleEn(t.titleEn || t.position?.titleEn || '')
    } else {
      setTitle(titleVal)
      setTitleEn(POSITION_TITLE_EN_MAP[titleVal] ?? '')
    }
    setStartDate(t.startDate || '')
    setEndDate(t.endDate || '')
    setTermNumber(t.termNumber != null ? String(t.termNumber) : '')
    setRegnalNumber(t.regnalNumber != null ? String(t.regnalNumber) : '')
    setRegnalName(getRegnalNameFromNotes(t.notes) || '')
    setShowOnEventsPage(t.showPositionInfo !== false)
  }, [editingTenureId, editingTenure])

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPersonId || !title.trim() || !startDate) {
      toast.error('인물, 직책명, 취임일을 입력해주세요.')
      return
    }
    setIsSubmitting(true)
    try {
      const resolvedPositionType =
        selectedPositionTitleKey === 'OTHER'
          ? 'OTHER'
          : (POSITION_TITLE_TO_TYPE[selectedPositionTitleKey] ?? 'OTHER')
      const notesValue = regnalName.trim() ? `왕명: ${regnalName.trim()}` : undefined
      const payload = {
        personId: selectedPersonId,
        positionType: resolvedPositionType as any,
        title: title.trim(),
        titleEn: titleEn.trim() || undefined,
        countryId,
        historicalCountryId,
        startDate,
        endDate: endDate || undefined,
        termNumber: termNumber ? parseInt(termNumber, 10) : undefined,
        regnalNumber: regnalNumber ? parseInt(regnalNumber, 10) : undefined,
        notes: notesValue,
        showPositionInfo: showOnEventsPage,
      }
      if (editingTenureId) {
        await personCareerApi.updateGovernmentPositionTenure(editingTenureId, payload)
        toast.success('재임 기록이 수정되었습니다.')
      } else {
        await personCareerApi.addGovernmentPositionTenure(payload)
        toast.success('재임 기록이 추가되었습니다.')
      }
      resetForm()
      setEditingTenureId(null)
      refetch()
      setView('list')
    } catch (err: any) {
      toast.error(err?.message || '저장에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setEditingTenureId(null)
    setSelectedPersonId('')
    setSelectedPositionTitleKey('')
    setTitle('')
    setTitleEn('')
    setStartDate('')
    setEndDate('')
    setTermNumber('')
    setRegnalNumber('')
    setRegnalName('')
    setShowOnEventsPage(true)
  }

  const handlePositionTitleSelect = (value: string) => {
    setPositionTitleModalOpen(false)
    setSelectedPositionTitleKey(value)
    if (value === 'OTHER') {
      setTitle('')
      setTitleEn('')
    } else {
      const opt = POSITION_TITLE_OPTIONS.find((o) => o.value === value)
      if (opt) {
        setTitle(opt.label)
        setTitleEn(POSITION_TITLE_EN_MAP[value] ?? '')
      }
    }
  }

  const positionTitleLabel =
    selectedPositionTitleKey === 'OTHER'
      ? (title ? `기타: ${title}` : '기타 (직접 입력)')
      : selectedPositionTitleKey
        ? POSITION_TITLE_OPTIONS.find((o) => o.value === selectedPositionTitleKey)?.label ?? title
        : '직책 선택'

  const formatDate = (d: string) => {
    if (!d) return '—'
    const date = new Date(d)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDateForInput = (iso: string) => {
    if (!iso) return ''
    if (iso.startsWith('-')) {
      const [, y, m, d] = iso.match(/^-(\d+)-(\d+)-(\d+)/) || []
      return y && m && d ? `BC ${y}년 ${parseInt(m, 10)}월 ${parseInt(d, 10)}일` : iso
    }
    const date = new Date(iso)
    if (isNaN(date.getTime())) return iso
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getPersonName = (p: { name?: string; surname?: string; middleName?: string; nameDisplayOrder?: string } | null) => {
    if (!p) return '—'
    return getPersonDisplayName({
      name: p.name || '',
      surname: p.surname ?? '',
      middleName: p.middleName ?? '',
      nameDisplayOrder: (p.nameDisplayOrder as 'korean' | 'western') ?? 'korean',
    })
  }

  /** notes에서 "왕명: xxx" 추출 */
  const getRegnalNameFromNotes = (notes: string | null | undefined) => {
    if (!notes?.trim()) return null
    const m = notes.match(/왕명\s*:\s*(.+?)(?:\n|$)/i) || notes.match(/왕명\s*:\s*(.+)/i)
    return m ? m[1].trim() : null
  }

  const selectedPerson = persons.find((p: any) => p.id === selectedPersonId) ?? null

  return (
    <SectionOuter $embedded={embedded}>
      {view === 'list' ? (
        <div style={{ position: 'relative', minHeight: '400px' }}>
          <AnimatePresence mode="wait">
            {showLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: FADE_DURATION, ease: [0.25, 0.1, 0.25, 1] }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '400px',
                  color: '#64748b',
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      border: '4px solid #e2e8f0',
                      borderTopColor: '#8b5cf6',
                      borderRadius: '50%',
                      margin: '0 auto 16px',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  <p style={{ margin: 0, fontSize: '14px' }}>목록을 불러오는 중입니다.</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: FADE_DURATION, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <ListWrap>
                  <ListHead>
                    <ListTitle>
                      재임 목록
                      {tenures.length > 0 && <span className="count">{tenures.length}건</span>}
                    </ListTitle>
                    <AddTenureButton type="button" onClick={() => setView('register')}>
                      <FiPlus size={20} />
                      수반 등록
                    </AddTenureButton>
                  </ListHead>
                  {tenures.length === 0 ? (
                    <EmptyState>
                      <EmptyIconWrap>
                        <FiUser size={40} />
                      </EmptyIconWrap>
                      <EmptyTitle>등록된 재임 기록이 없습니다</EmptyTitle>
                      <EmptyDesc>수반 등록 버튼을 눌러 재임 기록을 추가해 보세요.</EmptyDesc>
                    </EmptyState>
                  ) : (
                    <List>
              {tenures.map((t: any) => {
                const titleText = t.title || t.position?.title || '—'
                const regnalFromNotes = getRegnalNameFromNotes(t.notes)
                const countryLabel =
                  !isHistorical &&
                  (t.country?.name || t.historicalCountry?.name)
                    ? t.country?.name || t.historicalCountry?.name
                    : null
                return (
                  <ListItem
                    key={t.id}
                    onClick={() => {
                      setEditingTenureId(t.id)
                      setView('register')
                    }}
                  >
                    <ItemAvatar $hasImage={!!t.person?.profileImageUrl}>
                      {t.person?.profileImageUrl ? (
                        <img src={t.person.profileImageUrl} alt="" />
                      ) : (
                        <FiUser size={22} />
                      )}
                    </ItemAvatar>
                    <ListItemBody>
                      <ItemRow>
                        <ItemName>
                          {getPersonName(t.person)}
                          {(t.termNumber != null || t.regnalNumber != null) && (
                            <ItemTermBadge>
                              {t.regnalNumber != null
                                ? `${t.regnalNumber}세`
                                : `제${t.termNumber}대`}
                            </ItemTermBadge>
                          )}
                        </ItemName>
                        <ItemDates>
                          <FiCalendar size={14} />
                          {formatDate(t.startDate)}
                          <span className="sep">~</span>
                          {t.endDate ? formatDate(t.endDate) : '현재'}
                        </ItemDates>
                      </ItemRow>
                      <ItemRow>
                        <ItemTitleBadge>{titleText}</ItemTitleBadge>
                        {countryLabel != null && (
                          <ItemCountryBadge>{countryLabel}</ItemCountryBadge>
                        )}
                        {regnalFromNotes && (
                          <ItemRegnalName>왕명: {regnalFromNotes}</ItemRegnalName>
                        )}
                      </ItemRow>
                    </ListItemBody>
                    <ItemAction aria-label="인물 보기">
                      <FiChevronRight size={20} strokeWidth={2.5} />
                    </ItemAction>
                  </ListItem>
                )
              })}
                    </List>
                  )}
                </ListWrap>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <>
          <BackToListButton
            type="button"
            onClick={() => {
              setEditingTenureId(null)
              setView('list')
            }}
          >
            <FiArrowLeft size={18} />
            목록 보기
          </BackToListButton>
          <FormCardHeader>
              <FormCardTitle>
                {editingTenureId ? '수반 수정' : '수반 등록'}
              </FormCardTitle>
              <SubmitButton
                type="submit"
                form="heads-of-state-register-form"
                disabled={isSubmitting || !selectedPersonId || !title.trim() || !startDate}
              >
                <FiSave size={16} />
                {isSubmitting ? '저장 중…' : '저장'}
              </SubmitButton>
          </FormCardHeader>
          <form id="heads-of-state-register-form" onSubmit={handleAddSubmit}>
              <FormSectionInner>
                <SectionHeaderBlock>
                  <FiUser size={28} />
                  <div>
                    <SectionHeaderTitle>재임 정보</SectionHeaderTitle>
                    <SectionHeaderDesc>
                      이 국가의 역대 수반(대통령·총리·국왕 등) 재임 기록을 등록합니다.
                    </SectionHeaderDesc>
                  </div>
                </SectionHeaderBlock>
          <FormRows>
          <FieldRow>
              <FieldLabel>인물 <Required>필수</Required></FieldLabel>
              <FieldControl $variant="person">
                <PersonSelectButton
                  type="button"
                  onClick={() => setPersonSelectModalOpen(true)}
                  $hasValue={!!selectedPersonId}
                >
                  <PersonAvatar $hasImage={!!selectedPerson?.profileImageUrl}>
                    {selectedPerson?.profileImageUrl ? (
                      <img src={selectedPerson.profileImageUrl} alt="" />
                    ) : (
                      <FiUser size={22} />
                    )}
                  </PersonAvatar>
                  <PersonLabel>
                    {selectedPersonId
                      ? getPersonName(selectedPerson)
                      : '인물 선택'}
                  </PersonLabel>
                  <FiChevronRight size={20} strokeWidth={2.5} />
                </PersonSelectButton>
              </FieldControl>
            </FieldRow>
            <FieldRow>
              <FieldLabel>직책명 <Required>필수</Required></FieldLabel>
              <FieldControl>
              <SelectTriggerButton
                type="button"
                onClick={() => setPositionTitleModalOpen(true)}
                $hasValue={!!selectedPositionTitleKey}
              >
                <span>{positionTitleLabel}</span>
                <FiChevronDown size={20} />
              </SelectTriggerButton>
              </FieldControl>
            </FieldRow>
            {isMonarchPosition && (
              <FieldRow>
                <FieldLabel>왕명</FieldLabel>
                <FieldControl>
                  <Input
                    value={regnalName}
                    onChange={(e) => setRegnalName(e.target.value)}
                    placeholder="예: 세종, 루이 14세, 강희"
                  />
                </FieldControl>
              </FieldRow>
            )}
            {selectedPositionTitleKey === 'OTHER' && (
              <>
                <FieldRow>
                  <FieldLabel>직책명 (직접 입력)</FieldLabel>
                  <FieldControl>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="예: 최고지도자"
                  />
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>직책명 (영문)</FieldLabel>
                  <FieldControl>
                  <Input
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    placeholder="예: Supreme Leader"
                  />
                  </FieldControl>
                </FieldRow>
              </>
            )}
            <FieldRow>
              <FieldLabel>취임일 · 퇴임일 <Required>필수</Required></FieldLabel>
              <FieldControl $variant="datePair">
                <DatePairRow>
                  <SelectTriggerButton
                    type="button"
                    onClick={() => setStartDateModalOpen(true)}
                    $hasValue={!!startDate}
                  >
                    <FiCalendar size={16} />
                    <span>{startDate ? formatDateForInput(startDate) : '취임일'}</span>
                    <FiChevronDown size={20} />
                  </SelectTriggerButton>
                  <SelectTriggerButton
                    type="button"
                    onClick={() => setEndDateModalOpen(true)}
                    $hasValue={!!endDate}
                  >
                    <FiCalendar size={16} />
                    <span>{endDate ? formatDateForInput(endDate) : '퇴임일 (선택)'}</span>
                    <FiChevronDown size={20} />
                  </SelectTriggerButton>
                </DatePairRow>
              </FieldControl>
            </FieldRow>
            <FieldRow>
              <FieldLabel>대수</FieldLabel>
              <FieldControl>
                <Input
                  type="number"
                  min={1}
                  value={termNumber}
                  onChange={(e) => setTermNumber(e.target.value)}
                  placeholder="예: 4 (세종 = 조선 제4대)"
                  title="동아시아: 제n대"
                />
                <FieldHint>동아시아 군주·대통령용. 제4대 → 4 입력</FieldHint>
              </FieldControl>
            </FieldRow>
            <FieldRow>
              <FieldLabel>재위 번호</FieldLabel>
              <FieldControl>
                <Input
                  type="number"
                  min={1}
                  value={regnalNumber}
                  onChange={(e) => setRegnalNumber(e.target.value)}
                  placeholder="예: 14 (루이 14세)"
                  title="서양 군주: 이름 뒤 숫자"
                />
                <FieldHint>서양 군주용. 루이 14세 → 14, 제임스 1세 → 1</FieldHint>
              </FieldControl>
            </FieldRow>
            <FieldRow>
              <FieldLabel>사건 페이지 노출</FieldLabel>
              <FieldControl>
                <CheckboxRow>
                  <input
                    type="checkbox"
                    id="heads-show-on-events"
                    checked={showOnEventsPage}
                    onChange={(e) => setShowOnEventsPage(e.target.checked)}
                  />
                  <label htmlFor="heads-show-on-events">
                    사건 목록 페이지에 이 수반을 노출합니다 (역대 수반 토글 시 표시)
                  </label>
                </CheckboxRow>
              </FieldControl>
            </FieldRow>
          </FormRows>
          <FormActions>
            <ResetButton type="button" onClick={resetForm} disabled={isSubmitting}>
              초기화
            </ResetButton>
          </FormActions>
              </FormSectionInner>
          </form>
        </>
      )}

      {personSelectModalOpen && (
        <PersonSelectModal
          persons={persons}
          selectedPersonId={selectedPersonId}
          onSelect={(id) => {
            setSelectedPersonId(id)
            setPersonSelectModalOpen(false)
          }}
          onClose={() => setPersonSelectModalOpen(false)}
        />
      )}

      <SelectModal
        isOpen={positionTitleModalOpen}
        onClose={() => setPositionTitleModalOpen(false)}
        title="직책명 선택"
        options={POSITION_TITLE_OPTIONS}
        selectedValue={selectedPositionTitleKey}
        onSelect={handlePositionTitleSelect}
      />

      <DatePickerModal
        isOpen={startDateModalOpen}
        onClose={() => setStartDateModalOpen(false)}
        title="취임일 선택"
        initialDate={startDate || undefined}
        onSelect={(date) => {
          setStartDate(date)
          setStartDateModalOpen(false)
        }}
      />

      <DatePickerModal
        isOpen={endDateModalOpen}
        onClose={() => setEndDateModalOpen(false)}
        title="퇴임일 선택"
        initialDate={endDate || undefined}
        onSelect={(date) => {
          setEndDate(date)
          setEndDateModalOpen(false)
        }}
      />
    </SectionOuter>
  )
}

const SectionOuter = styled.div<{ $embedded?: boolean }>`
  margin-top: ${({ $embedded }) => ($embedded ? '16px' : '28px')};
`

const SectionHeader = styled.div`
  margin-bottom: 48px;
`

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 32px;
  font-weight: 600;
  color: #111;
  letter-spacing: -0.04em;
  line-height: 1.2;
`

const SectionSubtitle = styled.p`
  margin: 12px 0 0;
  font-size: 17px;
  color: #666;
  line-height: 1.5;
`

const ListWrap = styled.div`
  margin-top: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
`

const ListHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  flex-wrap: wrap;
`

const ListTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;

  .count {
    font-weight: 500;
    font-size: 14px;
    color: #64748b;
    margin-left: 8px;
  }
`

const AddTenureButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: var(--color-primary);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    background: #8b5cf6;
    box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
  }
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 56px 24px;
  gap: 16px;
  text-align: center;
`

const EmptyIconWrap = styled.div`
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cbd5e1;
  background: #f1f5f9;
  border-radius: 12px;
`

const EmptyTitle = styled.p`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #334155;
`

const EmptyDesc = styled.p`
  margin: 0;
  font-size: 14px;
  color: #64748b;
  max-width: 320px;
  line-height: 1.5;
`

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
`

const ListItem = styled.li`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: background 0.2s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #faf5ff;
  }
`

const ItemAvatar = styled.div<{ $hasImage?: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
  background: ${({ $hasImage }) => ($hasImage ? '#f1f5f9' : '#e2e8f0')};
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const ListItemBody = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const ItemRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
`

const ItemName = styled.div`
  font-weight: 700;
  font-size: 16px;
  color: #0f172a;
  line-height: 1.3;
`

const ItemTermBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
  color: #6366f1;
  background: #eef2ff;
  border-radius: 6px;
`

const ItemDates = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #64748b;
  margin-left: auto;

  .sep {
    margin: 0 2px;
    color: #94a3b8;
  }
`

const ItemTitleBadge = styled.span`
  display: inline-block;
  padding: 2px 10px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  background: #f1f5f9;
  border-radius: 8px;
`

const ItemCountryBadge = styled.span`
  display: inline-block;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 500;
  color: #0f766e;
  background: #ccfbf1;
  border-radius: 8px;
`

const ItemRegnalName = styled.span`
  font-size: 13px;
  color: #64748b;
  font-style: italic;
`

const ItemAction = styled.span`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  color: #94a3b8;
  transition: color 0.2s ease, background 0.2s ease;

  ${ListItem}:hover & {
    background: #ede9fe;
    color: var(--color-primary);
  }
`

/* 사건 등록 페이지와 동일한 폼 카드/필드 스타일 */
const BORDER_COLOR = '#e2e8f0'
const FOCUS_COLOR = '#8b5cf6'
const BG_INPUT = '#f8fafc'
const TEXT_PRIMARY = '#1e293b'
const TEXT_SECONDARY = '#64748b'
const TEXT_MUTED = '#94a3b8'

const BackToListButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  margin-bottom: 20px;
  font-size: 14px;
  font-weight: 600;
  color: ${TEXT_SECONDARY};
  background: #ffffff;
  border: 1.5px solid ${BORDER_COLOR};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
    color: ${TEXT_PRIMARY};
    svg {
      transform: translateX(-3px);
    }
  }
  svg {
    flex-shrink: 0;
    transition: transform 0.2s ease;
  }
`

const FormCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 0;
  border-bottom: 1.5px solid ${BORDER_COLOR};
  background: transparent;
  margin-bottom: 24px;
`

const FormCardTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${TEXT_PRIMARY};
  letter-spacing: -0.02em;
`

const FormSectionInner = styled.div`
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
`

const SectionHeaderBlock = styled.div`
  display: flex;
  gap: 20px;
  align-items: flex-start;
  padding-bottom: 32px;
  margin-bottom: 32px;
  border-bottom: 1px solid #f1f5f9;

  > svg {
    color: ${FOCUS_COLOR};
    margin-top: 2px;
    flex-shrink: 0;
  }
`

const SectionHeaderTitle = styled.h3`
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: ${TEXT_PRIMARY};
  letter-spacing: -0.03em;
`

const SectionHeaderDesc = styled.p`
  margin: 8px 0 0;
  font-size: 15px;
  color: ${TEXT_SECONDARY};
  line-height: 1.5;
`

const FormRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`

const FieldRow = styled.div`
  display: flex;
  align-items: center;
  gap: 32px;
  min-height: 72px;
  padding: 20px 0;
  border-bottom: 1px solid #f1f5f9;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    min-height: 0;
    padding: 24px 0;
  }
`

const FieldLabel = styled.label`
  flex-shrink: 0;
  width: 160px;
  font-size: 15px;
  font-weight: 600;
  color: ${TEXT_PRIMARY};
  letter-spacing: -0.01em;

  @media (max-width: 768px) {
    width: 100%;
    font-size: 14px;
  }
`

const FieldHint = styled.span`
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: ${TEXT_SECONDARY};
  line-height: 1.4;
`

const CheckboxRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  input[type='checkbox'] {
    width: 18px;
    height: 18px;
    accent-color: #7c3aed;
    cursor: pointer;
  }
  label {
    font-size: 14px;
    color: ${TEXT_PRIMARY};
    cursor: pointer;
    user-select: none;
  }
`

const FieldControl = styled.div<{ $variant?: 'person' | 'datePair' }>`
  flex: 1;
  min-width: 0;
  max-width: ${({ $variant }) =>
    $variant === 'person' ? '360px' : $variant === 'datePair' ? '640px' : '520px'};
`

const DatePairRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;

  > button {
    flex: 1;
    min-width: 0;
  }
`

const Required = styled.span`
  font-size: 12px;
  font-weight: 400;
  color: ${TEXT_MUTED};
  margin-left: 4px;
`

const Input = styled.input`
  width: 100%;
  padding: 18px 20px;
  font-size: 16px;
  color: ${TEXT_PRIMARY};
  background: ${BG_INPUT};
  border: 1px solid ${BORDER_COLOR};
  border-radius: 14px;
  transition: all 0.2s ease;

  &::placeholder {
    color: ${TEXT_MUTED};
  }
  &:hover {
    border-color: #cbd5e1;
    background: #f1f5f9;
  }
  &:focus {
    outline: none;
    border-color: ${FOCUS_COLOR};
    background: #ffffff;
    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.08);
  }
`

const triggerButtonStyles = `
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  font-size: 16px;
  color: inherit;
  background: ${BG_INPUT};
  border: 1px solid ${BORDER_COLOR};
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;

  &:hover {
    border-color: #cbd5e1;
    background: #f1f5f9;
  }
  span {
    flex: 1;
  }
  svg:last-of-type {
    flex-shrink: 0;
    color: ${TEXT_MUTED};
  }
`

const SelectTriggerButton = styled.button<{ $hasValue?: boolean }>`
  ${triggerButtonStyles}
  color: ${({ $hasValue }) => ($hasValue ? TEXT_PRIMARY : TEXT_MUTED)};
`

/* 인물 선택 전용: 아바타 + 이름 + 화살표 카드 스타일 */
const PersonSelectButton = styled.button<{ $hasValue: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  font-size: 16px;
  color: ${({ $hasValue }) => ($hasValue ? TEXT_PRIMARY : TEXT_MUTED)};
  background: ${({ $hasValue }) => ($hasValue ? '#f8fafc' : '#f1f5f9')};
  border: 1px solid ${BORDER_COLOR};
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;

  &:hover {
    background: #e2e8f0;
    border-color: #cbd5e1;
    color: ${TEXT_PRIMARY};
  }
  svg:last-of-type {
    flex-shrink: 0;
    color: ${TEXT_MUTED};
  }
`

const PersonAvatar = styled.div<{ $hasImage: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${({ $hasImage }) => ($hasImage ? 'transparent' : 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)')};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  svg {
    color: #6366f1;
  }
`

const PersonLabel = styled.span`
  flex: 1;
  min-width: 0;
  font-weight: 600;
  letter-spacing: -0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const FormActions = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 40px;
  padding-top: 32px;
  border-top: 1px solid #f1f5f9;
`

const SubmitButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const ResetButton = styled.button`
  padding: 14px 24px;
  font-size: 15px;
  font-weight: 600;
  color: ${TEXT_SECONDARY};
  background: #ffffff;
  border: 1.5px solid ${BORDER_COLOR};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    border-color: ${FOCUS_COLOR};
    color: ${FOCUS_COLOR};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

