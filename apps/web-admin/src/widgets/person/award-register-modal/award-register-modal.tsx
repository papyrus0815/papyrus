/**
 * 수상·훈장 등록 모달 — 인물 상세에서 직접 등록.
 *
 * 수상(PersonAward)은 FK 선택기가 필요 없는(awardName 외 전부 자유 텍스트) 유일한
 * 경력성 레코드라, 조직·직급 선택기 인프라 없이 자기완결적으로 등록할 수 있다.
 * (학력·분야별 경력은 organizationId/positionId 선택기가 필요해 별도 작업으로 분리)
 *
 * 생성 전용 — personCareerApi 에 수상 수정 엔드포인트가 없어 수정/삭제는 기존
 * 인물 상세 카드의 삭제 버튼으로 처리.
 */
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { personCareerApi } from '@/shared/api/person-career'
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

export interface AwardRegisterModalProps {
  open: boolean
  personId: string
  onClose: () => void
  /** 저장 성공 시 호출 (모달은 자체적으로 닫지 않음 — 상위에서 onClose 처리) */
  onSuccess?: () => void
}

export function AwardRegisterModal({
  open,
  personId,
  onClose,
  onSuccess,
}: AwardRegisterModalProps) {
  const queryClient = useQueryClient()
  const [awardName, setAwardName] = useState('')
  const [category, setCategory] = useState('')
  const [awardingBody, setAwardingBody] = useState('')
  const [awardDate, setAwardDate] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  /** 모달 열릴 때마다 초기화 */
  useEffect(() => {
    if (!open) return
    setAwardName('')
    setCategory('')
    setAwardingBody('')
    setAwardDate('')
    setDescription('')
    setSubmitting(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  const canSubmit = awardName.trim().length > 0 && !submitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await personCareerApi.addAward({
        personId,
        awardName: awardName.trim(),
        category: category.trim() || undefined,
        awardingBody: awardingBody.trim() || undefined,
        awardDate: awardDate || undefined,
        description: description.trim() || undefined,
      })
      queryClient.invalidateQueries({ queryKey: ['person-detail', personId] })
      toast.success('수상·훈장이 등록되었습니다.')
      onSuccess?.()
      onClose()
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : '저장에 실패했습니다.'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalOverlay onClick={onClose}>
      <ModalBox
        $maxWidth="560px"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="award-register-title"
      >
        <ModalHeader>
          <div>
            <ModalTitle id="award-register-title">수상·훈장 등록</ModalTitle>
            <ModalSubtitle>받은 상·훈장을 기록하세요.</ModalSubtitle>
          </div>
          <ModalCloseButton type="button" onClick={onClose} aria-label="닫기">
            <FiX />
          </ModalCloseButton>
        </ModalHeader>

        <form onSubmit={handleSubmit}>
          <ModalBody>
            <Field>
              <Label>
                수상명 <Required>*</Required>
              </Label>
              <TextInput
                type="text"
                value={awardName}
                onChange={(e) => setAwardName(e.target.value)}
                placeholder="예: 노벨 물리학상, 무공훈장, 올림픽 금메달"
                maxLength={200}
                autoFocus
              />
            </Field>

            <TwoCol>
              <Field>
                <Label>분야</Label>
                <TextInput
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="예: 물리학상, 100m"
                  maxLength={120}
                />
              </Field>
              <Field>
                <Label>수상일</Label>
                <TextInput
                  type="date"
                  value={awardDate}
                  onChange={(e) => setAwardDate(e.target.value)}
                />
              </Field>
            </TwoCol>

            <Field>
              <Label>수여 기관</Label>
              <TextInput
                type="text"
                value={awardingBody}
                onChange={(e) => setAwardingBody(e.target.value)}
                placeholder="예: 스웨덴 왕립과학원, 국방부"
                maxLength={200}
              />
            </Field>

            <Field>
              <Label>설명</Label>
              <TextArea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="수상 배경·공적 등 (선택)"
                rows={4}
              />
            </Field>
          </ModalBody>

          <ModalFooter>
            <Spacer />
            <CancelBtn type="button" onClick={onClose} disabled={submitting}>
              취소
            </CancelBtn>
            <SaveBtn type="submit" disabled={!canSubmit}>
              {submitting ? '저장 중…' : '등록'}
            </SaveBtn>
          </ModalFooter>
        </form>
      </ModalBox>
    </ModalOverlay>
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
