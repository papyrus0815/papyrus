/**
 * 부처 카테고리 설정 모달 — `theme.gov`(CabinetsSectionPalette) + ThemeProvider
 */
import { motion } from 'framer-motion'
import styled from 'styled-components'

import { Z_INDEX } from '@/shared/styles/z-index'

export const CategoryModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.72)' : 'rgba(15, 23, 42, 0.4)'};
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
`
export const CategoryModalBox = styled(motion.div)`
  width: 100%;
  max-width: 560px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.gov!.bg};
  border-radius: 16px;
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)'
      : '0 20px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.06)'};
  z-index: ${Z_INDEX.MODAL_CONTENT};
  overflow: hidden;
`
export const CategoryModalHeader = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 28px;
  border-bottom: 1px solid ${({ theme }) => theme.gov!.divider};
`
export const CategoryModalTitle = styled.h3`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: ${({ theme }) => theme.gov!.text};
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 10px;
  svg {
    color: ${({ theme }) => theme.gov!.textMuted};
    flex-shrink: 0;
  }
`
export const CategoryModalDesc = styled.p`
  margin: 8px 0 0 0;
  font-size: 14px;
  color: ${({ theme }) => theme.gov!.textMuted};
`
export const CategoryModalCloseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: 10px;
  background: ${({ theme }) => theme.gov!.bgSubtle};
  color: ${({ theme }) => theme.gov!.textMuted};
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background 0.15s ease,
    color 0.15s ease;
  &:hover {
    background: ${({ theme }) => theme.gov!.cardBgHover};
    color: ${({ theme }) => theme.gov!.text};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
  }
`
export const CategoryModalBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px 28px 28px;
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.gov!.bgSubtle};
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.gov!.borderMid};
    border-radius: 3px;
  }
`
export const CategoryFormBlock = styled.div`
  margin-bottom: 24px;
  padding: 20px;
  background: ${({ theme }) => theme.gov!.bgSubtle};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.gov!.borderMid};
`
export const CategorySectionTitle = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.gov!.textMuted};
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 16px;
`
export const CategoryFormLabel = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.gov!.text};
`
export const CategoryInput = styled.input`
  width: 100%;
  padding: 14px 16px;
  margin-bottom: 16px;
  font-size: 15px;
  color: ${({ theme }) => theme.gov!.text};
  border: 1px solid ${({ theme }) => theme.gov!.inputBorder};
  border-radius: 12px;
  background: ${({ theme }) => theme.gov!.inputBg};
  outline: none;
  box-sizing: border-box;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  &::placeholder {
    color: ${({ theme }) => theme.gov!.placeholderText};
  }
  &:last-of-type {
    margin-bottom: 20px;
  }
  &:focus {
    border-color: ${({ theme }) => theme.gov!.accent};
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }
`
export const CategoryBtnRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`
export const CategoryPrimaryBtn = styled.button`
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: ${({ theme }) => theme.gov!.accent};
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s ease;
  &:hover:not(:disabled) {
    background: #4f46e5;
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
  }
  &:disabled {
    opacity: 0.5;
    cursor: wait;
  }
`
export const CategorySecondaryBtn = styled.button`
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.gov!.textMuted};
  background: ${({ theme }) => theme.gov!.btnBg};
  border: 1px solid ${({ theme }) => theme.gov!.borderMid};
  border-radius: 12px;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.gov!.btnHover};
  }
`
export const CategoryListSectionTitle = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.gov!.textMuted};
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 12px;
`
export const CategoryList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
`
export const CategoryListItem = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  gap: 12px;
  border-radius: 10px;
  background: ${({ theme }) => theme.gov!.cardBg};
  border: 1px solid ${({ theme }) => theme.gov!.borderMid};
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
  &:hover {
    background: ${({ theme }) => theme.gov!.cardBgHover};
    border-color: ${({ theme }) => theme.gov!.borderEmphasis};
  }
`
export const CategoryListItemLabel = styled.div`
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.gov!.text};
  span {
    color: ${({ theme }) => theme.gov!.textMuted};
    margin-left: 6px;
    font-weight: 500;
    font-size: 13px;
  }
`
export const CategoryItemActions = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
`
export const CategoryEditBtn = styled.button`
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.gov!.accent};
  background: ${({ theme }) => theme.gov!.btnBg};
  border: 1px solid ${({ theme }) => theme.gov!.borderMid};
  border-radius: 10px;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.gov!.btnHover};
    border-color: ${({ theme }) => theme.gov!.accentBorder};
  }
`
export const CategoryDeleteBtn = styled.button`
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.gov!.danger};
  background: ${({ theme }) => theme.gov!.dangerBg};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(225,29,72,0.35)' : '#fecaca'};
  border-radius: 10px;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(225,29,72,0.22)' : '#fee2e2'};
  }
`
export const CategoryEmptyMessage = styled.li`
  padding: 32px 24px;
  font-size: 14px;
  color: ${({ theme }) => theme.gov!.textMuted};
  background: ${({ theme }) => theme.gov!.bgSubtle};
  border-radius: 12px;
  border: 1px dashed ${({ theme }) => theme.gov!.borderMid};
  text-align: center;
  line-height: 1.55;
  list-style: none;
`
