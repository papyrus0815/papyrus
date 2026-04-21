/**
 * 인물 연보 등록/수정 모달 — 공용 Modal 프리미티브 기반
 */
import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import {
  FiAward,
  FiBookOpen,
  FiBriefcase,
  FiCompass,
  FiEdit3,
  FiFlag,
  FiHeart,
  FiTag,
  FiX,
} from 'react-icons/fi'
import styled, { css } from 'styled-components'

import {
  PERSON_LIFE_EVENT_CATEGORIES,
  PERSON_LIFE_EVENT_CATEGORY_COLOR,
  PERSON_LIFE_EVENT_CATEGORY_LABEL,
  type PersonLifeEvent,
  type PersonLifeEventCategory,
  createPersonLifeEvent,
  deletePersonLifeEvent,
  updatePersonLifeEvent,
} from '@/shared/api/person-life-events'
import { DateRangeField } from '@/shared/ui/form-fields/date-range-field'
import {
  ModalBody,
  ModalBox,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalSubtitle,
  ModalTitle,
} from '@/shared/ui/modal'

type DatePrecision = 'year' | 'month' | 'day'
const DATE_PRECISIONS: DatePrecision[] = ['day', 'month', 'year']
const PRECISION_LABEL: Record<DatePrecision, string> = {
  day: '연·월·일',
  month: '연·월',
  year: '연도',
}

export const CATEGORY_ICON: Record<
  PersonLifeEventCategory,
  typeof FiBookOpen
> = {
  EDUCATION: FiBookOpen,
  TRAVEL: FiCompass,
  PUBLICATION: FiEdit3,
  EXILE: FiFlag,
  AWARD: FiAward,
  PERSONAL: FiHeart,
  CAREER: FiBriefcase,
  OTHER: FiTag,
}

export interface PersonLifeEventFormModalProps {
  open: boolean
  personId: string
  lifeEvent?: PersonLifeEvent | null
  onClose: () => void
  onSuccess?: () => void
}

