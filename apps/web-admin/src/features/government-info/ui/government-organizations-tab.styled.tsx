import styled from 'styled-components'

import {
  GOV_BORDER_COLOR as BORDER_COLOR,
  GOV_MAIN_COLOR as MAIN,
} from '@/features/government-info/model/constants'
import { ModalBox } from '@/shared/ui/modal/modal.styles'

/* 행정기구 리스트·모달 (인물 리스트/인물 등록 모달 참조) */
export const OrgListHeader = styled.header`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 0 20px;
  margin-bottom: 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
`
export const OrgListHeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`
export const OrgListHeaderTitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`
export const OrgListHeaderTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.03em;
  display: flex;
  align-items: baseline;
  gap: 8px;
`
export const OrgListHeaderCount = styled.span`
  font-size: 13px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.secondary};
`
export const OrgListHeaderDesc = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
`
export const OrgToolbarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`
export const OrgSearchWrap = styled.div`
  flex: 1;
  min-width: 180px;
  max-width: 260px;
  position: relative;
`
export const OrgSearchInput = styled.input`
  width: 100%;
  padding: 9px 14px 9px 34px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f8fafc'};
  border: 1px solid ${BORDER_COLOR};
  border-radius: 10px;
  outline: none;
  box-sizing: border-box;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:focus {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#fff'};
    border-color: ${MAIN};
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.08);
  }
`
export const OrgCreateButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: ${MAIN};
  border: none;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(99, 102, 241, 0.2);
  transition:
    background 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.1s ease;
  &:hover:not(:disabled) {
    background: #4f46e5;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
    transform: translateY(-1px);
  }
  &:active {
    transform: translateY(0);
  }
`
export const OrgGrid = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`
export const OrgCard = styled.div`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff'};
  border-radius: 14px;
  padding: 0;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 1px 4px rgba(0,0,0,0.25)'
      : '0 1px 4px rgba(0, 0, 0, 0.04)'};
  backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(12px)' : 'none'};
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
  overflow: hidden;
  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.5)' : '#c7d2fe'};
    box-shadow: ${({ theme }) =>
      theme.mode === 'dark'
        ? '0 6px 20px rgba(99,102,241,0.15)'
        : '0 6px 20px rgba(99, 102, 241, 0.1)'};
    transform: translateY(-1px);
  }
`
export const OrgCardContent = styled.div`
  padding: 18px 20px;
`
export const OrgEmptyState = styled.div`
  padding: 52px 24px;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fafbfd'};
  border: 1.5px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#dde3ec'};
  border-radius: 14px;
`
/* 행정기구 등록 모달 */
export const OrgModalBoxCustom = styled(ModalBox)`
  max-width: 720px;
  overflow: auto;
  display: flex;
  flex-direction: column;
`

export const OrgModalBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px 28px 28px;
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f3f4f6'};
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.15)' : '#cbd5e1'};
    border-radius: 3px;
  }
`
export const OrgFormDesc = styled.div`
  margin: 0 0 20px;
  padding: 12px 16px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc'};
  border-radius: 10px;
  border-left: 3px solid ${({ theme }) => theme.colors.border.default};
  display: flex;
  align-items: flex-start;
  gap: 10px;
  svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.secondary};
    margin-top: 2px;
  }
`
export const OrgField = styled.div`
  margin-bottom: 20px;
`
export const OrgLabel = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 8px;
`
export const OrgInput = styled.input`
  width: 100%;
  padding: 14px 16px;
  font-size: 15px;
  color: ${({ theme }) => theme.colors.text.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  box-sizing: border-box;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:focus {
    border-color: ${MAIN};
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }
`
export const OrgSelect = styled.select`
  width: 100%;
  padding: 14px 16px;
  font-size: 15px;
  color: ${({ theme }) => theme.colors.text.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  &:focus {
    border-color: ${MAIN};
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }
`
export const OrgTextArea = styled.textarea`
  width: 100%;
  min-height: 88px;
  padding: 14px 16px;
  font-size: 15px;
  color: ${({ theme }) => theme.colors.text.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  box-sizing: border-box;
  resize: vertical;
  outline: none;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  &:focus {
    border-color: ${MAIN};
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }
`
export const OrgErrorText = styled.span`
  font-size: 13px;
  color: #dc2626;
  margin-top: 6px;
  display: block;
`
export const OrgFormActions = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-shrink: 0;
`
export const OrgPrimaryBtn = styled.button`
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: ${MAIN};
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
    cursor: not-allowed;
  }
`
export const OrgCancelBtn = styled.button`
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#f8fafc'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    outline: none;
    border-color: ${MAIN};
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
  }
`
