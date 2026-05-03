/**
 * 시작/종료 시점 선택 모달 (BC/AD + 년/월/일)
 *
 * 기존 historical-country-form.tsx에 인라인으로 두 번 중복돼 있던 모달을
 * 단일 컴포넌트로 추출. (시작/종료 양쪽에서 재사용)
 */
import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import styled, { useTheme } from 'styled-components'

import * as S from '@/widgets/country/country-form/ui/country-form.styles'

export interface EraDateValue {
  era: 'BC' | 'AD' | undefined
  year: number | undefined
  month: number | undefined
  day: number | undefined
}

interface EraDateModalProps {
  open: boolean
  title: string
  /** 모달 열릴 때 폼에서 가져온 초기값 */
  initial: EraDateValue
  onClose: () => void
  /** 적용 시 새 값 emit */
  onApply: (value: EraDateValue) => void
}

const NumInput = styled.input`
  padding: 8px 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.15)' : '#e5e7eb'};
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  outline: none;
  &:focus {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }
`

export function EraDateModal({
  open,
  title,
  initial,
  onClose,
  onApply,
}: EraDateModalProps) {
  const theme = useTheme()
  const isDark = theme.mode === 'dark'

  const [era, setEra] = useState<'BC' | 'AD' | undefined>(initial.era)
  const [ymd, setYmd] = useState({
    y: initial.year != null ? String(initial.year) : '',
    m: initial.month != null ? String(initial.month) : '',
    d: initial.day != null ? String(initial.day) : '',
  })

  /** 모달 다시 열릴 때 초기값으로 동기화 */
  useEffect(() => {
    if (open) {
      setEra(initial.era)
      setYmd({
        y: initial.year != null ? String(initial.year) : '',
        m: initial.month != null ? String(initial.month) : '',
        d: initial.day != null ? String(initial.day) : '',
      })
    }
  }, [open, initial])

  if (!open) return null

  const handleApply = () => {
    onApply({
      era,
      year: ymd.y === '' ? undefined : Number(ymd.y),
      month: ymd.m === '' ? undefined : Number(ymd.m),
      day: ymd.d === '' ? undefined : Number(ymd.d),
    })
    onClose()
  }

  return createPortal(
    <>
      <S.SelectModalOverlay
        as={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <S.SelectModal
        as={motion.div}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        style={{ transform: 'translate(-50%, -50%)' }}
      >
        <S.SelectModalHeader>
          <S.SelectModalTitle>{title}</S.SelectModalTitle>
          <S.SelectModalClose onClick={onClose} aria-label="닫기">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                fill="currentColor"
              />
            </svg>
          </S.SelectModalClose>
        </S.SelectModalHeader>
        <S.SelectModalContent>
          <S.SelectOption
            $active={era === 'BC'}
            onClick={() => setEra('BC')}
          >
            <S.SelectOptionIcon>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 8v8m-4-4h8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </S.SelectOptionIcon>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                flex: 1,
              }}
            >
              <S.SelectOptionText>기원전 (BC)</S.SelectOptionText>
              <span
                style={{
                  fontSize: 12,
                  color: isDark ? '#94a3b8' : '#6b7280',
                }}
              >
                Before Christ — 서기 이전
              </span>
            </div>
            {era === 'BC' && (
              <S.SelectOptionCheck>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                    fill="currentColor"
                  />
                </svg>
              </S.SelectOptionCheck>
            )}
          </S.SelectOption>
          <S.SelectOption
            $active={era === 'AD'}
            onClick={() => setEra('AD')}
          >
            <S.SelectOptionIcon>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </S.SelectOptionIcon>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                flex: 1,
              }}
            >
              <S.SelectOptionText>기원후 (AD)</S.SelectOptionText>
              <span
                style={{
                  fontSize: 12,
                  color: isDark ? '#94a3b8' : '#6b7280',
                }}
              >
                Anno Domini — 서기 이후
              </span>
            </div>
            {era === 'AD' && (
              <S.SelectOptionCheck>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                    fill="currentColor"
                  />
                </svg>
              </S.SelectOptionCheck>
            )}
          </S.SelectOption>
        </S.SelectModalContent>
        <S.SelectModalFooter
          style={{ flexDirection: 'column', gap: 12, alignItems: 'stretch' }}
        >
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <NumInput
              type="number"
              placeholder="년"
              value={ymd.y}
              onChange={(e) =>
                setYmd((prev) => ({ ...prev, y: e.target.value }))
              }
              style={{ width: 72 }}
            />
            <NumInput
              type="number"
              placeholder="월"
              min={1}
              max={12}
              value={ymd.m}
              onChange={(e) =>
                setYmd((prev) => ({ ...prev, m: e.target.value }))
              }
              style={{ width: 56 }}
            />
            <NumInput
              type="number"
              placeholder="일"
              min={1}
              max={31}
              value={ymd.d}
              onChange={(e) =>
                setYmd((prev) => ({ ...prev, d: e.target.value }))
              }
              style={{ width: 56 }}
            />
          </div>
          <S.SelectModalFooterButton type="button" onClick={handleApply}>
            적용
          </S.SelectModalFooterButton>
        </S.SelectModalFooter>
      </S.SelectModal>
    </>,
    document.body,
  )
}