export function PersonLifeEventFormModal({
  open,
  personId,
  lifeEvent,
  onClose,
  onSuccess,
}: PersonLifeEventFormModalProps) {
  const queryClient = useQueryClient()
  const isEdit = !!lifeEvent
  const lifeEventId = lifeEvent?.id

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<PersonLifeEventCategory | ''>('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startPrecision, setStartPrecision] = useState<DatePrecision>('day')
  const [endPrecision, setEndPrecision] = useState<DatePrecision>('day')
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!open) return
    if (lifeEvent) {
      setTitle(lifeEvent.title)
      setCategory((lifeEvent.category ?? '') as PersonLifeEventCategory | '')
      setDescription(lifeEvent.description ?? '')
      setStartDate(lifeEvent.startDate ? lifeEvent.startDate.slice(0, 10) : '')
      setEndDate(lifeEvent.endDate ? lifeEvent.endDate.slice(0, 10) : '')
      setStartPrecision((lifeEvent.startDatePrecision as DatePrecision) ?? 'day')
      setEndPrecision((lifeEvent.endDatePrecision as DatePrecision) ?? 'day')
    } else {
      setTitle('')
      setCategory('')
      setDescription('')
      setStartDate('')
      setEndDate('')
      setStartPrecision('day')
      setEndPrecision('day')
    }
  }, [open, lifeEvent])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  const accent = useMemo(() => {
    if (!category) return null
    return PERSON_LIFE_EVENT_CATEGORY_COLOR[category]
  }, [category])

  const canSubmit = title.trim().length > 0 && !submitting && !deleting

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['person-detail', personId] })
    queryClient.invalidateQueries({ queryKey: ['person-life-events', personId] })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    try {
      if (isEdit && lifeEventId) {
        await updatePersonLifeEvent(lifeEventId, {
          title: title.trim(),
          category: (category || null) as PersonLifeEventCategory | null,
          description: description.trim() || null,
          startDate: startDate || null,
          startDatePrecision: startDate ? startPrecision : null,
          endDate: endDate || null,
          endDatePrecision: endDate ? endPrecision : null,
        })
        toast.success('연보가 수정되었습니다.')
      } else {
        await createPersonLifeEvent({
          personId,
          title: title.trim(),
          category: (category || undefined) as PersonLifeEventCategory | undefined,
          description: description.trim() || undefined,
          startDate: startDate || undefined,
          startDatePrecision: startDate ? startPrecision : undefined,
          endDate: endDate || undefined,
          endDatePrecision: endDate ? endPrecision : undefined,
        })
        toast.success('연보가 등록되었습니다.')
      }
      invalidate()
      onSuccess?.()
      onClose()
    } catch {
      toast.error('저장에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!lifeEventId || deleting) return
    if (!window.confirm('이 연보 기록을 삭제하시겠습니까?')) return
    setDeleting(true)
    try {
      await deletePersonLifeEvent(lifeEventId)
      toast.success('연보가 삭제되었습니다.')
      invalidate()
      onSuccess?.()
      onClose()
    } catch {
      toast.error('삭제에 실패했습니다.')
    } finally {
      setDeleting(false)
    }
  }

  if (!open) return null

  const formId = 'person-life-event-form'

  return (
    <ModalOverlay onClick={onClose}>
      <ModalBox
        $maxWidth="620px"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="person-life-event-form-title"
      >
        <AccentStripe $color={accent?.base ?? null} />
        <ModalHeader>
          <div>
            <ModalTitle id="person-life-event-form-title">
              {isEdit ? '연보 수정' : '새 연보'}
            </ModalTitle>
            <ModalSubtitle>
              인물이 이 해에 무엇을 했는지 자유 서술로 기록하세요.
            </ModalSubtitle>
          </div>
          <ModalCloseButton type="button" onClick={onClose} aria-label="닫기">
            <FiX />
          </ModalCloseButton>
        </ModalHeader>

        <form id={formId} onSubmit={handleSubmit}>
          <ModalBody>
            {/* 제목 */}
            <Field>
              <Label>
                제목 <Required>*</Required>
              </Label>
              <TitleInput
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 파리 유학, 「종의 기원」 출간, 엘바섬 유배"
                maxLength={200}
                autoFocus
              />
            </Field>

            {/* 카테고리 */}
            <Field>
              <Label>카테고리</Label>
              <CategoryGrid>
                {PERSON_LIFE_EVENT_CATEGORIES.map((c) => {
                  const Icon = CATEGORY_ICON[c]
                  const color = PERSON_LIFE_EVENT_CATEGORY_COLOR[c]
                  const active = category === c
                  return (
                    <CategoryChip
                      key={c}
                      type="button"
                      $active={active}
                      $color={color.base}
                      $soft={color.soft}
                      onClick={() => setCategory(active ? '' : c)}
                    >
                      <Icon size={14} strokeWidth={2.2} />
                      <span>{PERSON_LIFE_EVENT_CATEGORY_LABEL[c]}</span>
                    </CategoryChip>
                  )
                })}
              </CategoryGrid>
            </Field>

            {/* 기간 */}
            <DateField>
              <Label>기간</Label>
              <DateRangeField
                startValue={startDate}
                endValue={endDate}
                onStartChange={setStartDate}
                onEndChange={setEndDate}
                startPlaceholder="시작"
                endPlaceholder="종료 (단일 시점이면 비움)"
                renderControlOnly
                startPickerTitle="시작일"
                endPickerTitle="종료일"
              />
              <PrecisionRow>
                <PrecisionGroup>
                  <PrecisionLabel>시작</PrecisionLabel>
                  <Segmented>
                    {DATE_PRECISIONS.map((p) => (
                      <SegmentedBtn
                        key={p}
                        type="button"
                        $active={startPrecision === p}
                        disabled={!startDate}
                        onClick={() => setStartPrecision(p)}
                      >
                        {PRECISION_LABEL[p]}
                      </SegmentedBtn>
                    ))}
                  </Segmented>
                </PrecisionGroup>
                <PrecisionGroup>
                  <PrecisionLabel>종료</PrecisionLabel>
                  <Segmented>
                    {DATE_PRECISIONS.map((p) => (
                      <SegmentedBtn
                        key={p}
                        type="button"
                        $active={endPrecision === p}
                        disabled={!endDate}
                        onClick={() => setEndPrecision(p)}
                      >
                        {PRECISION_LABEL[p]}
                      </SegmentedBtn>
                    ))}
                  </Segmented>
                </PrecisionGroup>
              </PrecisionRow>
            </DateField>

            {/* 설명 */}
            <Field>
              <Label>상세 설명</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="배경·맥락·인용 등 자유 서술 (선택)"
                rows={4}
              />
            </Field>
          </ModalBody>

          <ModalFooter>
            {isEdit && (
              <DeleteBtn
                type="button"
                onClick={handleDelete}
                disabled={deleting || submitting}
              >
                {deleting ? '삭제 중…' : '삭제'}
              </DeleteBtn>
            )}
            <Spacer />
            <CancelBtn
              type="button"
              onClick={onClose}
              disabled={submitting || deleting}
            >
              취소
            </CancelBtn>
            <SaveBtn
              type="submit"
              disabled={!canSubmit}
              $accent={accent?.base ?? null}
              form={formId}
            >
              {submitting ? '저장 중…' : isEdit ? '수정 저장' : '등록'}
            </SaveBtn>
          </ModalFooter>
        </form>
      </ModalBox>
    </ModalOverlay>
  )
}

