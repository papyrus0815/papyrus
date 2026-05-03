/**
 * 현대 국가 등록/수정 모달 — 헤더(타이틀 + 필수 인디케이터) / 본문(폼 스크롤) / 푸터(취소·등록).
 */
import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FiCheck, FiX } from 'react-icons/fi'
import styled, { keyframes } from 'styled-components'

import type { Country } from '@/entities/country/api'
import type { ContinentOption } from '@/entities/country/api'
import { Z_INDEX } from '@/shared/styles/z-index'
import { CountryForm } from './country-form'

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.38);
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  backdrop-filter: blur(10px);

  @media (max-width: 768px) {
    padding: 0;
  }
`

const ModalBox = styled(motion.div)`
  width: min(1100px, 96vw);
  height: 90vh;
  max-height: 1200px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(20,20,20,0.92)'
      : 'linear-gradient(180deg, #ffffff 0%, #fafbfc 100%)'};
  backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(24px)' : 'none'};
  -webkit-backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(24px)' : 'none'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  border-radius: 20px;
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 10px 40px rgba(0,0,0,0.5)'
      : '0 24px 56px -8px rgba(15, 23, 42, 0.18), 0 4px 12px -4px rgba(15, 23, 42, 0.08)'};
  z-index: ${Z_INDEX.MODAL_CONTENT};
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @media (max-width: 768px) {
    width: 100vw;
    height: 100vh;
    max-height: none;
    border-radius: 0;
    border: none;
  }
`

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-shrink: 0;

  @media (max-width: 768px) {
    padding: 14px 16px;
  }
`

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
`

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.01em;
`

const RequiredChips = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

/**
 * 필수 항목 인디케이터 — 미완료는 회색(중립), 완료는 초록.
 * 빨강은 위반/실패에만 사용 (검증 에러 등).
 */
const RequiredChip = styled.span<{ $done: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
  font-weight: 500;
  padding: 3px 9px;
  border-radius: 999px;
  background: ${({ $done, theme }) =>
    $done
      ? theme.mode === 'dark'
        ? 'rgba(34, 197, 94, 0.15)'
        : '#ecfdf5'
      : 'transparent'};
  color: ${({ $done, theme }) =>
    $done ? '#16a34a' : theme.colors.text.secondary};
  border: 1px solid
    ${({ $done, theme }) =>
      $done ? 'rgba(22,163,74,0.25)' : theme.colors.border.default};

  svg {
    flex-shrink: 0;
  }
`

const CloseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s;
  flex-shrink: 0;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const FormScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.default};
    border-radius: 3px;
  }

  @media (max-width: 768px) {
    padding: 16px;
  }
`

const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-shrink: 0;

  @media (max-width: 768px) {
    padding: 12px 16px;
  }
`

const SubmitBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 0 4px 14px -2px rgba(99, 102, 241, 0.35);
  transition:
    opacity 0.15s,
    transform 0.05s,
    box-shadow 0.15s;

  &:hover:not(:disabled) {
    opacity: 0.95;
    box-shadow: 0 6px 18px -2px rgba(99, 102, 241, 0.45);
  }
  &:active:not(:disabled) {
    transform: translateY(1px);
    box-shadow: 0 2px 8px -2px rgba(99, 102, 241, 0.35);
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    box-shadow: none;
  }
`

const CancelBtn = styled.button`
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

const Spinner = styled.span`
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`

export interface CountryFormModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'create' | 'edit' | null
  /** 수정 모드일 때만 의미 있음. create일 땐 null. */
  editing: Country | null
  continents: ContinentOption[]
  onSave: (data: Omit<Country, 'id'> & { id?: string }) => Promise<void>
  onSuccess?: () => void
}

/**
 * 폼 안의 RHF 값을 헤더 인디케이터에서 읽기 위해 form DOM 직접 관찰.
 * (RHF 컨텍스트를 모달까지 끌어올리지 않기 위함 — 가벼운 통합)
 */
function useFormFieldsFilled(
  active: boolean,
  fieldNames: string[],
): Record<string, boolean> {
  const [filled, setFilled] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!active) {
      setFilled({})
      return
    }
    const formEl = document.getElementById(
      'country-form',
    ) as HTMLFormElement | null
    if (!formEl) return

    const update = () => {
      const next: Record<string, boolean> = {}
      for (const name of fieldNames) {
        const el = formEl.querySelector(
          `[name="${name}"]`,
        ) as HTMLInputElement | null
        next[name] = !!el?.value?.trim()
      }
      setFilled(next)
    }

    update()
    const handler = () => update()
    formEl.addEventListener('input', handler)
    formEl.addEventListener('change', handler)
    return () => {
      formEl.removeEventListener('input', handler)
      formEl.removeEventListener('change', handler)
    }
  }, [active, fieldNames])

  return filled
}

export function CountryFormModal({
  isOpen,
  onClose,
  mode,
  editing,
  continents,
  onSave,
  onSuccess,
}: CountryFormModalProps) {
  const [submitting, setSubmitting] = useState(false)

  const handleSave = async (
    data: Omit<Country, 'id'> & { id?: string },
  ) => {
    setSubmitting(true)
    try {
      await onSave(data)
      onSuccess?.()
      onClose()
    } catch {
      // 에러 토스트는 useCountryFormModal에서 표시됨. 모달은 열린 상태 유지.
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose, submitting])

  const active = isOpen && mode !== null

  const filled = useFormFieldsFilled(active, ['name', 'continentId'])

  const content = (
    <AnimatePresence>
      {active && (
        <Overlay
          key="country-form-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (!submitting) onClose()
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="country-form-modal-title"
        >
          <ModalBox
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalHeader>
              <HeaderLeft>
                <ModalTitle id="country-form-modal-title">
                  {mode === 'edit' ? '국가 수정' : '국가 등록'}
                </ModalTitle>
                <RequiredChips>
                  <RequiredChip $done={!!filled.name}>
                    {filled.name && <FiCheck size={11} />}국가명
                  </RequiredChip>
                  <RequiredChip $done={!!filled.continentId}>
                    {filled.continentId && <FiCheck size={11} />}대륙
                  </RequiredChip>
                </RequiredChips>
              </HeaderLeft>
              <CloseBtn
                type="button"
                onClick={onClose}
                aria-label="닫기"
                disabled={submitting}
              >
                <FiX size={20} />
              </CloseBtn>
            </ModalHeader>
            <FormScroll>
              <CountryForm
                mode={mode ?? 'create'}
                editing={editing}
                continents={continents}
                onSave={handleSave}
              />
            </FormScroll>
            <ModalFooter>
              <CancelBtn
                type="button"
                onClick={onClose}
                disabled={submitting}
              >
                취소
              </CancelBtn>
              <SubmitBtn
                type="submit"
                form="country-form"
                disabled={submitting}
              >
                {submitting && <Spinner />}
                {submitting
                  ? '저장 중...'
                  : mode === 'edit'
                    ? '수정 완료'
                    : '국가 등록'}
              </SubmitBtn>
            </ModalFooter>
          </ModalBox>
        </Overlay>
      )}
    </AnimatePresence>
  )

  return createPortal(content, document.body)
}