// ────── styled ──────
const AccentStripe = styled.div<{ $color: string | null }>`
  height: 4px;
  background: ${({ $color }) =>
    $color ? `linear-gradient(90deg, ${$color}, ${$color}88)` : 'transparent'};
  transition: background 0.25s;
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`

const DateField = styled(Field)`
  gap: 10px;
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

const inputReset = css`
  width: 100%;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e2e8f0'};
  border-radius: 12px;
  padding: 12px 16px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
  font-size: 14px;
  font-weight: 500;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;

  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.14);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &::placeholder {
    color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.35)' : '#94a3b8'};
  }
`

const TitleInput = styled.input`
  ${inputReset}
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  padding: 14px 18px;
`

const Textarea = styled.textarea`
  ${inputReset}
  resize: vertical;
  min-height: 92px;
  font-family: inherit;
  line-height: 1.6;
  font-weight: 500;
`

const CategoryGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const CategoryChip = styled.button<{
  $active: boolean
  $color: string
  $soft: string
}>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.1s;
  white-space: nowrap;
  ${({ $active, $color, $soft, theme }) =>
    $active
      ? css`
          background: ${$soft};
          color: ${$color};
          border: 1px solid ${$color}66;
          box-shadow: 0 0 0 3px ${$color}1f;
        `
      : css`
          background: ${theme.mode === 'dark'
            ? 'rgba(255,255,255,0.04)'
            : '#f1f5f9'};
          color: ${theme.mode === 'dark'
            ? theme.colors.text.secondary
            : '#475569'};
          border: 1px solid transparent;
          &:hover {
            background: ${theme.mode === 'dark'
              ? 'rgba(255,255,255,0.08)'
              : '#e2e8f0'};
          }
        `}

  &:active {
    transform: scale(0.97);
  }
`

const PrecisionRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`

const PrecisionGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`

const PrecisionLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Segmented = styled.div`
  display: inline-flex;
  width: 100%;
  padding: 3px;
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'transparent'};
`

const SegmentedBtn = styled.button<{ $active: boolean }>`
  flex: 1;
  border: none;
  padding: 7px 6px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.3)'
        : '#ffffff'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#e0e7ff'
        : '#4338ca'
      : theme.colors.text.tertiary};
  box-shadow: ${({ $active, theme }) =>
    $active && theme.mode === 'light'
      ? '0 1px 2px rgba(15,23,42,0.08)'
      : 'none'};
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

const Spacer = styled.div`
  flex: 1;
`

const baseBtn = css`
  padding: 11px 20px;
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, transform 0.1s;
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  &:active:not(:disabled) {
    transform: translateY(1px);
  }
`

const SaveBtn = styled.button<{ $accent: string | null }>`
  ${baseBtn}
  background: ${({ $accent }) => $accent ?? '#6366f1'};
  color: #fff;
  &:hover:not(:disabled) {
    filter: brightness(0.95);
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
  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(15,23,42,0.04)'};
  }
`

const DeleteBtn = styled.button`
  ${baseBtn}
  background: transparent;
  color: #dc2626;
  padding: 11px 14px;
  &:hover:not(:disabled) {
    background: #fef2f2;
  }
`
